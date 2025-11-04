import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/services/api/client';
import type { AISettings } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const aiKeys = {
    settings: ['ai', 'settings'] as const,
};

// Fetch AI settings
export const useAISettingsQuery = () => {
    return useQuery({
        queryKey: aiKeys.settings,
        queryFn: aiApi.getSettings,
    });
};

// Update AI settings mutation
export const useUpdateAISettingsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AISettings> }) =>
            aiApi.updateSettings(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: aiKeys.settings });
            toast.success('AI settings updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update AI settings: ${error.message}`);
        },
    });
};
