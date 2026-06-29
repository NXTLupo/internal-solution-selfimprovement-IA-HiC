import { describe, it, expect } from 'vitest';
import { attachViz, VIZ_PANEL_ARCHETYPES } from './vizSlot';
import { composeSlide } from './slideComposer';

describe('attachViz -> composeSlide (end-to-end runtime wiring #13)', () => {
    it('attaches a viz data-URI to a panel archetype and the composer renders it as an <img>', () => {
        const base = { kicker: 'SECTION', title: 'Operating model', heading: 'Operating model' };
        const enriched = attachViz(base, { archetype: 'cover', brand: 'nxt', ground: 'dark', artifact: 'org', industry: 'healthcare', heading: 'Operating model' });
        expect(typeof enriched.heroImage).toBe('string');
        expect(enriched.heroImage.startsWith('data:image/svg+xml;base64,')).toBe(true);
        const html = composeSlide('cover', enriched, 'nxt');
        expect(html, 'composeSlide returned null').toBeTruthy();
        expect(html!).toContain('<img');
        expect(html!).toContain('data:image/svg+xml;base64,');
    });

    it('does NOT attach on a non-panel archetype (collision-safe: only reserved slots)', () => {
        const base = { title: 'x' };
        const out = attachViz(base, { archetype: 'stat-row', brand: 'nxt', artifact: 'themes', industry: 'fintech', heading: 'x' });
        expect(out).toBe(base);            // unchanged reference
        expect((out as any).heroImage).toBeUndefined();
    });

    it('respects existing heroImage art (never overwrites the illustrator slot)', () => {
        const base = { heroImage: 'data:image/png;base64,EXISTING' };
        const out = attachViz(base, { archetype: 'cover', brand: 'nxt', artifact: 'org', industry: 'retail', heading: 'x' });
        expect(out.heroImage).toBe('data:image/png;base64,EXISTING');
    });

    it('all VIZ_PANEL_ARCHETYPES are accepted by the composer HERO_PANEL', () => {
        for (const a of VIZ_PANEL_ARCHETYPES) {
            const enriched = attachViz({ title: 'T', heading: 'Roadmap' }, { archetype: a, brand: 'nu', ground: 'light', artifact: 'roadmap', industry: 'government', heading: 'Roadmap' });
            const html = composeSlide(a, enriched, 'nu');
            if (html) expect(html).toContain('data:image/svg+xml;base64,');
        }
    });
});
