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
        skipFonts: true,
        filter: (node: Node) => {
            if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') return false;
            return true;
        },
    });
}

interface TextRunSpec {
    text: string;
    rect: { x: number; y: number; w: number; h: number };
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    align: 'left' | 'center' | 'right';
}

function rgbStringToHex(s: string): string {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '000000';
    return [+m[1], +m[2], +m[3]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Slide geometry — kept here so the px→pt conversion can account for the
// source→slide downscale. The iframe viewport is 1920px wide, which at 96dpi is
// 20" wide. The PPTX slide is 13.333" wide (16:9 widescreen). Everything in the
// rasterized background image is downscaled by 13.333/20 = 0.6667× when shown
// on the slide. The vector text overlay must apply the SAME downscale to its
// font sizes — otherwise glyphs come out 1.5× too tall, overflow their frames,
// and wrap/duplicate over the image text. (This was the visible bug.)
const SLIDE_W_IN = 13.333;
const SLIDE_H_IN = 7.5;
const SOURCE_W_IN_AT_96DPI = FREEFORM_NATIVE_W / 96; // 20"
const SOURCE_TO_SLIDE_SCALE = SLIDE_W_IN / SOURCE_W_IN_AT_96DPI; // ~0.6667

function pxToSlidePt(px: number): number {
    // px * 0.75 = standard screen-DPI px→pt; then downscale by source→slide ratio.
    return Math.round(px * 0.75 * SOURCE_TO_SLIDE_SCALE * 100) / 100;
}

function collectFreeformTextRuns(iframe: HTMLIFrameElement): TextRunSpec[] {
    const doc = iframe.contentDocument;
    if (!doc) return [];
    const out: TextRunSpec[] = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
        const text = (n.nodeValue ?? '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const parent = n.parentElement;
        if (!parent) continue;
        if (['STYLE', 'SCRIPT', 'NOSCRIPT'].includes(parent.tagName)) continue;
        const range = doc.createRange();
        range.selectNode(n);
        const rect = range.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 6) continue;
        const cs = (doc.defaultView ?? window).getComputedStyle(parent);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity || '1') < 0.05) continue;
        const fontSize = parseFloat(cs.fontSize) || 14;
        const fontWeight = parseInt(cs.fontWeight, 10) || 400;
        const align = (cs.textAlign === 'center' || cs.textAlign === 'right') ? cs.textAlign as 'center' | 'right' : 'left';
        out.push({
            text,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            fontFamily: (cs.fontFamily || 'Archivo').split(',')[0].replace(/['"]/g, '').trim(),
            fontSize,
            fontWeight: isNaN(fontWeight) ? 400 : fontWeight,
            color: cs.color || 'rgb(0,0,0)',
            align,
        });
    }
    return out;
}

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

    // Collect text runs FIRST, synchronously, while the iframe is in a known
    // ready state. Then capture the image. Doing the async toPng first allowed
    // a window where the iframe could reflow (font load, srcDoc change from a
    // concurrent revision, etc.) so the image and overlay came from different
    // states — visible as ghosted-double text in the exported deck.
    const runs = collectFreeformTextRuns(iframe);
    const dataUrl = await captureFreeformAtNative(artifact.id);

    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'NXT_16x9', width: SLIDE_W_IN, height: SLIDE_H_IN });
    pptx.layout = 'NXT_16x9';
    const slide = pptx.addSlide();

    // Z-ORDER: text frames go FIRST so the image is rendered on top of them.
    // pptxgenjs writes elements in addition order, so later additions sit
    // visually higher in PowerPoint. Putting the rasterized image last means
    // it occludes the vector overlay → user sees a clean rendered slide. The
    // text frames remain editable: in PowerPoint, click the image, "Send to
    // Back", and the editable glyphs appear underneath. Without this, the
    // overlay sat on top of the image and produced the visible double-render.
    for (const r of runs) {
        slide.addText(r.text, {
            x: (r.rect.x / FREEFORM_NATIVE_W) * SLIDE_W_IN,
            y: (r.rect.y / FREEFORM_NATIVE_H) * SLIDE_H_IN,
            w: (r.rect.w / FREEFORM_NATIVE_W) * SLIDE_W_IN,
            h: (r.rect.h / FREEFORM_NATIVE_H) * SLIDE_H_IN,
            fontFace: r.fontFamily,
            fontSize: pxToSlidePt(r.fontSize),
            color: rgbStringToHex(r.color),
            bold: r.fontWeight >= 700,
            align: r.align,
            valign: 'top',
            margin: 0,
            fill: { type: 'none' as any },
        });
    }
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN });
    await pptx.writeFile({ fileName: `${(artifact as any).kind ?? 'freeform'}-${artifact.id}.pptx` });
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
            skipFonts: true,
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
    if ((artifact as any).type === 'freeform') return exportFreeformPng(artifact);
    const dataUrl = await composeFullSlideImage(artifact, tokens);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${artifact.type}-${artifact.id}.png`;
    a.click();
}

export async function exportPdf(artifact: Artifact, tokens: DesignTokens): Promise<void> {
    if ((artifact as any).type === 'freeform') return exportFreeformPdf(artifact);
    const dataUrl = await composeFullSlideImage(artifact, tokens);
    const pdfW = 13.333;
    const pdfH = 7.5;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [pdfW, pdfH] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH);
    pdf.save(`${artifact.type}-${artifact.id}.pdf`);
}

export async function exportPptx(artifact: Artifact, tokens: DesignTokens): Promise<void> {
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
