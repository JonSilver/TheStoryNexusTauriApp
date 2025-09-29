import { create } from 'zustand';
import { db } from '@/services/database';
import type { AIChat } from '@/types/story';
import { v4 as uuidv4 } from 'uuid';

interface BrainstormState {
    chats: AIChat[];
    selectedChat: AIChat | null;
    isLoading: boolean;
    error: string | null;
    draftMessage: string;

    // Actions
    fetchChats: (storyId: string) => Promise<void>;
    addChat: (storyId: string, title: string, messages: any[]) => Promise<string>;
    selectChat: (chat: AIChat) => void;
    createNewChat: (storyId: string) => Promise<string>;
    deleteChat: (chatId: string) => Promise<void>;
    updateChat: (chatId: string, data: Partial<AIChat>) => Promise<void>;
    setDraftMessage: (message: string) => void;
    clearDraftMessage: () => void;
    // Message-level helpers
    updateMessage: (chatId: string, messageId: string, updates: Partial<any>) => Promise<void>;
    setMessageEdited: (chatId: string, messageId: string, editedContent: string) => Promise<void>;
}

export const useBrainstormStore = create<BrainstormState>((set, get) => ({
    chats: [],
    selectedChat: null,
    isLoading: false,
    error: null,
    draftMessage: '',

    fetchChats: async (storyId) => {
        set({ isLoading: true, error: null });
        try {
            const chats = await db.aiChats
                .where('storyId')
                .equals(storyId)
                .toArray();

            // Sort chats by createdAt in descending order (newest first)
            chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            set({ chats, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addChat: async (storyId: string, title: string, messages: any[]) => {
        try {
            const id = uuidv4();
            const newChat: AIChat = {
                id,
                storyId,
                title,
                messages,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.aiChats.add(newChat);
            set(state => ({
                chats: [newChat, ...state.chats],
                selectedChat: newChat
            }));

            return id;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    selectChat: (chat) => {
        set({ selectedChat: chat });
    },

    createNewChat: async (storyId: string) => {
        try {
            const id = uuidv4();
            const newChat: AIChat = {
                id,
                storyId,
                title: `New Chat ${new Date().toLocaleString()}`,
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.aiChats.add(newChat);
            set(state => ({
                chats: [newChat, ...state.chats],
                selectedChat: newChat
            }));

            return id;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    deleteChat: async (chatId: string) => {
        try {
            await db.aiChats.delete(chatId);
            set(state => ({
                chats: state.chats.filter(chat => chat.id !== chatId),
                selectedChat: state.selectedChat?.id === chatId ? null : state.selectedChat
            }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    updateChat: async (chatId: string, data: Partial<AIChat>) => {
        try {
            // Update the timestamp to move the chat to the top of the list
            const updatedData = {
                ...data,
                updatedAt: new Date()
            };

            await db.aiChats.update(chatId, updatedData);

            // Fetch the updated chat to ensure we have all the data
            const updatedChat = await db.aiChats.get(chatId);

            if (updatedChat) {
                set(state => {
                    // Remove the chat from the current list
                    const filteredChats = state.chats.filter(chat => chat.id !== chatId);

                    // Add the updated chat to the beginning of the list
                    return {
                        chats: [updatedChat, ...filteredChats],
                        selectedChat: state.selectedChat?.id === chatId
                            ? updatedChat
                            : state.selectedChat
                    };
                });
            }
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Update a single message within a chat (optimistic update)
    updateMessage: async (chatId: string, messageId: string, updates: Partial<any>) => {
        try {
            // Optimistically update in-memory state
            set(state => {
                const chats = state.chats.map(chat => {
                    if (chat.id !== chatId) return chat;
                    const messages = (chat.messages || []).map(msg =>
                        msg.id === messageId ? { ...msg, ...updates } : msg
                    );
                    return { ...chat, messages, updatedAt: new Date() };
                });

                const selectedChat = state.selectedChat?.id === chatId
                    ? chats.find(c => c.id === chatId) || state.selectedChat
                    : state.selectedChat;

                return { chats, selectedChat };
            });

            // Persist to DB using existing updateChat path
            const chat = await db.aiChats.get(chatId);
            if (!chat) throw new Error('Chat not found');

            const updatedMessages = (chat.messages || []).map((msg: any) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            );

            await db.aiChats.update(chatId, { messages: updatedMessages, updatedAt: new Date() });
        } catch (error) {
            // On error, reload the chat list to rollback optimistic change
            const chats = await db.aiChats.toArray();
            set({ chats });
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Convenience helper to mark a message as edited and persist originalContent
    setMessageEdited: async (chatId: string, messageId: string, editedContent: string) => {
        try {
            const chat = await db.aiChats.get(chatId);
            if (!chat) throw new Error('Chat not found');

            const existingMsg = (chat.messages || []).find((m: any) => m.id === messageId);
            if (!existingMsg) throw new Error('Message not found');

            const originalContent = existingMsg.originalContent ?? existingMsg.content;
            const editedAt = new Date().toISOString();

            // Use updateMessage to apply optimistic update + persist
            await get().updateMessage(chatId, messageId, {
                content: editedContent,
                originalContent,
                editedAt,
                editedBy: 'user'
            });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    setDraftMessage: (message: string) => {
        set({ draftMessage: message });
    },

    clearDraftMessage: () => {
        set({ draftMessage: '' });
    },
})); 