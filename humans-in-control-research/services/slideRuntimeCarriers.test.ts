/**
 * 2026-10-20: a later pass that replaces a slide must not erase the imagery the runtime already attached, and
 * the imagery pass must not restore a stale payload over repaired text.
 */
import { describe, it, expect } from 'vitest';
import { mergeRuntimeImagery, withImageCarriers, imageCarriersOf } from './slideRuntimeCarriers';

describe('runtime image carriers survive slide replacement', () => {
    it('keeps the cover background and the diagram when the repair pass replaces the slide', () => {
        const prev: any = { id: 's1', template: 'slides:cover', title: 'Old', diagramImage: 'data:image/png;base64,AAA', composerPayload: { title: 'Old', backgroundImage: 'data:image/png;base64,BBB' } };
        const next: any = { id: 's1', template: 'slides:cover', title: 'Repaired', composerPayload: { title: 'Repaired' } };
        const out = mergeRuntimeImagery(prev, next);
        expect(out.title).toBe('Repaired');
        expect(out.composerPayload.title).toBe('Repaired');
        expect(out.composerPayload.backgroundImage).toBe('data:image/png;base64,BBB');
        expect(out.diagramImage).toBe('data:image/png;base64,AAA');
        expect(next.composerPayload).not.toHaveProperty('backgroundImage');
    });

    it('does not overwrite imagery the later pass already carries, and returns next untouched when nothing is missing', () => {
        const prev = { id: 's2', composerPayload: { itemImages: [{ image: 'old' }] } };
        const next = { id: 's2', composerPayload: { itemImages: [{ image: 'new' }] } };
        expect(mergeRuntimeImagery(prev, next)).toBe(next);
        expect(mergeRuntimeImagery(undefined, next)).toBe(next);
    });

    it('the imagery pass writes only its carriers onto the live slide, never the stale text', () => {
        const live: any = { id: 's3', composerPayload: { title: 'Repaired title', body: 'repaired' } };
        const staleProduced = { title: 'Old title', body: 'old', backgroundImage: 'data:image/png;base64,CCC', itemImages: [] };
        const out = withImageCarriers(live, 'composerPayload', staleProduced);
        expect(out.composerPayload.title).toBe('Repaired title');
        expect(out.composerPayload.backgroundImage).toBe('data:image/png;base64,CCC');
        expect(out.composerPayload).not.toHaveProperty('itemImages');
        expect(withImageCarriers(live, 'composerPayload', { title: 'x' })).toBe(live);
        expect(Object.keys(imageCarriersOf(null))).toEqual([]);
    });
});
