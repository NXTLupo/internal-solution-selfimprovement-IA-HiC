/**
 * SLIDE TEMPLATES - Web (React) renderers for all 10 NXT Humans templates.
 *
 * Each renderer fills the content panel right of the brand sidebar (and,
 * optionally, the image panel). Templates favor restraint: massive negative
 * space, sharp corners, single-accent color, conclusion titles only.
 */

import React from 'react';
import { TOKENS, hex, densityCaps, type SlideDensity, SCALE, WEIGHT, TYPO, webPx, clampMin } from './types';
import { nxtBrand, getBrandArt, normalizeBrandId, type Brand } from './brands';
// 2026-10-01 - DECIEM canvas picks are SHARED with the export twin (same hash of the same title) so
// the preview shows the exact background / divider fill the PPTX will carry.
import { brandBodyArtPick, brandDividerFill, brandCanvasFor, goldArtInsets, brandType, type DeckPosition } from '../../services/slideToStageHtml';

// Round 2 (2026-10-01): the deck position (array index + divider ordinal) reaches the GOLD preview
// twins through this context, so goldPreviews.tsx (which only forwards `brand`) never has to change.
// SlideCanvas provides it; GoldFrame / SectionDividerFullBleed read it when no prop is given.
export const DeckPositionContext = React.createContext<DeckPosition>({});
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, CaseStudyData, PrinciplesData, StatRowData, TimelineData, SectionDividerData,
    ServiceBlueprintData, JourneyMapData, GapMatrixData, ArchitectureMapData, PrdFeatureData, SystemsInventoryData,
    OrgChartData, ExecutiveBriefData,
} from './types';
import { cleanTranscriptQuote, looksLikeTranscriptSource } from '../../services/transcriptQuoteCleaner';
import type { JourneyBrief } from '../../services/journeyBriefExporter';
import { composeSlide } from '../../services/slideComposer';

// === PRD PROJECTION ARCHETYPES (2026-10-01, Stage 3.3) ===
// The #prd deck is a projection of PrdAir onto four REGISTERED composer archetypes
// (slides:prd-story / prd-ledger / prd-signals / prd-trace). The export twin composes them in
// slideToStageHtml; this is the preview twin: the SAME composed 1920x1080 stage, scaled to the
// 960x540 web canvas, so preview and PPTX cannot drift (one spec, one payload, two scales).
export const PRD_PREVIEW_ARCHETYPES = ['prd-story', 'prd-ledger', 'prd-signals', 'prd-trace'] as const;
export const PrdArchetypeSlide: React.FC<{ template: string; payload: any; brand?: Brand }> = ({ template, payload, brand }) => {
    const T = resolveT(brand);
    const pos = React.useContext(DeckPositionContext);
    const archetype = String(template || '').replace(/^slides:/, '');
    const composed = React.useMemo(() => {
        try { return composeSlide(archetype, payload, normalizeBrandId(T.BRAND_ID), pos) || ''; } catch { return ''; }
    }, [archetype, payload, T.BRAND_ID, pos.deckIndex, pos.dividerOrdinal]);
    if (!composed) return null;
    return (
        <div style={{ width: T.WEB_W, height: T.WEB_H, overflow: 'hidden', position: 'relative', background: hex(T.WHITE) }}>
            <div style={{ width: 1920, height: 1080, transform: 'scale(0.5)', transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: composed }} />
        </div>
    );
};

// Renderers fall back to the nxt brand when no brand prop is supplied.
// When a brand is supplied, we use its token values so `T.TEAL` semantic slots
// resolve to the brand's dark-surface color, and `T.CHARTREUSE*` resolves to
// the brand's primary accent.
const resolveT = (b?: Brand): Brand => b || nxtBrand;

// 2026-10-01 - DECIEM lockup (preview twin of slideToStageHtml lockupHtml, at the 960x540 half
// scale): a thin-bordered box top-right, line 1 bold, line 2 lighter, both uppercase in the title
// face. Renders nothing for brands without a BRAND_LOGO_LOCKUP token.
const BrandLockup: React.FC<{ T: Brand; color: string }> = ({ T, color }) => {
    const lines = String(T.BRAND_LOGO_LOCKUP || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    return (
        <div className="brandlogo lockup" style={{ position: 'absolute', top: 36, right: 36, width: 108, padding: '11px 10px 10px', border: `1px solid ${color}`, color, fontFamily: `'${T.FONT_TITLE}', sans-serif`, textTransform: 'uppercase', zIndex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 11.5, lineHeight: 1.1, letterSpacing: '0.1px' }}>{lines[0]}</div>
            {lines.slice(1).map((l, i) => <div key={i} style={{ fontWeight: 400, fontSize: 9.5, lineHeight: 1.1, marginTop: 7, letterSpacing: '0.3px' }}>{l}</div>)}
        </div>
    );
};

// === SHARED CHROME ===

interface ShellProps {
    children: React.ReactNode;
    imageUrl?: string;
    imagePanel?: React.ReactNode; // overrides image when provided (for portraits etc.)
    brand?: Brand;
}

export const SlideShell: React.FC<ShellProps> = ({ children, imageUrl, imagePanel, brand }) => {
    const T = resolveT(brand);
    return (
    <div style={{
        width: T.WEB_W, height: T.WEB_H, background: hex(T.WHITE),
        position: 'relative', overflow: 'hidden',
        fontFamily: `'${T.FONT}', sans-serif`, display: 'flex',
    }}>
        {/* TEAL SIDEBAR */}
        <div style={{
            width: T.SIDEBAR_W_PX, height: '100%', background: hex(T.TEAL),
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'space-between', padding: '20px 0', flexShrink: 0,
        }}>
            <img src="/logo.png" alt="NXT" style={{ width: 36, filter: 'brightness(0) invert(1)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 5px)', gap: 4, marginBottom: 8 }}>
                {Array(9).fill(0).map((_, i) => <span key={i} style={{ width: 5, height: 5, background: hex(T.CHARTREUSE_BRIGHT) }} />)}
            </div>
        </div>
        {/* IMAGE PANEL - 35% (1/3) when present */}
        {(imagePanel || imageUrl) && (
            <div style={{ width: '35%', height: '100%', overflow: 'hidden', flexShrink: 0, background: hex(T.BLACK) }}>
                {imagePanel || (
                    <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
            </div>
        )}
        {/* CONTENT PANEL */}
        <div style={{
            flex: 1, height: '100%', background: hex(T.WHITE), overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
        }}>
            {children}
        </div>
    </div>
    );
};

// === GOLD FRAME (2026-06-10) ===
// The GOLD visual language from the live Figma design-system files (NXT
// iSQhAVM7SI4QHAWB7y9C2z, NU z2v9Pvhg23hlljEitPBdAt). All values are the
// Figma 1920x1080 GOLD frame values divided by 2 for the 960x540 web canvas:
//   rail 92->46, dot mark 12px squares gap 6 at (30,990) -> 6px gap 3 at
//   (15,495), content x172 w1660 -> x86 w830, kicker 19px/6 -> 9.5px/3,
//   headline 46 -> 23, meta 14 -> 7, takeaway band x172 y944 w1568 h96 ->
//   x86 y472 w784 h48. Brand differences ride entirely on tokens (RAIL,
//   KICKER, FONT_TITLE, BAND, BAND_TEXT...): geometry is identical per the
//   GOLD standing rule.
interface GoldFrameProps {
    children: React.ReactNode;
    brand?: Brand;
    /** Kicker eyebrow, e.g. "CASE STUDY · AMAZON" - IBM Plex Mono, tracked. */
    kicker?: string;
    /** Action title (complete-sentence conclusion). */
    title?: string;
    /** Mono meta row under the title (profile / timeframe / investment). */
    meta?: string;
    /** Takeaway band text - the dark/accent band at the bottom. Omitted = no band. */
    takeaway?: string;
    /** Round 2: deck position (else read from DeckPositionContext) and the art-vs-imagery flag. */
    deckIndex?: number;
    noArt?: boolean;
}

export const GoldFrame: React.FC<GoldFrameProps> = ({ children, brand, kicker, title, meta, takeaway, deckIndex, noArt }) => {
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    const ctxPos = React.useContext(DeckPositionContext);
    const BT = brandType(T.BRAND_ID);
    // 2026-10-01 - brands with template art (DECIEM): no rail, no dot-mark, no masthead on paper body
    // slides; ONE corner line-art background (same deck-order / title-hash pick as the export twin);
    // the canvas inset follows the art's SAFE BOX at half scale (text left of right-side art, clear
    // of the blobs). Imagery slides carry no art.
    const hasArt = !!getBrandArt(T.BRAND_ID);
    const pick = (hasArt && !noArt) ? brandBodyArtPick(T.BRAND_ID, title || kicker || '', deckIndex ?? ctxPos.deckIndex) : null;
    const bodyArt = pick ? pick.url : '';
    // Round 3: insets from the MEASURED zones (same least-area rule as the stage twin), half scale.
    const ins = pick ? goldArtInsets(pick.zones, !!takeaway) : null;
    const titleXform = (T.TITLE_TRANSFORM && T.TITLE_TRANSFORM !== 'none') ? (T.TITLE_TRANSFORM as any) : undefined;
    return (
        <div style={{
            width: T.WEB_W, height: T.WEB_H, background: hex(T.WHITE),
            position: 'relative', overflow: 'hidden',
            fontFamily: `'${T.FONT_BODY}', sans-serif`, color: hex(T.INK),
        }}>
            {bodyArt && <img className="bgart" src={bodyArt} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', zIndex: 0 }} />}
            {/* RAIL */}
            {!hasArt && <div style={{ position: 'absolute', left: 0, top: 0, width: 46, height: '100%', background: hex(T.RAIL) }} />}
            {/* 3x3 DOT MARK (bottom of rail) */}
            {!hasArt && <div style={{ position: 'absolute', left: 15, top: 495, display: 'grid', gridTemplateColumns: 'repeat(3, 6px)', gap: 3 }}>
                {Array(9).fill(0).map((_, i) => <span key={i} style={{ width: 6, height: 6, background: hex(T.CHARTREUSE) }} />)}
            </div>}
            {/* OFFICIAL BRAND LOGO (top-right) - HYDRATED from the Figma token feed
                (logo.monogram / logo.wordmark), never hardcoded, so a newly deployed
                Figma mark reaches the preview. NXT reads the hydrated global TOKENS
                (nxtBrand is a stale pre-hydration snapshot); NU reads the hydrated T
                (nuBrand). Wordmark is the fallback until a mark populates. */}
            {!hasArt && (() => {
                const _lt: any = isNu ? T : TOKENS;
                const _logoSvg = String(_lt.BRAND_LOGO_SVG || '').trim();
                const _logoWm = String(_lt.BRAND_LOGO_WORDMARK || (isNu ? 'NORTHEASTERN' : 'NXT HUMANS'));
                return (
                    <div className="nxt-gf-logomark" style={{ position: 'absolute', top: 22, right: 40, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <style>{`.nxt-gf-logomark svg{height:17px;width:auto;display:block}`}</style>
                        {_logoSvg ? <span style={{ display: 'inline-flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: _logoSvg }} /> : null}
                        {_logoWm && (
                            // Wordmark uses the brand DISPLAY face (NXT = Saira Condensed SemiBold
                            // per Figma 22:2; NU = Lato), NOT FONT_BODY. Twin of slideToStageHtml
                            // .brandlogo .wm. FONT_DISPLAY===FONT_BODY for NU, so no-op there.
                            <span style={{ fontFamily: `'${T.FONT_DISPLAY}', sans-serif`, fontWeight: isNu ? 800 : 600, fontSize: isNu ? webPx(SCALE.body) : webPx(SCALE.lead), letterSpacing: isNu ? '1.5px' : '0.5px', color: hex(T.INK), textTransform: 'uppercase' }}>
                                {_logoWm}
                            </span>
                        )}
                    </div>
                );
            })()}
            {/* CONTENT COLUMN */}
            <div style={hasArt
                ? { position: 'absolute', left: ins ? webPx(ins.left) : 98, top: ins ? webPx(ins.top) : 55, right: ins ? webPx(ins.right) : 80, bottom: ins ? webPx(ins.bottom) : 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1 }
                : { position: 'absolute', left: 86, top: 29, width: 834, bottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kicker && (
                    // Kicker = LABEL role: FONT_LABEL when the brand defines one (DECIEM Poppins 700), else FONT_MONO.
                    <div style={{ fontFamily: `'${(T as any).FONT_LABEL || T.FONT_MONO}', ${(T as any).FONT_LABEL ? 'sans-serif' : 'monospace'}`, fontWeight: hasArt ? BT.weight.label : 600, fontSize: webPx(BT.scale.caption), letterSpacing: hasArt ? '0.5px' : '3px', color: hex(T.KICKER), textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {kicker}
                    </div>
                )}
                {title && (
                    <div style={{ fontFamily: `'${T.FONT_TITLE}', ${isNu ? 'serif' : 'sans-serif'}`, fontWeight: Number(T.TITLE_WEIGHT) || 600, fontSize: webPx(BT.scale.subhead), lineHeight: isNu ? 1.12 : hasArt ? 1.1 : 1.08, letterSpacing: isNu ? '0' : hasArt ? '0.1px' : '-0.25px', color: hex(T.INK), maxWidth: ins ? webPx(Math.min(1400, 1920 - ins.left - ins.right)) : 700, textTransform: titleXform }}>
                        {title}
                    </div>
                )}
                {meta && (
                    <div style={{ fontFamily: `'${T.FONT_MONO}', monospace`, fontWeight: 500, fontSize: webPx(SCALE.label), letterSpacing: '0.5px', lineHeight: 1.6, color: hex(T.GREY), textTransform: 'uppercase' }}>
                        {meta}
                    </div>
                )}
                {(kicker || title || meta) && <div style={{ height: 1, background: hex(T.HAIRLINE), width: '100%' }} />}
                {/* BODY */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {children}
                </div>
                {/* TAKEAWAY BAND */}
                {takeaway && (
                    <div style={{ width: 784, minHeight: 48, background: hex(T.BAND), padding: '14px 24px', display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ fontFamily: `'${T.FONT_TITLE}', ${isNu ? 'serif' : 'sans-serif'}`, fontWeight: 400, fontSize: webPx(SCALE.body), lineHeight: 1.48, color: hex(T.BAND_TEXT) }}>
                            {truncate(takeaway, 220)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// LEGACY PREVIEW RENDERERS (2026-06-11, task #32)
// The 15 non-GOLD renderers below (PersonaCardSlide, RecommendationSlide,
// theme x4, CompetitiveMatrixSlide, BlockQuoteSlide, PrinciplesSlide,
// StatRowSlide, TimelineSlide, GapMatrixSlide, ArchitectureMapSlide,
// PrdFeatureSlide, SystemsInventorySlide) are SUPERSEDED by the GoldFrame
// twins in goldPreviews.tsx, which SlideCanvas and the App dev helper now
// import. Kept for one release as a rollback path; delete after the user
// signs off on the gold previews. Do NOT wire new callers to these.
// ============================================================================

// === RESPONSIVE SIZING HELPERS ===
// Every template that shows an oversized display number uses these to pick a
// font size that won't overflow its column, regardless of whether the AI emits
// "42" or "Steady" or "$2.4M" or "-12%". Returns size in pixels (web) or pt
// (PPTX - same number, different unit consumer).
export function heroNumberSize(value: string, opts?: { max?: number; min?: number; baseChars?: number }): number {
    const v = (value || '').trim();
    const max = opts?.max ?? 64;
    const min = opts?.min ?? 32;
    const baseChars = opts?.baseChars ?? 4;
    if (v.length <= baseChars) return max;
    // Each character over the base shrinks the font by a proportional amount.
    // Empirical curve tuned for Archivo 200 weight at 0-20 character range.
    const shrinkPerChar = (max - min) / 14;
    const size = Math.round(max - (v.length - baseChars) * shrinkPerChar);
    return Math.max(min, Math.min(max, size));
}

/**
 * Truncate text WITHOUT ever appending an ellipsis ("..." or "...") and
 * WITHOUT cutting mid-sentence. Strategy:
 *   1. If text fits, return verbatim.
 *   2. Look FORWARD up to 2× max for the next sentence end - if found,
 *      return the full thought. A 90-char sentence that needed budget
 *      120 finishes cleanly instead of being chopped.
 *   3. Look BACKWARD inside max for the most recent sentence end at
 *      ≥ 30% of budget - use that.
 *   4. Look BACKWARD for the most recent clause boundary (comma + space)
 *      at ≥ 50% - end there with a period (NOT an ellipsis).
 *   5. Last resort: drop the trailing fragment at the last word boundary.
 *      NO ellipsis is ever emitted - ellipsis hides valuable information.
 */
export function truncate(text: string | undefined, max: number): string {
    if (!text) return '';
    const t = text.trim();
    if (t.length <= max) return t;

    // 1. Look forward up to 2× max for next sentence end (preserve full thought)
    const lookAhead = Math.min(t.length, Math.round(max * 2));
    const fwdSlice = t.substring(0, lookAhead);
    const fwdRest = fwdSlice.substring(max);
    const fwdMatch = fwdRest.search(/[.!?](?:\s|$)/);
    if (fwdMatch >= 0) return t.substring(0, max + fwdMatch + 1).trim();

    // 2. Backward sentence end inside budget
    const slice = t.substring(0, max);
    let best = -1;
    for (let i = slice.length - 1; i >= 0; i--) {
        const c = slice[i];
        if ((c === '.' || c === '!' || c === '?') && (i === slice.length - 1 || /\s/.test(slice[i + 1]))) {
            best = i + 1;
            break;
        }
    }
    if (best > max * 0.3) return slice.substring(0, best).trim();

    // 3. Backward clause boundary, end with period (no ellipsis). Punctuation
    //    OR a conjunction - dropping the trailing clause beats stranding it.
    const lastClause = Math.max(
        slice.lastIndexOf(', '), slice.lastIndexOf('; '),
        slice.lastIndexOf(' and '), slice.lastIndexOf(' but '), slice.lastIndexOf(' because '),
        slice.lastIndexOf(' before '), slice.lastIndexOf(' after '), slice.lastIndexOf(' when '),
        slice.lastIndexOf(' while '), slice.lastIndexOf(' unless '), slice.lastIndexOf(' until '),
    );
    if (lastClause > max * 0.5) {
        const kept = stripDanglingTail(slice.substring(0, lastClause));
        if (kept) return kept + '.';
    }

    // 4. Last resort: word boundary, NO ellipsis
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) return stripDanglingTail(slice.substring(0, lastSpace)) || slice.trim();
    return slice.trim();
}

/** A cut must never END on a conjunction / preposition / article / auxiliary
 *  ("...pre-filled, and", "...auto-populate the") - the loudest truncation
 *  slop tell (user, 2026-07-09). Twin of slideToStageHtml.stripDanglingTail. */
const DANGLING_TAIL = /\s(?:and|or|but|nor|so|yet|the|a|an|of|to|with|for|in|on|at|by|from|into|via|per|as|is|are|was|were|be|been|being|that|which|who|whose|their|its|his|her|our|your|own|then|than|while|when|where|both|each|any|all|also|not|only|even|such|very|more|most|about|over|under|between|through|during|before|after|against|toward|towards|without|within)$/i;
function stripDanglingTail(s: string): string {
    let t = s.replace(/\s*\([^)]*$/, '').replace(/[\s,;:.\-(“"‘']+$/, '').trim();
    for (let i = 0; i < 6; i++) {
        const peeled = t.replace(DANGLING_TAIL, '').replace(/[\s,;:.\-(“"‘']+$/, '').trim();
        if (peeled === t) break;
        t = peeled;
    }
    return t;
}

// === MICRO-PRIMITIVES ===

const Tag: React.FC<{ text: string; color?: string; brand?: Brand }> = ({ text, color, brand }) => {
    const T = resolveT(brand);
    return <div style={{ fontSize: webPx(SCALE.body), fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: hex(color || T.CHARTREUSE_BRIGHT) }}>{text}</div>;
};

const Title: React.FC<{ text: string; size?: number; brand?: Brand }> = ({ text, size = 28, brand }) => {
    const T = resolveT(brand);
    return <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 900, fontSize: size, color: hex(T.INK), lineHeight: 1.05, letterSpacing: '-0.015em' }}>{text}</div>;
};

const SourceFooter: React.FC<{ sources: string[]; brand?: Brand }> = ({ sources, brand }) => {
    const T = resolveT(brand);
    return sources && sources.length > 0 ? (
        <div style={{ fontSize: webPx(SCALE.label), color: hex(T.MUTED), borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 6, marginTop: 'auto' }}>
            Sources: {sources.join('  |  ')}
        </div>
    ) : null;
};

/**
 * QuoteStack - renders either a singular `evidence` quote OR a variable-length
 * `quotes[]` array with consistent styling. The caller controls size/tone via
 * the `size` prop ('hero' | 'body' | 'compact'). This is the primitive that
 * makes multi-quote density work across every theme template.
 */
interface QuoteLike { text: string; source?: string; attribution?: string; date?: string; role?: string; }

/**
 * Smart quote truncation - NEVER cut mid-clause and NEVER append ellipsis.
 * Strategy:
 *   1. If quote fits, return verbatim.
 *   2. Look forward up to 1.5× for the next sentence end (preserve full thought).
 *   3. Look backward for the most recent sentence end inside hardMax.
 *   4. Fall back to last clause boundary (comma) ending with a period.
 *   5. Last resort: drop trailing fragment at last word boundary, no ellipsis.
 */
function smartQuoteClip(text: string, maxChars: number): string {
    if (!text) return '';
    const t = text.trim();
    if (t.length <= maxChars) return t;
    const hardMax = Math.round(maxChars * 1.5);

    // Look forward for the next sentence end past maxChars
    const fwdSlice = t.slice(0, Math.min(hardMax, t.length));
    const fwdRest = fwdSlice.substring(maxChars);
    const fwdMatch = fwdRest.search(/[.!?](?:\s|$)/);
    if (fwdMatch >= 0) return t.slice(0, maxChars + fwdMatch + 1).trim();

    // Backward sentence end inside hardMax
    const slice = fwdSlice;
    const lastSentence = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
    if (lastSentence > maxChars * 0.5) return t.slice(0, lastSentence + 1).trim();

    // Backward clause boundary - end with period, no ellipsis
    const lastClause = slice.lastIndexOf(', ');
    if (lastClause > maxChars * 0.6) return t.slice(0, lastClause).trim() + '.';

    // Last resort: drop trailing fragment at last word boundary, NO ellipsis
    const lastSpace = slice.lastIndexOf(' ');
    return (lastSpace > 0 ? t.slice(0, lastSpace) : slice).trim();
}

/** Clean a single quote if it came from a transcript source. Returns the
 *  cleaned quote, or null to indicate the quote is entirely narration/filler. */
function prepQuote(q: QuoteLike): QuoteLike | null {
    if (!q || !q.text) return null;
    const isTranscript = looksLikeTranscriptSource(q.source) || looksLikeTranscriptSource(q.attribution);
    if (!isTranscript) return q;
    const cleaned = cleanTranscriptQuote(q.text);
    if (!cleaned) return null;
    return { ...q, text: cleaned };
}

const QuoteStack: React.FC<{
    /** Either a single legacy `evidence` string or an array of full quote objects */
    quotes: QuoteLike[];
    size?: 'hero' | 'body' | 'compact';
    brand?: Brand;
    /** Override accent color (e.g. for dark-surface mosaic cells) */
    accent?: string;
    /** Override text color for dark surfaces */
    ink?: string;
    /** Soft max characters per quote - smart-clipped at sentence boundary */
    maxChars?: number;
}> = ({ quotes, size = 'body', brand, accent, ink, maxChars }) => {
    const T = resolveT(brand);
    const sizing = size === 'hero'
        ? { fs: 12, lh: 1.5, pad: 14, border: 3, gap: 8, attrFs: 8, attrMt: 4 }
        : size === 'compact'
        ? { fs: 9, lh: 1.45, pad: 8, border: 2, gap: 5, attrFs: 7, attrMt: 3 }
        : { fs: 10, lh: 1.5, pad: 10, border: 2, gap: 6, attrFs: 8, attrMt: 3 };
    const borderColor = accent || hex(T.CHARTREUSE_BRIGHT);
    const textColor = ink || hex(T.INK);
    const attrColor = accent || hex(T.MUTED);
    // Clean transcript quotes AND filter anything the cleaner rejected.
    const visible = quotes
        .map(prepQuote)
        .filter((q): q is QuoteLike => !!(q && q.text));
    if (visible.length === 0) return null;
    const softMax = maxChars || (size === 'hero' ? 280 : size === 'compact' ? 140 : 200);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: sizing.gap, width: '100%', minWidth: 0 }}>
            {visible.map((q, i) => (
                <div key={i} style={{ minWidth: 0 }}>
                    <div style={{
                        fontSize: sizing.fs, fontStyle: 'italic', color: textColor,
                        borderLeft: `${sizing.border}px solid ${borderColor}`,
                        paddingLeft: sizing.pad, lineHeight: sizing.lh, fontWeight: 300,
                    }}>
                        "{smartQuoteClip(q.text, softMax)}"
                    </div>
                    {(q.source || q.attribution || q.role) && (
                        <div style={{
                            fontSize: sizing.attrFs, color: attrColor,
                            marginTop: sizing.attrMt, paddingLeft: sizing.pad,
                            letterSpacing: '1.2px', textTransform: 'uppercase' as const, fontWeight: 700,
                            lineHeight: 1.35,
                        }}>
                            {[q.attribution, q.role, q.source].filter(Boolean).join(' · ')}
                            {q.date ? `, ${q.date}` : ''}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

/** E10 twin parity (2026-10-01): the per-theme content-true thumbnail the export twin paints
 *  (slideToStageHtml themeThumb): the index-aligned `themeImages[i]` carrier first, then the
 *  theme's own `brandImage` (a string or `{ url }`). Empty -> nothing (no decorative placeholder). */
function themeThumbSrc(data: { themeImages?: string[] }, t: { brandImage?: string | { url?: string } }, i: number): string {
    const arr = Array.isArray(data.themeImages) ? data.themeImages : null;
    let src = arr && typeof arr[i] === 'string' ? arr[i] : '';
    if (!src && t && t.brandImage) src = typeof t.brandImage === 'string' ? t.brandImage : (t.brandImage.url || '');
    return src || '';
}

/** Normalize legacy `evidence` + `source` into the QuoteLike[] shape the stack
 *  expects. If `quotes[]` is provided, it takes precedence and the singular
 *  evidence is ignored. */
function resolveThemeQuotes(theme: { evidence?: string; source?: string; quotes?: Array<{ text: string; source?: string; attribution?: string; date?: string; role?: string }> }): QuoteLike[] {
    if (theme.quotes && theme.quotes.length > 0) return theme.quotes;
    if (theme.evidence) return [{ text: theme.evidence, source: theme.source }];
    return [];
}

// === 1. PERSONA CARD (persona-architect) ===
// 2026-05-23 - Refactored to NU artifact primitives. A single persona on
// the slide stage maps to the NU `.persona` card structure (GUIDE.md §6.1).
// Two-column layout: identity + JTBD + goals on the left; pain points +
// motivations on the right. Verbatim quote uses brand-red Spectral italic
// per the "Northeastern red is a scalpel" rule. Pain points use signal--red
// dot; motivations use signal--green. No catastrophizing verbs.
export const PersonaCardSlide: React.FC<{ data: PersonaCardData; sources?: string[]; hasImage: boolean; imageUrl?: string; brand?: Brand }> = ({ data, sources = [], hasImage, imageUrl, brand }) => {
    const p = data;
    // 2026-06-28 carrier-to-renderer fix: paint the generated persona portrait (slide.imageUrl,
    // written by generatePersonaSlidePortraits). Mirrors slideToStageHtml renderPersonaCard. §3c
    // keeps the generator's style; the renderer just paints it.
    const portrait = String(imageUrl || '').trim();
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Persona · Discovery synthesis</div>
                    <h1 className="art-masthead__title" style={{ fontSize: hasImage ? webPx(SCALE.subhead) : webPx(SCALE.subhead) }}>
                        {p.name}
                    </h1>
                    <div style={{ fontSize: webPx(SCALE.lead), color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                        {p.role}{p.demographics ? ` · ${p.demographics}` : ''}
                    </div>
                    {/* E10 twin parity (2026-10-01): descriptor strip + stakes line, as the dense export identity column paints them. */}
                    {p.descriptors && (
                        <div style={{ fontSize: webPx(SCALE.label), color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                            {truncate(p.descriptors, 84)}
                        </div>
                    )}
                </div>
            </header>
            <div style={{ padding: '4px 28px 8px', flex: 1, display: 'grid', gridTemplateColumns: hasImage ? '1fr' : '1.05fr 1fr', gap: 18, minHeight: 0, overflow: 'hidden' }}>
                {/* LEFT column - quote + JTBD + Cooper goals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    {portrait && (
                        <img
                            src={portrait}
                            alt=""
                            style={{ width: '100%', aspectRatio: '4 / 5', maxHeight: 220, objectFit: 'cover', display: 'block', borderRadius: 2, border: '1px solid var(--border-subtle)' }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                    )}
                    {p.quote && (
                        <blockquote
                            style={{
                                margin: 0,
                                paddingLeft: 14,
                                borderLeft: '3px solid var(--nu-red-600)',
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 400,
                                fontSize: hasImage ? webPx(SCALE.lead) : webPx(SCALE.name),
                                lineHeight: 1.4,
                                color: 'var(--fg-strong)',
                            }}
                        >
                            “{p.quote}”
                            <span className="pill pill--brand" style={{ marginLeft: 8, verticalAlign: 'middle' }}>verbatim</span>
                        </blockquote>
                    )}
                    {p.bio && (
                        <p style={{ margin: 0, fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5 }}>{truncate(p.bio, 260)}</p>
                    )}
                    {p.jtbd && (
                        <div className="art-card" style={{ padding: '8px 12px', fontSize: webPx(SCALE.body), lineHeight: 1.45 }}>
                            <span style={{ fontSize: webPx(SCALE.caption), letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', marginRight: 8 }}>JTBD</span>
                            {p.jtbd}
                        </div>
                    )}
                    {p.goals && (
                        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {Object.entries(p.goals).filter(([, v]) => v).map(([k, v]) => (
                                <div key={k} style={{ background: 'var(--bg-subtle)', padding: '8px 10px', borderTop: '2px solid var(--nu-red-600)' }}>
                                    <dt style={{ fontSize: webPx(SCALE.caption), fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>
                                        {k.replace('Goal', '')}
                                    </dt>
                                    <dd style={{ margin: 0, fontSize: webPx(SCALE.body), lineHeight: 1.4, color: 'var(--fg-strong)' }}>{v}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
                {/* RIGHT column - pain points + motivations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    {p.painPoints && p.painPoints.length > 0 && (
                        <div>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                                <span className="signal signal--red" style={{ marginRight: 6 }}></span>
                                Pain points
                            </div>
                            {p.painPoints.slice(0, hasImage ? 2 : 3).map((pp, i) => (
                                <div key={i} style={{ fontSize: hasImage ? webPx(SCALE.body) : webPx(SCALE.body), color: 'var(--fg-default)', marginBottom: 6, paddingLeft: 10, borderLeft: '1px solid var(--border-subtle)', lineHeight: 1.4 }}>
                                    {/* 2026-10-02 twin parity with the legible export: the pain, then ONE verbatim evidence line with its source. */}
                                    <strong style={{ color: 'var(--fg-strong)' }}>{pp.label}</strong>
                                    {pp.quote ? (
                                        <div style={{ fontStyle: 'italic', marginTop: 2 }}>
                                            “{truncate(pp.quote, 100)}”
                                            {pp.source ? <span style={{ fontStyle: 'normal', color: 'var(--fg-muted)', marginLeft: 6 }}>{pp.source}</span> : null}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                    {p.motivations && p.motivations.length > 0 && (
                        <div>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                                <span className="signal signal--green" style={{ marginRight: 6 }}></span>
                                Motivations
                            </div>
                            {p.motivations.slice(0, hasImage ? 2 : 3).map((m, i) => (
                                <div key={i} style={{ fontSize: hasImage ? webPx(SCALE.body) : webPx(SCALE.body), color: 'var(--fg-default)', marginBottom: 6, paddingLeft: 10, borderLeft: '1px solid var(--border-subtle)', lineHeight: 1.4 }}>
                                    <strong style={{ color: 'var(--fg-strong)' }}>{m.label}{m.quote ? ':' : ''}</strong>{m.quote ? <> “{truncate(m.quote, 130)}”</> : null}
                                    {m.source ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), color: 'var(--fg-subtle)', marginLeft: 4 }}>({m.source})</span> : null}
                                </div>
                            ))}
                        </div>
                    )}
                    {Array.isArray(p.behaviors) && p.behaviors.length > 0 && (
                        <div>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>Behaviors</div>
                            {p.behaviors.slice(0, 3).map((b, i) => (
                                <div key={i} style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', marginBottom: 4, paddingLeft: 10, borderLeft: '1px solid var(--border-subtle)', lineHeight: 1.4 }}>{truncate(b, 92)}</div>
                            ))}
                        </div>
                    )}
                    {Array.isArray(p.winConditions) && p.winConditions.length > 0 && (
                        <div>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>What wins them</div>
                            {p.winConditions.slice(0, 3).map((w, i) => (
                                <div key={i} style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', marginBottom: 4, paddingLeft: 10, borderLeft: '1px solid var(--nu-red-600)', lineHeight: 1.4 }}>{truncate(w, 92)}</div>
                            ))}
                        </div>
                    )}
                    {p.stakes && (
                        <div style={{ marginTop: 'auto', fontSize: webPx(SCALE.caption), color: 'var(--fg-muted)', lineHeight: 1.45, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>{truncate(p.stakes, 130)}</div>
                    )}
                </div>
            </div>
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 2. RECOMMENDATION (strategy-author) ===
// 2026-05-23 - Refactored to NU artifact primitives (.rec pattern from
// recommendations.html). Layout: ink-900 kernel band → action title with
// brand-red left rule → supporting actions (auto-numbered) + side panel
// (impact grid / hero metric / strip / image) → footer implication line.
// Replaces the previous 600-line absolutely-positioned band layout with
// declarative .art-card + .stat composition. PPTX exporter unchanged.
export const RecommendationSlide: React.FC<{ title: string; data: RecommendationData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const _rc = densityCaps('recommendation', density);
    const hasGrid = !!(data.impactGrid && (data.impactGrid.baseline || data.impactGrid.target || data.impactGrid.timeframe || data.impactGrid.owner));
    const hasEvidence = !!(data.evidence && data.evidence.length > 0);
    const framingTagText = data.framingTag || 'Strategic recommendation';
    const actionsLabelText = data.actionsLabel || 'Supporting actions';
    // USER OVERRIDE 2026-06-28 scenes-where-they-fit: per-recommendation EMOTIVE scene.
    // panelImage (registry recommendation/panel/emotive, Figma 678:5526 on detail 597:4;
    // NU twin 625:1841 inherits) takes precedence over the tile-sourced heroImage.
    const recImageSrc = data.panelImage || (data.heroImage && data.heroImage.src) || '';
    const hasImage = !!recImageSrc;
    const hasStrip = !!(data.impactStrip && (data.impactStrip.effort || data.impactStrip.risk || data.impactStrip.outcome));
    // E10 twin parity (2026-10-01): the NU_Giving impact CARD STACK (label / headline / body) the
    // export twin routes to at two or more cards; the preview dropped it.
    const impactCards = Array.isArray(data.impactCards) ? data.impactCards.slice(0, 3) : [];
    const hasCards = impactCards.length >= 2;
    const footerText = data.implication || data.whyMatters || '';
    const footerLabel = data.implication ? 'Implication' : (data.whyMatters ? 'Why it matters' : '');
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">{framingTagText}</div>
                    <h1 className="art-masthead__title">{title}</h1>
                    {data.personaContext && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.body), color: 'var(--fg-muted)', marginTop: 6, letterSpacing: '.06em' }}>
                            {truncate(data.personaContext, 110)}
                        </div>
                    )}
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, minHeight: 0, overflow: 'hidden' }}>
                {/* LEFT - action title + rationale + supporting actions + evidence */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                    <h2 className="art-finding" style={{ fontSize: webPx(SCALE.subhead), borderLeft: '3px solid var(--nu-red-600)', paddingLeft: 12 }}>
                        {data.actionTitle}
                    </h2>
                    {data.rationale && (
                        <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.55, margin: 0 }}>{truncate(data.rationale, 280)}</p>
                    )}
                    {data.supportingActions && data.supportingActions.length > 0 && (
                        <>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 2 }}>
                                {actionsLabelText}
                            </div>
                            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {data.supportingActions.slice(0, Math.min(_rc.items, 5)).map((a, i) => (
                                    <li key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'baseline' }}>
                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: 'var(--nu-red-600)', lineHeight: 1 }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', marginBottom: 2 }}>{a.name}</div>
                                            <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45 }}>{truncate(a.description, 150)}</div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                    {hasEvidence && (
                        <div style={{ marginTop: 4, borderTop: '1px solid var(--border-subtle)', paddingTop: 6, overflow: 'hidden' }}>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>Evidence</div>
                            <QuoteStack quotes={(data.evidence || []).slice(0, density === 'dense' ? 2 : 1)} size="compact" brand={brand} maxChars={150} />
                        </div>
                    )}
                </div>
                {/* RIGHT - hero image | impact grid | impact strip | hero metric */}
                <div className="art-card" style={{ padding: 14, borderTop: '3px solid var(--nu-red-600)', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {hasCards ? (
                        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {impactCards.map((c, i) => (
                                <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', paddingTop: i > 0 ? 8 : 0 }}>
                                    <dt style={{ fontSize: webPx(SCALE.label), letterSpacing: '.12em', fontWeight: 700, color: 'var(--nu-red-600)', textTransform: 'uppercase', marginBottom: 2 }}>{truncate(c.label, 20)}</dt>
                                    <dd style={{ margin: 0, fontSize: webPx(SCALE.lead), color: 'var(--fg-strong)', lineHeight: 1.25, fontWeight: 700 }}>{truncate(c.headline, 36)}</dd>
                                    <dd style={{ margin: '3px 0 0', fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.4 }}>{truncate(c.body, 170)}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : hasImage ? (
                        <>
                            <img
                                src={recImageSrc}
                                alt={(data.heroImage && data.heroImage.alt) || data.actionTitle}
                                style={{ width: '100%', height: 'auto', aspectRatio: data.panelImage ? '560 / 140' : '4 / 3', objectFit: 'cover', display: 'block', marginBottom: 8 }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            {data.heroImage!.caption && (
                                <div style={{ fontSize: webPx(SCALE.caption), fontFamily: 'var(--font-mono)', letterSpacing: '.1em', color: 'var(--fg-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                                    {truncate(data.heroImage!.caption, 50)}
                                </div>
                            )}
                            {hasStrip && (
                                <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        { k: 'Effort', v: data.impactStrip?.effort },
                                        { k: 'Risk', v: data.impactStrip?.risk },
                                        { k: 'Outcome', v: data.impactStrip?.outcome },
                                    ].filter(c => c.v).map((c, i, arr) => (
                                        <div key={c.k} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 8, alignItems: 'baseline', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: i < arr.length - 1 ? 4 : 0 }}>
                                            <dt style={{ fontSize: webPx(SCALE.label), letterSpacing: '.12em', fontWeight: 700, color: 'var(--nu-red-600)', textTransform: 'uppercase' }}>{c.k}</dt>
                                            <dd style={{ margin: 0, fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.4, fontWeight: 600 }}>{truncate(c.v || '', 60)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </>
                    ) : hasGrid ? (
                        <>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Projected impact</div>
                            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { k: 'Baseline', v: data.impactGrid?.baseline },
                                    { k: 'Target', v: data.impactGrid?.target, accent: 'var(--nu-red-700)' },
                                    { k: 'Timeframe', v: data.impactGrid?.timeframe },
                                    { k: 'Owner', v: data.impactGrid?.owner },
                                ].map(c => (
                                    <div key={c.k}>
                                        <dt style={{ fontSize: webPx(SCALE.label), letterSpacing: '.12em', color: c.accent || 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{c.k}</dt>
                                        <dd style={{ margin: 0, fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.3, fontWeight: 600 }}>{c.v ? truncate(c.v, 60) : ''}</dd>
                                    </div>
                                ))}
                            </dl>
                            {data.impactMetric && (
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: 'var(--nu-red-700)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                        {data.impactMetric.value}
                                    </div>
                                    <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-muted)', marginTop: 4, lineHeight: 1.4 }}>{truncate(data.impactMetric.label, 70)}</div>
                                </div>
                            )}
                        </>
                    ) : data.impactMetric ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Projected impact</div>
                            <div className="stat__value" style={{ fontSize: webPx(SCALE.subhead), color: 'var(--nu-red-700)' }}>
                                {data.impactMetric.value}
                            </div>
                            <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', marginTop: 10, lineHeight: 1.4 }}>{truncate(data.impactMetric.label, 90)}</div>
                        </div>
                    ) : null}
                </div>
            </div>
            {footerText && footerLabel && (
                <div style={{ padding: '8px 28px 0', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                    <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-600)' }}>{footerLabel}</div>
                    <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 600 }}>{truncate(footerText, 220)}</div>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 3. THEME CLUSTER (theme-analyst) ===
// 2026-05-23 - Refactored to NU .theme-grid + .theme tiles (themes.html §6.2).
// Equal-weight horizontal columns (3-4 themes), each tile a complete-sentence
// finding with insight, quote, source. Primary theme (index 0) opens with
// brand-red number per "red is a scalpel".
export const ThemeClusterSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    // Universal density axis: dense admits up to 6 columns (web clamps to 6).
    const themes = data.themes.slice(0, Math.min(densityCaps('theme-cluster', density).items, 6));
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Emerging themes</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 24px', display: 'grid', gridTemplateColumns: `repeat(${themes.length}, 1fr)`, gap: 0, borderTop: '1px solid var(--border-subtle)', minHeight: 0, overflow: 'hidden' }}>
                {themes.map((t, i) => (
                    <div
                        key={i}
                        className="art-card"
                        style={{
                            padding: '14px 14px 10px',
                            borderRadius: 0,
                            background: 'transparent',
                            borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                            borderTop: i === 0 ? '3px solid var(--nu-red-600)' : '3px solid transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 7,
                            minWidth: 0,
                            overflow: 'hidden',
                        }}
                    >
                        {(() => {
                            // Per-theme content-true thumbnail (twin of slideToStageHtml themeThumb).
                            // Reads index-aligned data.themeImages[i] first, then themes[i].brandImage.
                            const arr = (data as any).themeImages;
                            const ti = (Array.isArray(arr) && typeof arr[i] === 'string' ? arr[i] : '')
                                || (typeof (t as any).brandImage === 'string' ? (t as any).brandImage : ((t as any).brandImage?.url || ''));
                            return ti ? <img src={ti} alt="" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block', borderRadius: 2, border: '1px solid var(--border-subtle)' }} /> : null;
                        })()}
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: i === 0 ? 'var(--nu-red-600)' : 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <h3 className="art-finding art-finding--sm" style={{ fontSize: webPx(SCALE.lead) }}>{truncate(t.name, 60)}</h3>
                        <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>{truncate(t.insight, 200)}</p>
                        <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={130} />
                        {(!t.quotes || t.quotes.length === 0) && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), color: 'var(--fg-subtle)', marginTop: 'auto', paddingTop: 6, letterSpacing: '.04em' }}>{truncate(t.source, 50)}</div>
                        )}
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 - Refactored to NU primitives. Spotlight = hero theme card with
// brand-red rule + supporting signals list. Patterns: .art-finding for hero
// title, .pq for hero quote, .signal--blue for the pattern strip.
export const ThemeSpotlightSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const all = data.themes.slice(0, Math.min(densityCaps('theme-spotlight', density).items, 6));
    const hero = all[0];
    const supporting = all.slice(1);
    if (!hero) return null;
    const hasSupporting = supporting.length > 0;
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 8 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">{hasSupporting ? 'Emerging theme · Spotlight' : 'Emerging theme'}</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: hasSupporting ? '3fr 2fr' : '1fr', gap: 24, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, borderRight: hasSupporting ? '1px solid var(--border-subtle)' : 'none', paddingRight: hasSupporting ? 16 : 0 }}>
                    {(() => {
                        // Per-theme Nano-Banana thumbnail (twin of slideToStageHtml renderThemeDetail).
                        // Reads themeImages[0] then hero.brandImage. Fixes the detail-template gap where
                        // the image carrier was attached but never painted.
                        const arr = (data as any).themeImages;
                        const ti = (Array.isArray(arr) && typeof arr[0] === 'string' ? arr[0] : '')
                            || (typeof (hero as any).brandImage === 'string' ? (hero as any).brandImage : ((hero as any).brandImage?.url || ''));
                        return ti ? <img src={ti} alt="" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block', borderRadius: 2, border: '1px solid var(--border-subtle)' }} /> : null;
                    })()}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: 'var(--nu-red-600)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>01</div>
                        <h2 className="art-finding" style={{ fontSize: hasSupporting ? webPx(SCALE.name) : webPx(SCALE.subhead), lineHeight: 1.18, flex: 1, minWidth: 0 }}>
                            {truncate(hero.name, hasSupporting ? 90 : 140)}
                        </h2>
                    </div>
                    <p style={{ fontSize: hasSupporting ? webPx(SCALE.body) : webPx(SCALE.lead), color: 'var(--fg-default)', lineHeight: 1.55, margin: 0 }}>{truncate(hero.insight, hasSupporting ? 420 : 600)}</p>
                    <QuoteStack quotes={resolveThemeQuotes(hero)} size="hero" brand={brand} maxChars={hasSupporting ? 280 : 400} />
                    {data.patternSignal && (
                        <div className="art-card" style={{ padding: '9px 12px', borderLeft: '3px solid var(--ink-700)', background: 'var(--bg-subtle)' }}>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3, display: 'flex', alignItems: 'center' }}>
                                <span className="signal signal--blue" style={{ marginRight: 6 }}></span>
                                Pattern signal
                            </div>
                            <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5 }}>{truncate(data.patternSignal, 260)}</div>
                        </div>
                    )}
                    {hero.implication && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 'auto', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-600)' }}>Implication</div>
                            <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 600 }}>{truncate(hero.implication, 220)}</div>
                        </div>
                    )}
                </div>
                {hasSupporting && (
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Supporting signals</div>
                        {supporting.map((t, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10, padding: '10px 0', borderBottom: i < supporting.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                    {String(i + 2).padStart(2, '0')}
                                </span>
                                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ fontWeight: 700, fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.22 }}>{truncate(t.name, 80)}</div>
                                    <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45 }}>{truncate(t.insight, 220)}</div>
                                    <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={160} />
                                    {t.signal && (
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), letterSpacing: '.08em', color: 'var(--nu-red-700)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
                                            Signal · {truncate(t.signal, 60)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 - Refactored. Narrative chain: Spectral display numbers with
// ink-700 connector arrows, columns separated by hairline rules, signal mono
// rows in lieu of brand-red badges (red is reserved for the pattern callout).
export const ThemeArcSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const themes = data.themes.slice(0, Math.min(densityCaps('theme-arc', density).items, 5));
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 6 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Thematic arc</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ padding: '0 28px', display: 'flex', alignItems: 'center', gap: 0, marginTop: 4 }}>
                {themes.map((t, i) => (
                    <React.Fragment key={`n-${i}`}>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: i === 0 ? 'var(--nu-red-600)' : 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                {String(i + 1).padStart(2, '0')}
                            </div>
                        </div>
                        {i < themes.length - 1 && (
                            <div style={{ width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <div style={{ width: '100%', height: 1, background: 'var(--ink-700)' }} />
                                <div style={{ position: 'absolute', right: -1, top: '50%', marginTop: -4, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--ink-700)' }} />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            <div style={{ flex: 1, padding: '6px 28px 0', display: 'grid', gridTemplateColumns: `repeat(${themes.length}, 1fr)`, gap: 0, minHeight: 0, overflow: 'hidden' }}>
                {themes.map((t, i) => (
                    <div key={`c-${i}`} style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 5, borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0 }}>
                        {themeThumbSrc(data, t, i) && (
                            <img src={themeThumbSrc(data, t, i)} alt="" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block', borderRadius: 2, border: '1px solid var(--border-subtle)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <h3 className="art-finding art-finding--sm" style={{ fontSize: webPx(SCALE.body) }}>{truncate(t.name, 70)}</h3>
                        <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>{truncate(t.insight, 280)}</p>
                        <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={140} />
                        {t.signal && (
                            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 5, fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), letterSpacing: '.08em', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.4 }}>
                                Signal · <span style={{ color: 'var(--fg-strong)', textTransform: 'none', fontWeight: 700 }}>{truncate(t.signal, 56)}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {data.patternSignal && (
                <div style={{ margin: '8px 28px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="signal signal--red"></span>
                    <span style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nu-red-700)' }}>Pattern</span>
                    <span style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 500 }}>{truncate(data.patternSignal, 240)}</span>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 - Refactored. 2x2 ivory grid, hairline rules; primary cell
// (index 0) gets brand-red top accent. NU primitive composition only.
export const ThemeMosaicSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const themes = data.themes.slice(0, 4);
    while (themes.length < 4) themes.push({ name: '', insight: '', evidence: '', source: '' });
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 8 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Thematic mosaic</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, margin: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 0, minHeight: 0, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                {themes.map((t, i) => {
                    if (!t.name) return (
                        <div key={i} style={{
                            borderRight: i % 2 === 0 ? '1px solid var(--border-subtle)' : 'none',
                            borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                        }} />
                    );
                    const isPrimary = i === 0;
                    return (
                        <div key={i} style={{
                            padding: '14px 18px 12px',
                            display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', minWidth: 0,
                            borderRight: i % 2 === 0 ? '1px solid var(--border-subtle)' : 'none',
                            borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                            borderTop: isPrimary ? '3px solid var(--nu-red-600)' : '3px solid transparent',
                        }}>
                            {themeThumbSrc(data, t, i) && (
                                <img src={themeThumbSrc(data, t, i)} alt="" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block', borderRadius: 2 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: isPrimary ? 'var(--nu-red-600)' : 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <h3 className="art-finding art-finding--sm" style={{ fontSize: webPx(SCALE.lead), flex: 1 }}>{truncate(t.name, 80)}</h3>
                            </div>
                            <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>{truncate(t.insight, 240)}</p>
                            <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={140} />
                            {t.signal && (
                                <div style={{ marginTop: 'auto', paddingTop: 5, fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), letterSpacing: '.08em', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Signal · <span style={{ color: 'var(--fg-strong)', textTransform: 'none', fontWeight: 700 }}>{truncate(t.signal, 52)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {data.patternSignal && (
                <div style={{ margin: '8px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="signal signal--red"></span>
                    <span style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nu-red-700)' }}>Pattern</span>
                    <span style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 500 }}>{truncate(data.patternSignal, 240)}</span>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 4. COMPETITIVE MATRIX (competitive-analyst) ===
// Expanded density: column definitions under each header, per-row evidence line,
// scale legend at bottom (Absent → Optimized), subject row highlighted.
// 2026-05-23 - Refactored to NU .dtable + .nu-col shading
// (competitive-analysis.html §6.4). NU subject row gets brand-red wash + 2px
// left border so it stands out across the matrix without re-scanning.
export const CompetitiveMatrixSlide: React.FC<{ title: string; data: CompetitiveMatrixData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const max = data.scaleMax || 5;
    // E10 twin parity (2026-10-01): the two-tier PROSE evidence table (rowsProse / prove /
    // implication / evidenceTag / tier / patternLine / peerImages) the export twin renders when
    // two or more prose rows are present; the preview dropped every one of those fields.
    const prose = Array.isArray(data.rowsProse) ? data.rowsProse : [];
    if (prose.length >= 2) {
        const top = prose.filter(r => r.tier !== 'second').slice(0, 3);
        const second = prose.filter(r => r.tier === 'second').slice(0, 6);
        const peerImages = Array.isArray(data.peerImages) ? data.peerImages : [];
        const peerImg = (r: typeof prose[number]) => { const i = prose.indexOf(r); return i >= 0 ? (peerImages[i] || '') : ''; };
        const row = (r: typeof prose[number], isTop: boolean) => (
            <div key={`${isTop ? 't' : 's'}-${r.name}`} style={{ display: 'grid', gridTemplateColumns: '4px 125px 1.05fr 1.15fr 100px', gap: 10, alignItems: 'start', padding: isTop ? '10px 0' : '8px 0', borderBottom: '1px solid var(--border-subtle)', background: isTop ? 'var(--bg-subtle)' : 'transparent' }}>
                <div style={{ width: 4, height: '100%', background: isTop ? 'var(--nu-red-600)' : 'transparent' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: isTop ? 700 : 600, fontSize: webPx(isTop ? SCALE.lead : SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.2 }}>
                    {peerImg(r) && <img src={peerImg(r)} alt="" style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }} />}
                    <span>{truncate(r.name, 24)}</span>
                </div>
                <div style={{ fontSize: webPx(isTop ? SCALE.body : SCALE.caption), lineHeight: 1.32, color: isTop ? 'var(--nu-red-700)' : 'var(--fg-default)', fontWeight: isTop ? 600 : 400 }}>{truncate(r.prove, 110)}</div>
                <div style={{ fontSize: webPx(isTop ? SCALE.caption : SCALE.label), lineHeight: 1.32, color: 'var(--fg-default)' }}>{truncate(r.implication, isTop ? 150 : 120)}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.06em', color: 'var(--fg-muted)', textTransform: 'uppercase', lineHeight: 1.3 }}>{truncate(r.evidenceTag || '', 26)}</div>
            </div>
        );
        return (
            <div className="nu-artifact-stage nu-artifact-stage--slide" data-brand={brand || 'nu'} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="art-masthead" style={{ paddingBottom: 8 }}>
                    <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                        <div className="art-masthead__kicker">Competitive landscape</div>
                        <h1 className="art-masthead__title">{title}</h1>
                    </div>
                </header>
                <div style={{ flex: 1, padding: '0 28px', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '4px 125px 1.05fr 1.15fr 100px', gap: 10, paddingBottom: 5, borderBottom: '2px solid var(--ink-800)', fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.12em', color: 'var(--fg-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        <div /><div>Institution</div><div>What they prove</div><div>Implication</div><div>Evidence</div>
                    </div>
                    {top.map(r => row(r, true))}
                    {second.map(r => row(r, false))}
                    {data.patternLine && (
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'center', background: 'var(--ink-900)', padding: '9px 16px', marginTop: 8 }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.18em', color: 'var(--nu-red-500)', textTransform: 'uppercase', fontWeight: 600 }}>Pattern</div>
                            <div style={{ fontSize: webPx(SCALE.body), lineHeight: 1.36, color: 'var(--white)' }}>{truncate(data.patternLine, 190)}</div>
                        </div>
                    )}
                </div>
                <SourceFooter sources={sources} brand={brand} />
            </div>
        );
    }
    const rows = (Array.isArray(data.rows) ? data.rows : []).slice(0, Math.min(densityCaps('competitive-matrix', density).items, 10));
    const subjectLower = (data.subjectRow || '').toLowerCase();
    const bestPerCol: number[] = data.columns.map((_, ci) => Math.max(...rows.map(r => r.scores[ci] || 0)));
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 8 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Competitive landscape</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', minHeight: 0, overflow: 'hidden' }}>
                <table className="dtable dtable--compact" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '22%' }}>Institution</th>
                            {data.columns.map((c, i) => (
                                <th key={i} className="num" style={{ textAlign: 'center' }}>
                                    <div style={{ lineHeight: 1.2 }}>{truncate(c, 32)}</div>
                                    {data.columnDefs?.[i] && (
                                        <div style={{ fontSize: webPx(SCALE.label), fontWeight: 400, marginTop: 3, color: 'var(--fg-muted)', letterSpacing: 0, textTransform: 'none', lineHeight: 1.3 }}>
                                            {truncate(data.columnDefs[i], 50)}
                                        </div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => {
                            const isSubject = subjectLower && row.name.toLowerCase().includes(subjectLower);
                            return (
                                <tr
                                    key={ri}
                                    style={{
                                        background: isSubject ? 'rgba(200,16,46,0.03)' : undefined,
                                        borderLeft: isSubject ? '2px solid var(--nu-red-600)' : '2px solid transparent',
                                    }}
                                >
                                    <td className="lead">
                                        <div style={{ fontWeight: isSubject ? 700 : 600, fontSize: webPx(SCALE.body), lineHeight: 1.2 }}>{truncate(row.name, 48)}</div>
                                        {row.note && <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 400, color: 'var(--fg-muted)', marginTop: 3, lineHeight: 1.35, fontStyle: 'italic' }}>{truncate(row.note, 90)}</div>}
                                    </td>
                                    {row.scores.map((s, si) => (
                                        <td key={si} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 3 }}>
                                                {Array.from({ length: max }).map((_, di) => (
                                                    <span key={di} style={{ width: 8, height: 8, background: di < s ? (isSubject ? 'var(--nu-red-600)' : 'var(--ink-800)') : 'var(--border-default)' }}></span>
                                                ))}
                                            </div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), fontWeight: 600, color: s === bestPerCol[si] ? 'var(--success-fg)' : s < bestPerCol[si] - 1 ? 'var(--nu-red-700)' : 'var(--fg-muted)' }}>
                                                {s}/{max}{s < bestPerCol[si] ? ` · −${bestPerCol[si] - s}` : ''}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {data.scaleLabels && data.scaleLabels.length === max && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), color: 'var(--fg-muted)', letterSpacing: '.04em', paddingLeft: '22%', paddingTop: 6 }}>
                        {data.scaleLabels.map((l, i) => (
                            <span key={i} style={{ flex: 1, textAlign: 'center' }}>L{i + 1} · {truncate(l, 16)}</span>
                        ))}
                    </div>
                )}
                {data.insight && (
                    <div className="art-card" style={{ marginTop: 8, padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)', fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5 }}>
                        {truncate(data.insight, 280)}
                    </div>
                )}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 5. BLOCK QUOTE (evidence-curator) - denser with context + corroborating data ===
// 2026-05-23 - Refactored to NU .pq pull-quote primitive (GUIDE §5).
// Spectral italic with brand-red left rule, attribution row below, optional
// corroborating-data .art-card sidebar, implication line in footer.
export const BlockQuoteSlide: React.FC<{ data: BlockQuoteData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ data, sources = [], brand, density }) => {
    // E10 twin parity (2026-10-01): the DENSE three-voice layout (additionalQuotes + synthesis
    // band, GOLD block-quote-dense NU 199:3 / NXT 322:3) the export twin routes to at two or
    // more additional voices; the preview dropped both fields.
    const extra = Array.isArray(data.additionalQuotes) ? data.additionalQuotes : [];
    if (data.text && extra.length >= 2) {
        const voices = [{ text: data.text, attribution: data.attribution, role: data.role, source: data.source }, ...extra.slice(0, 2)];
        const synthesis = data.synthesis || data.implication || '';
        return (
            <div className="nu-artifact-stage nu-artifact-stage--slide" data-brand={brand || 'nu'} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="art-masthead" style={{ paddingBottom: 10 }}>
                    <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                        <div className="art-masthead__kicker">{data.context || 'Three voices converge'}</div>
                    </div>
                </header>
                <div style={{ flex: 1, padding: '0 30px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 13, minHeight: 0, overflow: 'hidden' }}>
                    {voices.map((v, i) => (
                        <div key={i} style={{ borderLeft: '2px solid var(--nu-red-600)', padding: '11px 13px 10px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: webPx(SCALE.subhead), lineHeight: 1, color: 'var(--nu-red-600)' }}>“</div>
                            <div style={{ fontSize: webPx(SCALE.lead), lineHeight: 1.5, color: 'var(--fg-strong)', fontStyle: 'italic' }}>{smartQuoteClip(v.text || '', 210)}</div>
                            <div style={{ marginTop: 'auto', fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.12em', color: 'var(--fg-strong)', textTransform: 'uppercase', fontWeight: 600 }}>{truncate(v.attribution || '', 36)}</div>
                            {v.source && <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.06em', color: 'var(--nu-teal-600, var(--fg-muted))', textTransform: 'uppercase' }}>{truncate(v.source, 44)}</div>}
                            {v.role && <div style={{ fontSize: webPx(SCALE.label), lineHeight: 1.35, color: 'var(--fg-muted)' }}>{truncate(v.role, 50)}</div>}
                        </div>
                    ))}
                </div>
                {synthesis && (
                    <div style={{ margin: '8px 30px 0', display: 'grid', gridTemplateColumns: '150px 1fr', gap: 14, alignItems: 'center', background: 'var(--bg-subtle)', padding: '10px 16px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.18em', color: 'var(--nu-red-700)', textTransform: 'uppercase', fontWeight: 600 }}>Where they converge</div>
                        <div style={{ fontSize: webPx(SCALE.lead), lineHeight: 1.46, color: 'var(--fg-strong)', fontWeight: 600 }}>{truncate(synthesis, 200)}</div>
                    </div>
                )}
                <SourceFooter sources={[data.source, ...sources.filter(s => s !== data.source)]} brand={brand} />
            </div>
        );
    }
    const hasSidebar = !!(data.corroboratingData && data.corroboratingData.length > 0);
    const quoteText = data.text || '';
    const qLen = quoteText.length;
    const baseQuoteSize = hasSidebar
        ? (qLen > 340 ? 15 : qLen > 220 ? 18 : qLen > 140 ? 20 : 22)
        : (qLen > 280 ? 18 : qLen > 180 ? 22 : qLen > 110 ? 26 : 28);
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">{data.context || 'Verbatim evidence'}</div>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 30px', display: 'grid', gridTemplateColumns: hasSidebar ? '2fr 1fr' : '1fr', gap: 26, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                    <blockquote
                        className="pq"
                        style={{
                            margin: 0,
                            paddingLeft: 18,
                            borderLeft: '3px solid var(--nu-red-600)',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 300,
                            fontStyle: 'italic',
                            fontSize: baseQuoteSize,
                            color: 'var(--fg-strong)',
                            lineHeight: 1.35,
                            letterSpacing: '-0.005em',
                        }}
                    >
                        “{smartQuoteClip(quoteText, hasSidebar ? 460 : 520)}”
                    </blockquote>
                    {data.contextParagraph && (
                        <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.55, margin: 0, paddingLeft: 18, borderLeft: '1px solid var(--border-subtle)' }}>
                            {truncate(data.contextParagraph, 480)}
                        </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto' }}>
                        <div style={{ width: 40, height: 1, background: 'var(--nu-red-600)' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: webPx(SCALE.lead), color: 'var(--fg-strong)' }}>{data.attribution}</div>
                            {data.role && <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.body), color: 'var(--fg-muted)', marginTop: 2, letterSpacing: '.04em' }}>{data.role}</div>}
                        </div>
                        <span className="pill pill--brand" style={{ marginLeft: 6 }}>verbatim</span>
                    </div>
                </div>
                {hasSidebar && (
                    <aside className="art-card" style={{ padding: '14px 16px', borderTop: '3px solid var(--nu-red-600)', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Corroborating data</div>
                        {(data.corroboratingData || []).slice(0, Math.min(densityCaps('block-quote', density).sub, 5)).map((d, i) => (
                            <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', paddingTop: i > 0 ? 10 : 0 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: webPx(SCALE.subhead), color: 'var(--nu-red-700)', lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {d.value}
                                </div>
                                <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', marginTop: 4, lineHeight: 1.4 }}>{truncate(d.label, 100)}</div>
                                {d.source && (
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), letterSpacing: '.08em', color: 'var(--fg-subtle)', marginTop: 3, textTransform: 'uppercase' }}>{truncate(d.source, 40)}</div>
                                )}
                            </div>
                        ))}
                    </aside>
                )}
            </div>
            {data.implication && (
                <div style={{ padding: '8px 30px 0', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                    <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-600)' }}>Implication</div>
                    <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 600 }}>{truncate(data.implication, 260)}</div>
                </div>
            )}
            <SourceFooter sources={[data.source, ...sources.filter(s => s !== data.source)]} brand={brand} />
        </div>
    );
};

// === 6. CASE STUDY (case-study-analyst) ===
// 2026-06-10 - Rebuilt on the GOLD frame from the live Figma design-system
// files (NXT 212:2/217:2, NU 91:2/93:2). Three deep-dive variants per the
// case-study learned constraint (diversify layouts, never repeat one):
//   before-after   - two wash panels (warn/cool) + arrow + RESULT/quote row
//   evidence-stack - CONVERGENT EVIDENCE rows (bar + quote + WHAT IT SHOWS)
//   four-block     - CHALLENGE/APPROACH/OUTCOME blocks + KEY OUTCOME panel
// Variant resolves from data.variant, else inferred from payload shape.
// All geometry is the Figma 1920-frame divided by 2; brand skin rides on
// tokens (RAIL / KICKER / ACCENT_WARN / ACCENT_COOL / WASH_* / BAND).
export const CaseStudySlide: React.FC<{ title: string; data: CaseStudyData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const _cc = densityCaps('case-study', density);
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    const mono = `'${T.FONT_MONO}', monospace`;
    const body = `'${T.FONT_BODY}', sans-serif`;
    const titleFont = `'${T.FONT_TITLE}', ${isNu ? 'serif' : 'sans-serif'}`;
    const titleWeight = Number(T.TITLE_WEIGHT) || 600;

    const variant: NonNullable<CaseStudyData['variant']> =
        data.variant
        || (data.beforeAfter ? 'before-after' : (data.evidence && data.evidence.length > 0) ? 'evidence-stack' : 'four-block');

    // GOLD masthead pieces
    const kicker = `CASE STUDY · ${truncate(data.subject, 40)}`;
    const metaParts: string[] = [];
    if (data.subjectMeta) metaParts.push(truncate(data.subjectMeta, 90));
    if (data.timeframe) metaParts.push(`TIMEFRAME  ${truncate(data.timeframe, 40)}`);
    if (data.investment) metaParts.push(`INVESTMENT  ${truncate(data.investment, 50)}`);
    const meta = metaParts.join('          ');
    // four-block renders LESSON as its own accent-bar block (per the
    // case-study/layout constraint), so the band falls back to implication
    // only; the other variants keep the lesson fallback.
    const isFourBlock = !data.beforeAfter && !(data.evidence && data.evidence.length > 0) && (!data.variant || data.variant === 'four-block');
    const takeaway = data.takeaway || (isFourBlock ? data.implication : (data.lesson || data.implication));

    const monoLabel = (text: string, color: string): React.ReactNode => (
        <div style={{ fontFamily: mono, fontWeight: 600, fontSize: webPx(SCALE.label), letterSpacing: '1px', color, textTransform: 'uppercase' }}>{text}</div>
    );
    const sourceLine = (text: string): React.ReactNode => (
        <div style={{ fontFamily: mono, fontWeight: 500, fontSize: webPx(SCALE.label), letterSpacing: '0.5px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase' }}>SOURCE: {truncate(text, 60)}</div>
    );

    let bodyContent: React.ReactNode = null;

    if (variant === 'before-after' && data.beforeAfter) {
        const ba = data.beforeAfter;
        const quote = data.pullQuote ? prepQuote({ text: data.pullQuote.text, attribution: data.pullQuote.attribution }) : null;
        // 2026-06-29 FIELD-TOLERANT (matches slideToStageHtml): before/after may be a
        // bare string OR {label, headline, points[]}. A string becomes the panel body so
        // a string payload no longer renders an empty wash panel (State Street live bug).
        const panel = (side: any, tone: 'warn' | 'cool') => {
            const accent = hex(tone === 'warn' ? T.ACCENT_WARN : T.ACCENT_COOL);
            const wash = hex(tone === 'warn' ? T.WASH_WARN : T.WASH_COOL);
            const isStr = typeof side === 'string';
            const headline = isStr ? '' : String(side?.headline || '');
            let points: string[] = (!isStr && Array.isArray(side?.points)) ? side.points.slice(0, _cc.items) : [];
            if (points.length === 0) {
                const bodyStr = isStr ? side : String(side?.state || side?.body || side?.summary || side?.text || '');
                if (bodyStr.trim()) points = [bodyStr.trim()];
            }
            return (
                <div style={{ flex: 1, minWidth: 0, background: wash, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {monoLabel((!isStr && side?.label) || (tone === 'warn' ? 'BEFORE' : 'AFTER'), accent)}
                    {headline ? <div style={{ fontFamily: titleFont, fontWeight: titleWeight, fontSize: webPx(SCALE.lead), color: hex(T.INK), lineHeight: 1.15 }}>{truncate(headline, 60)}</div> : null}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0, paddingBottom: 2, gap: 5 }}>
                        {points.map((p, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ width: 4, height: 4, background: accent, flexShrink: 0, marginTop: 3 }} />
                                <span style={{ fontFamily: body, fontSize: webPx(SCALE.label), lineHeight: 1.4, color: hex(T.INK) }}>{truncate(p, 140)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };
        bodyContent = (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 8 }}>
                <div style={{ display: 'flex', gap: 13, flex: 1, minHeight: 0 }}>
                    {panel(ba.before, 'warn')}
                    <div style={{ alignSelf: 'center', fontFamily: body, fontSize: webPx(SCALE.subhead), color: hex(T.GREY), width: 22, textAlign: 'center', flexShrink: 0 }}>→</div>
                    {panel(ba.after, 'cool')}
                </div>
                {(ba.result || quote) && (
                    <div style={{ display: 'flex', gap: 24 }}>
                        {ba.result && (
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {monoLabel('RESULT', hex(T.GREY))}
                                <div style={{ fontFamily: body, fontSize: webPx(SCALE.caption), lineHeight: 1.42, color: hex(T.INK) }}>{truncate(ba.result, 220)}</div>
                            </div>
                        )}
                        {quote && (
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 7 }}>
                                <div style={{ width: 2, background: hex(T.ACCENT_COOL), flexShrink: 0 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                                    <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), lineHeight: 1.42, color: hex(T.INK) }}>“{smartQuoteClip(quote.text, 140)}”</div>
                                    {data.pullQuote?.attribution && sourceLine(data.pullQuote.attribution)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    } else if (variant === 'evidence-stack' && data.evidence && data.evidence.some((e: any) => String(e?.quote || e?.text || e?.evidence || e?.q || '').trim())) {
        // Field-tolerant + empty-drop (2026-06-28): read quote aliases, drop rows with no
        // resolvable quote so no empty "" bubble renders (budget-model output guard).
        const qOf = (e: any): string => String(e?.quote || e?.text || e?.evidence || e?.q || '').trim();
        const sOf = (e: any): string => String(e?.shows || e?.whatItShows || e?.meaning || e?.takeaway || '').trim();
        const rows = data.evidence.filter((e: any) => qOf(e)).slice(0, _cc.sub);
        const qFs = rows.length >= 4 ? 10.5 : 12;   // 4 rows = slightly smaller quotes
        bodyContent = (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 8 }}>
                {monoLabel('CONVERGENT EVIDENCE', hex(T.GREY))}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                    {rows.map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                            <div style={{ width: 2, background: hex(T.ACCENT_COOL), flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <div style={{ fontFamily: body, fontSize: qFs, lineHeight: 1.34, color: hex(T.INK) }}>“{smartQuoteClip(qOf(e), 220)}”</div>
                                {sourceLine(e.source)}
                            </div>
                            {sOf(e) && (
                                <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ fontFamily: mono, fontWeight: 600, fontSize: webPx(SCALE.label), letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>WHAT IT SHOWS</div>
                                    <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), lineHeight: 1.42, color: hex(T.INK) }}>{truncate(sOf(e), 160)}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    } else {
        // four-block default - CHALLENGE/APPROACH/OUTCOME (+LESSON in band) on
        // the left, KEY OUTCOME dark panel on the right.
        const hasRightPanel = !!(data.keyMetric || data.supportingMetrics?.length || data.pullQuote || data.comparables?.length);
        bodyContent = (
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: hasRightPanel ? '1.9fr 1fr' : '1fr', gap: 13, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {[
                        { label: 'Challenge', text: data.challenge, accent: hex(T.ACCENT_WARN), wash: hex(T.WASH_WARN) },
                        { label: 'Approach', text: data.approach, accent: hex(T.INK), wash: hex(T.PANEL) },
                        { label: 'Outcome', text: data.outcome, accent: hex(T.ACCENT_COOL), wash: hex(T.WASH_COOL) },
                        // LESSON is the 4th accent-bar block per the case-study/layout
                        // constraint (2026-06-10 density uplift; was relegated to the band).
                        // NU uses the premium gold accent per the Figma exemplar (136:2).
                        { label: 'Lesson', text: data.lesson, accent: hex(T.GOLD_ACCENT), wash: hex(T.PALE) },
                    ].filter(b => b.text).map((b, i) => (
                        <div key={i} style={{ flex: 1, display: 'grid', gridTemplateColumns: '76px 1fr', gap: 10, padding: '8px 12px', background: b.wash, borderLeft: `3px solid ${b.accent}`, minWidth: 0 }}>
                            <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), fontWeight: 600, letterSpacing: '1px', color: b.accent, textTransform: 'uppercase' }}>{b.label}</div>
                            <div style={{ fontFamily: body, fontSize: webPx(SCALE.caption), color: hex(T.INK), lineHeight: 1.45 }}>{truncate(b.text, 460)}</div>
                        </div>
                    ))}
                </div>
                {hasRightPanel && (
                    <aside style={{ background: hex(T.TEAL), padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, overflow: 'hidden' }}>
                        {/* USER OVERRIDE 2026-06-28 scenes-where-they-fit: per-case EMOTIVE scene.
                            Figma slot 890:357 (544x300) crowns the four-block right panel; NU twin
                            625:314 inherits. Reads caseStudy.panelImage (registry case-study/panel/emotive). */}
                        {data.panelImage && (
                            <img
                                src={data.panelImage}
                                alt=""
                                style={{ width: '100%', aspectRatio: '544 / 300', objectFit: 'cover', display: 'block', borderRadius: 4 }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                        {data.keyMetric && (
                            <div>
                                <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: hex(T.CHARTREUSE), marginBottom: 4 }}>Key outcome</div>
                                <div style={{ fontFamily: titleFont, fontWeight: titleWeight, fontSize: heroNumberSize(data.keyMetric.value, { max: 30, min: 14, baseChars: 4 }), color: hex(T.WHITE), lineHeight: 1.05, overflow: 'hidden' }}>
                                    {data.keyMetric.value}
                                </div>
                                <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 1.4 }}>{truncate(data.keyMetric.label, 90)}</div>
                            </div>
                        )}
                        {data.supportingMetrics && data.supportingMetrics.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: data.supportingMetrics.length > 1 ? '1fr 1fr' : '1fr', gap: 8, borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 8 }}>
                                {data.supportingMetrics.slice(0, 4).map((m, i) => (
                                    <div key={i} style={{ minWidth: 0 }}>
                                        <div style={{ fontFamily: titleFont, fontWeight: titleWeight, fontSize: heroNumberSize(m.value, { max: 15, min: 10, baseChars: 4 }), color: hex(T.CHARTREUSE), lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.value}</div>
                                        <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), color: 'rgba(255,255,255,0.72)', marginTop: 2, lineHeight: 1.35 }}>{truncate(m.label, 60)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.comparables && data.comparables.length > 0 && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 8, minWidth: 0, overflow: 'hidden' }}>
                                <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: hex(T.CHARTREUSE), marginBottom: 4 }}>Comparables</div>
                                {data.comparables.slice(0, 2).map((c, i) => (
                                    <div key={i} style={{ marginBottom: 4, minWidth: 0 }}>
                                        <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), color: hex(T.WHITE), fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncate(c.name, 36)}</div>
                                        <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), color: 'rgba(255,255,255,0.72)', lineHeight: 1.4, marginTop: 1 }}>{truncate(c.outcome, 64)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.pullQuote && (
                            // Fixed gap, not marginTop:'auto' - the auto-spaced quote
                            // collided with comparables in export re-measure (2026-05-25).
                            <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 8, minWidth: 0 }}>
                                <div style={{ fontFamily: body, fontSize: webPx(SCALE.label), color: 'rgba(255,255,255,0.92)', lineHeight: 1.45, borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, paddingLeft: 8 }}>
                                    “{smartQuoteClip(data.pullQuote.text, 160)}”
                                </div>
                                <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), color: hex(T.CHARTREUSE), marginTop: 4, paddingLeft: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    SOURCE: {truncate(data.pullQuote.attribution, 50)}{data.pullQuote.role ? `, ${truncate(data.pullQuote.role, 40)}` : ''}
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>
        );
    }

    return (
        <GoldFrame brand={brand} kicker={kicker} title={title} meta={meta} takeaway={takeaway}>
            {bodyContent}
        </GoldFrame>
    );
};

// === 7. PRINCIPLES (strategy-author) ===
// 2026-05-23 - Refactored to NU artifact primitives. Each principle becomes
// an .art-card with a Spectral display number (token-driven, brand-red),
// .art-finding for the principle name (complete-sentence finding per
// GUIDE.md §1 "sentence-case findings"), and small body for the description.
// Layout: vertical list separated by 1-px rules (no card chrome - matches
// the NU document density rule).
export const PrinciplesSlide: React.FC<{ title: string; data: PrinciplesData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const items = data.items.slice(0, Math.min(densityCaps('principles', density).items, 8));
    // E10 twin parity (2026-10-01): the `diptych` variant (two dark numbered problem panels, GOLD
    // slides pages NU 103:2 / NXT 324:2) the export twin renders; the preview ignored `variant`.
    if (data.variant === 'diptych' && items.length >= 2) {
        const Td = resolveT(brand);
        return (
            <div className="nu-artifact-stage nu-artifact-stage--slide" data-brand={brand || 'nu'} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="art-masthead" style={{ paddingBottom: 12 }}>
                    <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                        <div className="art-masthead__kicker">Two challenges</div>
                        <h1 className="art-masthead__title">{title}</h1>
                    </div>
                </header>
                <div style={{ flex: 1, padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignContent: 'center', minHeight: 0 }}>
                    {items.slice(0, 2).map((p, i) => (
                        <div key={i} style={{ position: 'relative', background: hex(Td.INK), padding: '22px 24px', minHeight: 190, overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: hex(Td.CHARTREUSE) }} />
                            <div style={{ fontFamily: `'${Td.FONT_DISPLAY}', sans-serif`, fontWeight: 600, fontSize: webPx(SCALE.subhead), color: hex(Td.CHARTREUSE), lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                            <div style={{ fontFamily: `'${Td.FONT_TITLE}', sans-serif`, fontWeight: Number(Td.TITLE_WEIGHT) || 600, fontSize: webPx(SCALE.subhead), lineHeight: 1.2, color: hex(Td.WHITE), marginTop: 4 }}>{truncate(p.name, 44)}</div>
                            <div style={{ fontSize: webPx(SCALE.body), lineHeight: 1.46, color: 'rgba(255,255,255,0.82)', marginTop: 7 }}>{truncate(p.description, 290)}</div>
                        </div>
                    ))}
                </div>
                <SourceFooter sources={sources} brand={brand} />
            </div>
        );
    }
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 12 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Guiding principles</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ padding: '0 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {items.map((p, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '56px 1fr',
                            gap: 20,
                            alignItems: 'baseline',
                            padding: '12px 0',
                            borderTop: '1px solid var(--border-subtle)',
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 300,
                                fontSize: webPx(SCALE.subhead),
                                color: 'var(--nu-red-600)',
                                lineHeight: 0.95,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h3 className="art-finding art-finding--sm" style={{ marginBottom: 4 }}>
                                {truncate(p.name, 90)}
                            </h3>
                            <p style={{ fontSize: webPx(SCALE.lead), color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>
                                {truncate(p.description, 220)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 8. STAT ROW (benchmark-reporter) ===
// 2026-05-23 - Refactored to NU artifact primitives (.stat-strip, .stat,
// .stat__label, .stat__value, .art-card, .nu-artifact-stage--slide).
// Pattern: each renderer wraps in `.nu-artifact-stage nu-artifact-stage--slide`
// so the shared CSS resets + slide-size overrides apply locally, then composes
// only NU classes for layout/typography. Token references resolve via
// var(--*) - no hex colors hard-coded. PPTX exporter in pptx.ts is unchanged
// (it draws shapes from data, not CSS classes).
//
// Per GUIDE.md §5: stat-strip = 3-6 stats; .stat__value carries Spectral Light
// 300 hero number; .stat__label is 10px uppercase; .stat__delta--up/--down
// adds the triangle + directional color.
export const StatRowSlide: React.FC<{ title: string; data: StatRowData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const stats = data.stats.slice(0, Math.min(densityCaps('stat-row', density).items, 4));
    // Brand kicker - NU shows "By the numbers · {brand}", NXT keeps minimal.
    const kicker = 'By the numbers';
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">{kicker}</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: data.convergentInsight ? 'none' : 1, padding: '0 24px', display: 'flex' }}>
                <div className="stat-strip" style={{ flex: 1 }}>
                    {stats.map((s, i) => {
                        // Split a numeric value from its trailing unit (e.g. "11 days" → 11 + "days").
                        const m = String(s.value).match(/^(.+?)([%]|\s+[A-Za-z]+.*)?$/);
                        const head = m ? m[1].trim() : s.value;
                        const unit = m && m[2] ? m[2].trim() : '';
                        return (
                            <div className="stat" key={i}>
                                <div className="stat__label">{truncate(s.label, 80)}</div>
                                <div className="stat__value">
                                    {head}
                                    {unit && <span className="u"> {unit}</span>}
                                </div>
                                {s.meaning && (
                                    <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45, marginTop: 6 }}>
                                        <span style={{ fontSize: webPx(SCALE.caption), letterSpacing: '.12em', color: 'var(--fg-muted)', fontWeight: 600, marginRight: 6, textTransform: 'uppercase' }}>Means</span>
                                        {truncate(s.meaning, 140)}
                                    </div>
                                )}
                                {s.matters && (
                                    <div className="stat__delta" style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45, marginTop: 4 }}>
                                        <span style={{ fontSize: webPx(SCALE.caption), letterSpacing: '.12em', color: 'var(--nu-red-600)', fontWeight: 700, marginRight: 6, textTransform: 'uppercase' }}>Matters</span>
                                        {truncate(s.matters, 140)}
                                    </div>
                                )}
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), color: 'var(--fg-subtle)', marginTop: 'auto', letterSpacing: '.06em', textTransform: 'uppercase', paddingTop: 6 }}>
                                    {truncate(s.source, 60)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Convergent insight = .art-card with brand-red left rule (the GUIDE §5 callout pattern) */}
            {data.convergentInsight && (
                <div style={{ padding: '8px 24px 0' }}>
                    <div className="art-card" style={{ borderLeft: '3px solid var(--nu-red-600)', padding: '12px 18px' }}>
                        <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--nu-red-700)', marginBottom: 6 }}>
                            Convergent insight
                        </div>
                        <div style={{ fontSize: webPx(SCALE.lead), color: 'var(--fg-strong)', lineHeight: 1.55 }}>
                            {truncate(data.convergentInsight, 320)}
                        </div>
                        {data.patternSignal && (
                            <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontSize: webPx(SCALE.caption), letterSpacing: '.16em', color: 'var(--fg-muted)', fontWeight: 700, marginRight: 8, textTransform: 'uppercase' }}>Pattern</span>
                                {truncate(data.patternSignal, 240)}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 9. TIMELINE (roadmap-builder) ===
// 2026-05-23 - Refactored. NU roadmap-style .horizon columns: each phase is
// a column with a ringed-dot marker on a hairline rule; first phase carries
// brand-red dot; item list uses NU bullet markers.
export const TimelineSlide: React.FC<{ title: string; data: TimelineData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const _tc = densityCaps('timeline', density);
    const phases = data.phases.slice(0, Math.min(_tc.items, 6));
    // E10 twin parity (2026-10-01): the role x horizon card grid (rows[].role / rows[].cells, the
    // NU_Giving aggregate roadmap) the export twin draws at two or more rows; phases[] then
    // supplies the horizon headers. The preview dropped rows, role and cells.
    const roleRows = Array.isArray(data.rows) ? data.rows : [];
    if (roleRows.length >= 2 && phases.length >= 2) {
        const horizons = phases.slice(0, 4).map(ph => ph.name || '');
        return (
            <div className="nu-artifact-stage nu-artifact-stage--slide" data-brand={brand || 'nu'} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="art-masthead" style={{ paddingBottom: 12 }}>
                    <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                        <div className="art-masthead__kicker">Program roadmap</div>
                        <h1 className="art-masthead__title">{title}</h1>
                    </div>
                </header>
                <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: `110px repeat(${horizons.length}, 1fr)`, gap: 9, alignContent: 'start', minHeight: 0, overflow: 'hidden' }}>
                    <div />
                    {horizons.map((h, i) => (
                        <div key={`h-${i}`} style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.14em', color: i === horizons.length - 1 ? 'var(--nu-red-600)' : 'var(--fg-muted)', textTransform: 'uppercase', fontWeight: 600, paddingBottom: 5, borderBottom: '2px solid var(--ink-800)' }}>{truncate(h, 22)}</div>
                    ))}
                    {roleRows.slice(0, 4).map((r, ri) => ([
                        <div key={`r-${ri}`} style={{ fontWeight: 700, fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', paddingTop: 9 }}>{truncate(r.role, 20)}</div>,
                        ...(r.cells || []).slice(0, horizons.length).map((c, ci) => (
                            <div key={`c-${ri}-${ci}`} style={{ position: 'relative', background: 'var(--bg-subtle)', padding: '12px 11px 9px', minHeight: 64, overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: ci === horizons.length - 1 ? 'var(--ink-800)' : 'var(--nu-red-600)' }} />
                                <p style={{ margin: 0, fontSize: webPx(SCALE.caption), lineHeight: 1.38, color: 'var(--fg-default)' }}>{truncate(c, 90)}</p>
                            </div>
                        )),
                    ])).flat()}
                </div>
                <SourceFooter sources={sources} brand={brand} />
            </div>
        );
    }
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 12 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Roadmap</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${phases.length}, 1fr)`, gap: 12 }}>
                    <div style={{ position: 'absolute', top: 7, left: 8, right: 8, height: 1, background: 'var(--border-default)' }} />
                    <div style={{ position: 'absolute', top: 7, left: 8, width: `${(100 / phases.length) * 0.5}%`, height: 1, background: 'var(--nu-red-600)' }} />
                    {phases.map((_, i) => (
                        <div key={i} style={{ position: 'relative', height: 16, display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? 'var(--nu-red-600)' : 'var(--bg-surface)', border: `2px solid ${i === 0 ? 'var(--nu-red-600)' : 'var(--border-default)'}`, zIndex: 1 }} />
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1, marginTop: 8, display: 'grid', gridTemplateColumns: `repeat(${phases.length}, 1fr)`, gap: 12, minHeight: 0 }}>
                    {phases.map((ph, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px', minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), fontWeight: 600, letterSpacing: '.14em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                                Phase {String(i + 1).padStart(2, '0')}{ph.duration ? ` · ${ph.duration}` : ''}
                            </div>
                            <h3 className="art-finding art-finding--sm" style={{ fontSize: webPx(SCALE.lead) }}>{ph.name}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {ph.items.slice(0, Math.min(_tc.sub, 6)).map((item, ii) => (
                                    <li key={ii} style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45, paddingLeft: 12, position: 'relative' }}>
                                        <span className="signal signal--neutral" style={{ position: 'absolute', left: 0, top: 6 }}></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 10. SECTION DIVIDER (deck-composer) ===
// 2026-05-23 - Refactored to NU's "arc-section" archetype (strategy-deck.html
// §02): ink-900 background with ghost type, Spectral display title, mono
// section counter, brand-red detail accent. Goes full-bleed; no masthead.
export const SectionDividerFullBleed: React.FC<{ data: SectionDividerData; brand?: Brand; dividerOrdinal?: number }> = ({ data, brand, dividerOrdinal }) => {
    const ctxPos = React.useContext(DeckPositionContext);
    const ordinal = dividerOrdinal ?? ctxPos.dividerOrdinal;

    // SLIDE-SYSTEM VARIANT (NU_Giving): single-sentence thesis interstitial.
    if (data.variant === 'thesis') {
        const Tt = brand || nxtBrand;
        // 2026-10-01 - DECIEM thesis = black canvas, uppercase Poppins Bold, boxed lockup (brand art block).
        const ttArt = !!getBrandArt(Tt.BRAND_ID);
        const ttXform = (ttArt && Tt.TITLE_TRANSFORM && Tt.TITLE_TRANSFORM !== 'none') ? (Tt.TITLE_TRANSFORM as any) : undefined;
        return (
            <div data-brand={normalizeBrandId(Tt.BRAND_ID)} style={{ width: '100%', aspectRatio: '16/9', background: hex(Tt.INK), display: 'flex', alignItems: 'center', padding: '0 7%', boxSizing: 'border-box', position: 'relative' }}>
                {ttArt && <BrandLockup T={Tt} color={hex(Tt.WHITE)} />}
                <div style={{ fontFamily: `'${Tt.FONT_DISPLAY}', sans-serif`, fontWeight: ttArt ? (Number(Tt.TITLE_WEIGHT) || 700) : 600, fontSize: 'clamp(22px, 4.6vw, 52px)', lineHeight: 1.12, color: hex(Tt.WHITE), maxWidth: '82%', textTransform: ttXform }}>{data.title}</div>
            </div>
        );
    }
    // 2026-06-14 - BRAND-AWARE. This renderer used to hardcode NU: data-brand
    // defaulted to 'nu', the rule/kicker used var(--nu-red-*), and the footer
    // literally said "Northeastern · Advancement" - so a #NXT deck showed NU
    // section-dividers while every sibling template (which consumes the brand
    // prop) rendered NXT. The mixed-brand deck the user flagged. Now it resolves
    // tokens from the brand prop exactly like GoldFrame: rule + kicker use the
    // brand accent (hex(T.KICKER)), fonts come from the brand, and the seal text
    // switches on isNu.
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    // 2026-10-01 - DECIEM section divider: the brand art block assigns the 'section' canvas (a solid
    // pop fill rotating cyan / purple / pink / orange, picked by the SAME title hash as the export
    // twin) with the fill's text color and the boxed lockup; title uppercase per TITLE_TRANSFORM.
    const sdArt = !!getBrandArt(T.BRAND_ID);
    const sdDivider = sdArt && brandCanvasFor(T.BRAND_ID, 'section') === 'pop' ? brandDividerFill(T.BRAND_ID, data.title || '', ordinal) : null;
    const sdBg = sdDivider ? sdDivider.fill : hex(T.INK);
    const sdText = sdDivider ? sdDivider.text : hex(T.WHITE);
    const sdAccent = sdDivider ? sdDivider.text : hex(T.KICKER);
    const sdXform = (sdArt && T.TITLE_TRANSFORM && T.TITLE_TRANSFORM !== 'none') ? (T.TITLE_TRANSFORM as any) : undefined;
    return (
        <div
            className="nu-artifact-stage"
            data-brand={normalizeBrandId(T.BRAND_ID)}
            style={{
                width: 960, height: 540, position: 'relative', overflow: 'hidden',
                background: sdBg,
                padding: '48px 64px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
        >
            {sdArt && <BrandLockup T={T} color={sdText} />}
            {/* Ghost number - large faded display numeral behind the foreground */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: 40,
                    right: 64,
                    fontFamily: `'${T.FONT_DISPLAY}', sans-serif`,
                    fontWeight: 200,
                    fontSize: heroNumberSize(data.number, { max: 280, min: 140, baseChars: 2 }),
                    color: 'rgba(255,255,255,0.04)',
                    lineHeight: 0.8,
                    letterSpacing: '-0.05em',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                }}
            >
                {data.number}
            </div>
            {/* Top - SECTION kicker + brand accent rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 36, height: 2, background: sdAccent }} />
                <span style={{ fontFamily: `'${T.FONT_MONO}', monospace`, fontSize: webPx(SCALE.body), fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: sdAccent }}>
                    Section · {data.number}
                </span>
            </div>
            {/* Bottom - title + subtitle in the brand display face */}
            <div style={{ maxWidth: '92%', position: 'relative' }}>
                <h1 style={{
                    fontFamily: `'${T.FONT_DISPLAY}', sans-serif`,
                    fontWeight: Number(T.TITLE_WEIGHT) || 600,
                    fontSize: data.title.length > 40 ? 48 : data.title.length > 28 ? 56 : 64,
                    color: sdText,
                    lineHeight: 1.05,
                    letterSpacing: sdArt ? '0' : '-0.02em',
                    margin: 0,
                    textTransform: sdXform,
                }}>
                    {data.title}
                </h1>
                {data.subtitle && (
                    <p style={{ fontSize: webPx(SCALE.name), color: sdDivider ? sdText : 'rgba(255,255,255,0.7)', opacity: sdDivider ? 0.78 : undefined, marginTop: 16, fontWeight: 300, lineHeight: 1.45, maxWidth: '70ch' }}>
                        {truncate(data.subtitle, 180)}
                    </p>
                )}
            </div>
            {/* Brand seal bottom right */}
            <div style={{ position: 'absolute', bottom: 32, right: 64, fontFamily: `'${T.FONT_MONO}', monospace`, fontSize: webPx(SCALE.body), letterSpacing: '.16em', color: sdDivider ? sdText : 'rgba(255,255,255,0.3)', opacity: sdDivider ? 0.5 : undefined, textTransform: 'uppercase' }}>
                {T.SEAL_LABEL}
            </div>
        </div>
    );
};

// === 11. SERVICE BLUEPRINT (service-blueprint-mapper / journey_stage) ===
// 2026-05-23 - Refactored to NU .blueprint / .bp-row / .bp-cell pattern
// (service-blueprint.html §6.3). Bitner 5-lane model:
// Customer (highlighted, brand-red rule) → Frontstage → Backstage → Support
// → Fail points (brand-red top border, NU red wash on fail cells). Mood
// shows the NU emotion-icon mapping via signal dots, no emoji.
export const ServiceBlueprintSlide: React.FC<{ title: string; data: ServiceBlueprintData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    // 2026-06-11 - GOLD uplift. This renderer was the last nu-artifact-stage
    // holdout: Spectral var(--font-display) masthead + rgba washes that the
    // DOM-walk exporter captured verbatim (the Spectral/solid-red PPTX of the
    // 2026-06-11 failure). Now renders on GoldFrame with brand TOKENS, exactly
    // like the case-study twin: rail, dot mark, mono kicker, action title,
    // hairline, takeaway band. Geometry identical across brands; skin rides
    // on tokens (GOLD standing rule).
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    const capItems = (() => { try { return densityCaps('service-blueprint', density).items; } catch { return 4; } })();
    const stages = data.stages.slice(0, Math.max(2, Math.min(capItems || 4, 5)));
    const dense = stages.length >= 5;
    const mono = `'${T.FONT_MONO}', monospace`;
    const bodyF = `'${T.FONT_BODY}', sans-serif`;
    const lanes: Array<{ key: string; label: string; highlight?: boolean }> = [
        { key: 'customerAction', label: 'Customer', highlight: true },
        { key: 'frontstage', label: 'Frontstage' },
        { key: 'backstage', label: 'Backstage' },
        { key: 'support', label: 'Support · Data' },
    ];
    const moodColor = (e?: string): string => {
        if (!e) return hex(T.GREY);
        const low = e.toLowerCase();
        if (low.includes('frustrat') || low.includes('angry') || low.includes('confus') || low.includes('disappoint') || low.includes('abandon') || low.includes('lost')) return hex(T.ACCENT_WARN);
        if (low.includes('delight') || low.includes('satisf') || low.includes('hope') || low.includes('excited') || low.includes('curious')) return hex(T.GREEN);
        return hex(T.CHARTREUSE);
    };
    const kicker = data.journeyType
        ? `SERVICE JOURNEY · ${String(data.journeyType).toUpperCase()}`
        : 'SERVICE BLUEPRINT · BITNER MODEL';
    // E10 twin parity (2026-10-01): the JTBD personas ride the mono meta row by name, the same
    // dashboard field the export twin reads; sources fill the row when no personas are declared.
    const personaNames = (Array.isArray(data.personas) ? data.personas : []).map(p => [p.name, p.role].filter(Boolean).join(', ')).filter(Boolean).slice(0, 4);
    const meta = personaNames.length
        ? `Personas: ${personaNames.join(' · ')}`
        : (sources.length ? `Sources: ${sources.slice(0, 3).join(' · ')}` : undefined);
    const gridCols = `${dense ? 52 : 60}px repeat(${stages.length}, 1fr)`;
    const cellFs = dense ? 6.6 : 7.4;
    const labelFs = dense ? 5.6 : 6.2;
    const hasVoiceQuotes = stages.some(s => s.voiceQuote);
    return (
        <GoldFrame brand={brand} kicker={kicker} title={title} meta={meta} takeaway={data.keyInsight}>
            <div style={{
                flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: gridCols,
                gridTemplateRows: `16px 13px ${lanes.map(() => 'minmax(24px, 1fr)').join(' ')} minmax(28px, auto)`,
                border: `1px solid ${hex(T.HAIRLINE)}`, overflow: 'hidden', fontFamily: bodyF,
            }}>
                {/* Phase header row - ink inverse */}
                <div style={{ padding: '2px 6px', fontFamily: mono, fontSize: labelFs, fontWeight: 600, letterSpacing: '1px', color: hex(T.BAND_TEXT), background: hex(T.INK), textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>Phase</div>
                {stages.map((st, i) => (
                    <div key={`ph-${i}`} style={{ padding: '2px 6px', fontFamily: bodyF, fontWeight: 700, fontSize: cellFs + 1, color: hex(T.BAND_TEXT), background: hex(T.INK), borderLeft: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{truncate(st.phase, 28)}</div>
                ))}
                {/* Duration / mood row */}
                <div style={{ padding: '1px 6px', fontFamily: mono, fontSize: labelFs, fontWeight: 600, letterSpacing: '0.8px', color: hex(T.GREY), textTransform: 'uppercase', background: hex(T.PANEL), display: 'flex', alignItems: 'center' }}>Mood</div>
                {stages.map((st, i) => (
                    <div key={`meta-${i}`} style={{ padding: '1px 6px', fontFamily: mono, fontSize: labelFs + 0.4, color: hex(T.INK), background: hex(T.PANEL), borderLeft: `1px solid ${hex(T.HAIRLINE)}`, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {st.emotion && <span style={{ width: 5, height: 5, borderRadius: 3, background: moodColor(st.emotion), flex: '0 0 auto' }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.duration || ''}{st.duration && st.emotion ? ' · ' : ''}{st.emotion || ''}</span>
                    </div>
                ))}
                {/* Lanes */}
                {lanes.map((lane, li) => ([
                    <div key={`l-label-${li}`} style={{ padding: '3px 6px', background: lane.highlight ? hex(T.WASH_WARN) : hex(T.WHITE), borderTop: `1px solid ${hex(T.HAIRLINE)}`, borderLeft: lane.highlight ? `2px solid ${hex(T.ACCENT_WARN)}` : 'none', display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontFamily: mono, fontSize: labelFs, fontWeight: 700, letterSpacing: '1px', color: lane.highlight ? hex(T.ACCENT_WARN) : hex(T.GREY), textTransform: 'uppercase', lineHeight: 1.25 }}>{lane.label}</div>
                    </div>,
                    ...stages.map((st, i) => {
                        const txt = (st as any)[lane.key] as string | undefined;
                        return (
                            <div key={`l-${li}-${i}`} style={{ padding: '3px 6px', borderTop: `1px solid ${hex(T.HAIRLINE)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, fontSize: cellFs, color: hex(T.INK), lineHeight: 1.4, background: hex(T.WHITE), overflow: 'hidden', display: 'flex', alignItems: 'flex-start' }}>
                                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>
                                    {truncate(txt, dense ? 90 : 110) || '-'}
                                </span>
                            </div>
                        );
                    }),
                ])).flat()}
                {/* Fail-points row */}
                <div style={{ padding: '3px 6px', background: hex(T.WASH_WARN), borderTop: `2px solid ${hex(T.ACCENT_WARN)}`, display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontFamily: mono, fontSize: labelFs, fontWeight: 700, letterSpacing: '1px', color: hex(T.ACCENT_WARN), textTransform: 'uppercase', lineHeight: 1.25 }}>Fail points</div>
                </div>
                {stages.map((st, i) => (
                    <div key={`fp-${i}`} style={{ padding: '3px 6px', borderTop: `2px solid ${hex(T.ACCENT_WARN)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, fontSize: cellFs, color: st.failPoint ? hex(T.ACCENT_WARN) : hex(T.INK), lineHeight: 1.4, fontWeight: st.failPoint ? 600 : 400, background: st.failPoint ? hex(T.WASH_WARN) : hex(T.WHITE), display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>
                            {truncate(st.painPoint, dense ? 90 : 110) || '-'}
                        </span>
                    </div>
                ))}
            </div>
            {/* Voice-of-user row when stages carry verbatim quotes */}
            {hasVoiceQuotes && (
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, marginTop: 4, borderTop: `1px dashed ${hex(T.HAIRLINE)}` }}>
                    <div style={{ padding: '3px 6px', fontFamily: mono, fontSize: labelFs, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: hex(T.ACCENT_WARN), display: 'flex', alignItems: 'center' }}>Voice</div>
                    {stages.map((st, i) => (
                        <div key={`vq-${i}`} style={{ padding: '3px 6px', borderLeft: `1px solid ${hex(T.HAIRLINE)}`, minWidth: 0, overflow: 'hidden' }}>
                            {st.voiceQuote ? (
                                <blockquote style={{ margin: 0, fontSize: cellFs, fontStyle: 'italic', color: hex(T.INK), lineHeight: 1.4, borderLeft: `2px solid ${hex(T.ACCENT_WARN)}`, paddingLeft: 5 }}>
                                    {`“${truncate(st.voiceQuote, 110)}”`}
                                    {st.sourceAttribution && (
                                        <cite style={{ display: 'block', fontStyle: 'normal', fontFamily: mono, fontSize: labelFs, color: hex(T.GREY), marginTop: 2, letterSpacing: '0.4px' }}>
                                            {truncate(st.sourceAttribution, 60)}
                                        </cite>
                                    )}
                                </blockquote>
                            ) : (
                                <span style={{ fontSize: labelFs, color: hex(T.GREY) }}>-</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </GoldFrame>
    );
};


// === ORG CHART (#org - GOLD reporting-tier matrix, 2026-06-13) ===
// Twin of the Figma GOLD org frame (NU 178:3 "GOLD · org (nu) · 01 structure").
// The org chart IS the slide body: stacked TIER rows (DECIDES / DIRECTS /
// DELIVERS), each a horizontal row of evidence-cited node cards, joined by a
// centered hairline drop. The decision-authority node gets an accent top
// border. CSS grid only (graphic-collision ban forbids SVG here). Geometry is
// brand-invariant; the skin rides on tokens (GOLD standing rule).
export const OrgChartSlide: React.FC<{ title: string; data: OrgChartData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    const mono = `'${T.FONT_MONO}', monospace`;
    const bodyF = `'${T.FONT_BODY}', sans-serif`;
    const titleF = `'${T.FONT_TITLE}', ${isNu ? 'serif' : 'sans-serif'}`;
    const caps = (() => { try { return densityCaps('org-chart', density); } catch { return { items: 4, sub: 4 }; } })();
    const tiers = (data.tiers || []).slice(0, Math.max(2, Math.min(caps.items || 4, 5)));
    const kicker = `ORG STRUCTURE · ${(data.subject || 'AS-IS').toUpperCase()}`;
    const meta = sources.length ? `Sources: ${sources.slice(0, 3).join(' · ')}` : undefined;
    // Title-size shrinks slightly per node card so the role/source never clips.
    return (
        <GoldFrame brand={brand} kicker={kicker} title={title} meta={meta} takeaway={data.keyInsight}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', fontFamily: bodyF }}>
                {tiers.map((tier, ti) => {
                    const nodes = (tier.nodes || []).slice(0, Math.max(1, Math.min(caps.sub || 4, 5)));
                    return (
                        <React.Fragment key={`tier-${ti}`}>
                            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 8 }}>
                                {/* tier-label gutter */}
                                <div style={{ width: 72, flex: '0 0 72px', paddingTop: 6, fontFamily: mono, fontSize: webPx(SCALE.label), fontWeight: 600, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', lineHeight: 1.3 }}>
                                    {truncate(tier.label, 22)}
                                </div>
                                {/* node cards */}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
                                    {nodes.map((n, ni) => (
                                        <div key={`n-${ti}-${ni}`} style={{
                                            flex: 1, minWidth: 0, background: hex(T.PANEL),
                                            border: `1px solid ${hex(T.HAIRLINE)}`,
                                            borderTop: n.emphasis ? `3px solid ${hex(T.CHARTREUSE)}` : `1px solid ${hex(T.HAIRLINE)}`,
                                            padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden',
                                        }}>
                                            <div style={{ fontFamily: titleF, fontWeight: isNu ? 500 : 600, fontSize: webPx(SCALE.body), lineHeight: 1.15, color: hex(T.INK) }}>
                                                {truncate(n.title, 42)}
                                            </div>
                                            <div style={{ fontFamily: bodyF, fontSize: webPx(SCALE.label), lineHeight: 1.4, color: hex(T.INK), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                                {truncate(n.role, 110)}
                                            </div>
                                            <div style={{ flex: 1, minHeight: 0 }} />
                                            {n.source && (
                                                <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), fontWeight: 500, letterSpacing: '0.5px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {`SOURCE: ${truncate(n.source, 30)}`}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* connector drop between tiers (centered hairline) */}
                            {ti < tiers.length - 1 && (
                                <div style={{ height: 10, display: 'flex', justifyContent: 'center', flex: '0 0 10px' }}>
                                    <div style={{ width: 2, height: '100%', background: hex(T.HAIRLINE) }} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </GoldFrame>
    );
};

// === EXECUTIVE BRIEF (#brief / #explainer / #report GOLD slide twin, 2026-06-13) ===
// One template, three variants. brief = optional hero finding + finding cards;
// explainer = stepped concept cards + GOTCHAS strip; report = hero + exec-summary
// key-findings. GoldFrame chrome; brand-token skinned; CSS grid (no SVG).
export const ExecutiveBriefSlide: React.FC<{ title: string; data: ExecutiveBriefData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    const mono = `'${T.FONT_MONO}', monospace`;
    const bodyF = `'${T.FONT_BODY}', sans-serif`;
    const titleF = `'${T.FONT_TITLE}', ${isNu ? 'serif' : 'sans-serif'}`;
    const variant = data.variant || 'brief';
    const caps = (() => { try { return densityCaps('executive-brief', density); } catch { return { items: 4, sub: 4 }; } })();
    const sections = (data.sections || []).slice(0, Math.max(2, Math.min(caps.items || 4, 6)));
    const gotchas = variant === 'explainer' ? (data.gotchas || []).slice(0, Math.min(caps.sub || 4, 6)) : [];
    const kickerLabel = variant === 'explainer' ? 'EXPLAINER' : variant === 'report' ? 'REPORT' : 'BRIEF';
    const kicker = `${kickerLabel} · ${(data.subject || 'EXECUTIVE SUMMARY').toUpperCase()}`;
    const meta = sources.length ? `Sources: ${sources.slice(0, 3).join(' · ')}` : undefined;
    const stepped = variant === 'explainer';
    // E3 density-adaptive anatomy (2026-07-02, twin of slideToStageHtml renderExecutiveBrief):
    // evidence-or-collapse - quoted sections render as full cards (auto-height, quote flows after
    // the body, never pinned across dead space); quote-less sections collapse into a compact
    // SIGNALS strip; an exhibitImage (registry executive-brief visual slot) fills remaining space.
    const quoted = stepped ? sections : sections.filter(s => s?.evidence?.quote);
    const bare = stepped ? [] : sections.filter(s => !s?.evidence?.quote);
    const cols = quoted.length <= 2 ? Math.max(1, quoted.length) : 2;
    const exhibitImage = typeof (data as any).exhibitImage === 'string' ? (data as any).exhibitImage.trim() : '';
    return (
        <GoldFrame brand={brand} kicker={kicker} title={title} meta={meta} takeaway={data.keyInsight}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: bodyF }}>
                {/* hero finding callout (brief / report) */}
                {data.hero?.stat && variant !== 'explainer' && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, background: hex(T.PANEL), borderLeft: `3px solid ${hex(T.CHARTREUSE)}`, padding: '8px 12px' }}>
                        <span style={{ fontFamily: titleF, fontWeight: isNu ? 600 : 700, fontSize: webPx(SCALE.subhead), lineHeight: 1, color: hex(T.INK) }}>{truncate(data.hero.stat, 40)}</span>
                        <span style={{ fontFamily: mono, fontSize: webPx(SCALE.label), letterSpacing: '1px', textTransform: 'uppercase', color: hex(T.GREY) }}>{truncate(data.hero.label, 70)}</span>
                    </div>
                )}
                {/* quoted section cards - hug content, no stretched dead space */}
                {quoted.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: 'min-content', alignContent: 'start', gap: 8 }}>
                        {quoted.map((s, i) => (
                            <div key={`sec-${i}`} style={{ background: hex(T.PANEL), border: `1px solid ${hex(T.HAIRLINE)}`, padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    {stepped && <span style={{ fontFamily: mono, fontWeight: 700, fontSize: webPx(SCALE.caption), color: hex(T.CHARTREUSE) }}>{String(i + 1).padStart(2, '0')}</span>}
                                    <div style={{ fontFamily: titleF, fontWeight: isNu ? 500 : 600, fontSize: webPx(SCALE.body), lineHeight: 1.15, color: hex(T.INK) }}>{truncate(s.heading, 64)}</div>
                                </div>
                                <div style={{ fontFamily: bodyF, fontSize: webPx(SCALE.label), lineHeight: 1.42, color: hex(T.INK), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>{truncate(s.body, 220)}</div>
                                {s.evidence?.quote && (
                                    <div style={{ marginTop: 6, borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, paddingLeft: 6 }}>
                                        <div style={{ fontFamily: titleF, fontStyle: isNu ? 'italic' : 'normal', fontSize: webPx(SCALE.label), lineHeight: 1.35, color: hex(T.INK) }}>{`“${truncate(s.evidence.quote, 130)}”`}</div>
                                        <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), letterSpacing: '0.4px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase', marginTop: 1 }}>{truncate(s.evidence.source, 40)}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {/* SIGNALS strip - quote-less sections collapse here (no empty quote wells) */}
                {bare.length > 0 && (
                    <div style={{ background: hex(T.PANEL), border: `1px solid ${hex(T.HAIRLINE)}`, borderLeft: `3px solid ${hex(T.CHARTREUSE)}`, padding: '6px 11px' }}>
                        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: webPx(SCALE.label), letterSpacing: '1.5px', textTransform: 'uppercase', color: hex(T.GREY), marginBottom: 3 }}>Signals</div>
                        {bare.map((s, i) => (
                            <div key={`sig-${i}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 0', borderTop: i > 0 ? `1px solid ${hex(T.HAIRLINE)}` : 'none' }}>
                                <span style={{ fontFamily: titleF, fontWeight: isNu ? 500 : 600, fontSize: webPx(SCALE.label), color: hex(T.INK), whiteSpace: 'nowrap' }}>{truncate(s.heading, 48)}</span>
                                <span style={{ fontFamily: bodyF, fontSize: webPx(SCALE.label), lineHeight: 1.4, color: hex(T.INK) }}>{truncate(s.body, 170)}</span>
                            </div>
                        ))}
                    </div>
                )}
                {/* VISUAL exhibit slot - native infographic composed from the sections' own data */}
                {exhibitImage && (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', background: hex(T.PANEL), border: `1px solid ${hex(T.HAIRLINE)}` }}>
                        <img src={exhibitImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                )}
                {/* GOTCHAS strip (explainer only) */}
                {gotchas.length > 0 && (
                    <div style={{ background: hex(T.WASH_WARN), borderLeft: `3px solid ${hex(T.ACCENT_WARN)}`, padding: '6px 11px' }}>
                        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: webPx(SCALE.label), letterSpacing: '1.5px', textTransform: 'uppercase', color: hex(T.ACCENT_WARN), marginBottom: 3 }}>Gotchas</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {gotchas.map((g, i) => (
                                <div key={`g-${i}`} style={{ fontFamily: bodyF, fontSize: webPx(SCALE.label), lineHeight: 1.35, color: hex(T.INK) }}>{`• ${truncate(g, 110)}`}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </GoldFrame>
    );
};

// === JOURNEY MAP (#journey - GOLD actor-lane matrix, 2026-06-11) ===
// Twin of the Figma GOLD journey exemplars (NU 53:159 base 53:2 / T3 156:2,
// NXT 75:2): stages x ACTOR lanes (who does what at each stage), ONE critical
// stage accented, "not engaged" cells greyed, PAIN POINTS row, optional
// personas/pains/opportunities dashboard + 3 qualitative KPI tiles. This is
// NOT the Bitner blueprint - #blueprint owns frontstage/backstage.
export const JourneyMapSlide: React.FC<{ title: string; data: JourneyMapData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand);
    const isNu = T.BRAND_ID === 'nu';
    const caps = densityCaps('journey-map', density);
    const stagesRaw = Array.isArray(data.stages) ? data.stages.slice(0, Math.max(3, caps.items)) : [];
    const stages = stagesRaw.map(s => typeof s === 'string' ? { name: s, critical: false } : s);
    const lanes = (Array.isArray(data.lanes) ? data.lanes : []).slice(0, Math.max(2, caps.sub));
    if (stages.length === 0 || lanes.length === 0) return <GoldFrame brand={brand} kicker="JOURNEY MAP" title={title}><div /></GoldFrame>;
    const dense = stages.length >= 6;
    const mono = `'${T.FONT_MONO}', monospace`;
    const serif = `'${T.FONT_TITLE}', ${isNu ? 'serif' : 'sans-serif'}`;
    const cellFs = dense ? 6.4 : 7.2;
    const labelFs = dense ? 5.6 : 6.2;
    const kicker = data.journeyType ? `JOURNEY MAP · ${String(data.journeyType).toUpperCase()}` : 'JOURNEY MAP';
    const metaParts: string[] = [];
    if (data.scope) metaParts.push(`SCOPE ${data.scope}`);
    if (data.actors) metaParts.push(`ACTORS ${data.actors}`);
    if (data.phasesLabel) metaParts.push(`PHASES ${data.phasesLabel}`);
    const meta = metaParts.length ? metaParts.join('   ·   ') : (sources.length ? `Sources: ${sources.slice(0, 3).join(' · ')}` : undefined);
    const gridCols = `${dense ? 74 : 86}px repeat(${stages.length}, 1fr)`;
    const notEngaged = (txt: unknown) => /^not engaged$/i.test(String(txt ?? '').trim());
    // 2026-06-12 USER FEEDBACK REDESIGN (twin of renderJourneyMap): the
    // matrix IS the body. Personas (voice row), stacked per-phase pains
    // (painPoints[si] may be string|string[]; overallPainPoints distribute
    // by arc into the stacks), opportunities row, KPI signals embedded in
    // phase header cells - nothing sits on top of the table.
    const n = stages.length;
    const spread = (count: number): number[] => count <= 0 ? [] : count === 1 ? [0]
        : Array.from({ length: count }, (_, i) => Math.min(n - 1, Math.round((i * (n - 1)) / (count - 1))));
    // Source attributions belong in the slide-level sources[], NEVER inside a
    // tight pain/opportunity cell (no-truncation-contract). Strip a trailing
    // "(Vanguard Working Session)" / "(Source: X)" so the item reads as a
    // complete thought; twin of slideToStageHtml.stripInlineSource.
    const stripInlineSource = (s: string): string =>
        String(s ?? '').trim().replace(/\s*\((?:source:\s*)?[^)]*\)\s*$/i, (m) => {
            const inner = m.replace(/[()]/g, '').trim();
            if (/source:|working session|\bet al\b|\b(?:19|20)\d{2}\b|reddit|openalex|arxiv|vanguard/i.test(inner)) return '';
            // Short trailing Capitalized parenthetical = org attribution riding
            // inline ("(World Bank)") - belongs in sources[], strip it.
            if (/^[A-Z][A-Za-z&.'\- ]{1,28}$/.test(inner) && inner.split(/\s+/).length <= 4) return '';
            return m;
        }).trim();
    const painsRaw: any[] = Array.isArray(data.painPoints) ? data.painPoints : [];
    const painCols: string[][] = stages.map((_, si) => {
        const v = painsRaw[si];
        return Array.isArray(v) ? v.filter(Boolean).map((x: any) => stripInlineSource(String(x))) : (v ? [stripInlineSource(String(v))] : []);
    });
    const overall = (data.overallPainPoints || []).filter(Boolean).map((s: any) => stripInlineSource(String(s)));
    spread(overall.length).forEach((col, i) => painCols[col].push(overall[i]));
    const personas = (data.personas || []).filter(Boolean).map(String);
    const voiceCols: string[][] = stages.map(() => []);
    spread(personas.length).forEach((col, i) => voiceCols[col].push(personas[i]));
    const opps = (data.opportunities || []).filter(Boolean).map((s: any) => stripInlineSource(String(s)));
    const oppCols: string[][] = stages.map(() => []);
    spread(opps.length).forEach((col, i) => oppCols[col].push(opps[i]));
    const tiles = (data.kpiTiles || []).slice(0, 3);
    const tileByCol: (typeof tiles[number] | null)[] = stages.map(() => null);
    spread(tiles.length).forEach((col, i) => { tileByCol[col] = tiles[i]; });
    // Per-phase illustration thumbnails (twin of renderJourneyMap). phaseImages[]
    // aligns to stages[]; stage.image is an alternative carrier. Empty-state guard:
    // no image on any phase -> no thumbnail row -> matrix identical to before.
    const phaseImages: string[] = Array.isArray(data.phaseImages) ? data.phaseImages : [];
    const imgFor = (si: number): string => {
        const direct = phaseImages[si];
        const raw = stagesRaw[si];
        const onStage = raw && typeof raw === 'object' ? (raw as any).image : '';
        return String(direct || onStage || '').trim();
    };
    const hasImages = stages.some((_, si) => !!imgFor(si));
    const hasVoice = personas.length > 0;
    const hasPains = painCols.some(c => c.length > 0);
    const hasOpps = opps.length > 0;
    const hasTiles = tiles.length > 0;
    const rowTemplate = [
        hasTiles ? 'minmax(30px,auto)' : 'minmax(16px,auto)',
        ...(hasImages ? [dense ? 'minmax(30px,auto)' : 'minmax(38px,auto)'] : []),
        ...(hasVoice ? ['minmax(20px,auto)'] : []),
        ...lanes.map(() => 'minmax(24px,1fr)'),
        ...(hasPains ? ['minmax(22px,auto)'] : []),
        ...(hasOpps ? ['minmax(20px,auto)'] : []),
    ].join(' ');
    return (
        <GoldFrame brand={brand} kicker={kicker} title={title} meta={meta} takeaway={data.keyInsight}>
            <div style={{
                flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: gridCols,
                gridTemplateRows: rowTemplate,
                border: `1px solid ${hex(T.HAIRLINE)}`, overflow: 'hidden',
            }}>
                {/* Phase header row (+embedded KPI signal) */}
                <div style={{ background: hex(T.INK) }} />
                {stages.map((st, i) => {
                    const t = tileByCol[i];
                    return (
                        <div key={`h-${i}`} style={{ padding: '3px 8px', background: st.critical ? hex(T.ACCENT_WARN) : hex(T.INK), borderLeft: '1px solid rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, overflow: 'hidden' }}>
                            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: labelFs, letterSpacing: '1px', color: '#FFFFFF', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{truncate(st.name, 22)}</div>
                            {t && <>
                                <div style={{ fontFamily: mono, fontWeight: 600, fontSize: webPx(SCALE.label), letterSpacing: '1px', color: hex(T.CHARTREUSE), textTransform: 'uppercase' }}>{truncate(t.label, 26)}</div>
                                <div style={{ fontFamily: serif, fontWeight: Number(T.TITLE_WEIGHT) || 500, fontSize: webPx(SCALE.body), lineHeight: 1.05, color: '#FFFFFF' }}>{truncate(t.value, 22)}</div>
                            </>}
                        </div>
                    );
                })}
                {/* Per-phase illustration thumbnails (illustrator-agent output) */}
                {hasImages && ([
                    <div key="il" style={{ borderTop: `1px solid ${hex(T.HAIRLINE)}`, background: hex(T.WHITE) }} />,
                    ...stages.map((_, si) => {
                        const src = imgFor(si);
                        return (
                            <div key={`il-${si}`} style={{ borderTop: `1px solid ${hex(T.HAIRLINE)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, background: hex(T.WHITE), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3, overflow: 'hidden' }}>
                                {src ? <img src={src} alt="" loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} /> : null}
                            </div>
                        );
                    }),
                ])}
                {/* Persona voice row */}
                {hasVoice && ([
                    <div key="vl" style={{ padding: '3px 8px', borderTop: `1px solid ${hex(T.HAIRLINE)}`, background: hex(T.WHITE), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontFamily: `'${T.FONT_BODY}', sans-serif`, fontWeight: 700, fontSize: labelFs, color: hex(T.ACCENT_COOL), textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personas</div>
                        <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), color: hex(T.GREY) }}>JTBD voice</div>
                    </div>,
                    ...voiceCols.map((items, si) => (
                        <div key={`v-${si}`} style={{ padding: '3px 7px', borderTop: `1px solid ${hex(T.HAIRLINE)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, fontSize: cellFs - 0.6, lineHeight: 1.3, fontStyle: 'italic', color: hex(T.INK), background: hex(T.PANEL) + '99', overflow: 'hidden' }}>
                            <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{items.map(p => `“${truncate(p, 100)}”`).join(' ')}</span>
                        </div>
                    )),
                ])}
                {/* Actor lanes */}
                {lanes.map((lane, li) => ([
                    <div key={`ll-${li}`} style={{ padding: '4px 8px', borderTop: `1px solid ${hex(T.HAIRLINE)}`, background: hex(T.WHITE), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                        <div style={{ fontFamily: `'${T.FONT_BODY}', sans-serif`, fontWeight: 700, fontSize: labelFs + 0.6, color: hex(T.INK), textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>{truncate(lane.actor, 24)}</div>
                        {lane.role && <div style={{ fontFamily: mono, fontSize: webPx(SCALE.label), color: hex(T.GREY), lineHeight: 1.2 }}>{truncate(lane.role, 28)}</div>}
                    </div>,
                    ...stages.map((_, si) => {
                        const txt = lane.cells?.[si] || '';
                        const ghost = notEngaged(txt) || !txt;
                        return (
                            <div key={`c-${li}-${si}`} style={{ padding: '4px 8px', borderTop: `1px solid ${hex(T.HAIRLINE)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, fontSize: cellFs, lineHeight: 1.38, color: ghost ? hex(T.GREY) : hex(T.INK), fontStyle: ghost ? 'italic' : 'normal', background: hex(T.PANEL) + '66', overflow: 'hidden', display: 'flex', alignItems: 'flex-start' }}>
                                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{truncate(txt || 'not engaged', dense ? 80 : 100)}</span>
                            </div>
                        );
                    }),
                ])).flat()}
                {/* Stacked per-phase pain points (>=3 per phase when evidenced) */}
                {hasPains && ([
                    <div key="pl" style={{ padding: '3px 8px', borderTop: `2px solid ${hex(T.ACCENT_WARN)}`, display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontFamily: `'${T.FONT_BODY}', sans-serif`, fontWeight: 700, fontSize: labelFs, color: hex(T.ACCENT_WARN), textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pain points</div>
                    </div>,
                    ...painCols.map((items, si) => (
                        <div key={`p-${si}`} style={{ padding: '3px 7px', borderTop: `2px solid ${hex(T.ACCENT_WARN)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {items.slice(0, 4).map((p, pi) => (
                                <div key={pi} style={{ fontSize: cellFs - 0.8, lineHeight: 1.28, color: hex(T.ACCENT_WARN), paddingLeft: 6, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 0, top: 3, width: 3, height: 3, background: hex(T.ACCENT_WARN) }} />
                                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{truncate(p, 64)}</span>
                                </div>
                            ))}
                        </div>
                    )),
                ])}
                {/* Strategic opportunities row */}
                {hasOpps && ([
                    <div key="ol" style={{ padding: '3px 8px', borderTop: `2px solid ${hex(T.ACCENT_COOL)}`, display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontFamily: `'${T.FONT_BODY}', sans-serif`, fontWeight: 700, fontSize: labelFs, color: hex(T.ACCENT_COOL), textTransform: 'uppercase', letterSpacing: '0.5px' }}>Opportunities</div>
                    </div>,
                    ...oppCols.map((items, si) => (
                        <div key={`o-${si}`} style={{ padding: '3px 7px', borderTop: `2px solid ${hex(T.ACCENT_COOL)}`, borderLeft: `1px solid ${hex(T.HAIRLINE)}`, background: hex(T.PANEL) + '66', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {items.map((o, oi) => (
                                <div key={oi} style={{ fontSize: cellFs - 0.8, lineHeight: 1.28, color: hex(T.INK), paddingLeft: 6, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 0, top: 3, width: 3, height: 3, background: hex(T.ACCENT_COOL) }} />
                                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{truncate(o, 76)}</span>
                                </div>
                            ))}
                        </div>
                    )),
                ])}
            </div>
        </GoldFrame>
    );
};

// === 12. GAP MATRIX (gap-analysis-evaluator / gap) ===
// 2026-05-23 - Refactored to NU .matbar primitive (gap-analysis.html §6.5).
// .matbar__track holds .matbar__current (ink fill) + .matbar__target (red
// pin). Severity uses NU .pill variants (--error/--warning/--special).
export const GapMatrixSlide: React.FC<{ title: string; data: GapMatrixData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const max = data.scaleMax || 5;
    const rows = data.gaps.slice(0, Math.min(densityCaps('gap-matrix', density).items, 9));
    const sevPill = (s: string) => s === 'critical' ? 'pill pill--error' : s === 'high' ? 'pill pill--warning' : s === 'medium' ? 'pill pill--special' : 'pill pill--outline';
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 12 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Maturity gap analysis</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, overflow: 'hidden' }}>
                {/* Scale header */}
                <div style={{ display: 'grid', gridTemplateColumns: '30% 1fr 90px', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Capability</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: webPx(SCALE.caption), fontWeight: 600, letterSpacing: '.08em', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                        {Array.from({ length: max }).map((_, i) => <span key={i}>L{i + 1}</span>)}
                    </div>
                    <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', textAlign: 'right' }}>Severity</div>
                </div>
                {rows.map((g, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '30% 1fr 90px', gap: 12, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', fontWeight: 600, lineHeight: 1.3 }}>{g.capability}</div>
                            {/* E10 twin parity (2026-10-01): the per-gap impact line the export twin's IMPACT column carries. */}
                            {g.impact && <div style={{ fontSize: webPx(SCALE.caption), color: 'var(--fg-muted)', lineHeight: 1.35, marginTop: 2 }}>{truncate(g.impact, 90)}</div>}
                            {(g as any).competitor && <div style={{ fontSize: webPx(SCALE.caption), fontFamily: 'var(--font-mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 3 }}>{truncate(String((g as any).competitor), 60)}</div>}
                            {(g as any).evidence && <div style={{ fontSize: webPx(SCALE.caption), color: 'var(--fg-strong)', lineHeight: 1.35, marginTop: 3, borderLeft: '2px solid var(--accent-cool, currentColor)', paddingLeft: 6 }}>&ldquo;{truncate(String((g as any).evidence), 140)}&rdquo;{(g as any).source ? <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}> {truncate(String((g as any).source), 50)}</span> : null}</div>}
                        </div>
                        <div className="matbar" style={{ position: 'relative' }}>
                            <div className="matbar__track" style={{ position: 'relative', height: 16, background: 'var(--bg-subtle)' }}>
                                <div
                                    className="matbar__current"
                                    style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0,
                                        width: `${(g.currentMaturity / max) * 100}%`,
                                        background: 'var(--ink-800)',
                                    }}
                                />
                                <div
                                    className="matbar__target"
                                    style={{
                                        position: 'absolute',
                                        left: `calc(${(g.targetMaturity / max) * 100}% - 1.5px)`,
                                        top: -3, bottom: -3, width: 3,
                                        background: 'var(--nu-red-600)',
                                    }}
                                />
                                <span style={{ position: 'absolute', left: 6, top: 0, fontSize: webPx(SCALE.caption), fontWeight: 700, color: 'var(--white)', lineHeight: '16px', mixBlendMode: 'difference' }}>{g.currentMaturity}</span>
                                <span style={{ position: 'absolute', right: 6, top: 0, fontSize: webPx(SCALE.caption), fontWeight: 700, color: 'var(--nu-red-700)', lineHeight: '16px' }}>→ {g.targetMaturity}</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span className={sevPill(g.severity)}>{g.severity}</span>
                        </div>
                    </div>
                ))}
                {/* Legend + insight */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 4, fontSize: webPx(SCALE.caption), color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                    <span><span style={{ display: 'inline-block', width: 14, height: 6, background: 'var(--ink-800)', verticalAlign: 'middle', marginRight: 4 }}></span>Current</span>
                    <span><span style={{ display: 'inline-block', width: 3, height: 10, background: 'var(--nu-red-600)', verticalAlign: 'middle', marginRight: 4 }}></span>Target</span>
                    {data.insight && <span style={{ flex: 1, textAlign: 'right', color: 'var(--fg-strong)', textTransform: 'none', letterSpacing: 0 }}>{data.insight}</span>}
                </div>
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === JOURNEY BRIEF (journeyBriefExporter) ===
// 2026-06-02 - Web preview renderer added to reach parity with the PPTX
// exporter (exportJourneyBrief in pptx.ts). Mirrors that layout exactly:
// eyebrow + diagnostic title + persona line, a tabular stage grid (header row +
// PAIN row + OPPORTUNITY row), two-column cross-cutting pains / strategic
// opportunities, KPI tiles, closing quote. CSS grid keeps the stage table
// collision-free (no absolute coordinates).
export const JourneyBriefSlide: React.FC<{ title: string; data: JourneyBrief; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const stages = (data.stages || []).slice(0, 6);
    const gridCols = `110px repeat(${Math.max(stages.length, 1)}, 1fr)`;
    const kpis = (data.kpis || []).slice(0, 4);
    const truncate = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '...' : (s || ''));
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 8 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Journey brief / {(data.journey_type || 'general').toUpperCase()}</div>
                    <h1 className="art-masthead__title">{data.diagnostic_title || title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
                {data.persona_line && (
                    <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>{data.persona_line}</div>
                )}

                {/* Stage grid: header row + PAIN row + OPPORTUNITY row */}
                {stages.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, border: '1px solid var(--border-subtle)' }}>
                        {/* header row */}
                        <div style={{ background: 'transparent' }} />
                        {stages.map((st, i) => (
                            <div key={`h${i}`} style={{ background: 'var(--ink-900, #115054)', color: 'var(--white, #fff)', fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.04em', padding: '6px 8px', textAlign: 'center', lineHeight: 1.15, borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,.18)' }}>{truncate(st.name, 46)}</div>
                        ))}
                        {/* PAIN row */}
                        <div style={{ background: 'var(--bg-subtle, #f6f6f4)', borderLeft: '4px solid var(--nu-red-600, #cc4422)', borderTop: '1px solid var(--border-subtle)', fontSize: webPx(SCALE.label), fontWeight: 700, letterSpacing: '.08em', color: 'var(--nu-red-700, #cc4422)', padding: '6px 8px' }}>PAIN</div>
                        {stages.map((st, i) => (
                            <div key={`p${i}`} style={{ background: '#fff5f5', borderTop: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)', fontSize: webPx(SCALE.label), color: 'var(--fg-strong)', padding: '6px 8px', lineHeight: 1.3 }}>{truncate(st.key_pain || '', 160)}</div>
                        ))}
                        {/* OPPORTUNITY row */}
                        <div style={{ background: 'var(--bg-subtle, #f6f6f4)', borderLeft: '4px solid var(--success, #0cce6b)', borderTop: '1px solid var(--border-subtle)', fontSize: webPx(SCALE.label), fontWeight: 700, letterSpacing: '.08em', color: '#0a8f4d', padding: '6px 8px' }}>OPPORTUNITY</div>
                        {stages.map((st, i) => (
                            <div key={`o${i}`} style={{ background: '#f0fbf5', borderTop: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)', fontSize: webPx(SCALE.label), color: 'var(--fg-strong)', padding: '6px 8px', lineHeight: 1.3 }}>{truncate(st.key_opportunity || '', 160)}</div>
                        ))}
                    </div>
                )}

                {/* Cross-cutting pains | strategic opportunities */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {([
                        { label: 'CROSS-CUTTING PAINS', items: data.cross_cutting_pains, color: 'var(--nu-red-700, #cc4422)' },
                        { label: 'STRATEGIC OPPORTUNITIES', items: data.strategic_opportunities, color: '#0a8f4d' },
                    ] as const).map((col, ci) => (
                        <div key={ci}>
                            <div style={{ fontSize: webPx(SCALE.label), fontWeight: 700, letterSpacing: '.12em', color: col.color, marginBottom: 6 }}>{col.label}</div>
                            {(col.items || []).slice(0, 3).map((it, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6, fontSize: webPx(SCALE.caption), color: 'var(--fg-strong)', lineHeight: 1.3, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 700, color: col.color }}>{i + 1}.</span>
                                    <span>{truncate(it, 180)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* KPI tiles */}
                {kpis.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 10, marginTop: 2 }}>
                        {kpis.map((k, i) => (
                            <div key={i} style={{ background: i === 0 ? 'var(--ink-900, #115054)' : 'var(--bg-subtle, #f6f6f4)', padding: '8px 10px' }}>
                                <div style={{ fontSize: webPx(SCALE.subhead), fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-display, Archivo)', color: i === 0 ? 'var(--white, #fff)' : 'var(--fg-strong)', letterSpacing: '-.02em' }}>{k.value}</div>
                                <div style={{ fontSize: webPx(SCALE.label), color: i === 0 ? '#f0f0f0' : 'var(--fg-muted)', marginTop: 4, lineHeight: 1.25 }}>{truncate(k.label, 60)}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Closing quote */}
                {data.closing_quote && data.closing_quote.text && (
                    <div style={{ display: 'flex', gap: 10, borderLeft: `4px solid var(--accent, ${hex(TOKENS.CHARTREUSE_BRIGHT)})`, paddingLeft: 12, marginTop: 2 }}>
                        <div>
                            <div style={{ fontSize: webPx(SCALE.body), fontStyle: 'italic', color: 'var(--fg-strong)', lineHeight: 1.35 }}>"{truncate(data.closing_quote.text, 200)}"</div>
                            <div style={{ fontSize: webPx(SCALE.label), color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>{truncate(data.closing_quote.attribution || '', 90)}</div>
                        </div>
                    </div>
                )}
            </div>
            <SourceFooter sources={sources.length ? sources : (data.sources || [])} brand={brand} />
        </div>
    );
};

// === 13. ARCHITECTURE MAP (tech-arch-generator / tech_node) ===
// 2026-05-23 - Refactored to NU c4-canvas pattern (tech-architecture.html §6.11).
// Each C4 layer is a row with an ink-900 label panel + flex node strip; nodes
// use .art-card with left-border color by type (--user, --app, --db, --integ,
// --ext, --ai). Brand-red reserved for layer 1 (most upstream).
export const ArchitectureMapSlide: React.FC<{ title: string; data: ArchitectureMapData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const layers = data.layers.slice(0, 5);
    const typeAccent = (t?: string) => {
        const k = (t || '').toLowerCase();
        if (k.includes('user') || k.includes('actor')) return 'var(--nu-red-600)';
        if (k.includes('db') || k.includes('data')) return 'var(--ink-700)';
        if (k.includes('api') || k.includes('integ')) return 'var(--progress-solid)';
        if (k.includes('ai') || k.includes('ml')) return 'var(--special-solid)';
        if (k.includes('ext')) return 'var(--warning-solid)';
        return 'var(--ink-800)';
    };
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">System architecture · C4</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                {layers.map((layer, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, alignItems: 'stretch', minHeight: 0, flex: 1 }}>
                        <div style={{ background: i === 0 ? 'var(--ink-900)' : 'var(--bg-subtle)', padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: i === 0 ? '3px solid var(--nu-red-600)' : '3px solid var(--ink-700)' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), fontWeight: 600, letterSpacing: '.14em', color: i === 0 ? 'var(--nu-red-100)' : 'var(--fg-muted)', textTransform: 'uppercase' }}>
                                Layer {String(i + 1).padStart(2, '0')}
                            </div>
                            <div style={{ fontSize: webPx(SCALE.lead), fontWeight: 700, color: i === 0 ? 'var(--white)' : 'var(--fg-strong)', marginTop: 3, lineHeight: 1.25 }}>{layer.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignContent: 'flex-start' }}>
                            {layer.nodes.slice(0, 6).map((n, ni) => (
                                <div key={ni} className="art-card" style={{ flex: '1 1 calc(33% - 6px)', minWidth: 0, padding: '6px 10px', borderLeft: `3px solid ${typeAccent(n.type)}` }}>
                                    <div style={{ fontSize: webPx(SCALE.body), fontWeight: 700, color: 'var(--fg-strong)', lineHeight: 1.2 }}>{n.name}</div>
                                    {n.type && <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), fontWeight: 600, letterSpacing: '.1em', color: typeAccent(n.type), textTransform: 'uppercase', marginTop: 2 }}>{n.type}</div>}
                                    {n.description && <div style={{ fontSize: webPx(SCALE.caption), color: 'var(--fg-default)', lineHeight: 1.4, marginTop: 3 }}>{n.description}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {data.flowSummary && (
                <div className="art-card" style={{ margin: '8px 28px 0', padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)' }}>
                    <span style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginRight: 8 }}>Flow</span>
                    <span style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.45 }}>{data.flowSummary}</span>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 - Refactored to NU primitives (prd.html §6.9). Priority becomes
// NU .pill variant. Two modes preserved: DEEP for single feature with rich
// narrative, COMPACT for 2-3 side-by-side cards. Both share .art-card
// chrome with a top accent that maps priority to brand red (must) or muted
// (others) - staying inside "red as scalpel".
export const PrdFeatureSlide: React.FC<{ title: string; data: PrdFeatureData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const allFeatures = Array.isArray(data?.features) ? data.features : [];
    // E10 twin parity (2026-10-01): per-feature tokenized emblem carrier (index-aligned to
    // features, registry prd-feature carrier) + the canon 607:2 column heads the export twin
    // renders: storyId (US-N), successMetric, traces. The preview dropped all four.
    const featureImages: string[] = Array.isArray(data?.featureImages) ? data.featureImages : [];
    const storyIdOf = (f: PrdFeatureData['features'][number], i: number) => String(f.storyId || `US-${i + 1}`);
    const prioPill = (p: string) => p === 'must' ? 'pill pill--error' : p === 'should' ? 'pill pill--warning' : p === 'could' ? 'pill pill--progress' : 'pill pill--outline';
    const prioAccent = (p: string) => p === 'must' ? 'var(--nu-red-600)' : 'var(--ink-700)';
    const single = allFeatures.length === 1 ? allFeatures[0] : null;
    const isDeep = !!(single && (single.technicalDetails || single.problemSolved || single.stakeholders || (Array.isArray(single.evidence) && single.evidence.length > 0)));

    // 2026-07-02 (#prd depth uplift, canon 607:4): FR/NFR/OOS requirements ledger - three hugging
    // columns with colored top rules + mono ID cells; twin of slideToStageHtml renderPrdRequirements.
    // Rules resolve from the SAME token set the GoldFrame twins hydrate (resolveT), never literals.
    const req = (data as any)?.requirements;
    if (req && (Array.isArray(req.functional) || Array.isArray(req.nonFunctional) || Array.isArray(req.outOfScope))) {
        const RT = resolveT(brand);
        const col = (label: string, rule: string, rows: Array<{ id: string; text: string }>) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', background: hex(RT.PANEL), padding: '0 12px 10px', borderTop: `3px solid ${rule}` }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: webPx(SCALE.label), letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '9px 0 6px' }}>{label}</div>
                {(rows || []).slice(0, 6).map((r, ri) => (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 8, alignItems: 'start', padding: '6px 0', borderTop: `1px solid ${hex(RT.HAIRLINE)}` }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.06em', color: hex(RT.ACCENT_COOL), fontWeight: 600, paddingTop: 1 }}>{r.id}</span>
                        <p style={{ fontSize: webPx(SCALE.caption), lineHeight: 1.42, color: 'var(--fg-default)', margin: 0 }}>{r.text}</p>
                    </div>
                ))}
            </div>
        );
        return (
            <div className="nu-artifact-stage nu-artifact-stage--slide" data-brand={brand || 'nu'}
                 style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="art-masthead" style={{ paddingBottom: 10 }}>
                    <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                        <div className="art-masthead__kicker">PRD · Requirements and boundaries</div>
                        <h1 className="art-masthead__title">{title}</h1>
                    </div>
                </header>
                <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignContent: 'start', minHeight: 0, overflow: 'hidden' }}>
                    {col('Functional', hex(RT.ACCENT_COOL), req.functional || [])}
                    {col('Non-functional', hex(RT.INK), req.nonFunctional || [])}
                    {col('Out of scope', hex(RT.ACCENT_WARN), req.outOfScope || [])}
                </div>
                <SourceFooter sources={sources} brand={brand} />
            </div>
        );
    }

    if (isDeep && single) {
        const f = single;
        return (
            <div
                className="nu-artifact-stage nu-artifact-stage--slide"
                data-brand={brand || 'nu'}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
                <header className="art-masthead" style={{ paddingBottom: 8 }}>
                    <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                        <div className="art-masthead__kicker">Product requirements · {f.priority}</div>
                        <h1 className="art-masthead__title">{title}</h1>
                    </div>
                </header>
                <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: webPx(SCALE.lead), color: 'var(--nu-red-600)', lineHeight: 1 }}>{storyIdOf(f, 0)}</span>
                            {featureImages[0] && <img src={featureImages[0]} alt="" style={{ width: 17, height: 17, objectFit: 'contain', flexShrink: 0 }} />}
                            <span className={prioPill(f.priority)}>{f.priority}</span>
                            <h2 className="art-finding art-finding--sm" style={{ fontSize: webPx(SCALE.name) }}>{f.name}</h2>
                        </div>
                        <div className="art-card" style={{ padding: '10px 12px', borderLeft: `3px solid ${prioAccent(f.priority)}`, fontStyle: 'italic', fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5 }}>
                            {f.userStory}
                        </div>
                        <div>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>Acceptance criteria</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {(Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 6).map((c, ci) => (
                                    <li key={ci} style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.4, paddingLeft: 14, position: 'relative', marginBottom: 4 }}>
                                        <span style={{ position: 'absolute', left: 0, color: 'var(--success-fg)', fontWeight: 700 }}></span>{c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {f.successMetric && (
                            <div style={{ borderLeft: '3px solid var(--nu-red-600)', paddingLeft: 10 }}>
                                <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 2 }}>Success metric</div>
                                <div style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.42 }}>{truncate(f.successMetric, 120)}</div>
                            </div>
                        )}
                        {f.traces && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.06em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Traces: {truncate(f.traces, 76)}</div>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                        {f.problemSolved && (
                            <div>
                                <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-700)', marginBottom: 3 }}>Problem solved</div>
                                <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45, margin: 0 }}>{f.problemSolved}</p>
                            </div>
                        )}
                        {f.technicalDetails && (
                            <div>
                                <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3 }}>Technical details</div>
                                <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45, margin: 0 }}>{f.technicalDetails}</p>
                            </div>
                        )}
                        {f.stakeholders && (
                            <div>
                                <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3 }}>Stakeholders</div>
                                <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.45, margin: 0 }}>{f.stakeholders}</p>
                            </div>
                        )}
                        {Array.isArray(f.evidence) && f.evidence.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                                <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>Evidence</div>
                                {f.evidence.slice(0, 3).map((e, ei) => (
                                    <div key={ei} style={{ marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid var(--nu-red-600)' }}>
                                        <div style={{ fontSize: webPx(SCALE.caption), color: 'var(--fg-strong)', lineHeight: 1.4, fontStyle: 'italic' }}>“{e.text}”</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.caption), color: 'var(--fg-muted)', marginTop: 2, letterSpacing: '.04em' }}>
                                            {e.attribution ? `${e.attribution} · ` : ''}{e.source}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <SourceFooter sources={sources} brand={brand} />
            </div>
        );
    }

    const features = allFeatures.slice(0, 3);
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Product requirements</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: `repeat(${features.length}, 1fr)`, gap: 12, minHeight: 0 }}>
                {features.map((f, i) => (
                    <div key={i} className="art-card" style={{ padding: 14, borderTop: `3px solid ${prioAccent(f.priority)}`, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: webPx(SCALE.label), letterSpacing: '.08em', color: 'var(--fg-muted)', fontWeight: 600 }}>{storyIdOf(f, i)}</span>
                            {featureImages[i] && <img src={featureImages[i]} alt="" style={{ width: 13, height: 13, objectFit: 'contain', flexShrink: 0 }} />}
                            <span className={prioPill(f.priority)}>{f.priority}</span>
                        </div>
                        <h3 className="art-finding art-finding--sm" style={{ fontSize: webPx(SCALE.lead) }}>{f.name}</h3>
                        <p style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.5, fontStyle: 'italic', margin: 0, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>{f.userStory}</p>
                        <div>
                            <div style={{ fontSize: webPx(SCALE.caption), fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>Acceptance</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {(Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 5).map((c, ci) => (
                                    <li key={ci} style={{ fontSize: webPx(SCALE.body), color: 'var(--fg-default)', lineHeight: 1.4, paddingLeft: 12, position: 'relative', marginBottom: 4 }}>
                                        <span style={{ position: 'absolute', left: 0, color: 'var(--success-fg)', fontWeight: 700 }}></span>{c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 - Refactored to NU .dtable + NU .pill primitives
// (tech-audit.html §6.12). Status + risk become NU pill variants; row hover
// + striping handled by the shared .dtable layer.
export const SystemsInventorySlide: React.FC<{ title: string; data: SystemsInventoryData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const rows = data.systems.slice(0, Math.min(densityCaps('systems-inventory', density).items, 12));
    const riskClass = (r: string) => r === 'critical' ? 'pill pill--error' : r === 'high' ? 'pill pill--warning' : r === 'medium' ? 'pill pill--special' : 'pill pill--success';
    const statusClass = (s: string) => s === 'legacy' ? 'pill pill--warning' : s === 'deprecated' ? 'pill pill--error' : s === 'planned' ? 'pill pill--progress' : 'pill pill--success';
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 12 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Systems inventory</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', minHeight: 0, overflow: 'hidden' }}>
                <table className="dtable dtable--compact" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th>System</th>
                            <th style={{ width: '18%' }}>Category</th>
                            <th style={{ width: '16%', textAlign: 'center' }}>Status</th>
                            <th style={{ width: '14%', textAlign: 'center' }}>Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s, i) => (
                            <tr key={i}>
                                <td className="lead">
                                    {s.name}
                                    {s.description && <div style={{ fontSize: webPx(SCALE.caption), color: 'var(--fg-muted)', fontWeight: 400, marginTop: 2, lineHeight: 1.35 }}>{s.description}</div>}
                                </td>
                                <td style={{ color: 'var(--fg-default)', fontSize: webPx(SCALE.body) }}>{s.category}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={statusClass(s.status)}>{s.status}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={riskClass(s.risk)}>{s.risk}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.insight && (
                    <div className="art-card" style={{ marginTop: 10, padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)', fontSize: webPx(SCALE.body), color: 'var(--fg-strong)', lineHeight: 1.5 }}>
                        {data.insight}
                    </div>
                )}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};
