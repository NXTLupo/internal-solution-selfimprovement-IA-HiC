/** 2026-10-25: a reopened session must show the PROCESSED deck (images, flowchart, repaired text), not a raw re-lift. */
import { describe, it, expect } from 'vitest';
import { adoptDurableSlides, slideBatchKey, subscribeDurableArtifacts, projectDurableArtifacts } from './sessionService';

const processed = [
    { id: 'a1', timestamp: 100, model: 'claude-opus-5-5', composerPayload: { title: 'Repaired title', backgroundImage: 'data:image/png;base64,AAA' } },
    { id: 'a2', timestamp: 100, model: 'claude-opus-5-5', composerPayload: { title: 'Flow', exhibitImage: 'data:image/png;base64,BBB' } },
];
const relifted = [
    { id: 'r1', timestamp: 100, model: 'claude-opus-5-5', _relifted: true, composerPayload: { title: 'Raw title' } },
    { id: 'r2', timestamp: 100, model: 'claude-opus-5-5', _relifted: true, composerPayload: { title: 'Flow' } },
];
const other = { id: 'o1', timestamp: 50, model: 'claude-opus-5-5', composerPayload: { title: 'Earlier deck' } };

describe('durable slide adoption', () => {
    it('replaces a raw re-lift of the same reply with the processed deck, in order', () => {
        const out = adoptDurableSlides([other, ...relifted] as any[], processed as any[]);
        expect(out.map((s: any) => s.id)).toEqual(['o1', 'a1', 'a2']);
        expect((out[1] as any).composerPayload.backgroundImage).toBeTruthy();
    });
    it('returns prev by reference when nothing needs replacing (no projection loop)', () => {
        const prev = [other, ...processed] as any[];
        expect(adoptDurableSlides(prev, processed as any[])).toBe(prev);
        expect(adoptDurableSlides([] as any[], processed as any[])).toBe(processed);
    });
    it('a new subscriber is handed the current projection', () => {
        projectDurableArtifacts({ slides: processed as any[] });
        let got: any = null;
        const off = subscribeDurableArtifacts(d => { got = d; });
        off();
        expect(got?.slides?.length).toBe(2);
        expect(slideBatchKey(processed[0])).toBe('100|claude-opus-5-5');
    });
});
