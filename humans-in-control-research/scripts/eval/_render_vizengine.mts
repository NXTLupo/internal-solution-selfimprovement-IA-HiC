// Render harness for services/vizEngine.ts — proves the runtime engine across brand x ground.
// Run: npx vite-node scripts/eval/_render_vizengine.mts   (from humans-in-control-research/)
import { writeFileSync } from 'node:fs';
import { buildVizTheme, renderVizFamily, type VizBrandColors } from '../../services/vizEngine.ts';

const NXT: VizBrandColors = { rail: '#0D0D0D', paper: '#FFFFFF', ink: '#0D0D0D', accent: '#B8B800', cyan: '#00B7C3', teal: '#115054', rust: '#CC6644', hairline: '#DDDDD6', grey: '#6E6E66' };
const NU: VizBrandColors = { rail: '#0E1626', paper: '#FFFFFF', ink: '#16233C', accent: '#C8102E', cyan: '#1D6E64', teal: '#16233C', rust: '#C8102E', hairline: '#DDDDD6', grey: '#6E6E66' };

const data: Record<string, any> = {
    operatingNetwork: { layout: 'radial', n: 7, seed: 3 },
    capabilityStack: { layers: 4, highlight: 2 },
    maturityRadar: { scores: [0.4, 0.7, 0.5, 0.8, 0.6], target: [0.6, 0.85, 0.7, 0.9, 0.8] },
    funnelFlow: { stages: [100, 62, 38, 12] },
    journeyLine: { stations: 6, friction: [2, 4], seed: 7 },
    dataField: { values: [4, 7, 3, 9, 5, 8], highlight: 3, mean: true },
    comparisonMatrix: { cells: [[0.2, 0.8, 0.5], [0.6, 0.3, 0.9], [0.4, 0.7, 0.2]] },
    instrumentDial: { value: 68, segments: 10 },
    timelineGantt: { tracks: [{ start: 0, dur: 2 }, { start: 1, dur: 3 }, { start: 3, dur: 2 }], periods: 6, now: 3, milestone: 5 },
    flowSchematic: { blocks: [[0.05, 0.4, 0.2, 0.2], [0.4, 0.18, 0.2, 0.2], [0.4, 0.62, 0.2, 0.2], [0.75, 0.4, 0.2, 0.2]], links: [[0, 1], [0, 2], [1, 3], [2, 3]], highlight: 3 },
    proportionStack: { groups: [55, 30, 15] },
    sectionMark: { ordinal: 3 },
};
const families = Object.keys(data);
const themes: Array<[string, VizBrandColors, 'dark' | 'light']> = [
    ['NXT dark', NXT, 'dark'], ['NXT light (stark white)', NXT, 'light'],
    ['NU dark', NU, 'dark'], ['NU light (stark white)', NU, 'light'],
];

let html = `<style>body{margin:0;background:#888;font:12px system-ui}h2{color:#fff;padding:12px 8px 4px;margin:0}.row{display:flex;flex-wrap:wrap;gap:8px;padding:8px}.c{width:200px}.c .lbl{color:#fff;font-size:10px;padding:2px}.c .f{width:200px;height:264px;overflow:hidden}.c svg{width:200px;height:auto}</style>`;
for (const [label, colors, ground] of themes) {
    const theme = buildVizTheme(colors, ground);
    html += `<h2>${label}</h2><div class="row">`;
    for (const fam of families) {
        const svg = renderVizFamily(fam, data[fam], 410, 540, theme);
        html += `<div class="c"><div class="lbl">${fam}</div><div class="f">${svg}</div></div>`;
    }
    html += `</div>`;
}
writeFileSync('scripts/eval/_viz_gallery.html', html);
console.log('wrote scripts/eval/_viz_gallery.html', families.length, 'families x', themes.length, 'themes');
