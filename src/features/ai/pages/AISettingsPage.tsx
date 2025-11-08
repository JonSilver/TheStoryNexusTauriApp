import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URLS } from "@/constants/urls";
import { useAIProviderState } from "@/features/ai/hooks/useAIProviderState";
import { promptsKeys } from "@/features/prompts/hooks/usePromptsQuery";
import { cn } from "@/lib/utils";
import { parseJSON, promptsExportSchema } from "@/schemas/entities";
import { adminApi, promptsApi } from "@/services/api/client";
import { downloadDatabaseExport } from "@/services/exportDexieDatabase";
import { logger } from "@/utils/logger";
import { toastCRUD } from "@/utils/toastUtils";
import { attemptPromise } from "@jfdi/attempt";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Download, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "react-toastify";

export default function AISettingsPage() {
    const {
        providers,
        isLoading,
        initialize,
        updateApiKey,
        updateLocalApiUrl,
        saveApiKey,
        refreshModels,
        saveLocalApiUrl,
        updateDefaultModel
    } = useAIProviderState();

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [isMigrationLoading, setIsMigrationLoading] = useState(false);
    const [isImportingPrompts, setIsImportingPrompts] = useState(false);
    const [isDeletingDemo, setIsDeletingDemo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const promptsFileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        initialize();
    }, [initialize]);

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleExportDatabase = async () => {
        setIsMigrationLoading(true);
        const [error] = await attemptPromise(async () => {
            await downloadDatabaseExport();
            toast.success("Database exported successfully");
        });

        if (error) {
            logger.error("Error exporting database:", error);
            toast.error("Failed to export database");
        }
        setIsMigrationLoading(false);
    };

    const handleImportDatabase = async (file: File) => {
        if (!file) return;

        setIsMigrationLoading(true);
        const [error] = await attemptPromise(async () => {
            await adminApi.importDatabase(file);
            toast.success("Database imported successfully. Please reload the application.");
        });

        if (error) {
            logger.error("Error importing database:", error);
            toast.error("Failed to import database");
        }
        setIsMigrationLoading(false);
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleImportDatabase(file);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const findUniqueName = async (baseName: string): Promise<string> => {
        const MAX_IMPORT_ATTEMPTS = 100;

        const generateCandidateName = (attempt: number): string => {
            if (attempt === 0) return baseName;
            return `${baseName} (Imported${attempt > 1 ? ` ${attempt}` : ""})`;
        };

        const attempts = Array.from({ length: MAX_IMPORT_ATTEMPTS }, (_, i) => i);

        for (const attempt of attempts) {
            const candidateName = generateCandidateName(attempt);

            const [checkError, allPrompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

            if (checkError) {
                logger.error("Error checking for existing prompt", checkError);
                throw checkError;
            }

            const existing = allPrompts.find(p => p.name === candidateName);

            if (!existing) return candidateName;

            if (attempt === MAX_IMPORT_ATTEMPTS - 1)
                throw new Error(`Failed to generate unique name after ${MAX_IMPORT_ATTEMPTS} attempts`);
        }

        throw new Error("Failed to generate unique name");
    };

    const handleImportPrompts = async (jsonData: string) => {
        const result = parseJSON(promptsExportSchema, jsonData);
        if (!result.success) throw new Error(`Invalid prompts data: ${result.error.message}`);

        const imported = result.data.prompts;

        for (const p of imported) {
            const newName = await findUniqueName(p.name || "Imported Prompt");

            const { id: _id, createdAt: _createdAt, ...promptData } = p;

            const dataToCreate = {
                ...promptData,
                name: newName,
                isSystem: false
            };

            const [addError] = await attemptPromise(() => promptsApi.create(dataToCreate));

            if (addError) logger.error(`Failed to import prompt "${newName}"`, addError);
        }

        queryClient.invalidateQueries({ queryKey: promptsKeys.lists() });
    };

    const handlePromptsFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImportingPrompts(true);
        const [error] = await attemptPromise(async () => {
            const text = await file.text();
            await handleImportPrompts(text);
        });

        if (error) {
            logger.error("Import failed", error);
            toastCRUD.importError("prompts", error);
        } else toastCRUD.importSuccess("Prompts");

        setIsImportingPrompts(false);
        if (promptsFileInputRef.current) promptsFileInputRef.current.value = "";
    };

    const handleDeleteDemoData = async () => {
        if (
            !confirm(
                "Are you sure you want to delete all demo data? This will remove the demo story, chapters, and lorebook entries. This action cannot be undone."
            )
        ) {
            return;
        }

        setIsDeletingDemo(true);
        const [error, result] = await attemptPromise(async () => await adminApi.deleteDemoData());

        if (error) {
            logger.error("Error deleting demo data:", error);
            toast.error("Failed to delete demo data");
        } else {
            const { deleted } = result;
            toast.success(
                `Demo data deleted: ${deleted.stories} ${deleted.stories === 1 ? "story" : "stories"}, ${deleted.lorebookEntries} lorebook ${deleted.lorebookEntries === 1 ? "entry" : "entries"}`
            );
            // Invalidate all queries to refresh the UI
            queryClient.invalidateQueries();
        }

        setIsDeletingDemo(false);
    };

    return (
        <div className="p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">AI Settings</h1>

                <div className="space-y-6">
                    {/* OpenAI Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                OpenAI Configuration
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refreshModels("openai")}
                                    disabled={isLoading || !providers.openai.apiKey.trim()}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Models"}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="openai-key">OpenAI API Key</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="openai-key"
                                        type="password"
                                        placeholder="Enter your OpenAI API key"
                                        value={providers.openai.apiKey}
                                        onChange={e => updateApiKey("openai", e.target.value)}
                                    />
                                    <Button
                                        onClick={() => saveApiKey("openai", providers.openai.apiKey)}
                                        disabled={isLoading || !providers.openai.apiKey.trim()}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                    </Button>
                                </div>
                            </div>

                            {providers.openai.models.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="openai-default">Default Model</Label>
                                        <Select
                                            value={providers.openai.defaultModel || "none"}
                                            onValueChange={value =>
                                                updateDefaultModel("openai", value === "none" ? undefined : value)
                                            }
                                        >
                                            <SelectTrigger id="openai-default">
                                                <SelectValue placeholder="Select default model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {providers.openai.models.map(model => (
                                                    <SelectItem key={model.id} value={model.id}>
                                                        {model.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Select a default model for OpenAI generation
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* OpenRouter Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                OpenRouter Configuration
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refreshModels("openrouter")}
                                    disabled={isLoading || !providers.openrouter.apiKey.trim()}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Models"}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="openrouter-key"
                                        type="password"
                                        placeholder="Enter your OpenRouter API key"
                                        value={providers.openrouter.apiKey}
                                        onChange={e => updateApiKey("openrouter", e.target.value)}
                                    />
                                    <Button
                                        onClick={() => saveApiKey("openrouter", providers.openrouter.apiKey)}
                                        disabled={isLoading || !providers.openrouter.apiKey.trim()}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                    </Button>
                                </div>
                            </div>

                            {providers.openrouter.models.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="openrouter-default">Default Model</Label>
                                        <Select
                                            value={providers.openrouter.defaultModel || "none"}
                                            onValueChange={value =>
                                                updateDefaultModel("openrouter", value === "none" ? undefined : value)
                                            }
                                        >
                                            <SelectTrigger id="openrouter-default">
                                                <SelectValue placeholder="Select default model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {providers.openrouter.models.map(model => (
                                                    <SelectItem key={model.id} value={model.id}>
                                                        {model.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Select a default model for OpenRouter generation
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Local Models Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Local Models
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refreshModels("local")}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Models"}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Models from LM Studio</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => saveApiKey("local", "")}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Models"}
                                </Button>
                            </div>

                            <Collapsible
                                open={openSections.localAdvanced}
                                onOpenChange={() => toggleSection("localAdvanced")}
                            >
                                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                    <ChevronRight
                                        className={cn(
                                            "h-4 w-4 transition-transform",
                                            openSections.localAdvanced && "transform rotate-90"
                                        )}
                                    />
                                    Advanced Settings
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2 space-y-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="local-api-url">Local API URL</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="local-api-url"
                                                type="text"
                                                placeholder={API_URLS.LOCAL_AI_DEFAULT}
                                                value={providers.local.apiUrl}
                                                onChange={e => updateLocalApiUrl(e.target.value)}
                                            />
                                            <Button
                                                onClick={() => saveLocalApiUrl(providers.local.apiUrl)}
                                                disabled={isLoading || !providers.local.apiUrl.trim()}
                                            >
                                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            The URL of your local LLM server. Default is {API_URLS.LOCAL_AI_DEFAULT}
                                        </p>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            {providers.local.models.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="local-default">Default Model</Label>
                                    <Select
                                        value={providers.local.defaultModel || "none"}
                                        onValueChange={value =>
                                            updateDefaultModel("local", value === "none" ? undefined : value)
                                        }
                                    >
                                        <SelectTrigger id="local-default">
                                            <SelectValue placeholder="Select default model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {providers.local.models.map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    {model.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Select a default model for local generation
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Prompt Management Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Prompt Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Import Prompts</Label>
                                <input
                                    ref={promptsFileInputRef}
                                    type="file"
                                    accept="application/json"
                                    onChange={handlePromptsFileSelect}
                                    className="hidden"
                                />
                                <Button
                                    onClick={() => promptsFileInputRef.current?.click()}
                                    disabled={isImportingPrompts}
                                    className="w-full"
                                    variant="outline"
                                >
                                    {isImportingPrompts ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4 mr-2" />
                                    )}
                                    Import from JSON
                                </Button>
                                <p className="text-xs text-muted-foreground">Import prompts from exported JSON file</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Database Migration Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Migration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 dark:text-amber-200">
                                    <p className="font-semibold mb-1">Warning</p>
                                    <p>Import will replace all existing data. Export your current database first.</p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Export Database</Label>
                                    <Button
                                        onClick={handleExportDatabase}
                                        disabled={isMigrationLoading}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        {isMigrationLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4 mr-2" />
                                        )}
                                        Export to JSON
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Download all stories, chapters, and settings as JSON
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Import Database</Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isMigrationLoading}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        {isMigrationLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4 mr-2" />
                                        )}
                                        Import from JSON
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Restore database from exported JSON file
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delete Demo Data Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Demo Data</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800 dark:text-red-200">
                                    <p className="font-semibold mb-1">Warning</p>
                                    <p>
                                        This will permanently delete all demo content including stories, chapters, and
                                        lorebook entries marked as demo data.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Delete Demo Content</Label>
                                <Button
                                    onClick={handleDeleteDemoData}
                                    disabled={isDeletingDemo}
                                    className="w-full"
                                    variant="destructive"
                                >
                                    {isDeletingDemo ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Delete All Demo Data
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Remove the demo spy thriller story and all related content
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
