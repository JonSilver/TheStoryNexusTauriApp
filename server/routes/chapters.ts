import express from 'express';
import { db, schema } from '../db/client';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// GET all chapters for a story
router.get('/story/:storyId', async (req, res) => {
    try {
        const chapters = await db.select()
            .from(schema.chapters)
            .where(eq(schema.chapters.storyId, req.params.storyId))
            .orderBy(schema.chapters.order);
        res.json(chapters);
    } catch (error) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({ error: 'Failed to fetch chapters' });
    }
});

// GET single chapter
router.get('/:id', async (req, res) => {
    try {
        const chapter = await db.select().from(schema.chapters).where(eq(schema.chapters.id, req.params.id));
        if (!chapter.length) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        res.json(chapter[0]);
    } catch (error) {
        console.error('Error fetching chapter:', error);
        res.status(500).json({ error: 'Failed to fetch chapter' });
    }
});

// POST create chapter
router.post('/', async (req, res) => {
    try {
        const chapterData = {
            id: req.body.id || crypto.randomUUID(),
            storyId: req.body.storyId,
            title: req.body.title,
            summary: req.body.summary,
            order: req.body.order,
            content: req.body.content || '',
            outline: req.body.outline,
            wordCount: req.body.wordCount || 0,
            povCharacter: req.body.povCharacter,
            povType: req.body.povType,
            notes: req.body.notes,
            createdAt: new Date(),
            isDemo: req.body.isDemo,
        };

        await db.insert(schema.chapters).values(chapterData);
        res.status(201).json(chapterData);
    } catch (error) {
        console.error('Error creating chapter:', error);
        res.status(500).json({ error: 'Failed to create chapter' });
    }
});

// PUT update chapter
router.put('/:id', async (req, res) => {
    try {
        const updateData: any = {};

        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.summary !== undefined) updateData.summary = req.body.summary;
        if (req.body.order !== undefined) updateData.order = req.body.order;
        if (req.body.content !== undefined) updateData.content = req.body.content;
        if (req.body.outline !== undefined) updateData.outline = req.body.outline;
        if (req.body.wordCount !== undefined) updateData.wordCount = req.body.wordCount;
        if (req.body.povCharacter !== undefined) updateData.povCharacter = req.body.povCharacter;
        if (req.body.povType !== undefined) updateData.povType = req.body.povType;
        if (req.body.notes !== undefined) updateData.notes = req.body.notes;

        await db.update(schema.chapters)
            .set(updateData)
            .where(eq(schema.chapters.id, req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating chapter:', error);
        res.status(500).json({ error: 'Failed to update chapter' });
    }
});

// DELETE chapter
router.delete('/:id', async (req, res) => {
    try {
        await db.delete(schema.chapters).where(eq(schema.chapters.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ error: 'Failed to delete chapter' });
    }
});

export default router;
