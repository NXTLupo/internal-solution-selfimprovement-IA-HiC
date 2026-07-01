import { describe, it, expect } from 'vitest';
import { buildAir, validateAir, AIR_VERSION } from './artifactAirService';
import type { ResearchObjective } from './artifactAirService';
import type { EvidencePointer } from './evidenceLedgerService';
import { compileClaim, claimMeetsPolicy, sourceDiversity } from './evidenceLedgerService';

const objective: ResearchObjective = {
    objectiveId: 'OBJ-1',
    userObjective: 'Define the 2026 state of the art for X',
    decomposedQuestions: [{ id: 'SQ-01', text: 'how?', priority: 1, coverageStatus: 'partial' }],
};

const goodPointer: EvidencePointer = {
    pointer: 'articles/x.md#c3',
    wikiPath: 'articles/x.md',
    chunkId: 'c3',
    sources: [{ sourceId: 's1', sourceType: 'web', sourceName: 'Higher Ed Dive', attributionLabel: 'Higher Ed Dive: title' }],
    objectiveScore: 88,
    subQuestionIds: ['SQ-01'],
    concepts: ['retention'],
    relatedChunks: [],
    provenanceConfidence: 0.9,
};

const badPointer: EvidencePointer = {
    pointer: 'articles/x.md', // no #cN -> not dereferenceable
    wikiPath: 'articles/x.md',
    chunkId: '',
    sources: [],              // no named source
    objectiveScore: 10,
    subQuestionIds: [],
    concepts: [],
    relatedChunks: [],
    provenanceConfidence: 0.1,
};

describe('ArtifactAIR build + validate (WS-0)', () => {
    it('resolves artifactType from the trigger via the catalog', () => {
        const { air, entry } = buildAir({ runId: 'r1', artifactId: 'a1', trigger: '#strategy', objective });
        expect(air.airVersion).toBe(AIR_VERSION);
        expect(entry?.id).toBe('strategy');
        expect(air.artifactType).toBe('strategy');
    });

    it('passes validation in shadow mode even with an empty ledger (non-blocking pre-migration)', () => {
        const { air } = buildAir({ runId: 'r1', artifactId: 'a1', trigger: '#gap', objective });
        const res = validateAir(air);
        expect(res.shadowMode).toBe(true);
        expect(res.ok).toBe(true);
    });

    it('flags malformed evidence pointers, and BLOCKS once shadowMode is false', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#case-study', objective,
            evidenceLedger: [goodPointer, badPointer], shadowMode: false,
        });
        const res = validateAir(air);
        expect(res.shadowMode).toBe(false);
        expect(res.ok).toBe(false);
        expect(res.failures.some(f => /not well-formed/.test(f))).toBe(true);
    });

    it('a clean ledger passes when shadowMode is false (blocking) ', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#case-study', objective,
            evidenceLedger: [goodPointer], shadowMode: false,
        });
        expect(validateAir(air).ok).toBe(true);
    });
});

describe('claim-evidence minimum-support policy (WS-A contract)', () => {
    it('computes source diversity across the support set', () => {
        const p2: EvidencePointer = { ...goodPointer, sources: [{ sourceId: 's2', sourceType: 'web', sourceName: 'Chronicle', attributionLabel: 'Chronicle: t' }] };
        expect(sourceDiversity([goodPointer, p2])).toBe(2);
    });

    it('a claim needs >=2 support, >=2 distinct sources, verifierPass', () => {
        const p2: EvidencePointer = { ...goodPointer, sources: [{ sourceId: 's2', sourceType: 'web', sourceName: 'Chronicle', attributionLabel: 'Chronicle: t' }] };
        const claim = compileClaim('CL-1', 'X is true', [goodPointer, p2]);
        expect(claimMeetsPolicy(claim)).toBe(false); // verifierPass still false
        claim.verifierPass = true;
        expect(claimMeetsPolicy(claim)).toBe(true);
    });
});
