import { useAIStore } from "@/features/ai/stores/useAIStore";
import { useGenerateWithPrompt } from "@/features/ai/hooks/useGenerateWithPrompt";
import { usePromptParser } from "@/features/prompts/hooks/usePromptParser";
import { useChaptersByStoryQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { useLorebookContext } from "@/features/lorebook/context/LorebookContext";
import { LorebookFilterService } from "@/features/lorebook/stores/LorebookFilterService";
import { usePromptsQuery } from "@/features/prompts/hooks/usePromptsQuery";
import {
    AIChat,
    AllowedModel,
    ChatMessage,
    Prompt,
    PromptParserConfig,
} from "@/types/story";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";
import is from '@sindresorhus/is';
import { chatReducer, initialChatState } from "../reducers/chatReducer";
import { useCreateBrainstormMutation, useUpdateBrainstormMutation } from "../hooks/useBrainstormQuery";
import { ChatMessageList } from "./ChatMessageList";
import { ContextSelector } from "./ContextSelector";
import { MessageInputArea } from "./MessageInputArea";
import { PromptControls } from "./PromptControls";
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';

interface ChatInterfaceProps {
    storyId: string;
    selectedChat: AIChat;
    onChatUpdate: (chat: AIChat) => void;
}

export default function ChatInterface({ storyId, selectedChat, onChatUpdate }: ChatInterfaceProps) {
    const [draftMessage, setDraftMessage] = useState('');
    const [state, dispatch] = useReducer(chatReducer, {
        ...initialChatState,
        input: draftMessage,
    });
    const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Queries
    const { entries: lorebookEntries } = useLorebookContext();
    const { data: prompts = [], isLoading: promptsLoading, error: promptsQueryError } = usePromptsQuery({ includeSystem: true });
    const { data: chapters = [] } = useChaptersByStoryQuery(storyId);
    const promptsError = promptsQueryError?.message ?? null;

    // AI Store (for client-side AI operations)
    const {
        initialize: initializeAI,
        getAvailableModels,
        processStreamedResponse,
        abortGeneration,
    } = useAIStore();

    // Generation hooks
    const { generateWithPrompt } = useGenerateWithPrompt();
    const { parsePrompt } = usePromptParser();

    // Mutations
    const createMutation = useCreateBrainstormMutation();
    const updateMutation = useUpdateBrainstormMutation();

    // Initialize
    useEffect(() => {
        const loadData = async () => {
            await initializeAI();

            const models = await getAvailableModels();
            if (models.length > 0) {
                dispatch({
                    type: "SET_AVAILABLE_MODELS",
                    payload: models.map((model) => ({
                        id: model.id,
                        name: model.name,
                        provider: model.provider,
                    })),
                });
            }
        };

        dispatch({ type: "CLEAR_CONTEXT_SELECTIONS" });
        loadData();
    }, [initializeAI, getAvailableModels]);

    // Update chapters in state when data changes
    useEffect(() => {
        if (chapters.length > 0) {
            dispatch({ type: "SET_CHAPTERS", payload: chapters });
        }
    }, [chapters]);

    useEffect(() => {
        dispatch({ type: "SET_INPUT", payload: draftMessage });
    }, [draftMessage]);

    useEffect(() => {
        if (selectedChat) {
            dispatch({ type: "SET_CURRENT_CHAT_ID", payload: selectedChat.id });
            dispatch({
                type: "SET_MESSAGES",
                payload: selectedChat.messages || [],
            });
        }
    }, [selectedChat]);

    useEffect(() => {
        if (state.includeFullContext) {
            dispatch({ type: "CLEAR_CONTEXT_SELECTIONS" });
        }
    }, [state.includeFullContext]);

    // Helper functions
    const getFilteredEntries = () => {
        return LorebookFilterService.getFilteredEntries(lorebookEntries, false);
    };

    const createPromptConfig = (prompt: Prompt): PromptParserConfig => {
        return {
            promptId: prompt.id,
            storyId,
            scenebeat: state.input.trim(),
            additionalContext: {
                chatHistory: state.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                })),
                includeFullContext: state.includeFullContext,
                selectedSummaries: state.includeFullContext
                    ? []
                    : state.selectedSummaries,
                selectedItems: state.includeFullContext
                    ? []
                    : state.selectedItems.map((item) => item.id),
                selectedChapterContent: state.includeFullContext
                    ? []
                    : state.selectedChapterContent,
            },
        };
    };

    // Event handlers
    const handlePromptSelect = (prompt: Prompt, model: AllowedModel) => {
        dispatch({ type: "SET_PROMPT_AND_MODEL", payload: { prompt, model } });
    };

    const handlePreviewPrompt = async () => {
        if (!state.selectedPrompt) return;

        dispatch({ type: "START_PREVIEW" });

        const config = createPromptConfig(state.selectedPrompt);

        const [error, parsedPrompt] = await attemptPromise(async () =>
            parsePrompt(config)
        );
        if (error) {
            const errorMessage = is.error(error) ? error.message : String(error);
            dispatch({ type: "PREVIEW_ERROR", payload: errorMessage });
            toast.error(`Error previewing prompt: ${errorMessage}`);
            return;
        }

        if (parsedPrompt.error) {
            dispatch({
                type: "PREVIEW_ERROR",
                payload: parsedPrompt.error,
            });
            toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
            return;
        }

        dispatch({
            type: "PREVIEW_SUCCESS",
            payload: parsedPrompt.messages,
        });
    };

    const handleSubmit = async () => {
        if (
            !state.input.trim() ||
            !state.selectedPrompt ||
            !state.selectedModel ||
            state.isGenerating
        )
            return;

        const [error] = await attemptPromise(async () => {
            // Type safety: already checked above
            if (!state.selectedPrompt || !state.selectedModel) {
                throw new Error("Prompt or model not selected");
            }

            setDraftMessage('');

            const userMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                content: state.input.trim(),
                timestamp: new Date(),
            };

            let chatId = state.currentChatId;
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

            const config = createPromptConfig(state.selectedPrompt);
            const response = await generateWithPrompt(
                config,
                state.selectedModel
            );

            if (!response.ok && response.status !== 204) {
                throw new Error("Failed to generate response");
            }

            if (response.status === 204) {
                logger.info("Generation was aborted.");
                dispatch({ type: "ABORT_GENERATION" });
                return;
            }

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };

            dispatch({
                type: "START_GENERATION",
                payload: { userMessage, assistantMessage, chatId },
            });

            let fullResponse = "";
            await processStreamedResponse(
                response,
                (token) => {
                    fullResponse += token;
                    dispatch({
                        type: "UPDATE_MESSAGE",
                        payload: {
                            id: assistantMessage.id,
                            content: fullResponse,
                        },
                    });
                },
                () => {
                    dispatch({ type: "COMPLETE_GENERATION" });
                    const updatedMessages = [
                        ...state.messages,
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
                (error) => {
                    logger.error("Streaming error:", error);
                    dispatch({
                        type: "SET_PREVIEW_ERROR",
                        payload: "Failed to stream response",
                    });
                    dispatch({ type: "ABORT_GENERATION" });
                }
            );
        });
        if (error) {
            logger.error("Error during generation:", error);
            dispatch({
                type: "SET_PREVIEW_ERROR",
                payload:
                    is.error(error)
                        ? error.message
                        : "An unknown error occurred",
            });
            dispatch({ type: "ABORT_GENERATION" });
        }
    };

    const handleInputChange = (value: string) => {
        dispatch({ type: "SET_INPUT", payload: value });
        setDraftMessage(value);
    };

    const handleStopGeneration = () => {
        abortGeneration();
        dispatch({ type: "ABORT_GENERATION" });
    };

    const handleStartEdit = (message: ChatMessage) => {
        if (state.streamingMessageId === message.id) {
            if (
                !confirm(
                    "This message is still being generated. Stop generation and edit?"
                )
            )
                return;
            abortGeneration();
            dispatch({ type: "SET_STREAMING_MESSAGE_ID", payload: null });
        }
        dispatch({
            type: "START_EDIT",
            payload: { id: message.id, content: message.content },
        });
    };

    const handleSaveEdit = async (messageId: string) => {
        if (!state.editingContent.trim()) {
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
                        content: state.editingContent,
                        originalContent,
                        editedAt,
                        editedBy: 'user' as const
                    }
                    : msg
            );

            dispatch({
                type: "UPDATE_EDITED_MESSAGE",
                payload: {
                    id: messageId,
                    content: state.editingContent,
                    editedAt,
                },
            });

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

            // Revert to original messages on error
            dispatch({
                type: "SET_MESSAGES",
                payload: selectedChat.messages || [],
            });
            return;
        }

        toast.success("Message edited");
        dispatch({ type: "CANCEL_EDIT" });
    };

    const handleCancelEdit = () => {
        dispatch({ type: "CANCEL_EDIT" });
    };

    const handleToggleSummary = (chapterId: string) => {
        dispatch({ type: "TOGGLE_SUMMARY", payload: chapterId });
    };

    const handleItemSelect = (itemId: string) => {
        const filteredEntries = LorebookFilterService.getFilteredEntries(lorebookEntries, false);
        const item = filteredEntries.find((entry) => entry.id === itemId);
        if (item) {
            dispatch({ type: "ADD_ITEM", payload: item });
        }
    };

    const handleRemoveItem = (itemId: string) => {
        dispatch({ type: "REMOVE_ITEM", payload: itemId });
    };

    const handleChapterContentSelect = (chapterId: string) => {
        dispatch({ type: "ADD_CHAPTER_CONTENT", payload: chapterId });
    };

    const handleRemoveChapterContent = (chapterId: string) => {
        dispatch({ type: "REMOVE_CHAPTER_CONTENT", payload: chapterId });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
                <PromptControls
                    prompts={prompts}
                    promptsLoading={promptsLoading}
                    promptsError={promptsError}
                    selectedPrompt={state.selectedPrompt}
                    selectedModel={state.selectedModel}
                    availableModels={state.availableModels}
                    showPreview={state.showPreview}
                    previewMessages={state.previewMessages}
                    previewLoading={state.previewLoading}
                    previewError={state.previewError}
                    onPromptSelect={handlePromptSelect}
                    onPreviewPrompt={handlePreviewPrompt}
                    onClosePreview={() => dispatch({ type: "CLOSE_PREVIEW" })}
                />

                <ContextSelector
                    includeFullContext={state.includeFullContext}
                    contextOpen={state.contextOpen}
                    selectedSummaries={state.selectedSummaries}
                    selectedItems={state.selectedItems}
                    selectedChapterContent={state.selectedChapterContent}
                    chapters={state.chapters}
                    lorebookEntries={lorebookEntries}
                    onToggleFullContext={() =>
                        dispatch({ type: "TOGGLE_FULL_CONTEXT" })
                    }
                    onToggleContextOpen={() =>
                        dispatch({ type: "TOGGLE_CONTEXT_OPEN" })
                    }
                    onToggleSummary={handleToggleSummary}
                    onItemSelect={handleItemSelect}
                    onRemoveItem={handleRemoveItem}
                    onChapterContentSelect={handleChapterContentSelect}
                    onRemoveChapterContent={handleRemoveChapterContent}
                    getFilteredEntries={getFilteredEntries}
                />
            </div>

            <ChatMessageList
                messages={state.messages}
                editingMessageId={state.editingMessageId}
                editingContent={state.editingContent}
                streamingMessageId={state.streamingMessageId}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditContentChange={(value) =>
                    dispatch({ type: "SET_EDITING_CONTENT", payload: value })
                }
                editingTextareaRef={editingTextareaRef}
            />

            <MessageInputArea
                input={state.input}
                isGenerating={state.isGenerating}
                selectedPrompt={state.selectedPrompt}
                onInputChange={handleInputChange}
                onSend={handleSubmit}
                onStop={handleStopGeneration}
            />
        </div>
    );
}
