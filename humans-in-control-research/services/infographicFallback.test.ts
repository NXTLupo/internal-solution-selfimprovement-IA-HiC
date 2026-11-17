/**
 * #infographic theme fallback (2026-11-09, owner-reported defect).
 *
 * The shipped exhibit the owner flagged carried FIVE cards that all said one thing, numbered
 * 01-05 as though they were a sequence:
 *   "Students demand Bring-Your-Own-AI context layers over institution-locked tools"
 *   "User Demand for Portable Context Layers Over Locked Institutional Interfaces"
 *   "Users demand Bring-Your-Own-AI portability over locked university destinations"
 *   "Users demand personal context portability over institution-locked AI destinations"
 *   "Students Demand Portable User-Owned Context Layers Over Institutional Destinations"
 * These pins keep that exhibit from ever being drawn again: restatements collapse to one idea,
 * the fallback asserts no sequence, and long theme sentences become a short name plus a caption.
 */
import { describe, it, expect } from 'vitest';
import {
    conceptOverlap,
    distinctConcepts,
    splitLabelForCard,
    themeClusterSpecFrom,
} from './artifactIllustrator';

const THE_FIVE = [
    'Students demand Bring-Your-Own-AI context layers over institution-locked tools',
    'User Demand for Portable Context Layers Over Locked Institutional Interfaces',
    'Users demand Bring-Your-Own-AI portability over locked university destinations',
    'Users demand personal context portability over institution-locked AI destinations',
    'Students Demand Portable User-Owned Context Layers Over Institutional Destinations',
];

describe('conceptOverlap', () => {
    it('scores restatements of one idea as highly overlapping', () => {
        expect(conceptOverlap(THE_FIVE[0], THE_FIVE[1])).toBeGreaterThan(0.4);
    });

    it('scores genuinely different ideas as barely overlapping', () => {
        expect(conceptOverlap('Approval gates stop autonomous spending', 'Advisors lack visibility into student goals')).toBeLessThan(0.2);
    });

    it('ignores case and filler words', () => {
        expect(conceptOverlap('Portable context layers', 'PORTABLE CONTEXT LAYERS')).toBe(1);
    });

    it('returns zero when a label has no content words', () => {
        expect(conceptOverlap('the and for', 'portable context')).toBe(0);
    });
});

describe('distinctConcepts', () => {
    it('collapses the owner-reported five restatements toward one idea', () => {
        expect(distinctConcepts(THE_FIVE).length).toBeLessThanOrEqual(2);
    });

    it('keeps the first wording of the idea it keeps', () => {
        expect(distinctConcepts(THE_FIVE)[0]).toBe(THE_FIVE[0]);
    });

    it('keeps ideas that are actually different', () => {
        const mixed = [
            'Students bring their own AI to institutional services',
            'Advisors cannot see what the assistant already told the student',
            'Approval gates decide what an agent may send outward',
        ];
        expect(distinctConcepts(mixed)).toHaveLength(3);
    });

    it('drops blanks without counting them', () => {
        expect(distinctConcepts(['', '   ', 'Real idea here'])).toEqual(['Real idea here']);
    });
});

describe('splitLabelForCard', () => {
    it('leaves a short label as the card name with no caption', () => {
        expect(splitLabelForCard('Approval gates')).toEqual({ name: 'Approval gates' });
    });

    it('splits a long theme sentence into a short name plus the full sentence', () => {
        const out = splitLabelForCard(THE_FIVE[0]);
        expect(out.name.split(' ').length).toBeLessThanOrEqual(8);
        expect(out.detail).toContain('institution-locked tools');
    });

    it('cuts on a clause boundary when the label offers one', () => {
        const out = splitLabelForCard('Portable context layers over the institution-locked tools a campus provides');
        expect(out.name).toBe('Portable context layers');
        expect(out.detail).toContain('campus provides');
    });

    it('treats a label at the word limit as a whole name', () => {
        const out = splitLabelForCard('Portable context layers over locked tools');
        expect(out).toEqual({ name: 'Portable context layers over locked tools' });
    });

    it('never leaves trailing punctuation on the name', () => {
        expect(splitLabelForCard('Approval gates,').name).toBe('Approval gates');
    });

    it('handles an empty label', () => {
        expect(splitLabelForCard('')).toEqual({ name: '' });
    });
});

describe('themeClusterSpecFrom', () => {
    it('refuses to draw an exhibit from restatements of one theme', () => {
        expect(themeClusterSpecFrom(THE_FIVE)).toBeNull();
    });

    it('draws a cluster, never a sequence, from distinct themes', () => {
        const spec = themeClusterSpecFrom([
            'Students bring their own AI to institutional services',
            'Advisors cannot see what the assistant already told the student',
            'Approval gates decide what an agent may send outward',
            'Account ownership decides who keeps the conversation history',
        ]);
        expect(spec?.kind).toBe('concept-cluster');
        expect(spec?.kind).not.toBe('process-flow');
        const nodes = (spec?.groups as any[])[0].nodes;
        expect(nodes.length).toBeGreaterThanOrEqual(3);
    });

    it('gives every card a short name and keeps the sentence as its caption', () => {
        const spec = themeClusterSpecFrom([
            'Students bring their own AI to institutional services rather than adopting a campus tool',
            'Advisors cannot see what the assistant already told the student before the meeting',
            'Approval gates decide what an agent may send outward on the student behalf',
        ]);
        for (const n of (spec?.groups as any[])[0].nodes) {
            expect(n.name.split(' ').length).toBeLessThanOrEqual(8);
            expect(typeof n.detail).toBe('string');
        }
    });

    it('returns null rather than a thin exhibit when fewer than three ideas exist', () => {
        expect(themeClusterSpecFrom(['One idea only'])).toBeNull();
        expect(themeClusterSpecFrom([])).toBeNull();
    });
});
