// 2026-10-01 (plan 9.6 R-M4): reinforcement inference and verbalized sampling must be NUMBERS in the
// benchmark, not claims. The golden-set report now carries ri_fire_rate and vs_candidate_spread read
// from AIR qualityReport fields (`ri`, `vsCandidates`); 0 when nothing carried them. Discrimination
// math is untouched.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { extractMechanismSignals, summarizeMechanismSignals, runGate, compareReports, type GoldenSetReport } from './goldenSetRunner';

beforeEach(() => { fetchMock.mockReset(); });

describe('extractMechanismSignals', () => {
    it('returns nulls when the record carries no qualityReport or no fields', () => {
        expect(extractMechanismSignals(null)).toEqual({ riFired: null, vsSpread: null });
        expect(extractMechanismSignals({ qualityReport: { shadowMode: true } })).toEqual({ riFired: null, vsSpread: null });
    });
    it('reads ri as {fired} or boolean and vsCandidates as an array (distinct ratio) or a count', () => {
        expect(extractMechanismSignals({ qualityReport: { ri: { fired: true } } }).riFired).toBe(true);
        expect(extractMechanismSignals({ qualityReport: { ri: false } }).riFired).toBe(false);
        expect(extractMechanismSignals({ qualityReport: { vsCandidates: ['a', 'A ', 'b', { text: 'c' }] } }).vsSpread).toBe(0.75);
        expect(extractMechanismSignals({ qualityReport: { vsCandidates: [] } }).vsSpread).toBe(0);
        expect(extractMechanismSignals({ qualityReport: { vsCandidates: 5 } }).vsSpread).toBe(1);
    });
});

describe('summarizeMechanismSignals', () => {
    it('is zero with sample counts of zero when nothing was measured', () => {
        expect(summarizeMechanismSignals([])).toEqual({ ri_fire_rate: 0, vs_candidate_spread: 0, mechanism_samples: { ri: 0, vs: 0 } });
        expect(summarizeMechanismSignals([{ riFired: null, vsSpread: null }]).mechanism_samples).toEqual({ ri: 0, vs: 0 });
    });
    it('rates over the records that carried the signal only', () => {
        const s = summarizeMechanismSignals([
            { riFired: true, vsSpread: 1 },
            { riFired: false, vsSpread: 0.5 },
            { riFired: null, vsSpread: null },
            { riFired: true, vsSpread: null },
        ]);
        expect(s.ri_fire_rate).toBeCloseTo(2 / 3);
        expect(s.vs_candidate_spread).toBeCloseTo(0.75);
        expect(s.mechanism_samples).toEqual({ ri: 3, vs: 2 });
    });
});

describe('runGate report shape', () => {
    it('carries ri_fire_rate / vs_candidate_spread (0 without AIRs; computed from airRecords) and leaves discrimination unchanged', async () => {
        fetchMock.mockImplementation(async (url: string) => {
            if (/golden-set\.json$/.test(url)) return { ok: true, status: 200, json: async () => ({ version: 3, purpose: 'p', frozen_at: '2026-10-01', tiers: { positive_exemplars: { role: 'r', registered: [] } } }) };
            if (/failure-corpus/.test(url)) return { ok: true, status: 200, json: async () => ({ total_population: 0, sample_size: 0, kinds_filter: null, members: [] }) };
            return { ok: false, status: 404, json: async () => ({}) };
        });
        const empty = await runGate({ failureSampleSize: 0 });
        expect(empty.aggregate).toMatchObject({ discrimination: 0, ri_fire_rate: 0, vs_candidate_spread: 0, mechanism_samples: { ri: 0, vs: 0 } });

        const withAirs = await runGate({
            failureSampleSize: 0,
            airRecords: [
                { qualityReport: { ri: { fired: true }, vsCandidates: ['x', 'y', 'y'] } },
                { qualityReport: { ri: { fired: false } } },
            ],
        });
        expect(withAirs.aggregate.ri_fire_rate).toBe(0.5);
        expect(withAirs.aggregate.vs_candidate_spread).toBeCloseTo(2 / 3);
        expect(withAirs.aggregate.mechanism_samples).toEqual({ ri: 2, vs: 1 });
        // the acceptance rule still reads discrimination / exemplar / failure only
        const d = compareReports(empty as GoldenSetReport, withAirs as GoldenSetReport);
        expect(d.decision).toBe('apply');
        expect(d.discrimination_delta).toBe(0);
    });
});

// R-M4 producer half (2026-10-01): the AIR qualityReport now CARRIES `ri` and `vsCandidates` so the
// signals above are read from real records. buildAir copies them from its input; emitDeliverable
// mirrors opts.ri / opts.vsCandidates onto that input.
describe('R-M4 producer: qualityReport.ri / vsCandidates on the AIR', () => {
    it('buildAir copies ri and vsCandidates into qualityReport and extractMechanismSignals reads them', async () => {
        const { buildAir } = await import('./artifactAirService');
        const { air } = buildAir({
            runId: 'r', artifactId: 'a', trigger: '#strategy',
            objective: { objectiveId: 'o', userObjective: 'x', decomposedQuestions: [] },
            ri: { fired: true, before: { slop: 3, titles: 1 }, after: { slop: 0, titles: 1 }, resolved: 3, survived: 1 },
            vsCandidates: ['Students leave before term two', 'Advising queues outgrow the staff', 'Students leave before term two'],
        });
        expect(air.qualityReport?.ri).toEqual({ fired: true, before: { slop: 3, titles: 1 }, after: { slop: 0, titles: 1 }, resolved: 3, survived: 1 });
        expect(air.qualityReport?.vsCandidates?.length).toBe(3);
        const m = extractMechanismSignals(air);
        expect(m.riFired).toBe(true);
        expect(m.vsSpread).toBeCloseTo(2 / 3);
    });
    it('buildAir leaves both fields absent when the caller carried neither', async () => {
        const { buildAir } = await import('./artifactAirService');
        const { air } = buildAir({ runId: 'r', artifactId: 'a', trigger: '#strategy', objective: { objectiveId: 'o', userObjective: 'x', decomposedQuestions: [] } });
        expect(air.qualityReport).not.toHaveProperty('ri');
        expect(air.qualityReport).not.toHaveProperty('vsCandidates');
        expect(extractMechanismSignals(air)).toEqual({ riFired: null, vsSpread: null });
    });
    it('emitDeliverable mirrors opts.ri (normalized to the full record) and opts.vsCandidates into buildAir', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(path.resolve(__dirname, 'emitDeliverable.ts'), 'utf-8');
        expect(src).toMatch(/vsCandidates\?: string\[\];/);
        expect(src).toMatch(/before\?: Record<string, number>;/);
        const buildAirCall = src.slice(src.indexOf('buildAir({'), src.indexOf('if (!entry)'));
        expect(buildAirCall).toMatch(/ri: \{\s*fired: opts\.ri\.fired === true,\s*before: opts\.ri\.before \?\? \{\},\s*after: opts\.ri\.after \?\? \{\},/);
        expect(buildAirCall).toMatch(/vsCandidates: opts\.vsCandidates/);
        const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'schemas', 'artifact_air.schema.json'), 'utf-8'));
        expect(schema.properties.qualityReport.properties.ri.required).toEqual(['fired', 'before', 'after', 'resolved', 'survived']);
        expect(schema.properties.qualityReport.properties.vsCandidates.items.type).toBe('string');
    });
});
