import { describe, it, expect } from 'vitest';
import { renderVizSlot, selectVizFamily, buildVizData, vizBrandColors } from './vizSlot';
import { getBrand } from '../components/slideTemplates/brands';

describe('vizBrandColors — token-sourced, never hardcoded', () => {
    it('derives all 9 colors from the hydrated brand token object', () => {
        const c = vizBrandColors(getBrand('nxt'));
        for (const k of ['rail', 'paper', 'ink', 'accent', 'cyan', 'teal', 'rust', 'hairline', 'grey'] as const) {
            expect(c[k]).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });
    it('NXT vs NU produce different accent (proves brand flip flows through tokens)', () => {
        expect(vizBrandColors(getBrand('nxt')).accent).not.toBe(vizBrandColors(getBrand('nu')).accent);
    });
});

describe('selectVizFamily', () => {
    it('explicit family wins', () => {
        expect(selectVizFamily({ explicitFamily: 'maturityRadar', artifact: 'roadmap' })).toBe('maturityRadar');
    });
    it('industry domain-form is chosen when its base is apt for the artifact', () => {
        // healthcare hc_ecg (base instrumentDial) for audit (apt includes instrumentDial)
        expect(selectVizFamily({ artifact: 'audit', industry: 'healthcare' })).toBe('hc_ecg');
        // fintech fx_candlestick (base dataField) for themes (apt includes dataField)
        expect(selectVizFamily({ artifact: 'themes', industry: 'fintech' })).toBe('fx_candlestick');
        // retail rt_planogram (base comparisonMatrix) for competitive
        expect(selectVizFamily({ artifact: 'competitive', industry: 'retail' })).toBe('rt_planogram');
    });
    it('falls back to heading route constrained to the artifact apt set', () => {
        // roadmap apt = [timelineGantt, comparisonMatrix]; heading says roadmap -> timelineGantt
        expect(selectVizFamily({ artifact: 'roadmap', industry: 'workforce', heading: 'Rollout roadmap by quarter' })).toMatch(/timelineGantt|wf_orgpyr/);
    });
    it('defaults to operatingNetwork with no signal', () => {
        expect(selectVizFamily({})).toBe('operatingNetwork');
    });
});

describe('buildVizData — from REAL payload with safe fallbacks', () => {
    it('uses payload scores for a radar', () => {
        const d = buildVizData('maturityRadar', { scores: [0.3, 0.5, 0.7], target: [0.6, 0.8, 0.9] }, 'gap');
        expect(d.scores).toEqual([0.3, 0.5, 0.7]);
        d.target.forEach((t: number, i: number) => expect(t).toBeGreaterThanOrEqual(d.scores[i])); // target>=score
    });
    it('repairs a non-descending funnel and forces first=100', () => {
        const d = buildVizData('funnelFlow', { stages: [80, 90, 40] }, 'funnel');
        expect(d.stages[0]).toBe(100);
        for (let i = 1; i < d.stages.length; i++) expect(d.stages[i]).toBeLessThan(d.stages[i - 1]);
    });
    it('domain form reuses its base family data-shape (candlestick -> dataField values)', () => {
        const d = buildVizData('fx_candlestick', { values: [3, 6, 2, 8] }, 'take rate');
        expect(Array.isArray(d.values)).toBe(true);
    });
    it('is deterministic per heading (stable seed, no Math.random)', () => {
        const a = buildVizData('operatingNetwork', {}, 'Operating model');
        const b = buildVizData('operatingNetwork', {}, 'Operating model');
        expect(a).toEqual(b);
    });
});

describe('renderVizSlot — end to end', () => {
    it('produces an svg + an <img>-ready data-URI', () => {
        const r = renderVizSlot({ brand: 'nxt', ground: 'dark', artifact: 'competitive', industry: 'retail', heading: 'Vendor scorecard', payload: {} });
        expect(r.svg.startsWith('<svg')).toBe(true);
        expect(r.dataUri.startsWith('data:image/svg+xml;base64,')).toBe(true);
        expect(r.family).toBe('rt_planogram');
        expect(r.svg).not.toContain('<text');
    });
    it('a labeled primary returns collision-safe anchors + renders the authored labels (#14)', () => {
        const r = renderVizSlot({ brand: 'nxt', explicitFamily: 'journeyLine', industry: 'workforce', heading: 'Candidate journey', payload: { stations: 5, labels: ['Apply', 'Screen', 'Interview', 'Offer', 'Onboard'] } });
        expect(r.labeled).toBe(true);                       // has rendered labels = meaningful
        expect(r.anchors.length).toBeGreaterThan(0);
        r.anchors.forEach(a => expect(['left', 'right', 'center']).toContain(a.align));
        expect(r.svg).toContain('<text');                   // labels actually drawn
        expect(r.svg).toContain('Interview');               // the real authored name is on the diagram
    });
    it('without authored labels it renders the text-free vector (no fabricated meaning)', () => {
        const r = renderVizSlot({ brand: 'nxt', explicitFamily: 'journeyLine', industry: 'workforce', heading: 'x', payload: { stations: 5 } });
        expect(r.labeled).toBe(false);
        expect(r.svg).not.toContain('<text');
    });
    it('ground=light yields a stark-white plate (paper ground)', () => {
        const light = renderVizSlot({ brand: 'nxt', ground: 'light', artifact: 'audit', industry: 'healthcare', heading: 'index', payload: {} });
        const dark = renderVizSlot({ brand: 'nxt', ground: 'dark', artifact: 'audit', industry: 'healthcare', heading: 'index', payload: {} });
        expect(light.svg).not.toBe(dark.svg);
        expect(light.svg).toMatch(/fill="#[Ff]{6}"|fill="#fff"/i); // white ground rect
    });
    it('container-fit: a diagram in a PORTRAIT panel renders a centred landscape inner box (not stretched/cropped)', () => {
        const portrait = renderVizSlot({ brand: 'nxt', explicitFamily: 'operatingNetwork', heading: 'Operating model', payload: { labels: ['Hub', 'A', 'B', 'C'], links: [[0, 1], [0, 2], [0, 3]] }, w: 820, h: 1080 });
        expect(portrait.svg).toContain('width="820" height="1080"'); // outer = full container
        expect(portrait.svg).toContain('<svg x="');                  // nested, centred inner viz
        const landscape = renderVizSlot({ brand: 'nxt', explicitFamily: 'operatingNetwork', heading: 'Operating model', payload: { labels: ['Hub', 'A', 'B'], links: [[0, 1], [0, 2]] }, w: 480, h: 360 });
        expect(landscape.svg).not.toContain('<svg x="'); // landscape container renders 1:1, no nesting
    });
    it('allowedFamilies hard-constrains the family (thin banner -> horizontal flow only)', () => {
        const r = selectVizFamily({ artifact: 'strategy', heading: 'Operating network model', allowedFamilies: ['funnelFlow', 'journeyLine', 'flowSchematic'] });
        expect(['funnelFlow', 'journeyLine', 'flowSchematic']).toContain(r); // network NOT allowed -> forced into set
    });
    it('icons-in-diagrams: authored data.icons overlay tokenized glyphs at diagram anchors', () => {
        const r = renderVizSlot({ brand: 'nxt', explicitFamily: 'journeyLine', industry: 'workforce', heading: 'Candidate journey', payload: { stations: 5, labels: ['Apply', 'Screen', 'Interview', 'Offer', 'Onboard'], icons: ['people', 'search', 'decision', 'milestone', 'customer'] } });
        expect(r.svg).toContain('viz-node-icons');     // the overlay group is present
        const plain = renderVizSlot({ brand: 'nxt', explicitFamily: 'journeyLine', industry: 'workforce', heading: 'Candidate journey', payload: { stations: 5, labels: ['Apply', 'Screen', 'Interview', 'Offer', 'Onboard'] } });
        expect(plain.svg).not.toContain('viz-node-icons'); // opt-in: no icons -> unchanged
    });
    it('same content, different industry -> different svg (the differentiation requirement)', () => {
        const hc = renderVizSlot({ brand: 'nxt', artifact: 'org', industry: 'healthcare', heading: 'Operating model', payload: {} });
        const ret = renderVizSlot({ brand: 'nxt', artifact: 'org', industry: 'retail', heading: 'Operating model', payload: {} });
        expect(hc.svg).not.toBe(ret.svg);
    });
});

describe('no hardcoded brand hex in vizSlot source', () => {
    it('source contains no 6-digit hex literal', async () => {
        const fs = await import('node:fs');
        let src = '';
        for (const c of ['services/vizSlot.ts', 'humans-in-control-research/services/vizSlot.ts']) {
            try { src = fs.readFileSync(c, 'utf8'); break; } catch { /* try next */ }
        }
        expect(src.length, 'could not locate vizSlot.ts from cwd').toBeGreaterThan(0);
        const hex = src.match(/#[0-9a-fA-F]{6}\b/g) || [];
        expect(hex).toEqual([]);
    });
});
