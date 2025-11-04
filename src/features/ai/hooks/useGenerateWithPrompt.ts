import { useCallback } from 'react';
import { usePromptParser } from '@/features/prompts/hooks/usePromptParser';
import { useAIStore } from '../stores/useAIStore';
import { attemptPromise } from '@jfdi/attempt';
import { promptsApi } from '@/services/api/client';
import { generateWithProvider } from '../services/aiGenerationHelper';
import type { PromptParserConfig, AllowedModel } from '@/types/story';

/**
 * Hook that provides AI generation with automatic prompt parsing and context injection.
 * Replaces the Zustand store method to enable proper React Context access.
 */
export function useGenerateWithPrompt() {
    const { parsePrompt } = usePromptParser();
    const isInitialized = useAIStore(state => state.isInitialized);
    const initialize = useAIStore(state => state.initialize);

    const generateWithPrompt = useCallback(async (
        config: PromptParserConfig,
        selectedModel: AllowedModel
    ): Promise<Response> => {
        if (!isInitialized) {
            await initialize();
        }

        const { messages, error } = await parsePrompt(config);

        if (error || !messages.length) {
            throw new Error(error || 'Failed to parse prompt');
        }

        // Get the prompt to access generation parameters
        const [fetchError, prompt] = await attemptPromise(() => promptsApi.getById(config.promptId));

        if (fetchError) {
            throw fetchError;
        }

        return generateWithProvider(selectedModel.provider, messages, selectedModel.id, {
            temperature: prompt?.temperature ?? 0.7,
            maxTokens: prompt?.maxTokens ?? 2048,
            top_p: prompt?.top_p,
            top_k: prompt?.top_k,
            repetition_penalty: prompt?.repetition_penalty,
            min_p: prompt?.min_p
        });
    }, [parsePrompt, isInitialized, initialize]);

    return { generateWithPrompt };
}
