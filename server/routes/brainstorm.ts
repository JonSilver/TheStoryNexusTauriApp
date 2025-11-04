import express from 'express';
import { db, schema } from '../db/client';
import { eq } from 'drizzle-orm';

const router = express.Router();

// GET all AI chats for a story
router.get('/story/:storyId', async (req, res) => {
    try {
        const chats = await db.select()
            .from(schema.aiChats)
            .where(eq(schema.aiChats.storyId, req.params.storyId));
        res.json(chats);
    } catch (error) {
        console.error('Error fetching AI chats:', error);
        res.status(500).json({ error: 'Failed to fetch AI chats' });
    }
});

// GET single AI chat
router.get('/:id', async (req, res) => {
    try {
        const chat = await db.select().from(schema.aiChats).where(eq(schema.aiChats.id, req.params.id));
        if (!chat.length) {
            return res.status(404).json({ error: 'AI chat not found' });
        }
        res.json(chat[0]);
    } catch (error) {
        console.error('Error fetching AI chat:', error);
        res.status(500).json({ error: 'Failed to fetch AI chat' });
    }
});

// POST create AI chat
router.post('/', async (req, res) => {
    try {
        const chatData = {
            id: req.body.id || crypto.randomUUID(),
            storyId: req.body.storyId,
            title: req.body.title,
            messages: req.body.messages || [],
            createdAt: new Date(),
            updatedAt: req.body.updatedAt ? new Date(req.body.updatedAt) : undefined,
            isDemo: req.body.isDemo,
        };

        await db.insert(schema.aiChats).values(chatData);
        res.status(201).json(chatData);
    } catch (error) {
        console.error('Error creating AI chat:', error);
        res.status(500).json({ error: 'Failed to create AI chat' });
    }
});

// PUT update AI chat
router.put('/:id', async (req, res) => {
    try {
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.messages !== undefined) updateData.messages = req.body.messages;

        await db.update(schema.aiChats)
            .set(updateData)
            .where(eq(schema.aiChats.id, req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating AI chat:', error);
        res.status(500).json({ error: 'Failed to update AI chat' });
    }
});

// DELETE AI chat
router.delete('/:id', async (req, res) => {
    try {
        await db.delete(schema.aiChats).where(eq(schema.aiChats.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting AI chat:', error);
        res.status(500).json({ error: 'Failed to delete AI chat' });
    }
});

export default router;
