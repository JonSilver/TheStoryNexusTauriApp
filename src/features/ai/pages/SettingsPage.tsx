import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URLS } from "@/constants/urls";
import { useAIProviderState } from "@/features/ai/hooks/useAIProviderState";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services/api/client";
import { logger } from "@/utils/logger";
import { attemptPromise } from "@jfdi/attempt";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";

export default function SettingsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
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
    const [isDeletingDemo, setIsDeletingDemo] = useState(false);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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
                <div className="flex items-center mb-8">
                    <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold ml-4">Settings</h1>
                </div>

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
