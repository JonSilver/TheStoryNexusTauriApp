import { chaptersApi } from '@/services/api/client';
import { extractPlainTextFromLexical } from '@/utils/lexicalUtils';
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';
import type { Chapter, ChapterOutline } from '@/types/story';

/**
 * Chapter utility functions - provides methods for content extraction.
 * For CRUD operations, use TanStack Query hooks (useChaptersByStoryQuery, useUpdateChapterMutation, etc.)
 * For summary aggregation, use hooks from useChapterSummariesQuery.
 */

export const getChapterPlainText = async (id: string): Promise<string> => {
    const [error, chapter] = await attemptPromise(() => chaptersApi.getById(id));

    if (error) {
        logger.error('Error getting chapter plain text:', error);
        return '';
    }

    if (!chapter || !chapter.content) {
        logger.info('Chapter not found or has no content');
        return '';
    }

    return extractPlainTextFromLexical(chapter.content);
};

export const extractPlainTextFromLexicalState = (editorStateJSON: string): string => {
    return extractPlainTextFromLexical(editorStateJSON);
};

export const getPreviousChapter = async (currentChapterId: string): Promise<Chapter | null> => {
    const [error, currentChapter] = await attemptPromise(() => chaptersApi.getById(currentChapterId));

    if (error) {
        logger.error('Error getting current chapter:', error);
        return null;
    }

    if (!currentChapter) {
        logger.info('Current chapter not found');
        return null;
    }

    const [chaptersError, chapters] = await attemptPromise(() =>
        chaptersApi.getByStory(currentChapter.storyId)
    );

    if (chaptersError) {
        logger.error('Error getting chapters for story:', chaptersError);
        return null;
    }

    if (!chapters) {
        return null;
    }

    // Find the chapter with order = currentChapter.order - 1
    const previousChapter = chapters.find(ch => ch.order === currentChapter.order - 1);
    return previousChapter || null;
};

export const getChapterOutline = async (chapterId: string | undefined): Promise<ChapterOutline | null> => {
    if (!chapterId) {
        return null;
    }

    const [error, chapter] = await attemptPromise(() => chaptersApi.getById(chapterId));

    if (error) {
        logger.error('Error getting chapter outline:', error);
        return null;
    }

    return chapter?.outline || null;
};
