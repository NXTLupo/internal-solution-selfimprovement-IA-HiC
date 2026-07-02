// Visual proof of the wired result: attachViz -> composeSlide produces a real slide with the viz
// panel. Renders 4 composed slides (NXT dark / NU light x healthcare / fintech) to one HTML page.
import { writeFileSync } from 'node:fs';
import { attachViz } from '../../services/vizSlot.ts';
import { composeSlide } from '../../services/slideComposer.ts';

const cases: Array<[string, 'nxt' | 'nu', 'dark' | 'light', string, string, string, any]> = [
    ['Healthcare · org · NXT dark', 'nxt', 'dark', 'org', 'healthcare', 'Integrated care operating model', {}],
    ['Fintech · roadmap · NU light', 'nu', 'light', 'roadmap', 'fintech', 'Embedded-finance rollout roadmap', {}],
    ['Retail · competitive · NXT dark', 'nxt', 'dark', 'competitive', 'retail', 'Vendor scorecard', {}],
    ['Insurance · gap · NU light', 'nu', 'light', 'gap', 'insurance', 'Claims maturity vs target', {}],
];
let cells = '';
for (const [label, brand, ground, artifact, industry, heading, payload] of cases) {
    const arche = ground === 'light' ? 'thesis-interstitial' : 'section-divider';
    const enriched = attachViz({ kicker: industry.toUpperCase(), title: heading, heading, ...payload }, { archetype: arche, brand, ground, artifact, industry, heading });
    const html = composeSlide(arche, enriched, brand) || '<div>null</div>';
    cells += `<figure><figcaption>${label} — ${arche}</figcaption><div class="stage">${html}</div></figure>`;
}
const page = `<style>
body{margin:0;background:#888;font:12px system-ui}
figure{margin:0;padding:10px}
figcaption{color:#fff;font-weight:700;padding:4px 0}
.stage{width:960px;height:540px;overflow:hidden;outline:1px solid #444}
.stage > div, .stage svg, .stage [style*="1920"]{transform-origin:top left}
</style>${cells}
<script>
// the composed HTML is authored at 1920x1080; scale each stage child to fit the 960x540 box
for (const st of document.querySelectorAll('.stage')) {
  const k = st.firstElementChild; if(!k) continue;
  k.style.transformOrigin='top left'; k.style.transform='scale(0.5)';
}
</script>`;
writeFileSync('scripts/eval/_viz_wired.html', page);
console.log('wrote scripts/eval/_viz_wired.html', cases.length, 'composed slides');
