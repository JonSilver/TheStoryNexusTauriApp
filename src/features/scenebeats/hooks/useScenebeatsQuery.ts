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
        onError: () => {
            toast.error('Failed to update scene beat');
        },
        onSuccess: (updatedScenebeat, variables) => {
            queryClient.setQueryData(scenebeatsKeys.detail(variables.id), updatedScenebeat);
            queryClient.setQueryData<SceneBeat[]>(
                scenebeatsKeys.byChapter(updatedScenebeat.chapterId),
                (old) => old?.map(sb => sb.id === updatedScenebeat.id ? updatedScenebeat : sb)
            );
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
