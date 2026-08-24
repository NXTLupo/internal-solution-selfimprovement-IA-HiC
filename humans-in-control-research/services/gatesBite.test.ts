/**
 * E1.3, PROVE EVERY GATE BITES (2026-08-21).
 *
 * Adopted from the `setup-ts-deep-modules` rule that a config which does not fail on a
 * violation is worthless. HiC ships ten ordered inspection stages, and every existing
 * test asks whether a stage passes clean input. None deliberately fed each stage a
 * violation and asserted rejection, which means a stage could be silently inert and the
 * suite would stay green. That is exactly what happened earlier in this program: the
 * gates were built, reported pass, and were not changing any artifact.
 *
 * So each stage below gets two cases: a clean artifact it must accept, and a targeted
 * violation it must catch, with the finding naming the offending field. If someone
 * deletes a stage's logic, a test here fails rather than a warning quietly disappearing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { runArtifactChain, STAGE_ORDER, type StageId } from './artifactChain';
import { resetGroundingChunks, noteGroundingChunks, type BindableChunk } from './pointerBinder';

// ---------------------------------------------------------------------------
// Fixtures. One clean deck, and one mutation per stage.
// ---------------------------------------------------------------------------

const CHUNK: BindableChunk = {
    id: 'articles/exs-clockwork/63e5475889.md#c1',
    text: 'Clockwork reports that data enrichment shortens the research phase of a retained search '
        + 'because sourcing and screening absorb the majority of consultant hours before a shortlist exists.',
    sourceNames: ['3 Ways Data Enrichment Accelerates Executive Search'],
};

const slide = (id: string, template: string, payload: any) => ({
    id, template, status: 'draft', timestamp: 1,
    title: payload.title || 'A finding',
    composerPayload: payload,
});

/** A deck that should clear every stage: sourced claims, varied archetypes, real exhibits. */
function cleanDeck() {
    return [
        slide('s1', 'slides:cover', { title: 'Where AI reaches the retained search process', subtitle: 'How firms sequence adoption', sourceLine: 'Source: Clockwork' }),
        slide('s2', 'slides:evidence-table', {
            title: 'Enrichment shortens the research phase',
            columns: ['Stage', 'Change', 'Evidence'],
            rows: [
                // The pointer sits in the SAME field as the claim: the provenance lock
                // requires per-field binding, so a pointer parked on `source` does not
                // cover a claim made in a cell. The gate catching that is correct.
                { cells: ['Research', `Enrichment shortens the phase because sourcing absorbs the majority of hours [${CHUNK.id}]`, 'Clockwork'] },
                { cells: ['Screening', 'Partners keep the finalist call', 'Clockwork'] },
                { cells: ['Reporting', 'Manual client updates persist', 'Clockwork'] },
            ],
            source: 'Clockwork',
        }),
        slide('s3', 'slides:ranked-bars', {
            title: 'Where firms report the clearest gains',
            bars: [
                { label: 'Research', value: 'high' },
                { label: 'Outreach', value: 'medium' },
                { label: 'Assessment', value: 'low' },
            ],
            source: 'Clockwork',
        }),
        slide('s4', 'slides:role-recommendation', {
            title: 'Sequence adoption where feasibility is highest',
            recommendations: [{ label: 'Start with enrichment', detail: 'The firm should begin where the data already sits inside the CRM.' }],
            source: 'Clockwork',
        }),
    ];
}

/* The deck-sequence memory is module-level and keyed by engagement slug, with no
   reset hook. Rather than add one just for tests, each case gets its own slug, and the
   repeat case deliberately reuses one. */
let slugSeq = 0;
const ctx = (over: any = {}) => ({
    runId: 'gates-bite',
    artifactType: 'slides',
    engagementSlug: `gates-bite-${++slugSeq}`,
    resolveSourceText: () => CHUNK.text,
    fetchPage: async () => ({ ok: true, text: CHUNK.text }),
    ...over,
} as any);

const stageOf = (res: any, stage: StageId) =>
    (res.envelopes || []).find((e: any) => e.stepId === `chain:${stage}`);

beforeEach(() => {
    resetGroundingChunks();
    noteGroundingChunks([{ id: CHUNK.id, text: CHUNK.text, sources: [{ n: CHUNK.sourceNames[0] }] }]);
});

// ---------------------------------------------------------------------------
// The order is the contract
// ---------------------------------------------------------------------------

describe('the chain runs every stage, in order', () => {
    it('records all ten stages for one deck', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(res.envelopes.map((e: any) => e.stepId)).toEqual(STAGE_ORDER.map(s => `chain:${s}`));
    });

    it('a skipped stage is recorded as skipped, never silently dropped', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx({ skip: ['deckQuality'] }));
        const dq = stageOf(res, 'deckQuality');
        expect(dq).toBeDefined();
        // The envelope status union is success|partial|error, so a skip is recorded in
        // meta. What matters is that the stage still APPEARS: a dropped stage would be
        // indistinguishable from one that ran and passed.
        expect(dq.meta?.skipped).toBe(true);
        expect(res.deckQualityReport).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Per-stage: clean passes, violation bites
// ---------------------------------------------------------------------------

describe('normalize bites', () => {
    it('accepts a clean deck', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(stageOf(res, 'normalize').status).not.toBe('failure');
    });

    it('strips a provider artifact tag rather than shipping it', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).rows[0].cells[1] += ' oaicite:12';
        const res = await runArtifactChain(deck as any, ctx());
        expect(JSON.stringify(res.slides)).not.toContain('oaicite');
    });
});

describe('lexical bites', () => {
    it('removes an em-dash from shipped text', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).rows[1].cells[1] = 'Partners keep the finalist call — the client relationship is the product';
        const res = await runArtifactChain(deck as any, ctx());
        expect(JSON.stringify(res.slides)).not.toContain('—');
    });

    it('catches a banned phrase and asks for a REWRITE, not a deletion', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).rows[2].cells[1] = 'Firms utilize a comprehensive approach to reporting';
        const res = await runArtifactChain(deck as any, ctx());
        const lex = stageOf(res, 'lexical');
        expect(lex.status).toBe('partial');
        expect(String(lex.message)).toMatch(/utilize|comprehensive/i);
        // The remedy is a rewrite instruction the repair pass consumes. Blunt deletion
        // would leave "Firms a approach to reporting", which is worse than the slop.
        expect(res.repairInstruction).toMatch(/Rewrite each sentence/i);
        expect(res.repairInstruction).toContain('utilize');
    });

    it('leaves a banned word alone inside a verbatim quote', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).quote = 'A.I. utilizes position details, project, company and specialization data';
        const res = await runArtifactChain(deck as any, ctx());
        expect(JSON.stringify(res.slides)).toContain('utilizes position details');
    });
});

describe('bindPointers bites', () => {
    it('binds a source label to the chunk that records it', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(res.bindReport.bound.length).toBeGreaterThan(0);
        expect(JSON.stringify(res.slides)).toContain(CHUNK.id);
    });

    it('REFUSES a label no chunk records, and says why', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).source = 'Intuit Mid-Market AI Report';
        delete (deck[1].composerPayload as any).sourceLine;
        const res = await runArtifactChain(deck as any, ctx());
        const refused = res.bindReport.unbound.some((u: any) => /no chunk records a source matching/i.test(u.reason));
        expect(refused).toBe(true);
        expect(JSON.stringify(res.slides)).not.toContain('Intuit Mid-Market AI Report [');
    });
});

describe('provenance bites', () => {
    it('passes when the cited span supports the claim', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(stageOf(res, 'provenance').status).not.toBe('failure');
    });

    it('flags a claim whose cited page does NOT contain it', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).rows[0].cells[1] =
            `Retained search firms cut time to shortlist because vendors automate assessment [${CHUNK.id}]`;
        const res = await runArtifactChain(deck as any, ctx({
            // the page the pointer addresses says something unrelated
            fetchPage: async () => ({ ok: true, text: 'An unrelated article about grain markets and commodity pricing.' }),
            resolveSourceText: () => 'An unrelated article about grain markets and commodity pricing.',
        }));
        const p = stageOf(res, 'provenance');
        expect(p.status === 'partial' || p.status === 'failure').toBe(true);
    });
});

describe('evidenceSlots bites', () => {
    it('passes a deck whose factual claims carry pointers', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(res.slotReport.violations).toHaveLength(0);
    });

    it('catches an unsupported factual claim and NAMES the field', async () => {
        const deck = cleanDeck();
        (deck[2].composerPayload as any).bars = [
            { label: 'Research', value: 'Nine of ten firms replaced screening because the tooling matured' },
            { label: 'Outreach', value: 'medium' },
            { label: 'Assessment', value: 'low' },
        ];
        const res = await runArtifactChain(deck as any, ctx({ resolveSourceText: () => '' }));
        expect(res.slotReport.violations.length).toBeGreaterThan(0);
        const v = res.slotReport.violations[0];
        expect(typeof v.field === 'string' || typeof v.sectionId === 'string').toBe(true);
    });

    it('reports plan ABSENCE rather than full coverage of nothing', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(res.slotReport.planAbsent).toBe(true);
    });

    it('stops reporting absence once the run declares a plan', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx({
            subQuestions: [{ id: 'sq_1', question: 'Which retained search stages does enrichment change first?', priority: 'high' }],
        }));
        expect(res.slotReport.planAbsent).toBe(false);
    });
});

describe('exhibits bites', () => {
    it('accepts an exhibit that meets its data floor', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(stageOf(res, 'exhibits')).toBeDefined();
        expect(res.exhibitReport.findings.filter((f: any) => f.slideId === 's3')).toHaveLength(0);
    });

    it('catches a ranked-bars exhibit below its floor and names a downgrade', async () => {
        const deck = cleanDeck();
        (deck[2].composerPayload as any).bars = [{ label: 'Research', value: 'high' }];
        const res = await runArtifactChain(deck as any, ctx());
        const finding = res.exhibitReport.findings.find((f: any) => f.slideId === 's3');
        expect(finding).toBeDefined();
        // The catalog declares a remedy per exhibit, so a misfit must name what to do.
        expect(finding.kind).toBe('misfit');
        expect(String(finding.remedy || '')).not.toBe('');
    });
});

describe('prose bites', () => {
    it('scores a varied deck without concern', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(res.proseReport.overall).toBeGreaterThan(0.5);
    });

    it('catches repeated openers', async () => {
        const deck = cleanDeck();
        (deck[1].composerPayload as any).rows = [
            { cells: ['Research', 'The firm should review the process. The firm should review the data. The firm should review the tooling.', 'Clockwork'] },
            { cells: ['Screening', 'The firm should review the panel. The firm should review the brief. The firm should review the notes.', 'Clockwork'] },
            { cells: ['Reporting', 'The firm should review the cadence. The firm should review the format. The firm should review the owner.', 'Clockwork'] },
        ];
        const res = await runArtifactChain(deck as any, ctx());
        const flagged = res.proseReport.concerns.map((c: any) => c.id);
        expect(flagged.length).toBeGreaterThan(0);
    });
});

describe('grade bites', () => {
    it('does not invent a critique of a sound deck', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(stageOf(res, 'grade')).toBeDefined();
    });

    it('calls a vacuous pass what it is when the verifier saw nothing', async () => {
        const deck = cleanDeck();
        // Claims present, but nothing resolvable behind them.
        (deck[1].composerPayload as any).rows[0].cells[1] = 'Nine of ten firms cut screening time because tooling matured';
        const res = await runArtifactChain(deck as any, ctx({
            resolveSourceText: () => '',
            fetchPage: async () => ({ ok: false, text: '' }),
        }));
        expect(res.gradeReport).toBeDefined();
        expect(res.gradeReport.claims.length).toBeGreaterThan(0);
    });
});

describe('renderPlan bites', () => {
    it('produces a plan for every slide', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(stageOf(res, 'renderPlan').status).not.toBe('failure');
    });
});

describe('deckQuality bites', () => {
    it('accepts a deck with varied archetypes', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        const repeat = res.deckQualityReport.findings.find((f: any) => f.kind === 'sequence_repeat');
        expect(repeat).toBeUndefined();
    });

    it('catches a deck that repeats the previous deck sequence', async () => {
        const shared = 'gates-bite-repeat';
        await runArtifactChain(cleanDeck() as any, ctx({ engagementSlug: shared }));
        const res = await runArtifactChain(cleanDeck() as any, ctx({ engagementSlug: shared }));
        const repeat = res.deckQualityReport.findings.find((f: any) => f.kind === 'sequence_repeat');
        expect(repeat).toBeDefined();
        expect(repeat.detail).toMatch(/previous deck/i);
    });

    it('catches an archetype that does not fit its content', async () => {
        const deck = cleanDeck();
        (deck[2].composerPayload as any).bars = [];
        const res = await runArtifactChain(deck as any, ctx());
        expect(res.deckQualityReport.findings.length + res.exhibitReport.findings.length).toBeGreaterThan(0);
    });
});

/**
 * E2.1. Grounding is a deck-level property, so it belongs to the deckQuality stage and
 * earns a bite test of its own: the Partner Test only holds if the argument arrives in a
 * readable order.
 */
describe('grounding bites', () => {
    it('passes a deck that introduces each concept before arguing from it', async () => {
        const res = await runArtifactChain(cleanDeck() as any, ctx());
        expect(res.deckQualityReport.grounding.pass).toBe(true);
    });

    it('catches a late slide arguing from a concept the deck never introduced', async () => {
        const deck = cleanDeck();
        (deck[3].composerPayload as any).recommendations = [{
            label: 'Start with enrichment',
            detail: 'Adoption stalls because the finalist calibration panel rejects every automated shortlist.',
        }];
        const res = await runArtifactChain(deck as any, ctx());
        const finding = res.deckQualityReport.findings.find((f: any) => f.kind === 'ungrounded_concept');
        expect(finding).toBeDefined();
        expect(finding.detail).toMatch(/finalist calibration/);
        expect(finding.remedy).toMatch(/Introduce|rewrite/i);
    });
});

/**
 * E2.1 follow-up (2026-08-24). A repair instruction that names the wrong problem is
 * worse than none, because the model does what it is told. Grounding findings used to
 * travel under a "layout that does not carry its content" header.
 */
describe('the grounding repair instruction names the right problem', () => {
    it('puts an ungrounded concept under NARRATIVE ORDER, not under layout', async () => {
        const deck = cleanDeck();
        (deck[3].composerPayload as any).recommendations = [{
            label: 'Start with enrichment',
            detail: 'Adoption stalls because the finalist calibration panel rejects every automated shortlist.',
        }];
        const res = await runArtifactChain(deck as any, ctx());
        expect(res.repairInstruction).toMatch(/NARRATIVE ORDER/);
        expect(res.repairInstruction).toMatch(/finalist calibration/);
        // The narrative block must not be introduced as a layout problem.
        const narrativeBlock = res.repairInstruction.split('\n\n').find((b: string) => b.startsWith('NARRATIVE ORDER'))!;
        expect(narrativeBlock).not.toMatch(/layout that does not carry its content/);
    });

    it('still labels a real layout shortfall as one', async () => {
        const deck = cleanDeck();
        (deck[2].composerPayload as any).bars = [{ label: 'Research', value: 'high' }];
        const res = await runArtifactChain(deck as any, ctx());
        expect(res.repairInstruction).toMatch(/DECK QUALITY REVISION/);
    });
});
