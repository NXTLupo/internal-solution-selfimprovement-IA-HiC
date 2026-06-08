/**
 * networkResilient.ts - the P2 substrate (plans/volume-to-insight-substrate-2026-06-03.md §P2).
 *
 * Single function `resilientFetch` that wraps every transient-failure-prone
 * fetch in the SPA. Replaces the per-call-site bespoke retry code paths that
 * silently failed in the user's 2026-06-05 console log (GoalRegrade 0/218,
 * 3 wiki-write losses, topic-model status poll dropped).
 *
 * Contract:
 *   - Detect transient: ERR_NETWORK_CHANGED, generic network errors, 5xx, 408,
 *     and 429 (with Retry-After honor).
 *   - Backoff: exponential with jitter; capped per opts.initialBackoffMs *
 *     2^attempt + uniform(0..500ms).
 *   - Abort: caller AbortSignal is honored; an internal total-timeout signal
 *     fires after opts.timeoutMs and aborts the in-flight attempt.
 *   - Telemetry: every transient, retried-success, exhausted, app-level, and
 *     timeout event lands in errorTelemetry.ts as a structured FailureEvent.
 *   - Throws structured errors with `.attempts: AttemptDigest[]` so callers
 *     and the Step-7 epoch proposer can trace what happened.
 *
 * Off the hot path on success: zero retries → one fetch → one parse → return.
 * No allocations beyond the response body. The cost only appears when the
 * network actually fails (which is when you want it).
 *
 * Composes with rate-limit-pacer skill (when wired): if the pacer signals a
 * provider is throttled, callers can pre-await the pacer's permit before
 * calling resilientFetch - networkResilient does NOT itself manage provider
 * quotas because they're a cross-cutting concern best resolved before fetch.
 */

import { recordFailure } from './errorTelemetry';

export interface ResilientFetchOpts {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: BodyInit | null;
    /** Max retries before giving up. Default 4. Total attempts = retries + 1. */
    maxRetries?: number;
    /** Initial backoff in ms. Doubles each attempt + jitter. Default 1000. */
    initialBackoffMs?: number;
    /** Hard ceiling on total wall-time including all retries. Default 60000. */
    timeoutMs?: number;
    /** Caller-supplied AbortSignal merged with the internal timeout signal. */
    signal?: AbortSignal;
    /** Label for telemetry. REQUIRED. Examples: 'wiki-write', 'goal-regrade-item'. */
    label: string;
    /** Optional caller annotation per event (e.g. 'item 47 of 218'). */
    note?: string;
    /** Treat the parsed-JSON response as transient (e.g. app-level retry triggers). Default: never. */
    isAppLevelTransient?: (json: unknown) => boolean;
    /** Parse the response body as. Default 'json'. */
    expect?: 'json' | 'text' | 'blob' | 'raw';
}

export interface AttemptDigest {
    attempt: number;
    status?: number;
    network_error?: string;
    error_excerpt?: string;
    elapsed_ms: number;
}

export class ResilientFetchError extends Error {
    constructor(
        message: string,
        public readonly url: string,
        public readonly label: string,
        public readonly attempts: AttemptDigest[],
        public readonly finalKind: 'exhausted' | 'timeout' | 'app-level',
    ) {
        super(message);
        this.name = 'ResilientFetchError';
    }
}

const NETWORK_TRANSIENT_PATTERNS = [
    'ERR_NETWORK_CHANGED',
    'ECONNRESET',
    'ETIMEDOUT',
    'socket hang up',
    'fetch failed',
    'Failed to fetch',
    'NetworkError',
    'network error',
    'load failed',
];

function isNetworkTransientError(e: unknown): { transient: boolean; label: string } {
    const msg = e instanceof Error ? e.message : String(e || '');
    for (const pat of NETWORK_TRANSIENT_PATTERNS) {
        if (msg.includes(pat)) return { transient: true, label: pat };
    }
    return { transient: false, label: msg.slice(0, 80) };
}

function isHttpTransient(status: number): boolean {
    if (status === 408 || status === 425 || status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
}

function backoffMs(attempt: number, initial: number, retryAfter?: number | null): number {
    if (typeof retryAfter === 'number' && retryAfter > 0) {
        // Honor server's Retry-After. Cap at 30s so a misconfigured upstream
        // doesn't pause the engagement indefinitely.
        return Math.min(retryAfter * 1000, 30_000);
    }
    const base = initial * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 500;
    return Math.min(base + jitter, 30_000);
}

function parseRetryAfter(headers: Headers): number | null {
    const ra = headers.get('Retry-After');
    if (!ra) return null;
    const asNum = Number(ra);
    if (!Number.isNaN(asNum)) return asNum;
    const asDate = Date.parse(ra);
    if (!Number.isNaN(asDate)) return Math.max(0, (asDate - Date.now()) / 1000);
    return null;
}

/** Wait while honoring an AbortSignal - rejects with AbortError if signal fires. */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
        const t = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        function onAbort() {
            clearTimeout(t);
            reject(new DOMException('Aborted', 'AbortError'));
        }
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

/**
 * The substrate. Use this instead of bare fetch wherever a network drop or
 * 5xx hiccup would corrupt user data or stall the pipeline.
 */
export async function resilientFetch<T = unknown>(url: string, opts: ResilientFetchOpts): Promise<T> {
    const maxRetries = opts.maxRetries ?? 4;
    const initialBackoff = opts.initialBackoffMs ?? 1000;
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const expect = opts.expect ?? 'json';

    const start = Date.now();
    const attempts: AttemptDigest[] = [];

    // Total-timeout controller - merged with caller's signal.
    const totalCtrl = new AbortController();
    const totalTimer = setTimeout(() => totalCtrl.abort(), timeoutMs);
    const mergedSignal = mergeSignals(opts.signal, totalCtrl.signal);

    try {
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            const attemptStart = Date.now();
            // If we've already exceeded total budget, fail fast.
            if (Date.now() - start >= timeoutMs) {
                const digest: AttemptDigest = {
                    attempt,
                    elapsed_ms: Date.now() - attemptStart,
                    error_excerpt: 'total timeoutMs exceeded before attempt',
                };
                attempts.push(digest);
                recordFailure({
                    label: opts.label, kind: 'timeout', attempt,
                    elapsed_ms: Date.now() - start,
                    error_excerpt: 'total timeoutMs exceeded',
                    note: opts.note,
                });
                throw new ResilientFetchError(
                    `[${opts.label}] timeout after ${Date.now() - start}ms (${attempt - 1} attempts)`,
                    url, opts.label, attempts, 'timeout',
                );
            }

            let resp: Response;
            try {
                resp = await fetch(url, {
                    method: opts.method || 'GET',
                    headers: opts.headers,
                    body: opts.body,
                    signal: mergedSignal,
                });
            } catch (fetchErr: unknown) {
                const elapsed = Date.now() - attemptStart;
                const { transient, label } = isNetworkTransientError(fetchErr);
                attempts.push({
                    attempt, elapsed_ms: elapsed,
                    network_error: label,
                    error_excerpt: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
                });
                if (!transient || attempt > maxRetries) {
                    const finalKind: 'exhausted' | 'timeout' = (totalCtrl.signal.aborted ? 'timeout' : 'exhausted');
                    recordFailure({
                        label: opts.label, kind: finalKind, attempt,
                        elapsed_ms: Date.now() - start,
                        network_error: label,
                        error_excerpt: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
                        note: opts.note,
                    });
                    throw new ResilientFetchError(
                        `[${opts.label}] ${finalKind} after ${attempt} attempt(s): ${label}`,
                        url, opts.label, attempts, finalKind,
                    );
                }
                recordFailure({
                    label: opts.label, kind: 'transient', attempt,
                    elapsed_ms: elapsed,
                    network_error: label,
                    error_excerpt: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
                    note: opts.note,
                });
                await abortableSleep(backoffMs(attempt, initialBackoff), mergedSignal);
                continue;
            }

            // We have a Response. Decide if it's success / app-level fail / transient.
            const elapsed = Date.now() - attemptStart;
            const status = resp.status;

            if (status >= 200 && status < 300) {
                if (attempts.length > 0) {
                    recordFailure({
                        label: opts.label, kind: 'retried-success', attempt,
                        elapsed_ms: Date.now() - start, status,
                        note: opts.note,
                    });
                }
                // Parse body per `expect`.
                if (expect === 'raw') return resp as unknown as T;
                if (expect === 'blob') return (await resp.blob()) as unknown as T;
                if (expect === 'text') return (await resp.text()) as unknown as T;
                let parsed: unknown;
                try { parsed = await resp.json(); } catch (parseErr: any) {
                    attempts.push({
                        attempt, status, elapsed_ms: elapsed,
                        error_excerpt: `parse: ${parseErr?.message || parseErr}`,
                    });
                    recordFailure({
                        label: opts.label, kind: 'app-level', attempt,
                        elapsed_ms: Date.now() - start, status,
                        error_excerpt: `JSON parse failed: ${parseErr?.message || parseErr}`,
                        note: opts.note,
                    });
                    throw new ResilientFetchError(
                        `[${opts.label}] response not JSON: ${parseErr?.message || parseErr}`,
                        url, opts.label, attempts, 'app-level',
                    );
                }
                if (opts.isAppLevelTransient && opts.isAppLevelTransient(parsed)) {
                    attempts.push({ attempt, status, elapsed_ms: elapsed, error_excerpt: 'app-level transient' });
                    if (attempt > maxRetries) {
                        recordFailure({
                            label: opts.label, kind: 'exhausted', attempt,
                            elapsed_ms: Date.now() - start, status,
                            error_excerpt: 'app-level transient ran out of retries',
                            note: opts.note,
                        });
                        throw new ResilientFetchError(
                            `[${opts.label}] app-level transient exhausted after ${attempt} attempts`,
                            url, opts.label, attempts, 'exhausted',
                        );
                    }
                    recordFailure({
                        label: opts.label, kind: 'transient', attempt,
                        elapsed_ms: elapsed, status,
                        error_excerpt: 'app-level transient',
                        note: opts.note,
                    });
                    await abortableSleep(backoffMs(attempt, initialBackoff), mergedSignal);
                    continue;
                }
                return parsed as T;
            }

            // Non-2xx. Read body excerpt for telemetry.
            let bodyText = '';
            try { bodyText = (await resp.text()).slice(0, 240); } catch { /* ignore */ }
            attempts.push({ attempt, status, elapsed_ms: elapsed, error_excerpt: bodyText || `HTTP ${status}` });

            if (!isHttpTransient(status) || attempt > maxRetries) {
                const finalKind: 'exhausted' | 'app-level' = isHttpTransient(status) ? 'exhausted' : 'app-level';
                recordFailure({
                    label: opts.label, kind: finalKind, attempt,
                    elapsed_ms: Date.now() - start, status,
                    error_excerpt: bodyText,
                    note: opts.note,
                });
                throw new ResilientFetchError(
                    `[${opts.label}] HTTP ${status} (${finalKind}) after ${attempt} attempt(s): ${bodyText.slice(0, 120)}`,
                    url, opts.label, attempts, finalKind,
                );
            }

            // Transient HTTP - log + backoff (honor Retry-After if 429 with header).
            recordFailure({
                label: opts.label, kind: 'transient', attempt,
                elapsed_ms: elapsed, status,
                error_excerpt: bodyText,
                note: opts.note,
            });
            const retryAfter = status === 429 ? parseRetryAfter(resp.headers) : null;
            await abortableSleep(backoffMs(attempt, initialBackoff, retryAfter), mergedSignal);
        }
        // Unreachable - the for-loop's exit conditions throw.
        throw new ResilientFetchError(
            `[${opts.label}] internal: fell out of retry loop`,
            url, opts.label, attempts, 'exhausted',
        );
    } finally {
        clearTimeout(totalTimer);
    }
}

/** Merge two AbortSignals into one. Returned signal fires when either source fires. */
function mergeSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
    if (!a) return b;
    if (a.aborted) return a;
    if (b.aborted) return b;
    const ctrl = new AbortController();
    const onA = () => ctrl.abort();
    const onB = () => ctrl.abort();
    a.addEventListener('abort', onA, { once: true });
    b.addEventListener('abort', onB, { once: true });
    return ctrl.signal;
}
