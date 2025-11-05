import { useGenerateWithPrompt } from "@/features/ai/hooks/useGenerateWithPrompt";
import { useAvailableModels } from "@/features/ai/hooks/useAvailableModels";
import { useChaptersByStoryQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { useLorebookContext } from "@/features/lorebook/context/LorebookContext";
import { LorebookFilterService } from "@/features/lorebook/stores/LorebookFilterService";
import { usePromptsQuery } from "@/features/prompts/hooks/usePromptsQuery";
import { usePromptSelection } from "../hooks/usePromptSelection";
import { usePromptPreview } from "../hooks/usePromptPreview";
import { useContextSelection } from "../hooks/useContextSelection";
import {
    AIChat,
    AllowedModel,
    ChatMessage,
    Prompt,
    PromptParserConfig,
} from "@/types/story";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useCreateBrainstormMutation, useUpdateBrainstormMutation } from "../hooks/useBrainstormQuery";
import { ChatMessageList } from "./ChatMessageList";
import { ContextSelector } from "./ContextSelector";
import { MessageInputArea } from "./MessageInputArea";
import { PromptControls } from "./PromptControls";
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';
import { aiService } from '@/services/ai/AIService';

interface ChatInterfaceProps {
    storyId: string;
    selectedChat: AIChat;
    onChatUpdate: (chat: AIChat) => void;
}

export default function ChatInterface({ storyId, selectedChat, onChatUpdate }: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [streamingContent, setStreamingContent] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const { entries: lorebookEntries } = useLorebookContext();
    const { data: prompts = [], isLoading: promptsLoading, error: promptsQueryError } = usePromptsQuery({ includeSystem: true });
    const { data: chapters = [] } = useChaptersByStoryQuery(storyId);
    const promptsError = promptsQueryError?.message ?? null;

    const { data: availableModels = [] } = useAvailableModels();

    const {
        selectedPrompt,
        selectedModel,
        selectPrompt,
    } = usePromptSelection(selectedChat.id, selectedChat.lastUsedPromptId, selectedChat.lastUsedModelId, prompts);

    const {
        showPreview,
        previewMessages,
        previewLoading,
        previewError,
        openPreview,
        closePreview,
    } = usePromptPreview();

    const {
        includeFullContext,
        contextOpen,
        selectedSummaries,
        selectedItems,
        selectedChapterContent,
        toggleFullContext,
        toggleContextOpen,
        toggleSummary,
        addItem,
        removeItem,
        addChapterContent,
        removeChapterContent,
        clearSelections,
    } = useContextSelection();

    const { generateWithPrompt } = useGenerateWithPrompt();

    const createMutation = useCreateBrainstormMutation();
    const updateMutation = useUpdateBrainstormMutation();

    useEffect(() => {
        clearSelections();
    }, [clearSelections]);

    const getFilteredEntries = () => {
        return LorebookFilterService.getFilteredEntries(lorebookEntries, false);
    };

    const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
        return {
            promptId: prompt.id,
            storyId,
            scenebeat: input.trim(),
            additionalContext: {
                chatHistory: selectedChat.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
                includeFullContext,
                selectedSummaries: includeFullContext ? [] : selectedSummaries,
                selectedItems: includeFullContext ? [] : selectedItems.map((item) => item.id),
                selectedChapterContent: includeFullContext ? [] : selectedChapterContent,
            },
        };
    };

    const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
        selectPrompt(prompt, model);
    };

    const handlePreviewPrompt = async () => {
        if (!selectedPrompt) return;
        const config = createPromptConfig(selectedPrompt);
        await openPreview(config);
    };

    const handleSubmit = async () => {
        if (!input.trim() || !selectedPrompt || !selectedModel || isGenerating) return;

        const [error] = await attemptPromise(async () => {
            if (!selectedPrompt || !selectedModel) {
                throw new Error("Prompt or model not selected");
            }

            const userMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                content: input.trim(),
                timestamp: new Date(),
            };

            let chatId = selectedChat.id;
            if (!chatId) {
                const newTitle =
                    userMessage.content.substring(0, 40) +
                    (userMessage.content.length > 40 ? "..." : "");

                const newChat = {
                    id: crypto.randomUUID(),
                    storyId,
                    title: newTitle,
                    messages: [userMessage],
                    updatedAt: new Date(),
                };

                createMutation.mutate(newChat, {
                    onSuccess: (created) => {
                        chatId = created.id;
                        onChatUpdate(created);
                    }
                });
            }

            const config = createPromptConfig(selectedPrompt);
            const response = await generateWithPrompt(config, selectedModel);

            if (!response.ok && response.status !== 204) {
                throw new Error("Failed to generate response");
            }

            if (response.status === 204) {
                logger.info("Generation was aborted.");
                setIsGenerating(false);
                return;
            }

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };

            setInput("");
            setIsGenerating(true);
            setStreamingMessageId(assistantMessage.id);
            setStreamingContent("");

            let fullResponse = "";
            await aiService.processStreamedResponse(
                response,
                (token) => {
                    fullResponse += token;
                    setStreamingContent(fullResponse);
                },
                () => {
                    setIsGenerating(false);
                    setStreamingMessageId(null);

                    const updatedMessages = [
                        ...selectedChat.messages,
                        userMessage,
                        { ...assistantMessage, content: fullResponse },
                    ];

                    updateMutation.mutate({
                        id: chatId,
                        data: { messages: updatedMessages }
                    }, {
                        onSuccess: (updatedChat) => {
                            onChatUpdate(updatedChat);
                        }
                    });
                },
                (streamError) => {
                    logger.error("Streaming error:", streamError);
                    toast.error("Failed to stream response");
                    setIsGenerating(false);
                    setStreamingMessageId(null);
                }
            );
        });

        if (error) {
            logger.error("Error during generation:", error);
            toast.error("An error occurred during generation");
            setIsGenerating(false);
            setStreamingMessageId(null);
        }
    };

    const handleStopGeneration = () => {
        aiService.abortStream();
        setIsGenerating(false);
        setStreamingMessageId(null);
    };

    const handleStartEdit = (message: ChatMessage) => {
        if (streamingMessageId === message.id) {
            if (!confirm("This message is still being generated. Stop generation and edit?")) {
                return;
            }
            aiService.abortStream();
            setStreamingMessageId(null);
        }
        setEditingMessageId(message.id);
        setEditingContent(message.content);
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!editingContent.trim()) {
            toast.error("Edited content cannot be empty");
            return;
        }

        const [error] = await attemptPromise(async () => {
            const existingMsg = selectedChat.messages?.find(m => m.id === messageId);
            if (!existingMsg) {
                throw new Error("Message not found");
            }

            const originalContent = existingMsg.originalContent ?? existingMsg.content;
            const editedAt = new Date().toISOString();

            const updatedMessages = selectedChat.messages?.map(msg =>
                msg.id === messageId
                    ? {
                        ...msg,
                        content: editingContent,
                        originalContent,
                        editedAt,
                        editedBy: 'user' as const
                    }
                    : msg
            );

            await new Promise<void>((resolve, reject) => {
                updateMutation.mutate({
                    id: selectedChat.id,
                    data: { messages: updatedMessages }
                }, {
                    onSuccess: (updatedChat) => {
                        onChatUpdate(updatedChat);
                        resolve();
                    },
                    onError: reject
                });
            });
        });

        if (error) {
            logger.error("Failed to save edit", error);
            toast.error("Failed to save edit");
            return;
        }

        toast.success("Message edited");
        setEditingMessageId(null);
        setEditingContent("");
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent("");
    };

    const handleItemSelect = (itemId: string) => {
        const filteredEntries = LorebookFilterService.getFilteredEntries(lorebookEntries, false);
        const item = filteredEntries.find((entry) => entry.id === itemId);
        if (item) {
            addItem(item);
        }
    };

    const displayMessages = streamingMessageId
        ? [...selectedChat.messages, { id: streamingMessageId, content: streamingContent, role: 'assistant' as const, timestamp: new Date() }]
        : selectedChat.messages;

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
                <PromptControls
                    prompts={prompts}
                    promptsLoading={promptsLoading}
                    promptsError={promptsError}
                    selectedPrompt={selectedPrompt}
                    selectedModel={selectedModel}
                    availableModels={availableModels.map((model) => ({
                        id: model.id,
                        name: model.name,
                        provider: model.provider,
                    }))}
                    showPreview={showPreview}
                    previewMessages={previewMessages}
                    previewLoading={previewLoading}
                    previewError={previewError}
                    onPromptSelect={handlePromptSelect}
                    onPreviewPrompt={handlePreviewPrompt}
                    onClosePreview={closePreview}
                />

                <ContextSelector
                    includeFullContext={includeFullContext}
                    contextOpen={contextOpen}
                    selectedSummaries={selectedSummaries}
                    selectedItems={selectedItems}
                    selectedChapterContent={selectedChapterContent}
                    chapters={chapters}
                    lorebookEntries={lorebookEntries}
                    onToggleFullContext={toggleFullContext}
                    onToggleContextOpen={toggleContextOpen}
                    onToggleSummary={toggleSummary}
                    onItemSelect={handleItemSelect}
                    onRemoveItem={removeItem}
                    onChapterContentSelect={addChapterContent}
                    onRemoveChapterContent={removeChapterContent}
                    getFilteredEntries={getFilteredEntries}
                />
            </div>

            <ChatMessageList
                messages={displayMessages}
                editingMessageId={editingMessageId}
                editingContent={editingContent}
                streamingMessageId={streamingMessageId}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditContentChange={setEditingContent}
                editingTextareaRef={editingTextareaRef}
            />

            <MessageInputArea
                input={input}
                isGenerating={isGenerating}
                selectedPrompt={selectedPrompt}
                onInputChange={setInput}
                onSend={handleSubmit}
                onStop={handleStopGeneration}
            />
        </div>
    );
}
