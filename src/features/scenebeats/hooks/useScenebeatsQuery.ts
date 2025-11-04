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
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: scenebeatsKeys.all });
            queryClient.invalidateQueries({ queryKey: scenebeatsKeys.detail(variables.id) });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update scene beat: ${error.message}`);
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
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete scene beat: ${error.message}`);
        },
    });
};
