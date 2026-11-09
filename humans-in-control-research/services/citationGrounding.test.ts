/**
 * 2026-10-20: the normalizer's dash and ellipsis classes had been mangled into `[--−]` (a range covering every
 * letter and digit) and `/.../g`, so grounding was content-blind: verbatim quotes were blanked and fabricated ones
 * kept, across themes, personas, recommendations, journey, gap and competitive outputs.
 */
import { describe, it, expect } from 'vitest';
import { verifyDeliverableCitations } from './citationGrounding';

const corpus = [
    'The CRM takes me 20 minutes per donor record, every single time, and the export breaks on apostrophes.',
    'Students who miss the second advising visit rarely return that term — advisors see it in the no-show list.',
    'We rebuilt the onboarding flow… the drop-off moved from the form to the first login.',
    // The gate needs a corpus of at least 2,000 normalized characters before it checks anything.
    ...Array.from({ length: 40 }, (_, i) => `Filler paragraph ${i}: the advising office logs each visit in the student record and reviews the no-show list every Friday.`),
].join('\n');

describe('citation grounding normalizer', () => {
    it('keeps verbatim quotes and blanks fabricated ones', () => {
        const root = {
            themes: [
                { name: 'A', quote: 'The CRM takes me 20 minutes per donor record, every single time,' },
                { name: 'B', quote: 'Advisors report that most students simply never schedule a second visit at all.' },
                { name: 'C', quote: 'The onboarding redesign cut churn in half across every cohort we measured this year.' },
                { name: 'D', quote: 'Students who miss the second advising visit rarely return that term - advisors see it' },
                { name: 'E', quote: 'We rebuilt the onboarding flow... the drop-off moved from the form to the first login.' },
            ],
        };
        const r = verifyDeliverableCitations(root, corpus);
        expect(r.checked).toBe(5);
        expect(root.themes[0].quote).not.toBe('');
        expect(root.themes[3].quote).not.toBe('');
        expect(root.themes[4].quote).not.toBe('');
        expect(root.themes[1].quote).toBe('');
        expect(root.themes[2].quote).toBe('');
        expect(r.grounded).toBe(3);
        expect(r.blanked).toBe(2);
    });
});
