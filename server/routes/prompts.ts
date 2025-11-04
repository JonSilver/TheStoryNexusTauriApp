import express from 'express';
import { db, schema } from '../db/client';
import { eq, and, or, isNull } from 'drizzle-orm';

const router = express.Router();

// GET all prompts (optionally filtered by story or type)
router.get('/', async (req, res) => {
    try {
        const { storyId, promptType, includeSystem } = req.query;

        let query = db.select().from(schema.prompts);

        if (storyId) {
            query = query.where(or(
                eq(schema.prompts.storyId, storyId as string),
                isNull(schema.prompts.storyId)
            )) as typeof query;
        }

        const prompts = await query;

        // Filter by promptType and includeSystem in application code
        let filtered = prompts;

        if (promptType) {
            filtered = filtered.filter(p => p.promptType === promptType);
        }

        if (includeSystem !== 'true') {
            filtered = filtered.filter(p => !p.isSystem);
        }

        res.json(filtered);
    } catch (error) {
        console.error('Error fetching prompts:', error);
        res.status(500).json({ error: 'Failed to fetch prompts' });
    }
});

// GET single prompt
router.get('/:id', async (req, res) => {
    try {
        const prompt = await db.select().from(schema.prompts).where(eq(schema.prompts.id, req.params.id));
        if (!prompt.length) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        res.json(prompt[0]);
    } catch (error) {
        console.error('Error fetching prompt:', error);
        res.status(500).json({ error: 'Failed to fetch prompt' });
    }
});

// POST create prompt
router.post('/', async (req, res) => {
    try {
        const promptData = {
            id: req.body.id || crypto.randomUUID(),
            name: req.body.name,
            description: req.body.description,
            promptType: req.body.promptType,
            messages: req.body.messages,
            allowedModels: req.body.allowedModels || [],
            storyId: req.body.storyId,
            isSystem: req.body.isSystem,
            temperature: req.body.temperature,
            maxTokens: req.body.maxTokens,
            top_p: req.body.top_p,
            top_k: req.body.top_k,
            repetition_penalty: req.body.repetition_penalty,
            min_p: req.body.min_p,
            createdAt: new Date(),
        };

        await db.insert(schema.prompts).values(promptData);
        res.status(201).json(promptData);
    } catch (error) {
        console.error('Error creating prompt:', error);
        res.status(500).json({ error: 'Failed to create prompt' });
    }
});

// PUT update prompt
router.put('/:id', async (req, res) => {
    try {
        const updateData: any = {};

        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.promptType !== undefined) updateData.promptType = req.body.promptType;
        if (req.body.messages !== undefined) updateData.messages = req.body.messages;
        if (req.body.allowedModels !== undefined) updateData.allowedModels = req.body.allowedModels;
        if (req.body.storyId !== undefined) updateData.storyId = req.body.storyId;
        if (req.body.temperature !== undefined) updateData.temperature = req.body.temperature;
        if (req.body.maxTokens !== undefined) updateData.maxTokens = req.body.maxTokens;
        if (req.body.top_p !== undefined) updateData.top_p = req.body.top_p;
        if (req.body.top_k !== undefined) updateData.top_k = req.body.top_k;
        if (req.body.repetition_penalty !== undefined) updateData.repetition_penalty = req.body.repetition_penalty;
        if (req.body.min_p !== undefined) updateData.min_p = req.body.min_p;

        await db.update(schema.prompts)
            .set(updateData)
            .where(eq(schema.prompts.id, req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating prompt:', error);
        res.status(500).json({ error: 'Failed to update prompt' });
    }
});

// DELETE prompt (only non-system prompts)
router.delete('/:id', async (req, res) => {
    try {
        // Check if it's a system prompt
        const prompt = await db.select().from(schema.prompts).where(eq(schema.prompts.id, req.params.id));
        if (prompt.length && prompt[0].isSystem) {
            return res.status(403).json({ error: 'Cannot delete system prompts' });
        }

        await db.delete(schema.prompts).where(eq(schema.prompts.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        res.status(500).json({ error: 'Failed to delete prompt' });
    }
});

export default router;
