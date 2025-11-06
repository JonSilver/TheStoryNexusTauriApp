import { StoryEditor } from "@/features/chapters/components/StoryEditor";
import { useChapterQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { ChapterMatchingProvider } from "@/features/lorebook/hooks/useChapterMatching";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useStoryQuery } from "@/features/stories/hooks/useStoriesQuery";
import { useEffect } from "react";
import { useParams } from "react-router";

export default function ChapterEditorPage() {
    const { storyId, chapterId } = useParams<{ storyId: string; chapterId: string }>();
    const { data: story, isLoading: storyLoading } = useStoryQuery(storyId || "");
    const { data: chapter, isLoading: chapterLoading } = useChapterQuery(chapterId || "");
    const { setCurrentStoryId, setCurrentChapterId } = useStoryContext();

    useEffect(() => {
        if (storyId) setCurrentStoryId(storyId);

        if (chapterId) setCurrentChapterId(chapterId);

        return () => {
            setCurrentChapterId(null);
        };
    }, [storyId, chapterId, setCurrentStoryId, setCurrentChapterId]);

    if (storyLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading story...</div>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Story not found</div>
            </div>
        );
    }

    if (chapterId && chapterLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading chapter...</div>
            </div>
        );
    }

    if (chapterId && !chapter) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Chapter not found</div>
            </div>
        );
    }

    return (
        <ChapterMatchingProvider>
            <div className="h-full">
                <StoryEditor />
            </div>
        </ChapterMatchingProvider>
    );
}
