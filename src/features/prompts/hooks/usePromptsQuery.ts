import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi } from '@/services/api/client';
import type { Prompt } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const promptsKeys = {
    all: ['prompts'] as const,
    lists: () => [...promptsKeys.all, 'list'] as const,
    list: (params?: { storyId?: string; promptType?: string; includeSystem?: boolean }) =>
        [...promptsKeys.lists(), params] as const,
    detail: (id: string) => [...promptsKeys.all, id] as const,
};

// Fetch all prompts
export const usePromptsQuery = (params?: { storyId?: string; promptType?: string; includeSystem?: boolean }) => {
    return useQuery({
        queryKey: promptsKeys.list(params),
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
            queryClient.invalidateQueries({ queryKey: promptsKeys.lists() });
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
        onSuccess: (updatedPrompt, variables) => {
            queryClient.setQueryData(promptsKeys.detail(variables.id), updatedPrompt);
            queryClient.setQueryData<Prompt[]>(promptsKeys.lists(), (old) =>
                old?.map(p => p.id === updatedPrompt.id ? updatedPrompt : p)
            );
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
            queryClient.invalidateQueries({ queryKey: promptsKeys.lists() });
            toast.success('Prompt deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete prompt: ${error.message}`);
        },
    });
};

// Clone prompt mutation
export const useClonePromptMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Fetch the original prompt
            const originalPrompt = await promptsApi.getById(id);

            // Create cloned prompt data
            const { id: _id, createdAt: _createdAt, ...dataToClone } = originalPrompt;

            const clonedPromptData = {
                ...dataToClone,
                name: `${originalPrompt.name} (Copy)`,
                isSystem: false, // Always false for cloned prompts
            };

            // Create the new prompt
            return promptsApi.create(clonedPromptData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: promptsKeys.lists() });
            toast.success('Prompt cloned successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to clone prompt: ${error.message}`);
        },
    });
};
