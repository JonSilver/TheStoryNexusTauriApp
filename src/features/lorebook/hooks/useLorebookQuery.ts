import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lorebookApi } from '@/services/api/client';
import type { LorebookEntry } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const lorebookKeys = {
    all: ['lorebook'] as const,
    byStory: (storyId: string) => ['lorebook', 'story', storyId] as const,
    byCategory: (storyId: string, category: string) => ['lorebook', 'story', storyId, 'category', category] as const,
    byTag: (storyId: string, tag: string) => ['lorebook', 'story', storyId, 'tag', tag] as const,
    detail: (id: string) => ['lorebook', id] as const,
};

// Fetch lorebook entries by story
export const useLorebookByStoryQuery = (storyId: string) => {
    return useQuery({
        queryKey: lorebookKeys.byStory(storyId),
        queryFn: () => lorebookApi.getByStory(storyId),
        enabled: !!storyId,
    });
};

// Fetch lorebook entries by category
export const useLorebookByCategoryQuery = (storyId: string, category: string) => {
    return useQuery({
        queryKey: lorebookKeys.byCategory(storyId, category),
        queryFn: () => lorebookApi.getByCategory(storyId, category),
        enabled: !!storyId && !!category,
    });
};

// Fetch single lorebook entry
export const useLorebookEntryQuery = (id: string) => {
    return useQuery({
        queryKey: lorebookKeys.detail(id),
        queryFn: () => lorebookApi.getById(id),
        enabled: !!id,
    });
};

// Create lorebook entry mutation
export const useCreateLorebookMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: lorebookApi.create,
        onSuccess: (newEntry) => {
            queryClient.invalidateQueries({ queryKey: lorebookKeys.byStory(newEntry.storyId) });
            toast.success('Lorebook entry created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create lorebook entry: ${error.message}`);
        },
    });
};

// Update lorebook entry mutation
export const useUpdateLorebookMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<LorebookEntry> }) =>
            lorebookApi.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: lorebookKeys.all });
            queryClient.invalidateQueries({ queryKey: lorebookKeys.detail(variables.id) });
            toast.success('Lorebook entry updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update lorebook entry: ${error.message}`);
        },
    });
};

// Delete lorebook entry mutation
export const useDeleteLorebookMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: lorebookApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lorebookKeys.all });
            toast.success('Lorebook entry deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete lorebook entry: ${error.message}`);
        },
    });
};
