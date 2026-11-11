/**
 * IA plan Phase 0 (2026-11-11): pins the TS seat matrix to proxy/model_registry.py SEAT_MATRIX and checks the
 * Phase 0 exit gate (every seat seated on a probed model, or held with a reason). Also guards the owner's
 * two hard rules on models: no Grok anywhere, and no sunset model in a seat.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEAT_MATRIX, seatsWithoutReason, type SeatId } from './seatMatrix';

const py = readFileSync(resolve(__dirname, '..', 'proxy', 'model_registry.py'), 'utf8');
const block = /SEAT_MATRIX = \{([\s\S]*?)\n\}/.exec(py)?.[1] || '';
const known = /KNOWN_MODELS = \{([\s\S]*?)\n\}/.exec(py)?.[1] || '';

function pySeat(id: string): Record<string, string> {
    const m = new RegExp(`"${id}":\\s*\\{([\\s\\S]*?)\\}`).exec(block);
    const body = m?.[1] || '';
    const field = (k: string) => (new RegExp(`"${k}":\\s*"([^"]*)"`).exec(body) || [])[1];
    return { primary: field('primary'), status: field('status') };
}

describe('seat matrix (owner, 2026-11-10)', () => {
    it('has the same ten seats, primaries and statuses in TS and Python', () => {
        const ids = Object.keys(SEAT_MATRIX) as SeatId[];
        expect(ids).toHaveLength(10);
        for (const id of ids) {
            const p = pySeat(id);
            expect(p.primary, id).toBe(SEAT_MATRIX[id].primary);
            expect(p.status, id).toBe(SEAT_MATRIX[id].status);
        }
    });

    it('meets the Phase 0 exit gate: seated on its primary, or held with a reason', () => {
        expect(seatsWithoutReason()).toEqual([]);
    });

    it('never seats Grok, and never seats a sunset model', () => {
        const json = JSON.stringify(SEAT_MATRIX).toLowerCase();
        expect(json).not.toContain('grok');
        const sunset = [...known.matchAll(/"([^"]+)":\s*\{[^}]*"status":\s*"sunset"/g)].map((m) => m[1]);
        for (const s of Object.values(SEAT_MATRIX)) {
            expect(sunset).not.toContain(s.primary);
            if (s.secondary) expect(sunset).not.toContain(s.secondary);
        }
    });

    it('registers every model id a seat names', () => {
        for (const s of Object.values(SEAT_MATRIX)) {
            for (const id of [s.primary, s.secondary, s.serving]) {
                if (!id || id.includes(' ')) continue;
                expect(known, id).toContain(`"${id}"`);
            }
        }
    });
});
