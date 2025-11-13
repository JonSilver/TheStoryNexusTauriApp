import { useStoryContext } from "@/features/stories/context/StoryContext";
import { StoriesTool } from "./tools/StoriesTool";
import { EditorTool } from "./tools/EditorTool";
import { ChaptersTool } from "./tools/ChaptersTool";
import { LorebookTool } from "./tools/LorebookTool";
import { BrainstormTool } from "./tools/BrainstormTool";
import { PromptsTool } from "./tools/PromptsTool";
import { NotesTool } from "./tools/NotesTool";

export const MainContent = () => {
    const { currentTool } = useStoryContext();

    // Render tool based on currentTool
    switch (currentTool) {
        case "stories":
            return <StoriesTool />;

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
