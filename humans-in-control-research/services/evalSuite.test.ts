// evalSuite.test.ts - WS-2 (2026-10-30)
import { describe, it, expect, beforeEach } from 'vitest';
import { caseStatus, compareCandidate, evaluateExpectations, trajectoryFromRun, validateCase, PROMOTION_STREAK, type EvalResult, type EvalCase } from './evalSuite';
import { judgeMayBlock, cohensKappa, DEFAULT_JUDGES, getJudge, _resetJudgeRegistryForTests, CALIBRATION_MIN_N, CALIBRATION_MIN_KAPPA } from './judgeRegistry';
import { computeStageScores, scoreChain } from './chainScores';
import { _resetRunStateForTests, beginRun, recordStep, recordVerdict, getRun } from './runState';

const res = (case_id: string, model: string, pass: boolean, ts: number, scores: Record<string, number> = { prose: pass ? 0.9 : 0.4 }): EvalResult =>
    ({ case_id, set: 'frontier', model, mode: 'replay', ts, pass, scores, failures: pass ? [] : ['x'] });

describe('judgeRegistry (E5)', () => {
    beforeEach(() => _resetJudgeRegistryForTests());
    it('deterministic judges may block; LLM judges only once calibrated', () => {
        expect(judgeMayBlock(getJudge('chain:lexical'))).toBe(true);
        expect(judgeMayBlock(getJudge('copyCritic'))).toBe(false);
        const llm = { ...getJudge('copyCritic')!, blocking: true };
        expect(judgeMayBlock(llm)).toBe(false);
        expect(judgeMayBlock({ ...llm, human_agreement: { n: CALIBRATION_MIN_N, agreement: 0.9, kappa: CALIBRATION_MIN_KAPPA, last_calibrated: '2026-10-30' } })).toBe(true);
        expect(judgeMayBlock({ ...llm, human_agreement: { n: 5, agreement: 1, kappa: 1, last_calibrated: '2026-10-30' } })).toBe(false);
    });
    it('no embedded LLM judge blocks by default', () => {
        expect(DEFAULT_JUDGES.filter(j => j.kind === 'llm' && j.blocking)).toEqual([]);
    });
    it("Cohen's kappa behaves", () => {
        expect(cohensKappa(50, 0, 0, 50)).toBe(1);
        expect(Math.abs(cohensKappa(25, 25, 25, 25))).toBeLessThan(1e-9);
        expect(cohensKappa(0, 50, 50, 0)).toBeLessThan(0);
    });
});

describe('chainScores (E7)', () => {
    const base = (over: any = {}) => ({
        slides: [{}, {}, {}, {}], envelopes: [], ledger: [], slotReport: null, proseReport: null, gradeReport: null, deckQualityReport: null,
        exhibitReport: null, bindReport: null, plan: null, slopFindings: [], titleReport: null, claimReport: null, repairInstruction: '', trace: [],
        pass: true, legacyPass: true, scores: {}, below: [], ...over,
    }) as any;
    it('a clean chain scores 1 everywhere and passes', () => {
        const v = scoreChain(base());
        expect(Object.values(v.scores).every(s => s === 1)).toBe(true);
        expect(v.pass).toBe(true);
    });
    it('findings that used to return `continue` now lower the score and fail the blocking bar', () => {
        const v = scoreChain(base({
            proseReport: { metrics: [], overall: 0.5, pass: false, concerns: [], sentenceCount: 10 },
            deckQualityReport: { findings: [{}, {}, {}], grounding: {}, distinctArchetypes: 2, contentRatio: 0.5, sequence: [], pass: false },
            slotReport: { fills: [], violations: [{}, {}, {}, {}, {}], p0Coverage: 0, pass: false, planAbsent: false },
        }));
        expect(v.scores.prose).toBe(0.5);
        expect(v.scores.deckQuality).toBeCloseTo(0.4);
        expect(v.scores.evidenceSlots).toBe(0);
        expect(v.pass).toBe(false);
        expect(v.below.map(b => b.stage).sort()).toEqual(['deckQuality', 'evidenceSlots', 'prose']);
    });
    it('a non-blocking stage below its bar does not fail the chain', () => {
        const v = scoreChain(base({ bindReport: { bound: [{}], unbound: [{}, {}, {}], fieldsConsidered: 4 } }));
        expect(v.scores.bindPointers).toBe(0.25);
        expect(v.pass).toBe(true);
        expect(v.below[0]).toMatchObject({ stage: 'bindPointers', blocking: false });
    });
    it('an errored stage scores 0', () => {
        const s = computeStageScores(base({ envelopes: [{ stepId: 'chain:provenance', status: 'error' }] }));
        expect(s.provenance).toBe(0);
    });
});

describe('evalSuite (E1/E4/E10/E11)', () => {
    beforeEach(() => _resetRunStateForTests());
    it('validates case files', () => {
        expect(validateCase({ id: 'ok-case', set: 'frontier', kind: 'slides', input: { objective: 'o', prompt: 'p' }, origin: { type: 'manual', added: '2026-10-30' } })).toEqual([]);
        expect(validateCase({ id: 'X', set: 'other' })).toContain('set must be regression or frontier');
    });
    it('expectations: registry fail, per-case minimums and trajectory all count', () => {
        const c: EvalCase = { id: 'c', set: 'regression', kind: 'slides', input: { objective: 'o', prompt: 'p' }, origin: { type: 'manual', added: 'x' },
            expected: { min_scores: { 'chain:prose': 0.9 }, trajectory: { tools_before_generate: true, max_repair_rounds: 1, no_fail_open: true } } };
        const r = evaluateExpectations(c, { prose: 0.8 }, true, { tools_before_generate: false, repair_rounds: 2, fail_open: 1, failed_steps: 0 });
        expect(r.pass).toBe(false);
        expect(r.failures).toHaveLength(4);
        expect(evaluateExpectations(c, { prose: 0.95 }, true, { tools_before_generate: true, repair_rounds: 0, fail_open: 0, failed_steps: 0 }).pass).toBe(true);
    });
    it('derives the trajectory from the run record', () => {
        beginRun({ objective: 'o' });
        recordStep({ stage: 'tool', tool: 'fetch_wiki_articles' });
        recordStep({ stage: 'Analyst chat', model: 'claude-opus-5-5' });
        recordStep({ stage: 'repair:1', model: 'gemini-3.5-flash' });
        recordStep({ stage: 'Copy critic', model: 'claude-opus-5-5', failed: true });
        recordVerdict({ judge_id: 'deckPlanGate', pass: true, detail: 'fail-open: gate error' });
        const t = trajectoryFromRun(getRun());
        expect(t).toEqual({ tools_before_generate: true, repair_rounds: 1, fail_open: 1, failed_steps: 1 });
    });
    it('promotes a frontier case after three straight passes and marks saturation across models', () => {
        const rs = [res('c', 'a', false, 1), res('c', 'a', true, 2), res('c', 'b', true, 3), res('c', 'a', true, 4), res('c', 'b', true, 5), res('c', 'a', true, 6), res('c', 'b', true, 7)];
        const st = caseStatus('c', rs, 'frontier');
        expect(st.consecutive_passes).toBeGreaterThanOrEqual(PROMOTION_STREAK);
        expect(st.promote_to_regression).toBe(true);
        expect(st.saturated).toBe(true);
        expect(caseStatus('c', rs.slice(0, 3), 'frontier').promote_to_regression).toBe(false);
    });
    it('the candidate gate rejects any newly failing case and a falling mean', () => {
        const before = [res('a', 'm', true, 1, { prose: 0.9 }), res('b', 'm', true, 1, { prose: 0.9 })];
        expect(compareCandidate(before, [res('a', 'm', true, 2, { prose: 0.9 }), res('b', 'm', false, 2, { prose: 0.3 })]).decision).toBe('reject');
        expect(compareCandidate(before, [res('a', 'm', true, 2, { prose: 0.85 }), res('b', 'm', true, 2, { prose: 0.85 })]).decision).toBe('reject');
        expect(compareCandidate(before, [res('a', 'm', true, 2, { prose: 0.92 }), res('b', 'm', true, 2, { prose: 0.9 })]).decision).toBe('apply');
        expect(compareCandidate(before, [res('a', 'm', true, 2, { prose: 0.9 }), res('b', 'm', true, 2, { prose: 0.9 })], { wiringEdit: true }).decision).toBe('reject');
        expect(compareCandidate([], []).decision).toBe('reject');
    });
});
