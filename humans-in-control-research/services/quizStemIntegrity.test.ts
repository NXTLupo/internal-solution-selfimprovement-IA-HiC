/**
 * quizStemIntegrity.test.ts - 2026-11-09
 *
 * Owner, on a live #quiz question: "this isnt proper English? It's jibberish! Not even a
 * sentence!! SLOP!" The stem read "Reviewing what capabilities a guide to Meta Muse lists for the
 * agent". Measured on that artifact: 13 of 15 stems were proper questions, 2 were gerund
 * fragments, and 6 of 15 questions had lost option letters (one lost all four).
 *
 * One cause for both. The prose/voice repair stage rewrites a flagged span and writes it back as
 * `escapeHtml(cleaned)`, so inline markup inside the span is destroyed, and the rewrite is free to
 * change a question into a statement. These pin the two guards.
 */
import { describe, it, expect } from 'vitest';
import { __testables } from './htmlArtifactChain';

const { repairIsSafe } = __testables;

describe('a voice repair may not stop a question being a question', () => {
    it('rejects a gerund fragment in place of a question', () => {
        const original = 'Which part of the Student Hub lets one student look up personal profile information?';
        expect(repairIsSafe(original, 'Reviewing which part of the Student Hub lets one student look up personal profile information?')).toBe(false);
    });

    it('rejects a rewrite that drops the question mark', () => {
        const original = 'Which calendars does My Day preview?';
        expect(repairIsSafe(original, 'My Day previews class and Canvas calendars.')).toBe(false);
    });

    it('accepts a tightened question that stays a question', () => {
        const original = 'Which part of the Student Hub lets one student look up personal profile information?';
        expect(repairIsSafe(original, 'Which Student Hub section exposes another student profile?')).toBe(true);
    });

    it('leaves a statement rewrite judged on its other rules', () => {
        expect(repairIsSafe('The advisor keeps the decision.', 'The co-op advisor keeps the decision.')).toBe(true);
    });
});

describe('a voice repair may not destroy inline markup', () => {
    const { applySentenceRepairs } = __testables;
    const row = (id: string, rawInner: string, text: string) => ({ id, rawInner, text, pointers: [] as string[] });

    it('skips a span whose markup the rewrite would drop', () => {
        const html = '<li><b>B</b>Running only while the app window is open</li>';
        const ledger = { rows: [row('r1', '<b>B</b>Running only while the app window is open', 'B Running only while the app window is open')] } as any;
        const out = applySentenceRepairs(html, ledger, { r1: 'The agent runs only while the app window stays open.' }, new Set(['r1']));
        expect(out.html).toBe(html);
        expect(out.applied).toBe(0);
    });

    it('still repairs a plain prose span', () => {
        const html = '<p>The advisor keeps the decision.</p>';
        const ledger = { rows: [row('r1', 'The advisor keeps the decision.', 'The advisor keeps the decision.')] } as any;
        const out = applySentenceRepairs(html, ledger, { r1: 'The co-op advisor keeps the placement decision.' }, new Set(['r1']));
        expect(out.applied).toBe(1);
        expect(out.html).toContain('co-op advisor keeps the placement decision');
    });
});
