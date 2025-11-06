import { Story } from "@/types/story";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Edit, Trash2, FolderUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useDeleteStoryMutation } from "@/features/stories/hooks/useStoriesQuery";
import { DownloadMenu } from "@/components/ui/DownloadMenu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTES } from "@/constants/urls";

interface StoryCardProps {
    story: Story;
    onEdit: (story: Story) => void;
    onExport: (story: Story) => void;
}

export function StoryCard({ story, onEdit, onExport }: StoryCardProps) {
    const deleteStoryMutation = useDeleteStoryMutation();
    const navigate = useNavigate();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this story?")) {
            deleteStoryMutation.mutate(story.id);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(story);
    };

    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        onExport(story);
    };

    const handleCardClick = () => {
        navigate(ROUTES.DASHBOARD.CHAPTERS(story.id));
    };

    return (
        <Card className="w-full cursor-pointer border-2 border-gray-300 dark:border-gray-700 hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm" onClick={handleCardClick}>
            <CardHeader>
                <CardTitle>{story.title}</CardTitle>
                <CardDescription>By {story.author}</CardDescription>
            </CardHeader>
            <CardContent>
                {story.synopsis && <p className="text-sm text-muted-foreground">{story.synopsis}</p>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <DownloadMenu type="story" id={story.id} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Download options</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleEdit}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Edit story details</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleExport}>
                                <FolderUp className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Export story as JSON</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Delete story</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardFooter>
        </Card>
    );
} 