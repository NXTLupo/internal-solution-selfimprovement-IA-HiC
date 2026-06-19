import { describe, it, expect, vi, afterEach } from 'vitest';
import { gateAir, airRepairNote } from './airGate';

afterEach(() => { vi.restoreAllMocks(); });

const AIR = { brief: {}, evidence_ledger: [], insight_hierarchy: {}, artifact_payload: {}, render_plan: {} } as any;

describe('airGate client (Track AIR runtime)', () => {
    it('returns the proxy gate + score on 200', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({ gate: { status: 'fail', errors: ['missing required AIR field: brief'] }, score: { slides: 0 } }),
        })) as any);
        const r = await gateAir(AIR);
        expect(r.available).toBe(true);
        expect(r.gate.status).toBe('fail');
        expect(r.gate.errors).toContain('missing required AIR field: brief');
    });

    it('NEVER blocks generation when the proxy is unreachable (available:false, gate pass)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }) as any);
        const r = await gateAir(AIR);
        expect(r.available).toBe(false);
        expect(r.gate.status).toBe('pass'); // fail-open so the gate is never a single point of failure
    });

    it('treats a non-200 as unavailable (fail-open)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })) as any);
        const r = await gateAir(AIR);
        expect(r.available).toBe(false);
        expect(r.gate.status).toBe('pass');
    });

    it('airRepairNote lists the concrete defects for the re-ask', () => {
        const note = airRepairNote({ gate: { status: 'fail', errors: ['title is a topic label', 'recommendation[0] missing owner'] }, score: {} as any, available: true });
        expect(note).toContain('title is a topic label');
        expect(note).toContain('recommendation[0] missing owner');
        expect(note).toContain('re-emit the COMPLETE corrected AIR');
    });

    it('airRepairNote is empty when there are no errors', () => {
        expect(airRepairNote({ gate: { status: 'pass', errors: [] }, score: {} as any, available: true })).toBe('');
    });
});
