import express from 'express';
import { db, schema } from '../db/client';
import { eq } from 'drizzle-orm';

const router = express.Router();

// GET all notes for a story
router.get('/story/:storyId', async (req, res) => {
    try {
        const notes = await db.select()
            .from(schema.notes)
            .where(eq(schema.notes.storyId, req.params.storyId));
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// GET single note
router.get('/:id', async (req, res) => {
    try {
        const note = await db.select().from(schema.notes).where(eq(schema.notes.id, req.params.id));
        if (!note.length) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(note[0]);
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// POST create note
router.post('/', async (req, res) => {
    try {
        const noteData = {
            id: req.body.id || crypto.randomUUID(),
            storyId: req.body.storyId,
            title: req.body.title,
            content: req.body.content,
            type: req.body.type,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDemo: req.body.isDemo,
        };

        await db.insert(schema.notes).values(noteData);
        res.status(201).json(noteData);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// PUT update note
router.put('/:id', async (req, res) => {
    try {
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.content !== undefined) updateData.content = req.body.content;
        if (req.body.type !== undefined) updateData.type = req.body.type;

        await db.update(schema.notes)
            .set(updateData)
            .where(eq(schema.notes.id, req.params.id));

        const updated = await db.select().from(schema.notes).where(eq(schema.notes.id, req.params.id));
        res.json(updated[0]);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// DELETE note
router.delete('/:id', async (req, res) => {
    try {
        await db.delete(schema.notes).where(eq(schema.notes.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;
