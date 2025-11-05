import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '@/services/ai/AIService';
import { toast } from 'react-toastify';
import { aiSettingsKeys } from './useAISettingsQuery';
import { availableModelsKeys } from './useAvailableModels';
import type { AIProvider } from '@/types/story';

export const useUpdateProviderKeyMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ provider, key }: { provider: AIProvider; key: string }) =>
            aiService.updateKey(provider, key),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiSettingsKeys.all });
            queryClient.invalidateQueries({ queryKey: availableModelsKeys.all });
            toast.success('Provider key updated');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update provider key: ${error.message}`);
        },
    });
};
