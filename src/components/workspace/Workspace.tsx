import { useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { CommandPalette } from "./CommandPalette";
import { useWorkspaceShortcuts } from "./hooks/useWorkspaceShortcuts";

export const Workspace = () => {
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // Register all workspace keyboard shortcuts
    useWorkspaceShortcuts({
        onOpenCommandPalette: () => setCommandPaletteOpen(true)
    });

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Top Bar */}
            <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 overflow-auto pb-16 md:pb-0">
                    <MainContent />
                </main>
            </div>

            {/* Command Palette */}
            <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        </div>
    );
};
