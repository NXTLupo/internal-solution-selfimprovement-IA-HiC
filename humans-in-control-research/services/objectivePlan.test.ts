/**
 * E1.1. The live run that prompted this logged
 * "objective.decomposedQuestions empty: sub-question coverage not recorded"
 * while the same AIR reported `p0Coverage: 1`. Those two lines describe a gate that
 * measured nothing and a gate that passed, and the record could not tell them apart.
 *
 * The tests that matter here are the ABSENCE ones: an unplanned run must be visibly
 * unmeasured, never quietly covered.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
    normalizeSubQuestions, readObjectivePlan, toAirDecomposedQuestions, planSummary,
} from './objectivePlan';

const WINDOW_KEY = '__hicResearchPlanSubQuestions';
afterEach(() => { try { delete (globalThis as any).window[WINDOW_KEY]; } catch { /* ignore */ } });

const REAL_PLAN = [
    { id: 'sq_1', question: 'Which stages of retained executive search are AI tools already changing?', priority: 'high', expected_evidence_types: ['news', 'social'] },
    { id: 'sq_2', question: 'What do practitioners say about AI at the finalist assessment stage?', priority: 'high', expected_evidence_types: ['social'] },
    { id: 'sq_3', question: 'Which vendors position enrichment as a research accelerant?', priority: 'medium' },
];

describe('normalizeSubQuestions', () => {
    it('keeps the fields the gate reads and defaults an unknown priority to medium', () => {
        const out = normalizeSubQuestions([{ id: 'a', question: 'Q?', priority: 'URGENT' }]);
        expect(out).toEqual([{ id: 'a', question: 'Q?', priority: 'medium', expected_evidence_types: undefined, expected_named_entities: undefined }]);
    });

    it('accepts `text` as well as `question`, since AIR uses one and the planner the other', () => {
        expect(normalizeSubQuestions([{ id: 'a', text: 'From AIR' }])[0].question).toBe('From AIR');
    });

    it('DROPS an entry with no question, rather than inflating the plan with an unmatchable slot', () => {
        expect(normalizeSubQuestions([{ id: 'a' }, { id: 'b', question: 'real' }])).toHaveLength(1);
    });

    it('is safe on junk input', () => {
        expect(normalizeSubQuestions(null)).toEqual([]);
        expect(normalizeSubQuestions('not an array' as any)).toEqual([]);
    });

    it('synthesizes an id when the plan omits one, so slots stay addressable', () => {
        expect(normalizeSubQuestions([{ question: 'Q?' }])[0].id).toBe('sq_1');
    });
});

describe('readObjectivePlan', () => {
    it('reports ABSENCE when the run declared no plan', () => {
        const read = readObjectivePlan();
        expect(read.planAbsent).toBe(true);
        expect(read.subQuestions).toEqual([]);
        expect(read.source).toBe('none');
    });

    it('prefers an explicit plan over the global, so a test never depends on window', () => {
        (globalThis as any).window[WINDOW_KEY] = REAL_PLAN;
        const read = readObjectivePlan([{ id: 'x', question: 'Explicit wins?', priority: 'high' }]);
        expect(read.source).toBe('explicit');
        expect(read.subQuestions).toHaveLength(1);
    });

    it('falls back to the run global App.tsx sets', () => {
        (globalThis as any).window[WINDOW_KEY] = REAL_PLAN;
        const read = readObjectivePlan();
        expect(read.source).toBe('window');
        expect(read.planAbsent).toBe(false);
        expect(read.subQuestions).toHaveLength(3);
    });

    it('treats a plan of unusable entries as no plan at all', () => {
        (globalThis as any).window[WINDOW_KEY] = [{ id: 'a' }, { id: 'b' }];
        expect(readObjectivePlan().planAbsent).toBe(true);
    });
});

describe('toAirDecomposedQuestions', () => {
    it('marks coverage UNMEASURED when no audit was run', () => {
        const out = toAirDecomposedQuestions(normalizeSubQuestions(REAL_PLAN));
        expect(out.every(q => q.coverageStatus === 'unmeasured')).toBe(true);
    });

    it('carries a real audit result through when one exists', () => {
        const cov = new Map<string, 'covered' | 'partial' | 'uncovered'>([['sq_1', 'covered'], ['sq_2', 'partial']]);
        const out = toAirDecomposedQuestions(normalizeSubQuestions(REAL_PLAN), cov);
        expect(out.map(q => q.coverageStatus)).toEqual(['covered', 'partial', 'unmeasured']);
    });

    it('maps priority words to the numeric scale AIR validates', () => {
        const out = toAirDecomposedQuestions(normalizeSubQuestions(REAL_PLAN));
        expect(out.map(q => q.priority)).toEqual([1, 1, 3]);
    });

    it('caps the list so one runaway plan cannot bloat every record', () => {
        const many = Array.from({ length: 30 }, (_, i) => ({ id: `sq_${i}`, question: `Q${i}?`, priority: 'low' }));
        expect(toAirDecomposedQuestions(normalizeSubQuestions(many))).toHaveLength(12);
    });
});

describe('planSummary', () => {
    it('says out loud that an unplanned run is NOT measured', () => {
        expect(planSummary(readObjectivePlan())).toMatch(/NOT measured against an objective/);
    });

    it('names the count and the high-priority share when a plan exists', () => {
        const s = planSummary(readObjectivePlan(REAL_PLAN));
        expect(s).toContain('3 sub-question(s)');
        expect(s).toContain('2 high priority');
    });
});

/**
 * E1.1 follow-up (2026-08-24). The live run reported `decomposedQuestions: 0` on a
 * RESTORED session, and the reason was not the reader: the plan only ever existed in a
 * window global set during a live collection phase, so nothing survived a reload. The
 * snapshot now carries it and the restore rehydrates it.
 */
describe('the plan survives save and restore', () => {
    it('buildSessionSnapshot persists the sub-questions the run declared', async () => {
        const { buildSessionSnapshot } = await import('./sessionService');
        const snap: any = buildSessionSnapshot({
            researchGoal: 'Assess AI in retained executive search',
            researchPlanSubQuestions: REAL_PLAN,
        } as any);
        expect(snap.research_plan_sub_questions).toHaveLength(3);
    });

    it('restoreSessionSnapshot rehydrates them, so a reloaded session knows its objective', async () => {
        const { restoreSessionSnapshot } = await import('./sessionService');
        delete (globalThis as any).window[WINDOW_KEY];
        expect(readObjectivePlan().planAbsent).toBe(true);

        restoreSessionSnapshot({
            metadata: { research_goal: 'g' },
            state: {},
            research_plan_sub_questions: REAL_PLAN,
        } as any);

        const after = readObjectivePlan();
        expect(after.planAbsent).toBe(false);
        expect(after.source).toBe('window');
        expect(after.subQuestions).toHaveLength(3);
    });

    it('a restore with no plan leaves the run honestly unmeasured', async () => {
        const { restoreSessionSnapshot } = await import('./sessionService');
        delete (globalThis as any).window[WINDOW_KEY];
        restoreSessionSnapshot({ metadata: { research_goal: 'g' }, state: {} } as any);
        expect(readObjectivePlan().planAbsent).toBe(true);
    });
});
