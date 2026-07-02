// PROOF of MEANING: the same families, but with model-authored labels + real links, rendered
// LABELED. Compare to the decorative unlabeled exemplars. Token-pure theme from the brand mirror.
import { writeFileSync } from 'node:fs';
import { buildVizTheme, renderVizLabeled, type VizBrandColors } from '../../services/vizEngine.ts';

const NXT: VizBrandColors = { rail: '#0D0D0D', paper: '#FFFFFF', ink: '#0D0D0D', accent: '#B8B800', cyan: '#00B7C3', teal: '#115054', rust: '#CC6644', hairline: '#DDDDD6', grey: '#6E6E66' };
const theme = buildVizTheme(NXT, 'dark');
const FONT = 'Archivo, sans-serif';

// each = [title, family, industry, data-with-authored-meaning]
const cases: Array<[string, string, string, any]> = [
    ['Advancement operating model', 'operatingNetwork', 'advancement',
        { hub: 'Shared donor record', labels: ['Shared donor record', 'Gift Officers', 'Annual Giving', 'Major Gifts', 'Planned Giving', 'Stewardship', 'Prospect Research'], links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [6, 3]], seed: 1 }],
    ['Moves-management pipeline', 'funnelFlow', 'advancement',
        { stages: [100, 60, 38, 22, 12], labels: ['Identify', 'Qualify', 'Cultivate', 'Solicit', 'Steward'], seed: 2 }],
    ['Gift pyramid by tier', 'adv_giftpyr', 'advancement',
        { labels: ['Principal', 'Major', 'Mid-level', 'Annual'], seed: 3 }],
    ['Campaign phase roadmap', 'timelineGantt', 'advancement',
        { tracks: [{ start: 0, dur: 2 }, { start: 1, dur: 2 }, { start: 3, dur: 2 }, { start: 5, dur: 1 }], periods: 6, now: 3, milestone: 4, labels: ['Quiet phase', 'Leadership', 'Public launch', 'Celebration'], seed: 4 }],
    ['Donor lifecycle journey', 'journeyLine', 'advancement',
        { stations: 5, friction: [2], labels: ['Acquire', 'Onboard', 'Renew', 'Upgrade', 'Steward'], seed: 5 }],
    ['Advancement maturity vs target', 'maturityRadar', 'advancement',
        { scores: [0.5, 0.4, 0.6, 0.45, 0.35], target: [0.85, 0.8, 0.9, 0.8, 0.75], labels: ['Data', 'Stewardship', 'Pipeline', 'Analytics', 'Donor CX'], seed: 6 }],
    ['Care delivery operating model', 'operatingNetwork', 'healthcare',
        { hub: 'Patient record', labels: ['Patient record', 'Primary Care', 'Specialty', 'Payer', 'Pharmacy', 'Care Mgmt', 'Post-acute'], links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 2], [5, 6]], seed: 7 }],
    ['Patient care pathway', 'journeyLine', 'healthcare',
        { stations: 5, friction: [1, 3], labels: ['Symptom', 'Diagnosis', 'Treatment', 'Follow-up', 'Recovery'], seed: 8 }],
    ['Embedded-finance capability stack', 'capabilityStack', 'fintech',
        { layers: 5, highlight: 2, labels: ['Ledger', 'Payments', 'KYC / Risk', 'Orchestration', 'Experience'], seed: 9 }],
];

let cells = '';
for (const [title, family, industry, data] of cases) {
    const svg = renderVizLabeled(family, data, 720, 540, theme, industry, FONT);
    cells += `<figure><figcaption>${title} <span>${family} · ${industry}</span></figcaption><div class="f">${svg}</div></figure>`;
}
writeFileSync('scripts/eval/_viz_meaning.html', `<meta charset="utf-8"><style>
body{margin:0;background:#777;font:12px Archivo,system-ui}
h1{color:#fff;padding:14px}
.grid{display:flex;flex-wrap:wrap;gap:12px;padding:12px}
figure{margin:0;background:#0D0D0D;border:1px solid #333}
figcaption{color:#fff;font-weight:700;padding:6px 8px;font-size:12px}
figcaption span{color:#888;font-weight:400;font-size:10px}
.f svg{width:720px;height:auto;display:block}
</style><h1>MEANINGFUL viz — authored labels + real links (vs the decorative unlabeled exemplars)</h1><div class="grid">${cells}</div>`);
console.log('wrote scripts/eval/_viz_meaning.html', cases.length, 'meaningful viz');
