import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useChaptersByStoryQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { Chapter } from "@/types/story";

export const ChapterSwitcher = () => {
    const { currentStoryId, currentChapterId, setCurrentChapterId } = useStoryContext();
    const { data: chapters = [] } = useChaptersByStoryQuery(currentStoryId || "");

    const currentChapter = chapters.find((c: Chapter) => c.id === currentChapterId);

    if (!currentStoryId || !currentChapterId || chapters.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" size="sm">
                    {currentChapter?.title || "Chapter"}
                    <span className="text-muted-foreground">▾</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
                {chapters.map((chapter: Chapter) => (
                    <DropdownMenuItem
                        key={chapter.id}
                        onClick={() => setCurrentChapterId(chapter.id)}
                        className={chapter.id === currentChapterId ? "bg-accent" : ""}
                    >
                        <div className="flex flex-col">
                            <span>{chapter.title}</span>
                            {chapter.wordCount && (
                                <span className="text-xs text-muted-foreground">{chapter.wordCount} words</span>
                            )}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
