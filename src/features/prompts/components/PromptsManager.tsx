import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PromptForm } from './PromptForm';
import { PromptsList } from './PromptList';
import { Plus, RefreshCw } from 'lucide-react';
import { Upload, Download } from 'lucide-react';
import type { Prompt } from '@/types/story';
import { cn } from '@/lib/utils';
import { toastCRUD } from '@/utils/toastUtils';
import { dbSeeder } from '@/services/dbSeed';
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';
import { promptsApi } from '@/services/api/client';
import { downloadJSONDataURI, generateExportFilename } from '@/utils/jsonExportUtils';
import { promptsExportSchema, parseJSON } from '@/schemas/entities';
import { useQueryClient } from '@tanstack/react-query';
import { promptsKeys } from '../hooks/usePromptsQuery';

export function PromptsManager() {
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
    const [isCreating, setIsCreating] = useState(false);
    const [showMobileForm, setShowMobileForm] = useState(false);
    const [isReseeding, setIsReseeding] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const queryClient = useQueryClient();

    const handleNewPrompt = () => {
        setSelectedPrompt(undefined);
        setIsCreating(true);
        setShowMobileForm(true);
    };

    const handlePromptSelect = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsCreating(false);
        setShowMobileForm(true);
    };


    const handleSave = () => {
        setShowMobileForm(false);
    };

    const handlePromptDelete = (promptId: string) => {
        if (selectedPrompt?.id === promptId) {
            setSelectedPrompt(undefined);
            setIsCreating(false);
        }
    };

    const handleExportPrompts = async () => {
        const [error, allPrompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (error) {
            logger.error('Export failed', error);
            toastCRUD.exportError('prompts', error);
            return;
        }

        // Only export non-system prompts
        const prompts = allPrompts.filter(p => !p.isSystem);

        const exportData = {
            version: '1.0',
            type: 'prompts',
            prompts
        };

        const filename = generateExportFilename('prompts-export');
        downloadJSONDataURI(exportData, filename);
        toastCRUD.exportSuccess('Prompts');
    };

    const findUniqueName = async (baseName: string): Promise<string> => {
        const MAX_IMPORT_ATTEMPTS = 100;

        const generateCandidateName = (attempt: number): string => {
            if (attempt === 0) return baseName;
            return `${baseName} (Imported${attempt > 1 ? ` ${attempt}` : ''})`;
        };

        const attempts = Array.from({ length: MAX_IMPORT_ATTEMPTS }, (_, i) => i);

        for (const attempt of attempts) {
            const candidateName = generateCandidateName(attempt);

            const [checkError, allPrompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

            if (checkError) {
                logger.error('Error checking for existing prompt', checkError);
                throw checkError;
            }

            const existing = allPrompts.find(p => p.name === candidateName);

            if (!existing) {
                return candidateName;
            }

            if (attempt === MAX_IMPORT_ATTEMPTS - 1) {
                throw new Error(`Failed to generate unique name after ${MAX_IMPORT_ATTEMPTS} attempts`);
            }
        }

        throw new Error('Failed to generate unique name');
    };

    const handleImportPrompts = async (jsonData: string) => {
        const result = parseJSON(promptsExportSchema, jsonData);
        if (!result.success) {
            throw new Error(`Invalid prompts data: ${result.error.message}`);
        }

        const imported: Prompt[] = result.data.prompts;

        for (const p of imported) {
            const newName = await findUniqueName(p.name || 'Imported Prompt');

            const { id: _id, createdAt: _createdAt, ...promptData } = p;

            const dataToCreate = {
                ...promptData,
                name: newName,
                isSystem: false
            };

            const [addError] = await attemptPromise(() => promptsApi.create(dataToCreate));

            if (addError) {
                logger.error(`Failed to import prompt "${newName}"`, addError);
            }
        }

        queryClient.invalidateQueries({ queryKey: promptsKeys.lists() });
    };

    const handleReseedSystemPrompts = async () => {
        setIsReseeding(true);
        const [error] = await attemptPromise(async () => {
            await dbSeeder.forceReseedSystemPrompts();
            queryClient.invalidateQueries({ queryKey: promptsKeys.lists() });
        });
        if (error) {
            toastCRUD.generic.error('Failed to reseed system prompts', error);
            logger.error('Error reseeding system prompts:', error);
        } else {
            toastCRUD.generic.success('System prompts reseeded successfully');
        }
        setIsReseeding(false);
    };

    return (
        <div className="flex h-full">
            {/* Left panel - Fixed Sidebar */}
            <div className={cn(
                "fixed w-[300px] h-screen border-r border-input bg-muted flex flex-col",
                showMobileForm ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-input">
                    <div className="flex gap-2">
                        <Button
                            onClick={handleNewPrompt}
                            className="flex-1 flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            New Prompt
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={async () => {
                                const [error] = await attemptPromise(async () => handleExportPrompts());
                                if (error) {
                                    logger.error('Export failed', error);
                                    toastCRUD.exportError('prompts', error);
                                }
                            }}
                            title="Export prompts"
                        >
                            <Upload className="h-4 w-4" />
                        </Button>

                        <input
                            type="file"
                            accept="application/json"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsImporting(true);
                                const [error] = await attemptPromise(async () => {
                                    const text = await file.text();
                                    await handleImportPrompts(text);
                                });
                                if (error) {
                                    logger.error('Import failed', error);
                                    toastCRUD.importError('prompts', error);
                                } else {
                                    toastCRUD.importSuccess('Prompts');
                                }
                                setIsImporting(false);
                                // clear the input so the same file can be reselected if needed
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                        />

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                if (fileInputRef.current) fileInputRef.current.click();
                            }}
                            disabled={isImporting}
                            title="Import prompts"
                        >
                            <Download className={cn("h-4 w-4", isImporting && "animate-spin")} />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleReseedSystemPrompts}
                            disabled={isReseeding}
                            title="Reseed system prompts"
                        >
                            <RefreshCw className={cn("h-4 w-4", isReseeding && "animate-spin")} />
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <PromptsList
                        onPromptSelect={handlePromptSelect}
                        selectedPromptId={selectedPrompt?.id}
                        onPromptDelete={handlePromptDelete}
                    />
                </div>
            </div>

            {/* Right panel - Content Area */}
            <div className="flex-1 pl-[300px] h-screen">
                <div className="max-w-3xl mx-auto p-6">
                    {(isCreating || selectedPrompt) ? (
                        <PromptForm
                            key={selectedPrompt?.id || 'new'}
                            prompt={selectedPrompt}
                            onSave={handleSave}
                            onCancel={() => {
                                setIsCreating(false);
                                setShowMobileForm(false);
                            }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Select a prompt to edit or create a new one</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 