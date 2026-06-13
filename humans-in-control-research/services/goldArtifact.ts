// goldArtifact.ts - wires the GOLD editable exemplars into the Analyst Desk chat.
//
// Flow for a hashtag deliverable (e.g. "#gap #NU"):
//   1) loadGoldTemplate(deliverable, brand)  -> the canonical gold-language HTML (the frame)
//   2) the model fills the frame with corpus-grounded content, preserving every tag/class/style
//      (buildGoldFillPrompt) and returns the FULL gold HTML
//   3) the chat renders that HTML in the sandboxed preview iframe (existing freeform render path)
//   4) exportGoldPptx(html) -> POST /api/gold/export-pptx -> downloads the EDITABLE .pptx
//      (graphic background + real editable text + embedded gold fonts; the proven exporter)
//
// The gold exemplars are served by the Vite wiki middleware (dev) / nginx (prod) at
// /hic-workspace/wiki/design-system/gold/<deliverable>-<brand>.html, so no build-time bundling.

export type GoldBrand = 'nu' | 'nxt';

// hashtag (canonical id, no leading #) -> gold exemplar base name. Covers every static
// deliverable that has a gold twin. (#playground / #proto are interactive - excluded.)
export const HASHTAG_TO_GOLD: Record<string, string> = {
    blueprint: 'blueprint', journey: 'journey', gap: 'gap',
    compete: 'competitive', competitive: 'competitive',
    persona: 'personas', personas: 'personas',
    prd: 'prd', roadmap: 'roadmap', strategy: 'strategy',
    themes: 'themes', arch: 'arch', architecture: 'arch',
    org: 'org', audit: 'audit', 'tech-audit': 'audit',
    recommendations: 'recommendations', 'case-study': 'case-study', 'case-studies': 'case-study',
    'meta-themes': 'meta-themes', mindmap: 'mindmap',
    'heuristic-ux': 'heuristic-ux', 'research-plan': 'research-plan',
    brief: 'brief', explainer: 'explainer', report: 'report', approaches: 'approaches',
    'brief-dialog': 'brief-dialog', presentation: 'presentation',
};

function brandFromTags(tags: string[]): GoldBrand {
    return tags.some(t => t.toLowerCase() === '#nu' || t.toLowerCase() === 'nu') ? 'nu' : 'nxt';
}

/** Resolve a deliverable hashtag (with or without leading #) to its gold base, or null. */
export function goldBaseForHashtag(hashtag: string): string | null {
    const id = hashtag.replace(/^#/, '').toLowerCase().trim();
    return HASHTAG_TO_GOLD[id] || null;
}

/** Fetch the canonical gold-language HTML for (deliverable, brand). */
export async function loadGoldTemplate(deliverableBase: string, brand: GoldBrand): Promise<string> {
    const url = `/hic-workspace/wiki/design-system/gold/${deliverableBase}-${brand}.html`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`gold template not found: ${url} (${resp.status})`);
    return resp.text();
}

/** Prompt that instructs the model to fill the gold frame with corpus-grounded content,
 *  preserving the exact layout. The returned HTML stays in the gold visual language and is
 *  directly renderable + exportable. */
export function buildGoldFillPrompt(goldHtml: string, deliverableBase: string, userRequest: string): string {
    return [
        `You are filling a fixed GOLD design template for a "${deliverableBase}" deliverable.`,
        `Below is the EXACT template HTML. Replace ONLY the representative text content with content`,
        `grounded in the research corpus for this request. Preserve every tag, class, inline style,`,
        `SVG, the rail, the dot mark, the wordmark, the kicker, the takeaway band, and the overall`,
        `structure byte-for-byte except the human-readable text. Do not add or remove elements.`,
        `Do not invent data the corpus does not support; if a slot has no evidence, keep it concise`,
        `and honest. Obey the project output rules (no em-dash, no banned phrases, citations by`,
        `named source, numbers only inside cited quotes). Return the COMPLETE HTML document only.`,
        ``,
        `REQUEST: ${userRequest}`,
        ``,
        `TEMPLATE:`,
        goldHtml,
    ].join('\n');
}

/** Export gold-language HTML to an EDITABLE .pptx via the proxy, and trigger a browser download. */
export async function exportGoldPptx(html: string, filename: string, proxyBase = ''): Promise<void> {
    const base = proxyBase || (typeof window !== 'undefined' ? 'http://127.0.0.1:5012' : '');
    const resp = await fetch(`${base}/api/gold/export-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename }),
    });
    if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(`gold export failed (${resp.status}): ${msg.slice(0, 200)}`);
    }
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/** Export a LIST of #stage 1920x1080 HTML docs to ONE editable multi-slide .pptx.
 *
 *  Structural primitive - the chat's "Export Deck PPTX" button routes through this,
 *  NOT through the parallel pptxgenjs template renderer. The chat preview is the
 *  source of truth; capture each slide's rendered DOM into a #stage shell and ship
 *  the array here. Browser startup cost amortized across N slides on the proxy.
 */
export async function exportGoldDeckPptx(htmlList: string[], filename: string, proxyBase = ''): Promise<void> {
    if (!Array.isArray(htmlList) || htmlList.length === 0) {
        throw new Error('exportGoldDeckPptx: htmlList must be a non-empty array of #stage HTML strings');
    }
    const base = proxyBase || (typeof window !== 'undefined' ? 'http://127.0.0.1:5012' : '');
    const resp = await fetch(`${base}/api/gold/export-pptx-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: htmlList, filename }),
    });
    if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(`gold deck export failed (${resp.status}): ${msg.slice(0, 200)}`);
    }
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename.endsWith('.pptx') ? filename : `${filename}.pptx`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/** Capture a rendered slide DOM node and wrap it as a self-contained #stage 1920x1080
 *  HTML document the gold exporter can consume.
 *
 *  Why this matters: the chat preview renders slides at small sizes (e.g. 960x540) so
 *  computed CSS font-sizes are scaled down. The gold exporter assumes 1920x1080 stage
 *  (PX2PT = 0.5). Naively cloning the chat preview undersizes every glyph 2x.
 *
 *  Fix: clone the captured node, mount it off-screen at native 1920x1080 dimensions,
 *  let CSS re-flow at that size (computed font-size becomes the brand spec), wait for
 *  fonts + double rAF, then serialize. The unmount step removes the offscreen node.
 */
export async function captureSlideAsStageHtml(
    sourceNode: HTMLElement,
    opts: { brand?: 'nxt' | 'nu'; title?: string } = {},
): Promise<string> {
    if (!sourceNode) throw new Error('captureSlideAsStageHtml: sourceNode is required');

    // Clone the source so we can mutate dimensions without disturbing the chat preview.
    const clone = sourceNode.cloneNode(true) as HTMLElement;

    // Off-screen mount at native 1920x1080. The clone inherits global styles from the
    // SPA's stylesheet (which is loaded into the document head); we don't try to inline
    // those - the proxy's Playwright will use them when the HTML file:// is opened with
    // <link>s relative to the SPA origin. For determinism we INLINE the actual brand
    // CSS variables from the document root so the file://-loaded clone in Playwright
    // doesn't lose them.
    const offscreen = document.createElement('div');
    offscreen.id = `__hic_offscreen_capture_${Date.now()}`;
    offscreen.style.cssText = [
        'position:fixed', 'left:-99999px', 'top:0',
        'width:1920px', 'height:1080px',
        'overflow:hidden', 'background:#fff', 'z-index:-9999',
        'pointer-events:none', 'opacity:1',
    ].join(';');
    // Wrap the clone in a #stage container the gold exporter expects.
    const stage = document.createElement('div');
    stage.id = 'stage';
    stage.style.cssText = [
        'position:absolute', 'left:0', 'top:0',
        'width:1920px', 'height:1080px',
        'transform-origin:top left', 'background:#fff',
        'font-family:Archivo,sans-serif', 'color:#141414',
    ].join(';');
    // Force the clone to fill the stage at native size.
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = '1920px';
    clone.style.height = '1080px';
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.removeAttribute('id'); // prevent collision with the #stage id we just set
    stage.appendChild(clone);
    offscreen.appendChild(stage);
    document.body.appendChild(offscreen);

    try {
        // Wait for fonts + two animation frames so the at-1920 layout settles.
        try { if ((document as any).fonts?.ready) await (document as any).fonts.ready; } catch { /* ignore */ }
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

        // Serialize the offscreen stage's HTML + collect referenced stylesheets so the
        // file://-loaded version in Playwright has the same computed styles. We inline
        // <style> tags from the current document; <link rel=stylesheet> is followed
        // and inlined as <style>. Cross-origin sheets that can't be read are skipped.
        const styleParts: string[] = [];
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                const rules = (sheet as CSSStyleSheet).cssRules;
                if (!rules) continue;
                let css = '';
                for (let i = 0; i < rules.length; i++) css += rules[i].cssText + '\n';
                styleParts.push(css);
            } catch { /* cross-origin sheet - skip */ }
        }
        const allCss = styleParts.join('\n');

        // Build a self-contained #stage doc. The shell includes brand fonts via Google
        // Fonts (the SPA already loads them; reload at file:// for Playwright). The
        // gold exporter resets html/body margin + #stage transform via its own RESET.
        const brand = (opts.brand || 'nxt').toLowerCase();
        const title = (opts.title || 'Slide').replace(/</g, '&lt;');
        const stageOuter = stage.outerHTML;
        const fontsHref = 'https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@300;400;500;600;700&family=Bebas+Neue&family=Archivo:wght@200;300;400;500;600;700;900&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500&family=Roboto:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
        const html = `<!DOCTYPE html>
<html lang="en" data-brand="${brand}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsHref}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#fff;overflow:hidden}
</style>
<style>${allCss}</style>
</head>
<body>
${stageOuter}
</body>
</html>`;
        return html;
    } finally {
        try { offscreen.remove(); } catch { /* ignore */ }
    }
}

export { brandFromTags };

// ---------------------------------------------------------------------------
// JOURNEY BRIEF → #stage HTML (for design-desk ExportMenu PPTX path)
// ---------------------------------------------------------------------------
// The journey-brief deliverable is generated by services/journeyBriefExporter
// and historically rendered via slideTemplates/pptx.ts (template='journey-brief'),
// a second renderer parallel to the chat preview. The structural fix: emit the
// brief directly as a 1920×1080 #stage HTML doc the gold exporter consumes.
// One renderer (this function), one pipeline (/api/gold/export-pptx), pixel
// parity with whatever the chat preview shows.
//
// Type intentionally permissive (JourneyBrief shape lives in services/
// journeyBriefExporter.ts). We do a shallow validation at runtime.

export interface JourneyBriefStageLike {
    name?: string;
    key_pain?: string;
    key_opportunity?: string;
}

export interface JourneyBriefLike {
    diagnostic_title?: string;
    journey_type?: string;
    persona_line?: string;
    stages?: JourneyBriefStageLike[];
    cross_cutting_pains?: string[];
    strategic_opportunities?: string[];
    kpis?: Array<{ value?: string; label?: string }>;
    closing_quote?: { text?: string; attribution?: string };
    sources?: string[];
}

// 2026-06-10 - Reconciled to the LIVE Figma design-system files (NXT
// iSQhAVM7SI4QHAWB7y9C2z node 223:2, NU z2v9Pvhg23hlljEitPBdAt node 97:2).
// NU rail is the navy #0E1626 (not teal), ink #16233C, cool accent is the
// source teal #1D6E64, display is Lora + body Archivo + IBM Plex Mono.
// Mirrors components/slideTemplates/brands.ts and services/slideToStageHtml.ts.
const _NXT_TOKENS = {
    rail: '#0D0D0D',
    paper: '#FFFFFF',
    ink: '#141414',
    accent: '#B8B800',   // chartreuse
    accent2: '#00B7C3',  // cyan
    muted: '#73757A',
    hair: '#DDDDD6',
    band: '#B8B800',
    bandText: '#0D0D0D',
    // 2026-06-13 - NXT display = Saira Condensed (replaced Bebas Neue).
    displayFont: "'Saira Condensed', sans-serif",
    bodyFont: "'Archivo', sans-serif",
    monoFont: "'IBM Plex Mono', monospace",
};
const _NU_TOKENS = {
    rail: '#0E1626',
    paper: '#FFFFFF',
    ink: '#16233C',
    accent: '#C8102E',   // huskies red
    accent2: '#1D6E64',  // source teal
    muted: '#73757A',
    hair: '#DDDDD6',
    band: '#16233C',
    bandText: '#FFFFFF',
    // 2026-06-13 - NU single-typeface system: Lato everywhere (weight = hierarchy).
    displayFont: "'Lato', sans-serif",
    bodyFont: "'Lato', sans-serif",
    monoFont: "'Lato', sans-serif",
};

function _esc(s: string | undefined): string {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function journeyBriefToStageHtml(brief: JourneyBriefLike, brand: GoldBrand): string {
    const T = brand === 'nu' ? _NU_TOKENS : _NXT_TOKENS;
    const stages = (brief.stages || []).slice(0, 6);
    const stageCols = Math.max(1, stages.length);
    const kpis = (brief.kpis || []).slice(0, 4);
    const pains = (brief.cross_cutting_pains || []).slice(0, 3);
    const opps = (brief.strategic_opportunities || []).slice(0, 3);
    const sources = (brief.sources || []).slice(0, 6).join('  ·  ');
    const quoteHtml = brief.closing_quote && brief.closing_quote.text
        ? `<div class="quote"><div class="qt">&ldquo;${_esc(brief.closing_quote.text)}&rdquo;</div><div class="qa">- ${_esc(brief.closing_quote.attribution || 'source')}</div></div>`
        : '';
    const kpisRow = kpis.length > 0
        ? `<div class="kpis">${kpis.map(k => `<div class="kpi"><div class="kv">${_esc(k.value || '')}</div><div class="kl">${_esc(k.label || '')}</div></div>`).join('')}</div>`
        : '';
    return `<!DOCTYPE html>
<html lang="en" data-brand="${brand}">
<head>
<meta charset="UTF-8">
<title>${_esc(brief.diagnostic_title || 'Journey Brief')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@300;400;500;600;700&family=Bebas+Neue&family=Archivo:wght@200;300;400;500;600;700;900&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=Spectral:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800&family=Roboto:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#080808;overflow:hidden}
#stage{position:absolute;width:1920px;height:1080px;background:${T.paper};font-family:${T.bodyFont};color:${T.ink};transform-origin:top left}
.rail{position:absolute;left:0;top:0;width:92px;height:100%;background:${T.rail}}
.brand{position:absolute;top:46px;right:80px;font-family:${T.monoFont};font-size:14px;letter-spacing:6px;color:${T.muted}}
.canvas{position:absolute;left:92px;top:0;right:0;bottom:0;padding:46px 80px 36px 72px;display:flex;flex-direction:column;gap:18px}
.kicker{font-family:${T.monoFont};font-size:14px;letter-spacing:5px;color:${T.accent2};text-transform:uppercase}
h1{font-family:${T.displayFont};font-weight:600;letter-spacing:-0.5px;font-size:44px;line-height:1.1;color:${T.ink};margin-top:6px}
.persona{font-family:${T.monoFont};font-size:13px;color:${T.muted};letter-spacing:1.5px;text-transform:uppercase;margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(${Math.max(1, kpis.length)},1fr);gap:18px;margin-top:6px}
.kpi{border-left:3px solid ${T.accent};padding:6px 0 6px 14px}
.kpi .kv{font-family:${T.displayFont};font-size:38px;line-height:1;color:${T.ink}}
.kpi .kl{font-family:${T.monoFont};font-size:11px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;margin-top:4px}
.stages{display:grid;grid-template-columns:repeat(${stageCols},1fr);gap:18px}
.stage{border-top:2px solid ${T.ink};padding-top:8px}
.stage .sn{font-family:${T.displayFont};font-weight:600;font-size:22px;letter-spacing:1px;color:${T.ink};text-transform:uppercase;margin-bottom:6px}
.stage .lbl{font-family:${T.monoFont};font-size:9px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;margin-top:8px}
.stage .pp{font-size:13px;line-height:1.45;color:${T.ink};margin-top:2px}
.lanes{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.lane h2{font-family:${T.monoFont};font-size:11px;letter-spacing:2.5px;color:${T.muted};text-transform:uppercase;margin-bottom:6px}
.lane li{font-size:13.5px;line-height:1.4;color:${T.ink};list-style:none;padding-left:14px;position:relative;margin-bottom:4px}
.lane li::before{content:'';position:absolute;left:0;top:8px;width:6px;height:6px;background:${T.accent};display:block}
.lane.opp li::before{background:${T.accent2}}
.quote{background:${T.band};color:${T.bandText};padding:18px 22px;font-family:${T.bodyFont}}
.quote .qt{font-size:18px;line-height:1.45}
.quote .qa{font-family:${T.monoFont};font-size:11px;letter-spacing:1.5px;color:${T.accent};text-transform:uppercase;margin-top:6px}
.sources{font-family:${T.monoFont};font-size:11px;letter-spacing:1px;color:${T.muted};border-top:1px solid ${T.hair};padding-top:10px;margin-top:auto}
</style>
</head>
<body>
<div id="stage">
  <div class="rail"></div>
  <div class="brand">${brand === 'nu' ? 'NORTHEASTERN' : 'NXT&nbsp;&nbsp;HUMANS'}</div>
  <div class="canvas">
    <div>
      <div class="kicker">${_esc(brief.journey_type || 'JOURNEY')} BRIEF</div>
      <h1>${_esc(brief.diagnostic_title || 'Journey Brief')}</h1>
      <div class="persona">${_esc(brief.persona_line || '')}</div>
    </div>
    ${kpisRow}
    ${stages.length > 0 ? `<div class="stages">${stages.map(s => `<div class="stage"><div class="sn">${_esc(s.name)}</div><div class="lbl">Key pain</div><div class="pp">${_esc(s.key_pain)}</div><div class="lbl">Opportunity</div><div class="pp">${_esc(s.key_opportunity)}</div></div>`).join('')}</div>` : ''}
    <div class="lanes">
      <div class="lane">
        <h2>Cross-cutting pains</h2>
        ${pains.map(p => `<li>${_esc(p)}</li>`).join('')}
      </div>
      <div class="lane opp">
        <h2>Strategic opportunities</h2>
        ${opps.map(o => `<li>${_esc(o)}</li>`).join('')}
      </div>
    </div>
    ${quoteHtml}
    <div class="sources">${_esc(sources)}</div>
  </div>
</div>
</body>
</html>`;
}
