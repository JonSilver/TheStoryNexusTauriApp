import { useEffect } from "react";
import { useParams } from "react-router";
import { useStoryQuery } from "@/features/stories/hooks/useStoriesQuery";
import { useChapterQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { useLorebookContext } from "@/features/lorebook/context/LorebookContext";
import { StoryEditor } from "@/features/chapters/components/StoryEditor";

export default function ChapterEditorPage() {
    const { storyId, chapterId } = useParams<{ storyId: string; chapterId: string }>();
    const { data: story, isLoading: storyLoading } = useStoryQuery(storyId || "");
    const { data: chapter, isLoading: chapterLoading } = useChapterQuery(chapterId || "");
    const { entries } = useLorebookContext();
    const { buildTagMap } = useLorebookStore();
    const { setCurrentStoryId, setCurrentChapterId } = useStoryContext();

    useEffect(() => {
        if (storyId) {
            setCurrentStoryId(storyId);
        }
        if (chapterId) {
            setCurrentChapterId(chapterId);
        }
        // Build tag map when entries are available
        if (entries.length > 0) {
            buildTagMap(entries);
        }

        return () => {
            setCurrentChapterId(null);
        };
    }, [storyId, chapterId, entries, setCurrentStoryId, setCurrentChapterId, buildTagMap]);

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
        <div className="h-full">
            <StoryEditor />
        </div>
    );
} 