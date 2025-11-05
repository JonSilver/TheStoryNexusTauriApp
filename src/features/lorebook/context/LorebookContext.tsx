import { createContext, useContext, ReactNode } from 'react';
import { useLorebookByStoryQuery } from '../hooks/useLorebookQuery';
import type { LorebookEntry } from '@/types/story';

interface LorebookContextValue {
    entries: LorebookEntry[];
    isLoading: boolean;
    error: Error | null;
}

const LorebookContext = createContext<LorebookContextValue | null>(null);

interface LorebookProviderProps {
    storyId: string;
    children: ReactNode;
}

/**
 * Provider that fetches and provides lorebook entries for a story.
 * Uses TanStack Query internally for caching and updates.
 */
export const LorebookProvider = ({ storyId, children }: LorebookProviderProps) => {
    const { data: entries = [], isLoading, error } = useLorebookByStoryQuery(storyId);

    return (
        <LorebookContext.Provider value={{ entries, isLoading, error }}>
            {children}
        </LorebookContext.Provider>
    );
};

/**
 * Hook to access lorebook entries from context.
 * Can be used in components OR services (via React context).
 */
export const useLorebookContext = (): LorebookContextValue => {
    const context = useContext(LorebookContext);
    if (!context) {
        throw new Error('useLorebookContext must be used within LorebookProvider');
    }
    return context;
};
