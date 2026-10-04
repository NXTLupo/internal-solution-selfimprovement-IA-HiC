/**
 * E3.2. The recap composition, and the gate the plan made a precondition of it.
 *
 * The refusal cases carry the weight. A render bakes copy into pixels and a pixel has no
 * repair path, so a beat that trips the lexicon must not be rendered at all. Every other
 * gate in HiC can hand a bad sentence back; this one is the end of the line.
 */
import { describe, it, expect } from 'vitest';
import { buildRecapBeats, buildRecapComposition } from './recapComposition';

const CLEAN = {
    objective: 'Assess how AI is changing retained executive search delivery, and which changes a mid-size firm can adopt first.',
    thesis: 'Enrichment reaches the research phase before it reaches assessment',
    sources: ['Clockwork', 'Recruiterflow', 'Reddit r/consulting'],
    recommendation: 'Sequence adoption where feasibility is highest and keep partner judgment at the finalist stage',
    brand: 'nxt' as const,
};

describe('buildRecapBeats', () => {
    it('builds one beat per thing the run actually recorded', () => {
        const beats = buildRecapBeats(CLEAN);
        expect(beats.map(b => b.step)).toEqual([
            '01 / Objective', '02 / What the evidence says', '03 / Where it came from', '04 / What follows',
        ]);
    });

    it('OMITS the thesis beat when the run recorded no thesis, rather than inventing one', () => {
        const beats = buildRecapBeats({ ...CLEAN, thesis: null });
        expect(beats.some(b => b.step.includes('evidence says'))).toBe(false);
        expect(beats.length).toBe(3);
    });

    it('strips a manifest pointer: a viewer cannot open a file path, and should never see one', () => {
        const beats = buildRecapBeats({
            ...CLEAN,
            thesis: 'Enrichment reaches research first [articles/exs-clockwork/63e5475889.md#c1]',
        });
        const line = beats.find(b => b.step.includes('evidence says'))!.line;
        expect(line).not.toMatch(/\.md#c\d+/);
        expect(line).toContain('Enrichment reaches research first');
    });

    it('removes an em-dash before it can become a pixel', () => {
        const beats = buildRecapBeats({ ...CLEAN, recommendation: 'Adopt enrichment first — keep the finalist call' });
        expect(beats.find(b => b.step.includes('What follows'))!.line).not.toContain('—');
    });

    it('drops a source list that holds nothing usable', () => {
        const beats = buildRecapBeats({ ...CLEAN, sources: ['', '  '] });
        expect(beats.some(b => b.step.includes('Where it came from'))).toBe(false);
    });
});

describe('buildRecapComposition', () => {
    it('composes a renderable timeline for a clean run', () => {
        const out = buildRecapComposition(CLEAN);
        expect(out.refusals).toEqual([]);
        expect(out.html).toBeTruthy();
        expect(out.html!).toContain('data-composition-id="hic-recap"');
        expect(out.html!).toContain('window.__timelines["hic-recap"]');
        expect(out.html!).toMatch(/data-duration="2[0-9](\.\d+)?"/);
    });

    it('REFUSES to render a beat carrying a banned phrase, because a pixel cannot be repaired', () => {
        const banned = ['compre', 'hensive'].join('');
        const out = buildRecapComposition({ ...CLEAN, recommendation: `Adopt a ${banned} approach to reporting` });
        expect(out.html).toBeNull();
        expect(out.refusals.join(' ')).toMatch(/cannot be repaired once it is a pixel/);
    });

    it('REFUSES a run too thin to recap, rather than rendering one sentence', () => {
        const out = buildRecapComposition({ objective: 'Look at things', sources: [], thesis: null, recommendation: null });
        expect(out.html).toBeNull();
        expect(out.refusals.join(' ')).toMatch(/fewer than two usable beats/);
    });

    it('escapes markup in run text, so a quote cannot break the composition', () => {
        const out = buildRecapComposition({ ...CLEAN, thesis: 'Firms use <script>alert(1)</script> tooling widely' });
        expect(out.html!).not.toContain('<script>alert');
        expect(out.html!).toContain('&lt;script&gt;');
    });

    it('flips brand by token, never by a separate design', () => {
        const nxt = buildRecapComposition(CLEAN).html!;
        const nu = buildRecapComposition({ ...CLEAN, brand: 'nu' }).html!;
        expect(nxt).toContain('#B8B800');
        expect(nu).toContain('#C8102E');
        // Same structure either way: one composition, two token sets.
        expect(nu).toContain('data-composition-id="hic-recap"');
        // 2026-10-01 - third brand: DECIEM pink accent + Poppins, never the NXT fallback
        const deciem = buildRecapComposition({ ...CLEAN, brand: 'deciem' }).html!;
        expect(deciem).toContain('#FB48C4');
        expect(deciem).toContain('Poppins');
        expect(deciem).not.toContain('#B8B800');
        expect(deciem).toContain('data-composition-id="hic-recap"');
    });

    it('carries no em-dash anywhere in the emitted composition', () => {
        expect(buildRecapComposition(CLEAN).html!).not.toContain('—');
    });
});
