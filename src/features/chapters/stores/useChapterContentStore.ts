import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { db } from '@/services/database';
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
        const [error, chapter] = await attemptPromise(() => db.chapters.get(id));

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
        const [error, chapters] = await attemptPromise(() => db.chapters.toArray());

        if (error) {
            logger.error('Error getting chapter plain text by order:', error);
            return '';
        }

        const chapter = chapters.find(ch => ch.order === chapterOrder);

        if (!chapter || !chapter.content) {
            logger.info('Chapter not found or has no content for order:', chapterOrder);
            return '';
        }

        const plainText: string = useChapterContentStore.getState().extractPlainTextFromLexicalState(chapter.content);
        return plainText;
    },

    extractPlainTextFromLexicalState: (editorStateJSON: string) => {
        return extractPlainTextFromLexical(editorStateJSON);
    }
}));
