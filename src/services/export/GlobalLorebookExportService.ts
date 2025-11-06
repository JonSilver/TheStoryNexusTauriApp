import { lorebookApi } from '../api/client';
import type { GlobalLorebookExport } from '@/types/story';

export class GlobalLorebookExportService {
    async exportGlobal(): Promise<GlobalLorebookExport> {
        return await lorebookApi.exportGlobal();
    }

    async importGlobal(file: File): Promise<void> {
        await lorebookApi.importGlobal(file);
    }
}
