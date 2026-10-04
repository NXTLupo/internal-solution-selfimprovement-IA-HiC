/** 2026-10-01 ("NO BLOCKERS" + "consulting grade, no shortcuts"): a #prd with no session roots synthesizes
 *  FULL deliverables (dense personas, a journey map, a gap matrix) from the evidence, provenance-locked. */
import { describe, it, expect } from 'vitest';
import { prdMissingRoots, buildPrdRootSynthesisPrompt, applySynthesizedRoots, rootDeliverableSlides } from './prdRootSynthesis';
import { buildPrdCompilerPrompt, type PrdCompilerInputs } from './prdCompiler';

const R = 'social-intelligence/reddit-neu/ab12.md#c3';
const H = 'articles/hed/aa11.md#c1';
const base: PrdCompilerInputs = {
    artifactId: 'a1',
    objective: 'Build the experiential learning hub for students and employers',
    personas: [], themes: [], journeyPains: [], competitiveGaps: [],
    evidenceChunks: [
        { id: R, text: 'I applied to sixty co-ops and nobody told me why I was rejected', sources: [{ n: 'Reddit r/NEU' }] },
        { id: H, text: 'Employers say the co-op portal makes it hard to see which students fit a posting', sources: [{ n: 'Higher Ed Dive', u: 'https://highereddive.com/x' }] },
    ],
};

const reply = JSON.stringify({
    personas: [
        {
            name: 'The Rejected Applicant', role: 'Second-year co-op student', primary: true,
            title: 'Rejected applicants get no reason they can act on',
            quote: { text: 'nobody told me why I was rejected', evidenceId: R },
            jtbd: 'When I apply, I want feedback, so I can improve the next application',
            stageOfStruggle: 'the application cycle',
            goals: { functionalGoal: 'Land a co-op placement', experienceGoal: 'Know where each application stands', lifeGoal: 'Start a career in the chosen field' },
            painPoints: [
                { label: 'Students get no reason for a rejection, so they cannot change the next application.', quote: 'nobody told me why I was rejected', evidenceId: R },
                { label: 'Students cannot see which skills a posting weighs.', quote: 'this sentence is not in any evidence item at all', evidenceId: H },
                { label: 'Students apply widely because they cannot target.', quote: 'I applied to sixty co-ops', evidenceId: R },
            ],
            motivations: [{ label: 'Wants a placement that counts toward the degree', quote: 'applied to sixty co-ops', evidenceId: R }],
            behaviors: ['Applies to many postings at once', 'Checks the portal daily', 'Asks peers on Reddit for feedback'],
            winConditions: ['Explains every rejection', 'Ranks postings by fit', 'Shows status in one place'],
            decisionProcess: 'Keeps a tool only when it saves time in the first week.',
            technologyUsage: 'Uses the university portal and spreadsheets.',
            dayInTheLife: 'After classes the student checks the portal, sees another rejection and no reason.',
        },
        { name: 'The Screening Employer', role: 'Co-op employer', painPoints: [{ label: 'Employers cannot see fit at a glance.', quote: 'hard to see which students fit a posting', evidenceId: H }] },
    ],
    journey: {
        title: 'The co-op journey breaks between application and feedback',
        journeyType: 'STUDENT VIEW', scope: 'From search to placement', actors: 'Student, employer, advisor',
        stages: [{ name: 'Search' }, { name: 'Apply', critical: true }, { name: 'Feedback' }, { name: 'Placement' }],
        lanes: [{ actor: 'The Rejected Applicant', role: 'applies', cells: ['Browses postings', 'Submits many applications', 'Waits', 'Accepts an offer'] }],
        stagePains: [
            [{ text: 'Cannot tell which postings fit' }],
            [{ text: 'No feedback after rejection', quote: 'nobody told me why I was rejected', evidenceId: R, personaIndexes: [0] }],
            [{ text: 'Silence after interviews' }],
            [],
        ],
        opportunities: ['Rank by fit', 'Explain every outcome', 'Close the loop', 'Track the offer'],
        keyInsight: 'Students lose the signal they need at the moment they apply.',
    },
    gapMatrix: {
        title: 'Current portals show postings but not fit',
        gaps: [
            { capability: 'Fit signal for employers', currentMaturity: 1, targetMaturity: 4, severity: 'critical', impact: 'employers screen by hand', competitor: 'Current co-op portal', quote: 'Employers say the co-op portal makes it hard to see which students fit a posting', evidenceId: H },
            { capability: 'Rejection feedback', currentMaturity: 9, targetMaturity: 2, severity: 'weird', impact: 'students repeat mistakes' },
        ],
        insight: 'Every gap sits at the hand-off between student and employer.',
    },
});

describe('prdRootSynthesis', () => {
    it('reports the missing roots instead of throwing', () => {
        expect(prdMissingRoots(base)).toEqual(expect.arrayContaining(['personas']));
        expect(() => buildPrdCompilerPrompt(base)).toThrow();
    });

    it('asks for full deliverables, only the missing kinds, with the evidence table', () => {
        const p = buildPrdRootSynthesisPrompt(base);
        for (const k of ['"personas"', '"journey"', '"gapMatrix"', '"winConditions"', '"stagePains"', '"targetMaturity"']) expect(p.user).toContain(k);
        expect(p.user).toContain(`[${H}]`);
        const withGaps = buildPrdRootSynthesisPrompt({ ...base, competitiveGaps: [{ id: 'G1', text: 'x' }] });
        expect(withGaps.user).not.toContain('"gapMatrix"');
    });

    it('provenance-locks every quote and fills the roots so the compiler accepts them', () => {
        const r = applySynthesizedRoots(base, reply);
        const p0 = r.synthesized.personas[0];
        expect(p0.painPoints[0]).toMatchObject({ quote: 'nobody told me why I was rejected', source: 'Reddit r/NEU', pointer: R });
        expect(p0.painPoints[1].quote).toBeUndefined();          // fabricated quote dropped, pain kept
        expect(r.droppedQuotes).toBe(1);
        expect(p0.definingQuote).toMatchObject({ quote: 'nobody told me why I was rejected', source: 'Reddit r/NEU' });
        expect(p0.goals?.functionalGoal).toBe('Land a co-op placement');
        expect(p0.behaviors).toHaveLength(3);
        expect(p0.winConditions).toHaveLength(3);
        // the second persona has no defining quote of its own: it falls back to its verified pain quote
        expect(r.synthesized.personas[1].definingQuote?.source).toBe('Higher Ed Dive');
        // journey pains come from the journey map, linked to personas
        expect(r.synthesized.journey?.stages).toHaveLength(4);
        expect(r.synthesized.journeyPains.find(j => j.stage === 'Apply')).toMatchObject({ quote: 'nobody told me why I was rejected', personaIds: ['P1'] });
        // gaps come from the gap matrix; maturity clamped, severity normalized
        expect(r.synthesized.gapMatrix?.gaps[1]).toMatchObject({ currentMaturity: 5, targetMaturity: 5, severity: 'high' });
        expect(r.synthesized.competitiveGaps[0]).toMatchObject({ competitor: 'Current co-op portal', source: 'Higher Ed Dive' });
        expect(prdMissingRoots(r.inputs)).toEqual([]);
        expect(() => buildPrdCompilerPrompt(r.inputs)).not.toThrow();
    });

    it('never overrides roots the session already has, and survives a non-JSON reply', () => {
        const have = { ...base, personas: [{ id: 'P1', name: 'Existing', painPoints: [{ text: 'x' }] }] };
        expect(applySynthesizedRoots(have, reply).inputs.personas[0].name).toBe('Existing');
        expect(applySynthesizedRoots(base, 'not json').inputs).toBe(base);
    });

    it('emits dense persona cards, a journey map and a gap matrix as deliverable slides', () => {
        const r = applySynthesizedRoots(base, reply);
        const slides = rootDeliverableSlides(r, 'nu');
        expect(slides.map(sl => sl.template)).toEqual(['persona-card', 'persona-card', 'journey-map', 'gap-matrix']);
        const p = slides[0];
        expect(p.title).toBe('Rejected applicants get no reason they can act on');
        expect(p.persona).toMatchObject({ quote: 'nobody told me why I was rejected', quoteSource: 'Reddit r/NEU', jtbd: expect.any(String) });
        expect(p.persona.goals.lifeGoal).toBeTruthy();
        expect(p.persona.behaviors).toHaveLength(3);
        expect(p.persona.winConditions).toHaveLength(3);
        const jm = slides[2].journeyMap;
        expect(jm.stages).toHaveLength(4);
        expect(jm.painPoints).toHaveLength(4);
        expect(jm.opportunities).toHaveLength(4);
        expect(jm.keyInsight).toBeTruthy();
        const gm = slides[3].gapMatrix;
        // 2026-10-02: the slide shows a CLEAN verbatim sentence (a lowercase mid-sentence document fragment is dropped)
        expect(gm.gaps[0]).toMatchObject({ evidence: 'Employers say the co-op portal makes it hard to see which students fit a posting', source: 'Higher Ed Dive', competitor: 'Current co-op portal' });
        expect(gm.scaleMax).toBe(5);
    });
});
