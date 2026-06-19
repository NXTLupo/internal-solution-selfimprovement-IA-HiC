import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression guard for the 2026-06-15 deck corruption (RC1):
// backfillSlidesFromWiki REPLACED 3 correct, on-topic Opus quotes with
// cross-engagement Reddit noise. Opus emits its verbatim quote in the theme's
// `evidence` STRING (no `quotes[]` array); the old skip condition only treated
// a theme as healthy if it had a non-title `quotes[]`, so every theme got
// flagged and the >=2-token wiki match overwrote good evidence.
//
// The fix: a real (non-title, non-junk) `evidence` string is healthy, so
// backfill must SKIP it entirely - which means fetchWikiArticles is never even
// called for a deck whose themes already carry real evidence.

const fetchWikiArticles = vi.fn();

vi.mock('./wikiIndexService', () => ({
    fetchWikiArticles: (...args: any[]) => fetchWikiArticles(...args),
}));

import { backfillSlidesFromWiki } from './quoteExtractor';

// The exact spurious sentence the wiki archive served for an unrelated theme.
const REDDIT_NOISE = 'The Structured output benchmark measures 7 key metrics instead of json schema, according to a recent r/MachineLearning thread.';

describe('backfillSlidesFromWiki - does not clobber real evidence (RC1)', () => {
    beforeEach(() => {
        fetchWikiArticles.mockReset();
        // If backfill ever fires, it would pull this noise sentence.
        fetchWikiArticles.mockResolvedValue([
            { source: 'Reddit: r/MachineLearning', content: REDDIT_NOISE, url: '', date: '' },
        ]);
    });

    it('preserves a real evidence string and never queries the wiki', async () => {
        const slides = [
            {
                id: 's1',
                themeCluster: {
                    themes: [
                        {
                            name: 'Deterministic deliverables',
                            insight: 'Claude skills know how to build a deck or a journey map with embedded guidance, making structured output repeatable.',
                            evidence: 'they have clawed skills that know how to create a PowerPoint deck or a journey map and has like guidance in these skills.',
                            source: 'Vanguard Working Session',
                        },
                        {
                            name: 'Persistent corpora for reproducibility',
                            insight: 'A built-in cache stores collected, distilled, chunked data so a second run analyzes what exists instead of re-pulling.',
                            evidence: 'this has your corpora that you have already collected. this is like distilled knowledge basically, and chunked data that already came in.',
                            source: 'Vanguard Working Session',
                        },
                    ],
                },
            },
        ];

        const out = await backfillSlidesFromWiki(slides, 'intelligence augmentation deck');

        // Healthy evidence => backfill is a no-op => original array ref returned.
        expect(out).toBe(slides);
        // The wiki archive must NOT be consulted for themes that already have
        // real evidence - this is what prevents the overwrite.
        expect(fetchWikiArticles).not.toHaveBeenCalled();
        // Evidence is untouched and the noise never landed.
        const themes = out[0].themeCluster.themes;
        expect(themes[0].evidence).toContain('PowerPoint deck or a journey map');
        expect(themes[0].evidence).not.toContain('json schema');
    });

    it('still backfills a theme whose evidence is missing/title-like', async () => {
        const slides = [
            {
                id: 's2',
                themeCluster: {
                    themes: [
                        {
                            // Title-shaped, no real quote => genuinely needs backfill.
                            name: 'Structured output benchmark',
                            insight: 'Structured output benchmark for machine learning models',
                            evidence: 'Structured Output Benchmark',
                            source: '',
                        },
                    ],
                },
            },
        ];

        await backfillSlidesFromWiki(slides, 'structured output benchmark metrics');
        // A genuinely-empty theme is allowed to consult the wiki.
        expect(fetchWikiArticles).toHaveBeenCalled();
    });
});
