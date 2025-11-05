import { db } from './database';

export interface DatabaseExport {
    version: string;
    exportedAt: string;
    tables: {
        stories: unknown[];
        chapters: unknown[];
        aiChats: unknown[];
        prompts: unknown[];
        aiSettings: unknown[];
        lorebookEntries: unknown[];
        sceneBeats: unknown[];
        notes: unknown[];
    };
}

/**
 * Exports all data from the Dexie/IndexedDB database as JSON
 * @returns Promise resolving to a complete database export
 */
export const exportDexieDatabase = async (): Promise<DatabaseExport> => {
    const [stories, chapters, aiChats, prompts, aiSettings, lorebookEntries, sceneBeats, notes] = await Promise.all([
        db.stories.toArray(),
        db.chapters.toArray(),
        db.aiChats.toArray(),
        db.prompts.toArray(),
        db.aiSettings.toArray(),
        db.lorebookEntries.toArray(),
        db.sceneBeats.toArray(),
        db.notes.toArray(),
    ]);

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tables: {
            stories,
            chapters,
            aiChats,
            prompts,
            aiSettings,
            lorebookEntries,
            sceneBeats,
            notes,
        },
    };
};

/**
 * Downloads the database export as a JSON file
 * @param filename Optional filename (defaults to timestamped export)
 */
export const downloadDatabaseExport = async (filename?: string): Promise<void> => {
    const data = await exportDexieDatabase();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `story-nexus-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
