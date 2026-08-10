// V7 (2026-08-07, sota-elevation plan) - source-type balance cap tests.
// The F5 ROOT FIX contract: all corpora prioritized equally by objective
// relevance; upload-class material (transcripts, client docs) is capped among
// AUTO picks while external candidates remain, mirroring the evidence
// hierarchy's external floor - never universally excluded, never starved when
// the corpus is upload-only, and user selections are never capped.
import { describe, it, expect } from 'vitest';
import { wouldBreachSourceCaps } from './chunkRetrieval';

const CAPS = { socialMaxFrac: 0.4, uploadMaxFrac: 0.4 };
const flags = (over: Partial<{ social: boolean; upload: boolean; protected: boolean }> = {}) =>
    ({ social: false, upload: false, protected: false, ...over });

describe('wouldBreachSourceCaps - upload balance (F5 root fix)', () => {
    it('the first upload pick never breaches (cap is a share, not a ban)', () => {
        expect(wouldBreachSourceCaps(flags({ upload: true }), { autoSocial: 0, autoUpload: 0, autoTotal: 0 }, CAPS)).toBe(false);
    });

    it('an upload pick breaches once uploads would exceed 40% of auto picks', () => {
        // 4 of 9 auto picks are uploads already; a 5th upload of 10 = 50% > ceil(0.4*10)=4
        expect(wouldBreachSourceCaps(flags({ upload: true }), { autoSocial: 0, autoUpload: 4, autoTotal: 9 }, CAPS)).toBe(true);
    });

    it('an external pick never breaches the upload cap', () => {
        expect(wouldBreachSourceCaps(flags(), { autoSocial: 0, autoUpload: 4, autoTotal: 9 }, CAPS)).toBe(false);
    });

    it('user-selected (protected) upload chunks are NEVER capped', () => {
        expect(wouldBreachSourceCaps(flags({ upload: true, protected: true }), { autoSocial: 0, autoUpload: 99, autoTotal: 100 }, CAPS)).toBe(false);
    });

    it('social cap behavior is preserved (existing P0.1 contract)', () => {
        expect(wouldBreachSourceCaps(flags({ social: true }), { autoSocial: 4, autoUpload: 0, autoTotal: 9 }, CAPS)).toBe(true);
        expect(wouldBreachSourceCaps(flags({ social: true }), { autoSocial: 1, autoUpload: 0, autoTotal: 9 }, CAPS)).toBe(false);
    });

    it('a chunk that is both social and upload breaches if either cap would be crossed', () => {
        expect(wouldBreachSourceCaps(flags({ social: true, upload: true }), { autoSocial: 0, autoUpload: 4, autoTotal: 9 }, CAPS)).toBe(true);
    });
});

describe('single-class corpus is never starved (pack-loop fallback contract)', () => {
    // The pack loop falls back to the best OVERALL candidate when every
    // remaining candidate breaches. This test documents the contract the loop
    // implements: breach=true is a DEFERRAL signal, not an exclusion.
    it('breach signals deferral, not exclusion - callers must keep a fallback', () => {
        const breach = wouldBreachSourceCaps(flags({ upload: true }), { autoSocial: 0, autoUpload: 10, autoTotal: 10 }, CAPS);
        expect(breach).toBe(true); // and the pack loop still picks it when nothing else fits
    });
});
