/**
 * E2.1. The grounding check turns the Partner Test into something measurable: a deck
 * fails when slide four argues from a mechanism no earlier slide introduced.
 *
 * The hard part of a gate like this is not catching the bad deck, it is NOT catching the
 * good one. Most cases below are therefore refusals to fire: a concept introduced on the
 * same slide, a label rather than an argument, a common business word, the first slide.
 * A gate that flags healthy writing gets switched off, which is worse than no gate.
 */
import { describe, it, expect } from 'vitest';
import { conceptsIn, evaluateGrounding, buildGroundingInstruction } from './groundingCheck';

const slide = (id: string, title: string, body?: string) => ({
    id, template: 'slides:evidence-table', status: 'draft', timestamp: 1, title,
    composerPayload: { title, ...(body ? { rows: [{ cells: [body] }] } : {}) },
});

describe('conceptsIn', () => {
    it('finds proper nouns that are not sentence-initial', () => {
        expect(conceptsIn('Firms adopt Recruiterflow for sequencing.')).toContain('recruiterflow');
    });

    it('finds multi-word domain phrases', () => {
        expect(conceptsIn('The team built a governed data layer last year.')).toContain('governed data layer');
    });

    it('ignores common business words on their own', () => {
        const out = conceptsIn('The process improved the results for the team.');
        expect(out).not.toContain('process');
        expect(out).not.toContain('team');
    });

    it('ignores a short initialism, which is not a concept a reader must be taught', () => {
        expect(conceptsIn('Firms use AI at each step.')).not.toContain('ai');
    });
});

describe('evaluateGrounding', () => {
    it('passes a deck that introduces a concept before arguing from it', () => {
        const deck = [
            slide('s1', 'Retained search runs on a governed data layer'),
            slide('s2', 'Enrichment shortens research', 'Enrichment shortens the research phase because the governed data layer already holds the records.'),
        ];
        const r = evaluateGrounding(deck);
        expect(r.findings).toHaveLength(0);
        expect(r.pass).toBe(true);
    });

    it('CATCHES a later slide arguing from a concept the deck never introduced', () => {
        const deck = [
            slide('s1', 'Where AI reaches the search process'),
            slide('s2', 'Research moves first', 'Research moves first because enrichment is cheap.'),
            slide('s3', 'The recommendation', 'Adoption stalls because the finalist calibration panel blocks every automated shortlist.'),
        ];
        const r = evaluateGrounding(deck);
        expect(r.findings.length).toBeGreaterThan(0);
        const f = r.findings[0];
        expect(f.concept).toContain('finalist calibration');
        expect(f.slideIndex).toBe(2);
        expect(f.sentence).toMatch(/blocks every automated shortlist/);
    });

    it('does NOT fire when the slide introduces the concept in its own title', () => {
        const deck = [
            slide('s1', 'Where AI reaches the search process'),
            slide('s2', 'The finalist calibration panel decides', 'Adoption stalls because the finalist calibration panel blocks automated shortlists.'),
        ];
        expect(evaluateGrounding(deck).findings).toHaveLength(0);
    });

    it('does NOT fire on a label: only an argument owes the reader grounding', () => {
        const deck = [
            slide('s1', 'Where AI reaches the search process'),
            // Names a new concept but asserts no causal link, so nothing is being argued.
            slide('s2', 'Vendor landscape', 'Recruiterflow, Clockwork and Thrive appear across the corpus.'),
        ];
        expect(evaluateGrounding(deck).findings).toHaveLength(0);
    });

    it('never blames the first slide, which has no earlier deck behind it', () => {
        const deck = [
            slide('s1', 'Opening', 'Adoption stalls because the finalist calibration panel blocks shortlists.'),
        ];
        expect(evaluateGrounding(deck).findings).toHaveLength(0);
    });

    it('reports a concept once, not on every slide that repeats the mistake', () => {
        const deck = [
            slide('s1', 'Opening'),
            slide('s2', 'A', 'Adoption stalls because the finalist calibration panel blocks shortlists.'),
            slide('s3', 'B', 'Rollout slows because the finalist calibration panel rejects the list again.'),
        ];
        const r = evaluateGrounding(deck);
        expect(r.findings.filter(f => f.concept.includes('finalist calibration'))).toHaveLength(1);
    });

    it('records the introduction order, so the fix has somewhere to go', () => {
        const deck = [
            slide('s1', 'Retained search and the governed data layer'),
            slide('s2', 'Next', 'Enrichment works because the governed data layer holds the records.'),
        ];
        expect(evaluateGrounding(deck).introduced).toContain('governed data layer');
    });

    it('is safe on an empty deck', () => {
        expect(evaluateGrounding([]).pass).toBe(true);
        expect(evaluateGrounding(null as any).pass).toBe(true);
    });
});

describe('buildGroundingInstruction', () => {
    it('offers both real remedies and forbids an annotation', () => {
        const deck = [
            slide('s1', 'Opening'),
            slide('s2', 'A', 'Adoption stalls because the finalist calibration panel blocks shortlists.'),
        ];
        const instr = buildGroundingInstruction(evaluateGrounding(deck));
        expect(instr).toMatch(/name and explain the term/i);
        expect(instr).toMatch(/argue from something the deck has already established/i);
        expect(instr).toMatch(/Do not add a\s*\nnote about the gap/i);
        expect(instr).toContain('slide 2');
    });

    it('is empty on a clean deck', () => {
        expect(buildGroundingInstruction({ findings: [], introduced: [], conceptsChecked: 0, pass: true })).toBe('');
    });
});
