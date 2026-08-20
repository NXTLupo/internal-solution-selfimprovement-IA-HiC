/** DF-W2 deterministic prose signal: the machine tells that survive a word swap. */
import { describe, it, expect } from 'vitest';
import { analyzeProse, splitSentences, buildProseRepairInstruction } from './proseSignal';

const metric = (r: ReturnType<typeof analyzeProse>, id: string) => r.metrics.find(m => m.id === id)!;

describe('splitSentences', () => {
    it('does not split decimals or initialisms', () => {
        const s = splitSentences('Revenue reached 3.5 million in the U.S. market. The registrar confirmed the figure.');
        expect(s).toHaveLength(2);
        expect(s[0]).toContain('3.5');
    });
});

describe('cadence', () => {
    it('flags uniform sentence length, which is the strongest surviving tell', () => {
        // Six sentences, all 9 words: the shape a model produces when comfortable.
        const uniform = [
            'The advancement team reviews the alumni list every week.',
            'The registrar exports the enrollment file every single week.',
            'The gift officers receive the attendance report every week.',
            'The CRM system stores the donor history every week.',
            'The finance office reconciles the pledge ledger every week.',
            'The dean reviews the engagement summary every single week.',
        ].join(' ');
        expect(metric(analyzeProse(uniform), 'cadence').pass).toBe(false);
    });

    it('passes prose that varies deliberately', () => {
        const varied = 'Advisors cannot see the drop-off. The registrar exports enrollment weekly, the CRM stores donor history nightly, and neither system tells the gift officer that an alumna stopped opening mail eleven months ago. That gap is the problem.';
        expect(metric(analyzeProse(varied), 'cadence').pass).toBe(true);
    });
});

describe('openers', () => {
    it('flags adjacent sentences that open the same way', () => {
        const t = 'The team missed the handoff between advising and the registrar. The team also missed the follow-up call that week. The team never logged either event in the CRM.';
        const m = metric(analyzeProse(t), 'openers');
        expect(m.pass).toBe(false);
        expect(m.offenders.length).toBeGreaterThan(0);
    });
});

describe('actors (Actor Rule, measured)', () => {
    it('flags an abstract noun acting as the subject', () => {
        const t = 'Engagement leaks at three stages advancement cannot see. Alignment drives the retention outcome across the portfolio of programs.';
        const m = metric(analyzeProse(t), 'actors');
        expect(m.pass).toBe(false);
        expect(m.offenders[0]).toMatch(/Engagement leaks/);
    });

    it('passes the same claim rewritten with a named actor', () => {
        const t = 'Alumni drop off at three stages the advancement team cannot see. Gift officers never receive the attendance list after an event closes.';
        expect(metric(analyzeProse(t), 'actors').pass).toBe(true);
    });

    it('does not flag an abstract noun used as a modifier', () => {
        const t = 'Adoption of the new CRM rose after the registrar shortened the intake form for first-year students.';
        expect(metric(analyzeProse(t), 'actors').pass).toBe(true);
    });
});

describe('copula and dilution', () => {
    it('counts copula dodges as a rate', () => {
        const t = 'The CRM serves as the cornerstone of advancement work. The migration marks a pivotal moment for the team. The platform stands as the single record of donor history.';
        expect(metric(analyzeProse(t), 'copula').pass).toBe(false);
    });

    it('flags hedge and intensifier density', () => {
        const t = 'The registrar could perhaps see a significantly higher rate, and advisors might arguably respond somewhat faster to a very urgent case.';
        expect(metric(analyzeProse(t), 'dilution').pass).toBe(false);
    });
});

describe('paragraph shape', () => {
    it('is only judged when paragraphs are supplied', () => {
        const r = analyzeProse('One short line about the registrar and the CRM system.');
        expect(r.metrics.some(m => m.id === 'shape')).toBe(false);
    });
});

describe('repair instruction', () => {
    it('quotes the offending sentence and forbids changing facts', () => {
        const r = analyzeProse('Engagement leaks at three stages advancement cannot see. Engagement leaks again in the second year of the program.');
        const instr = buildProseRepairInstruction(r);
        expect(instr).toMatch(/PROSE REVISION REQUIRED/);
        expect(instr).toMatch(/Engagement leaks/);
        expect(instr).toMatch(/without changing any fact/i);
    });

    it('is empty when nothing is below floor', () => {
        const good = 'Alumni drop off at three stages the advancement team cannot see. Gift officers never get the attendance list. The registrar exports enrollment weekly, but nothing routes that file to anyone who could act on it before the term ends.';
        const r = analyzeProse(good);
        if (r.pass) expect(buildProseRepairInstruction(r)).toBe('');
    });
});
