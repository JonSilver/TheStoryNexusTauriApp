import { useEffect } from "react";
import { useParams } from "react-router";
import { useStoryQuery } from "@/features/stories/hooks/useStoriesQuery";
import { useChapterQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { useStoryContext } from "@/features/stories/context/StoryContext";
import { useLorebookStore } from "@/features/lorebook/stores/useLorebookStore";
import { StoryEditor } from "@/features/chapters/components/StoryEditor";

export default function ChapterEditorPage() {
    const { storyId, chapterId } = useParams<{ storyId: string; chapterId: string }>();
    const { data: story, isLoading: storyLoading } = useStoryQuery(storyId || "");
    const { data: chapter, isLoading: chapterLoading } = useChapterQuery(chapterId || "");
    const { loadEntries, buildTagMap } = useLorebookStore();
    const { setCurrentStoryId, setCurrentChapterId } = useStoryContext();

    useEffect(() => {
        if (storyId) {
            setCurrentStoryId(storyId);
            // Initialize lorebook data
            loadEntries(storyId).then(() => {
                buildTagMap();
            });
        }
        if (chapterId) {
            setCurrentChapterId(chapterId);
        }

        return () => {
            setCurrentChapterId(null);
        };
    }, [storyId, chapterId, setCurrentStoryId, setCurrentChapterId, loadEntries, buildTagMap]);

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