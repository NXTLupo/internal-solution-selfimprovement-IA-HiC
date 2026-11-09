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

// 2026-11-08 - structural templates (the live "#report full of AI slop" defect: a
// document cleared every lexical ban while 10.7% of its sentences carried the
// contrast template and most paragraphs closed on a short oracular verdict).
describe('templates', () => {
    it('flags contrast-template saturation', () => {
        const saturated = [
            'The university should connect to the assistant, not compete with it.',
            'Students choose the tool, not the institution behind it.',
            'Memory accrues in the agent rather than the campus platform.',
            'The complaint is not that the agent remembers; it is that the inference was undocumented.',
            'Advisors own the judgment, not the drafting work.',
            'The record belongs to the student, not the vendor.',
            'Trust is earned by read access; it is spent by silent write-back.',
            'The team ships the connector first and the dashboard later this year.',
            'The registrar sends the file on Fridays and nobody downstream reads it before Monday.',
            'A student logs into three systems to answer one question about a deadline.',
        ].join(' ');
        const m = metric(analyzeProse(saturated), 'templates');
        expect(m.pass).toBe(false);
        expect(m.offenders.length).toBeGreaterThan(0);
    });

    it('passes prose with one earned contrast among plain sentences', () => {
        const plain = [
            'The registrar exports enrollment to a weekly file. Three downstream teams never open it.',
            'Gift officers learn about a lapsed alumna from the annual reconciliation, eleven months late.',
            'The CRM stores donor history nightly and the advising notes live in a separate tool.',
            'Students ask the co-op office one question a dozen different ways each September.',
            'The fix is routing, not another dashboard.',
            'One integration engineer owns the export job and she inherited it without documentation.',
            'The finance office reconciles pledges quarterly, so the gap stays invisible between cycles.',
            'Advisors keep their own spreadsheets because the system of record loses their notes.',
            'The provost asked for a single list and received four conflicting ones in March.',
            'Nobody at the Tuesday standup can say which list was right.',
            'The attendance feed broke in October and the alert went to a retired mailbox.',
            'A work-study student found the failure while checking an unrelated report.',
        ].join(' ');
        expect(metric(analyzeProse(plain), 'templates').pass).toBe(true);
    });
});

describe('enders', () => {
    const para = (body: string, closer: string) => `${body} ${closer}`;
    const LONG = 'The registrar exports the enrollment file on Friday afternoons, the CRM ingests donor history overnight, and the advising team keeps its own notes in a spreadsheet nobody else can open without asking twice.';

    it('flags a document where most paragraphs close on a short verdict', () => {
        const paras = [
            para(LONG, 'That gap is the diagnosis.'),
            para(LONG, 'This is the core asymmetry.'),
            para(LONG, 'That tension is the whole problem.'),
            para(LONG, 'The memory is the asset.'),
            para(LONG, 'The team closed the ticket on Thursday after the registrar confirmed receipt of the corrected file.'),
        ];
        const m = metric(analyzeProse(paras.join('\n\n'), { paragraphs: paras }), 'enders');
        expect(m.pass).toBe(false);
        expect(m.offenders.length).toBeGreaterThan(0);
    });

    it('passes paragraphs that end on evidence or mechanism', () => {
        const paras = [
            para(LONG, 'The team closed the ticket on Thursday after the registrar confirmed receipt of the corrected file.'),
            para(LONG, 'Two of the four downstream teams confirmed they never received the October export.'),
            para(LONG, 'The advising office re-keys the same records into its spreadsheet every Monday morning.'),
            para(LONG, 'That gap is the diagnosis.'),
            para(LONG, 'The finance office reconciles the pledge ledger quarterly and files the variance report with the provost.'),
        ];
        expect(metric(analyzeProse(paras.join('\n\n'), { paragraphs: paras }), 'enders').pass).toBe(true);
    });

    it('is absent when no paragraphs are supplied (slide path)', () => {
        const r = analyzeProse(LONG);
        expect(r.metrics.some(m => m.id === 'enders')).toBe(false);
    });
});
