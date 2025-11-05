import { useQuery } from '@tanstack/react-query';
import { chaptersKeys } from './useChaptersQuery';
import { chaptersApi } from '@/services/api/client';
import type { Chapter } from '@/types/story';

/**
 * Query hook for fetching chapter summaries up to (and optionally including) a specific chapter order.
 * Used primarily by the prompt system for context injection.
 *
 * @param storyId - The story ID
 * @param currentOrder - The chapter order to filter by
 * @param includeLatest - If true, includes the chapter at currentOrder; if false, excludes it
 * @returns Query result with aggregated summary string (joined with '\n\n')
 */
export const useChapterSummariesQuery = (
    storyId: string,
    currentOrder: number,
    includeLatest = false
) => {
    return useQuery({
        queryKey: [...chaptersKeys.byStory(storyId), 'summaries', currentOrder, includeLatest],
        queryFn: async () => {
            const chapters = await chaptersApi.getByStory(storyId);

            const relevantChapters = includeLatest
                ? chapters.filter(ch => ch.order <= currentOrder)
                : chapters.filter(ch => ch.order < currentOrder);

            return relevantChapters
                .sort((a, b) => a.order - b.order)
                .map(ch => ch.summary || '')
                .filter(summary => summary.length > 0)
                .join('\n\n');
        },
        enabled: !!storyId,
    });
};

/**
 * Query hook for fetching all chapter summaries for a story.
 * Used for brainstorm context when full story context is needed.
 *
 * @param storyId - The story ID
 * @returns Query result with all chapter summaries joined with '\n\n'
 */
export const useAllChapterSummariesQuery = (storyId: string) => {
    return useQuery({
        queryKey: [...chaptersKeys.byStory(storyId), 'allSummaries'],
        queryFn: async () => {
            const chapters = await chaptersApi.getByStory(storyId);

            return chapters
                .sort((a, b) => a.order - b.order)
                .map(ch => ch.summary || '')
                .filter(summary => summary.length > 0)
                .join('\n\n');
        },
        enabled: !!storyId,
    });
};

/**
 * Query hook for fetching a single chapter's summary.
 * Uses the existing useChapterQuery with a select transform.
 *
 * @param chapterId - The chapter ID
 * @returns Query result with the chapter summary string
 */
export const useChapterSummaryQuery = (chapterId: string) => {
    return useQuery({
        queryKey: chaptersKeys.detail(chapterId),
        queryFn: () => chaptersApi.getById(chapterId),
        select: (chapter: Chapter) => chapter?.summary || '',
        enabled: !!chapterId,
    });
};

/**
 * Utility function to fetch chapter summaries imperatively (non-hook).
 * For use in resolver classes and other non-React contexts.
 *
 * @param storyId - The story ID
 * @param currentOrder - The chapter order to filter by
 * @param includeLatest - If true, includes the chapter at currentOrder
 * @returns Promise resolving to aggregated summary string
 */
export const fetchChapterSummaries = async (
    storyId: string,
    currentOrder: number,
    includeLatest = false
): Promise<string> => {
    const chapters = await chaptersApi.getByStory(storyId);

    const relevantChapters = includeLatest
        ? chapters.filter(ch => ch.order <= currentOrder)
        : chapters.filter(ch => ch.order < currentOrder);

    return relevantChapters
        .sort((a, b) => a.order - b.order)
        .map(ch => ch.summary || '')
        .filter(summary => summary.length > 0)
        .join('\n\n');
};

/**
 * Utility function to fetch all chapter summaries imperatively (non-hook).
 * For use in resolver classes and other non-React contexts.
 *
 * @param storyId - The story ID
 * @returns Promise resolving to all chapter summaries joined with '\n\n'
 */
export const fetchAllChapterSummaries = async (storyId: string): Promise<string> => {
    const chapters = await chaptersApi.getByStory(storyId);

    return chapters
        .sort((a, b) => a.order - b.order)
        .map(ch => ch.summary || '')
        .filter(summary => summary.length > 0)
        .join('\n\n');
};

/**
 * Utility function to fetch a single chapter summary imperatively (non-hook).
 * For use in resolver classes and other non-React contexts.
 *
 * @param chapterId - The chapter ID
 * @returns Promise resolving to the chapter summary string
 */
export const fetchChapterSummary = async (chapterId: string): Promise<string> => {
    const chapter = await chaptersApi.getById(chapterId);
    return chapter?.summary || '';
};
