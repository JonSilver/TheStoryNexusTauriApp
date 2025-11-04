import { create } from 'zustand';
import { attemptPromise } from '@jfdi/attempt';
import { z } from 'zod';
import { promptsApi } from '@/services/api/client';
import { formatError } from '@/utils/errorUtils';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { logger } from '@/utils/logger';
import { promptsExportSchema, promptSchema, parseJSON } from '@/schemas/entities';
import { downloadJSONDataURI, generateExportFilename } from '@/utils/jsonExportUtils';
import { validatePartialUpdate } from '@/utils/crudHelpers';
import type { Prompt, PromptMessage } from '@/types/story';

interface PromptStore {
    prompts: Prompt[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchPrompts: () => Promise<void>;
    createPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt'>) => Promise<void>;
    updatePrompt: (id: string, prompt: Partial<Prompt>) => Promise<void>;
    deletePrompt: (id: string) => Promise<void>;
    clonePrompt: (id: string) => Promise<void>;

    // Export/Import
    exportPrompts: () => Promise<void>;
    importPrompts: (jsonData: string) => Promise<void>;

    // Helpers
    validatePromptData: (messages: PromptMessage[]) => boolean;
    findUniqueName: (baseName: string) => Promise<string>;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
    prompts: [],
    isLoading: false,
    error: null,

    validatePromptData: (messages) => {
        const messageSchema = z.array(z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string(),
        }));
        return messageSchema.safeParse(messages).success;
    },

    fetchPrompts: async () => {
        set({ isLoading: true });

        const [error, prompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (error) {
            set({ error: formatError(error, ERROR_MESSAGES.FETCH_FAILED('prompts')), isLoading: false });
            return;
        }

        set({ prompts, error: null, isLoading: false });
    },

    createPrompt: async (promptData) => {
        if (!get().validatePromptData(promptData.messages)) {
            throw new Error('Invalid prompt data structure');
        }

        // Check for duplicate name
        const [checkError, allPrompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (checkError) {
            throw checkError;
        }

        const existingPrompt = allPrompts.find(p => p.name === promptData.name);
        if (existingPrompt) {
            throw new Error('A prompt with this name already exists');
        }

        const dataToCreate = {
            ...promptData,
            temperature: promptData.temperature || 1.0,
            maxTokens: promptData.maxTokens || 4096,
            top_p: promptData.top_p !== undefined ? promptData.top_p : 1.0,
            top_k: promptData.top_k !== undefined ? promptData.top_k : 50,
            repetition_penalty: promptData.repetition_penalty !== undefined ? promptData.repetition_penalty : 1.0,
            min_p: promptData.min_p !== undefined ? promptData.min_p : 0.0
        };

        const [addError] = await attemptPromise(() => promptsApi.create(dataToCreate));

        if (addError) {
            throw addError;
        }

        const [fetchError, prompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (fetchError) {
            logger.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), fetchError);
        } else {
            set({ prompts, error: null });
        }
    },

    updatePrompt: async (id, promptData) => {
        try {
            validatePartialUpdate(promptData, promptSchema);
        } catch (error) {
            throw error instanceof Error ? error : new Error('Validation failed');
        }

        // If name is being updated, check for duplicates
        if (promptData.name) {
            const [checkError, allPrompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

            if (checkError) {
                throw checkError;
            }

            const existingPrompt = allPrompts.find(p => p.name === promptData.name && p.id !== id);
            if (existingPrompt) {
                throw new Error('A prompt with this name already exists');
            }
        }

        const [updateError] = await attemptPromise(() => promptsApi.update(id, promptData));

        if (updateError) {
            throw updateError;
        }

        const [fetchError, prompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (fetchError) {
            logger.error(formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), fetchError);
        } else {
            set({ prompts, error: null });
        }
    },

    deletePrompt: async (id) => {
        const [fetchError, prompt] = await attemptPromise(() => promptsApi.getById(id));

        if (fetchError || !prompt) {
            const message = formatError(fetchError || new Error('Prompt not found'), ERROR_MESSAGES.NOT_FOUND('prompt'));
            set({ error: message });
            throw fetchError || new Error('Prompt not found');
        }

        if (prompt.isSystem) {
            const message = 'System prompts cannot be deleted';
            set({ error: message });
            throw new Error(message);
        }

        const [deleteError] = await attemptPromise(() => promptsApi.delete(id));

        if (deleteError) {
            const message = formatError(deleteError, ERROR_MESSAGES.DELETE_FAILED('prompt'));
            set({ error: message });
            throw deleteError;
        }

        const [refetchError, prompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (refetchError) {
            logger.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), refetchError);
        } else {
            set({ prompts, error: null });
        }
    },

    clonePrompt: async (id) => {
        const [fetchError, originalPrompt] = await attemptPromise(() => promptsApi.getById(id));

        if (fetchError || !originalPrompt) {
            const message = formatError(fetchError || new Error('Prompt not found'), ERROR_MESSAGES.NOT_FOUND('prompt'));
            set({ error: message });
            throw fetchError || new Error('Prompt not found');
        }

        const clonedPromptData = {
            ...originalPrompt,
            name: `${originalPrompt.name} (Copy)`,
            isSystem: false // Always set to false for cloned prompts
        };

        // Remove id and createdAt as they will be generated by the API
        const { id: _id, createdAt: _createdAt, ...dataToCreate } = clonedPromptData;

        const [addError] = await attemptPromise(() => promptsApi.create(dataToCreate));

        if (addError) {
            const message = formatError(addError, ERROR_MESSAGES.CREATE_FAILED('cloned prompt'));
            set({ error: message });
            throw addError;
        }

        const [refetchError, prompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (refetchError) {
            logger.error(formatError(refetchError, ERROR_MESSAGES.FETCH_FAILED('prompts')), refetchError);
        } else {
            set({ prompts, error: null });
        }
    }

    ,

    // Export all prompts as JSON and trigger download
    exportPrompts: async () => {
        const [error, allPrompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (error) {
            const message = formatError(error, ERROR_MESSAGES.FETCH_FAILED('prompts'));
            set({ error: message });
            throw error;
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
    },

    // Import prompts from JSON string. Creates new IDs and createdAt. Ensures unique names.
    importPrompts: async (jsonData) => {
        const result = parseJSON(promptsExportSchema, jsonData);
        if (!result.success) {
            throw new Error(`Invalid prompts data: ${result.error.message}`);
        }

        const imported: Prompt[] = result.data.prompts;

        for (const p of imported) {
            // Ensure unique name - check DB for existing name and append suffix if needed
            const newName = await get().findUniqueName(p.name || 'Imported Prompt');

            // Remove id and createdAt as they will be generated by the API
            const { id: _id, createdAt: _createdAt, ...promptData } = p;

            const dataToCreate = {
                ...promptData,
                name: newName,
                // Ensure imported prompts are not treated as system prompts
                isSystem: false
            };

            // Add via API
            const [addError] = await attemptPromise(() => promptsApi.create(dataToCreate));

            if (addError) {
                logger.error(`Failed to import prompt "${newName}"`, addError);
                // Continue with other prompts instead of failing entire import
            }
        }

        const [fetchError, prompts] = await attemptPromise(() => promptsApi.getAll({ includeSystem: true }));

        if (fetchError) {
            const message = formatError(fetchError, ERROR_MESSAGES.FETCH_FAILED('prompts'));
            set({ error: message });
            throw fetchError;
        }

        set({ prompts, error: null });
    },

    // Helper to find a unique name by appending (Imported) or (Imported N) suffix
    findUniqueName: async (baseName: string): Promise<string> => {
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
    }
}));
