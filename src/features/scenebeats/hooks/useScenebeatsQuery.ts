import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenebeatsApi } from '@/services/api/client';
import type { SceneBeat } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const scenebeatsKeys = {
    all: ['scenebeats'] as const,
    byChapter: (chapterId: string) => ['scenebeats', 'chapter', chapterId] as const,
    detail: (id: string) => ['scenebeats', id] as const,
};

// Fetch scene beats by chapter
export const useScenebeatsByChapterQuery = (chapterId: string) => {
    return useQuery({
        queryKey: scenebeatsKeys.byChapter(chapterId),
        queryFn: () => scenebeatsApi.getByChapter(chapterId),
        enabled: !!chapterId,
    });
};

// Fetch single scene beat
export const useScenebeatQuery = (id: string) => {
    return useQuery({
        queryKey: scenebeatsKeys.detail(id),
        queryFn: () => scenebeatsApi.getById(id),
        enabled: !!id,
    });
};

// Create scene beat mutation
export const useCreateScenebeatMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scenebeatsApi.create,
        onSuccess: (newSceneBeat) => {
            queryClient.invalidateQueries({ queryKey: scenebeatsKeys.byChapter(newSceneBeat.chapterId) });
            toast.success('Scene beat created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create scene beat: ${error.message}`);
        },
    });
};

// Update scene beat mutation
export const useUpdateScenebeatMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SceneBeat> }) =>
            scenebeatsApi.update(id, data),
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: scenebeatsKeys.detail(id) });

            // Snapshot previous value
            const previousScenebeat = queryClient.getQueryData(scenebeatsKeys.detail(id));

            // Optimistically update
            if (previousScenebeat) {
                queryClient.setQueryData(scenebeatsKeys.detail(id), { ...previousScenebeat, ...data });
            }

            return { previousScenebeat };
        },
        onError: (_error, variables, context) => {
            // Rollback on error
            if (context?.previousScenebeat) {
                queryClient.setQueryData(scenebeatsKeys.detail(variables.id), context.previousScenebeat);
            }
            toast.error('Failed to update scene beat');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scenebeatsKeys.all });
        },
    });
};

// Delete scene beat mutation
export const useDeleteScenebeatMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scenebeatsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scenebeatsKeys.all });
            toast.success('Scene beat deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete scene beat: ${error.message}`);
        },
    });
};
