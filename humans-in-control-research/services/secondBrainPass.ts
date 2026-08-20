/**
 * SECOND-BRAIN PASS - the runner that makes the DF-D lifecycle live.
 *
 * `memoryLifecycle.ts` shipped as pure logic with no caller, which on this repo
 * is a known anti-pattern (the 2026-05-23 audit found 15+ exports with zero
 * internal callers, including a whole chunked-generator set that was written and
 * never wired). This file is the caller: it loads the fact store, admits what
 * the learning pass produced, and runs the review passes.
 *
 * Two deer-flow properties are preserved deliberately:
 *  1. ONE model call, and only when there is something to review. Staleness and
 *     consolidation ride a single invocation (deermem runs both inside the normal
 *     update call), so second-brain hygiene has no standing bill and therefore
 *     actually gets scheduled.
 *  2. The model DECIDES, the code ENFORCES. Every guardrail in memoryLifecycle
 *     re-checks the model's proposals against the deterministic candidate set.
 */

import { callAIWithRetry } from './aiRetryClient';
import { DEFAULT_MODELS } from './aiRouter';
import { runStep, type StepEnvelope } from './stepEnvelope';
import {
    loadFactStore, saveFactStore, runLifecyclePass, selectStaleCandidates,
    selectConsolidationGroups, DEFAULT_CONFIG,
    type MemoryFact, type ProposedFact, type StalenessDecision, type ConsolidationProposal,
    type LifecyclePassReport, type LifecycleConfig,
} from './memoryLifecycle';

const REVIEW_SYSTEM = [
    'You maintain a consulting research assistant\'s long-term memory. You are given aged facts to review and fragmented fact groups to consider merging.',
    'Return ONLY JSON: {"staleFactsToRemove":[{"id","reason"}],"staleFactsToExtend":[{"id","extend_by_days","reason"}],"factsToConsolidate":[{"sourceIds":[...],"consolidated":{"content","category","confidence","scope","durability","authority"}}]}',
    '',
    'STALENESS: each fact shows a valid:Nd annotation, the number of days it was expected to stay true. KEEP means omit it. REMOVE means it is outdated or contradicted. EXTEND means keep it but recalibrate the window.',
    'Be conservative. When in doubt KEEP: removing a valid fact is worse than keeping a slightly stale one, because the next cycle reviews it again.',
    '',
    'CONSOLIDATION: merge only facts describing the same aspect. The merged fact must preserve every key detail, and its confidence cannot exceed the highest source confidence. Classify it: it is eligible only when user-scoped, durable and descriptive.',
    '',
    'Never invent a fact id. Never propose a fact that is not in the lists you were given.',
].join('\n');

interface ReviewDecisions {
    staleFactsToRemove?: Array<{ id: string; reason?: string }>;
    staleFactsToExtend?: Array<{ id: string; extend_by_days?: number; reason?: string }>;
    factsToConsolidate?: ConsolidationProposal[];
}

function buildReviewPrompt(stale: MemoryFact[], groups: Array<{ category: string; factIds: string[] }>, store: MemoryFact[]): string {
    const byId = new Map(store.map(f => [f.id, f]));
    const staleBlock = stale.map(f => `- id=${f.id} valid:${f.expectedValidDays}d category=${f.category} confidence=${f.confidence} created=${f.createdAt.slice(0, 10)}\n  ${f.content}`).join('\n');
    const groupBlock = groups.map(g => {
        const lines = g.factIds.map(id => {
            const f = byId.get(id);
            return f ? `  - id=${f.id} confidence=${f.confidence}: ${f.content}` : '';
        }).filter(Boolean).join('\n');
        return `Category ${g.category} (${g.factIds.length} facts):\n${lines}`;
    }).join('\n\n');
    return [
        stale.length ? `<stale_facts>\n${staleBlock}\n</stale_facts>` : '',
        groups.length ? `<consolidation_groups>\n${groupBlock}\n</consolidation_groups>` : '',
    ].filter(Boolean).join('\n\n');
}

async function requestDecisions(prompt: string): Promise<ReviewDecisions> {
    const parsed = await callAIWithRetry('gemini', {
        model: DEFAULT_MODELS.fast_generation,
        systemInstruction: { parts: [{ text: REVIEW_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // Identity-class maintenance: same store + same day must produce the same
        // decisions. thinkingBudget 0 keeps the JSON inside the output ceiling.
        config: { temperature: 0, maxOutputTokens: 2500, responseMimeType: 'application/json', thinkingBudget: 0 },
    }, { label: 'Second-brain review', maxAttempts: 2, requestTimeoutMs: 60_000 });
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    try {
        return JSON.parse(text) as ReviewDecisions;
    } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]) as ReviewDecisions; } catch { /* fall through */ } }
        return {};
    }
}

export interface SecondBrainPassOptions {
    runId: string;
    /** Facts the caller wants admitted (from the learning pass, chat feedback, etc). */
    proposed?: ProposedFact[];
    /** Fact ids the caller believes were confirmed; only a real user signal counts. */
    reinforceIds?: string[];
    /** Recent USER messages, for deterministic reinforcement detection. */
    userMessages?: string[];
    /** Skip the model call: deterministic admission, reinforcement and eviction only. */
    deterministicOnly?: boolean;
    cfg?: LifecycleConfig;
    dryRun?: boolean;
}

export interface SecondBrainPassResult {
    report: LifecyclePassReport | null;
    reviewed: { staleCandidates: number; consolidationGroups: number; modelCalled: boolean };
    envelope: StepEnvelope<LifecyclePassReport | null>;
}

/**
 * Run one maintenance pass. Never throws: a failure returns an error envelope
 * and leaves the store untouched, because a half-applied memory edit is worse
 * than a skipped cycle.
 */
export async function runSecondBrainPass(opts: SecondBrainPassOptions): Promise<SecondBrainPassResult> {
    const cfg = opts.cfg || DEFAULT_CONFIG;
    const loaded = await loadFactStore();
    if (loaded.status === 'error') {
        return {
            report: null,
            reviewed: { staleCandidates: 0, consolidationGroups: 0, modelCalled: false },
            envelope: { ...loaded, value: null } as StepEnvelope<LifecyclePassReport | null>,
        };
    }
    const store = loaded.value || [];

    const staleCandidates = selectStaleCandidates(store, cfg);
    const groups = selectConsolidationGroups(store, cfg);
    const worthReviewing = staleCandidates.length >= cfg.stalenessMinCandidates || groups.length > 0;

    let decisions: ReviewDecisions = {};
    let modelCalled = false;
    if (worthReviewing && !opts.deterministicOnly) {
        const call = await runStep('secondBrain:review', () =>
            requestDecisions(buildReviewPrompt(staleCandidates, groups, store)));
        if (call.status === 'success' && call.value) {
            decisions = call.value;
            modelCalled = true;
        }
        // A failed review is not a failed pass: admission, reinforcement and
        // capacity still run, and the aged facts wait for the next cycle.
    }

    const stalenessDecisions: StalenessDecision[] = [
        ...(decisions.staleFactsToRemove || []).map(d => ({ id: String(d.id), verdict: 'REMOVE' as const, reason: d.reason })),
        ...(decisions.staleFactsToExtend || []).map(d => ({ id: String(d.id), verdict: 'EXTEND' as const, extendByDays: Number(d.extend_by_days) || cfg.stalenessAgeDays, reason: d.reason })),
    ];

    const { facts, report } = runLifecyclePass(store, {
        runId: opts.runId,
        proposed: opts.proposed || [],
        stalenessDecisions,
        consolidationProposals: decisions.factsToConsolidate || [],
        reinforceIds: opts.reinforceIds || [],
        userMessages: opts.userMessages || [],
        cfg,
    });

    if (!opts.dryRun && (report.admitted || report.removed || report.extended || report.merged || report.confirmed || report.evicted)) {
        const saved = await saveFactStore(facts);
        if (saved.status === 'error') {
            return {
                report,
                reviewed: { staleCandidates: staleCandidates.length, consolidationGroups: groups.length, modelCalled },
                envelope: { ...saved, value: report } as unknown as StepEnvelope<LifecyclePassReport | null>,
            };
        }
    }

    console.info(`[second-brain] ${report.total} fact(s): +${report.admitted} admitted (${report.rejectedByScopeGate} refused by the scope gate), -${report.removed} stale, ${report.extended} extended, ${report.merged} merged, ${report.confirmed} confirmed, ${report.evicted} evicted${report.shadowDisagreement ? `, ${report.shadowDisagreement} shadow disagreement(s)` : ''}`);
    for (const r of report.refusals.slice(0, 6)) console.info(`[second-brain] refused: ${r}`);

    return {
        report,
        reviewed: { staleCandidates: staleCandidates.length, consolidationGroups: groups.length, modelCalled },
        envelope: {
            status: 'success', value: report, errorType: null, recoverableByModel: false,
            nextAction: 'continue', source: 'step_return', stepId: `secondBrain:${opts.runId}`,
        },
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
