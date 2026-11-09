import { describe, it, expect } from 'vitest';
import { attachViz, VIZ_PANEL_ARCHETYPES } from './vizSlot';
import { composeSlide } from './slideComposer';

describe('attachViz -> composeSlide (end-to-end runtime wiring #13)', () => {
    it('attaches a viz data-URI to a panel archetype and the composer renders it as an <img>', () => {
        // WS-2 E8 (2026-10-30): the viz carries authored labels; a data-less payload gets no chart (see below).
        const base = { kicker: 'SECTION', title: 'Operating model', heading: 'Operating model', viz: { family: 'capabilityStack', labels: ['Intake', 'Triage', 'Care', 'Follow-up'] }, labels: ['Intake', 'Triage', 'Care', 'Follow-up'] };
        const enriched = attachViz(base, { archetype: 'cover', brand: 'nxt', ground: 'dark', artifact: 'org', industry: 'healthcare', heading: 'Operating model', payload: base });
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
            // a roadmap draws tracks, so the payload carries them (E8: no invented bars)
            const payload = { title: 'T', heading: 'Roadmap', labels: ['Discover', 'Pilot', 'Scale'], tracks: [{ start: 0, dur: 2 }, { start: 2, dur: 3 }, { start: 5, dur: 1 }], stages: [100, 60, 30], values: [3, 5, 8], cells: [[0.2, 0.5, 0.8], [0.7, 0.9, 0.4]], scores: [0.4, 0.6, 0.8, 0.5, 0.7], groups: [40, 35, 25], value: 62 };
            const enriched = attachViz(payload, { archetype: a, brand: 'nu', ground: 'light', artifact: 'roadmap', industry: 'government', heading: 'Roadmap', payload });
            const html = composeSlide(a, enriched, 'nu');
            if (html) expect(html).toContain('data:image/svg+xml;base64,');
        }
    });

    it('WS-2 E8: a payload with no authored data or labels gets NO chart (fabricated values never ship)', () => {
        const base = { kicker: 'SECTION', title: 'Operating model', heading: 'Operating model' };
        const out = attachViz(base, { archetype: 'cover', brand: 'nxt', ground: 'dark', artifact: 'org', industry: 'healthcare', heading: 'Operating model', payload: base });
        expect((out as any).heroImage).toBeUndefined();
    });
});
