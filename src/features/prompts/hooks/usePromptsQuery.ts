import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi } from '@/services/api/client';
import type { Prompt } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const promptsKeys = {
    all: (params?: { storyId?: string; promptType?: string; includeSystem?: boolean }) =>
        ['prompts', params] as const,
    detail: (id: string) => ['prompts', id] as const,
};

// Fetch all prompts
export const usePromptsQuery = (params?: { storyId?: string; promptType?: string; includeSystem?: boolean }) => {
    return useQuery({
        queryKey: promptsKeys.all(params),
        queryFn: () => promptsApi.getAll(params),
    });
};

// Fetch single prompt
export const usePromptQuery = (id: string) => {
    return useQuery({
        queryKey: promptsKeys.detail(id),
        queryFn: () => promptsApi.getById(id),
        enabled: !!id,
    });
};

// Create prompt mutation
export const useCreatePromptMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: promptsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            toast.success('Prompt created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create prompt: ${error.message}`);
        },
    });
};

// Update prompt mutation
export const useUpdatePromptMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Prompt> }) =>
            promptsApi.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            queryClient.invalidateQueries({ queryKey: promptsKeys.detail(variables.id) });
            toast.success('Prompt updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update prompt: ${error.message}`);
        },
    });
};

// Delete prompt mutation
export const useDeletePromptMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: promptsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
            toast.success('Prompt deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete prompt: ${error.message}`);
        },
    });
};
