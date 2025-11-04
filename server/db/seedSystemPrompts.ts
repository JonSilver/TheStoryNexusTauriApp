import { db, schema } from './client';
import { eq } from 'drizzle-orm';
import systemPrompts from '../../src/data/systemPrompts';
import type { Prompt } from '../../src/types/story';

export const seedSystemPrompts = async () => {
    try {
        // Check if any system prompts already exist
        const existingSystemPrompts = await db
            .select()
            .from(schema.prompts)
            .where(eq(schema.prompts.isSystem, 1));

        if (existingSystemPrompts.length > 0) {
            console.log(`System prompts already exist (${existingSystemPrompts.length} found), skipping seed`);
            return;
        }

        console.log('Seeding system prompts...');

        // Insert all system prompts
        const promptsToInsert = systemPrompts.map((prompt: Partial<Prompt>) => ({
            id: prompt.id || crypto.randomUUID(),
            name: prompt.name!,
            description: prompt.description || null,
            promptType: prompt.promptType!,
            messages: prompt.messages!,
            allowedModels: prompt.allowedModels || [],
            storyId: null,
            isSystem: 1,
            temperature: prompt.temperature || null,
            maxTokens: prompt.maxTokens || null,
            top_p: prompt.top_p || null,
            top_k: prompt.top_k || null,
            repetition_penalty: prompt.repetition_penalty || null,
            min_p: prompt.min_p || null,
            createdAt: new Date(),
        }));

        await db.insert(schema.prompts).values(promptsToInsert);

        console.log(`Successfully seeded ${promptsToInsert.length} system prompts`);
    } catch (error) {
        console.error('Error seeding system prompts:', error);
        throw error;
    }
};
