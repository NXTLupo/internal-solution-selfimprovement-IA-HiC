/**
 * E2.2. The thesis decides the deck, so it is the wrong decision to make silently.
 *
 * The interesting cases are the REJECTIONS: three restatements of one idea is the exact
 * failure `verbalized-sampling` exists to catch, and a menu that offers no real choice is
 * worse than no menu because it looks like one.
 */
import { describe, it, expect } from 'vitest';
import {
    parseThesisOptions, buildThesisAirRecord, stripThesisOptions, buildRecomposeDirective,
    THESIS_OPTIONS_CONTRACT, proposeAlternativeTheses,
} from './thesisOptions';

const block = (arr: any[]) => `:::thesis-options\n${JSON.stringify(arr)}\n:::\n\n:::slide template=slides:cover\n{}\n:::`;

const THREE_DISTINCT = [
    { thesis: 'AI reaches research before it reaches assessment', implies: 'Sequence adoption by stage, starting with sourcing', chosen: true },
    { thesis: 'Client reporting is the binding constraint, not sourcing', implies: 'Fix the update workflow before touching the pipeline', chosen: false },
    { thesis: 'Partner judgment is the product a firm sells', implies: 'Protect the finalist call and automate everything behind it', chosen: false },
];

describe('parseThesisOptions', () => {
    it('accepts three distinct candidates with one chosen', () => {
        const r = parseThesisOptions(block(THREE_DISTINCT));
        expect(r.valid).toBe(true);
        expect(r.candidates).toHaveLength(3);
        expect(r.candidates.find(c => c.chosen)!.thesis).toMatch(/reaches research before/);
        expect(r.problems).toEqual([]);
    });

    it('REJECTS three restatements of one idea, which is a menu with no choice on it', () => {
        const r = parseThesisOptions(block([
            { thesis: 'AI reaches the research phase before assessment', implies: 'x', chosen: true },
            { thesis: 'The research phase is where AI reaches first, before assessment', implies: 'y', chosen: false },
            { thesis: 'Before assessment, AI reaches the research phase', implies: 'z', chosen: false },
        ]));
        expect(r.valid).toBe(false);
        expect(r.problems.join(' ')).toMatch(/argue the same thing/);
    });

    it('REJECTS a set with nothing marked chosen, since the deck must say what it argued', () => {
        const r = parseThesisOptions(block(THREE_DISTINCT.map(c => ({ ...c, chosen: false }))));
        expect(r.valid).toBe(false);
        expect(r.problems.join(' ')).toMatch(/no candidate is marked chosen/);
    });

    it('REJECTS more than one chosen, because a deck argues one thesis', () => {
        const r = parseThesisOptions(block(THREE_DISTINCT.map(c => ({ ...c, chosen: true }))));
        expect(r.problems.join(' ')).toMatch(/3 candidates marked chosen/);
    });

    it('REJECTS a candidate with no implied argument, which leaves nothing to compare', () => {
        const r = parseThesisOptions(block([
            { thesis: 'A', implies: 'a real implication here', chosen: true },
            { thesis: 'Something quite different about reporting', implies: '', chosen: false },
        ]));
        expect(r.problems.join(' ')).toMatch(/no implied argument/);
    });

    it('REJECTS a single candidate: the point is the choice', () => {
        const r = parseThesisOptions(block([THREE_DISTINCT[0]]));
        expect(r.valid).toBe(false);
        expect(r.problems.join(' ')).toMatch(/at least two are required/);
    });

    it('reports a missing block plainly rather than throwing', () => {
        const r = parseThesisOptions(':::slide template=slides:cover\n{}\n:::');
        expect(r.valid).toBe(false);
        expect(r.problems[0]).toMatch(/no thesis-options block/);
    });

    it('reports malformed JSON without throwing', () => {
        const r = parseThesisOptions(':::thesis-options\n[{"thesis": broken}\n:::');
        expect(r.valid).toBe(false);
        expect(r.problems[0]).toMatch(/not valid JSON/);
    });
});

describe('buildThesisAirRecord', () => {
    it('records the rejected candidates, which is the preference data SkillOpt never had', () => {
        const rec = buildThesisAirRecord(parseThesisOptions(block(THREE_DISTINCT)));
        expect(rec.chosen).toMatch(/reaches research before/);
        expect(rec.rejected).toHaveLength(2);
        expect(rec.rejected[0].implies).toMatch(/Fix the update workflow/);
        expect(rec.valid).toBe(true);
    });

    it('records the failure honestly when the model did not comply', () => {
        const rec = buildThesisAirRecord(parseThesisOptions('no block here'));
        expect(rec.chosen).toBeNull();
        expect(rec.valid).toBe(false);
        expect(rec.problems.length).toBeGreaterThan(0);
    });
});

describe('stripThesisOptions', () => {
    it('removes the block so the reader sees a deck, not a menu', () => {
        const out = stripThesisOptions(block(THREE_DISTINCT));
        expect(out).not.toContain('thesis-options');
        expect(out).toContain('slides:cover');
    });

    it('leaves text with no block untouched', () => {
        expect(stripThesisOptions('just slides')).toBe('just slides');
    });
});

describe('buildRecomposeDirective', () => {
    it('pins the chosen thesis verbatim rather than paraphrasing it', () => {
        const c = parseThesisOptions(block(THREE_DISTINCT)).candidates[1];
        const d = buildRecomposeDirective(c);
        expect(d).toContain('#slides');
        expect(d).toContain('"Client reporting is the binding constraint, not sourcing"');
        expect(d).toMatch(/ladder every slide up to it/);
    });
});

describe('THESIS_OPTIONS_CONTRACT', () => {
    it('tells the model to differ on the claim, not the wording', () => {
        expect(THESIS_OPTIONS_CONTRACT).toMatch(/Differ on/);
        expect(THESIS_OPTIONS_CONTRACT).toMatch(/restatements of one idea is not a choice/);
    });

    it('carries no em-dash, since it becomes part of a generation prompt', () => {
        expect(THESIS_OPTIONS_CONTRACT).not.toContain('—');
    });
});

/**
 * E2.2 follow-up. The embedded DECK MODE contract was ignored on the live run, so the
 * alternatives now come from a dedicated call. The cases that matter are the ones where
 * the call misbehaves: a restatement, a failure, junk. None may block a deck.
 */
describe('proposeAlternativeTheses', () => {
    const DECK_THESIS = 'Enrichment reaches the research phase before it reaches assessment';
    const reply = (arr: any) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(arr) }] } }] });

    it('returns the deck thesis as CHOSEN plus the alternatives it was given', async () => {
        const out = await proposeAlternativeTheses({
            deckThesis: DECK_THESIS,
            evidence: ['Clockwork reports enrichment shortens research.'],
            callAI: async () => reply([
                { thesis: 'Client reporting is the binding constraint, not sourcing', implies: 'Fix the update workflow first' },
                { thesis: 'Partner judgment is the product a firm sells', implies: 'Protect the finalist call' },
            ]),
            model: 'test-model',
        });
        expect(out).toHaveLength(3);
        expect(out[0]).toMatchObject({ chosen: true, thesis: DECK_THESIS });
        expect(out.filter(c => !c.chosen)).toHaveLength(2);
    });

    it('DROPS a restatement, because a choice between the same idea twice is not a choice', async () => {
        const out = await proposeAlternativeTheses({
            deckThesis: DECK_THESIS,
            evidence: [],
            callAI: async () => reply([
                { thesis: 'Before assessment, enrichment reaches the research phase', implies: 'same thing' },
                { thesis: 'Client reporting is the binding constraint, not sourcing', implies: 'different' },
            ]),
            model: 'test-model',
        });
        expect(out.filter(c => !c.chosen).map(c => c.thesis)).toEqual(['Client reporting is the binding constraint, not sourcing']);
    });

    it('offers nothing rather than a fake choice when every alternative is a restatement', async () => {
        const out = await proposeAlternativeTheses({
            deckThesis: DECK_THESIS,
            evidence: [],
            callAI: async () => reply([{ thesis: 'Enrichment reaches research before assessment', implies: 'x' }]),
            model: 'test-model',
        });
        expect(out).toEqual([]);
    });

    it('a failed call degrades to no alternatives, never a blocked deck', async () => {
        const out = await proposeAlternativeTheses({
            deckThesis: DECK_THESIS,
            evidence: [],
            callAI: async () => { throw new Error('provider down'); },
            model: 'test-model',
        });
        expect(out).toEqual([]);
    });

    it('survives junk output', async () => {
        const out = await proposeAlternativeTheses({
            deckThesis: DECK_THESIS, evidence: [],
            callAI: async () => ({ candidates: [{ content: { parts: [{ text: 'not json at all' }] } }] }),
            model: 'test-model',
        });
        expect(out).toEqual([]);
    });

    it('asks for nothing when the deck has no thesis to work from', async () => {
        let called = false;
        const out = await proposeAlternativeTheses({
            deckThesis: '   ', evidence: [],
            callAI: async () => { called = true; return reply([]); },
            model: 'test-model',
        });
        expect(out).toEqual([]);
        expect(called).toBe(false);
    });
});
