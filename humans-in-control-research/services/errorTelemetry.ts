/**
 * errorTelemetry.ts - P2 substrate for the network-resilience layer.
 *
 * The failure-event ring buffer that `networkResilient.ts` writes into. Every
 * transient detected, every retry attempt, every retried-success, every
 * exhausted-retry, every app-level failure lands here as a structured event.
 *
 * Why this exists as its own module:
 *   - Decouples the network layer from any UI consumer. The Reasoning Stream
 *     Anomaly Panel (Step-6 surface) reads from here without coupling to fetch.
 *   - Decouples from M1 traceRecorder so failures stream independently of
 *     synthesis turns. A failure during a wiki-write doesn't belong on a
 *     synthesis trace - it belongs on its own ledger.
 *   - Composable with M2 qualityFrontier: a future dimension
 *     `transient_retry_count` reads aggregate counts from here per session.
 *
 * Off the hot path: ring writes are O(1), no I/O, no awaits. Structured
 * single-line console.info per event so devtools captures the history even
 * before any UI surface ships.
 */

export type FailureKind =
    | 'transient'          // detected as transient; about to retry
    | 'retried-success'    // earlier transient(s) recovered on a later attempt
    | 'exhausted'          // ran out of retries; giving up
    | 'app-level'          // 4xx (non-429) or a caller-supplied isAppLevelTransient that returned false
    | 'timeout';           // total wall-time ceiling exceeded

export interface FailureEvent {
    /** UTC ms when this event was recorded. */
    ts: number;
    /** Caller-supplied label, e.g. 'wiki-write', 'goal-regrade-item', 'topic-model.poll'. */
    label: string;
    /** Outcome class - see FailureKind. */
    kind: FailureKind;
    /** HTTP status when known (0 for network errors that never returned a response). */
    status?: number;
    /** Network error label when the fetch never produced a response. */
    network_error?: string;
    /** Attempt number (1-based) at which this event was recorded. */
    attempt: number;
    /** Total wall-time spent in resilientFetch when this event fired. */
    elapsed_ms: number;
    /** First N chars of the error body or thrown message. Truncated to 240. */
    error_excerpt?: string;
    /** Optional caller annotation, e.g. 'goal-regrade article 47 of 218'. */
    note?: string;
}

const RING_CAP = 512;
const _ring: FailureEvent[] = [];

/** Record a failure-event. Off the hot path - synchronous, no I/O. */
export function recordFailure(evt: Omit<FailureEvent, 'ts'>): FailureEvent {
    const e: FailureEvent = {
        ts: Date.now(),
        ...evt,
        error_excerpt: evt.error_excerpt ? evt.error_excerpt.slice(0, 240) : undefined,
    };
    _ring.push(e);
    if (_ring.length > RING_CAP) _ring.splice(0, _ring.length - RING_CAP);
    // Structured console emit so devtools captures even before a UI surface ships.
    try {
        const parts: string[] = [
            `[telemetry/${e.kind}]`,
            `label=${e.label}`,
            `attempt=${e.attempt}`,
            `elapsed=${e.elapsed_ms}ms`,
        ];
        if (e.status !== undefined) parts.push(`status=${e.status}`);
        if (e.network_error) parts.push(`net=${e.network_error}`);
        if (e.note) parts.push(`note="${e.note}"`);
        if (e.error_excerpt) parts.push(`err="${e.error_excerpt.slice(0, 80)}"`);
        // eslint-disable-next-line no-console
        console.info(parts.join(' '));
    } catch { /* never throw from telemetry */ }
    return e;
}

/** Snapshot of the ring buffer. The Reasoning Stream Anomaly Panel reads this. */
export function getFailureEvents(): FailureEvent[] {
    return _ring.slice();
}

export function clearFailureEvents(): void {
    _ring.length = 0;
}

/** Aggregate stats for surfacing on the Step-6 ledger or as a qualityFrontier
 *  input. `windowMs` defaults to a 10-minute trailing window. */
export interface FailureSummary {
    window_ms: number;
    total_events: number;
    by_kind: Record<FailureKind, number>;
    by_label: Record<string, number>;
    transient_retry_count: number;
    exhausted_count: number;
}

export function summarizeFailures(windowMs: number = 600_000): FailureSummary {
    const cutoff = Date.now() - windowMs;
    const summary: FailureSummary = {
        window_ms: windowMs,
        total_events: 0,
        by_kind: { transient: 0, 'retried-success': 0, exhausted: 0, 'app-level': 0, timeout: 0 },
        by_label: {},
        transient_retry_count: 0,
        exhausted_count: 0,
    };
    for (const e of _ring) {
        if (e.ts < cutoff) continue;
        summary.total_events += 1;
        summary.by_kind[e.kind] += 1;
        summary.by_label[e.label] = (summary.by_label[e.label] || 0) + 1;
        if (e.kind === 'transient') summary.transient_retry_count += 1;
        if (e.kind === 'exhausted') summary.exhausted_count += 1;
    }
    return summary;
}
