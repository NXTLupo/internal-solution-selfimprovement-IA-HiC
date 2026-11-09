/**
 * Stage 1 item 1.6 (B8 / R-D1): absence of a plan now carries a REASON. The run path records
 * either a decomposed plan (publishObjectivePlan) or `decomposition: 'unavailable'`
 * (recordDecompositionStatus), and readObjectivePlan reports which one happened. The
 * sub-questions stay an ARRAY (emitDeliverable and the session restore depend on it), so
 * the marker lives in its own run-state field.
 *
 * WS-1 T1 (2026-10-30): storage moved from window globals to the typed RunState.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
    readObjectivePlan, recordDecompositionStatus, readDecompositionStatus, publishObjectivePlan,
    clearObjectivePlan, planSummary, normalizeSubQuestions, NO_PLAN_DECLARED_REASON,
} from './objectivePlan';
import { planSubQuestions, setPlanDecomposition, _resetRunStateForTests } from './runState';

afterEach(() => { clearObjectivePlan(); _resetRunStateForTests(); });

const PLAN = [
    { id: 'sq_1', question: 'Which stages change first?', priority: 'high', angle: 'mechanism', expected_evidence_types: ['news'], expected_named_entities: [], coverage_status: 'uncovered' },
    { id: 'sq_2', question: 'What do practitioners say?', priority: 'medium', coverage_status: 'partial' },
];

describe('the unavailable marker', () => {
    it('readObjectivePlan reports planAbsent WITH the recorded reason when decomposition was unavailable', () => {
        recordDecompositionStatus({ decomposition: 'unavailable', reason: 'planner returned no sub-questions after one anchored re-ask', attempts: 2 });
        const read = readObjectivePlan();
        expect(read.planAbsent).toBe(true);
        expect(read.subQuestions).toEqual([]);
        expect(read.source).toBe('none');
        expect(read.decomposition).toBe('unavailable');
        expect(read.reason).toBe('objective decomposition unavailable after 2 planner attempt(s): planner returned no sub-questions after one anchored re-ask');
    });

    it('distinguishes "never attempted" from "attempted and unavailable"', () => {
        const never = readObjectivePlan();
        expect(never.planAbsent).toBe(true);
        expect(never.decomposition).toBe('unrecorded');
        expect(never.reason).toBe(NO_PLAN_DECLARED_REASON);
    });

    it('planSummary surfaces the reason so a status line can show it', () => {
        recordDecompositionStatus({ decomposition: 'unavailable', reason: 'anchored re-ask failed: gemini HTTP 503', attempts: 2 });
        expect(planSummary(readObjectivePlan())).toMatch(/NOT measured against an objective \(objective decomposition unavailable after 2 planner attempt\(s\): anchored re-ask failed: gemini HTTP 503\)/);
    });

    it('an explicit plan still wins over an unavailable marker (a caller holding sub-questions is measured)', () => {
        recordDecompositionStatus({ decomposition: 'unavailable', reason: 'x' });
        const read = readObjectivePlan(PLAN);
        expect(read.planAbsent).toBe(false);
        expect(read.decomposition).toBe('decomposed');
    });

    it('a junk marker is ignored rather than trusted', () => {
        setPlanDecomposition({ decomposition: 'maybe' });
        expect(readDecompositionStatus()).toBeNull();
        expect(readObjectivePlan().decomposition).toBe('unrecorded');
    });

    it('records a timestamp and truncates an overlong reason', () => {
        const rec = recordDecompositionStatus({ decomposition: 'unavailable', reason: 'r'.repeat(1000) });
        expect(rec.reason).toHaveLength(300);
        expect(rec.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(readDecompositionStatus()?.recordedAt).toBe(rec.recordedAt);
    });
});

describe('publishObjectivePlan (the one writer)', () => {
    it('publishes the ARRAY emitDeliverable reads and records decomposition: decomposed', () => {
        const normalized = publishObjectivePlan(PLAN, 1);
        expect(Array.isArray(planSubQuestions())).toBe(true);
        expect(planSubQuestions()).toBe(PLAN); // the richer objects, not a lossy copy
        expect(normalized).toHaveLength(2);
        expect(readDecompositionStatus()).toMatchObject({ decomposition: 'decomposed', attempts: 1 });
        const read = readObjectivePlan();
        expect(read.source).toBe('window');
        expect(read.decomposition).toBe('decomposed');
        expect(read.reason).toBeUndefined();
    });

    it('carries coverage_status through the read so a persisted plan says what was answered', () => {
        publishObjectivePlan(PLAN);
        const read = readObjectivePlan();
        expect(read.subQuestions.map(q => q.coverage_status)).toEqual(['uncovered', 'partial']);
        // an invalid coverage value is dropped, not trusted
        expect(normalizeSubQuestions([{ id: 'a', question: 'Q?', coverage_status: 'done' }])[0].coverage_status).toBeUndefined();
    });

    it('refuses to publish an empty plan: that outcome is the unavailable marker, not an empty array', () => {
        publishObjectivePlan([]);
        expect(planSubQuestions()).toEqual([]);
        expect(readDecompositionStatus()).toBeNull();
        expect(readObjectivePlan().planAbsent).toBe(true);
    });

    it('republishing after the coverage audit replaces the array in place and keeps the recorded attempts', () => {
        publishObjectivePlan(PLAN, 2);
        const audited = PLAN.map(q => ({ ...q, coverage_status: 'covered' }));
        publishObjectivePlan(audited);
        expect(readObjectivePlan().subQuestions.every(q => q.coverage_status === 'covered')).toBe(true);
        expect(readDecompositionStatus()).toMatchObject({ decomposition: 'decomposed', attempts: 2 });
    });

    it('clearObjectivePlan forgets both the plan and the marker', () => {
        publishObjectivePlan(PLAN);
        clearObjectivePlan();
        expect(planSubQuestions()).toEqual([]);
        expect(readDecompositionStatus()).toBeNull();
        expect(readObjectivePlan().decomposition).toBe('unrecorded');
    });
});
