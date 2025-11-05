import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUpdateBrainstormMutation } from './useBrainstormQuery';
import type { Prompt, AllowedModel } from '@/types/story';

interface UsePromptSelectionReturn {
    selectedPrompt: Prompt | null;
    selectedModel: AllowedModel | null;
    selectPrompt: (prompt: Prompt, model: AllowedModel) => void;
    isLoading: boolean;
}

export const usePromptSelection = (
    chatId: string,
    lastUsedPromptId: string | undefined,
    prompts: Prompt[]
): UsePromptSelectionReturn => {
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [selectedModel, setSelectedModel] = useState<AllowedModel | null>(null);
    const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

    const updateMutation = useUpdateBrainstormMutation();

    useEffect(() => {
        if (!hasLoadedInitial && lastUsedPromptId && prompts.length > 0) {
            const lastPrompt = prompts.find(p => p.id === lastUsedPromptId);
            if (lastPrompt && lastPrompt.allowedModels.length > 0) {
                setSelectedPrompt(lastPrompt);
                setSelectedModel(lastPrompt.allowedModels[0]);
            }
            setHasLoadedInitial(true);
        }
    }, [lastUsedPromptId, prompts, hasLoadedInitial]);

    const selectPrompt = useCallback((prompt: Prompt, model: AllowedModel) => {
        setSelectedPrompt(prompt);
        setSelectedModel(model);

        updateMutation.mutate({
            id: chatId,
            data: { lastUsedPromptId: prompt.id }
        });
    }, [chatId, updateMutation]);

    const stablePrompt = useMemo(() => selectedPrompt, [selectedPrompt]);
    const stableModel = useMemo(() => selectedModel, [selectedModel]);

    return {
        selectedPrompt: stablePrompt,
        selectedModel: stableModel,
        selectPrompt,
        isLoading: updateMutation.isPending,
    };
};
