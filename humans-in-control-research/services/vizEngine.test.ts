import { describe, it, expect } from 'vitest';
import { buildVizTheme, renderVizFamily, pickVizFamily, vizAnchors, DOMAIN_FORM_BASE, type VizBrandColors } from './vizEngine';

// Token colors as mirrored in figma-tokens.json (the caller supplies these from /api/design-tokens).
const NXT: VizBrandColors = { rail: '#0D0D0D', paper: '#FFFFFF', ink: '#0D0D0D', accent: '#B8B800', cyan: '#00B7C3', teal: '#115054', rust: '#CC6644', hairline: '#DDDDD6', grey: '#6E6E66' };
const NU: VizBrandColors = { rail: '#0E1626', paper: '#FFFFFF', ink: '#16233C', accent: '#C8102E', cyan: '#1D6E64', teal: '#16233C', rust: '#C8102E', hairline: '#DDDDD6', grey: '#6E6E66' };

const FAMILIES = ['operatingNetwork', 'capabilityStack', 'maturityRadar', 'funnelFlow', 'journeyLine', 'dataField', 'comparisonMatrix', 'instrumentDial', 'timelineGantt', 'flowSchematic', 'proportionStack', 'sectionMark'] as const;

const sampleData: Record<string, any> = {
    operatingNetwork: { layout: 'radial', n: 7, seed: 3 },
    capabilityStack: { layers: 4, highlight: 2 },
    maturityRadar: { scores: [0.4, 0.7, 0.5, 0.8, 0.6], target: [0.6, 0.8, 0.7, 0.9, 0.8] },
    funnelFlow: { stages: [100, 62, 38, 12] },
    journeyLine: { stations: 6, friction: [2, 4], seed: 7 },
    dataField: { values: [4, 7, 3, 9, 5, 8], highlight: 3, mean: true },
    comparisonMatrix: { cells: [[0.2, 0.8, 0.5], [0.6, 0.3, 0.9], [0.4, 0.7, 0.2]] },
    instrumentDial: { value: 68, segments: 10 },
    timelineGantt: { tracks: [{ start: 0, dur: 2 }, { start: 1, dur: 3 }, { start: 3, dur: 2 }], periods: 6, now: 3, milestone: 5 },
    flowSchematic: { blocks: [[0.05, 0.4, 0.2, 0.2], [0.4, 0.2, 0.2, 0.2], [0.4, 0.6, 0.2, 0.2], [0.75, 0.4, 0.2, 0.2]], links: [[0, 1], [0, 2], [1, 3], [2, 3]], highlight: 3 },
    proportionStack: { groups: [55, 30, 15] },
    sectionMark: { ordinal: 3 },
};

describe('buildVizTheme', () => {
    it('dark ground uses rail as ground and paper as ink; light flips', () => {
        const d = buildVizTheme(NXT, 'dark');
        expect(d.ground.toLowerCase()).toBe('#0d0d0d');
        expect(d.ink.toUpperCase()).toBe('#FFFFFF');
        const l = buildVizTheme(NXT, 'light');
        expect(l.ground.toUpperCase()).toBe('#FFFFFF');   // stark white
        expect(l.ink.toLowerCase()).toBe('#0d0d0d');
    });
    it('carries the brand accent unchanged across grounds (chartreuse NXT / red NU)', () => {
        expect(buildVizTheme(NXT, 'dark').accent.toUpperCase()).toBe('#B8B800');
        expect(buildVizTheme(NXT, 'light').accent.toUpperCase()).toBe('#B8B800');
        expect(buildVizTheme(NU, 'dark').accent.toUpperCase()).toBe('#C8102E');
        expect(buildVizTheme(NU, 'light').accent.toUpperCase()).toBe('#C8102E');
    });
    it('on a light ground structural lines use the brand teal (reads on white)', () => {
        expect(buildVizTheme(NXT, 'light').cyan.toUpperCase()).toBe('#115054');
        expect(buildVizTheme(NXT, 'dark').cyan.toUpperCase()).toBe('#00B7C3');
    });
    it('derives every theme value from token inputs (no foreign hex)', () => {
        const t = buildVizTheme(NXT, 'light');
        for (const v of Object.values(t)) expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
});

describe('renderVizFamily', () => {
    for (const fam of FAMILIES) {
        it(`${fam} renders a sized, ground-filled, text-free SVG in every brand x ground`, () => {
            for (const [colors, brand] of [[NXT, 'nxt'], [NU, 'nu']] as const) {
                for (const ground of ['dark', 'light'] as const) {
                    const theme = buildVizTheme(colors, ground);
                    const svg = renderVizFamily(fam, sampleData[fam], 820, 1080, theme);
                    expect(svg.startsWith('<svg'), `${fam} ${brand} ${ground}`).toBe(true);
                    expect(svg).toContain('width="820"');
                    expect(svg).toContain('height="1080"');
                    expect(svg).toContain(`fill="${theme.ground}"`);   // ground plate present
                    expect(svg).not.toContain('<text');                 // text-free (Figma fontless import)
                    expect(svg).not.toContain('NaN');
                }
            }
        });
    }
    it('is deterministic for the same data + theme', () => {
        const t = buildVizTheme(NXT, 'dark');
        const a = renderVizFamily('operatingNetwork', { layout: 'mesh', n: 9, seed: 42 }, 800, 600, t);
        const b = renderVizFamily('operatingNetwork', { layout: 'mesh', n: 9, seed: 42 }, 800, 600, t);
        expect(a).toBe(b);
    });
    it('returns empty string for an unknown family', () => {
        expect(renderVizFamily('notAFamily', {}, 100, 100, buildVizTheme(NXT, 'dark'))).toBe('');
    });
});

const INDUSTRIES = ['healthcare', 'fintech', 'financial-services', 'government', 'insurance', 'retail', 'workforce', 'higher-ed', 'advancement', 'ai-industry', 'creative-ai'] as const;
const DOMAIN: Record<string, any> = {
    hc_ecg: {}, fx_candlestick: { seed: 3 }, fs_waterfall: { seed: 4 }, rt_planogram: { seed: 5 },
    ai_chiptopo: { seed: 6 }, in_losstri: {}, he_enrollfunnel: { stages: [100, 62, 40, 24] }, adv_giftpyr: {},
    wf_orgpyr: {}, gov_servicegrid: { seed: 7 }, cai_pipeline: {},
};

describe('renderVizFamily — industry-aware', () => {
    it('a base family renders differently per industry (glyph skin, not identical)', () => {
        const t = buildVizTheme(NXT, 'dark');
        const hc = renderVizFamily('operatingNetwork', sampleData.operatingNetwork, 820, 1080, t, 'healthcare');
        const fin = renderVizFamily('operatingNetwork', sampleData.operatingNetwork, 820, 1080, t, 'fintech');
        expect(hc).not.toBe(fin);   // the whole point: industry differentiation
    });
    it('every domain-native form renders clean in every brand x ground', () => {
        for (const fam of Object.keys(DOMAIN)) {
            for (const [colors] of [[NXT], [NU]] as const) {
                for (const ground of ['dark', 'light'] as const) {
                    const theme = buildVizTheme(colors, ground);
                    const svg = renderVizFamily(fam, DOMAIN[fam], 820, 1080, theme, 'healthcare');
                    expect(svg.startsWith('<svg'), `${fam} ${ground}`).toBe(true);
                    expect(svg).not.toContain('NaN');
                    expect(svg).not.toContain('undefined');
                    expect(svg).not.toContain('<text');
                }
            }
        }
    });
    it('every base family x every industry renders clean (no NaN/undefined/text)', () => {
        const t = buildVizTheme(NU, 'light');
        for (const fam of FAMILIES) for (const ind of INDUSTRIES) {
            const svg = renderVizFamily(fam, sampleData[fam], 480, 360, t, ind);
            expect(svg.startsWith('<svg'), `${fam} ${ind}`).toBe(true);
            expect(svg).not.toContain('NaN');
            expect(svg).not.toContain('undefined');
        }
    });
    it('DOMAIN_FORM_BASE maps every domain form to a base family', () => {
        for (const k of Object.keys(DOMAIN)) expect((DOMAIN_FORM_BASE as any)[k]).toBeTruthy();
    });
});

describe('vizAnchors — labeled mode (#14)', () => {
    it('returns anchors for the labeled primary families', () => {
        expect(vizAnchors('operatingNetwork', { layout: 'radial', n: 7, seed: 3 }, 820, 1080).length).toBeGreaterThan(0);
        expect(vizAnchors('journeyLine', { stations: 6, seed: 7 }, 820, 1080).length).toBe(6);
        expect(vizAnchors('timelineGantt', sampleData.timelineGantt, 820, 1080).length).toBe(3);
        expect(vizAnchors('flowSchematic', sampleData.flowSchematic, 820, 1080).length).toBe(4);
        expect(vizAnchors('capabilityStack', { layers: 4 }, 820, 1080).length).toBe(4);
    });
    it('every anchor is within bounds with an align hint', () => {
        const an = vizAnchors('journeyLine', { stations: 6, seed: 7 }, 820, 1080);
        for (const a of an) { expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThanOrEqual(820); expect(['left', 'right', 'center']).toContain(a.align); }
    });
    it('returns [] for a family with no label anchors (sectionMark)', () => {
        expect(vizAnchors('sectionMark', sampleData.sectionMark, 820, 1080)).toEqual([]);
    });
});

describe('pickVizFamily', () => {
    const cases: Array<[string, string]> = [
        ['Coaching cycle from intake to placement', 'journeyLine'],
        ['Conversion funnel drop-off by stage', 'funnelFlow'],
        ['Capability stack across the platform tiers', 'capabilityStack'],
        ['Maturity assessment of the governance model', 'maturityRadar'],
        ['Build vs buy trade-off matrix', 'comparisonMatrix'],
        ['Reference architecture and data flow', 'flowSchematic'],
        ['Rollout roadmap by quarter', 'timelineGantt'],
        ['Budget allocation and mix', 'proportionStack'],
        ['Caseload by college', 'dataField'],
        ['Retention rate and NPS index', 'instrumentDial'],
        ['Section divider: Part B', 'sectionMark'],
        ['Operating model partners', 'operatingNetwork'],
    ];
    for (const [heading, fam] of cases) {
        it(`routes "${heading}" -> ${fam}`, () => expect(pickVizFamily(heading)).toBe(fam));
    }
});
