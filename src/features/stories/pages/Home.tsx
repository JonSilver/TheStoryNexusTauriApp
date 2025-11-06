import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeriesQuery } from "@/features/series/hooks/useSeriesQuery";
import { CreateStoryDialog } from "@/features/stories/components/CreateStoryDialog";
import { EditStoryDialog } from "@/features/stories/components/EditStoryDialog";
import { StoryCard } from "@/features/stories/components/StoryCard";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useStoriesQuery } from "@/features/stories/hooks/useStoriesQuery";
import { storyExportService } from "@/services/storyExportService";
import type { Story } from "@/types/story";
import { logger } from "@/utils/logger";
import { attemptPromise } from "@jfdi/attempt";
import { Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

export default function Home() {
    const { data: stories = [], refetch: fetchStories } = useStoriesQuery();
    const { data: seriesList = [] } = useSeriesQuery();
    const { resetContext } = useStoryContext();
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>("all");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        resetContext();
    }, [resetContext]);

    const handleEditStory = (story: Story) => {
        setEditingStory(story);
        setEditDialogOpen(true);
    };

    const handleExportStory = (story: Story) => {
        storyExportService.exportStory(story.id);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleImportStory = async (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];

        const [error] = await attemptPromise(async () => {
            await storyExportService.importStory(file);

            // Just refresh the story list without navigating
            await fetchStories();
        });

        if (error) logger.error("Import failed:", error);

        // Reset the input
        event.target.value = "";
    };

    const filteredStories = stories.filter(story => {
        if (selectedSeriesFilter === "all") return true;
        if (selectedSeriesFilter === "none") return !story.seriesId;
        return story.seriesId === selectedSeriesFilter;
    });

    return (
        <div className="p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-8">Story Writing App</h1>
                    <div className="flex justify-center gap-4 mb-8">
                        <CreateStoryDialog />
                        <Button variant="outline" onClick={handleImportClick}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Story
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportStory}
                        />
                    </div>
                </div>

                {stories.length > 0 && (
                    <div className="flex justify-center">
                        <div className="flex flex-col gap-2 w-64">
                            <Label htmlFor="series-filter">Filter by Series</Label>
                            <Select value={selectedSeriesFilter} onValueChange={setSelectedSeriesFilter}>
                                <SelectTrigger id="series-filter">
                                    <SelectValue placeholder="All Stories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stories</SelectItem>
                                    <SelectItem value="none">No Series</SelectItem>
                                    {seriesList.map(series => (
                                        <SelectItem key={series.id} value={series.id}>
                                            {series.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {stories.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                        No stories yet. Create your first story to get started!
                    </div>
                ) : filteredStories.length === 0 ? (
                    <div className="text-center text-muted-foreground">No stories match the selected filter.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                        {filteredStories.map(story => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                onEdit={handleEditStory}
                                onExport={handleExportStory}
                            />
                        ))}
                    </div>
                )}

                <EditStoryDialog story={editingStory} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
            </div>
        </div>
    );
}
