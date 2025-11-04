import express from 'express';
import { db, schema } from '../db/client';
import { eq } from 'drizzle-orm';

const router = express.Router();

// GET AI settings (should be only one record)
router.get('/settings', async (req, res) => {
    try {
        const settings = await db.select().from(schema.aiSettings);
        if (!settings.length) {
            // Create initial settings if none exist
            const initialSettings = {
                id: crypto.randomUUID(),
                availableModels: [],
                createdAt: new Date(),
            };
            await db.insert(schema.aiSettings).values(initialSettings);
            return res.json(initialSettings);
        }
        res.json(settings[0]);
    } catch (error) {
        console.error('Error fetching AI settings:', error);
        res.status(500).json({ error: 'Failed to fetch AI settings' });
    }
});

// PUT update AI settings
router.put('/settings/:id', async (req, res) => {
    try {
        const updateData: any = {};

        if (req.body.openaiKey !== undefined) updateData.openaiKey = req.body.openaiKey;
        if (req.body.openrouterKey !== undefined) updateData.openrouterKey = req.body.openrouterKey;
        if (req.body.availableModels !== undefined) updateData.availableModels = req.body.availableModels;
        if (req.body.lastModelsFetch !== undefined) updateData.lastModelsFetch = new Date(req.body.lastModelsFetch);
        if (req.body.localApiUrl !== undefined) updateData.localApiUrl = req.body.localApiUrl;
        if (req.body.defaultLocalModel !== undefined) updateData.defaultLocalModel = req.body.defaultLocalModel;
        if (req.body.defaultOpenAIModel !== undefined) updateData.defaultOpenAIModel = req.body.defaultOpenAIModel;
        if (req.body.defaultOpenRouterModel !== undefined) updateData.defaultOpenRouterModel = req.body.defaultOpenRouterModel;

        await db.update(schema.aiSettings)
            .set(updateData)
            .where(eq(schema.aiSettings.id, req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating AI settings:', error);
        res.status(500).json({ error: 'Failed to update AI settings' });
    }
});

export default router;
