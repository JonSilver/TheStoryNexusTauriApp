import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { storiesApi } from '@/services/api/client';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { storySchema } from '@/schemas/entities';
import { createValidatedEntity, validatePartialUpdate } from '@/utils/crudHelpers';
import type { Story } from '@/types/story';

interface StoryState {
    stories: Story[];
    currentStory: Story | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchStories: () => Promise<void>;
    getStory: (id: string) => Promise<void>;
    createStory: (story: Omit<Story, 'id' | 'createdAt'>) => Promise<string>;
    updateStory: (id: string, story: Partial<Story>) => Promise<void>;
    deleteStory: (id: string) => Promise<void>;
    setCurrentStory: (story: Story | null) => void;
    clearError: () => void;
}

export const useStoryStore = create<StoryState>((set, _get) => ({
    stories: [],
    currentStory: null,
    loading: false,
    error: null,

    // Fetch all stories
    fetchStories: async () => {
        set({ loading: true, error: null });

        const [error, stories] = await attemptPromise(() => storiesApi.getAll());

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('stories')),
                loading: false
            });
            return;
        }

        set({ stories, loading: false });
    },

    // Get a single story
    getStory: async (id: string) => {
        set({ loading: true, error: null });

        const [error, story] = await attemptPromise(() => storiesApi.getById(id));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('story')),
                loading: false
            });
            return;
        }

        if (!story) {
            set({
                error: ERROR_MESSAGES.NOT_FOUND('Story'),
                loading: false
            });
            return;
        }

        set({ currentStory: story, loading: false });
    },

    // Create a new story
    createStory: async (storyData) => {
        let validatedStory: Story;
        try {
            validatedStory = createValidatedEntity(storyData, storySchema);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Validation failed';
            set({ error: errorMessage, loading: false });
            throw error;
        }

        set({ loading: true, error: null });

        const [createError, newStory] = await attemptPromise(() =>
            storiesApi.create(validatedStory)
        );

        if (createError || !newStory) {
            const error = createError || new Error('Failed to create story');
            set({
                error: formatError(error, ERROR_MESSAGES.CREATE_FAILED('story')),
                loading: false
            });
            throw error;
        }

        set(state => ({
            stories: [...state.stories, newStory],
            currentStory: newStory,
            loading: false
        }));

        return newStory.id;
    },

    // Update a story
    updateStory: async (id: string, storyData: Partial<Story>) => {
        try {
            validatePartialUpdate(storyData, storySchema);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Validation failed';
            set({ error: errorMessage, loading: false });
            throw error;
        }

        set({ loading: true, error: null });

        const [updateError] = await attemptPromise(() => storiesApi.update(id, storyData));

        if (updateError) {
            set({
                error: formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('story')),
                loading: false
            });
            return;
        }

        const [getError, updatedStory] = await attemptPromise(() => storiesApi.getById(id));

        if (getError || !updatedStory) {
            const error = getError || new Error('Story not found after update');
            set({
                error: formatError(error, ERROR_MESSAGES.UPDATE_FAILED('story')),
                loading: false
            });
            return;
        }

        set(state => ({
            stories: state.stories.map(story =>
                story.id === id ? updatedStory : story
            ),
            currentStory: state.currentStory?.id === id ? updatedStory : state.currentStory,
            loading: false
        }));
    },

    // Delete a story
    deleteStory: async (id: string) => {
        set({ loading: true, error: null });

        const [error] = await attemptPromise(() => storiesApi.delete(id));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.DELETE_FAILED('story')),
                loading: false
            });
            return;
        }

        set(state => ({
            stories: state.stories.filter(story => story.id !== id),
            currentStory: state.currentStory?.id === id ? null : state.currentStory,
            loading: false
        }));
    },

    // Set current story
    setCurrentStory: (story) => {
        set({ currentStory: story });
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    }
})); 