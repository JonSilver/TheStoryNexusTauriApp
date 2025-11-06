import { useState, useCallback } from 'react';
import { usePromptParser } from '@/features/prompts/hooks/usePromptParser';
import { attemptPromise } from '@jfdi/attempt';
import { toast } from 'react-toastify';
import is from '@sindresorhus/is';
import type { PromptMessage, PromptParserConfig } from '@/types/story';

interface UsePromptPreviewReturn {
    showPreview: boolean;
    previewMessages: PromptMessage[] | undefined;
    previewLoading: boolean;
    previewError: string | null;
    openPreview: (config: PromptParserConfig) => Promise<void>;
    closePreview: () => void;
}

export const usePromptPreview = (): UsePromptPreviewReturn => {
    const [showPreview, setShowPreview] = useState(false);
    const [previewMessages, setPreviewMessages] = useState<PromptMessage[] | undefined>();
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const { parsePrompt } = usePromptParser();

    const openPreview = useCallback(async (config: PromptParserConfig) => {
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewMessages(undefined);

        const [error, parsedPrompt] = await attemptPromise(async () =>
            parsePrompt(config)
        );

        if (error) {
            const errorMessage = is.error(error) ? error.message : String(error);
            setPreviewError(errorMessage);
            setPreviewLoading(false);
            toast.error(`Error previewing prompt: ${errorMessage}`);
            return;
        }

        if (parsedPrompt.error) {
            setPreviewError(parsedPrompt.error);
            setPreviewLoading(false);
            toast.error(`Error parsing prompt: ${parsedPrompt.error}`);
            return;
        }

        setPreviewMessages(parsedPrompt.messages);
        setShowPreview(true);
        setPreviewLoading(false);
    }, [parsePrompt]);

    const closePreview = useCallback(() => {
        setShowPreview(false);
    }, []);

    return {
        showPreview,
        previewMessages,
        previewLoading,
        previewError,
        openPreview,
        closePreview,
    };
};
