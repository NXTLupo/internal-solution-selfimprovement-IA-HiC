import { describe, it, expect } from 'vitest';
import { scoreDeliverable } from './deliverableScorer';

// Regression for the 2026-06-29 scorer fix: the em_dash_absent component used to
// count ASCII hyphens (/-/g) and report them as "em-dash characters present",
// producing a false ~1691-count failure on clean themes (live-observed) that
// dragged composite -20pts and tripped the discriminator's "quality regressed"
// alarm. The standing rule is that ASCII hyphens are legitimate; only the AI-tell
// dash family (em U+2014, en U+2013, figure U+2012, horizontal-bar U+2015) should
// be flagged.

const emDash = (s: ReturnType<typeof scoreDeliverable>) =>
    s.failures.find(f => f.startsWith('em_dash_absent'));

describe('deliverableScorer em_dash_absent — ASCII hyphens are NOT em-dashes', () => {
    it('passes clean text loaded with legitimate ASCII hyphens', () => {
        const hyphenHeavy = JSON.stringify({
            themes: [{
                name: 'state-of-the-art co-op matching',
                description: 'On 2026-06-29 the asset-management firm shipped a white-label, multi-channel, AI-driven platform; high-net-worth onboarding fell quarter-over-quarter.',
                quote: 'I applied to 60 co-ops in a multi-year window.',
            }],
        });
        // dozens of ASCII hyphens, zero em-dashes
        expect((hyphenHeavy.match(/-/g) || []).length).toBeGreaterThan(10);
        const score = scoreDeliverable(hyphenHeavy, 'meta-themes');
        expect(emDash(score)).toBeUndefined(); // no false failure
        expect(score.sub_scores['em_dash_absent']).toBe(1);
    });

    it('still fails on a real em-dash (U+2014)', () => {
        const withEmDash = JSON.stringify({ themes: [{ name: 'A', description: 'one thing—another thing' }] });
        const score = scoreDeliverable(withEmDash, 'meta-themes');
        expect(emDash(score)).toBeDefined();
        expect(score.sub_scores['em_dash_absent']).toBeLessThan(1);
    });

    it('flags en-dash / figure-dash / horizontal-bar too, but never the ASCII hyphen', () => {
        for (const ch of ['–', '‒', '―']) {
            const s = scoreDeliverable(JSON.stringify({ x: `a${ch}b` }), 'meta-themes');
            expect(emDash(s)).toBeDefined();
        }
        const asciiOnly = scoreDeliverable(JSON.stringify({ x: 'a-b-c-d-e' }), 'meta-themes');
        expect(emDash(asciiOnly)).toBeUndefined();
    });
});
