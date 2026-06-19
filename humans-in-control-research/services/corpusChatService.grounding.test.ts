import { describe, it, expect } from 'vitest';
import { buildGroundingContext } from './corpusChatService';

// 2026-06-16 - Regression guard for the "#org emitted anonymized codes instead of
// real leader names" bug. Root cause: the manifest PRIMARY block must LEAD and the
// pre-fetched article bodies (which carry the real names/titles from a client roster)
// must be a DEMOTED supplementary reference - never the driver (anti-RAG rule), but
// PRESENT (so artifacts can resolve real names the manifest pack misses).
describe('buildGroundingContext ordering (manifest PRIMARY leads, article bodies supplementary)', () => {
    const ctx: any = {
        manifestChunkCorpus: 'CHUNK_A verbatim span about advancement reporting tiers. '.repeat(5),
        prefetchedArticlesBlock: 'Diane McGillivray is the SVP of Advancement. Taylor Brooks is the VP of Development. '.repeat(5),
        corpusText: 'bulk corpus tail',
    };

    it('places the manifest PRIMARY block BEFORE the supplementary article bodies', () => {
        const out = buildGroundingContext(ctx, 'claude-opus-4-8' as any);
        const primaryIdx = out.indexOf('PRIMARY EVIDENCE (manifest-selected');
        const supplementalIdx = out.indexOf('SUPPLEMENTARY ARTICLE BODIES');
        expect(primaryIdx).toBeGreaterThanOrEqual(0);
        expect(supplementalIdx).toBeGreaterThanOrEqual(0);
        // manifest must lead so it drives structure/insights (anti-RAG rule)
        expect(primaryIdx).toBeLessThan(supplementalIdx);
    });

    it('still INCLUDES the article bodies (so artifacts can resolve real names)', () => {
        const out = buildGroundingContext(ctx, 'claude-opus-4-8' as any);
        expect(out).toContain('Diane McGillivray');
        expect(out).toContain('SUPPLEMENTARY ARTICLE BODIES');
    });

    it('labels the article bodies as a factual reference, not the primary driver', () => {
        const out = buildGroundingContext(ctx, 'claude-opus-4-8' as any);
        expect(out).toMatch(/SUPPLEMENTARY ARTICLE BODIES[^\n]*real names/i);
    });
});
