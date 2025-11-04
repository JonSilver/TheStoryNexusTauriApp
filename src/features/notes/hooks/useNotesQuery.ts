import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '@/services/api/client';
import type { Note } from '@/types/story';
import { toast } from 'react-toastify';

// Query keys
export const notesKeys = {
    all: ['notes'] as const,
    byStory: (storyId: string) => ['notes', 'story', storyId] as const,
    detail: (id: string) => ['notes', id] as const,
};

// Fetch notes by story
export const useNotesByStoryQuery = (storyId: string) => {
    return useQuery({
        queryKey: notesKeys.byStory(storyId),
        queryFn: () => notesApi.getByStory(storyId),
        enabled: !!storyId,
    });
};

// Fetch single note
export const useNoteQuery = (id: string) => {
    return useQuery({
        queryKey: notesKeys.detail(id),
        queryFn: () => notesApi.getById(id),
        enabled: !!id,
    });
};

// Create note mutation
export const useCreateNoteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notesApi.create,
        onSuccess: (newNote) => {
            queryClient.invalidateQueries({ queryKey: notesKeys.byStory(newNote.storyId) });
            toast.success('Note created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create note: ${error.message}`);
        },
    });
};

// Update note mutation
export const useUpdateNoteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) =>
            notesApi.update(id, data),
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: notesKeys.detail(id) });

            // Snapshot previous value
            const previousNote = queryClient.getQueryData(notesKeys.detail(id));

            // Optimistically update
            if (previousNote) {
                queryClient.setQueryData(notesKeys.detail(id), { ...previousNote, ...data });
            }

            return { previousNote };
        },
        onError: (_error, variables, context) => {
            // Rollback on error
            if (context?.previousNote) {
                queryClient.setQueryData(notesKeys.detail(variables.id), context.previousNote);
            }
            toast.error('Failed to update note');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
        },
    });
};

// Delete note mutation
export const useDeleteNoteMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: notesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notesKeys.all });
            toast.success('Note deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete note: ${error.message}`);
        },
    });
};
