// services/deliverableModelRouter.ts — 2026-05-27
//
// Proactive, health-aware model router for #deliverable generation.
//
// THE PROBLEM IT SOLVES
// ---------------------
// Deliverable call sites used to hardcode a single model (e.g. recommendations
// pinned gemini-3.1-pro-preview + thinkingBudget 'max'). When that model was
// slow (timeout) or its provider was rate-limited (429 "Resource exhausted"),
// the whole deliverable hard-failed with no recovery. Switching the chat model
// in the UI didn't help because the deliverable path ignored the selection.
//
// THE FIX
// -------
// One layer that, per deliverable kind, walks an ORDERED model chain and:
//   - honors the user's selected model as the chain head when given;
//   - reorders the chain by live provider health (a provider in 429 cooldown
//     is pushed to the back, but kept as a last resort);
//   - crosses providers (gemini family -> GPT) so a gemini-wide 429 still
//     completes on a different provider;
//   - applies per-model config (Pro gets a long timeout + high thinking + 1
//     attempt; Flash gets a tight timeout + 2 attempts);
//   - advances to the next model on ANY failure (timeout / 429 / 5xx /
//     content_filter / dropped connection);
//   - normalizes the provider-specific response shape to a single `text`
//     string so callers don't care which model answered;
//   - throws ONLY when every model in the chain is exhausted.
//
// Composes with multiModelResilience (provider health) + aiRouter (registry +
// per-category chains) + aiRetryClient (the actual retrying fetch). See
// memory feedback_multi_model_resilience_pattern.

import { callAIWithRetry, type AIEndpointId } from './aiRetryClient';
import { MODEL_REGISTRY, MODELS_FOR_CATEGORY, getAvailableProviders, type TaskCategory } from './aiRouter';
import { stripFormatTells } from './slidePostProcessor';
import {
    isProviderHealthy,
    recordProvider429,
    isThrottleError,
    type Provider,
} from './multiModelResilience';

// --- Deliverable taxonomy ----------------------------------------------------
// Every hashtag #deliverable maps to a TaskCategory, which selects the base
// model chain from aiRouter.MODELS_FOR_CATEGORY. Quality-sensitive deliverables
// (recommendations, strategy, narrative) map to 'research' (Pro-headed chain);
// interactive/fast ones map to 'fast_generation' (Flash-headed).
export type DeliverableKind =
    | 'recommendations' | 'themes' | 'personas' | 'strategy' | 'narrative'
    | 'journey' | 'blueprint' | 'competitive' | 'tech-arch' | 'gap'
    | 'prd' | 'roadmap' | 'brief' | 'chat' | 'fast';

const DELIVERABLE_CATEGORY: Record<DeliverableKind, TaskCategory> = {
    recommendations: 'research',
    themes: 'research',
    personas: 'research',
    strategy: 'narrative_composition',
    narrative: 'narrative_composition',
    journey: 'research',
    blueprint: 'research',
    competitive: 'research',
    'tech-arch': 'research',
    gap: 'research',
    prd: 'research',
    roadmap: 'research',
    brief: 'research',
    chat: 'fast_generation',
    fast: 'fast_generation',
};

// --- Provider mapping --------------------------------------------------------
// aiRouter uses provider='google'; multiModelResilience uses 'gemini'. Bridge.
function modelProvider(modelId: string): Provider {
    const p = MODEL_REGISTRY[modelId]?.provider;
    if (p === 'google') return 'gemini';
    if (p === 'openai') return 'openai';
    if (p === 'deepseek') return 'deepseek';
    if (p === 'anthropic') return 'anthropic';
    return 'gemini';
}

// callAIWithRetry endpoint for a model.
function modelEndpoint(modelId: string): AIEndpointId | null {
    const p = MODEL_REGISTRY[modelId]?.provider;
    if (p === 'google') return 'gemini';
    if (p === 'openai') return 'openai';
    if (p === 'anthropic') return 'anthropic';
    // deepseek has no first-class endpoint in aiRetryClient on the browser side
    // (and is Azure content-filter-prone on the NU corpus). Drop from chains.
    return null;
}

// Cross-provider tail: non-gemini models appended so a gemini-WIDE 429/outage
// still completes on a DIFFERENT provider. Order matters: GPT first (if funded),
// then Claude. ANTHROPIC is the funded escape on this platform (ANTHROPIC_API_KEY
// is the primary required key); GPT is included but currently dry
// (insufficient_quota) and will simply be skipped/advanced-past at runtime.
const CROSS_PROVIDER_FALLBACKS = ['gpt-5.5', 'claude-sonnet-4-6'];

/**
 * Resolve the ordered, health-aware, availability-filtered model chain for a
 * deliverable. `preferModel` (the user's UI selection) becomes the chain head
 * when it's a valid, reachable model.
 */
export function resolveModelChain(deliverable: DeliverableKind, preferModel?: string): string[] {
    const category = DELIVERABLE_CATEGORY[deliverable] ?? 'research';
    const providers = getAvailableProviders(); // env-key gated: 'google', 'openai'

    // Base chain from the category, keep only models we can actually call.
    let chain = (MODELS_FOR_CATEGORY[category] || [])
        .filter(id => MODEL_REGISTRY[id] && modelEndpoint(id) !== null)
        .filter(id => providers.has(MODEL_REGISTRY[id].provider));

    // Append cross-provider fallbacks so a gemini-wide 429/outage survives.
    for (const fb of CROSS_PROVIDER_FALLBACKS) {
        const info = MODEL_REGISTRY[fb];
        if (!info || chain.includes(fb)) continue;
        if (providers.has(info.provider)) chain.push(fb);
    }

    // Honor the user's selection as the head when reachable.
    if (preferModel && chain.includes(preferModel)) {
        chain = [preferModel, ...chain.filter(m => m !== preferModel)];
    }

    // Health reorder: models whose provider is in 429 cooldown go to the back
    // (kept as last resort). Stable partition preserves the preference order
    // within each health bucket.
    const healthy = chain.filter(id => isProviderHealthy(modelProvider(id)));
    const throttled = chain.filter(id => !isProviderHealthy(modelProvider(id)));
    const ordered = [...healthy, ...throttled];

    // Dedupe, preserve order.
    return ordered.filter((id, i) => ordered.indexOf(id) === i);
}

export interface BuiltCall {
    endpoint: AIEndpointId;
    body: any;
    headers?: Record<string, string>;
}

export interface PerModelConfig {
    requestTimeoutMs?: number;
    maxAttempts?: number;
}

export interface ModelChainOptions {
    deliverable: DeliverableKind;
    /** User-selected model (UI model bar) — used as chain head when reachable. */
    preferModel?: string;
    /** Build the correct endpoint+body for a given model id (shapes differ per provider). */
    buildBody: (modelId: string) => BuiltCall;
    /** Per-model timeout / attempts policy. */
    perModelConfig?: (modelId: string) => PerModelConfig;
    /** Human label for logs / cost meter. */
    label: string;
    /** Progress callback (retry + model-switch notices). */
    onProgress?: (msg: string) => void;
    /** Fired when the router advances from one model to the next. */
    onModelSwitch?: (fromModel: string, toModel: string, reason: string) => void;
}

export interface ModelChainResult {
    text: string;
    modelUsed: string;
    raw: any;
}

/** Normalize a provider response to a single text string, with format-tell
 *  hygiene (em-dash + emoji strip) applied so NO model output reaches the user
 *  with banned glyphs regardless of which provider answered. */
function extractText(modelId: string, data: any): string {
    const provider = MODEL_REGISTRY[modelId]?.provider;
    let raw: string;
    if (provider === 'openai') {
        raw = data?.choices?.[0]?.message?.content
            || data?.choices?.[0]?.text
            || '';
    } else if (provider === 'anthropic') {
        // Anthropic Messages API: content is an array of {type:'text', text}.
        const blocks = data?.content || [];
        raw = Array.isArray(blocks)
            ? blocks.map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('')
            : '';
    } else {
        // Gemini (google) shape.
        const parts = data?.candidates?.[0]?.content?.parts || [];
        raw = parts.map((p: any) => p?.text || '').join('') || '';
    }
    return stripFormatTells(raw);
}

/** Default per-model config: Pro-class gets a long ceiling + 1 attempt; fast
 *  models get a tight ceiling + 2 attempts. Tuned to the proxy's 540s cap. */
function defaultPerModelConfig(modelId: string): PerModelConfig {
    const tier = MODEL_REGISTRY[modelId]?.costTier;
    if (tier === 'premium') {
        // Pro / GPT-5.5: slow, deep. 530s < proxy 540s; one shot (a timeout
        // just times out again — the chain advances instead of retrying).
        return { requestTimeoutMs: 530_000, maxAttempts: 1 };
    }
    // Flash / budget: fast. Tight ceiling, 2 attempts (transient 5xx worth a retry).
    return { requestTimeoutMs: 180_000, maxAttempts: 2 };
}

/**
 * Walk the deliverable's model chain until one model returns, normalizing the
 * response to `text`. Records provider 429s into the health tracker so future
 * calls route around throttled providers. Throws only if ALL models fail.
 */
export async function callWithModelChain(opts: ModelChainOptions): Promise<ModelChainResult> {
    const chain = resolveModelChain(opts.deliverable, opts.preferModel);
    if (chain.length === 0) {
        throw new Error(`[modelRouter/${opts.deliverable}] no reachable models (check provider API keys)`);
    }
    const cfgFor = opts.perModelConfig || defaultPerModelConfig;
    let lastErr: unknown = null;

    for (let i = 0; i < chain.length; i++) {
        const modelId = chain[i];
        const built = opts.buildBody(modelId);
        const cfg = cfgFor(modelId);

        if (i > 0) {
            const from = chain[i - 1];
            const reason = isThrottleError(lastErr) ? 'rate-limited' : 'failed';
            opts.onModelSwitch?.(from, modelId, reason);
            opts.onProgress?.(
                `${MODEL_REGISTRY[from]?.displayName || from} ${reason}; switching to ${MODEL_REGISTRY[modelId]?.displayName || modelId}…`
            );
        }

        try {
            const data = await callAIWithRetry(built.endpoint, built.body, {
                label: i === 0 ? opts.label : `${opts.label} → ${MODEL_REGISTRY[modelId]?.displayName || modelId}`,
                maxAttempts: cfg.maxAttempts,
                requestTimeoutMs: cfg.requestTimeoutMs,
                headers: built.headers,
                onRetry: (attempt, total, status) =>
                    opts.onProgress?.(`${status} (attempt ${attempt}/${total})`),
            });
            const text = extractText(modelId, data);
            if (!text || !text.trim()) {
                throw new Error(`${modelId} returned empty content`);
            }
            return { text, modelUsed: modelId, raw: data };
        } catch (err) {
            lastErr = err;
            // Record provider-level throttle so subsequent calls route around it.
            if (isThrottleError(err)) recordProvider429(modelProvider(modelId));
            console.warn(
                `[modelRouter/${opts.deliverable}] model '${modelId}' failed: ` +
                `${String((err as any)?.message || err).slice(0, 180)} — advancing to next in chain`
            );
            continue;
        }
    }

    throw new Error(
        `[modelRouter/${opts.deliverable}] all models exhausted (${chain.join(' → ')}). ` +
        `Last error: ${String((lastErr as any)?.message || lastErr).slice(0, 220)}`
    );
}
