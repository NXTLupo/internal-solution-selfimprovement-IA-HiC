import { describe, it, expect } from 'vitest';
import { extractInlineSources, resolvedChunkToEvidence, isWellFormedPointer } from './evidenceLedgerService';

// STRAGGLER D3/#15 forward-fix: recover named sources from a chunk's inline "Source:" line when the manifest
// carries no structured sources[]. Cases mirror the real #slides AIR (slides_1782907982158) that motivated it.

describe('D3/#15 inline-source recovery', () => {
    it('recovers a markdown "Source: [Name](url)" (the real Reddit Deep case)', () => {
        const text = '# Cigna denial\n\nSource: [Reddit Deep: r/healthinsurance](https://www.reddit.com/r/HealthInsurance/comments/1rf)';
        const s = extractInlineSources(text);
        expect(s).toHaveLength(1);
        expect(s[0].sourceName).toBe('Reddit Deep: r/healthinsurance');
        expect(s[0].url).toContain('reddit.com');
    });

    it('does NOT invent a source from bot/boilerplate text (no "Source:" label)', () => {
        const text = 'I am a bot, and this action was performed automatically. Please contact the moderators of this subreddit.';
        expect(extractInlineSources(text)).toHaveLength(0);
    });

    it('recovers a plain "(Source: Name)" form', () => {
        expect(extractInlineSources('Churn is the core failure. (Source: Higher Ed Dive)')[0].sourceName).toBe('Higher Ed Dive');
    });

    it('a chunk with NO structured sources but an inline Source: becomes WELL-FORMED (unblocks the AIR gate)', () => {
        const chunk = {
            id: 'articles/reddit-deep-r-healthinsurance/3016cd96de.md#c0',
            text: '# Cigna denial\n\nSource: [Reddit Deep: r/healthinsurance](https://www.reddit.com/r/HealthInsurance/x)',
            sources: [],   // manifest chunk predates WS-A per-chunk sources
        };
        const p = resolvedChunkToEvidence(chunk);
        expect(p.sources.length).toBeGreaterThan(0);
        expect(isWellFormedPointer(p)).toBe(true);
        expect(p.provenanceConfidence).toBe(0.6);   // recovered-from-body tier
    });

    it('structured manifest sources ALWAYS win over inline (fallback never overrides)', () => {
        const chunk = {
            id: 'articles/x.md#c1',
            text: 'Source: [Wrong Inline](https://wrong.example.com/x)',
            sources: [{ n: 'Higher Ed Dive', u: 'https://highereddive.com/a' }],
        };
        const p = resolvedChunkToEvidence(chunk);
        expect(p.sources).toHaveLength(1);
        expect(p.sources[0].sourceName).toBe('Higher Ed Dive');
        expect(p.provenanceConfidence).toBe(0.85);   // structured tier
    });
});
