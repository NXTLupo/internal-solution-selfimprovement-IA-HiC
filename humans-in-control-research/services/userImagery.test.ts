/** Multi-slot resolve (2026-08-14 owner bug: "regenerate does nothing with 3 authored"). */
import { describe, it, expect, vi, beforeEach } from 'vitest';
/**
 * E1.4 (2026-08-21). These four modules were pulled in with `await import()` INSIDE
 * the test bodies. `slideComposer` is a large module, so under CPU contention its
 * transform-and-load blew the default 5s per-test timeout and the archetype-coverage
 * test failed at 5015ms with nothing wrong in the assertion. The suite pins a
 * contract, so a test that fails only when the machine is busy is a hole in that
 * claim. Static imports move the load into collection, which the per-test timeout
 * does not bound, and the file gets faster as a side effect.
 */
import { resolveUserImageryForPayload, USER_IMAGE_SLOTS } from './userImagery';
import { archetypeKeys, composeSlide } from './slideComposer';

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ url: '/i/x.png' }) } as any)));
});

describe('resolveUserImageryForPayload - multiple authored slots', () => {
    it('resolves cover bg + quote panel + theme items in one pass', async () => {
        const cover: any = { title: 'T', _userImagery: { backgroundImage: { prompt: 'scene', style: 'realistic', authoredAt: 1 } } };
        const quote: any = { quote: 'Q', _userImagery: { panelImage: { prompt: 'scene 2', style: 'illustration', authoredAt: 1 } } };
        const themes: any = { items: [{ heading: 'A' }, { heading: 'B' }], _userImagery: { itemImages: { prompt: 'scenes', style: 'realistic', authoredAt: 1 } } };
        const r1 = await resolveUserImageryForPayload('slides:cover', cover, 'nxt');
        const r2 = await resolveUserImageryForPayload('slides:block-quote', quote, 'nxt');
        const r3 = await resolveUserImageryForPayload('slides:numbered-themes', themes, 'nxt');
        expect(r1.rendered).toBe(1); expect(cover.backgroundImage).toContain('x.png');
        expect(r2.rendered).toBe(1); expect(quote.panelImage).toContain('x.png');
        expect(r3.rendered).toBe(2); expect(themes.itemImages).toHaveLength(2);
    });
    it('a failing endpoint reports the slot, never throws', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false } as any)));
        const p: any = { title: 'T', _userImagery: { backgroundImage: { prompt: 'x', style: 'realistic', authoredAt: 1 } } };
        const r = await resolveUserImageryForPayload('slides:cover', p, 'nxt');
        expect(r.rendered).toBe(0);
        expect(r.failed).toContain('Cover scene');
    });
});

describe('universal slot coverage (owner mandate: every slide)', () => {
    it('every registered deck archetype has at least one authorable slot', async () => {
        for (const a of archetypeKeys()) {
            const key = `slides:${a}`;
            if (['screen-critique', 'screen-redesign', 'cover'].includes(a)) continue; // screens carry screenshots by contract
            expect(USER_IMAGE_SLOTS[key], key).toBeDefined();
            expect(USER_IMAGE_SLOTS[key].length, key).toBeGreaterThan(0);
        }
    });
    it('a header scene renders on evidence-table when authored + resolved', async () => {
        const p: any = { kicker: 'K', title: 'Named subjects compared', intro: 'i', columns: ['A','B','C','D'], rows: [{ subject: 'Zappos', prove: 'x', implication: 'y', evidenceGrade: 'A' }], takeaway: { label: 'L', statement: 'S' }, sourceLine: 's', _userImagery: { sceneImage: { prompt: 'scene', style: 'realistic', authoredAt: 1 } } };
        const r = await resolveUserImageryForPayload('slides:evidence-table', p, 'nxt');
        expect(r.rendered).toBe(1);
        const html = composeSlide('evidence-table', p, 'nxt')!;
        expect(html).toContain('x.png');
    });
});
