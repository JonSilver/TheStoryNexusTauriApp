import OpenAI from 'openai';
import { AIModel, AIProvider, PromptMessage } from '@/types/story';
import { IAIProvider } from './IAIProvider';
import { attemptPromise } from '@jfdi/attempt';
import { wrapOpenAIStream } from '../streamUtils';

export class OpenAIProvider implements IAIProvider {
    private client: OpenAI | null = null;

    initialize(apiKey?: string): void {
        if (!apiKey) return;

        this.client = new OpenAI({
            apiKey,
            dangerouslyAllowBrowser: true
        });
    }

    async fetchModels(): Promise<AIModel[]> {
        if (!this.client) {
            console.warn('[OpenAIProvider] Client not initialized');
            return [];
        }

        console.log('[OpenAIProvider] Fetching models');

        const [error, response] = await attemptPromise(() => this.client!.models.list());

        if (error) {
            console.error('[OpenAIProvider] Error fetching models:', error);
            return [];
        }

        const gptModels = response.data.filter(m => m.id.startsWith('gpt'));

        const models: AIModel[] = gptModels.map(model => ({
            id: model.id,
            name: model.id,
            provider: 'openai' as AIProvider,
            contextLength: this.getContextLength(model.id),
            enabled: true
        }));

        console.log(`[OpenAIProvider] Fetched ${models.length} models`);
        return models;
    }

    async generate(
        messages: PromptMessage[],
        model: string,
        temperature: number,
        maxTokens: number,
        signal?: AbortSignal
    ): Promise<Response> {
        if (!this.client) {
            throw new Error('OpenAI client not initialized');
        }

        const stream = await this.client.chat.completions.create({
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature,
            max_tokens: maxTokens,
            stream: true
        }, { signal });

        return wrapOpenAIStream(stream);
    }

    isInitialized(): boolean {
        return this.client !== null;
    }

    private getContextLength(modelId: string): number {
        if (modelId.includes('gpt-4')) return 8192;
        if (modelId.includes('gpt-3.5-turbo-16k')) return 16384;
        if (modelId.includes('gpt-3.5')) return 4096;
        return 4096;
    }
}
