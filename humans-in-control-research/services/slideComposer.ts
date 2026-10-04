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
const GLYPH_EM = 0.52; // average glyph width as a fraction of font size (body-face estimate)

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
export function fitTextToBox(
    text: string, sizePx: number, boxW: number, boxH: number, leading: number,
    scale: Record<string, number>,
    // Round 2: average glyph width as a fraction of the size. 0.52 is the body-face estimate (Archivo /
    // Lato); UPPERCASE Poppins 700 titles run ~0.68, so DECIEM title fits pass the wider factor.
    glyphEm: number = GLYPH_EM,
): { text: string; size: number } {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!t || !sizePx || !boxW || !boxH) return { text: t, size: sizePx };
    const floor = scale.caption;
    const linesAt = (px: number) => Math.ceil(t.length / Math.max(1, Math.floor(boxW / (px * glyphEm))));
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
    return { text: clauseTrunc(t, cpl * maxLines), size: finalPx };
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
    const leading = r.leading != null ? r.leading : (r.prose ? LINE.body : 1.25);
    // uppercase title-face regions (DECIEM) measure with the wider glyph factor so the fit triggers
    const upperTitle = tk.titleTransform !== 'none' && (r.font === 'display' || (r.font === 'heading' && (r.weight || 0) >= 700));
    const f = fitTextToBox(raw, base, w, r.fitH, leading, tk.scale, upperTitle ? 0.68 : GLYPH_EM);
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
        const budget = Math.min(...below) - s.y - 12;
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
        r.color ? `color:${tk.color[r.color]}` : '',
        r.font ? `font-family:${tk.font[r.font]}` : '',
        size ? `font-size:${size}px` : '',
        weight ? `font-weight:${weight}` : '',
        r.tracking ? `letter-spacing:${r.tracking}px` : '',
        leading != null ? `line-height:${leading}` : '',
        (r.italic && !tk.noItalic) ? 'font-style:italic' : '',
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
        if (r.fit === 'cover') {
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
        const f = applyFit(r, s, r.w, tk);
        s = f.text; sizeOverride = f.sizeOverride;
    }
    return `<div style="${pos}${styleStr(r, tk, sizeOverride)}">${esc(s)}</div>`;
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
            const dy = ((i % 2 === 1 && c.dyOdd != null) ? c.dyOdd : c.dy) + dyCenter;
            const x = itemX + (c.dx || 0), y = itemY + dy;
            const baseCw = c.w || g.w;
            const w = (dW !== 0 && baseCw >= g.w * 0.6) ? baseCw + dW : baseCw;
            if (c.kind === 'bar') {
                // proportional native rect (ranked-bars): item[key] = 0-100 relative magnitude.
                const v = Math.max(0, Math.min(100, Number(c.key ? dot(item, c.key) : 0) || 0));
                const bw = Math.max(6, Math.round((v / 100) * w));
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
                if (c.fit === 'cover') {
                    // photographic thumbnail: true crop-fill of the cell (persona/theme scenes)
                    html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${c.h || w}px;overflow:hidden"><img src="${esc(isrc)}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""></div>`;
                    continue;
                }
                html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${c.h || w}px;display:flex;align-items:center;justify-content:center"><img src="${esc(isrc)}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block" alt=""></div>`;
                continue;
            }
            const raw = c.autoNumber
                ? String(i + 1).padStart(2, '0')
                : (c.key ? dot(item, c.key) : (typeof item === 'string' ? item : c.literal));
            let content: string;
            let sizeOverride: number | undefined;
            if (c.lines && Array.isArray(raw)) {
                content = raw.map((s) => esc(s)).join('<br>');
            } else {
                let s = raw == null ? '' : String(raw);
                // WS-1g measured clamp for plain-string cells that declared a height budget.
                if (s && c.fitH && typeof raw === 'string') {
                    const f = applyFit(c, s, w, tk);
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
                content = esc(s);
            }
            if (!content) continue;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${styleStr(c, tk, sizeOverride)}${popColorStyle(c, tk, i)}">${content}</div>`;
        }
    }
    return html;
}

function renderMatrix(m: MatrixRegion, payload: any, tk: ReturnType<typeof resolved>): string {
    const headers: string[] = dot(payload, m.headers) || [];
    const rows: any[] = dot(payload, m.rows) || [];
    let html = '';
    // header rule under the column headers
    html += `<div style="position:absolute;left:196px;top:${m.headerY + 30}px;width:1428px;height:2px;background:${tk.color.rail}"></div>`;
    headers.forEach((h, c) => {
        const last = m.emphasizeLast && c === headers.length - 1;
        html += `<div style="position:absolute;left:${m.baseX + c * m.colPitch}px;top:${m.headerY}px;width:${m.cellW}px;color:${last ? tk.color.rail : tk.color.secondary};font-family:${tk.font.heading};font-weight:700;font-size:${SCALE.label}px;letter-spacing:0.96px;text-transform:uppercase">${esc(h)}</div>`;
    });
    rows.forEach((row, r) => {
        const y = m.rowBaseY + r * m.rowPitch;
        const label = dot(row, m.rowLabelKey);
        html += `<div style="position:absolute;left:${m.labelX}px;top:${y}px;width:200px;color:${tk.color.rail};font-family:${tk.font.display};font-size:${SCALE.subhead}px">${esc(label)}</div>`;
        const cells: string[] = dot(row, m.cellsKey) || [];
        cells.forEach((cell, c) => {
            const last = m.emphasizeLast && c === headers.length - 1;
            const x = m.baseX + c * m.colPitch;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${m.cellW}px;height:${m.cellH}px;background:${tk.color.paper}"></div>`;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${m.cellW}px;height:3px;background:${last ? tk.color.rail : tk.color.accent}"></div>`;
            html += `<div style="position:absolute;left:${x + 16}px;top:${y + 18}px;width:${m.cellW - 32}px;color:${tk.color.body};font-family:${tk.font.body};font-size:${SCALE.caption}px;line-height:1.32">${esc(cell)}</div>`;
        });
        if (r < rows.length - 1) html += `<div style="position:absolute;left:196px;top:${y + m.rowPitch - 12}px;width:1428px;height:1px;background:${tk.color.hairline}"></div>`;
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
    const spec = ARCHETYPE_SPECS[archetype];
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
export function composeSlide(archetype: string, payload: any, brand: Brand, pos?: DeckPosition): string | null {
    const spec = ARCHETYPE_SPECS[archetype];
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
        payload = deClicheDeep(payload);
    }
    let tk = resolved(brand);
    let bg = spec.chrome === 'full-bleed-dark' ? tk.color.rail : tk.color.paper;
    // DECIEM canvas plan (null for NXT / NU -> the two lines above stand unchanged).
    const plan = brandCanvasPlan(archetype, payload, tk, spec, pos);
    if (plan) { tk = plan.tk; bg = plan.bg; }
    const artParts = plan ? artChrome(tk, plan.canvas) : null;
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
    let regions: Region[] = spec.regions;
    // IMAGE VARIANTS (2026-07-03): a variant's full region list replaces the base anatomy when
    // its carrier is filled (string, or array with a truthy entry). First match wins; the
    // background variant beats the legacy hero panel below (return short-circuits it).
    if (spec.variants) {
        for (const v of spec.variants) {
            const val = payload ? (payload as any)[v.when] : undefined;
            const on = (typeof val === 'string' && val.length > 0)
                || (Array.isArray(val) && val.some(Boolean));
            if (on) {
                for (const r of v.regions) {
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
    if (typeof (payload as any)?.sceneImage === 'string' && (payload as any).sceneImage && spec.chrome === 'content-rail') {
        regions = regions.map((r) => {
            const sr = r as StaticRegion;
            if (!sr.kind && typeof sr.w === 'number' && sr.w > 1180 && (sr.y || 0) < 200) {
                return { ...sr, w: 1120 };
            }
            return r;
        });
        regions = regions.concat([{ kind: 'image', x: 1340, y: 36, w: 478, h: 170, payload: 'sceneImage', fit: 'cover' } as StaticRegion]);
    }
    if (typeof (payload as any)?.backgroundImage === 'string' && (payload as any).backgroundImage
        && spec.chrome === 'full-bleed-dark' && !(spec as any).variants?.some((v: any) => v.when === 'backgroundImage')) {
        regions = ([
            { kind: 'image', x: 0, y: 0, w: 1920, h: 1080, payload: 'backgroundImage', fit: 'cover' } as StaticRegion,
            { kind: 'scrim', x: 0, y: 0, w: 1920, h: 1080, color: 'rail', alphaTop: 0.42, alphaBottom: 0.82 } as unknown as StaticRegion,
        ] as any[]).concat(regions as any[]) as typeof regions;
    }
    if (HERO_PANEL[archetype] && heroSrc) {
        const [ix, iy, iw, ih] = HERO_PANEL[archetype];
        // narrow any text/static region that would run under the panel into the left column
        regions = spec.regions.map((r) => {
            const sr = r as StaticRegion;
            if (sr.kind === undefined || sr.kind === 'text' || sr.kind === 'band') {
                const x = sr.x || 0;
                const w = typeof sr.w === 'number' ? sr.w : 0;
                if (w && x < ix && x + w > ix - 40) {
                    return { ...sr, w: Math.max(360, ix - x - 60) };
                }
            }
            return r;
        });
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
    return finish(body, _fullBleedBg ? 'transparent' : bg);
}

export function archetypeKeys(): string[] { return Object.keys(ARCHETYPE_SPECS); }

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
                    { dy: 215, color: 'accent', font: 'display', size: 'hero', key: 'figure' },
                    { dy: 412, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.28, key: 'headline' },
                    { dy: 596, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MEANS' },
                    { dy: 628, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'means' },
                    { dy: 796, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MATTERS' },
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
            // S5c FAIL-VISIBLE (2026-08-14, owner live deck shipped a white void):
            // the BASE spec renders the payload's OWN structured fields as native
            // text cards, so the zone is never empty; the native panel IMAGE is
            // the variant below (when exhibitImage fills, it replaces these).
            {
                kind: 'columns', array: 'steps', count: 5, baseX: 196, pitchX: 0, fillW: 1622, gap: 24, w: 300, baseY: 250,
                card: { y: 0, w: 300, h: 540, bg: 'ecru', rule: 4, ruleColor: 'accent' },
                cells: [
                    { dx: 20, dy: 24, w: 260, color: 'accent', font: 'display', size: 'title', key: 'number' },
                    { dx: 20, dy: 96, w: 260, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, leading: 1.25, key: 'title' },
                    { dx: 20, dy: 170, w: 260, color: 'body', font: 'body', size: SCALE.body, prose: true, leading: 1.35, key: 'description', fitH: 330 },
                ],
            },
            {
                kind: 'columns', array: 'stats', count: 4, baseX: 196, pitchX: 0, fillW: 1622, gap: 24, w: 380, baseY: 250,
                card: { y: 0, w: 380, h: 540, bg: 'ecru', rule: 4, ruleColor: 'accent' },
                cells: [
                    { dx: 24, dy: 40, w: 330, color: 'accent', font: 'display', size: 'display', key: 'figure' },
                    { dx: 24, dy: 170, w: 330, color: 'rail', font: 'heading', size: SCALE.body, weight: 700, leading: 1.3, key: 'label', fitH: 200 },
                    { dx: 24, dy: 400, w: 330, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, key: 'source' },
                ],
            },
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement' },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
        // The rendered native panel replaces the text-card fallback when it fills.
        variants: [{
            when: 'exhibitImage',
            regions: [
                { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
                { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: 'deckTitle', leading: 1.06, payload: 'title' },
                { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
                { kind: 'image', x: 196, y: 226, w: 1622, h: 600, payload: 'exhibitImage', fit: 'contain' },
                { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
                { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
                { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement' },
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
            { x: 196, y: 64, w: 1600, color: 'rail', font: 'display', size: 'display', payload: 'title' },
            {
                kind: 'columns', array: 'groups', count: 2, baseX: 196, pitchX: 864, w: 760,
                cells: [
                    { dy: 232, color: 'accent', font: 'display', size: 'display', key: 'label' },
                    { dy: 330, color: 'rail', font: 'heading', size: SCALE.subhead, weight: 700, leading: 2.3, key: 'items', lines: true },
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
                { x: 196, y: 64, w: 1600, color: 'paper', font: 'display', size: 'display', payload: 'title' },
                { kind: 'rect', x: 168, y: 300, w: 810, h: 700, color: 'rail', alpha: 0.84 },
                { kind: 'rect', x: 1032, y: 300, w: 810, h: 700, color: 'rail', alpha: 0.84 },
                {
                    kind: 'columns', array: 'groups', count: 2, baseX: 208, pitchX: 864, w: 730,
                    cells: [
                        { dy: 344, color: 'accent', font: 'display', size: 'display', key: 'label' },
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
            { x: 101, y: 660, w: 1740, color: 'paper', font: 'display', size: 'hero', leading: 1, upper: true, payload: 'title' },
            { x: 101, y: 916, w: 1718, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.3, payload: 'supporting' },
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
            { x: 196, y: 20, color: 'accent', font: 'display', size: 'quoteMark', literal: '“' },
            { x: 350, y: 92, w: 800, color: 'secondary', font: 'heading', size: SCALE.caption, weight: 700, tracking: 1.08, upper: true, payload: 'topicKicker' },
            { x: 209, y: 170, w: 1011, color: 'rail', font: 'body', size: 'title', leading: 1.44, payload: 'quote' },
            { x: 298, y: 778, w: 900, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, payload: 'attributionName' },
            { x: 298, y: 814, w: 900, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'attributionRole' },
            // USER OVERRIDE 2026-06-28 scenes-where-they-fit: OPTIONAL supporting scene in the empty
            // left band between the quote (ends ~y500) and the attribution (y778). Figma slot 901:477
            // (900x200 ecru/hairline/radius-base, NU twin inherits via mode-flip). Renders only when
            // payload.panelImage is supplied; empty -> nothing (fail-open). Traces to the quote subject.
            { kind: 'image', x: 209, y: 540, w: 900, h: 200, payload: 'panelImage', fit: 'cover' },
            // corroborating panel
            { kind: 'rect', x: 1267, y: 120, w: 573, h: 778, color: 'ecru', rule: 9, ruleColor: 'rail' },
            { x: 1299, y: 158, w: 500, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, literal: 'CORROBORATING DATA' },
            {
                kind: 'columns', array: 'corroborating', count: 3, baseX: 1299, pitchX: 0, baseY: 210, pitchY: 196, w: 510,
                cells: [
                    { dy: 0, color: 'accent', font: 'display', size: 'display', key: 'figure' },
                    { dy: 98, color: 'rail', font: 'heading', size: SCALE.caption, weight: 700, leading: 1.2, key: 'label' },
                    { dy: 162, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, key: 'source' },
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
            { x: 196, y: 80, w: 1620, color: 'rail', font: 'display', size: 'title', leading: 1.04, payload: 'title' },
            { x: 196, y: 206, w: 1560, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, payload: 'intro' },
            // column headers (non-uniform x)
            {
                kind: 'columns', array: 'columns', count: 4, baseX: 0, pitchX: 0, xs: [196, 470, 1034, 1638], w: 230,
                cells: [{ dy: 290, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.96, upper: true }],
            },
            { x: 196, y: 318, w: 1622, kind: 'hairline', h: 2, color: 'rail' },
            // rows (vertical stack); each row = paper card + accent left bar + 4 fields.
            // prove/implication are TIGHT TABULAR cells (6 rows in 76px cards) - intentionally NOT prose
            // (caption tier), the documented density/tabular exemption to the readable-body floor.
            {
                kind: 'columns', array: 'rows', count: 6, baseX: 196, pitchX: 0, baseY: 330, pitchY: 84, fillH: 520, gapY: 8, w: 1622,
                card: { y: 0, w: 1622, h: 76, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 24, dy: 16, w: 250, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, key: 'subject' },
                    // WS-1g measured clamp: prove/implication are already at the caption floor,
                    // so an over-budget cell clause-truncates to its 2-line capacity (76px card).
                    { dx: 274, dy: 18, w: 540, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'prove', fitH: 52 },
                    { dx: 838, dy: 18, w: 580, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'implication', fitH: 52 },
                    { dx: 1442, dy: 18, w: 160, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, key: 'evidenceGrade' },
                ],
            },
            // PEER PATTERN takeaway band (h grown to 100 so a 2-line 28px statement clears)
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement' },
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
                    { dx: 40, dy: 764, w: 760, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body' },
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
                    { dx: 24, dy: 280, w: 472, color: 'rail', font: 'display', size: 'deckTitle', key: 'name' },
                    // fitH: definition band ends at the dy482 hairline; a 4-line definition used to
                    // strike straight through it (0f collision class, bakeoff 2026-07-09 slide 10).
                    { dx: 24, dy: 384, w: 472, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'definition', fitH: 92 },
                    { dx: 24, dy: 482, w: 472, kind: 'hairline', h: 1 },
                    { dx: 24, dy: 510, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'teams.label' },
                    { dx: 24, dy: 540, w: 472, color: 'rail', font: 'body', size: SCALE.caption, leading: 1.5, key: 'teams.items', lines: true },
                    { dx: 24, dy: 662, w: 472, kind: 'hairline', h: 1 },
                    { dx: 24, dy: 690, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'outcomes.label' },
                    { dx: 24, dy: 720, w: 472, color: 'body', font: 'body', size: SCALE.caption, leading: 1.5, key: 'outcomes.lines', lines: true },
                    // USER OVERRIDE 2026-06-28 scenes-where-they-fit: OPTIONAL per-column CONTENT-TRUE
                    // operating-model glyph in the empty card-bottom band (local y800). Figma slots
                    // 901:5476/5477/5478 (72x72 ecru/hairline/radius-base, NU twin inherits). Renders
                    // only when columns[i].icon is supplied; empty -> nothing (fail-open). icon = a
                    // tokenized glyph per column's operating archetype, never decoration.
                    { dx: 24, dy: 800, w: 72, h: 72, kind: 'image', fit: 'contain', imgCarrier: 'columnIcons', key: 'icon' },
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
            { x: 196, y: 388, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, literal: 'SUPPORTING ACTIONS' },
            { x: 196, y: 420, w: 940, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'actions', count: 3, baseX: 196, pitchX: 0, baseY: 446, pitchY: 180, w: 800,
                cells: [
                    { dx: 0, dy: 0, color: 'accent', font: 'display', size: 'deckTitle', key: 'numeral' },
                    { dx: 110, dy: 0, w: 800, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, key: 'heading' },
                    { dx: 110, dy: 42, w: 800, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body' },
                ],
            },
            { x: 1260, y: 94, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, literal: 'PROJECTED IMPACT' },
            { x: 1260, y: 126, w: 560, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'impact', count: 3, baseX: 1260, pitchX: 0, baseY: 152, pitchY: 254, w: 520,
                card: { y: 0, w: 560, h: 230, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 20, dy: 24, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, key: 'label' },
                    { dx: 20, dy: 60, w: 520, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.1, key: 'headline' },
                    { dx: 20, dy: 130, w: 520, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body' },
                ],
            },
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
                    { dx: 20, dy: 24, color: 'accent', font: 'display', size: 'deckTitle', autoNumber: true },
                    { dx: 20, dy: 108, w: 220, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'title', fitH: 76 },
                    { dx: 20, dy: 196, w: 220, color: 'body', font: 'body', size: SCALE.caption, leading: 1.35, key: 'description', fitH: 200 },
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
                        { dx: 20, dy: 24, color: 'accent', font: 'display', size: 'deckTitle', autoNumber: true },
                        { dx: 20, dy: 108, w: 220, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'title', fitH: 76 },
                        { dx: 20, dy: 196, w: 220, color: 'body', font: 'body', size: SCALE.caption, leading: 1.35, key: 'description', fitH: 200 },
                    ],
                },
                { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
                { x: 228, y: 878, w: 200, color: 'onAccent', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, literal: 'OUTCOME' },
                { x: 440, y: 876, w: 1340, color: 'onAccent', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'outcome' },
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
            // the time axis
            { kind: 'hairline', x: 196, y: 609, w: 1622, h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'milestones', count: 6, baseX: 196, pitchX: 274, spreadW: 1622, w: 250,
                cells: [
                    // node: accent square dot on the axis + a short stem toward the content side
                    { kind: 'hairline', dx: 116, dy: 601, w: 18, h: 18, color: 'accent' },
                    { kind: 'hairline', dx: 124, dy: 576, dyOdd: 620, w: 2, h: 22, color: 'hairline' },
                    // even items: title+detail ABOVE the axis, date below; odd items mirrored
                    { dx: 0, dy: 440, dyOdd: 676, w: 250, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.2, key: 'title', fitH: 60 },
                    { dx: 0, dy: 506, dyOdd: 742, w: 250, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'detail', fitH: 64 },
                    { dx: 0, dy: 640, dyOdd: 552, w: 250, color: 'secondary', font: 'mono', size: SCALE.label, weight: 500, tracking: 1, upper: true, key: 'date' },
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
                    { dy: 226, color: 'accent', font: 'display', size: 'numeral', key: 'figure' },
                    { dy: 330, w: 500, color: 'rail', font: 'heading', size: 'deckHeading', weight: 700, leading: 1.25, key: 'caption', fitH: 62 },
                    { dy: 414, color: 'cyan', font: 'mono', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MEANS' },
                    { dy: 446, w: 500, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'means', fitH: 170 },
                    // MATTERS dark card: rail block + accent label + accent body (native rects + runs)
                    { kind: 'hairline', dy: 648, w: 500, h: 240, color: 'rail' },
                    { dx: 24, dy: 672, color: 'accent', font: 'mono', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MATTERS' },
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
                    { dx: 1180, dy: 12, w: 440, color: 'secondary', font: 'body', size: SCALE.caption, leading: 1.3, key: 'note', fitH: 60 },
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
                    { kind: 'hairline', dx: 0, dy: 104, w: 1622, h: 1, color: 'hairline' },
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
                    { dx: 8, dy: 92, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.0', fitH: 112 },
                    { dx: 8, dy: 224, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.1', fitH: 112 },
                    { dx: 8, dy: 356, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.2', fitH: 112 },
                    { dx: 8, dy: 488, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.3', fitH: 112 },
                    { dx: 8, dy: 620, w: 404, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'cells.4', fitH: 112 },
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
