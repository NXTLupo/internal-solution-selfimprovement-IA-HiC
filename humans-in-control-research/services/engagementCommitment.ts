/**
 * engagementCommitment.ts - drift-catcher C1 (2026-06-05)
 *
 * Purpose: per-engagement provider stickiness. Once any fallback fires for an
 * engagement (e.g. Gemini → DeepSeek at the proxy boundary, or
 * deliverableModelRouter advances past Gemini Pro to Flash to GPT to Claude),
 * the WINNER provider is committed for the rest of the engagement. Every
 * subsequent call routes to the committed provider FIRST, preserving:
 *   - prompt-cache warmth (Anthropic / OpenAI both cache; Gemini doesn't)
 *   - consistent tool-call format
 *   - consistent response shape for downstream parsers
 *   - chat-history coherence (no mid-conversation provider flip)
 *
 * Composes with:
 *   - rate-limit pacer (proxy/rate_limit_pacer.py)        - the per-call defense
 *   - deliverableModelRouter (services/deliverableModelRouter.ts) - chain walk
 *   - traceRecorder (services/traceRecorder.ts)           - emits commitment_change
 *     trace turns so the epoch-proposer skill surfaces commitment churn via
 *     `grep "step_label":"commitment_change" sessions/<slug>/traces/<file>.json`
 *
 * Storage:
 *   Source of truth = proxy-side manifest at
 *   `hic-workspace/sessions/<slug>/manifest.json` field `committed_provider`.
 *   Module-local cache (per browser tab) holds the last read for low-latency
 *   chain-head decisions; we re-read on uncertainty.
 *
 * Self-improvement hook (per user direction 2026-06-05):
 *   Every commitment change emits a trace turn with step_label=
 *   'commitment_change', failure_class='provider_fallback', model_id=<new>,
 *   fallback_chain=[<old>, <new>]. The epoch-proposer's Step-2 grep
 *   ('"fallback_fired":true') surfaces it as an intervention candidate.
 */

import { recordTurn } from './traceRecorder';
import { engagementSlug } from './runState';

const PROXY_BASE = 'http://127.0.0.1:5012';

export type CommittedProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek';

export interface CommitmentRecord {
    /** Provider the engagement has committed to. null = no commitment yet. */
    provider: CommittedProvider | null;
    /** Human-readable reason; surfaces to the epoch proposer as trace note. */
    reason: string;
    /** Wall-clock when the commitment was set (UTC ms). */
    set_at_ms: number;
    /** Previous provider, if this was a change rather than first commit. */
    previous_provider?: CommittedProvider | null;
}

// --- module-local cache (per browser tab) -----------------------------------

const _cache: Map<string, CommitmentRecord> = new Map();

/** Slug for the active engagement, set by App.tsx on session init. The
 *  traceRecorder already reads `window.__hicCurrentEngagementSlug`; we reuse
 *  the same global so a single global gates both layers. */
function activeSlug(): string | null {
    const s = engagementSlug();
    return typeof s === 'string' && s.length > 0 ? s : null;
}

/** Optimistic read of the currently-committed provider for the active
 *  engagement. Returns null if no engagement or no commitment yet.
 *  Synchronous + cheap (no proxy round-trip). Use this in the router
 *  chain-head decision. The proxy is the source of truth; on a cache miss
 *  callers may want to `await fetchCommitment(slug)` once at engagement init. */
function getCommittedProvider(): CommittedProvider | null {
    const slug = activeSlug();
    if (!slug) return null;
    return _cache.get(slug)?.provider ?? null;
}


/** Force a re-read from the proxy. Use at engagement init so the cache is
 *  warm before the first AI call routes. Idempotent. */
export async function fetchCommitment(slug?: string): Promise<CommitmentRecord | null> {
    const s = slug || activeSlug();
    if (!s) return null;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/sessions/${encodeURIComponent(s)}/commitment`);
        if (!resp.ok) {
            // 2026-06-05 - Proxy now returns 200 with provider=null for cold
            // engagements (no console-noise 404s). Any non-2xx here is a real
            // proxy problem, not a cold-engagement state.
            console.warn(`[commitment] fetch HTTP ${resp.status} for slug=${s}`);
            return _cache.get(s) ?? null;
        }
        const data = await resp.json();
        // Uncommitted-engagement signal: provider=null OR _uncommitted=true.
        if (data && (data._uncommitted === true || data.provider == null)) {
            _cache.delete(s);
            return null;
        }
        if (data && typeof data === 'object' && 'provider' in data) {
            const rec: CommitmentRecord = {
                provider: data.provider,
                reason: data.reason || '',
                set_at_ms: data.set_at_ms || Date.now(),
                previous_provider: data.previous_provider,
            };
            _cache.set(s, rec);
            return rec;
        }
        return null;
    } catch (e: any) {
        console.warn('[commitment] fetch failed:', e?.message || e);
        return _cache.get(s) ?? null;
    }
}

/** Write a commitment. Persists to the proxy manifest AND emits a
 *  trace turn so the epoch proposer can mine commitment changes as an
 *  intervention signal. Idempotent: writing the same provider as already
 *  committed is a no-op (no trace, no proxy write).
 *
 *  Call this from:
 *    1. Proxy fallback boundary (the proxy itself writes via the AI endpoints
 *       on Gemini-429 / OpenAI-429 → DeepSeek route).
 *    2. deliverableModelRouter when it advances past the chain head.
 *    3. corpusChatService when a tool-loop iteration switches model. */
export async function setCommitment(
    provider: CommittedProvider,
    reason: string,
    slug?: string,
): Promise<void> {
    const s = slug || activeSlug();
    if (!s) return;
    const prior = _cache.get(s);
    if (prior?.provider === provider) {
        // No-op: provider unchanged.
        return;
    }
    const rec: CommitmentRecord = {
        provider,
        reason: reason.slice(0, 240),
        set_at_ms: Date.now(),
        previous_provider: prior?.provider ?? null,
    };
    _cache.set(s, rec);

    // Trace-turn emit. step_label='commitment_change' lets the epoch
    // proposer's failure-surface grep find these in a single pass:
    //   grep -l '"step_label":"commitment_change"' sessions/*/traces/*.json
    try {
        recordTurn({
            step_label: 'commitment_change',
            model_id: provider,
            prompt: `[commitment] previous=${prior?.provider || 'none'} new=${provider} reason="${rec.reason}"`,
            response: JSON.stringify(rec),
            started_at: rec.set_at_ms,
            attempts: 1,
            fallback_fired: prior?.provider != null && prior.provider !== provider,
            fallback_chain: prior?.provider ? [prior.provider, provider] : undefined,
            note: 'engagement-commitment-record',
        });
    } catch (e: any) {
        console.warn('[commitment] trace emit failed (non-fatal):', e?.message || e);
    }

    // Proxy write - fire and forget, short ceiling. The proxy fallback paths
    // also write directly, so a dropped POST here is recoverable on the next
    // fallback. We never block the user-visible call on this write.
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        try {
            await fetch(`${PROXY_BASE}/api/sessions/${encodeURIComponent(s)}/commitment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rec),
                signal: ctrl.signal,
            });
        } finally {
            clearTimeout(timer);
        }
    } catch (e: any) {
        console.warn('[commitment] proxy POST failed (cached locally):', e?.message || e);
    }
}


/** Map a model id to its provider family. Mirrors deliverableModelRouter's
 *  internal mapping but exported here so other layers don't have to import
 *  the router just to ask this question. */
export function providerOfModel(modelId: string): CommittedProvider {
    const m = modelId.toLowerCase();
    if (m.startsWith('claude')) return 'anthropic';
    if (m.startsWith('gpt') || m.includes('openai')) return 'openai';
    if (m.startsWith('deepseek')) return 'deepseek';
    return 'gemini';
}

/** Convenience: reorder a model chain to put committed-provider models first.
 *  Used by deliverableModelRouter.resolveModelChain. */
export function reorderChainByCommitment(chain: string[]): string[] {
    const committed = getCommittedProvider();
    if (!committed || chain.length === 0) return chain;
    const matches = chain.filter(m => providerOfModel(m) === committed);
    const others = chain.filter(m => providerOfModel(m) !== committed);
    if (matches.length === 0) return chain;
    return [...matches, ...others];
}
