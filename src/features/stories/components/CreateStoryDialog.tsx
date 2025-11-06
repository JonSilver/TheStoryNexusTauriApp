import { useState } from "react";
import { useCreateStoryMutation } from "@/features/stories/hooks/useStoriesQuery";
import { useSeriesQuery } from "@/features/series/hooks/useSeriesQuery";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";


export function CreateStoryDialog() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [language, setLanguage] = useState("English");
    const [synopsis, setSynopsis] = useState("");
    const [seriesId, setSeriesId] = useState<string | undefined>(undefined);
    const createStoryMutation = useCreateStoryMutation();
    const { data: seriesList = [] } = useSeriesQuery();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        createStoryMutation.mutate({
            id: crypto.randomUUID(),
            title,
            author,
            language,
            synopsis,
            seriesId,
        }, {
            onSuccess: () => {
                setOpen(false);
                // Reset form
                setTitle("");
                setAuthor("");
                setLanguage("English");
                setSynopsis("");
                setSeriesId(undefined);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-64">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New Story
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Story</DialogTitle>
                        <DialogDescription>
                            Fill in the details for your new story. You can edit these later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter story title"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="author">Author</Label>
                            <Input
                                id="author"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Enter author name"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="language">Language</Label>
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
                            <Label htmlFor="series">Series (optional)</Label>
                            <Select
                                value={seriesId || 'none'}
                                onValueChange={(value) => setSeriesId(value === 'none' ? undefined : value)}
                            >
                                <SelectTrigger id="series">
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
                            <Label htmlFor="synopsis">Synopsis</Label>
                            <Input
                                id="synopsis"
                                value={synopsis}
                                onChange={(e) => setSynopsis(e.target.value)}
                                placeholder="Enter a brief synopsis (optional)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Create Story</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 