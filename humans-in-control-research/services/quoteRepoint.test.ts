/**
 * 2026-10-06: a quote attached to the WRONG pointer is re-pointed to the page of the same deck that carries it.
 */
import { describe, it, expect } from 'vitest';
import { verifyDeckEvidence, normalizeForMatch } from './citationVerifier';

const PAGES: Record<string, string> = {
    'articles/reddit-deep-r-internships/aaa.md': 'I have been auto-rejected from every portal this cycle.',
    'articles/reddit-deep-r-edtech/bbb.md': 'Almost every school I have been in has had too many digital platforms, and simply onboarding onto each system becomes an absolute pain.',
};
const fetcher = async (page: string) => (PAGES[page] != null ? normalizeForMatch(PAGES[page]) : null);

describe('quote re-pointing', () => {
    it('moves a quote to the cited page that carries it verbatim', async () => {
        const slides = [
            { id: 's1', template: 'block-quote', title: 'Students juggle too many systems', quote: { text: 'simply onboarding onto each system becomes an absolute pain. [articles/reddit-deep-r-internships/aaa.md#c0]', source: 'Reddit r/internships' } },
            { id: 's2', template: 'block-quote', title: 'Platforms multiply', quote: { text: 'Almost every school I have been in has had too many digital platforms [articles/reddit-deep-r-edtech/bbb.md#c0]', source: 'Reddit r/edtech' } },
        ];
        const rows = await verifyDeckEvidence(slides as any, fetcher);
        const moved = rows.find(r => r.slideId === 's1' && /simply onboarding/.test(r.claim));
        expect(moved?.verdict).toBe('VERIFIED');
        expect(moved?.pointer).toBe('articles/reddit-deep-r-edtech/bbb.md#c0');
        expect(moved?.note).toMatch(/re-pointed/);
    });

    it('moves a quote to a page the deck never cites when the model was shown that chunk', async () => {
        const { assembleChunkCorpus } = await import('./chunkRetrieval');
        PAGES['social-intelligence/reddit-deep/edtech/zzz.md'] = 'That is the mistake ed-tech makes. It matters how many students use it. And students were not using it.';
        assembleChunkCorpus([{ id: 'social-intelligence/reddit-deep/edtech/zzz.md#c2', text: PAGES['social-intelligence/reddit-deep/edtech/zzz.md'] } as any]);
        const slides = [{ id: 's9', template: 'block-quote', title: 'Adoption is counted by students', quote: { text: 'It matters how many students use it. [articles/reddit-deep-r-internships/aaa.md#c0]', source: 'Reddit r/edtech' } }];
        const rows = await verifyDeckEvidence(slides as any, fetcher);
        const moved = rows.find(r => r.slideId === 's9' && /how many students/.test(r.claim));
        expect(moved?.verdict).toBe('VERIFIED');
        expect(moved?.pointer).toBe('social-intelligence/reddit-deep/edtech/zzz.md#c2');
    });
});
