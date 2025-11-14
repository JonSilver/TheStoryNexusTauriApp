import { aiService } from "@/services/ai/AIService";
import type { AIModel } from "@/types/story";
import { useQuery } from "@tanstack/react-query";

const availableModelsKeys = {
    all: ["ai", "models"] as const
};

export const useAvailableModels = () =>
    useQuery<AIModel[]>({
        queryKey: availableModelsKeys.all,
        queryFn: async () => {
            await aiService.initialize();
            return aiService.getAvailableModels();
        },
        staleTime: 5 * 60 * 1000
    });
