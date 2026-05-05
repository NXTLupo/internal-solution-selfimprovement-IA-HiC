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
    // Strip \r (carriage return) globally — Gemini sometimes returns \r\n on Windows
    // JSON.parse chokes on \r at position 1 in some runtimes
    let cleaned = jsonString.replace(/\r/g, '').trim();

    // Strip markdown code fences
    if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }

    // FIX: Handle double-escaped JSON from Gemini streaming.
    // Detection: raw text starts with literal \n or contains literal \" sequences
    // but the first real JSON char ({ or [) isn't at position 0.
    // Example broken input: \n{\n  \"name\": \"value\"\n}
    if (/^\\n|^"\\n|^"?\s*\\n?\s*\{/.test(cleaned) && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        try {
            // Try JSON.parse in case it's a JSON-encoded string
            const unescaped = JSON.parse(cleaned);
            if (typeof unescaped === 'string') {
                cleaned = unescaped.trim();
            }
        } catch {
            // Manual unescape of literal \n, \t, \", \\ sequences
            cleaned = cleaned
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }
            cleaned = cleaned.trim();
        }
    }

    // Also handle the case where the text IS valid JSON structure but has leading \n
    // (literal backslash-n at the start, before the opening brace)
    if (cleaned.startsWith('\\n')) {
        cleaned = cleaned.replace(/^(\\n)+/, '').trim();
    }

    // Strip leading non-JSON text (Gemini sometimes prepends prose)
    const jsonStart = cleaned.search(/[\[{]/);
    if (jsonStart > 0) {
        cleaned = cleaned.substring(jsonStart);
    } else if (jsonStart === -1) {
        // No JSON structure found at all — response is pure text, not JSON.
        // Wrap it as a minimal valid JSON object so downstream doesn't crash.
        console.warn('[tryRepairJson] No JSON structure found in response, wrapping as error object');
        return JSON.stringify({ _error: "Model returned non-JSON text", _raw: cleaned.substring(0, 200) });
    }

    // Bracket-balancing repair for truncated responses
    let stack: string[] = [];
    let inString = false;
    let escaped = false;

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

    // Close unclosed string
    if (inString) cleaned += '"';
    // Close remaining brackets/braces
    while (stack.length > 0) cleaned += stack.pop();
    // Fix trailing comma before closing bracket (common truncation artifact)
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    // Validation: try to parse. If bracket-balanced version fails,
    // progressively trim from the end to find a parseable prefix.
    try {
        JSON.parse(cleaned);
    } catch {
        // Strip the appended closers and try again with a backward search
        let base = cleaned;
        for (let trim = 0; trim < 5; trim++) {
            // Remove last closer and any trailing comma/whitespace
            base = base.replace(/[\]}"]?\s*$/, '').replace(/,\s*$/, '');
            // Re-run bracket balance on trimmed version
            let s: string[] = [];
            let iS = false;
            let es = false;
            for (let i = 0; i < base.length; i++) {
                if (es) { es = false; continue; }
                if (base[i] === '\\') { es = true; continue; }
                if (base[i] === '"') { iS = !iS; continue; }
                if (!iS) {
                    if (base[i] === '{' || base[i] === '[') s.push(base[i] === '{' ? '}' : ']');
                    else if (base[i] === '}' || base[i] === ']') { if (s.length) s.pop(); }
                }
            }
            let attempt = base;
            if (iS) attempt += '"';
            while (s.length > 0) attempt += s.pop();
            attempt = attempt.replace(/,\s*([\]}])/g, '$1');
            try {
                JSON.parse(attempt);
                return attempt;
            } catch { /* keep trimming */ }
        }
    }

    return cleaned;
}

// --- MODEL REGISTRY ---
export interface ModelInfo {
    id: string;
    provider: 'anthropic' | 'openai' | 'google' | 'deepseek';
    displayName: string;
    vision: boolean;
    maxContext: number;
    maxOutput: number;
    costTier: 'budget' | 'standard' | 'premium';
}

// 2026-05-05 — Single-vendor migration to DeepSeek V4 Flash via Azure.
// All HiC reasoning / synthesis / chat / composer paths now route to
// deepseek-v4-flash through /api/ai/deepseek. The proxy honors 429
// Retry-After with exponential backoff so the staging deployment's
// 20 req/min · 20K tok/min limit doesn't surface as user-facing failures
// while quota bump is pending. OpenAI Whisper + text-embedding-3-small
// remain (DeepSeek has no audio/embedding parity). Gemini Search
// Grounding stays only for the conditional web-search tool path
// (free, opt-in via deepResearchService).
//
// Verified 2026-05-05 against the Azure deployment:
//   - 256K-token needle-in-haystack: PASS (10.5s)
//   - Discriminated-union schema tool-use: PASS
//   - Strict OpenAI chat-completions wire format: PASS
//   - api-key header (NOT Authorization: Bearer): required
//   - Token usage NOT returned in response (Azure inference quirk)
//
// To re-enable a fallback path, restore Gemini / GPT entries AND the
// per-stage dispatch branches in services that now hard-route to DeepSeek.
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
    'deepseek-v4-flash': {
        id: 'deepseek-v4-flash', provider: 'deepseek', displayName: 'DeepSeek V4 Flash',
        vision: false, maxContext: 256_000, maxOutput: 8_192, costTier: 'standard'
    },
    'deepseek-v4-pro': {
        id: 'deepseek-v4-pro', provider: 'deepseek', displayName: 'DeepSeek V4 Pro',
        vision: false, maxContext: 256_000, maxOutput: 8_192, costTier: 'premium'
    },
    'gpt-5.4': {
        id: 'gpt-5.4', provider: 'openai', displayName: 'GPT-5.4',
        vision: true, maxContext: 1_050_000, maxOutput: 128_000, costTier: 'standard'
    },
    'gpt-5.4-mini': {
        id: 'gpt-5.4-mini', provider: 'openai', displayName: 'GPT-5.4 Mini',
        vision: true, maxContext: 400_000, maxOutput: 128_000, costTier: 'budget'
    },
    'gpt-5.5': {
        id: 'gpt-5.5', provider: 'openai', displayName: 'GPT-5.5',
        vision: true, maxContext: 1_200_000, maxOutput: 128_000, costTier: 'premium'
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
// 2026-05-03 — Defaults migrated from Anthropic to Google. Opus 4.7 cost was
// $43/run dominated by ~363K-token system-prompt replay × 8 turns. Gemini
// 3.1 Pro at $1.25/M input cuts per-run cost to ~$8 with no loss to source
// coverage, theme breadth, or deliverable structure (those live in code, not
// in the model). Anthropic is fully removed from this branch — all stages
// route to Google or OpenAI exclusively.
export type TaskCategory = 'research' | 'fast_generation' | 'vision' | 'image' | 'video' | 'narrative_composition';

export const DEFAULT_MODELS: Record<TaskCategory, string> = {
    research: 'deepseek-v4-flash',
    fast_generation: 'deepseek-v4-flash',
    vision: 'deepseek-v4-flash',          // (no native vision yet — text-only fallback)
    image: 'gemini-2.5-flash',            // imagen-4.0 via Gemini API
    video: 'gemini-2.5-flash',            // veo-3.1 via Gemini API
    narrative_composition: 'deepseek-v4-flash',
};

export type ModelPreferences = Record<TaskCategory, string>;

// --- AVAILABLE MODELS PER CATEGORY ---
// DeepSeek V4 Flash everywhere; image/video stay on Gemini for the modality.
// V4 Pro is registered for a future premium-reasoning slot but not yet the
// default (Azure deployment serves Flash today).
export const MODELS_FOR_CATEGORY: Record<TaskCategory, string[]> = {
    research: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    fast_generation: ['deepseek-v4-flash'],
    vision: ['deepseek-v4-flash'],
    image: ['gemini-2.5-flash'],
    video: ['gemini-2.5-flash'],
    narrative_composition: ['deepseek-v4-flash', 'deepseek-v4-pro'],
};

// --- API KEY AVAILABILITY ---
export function getAvailableProviders(): Set<string> {
    const providers = new Set<string>();
    if ((process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY) providers.add('google');
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

import * as openaiService from './openaiService';

/**
 * Route a text analysis task to the selected model.
 * Returns parsed JSON of type T.
 *
 * 2026-05-03 — Anthropic branch removed. Only OpenAI and Google providers
 * are supported on this branch. Google text routing uses GenAISession
 * directly (see geminiService.ts), so this router only handles OpenAI.
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
        case 'openai':
            return openaiService.analyzeTextJSON<T>(systemPrompt, userPrompt, modelId, maxTokens, temperature);
        case 'google':
            // Delegate to existing Gemini service (import dynamically to avoid circular deps)
            throw new Error('Google text routing should use existing GenAISession. Use routeTextAnalysis only for OpenAI tasks.');
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
