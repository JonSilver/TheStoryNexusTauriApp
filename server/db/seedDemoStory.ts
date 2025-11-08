import { db, schema } from "./client.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { StoryExport } from "../../src/types/story.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDemoStory = async () => {
    try {
        // Check if demo story already exists
        const existingDemoStory = await db
            .select()
            .from(schema.stories)
            .where(eq(schema.stories.id, "demo-story-shadows-berlin"));

        if (existingDemoStory.length > 0) {
            console.log("Demo story already exists, skipping seed");
            return;
        }

        console.log("Seeding demo story...");

        // Load demo story data
        const demoDataPath = path.join(__dirname, "../data/demo-story-shadows-berlin.json");
        const demoDataRaw = readFileSync(demoDataPath, "utf-8");
        const demoData: StoryExport = JSON.parse(demoDataRaw);

        // Insert story
        await db.insert(schema.stories).values({
            id: demoData.story.id,
            title: demoData.story.title,
            author: demoData.story.author,
            language: demoData.story.language,
            synopsis: demoData.story.synopsis || null,
            seriesId: null,
            createdAt: new Date(demoData.story.createdAt),
            isDemo: true
        });

        // Insert chapters
        if (demoData.chapters && demoData.chapters.length > 0) {
            const chaptersToInsert = demoData.chapters.map(chapter => ({
                id: chapter.id,
                storyId: chapter.storyId,
                title: chapter.title,
                summary: chapter.summary || null,
                order: chapter.order,
                content: chapter.content,
                outline: chapter.outline || null,
                wordCount: chapter.wordCount,
                povCharacter: chapter.povCharacter || null,
                povType: chapter.povType || null,
                notes: chapter.notes || null,
                createdAt: new Date(chapter.createdAt),
                isDemo: true
            }));
            await db.insert(schema.chapters).values(chaptersToInsert);
        }

        // Insert lorebook entries
        if (demoData.lorebookEntries && demoData.lorebookEntries.length > 0) {
            const lorebookToInsert = demoData.lorebookEntries.map(entry => ({
                id: entry.id,
                level: entry.level,
                scopeId: entry.scopeId || null,
                name: entry.name,
                description: entry.description,
                category: entry.category,
                tags: entry.tags,
                metadata: entry.metadata || null,
                isDisabled: entry.isDisabled || false,
                createdAt: new Date(entry.createdAt),
                isDemo: true
            }));
            await db.insert(schema.lorebookEntries).values(lorebookToInsert);
        }

        // Insert AI chats
        if (demoData.aiChats && demoData.aiChats.length > 0) {
            const chatsToInsert = demoData.aiChats.map(chat => ({
                id: chat.id,
                storyId: chat.storyId,
                title: chat.title,
                messages: chat.messages,
                createdAt: new Date(chat.createdAt),
                updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
                lastUsedPromptId: chat.lastUsedPromptId || null,
                lastUsedModelId: chat.lastUsedModelId || null,
                isDemo: true
            }));
            await db.insert(schema.aiChats).values(chatsToInsert);
        }

        // Insert scene beats (if any)
        if (demoData.sceneBeats && demoData.sceneBeats.length > 0) {
            const sceneBeatsToInsert = demoData.sceneBeats.map(beat => ({
                id: beat.id,
                storyId: beat.storyId,
                chapterId: beat.chapterId,
                command: beat.command,
                povType: beat.povType || null,
                povCharacter: beat.povCharacter || null,
                generatedContent: beat.generatedContent || null,
                accepted: beat.accepted || false,
                metadata: beat.metadata || null,
                createdAt: new Date(beat.createdAt)
            }));
            await db.insert(schema.sceneBeats).values(sceneBeatsToInsert);
        }

        console.log(
            `Successfully seeded demo story with ${demoData.chapters?.length || 0} chapters, ${demoData.lorebookEntries?.length || 0} lorebook entries, and ${demoData.aiChats?.length || 0} AI chats`
        );
    } catch (error) {
        console.error("Error seeding demo story:", error);
        throw error;
    }
};
