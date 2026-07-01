import { describe, it, expect } from 'vitest';
import { buildAir } from './artifactAirService';
import { newRunTrace, recordToolStep } from './runTraceService';

// WS-J/D14: the artifact AIR must carry a REAL toolTrace naming the signed pack that authorized
// grounding, so the mcp_tool_governance gate has live per-run data (not just a static contract file).
// Mirrors the recordToolStep -> buildAir({ trace }) wiring in corpusChatService + emitDeliverable.

describe('WS-J/D14 AIR toolTrace (governed grounding provenance)', () => {
    it('a grounded artifact AIR carries the wiki_retrieval tool pack on its toolTrace', () => {
        const trace = newRunTrace('run-x');
        recordToolStep(trace, {
            step: 'grounding:manifest-retrieval',
            toolPack: 'wiki_retrieval',
            toolName: 'manifest chunk pointers -> resolveChunks',
            objectiveId: 'obj_run-x',
            downstreamArtifactIds: ['gap-matrix_1'],
        });
        const { air } = buildAir({
            runId: 'run-x',
            artifactId: 'gap-matrix_1',
            trigger: '#gap',
            objective: { objectiveId: 'obj_run-x', userObjective: 'reduce churn', decomposedQuestions: [] },
            evidenceLedger: [],
            artifactPayload: { kind: 'gap-matrix', content: 'x' },
            trace,
            shadowMode: true,
        });
        expect(air.toolTrace).toHaveLength(1);
        expect(air.toolTrace![0].toolPack).toBe('wiki_retrieval');
        expect(air.toolTrace![0].downstreamArtifactIds).toContain('gap-matrix_1');
    });

    it('an ungrounded run (no tool step) yields an empty toolTrace, not undefined', () => {
        const { air } = buildAir({
            runId: 'run-y',
            artifactId: 'themes_1',
            trigger: '#themes',
            objective: { objectiveId: 'obj_run-y', userObjective: 'x', decomposedQuestions: [] },
            evidenceLedger: [],
            artifactPayload: { kind: 'theme-overview', content: 'x' },
            trace: newRunTrace('run-y'),
            shadowMode: true,
        });
        expect(Array.isArray(air.toolTrace)).toBe(true);
        expect(air.toolTrace).toHaveLength(0);
    });
});
