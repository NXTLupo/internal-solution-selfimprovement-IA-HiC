// 2026-10-01 (plan Stage 3.7, audit C6): the deterministic half of the PRD rubric.
// Every R has a P or a CG; every Q has an S; dangling ids count as untraced.
import { describe, it, expect } from 'vitest';
import { checkPrdTraceIntegrity, toPrdAirLike } from './prdTraceIntegrity';

const complete = {
    personas: [{ id: 'P1' }, { id: 'P2' }],
    competitiveGaps: [{ id: 'CG1' }],
    sources: [{ id: 'S1' }, { id: 'S2' }],
    requirements: [
        { id: 'R1', trace: { personaIds: ['P1'] } },
        { id: 'R2', trace: { competitiveGapIds: ['CG1'] } },
        { id: 'R3', trace: { personaIds: ['P2'], competitiveGapIds: ['CG1'] } },
    ],
    questions: [
        { id: 'Q1', sourceIds: ['S1'] },
        { id: 'Q2', sourceIds: ['S2', 'S1'] },
    ],
};

describe('checkPrdTraceIntegrity', () => {
    it('passes a fully traced PRD with score 5', () => {
        const r = checkPrdTraceIntegrity(complete);
        expect(r.ok).toBe(true);
        expect(r.score).toBe(5);
        expect(r.orphanRequirements).toEqual([]);
        expect(r.unsourcedQuestions).toEqual([]);
        expect(r.summary).toMatch(/trace complete/);
    });

    it('flags a requirement with neither persona nor gap as an orphan', () => {
        const r = checkPrdTraceIntegrity({
            ...complete,
            requirements: [...complete.requirements, { id: 'R4', trace: {} }],
        });
        expect(r.ok).toBe(false);
        expect(r.orphanRequirements).toEqual(['R4']);
        expect(r.score).toBe(3); // 1 of 4 untraced = 25%: present but partially traced
    });

    it('treats a trace that points only at unlisted ids as dangling', () => {
        const r = checkPrdTraceIntegrity({
            ...complete,
            requirements: [{ id: 'R1', trace: { personaIds: ['P9'] } }],
        });
        expect(r.danglingRequirements).toEqual(['R1']);
        expect(r.score).toBe(1);
    });

    it('does not require id lists: when the PRD lists no personas, any persona id counts', () => {
        const r = checkPrdTraceIntegrity({
            requirements: [{ id: 'R1', trace: { personaIds: ['anything'] } }],
            questions: [{ id: 'Q1', sourceIds: ['src-a'] }],
        });
        expect(r.ok).toBe(true);
    });

    it('flags an open question without a source', () => {
        const r = checkPrdTraceIntegrity({
            ...complete,
            questions: [{ id: 'Q1', sourceIds: [] }, { id: 'Q2', sourceIds: ['S1'] }],
        });
        expect(r.unsourcedQuestions).toEqual(['Q1']);
        expect(r.ok).toBe(false);
        expect(r.score).toBeLessThan(5);
    });

    it('scores an empty PRD 1 (absent)', () => {
        const r = checkPrdTraceIntegrity({});
        expect(r.score).toBe(1);
        expect(r.requirementCount).toBe(0);
    });

    it('never throws on odd shapes', () => {
        expect(() => checkPrdTraceIntegrity(null)).not.toThrow();
        expect(() => checkPrdTraceIntegrity('text')).not.toThrow();
        expect(() => checkPrdTraceIntegrity({ requirements: [null, 3, { trace: 'x' }] })).not.toThrow();
    });

    it('adapts the legacy PRD shape (features[]) and the StepResult wrapper', () => {
        const legacy = { prd: { title: 'x', features: [{ id: 'F1', name: 'A' }, { id: 'F2', name: 'B', personaIds: ['P1'] }] } };
        const view = toPrdAirLike(legacy);
        expect(view.requirements?.length).toBe(2);
        const r = checkPrdTraceIntegrity(legacy);
        expect(r.orphanRequirements).toEqual(['F1']);
        expect(r.ok).toBe(false);
    });
});

describe('checkPrdTraceIntegrity on the real PrdAir graph (services/prdAir.ts)', () => {
    const graphPrd = {
        prdAirVersion: '1', artifactId: 'a', objective: 'o', title: 't',
        graph: {
            sources: [{ id: 'S1', name: 'Higher Ed Dive' }, { id: 'S2', name: 'Reddit r/NEU' }],
            quotes: [{ id: 'Q1', text: 'I waited three weeks for an advising slot.', sourceId: 'S2' }, { id: 'Q2', text: 'Advising backlogs grew all year.', sourceId: 'S1' }],
            pains: [], themes: [],
            personas: [{ id: 'PE1', name: 'First-Year Co-op Applicant', primary: true }],
            competitiveGaps: [{ id: 'CG1', text: 'No queue visibility', quoteIds: ['Q2'] }],
            requirements: [
                { id: 'R1', text: 'Single advising queue', personaIds: ['PE1'], competitiveGapIds: [], painIds: [] },
                { id: 'R2', text: 'Slot alerts', personaIds: [], competitiveGapIds: ['CG1'], painIds: [] },
            ],
            acceptanceTests: [], signals: [],
        },
        sections: {},
    };
    it('reads R from graph.requirements and Q (with one S) from graph.quotes', () => {
        const r = checkPrdTraceIntegrity(graphPrd);
        expect(r.ok).toBe(true);
        expect(r.requirementCount).toBe(2);
        expect(r.questionCount).toBe(2);
        expect(r.score).toBe(5);
    });
    it('a quote whose sourceId is not on the graph is dangling; an untraced R is an orphan', () => {
        const bad = JSON.parse(JSON.stringify(graphPrd));
        bad.graph.quotes[0].sourceId = 'S9';
        bad.graph.requirements.push({ id: 'R3', text: 'x', personaIds: [], competitiveGapIds: [], painIds: [] });
        const r = checkPrdTraceIntegrity(bad);
        expect(r.danglingQuestions).toEqual(['Q1']);
        expect(r.orphanRequirements).toEqual(['R3']);
        expect(r.ok).toBe(false);
    });
});
