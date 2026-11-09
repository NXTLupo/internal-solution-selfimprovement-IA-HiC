/** 2026-10-24: the layout gate's classifier and receipt (measurement itself needs a real layout engine). */
import { describe, it, expect } from 'vitest';
import { summarizeLayoutGate, hasLayoutFailure, readLastLayoutVerdict, noteLayoutVerdict, type SlideLayoutDefects } from './layoutGate';
import { tidyInlineSources } from './slideComposer';

const clean = (id: string): SlideLayoutDefects => ({ slideId: id, offCanvas: 0, clipped: 0, overlaps: 0, fragments: 0, deadSpace: 0.2, details: [] });
const bad = (id: string, details: string[]): SlideLayoutDefects => ({ slideId: id, offCanvas: 0, clipped: 1, overlaps: 1, fragments: 0, deadSpace: 0.2, details });

describe('layoutGate', () => {
    it('classifies clean, repaired and open slides into one receipt line', () => {
        const r = summarizeLayoutGate([
            { slideId: 'a', before: clean('a') },
            { slideId: 'b', before: bad('b', ['overlap: "x" / "y"']), after: clean('b'), scale: 0.92 },
            { slideId: 'c', before: bad('c', ['clipped: "long cell"']), after: bad('c', ['clipped: "long cell"']), scale: 0.78 },
            { slideId: 'd', before: { ...clean('d'), fragments: 2, details: ['leaked citation fragment'] } },
        ]);
        expect(r.measured).toBe(4);
        expect(r.clean).toBe(2);
        expect(r.repaired).toEqual([{ slideId: 'b', scale: 0.92 }]);
        expect(r.open.map(o => o.slideId)).toEqual(['c']);
        expect(r.fragments).toEqual(['d']);
        expect(r.line).toBe('Layout check: 4 slides measured; 2 clean; 1 repaired by a type step-down; 1 still open (clipped: "long cell"); citation fragments on 1 slide(s).');
        expect(hasLayoutFailure(clean('z'))).toBe(false);
        noteLayoutVerdict(r);
        expect(readLastLayoutVerdict()?.line).toBe(r.line);
    });
    it('raw manifest pointers never survive into a rendered string', () => {
        const t = tidyInlineSources({ title: 'x', body: 'I managed to land 1 interview (Source: Reddit Deep: r/neu) [articles/reddit-deep-r-neu/9909bde02a.md#c0].' });
        expect(t.body).toBe('I managed to land 1 interview.');
        expect(t.sourceLine).toBe('Source: Reddit r/neu');
    });
});
