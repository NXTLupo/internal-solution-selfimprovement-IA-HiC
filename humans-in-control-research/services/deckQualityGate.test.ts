/** Exhibit data fit and cross-deck convergence, the two visual checks deer-flow had and HiC did not. */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    evaluateDeckQuality, buildDeckQualityInstruction, noteDeckSequence, previousDeckSequence,
} from './deckQualityGate';

const slide = (template: string, payload: any = {}, id = template) => ({
    id, template, status: 'draft', timestamp: 1, title: payload.title || 't', composerPayload: payload,
});

describe('exhibit data fit', () => {
    it('flags a ranking with too few entries to be a ranking', () => {
        const r = evaluateDeckQuality([slide('slides:ranked-bars', { bars: [{ label: 'a' }, { label: 'b' }] })]);
        expect(r.findings[0]).toMatchObject({ kind: 'exhibit_underfilled', template: 'slides:ranked-bars' });
        expect(r.findings[0].detail).toMatch(/carries 2 bars \(needs 3\)/);
    });

    it('passes the same archetype once the data supports it', () => {
        const r = evaluateDeckQuality([slide('slides:ranked-bars', { bars: [1, 2, 3, 4].map(i => ({ label: `s${i}` })) })]);
        expect(r.findings.filter(f => f.kind === 'exhibit_underfilled')).toHaveLength(0);
    });

    it('flags a 2x2 plotting one subject and a table with one row', () => {
        const r = evaluateDeckQuality([
            slide('slides:quadrant', { subjects: [{ label: 'only' }] }, 'q'),
            slide('slides:evidence-table', { rows: [{ cells: ['a'] }] }, 't'),
        ]);
        expect(r.findings.filter(f => f.kind === 'exhibit_underfilled')).toHaveLength(2);
    });

    it('stays silent when the payload field is absent (the payload contract owns that)', () => {
        const r = evaluateDeckQuality([slide('slides:ranked-bars', { title: 'no bars key at all' })]);
        expect(r.findings.filter(f => f.kind === 'exhibit_underfilled')).toHaveLength(0);
    });

    it('counts a nested collection (left.items) rather than calling it empty', () => {
        const r = evaluateDeckQuality([slide('slides:problem-diptych', { left: { items: [{ heading: 'x' }] }, right: { items: [] } })]);
        expect(r.findings.filter(f => f.kind === 'exhibit_underfilled')).toHaveLength(0);
    });
});

describe('variety within the deck', () => {
    it('flags one archetype used three times', () => {
        const r = evaluateDeckQuality([
            slide('slides:cover', {}, 'a'),
            slide('slides:numbered-themes', { items: [1, 2, 3, 4] }, 'b'),
            slide('slides:numbered-themes', { items: [1, 2, 3, 4] }, 'c'),
            slide('slides:numbered-themes', { items: [1, 2, 3, 4] }, 'd'),
        ]);
        expect(r.findings.some(f => f.kind === 'archetype_monotony' && /used 3 times/.test(f.detail))).toBe(true);
    });

    it('flags a five-slide deck built from fewer than five archetypes', () => {
        const r = evaluateDeckQuality([
            slide('slides:cover', {}, 'a'),
            slide('slides:block-quote', {}, 'b'),
            slide('slides:block-quote', {}, 'c'),
            slide('slides:section-divider', {}, 'd'),
            slide('slides:thesis-interstitial', {}, 'e'),
        ]);
        expect(r.distinctArchetypes).toBe(4);
        expect(r.findings.some(f => /at least 5/.test(f.detail))).toBe(true);
    });

    it('flags a deck that is mostly cover, agenda and dividers', () => {
        const r = evaluateDeckQuality([
            slide('slides:cover', {}, 'a'),
            slide('slides:agenda', {}, 'b'),
            slide('slides:section-divider', {}, 'c'),
            slide('slides:block-quote', {}, 'd'),
        ]);
        expect(r.contentRatio).toBe(0.25);
        expect(r.findings.some(f => f.kind === 'connective_heavy')).toBe(true);
    });

    it('does not judge variety on a deck too short for it to mean anything', () => {
        const r = evaluateDeckQuality([slide('slides:cover', {}, 'a'), slide('slides:block-quote', {}, 'b')]);
        expect(r.findings.some(f => f.kind === 'archetype_monotony')).toBe(false);
        expect(r.findings.some(f => f.kind === 'connective_heavy')).toBe(false);
    });
});

describe('cross-deck convergence', () => {
    const deck = [
        slide('slides:cover', {}, 'a'),
        slide('slides:flow-arc', { steps: [1, 2, 3] }, 'b'),
        slide('slides:evidence-table', { rows: [1, 2, 3] }, 'c'),
        slide('slides:role-recommendation', {}, 'd'),
    ];

    it('flags a deck shaped exactly like the previous one', () => {
        const prev = ['slides:cover', 'slides:flow-arc', 'slides:evidence-table', 'slides:role-recommendation'];
        const r = evaluateDeckQuality(deck, { previousSequence: prev });
        expect(r.findings.some(f => f.kind === 'sequence_repeat')).toBe(true);
    });

    it('does not flag a deck that opens differently', () => {
        const prev = ['slides:cover', 'slides:stat-row', 'slides:quadrant', 'slides:role-recommendation'];
        const r = evaluateDeckQuality(deck, { previousSequence: prev });
        expect(r.findings.some(f => f.kind === 'sequence_repeat')).toBe(false);
    });

    it('does not flag the first deck in an engagement', () => {
        expect(evaluateDeckQuality(deck).findings.some(f => f.kind === 'sequence_repeat')).toBe(false);
    });
});

describe('sequence memory', () => {
    beforeEach(() => noteDeckSequence('slug-x', []));

    it('remembers per engagement and returns empty for an unknown one', () => {
        noteDeckSequence('slug-a', ['slides:cover', 'slides:stat-row']);
        expect(previousDeckSequence('slug-a')).toEqual(['slides:cover', 'slides:stat-row']);
        expect(previousDeckSequence('slug-unknown')).toEqual([]);
    });
});

describe('repair instruction', () => {
    it('names the slide, the shortfall and the fix, and forbids padding', () => {
        const r = evaluateDeckQuality([slide('slides:ranked-bars', { bars: [{ label: 'a' }] })]);
        const instr = buildDeckQualityInstruction(r);
        expect(instr).toMatch(/DECK QUALITY REVISION/);
        expect(instr).toMatch(/slides:ranked-bars/);
        expect(instr).toMatch(/never by padding with invented data/);
    });

    it('is empty for a well-shaped deck', () => {
        const r = evaluateDeckQuality([
            slide('slides:cover', {}, 'a'),
            slide('slides:flow-arc', { steps: [1, 2, 3] }, 'b'),
            slide('slides:evidence-table', { rows: [1, 2, 3] }, 'c'),
            slide('slides:stat-row', { stats: [1, 2, 3] }, 'd'),
            slide('slides:role-recommendation', {}, 'e'),
        ]);
        expect(r.pass).toBe(true);
        expect(buildDeckQualityInstruction(r)).toBe('');
    });
});
