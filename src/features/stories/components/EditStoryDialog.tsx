import { useEffect, useState } from "react";
import { Story } from "@/types/story";
import { useUpdateStoryMutation } from "@/features/stories/hooks/useStoriesQuery";
import { useSeriesQuery } from "@/features/series/hooks/useSeriesQuery";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,

    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



interface EditStoryDialogProps {
    story: Story | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditStoryDialog({ story, open, onOpenChange }: EditStoryDialogProps) {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [language, setLanguage] = useState("English");
    const [synopsis, setSynopsis] = useState("");
    const [seriesId, setSeriesId] = useState<string | undefined>(undefined);
    const updateStoryMutation = useUpdateStoryMutation();
    const { data: seriesList = [] } = useSeriesQuery();

    useEffect(() => {
        if (story) {
            setTitle(story.title);
            setAuthor(story.author);
            setLanguage(story.language);
            setSynopsis(story.synopsis || "");
            setSeriesId(story.seriesId);
        }
    }, [story]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!story) return;

        updateStoryMutation.mutate({
            id: story.id,
            data: {
                title,
                author,
                language,
                synopsis,
                seriesId,
            }
        }, {
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Story</DialogTitle>
                        <DialogDescription>
                            Make changes to your story details here.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                                id="edit-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter story title"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-author">Author</Label>
                            <Input
                                id="edit-author"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Enter author name"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-language">Language</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Spanish">Spanish</SelectItem>
                                    <SelectItem value="French">French</SelectItem>
                                    <SelectItem value="German">German</SelectItem>
                                    <SelectItem value="Chinese">Chinese</SelectItem>
                                    <SelectItem value="Japanese">Japanese</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-series">Series (optional)</Label>
                            <Select
                                value={seriesId || 'none'}
                                onValueChange={(value) => setSeriesId(value === 'none' ? undefined : value)}
                            >
                                <SelectTrigger id="edit-series">
                                    <SelectValue placeholder="Select series" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {seriesList.map((series) => (
                                        <SelectItem key={series.id} value={series.id}>
                                            {series.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Assign this story to a series to share lorebook entries
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-synopsis">Synopsis</Label>
                            <Input
                                id="edit-synopsis"
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Enter a brief synopsis (optional)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 