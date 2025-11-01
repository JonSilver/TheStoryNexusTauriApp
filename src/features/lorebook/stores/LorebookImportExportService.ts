import { db } from '@/services/database';
import type { LorebookEntry } from '@/types/story';
import { attemptPromise, attempt } from '@jfdi/attempt';
import { lorebookExportSchema } from '@/schemas/entities';

export class LorebookImportExportService {
    static exportEntries(entries: LorebookEntry[], storyId: string): void {
        const entriesToExport = entries.filter(entry => entry.storyId === storyId);

        const exportData = {
            version: '1.0',
            type: 'lorebook',
            entries: entriesToExport
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lorebook-${storyId}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async importEntries(
        jsonData: string,
        targetStoryId: string,
        onEntriesAdded: (entries: LorebookEntry[]) => void
    ): Promise<void> {
        const [parseError, parsed] = attempt(() => JSON.parse(jsonData));

        if (parseError) {
            console.error('Error parsing lorebook entries:', parseError);
            throw parseError;
        }

        const result = lorebookExportSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`Invalid lorebook data format: ${result.error.message}`);
        }

        const newEntries: LorebookEntry[] = [];

        for (const entry of result.data.entries) {
            const newEntry: LorebookEntry = {
                ...entry,
                id: crypto.randomUUID(),
                storyId: targetStoryId,
                createdAt: new Date(),
            };

            const [addError] = await attemptPromise(() =>
                db.lorebookEntries.add(newEntry)
            );

            if (addError) {
                console.error('Error adding lorebook entry:', addError);
                throw addError;
            }

            newEntries.push(newEntry);
        }

        onEntriesAdded(newEntries);
    }
}
