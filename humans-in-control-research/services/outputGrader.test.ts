/** DF-W3: the grader's three moves, each tied to a failure this repo has shipped. */
import { describe, it, expect } from 'vitest';
import { gradeArtifact, buildGradeRepairInstruction } from './outputGrader';
import type { LedgerRow } from './citationVerifier';

const slide = (id: string, payload: any) => ({
    id, template: 'slides:numbered-themes', status: 'draft', timestamp: 1,
    title: payload.title, composerPayload: payload,
});

const row = (over: Partial<LedgerRow>): LedgerRow => ({
    slideId: 's1', slideTitle: 'T', field: 'items[0].heading', kind: 'text',
    claim: '', citedAs: '', realSources: [], url: null, verdict: 'VERIFIED', note: '',
    ...over,
});

describe('claim extraction and typing', () => {
    it('extracts an implicit factual claim nobody declared as an assertion', () => {
        const slides = [slide('s1', {
            title: 'A title',
            items: [{ heading: 'Applicants abandon the portal because the session times out after ten minutes' }],
        })];
        const r = gradeArtifact(slides);
        const factual = r.claims.filter(c => c.type === 'factual');
        expect(factual).toHaveLength(1);
        expect(factual[0].verified).toBe(false);
        expect(factual[0].evidence).toMatch(/no pointer/);
    });

    it('types process language separately instead of counting it as a failed fact', () => {
        const slides = [slide('s1', { title: 'A title', items: [{ heading: 'Based on the research, the advancement team loses contact after the second unanswered email' }] })];
        const r = gradeArtifact(slides);
        expect(r.claims.some(c => c.type === 'process')).toBe(true);
    });

    it('types self-assessment as unverifiable', () => {
        const slides = [slide('s1', { title: 'A title', items: [{ heading: 'This is an exhaustive review of every source in the corpus' }] })];
        const r = gradeArtifact(slides);
        expect(r.claims.some(c => c.type === 'quality' && c.verifiable === false)).toBe(true);
    });

    it('does not treat a recommendation as a factual claim', () => {
        const slides = [slide('s1', { title: 'A title', items: [{ heading: 'The team should consolidate the two intake forms before the next cycle' }] })];
        expect(gradeArtifact(slides).claims.filter(c => c.type === 'factual')).toHaveLength(0);
    });
});

describe('superficial compliance fails (presence is not pass)', () => {
    const claim = 'Conversion rose after launch because buyers asked the assistant first';

    it('flags a claim whose citation the verifier could not confirm', () => {
        const slides = [slide('s1', { title: 'T', items: [{ heading: `${claim} [articles/x/y1.md#c1]` }] })];
        const r = gradeArtifact(slides, { ledger: [row({ claim, verdict: 'UNVERIFIED' })] });
        expect(r.superficial).toHaveLength(1);
        expect(r.superficial[0].detail).toMatch(/UNVERIFIED/);
        expect(r.pass).toBe(false);
    });

    it('flags a pointer that no verifier row covers at all', () => {
        const slides = [slide('s1', { title: 'T', items: [{ heading: `${claim} [articles/x/y1.md#c1]` }] })];
        const r = gradeArtifact(slides, { ledger: [] });
        expect(r.superficial[0].detail).toMatch(/no verifier row/);
    });

    it('does NOT punish an unreachable page as a fabrication', () => {
        const slides = [slide('s1', { title: 'T', items: [{ heading: `${claim} [articles/x/y1.md#c1]` }] })];
        const r = gradeArtifact(slides, { ledger: [row({ claim, verdict: 'UNREACHABLE' })] });
        expect(r.superficial).toHaveLength(0);
    });

    it('passes a verified claim', () => {
        const slides = [slide('s1', { title: 'T', items: [{ heading: `${claim} [articles/x/y1.md#c1]` }] })];
        const r = gradeArtifact(slides, { ledger: [row({ claim, verdict: 'VERIFIED', realSources: ['Retail Dive'] })] });
        expect(r.pass).toBe(true);
        expect(r.summary).toMatch(/all verified/);
    });
});

describe('rubric critique (a gate that could not fail did not pass)', () => {
    it('reports a vacuous provenance pass', () => {
        const slides = [slide('s1', { title: 'T', items: [{ heading: 'Adoption rose 40 percent because the desk changed tools' }] })];
        const r = gradeArtifact(slides, { ledger: [] });
        expect(r.rubricCritique.join(' ')).toMatch(/passed vacuously/);
    });

    it('reports an evidence-slot gate with nothing to check', () => {
        const slides = [slide('s1', { title: 'T', items: [{ heading: 'A neutral sentence with no claim in it at all' }] })];
        const r = gradeArtifact(slides, {
            ledger: [],
            slotReport: { fills: [], violations: [], p0Coverage: 1, pass: true, planAbsent: false, plannedSubQuestions: 2 },
        });
        expect(r.rubricCritique.join(' ')).toMatch(/zero P0 slots/);
    });

    it('reports a prose signal that passed on too little text', () => {
        const slides = [slide('s1', { title: 'T', items: [] })];
        const r = gradeArtifact(slides, {
            proseReport: { metrics: [], overall: 1, pass: true, concerns: [], sentenceCount: 2 },
        });
        expect(r.rubricCritique.join(' ')).toMatch(/too little text/);
    });
});

describe('repair instruction', () => {
    it('quotes the claim and demands the supported version', () => {
        const claim = 'Conversion rose after launch because buyers asked the assistant first';
        const slides = [slide('s1', { title: 'T', items: [{ heading: `${claim} [articles/x/y1.md#c1]` }] })];
        const instr = buildGradeRepairInstruction(gradeArtifact(slides, { ledger: [row({ claim, verdict: 'UNSOURCED' })] }));
        expect(instr).toMatch(/ONLY LOOK SOURCED/);
        expect(instr).toContain('Conversion rose after launch');
    });

    it('is empty for a clean artifact with no rubric gaps', () => {
        const claim = 'Adoption rose because the desk changed tools';
        const slides = [slide('s1', { title: 'T', items: [{ heading: `${claim} [articles/x/y1.md#c1]` }] })];
        const r = gradeArtifact(slides, {
            ledger: [row({ claim, verdict: 'VERIFIED' })],
            slotReport: { fills: [{ slotId: 'a', sectionId: 's1', priority: 'P0', state: 'filled', pointers: ['articles/x/y1.md#c1'], reason: '' }], violations: [], p0Coverage: 1, pass: true, planAbsent: false, plannedSubQuestions: 2 },
            proseReport: { metrics: [], overall: 1, pass: true, concerns: [], sentenceCount: 12 },
        });
        expect(buildGradeRepairInstruction(r)).toBe('');
    });
});
