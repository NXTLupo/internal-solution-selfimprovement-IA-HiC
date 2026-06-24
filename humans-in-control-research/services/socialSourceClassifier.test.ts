import { describe, it, expect } from 'vitest';
import { isSocialSource } from './chunkRetrieval';

// 2026-06-23 — the SOURCE-TYPE BALANCE soft-cap was reddit-only. Generalized so
// the cap balances every community/social platform (incl. the new free
// connectors) against curated news/academic/government sources.
describe('isSocialSource — generalized social/community classifier', () => {
    it('flags reddit + the social-intelligence namespace', () => {
        expect(isSocialSource('social-intelligence/reddit-deep/jobs/abc.md')).toBe(true);
        expect(isSocialSource('articles/reddit/xyz.md')).toBe(true);
    });

    it('flags the new free community connectors (HN, Bluesky, Lobsters)', () => {
        expect(isSocialSource('social-intelligence/hacker-news/123.md')).toBe(true);
        expect(isSocialSource('social-intelligence/bluesky/post.md')).toBe(true);
        expect(isSocialSource('social-intelligence/lobsters/story.md')).toBe(true);
        expect(isSocialSource(undefined, 'Hacker News')).toBe(true);
        expect(isSocialSource(undefined, 'Bluesky')).toBe(true);
    });

    it('does NOT flag curated news / academic / government sources', () => {
        expect(isSocialSource('articles/higher-ed-dive/abc.md', 'Higher Ed Dive')).toBe(false);
        expect(isSocialSource('articles/openalex/smith-2024.md', 'OpenAlex: Smith 2024')).toBe(false);
        expect(isSocialSource('articles/cdc-gov/report.md', 'CDC')).toBe(false);
    });
});
