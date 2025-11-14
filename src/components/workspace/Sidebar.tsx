import {
    Library,
    Layers,
    FileEdit,
    List,
    BookOpen,
    MessageSquare,
    FileText,
    StickyNote,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useStoryContext, WorkspaceTool } from "@/features/stories/context/StoryContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tools = [
    { id: "stories" as WorkspaceTool, label: "Stories", icon: Library, requiresStory: false },
    { id: "series" as WorkspaceTool, label: "Series", icon: Layers, requiresStory: false },
    { id: "editor" as WorkspaceTool, label: "Editor", icon: FileEdit, requiresStory: true },
    { id: "chapters" as WorkspaceTool, label: "Chapters", icon: List, requiresStory: true },
    { id: "lorebook" as WorkspaceTool, label: "Lorebook", icon: BookOpen, requiresStory: true },
    { id: "brainstorm" as WorkspaceTool, label: "Brainstorm", icon: MessageSquare, requiresStory: true },
    { id: "prompts" as WorkspaceTool, label: "Prompts", icon: FileText, requiresStory: true },
    { id: "notes" as WorkspaceTool, label: "Notes", icon: StickyNote, requiresStory: true }
];

export const Sidebar = () => {
    const { currentTool, setCurrentTool, currentStoryId } = useStoryContext();
    const [collapsed, setCollapsed] = useState(false);

    const handleToolClick = (toolId: WorkspaceTool, requiresStory: boolean) => {
        if (requiresStory && !currentStoryId) {
            // Could show toast: "Select a story first"
            return;
        }
        setCurrentTool(toolId);
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden md:flex flex-col border-r bg-muted/30 transition-all duration-300",
                    collapsed ? "w-16" : "w-56"
                )}
            >
                {/* Tools */}
                <nav className="flex-1 p-2 space-y-1">
                    {tools.map(tool => {
                        const Icon = tool.icon;
                        const isActive = currentTool === tool.id;
                        const isDisabled = tool.requiresStory && !currentStoryId;

                        return (
                            <Button
                                key={tool.id}
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-3",
                                    isDisabled && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => handleToolClick(tool.id, tool.requiresStory)}
                                disabled={isDisabled}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span>{tool.label}</span>}
                            </Button>
                        );
                    })}
                </nav>

                {/* Collapse Toggle */}
                <div className="p-2 border-t">
                    <Button variant="ghost" size="icon" className="w-full" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>
            </aside>

            {/* Mobile Bottom Toolbar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50">
                <div className="flex justify-around p-2">
                    {tools.map(tool => {
                        const Icon = tool.icon;
                        const isActive = currentTool === tool.id;
                        const isDisabled = tool.requiresStory && !currentStoryId;

                        return (
                            <Button
                                key={tool.id}
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "flex-col h-auto py-2 px-3 gap-1",
                                    isDisabled && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => handleToolClick(tool.id, tool.requiresStory)}
                                disabled={isDisabled}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="text-xs">{tool.label}</span>
                            </Button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
};
