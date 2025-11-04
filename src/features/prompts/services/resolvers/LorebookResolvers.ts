import { PromptContext, LorebookEntry } from '@/types/story';
import { IVariableResolver, ILorebookFormatter } from './types';

const getFilteredEntries = (entries: LorebookEntry[], includeDisabled = false): LorebookEntry[] => {
    return includeDisabled ? entries : entries.filter(entry => !entry.isDisabled);
};

const getEntriesByCategory = (entries: LorebookEntry[], category: LorebookEntry['category']): LorebookEntry[] => {
    return entries.filter(entry => entry.category === category && !entry.isDisabled);
};

export class MatchedEntriesChapterResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        if (!context.chapterMatchedEntries || context.chapterMatchedEntries.size === 0) {
            return '';
        }

        const entries = Array.from(context.chapterMatchedEntries)
            .filter(entry => !entry.isDisabled);

        if (entries.length === 0) {
            return '';
        }

        entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatter.formatEntries(entries);
    }
}

export class SceneBeatMatchedEntriesResolver implements IVariableResolver {
    constructor(private formatter: ILorebookFormatter) {}

    async resolve(context: PromptContext): Promise<string> {
        if (!context.sceneBeatMatchedEntries || context.sceneBeatMatchedEntries.size === 0) {
            return '';
        }

        const entries = Array.from(context.sceneBeatMatchedEntries)
            .filter(entry => !entry.isDisabled);

        if (entries.length === 0) {
            return '';
        }

        entries.sort((a, b) => {
            const importanceOrder = { 'major': 0, 'minor': 1, 'background': 2 };
            const aImportance = a.metadata?.importance || 'background';
            const bImportance = b.metadata?.importance || 'background';
            return importanceOrder[aImportance] - importanceOrder[bImportance];
        });

        return this.formatter.formatEntries(entries);
    }
}

export class AllEntriesResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext, category?: string): Promise<string> {
        let filtered = getFilteredEntries(this.entries);
        filtered = filtered.filter(entry => entry.storyId === context.storyId);

        if (category) {
            filtered = filtered.filter(entry => entry.category === category);
        }

        return this.formatter.formatEntries(filtered);
    }
}

export class CharacterResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext, name: string): Promise<string> {
        const filtered = getFilteredEntries(this.entries)
            .filter(entry =>
                entry.storyId === context.storyId &&
                entry.category === 'character' &&
                entry.name.toLowerCase() === name.toLowerCase()
            );

        const matchedEntry = filtered[0];

        return matchedEntry ? this.formatter.formatEntries([matchedEntry]) : '';
    }
}

export class AllCharactersResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'character')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllLocationsResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'location')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllItemsResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'item')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllEventsResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'event')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllNotesResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'note')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllSynopsisResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'synopsis')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllStartingScenariosResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'starting scenario')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class AllTimelinesResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const filtered = getEntriesByCategory(this.entries, 'timeline')
            .filter(entry => entry.storyId === context.storyId);
        return this.formatter.formatEntries(filtered);
    }
}

export class SceneBeatContextResolver implements IVariableResolver {
    constructor(
        private formatter: ILorebookFormatter,
        private entries: LorebookEntry[]
    ) {}

    async resolve(context: PromptContext): Promise<string> {
        const uniqueEntries = new Map<string, LorebookEntry>();

        if (context.sceneBeatContext) {
            const { useMatchedChapter, useMatchedSceneBeat, useCustomContext, customContextItems } = context.sceneBeatContext;

            if (useMatchedChapter && context.chapterMatchedEntries && context.chapterMatchedEntries.size > 0) {
                context.chapterMatchedEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }

            if (useMatchedSceneBeat && context.sceneBeatMatchedEntries && context.sceneBeatMatchedEntries.size > 0) {
                context.sceneBeatMatchedEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }

            if (useCustomContext && customContextItems && customContextItems.length > 0) {
                const customEntries = this.entries.filter(entry =>
                    customContextItems.includes(entry.id)
                );

                customEntries.forEach(entry => {
                    uniqueEntries.set(entry.id, entry);
                });
            }
        }
        else if (context.matchedEntries && context.matchedEntries.size > 0) {
            context.matchedEntries.forEach(entry => {
                uniqueEntries.set(entry.id, entry);
            });
        }

        const sortedEntries = Array.from(uniqueEntries.values()).sort(
            (a, b) => {
                const importanceOrder = { 'major': 3, 'minor': 2, 'background': 1 };
                const aImportance = a.metadata?.importance || 'background';
                const bImportance = b.metadata?.importance || 'background';
                return importanceOrder[bImportance] - importanceOrder[aImportance];
            }
        );

        if (sortedEntries.length === 0) {
            return 'No lorebook entries are available for this prompt.';
        }

        return this.formatter.formatEntries(sortedEntries);
    }
}
