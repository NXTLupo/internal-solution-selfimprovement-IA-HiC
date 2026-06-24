import { describe, it, expect } from 'vitest';
import { _collectDeliverableText } from './wikiService';

// 2026-06-23 — guards the text collector that feeds the UNIVERSAL quality-score
// pass at the writeEngagementDeliverable chokepoint. The self-recursive signal is
// only trustworthy if ids/urls/hashes do NOT pollute the slop/meta-narration
// scorer, so the collector must skip those and keep only user-visible prose.
describe('_collectDeliverableText — quality-signal input hygiene', () => {
    it('unwraps the {data} envelope and collects user-visible strings', () => {
        const text = _collectDeliverableText({
            kind: 'themes',
            data: { themes: [{ name: 'Advisor cognitive load', insight: 'The bottleneck is the advisor, not the student.' }] },
        });
        expect(text).toContain('Advisor cognitive load');
        expect(text).toContain('The bottleneck is the advisor');
    });

    it('skips ids, hashes, models, slugs, and urls (would corrupt the scorer)', () => {
        const text = _collectDeliverableText({
            data: {
                id: 'theme-001',
                reproducibility_hash: 'abc123deadbeef',
                model: 'claude-opus-4-8',
                slug: 'northeastern-advancement',
                url: 'https://example.com/article',
                title: 'A real action title sentence.',
            },
        });
        expect(text).toContain('A real action title sentence.');
        expect(text).not.toContain('abc123deadbeef');
        expect(text).not.toContain('claude-opus-4-8');
        expect(text).not.toContain('https://example.com');
        expect(text).not.toContain('theme-001');
    });

    it('is bounded and returns empty on junk input', () => {
        expect(_collectDeliverableText(null)).toBe('');
        expect(_collectDeliverableText({}).length).toBe(0);
        const big = { data: { blob: 'x'.repeat(50000) } };
        expect(_collectDeliverableText(big).length).toBeLessThanOrEqual(20000);
    });
});
