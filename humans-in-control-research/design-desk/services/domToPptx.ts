/**
 * DOM → native-PPTX converter.
 *
 * Walks a rendered freeform-HTML iframe and emits a stream of RenderSpec
 * objects that map to native PptxGenJS primitives (shapes, lines, ovals,
 * text, custom paths, gradients). The result is a fully editable PowerPoint
 * file where every element — boxes, lane lines, connector arrows, atmospheric
 * gradients, text labels — is a real PPTX shape that operators can select,
 * move, recolor, and edit. NO rasterization of the slide as a whole.
 *
 * Phases:
 *   1. Basic primitives — rect, oval, line, text  (this file)
 *   2. SVG paths → customGeom                      (this file)
 *   3. CSS gradients + per-element raster fallback  (this file)
 *   4. Edge-case polish                              (this file)
 *
 * The walker reads computed styles (final fill / stroke / font / transform),
 * not authored attributes — so brand-locked CSS variables, atmospheric
 * overlays, and inherited values all resolve correctly. Coordinate truth
 * comes from getBoundingClientRect() (HTML) and getCTM() + getBBox() (SVG).
 */

// ============================================================================
// Slide / source geometry
// ============================================================================

export const FREEFORM_NATIVE_W = 1920;
export const FREEFORM_NATIVE_H = 1080;

export const SLIDE_W_IN = 13.333;
export const SLIDE_H_IN = 7.5;

const SOURCE_W_IN_AT_96DPI = FREEFORM_NATIVE_W / 96; // 20"
export const SOURCE_TO_SLIDE_SCALE = SLIDE_W_IN / SOURCE_W_IN_AT_96DPI; // ~0.6667
// Per-walk source width (px) — default 1920 freeform iframe; SlideCanvas passes its own.
let _walkSourceW = FREEFORM_NATIVE_W;

/** px in iframe → inches on slide (uniform scale because 16:9 aspect matches). */
export function pxToSlideIn(px: number): number {
    return Math.round((px / _walkSourceW) * SLIDE_W_IN * 1000) / 1000;
}

/** px font size → slide pt (px → pt × source-to-slide downscale). */
export function pxToSlidePt(px: number): number {
    return Math.round(px * 0.75 * (SLIDE_W_IN / (_walkSourceW / 96)) * 100) / 100;
}

// ============================================================================
// RenderSpec — the intermediate representation
// ============================================================================

export interface BaseSpec {
    /** Z-order index (document order during walk; later = higher z). */
    z: number;
    /** Source element kind for diagnostics. */
    sourceTag?: string;
}

export interface RectSpec extends BaseSpec {
    type: 'rect';
    x: number; y: number; w: number; h: number;
    /** RGB hex string (no leading #) or undefined for no fill. */
    fillHex?: string;
    /** Fill alpha 0–1 (PPTX uses transparency 0–100, inverted). */
    fillAlpha?: number;
    strokeHex?: string;
    strokeWidth?: number;
    /** Border radius in slide inches (uniform corners only — most exemplars use uniform). */
    rxIn?: number;
    /** Dash pattern. */
    dash?: 'solid' | 'dash' | 'sysDot' | 'dashDot';
}

export interface OvalSpec extends BaseSpec {
    type: 'oval';
    x: number; y: number; w: number; h: number;
    fillHex?: string;
    fillAlpha?: number;
    strokeHex?: string;
    strokeWidth?: number;
}

export interface LineSpec extends BaseSpec {
    type: 'line';
    x: number; y: number; w: number; h: number;
    /** Sign of w/h encodes direction; absolute coords used by PptxGenJS. */
    strokeHex: string;
    strokeWidth: number;
    dash?: 'solid' | 'dash' | 'sysDot' | 'dashDot';
    arrowStart?: boolean;
    arrowEnd?: boolean;
}

export interface TextRun {
    text: string;
    fontFamily: string;
    /** In PPTX points (already converted). */
    fontSizePt: number;
    fontWeight: number;
    italic: boolean;
    colorHex: string;
    /** Letter-spacing in points (PptxGenJS multiplies by 100 internally). */
    charSpacing?: number;
    underline?: boolean;
    /** True if this run came from a child element (b/em/span); false for direct
     *  text content of the parent. Used to debug/trace run sourcing. */
    fromChild?: boolean;
}

export interface TextSpec extends BaseSpec {
    type: 'text';
    x: number; y: number; w: number; h: number;
    /** Multiple runs in display order. For inline-formatted text (h1 with em,
     *  p with b, etc.), each run carries its own style so italic Fraunces
     *  phrases and bold call-outs preserve their fidelity. Single-run is
     *  the common case (most labels are uniform style). */
    runs: TextRun[];
    /** Frame-level alignment + valign (applied to all runs). */
    align: 'left' | 'center' | 'right';
    valign: 'top' | 'middle' | 'bottom';
}

export interface PathSpec extends BaseSpec {
    type: 'path';
    x: number; y: number; w: number; h: number;
    /** Normalized path commands relative to the bbox (0..1 coords). */
    points: PathPoint[];
    fillHex?: string;
    fillAlpha?: number;
    strokeHex?: string;
    strokeWidth?: number;
}

export type PathPoint =
    | { type: 'move'; x: number; y: number }
    | { type: 'line'; x: number; y: number }
    | { type: 'curve'; x: number; y: number; cx1: number; cy1: number; cx2: number; cy2: number }
    | { type: 'quadratic'; x: number; y: number; cx: number; cy: number }
    | { type: 'close' };

export interface GradientSpec extends BaseSpec {
    type: 'gradient';
    x: number; y: number; w: number; h: number;
    /** 'radial' or 'linear'. */
    kind: 'radial' | 'linear';
    /** Color stops in order: [{ offset: 0, color, alpha }, …]. */
    stops: Array<{ offset: number; colorHex: string; alpha: number }>;
    /** Linear angle in degrees (0 = left→right). Radial: ignored. */
    angle?: number;
}

export interface ImageSpec extends BaseSpec {
    type: 'image';
    x: number; y: number; w: number; h: number;
    /** data: URL of the rasterized region. */
    dataUrl: string;
}

export type RenderSpec = RectSpec | OvalSpec | LineSpec | TextSpec | PathSpec | GradientSpec | ImageSpec;

// ============================================================================
// Style + color utilities
// ============================================================================

const TRANSPARENT_RE = /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i;

function isTransparent(color: string): boolean {
    if (!color || color === 'transparent') return true;
    if (TRANSPARENT_RE.test(color)) return true;
    const m = color.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
    if (m && parseFloat(m[1]) < 0.01) return true;
    return false;
}

/** Returns { hex, alpha } where alpha is 0..1. */
export function parseColor(color: string): { hex: string; alpha: number } | null {
    if (!color || color === 'transparent') return null;
    let m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (m) {
        const r = +m[1], g = +m[2], b = +m[3];
        const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
        if (a < 0.01) return null;
        const hex = [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
        return { hex, alpha: a };
    }
    m = color.match(/^#([0-9a-fA-F]{3,8})$/);
    if (m) {
        let hex = m[1];
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) return { hex: hex.toUpperCase(), alpha: 1 };
        if (hex.length === 8) {
            const a = parseInt(hex.slice(6, 8), 16) / 255;
            return { hex: hex.slice(0, 6).toUpperCase(), alpha: a };
        }
    }
    return null;
}

/** Map CSS border-style → PPTX dash type. */
function cssBorderStyleToDash(style: string): 'solid' | 'dash' | 'sysDot' | 'dashDot' {
    if (style === 'dashed') return 'dash';
    if (style === 'dotted') return 'sysDot';
    if (style === 'double' || style === 'groove' || style === 'ridge') return 'solid';
    return 'solid';
}

/** Map CSS text-align → PPTX align. */
function cssAlignToPptx(align: string): 'left' | 'center' | 'right' {
    if (align === 'center') return 'center';
    if (align === 'right' || align === 'end') return 'right';
    return 'left';
}

// ============================================================================
// Visibility test
// ============================================================================

function isVisible(el: Element, cs: CSSStyleDeclaration): boolean {
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (cs.display === 'none') return false;
    const opacity = parseFloat(cs.opacity);
    if (!isNaN(opacity) && opacity < 0.05) return false;
    return true;
}

// ============================================================================
// Element classification
// ============================================================================

const SVG_LEAF_TAGS = new Set(['rect', 'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'text']);

/**
 * SVG elements that DEFINE renderable content but never render standalone.
 * Walking into these emits ghost shapes at their internal (defs-local)
 * coordinates — visible as scattered tiny shapes at the slide's top-left.
 */
const SVG_NON_RENDERED_TAGS = new Set([
    'defs', 'symbol', 'marker', 'clippath', 'pattern',
    'lineargradient', 'radialgradient', 'filter', 'mask',
    'style', 'title', 'desc', 'metadata',
    // NOTE: <use> is NOT in this list — it's the element that instantiates
    // a <symbol> at a position. We rasterize <use> elements (preserving
    // icons as small images) rather than walking through to their symbol
    // children (which would decompose icons into hundreds of line segments).
]);

function isSvgNamespace(el: Element): boolean {
    return (el as SVGElement).namespaceURI === 'http://www.w3.org/2000/svg';
}

/**
 * Cross-realm-safe HTML element check. The parent window's `HTMLElement`
 * class is DIFFERENT from the iframe's `contentWindow.HTMLElement`, so
 * `el instanceof HTMLElement` returns false for every element inside the
 * iframe — which is why the entire HTML header/footer of every artifact
 * was missing from the PPTX (only SVG content emitted, HTML branches
 * never triggered). Using namespaceURI works across realms.
 */
function isHtmlElement(el: Element): el is HTMLElement {
    const ns = (el as HTMLElement).namespaceURI;
    return ns === 'http://www.w3.org/1999/xhtml' || ns === null;
}

/**
 * Does this element render its OWN visual rectangle (background or border)?
 * Pure layout containers with no fill/border emit no shape spec.
 */
function hasOwnVisualBox(cs: CSSStyleDeclaration): boolean {
    if (!isTransparent(cs.backgroundColor)) return true;
    const borderW = parseFloat(cs.borderTopWidth) || 0;
    if (borderW > 0 && !isTransparent(cs.borderTopColor)) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    return false;
}

/**
 * Element is a "logical text leaf" if it has direct text content but no
 * element children (other than inline formatting like <b>, <i>, <em>, <strong>).
 * These map to ONE PPTX text frame.
 */
const INLINE_FORMATTING_TAGS = new Set(['B', 'I', 'EM', 'STRONG', 'U', 'S', 'SPAN', 'BR', 'SUP', 'SUB', 'SMALL', 'MARK']);

function isLogicalTextLeaf(el: Element): boolean {
    if (!el.textContent || !el.textContent.trim()) return false;
    let hasNonInlineChild = false;
    for (const child of Array.from(el.children)) {
        if (!INLINE_FORMATTING_TAGS.has(child.tagName.toUpperCase())) {
            hasNonInlineChild = true;
            break;
        }
    }
    return !hasNonInlineChild;
}

// ============================================================================
// HTML element → RectSpec
// ============================================================================

interface BoundingRectLike { left: number; top: number; width: number; height: number; }

/**
 * 2026-05-06 — Per-walk origin offset for per-section / per-slide walks.
 * Set by walkDocumentToSpecs at start of walk, cleared in `finally`. Single-
 * threaded JS makes module-scope state safe between sequential walks.
 *
 * When the renderer exports the interactive presentation, it walks each
 * section element separately and treats it as its own 1920×1080 slide.
 * The walker doesn't know about the section's offset within the page; the
 * caller supplies `originX`/`originY` (typically the section's
 * getBoundingClientRect().left/top) and every captured rect gets translated
 * so the section's top-left becomes slide (0, 0).
 */
let _walkOriginX = 0;
let _walkOriginY = 0;

/**
 * Convert an iframe pixel rect to slide-inch coordinates. The iframe is
 * 1920×1080 and the slide is 13.333×7.5 — both 16:9, so a single uniform
 * scale (`pxToSlideIn`) collapses the math.
 */
function rectToSlideXYWHUniform(rect: BoundingRectLike) {
    return {
        x: pxToSlideIn(rect.left - _walkOriginX),
        y: pxToSlideIn(rect.top - _walkOriginY),
        w: pxToSlideIn(rect.width),
        h: pxToSlideIn(rect.height),
    };
}

function emitHtmlRect(el: HTMLElement, cs: CSSStyleDeclaration, rect: BoundingRectLike, z: number, out: RenderSpec[]): void {
    if (!hasOwnVisualBox(cs)) return;
    const bg = parseColor(cs.backgroundColor);
    const borderColor = parseColor(cs.borderTopColor);
    const borderWidth = parseFloat(cs.borderTopWidth) || 0;

    const { x, y, w, h } = rectToSlideXYWHUniform(rect);
    if (w < 0.01 || h < 0.01) return;

    const borderRadiusPx = parseFloat(cs.borderTopLeftRadius) || 0;
    const rxIn = borderRadiusPx > 0 ? pxToSlideIn(borderRadiusPx) : undefined;

    out.push({
        type: 'rect',
        z,
        sourceTag: el.tagName,
        x, y, w, h,
        fillHex: bg?.hex,
        fillAlpha: bg?.alpha,
        strokeHex: borderWidth > 0 && borderColor ? borderColor.hex : undefined,
        strokeWidth: borderWidth > 0 ? Math.max(0.5, borderWidth * SOURCE_TO_SLIDE_SCALE) : undefined,
        rxIn,
        dash: borderWidth > 0 ? cssBorderStyleToDash(cs.borderTopStyle) : 'solid',
    });
}

// ============================================================================
// SVG element handlers
// ============================================================================

function svgElementBoundingRect(el: SVGGraphicsElement): BoundingRectLike | null {
    try {
        const rect = el.getBoundingClientRect();
        if (rect.width < 0.5 && rect.height < 0.5) return null;
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    } catch {
        return null;
    }
}

function emitSvgRect(el: SVGRectElement, cs: CSSStyleDeclaration, z: number, out: RenderSpec[]): void {
    const rect = svgElementBoundingRect(el);
    if (!rect) return;
    const fill = parseColor(cs.fill);
    const stroke = parseColor(cs.stroke);
    const strokeWidthPx = parseFloat(cs.strokeWidth) || 0;
    const { x, y, w, h } = rectToSlideXYWHUniform(rect);
    const rxAttr = parseFloat(el.getAttribute('rx') || '0');
    const rxIn = rxAttr > 0 ? pxToSlideIn(rxAttr) : undefined;

    out.push({
        type: 'rect',
        z,
        sourceTag: 'svg:rect',
        x, y, w, h,
        fillHex: fill?.hex,
        fillAlpha: fill?.alpha,
        strokeHex: stroke && strokeWidthPx > 0 ? stroke.hex : undefined,
        strokeWidth: strokeWidthPx > 0 ? Math.max(0.5, strokeWidthPx * SOURCE_TO_SLIDE_SCALE) : undefined,
        rxIn,
        dash: parseSvgDashArray(cs.strokeDasharray),
    });
}

function emitSvgOval(el: SVGCircleElement | SVGEllipseElement, cs: CSSStyleDeclaration, z: number, out: RenderSpec[]): void {
    const rect = svgElementBoundingRect(el);
    if (!rect) return;
    const fill = parseColor(cs.fill);
    const stroke = parseColor(cs.stroke);
    const strokeWidthPx = parseFloat(cs.strokeWidth) || 0;
    const { x, y, w, h } = rectToSlideXYWHUniform(rect);

    out.push({
        type: 'oval',
        z,
        sourceTag: el.tagName.toLowerCase(),
        x, y, w, h,
        fillHex: fill?.hex,
        fillAlpha: fill?.alpha,
        strokeHex: stroke && strokeWidthPx > 0 ? stroke.hex : undefined,
        strokeWidth: strokeWidthPx > 0 ? Math.max(0.5, strokeWidthPx * SOURCE_TO_SLIDE_SCALE) : undefined,
    });
}

function emitSvgLine(el: SVGLineElement, cs: CSSStyleDeclaration, z: number, out: RenderSpec[]): void {
    const stroke = parseColor(cs.stroke);
    const strokeWidthPx = parseFloat(cs.strokeWidth) || 0;
    if (!stroke || strokeWidthPx === 0) return;

    const ctm = el.getScreenCTM();
    if (!ctm) return;
    const x1Local = parseFloat(el.getAttribute('x1') || '0');
    const y1Local = parseFloat(el.getAttribute('y1') || '0');
    const x2Local = parseFloat(el.getAttribute('x2') || '0');
    const y2Local = parseFloat(el.getAttribute('y2') || '0');
    const p1 = transformPoint(ctm, x1Local, y1Local);
    const p2 = transformPoint(ctm, x2Local, y2Local);

    // PPTX line shapes anchor at (x, y) and extend by (w, h). w/h CAN be
    // negative — that's how the line direction is encoded. NEVER use
    // Math.abs here: it would flip diagonal lines (a line going up-right
    // would become down-right).
    out.push({
        type: 'line',
        z,
        sourceTag: 'svg:line',
        x: pxToSlideIn(p1.x),
        y: pxToSlideIn(p1.y),
        w: pxToSlideIn(p2.x - p1.x),
        h: pxToSlideIn(p2.y - p1.y),
        strokeHex: stroke.hex,
        strokeWidth: Math.max(0.5, strokeWidthPx * SOURCE_TO_SLIDE_SCALE),
        dash: parseSvgDashArray(cs.strokeDasharray),
        arrowEnd: hasMarkerEnd(el),
        arrowStart: hasMarkerStart(el),
    });
}

function transformPoint(ctm: DOMMatrix, x: number, y: number): { x: number; y: number } {
    return { x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f };
}

function hasMarkerEnd(el: SVGElement): boolean {
    const m = el.getAttribute('marker-end') || (el.ownerDocument?.defaultView ?? window).getComputedStyle(el).markerEnd;
    return !!m && m !== 'none';
}
function hasMarkerStart(el: SVGElement): boolean {
    const m = el.getAttribute('marker-start') || (el.ownerDocument?.defaultView ?? window).getComputedStyle(el).markerStart;
    return !!m && m !== 'none';
}

/**
 * Map an SVG stroke-dasharray to a PptxGenJS-supported dash preset.
 * Valid PptxGenJS dashType values:
 *   solid, dash, dashDot, lgDash, lgDashDot, lgDashDotDot,
 *   sysDash, sysDot, sysDashDot, sysDashDotDot
 * NOTE: plain 'dot' is NOT valid in some PptxGenJS versions and will
 * trigger PowerPoint's "found a problem with content" repair dialog.
 * Use 'sysDot' for short dot patterns.
 */
function parseSvgDashArray(d: string): 'solid' | 'dash' | 'sysDot' | 'dashDot' {
    if (!d || d === 'none') return 'solid';
    const parts = d.split(/[,\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
    if (parts.length === 0) return 'solid';
    if (parts.length === 2 && parts[0] < 2) return 'sysDot';
    if (parts.length === 2) return 'dash';
    if (parts.length >= 4) return 'dashDot';
    return 'dash';
}

// ============================================================================
// SVG path → PathSpec (Phase 2)
// ============================================================================

function emitSvgPath(el: SVGPathElement, cs: CSSStyleDeclaration, z: number, out: RenderSpec[]): void {
    const rect = svgElementBoundingRect(el);
    if (!rect) return;
    const fill = parseColor(cs.fill);
    const stroke = parseColor(cs.stroke);
    const strokeWidthPx = parseFloat(cs.strokeWidth) || 0;
    if (!fill && !(stroke && strokeWidthPx > 0)) return;

    const d = el.getAttribute('d') || '';
    const ctm = el.getScreenCTM();
    if (!ctm) return;
    const points = parseSvgPathToPoints(d, ctm, rect);
    if (points.length === 0) return;

    const { x, y, w, h } = rectToSlideXYWHUniform(rect);

    out.push({
        type: 'path',
        z,
        sourceTag: 'svg:path',
        x, y, w, h,
        points,
        fillHex: fill?.hex,
        fillAlpha: fill?.alpha,
        strokeHex: stroke && strokeWidthPx > 0 ? stroke.hex : undefined,
        strokeWidth: strokeWidthPx > 0 ? Math.max(0.5, strokeWidthPx * SOURCE_TO_SLIDE_SCALE) : undefined,
    });
}

function emitSvgPolygon(el: SVGPolygonElement | SVGPolylineElement, cs: CSSStyleDeclaration, z: number, out: RenderSpec[]): void {
    const rect = svgElementBoundingRect(el);
    if (!rect) return;
    const fill = parseColor(cs.fill);
    const stroke = parseColor(cs.stroke);
    const strokeWidthPx = parseFloat(cs.strokeWidth) || 0;
    if (!fill && !(stroke && strokeWidthPx > 0)) return;

    const ctm = el.getScreenCTM();
    if (!ctm) return;
    const ptsAttr = el.getAttribute('points') || '';
    const rawPts: Array<{ x: number; y: number }> = [];
    const re = /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
    const nums = ptsAttr.match(re)?.map(parseFloat) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
        rawPts.push(transformPoint(ctm, nums[i], nums[i + 1]));
    }
    if (rawPts.length === 0) return;

    const { x, y, w, h } = rectToSlideXYWHUniform(rect);
    const points: PathPoint[] = [];
    rawPts.forEach((p, i) => {
        const localX = (p.x - rect.left) / rect.width;
        const localY = (p.y - rect.top) / rect.height;
        points.push(i === 0 ? { type: 'move', x: localX, y: localY } : { type: 'line', x: localX, y: localY });
    });
    if (el.tagName.toLowerCase() === 'polygon') points.push({ type: 'close' });

    out.push({
        type: 'path',
        z,
        sourceTag: `svg:${el.tagName.toLowerCase()}`,
        x, y, w, h,
        points,
        fillHex: fill?.hex,
        fillAlpha: fill?.alpha,
        strokeHex: stroke && strokeWidthPx > 0 ? stroke.hex : undefined,
        strokeWidth: strokeWidthPx > 0 ? Math.max(0.5, strokeWidthPx * SOURCE_TO_SLIDE_SCALE) : undefined,
    });
}

/**
 * Parse SVG path "d" attribute to a sequence of normalized PathPoints
 * (coordinates in 0..1 relative to the bounding box). Supports M, L, H, V,
 * C, S, Q, T, Z (uppercase + lowercase). Arcs (A) decompose to cubic Beziers.
 */
function parseSvgPathToPoints(d: string, ctm: DOMMatrix, bbox: BoundingRectLike): PathPoint[] {
    const tokens = tokenizePath(d);
    if (tokens.length === 0) return [];
    const out: PathPoint[] = [];

    let cx = 0, cy = 0;     // current point (in SVG user units, before CTM)
    let startX = 0, startY = 0; // subpath start
    let prevCtrlX = 0, prevCtrlY = 0; // last cubic control (for S)
    let prevQctrlX = 0, prevQctrlY = 0; // last quadratic control (for T)
    let lastCmd = '';

    function tx(x: number, y: number) {
        const p = transformPoint(ctm, x, y);
        return { x: (p.x - bbox.left) / bbox.width, y: (p.y - bbox.top) / bbox.height };
    }

    let i = 0;
    while (i < tokens.length) {
        const cmd = tokens[i++] as string;
        const isRel = cmd >= 'a' && cmd <= 'z';
        const upper = cmd.toUpperCase();
        switch (upper) {
            case 'M': {
                const x = tokens[i++] as number, y = tokens[i++] as number;
                cx = isRel ? cx + x : x; cy = isRel ? cy + y : y;
                startX = cx; startY = cy;
                const p = tx(cx, cy);
                out.push({ type: 'move', x: p.x, y: p.y });
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const lx = tokens[i++] as number, ly = tokens[i++] as number;
                    cx = isRel ? cx + lx : lx; cy = isRel ? cy + ly : ly;
                    const lp = tx(cx, cy);
                    out.push({ type: 'line', x: lp.x, y: lp.y });
                }
                break;
            }
            case 'L': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const x = tokens[i++] as number, y = tokens[i++] as number;
                    cx = isRel ? cx + x : x; cy = isRel ? cy + y : y;
                    const p = tx(cx, cy);
                    out.push({ type: 'line', x: p.x, y: p.y });
                }
                break;
            }
            case 'H': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const x = tokens[i++] as number;
                    cx = isRel ? cx + x : x;
                    const p = tx(cx, cy);
                    out.push({ type: 'line', x: p.x, y: p.y });
                }
                break;
            }
            case 'V': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const y = tokens[i++] as number;
                    cy = isRel ? cy + y : y;
                    const p = tx(cx, cy);
                    out.push({ type: 'line', x: p.x, y: p.y });
                }
                break;
            }
            case 'C': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const x1 = tokens[i++] as number, y1 = tokens[i++] as number;
                    const x2 = tokens[i++] as number, y2 = tokens[i++] as number;
                    const x = tokens[i++] as number, y = tokens[i++] as number;
                    const c1x = isRel ? cx + x1 : x1, c1y = isRel ? cy + y1 : y1;
                    const c2x = isRel ? cx + x2 : x2, c2y = isRel ? cy + y2 : y2;
                    const ex = isRel ? cx + x : x, ey = isRel ? cy + y : y;
                    const c1 = tx(c1x, c1y), c2 = tx(c2x, c2y), e = tx(ex, ey);
                    out.push({ type: 'curve', cx1: c1.x, cy1: c1.y, cx2: c2.x, cy2: c2.y, x: e.x, y: e.y });
                    prevCtrlX = c2x; prevCtrlY = c2y;
                    cx = ex; cy = ey;
                }
                break;
            }
            case 'S': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const x2 = tokens[i++] as number, y2 = tokens[i++] as number;
                    const x = tokens[i++] as number, y = tokens[i++] as number;
                    const c1x = (lastCmd === 'C' || lastCmd === 'S') ? 2 * cx - prevCtrlX : cx;
                    const c1y = (lastCmd === 'C' || lastCmd === 'S') ? 2 * cy - prevCtrlY : cy;
                    const c2x = isRel ? cx + x2 : x2, c2y = isRel ? cy + y2 : y2;
                    const ex = isRel ? cx + x : x, ey = isRel ? cy + y : y;
                    const c1 = tx(c1x, c1y), c2 = tx(c2x, c2y), e = tx(ex, ey);
                    out.push({ type: 'curve', cx1: c1.x, cy1: c1.y, cx2: c2.x, cy2: c2.y, x: e.x, y: e.y });
                    prevCtrlX = c2x; prevCtrlY = c2y;
                    cx = ex; cy = ey;
                    lastCmd = 'S';
                }
                continue; // skip the post-loop lastCmd assignment
            }
            case 'Q': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const x1 = tokens[i++] as number, y1 = tokens[i++] as number;
                    const x = tokens[i++] as number, y = tokens[i++] as number;
                    const cqx = isRel ? cx + x1 : x1, cqy = isRel ? cy + y1 : y1;
                    const ex = isRel ? cx + x : x, ey = isRel ? cy + y : y;
                    const c1 = tx(cqx, cqy), e = tx(ex, ey);
                    out.push({ type: 'quadratic', cx: c1.x, cy: c1.y, x: e.x, y: e.y });
                    prevQctrlX = cqx; prevQctrlY = cqy;
                    cx = ex; cy = ey;
                }
                break;
            }
            case 'T': {
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const x = tokens[i++] as number, y = tokens[i++] as number;
                    const cqx = (lastCmd === 'Q' || lastCmd === 'T') ? 2 * cx - prevQctrlX : cx;
                    const cqy = (lastCmd === 'Q' || lastCmd === 'T') ? 2 * cy - prevQctrlY : cy;
                    const ex = isRel ? cx + x : x, ey = isRel ? cy + y : y;
                    const c1 = tx(cqx, cqy), e = tx(ex, ey);
                    out.push({ type: 'quadratic', cx: c1.x, cy: c1.y, x: e.x, y: e.y });
                    prevQctrlX = cqx; prevQctrlY = cqy;
                    cx = ex; cy = ey;
                    lastCmd = 'T';
                }
                continue;
            }
            case 'A': {
                // Arc → approximate via cubic Beziers (1 segment per ≤90° sweep).
                while (i < tokens.length && typeof tokens[i] === 'number') {
                    const rx = tokens[i++] as number;
                    const ry = tokens[i++] as number;
                    const xRot = tokens[i++] as number;
                    const largeArc = (tokens[i++] as number) !== 0;
                    const sweep = (tokens[i++] as number) !== 0;
                    const ex = (isRel ? cx : 0) + (tokens[i++] as number);
                    const ey = (isRel ? cy : 0) + (tokens[i++] as number);
                    const beziers = arcToCubicBeziers(cx, cy, rx, ry, xRot, largeArc, sweep, ex, ey);
                    for (const seg of beziers) {
                        const c1 = tx(seg.c1x, seg.c1y), c2 = tx(seg.c2x, seg.c2y), e = tx(seg.x, seg.y);
                        out.push({ type: 'curve', cx1: c1.x, cy1: c1.y, cx2: c2.x, cy2: c2.y, x: e.x, y: e.y });
                    }
                    cx = ex; cy = ey;
                }
                break;
            }
            case 'Z': {
                out.push({ type: 'close' });
                cx = startX; cy = startY;
                break;
            }
        }
        lastCmd = upper;
    }
    return out;
}

function tokenizePath(d: string): Array<string | number> {
    const tokens: Array<string | number> = [];
    const re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d))) {
        if (m[1]) tokens.push(m[1]);
        else tokens.push(parseFloat(m[2]!));
    }
    return tokens;
}

/** SVG arc → cubic Bezier segments. Implementation per W3C arc-to-curve appendix. */
function arcToCubicBeziers(
    x1: number, y1: number, rx: number, ry: number, phiDeg: number,
    largeArc: boolean, sweep: boolean, x2: number, y2: number,
): Array<{ c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }> {
    const out: Array<{ c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }> = [];
    if (rx === 0 || ry === 0) {
        out.push({ c1x: x1, c1y: y1, c2x: x2, c2y: y2, x: x2, y: y2 });
        return out;
    }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const phi = (phiDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);

    // Step 1: compute (x1', y1')
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;

    // Step 2: ensure radii large enough
    let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
        const sqrtL = Math.sqrt(lambda);
        rx *= sqrtL; ry *= sqrtL;
    }

    // Step 3: compute (cx', cy')
    const sign = largeArc !== sweep ? 1 : -1;
    let sq = (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p) /
             (rx * rx * y1p * y1p + ry * ry * x1p * x1p);
    sq = sq < 0 ? 0 : sq;
    const coef = sign * Math.sqrt(sq);
    const cxp = (coef * rx * y1p) / ry;
    const cyp = (coef * -ry * x1p) / rx;

    // Step 4: compute center (cx, cy)
    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

    // Step 5: compute angle1 / sweep
    const angle = (ux: number, uy: number, vx: number, vy: number) => {
        const dot = ux * vx + uy * vy;
        const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
        let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
        if (ux * vy - uy * vx < 0) a = -a;
        return a;
    };
    const ux1 = (x1p - cxp) / rx, uy1 = (y1p - cyp) / ry;
    const ux2 = (-x1p - cxp) / rx, uy2 = (-y1p - cyp) / ry;
    const theta1 = angle(1, 0, ux1, uy1);
    let deltaTheta = angle(ux1, uy1, ux2, uy2);
    if (!sweep && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
    else if (sweep && deltaTheta < 0) deltaTheta += 2 * Math.PI;

    // Step 6: split into ≤90° pieces and emit cubic for each
    const segments = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
    const dTheta = deltaTheta / segments;
    const t = (8 / 3) * Math.sin(dTheta / 4) * Math.sin(dTheta / 4) / Math.sin(dTheta / 2);
    let theta = theta1;
    let pX = x1, pY = y1;
    for (let s = 0; s < segments; s++) {
        const cosT = Math.cos(theta), sinT = Math.sin(theta);
        const cosT1 = Math.cos(theta + dTheta), sinT1 = Math.sin(theta + dTheta);
        const c1xLocal = cosT - t * sinT;
        const c1yLocal = sinT + t * cosT;
        const c2xLocal = cosT1 + t * sinT1;
        const c2yLocal = sinT1 - t * cosT1;
        const eXLocal = cosT1, eYLocal = sinT1;
        // Transform through ellipse → user space
        const transform = (lx: number, ly: number) => ({
            x: cx + cosPhi * rx * lx - sinPhi * ry * ly,
            y: cy + sinPhi * rx * lx + cosPhi * ry * ly,
        });
        const c1 = transform(c1xLocal, c1yLocal);
        const c2 = transform(c2xLocal, c2yLocal);
        const e = transform(eXLocal, eYLocal);
        out.push({ c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x: e.x, y: e.y });
        theta += dTheta;
        pX = e.x; pY = e.y;
    }
    void pX; void pY;
    return out;
}

// ============================================================================
// SVG <text> handling
// ============================================================================

function emitSvgText(el: SVGTextElement, cs: CSSStyleDeclaration, z: number, out: RenderSpec[]): void {
    const text = sanitizeForXml(el.textContent || '');
    if (!text) return;
    const rect = svgElementBoundingRect(el);
    if (!rect) return;
    const fill = parseColor(cs.fill) ?? parseColor(cs.color) ?? { hex: '0D0D0D', alpha: 1 };

    const fontSize = parseFloat(cs.fontSize) || 14;
    const fontWeight = parseInt(cs.fontWeight, 10) || 400;
    const italic = cs.fontStyle === 'italic';
    const family = (cs.fontFamily || 'Archivo').split(',')[0].replace(/['"]/g, '').trim();

    const anchor = el.getAttribute('text-anchor') || cs.textAnchor || 'start';
    const align: 'left' | 'center' | 'right' =
        anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';

    const widthInflate = Math.max(rect.width * 0.5, 0.3 * 96);
    let inflatedLeft = rect.left;
    let inflatedWidth = rect.width + widthInflate;
    if (align === 'center') inflatedLeft = rect.left - widthInflate / 2;
    else if (align === 'right') inflatedLeft = rect.left - widthInflate;
    const inflatedTop = rect.top - 2;
    const inflatedHeight = rect.height + 6;

    const { x, y, w, h } = rectToSlideXYWHUniform({
        left: inflatedLeft,
        top: inflatedTop,
        width: inflatedWidth,
        height: inflatedHeight,
    });

    out.push({
        type: 'text',
        z,
        sourceTag: 'svg:text',
        x, y, w, h,
        runs: [{
            text,
            fontFamily: family,
            fontSizePt: pxToSlidePt(fontSize),
            fontWeight,
            italic,
            colorHex: fill.hex,
            charSpacing: parseSvgLetterSpacing(cs.letterSpacing),
        }],
        align,
        valign: 'top',
    });
}

/** Strip control chars + BOM + zero-width spaces; normalize whitespace. */
function sanitizeForXml(s: string): string {
    return s
        .replace(/﻿/g, '')                                  // BOM
        .replace(/[​-‏‪-‮]/g, '')             // zero-width + bidi marks
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')         // C0 control chars (keep TAB/LF/CR)
        .replace(/\s+/g, ' ')
        .trim();
}

function parseSvgLetterSpacing(v: string): number | undefined {
    if (!v || v === 'normal') return undefined;
    const px = parseFloat(v);
    if (isNaN(px) || Math.abs(px) < 0.01) return undefined;
    // PptxGenJS `charSpacing` is in POINTS (it multiplies by 100 internally
    // when writing OOXML's `spc` attribute). NOT in 1/100-of-a-point as the
    // docs imply. Passing 120 (instead of 1.2) generated `spc="15000"` =
    // 150pt of letter spacing, which made every glyph break to its own line
    // in PowerPoint. Convert: SVG letter-spacing in px → points = px × 0.75.
    // Apply source→slide downscale so the spacing tracks the box dimensions.
    return Math.round(px * 0.75 * (SLIDE_W_IN / (_walkSourceW / 96)) * 100) / 100;
}

// ============================================================================
// HTML logical text-leaf → TextSpec
// ============================================================================

/**
 * Build a TextRun from an element's computed style + its text content. Used
 * for both the parent-level run (direct text content) and child inline runs
 * (em / b / span / strong, etc).
 */
function buildRun(text: string, cs: CSSStyleDeclaration, fromChild = false): TextRun | null {
    const cleaned = sanitizeForXml(text);
    if (!cleaned) return null;
    const fill = parseColor(cs.color) ?? { hex: '0D0D0D', alpha: 1 };
    const fontSize = parseFloat(cs.fontSize) || 14;
    const fontWeight = parseInt(cs.fontWeight, 10) || 400;
    const italic = cs.fontStyle === 'italic';
    const family = (cs.fontFamily || 'Archivo').split(',')[0].replace(/['"]/g, '').trim();
    const decoration = cs.textDecorationLine || cs.textDecoration || '';
    return {
        text: cleaned,
        fontFamily: family,
        fontSizePt: pxToSlidePt(fontSize),
        fontWeight,
        italic,
        colorHex: fill.hex,
        charSpacing: parseSvgLetterSpacing(cs.letterSpacing),
        underline: decoration.includes('underline'),
        fromChild,
    };
}

/**
 * Walk an HTML element's child nodes (text + inline element children) and
 * collect a flat array of TextRun objects, each carrying its own computed
 * style. This preserves inline formatting fidelity in PPTX — an `<h1>` with
 * an `<em>` inside, a `<p>` with `<b>` inserts, or a `<div>` with a `<span>`
 * sub-line all become multi-run text frames where each segment retains its
 * font/weight/italic/color.
 */
function collectInlineRuns(el: HTMLElement, win: Window): TextRun[] {
    const runs: TextRun[] = [];
    const parentCs = win.getComputedStyle(el);

    function walkNodes(node: Node, currentCs: CSSStyleDeclaration, fromChild: boolean) {
        if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.nodeValue ?? '';
            // Preserve a leading/trailing space if the source had one — it
            // separates adjacent runs ("Who runs " + "the match").
            const hasLead = /^\s/.test(txt);
            const hasTail = /\s$/.test(txt);
            const cleaned = sanitizeForXml(txt);
            if (!cleaned) return;
            const finalText = (hasLead ? ' ' : '') + cleaned + (hasTail ? ' ' : '');
            const run = buildRun(finalText, currentCs, fromChild);
            if (run) {
                run.text = finalText; // restore spaces (sanitize trims)
                runs.push(run);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const childEl = node as HTMLElement;
            const childCs = win.getComputedStyle(childEl);
            // Walk into inline-formatting children with their style
            for (const sub of Array.from(childEl.childNodes)) {
                walkNodes(sub, childCs, true);
            }
        }
    }

    for (const child of Array.from(el.childNodes)) {
        walkNodes(child, parentCs, false);
    }
    return runs;
}

function emitHtmlTextLeaf(el: HTMLElement, cs: CSSStyleDeclaration, rect: BoundingRectLike, z: number, out: RenderSpec[], win: Window): void {
    // Multi-run path: walk child nodes preserving per-run inline formatting.
    // For an <h1>Who runs <em>the match</em>.</h1>, this produces 3 runs:
    //   ["Who runs ", "the match" (italic Fraunces red), "."]
    const runs = collectInlineRuns(el, win);
    if (runs.length === 0) return;

    // 4px padding helps glyphs clear the frame edges when content shifts on
    // edit. Inflate horizontally — PowerPoint's default text inset eats the
    // first ~0.1" so frames sized to the source rect get auto-wrapped per
    // character (the bug the user screenshotted).
    const padX = Math.max(8, rect.width * 0.1);
    const padY = 4;
    const { x, y, w, h } = rectToSlideXYWHUniform({
        left: rect.left - padX,
        top: rect.top - padY,
        width: rect.width + padX * 2,
        height: rect.height + padY * 2,
    });

    const align = cssAlignToPptx(cs.textAlign);
    const valign: 'top' | 'middle' | 'bottom' =
        (cs.alignItems === 'center' || cs.justifyContent === 'center') ? 'middle' : 'top';

    out.push({
        type: 'text',
        z,
        sourceTag: el.tagName,
        x, y, w, h,
        runs,
        align,
        valign,
    });
}

// ============================================================================
// Background gradient → GradientSpec (Phase 3)
// ============================================================================

function emitGradientFromBackground(el: HTMLElement, cs: CSSStyleDeclaration, rect: BoundingRectLike, z: number, out: RenderSpec[]): void {
    const bgImage = cs.backgroundImage;
    if (!bgImage || bgImage === 'none' || !bgImage.includes('gradient')) return;

    // Match radial-gradient(...) or linear-gradient(...)
    const radialMatch = bgImage.match(/radial-gradient\(([^)]+(?:\([^)]*\)[^)]*)?)\)/);
    const linearMatch = bgImage.match(/linear-gradient\(([^)]+(?:\([^)]*\)[^)]*)?)\)/);

    const grad = parseGradient(radialMatch?.[1] ?? linearMatch?.[1] ?? '', !!radialMatch);
    if (!grad) return;

    const { x, y, w, h } = rectToSlideXYWHUniform(rect);
    out.push({
        type: 'gradient',
        z,
        sourceTag: el.tagName + ':bg',
        x, y, w, h,
        kind: grad.kind,
        stops: grad.stops,
        angle: grad.angle,
    });
}

function parseGradient(s: string, isRadial: boolean): { kind: 'radial' | 'linear'; stops: Array<{ offset: number; colorHex: string; alpha: number }>; angle?: number } | null {
    if (!s) return null;
    // Strip the leading "circle at center" / "to bottom" / "180deg" — capture angle for linear.
    let angle: number | undefined;
    if (!isRadial) {
        const angMatch = s.match(/(-?\d+(?:\.\d+)?)deg/);
        if (angMatch) angle = parseFloat(angMatch[1]);
    }
    // Find color stops: rgba(...) ZZ% or #hex ZZ%
    const stopRe = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b)\s*(\d+(?:\.\d+)?%)?/g;
    const stops: Array<{ offset: number; colorHex: string; alpha: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = stopRe.exec(s))) {
        const c = parseColor(m[1]);
        if (!c) continue;
        const offset = m[2] ? parseFloat(m[2]) / 100 : (stops.length === 0 ? 0 : 1);
        stops.push({ offset, colorHex: c.hex, alpha: c.alpha });
        if (stops.length > 6) break; // PPTX practical cap
    }
    if (stops.length < 2) return null;
    return { kind: isRadial ? 'radial' : 'linear', stops, angle };
}

// ============================================================================
// Walker
// ============================================================================

export interface WalkOptions {
    /** Source width in px of the captured root (px->slide scaling). Defaults to the 1920px freeform iframe; SlideCanvas passes its own. */
    sourceWidthPx?: number;
    /** Skip elements matching this selector (e.g., the rasterized atmospheric grain). */
    skipSelectors?: string[];
    /** Async rasterizer used for filter-fallback elements (blur, drop-shadow, backdrop-filter, mix-blend-mode). */
    rasterizeElement?: (el: HTMLElement) => Promise<string | null>;
    /**
     * 2026-05-06 — Walk this element's subtree instead of doc.body. Used
     * by the interactive presentation exporter to walk one section at a
     * time and emit each as its own slide.
     */
    entrypoint?: Element;
    /**
     * 2026-05-06 — Pixel offset to subtract from every captured rect.left
     * before slide-coord conversion. Use the section's
     * getBoundingClientRect().left so the section's visual top-left lands
     * at slide (0, 0).
     */
    originX?: number;
    /**
     * 2026-05-06 — Pixel offset to subtract from every captured rect.top
     * before slide-coord conversion. Use the section's
     * getBoundingClientRect().top so the section's visual top-left lands
     * at slide (0, 0).
     */
    originY?: number;
}

/**
 * Check whether an element uses a CSS feature that PPTX can't reproduce
 * natively. When true, the walker emits a per-element ImageSpec (rasterized
 * preview of just that element's bounding box) instead of trying to
 * decompose its children into primitives. Surrounding 95%+ of the slide
 * stays editable.
 */
function needsRasterFallback(cs: CSSStyleDeclaration): boolean {
    const filter = cs.filter;
    if (filter && filter !== 'none' && /(blur|drop-shadow|invert|hue-rotate|saturate|brightness|contrast)/i.test(filter)) return true;
    const backdrop = (cs as any).backdropFilter as string | undefined;
    if (backdrop && backdrop !== 'none') return true;
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') return true;
    if (cs.clipPath && cs.clipPath !== 'none' && cs.clipPath !== 'auto') return true;
    // Non-identity HTML transforms (rotate / scale / skew). Pure translates
    // are already reflected in getBoundingClientRect, so they pass through.
    const transform = cs.transform;
    if (transform && transform !== 'none' && !/^matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1/.test(transform)) {
        // matrix(a,b,c,d,e,f) — pure translate has a=d=1, b=c=0. Anything
        // else means rotation/scale/skew — fall back to raster.
        if (/^matrix\(\s*[-\d.eE+]+\s*,\s*[-\d.eE+]+\s*,\s*[-\d.eE+]+\s*,\s*[-\d.eE+]+/.test(transform)) {
            const nums = transform.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)?.map(parseFloat) ?? [];
            if (nums.length >= 4 && (nums[0] !== 1 || nums[1] !== 0 || nums[2] !== 0 || nums[3] !== 1)) {
                return true;
            }
        } else {
            // rotate(...), scale(...), etc. — non-matrix form
            return true;
        }
    }
    return false;
}

export async function walkDocumentToSpecs(target: HTMLIFrameElement | HTMLElement, opts: WalkOptions = {}): Promise<RenderSpec[]> {
    const _isIframe = (target as any)?.tagName === "IFRAME";
    const doc = _isIframe ? (target as HTMLIFrameElement).contentDocument : (target as HTMLElement).ownerDocument;
    if (!doc) return [];
    const out: RenderSpec[] = [];
    const skipSelectors = opts.skipSelectors ?? [];
    const rasterTasks: Array<Promise<void>> = [];
    let z = 0;

    // 2026-05-06 — Per-walk origin offset. rectToSlideXYWHUniform reads
    // these module-scoped values to translate every captured rect so the
    // entrypoint's top-left lands at slide (0, 0). Reset in finally.
    _walkOriginX = opts.originX ?? 0;
    _walkOriginY = opts.originY ?? 0;
    _walkSourceW = opts.sourceWidthPx ?? FREEFORM_NATIVE_W;

    function shouldSkip(el: Element): boolean {
        for (const sel of skipSelectors) {
            try { if (el.matches(sel)) return true; } catch { /* invalid selector */ }
        }
        return false;
    }

    function walk(el: Element) {
        if (shouldSkip(el)) return;
        const win = el.ownerDocument?.defaultView ?? window;
        const cs = win.getComputedStyle(el);
        if (!isVisible(el, cs)) return;
        const tag = el.tagName.toLowerCase();
        const isSvgEl = isSvgNamespace(el);

        // SVG container/definition elements that NEVER render standalone.
        // Walking into <defs>, <symbol>, <marker>, etc., emits ghost shapes
        // at their internal coords (typically 0,0) which appear as scattered
        // tiny shapes at the top-left of the slide. Skip them entirely.
        if (isSvgEl && SVG_NON_RENDERED_TAGS.has(tag)) return;

        // SVG <use> instantiates a <symbol> at a position. We rasterize
        // these as small images at their use-rect coords — preserves icons
        // visually without exploding the slide into hundreds of line
        // segments from path decomposition.
        if (isSvgEl && tag === 'use' && opts.rasterizeElement) {
            const useEl = el as SVGGraphicsElement;
            const useRect = svgElementBoundingRect(useEl);
            if (useRect && useRect.width >= 1 && useRect.height >= 1) {
                const myZ = z++;
                const { x, y, w, h } = rectToSlideXYWHUniform(useRect);
                const idx = out.length;
                const placeholder: ImageSpec = {
                    type: 'image',
                    z: myZ,
                    sourceTag: 'svg:use',
                    x, y, w, h,
                    dataUrl: '',
                };
                out.push(placeholder);
                rasterTasks.push(
                    opts.rasterizeElement(useEl as unknown as HTMLElement)
                        .then(dataUrl => {
                            (out[idx] as ImageSpec).dataUrl = dataUrl ?? '';
                        })
                        .catch(err => {
                            console.warn('[domToPptx] <use> rasterize failed', err);
                        }),
                );
            }
            return;
        }

        // Per-element raster fallback for unsupported CSS features.
        // Triggered by `filter`, `backdrop-filter`, `mix-blend-mode`,
        // `clip-path`. We rasterize this element + its subtree, emit one
        // ImageSpec, and DO NOT recurse — the raster captures everything.
        if (!isSvgEl && isHtmlElement(el) && needsRasterFallback(cs) && opts.rasterizeElement) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= 1 && rect.height >= 1) {
                const myZ = z++;
                const { x, y, w, h } = rectToSlideXYWHUniform({
                    left: rect.left, top: rect.top, width: rect.width, height: rect.height,
                });
                const placeholder: ImageSpec = {
                    type: 'image',
                    z: myZ,
                    sourceTag: el.tagName,
                    x, y, w, h,
                    dataUrl: '',
                };
                const idx = out.length;
                out.push(placeholder);
                rasterTasks.push(
                    opts.rasterizeElement(el).then(dataUrl => {
                        if (dataUrl) {
                            (out[idx] as ImageSpec).dataUrl = dataUrl;
                        } else {
                            // Failed: drop the spec by leaving it with empty
                            // data; the emitter will skip it.
                            (out[idx] as ImageSpec).dataUrl = '';
                        }
                    }).catch(err => {
                        console.warn('[domToPptx] raster fallback failed', el.tagName, err);
                    }),
                );
                return; // Do NOT recurse — raster captures everything inside
            }
        }

        // SVG leaf primitives
        if (isSvgEl && SVG_LEAF_TAGS.has(tag)) {
            try {
                if (tag === 'rect') emitSvgRect(el as SVGRectElement, cs, z++, out);
                else if (tag === 'circle' || tag === 'ellipse') emitSvgOval(el as SVGCircleElement, cs, z++, out);
                else if (tag === 'line') emitSvgLine(el as SVGLineElement, cs, z++, out);
                else if (tag === 'path') emitSvgPath(el as SVGPathElement, cs, z++, out);
                else if (tag === 'polygon' || tag === 'polyline') emitSvgPolygon(el as SVGPolygonElement, cs, z++, out);
                else if (tag === 'text') emitSvgText(el as SVGTextElement, cs, z++, out);
            } catch (err) {
                console.warn('[domToPptx] svg leaf failed', tag, err);
            }
            return; // SVG leaves don't have walkable children for our purposes
        }

        // HTML element shape (background + border)
        if (!isSvgEl && isHtmlElement(el)) {
            try {
                const rect = el.getBoundingClientRect();
                if ((window as any).__NXT_WALK_DEBUG__) {
                    console.info(`[walk] ${tag}.${el.className || '-'} rect=${rect.width.toFixed(0)}x${rect.height.toFixed(0)}@(${rect.left.toFixed(0)},${rect.top.toFixed(0)}) text="${(el.textContent || '').slice(0, 40)}"`);
                }
                if (rect.width >= 1 && rect.height >= 1) {
                    emitHtmlRect(el, cs, rect, z++, out);

                    if (isLogicalTextLeaf(el)) {
                        if ((window as any).__NXT_WALK_DEBUG__) {
                            console.info(`[walk] -> text-leaf emit: ${tag}.${el.className || '-'}`);
                        }
                        emitHtmlTextLeaf(el, cs, rect, z++, out, win as Window);
                        return;
                    }
                }
            } catch (err) {
                console.warn('[domToPptx] html element failed', tag, err);
            }
        }

        // Recurse — for HTML containers, recursing finds nested SVG and
        // text leaves. For SVG <g> elements, recursing finds child primitives.
        for (const child of Array.from(el.children)) {
            walk(child);
        }
    }

    try {
        walk(opts.entrypoint || (_isIframe ? doc.body : (target as HTMLElement)));
        if (rasterTasks.length > 0) await Promise.allSettled(rasterTasks);
        return out;
    } finally {
        // Always reset origin so a later body-walk caller doesn't inherit
        // the per-section offsets from an earlier per-section walk.
        _walkOriginX = 0;
        _walkOriginY = 0;
        _walkSourceW = FREEFORM_NATIVE_W;
    }
}
