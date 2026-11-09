/** Stage 3.2 (2026-10-01): the chat context becomes typed PRD compiler inputs; nothing is invented. */
import { describe, it, expect } from 'vitest';
import { buildPrdInputsFromContext, personasFromContext, competitiveGapsFromContext, mergeDeliverableRoots, primaryFirst } from './prdInputs';
import { buildPrdCompilerPrompt, PrdInputsError } from './prdCompiler';

const ctx = {
    researchGoal: 'Decide whether to build an advising follow-up assistant for first-year students',
    personas: [
        { id: 'p1', name: 'Jordan Ellis', role: 'First-year student', painPoints: [
            { text: 'Misses the second advising visit and never returns', quote: 'I skipped the second appointment and never went back', source: 'Reddit r/NEU', pointer: 'social-intelligence/reddit-neu/ab12.md#c3' },
            'Cannot find the advisor calendar',
        ] },
        { name: 'Advisor', frustrations: [{ description: 'Carries a caseload with no follow-up tooling' }] },
    ],
    themes: [{ id: 't1', name: 'Advisors lose students between visits', description: 'The second visit is the drop point', citations: [{ sourceName: 'Higher Ed Dive', quote: 'students who miss the second advising visit rarely return that term', chunkId: 'articles/hed/aa11.md#c1' }] }],
    journeyStages: [{ name: 'Second visit', painPoints: [{ text: 'No reminder reaches the student', quote: 'nobody reminded me', source: 'Reddit r/NEU' }] }],
    gapAnalysis: { gaps: [{ gap: 'No automated follow-up after a missed visit', source: 'Navigate docs' }] },
    competitiveAnalysis: { competitors: [{ name: 'EAB Navigate', gaps: ['Reminders stop after one attempt'] }] },
};
const chunks = [
    { id: 'articles/hed/aa11.md#c1', text: 'students who miss the second advising visit rarely return that term', sources: [{ n: 'Higher Ed Dive', u: 'https://highereddive.com/x' }], pageMeta: { kind: 'article', date: '2026-03-02' } },
    { id: 'social-intelligence/reddit-neu/ab12.md#c3', text: 'I skipped the second appointment and never went back', sources: [{ n: 'Reddit r/NEU' }] },
];

describe('buildPrdInputsFromContext', () => {
    it('maps loose context shapes to typed roots and keeps provenance', () => {
        const inputs = buildPrdInputsFromContext(ctx, chunks, { artifactId: 'a1', objective: ctx.researchGoal, brand: 'nxt' });
        expect(inputs.personas).toHaveLength(2);
        expect(inputs.personas[0].painPoints[0]).toMatchObject({ source: 'Reddit r/NEU', pointer: 'social-intelligence/reddit-neu/ab12.md#c3' });
        expect(inputs.personas[0].painPoints[1]).toEqual({ text: 'Cannot find the advisor calendar', quote: undefined, source: undefined, pointer: undefined });
        expect(inputs.personas[1].id).toBe('P2');
        expect(inputs.themes[0].quotes[0]).toMatchObject({ source: 'Higher Ed Dive', pointer: 'articles/hed/aa11.md#c1' });
        expect(inputs.journeyPains[0]).toMatchObject({ stage: 'Second visit', text: 'No reminder reaches the student' });
        expect(inputs.competitiveGaps.map(g => g.text)).toEqual(['No automated follow-up after a missed visit', 'Reminders stop after one attempt']);
        expect(inputs.competitiveGaps[1].competitor).toBe('EAB Navigate');
        expect(inputs.evidenceChunks).toHaveLength(2);
        expect(inputs.evidenceChunks[0]).toMatchObject({ kind: 'article', date: '2026-03-02' });
        // the compiler accepts these roots
        expect(() => buildPrdCompilerPrompt(inputs)).not.toThrow();
    });

    it('an empty context yields empty roots and the compiler refuses with the missing list (never an empty-array PRD)', () => {
        const inputs = buildPrdInputsFromContext({}, [], { artifactId: 'a2', objective: 'x' });
        expect(inputs.personas).toEqual([]);
        expect(() => buildPrdCompilerPrompt(inputs)).toThrow(PrdInputsError);
    });

    it('helpers tolerate non-array inputs', () => {
        expect(personasFromContext(undefined)).toEqual([]);
        expect(competitiveGapsFromContext(null, 'nope')).toEqual([]);
    });

    it('a gap-matrix row whose `gap` is a numeric score is named by its capability, never by the number', () => {
        const out = competitiveGapsFromContext({ rows: [
            { capability: 'First-Year Readiness Tracking', current: 1, target: 4, gap: 3 },
            { capability: 'Platform Integration', gap: '3' },
            { capability: 'Advisor Handoff', description: 'No record follows the student to the first advisor' },
            { gap: 2 },
        ] }, null);
        expect(out.map(g => g.text)).toEqual(['First-Year Readiness Tracking', 'Platform Integration', 'Advisor Handoff: No record follows the student to the first advisor']);
    });

    it('chat deliverable blocks (persona / theme / gap cards) count as evidence roots', () => {
        const dels = [
            { id: 'd1', type: 'persona', data: { name: 'Rowan Hale', role: 'Row-crop farmer', painPoints: [{ text: 'Cannot get a quote before planting', quote: 'I could not get a quote before planting season', source: 'Reddit r/farming' }] } },
            { id: 'd2', type: 'theme', data: { name: 'Underwriting ignores equipment age', citations: [{ sourceName: 'AgWeb', quote: 'equipment age is not in the underwriting model' }] } },
            { id: 'd3', type: 'gap', data: { gaps: [{ gap: 'No pre-season quoting path' }] } },
        ];
        const merged = mergeDeliverableRoots({ personas: [] }, dels);
        expect(merged.personas).toHaveLength(1);
        expect(merged.themes).toHaveLength(1);
        expect(merged.gapAnalysis.gaps).toHaveLength(1);
        const inputs = buildPrdInputsFromContext({}, chunks, { artifactId: 'a3', objective: 'x' }, dels);
        expect(inputs.personas[0].name).toBe('Rowan Hale');
        expect(() => buildPrdCompilerPrompt(inputs)).not.toThrow();
    });

    it('persona-card SLIDES (the chat #personas output) count as approved personas', () => {
        const slides = [{ id: 's1', template: 'persona-card', title: 'The Squeezed Survivor defers coverage spending', persona: {
            name: 'The Squeezed Survivor', role: 'Row-crop operator',
            painPoints: [{ label: 'Input costs crowd out coverage', quote: 'one bad season turns a covered loss into a loan', source: 'Purdue Ag Economy Barometer' }],
        } }];
        const inputs = buildPrdInputsFromContext({}, chunks, { artifactId: 'a4', objective: 'x' }, [], slides);
        expect(inputs.personas).toHaveLength(1);
        expect(inputs.personas[0].name).toBe('The Squeezed Survivor');
        expect(inputs.personas[0].painPoints[0].quote).toContain('one bad season');
        expect(() => buildPrdCompilerPrompt(inputs)).not.toThrow();
    });

    it('primary chunks holding a session quote move ahead of synthesis pages and unrelated chunks', () => {
        const q = 'Salesforce is kind of all over the place for advisors today';
        const chunks = [
            { id: 'articles/other/x.md#c1', text: 'unrelated text about something else entirely' },
            { id: 'articles/hic-theme-synthesis/t1.md#c0', text: `Theme: ${q}.` },
            { id: 'articles/client-uploads/1888.md#c4', text: `Interview: ${q}, said the director.` },
        ];
        expect(primaryFirst(chunks, [q]).map(c => c.id)).toEqual(['articles/client-uploads/1888.md#c4', 'articles/hic-theme-synthesis/t1.md#c0', 'articles/other/x.md#c1']);
        expect(primaryFirst(chunks, [])).toBe(chunks);
    });
});
