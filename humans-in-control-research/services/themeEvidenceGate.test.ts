/** Stage 1.8 (2026-10-01): the theme evidence gate types, never drops. */
import { describe, it, expect } from 'vitest';
import { evaluateThemeEvidence, applyThemeEvidenceGate } from './themeEvidenceGate';

const theme = (over: any = {}) => ({
    name: 'Advisors lose students between the first two visits',
    description: 'Students who miss the second advising visit rarely return to the office that term.',
    citations: [
        { sourceName: 'Higher Ed Dive', url: 'https://www.highereddive.com/news/advising-gap/1', quote: 'students who miss the second advising visit rarely return that term' },
        { sourceName: 'Reddit r/NEU', url: 'https://reddit.com/r/NEU/comments/abc', quote: 'I skipped the second appointment and never went back' },
    ],
    withinDeliverableCap: true,
    ...over,
});

describe('evaluateThemeEvidence', () => {
    it('counts distinct origins by canonical URL and types the tier', () => {
        const v = evaluateThemeEvidence(theme());
        expect(v.distinctOrigins).toBe(2);
        expect(v.tier).toBe('thick');
        expect(v.flags).toEqual([]);
        expect(v.deliverable).toBe(true);
    });
    it('two citations of the same URL under different names are ONE origin', () => {
        const v = evaluateThemeEvidence(theme({ citations: [
            { sourceName: 'Higher Ed Dive', url: 'https://www.highereddive.com/news/advising-gap/1', quote: 'students who miss the second advising visit rarely return that term' },
            { sourceName: 'HED via Google News', url: 'https://highereddive.com/news/advising-gap/1/?utm=x', quote: 'students who miss the second advising visit rarely return that term' },
        ] }));
        expect(v.distinctOrigins).toBe(1);
        expect(v.tier).toBe('single_source');
    });
    it('flags a hedge in the theme voice as a promotion and holds it back from deliverables', () => {
        const v = evaluateThemeEvidence(theme({ description: 'The registrar uses Slate for intake, or something like it, and students lose track.' }));
        expect(v.flags).toContain('hedged');
        expect(v.deliverable).toBe(false);
    });
    it('flags identifiers that appear in no quoted span', () => {
        const v = evaluateThemeEvidence(theme({ description: 'Navigate Pro and Salesforce Advisor Link drop students between visits.' }));
        expect(v.flags).toContain('unverified_identifier');
    });
});

describe('applyThemeEvidenceGate', () => {
    it('writes tiers and flags in place, clears the deliverable cap on blocked themes, removes nothing', () => {
        const themes = [theme(), theme({ description: 'Advising uses Slate or something like it.' })];
        const r = applyThemeEvidenceGate(themes);
        expect(themes).toHaveLength(2);
        expect(r.checked).toBe(2);
        expect(r.flagged).toBe(1);
        expect(r.excludedFromDeliverables).toBe(1);
        expect(themes[0].withinDeliverableCap).toBe(true);
        expect(themes[1].withinDeliverableCap).toBe(false);
        expect((themes[1] as any).evidence_flags).toContain('hedged');
    });
});
