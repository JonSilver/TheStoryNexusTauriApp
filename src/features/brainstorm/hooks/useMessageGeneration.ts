import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';
import { aiService } from '@/services/ai/AIService';
import { useGenerateWithPrompt } from '@/features/ai/hooks/useGenerateWithPrompt';
import { useCreateBrainstormMutation, useUpdateBrainstormMutation } from './useBrainstormQuery';
import type { AIChat, AllowedModel, ChatMessage, Prompt, PromptParserConfig } from '@/types/story';

interface UseMessageGenerationParams {
    selectedChat: AIChat;
    selectedPrompt: Prompt | null;
    selectedModel: AllowedModel | null;
    storyId: string;
    onChatUpdate: (chat: AIChat) => void;
    createPromptConfig: (prompt: Prompt) => PromptParserConfig;
}

interface UseMessageGenerationReturn {
    generate: (input: string) => Promise<void>;
    isGenerating: boolean;
    abort: () => void;
    streamingMessageId: string | null;
    streamingContent: string;
    pendingUserMessage: ChatMessage | null;
}

export const useMessageGeneration = ({
    selectedChat,
    selectedPrompt,
    selectedModel,
    storyId,
    onChatUpdate,
    createPromptConfig,
}: UseMessageGenerationParams): UseMessageGenerationReturn => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [streamingContent, setStreamingContent] = useState("");
    const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);

    const { generateWithPrompt } = useGenerateWithPrompt();
    const createMutation = useCreateBrainstormMutation();
    const updateMutation = useUpdateBrainstormMutation();

    const abort = useCallback(() => {
        aiService.abortStream();
        setIsGenerating(false);
        setStreamingMessageId(null);
        setPendingUserMessage(null);
    }, []);

    const generate = useCallback(async (input: string) => {
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

            setPendingUserMessage(userMessage);

            const chatIdToUse = selectedChat.id || await new Promise<string>((resolve) => {
                const newTitle = userMessage.content.substring(0, 40) +
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
                        onChatUpdate(created);
                        resolve(created.id);
                    }
                });
            });

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

            setIsGenerating(true);
            setStreamingMessageId(assistantMessage.id);
            setStreamingContent("");

            const accumulateResponse = (() => {
                const chunks: string[] = [];
                return {
                    add: (token: string) => chunks.push(token),
                    getContent: () => chunks.join('')
                };
            })();

            await aiService.processStreamedResponse(
                response,
                (token) => {
                    accumulateResponse.add(token);
                    setStreamingContent(accumulateResponse.getContent());
                },
                () => {
                    const fullResponse = accumulateResponse.getContent();

                    setIsGenerating(false);
                    setStreamingMessageId(null);
                    setStreamingContent("");
                    setPendingUserMessage(null);

                    const updatedMessages = [
                        ...selectedChat.messages,
                        userMessage,
                        { ...assistantMessage, content: fullResponse },
                    ];

                    updateMutation.mutate({
                        id: chatIdToUse,
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
                    setPendingUserMessage(null);
                }
            );
        });

        if (error) {
            logger.error("Error during generation:", error);
            toast.error("An error occurred during generation");
            setIsGenerating(false);
            setStreamingMessageId(null);
            setPendingUserMessage(null);
        }
    }, [
        selectedChat,
        selectedPrompt,
        selectedModel,
        isGenerating,
        storyId,
        createPromptConfig,
        generateWithPrompt,
        createMutation,
        updateMutation,
        onChatUpdate
    ]);

    return {
        generate,
        isGenerating,
        abort,
        streamingMessageId,
        streamingContent,
        pendingUserMessage,
    };
};
