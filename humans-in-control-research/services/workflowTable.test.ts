// workflowTable.test.ts - WS-6 M3 (2026-10-30): the declared node tables and the trajectory they leave on the run.
import { describe, it, expect, beforeEach } from 'vitest';
import { WORKFLOWS, enterNode, recordFanOut, nodeTrajectory, _resetWorkflowForTests } from './workflowTable';
import { _resetRunStateForTests, beginRun, getRun } from './runState';
import { runArtifactChain, STAGE_ORDER } from './artifactChain';

beforeEach(() => { _resetRunStateForTests(); _resetWorkflowForTests(); beginRun({ kind: 'artifact' }); });

describe('the node tables', () => {
    it('declare every artifact node the loop uses, with verify as the parallel node and repair bounded', () => {
        const ids = WORKFLOWS.artifact.nodes.map(n => n.id);
        expect(ids).toEqual(['plan', 'generate', 'verify', 'route', 'repair', 'ask', 'ship']);
        expect(WORKFLOWS.artifact.nodes.find(n => n.id === 'verify')?.parallel).toBe(true);
        expect(WORKFLOWS.artifact.nodes.find(n => n.id === 'repair')?.retryLimit).toBe(3);
        for (const n of WORKFLOWS.artifact.nodes) for (const nx of n.next) expect(ids).toContain(nx);
    });
    it('declare the research run', () => {
        const ids = WORKFLOWS.research.nodes.map(n => n.id);
        expect(ids).toEqual(['decompose', 'plan_review', 'collect', 'chunk', 'synthesize', 'checkpoint', 'complete']);
        for (const n of WORKFLOWS.research.nodes) for (const nx of n.next) expect(ids).toContain(nx);
    });
});

describe('enterNode', () => {
    it('sets the stage and records the trajectory; an unknown node is refused', () => {
        expect(enterNode('artifact', 'plan')).toBe(true);
        expect(enterNode('artifact', 'generate', 'claude')).toBe(true);
        expect(enterNode('artifact', 'verify')).toBe(true);
        recordFanOut('artifact', 'verify', ['deckPlanGate', 'layoutMeasure'], 120);
        expect(enterNode('artifact', 'nope')).toBe(false);
        expect(getRun().stage).toBe('artifact:verify');
        expect(nodeTrajectory('artifact')).toEqual(['artifact:plan', 'artifact:generate', 'artifact:verify', 'artifact:verify:fanout']);
        const fan = getRun().steps.find(s => s.stage === 'node:artifact:verify:fanout');
        expect(JSON.parse(fan!.note!)).toEqual({ branches: ['deckPlanGate', 'layoutMeasure'], wall_ms: 120 });
    });
});

describe('artifactChain as a DAG', () => {
    it('runs the independent stages in parallel, keeps the envelope order pinned, and records the fan-out on the run', async () => {
        const slides = [{ id: 's1', template: 'slides:cover', title: 'Alumni drop off at three stages the advancement team cannot see', composerPayload: { title: 'Alumni drop off at three stages the advancement team cannot see' } }];
        const res = await runArtifactChain(slides as any, { runId: 'dag_test', artifactType: 'slides', fetchPage: async () => null, skip: ['grade'] });
        expect(res.envelopes.map(e => e.stepId)).toEqual(STAGE_ORDER.map(s => `chain:${s}`));
        expect(res.dag.groups[1]).toEqual([['provenance', 'claims', 'evidenceSlots'], ['exhibits'], ['prose']]);
        expect(res.dag.wallMs).toBeGreaterThanOrEqual(res.dag.parallelMs);
        const fan = getRun().steps.find(s => s.stage === 'node:artifact:verify:fanout');
        expect(fan).toBeTruthy();
        expect(JSON.parse(fan!.note!).branches).toEqual(['provenance>claims>evidenceSlots', 'exhibits', 'prose']);
    });
});
