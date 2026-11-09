/**
 * sharedGet.ts - 2026-10-31 (agent-stack plan, sixth pass)
 *
 * One GET per URL, shared by every caller inside a short window. Measured live on the 371-turn Northeastern session:
 * each chat message's GenerationReceipt and FeedbackWidget fetched /api/skill/list-versions,
 * synthesis/quality-scores.md and /api/feedback/index on mount, about 300 identical requests within 15 ms. They held
 * the browser's six connections to the proxy, and the request-plan call queued behind them until its 15 s budget ran
 * out without ever being sent (Playwright request timing: requestStart -1, aborted).
 *
 * A failed or non-OK response is not remembered, so the next caller tries again.
 */
const cache = new Map<string, { at: number; p: Promise<any> }>();

export function sharedJson<T = any>(url: string, ttlMs = 60_000, fetchImpl: typeof fetch = globalThis.fetch): Promise<T | null> {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < ttlMs) return hit.p;
    const p: Promise<T | null> = fetchImpl(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
    cache.set(url, { at: Date.now(), p });
    p.then(v => { if (v === null && cache.get(url)?.p === p) cache.delete(url); });
    return p;
}

/** Drop one URL (after a write that changes it), or everything. */
export function forgetShared(url?: string): void {
    if (url) cache.delete(url);
    else cache.clear();
}
