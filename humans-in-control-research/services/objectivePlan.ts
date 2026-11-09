import { planSubQuestions, setPlanSubQuestions, planDecomposition, setPlanDecomposition } from './runState';
/**
 * THE run's objective plan, read from one place.
 *
 * E1.1 (2026-08-21). The evidence-slot gate measures whether a deck's factual claims
 * are bound to evidence, and it grades each claim against the priority of the
 * sub-question it answers. On the chat-deck path nobody supplied those sub-questions:
 * `CorpusChatPanel` and `corpusChatService` both wrote `decomposedQuestions: []` as a
 * literal, so AIR logged "objective.decomposedQuestions empty" and the gate computed
 * P0 coverage against a plan the run never declared. A gate reporting full coverage of
 * an empty plan reads exactly like a gate reporting full coverage of a real one, which
 * is the failure mode worth removing.
 *
 * `emitDeliverable` already hydrated sub-questions from a window global. Rather than a
 * second copy of that logic, this module is the one reader, and it also answers the
 * question the old code could not: was there a plan at all?
 *
 * Absence is a first-class answer here. `planAbsent` travels with the report so a
 * consumer can say "not measured" instead of "measured and fine".
 *
 * 1.6 (2026-10-01, plan 2026-09-30 B8 / R-D1). Absence now carries a REASON. The run path
 * records one of two outcomes: a decomposed plan (published through `publishObjectivePlan`)
 * or `decomposition: 'unavailable'` (recorded through `recordDecompositionStatus`), so a
 * consumer can tell "never attempted" from "attempted twice and the planner returned
 * nothing". The marker lives in its own global because `emitDeliverable` and the session
 * restore both require the sub-questions global to be an ARRAY.
 */

export interface PlanSubQuestionLike {
    id: string;
    question: string;
    priority: 'high' | 'medium' | 'low';
    expected_evidence_types?: string[];
    expected_named_entities?: string[];
    /** 1.6: written back by the post-collection coverage audit; absent on a plan nobody has measured. */
    coverage_status?: 'uncovered' | 'partial' | 'covered';
}

export type DecompositionState = 'decomposed' | 'unavailable';

export interface DecompositionRecord {
    decomposition: DecompositionState;
    /** Why the run has no sub-questions (only meaningful when `unavailable`). */
    reason?: string;
    /** Planner calls made (1 = first ask only, 2 = one anchored re-ask). */
    attempts?: number;
    recordedAt: string;
}

export interface ObjectivePlanRead {
    /** Normalized sub-questions, possibly empty. */
    subQuestions: PlanSubQuestionLike[];
    /** True when the run declared no plan. Consumers must not report coverage. */
    planAbsent: boolean;
    /** Where the plan came from, for the record. */
    source: 'window' | 'explicit' | 'none';
    /** 1.6: what the run recorded about decomposition. `unrecorded` = nothing ever ran. */
    decomposition: DecompositionState | 'unrecorded';
    /** 1.6: set whenever `planAbsent` is true; the one line a status surface shows. */
    reason?: string;
}

// WS-1 T1 (2026-10-30): the plan lives in the typed RunState (services/runState.ts), not in
// window globals. This module stays the ONE reader/writer API; only the storage moved.

const PRIORITIES = new Set(['high', 'medium', 'low']);
const COVERAGE = new Set(['uncovered', 'partial', 'covered']);

export const NO_PLAN_DECLARED_REASON = 'no research plan declared for this run';

/**
 * Normalize whatever a caller or the global holds into the shape the gate reads.
 * Entries without a question are dropped: a sub-question with no text cannot be
 * matched against a section, so keeping it would inflate the plan without adding
 * any measurement.
 */
export function normalizeSubQuestions(raw: unknown): PlanSubQuestionLike[] {
    if (!Array.isArray(raw)) return [];
    const out: PlanSubQuestionLike[] = [];
    raw.forEach((sq: any, i: number) => {
        const question = String(sq?.question || sq?.text || '').trim();
        if (!question) return;
        const p = String(sq?.priority || '').toLowerCase();
        const c = String(sq?.coverage_status || '').toLowerCase();
        const entry: PlanSubQuestionLike = {
            id: String(sq?.id || `sq_${i + 1}`),
            question,
            priority: (PRIORITIES.has(p) ? p : 'medium') as PlanSubQuestionLike['priority'],
            expected_evidence_types: Array.isArray(sq?.expected_evidence_types) ? sq.expected_evidence_types.map(String) : undefined,
            expected_named_entities: Array.isArray(sq?.expected_named_entities) ? sq.expected_named_entities.map(String) : undefined,
        };
        if (COVERAGE.has(c)) entry.coverage_status = c as PlanSubQuestionLike['coverage_status'];
        out.push(entry);
    });
    return out;
}

/** 1.6: record the decomposition outcome for this run. Returns the record as written. */
export function recordDecompositionStatus(rec: Omit<DecompositionRecord, 'recordedAt'> & { recordedAt?: string }): DecompositionRecord {
    const written: DecompositionRecord = {
        decomposition: rec.decomposition,
        reason: rec.reason ? String(rec.reason).slice(0, 300) : undefined,
        attempts: typeof rec.attempts === 'number' ? rec.attempts : undefined,
        recordedAt: rec.recordedAt || new Date().toISOString(),
    };
    try { setPlanDecomposition(written); } catch { /* non-fatal: the read falls back to unrecorded */ }
    return written;
}

/** 1.6: the recorded decomposition outcome, or null when nothing was recorded. */
export function readDecompositionStatus(): DecompositionRecord | null {
    try {
        const raw = planDecomposition<any>();
        if (!raw || typeof raw !== 'object') return null;
        const d = String((raw as any).decomposition || '');
        if (d !== 'decomposed' && d !== 'unavailable') return null;
        return {
            decomposition: d,
            reason: (raw as any).reason ? String((raw as any).reason) : undefined,
            attempts: typeof (raw as any).attempts === 'number' ? (raw as any).attempts : undefined,
            recordedAt: String((raw as any).recordedAt || ''),
        };
    } catch {
        return null;
    }
}

/** 1.6: forget both the plan and the marker (a fresh run, or a test). */
export function clearObjectivePlan(): void {
    try { setPlanSubQuestions([]); } catch { /* ignore */ }
    try { setPlanDecomposition(undefined); } catch { /* ignore */ }
}

/**
 * 1.6: THE writer for the run's sub-questions. Publishes the array `emitDeliverable`, the session
 * snapshot and `readObjectivePlan` all read, and records `decomposition: 'decomposed'`. Call it again
 * after the coverage audit so the published plan carries `coverage_status`. An empty list is NOT
 * published (that is `recordDecompositionStatus({ decomposition: 'unavailable', ... })`).
 */
export function publishObjectivePlan(subQuestions: unknown, attempts?: number): PlanSubQuestionLike[] {
    const normalized = normalizeSubQuestions(subQuestions);
    if (!normalized.length) return [];
    // Keep the caller's richer objects (angle, coverage_status, ...) in the run state; normalization is
    // for the READ side. The array contract is what every consumer depends on.
    try { setPlanSubQuestions(Array.isArray(subQuestions) ? subQuestions : normalized); } catch { /* non-fatal */ }
    // A republish after the coverage audit passes no attempts; keep the count the first publish recorded.
    const prior = readDecompositionStatus();
    recordDecompositionStatus({
        decomposition: 'decomposed',
        attempts: attempts ?? (prior?.decomposition === 'decomposed' ? prior.attempts : undefined),
    });
    return normalized;
}

/**
 * Read the plan for this run. `explicit` wins when a caller already holds it, so a
 * test or a non-browser path never depends on a global.
 */
export function readObjectivePlan(explicit?: unknown): ObjectivePlanRead {
    const fromExplicit = normalizeSubQuestions(explicit);
    if (fromExplicit.length) return { subQuestions: fromExplicit, planAbsent: false, source: 'explicit', decomposition: 'decomposed' };

    let fromRun: PlanSubQuestionLike[] = [];
    try { fromRun = normalizeSubQuestions(planSubQuestions()); } catch { /* same as no plan */ }
    if (fromRun.length) return { subQuestions: fromRun, planAbsent: false, source: 'window', decomposition: 'decomposed' };

    const marker = readDecompositionStatus();
    if (marker?.decomposition === 'unavailable') {
        const attempts = marker.attempts ? ` after ${marker.attempts} planner attempt(s)` : '';
        return {
            subQuestions: [], planAbsent: true, source: 'none', decomposition: 'unavailable',
            reason: `objective decomposition unavailable${attempts}: ${marker.reason || 'the planner returned no sub-questions'}`,
        };
    }
    return { subQuestions: [], planAbsent: true, source: 'none', decomposition: 'unrecorded', reason: NO_PLAN_DECLARED_REASON };
}

/**
 * The AIR `objective.decomposedQuestions` shape. Coverage is NOT computed here:
 * `emitDeliverable` audits coverage against the grounding text it holds, and this
 * module has no corpus. Absent a coverage read, the status is `unmeasured`, never
 * `covered`.
 */
export interface AirDecomposedQuestion {
    id: string;
    text: string;
    priority: 1 | 2 | 3 | 4 | 5;
    requiredEvidenceTypes?: string[];
    coverageStatus: 'covered' | 'partial' | 'uncovered' | 'unmeasured';
}

const priorityNumber = (p: PlanSubQuestionLike['priority']): 1 | 3 | 5 =>
    p === 'high' ? 1 : p === 'low' ? 5 : 3;

export function toAirDecomposedQuestions(
    subQuestions: PlanSubQuestionLike[],
    coverageById?: Map<string, 'covered' | 'partial' | 'uncovered'>,
): AirDecomposedQuestion[] {
    return subQuestions.slice(0, 12).map(sq => ({
        id: sq.id,
        text: sq.question.slice(0, 300),
        priority: priorityNumber(sq.priority),
        requiredEvidenceTypes: sq.expected_evidence_types,
        coverageStatus: coverageById?.get(sq.id) || 'unmeasured',
    }));
}

/** One line for the console, so a run says out loud whether it was measured. */
export function planSummary(read: ObjectivePlanRead): string {
    if (read.planAbsent) {
        const why = read.reason && read.reason !== NO_PLAN_DECLARED_REASON ? ` (${read.reason})` : '';
        return `no research plan declared for this run: evidence coverage is NOT measured against an objective${why}`;
    }
    const high = read.subQuestions.filter(s => s.priority === 'high').length;
    return `${read.subQuestions.length} sub-question(s) from ${read.source} (${high} high priority)`;
}
