import { useStoryContext } from "@/features/stories/context/StoryContext";
import { StoriesTool } from "./tools/StoriesTool";
import { SeriesTool } from "./tools/SeriesTool";
import { EditorTool } from "./tools/EditorTool";
import { ChaptersTool } from "./tools/ChaptersTool";
import { LorebookTool } from "./tools/LorebookTool";
import { BrainstormTool } from "./tools/BrainstormTool";
import { PromptsTool } from "./tools/PromptsTool";
import { NotesTool } from "./tools/NotesTool";
import { cn } from "@/lib/utils";

// Subtle background tints for each tool
const toolTints = {
    stories: "bg-background",
    series: "bg-background",
    editor: "bg-amber-50/10 dark:bg-amber-950/5",
    chapters: "bg-blue-50/10 dark:bg-blue-950/5",
    lorebook: "bg-cyan-50/10 dark:bg-cyan-950/5",
    brainstorm: "bg-purple-50/10 dark:bg-purple-950/5",
    prompts: "bg-orange-50/10 dark:bg-orange-950/5",
    notes: "bg-green-50/10 dark:bg-green-950/5"
};

export const MainContent = () => {
    const { currentTool } = useStoryContext();

    const renderTool = () => {
        switch (currentTool) {
            case "stories":
                return <StoriesTool />;
            case "series":
                return <SeriesTool />;
            case "editor":
                return <EditorTool />;
            case "chapters":
                return <ChaptersTool />;
            case "lorebook":
                return <LorebookTool />;
            case "brainstorm":
                return <BrainstormTool />;
            case "prompts":
                return <PromptsTool />;
            case "notes":
                return <NotesTool />;
            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Unknown tool: {currentTool}</p>
                    </div>
                );
        }
    };

    return <div className={cn("h-full transition-colors duration-300", toolTints[currentTool])}>{renderTool()}</div>;
};
