import express from 'express';
import { db, schema } from '../db/client';
import { eq } from 'drizzle-orm';

const router = express.Router();

const parseJson = (value: unknown) => {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

// GET scene beats by chapter
router.get('/chapter/:chapterId', async (req, res) => {
    try {
        const sceneBeats = await db.select()
            .from(schema.sceneBeats)
            .where(eq(schema.sceneBeats.chapterId, req.params.chapterId));

        const parsed = sceneBeats.map(sb => ({
            ...sb,
            metadata: parseJson(sb.metadata),
        }));

        res.json(parsed);
    } catch (error) {
        console.error('Error fetching scene beats:', error);
        res.status(500).json({ error: 'Failed to fetch scene beats' });
    }
});

// GET single scene beat
router.get('/:id', async (req, res) => {
    try {
        const sceneBeat = await db.select().from(schema.sceneBeats).where(eq(schema.sceneBeats.id, req.params.id));
        if (!sceneBeat.length) {
            return res.status(404).json({ error: 'Scene beat not found' });
        }

        const parsed = {
            ...sceneBeat[0],
            metadata: parseJson(sceneBeat[0].metadata),
        };

        res.json(parsed);
    } catch (error) {
        console.error('Error fetching scene beat:', error);
        res.status(500).json({ error: 'Failed to fetch scene beat' });
    }
});

// POST create scene beat
router.post('/', async (req, res) => {
    try {
        const sceneBeatData = {
            id: req.body.id || crypto.randomUUID(),
            storyId: req.body.storyId,
            chapterId: req.body.chapterId,
            command: req.body.command,
            povType: req.body.povType,
            povCharacter: req.body.povCharacter,
            generatedContent: req.body.generatedContent,
            accepted: req.body.accepted,
            metadata: req.body.metadata,
            createdAt: new Date(),
        };

        await db.insert(schema.sceneBeats).values(sceneBeatData);
        res.status(201).json(sceneBeatData);
    } catch (error) {
        console.error('Error creating scene beat:', error);
        res.status(500).json({ error: 'Failed to create scene beat' });
    }
});

// PUT update scene beat
router.put('/:id', async (req, res) => {
    try {
        const updateData: any = {};

        if (req.body.command !== undefined) updateData.command = req.body.command;
        if (req.body.povType !== undefined) updateData.povType = req.body.povType;
        if (req.body.povCharacter !== undefined) updateData.povCharacter = req.body.povCharacter;
        if (req.body.generatedContent !== undefined) updateData.generatedContent = req.body.generatedContent;
        if (req.body.accepted !== undefined) updateData.accepted = req.body.accepted;
        if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;

        await db.update(schema.sceneBeats)
            .set(updateData)
            .where(eq(schema.sceneBeats.id, req.params.id));

        const updated = await db.select().from(schema.sceneBeats).where(eq(schema.sceneBeats.id, req.params.id));
        const parsed = {
            ...updated[0],
            metadata: parseJson(updated[0].metadata),
        };
        res.json(parsed);
    } catch (error) {
        console.error('Error updating scene beat:', error);
        res.status(500).json({ error: 'Failed to update scene beat' });
    }
});

// DELETE scene beat
router.delete('/:id', async (req, res) => {
    try {
        await db.delete(schema.sceneBeats).where(eq(schema.sceneBeats.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting scene beat:', error);
        res.status(500).json({ error: 'Failed to delete scene beat' });
    }
});

export default router;
