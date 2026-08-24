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
 */

export interface PlanSubQuestionLike {
    id: string;
    question: string;
    priority: 'high' | 'medium' | 'low';
    expected_evidence_types?: string[];
    expected_named_entities?: string[];
}

export interface ObjectivePlanRead {
    /** Normalized sub-questions, possibly empty. */
    subQuestions: PlanSubQuestionLike[];
    /** True when the run declared no plan. Consumers must not report coverage. */
    planAbsent: boolean;
    /** Where the plan came from, for the record. */
    source: 'window' | 'explicit' | 'none';
}

/** The global App.tsx sets once a research plan exists. */
const WINDOW_KEY = '__hicResearchPlanSubQuestions';

const PRIORITIES = new Set(['high', 'medium', 'low']);

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
        out.push({
            id: String(sq?.id || `sq_${i + 1}`),
            question,
            priority: (PRIORITIES.has(p) ? p : 'medium') as PlanSubQuestionLike['priority'],
            expected_evidence_types: Array.isArray(sq?.expected_evidence_types) ? sq.expected_evidence_types.map(String) : undefined,
            expected_named_entities: Array.isArray(sq?.expected_named_entities) ? sq.expected_named_entities.map(String) : undefined,
        });
    });
    return out;
}

/**
 * Read the plan for this run. `explicit` wins when a caller already holds it, so a
 * test or a non-browser path never depends on a global.
 */
export function readObjectivePlan(explicit?: unknown): ObjectivePlanRead {
    const fromExplicit = normalizeSubQuestions(explicit);
    if (fromExplicit.length) return { subQuestions: fromExplicit, planAbsent: false, source: 'explicit' };

    let fromWindow: PlanSubQuestionLike[] = [];
    try {
        if (typeof window !== 'undefined') fromWindow = normalizeSubQuestions((window as any)[WINDOW_KEY]);
    } catch { /* a locked-down window is the same as no plan */ }
    if (fromWindow.length) return { subQuestions: fromWindow, planAbsent: false, source: 'window' };

    return { subQuestions: [], planAbsent: true, source: 'none' };
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
    if (read.planAbsent) return 'no research plan declared for this run: evidence coverage is NOT measured against an objective';
    const high = read.subQuestions.filter(s => s.priority === 'high').length;
    return `${read.subQuestions.length} sub-question(s) from ${read.source} (${high} high priority)`;
}
