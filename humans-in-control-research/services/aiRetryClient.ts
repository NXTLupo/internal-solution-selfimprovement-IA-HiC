// aiRetryClient.ts - 2026-05-12
//
// Shared retry-with-backoff client for ALL AI endpoint fetches in HiC.
// Gemini / OpenAI / Anthropic / Gemini-compat all return transient 5xx
// (503 Service Unavailable, 502 Bad Gateway) and 429 (rate limit) errors
// under load. Without retry, a single transient failure kills the
// caller - recommendations generation, an artifact build, a research
// stage, a chip suggestion.
//
// This helper wraps fetch with exponential backoff (1s / 3s / 7s) on:
//   - HTTP 5xx (server-side transient failures)
//   - HTTP 429 (rate-limit; longer backoff because the API explicitly
//     asked us to slow down - 5s / 12s / 30s)
//   - Network failures (ERR_EMPTY_RESPONSE, fetch failed, AbortError)
//
// Does NOT retry on 4xx (config errors should fail loudly) or on a
// successful response.
//
// Returns the parsed JSON response on success. Throws with a clear
// user-facing error message on persistent failure.

import { recordAICall } from './costMeter';
// 2026-05-24 NotebookLM uplift Wire 2: multi-model resilience layer
import {
    isProviderHealthy,
    recordProvider429,
    recordProviderSuccess,
    type Provider,
} from './multiModelResilience';

const PROXY_BASE = 'http://127.0.0.1:5012';

// Map endpoint-id → provider for health tracking
function endpointToProvider(endpointId: AIEndpointId): Provider | null {
    switch (endpointId) {
        case 'gemini':        return 'gemini';
        case 'gemini-compat': return 'gemini';
        case 'gemini-image':  return 'gemini';
        case 'openai':        return 'openai';
        case 'anthropic':     return 'anthropic';
        default:              return null;
    }
}

export type RetryProgress = (attempt: number, total: number, status: string) => void;

export type AIEndpointId =
    | 'gemini'             // /api/ai/gemini - native Gemini
    | 'gemini-compat'      // /api/ai/gemini-compat - OpenAI-compatible Gemini
    | 'openai'             // /api/ai/openai - OpenAI / GPT
    | 'anthropic'          // /api/ai/anthropic - Claude
    | 'gemini-image'       // /api/ai/gemini-image - Imagen
    ;

export interface CallAIOptions {
    /** Logical label used in console logs + user-facing error messages.
     *  Example: 'Recommendations', 'Brief generation', 'Theme depth'. */
    label: string;
    /** Maximum retry attempts. Default 3. */
    maxAttempts?: number;
    /** Custom backoff schedule in ms. Defaults: 5xx → [1000, 3000, 7000], 429 → [5000, 12000, 30000]. */
    backoffMs?: number[];
    /** Optional headers (Content-Type is set automatically). */
    headers?: Record<string, string>;
    /** Optional progress callback fired on each retry. */
    onRetry?: RetryProgress;
    /** Per-request fetch timeout in milliseconds. Default 300_000 (5 min).
     *  Long-running stages like prototype Stage 4 / Stage 3.5 can take 90-180s
     *  with high thinking budget; we cap at 5 min so a truly hung backend
     *  fails cleanly instead of blocking the UI forever. The heaviest #proto
     *  Opus stages (orchestrator + full catalog, reviewer + whole assembled app
     *  at 64K output + adaptive thinking) legitimately need more — they pass
     *  600_000 and pair it with retryOnTimeout:false (below). */
    requestTimeoutMs?: number;
    /** Whether a genuine request TIMEOUT (AbortSignal fired) should be retried.
     *  Default true (preserves global behavior). A timeout is NOT transient like
     *  a 5xx/429 — retrying the same too-slow call with the same ceiling just
     *  burns maxAttempts × timeout (e.g. 3 × 600s = 30 min) and still fails.
     *  Set FALSE on calls that have their own fast fallback (the #proto stages
     *  fall back to Gemini) so a timeout fails ONCE and the fallback fires
     *  immediately. Transient 5xx/429 retries are unaffected. */
    retryOnTimeout?: boolean;
}

/** Map endpoint id to its proxy URL + the model-family name surfaced in error messages. */
function resolveEndpoint(endpointId: AIEndpointId): { url: string; family: string } {
    switch (endpointId) {
        case 'gemini':        return { url: `${PROXY_BASE}/api/ai/gemini`,        family: 'Gemini' };
        case 'gemini-compat': return { url: `${PROXY_BASE}/api/ai/gemini-compat`, family: 'Gemini' };
        case 'openai':        return { url: `${PROXY_BASE}/api/ai/openai`,        family: 'OpenAI / GPT' };
        case 'anthropic':     return { url: `${PROXY_BASE}/api/ai/anthropic`,     family: 'Claude' };
        case 'gemini-image':  return { url: `${PROXY_BASE}/api/ai/gemini-image`,  family: 'Gemini Image' };
    }
}

const DEFAULT_BACKOFF_5XX = [1000, 3000, 7000];
const DEFAULT_BACKOFF_429 = [5000, 12000, 30000];

/**
 * Call an AI endpoint with exponential-backoff retry on transient failures.
 *
 * @example
 *   const data = await callAIWithRetry('gemini', {
 *     model: 'gemini-3.1-pro-preview',
 *     systemInstruction: { parts: [{ text: systemPrompt }] },
 *     contents: [{ role: 'user', parts: [{ text: payload }] }],
 *     config: { temperature: 0.7, maxOutputTokens: 32000, thinkingBudget: 'high' },
 *   }, { label: 'Recommendations', onRetry: (a, t, s) => updateChatMessage(s) });
 */
export async function callAIWithRetry(
    endpointId: AIEndpointId,
    body: any,
    options: CallAIOptions,
): Promise<any> {
    const { url, family } = resolveEndpoint(endpointId);
    const label = options.label;
    const maxAttempts = options.maxAttempts ?? 3;
    let lastStatus = 0;
    let lastErrText = '';

    const timeoutMs = options.requestTimeoutMs ?? 300_000;
    // 2026-06-05 - drift-catcher C1: thread the active engagement slug through
    // the proxy so server-side fallback paths can write per-engagement
    // provider commitments. window.__hicCurrentEngagementSlug is the same
    // global the traceRecorder reads - single source of truth for "which
    // engagement is this call for?" Skip the header when no slug is set
    // (pre-engagement bootstrap calls).
    const sessionSlug = (typeof window !== 'undefined'
        ? (window as any).__hicCurrentEngagementSlug
        : undefined);
    const sessionHeader = (typeof sessionSlug === 'string' && sessionSlug.length > 0)
        ? { 'x-hic-session': sessionSlug }
        : {};
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const callStart = Date.now();
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...sessionHeader, ...(options.headers || {}) },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (resp.ok) {
                const parsed = await resp.json();
                // 2026-05-14 - Cost meter accounting. The body may carry the
                // model id directly (Gemini native) or nested (OpenAI compat).
                // We try the obvious locations; recordAICall normalizes.
                try {
                    const modelHint = body?.model || body?.config?.model || undefined;
                    recordAICall({ label, model: modelHint, response: parsed, durationMs: Date.now() - callStart });
                } catch (meterErr) {
                    // Cost meter must never break a real call.
                    console.warn('[CostMeter] record failed (non-fatal):', meterErr);
                }
                // 2026-05-24 Wire 2: reset provider 429 streak on success
                const prov = endpointToProvider(endpointId);
                if (prov) recordProviderSuccess(prov);
                // 2026-06-05 - drift-catcher C1: when the proxy fell back to
                // DeepSeek (Gemini-429 or OpenAI-429 path), it returns
                // _engagement_committed_to in the body. Mirror that into the
                // SPA commitment cache so subsequent router decisions agree
                // with the proxy's view of "which provider this engagement
                // is on now." Async import keeps the dep out of the hot path
                // when the response is a normal success.
                const committedTo = (parsed && (parsed as any)._engagement_committed_to);
                if (committedTo && typeof committedTo === 'string') {
                    void import('./engagementCommitment')
                        .then(m => m.setCommitment(committedTo as any,
                            `proxy fallback (label=${label}) committed engagement`))
                        .catch(() => { /* non-fatal */ });
                }
                return parsed;
            }
            lastStatus = resp.status;
            lastErrText = await resp.text().catch(() => '');

            // 4xx (excluding 429) - config error, fail loudly
            if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
                throw new Error(`${label} (${family}) returned HTTP ${resp.status}: ${lastErrText.slice(0, 300)}`);
            }

            // 2026-05-24 Wire 2: record 429 in provider health tracker so
            // future health-aware routing skips this provider for 10min.
            if (resp.status === 429) {
                const prov = endpointToProvider(endpointId);
                if (prov) recordProvider429(prov, 429);
            }

            // 429 - rate-limited. Use the longer backoff schedule.
            // 5xx - server overload. Use the standard schedule.
            const schedule = resp.status === 429
                ? (options.backoffMs ?? DEFAULT_BACKOFF_429)
                : (options.backoffMs ?? DEFAULT_BACKOFF_5XX);
            const reason = resp.status === 429 ? 'rate-limited' : 'overloaded';

            console.warn(`[aiRetry/${label}] ${family} HTTP ${resp.status} ${reason} (attempt ${attempt + 1}/${maxAttempts}): ${lastErrText.slice(0, 200)}`);
            if (options.onRetry) {
                const waitMs = schedule[Math.min(attempt, schedule.length - 1)];
                options.onRetry(attempt + 1, maxAttempts, `${family} ${resp.status} (${reason}) - retrying in ${waitMs / 1000}s`);
            }
            if (attempt < maxAttempts - 1) {
                await new Promise(r => setTimeout(r, schedule[Math.min(attempt, schedule.length - 1)]));
                continue;
            }
        } catch (e: any) {
            // Re-throw user-thrown errors (4xx-from-above) so they bubble up immediately
            if (e?.message?.includes('returned HTTP 4')) throw e;
            lastErrText = e?.message || String(e);
            // A genuine request TIMEOUT (AbortSignal.timeout fired) is not
            // transient. When the caller opted out of retrying timeouts (it has
            // its own fast fallback), throw immediately so the fallback fires
            // instead of waiting out maxAttempts × the (already-long) ceiling.
            const isTimeout = e?.name === 'TimeoutError' || /timed out|aborted/i.test(lastErrText);
            if (isTimeout && options.retryOnTimeout === false) {
                throw new Error(`${label} (${family}): timed out after ${Math.round(timeoutMs / 1000)}s; not retrying (caller has a fallback).`);
            }
            console.warn(`[aiRetry/${label}] ${family} network failure (attempt ${attempt + 1}/${maxAttempts}): ${lastErrText.slice(0, 200)}`);
            if (options.onRetry) {
                const schedule = options.backoffMs ?? DEFAULT_BACKOFF_5XX;
                const waitMs = schedule[Math.min(attempt, schedule.length - 1)];
                options.onRetry(attempt + 1, maxAttempts, `Network failure - retrying in ${waitMs / 1000}s`);
            }
            if (attempt < maxAttempts - 1) {
                const schedule = options.backoffMs ?? DEFAULT_BACKOFF_5XX;
                await new Promise(r => setTimeout(r, schedule[Math.min(attempt, schedule.length - 1)]));
                continue;
            }
            // Final attempt - re-throw with a clearer user-facing message
            if (lastErrText.includes('Failed to fetch') || lastErrText.includes('ERR_EMPTY_RESPONSE') || lastErrText.includes('AbortError')) {
                throw new Error(`${label} (${family}): network connection to research proxy failed after ${maxAttempts} attempts. Check that the research-proxy container is running and reachable on port 5012.`);
            }
            throw e;
        }
    }

    // Exhausted retries on persistent transient error - friendly message
    const friendly = lastStatus === 503
        ? `${family} API temporarily overloaded (HTTP 503). The model service is under heavy load right now - please retry in a moment. (${label})`
        : lastStatus === 429
            ? `${family} API rate-limited (HTTP 429) - quota exhausted or burst limit hit. Wait a minute and try again. (${label})`
            : lastStatus === 502 || lastStatus === 504
                ? `${family} API gateway error (HTTP ${lastStatus}) - upstream timeout. Retry in a moment. (${label})`
                : lastStatus >= 500
                    ? `${family} API returned HTTP ${lastStatus} after ${maxAttempts} attempts. (${label})`
                    : `${label} (${family}): HTTP ${lastStatus}: ${lastErrText.slice(0, 200)}`;
    throw new Error(friendly);
}

/** Convenience wrapper for Gemini native - the most-used endpoint. */
export async function callGemini(body: any, options: CallAIOptions): Promise<any> {
    return callAIWithRetry('gemini', body, options);
}

/** Convenience wrapper for OpenAI-compatible chat (used by composer + prototype). */
export async function callOpenAI(body: any, options: CallAIOptions & { openAIEndpoint?: 'chat' | 'completion' } = { label: 'OpenAI' }): Promise<any> {
    const headers = { ...(options.headers || {}), 'x-openai-endpoint': options.openAIEndpoint || 'chat' };
    return callAIWithRetry('openai', body, { ...options, headers });
}

/** Convenience wrapper for Anthropic / Claude. */
export async function callAnthropic(body: any, options: CallAIOptions): Promise<any> {
    return callAIWithRetry('anthropic', body, options);
}

/** Convenience wrapper for Gemini OpenAI-compat (used by prototype Stage 4 etc). */
export async function callGeminiCompat(body: any, options: CallAIOptions & { openAIEndpoint?: 'chat' | 'completion' } = { label: 'Gemini-compat' }): Promise<any> {
    const headers = { ...(options.headers || {}), 'x-openai-endpoint': options.openAIEndpoint || 'chat' };
    return callAIWithRetry('gemini-compat', body, { ...options, headers });
}
