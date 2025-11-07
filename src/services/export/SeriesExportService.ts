import { seriesApi } from "../api/client";
import type { SeriesExport } from "@/types/story";

export class SeriesExportService {
    async exportSeries(seriesId: string): Promise<SeriesExport> {
        return await seriesApi.exportSeries(seriesId);
    }
}
