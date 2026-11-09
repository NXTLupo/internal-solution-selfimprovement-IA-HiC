/**
 * 2026-10-06: a lightly reworded quote is snapped to the exact source sentence (lifted from the source, never
 * authored); a paraphrase that drifts stays flagged "not found verbatim".
 */
import { describe, it, expect } from 'vitest';
import { bestVerbatimSpan } from './citationVerifier';

const PAGE = `Advisors met on September 30. Neither career development nor academic advising has capacity to provide high-touch advising to every first-year student. Students arrive at their first advisor meeting unable to answer "what kind of co-op are you looking for?" The group agreed to sequence readiness activities over time.`;

describe('bestVerbatimSpan', () => {
    it('snaps a light rewording to the exact source sentence', () => {
        const q = 'neither career development nor academic advising have the capacity to provide high-touch advising to every first-year student';
        expect(bestVerbatimSpan(q, PAGE)).toBe('Neither career development nor academic advising has capacity to provide high-touch advising to every first-year student.');
    });
    it('leaves a drifted paraphrase unmatched', () => {
        const q = 'Advising staff report that current capacity limits their ability to provide intensive coaching to new students';
        expect(bestVerbatimSpan(q, PAGE)).toBeNull();
    });
    it('matches a quote that is part of a longer sentence', () => {
        const q = 'students arrive at their first advisor meeting unable to answer what kind of co-op they want';
        expect(bestVerbatimSpan(q, PAGE)).toMatch(/^Students arrive at their first advisor meeting unable to answer/);
    });
});
