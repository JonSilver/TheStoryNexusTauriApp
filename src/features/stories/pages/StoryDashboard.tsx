import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/urls";
import { useChaptersByStoryQuery } from "@/features/chapters/hooks/useChaptersQuery";
import { LorebookProvider } from "@/features/lorebook/context/LorebookContext";
import { useStoryQuery } from "@/features/stories/hooks/useStoriesQuery";
import { cn } from "@/lib/utils";
import { parseLocalStorage } from "@/schemas/entities";
import {
    Book,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Home,
    MessageSquare,
    PenLine,
    Sliders,
    Sparkles,
    StickyNote
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router";
import { z } from "zod";

export default function StoryDashboard() {
    const { storyId } = useParams();
    useStoryQuery(storyId || "");
    const { data: chapters = [] } = useChaptersByStoryQuery(storyId || "");
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(() => parseLocalStorage(z.boolean(), "nav-expanded", false));

    // Get last edited chapter ID from localStorage
    const lastEditedChapterId = storyId ? localStorage.getItem(`lastEditedChapter_${storyId}`) : null;
    const lastEditedChapterExists = lastEditedChapterId && chapters.some(chapter => chapter.id === lastEditedChapterId);

    // Save navigation state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem("nav-expanded", JSON.stringify(isExpanded));
    }, [isExpanded]);

    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    const isActive = (path: string) => {
        const currentPath = location.pathname.replace(/\/$/, "");
        const targetPath = path.replace(/\/$/, "");
        if (currentPath.includes("/write") && targetPath.includes("/chapters")) return true;

        return currentPath === targetPath;
    };

    const navButton = (icon: ReactNode, to: string, label: string) => (
        <Button
            variant="ghost"
            size={isExpanded ? "default" : "icon"}
            className={cn(
                "relative group hover:bg-accent hover:text-accent-foreground transition-all",
                isExpanded ? "justify-start w-full px-3" : "h-9 w-9",
                isActive(to) && "bg-accent text-accent-foreground"
            )}
            asChild
        >
            <Link to={to}>
                <div className="flex items-center">
                    {icon}
                    {isExpanded ? (
                        <span className="ml-2">{label}</span>
                    ) : (
                        <>
                            <span className="sr-only">{label}</span>
                            <span className="absolute left-12 px-2 py-1 ml-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 bg-popover text-popover-foreground rounded shadow-md transition-opacity">
                                {label}
                            </span>
                        </>
                    )}
                </div>
            </Link>
        </Button>
    );

    return (
        <div className="h-screen flex bg-background">
            {/* Fixed Navigation Sidebar */}
            <div
                className={cn(
                    "border-r bg-muted/50 flex flex-col py-4 fixed h-screen transition-all duration-300 ease-in-out",
                    isExpanded ? "w-[150px]" : "w-12"
                )}
            >
                {/* Toggle Button */}
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="self-end mb-4 mr-1">
                    {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                {/* Top Navigation Icons */}
                <div className={cn("flex-1 flex flex-col space-y-4", isExpanded ? "items-start px-2" : "items-center")}>
                    {storyId && (
                        <>
                            {navButton(
                                <BookOpen className="h-5 w-5" />,
                                ROUTES.DASHBOARD.CHAPTERS(storyId),
                                "Chapters"
                            )}
                            {lastEditedChapterId &&
                                lastEditedChapterExists &&
                                navButton(
                                    <PenLine className="h-5 w-5" />,
                                    ROUTES.DASHBOARD.CHAPTER_EDITOR(storyId, lastEditedChapterId),
                                    "Last Edited"
                                )}
                            {navButton(<Book className="h-5 w-5" />, ROUTES.DASHBOARD.LOREBOOK(storyId), "Lorebook")}
                            {navButton(<Sparkles className="h-5 w-5" />, ROUTES.DASHBOARD.PROMPTS(storyId), "Prompts")}
                            {navButton(
                                <MessageSquare className="h-5 w-5" />,
                                ROUTES.DASHBOARD.BRAINSTORM(storyId),
                                "Brainstorm"
                            )}
                            {navButton(<StickyNote className="h-5 w-5" />, ROUTES.DASHBOARD.NOTES(storyId), "Notes")}
                        </>
                    )}
                </div>

                {/* Bottom Navigation */}
                <div className={cn("flex flex-col space-y-4 pb-4", isExpanded ? "items-start px-2" : "items-center")}>
                    <ThemeToggle isExpanded={isExpanded} />
                    {navButton(<Home className="h-5 w-5" />, "/stories", "Stories")}
                    {navButton(<Sliders className="h-5 w-5" />, "/ai-settings", "AI Settings")}
                </div>
            </div>

            {/* Main Content Area */}
            <div className={cn("flex-1 transition-all duration-300 ease-in-out", isExpanded ? "ml-[150px]" : "ml-12")}>
                <LorebookProvider storyId={storyId || ""}>
                    <Outlet />
                </LorebookProvider>
            </div>
        </div>
    );
}
