import { scenebeatsApi } from '@/services/api/client';
import { SceneBeat } from '@/types/story';

export const sceneBeatService = {
    /**
     * Create a new SceneBeat
     */
    async createSceneBeat(data: Omit<SceneBeat, 'id' | 'createdAt'>): Promise<string> {
        const sceneBeat = await scenebeatsApi.create(data);
        return sceneBeat.id;
    },

    /**
     * Get a SceneBeat by ID
     */
    async getSceneBeat(id: string): Promise<SceneBeat | undefined> {
        return scenebeatsApi.getById(id);
    },

    /**
     * Update a SceneBeat
     */
    async updateSceneBeat(id: string, data: Partial<SceneBeat>): Promise<void> {
        await scenebeatsApi.update(id, data);
    },

    /**
     * Delete a SceneBeat
     */
    async deleteSceneBeat(id: string): Promise<void> {
        await scenebeatsApi.delete(id);
    },

    /**
     * Get all SceneBeats for a chapter
     */
    async getSceneBeatsByChapter(chapterId: string): Promise<SceneBeat[]> {
        return scenebeatsApi.getByChapter(chapterId);
    },

    /**
     * Delete all SceneBeats for a chapter
     */
    async deleteSceneBeatsByChapter(chapterId: string): Promise<void> {
        const sceneBeats = await scenebeatsApi.getByChapter(chapterId);
        for (const sceneBeat of sceneBeats) {
            await scenebeatsApi.delete(sceneBeat.id);
        }
    }
}; 