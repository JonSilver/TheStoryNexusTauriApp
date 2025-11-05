import type { LorebookEntry } from '@/types/story';
import { normalizeString, stringEquals } from '@/utils/stringUtils';

export const getFilteredEntries = (entries: LorebookEntry[], includeDisabled = false): LorebookEntry[] => {
    return includeDisabled
        ? entries
        : entries.filter(entry => !entry.isDisabled);
};

export const getFilteredEntriesByIds = (entries: LorebookEntry[], ids: string[], includeDisabled = false): LorebookEntry[] => {
    const filtered = getFilteredEntries(entries, includeDisabled);
    return filtered.filter(entry => ids.includes(entry.id));
};

export const getEntriesByTag = (entries: LorebookEntry[], tag: string): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry =>
        (entry.tags && entry.tags.some(t => stringEquals(t, tag))) ||
        stringEquals(entry.name, tag)
    );
};

export const getEntriesByCategory = (entries: LorebookEntry[], category: LorebookEntry['category']): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry => entry.category === category);
};

export const getAllEntries = (entries: LorebookEntry[]): LorebookEntry[] => {
    return getFilteredEntries(entries);
};

export const getEntriesByImportance = (entries: LorebookEntry[], importance: 'major' | 'minor' | 'background'): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry =>
        entry.metadata?.importance === importance
    );
};

export const getEntriesByStatus = (entries: LorebookEntry[], status: 'active' | 'inactive' | 'historical'): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry =>
        entry.metadata?.status === status
    );
};

export const getEntriesByType = (entries: LorebookEntry[], type: string): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry =>
        entry.metadata?.type && stringEquals(entry.metadata.type, type)
    );
};

export const getEntriesByRelationship = (entries: LorebookEntry[], targetId: string): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry =>
        entry.metadata?.relationships?.some(rel =>
            rel.type === targetId || rel.description?.includes(targetId)
        )
    );
};

export const getEntriesByCustomField = (entries: LorebookEntry[], field: string, value: unknown): LorebookEntry[] => {
    return getFilteredEntries(entries).filter(entry => {
        const metadata = entry.metadata as Record<string, unknown> | undefined;
        return metadata?.[field] === value;
    });
};

export const buildTagMap = (entries: LorebookEntry[]): Record<string, LorebookEntry> => {
    const tagMap: Record<string, LorebookEntry> = {};

    if (!entries || !Array.isArray(entries)) {
        return tagMap;
    }

    entries.forEach(entry => {
        if (!entry || entry.isDisabled) return;

        const normalizedName = normalizeString(entry.name);
        tagMap[normalizedName] = entry;

        if (!entry.tags || !Array.isArray(entry.tags)) {
            return;
        }

        entry.tags.forEach(tag => {
            const normalizedTag = normalizeString(tag);
            tagMap[normalizedTag] = entry;

            if (!normalizedTag.includes(' ')) {
                return;
            }

            const words = normalizedTag.split(' ');
            words.forEach(word => {
                if (entry.tags.some(t => stringEquals(t, word))) {
                    tagMap[word] = entry;
                }
            });
        });
    });

    return tagMap;
};
