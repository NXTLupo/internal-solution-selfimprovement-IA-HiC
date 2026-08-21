/**
 * DF-F1/F2. The load-bearing test is ATOMIC DEGRADATION: one broken field must
 * degrade the WHOLE payload, because a form that renders five of six business
 * fields while reporting success is a data-loss bug wearing a UI.
 *
 * The second set of tests is the REJECT from the plan, enforced: clarification
 * fires at three declared points and nowhere else, or the tool becomes a stall.
 */
import { describe, it, expect } from 'vitest';
import {
    validateClarification, degradeToFreeText, buildClarificationRequest,
    checkObjectiveTrigger, checkPackTrigger, checkDeliverableTrigger,
    CLARIFICATION_LIMITS,
} from './clarification';

const goodField = (id: string) => ({ id, label: `Which ${id} applies?`, mode: 'free_text', required: true });

describe('atomic validation', () => {
    it('accepts a well-formed payload', () => {
        const res = validateClarification({
            trigger: 'objective_underspecified',
            preamble: 'Two details are missing before collection.',
            fields: [goodField('industry'), goodField('audience')],
        });
        expect(res.ok).toBe(true);
        expect(res.request.fields).toHaveLength(2);
        expect(res.request.degradedFrom).toBeUndefined();
    });

    it('degrades the WHOLE payload when ONE field is broken', () => {
        const res = validateClarification({
            trigger: 'objective_underspecified',
            preamble: 'Two details are missing before collection.',
            fields: [goodField('industry'), { id: 'audience', label: 'ok', mode: 'not_a_mode' }],
        });
        expect(res.ok).toBe(false);
        expect(res.request.version).toBe(1);
        expect(res.request.fields).toHaveLength(1);
        expect(res.request.degradedFrom).toBe(2);
        // The QUESTION survives even though the structure did not.
        expect(res.request.fields[0].label).toContain('Which industry applies?');
    });

    it('rejects a choice with fewer than two options', () => {
        const res = validateClarification({
            trigger: 'pack_mismatch', preamble: 'Which pack should cover this?',
            fields: [{ id: 'pack', label: 'Pick a pack', mode: 'choice_with_other', options: [{ value: 'a', label: 'A' }], required: true }],
        });
        expect(res.ok).toBe(false);
        expect(res.problems[0]).toMatch(/fewer than two options/);
    });

    it('rejects duplicate field ids, which would overwrite an answer', () => {
        const res = validateClarification({
            trigger: 'objective_underspecified', preamble: 'Details are missing here.',
            fields: [goodField('industry'), goodField('industry')],
        });
        expect(res.ok).toBe(false);
        expect(res.problems.some(p => /share an id/.test(p))).toBe(true);
    });

    it('enforces every declared cap', () => {
        const many = Array.from({ length: CLARIFICATION_LIMITS.maxFields + 1 }, (_, i) => goodField(`f${i}`));
        expect(validateClarification({ trigger: 'objective_underspecified', preamble: 'Missing details here.', fields: many }).ok).toBe(false);

        const tooManyOptions = {
            id: 'pack', label: 'Pick one', mode: 'choice_with_other', required: true,
            options: Array.from({ length: CLARIFICATION_LIMITS.maxOptionsPerField + 1 }, (_, i) => ({ value: `v${i}`, label: `L${i}` })),
        };
        expect(validateClarification({ trigger: 'pack_mismatch', preamble: 'Missing details here.', fields: [tooManyOptions] }).ok).toBe(false);

        const huge = { id: 'x', label: 'L'.repeat(CLARIFICATION_LIMITS.maxSerializedChars), mode: 'free_text', required: true };
        expect(validateClarification({ trigger: 'pack_mismatch', preamble: 'Missing details here.', fields: [huge] }).ok).toBe(false);
    });

    it('rejects an undeclared trigger rather than inventing a fourth trigger point', () => {
        const res = validateClarification({ trigger: 'model_feels_uncertain', preamble: 'I am unsure about this.', fields: [goodField('x')] });
        expect(res.ok).toBe(false);
        expect(res.problems.some(p => /not one of the three declared trigger points/.test(p))).toBe(true);
    });

    it('always returns a usable request, even from garbage', () => {
        for (const input of [null, undefined, 42, 'string', {}, { fields: [] }]) {
            const res = validateClarification(input as any);
            expect(res.ok).toBe(false);
            expect(res.request.fields.length).toBeGreaterThan(0);
            expect(res.request.fields[0].mode).toBe('free_text');
        }
    });

    it('degradeToFreeText folds every question into one message', () => {
        const req = degradeToFreeText('objective_underspecified', 'Details are missing.', 'broken field', [
            { label: 'Which industry?' }, { label: 'Which audience?' },
        ]);
        expect(req.fields).toHaveLength(1);
        expect(req.fields[0].label).toContain('Which industry?');
        expect(req.fields[0].label).toContain('Which audience?');
    });
});

describe('trigger (a): objective intake', () => {
    it('fires on an objective naming no subject, industry, or audience', () => {
        const v = checkObjectiveTrigger('analyze the market and give me insights');
        expect(v.fire).toBe(true);
        expect(v.trigger).toBe('objective_underspecified');
    });

    it('fires on an objective too short to name anything', () => {
        expect(checkObjectiveTrigger('research').fire).toBe(true);
    });

    it('does NOT fire when a subject is named', () => {
        expect(checkObjectiveTrigger('Competitive analysis of Recruiterflow and Clockwork').fire).toBe(false);
    });

    it('does NOT fire when an industry is named', () => {
        expect(checkObjectiveTrigger('what is changing in executive search this year').fire).toBe(false);
    });

    it('does NOT fire when an audience is named', () => {
        expect(checkObjectiveTrigger('what do recruiters need from their tooling').fire).toBe(false);
    });
});

describe('trigger (b): pack mismatch', () => {
    it('fires when the named industry matches no selected pack', () => {
        const v = checkPackTrigger('AI adoption in insurance claims handling', ['retail', 'healthcare']);
        expect(v.fire).toBe(true);
        expect(v.trigger).toBe('pack_mismatch');
        expect(v.reason).toContain('insurance');
    });

    it('does NOT fire when the industry matches a pack', () => {
        expect(checkPackTrigger('AI adoption in healthcare delivery', ['healthcare', 'retail']).fire).toBe(false);
    });

    it('does NOT fire before any pack is selected, or with no industry named', () => {
        expect(checkPackTrigger('AI adoption in insurance', []).fire).toBe(false);
        expect(checkPackTrigger('what changed last quarter', ['retail']).fire).toBe(false);
    });
});

describe('trigger (c): deliverable ambiguity', () => {
    it('fires when a hashtag-free ask fits three or more artifact types', () => {
        const v = checkDeliverableTrigger('who are our segments, what is their journey, and how do we compare to competitors');
        expect(v.fire).toBe(true);
        expect(v.trigger).toBe('deliverable_ambiguous');
    });

    it('does NOT fire when a hashtag is present: the router already knows', () => {
        expect(checkDeliverableTrigger('#slides personas journey competitive strategy themes gap').fire).toBe(false);
    });

    it('does NOT fire on a two-way ambiguity the router should just decide', () => {
        expect(checkDeliverableTrigger('what are the themes and what should we do about them').fire).toBe(false);
    });
});

describe('one question covering everything', () => {
    it('merges every fired trigger into one request', () => {
        const req = buildClarificationRequest([
            checkObjectiveTrigger('analyze the market'),
            checkPackTrigger('AI adoption in insurance claims', ['retail']),
        ]);
        expect(req).toBeTruthy();
        expect(req!.fields.length).toBeGreaterThanOrEqual(2);
        expect(req!.preamble).toMatch(/2 details are missing/);
    });

    it('returns null when nothing fired, so the run proceeds', () => {
        expect(buildClarificationRequest([checkObjectiveTrigger('Competitive analysis of Clockwork in executive search')])).toBeNull();
        expect(buildClarificationRequest([])).toBeNull();
    });

    it('carries no em-dash in any user-facing string', () => {
        const req = buildClarificationRequest([checkObjectiveTrigger('analyze the market')])!;
        expect(req.preamble).not.toMatch(/—/);
        for (const f of req.fields) expect(f.label).not.toMatch(/—/);
    });
});
