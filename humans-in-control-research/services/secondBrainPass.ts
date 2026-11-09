/**
 * SECOND-BRAIN PASS - the runner that makes the DF-D lifecycle live.
 *
 * `memoryLifecycle.ts` shipped as pure logic with no caller, which on this repo
 * is a known anti-pattern (the 2026-05-23 audit found 15+ exports with zero
 * internal callers, including a whole chunked-generator set that was written and
 * never wired). This file is the caller: it admits what the learning pass
 * produced and asks for the review passes.
 *
 * 2026-10-31 (WS-B B1/B3, plan agent-stack-shared-memory-skills-uplift): the pass runs through the proxy's ONE
 * memory door. Admission and reinforcement go to /api/memory/admit; the staleness and consolidation review goes
 * to /api/memory/lifecycle, which makes the same single model call (only when something is due) and enforces the
 * same guardrails (proxy/memory_store.py, parity-pinned to memoryLifecycle.ts). The proxy also runs that review
 * daily on its own, so second-brain hygiene no longer depends on an SPA tab being open. The two deer-flow
 * properties hold: ONE model call and only when something is due; the model DECIDES, the code ENFORCES.
 */
import { runStep, type StepEnvelope } from './stepEnvelope';
import {
    loadFactStore, runLifecyclePass, selectStaleCandidates, selectConsolidationGroups, memoryAdmit, memoryLifecycleNow,
    DEFAULT_CONFIG, type ProposedFact, type LifecyclePassReport, type LifecycleConfig,
} from './memoryLifecycle';

export interface SecondBrainPassOptions {
    runId: string;
    /** Facts the caller wants admitted (from the learning pass, chat feedback, etc). */
    proposed?: ProposedFact[];
    /** Fact ids the caller believes were confirmed; only a real user signal counts. */
    reinforceIds?: string[];
    /** Recent USER messages, for deterministic reinforcement detection. */
    userMessages?: string[];
    /** Skip the model review: admission, reinforcement and eviction only. */
    deterministicOnly?: boolean;
    cfg?: LifecycleConfig;
    /** Compute the report from a read of the store; write nothing. */
    dryRun?: boolean;
    engagement?: string;
}

export interface SecondBrainPassResult {
    report: LifecyclePassReport | null;
    reviewed: { staleCandidates: number; consolidationGroups: number; modelCalled: boolean };
    envelope: StepEnvelope<LifecyclePassReport | null>;
}

const EMPTY_REVIEW = { staleCandidates: 0, consolidationGroups: 0, modelCalled: false };

/** Sum an admission report and a lifecycle report into the one report the learning pass records. */
function combine(a: LifecyclePassReport | null | undefined, b: LifecyclePassReport | null | undefined): LifecyclePassReport | null {
    if (!a && !b) return null;
    const z: LifecyclePassReport = { admitted: 0, rejected: 0, rejectedByScopeGate: 0, removed: 0, extended: 0, merged: 0, confirmed: 0, evicted: 0, shadowDisagreement: 0, refusals: [], total: 0 };
    for (const r of [a, b]) {
        if (!r) continue;
        for (const k of ['admitted', 'rejected', 'rejectedByScopeGate', 'removed', 'extended', 'merged', 'confirmed', 'evicted', 'shadowDisagreement'] as const) z[k] += Number(r[k] || 0);
        z.refusals.push(...(r.refusals || []));
        z.total = Number(r.total || z.total);
    }
    return z;
}

/**
 * Run one maintenance pass. Never throws: a failure returns an error envelope; the store is only ever changed by
 * the proxy under its lock, so a failed call leaves it as it was.
 */
export async function runSecondBrainPass(opts: SecondBrainPassOptions, fetchImpl: typeof fetch = globalThis.fetch): Promise<SecondBrainPassResult> {
    const cfg = opts.cfg || DEFAULT_CONFIG;

    if (opts.dryRun) {
        const loaded = await loadFactStore(fetchImpl);
        if (loaded.status === 'error') return { report: null, reviewed: EMPTY_REVIEW, envelope: { ...loaded, value: null } as StepEnvelope<LifecyclePassReport | null> };
        const store = loaded.value || [];
        const { report } = runLifecyclePass(store, {
            runId: opts.runId, proposed: opts.proposed || [], reinforceIds: opts.reinforceIds || [], userMessages: opts.userMessages || [], cfg,
        });
        return {
            report,
            reviewed: { staleCandidates: selectStaleCandidates(store, cfg).length, consolidationGroups: selectConsolidationGroups(store, cfg).length, modelCalled: false },
            envelope: { status: 'success', value: report, errorType: null, recoverableByModel: false, nextAction: 'continue', source: 'step_return', stepId: `secondBrain:${opts.runId}:dry` },
        };
    }

    let admitReport: LifecyclePassReport | null = null;
    if ((opts.proposed || []).length || (opts.reinforceIds || []).length) {
        const admitted = await runStep('secondBrain:admit', async () => {
            const res = await memoryAdmit(opts.proposed || [], opts.runId, {
                engagement: opts.engagement, reinforceIds: opts.reinforceIds, userMessages: opts.userMessages, surface: 'spa',
            }, fetchImpl);
            if (!res.ok) throw new Error(res.error || 'memory admit failed');
            return res.report || null;
        });
        if (admitted.status === 'error') return { report: null, reviewed: EMPTY_REVIEW, envelope: { ...admitted, value: null } as StepEnvelope<LifecyclePassReport | null> };
        admitReport = admitted.value;
    }

    let reviewed = EMPTY_REVIEW;
    let lifecycleReport: LifecyclePassReport | null = null;
    const review = await runStep('secondBrain:review', () => memoryLifecycleNow(!!opts.deterministicOnly, fetchImpl));
    if (review.status === 'success' && review.value) {
        lifecycleReport = review.value.report;
        reviewed = { staleCandidates: review.value.stale_candidates, consolidationGroups: review.value.consolidation_groups, modelCalled: review.value.model_called };
    }
    // A failed review is not a failed pass: admission already landed, and the proxy's daily pass reviews again.

    const report = combine(admitReport, lifecycleReport);
    if (report) {
        console.info(`[second-brain] ${report.total} fact(s): +${report.admitted} admitted (${report.rejectedByScopeGate} refused by the scope gate), -${report.removed} stale, ${report.extended} extended, ${report.merged} merged, ${report.confirmed} confirmed, ${report.evicted} evicted${report.shadowDisagreement ? `, ${report.shadowDisagreement} shadow disagreement(s)` : ''}`);
        for (const r of report.refusals.slice(0, 6)) console.info(`[second-brain] refused: ${r}`);
    }
    return {
        report,
        reviewed,
        envelope: { status: 'success', value: report, errorType: null, recoverableByModel: false, nextAction: 'continue', source: 'step_return', stepId: `secondBrain:${opts.runId}` },
    };
}

/**
 * Turn an accepted learning-pass constraint into a typed proposed fact. A
 * constraint born from a negative signal is a `correction`, which the staleness
 * pass protects by default: a correction the user made must not expire on a
 * timer.
 */
export function constraintToProposedFact(
    text: string,
    opts: { confidence?: number; fromNegativeSignal?: boolean; deliverableType?: string } = {},
): ProposedFact {
    return {
        content: opts.deliverableType ? `${text} (applies to ${opts.deliverableType})` : text,
        category: opts.fromNegativeSignal ? 'correction' : 'preference',
        confidence: Math.max(0.7, Math.min(1, opts.confidence ?? 0.8)),
        scope: 'user',
        durability: 'durable',
        authority: 'descriptive',
        // A correction has no natural expiry; a preference is re-reviewed on the
        // default window.
        expectedValidDays: opts.fromNegativeSignal ? DEFAULT_CONFIG.stalenessAgeDays * 4 : DEFAULT_CONFIG.stalenessAgeDays,
    };
}
