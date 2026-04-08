/**
 * AI Router — Multi-Model Intelligence Layer
 * Routes tasks to the optimal AI model based on task type and user preferences.
 *
 * Model Roster (April 2026):
 * - Claude Opus 4.6: Deep research analysis, vision-based UX heuristics (1M context)
 * - GPT-5.4 Mini: Fast structured JSON generation (PRDs, roadmaps, tables)
 * - GPT-5.4: Vision fallback, deep reasoning alternative
 * - Gemini 2.5 Flash: Current default, image generation, video generation
 * - Gemini 3.1 Pro Preview: Long-context multimodal reasoning
 * - Imagen 4: Primary image generation
 */

// --- JSON REPAIR UTILITY (shared across all services) ---
export function tryRepairJson(jsonString: string): string {
    let stack: string[] = [];
    let inString = false;
    let escaped = false;

    let cleaned = jsonString.trim();
    if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }

    for (let i = 0; i < cleaned.length; i++) {
        let char = cleaned[i];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
            if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
            else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
            }
        }
    }
    if (inString) cleaned += '"';
    while (stack.length > 0) cleaned += stack.pop();
    return cleaned;
}

// --- MODEL REGISTRY ---
export interface ModelInfo {
    id: string;
    provider: 'anthropic' | 'openai' | 'google';
    displayName: string;
    vision: boolean;
    maxContext: number;
    maxOutput: number;
    costTier: 'budget' | 'standard' | 'premium';
}

export const MODEL_REGISTRY: Record<string, ModelInfo> = {
    'claude-opus-4-6': {
        id: 'claude-opus-4-6', provider: 'anthropic', displayName: 'Claude Opus 4.6',
        vision: true, maxContext: 1_000_000, maxOutput: 128_000, costTier: 'premium'
    },
    'claude-sonnet-4-6': {
        id: 'claude-sonnet-4-6', provider: 'anthropic', displayName: 'Claude Sonnet 4.6',
        vision: true, maxContext: 1_000_000, maxOutput: 64_000, costTier: 'standard'
    },
    'gpt-5.4': {
        id: 'gpt-5.4', provider: 'openai', displayName: 'GPT-5.4',
        vision: true, maxContext: 1_050_000, maxOutput: 128_000, costTier: 'standard'
    },
    'gpt-5.4-mini': {
        id: 'gpt-5.4-mini', provider: 'openai', displayName: 'GPT-5.4 Mini',
        vision: true, maxContext: 400_000, maxOutput: 128_000, costTier: 'budget'
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash', provider: 'google', displayName: 'Gemini 2.5 Flash',
        vision: true, maxContext: 1_048_576, maxOutput: 65_536, costTier: 'budget'
    },
    'gemini-3.1-pro-preview': {
        id: 'gemini-3.1-pro-preview', provider: 'google', displayName: 'Gemini 3.1 Pro',
        vision: true, maxContext: 1_000_000, maxOutput: 65_536, costTier: 'premium'
    },
};

// --- TASK CATEGORIES ---
export type TaskCategory = 'research' | 'fast_generation' | 'vision' | 'image' | 'video';

export const DEFAULT_MODELS: Record<TaskCategory, string> = {
    research: 'claude-opus-4-6',
    fast_generation: 'gpt-5.4-mini',
    vision: 'claude-opus-4-6',
    image: 'gemini-2.5-flash',     // imagen-4.0 via Gemini API, flash-image as fallback
    video: 'gemini-2.5-flash',     // veo-3.1 via Gemini API
};

export type ModelPreferences = Record<TaskCategory, string>;

// --- AVAILABLE MODELS PER CATEGORY ---
export const MODELS_FOR_CATEGORY: Record<TaskCategory, string[]> = {
    research: ['claude-opus-4-6', 'claude-sonnet-4-6', 'gpt-5.4', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'],
    fast_generation: ['gpt-5.4-mini', 'claude-sonnet-4-6', 'gemini-2.5-flash'],
    vision: ['claude-opus-4-6', 'gpt-5.4', 'gemini-3.1-pro-preview'],
    image: ['gemini-2.5-flash'],
    video: ['gemini-2.5-flash'],
};

// --- API KEY AVAILABILITY ---
export function getAvailableProviders(): Set<string> {
    const providers = new Set<string>();
    if ((process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY) providers.add('google');
    if ((process.env as any).ANTHROPIC_API_KEY) providers.add('anthropic');
    if ((process.env as any).OPENAI_API_KEY) providers.add('openai');
    return providers;
}

export function getAvailableModels(category: TaskCategory): ModelInfo[] {
    const providers = getAvailableProviders();
    return MODELS_FOR_CATEGORY[category]
        .filter(id => providers.has(MODEL_REGISTRY[id].provider))
        .map(id => MODEL_REGISTRY[id]);
}

// --- ROUTER ---

import * as anthropicService from './anthropicService';
import * as openaiService from './openaiService';

/**
 * Route a text analysis task to the selected model.
 * Returns parsed JSON of type T.
 */
export async function routeTextAnalysis<T>(
    systemPrompt: string,
    userPrompt: string,
    preferences: ModelPreferences,
    category: TaskCategory = 'research',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<T> {
    const modelId = preferences[category] || DEFAULT_MODELS[category];
    const model = MODEL_REGISTRY[modelId];

    if (!model) {
        throw new Error(`Unknown model: ${modelId}`);
    }

    switch (model.provider) {
        case 'anthropic':
            return anthropicService.analyzeTextJSON<T>(systemPrompt, userPrompt, modelId, maxTokens, temperature);
        case 'openai':
            return openaiService.analyzeTextJSON<T>(systemPrompt, userPrompt, modelId, maxTokens, temperature);
        case 'google':
            // Delegate to existing Gemini service (import dynamically to avoid circular deps)
            throw new Error('Google text routing should use existing GenAISession. Use routeTextAnalysis only for Anthropic/OpenAI tasks.');
        default:
            throw new Error(`Unsupported provider: ${model.provider}`);
    }
}

/**
 * Route a vision analysis task to the selected model.
 * Returns parsed JSON of type T.
 */
export async function routeVisionAnalysis<T>(
    systemPrompt: string,
    userPrompt: string,
    images: { base64: string; mimeType: string }[],
    preferences: ModelPreferences,
    maxTokens: number = 32000,
    temperature: number = 0.1
): Promise<T> {
    const modelId = preferences.vision || DEFAULT_MODELS.vision;
    const model = MODEL_REGISTRY[modelId];

    if (!model) {
        throw new Error(`Unknown model: ${modelId}`);
    }

    switch (model.provider) {
        case 'anthropic':
            return anthropicService.analyzeVision<T>(systemPrompt, userPrompt, images, modelId, maxTokens, temperature);
        case 'openai':
            return openaiService.analyzeVision<T>(systemPrompt, userPrompt, images, modelId, maxTokens, temperature);
        default:
            throw new Error(`Vision not supported for provider: ${model.provider}`);
    }
}

/**
 * Get a human-readable summary of which models will be used.
 * Displayed at the MODEL_SELECTION checkpoint.
 */
export function getModelSummary(preferences: ModelPreferences): { category: string; model: string; provider: string; costTier: string }[] {
    return (Object.keys(preferences) as TaskCategory[]).map(category => {
        const modelId = preferences[category];
        const model = MODEL_REGISTRY[modelId];
        return {
            category: category.replace('_', ' '),
            model: model?.displayName || modelId,
            provider: model?.provider || 'unknown',
            costTier: model?.costTier || 'unknown',
        };
    });
}
