import { create } from 'zustand';
import { useLorebookDataStore } from './useLorebookDataStore';
import { LorebookFilterService } from './LorebookFilterService';
import { LorebookImportExportService } from './LorebookImportExportService';
import type { LorebookEntry } from '@/types/story';

interface LorebookState {
    entries: LorebookEntry[];
    isLoading: boolean;
    error: string | null;
    tagMap: Record<string, LorebookEntry>;
    buildTagMap: () => void;
    editorContent: string;
    setEditorContent: (content: string) => void;
    matchedEntries: Map<string, LorebookEntry>;
    setMatchedEntries: (entries: Map<string, LorebookEntry>) => void;
    chapterMatchedEntries: Map<string, LorebookEntry>;
    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => void;

    // Actions
    loadEntries: (storyId: string) => Promise<void>;
    createEntry: (entry: Omit<LorebookEntry, 'id' | 'createdAt'>) => Promise<void>;
    updateEntry: (id: string, data: Partial<LorebookEntry>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    updateEntryAndRebuildTags: (id: string, data: Partial<LorebookEntry>) => Promise<void>;

    // Queries
    getEntriesByTag: (tag: string) => LorebookEntry[];
    getEntriesByCategory: (category: LorebookEntry['category']) => LorebookEntry[];
    getFilteredEntries: (includeDisabled?: boolean) => LorebookEntry[];
    getFilteredEntriesByIds: (ids: string[], includeDisabled?: boolean) => LorebookEntry[];
    getAllEntries: () => LorebookEntry[];
    getEntriesByImportance: (importance: 'major' | 'minor' | 'background') => LorebookEntry[];
    getEntriesByStatus: (status: 'active' | 'inactive' | 'historical') => LorebookEntry[];
    getEntriesByType: (type: string) => LorebookEntry[];
    getEntriesByRelationship: (targetId: string) => LorebookEntry[];
    getEntriesByCustomField: (field: string, value: unknown) => LorebookEntry[];

    // Export/Import functions
    exportEntries: (storyId: string) => void;
    importEntries: (jsonData: string, targetStoryId: string) => Promise<void>;
}

export const useLorebookStore = create<LorebookState>((set, get) => ({
    // Sync state from data store
    get entries() {
        return useLorebookDataStore.getState().entries;
    },
    get isLoading() {
        return useLorebookDataStore.getState().isLoading;
    },
    get error() {
        return useLorebookDataStore.getState().error;
    },
    get editorContent() {
        return useLorebookDataStore.getState().editorContent;
    },
    get matchedEntries() {
        return useLorebookDataStore.getState().matchedEntries;
    },
    get chapterMatchedEntries() {
        return useLorebookDataStore.getState().chapterMatchedEntries;
    },

    tagMap: {},

    buildTagMap: () => {
        const entries = useLorebookDataStore.getState().entries;
        const tagMap = LorebookFilterService.buildTagMap(entries);
        set({ tagMap });
    },

    // Data operations
    loadEntries: async (storyId: string) => {
        await useLorebookDataStore.getState().loadEntries(storyId);
        get().buildTagMap();
    },

    createEntry: async (entryData) => {
        await useLorebookDataStore.getState().createEntry(entryData);
        get().buildTagMap();
    },

    updateEntry: async (id, data) => {
        await useLorebookDataStore.getState().updateEntry(id, data);
        get().buildTagMap();
    },

    deleteEntry: async (id) => {
        await useLorebookDataStore.getState().deleteEntry(id);
        get().buildTagMap();
    },

    updateEntryAndRebuildTags: async (id, data) => {
        await useLorebookDataStore.getState().updateEntry(id, data);
        get().buildTagMap();
    },

    setEditorContent: (content: string) => {
        useLorebookDataStore.getState().setEditorContent(content);
    },

    setMatchedEntries: (entries: Map<string, LorebookEntry>) => {
        useLorebookDataStore.getState().setMatchedEntries(entries);
    },

    setChapterMatchedEntries: (entries: Map<string, LorebookEntry>) => {
        useLorebookDataStore.getState().setChapterMatchedEntries(entries);
    },

    // Filter operations - delegate to service
    getFilteredEntries: (includeDisabled = false) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getFilteredEntries(entries, includeDisabled);
    },

    getFilteredEntriesByIds: (ids, includeDisabled = false) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getFilteredEntriesByIds(entries, ids, includeDisabled);
    },

    getEntriesByTag: (tag) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByTag(entries, tag);
    },

    getEntriesByCategory: (category) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByCategory(entries, category);
    },

    getAllEntries: () => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getAllEntries(entries);
    },

    getEntriesByImportance: (importance) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByImportance(entries, importance);
    },

    getEntriesByStatus: (status) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByStatus(entries, status);
    },

    getEntriesByType: (type) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByType(entries, type);
    },

    getEntriesByRelationship: (targetId) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByRelationship(entries, targetId);
    },

    getEntriesByCustomField: (field, value) => {
        const entries = useLorebookDataStore.getState().entries;
        return LorebookFilterService.getEntriesByCustomField(entries, field, value);
    },

    // Import/Export operations
    exportEntries: (storyId) => {
        const entries = useLorebookDataStore.getState().entries;
        LorebookImportExportService.exportEntries(entries, storyId);
    },

    importEntries: async (jsonData, targetStoryId) => {
        await LorebookImportExportService.importEntries(jsonData, targetStoryId, (newEntries) => {
            const currentEntries = useLorebookDataStore.getState().entries;
            useLorebookDataStore.setState({ entries: [...currentEntries, ...newEntries] });
            get().buildTagMap();
        });
    },
}));
