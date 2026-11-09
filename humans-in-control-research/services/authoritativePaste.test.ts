/**
 * 2026-10-20 (root-cause audit P0.2): only the user's own text can be promoted to authoritative source content; the
 * session deliverable block the panel appends to every query never is.
 */
import { describe, it, expect } from 'vitest';
import { extractAuthoritativePaste, userAuthoredPart } from './corpusChatService';

const appended = '\n\n=== CURRENT DELIVERABLES IN THIS SESSION (reference these when asked to "put these on a slide" or "combine these") ===\n[persona] Jordan (APPROVED) | Sources: Reddit r/NEU, Higher Ed Dive\n\nFull deliverable data:\n' + JSON.stringify({ type: 'persona', name: 'Jordan', painPoints: Array.from({ length: 30 }, (_, i) => ({ text: `pain ${i} long enough to add bulk to the block`, source: 'Reddit r/NEU' })) }) + '\n=== END DELIVERABLES ===';

describe('authoritative paste', () => {
    it('a short request plus the appended deliverable block is NOT authoritative content', () => {
        const msg = '#journey for the onboarding flow' + appended;
        expect(userAuthoredPart(msg)).toBe('#journey for the onboarding flow');
        expect(extractAuthoritativePaste(msg)).toBeNull();
    });

    it('a real structured paste by the user still is', () => {
        const paste = ['#slides from these notes', '', '1. Advisors lose students after the second visit', '2. The CRM export breaks on apostrophes', '3. Sources: Higher Ed Dive, Reddit r/NEU', ''].join('\n') + 'x'.repeat(320);
        expect(extractAuthoritativePaste(paste + appended)).toBe(paste.trim());
    });
});
