import { describe, it, expect } from 'vitest';
import { buildGroundingContext } from './corpusChatService';

// 2026-06-16 origin: the "#org emitted anonymized codes instead of real leader names" bug made
// the pre-fetched article bodies a SUPPLEMENTARY block next to the manifest pack.
// 2026-10-01 (plan Stage 1.1, audit B1, UNIFIED_VISION phase 5): the manifest pack is the ONE
// evidence producer. Named documents reach it through the by-name retrieval tier, so bulk
// article bodies and the raw corpus tail are injected ONLY when the manifest produced no
// grounding (the explicit empty-manifest fallback the vision permits). This test pins that.
describe('buildGroundingContext (manifest leads; bulk bodies are the empty-manifest fallback only)', () => {
    const withManifest: any = {
        manifestChunkCorpus: 'CHUNK_A verbatim span about advancement reporting tiers. '.repeat(5),
        prefetchedArticlesBlock: 'Diane McGillivray is the SVP of Advancement. Taylor Brooks is the VP of Development. '.repeat(5),
        corpusText: 'bulk corpus tail',
    };
    const noManifest: any = {
        manifestChunkCorpus: '',
        prefetchedArticlesBlock: 'Diane McGillivray is the SVP of Advancement. Taylor Brooks is the VP of Development. '.repeat(5),
        corpusText: 'bulk corpus tail',
    };
    const nothingRetrieved: any = { manifestChunkCorpus: '', prefetchedArticlesBlock: '', corpusText: 'bulk corpus tail' };

    it('with manifest grounding present, the manifest block leads and NO article bodies or raw corpus ride along', () => {
        const out = buildGroundingContext(withManifest, 'claude-opus-5-5' as any);
        expect(out.indexOf('PRIMARY EVIDENCE (manifest-selected')).toBeGreaterThanOrEqual(0);
        expect(out).not.toContain('Diane McGillivray');
        expect(out).not.toContain('ARTICLE BODIES');
        expect(out).not.toContain('RAW RESEARCH CORPUS');
    });

    it('with an empty manifest, article bodies are injected under the explicit fallback label', () => {
        const out = buildGroundingContext(noManifest, 'claude-opus-5-5' as any);
        expect(out).toContain('Diane McGillivray');
        expect(out).toMatch(/ARTICLE BODIES \(empty-manifest fallback/);
    });

    it('with nothing retrieved at all, the raw corpus is the last resort', () => {
        const out = buildGroundingContext(nothingRetrieved, 'claude-opus-5-5' as any);
        expect(out).toContain('RAW RESEARCH CORPUS');
        expect(out).toContain('bulk corpus tail');
    });
});
