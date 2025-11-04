import express from 'express';
import { db, schema } from '../db/client';
import { eq, and, like, sql } from 'drizzle-orm';

const router = express.Router();

// GET all lorebook entries for a story
router.get('/story/:storyId', async (req, res) => {
    try {
        const entries = await db.select()
            .from(schema.lorebookEntries)
            .where(eq(schema.lorebookEntries.storyId, req.params.storyId));
        res.json(entries);
    } catch (error) {
        console.error('Error fetching lorebook entries:', error);
        res.status(500).json({ error: 'Failed to fetch lorebook entries' });
    }
});

// GET entries by category
router.get('/story/:storyId/category/:category', async (req, res) => {
    try {
        const entries = await db.select()
            .from(schema.lorebookEntries)
            .where(and(
                eq(schema.lorebookEntries.storyId, req.params.storyId),
                eq(schema.lorebookEntries.category, req.params.category)
            ));
        res.json(entries);
    } catch (error) {
        console.error('Error fetching lorebook entries by category:', error);
        res.status(500).json({ error: 'Failed to fetch lorebook entries' });
    }
});

// GET entries by tag - requires JSON search
router.get('/story/:storyId/tag/:tag', async (req, res) => {
    try {
        // Get all entries for the story and filter by tag in application code
        // SQLite JSON querying is limited without extensions
        const allEntries = await db.select()
            .from(schema.lorebookEntries)
            .where(eq(schema.lorebookEntries.storyId, req.params.storyId));

        const filtered = allEntries.filter(entry => {
            const tags = entry.tags as string[];
            return tags.includes(req.params.tag);
        });

        res.json(filtered);
    } catch (error) {
        console.error('Error fetching lorebook entries by tag:', error);
        res.status(500).json({ error: 'Failed to fetch lorebook entries' });
    }
});

// GET single entry
router.get('/:id', async (req, res) => {
    try {
        const entry = await db.select().from(schema.lorebookEntries).where(eq(schema.lorebookEntries.id, req.params.id));
        if (!entry.length) {
            return res.status(404).json({ error: 'Lorebook entry not found' });
        }
        res.json(entry[0]);
    } catch (error) {
        console.error('Error fetching lorebook entry:', error);
        res.status(500).json({ error: 'Failed to fetch lorebook entry' });
    }
});

// POST create entry
router.post('/', async (req, res) => {
    try {
        const entryData = {
            id: req.body.id || crypto.randomUUID(),
            storyId: req.body.storyId,
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
            tags: req.body.tags || [],
            metadata: req.body.metadata,
            isDisabled: req.body.isDisabled,
            createdAt: new Date(),
            isDemo: req.body.isDemo,
        };

        await db.insert(schema.lorebookEntries).values(entryData);
        res.status(201).json(entryData);
    } catch (error) {
        console.error('Error creating lorebook entry:', error);
        res.status(500).json({ error: 'Failed to create lorebook entry' });
    }
});

// PUT update entry
router.put('/:id', async (req, res) => {
    try {
        const updateData: any = {};

        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.category !== undefined) updateData.category = req.body.category;
        if (req.body.tags !== undefined) updateData.tags = req.body.tags;
        if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;
        if (req.body.isDisabled !== undefined) updateData.isDisabled = req.body.isDisabled;

        await db.update(schema.lorebookEntries)
            .set(updateData)
            .where(eq(schema.lorebookEntries.id, req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating lorebook entry:', error);
        res.status(500).json({ error: 'Failed to update lorebook entry' });
    }
});

// DELETE entry
router.delete('/:id', async (req, res) => {
    try {
        await db.delete(schema.lorebookEntries).where(eq(schema.lorebookEntries.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting lorebook entry:', error);
        res.status(500).json({ error: 'Failed to delete lorebook entry' });
    }
});

export default router;
