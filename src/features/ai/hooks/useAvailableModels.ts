import { useQuery } from '@tanstack/react-query';
import { aiService } from '@/services/ai/AIService';
import type { AIModel } from '@/types/story';

export const availableModelsKeys = {
    all: ['ai', 'models'] as const,
};

export const useAvailableModels = () => {
    return useQuery<AIModel[]>({
        queryKey: availableModelsKeys.all,
        queryFn: async () => {
            await aiService.initialize();
            return aiService.getAvailableModels();
        },
        staleTime: 5 * 60 * 1000,
    });
};
