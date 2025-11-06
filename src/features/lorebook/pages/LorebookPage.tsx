import { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
    useGlobalLorebookQuery,
    useSeriesLorebookQuery,
    useStoryLorebookQuery,
    useHierarchicalLorebookQuery,
    lorebookKeys,
} from "../hooks/useLorebookQuery";
import { CreateEntryDialog } from "../components/CreateEntryDialog";
import { LorebookEntryList } from "../components/LorebookEntryList";
import { LevelScopeSelector } from "../components/LevelScopeSelector";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";
import { attempt, attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';
import { LorebookImportExportService } from '../stores/LorebookImportExportService';
import { useQueryClient } from '@tanstack/react-query';
import type { LorebookLevel, LorebookEntry } from '@/types/story';

type LorebookCategory = LorebookEntry['category'];

const CATEGORIES: LorebookCategory[] = [
    'character',
    'location',
    'item',
    'event',
    'note',
    'synopsis',
    'starting scenario',
    'timeline',
];

export default function LorebookPage() {
    // Check if coming from story route (shortcut)
    const { storyId } = useParams<{ storyId?: string }>();
    const queryClient = useQueryClient();

    // State for level/scope selection
    const [level, setLevel] = useState<LorebookLevel>(storyId ? 'story' : 'global');
    const [scopeId, setScopeId] = useState<string | undefined>(storyId);
    const [selectedCategory, setSelectedCategory] = useState<LorebookCategory>('character');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // When story route changes, update state
    useEffect(() => {
        if (storyId) {
            setLevel('story');
            setScopeId(storyId);
        }
    }, [storyId]);

    // Fetch appropriate entries based on level/scope
    const { data: globalEntries, isLoading: globalLoading, error: globalError } = useGlobalLorebookQuery();
    const { data: seriesEntries, isLoading: seriesLoading, error: seriesError } = useSeriesLorebookQuery(
        level === 'series' ? scopeId : undefined
    );
    const { data: storyEntries, isLoading: storyLoading, error: storyError } = useStoryLorebookQuery(
        level === 'story' && !storyId ? scopeId : undefined
    );
    const { data: hierarchicalEntries, isLoading: hierarchicalLoading, error: hierarchicalError } = useHierarchicalLorebookQuery(
        level === 'story' && storyId ? scopeId : undefined
    );

    // Determine which entries to display
    let entries: LorebookEntry[] = [];
    let isLoading = false;
    let error = null;

    if (level === 'global') {
        entries = globalEntries || [];
        isLoading = globalLoading;
        error = globalError;
    } else if (level === 'series') {
        entries = seriesEntries || [];
        isLoading = seriesLoading;
        error = seriesError;
    } else if (level === 'story' && storyId) {
        entries = hierarchicalEntries || [];
        isLoading = hierarchicalLoading;
        error = hierarchicalError;
    } else if (level === 'story' && !storyId) {
        entries = storyEntries || [];
        isLoading = storyLoading;
        error = storyError;
    }

    // Filter by category
    const entriesByCategory = entries.filter((e) => e.category === selectedCategory);

    // Calculate category counts from the current entries
    const categoryCounts = entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
    }, {} as Record<LorebookCategory, number>);

    // Handler for level change
    const handleLevelChange = (newLevel: LorebookLevel) => {
        setLevel(newLevel);
        setScopeId(undefined); // Reset scope when level changes
    };

    // Handle export functionality
    const handleExport = async () => {
        if (storyId) {
            const [error] = attempt(() => LorebookImportExportService.exportEntries(entries, storyId));
            if (error) {
                logger.error("Export failed:", error);
                toast.error("Failed to export lorebook entries");
                return;
            }
            toast.success("Lorebook entries exported successfully");
        } else if (level === 'global') {
            const [error, exportData] = await attemptPromise(async () => {
                const { lorebookApi } = await import('@/services/api/client');
                return lorebookApi.exportGlobal();
            });
            if (error) {
                logger.error("Export failed:", error);
                toast.error("Failed to export global lorebook");
                return;
            }
            const { downloadJSON } = await import('@/utils/jsonExportUtils');
            downloadJSON(exportData, `global-lorebook-${Date.now()}.json`);
            toast.success("Global lorebook exported successfully");
        }
    };

    // Handle import functionality
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];

        if (storyId) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const [error] = await attemptPromise(async () => {
                    const content = e.target?.result as string;
                    await LorebookImportExportService.importEntries(content, storyId, () => {
                        queryClient.invalidateQueries({ queryKey: lorebookKeys.byStory(storyId) });
                    });
                });
                if (error) {
                    logger.error("Import failed:", error);
                    toast.error("Failed to import lorebook entries");
                    return;
                }
                toast.success("Lorebook entries imported successfully");
            };
            reader.readAsText(file);
        } else if (level === 'global') {
            const [error] = await attemptPromise(async () => {
                const { lorebookApi } = await import('@/services/api/client');
                await lorebookApi.importGlobal(file);
                queryClient.invalidateQueries({ queryKey: lorebookKeys.global() });
            });
            if (error) {
                logger.error("Import failed:", error);
                toast.error("Failed to import global lorebook");
                return;
            }
            toast.success("Global lorebook imported successfully");
        }

        // Reset the input
        event.target.value = '';
    };

    if (error) {
        return (
            <div className="p-4">
                <p className="text-destructive">Error loading lorebook: {error.message}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">
                        {storyId ? 'Story Lorebook' : 'Lorebook Manager'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {storyId
                            ? "View and manage entries for this story (includes inherited entries)"
                            : "Manage global, series, and story-level lorebook entries"}
                    </p>
                </div>
                <div className="flex gap-2">
                    {(storyId || level === 'global') && (
                        <>
                            <Button variant="outline" onClick={handleExport} className="border-2 border-gray-300 dark:border-gray-700">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <label htmlFor="import-lorebook">
                                <Button variant="outline" asChild className="border-2 border-gray-300 dark:border-gray-700">
                                    <div>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Import
                                    </div>
                                </Button>
                            </label>
                            <input
                                id="import-lorebook"
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleImport}
                            />
                        </>
                    )}
                    <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        disabled={level !== 'global' && !scopeId}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Entry
                    </Button>
                </div>
            </div>

            <Separator className="bg-gray-300 dark:bg-gray-700" />

            {/* Level/Scope Selector - only show in main manager mode */}
            {!storyId && (
                <div className="p-4 bg-muted rounded-lg">
                    <LevelScopeSelector
                        level={level}
                        onLevelChange={handleLevelChange}
                        scopeId={scopeId}
                        onScopeIdChange={setScopeId}
                    />
                </div>
            )}

            {/* Show info message if scope not selected */}
            {level !== 'global' && !scopeId && (
                <div className="text-center text-muted-foreground py-12">
                    Please select a {level} to view its lorebook entries
                </div>
            )}

            {/* Category tabs and entry list */}
            {(level === 'global' || scopeId) && (
                <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as LorebookCategory)} className="w-full">
                    <TabsList className="w-full justify-start bg-gray-100 dark:bg-gray-800 p-1 border border-gray-300 dark:border-gray-700 flex-wrap">
                        {CATEGORIES.map((cat) => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({categoryCounts[cat] || 0})
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {CATEGORIES.map((cat) => (
                        <TabsContent key={cat} value={cat} className="mt-6">
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                </div>
                            ) : entriesByCategory.length > 0 ? (
                                <LorebookEntryList
                                    entries={entriesByCategory}
                                    editable={!storyId}
                                    showLevel={!!storyId}
                                    editableFilter={storyId ? (entry) => entry.level === 'story' && entry.scopeId === storyId : undefined}
                                />
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    No {cat} entries yet
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            {/* Create dialog */}
            <CreateEntryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                storyId={scopeId}
                level={level}
                scopeId={scopeId}
                defaultCategory={selectedCategory}
            />
        </div>
    );
} 