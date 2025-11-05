import { useQuery } from '@tanstack/react-query';
import { chaptersKeys } from './useChaptersQuery';
import { chaptersApi } from '@/services/api/client';
import { extractPlainTextFromLexical } from '@/utils/lexicalUtils';

export const useChapterPlainTextQuery = (chapterId: string) => {
    return useQuery({
        queryKey: [...chaptersKeys.detail(chapterId), 'plainText'],
        queryFn: async () => {
            const chapter = await chaptersApi.getById(chapterId);
            if (!chapter?.content) return '';
            return extractPlainTextFromLexical(chapter.content);
        },
        enabled: !!chapterId,
    });
};
