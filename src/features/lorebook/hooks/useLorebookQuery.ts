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
        onSuccess: (updatedEntry, variables) => {
            queryClient.setQueryData(lorebookKeys.detail(variables.id), updatedEntry);
            queryClient.setQueryData<LorebookEntry[]>(
                lorebookKeys.byStory(updatedEntry.storyId),
                (old) => old?.map(e => e.id === updatedEntry.id ? updatedEntry : e)
            );
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
