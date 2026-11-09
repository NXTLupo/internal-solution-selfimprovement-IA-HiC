// services/multiModelResilience.ts
// TypeScript port of the four-layer multi-model resilience pattern from proxy/topic_modeling.py.
// Per feedback_multi_model_resilience_pattern standing rule.
//
// 2026-05-24 - Phase 1.3 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
//
// The four layers:
//   1. Content-hash cache (provider-keyed)
//   2. Provider health tracker (skip 429'd providers for 10min)
//   3. Per-corpus provider commitment (no mid-corpus switching)
//   4. Signature-keyed cache for LLM identity-class calls

export type Provider = 'anthropic' | 'gemini' | 'openai' | 'deepseek' | 'jina_reader';

export type ProviderHealth = {
    last_429_at: number;        // ms epoch
    consecutive_429s: number;
    total_429s: number;
    total_calls: number;
};

const THROTTLE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const _providerHealth: Record<Provider, ProviderHealth> = {
    anthropic: { last_429_at: 0, consecutive_429s: 0, total_429s: 0, total_calls: 0 },
    gemini: { last_429_at: 0, consecutive_429s: 0, total_429s: 0, total_calls: 0 },
    openai: { last_429_at: 0, consecutive_429s: 0, total_429s: 0, total_calls: 0 },
    deepseek: { last_429_at: 0, consecutive_429s: 0, total_429s: 0, total_calls: 0 },
    jina_reader: { last_429_at: 0, consecutive_429s: 0, total_429s: 0, total_calls: 0 },
};


export function isProviderHealthy(provider: Provider): boolean {
    const h = _providerHealth[provider];
    if (!h || h.last_429_at === 0) return true;
    return (Date.now() - h.last_429_at) > THROTTLE_COOLDOWN_MS;
}


export function recordProvider429(provider: Provider, statusCode?: number): void {
    const h = _providerHealth[provider];
    if (!h) return;
    h.last_429_at = Date.now();
    h.consecutive_429s += 1;
    h.total_429s += 1;
    if (typeof console !== 'undefined') {
        console.warn(
            `[multiModelResilience] provider '${provider}' 429 recorded ` +
            `(consecutive=${h.consecutive_429s}, total=${h.total_429s}, status=${statusCode ?? 'n/a'})`
        );
    }
}


export function recordProviderSuccess(provider: Provider): void {
    const h = _providerHealth[provider];
    if (!h) return;
    h.consecutive_429s = 0;
    h.total_calls += 1;
}




/**
 * Deterministic hash used for:
 *   - Content-hash embedding cache key:   sha256(provider || content)
 *   - Cluster-signature name cache key:    sha256(top_terms || sample_titles || goal)
 *
 * The browser doesn't have a sync sha256; we use a stable djb2-style hash here
 * which is sufficient for cache keys (collision rate ~2^-32). For cryptographic
 * use, the Python side at proxy/topic_modeling.py uses real sha256.
 */
export function stableHash(...parts: string[]): string {
    const input = parts.join('|');
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash) + input.charCodeAt(i);
        hash = hash >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}




export type DegradationEventKind =
    | 'model_substitution'
    | 'feature_omission'
    | 'truncation_close'
    | 'chunked_to_single_shot'
    | 'rate_limited_retry'
    | 'content_filter_fallback'
    | 'cache_used_instead_of_fresh'
    | 'evidence_thin'
    | 'partial_chunk_failure'
    | 'paint_sync_degraded';

export type DegradationEvent = {
    kind: DegradationEventKind;
    stage: string;
    requested?: string;
    actual?: string;
    detail: string;
    timestamp: string;
    recoverable: boolean;
    user_action: 'retry_now' | 'investigate' | 'accept_and_continue' | 'no_action_needed';
    event_id: string;
};

let _eventIdCounter = 0;

export function emitDegradationEvent(
    partial: Omit<DegradationEvent, 'timestamp' | 'event_id'>
): DegradationEvent {
    _eventIdCounter += 1;
    return {
        ...partial,
        timestamp: new Date().toISOString(),
        event_id: `de_${Date.now()}_${_eventIdCounter}`,
    };
}


/**
 * Wrap any provider-bound async call with the resilience layer.
 *
 * On a 429 (per the response or the thrown error), records provider health
 * and (if a fallback provider list is supplied) auto-routes to the next healthy
 * provider. Emits a degradation event when fallback fires.
 */
export type ResilientCallOpts<T> = {
    primary: Provider;
    fallbacks?: Provider[];
    invoke: (provider: Provider) => Promise<T>;
    is429: (err: unknown) => boolean;
    stage: string;
    surfaceDegradation?: (event: DegradationEvent) => void;
};

export async function withResilience<T>(opts: ResilientCallOpts<T>): Promise<{
    result: T;
    actualProvider: Provider;
    degradationEvents: DegradationEvent[];
}> {
    const candidates: Provider[] = [opts.primary, ...(opts.fallbacks ?? [])];
    const tried: Provider[] = [];
    const degradationEvents: DegradationEvent[] = [];
    let lastErr: unknown = null;

    for (const provider of candidates) {
        if (!isProviderHealthy(provider) && provider !== candidates[candidates.length - 1]) {
            // Skip throttled providers UNLESS it's the last option (try anyway)
            continue;
        }
        tried.push(provider);
        try {
            const result = await opts.invoke(provider);
            recordProviderSuccess(provider);
            if (provider !== opts.primary) {
                const event = emitDegradationEvent({
                    kind: 'model_substitution',
                    stage: opts.stage,
                    requested: opts.primary,
                    actual: provider,
                    detail: `Primary provider ${opts.primary} unavailable; routed to ${provider}`,
                    recoverable: true,
                    user_action: 'no_action_needed',
                });
                degradationEvents.push(event);
                opts.surfaceDegradation?.(event);
            }
            return { result, actualProvider: provider, degradationEvents };
        } catch (err) {
            lastErr = err;
            if (opts.is429(err)) {
                recordProvider429(provider);
                continue; // try next fallback
            }
            // Non-429 error - re-throw
            throw err;
        }
    }

    throw new Error(
        `All providers exhausted at stage='${opts.stage}'. Tried: ${tried.join(', ')}. ` +
        `Last error: ${String(lastErr).slice(0, 200)}`
    );
}


/**
 * Provider unavailable (2026-10-05): throttling OR an outage - 5xx, a network failure, a timeout. Deliverable paths
 * use this as their fallback trigger; throttle-only matching left a 502 or "All connection attempts failed" with no
 * fallback at all.
 */
export function isProviderUnavailableError(err: unknown): boolean {
    if (isThrottleError(err)) return true;
    const msg = String((err as any)?.message || err || '').toLowerCase();
    return /\b50[0234]\b|overloaded|unavailable|timed out|timeout|all connection attempts failed|connect(?:ion)? ?(?:error|refused|reset)|econn|etimedout|fetch failed|failed to fetch|networkerror|aborterror/.test(msg);
}

/**
 * Default 429 detector - checks error message for common throttle signals.
 */
export function isThrottleError(err: unknown): boolean {
    const msg = String(err ?? '').toLowerCase();
    return (
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('rate_limit') ||
        msg.includes('insufficient') ||
        msg.includes('billing')
    );
}
