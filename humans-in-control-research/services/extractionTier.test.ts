/**
 * DF-H. Two tests carry the weight. Per-sub-question selection must not starve a
 * thin sub-question, because the thin ones are exactly where the evidence gap
 * lives. And `checkScopeMatch` must ABSTAIN rather than guess: a false `match`
 * licenses the overreach the Scope-Match Rule exists to stop.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    selectForFullText, emptyExtraction, checkScopeMatch, planBatches,
    buildCaptureReport, captureEnvelope, shapeQuery, shouldSearchSlot,
    noteSlotSearch, slotSearchRecord, resetSlotSearches, describeSearchYield,
    type Candidate, type SourceExtraction,
} from './extractionTier';

const cand = (id: string, sub: string, score: number, snippetLen = 200): Candidate => ({
    id, subQuestionId: sub, score,
    title: `Title ${id}`, snippet: 'x'.repeat(snippetLen), sourceName: `Source ${id}`,
});

beforeEach(() => resetSlotSearches());

describe('H1: two-tier selection is PER sub-question', () => {
    it('gives a thin sub-question its reads instead of letting a rich one take them all', () => {
        const candidates = [
            ...Array.from({ length: 10 }, (_, i) => cand(`rich${i}`, 'sq1', 0.9 - i * 0.01)),
            cand('thin1', 'sq2', 0.3),
        ];
        const res = selectForFullText(candidates, { perSubQuestion: 3 });
        const subs = new Set(res.capture.map(c => c.subQuestionId));
        expect(subs.has('sq2')).toBe(true);
        expect(res.capture.filter(c => c.subQuestionId === 'sq1')).toHaveLength(3);
        expect(res.perSubQuestion).toEqual(expect.arrayContaining([
            { subQuestionId: 'sq1', selected: 3, available: 10 },
            { subQuestionId: 'sq2', selected: 1, available: 1 },
        ]));
    });

    it('skips a candidate whose snippet is too thin to be worth a fetch, and reports the starvation', () => {
        const res = selectForFullText([cand('tiny', 'sq1', 0.9, 5)], { minSnippet: 80 });
        expect(res.capture).toHaveLength(0);
        expect(res.starved).toEqual(['sq1']);
    });

    it('does not re-fetch a candidate that already holds full text', () => {
        const already: Candidate = { ...cand('c1', 'sq1', 0.9), fullText: 'y'.repeat(500) };
        const res = selectForFullText([already]);
        expect(res.capture).toHaveLength(0);
        expect(res.alreadyFull).toHaveLength(1);
    });

    it('reports the total cap rather than silently truncating', () => {
        const many = Array.from({ length: 12 }, (_, i) => cand(`c${i}`, `sq${i}`, 0.5));
        const res = selectForFullText(many, { perSubQuestion: 1, totalCap: 4 });
        expect(res.capture).toHaveLength(4);
        expect(res.cappedByTotal).toBe(true);
    });

    it('breaks a score tie on the longer snippet', () => {
        const res = selectForFullText([cand('short', 'sq1', 0.5, 100), cand('long', 'sq1', 0.5, 900)], { perSubQuestion: 1 });
        expect(res.capture[0].id).toBe('long');
    });
});

describe('H2: the extraction schema makes the Scope-Match Rule checkable', () => {
    const bounded: SourceExtraction = {
        sourceId: 's1', claimType: 'empirical',
        population: 'a cohort of 40 respondents at one firm', period: '2025',
        methodology: 'survey', keyFindings: [], limitations: [], namedEntities: [],
    };
    const broad: SourceExtraction = { ...bounded, population: 'the executive search industry' };

    it('flags a universal claim against a bounded population', () => {
        const v = checkScopeMatch('All firms now screen candidates with a model.', bounded);
        expect(v.verdict).toBe('narrower');
        expect(v.dimension).toBe('population');
        expect(v.detail).toContain('a cohort of 40 respondents');
    });

    it('treats a bare plural actor as a universal claim', () => {
        expect(checkScopeMatch('Firms screen candidates with a model.', bounded).verdict).toBe('narrower');
    });

    it('accepts the same sentence hedged to the sample', () => {
        expect(checkScopeMatch('Some firms in the sample screen candidates with a model.', bounded).verdict).toBe('match');
    });

    it('ABSTAINS when the source never stated its population', () => {
        const v = checkScopeMatch('All firms now screen with a model.', { ...bounded, population: null });
        expect(v.verdict).toBe('unknown');
        expect(v.detail).toMatch(/does not state its population/);
    });

    it('ABSTAINS when extraction never ran, rather than passing the claim', () => {
        const v = checkScopeMatch('All firms now screen with a model.', emptyExtraction('s2', 'fetch failed'));
        expect(v.verdict).toBe('unknown');
    });

    it('passes a universal claim against a genuinely broad population', () => {
        expect(checkScopeMatch('Firms screen candidates with a model.', broad).verdict).toBe('match');
    });

    it('an empty extraction records the reason and invents nothing', () => {
        const e = emptyExtraction('s3', '404 not found');
        expect(e.population).toBeNull();
        expect(e.period).toBeNull();
        expect(e.keyFindings).toEqual([]);
        expect(e.unavailableReason).toBe('404 not found');
    });
});

describe('H3: a batching TABLE, and honest failure', () => {
    it('covers every id exactly once', () => {
        const ids = Array.from({ length: 23 }, (_, i) => `s${i}`);
        const plan = planBatches(ids);
        const flat = plan.batches.flatMap(b => b.items);
        expect(flat).toHaveLength(23);
        expect(new Set(flat).size).toBe(23);
        expect(plan.batchSize).toBe(6);
    });

    it('scales the batch size by table lookup, never by arithmetic', () => {
        expect(planBatches(['a']).batchSize).toBe(4);
        expect(planBatches(Array.from({ length: 50 }, (_, i) => `s${i}`)).batchSize).toBe(8);
        expect(planBatches(Array.from({ length: 500 }, (_, i) => `s${i}`)).batchSize).toBe(10);
        expect(planBatches([]).batches).toHaveLength(0);
    });

    it('REPORTS a failed fetch so the model cannot reason from a title', () => {
        const plan = planBatches(['a', 'b', 'c']);
        const report = buildCaptureReport([
            { sourceId: 'a', ok: true, chars: 4000 },
            { sourceId: 'b', ok: false, chars: 0, reason: 'timeout' },
            { sourceId: 'c', ok: true, chars: 2000 },
        ], plan);
        expect(report.captured).toBe(2);
        expect(report.notice).toContain('1 SOURCE(S) COULD NOT BE READ');
        expect(report.notice).toContain('b: timeout');
        expect(report.notice).toMatch(/do not describe\s+their contents from their titles/);
    });

    it('says nothing when every capture succeeded', () => {
        const plan = planBatches(['a']);
        const report = buildCaptureReport([{ sourceId: 'a', ok: true, chars: 10 }], plan);
        expect(report.notice).toBe('');
        expect(captureEnvelope(report).status).toBe('success');
    });

    it('envelopes a partial capture, and escalates when nothing was read', () => {
        const plan = planBatches(['a', 'b']);
        const some = buildCaptureReport([{ sourceId: 'a', ok: true, chars: 9 }, { sourceId: 'b', ok: false, chars: 0 }], plan);
        expect(captureEnvelope(some).nextAction).toBe('continue');
        const none = buildCaptureReport([{ sourceId: 'a', ok: false, chars: 0 }, { sourceId: 'b', ok: false, chars: 0 }], plan);
        expect(captureEnvelope(none).nextAction).toBe('try_alternative');
    });

    it('surfaces a systematically failing batch', () => {
        const plan = planBatches(['a', 'b', 'c', 'd', 'e']);
        const report = buildCaptureReport(
            plan.batches[0].items.map(id => ({ sourceId: id, ok: false, chars: 0, reason: '403' })), plan,
        );
        expect(report.batchOutcomes[0].failed).toBe(plan.batches[0].items.length);
    });
});

describe('H5: search discipline', () => {
    it('reduces an objective to two or three real keywords', () => {
        const q = shapeQuery('What are the latest comprehensive research insights about AI adoption in executive search for our deck');
        expect(q.keywords.length).toBeLessThanOrEqual(3);
        expect(q.query.toLowerCase()).not.toMatch(/\b(the|latest|comprehensive|research|insights|about|our|deck)\b/);
        expect(q.dropped.length).toBeGreaterThan(5);
    });

    it('puts a named subject first, because a proper noun is the highest-signal term', () => {
        const q = shapeQuery('how does Recruiterflow handle candidate sequencing');
        expect(q.keywords[0]).toBe('Recruiterflow');
    });

    it('keeps structural constraints as FILTERS, never as query text', () => {
        const q = shapeQuery('AI adoption in executive search', { packs: ['exs'], since: '2025-01-01' });
        expect(q.query).not.toContain('exs');
        expect(q.query).not.toContain('2025');
        expect(q.filters).toEqual({ packs: ['exs'], since: '2025-01-01' });
    });

    it('drops a hashtag and de-duplicates a repeated term', () => {
        const q = shapeQuery('#slides search search platform');
        expect(q.query).not.toContain('#');
        expect(q.keywords.filter(k => k.toLowerCase() === 'search')).toHaveLength(1);
    });

    it('searches a slot once and refuses a reworded retry', () => {
        expect(shouldSearchSlot('slot1')).toBe(true);
        noteSlotSearch('slot1', 'executive search AI', 12);
        expect(shouldSearchSlot('slot1')).toBe(false);
        expect(shouldSearchSlot('slot2')).toBe(true);
    });

    it('reports the REAL yield, including the slots that found nothing', () => {
        noteSlotSearch('slot1', 'a', 12);
        noteSlotSearch('slot2', 'b', 0);
        const record = slotSearchRecord();
        expect(record).toHaveLength(2);
        const described = describeSearchYield(record);
        expect(described).toContain('2 slot search(es), 12 result(s)');
        expect(described).toContain('slot2');
    });

    it('says so when nothing was searched', () => {
        expect(describeSearchYield([])).toBe('no slot searches recorded');
    });
});
