import express from 'express';
import { db, schema } from '../db/client';
import { eq } from 'drizzle-orm';

const router = express.Router();

// GET all stories
router.get('/', async (req, res) => {
    try {
        const stories = await db.select().from(schema.stories);
        res.json(stories);
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});

// GET single story
router.get('/:id', async (req, res) => {
    try {
        const story = await db.select().from(schema.stories).where(eq(schema.stories.id, req.params.id));
        if (!story.length) {
            return res.status(404).json({ error: 'Story not found' });
        }
        res.json(story[0]);
    } catch (error) {
        console.error('Error fetching story:', error);
        res.status(500).json({ error: 'Failed to fetch story' });
    }
});

// POST create story
router.post('/', async (req, res) => {
    try {
        const storyData = {
            id: req.body.id || crypto.randomUUID(),
            title: req.body.title,
            author: req.body.author,
            language: req.body.language,
            synopsis: req.body.synopsis,
            createdAt: new Date(),
            isDemo: req.body.isDemo,
        };

        await db.insert(schema.stories).values(storyData);
        res.status(201).json(storyData);
    } catch (error) {
        console.error('Error creating story:', error);
        res.status(500).json({ error: 'Failed to create story' });
    }
});

// PUT update story
router.put('/:id', async (req, res) => {
    try {
        const updateData = {
            ...(req.body.title !== undefined && { title: req.body.title }),
            ...(req.body.author !== undefined && { author: req.body.author }),
            ...(req.body.language !== undefined && { language: req.body.language }),
            ...(req.body.synopsis !== undefined && { synopsis: req.body.synopsis }),
        };

        await db.update(schema.stories)
            .set(updateData)
            .where(eq(schema.stories.id, req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating story:', error);
        res.status(500).json({ error: 'Failed to update story' });
    }
});

// DELETE story (and cascade delete related data)
router.delete('/:id', async (req, res) => {
    try {
        // Drizzle handles cascade deletion via foreign key constraints
        await db.delete(schema.stories).where(eq(schema.stories.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting story:', error);
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

export default router;
