import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { chaptersApi } from '@/services/api/client';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { storageService, STORAGE_KEYS } from '@/utils/storageService';
import { countWords } from '@/utils/textUtils';
import type { Chapter } from '@/types/story';
import { logger } from '@/utils/logger';

interface ChapterDataState {
    chapters: Chapter[];
    currentChapter: Chapter | null;
    loading: boolean;
    error: string | null;
    lastEditedChapterIds: Record<string, string>;

    // Data CRUD operations
    fetchChapters: (storyId: string) => Promise<void>;
    getChapter: (id: string) => Promise<void>;
    createChapter: (chapterData: Omit<Chapter, 'id' | 'createdAt' | 'wordCount'>) => Promise<string>;
    updateChapter: (id: string, chapterData: Partial<Chapter>) => Promise<void>;
    deleteChapter: (id: string) => Promise<void>;
    setCurrentChapter: (chapter: Chapter | null) => void;
    updateChapterOrders: (updates: Array<{ id: string, order: number }>) => Promise<void>;
    clearError: () => void;

    // Last edited tracking
    setLastEditedChapterId: (storyId: string, chapterId: string) => void;
    getLastEditedChapterId: (storyId: string) => string | null;
    getPreviousChapter: (chapterId: string) => Promise<Chapter | null>;
}

export const useChapterDataStore = create<ChapterDataState>((set, get) => ({
    chapters: [],
    currentChapter: null,
    loading: false,
    error: null,
    lastEditedChapterIds: storageService.get(STORAGE_KEYS.LAST_EDITED_CHAPTERS, {}),

    fetchChapters: async (storyId: string) => {
        set({ loading: true, error: null });

        const [error, chapters] = await attemptPromise(() =>
            chaptersApi.getByStory(storyId)
        );

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapters')),
                loading: false
            });
            return;
        }

        set({ chapters, loading: false });
    },

    getChapter: async (id: string) => {
        set({ loading: true, error: null });

        const [error, chapter] = await attemptPromise(() => chaptersApi.getById(id));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('chapter')),
                loading: false
            });
            return;
        }

        if (!chapter) {
            set({
                error: ERROR_MESSAGES.NOT_FOUND('Chapter'),
                loading: false
            });
            return;
        }

        set({ currentChapter: chapter, loading: false });
    },

    createChapter: async (chapterData) => {
        set({ loading: true, error: null });

        const [fetchError, storyChapters] = await attemptPromise(() =>
            chaptersApi.getByStory(chapterData.storyId)
        );

        if (fetchError) {
            set({
                error: formatError(fetchError, ERROR_MESSAGES.CREATE_FAILED('chapter')),
                loading: false
            });
            throw fetchError;
        }

        const nextOrder = storyChapters.length === 0
            ? 1
            : Math.max(...storyChapters.map(chapter => chapter.order)) + 1;

        const chapterId = crypto.randomUUID();

        const [createError, newChapter] = await attemptPromise(() =>
            chaptersApi.create({
                id: chapterId,
                ...chapterData,
                order: nextOrder,
                wordCount: countWords(chapterData.content)
            })
        );

        if (createError) {
            set({
                error: formatError(createError, ERROR_MESSAGES.CREATE_FAILED('chapter')),
                loading: false
            });
            throw createError;
        }

        set(state => ({
            chapters: [...state.chapters, newChapter].sort((a, b) => a.order - b.order),
            currentChapter: newChapter,
            loading: false
        }));

        return chapterId;
    },

    updateChapter: async (id: string, chapterData: Partial<Chapter>) => {
        set({ loading: true, error: null });

        const updateData = { ...chapterData };

        if (chapterData.content) {
            updateData.wordCount = countWords(chapterData.content);
            const [getError, chapter] = await attemptPromise(() => chaptersApi.getById(id));
            if (!getError && chapter) {
                const { lastEditedChapterIds } = get();
                const newLastEdited = {
                    ...lastEditedChapterIds,
                    [chapter.storyId]: id
                };
                set({ lastEditedChapterIds: newLastEdited });
                storageService.set(STORAGE_KEYS.LAST_EDITED_CHAPTERS, newLastEdited);
            }
        }

        const [updateError] = await attemptPromise(() => chaptersApi.update(id, updateData));

        if (updateError) {
            set({
                error: formatError(updateError, ERROR_MESSAGES.UPDATE_FAILED('chapter')),
                loading: false
            });
            return;
        }

        const [getError, updatedChapter] = await attemptPromise(() => chaptersApi.getById(id));

        if (getError || !updatedChapter) {
            const error = getError || new Error('Chapter not found after update');
            set({
                error: formatError(error, ERROR_MESSAGES.UPDATE_FAILED('chapter')),
                loading: false
            });
            return;
        }

        set(state => ({
            chapters: state.chapters.map(chapter =>
                chapter.id === id ? updatedChapter : chapter
            ),
            currentChapter: state.currentChapter?.id === id ? updatedChapter : state.currentChapter,
            loading: false
        }));
    },

    deleteChapter: async (id: string) => {
        set({ loading: true, error: null });

        const [error] = await attemptPromise(() => chaptersApi.delete(id));

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.DELETE_FAILED('chapter')),
                loading: false
            });
            return;
        }

        set(state => ({
            chapters: state.chapters.filter(chapter => chapter.id !== id),
            currentChapter: state.currentChapter?.id === id ? null : state.currentChapter,
            loading: false
        }));
    },

    setCurrentChapter: (chapter: Chapter | null) => {
        set({ currentChapter: chapter });
    },

    updateChapterOrders: async (updates: Array<{ id: string, order: number }>) => {
        set({ loading: true, error: null });

        const [error] = await attemptPromise(async () => {
            for (const update of updates) {
                await chaptersApi.update(update.id, { order: update.order });
            }
        });

        if (error) {
            set({
                error: formatError(error, ERROR_MESSAGES.UPDATE_FAILED('chapter orders')),
                loading: false
            });
            return;
        }

        const { chapters } = get();
        const updatedChapters = chapters.map(chapter => {
            const update = updates.find(u => u.id === chapter.id);
            return update ? { ...chapter, order: update.order } : chapter;
        }).sort((a, b) => a.order - b.order);

        set({ chapters: updatedChapters, loading: false });
    },

    clearError: () => set({ error: null }),

    setLastEditedChapterId: (storyId: string, chapterId: string) => {
        const { lastEditedChapterIds } = get();
        const newLastEdited = {
            ...lastEditedChapterIds,
            [storyId]: chapterId
        };
        set({ lastEditedChapterIds: newLastEdited });
        storageService.set(STORAGE_KEYS.LAST_EDITED_CHAPTERS, newLastEdited);
    },

    getLastEditedChapterId: (storyId: string) => {
        const { lastEditedChapterIds } = get();
        return lastEditedChapterIds[storyId] || null;
    },

    getPreviousChapter: async (chapterId: string) => {
        const [getCurrentError, currentChapter] = await attemptPromise(() =>
            chaptersApi.getById(chapterId)
        );

        if (getCurrentError || !currentChapter) {
            logger.error('Error getting previous chapter:', getCurrentError);
            return null;
        }

        const [getChaptersError, storyChapters] = await attemptPromise(() =>
            chaptersApi.getByStory(currentChapter.storyId)
        );

        if (getChaptersError) {
            logger.error('Error getting previous chapter:', getChaptersError);
            return null;
        }

        const previousChapter = storyChapters.find(
            chapter => chapter.order === currentChapter.order - 1
        );

        return previousChapter || null;
    }
}));
