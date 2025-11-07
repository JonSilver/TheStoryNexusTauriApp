import { storiesApi } from "../api/client";
import type { StoryExport } from "@/types/story";

export class StoryExportService {
    async exportStory(storyId: string): Promise<StoryExport> {
        return await storiesApi.exportStory(storyId);
    }
}
