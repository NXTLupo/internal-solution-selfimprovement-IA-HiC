// services/mindMapRenderer.ts
// Renders a MindMapOutput (from mindMapArchitect.buildMindMap) into a
// self-contained, brand-styled 1920×1080 HTML page that fits inside the
// FreeformViewer iframe (sandbox="allow-same-origin" - NO scripts).
//
// Pure-SVG radial tree layout computed at render time. Convergent-evidence
// nodes get a cyan ring; thin-evidence nodes are dimmed. Chunk-id chips
// surface under each node label for click-to-explore (parent picks up
// data-chunk-id attributes via the iframe's same-origin DOM).
//
// 2026-05-24 - Phase 4 of plans/hic-notebooklm-uplift-plan-2026-05-24.md

import type { MindMapNode, MindMapOutput } from './mindMapArchitect';
import { getBrand } from '../components/slideTemplates/brands';
import { compositeIcon, isContentTrueIcon } from './iconLibrary';

// 2026-06-27 - DE-HARDCODE + HUB GLYPH. Previously two hand-keyed hex palettes
// (NXT_TOKENS / NU_TOKENS) + stale fonts (Bebas Neue, Roboto Condensed, Open Sans).
// Per UNIFIED_VISION never-hardcode, every colour + font now resolves from the brand
// token mirror (getBrand -> /api/design-tokens hydration). Both brands render on the
// GOLD light paper surface (registry ground:'light'); brand is an accent flip. The
// central root node paints the tokenized hub glyph (compositeIcon) - the live Figma
// slot 683:5509 on component 612:2.

type Brand = 'nxt' | 'nu';

interface PalettedTokens {
    pageBg: string;
    canvasBg: string;
    accent: string;       // chartreuse for NXT, NU red for NU
    onAccent: string;     // contrast colour on the accent fill (NXT black, NU white)
    cyanRing: string;     // convergent-evidence ring (NXT cyan, NU source-teal)
    titleFont: string;
    bodyFont: string;
    monoFont: string;
    titleWeight: string;
    titleColor: string;
    bodyColor: string;
    mutedColor: string;
    hair: string;
    panelFill: string;    // ordinary node body fill (light panel)
    thinFill: string;     // thin-evidence node fill (recedes)
}

/** Prefix a token hex (stored without '#') for CSS/SVG. */
const hx = (v: string): string => (v && v.startsWith('#')) ? v : `#${v || '000000'}`;

/** Resolve the mind-map palette from the brand token mirror - NEVER a literal. */
function tokensFor(brand: Brand): PalettedTokens {
    const b = getBrand(brand);
    const fam = (f: string) => /\s/.test(f) ? `'${f}'` : f;
    return {
        pageBg: hx(b.PALE),
        canvasBg: hx(b.PALE),
        accent: hx(b.CHARTREUSE),
        onAccent: hx(b.BAND_TEXT),
        cyanRing: hx(b.CYAN),
        titleFont: `${fam(b.FONT_DISPLAY)}, sans-serif`,
        bodyFont: `${fam(b.FONT_BODY)}, sans-serif`,
        monoFont: `${fam(b.FONT_MONO)}, monospace`,
        titleWeight: b.TITLE_WEIGHT,
        titleColor: hx(b.INK),
        bodyColor: hx(b.INK),
        mutedColor: hx(b.GREY),
        hair: hx(b.HAIRLINE),
        panelFill: hx(b.PANEL),
        thinFill: hx(b.HAIRLINE),
    };
}

function escapeHtml(s: string): string {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Radial layout ────────────────────────────────────────────────────────────
// Compute (x, y) for every node by walking the tree and partitioning angular
// space among children. Root sits at canvas center; subsequent rings are at
// increasing radii. We never invoke d3 - pure arithmetic, deterministic.

interface Positioned {
    node: MindMapNode;
    x: number;
    y: number;
    angle: number;
    ring: number;
}

const SVG_W = 1920;
const SVG_H = 1080;
const CENTER_X = SVG_W / 2;
const CENTER_Y = SVG_H / 2 + 30;  // shift down to leave room for title
const RING_RADII = [0, 240, 460, 640];

function layoutRadial(root: MindMapNode): Positioned[] {
    const positioned: Positioned[] = [];
    positioned.push({ node: root, x: CENTER_X, y: CENTER_Y, angle: 0, ring: 0 });

    const groups = root.children;
    if (groups.length === 0) return positioned;

    // Ring 1 - top-level groups
    const ring1Span = Math.PI * 2;
    const ring1Start = -Math.PI / 2;  // 12 o'clock
    const ring1Step = ring1Span / groups.length;
    for (let i = 0; i < groups.length; i++) {
        const angle = ring1Start + i * ring1Step;
        const r = RING_RADII[1];
        positioned.push({
            node: groups[i],
            x: CENTER_X + r * Math.cos(angle),
            y: CENTER_Y + r * Math.sin(angle),
            angle,
            ring: 1,
        });

        // Ring 2 - themes inside this group. Each group gets an angular wedge.
        const themes = groups[i].children;
        if (themes.length === 0) continue;
        const wedge = ring1Step * 0.85;
        const wedgeStart = angle - wedge / 2;
        const wedgeStep = themes.length > 1 ? wedge / (themes.length - 1) : 0;
        for (let j = 0; j < themes.length; j++) {
            const ta = themes.length === 1 ? angle : wedgeStart + j * wedgeStep;
            const tr = RING_RADII[2];
            positioned.push({
                node: themes[j],
                x: CENTER_X + tr * Math.cos(ta),
                y: CENTER_Y + tr * Math.sin(ta),
                angle: ta,
                ring: 2,
            });
        }
    }
    return positioned;
}

// ─── Node visual ──────────────────────────────────────────────────────────────

function nodeRadius(node: MindMapNode): number {
    if (node.type === 'root') return 80;
    if (node.type === 'theme_group') return 56;
    return 36;
}

function nodeFontSize(node: MindMapNode): number {
    if (node.type === 'root') return 22;
    if (node.type === 'theme_group') return 14;
    return 11;
}

function nodeFill(node: MindMapNode, t: PalettedTokens): string {
    if (node.type === 'root') return t.accent;
    if (node.visual_treatment === 'thin_evidence') return t.thinFill;
    return t.panelFill;
}

function nodeStroke(node: MindMapNode, t: PalettedTokens): string {
    if (node.visual_treatment === 'convergent') return t.cyanRing;
    if (node.type === 'theme_group') return t.accent;
    return t.mutedColor;
}

function nodeStrokeWidth(node: MindMapNode): number {
    if (node.visual_treatment === 'convergent') return 3;
    if (node.type === 'theme_group') return 2;
    return 1;
}

function wrapLabel(label: string, maxCharsPerLine: number, maxLines = 3): string[] {
    const words = (label || '').split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxCharsPerLine) {
            if (cur) lines.push(cur);
            cur = w;
            if (lines.length >= maxLines - 1) {
                lines.push(cur + (words.indexOf(w) < words.length - 1 ? '...' : ''));
                return lines;
            }
        } else {
            cur = (cur + ' ' + w).trim();
        }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines);
}

// ─── Edge visual ──────────────────────────────────────────────────────────────

function edgePath(from: Positioned, to: Positioned): string {
    // Smooth bezier from parent toward child
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return '';
    // Pull the start/end points to the edge of each circle so the curve doesn't
    // overlap the node body.
    const fromR = nodeRadius(from.node);
    const toR = nodeRadius(to.node);
    const sx = from.x + (dx / len) * fromR;
    const sy = from.y + (dy / len) * fromR;
    const ex = to.x - (dx / len) * toR;
    const ey = to.y - (dy / len) * toR;
    // Quadratic control point - curve outward by 8% of segment length
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const nx = -dy / len;
    const ny = dx / len;
    const curve = len * 0.08;
    const cx = mx + nx * curve;
    const cy = my + ny * curve;
    return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

// ─── Top-level renderer ───────────────────────────────────────────────────────

export interface MindMapRenderInput {
    output: MindMapOutput;
    brand: Brand;
    researchGoal: string;
    runId?: string;
}

export function renderMindMapHtml(input: MindMapRenderInput): string {
    const t = tokensFor(input.brand);
    const positioned = layoutRadial(input.output.root);

    // Build a parent-id map for edge rendering
    const idToPos = new Map<string, Positioned>();
    for (const p of positioned) idToPos.set(p.node.id, p);

    // Edges: root → groups, groups → themes
    const edges: string[] = [];
    for (const p of positioned) {
        if (p.ring === 0) {
            for (const child of p.node.children) {
                const cp = idToPos.get(child.id);
                if (cp) edges.push(`<path d="${edgePath(p, cp)}" stroke="${t.mutedColor}" stroke-width="1.5" fill="none" opacity="0.5"/>`);
            }
        }
        if (p.ring === 1) {
            for (const child of p.node.children) {
                const cp = idToPos.get(child.id);
                if (cp) edges.push(`<path d="${edgePath(p, cp)}" stroke="${t.mutedColor}" stroke-width="1" fill="none" opacity="0.35"/>`);
            }
        }
    }

    // Central hub glyph (live Figma slot 683:5509 on 612:2). compositeIcon is
    // deterministic, $0, token-pure; the research question drives the base glyph.
    // It crowns the root node; the root's text label is dropped (the header title
    // already states the question) so the glyph never collides with wrapped text.
    let hubGlyphHref = '';
    try {
        const g = compositeIcon({ concept: input.researchGoal || input.output.root.label, brand: input.brand, ground: 'light', role: 'accent', size: 120 });
        // content-true or nothing: a generic fallback mark adds no meaning to the hub
        if (g?.dataUri && isContentTrueIcon(g.resolvedBy)) hubGlyphHref = g.dataUri;
    } catch { /* fail-open: root renders as a plain accent ring disc */ }

    // Nodes
    const nodes: string[] = [];
    for (const p of positioned) {
        const isRoot = p.node.type === 'root';
        const r = nodeRadius(p.node);
        const fontSize = nodeFontSize(p.node);
        const fill = nodeFill(p.node, t);
        const stroke = nodeStroke(p.node, t);
        const strokeW = nodeStrokeWidth(p.node);
        const labelLines = wrapLabel(p.node.label, 12);
        const lineHeight = fontSize * 1.15;
        const totalH = labelLines.length * lineHeight;

        // Convergent ring (cyan halo)
        const ring = p.node.visual_treatment === 'convergent'
            ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r + 6).toFixed(1)}" fill="none" stroke="${t.cyanRing}" stroke-width="2" opacity="0.55"/>`
            : '';

        const dataChunkIds = (p.node.chunk_ids || []).slice(0, 12).join(',');

        // Root: light panel disc + thick ACCENT ring + centred ACCENT hub glyph (no text).
        // The glyph must NOT sit on the accent fill (accent-on-accent = invisible); a light
        // panel disc with an accent ring keeps the hub identity AND guarantees glyph contrast.
        // Others: panel disc + wrapped label.
        let body: string;
        if (isRoot) {
            // The hub GLYPH is rendered as an HTML <img> overlay (see below) so the PPTX GEO walker
            // captures it as a NATIVE picture placeholder; the SVG only draws the disc + accent ring.
            body = `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${t.panelFill}" stroke="${t.accent}" stroke-width="4"/>`;
        } else {
            const textElements = labelLines.map((line, idx) => {
                const dy = -totalH / 2 + (idx + 0.7) * lineHeight;
                return `<tspan x="${p.x.toFixed(1)}" dy="${idx === 0 ? dy.toFixed(1) : lineHeight.toFixed(1)}">${escapeHtml(line)}</tspan>`;
            }).join('');
            body = `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
                `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-family="${t.bodyFont}" font-size="${fontSize}" font-weight="600" fill="${t.titleColor}" text-anchor="middle" dominant-baseline="middle">${textElements}</text>`;
        }

        nodes.push(
            `<g data-node-id="${escapeHtml(p.node.id)}" data-node-label="${escapeHtml(p.node.label)}" data-chunk-ids="${escapeHtml(dataChunkIds)}" data-node-type="${escapeHtml(p.node.type)}" data-convergent="${p.node.visual_treatment === 'convergent' ? '1' : '0'}">` +
            ring + body + `</g>`
        );
    }

    // Legend
    const groupCount = input.output.root.children.length;
    const themeCount = input.output.root.children.reduce((sum, g) => sum + g.children.length, 0);

    const goalEsc = escapeHtml(input.researchGoal || 'Mind Map');
    // 2026-05-25 - Run ID stamp removed. Reporting-depth metadata is process
    // narration; the reader of a finished artifact must never see it. Hash is
    // still computed and stored in the artifact's data-* attributes for audit
    // tooling, but is not rendered as visible chrome.
    const runIdLine = '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${goalEsc}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; background: ${t.pageBg}; overflow: hidden; }
  body { font-family: ${t.bodyFont}; color: ${t.bodyColor}; position: relative; }
  .mm-frame { width: 1920px; height: 1080px; padding: 50px 60px 40px 60px; position: relative; }
  .mm-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px; padding-bottom: 14px; border-bottom: 1px solid ${t.hair}; }
  .mm-kicker { font-family: ${t.monoFont}; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: ${t.mutedColor}; margin-bottom: 6px; }
  .mm-title { font-family: ${t.titleFont}; font-weight: ${t.titleWeight}; font-size: 42px; color: ${t.titleColor}; letter-spacing: 0.01em; line-height: 1; }
  .mm-meta { text-align: right; font-family: ${t.monoFont}; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: ${t.mutedColor}; }
  .mm-meta div { margin-bottom: 4px; }
  .mm-meta span { color: ${t.accent}; font-weight: 700; }
  .mm-runid { margin-top: 6px; font-family: ${t.monoFont}; font-size: 9px; color: ${t.mutedColor}; }
  .mm-runid span { color: ${t.accent}; }
  .mm-canvas { position: relative; width: 100%; height: calc(100% - 96px); }
  .mm-legend { position: absolute; bottom: 12px; left: 60px; right: 60px; display: flex; gap: 28px; align-items: center; font-family: ${t.monoFont}; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: ${t.mutedColor}; }
  .mm-legend .mm-sw { display: inline-block; width: 14px; height: 14px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  .mm-legend .mm-conv { background: ${t.canvasBg}; border: 2px solid ${t.cyanRing}; }
  .mm-legend .mm-grp { background: ${t.canvasBg}; border: 2px solid ${t.accent}; }
  .mm-legend .mm-thin { background: ${t.thinFill}; border: 1px solid ${t.mutedColor}; }
</style>
</head>
<body>
<div class="mm-frame">
  <header class="mm-header">
    <div>
      <div class="mm-kicker">Mind Map · ${escapeHtml(input.brand.toUpperCase())}</div>
      <h1 class="mm-title">${goalEsc}</h1>
    </div>
    <div class="mm-meta">
      <div>Groups <span>${groupCount}</span></div>
      <div>Themes <span>${themeCount}</span></div>
      <div>Convergent <span>${input.output.convergent_count}</span></div>
      ${runIdLine}
    </div>
  </header>
  <div class="mm-canvas">
    <div style="position:relative;width:1800px;height:900px;margin:0 auto;">
      <svg width="1800" height="900" viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        ${edges.join('\n      ')}
        ${nodes.join('\n      ')}
      </svg>
      ${hubGlyphHref ? `<img class="mm-hub-glyph" src="${hubGlyphHref}" alt="" style="position:absolute;left:${(CENTER_X / SVG_W * 100).toFixed(3)}%;top:${(CENTER_Y / SVG_H * 100).toFixed(3)}%;width:84px;height:84px;transform:translate(-50%,-50%);object-fit:contain;pointer-events:none;"/>` : ''}
    </div>
  </div>
  <div class="mm-legend">
    <div><span class="mm-sw mm-conv"></span>Convergent evidence (≥2 source types)</div>
    <div><span class="mm-sw mm-grp"></span>Theme group</div>
    <div><span class="mm-sw mm-thin"></span>Thin evidence (&lt;2 sources)</div>
    <div style="margin-left:auto; font-style:italic; opacity:0.7;">Click any node to drill into its evidence</div>
  </div>
</div>
<script>
  // 2026-05-26 - Click-to-chat drill-down. Each node carries its chunk
  // ids as data-chunk-ids. Click sends a postMessage to the parent
  // window with the node label + chunk ids; the parent (CorpusChatPanel)
  // pre-populates a chat query targeting those chunks.
  (function setupMindMapDrillDown() {
    var nodes = document.querySelectorAll('g[data-node-id]');
    for (var i = 0; i < nodes.length; i++) {
      var g = nodes[i];
      g.style.cursor = 'pointer';
      g.addEventListener('click', function(e) {
        var target = e.currentTarget;
        var label = target.getAttribute('data-node-label') || '';
        var chunkIds = target.getAttribute('data-chunk-ids') || '';
        var nodeType = target.getAttribute('data-node-type') || '';
        if (!label) return;
        try {
          window.parent.postMessage({
            type: 'hic.mindmap.nodeClick',
            label: label,
            chunkIds: chunkIds.split(',').filter(function(x) { return x; }),
            nodeType: nodeType,
          }, '*');
        } catch (err) {
          console.warn('[mindmap] postMessage failed', err);
        }
        // Visual feedback: brief outline pulse
        var circle = target.querySelector('circle');
        if (circle) {
          var origStroke = circle.getAttribute('stroke-width') || '2';
          circle.setAttribute('stroke-width', '6');
          setTimeout(function() { circle.setAttribute('stroke-width', origStroke); }, 220);
        }
      });
    }
  })();
</script>
</body>
</html>`;
}
