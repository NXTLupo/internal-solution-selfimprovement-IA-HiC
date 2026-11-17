// Registry-driven SLIDES composer (Method A, 2026-06-17).
//
// THE PRINCIPLE (owner: "nothing should be hand made; everything must come through the registry"):
// a slide is COMPOSED from a machine-readable archetype spec (regions + token bindings, harvested
// from Figma 609 -> plans/figma-audit/slides-archetypes/*) + brand tokens + payload. There is NO
// per-archetype renderX and NO hardcoded hex/font/logo: adding an archetype = adding a SPEC entry.
// Mirrors how #proto composes from proto-component-manifest.md. Chrome + logo come from the registry
// chrome brick (plans/figma-audit/slides-archetypes/_chrome-logo-brick.md).
//
// Anatomy is ABSOLUTE x/y (verified across all 14 archetypes), so the engine is a deterministic
// positioner: each region is an absolutely-positioned, token-bound box; repeated column-groups
// iterate a payload array at a fixed pitch. Output is the 1920x1080 stage HTML; the headless render
// gate verifies it (blank / runtime / nav-screen / collision).

import { TYPO, LINE, SCALE } from '../components/slideTemplates/types';
import { getBrand, getBrandArt, normalizeBrandId, type BrandId } from '../components/slideTemplates/brands';
import {
    brandTokens, brandArtCandidates, brandDividerFill, brandCanvasFor, lockupHtml, brandPops, hasFilledImagery, rectHitsZones, mixHex,
    type BrandCanvas, type DeckPosition, type BrandArtPick, type StageRect,
} from './slideToStageHtml';
import { scrubMetaTitle, deClicheDeep } from './slidePostProcessor';
import { attachContentTrueIcons } from './artifactIconResolver';

// 2026-10-01 - the brand id set is owned by brands.ts (nxt | nu | deciem); the composer switches
// on the normalized id only.
export type Brand = BrandId;
type TokenColor = 'accent' | 'rail' | 'ink' | 'cyan' | 'body' | 'secondary' | 'hairline' | 'paper' | 'ecru' | 'onAccent' | 'graphite' | 'ruleMid';
type TokenFont = 'display' | 'heading' | 'body' | 'mono';
// 2026-06-25 - a spec `size` may be a literal px (brand-identical tiers: label/body/caption) OR a
// SCALE KEY resolved PER-BRAND at compose time via tk.scale[key]. The deck-display tier (hero/
// deckTitle/sectionNumeral/numeral/deckHeading/quoteMark/display) uses KEYS so NU's wider Lato can
// carry a smaller mode-535:0 size from the Figma feed without the section-divider/cover overflow.
type ScaleKey = 'label' | 'caption' | 'body' | 'bodyReadable' | 'lead' | 'name' | 'subhead' | 'title'
    | 'display' | 'kicker' | 'deckHeading' | 'deckTitle' | 'numeral' | 'hero' | 'sectionNumeral'
    | 'quoteMark' | 'micro' | 'nano';

interface RegionStyle {
    color?: TokenColor; font?: TokenFont; size?: number | ScaleKey; weight?: number;
    tracking?: number; leading?: number; italic?: boolean; upper?: boolean;
    // prose: a READABLE body block (synthesis paragraph / definition / action body), NOT a
    // label, kicker, source line, hero numeral, heading, or tight tabular cell. Prose regions
    // clamp their size UP to the readable floor (TYPO.READABLE_BODY_PX = 14pt) and render
    // single-spaced (LINE.body), token-driven from Figma. Tagged per-archetype below; geometry
    // is hand-tuned so the clamped size fits its box (single-spacing offsets the size bump).
    prose?: boolean;
    // fitH (2026-07-09, WS-1g measured clamp): the text box's height budget in stage px. When the
    // ESTIMATED line count at the region's tier would overflow this height, the composer steps the
    // size down at most 2 scale tiers (never below SCALE.caption); if it still cannot fit, the
    // text is clause-aware truncated (trunc conventions: finish the sentence, else clause boundary,
    // else word boundary, NEVER an ellipsis). Deterministic; overrides the prose readable-floor
    // clamp when overflow forces it (overflow beats the floor, same as the tabular exemption).
    fitH?: number;
    // grow (2026-10-25, audit: hollow cards with 18-21px text): the fit starts at the readable tier and keeps the
    // largest size whose text fits the box whole; it never truncates on the way up.
    grow?: boolean;
    // Round 3 (DECIEM art zones): a per-region type scale the collision resolver may set as its LAST
    // step (floor 0.9). Absent = 1. Never set by a spec.
    fontScale?: number;
}
interface StaticRegion extends RegionStyle {
    kind?: 'text' | 'hairline' | 'band' | 'rect' | 'image' | 'scrim';
    x: number; y: number; w?: number; h?: number;
    payload?: string;   // dot-path into payload; if absent + kind!=text, it's a rule/band/rect/image
    literal?: string;
    rule?: number;      // rect/band only: top accent bar height (px)
    ruleColor?: TokenColor;  // rule bar color (default accent)
    fit?: 'contain' | 'cover';  // image only (default contain)
    alpha?: number;     // rect/scrim only: 0..1 opacity applied to the token color
    // scrim only: vertical gradient alphas (top -> bottom) over the token color; defaults .35/.72
    alphaTop?: number; alphaBottom?: number;
    // image only (2026-07-08 critique elevation): payload dot-paths enabling the ANNOTATED
    // image treatment. `markers` -> [{n, x, y}] (percent coords, numbered callout discs);
    // `aspect` -> the image's natural w/h ratio (lets the composer anchor the image top-left
    // at its exact drawn size so percent coords map deterministically to pixels).
    markers?: string; aspect?: string;
}
type Cell = RegionStyle & {
    /** 2026-10-05: a literal LABEL cell renders only when this item key has text (MEANS / MATTERS printed over an empty
     *  body on live stat rows). */
    labelFor?: string;
    dy: number; dx?: number; key?: string; literal?: string; kind?: 'text' | 'hairline' | 'image' | 'bar'; w?: number; h?: number;
    fit?: 'contain' | 'cover';   // image cell only (default contain)
    imgCarrier?: string;  // image cell only: a PAYLOAD-level parallel array (e.g. 'columnIcons')
                          // read by item index, so the runtime resolver's index-aligned carrier write
                          // (artifactIconResolver/Illustrator) reaches the per-column slot. Falls back
                          // to item[key] if the carrier is absent (model may author columns[i].icon).
    lines?: boolean;    // value is a string[] -> render each on its own line
    // dyOdd (2026-07-09, milestone-timeline): ODD-index items use this dy instead of dy, so
    // content alternates above/below a shared axis without collisions. Even items keep dy.
    dyOdd?: number;
    // autoNumber (2026-07-09, flow-arc): render the zero-padded 1-based item index ("01", "02")
    // instead of reading a payload key - step order IS the number, the model never authors it.
    autoNumber?: boolean;
    // kind 'bar' (2026-07-09, ranked-bars): a native proportional rect. Reads item[key] as a
    // 0-100 RELATIVE magnitude and fills (value/100 * w) px at height h in the token color
    // (default accent). The value itself is NEVER rendered as text (naked-number ban); the
    // row's note field carries any cited figure. Values clamp to 0..100; a floor of 6px keeps
    // near-zero rows visible.
};
// A repeated group of items. Items lay out along ONE axis: horizontal (pitchX, columns) or
// vertical (pitchY, stacked rows). Each item's origin = (baseX + i*pitchX, baseY + i*pitchY)
// (or xs[i] for non-uniform columns). Cell positions are RELATIVE to the item origin
// (itemX + dx, itemY + dy); for horizontal groups baseY/pitchY default 0 so cell.dy reads as
// absolute stage-y (back-compat with the seeded specs).
interface ColumnGroup {
    kind: 'columns';
    array: string;       // payload key holding the array
    count: number; baseX: number; pitchX: number; w: number;
    baseY?: number; pitchY?: number;   // vertical-stack groups set these
    xs?: number[];       // non-uniform column x-origins (overrides baseX + pitchX)
    // cols (2026-07-09, quadrant): wrap the item sequence into a 2D grid - item i lands at
    // column (i % cols) * pitchX, row floor(i / cols) * pitchY. Absent -> the 1-axis layout above.
    cols?: number;
    // spreadW (2026-07-09, milestone-timeline): distribute the ACTUAL item count evenly across
    // this total width - effective pitchX = (spreadW - w) / (n - 1), so a 3-step and a 6-step
    // payload both span the content zone. Card width stays FIXED (right for axis/timeline nodes).
    spreadW?: number;
    // fillW (2026-07-10, balance fix - user: "layouts feel visually unbalanced"): distribute the
    // ACTUAL item count across this total width ADJUSTING CARD WIDTH with a constant gutter:
    // effective w = (fillW - (n-1)*gap) / n, pitch = w + gap. spreadW kept the card small and
    // inflated the GAPS (a 2-stat means-matters put a 620px hole mid-slide); fillW widens the
    // cards instead, like the reference decks. Cells whose declared w >= 60% of the group w
    // stretch by the same delta; narrow cells (numerals, badges) keep their size.
    fillW?: number; gap?: number;
    // fillH (2026-07-10): vertical analog for card-row stacks (evidence-table). Distributes the
    // ACTUAL row count across this total height by growing CARD HEIGHT (constant gapY, default 8)
    // and re-centering each row's cells vertically, so a 3-row table fills its zone instead of
    // ending mid-slide above a dead band.
    fillH?: number; gapY?: number;
    // connector (2026-07-09, flow-arc): a thin native rect drawn between consecutive items
    // (from item i's right card edge to item i+1's left edge) at dy/h - the process-flow
    // connector bar, pure rects, no SVG. Skipped for grid (cols) layouts.
    connector?: { dy: number; h: number; color?: TokenColor };
    // optional per-item background card (drawn before cells); card.y is relative to item origin.
    card?: { y: number; w: number; h: number; bg?: TokenColor; rule?: number; ruleColor?: TokenColor; ruleSide?: 'top' | 'left' };
    // cardOverrides (2026-08-07, comparison previous-vs-proposed): index-aligned partial card
    // overrides merged over `card` per item, so the FIRST (incumbent) panel can recess (muted
    // band) while the LAST (proposed) panel advances (accent rule). Sparse: null/undefined
    // entries keep the base card.
    cardOverrides?: Array<Partial<{ y: number; w: number; h: number; bg: TokenColor; rule: number; ruleColor: TokenColor; ruleSide: 'top' | 'left' }> | null>;
    cells: Cell[];
    // Round 3 (DECIEM art zones): per-ITEM partial cell overrides (item index -> cell index -> patch),
    // set by the collision resolver so ONE colliding column cell can narrow or scale without touching
    // its siblings. Never set by a spec.
    cellOverrides?: Array<Record<number, Partial<Cell>> | null>;
}
// role x horizon matrix (aggregate-roadmap): label col + N horizon cols, M role rows.
interface MatrixRegion {
    kind: 'matrix';
    headers: string;     // payload key -> string[] (horizon labels)
    rows: string;        // payload key -> [{ name, cells:[string] }]
    rowLabelKey: string; cellsKey: string;
    headerY: number; baseX: number; colPitch: number; cellW: number;
    rowBaseY: number; rowPitch: number; cellH: number; labelX: number;
    emphasizeLast?: boolean;  // final horizon column rail-colored top rule + header
}
// plotted subject chips (2026-07-09, quadrant): small accent-bordered label chips grouped into
// named anchor zones (one origin per quadrant cell) and stacked vertically within each zone.
// Native rect + text only; each chip = a bordered paper box with the subject label. Chips clamp
// to perGroupMax per zone and max overall so an over-authored payload degrades gracefully
// (extras dropped deterministically in payload order, never overlapped).
interface ChipsRegion {
    kind: 'chips';
    array: string;                    // payload key -> [{ [labelKey], [groupKey] }]
    labelKey: string;                 // chip text key
    groupKey: string;                 // 1-based zone index key (clamped into origins range)
    origins: Array<[number, number]>; // top-left stack anchor per zone (stage px)
    w: number; chipH: number; pitchY: number;
    perGroupMax: number; max: number;
}
type Region = StaticRegion | ColumnGroup | MatrixRegion | ChipsRegion;
interface ArchetypeSpec {
    chrome: 'content-rail' | 'full-bleed-dark';
    regions: Region[];
    // IMAGE VARIANTS (2026-07-03 slides-imagery uplift): when payload[when] is non-empty (a
    // string, or an array with at least one truthy entry), the variant's region list REPLACES
    // the base regions entirely. Explicit alternate anatomy beats shifting-geometry math; base
    // regions stay byte-identical for image-free slides (fail-open).
    variants?: Array<{ when: string; regions: Region[] }>;
}

// ---- token resolution (from the hydrated Figma tokens; never hardcoded) ----
// Colors + fonts resolve through brandTokens() - the SAME normalizer the slideToStageHtml renderers
// use - so brand is a true MODE flip (NXT chartreuse/Saira <-> NU navy+red/Lato) and there is ONE
// token authority, no drift. The logo brick reads the raw registry token (BRAND_LOGO_*), which the
// normalized BrandTokens shape does not carry.
function resolved(brand: Brand) {
    const T = brandTokens(brand);                                   // CSS-ready hexes + font-family strings
    // raw token object (for the logo brick + per-brand TYPE_SCALE). index.tsx re-assigns the hydrated
    // TOKENS onto nxtBrand after the NXT hydrate, so getBrand() is the live object for every brand.
    const H: any = getBrand(brand);
    const color: Record<TokenColor, string> = {
        accent: T.accent,
        rail: T.rail,
        ink: T.ink,
        cyan: T.accent2,       // Figma color/cyan: NXT cyan #00B7C3, NU teal #1D6E64 (NOT the red kicker)
        body: T.bodyText,      // Figma color/body: NXT #333333 / NU #16233C (softer than rail/ink)
        secondary: T.secondaryText,  // Figma color/secondary: NXT #666666 / NU #73757A
        hairline: T.hair,
        paper: T.paper,
        ecru: T.callout,
        onAccent: T.bandText,
        graphite: T.graphite,   // dark card fill (full-bleed-dark archetypes)
        ruleMid: T.ruleMid,     // on-dark secondary text
    };
    // brandTokens fonts are already full `'Family', fallback` CSS strings - use them verbatim.
    // heading = the TITLE face: identical to the body face for NXT (Archivo) and NU (Lato), and the
    // Poppins Bold subhead face for DECIEM (template: Poppins Bold uppercase subheads, Josefin body).
    const font: Record<TokenFont, string> = {
        display: T.displayFont,
        heading: T.titleFont,
        body: T.bodyFont,
        mono: T.monoFont,
    };
    // logo brick - strictly from the registry logo token (never typeset fallback unless absent)
    const logoSvg = String(H.BRAND_LOGO_SVG || '').trim();
    const logoWm = String(H.BRAND_LOGO_WORDMARK || '').trim();
    // 2026-10-01 - DECIEM lockup + title transform + template art ride the same resolved object.
    const lockup = String(T.lockup || '').trim();
    const titleTransform = String(T.titleTransform || 'none');
    const art = getBrandArt(brand);
    // 2026-06-25 - PER-BRAND deck-display scale. Reads THIS brand's hydrated TYPE_SCALE (set by
    // hydrateTokensFromFigma from the Figma mode feed), falling back to the global SCALE build
    // default per key. So NU resolves a mode-535:0 size where Figma diverges it, and stays == NXT
    // (identical scale) until the NU type tokens are set - i.e. this plumbing is zero-visual-change
    // on its own. Vision-pure: every value still originates in the Figma feed.
    const ts: any = (H && (H as any).TYPE_SCALE) || {};
    const sc = (k: string): number => (typeof ts[k] === 'number' ? ts[k] : (SCALE as any)[k]);
    const scale = {
        label: sc('label'), caption: sc('caption'), body: sc('body'), bodyReadable: sc('bodyReadable'),
        lead: sc('lead'), name: sc('name'), subhead: sc('subhead'), title: sc('title'), display: sc('display'),
        kicker: sc('kicker'), deckHeading: sc('deckHeading'), deckTitle: sc('deckTitle'), numeral: sc('numeral'),
        hero: sc('hero'), sectionNumeral: sc('sectionNumeral'), quoteMark: sc('quoteMark'), micro: sc('micro'), nano: sc('nano'),
    } as Record<string, number>;
    // Round 2: pop-color rotation for stat numerals, no italics on brands with template art (the
    // DECIEM template has none), and a font scale the safe-box narrowing may lower (1 = untouched).
    const pops = art ? brandPops(T) : null;
    const noItalic = !!art;
    const fontScale = 1;
    return { color, font, logoSvg, logoWm, scale, lockup, titleTransform, art, brand, T, pops, noItalic, fontScale };
}

/** Token hex -> rgba() at the given alpha (scrims + translucent panels; the color stays a token). */
function hexToRgba(hex: string, alpha: number): string {
    const h = (hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full.slice(0, 6) || '0d0d0d', 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function esc(s: any): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** Visible text: escaped, and a short hyphenated word ("co-op", "e-mail") never breaks at its hyphen
 *  (2026-10-26 corpus run: "co- / op" split across lines on two slides). */
function txt(s: any): string {
    return esc(s).replace(/(?<![A-Za-z-])([A-Za-z]{2,3})-([A-Za-z]{2,3})(?![A-Za-z-])/g, '<span style="white-space:nowrap">$1-$2</span>');
}
function dot(obj: any, path?: string): any {
    if (!path) return undefined;
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

// ---- WS-1g measured clamp (2026-07-09) ----
// Deterministic fit for text regions that declare a height budget (fitH). The composer is a
// blind absolute positioner; char budgets are generation-side targets the model can miss. This
// helper ESTIMATES the rendered line count (average glyph width = GLYPH_EM * font-size; Archivo/
// Lato body estimate) and, on overflow: (1) steps the size down at most 2 distinct scale tiers,
// never below SCALE.caption; (2) if it still cannot fit, clause-aware truncates to the box's
// character capacity via clauseTrunc (the slideToStageHtml trunc conventions: finish the
// sentence, else clause boundary, else word boundary, NEVER an ellipsis). Pure function of its
// inputs - unit-tested, no DOM, no randomness.
const GLYPH_EM = 0.56; // average glyph width as a fraction of font size (Archivo regular measures ~0.56; 0.52 under-estimated and let legends run under the band, 2026-10-23)

/** Clause-aware truncation per the no-truncation contract (mirrors slideToStageHtml trunc,
 *  which is module-private there): prefer finishing the in-flight sentence slightly over
 *  budget, else cut at a sentence end, else a clause boundary, else a word boundary; strip
 *  dangling punctuation; never emit an ellipsis. */
export function clauseTrunc(s: string, max: number): string {
    let t = String(s ?? '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    // 1. Finish the in-flight sentence if it ends within 1.35x budget.
    const ahead = t.slice(0, Math.min(t.length, Math.round(max * 1.35)));
    const fwd = ahead.slice(max).search(/[.!?"”](?:\s|$)/);
    if (fwd >= 0) return ahead.slice(0, max + fwd + 1).trim();
    // 2. End at the last full sentence inside the budget.
    const cut = t.slice(0, max);
    const sentEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    if (sentEnd > max * 0.5) return cut.slice(0, sentEnd + 1).trim();
    // 3. End at a clause boundary (comma / semicolon / colon) inside the budget.
    const clause = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '), cut.lastIndexOf(': '));
    if (clause > max * 0.55) return cut.slice(0, clause).trim();
    // 4. Word boundary; strip dangling punctuation/openers; NO ellipsis.
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut)
        .replace(/[\s,;:.\-("'“‘]+$/, '').trim();
}

/** Measured clamp: fit `text` at `sizePx` into a boxW x boxH region. Returns the (possibly
 *  stepped-down or truncated) text + the final size in px. Step-down ladder = the brand's
 *  hydrated scale values strictly below the starting size, floored at scale.caption, at most
 *  2 distinct tiers. Exported for unit tests. */
/** 2026-10-24 (system fix): in the browser the composer MEASURES words with a canvas in the region's own face and
 *  weight instead of guessing a glyph factor; the estimate remains the fallback (tests, server). */
let _measureCtx: CanvasRenderingContext2D | null | undefined;

// 2026-10-30 (WS-4 L1): what the composer could not draw (items past a template's box count, text it had to cut at
// the two-tier floor) used to be a console line nobody acted on. While a collector is armed those events are also
// recorded, so render_slide / submit_deck hand them to the model as findings.
let _composerFindings: string[] | null = null;
export function beginComposerFindings(): void { _composerFindings = []; }
export function takeComposerFindings(): string[] { const out = _composerFindings || []; _composerFindings = null; return out; }
function noteComposerFinding(msg: string): void {
    if (_composerFindings && _composerFindings.length < 40) _composerFindings.push(msg);
    else if (!_composerFindings && typeof console !== 'undefined') console.warn(`[composer] ${msg}`);
}

function measureTextWidth(text: string, px: number, family?: string, weight?: number): number | null {
    if (!family || typeof document === 'undefined') return null;
    if (_measureCtx === undefined) {
        try { _measureCtx = document.createElement('canvas').getContext('2d'); } catch { _measureCtx = null; }
    }
    if (!_measureCtx) return null;
    try {
        _measureCtx.font = `${weight || 400} ${px}px ${family}`;
        const w = _measureCtx.measureText(text).width;
        return Number.isFinite(w) && w > 0 ? w : null;
    } catch { return null; }
}

/** Greedy word-wrap line count of `text` at `px` in a `boxW` column (the estimate fitTextToBox uses). */
export function estimateLines(text: string, px: number, boxW: number, glyphEm: number = GLYPH_EM, fontFamily?: string, fontWeight?: number): number {
    const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return 0;
    const cw = px * glyphEm;
    const space = measureTextWidth(' ', px, fontFamily, fontWeight) ?? cw;
    let lines = 1, cur = 0;
    for (const w of words) {
        const ww = measureTextWidth(w, px, fontFamily, fontWeight) ?? (w.length * cw);
        if (cur === 0) cur = Math.min(ww, boxW);
        else if (cur + space + ww <= boxW) cur += space + ww;
        else { lines++; cur = Math.min(ww, boxW); }
    }
    return lines;
}

export function fitTextToBox(
    text: string, sizePx: number, boxW: number, boxH: number, leading: number,
    scale: Record<string, number>,
    // Round 2: average glyph width as a fraction of the size. 0.52 is the body-face estimate (Archivo /
    // Lato); UPPERCASE Poppins 700 titles run ~0.68, so DECIEM title fits pass the wider factor.
    glyphEm: number = GLYPH_EM,
    fontFamily?: string, fontWeight?: number,
): { text: string; size: number } {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!t || !sizePx || !boxW || !boxH) return { text: t, size: sizePx };
    const floor = scale.caption;
    // 2026-10-23: greedy WORD wrap (a word never splits): "Independent Salesforce consulting" in a 240px column is
    // three lines, not the two a character count predicts (live: the third line clipped at the row edge).
    const words = t.split(' ');
    const linesAt = (px: number) => {
        const cw = px * glyphEm;
        const space = measureTextWidth(' ', px, fontFamily, fontWeight) ?? cw;
        let lines = 1, cur = 0;
        for (const w of words) {
            const ww = measureTextWidth(w, px, fontFamily, fontWeight) ?? (w.length * cw);
            void space;
            if (cur === 0) cur = Math.min(ww, boxW);
            else if (cur + space + ww <= boxW) cur += space + ww;
            else { lines++; cur = Math.min(ww, boxW); }
        }
        return lines;
    };
    const fits = (px: number) => linesAt(px) * px * leading <= boxH;
    if (fits(sizePx)) return { text: t, size: sizePx };
    const ladder = Array.from(new Set(Object.values(scale)))
        .filter((v) => typeof v === 'number' && v < sizePx && v >= floor)
        .sort((a, b) => b - a)
        .slice(0, 2);
    for (const px of ladder) if (fits(px)) return { text: t, size: px };
    // Still over at the 2-tier floor: clause-aware truncate to the box's character capacity.
    const finalPx = ladder.length ? ladder[ladder.length - 1] : Math.max(floor, sizePx);
    const cpl = Math.max(1, Math.floor(boxW / (finalPx * glyphEm)));
    const maxLines = Math.max(1, Math.floor(boxH / (finalPx * leading)));
    const cut = clauseTrunc(t, cpl * maxLines);
    if (cut !== t) noteComposerFinding(`text cut to fit its box at the ${finalPx}px floor: "${t.slice(0, 70)}" (${t.length} chars given, about ${cut.length} drawn); shorten the field or move the idea`);
    return { text: cut, size: finalPx };
}

/** The region's effective font size in px (scale-key resolution + prose readable-floor clamp).
 *  Shared by styleStr and the fitH measured clamp so both start from the same tier. */
function effectiveSizePx(r: RegionStyle, tk: ReturnType<typeof resolved>): number | undefined {
    const rawSize = typeof r.size === 'string' ? (tk.scale as any)[r.size] : r.size;
    const base = r.prose && rawSize ? Math.max(rawSize, TYPO.READABLE_BODY_PX) : rawSize;
    // Round 3: a per-region scale the art-zone resolver may set (floor 0.9), never below the hard floor.
    const scale = (r.fontScale || 1) * (tk.fontScale || 1);
    if (base && scale !== 1) return Math.max(TYPO.HARD_MIN_PX, Math.round(base * scale));
    return base;
}
/** Run the WS-1g measured clamp for a text sink that declared fitH. Returns the fitted text and,
 *  when the size stepped down, the override px for styleStr. */
function applyFit(r: RegionStyle, raw: string, w: number, tk: ReturnType<typeof resolved>): { text: string; sizeOverride?: number } {
    const base = effectiveSizePx(r, tk);
    if (!r.fitH || !w || !base) return { text: raw };
    // a region the CSS uppercases is measured uppercase (2026-10-26 live: an uppercase divider title outgrew its estimate)
    if (r.upper) raw = String(raw ?? '').toUpperCase();
    const leading = r.leading != null ? r.leading : (r.prose ? LINE.body : 1.25);
    // uppercase title-face regions (DECIEM) measure with the wider glyph factor so the fit triggers
    const upperTitle = tk.titleTransform !== 'none' && (r.font === 'display' || (r.font === 'heading' && (r.weight || 0) >= 700));
    const glyph = upperTitle ? 0.68 : ((r.weight || 0) >= 700 ? 0.58 : GLYPH_EM);
    const fam = r.font ? tk.font[r.font] : undefined;
    if (r.grow) {
        const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
        const tiers = Array.from(new Set(Object.values(tk.scale) as number[])).filter(v => v > base && v <= Math.max(base, SCALE.bodyReadable)).sort((a, b) => b - a);
        for (const px of tiers) {
            const g = fitTextToBox(t, px, w, r.fitH, leading, tk.scale, glyph, fam, r.weight);
            if (g.size === px && g.text === t) return { text: t, sizeOverride: px };
        }
    }
    const f = keepWhole(r, raw, w, tk, fitTextToBox(raw, base, w, r.fitH, leading, tk.scale, glyph, fam, r.weight));
    return { text: f.text, sizeOverride: f.size !== base ? f.size : undefined };
}

/**
 * 2026-10-26 (live reformat: box bodies were cut mid-phrase, "...and defines future-state", and second sentences naming
 * the client's people were dropped): on a provided-content slide the client's words are never truncated. The type
 * steps down a pixel at a time to the hard floor; past that the full text stays and the layout gate judges it.
 */
function fitWithoutLoss(raw: string, fromPx: number, w: number, h: number, leading: number, glyph: number, fam?: string, weight?: number): { text: string; size: number } {
    const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
    for (let px = Math.floor(fromPx); px >= TYPO.HARD_MIN_PX; px--) {
        if (fitTextToBox(t, px, w, h, leading, { caption: px }, glyph, fam, weight).text === t) return { text: t, size: px };
    }
    return { text: t, size: TYPO.HARD_MIN_PX };
}
function keepWhole(r: RegionStyle, raw: string, w: number, tk: ReturnType<typeof resolved>, f: { text: string; size: number }): { text: string; size: number } {
    const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (f.text === t || !r.fitH) return f;
    const leading = r.leading != null ? r.leading : (r.prose ? LINE.body : 1.25);
    const upperTitle = tk.titleTransform !== 'none' && (r.font === 'display' || (r.font === 'heading' && (r.weight || 0) >= 700));
    const glyph = upperTitle ? 0.68 : ((r.weight || 0) >= 700 ? 0.58 : GLYPH_EM);
    const fam = r.font ? tk.font[r.font] : undefined;
    if ((tk as any)._noTruncate) return fitWithoutLoss(t, f.size, w, r.fitH, leading, glyph, fam, r.weight);
    // 2026-10-27 (run 45: bar notes ended "...as compute and targeted quality", "...payroll costs represent a large"):
    // a cut that does not end a sentence is a fragment. The type steps down first; the cut stands only when the whole
    // text cannot fit even at the floor.
    if (/[.!?…][”"’')]?$/.test(f.text)) return f;
    // a modest step (to about four fifths of the fitted size, never below the hard floor): body type stays readable
    for (let px = Math.floor(f.size); px >= Math.max(TYPO.HARD_MIN_PX, Math.round(f.size * 0.82)); px--) {
        if (estimateLines(t, px, w, glyph, fam, r.weight) * px * leading <= r.fitH) return { text: t, size: px };
    }
    return f;
}

/** applyFit pinned to a group's shared size: the cell is fitted starting from `px` instead of its own tier. */
function applyFitAt(r: RegionStyle, raw: string, w: number, tk: ReturnType<typeof resolved>, px: number): { text: string; sizeOverride?: number } {
    const base = effectiveSizePx(r, tk);
    if (!r.fitH || !w || !base) return { text: raw };
    if (r.upper) raw = String(raw ?? '').toUpperCase();
    const leading = r.leading != null ? r.leading : (r.prose ? LINE.body : 1.25);
    const upperTitle = tk.titleTransform !== 'none' && (r.font === 'display' || (r.font === 'heading' && (r.weight || 0) >= 700));
    const glyph = upperTitle ? 0.68 : ((r.weight || 0) >= 700 ? 0.58 : GLYPH_EM);
    // a one-step scale pins the size: the group size is already the floor any sibling reached, never step below it
    const f = keepWhole(r, raw, w, tk, fitTextToBox(raw, px, w, r.fitH, leading, { caption: px }, glyph, r.font ? tk.font[r.font] : undefined, r.weight));
    return { text: f.text, sizeOverride: f.size !== base ? f.size : undefined };
}

/** Round 2 (DECIEM stat numerals): an accent-colored DISPLAY-face cell inside a repeated group takes
 *  the brand pop colors in rotation (pink, cyan, purple, orange) by item index. Appended after
 *  styleStr so it wins over the cell's base color. '' for brands without pops (NXT / NU unchanged). */
function popColorStyle(c: RegionStyle, tk: ReturnType<typeof resolved>, i: number): string {
    if (!tk.pops || c.color !== 'accent' || c.font !== 'display') return '';
    return `;color:${tk.pops[i % tk.pops.length]}`;
}

// ---------------------------------------------------------------------------
// Round 3 (DECIEM MEASURED ART ZONES). The corner heuristic (64% column) is gone. Every text region
// keeps the full content width unless ITS box intersects a measured zone; a colliding region is then
// repaired in the directive's order: (1) SHORTEN its height so it ends above the zone (a column that
// ends above the bottom-right doodle, template slide 15: for a column group the whole stack of text
// cells is compacted so it ends above the block, all items alike so columns stay aligned); (2) NARROW
// only that region to the free span beside the zone (a title shifts right of the top-left blob, a
// last column cell narrows left of a top-right sliver, per item); (3) scale ITS type, floor 0.9. A
// repair that would leave a text cell under two lines is infeasible and the slide takes the NEXT
// background in the rotation instead (skip-on-collision); none feasible -> plain paper, no art.
// Everything is estimated from the same glyph model fitTextToBox uses, so it is deterministic.
// ---------------------------------------------------------------------------
const Z_GAP = 8;            // clearance between text and a zone (stage px)
const Z_MIN_FREE = 150;     // the narrowest free span a region may be narrowed to
const Z_FONT_FLOOR = 0.9;   // the lowest per-region type scale the resolver may apply
const Z_MIN_GAP = 20;        // the tightest vertical gap a shortened column stack closes down to

function _textOf(payload: any, r: { payload?: string; literal?: string }): string {
    const v = r.payload ? dot(payload, r.payload) : r.literal;
    return v == null ? '' : (Array.isArray(v) ? v.join(' ') : String(v));
}
function _glyphFor(r: RegionStyle, tk: ReturnType<typeof resolved>): number {
    return (tk.titleTransform !== 'none' && (r.font === 'display' || (r.font === 'heading' && (r.weight || 0) >= 700))) ? 0.68 : GLYPH_EM;
}
function _leadingOf(r: RegionStyle): number { return r.leading != null ? r.leading : (r.prose ? LINE.body : 1.25); }
/** Estimated rendered height of a text box (lines x size x leading), capped by fitH when declared. */
function _estTextH(text: string, r: RegionStyle, w: number, tk: ReturnType<typeof resolved>): number {
    const size = effectiveSizePx(r, tk) || 0;
    if (!size || !text) return 0;
    const t = text.replace(/\s+/g, ' ').trim();
    // a single-token display-face cell (a numeral, a WORD figure) is sized to one line by renderColumns
    const oneLine = r.font === 'display' && !/\s/.test(t);
    const cpl = Math.max(1, Math.floor(w / (size * _glyphFor(r, tk))));
    const lines = oneLine ? 1 : Math.max(1, Math.ceil(t.length / cpl));
    const h = Math.ceil(lines * size * _leadingOf(r));
    return r.fitH ? Math.min(h, r.fitH) : h;
}
function _minTextH(r: RegionStyle, tk: ReturnType<typeof resolved>): number {
    const size = effectiveSizePx(r, tk) || 0;
    return Math.ceil(2 * size * _leadingOf(r));   // two lines
}
function _hits(rect: StageRect, zones: StageRect[]): StageRect[] { return zones.filter(z => rectHitsZones(rect, [z])); }

/** Static text region repair. Returns the patched region, or null when infeasible. */
function _repairStatic(r: StaticRegion, zones: StageRect[], payload: any, tk: ReturnType<typeof resolved>): StaticRegion | null {
    const text = _textOf(payload, r);
    if (!text) return r;
    let out: StaticRegion = { ...r };
    for (let pass = 0; pass < 3; pass++) {
        const size = effectiveSizePx(out, tk) || 0;
        const w = out.w ?? Math.min(1848 - out.x, Math.ceil(text.length * size * _glyphFor(out, tk)));
        const h = _estTextH(text, out, w, tk);
        const rect: StageRect = { x: out.x, y: out.y, w, h };
        const hits = _hits(rect, zones);
        if (!hits.length) return out;
        let changed = false;
        for (const z of hits) {
            // (1) shorten: the box starts above the zone and can end above it with >= 2 lines
            if (out.y + Z_GAP < z.y && z.y - Z_GAP - out.y >= _minTextH(out, tk) && out.y + h > z.y) {
                out = { ...out, fitH: Math.min(out.fitH ?? Infinity, z.y - Z_GAP - out.y) }; changed = true; continue;
            }
            // (2) narrow to the free span: zone to the right ...
            if (z.x - Z_GAP - out.x >= Z_MIN_FREE && z.x > out.x) {
                out = { ...out, w: z.x - Z_GAP - out.x }; changed = true; continue;
            }
            // ... or shift right of a zone on the left: a free-flowing line (no declared width) just
            // moves as long as it still fits the stage; a boxed region narrows to the remaining span
            const freeL = z.x + z.w + Z_GAP;
            if (z.x <= out.x && out.w == null && freeL + w <= 1848) {
                out = { ...out, x: freeL }; changed = true; continue;
            }
            if (z.x <= out.x && (out.x + w) - freeL >= Z_MIN_FREE) {
                out = { ...out, x: freeL, w: (out.x + w) - freeL }; changed = true; continue;
            }
            // (3) scale the type, floor 0.9
            if ((out.fontScale || 1) > Z_FONT_FLOOR) { out = { ...out, fontScale: Z_FONT_FLOOR }; changed = true; continue; }
            return null;
        }
        if (!changed) return null;
    }
    // final check
    const size = effectiveSizePx(out, tk) || 0;
    const w = out.w ?? Math.min(1848 - out.x, Math.ceil(text.length * size * _glyphFor(out, tk)));
    return _hits({ x: out.x, y: out.y, w, h: _estTextH(text, out, w, tk) }, zones).length ? null : out;
}

/** Item origins exactly as renderColumns lays them out (mirrors its fillW / spreadW / cols math). */
function _itemOrigins(g: ColumnGroup, n: number): Array<{ x: number; y: number; w: number }> {
    const gap = g.gap ?? 56;
    const fillOn = !!(g.fillW && n > 0 && !g.xs && !g.cols);
    const effW = fillOn ? Math.min(Math.floor((g.fillW! - (n - 1) * gap) / n), Math.round(g.w * 2.2)) : g.w;
    const pitchX = fillOn ? effW + gap : ((g.spreadW && n > 1) ? Math.round((g.spreadW - g.w) / (n - 1)) : g.pitchX);
    const fillShift = fillOn ? Math.max(0, Math.floor((g.fillW! - (n * effW + (n - 1) * gap)) / 2)) : 0;
    const gapY = g.gapY ?? 8;
    const effH = (g.fillH && g.card && n > 0) ? Math.round((g.fillH - (n - 1) * gapY) / n) : (g.card ? g.card.h : 0);
    const pitchY = (g.fillH && g.card && n > 0) ? effH + gapY : (g.pitchY || 0);
    const out: Array<{ x: number; y: number; w: number }> = [];
    for (let i = 0; i < n; i++) {
        const col = g.cols ? i % g.cols : i, row = g.cols ? Math.floor(i / g.cols) : i;
        out.push({ x: g.xs ? g.xs[i] : g.baseX + fillShift + col * pitchX, y: (g.baseY || 0) + (g.cols ? row : i) * pitchY, w: effW });
    }
    return out;
}

/** Column-group repair: group-wide vertical compaction above bottom blocks, per-item narrowing beside
 *  side zones, per-item type scale last. Returns the patched group, or null when infeasible. */
function _repairColumns(g: ColumnGroup, zones: StageRect[], payload: any, tk: ReturnType<typeof resolved>): ColumnGroup | null {
    const arr: any[] = dot(payload, g.array) || [];
    const n = Math.min(arr.length, g.count);
    if (!n) return g;
    const origins = _itemOrigins(g, n);
    const textCells = g.cells.map((c, ci) => ({ c, ci })).filter(({ c }) => !c.kind || c.kind === 'text');
    const cellText = (c: Cell, item: any): string => {
        if (c.labelFor && !String(dot(item, c.labelFor) ?? '').trim()) return '';
        const v = c.autoNumber ? '00' : (c.key ? dot(item, c.key) : (typeof item === 'string' ? item : c.literal));
        return v == null ? '' : (Array.isArray(v) ? v.join(' ') : String(v));
    };
    const cellW = (c: Cell, o: { w: number }) => c.w || o.w;
    const cellRect = (c: Cell, ci: number, i: number, cells: Cell[]): StageRect | null => {
        const cc = cells[ci];
        const text = cellText(cc, arr[i]);
        if (!text) return null;
        const o = origins[i];
        const dy = (i % 2 === 1 && cc.dyOdd != null) ? cc.dyOdd : cc.dy;
        const w = cellW(cc, o);
        return { x: o.x + (cc.dx || 0), y: o.y + dy, w, h: Math.max(_estTextH(text, cc, w, tk), Math.ceil((effectiveSizePx(cc, tk) || 0) * _leadingOf(cc))) };
    };
    let cells = g.cells.map(c => ({ ...c }));
    const overrides: Array<Record<number, Partial<Cell>> | null> = origins.map(() => null);
    const maxTextH = (c: Cell) => Math.max(0, ...origins.map((_, i) => { const t = cellText(c, arr[i]); return t ? _estTextH(t, c, cellW(c, origins[i]), tk) : 0; }));
    // ---- (0) a TOP-edge zone over the first cells: shift the whole stack down a little (<= 140px),
    //      all items alike; the bottom compaction below then takes the slack. Card groups do not move.
    if (!g.card) {
        let delta = 0;
        for (let i = 0; i < n; i++) for (const { ci } of textCells) {
            const rect = cellRect(cells[ci], ci, i, cells); if (!rect) continue;
            for (const z of _hits(rect, zones)) if (z.y <= 0 && z.y + z.h < 1070) delta = Math.max(delta, z.y + z.h + Z_GAP - rect.y);
        }
        if (delta > 140) return null;
        if (delta > 0) cells = cells.map(c => (!c.kind || c.kind === 'text' || c.kind === 'hairline' || c.kind === 'image') ? { ...c, dy: c.dy + delta, dyOdd: c.dyOdd != null ? c.dyOdd + delta : c.dyOdd } : c);
    }
    // ---- (1) vertical compaction: find the lowest bottom-block top any text cell runs into ----
    let blockTop = Infinity;
    for (let i = 0; i < n; i++) for (const { ci } of textCells) {
        const rect = cellRect(cells[ci], ci, i, cells); if (!rect) continue;
        for (const z of _hits(rect, zones)) if (z.y + z.h >= 1070 && z.y < rect.y + rect.h) blockTop = Math.min(blockTop, z.y);
    }
    if (blockTop !== Infinity) {
        // The stack of text cells must end above blockTop - gap, group-wide so the columns stay
        // aligned. Shortening takes slack in this order and never touches the type size:
        //   (a) the spec's vertical gaps between cells close down to Z_MIN_GAP (a label keeps its
        //       tighter gap to the body under it);
        //   (b) FLEX cells (fitH or prose) shrink toward their NATURAL height at full size (never
        //       below two lines), so a fitH box only loses the empty space under its text and the
        //       measured clamp never steps the face down a tier.
        // When that is not enough the stack is left as the spec drew it and the per-item narrowing
        // below gets its turn; a cell still on the art after that makes the background infeasible.
        const order = textCells.map(({ ci }) => ci).sort((a, b) => cells[a].dy - cells[b].dy);
        const natural = (c: Cell) => Math.max(0, ...origins.map((_, i) => { const t = cellText(c, arr[i]); return t ? _estTextH(t, { ...c, fitH: undefined }, cellW(c, origins[i]), tk) : 0; }));
        const h = order.map(ci => { const c = cells[ci]; return c.fitH ? c.fitH : Math.max(maxTextH(c), Math.ceil((effectiveSizePx(c, tk) || 0) * _leadingOf(c))); });
        const gaps = order.map((ci, k) => k === 0 ? 0 : Math.max(0, cells[ci].dy - (cells[order[k - 1]].dy + h[k - 1])));
        const end = cells[order[0]].dy + h.reduce((s, v, k) => s + v + gaps[k], 0);
        const target = blockTop - Z_GAP;
        let overflow = end - target;
        if (overflow > 0) {
            const gapSlack = gaps.map((v, k) => k === 0 ? 0 : Math.max(0, v - Math.min(v, Z_MIN_GAP)));
            const flex = order.map((ci, k) => { const c = cells[ci]; return (c.fitH || c.prose) ? Math.max(0, h[k] - Math.max(_minTextH(c, tk), natural(c))) : 0; });
            const gapTotal = gapSlack.reduce((s, v) => s + v, 0);
            const flexTotal = flex.reduce((s, v) => s + v, 0);
            if (overflow <= gapTotal + flexTotal) {
                const g2 = gaps.slice(), h2 = h.slice();
                // (a) gaps first, proportionally to their slack
                const fromGaps = Math.min(overflow, gapTotal);
                if (fromGaps > 0) for (let k = 1; k < order.length; k++) g2[k] -= Math.floor(gapSlack[k] * fromGaps / gapTotal);
                let left = (cells[order[0]].dy + h2.reduce((s, v, k) => s + v + g2[k], 0)) - target;
                for (let k = order.length - 1; k >= 1 && left > 0; k--) { const take = Math.min(left, g2[k] - (gaps[k] - gapSlack[k])); if (take > 0) { g2[k] -= take; left -= take; } }
                // (b) then the flex cells, proportionally to their slack above the natural height
                if (left > 0 && flexTotal > 0) {
                    const need = left;
                    for (let k = 0; k < order.length; k++) if (flex[k]) { const take = Math.min(flex[k], Math.floor(flex[k] * need / flexTotal)); h2[k] -= take; left -= take; }
                    for (let k = order.length - 1; k >= 0 && left > 0; k--) if (flex[k]) { const floorH = h[k] - flex[k]; const take = Math.min(left, h2[k] - floorH); if (take > 0) { h2[k] -= take; left -= take; } }
                }
                if (left <= 0) {
                    let y = cells[order[0]].dy;
                    order.forEach((ci, k) => {
                        y += g2[k];
                        const c = cells[ci];
                        cells[ci] = (c.fitH || c.prose) ? { ...c, dy: y, dyOdd: undefined, fitH: h2[k] } : { ...c, dy: y, dyOdd: undefined };
                        y += h2[k];
                    });
                }
            }
        }
    }
    // ---- (2) side zones: per-item narrowing / shifting; (3) per-item type scale ----
    for (let i = 0; i < n; i++) for (const { ci } of textCells) {
        let cur: Cell = { ...cells[ci], ...(overrides[i]?.[ci] || {}) };
        for (let pass = 0; pass < 3; pass++) {
            const rect = cellRect(cur, ci, i, Object.assign([...cells], { [ci]: cur }) as Cell[]); if (!rect) break;
            const hits = _hits(rect, zones); if (!hits.length) break;
            const z = hits[0];
            const o = origins[i];
            const x0 = o.x + (cur.dx || 0), w = cellW(cur, o);
            // the narrowest acceptable span: a short single token (a numeral "04") needs only its own
            // width plus clearance; running text keeps the Z_MIN_FREE floor
            const t = cellText(cur, arr[i]);
            const size = effectiveSizePx(cur, tk) || 0;
            const need = /\s/.test(t.trim()) ? Z_MIN_FREE : Math.min(Z_MIN_FREE, Math.ceil(t.trim().length * size * _glyphFor(cur, tk)) + Z_GAP);
            if (z.x > x0 && z.x - Z_GAP - x0 >= need) { cur = { ...cur, w: z.x - Z_GAP - x0 }; }
            else if (z.x <= x0 && (x0 + w) - (z.x + z.w + Z_GAP) >= need) { const nx = z.x + z.w + Z_GAP; cur = { ...cur, dx: nx - o.x, w: (x0 + w) - nx }; }
            else if ((cur.fontScale || 1) > Z_FONT_FLOOR) { cur = { ...cur, fontScale: Z_FONT_FLOOR }; }
            else return null;
            overrides[i] = { ...(overrides[i] || {}), [ci]: { ...(overrides[i]?.[ci] || {}), dx: cur.dx, w: cur.w, fontScale: cur.fontScale } };
        }
        const finalRect = cellRect(cur, ci, i, Object.assign([...cells], { [ci]: cur }) as Cell[]);
        if (finalRect && _hits(finalRect, zones).length) return null;
    }
    return { ...g, cells, cellOverrides: overrides.some(Boolean) ? overrides : g.cellOverrides };
}

/** Repair every region against the zones. ok=false when any region cannot be kept out of the art. */
function resolveArtCollisions(regions: Region[], zones: StageRect[], payload: any, tk: ReturnType<typeof resolved>): { regions: Region[]; ok: boolean } {
    if (!zones.length) return { regions, ok: true };
    const out: Region[] = [];
    for (const r of regions) {
        const k = (r as any).kind;
        if (k === 'columns') {
            const g = _repairColumns(r as ColumnGroup, zones, payload, tk);
            if (!g) return { regions, ok: false };
            out.push(g); continue;
        }
        if (k === 'matrix' || k === 'chips') {
            // block regions cannot be reshaped: any zone touching them is a skip
            const m = r as any;
            const rect: StageRect = k === 'matrix'
                ? { x: Math.min(m.labelX, m.baseX), y: m.headerY, w: 1848 - Math.min(m.labelX, m.baseX), h: (m.rowBaseY - m.headerY) + 8 * m.rowPitch }
                : { x: 196, y: 64, w: 1652, h: 976 };
            if (_hits(rect, zones).length) return { regions, ok: false };
            out.push(r); continue;
        }
        const s = r as StaticRegion;
        // a full-width hairline rule stops short of a zone on its right (it never runs through the art);
        // other non-text regions (rects, bands, images) are left as drawn
        if (s.kind === 'hairline' && typeof s.w === 'number') {
            let w = s.w;
            for (const z of _hits({ x: s.x, y: s.y, w, h: Math.max(1, s.h || 1) }, zones)) if (z.x > s.x) w = Math.min(w, z.x - Z_GAP - s.x);
            out.push(w >= Z_MIN_FREE && w !== s.w ? ({ ...s, w } as Region) : r); continue;
        }
        if (s.kind && s.kind !== 'text') { out.push(r); continue; }   // rules, rects, images: not text
        const fixed = _repairStatic(s, zones, payload, tk);
        if (!fixed) return { regions, ok: false };
        out.push(fixed);
    }
    return { regions: out, ok: true };
}

/** Pick the first background in the slide's rotation whose zones the regions can be kept out of.
 *  Returns the pick and the repaired regions, or null (no art) when none of the twelve is feasible. */
function resolveArtForSlide(brand: Brand, title: string, deckIndex: number | undefined, regions: Region[], payload: any, tk: ReturnType<typeof resolved>)
    : { pick: BrandArtPick; regions: Region[] } | null {
    for (const pick of brandArtCandidates(brand, title, deckIndex)) {
        const res = resolveArtCollisions(regions, pick.zones, payload, tk);
        if (res.ok) return { pick, regions: res.regions };
    }
    return null;
}

/** Round 3 (B): an uppercase DECIEM title region without a height budget gets one: the gap to the
 *  next region below it, so a two-line title re-fits (tier step or clause trim) instead of running
 *  into the body. No-op for regions that already declare fitH. */
function ensureTitleFit(regions: Region[]): Region[] {
    const tops: number[] = [];
    for (const r of regions) {
        const k = (r as any).kind;
        if (k === 'columns') { const g = r as ColumnGroup; for (const c of g.cells) tops.push((g.baseY || 0) + c.dy); }
        else if (k === 'matrix') tops.push((r as MatrixRegion).headerY);
        else if (k === 'chips') { for (const [, oy] of (r as ChipsRegion).origins) tops.push(oy); }
        else tops.push((r as StaticRegion).y);
    }
    return regions.map((r) => {
        const s = r as StaticRegion;
        if ((s as any).kind || s.payload !== 'title' || s.font !== 'display' || s.fitH) return r;
        const below = tops.filter(t => t > s.y + 4);
        if (!below.length) return r;
        // 16 keeps air above the next row; the floor of 78 always admits two lines at the subhead tier, so a title steps
        // down instead of being clause-cut (live run 14: three titles ended mid-sentence under a one-line budget).
        const budget = Math.max(78, Math.min(...below) - s.y - 16);
        return budget >= 40 ? ({ ...s, fitH: budget } as Region) : r;
    });
}

/** Round 3 (C): the block-quote mark sits in the LEFT GUTTER (DECIEM has no rail there), above and
 *  left of the first quote line, never over the text. */
function deciemQuoteMark(archetype: string, regions: Region[]): Region[] {
    if (archetype !== 'block-quote') return regions;
    return regions.map((r) => {
        const s = r as StaticRegion;
        if (!(s as any).kind && s.literal === '“' && s.font === 'display') return { ...s, x: 48, y: 110, w: 140 } as Region;
        return r;
    });
}

function _lin(c: number): number { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function _lum(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return 1;
    const n = parseInt(m[1], 16);
    return 0.2126 * _lin((n >> 16) & 255) + 0.7152 * _lin((n >> 8) & 255) + 0.0722 * _lin(n & 255);
}
function _contrast(a: string, b: string): number { const x = _lum(a), y = _lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/** 2026-10-25 (audit: chartreuse text on white / ecru measured ~2:1): an accent-colored TEXT region on a light ground
 *  is darkened (mixed toward black in token space) until it meets WCAG contrast: 3:1 for large text, 4.5:1 otherwise.
 *  Fills, rules and bands keep the brand accent; only type changes. */
function accessibleOn(fg: string, ground: string, px: number, weight = 400): string {
    const need = (px >= 24 || (px >= 18.66 && weight >= 700)) ? 3 : 4.5;
    const m = /^#?([0-9a-f]{6})$/i.exec(String(fg || '').trim());
    if (!m || _contrast(fg, ground) >= need) return fg;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    for (let i = 0; i < 20; i++) {
        r = Math.round(r * 0.92); g = Math.round(g * 0.92); b = Math.round(b * 0.92);
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        if (_contrast(hex, ground) >= need) return hex;
    }
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function styleStr(r: RegionStyle, tk: ReturnType<typeof resolved>, sizeOverride?: number): string {
    // Prose body blocks clamp UP to the readable floor (14pt) and render single-spaced, both
    // token-driven from Figma (TYPO.READABLE_BODY_PX / LINE.body). The clamp NEVER shrinks text:
    // a region already at/above the floor keeps its size. Single-spacing offsets the vertical
    // cost of the larger glyph, so the hand-tuned geometry still fits.
    // Resolve a SCALE KEY to this brand's px (deck-display tier is per-brand); a numeric size is literal.
    // sizeOverride (WS-1g): a measured-clamp result wins over the tier AND the prose floor -
    // overflow beats the floor, same rationale as the documented tabular exemption.
    const size = sizeOverride ?? effectiveSizePx(r, tk);
    const leading = r.leading != null ? r.leading : (r.prose ? LINE.body : undefined);
    // A display-face region with no spec weight takes the brand TITLE weight when the brand declares a
    // title transform (DECIEM: Poppins Bold uppercase hero / numeral type). NXT / NU ('none') unchanged.
    const weight = r.weight || ((tk.titleTransform !== 'none' && r.font === 'display') ? Number(tk.T.titleWeight) || 0 : 0);
    const parts = [
        r.color ? `color:${(r.color === 'accent' && (tk as any)._lightGround && size) ? accessibleOn(tk.color.accent, (tk as any)._lightGround, size, weight) : tk.color[r.color]}` : '',
        r.font ? `font-family:${tk.font[r.font]}` : '',
        size ? `font-size:${size}px` : '',
        weight ? `font-weight:${weight}` : '',
        r.tracking ? `letter-spacing:${r.tracking}px` : '',
        leading != null ? `line-height:${leading}` : '',
        (r.italic && !tk.noItalic) ? 'font-style:italic' : '',
        // 2026-10-23: display-face titles wrap balanced (no one-word orphan on the second line; live out7 slides 6-7).
        r.font === 'display' ? 'text-wrap:balance' : '',
        // TITLE_TRANSFORM token: display-face regions (titles, numerals) and bold heading-face regions
        // (subheads) take the brand transform (DECIEM uppercase). 'none' (NXT / NU) adds nothing.
        (r.upper || (tk.titleTransform !== 'none' && (r.font === 'display' || (r.font === 'heading' && (r.weight || 0) >= 700))))
            ? `text-transform:${r.upper ? 'uppercase' : tk.titleTransform}` : '',
    ].filter(Boolean);
    return parts.join(';');
}

function renderStatic(r: StaticRegion, payload: any, tk: ReturnType<typeof resolved>): string {
    const pos = `position:absolute;left:${r.x}px;top:${r.y}px;${r.w ? `width:${r.w}px;` : ''}`;
    if (r.kind === 'hairline') {
        return `<div style="${pos}height:${r.h || 1}px;background:${tk.color[r.color || 'hairline']}"></div>`;
    }
    if (r.kind === 'band') {
        const inner = r.payload ? esc(dot(payload, r.payload)) : esc(r.literal || '');
        return `<div style="${pos}height:${r.h || 76}px;background:${tk.color[r.color || 'accent']};display:flex;align-items:center;padding:0 28px"><span style="${styleStr(r, tk)}">${inner}</span></div>`;
    }
    if (r.kind === 'rect') {
        // filled card/panel (optionally with a top or implicit accent rule bar). `alpha` renders
        // the token color translucent (scrim panels over photographic backgrounds).
        const ruleBar = r.rule
            ? `<div style="position:absolute;left:0;top:0;width:100%;height:${r.rule}px;background:${tk.color[r.ruleColor || 'accent']}"></div>`
            : '';
        const bg = typeof r.alpha === 'number'
            ? hexToRgba(tk.color[r.color || 'paper'], r.alpha)
            : tk.color[r.color || 'paper'];
        return `<div style="${pos}height:${r.h || 100}px;background:${bg}">${ruleBar}</div>`;
    }
    if (r.kind === 'scrim') {
        // vertical gradient wash over a photographic background (token color at two alphas) so
        // white type stays legible without flattening the scene. Ideal-deck treatment.
        // EXPORT PARITY: the PPTX GEO walker captures backgroundColor (with alpha), not
        // gradients, so a flat rgba at the MID alpha rides along as background-color; the
        // gradient refines it in the browser/preview, the flat wash carries it in the export.
        const c = tk.color[r.color || 'rail'];
        const aTop = r.alphaTop ?? 0.35, aBottom = r.alphaBottom ?? 0.72;
        const top = hexToRgba(c, aTop);
        const bottom = hexToRgba(c, aBottom);
        const mid = hexToRgba(c, (aTop + aBottom) / 2);
        return `<div style="${pos}height:${r.h || 1080}px;background-color:${mid};background-image:linear-gradient(180deg, ${top} 0%, ${bottom} 100%)"></div>`;
    }
    if (r.kind === 'image') {
        // illustration / photograph (data-uri / URL). Empty src -> render nothing (fail-open).
        // fit 'contain': centered + scaled inside the zone (transparent line-art, exhibits).
        // fit 'cover': true crop-fill of the zone (photographic backgrounds + thumbnails).
        const src = r.payload ? dot(payload, r.payload) : r.literal;
        if (!src || typeof src !== 'string') return '';
        // ANNOTATED image (2026-07-08 critique elevation): when the region declares marker +
        // aspect payload paths and the payload fills them, the image anchors TOP-LEFT at its
        // exact drawn size (computed from the known aspect, so marker percent coords map
        // deterministically to pixels) and numbered accent callout discs overlay it, matching
        // the numbered findings beside it. Discs clamp inside the image and de-collide by
        // nudging down (graphic-collision ban: no two markers may overlap). In the PPTX
        // export each disc lands as a small native accent shape + text run.
        const markers = r.markers ? dot(payload, r.markers) : null;
        const aspect = r.aspect ? Number(dot(payload, r.aspect)) : 0;
        if (Array.isArray(markers) && markers.length && aspect > 0 && r.w && r.h) {
            let dw = r.w, dh = Math.round(r.w / aspect);
            if (dh > r.h) { dh = r.h; dw = Math.round(r.h * aspect); }
            const D = 34;
            const placed: { n: any; px: number; py: number }[] = [];
            const sorted = markers.slice(0, 12).map((m: any) => ({
                n: m.n,
                px: Math.round(Math.max(2, Math.min(98, Number(m.x) || 50)) / 100 * dw),
                py: Math.round(Math.max(2, Math.min(98, Number(m.y) || 50)) / 100 * dh),
            })).sort((a, b) => a.py - b.py || a.px - b.px);
            for (const m of sorted) {
                let tries = 0;
                while (placed.some(p => Math.abs(p.px - m.px) < D + 6 && Math.abs(p.py - m.py) < D + 6) && tries < 8) {
                    m.py = Math.min(dh - D, m.py + D + 8); tries++;
                }
                placed.push(m);
            }
            const discs = placed.map(m =>
                `<div style="position:absolute;left:${Math.min(dw - D, Math.max(0, m.px - D / 2))}px;top:${Math.min(dh - D, Math.max(0, m.py - D / 2))}px;width:${D}px;height:${D}px;border-radius:50%;background:${tk.color.accent};border:2px solid ${tk.color.paper};display:flex;align-items:center;justify-content:center"><span style="color:${tk.color.onAccent};font-family:${tk.font.heading};font-size:15px;font-weight:700">${esc(m.n)}</span></div>`
            ).join('');
            return `<div style="${pos}height:${r.h}px"><div style="position:relative;width:${dw}px;height:${dh}px;border:1px solid ${tk.color.hairline}"><img src="${esc(src)}" style="width:${dw}px;height:${dh}px;display:block" alt="">${discs}</div></div>`;
        }
        // 2026-10-23 (information parity): a picture the client supplied (`_provided`) is content, so it is shown whole
        // inside its panel; only the full-bleed canvas keeps cover-fit.
        const fullBleed = r.x === 0 && r.y === 0 && r.w === 1920 && r.h === 1080;
        if (r.fit === 'cover' && !((payload as any)?._provided && !fullBleed)) {
            return `<div style="${pos}height:${r.h || 0}px;overflow:hidden"><img src="${esc(src)}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""></div>`;
        }
        return `<div style="${pos}height:${r.h || 0}px;display:flex;align-items:center;justify-content:center"><img src="${esc(src)}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block" alt=""></div>`;
    }
    const rawVal = r.payload ? dot(payload, r.payload) : r.literal;
    let s = rawVal == null ? '' : String(rawVal);
    if (!s) return '';
    // WS-1g measured clamp: a text region with a declared height budget fits its box
    // deterministically (step down <=2 tiers, floor caption, else clause-aware truncate).
    let sizeOverride: number | undefined;
    if (r.fitH && r.w && typeof rawVal === 'string') {
        let f = applyFit(r, s, r.w, tk);
        // deck type harmony: a sibling slide of the same archetype needed a smaller size here, so this one matches it
        const pin = r.payload ? (tk as any)._typePins?.[r.payload] : undefined;
        const own = f.sizeOverride ?? effectiveSizePx(r, tk);
        if (typeof pin === 'number' && own && pin < own) f = applyFitAt(r, s, r.w, tk, pin);
        if (_sizeRecorder && r.payload) _sizeRecorder.set(r.payload, f.sizeOverride ?? effectiveSizePx(r, tk) ?? 0);
        s = f.text; sizeOverride = f.sizeOverride;
    }
    return `<div style="${pos}${styleStr(r, tk, sizeOverride)}">${txt(s)}</div>`;
}

/** Records each fitted region's size while deckTypePins composes a slide (null otherwise). */
let _sizeRecorder: Map<string, number> | null = null;

/**
 * 2026-10-26 (owner audit of a live reformat: the lede was 28 px on two account slides and 25 px on the other two, box
 * bodies 23 vs 24 px): slides of the SAME archetype share one size per text region, the smallest any of them needs.
 * Composes each slide once with a recorder and returns, per slide id, the pins to store as composerPayload._typePins
 * (every renderer reads the payload, so preview, export and the layout gate agree). Only archetypes used twice or more.
 */
export function deckTypePins(slides: Array<{ id: string; template?: string; payload: any; brand?: string }>): Record<string, Record<string, number>> {
    const byArch = new Map<string, Array<{ id: string; sizes: Map<string, number> }>>();
    for (const s of slides) {
        const arch = String(s.template || '').replace(/^slides:/, '');
        if (!arch || !s.payload || typeof s.payload !== 'object') continue;
        _sizeRecorder = new Map();
        try { composeSlide(arch, { ...s.payload, _typePins: undefined }, (s.brand || 'nxt') as any); } catch { /* a slide that cannot compose takes no pins */ }
        const sizes = _sizeRecorder;
        _sizeRecorder = null;
        byArch.set(arch, [...(byArch.get(arch) || []), { id: s.id, sizes }]);
    }
    const out: Record<string, Record<string, number>> = {};
    for (const list of byArch.values()) {
        if (list.length < 2) continue;
        const pins: Record<string, number> = {};
        for (const k of new Set(list.flatMap(x => Array.from(x.sizes.keys())))) {
            const vals = list.map(x => x.sizes.get(k)).filter((v): v is number => typeof v === 'number' && v > 0);
            if (vals.length >= 2) pins[k] = Math.min(...vals);
        }
        for (const x of list) out[x.id] = pins;
    }
    // Deck-wide action titles (2026-10-26 corpus run: content titles at 46, 58 and 60 px in one deck): every content
    // slide's title takes the smallest title size the deck needs, never below the 46 px title tier (a slide whose own
    // fit is smaller keeps it; the pin only ever lowers).
    const contentTitles: Array<{ id: string; size: number }> = [];
    for (const [arch, list] of byArch) {
        // problem-diptych is a dark-canvas CONTENT slide with an action title (2026-10-26: 60 px among 46 px titles)
        if (ARCHETYPE_SPECS[arch]?.chrome !== 'content-rail' && arch !== 'problem-diptych') continue;
        for (const x of list) { const v = x.sizes.get('title'); if (typeof v === 'number' && v > 0) contentTitles.push({ id: x.id, size: v }); }
    }
    if (contentTitles.length >= 2) {
        const pin = Math.max(SCALE.title, Math.min(...contentTitles.map(t => t.size)));
        for (const t of contentTitles) out[t.id] = { ...(out[t.id] || {}), title: Math.min(out[t.id]?.title ?? pin, pin) };
    }
    return out;
}

// plotted subject chips (quadrant): group items into zones by groupKey (1-based, clamped),
// stack each zone from its origin at pitchY, cap perGroupMax/max, drop extras deterministically.
function renderChips(g: ChipsRegion, payload: any, tk: ReturnType<typeof resolved>): string {
    const arr: any[] = dot(payload, g.array) || [];
    const counts = g.origins.map(() => 0);
    let html = '';
    let placed = 0;
    for (const item of arr) {
        if (placed >= g.max) break;
        const label = String(dot(item, g.labelKey) ?? '').trim();
        if (!label) continue;
        const zone = Math.max(1, Math.min(g.origins.length, Math.round(Number(dot(item, g.groupKey))) || 1)) - 1;
        if (counts[zone] >= g.perGroupMax) continue;
        const [ox, oy] = g.origins[zone];
        const y = oy + counts[zone] * g.pitchY;
        counts[zone]++; placed++;
        const txt = clauseTrunc(label, 32);
        html += `<div style="position:absolute;left:${ox}px;top:${y}px;max-width:${g.w}px;height:${g.chipH}px;border:2px solid ${tk.color.accent};background:${tk.color.paper};display:inline-flex;align-items:center;padding:0 14px;overflow:hidden"><span style="color:${tk.color.rail};font-family:${tk.font.heading};font-size:${tk.scale.label}px;font-weight:700;white-space:nowrap">${esc(txt)}</span></div>`;
    }
    return html;
}

function renderColumns(g: ColumnGroup, payload: any, tk: ReturnType<typeof resolved>): string {
    const arr: any[] = dot(payload, g.array) || [];
    const n = Math.min(arr.length, g.count);
    // 2026-10-26 (live: a fifth "2027 continuity path" box with $500K / $840K / $66,625 a month was handed to a four-box
    // template and never drawn): a template that cannot draw everything it was given says so.
    if (arr.length > g.count) noteComposerFinding(`${g.array}: ${arr.length} given, ${g.count} drawn; ${arr.length - g.count} item(s) not on the slide`);
    // 2026-10-26 (live: a four-item row drew three photos and one blank white slot): a row of cards carries a picture on
    // every card or on none, the rule the icon rows already follow.
    const partialImg = new Set<string>();
    const closeAt: Array<{ dy: number; shift: number }> = [];
    // a stat figure slot that no item fills closes (the Quantitative Claim Rule cleared a row's naked figures)
    for (const c of g.cells) {
        if (c.kind && c.kind !== 'text') continue;
        if (c.key !== 'figure' && c.key !== 'value') continue;
        if (!n || arr.slice(0, n).some(it => String(dot(it, c.key) ?? '').trim())) continue;
        const below = g.cells.filter(x => x !== c && x.dy > c.dy).map(x => x.dy);
        if (below.length) closeAt.push({ dy: c.dy, shift: Math.min(...below) - c.dy });
    }
    for (const c of g.cells) {
        if (c.kind !== 'image') continue;
        const carrierArr = c.imgCarrier ? dot(payload, c.imgCarrier) : null;
        let filledN = 0;
        for (let i = 0; i < n; i++) {
            const src = (Array.isArray(carrierArr) ? carrierArr[i] : undefined) || (c.key ? dot(arr[i], c.key) : c.literal);
            if (typeof src === 'string' && src) filledN++;
        }
        if (filledN > 0 && filledN < n) partialImg.add(String(c.imgCarrier || c.key || ''));
        // 2026-10-27 (run 39: a 290 px empty band where a row's pictures were not drawn): a picture slot that shows nothing
        // closes, and the cells below it move up by its height
        if ((c.w || 0) >= 200 && (filledN === 0 || filledN < n)) {
            const below = g.cells.filter(x => x !== c && x.kind !== 'image' && x.dy > c.dy).map(x => x.dy);
            if (below.length) closeAt.push({ dy: c.dy, shift: Math.min(...below) - c.dy });
        }
    }
    let html = '';
    // fillW: count-adaptive card WIDTH with constant gutters (fewer items -> wider cards, like
    // the reference decks). Card width caps at 2.2x the declared width (text measure stays
    // readable); when the cap bites (e.g. a single stat), the GROUP centers in the zone instead
    // of hugging the left edge. spreadW: constant card width, pitch distributed (timeline nodes).
    const gap = g.gap ?? 56;
    const fillOn = !!(g.fillW && n > 0 && !g.xs && !g.cols);
    const effW = fillOn
        ? Math.min(Math.floor((g.fillW! - (n - 1) * gap) / n), Math.round(g.w * 2.2))
        : g.w;
    const dW = effW - g.w;
    const pitchX = fillOn
        ? effW + gap
        : ((g.spreadW && n > 1) ? Math.round((g.spreadW - g.w) / (n - 1)) : g.pitchX);
    const fillShift = fillOn ? Math.max(0, Math.floor((g.fillW! - (n * effW + (n - 1) * gap)) / 2)) : 0;
    // fillH: count-adaptive card HEIGHT for vertical card stacks (evidence-table rows) with
    // cells re-centered in the taller row, so sparse tables fill their zone.
    const gapY = g.gapY ?? 8;
    const effH = (g.fillH && g.card && n > 0)
        ? Math.round((g.fillH - (n - 1) * gapY) / n)
        : (g.card ? g.card.h : 0);
    const dH = g.card ? effH - g.card.h : 0;
    const pitchY = (g.fillH && g.card && n > 0) ? effH + gapY : (g.pitchY || 0);
    const dyCenter = Math.max(0, Math.round(dH / 2));
    // 2026-10-26 (owner audit of a live reformat: the four boxes of a brief-card, the cells of an evidence table and the
    // step bodies of a flow-arc each came out in a different type size, because every cell fitted itself): sibling
    // text cells of one group share ONE size, the smallest any of them needs, so a set of cards reads as one system.
    const cellAt = (i: number, ci: number): Cell => (g.cellOverrides?.[i]?.[ci] ? { ...g.cells[ci], ...g.cellOverrides[i]![ci] } : g.cells[ci]);
    const widthOf = (c: Cell) => { const b = c.w || g.w; return (dW !== 0 && b >= g.w * 0.6) ? b + dW : b; };
    const groupPx: Array<number | undefined> = g.cells.map((c0, ci) => {
        if (!c0.fitH || (c0.kind && c0.kind !== 'text') || c0.autoNumber || c0.lines) return undefined;
        let min: number | undefined;
        for (let i = 0; i < n; i++) {
            const c = cellAt(i, ci);
            const raw = c.key ? dot(arr[i], c.key) : (typeof arr[i] === 'string' ? arr[i] : c.literal);
            if (typeof raw !== 'string' || !raw.trim()) continue;
            const f = applyFit(c, raw, widthOf(c), tk);
            const px = f.sizeOverride ?? effectiveSizePx(c, tk);
            if (px && (min == null || px < min)) min = px;
        }
        return min;
    });
    // cells that share one text style (two body columns of a table row) also share the size across columns
    const styleKey = (c: Cell) => `${c.font || ''}|${c.size ?? ''}|${c.weight || ''}|${c.color || ''}|${c.upper ? 1 : 0}`;
    const byStyle = new Map<string, number>();
    g.cells.forEach((c, ci) => { const px = groupPx[ci]; if (px) byStyle.set(styleKey(c), Math.min(px, byStyle.get(styleKey(c)) ?? px)); });
    g.cells.forEach((c, ci) => { if (groupPx[ci]) groupPx[ci] = byStyle.get(styleKey(c)); });
    // deck type harmony (deckTypePins): sibling slides of this archetype share the group's size too
    g.cells.forEach((c, ci) => {
        const key = `${g.array}.${c.key}`;
        const pin = (tk as any)._typePins?.[key];
        if (typeof pin === 'number' && groupPx[ci] && pin < (groupPx[ci] as number)) groupPx[ci] = pin;
        if (_sizeRecorder && groupPx[ci] && c.key) _sizeRecorder.set(key, groupPx[ci] as number);
    });
    for (let i = 0; i < n; i++) {
        const item = arr[i];
        // cols: wrap into a 2D grid (quadrant 2x2); absent -> the original 1-axis layout.
        const col = g.cols ? i % g.cols : i;
        const row = g.cols ? Math.floor(i / g.cols) : i;
        const itemX = g.xs ? g.xs[i] : g.baseX + fillShift + col * pitchX;
        const itemY = (g.baseY || 0) + (g.cols ? row : i) * pitchY;
        // connector bar between consecutive items (flow-arc): a thin native rect from this
        // item's right card edge to the next item's left edge (1-axis horizontal groups only).
        if (g.connector && !g.cols && i < n - 1) {
            const nextX = g.xs ? g.xs[i + 1] : itemX + pitchX;
            const cx = itemX + (g.card ? g.card.w + dW : effW);
            const cw = nextX - cx;
            if (cw > 8) {
                html += `<div style="position:absolute;left:${cx + 4}px;top:${itemY + g.connector.dy}px;width:${cw - 8}px;height:${g.connector.h}px;background:${tk.color[g.connector.color || 'accent']}"></div>`;
            }
        }
        // optional background card per item (drawn first so cells sit on top);
        // cardOverrides[i] merges over the base card so panels can differ by index.
        const cardSpec = g.card ? { ...g.card, ...(g.cardOverrides?.[i] || {}) } : undefined;
        if (cardSpec) {
            const cw = cardSpec.w + dW, ch = cardSpec.h + dH, cy = itemY + cardSpec.y;
            const side = cardSpec.ruleSide || 'top';
            const ruleBar = cardSpec.rule
                ? (side === 'left'
                    ? `<div style="position:absolute;left:${itemX}px;top:${cy}px;width:${cardSpec.rule}px;height:${ch}px;background:${tk.color[cardSpec.ruleColor || 'accent']}"></div>`
                    : `<div style="position:absolute;left:${itemX}px;top:${cy}px;width:${cw}px;height:${cardSpec.rule}px;background:${tk.color[cardSpec.ruleColor || 'accent']}"></div>`)
                : '';
            html += `<div style="position:absolute;left:${itemX}px;top:${cy}px;width:${cw}px;height:${ch}px;background:${tk.color[cardSpec.bg || 'paper']}"></div>${ruleBar}`;
        }
        for (let ci = 0; ci < g.cells.length; ci++) {
            // cellOverrides (round 3): a per-item patch over the shared cell (art-zone resolver only)
            const c: Cell = g.cellOverrides?.[i]?.[ci] ? { ...g.cells[ci], ...g.cellOverrides[i]![ci] } : g.cells[ci];
            // dyOdd: odd-index items take the alternate vertical position (milestone-timeline
            // above/below-axis alternation, collision-free by construction).
            // dyCenter re-centers cells in a fillH-grown row; dW stretches full-width-ish cells
            // (>= 60% of the group width) in a fillW-widened card - narrow cells keep their size.
            const baseDy = (i % 2 === 1 && c.dyOdd != null) ? c.dyOdd : c.dy;
            const dy = baseDy + dyCenter - closeAt.filter(z => baseDy > z.dy).reduce((s, z) => s + z.shift, 0);
            const x = itemX + (c.dx || 0), y = itemY + dy;
            const baseCw = c.w || g.w;
            const w = (dW !== 0 && baseCw >= g.w * 0.6) ? baseCw + dW : baseCw;
            if (c.kind === 'bar') {
                // proportional native rect (ranked-bars): item[key] = 0-100 relative magnitude.
                const v = Math.max(0, Math.min(100, Number(c.key ? dot(item, c.key) : 0) || 0));
                // 2026-10-27 (run 42: bars implied magnitudes the slide never states, since the number rule hides them): on a
                // research slide the bars show RANK, stepped evenly; the client's own slide keeps proportional bars
                const shown = payload?._provided ? v : (() => {
                    const vals = arr.slice(0, n).map(it => Number(c.key ? dot(it, c.key) : 0) || 0);
                    const rank = vals.filter(x => x > v).length;
                    return n > 1 ? 100 - (rank / (n - 1)) * 55 : 100;
                })();
                const bw = Math.max(6, Math.round((shown / 100) * w));
                html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${bw}px;height:${c.h || 24}px;background:${tk.color[c.color || 'accent']}"></div>`;
                continue;
            }
            if (c.kind === 'hairline') {
                html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${c.h || 1}px;background:${tk.color[c.color || 'hairline']}"></div>`;
                continue;
            }
            if (c.kind === 'image') {
                // per-item image (icon glyph / scene data-URI). Prefer a PAYLOAD-level parallel carrier
                // array read by item index (imgCarrier, e.g. columnIcons[i] - matches the runtime
                // resolver's index-aligned write); fall back to item[key] (model-authored columns[i].icon).
                // Empty -> render nothing (fail-open). object-fit contain by default so a glyph is never cropped.
                const carrierArr = c.imgCarrier ? dot(payload, c.imgCarrier) : null;
                const isrc = (Array.isArray(carrierArr) ? carrierArr[i] : undefined)
                    || (c.key ? dot(item, c.key) : c.literal);
                if (!isrc || typeof isrc !== 'string') continue;
                if (partialImg.has(String(c.imgCarrier || c.key || ''))) continue;
                if (c.fit === 'cover') {
                    // photographic thumbnail: true crop-fill of the cell (persona/theme scenes)
                    html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${c.h || w}px;overflow:hidden"><img src="${esc(isrc)}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""></div>`;
                    continue;
                }
                html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${c.h || w}px;display:flex;align-items:center;justify-content:center"><img src="${esc(isrc)}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block" alt=""></div>`;
                continue;
            }
            if (c.labelFor && !String(dot(item, c.labelFor) ?? '').trim()) continue;
            const raw = c.autoNumber
                ? String(i + 1).padStart(2, '0')
                : (c.key ? dot(item, c.key) : (typeof item === 'string' ? item : c.literal));
            let content: string;
            let sizeOverride: number | undefined;
            if (c.lines && Array.isArray(raw)) {
                // 2026-10-25 (audit: a 2.3 line-height made each wrapped continuation line read as a new agenda
                // item): every entry is its own block with a tight leading; the space BETWEEN entries is a gap.
                const px = effectiveSizePx(c, tk) || SCALE.body;
                const lead = c.leading != null ? c.leading : 1.3;
                const tight = Math.min(lead, 1.3);
                const itemGap = Math.max(6, Math.round((lead - tight) * px));
                content = raw.map((s, k) => `<div style="line-height:${tight};${k ? `margin-top:${itemGap}px` : ''}">${txt(String(s).replace(/^\s*\d{1,2}\s*[:.)]\s+/, ''))}</div>`).join('');
            } else {
                let s = raw == null ? '' : String(raw);
                // WS-1g measured clamp for plain-string cells that declared a height budget.
                if (s && c.fitH && typeof raw === 'string') {
                    const shared = groupPx[ci];
                    const f = shared ? applyFitAt(c, s, w, tk, shared) : applyFit(c, s, w, tk);
                    s = f.text; sizeOverride = f.sizeOverride;
                }
                // Round 2 (DECIEM): a WORD figure (hero / numeral / display tier, display face, uppercase
                // Poppins 700) must fit its column on one line; digits keep the tier. Content-adaptive:
                // size = min(tier, column width / (0.66em x chars)), never below the hard floor.
                if (s && tk.art && c.font === 'display' && typeof c.size === 'string' && (c.size === 'hero' || c.size === 'numeral' || c.size === 'display')
                    && !/^[\d.,%$+\-x\s]+$/i.test(s)) {
                    const base = sizeOverride ?? effectiveSizePx(c, tk) ?? 0;
                    const fit = Math.floor(w / (0.66 * s.length));
                    if (base && fit < base) sizeOverride = Math.max(TYPO.HARD_MIN_PX, fit);
                }
                // Round 2 (DECIEM): an UPPERCASED bold heading cell (subjects, names) whose longest single
                // token is wider than its column sizes down until that token fits, so a long handle like
                // "R/SKINCAREADDICTION" can never run into the next column (export-faithful: no soft wrap).
                if (s && tk.art && tk.titleTransform !== 'none' && c.font === 'heading' && (c.weight || 0) >= 700 && c.w) {
                    const base = sizeOverride ?? effectiveSizePx(c, tk) ?? 0;
                    const longest = s.split(/\s+/).reduce((m, t) => Math.max(m, t.length), 0);
                    const fit = Math.floor(c.w / (0.66 * Math.max(1, longest)));
                    if (base && fit < base) sizeOverride = Math.max(TYPO.HARD_MIN_PX, fit);
                }
                content = txt(s);
            }
            if (!content) continue;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${styleStr(c, tk, sizeOverride)}${popColorStyle(c, tk, i)}">${content}</div>`;
        }
    }
    return html;
}

function renderMatrix(m0: MatrixRegion, payload: any, tk: ReturnType<typeof resolved>): string {
    const headers: string[] = dot(payload, m0.headers) || [];
    const rows: any[] = dot(payload, m0.rows) || [];
    // 2026-10-25 (audit: a fourth column ran to x1868 while the rules stopped at x1624): the column pitch fits the
    // content box for any column count, and every rule spans exactly the table.
    const gap = Math.max(8, m0.colPitch - m0.cellW);
    const nCols = Math.max(1, headers.length);
    const colPitch = Math.min(m0.colPitch, Math.floor((1818 - m0.baseX + gap) / nCols));
    const m: MatrixRegion = { ...m0, colPitch, cellW: colPitch - gap };
    const ruleW = (m.baseX + (nCols - 1) * m.colPitch + m.cellW) - 196;
    let html = '';
    // header rule under the column headers
    html += `<div style="position:absolute;left:196px;top:${m.headerY + 30}px;width:${ruleW}px;height:2px;background:${tk.color.rail}"></div>`;
    headers.forEach((h, c) => {
        const last = m.emphasizeLast && c === headers.length - 1;
        html += `<div style="position:absolute;left:${m.baseX + c * m.colPitch}px;top:${m.headerY}px;width:${m.cellW}px;color:${last ? tk.color.rail : tk.color.secondary};font-family:${tk.font.heading};font-weight:700;font-size:${SCALE.label}px;letter-spacing:0.96px;text-transform:uppercase">${esc(h)}</div>`;
    });
    // 2026-10-23: the row pitch and cell height shrink so every row stays above the source line (y990).
    const rowPitch = Math.min(m.rowPitch, Math.max(96, Math.floor((990 - m.rowBaseY) / Math.max(1, rows.length))));
    const cellH = Math.min(m.cellH, rowPitch - 40);
    rows.forEach((row, r) => {
        const y = m.rowBaseY + r * rowPitch;
        const label = dot(row, m.rowLabelKey);
        html += `<div style="position:absolute;left:${m.labelX}px;top:${y}px;width:200px;color:${tk.color.rail};font-family:${tk.font.display};font-size:${SCALE.subhead}px">${esc(label)}</div>`;
        const cells: string[] = dot(row, m.cellsKey) || [];
        cells.forEach((cell, c) => {
            const last = m.emphasizeLast && c === headers.length - 1;
            const x = m.baseX + c * m.colPitch;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${m.cellW}px;height:${cellH}px;background:${tk.color.paper}"></div>`;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${m.cellW}px;height:3px;background:${last ? tk.color.rail : tk.color.accent}"></div>`;
            const cellTxt = fitTextToBox(String(cell ?? ''), SCALE.body, m.cellW - 32, cellH - 28, 1.32, tk.scale, GLYPH_EM);
            html += `<div style="position:absolute;left:${x + 16}px;top:${y + 18}px;width:${m.cellW - 32}px;height:${cellH - 28}px;overflow:hidden;color:${tk.color.body};font-family:${tk.font.body};font-size:${cellTxt.size}px;line-height:1.32">${esc(cellTxt.text)}</div>`;
        });
        if (r < rows.length - 1) html += `<div style="position:absolute;left:196px;top:${y + rowPitch - 12}px;width:${ruleW}px;height:1px;background:${tk.color.hairline}"></div>`;
    });
    return html;
}

// The real brand mark from the registry (Figma node 31:17 NXT vector wordmark / NU red-N monogram),
// hydrated to BRAND_LOGO_SVG. The NXT wordmark uses fill=currentColor, so the container sets the
// color per context: ink on a light (content-rail) canvas, paper/white on a full-bleed-dark canvas.
// The NU monogram carries its own red fill so currentColor is a no-op there. Typeset `wordmark` text
// is a last-resort fallback only when the registry SVG is absent (degraded feed).
function brandLogo(tk: ReturnType<typeof resolved>, onDark: boolean): string {
    const color = onDark ? tk.color.paper : tk.color.ink;
    const pos = 'position:absolute;top:40px;right:80px;height:30px';
    // Resolve fill=currentColor to an EXPLICIT color in the SVG markup. The editable-PPTX export
    // hides text via `color:transparent`, which the currentColor logo would inherit and vanish;
    // an explicit fill survives that (and the preview is identical - same resolved color).
    // class="brandlogo" is the CHROME TAG the PPTX GEO walker keys on: it (a) hoists the mark onto the
    // per-variant master layout (defined once, not per slide) and (b) lets the exporter embed the logo
    // as a TRUE VECTOR SVG (svgBlip + PNG fallback) instead of a rasterized screenshot. Same contract
    // as slideToStageHtml's classed chrome, so #slides decks match the GOLD path (owner directive 2026-07-03).
    // 2026-10-01 - DECIEM: the bordered two-line lockup (template masthead) in place of a mark.
    if (tk.lockup) return lockupHtml(tk.T, color);
    if (tk.logoSvg) return `<div class="brandlogo" style="${pos};color:${color}">${tk.logoSvg.replace(/currentColor/g, color)}</div>`;
    if (tk.logoWm) return `<div class="brandlogo" style="${pos};font-family:${tk.font.display};font-weight:600;font-size:24px;letter-spacing:1px;color:${color};text-transform:uppercase">${esc(tk.logoWm)}</div>`;
    return '';
}
/** Brands with template art (DECIEM): no rail, no dot-mark anywhere. Returns the chrome SPLIT in two:
 *  `pre` goes under the regions (the corner background on paper body slides), `post` goes on top
 *  (the lockup on dark / pop canvases, so a cover photo can never bury it). */
function artChrome(tk: ReturnType<typeof resolved>, canvas: { kind: BrandCanvas; bodyArt: string; lockup?: boolean }): { pre: string; post: string } {
    if (canvas.kind === 'paper') {
        return {
            pre: canvas.bodyArt
                ? `<img class="bgart" src="${esc(canvas.bodyArt)}" alt="" style="position:absolute;left:0;top:0;width:1920px;height:1080px;object-fit:cover;display:block">`
                : '',
            post: '',
        };
    }
    // the black BODY canvas (quote slide) is a body slide: no masthead, like every other body slide
    return { pre: '', post: canvas.lockup === false ? '' : brandLogo(tk, true) };
}
/** 2026-10-21 (rendered archetype audit): under a full-bleed photo the chrome painted first is buried, so it is
 *  moved ABOVE the regions, as the dark-canvas set (no rail, white mark): the rail is under the photo anyway and
 *  an ink mark on a scrimmed photo is invisible (agenda photo variant). Painted once, never duplicated. */
function liftChromeAbovePhoto(body: string, spec: ArchetypeSpec, tk: ReturnType<typeof resolved>): string {
    const first = chrome(spec.chrome, tk);
    const rest = body.startsWith(first) ? body.slice(first.length) : body;
    return rest + dotMark(tk, true) + brandLogo(tk, true);
}
function chrome(mode: ArchetypeSpec['chrome'], tk: ReturnType<typeof resolved>): string {
    if (mode === 'full-bleed-dark') {
        // dark canvas, dot-mark bottom-left, no rail; real white brand mark top-right
        return dotMark(tk, true) + brandLogo(tk, true);
    }
    // content-rail: 128px rail + dot-mark + real brand mark (ink) top-right
    const rail = `<div class="rail" style="position:absolute;left:0;top:0;width:128px;height:1080px;background:${tk.color.rail}"></div>`;
    return rail + dotMark(tk, false) + brandLogo(tk, false);
}

// 2026-10-01 - DECIEM canvas FAMILIES per archetype (round 2 directive D, from the template):
//   cover                                  -> black canvas + lockup (+ photo under a heavy black scrim)
//   section-divider                        -> solid pop fill by divider ordinal (cyan / purple / pink / orange)
//   thesis / agenda / scene / diptych      -> black canvas + lockup
//   block-quote                            -> BLACK (the NIOD dark layout): white Josefin quote, pink mark
//   tables (evidence-table, roadmaps, comparison, ledgers, org) -> paper, black header row, NO corner art
//   panel layouts (role-needs, critiques, exhibit) -> paper, text left / panel right, NO corner art
//   everything else                        -> paper + ONE corner background (unless imagery is present)
const COVER_ARCHETYPES = new Set(['cover']);
const SECTION_ARCHETYPES = new Set(['section-divider']);
const THESIS_ARCHETYPES = new Set(['thesis-interstitial', 'agenda', 'scene', 'problem-diptych']);
const DARK_BODY_ARCHETYPES = new Set(['block-quote']);
const TABLE_ARCHETYPES = new Set(['evidence-table', 'aggregate-roadmap', 'comparison-panels', 'role-roadmap', 'prd-ledger', 'prd-trace', 'org-model']);
const PANEL_ARCHETYPES = new Set(['role-needs', 'role-recommendation', 'screen-critique', 'screen-redesign', 'infographic-exhibit']);
export type ComposerCanvasFamily = 'cover' | 'section' | 'thesis' | 'dark' | 'table' | 'panel' | 'body';
export function composerCanvasFamily(archetype: string, spec?: { chrome?: string }): ComposerCanvasFamily {
    if (COVER_ARCHETYPES.has(archetype)) return 'cover';
    if (SECTION_ARCHETYPES.has(archetype)) return 'section';
    if (THESIS_ARCHETYPES.has(archetype) || (spec && spec.chrome === 'full-bleed-dark')) return 'thesis';
    if (DARK_BODY_ARCHETYPES.has(archetype)) return 'dark';
    if (TABLE_ARCHETYPES.has(archetype)) return 'table';
    if (PANEL_ARCHETYPES.has(archetype)) return 'panel';
    return 'body';
}

interface CanvasPlan {
    tk: ReturnType<typeof resolved>; bg: string; family: ComposerCanvasFamily;
    canvas: { kind: BrandCanvas; bodyArt: string; lockup?: boolean };
    /** paper body slides: art is resolved AGAINST THE REGIONS later (resolveArtForSlide); this flag says to. */
    wantsArt: boolean; artFile: string; zones: StageRect[];
}

/** Resolve the DECIEM canvas for a composed archetype: the derived token set (text/fill colors swapped
 *  for a dark or pop canvas), the wrapper background, the body-art pick (deck-order rotation) and its
 *  safe box. Returns null when the brand has no art block, so NXT / NU composition is untouched. */
function brandCanvasPlan(archetype: string, payload: any, tk: ReturnType<typeof resolved>, spec: ArchetypeSpec, pos?: DeckPosition): CanvasPlan | null {
    if (!tk.art) return null;
    const title = String(payload?.title || payload?.thesis || payload?.quote || payload?.number || '');
    const family = composerCanvasFamily(archetype, spec);
    const darkSwapContentRail = (color: typeof tk.color, fill: string, text: string) => ({
        ...color, rail: text, paper: fill, ink: text, body: text, secondary: tk.color.ruleMid, ecru: tk.color.graphite, hairline: mixHex(fill, text, 0.2),
    });
    if (family === 'dark') {
        // NIOD dark layout: black canvas, white type, graphite panels, pink accent kept.
        const fill = tk.color.rail, text = tk.color.paper;
        const color = spec.chrome === 'content-rail' ? darkSwapContentRail(tk.color, fill, text) : { ...tk.color };
        return { tk: { ...tk, color }, bg: fill, family, canvas: { kind: 'dark', bodyArt: '', lockup: false }, wantsArt: false, artFile: '', zones: [] };
    }
    if (family === 'table' || family === 'panel') {
        return { tk, bg: tk.color.paper, family, canvas: { kind: 'paper', bodyArt: '' }, wantsArt: false, artFile: '', zones: [] };
    }
    const role: 'cover' | 'section' | 'thesis' | 'body' = family === 'cover' ? 'cover' : family === 'section' ? 'section' : family === 'thesis' ? 'thesis' : 'body';
    const kind = brandCanvasFor(tk.brand, role);
    if (kind === 'paper') {
        // Paper canvas: a content-rail archetype keeps its ink-on-paper colors; a full-bleed-dark
        // archetype assigned a paper canvas swaps rail <-> paper so its white type turns ink.
        const swap = spec.chrome === 'full-bleed-dark';
        const color = swap ? { ...tk.color, rail: tk.color.paper, paper: tk.color.rail, ruleMid: tk.color.secondary } : tk.color;
        // art-vs-imagery: a slide carrying any filled imagery slot gets no corner art. The actual
        // background is resolved against the regions in composeSlide (skip-on-collision).
        return { tk: { ...tk, color }, bg: tk.color.paper, family, canvas: { kind, bodyArt: '' }, wantsArt: !hasFilledImagery(payload), artFile: '', zones: [] };
    }
    const divider = kind === 'pop' ? brandDividerFill(tk.brand, title, pos?.dividerOrdinal) : null;
    const fill = divider ? divider.fill : tk.color.rail;
    const text = divider ? divider.text : tk.color.paper;
    // Dark canvas: a content-rail archetype (agenda) swaps rail <-> paper so its ink type turns white;
    // a full-bleed-dark archetype already types in paper. Pop canvas: every type slot takes the fill's
    // text color (black on cyan, white on purple / pink / orange); the accent numeral too.
    const color = { ...tk.color };
    if (spec.chrome === 'content-rail') { color.rail = text; color.paper = fill; color.ink = text; color.body = text; color.secondary = text; color.ecru = fill; }
    else { color.paper = text; color.rail = fill; }
    if (divider) { color.accent = text; color.ruleMid = text; color.cyan = text; color.onAccent = fill; }
    return { tk: { ...tk, color }, bg: fill, family, canvas: { kind, bodyArt: '' }, wantsArt: false, artFile: '', zones: [] };
}

/** Round 3: the DECIEM per-archetype region adjustments that run BEFORE art resolution (title height
 *  budget, quote-mark gutter, table header band, black bands). Shared by composeSlide and the test seam. */
function deciemPrepareRegions(archetype: string, regions: Region[], plan: CanvasPlan): Region[] {
    let out = deciemTableHeader(archetype, regions);
    if (plan.canvas.kind === 'paper') out = deciemBands(out);
    out = ensureTitleFit(out);
    out = deciemQuoteMark(archetype, out);
    return out;
}

/** Round 2 (DECIEM tables): the evidence-table header row becomes a black band with white Poppins 700
 *  uppercase column heads (the template's table header). Other archetypes pass through. */
function deciemTableHeader(archetype: string, regions: Region[]): Region[] {
    if (archetype !== 'evidence-table') return regions;
    const out: Region[] = [];
    for (const r of regions) {
        if ((r as any).kind === 'columns' && (r as ColumnGroup).array === 'columns') {
            const g = r as ColumnGroup;
            const dy = g.cells[0]?.dy ?? 290;
            out.push({ kind: 'rect', x: 196, y: dy - 12, w: 1622, h: 40, color: 'rail' } as StaticRegion);
            out.push({ ...g, cells: g.cells.map(c => ({ ...c, color: 'paper', font: 'heading', weight: 700, upper: true })) });
            continue;
        }
        if ((r as any).kind === 'hairline' && (r as StaticRegion).color === 'rail' && (r as StaticRegion).y === 318) continue; // the band replaces the rule
        out.push(r);
    }
    return out;
}

/** Round 2 (DECIEM bands): the takeaway band is BLACK with white type (round-1 owner rule), never a
 *  pop fill. A wide accent rect (the composer's band carrier) becomes a rail rect; its onAccent text is
 *  already the white BAND_TEXT on DECIEM. Narrow accent rects (rules, chips, markers) are untouched. */
function deciemBands(regions: Region[]): Region[] {
    return regions.map((r) => {
        const sr = r as StaticRegion;
        if (sr.kind === 'rect' && sr.color === 'accent' && (sr.w || 0) >= 1000 && (sr.h || 0) >= 60) return { ...sr, color: 'rail' } as Region;
        return r;
    });
}

/** Round 2 (DECIEM cover photo): the photo lane keeps the cover BLACK-dominant: scrim 0.55 top / 0.92 bottom. */
function deciemCoverScrim(archetype: string, r: StaticRegion): StaticRegion {
    if (archetype !== 'cover' || r.kind !== 'scrim') return r;
    return { ...r, alphaTop: 0.55, alphaBottom: 0.92 };
}

/** The DECIEM canvas plan for an archetype + payload + deck position, exposed for the deck proof test
 *  (family, art file, safe box). null for brands without art. */
export function planCanvasFor(archetype: string, payload: any, brand: Brand, pos?: DeckPosition): { family: ComposerCanvasFamily; kind: BrandCanvas; artFile: string; zones: StageRect[]; bg: string } | null {
    const spec = archetypeSpec(archetype);
    if (!spec) return null;
    const tk = resolved(brand);
    const plan = brandCanvasPlan(archetype, payload, tk, spec, pos);
    if (!plan) return null;
    if (plan.wantsArt) {
        const regions = deciemPrepareRegions(archetype, spec.regions, plan);
        const art = resolveArtForSlide(brand, String(payload?.title || ''), pos?.deckIndex, regions, payload, plan.tk);
        if (art) return { family: plan.family, kind: plan.canvas.kind, artFile: art.pick.file, zones: art.pick.zones, bg: plan.bg };
    }
    return { family: plan.family, kind: plan.canvas.kind, artFile: '', zones: [], bg: plan.bg };
}
function dotMark(tk: ReturnType<typeof resolved>, dark: boolean): string {
    const cols = [34.7, 59.2, 83.7], rows = [986.4, 1010.9, 1035.4];
    // class="dotmark" tags the 9 accent squares as repeating chrome (hoisted to the per-variant layout).
    let d = '<div class="dotmark">';
    for (const x of cols) for (const y of rows) d += `<div style="position:absolute;left:${x}px;top:${y}px;width:10.1px;height:10.1px;background:${tk.color.accent}"></div>`;
    return d + '</div>';
}

/** Full-bleed RIGHT image-panel slot bounds [x,y,w,h] in 1920x1080 stage space, per archetype.
 *  Mirrors the Figma canon (cover 659:502, section-divider 661:473, thesis 661:474). Exported so the
 *  viz renderer (vizSlot) sizes the diagram to the actual slot — single source of truth for bounds. */
export const HERO_PANEL: Record<string, [number, number, number, number]> = {
    'cover': [1100, 0, 820, 1080],
    'section-divider': [1100, 0, 820, 1080],
    'thesis-interstitial': [1000, 0, 920, 1080],
};

/** Compose a slide from its registry archetype spec + payload + brand. Returns the inner HTML of
 * the 1920x1080 stage (the caller wraps it in the page shell). Unknown archetype -> null. */
const INLINE_SRC_RE = /\s*[(\[](?:Sources?):\s*([^)\]]{1,220})[)\]]/gi;
/** The comparison key for a source name: one spelling per source (live run 12: "AWS Machine Learning Blog" beside
 *  "aws ml blog", "Reddit Deep: r/freelance" beside "Reddit r/freelance", "reddit-deep:" beside "Reddit Deep:"). */
/** 2026-10-25 (audit: footers printed "Client document: X Copy", "- 09302026", "(live documentation, retrieved Oct
 *  2026)", "reddit-deep: r/x"): the reader sees one clean name per source. */
const PROVIDER_LABEL_RE = /\s*\((?:engagement research synthesis|(?:gemini|gpt[-\w.]*|claude[-\w.]*|openai|deepseek)?\s*\(?(?:focused|deep|web) research\)?|research synthesis)\)/gi;
/** A derived "Synthesis of A, B, C +10 more" label names the publications it drew on; those are the sources. */
function expandSourcePart(part: string): string[] {
    const m = /^\s*(?:sources?:\s*)?synthesis of\s+(.+?)(?:\s*\+\s*\d+\s*more)?\s*$/i.exec(String(part || ''));
    if (m) return m[1].split(/\s*,\s*/).filter(Boolean);
    // 2026-10-27 (run 42: "Sources: , citing PwC and SpeedMVPs"): a "citing X and Y" entry names X and Y
    const c = /^[\s,;:.-]*(?:sources?:\s*)?[\s,;:.-]*citing\s+(.+)$/i.exec(String(part || ''));
    if (c) return c[1].split(/\s*,\s*|\s+and\s+/i).filter(Boolean);
    return [part];
}
function canonSourceName(n: string): string {
    return String(n || '')
        .replace(/^[\s,;:.]+/, '')
        // a quote with its source in parentheses ('"One in three briefs stalls." (Practice operations review)') names that source
        .replace(/^\s*[“"][^”"]*[”"]\s*\(([^)]{2,80})\)\s*$/, '$1')
        // 2026-10-26 (live: "Northeastern_CoOp_CLR_Executive_Summary_Copy", "Meeting Summary - 09302026 (Oct 2026)")
        .replace(/_/g, ' ')
        // \b: "Client documentation and product briefs" lost its first word fragment ("ation and product briefs", live)
        .replace(/^\s*(?:client\s+(?:documents|document|uploads|upload)|uploaded\s+document|internal\s+(?:program\s+)?documentation)\b\s*[:,]?\s*/i, '')
        .replace(/\s*\([^)]*(?:retrieved|live documentation|accessed)[^)]*\)\s*$/i, '')
        .replace(/\s+-\s*\d{6,8}(?=\s*(?:\([^)]*\))?\s*$)/, '')
        .replace(/\s+copy\s*$/i, '')
        // a description glued after a filename ("...Continuity 1.pptx. Current management outlook combines ...")
        .replace(/(\.(?:pdf|docx?|txt|md|pptx|xlsx))\.?\s+[A-Z][\s\S]*$/i, '$1')
        // ...or after any source ("..., slide 7. The current management outlook combines contracted carryover ...")
        .replace(/\.\s+([A-Z][^;]*?)\.?\s*$/, (m, sent: string) => (DESCRIPTIVE_SOURCE(sent) ? '' : m))
        // a lowercase descriptive parenthetical ("(current management outlook combines contracted carryover ...)");
        // dates and names in parentheses start with a capital and stay
        .replace(/\s*\((?=[a-z])[^)]{24,}\)/g, '')
        // a bare medium word glued before the real name ("Blog, Simplex")
        .replace(/^(?:blog|report|article|news|website|site|page|post)\s*,\s*/i, '')
        .replace(/\.(?:pdf|docx?|txt|md|pptx|xlsx)\s*$/i, '')
        .replace(/^reddit[\s-]*deep\s*:\s*/i, 'Reddit ')
        .replace(/^reddit\s*:\s*/i, 'Reddit ')
        // 2026-10-26 (live: "EdSurge (RSS) (Aug 2026)", "and online forums"): a connector tag is how the source was
        // fetched, not its name, and a list joint is not part of the next name
        .replace(/\s*\((?:RSS|Atom|API|REST|CKAN|JSON|feed|web)\)/gi, '')
        // 2026-10-26 (live: "Sources: (focused research) (engagement research synthesis); ..."): a provider or synthesis
        // label is how the text was produced, never a source
        .replace(PROVIDER_LABEL_RE, '')
        .replace(/^\s*(?:gemini|gpt[-\w.]*|claude[-\w.]*|openai|deepseek|perplexity)\s*$/i, '')
        // a model name glued after the entry ("... 11,000 workers” gemini")
        .replace(/\s+(?:gemini|gpt[-\w.]*|claude[-\w.]*|deepseek|perplexity)\s*$/i, '')
        .replace(/^(?:and|or|plus|also)\s+/i, '')
        // a provider label removed from the front leaves its comma (run 44: "Sources: , Workforce Restructuring Findings")
        .replace(/^[\s,;:.]+/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
/** A source part that names nothing: all lowercase descriptors ("industry analysis", "online forums") with no proper
 *  noun, subreddit or domain. CLAUDE.md citation rule: a citation names the real source, never a generic category. */
const GENERIC_SOURCE_WORDS = new Set(('industry analysis analyses research study studies data source sources report reports literature online forum forums '
    + 'web internet news media social article articles press public general various multiple other client internal document documents documentation '
    + 'materials notes interview interviews survey surveys market trade publication publications commentary blog blogs post posts discussion discussions '
    + 'community communities expert experts sector review reviews evidence findings insights background context secondary primary desk '
    + 'company companies corporate filings statements disclosures announcements releases earnings annual quarterly and or the of in on from with').split(' '));
const GENERIC_SOURCE = (n: string): boolean => (!!n && !/[A-Z]/.test(n) && !/\br\/|\.\w{2,}\b|\d/.test(n)
    && n.toLowerCase().split(/[^a-z]+/).filter(Boolean).every(w => GENERIC_SOURCE_WORDS.has(w))) || DESCRIPTIVE_SOURCE(n);
/** 2026-10-26 (live footers: "Agency financial models show contrasting cost structures ...", "Sources include focused
 *  research synthesis alongside secondary research", "Blog, Simplex defines"rules and constraints ..."): a sentence that
 *  describes material, a research-process label, or a quoted fragment is not a source name. */
function DESCRIPTIVE_SOURCE(n: string): boolean {
    const t = String(n || '').trim();
    if (!t) return false;
    if (/[“”"]/.test(t)) return true;
    // a lone medium word is not a source ("Blog", "Report")
    if (/^(?:blog|report|article|news|website|site|page|post|study|survey|podcast|video)$/i.test(t)) return true;
    if (/^sources?\s+include\b|\b(?:focused|secondary|primary|desk|engagement)\s+research\b|\bresearch synthesis\b/i.test(t)) return true;
    // a lowercase topic phrase that names a kind of material, not a publisher (run 44: "workforce restructuring findings")
    if (/^[a-z][a-z\s-]*$/.test(t) && /\b(?:findings|analysis|analyses|insights|trends|data|research|overview|review|summary|synthesis|signals|patterns|themes|evidence)$/.test(t)) return true;
    // run 39: "Working pilots face shorter delivery expectations", "analysis on capacity and financial validation". Plain
    // lowercase words only (subreddits, domains and dates are names): "Reddit r/consulting and r/agency" stays.
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 4) return false;
    const lower = words.filter(w => /^[a-z]+[.,;:]?$/.test(w)).length;
    return lower >= 4 && lower / words.length >= 0.6;   // "aws ml blog (Oct 2026)" is a name written in lowercase
}
/** An attribution that names no one: every word is a generic record or role word ("Internal Meeting Record",
 *  "Program Discussion Note", "Stakeholder interview"). */
const GENERIC_ATTRIBUTION_WORDS = new Set('internal meeting meetings record records note notes program programme discussion document client interview interviews stakeholder stakeholders summary memo file transcript session working team source unknown anonymous participant participants staff report minutes and of the'.split(' '));
const GENERIC_ATTRIBUTION = (n: string): boolean => {
    const w = String(n || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
    return w.length > 0 && w.every(x => GENERIC_ATTRIBUTION_WORDS.has(x));
};
/** One source shown under two names keeps the readable one (2026-10-26 live: "Student AI Companion statement of work"
 *  beside its raw slug "SOW014 NXT Humans NU Student AI Companion EL Foundation"). */
const RAW_SLUG = (n: string): boolean => /\b[A-Z]{2,}\d{2,}\b/.test(n);
const NAME_BASE = (n: string) => canonSourceName(n).replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
    .replace(/\breddit[\s-]*deep\s*:?\s*/g, 'reddit ').replace(/\breddit\s*:\s*/g, 'reddit ')
    .replace(/\bmachine learning\b/g, 'ml').replace(/\bthe\b/g, '').replace(/[^a-z0-9/]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Same source under two spellings (2026-10-26 live: "Experiential Learning meeting summary; Experiential Learning 1
 *  Meeting Summary"): equal bases, or one name's words (copy numbers aside) all inside the other's. */
const SOURCE_STOPS = new Set(['and', 'the', 'for', 'with', 'from', 'of']);
/** Words of a source name for comparison: hyphens joined ("Co-op" = "CoOp"), stop words out (2026-10-26 live:
 *  "Northeastern CoOp CLR Executive Summary" and "Northeastern Co-op and CLR executive summary" were two sources). */
const SOURCE_WORDS = (n: string) => canonSourceName(n).toLowerCase().replace(/-/g, '')
    // a statement of work and its SOW-numbered slug are one document
    .replace(/\bstatements? of work\b/g, 'sow').replace(/\bsow\d+\b/g, 'sow')
    .split(/[^a-z0-9]+/).filter(w => /^[a-z]{3,}$/.test(w) && !SOURCE_STOPS.has(w));
/** Add a source name to a list, one entry per source; a raw slug gives way to a readable spelling of the same source. */
function pushSource(list: string[], t: string): void {
    const i = list.findIndex(n => SAME_SOURCE(n, t));
    if (i < 0) list.push(t);
    else if (RAW_SLUG(list[i]) && !RAW_SLUG(t)) list[i] = t;
}
const SAME_SOURCE = (a: string, b: string): boolean => {
    const A = NAME_BASE(a), B = NAME_BASE(b);
    if (A === B) return true;
    const wa = SOURCE_WORDS(a), wb = SOURCE_WORDS(b);
    if (wa.length < 2 || wb.length < 2) return false;
    const [small, big] = wa.length <= wb.length ? [wa, new Set(wb)] : [wb, new Set(wa)];
    return small.every(w => big.has(w));
};
/** 2026-10-23 (live out9): resolved pointers rendered as "(Source: OpenAI Blog)" inside table cells, step cards and
 *  bodies, and the source line was a two-line dump of repeated fragments. Reading matter keeps its sentences; the
 *  names collect once each on the source line. Returns a new payload only when something changed. */

/**
 * 2026-10-26 (live: the attached "Work" slides carried "Market pattern: ..." sentences, a MARKET PATTERN card and
 * "market pattern: aws ml blog" in their footers although the contract kept research out of the attached section): a
 * slide that carries the attachment in a research deck (`_attachedSection`) keeps only the attachment's content.
 */
export function stripResearchFromAttached(payload: any): any {
    if (!payload || typeof payload !== 'object' || !payload._attachedSection) return payload;
    const MP_SENTENCE = /(?:^|(?<=[.!?]['"”’]?\s))(?:a\s+)?market pattern\s*:[^.!?]*[.!?]?['"”’]?\s*/gi;
    const isMarketItem = (x: any) => x && typeof x === 'object' && ['label', 'kicker', 'name', 'heading', 'title'].some(k => /^\s*market pattern\s*$/i.test(String(x[k] || '')));
    const walk = (v: any, key: string): any => {
        if (typeof v === 'string') {
            if (key === 'sourceLine' || key === 'source') {
                const parts = v.replace(/^\s*Sources?:\s*/i, '').split(/\s*;\s*/).filter(p => !/^\s*market pattern\b/i.test(p));
                return parts.length ? (/^\s*Sources?:/i.test(v) ? `${parts.length === 1 ? 'Source' : 'Sources'}: ${parts.join('; ')}` : parts.join('; ')) : '';
            }
            return key.startsWith('_') ? v : v.replace(MP_SENTENCE, '').trim();
        }
        if (Array.isArray(v)) return v.filter(x => !isMarketItem(x)).map(x => walk(x, key));
        if (v && typeof v === 'object') { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = walk(x, k); return o; }
        return v;
    };
    return walk(payload, '');
}

/** The source fields an archetype actually draws on the slide body: a footer only skips a name the reader can see. */
function renderedSourceFields(spec: any): { top: string[]; arrays: string[] } {
    const top = new Set<string>(), arrays = new Set<string>();
    const scan = (regions: any[]) => {
        for (const r of regions || []) {
            if (r?.payload === 'attributionName') top.add('attributionName');
            if (r?.kind === 'columns' && Array.isArray(r.cells) && r.cells.some((c: any) => c?.key === 'source')) arrays.add(String(r.array));
        }
    };
    scan(spec?.regions);
    for (const v of spec?.variants || []) scan(v?.regions);
    return { top: Array.from(top), arrays: Array.from(arrays) };
}

/** Names a feed wrote in lowercase ("nvidia ai blog", "databricks ai") are printed the way the publisher writes them. */
const SOURCE_ACRONYMS: Record<string, string> = {
    ai: 'AI', ml: 'ML', aws: 'AWS', nvidia: 'NVIDIA', ibm: 'IBM', mit: 'MIT', hbr: 'HBR', bcg: 'BCG', pwc: 'PwC', ey: 'EY', kpmg: 'KPMG',
    api: 'API', ux: 'UX', cx: 'CX', hr: 'HR', saas: 'SaaS', nyt: 'NYT', wsj: 'WSJ', ft: 'FT', mckinsey: 'McKinsey', openai: 'OpenAI',
    github: 'GitHub', linkedin: 'LinkedIn', youtube: 'YouTube', techcrunch: 'TechCrunch', deepmind: 'DeepMind',
};
/** 2026-10-27 (run 43 footers "nvidia ai blog (Sep 2026)", "databricks ai"): each footer entry whose name is all
 *  lowercase is title-cased with known acronyms; subreddits, domains, handles and entries with digits stay as written. */
export function caseSourceLine(line: string): string {
    const m = String(line || '').match(/^(\s*Sources?:\s*)([\s\S]*)$/i);
    if (!m) return line;
    return m[1] + m[2].split(/\s*;\s*/).map(part => {
        const pm = part.match(/^([^()]*?)(\s*\([^)]*\))?$/);
        const name = pm ? pm[1] : '';
        if (!pm || !name || /[A-Z]/.test(name) || /r\/|\.[a-z]{2,}\b|@|\d/.test(name) || !/[a-z]/.test(name)) return part;
        return name.split(/\s+/).map(w => SOURCE_ACRONYMS[w] || (w.charAt(0).toUpperCase() + w.slice(1))).join(' ') + (pm[2] || '');
    }).join('; ');
}

/**
 * 2026-10-27 (run 43: two of three MEANS lines ended with a period and the third did not): sibling cells of one field
 * read as one style. When most of an array's values for a key end a sentence, the sentence-length others get the period.
 * Labels, figures and short phrases (under four words) are left as written.
 */
export function harmonizeSiblingPeriods(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    let out = payload;
    for (const [field, arr] of Object.entries(payload)) {
        if (!Array.isArray(arr) || arr.length < 2 || !arr.every(x => x && typeof x === 'object' && !Array.isArray(x))) continue;
        const keys = new Set<string>();
        for (const it of arr) for (const [k, v] of Object.entries(it)) if (typeof v === 'string' && !/^(figure|value|number|label|name|kicker|icon|image|source|quoteSource|_)/i.test(k)) keys.add(k);
        let next: any[] | null = null;
        for (const k of keys) {
            const vals = arr.map((it: any) => (typeof it[k] === 'string' ? it[k].trim() : ''));
            const filled = vals.filter(Boolean);
            if (filled.length < 2) continue;
            const ended = filled.filter(v => /[.!?…”’)"']$/.test(v)).length;
            if (ended * 2 < filled.length || ended === filled.length) continue;
            vals.forEach((v, i) => {
                if (!v || /[.!?…”’):;,"']$/.test(v) || v.split(/\s+/).length < 4 || !/^[A-Z“‘"']/.test(v)) return;
                next = next || arr.map((it: any) => ({ ...it }));
                next[i][k] = `${v}.`;
            });
        }
        if (next) out = out === payload ? { ...payload, [field]: next } : { ...out, [field]: next };
    }
    return out;
}

/**
 * 2026-10-27 (run 45: the user asked for "a conceptual description for a workflow visualization" on each slide and
 * about half the speaker notes described their drawing): a plain description of the slide's drawing, read from the
 * drawing's own structure (steps, nodes, milestones, bars, axes, columns). '' when the archetype draws nothing.
 */
export function describeVisual(archetype: string, p: any): string {
    const a = String(archetype || '').replace(/^slides:/, '');
    const txt = (v: unknown) => String(v ?? '').replace(/\s*\[[^\]]*\.md#c\d+[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
    const arr = (k: string) => (Array.isArray(p?.[k]) ? p[k] : []) as any[];
    if (!p || typeof p !== 'object') return '';
    if (a === 'flow-arc') {
        const t = arr('steps').map(s => txt(s?.title)).filter(Boolean);
        return t.length ? `The flow runs in ${t.length} steps: ${t.join(', then ')}.${p.outcome ? ` It ends in the outcome: ${txt(p.outcome)}` : ''}` : '';
    }
    if (a === 'infographic-exhibit') {
        const nodes = arr('nodes'), edges = arr('edges');
        if (nodes.length >= 3 && edges.length >= 2) {
            const label = (n: any) => txt(n?.label);
            const start = nodes.find(n => /input|actor/.test(String(n?.kind))) || nodes[0];
            const end = [...nodes].reverse().find(n => /outcome/.test(String(n?.kind))) || nodes[nodes.length - 1];
            const decisions = nodes.filter(n => /decision/.test(String(n?.kind))).map(label).filter(Boolean);
            return `The flowchart starts at "${label(start)}" and ends at "${label(end)}" across ${nodes.length} nodes${decisions.length ? `, branching at ${list(decisions.map(d => `"${d}"`))}` : ''}.`;
        }
        const steps = arr('steps').map(s => txt(s?.name || s?.title)).filter(Boolean);
        return steps.length ? `The process runs ${steps.join(' to ')}.` : '';
    }
    if (a === 'milestone-timeline') {
        const t = arr('milestones').map(m => txt(m?.title)).filter(Boolean);
        return t.length ? `The timeline moves through ${t.length} milestones, from "${t[0]}" to "${t[t.length - 1]}".` : '';
    }
    if (a === 'ranked-bars') {
        const t = arr('bars').map(b => txt(b?.label)).filter(Boolean);
        return t.length ? `The bars rank ${list(t.map(x => `"${x}"`))}, in that order.` : '';
    }
    if (a === 'quadrant') {
        const x = txt(p.xAxis?.label ?? p.xAxis), y = txt(p.yAxis?.label ?? p.yAxis);
        const q = arr('quadrants').map(r => txt(r?.title)).filter(Boolean);
        return (x || y) ? `The quadrant plots ${x || 'one axis'} against ${y || 'the other'}${q.length ? `, with four positions: ${list(q)}` : ''}.` : '';
    }
    if (a === 'comparison-panels') {
        const n = arr('panels').map(r => txt(r?.name)).filter(Boolean), c = arr('criteria').map(txt).filter(Boolean);
        return n.length ? `The comparison sets ${list(n)} side by side${c.length ? ` on ${list(c.map(s => s.toLowerCase()))}` : ''}.` : '';
    }
    // the drawn maps on the cover and dividers (sectionMaps) and any authored viz with labels
    if ((a === 'cover' || a === 'section-divider' || a === 'thesis-interstitial') && Array.isArray(p.viz?.labels) && p.viz.labels.length >= 2) {
        const l = (p.viz.labels as unknown[]).map(txt).filter(Boolean);
        return a === 'cover' ? `The stacked map shows the deck's ${l.length} sections in order: ${list(l)}.` : `The stacked map lists what this section covers, in order: ${list(l)}.`;
    }
    if (a === 'evidence-table') {
        const r = arr('rows').map(x => txt(x?.subject)).filter(Boolean);
        return r.length ? `The table sets ${list(r)} against each other, one row each.` : '';
    }
    if (a === 'numbered-themes') {
        const t = arr('items').map(x => txt(x?.name)).filter(Boolean);
        return t.length ? `${t.length} numbered cards read left to right: ${list(t)}.` : '';
    }
    return '';
}

/** The slide's notes, led by the drawing's description unless the notes already name most of what it shows. */
export function notesWithVisual(archetype: string, p: any, notes: string): string {
    const d = describeVisual(archetype, p);
    const n = String(notes || '').trim();
    if (!d) return n;
    const marks = (d.match(/"([^"]+)"|: ([^.]+)\./g) || []).join(' ').toLowerCase();
    const words = Array.from(new Set(marks.split(/[^a-z]+/).filter(w => w.length > 4)));
    const named = words.filter(w => n.toLowerCase().includes(w)).length;
    if (n && words.length && named / words.length >= 0.6) return n;
    return n ? `Workflow visualization: ${d}\n\n${n}` : `Workflow visualization: ${d}`;
}

/** One quote cell: curly marks, "…" before a fragment that starts mid-sentence, and the item's named source. A source
 *  written inside the quote ("... (Source: X)") moves outside the marks. Idempotent. */
export function quoteCell(it: { quote?: string; quoteSource?: string; attribution?: string; speaker?: string }): string {
    let q = String(it.quote || '').trim();
    let src = [it.quoteSource, it.attribution, it.speaker].find(s => typeof s === 'string' && s.trim())?.trim() || '';
    // already a formatted cell ("“...” (Source)" or a bare “...”): it keeps its form and takes a missing source
    if (/^“[^“”]*”\s\([^()]+\)$/.test(q)) return q;
    if (/^“[^“”]*”$/.test(q)) return src ? `${q} (${src})` : q;
    const inline = q.match(/^([\s\S]*?)[\s,;]*\(Sources?:\s*([^()]{2,90})\)\s*\.?$/i);
    if (inline && /[“"]/.test(inline[1]) === /[”"]/.test(inline[1])) { q = inline[1].trim(); src = src || inline[2].trim(); }
    q = q.replace(/^[“"]+/, '').replace(/[”"]+$/, '').trim();
    if (!q) return String(it.quote || '');
    if (/^[a-z]/.test(q) && !/^…/.test(q)) q = `…${q}`;
    return `“${q}”${src && !q.toLowerCase().includes(src.toLowerCase()) ? ` (${src})` : ''}`;
}

export function tidyInlineSources(payload: any, drawn: { top: string[]; arrays: string[] } = { top: ['attributionName'], arrays: [] }): any {
    if (!payload || typeof payload !== 'object') return payload;
    // an attached slide always names its document (run 41: one Work slide shipped with no footer)
    if (payload._provided && typeof payload._sourceDoc === 'string' && payload._sourceDoc && !String(payload.sourceLine || '').trim()) {
        payload = { ...payload, sourceLine: `Source: ${payload._sourceDoc}` };
    }
    // the quote attribution reads as a source name on every render ("Reddit Deep: r/agency" -> "Reddit r/agency")
    if (typeof payload.attributionName === 'string' && /[;_]|reddit[\s-]*deep/i.test(payload.attributionName)) {
        const parts: string[] = [];
        for (const p of payload.attributionName.split(/\s*;\s*/)) { const t = canonSourceName(p); if (t && !parts.some(x => SAME_SOURCE(x, t))) parts.push(t); }
        payload = { ...payload, attributionName: parts.join('; ') };
    }
    // the attached document's clean name replaces the filename-derived one in its slides' footers ("...Continuity 1")
    if (typeof payload._sourceDoc === 'string' && typeof payload._sourceDocRaw === 'string' && payload._sourceDocRaw && typeof payload.sourceLine === 'string') {
        const rawRe = new RegExp(payload._sourceDocRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s_]+') + '(?:\\.(?:pptx?|pdf|docx?|xlsx))?', 'gi');
        if (rawRe.test(payload.sourceLine)) payload = { ...payload, sourceLine: payload.sourceLine.replace(rawRe, payload._sourceDoc) };
    }
    const names: string[] = [];
    const addNames = (raw: string) => {
        for (const part of String(raw || '').split(/\s*;\s*/).flatMap(expandSourcePart)) {
            const t = canonSourceName(part.replace(/^\s*(?:Sources?):\s*/i, '').replace(/^and\s+\d+\s+more$/i, '').trim());
            if (t.length < 2 || GENERIC_SOURCE(t)) continue;
            pushSource(names, t);
        }
    };
    let touched = false;
    const dedupeList = (raw: string): string => {
        const seen: string[] = [];
        const parts = String(raw || '').replace(INLINE_SRC_RE, (_m, g: string) => `; ${g}`).split(/\s*;\s*/).flatMap(expandSourcePart)
            .map(part => canonSourceName(part.replace(/^\s*(?:Sources?):\s*/i, '').trim())).filter(t => t.length >= 2);
        // a generic descriptor is dropped when a named source stands beside it; alone, it is all the item has
        const named = parts.filter(t => !GENERIC_SOURCE(t));
        for (const t of (named.length ? named : parts)) pushSource(seen, t);
        return seen.join('; ');
    };
    const walk = (v: any, key: string): any => {
        if (typeof v === 'string') {
            if (key.startsWith('_') || /(?:images?|icons?|url|href|src)$/i.test(key) || /^(?:data:|https?:|\/)/.test(v)) return v;
            // a per-item source list ("Webflow blog; webflow blog (Sep 2026)") keeps one entry per source
            if (key === 'source' || key === 'sourceLine') {
                const d = key === 'source' ? dedupeList(v).split('; ').slice(0, 2).join('; ') : dedupeList(v);
                if (d !== v.replace(/^\s*(?:Sources?):\s*/i, '').trim()) { touched = true; return key === 'sourceLine' ? v.replace(/^\s*(?:Sources?):\s*/i, '').trim() === d ? v : d : d; }
                return v;
            }
            let out = v;
            if (/[(\[](?:Sources?):/i.test(out)) { touched = true; out = out.replace(INLINE_SRC_RE, (_m, g: string) => { addNames(g); return ''; }); }
            // a sentence end glued to a list separator (".;"), and a quoted word glued to its neighbours (client"homework"in)
            const norm = out.replace(/\s*\[[a-z0-9_./-]+\.md#c\d+(?:[^\]]{0,80})?\]/gi, '').replace(PROVIDER_LABEL_RE, '').replace(/\.\s*;\s*/g, '. ')
                // a quoted span glued to the word before it or after it (client"homework"in, are"a time one", not)
                .replace(/(\w)"([A-Za-z][^"\n]{0,80}?)"/g, '$1 "$2"').replace(/"([A-Za-z][^"\n]{0,80}?)"(\w)/g, '"$1" $2')
                // 2026-10-26 (live: `put it this way:"Most students aren’t...time".`): a colon before a quote takes a
                // space, and straight quotes become typographic pairs to match the curly apostrophes beside them
                .replace(/([:;,])"(?=[A-Za-z0-9‘'])/g, '$1 "')
                // single-quoted spans glued to their neighbours (live: `two:'we need better student preparation'and'we
                // need ...'`): no contraction looks like x'and'y, so the spaces come back before the apostrophe rule
                .replace(/([A-Za-z.,!?])'(and|or|but|then|to|as|vs)'(?=[A-Za-z])/g, "$1' $2 '").replace(/([:;])'(?=[A-Za-z])/g, "$1 '")
                .replace(/(^|[\s(“])'([^'\n]{2,300}?[^\s'])'(?=[\s.,;:!?)”]|$)/g, '$1‘$2’')
                .replace(/"([^"\n]{1,400})"/g, '“$1”')
                // an opening quote never closed (run 38: `targets "punish exactly the behaviors ... consulting.`) closes at
                // the end of the text
                .replace(/(^|\s)"([A-Za-z][^"“”\n]{3,400}?)\s*$/, '$1“$2”')
                .replace(/([A-Za-z])'([A-Za-z])/g, '$1’$2')
                // a curly quote glued to the word beside it (run 40: `teams see“41% fewer production incidents`)
                .replace(/([A-Za-z0-9])“/g, '$1 “').replace(/”([A-Za-z0-9])/g, '” $1')
                // a stop after a quote that already ended its sentence (run 44/45: "agents.”.", "agency.”.")
                .replace(/([.!?])([”’"'])\s*\./g, '$1$2')
                .replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
            if (norm !== v) touched = true;
            return norm;
        }
        if (Array.isArray(v)) return v.map(x => walk(x, key));
        if (v && typeof v === 'object') { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = walk(x, k); return o; }
        return v;
    };
    // 2026-10-26 (live: a verbatim quote was attributed to "Internal Meeting Record / Program Discussion Note" while the
    // quote itself cited "Northeastern CoOp CLR Executive Summary"): a generic attribution takes the quote's named source.
    const quoteSources: string[] = [];
    if (typeof payload.quote === 'string') for (const m of payload.quote.matchAll(INLINE_SRC_RE)) for (const p of String(m[1]).split(/\s*;\s*/)) { const t = canonSourceName(p); if (t.length >= 3 && !GENERIC_SOURCE(t)) quoteSources.push(t); }
    const existing = String(payload.sourceLine || '');
    const lineHasFragments = /[(\[](?:Sources?):/i.test(existing) || /;/.test(existing) || (!!existing && canonSourceName(existing.replace(/^\s*(?:Sources?):\s*/i, '')) !== existing.replace(/^\s*(?:Sources?):\s*/i, '').trim())
        // a single entry that is a description or a quote is rebuilt too (run 39: "Source: Working pilots face shorter ...")
        || (!!existing && GENERIC_SOURCE(canonSourceName(existing.replace(/^\s*(?:Sources?):\s*/i, ''))));
    const out = walk(payload, '');
    if (quoteSources.length && typeof out.attributionName === 'string' && GENERIC_ATTRIBUTION(out.attributionName)) {
        out.attributionName = quoteSources[0];
        if (typeof out.attributionRole === 'string' && GENERIC_ATTRIBUTION(out.attributionRole)) out.attributionRole = '';
        touched = true;
    }
    if (typeof out.attributionRole === 'string' && typeof out.attributionName === 'string'
        && out.attributionRole.trim() && NAME_BASE(out.attributionRole) === NAME_BASE(out.attributionName)) { out.attributionRole = ''; touched = true; }
    // 2026-10-26 (live: a quote's attribution and the footer under it named the same summary): a source the slide body
    // already names (a quote attribution, a card's own source line) is not named again in the footer.
    const shown: string[] = [];
    const shownName = (v: unknown) => { if (typeof v === 'string') for (const p of v.split(/\s*;\s*/)) { const t = canonSourceName(p); if (t.length >= 2) shown.push(t); } };
    for (const k of drawn.top) shownName(out[k]);
    for (const a of drawn.arrays) if (Array.isArray(out[a])) for (const it of out[a]) shownName(it?.source);
    const repeatsShown = !!existing && shown.length > 0 && existing.replace(/^\s*(?:Sources?):\s*/i, '').split(/\s*;\s*/).some(p => shown.some(s => SAME_SOURCE(s, canonSourceName(p))));
    if (!touched && !lineHasFragments && !repeatsShown) return caseSourceLine(payload.sourceLine) === payload.sourceLine ? payload : { ...payload, sourceLine: caseSourceLine(payload.sourceLine) };
    const inline = names.splice(0, names.length);
    addNames(existing.replace(INLINE_SRC_RE, (_m, g: string) => `; ${g}`));
    for (const n of inline) addNames(n);
    const footer = names.filter(n => !shown.some(s => SAME_SOURCE(s, n)));
    if (footer.length) out.sourceLine = (footer.length === 1 ? 'Source: ' : 'Sources: ') + footer.slice(0, 6).join('; ') + (footer.length > 6 ? `; and ${footer.length - 6} more` : '');
    else out.sourceLine = '';   // a footer that names no source (only descriptions or quotes) is not a footer
    out.sourceLine = caseSourceLine(out.sourceLine);
    if (typeof out.attributionName === 'string') out.attributionName = canonSourceName(out.attributionName);
    return out;
}

/** The universal header scene (2026-08-14; moved under the masthead 2026-10-23): a content-rail layout whose payload
 *  carries sceneImage takes the 478x140 scene at the top-right and narrows its wide title / intro rows under it.
 *  Applied to base AND variant region lists (a variant used to drop the scene). */
/**
 * 2026-10-25 NORMALIZATION (audit: title sizes ran 46 / 58 / 60 px from slide to slide, source footers had no width
 * and ran off the slide). Every archetype's regions pass through here, base and variants alike:
 *  - the source footer is ONE component: bounded to the content box, two lines at most, fitted;
 *  - a content-rail masthead title is ONE size (deckTitle) at ONE baseline with ONE leading.
 */
const CONTENT_BOX: Record<string, { left: number; right: number }> = { 'content-rail': { left: 196, right: 1818 }, 'full-bleed-dark': { left: 101, right: 1819 } };
function normalizeRegions(regions: Region[], spec: ArchetypeSpec): Region[] {
    const box = CONTENT_BOX[spec.chrome] || CONTENT_BOX['content-rail'];
    return regions.map((r) => {
        const sr = r as StaticRegion;
        if ((sr as any).kind) return r;
        if (sr.payload === 'sourceLine') {
            return { ...sr, x: box.left, y: 1018, w: box.right - box.left, leading: 1.2, fitH: 46 } as Region;
        }
        if (spec.chrome === 'content-rail' && sr.payload === 'title' && sr.font === 'display' && (sr.y || 0) >= 60 && (sr.y || 0) <= 110) {
            const w = typeof sr.w === 'number' ? Math.min(sr.w, box.right - (sr.x || box.left)) : box.right - box.left;
            return { ...sr, y: 86, size: 'deckTitle', leading: 1.06, w } as Region;
        }
        return r;
    });
}

/**
 * 2026-10-26 (live: brief-card drew four boxes and silently dropped the fifth, "2027 continuity path", which carried the
 * source's $500K / $840K / $66,625 a month): a brief-card with five or six blocks re-grids instead of truncating. Beside
 * the picture panel the 2x2 grid becomes 2 columns x 3 rows; without a picture it becomes 3 columns x 2 rows.
 */
function withBlockOverflow(archetype: string, regions: Region[], payload: any): Region[] {
    if (archetype === 'comparison-panels') return withCriteriaOverflow(regions, payload);
    if (archetype === 'agenda') return withGroupOverflow(regions, payload);
    if (archetype !== 'brief-card') return regions;
    const n = Array.isArray(payload?.blocks) ? payload.blocks.length : 0;
    if (n <= 4) return regions;
    // beside a picture the boxes widen to 560 and the picture narrows to 420 (live: 480-wide boxes cut bodies mid-phrase)
    const besidePictureGrid = regions.some((r) => (r as any).kind === 'columns' && (r as ColumnGroup).array === 'blocks' && ((r as ColumnGroup).w || 0) <= 500);
    return regions.map((r) => {
        const sr = r as StaticRegion;
        if (besidePictureGrid && sr.kind === 'image' && sr.payload === 'heroImage') return { ...sr, x: 1400, y: 300, w: 420, h: 560 } as Region;
        const g = r as ColumnGroup;
        if ((r as any).kind !== 'columns' || g.array !== 'blocks') return r;
        const count = Math.min(6, n);
        const besidePicture = (g.w || 0) <= 500;
        if (besidePicture) {
            // 2026-10-26 (live: 12-19 px between a full body and the next box's label): a 30 px gap is designed in
            return { ...g, count, cols: 2, w: 560, pitchX: 590, baseY: 336, pitchY: 226,
                cells: g.cells.map((c) => (c.key === 'body' ? { ...c, w: 560, dy: 44, fitH: 152 } : (c.w ? { ...c, w: 560 } : c))) } as Region;
        }
        return { ...g, count, cols: 3, w: 515, pitchX: 547,
            cells: g.cells.map((c) => (c.w ? { ...c, w: 515 } : c)) } as Region;
    });
}

/** comparison-panels: six to eight criteria re-pitch the five fixed rows into the same 660 px band (live: "criteria: 7
 *  given, 5 drawn"); each option panel gains one cell per row. */
function withCriteriaOverflow(regions: Region[], payload: any): Region[] {
    const n = Math.min(8, Array.isArray(payload?.criteria) ? payload.criteria.length : 0);
    if (n <= 5) return regions;
    const pitch = Math.floor(660 / n);
    return regions.map((r) => {
        const g = r as ColumnGroup;
        if ((r as any).kind !== 'columns') return r;
        if (g.array === 'criteria') {
            return { ...g, count: n, pitchY: pitch, cells: g.cells.map((c) => (c.kind === 'hairline' ? { ...c, dy: pitch - 28 } : { ...c, fitH: pitch - 34 })) } as Region;
        }
        if (g.array === 'panels') {
            const tmpl = g.cells.find((c) => c.key === 'cells.0');
            if (!tmpl) return r;
            const others = g.cells.filter((c) => !(typeof c.key === 'string' && /^cells\.\d+$/.test(c.key)));
            const rows = Array.from({ length: n }, (_, k) => ({ ...tmpl, key: `cells.${k}`, dy: 92 + k * pitch, fitH: pitch - 20 }));
            return { ...g, cells: [...others, ...rows] } as Region;
        }
        return r;
    });
}

/** agenda: three groups take three columns (live: "groups: 3 given, 2 drawn"), the panel variant three panels. */
function withGroupOverflow(regions: Region[], payload: any): Region[] {
    const n = Array.isArray(payload?.groups) ? payload.groups.length : 0;
    const panels = regions.filter((r) => (r as StaticRegion).kind === 'rect' && (r as StaticRegion).y === 300);
    // one group on the panel variant: one full-width panel (2026-10-26 live: the second dark panel stood empty)
    if (n === 1 && panels.length) {
        return regions.flatMap((r) => {
            const sr = r as StaticRegion;
            if (sr.kind === 'rect' && sr.y === 300) return sr === panels[0] ? [{ ...sr, w: 1674 } as Region] : [];
            const g = r as ColumnGroup;
            if ((r as any).kind === 'columns' && g.array === 'groups') return [{ ...g, count: 1, w: 1560, cells: g.cells.map((c) => ({ ...c, w: 1560 })) } as Region];
            return [r];
        });
    }
    if (n !== 3) return regions;
    return regions.flatMap((r) => {
        const sr = r as StaticRegion;
        if (panels.length && sr.kind === 'rect' && sr.y === 300) {
            if (sr !== panels[0]) return [];
            return [0, 1, 2].map((k) => ({ ...sr, x: 168 + k * 576, w: 552 } as Region));
        }
        const g = r as ColumnGroup;
        if ((r as any).kind === 'columns' && g.array === 'groups') {
            const w = panels.length ? 500 : 520;
            return [{ ...g, count: 3, pitchX: 576, w, cells: g.cells.map((c) => ({ ...c, w })) } as Region];
        }
        return [r];
    });
}

/** Whether a content-rail slide shows its header scene strip: a reformat always does (the client's picture); a
 *  generated slide only when its title fits one line beside the strip. */
/** The header scene's box. A region other than the title row (which narrows under it) that already sits in this box
 *  keeps it: no scene (2026-10-26 live: the scene covered "PROJECTED IMPACT" and the $470K line on role-recommendation,
 *  and the layout check passed it). */
const SCENE_BOX = { x: 1340, y: 84, w: 478, h: 140 };
function sceneBoxFree(regions: Region[]): boolean {
    const hits = (x: number, y: number, w: number, h: number) =>
        x < SCENE_BOX.x + SCENE_BOX.w && x + w > SCENE_BOX.x && y < SCENE_BOX.y + SCENE_BOX.h && y + h > SCENE_BOX.y;
    for (const r of regions) {
        const any = r as any;
        if (any.kind === 'columns') {
            const x0 = Array.isArray(any.xs) ? any.xs[0] : (any.baseX ?? 0);
            const y0 = (any.baseY ?? 0) + (any.card?.y ?? 0);
            const w = any.card?.w ?? any.w ?? 0;
            const h = any.card?.h ?? 60;
            const xLast = Array.isArray(any.xs) ? any.xs[any.xs.length - 1] : x0 + (any.pitchX || 0) * Math.max(0, (any.count || 1) - 1);
            if (hits(x0, y0, Math.max(w, xLast - x0 + w), h)) return false;
            continue;
        }
        if (typeof any.x !== 'number' || typeof any.y !== 'number') continue;
        if (any.payload === 'sceneImage') continue;
        const w = typeof any.w === 'number' ? any.w : 400;
        // the title row and its hairline narrow under the scene (withHeaderScene); everything else must stay clear
        if ((!any.kind || any.kind === 'hairline') && w > 1180 && any.y < 240) continue;
        const h = typeof any.h === 'number' ? any.h : (any.fitH || 40);
        if (hits(any.x, any.y, w, h)) return false;
    }
    return true;
}
function headerSceneRenders(spec: ArchetypeSpec | undefined, payload: any): boolean {
    if (!spec || spec.chrome !== 'content-rail') return false;
    if (!sceneBoxFree(spec.regions)) return false;
    return !!payload?._provided || String(payload?.title || '').length <= 52;
}
/** For the imagery step: skip generating a header scene the composer would not show (2026-10-26 live: five scenes
 *  were generated and then dropped beside long titles). True when no header scene is involved. */
export function wouldShowHeaderScene(archetype: string, payload: any): boolean {
    const spec = ARCHETYPE_SPECS[String(archetype || '').replace(/^slides:/, '')];
    if (!spec || spec.chrome !== 'content-rail') return true;
    return headerSceneRenders(spec, payload);
}

function withHeaderScene(regions: Region[], payload: any, spec: ArchetypeSpec): Region[] {
    if (!(typeof payload?.sceneImage === 'string' && payload.sceneImage && spec.chrome === 'content-rail')) return regions;
    if (regions.some(r => (r as StaticRegion).payload === 'sceneImage')) return regions;
    // 2026-10-26 (corpus run: three titles fell to 36 px beside the strip while the deck's titles were 46-58): the strip
    // narrows the title to 1120 px, so a title longer than one line there keeps the full width and drops the strip.
    // A reformat keeps its source picture (the client's content).
    if (!headerSceneRenders(spec, payload)) return regions;
    const narrowed = regions.map((r) => {
        const sr = r as StaticRegion;
        // 2026-10-26 (audit: the title divider ran through the header picture): the y186 hairline narrows with the text
        if ((!sr.kind || sr.kind === 'hairline') && typeof sr.w === 'number' && sr.w > 1180 && (sr.y || 0) < 240) return { ...sr, w: 1120 } as Region;
        return r;
    });
    return narrowed.concat([{ kind: 'image', x: 1340, y: 84, w: 478, h: 140, payload: 'sceneImage', fit: 'cover' } as StaticRegion]);
}

/** 2026-10-23 (owner: templates are not consulting grade): the classic exhibit anatomy closes with a SO-WHAT band.
 *  Archetypes whose body leaves the band row (y858-958) clear take `takeaway: { label, statement }` when the payload
 *  carries it; fail-open when absent. Dense variants (five criteria, six bars) keep their room. */
const TAKEAWAY_ROOM: Record<string, (p: any) => boolean> = {
    'comparison-panels': (p) => (Array.isArray(p?.criteria) ? p.criteria.length : 0) <= 4,
    'milestone-timeline': () => true,
    'ranked-bars': (p) => (Array.isArray(p?.bars) ? p.bars.length : 0) <= 5,
    'role-roadmap': () => true,
    'aggregate-roadmap': (p) => (Array.isArray(p?.roles) ? p.roles.length : 0) <= 3,
    'quadrant': () => false,
};
function withTakeawayBand(archetype: string, regions: Region[], payload: any): Region[] {
    const ok = TAKEAWAY_ROOM[archetype];
    const stmt = payload?.takeaway && typeof payload.takeaway === 'object' ? String(payload.takeaway.statement || '').trim() : '';
    if (!ok || !ok(payload) || !stmt) return regions;
    if (regions.some(r => (r as StaticRegion).payload === 'takeaway.statement')) return regions;
    return regions.concat([
        { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' } as StaticRegion,
        { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label', literal: payload.takeaway.label ? undefined : 'SO WHAT' } as StaticRegion,
        { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 60 } as StaticRegion,
    ]);
}

export function composeSlide(archetype: string, payload: any, brand: Brand, pos?: DeckPosition): string | null {
    const spec = archetypeSpec(archetype);
    if (!spec) return null;
    // 2026-06-18 (research-run-failure-analysis, Issue 2) - strip self-referential "how this deck is
    // built" meta from the title per-field. The blob-level meta sweep now skips :::slide fences (to
    // avoid deleting slide JSON), so this is where an agenda/section meta title gets caught.
    if (payload && typeof payload === 'object') {
        // 2026-06-18 - title + body hygiene. (1) scrub self-referential "how this deck
        // is built" meta from the title; (2) de-cliche EVERY model-voice field (title,
        // subtitle, body, interstitial text, MEANS/MATTERS) of business-metaphors that
        // slipped the DECK MODE prompt ban (front door, trust ceiling, the funnel, ...).
        // deClicheDeep protects verbatim quote/source keys so real quotes stay intact.
        // deep clone (payloads are pure JSON slide specs) so the in-place walk never
        // mutates the caller's object across the preview/export render calls.
        payload = JSON.parse(JSON.stringify(payload));
        if (typeof payload.title === 'string') payload.title = scrubMetaTitle(payload.title);
        // 2026-06-19 - meta-narration is scrubbed from STRUCTURAL fields too, not just the title:
        // agenda items + group labels, cover subtitle, section-divider supporting. scrubMetaTitle
        // no-ops on clean text and keeps the post-colon subject; a wholly-meta agenda item (e.g.
        // "06: How Might We questions per cluster") returns '' and is dropped. The reader must never
        // see the deck narrate its own structure ("how this deck is built", "where to ideate", ...).
        if (typeof payload.subtitle === 'string') payload.subtitle = scrubMetaTitle(payload.subtitle);
        if (typeof payload.supporting === 'string') payload.supporting = scrubMetaTitle(payload.supporting);
        // 2026-10-27 QUANTITATIVE CLAIM RULE backstop (.claude/CLAUDE.md: "KPI/stat tiles" never carry a naked number): on a
        // research slide, a stat row whose figure no quotation on the slide carries shows no figures; the slot closes and
        // the caption leads. The copy edit rewrites figures into qualitative labels first; this catches what it missed.
        // The client's own attached slides keep every figure.
        if (!payload._provided && Array.isArray(payload.stats) && payload.stats.length) {
            const strings: string[] = [];
            const collect = (v: any) => { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') Object.values(v).forEach(collect); };
            collect(payload);
            const quoted = strings.flatMap(s => s.match(/[“"][^”"]{2,400}[”"]/g) || []).join(' ');
            const nakedFig = (st: any) => { const f = String(st?.figure ?? st?.value ?? '').trim(); return /\d/.test(f) && !quoted.includes(f); };
            if (payload.stats.some(nakedFig)) payload.stats = payload.stats.map((st: any) => (st && typeof st === 'object' ? { ...st, figure: '', value: '' } : st));
        }
        payload = harmonizeSiblingPeriods(payload);
        // 2026-10-27 (run 44: some bands and divider subtitles ended without the period most of the deck carries): a
        // sentence-length statement in a band, subtitle or lede closes with a period. Titles are left as written.
        {
            // judged without a trailing parenthetical: a source label the tidy removes later must not earn a period after a
            // quote (run 45: "“...agency.” (engagement research synthesis)" became "“...agency.”.")
            const close = (v: unknown) => {
                if (typeof v !== 'string') return v;
                const t = v.trim(), core = t.replace(/\s*\([^()]*\)\s*$/, '').trim();
                return (core.split(/\s+/).length >= 7 && /^[A-Z“"]/.test(core) && /[A-Za-z0-9]$/.test(core) && core === t) ? `${t}.` : v;
            };
            for (const k of ['subtitle', 'supporting', 'lede', 'intro'] as const) if (typeof payload[k] === 'string') { const c = close(payload[k]); if (c !== payload[k]) payload = { ...payload, [k]: c }; }
            if (payload.takeaway && typeof payload.takeaway === 'object' && typeof payload.takeaway.statement === 'string') {
                const c = close(payload.takeaway.statement);
                if (c !== payload.takeaway.statement) payload = { ...payload, takeaway: { ...payload.takeaway, statement: c } };
            }
        }
        if (archetype === 'role-recommendation') {
            const own = !!payload._provided;
            if (typeof payload.actionsLabel !== 'string') payload = { ...payload, actionsLabel: own ? '' : 'SUPPORTING ACTIONS' };
            if (typeof payload.impactLabel !== 'string') payload = { ...payload, impactLabel: own ? '' : 'PROJECTED IMPACT' };
        }
        // 2026-10-27 (run 43: four italic quote lines with no quotation marks and no speaker, one a lowercase fragment
        // "clients demand working code"): a quote cell reads as a quote. Typographic marks, a leading ellipsis on a
        // mid-sentence fragment, and the named source when the item carries one (CLAUDE.md Evidence-Label rule).
        if (archetype === 'numbered-themes' && Array.isArray(payload.items)) {
            payload.items = payload.items.map((it: any) => (it && typeof it === 'object' && typeof it.quote === 'string' && it.quote.trim()) ? { ...it, quote: quoteCell(it) } : it);
        }
        // 2026-10-27 (run 45: research timelines labelled "WEEK 2-3 / 4-5 / 8-10 / 13-26" with no source behind the
        // durations; CLAUDE.md Quantitative Claim Rule): on a research slide a milestone date that carries a duration
        // reads as its place in the sequence. Years, quarters and halves ("Q1 2027", "H2 2026") stay.
        if (archetype === 'milestone-timeline' && !payload._provided && Array.isArray(payload.milestones)) {
            const ORD = ['FIRST', 'NEXT', 'THEN', 'LATER', 'AFTER', 'ONGOING'];
            const duration = (d: unknown) => typeof d === 'string' && /\d/.test(d.replace(/\b(?:19|20)\d{2}\b|\b[QH][1-4]\b|\bFY\s?\d{2,4}\b/gi, ''));
            if (payload.milestones.some((m: any) => duration(m?.date))) {
                payload = { ...payload, milestones: payload.milestones.map((m: any, i: number) => (m && typeof m === 'object' && duration(m.date)) ? { ...m, date: ORD[Math.min(i, ORD.length - 1)] } : m) };
            }
        }
        // 2026-10-26: the section the user named for an attachment ("Work") rides the divider kicker; a title that opened
        // with the same name ("Work: ...") drops the prefix so the name is said once.
        if (archetype === 'section-divider' && typeof payload._sectionKicker === 'string' && payload._sectionKicker.trim()) {
            const nm = payload._sectionKicker.trim();
            payload.kicker = nm;
            if (typeof payload.title === 'string') payload.title = payload.title.replace(new RegExp(`^\\s*${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:|-]\\s*`, 'i'), '');
        }
        // label-tier fields that shipped deck-process meta as a kicker/eyebrow (e.g. "FROM DIAGNOSIS
        // TO IDEATION"). scrubMetaTitle blanks a wholly-meta label; the title still carries the slide.
        for (const k of ['kicker', 'eyebrow', 'topicKicker'] as const) {
            if (typeof (payload as any)[k] === 'string') (payload as any)[k] = scrubMetaTitle((payload as any)[k]);
        }
        if (Array.isArray(payload.groups)) {
            for (const g of payload.groups) {
                if (g && typeof g.label === 'string') g.label = scrubMetaTitle(g.label);
                if (g && Array.isArray(g.items)) {
                    g.items = g.items
                        .map((it: any) => (typeof it === 'string' ? scrubMetaTitle(it) : it))
                        .filter((it: any) => typeof it !== 'string' || it.trim().length > 0);
                }
            }
        }
        // 2026-10-21 (information parity): a slide carrying a client document's own words (`_provided`) keeps them;
        // the cliche rewrite had turned the client's "front door" into "entry point" on a reformat.
        if (!(payload as any)._provided) payload = deClicheDeep(payload);
    payload = tidyInlineSources(stripResearchFromAttached(payload), renderedSourceFields(spec));
    // 2026-10-26 (live: an EVIDENCE column read "Client meeting" five times): CLAUDE.md Evidence-Label rule, the word
    // "Evidence" heads only verbatim quotes; a column of source kinds is labeled for what it holds.
    if (archetype === 'evidence-table' && Array.isArray(payload?.columns) && /^\s*evidence\b/i.test(String(payload.columns[3] || ''))
        && Array.isArray(payload.rows) && !payload.rows.some((r: any) => /[“"]/.test(String(r?.evidenceGrade || '')))) {
        payload.columns = payload.columns.slice(); payload.columns[3] = 'Source type';
    }
    // 2026-10-25: the derived reading legend is gone (the owner rejected the label dump twice); a flowchart takes the
    // full exhibit slot and its labels carry the reading.
    // 2026-10-23 (iconography): card archetypes take content-true glyphs at compose time (offline, deterministic).
    // A brand whose body slides carry template art (DECIEM corner art) takes no glyph row: art is never stacked on art.
    // The client's own attached slides take no added glyphs (run 45: a cursor and a coin over "Scope of work").
    if (!getBrandArt(brand) && !(payload as any)?._provided) { try { attachContentTrueIcons(archetype, payload as any, brand, spec.chrome === 'full-bleed-dark' ? 'dark' : 'light'); } catch { /* icons are optional */ } }
    }
    let tk = resolved(brand);
    // 2026-10-24 layout gate: a measured overflow steps this slide's type scale down (never below the hard floor).
    if (typeof (payload as any)?._fontScale === 'number' && (payload as any)._fontScale > 0.5 && (payload as any)._fontScale < 1) tk = { ...tk, fontScale: ((tk as any).fontScale || 1) * (payload as any)._fontScale } as typeof tk;
    let bg = spec.chrome === 'full-bleed-dark' ? tk.color.rail : tk.color.paper;
    // DECIEM canvas plan (null for NXT / NU -> the two lines above stand unchanged).
    const plan = brandCanvasPlan(archetype, payload, tk, spec, pos);
    if (plan) { tk = plan.tk; bg = plan.bg; }
    const artParts = plan ? artChrome(tk, plan.canvas) : null;
    if (!plan && spec.chrome === 'content-rail') tk = { ...tk, _lightGround: tk.color.ecru } as typeof tk;
    if (payload && (payload as any)._provided) tk = { ...tk, _noTruncate: true } as typeof tk;
    if (payload && (payload as any)._typePins && typeof (payload as any)._typePins === 'object') tk = { ...tk, _typePins: (payload as any)._typePins } as typeof tk;
    let body = artParts ? artParts.pre : chrome(spec.chrome, tk);
    // The lockup must sit ABOVE a cover photo / scrim, so the art chrome's `post` is appended after
    // the regions on every DECIEM return path.
    const finish = (inner: string, wrapperBg: string) =>
        `<div style="position:relative;width:1920px;height:1080px;background:${wrapperBg};overflow:hidden">${inner}${artParts ? artParts.post : ''}</div>`;
    // 2026-06-25 - OPTIONAL hero-image panel (P3). The left-anchored interstitials
    // carry a full-bleed RIGHT image panel slot in the Figma canon (cover 659:502,
    // section-divider 661:473, thesis 661:474). When the payload supplies `heroImage`
    // (an illustrator flat-vector data-URI/URL), render that panel and reflow the
    // title region into the LEFT column so it clears the panel (the canon content-left
    // layout); the PPTX exporter (gold_pptx_export GEO walker) then emits it as a real
    // swappable picture. When ABSENT, the layout is UNCHANGED (fail-open) - default
    // slides render exactly as before. Vision: slot bounds match the Figma canon; the
    // image src rides the payload carrier; nothing hardcoded.
    const heroSrc = payload && typeof (payload as any).heroImage === 'string' ? (payload as any).heroImage : '';
    // 2026-10-23 (live out9: two-line titles struck through the rule / column headers): every display title
    // takes the height budget to the next region, on every brand.
    let regions: Region[] = ensureTitleFit(normalizeRegions(spec.regions, spec));
    // IMAGE VARIANTS (2026-07-03): a variant's full region list replaces the base anatomy when
    // its carrier is filled (string, or array with a truthy entry). First match wins; the
    // background variant beats the legacy hero panel below (return short-circuits it).
    if (spec.variants) {
        for (const v of spec.variants) {
            const val = payload ? (payload as any)[v.when] : undefined;
            const on = (typeof val === 'string' && val.length > 0)
                || (Array.isArray(val) && val.some(Boolean));
            if (on) {
                for (const r of withBlockOverflow(archetype, withHeaderScene(ensureTitleFit(normalizeRegions(v.regions, spec)), payload, spec), payload)) {
                    const k = (r as any).kind;
                    if (k === 'columns') body += renderColumns(r as ColumnGroup, payload, tk);
                    else if (k === 'matrix') body += renderMatrix(r as MatrixRegion, payload, tk);
                    else if (k === 'chips') body += renderChips(r as ChipsRegion, payload, tk);
                    else body += renderStatic(plan ? deciemCoverScrim(archetype, r as StaticRegion) : (r as StaticRegion), payload, tk);
                }
                // A variant with a FULL-BLEED background image supplies its own canvas: the
                // wrapper goes transparent so the exported photo is the true bottom layer
                // (an opaque wrapper rect exported ABOVE the picture and buried it).
                const fullBleedBg = v.regions.some((r) => {
                    const sr = r as StaticRegion;
                    return sr.kind === 'image' && sr.x === 0 && sr.y === 0 && sr.w === 1920 && sr.h === 1080;
                });
                // 2026-10-21 (rendered archetype audit): the brand mark and dot-mark must sit ABOVE the
                // photo and scrim; the chrome painted first was buried under the full-bleed image.
                if (fullBleedBg && !artParts) body = liftChromeAbovePhoto(body, spec, tk);
                return finish(body, fullBleedBg ? 'transparent' : bg);
            }
        }
    }
    // UNIVERSAL SCENE SLOT (2026-08-14, owner mandate: EVERY slide carries an
    // image placeholder). Archetypes without a designed image variant get a
    // GENERIC, grid-safe treatment when the user authors one:
    //   content-rail  -> a header scene at the top-right (the one zone every
    //                    dense layout leaves clear); wide title rows narrow so
    //                    nothing runs under it.
    //   full-bleed-dark -> the cover/divider treatment: full-bleed photo under
    //                    a rail scrim, body regions unchanged on top.
    regions = withBlockOverflow(archetype, withHeaderScene(regions, payload, spec), payload);
    regions = withTakeawayBand(archetype, regions, payload);
    if (typeof (payload as any)?.backgroundImage === 'string' && (payload as any).backgroundImage
        && spec.chrome === 'full-bleed-dark' && !(spec as any).variants?.some((v: any) => v.when === 'backgroundImage')) {
        regions = ([
            { kind: 'image', x: 0, y: 0, w: 1920, h: 1080, payload: 'backgroundImage', fit: 'cover' } as StaticRegion,
            { kind: 'scrim', x: 0, y: 0, w: 1920, h: 1080, color: 'rail', alphaTop: 0.42, alphaBottom: 0.82 } as unknown as StaticRegion,
        ] as any[]).concat(regions as any[]) as typeof regions;
    }
    if (HERO_PANEL[archetype] && heroSrc) {
        const [ix, iy, iw, ih] = HERO_PANEL[archetype];
        // narrow any text/static region that would run under the panel into the left column; the narrowed title then
        // takes its height budget again (2026-10-26 live: rebuilt from the raw spec, a divider title lost its budget,
        // wrapped to three lines in the 939 px column and ran over the supporting line even after a 0.78 step-down)
        regions = ensureTitleFit(spec.regions.map((r) => {
            const sr = r as StaticRegion;
            if (sr.kind === undefined || sr.kind === 'text' || sr.kind === 'band') {
                const x = sr.x || 0;
                const w = typeof sr.w === 'number' ? sr.w : 0;
                if (w && x < ix && x + w > ix - 40) {
                    return { ...sr, w: Math.max(360, ix - x - 60) };
                }
            }
            return r;
        }));
        regions = regions.concat([{ kind: 'image', x: ix, y: iy, w: iw, h: ih, payload: 'heroImage', fit: 'cover' } as StaticRegion]);
    }
    if (plan) {
        // DECIEM: title height budget, quote-mark gutter, black table header band, black bands; then,
        // on paper body slides, resolve the background AGAINST THESE REGIONS: the first background in
        // the rotation whose measured zones the text can be kept out of (repairs: shorten, narrow,
        // type floor 0.9); none -> plain paper. Full content width everywhere no box meets a zone.
        regions = deciemPrepareRegions(archetype, regions, plan);
        if (plan.wantsArt) {
            const art = resolveArtForSlide(brand, String(payload?.title || ''), pos?.deckIndex, regions, payload, tk);
            if (art) {
                regions = art.regions;
                body = artChrome(tk, { kind: 'paper', bodyArt: art.pick.url }).pre + body;
            }
        }
        if (archetype === 'cover') regions = regions.map(r => deciemCoverScrim(archetype, r as StaticRegion));
    }
    for (const r of regions) {
        const k = (r as any).kind;
        if (k === 'columns') body += renderColumns(r as ColumnGroup, payload, tk);
        else if (k === 'matrix') body += renderMatrix(r as MatrixRegion, payload, tk);
        else if (k === 'chips') body += renderChips(r as ChipsRegion, payload, tk);
        else body += renderStatic(r as StaticRegion, payload, tk);
    }
    // FAIL-VISIBLE GUARD (2026-08-14, S5b - the owner's live deck rendered an
    // all-white body when a payload carried none of the spec's keys). A slide
    // must NEVER ship as a void: when the rendered body carries almost no
    // visible text, fall back to a plain title + first-strings render and log
    // the miss so the payload/spec mismatch is diagnosable.
    const _visibleText = body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (_visibleText.length < 40) {
        const strings: string[] = [];
        const walk = (v: any, d: number) => {
            if (strings.length >= 6 || d > 3 || v == null) return;
            if (typeof v === 'string' && v.trim().length > 8 && !v.startsWith('http')) strings.push(v.trim());
            else if (Array.isArray(v)) v.forEach(x => walk(x, d + 1));
            else if (typeof v === 'object') Object.entries(v).forEach(([kk, x]) => { if (!kk.startsWith('_')) walk(x, d + 1); });
        };
        walk(payload, 0);
        console.warn(`[slideComposer] fail-visible fallback for ${archetype}: rendered body was empty (payload keys: ${Object.keys(payload || {}).join(', ')})`);
        const title = strings.shift() || archetype.replace('slides:', '').replace(/-/g, ' ');
        const rest = strings.map(s =>
            `<div style="font-family:'Archivo',sans-serif;font-size:28px;line-height:1.4;color:${tk.color.body};margin-top:24px;max-width:1400px">${s.slice(0, 220)}</div>`).join('');
        body += `<div style="position:absolute;left:196px;top:120px;width:1620px">` +
            `<div style="font-family:'Saira Condensed',sans-serif;font-weight:600;font-size:58px;line-height:1.06;color:${tk.color.rail}">${title.slice(0, 140)}</div>${rest}</div>`;
    }
    // Same transparency rule as the variant path: a full-bleed photo must be the
    // true bottom layer or the export buries it under the wrapper rect.
    const _fullBleedBg = regions.some((r) => {
        const sr = r as StaticRegion;
        return sr.kind === 'image' && sr.x === 0 && sr.y === 0 && sr.w === 1920 && sr.h === 1080;
    });
    if (_fullBleedBg && !artParts) body = liftChromeAbovePhoto(body, spec, tk);
    return finish(body, _fullBleedBg ? 'transparent' : bg);
}

export function archetypeKeys(): string[] { return Object.keys(ARCHETYPE_SPECS); }
/** The registered spec for an archetype (null when unknown); the audit and the composer read the same table. */
export function archetypeSpec(archetype: string): ArchetypeSpec | null { return ARCHETYPE_SPECS[archetype] || null; }

// ---- ARCHETYPE SPECS (machine-readable anatomy from Figma 609 / the harvest fragments) ----
// Seeded with the two highest-value content archetypes + cover. The remaining 11 are added from
// plans/figma-audit/slides-archetypes/group-{a,b,c}-*.md as the migration proceeds (each addition is
// a SPEC entry, never new render code).
// 2026-06-18 - TYPE SIZES ARE TOKENIZED. Every `size:` references SCALE (hydrated from the Figma
// `type/scale/*` variables now BOUND on the 609 components), never a raw px. Geometry (x/y/w/dx/dy)
// stays literal - it is absolute-layout anatomy, not a design token. The deck-tier roles
// (kicker/deckHeading/deckTitle/numeral/hero/sectionNumeral/quoteMark) were added to the scale to
// keep the approved 609 look while removing all hardcoded sizes.
const ARCHETYPE_SPECS: Record<string, ArchetypeSpec> = {
    // numbered-themes (609:8) - 4 numbered columns; THE "profile N items/apps/themes" archetype.
    'numbered-themes': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            {
                kind: 'columns', array: 'items', count: 4, baseX: 196, pitchX: 418, w: 380,
                cells: [
                    { dy: 252, color: 'accent', font: 'display', size: 'numeral', key: 'number' },
                    { dy: 352, kind: 'hairline', h: 1 },
                    { dy: 372, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.26, key: 'name' },
                    // WS-1g measured clamp: body fits its box (quote starts dy800), quote fits
                    // to the source line (y1014). Overflow steps <=2 tiers, then clause-truncates.
                    { dy: 470, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 310 },
                    { dy: 800, color: 'secondary', font: 'body', size: SCALE.bodyReadable, italic: true, prose: true, key: 'quote', fitH: 200 },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
        // PER-ITEM ENVIRONMENTAL THUMBNAILS (2026-07-03, ideal-deck persona-segments parity):
        // when the seam fills itemImages[] (index-aligned, content-derived photographic scenes
        // of each item's OWN subject), each column carries its thumbnail between the heading
        // and the body; the quote tightens to a caption-scale line. Fail-open: no images ->
        // the base text anatomy above.
        variants: [{
            when: 'itemImages',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
                { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
                {
                    kind: 'columns', array: 'items', count: 4, baseX: 196, pitchX: 418, w: 380,
                    cells: [
                        { dy: 252, color: 'accent', font: 'display', size: 'numeral', key: 'number' },
                        { dy: 352, kind: 'hairline', h: 1 },
                        { dy: 372, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.26, key: 'name' },
                        { dy: 466, w: 380, h: 204, kind: 'image', fit: 'cover', imgCarrier: 'itemImages', key: 'image' },
                        { dy: 692, color: 'body', font: 'body', size: SCALE.caption, prose: true, key: 'body', fitH: 195 },
                        { dy: 902, color: 'secondary', font: 'body', size: SCALE.caption, italic: true, key: 'quote', fitH: 100 },
                    ],
                },
                { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
            ],
        }, {
            // 2026-10-27 (run 43: the four-message slide carried no visual at all): when no photograph fills every column,
            // each column takes a content-true glyph on its numeral row (compose-time, every column or none).
            when: 'itemIcons',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
                { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
                {
                    kind: 'columns', array: 'items', count: 4, baseX: 196, pitchX: 418, w: 380,
                    cells: [
                        { dy: 252, color: 'accent', font: 'display', size: 'numeral', key: 'number' },
                        { dx: 300, dy: 262, w: 72, h: 72, kind: 'image', fit: 'contain', imgCarrier: 'itemIcons', key: 'icon' },
                        { dy: 352, kind: 'hairline', h: 1 },
                        { dy: 372, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.26, key: 'name' },
                        { dy: 470, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 310 },
                        { dy: 800, color: 'secondary', font: 'body', size: SCALE.bodyReadable, italic: true, prose: true, key: 'quote', fitH: 200 },
                    ],
                },
                { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
            ],
        }],
    },
    // brief-card (2026-10-21, information parity): the consulting one-pager a source slide with labeled sections
    // (OBJECTIVE / APPROACH / STATUS / BUSINESS VALUE) maps to 1:1 - kicker, title, subtitle, FOUR label+body
    // blocks in a 2x2 grid, and (variant) a large picture panel on the right carrying the source slide's own image.
    // Base anatomy (no picture): the grid spans the content zone. Owner complaint this answers: "the slide templates
    // are information poor, lack compelling professional visuals" - a 110-word source slide fits here whole.
    'brief-card': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 150 },
            { x: 196, y: 246, w: 1600, color: 'body', font: 'body', size: SCALE.bodyReadable, leading: 1.35, prose: true, payload: 'subtitle', fitH: 84 },
            {
                kind: 'columns', array: 'blocks', count: 4, cols: 2, baseX: 196, pitchX: 820, baseY: 360, pitchY: 320, w: 780,
                cells: [
                    { dx: 0, dy: 0, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'label' },
                    { dx: 0, dy: 30, w: 780, kind: 'hairline', h: 2, color: 'rail' },
                    { dx: 0, dy: 48, w: 780, color: 'body', font: 'body', size: SCALE.bodyReadable, leading: 1.4, prose: true, key: 'body', fitH: 230 },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
        variants: [{
            when: 'heroImage',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
                { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 150 },
                { x: 196, y: 246, w: 1000, color: 'body', font: 'body', size: SCALE.bodyReadable, leading: 1.35, prose: true, payload: 'subtitle', fitH: 84 },
                {
                    kind: 'columns', array: 'blocks', count: 4, cols: 2, baseX: 196, pitchX: 520, baseY: 360, pitchY: 320, w: 480,
                    cells: [
                        { dx: 0, dy: 0, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'label' },
                        { dx: 0, dy: 30, w: 480, kind: 'hairline', h: 2, color: 'rail' },
                        { dx: 0, dy: 48, w: 480, color: 'body', font: 'body', size: SCALE.caption, leading: 1.4, prose: true, key: 'body', fitH: 230 },
                    ],
                },
                { kind: 'image', x: 1260, y: 246, w: 560, h: 740, payload: 'heroImage', fit: 'cover' },
                { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
            ],
        }],
    },
    // stat-row (609:6) - 3 figures with MEANS + MATTERS.
    'stat-row': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            {
                kind: 'columns', array: 'stats', count: 3, baseX: 196, pitchX: 556, w: 500,
                cells: [
                    { dy: 215, w: 500, color: 'accent', font: 'display', size: 'hero', key: 'figure', fitH: 140 },   // one line: a qualitative label steps down instead of wrapping into its headline (run 42)
                    { dy: 412, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.28, key: 'headline' },
                    { dy: 596, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MEANS', labelFor: 'means' },
                    { dy: 628, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'means' },
                    { dy: 796, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MATTERS', labelFor: 'matters' },
                    { dy: 828, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'matters' },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // infographic-exhibit (2026-07-02, #slides infographic uplift) - the deck's NATIVE DATA VISUAL
    // slide: kicker + action title + a full-width exhibit panel filled by the E4 native infographic
    // lane (/api/ai/diagram chromeless: stat-row | process-flow | comparison | ranked-bars |
    // composition, composed from the slide payload's OWN fields via infographicSpecFrom) + the
    // takeaway band. The chat seam writes composerPayload.exhibitImage (registry
    // slides:infographic-exhibit); ABSENT image -> the region renders nothing and the takeaway
    // still closes the slide (fail-open, never an empty well in exports: the GEO walker emits the
    // filled panel as a real swappable native picture).
    'infographic-exhibit': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            // 2026-11-16 (Gemini Notebook grammar, REA): a one-to-two-line explanatory SUBTITLE under the action
            // title, so the exhibit reads on its own; absent subtitle renders nothing.
            { x: 196, y: 196, w: 1600, color: 'body', font: 'body', size: SCALE.body, leading: 1.25, prose: true, payload: 'subtitle', fitH: 48 },
            // S5c FAIL-VISIBLE (2026-08-14, owner live deck shipped a white void):
            // the BASE spec renders the payload's OWN structured fields as native
            // text cards, so the zone is never empty; the native panel IMAGE is
            // the variant below (when exhibitImage fills, it replaces these).
            {
                kind: 'columns', array: 'steps', count: 5, baseX: 196, pitchX: 0, fillW: 1622, gap: 24, w: 300, baseY: 262,
                card: { y: 0, w: 300, h: 540, bg: 'ecru', rule: 4, ruleColor: 'accent' },
                cells: [
                    { dx: 20, dy: 24, w: 260, color: 'accent', font: 'display', size: 'title', key: 'number' },
                    { dx: 20, dy: 96, w: 260, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, leading: 1.25, key: 'title' },
                    { dx: 20, dy: 170, w: 260, color: 'body', font: 'body', size: SCALE.body, prose: true, leading: 1.35, key: 'description', fitH: 330 },
                ],
            },
            {
                kind: 'columns', array: 'stats', count: 4, baseX: 196, pitchX: 0, fillW: 1622, gap: 24, w: 380, baseY: 262,
                card: { y: 0, w: 380, h: 540, bg: 'ecru', rule: 4, ruleColor: 'accent' },
                cells: [
                    { dx: 24, dy: 40, w: 330, color: 'accent', font: 'display', size: 'display', key: 'figure' },
                    { dx: 24, dy: 170, w: 330, color: 'rail', font: 'heading', size: SCALE.body, weight: 700, leading: 1.3, key: 'label', fitH: 200 },
                    { dx: 24, dy: 400, w: 330, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, key: 'source' },
                ],
            },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 68 },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
        variants: [{
            when: 'exhibitImage',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
                { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
                { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
                { x: 196, y: 196, w: 1600, color: 'body', font: 'body', size: SCALE.body, leading: 1.25, prose: true, payload: 'subtitle', fitH: 48 },
                { kind: 'image', x: 196, y: 250, w: 1622, h: 600, payload: 'exhibitImage', fit: 'contain' },
                { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
                { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
                { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 68 },
                { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
            ],
        }],
    },
    // screen-critique (2026-07-07, heuristic-audit uplift Phase 1, owner directive): the audit
    // critique deck's per-screen slide. LEFT = the audited screen's ACTUAL screenshot (data-URI
    // from an upload or the /api/audit/capture-url viewport walk; contain, never cropped);
    // RIGHT = up to 4 evidence-bound findings (severity+dimension label above a finding
    // judgment, description, fix line). The deck is composed DETERMINISTICALLY from the
    // HeuristicReport by services/auditCritiqueDeck.ts (no model call for formatting); more
    // than 4 findings for a screen overflow to a continuation slide per the no-truncation
    // contract. Figma canon: 324:2 > 1003:546 (NU 1003:583).
    // v2 (2026-07-08 critique elevation, live-deck audit): 3 findings per slide at pitch 240
    // (the v1 4-at-186 layout collided: 3-line descriptions overran the fix line at dy132),
    // each finding NUMBERED with an accent numeral that matches the callout disc overlaid on
    // the screenshot (markers + imageAspect payload paths on the image region). Title = the
    // per-screen plain-English verdict from the vision pass, so it no longer duplicates
    // finding 1 verbatim.
    'screen-critique': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'title', leading: 1.04, payload: 'title' },
            { x: 196, y: 206, w: 1620, kind: 'hairline', h: 1 },
            // The screenshot arrives with the numbered discs BAKED into its pixels
            // (auditCritiqueDeck.bakeScreenAnnotations) - the only representation that
            // survives the PPTX export, where pictures layer above shape overlays.
            { kind: 'image', x: 196, y: 236, w: 760, h: 720, payload: 'screenImage', fit: 'contain' },
            // v3 spacing (2026-07-08 live-deck audit round 2): the body is a TIGHT TABULAR
            // cell (caption, non-prose - the documented density/tabular exemption; the
            // prose readable-floor clamp inflated 3-line descriptions past the fix line).
            // Generation budgets guarantee the fit: title <=8 words, description ONE
            // sentence 12-20 words (<=2 lines at caption/710px), fix <=12 words (1 line).
            {
                kind: 'columns', array: 'findings', count: 3, baseX: 1020, pitchX: 0, baseY: 236, pitchY: 248, w: 800,
                cells: [
                    { dx: 0, dy: 0, color: 'accent', font: 'display', size: 'deckTitle', key: 'number' },
                    { dx: 90, dy: 6, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'severityLabel' },
                    { dx: 90, dy: 32, w: 710, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'heading' },
                    { dx: 90, dy: 106, w: 710, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'body' },
                    { dx: 90, dy: 182, w: 710, color: 'cyan', font: 'heading', size: SCALE.caption, weight: 600, key: 'fix' },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // screen-redesign (2026-07-08 critique elevation, owner directive): side-by-side CURRENT
    // (annotated screenshot) vs PROPOSED (native tokenized render composed from the registered
    // Figma proto/* pattern catalog by the proxy - unified vision: lego-brick composition,
    // NEVER diffusion-generated UI). WHAT CHANGES takeaway band carries the rationale.
    // Figma canon: 324:2 > 1003:6166 (NU 1003:6193).
    'screen-redesign': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'title', leading: 1.04, payload: 'title' },
            { x: 196, y: 206, w: 1620, kind: 'hairline', h: 1 },
            { x: 196, y: 230, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, literal: 'CURRENT' },
            // currentImage arrives with the numbered discs baked in (see screen-critique note)
            { kind: 'image', x: 196, y: 262, w: 760, h: 500, payload: 'currentImage', fit: 'contain' },
            // NUMBERED LEGEND (2026-07-08, user-flagged): the discs on the current screenshot
            // must be decodable ON THIS SLIDE - short finding titles in the same reading-order
            // numbering, under the image.
            { x: 196, y: 778, w: 760, color: 'secondary', font: 'body', size: SCALE.caption, leading: 1.3, payload: 'legend' },
            { x: 1058, y: 230, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, literal: 'PROPOSED' },
            { kind: 'image', x: 1058, y: 262, w: 760, h: 500, payload: 'proposedImage', fit: 'contain', aspect: 'proposedAspect' },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 230, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 470, y: 876, w: 1310, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement' },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // cover (609:2) - full-bleed dark opener. Content gutter left:101 (no rail). The brand mark is
    // the real registry logo (rendered by chrome, top-right), NOT a typeset wordmark line.
    'cover': {
        chrome: 'full-bleed-dark',
        regions: [
            // 120px (not 150): NU's Lato is far wider than NXT's Saira Condensed; 150px wrapped
            // "Intelligence Augmentation" to two lines and collided with the subtitle. 120px fits one
            // line for both brands; subtitle dropped to y:640 so even a 2-line title clears it.
            { x: 101, y: 320, w: 1718, color: 'paper', font: 'display', size: 'hero', leading: 1.0, payload: 'title' },
            { x: 101, y: 640, w: 1718, color: 'ruleMid', font: 'heading', size: SCALE.subhead, weight: 500, leading: 1.3, payload: 'subtitle' },
        ],
        // FULL-BLEED PHOTOGRAPHIC COVER (2026-07-03 slides-imagery uplift, ideal-deck parity):
        // a content-derived editorial scene fills the canvas under a rail-token scrim; the same
        // white title/subtitle sit on top. Fail-open: no backgroundImage -> the dark canvas
        // above, byte-identical. The chat seam fills backgroundImage from the slide's OWN
        // title + subtitle (industry-agnostic; the corpus subject drives the scene).
        variants: [{
            when: 'backgroundImage',
            regions: [
                { kind: 'image', x: 0, y: 0, w: 1920, h: 1080, payload: 'backgroundImage', fit: 'cover' },
                { kind: 'scrim', x: 0, y: 0, w: 1920, h: 1080, color: 'rail', alphaTop: 0.30, alphaBottom: 0.74 },
                { x: 101, y: 320, w: 1718, color: 'paper', font: 'display', size: 'hero', leading: 1.0, payload: 'title' },
                { x: 101, y: 640, w: 1718, color: 'paper', font: 'heading', size: SCALE.subhead, weight: 500, leading: 1.3, payload: 'subtitle' },
            ],
        }, {
            // BOXED-COVER variant (2026-07-08 critique elevation): a BRIGHT UI screenshot
            // cannot carry white display type even under the scrim (live-deck audit), so it
            // rides a framed right panel on the dark canvas with title geometry TUNED for
            // the narrowed column (the base spec's hero-size title collided with the
            // subtitle when HERO_PANEL narrowing squeezed its width).
            when: 'heroImage',
            regions: [
                { x: 101, y: 250, w: 900, color: 'paper', font: 'display', size: 'numeral', leading: 1.06, payload: 'title' },
                { x: 101, y: 840, w: 900, color: 'ruleMid', font: 'heading', size: SCALE.bodyReadable, weight: 500, leading: 1.3, payload: 'subtitle' },
                { kind: 'image', x: 1080, y: 120, w: 760, h: 840, payload: 'heroImage', fit: 'contain' },
            ],
        }],
    },
    // scene - interactive #presentation content scene: text block (left) + a transparent on-brand
    // illustration (right half) from the Illustrator skill. full-bleed-dark; the illustration floats
    // (no box) and is generated contrast-aware for the dark canvas. payload.illustration = data-uri.
    'scene': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 300, w: 760, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 101, y: 350, w: 760, color: 'paper', font: 'display', size: 'numeral', leading: 1.04, payload: 'title' },
            { x: 101, y: 640, w: 720, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.4, payload: 'body' },
            { kind: 'image', x: 1000, y: 140, w: 860, h: 800, payload: 'illustration', fit: 'contain' },
        ],
    },
    // agenda (609:3) - paper canvas + rail; two grouped, numbered TOC columns.
    'agenda': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 64, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            // 2026-10-27 (run 43: two short TOC columns over a blank lower half): with no cover scene behind it, each group
            // sits on an ecru panel under an accent rule that spans the content zone, the paper twin of the scene variant.
            {
                kind: 'columns', array: 'groups', count: 2, baseX: 196, pitchX: 832, baseY: 252, w: 790,
                card: { y: 0, w: 790, h: 480, bg: 'ecru', rule: 6, ruleColor: 'accent' },
                cells: [
                    { dx: 44, dy: 56, w: 700, color: 'accent', font: 'display', size: SCALE.subhead, key: 'label' },   // below the 46 px title (2026-10-26: equal sizes flattened the hierarchy)
                    { dx: 44, dy: 156, w: 700, color: 'rail', font: 'heading', size: SCALE.subhead, weight: 700, leading: 2.3, key: 'items', lines: true },
                ],
            },
        ],
        // AGENDA OVER THE COVER SCENE (2026-07-03, ideal-deck parity): the deck's cover
        // background CONTINUES behind the agenda (the seam copies cover.backgroundImage here -
        // one generation per deck), a soft scrim keeps it recessive, and each TOC group sits on
        // a translucent rail panel with paper type. Fail-open: no image -> the paper layout above.
        variants: [{
            when: 'backgroundImage',
            regions: [
                { kind: 'image', x: 0, y: 0, w: 1920, h: 1080, payload: 'backgroundImage', fit: 'cover' },
                { kind: 'scrim', x: 0, y: 0, w: 1920, h: 1080, color: 'rail', alphaTop: 0.24, alphaBottom: 0.48 },
                { x: 196, y: 64, w: 1600, color: 'paper', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
                { kind: 'rect', x: 168, y: 300, w: 810, h: 700, color: 'rail', alpha: 0.84 },
                { kind: 'rect', x: 1032, y: 300, w: 810, h: 700, color: 'rail', alpha: 0.84 },
                {
                    kind: 'columns', array: 'groups', count: 2, baseX: 208, pitchX: 864, w: 730,
                    cells: [
                        { dy: 344, color: 'accent', font: 'display', size: SCALE.subhead, key: 'label' },
                        { dy: 452, color: 'paper', font: 'heading', size: SCALE.subhead, weight: 700, leading: 2.0, key: 'items', lines: true },
                    ],
                },
            ],
        }],
    },
    // section-divider (609:4) - full-bleed dark, giant accent number.
    'section-divider': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 40, w: 648, color: 'accent', font: 'display', size: 'sectionNumeral', leading: 1, payload: 'number' },
            // 2026-10-26: the section's own name ("WORK") when the user named the section (attached-section decks)
            { x: 101, y: 612, w: 1200, color: 'accent', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 101, y: 660, w: 1740, color: 'paper', font: 'display', size: 'hero', leading: 1, upper: true, payload: 'title' },
            // y 884 (2026-10-27 PowerPoint render: its wider metrics wrap the two preview lines to three, and the third sat
            // beside the 9-dot mark at y 986; from 884 a third line still ends above it)
            { x: 101, y: 884, w: 1718, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.3, payload: 'supporting', fitH: 68 },   // ends above the 9-dot mark (2026-10-26 live: the last line sat beside it)
        ],
    },
    // thesis-interstitial (609:5) - full-bleed dark, one contestable sentence.
    // 2026-08-07 owner evidence: a long thesis at hero size overflowed the slide bottom and
    // CLIPPED mid-sentence. fitH runs the measured clamp so the thesis always ends above the
    // bottom margin; y raised so a fitted 5-6 line thesis sits visually centered.
    'thesis-interstitial': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 96, w: 900, color: 'accent', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 101, y: 360, w: 1500, color: 'paper', font: 'display', size: 'hero', leading: 1.04, payload: 'thesis', fitH: 620 },
        ],
    },
    // block-quote (609:7) - hero verbatim quote + right ecru corroborating panel.
    'block-quote': {
        chrome: 'content-rail',
        regions: [
            // 2026-10-24 (owner screenshot): the mark sat on the slide edge in PowerPoint; the tiles ran into each other.
            // 2026-10-26 (live: beside a two-line title the 260px mark read as quoting the headline): the mark hangs in the
            // margin at the quote's first line, and the kicker and title sit on the content grid at x196.
            { x: 150, y: 214, color: 'accent', font: 'display', size: 'hero', literal: '“' },
            // 2026-10-25 (audit: the only body archetype with no action title): kicker at kicker tier, the action title under it.
            { x: 196, y: 48, w: 1030, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'topicKicker' },
            { x: 196, y: 86, w: 1030, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 130 },
            // 2026-10-21 (rendered audit): y236 clears the descending quote mark (it reached y236; the text began at 170).
            // 2026-10-23 (live run 13: a long quote ran under the scene panel at y540): the quote fits the band above it.
            { x: 209, y: 252, w: 1011, color: 'rail', font: 'body', size: 'title', leading: 1.44, payload: 'quote', fitH: 276 },
            { x: 209, y: 778, w: 1000, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, payload: 'attributionName', fitH: 32 },
            { x: 209, y: 814, w: 1000, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'attributionRole', fitH: 24 },
            // USER OVERRIDE 2026-06-28 scenes-where-they-fit: OPTIONAL supporting scene in the empty
            // left band between the quote (ends ~y500) and the attribution (y778). Figma slot 901:477
            // (900x200 ecru/hairline/radius-base, NU twin inherits via mode-flip). Renders only when
            // payload.panelImage is supplied; empty -> nothing (fail-open). Traces to the quote subject.
            { kind: 'image', x: 209, y: 540, w: 900, h: 200, payload: 'panelImage', fit: 'cover' },
            // corroborating panel
            { kind: 'rect', x: 1267, y: 120, w: 573, h: 778, color: 'ecru', rule: 9, ruleColor: 'rail' },
            { x: 1299, y: 158, w: 500, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, literal: 'CORROBORATING DATA' },
            {
                kind: 'columns', array: 'corroborating', count: 3, baseX: 1299, pitchX: 0, baseY: 210, pitchY: 222, w: 510,
                cells: [
                    { dy: 0, w: 510, color: 'accent', font: 'display', size: 'display', key: 'figure', fitH: 66 },
                    { dy: 84, w: 510, color: 'rail', font: 'heading', size: SCALE.caption, weight: 700, leading: 1.2, key: 'label', fitH: 66 },
                    { dy: 156, w: 510, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, leading: 1.15, key: 'source', fitH: 42 },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // evidence-table (609:9) - 4-column named-subject comparison + PEER PATTERN band.
    'evidence-table': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            // title at `title` (46) not deckTitle (58): the dense table is space-constrained, and a
            // long (2-line) action title at 58 overflowed into the intro/headers. 46 keeps a 2-line
            // title clear of the intro at y206 while still governing over the 28 body.
            { x: 196, y: 80, w: 1620, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.04, payload: 'title' },
            { x: 196, y: 206, w: 1560, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, payload: 'intro' },
            // column headers (non-uniform x)
            {
                kind: 'columns', array: 'columns', count: 4, baseX: 0, pitchX: 0, xs: [196, 470, 1034, 1638], w: 280,
                // 2026-10-23 (live: a long third heading wrapped under the rule): one line, shrink-to-fit.
                cells: [{ dy: 290, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.96, upper: true, fitH: 24 }],
            },
            { x: 196, y: 318, w: 1622, kind: 'hairline', h: 2, color: 'rail' },
            // rows (vertical stack); each row = paper card + accent left bar + 4 fields.
            // prove/implication are TIGHT TABULAR cells (6 rows in 76px cards) - intentionally NOT prose
            // (caption tier), the documented density/tabular exemption to the readable-body floor.
            {
                kind: 'columns', array: 'rows', count: 6, baseX: 196, pitchX: 0, baseY: 330, pitchY: 84, fillH: 520, gapY: 8, w: 1622,
                card: { y: 0, w: 1622, h: 76, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 24, dy: 16, w: 240, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.12, key: 'subject', fitH: 66 },
                    // WS-1g measured clamp: prove/implication are already at the caption floor,
                    // so an over-budget cell clause-truncates to its 2-line capacity (76px card).
                    { dx: 274, dy: 18, w: 540, color: 'body', font: 'body', size: SCALE.body, leading: 1.3, key: 'prove', fitH: 56, grow: true },
                    { dx: 838, dy: 18, w: 580, color: 'body', font: 'body', size: SCALE.body, leading: 1.3, key: 'implication', fitH: 56, grow: true },
                    { dx: 1442, dy: 18, w: 160, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, key: 'evidenceGrade' },
                ],
            },
            // PEER PATTERN takeaway band (h grown to 100 so a 2-line 28px statement clears)
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 68 },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // problem-diptych (609:10) - full-bleed dark, two equal contrasting cards.
    'problem-diptych': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 96, w: 900, color: 'accent', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 101, y: 180, w: 1718, color: 'paper', font: 'display', size: 'numeral', leading: 1.04, payload: 'title' },
            { x: 101, y: 350, w: 1718, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.4, payload: 'subhead' },
            {
                kind: 'columns', array: 'cards', count: 2, baseX: 101, pitchX: 880, w: 760,
                card: { y: 460, w: 840, h: 420, bg: 'graphite', rule: 4, ruleColor: 'accent' },
                cells: [
                    { dx: 40, dy: 500, color: 'accent', font: 'display', size: 'numeral', key: 'numeral' },
                    { dx: 40, dy: 644, w: 760, color: 'paper', font: 'heading', size: 'title', weight: 700, leading: 1.1, key: 'heading' },
                    { dx: 40, dy: 764, w: 760, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 100 },
                ],
            },
        ],
    },
    // org-model (609:11) - 3-column operating model (peer columns, not a tier matrix).
    'org-model': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', payload: 'title' },
            {
                kind: 'columns', array: 'columns', count: 3, baseX: 196, pitchX: 556, w: 472,
                card: { y: 240, w: 520, h: 660, bg: 'paper', rule: 5, ruleColor: 'accent' },
                cells: [
                    { dx: 24, dy: 280, w: 472, color: 'rail', font: 'display', size: SCALE.subhead, key: 'name' },
                    // fitH: definition band ends at the dy482 hairline; a 4-line definition used to
                    // strike straight through it (0f collision class, bakeoff 2026-07-09 slide 10).
                    // 2026-10-23 (live: every definition clamped mid-sentence while a quarter of the card sat empty):
                    // the definition takes 150px; the lower blocks move down 60px; the glyph rides beside the name.
                    { dx: 24, dy: 384, w: 472, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'definition', fitH: 150 },
                    { dx: 24, dy: 542, w: 472, kind: 'hairline', h: 1 },
                    { dx: 24, dy: 570, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'teams.label' },
                    { dx: 24, dy: 600, w: 472, color: 'rail', font: 'body', size: SCALE.caption, leading: 1.5, key: 'teams.items', lines: true, fitH: 100 },
                    { dx: 24, dy: 712, w: 472, kind: 'hairline', h: 1 },
                    { dx: 24, dy: 740, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'outcomes.label' },
                    { dx: 24, dy: 770, w: 472, color: 'body', font: 'body', size: SCALE.caption, leading: 1.5, key: 'outcomes.lines', lines: true, fitH: 110 },
                    // USER OVERRIDE 2026-06-28 scenes-where-they-fit: OPTIONAL per-column CONTENT-TRUE
                    // operating-model glyph in the empty card-bottom band (local y800). Figma slots
                    // 901:5476/5477/5478 (72x72 ecru/hairline/radius-base, NU twin inherits). Renders
                    // only when columns[i].icon is supplied; empty -> nothing (fail-open). icon = a
                    // tokenized glyph per column's operating archetype, never decoration.
                    { dx: 424, dy: 268, w: 72, h: 72, kind: 'image', fit: 'contain', imgCarrier: 'columnIcons', key: 'icon' },
                ],
            },
        ],
    },
    // role-needs (609:12, G1) - one role's challenges + persona-needs card.
    'role-needs': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            // leading 1.06 + fitH (2026-08-07 owner evidence): the default loose leading floated
            // a wrapped title's lines apart and ran the second line into CURRENT CHALLENGES.
            { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 150 },
            { x: 196, y: 254, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, literal: 'CURRENT CHALLENGES' },
            { x: 196, y: 286, w: 1000, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'challenges', count: 3, baseX: 196, pitchX: 0, baseY: 312, pitchY: 170, w: 800,
                cells: [
                    { dx: 0, dy: 0, color: 'accent', font: 'display', size: 'deckTitle', key: 'numeral' },
                    { dx: 110, dy: 0, w: 800, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, key: 'heading' },
                    { dx: 110, dy: 44, w: 800, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 120 },
                ],
            },
            // persona card
            { kind: 'rect', x: 1260, y: 256, w: 560, h: 624, color: 'paper', rule: 5, ruleColor: 'rail' },
            { x: 1290, y: 300, w: 500, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, payload: 'persona.needsLabel' },
            { x: 1290, y: 332, w: 500, color: 'rail', font: 'heading', size: SCALE.name, weight: 700, payload: 'persona.name' },
            {
                kind: 'columns', array: 'persona.needs', count: 3, baseX: 1290, pitchX: 0, baseY: 420, pitchY: 150, w: 480,
                cells: [
                    { dx: 0, dy: 0, w: 3, h: 96, kind: 'hairline', color: 'accent' },
                    { dx: 20, dy: 0, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'kind' },
                    { dx: 20, dy: 30, w: 460, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 112 },
                ],
            },
        ],
        // PERSONA ENVIRONMENTAL PORTRAIT (2026-07-03, ideal-deck parity): when the seam fills
        // portraitImage (a content-derived photograph of THIS role in its real working
        // context), the persona card grows and leads with the portrait. Fail-open: no image ->
        // the base text card above.
        variants: [{
            when: 'portraitImage',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
                { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 150 },
                { x: 196, y: 254, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, literal: 'CURRENT CHALLENGES' },
                { x: 196, y: 286, w: 1000, kind: 'hairline', h: 2, color: 'rail' },
                {
                    kind: 'columns', array: 'challenges', count: 3, baseX: 196, pitchX: 0, baseY: 312, pitchY: 170, w: 800,
                    cells: [
                        { dx: 0, dy: 0, color: 'accent', font: 'display', size: 'deckTitle', key: 'numeral' },
                        { dx: 110, dy: 0, w: 800, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, key: 'heading' },
                        { dx: 110, dy: 44, w: 800, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 120 },
                    ],
                },
                // persona card, portrait-led (taller than the base card)
                { kind: 'rect', x: 1260, y: 216, w: 560, h: 764, color: 'paper', rule: 5, ruleColor: 'rail' },
                { kind: 'image', x: 1260, y: 221, w: 560, h: 236, payload: 'portraitImage', fit: 'cover' },
                { x: 1290, y: 484, w: 500, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, payload: 'persona.needsLabel' },
                { x: 1290, y: 516, w: 500, color: 'rail', font: 'heading', size: SCALE.name, weight: 700, payload: 'persona.name' },
                // pitch 140 + fitH 92 (2026-08-07 owner evidence): the prose readable-floor clamp
                // grew a 3-line need past the 124 pitch and ran it into the next block's label.
                {
                    kind: 'columns', array: 'persona.needs', count: 3, baseX: 1290, pitchX: 0, baseY: 572, pitchY: 132, w: 480,
                    cells: [
                        { dx: 0, dy: 0, w: 3, h: 92, kind: 'hairline', color: 'accent' },
                        { dx: 20, dy: 0, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'kind' },
                        { dx: 20, dy: 30, w: 460, color: 'body', font: 'body', size: SCALE.caption, prose: true, key: 'body', fitH: 92 },
                    ],
                },
            ],
        }],
    },
    // role-recommendation (609:13, G2) - thesis + 3 actions + 3 projected-impact tiles.
    'role-recommendation': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 150 },
            { x: 196, y: 248, w: 1000, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, payload: 'thesis' },
            // 2026-10-27 (run 44: a client's account slide carried 'SUPPORTING ACTIONS' over its scope, team and buying
            // notes): the column labels ride the payload; the composer defaults them (blank on the client's own slides).
            { x: 196, y: 388, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, payload: 'actionsLabel' },
            { x: 196, y: 420, w: 940, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'actions', count: 3, baseX: 196, pitchX: 0, baseY: 446, pitchY: 180, w: 800,
                cells: [
                    { dx: 0, dy: 0, color: 'accent', font: 'display', size: 'deckTitle', key: 'numeral' },
                    { dx: 110, dy: 0, w: 800, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, key: 'heading' },
                    // fitH: each action ends above the next heading (run 44: four-line bodies ran into it)
                    { dx: 110, dy: 42, w: 800, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 126 },
                ],
            },
            { x: 1260, y: 94, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, payload: 'impactLabel' },
            { x: 1260, y: 126, w: 560, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'impact', count: 3, baseX: 1260, pitchX: 0, baseY: 152, pitchY: 254, w: 520,
                card: { y: 0, w: 560, h: 230, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 20, dy: 24, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'label' },
                    { dx: 20, dy: 60, w: 520, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.1, key: 'headline' },
                    // fitH: the body ends inside its card (run 44: a four-line body ran past the card and its accent rule)
                    { dx: 20, dy: 130, w: 520, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body', fitH: 92 },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // role-roadmap (609:14, G3) - one role's 4-phase roadmap.
    'role-roadmap': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', payload: 'title' },
            {
                kind: 'columns', array: 'phases', count: 4, baseX: 196, pitchX: 412, w: 388,
                cells: [
                    { dy: 268, w: 388, h: 5, kind: 'hairline', color: 'accent' },
                    { dy: 286, w: 388, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.8, upper: true, key: 'label' },
                    { dy: 316, w: 364, color: 'rail', font: 'display', size: 'title', key: 'name' },
                    { dy: 404, w: 364, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, leading: 1.5, key: 'items', lines: true },
                ],
            },
        ],
    },
    // aggregate-roadmap (609:15) - role-rows x horizon-columns matrix.
    'aggregate-roadmap': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', payload: 'title' },
            {
                kind: 'matrix', headers: 'horizons', rows: 'roles', rowLabelKey: 'name', cellsKey: 'cells',
                headerY: 230, baseX: 420, colPitch: 366, cellW: 350,
                rowBaseY: 304, rowPitch: 216, cellH: 176, labelX: 196, emphasizeLast: true,
            },
        ],
    },
    // ---- NATIVE DIAGRAM TIER (2026-07-09, WS-1b slides-strategic-visual-uplift) ----
    // The missing visual bricks: diagram-shaped content (positioning, process, time, magnitude,
    // side-by-side options, the Farm stat anatomy) finally lands on a NATIVE archetype instead of
    // text columns or a rasterized exhibit. All six are pure rects + hairlines + text runs
    // (no SVG, no raster), so the PPTX GEO walker exports every element as an editable shape.

    // quadrant - 2x2 strategy quadrant: two axis labels, four titled cells (up to 3 short items
    // each), and 3-8 plotted subject chips rendered inside their quadrant as accent-bordered
    // chips. Quadrant order is TL, TR, BL, BR (subjects reference them 1-4).
    // Figma canon: 324:2 > 1003:6220 (NU 1003:6254).
    'quadrant': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            // axis labels: y-axis above the plot, x-axis below it (both clear of the quadrant cells)
            { x: 196, y: 230, w: 800, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, tracking: 1, upper: true, payload: 'yAxis' },
            { x: 196, y: 962, w: 800, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, tracking: 1, upper: true, payload: 'xAxis' },
            // plot dividers: one vertical + one horizontal rail hairline (collision-free grid geometry)
            { kind: 'hairline', x: 1006, y: 268, w: 2, h: 682, color: 'rail' },
            { kind: 'hairline', x: 196, y: 609, w: 1622, h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'quadrants', count: 4, cols: 2, baseX: 216, pitchX: 811, baseY: 284, pitchY: 341, w: 740,
                cells: [
                    { dy: 0, w: 740, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, tracking: 0.5, upper: true, key: 'title' },
                    { dy: 40, w: 740, color: 'body', font: 'body', size: SCALE.caption, leading: 1.5, key: 'items', lines: true },
                ],
            },
            // plotted subjects: accent-bordered chips stacked inside their quadrant cell (max 3
            // per quadrant, 8 overall; extras drop deterministically - graceful overflow).
            {
                kind: 'chips', array: 'subjects', labelKey: 'label', groupKey: 'quadrant',
                origins: [[216, 452], [1027, 452], [216, 793], [1027, 793]],
                w: 360, chipH: 40, pitchY: 50, perGroupMax: 3, max: 8,
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // flow-arc - 3-6 step process: numbered step cards in a horizontal band with thin accent
    // connector rects between them; optional accent OUTCOME tail band (variant). THE brick for
    // process-shaped content (the V3 class: phases, pipelines, sequences).
    // Figma canon: 324:2 > 1004:641 (NU 1004:679).
    'flow-arc': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            {
                kind: 'columns', array: 'steps', count: 6, baseX: 196, pitchX: 272, fillW: 1622, gap: 56, w: 260, baseY: 360,
                card: { y: 0, w: 260, h: 420, bg: 'ecru', rule: 4, ruleColor: 'accent' },
                connector: { dy: 200, h: 6 },
                cells: [
                    { kind: 'image', dx: 176, dy: 28, w: 60, h: 60, fit: 'contain', imgCarrier: 'stepIcons', key: 'icon' },
                    { dx: 20, dy: 24, color: 'accent', font: 'display', size: 'deckTitle', autoNumber: true },
                    { dx: 20, dy: 108, w: 220, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'title', fitH: 76 },
                    { dx: 20, dy: 196, w: 220, color: 'body', font: 'body', size: SCALE.body, leading: 1.35, key: 'description', fitH: 200, grow: true },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
        // OUTCOME variant: when payload.outcome is present the step band rises and an accent
        // outcome band closes the slide (same anatomy as the takeaway band). Fail-open: no
        // outcome -> the centered base layout above, byte-identical.
        variants: [{
            when: 'outcome',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
                { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
                { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
                {
                    kind: 'columns', array: 'steps', count: 6, baseX: 196, pitchX: 272, fillW: 1622, gap: 56, w: 260, baseY: 300,
                    card: { y: 0, w: 260, h: 480, bg: 'ecru', rule: 4, ruleColor: 'accent' },
                    connector: { dy: 200, h: 6 },
                    cells: [
                        { kind: 'image', dx: 176, dy: 28, w: 60, h: 60, fit: 'contain', imgCarrier: 'stepIcons', key: 'icon' },
                        { dx: 20, dy: 24, color: 'accent', font: 'display', size: 'deckTitle', autoNumber: true },
                        { dx: 20, dy: 108, w: 220, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'title', fitH: 76 },
                        { dx: 20, dy: 196, w: 220, color: 'body', font: 'body', size: SCALE.body, leading: 1.35, key: 'description', fitH: 200, grow: true },
                    ],
                },
                { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
                { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, literal: 'OUTCOME' },
                { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'outcome', fitH: 68 },
                { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
            ],
        }],
    },
    // milestone-timeline - horizontal time axis (hairline rect) with 3-6 milestone nodes: accent
    // dot, mono date label, title + one-line detail ALTERNATING above/below the axis (dyOdd) so
    // adjacent milestones never collide. Figma canon: 324:2 > 1004:6263 (NU 1004:6304).
    'milestone-timeline': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            // 2026-10-23: an optional intro sentence under the title (fail-open when absent)
            { x: 196, y: 206, w: 1560, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, payload: 'intro', fitH: 76 },
            // the time axis (70px higher than the 2026-07 geometry: the band under the title sat empty)
            { kind: 'hairline', x: 196, y: 539, w: 1622, h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'milestones', count: 6, baseX: 196, pitchX: 274, spreadW: 1622, w: 250,
                cells: [
                    // node: accent square dot on the axis + a short stem toward the content side
                    // 2026-10-25 (audit: labels sat 116px off their markers): the node anchors the labels' left edge.
                    { kind: 'hairline', dx: 0, dy: 531, w: 18, h: 18, color: 'accent' },
                    { kind: 'hairline', dx: 8, dy: 506, dyOdd: 550, w: 2, h: 22, color: 'hairline' },
                    // even items: title+detail ABOVE the axis, date below; odd items mirrored
                    { dx: 0, dy: 370, dyOdd: 606, w: 250, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'title', fitH: 60 },
                    { dx: 0, dy: 436, dyOdd: 672, w: 250, color: 'body', font: 'body', size: SCALE.body, leading: 1.3, key: 'detail', fitH: 84 },
                    { dx: 0, dy: 570, dyOdd: 482, w: 250, color: 'secondary', font: 'mono', size: SCALE.label, weight: 500, tracking: 1, upper: true, key: 'date' },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // means-matters - the Farm-reference stat anatomy: 2-3 columns, each an accent hero numeral
    // (numeral tier - below the hero cap, so the deckTitle action title stays the governing
    // line) + plain caption + MEANS label (cyan mono) + readable body + MATTERS as a DARK CARD
    // (rail bg, accent text); ONE source line closes the slide. Distinct from stat-row: the
    // MATTERS layer is a card, the numeral defers to the title. Figma canon: 324:2 > 1004:6345 (NU 1004:6381).
    'means-matters': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            {
                kind: 'columns', array: 'stats', count: 3, baseX: 196, pitchX: 556, fillW: 1622, gap: 64, w: 500,
                cells: [
                    { dy: 226, w: 500, color: 'accent', font: 'display', size: 'numeral', key: 'figure', fitH: 96 },   // one line (run 42)
                    { dy: 330, w: 500, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.25, key: 'caption', fitH: 62 },
                    { dy: 414, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MEANS', labelFor: 'means' },
                    { dy: 446, w: 500, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'means', fitH: 170 },
                    // MATTERS dark card: rail block + accent label + accent body (native rects + runs)
                    { kind: 'hairline', dy: 648, w: 500, h: 240, color: 'rail' },
                    { dx: 24, dy: 672, color: 'accent', font: 'mono', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MATTERS', labelFor: 'matters' },
                    { dx: 24, dy: 706, w: 452, color: 'accent', font: 'body', size: SCALE.bodyReadable, prose: true, leading: 1.25, key: 'matters', fitH: 160 },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // ranked-bars - horizontal proportional bars: 3-6 rows, each label (left) + accent bar
    // scaled by a 0-100 RELATIVE value on an ecru track + note (right). The value is NEVER
    // rendered as text (naked-number ban); any figure rides the note's cited quote. Pure rects.
    // Figma canon: 324:2 > 1008:753 (NU 1010:788).
    'ranked-bars': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            {
                kind: 'columns', array: 'bars', count: 6, baseX: 196, pitchX: 0, baseY: 250, pitchY: 122, w: 1622,
                cells: [
                    { dx: 0, dy: 12, w: 340, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.15, key: 'label', fitH: 56 },
                    { kind: 'hairline', dx: 360, dy: 14, w: 800, h: 28, color: 'ecru' },
                    { kind: 'bar', dx: 360, dy: 14, w: 800, h: 28, color: 'accent', key: 'value' },
                    // fitH 72: three caption lines end above the row rule at 88 px (run 45: two-line notes were cut mid-phrase)
                    { dx: 1180, dy: 12, w: 440, color: 'secondary', font: 'body', size: SCALE.caption, leading: 1.3, key: 'note', fitH: 72 },
                    { kind: 'hairline', dx: 0, dy: 88, w: 1622, h: 1, color: 'hairline' },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // comparison-panels - 2-3 side-by-side option panels, each a rail header band + 3-5 criterion
    // cells ALIGNED across panels on shared full-width hairline rows, with the criterion labels
    // in a left rail column. Distinct from evidence-table (row cards, one comparison axis): this
    // is option-vs-option down a criteria list. Figma canon: 324:2 > 1010:753 (NU 1010:828).
    // 2026-08-07 owner uplift ("bland; doesn't feel like previous vs proposed"): the FIRST
    // panel (the incumbent) recesses behind a muted band; every later panel (the proposal)
    // advances with a black band + accent top rule; an accent connector bridges the bands so
    // the eye travels previous -> proposed; an optional per-panel glyph (payload.panelIcons,
    // index-aligned, filled by the visual router) sits in the band; body raised to the
    // readable tier and the whole table pulled up into the dead zone.
    'comparison-panels': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            // criterion label rail (vertical stack) + full-width row separators (drawn per real
            // criterion, so a 3-row payload never leaves floating hairlines)
            {
                kind: 'columns', array: 'criteria', count: 5, baseX: 196, pitchX: 0, baseY: 344, pitchY: 132, w: 280,
                cells: [
                    { dx: 0, dy: 0, w: 280, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.96, upper: true },
                    { kind: 'hairline', dx: 0, dy: 122, w: 1622, h: 1, color: 'hairline' },
                ],
            },
            // option panels: header band + one cell per criterion (cells.0..cells.4 align
            // with the criteria rows by shared pitch)
            {
                kind: 'columns', array: 'panels', count: 3, baseX: 500, pitchX: 449, fillW: 1318, gap: 48, w: 420, baseY: 252,
                card: { y: 0, w: 420, h: 64, bg: 'rail' },
                cardOverrides: [
                    { bg: 'secondary' },
                    { rule: 4, ruleColor: 'accent' },
                    { rule: 4, ruleColor: 'accent' },
                ],
                connector: { dy: 30, h: 3, color: 'accent' },
                cells: [
                    { kind: 'image', dx: 14, dy: 12, w: 40, h: 40, imgCarrier: 'panelIcons' },
                    { dx: 66, dy: 16, w: 340, color: 'paper', font: 'heading', size: 'deckHeading', weight: 700, key: 'name' },
                    // fitH 116 under a divider at 122 px (2026-10-27 run 43: a fourth line printed across the divider at
                    // 104 px; a 98 px box then cut the cell mid-phrase): four readable lines fit above the rule
                    { dx: 8, dy: 92, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.0', fitH: 116 },
                    { dx: 8, dy: 224, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.1', fitH: 116 },
                    { dx: 8, dy: 356, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.2', fitH: 116 },
                    { dx: 8, dy: 488, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.3', fitH: 116 },
                    { dx: 8, dy: 620, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.4', fitH: 116 },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // ---- PRD PROJECTION TIER (2026-10-01, Stage 3.3 of plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md) ----
    // The #prd deck is a PROJECTION of PrdAir (services/prdProjection.ts), never a second source of
    // truth. Four archetypes replace the `slides:prd-feature` collision (an unregistered key that fell
    // through to renderGeneric with a developer note printed on the slide, the preview and the PPTX).
    // Payload rule: any design-decision number rides in a typed `requirement_target` object (the
    // `target` carrier, read here by dot-path `target.label`); every prose cell stays digit-free.
    // prd-story: a story column + up to three evidence cards + a band. Carries the problem (cards =
    // verbatim quotes, band = why now), goals and non-goals (cards = non-goals, band = the typed
    // appetite target) and risks (cards = failure modes, band = the pre-mortem mitigation).
    'prd-story': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title', fitH: 150 },
            { x: 196, y: 254, w: 600, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, payload: 'storyLabel' },
            { x: 196, y: 286, w: 740, kind: 'hairline', h: 2, color: 'rail' },
            { x: 196, y: 306, w: 740, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, payload: 'story', fitH: 520 },
            {
                kind: 'columns', array: 'cards', count: 3, baseX: 1000, pitchX: 0, baseY: 254, pitchY: 196, fillH: 580, gapY: 12, w: 816,
                card: { y: 0, w: 816, h: 184, bg: 'ecru', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 28, dy: 20, w: 760, color: 'rail', font: 'heading', size: SCALE.name, weight: 700, leading: 1.15, key: 'heading', fitH: 44 },
                    { dx: 28, dy: 68, w: 760, color: 'body', font: 'body', size: SCALE.caption, leading: 1.35, key: 'body', fitH: 72 },
                    { dx: 28, dy: 150, w: 760, color: 'secondary', font: 'mono', size: SCALE.label, tracking: 0.6, key: 'foot', fitH: 22 },
                ],
            },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'band.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'band.statement', fitH: 64 },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // prd-ledger: the requirements ledger. ID | TIER | REQUIREMENT | TRACES | ACCEPTANCE TEST, one row
    // per requirement; a HYPOTHESIS requirement carries the tier label BET and its test in TRACES.
    'prd-ledger': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 80, w: 1620, color: 'rail', font: 'display', size: 'title', leading: 1.04, payload: 'title', fitH: 110 },
            {
                kind: 'columns', array: 'columns', count: 5, baseX: 0, pitchX: 0, xs: [212, 300, 440, 960, 1310], w: 240,
                cells: [{ dy: 236, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.96, upper: true }],
            },
            { x: 196, y: 264, w: 1622, kind: 'hairline', h: 2, color: 'rail' },
            // The ACCEPTANCE TEST column is the widest: a complete Given/When/Then sentence needs three
            // lines at caption size, and the no-truncation contract would otherwise cut it to its Given.
            {
                kind: 'columns', array: 'rows', count: 5, baseX: 196, pitchX: 0, baseY: 278, pitchY: 112, fillH: 560, gapY: 8, w: 1622,
                card: { y: 0, w: 1622, h: 104, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 16, dy: 14, w: 84, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, key: 'id' },
                    { dx: 104, dy: 14, w: 130, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'tier' },
                    { dx: 244, dy: 12, w: 500, color: 'body', font: 'body', size: SCALE.caption, leading: 1.32, key: 'text', fitH: 80 },
                    { dx: 764, dy: 12, w: 330, color: 'secondary', font: 'body', size: SCALE.caption, leading: 1.32, key: 'traces', fitH: 80 },
                    { dx: 1114, dy: 12, w: 492, color: 'body', font: 'body', size: SCALE.caption, leading: 1.32, key: 'test', fitH: 80 },
                    { dx: 1114, dy: 88, w: 492, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, key: 'target.label' },
                ],
            },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 64 },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // prd-signals: the seven-field success-signal table (spec 3.4). SIGNAL | INSTRUMENT | POPULATION |
    // DIRECTION | BASELINE | TYPE | GUARDRAIL. Baseline status is a sentence, never a bare figure.
    'prd-signals': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 80, w: 1620, color: 'rail', font: 'display', size: 'title', leading: 1.04, payload: 'title', fitH: 110 },
            {
                kind: 'columns', array: 'columns', count: 7, baseX: 0, pitchX: 0, xs: [208, 528, 778, 998, 1138, 1378, 1498], w: 200,
                cells: [{ dy: 236, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.96, upper: true }],
            },
            { x: 196, y: 264, w: 1622, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'rows', count: 5, baseX: 196, pitchX: 0, baseY: 278, pitchY: 106, fillH: 560, gapY: 8, w: 1622,
                card: { y: 0, w: 1622, h: 98, bg: 'paper', rule: 4, ruleColor: 'cyan', ruleSide: 'left' },
                cells: [
                    { dx: 12, dy: 12, w: 290, color: 'rail', font: 'heading', size: SCALE.caption, weight: 700, leading: 1.3, key: 'signal', fitH: 74 },
                    { dx: 332, dy: 12, w: 220, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'instrument', fitH: 74 },
                    { dx: 582, dy: 12, w: 190, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'population', fitH: 74 },
                    { dx: 802, dy: 14, w: 110, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'direction' },
                    { dx: 942, dy: 12, w: 210, color: 'secondary', font: 'body', size: SCALE.caption, leading: 1.3, key: 'baseline', fitH: 74 },
                    { dx: 1182, dy: 14, w: 90, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'type' },
                    { dx: 1302, dy: 12, w: 310, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'guardrail', fitH: 74 },
                ],
            },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 64 },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // prd-trace: the derived traceability matrix (spec 3.2), rendered as a table, never as prose.
    // R | TIER | PAIN | PERSONA | THEME | QUOTE (first eighty characters) | SOURCE | TEST | SIGNAL.
    'prd-trace': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 80, w: 1620, color: 'rail', font: 'display', size: 'title', leading: 1.04, payload: 'title', fitH: 110 },
            {
                kind: 'columns', array: 'columns', count: 9, baseX: 0, pitchX: 0, xs: [208, 288, 388, 638, 808, 978, 1318, 1508, 1668], w: 150,
                cells: [{ dy: 236, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.96, upper: true }],
            },
            { x: 196, y: 264, w: 1622, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'rows', count: 7, baseX: 196, pitchX: 0, baseY: 278, pitchY: 80, fillH: 580, gapY: 6, w: 1622,
                card: { y: 0, w: 1622, h: 74, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 12, dy: 10, w: 70, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, key: 'id' },
                    { dx: 92, dy: 10, w: 90, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.6, upper: true, key: 'tier' },
                    { dx: 192, dy: 10, w: 240, color: 'body', font: 'body', size: SCALE.label, leading: 1.3, key: 'pain', fitH: 54 },
                    { dx: 442, dy: 10, w: 160, color: 'body', font: 'body', size: SCALE.label, leading: 1.3, key: 'persona', fitH: 54 },
                    { dx: 612, dy: 10, w: 160, color: 'body', font: 'body', size: SCALE.label, leading: 1.3, key: 'theme', fitH: 54 },
                    { dx: 782, dy: 10, w: 330, color: 'secondary', font: 'body', size: SCALE.label, leading: 1.3, italic: true, key: 'quote', fitH: 54 },
                    { dx: 1122, dy: 10, w: 180, color: 'body', font: 'body', size: SCALE.label, leading: 1.3, key: 'source', fitH: 54 },
                    { dx: 1312, dy: 10, w: 150, color: 'cyan', font: 'mono', size: SCALE.label, key: 'test', fitH: 54 },
                    { dx: 1472, dy: 10, w: 140, color: 'cyan', font: 'mono', size: SCALE.label, key: 'signal', fitH: 54 },
                ],
            },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement', fitH: 64 },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
};
