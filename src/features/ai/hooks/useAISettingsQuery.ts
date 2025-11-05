import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/services/api/client';
import { toast } from 'react-toastify';
import type { AISettings } from '@/types/story';

export const aiSettingsKeys = {
    all: ['ai', 'settings'] as const,
};

export const useAISettingsQuery = () => {
    return useQuery({
        queryKey: aiSettingsKeys.all,
        queryFn: () => aiApi.getSettings(),
    });
};

export const useUpdateAISettingsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AISettings> }) =>
            aiApi.updateSettings(id, data),
        onSuccess: (updatedSettings) => {
            queryClient.setQueryData(aiSettingsKeys.all, updatedSettings);
            toast.success('AI settings updated');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update AI settings: ${error.message}`);
        },
    });
};
