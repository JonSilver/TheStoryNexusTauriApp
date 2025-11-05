import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUpdateBrainstormMutation } from './useBrainstormQuery';
import type { Prompt, AllowedModel } from '@/types/story';
import { logger } from '@/utils/logger';

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
        logger.info('[usePromptSelection] chatId changed, resetting hasLoadedInitial', { chatId });
        setHasLoadedInitial(false);
    }, [chatId]);

    useEffect(() => {
        logger.info('[usePromptSelection] Load effect running', {
            chatId,
            hasLoadedInitial,
            lastUsedPromptId,
            promptsCount: prompts.length
        });

        if (!hasLoadedInitial && lastUsedPromptId && prompts.length > 0) {
            const lastPrompt = prompts.find(p => p.id === lastUsedPromptId);
            logger.info('[usePromptSelection] Found last prompt?', {
                found: !!lastPrompt,
                promptId: lastPrompt?.id,
                promptName: lastPrompt?.name,
                hasModels: lastPrompt?.allowedModels.length
            });

            if (lastPrompt && lastPrompt.allowedModels.length > 0) {
                setSelectedPrompt(lastPrompt);
                setSelectedModel(lastPrompt.allowedModels[0]);
                logger.info('[usePromptSelection] Set prompt and model', {
                    promptName: lastPrompt.name,
                    modelId: lastPrompt.allowedModels[0].id
                });
            }
            setHasLoadedInitial(true);
        }
    }, [chatId, lastUsedPromptId, prompts, hasLoadedInitial]);

    const selectPrompt = useCallback((prompt: Prompt, model: AllowedModel) => {
        logger.info('[usePromptSelection] Manual selection', {
            chatId,
            promptId: prompt.id,
            promptName: prompt.name,
            modelId: model.id
        });

        setSelectedPrompt(prompt);
        setSelectedModel(model);

        updateMutation.mutate({
            id: chatId,
            data: { lastUsedPromptId: prompt.id }
        });
    }, [chatId, updateMutation]);

    const stablePrompt = useMemo(() => selectedPrompt, [selectedPrompt]);
    const stableModel = useMemo(() => selectedModel, [selectedModel]);

    const returnValue = {
        selectedPrompt: stablePrompt,
        selectedModel: stableModel,
        selectPrompt,
        isLoading: updateMutation.isPending,
    };

    logger.info('[usePromptSelection] Returning', {
        chatId,
        selectedPromptName: stablePrompt?.name,
        selectedModelId: stableModel?.id
    });

    return returnValue;
};
