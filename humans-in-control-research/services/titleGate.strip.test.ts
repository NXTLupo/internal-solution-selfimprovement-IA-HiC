/** 2026-10-01 "NO BLOCKERS": a figure-bearing title is neutralized and shipped, never withheld. */
import { describe, it, expect } from 'vitest';
import { stripNakedFigures, evaluateTitle } from './titleGate';

describe('stripNakedFigures', () => {
    const cases: Array<[string, string]> = [
        ['35% of first-year students do not return', 'Many first-year students do not return'],
        ['Assistant sessions convert 3x better than search', 'Assistant sessions convert several times better than search'],
        ['Churn rose by 12% in 2025', 'Churn rose in 2025'],
        ['Advisors carry 400 students each', 'Advisors carry students each'],
    ];
    for (const [input, out] of cases) {
        it(input, () => {
            const r = stripNakedFigures(input);
            expect(r).toBe(out);
            expect(evaluateTitle(r)).not.toContain('naked_number');
        });
    }
    it('keeps years and glued tokens', () => {
        expect(stripNakedFigures('Q3 renewals slipped in 2026')).toBe('Q3 renewals slipped in 2026');
    });
});
