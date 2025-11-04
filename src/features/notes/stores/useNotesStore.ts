import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { Note } from '@/types/story';
import { notesApi } from '@/services/api/client';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { toastCRUD } from '@/utils/toastUtils';
import { noteSchema } from '@/schemas/entities';
import { validatePartialUpdate } from '@/utils/crudHelpers';
import { logger } from '@/utils/logger';

interface NotesState {
    notes: Note[];
    selectedNote: Note | null;
    isLoading: boolean;
    error: string | null;
    fetchNotes: (storyId: string) => Promise<void>;
    createNote: (storyId: string, title: string, content: string, type: Note['type']) => Promise<string>;
    updateNote: (noteId: string, data: Partial<Note>) => Promise<void>;
    deleteNote: (noteId: string) => Promise<void>;
    selectNote: (note: Note | null) => void;
}

export const useNotesStore = create<NotesState>((set, _get) => ({
    notes: [],
    selectedNote: null,
    isLoading: false,
    error: null,

    fetchNotes: async (storyId: string) => {
        set({ isLoading: true, error: null });

        const [error, notes] = await attemptPromise(() =>
            notesApi.getByStory(storyId)
        );

        if (error) {
            const errorMessage = formatError(error, ERROR_MESSAGES.FETCH_FAILED('notes'));
            set({ error: errorMessage, isLoading: false });
            toastCRUD.loadError('notes', error);
            return;
        }

        set({ notes, isLoading: false });
    },

    createNote: async (storyId: string, title: string, content: string, type: Note['type']) => {
        const [createError, newNote] = await attemptPromise(() =>
            notesApi.create({ storyId, title, content, type })
        );

        if (createError) {
            toastCRUD.createError('note', createError);
            throw createError;
        }

        const [fetchError, notes] = await attemptPromise(() =>
            notesApi.getByStory(storyId)
        );

        if (fetchError) {
            // Note was created but refresh failed - not critical
            logger.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), fetchError);
        } else {
            set({ notes });
        }

        toastCRUD.createSuccess('Note');
        return newNote.id;
    },

    updateNote: async (noteId: string, data: Partial<Note>) => {
        try {
            validatePartialUpdate(data, noteSchema);
        } catch (error) {
            toastCRUD.updateError('note', error);
            throw error;
        }

        const [updateError] = await attemptPromise(() =>
            notesApi.update(noteId, data)
        );

        if (updateError) {
            toastCRUD.updateError('note', updateError);
            throw updateError;
        }

        // Get storyId from current notes to refetch
        const currentNote = _get().notes.find(n => n.id === noteId);
        if (currentNote) {
            const [refetchError, notes] = await attemptPromise(() =>
                notesApi.getByStory(currentNote.storyId)
            );

            if (refetchError) {
                logger.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), refetchError);
            } else {
                set({ notes });
            }
        }

        toastCRUD.updateSuccess('Note');
    },

    deleteNote: async (noteId: string) => {
        // Get storyId from current notes before deletion
        const note = _get().notes.find(n => n.id === noteId);
        if (!note) {
            const error = new Error('Note not found');
            toastCRUD.deleteError('note', error);
            throw error;
        }

        const [deleteError] = await attemptPromise(() =>
            notesApi.delete(noteId)
        );

        if (deleteError) {
            toastCRUD.deleteError('note', deleteError);
            throw deleteError;
        }

        const [refetchError, notes] = await attemptPromise(() =>
            notesApi.getByStory(note.storyId)
        );

        if (refetchError) {
            logger.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), refetchError);
        } else {
            set({ notes, selectedNote: null });
        }

        toastCRUD.deleteSuccess('Note');
    },

    selectNote: (note: Note | null) => {
        set({ selectedNote: note });
    }
})); 