/**
 * 2026-10-20 (root-cause audit A7, plan item 9): a figure-bearing title is restated by the MODEL with the slide's
 * evidence in hand; the deterministic strip is the fallback only. The strip produced nonsense on real titles
 * ("8% of members drive 60% of revenue" -> "Many members drive many revenue"), pinned here as the fallback shape so
 * the model path is visibly the one that keeps the judgment.
 */
import { describe, it, expect } from 'vitest';
import {
    rewriteTitleWithoutFigures, rewriteWithheldTitles, validateTitleRewrite, buildTitleRewritePrompt, stripNakedFigures,
    evaluateTitle, evaluateTitles, type TitleRewriteGen,
} from './titleGate';

const MEMBERS = '8% of members drive 60% of revenue';
const ONBOARDING = 'Onboarding drops from 14 days to 3 days';

describe('rewriteTitleWithoutFigures (model first, strip as fallback)', () => {
    it('returns the model rewrite when it validates, and the prompt carries the title and the evidence', async () => {
        const prompts: string[] = [];
        const gen: TitleRewriteGen = async p => { prompts.push(p); return 'A small share of members produces most of the revenue'; };
        const out = await rewriteTitleWithoutFigures(MEMBERS, { gen, context: 'Quote: "eight in a hundred members account for the bulk of dues" [articles/x.md#c2]' });
        expect(out).toBe('A small share of members produces most of the revenue');
        expect(evaluateTitle(out)).not.toContain('naked_number');
        expect(prompts).toHaveLength(1);
        expect(prompts[0]).toContain(`TITLE: ${MEMBERS}`);
        expect(prompts[0]).toContain('SLIDE EVIDENCE: Quote');
        expect(prompts[0]).toMatch(/no digits/i);
    });

    it('falls back to the deterministic strip when the model call throws', async () => {
        const gen: TitleRewriteGen = async () => { throw new Error('proxy down'); };
        const out = await rewriteTitleWithoutFigures(ONBOARDING, { gen });
        expect(out).toBe(stripNakedFigures(ONBOARDING));
        expect(out).not.toMatch(/\d/);
    });

    it('falls back when the reply still carries a digit, is empty, is too long, or repeats the input', async () => {
        for (const bad of ['Onboarding drops from 14 days to three days', '', '   ', 'x'.repeat(81), ONBOARDING]) {
            const out = await rewriteTitleWithoutFigures(ONBOARDING, { gen: async () => bad });
            expect(out).toBe(stripNakedFigures(ONBOARDING));
        }
    });

    it('does not call the model for a title that carries no figure', async () => {
        let calls = 0;
        const out = await rewriteTitleWithoutFigures('Advisors carry more students than they can see', { gen: async () => { calls++; return 'unused'; } });
        expect(out).toBe('Advisors carry more students than they can see');
        expect(calls).toBe(0);
    });

    it('validateTitleRewrite trims a label, quotation marks and a trailing period, and takes the first line', () => {
        expect(validateTitleRewrite('Title: "Onboarding now takes days, not weeks."\nsecond line', ONBOARDING)).toBe('Onboarding now takes days, not weeks');
        expect(validateTitleRewrite('Onboarding takes 3 days', ONBOARDING)).toBeNull();
        expect(validateTitleRewrite(42, ONBOARDING)).toBeNull();
    });

    it('the prompt caps the evidence it carries', () => {
        const p = buildTitleRewritePrompt(MEMBERS, 'e'.repeat(5000));
        expect(p.length).toBeLessThan(1500);
    });
});

describe('rewriteWithheldTitles over a title report', () => {
    it('rewrites every figure-bearing title by slide id, with per-slide context', async () => {
        const report = evaluateTitles([
            { id: 's1', template: 'slides:thesis', title: MEMBERS },
            { id: 's2', template: 'slides:thesis', title: 'Advisors carry more students than they can see' },
            { id: 's3', template: 'slides:thesis', title: ONBOARDING },
        ]);
        const seen: string[] = [];
        const gen: TitleRewriteGen = async p => {
            seen.push(p);
            return p.includes(MEMBERS) ? 'A small share of members produces most of the revenue' : 'Onboarding now takes days instead of weeks';
        };
        const map = await rewriteWithheldTitles(report, { gen, contextFor: id => `evidence for ${id}` });
        expect([...map.keys()].sort()).toEqual(['s1', 's3']);
        expect(map.get('s1')).toBe('A small share of members produces most of the revenue');
        expect(map.get('s3')).toBe('Onboarding now takes days instead of weeks');
        expect(seen.some(p => p.includes('evidence for s1'))).toBe(true);
        expect(seen.some(p => p.includes('evidence for s3'))).toBe(true);
    });

    it('returns an empty map for a missing report', async () => {
        expect((await rewriteWithheldTitles(null, { gen: async () => 'x' })).size).toBe(0);
    });
});
