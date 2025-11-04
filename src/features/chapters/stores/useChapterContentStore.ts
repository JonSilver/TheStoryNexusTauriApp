import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { chaptersApi } from '@/services/api/client';
import { extractPlainTextFromLexical } from '@/utils/lexicalUtils';
import { logger } from '@/utils/logger';

interface ChapterContentState {
    // Content processing operations
    getChapterPlainText: (id: string) => Promise<string>;
    getChapterPlainTextByChapterOrder: (chapterOrder: number) => Promise<string>;
    extractPlainTextFromLexicalState: (editorStateJSON: string) => string;
}

export const useChapterContentStore = create<ChapterContentState>(() => ({
    getChapterPlainText: async (id: string): Promise<string> => {
        const [error, chapter] = await attemptPromise(() => chaptersApi.getById(id));

        if (error) {
            logger.error('Error getting chapter plain text:', error);
            return '';
        }

        if (!chapter || !chapter.content) {
            logger.info('Chapter not found or has no content');
            return '';
        }

        const plainText: string = useChapterContentStore.getState().extractPlainTextFromLexicalState(chapter.content);
        return plainText;
    },

    getChapterPlainTextByChapterOrder: async (chapterOrder: number) => {
        logger.warn('getChapterPlainTextByChapterOrder requires storyId - this method may not work correctly');
        return '';
    },

    extractPlainTextFromLexicalState: (editorStateJSON: string) => {
        return extractPlainTextFromLexical(editorStateJSON);
    }
}));
