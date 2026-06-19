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

// Permissive type alias - we read by-shape, not by-import. types.ts is a
// pure-data module (no React), so importing the shared density spec is light.
import { densityCaps, type SlideDensity, SCALE, WEIGHT, TYPO, clampMin, TOKENS } from '../components/slideTemplates/types';
import { getBrand } from '../components/slideTemplates/brands';
import { composeSlide } from './slideComposer';

export interface SlideDataLike {
    id?: string;
    template?: string;
    brand?: 'nxt' | 'nu';
    /** Universal density axis - 'dense' raises item ceilings per the shared
     *  DENSITY_SPEC (types.ts) and renderers adapt type to the actual count. */
    density?: SlideDensity;
    title?: string;
    subtitle?: string;
    sources?: string[];
    /** SLIDES-deck archetype (template=slides:*) raw payload, read by composeSlide by exact key. */
    composerPayload?: any;
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
    journeyMap?: any;
    orgChart?: any;
    executiveBrief?: any;
    gapMatrix?: any;
    architectureMap?: any;
    prdFeature?: any;
    systemsInventory?: any;
    journeyBrief?: any;
    body?: string;
    bullets?: string[];
}

// ---------------------------------------------------------------------------
// Brand tokens - kept inline for self-containment. 2026-06-10: reconciled to
// the LIVE Figma design-system files (NXT iSQhAVM7SI4QHAWB7y9C2z node 223:2,
// NU z2v9Pvhg23hlljEitPBdAt node 97:2) and their GOLD case-study exemplar
// frames. NXT = black rail + chartreuse band + Archivo titles (Bebas for
// numerals) + IBM Plex Mono labels. NU = navy rail (#0E1626) + Huskies red
// kicker/dots + Lora titles + Archivo body + IBM Plex Mono labels + navy band.
// Mirrors components/slideTemplates/brands.ts - keep both in sync.
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
    /** GOLD action-title face (h1 + takeaway band) + weight. */
    titleFont: string;
    titleWeight: number;
    /** GOLD kicker color (NXT cyan / NU red). */
    kicker: string;
    /** GOLD warn/cool accent + wash pairs (before-after panels, C/A/O rules). */
    accentWarn: string;
    accentCool: string;
    washWarn: string;
    washCool: string;
    /** GOLD meta/label grey. */
    grey: string;
    /** SLIDES body copy (Figma color/body; softer than rail/ink: NXT #333333 / NU #16233C). */
    bodyText: string;
    /** SLIDES secondary/source/quote text (Figma color/secondary: NXT #666666 / NU #73757A). */
    secondaryText: string;
    /** LESSON-block accent (NXT chartreuse / NU premium gold). */
    gold: string;
    /** SLIDES dark-card fill (color/graphite, used on full-bleed-dark archetypes). */
    graphite: string;
    /** SLIDES on-dark secondary text (color/rule-mid; lighter than `grey` which is on-light). */
    ruleMid: string;
}

const NXT: BrandTokens = {
    rail: '#0D0D0D',
    paper: '#FFFFFF',
    ink: '#141414',
    accent: '#B8B800',  // chartreuse
    accent2: '#00B7C3', // cyan
    muted: '#525252',
    hair: '#DDDDD6',
    band: '#B8B800',
    bandText: '#0D0D0D',
    callout: '#F4F1D6',
    displayFont: "'Saira Condensed', sans-serif",
    bodyFont: "'Archivo', sans-serif",
    monoFont: "'IBM Plex Mono', monospace",
    titleFont: "'Archivo', sans-serif",
    titleWeight: 600,
    kicker: '#00B7C3',
    accentWarn: '#CC6644',
    accentCool: '#00B7C3',
    washWarn: '#FAF1EC',
    washCool: '#EBF7F8',
    grey: '#73757A',
    bodyText: '#333333',
    secondaryText: '#666666',
    gold: '#B8B800',
    graphite: '#262626',
    ruleMid: '#CCCCCC',
};

const NU: BrandTokens = {
    rail: '#0E1626',
    paper: '#FFFFFF',
    ink: '#16233C',
    accent: '#C8102E',  // huskies red
    accent2: '#1D6E64', // source teal
    muted: '#73757A',
    hair: '#DDDDD6',
    band: '#16233C',
    bandText: '#FFFFFF',
    callout: '#F2F1EA',
    // 2026-06-13 - NU single-typeface system: Lato everywhere, weight = hierarchy.
    displayFont: "'Lato', sans-serif",
    bodyFont: "'Lato', sans-serif",
    monoFont: "'Lato', sans-serif",
    titleFont: "'Lato', sans-serif",
    titleWeight: 700,
    kicker: '#C8102E',
    accentWarn: '#C8102E',
    accentCool: '#1D6E64',
    washWarn: '#FAEDED',
    washCool: '#EDF7F5',
    grey: '#73757A',
    bodyText: '#16233C',
    secondaryText: '#73757A',
    gold: '#A4804A',
    graphite: '#262626',
    ruleMid: '#B9BEC7',
};

// 2026-06-15 - the export twin now reads the HYDRATED Figma tokens (the same feed
// web.tsx uses) instead of returning a baked-in palette, so the downloaded PPTX
// reflects the live design system and matches the preview. NXT reads the hydrated
// global TOKENS (the object hydrateTokensFromFigma mutates); NU reads the hydrated
// nuBrand (its hydration target). The literal NXT/NU constants above are now PER-FIELD
// FALLBACKS only - if the Figma feed is missing a key, that field keeps its prior
// value, so this can never render worse than before. (Was: brandTokens returned the
// hardcoded const wholesale, the deepest layer of "new Figma components aren't deployed".)
export function brandTokens(b?: Brand | string): BrandTokens {
    const id = (typeof b === 'string' ? b : (b as any)?.BRAND_ID) === 'nu' ? 'nu' : 'nxt';
    const fb: BrandTokens = id === 'nu' ? NU : NXT;
    const H: any = id === 'nu' ? getBrand('nu') : TOKENS;
    const hx = (v: any, f: string) => (typeof v === 'string' && v) ? '#' + String(v).replace(/^#/, '') : f;
    const ff = (v: any, f: string) => (typeof v === 'string' && v) ? `'${v}', sans-serif` : f;
    return {
        rail: hx(H.RAIL, fb.rail),
        paper: hx(H.WHITE, fb.paper),
        ink: hx(H.INK, fb.ink),
        accent: hx(H.CHARTREUSE, fb.accent),
        accent2: hx(H.CYAN, fb.accent2),
        muted: hx(H.MUTED, fb.muted),
        hair: hx(H.HAIRLINE, fb.hair),
        band: hx(H.BAND, fb.band),
        bandText: hx(H.BAND_TEXT, fb.bandText),
        callout: hx(H.PANEL, fb.callout),
        displayFont: ff(H.FONT_DISPLAY, fb.displayFont),
        bodyFont: ff(H.FONT_BODY, fb.bodyFont),
        monoFont: (typeof H.FONT_MONO === 'string' && H.FONT_MONO) ? `'${H.FONT_MONO}', monospace` : fb.monoFont,
        titleFont: ff(H.FONT_TITLE, fb.titleFont),
        titleWeight: Number(H.TITLE_WEIGHT) || fb.titleWeight,
        kicker: hx(H.KICKER, fb.kicker),
        accentWarn: hx(H.ACCENT_WARN, fb.accentWarn),
        accentCool: hx(H.ACCENT_COOL, fb.accentCool),
        washWarn: hx(H.WASH_WARN, fb.washWarn),
        washCool: hx(H.WASH_COOL, fb.washCool),
        grey: hx(H.GREY, fb.grey),
        bodyText: hx(H.BODY_TEXT, fb.bodyText),
        secondaryText: hx(H.SECONDARY_TEXT, fb.secondaryText),
        gold: hx(H.GOLD_ACCENT, fb.gold),
        graphite: hx(H.GRAPHITE, fb.graphite),
        ruleMid: hx(H.RULE_MID, fb.ruleMid),
    };
}

// Per-render density ceilings, set once at the top of slideDataToStageHtml
// (synchronous single render; module state avoids threading a 3rd parameter
// through 16 renderer signatures). Renderers read _caps.items / _caps.sub
// instead of hardcoding slice ceilings, and adapt type size to the ACTUAL
// item count so a dense payload still fits the 1080 stage.
let _caps = densityCaps('', undefined);

// ---------------------------------------------------------------------------
// Utility: HTML-escape strings so SlideData content can't accidentally
// inject tags.
// ---------------------------------------------------------------------------

function esc(s: string | number | undefined | null): string {
    if (s === undefined || s === null) return '';
    return String(s)
        // 2026-06-14 - Normalize smart punctuation to ASCII BEFORE escaping. The
        // PPTX editable-text layer mangled curly quotes/dashes into the U+FFFD
        // replacement char (the audited block-quote mojibake). ASCII also aligns
        // with the house plain-text + em-dash-ban rules. Quote-mark wrappers the
        // renderers add (&ldquo;/&rdquo;) are template entities, not passed here.
        .replace(/[‘’‚‛]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/[–—]/g, '-')
        .replace(/…/g, '...')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Blend a hex color toward white at build time. Stage twins emit SOLID
 *  fills only (GOLD standing rule): a translucent background here becomes a
 *  translucent PPTX shape, and the 2026-06-11 deck showed how that path can
 *  corrupt into the Office theme-blue fallback. Pre-blend instead. */
function washHex(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const ch = (i: number) => Math.round(255 - (255 - parseInt(h.slice(i, i + 2), 16)) * alpha)
        .toString(16).padStart(2, '0');
    return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/** HARD server-side truncation (2026-06-11). Stage twins must NEVER rely on
 *  CSS line-clamp/overflow:hidden to bound text: the export MEASURE walk
 *  extracts the FULL textContent, so anything the browser hides paints at
 *  full length in PowerPoint and overlaps its neighbors (the 2026-06-11
 *  journey-map export corruption). Every user-content sink gets an explicit
 *  budget so the exported string IS the visible string. Verbose inline
 *  attributions ("(Source: Name - Org _ file_anonymized.txt)") compress to
 *  the named source before the cut so the citation survives truncation. */
// 2026-06-12 - NO-TRUNCATION CONTRACT (user feedback: "truncation in
// deliverables makes them unusable"). Budgets are GENERATION-side
// summarization targets (the SLIDE OUTPUT PROTOCOL now tells the model every
// per-field budget and demands complete thoughts); this renderer guard is the
// last resort and must NEVER mutilate: prefer finishing the sentence slightly
// over budget, else end at a clause boundary, and never emit an ellipsis (the
// "..." tail is the exact slop the user flagged).
function trunc(s: string | undefined | null, max: number): string {
    let t = String(s ?? '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    t = t.replace(/\(Source:\s*([^)_\-]{3,60})[^)]*\)/gi, (_m, name) => `(Source: ${String(name).trim()})`);
    if (t.length <= max) return t;
    // 1. Finish the in-flight sentence if it ends within 1.35x budget.
    const ahead = t.slice(0, Math.min(t.length, Math.round(max * 1.35)));
    const fwd = ahead.slice(max).search(/[.!?”"](?:\s|$)/);
    if (fwd >= 0) return ahead.slice(0, max + fwd + 1).trim();
    // 2. End at the last full sentence inside the budget.
    const cut = t.slice(0, max);
    const sentEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    if (sentEnd > max * 0.5) return cut.slice(0, sentEnd + 1).trim();
    // 3. End at a clause boundary (comma / semicolon / dash) inside the budget.
    const clause = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '), cut.lastIndexOf(' - '), cut.lastIndexOf(': '));
    if (clause > max * 0.55) return cut.slice(0, clause).trim();
    // 4. Word boundary; strip dangling punctuation/openers; NO ellipsis.
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut)
        .replace(/[\s,;:.\-(“"‘']+$/, '').trim();
}

/** Strip a trailing source attribution that rode INTO a tight list item.
 *  Per the no-truncation contract, attributions belong in the slide-level
 *  sources[] / evidence fields, never inside a pain/opportunity cell - a
 *  trailing "(Vanguard Working Session)" eats the char budget and gets
 *  word-cut ("...skill optimization (Vanguard"). Only strips when the trailing
 *  parenthetical LOOKS like a source (Source:, a Working Session, a year, a
 *  known publisher); a legitimate content parenthetical is left intact. */
function stripInlineSource(s: string): string {
    return String(s ?? '').trim().replace(/\s*\((?:source:\s*)?[^)]*\)\s*$/i, (m) => {
        const inner = m.replace(/[()]/g, '');
        return /source:|working session|\bet al\b|\b(?:19|20)\d{2}\b|reddit|openalex|arxiv|vanguard/i.test(inner) ? '' : m;
    }).trim();
}

// ---------------------------------------------------------------------------
// Shared shell - head with fonts + base #stage container + footer sources strip.
// ---------------------------------------------------------------------------

// Google-fonts href covering BOTH brands' hydrated faces (+ legacy/quote faces). Shared by
// buildShell and the SLIDES-archetype bare-stage doc so the composed deck loads the same faces.
function computeFontsHref(): string {
    const _famName = (f: any) => String(f || '').replace(/['"]/g, '').split(',')[0].trim();
    const _fams = new Set<string>();
    for (const B of [TOKENS as any, getBrand('nu') as any]) {
        for (const k of ['FONT_DISPLAY', 'FONT_TITLE', 'FONT_BODY', 'FONT_MONO']) {
            const n = _famName(B[k]); if (n) _fams.add(n);
        }
    }
    ['Archivo', 'IBM Plex Mono', 'Bebas Neue', 'Lora', 'Saira Condensed', 'Lato'].forEach(n => _fams.add(n));
    return 'https://fonts.googleapis.com/css2?'
        + [..._fams].map(n => `family=${n.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800`).join('&')
        + '&display=swap';
}

// Bare 1920x1080 document shell for SLIDES-archetype slides composed by slideComposer. The composer
// emits its OWN complete chrome (rail / dot-mark / masthead OR full-bleed), so this shell adds only
// the doctype + font links + reset + the scalable #stage host - NO rail/title/kicker/takeaway.
function composeArchetypeDoc(brand: Brand, title: string, stageInner: string): string {
    return `<!DOCTYPE html>
<html lang="en" data-brand="${brand}">
<head>
<meta charset="UTF-8">
<title>${esc(title || 'Slide')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${computeFontsHref()}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#080808;overflow:hidden}
#stage{position:absolute;width:1920px;height:1080px;transform-origin:top left;overflow:hidden}
</style>
</head>
<body>
<div id="stage">${stageInner}</div>
</body>
</html>`;
}

function buildShell(opts: {
    brand: Brand;
    title: string;
    bodyInnerHtml: string;
    sources?: string[];
    kicker?: string;
    /** GOLD takeaway band text. When present, the band renders at the GOLD
     *  geometry (x172 y944 w1568 h96) and the sources strip is suppressed -
     *  the GOLD language carries sources inline as SOURCE lines, never as a
     *  per-slide source strip. Renderers emit their own .metarow/.hairline
     *  (classes defined below) inside the body when they need the GOLD meta
     *  row, because the h1 sits between the kicker and the meta. */
    takeaway?: string;
}): string {
    const T = brandTokens(opts.brand);
    // 2026-06-15 - DERIVE the font href from the HYDRATED brand fonts of BOTH brands,
    // not a static family list. The old hardcoded list omitted Saira Condensed (NXT
    // display) and Lato (NU single-typeface), so after the token migration the CSS
    // referenced faces the page never LOADED -> silent serif fallback (the Saira/Lato
    // bug). Whatever Figma deploys into font/* now loads automatically. Legacy faces
    // some saved decks still reference are kept so older artifacts don't regress.
    const fontsHref = computeFontsHref();
    const sourcesStrip = (opts.sources && opts.sources.length > 0 && !opts.takeaway)
        ? `<div class="srcs">Sources: ${opts.sources.map(s => esc(s)).join('  ·  ')}</div>`
        : '';
    const kickerHtml = opts.kicker
        ? `<div class="kicker">${esc(opts.kicker)}</div>`
        : '';
    // 2026-06-12 - TAKEAWAY FIT (geometry-audit finding): the band sits at
    // top:944px on a 1080px stage; at 23px/1.48 a takeaway over ~230 chars
    // wraps to 3+ lines and the band bottom lands past 1080 (measured
    // 1102px). Two-line budget via trunc; >170 chars also drops the type a
    // step so two lines stay comfortable. Server-side trunc, never clamp.
    const takeawayText = opts.takeaway ? trunc(opts.takeaway, 228) : '';
    const takeawayHtml = takeawayText
        ? `<div class="takeaway"${takeawayText.length > 170 ? ' style="font-size:${SCALE.body}px;line-height:1.42;padding:24px 48px"' : ''}>${esc(takeawayText)}</div>`
        : '';
    // 3x3 GOLD dot mark, bottom of the rail (Figma: 12px squares, gap 6, at 30/990).
    const dotMark = `<div class="dotmark">${'<span></span>'.repeat(9)}</div>`;
    // Official brand logo - HYDRATED from the Figma token feed (/api/design-tokens
    // `logo` block -> hydrateTokensFromFigma -> TOKENS / nuBrand), NEVER hardcoded, so
    // a designer's newly deployed mark reaches the EXPORT with no renderer code change
    // (the "new Figma components aren't deployed" gap). NXT reads the hydrated global
    // TOKENS; NU reads the hydrated nuBrand (its distinct hydration target). The
    // wordmark is the fallback only if the feed has not populated a mark yet.
    const _lt: any = opts.brand === 'nu' ? getBrand('nu') : TOKENS;
    // 2026-06-17 - Logo strictly from the registry `logo` token (Brand/Logo masthead 619:2,
    // hydrated to BRAND_LOGO_SVG=logo.monogram / BRAND_LOGO_WORDMARK=logo.wordmark). NU = the red-N
    // monogram SVG ALONE (the NU 619:2 instance is the monogram - do NOT append a "NORTHEASTERN"
    // wordmark beside it). NXT = the "NXT HUMANS" wordmark TYPESET in the display face (no vector).
    // A brand-name text literal is a LAST-RESORT only if the registry token is absent (degraded) -
    // it must never be the default, which was the prior hand-made bug. See
    // plans/figma-audit/slides-archetypes/_chrome-logo-brick.md.
    // Resolve fill=currentColor to the explicit ink color so the editable-PPTX export (which hides
    // text via color:transparent) cannot blank the logo SVG. NU monogram carries its own red fill.
    const _logoSvg = String(_lt.BRAND_LOGO_SVG || '').trim().replace(/currentColor/g, T.ink);
    const _logoWm = String(_lt.BRAND_LOGO_WORDMARK || '').trim();
    const brandLogoHtml = _logoSvg
        ? `<div class="brandlogo">${_logoSvg}</div>`
        : _logoWm
            ? `<div class="brandlogo"><span class="wm">${esc(_logoWm)}</span></div>`
            : `<div class="brandlogo"><span class="wm">${esc(opts.brand === 'nu' ? 'Northeastern' : 'NXT Humans')}</span></div>`;
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
.dotmark{position:absolute;left:30px;top:990px;display:grid;grid-template-columns:repeat(3,12px);gap:6px}
.dotmark span{width:12px;height:12px;background:${T.accent};display:block}
.brandlogo{position:absolute;top:40px;right:80px;display:flex;align-items:center;gap:14px;height:34px;color:${T.ink}}
.brandlogo svg{display:block;height:34px;width:auto}
/* Masthead wordmark uses the brand DISPLAY face (NXT = Saira Condensed SemiBold
 * per Figma node 22:2; NU = Lato), hydrated via FONT_DISPLAY - NOT bodyFont.
 * The 2026-06-13 Saira swap never reached this rule, so NXT mastheads rendered
 * the wordmark in Archivo. displayFont===bodyFont for NU, so this is a no-op there. */
.brandlogo .wm{font-family:${T.displayFont};font-weight:${opts.brand === 'nu' ? 800 : 600};font-size:${opts.brand === 'nu' ? '22px' : '26px'};letter-spacing:${opts.brand === 'nu' ? '3px' : '1px'};color:${T.ink};text-transform:uppercase}
.canvas{position:absolute;left:172px;top:0;right:80px;bottom:${opts.takeaway ? '152px' : '96px'};padding:58px 0 12px 0;display:flex;flex-direction:column;overflow:hidden}
/* Chrome painted from the hydrated Figma type system (SCALE/WEIGHT/TYPO), not
 * hardcoded - the 2026-06-14 typographic redesign. Kicker recedes to the label
 * tier; the action title governs at SCALE.title; the takeaway band is the payoff
 * line so it carries the TITLE weight (was 400, lighter than the h1 - audited). */
.kicker{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:${TYPO.KICKER_TRACK_PX}px;color:${T.kicker};text-transform:uppercase;margin-bottom:16px;font-weight:${WEIGHT.label}}
h1{font-family:${T.titleFont};font-weight:${T.titleWeight};letter-spacing:${opts.brand === 'nu' ? '0' : '-0.5px'};font-size:${SCALE.title}px;line-height:${opts.brand === 'nu' ? '1.12' : '1.08'};color:${T.ink};margin-bottom:24px;max-width:1400px}
.metarow{font-family:${T.monoFont};font-weight:${WEIGHT.label};font-size:${SCALE.label}px;letter-spacing:${TYPO.LABEL_TRACK_PX}px;line-height:1.6;color:${T.grey};text-transform:uppercase;margin-bottom:16px;white-space:pre-wrap}
.hairline{height:1px;background:${T.hair};width:100%;margin-bottom:17px}
.takeaway{position:absolute;left:172px;top:944px;width:1568px;min-height:96px;background:${T.band};color:${T.bandText};padding:28px 48px;font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.lead}px;line-height:1.4}
.srcs{position:absolute;left:172px;right:80px;bottom:34px;font-family:${T.monoFont};font-size:${SCALE.caption}px;letter-spacing:${TYPO.LABEL_TRACK_PX}px;color:${T.muted};border-top:2px solid ${T.hair};padding-top:18px;text-transform:uppercase}
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
  ${dotMark}
  ${brandLogoHtml}
  <div class="canvas">
${kickerHtml}
${opts.bodyInnerHtml}
  </div>
${takeawayHtml}
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
    const rawStats: any[] = Array.isArray(data.stats) ? data.stats : [];
    const insight: string = data.convergentInsight || '';
    const pattern: string = data.patternSignal || '';
    // DENSE STRUCTURAL LAYOUT (W2, 2026-06-11): full payloads route to the
    // stat-row-dense GOLD exemplar structure (Figma NU 198:3 / NXT 321:3) -
    // quadrant grid left + dark insight column right. STRUCTURE changes, type
    // does not shrink. Replaces the deleted tightS shrink heuristic.
    // Routing reads the RAW array - capping first would both mask the >=4
    // predicate and silently drop evidenced stats (the W0 anti-pattern).
    const denseRoute = rawStats.length >= 4
        || (rawStats.length >= 3 && rawStats.every(s => s.meaning && s.matters) && !!(insight && pattern));
    if (denseRoute) return renderStatRowDense(rawStats, insight, pattern, T);
    const stats = rawStats.slice(0, _caps.items);
    const n = Math.max(stats.length, 1);
    const dense = n >= 4;
    const cards = stats.map(s => `
      <div class="stat">
        <div class="sv">${esc(trunc(s.value, 14))}</div>
        <div class="sl">${esc(trunc(s.label, 64))}</div>
        <div class="sd">
          <div class="lbl">Means</div><div class="pp">${esc(trunc(s.meaning, 110))}</div>
          <div class="lbl">Matters</div><div class="pp">${esc(trunc(s.matters, 110))}</div>
        </div>
        <div class="src">${esc(s.source)}</div>
      </div>`).join('');
    const insightBlock = insight
        ? `<div class="insight">
             <div class="ilbl">CONVERGENT INSIGHT</div>
             <div class="itxt">${esc(trunc(insight, 200))}</div>
             ${pattern ? `<div class="iptn"><span>PATTERN</span> ${esc(trunc(pattern, 170))}</div>` : ''}
           </div>` : '';
    return `<style>
.stats{display:grid;grid-template-columns:repeat(${n},1fr);gap:${dense ? 24 : 32}px;margin-bottom:24px;flex-shrink:0}
.stat{border-top:3px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:10px}
/* 2026-06-14 type system: hero capped below the title in body weight; roles on scale. */
.stat .sv{font-family:${T.displayFont};font-weight:${WEIGHT.body};font-size:${TYPO.HERO_CAP_PX}px;line-height:1.2;color:${T.ink}}
.stat .sl{font-family:${T.bodyFont};font-size:${SCALE.lead}px;line-height:1.28;color:${T.ink}}
.stat .sd{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.stat .sd .lbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:${TYPO.LABEL_TRACK_PX}px;color:${T.muted};text-transform:uppercase}
.stat .sd .pp{font-size:${SCALE.body}px;line-height:1.38;color:${T.ink}}
.stat .src{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:${TYPO.LABEL_TRACK_PX}px;color:${T.muted};margin-top:auto;text-transform:uppercase}
.insight{background:${T.callout};padding:16px 24px;border-left:4px solid ${T.accent};flex-shrink:0}
.insight .ilbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.accent2};text-transform:uppercase;margin-bottom:8px;font-weight:${WEIGHT.label}}
.insight .itxt{font-size:${SCALE.lead}px;line-height:1.38;color:${T.ink}}
.insight .iptn{margin-top:6px;font-size:${SCALE.body}px;line-height:1.36;color:${T.ink};border-top:1px solid ${T.hair};padding-top:6px}
.insight .iptn span{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:${WEIGHT.label}}
</style>
<div class="stats">${cards}</div>
${insightBlock}`;
}

/** stat-row DENSE twin of the GOLD exemplar (NU 198:3 / NXT 321:3): 2-column
 *  quadrant grid of accent-top-border stat cards + dark insight column with
 *  CONVERGENT INSIGHT and PATTERN. Type stays at exemplar scale; the grid
 *  absorbs the density. */
function renderStatRowDense(stats: any[], insight: string, pattern: string, T: BrandTokens): string {
    const four = stats.slice(0, 4);
    const cards = four.map(s => `
      <div class="dq">
        <div class="dqv">${esc(trunc(s.value, 14))}</div>
        <div class="dql">${esc(trunc(s.label, 70))}</div>
        ${s.meaning ? `<div class="dqm">${esc(trunc(s.meaning, 100))}</div>` : ''}
        <div class="dqs">${esc(trunc(s.source, 44))}</div>
      </div>`).join('');
    return `<style>
.dwrap{display:grid;grid-template-columns:1.76fr 1fr;gap:28px;flex:1 1 auto;min-height:0}
.dgrid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:26px;min-height:0}
.dq{border-top:3px solid ${T.accent};padding:16px 20px 14px 0;display:flex;flex-direction:column;gap:9px;min-height:0;overflow:hidden}
/* 2026-06-14 type system: hero is EVIDENCE (body weight, capped below the title so
 * the title governs - was 62px/600, out-ranking the 46px h1). Other roles snap to
 * scale steps so the slide uses <=6 sizes. */
.dq .dqv{font-family:${T.displayFont};font-weight:${WEIGHT.body};font-size:${TYPO.HERO_CAP_PX}px;line-height:normal;color:${T.ink}}
.dq .dql{font-family:${T.bodyFont};font-weight:${WEIGHT.label};font-size:${SCALE.lead}px;line-height:1.3;color:${T.ink}}
.dq .dqm{font-size:${SCALE.body}px;line-height:1.4;color:${T.ink}}
.dq .dqs{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:${TYPO.LABEL_TRACK_PX}px;color:${T.accentCool};margin-top:auto;text-transform:uppercase}
.dins{background:${T.ink};color:${T.paper};padding:34px 36px;display:flex;flex-direction:column;gap:20px;min-height:0;overflow:hidden}
.dins .dlbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:3px;text-transform:uppercase;color:${T.accent};font-weight:${WEIGHT.label}}
.dins .ditxt{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.name}px;line-height:1.42;color:${T.paper}}
.dins .dhair{height:1px;background:${T.grey};width:100%}
.dins .dplbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:3px;text-transform:uppercase;color:${T.gold};font-weight:${WEIGHT.label}}
.dins .dptxt{font-size:${SCALE.body}px;line-height:1.48;color:${washHex(T.paper, 0.12)}}
</style>
<div class="dwrap">
  <div class="dgrid">${cards}</div>
  <div class="dins">
    ${insight ? `<div class="dlbl">Convergent insight</div><div class="ditxt">${esc(trunc(insight, 190))}</div>` : ''}
    ${insight && pattern ? `<div class="dhair"></div>` : ''}
    ${pattern ? `<div class="dplbl">Pattern</div><div class="dptxt">${esc(trunc(pattern, 180))}</div>` : ''}
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// theme-spotlight - N themes, primary surfaced as spotlight + supporting list
// ---------------------------------------------------------------------------

function renderThemeSpotlight(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.themeCluster || {};
    const themes: any[] = Array.isArray(data.themes) ? data.themes.slice(0, _caps.items) : [];
    const denseSup = themes.length >= 5;   // 4+ supporting entries in the right column
    const patternSignal: string = data.patternSignal || '';
    if (themes.length === 0) return `<p style="font-size:${SCALE.name}px">No theme data.</p>`;
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
              ${t.evidence && !denseSup ? `<div class="se">&ldquo;${esc(t.evidence)}&rdquo;</div>` : ''}
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
.primary .pidx{font-family:${T.monoFont};font-size:${SCALE.lead}px;letter-spacing:2px;color:${T.accent};text-transform:uppercase}
.primary .pname{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:1.1;color:${T.ink};word-wrap:break-word}
.primary .pinsight{font-size:${SCALE.name}px;line-height:1.35;color:${T.ink};word-wrap:break-word}
.primary .pq{font-family:${T.bodyFont};font-size:${SCALE.name}px;line-height:1.4;color:${T.ink};border-left:3px solid ${T.accent2};padding:8px 14px;background:${T.callout};font-style:italic;word-wrap:break-word}
.primary .pimp{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase}
.primary .pimp + div{font-size:${SCALE.lead}px;line-height:1.35;color:${T.ink};word-wrap:break-word}
.supporting{display:flex;flex-direction:column;gap:12px;min-width:0;overflow:hidden}
.splbl{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;border-bottom:1px solid ${T.hair};padding-bottom:8px}
.sup{display:grid;grid-template-columns:46px 1fr;gap:12px;min-width:0}
.sup > div:last-child{min-width:0;overflow:hidden}
.sup .idx{font-family:${T.displayFont};font-size:${denseSup ? SCALE.subhead : SCALE.subhead}px;color:${T.accent}}
.sup .sn{font-family:${T.bodyFont};font-weight:600;font-size:${denseSup ? SCALE.lead : SCALE.name}px;color:${T.ink};margin-bottom:4px;word-wrap:break-word}
.sup .si{font-size:${denseSup ? SCALE.body : SCALE.lead}px;line-height:1.35;color:${T.ink};margin-bottom:6px;word-wrap:break-word}
.sup .se{font-size:${denseSup ? SCALE.caption : SCALE.body}px;font-style:italic;color:${T.muted};line-height:1.35;margin-bottom:4px;word-wrap:break-word}
.sup .ss{font-family:${T.monoFont};font-size:${denseSup ? SCALE.label : SCALE.caption}px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.pattern{margin-top:14px;font-size:${SCALE.lead}px;line-height:1.4;color:${T.ink};background:${T.callout};padding:12px 18px;border-left:4px solid ${T.accent2}}
.pattern span{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
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
// theme-cluster - equal-weight columns (2026-06-11, task #32 parity: the
// stage previously collapsed all four theme templates into the spotlight
// layout, so preview != export for cluster/arc/mosaic). 2x the goldPreviews
// web twin.
// ---------------------------------------------------------------------------

function renderThemeCluster(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.themeCluster || {};
    const themes: any[] = Array.isArray(data.themes) ? data.themes.slice(0, Math.min(_caps.items, 4)) : [];
    if (themes.length === 0) return `<p style="font-size:${SCALE.name}px">No theme data.</p>`;
    const n = themes.length;
    const dense = n >= 4;
    return `<style>
.tcgrid{display:grid;grid-template-columns:repeat(${n},1fr);gap:${dense ? 20 : 28}px;flex:1;min-height:0}
.tc{border-top:4px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:10px;min-width:0;overflow:hidden}
.tc .idx{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase}
.tc .nm{font-family:${T.displayFont};font-weight:600;font-size:${dense ? SCALE.name : SCALE.name}px;line-height:1.12;color:${T.ink}}
.tc .ins{font-size:${dense ? SCALE.body : SCALE.lead}px;line-height:1.4;color:${T.ink}}
.tc .ev{font-size:${dense ? SCALE.body : SCALE.body}px;line-height:1.4;font-style:italic;color:${T.ink};border-left:3px solid ${T.accent2};padding:6px 12px;background:${T.callout}}
.tc .src{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.grey};text-transform:uppercase;font-style:normal;margin-top:5px}
.tcptn{margin-top:12px;font-size:${SCALE.body}px;line-height:1.35;color:${T.ink};background:${T.callout};padding:10px 18px;border-left:4px solid ${T.accent2}}
.tcptn span{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<div class="tcgrid">
${themes.map((t, i) => `
  <div class="tc">
    <div class="idx">${String(i + 1).padStart(2, '0')}</div>
    <div class="nm">${esc(t.name)}</div>
    <div class="ins">${esc(t.insight)}</div>
    ${t.evidence
        /* 2026-06-12 user feedback: source rides INSIDE the evidence block,
           directly underneath the quote (was margin-top:auto, which floated
           it to the card bottom away from the quote). */
        ? `<div class="ev">&ldquo;${esc(t.evidence)}&rdquo;<div class="src">${esc(t.source)}</div></div>`
        : `<div class="src">${esc(t.source)}</div>`}
  </div>`).join('')}
</div>
${data.patternSignal ? `<div class="tcptn"><span>Pattern signal</span> ${esc(data.patternSignal)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// theme-arc - narrative progression chain with SIGNAL rows (Figma theme-arc
// exemplars NU 165:2 / NXT 288:2). 2x the goldPreviews web twin.
// ---------------------------------------------------------------------------

function renderThemeArc(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.themeCluster || {};
    const themes: any[] = Array.isArray(data.themes) ? data.themes.slice(0, Math.min(_caps.items, 5)) : [];
    if (themes.length === 0) return `<p style="font-size:${SCALE.name}px">No theme data.</p>`;
    const n = themes.length;
    return `<style>
.tagrid{display:grid;grid-template-columns:repeat(${n},1fr);gap:20px;flex:1;min-height:0}
.ta{display:flex;flex-direction:column;gap:10px;min-width:0;overflow:hidden;padding-top:14px}
.ta .hd{display:flex;align-items:center;gap:10px}
.ta .num{font-family:${T.displayFont};font-size:${SCALE.subhead}px;line-height:1;color:${T.accent}}
.ta.last .num{color:${T.accentWarn}}
.ta .arr{font-family:${T.monoFont};font-size:${SCALE.body}px;color:${T.grey}}
.ta .nm{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.name}px;line-height:1.12;color:${T.ink}}
.ta .ins{font-size:${SCALE.body}px;line-height:1.4;color:${T.ink}}
.ta .ev{font-size:${SCALE.caption}px;line-height:1.35;font-style:italic;color:${T.grey}}
.ta .ft{margin-top:auto;border-top:1px solid ${T.hair};padding-top:8px}
.ta .sig{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:0.5px;color:${T.accent2};text-transform:uppercase;line-height:1.4}
.ta .src{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:0.5px;color:${T.grey};text-transform:uppercase}
.tcptn2{margin-top:12px;font-size:${SCALE.body}px;line-height:1.35;color:${T.ink};background:${T.callout};padding:10px 18px;border-left:4px solid ${T.accent2}}
.tcptn2 span{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<div class="tagrid">
${themes.map((t, i) => `
  <div class="ta${i === n - 1 ? ' last' : ''}" style="border-top:4px solid ${i === n - 1 ? T.accentWarn : T.accent}">
    <div class="hd"><span class="num">${String(i + 1).padStart(2, '0')}</span>${i < n - 1 ? '<span class="arr">&rarr;</span>' : ''}</div>
    <div class="nm">${esc(t.name)}</div>
    <div class="ins">${esc(t.insight)}</div>
    ${t.evidence ? `<div class="ev">&ldquo;${esc(t.evidence)}&rdquo;</div>` : ''}
    <div class="ft">
      ${t.signal ? `<div class="sig">Signal · ${esc(t.signal)}</div>` : ''}
      <div class="src">${esc(t.source)}</div>
    </div>
  </div>`).join('')}
</div>
${data.patternSignal ? `<div class="tcptn2"><span>Pattern signal</span> ${esc(data.patternSignal)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// theme-mosaic - 2x2 inverse checkerboard (Figma theme-mosaic exemplars
// NU 167:2 / NXT 289:2). 2x the goldPreviews web twin.
// ---------------------------------------------------------------------------

function renderThemeMosaic(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.themeCluster || {};
    const themes: any[] = Array.isArray(data.themes) ? data.themes.slice(0, 4) : [];
    if (themes.length === 0) return `<p style="font-size:${SCALE.name}px">No theme data.</p>`;
    return `<style>
.tmgrid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:16px;flex:1;min-height:0}
.tm{padding:18px 24px;display:flex;flex-direction:column;gap:8px;min-width:0;overflow:hidden}
.tm.inv{background:${T.band}}
.tm.std{background:${T.callout}}
.tm .idx{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;text-transform:uppercase}
.tm.inv .idx{color:${T.accent}} .tm.std .idx{color:${T.grey}}
.tm .nm{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.name}px;line-height:1.12}
.tm.inv .nm{color:${T.bandText}} .tm.std .nm{color:${T.ink}}
.tm .ins{font-size:${SCALE.body}px;line-height:1.38}
.tm.inv .ins{color:${T.bandText};opacity:0.92} .tm.std .ins{color:${T.ink}}
.tm .ev{font-size:${SCALE.caption}px;line-height:1.35;font-style:italic}
.tm.inv .ev{color:${T.bandText};opacity:0.8} .tm.std .ev{color:${T.grey}}
.tm .src{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:0.5px;text-transform:uppercase;margin-top:auto}
.tm.inv .src{color:${T.accent}} .tm.std .src{color:${T.grey}}
</style>
<div class="tmgrid">
${themes.map((t, i) => `
  <div class="tm ${i === 0 || i === 3 ? 'inv' : 'std'}">
    <div class="idx">${String(i + 1).padStart(2, '0')}</div>
    <div class="nm">${esc(t.name)}</div>
    <div class="ins">${esc(t.insight)}</div>
    ${t.evidence ? `<div class="ev">&ldquo;${esc(t.evidence)}&rdquo;</div>` : ''}
    <div class="src">${esc(t.source)}</div>
  </div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// block-quote - pull quote + corroborating data strip
// ---------------------------------------------------------------------------

function renderBlockQuote(slide: SlideDataLike, T: BrandTokens): string {
    const q = slide.quote || {};
    // DENSE STRUCTURAL LAYOUT (W2, 2026-06-11): 3+ voices route to the
    // block-quote-dense GOLD exemplar (Figma NU 199:3 / NXT 322:3) - three
    // quote cards + WHERE THEY CONVERGE synthesis band.
    const extra: any[] = Array.isArray(q.additionalQuotes) ? q.additionalQuotes : [];
    if (q.text && extra.length >= 2) return renderBlockQuoteDense(q, extra, T);
    const corrData: any[] = Array.isArray(q.corroboratingData) ? q.corroboratingData.slice(0, _caps.sub) : [];
    const corrN = Math.max(corrData.length, 1);
    const denseCorr = corrN >= 4;
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
.qctx{font-family:${T.monoFont};font-size:${SCALE.lead}px;letter-spacing:2.5px;color:${T.accent2};text-transform:uppercase;margin-bottom:14px}
.qtext{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:1.18;color:${T.ink};margin-bottom:18px;max-width:1620px}
.qctxp{font-size:${SCALE.name}px;line-height:1.5;color:${T.ink};margin-bottom:18px;max-width:1620px}
.attr{font-family:${T.bodyFont};font-size:${SCALE.name}px;color:${T.muted};margin-bottom:24px}
.attr b{font-weight:600;color:${T.ink}}
.corr{margin-top:auto;display:grid;grid-template-columns:repeat(${corrN},1fr);gap:${denseCorr ? 18 : 24}px;padding:18px 22px;background:${T.callout};border-left:4px solid ${T.accent}}
.clbl{grid-column:1/-1;font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;font-weight:600}
.ci .cv{font-family:${T.displayFont};font-size:${denseCorr ? SCALE.subhead : SCALE.subhead}px;line-height:1.12;color:${T.ink}}
.ci .cl{font-size:${denseCorr ? SCALE.body : SCALE.lead}px;line-height:1.35;color:${T.ink};margin:4px 0 6px}
.ci .cs{font-family:${T.monoFont};font-size:${SCALE.caption}px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.impl{margin-top:18px;font-size:${SCALE.name}px;line-height:1.45;color:${T.ink};border-top:1px solid ${T.hair};padding-top:14px}
.impl span{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
${q.context ? `<div class="qctx">${esc(q.context)}</div>` : ''}
<div class="qtext">&ldquo;${esc(trunc(q.text, 260))}&rdquo;</div>
${q.contextParagraph ? `<div class="qctxp">${esc(trunc(q.contextParagraph, 240))}</div>` : ''}
<div class="attr"><b>${esc(q.attribution)}</b>${q.role ? ' · ' + esc(q.role) : ''}${q.source ? ' · ' + esc(q.source) : ''}</div>
${corrHtml}
${q.implication ? `<div class="impl"><span>Implication</span> ${esc(trunc(q.implication, 200))}</div>` : ''}`;
}

/** block-quote DENSE twin of the GOLD exemplar (NU 199:3 / NXT 322:3): three
 *  accent-left-border voice cards (quote / speaker / source) + a callout
 *  WHERE THEY CONVERGE synthesis band. Routes when 3+ verbatim voices are in
 *  the payload; the single-hero layout cannot carry them without cramming. */
function renderBlockQuoteDense(q: any, extra: any[], T: BrandTokens): string {
    const voices = [
        { text: q.text, attribution: q.attribution, role: q.role, source: q.source },
        ...extra.slice(0, 2),
    ];
    const cards = voices.map(v => `
      <div class="bvc">
        <div class="bvm">&ldquo;</div>
        <div class="bvq">${esc(trunc(v.text, 210))}</div>
        <div class="bva">${esc(trunc(v.attribution, 36))}</div>
        ${v.source ? `<div class="bvs">${esc(trunc(v.source, 44))}</div>` : ''}
        ${v.role ? `<div class="bvr">${esc(trunc(v.role, 50))}</div>` : ''}
      </div>`).join('');
    const syn = q.synthesis || q.implication || '';
    return `<style>
.bvrow{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;flex:1 1 auto;min-height:0;margin-bottom:20px}
.bvc{border-left:3px solid ${T.accent};padding:22px 26px 20px;display:flex;flex-direction:column;gap:11px;min-height:0;overflow:hidden}
.bvc .bvm{font-family:${T.displayFont};font-size:${SCALE.subhead}px;line-height:normal;color:${T.accent}}
.bvc .bvq{font-family:${T.titleFont};font-weight:400;font-size:${SCALE.lead}px;line-height:1.5;color:${T.ink}}
.bvc .bva{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.ink};text-transform:uppercase;font-weight:600;margin-top:auto}
.bvc .bvs{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.accentCool};text-transform:uppercase}
.bvc .bvr{font-size:${SCALE.label}px;line-height:1.35;color:${T.grey}}
.bsyn{display:grid;grid-template-columns:330px 1fr;gap:28px;align-items:center;background:${T.callout};padding:22px 32px;flex-shrink:0}
.bsyn .bsl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:3px;color:${T.accentWarn};text-transform:uppercase;font-weight:600}
.bsyn .bst{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.lead}px;line-height:1.46;color:${T.ink}}
</style>
<div class="bvrow">${cards}</div>
${syn ? `<div class="bsyn"><div class="bsl">Where they converge</div><div class="bst">${esc(trunc(syn, 200))}</div></div>` : ''}`;
}

// ---------------------------------------------------------------------------
// recommendation - action title + supporting actions + impact grid + evidence
// ---------------------------------------------------------------------------

function renderRecommendation(slide: SlideDataLike, T: BrandTokens): string {
    const r = slide.recommendation || {};
    const rawSupporting: any[] = Array.isArray(r.supportingActions) ? r.supportingActions : [];
    const rawEvidence: any[] = Array.isArray(r.evidence) ? r.evidence : [];
    // DENSE STRUCTURAL LAYOUT (W2, 2026-06-11): full payloads route to the
    // recommendation-dense GOLD exemplar structure (Figma NU 194:3 / NXT
    // 319:3) - full-width action rows + horizontal impact band + evidence
    // card strip. Replaces the deleted tightR shrink heuristic; this is the
    // exact 4-action + grid payload class that broke the user's 2026-06-11
    // fintech decks (slides 8/14). Routing reads the RAW arrays - capping
    // first would mask the >=4 predicate and drop the 4th evidenced action.
    const hasGridPanel = !!(r.impactGrid && (r.impactGrid.baseline || r.impactGrid.target || r.impactGrid.timeframe || r.impactGrid.owner));
    // SLIDE-SYSTEM VARIANT (NU_Giving role-block G2): impact CARD STACK on
    // the right rail, numbered actions on the left.
    const impactCards: any[] = Array.isArray(r.impactCards) ? r.impactCards : [];
    if (impactCards.length >= 2) {
        const acts = rawSupporting.slice(0, 4);
        const rows = acts.map((a: any, i: number) => `
      <div class="rba">
        <div class="rbn">${String(i + 1).padStart(2, '0')}</div>
        <div><div class="rbt">${esc(trunc(a.name, 50))}</div><div class="rbd">${esc(trunc(a.description, 210))}</div></div>
      </div>`).join('');
        const cards = impactCards.slice(0, 3).map((c: any) => `
      <div class="rbc">
        <div class="rbcl">${esc(trunc(c.label, 20))}</div>
        <div class="rbch">${esc(trunc(c.headline, 36))}</div>
        <div class="rbcb">${esc(trunc(c.body, 170))}</div>
      </div>`).join('');
        return `<style>
.rbwrap{display:grid;grid-template-columns:1.62fr 1fr;gap:40px;flex:1 1 auto;min-height:0}
.rbleft{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.rbrat{font-size:${SCALE.body}px;line-height:1.4;color:${T.ink};margin-bottom:18px}
.rblbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;font-weight:600;border-bottom:2px solid ${T.ink};padding-bottom:8px;margin-bottom:6px}
.rba{display:grid;grid-template-columns:80px 1fr;gap:18px;align-items:start;padding:16px 0;border-bottom:1px solid ${T.hair}}
.rba .rbn{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:normal;color:${T.accent}}
.rba .rbt{font-family:${T.bodyFont};font-weight:600;font-size:${SCALE.lead}px;color:${T.ink};margin-bottom:5px}
.rba .rbd{font-size:${SCALE.body}px;line-height:1.36;color:${T.ink}}
.rbright{display:flex;flex-direction:column;gap:20px;min-height:0;overflow:hidden}
.rbplbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;font-weight:600;border-bottom:2px solid ${T.ink};padding-bottom:8px}
.rbc{position:relative;background:${T.paper === '#FFFFFF' ? T.callout : '#FFFFFF'};padding:22px 26px;overflow:hidden}
.rbc::before{content:'';position:absolute;left:0;top:0;width:4px;height:100%;background:${T.accent}}
.rbc .rbcl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2.5px;color:${T.accentWarn};text-transform:uppercase;font-weight:600}
.rbc .rbch{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.lead}px;line-height:1.18;color:${T.ink};margin-top:8px}
.rbc .rbcb{font-size:${SCALE.caption}px;line-height:1.36;color:${T.ink};margin-top:9px}
</style>
<div class="rbwrap">
  <div class="rbleft">
    ${r.rationale ? `<div class="rbrat">${esc(trunc(r.rationale, 190))}</div>` : ''}
    <div class="rblbl">${esc(r.actionsLabel || 'Supporting actions')}</div>
    ${rows}
  </div>
  <div class="rbright"><div class="rbplbl">Projected impact</div>${cards}</div>
</div>`;
    }
    if (rawSupporting.length >= 4 || (rawSupporting.length >= 3 && rawEvidence.length >= 2 && hasGridPanel)) {
        return renderRecommendationDense(r, rawSupporting, rawEvidence, T);
    }
    const supporting = rawSupporting.slice(0, _caps.items);
    const evidence = rawEvidence.slice(0, _caps.sub);
    const grid = r.impactGrid || {};
    // FULL-STACK FIT (2026-06-12): when actionTitle + rationale + actions +
    // evidence + impact grid + impactMetric + implication are ALL present,
    // the cumulative stack overflowed the 1080px stage by ~25px (caught by
    // PPTX geometry audit: slide-5 KEY OUTCOME panel landed at 7.675in on a
    // 7.5in canvas; the 540px preview hid it behind line-clamps; the
    // implication footer trailed ~10px past on all four recommendation
    // slides). Recover the height with the established denseSa count-
    // adaptive type scale + tighter spacing + char budgets - deterministic
    // server-side trunc, NEVER CSS clamp/overflow (the export MEASURE reads
    // layout rects, so paint clipping cannot bound the exported geometry).
    const fullStack = hasGridPanel && !!r.impactMetric && evidence.length > 0 && !!r.implication && !!r.rationale;
    const denseSa = supporting.length >= 4 || evidence.length >= 3 || fullStack;
    const ratBudget = fullStack ? 185 : 230;
    const evTextBudget = fullStack ? 150 : 170;
    const gridCellBudget = fullStack ? 68 : 80;
    const supportingHtml = supporting.length > 0 ? `
      <div class="sup">
        <div class="splbl">Supporting actions</div>
        ${supporting.map((a, i) => `
          <div class="sa">
            <div class="idx">${String(i + 1).padStart(2, '0')}</div>
            <div>
              <div class="sn">${esc(trunc(a.name, 46))}</div>
              <div class="sd">${esc(trunc(a.description, 140))}</div>
            </div>
          </div>`).join('')}
      </div>` : '';
    const evidenceHtml = evidence.length > 0 ? `
      <div class="evi">
        <div class="elbl">Evidence</div>
        ${evidence.map(e => `
          <div class="eb">
            <div class="et">&ldquo;${esc(trunc(e.text, evTextBudget))}&rdquo;</div>
            <div class="ea">${esc(e.attribution)}${e.source ? ' · ' + esc(e.source) : ''}</div>
          </div>`).join('')}
      </div>` : '';
    const gridHtml = (grid.baseline || grid.target || grid.timeframe || grid.owner) ? `
      <div class="grid">
        <div class="glbl">Projected impact</div>
        <div class="gcells">
          ${grid.baseline ? `<div class="gc"><div class="gh">Baseline</div><div class="gp">${esc(trunc(grid.baseline, gridCellBudget))}</div></div>` : ''}
          ${grid.target ? `<div class="gc"><div class="gh">Target</div><div class="gp">${esc(trunc(grid.target, gridCellBudget))}</div></div>` : ''}
          ${grid.timeframe ? `<div class="gc"><div class="gh">Timeframe</div><div class="gp">${esc(trunc(grid.timeframe, 60))}</div></div>` : ''}
          ${grid.owner ? `<div class="gc"><div class="gh">Owner</div><div class="gp">${esc(trunc(grid.owner, 60))}</div></div>` : ''}
        </div>
        ${r.impactMetric ? `<div class="metric"><div class="mv">${esc(r.impactMetric.value)}</div><div class="ml">${esc(r.impactMetric.label)}</div></div>` : ''}
      </div>` : '';
    return `<style>
.action{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:1.15;color:${T.ink};margin-bottom:${fullStack ? 9 : 12}px;max-width:1620px;border-left:4px solid ${T.accent};padding-left:18px;flex-shrink:0}
.rationale{font-size:${fullStack ? SCALE.lead : SCALE.lead}px;line-height:1.42;color:${T.ink};margin-bottom:${fullStack ? 8 : 16}px;max-width:1620px;flex-shrink:0}
.cols{display:grid;grid-template-columns:1.2fr 1fr;gap:36px;flex:1 0 auto}
.rcol{display:flex;flex-direction:column;gap:18px;min-width:0}
.sup,.evi{display:flex;flex-direction:column;gap:10px}
.splbl,.elbl,.glbl{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;border-bottom:1px solid ${T.hair};padding-bottom:6px;font-weight:600}
.sa{display:grid;grid-template-columns:42px 1fr;gap:12px;margin-top:${denseSa ? 4 : 8}px}
.sa .idx{font-family:${T.displayFont};font-size:${denseSa ? SCALE.name : SCALE.subhead}px;color:${T.accent}}
.sa .sn{font-family:${T.bodyFont};font-weight:600;font-size:${denseSa ? SCALE.lead : SCALE.name}px;color:${T.ink};margin-bottom:3px}
.sa .sd{font-size:${denseSa ? SCALE.body : SCALE.lead}px;line-height:1.36;color:${T.ink}}
.eb{margin-top:6px}
.eb .et{font-size:${denseSa ? SCALE.body : SCALE.lead}px;line-height:1.38;color:${T.ink};font-style:italic}
.eb .ea{font-family:${T.monoFont};font-size:${SCALE.caption}px;letter-spacing:1px;color:${T.muted};text-transform:uppercase;margin-top:3px}
.grid{background:${T.callout};padding:${fullStack ? 11 : 14}px 20px;border-left:4px solid ${T.accent2};flex-shrink:0}
.grid .gcells{grid-template-columns:repeat(2,1fr)}
.gcells{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:10px}
.gc .gh{font-family:${T.monoFont};font-size:${SCALE.caption}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase}
.gc .gp{font-size:${SCALE.lead}px;line-height:1.35;color:${T.ink};margin-top:3px}
.metric{margin-top:${fullStack ? 8 : 12}px;display:flex;align-items:baseline;gap:14px;border-top:1px solid ${T.hair};padding-top:${fullStack ? 7 : 10}px}
.metric .mv{font-family:${T.displayFont};font-size:${fullStack ? SCALE.subhead : SCALE.subhead}px;color:${T.accent}}
.metric .ml{font-size:${SCALE.lead}px;color:${T.ink}}
.impl{margin-top:${fullStack ? 4 : 14}px;font-size:${fullStack ? SCALE.lead : SCALE.lead}px;line-height:1.4;color:${T.ink}}
.impl span{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
${r.actionTitle ? `<div class="action">${esc(trunc(r.actionTitle, 120))}</div>` : ''}
${r.rationale ? `<div class="rationale">${esc(trunc(r.rationale, ratBudget))}</div>` : ''}
<div class="cols">
  ${supportingHtml}
  <div class="rcol">
    ${evidenceHtml}
    ${gridHtml}
  </div>
</div>
${r.implication ? `<div class="impl"><span>Implication</span> ${esc(trunc(r.implication, fullStack ? 170 : 200))}</div>` : ''}`;
}

/** recommendation DENSE twin of the GOLD exemplar (NU 194:3 / NXT 319:3):
 *  full-width numbered action rows (Bebas numeral / name column / description
 *  fill) + horizontal impact band + twin evidence quote cards. Structural
 *  density: the two-column cram is GONE; rows absorb 4-6 actions without
 *  shrinking type. */
function renderRecommendationDense(r: any, supporting: any[], evidence: any[], T: BrandTokens): string {
    const grid = r.impactGrid || {};
    const acts = supporting.slice(0, 6);
    const evi = evidence.slice(0, 2);
    const hasBand = !!(grid.baseline || grid.target || grid.timeframe || grid.owner);
    const rows = acts.map((a, i) => `
      <div class="dra">
        <div class="dnum">${String(i + 1).padStart(2, '0')}</div>
        <div class="dname">${esc(trunc(a.name, 52))}</div>
        <div class="ddesc">${esc(trunc(a.description, 150))}</div>
      </div>`).join('');
    const band = hasBand ? `
      <div class="dband">
        ${[['Baseline', grid.baseline], ['Target', grid.target], ['Timeframe', grid.timeframe], ['Owner', grid.owner]]
            .filter(([, v]) => v)
            .map(([k, v]) => `<div class="dbc"><div class="dbh">${k}</div><div class="dbp">${esc(trunc(v, 64))}</div></div>`).join('')}
      </div>` : '';
    const eviStrip = evi.length > 0 ? `
      <div class="devi">
        ${evi.map(e => `
          <div class="dec">
            <div class="det">&ldquo;${esc(trunc(e.text, 150))}&rdquo;</div>
            <div class="dea">${esc(trunc([e.attribution, e.source].filter(Boolean).join(' · '), 64))}</div>
          </div>`).join('')}
      </div>` : '';
    return `<style>
.daction{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:1.12;color:${T.ink};margin-bottom:8px;max-width:1620px;border-left:4px solid ${T.accent};padding-left:18px;flex-shrink:0}
.drationale{font-size:${SCALE.body}px;line-height:1.4;color:${T.ink};margin-bottom:10px;max-width:1620px;flex-shrink:0}
.dacts{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}
.dra{display:grid;grid-template-columns:74px 420px 1fr;gap:22px;align-items:start;padding:9px 0;border-bottom:1px solid ${T.hair}}
.dra:first-child{border-top:2px solid ${T.ink}}
.dra .dnum{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:normal;color:${T.accent}}
.dra .dname{font-family:${T.bodyFont};font-weight:600;font-size:${SCALE.lead}px;line-height:1.25;color:${T.ink}}
.dra .ddesc{font-size:${SCALE.body}px;line-height:1.4;color:${T.ink}}
.dband{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;background:${T.callout};padding:12px 24px;margin-top:10px;flex-shrink:0}
.dbc .dbh{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;font-weight:600}
.dbc .dbp{font-size:${SCALE.body}px;line-height:1.34;color:${T.ink};margin-top:4px}
.devi{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:10px;flex-shrink:0}
.dec{border-left:3px solid ${T.accentCool};padding:10px 18px;background:${T.paper}}
.dec .det{font-size:${SCALE.body}px;line-height:1.4;color:${T.ink};font-style:italic}
.dec .dea{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.accentCool};text-transform:uppercase;margin-top:6px}
</style>
${r.actionTitle ? `<div class="daction">${esc(trunc(r.actionTitle, 120))}</div>` : ''}
${r.rationale ? `<div class="drationale">${esc(trunc(r.rationale, 200))}</div>` : ''}
<div class="dacts">${rows}</div>
${band}
${eviStrip}`;
}

// ---------------------------------------------------------------------------
// timeline - phases with duration + items
// ---------------------------------------------------------------------------

function renderTimeline(slide: SlideDataLike, T: BrandTokens): string {
    const data = slide.timeline || {};
    const phases: any[] = Array.isArray(data.phases) ? data.phases.slice(0, _caps.items) : [];
    // SLIDE-SYSTEM VARIANT: role rows x horizon columns (aggregate roadmap).
    const roleRows: any[] = Array.isArray(data.rows) ? data.rows : [];
    if (roleRows.length >= 2 && phases.length >= 2) {
        const horizons = phases.slice(0, 4).map((ph: any) => String(ph.name || ''));
        const head = horizons.map((h, i) => `<div class="agh${i === horizons.length - 1 ? ' last' : ''}">${esc(trunc(h, 22))}</div>`).join('');
        const rows = roleRows.slice(0, 4).map((r: any) => `
      <div class="agrole">${esc(trunc(r.role, 20))}</div>
      ${(r.cells || []).slice(0, horizons.length).map((c: string, j: number) => `
        <div class="agc"><div class="agtick${j === horizons.length - 1 ? ' last' : ''}"></div><p>${esc(trunc(c, 90))}</p></div>`).join('')}`).join('');
        return `<style>
.aggrid{display:grid;grid-template-columns:220px repeat(${horizons.length},1fr);gap:18px;flex:1 1 auto;align-content:start;min-height:0}
.agh{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;font-weight:600;padding-bottom:10px;border-bottom:2px solid ${T.ink}}
.agh.last{color:${T.accent}}
.aggrid>.agh:first-of-type{grid-column:2}
.agrole{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.name}px;color:${T.ink};padding-top:18px}
.agc{position:relative;background:${T.paper === '#FFFFFF' ? T.callout : '#FFFFFF'};padding:24px 22px 18px;min-height:130px;overflow:hidden}
.agc .agtick{position:absolute;left:0;top:0;width:100%;height:3px;background:${T.accent}}
.agc .agtick.last{background:${T.ink}}
.agc p{font-size:${SCALE.body}px;line-height:1.38;color:${T.ink}}
</style>
<div class="aggrid"><div></div>${head}${rows}</div>`;
    }
    if (phases.length === 0) return `<p style="font-size:${SCALE.name}px">No timeline data.</p>`;
    const cols = `repeat(${phases.length}, 1fr)`;
    const maxItems = Math.max(0, ...phases.map(p => Array.isArray(p.items) ? Math.min(p.items.length, _caps.sub) : 0));
    const denseTl = phases.length >= 6 || maxItems >= 6;
    return `<style>
.phases{display:grid;grid-template-columns:${cols};gap:${denseTl ? 18 : 22}px;flex:1}
.phase{display:flex;flex-direction:column;gap:10px;border-top:3px solid ${T.accent};padding-top:14px}
.phase .pidx{font-family:${T.monoFont};font-size:${denseTl ? SCALE.caption : SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase}
.phase .pdur{font-family:${T.bodyFont};font-size:${denseTl ? SCALE.body : SCALE.lead}px;color:${T.accent2};font-weight:600}
.phase .pname{font-family:${T.displayFont};font-weight:600;font-size:${denseTl ? SCALE.name : SCALE.subhead}px;color:${T.ink};line-height:1.1}
.phase ul{list-style:none;margin-top:8px;display:flex;flex-direction:column;gap:${denseTl ? 6 : 8}px}
.phase li{font-size:${denseTl ? SCALE.body : SCALE.lead}px;line-height:1.4;color:${T.ink};padding-left:14px;position:relative}
.phase li::before{content:'';position:absolute;left:0;top:8px;width:6px;height:6px;background:${T.accent}}
</style>
<div class="phases">
${phases.map((p, i) => `
  <div class="phase">
    <div class="pidx">Phase ${String(i + 1).padStart(2, '0')}</div>
    ${p.duration ? `<div class="pdur">${esc(p.duration)}</div>` : ''}
    <div class="pname">${esc(p.name)}</div>
    ${Array.isArray(p.items) && p.items.length > 0
        ? `<ul>${p.items.slice(0, _caps.sub).map((it: string) => `<li>${esc(it)}</li>`).join('')}</ul>`
        : ''}
  </div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// persona-card - name, role, quote, JTBD, pains, goals
// ---------------------------------------------------------------------------

function renderPersonaCard(slide: SlideDataLike, T: BrandTokens): string {
    const p = slide.persona || {};
    const pains: any[] = Array.isArray(p.painPoints) ? p.painPoints.slice(0, _caps.items) : [];
    const goals = p.goals || {};
    // DENSE STRUCTURAL LAYOUT (W2, 2026-06-11): personas carrying 3+ evidence
    // arrays route to the persona-dense GOLD exemplar (Figma NU 199:124 /
    // NXT 322:124) - dark identity column + 2x2 evidence quadrant grid.
    const quadArrays = [
        (goals.lifeGoal || goals.experienceGoal || goals.functionalGoal) ? 1 : 0,
        pains.length >= 2 ? 1 : 0,
        (Array.isArray(p.behaviors) && p.behaviors.length >= 2) ? 1 : 0,
        (Array.isArray(p.winConditions) && p.winConditions.length >= 2) ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    if (quadArrays >= 3 && p.quote) return renderPersonaCardDense(p, pains, goals, T);
    const densePp = pains.length >= 4;
    return `<style>
.pcols{display:grid;grid-template-columns:1fr 1.2fr;gap:40px;flex:1}
.pleft{display:flex;flex-direction:column;gap:18px}
/* 2026-06-14 type system: name capped at subhead (< title); roles snap to scale. */
.pname{font-family:${T.displayFont};font-weight:${T.titleWeight};font-size:${SCALE.subhead}px;line-height:1.16;color:${T.ink}}
.prole{font-family:${T.bodyFont};font-size:${SCALE.lead}px;color:${T.muted}}
.pdem{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-top:1px solid ${T.hair};padding-top:10px}
.pquote{font-family:${T.bodyFont};font-size:${SCALE.lead}px;line-height:1.5;color:${T.ink};font-style:italic;border-left:4px solid ${T.accent};padding:10px 18px;background:${T.callout}}
.pbio{font-size:${SCALE.body}px;line-height:1.5;color:${T.ink}}
.pright{display:flex;flex-direction:column;gap:18px}
.sect{display:flex;flex-direction:column;gap:8px}
.sect h2{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;font-weight:${WEIGHT.label}}
.goals{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.goal{border-top:2px solid ${T.accent};padding-top:8px;font-size:${SCALE.body}px;line-height:1.4}
.goal .gl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;margin-bottom:4px}
.pains{display:flex;flex-direction:column;gap:${densePp ? 8 : 12}px}
.pp{border-left:3px solid ${T.accent};padding:6px 14px}
.pp .ppn{font-family:${T.bodyFont};font-weight:${WEIGHT.title};font-size:${SCALE.lead}px;color:${T.ink}}
.pp .ppq{font-size:${SCALE.body}px;line-height:1.45;color:${T.ink};font-style:italic;margin-top:4px}
.pp .pps{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.muted};text-transform:uppercase;margin-top:4px}
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
    ${p.jtbd ? `<div class="sect"><h2>Jobs to be done</h2><div style="font-size:${SCALE.body}px;line-height:1.5;color:${T.ink}">${esc(p.jtbd)}</div></div>` : ''}
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

/** persona-card DENSE twin of the GOLD exemplar (NU 199:124 / NXT 322:124):
 *  dark identity column (name / descriptors / defining quote / stakes) +
 *  2x2 evidence quadrant grid (GOALS cool / PAIN POINTS warn / BEHAVIORS
 *  cool / WHAT WINS THEM accent). */
function renderPersonaCardDense(p: any, pains: any[], goals: any, T: BrandTokens): string {
    const item = (txt: string, color: string) =>
        `<div class="pqi"><span style="background:${color}"></span><p>${esc(trunc(txt, 92))}</p></div>`;
    const quads: Array<{ label: string; color: string; items: string[] }> = [];
    const goalItems = [goals.functionalGoal, goals.experienceGoal, goals.lifeGoal].filter(Boolean) as string[];
    if (goalItems.length) quads.push({ label: 'Goals', color: T.accentCool, items: goalItems });
    if (pains.length) quads.push({ label: 'Pain points', color: T.accentWarn, items: pains.slice(0, 3).map((pp: any) => pp.label || pp.quote || '') });
    if (Array.isArray(p.behaviors) && p.behaviors.length) quads.push({ label: 'Behaviors', color: T.accentCool, items: p.behaviors.slice(0, 3) });
    if (Array.isArray(p.winConditions) && p.winConditions.length) quads.push({ label: 'What wins them', color: T.accent, items: p.winConditions.slice(0, 3) });
    const quadHtml = quads.slice(0, 4).map(qd => `
      <div class="pq" style="border-top-color:${qd.color}">
        <div class="pql">${esc(qd.label)}</div>
        ${qd.items.map(it => item(it, qd.color)).join('')}
      </div>`).join('');
    return `<style>
.pdw{display:grid;grid-template-columns:520px 1fr;gap:32px;flex:1 1 auto;min-height:0}
.pid{background:${T.ink};color:${T.paper};padding:34px;display:flex;flex-direction:column;gap:17px;min-height:0;overflow:hidden}
/* 2026-06-14 type system: name capped at subhead (below the 46px title so the title
 * governs - was 52px out-ranking it); roles snap to scale; quad body at the floor. */
.pid .pin{font-family:${T.displayFont};font-weight:${T.titleWeight};font-size:${SCALE.subhead}px;line-height:1.06;color:${T.paper};text-transform:uppercase}
.pid .pirole{font-size:${SCALE.body}px;line-height:1.35;color:${washHex(T.paper, 0.16)}}
.pid .pidesc{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;line-height:1.6;color:${T.gold};text-transform:uppercase}
.pid .pihair{height:1px;background:${T.grey};width:100%}
.pid .pilbl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:3px;color:${T.accent};text-transform:uppercase;font-weight:${WEIGHT.label}}
.pid .piq{font-family:${T.titleFont};font-weight:${WEIGHT.body};font-size:${SCALE.lead}px;line-height:1.5;color:${T.paper}}
.pid .pisrc{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.accentCool};text-transform:uppercase}
.pid .pist{margin-top:auto;font-size:${SCALE.caption}px;line-height:1.48;color:${washHex(T.paper, 0.12)}}
.pgrid2{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:24px;min-height:0}
.pq{border-top:3px solid ${T.accent};padding:18px 22px 14px 0;display:flex;flex-direction:column;gap:11px;min-height:0;overflow:hidden}
.pq .pql{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:3px;color:${T.ink};text-transform:uppercase;font-weight:${WEIGHT.label}}
.pqi{display:grid;grid-template-columns:12px 1fr;gap:11px;align-items:start}
.pqi span{width:8px;height:8px;margin-top:8px;display:block}
.pqi p{font-size:${SCALE.body}px;line-height:1.42;color:${T.ink}}
</style>
<div class="pdw">
  <div class="pid">
    <div class="pin">${esc(trunc(p.name, 34))}</div>
    ${p.role ? `<div class="pirole">${esc(trunc(p.role, 70))}</div>` : ''}
    ${(p.descriptors || p.demographics) ? `<div class="pidesc">${esc(trunc(p.descriptors || p.demographics, 84))}</div>` : ''}
    <div class="pihair"></div>
    <div class="pilbl">Defining quote</div>
    <div class="piq">&ldquo;${esc(trunc(p.quote, 170))}&rdquo;</div>
    ${p.quoteSource ? `<div class="pisrc">${esc(trunc(p.quoteSource, 44))}</div>` : ''}
    ${p.stakes ? `<div class="pist">${esc(trunc(p.stakes, 130))}</div>` : ''}
  </div>
  <div class="pgrid2">${quadHtml}</div>
</div>`;
}

// ---------------------------------------------------------------------------
// case-study - subject + challenge + intervention + outcome + transferability
// ---------------------------------------------------------------------------

// 2026-06-10 - Rebuilt to the GOLD case-study spec from the Figma frames
// (NXT 212:2 before/after, 217:2 evidence stack; NU 91:2 / 93:2 are the same
// geometry with brand-token skin). All px values are the Figma 1920x1080
// values verbatim. Reads the SAME CaseStudyData fields as the web twin
// (components/slideTemplates/web.tsx CaseStudySlide) - the prior version read
// `intervention`/`transferability`, which do not exist on CaseStudyData, so
// the APPROACH block silently vanished from every export.
function renderCaseStudy(slide: SlideDataLike, T: BrandTokens): string {
    const c = slide.caseStudy || {};
    const variant: string = c.variant
        || (c.beforeAfter ? 'before-after' : (Array.isArray(c.evidence) && c.evidence.length > 0) ? 'evidence-stack' : 'four-block');

    // GOLD meta row (profile · timeframe · investment) + hairline.
    const metaParts: string[] = [];
    if (c.subjectMeta) metaParts.push(esc(c.subjectMeta));
    if (c.timeframe) metaParts.push(`TIMEFRAME  ${esc(c.timeframe)}`);
    if (c.investment) metaParts.push(`INVESTMENT  ${esc(c.investment)}`);
    const metaHtml = metaParts.length > 0
        ? `<div class="metarow">${metaParts.join('          ')}</div><div class="hairline"></div>`
        : '';

    const srcLine = (s: string) => `<div class="cssrc">SOURCE: ${esc(s)}</div>`;

    if (variant === 'before-after' && c.beforeAfter) {
        const ba = c.beforeAfter;
        const panel = (side: any, tone: 'warn' | 'cool') => {
            const accent = tone === 'warn' ? T.accentWarn : T.accentCool;
            const wash = tone === 'warn' ? T.washWarn : T.washCool;
            const points: string[] = Array.isArray(side?.points) ? side.points.slice(0, _caps.items) : [];
            return `
      <div class="bap" style="background:${wash}">
        <div class="balbl" style="color:${accent}">${esc(side?.label || (tone === 'warn' ? 'BEFORE' : 'AFTER'))}</div>
        <div class="bahead">${esc(side?.headline)}</div>
        <div class="bapts">
          ${points.map(p => `<div class="bapt"><span style="background:${accent}"></span><p>${esc(p)}</p></div>`).join('')}
        </div>
      </div>`;
        };
        const quote = c.pullQuote;
        return `<style>
.cssrc{font-family:${T.monoFont};font-weight:500;font-size:${SCALE.label}px;letter-spacing:1px;color:${T.accentCool};text-transform:uppercase;margin-top:8px}
.barow{display:flex;gap:26px;flex:1;min-height:0;margin-bottom:17px}
.bap{flex:1;min-width:0;padding:30px 32px;display:flex;flex-direction:column;gap:16px}
.balbl{font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2px;text-transform:uppercase}
.bahead{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.lead}px;line-height:1.15;color:${T.ink}}
.bapts{flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.bapt{display:flex;gap:12px;align-items:flex-start}
.bapt span{width:7px;height:7px;flex-shrink:0;margin-top:7px;display:block}
.bapt p{font-size:16.5px;line-height:1.4;color:${T.ink};font-family:${T.bodyFont}}
.baarrow{align-self:center;font-family:${T.bodyFont};font-size:${SCALE.subhead}px;color:${T.grey};width:44px;text-align:center;flex-shrink:0}
.bares{display:flex;gap:48px}
.bares .col{flex:1;min-width:0}
.bares .rlbl{font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;margin-bottom:10px}
.bares .rtxt{font-size:${SCALE.caption}px;line-height:1.42;color:${T.ink};font-family:${T.bodyFont}}
.baq{display:flex;gap:14px}
.baq .bar{width:4px;background:${T.accentCool};flex-shrink:0}
.baq .qt{font-size:16.5px;line-height:1.42;color:${T.ink};font-family:${T.bodyFont}}
</style>
${metaHtml}
<div class="barow">
  ${panel(ba.before, 'warn')}
  <div class="baarrow">→</div>
  ${panel(ba.after, 'cool')}
</div>
<div class="bares">
  ${ba.result ? `<div class="col"><div class="rlbl">RESULT</div><div class="rtxt">${esc(ba.result)}</div></div>` : ''}
  ${quote && quote.text ? `<div class="col baq"><div class="bar"></div><div><div class="qt">&ldquo;${esc(quote.text)}&rdquo;</div>${quote.attribution ? srcLine(quote.attribution) : ''}</div></div>` : ''}
</div>`;
    }

    if (variant === 'evidence-stack' && Array.isArray(c.evidence) && c.evidence.length > 0) {
        const rows = c.evidence.slice(0, _caps.sub);
        const qFs = rows.length >= 4 ? 21 : 24;   // 4 rows = slightly smaller quotes
        return `<style>
.cssrc{font-family:${T.monoFont};font-weight:500;font-size:12.5px;letter-spacing:1px;color:${T.accentCool};text-transform:uppercase;margin-top:10px}
.eslbl{font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;margin-bottom:16px}
.esstack{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;gap:20px}
.esrow{display:flex;gap:28px;align-items:stretch}
.esrow .bar{width:4px;background:${T.accentCool};flex-shrink:0}
.esrow .qcol{flex:1;min-width:0}
.esrow .qt{font-size:${qFs}px;line-height:1.34;color:${T.ink};font-family:${T.bodyFont}}
.esrow .scol{width:440px;flex-shrink:0}
.esrow .slbl{font-family:${T.monoFont};font-weight:600;font-size:11.5px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;margin-bottom:8px}
.esrow .stxt{font-size:16.5px;line-height:1.42;color:${T.ink};font-family:${T.bodyFont}}
</style>
${metaHtml}
<div class="eslbl">CONVERGENT EVIDENCE</div>
<div class="esstack">
${rows.map((e: any) => `
  <div class="esrow">
    <div class="bar"></div>
    <div class="qcol">
      <div class="qt">&ldquo;${esc(e.quote)}&rdquo;</div>
      ${e.source ? srcLine(e.source) : ''}
    </div>
    ${e.shows ? `<div class="scol"><div class="slbl">WHAT IT SHOWS</div><div class="stxt">${esc(e.shows)}</div></div>` : ''}
  </div>`).join('')}
</div>`;
    }

    // four-block default - CHALLENGE / APPROACH / OUTCOME accent-bar blocks
    // left, KEY OUTCOME dark panel right. Legacy field aliases kept so older
    // emissions (intervention / applicability / transferability) still render.
    const approach = c.approach || c.intervention;
    const lessonText = c.applicability || c.transferability;
    const blocks: Array<{ label: string; text: string; accent: string; wash: string }> = [
        c.challenge && { label: 'CHALLENGE', text: c.challenge, accent: T.accentWarn, wash: T.washWarn },
        approach && { label: 'APPROACH', text: approach, accent: T.ink, wash: T.callout },
        c.outcome && { label: 'OUTCOME', text: c.outcome, accent: T.accentCool, wash: T.washCool },
        // LESSON is the 4th accent-bar block per the case-study/layout constraint.
        // NU uses the premium gold accent per the Figma exemplar (136:2).
        c.lesson && { label: 'LESSON', text: c.lesson, accent: T.gold, wash: T.paper },
    ].filter(Boolean) as any;
    const metrics: any[] = Array.isArray(c.supportingMetrics) ? c.supportingMetrics.slice(0, 4) : [];
    const comparables: any[] = Array.isArray(c.comparables) ? c.comparables.slice(0, 2) : [];
    const hasPanel = !!(c.keyMetric || metrics.length || c.pullQuote || comparables.length);
    return `<style>
.cssrc{font-family:${T.monoFont};font-weight:500;font-size:${SCALE.label}px;letter-spacing:1px;color:${T.accent};text-transform:uppercase;margin-top:8px}
.fbgrid{display:grid;grid-template-columns:${hasPanel ? '1.9fr 1fr' : '1fr'};gap:26px;flex:1;min-height:0}
.fbcol{display:flex;flex-direction:column;gap:12px;min-width:0}
.fbblk{flex:1;display:grid;grid-template-columns:152px 1fr;gap:20px;padding:16px 24px;border-left:6px solid;min-width:0}
.fbblk .lbl{font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2px;text-transform:uppercase}
.fbblk .txt{font-size:${SCALE.caption}px;line-height:1.45;color:${T.ink};font-family:${T.bodyFont}}
.fbpanel{background:${T.ink === '#16233C' ? '#16233C' : '#115054'};padding:24px 28px;display:flex;flex-direction:column;gap:18px;min-width:0;overflow:hidden}
.fbpanel .plbl{font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2.4px;text-transform:uppercase;color:${T.accent}}
.fbpanel .hero{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.subhead}px;line-height:1.14;color:#FFFFFF}
.fbpanel .herol{font-size:${SCALE.label}px;color:rgba(255,255,255,0.82);line-height:1.4;font-family:${T.bodyFont}}
.fbpanel .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;border-top:1px solid rgba(255,255,255,0.18);padding-top:16px}
.fbpanel .mv{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.name}px;line-height:1.05;color:${T.accent};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fbpanel .ml{font-size:${SCALE.label}px;color:rgba(255,255,255,0.72);margin-top:4px;line-height:1.35;font-family:${T.bodyFont}}
.fbpanel .cmp .cn{font-size:${SCALE.label}px;color:#FFFFFF;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:${T.bodyFont}}
.fbpanel .cmp .co{font-size:${SCALE.label}px;color:rgba(255,255,255,0.72);line-height:1.4;margin-top:2px;font-family:${T.bodyFont}}
.fbpanel .pq{border-top:1px solid rgba(255,255,255,0.18);padding-top:16px}
.fbpanel .pq .qt{font-size:16.5px;color:rgba(255,255,255,0.92);line-height:1.45;border-left:4px solid ${T.accent};padding-left:16px;font-family:${T.bodyFont}}
.fbpanel .pq .qs{font-family:${T.monoFont};font-size:${SCALE.label}px;color:${T.accent};margin-top:8px;padding-left:20px;letter-spacing:1px;text-transform:uppercase}
</style>
${metaHtml}
<div class="fbgrid">
  <div class="fbcol">
    ${blocks.map(b => `
    <div class="fbblk" style="border-left-color:${b.accent};background:${b.wash}">
      <div class="lbl" style="color:${b.accent}">${b.label}</div>
      <div class="txt">${esc(b.text)}</div>
    </div>`).join('')}
  </div>
  ${hasPanel ? `
  <aside class="fbpanel">
    ${c.keyMetric ? `<div><div class="plbl">KEY OUTCOME</div><div class="hero">${esc(c.keyMetric.value)}</div><div class="herol">${esc(c.keyMetric.label)}</div></div>` : ''}
    ${metrics.length > 0 ? `<div class="mgrid">${metrics.map((m: any) => `<div><div class="mv">${esc(m.value)}</div><div class="ml">${esc(m.label)}</div></div>`).join('')}</div>` : ''}
    ${comparables.length > 0 ? `<div class="cmp" style="border-top:1px solid rgba(255,255,255,0.18);padding-top:16px"><div class="plbl" style="margin-bottom:8px">COMPARABLES</div>${comparables.map((x: any) => `<div style="margin-bottom:8px"><div class="cn">${esc(x.name)}</div><div class="co">${esc(x.outcome)}</div></div>`).join('')}</div>` : ''}
    ${c.pullQuote && c.pullQuote.text ? `<div class="pq"><div class="qt">&ldquo;${esc(c.pullQuote.text)}&rdquo;</div><div class="qs">SOURCE: ${esc(c.pullQuote.attribution)}${c.pullQuote.role ? ', ' + esc(c.pullQuote.role) : ''}</div></div>` : ''}
  </aside>` : ''}
</div>
${lessonText && !c.takeaway && !c.lesson ? `<div style="margin-top:16px;font-size:${SCALE.caption}px;line-height:1.42;color:${T.ink};border-top:1px solid ${T.hair};padding-top:12px;font-family:${T.bodyFont}"><span style="font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;margin-right:12px">APPLICABILITY</span> ${esc(lessonText)}</div>` : ''}`;
}

// ---------------------------------------------------------------------------
// principles - N principle cards (name + description)
// ---------------------------------------------------------------------------

function renderPrinciples(slide: SlideDataLike, T: BrandTokens): string {

    // SLIDE-SYSTEM VARIANT: dark two-panel problem diptych (exactly 2 items).
    {
        const pd = slide.principles || {};
        const items: any[] = Array.isArray(pd.items) ? pd.items : [];
        if (pd.variant === 'diptych' && items.length >= 2) {
            const panels = items.slice(0, 2).map((it, i) => `
      <div class="dpp">
        <div class="dpbar"></div>
        <div class="dpnum">${String(i + 1).padStart(2, '0')}</div>
        <div class="dpname">${esc(trunc(it.name, 44))}</div>
        <div class="dpbody">${esc(trunc(it.description, 290))}</div>
      </div>`).join('');
            return `<style>
.dpwrap{display:grid;grid-template-columns:1fr 1fr;gap:40px;flex:1 1 auto;align-content:center;min-height:0}
.dpp{position:relative;background:${T.ink};padding:44px 48px;min-height:380px;overflow:hidden}
.dpp .dpbar{position:absolute;left:0;top:0;width:100%;height:4px;background:${T.accent}}
.dpp .dpnum{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:normal;color:${T.accent}}
.dpp .dpname{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.subhead}px;line-height:1.2;color:${T.paper};margin-top:8px}
.dpp .dpbody{font-size:${SCALE.body}px;line-height:1.46;color:${washHex(T.paper, 0.18)};margin-top:14px}
</style>
<div class="dpwrap">${panels}</div>`;
        }
    }
    const items: any[] = Array.isArray(slide.principles?.items) ? slide.principles.items.slice(0, _caps.items) : [];
    const cols = items.length >= 7 ? 4 : items.length >= 3 ? 3 : 2;
    const densePr = items.length >= 7;
    return `<style>
.pgrid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:${densePr ? 20 : 24}px;flex:1}
.pitem{border-top:3px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:10px}
.pitem .pidx{font-family:${T.monoFont};font-size:${densePr ? SCALE.label : SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase}
.pitem .pn{font-family:${T.displayFont};font-weight:600;font-size:${densePr ? SCALE.name : SCALE.subhead}px;line-height:1.1;color:${T.ink}}
.pitem .pd{font-size:${densePr ? SCALE.body : SCALE.name}px;line-height:1.45;color:${T.ink}}
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
    // SLIDE-SYSTEM VARIANT (2026-06-11, NU_Giving uplift; Figma GOLD slides
    // pages NU 103:2 / NXT 324:2): single-sentence thesis interstitial.
    if (d.variant === 'thesis') {
        return `<style>
.thwrap{flex:1;display:flex;flex-direction:column;justify-content:center}
.thesis{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.display}px;line-height:normal;color:${T.ink};max-width:1500px}
</style>
<div class="thwrap"><div class="thesis">${esc(trunc(d.title || slide.title, 110))}</div></div>`;
    }
    return `<style>
.sdwrap{flex:1;display:flex;flex-direction:column;justify-content:center}
.sdnum{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.display}px;line-height:1.24;color:${T.accent};margin-bottom:20px}
.sdtitle{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.display}px;line-height:1.2;color:${T.ink};margin-bottom:18px;max-width:1620px}
.sdsub{font-family:${T.bodyFont};font-size:${SCALE.subhead}px;line-height:1.4;color:${T.muted};max-width:1400px}
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
    // SLIDE-SYSTEM VARIANT: two-tier prose evidence table (NU_Giving s15).
    const prose: any[] = Array.isArray(m.rowsProse) ? m.rowsProse : [];
    if (prose.length >= 2) {
        const top = prose.filter((r: any) => r.tier !== 'second').slice(0, 3);
        const second = prose.filter((r: any) => r.tier === 'second').slice(0, 6);
        const mkTop = top.map((r: any) => `
      <div class="etrow top">
        <div class="etbar"></div>
        <div class="etn">${esc(trunc(r.name, 24))}</div>
        <div class="etp">${esc(trunc(r.prove, 110))}</div>
        <div class="eti">${esc(trunc(r.implication, 150))}</div>
        <div class="ete">${esc(trunc(r.evidenceTag || '', 26))}</div>
      </div>`).join('');
        const mkSec = second.map((r: any) => `
      <div class="etrow sec">
        <div></div>
        <div class="etn s">${esc(trunc(r.name, 24))}</div>
        <div class="etp s">${esc(trunc(r.prove, 110))}</div>
        <div class="eti s">${esc(trunc(r.implication, 120))}</div>
        <div class="ete">${esc(trunc(r.evidenceTag || '', 26))}</div>
      </div>`).join('');
        return `<style>
.ettbl{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}
.ethead{display:grid;grid-template-columns:8px 250px 1.05fr 1.15fr 200px;gap:20px;padding-bottom:10px;border-bottom:2px solid ${T.ink};font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;font-weight:600}
.etrow{display:grid;grid-template-columns:8px 250px 1.05fr 1.15fr 200px;gap:20px;align-items:start;padding:16px 0;border-bottom:1px solid ${T.hair}}
.etrow.top{background:${T.paper === '#FFFFFF' ? T.callout : '#FFFFFF'};padding:20px 0}
.etrow .etbar{width:4px;height:100%;background:${T.accent}}
.etrow .etn{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.lead}px;color:${T.ink};line-height:1.2}
.etrow .etn.s{font-size:${SCALE.body}px;font-family:${T.bodyFont};font-weight:600}
.etrow .etp{font-size:${SCALE.body}px;line-height:1.32;color:${T.accentWarn};font-weight:600}
.etrow .etp.s{font-size:${SCALE.caption}px;color:${T.ink};font-weight:400}
.etrow .eti{font-size:${SCALE.caption}px;line-height:1.32;color:${T.ink}}
.etrow .eti.s{font-size:${SCALE.label}px}
.etrow .ete{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.grey};text-transform:uppercase;line-height:1.3}
.etband{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:center;background:${T.ink};padding:18px 32px;margin-top:16px;flex-shrink:0}
.etband .ebl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:3px;color:${T.accent};text-transform:uppercase;font-weight:600}
.etband .ebt{font-size:${SCALE.body}px;line-height:1.36;color:${T.paper}}
</style>
<div class="ettbl">
  <div class="ethead"><div></div><div>Institution</div><div>What they prove</div><div>Implication</div><div>Evidence</div></div>
  ${mkTop}${mkSec}
</div>
${m.patternLine ? `<div class="etband"><div class="ebl">Pattern</div><div class="ebt">${esc(trunc(m.patternLine, 190))}</div></div>` : ''}`;
    }
    const cols: string[] = Array.isArray(m.columns) ? m.columns.slice(0, _caps.sub) : [];
    const rows: any[] = Array.isArray(m.rows) ? m.rows.slice(0, _caps.items) : [];
    const colDefs: string[] = Array.isArray(m.columnDefs) ? m.columnDefs : [];
    const denseCm = rows.length >= 9;
    const dotForScore = (s: number) => {
        if (s >= 4) return `<span class="dot full"></span>`;
        if (s >= 3) return `<span class="dot strong"></span>`;
        if (s >= 2) return `<span class="dot med"></span>`;
        return `<span class="dot low"></span>`;
    };
    // MERGED-FLOW CELLS (W2, 2026-06-11, GOLD competitive-dense exemplar
    // NU 198:57 / NXT 321:57): header name + definition and competitor name +
    // note each render as ONE text element with a line break (white-space:
    // pre-line). The export MEASURE walk then emits ONE text box per cell
    // instead of two stacked elements whose measured boxes collide in
    // PowerPoint - the th/def collision class from the user's 2026-06-11
    // deck slide 10. Type scale is the exemplar's; row count is absorbed by
    // the paginator (subject row repeats per page), never by shrinking.
    return `<style>
.cmtbl{width:100%;border-collapse:collapse;flex:1}
.cmtbl th, .cmtbl td{padding:${denseCm ? '9px 10px' : '14px 12px'};border-bottom:1px solid ${T.hair};text-align:left;vertical-align:top}
.cmtbl th{font-family:${T.monoFont};font-size:${denseCm ? SCALE.caption : SCALE.body}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-bottom:2px solid ${T.ink};font-weight:600}
.cmtbl th .hcell{white-space:pre-line;line-height:1.35}
.cmtbl td.name{font-family:${T.bodyFont};font-weight:600;font-size:${denseCm ? SCALE.lead : SCALE.name}px;color:${T.ink};min-width:200px}
.cmtbl td.name .ncell{white-space:pre-line;line-height:1.3}
.dot{display:inline-block;width:18px;height:18px;border-radius:50%}
.dot.full{background:${T.ink}}
.dot.strong{background:${T.accent}}
.dot.med{background:${T.accent2};opacity:0.6}
.dot.low{background:${T.hair}}
</style>
<table class="cmtbl">
  <thead>
    <tr>
      <th><div class="hcell">Competitor</div></th>
      ${cols.map((c, i) => `<th><div class="hcell">${esc(trunc(c, 36))}${colDefs[i] ? '\n' + esc(trunc(colDefs[i], 56)) : ''}</div></th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${rows.map(r => `
      <tr>
        <td class="name"><div class="ncell">${esc(trunc(r.name, 36))}${r.note ? '\n' + esc(trunc(r.note, 70)) : ''}</div></td>
        ${(r.scores || []).slice(0, cols.length).map((s: number) => `<td>${dotForScore(s)}</td>`).join('')}
      </tr>`).join('')}
  </tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// service-blueprint - stages with customer / frontstage / backstage / pain lanes
// ---------------------------------------------------------------------------

function renderServiceBlueprint(slide: SlideDataLike, T: BrandTokens): string {
    // 2026-06-11 - GOLD parity rewrite. The previous renderer read fields the
    // models never emit (s.pain) and had no SUPPORT/FAIL-POINTS lanes, so the
    // stage twin diverged from the web preview AND silently dropped painPoint
    // evidence from every export. Now mirrors the GoldFrame web twin exactly:
    // PHASE ink header / MOOD mono strip / CUSTOMER (warn-wash hero lane) /
    // FRONTSTAGE / BACKSTAGE / SUPPORT·DATA / FAIL POINTS (warn wash on
    // failPoint stages). All colors from BrandTokens; washes are SOLID brand
    // hexes (washWarn), never rgba, so the exporter needs no alpha.
    const stages: any[] = Array.isArray(slide.serviceBlueprint?.stages) ? slide.serviceBlueprint.stages.slice(0, Math.min(_caps.items || 4, 5)) : [];
    if (stages.length === 0) return `<p style="font-size:${SCALE.name}px">No blueprint stages.</p>`;
    const denseSb = stages.length >= 5;
    const cols = `${denseSb ? 130 : 150}px repeat(${stages.length}, 1fr)`;
    const cellFs = denseSb ? SCALE.caption : SCALE.body;
    const labelFs = denseSb ? 15 : 17;
    const moodColor = (e?: string): string => {
        const low = (e || '').toLowerCase();
        if (!low) return T.grey;
        if (/frustrat|angry|confus|disappoint|abandon|lost/.test(low)) return T.accentWarn;
        if (/delight|satisf|hope|excit|curious/.test(low)) return '#38A169';
        return T.accent;
    };
    const lanes: Array<{ key: string; label: string; hero?: boolean }> = [
        { key: 'customerAction', label: 'Customer', hero: true },
        { key: 'frontstage', label: 'Frontstage' },
        { key: 'backstage', label: 'Backstage' },
        { key: 'support', label: 'Support · Data' },
    ];
    const laneLabel = (txt: string, hero?: boolean, warn?: boolean) =>
        `<div class="sblbl${hero ? ' hero' : ''}${warn ? ' warn' : ''}">${esc(txt)}</div>`;
    const laneRow = (lane: { key: string; label: string; hero?: boolean }) =>
        laneLabel(lane.label, lane.hero)
        + stages.map(s => `<div class="sbc">${esc(s[lane.key] || '-')}</div>`).join('');
    return `<style>
.sbgold{display:grid;grid-template-columns:${cols};grid-template-rows:56px 40px ${lanes.map(() => 'minmax(80px,1fr)').join(' ')} minmax(96px,auto);flex:1;border:1px solid ${T.hair};overflow:hidden;color:${T.ink}}
.sbgold>div{border-top:1px solid ${T.hair};border-left:1px solid ${T.hair}}
.sbphase{background:${T.ink};color:${T.bandText};font-family:${T.bodyFont};font-weight:700;font-size:${cellFs + 3}px;padding:8px 14px;display:flex;align-items:center;border-top:none!important}
.sbphase.lbl{font-family:${T.monoFont};font-weight:600;font-size:${labelFs}px;letter-spacing:2px;text-transform:uppercase}
.sbmood{background:${T.callout};font-family:${T.monoFont};font-size:${labelFs}px;letter-spacing:0.5px;color:${T.ink};padding:4px 14px;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sbmood.lbl{color:${T.grey};font-weight:600;letter-spacing:2px;text-transform:uppercase}
.sbdot{width:13px;height:13px;border-radius:7px;flex:0 0 auto}
.sblbl{font-family:${T.monoFont};font-weight:700;font-size:${labelFs}px;letter-spacing:1.5px;color:${T.grey};text-transform:uppercase;padding:10px 14px;display:flex;align-items:center;line-height:1.3;background:${T.paper}}
.sblbl.hero{background:${T.washWarn};border-left:4px solid ${T.accentWarn}!important;color:${T.accentWarn}}
.sblbl.warn{background:${T.washWarn};color:${T.accentWarn}}
.sbc{padding:10px 14px;font-size:${cellFs}px;line-height:1.42;background:${T.paper};overflow:hidden}
.sbfail{padding:10px 14px;font-size:${cellFs}px;line-height:1.42;overflow:hidden}
.sbfailrule{border-top:3px solid ${T.accentWarn}!important}
</style>
<div class="sbgold">
  <div class="sbphase lbl">Phase</div>
  ${stages.map(s => `<div class="sbphase">${esc(s.phase || '')}</div>`).join('')}
  <div class="sbmood lbl">Mood</div>
  ${stages.map(s => `<div class="sbmood">${s.emotion ? `<span class="sbdot" style="background:${moodColor(s.emotion)}"></span>` : ''}<span>${esc([s.duration, s.emotion].filter(Boolean).join(' · ') || '-')}</span></div>`).join('')}
  ${lanes.map(laneRow).join('')}
  <div class="sblbl warn sbfailrule">Fail Points</div>
  ${stages.map(s => `<div class="sbfail sbfailrule" style="background:${s.failPoint ? T.washWarn : T.paper};color:${s.failPoint ? T.accentWarn : T.ink};font-weight:${s.failPoint ? 600 : 400}">${esc(s.painPoint || s.pain || '-')}</div>`).join('')}
</div>`;
}

// ---------------------------------------------------------------------------
// ORG CHART (#org) - 1920x1080 export twin of web.tsx OrgChartSlide and the
// Figma GOLD org frame (NU 178:3). The org chart IS the body: stacked TIER rows
// of evidence-cited node cards joined by a centered hairline drop; the decision-
// authority node carries an accent top border. CSS grid/flex only (graphic-
// collision ban). All colors from BrandTokens so NXT/NU skin from one renderer.
// ---------------------------------------------------------------------------

function renderOrgChart(slide: SlideDataLike, T: BrandTokens): string {
    const o: any = slide.orgChart || {};
    const tiers: any[] = Array.isArray(o.tiers) ? o.tiers.slice(0, Math.max(2, Math.min(_caps.items || 4, 5))) : [];
    if (tiers.length === 0) return `<p style="font-size:${SCALE.name}px">No org tiers.</p>`;
    const subCap = Math.max(1, Math.min(_caps.sub || 4, 5));
    const card = (n: any) => `
      <div class="ocard${n && n.emphasis ? ' emph' : ''}">
        <div class="octitle">${esc(trunc(n?.title || '', 60))}</div>
        <div class="ocrole">${esc(trunc(n?.role || '', 150))}</div>
        <div class="ocspacer"></div>
        ${n?.source ? `<div class="ocsrc">SOURCE: ${esc(trunc(String(n.source).toUpperCase(), 40))}</div>` : ''}
      </div>`;
    const tierRow = (tier: any, i: number) => {
        const nodes: any[] = Array.isArray(tier?.nodes) ? tier.nodes.slice(0, subCap) : [];
        return `
        <div class="otier">
          <div class="olabel">${esc(trunc(tier?.label || '', 26))}</div>
          <div class="onodes">${nodes.map(card).join('')}</div>
        </div>
        ${i < tiers.length - 1 ? '<div class="oconn"><div class="oline"></div></div>' : ''}`;
    };
    return `<style>
.ogold{display:flex;flex-direction:column;flex:1;min-height:0;font-family:${T.bodyFont};color:${T.ink}}
.otier{display:flex;align-items:stretch;gap:18px;flex:1;min-height:0}
.olabel{flex:0 0 150px;width:150px;padding-top:18px;font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:1.5px;color:${T.grey};text-transform:uppercase;line-height:1.35}
.onodes{flex:1;min-width:0;display:flex;gap:18px}
.ocard{flex:1;min-width:0;background:${T.callout};border:1px solid ${T.hair};padding:16px 20px;display:flex;flex-direction:column;gap:6px;overflow:hidden}
.ocard.emph{border-top:4px solid ${T.accent}}
.octitle{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.body}px;line-height:1.15;color:${T.ink}}
.ocrole{font-family:${T.bodyFont};font-size:${SCALE.label}px;line-height:1.42;color:${T.ink}}
.ocspacer{flex:1;min-height:0}
.ocsrc{font-family:${T.monoFont};font-weight:400;font-size:${SCALE.label}px;letter-spacing:0.5px;color:${T.accentCool};text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.oconn{height:28px;display:flex;justify-content:center;flex:0 0 28px}
.oline{width:2px;height:100%;background:${T.hair}}
</style>
<div class="ogold">${tiers.map(tierRow).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// EXECUTIVE BRIEF (#brief / #explainer / #report) - 1920x1080 export twin of
// web.tsx ExecutiveBriefSlide. One template, three variants. Brand-token skinned.
// ---------------------------------------------------------------------------

function renderExecutiveBrief(slide: SlideDataLike, T: BrandTokens): string {
    const d: any = slide.executiveBrief || {};
    const variant: string = d.variant || 'brief';
    const sections: any[] = Array.isArray(d.sections) ? d.sections.slice(0, Math.max(2, Math.min(_caps.items || 4, 6))) : [];
    if (sections.length === 0 && !d.hero) return `<p style="font-size:${SCALE.name}px">No brief content.</p>`;
    const gotchas: string[] = variant === 'explainer' && Array.isArray(d.gotchas) ? d.gotchas.slice(0, Math.min(_caps.sub || 4, 6)) : [];
    const cols = sections.length <= 2 ? 1 : 2;
    const stepped = variant === 'explainer';
    const heroHtml = (d.hero?.stat && variant !== 'explainer')
        ? `<div class="ebhero"><span class="ebhv">${esc(trunc(d.hero.stat, 40))}</span><span class="ebhl">${esc(trunc(d.hero.label, 70))}</span></div>`
        : '';
    const card = (s: any, i: number) => `
      <div class="ebcard">
        <div class="ebhead">${stepped ? `<span class="ebnum">${String(i + 1).padStart(2, '0')}</span>` : ''}<span class="ebh">${esc(trunc(s.heading || '', 64))}</span></div>
        <div class="ebbody">${esc(trunc(s.body || '', 240))}</div>
        ${s.evidence?.quote ? `<div class="ebq"><div class="ebqt">“${esc(trunc(s.evidence.quote, 150))}”</div><div class="ebqs">${esc(trunc(s.evidence.source || '', 44))}</div></div>` : ''}
      </div>`;
    const gotchasHtml = gotchas.length
        ? `<div class="ebgot"><div class="ebgl">Gotchas</div>${gotchas.map(g => `<div class="ebgi">• ${esc(trunc(g, 120))}</div>`).join('')}</div>`
        : '';
    return `<style>
.ebgold{display:flex;flex-direction:column;flex:1;min-height:0;gap:18px;font-family:${T.bodyFont};color:${T.ink}}
.ebhero{display:flex;align-items:baseline;gap:20px;background:${T.callout};border-left:6px solid ${T.accent};padding:18px 26px}
.ebhv{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.subhead}px;line-height:1;color:${T.ink}}
.ebhl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;text-transform:uppercase;color:${T.grey}}
.ebgrid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px}
.ebcard{background:${T.callout};border:1px solid ${T.hair};padding:18px 22px;display:flex;flex-direction:column;gap:8px;overflow:hidden}
.ebhead{display:flex;align-items:baseline;gap:12px}
.ebnum{font-family:${T.monoFont};font-weight:700;font-size:${SCALE.caption}px;color:${T.accent}}
.ebh{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.lead}px;line-height:1.15;color:${T.ink}}
.ebbody{font-family:${T.bodyFont};font-size:${SCALE.label}px;line-height:1.45;color:${T.ink}}
.ebq{margin-top:auto;border-left:3px solid ${T.accentCool};padding-left:12px}
.ebqt{font-family:${T.titleFont};${T.titleFont.includes('Lora') ? 'font-style:italic;' : ''}font-size:${SCALE.label}px;line-height:1.4;color:${T.ink}}
.ebqs{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:0.5px;text-transform:uppercase;color:${T.accentCool};margin-top:3px}
.ebgot{background:${T.washWarn};border-left:6px solid ${T.accentWarn};padding:14px 24px}
.ebgl{font-family:${T.monoFont};font-weight:700;font-size:${SCALE.label}px;letter-spacing:2px;text-transform:uppercase;color:${T.accentWarn};margin-bottom:6px}
.ebgi{font-family:${T.bodyFont};font-size:${SCALE.label}px;line-height:1.4;color:${T.ink}}
</style>
<div class="ebgold">${heroHtml}<div class="ebgrid">${sections.map(card).join('')}</div>${gotchasHtml}</div>`;
}

// ---------------------------------------------------------------------------
// journey-map (#journey) - GOLD actor-lane journey matrix (2026-06-11)
// Twin of the Figma GOLD journey exemplars (NU 53:159 / T3 156:2, NXT 75:2)
// and the web JourneyMapSlide. Stages x ACTOR lanes, ONE critical stage
// accented, "not engaged" greyed, PAIN POINTS row, optional dashboard + KPI
// tiles. NOT the Bitner blueprint (renderServiceBlueprint owns #blueprint).
// ---------------------------------------------------------------------------

// 2026-06-12 USER FEEDBACK REDESIGN: the journey matrix IS the slide body.
// Personas, pain points, and strategic opportunities live INSIDE the table
// (voice row / stacked per-phase pain cells / opportunities row), never as
// dashboard text columns stacked on top. KPI tiles embed in their phase
// header cells. Phase-arc distribution: ordered arrays (personas,
// overallPainPoints, opportunities, kpiTiles) spread start->end across the
// phase columns, matching the journey arc.
function _spreadByArc(count: number, nCols: number): number[] {
    // Column index for item i of count, spread evenly across nCols.
    if (count <= 0) return [];
    if (count === 1) return [0];
    return Array.from({ length: count }, (_, i) =>
        Math.min(nCols - 1, Math.round((i * (nCols - 1)) / (count - 1))));
}

function renderJourneyMap(slide: SlideDataLike, T: BrandTokens): string {
    const d: any = (slide as any).journeyMap || {};
    const capItems = Math.max(3, _caps.items || 5);
    const capLanes = Math.max(2, _caps.sub || 3);
    const stagesRaw: any[] = Array.isArray(d.stages) ? d.stages.slice(0, capItems) : [];
    const stages = stagesRaw.map(s => typeof s === 'string' ? { name: s, critical: false } : (s || {}));
    const lanes: any[] = (Array.isArray(d.lanes) ? d.lanes : []).slice(0, capLanes);
    if (stages.length === 0 || lanes.length === 0) return `<p style="font-size:${SCALE.name}px">No journey stages.</p>`;
    const n = stages.length;
    const dense = n >= 6;
    const cellFs = dense ? SCALE.label : SCALE.caption;
    const labelFs = dense ? 13 : 15;
    const gridCols = `${dense ? 180 : 210}px repeat(${n}, 1fr)`;
    const ghost = (txt: string) => /^not engaged$/i.test((txt || '').trim()) || !(txt || '').trim();

    // Per-phase pains: painPoints[si] may be a string OR string[] (>=3 per
    // phase per user feedback fb_1781292121810). overallPainPoints distribute
    // by arc and APPEND into their phase's stack - same row, same context.
    const painsRaw: any[] = Array.isArray(d.painPoints) ? d.painPoints : [];
    const painCols: string[][] = stages.map((_: any, si: number) => {
        const v = painsRaw[si];
        return Array.isArray(v) ? v.filter(Boolean).map((x: any) => stripInlineSource(String(x))) : (v ? [stripInlineSource(String(v))] : []);
    });
    const overall: string[] = (Array.isArray(d.overallPainPoints) ? d.overallPainPoints : []).filter(Boolean).map((s: any) => stripInlineSource(String(s)));
    _spreadByArc(overall.length, n).forEach((col, i) => painCols[col].push(overall[i]));

    // Personas (JTBD voice) + opportunities distribute by arc into their rows.
    const personas: string[] = (Array.isArray(d.personas) ? d.personas : []).filter(Boolean).map(String);
    const voiceCols: string[][] = stages.map(() => []);
    _spreadByArc(personas.length, n).forEach((col, i) => voiceCols[col].push(personas[i]));
    const opps: string[] = (Array.isArray(d.opportunities) ? d.opportunities : []).filter(Boolean).map((s: any) => stripInlineSource(String(s)));
    const oppCols: string[][] = stages.map(() => []);
    _spreadByArc(opps.length, n).forEach((col, i) => oppCols[col].push(opps[i]));

    // KPI tiles embed under their phase header name (arc-distributed).
    const tiles: any[] = (Array.isArray(d.kpiTiles) ? d.kpiTiles : []).slice(0, 3);
    const tileByCol: any[] = stages.map(() => null);
    _spreadByArc(tiles.length, n).forEach((col, i) => { tileByCol[col] = tiles[i]; });

    // Per-phase illustration thumbnails (illustrator-agent output for the journey
    // img-slots, wiki/brand/image-slots/minor-pages-and-journey-variants.md).
    // phaseImages[] aligns to stages[]; stage.image is an alternative carrier.
    // EMPTY-STATE GUARD: when NO phase carries an image the thumbnail row is
    // omitted entirely and the matrix renders byte-identical to the
    // pre-illustration layout (no regression on the >99% of journeys with no art).
    const phaseImages: string[] = Array.isArray(d.phaseImages) ? d.phaseImages : [];
    const imgFor = (si: number): string => {
        const direct = phaseImages[si];
        const raw = stagesRaw[si];
        const onStage = raw && typeof raw === 'object' ? (raw as any).image : '';
        return String(direct || onStage || '').trim();
    };
    const hasImages = stages.some((_: any, si: number) => !!imgFor(si));

    const hasVoice = personas.length > 0;
    const hasPains = painCols.some(c => c.length > 0);
    const hasOpps = opps.length > 0;
    const hasTiles = tiles.length > 0;
    // FULL-PAYLOAD FIT: when voice + stacked pains + opportunities are ALL
    // present the matrix carries 7+ content rows; count-adaptive type +
    // tighter char budgets keep the grid inside the 1080 stage (geometry
    // audit 2026-06-12 caught a 0.15in overflow on the first full payload).
    const full = hasVoice && hasOpps && painCols.some(c => c.length >= 3);
    const fs = clampMin(full ? cellFs - 2 : cellFs);
    // Budgets match the SLIDE OUTPUT PROTOCOL's per-field summarization
    // targets (pain <= 80, cell <= 100, persona <= 95, opportunity <= 85) plus
    // ~15% slack so a model that wrote to spec is NEVER cut; trunc() is
    // clause-aware and ellipsis-free for anything beyond.
    const painBudget = full ? 92 : (dense ? 92 : 100);
    const cellBudget = full ? 115 : (dense ? 115 : 125);

    const rowTemplate = [
        hasTiles ? 'minmax(86px,auto)' : 'minmax(52px,auto)',                 // header (+embedded signal)
        ...(hasImages ? [dense ? 'minmax(84px,auto)' : 'minmax(104px,auto)'] : []), // phase illustration thumbnails
        ...(hasVoice ? ['minmax(58px,auto)'] : []),                            // persona voice
        ...lanes.map(() => 'minmax(64px,1fr)'),                                // actor lanes
        ...(hasPains ? ['minmax(64px,auto)'] : []),                            // stacked pains
        ...(hasOpps ? ['minmax(58px,auto)'] : []),                             // opportunities
    ].join(' ');

    return `<style>
.jmgrid{flex:1;min-height:0;display:grid;grid-template-columns:${gridCols};grid-template-rows:${rowTemplate};border:1px solid ${T.hair};overflow:hidden}
.jmgrid>div{border-top:1px solid ${T.hair};border-left:1px solid ${T.hair}}
.jmh{background:${T.ink};color:#FFFFFF;font-family:${T.monoFont};font-weight:700;font-size:${labelFs}px;letter-spacing:1.5px;text-transform:uppercase;padding:8px 16px;display:flex;flex-direction:column;justify-content:center;gap:3px;border-top:none!important}
.jmh.crit{background:${T.accentWarn}}
.jmh .sig{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${dense ? SCALE.lead : SCALE.name}px;line-height:1.05;text-transform:none;letter-spacing:0;color:#FFFFFF}
.jmh .siglbl{font-family:${T.monoFont};font-weight:600;font-size:${SCALE.label}px;letter-spacing:2px;color:${T.accent};text-transform:uppercase}
.jmanchor{padding:8px 16px;background:${T.paper};display:flex;flex-direction:column;justify-content:center;gap:2px}
.jmanchor .actor{font-family:${T.bodyFont};font-weight:700;font-size:${labelFs + 1}px;color:${T.ink};text-transform:uppercase;letter-spacing:0.5px;line-height:1.2}
.jmanchor .role{font-family:${T.monoFont};font-size:${SCALE.label}px;color:${T.grey};line-height:1.3}
${hasImages ? `.jmthumb{background:${T.paper};display:flex;align-items:center;justify-content:center;padding:6px;overflow:hidden}
.jmthumb img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block}` : ''}
.jmanchor.voice .actor{color:${T.accentCool}}
.jmanchor.pain .actor{color:${T.accentWarn}}
.jmanchor.opp .actor{color:${T.accentCool}}
.jmv{padding:${full ? 5 : 7}px 14px;background:${washHex(T.callout, 0.5)};font-family:${T.bodyFont};font-size:${fs - 1}px;line-height:${full ? 1.3 : 1.36};font-style:italic;color:${T.ink};overflow:hidden}
.jmc{padding:${full ? 6 : 8}px 14px;font-family:${T.bodyFont};font-size:${fs}px;line-height:${full ? 1.3 : 1.36};color:${T.ink};background:${washHex(T.callout, 0.33)};overflow:hidden}
.jmc.ghost{color:${T.grey};font-style:italic}
.jmp{padding:${full ? 5 : 7}px 14px;border-top:3px solid ${T.accentWarn}!important;background:${T.paper};overflow:hidden;display:flex;flex-direction:column;gap:4px}
.jmp .pi{font-family:${T.bodyFont};font-size:${fs - 2}px;line-height:${full ? 1.26 : 1.32};color:${T.accentWarn};padding-left:12px;position:relative}
.jmp .pi::before{content:'';position:absolute;left:0;top:6px;width:6px;height:6px;background:${T.accentWarn}}
.jmo{padding:${full ? 5 : 7}px 14px;border-top:3px solid ${T.accentCool}!important;background:${washHex(T.callout, 0.4)};overflow:hidden;display:flex;flex-direction:column;gap:4px}
.jmo .oi{font-family:${T.bodyFont};font-size:${fs - 2}px;line-height:${full ? 1.26 : 1.32};color:${T.ink};padding-left:12px;position:relative}
.jmo .oi::before{content:'';position:absolute;left:0;top:6px;width:6px;height:6px;background:${T.accentCool}}
</style>
<div class="jmgrid">
  <div class="jmh"></div>
  ${stages.map((st: any, si: number) => {
        const t = tileByCol[si];
        return `<div class="jmh${st.critical ? ' crit' : ''}">
      <div>${esc(trunc(st.name, 24))}</div>
      ${t ? `<div class="siglbl">${esc(trunc(t.label, 26))}</div><div class="sig">${esc(trunc(t.value, 22))}</div>` : ''}
    </div>`;
    }).join('')}
  ${hasImages ? `
    <div class="jmanchor"></div>
    ${stages.map((_: any, si: number) => {
        const src = imgFor(si);
        return `<div class="jmthumb">${src ? `<img src="${esc(src)}" alt="" loading="lazy"/>` : ''}</div>`;
    }).join('')}` : ''}
  ${hasVoice ? `
    <div class="jmanchor voice"><div class="actor">Personas</div><div class="role">JTBD voice</div></div>
    ${voiceCols.map(items => `<div class="jmv">${items.map(p => `&ldquo;${esc(trunc(p, cellBudget))}&rdquo;`).join('<br/>')}</div>`).join('')}` : ''}
  ${lanes.map((lane: any) => `
    <div class="jmanchor"><div class="actor">${esc(trunc(lane.actor, 26))}</div>${lane.role ? `<div class="role">${esc(trunc(lane.role, 34))}</div>` : ''}</div>
    ${stages.map((_: any, si: number) => {
        const txt = (lane.cells || [])[si] || '';
        return `<div class="jmc${ghost(txt) ? ' ghost' : ''}">${esc(trunc(txt || 'not engaged', cellBudget))}</div>`;
    }).join('')}
  `).join('')}
  ${hasPains ? `
    <div class="jmanchor pain" style="border-top:3px solid ${T.accentWarn}"><div class="actor">Pain points</div></div>
    ${painCols.map(items => `<div class="jmp">${items.slice(0, 4).map(p => `<div class="pi">${esc(trunc(p, painBudget))}</div>`).join('')}</div>`).join('')}` : ''}
  ${hasOpps ? `
    <div class="jmanchor opp" style="border-top:3px solid ${T.accentCool}"><div class="actor">Opportunities</div></div>
    ${oppCols.map(items => `<div class="jmo">${items.map(o => `<div class="oi">${esc(trunc(o, painBudget + 12))}</div>`).join('')}</div>`).join('')}` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// gap-matrix - capability gap analysis (current vs target maturity)
// ---------------------------------------------------------------------------

function renderGapMatrix(slide: SlideDataLike, T: BrandTokens): string {
    const gaps: any[] = Array.isArray(slide.gapMatrix?.gaps) ? slide.gapMatrix.gaps.slice(0, _caps.items) : [];
    const scaleMax: number = slide.gapMatrix?.scaleMax || 5;
    const denseGm = gaps.length >= 9;
    const sevColor: Record<string, string> = {
        critical: T.accentWarn, high: T.accentWarn, medium: T.gold, low: T.muted,
    };
    const bar = (lvl: number) => {
        const pct = Math.round((lvl / scaleMax) * 100);
        return `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>`;
    };
    return `<style>
.gmtbl{width:100%;border-collapse:collapse;flex:1}
.gmtbl th,.gmtbl td{padding:${denseGm ? '7px 8px' : '12px 10px'};border-bottom:1px solid ${T.hair};vertical-align:top;text-align:left}
.gmtbl th{font-family:${T.monoFont};font-size:${denseGm ? SCALE.label : SCALE.body}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-bottom:2px solid ${T.ink};font-weight:600}
.gmtbl td.cap{font-family:${T.bodyFont};font-weight:600;font-size:${denseGm ? SCALE.lead : SCALE.name}px;color:${T.ink};min-width:240px}
.bar{width:160px;height:${denseGm ? 11 : 14}px;background:${T.hair};position:relative;overflow:hidden}
.bar .fill{height:100%;background:${T.accent}}
.gmtbl td.sev{font-family:${T.monoFont};font-size:${denseGm ? SCALE.label : SCALE.body}px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}
.gmtbl td.imp{font-size:${denseGm ? SCALE.body : SCALE.lead}px;line-height:1.4;color:${T.ink}}
</style>
<table class="gmtbl">
  <thead><tr><th>Capability</th><th>Current</th><th>Target</th><th>Severity</th><th>Impact</th></tr></thead>
  <tbody>
    ${gaps.map(g => `
      <tr>
        <td class="cap">${esc(g.capability)}</td>
        <td>${bar(g.currentMaturity)}<div style="font-family:${T.monoFont};font-size:${SCALE.caption}px;color:${T.muted};margin-top:3px">L${g.currentMaturity}/${scaleMax}</div></td>
        <td>${bar(g.targetMaturity)}<div style="font-family:${T.monoFont};font-size:${SCALE.caption}px;color:${T.muted};margin-top:3px">L${g.targetMaturity}/${scaleMax}</div></td>
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
    if (layers.length === 0) return `<p style="font-size:${SCALE.name}px">No architecture layers.</p>`;
    // 2026-06-16 COLLISION FIX: layers were `flex:1` (forced EQUAL vertical bands) with wrap-flow
    // nodes + align-items:center -> a content-heavy layer's wrapped nodes overflowed its equal band
    // and OVERLAPPED the next layer (labels + cards colliding, overrunning the flow band). Fix:
    // layers size to CONTENT (no flex:1, align to start) so the flex column stacks them with a gap
    // and they CANNOT overlap; count-adaptive compaction keeps dense decks inside the 1080 canvas.
    const nodeTotal = layers.reduce((s, l) => s + Math.min((l.nodes || []).length, _caps.sub), 0);
    const dense = nodeTotal > 9 || layers.length >= 5;
    const nPad = dense ? '6px 11px' : '8px 14px';
    const nMin = dense ? 132 : 160;
    const nName = dense ? SCALE.body : SCALE.lead;
    const lGap = dense ? 9 : 14;
    const lblSize = dense ? SCALE.name : SCALE.subhead;
    return `<style>
.amwrap{display:flex;flex-direction:column;gap:${lGap}px;flex:1;min-height:0;justify-content:flex-start}
.amlayer{display:grid;grid-template-columns:200px 1fr;gap:14px;border-top:2px solid ${T.accent};padding-top:8px;align-items:start;flex-shrink:0}
.amlname{font-family:${T.displayFont};font-size:${lblSize}px;line-height:1.1;color:${T.ink};text-transform:uppercase;letter-spacing:0.5px;align-self:start;overflow-wrap:anywhere}
.amnodes{display:flex;flex-wrap:wrap;gap:${dense ? 8 : 10}px;align-content:start}
.amnode{background:${T.callout};border-left:3px solid ${T.accent2};padding:${nPad};font-size:${nName}px;line-height:1.25;min-width:${nMin}px}
.amnode .nn{font-weight:600;color:${T.ink}}
.amnode .nt{font-family:${T.monoFont};font-size:${SCALE.caption}px;letter-spacing:1px;color:${T.muted};text-transform:uppercase;margin-top:2px}
.amnode .nd{font-size:${SCALE.body}px;color:${T.muted};margin-top:4px;line-height:1.4}
.amflow{margin-top:14px;font-size:${SCALE.name}px;line-height:1.45;color:${T.ink};background:${T.callout};padding:14px 18px;border-left:4px solid ${T.accent2}}
.amflow span{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
</style>
<div class="amwrap">
  ${layers.map(l => `
    <div class="amlayer">
      <div class="amlname">${esc(l.name)}</div>
      <div class="amnodes">
        ${(l.nodes || []).slice(0, _caps.sub).map((n: any) => `
          <div class="amnode">
            <div class="nn">${esc(n.name)}</div>
            ${n.type ? `<div class="nt">${esc(n.type)}</div>` : ''}
            ${n.description ? `<div class="nd">${esc(n.description)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`).join('')}
  ${flow ? `<div class="amflow"><span>Flow</span> ${esc(flow)}</div>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// prd-feature - MoSCoW-priority feature cards with user story + AC
// ---------------------------------------------------------------------------

function renderPrdFeature(slide: SlideDataLike, T: BrandTokens): string {
    const features: any[] = Array.isArray(slide.prdFeature?.features) ? slide.prdFeature.features.slice(0, _caps.items) : [];
    // DENSE STRUCTURAL LAYOUT (W2, 2026-06-11): deep features (user story +
    // 3+ acceptance criteria) route to the prd-dense GOLD exemplar (Figma NU
    // 199:50 / NXT 322:50) - two full-depth cards per slide. The W0 paginator
    // already splits deep payloads at 2/slide, so this branch IS the deep
    // rendering path.
    const isDeep = (f: any) => !!f.userStory && Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length >= 3;
    if (features.length > 0 && features.length <= 2 && features.some(isDeep)) {
        return renderPrdFeatureDense(features, T);
    }
    const priColor: Record<string, string> = {
        must: T.accent, should: T.accent2, could: T.muted, wont: T.grey,
    };
    const cols = features.length >= 5 ? 3 : features.length >= 3 ? 2 : 1;
    const denseFt = features.length >= 5;
    return `<style>
.fgrid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:${denseFt ? 20 : 24}px;flex:1}
.feat{border-top:3px solid ${T.accent};padding-top:14px;display:flex;flex-direction:column;gap:${denseFt ? 8 : 10}px}
.feat .fhead{display:flex;justify-content:space-between;align-items:baseline;gap:14px}
.feat .fn{font-family:${T.displayFont};font-weight:600;font-size:${denseFt ? SCALE.name : SCALE.subhead}px;line-height:1.1;color:${T.ink}}
.feat .fpri{font-family:${T.monoFont};font-size:${denseFt ? SCALE.label : SCALE.body}px;letter-spacing:2px;text-transform:uppercase;font-weight:700;padding:4px 10px;color:${T.ink};border:2px solid currentColor}
.feat .fps{font-size:${denseFt ? SCALE.body : SCALE.lead}px;line-height:1.5;color:${T.ink}}
.feat .fst{font-size:${denseFt ? SCALE.body : SCALE.lead}px;line-height:1.5;font-style:italic;color:${T.ink};border-left:3px solid ${T.accent2};padding:6px 12px;background:${T.callout}}
.feat .faclbl{font-family:${T.monoFont};font-size:${denseFt ? SCALE.label : SCALE.caption}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;font-weight:600;margin-top:4px}
.feat ul{list-style:none;display:flex;flex-direction:column;gap:${denseFt ? 4 : 6}px}
.feat li{font-size:${denseFt ? SCALE.body : SCALE.lead}px;line-height:1.4;color:${T.ink};padding-left:14px;position:relative}
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
      <ul>${f.acceptanceCriteria.slice(0, _caps.sub).map((ac: string) => `<li>${esc(ac)}</li>`).join('')}</ul>` : ''}
  </div>`).join('')}
</div>`;
}

/** prd-feature DENSE twin of the GOLD exemplar (NU 199:50 / NXT 322:50):
 *  two full-depth feature cards - ink top border, numeral + name + priority
 *  chip, USER STORY italic, ACCEPTANCE CRITERIA square-tick rows, hairline
 *  footer with technical / stakeholder mono lines. */
function renderPrdFeatureDense(features: any[], T: BrandTokens): string {
    const cards = features.slice(0, 2).map((f, i) => {
        const crit: string[] = Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria.slice(0, 5) : [];
        const footer: string[] = [];
        if (f.technicalDetails) footer.push(trunc(f.technicalDetails, 76));
        if (f.stakeholders) footer.push(trunc(`Stakeholders: ${f.stakeholders}`, 76));
        return `
      <div class="pdc">
        <div class="pdh">
          <div class="pdn">${String(i + 1).padStart(2, '0')}</div>
          <div class="pdt">${esc(trunc(f.name, 44))}</div>
          <div class="pdp">${esc(trunc(f.priority || 'must', 12))}</div>
        </div>
        ${f.problemSolved ? `<div class="pdps">${esc(trunc(f.problemSolved, 130))}</div>` : ''}
        ${f.userStory ? `<div class="pdl">User story</div><div class="pdst">${esc(trunc(f.userStory, 230))}</div>` : ''}
        ${crit.length > 0 ? `<div class="pdl">Acceptance criteria</div>
        <div class="pdac">${crit.map(c => `<div class="pdai"><span></span><p>${esc(trunc(c, 105))}</p></div>`).join('')}</div>` : ''}
        ${footer.length > 0 ? `<div class="pdf">${footer.map(t => `<div>${esc(t)}</div>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
    return `<style>
.pdg{display:grid;grid-template-columns:${features.length >= 2 ? '1fr 1fr' : '1fr'};gap:30px;flex:1 1 auto;min-height:0}
.pdc{border-top:3px solid ${T.ink};padding:24px 28px 20px 0;display:flex;flex-direction:column;gap:13px;min-height:0;overflow:hidden}
.pdh{display:flex;align-items:center;gap:18px}
.pdh .pdn{font-family:${T.displayFont};font-weight:600;font-size:${SCALE.subhead}px;line-height:normal;color:${T.accent}}
.pdh .pdt{font-family:${T.titleFont};font-weight:${T.titleWeight};font-size:${SCALE.name}px;line-height:1.15;color:${T.ink};flex:1;min-width:0}
.pdh .pdp{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;text-transform:uppercase;font-weight:600;padding:6px 13px;background:${T.ink};color:${T.paper};flex-shrink:0}
.pdps{font-size:${SCALE.body}px;line-height:1.42;color:${T.ink}}
.pdl{font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:2px;color:${T.grey};text-transform:uppercase;font-weight:600}
.pdst{font-size:${SCALE.body}px;line-height:1.5;color:${T.ink};font-style:italic}
.pdac{display:flex;flex-direction:column;gap:9px}
.pdai{display:grid;grid-template-columns:14px 1fr;gap:11px;align-items:start}
.pdai span{width:9px;height:9px;background:${T.accentCool};margin-top:8px;display:block}
.pdai p{font-size:${SCALE.caption}px;line-height:1.42;color:${T.ink}}
.pdf{margin-top:auto;border-top:1px solid ${T.hair};padding-top:11px;display:flex;flex-direction:column;gap:4px;font-family:${T.monoFont};font-size:${SCALE.label}px;letter-spacing:1px;color:${T.grey};text-transform:uppercase}
</style>
<div class="pdg">${cards}</div>`;
}

// ---------------------------------------------------------------------------
// systems-inventory - system rows (name + category + status + risk)
// ---------------------------------------------------------------------------

function renderSystemsInventory(slide: SlideDataLike, T: BrandTokens): string {
    const systems: any[] = Array.isArray(slide.systemsInventory?.systems) ? slide.systemsInventory.systems.slice(0, _caps.items) : [];
    const insight: string = slide.systemsInventory?.insight || '';
    const denseSi = systems.length >= 12;
    const statusColor: Record<string, string> = {
        current: T.accent, legacy: T.muted, deprecated: T.accentWarn, planned: T.accent2,
    };
    const riskColor: Record<string, string> = {
        critical: T.accentWarn, high: T.accentWarn, medium: T.gold, low: T.muted,
    };
    return `<style>
.sitbl{width:100%;border-collapse:collapse}
.sitbl th,.sitbl td{padding:${denseSi ? '7px 8px' : '11px 10px'};border-bottom:1px solid ${T.hair};text-align:left;vertical-align:top}
.sitbl th{font-family:${T.monoFont};font-size:${denseSi ? SCALE.label : SCALE.body}px;letter-spacing:1.5px;color:${T.muted};text-transform:uppercase;border-bottom:2px solid ${T.ink};font-weight:600}
.sitbl td.sn{font-family:${T.bodyFont};font-weight:600;font-size:${denseSi ? SCALE.body : SCALE.name}px;color:${T.ink};min-width:200px}
.sitbl td.sc{font-family:${T.monoFont};font-size:${denseSi ? SCALE.label : SCALE.body}px;letter-spacing:1px;color:${T.muted};text-transform:uppercase}
.sitbl td.ss{font-family:${T.monoFont};font-size:${denseSi ? SCALE.label : SCALE.body}px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}
.sitbl td.sd{font-size:${denseSi ? SCALE.body : SCALE.lead}px;line-height:1.4;color:${T.ink}}
.insight{margin-top:14px;font-size:${SCALE.name}px;line-height:1.45;color:${T.ink};background:${T.callout};padding:14px 18px;border-left:4px solid ${T.accent}}
.insight span{font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;margin-right:8px;font-weight:600}
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
${insight ? `<div class="insight"><span>Insight</span> ${esc(insight)}</div>` : ''}`;
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
.sub{font-size:${SCALE.subhead}px;color:${T.muted};margin-bottom:24px}
.body{font-size:${SCALE.name}px;line-height:1.55;color:${T.ink};max-width:1620px;margin-bottom:24px}
ul{list-style:none;display:flex;flex-direction:column;gap:10px;max-width:1620px}
li{font-size:${SCALE.name}px;line-height:1.45;color:${T.ink};padding-left:18px;position:relative}
li::before{content:'';position:absolute;left:0;top:9px;width:8px;height:8px;background:${T.accent}}
.note{margin-top:24px;font-family:${T.monoFont};font-size:${SCALE.body}px;letter-spacing:2px;color:${T.muted};text-transform:uppercase;border-top:1px solid ${T.hair};padding-top:12px}
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

    // SLIDES-deck archetype system (Figma 609): `template=slides:<archetype>` is COMPOSED from the
    // registry spec by slideComposer (Method A - no per-archetype renderX), the way #proto composes
    // from its component manifest. The `slides:` namespace keeps the 14 deck archetypes distinct from
    // the colliding GOLD artifact templates (stat-row / block-quote / section-divider). The SlideData
    // fence body IS the archetype payload (composer reads fields by dot-path). composeSlide returns
    // null for an unknown key, so a malformed name falls through to the normal GOLD dispatch.
    if (template.startsWith('slides:')) {
        const payload = slide.composerPayload || slide;
        const composed = composeSlide(template.slice('slides:'.length), payload, brand);
        if (composed) return composeArchetypeDoc(brand, slide.title || '', composed);
    }
    // Universal density axis: resolve this slide's item ceilings before dispatch.
    _caps = densityCaps(template, slide.density);

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
        'journey-map': 'Journey map',
        'org-chart': 'Org structure',
        'executive-brief': 'Brief',
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
            body = renderThemeSpotlight(slide, T);
            break;
        case 'theme-cluster':
            body = renderThemeCluster(slide, T);
            break;
        case 'theme-arc':
            body = renderThemeArc(slide, T);
            break;
        case 'theme-mosaic':
            body = renderThemeMosaic(slide, T);
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
        case 'journey-map':
            body = renderJourneyMap(slide, T);
            break;
        case 'org-chart':
            body = renderOrgChart(slide, T);
            break;
        case 'executive-brief':
            body = renderExecutiveBrief(slide, T);
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

    // Title HTML - GOLD action-title face (Archivo SemiBold / Lora Medium).
    const titleHtml = slide.title ? `<h1>${esc(slide.title)}</h1>` : '';

    // GOLD case-study chrome: subject rides in the kicker (CASE STUDY · AMAZON)
    // and the takeaway band carries takeaway || lesson || implication.
    let kicker = KICKERS[template] || undefined;
    let takeaway: string | undefined;
    if (template === 'case-study') {
        const c = slide.caseStudy || {};
        if (c.subject) kicker = `Case study · ${c.subject}`;
        // four-block renders LESSON as its own block, so the band falls back to
        // implication; before-after / evidence-stack keep the lesson fallback.
        const isFourBlock = !c.beforeAfter && !(Array.isArray(c.evidence) && c.evidence.length > 0) && (!c.variant || c.variant === 'four-block');
        takeaway = c.takeaway || (isFourBlock ? c.implication : (c.lesson || c.implication)) || undefined;
    }
    // GOLD service-blueprint chrome: journeyType rides in the kicker and the
    // takeaway band carries keyInsight (same slot the web GoldFrame twin uses).
    if (template === 'service-blueprint') {
        const b: any = slide.serviceBlueprint || {};
        if (b.journeyType) kicker = `Service journey · ${b.journeyType}`;
        takeaway = b.keyInsight || undefined;
    }
    // GOLD journey-map chrome: journeyType in the kicker, keyInsight in the band.
    if (template === 'journey-map') {
        const j: any = (slide as any).journeyMap || {};
        if (j.journeyType) kicker = `Journey map · ${j.journeyType}`;
        takeaway = j.keyInsight || undefined;
    }
    // GOLD org-chart chrome: subject rides in the kicker (ORG STRUCTURE · AS-IS),
    // keyInsight in the takeaway band (same slots as the web OrgChartSlide twin).
    if (template === 'org-chart') {
        const og: any = (slide as any).orgChart || {};
        kicker = `Org structure · ${(og.subject || 'AS-IS')}`;
        takeaway = og.keyInsight || undefined;
    }
    // GOLD executive-brief chrome: variant + subject ride in the kicker
    // (BRIEF / EXPLAINER / REPORT · SUBJECT), keyInsight in the takeaway band.
    if (template === 'executive-brief') {
        const eb: any = (slide as any).executiveBrief || {};
        const vlabel = eb.variant === 'explainer' ? 'Explainer' : eb.variant === 'report' ? 'Report' : 'Brief';
        kicker = `${vlabel} · ${(eb.subject || 'Executive summary')}`;
        takeaway = eb.keyInsight || undefined;
    }

    // 2026-06-12 user feedback ("eliminate redundant source citations"):
    // theme slides whose every theme carries a per-quote source attribution
    // do NOT also render the footer sources strip - the same names appeared
    // 2-3 times per slide (footer + per-theme labels). Per-quote attribution
    // IS the citation; the footer adds nothing.
    let shellSources = slide.sources;
    if (template === 'theme-cluster' || template === 'theme-spotlight' || template === 'theme-arc' || template === 'theme-mosaic') {
        const _themes: any[] = Array.isArray((slide.themeCluster || {}).themes) ? (slide.themeCluster as any).themes : [];
        if (_themes.length > 0 && _themes.every((t: any) => t && t.source)) {
            shellSources = undefined;
        }
    }

    return buildShell({
        brand,
        title: slide.title || 'Slide',
        bodyInnerHtml: titleHtml + '\n' + body,
        sources: shellSources,
        kicker,
        takeaway,
    });
}
