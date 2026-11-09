// services/deliverableModelRouter.ts - 2026-05-27
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
import { MODEL_REGISTRY, MODELS_FOR_CATEGORY, getAvailableProviders, type TaskCategory, CLAUDE_STRUCTURED_MODEL, CLAUDE_REASONING_MODEL } from './aiRouter';
import { stripFormatTells } from './slidePostProcessor';
import {
    isProviderHealthy,
    recordProvider429,
    isThrottleError,
    type Provider,
} from './multiModelResilience';
// 2026-06-05 - drift-catcher C1: per-engagement provider stickiness.
import {
    reorderChainByCommitment,
    setCommitment,
    providerOfModel,
    type CommittedProvider,
} from './engagementCommitment';

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
const CROSS_PROVIDER_FALLBACKS = ['gpt-5.5', CLAUDE_STRUCTURED_MODEL];

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
    } else if (
        // 2026-06-12 - honor an explicit preference OUTSIDE the category
        // chain (the Claude deliverable-routing directive: CLAUDE_REASONING_MODEL
        // is not in any MODELS_FOR_CATEGORY list). A reachable registry
        // model becomes the chain head; the category chain remains the
        // fallback tail, so an Opus outage still completes on Gemini/GPT.
        preferModel && MODEL_REGISTRY[preferModel]
        && modelEndpoint(preferModel) !== null
        && providers.has(MODEL_REGISTRY[preferModel].provider)
    ) {
        chain = [preferModel, ...chain];
    }

    // Health reorder: models whose provider is in 429 cooldown go to the back
    // (kept as last resort). Stable partition preserves the preference order
    // within each health bucket.
    const healthy = chain.filter(id => isProviderHealthy(modelProvider(id)));
    const throttled = chain.filter(id => !isProviderHealthy(modelProvider(id)));
    let ordered = [...healthy, ...throttled];

    // 2026-06-05 - drift-catcher C1: per-engagement provider stickiness.
    // If the active engagement has committed to a provider (because a prior
    // call fell back to it, or because the user pinned it explicitly), put
    // models from that provider at the head of the chain. Keeps cache warm,
    // prevents mid-engagement provider flapping. NO-OP when no commitment
    // exists or when no chain model matches the committed provider.
    // 2026-10-05 (owner rule: Opus 5.5 for reasoning): a REASONING chain keeps the Claude reasoning model at its
    // head. One transient Opus failure used to commit the engagement to Gemini and silently demote every later
    // reasoning deliverable; the chain still fails over per call when Opus is down.
    if (ordered[0] !== CLAUDE_REASONING_MODEL) ordered = reorderChainByCommitment(ordered);

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
    /** User-selected model (UI model bar) - used as chain head when reachable. */
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
        // just times out again - the chain advances instead of retrying).
        return { requestTimeoutMs: 530_000, maxAttempts: 1 };
    }
    // Flash / budget: fast. Tight ceiling, 2 attempts (transient 5xx worth a retry).
    return { requestTimeoutMs: 180_000, maxAttempts: 2 };
}

/**
 * Is this error a NETWORK / INFRASTRUCTURE failure (proxy down, fetch failed,
 * connection refused, empty response) vs a MODEL failure (timeout, 429,
 * content_filter, 5xx with model-specific signal)?
 *
 * Network failures should retry the SAME model with backoff - advancing the
 * chain on a network blip burns through every model in seconds and changes
 * nothing (every model hits the same dead proxy). This was the root cause of
 * the 2026-06-05 chat transcript's "chain exhausted in 3 seconds" failure.
 */
function isNetworkInfraError(err: unknown): boolean {
    if (!err) return false;
    const msg = String((err as any)?.message || err).toLowerCase();
    return (
        msg.includes('network connection to research proxy failed') ||
        msg.includes('failed to fetch') ||
        msg.includes('err_empty_response') ||
        msg.includes('err_connection_refused') ||
        msg.includes('err_socket_not_connected') ||
        msg.includes('aborterror')
    );
}

/** Quick health ping so we don't burn the whole chain when the proxy is
 *  briefly unreachable. 2-second ceiling - if /health doesn't answer in 2s
 *  the proxy is overloaded or down and the chain walk should pause/fail
 *  rather than burn through every model. */
async function _proxyHealthOk(): Promise<boolean> {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000);
        try {
            const r = await fetch('http://127.0.0.1:5012/health', { signal: ctrl.signal });
            return r.ok;
        } finally {
            clearTimeout(t);
        }
    } catch {
        return false;
    }
}

/**
 * Walk the deliverable's model chain until one model returns, normalizing the
 * response to `text`. Records provider 429s into the health tracker so future
 * calls route around throttled providers. Throws only if ALL models fail.
 *
 * 2026-06-05 - Network-failure-aware: a NETWORK error (proxy down, fetch
 * failed) triggers same-model retry with backoff (up to 3 attempts, capped
 * by elapsed budget); only MODEL failures (timeout, 429, content_filter)
 * advance the chain. Prevents the "burn through every model in 3s when proxy
 * is briefly saturated" failure mode.
 */
export async function callWithModelChain(opts: ModelChainOptions): Promise<ModelChainResult> {
    const chain = resolveModelChain(opts.deliverable, opts.preferModel);
    if (chain.length === 0) {
        throw new Error(`[modelRouter/${opts.deliverable}] no reachable models (check provider API keys)`);
    }
    const cfgFor = opts.perModelConfig || defaultPerModelConfig;
    let lastErr: unknown = null;

    // 2026-06-05 - Pre-flight proxy health check. Fail fast with a clear
    // message instead of burning the whole chain when the proxy is offline.
    if (!(await _proxyHealthOk())) {
        opts.onProgress?.('Research proxy did not answer /health within 2s; waiting 3s and retrying...');
        await new Promise(r => setTimeout(r, 3000));
        if (!(await _proxyHealthOk())) {
            throw new Error(
                `[modelRouter/${opts.deliverable}] research proxy unreachable on :5012 (no /health response). ` +
                `This is an infrastructure problem, not a model problem; the chain walk would burn through every ` +
                `model with the same network error. Check that the research-proxy container is running.`
            );
        }
        opts.onProgress?.('Proxy responsive after retry, continuing.');
    }

    for (let i = 0; i < chain.length; i++) {
        const modelId = chain[i];
        const built = opts.buildBody(modelId);
        const cfg = cfgFor(modelId);

        if (i > 0) {
            const from = chain[i - 1];
            const reason = isThrottleError(lastErr) ? 'rate-limited' : 'failed';
            opts.onModelSwitch?.(from, modelId, reason);
            opts.onProgress?.(
                `${MODEL_REGISTRY[from]?.displayName || from} ${reason}; switching to ${MODEL_REGISTRY[modelId]?.displayName || modelId}...`
            );
        }

        // 2026-06-05 - Network-failure same-model retry loop. Network
        // failures (proxy saturation, ERR_EMPTY_RESPONSE) should not advance
        // the chain - every model would hit the same dead proxy. Retry the
        // SAME model with backoff up to NET_RETRY_MAX times before allowing
        // chain advance. Only MODEL failures (429, timeout, content_filter)
        // advance the chain.
        const NET_RETRY_MAX = 3;
        const NET_BACKOFF_MS = [2000, 5000, 12000];
        let data: any = null;
        let modelSucceeded = false;
        let netRetry = 0;
        let modelLevelErr: unknown = null;
        while (netRetry <= NET_RETRY_MAX) {
            try {
                data = await callAIWithRetry(built.endpoint, built.body, {
                    label: i === 0 ? opts.label : `${opts.label} → ${MODEL_REGISTRY[modelId]?.displayName || modelId}`,
                    maxAttempts: cfg.maxAttempts,
                    requestTimeoutMs: cfg.requestTimeoutMs,
                    headers: built.headers,
                    onRetry: (attempt, total, status) =>
                        opts.onProgress?.(`${status} (attempt ${attempt}/${total})`),
                });
                modelSucceeded = true;
                break;
            } catch (err) {
                if (isNetworkInfraError(err) && netRetry < NET_RETRY_MAX) {
                    // Same-model retry - do NOT advance the chain.
                    const wait = NET_BACKOFF_MS[Math.min(netRetry, NET_BACKOFF_MS.length - 1)];
                    netRetry += 1;
                    console.warn(
                        `[modelRouter/${opts.deliverable}] model '${modelId}' NETWORK failure (proxy unreachable); ` +
                        `same-model retry ${netRetry}/${NET_RETRY_MAX} in ${wait}ms - NOT advancing chain`
                    );
                    opts.onProgress?.(
                        `Proxy briefly unreachable - retrying ${MODEL_REGISTRY[modelId]?.displayName || modelId} in ${wait / 1000}s (no chain advance)...`
                    );
                    await new Promise(r => setTimeout(r, wait));
                    // Health-check the proxy before next attempt so we don't
                    // keep firing into a dead socket.
                    if (!(await _proxyHealthOk())) {
                        // Still down; keep waiting (linear extra wait).
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    continue;
                }
                modelLevelErr = err;
                break;
            }
        }
        if (modelSucceeded) {
            const text = extractText(modelId, data);
            if (!text || !text.trim()) {
                modelLevelErr = new Error(`${modelId} returned empty content`);
            } else {
                // 2026-06-05 - drift-catcher C1: if we advanced past the chain
                // head (i > 0), commit the engagement to THIS provider so the
                // next deliverable doesn't re-attempt the failing head. Don't
                // commit when the head succeeded on first try (no drift signal).
                if (i > 0) {
                    const newProvider: CommittedProvider = providerOfModel(modelId);
                    const failedHead = chain[0];
                    void setCommitment(
                        newProvider,
                        `deliverable=${opts.deliverable} head=${failedHead} failed-> ${modelId}`,
                    ).catch(() => { /* commitment write is fire-and-forget */ });
                }
                return { text, modelUsed: modelId, raw: data };
            }
        }
        // Fall through to the chain-advance path with the model-level error.
        try {
            throw modelLevelErr ?? new Error(`${modelId} failed (no error captured)`);
        } catch (err) {
            lastErr = err;
            // Record provider-level throttle so subsequent calls route around it.
            if (isThrottleError(err)) recordProvider429(modelProvider(modelId));
            console.warn(
                `[modelRouter/${opts.deliverable}] model '${modelId}' failed: ` +
                `${String((err as any)?.message || err).slice(0, 180)} - advancing to next in chain`
            );
            continue;
        }
    }

    throw new Error(
        `[modelRouter/${opts.deliverable}] all models exhausted (${chain.join(' → ')}). ` +
        `Last error: ${String((lastErr as any)?.message || lastErr).slice(0, 220)}`
    );
}
