// Render ONE meaningful labeled viz to a standalone page (for rasterization into the PPTX demo).
import { writeFileSync } from 'node:fs';
import { buildVizTheme, renderVizLabeled, type VizBrandColors } from '../../services/vizEngine.ts';
const NXT: VizBrandColors = { rail: '#0D0D0D', paper: '#FFFFFF', ink: '#0D0D0D', accent: '#B8B800', cyan: '#00B7C3', teal: '#115054', rust: '#CC6644', hairline: '#DDDDD6', grey: '#6E6E66' };
const theme = buildVizTheme(NXT, 'dark');
const svg = renderVizLabeled('operatingNetwork', {
    hub: 'Shared donor record',
    labels: ['Shared donor record', 'Gift Officers', 'Annual Giving', 'Major Gifts', 'Planned Giving', 'Stewardship', 'Prospect Research'],
    links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [6, 3]], seed: 1,
}, 900, 650, theme, 'advancement', 'Archivo, Arial, sans-serif');
writeFileSync('scripts/eval/_viz_one.html', `<meta charset="utf-8"><style>body{margin:0;background:#0D0D0D}#v{width:900px;height:650px}#v svg{display:block}</style><div id="v">${svg}</div>`);
console.log('wrote _viz_one.html');
