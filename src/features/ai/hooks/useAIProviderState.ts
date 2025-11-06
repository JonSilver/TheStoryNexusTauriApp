import { useState, useCallback } from 'react';
import { attemptPromise } from '@jfdi/attempt';
import { toast } from 'react-toastify';
import { aiService } from '@/services/ai/AIService';
import { AIModel } from '@/types/story';
import { logger } from '@/utils/logger';

type AIProvider = 'openai' | 'openrouter' | 'local';

type ProviderState = {
  apiKey: string;
  models: AIModel[];
  defaultModel: string | undefined;
};

type LocalProviderState = ProviderState & {
  apiUrl: string;
};

type ProvidersState = {
  openai: ProviderState;
  openrouter: ProviderState;
  local: LocalProviderState;
};

type ProviderConfig = {
  name: string;
  keyLabel: string;
  getKey: () => string | undefined;
  getModels: (allModels: AIModel[]) => AIModel[];
  getDefaultModel: () => string | undefined;
};

const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    keyLabel: 'OpenAI API Key',
    getKey: () => aiService.getOpenAIKey(),
    getModels: (allModels) => allModels.filter(m => m.provider === 'openai'),
    getDefaultModel: () => aiService.getDefaultOpenAIModel(),
  },
  openrouter: {
    name: 'OpenRouter',
    keyLabel: 'OpenRouter API Key',
    getKey: () => aiService.getOpenRouterKey(),
    getModels: (allModels) => allModels.filter(m => m.provider === 'openrouter'),
    getDefaultModel: () => aiService.getDefaultOpenRouterModel(),
  },
  local: {
    name: 'Local',
    keyLabel: 'Local API URL',
    getKey: () => aiService.getLocalApiUrl(),
    getModels: (allModels) => allModels.filter(m => m.provider === 'local'),
    getDefaultModel: () => aiService.getDefaultLocalModel(),
  },
} as const;

export const useAIProviderState = () => {
  const [providers, setProviders] = useState<ProvidersState>({
    openai: { apiKey: '', models: [], defaultModel: undefined },
    openrouter: { apiKey: '', models: [], defaultModel: undefined },
    local: { apiKey: '', models: [], defaultModel: undefined, apiUrl: '' },
  });

  const [isLoading, setIsLoading] = useState(false);

  const initialize = useCallback(async () => {
    const [error] = await attemptPromise(async () => {
      logger.info('[useAIProviderState] Initializing AI service');
      await aiService.initialize();

      const allModels = await aiService.getAvailableModels(undefined, false);
      logger.info(`[useAIProviderState] Received ${allModels.length} total models`);

      const newProvidersState: ProvidersState = {
        openai: {
          apiKey: PROVIDER_CONFIG.openai.getKey() || '',
          models: PROVIDER_CONFIG.openai.getModels(allModels),
          defaultModel: PROVIDER_CONFIG.openai.getDefaultModel(),
        },
        openrouter: {
          apiKey: PROVIDER_CONFIG.openrouter.getKey() || '',
          models: PROVIDER_CONFIG.openrouter.getModels(allModels),
          defaultModel: PROVIDER_CONFIG.openrouter.getDefaultModel(),
        },
        local: {
          apiKey: PROVIDER_CONFIG.local.getKey() || '',
          models: PROVIDER_CONFIG.local.getModels(allModels),
          defaultModel: PROVIDER_CONFIG.local.getDefaultModel(),
          apiUrl: aiService.getLocalApiUrl(),
        },
      };

      setProviders(newProvidersState);

      logger.info('[useAIProviderState] Provider states initialized', {
        openaiModels: newProvidersState.openai.models.length,
        openrouterModels: newProvidersState.openrouter.models.length,
        localModels: newProvidersState.local.models.length,
      });
    });

    if (error) {
      logger.error('[useAIProviderState] Error loading AI settings:', error);
      toast.error('Failed to load AI settings');
    }
  }, []);

  const updateApiKey = useCallback((provider: AIProvider, key: string) => {
    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey: key,
      },
    }));
  }, []);

  const updateLocalApiUrl = useCallback((url: string) => {
    setProviders(prev => ({
      ...prev,
      local: {
        ...prev.local,
        apiUrl: url,
      },
    }));
  }, []);

  const saveApiKey = useCallback(async (provider: AIProvider, key: string) => {
    if (provider !== 'local' && !key.trim()) return;

    setIsLoading(true);
    logger.info(`[useAIProviderState] Updating key for provider: ${provider}`);

    const [error] = await attemptPromise(async () => {
      await aiService.updateKey(provider, key);
      logger.info(`[useAIProviderState] Key updated for ${provider}, fetching models`);
      const models = await aiService.getAvailableModels(provider);
      logger.info(`[useAIProviderState] Received ${models.length} models for ${provider}`);

      setProviders(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          models,
        },
      }));

      toast.success(`${PROVIDER_CONFIG[provider].name} models updated successfully`);
    });

    if (error) {
      toast.error(`Failed to update ${provider} models`);
    }

    setIsLoading(false);
  }, []);

  const refreshModels = useCallback(async (provider: AIProvider) => {
    setIsLoading(true);
    logger.info(`[useAIProviderState] Refreshing models for provider: ${provider}`);

    const [error] = await attemptPromise(async () => {
      const models = await aiService.getAvailableModels(provider, true);
      logger.info(`[useAIProviderState] Received ${models.length} models for ${provider}`);

      setProviders(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          models,
        },
      }));

      toast.success(`${PROVIDER_CONFIG[provider].name} models refreshed`);
    });

    if (error) {
      logger.error(`[useAIProviderState] Error refreshing ${provider} models:`, error);
      toast.error(`Failed to refresh ${provider} models`);
    }

    setIsLoading(false);
  }, []);

  const saveLocalApiUrl = useCallback(async (url: string) => {
    if (!url.trim()) return;

    setIsLoading(true);
    logger.info(`[useAIProviderState] Updating local API URL to: ${url}`);

    const [error] = await attemptPromise(async () => {
      await aiService.updateLocalApiUrl(url);
      logger.info('[useAIProviderState] Local API URL updated, fetching models');
      const models = await aiService.getAvailableModels('local', true);
      logger.info(`[useAIProviderState] Received ${models.length} local models`);

      setProviders(prev => ({
        ...prev,
        local: {
          ...prev.local,
          models,
        },
      }));

      toast.success('Local API URL updated successfully');
    });

    if (error) {
      logger.error('[useAIProviderState] Error updating local API URL:', error);
      toast.error('Failed to update local API URL');
    }

    setIsLoading(false);
  }, []);

  const updateDefaultModel = useCallback(async (provider: AIProvider, modelId: string | undefined) => {
    const [error] = await attemptPromise(async () => {
      await aiService.updateDefaultModel(provider, modelId);

      setProviders(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          defaultModel: modelId,
        },
      }));

      toast.success('Default model updated');
    });

    if (error) {
      logger.error('[useAIProviderState] Error updating default model:', error);
      toast.error('Failed to update default model');
    }
  }, []);

  return {
    providers,
    isLoading,
    initialize,
    updateApiKey,
    updateLocalApiUrl,
    saveApiKey,
    refreshModels,
    saveLocalApiUrl,
    updateDefaultModel,
  };
};
