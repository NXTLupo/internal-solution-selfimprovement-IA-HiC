// titleGuard.test.ts - 2026-08-13 live-defect pins for guardArtifactTitle.
// An #report shipped titled "The evidence tells one clear story: the corpus can
// name <subject>'s mandate, but it cannot yet substantiate the" (corpus-as-
// subject meta + dangling-article truncation). These pins keep it dead.

import { describe, expect, it } from 'vitest';
import { guardArtifactTitle } from './slidePostProcessor';

describe('guardArtifactTitle (corpus-meta title guard)', () => {
    const topic = 'executive search industry trends and leadership advisory mandates';

    it('rejects the exact live-defect corpus-as-subject title and falls back to the topic', () => {
        const bad = "The evidence tells one clear story: the corpus can name the client's mandate, but it cannot yet substantiate the";
        const out = guardArtifactTitle(bad, topic);
        expect(out.toLowerCase()).toContain('executive search');
        expect(out.toLowerCase()).not.toContain('corpus');
        expect(out.toLowerCase()).not.toContain('evidence tells');
    });

    it('rejects other corpus/data-as-narrator shapes', () => {
        for (const bad of [
            'The data shows a fragmented market for retained search',
            'Evidence suggests the mandate is credible',
            'The research indicates three gaps',
        ]) {
            const out = guardArtifactTitle(bad, topic);
            expect(out.toLowerCase()).toContain('executive search');
        }
    });

    it('trims dangling function words left by truncation', () => {
        const out = guardArtifactTitle('Retained search firms now compete on data and the', topic);
        expect(out).toBe('Retained search firms now compete on data');
    });

    it('keeps a clean subject judgment untouched (capitalized)', () => {
        const good = 'Retained search firms now compete on relationship data, not rolodexes';
        expect(guardArtifactTitle(good, topic)).toBe(good);
    });

    it('empty title falls back to the topic', () => {
        expect(guardArtifactTitle('', topic).toLowerCase()).toContain('executive search');
    });
});
