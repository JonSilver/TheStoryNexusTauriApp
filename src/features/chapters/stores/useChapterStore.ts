import { create } from 'zustand';
import { useChapterContentStore } from './useChapterContentStore';
import { chaptersApi } from '@/services/api/client';
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';

/**
 * Chapter facade store - provides utility methods for content extraction and summary aggregation.
 * For CRUD operations, use TanStack Query hooks (useChaptersByStoryQuery, useUpdateChapterMutation, etc.)
 */
interface ChapterState {
    // Content extraction utilities
    getChapterPlainText: (id: string) => Promise<string>;
    extractPlainTextFromLexicalState: (editorStateJSON: string) => string;

    // Summary aggregation utilities
    getChapterSummaries: (storyId: string, currentOrder: number, includeLatest?: boolean) => Promise<string>;
    getAllChapterSummaries: (storyId: string) => Promise<string>;
    getChapterSummary: (id: string) => Promise<string>;
}

export const useChapterStore = create<ChapterState>(() => ({
    // Delegate to content store for plain text extraction
    getChapterPlainText: (id) => useChapterContentStore.getState().getChapterPlainText(id),
    extractPlainTextFromLexicalState: (editorStateJSON) => useChapterContentStore.getState().extractPlainTextFromLexicalState(editorStateJSON),

    // Summary utilities using API
    getChapterSummaries: async (storyId, currentOrder, includeLatest = false) => {
        const [error, chapters] = await attemptPromise(() => chaptersApi.getByStory(storyId));

        if (error) {
            logger.error('Error fetching chapters for summaries:', error);
            return '';
        }

        const relevantChapters = includeLatest
            ? chapters.filter(ch => ch.order <= currentOrder)
            : chapters.filter(ch => ch.order < currentOrder);

        return relevantChapters
            .sort((a, b) => a.order - b.order)
            .map(ch => ch.summary || '')
            .filter(summary => summary.length > 0)
            .join('\n\n');
    },

    getAllChapterSummaries: async (storyId) => {
        const [error, chapters] = await attemptPromise(() => chaptersApi.getByStory(storyId));

        if (error) {
            logger.error('Error fetching chapters for summaries:', error);
            return '';
        }

        return chapters
            .sort((a, b) => a.order - b.order)
            .map(ch => ch.summary || '')
            .filter(summary => summary.length > 0)
            .join('\n\n');
    },

    getChapterSummary: async (id) => {
        const [error, chapter] = await attemptPromise(() => chaptersApi.getById(id));

        if (error) {
            logger.error('Error fetching chapter summary:', error);
            return '';
        }

        return chapter?.summary || '';
    },
}));
