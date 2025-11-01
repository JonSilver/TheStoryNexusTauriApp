import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { Note } from '@/types/story';
import { db } from '@/services/database';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { toastCRUD } from '@/utils/toastUtils';
import { noteSchema } from '@/schemas/entities';
import { createValidatedEntity, validatePartialUpdate } from '@/utils/crudHelpers';

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
            db.notes
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('updatedAt')
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
        const now = new Date();

        let newNote: Note;
        try {
            newNote = createValidatedEntity(
                { storyId, title, content, type },
                noteSchema,
                { updatedAt: now }
            );
        } catch (error) {
            toastCRUD.createError('note', error);
            throw error;
        }

        const [addError] = await attemptPromise(() => db.notes.add(newNote));

        if (addError) {
            toastCRUD.createError('note', addError);
            throw addError;
        }

        const [fetchError, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (fetchError) {
            // Note was created but refresh failed - not critical
            console.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), fetchError);
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

        const [fetchError, note] = await attemptPromise(() => db.notes.get(noteId));

        if (fetchError || !note) {
            toastCRUD.loadError('note', fetchError || new Error('Note not found'));
            throw fetchError || new Error('Note not found');
        }

        const updatedNote = {
            ...note,
            ...data,
            updatedAt: new Date()
        };

        const [updateError] = await attemptPromise(() => db.notes.update(noteId, updatedNote));

        if (updateError) {
            toastCRUD.updateError('note', updateError);
            throw updateError;
        }

        const [refetchError, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(note.storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (refetchError) {
            console.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), refetchError);
        } else {
            set({ notes });
        }

        toastCRUD.updateSuccess('Note');
    },

    deleteNote: async (noteId: string) => {
        const [fetchError, note] = await attemptPromise(() => db.notes.get(noteId));

        if (fetchError || !note) {
            toastCRUD.deleteError('note', fetchError || new Error('Note not found'));
            throw fetchError || new Error('Note not found');
        }

        const [deleteError] = await attemptPromise(() => db.notes.delete(noteId));

        if (deleteError) {
            toastCRUD.deleteError('note', deleteError);
            throw deleteError;
        }

        const [refetchError, notes] = await attemptPromise(() =>
            db.notes
                .where('storyId')
                .equals(note.storyId)
                .reverse()
                .sortBy('updatedAt')
        );

        if (refetchError) {
            console.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('notes')), refetchError);
        } else {
            set({ notes, selectedNote: null });
        }

        toastCRUD.deleteSuccess('Note');
    },

    selectNote: (note: Note | null) => {
        set({ selectedNote: note });
    }
})); 