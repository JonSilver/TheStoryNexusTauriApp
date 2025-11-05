import { useEffect, useState, useRef } from 'react';
import { attemptPromise } from '@jfdi/attempt';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';
import { API_URLS } from '@/constants/urls';
import { logger } from '@/utils/logger';
import { downloadDatabaseExport } from '@/services/exportDexieDatabase';
import { adminApi } from '@/services/api/client';
import { useAIProviderState } from '@/features/ai/hooks/useAIProviderState';

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
        updateDefaultModel,
    } = useAIProviderState();

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [isMigrationLoading, setIsMigrationLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            toast.success('Database exported successfully');
        });

        if (error) {
            logger.error('Error exporting database:', error);
            toast.error('Failed to export database');
        }
        setIsMigrationLoading(false);
    };

    const handleImportDatabase = async (file: File) => {
        if (!file) return;

        setIsMigrationLoading(true);
        const [error] = await attemptPromise(async () => {
            await adminApi.importDatabase(file);
            toast.success('Database imported successfully. Please reload the application.');
        });

        if (error) {
            logger.error('Error importing database:', error);
            toast.error('Failed to import database');
        }
        setIsMigrationLoading(false);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImportDatabase(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                                    onClick={() => refreshModels('openai')}
                                    disabled={isLoading || !providers.openai.apiKey.trim()}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Models'}
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
                                        onChange={(e) => updateApiKey('openai', e.target.value)}
                                    />
                                    <Button
                                        onClick={() => saveApiKey('openai', providers.openai.apiKey)}
                                        disabled={isLoading || !providers.openai.apiKey.trim()}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>

                            {providers.openai.models.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="openai-default">Default Model</Label>
                                        <Select
                                            value={providers.openai.defaultModel || 'none'}
                                            onValueChange={(value) => updateDefaultModel('openai', value === 'none' ? undefined : value)}
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
                                    onClick={() => refreshModels('openrouter')}
                                    disabled={isLoading || !providers.openrouter.apiKey.trim()}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Models'}
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
                                        onChange={(e) => updateApiKey('openrouter', e.target.value)}
                                    />
                                    <Button
                                        onClick={() => saveApiKey('openrouter', providers.openrouter.apiKey)}
                                        disabled={isLoading || !providers.openrouter.apiKey.trim()}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>

                            {providers.openrouter.models.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="openrouter-default">Default Model</Label>
                                        <Select
                                            value={providers.openrouter.defaultModel || 'none'}
                                            onValueChange={(value) => updateDefaultModel('openrouter', value === 'none' ? undefined : value)}
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
                                    onClick={() => refreshModels('local')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Models'}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Models from LM Studio</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => saveApiKey('local', '')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Models'}
                                </Button>
                            </div>

                            <Collapsible
                                open={openSections.localAdvanced}
                                onOpenChange={() => toggleSection('localAdvanced')}
                            >
                                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                    <ChevronRight className={cn(
                                        "h-4 w-4 transition-transform",
                                        openSections.localAdvanced && "transform rotate-90"
                                    )} />
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
                                                onChange={(e) => updateLocalApiUrl(e.target.value)}
                                            />
                                            <Button
                                                onClick={() => saveLocalApiUrl(providers.local.apiUrl)}
                                                disabled={isLoading || !providers.local.apiUrl.trim()}
                                            >
                                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
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
                                        value={providers.local.defaultModel || 'none'}
                                        onValueChange={(value) => updateDefaultModel('local', value === 'none' ? undefined : value)}
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
                </div>
            </div>
        </div>
    );
} 