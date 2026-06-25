// 2026-06-25 - P1 gate: render NU slides-system interstitials with the new per-brand
// deck scale (hydrated live from /api/design-tokens) + an NXT control. Run: npx vite-node scripts/eval/_render_nu_typefix.mts
import { hydrateTokensFromFigma } from '../../components/slideTemplates/types';
import { getBrand } from '../../components/slideTemplates/brands';
import { slideDataToStageHtml } from '../../services/slideToStageHtml';
import * as fs from 'fs';
import * as path from 'path';

const OUT = process.env.NU_FIX_OUT || '.';

async function main() {
  // hydrate NU first, NXT last (so global SCALE ends on NXT; per-brand TYPE_SCALE is correct either way)
  const nuOk = await hydrateTokensFromFigma('NU', getBrand('nu') as any);
  const nxtOk = await hydrateTokensFromFigma('NXT');
  const longTitle = 'APPROACH & FINDINGS: EMERGING THEMES';
  // a stand-in flat-vector illustration (single-line + off-register brand shape) to prove the
  // hero-panel carrier renders content-left + panel-right (the real illustrator output replaces this).
  const heroSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 820 1080'><circle cx='430' cy='520' r='230' fill='none' stroke='%23C8102E' stroke-width='10'/><path d='M120 220 Q430 520 720 900' fill='none' stroke='%23FFFFFF' stroke-width='8'/><rect x='300' y='760' width='180' height='180' fill='%23C8102E' opacity='0.85'/></svg>";
  const heroImage = 'data:image/svg+xml,' + heroSvg.replace(/#/g, '%23');
  const slides: Array<{ name: string; slide: any }> = [
    { name: 'nu-section-divider', slide: { template: 'slides:section-divider', brand: 'nu', composerPayload: { number: '01', title: longTitle, supporting: 'What we have learned from your team so far' } } },
    { name: 'nxt-section-divider', slide: { template: 'slides:section-divider', brand: 'nxt', composerPayload: { number: '01', title: longTitle, supporting: 'What we have learned from your team so far' } } },
    { name: 'nu-thesis', slide: { template: 'slides:thesis-interstitial', brand: 'nu', composerPayload: { kicker: 'THE CORE TENSION', thesis: 'THESE CHALLENGES ARE FAMILIAR AND PERSISTENT.' } } },
    { name: 'nu-cover', slide: { template: 'slides:cover', brand: 'nu', composerPayload: { title: 'ADVANCEMENT IN THE AGE OF AI', subtitle: 'A strategic outlook for 2026' } } },
    { name: 'nu-statrow-dense', slide: { template: 'stat-row', brand: 'nu', title: 'Donors are migrating off the owned channel', statRow: {
        stats: [
          { value: 'OFF-CHANNEL', label: 'Where most gifts arrive', means: 'Mobile + social, not the portal', source: 'Client Uploads' },
          { value: 'QUARTERLY', label: 'Reporting cadence', means: 'Manual rollups consume the team', source: 'Client Uploads' },
          { value: 'FRAGMENTED', label: 'Donor record state', means: 'Migration left data unreliable', source: 'Client Uploads' },
          { value: 'MANUAL', label: 'Prospecting today', means: 'No validated lookalike pipeline', source: 'Client Uploads' },
        ], convergentInsight: 'Giving has moved off the owned channel while the team is stuck in manual reporting.', patternSignal: 'CONVERGENT ACROSS THREE SOURCE TYPES' } } },
    { name: 'nu-section-divider-hero', slide: { template: 'slides:section-divider', brand: 'nu', composerPayload: { number: '01', title: longTitle, supporting: 'What we have learned from your team so far', heroImage } } },
  ];
  const written: string[] = [];
  for (const { name, slide } of slides) {
    const html = slideDataToStageHtml(slide as any);
    const fp = path.join(OUT, `nutypefix-${name}.html`);
    fs.writeFileSync(fp, html, 'utf-8');
    written.push(fp);
  }
  console.log(JSON.stringify({ nuOk, nxtOk, nuHero: (getBrand('nu') as any).TYPE_SCALE?.hero, written }, null, 2));
}
main();
