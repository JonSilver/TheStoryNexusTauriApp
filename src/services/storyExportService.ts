import { toast } from 'react-toastify';
import { StoryExportService } from './export/StoryExportService';
import { StoryImportService } from './export/StoryImportService';
import { FileDownloadUtil } from './export/FileDownloadUtil';
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';

const exportService = new StoryExportService();
const importService = new StoryImportService();

export const storyExportService = {
    /**
     * Export a complete story with all related data
     */
    exportStory: async (storyId: string): Promise<void> => {
        const [error, exportData] = await attemptPromise(() =>
            exportService.exportStory(storyId)
        );

        if (error) {
            logger.error('Story export failed:', error);
            toast.error(`Export failed: ${error.message}`);
            throw error;
        }

        FileDownloadUtil.downloadStoryExport(exportData, exportData.story);
        toast.success(`Story "${exportData.story.title}" exported successfully`);
    },

    /**
     * Import a complete story with all related data
     * Returns the ID of the newly imported story
     */
    importStory: async (file: File): Promise<string> => {
        const [importError, newStoryId] = await attemptPromise(() =>
            importService.importStory(file)
        );

        if (importError) {
            logger.error('Story import failed:', importError);
            toast.error(`Import failed: ${importError.message}`);
            throw importError;
        }

        toast.success('Story imported successfully');
        return newStoryId;
    }
};

// Export individual services for direct access when needed
export { StoryExportService, StoryImportService, FileDownloadUtil };
