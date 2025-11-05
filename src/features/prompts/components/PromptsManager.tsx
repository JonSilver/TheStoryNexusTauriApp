import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PromptForm } from './PromptForm';
import { PromptsList } from './PromptList';
import { Plus } from 'lucide-react';
import { Upload } from 'lucide-react';
import type { Prompt } from '@/types/story';
import { cn } from '@/lib/utils';
import { toastCRUD } from '@/utils/toastUtils';
import { attemptPromise } from '@jfdi/attempt';
import { logger } from '@/utils/logger';
import { promptsApi } from '@/services/api/client';
import { downloadJSONDataURI, generateExportFilename } from '@/utils/jsonExportUtils';

export function PromptsManager() {
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
    const [isCreating, setIsCreating] = useState(false);
    const [showMobileForm, setShowMobileForm] = useState(false);

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