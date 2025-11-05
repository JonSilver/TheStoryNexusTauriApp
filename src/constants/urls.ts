/**
 * URL constants for API endpoints and local development servers
 */

export const API_URLS = {
    /** Default local AI API URL (LM Studio compatible) */
    LOCAL_AI_DEFAULT: 'http://localhost:1234/v1',

    /** OpenRouter API base URL */
    OPENROUTER_BASE: 'https://openrouter.ai/api/v1',

    /** Local development server URL (for HTTP-Referer header) */
    DEV_REFERER: 'http://localhost:5173',
} as const;
