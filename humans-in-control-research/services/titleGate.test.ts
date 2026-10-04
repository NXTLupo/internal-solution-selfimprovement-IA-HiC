/**
 * titleGate.test.ts (2026-10-01, plan R-B4 / Stage 2.1). The Partner Test as code: the
 * invariants are the ones `.claude/CLAUDE.md` states for action titles, plus the two
 * properties that make it safe as a gate: `no_verb` never fails a slide, and a naked
 * number is the only kind that withholds.
 */
import { describe, it, expect } from 'vitest';
import {
    evaluateTitle, evaluateTitles, hasFiniteVerb, pickTitleCandidate, withheldSlideIds,
    buildTitleRepairInstruction, TITLE_MAX_CHARS,
} from './titleGate';

describe('evaluateTitle', () => {
    it('passes the CLAUDE.md GOOD examples', () => {
        expect(evaluateTitle('First-year students leave faster than the institution can replace them')).toEqual([]);
        expect(evaluateTitle('Fragmented CRM systems force advancement teams into manual data entry instead of donor work')).toEqual(['too_long']);
        expect(evaluateTitle('AI assistants now originate retail traffic and convert better than search')).toEqual([]);
        expect(evaluateTitle('AI raises conversion and adds new costs in 2026')).toEqual([]);
    });
    it('flags the BAD examples by kind', () => {
        expect(evaluateTitle('The Landscape')).toContain('topic_label');
        expect(evaluateTitle('Key Findings')).toContain('topic_label');
        expect(evaluateTitle('35% of first-year students do not return, costing $9B annually')).toContain('naked_number');
        expect(evaluateTitle('Retail 2026: The AI Front Door Opens, the Margin Closes')).toContain('metaphor');
        const wordy = 'AI moves the retail front door from search to the assistant, but the operators who win 2026 capture the premium before the platform tax and the trust ceiling eat it';
        expect(evaluateTitle(wordy)).toEqual(expect.arrayContaining(['too_long', 'metaphor']));
    });
    it('allows years and letter-glued tokens, flags counts and multipliers', () => {
        expect(evaluateTitle('Enrollment fell after the 2024 policy change')).not.toContain('naked_number');
        expect(evaluateTitle('Q3 reviews stall because finance owns the data')).not.toContain('naked_number');
        expect(evaluateTitle('The 5-step intake process loses applicants at the second step')).not.toContain('naked_number');
        expect(evaluateTitle('Donors give 3x more after a personal call')).toContain('naked_number');
        expect(evaluateTitle('Advisors carry 400 students each')).toContain('naked_number');
    });
    it('no_verb is detect-only and never fails a slide', () => {
        const report = evaluateTitles([{ id: 's1', template: 'slides:block-quote', title: 'Advancement data silo across the campus' }]);
        expect(report.findings[0]?.kinds).toContain('no_verb');
        expect(report.findings[0]?.failing).toBe(false);
        expect(report.pass).toBe(true);
    });
});

describe('hasFiniteVerb', () => {
    it('recognizes modals, auxiliaries, third-person and past forms', () => {
        expect(hasFiniteVerb('The registrar exports enrollment weekly')).toBe(true);
        expect(hasFiniteVerb('Gift officers cannot see the attendance list')).toBe(true);
        expect(hasFiniteVerb('The migration stalled when finance withheld the budget')).toBe(true);
    });
    it('does not mistake plural nouns after a determiner for verbs', () => {
        expect(hasFiniteVerb('The systems')).toBe(false);
        expect(hasFiniteVerb('Fragmented systems')).toBe(false);
    });
});

describe('evaluateTitles', () => {
    it('exempts connective templates and deliverable subjects', () => {
        const r = evaluateTitles([
            { id: 'c', template: 'slides:cover', title: 'Retention' },
            { id: 'a', template: 'slides:agenda', title: 'Agenda' },
            { id: 'd', template: 'slides:deliverable', title: 'Jordan Ellis' },
            { id: 'b', template: 'slides:numbered-themes', composerPayload: { title: 'Advisors lose students between the first two advising visits' } },
        ]);
        expect(r.checked).toBe(1);
        expect(r.pass).toBe(true);
    });
    it('reads the composer payload title over the slide title', () => {
        const r = evaluateTitles([{ id: 'b', template: 'slides:numbered-themes', title: 'Key Findings', composerPayload: { title: 'Alumni drop off at three stages the advancement team cannot see' } }]);
        expect(r.findings).toHaveLength(0);
    });
    it('builds a repair instruction that quotes the title and names the rule', () => {
        const r = evaluateTitles([{ id: 's9', template: 'slides:stat-row', title: 'Conversion rose 40% after launch' }]);
        const instr = buildTitleRepairInstruction(r);
        expect(instr).toContain('s9');
        expect(instr).toContain('Conversion rose 40% after launch');
        expect(instr).toContain(String(TITLE_MAX_CHARS));
        expect(withheldSlideIds(r)).toEqual(['s9']);
    });
});

describe('pickTitleCandidate (verbalized sampling, gate selects)', () => {
    it('returns the first candidate that passes every failing check', () => {
        const picked = pickTitleCandidate([
            'Conversion rose 40% after launch',                               // naked number
            'The Landscape',                                                  // topic label
            'Buyers now ask the assistant before they search',               // passes
            'Buyers convert better through the assistant than through search',
        ]);
        expect(picked).toBe('Buyers now ask the assistant before they search');
    });
    it('returns null when nothing passes or the input is not a list', () => {
        expect(pickTitleCandidate(['Conversion rose 40%', 'Overview'])).toBeNull();
        expect(pickTitleCandidate('Buyers now ask the assistant')).toBeNull();
        expect(pickTitleCandidate(undefined)).toBeNull();
    });
});
