import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brainstormApi } from '@/services/api/client';
import type { AIChat } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const brainstormKeys = {
    all: ['brainstorm'] as const,
    byStory: (storyId: string) => ['brainstorm', 'story', storyId] as const,
    detail: (id: string) => ['brainstorm', id] as const,
};

// Fetch brainstorm chats by story
export const useBrainstormByStoryQuery = (storyId: string) => {
    return useQuery({
        queryKey: brainstormKeys.byStory(storyId),
        queryFn: () => brainstormApi.getByStory(storyId),
        enabled: !!storyId,
    });
};

// Fetch single brainstorm chat
export const useBrainstormQuery = (id: string) => {
    return useQuery({
        queryKey: brainstormKeys.detail(id),
        queryFn: () => brainstormApi.getById(id),
        enabled: !!id,
    });
};

// Create brainstorm chat mutation
export const useCreateBrainstormMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: brainstormApi.create,
        onSuccess: (newChat) => {
            queryClient.invalidateQueries({ queryKey: brainstormKeys.byStory(newChat.storyId) });
            toast.success('Brainstorm chat created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create brainstorm chat: ${error.message}`);
        },
    });
};

// Update brainstorm chat mutation
export const useUpdateBrainstormMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AIChat> }) =>
            brainstormApi.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: brainstormKeys.all });
            queryClient.invalidateQueries({ queryKey: brainstormKeys.detail(variables.id) });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update brainstorm chat: ${error.message}`);
        },
    });
};

// Delete brainstorm chat mutation
export const useDeleteBrainstormMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: brainstormApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: brainstormKeys.all });
            toast.success('Brainstorm chat deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete brainstorm chat: ${error.message}`);
        },
    });
};
