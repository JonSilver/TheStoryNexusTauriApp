import { useEffect, useState, useRef } from 'react';
import { attemptPromise } from '@jfdi/attempt';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Loader2, Download, Upload, AlertTriangle } from "lucide-react";
import { aiService } from '@/services/ai/AIService';
import { toast } from 'react-toastify';
import { AIModel } from '@/types/story';
import { cn } from '@/lib/utils';
import { API_URLS } from '@/constants/urls';
import { logger } from '@/utils/logger';
import { downloadDatabaseExport } from '@/services/exportDexieDatabase';
import { adminApi } from '@/services/api/client';

export default function AISettingsPage() {
    const [openaiKey, setOpenaiKey] = useState('');
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [localApiUrl, setLocalApiUrl] = useState<string>(API_URLS.LOCAL_AI_DEFAULT);
    const [isLoading, setIsLoading] = useState(false);
    const [openaiModels, setOpenaiModels] = useState<AIModel[]>([]);
    const [openrouterModels, setOpenrouterModels] = useState<AIModel[]>([]);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [defaultLocalModel, setDefaultLocalModel] = useState<string | undefined>();
    const [defaultOpenAIModel, setDefaultOpenAIModel] = useState<string | undefined>();
    const [defaultOpenRouterModel, setDefaultOpenRouterModel] = useState<string | undefined>();
    const [localModels, setLocalModels] = useState<AIModel[]>([]);
    const [isMigrationLoading, setIsMigrationLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        const [error] = await attemptPromise(async () => {
            logger.info('[AISettingsPage] Initializing AI service');
            await aiService.initialize();

            // Set the keys using the new getter methods
            const openaiKey = aiService.getOpenAIKey();
            const openrouterKey = aiService.getOpenRouterKey();
            const localApiUrl = aiService.getLocalApiUrl();

            logger.info('[AISettingsPage] Retrieved API keys and URL from service');
            if (openaiKey) setOpenaiKey(openaiKey);
            if (openrouterKey) setOpenrouterKey(openrouterKey);
            if (localApiUrl) setLocalApiUrl(localApiUrl);

            logger.info('[AISettingsPage] Getting all available models');
            // Don't force refresh on initial load to avoid unnecessary API calls
            const allModels = await aiService.getAvailableModels(undefined, false);
            logger.info(`[AISettingsPage] Received ${allModels.length} total models`);

            const localModels = allModels.filter(m => m.provider === 'local');
            const openaiModels = allModels.filter(m => m.provider === 'openai');
            const openrouterModels = allModels.filter(m => m.provider === 'openrouter');

            logger.info(`[AISettingsPage] Filtered models - Local: ${localModels.length}, OpenAI: ${openaiModels.length}, OpenRouter: ${openrouterModels.length}`);

            setLocalModels(localModels);
            setOpenaiModels(openaiModels);
            setOpenrouterModels(openrouterModels);

            // Load default models
            const defaultLocal = aiService.getDefaultLocalModel();
            const defaultOpenAI = aiService.getDefaultOpenAIModel();
            const defaultOpenRouter = aiService.getDefaultOpenRouterModel();

            setDefaultLocalModel(defaultLocal);
            setDefaultOpenAIModel(defaultOpenAI);
            setDefaultOpenRouterModel(defaultOpenRouter);

            logger.info(`[AISettingsPage] Default models - Local: ${defaultLocal}, OpenAI: ${defaultOpenAI}, OpenRouter: ${defaultOpenRouter}`);
        });

        if (error) {
            logger.error('Error loading AI settings:', error);
            toast.error('Failed to load AI settings');
        }
    };

    const handleKeyUpdate = async (provider: 'openai' | 'openrouter' | 'local', key: string) => {
        if (provider !== 'local' && !key.trim()) return;

        setIsLoading(true);
        logger.info(`[AISettingsPage] Updating key for provider: ${provider}`);

        const [error] = await attemptPromise(async () => {
            await aiService.updateKey(provider, key);
            logger.info(`[AISettingsPage] Key updated for ${provider}, fetching models`);
            const models = await aiService.getAvailableModels(provider);
            logger.info(`[AISettingsPage] Received ${models.length} models for ${provider}`);

            if (provider === 'openai') {
                setOpenaiModels(models);
                setOpenSections(prev => ({ ...prev, openai: true }));
            } else if (provider === 'openrouter') {
                setOpenrouterModels(models);
                setOpenSections(prev => ({ ...prev, openrouter: true }));
            } else if (provider === 'local') {
                logger.info(`[AISettingsPage] Updating local models, received ${models.length} models`);
                setLocalModels(models);
                setOpenSections(prev => ({ ...prev, local: true }));
            }

            toast.success(`${provider === 'openai' ? 'OpenAI' : provider === 'openrouter' ? 'OpenRouter' : 'Local'} models updated successfully`);
        });

        if (error) {
            toast.error(`Failed to update ${provider} models`);
        }

        setIsLoading(false);
    };

    const handleRefreshModels = async (provider: 'openai' | 'openrouter' | 'local') => {
        setIsLoading(true);
        logger.info(`[AISettingsPage] Refreshing models for provider: ${provider}`);

        const [error] = await attemptPromise(async () => {
            // Force refresh by passing true as the second parameter
            const models = await aiService.getAvailableModels(provider, true);
            logger.info(`[AISettingsPage] Received ${models.length} models for ${provider}`);

            switch (provider) {
                case 'openai':
                    setOpenaiModels(models);
                    setOpenSections(prev => ({ ...prev, openai: true }));
                    break;
                case 'openrouter':
                    setOpenrouterModels(models);
                    setOpenSections(prev => ({ ...prev, openrouter: true }));
                    break;
                case 'local':
                    logger.info(`[AISettingsPage] Updating local models, received ${models.length} models`);
                    setLocalModels(models);
                    setOpenSections(prev => ({ ...prev, local: true }));
                    break;
            }

            toast.success(`${provider === 'openai' ? 'OpenAI' : provider === 'openrouter' ? 'OpenRouter' : 'Local'} models refreshed`);
        });

        if (error) {
            logger.error(`Error refreshing ${provider} models:`, error);
            toast.error(`Failed to refresh ${provider} models`);
        }

        setIsLoading(false);
    };

    const handleLocalApiUrlUpdate = async (url: string) => {
        if (!url.trim()) return;

        setIsLoading(true);
        logger.info(`[AISettingsPage] Updating local API URL to: ${url}`);

        const [error] = await attemptPromise(async () => {
            await aiService.updateLocalApiUrl(url);
            logger.info(`[AISettingsPage] Local API URL updated, fetching models`);
            // Force refresh by passing true as the second parameter
            const models = await aiService.getAvailableModels('local', true);
            logger.info(`[AISettingsPage] Received ${models.length} local models`);

            setLocalModels(models);
            setOpenSections(prev => ({ ...prev, local: true }));

            toast.success('Local API URL updated successfully');
        });

        if (error) {
            logger.error('Error updating local API URL:', error);
            toast.error('Failed to update local API URL');
        }

        setIsLoading(false);
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleDefaultModelChange = async (provider: 'local' | 'openai' | 'openrouter', modelId: string | undefined) => {
        const [error] = await attemptPromise(async () => {
            await aiService.updateDefaultModel(provider, modelId);

            if (provider === 'local') {
                setDefaultLocalModel(modelId);
            } else if (provider === 'openai') {
                setDefaultOpenAIModel(modelId);
            } else if (provider === 'openrouter') {
                setDefaultOpenRouterModel(modelId);
            }

            toast.success('Default model updated');
        });

        if (error) {
            logger.error('Error updating default model:', error);
            toast.error('Failed to update default model');
        }
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
        // Reset input so the same file can be selected again
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
                                    onClick={() => handleRefreshModels('openai')}
                                    disabled={isLoading || !openaiKey.trim()}
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
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                    />
                                    <Button
                                        onClick={() => handleKeyUpdate('openai', openaiKey)}
                                        disabled={isLoading || !openaiKey.trim()}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>

                            {openaiModels.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="openai-default">Default Model</Label>
                                        <Select
                                            value={defaultOpenAIModel || 'none'}
                                            onValueChange={(value) => handleDefaultModelChange('openai', value === 'none' ? undefined : value)}
                                        >
                                            <SelectTrigger id="openai-default">
                                                <SelectValue placeholder="Select default model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {openaiModels.map(model => (
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
                                    onClick={() => handleRefreshModels('openrouter')}
                                    disabled={isLoading || !openrouterKey.trim()}
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
                                        value={openrouterKey}
                                        onChange={(e) => setOpenrouterKey(e.target.value)}
                                    />
                                    <Button
                                        onClick={() => handleKeyUpdate('openrouter', openrouterKey)}
                                        disabled={isLoading || !openrouterKey.trim()}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>

                            {openrouterModels.length > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="openrouter-default">Default Model</Label>
                                        <Select
                                            value={defaultOpenRouterModel || 'none'}
                                            onValueChange={(value) => handleDefaultModelChange('openrouter', value === 'none' ? undefined : value)}
                                        >
                                            <SelectTrigger id="openrouter-default">
                                                <SelectValue placeholder="Select default model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {openrouterModels.map(model => (
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
                                    onClick={() => handleRefreshModels('local')}
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
                                    onClick={() => handleKeyUpdate('local', '')}
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
                                                value={localApiUrl}
                                                onChange={(e) => setLocalApiUrl(e.target.value)}
                                            />
                                            <Button
                                                onClick={() => handleLocalApiUrlUpdate(localApiUrl)}
                                                disabled={isLoading || !localApiUrl.trim()}
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

                            {localModels.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="local-default">Default Model</Label>
                                    <Select
                                        value={defaultLocalModel || 'none'}
                                        onValueChange={(value) => handleDefaultModelChange('local', value === 'none' ? undefined : value)}
                                    >
                                        <SelectTrigger id="local-default">
                                            <SelectValue placeholder="Select default model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {localModels.map(model => (
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