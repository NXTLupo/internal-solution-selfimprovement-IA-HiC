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
        // D12 ramp: shadow by default, per-path opt-in to blocking (air.blocking flag)
        expect(src).toMatch(/shadowMode:\s*opts\.air\.blocking !== true/);
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

// ============================================================================
// 2026-07-01 scorecard gap-closure guards (AIR Contract Compliance FAIL -> fixed)
// ============================================================================
describe('W4: renderPlan derives from the catalog (never empty)', () => {
    it('#journey gets analyst+pptx target modes and a wired D17 native-render diagram slot', () => {
        const { air } = buildAir({ runId: 'r1', artifactId: 'a1', trigger: '#journey', objective });
        expect(air.renderPlan.targetModes).toEqual(['analyst', 'pptx']);
        const diag = air.renderPlan.imageSlots.find(s => s.mode === 'diagram');
        expect(diag).toBeTruthy();
        expect(diag!.wired).toBe(true);
        expect(diag!.modelTier).toBe('native_render_chromium');
    });
    it('#gap (image-free schema deliverable) records an explicit mode:none slot, never an empty array', () => {
        const { air } = buildAir({ runId: 'r1', artifactId: 'a1', trigger: '#gap', objective });
        expect(air.renderPlan.targetModes.length).toBeGreaterThan(0);
        expect(air.renderPlan.imageSlots.length).toBeGreaterThan(0);
        expect(air.renderPlan.imageSlots[0].mode).toBe('none');
        expect(air.renderPlan.imageSlots[0].wired).toBe(true);
    });
    it('#personas (image-bearing) records a brand_image slot; #brief targets html', () => {
        const personas = buildAir({ runId: 'r1', artifactId: 'a1', trigger: '#personas', objective }).air;
        expect(personas.renderPlan.imageSlots.some(s => s.mode === 'brand_image')).toBe(true);
        const brief = buildAir({ runId: 'r1', artifactId: 'a2', trigger: '#brief', objective }).air;
        expect(brief.renderPlan.targetModes).toContain('html');
    });
    it('a caller-supplied renderPlan is never overridden', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#journey', objective,
            renderPlan: { targetModes: ['designer'], imageSlots: [{ slotId: 'x', mode: 'icon', wired: false }] },
        });
        expect(air.renderPlan.targetModes).toEqual(['designer']);
        expect(air.renderPlan.imageSlots[0].slotId).toBe('x');
    });
});

describe('W5: provider-bucket citations in the payload are a CONTRACT failure', () => {
    it('flags "(Source: Gemini Focused Research)" in the payload and BLOCKS when non-shadow', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#slides', objective,
            evidenceLedger: [goodPointer], shadowMode: false,
            artifactPayload: 'Morgan Stanley achieved adoption (Source: Gemini Focused Research).',
        });
        const res = validateAir(air);
        expect(res.ok).toBe(false);
        expect(res.failures.some(f => /provider-bucket citation/.test(f))).toBe(true);
    });
    it('reports the same defect in shadow mode without blocking (ramp semantics)', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#slides', objective,
            artifactPayload: 'x (Source: Gemini Focused Research)',
        });
        const res = validateAir(air);
        expect(res.ok).toBe(true);
        expect(res.failures.some(f => /provider-bucket citation/.test(f))).toBe(true);
    });
    it('a real named citation does not trip the bucket scan', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#slides', objective,
            evidenceLedger: [goodPointer], shadowMode: false,
            artifactPayload: '"98% adoption of internal AI tools" (Source: Higher Ed Dive).',
        });
        expect(validateAir(air).ok).toBe(true);
    });
});

describe('W8: naked-number review signal + W2/W3 hydration warnings', () => {
    it('counts naked quantitative claims outside verbatim quotes into reviewScores', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#strategy', objective,
            artifactPayload: '60% to 80% of IT budgets go to maintenance. "We cut costs 30% in a year" (Source: Chronicle).',
        });
        const res = validateAir(air);
        expect(air.qualityReport!.reviewScores['naked_numbers_outside_quotes']).toBe(2); // the quoted 30% is exempt
        expect(res.warnings.some(w => /naked quantitative/.test(w))).toBe(true);
    });
    it('warns when modelTrace or decomposedQuestions are empty (the 0/11 scorecard gaps)', () => {
        const { air } = buildAir({
            runId: 'r1', artifactId: 'a1', trigger: '#gap',
            objective: { objectiveId: 'o', userObjective: 'goal', decomposedQuestions: [] },
        });
        const res = validateAir(air);
        expect(res.warnings.some(w => /modelTrace empty/.test(w))).toBe(true);
        expect(res.warnings.some(w => /decomposedQuestions empty/.test(w))).toBe(true);
    });
});

describe('W1: evidence ledger page-level attribution fallback (registry ladder)', () => {
    it('an unsourced chunk falls back to the registered page title (e.g. a Reddit page)', async () => {
        const { registerPointerSource } = await import('./citationPointerRegistry');
        registerPointerSource('articles/reddit-deep-r-waterloo/9b1.md', 'Reddit Deep: r/waterloo');
        const ev = resolvedChunkToEvidence({
            id: 'articles/reddit-deep-r-waterloo/9b1.md#c0',
            sourcePath: 'articles/reddit-deep-r-waterloo/9b1.md',
            text: 'a long enough real chunk body about co-op housing pressure in Waterloo',
        });
        expect(ev.sources.length).toBe(1);
        expect(ev.sources[0].sourceName).toBe('Reddit Deep: r/waterloo');
        expect(ev.sources[0].sourceType).toBe('social');
        expect(ev.provenanceConfidence).toBe(0.5);
        expect(isWellFormedPointer(ev)).toBe(true);
    });
    it('doc-level resolved_sources outrank the page title (honest synthesis attribution)', async () => {
        const { registerPageResolvedSources, registerPointerSource } = await import('./citationPointerRegistry');
        registerPageResolvedSources('articles/gemini-syn/abc.md', ['JD Power', 'Insurance Journal']);
        registerPointerSource('articles/gemini-syn/abc.md', 'AI Research (gemini): buckets');
        const ev = resolvedChunkToEvidence({
            id: 'articles/gemini-syn/abc.md#c2',
            sourcePath: 'articles/gemini-syn/abc.md',
            text: 'a synthesized span long enough to not be a stub',
        });
        expect(ev.sources.map(s => s.sourceName)).toEqual(['JD Power', 'Insurance Journal']);
        expect(ev.provenanceConfidence).toBe(0.55);
    });
    it('per-chunk structured sources always win over page-level fallback', async () => {
        const { registerPointerSource } = await import('./citationPointerRegistry');
        registerPointerSource('articles/z.md', 'Page Title');
        const ev = resolvedChunkToEvidence({
            id: 'articles/z.md#c1', sourcePath: 'articles/z.md', text: 'body',
            sources: [{ n: 'Higher Ed Dive', u: 'https://x' }],
        });
        expect(ev.sources[0].sourceName).toBe('Higher Ed Dive');
        expect(ev.provenanceConfidence).toBe(0.85);
    });
    it('retrievalScore flows into objectiveScore (W6)', () => {
        const ev = resolvedChunkToEvidence({ id: 'a.md#c1', text: 'long enough chunk body here', retrievalScore: 73 });
        expect(ev.objectiveScore).toBe(73);
    });
});

describe('W6: retrieval hardening (source-level guards; behavior needs live proxy)', () => {
    const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');
    it('pickChunksForPrompt drops non-evidence (bot/boilerplate) chunks at retrieval', () => {
        const src = read('services/chunkRetrieval.ts');
        expect(src).toMatch(/isNonEvidenceChunk\(ch\.text\)/);
    });
    it('cross-engagement chunks are excluded from zero-overlap broaden backfill', () => {
        const src = read('services/chunkRetrieval.ts');
        expect(src).toMatch(/_broaden && !rec\.offEngagement/);
        expect(src).toMatch(/offEngagement: _offEngagementIds\.has\(id\)/);
    });
    it('retrieval scores are returned and attached to the grounding chunks', () => {
        const src = read('services/chunkRetrieval.ts');
        expect(src).toMatch(/scores\[id\]/);
        expect(src).toMatch(/retrievalScore: picked\.scores/);
    });
});

describe('W2: emitDeliverable records the routed model into the AIR modelTrace', () => {
    const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');
    it('the air block records a model step with selectedModel + routingReason', () => {
        const src = read('services/emitDeliverable.ts');
        expect(src).toMatch(/recordModelStep\(airTrace/);
        expect(src).toMatch(/routingReason:/);
        expect(src).toMatch(/FELL BACK from/);
    });
    it('the HTML-artifact call site passes the chooseArtifactModel decision', () => {
        const panel = read('components/CorpusChatPanel.tsx');
        expect(panel).toMatch(/chooseArtifactModel\(_htmlKind\)/);
        expect(panel).toMatch(/routing:\s*\{\s*model:\s*_artModel,\s*reason:\s*_artDecision\.reason/);
    });
    it('the research plan sub-questions are published for AIR objective hydration (W3)', () => {
        const app = read('App.tsx');
        expect(app).toMatch(/__hicResearchPlanSubQuestions/);
        const emit = read('services/emitDeliverable.ts');
        expect(emit).toMatch(/__hicResearchPlanSubQuestions/);
        expect(emit).toMatch(/auditSubQuestionCoverage/);
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
