import { create } from 'zustand';
import { LorebookFilterService } from './LorebookFilterService';
import { LorebookImportExportService } from './LorebookImportExportService';
import type { LorebookEntry } from '@/types/story';

/**
 * Lorebook facade store - provides utility methods for filtering and tag management.
 * For CRUD operations, use TanStack Query hooks (useLorebookByStoryQuery, useCreateLorebookMutation, etc.)
 */
interface LorebookState {
    tagMap: Record<string, LorebookEntry>;
    buildTagMap: (entries: LorebookEntry[]) => void;
    editorContent: string;
    setEditorContent: (content: string) => void;
    matchedEntries: Map<string, LorebookEntry>;
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => void;
    chapterMatchedEntries: Map<string, LorebookEntry>;
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => void;

    // Filter utilities (pure functions)
    getEntriesByTag: (entries: LorebookEntry[], tag: string) => LorebookEntry[];
    getEntriesByCategory: (entries: LorebookEntry[], category: LorebookEntry['category']) => LorebookEntry[];
    getFilteredEntries: (entries: LorebookEntry[], includeDisabled?: boolean) => LorebookEntry[];
    getFilteredEntriesByIds: (entries: LorebookEntry[], ids: string[], includeDisabled?: boolean) => LorebookEntry[];
    getAllEntries: (entries: LorebookEntry[]) => LorebookEntry[];
    getEntriesByImportance: (entries: LorebookEntry[], importance: 'major' | 'minor' | 'background') => LorebookEntry[];
    getEntriesByStatus: (entries: LorebookEntry[], status: 'active' | 'inactive' | 'historical') => LorebookEntry[];
    getEntriesByType: (entries: LorebookEntry[], type: string) => LorebookEntry[];
    getEntriesByRelationship: (entries: LorebookEntry[], targetId: string) => LorebookEntry[];
    getEntriesByCustomField: (entries: LorebookEntry[], field: string, value: unknown) => LorebookEntry[];

    // Export/Import functions
    exportEntries: (entries: LorebookEntry[], storyId: string) => void;
    importEntries: (jsonData: string, targetStoryId: string, onSuccess: (entries: LorebookEntry[]) => void) => Promise<void>;
}

export const useLorebookStore = create<LorebookState>((set) => ({
    tagMap: {},
    editorContent: '',
    matchedEntries: new Map(),
    chapterMatchedEntries: new Map(),

    buildTagMap: (entries: LorebookEntry[]) => {
        const tagMap = LorebookFilterService.buildTagMap(entries);
        set({ tagMap });
    },

    setEditorContent: (content: string) => {
        set({ editorContent: content });
    },

    setMatchedEntries: (entries: Map<string, LorebookEntry>) => {
        set({ matchedEntries: entries });
    },

    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => {
        set({ chapterMatchedEntries: entries });
    },

    // Filter operations - pure functions delegating to service
    getFilteredEntries: (entries: LorebookEntry[], includeDisabled = false) => {
        return LorebookFilterService.getFilteredEntries(entries, includeDisabled);
    },

    getFilteredEntriesByIds: (entries: LorebookEntry[], ids, includeDisabled = false) => {
        return LorebookFilterService.getFilteredEntriesByIds(entries, ids, includeDisabled);
    },

    getEntriesByTag: (entries: LorebookEntry[], tag) => {
        return LorebookFilterService.getEntriesByTag(entries, tag);
    },

    getEntriesByCategory: (entries: LorebookEntry[], category) => {
        return LorebookFilterService.getEntriesByCategory(entries, category);
    },

    getAllEntries: (entries: LorebookEntry[]) => {
        return LorebookFilterService.getAllEntries(entries);
    },

    getEntriesByImportance: (entries: LorebookEntry[], importance) => {
        return LorebookFilterService.getEntriesByImportance(entries, importance);
    },

    getEntriesByStatus: (entries: LorebookEntry[], status) => {
        return LorebookFilterService.getEntriesByStatus(entries, status);
    },

    getEntriesByType: (entries: LorebookEntry[], type) => {
        return LorebookFilterService.getEntriesByType(entries, type);
    },

    getEntriesByRelationship: (entries: LorebookEntry[], targetId) => {
        return LorebookFilterService.getEntriesByRelationship(entries, targetId);
    },

    getEntriesByCustomField: (entries: LorebookEntry[], field, value) => {
        return LorebookFilterService.getEntriesByCustomField(entries, field, value);
    },

    // Import/Export operations
    exportEntries: (entries: LorebookEntry[], storyId) => {
        LorebookImportExportService.exportEntries(entries, storyId);
    },

    importEntries: async (jsonData, targetStoryId, onSuccess) => {
        await LorebookImportExportService.importEntries(jsonData, targetStoryId, onSuccess);
    },
}));
