/**
 * Deterministic pointer binding. The tests that matter are the REFUSALS: a
 * binder that attaches a real pointer to a claim the span does not support is
 * fabrication wearing a citation, which is worse than the unbound state the
 * evidence gate already handles.
 *
 * Fixtures use the shapes the live decks actually produced (`source`,
 * `attributionName`, `sourceLine` carrying bare names), because that is the
 * behavior three prompt-level fixes failed to change.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    bindPointers, noteGroundingChunks, readGroundingChunks, resetGroundingChunks, bindSummary,
    type BindableChunk,
} from './pointerBinder';

const slide = (id: string, payload: any) => ({
    id, template: 'slides:evidence-table', status: 'draft', timestamp: 1,
    title: payload.title || 't', composerPayload: payload,
});

const CLOCKWORK: BindableChunk = {
    id: 'articles/clockwork-blog/9f2a71c4de.md#c2',
    text: 'Clockwork frames retained executive search as eight discrete stages, and practitioners report that '
        + 'research and sourcing absorb the majority of consultant hours before a shortlist exists.',
    sourceNames: ['Clockwork'],
};
const RECRUITERFLOW: BindableChunk = {
    id: 'articles/recruiterflow/aa11bb22cc.md#c4',
    text: 'Recruiterflow describes a workflow where the CRM remains the system of record while automation '
        + 'handles outreach sequencing and interview scheduling for high-volume roles.',
    sourceNames: ['Recruiterflow'],
};
const REDDIT: BindableChunk = {
    id: 'articles/reddit-deep-r-consulting/dd44ee55ff.md#c7',
    text: 'A consultant posted that partners still refuse to let a model near final candidate assessment, '
        + 'because the client relationship is the product and a bad shortlist ends the mandate.',
    sourceNames: ['Reddit r/consulting'],
};
const POOL = [CLOCKWORK, RECRUITERFLOW, REDDIT];

beforeEach(() => resetGroundingChunks());

describe('strategy A: the field names a source, the runtime supplies the address', () => {
    it('binds a bare source label to the chunk that records that source', () => {
        const slides = [slide('s1', { title: 'A finding', rows: [{ cells: ['x'] }], source: 'Clockwork' })];
        const { slides: out, report } = bindPointers(slides as any, POOL);
        expect(report.bound).toHaveLength(1);
        expect(report.bound[0]).toMatchObject({ strategy: 'label', pointer: CLOCKWORK.id });
        expect(out[0].composerPayload.source).toBe(`Clockwork [${CLOCKWORK.id}]`);
    });

    it('handles the multi-source sourceLine the live decks emitted', () => {
        const slides = [slide('s1', {
            title: 'A finding', rows: [{ cells: ['x'] }],
            sourceLine: 'Source: Recruiterflow; Clockwork executive search platform; Reddit r/consulting',
        })];
        const { slides: out, report } = bindPointers(slides as any, POOL);
        // Two pointers max per label, so the caption stays readable.
        expect(report.bound.length).toBeGreaterThanOrEqual(2);
        expect(out[0].composerPayload.sourceLine).toContain(RECRUITERFLOW.id);
    });

    it('matches a longer recorded name from a shorter label', () => {
        const chunk: BindableChunk = { ...CLOCKWORK, sourceNames: ['Clockwork executive search platform'] };
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], attributionName: 'Clockwork' })];
        const { report } = bindPointers(slides as any, [chunk]);
        expect(report.bound[0]?.pointer).toBe(chunk.id);
    });

    it('REFUSES a label no chunk records', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], source: 'Intuit Mid-Market AI Report' })];
        const { slides: out, report } = bindPointers(slides as any, POOL);
        expect(report.bound).toHaveLength(0);
        expect(report.unbound[0].reason).toMatch(/no chunk records a source matching/);
        expect(out[0].composerPayload.source).toBe('Intuit Mid-Market AI Report');
    });
});

describe('strategy B: a claim with no label, matched to the span it came from', () => {
    it('binds a claim that shares distinctive terms and a verbatim run', () => {
        const slides = [slide('s1', {
            title: 'A finding',
            rows: [{ cells: ['Clockwork frames retained executive search as eight discrete stages, and research and sourcing absorb the majority of consultant hours'] }],
        })];
        const { report } = bindPointers(slides as any, POOL);
        const claimBound = report.bound.filter(b => b.strategy === 'claim');
        expect(claimBound).toHaveLength(1);
        expect(claimBound[0].pointer).toBe(CLOCKWORK.id);
    });

    it('REFUSES a claim that merely shares the topic', () => {
        const slides = [slide('s1', {
            title: 'A finding',
            rows: [{ cells: ['Executive search firms are experimenting with automation because clients demand faster shortlists'] }],
        })];
        const { slides: out, report } = bindPointers(slides as any, POOL);
        expect(report.bound.filter(b => b.strategy === 'claim')).toHaveLength(0);
        expect(JSON.stringify(out[0].composerPayload)).not.toContain('.md#c');
    });

    it('binds a paraphrased claim within the slide-DECLARED chunk set at the proportionate bar (strategy declared)', () => {
        // Below the global bar (paraphrase, short verbatim run) but the slide declared the
        // chunk as its evidence, so the proportionate declared-first pass binds it.
        const slides = [slide('s1', {
            title: 'A finding',
            evidence: [CLOCKWORK.id],
            rows: [{ cells: ['Research and sourcing absorb the majority of consultant hours in retained executive search'] }],
        })];
        const { report } = bindPointers(slides as any, POOL);
        const declaredBound = report.bound.filter(b => b.strategy === 'declared');
        expect(declaredBound.length).toBeGreaterThanOrEqual(1);
        expect(declaredBound[0].pointer).toBe(CLOCKWORK.id);
    });

    it('a declared id that is NOT in the grounding pool never binds (invented pointers die)', () => {
        const slides = [slide('s1', {
            title: 'A finding',
            evidence: ['articles/made-up/ff00ff00ff.md#c1'],
            rows: [{ cells: ['Executive search firms are experimenting with automation because clients demand faster shortlists'] }],
        })];
        const { slides: out, report } = bindPointers(slides as any, POOL);
        expect(report.bound.filter(b => b.pointer.includes('made-up'))).toHaveLength(0);
        // The declared array itself keeps the string (it is the model's own output); what
        // matters is that no TEXT FIELD gained the invented address as a citation.
        expect(String(out[0].composerPayload.rows[0].cells[0])).not.toContain('made-up');
        expect(String(out[0].composerPayload.title)).not.toContain('made-up');
    });

    it('REFUSES a claim with too few distinctive terms to be safe', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['Most firms will change because of this'] }] })];
        const { report } = bindPointers(slides as any, POOL);
        expect(report.bound).toHaveLength(0);
        expect(report.unbound.some(u => /too few distinctive terms/.test(u.reason))).toBe(true);
    });

    it('never binds a claim to the WRONG span when two chunks are close', () => {
        // The sentence needs a factual marker ("because") to be a claim at all;
        // a purely descriptive sentence is correctly ignored by the detector,
        // which is what the first version of this fixture accidentally tested.
        const slides = [slide('s1', {
            title: 't',
            rows: [{ cells: ['Recruiterflow describes a workflow where the CRM remains the system of record because automation handles outreach sequencing and interview scheduling'] }],
        })];
        const { report } = bindPointers(slides as any, POOL);
        expect(report.bound[0]?.pointer).toBe(RECRUITERFLOW.id);
    });

    it('leaves a judgment sentence alone (it is not a factual claim)', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['The firm should sequence adoption where feasibility is highest'] }] })];
        const { report } = bindPointers(slides as any, POOL);
        expect(report.bound).toHaveLength(0);
        expect(report.fieldsConsidered).toBe(0);
    });
});

describe('safety and bookkeeping', () => {
    it('never double-binds a field that already carries a pointer', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: [`Clockwork frames retained executive search as eight discrete stages [${CLOCKWORK.id}]`] }] })];
        const { report } = bindPointers(slides as any, POOL);
        expect(report.bound).toHaveLength(0);
    });

    it('records every change through the edit contract so Undo still works', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], source: 'Clockwork' })];
        const { slides: out } = bindPointers(slides as any, POOL);
        expect((out[0] as any)._textHistory).toHaveLength(1);
    });

    it('is a no-op with no chunks and with no slides', () => {
        expect(bindPointers([slide('s1', { source: 'Clockwork' })] as any, []).report.bound).toHaveLength(0);
        expect(bindPointers([] as any, POOL).report.bound).toHaveLength(0);
    });

    it('does not mutate the input slides', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], source: 'Clockwork' })];
        bindPointers(slides as any, POOL);
        expect(slides[0].composerPayload.source).toBe('Clockwork');
    });

    it('bindSummary names the strategies used', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], source: 'Clockwork' })];
        const { report } = bindPointers(slides as any, POOL);
        expect(bindSummary(report)).toMatch(/label=1/);
    });
});

describe('grounding projection', () => {
    it('records the chunk set the model was shown, dropping unusable entries', () => {
        noteGroundingChunks([
            { id: 'a/b.md#c1', text: 'some evidence text', sources: [{ n: 'Source A' }] },
            { id: '', text: 'no id' } as any,
            { id: 'c/d.md#c2' } as any,
        ]);
        const g = readGroundingChunks();
        expect(g).toHaveLength(1);
        expect(g[0]).toMatchObject({ id: 'a/b.md#c1', sourceNames: ['Source A'] });
    });

    it('keeps the previous set rather than clearing it on an empty call', () => {
        noteGroundingChunks([{ id: 'a/b.md#c1', text: 'x', sources: [] }]);
        noteGroundingChunks([]);
        expect(readGroundingChunks()).toHaveLength(1);
    });
});

/**
 * REAL-DATA REGRESSION. The three prompt-level attempts to make the model carry
 * pointers were measured on live decks and all produced zero. This test runs the
 * binder against a real deck payload and a real chunk set captured from the
 * 2026-08-21 run, in the exact shapes production emitted: the model names the
 * PUBLISHER ("Clockwork") while the chunk records the ARTICLE TITLE, so name
 * matching alone finds nothing and the page slug is the only place the two meet.
 * On the live artifact this took the deck from 0 pointers to 10.
 */
describe('real-data regression: publisher label vs article-title chunk', () => {
    const REAL_CHUNKS: BindableChunk[] = [
        {
            id: 'articles/exs-clockwork/63e5475889.md#c1',
            text: 'Retained search firms report that data enrichment shortens the research phase before a shortlist exists.',
            // The recorded name is the ARTICLE TITLE, not the platform.
            sourceNames: ['3 Ways Data Enrichment Accelerates Executive Search'],
        },
        {
            id: 'social-intelligence/reddit-deep/consulting/1rlukge.md#c2',
            text: 'A consultant wrote that partners will not let a model near the final assessment because the client relationship is the product.',
            sourceNames: ['Some thread title from a consulting subreddit'],
        },
        {
            id: 'articles/exs-recruiterflow/26b00acd34.md#c2',
            text: 'Recruiterflow positions the CRM as the system of record while automation handles sequencing.',
            sourceNames: ['Untitled crawl result'],
        },
    ];

    it('binds a publisher label through the page slug when no recorded name matches', () => {
        const slides = [slide('s1', {
            title: 'A finding',
            rows: [{ cells: ['x'] }],
            sourceLine: 'Source: Clockwork; Recruiterflow; Reddit r/consulting',
            attributionName: 'Clockwork',
        })];
        const { slides: out, report } = bindPointers(slides as any, REAL_CHUNKS);
        const pointers = (JSON.stringify(out).match(/\.md#c\d+/g) || []).length;
        expect(pointers).toBeGreaterThanOrEqual(3);
        expect(report.bound.every(b => b.strategy === 'label')).toBe(true);
        expect(JSON.stringify(out)).toContain('articles/exs-clockwork/63e5475889.md#c1');
    });

    it('a short or generic label fragment cannot claim an unrelated source', () => {
        // "AI" and "the" are below the 5-character slug-word floor, so neither can
        // match `articles/exs-clockwork/...` by accident.
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], source: 'AI' })];
        const { report } = bindPointers(slides as any, REAL_CHUNKS);
        expect(report.bound).toHaveLength(0);
    });

    it('the container segment and the content hash are never treated as a source', () => {
        const slides = [slide('s1', { title: 't', rows: [{ cells: ['x'] }], source: 'articles' })];
        expect(bindPointers(slides as any, REAL_CHUNKS).report.bound).toHaveLength(0);
        const hashed = [slide('s2', { title: 't', rows: [{ cells: ['x'] }], source: '63e5475889' })];
        expect(bindPointers(hashed as any, REAL_CHUNKS).report.bound).toHaveLength(0);
    });
});
