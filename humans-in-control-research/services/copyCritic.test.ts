/** 2026-10-26: the copy critic rewrites fragments and presenter advice field by field, behind a fact guard. */
import { describe, it, expect } from 'vitest';
import { critiqueDeckCopy, acceptCopyRewrite, copyRewriteVerdict } from './copyCritic';

const deck: any[] = [{
    id: 's2', template: 'slides:flow-arc', title: 'We enter through a high-value workflow, prove the model, then expand',
    composerPayload: {
        _provided: true,   // the client's own portfolio slide: every figure on it survives the copy edit
        kicker: 'PORTFOLIO THESIS | FOUR ANCHOR RELATIONSHIPS, ONE REPEATABLE DELIVERY MODEL',
        title: 'Four anchor relationships, one repeatable delivery model',
        steps: [{ title: 'Diagnose', description: 'Diagnose finds the workflow where friction, risk and manual effort are already visible.' }],
        outcome: '2027 continuity is the cumulative effect of embedded teams and $276K contracted entering Q1 2027.',
    },
}];

describe('copy critic', () => {
    it('the guard refuses a rewrite that adds or drops a figure, or drops most names', () => {
        expect(acceptCopyRewrite('Northeastern holds $276K contracted entering Q1 2027.', 'Northeastern holds $300K contracted entering Q1 2027.')).toBeNull();
        expect(acceptCopyRewrite('Northeastern holds $276K contracted entering Q1 2027.', 'Northeastern holds a contract entering the new year.')).toBeNull();
        expect(acceptCopyRewrite('Estee Lauder and Canon CFS renew in Q1 2027.', 'Two clients renew in Q1 2027.')).toBeNull();
        expect(acceptCopyRewrite('Four anchor relationships, one repeatable delivery model', 'NXT Humans runs four anchor accounts on one repeatable delivery model', 'title'))
            .toBe('NXT Humans runs four anchor accounts on one repeatable delivery model');
    });

    it('accepts the three live rewrites the first guard refused (2026-10-26)', () => {
        // an all-caps label has no names to keep
        expect(acceptCopyRewrite('APPENDIX: HOW TO PRESENT THESE NUMBERS CREDIBLY', 'CONTRACT STATUS', 'kicker')).toBe('CONTRACT STATUS');
        expect(acceptCopyRewrite('PORTFOLIO THESIS · FOUR ANCHOR RELATIONSHIPS, ONE DELIVERY MODEL', 'PORTFOLIO THESIS', 'kicker')).toBe('PORTFOLIO THESIS');
        // a year the slide already states may move into the title; a year it never states may not
        const ctx = 'FY2027 management outlook by account: Northeastern, Estee Lauder, Benefits Cortex, Canon CFS';
        expect(acceptCopyRewrite('The continuity story is a portfolio, not a promise', 'Four client relationships together support 2027 continuity', 'title', ctx))
            .toBe('Four client relationships together support 2027 continuity');
        expect(acceptCopyRewrite('The continuity story is a portfolio, not a promise', 'Four client relationships together support 2028 continuity', 'title', ctx)).toBeNull();
    });

    it('a sentence ending on a closing quote and a figure-like code are not names (2026-10-26 live refusals)', () => {
        const advice = "Say 'management outlook,' 'proposal-backed,' 'risk-adjusted pipeline.' Avoid 'contracted recurring revenue' until follow-on SOWs are executed.";
        expect(acceptCopyRewrite(advice, 'FY2027 amounts stay management outlook until the follow-on SOWs are executed.', 'takeaway.statement', 'FY2027 outlook'))
            .toBe('FY2027 amounts stay management outlook until the follow-on SOWs are executed.');
        expect(acceptCopyRewrite('The Ordinary AI H1-2027 extension proposal ($500K) plus a wider runway', 'NXT Humans proposed a $500K H1 2027 extension for The Ordinary AI, with a wider runway across brands.', 'blocks[4].body', ''))
            .not.toBeNull();
    });

    it('Quantitative Claim Rule: a research slide may drop a naked number; a quoted number and an attached slide keep theirs', () => {
        expect(copyRewriteVerdict('20-35%', 'THIN', 'stats[0].figure', '', { research: true }).text).toBe('THIN');
        expect(copyRewriteVerdict('Accenture exited more than 11,000 workers in its delivery layer', 'Accenture cut thousands of delivery roles', 'rows[0].prove', '', { research: true }).text).toBeTruthy();
        expect(copyRewriteVerdict('A founder says "a $100k project now costs $20k" on r/agency', 'A founder says the projects now cost far less', 'stats[0].means', '', { research: true }).text).toBeNull();
        expect(copyRewriteVerdict('$1.6M management outlook', 'LARGEST OUTLOOK', 'stats[0].figure', '', { research: false }).text).toBeNull();
    });

    it('applies only the accepted rewrites and reports both counts', async () => {
        const reply = JSON.stringify({
            s2: {
                title: 'NXT Humans runs four anchor accounts on one repeatable delivery model',
                'steps[0].description': 'The team starts where friction, risk and manual effort are already visible.',
                outcome: '2027 continuity comes from embedded teams, not one renewal.',   // drops $276K and Q1 2027: refused
                'not.a.field': 'ignored',
            },
        });
        let seen = '';
        const r = await critiqueDeckCopy(deck, { call: async (system, user) => { seen = system + user; return `Here:\n${reply}`; } });
        expect(seen).toContain('complete business sentences');
        expect(seen).toContain('Four anchor relationships, one repeatable delivery model');
        const edits = r.edits.get('s2')!;
        expect(edits.map(e => e.path).sort()).toEqual(['steps[0].description', 'title']);
        expect(r.result.rewritten).toBe(2);
        expect(r.result.rejected).toBe(1);
        expect(r.result.line).toMatch(/2 rewritten as complete business sentences; 1 rewrite\(s\) refused by the fact guard/);
    });

    it('fails open when the model call throws', async () => {
        const r = await critiqueDeckCopy(deck, { call: async () => { throw new Error('upstream 529'); } });
        expect(r.edits.size).toBe(0);
        expect(r.result.line).toMatch(/did not run/);
    });
});

import { isThesisField } from './artifactRepair';
describe('evidence repair scope (2026-10-26)', () => {
    it('never rewrites the thesis carriers or the agenda', () => {
        expect(isThesisField({ template: 'slides:cover' }, 'title')).toBe(true);
        expect(isThesisField({ template: 'slides:cover' }, 'subtitle')).toBe(false);
        expect(isThesisField({ template: 'slides:thesis-interstitial' }, 'thesis')).toBe(true);
        expect(isThesisField({ template: 'slides:agenda' }, 'groups.0.items.1')).toBe(true);
        expect(isThesisField({ template: 'slides:brief-card' }, 'title')).toBe(false);
    });
});
