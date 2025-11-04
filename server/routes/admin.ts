import express from 'express';
import multer from 'multer';
import { db, schema } from '../db/client';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit

// GET export database as JSON (from SQLite)
router.get('/export', async (req, res) => {
    try {
        const [stories, chapters, prompts, lorebookEntries, aiChats, sceneBeats, notes, aiSettings] = await Promise.all([
            db.select().from(schema.stories),
            db.select().from(schema.chapters),
            db.select().from(schema.prompts),
            db.select().from(schema.lorebookEntries),
            db.select().from(schema.aiChats),
            db.select().from(schema.sceneBeats),
            db.select().from(schema.notes),
            db.select().from(schema.aiSettings),
        ]);

        const exportData = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            tables: {
                stories,
                chapters,
                prompts,
                lorebookEntries,
                aiChats,
                sceneBeats,
                notes,
                aiSettings,
            }
        };

        res.json(exportData);
    } catch (error) {
        console.error('Error exporting database:', error);
        res.status(500).json({ error: 'Failed to export database', details: (error as Error).message });
    }
});

// POST import database from JSON
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const jsonData = JSON.parse(req.file.buffer.toString('utf-8'));

        // Validate JSON structure
        if (!jsonData.version || !jsonData.tables) {
            return res.status(400).json({ error: 'Invalid import file format' });
        }

        const { tables } = jsonData;

        // Delete all existing data (in reverse order of dependencies)
        await db.delete(schema.sceneBeats);
        await db.delete(schema.notes);
        await db.delete(schema.lorebookEntries);
        await db.delete(schema.aiChats);
        await db.delete(schema.chapters);
        await db.delete(schema.prompts);
        await db.delete(schema.stories);
        // Don't delete aiSettings - keep existing configuration

        // Insert new data (in order of dependencies)
        if (tables.stories?.length) {
            for (const story of tables.stories) {
                await db.insert(schema.stories).values({
                    ...story,
                    createdAt: new Date(story.createdAt),
                });
            }
        }

        if (tables.chapters?.length) {
            for (const chapter of tables.chapters) {
                await db.insert(schema.chapters).values({
                    ...chapter,
                    createdAt: new Date(chapter.createdAt),
                });
            }
        }

        if (tables.prompts?.length) {
            for (const prompt of tables.prompts) {
                await db.insert(schema.prompts).values({
                    ...prompt,
                    createdAt: new Date(prompt.createdAt),
                });
            }
        }

        if (tables.lorebookEntries?.length) {
            for (const entry of tables.lorebookEntries) {
                await db.insert(schema.lorebookEntries).values({
                    ...entry,
                    createdAt: new Date(entry.createdAt),
                });
            }
        }

        if (tables.aiChats?.length) {
            for (const chat of tables.aiChats) {
                await db.insert(schema.aiChats).values({
                    ...chat,
                    createdAt: new Date(chat.createdAt),
                    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : undefined,
                });
            }
        }

        if (tables.sceneBeats?.length) {
            for (const sceneBeat of tables.sceneBeats) {
                await db.insert(schema.sceneBeats).values({
                    ...sceneBeat,
                    createdAt: new Date(sceneBeat.createdAt),
                });
            }
        }

        if (tables.notes?.length) {
            for (const note of tables.notes) {
                await db.insert(schema.notes).values({
                    ...note,
                    createdAt: new Date(note.createdAt),
                    updatedAt: new Date(note.updatedAt),
                });
            }
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
            }
        });
    } catch (error) {
        console.error('Error importing database:', error);
        res.status(500).json({ error: 'Failed to import database', details: (error as Error).message });
    }
});

export default router;
