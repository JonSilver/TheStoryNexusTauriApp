import type { PromptMessage } from "@/types/story";
import { useState } from "react";
import { toast } from "react-toastify";

type MessageWithId = PromptMessage & { _id: string };

const createMessageWithId = (message: PromptMessage): MessageWithId => ({
    ...message,
    _id: crypto.randomUUID()
});

interface UsePromptMessagesProps {
    initialMessages?: PromptMessage[];
}

export const usePromptMessages = ({ initialMessages }: UsePromptMessagesProps) => {
    const [messages, setMessages] = useState<MessageWithId[]>(
        initialMessages?.map(createMessageWithId) || [createMessageWithId({ role: "system", content: "" })]
    );

    const addMessage = (role: "system" | "user" | "assistant") => {
        setMessages([...messages, createMessageWithId({ role, content: "" })]);
    };

    const removeMessage = (index: number) => {
        if (messages.length === 1) {
            toast.error("Prompt must have at least one message");
            return;
        }
        setMessages(messages.filter((_, i) => i !== index));
    };

    const moveMessage = (index: number, direction: "up" | "down") => {
        if ((direction === "up" && index === 0) || (direction === "down" && index === messages.length - 1)) return;

        const newMessages = [...messages];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        [newMessages[index], newMessages[newIndex]] = [newMessages[newIndex], newMessages[index]];
        setMessages(newMessages);
    };

    const updateMessage = (index: number, updates: Partial<PromptMessage>) => {
        const newMessages = messages.map((msg, i) => (i === index ? { ...msg, ...updates } : msg));
        setMessages(newMessages);
    };

    const getMessagesWithoutIds = () => messages.map(({ _id, ...msg }) => msg);

    return {
        messages,
        addMessage,
        removeMessage,
        moveMessage,
        updateMessage,
        getMessagesWithoutIds
    };
};
