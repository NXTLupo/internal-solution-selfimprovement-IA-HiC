/**
 * The audit fix: AIR must record what happened AFTER generation. The bug this
 * guards is not hypothetical, it is what the 2026-08-20 runs actually did:
 * `qualityReport` reported `deterministicFailures: []` on a deck the chain had
 * refused with four evidence violations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import {
    noteEmittedAir, readLastEmittedAir, buildPostChainRecord, patchAirWithPostChain,
} from './airPostChain';

const chain = (over: any = {}) => ({
    slides: [{ id: 's1' }],
    envelopes: [],
    ledger: [],
    trace: [{ stepId: 'chain:normalize', status: 'success', errorType: null, nextAction: 'continue' }],
    pass: false,
    plan: null,
    repairInstruction: 'x',
    slotReport: {
        fills: [], p0Coverage: 0, pass: false,
        violations: [{ sectionId: 's1', title: 'A slide', field: 'items[0].heading', kind: 'unsupported_p0', claim: 'Adoption rose 30 percent because of the change' }],
    },
    proseReport: { metrics: [], overall: 0.8, pass: false, concerns: [{ id: 'actors', score: 0.75 }], sentenceCount: 9 },
    gradeReport: {
        claims: [{ type: 'factual' }, { type: 'process' }], unverified: [{}], superficial: [],
        rubricCritique: ['the provenance verifier produced no rows'], pass: false, summary: 's',
    },
    deckQualityReport: {
        findings: [{ kind: 'exhibit_underfilled', template: 'slides:ranked-bars', detail: 'carries 2 bars (needs 3)', remedy: 'fill or re-map' }],
        distinctArchetypes: 3, contentRatio: 0.5, sequence: ['slides:cover'], pass: false,
    },
    ...over,
} as any);

beforeEach(() => { fetchMock.mockReset(); noteEmittedAir({ runId: 'run-slug', artifactId: 'slides_123', artifactType: 'slides' }); });

describe('buildPostChainRecord', () => {
    it('captures the verdicts the console used to be the only home for', () => {
        const r = buildPostChainRecord(chain());
        expect(r.chainPass).toBe(false);
        expect(r.evidence?.violations[0]).toMatchObject({ field: 'items[0].heading', kind: 'unsupported_p0' });
        expect(r.prose?.concerns[0]).toEqual({ id: 'actors', score: 0.75 });
        expect(r.grade).toMatchObject({ factualClaims: 1, unverified: 1, superficial: 0 });
        expect(r.grade?.rubricCritique[0]).toMatch(/no rows/);
    });

    it('prefers the POST-repair chain and records the repair delta', () => {
        const before = chain();
        const after = chain({ pass: true, slotReport: { fills: [], violations: [], p0Coverage: 1, pass: true } });
        const repair = {
            slides: [{ id: 's1' }], rounds: [{ round: 1, slidesTouched: 1, fieldsEdited: 5, skippedLocked: 0, failed: 0, pass: true, violations: 0 }],
            finalChain: after, envelope: {} as any, stopReason: undefined,
        } as any;
        const r = buildPostChainRecord(before, repair, [{ id: 's1', fixed: true }]);
        expect(r.chainPass).toBe(true);
        expect(r.repair).toMatchObject({ rounds: 1, fieldsEdited: 5, violationsBefore: 1, violationsAfter: 0 });
        expect(r.evidence?.violations).toHaveLength(0);
        // The record keeps the DIFF: the shipped payload rides alongside the
        // generated one that AIR already holds.
        expect(r.shippedPayload).toEqual([{ id: 's1', fixed: true }]);
    });

    it('reports no repair block when nothing was repaired', () => {
        expect(buildPostChainRecord(chain(), { rounds: [] } as any).repair).toBeNull();
    });
});

describe('patchAirWithPostChain', () => {
    it('patches the recorded AIR id and mirrors failures into qualityReport', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ patched: true, path: 'sessions/run-slug/artifacts/slides_123.air.json' }) });
        const res = await patchAirWithPostChain(buildPostChainRecord(chain()));
        expect(res.patched).toBe(true);
        const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
        expect(body).toMatchObject({ runId: 'run-slug', artifactId: 'slides_123' });
        // The headline verdicts land where existing consumers already look, so a
        // consumer that never learns about `postChain` still stops seeing a clean
        // report on a refused artifact.
        expect(body.patch.qualityReport.deterministicFailures).toContain('evidence:unsupported_p0@s1');
        expect(body.patch.qualityReport.deterministicFailures).toContain('prose:actors');
        expect(body.patch.qualityReport.deterministicFailures).toContain('layout:exhibit_underfilled@slides:ranked-bars');
        expect(body.patch.postChain.deckQuality).toMatchObject({ distinctArchetypes: 3, contentRatio: 0.5 });
        expect(body.patch.qualityReport.reviewScores).toMatchObject({ p0_coverage: 0, unverified_factual_claims: 1 });
        expect(body.patch.qualityReport.chainPass).toBe(false);
        expect(body.patch.postChain.chainTrace).toHaveLength(1);
    });

    it('is a no-op when no AIR was emitted, and never throws', async () => {
        const res = await patchAirWithPostChain(buildPostChainRecord(chain()), null);
        expect(res).toMatchObject({ patched: false });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports a proxy failure instead of pretending the record was updated', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
        const res = await patchAirWithPostChain(buildPostChainRecord(chain()));
        expect(res).toMatchObject({ patched: false, error: 'HTTP 404' });
    });

    it('survives a network throw', async () => {
        fetchMock.mockRejectedValue(new Error('failed to fetch'));
        const res = await patchAirWithPostChain(buildPostChainRecord(chain()));
        expect(res.patched).toBe(false);
        expect(res.error).toMatch(/failed to fetch/);
    });

    it('readLastEmittedAir returns what the emitter recorded', () => {
        expect(readLastEmittedAir()).toEqual({ runId: 'run-slug', artifactId: 'slides_123', artifactType: 'slides' });
    });
});

describe('both AIR emitters must register (the live miss)', () => {
    it('the projection is a single slot that either emitter can fill', () => {
        // The chat deck path and the HTML-artifact path are separate emitters.
        // Wiring only one produced "no emitted AIR to patch" on a live #slides
        // run while an AIR file had in fact just been written by the other.
        noteEmittedAir({ runId: 'r', artifactId: 'slides_1', artifactType: 'slides' });
        expect(readLastEmittedAir()?.artifactId).toBe('slides_1');
        noteEmittedAir({ runId: 'r', artifactId: 'strategy_2', artifactType: 'strategy' });
        expect(readLastEmittedAir()?.artifactId).toBe('strategy_2');
    });
});
