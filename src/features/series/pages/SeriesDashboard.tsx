import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditStoryDialog } from "@/features/stories/components/EditStoryDialog";
import { StoryCard } from "@/features/stories/components/StoryCard";
import { SeriesExportService } from "@/services/export/SeriesExportService";
import { storyExportService } from "@/services/storyExportService";
import type { Story } from "@/types/story";
import { downloadJSON } from "@/utils/jsonExportUtils";
import { Book, Download, Edit2, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import { SeriesForm } from "../components/SeriesForm";
import { useSeriesStoriesQuery, useSingleSeriesQuery } from "../hooks/useSeriesQuery";

const seriesExportService = new SeriesExportService();

const SeriesDashboard = () => {
    const { seriesId } = useParams<{ seriesId: string }>();
    const navigate = useNavigate();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [storyEditDialogOpen, setStoryEditDialogOpen] = useState(false);

    const { data: series, isLoading: seriesLoading } = useSingleSeriesQuery(seriesId);
    const { data: stories, isLoading: storiesLoading } = useSeriesStoriesQuery(seriesId);

    const handleEditStory = (story: Story) => {
        setEditingStory(story);
        setStoryEditDialogOpen(true);
    };

    const handleExportStory = (story: Story) => {
        storyExportService.exportStory(story.id);
    };

    const handleExportSeries = async () => {
        if (!seriesId) return;

        try {
            const exportData = await seriesExportService.exportSeries(seriesId);
            const filename = `${series?.name || "series"}-export.json`;
            downloadJSON(exportData, filename);
            toast.success("Series exported successfully");
        } catch (error) {
            console.error("Failed to export series:", error);
            toast.error("Failed to export series");
        }
    };

    if (seriesLoading) return <div>Loading series...</div>;
    if (!series) return <div>Series not found</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{series.name}</h1>
                    {series.description && <p className="text-muted-foreground">{series.description}</p>}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/series/${seriesId}/lorebook`)}>
                        <Book className="w-4 h-4 mr-2" />
                        Lorebook
                    </Button>
                    <Button variant="outline" onClick={handleExportSeries}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Series
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Series
                    </Button>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Stories in Series</h2>
                    <Button onClick={() => navigate("/stories", { state: { seriesId } })}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Story
                    </Button>
                </div>

                {storiesLoading ? (
                    <div>Loading stories...</div>
                ) : stories && stories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stories.map(story => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                onEdit={handleEditStory}
                                onExport={handleExportStory}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        No stories in this series yet. Create one to get started.
                    </div>
                )}
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Series</DialogTitle>
                    </DialogHeader>
                    <SeriesForm series={series} onSuccess={() => setIsEditDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <EditStoryDialog key={editingStory?.id} story={editingStory} open={storyEditDialogOpen} onOpenChange={setStoryEditDialogOpen} />
        </div>
    );
};

export { SeriesDashboard };
export default SeriesDashboard;
