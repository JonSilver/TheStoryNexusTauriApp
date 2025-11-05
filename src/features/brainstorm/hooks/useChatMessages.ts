import { useMemo } from 'react';
import type { AIChat, ChatMessage } from '@/types/story';

interface UseChatMessagesParams {
    selectedChat: AIChat;
    streamingMessageId: string | null;
    streamingContent: string;
}

export const useChatMessages = ({
    selectedChat,
    streamingMessageId,
    streamingContent,
}: UseChatMessagesParams): ChatMessage[] => {
    return useMemo(() => {
        if (!streamingMessageId) {
            return selectedChat.messages;
        }

        const streamingMessage: ChatMessage = {
            id: streamingMessageId,
            content: streamingContent,
            role: 'assistant',
            timestamp: new Date()
        };

        return [...selectedChat.messages, streamingMessage];
    }, [selectedChat.messages, streamingMessageId, streamingContent]);
};
