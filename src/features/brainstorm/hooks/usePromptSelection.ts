import type { AllowedModel, Prompt } from "@/types/story";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUpdateBrainstormMutation } from "./useBrainstormQuery";

interface UsePromptSelectionReturn {
    selectedPrompt: Prompt | null;
    selectedModel: AllowedModel | null;
    selectPrompt: (prompt: Prompt, model: AllowedModel) => void;
    isLoading: boolean;
}

export const usePromptSelection = (
    chatId: string,
    lastUsedPromptId: string | undefined,
    lastUsedModelId: string | undefined,
    prompts: Prompt[]
): UsePromptSelectionReturn => {
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(null);
    const [loadedChatId, setLoadedChatId] = useState<string | null>(null);

    const updateMutation = useUpdateBrainstormMutation();

    useEffect(() => {
        if (loadedChatId !== chatId && lastUsedPromptId && prompts.length > 0) {
            const lastPrompt = prompts.find(p => p.id === lastUsedPromptId);

            if (lastPrompt && lastPrompt.allowedModels.length > 0) {
                const lastModel = lastUsedModelId
                    ? lastPrompt.allowedModels.find(m => m.id === lastUsedModelId)
                    : undefined;

                const modelToUse = lastModel || lastPrompt.allowedModels[0];

                setSelectedPrompt(lastPrompt);
                setSelectedModel(modelToUse);
            }
            setLoadedChatId(chatId);
        }
    }, [chatId, lastUsedPromptId, lastUsedModelId, prompts, loadedChatId]);

    const selectPrompt = useCallback(
        (prompt: Prompt, model: AllowedModel) => {
            setSelectedPrompt(prompt);
            setSelectedModel(model);

            updateMutation.mutate({
                id: chatId,
                data: {
                    lastUsedPromptId: prompt.id,
                    lastUsedModelId: model.id
                }
            });
        },
        [chatId, updateMutation]
    );

    const stablePrompt = useMemo(() => selectedPrompt, [selectedPrompt]);
    const stableModel = useMemo(() => selectedModel, [selectedModel]);

    return {
        selectedPrompt: stablePrompt,
        selectedModel: stableModel,
        selectPrompt,
        isLoading: updateMutation.isPending
    };
};
