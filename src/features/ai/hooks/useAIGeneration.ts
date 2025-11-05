import { useCallback, useEffect, useRef } from 'react';
import { aiService } from '@/services/ai/AIService';

interface UseStreamedGenerationCallbacks {
    onToken: (text: string) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}

interface UseStreamedGenerationReturn {
    processStreamedResponse: (response: Response) => Promise<void>;
    abortGeneration: () => void;
}

export const useStreamedGeneration = (
    callbacks: UseStreamedGenerationCallbacks
): UseStreamedGenerationReturn => {
    const callbacksRef = useRef(callbacks);

    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    const processStreamedResponse = useCallback(async (response: Response) => {
        await aiService.processStreamedResponse(
            response,
            callbacksRef.current.onToken,
            callbacksRef.current.onComplete,
            callbacksRef.current.onError
        );
    }, []);

    const abortGeneration = useCallback(() => {
        aiService.abortStream();
    }, []);

    return { processStreamedResponse, abortGeneration };
};
