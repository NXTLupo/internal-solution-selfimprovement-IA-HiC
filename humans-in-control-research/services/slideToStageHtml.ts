/**
 * slideToStageHtml.ts - STRUCTURAL FIX for the chat-preview vs PPTX size mismatch.
 *
 * 2026-06-05 - the prior gold-pipeline rewire assumed the chat-preview DOM
 * could be cloned + stretched to 1920×1080. It cannot. The chat tile is a
 * compact responsive card (~800-960px wide) with INNER font-sizes tuned for
 * that container. Stretching the outer bounding box doesn't change the
 * computed font-size that Playwright reads, so the gold exporter measured
 * 5-16pt text in a 1920×1080 stage. Result: tiny text floating in vast empty
 * space - the "complete disaster" the user reported.
 *
 * Structural answer: chat preview is ONE display target, PPTX export is
 * ANOTHER. Both consume the same SlideData. The chat preview keeps its
 * compact responsive layout (slideTemplates/web.tsx); THIS module emits a
 * fresh #stage 1920×1080 HTML doc with font-sizes designed for that stage.
 *
 * Why this is the right structural shape:
 *   - One data contract (SlideData), two renderers - same source of truth.
 *   - No DOM capture, no transform-scale hack, no chat-chrome leakage.
 *   - Brand tokens centralized; both renderers compose them.
 *   - New templates require ONE entry per renderer (web.tsx + here); no
 *     pptxgenjs-shaped third parallel that drifts.
 *
 * Coverage: the 6 templates the user exercised in the disaster report -
 * stat-row, theme-spotlight, block-quote, recommendation, timeline, plus a
 * generic fallback for templates not yet wired (the fallback emits the
 * title + raw JSON dump so the user can SEE what's there). Additional
 * templates ship as their callers expose them.
 *
 * The fallback is honest: no template = no fidelity claim. Better to ship
 * an obvious-stub slide than a corrupted-layout slide.
 */

// Permissive type alias - we read by-shape, not by-import, so this module
// doesn't pull the heavy slideTemplates/types.ts dependency tree.
export interface SlideDataLike {
    id?: string;
    template?: string;
    brand?: 'nxt' | 'nu';
    title?: string;
    subtitle?: string;
    sources?: string[];
    persona?: any;
    recommendation?: any;
    themeCluster?: any;
    matrix?: any;
    quote?: any;
    caseStudy?: any;
    principles?: any;
    statRow?: any;
    timeline?: any;
    sectionDivider?: any;
    serviceBlueprint?: any;
    gapMatrix?: any;
    architectureMap?: any;
    prdFeature?: any;
    systemsInventory?: any;
    journeyBrief?: any;
    body?: string;
    bullets?: string[];
}

// ---------------------------------------------------------------------------
// Brand tokens - kept inline for self-containment. Match the NXT design
// system (chartreuse + teal + Bebas + Archivo + JetBrains Mono) and NU
// (Huskies red + near-black + Spectral + Roboto + Roboto Mono).
// ---------------------------------------------------------------------------

type Brand = 'nxt' | 'nu';

interface BrandTokens {
    rail: string;
    paper: string;
    ink: string;
    accent: string;
    accent2: string;
    muted: string;
    hair: string;
    band: string;
    bandText: string;
    callout: string;
    displayFont: string;
    bodyFont: string;
    monoFont: string;
}

const NXT: BrandTokens = {
    rail: '#0D0D0D',
    paper: '#FFFFFF',
    ink: '#141414',
    accent: '#B8B800',  // chartreuse
    accent2: '#00B7C3', // cyan
    muted: '#525252',
    hair: '#E5E5DD',
    band: '#0D0D0D',
    bandText: '#F5F5F0',
    callout: '#F4F1D6',
    displayFont: "'Bebas Neue', sans-serif",
    bodyFont: "'Archivo', sans-serif",
    monoFont: "'JetBrains Mono', monospace",
};

const NU: BrandTokens = {
    rail: '#115054',
    paper: '#FFFFFF',
    ink: '#0D0D0D',
    accent: '#C8102E',  // huskies red
    accent2: '#115054', // deep teal
    muted: '#525252',
    hair: '#DDDDD6',
    band: '#115054',
    bandText: '#FFFFFF',
    callout: '#F4F1D6',
    displayFont: "'Spectral', serif",
    bodyFont: "'Roboto', sans-serif",
    monoFont: "'Roboto Mono', monospace",
};

function brandTokens(b?: Brand): BrandTokens {
    return b === 'nu' ? NU : NXT;
}

// ---------------------------------------------------------------------------
// Utility: HTML-escape strings so SlideData content can't accidentally
// inject tags.
// ---------------------------------------------------------------------------

function esc(s: string | number | undefined | null): string {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Shared shell - head with fonts + base #stage container + footer sources strip.
// ---------------------------------------------------------------------------

function buildShell(opts: {
    brand: Brand;
    title: string;
    bodyInnerHtml: string;
    sources?: string[];
    kicker?: string;
}): string {
    const T = brandTokens(opts.brand);
    const fontsHref = 'https://fonts.googleapis.com/css2'
        + '?family=Bebas+Neue'
        + '&family=Archivo:wght@200;300;400;500;700;900'
        + '&family=Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800'
        + '&family=Roboto:wght@300;400;500;600;700'
        + '&family=Roboto+Mono:wght@400;500;600'
        + '&family=JetBrains+Mono:wght@400;500;600'
        + '&display=swap';
    const sourcesStrip = (opts.sources && opts.sources.length > 0)
        ? `<div class="srcs">Sources: ${opts.sources.map(s => esc(s)).join('  ·  ')}</div>`
        : '';
    const kickerHtml = opts.kicker
        ? `<div class="kicker">${esc(opts.kicker)}</div>`
        : '';
    return `<!DOCTYPE html>
<html lang="en" data-brand="${opts.brand}">
<head>
<meta charset="UTF-8">
<title>${esc(opts.title || 'Slide')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsHref}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#080808;overflow:hidden}
#stage{position:absolute;width:1920px;height:1080px;background:${T.paper};font-family:${T.bodyFont};color:${T.ink};transform-origin:top left}
.rail{position:absolute;left:0;top:0;width:92px;height:100%;background:${T.rail}}
.brand{position:absolute;top:46px;right:80px;font-family:${T.monoFont};font-size:24px;letter-spacing:8px;color:${T.muted};text-transform:uppercase}
.canvas{position:absolute;left:140px;top:0;right:80px;bottom:0;padding:60px 0 56px 0;display:flex;flex-direction:column}
.kicker{font-family:${T.monoFont};font-size:30px;letter-spacing:6px;color:${T.accent2};text-transform:uppercase;margin-bottom:22px;font-weight:600}
h1{font-family:${T.displayFont};font-weight:600;letter-spacing:-0.5px;font-size:84px;line-height:1.05;color:${T.ink};margin-bottom:44px;max-width:1640px}
.srcs{position:absolute;left:140px;right:80px;bottom:34px;font-family:${T.monoFont};font-size:22px;letter-spacing:2px;color:${T.muted};border-top:2px solid ${T.hair};padding-top:18px;text-transform:uppercase}
/* 2026-06-05 - UNIVERSAL grid-overflow guards. Applies to every grid
 * container + every direct grid-item across all 18 templates so a long
 * unbreakable word or wide child element can't push the fr-track wider
 * than its allotted share. Root cause: grid items default to
 * min-width:auto / min-height:auto which lets content overflow the
 * track. This single rule prevents the column-overlap class observed
 * in the 2026-06-05 theme-spotlight.pptx export (primary column 7.88"
 * wide colliding with the supporting column at 7.96"). Adding
 * overflow:hidden + word-wrap as a belt-and-suspenders so even pathological
 * content can't break out. Targets every grid container by class so it
 * survives renderer additions; if a new template adds a new grid class,
 * add the class to this list.
 */
.stats,.cols,.sup,.sa,.gcells,.phases,.pcols,.goals,.csgrid,.pgrid,.sbgrid,.amlayer,.fgrid,.corr{min-height:0}
.stats>*,.cols>*,.sup>*,.sa>*,.gcells>*,.phases>*,.pcols>*,.goals>*,.csgrid>*,.pgrid>*,.sbgrid>*,.amlayer>*,.fgrid>*,.corr>*{min-width:0;overflow-wrap:break-word;word-wrap:break-word}
/* Hard-clip ANY content that would render below the 1080 stage bottom.
 * The exporter MEASURE script captures every text run regardless of
 * whether it's inside the visible area; this rule ensures the DOM itself
 * never renders below 1080 so the captured runs don't extend past slide
 * boundaries. */
#stage{overflow:hidden}
</style>
</head>
<body>
<div id="stage">
  <div class="rail"></div>
  <div class="brand">${opts.brand === 'nu' ? 'NORTHEASTERN' : 'NXT HUMANS'}</div>
  <div class="canvas">
${kickerHtml}
${opts.bodyInnerHtml}
  </div>
${sourcesStrip}
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// stat-row - three columns: value + label + means + matters + source
// ---------------------------------------------------------------------------

function renderStatRow(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.statRow || {};
    const stats: any[] = Array.isArray(data.stats) ? data.stats.slice(0, 3) : [];
    const insight: string = data.convergentInsight || '';
    const pattern: string = data.patternSignal || '';
    const cards = stats.map(s => `
      <div class="stat">
        <div class="sv">${esc(s.value)}</div>
        <div class="sl">${esc(s.label)}</div>
        <div class="sd">
          <div class="lbl">Means</div><div class="pp">${esc(s.meaning)}</div>
          <div class="lbl">Matters</div><div class="pp">${esc(s.matters)}</div>
        </div>
        <div class="src">${esc(s.source)}</div>
      </div>`).join('');
    const insightBlock = insight
        ? `<div class="insight">
             <div class="ilbl">CONVERGENT INSIGHT</div>
             <div class="itxt">${esc(insight)}</div>
             ${pattern ? `<div class="iptn"><span>PATTERN</span> ${esc(pattern)}</div>` : ''}
           </div>` : '';
    return `<style>
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-bottom:30px}
.stat{border-top:3px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:10px}
.stat .sv{font-family:${T.displayFont};font-weight:600;font-size:86px;line-height:1;color:${T.ink}}
.stat .sl{font-family:${T.bodyFont};font-size:33px;line-height:1.3;color:${T.ink}}
.stat .sd{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.stat .sd .lbl{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase}
.stat .sd .pp{font-size:28px;line-height:1.45;color:${T.ink}}
.stat .src{font-family:${T.monoFont};font-size:20px;letter-spacing:1px;color:${T.muted};margin-top:auto;text-transform:uppercase}
.insight{background:${T.callout};padding:22px 28px;border-left:4px solid ${T.accent}}
.insight .ilbl{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.accent2};text-transform:uppercase;margin-bottom:8px;font-weight:600}
.insight .itxt{font-size:33px;line-height:1.45;color:${T.ink}}
.insight .iptn{margin-top:10px;font-size:28px;line-height:1.45;color:${T.ink};border-top:1px solid ${T.hair};padding-top:10px}
.insight .iptn span{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<div class="stats">${cards}</div>
${insightBlock}`;
}

// ---------------------------------------------------------------------------
// theme-spotlight - N themes, primary surfaced as spotlight + supporting list
// ---------------------------------------------------------------------------

function renderThemeSpotlight(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.themeCluster || {};
    const themes: any[] = Array.isArray(data.themes) ? data.themes.slice(0, 4) : [];
    const patternSignal: string = data.patternSignal || '';
    if (themes.length === 0) return `<p style="font-size:33px">No theme data.</p>`;
    const primary = themes[0];
    const supporting = themes.slice(1);
    const supportingHtml = supporting.length > 0 ? `
      <div class="supporting">
        <div class="splbl">Supporting signals</div>
        ${supporting.map((t, i) => `
          <div class="sup">
            <div class="idx">${String(i + 2).padStart(2, '0')}</div>
            <div>
              <div class="sn">${esc(t.name)}</div>
              <div class="si">${esc(t.insight)}</div>
              ${t.evidence ? `<div class="se">&ldquo;${esc(t.evidence)}&rdquo;</div>` : ''}
              <div class="ss">${esc(t.source)}</div>
            </div>
          </div>`).join('')}
      </div>` : '';
    const patternBlock = patternSignal
        ? `<div class="pattern"><span>Pattern signal</span> ${esc(patternSignal)}</div>` : '';
    return `<style>
/* 2026-06-05 - Column-overlap fix observed in user's theme-spotlight.pptx
 * export: primary column boxes were 7.88" wide and bled into the 7.96"
 * supporting column. Root cause: CSS grid items default to min-width:auto
 * which lets content (long words / quote borders / etc.) push tracks
 * past their fr widths. Adding min-width:0 + overflow:hidden to each
 * grid item forces them to respect the 1.4fr 1fr ratio. min-height:0
 * on the grid itself + density reductions below let the whole thing
 * fit in the 1080 stage so the implication footer doesn't spill below
 * the slide. */
.cols{display:grid;grid-template-columns:1.4fr 1fr;gap:36px;flex:1;min-height:0;align-items:start}
.primary{border-left:4px solid ${T.accent};padding-left:22px;display:flex;flex-direction:column;gap:12px;min-width:0;overflow:hidden}
.primary .pidx{font-family:${T.monoFont};font-size:24px;letter-spacing:2px;color:${T.accent};text-transform:uppercase}
.primary .pname{font-family:${T.displayFont};font-weight:600;font-size:40px;line-height:1.1;color:${T.ink};word-wrap:break-word}
.primary .pinsight{font-size:32px;line-height:1.35;color:${T.ink};word-wrap:break-word}
.primary .pq{font-family:${T.bodyFont};font-size:28px;line-height:1.4;color:${T.ink};border-left:3px solid ${T.accent2};padding:8px 14px;background:${T.callout};font-style:italic;word-wrap:break-word}
.primary .pimp{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase}
.primary .pimp + div{font-size:26px;line-height:1.35;color:${T.ink};word-wrap:break-word}
.supporting{display:flex;flex-direction:column;gap:12px;min-width:0;overflow:hidden}
.splbl{font-family:${T.monoFont};font-size:22px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;border-bottom:1px solid ${T.hair};padding-bottom:8px}
.sup{display:grid;grid-template-columns:46px 1fr;gap:12px;min-width:0}
.sup > div:last-child{min-width:0;overflow:hidden}
.sup .idx{font-family:${T.displayFont};font-size:42px;color:${T.accent}}
.sup .sn{font-family:${T.bodyFont};font-weight:600;font-size:28px;color:${T.ink};margin-bottom:4px;word-wrap:break-word}
.sup .si{font-size:24px;line-height:1.35;color:${T.ink};margin-bottom:6px;word-wrap:break-word}
.sup .se{font-size:21px;font-style:italic;color:${T.muted};line-height:1.35;margin-bottom:4px;word-wrap:break-word}
.sup .ss{font-family:${T.monoFont};font-size:18px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.pattern{margin-top:14px;font-size:26px;line-height:1.4;color:${T.ink};background:${T.callout};padding:12px 18px;border-left:4px solid ${T.accent2}}
.pattern span{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<div class="cols">
  <div class="primary">
    <div class="pidx">01 · Primary theme</div>
    <div class="pname">${esc(primary.name)}</div>
    <div class="pinsight">${esc(primary.insight)}</div>
    ${primary.evidence ? `<div class="pq">&ldquo;${esc(primary.evidence)}&rdquo;</div>` : ''}
    ${primary.implication ? `<div><div class="pimp">Implication</div>${esc(primary.implication)}</div>` : ''}
  </div>
  ${supportingHtml}
</div>
${patternBlock}`;
}

// ---------------------------------------------------------------------------
// block-quote - pull quote + corroborating data strip
// ---------------------------------------------------------------------------

function renderBlockQuote(slide: SlideDataLike, T: BrandTokens): string {
    const q = slide.quote || {};
    const corrData: any[] = Array.isArray(q.corroboratingData) ? q.corroboratingData.slice(0, 3) : [];
    const corrHtml = corrData.length > 0 ? `
      <div class="corr">
        <div class="clbl">Corroborating data</div>
        ${corrData.map(c => `
          <div class="ci">
            <div class="cv">${esc(c.value)}</div>
            <div class="cl">${esc(c.label)}</div>
            <div class="cs">${esc(c.source)}</div>
          </div>`).join('')}
      </div>` : '';
    return `<style>
.qctx{font-family:${T.monoFont};font-size:24px;letter-spacing:2.5px;color:${T.accent2};text-transform:uppercase;margin-bottom:14px}
.qtext{font-family:${T.displayFont};font-weight:600;font-size:58px;line-height:1.15;color:${T.ink};margin-bottom:22px;max-width:1620px}
.qctxp{font-size:33px;line-height:1.5;color:${T.ink};margin-bottom:18px;max-width:1620px}
.attr{font-family:${T.bodyFont};font-size:30px;color:${T.muted};margin-bottom:24px}
.attr b{font-weight:600;color:${T.ink}}
.corr{margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:18px 22px;background:${T.callout};border-left:4px solid ${T.accent}}
.clbl{grid-column:1/-1;font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;font-weight:600}
.ci .cv{font-family:${T.displayFont};font-size:46px;line-height:1;color:${T.ink}}
.ci .cl{font-size:26px;line-height:1.35;color:${T.ink};margin:4px 0 6px}
.ci .cs{font-family:${T.monoFont};font-size:18px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.impl{margin-top:18px;font-size:28px;line-height:1.45;color:${T.ink};border-top:1px solid ${T.hair};padding-top:14px}
.impl span{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
${q.context ? `<div class="qctx">${esc(q.context)}</div>` : ''}
<div class="qtext">&ldquo;${esc(q.text)}&rdquo;</div>
${q.contextParagraph ? `<div class="qctxp">${esc(q.contextParagraph)}</div>` : ''}
<div class="attr"><b>${esc(q.attribution)}</b>${q.role ? ' · ' + esc(q.role) : ''}${q.source ? ' · ' + esc(q.source) : ''}</div>
${corrHtml}
${q.implication ? `<div class="impl"><span>Implication</span>${esc(q.implication)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// recommendation - action title + supporting actions + impact grid + evidence
// ---------------------------------------------------------------------------

function renderRecommendation(slide: SlideDataLike, T: BrandTokens): string {
    const r = slide.recommendation || {};
    const supporting: any[] = Array.isArray(r.supportingActions) ? r.supportingActions.slice(0, 3) : [];
    const evidence: any[] = Array.isArray(r.evidence) ? r.evidence.slice(0, 2) : [];
    const grid = r.impactGrid || {};
    const supportingHtml = supporting.length > 0 ? `
      <div class="sup">
        <div class="splbl">Supporting actions</div>
        ${supporting.map((a, i) => `
          <div class="sa">
            <div class="idx">${String(i + 1).padStart(2, '0')}</div>
            <div>
              <div class="sn">${esc(a.name)}</div>
              <div class="sd">${esc(a.description)}</div>
            </div>
          </div>`).join('')}
      </div>` : '';
    const evidenceHtml = evidence.length > 0 ? `
      <div class="evi">
        <div class="elbl">Evidence</div>
        ${evidence.map(e => `
          <div class="eb">
            <div class="et">&ldquo;${esc(e.text)}&rdquo;</div>
            <div class="ea">${esc(e.attribution)}${e.source ? ' · ' + esc(e.source) : ''}</div>
          </div>`).join('')}
      </div>` : '';
    const gridHtml = (grid.baseline || grid.target || grid.timeframe || grid.owner) ? `
      <div class="grid">
        <div class="glbl">Projected impact</div>
        <div class="gcells">
          ${grid.baseline ? `<div class="gc"><div class="gh">Baseline</div><div class="gp">${esc(grid.baseline)}</div></div>` : ''}
          ${grid.target ? `<div class="gc"><div class="gh">Target</div><div class="gp">${esc(grid.target)}</div></div>` : ''}
          ${grid.timeframe ? `<div class="gc"><div class="gh">Timeframe</div><div class="gp">${esc(grid.timeframe)}</div></div>` : ''}
          ${grid.owner ? `<div class="gc"><div class="gh">Owner</div><div class="gp">${esc(grid.owner)}</div></div>` : ''}
        </div>
        ${r.impactMetric ? `<div class="metric"><div class="mv">${esc(r.impactMetric.value)}</div><div class="ml">${esc(r.impactMetric.label)}</div></div>` : ''}
      </div>` : '';
    return `<style>
.action{font-family:${T.displayFont};font-weight:600;font-size:48px;line-height:1.15;color:${T.ink};margin-bottom:14px;max-width:1620px;border-left:4px solid ${T.accent};padding-left:18px}
.rationale{font-size:31px;line-height:1.5;color:${T.ink};margin-bottom:24px;max-width:1620px}
.cols{display:grid;grid-template-columns:1.2fr 1fr;gap:36px;flex:1}
.sup,.evi{display:flex;flex-direction:column;gap:10px}
.splbl,.elbl,.glbl{font-family:${T.monoFont};font-size:22px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;border-bottom:1px solid ${T.hair};padding-bottom:6px;font-weight:600}
.sa{display:grid;grid-template-columns:42px 1fr;gap:12px;margin-top:8px}
.sa .idx{font-family:${T.displayFont};font-size:42px;color:${T.accent}}
.sa .sn{font-family:${T.bodyFont};font-weight:600;font-size:30px;color:${T.ink};margin-bottom:3px}
.sa .sd{font-size:26px;line-height:1.4;color:${T.ink}}
.eb{margin-top:6px}
.eb .et{font-size:26px;line-height:1.5;color:${T.ink};font-style:italic}
.eb .ea{font-family:${T.monoFont};font-size:19px;letter-spacing:1px;color:${T.muted};text-transform:uppercase;margin-top:4px}
.grid{margin-top:18px;background:${T.callout};padding:18px 22px;border-left:4px solid ${T.accent2}}
.gcells{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:10px}
.gc .gh{font-family:${T.monoFont};font-size:19px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase}
.gc .gp{font-size:26px;line-height:1.4;color:${T.ink};margin-top:4px}
.metric{margin-top:12px;display:flex;align-items:baseline;gap:14px;border-top:1px solid ${T.hair};padding-top:10px}
.metric .mv{font-family:${T.displayFont};font-size:46px;color:${T.accent}}
.metric .ml{font-size:26px;color:${T.ink}}
.impl{margin-top:14px;font-size:27px;line-height:1.45;color:${T.ink}}
.impl span{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
${r.actionTitle ? `<div class="action">${esc(r.actionTitle)}</div>` : ''}
${r.rationale ? `<div class="rationale">${esc(r.rationale)}</div>` : ''}
<div class="cols">
  ${supportingHtml}
  ${evidenceHtml}
</div>
${gridHtml}
${r.implication ? `<div class="impl"><span>Implication</span>${esc(r.implication)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// timeline - phases with duration + items
// ---------------------------------------------------------------------------

function renderTimeline(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.timeline || {};
    const phases: any[] = Array.isArray(data.phases) ? data.phases.slice(0, 6) : [];
    if (phases.length === 0) return `<p style="font-size:33px">No timeline data.</p>`;
    const cols = `repeat(${phases.length}, 1fr)`;
    return `<style>
.phases{display:grid;grid-template-columns:${cols};gap:22px;flex:1}
.phase{display:flex;flex-direction:column;gap:10px;border-top:3px solid ${T.accent};padding-top:14px}
.phase .pidx{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase}
.phase .pdur{font-family:${T.bodyFont};font-size:24px;color:${T.accent2};font-weight:600}
.phase .pname{font-family:${T.displayFont};font-weight:600;font-size:39px;color:${T.ink};line-height:1.1}
.phase ul{list-style:none;margin-top:8px;display:flex;flex-direction:column;gap:8px}
.phase li{font-size:27px;line-height:1.4;color:${T.ink};padding-left:14px;position:relative}
.phase li::before{content:'';position:absolute;left:0;top:8px;width:6px;height:6px;background:${T.accent}}
</style>
<div class="phases">
${phases.map((p, i) => `
  <div class="phase">
    <div class="pidx">Phase ${String(i + 1).padStart(2, '0')}</div>
    ${p.duration ? `<div class="pdur">${esc(p.duration)}</div>` : ''}
    <div class="pname">${esc(p.name)}</div>
    ${Array.isArray(p.items) && p.items.length > 0
        ? `<ul>${p.items.slice(0, 5).map((it: string) => `<li>${esc(it)}</li>`).join('')}</ul>`
        : ''}
  </div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// persona-card - name, role, quote, JTBD, pains, goals
// ---------------------------------------------------------------------------

function renderPersonaCard(slide: SlideDataLike, T: BrandTokens): string {
    const p = slide.persona || {};
    const pains: any[] = Array.isArray(p.painPoints) ? p.painPoints.slice(0, 3) : [];
    const goals = p.goals || {};
    return `<style>
.pcols{display:grid;grid-template-columns:1fr 1.2fr;gap:40px;flex:1}
.pleft{display:flex;flex-direction:column;gap:18px}
.pname{font-family:${T.displayFont};font-weight:600;font-size:58px;line-height:1.05;color:${T.ink}}
.prole{font-family:${T.bodyFont};font-size:37px;color:${T.muted}}
.pdem{font-family:${T.monoFont};font-size:24px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-top:1px solid ${T.hair};padding-top:10px}
.pquote{font-family:${T.bodyFont};font-size:37px;line-height:1.5;color:${T.ink};font-style:italic;border-left:4px solid ${T.accent};padding:10px 18px;background:${T.callout}}
.pbio{font-size:30px;line-height:1.5;color:${T.ink}}
.pright{display:flex;flex-direction:column;gap:18px}
.sect{display:flex;flex-direction:column;gap:8px}
.sect h2{font-family:${T.monoFont};font-size:22px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;font-weight:600}
.goals{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.goal{border-top:2px solid ${T.accent};padding-top:8px;font-size:27px;line-height:1.4}
.goal .gl{font-family:${T.monoFont};font-size:18px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;margin-bottom:4px}
.pains{display:flex;flex-direction:column;gap:12px}
.pp{border-left:3px solid ${T.accent};padding:6px 14px}
.pp .ppn{font-family:${T.bodyFont};font-weight:600;font-size:29px;color:${T.ink}}
.pp .ppq{font-size:26px;line-height:1.45;color:${T.ink};font-style:italic;margin-top:4px}
.pp .pps{font-family:${T.monoFont};font-size:18px;letter-spacing:1px;color:${T.muted};text-transform:uppercase;margin-top:4px}
</style>
<div class="pcols">
  <div class="pleft">
    <div>
      <div class="pname">${esc(p.name)}</div>
      <div class="prole">${esc(p.role)}</div>
    </div>
    ${p.demographics ? `<div class="pdem">${esc(p.demographics)}</div>` : ''}
    ${p.quote ? `<div class="pquote">&ldquo;${esc(p.quote)}&rdquo;</div>` : ''}
    ${p.bio ? `<div class="pbio">${esc(p.bio)}</div>` : ''}
  </div>
  <div class="pright">
    ${p.jtbd ? `<div class="sect"><h2>Jobs to be done</h2><div style="font-size:30px;line-height:1.5;color:${T.ink}">${esc(p.jtbd)}</div></div>` : ''}
    ${(goals.lifeGoal || goals.experienceGoal || goals.functionalGoal) ? `
      <div class="sect"><h2>Goals (Cooper hierarchy)</h2>
        <div class="goals">
          ${goals.lifeGoal ? `<div class="goal"><div class="gl">Life</div>${esc(goals.lifeGoal)}</div>` : ''}
          ${goals.experienceGoal ? `<div class="goal"><div class="gl">Experience</div>${esc(goals.experienceGoal)}</div>` : ''}
          ${goals.functionalGoal ? `<div class="goal"><div class="gl">Functional</div>${esc(goals.functionalGoal)}</div>` : ''}
        </div>
      </div>` : ''}
    ${pains.length > 0 ? `
      <div class="sect"><h2>Pain points</h2>
        <div class="pains">
          ${pains.map(pp => `
            <div class="pp">
              <div class="ppn">${esc(pp.label)}</div>
              ${pp.quote ? `<div class="ppq">&ldquo;${esc(pp.quote)}&rdquo;</div>` : ''}
              ${pp.source ? `<div class="pps">${esc(pp.source)}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>` : ''}
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// case-study - subject + challenge + intervention + outcome + transferability
// ---------------------------------------------------------------------------

function renderCaseStudy(slide: SlideDataLike, T: BrandTokens): string {
    const c = slide.caseStudy || {};
    return `<style>
.csmeta{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:24px;font-family:${T.monoFont};font-size:24px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.csmeta span{border-left:2px solid ${T.accent};padding-left:10px}
.csgrid{display:grid;grid-template-columns:1fr 1fr;gap:30px;flex:1}
.csbox{display:flex;flex-direction:column;gap:8px;border-top:3px solid ${T.accent};padding-top:14px}
.csbox h2{font-family:${T.monoFont};font-size:22px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;font-weight:600}
.csbox p{font-size:31px;line-height:1.5;color:${T.ink}}
.cssubj{font-family:${T.displayFont};font-weight:600;font-size:53px;line-height:1.05;color:${T.ink};margin-bottom:6px}
.cssubmeta{font-family:${T.monoFont};font-size:24px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;margin-bottom:20px}
</style>
${c.subject ? `<div class="cssubj">${esc(c.subject)}</div>` : ''}
${c.subjectMeta ? `<div class="cssubmeta">${esc(c.subjectMeta)}</div>` : ''}
<div class="csmeta">
  ${c.timeframe ? `<span>${esc(c.timeframe)}</span>` : ''}
  ${c.investment ? `<span>${esc(c.investment)}</span>` : ''}
</div>
<div class="csgrid">
  ${c.challenge ? `<div class="csbox"><h2>Challenge</h2><p>${esc(c.challenge)}</p></div>` : ''}
  ${c.intervention ? `<div class="csbox"><h2>Intervention</h2><p>${esc(c.intervention)}</p></div>` : ''}
  ${c.outcome ? `<div class="csbox"><h2>Outcome</h2><p>${esc(c.outcome)}</p></div>` : ''}
  ${c.applicability || c.transferability ? `<div class="csbox"><h2>Transferability</h2><p>${esc(c.applicability || c.transferability)}</p></div>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// principles - N principle cards (name + description)
// ---------------------------------------------------------------------------

function renderPrinciples(slide: SlideDataLike, T: BrandTokens): string {
    const items: any[] = Array.isArray(slide.principles?.items) ? slide.principles.items.slice(0, 6) : [];
    const cols = items.length >= 5 ? 3 : items.length >= 3 ? 3 : 2;
    return `<style>
.pgrid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;flex:1}
.pitem{border-top:3px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:10px}
.pitem .pidx{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase}
.pitem .pn{font-family:${T.displayFont};font-weight:600;font-size:39px;line-height:1.1;color:${T.ink}}
.pitem .pd{font-size:29px;line-height:1.45;color:${T.ink}}
</style>
<div class="pgrid">
${items.map((it, i) => `
  <div class="pitem">
    <div class="pidx">Principle ${String(i + 1).padStart(2, '0')}</div>
    <div class="pn">${esc(it.name)}</div>
    <div class="pd">${esc(it.description)}</div>
  </div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// section-divider - big number + title + subtitle, full-bleed feel
// ---------------------------------------------------------------------------

function renderSectionDivider(slide: SlideDataLike, T: BrandTokens): string {
    const d = slide.sectionDivider || {};
    return `<style>
.sdwrap{flex:1;display:flex;flex-direction:column;justify-content:center}
.sdnum{font-family:${T.displayFont};font-weight:600;font-size:144px;line-height:1;color:${T.accent};margin-bottom:20px}
.sdtitle{font-family:${T.displayFont};font-weight:600;font-size:101px;line-height:1.05;color:${T.ink};margin-bottom:18px;max-width:1620px}
.sdsub{font-family:${T.bodyFont};font-size:36px;line-height:1.4;color:${T.muted};max-width:1400px}
</style>
<div class="sdwrap">
  <div class="sdnum">${esc(d.number || '01')}</div>
  <div class="sdtitle">${esc(d.title || slide.title)}</div>
  ${d.subtitle ? `<div class="sdsub">${esc(d.subtitle)}</div>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// competitive-matrix - competitors as rows, capabilities as columns, score grid
// ---------------------------------------------------------------------------

function renderCompetitiveMatrix(slide: SlideDataLike, T: BrandTokens): string {
    const m = slide.matrix || {};
    const cols: string[] = Array.isArray(m.columns) ? m.columns.slice(0, 6) : [];
    const rows: any[] = Array.isArray(m.rows) ? m.rows.slice(0, 7) : [];
    const colDefs: string[] = Array.isArray(m.columnDefs) ? m.columnDefs : [];
    const dotForScore = (s: number) => {
        if (s >= 4) return `<span class="dot full"></span>`;
        if (s >= 3) return `<span class="dot strong"></span>`;
        if (s >= 2) return `<span class="dot med"></span>`;
        return `<span class="dot low"></span>`;
    };
    return `<style>
.cmtbl{width:100%;border-collapse:collapse;flex:1}
.cmtbl th, .cmtbl td{padding:14px 12px;border-bottom:1px solid ${T.hair};text-align:left;vertical-align:top}
.cmtbl th{font-family:${T.monoFont};font-size:21px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-bottom:2px solid ${T.ink};font-weight:600}
.cmtbl th .def{display:block;font-family:${T.bodyFont};font-size:20px;font-weight:400;text-transform:none;color:${T.muted};margin-top:2px;letter-spacing:0;line-height:1.3}
.cmtbl td.name{font-family:${T.bodyFont};font-weight:600;font-size:30px;color:${T.ink};min-width:200px}
.cmtbl td.note{font-size:23px;line-height:1.4;color:${T.muted};margin-top:4px}
.dot{display:inline-block;width:18px;height:18px;border-radius:50%}
.dot.full{background:${T.ink}}
.dot.strong{background:${T.accent}}
.dot.med{background:${T.accent2};opacity:0.6}
.dot.low{background:${T.hair}}
</style>
<table class="cmtbl">
  <thead>
    <tr>
      <th>Competitor</th>
      ${cols.map((c, i) => `<th>${esc(c)}${colDefs[i] ? `<span class="def">${esc(colDefs[i])}</span>` : ''}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${rows.map(r => `
      <tr>
        <td class="name">${esc(r.name)}${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}</td>
        ${(r.scores || []).slice(0, cols.length).map((s: number) => `<td>${dotForScore(s)}</td>`).join('')}
      </tr>`).join('')}
  </tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// service-blueprint - stages with customer / frontstage / backstage / pain lanes
// ---------------------------------------------------------------------------

function renderServiceBlueprint(slide: SlideDataLike, T: BrandTokens): string {
    const stages: any[] = Array.isArray(slide.serviceBlueprint?.stages) ? slide.serviceBlueprint.stages.slice(0, 6) : [];
    if (stages.length === 0) return `<p style="font-size:33px">No blueprint stages.</p>`;
    const cols = `repeat(${stages.length}, 1fr)`;
    return `<style>
.sbgrid{display:grid;grid-template-columns:140px ${cols};gap:14px;flex:1;font-size:24px;color:${T.ink}}
.sbgrid .lane{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;display:flex;align-items:center;font-weight:600}
.sbcell{padding:10px 12px;border-left:2px solid ${T.hair};line-height:1.4;min-height:60px}
.sbphase{background:${T.ink};color:${T.bandText};font-family:${T.displayFont};font-size:41px;text-transform:uppercase;letter-spacing:1px;padding:12px 14px;display:flex;flex-direction:column;justify-content:center}
.sbphase .dur{font-family:${T.monoFont};font-size:19px;letter-spacing:1.5px;opacity:0.7;text-transform:uppercase;margin-top:4px;font-weight:400}
.sbpain{color:#a44a2a}
.sbemo{font-style:italic}
</style>
<div class="sbgrid">
  <div class="lane">Stage</div>
  ${stages.map(s => `<div class="sbphase">${esc(s.phase)}${s.duration ? `<div class="dur">${esc(s.duration)}</div>` : ''}</div>`).join('')}
  <div class="lane">Customer</div>
  ${stages.map(s => `<div class="sbcell">${esc(s.customerAction)}</div>`).join('')}
  <div class="lane">Frontstage</div>
  ${stages.map(s => `<div class="sbcell">${esc(s.frontstage)}</div>`).join('')}
  <div class="lane">Backstage</div>
  ${stages.map(s => `<div class="sbcell">${esc(s.backstage)}</div>`).join('')}
  <div class="lane">Emotion</div>
  ${stages.map(s => `<div class="sbcell sbemo">${esc(s.emotion)}</div>`).join('')}
  <div class="lane">Pain</div>
  ${stages.map(s => `<div class="sbcell sbpain">${esc(s.pain)}</div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// gap-matrix - capability gap analysis (current vs target maturity)
// ---------------------------------------------------------------------------

function renderGapMatrix(slide: SlideDataLike, T: BrandTokens): string {
    const gaps: any[] = Array.isArray(slide.gapMatrix?.gaps) ? slide.gapMatrix.gaps.slice(0, 7) : [];
    const scaleMax: number = slide.gapMatrix?.scaleMax || 5;
    const sevColor: Record<string, string> = {
        critical: '#CC3333', high: '#CC6644', medium: '#B8B800', low: T.muted,
    };
    const bar = (lvl: number) => {
        const pct = Math.round((lvl / scaleMax) * 100);
        return `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>`;
    };
    return `<style>
.gmtbl{width:100%;border-collapse:collapse;flex:1}
.gmtbl th,.gmtbl td{padding:12px 10px;border-bottom:1px solid ${T.hair};vertical-align:top;text-align:left}
.gmtbl th{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-bottom:2px solid ${T.ink};font-weight:600}
.gmtbl td.cap{font-family:${T.bodyFont};font-weight:600;font-size:29px;color:${T.ink};min-width:240px}
.bar{width:160px;height:14px;background:${T.hair};position:relative;overflow:hidden}
.bar .fill{height:100%;background:${T.accent}}
.gmtbl td.sev{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}
.gmtbl td.imp{font-size:25px;line-height:1.4;color:${T.ink}}
</style>
<table class="gmtbl">
  <thead><tr><th>Capability</th><th>Current</th><th>Target</th><th>Severity</th><th>Impact</th></tr></thead>
  <tbody>
    ${gaps.map(g => `
      <tr>
        <td class="cap">${esc(g.capability)}</td>
        <td>${bar(g.currentMaturity)}<div style="font-family:${T.monoFont};font-size:18px;color:${T.muted};margin-top:3px">L${g.currentMaturity}/${scaleMax}</div></td>
        <td>${bar(g.targetMaturity)}<div style="font-family:${T.monoFont};font-size:18px;color:${T.muted};margin-top:3px">L${g.targetMaturity}/${scaleMax}</div></td>
        <td class="sev" style="color:${sevColor[g.severity] || T.ink}">${esc(g.severity)}</td>
        <td class="imp">${esc(g.impact)}</td>
      </tr>`).join('')}
  </tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// architecture-map - layers (Client/API/Services/Data) with nodes
// ---------------------------------------------------------------------------

function renderArchitectureMap(slide: SlideDataLike, T: BrandTokens): string {
    const layers: any[] = Array.isArray(slide.architectureMap?.layers) ? slide.architectureMap.layers.slice(0, 6) : [];
    const flow: string = slide.architectureMap?.flowSummary || '';
    if (layers.length === 0) return `<p style="font-size:33px">No architecture layers.</p>`;
    return `<style>
.amwrap{display:flex;flex-direction:column;gap:14px;flex:1}
.amlayer{display:grid;grid-template-columns:140px 1fr;gap:14px;border-top:2px solid ${T.accent};padding-top:10px}
.amlname{font-family:${T.displayFont};font-size:41px;color:${T.ink};text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center}
.amnodes{display:flex;flex-wrap:wrap;gap:10px}
.amnode{background:${T.callout};border-left:3px solid ${T.accent2};padding:8px 14px;font-size:25px;line-height:1.3;min-width:160px}
.amnode .nn{font-weight:600;color:${T.ink}}
.amnode .nt{font-family:${T.monoFont};font-size:18px;letter-spacing:1px;color:${T.muted};text-transform:uppercase;margin-top:2px}
.amnode .nd{font-size:22px;color:${T.muted};margin-top:4px;line-height:1.4}
.amflow{margin-top:14px;font-size:28px;line-height:1.45;color:${T.ink};background:${T.callout};padding:14px 18px;border-left:4px solid ${T.accent2}}
.amflow span{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<div class="amwrap">
  ${layers.map(l => `
    <div class="amlayer">
      <div class="amlname">${esc(l.name)}</div>
      <div class="amnodes">
        ${(l.nodes || []).slice(0, 8).map((n: any) => `
          <div class="amnode">
            <div class="nn">${esc(n.name)}</div>
            ${n.type ? `<div class="nt">${esc(n.type)}</div>` : ''}
            ${n.description ? `<div class="nd">${esc(n.description)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`).join('')}
</div>
${flow ? `<div class="amflow"><span>Flow</span>${esc(flow)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// prd-feature - MoSCoW-priority feature cards with user story + AC
// ---------------------------------------------------------------------------

function renderPrdFeature(slide: SlideDataLike, T: BrandTokens): string {
    const features: any[] = Array.isArray(slide.prdFeature?.features) ? slide.prdFeature.features.slice(0, 4) : [];
    const priColor: Record<string, string> = {
        must: T.accent, should: T.accent2, could: T.muted, wont: '#999',
    };
    const cols = features.length >= 3 ? 2 : 1;
    return `<style>
.fgrid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;flex:1}
.feat{border-top:3px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:10px}
.feat .fhead{display:flex;justify-content:space-between;align-items:baseline;gap:14px}
.feat .fn{font-family:${T.displayFont};font-weight:600;font-size:39px;line-height:1.1;color:${T.ink}}
.feat .fpri{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;text-transform:uppercase;font-weight:700;padding:4px 10px;color:${T.ink};border:2px solid currentColor}
.feat .fps{font-size:27px;line-height:1.5;color:${T.ink}}
.feat .fst{font-size:26px;line-height:1.5;font-style:italic;color:${T.ink};border-left:3px solid ${T.accent2};padding:6px 12px;background:${T.callout}}
.feat .faclbl{font-family:${T.monoFont};font-size:19px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;font-weight:600;margin-top:4px}
.feat ul{list-style:none;display:flex;flex-direction:column;gap:6px}
.feat li{font-size:25px;line-height:1.4;color:${T.ink};padding-left:14px;position:relative}
.feat li::before{content:'';position:absolute;left:0;top:7px;width:6px;height:6px;background:${T.accent}}
</style>
<div class="fgrid">
${features.map(f => `
  <div class="feat">
    <div class="fhead">
      <div class="fn">${esc(f.name)}</div>
      <div class="fpri" style="color:${priColor[f.priority] || T.ink}">${esc(f.priority)}</div>
    </div>
    ${f.problemSolved ? `<div class="fps">${esc(f.problemSolved)}</div>` : ''}
    ${f.userStory ? `<div class="fst">${esc(f.userStory)}</div>` : ''}
    ${Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length > 0 ? `
      <div class="faclbl">Acceptance criteria</div>
      <ul>${f.acceptanceCriteria.slice(0, 4).map((ac: string) => `<li>${esc(ac)}</li>`).join('')}</ul>` : ''}
  </div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// systems-inventory - system rows (name + category + status + risk)
// ---------------------------------------------------------------------------

function renderSystemsInventory(slide: SlideDataLike, T: BrandTokens): string {
    const systems: any[] = Array.isArray(slide.systemsInventory?.systems) ? slide.systemsInventory.systems.slice(0, 10) : [];
    const insight: string = slide.systemsInventory?.insight || '';
    const statusColor: Record<string, string> = {
        current: T.accent, legacy: T.muted, deprecated: '#CC6644', planned: T.accent2,
    };
    const riskColor: Record<string, string> = {
        critical: '#CC3333', high: '#CC6644', medium: T.accent, low: T.muted,
    };
    return `<style>
.sitbl{width:100%;border-collapse:collapse}
.sitbl th,.sitbl td{padding:11px 10px;border-bottom:1px solid ${T.hair};text-align:left;vertical-align:top}
.sitbl th{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-bottom:2px solid ${T.ink};font-weight:600}
.sitbl td.sn{font-family:${T.bodyFont};font-weight:600;font-size:28px;color:${T.ink};min-width:200px}
.sitbl td.sc{font-family:${T.monoFont};font-size:20px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.sitbl td.ss{font-family:${T.monoFont};font-size:20px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}
.sitbl td.sd{font-size:24px;line-height:1.4;color:${T.ink}}
.insight{margin-top:14px;font-size:28px;line-height:1.45;color:${T.ink};background:${T.callout};padding:14px 18px;border-left:4px solid ${T.accent}}
.insight span{font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<table class="sitbl">
  <thead><tr><th>System</th><th>Category</th><th>Status</th><th>Risk</th><th>Notes</th></tr></thead>
  <tbody>
    ${systems.map(s => `
      <tr>
        <td class="sn">${esc(s.name)}</td>
        <td class="sc">${esc(s.category)}</td>
        <td class="ss" style="color:${statusColor[s.status] || T.ink}">${esc(s.status)}</td>
        <td class="ss" style="color:${riskColor[s.risk] || T.ink}">${esc(s.risk)}</td>
        <td class="sd">${esc(s.description)}</td>
      </tr>`).join('')}
  </tbody>
</table>
${insight ? `<div class="insight"><span>Insight</span>${esc(insight)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// Generic fallback - title + raw structured dump for templates not yet wired.
// Honest: emits the data so the user sees SOMETHING but doesn't pretend to
// match the chat preview layout. The signal is "this template needs a
// 1920×1080 renderer added to slideToStageHtml.ts".
// ---------------------------------------------------------------------------

function renderGeneric(slide: SlideDataLike, T: BrandTokens): string {
    const dump: string[] = [];
    if (slide.subtitle) dump.push(`<div class="sub">${esc(slide.subtitle)}</div>`);
    if (slide.body) dump.push(`<div class="body">${esc(slide.body)}</div>`);
    if (Array.isArray(slide.bullets)) {
        dump.push(`<ul>${slide.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`);
    }
    // Surface a hint that this template lacks a dedicated 1920×1080 renderer.
    return `<style>
.sub{font-size:37px;color:${T.muted};margin-bottom:24px}
.body{font-size:33px;line-height:1.55;color:${T.ink};max-width:1620px;margin-bottom:24px}
ul{list-style:none;display:flex;flex-direction:column;gap:10px;max-width:1620px}
li{font-size:31px;line-height:1.45;color:${T.ink};padding-left:18px;position:relative}
li::before{content:'';position:absolute;left:0;top:9px;width:8px;height:8px;background:${T.accent}}
.note{margin-top:24px;font-family:${T.monoFont};font-size:20px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;border-top:1px solid ${T.hair};padding-top:12px}
</style>
${dump.join('\n')}
<div class="note">Template &lt;${esc(slide.template || 'unknown')}&gt; rendered via the generic fallback. For full fidelity, add a dedicated renderer to slideToStageHtml.ts.</div>`;
}

// ---------------------------------------------------------------------------
// Public entry: SlideData -> #stage 1920×1080 HTML doc.
// ---------------------------------------------------------------------------

export function slideDataToStageHtml(slide: SlideDataLike): string {
    const brand: Brand = slide.brand === 'nu' ? 'nu' : 'nxt';
    const T = brandTokens(brand);
    const template = (slide.template || '').toLowerCase();

    // Per-template kicker label (the small uppercase eyebrow above the title).
    const KICKERS: Record<string, string> = {
        'stat-row': 'By the numbers',
        'theme-spotlight': 'Emerging theme · Spotlight',
        'theme-cluster': 'Emerging themes',
        'theme-arc': 'Thematic arc',
        'theme-mosaic': 'Theme mosaic',
        'block-quote': 'Voice of the field',
        'recommendation': 'Strategic recommendation',
        'timeline': 'Roadmap',
        'case-study': 'Case study',
        'principles': 'Principles',
        'section-divider': 'Section',
        'service-blueprint': 'Service blueprint',
        'gap-matrix': 'Capability gap',
        'architecture-map': 'Architecture',
        'prd-feature': 'Feature spec',
        'systems-inventory': 'Systems inventory',
        'persona-card': 'Persona',
        'competitive-matrix': 'Competitive matrix',
    };

    let body = '';
    switch (template) {
        case 'stat-row':
            body = renderStatRow(slide, T);
            break;
        case 'theme-spotlight':
        case 'theme-cluster':
        case 'theme-arc':
        case 'theme-mosaic':
            body = renderThemeSpotlight(slide, T);
            break;
        case 'block-quote':
            body = renderBlockQuote(slide, T);
            break;
        case 'recommendation':
            body = renderRecommendation(slide, T);
            break;
        case 'timeline':
            body = renderTimeline(slide, T);
            break;
        case 'persona-card':
            body = renderPersonaCard(slide, T);
            break;
        case 'case-study':
            body = renderCaseStudy(slide, T);
            break;
        case 'principles':
            body = renderPrinciples(slide, T);
            break;
        case 'section-divider':
            body = renderSectionDivider(slide, T);
            break;
        case 'competitive-matrix':
            body = renderCompetitiveMatrix(slide, T);
            break;
        case 'service-blueprint':
            body = renderServiceBlueprint(slide, T);
            break;
        case 'gap-matrix':
            body = renderGapMatrix(slide, T);
            break;
        case 'architecture-map':
            body = renderArchitectureMap(slide, T);
            break;
        case 'prd-feature':
            body = renderPrdFeature(slide, T);
            break;
        case 'systems-inventory':
            body = renderSystemsInventory(slide, T);
            break;
        default:
            body = renderGeneric(slide, T);
            break;
    }

    // section-divider has its own full-bleed layout - bypass the standard title rendering.
    if (template === 'section-divider') {
        return buildShell({
            brand,
            title: slide.title || 'Section',
            bodyInnerHtml: body,
            sources: slide.sources,
            kicker: undefined,
        });
    }

    // Title HTML - Bebas/Spectral display font + 54px on stage.
    const titleHtml = slide.title ? `<h1>${esc(slide.title)}</h1>` : '';

    return buildShell({
        brand,
        title: slide.title || 'Slide',
        bodyInnerHtml: titleHtml + '\n' + body,
        sources: slide.sources,
        kicker: KICKERS[template] || undefined,
    });
}
