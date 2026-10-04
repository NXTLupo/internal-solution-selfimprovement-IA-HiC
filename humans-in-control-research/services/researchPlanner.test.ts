/**
 * Stage 1 item 1.6 (B8 / R-D1) + R-D2 groundwork of plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md.
 *
 * The load-bearing tests are the DECOMPOSITION ones: a planner answer with no sub-questions must
 * trigger exactly ONE anchored re-ask (prior plan verbatim + the instruction), and a second empty
 * answer must come back as a recorded `unavailable` with a reason, never as a silent empty plan.
 * No live model calls: `fetch` is stubbed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    normalizePlannerSubQuestions, ensureObjectiveDecomposition, buildAnchoredDecompositionReask,
    ANCHORED_REASK_INSTRUCTION, auditSubQuestionCoverage, applyCoverageToSubQuestions,
    collectionBudgetFor, QUERY_BUDGET_BY_PRIORITY, type SubQuestion,
} from './researchPlanner';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

/** A planner HTTP reply in either provider's envelope (the stub answers whichever endpoint is hit). */
function plannerReply(payload: unknown) {
    const text = JSON.stringify(payload);
    return {
        ok: true,
        status: 200,
        json: async () => ({
            content: [{ type: 'text', text }],                              // anthropic envelope
            candidates: [{ content: { parts: [{ text }] } }],              // gemini envelope
        }),
        text: async () => text,
    };
}

const REAL_SUBQUESTIONS = [
    { id: 'sq_1', question: 'Which stages of retained executive search are AI tools already changing?', angle: 'mechanism', priority: 'high', expected_evidence_types: ['news', 'social'], expected_named_entities: ['Korn Ferry'] },
    { id: 'sq_2', question: 'What do practitioners say about AI at the finalist assessment stage?', angle: 'evidence', priority: 'medium', expected_evidence_types: ['social'], expected_named_entities: [] },
];

const GOAL = 'Assess how AI tools change retained executive search in 2026';

beforeEach(() => { fetchMock.mockReset(); });

describe('normalizePlannerSubQuestions (the mandatory schema)', () => {
    it('defaults coverage_status to uncovered and guarantees both expected_* arrays', () => {
        const out = normalizePlannerSubQuestions([{ id: 'a', question: 'Q?', priority: 'high' }]);
        expect(out).toEqual([{
            id: 'a', question: 'Q?', angle: 'evidence', priority: 'high',
            expected_evidence_types: [], expected_named_entities: [], coverage_status: 'uncovered',
        }]);
    });

    it('maps model vocabulary onto connector-family evidence types and drops unknowns', () => {
        const out = normalizePlannerSubQuestions([{ question: 'Q?', expected_evidence_types: ['Academic', 'press', 'official docs', 'vibes', 'reddit'] }]);
        expect(out[0].expected_evidence_types).toEqual(['academic', 'news', 'social']);
        const docs = normalizePlannerSubQuestions([{ question: 'Q?', expected_evidence_types: 'documentation, filings' }]);
        expect(docs[0].expected_evidence_types).toEqual(['documentation']);
    });

    it('drops an entry with no question, defaults priority/angle, keeps a valid coverage_status, dedupes ids', () => {
        const out = normalizePlannerSubQuestions([
            { id: 'x' },
            { id: 'dup', question: 'first', priority: 'URGENT', angle: 'sideways', coverage_status: 'partial' },
            { id: 'dup', question: 'second' },
        ]);
        expect(out).toHaveLength(2);
        expect(out[0]).toMatchObject({ id: 'dup', priority: 'medium', angle: 'evidence', coverage_status: 'partial' });
        expect(out[1].id).not.toBe('dup');
    });

    it('is safe on junk', () => {
        expect(normalizePlannerSubQuestions(null)).toEqual([]);
        expect(normalizePlannerSubQuestions('nope')).toEqual([]);
    });
});

describe('ensureObjectiveDecomposition', () => {
    it('returns the decomposed plan after ONE call when the planner answers with sub-questions', async () => {
        fetchMock.mockResolvedValueOnce(plannerReply({ sub_questions: REAL_SUBQUESTIONS, source_strategy: [] }));
        const out = await ensureObjectiveDecomposition({ research_goal: GOAL, proxy_base: 'http://test' });
        expect(out.status).toBe('decomposed');
        expect(out.attempts).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        if (out.status === 'decomposed') {
            expect(out.reasked).toBe(false);
            expect(out.subQuestions.every(q => q.coverage_status === 'uncovered')).toBe(true);
            expect(out.plan.goal).toBe(GOAL);
        }
    });

    it('re-asks EXACTLY ONCE with the prior plan verbatim when sub_questions is empty, then succeeds', async () => {
        fetchMock
            .mockResolvedValueOnce(plannerReply({ sub_questions: [], source_strategy: [{ source_id: 'rss', sub_question_ids: [], expected_yield: 10, rationale: 'press' }], expected_themes_count: 18 }))
            .mockResolvedValueOnce(plannerReply({ sub_questions: REAL_SUBQUESTIONS }));
        const out = await ensureObjectiveDecomposition({ research_goal: GOAL, proxy_base: 'http://test' });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1].body));
        const secondPrompt: string = secondBody.messages?.[0]?.content ?? secondBody.contents?.[0]?.parts?.[0]?.text;
        // the anchor: the prior plan travels verbatim ...
        expect(secondPrompt).toContain('PRIOR PLAN (verbatim):');
        expect(secondPrompt).toContain('"source_id": "rss"');
        expect(secondPrompt).toContain('"expected_themes_count": 18');
        expect(secondPrompt).toContain(GOAL);
        // ... with the one instruction
        expect(secondPrompt).toContain(ANCHORED_REASK_INSTRUCTION);

        expect(out.status).toBe('decomposed');
        expect(out.attempts).toBe(2);
        if (out.status === 'decomposed') {
            expect(out.reasked).toBe(true);
            expect(out.subQuestions).toHaveLength(2);
            expect(out.plan.plan_version).toBe(2);
            // what the re-ask did not override is kept from the prior plan
            expect(out.plan.source_strategy[0].source_id).toBe('rss');
        }
    });

    it('reports UNAVAILABLE with a reason after the single re-ask also comes back empty (no third call)', async () => {
        fetchMock
            .mockResolvedValueOnce(plannerReply({ sub_questions: [] }))
            .mockResolvedValueOnce(plannerReply({ sub_questions: [] }));
        const out = await ensureObjectiveDecomposition({ research_goal: GOAL, proxy_base: 'http://test' });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(out.status).toBe('unavailable');
        expect(out.attempts).toBe(2);
        expect(out.subQuestions).toEqual([]);
        if (out.status === 'unavailable') {
            expect(out.reason).toMatch(/no sub-questions after one anchored re-ask/);
            expect(out.plan?.goal).toBe(GOAL);
        }
    });

    it('treats a missing sub_questions key the same as an empty one (re-ask fires)', async () => {
        fetchMock
            .mockResolvedValueOnce(plannerReply({ source_strategy: [] }))
            .mockResolvedValueOnce(plannerReply({ sub_questions: REAL_SUBQUESTIONS }));
        const out = await ensureObjectiveDecomposition({ research_goal: GOAL, proxy_base: 'http://test' });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(out.status).toBe('decomposed');
    });

    it('never throws: a planner transport failure becomes an unavailable outcome with the error as reason', async () => {
        // Every provider path rejects, so withResilience exhausts primary + fallback and throws; we absorb it.
        fetchMock.mockRejectedValue(new TypeError('failed to fetch'));
        const out = await ensureObjectiveDecomposition({ research_goal: GOAL, proxy_base: 'http://test' });
        expect(out.status).toBe('unavailable');
        if (out.status === 'unavailable') expect(out.reason).toMatch(/planner call failed/);
    });
});

describe('buildAnchoredDecompositionReask', () => {
    it('carries the prior plan JSON and the instruction', () => {
        const prompt = buildAnchoredDecompositionReask({
            plan_version: 1, plan_hash: 'h', goal: GOAL, sub_questions: [], source_strategy: [],
            named_institutions: ['Korn Ferry'], expected_themes_count: 20, budget_usd: 5, reflection_threshold: 0.75, max_iterations: 6,
        });
        expect(prompt).toContain('"named_institutions": [\n    "Korn Ferry"\n  ]');
        expect(prompt).toContain(ANCHORED_REASK_INSTRUCTION);
        expect(prompt).toContain('4-8 sub-questions');
    });
});

describe('applyCoverageToSubQuestions', () => {
    const SQS: SubQuestion[] = normalizePlannerSubQuestions(REAL_SUBQUESTIONS);

    it('writes covered | partial | uncovered per sub-question from the audit, without mutating the input', () => {
        const corpus = 'Retained executive search firms such as Korn Ferry now use AI tools at several stages, and the finalist stage is changing too.';
        const audit = auditSubQuestionCoverage(corpus, SQS);
        const out = applyCoverageToSubQuestions(SQS, audit);
        expect(out.map(q => q.coverage_status)).toEqual(audit.perQuestion.map(p => p.status));
        expect(new Set(out.map(q => q.coverage_status)).size).toBeGreaterThan(0);
        expect(SQS.every(q => q.coverage_status === 'uncovered')).toBe(true); // input untouched
    });

    it('an empty corpus leaves every sub-question uncovered', () => {
        const out = applyCoverageToSubQuestions(SQS, auditSubQuestionCoverage('', SQS));
        expect(out.every(q => q.coverage_status === 'uncovered')).toBe(true);
    });

    it('a sub-question the audit did not score keeps its prior status', () => {
        const out = applyCoverageToSubQuestions(
            [{ id: 'kept', coverage_status: 'partial' as const }],
            { perQuestion: [], openHighPriority: [], coverage: 0 },
        );
        expect(out[0].coverage_status).toBe('partial');
    });

    it('accepts the objectivePlan reader shape (no angle) for the audit', () => {
        const audit = auditSubQuestionCoverage('Korn Ferry', [{ id: 'a', question: 'Korn Ferry?', priority: 'high', expected_named_entities: ['Korn Ferry'] }]);
        expect(audit.perQuestion[0].status).toBe('covered');
    });
});

describe('collectionBudgetFor (R-D2 groundwork)', () => {
    it('gives high 3, medium 2, low 1 and lists uncovered first, high priority first within a band', () => {
        const out = collectionBudgetFor([
            { id: 'low_unc', priority: 'low', coverage_status: 'uncovered' },
            { id: 'high_part', priority: 'high', coverage_status: 'partial' },
            { id: 'med_unc', priority: 'medium', coverage_status: 'uncovered' },
            { id: 'high_unc', priority: 'high', coverage_status: 'uncovered' },
            { id: 'med_cov', priority: 'medium', coverage_status: 'covered' },
        ]);
        expect(out.map(e => e.id)).toEqual(['high_unc', 'med_unc', 'low_unc', 'high_part', 'med_cov']);
        expect(out.map(e => e.queries)).toEqual([3, 2, 1, 3, 0]);
        expect(QUERY_BUDGET_BY_PRIORITY).toEqual({ high: 3, medium: 2, low: 1 });
    });

    it('a covered sub-question gets no further queries (collection stops spending on it)', () => {
        const out = collectionBudgetFor([{ id: 'c', priority: 'high', coverage_status: 'covered' }]);
        expect(out[0].queries).toBe(0);
    });

    it('a missing coverage_status reads as uncovered and an unknown priority as medium', () => {
        const out = collectionBudgetFor([{ id: 'x' }]);
        expect(out[0]).toEqual({ id: 'x', priority: 'medium', coverage_status: 'uncovered', queries: 2 });
    });

    it('is stable on ties and safe on empty input', () => {
        const out = collectionBudgetFor([{ id: 'a', priority: 'high' }, { id: 'b', priority: 'high' }]);
        expect(out.map(e => e.id)).toEqual(['a', 'b']);
        expect(collectionBudgetFor([])).toEqual([]);
    });
});
