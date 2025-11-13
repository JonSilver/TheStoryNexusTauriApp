import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "./lib/theme-provider";
import { ToastContainer } from "react-toastify";
import { StoryProvider } from "@/features/stories/context/StoryContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { QueryProvider } from "@/providers/QueryProvider";
import { Workspace } from "./components/workspace/Workspace";
// Styles
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

// Eagerly loaded pages (for fast initial navigation)
import Home from "./features/stories/pages/Home";
import { MainLayout } from "./components/MainLayout";

// Lazy loaded pages (code splitting for large features)
const StoryDashboard = lazy(() => import("./features/stories/pages/StoryDashboard"));
const Chapters = lazy(() => import("./features/chapters/pages/Chapters"));
const ChapterEditorPage = lazy(() => import("./features/chapters/pages/ChapterEditorPage"));
const PromptsPage = lazy(() => import("./features/prompts/pages/PromptsPage"));
const AISettingsPage = lazy(() => import("./features/ai/pages/AISettingsPage"));
const LorebookPage = lazy(() => import("./features/lorebook/pages/LorebookPage"));
const BrainstormPage = lazy(() => import("./features/brainstorm/pages/BrainstormPage"));
const GuidePage = lazy(() => import("./features/guide/pages/GuidePage"));
const NotesPage = lazy(() => import("./features/notes/pages/NotesPage"));
const SeriesListPage = lazy(() => import("./features/series/pages/SeriesListPage"));
const SeriesDashboard = lazy(() => import("./features/series/pages/SeriesDashboard"));

// Loading fallback component
const PageLoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
);
// biome-ignore lint/style/noNonNullAssertion: <explanation>

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <QueryProvider>
                <ThemeProvider defaultTheme="dark" storageKey="app-theme">
                    <BrowserRouter>
                        <StoryProvider>
                            <Suspense fallback={<PageLoadingFallback />}>
                                <Routes>
                                    {/* NEW: Workspace at root */}
                                    <Route path="/" element={<Workspace />} />

                                    {/* OLD ROUTES - Keep for now, will be removed in #02-#08 */}

                                    {/* Routes with MainLayout */}
                                    <Route element={<MainLayout />}>
                                        {/* Stories section */}
                                        <Route path="/stories" element={<Home />} />
                                        {/* Series section */}
                                        <Route path="/series" element={<SeriesListPage />} />
                                        <Route path="/series/:seriesId" element={<SeriesDashboard />} />
                                        <Route path="/series/:seriesId/lorebook" element={<LorebookPage />} />
                                        {/* AI Settings */}
                                        <Route path="/ai-settings" element={<AISettingsPage />} />
                                        {/* Guide */}
                                        <Route path="/guide" element={<GuidePage />} />
                                    </Route>

                                    {/* Story Dashboard */}
                                    <Route path="/dashboard/:storyId" element={<StoryDashboard />}>
                                        <Route path="chapters" element={<Chapters />} />
                                        <Route path="chapters/:chapterId" element={<ChapterEditorPage />} />
                                        <Route path="prompts" element={<PromptsPage />} />
                                        <Route path="lorebook" element={<LorebookPage />} />
                                        <Route path="brainstorm" element={<BrainstormPage />} />
                                        <Route path="notes" element={<NotesPage />} />
                                    </Route>
                                </Routes>
                            </Suspense>
                        </StoryProvider>
                        <ToastContainer />
                    </BrowserRouter>
                </ThemeProvider>
            </QueryProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
