/**
 * 2026-10-20 (root-cause audit A3, VERIFIED): the breadth-floor retry recomputed
 * `withinDeliverableCap` from relevance alone, which restored every theme the evidence
 * gate had held back. `applyDeliverableCapWithGate` is the one routine both the main path
 * and the retry call: cap from relevance, then the gate, every time.
 */
import { describe, it, expect } from 'vitest';
import { applyDeliverableCapWithGate, applyThemeEvidenceGate, IN_DELIVERABLE_RELEVANCE } from './themeEvidenceGate';

const relevanceOf = (t: any): number => (typeof t?.objectiveRelevance === 'number' ? t.objectiveRelevance : 50);

const clean = (over: any = {}) => ({
    name: 'Advisors lose students between the first two visits',
    description: 'Students who miss the second advising visit rarely return to the office that term.',
    citations: [
        { sourceName: 'Higher Ed Dive', url: 'https://www.highereddive.com/news/advising-gap/1', quote: 'students who miss the second advising visit rarely return that term' },
        { sourceName: 'Reddit r/NEU', url: 'https://reddit.com/r/NEU/comments/abc', quote: 'I skipped the second appointment and never went back' },
    ],
    objectiveRelevance: 88,
    ...over,
});

const hedged = (over: any = {}) => clean({
    name: 'The registrar runs intake on Slate',
    description: 'The registrar uses Slate for intake, or something like it, and students lose track.',
    objectiveRelevance: 91,
    ...over,
});

describe('applyDeliverableCapWithGate', () => {
    it('tags the cap from relevance and holds a hedged theme back', () => {
        const themes = [clean(), hedged(), clean({ name: 'Low relevance theme', objectiveRelevance: 20 })];
        const rep = applyDeliverableCapWithGate(themes, { relevanceOf });
        expect(rep.checked).toBe(3);
        expect(themes[0].withinDeliverableCap).toBe(true);
        expect(themes[1].withinDeliverableCap).toBe(false);
        expect(themes[1].withinDeliverableCapReason).toMatch(/hedged/);
        expect(themes[2].withinDeliverableCap).toBe(false);   // below the relevance bar, not a gate flag
        expect(themes[2].withinDeliverableCapReason).toBeUndefined();
        expect(themes.map(t => t.rank)).toEqual([0, 1, 2]);
    });

    it('a second pass (the retry) keeps the hedge-blocked theme blocked and gates the addition', () => {
        const themes: any[] = [clean(), hedged()];
        applyDeliverableCapWithGate(themes, { relevanceOf });
        expect(themes[1].withinDeliverableCap).toBe(false);

        // The retry: a new theme arrives (one clean, one hedged), relevance is re-scored and the
        // set is re-ranked. The old code set withinDeliverableCap = relevance >= 50 for all here.
        themes.push(clean({ name: 'Co-op employers hire from a short list of programs', description: 'Recruiters return to the same four programs every cycle.', objectiveRelevance: 70,
            citations: [{ sourceName: 'Reddit r/cscareerquestions', url: 'https://reddit.com/r/cscareerquestions/comments/xyz', quote: 'we go back to the same four programs every cycle' }] }));
        themes.push(hedged({ name: 'Employers maybe rely on Handshake', description: 'Employers rely on Handshake, I think, for every posting.', objectiveRelevance: 75 }));
        themes.sort((a, b) => relevanceOf(b) - relevanceOf(a));
        const rep = applyDeliverableCapWithGate(themes, { relevanceOf });

        const byName = Object.fromEntries(themes.map(t => [t.name, t]));
        expect(byName['Advisors lose students between the first two visits'].withinDeliverableCap).toBe(true);
        expect(byName['The registrar runs intake on Slate'].withinDeliverableCap).toBe(false);          // still blocked after the retry
        expect(byName['Co-op employers hire from a short list of programs'].withinDeliverableCap).toBe(true);
        expect(byName['Employers maybe rely on Handshake'].withinDeliverableCap).toBe(false);          // the addition is gated too
        expect(rep.excludedFromDeliverables).toBe(2);
        expect(rep.flagged).toBe(2);
    });

    it('a theme that clears the bar on the second pass after its relevance rose is released, a gate-blocked one is not', () => {
        const themes: any[] = [clean({ objectiveRelevance: 40 }), hedged()];
        applyDeliverableCapWithGate(themes, { relevanceOf });
        expect(themes[0].withinDeliverableCap).toBe(false);
        themes[0].objectiveRelevance = 65;
        applyDeliverableCapWithGate(themes, { relevanceOf });
        expect(themes[0].withinDeliverableCap).toBe(true);
        expect(themes[1].withinDeliverableCap).toBe(false);
    });

    it('falls back to the first N by position only when no theme carries a score, and the gate still applies', () => {
        const themes: any[] = [clean({ objectiveRelevance: undefined }), hedged({ objectiveRelevance: undefined }), clean({ name: 'Third theme', objectiveRelevance: undefined })];
        applyDeliverableCapWithGate(themes, { relevanceOf, fallbackTopN: 2 });
        expect(themes[0].withinDeliverableCap).toBe(true);
        expect(themes[1].withinDeliverableCap).toBe(false);   // position 1 is inside TOP_N, the gate removes it
        expect(themes[2].withinDeliverableCap).toBe(false);   // outside TOP_N
    });

    it('exports the in-deliverable bar the main path and the retry share', () => {
        expect(IN_DELIVERABLE_RELEVANCE).toBe(50);
        const themes = [clean({ objectiveRelevance: 50 })];
        applyDeliverableCapWithGate(themes, { relevanceOf });
        expect(themes[0].withinDeliverableCap).toBe(true);
    });

    it('applyThemeEvidenceGate alone never raises a cap, so folded citations can only re-type, not release', () => {
        const themes = [hedged({ withinDeliverableCap: false })];
        applyThemeEvidenceGate(themes);
        expect(themes[0].withinDeliverableCap).toBe(false);
    });
});
