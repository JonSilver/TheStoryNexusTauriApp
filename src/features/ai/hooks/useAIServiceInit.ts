import { useEffect, useState } from 'react';
import { aiService } from '@/services/ai/AIService';
import { logger } from '@/utils/logger';

interface UseAIServiceInitReturn {
    isInitialized: boolean;
    error: Error | null;
}

export const useAIServiceInit = (): UseAIServiceInitReturn => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                await aiService.initialize();
                setIsInitialized(true);
            } catch (err) {
                logger.error('[useAIServiceInit] Failed to initialize AI service', err);
                setError(err as Error);
            }
        };

        init();
    }, []);

    return { isInitialized, error };
};
