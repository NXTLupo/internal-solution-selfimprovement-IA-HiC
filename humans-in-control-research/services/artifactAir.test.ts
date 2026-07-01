import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAir, validateAir, AIR_VERSION } from './artifactAirService';
import type { ResearchObjective } from './artifactAirService';
import type { EvidencePointer } from './evidenceLedgerService';
import { compileClaim, claimMeetsPolicy, sourceDiversity, resolvedChunkToEvidence, buildEvidenceLedger, isWellFormedPointer } from './evidenceLedgerService';

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

    it('a mixed ledger above the floor WARNS but does not block (well-formedness is a ratio, not all-or-nothing)', () => {
        // 1 good + 1 bad = 50% well-formed, above MIN_WELLFORMED_RATIO -> warning, not a structural block.
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#case-study', objective,
            evidenceLedger: [goodPointer, badPointer], shadowMode: false,
        });
        const res = validateAir(air);
        expect(res.shadowMode).toBe(false);
        expect(res.ok).toBe(true);                                  // NOT blocked - pre-migration source-lag is tolerated
        expect(res.wellFormedRatio).toBe(0.5);
        expect(res.warnings.some(w => /not well-formed/.test(w))).toBe(true);
    });

    it('grounding collapse (0% well-formed) BLOCKS once shadowMode is false', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#case-study', objective,
            evidenceLedger: [badPointer, badPointer], shadowMode: false,   // 0% well-formed < floor
        });
        const res = validateAir(air);
        expect(res.ok).toBe(false);
        expect(res.failures.some(f => /grounding collapse/.test(f))).toBe(true);
    });

    it('a STRUCTURAL violation (missing objective) BLOCKS once shadowMode is false', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#case-study',
            objective: { objectiveId: 'o', userObjective: '', decomposedQuestions: [] },
            evidenceLedger: [goodPointer], shadowMode: false,
        });
        const res = validateAir(air);
        expect(res.ok).toBe(false);
        expect(res.failures.some(f => /objective/.test(f))).toBe(true);
    });

    it('a clean ledger passes when shadowMode is false (blocking) ', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#case-study', objective,
            evidenceLedger: [goodPointer], shadowMode: false,
        });
        const res = validateAir(air);
        expect(res.ok).toBe(true);
        expect(res.wellFormedRatio).toBe(1);
    });
});

describe('Stage-3: AIR emission wired into emitDeliverable (shadow beachhead)', () => {
    const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');
    it('emitDeliverable has an opt-in air step that builds + validates(shadow) + writes AIR', () => {
        const src = read('services/emitDeliverable.ts');
        expect(src).toMatch(/air\?:\s*\{/);                         // the opt-in option
        expect(src).toMatch(/buildAir|writeAir/);                    // builds + persists
        expect(src).toMatch(/shadowMode:\s*true/);                   // ramped: shadow first, non-blocking
    });
    it('the strategy/HTML-artifact path opts into AIR emission', () => {
        const panel = read('components/CorpusChatPanel.tsx');
        expect(panel).toMatch(/air:\s*\{[\s\S]*?trigger:\s*directive\.generator/);
    });
});

describe('Stage-3: real evidence ledger from resolved chunks', () => {
    it('maps a resolved chunk (with per-chunk sources + concepts) to a well-formed EvidencePointer', () => {
        const ev = resolvedChunkToEvidence({
            id: 'articles/x.md#c3', sourcePath: 'articles/x.md', text: 'verbatim span',
            sources: [{ n: 'Higher Ed Dive', u: 'https://x' }], concepts: ['retention'], relatedChunks: ['articles/x.md#c5'],
        });
        expect(ev.pointer).toBe('articles/x.md#c3');
        expect(ev.wikiPath).toBe('articles/x.md');
        expect(ev.chunkId).toBe('c3');
        expect(ev.sources[0].sourceName).toBe('Higher Ed Dive');
        expect(ev.concepts).toEqual(['retention']);
        expect(ev.relatedChunks).toEqual(['articles/x.md#c5']);
        expect(ev.provenanceConfidence).toBe(0.85);
        expect(isWellFormedPointer(ev)).toBe(true);
    });

    it('a chunk without per-chunk sources still yields a dereferenceable pointer (lower confidence)', () => {
        const ev = resolvedChunkToEvidence({ id: 'articles/y.md#c0', text: 't' });
        expect(ev.sources).toEqual([]);
        expect(ev.provenanceConfidence).toBe(0.4);
        expect(isWellFormedPointer(ev)).toBe(false);  // no named source -> not "well-formed" (shadow reports it)
    });

    it('buildEvidenceLedger maps an array + drops id-less entries', () => {
        const ledger = buildEvidenceLedger([
            { id: 'a.md#c1', sources: [{ n: 'S', u: 'u' }] },
            { id: '', text: 'no id' } as any,
        ]);
        expect(ledger.length).toBe(1);
        expect(ledger[0].pointer).toBe('a.md#c1');
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
