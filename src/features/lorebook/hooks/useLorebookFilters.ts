import { LorebookFilterService } from "@/features/lorebook/stores/LorebookFilterService";
import type { LorebookEntry, LorebookLevel } from "@/types/story";
import { useMemo } from "react";

interface FilterOptions {
    level?: LorebookLevel;
    levels?: LorebookLevel[];
    category?: LorebookEntry["category"];
    activeOnly?: boolean;
}

/**
 * Custom hook to filter lorebook entries with memoization
 */
export const useFilteredLorebook = (entries: LorebookEntry[] | undefined, filters: FilterOptions) =>
    useMemo(() => {
        if (!entries) return [];

        let filtered = entries;

        if (filters.level) filtered = LorebookFilterService.filterByLevel(filtered, filters.level);

        if (filters.levels) filtered = LorebookFilterService.filterByLevels(filtered, filters.levels);

        if (filters.category) filtered = LorebookFilterService.getEntriesByCategory(filtered, filters.category);

        if (filters.activeOnly) filtered = LorebookFilterService.getFilteredEntries(filtered, false);

        return filtered;
    }, [entries, filters.level, filters.levels, filters.category, filters.activeOnly]);

/**
 * Custom hook to separate lorebook entries by level with memoization
 */
export const useSeparatedLorebook = (entries: LorebookEntry[] | undefined) =>
    useMemo(() => {
        if (!entries) return { global: [], series: [], story: [] };
        return LorebookFilterService.separateByLevel(entries);
    }, [entries]);

/**
 * Custom hook to get inherited entries (global + series) with memoization
 */
export const useInheritedEntries = (entries: LorebookEntry[] | undefined, seriesId?: string) =>
    useMemo(() => {
        if (!entries) return [];
        return LorebookFilterService.getInheritedEntries(entries, seriesId);
    }, [entries, seriesId]);

/**
 * Custom hook to get editable entries for a specific context with memoization
 */
export const useEditableEntries = (entries: LorebookEntry[] | undefined, editLevel: LorebookLevel, scopeId?: string) =>
    useMemo(() => {
        if (!entries) return [];
        return LorebookFilterService.getEditableEntries(entries, editLevel, scopeId);
    }, [entries, editLevel, scopeId]);
