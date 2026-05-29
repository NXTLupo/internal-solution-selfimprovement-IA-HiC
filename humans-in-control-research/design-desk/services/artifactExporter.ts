/**
 * Artifact exporter — renders the artifact OFF-SCREEN at native 1808x870
 * resolution (16:9 body area inside a 1920x1080 slide), triggers reactflow
 * fit-view so all nodes are in frame, captures via html-to-image, then
 * composites slide chrome (title, accent strip, footer) programmatically:
 *   - PPTX: vector text frames (editable in PowerPoint)
 *   - PNG / PDF: drawn on a 2D canvas at exact 1920x1080 pixels
 *
 * Why off-screen: the chat preview's slide projection is small (~800x320 body)
 * which constrains reactflow's viewport. Capturing it at that size and scaling
 * up gives a tiny chart inside a big slide. By mounting the renderer in a
 * detached div at the export body's native size (1808x870), reactflow's
 * fit-view distributes nodes across the full export resolution.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import type { Artifact } from '../types';
import type { DesignTokens } from './designMdLoader';
import { OrgChartCanvas } from '../components/OrgChartCanvas';
import { NxtDocViewer } from '../components/NxtDocViewer';
import {
    walkDocumentToSpecs,
    SLIDE_W_IN,
    SLIDE_H_IN,
    type RenderSpec,
    type RectSpec,
    type OvalSpec,
    type LineSpec,
    type TextSpec,
    type PathSpec,
    type GradientSpec,
    type ImageSpec,
    type PathPoint,
} from './domToPptx';

// 1:1 EXPORT FONT FIX (2026-05-29): fetch the brand fonts as same-origin
// base64 @font-face CSS from the proxy and feed them to html-to-image via
// . This replaces  (which rasterized fallback
// fonts, breaking preview-vs-export parity). Cached after first fetch.
let _brandFontCss: string | null = null;
async function _getBrandFontEmbedCSS(): Promise<string> {
    if (_brandFontCss !== null) return _brandFontCss;
    try {
        const r = await fetch('http://127.0.0.1:5012/api/fonts/embed-css');
        _brandFontCss = r.ok ? await r.text() : '';
    } catch { _brandFontCss = ''; }
    return _brandFontCss;
}

// ============================================================
// FREEFORM EXPORT PATH
// Freeform artifacts are FULL 1920x1080 HTML documents (their own slide chrome
// is baked into the exemplar HTML the model inherits). The legacy off-screen
// chrome composition path below would duplicate the title bar and footer.
// Instead: capture the live FreeformViewer iframe at native 1920x1080 and emit
// it directly. For PPTX, walk the iframe DOM for vector-text overlay so text
// is editable in PowerPoint.
// ============================================================

const FREEFORM_NATIVE_W = 1920;
const FREEFORM_NATIVE_H = 1080;

function findFreeformIframe(artifactId: string): HTMLIFrameElement | null {
    const container = document.querySelector(`[data-freeform-viewer][data-artifact-id="${CSS.escape(artifactId)}"]`);
    if (!container) return null;
    return container.querySelector('iframe') as HTMLIFrameElement | null;
}

async function waitForIframeReady(iframe: HTMLIFrameElement): Promise<void> {
    const doc = iframe.contentDocument;
    if (!doc) return;
    if (doc.readyState !== 'complete') {
        await new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }));
    }
    try { await (doc.fonts?.ready ?? Promise.resolve()); } catch { /* non-fatal */ }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

async function captureFreeformAtNative(artifactId: string): Promise<string> {
    const iframe = findFreeformIframe(artifactId);
    if (!iframe) throw new Error(`freeform export: iframe not found for artifact ${artifactId} (is it currently rendered?)`);
    await waitForIframeReady(iframe);
    const target = iframe.contentDocument?.documentElement;
    if (!target) throw new Error('freeform export: iframe contentDocument not accessible');
    return toPng(target, {
        width: FREEFORM_NATIVE_W,
        height: FREEFORM_NATIVE_H,
        canvasWidth: FREEFORM_NATIVE_W * 2,
        canvasHeight: FREEFORM_NATIVE_H * 2,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        skipFonts: false,
        fontEmbedCSS: await _getBrandFontEmbedCSS(),
        filter: (node: Node) => {
            if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') return false;
            return true;
        },
    });
}

// Slide geometry helpers (`SLIDE_W_IN`, `SLIDE_H_IN`, `pxToSlidePt`) and the
// text-run / DOM-walker logic now live in `domToPptx.ts`. PNG/PDF still need
// the rasterized capture (no editable shapes there); only the PPTX path
// switched to native-primitive emission.

async function exportFreeformPng(artifact: Artifact): Promise<void> {
    const dataUrl = await captureFreeformAtNative(artifact.id);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${(artifact as any).kind ?? 'freeform'}-${artifact.id}.png`;
    a.click();
}

async function exportFreeformPdf(artifact: Artifact): Promise<void> {
    const dataUrl = await captureFreeformAtNative(artifact.id);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.333, 7.5] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, 13.333, 7.5);
    pdf.save(`${(artifact as any).kind ?? 'freeform'}-${artifact.id}.pdf`);
}

async function exportFreeformPptx(artifact: Artifact): Promise<void> {
    const iframe = findFreeformIframe(artifact.id);
    if (!iframe) throw new Error(`freeform export: iframe not found for artifact ${artifact.id}`);
    await waitForIframeReady(iframe);

    // NATIVE-PPTX path (HiC-PPTX-Native). Walk the rendered DOM and emit a
    // stream of RenderSpecs for every visible element. Each spec maps to a
    // native PPTX primitive: rect / oval / line / text / customGeom path /
    // gradient. NO rasterization of the slide as a whole — every box, line,
    // node, label, and atmospheric overlay is editable in PowerPoint.
    //
    // Skip the .grain overlay (it's a tiny SVG noise pattern that's purely
    // decorative; converting its individual tiles would inflate the PPTX
    // significantly without visual benefit).
    // Skip purely decorative atmospheric layers — they exist to add visual
    // depth in the canvas preview but PPTX exports are intentionally flat
    // clean minimal (per user direction). Skipping them produces smaller
    // files and cleaner native-shape output. Iconography (<use> elements)
    // is preserved via rasterizeElement → small embedded PNG per icon.
    const specs = await walkDocumentToSpecs(iframe, {
        skipSelectors: [
            '.grain',           // SVG noise pattern
            '.atmos-violet-tr', // top-right radial blob
            '.atmos-red-bl',    // bottom-left radial blob
            '.atmos-teal-bl',   // teal blob (NXT exemplar)
            '.atmos-yellow-tr', // chartreuse blob (NXT exemplar)
            '[class*="atmos-"]',// safety net for any other atmos-* layer
        ],
        // Rasterize SVG <use> icons + any HTML element with unsupported
        // CSS (filter, backdrop-filter, mix-blend-mode, clip-path,
        // non-identity transform). Each is captured at native pixel density
        // and embedded as an Image; the rest of the slide stays editable.
        rasterizeElement: async (el) => {
            try {
                const rect = el.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) return null;
                const w = Math.max(8, Math.round(rect.width));
                const h = Math.max(8, Math.round(rect.height));
                return await toPng(el, {
                    width: w,
                    height: h,
                    canvasWidth: w * 2,
                    canvasHeight: h * 2,
                    pixelRatio: 2,
                    backgroundColor: undefined,
                    cacheBust: true,
                    skipFonts: false,
                    fontEmbedCSS: await _getBrandFontEmbedCSS(),
                });
            } catch (err) {
                console.warn('[exportFreeformPptx] rasterizeElement failed', err);
                return null;
            }
        },
    });

    // POST RenderSpec[] to the proxy, which renders OOXML directly via
    // python-pptx + lxml and embeds EOT-wrapped brand fonts (Archivo, Fraunces,
    // Inter, JetBrains Mono). This bypasses PptxGenJS entirely — every OOXML
    // bug we fought (empty <a:ln></a:ln>, charSpacing units, malformed
    // custGeom, theme drop shadows, font substitution to Arial) is gone.
    // The walker stays — only the backend emit changes.
    const PROXY_BASE = 'http://127.0.0.1:5012';
    const filename = `${(artifact as any).kind ?? 'freeform'}-${artifact.id}.pptx`;

    if ((window as any).__NXT_PPTX_DEBUG__) {
        console.info('[exportFreeformPptx] full spec dump:', JSON.parse(JSON.stringify(specs)));
    }

    const response = await fetch(`${PROXY_BASE}/api/export-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specs, filename }),
        signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`PPTX export failed (${response.status}): ${errText}`);
    }

    const renderCounts = response.headers.get('X-Render-Counts');
    console.info(
        `[exportFreeformPptx] specs walked=${specs.length} | proxy rendered=${renderCounts} | artifact=${artifact.id}`,
    );

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// RenderSpec → PPTX primitive emitters
// ============================================================================

function alphaToTransparency(alpha: number | undefined): number {
    // PPTX transparency: 0 = fully opaque, 100 = fully transparent.
    // Our alpha: 0..1. transparency = (1 - alpha) * 100.
    if (alpha === undefined || alpha >= 0.99) return 0;
    if (alpha <= 0.01) return 100;
    return Math.round((1 - alpha) * 100);
}

/**
 * Per-spec-type emit toggles. Used to isolate which spec type produces
 * invalid OOXML when PowerPoint shows the "found a problem with content"
 * repair dialog. Toggle individual flags via `window.__NXT_EMIT_TOGGLES__`
 * in the browser console BEFORE clicking export, e.g.:
 *   window.__NXT_EMIT_TOGGLES__ = { rect: false, oval: false, line: false, path: false, text: true };
 * Defaults: everything on. Gradients/images stay off (per user direction +
 * empty data URL).
 */
function emitSpec(pptx: any, slide: any, spec: RenderSpec): void {
    const toggles = (window as any).__NXT_EMIT_TOGGLES__ ?? {};
    switch (spec.type) {
        case 'rect':     if (toggles.rect !== false) emitRect(pptx, slide, spec); return;
        case 'oval':     if (toggles.oval !== false) emitOval(pptx, slide, spec); return;
        case 'line':     if (toggles.line !== false) emitLine(pptx, slide, spec); return;
        case 'text':     if (toggles.text !== false) emitText(slide, spec); return;
        case 'path':     if (toggles.path !== false) emitPath(pptx, slide, spec); return;
        case 'gradient': /* always off — per user direction */ return;
        case 'image':    if (toggles.image !== false) emitImage(slide, spec); return;
    }
}

// Slide bounds — anything outside these dimensions is clipped or skipped.
const SLIDE_MAX_X = SLIDE_W_IN;
const SLIDE_MAX_Y = SLIDE_H_IN;

/** Validate a hex color string. PptxGenJS expects exactly 6 hex chars, no #. */
function validHex(hex: string | undefined): hex is string {
    if (!hex) return false;
    return /^[0-9A-F]{6}$/i.test(hex);
}

/** Returns true if the spec falls completely outside the slide bounds. */
function outOfBounds(x: number, y: number, w: number, h: number): boolean {
    if (x > SLIDE_MAX_X || y > SLIDE_MAX_Y) return true;
    if (x + w < 0 || y + h < 0) return true;
    return false;
}

/**
 * Build a fill object. Mirrors the LEGACY pattern from `exportPptx` (which
 * works) — every shape gets a fill, even if it's `{ type: 'none' }` for
 * "transparent". Empty/undefined fill objects produce malformed OOXML in
 * PptxGenJS 3.12.x, triggering PowerPoint's "found a problem with content"
 * repair dialog.
 */
function buildFill(hex: string | undefined, alpha: number | undefined): any {
    if (!validHex(hex)) return { type: 'none' };
    const t = alphaToTransparency(alpha);
    return t > 0 ? { color: hex, transparency: t } : { color: hex };
}

/**
 * Build a line object. Always returns a line — `{ width: 0 }` for "no border"
 * matches the legacy pattern. Omitting `line` entirely produces malformed
 * OOXML (the legacy `exportPptx` always passes both fill AND line, even
 * with width=0 for borderless shapes).
 */
function buildLine(hex: string | undefined, width: number | undefined, dash?: string): any {
    if (!validHex(hex) || !width || width <= 0) {
        return { color: 'FFFFFF', width: 0 };
    }
    const out: any = { color: hex, width };
    if (dash && dash !== 'solid') out.dashType = dash;
    return out;
}

function emitRect(pptx: any, slide: any, s: RectSpec): void {
    if (s.w < 0.01 || s.h < 0.01) return;
    if (outOfBounds(s.x, s.y, s.w, s.h)) return;
    if (!validHex(s.fillHex) && !validHex(s.strokeHex)) return; // nothing visible

    const fill = buildFill(s.fillHex, s.fillAlpha);
    const line = buildLine(s.strokeHex, s.strokeWidth, s.dash);
    const shapeName = (s.rxIn && s.rxIn > 0.01) ? 'roundRect' : 'rect';
    const opts: any = {
        x: s.x, y: s.y, w: s.w, h: s.h,
        fill,
        line,
    };
    if (s.rxIn && shapeName === 'roundRect') opts.rectRadius = s.rxIn;
    slide.addShape(shapeName, opts);
}

function emitOval(pptx: any, slide: any, s: OvalSpec): void {
    if (s.w < 0.01 || s.h < 0.01) return;
    if (outOfBounds(s.x, s.y, s.w, s.h)) return;
    if (!validHex(s.fillHex) && !validHex(s.strokeHex)) return;

    const fill = buildFill(s.fillHex, s.fillAlpha);
    const line = buildLine(s.strokeHex, s.strokeWidth);
    slide.addShape('ellipse', {
        x: s.x, y: s.y, w: s.w, h: s.h,
        fill,
        line,
    });
}

function emitLine(pptx: any, slide: any, s: LineSpec): void {
    if (!validHex(s.strokeHex) || !s.strokeWidth || s.strokeWidth <= 0) return;
    if (Math.abs(s.w) < 0.001 && Math.abs(s.h) < 0.001) return;
    if (outOfBounds(s.x, s.y, Math.abs(s.w), Math.abs(s.h))) return;

    const lineOpts: any = { color: s.strokeHex, width: s.strokeWidth };
    if (s.dash && s.dash !== 'solid') lineOpts.dashType = s.dash;
    if (s.arrowStart) lineOpts.beginArrowType = 'triangle';
    if (s.arrowEnd) lineOpts.endArrowType = 'triangle';

    slide.addShape('line', {
        x: s.x, y: s.y, w: s.w, h: s.h,
        line: lineOpts,
    });
}

// Text sanitization moved to domToPptx.ts (sanitizeForXml + buildRun) so it
// runs ONCE per run during the walk, not per emit. The function below is
// orphaned dead code left in place to avoid touching control-character
// literals that confuse the editing machinery; the build's tree-shaker
// removes it from the final bundle.
function _unused_sanitizeText(s: string): string {
    return s
        .replace(/﻿/g, '')           // BOM
        .replace(/[​-‏]/g, '')  // zero-width spaces, RTL/LTR marks
        .replace(/[‪-‮]/g, '')  // bidi formatting
        .replace(/[ --]/g, '') // control chars
        .replace(/\s+/g, ' ')
        .trim();
}

function emitText(slide: any, s: TextSpec): void {
    if (!s.runs || s.runs.length === 0) return;
    if (s.w < 0.01 || s.h < 0.01) return;
    if (outOfBounds(s.x, s.y, s.w, s.h)) return;

    // Clamp coordinates to slide bounds.
    const x = Math.max(0, Math.min(s.x, SLIDE_W_IN - 0.05));
    const y = Math.max(0, Math.min(s.y, SLIDE_H_IN - 0.05));
    const w = Math.min(s.w, SLIDE_W_IN - x);
    const h = Math.min(s.h, SLIDE_H_IN - y);

    // Build PptxGenJS multi-run text array. For a frame with 1 run this is
    // identical to a single-string addText. For inline-formatted text (h1
    // with em, p with b inserts) each run carries its own style — italic
    // Fraunces phrases, bold inserts, smaller sub-lines all retain fidelity.
    const runArray: any[] = [];
    for (const r of s.runs) {
        if (!r.text) continue;
        if (!validHex(r.colorHex)) continue;
        if (!r.fontSizePt || r.fontSizePt < 1 || r.fontSizePt > 200) continue;
        const runOpts: any = {
            fontFace: r.fontFamily || 'Archivo',
            fontSize: r.fontSizePt,
            color: r.colorHex,
            bold: r.fontWeight >= 600,
        };
        if (r.italic) runOpts.italic = true;
        if (r.underline) runOpts.underline = { style: 'sng' };
        if (r.charSpacing && r.charSpacing > 0 && r.charSpacing < 1000) {
            runOpts.charSpacing = r.charSpacing;
        }
        runArray.push({ text: r.text, options: runOpts });
    }
    if (runArray.length === 0) return;

    // CRITICAL: explicit `line` + `fill` together (legacy pattern). Without
    // an explicit line option PptxGenJS emits empty `<a:ln></a:ln>` —
    // invalid OOXML that triggers the repair dialog at high frame counts.
    const frameOpts: any = {
        x, y, w, h,
        align: s.align,
        valign: s.valign,
        margin: 0,
        fill: { type: 'none' },
        line: { color: 'FFFFFF', width: 0 },
        wrap: false,
        autoFit: false,
    };
    slide.addText(runArray, frameOpts);
}

/**
 * Emit a path as a sequence of native PPTX line segments. We deliberately
 * avoid `custGeom` (PptxGenJS support is incomplete and produces invalid
 * OOXML in 3.12.x — PowerPoint shows a "found a problem with content"
 * repair dialog). The line-segment fallback is robust and keeps every
 * segment editable in PowerPoint. Curves are sampled into a polyline.
 */
function emitPath(pptx: any, slide: any, s: PathSpec): void {
    if (s.w < 0.01 || s.h < 0.01 || s.points.length === 0) return;
    if (!s.strokeHex || !s.strokeWidth || s.strokeWidth <= 0) return;

    const lineOpts = { color: s.strokeHex, width: s.strokeWidth };
    const abs = s.points.map(p => normalizedPointToAbs(p, s));

    // Per-curve-segment sample count. Lower = fewer micro-line shapes (we
    // were emitting 8 per Bezier × ~30 Beziers per glyph = 240+ lines per
    // icon, blowing up the slide to 500+ shapes and triggering PowerPoint's
    // repair dialog on the malformed content). 4 is enough for visual
    // smoothness on the brand seal at 1920×1080.
    const CURVE_SAMPLES = 4;

    let prev: { x: number; y: number } | null = null;
    let subStart: { x: number; y: number } | null = null;
    for (const p of abs) {
        if (p.type === 'move') {
            prev = { x: p.x, y: p.y };
            subStart = { x: p.x, y: p.y };
        } else if (p.type === 'line' && prev) {
            emitLineSegment(slide, prev, { x: p.x, y: p.y }, lineOpts);
            prev = { x: p.x, y: p.y };
        } else if ((p.type === 'curve' || p.type === 'quadratic') && prev) {
            const samples = sampleCurve(prev, p, CURVE_SAMPLES);
            for (let i = 0; i < samples.length - 1; i++) {
                emitLineSegment(slide, samples[i], samples[i + 1], lineOpts);
            }
            prev = { x: p.x, y: p.y };
        } else if (p.type === 'close' && prev && subStart) {
            emitLineSegment(slide, prev, subStart, lineOpts);
            prev = { x: subStart.x, y: subStart.y };
        }
    }
}

function emitLineSegment(slide: any, from: { x: number; y: number }, to: { x: number; y: number }, lineOpts: any): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return; // zero-length segment
    slide.addShape('line', {
        x: from.x, y: from.y,
        w: dx, h: dy, // sign preserves direction; pure horizontal/vertical = 0
        line: lineOpts,
    });
}

type AbsPoint =
    | { type: 'move'; x: number; y: number }
    | { type: 'line'; x: number; y: number }
    | { type: 'curve'; x: number; y: number; cx1: number; cy1: number; cx2: number; cy2: number }
    | { type: 'quadratic'; x: number; y: number; cx: number; cy: number }
    | { type: 'close' };

function normalizedPointToAbs(p: PathPoint, s: PathSpec): AbsPoint {
    const ax = (n: number) => s.x + n * s.w;
    const ay = (n: number) => s.y + n * s.h;
    if (p.type === 'close') return { type: 'close' };
    if (p.type === 'move') return { type: 'move', x: ax(p.x), y: ay(p.y) };
    if (p.type === 'line') return { type: 'line', x: ax(p.x), y: ay(p.y) };
    if (p.type === 'curve') return { type: 'curve', x: ax(p.x), y: ay(p.y), cx1: ax(p.cx1), cy1: ay(p.cy1), cx2: ax(p.cx2), cy2: ay(p.cy2) };
    return { type: 'quadratic', x: ax(p.x), y: ay(p.y), cx: ax(p.cx), cy: ay(p.cy) };
}

function sampleCurve(start: { x: number; y: number }, end: AbsPoint, samples: number): Array<{ x: number; y: number }> {
    const out: Array<{ x: number; y: number }> = [{ x: start.x, y: start.y }];
    if (end.type === 'curve') {
        for (let i = 1; i <= samples; i++) {
            const t = i / samples;
            const omt = 1 - t;
            const x = omt * omt * omt * start.x + 3 * omt * omt * t * end.cx1 + 3 * omt * t * t * end.cx2 + t * t * t * end.x;
            const y = omt * omt * omt * start.y + 3 * omt * omt * t * end.cy1 + 3 * omt * t * t * end.cy2 + t * t * t * end.y;
            out.push({ x, y });
        }
    } else if (end.type === 'quadratic') {
        for (let i = 1; i <= samples; i++) {
            const t = i / samples;
            const omt = 1 - t;
            const x = omt * omt * start.x + 2 * omt * t * end.cx + t * t * end.x;
            const y = omt * omt * start.y + 2 * omt * t * end.cy + t * t * end.y;
            out.push({ x, y });
        }
    }
    return out;
}

function emitGradient(pptx: any, slide: any, s: GradientSpec): void {
    // Per user direction: NO gradients. Flat clean minimal aesthetic.
    // GradientSpec is no longer emitted by the walker but the dispatcher
    // handler stays for completeness; this is a no-op.
    void pptx; void slide; void s;
}

function emitImage(slide: any, s: ImageSpec): void {
    if (!s.dataUrl) return; // Rasterization failed — silently drop
    slide.addImage({ data: s.dataUrl, x: s.x, y: s.y, w: s.w, h: s.h });
}

const EXPORT_W = 1920;
const EXPORT_H = 1080;
const HEADER_H_PX = 150;
const FOOTER_H_PX = 75;
const BODY_INSET_PX = 56;
const BODY_W_PX = EXPORT_W - BODY_INSET_PX * 2;
const BODY_H_PX = EXPORT_H - HEADER_H_PX - FOOTER_H_PX - 32; // 16px gutter top + bottom

const NXT_PRIMARY = '#0D0D0D';
const NU_PRIMARY = '#141414';
const NXT_ACCENT = '#B8B800';
const NU_ACCENT = '#C8102E';

function brandColors(brand: string): { primary: string; accent: string } {
    if (brand === 'nu') return { primary: NU_PRIMARY, accent: NU_ACCENT };
    return { primary: NXT_PRIMARY, accent: NXT_ACCENT };
}

function waitForLayout(ms = 100): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(resolve, ms);
            });
        });
    });
}

/**
 * For org-chart (reactflow): trigger the built-in fit-view button so all
 * nodes are visible and the viewport transform fills the container.
 */
function fitReactFlowView(container: HTMLElement): void {
    try {
        const btn = container.querySelector<HTMLButtonElement>('button[aria-label="fit view"]')
            ?? container.querySelector<HTMLButtonElement>('.react-flow__controls-fitview');
        if (btn) btn.click();
    } catch { /* non-fatal */ }
}

/**
 * Mount a renderer off-screen at native body resolution, fit content, capture
 * as PNG, unmount. Returns a 1808x870 PNG of the artifact body content alone
 * (no slide chrome).
 */
async function captureArtifactBodyAtNative(
    artifact: Artifact,
    tokens: DesignTokens,
    width: number,
    height: number,
): Promise<string> {
    // Anchor at viewport top-left (NOT off-screen with left:-99999px) so
    // reactflow's IntersectionObserver / ResizeObserver fires and dagre
    // actually runs layout. Hide visually with opacity + pointer-events.
    const container = document.createElement('div');
    container.setAttribute('data-export-stage', '1');
    container.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${width}px;
        height: ${height}px;
        background: #FFFFFF;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
        z-index: 2147483646;
    `;
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    try {
        // Render the appropriate component for this artifact type
        const element = (() => {
            if (artifact.type === 'persona') {
                return React.createElement(NxtDocViewer, { artifact: artifact as any, tokens });
            }
            if (artifact.type === 'org') {
                return React.createElement(OrgChartCanvas, { artifact: artifact as any, tokens });
            }
            return React.createElement('div', { style: { padding: 40, fontFamily: 'sans-serif' } }, 'Unsupported artifact');
        })();

        root.render(element);

        // Wait for the React tree + reactflow / persona doc to fully lay out.
        // Reactflow needs more time than 300ms — dagre layout + node measure + fit-view
        // can each take a frame. Wait long enough for two paint cycles.
        await waitForLayout(600);

        // For reactflow content, trigger fit-view and wait for transform animation
        if (artifact.type === 'org') {
            fitReactFlowView(container);
            await waitForLayout(400);
        }

        // Capture
        // skipFonts: true is REQUIRED — html-to-image otherwise tries to read
        // .cssRules on every <link rel="stylesheet">, and Google Fonts /
        // FontAwesome CDN sheets throw SecurityError (cross-origin), aborting
        // the entire capture to blank. Substituted system fonts render fine.
        const png = await toPng(container, {
            backgroundColor: '#FFFFFF',
            width,
            height,
            canvasWidth: width,
            canvasHeight: height,
            pixelRatio: 1,
            cacheBust: true,
            skipFonts: false,
            fontEmbedCSS: await _getBrandFontEmbedCSS(),
            filter: (node: Node) => {
                // Belt-and-suspenders: drop any <link>/<style> the lib still tries to embed
                if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') return false;
                return true;
            },
            style: { transform: 'none', transformOrigin: 'top left', opacity: '1' },
        });
        return png;
    } finally {
        try { root.unmount(); } catch { /* ignore */ }
        try { container.remove(); } catch { /* ignore */ }
    }
}

function fitInside(imgW: number, imgH: number, boxW: number, boxH: number): { w: number; h: number } {
    const imgRatio = imgW / imgH;
    const boxRatio = boxW / boxH;
    if (imgRatio > boxRatio) return { w: boxW, h: boxW / imgRatio };
    return { w: boxH * imgRatio, h: boxH };
}

async function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function truncateForCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 4 && ctx.measureText(truncated + '...').width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
}

/**
 * Compose a full 1920x1080 slide image: header band + captured artifact body
 * (rendered at native res, fit-viewed, fits cleanly with no stretching) + footer.
 */
async function composeFullSlideImage(artifact: Artifact, tokens: DesignTokens): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_W;
    canvas.height = EXPORT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context for export');

    const { primary, accent } = brandColors(artifact.brand);
    const title = (artifact as any).title ?? (artifact as any).name ?? 'Untitled';
    const brandLabel = `#${artifact.type} / ${artifact.brand.toUpperCase()}`;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

    // Header accent strip
    ctx.fillStyle = accent;
    ctx.fillRect(0, HEADER_H_PX - 8, EXPORT_W, 8);

    // Header label
    ctx.fillStyle = accent;
    ctx.font = 'bold 18px Archivo, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${brandLabel.toUpperCase()} — SLIDE`, BODY_INSET_PX, 42);

    // Header action title
    ctx.fillStyle = primary;
    ctx.font = 'normal 56px "Bebas Neue", Archivo, sans-serif';
    ctx.fillText(truncateForCanvas(ctx, title, EXPORT_W - BODY_INSET_PX * 2), BODY_INSET_PX, 96);

    // Footer band
    const footerY = EXPORT_H - FOOTER_H_PX;
    ctx.fillStyle = primary;
    ctx.fillRect(0, footerY, EXPORT_W, FOOTER_H_PX);
    ctx.fillStyle = accent;
    ctx.font = 'bold 18px Archivo, sans-serif';
    ctx.fillText('NXT HUMANS / DESIGN DESK', BODY_INSET_PX, footerY + FOOTER_H_PX / 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Archivo, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(brandLabel, EXPORT_W - BODY_INSET_PX, footerY + FOOTER_H_PX / 2);
    ctx.textAlign = 'start';

    // Capture artifact body at native body resolution, then place into export
    const bodyImg = await captureArtifactBodyAtNative(artifact, tokens, BODY_W_PX, BODY_H_PX);
    const dim = await getImageDimensions(bodyImg);
    const fit = fitInside(dim.w, dim.h, BODY_W_PX, BODY_H_PX);
    const imgX = BODY_INSET_PX + (BODY_W_PX - fit.w) / 2;
    const imgY = HEADER_H_PX + 16 + (BODY_H_PX - fit.h) / 2;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = bodyImg;
    });
    ctx.drawImage(img, imgX, imgY, fit.w, fit.h);

    return canvas.toDataURL('image/png');
}

export async function exportPng(artifact: Artifact, tokens: DesignTokens): Promise<void> {
    if ((artifact as any).type === 'slide') return exportSlideSpecPng(artifact as any);
    if ((artifact as any).type === 'freeform') return exportFreeformPng(artifact);
    const dataUrl = await composeFullSlideImage(artifact, tokens);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${artifact.type}-${artifact.id}.png`;
    a.click();
}

export async function exportPdf(artifact: Artifact, tokens: DesignTokens): Promise<void> {
    if ((artifact as any).type === 'slide') return exportSlideSpecPdf(artifact as any);
    if ((artifact as any).type === 'freeform') return exportFreeformPdf(artifact);
    const dataUrl = await composeFullSlideImage(artifact, tokens);
    const pdfW = 13.333;
    const pdfH = 7.5;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [pdfW, pdfH] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
    pdf.save(`${artifact.type}-${artifact.id}.pdf`);
}

/**
 * SlideSpec → native PPTX. Schema-valid by construction. NO DOM walking.
 * Reads the typed spec the model produced and emits one PPTX primitive per
 * spec object — text frames stay multi-run, shapes stay native, lines stay
 * directional with arrowheads.
 */
async function exportSlideSpecPptx(artifact: any): Promise<void> {
    const { exportSlideSpecToPptx } = await import('./slidePptxEmitter');
    const fileName = `${artifact.kind ?? 'slide'}-${artifact.id}.pptx`;
    await exportSlideSpecToPptx(artifact.spec, fileName);
}

async function exportSlideSpecPng(artifact: any): Promise<void> {
    // For PNG/PDF we still rasterize the canvas preview (DOM-based) since
    // visual fidelity to the brand chrome (atmospherics, grain, ::before
    // rules) is what the user sees. PPTX path bypasses the DOM entirely.
    const container = document.querySelector(`[data-slide-viewer][data-artifact-id="${CSS.escape(artifact.id)}"]`);
    if (!container) throw new Error('SlideSpec viewer not mounted; cannot rasterize.');
    const target = container.querySelector('div > div > div') as HTMLElement | null;
    if (!target) throw new Error('SlideSpec inner canvas not found.');
    const dataUrl = await toPng(target, {
        width: 1920, height: 1080,
        canvasWidth: 3840, canvasHeight: 2160,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        skipFonts: false,
        fontEmbedCSS: await _getBrandFontEmbedCSS(),
        style: { transform: 'none' },
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${artifact.kind ?? 'slide'}-${artifact.id}.png`;
    a.click();
}

async function exportSlideSpecPdf(artifact: any): Promise<void> {
    const container = document.querySelector(`[data-slide-viewer][data-artifact-id="${CSS.escape(artifact.id)}"]`);
    if (!container) throw new Error('SlideSpec viewer not mounted; cannot rasterize.');
    const target = container.querySelector('div > div > div') as HTMLElement | null;
    if (!target) throw new Error('SlideSpec inner canvas not found.');
    const dataUrl = await toPng(target, {
        width: 1920, height: 1080,
        canvasWidth: 3840, canvasHeight: 2160,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        skipFonts: false,
        fontEmbedCSS: await _getBrandFontEmbedCSS(),
        style: { transform: 'none' },
    });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.333, 7.5] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, 13.333, 7.5);
    pdf.save(`${artifact.kind ?? 'slide'}-${artifact.id}.pdf`);
}

export async function exportPptx(artifact: Artifact, tokens: DesignTokens): Promise<void> {
    if ((artifact as any).type === 'slide') return exportSlideSpecPptx(artifact);
    if ((artifact as any).type === 'freeform') return exportFreeformPptx(artifact);
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'NXT_16x9', width: 13.333, height: 7.5 });
    pptx.layout = 'NXT_16x9';
    const slide = pptx.addSlide();

    const { primary, accent } = brandColors(artifact.brand);
    const title = (artifact as any).title ?? (artifact as any).name ?? 'Untitled';
    const brandLabel = `#${artifact.type} / ${artifact.brand.toUpperCase()}`;
    const accentHex = accent.replace('#', '');
    const primaryHex = primary.replace('#', '');

    // Header accent strip
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0.92, w: 13.333, h: 0.06,
        fill: { color: accentHex }, line: { color: accentHex, width: 0 },
    });
    slide.addText(`${brandLabel.toUpperCase()} — SLIDE`, {
        x: 0.4, y: 0.18, w: 12.5, h: 0.25,
        fontFace: 'Archivo', fontSize: 9, bold: true, color: accentHex,
        charSpacing: 2, valign: 'middle',
    });
    slide.addText(title, {
        x: 0.4, y: 0.42, w: 12.5, h: 0.5,
        fontFace: 'Bebas Neue', fontSize: 28, color: primaryHex,
        charSpacing: 1, valign: 'middle',
    });

    // Footer
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 6.95, w: 13.333, h: 0.55,
        fill: { color: primaryHex }, line: { color: primaryHex, width: 0 },
    });
    slide.addText('NXT HUMANS / DESIGN DESK', {
        x: 0.4, y: 6.95, w: 6, h: 0.55,
        fontFace: 'Archivo', fontSize: 10, bold: true, color: accentHex,
        charSpacing: 2, valign: 'middle',
    });
    slide.addText(brandLabel, {
        x: 7, y: 6.95, w: 5.9, h: 0.55,
        fontFace: 'Archivo', fontSize: 10, color: 'FFFFFF',
        align: 'right', valign: 'middle', charSpacing: 1,
    });

    // Body — capture at native body resolution and embed
    const bodyTopIn = 1.05;
    const bodyHeightIn = 5.85;
    const bodyWidthIn = 12.6;
    const bodyLeftIn = 0.4;

    const bodyImg = await captureArtifactBodyAtNative(artifact, tokens, BODY_W_PX, BODY_H_PX);
    const dim = await getImageDimensions(bodyImg);
    const fit = fitInside(dim.w, dim.h, bodyWidthIn, bodyHeightIn);
    const imgX = bodyLeftIn + (bodyWidthIn - fit.w) / 2;
    const imgY = bodyTopIn + (bodyHeightIn - fit.h) / 2;
    slide.addImage({ data: bodyImg, x: imgX, y: imgY, w: fit.w, h: fit.h });

    await pptx.writeFile({ fileName: `${artifact.type}-${artifact.id}.pptx` });
}
