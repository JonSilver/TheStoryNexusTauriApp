import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chaptersApi } from '@/services/api/client';
import type { Chapter } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const chaptersKeys = {
    all: ['chapters'] as const,
    byStory: (storyId: string) => ['chapters', 'story', storyId] as const,
    detail: (id: string) => ['chapters', id] as const,
};

// Fetch chapters by story
export const useChaptersByStoryQuery = (storyId: string) => {
    return useQuery({
        queryKey: chaptersKeys.byStory(storyId),
        queryFn: () => chaptersApi.getByStory(storyId),
        enabled: !!storyId,
    });
};

// Fetch single chapter
export const useChapterQuery = (id: string) => {
    return useQuery({
        queryKey: chaptersKeys.detail(id),
        queryFn: () => chaptersApi.getById(id),
        enabled: !!id,
    });
};

// Create chapter mutation
export const useCreateChapterMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: chaptersApi.create,
        onSuccess: (newChapter) => {
            queryClient.invalidateQueries({ queryKey: chaptersKeys.byStory(newChapter.storyId) });
            toast.success('Chapter created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create chapter: ${error.message}`);
        },
    });
};

// Update chapter mutation
export const useUpdateChapterMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Chapter> }) =>
            chaptersApi.update(id, data),
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: chaptersKeys.detail(id) });

            // Snapshot previous value
            const previousChapter = queryClient.getQueryData(chaptersKeys.detail(id));

            // Optimistically update
            if (previousChapter) {
                queryClient.setQueryData(chaptersKeys.detail(id), { ...previousChapter, ...data });
            }

            return { previousChapter };
        },
        onError: (_error, variables, context) => {
            // Rollback on error
            if (context?.previousChapter) {
                queryClient.setQueryData(chaptersKeys.detail(variables.id), context.previousChapter);
            }
            toast.error('Failed to update chapter');
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: chaptersKeys.detail(variables.id) });
        },
    });
};

// Delete chapter mutation
export const useDeleteChapterMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: chaptersApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chaptersKeys.all });
            toast.success('Chapter deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete chapter: ${error.message}`);
        },
    });
};
