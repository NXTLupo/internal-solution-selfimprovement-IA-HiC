// runState.test.ts - WS-1 T1/T2 (2026-10-30)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    beginRun, getRun, hydrateRunState, setEngagementSlug, engagementSlug, setResearchGoal, researchGoal,
    setCachedOnlyMode, cachedOnlyMode, setBlendMode, blendMode, setRunMode, runMode,
    setPlanSubQuestions, planSubQuestions, setPlanDecomposition, planDecomposition,
    recordStep, recordVerdict, recordArtifact, nextTurnIndex, setCurrentMessageId,
    advanceRunGoal, satisfyRunGoal, routeRun, runSummary, buildRunManifest,
    setRunStatePersister, persistRunState, _resetRunStateForTests,
} from './runState';

beforeEach(() => _resetRunStateForTests());
afterEach(() => _resetRunStateForTests());

describe('runState (WS-1 T1): the former window globals, typed and in one record', () => {
    it('round-trips every former global through its accessor', () => {
        setEngagementSlug('client-a'); expect(engagementSlug()).toBe('client-a');
        setResearchGoal('Map the market'); expect(researchGoal()).toBe('Map the market');
        setCachedOnlyMode(true); expect(cachedOnlyMode()).toBe(true);
        setBlendMode(true); expect(blendMode()).toBe(true);
        setRunMode('blend'); expect(runMode()).toBe('blend');
        setPlanSubQuestions([{ id: 'sq_1', question: 'Q?' }]); expect(planSubQuestions()).toHaveLength(1);
        setPlanDecomposition({ decomposition: 'decomposed' }); expect(planDecomposition<any>()?.decomposition).toBe('decomposed');
        expect(getRun().updated_at).toBeGreaterThan(0);
    });

    it('beginRun starts a fresh run id but keeps the engagement, objective, modes and plan', () => {
        setEngagementSlug('client-a'); setResearchGoal('goal'); setCachedOnlyMode(true); setPlanSubQuestions([{ id: 'a', question: 'q' }]);
        recordStep({ stage: 'generate', model: 'm' });
        const first = getRun().run_id;
        const run = beginRun({ kind: 'artifact' });
        expect(run.run_id).not.toBe(first);
        expect(run.engagement).toBe('client-a');
        expect(run.objective).toBe('goal');
        expect(run.cached_only).toBe(true);
        expect(run.plan.sub_questions).toHaveLength(1);
        expect(run.steps).toHaveLength(0);
        expect(run.kind).toBe('artifact');
        expect(run.stage).toBe('started');
    });

    it('records the trajectory: steps carry the current message id, verdicts and artifacts accumulate', () => {
        setCurrentMessageId('msg_1');
        recordStep({ stage: 'generate', model: 'claude-opus-5-5', elapsed_ms: 1200, cost_usd: 0.25 });
        recordStep({ stage: 'tool', tool: 'fetch_wiki_articles', result_chars: 4000 });
        recordStep({ stage: 'generate', model: 'gemini-3.5-flash', failed: true });
        recordVerdict({ judge_id: 'deckPlanGate', score: 0.6, pass: false });
        recordArtifact('slides_1'); recordArtifact('slides_1');
        const r = getRun();
        expect(r.steps.map(s => s.message_id)).toEqual(['msg_1', 'msg_1', 'msg_1']);
        expect(r.verdicts[0].message_id).toBe('msg_1');
        expect(r.artifacts).toEqual(['slides_1']);
        const sum = runSummary();
        expect(sum.steps).toBe(3);
        expect(sum.models).toEqual({ 'claude-opus-5-5': 1, 'gemini-3.5-flash': 1 });
        expect(sum.cost_usd).toBe(0.25);
        expect(sum.failed_steps).toBe(1);
        expect(sum.verdicts).toBe(1);
    });

    it('turn indices are monotonic within the run and survive hydration', () => {
        expect(nextTurnIndex()).toBe(1);
        expect(nextTurnIndex()).toBe(2);
        const snap = JSON.parse(JSON.stringify(getRun()));
        _resetRunStateForTests();
        hydrateRunState(snap);
        expect(nextTurnIndex()).toBe(3);
    });

    it('routes the run through goalState: no progress twice stops, a user question asks', () => {
        beginRun({ objective: 'o' });
        advanceRunGoal({ advanced: false });
        advanceRunGoal({ advanced: false });
        expect(routeRun().action).toBe('stop');
        beginRun({ objective: 'o' });
        advanceRunGoal({ advanced: true, needsUser: true, note: 'which brand?' });
        expect(routeRun().action).toBe('ask_user');
        satisfyRunGoal('deck shipped with 12 bound pointers');
        expect(getRun().goal.satisfied).toBe(true);
        expect(routeRun().action).toBe('continue');
    });

    it('persists through the registered persister after a change (debounced)', async () => {
        const writes: any[] = [];
        setRunStatePersister(async rec => { writes.push(rec.run_id); });
        setEngagementSlug('client-b');
        await persistRunState();
        expect(writes.length).toBeGreaterThanOrEqual(1);
    });

    it('builds a schema-shaped research run manifest from the record (T2)', () => {
        setEngagementSlug('client-a'); setResearchGoal('Assess X');
        setPlanSubQuestions([{ id: 'sq_1', question: 'q', coverage_status: 'covered' }, { id: 'sq_2', question: 'q2' }]);
        recordStep({ stage: 'generate', model: 'claude-opus-5-5', cost_usd: 0.5 });
        recordArtifact('slides_42');
        const m = buildRunManifest({ sources: [{ sourceName: 'Retail Dive', sourceType: 'web', provenance: 'fresh', itemCount: 12 }], totalChunks: 300 });
        expect(m.runId).toBe(getRun().run_id);
        expect(m.objective.userObjective).toBe('Assess X');
        expect(m.corpus.totalChunks).toBe(300);
        expect(m.corpus.sources[0].provenance).toBe('fresh');
        expect(m.corpus.subQuestionCoverage).toEqual([{ id: 'sq_1', coverageStatus: 'covered' }, { id: 'sq_2', coverageStatus: 'uncovered' }]);
        expect(m.artifacts).toEqual([{ artifactId: 'slides_42', artifactType: 'slides' }]);
        expect(m.run.models['claude-opus-5-5']).toBe(1);
        expect(m.run.cost_usd).toBe(0.5);
    });
});
