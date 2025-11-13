import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";

export const Workspace = () => (
    <div className="min-h-screen flex flex-col bg-background">
        {/* Top Bar */}
        <TopBar />

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-auto pb-16 md:pb-0">
                <MainContent />
            </main>
        </div>
    </div>
);
