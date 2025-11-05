import express from 'express';
import multer from 'multer';
import { attemptPromise } from '@jfdi/attempt';
import { db, schema } from '../db/client';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

// GET export database as JSON (from SQLite)
router.get('/export', async (req, res) => {
    const [error, tables] = await attemptPromise(() => Promise.all([
        db.select().from(schema.stories),
        db.select().from(schema.chapters),
        db.select().from(schema.prompts),
        db.select().from(schema.lorebookEntries),
        db.select().from(schema.aiChats),
        db.select().from(schema.sceneBeats),
        db.select().from(schema.notes),
        db.select().from(schema.aiSettings),
    ]));

    if (error) {
        console.error('Error exporting database:', error);
        return res.status(500).json({ error: 'Failed to export database', details: error.message });
    }

    const [stories, chapters, prompts, lorebookEntries, aiChats, sceneBeats, notes, aiSettings] = tables;

    res.json({
        version: "1.0",
        exportedAt: new Date().toISOString(),
        tables: { stories, chapters, prompts, lorebookEntries, aiChats, sceneBeats, notes, aiSettings }
    });
});

// POST import database from JSON
router.post('/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const [parseError, jsonData] = await attemptPromise(() =>
        Promise.resolve(JSON.parse(req.file!.buffer.toString('utf-8')))
    );

    if (parseError) {
        return res.status(400).json({ error: 'Invalid JSON file', details: parseError.message });
    }

    if (!jsonData.version || !jsonData.tables) {
        return res.status(400).json({ error: 'Invalid import file format' });
    }

    const { tables } = jsonData;

    const [error] = await attemptPromise(async () => {
        await db.delete(schema.sceneBeats);
        await db.delete(schema.notes);
        await db.delete(schema.lorebookEntries);
        await db.delete(schema.aiChats);
        await db.delete(schema.chapters);
        await db.delete(schema.prompts);
        await db.delete(schema.stories);
        await db.delete(schema.aiSettings);

        if (tables.stories?.length) {
            await Promise.all(tables.stories.map((story: any) =>
                db.insert(schema.stories).values({ ...story, createdAt: new Date(story.createdAt) })
            ));
        }

        if (tables.chapters?.length) {
            await Promise.all(tables.chapters.map((chapter: any) =>
                db.insert(schema.chapters).values({ ...chapter, createdAt: new Date(chapter.createdAt) })
            ));
        }

        if (tables.prompts?.length) {
            await Promise.all(tables.prompts.map((prompt: any) =>
                db.insert(schema.prompts).values({ ...prompt, createdAt: new Date(prompt.createdAt) })
            ));
        }

        if (tables.lorebookEntries?.length) {
            await Promise.all(tables.lorebookEntries.map((entry: any) =>
                db.insert(schema.lorebookEntries).values({ ...entry, createdAt: new Date(entry.createdAt) })
            ));
        }

        if (tables.aiChats?.length) {
            await Promise.all(tables.aiChats.map((chat: any) =>
                db.insert(schema.aiChats).values({
                    ...chat,
                    createdAt: new Date(chat.createdAt),
                    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : undefined,
                })
            ));
        }

        if (tables.sceneBeats?.length) {
            await Promise.all(tables.sceneBeats.map((sceneBeat: any) =>
                db.insert(schema.sceneBeats).values({ ...sceneBeat, createdAt: new Date(sceneBeat.createdAt) })
            ));
        }

        if (tables.notes?.length) {
            await Promise.all(tables.notes.map((note: any) =>
                db.insert(schema.notes).values({
                    ...note,
                    createdAt: new Date(note.createdAt),
                    updatedAt: new Date(note.updatedAt),
                })
            ));
        }

        if (tables.aiSettings?.length) {
            await Promise.all(tables.aiSettings.map((setting: any) =>
                db.insert(schema.aiSettings).values({
                    ...setting,
                    createdAt: new Date(setting.createdAt),
                    updatedAt: setting.updatedAt ? new Date(setting.updatedAt) : undefined,
                })
            ));
        }
    });

    if (error) {
        console.error('Error importing database:', error);
        return res.status(500).json({ error: 'Failed to import database', details: error.message });
    }

    res.json({
        success: true,
        imported: {
            stories: tables.stories?.length || 0,
            chapters: tables.chapters?.length || 0,
            prompts: tables.prompts?.length || 0,
            lorebookEntries: tables.lorebookEntries?.length || 0,
            aiChats: tables.aiChats?.length || 0,
            sceneBeats: tables.sceneBeats?.length || 0,
            notes: tables.notes?.length || 0,
            aiSettings: tables.aiSettings?.length || 0,
        }
    });
});

export default router;
