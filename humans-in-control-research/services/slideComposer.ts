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

import { TOKENS, TYPO, LINE, SCALE } from '../components/slideTemplates/types';
import { getBrand } from '../components/slideTemplates/brands';
import { brandTokens } from './slideToStageHtml';
import { scrubMetaTitle, deClicheDeep } from './slidePostProcessor';

export type Brand = 'nxt' | 'nu';
type TokenColor = 'accent' | 'rail' | 'ink' | 'cyan' | 'body' | 'secondary' | 'hairline' | 'paper' | 'ecru' | 'onAccent' | 'graphite' | 'ruleMid';
type TokenFont = 'display' | 'heading' | 'body' | 'mono';

interface RegionStyle {
    color?: TokenColor; font?: TokenFont; size?: number; weight?: number;
    tracking?: number; leading?: number; italic?: boolean; upper?: boolean;
    // prose: a READABLE body block (synthesis paragraph / definition / action body), NOT a
    // label, kicker, source line, hero numeral, heading, or tight tabular cell. Prose regions
    // clamp their size UP to the readable floor (TYPO.READABLE_BODY_PX = 14pt) and render
    // single-spaced (LINE.body), token-driven from Figma. Tagged per-archetype below; geometry
    // is hand-tuned so the clamped size fits its box (single-spacing offsets the size bump).
    prose?: boolean;
}
interface StaticRegion extends RegionStyle {
    kind?: 'text' | 'hairline' | 'band' | 'rect' | 'image';
    x: number; y: number; w?: number; h?: number;
    payload?: string;   // dot-path into payload; if absent + kind!=text, it's a rule/band/rect/image
    literal?: string;
    rule?: number;      // rect/band only: top accent bar height (px)
    ruleColor?: TokenColor;  // rule bar color (default accent)
    fit?: 'contain' | 'cover';  // image only (default contain)
}
type Cell = RegionStyle & {
    dy: number; dx?: number; key?: string; literal?: string; kind?: 'text' | 'hairline'; w?: number; h?: number;
    lines?: boolean;    // value is a string[] -> render each on its own line
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
    // optional per-item background card (drawn before cells); card.y is relative to item origin.
    card?: { y: number; w: number; h: number; bg?: TokenColor; rule?: number; ruleColor?: TokenColor; ruleSide?: 'top' | 'left' };
    cells: Cell[];
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
type Region = StaticRegion | ColumnGroup | MatrixRegion;
interface ArchetypeSpec { chrome: 'content-rail' | 'full-bleed-dark'; regions: Region[]; }

// ---- token resolution (from the hydrated Figma tokens; never hardcoded) ----
// Colors + fonts resolve through brandTokens() - the SAME normalizer the slideToStageHtml renderers
// use - so brand is a true MODE flip (NXT chartreuse/Saira <-> NU navy+red/Lato) and there is ONE
// token authority, no drift. The logo brick reads the raw registry token (BRAND_LOGO_*), which the
// normalized BrandTokens shape does not carry.
function resolved(brand: Brand) {
    const T = brandTokens(brand);                                   // CSS-ready hexes + font-family strings
    const H: any = brand === 'nu' ? getBrand('nu') : TOKENS;        // raw token object (for the logo brick)
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
    const font: Record<TokenFont, string> = {
        display: T.displayFont,
        heading: T.bodyFont,
        body: T.bodyFont,
        mono: T.monoFont,
    };
    // logo brick - strictly from the registry logo token (never typeset fallback unless absent)
    const logoSvg = String(H.BRAND_LOGO_SVG || '').trim();
    const logoWm = String(H.BRAND_LOGO_WORDMARK || '').trim();
    return { color, font, logoSvg, logoWm };
}

function esc(s: any): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function dot(obj: any, path?: string): any {
    if (!path) return undefined;
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function styleStr(r: RegionStyle, tk: ReturnType<typeof resolved>): string {
    // Prose body blocks clamp UP to the readable floor (14pt) and render single-spaced, both
    // token-driven from Figma (TYPO.READABLE_BODY_PX / LINE.body). The clamp NEVER shrinks text:
    // a region already at/above the floor keeps its size. Single-spacing offsets the vertical
    // cost of the larger glyph, so the hand-tuned geometry still fits.
    const size = r.prose && r.size ? Math.max(r.size, TYPO.READABLE_BODY_PX) : r.size;
    const leading = r.leading != null ? r.leading : (r.prose ? LINE.body : undefined);
    const parts = [
        r.color ? `color:${tk.color[r.color]}` : '',
        r.font ? `font-family:${tk.font[r.font]}` : '',
        size ? `font-size:${size}px` : '',
        r.weight ? `font-weight:${r.weight}` : '',
        r.tracking ? `letter-spacing:${r.tracking}px` : '',
        leading != null ? `line-height:${leading}` : '',
        r.italic ? 'font-style:italic' : '',
        r.upper ? 'text-transform:uppercase' : '',
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
        // filled card/panel (optionally with a top or implicit accent rule bar)
        const ruleBar = r.rule
            ? `<div style="position:absolute;left:0;top:0;width:100%;height:${r.rule}px;background:${tk.color[r.ruleColor || 'accent']}"></div>`
            : '';
        return `<div style="${pos}height:${r.h || 100}px;background:${tk.color[r.color || 'paper']}">${ruleBar}</div>`;
    }
    if (r.kind === 'image') {
        // transparent illustration (data-uri / URL) from the Illustrator skill. Floats on the scene
        // canvas (no box); centered + scaled within its zone. Empty src -> render nothing (fail-open:
        // a scene with no generated illustration is fine).
        const src = r.payload ? dot(payload, r.payload) : r.literal;
        if (!src || typeof src !== 'string') return '';
        const fit = r.fit || 'contain';
        return `<div style="${pos}height:${r.h || 0}px;display:flex;align-items:center;justify-content:center"><img src="${esc(src)}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:${fit};display:block" alt=""></div>`;
    }
    const content = r.payload ? esc(dot(payload, r.payload)) : esc(r.literal || '');
    if (!content) return '';
    return `<div style="${pos}${styleStr(r, tk)}">${content}</div>`;
}

function renderColumns(g: ColumnGroup, payload: any, tk: ReturnType<typeof resolved>): string {
    const arr: any[] = dot(payload, g.array) || [];
    const n = Math.min(arr.length, g.count);
    let html = '';
    for (let i = 0; i < n; i++) {
        const item = arr[i];
        const itemX = g.xs ? g.xs[i] : g.baseX + i * g.pitchX;
        const itemY = (g.baseY || 0) + i * (g.pitchY || 0);
        // optional background card per item (drawn first so cells sit on top)
        if (g.card) {
            const cw = g.card.w, ch = g.card.h, cy = itemY + g.card.y;
            const side = g.card.ruleSide || 'top';
            const ruleBar = g.card.rule
                ? (side === 'left'
                    ? `<div style="position:absolute;left:${itemX}px;top:${cy}px;width:${g.card.rule}px;height:${ch}px;background:${tk.color[g.card.ruleColor || 'accent']}"></div>`
                    : `<div style="position:absolute;left:${itemX}px;top:${cy}px;width:${cw}px;height:${g.card.rule}px;background:${tk.color[g.card.ruleColor || 'accent']}"></div>`)
                : '';
            html += `<div style="position:absolute;left:${itemX}px;top:${cy}px;width:${cw}px;height:${ch}px;background:${tk.color[g.card.bg || 'paper']}"></div>${ruleBar}`;
        }
        for (const c of g.cells) {
            const x = itemX + (c.dx || 0), y = itemY + c.dy, w = c.w || g.w;
            if (c.kind === 'hairline') {
                html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${c.h || 1}px;background:${tk.color[c.color || 'hairline']}"></div>`;
                continue;
            }
            const raw = c.key ? dot(item, c.key) : (typeof item === 'string' ? item : c.literal);
            const content = (c.lines && Array.isArray(raw))
                ? raw.map((s) => esc(s)).join('<br>')
                : esc(raw);
            if (!content) continue;
            html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${styleStr(c, tk)}">${content}</div>`;
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
    if (tk.logoSvg) return `<div style="${pos};color:${color}">${tk.logoSvg.replace(/currentColor/g, color)}</div>`;
    if (tk.logoWm) return `<div style="${pos};font-family:${tk.font.display};font-weight:600;font-size:24px;letter-spacing:1px;color:${color};text-transform:uppercase">${esc(tk.logoWm)}</div>`;
    return '';
}
function chrome(mode: ArchetypeSpec['chrome'], tk: ReturnType<typeof resolved>): string {
    if (mode === 'full-bleed-dark') {
        // dark canvas, dot-mark bottom-left, no rail; real white brand mark top-right
        return dotMark(tk, true) + brandLogo(tk, true);
    }
    // content-rail: 128px rail + dot-mark + real brand mark (ink) top-right
    const rail = `<div style="position:absolute;left:0;top:0;width:128px;height:1080px;background:${tk.color.rail}"></div>`;
    return rail + dotMark(tk, false) + brandLogo(tk, false);
}
function dotMark(tk: ReturnType<typeof resolved>, dark: boolean): string {
    const cols = [34.7, 59.2, 83.7], rows = [986.4, 1010.9, 1035.4];
    let d = '';
    for (const x of cols) for (const y of rows) d += `<div style="position:absolute;left:${x}px;top:${y}px;width:10.1px;height:10.1px;background:${tk.color.accent}"></div>`;
    return d;
}

/** Compose a slide from its registry archetype spec + payload + brand. Returns the inner HTML of
 * the 1920x1080 stage (the caller wraps it in the page shell). Unknown archetype -> null. */
export function composeSlide(archetype: string, payload: any, brand: Brand): string | null {
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
    const tk = resolved(brand);
    const bg = spec.chrome === 'full-bleed-dark' ? tk.color.rail : tk.color.paper;
    let body = chrome(spec.chrome, tk);
    for (const r of spec.regions) {
        const k = (r as any).kind;
        if (k === 'columns') body += renderColumns(r as ColumnGroup, payload, tk);
        else if (k === 'matrix') body += renderMatrix(r as MatrixRegion, payload, tk);
        else body += renderStatic(r as StaticRegion, payload, tk);
    }
    return `<div style="position:relative;width:1920px;height:1080px;background:${bg};overflow:hidden">${body}</div>`;
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
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: SCALE.deckTitle, leading: 1.06, payload: 'title' },
            {
                kind: 'columns', array: 'items', count: 4, baseX: 196, pitchX: 418, w: 380,
                cells: [
                    { dy: 252, color: 'accent', font: 'display', size: SCALE.numeral, key: 'number' },
                    { dy: 352, kind: 'hairline', h: 1 },
                    { dy: 372, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, leading: 1.26, key: 'name' },
                    { dy: 470, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body' },
                    { dy: 800, color: 'secondary', font: 'body', size: SCALE.bodyReadable, italic: true, prose: true, key: 'quote' },
                ],
            },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // stat-row (609:6) - 3 figures with MEANS + MATTERS.
    'stat-row': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: SCALE.deckTitle, payload: 'title' },
            { x: 196, y: 186, w: 1620, kind: 'hairline', h: 1 },
            {
                kind: 'columns', array: 'stats', count: 3, baseX: 196, pitchX: 556, w: 500,
                cells: [
                    { dy: 215, color: 'accent', font: 'display', size: SCALE.hero, key: 'figure' },
                    { dy: 412, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, leading: 1.28, key: 'headline' },
                    { dy: 596, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MEANS' },
                    { dy: 628, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'means' },
                    { dy: 796, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1.14, upper: true, literal: 'MATTERS' },
                    { dy: 828, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'matters' },
                ],
            },
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
            { x: 101, y: 320, w: 1718, color: 'paper', font: 'display', size: SCALE.hero, leading: 1.0, payload: 'title' },
            { x: 101, y: 640, w: 1718, color: 'ruleMid', font: 'heading', size: SCALE.subhead, weight: 500, leading: 1.3, payload: 'subtitle' },
        ],
    },
    // scene - interactive #presentation content scene: text block (left) + a transparent on-brand
    // illustration (right half) from the Illustrator skill. full-bleed-dark; the illustration floats
    // (no box) and is generated contrast-aware for the dark canvas. payload.illustration = data-uri.
    'scene': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 300, w: 760, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 101, y: 350, w: 760, color: 'paper', font: 'display', size: SCALE.numeral, leading: 1.04, payload: 'title' },
            { x: 101, y: 640, w: 720, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.4, payload: 'body' },
            { kind: 'image', x: 1000, y: 140, w: 860, h: 800, payload: 'illustration', fit: 'contain' },
        ],
    },
    // agenda (609:3) - paper canvas + rail; two grouped, numbered TOC columns.
    'agenda': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 64, w: 1600, color: 'rail', font: 'display', size: SCALE.display, payload: 'title' },
            {
                kind: 'columns', array: 'groups', count: 2, baseX: 196, pitchX: 864, w: 760,
                cells: [
                    { dy: 232, color: 'accent', font: 'display', size: SCALE.display, key: 'label' },
                    { dy: 330, color: 'rail', font: 'heading', size: SCALE.subhead, weight: 700, leading: 2.3, key: 'items', lines: true },
                ],
            },
        ],
    },
    // section-divider (609:4) - full-bleed dark, giant accent number.
    'section-divider': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 40, w: 648, color: 'accent', font: 'display', size: SCALE.sectionNumeral, leading: 1, payload: 'number' },
            { x: 101, y: 660, w: 1740, color: 'paper', font: 'display', size: SCALE.hero, leading: 1, upper: true, payload: 'title' },
            { x: 101, y: 916, w: 1718, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.3, payload: 'supporting' },
        ],
    },
    // thesis-interstitial (609:5) - full-bleed dark, one contestable sentence.
    'thesis-interstitial': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 96, w: 900, color: 'accent', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'kicker' },
            { x: 101, y: 420, w: 1500, color: 'paper', font: 'display', size: SCALE.hero, leading: 1.04, payload: 'thesis' },
        ],
    },
    // block-quote (609:7) - hero verbatim quote + right ecru corroborating panel.
    'block-quote': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 20, color: 'accent', font: 'display', size: SCALE.quoteMark, literal: '“' },
            { x: 350, y: 92, w: 800, color: 'secondary', font: 'heading', size: SCALE.caption, weight: 700, tracking: 1.08, upper: true, payload: 'topicKicker' },
            { x: 209, y: 170, w: 1011, color: 'rail', font: 'body', size: SCALE.title, leading: 1.44, payload: 'quote' },
            { x: 298, y: 778, w: 900, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, payload: 'attributionName' },
            { x: 298, y: 814, w: 900, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'attributionRole' },
            // corroborating panel
            { kind: 'rect', x: 1267, y: 120, w: 573, h: 778, color: 'ecru', rule: 9, ruleColor: 'rail' },
            { x: 1299, y: 158, w: 500, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, literal: 'CORROBORATING DATA' },
            {
                kind: 'columns', array: 'corroborating', count: 3, baseX: 1299, pitchX: 0, baseY: 210, pitchY: 196, w: 510,
                cells: [
                    { dy: 0, color: 'accent', font: 'display', size: SCALE.display, key: 'figure' },
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
            { x: 196, y: 80, w: 1620, color: 'rail', font: 'display', size: SCALE.title, leading: 1.04, payload: 'title' },
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
                kind: 'columns', array: 'rows', count: 6, baseX: 196, pitchX: 0, baseY: 330, pitchY: 84, w: 1622,
                card: { y: 0, w: 1622, h: 76, bg: 'paper', rule: 4, ruleColor: 'accent', ruleSide: 'left' },
                cells: [
                    { dx: 24, dy: 16, w: 250, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, key: 'subject' },
                    { dx: 274, dy: 18, w: 540, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'prove' },
                    { dx: 838, dy: 18, w: 580, color: 'body', font: 'body', size: SCALE.caption, leading: 1.3, key: 'implication' },
                    { dx: 1442, dy: 18, w: 160, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, key: 'evidenceGrade' },
                ],
            },
            // PEER PATTERN takeaway band (h grown to 100 so a 2-line 28px statement clears)
            { kind: 'rect', x: 196, y: 858, w: 1622, h: 100, color: 'accent' },
            { x: 228, y: 878, w: 200, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.85, upper: true, payload: 'takeaway.label' },
            { x: 440, y: 876, w: 1340, color: 'rail', font: 'heading', size: SCALE.bodyReadable, weight: 700, leading: 1.2, payload: 'takeaway.statement' },
            { x: 196, y: 1014, color: 'secondary', font: 'body', size: SCALE.caption, payload: 'sourceLine' },
        ],
    },
    // problem-diptych (609:10) - full-bleed dark, two equal contrasting cards.
    'problem-diptych': {
        chrome: 'full-bleed-dark',
        regions: [
            { x: 101, y: 96, w: 900, color: 'accent', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 101, y: 180, w: 1718, color: 'paper', font: 'display', size: SCALE.numeral, leading: 1.04, payload: 'title' },
            { x: 101, y: 350, w: 1718, color: 'ruleMid', font: 'body', size: SCALE.bodyReadable, leading: 1.4, payload: 'subhead' },
            {
                kind: 'columns', array: 'cards', count: 2, baseX: 101, pitchX: 880, w: 760,
                card: { y: 460, w: 840, h: 420, bg: 'graphite', rule: 4, ruleColor: 'accent' },
                cells: [
                    { dx: 40, dy: 500, color: 'accent', font: 'display', size: SCALE.numeral, key: 'numeral' },
                    { dx: 40, dy: 644, w: 760, color: 'paper', font: 'heading', size: SCALE.title, weight: 700, leading: 1.1, key: 'heading' },
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
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: SCALE.deckTitle, payload: 'title' },
            {
                kind: 'columns', array: 'columns', count: 3, baseX: 196, pitchX: 556, w: 472,
                card: { y: 240, w: 520, h: 660, bg: 'paper', rule: 5, ruleColor: 'accent' },
                cells: [
                    { dx: 24, dy: 280, w: 472, color: 'rail', font: 'display', size: SCALE.deckTitle, key: 'name' },
                    { dx: 24, dy: 384, w: 472, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'definition' },
                    { dx: 24, dy: 482, w: 472, kind: 'hairline', h: 1 },
                    { dx: 24, dy: 510, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'teams.label' },
                    { dx: 24, dy: 540, w: 472, color: 'rail', font: 'body', size: SCALE.caption, leading: 1.5, key: 'teams.items', lines: true },
                    { dx: 24, dy: 662, w: 472, kind: 'hairline', h: 1 },
                    { dx: 24, dy: 690, color: 'cyan', font: 'heading', size: SCALE.label, weight: 700, tracking: 1, upper: true, key: 'outcomes.label' },
                    { dx: 24, dy: 720, w: 472, color: 'body', font: 'body', size: SCALE.caption, leading: 1.5, key: 'outcomes.lines', lines: true },
                ],
            },
        ],
    },
    // role-needs (609:12, G1) - one role's challenges + persona-needs card.
    'role-needs': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: SCALE.deckTitle, payload: 'title' },
            { x: 196, y: 254, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, literal: 'CURRENT CHALLENGES' },
            { x: 196, y: 286, w: 1000, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'challenges', count: 3, baseX: 196, pitchX: 0, baseY: 312, pitchY: 190, w: 800,
                cells: [
                    { dx: 0, dy: 0, color: 'accent', font: 'display', size: SCALE.deckTitle, key: 'numeral' },
                    { dx: 110, dy: 0, w: 800, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, key: 'heading' },
                    { dx: 110, dy: 44, w: 800, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body' },
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
                    { dx: 20, dy: 30, w: 460, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, key: 'body' },
                ],
            },
        ],
    },
    // role-recommendation (609:13, G2) - thesis + 3 actions + 3 projected-impact tiles.
    'role-recommendation': {
        chrome: 'content-rail',
        regions: [
            { x: 196, y: 40, color: 'cyan', font: 'heading', size: SCALE.kicker, weight: 700, tracking: 1.76, upper: true, payload: 'eyebrow' },
            { x: 196, y: 86, w: 1000, color: 'rail', font: 'display', size: SCALE.deckTitle, payload: 'title' },
            { x: 196, y: 248, w: 1000, color: 'body', font: 'body', size: SCALE.bodyReadable, prose: true, payload: 'thesis' },
            { x: 196, y: 388, w: 400, color: 'rail', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.9, upper: true, literal: 'SUPPORTING ACTIONS' },
            { x: 196, y: 420, w: 940, kind: 'hairline', h: 2, color: 'rail' },
            {
                kind: 'columns', array: 'actions', count: 3, baseX: 196, pitchX: 0, baseY: 446, pitchY: 180, w: 800,
                cells: [
                    { dx: 0, dy: 0, color: 'accent', font: 'display', size: SCALE.deckTitle, key: 'numeral' },
                    { dx: 110, dy: 0, w: 800, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, key: 'heading' },
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
                    { dx: 20, dy: 60, w: 520, color: 'rail', font: 'heading', size: SCALE.deckHeading, weight: 700, leading: 1.1, key: 'headline' },
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
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: SCALE.deckTitle, payload: 'title' },
            {
                kind: 'columns', array: 'phases', count: 4, baseX: 196, pitchX: 412, w: 388,
                cells: [
                    { dy: 268, w: 388, h: 5, kind: 'hairline', color: 'accent' },
                    { dy: 286, w: 388, color: 'secondary', font: 'heading', size: SCALE.label, weight: 700, tracking: 0.8, upper: true, key: 'label' },
                    { dy: 316, w: 364, color: 'rail', font: 'display', size: SCALE.title, key: 'name' },
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
            { x: 196, y: 86, w: 1600, color: 'rail', font: 'display', size: SCALE.deckTitle, payload: 'title' },
            {
                kind: 'matrix', headers: 'horizons', rows: 'roles', rowLabelKey: 'name', cellsKey: 'cells',
                headerY: 230, baseX: 420, colPitch: 366, cellW: 350,
                rowBaseY: 304, rowPitch: 216, cellH: 176, labelX: 196, emphasizeLast: true,
            },
        ],
    },
};
