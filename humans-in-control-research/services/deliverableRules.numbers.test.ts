/**
 * The number rule on the live 2026-10-02 #prd failure strings: names that carry a number survive, figures are
 * replaced without eating the following space or the full stop.
 */
import { describe, it, expect } from 'vitest';
import { nakedNumbers, runDeliverableRules, type DeliverableAdapter } from './deliverableRules';

async function repair(text: string): Promise<string> {
    const box = { text };
    const adapter: DeliverableAdapter<typeof box> = {
        deliverable: 't',
        claimSet: (a) => ({ deliverable: 't', units: [{ id: 'u', kind: 'body', text: a.text, set: (t: string) => { a.text = t; } }], quotes: [], sources: [], evidence: [], declaredIds: [], refs: [] }),
    };
    await runDeliverableRules(box, adapter);
    return box.text;
}

describe('number rule (live #prd regressions)', () => {
    it('keeps product and phase names that carry a number', async () => {
        expect(nakedNumbers('Live integration with Acme 360 or any other live record source')).toEqual([]);
        expect(nakedNumbers('Context comes through Acme 360/Snowflake.')).toEqual([]);
        expect(nakedNumbers('Phase 2 adds the advisor view')).toEqual([]);
        expect(await repair('Given Acme 360 records an assigned advisor')).toBe('Given Acme 360 records an assigned advisor');
    });
    it('still replaces quantities, keeping spacing and punctuation', async () => {
        expect(nakedNumbers('Over 200 students wait')).toEqual(['200']);
        expect(await repair('The portal replies within 3 days or escalates.')).toBe('The portal replies within the stated threshold or escalates.');
        expect(await repair('Each advisor serves 400 students.')).toBe('Each advisor serves the stated threshold students.');
        expect(await repair('Approval takes 5.')).toBe('Approval takes the stated threshold.');
    });
});

describe('number rule: dates are never names', () => {
    it('does not read "Generated 2026-10-01" as a name', () => {
        expect(nakedNumbers('Generated 2026-10-01')).toEqual([]);
        expect(nakedNumbers('Release 2026/10 notes')).toEqual(['10']);
    });
});

describe('number rule: qualitative repairs', () => {
    it('turns a share of a population into a quantifier and a hyphenated measure into a compound', async () => {
        expect(await repair('95% of students skip the guide.')).toBe('nearly all of the students skip the guide.');
        expect(await repair('Only 20 percent of their advisors reply.')).toBe('Only a minority of their advisors reply.');
        expect(await repair('A 10-point gap separates the cohorts.')).toBe('A multi-point gap separates the cohorts.');
        expect(await repair('Pending H-1B rules change on 2026-10-01.')).toBe('Pending H-1B rules change on 2026-10-01.');
    });
});

describe('number rule: run 3 regressions', () => {
    it('protects truncated source paths and a figure that modifies a singular noun', async () => {
        expect(nakedNumbers('see [articles/hic-theme-synthesis/12e4b6fb89')).toEqual([]);
        expect(await repair('A unified 360 student profile is the prerequisite.')).toBe('A unified 360 student profile is the prerequisite.');
        expect(await repair('Each advisor serves 400 students.')).toBe('Each advisor serves the stated threshold students.');
    });
});

describe('number rule: protected spans survive a repair (offline audit 2026-10-03)', () => {
    it('restores a protected token in a sentence that also carries a figure', async () => {
        const out = await repair("In Purdue's 2026 Ag Economy Barometer, farmers ranked input costs first by 40 points.");
        expect(out).toContain('2026');
        expect(out).not.toMatch(/\u0000/);
        const many = await repair('R-1, R-2, R-3, R-4, R-5, R-6, R-7, R-8, R-9, R-10, R-11 and R-12 slipped 3 weeks.');
        expect(many).toContain('R-12');
        expect(many).not.toMatch(/\u0000/);
    });
});
