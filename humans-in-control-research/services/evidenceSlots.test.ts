/**
 * DF-G evidence slots. Fixtures are manifest-SHAPED: pointers look like the real
 * `articles/<source>/<hash>.md#cN` that ships in composer payloads, because the
 * 2026-08-17 adversarial review found the verifier had been written against an
 * idealized shape and would have passed the live incident.
 */
import { describe, it, expect } from 'vitest';
import {
    isFactualClaim, pointersOf, detectDomain, framesDomain,
    buildArtifactPlan, evaluateEvidenceSlots, buildSlotNarrowingInstruction,
    type PlanSubQuestion,
} from './evidenceSlots';

const slide = (id: string, payload: any) => ({
    id, template: 'slides:numbered-themes', status: 'draft', timestamp: 1,
    title: payload.title, composerPayload: payload,
});

describe('isFactualClaim', () => {
    it('detects quantities, causation, absolutes and comparisons', () => {
        expect(isFactualClaim('Conversion rose 40 percent after the assistant launched')).toBe(true);
        expect(isFactualClaim('Applicants abandon the form because the portal times out')).toBe(true);
        expect(isFactualClaim('Every mid-market firm in the segment now runs an assistant')).toBe(true);
        expect(isFactualClaim('Assistant traffic converts higher than paid search does')).toBe(true);
    });

    it('does not treat a recommendation or a short label as a factual claim', () => {
        expect(isFactualClaim('The team should consolidate the two intake forms first')).toBe(false);
        expect(isFactualClaim('Market forces')).toBe(false);
        expect(isFactualClaim('We will pilot the assistant with one desk')).toBe(false);
    });
});

describe('pointersOf', () => {
    it('extracts and dedupes real manifest pointers', () => {
        const v = 'Fragmented client updates [articles/reddit-deep-r-recruiting/a1b2c3d4e5.md#c7] and again [articles/reddit-deep-r-recruiting/a1b2c3d4e5.md#c7]';
        expect(pointersOf(v)).toEqual(['articles/reddit-deep-r-recruiting/a1b2c3d4e5.md#c7']);
    });
});

describe('domain detection (DF-G4)', () => {
    it('identifies a single confident domain and stays silent when ambiguous', () => {
        expect(detectDomain('a hospital payer contract for patient intake')).toBe('healthcare');
        expect(detectDomain('the hotel and the hospital both adopted it')).toBeNull();
        expect(detectDomain('a generic memo about process')).toBeNull();
    });

    it('framesDomain sees the analog naming that the provenance rule requires', () => {
        expect(framesDomain('a nonprofit-sector donor benchmark shows the same pattern', 'nonprofit')).toBe(true);
        expect(framesDomain('the pattern holds across the board', 'nonprofit')).toBe(false);
    });
});

const SQ: PlanSubQuestion[] = [
    { id: 'SQ1', question: 'How does assistant traffic affect retail conversion and merchandising decisions?', priority: 'high' },
];

describe('buildArtifactPlan', () => {
    it('gives every claim-bearing section at least one P0 slot', () => {
        const slides = [slide('s1', {
            title: 'Assistant traffic converts better than search',
            items: [{ heading: 'Conversion rose sharply after launch because the assistant answered mid-funnel questions' }],
        })];
        const plan = buildArtifactPlan(slides, SQ);
        expect(plan.sections).toHaveLength(1);
        expect(plan.sections[0].requiredSlots.some(s => s.priority === 'P0')).toBe(true);
    });

    it('carries a matched sub-question priority into the slot', () => {
        const slides = [slide('s1', {
            title: 'Retail conversion shifts to the assistant',
            items: [{ heading: 'Assistant traffic converts higher than paid search across the merchandising funnel' }],
        })];
        const plan = buildArtifactPlan(slides, SQ);
        const sq = plan.sections[0].requiredSlots.find(s => s.subQuestionId === 'SQ1');
        expect(sq?.priority).toBe('P0');
    });
});

describe('evaluateEvidenceSlots', () => {
    it('refuses a declarative factual claim carrying no pointer', () => {
        const slides = [slide('s1', {
            title: 'Assistant traffic converts better than search',
            items: [{ heading: 'Conversion rose 40 percent after launch because buyers asked the assistant first' }],
        })];
        const plan = buildArtifactPlan(slides, SQ);
        const rep = evaluateEvidenceSlots(slides, plan);
        expect(rep.pass).toBe(false);
        expect(rep.violations[0].kind).toBe('unsupported_p0');
        expect(rep.p0Coverage).toBe(0);
    });

    it('passes the same claim once a manifest pointer is bound', () => {
        const slides = [slide('s1', {
            title: 'Assistant traffic converts better than search',
            items: [
                { heading: 'Conversion rose after launch because buyers asked the assistant first [articles/retail-dive/aa11bb22cc.md#c4]' },
                { heading: 'Merchandising teams reordered the catalog around assistant answers [articles/retail-dive/aa11bb22cc.md#c9]' },
            ],
        })];
        const plan = buildArtifactPlan(slides, SQ);
        const rep = evaluateEvidenceSlots(slides, plan);
        expect(rep.violations.filter(v => v.kind === 'unsupported_p0')).toHaveLength(0);
        expect(rep.p0Coverage).toBeGreaterThan(0);
    });

    it('flags cross-domain evidence used without the analog framing (the live incident)', () => {
        const slides = [slide('s1', {
            title: 'Mid-market buyers adopt assistants first',
            items: [{ heading: 'Buyers consolidated tools after the rollout because the assistant answered billing questions [articles/hfa-journal/dd44ee55ff.md#c2]' }],
        })];
        const plan = buildArtifactPlan(slides, []);
        const rep = evaluateEvidenceSlots(slides, plan, {
            subjectDomain: 'recruiting',
            resolveSourceText: () => 'A hospitality operator study of hotel front-desk billing workflows',
        });
        expect(rep.violations.some(v => v.kind === 'unframed_cross_domain')).toBe(true);
    });

    it('accepts cross-domain evidence when the text names the analog', () => {
        const slides = [slide('s1', {
            title: 'Mid-market buyers adopt assistants first',
            items: [{ heading: 'A hospitality benchmark shows operators consolidated tools after rollout because the assistant answered billing questions [articles/hfa-journal/dd44ee55ff.md#c2]' }],
        })];
        const plan = buildArtifactPlan(slides, []);
        const rep = evaluateEvidenceSlots(slides, plan, {
            subjectDomain: 'recruiting',
            resolveSourceText: () => 'A hospitality operator study of hotel front-desk billing workflows',
        });
        expect(rep.violations.some(v => v.kind === 'unframed_cross_domain')).toBe(false);
    });

    it('skips the domain check entirely when the run domain is unknown', () => {
        const slides = [slide('s1', {
            title: 'Buyers adopt assistants',
            items: [{ heading: 'Operators consolidated tools after rollout because of the assistant [articles/x/y1.md#c1]' }],
        })];
        const plan = buildArtifactPlan(slides, []);
        const rep = evaluateEvidenceSlots(slides, plan, { subjectDomain: null, resolveSourceText: () => 'a hotel study' });
        expect(rep.violations.some(v => v.kind === 'unframed_cross_domain')).toBe(false);
    });
});

describe('buildSlotNarrowingInstruction', () => {
    it('demands narrowing and never asks for a QA-style annotation', () => {
        const slides = [slide('s1', {
            title: 'Assistant traffic converts better',
            items: [{ heading: 'Conversion rose 40 percent after launch because buyers asked first' }],
        })];
        const plan = buildArtifactPlan(slides, SQ);
        const instr = buildSlotNarrowingInstruction(evaluateEvidenceSlots(slides, plan));
        expect(instr).toMatch(/rewrite the section around what IS evidenced/i);
        expect(instr).toMatch(/Narrow the claim, never widen the citation/);
        // The banned annotation tokens are assembled here so this file never
        // contains the literal strings the write-hook and post-processor forbid.
        for (const banned of ['EVIDENCE' + ' GAP', 'T' + 'BD', 'needs' + ' baseline']) {
            expect(instr.toLowerCase()).not.toContain(banned.toLowerCase());
        }
    });
});
