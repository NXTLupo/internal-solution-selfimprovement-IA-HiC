/**
 * DF-F3. The test that matters is the SEPARATE no-progress budget: a run that
 * keeps continuing without advancing must stop on the no-progress counter, well
 * before the total budget is spent. Without that, the total budget is the only
 * brake and a stuck run burns all of it.
 */
import { describe, it, expect } from 'vitest';
import {
    initGoalState, advanceGoal, satisfyGoal, routeGoalState, goalStateRecord,
    DEFAULT_MAX_CONTINUATIONS, DEFAULT_MAX_NO_PROGRESS,
} from './goalState';

const start = () => initGoalState('Assess AI adoption in executive search');

describe('the no-progress budget stops a stuck run early', () => {
    it('stops after two barren continuations, not after the full total budget', () => {
        let s = start();
        s = advanceGoal(s, { advanced: false });
        expect(s.blocker).toBe('goal_not_met_yet');
        s = advanceGoal(s, { advanced: false });
        expect(s.noProgressCount).toBe(DEFAULT_MAX_NO_PROGRESS);
        expect(s.reason).toMatch(/no-progress budget rather than the total budget/);
        expect(s.continuationCount).toBeLessThan(DEFAULT_MAX_CONTINUATIONS);
        expect(routeGoalState(s).action).toBe('stop');
        expect(routeGoalState(s).stopReason).toBe('no_progress');
    });

    it('resets the no-progress counter on real progress', () => {
        let s = start();
        s = advanceGoal(s, { advanced: false });
        expect(s.noProgressCount).toBe(1);
        s = advanceGoal(s, { advanced: true, note: 'bound 4 pointers' });
        expect(s.noProgressCount).toBe(0);
        expect(s.evidenceSummary).toBe('bound 4 pointers');
    });

    it('stops on the total budget when every continuation advanced', () => {
        let s = start();
        for (let i = 0; i < DEFAULT_MAX_CONTINUATIONS; i++) s = advanceGoal(s, { advanced: true, note: `step ${i}` });
        expect(s.continuationCount).toBe(DEFAULT_MAX_CONTINUATIONS);
        expect(s.reason).toMatch(/continuation budget of 6 reached/);
        expect(routeGoalState(s).stopReason).toBe('iteration_capped');
    });
});

describe('blockers ROUTE, which is why they are typed', () => {
    it('missing evidence routes to narrowing', () => {
        const s = advanceGoal(start(), { advanced: true, missingEvidence: true, note: 'corpus has no pricing data' });
        expect(s.blocker).toBe('missing_evidence');
        const route = routeGoalState(s);
        expect(route.action).toBe('narrow_scope');
        expect(route.guidance).toMatch(/do not annotate the gap/i);
    });

    it('needs_user_input routes to a single question', () => {
        const s = advanceGoal(start(), { advanced: true, needsUser: true });
        expect(routeGoalState(s).action).toBe('ask_user');
        expect(routeGoalState(s).guidance).toMatch(/ONE question/);
    });

    it('a failure stops and outranks every soft blocker', () => {
        const s = advanceGoal(start(), { advanced: false, failed: true, missingEvidence: true, needsUser: true, note: 'provider auth rejected' });
        expect(s.blocker).toBe('run_failed');
        expect(routeGoalState(s).action).toBe('stop');
        expect(routeGoalState(s).guidance).toMatch(/Do not present a partial as complete/);
    });

    it('an external wait resumes rather than re-collecting', () => {
        const s = advanceGoal(start(), { advanced: true, waiting: true });
        expect(routeGoalState(s).action).toBe('retry_same');
        expect(routeGoalState(s).guidance).toMatch(/Do not re-collect/);
    });

    it('a budget-exhausted run with missing evidence narrows instead of stopping cold', () => {
        let s = start();
        s = advanceGoal(s, { advanced: false });
        s = advanceGoal(s, { advanced: false, missingEvidence: true });
        expect(s.blocker).toBe('missing_evidence');
        expect(routeGoalState(s).action).toBe('narrow_scope');
    });
});

describe('satisfaction requires something to show', () => {
    it('refuses a success claim with an empty summary', () => {
        const s = satisfyGoal(start(), '   ');
        expect(s.satisfied).toBe(false);
        expect(s.blocker).toBe('missing_evidence');
        expect(s.reason).toMatch(/claimed success with nothing to show/);
    });

    it('accepts a success with a summary and routes to continue', () => {
        const s = satisfyGoal(start(), '3 slides, 7 pointers bound, 0 violations');
        expect(s.satisfied).toBe(true);
        expect(s.blocker).toBe('none');
        expect(routeGoalState(s).action).toBe('continue');
    });
});

describe('the AIR record', () => {
    it('carries fields only, no prose to parse', () => {
        let s = start();
        s = advanceGoal(s, { advanced: false });
        s = advanceGoal(s, { advanced: false });
        const rec = goalStateRecord(s);
        expect(rec).toMatchObject({ satisfied: false, blocker: 'goal_not_met_yet', continuations: 2, noProgress: 2, action: 'stop', stopReason: 'no_progress' });
    });

    it('honors custom budgets', () => {
        let s = initGoalState('x', { maxContinuations: 2, maxNoProgress: 1 });
        s = advanceGoal(s, { advanced: false });
        expect(routeGoalState(s).action).toBe('stop');
    });
});
