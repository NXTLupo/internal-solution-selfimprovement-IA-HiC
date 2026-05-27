/**
 * SLIDE TEMPLATES — Web (React) renderers for all 10 NXT Humans templates.
 *
 * Each renderer fills the content panel right of the brand sidebar (and,
 * optionally, the image panel). Templates favor restraint: massive negative
 * space, sharp corners, single-accent color, conclusion titles only.
 */

import React from 'react';
import { TOKENS, hex } from './types';
import { nxtBrand, type Brand } from './brands';
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, CaseStudyData, PrinciplesData, StatRowData, TimelineData, SectionDividerData,
    ServiceBlueprintData, GapMatrixData, ArchitectureMapData, PrdFeatureData, SystemsInventoryData,
} from './types';
import { cleanTranscriptQuote, looksLikeTranscriptSource } from '../../services/transcriptQuoteCleaner';

// Renderers fall back to the nxt brand when no brand prop is supplied.
// When a brand is supplied, we use its token values so `T.TEAL` semantic slots
// resolve to the brand's dark-surface color, and `T.CHARTREUSE*` resolves to
// the brand's primary accent.
const resolveT = (b?: Brand): Brand => b || nxtBrand;

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
        {/* IMAGE PANEL — 35% (1/3) when present */}
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

// === RESPONSIVE SIZING HELPERS ===
// Every template that shows an oversized display number uses these to pick a
// font size that won't overflow its column, regardless of whether the AI emits
// "42" or "Steady" or "$2.4M" or "-12%". Returns size in pixels (web) or pt
// (PPTX — same number, different unit consumer).
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
 * Truncate text WITHOUT ever appending an ellipsis ("..." or "…") and
 * WITHOUT cutting mid-sentence. Strategy:
 *   1. If text fits, return verbatim.
 *   2. Look FORWARD up to 2× max for the next sentence end — if found,
 *      return the full thought. A 90-char sentence that needed budget
 *      120 finishes cleanly instead of being chopped.
 *   3. Look BACKWARD inside max for the most recent sentence end at
 *      ≥ 30% of budget — use that.
 *   4. Look BACKWARD for the most recent clause boundary (comma + space)
 *      at ≥ 50% — end there with a period (NOT an ellipsis).
 *   5. Last resort: drop the trailing fragment at the last word boundary.
 *      NO ellipsis is ever emitted — ellipsis hides valuable information.
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

    // 3. Backward clause boundary, end with period (no ellipsis)
    const lastClause = slice.lastIndexOf(', ');
    if (lastClause > max * 0.5) return slice.substring(0, lastClause).trim() + '.';

    // 4. Last resort: word boundary, NO ellipsis
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) return slice.substring(0, lastSpace).trim();
    return slice.trim();
}

// === MICRO-PRIMITIVES ===

const Tag: React.FC<{ text: string; color?: string; brand?: Brand }> = ({ text, color, brand }) => {
    const T = resolveT(brand);
    return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: hex(color || T.CHARTREUSE_BRIGHT) }}>{text}</div>;
};

const Title: React.FC<{ text: string; size?: number; brand?: Brand }> = ({ text, size = 28, brand }) => {
    const T = resolveT(brand);
    return <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 900, fontSize: size, color: hex(T.INK), lineHeight: 1.05, letterSpacing: '-0.015em' }}>{text}</div>;
};

const SourceFooter: React.FC<{ sources: string[]; brand?: Brand }> = ({ sources, brand }) => {
    const T = resolveT(brand);
    return sources && sources.length > 0 ? (
        <div style={{ fontSize: 8, color: hex(T.MUTED), borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 6, marginTop: 'auto' }}>
            Sources: {sources.join('  |  ')}
        </div>
    ) : null;
};

/**
 * QuoteStack — renders either a singular `evidence` quote OR a variable-length
 * `quotes[]` array with consistent styling. The caller controls size/tone via
 * the `size` prop ('hero' | 'body' | 'compact'). This is the primitive that
 * makes multi-quote density work across every theme template.
 */
interface QuoteLike { text: string; source?: string; attribution?: string; date?: string; role?: string; }

/**
 * Smart quote truncation — NEVER cut mid-clause and NEVER append ellipsis.
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

    // Backward clause boundary — end with period, no ellipsis
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
    /** Soft max characters per quote — smart-clipped at sentence boundary */
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

/** Normalize legacy `evidence` + `source` into the QuoteLike[] shape the stack
 *  expects. If `quotes[]` is provided, it takes precedence and the singular
 *  evidence is ignored. */
function resolveThemeQuotes(theme: { evidence?: string; source?: string; quotes?: Array<{ text: string; source?: string; attribution?: string; date?: string; role?: string }> }): QuoteLike[] {
    if (theme.quotes && theme.quotes.length > 0) return theme.quotes;
    if (theme.evidence) return [{ text: theme.evidence, source: theme.source }];
    return [];
}

// === 1. PERSONA CARD (persona-architect) ===
// 2026-05-23 — Refactored to NU artifact primitives. A single persona on
// the slide stage maps to the NU `.persona` card structure (GUIDE.md §6.1).
// Two-column layout: identity + JTBD + goals on the left; pain points +
// motivations on the right. Verbatim quote uses brand-red Spectral italic
// per the "Northeastern red is a scalpel" rule. Pain points use signal--red
// dot; motivations use signal--green. No catastrophizing verbs.
export const PersonaCardSlide: React.FC<{ data: PersonaCardData; sources?: string[]; hasImage: boolean; brand?: Brand }> = ({ data, sources = [], hasImage, brand }) => {
    const p = data;
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 10 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Persona · Discovery synthesis</div>
                    <h1 className="art-masthead__title" style={{ fontSize: hasImage ? 22 : 26 }}>
                        {p.name}
                    </h1>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                        {p.role}{p.demographics ? ` · ${p.demographics}` : ''}
                    </div>
                </div>
            </header>
            <div style={{ padding: '4px 28px 8px', flex: 1, display: 'grid', gridTemplateColumns: hasImage ? '1fr' : '1.05fr 1fr', gap: 18, minHeight: 0, overflow: 'hidden' }}>
                {/* LEFT column — quote + JTBD + Cooper goals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    {p.quote && (
                        <blockquote
                            style={{
                                margin: 0,
                                paddingLeft: 14,
                                borderLeft: '3px solid var(--nu-red-600)',
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 400,
                                fontSize: hasImage ? 12 : 14,
                                lineHeight: 1.4,
                                color: 'var(--fg-strong)',
                            }}
                        >
                            “{p.quote}”
                            <span className="pill pill--brand" style={{ marginLeft: 8, verticalAlign: 'middle' }}>verbatim</span>
                        </blockquote>
                    )}
                    {p.jtbd && (
                        <div className="art-card" style={{ padding: '8px 12px', fontSize: 11, lineHeight: 1.45 }}>
                            <span style={{ fontSize: 9, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', marginRight: 8 }}>JTBD</span>
                            {p.jtbd}
                        </div>
                    )}
                    {p.goals && (
                        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {Object.entries(p.goals).filter(([, v]) => v).map(([k, v]) => (
                                <div key={k} style={{ background: 'var(--bg-subtle)', padding: '8px 10px', borderTop: '2px solid var(--nu-red-600)' }}>
                                    <dt style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>
                                        {k.replace('Goal', '')}
                                    </dt>
                                    <dd style={{ margin: 0, fontSize: 10.5, lineHeight: 1.4, color: 'var(--fg-strong)' }}>{v}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
                {/* RIGHT column — pain points + motivations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    {p.painPoints && p.painPoints.length > 0 && (
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                                <span className="signal signal--red" style={{ marginRight: 6 }}></span>
                                Pain points
                            </div>
                            {p.painPoints.slice(0, hasImage ? 2 : 3).map((pp, i) => (
                                <div key={i} style={{ fontSize: hasImage ? 10 : 10.5, color: 'var(--fg-default)', marginBottom: 6, paddingLeft: 10, borderLeft: '1px solid var(--border-subtle)', lineHeight: 1.4 }}>
                                    <strong style={{ color: 'var(--fg-strong)' }}>{pp.label}:</strong> “{truncate(pp.quote, 130)}”
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--fg-subtle)', marginLeft: 4 }}>({pp.source})</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {p.motivations && p.motivations.length > 0 && (
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                                <span className="signal signal--green" style={{ marginRight: 6 }}></span>
                                Motivations
                            </div>
                            {p.motivations.slice(0, hasImage ? 2 : 3).map((m, i) => (
                                <div key={i} style={{ fontSize: hasImage ? 10 : 10.5, color: 'var(--fg-default)', marginBottom: 6, paddingLeft: 10, borderLeft: '1px solid var(--border-subtle)', lineHeight: 1.4 }}>
                                    <strong style={{ color: 'var(--fg-strong)' }}>{m.label}:</strong> “{truncate(m.quote, 130)}”
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--fg-subtle)', marginLeft: 4 }}>({m.source})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 2. RECOMMENDATION (strategy-author) ===
// 2026-05-23 — Refactored to NU artifact primitives (.rec pattern from
// recommendations.html). Layout: ink-900 kernel band → action title with
// brand-red left rule → supporting actions (auto-numbered) + side panel
// (impact grid / hero metric / strip / image) → footer implication line.
// Replaces the previous 600-line absolutely-positioned band layout with
// declarative .art-card + .stat composition. PPTX exporter unchanged.
export const RecommendationSlide: React.FC<{ title: string; data: RecommendationData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const hasGrid = !!(data.impactGrid && (data.impactGrid.baseline || data.impactGrid.target || data.impactGrid.timeframe || data.impactGrid.owner));
    const hasEvidence = !!(data.evidence && data.evidence.length > 0);
    const framingTagText = data.framingTag || 'Strategic recommendation';
    const actionsLabelText = data.actionsLabel || 'Supporting actions';
    const hasImage = !!(data.heroImage && data.heroImage.src);
    const hasStrip = !!(data.impactStrip && (data.impactStrip.effort || data.impactStrip.risk || data.impactStrip.outcome));
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
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', marginTop: 6, letterSpacing: '.06em' }}>
                            {truncate(data.personaContext, 110)}
                        </div>
                    )}
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, minHeight: 0, overflow: 'hidden' }}>
                {/* LEFT — action title + rationale + supporting actions + evidence */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                    <h2 className="art-finding" style={{ fontSize: 17, borderLeft: '3px solid var(--nu-red-600)', paddingLeft: 12 }}>
                        {data.actionTitle}
                    </h2>
                    {data.rationale && (
                        <p style={{ fontSize: 11, color: 'var(--fg-default)', lineHeight: 1.55, margin: 0 }}>{truncate(data.rationale, 280)}</p>
                    )}
                    {data.supportingActions && data.supportingActions.length > 0 && (
                        <>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginTop: 2 }}>
                                {actionsLabelText}
                            </div>
                            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {data.supportingActions.slice(0, 4).map((a, i) => (
                                    <li key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'baseline' }}>
                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 22, color: 'var(--nu-red-600)', lineHeight: 1 }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--fg-strong)', marginBottom: 2 }}>{a.name}</div>
                                            <div style={{ fontSize: 10.5, color: 'var(--fg-default)', lineHeight: 1.45 }}>{truncate(a.description, 150)}</div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                    {hasEvidence && (
                        <div style={{ marginTop: 4, borderTop: '1px solid var(--border-subtle)', paddingTop: 6, overflow: 'hidden' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>Evidence</div>
                            <QuoteStack quotes={(data.evidence || []).slice(0, 1)} size="compact" brand={brand} maxChars={150} />
                        </div>
                    )}
                </div>
                {/* RIGHT — hero image | impact grid | impact strip | hero metric */}
                <div className="art-card" style={{ padding: 14, borderTop: '3px solid var(--nu-red-600)', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {hasImage ? (
                        <>
                            <img
                                src={data.heroImage!.src}
                                alt={data.heroImage!.alt || data.actionTitle}
                                style={{ width: '100%', height: 'auto', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', marginBottom: 8 }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            {data.heroImage!.caption && (
                                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '.1em', color: 'var(--fg-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
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
                                            <dt style={{ fontSize: 8.5, letterSpacing: '.12em', fontWeight: 700, color: 'var(--nu-red-600)', textTransform: 'uppercase' }}>{c.k}</dt>
                                            <dd style={{ margin: 0, fontSize: 10, color: 'var(--fg-strong)', lineHeight: 1.4, fontWeight: 600 }}>{truncate(c.v || '', 60)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </>
                    ) : hasGrid ? (
                        <>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Projected impact</div>
                            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { k: 'Baseline', v: data.impactGrid?.baseline },
                                    { k: 'Target', v: data.impactGrid?.target, accent: 'var(--nu-red-700)' },
                                    { k: 'Timeframe', v: data.impactGrid?.timeframe },
                                    { k: 'Owner', v: data.impactGrid?.owner },
                                ].map(c => (
                                    <div key={c.k}>
                                        <dt style={{ fontSize: 8.5, letterSpacing: '.12em', color: c.accent || 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{c.k}</dt>
                                        <dd style={{ margin: 0, fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.3, fontWeight: 600 }}>{c.v ? truncate(c.v, 60) : ''}</dd>
                                    </div>
                                ))}
                            </dl>
                            {data.impactMetric && (
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 28, color: 'var(--nu-red-700)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                        {data.impactMetric.value}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 4, lineHeight: 1.4 }}>{truncate(data.impactMetric.label, 70)}</div>
                                </div>
                            )}
                        </>
                    ) : data.impactMetric ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Projected impact</div>
                            <div className="stat__value" style={{ fontSize: 44, color: 'var(--nu-red-700)' }}>
                                {data.impactMetric.value}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--fg-default)', marginTop: 10, lineHeight: 1.4 }}>{truncate(data.impactMetric.label, 90)}</div>
                        </div>
                    ) : null}
                </div>
            </div>
            {footerText && footerLabel && (
                <div style={{ padding: '8px 28px 0', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-600)' }}>{footerLabel}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 600 }}>{truncate(footerText, 220)}</div>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 3. THEME CLUSTER (theme-analyst) ===
// 2026-05-23 — Refactored to NU .theme-grid + .theme tiles (themes.html §6.2).
// Equal-weight horizontal columns (3-4 themes), each tile a complete-sentence
// finding with insight, quote, source. Primary theme (index 0) opens with
// brand-red number per "red is a scalpel".
export const ThemeClusterSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const themes = data.themes.slice(0, 4);
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
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 28, color: i === 0 ? 'var(--nu-red-600)' : 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <h3 className="art-finding art-finding--sm" style={{ fontSize: 12 }}>{truncate(t.name, 60)}</h3>
                        <p style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>{truncate(t.insight, 200)}</p>
                        <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={130} />
                        {(!t.quotes || t.quotes.length === 0) && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-subtle)', marginTop: 'auto', paddingTop: 6, letterSpacing: '.04em' }}>{truncate(t.source, 50)}</div>
                        )}
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 — Refactored to NU primitives. Spotlight = hero theme card with
// brand-red rule + supporting signals list. Patterns: .art-finding for hero
// title, .pq for hero quote, .signal--blue for the pattern strip.
export const ThemeSpotlightSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const all = data.themes.slice(0, 4);
    const hero = all[0];
    const supporting = all.slice(1, 4);
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
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 52, color: 'var(--nu-red-600)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>01</div>
                        <h2 className="art-finding" style={{ fontSize: hasSupporting ? 16 : 22, lineHeight: 1.18, flex: 1, minWidth: 0 }}>
                            {truncate(hero.name, hasSupporting ? 90 : 140)}
                        </h2>
                    </div>
                    <p style={{ fontSize: hasSupporting ? 11 : 13, color: 'var(--fg-default)', lineHeight: 1.55, margin: 0 }}>{truncate(hero.insight, hasSupporting ? 420 : 600)}</p>
                    <QuoteStack quotes={resolveThemeQuotes(hero)} size="hero" brand={brand} maxChars={hasSupporting ? 280 : 400} />
                    {data.patternSignal && (
                        <div className="art-card" style={{ padding: '9px 12px', borderLeft: '3px solid var(--ink-700)', background: 'var(--bg-subtle)' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3, display: 'flex', alignItems: 'center' }}>
                                <span className="signal signal--blue" style={{ marginRight: 6 }}></span>
                                Pattern signal
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--fg-strong)', lineHeight: 1.5 }}>{truncate(data.patternSignal, 260)}</div>
                        </div>
                    )}
                    {hero.implication && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 'auto', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-600)' }}>Implication</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 600 }}>{truncate(hero.implication, 220)}</div>
                        </div>
                    )}
                </div>
                {hasSupporting && (
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 }}>Supporting signals</div>
                        {supporting.map((t, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10, padding: '10px 0', borderBottom: i < supporting.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 22, color: 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                    {String(i + 2).padStart(2, '0')}
                                </span>
                                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.22 }}>{truncate(t.name, 80)}</div>
                                    <div style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.45 }}>{truncate(t.insight, 220)}</div>
                                    <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={160} />
                                    {t.signal && (
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', color: 'var(--nu-red-700)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
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

// 2026-05-23 — Refactored. Narrative chain: Spectral display numbers with
// ink-700 connector arrows, columns separated by hairline rules, signal mono
// rows in lieu of brand-red badges (red is reserved for the pattern callout).
export const ThemeArcSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const themes = data.themes.slice(0, 4);
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
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 36, color: i === 0 ? 'var(--nu-red-600)' : 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
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
                        <h3 className="art-finding art-finding--sm" style={{ fontSize: 11.5 }}>{truncate(t.name, 70)}</h3>
                        <p style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>{truncate(t.insight, 280)}</p>
                        <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={140} />
                        {t.signal && (
                            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 5, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.4 }}>
                                Signal · <span style={{ color: 'var(--fg-strong)', textTransform: 'none', fontWeight: 700 }}>{truncate(t.signal, 56)}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {data.patternSignal && (
                <div style={{ margin: '8px 28px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="signal signal--red"></span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nu-red-700)' }}>Pattern</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 500 }}>{truncate(data.patternSignal, 240)}</span>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 — Refactored. 2x2 ivory grid, hairline rules; primary cell
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
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 28, color: isPrimary ? 'var(--nu-red-600)' : 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <h3 className="art-finding art-finding--sm" style={{ fontSize: 12, flex: 1 }}>{truncate(t.name, 80)}</h3>
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>{truncate(t.insight, 240)}</p>
                            <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={140} />
                            {t.signal && (
                                <div style={{ marginTop: 'auto', paddingTop: 5, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
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
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nu-red-700)' }}>Pattern</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 500 }}>{truncate(data.patternSignal, 240)}</span>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 4. COMPETITIVE MATRIX (competitive-analyst) ===
// Expanded density: column definitions under each header, per-row evidence line,
// scale legend at bottom (Absent → Optimized), subject row highlighted.
// 2026-05-23 — Refactored to NU .dtable + .nu-col shading
// (competitive-analysis.html §6.4). NU subject row gets brand-red wash + 2px
// left border so it stands out across the matrix without re-scanning.
export const CompetitiveMatrixSlide: React.FC<{ title: string; data: CompetitiveMatrixData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const max = data.scaleMax || 5;
    const rows = data.rows.slice(0, 7);
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
                                        <div style={{ fontSize: 8, fontWeight: 400, marginTop: 3, color: 'var(--fg-muted)', letterSpacing: 0, textTransform: 'none', lineHeight: 1.3 }}>
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
                                        <div style={{ fontWeight: isSubject ? 700 : 600, fontSize: 11, lineHeight: 1.2 }}>{truncate(row.name, 48)}</div>
                                        {row.note && <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--fg-muted)', marginTop: 3, lineHeight: 1.35, fontStyle: 'italic' }}>{truncate(row.note, 90)}</div>}
                                    </td>
                                    {row.scores.map((s, si) => (
                                        <td key={si} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 3 }}>
                                                {Array.from({ length: max }).map((_, di) => (
                                                    <span key={di} style={{ width: 8, height: 8, background: di < s ? (isSubject ? 'var(--nu-red-600)' : 'var(--ink-800)') : 'var(--border-default)' }}></span>
                                                ))}
                                            </div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: s === bestPerCol[si] ? 'var(--success-fg)' : s < bestPerCol[si] - 1 ? 'var(--nu-red-700)' : 'var(--fg-muted)' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--fg-muted)', letterSpacing: '.04em', paddingLeft: '22%', paddingTop: 6 }}>
                        {data.scaleLabels.map((l, i) => (
                            <span key={i} style={{ flex: 1, textAlign: 'center' }}>L{i + 1} · {truncate(l, 16)}</span>
                        ))}
                    </div>
                )}
                {data.insight && (
                    <div className="art-card" style={{ marginTop: 8, padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)', fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5 }}>
                        {truncate(data.insight, 280)}
                    </div>
                )}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 5. BLOCK QUOTE (evidence-curator) — denser with context + corroborating data ===
// 2026-05-23 — Refactored to NU .pq pull-quote primitive (GUIDE §5).
// Spectral italic with brand-red left rule, attribution row below, optional
// corroborating-data .art-card sidebar, implication line in footer.
export const BlockQuoteSlide: React.FC<{ data: BlockQuoteData; sources?: string[]; brand?: Brand }> = ({ data, sources = [], brand }) => {
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
                        <p style={{ fontSize: 11, color: 'var(--fg-default)', lineHeight: 1.55, margin: 0, paddingLeft: 18, borderLeft: '1px solid var(--border-subtle)' }}>
                            {truncate(data.contextParagraph, 480)}
                        </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto' }}>
                        <div style={{ width: 40, height: 1, background: 'var(--nu-red-600)' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--fg-strong)' }}>{data.attribution}</div>
                            {data.role && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', marginTop: 2, letterSpacing: '.04em' }}>{data.role}</div>}
                        </div>
                        <span className="pill pill--brand" style={{ marginLeft: 6 }}>verbatim</span>
                    </div>
                </div>
                {hasSidebar && (
                    <aside className="art-card" style={{ padding: '14px 16px', borderTop: '3px solid var(--nu-red-600)', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Corroborating data</div>
                        {(data.corroboratingData || []).slice(0, 3).map((d, i) => (
                            <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', paddingTop: i > 0 ? 10 : 0 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 28, color: 'var(--nu-red-700)', lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {d.value}
                                </div>
                                <div style={{ fontSize: 10.5, color: 'var(--fg-strong)', marginTop: 4, lineHeight: 1.4 }}>{truncate(d.label, 100)}</div>
                                {d.source && (
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.08em', color: 'var(--fg-subtle)', marginTop: 3, textTransform: 'uppercase' }}>{truncate(d.source, 40)}</div>
                                )}
                            </div>
                        ))}
                    </aside>
                )}
            </div>
            {data.implication && (
                <div style={{ padding: '8px 30px 0', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-600)' }}>Implication</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 600 }}>{truncate(data.implication, 260)}</div>
                </div>
            )}
            <SourceFooter sources={[data.source, ...sources.filter(s => s !== data.source)]} brand={brand} />
        </div>
    );
};

// === 6. CASE STUDY (case-study-analyst) ===
// 2026-05-23 — Refactored to NU primitives. Three Challenge/Approach/Outcome
// rows as .art-card stripes with brand-red left rule for CHALLENGE only;
// right ink-900 .art-card panel carries hero metric + supporting .stat-strip
// + comparables + pull quote. LESSON row uses chartreuse-equivalent muted
// border (per "red as scalpel" — only one critical accent per page).
export const CaseStudySlide: React.FC<{ title: string; data: CaseStudyData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const hasRightPanel = !!(data.keyMetric || data.supportingMetrics?.length || data.pullQuote || data.comparables?.length);
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 8 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">Case study · {data.subject}</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            {(data.subjectMeta || data.timeframe || data.investment) && (
                <div style={{ padding: '0 30px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '.06em', display: 'flex', gap: 22, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
                    {data.subjectMeta && <span>{truncate(data.subjectMeta, 90)}</span>}
                    {data.timeframe && <span><strong style={{ color: 'var(--fg-strong)', letterSpacing: '.12em', textTransform: 'uppercase', fontSize: 9 }}>Timeframe</strong> {truncate(data.timeframe, 40)}</span>}
                    {data.investment && <span><strong style={{ color: 'var(--fg-strong)', letterSpacing: '.12em', textTransform: 'uppercase', fontSize: 9 }}>Investment</strong> {truncate(data.investment, 40)}</span>}
                </div>
            )}
            <div style={{ flex: 1, padding: '8px 30px', display: 'grid', gridTemplateColumns: hasRightPanel ? '1.9fr 1fr' : '1fr', gap: 18, minHeight: 0, overflow: 'hidden' }}>
                {/* LEFT — three narrative blocks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    {[
                        { label: 'Challenge', text: data.challenge, accent: 'var(--nu-red-600)' },
                        { label: 'Approach', text: data.approach, accent: 'var(--ink-700)' },
                        { label: 'Outcome', text: data.outcome, accent: 'var(--ink-700)' },
                    ].map((b, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, padding: '8px 12px', background: i === 0 ? 'rgba(200,16,46,0.04)' : 'var(--bg-subtle)', borderLeft: `3px solid ${b.accent}`, minWidth: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: b.accent, textTransform: 'uppercase' }}>{b.label}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--fg-default)', lineHeight: 1.5 }}>{truncate(b.text, 340)}</div>
                        </div>
                    ))}
                    {data.lesson && (
                        <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, padding: '8px 12px', background: 'var(--bg-subtle)', borderLeft: '3px solid var(--nu-red-700)', marginTop: 2, minWidth: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'var(--nu-red-700)', textTransform: 'uppercase' }}>Lesson</div>
                            <div style={{ fontSize: 10.5, color: 'var(--fg-strong)', lineHeight: 1.5, fontWeight: 500 }}>{truncate(data.lesson, 280)}</div>
                        </div>
                    )}
                </div>
                {/* RIGHT — ink-900 dashboard */}
                {hasRightPanel && (
                    <aside className="art-card art-card--ink" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, overflow: 'hidden', background: 'var(--ink-900)' }}>
                        {data.keyMetric && (
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--nu-red-100)', marginBottom: 4 }}>Key outcome</div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 200, fontSize: heroNumberSize(data.keyMetric.value, { max: 46, min: 22, baseChars: 4 }), color: 'var(--white)', lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {data.keyMetric.value}
                                </div>
                                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.82)', marginTop: 5, lineHeight: 1.4 }}>{truncate(data.keyMetric.label, 90)}</div>
                            </div>
                        )}
                        {data.supportingMetrics && data.supportingMetrics.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: data.supportingMetrics.length > 1 ? '1fr 1fr' : '1fr', gap: 10, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10 }}>
                                {data.supportingMetrics.slice(0, 4).map((m, i) => (
                                    <div key={i}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: heroNumberSize(m.value, { max: 22, min: 14, baseChars: 4 }), color: 'var(--nu-red-100)', lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {m.value}
                                        </div>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 3, lineHeight: 1.35 }}>{truncate(m.label, 60)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.comparables && data.comparables.length > 0 && (
                            // 2026-05-25 — minWidth:0 + overflow:hidden so long
                            // comparable names truncate inside the panel instead of
                            // bleeding through the quote stack underneath. Capped
                            // at 2 entries (was 3) so the pullQuote can always fit
                            // in the remaining vertical space without collision.
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10, minWidth: 0, overflow: 'hidden' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nu-red-100)', marginBottom: 5 }}>Comparables</div>
                                {data.comparables.slice(0, 2).map((c, i) => (
                                    <div key={i} style={{ marginBottom: 5, paddingBottom: 4, borderBottom: i < Math.min(data.comparables!.length, 2) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', minWidth: 0 }}>
                                        <div style={{ fontSize: 10, color: 'var(--white)', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncate(c.name, 36)}</div>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginTop: 2 }}>{truncate(c.outcome, 64)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.pullQuote && (
                            // 2026-05-25 — replaced marginTop:'auto' with a fixed
                            // marginTop:10. The 'auto' pushed the quote to the
                            // panel bottom; when html2canvas re-measured the
                            // parent at fallback-font widths, the comparables
                            // block and the auto-spaced quote collided. Fixed
                            // gap is stable across preview and export.
                            <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10, minWidth: 0 }}>
                                <blockquote style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.92)', fontStyle: 'italic', lineHeight: 1.5, borderLeft: '2px solid var(--nu-red-600)', paddingLeft: 10 }}>
                                    “{smartQuoteClip(data.pullQuote.text, 200)}”
                                </blockquote>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 5, paddingLeft: 12, letterSpacing: '.04em' }}>
                                    — {data.pullQuote.attribution}{data.pullQuote.role ? `, ${data.pullQuote.role}` : ''}
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 7. PRINCIPLES (strategy-author) ===
// 2026-05-23 — Refactored to NU artifact primitives. Each principle becomes
// an .art-card with a Spectral display number (token-driven, brand-red),
// .art-finding for the principle name (complete-sentence finding per
// GUIDE.md §1 "sentence-case findings"), and small body for the description.
// Layout: vertical list separated by 1-px rules (no card chrome — matches
// the NU document density rule).
export const PrinciplesSlide: React.FC<{ title: string; data: PrinciplesData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const items = data.items.slice(0, 5);
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
                                fontSize: 32,
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
                            <p style={{ fontSize: 12, color: 'var(--fg-default)', lineHeight: 1.5, margin: 0 }}>
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
// 2026-05-23 — Refactored to NU artifact primitives (.stat-strip, .stat,
// .stat__label, .stat__value, .art-card, .nu-artifact-stage--slide).
// Pattern: each renderer wraps in `.nu-artifact-stage nu-artifact-stage--slide`
// so the shared CSS resets + slide-size overrides apply locally, then composes
// only NU classes for layout/typography. Token references resolve via
// var(--*) — no hex colors hard-coded. PPTX exporter in pptx.ts is unchanged
// (it draws shapes from data, not CSS classes).
//
// Per GUIDE.md §5: stat-strip = 3–6 stats; .stat__value carries Spectral Light
// 300 hero number; .stat__label is 10px uppercase; .stat__delta--up/--down
// adds the triangle + directional color.
export const StatRowSlide: React.FC<{ title: string; data: StatRowData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const stats = data.stats.slice(0, 4);
    // Brand kicker — NU shows "By the numbers · {brand}", NXT keeps minimal.
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
                                    <div style={{ fontSize: 11, color: 'var(--fg-default)', lineHeight: 1.45, marginTop: 6 }}>
                                        <span style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--fg-muted)', fontWeight: 600, marginRight: 6, textTransform: 'uppercase' }}>Means</span>
                                        {truncate(s.meaning, 140)}
                                    </div>
                                )}
                                {s.matters && (
                                    <div className="stat__delta" style={{ fontSize: 11, color: 'var(--fg-default)', lineHeight: 1.45, marginTop: 4 }}>
                                        <span style={{ fontSize: 9, letterSpacing: '.12em', color: 'var(--nu-red-600)', fontWeight: 700, marginRight: 6, textTransform: 'uppercase' }}>Matters</span>
                                        {truncate(s.matters, 140)}
                                    </div>
                                )}
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-subtle)', marginTop: 'auto', letterSpacing: '.06em', textTransform: 'uppercase', paddingTop: 6 }}>
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
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--nu-red-700)', marginBottom: 6 }}>
                            Convergent insight
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-strong)', lineHeight: 1.55 }}>
                            {truncate(data.convergentInsight, 320)}
                        </div>
                        {data.patternSignal && (
                            <div style={{ fontSize: 11, color: 'var(--fg-default)', lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontSize: 9, letterSpacing: '.16em', color: 'var(--fg-muted)', fontWeight: 700, marginRight: 8, textTransform: 'uppercase' }}>Pattern</span>
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
// 2026-05-23 — Refactored. NU roadmap-style .horizon columns: each phase is
// a column with a ringed-dot marker on a hairline rule; first phase carries
// brand-red dot; item list uses NU bullet markers.
export const TimelineSlide: React.FC<{ title: string; data: TimelineData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const phases = data.phases.slice(0, 5);
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
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                                Phase {String(i + 1).padStart(2, '0')}{ph.duration ? ` · ${ph.duration}` : ''}
                            </div>
                            <h3 className="art-finding art-finding--sm" style={{ fontSize: 13 }}>{ph.name}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {ph.items.slice(0, 4).map((item, ii) => (
                                    <li key={ii} style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.45, paddingLeft: 12, position: 'relative' }}>
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

// === 10. SECTION DIVIDER (deck-narrative-composer) ===
// 2026-05-23 — Refactored to NU's "arc-section" archetype (strategy-deck.html
// §02): ink-900 background with ghost type, Spectral display title, mono
// section counter, brand-red detail accent. Goes full-bleed; no masthead.
export const SectionDividerFullBleed: React.FC<{ data: SectionDividerData; brand?: Brand }> = ({ data, brand }) => {
    return (
        <div
            className="nu-artifact-stage"
            data-brand={brand || 'nu'}
            style={{
                width: 960, height: 540, position: 'relative', overflow: 'hidden',
                background: 'var(--ink-900)',
                padding: '48px 64px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}
        >
            {/* Ghost number — large faded Spectral display behind the foreground */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: 40,
                    right: 64,
                    fontFamily: 'var(--font-display)',
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
            {/* Top — SECTION kicker + brand red rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 36, height: 2, background: 'var(--nu-red-600)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--nu-red-100)' }}>
                    Section · {data.number}
                </span>
            </div>
            {/* Bottom — title + subtitle in Spectral display */}
            <div style={{ maxWidth: '92%', position: 'relative' }}>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 300,
                    fontSize: data.title.length > 40 ? 48 : data.title.length > 28 ? 56 : 64,
                    color: 'var(--white)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    margin: 0,
                }}>
                    {data.title}
                </h1>
                {data.subtitle && (
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 16, fontWeight: 300, lineHeight: 1.45, maxWidth: '70ch' }}>
                        {truncate(data.subtitle, 180)}
                    </p>
                )}
            </div>
            {/* Brand seal bottom right */}
            <div style={{ position: 'absolute', bottom: 32, right: 64, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                Northeastern · Advancement
            </div>
        </div>
    );
};

// === 11. SERVICE BLUEPRINT (service-blueprint-mapper / journey_stage) ===
// 2026-05-23 — Refactored to NU .blueprint / .bp-row / .bp-cell pattern
// (service-blueprint.html §6.3). Bitner 5-lane model:
// Customer (highlighted, brand-red rule) → Frontstage → Backstage → Support
// → Fail points (brand-red top border, NU red wash on fail cells). Mood
// shows the NU emotion-icon mapping via signal dots, no emoji.
export const ServiceBlueprintSlide: React.FC<{ title: string; data: ServiceBlueprintData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const stages = data.stages.slice(0, 4);
    const lanes: Array<{ key: string; label: string; highlight?: boolean }> = [
        { key: 'customerAction', label: 'Customer', highlight: true },
        { key: 'frontstage', label: 'Frontstage' },
        { key: 'backstage', label: 'Backstage' },
        { key: 'support', label: 'Support · Data' },
    ];
    const gridCols = `104px repeat(${stages.length}, 1fr)`;
    const moodSignal = (e?: string): string => {
        if (!e) return 'signal signal--neutral';
        const low = e.toLowerCase();
        if (low.includes('frustrat') || low.includes('angry') || low.includes('confus') || low.includes('disappoint') || low.includes('abandon') || low.includes('lost')) return 'signal signal--red';
        if (low.includes('delight') || low.includes('satisf') || low.includes('hope') || low.includes('excited') || low.includes('curious')) return 'signal signal--green';
        return 'signal signal--yellow';
    };
    // 2026-05-25 — JM-depth: detect whether the new dashboard/voice fields exist
    const hasDashboard = !!(data.personas?.length || data.overallPainPoints?.length || data.overallOpportunities?.length || data.kpiTiles?.length);
    const hasVoiceQuotes = stages.some(s => s.voiceQuote);
    const kicker = data.journeyType
        ? `Service journey · ${data.journeyType}`
        : 'Service blueprint · Bitner model';
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 8 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">{kicker}</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            {/* JM-depth dashboard (kpi tiles only; personas + overall lists live in companion deliverable slides) */}
            {hasDashboard && data.kpiTiles && data.kpiTiles.length > 0 && (
                <div className="kpi-dashboard" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.kpiTiles.length, 5)}, 1fr)`, gap: 6, padding: '4px 28px 6px', minHeight: 0 }}>
                    {data.kpiTiles.slice(0, 5).map((t, i) => (
                        <div key={`k-${i}`} className="kpi-tile" style={{
                            padding: '6px 8px',
                            background: t.isHeadline ? 'var(--ink-900)' : 'var(--bg-subtle)',
                            color: t.isHeadline ? 'var(--white)' : 'var(--fg-default)',
                            borderLeft: t.isHeadline ? '3px solid var(--nu-red-600)' : '3px solid var(--border-default)',
                            display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden',
                        }}>
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: t.isHeadline ? 'var(--nu-red-100)' : 'var(--fg-muted)' }}>
                                {t.isHeadline ? 'Key finding' : truncate(t.label, 28)}
                            </div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 200, fontSize: 22, lineHeight: 1, marginTop: 2 }}>{truncate(t.value, 12)}</div>
                            {t.supportingPhase && <div style={{ fontSize: 8, color: t.isHeadline ? 'rgba(255,255,255,0.7)' : 'var(--fg-muted)', marginTop: 2, lineHeight: 1.3 }}>{truncate(t.supportingPhase, 50)}</div>}
                        </div>
                    ))}
                </div>
            )}
            <div
                className="blueprint"
                style={{
                    flex: 1,
                    margin: '0 28px',
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gridTemplateRows: `28px 22px ${lanes.map(() => 'minmax(42px, 1fr)').join(' ')} minmax(50px, auto)`,
                    border: '1px solid var(--border-default)',
                    minHeight: 0,
                    overflow: 'hidden',
                }}
            >
                {/* Phase header row — ink-900 inverse */}
                <div style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.16em', color: 'var(--white)', background: 'var(--ink-900)', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>Phase</div>
                {stages.map((st, i) => (
                    <div key={`ph-${i}`} style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, color: 'var(--white)', background: 'var(--ink-900)', borderLeft: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center' }}>{truncate(st.phase, 28)}</div>
                ))}
                {/* Duration / mood row */}
                <div style={{ padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.12em', color: 'var(--fg-muted)', textTransform: 'uppercase', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center' }}>Duration · mood</div>
                {stages.map((st, i) => {
                    // 2026-05-25 — Display emotion + intensity in the duration row.
                    // Normalize legacy 1-5 scale (<=5) to 0-100 for the bar display.
                    const intensityRaw = st.emotionIntensity;
                    const normalized = typeof intensityRaw === 'number'
                        ? (intensityRaw <= 5 ? Math.round((intensityRaw / 5) * 100) : Math.min(100, Math.max(0, intensityRaw)))
                        : undefined;
                    return (
                        <div key={`meta-${i}`} style={{ padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-default)', background: 'var(--bg-subtle)', borderLeft: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '.04em' }}>
                            {st.emotion && <span className={moodSignal(st.emotion)}></span>}
                            <span style={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {st.duration || ''}{st.duration && st.emotion ? ' · ' : ''}{st.emotion || ''}
                                {normalized !== undefined && (
                                    <span style={{ marginLeft: 4, color: 'var(--fg-muted)', fontWeight: 400 }}>{normalized}</span>
                                )}
                            </span>
                        </div>
                    );
                })}
                {/* Lanes */}
                {lanes.map((lane, li) => ([
                    <div key={`l-label-${li}`} className="bp-cell--label" style={{ padding: '6px 10px', background: lane.highlight ? 'rgba(200,16,46,0.04)' : 'var(--bg-surface)', borderTop: '1px solid var(--border-default)', borderLeft: lane.highlight ? '3px solid var(--nu-red-600)' : 'none', display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: lane.highlight ? 'var(--nu-red-700)' : 'var(--fg-muted)', textTransform: 'uppercase', lineHeight: 1.2 }}>{lane.label}</div>
                    </div>,
                    ...stages.map((st, i) => {
                        const txt = (st as any)[lane.key] as string | undefined;
                        return (
                            <div key={`l-${li}-${i}`} className="bp-cell" style={{
                                padding: '6px 10px',
                                borderTop: '1px solid var(--border-default)',
                                borderLeft: '1px solid var(--border-default)',
                                fontSize: 9.5,
                                color: 'var(--fg-default)',
                                lineHeight: 1.45,
                                background: lane.highlight ? 'rgba(200,16,46,0.02)' : 'var(--bg-surface)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'flex-start',
                            }}>
                                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>
                                    {truncate(txt, 110) || '—'}
                                </span>
                            </div>
                        );
                    }),
                ])).flat()}
                {/* Fail-points row */}
                <div style={{ padding: '6px 10px', background: 'rgba(200,16,46,0.04)', borderTop: '2px solid var(--nu-red-600)', display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'var(--nu-red-700)', textTransform: 'uppercase', lineHeight: 1.2 }}>Fail<br />points</div>
                </div>
                {stages.map((st, i) => (
                    <div key={`fp-${i}`} className="bp-cell fail" style={{
                        padding: '6px 10px',
                        borderTop: '2px solid var(--nu-red-600)',
                        borderLeft: '1px solid var(--border-default)',
                        fontSize: 9.5,
                        color: st.failPoint ? 'var(--nu-red-700)' : 'var(--fg-default)',
                        lineHeight: 1.45,
                        fontWeight: st.failPoint ? 600 : 400,
                        background: st.failPoint ? 'rgba(200,16,46,0.06)' : 'var(--bg-surface)',
                        display: 'flex', alignItems: 'flex-start', overflow: 'hidden',
                    }}>
                        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>
                            {st.failPoint && <span className="signal signal--red" style={{ marginRight: 4 }}></span>}{truncate(st.painPoint, 110) || '—'}
                        </span>
                    </div>
                ))}
            </div>
            {/* JM-depth: verbatim voice-of-user row when stages carry voiceQuote */}
            {hasVoiceQuotes && (
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, margin: '4px 28px 0', borderTop: '1px dashed var(--border-default)' }}>
                    <div style={{ padding: '6px 10px', fontSize: 8, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--nu-red-700)', display: 'flex', alignItems: 'center' }}>Voice</div>
                    {stages.map((st, i) => (
                        <div key={`vq-${i}`} style={{ padding: '6px 10px', borderLeft: '1px solid var(--border-default)', minWidth: 0, overflow: 'hidden' }}>
                            {st.voiceQuote ? (
                                <blockquote className="vq" style={{ margin: 0, fontSize: 9.5, fontStyle: 'italic', color: 'var(--fg-strong)', lineHeight: 1.4, borderLeft: '2px solid var(--nu-red-600)', paddingLeft: 6 }}>
                                    {`“${truncate(st.voiceQuote, 120)}”`}
                                    {st.sourceAttribution && (
                                        <cite style={{ display: 'block', fontStyle: 'normal', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--fg-muted)', marginTop: 3, letterSpacing: '.04em' }}>
                                            {truncate(st.sourceAttribution, 60)}
                                        </cite>
                                    )}
                                </blockquote>
                            ) : (
                                <span style={{ fontSize: 8, color: 'var(--fg-muted)' }}>—</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {data.keyInsight && (
                <div className="art-card" style={{ margin: '8px 28px 0', padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)', fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5 }}>
                    {truncate(data.keyInsight, 260)}
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 12. GAP MATRIX (gap-analysis-evaluator / gap) ===
// 2026-05-23 — Refactored to NU .matbar primitive (gap-analysis.html §6.5).
// .matbar__track holds .matbar__current (ink fill) + .matbar__target (red
// pin). Severity uses NU .pill variants (--error/--warning/--special).
export const GapMatrixSlide: React.FC<{ title: string; data: GapMatrixData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const max = data.scaleMax || 5;
    const rows = data.gaps.slice(0, 6);
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
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>Capability</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                        {Array.from({ length: max }).map((_, i) => <span key={i}>L{i + 1}</span>)}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', textAlign: 'right' }}>Severity</div>
                </div>
                {rows.map((g, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '30% 1fr 90px', gap: 12, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 11, color: 'var(--fg-strong)', fontWeight: 600, lineHeight: 1.3 }}>{g.capability}</div>
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
                                <span style={{ position: 'absolute', left: 6, top: 0, fontSize: 9, fontWeight: 700, color: 'var(--white)', lineHeight: '16px', mixBlendMode: 'difference' }}>{g.currentMaturity}</span>
                                <span style={{ position: 'absolute', right: 6, top: 0, fontSize: 9, fontWeight: 700, color: 'var(--nu-red-700)', lineHeight: '16px' }}>→ {g.targetMaturity}</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span className={sevPill(g.severity)}>{g.severity}</span>
                        </div>
                    </div>
                ))}
                {/* Legend + insight */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 4, fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                    <span><span style={{ display: 'inline-block', width: 14, height: 6, background: 'var(--ink-800)', verticalAlign: 'middle', marginRight: 4 }}></span>Current</span>
                    <span><span style={{ display: 'inline-block', width: 3, height: 10, background: 'var(--nu-red-600)', verticalAlign: 'middle', marginRight: 4 }}></span>Target</span>
                    {data.insight && <span style={{ flex: 1, textAlign: 'right', color: 'var(--fg-strong)', textTransform: 'none', letterSpacing: 0 }}>{data.insight}</span>}
                </div>
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 13. ARCHITECTURE MAP (tech-arch-generator / tech_node) ===
// 2026-05-23 — Refactored to NU c4-canvas pattern (tech-architecture.html §6.11).
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
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color: i === 0 ? 'var(--nu-red-100)' : 'var(--fg-muted)', textTransform: 'uppercase' }}>
                                Layer {String(i + 1).padStart(2, '0')}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? 'var(--white)' : 'var(--fg-strong)', marginTop: 3, lineHeight: 1.25 }}>{layer.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignContent: 'flex-start' }}>
                            {layer.nodes.slice(0, 6).map((n, ni) => (
                                <div key={ni} className="art-card" style={{ flex: '1 1 calc(33% - 6px)', minWidth: 0, padding: '6px 10px', borderLeft: `3px solid ${typeAccent(n.type)}` }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-strong)', lineHeight: 1.2 }}>{n.name}</div>
                                    {n.type && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 600, letterSpacing: '.1em', color: typeAccent(n.type), textTransform: 'uppercase', marginTop: 2 }}>{n.type}</div>}
                                    {n.description && <div style={{ fontSize: 9, color: 'var(--fg-default)', lineHeight: 1.4, marginTop: 3 }}>{n.description}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {data.flowSummary && (
                <div className="art-card" style={{ margin: '8px 28px 0', padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginRight: 8 }}>Flow</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.45 }}>{data.flowSummary}</span>
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// 2026-05-23 — Refactored to NU primitives (prd.html §6.9). Priority becomes
// NU .pill variant. Two modes preserved: DEEP for single feature with rich
// narrative, COMPACT for 2-3 side-by-side cards. Both share .art-card
// chrome with a top accent that maps priority to brand red (must) or muted
// (others) — staying inside "red as scalpel".
export const PrdFeatureSlide: React.FC<{ title: string; data: PrdFeatureData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const allFeatures = Array.isArray(data?.features) ? data.features : [];
    const prioPill = (p: string) => p === 'must' ? 'pill pill--error' : p === 'should' ? 'pill pill--warning' : p === 'could' ? 'pill pill--progress' : 'pill pill--outline';
    const prioAccent = (p: string) => p === 'must' ? 'var(--nu-red-600)' : 'var(--ink-700)';
    const single = allFeatures.length === 1 ? allFeatures[0] : null;
    const isDeep = !!(single && (single.technicalDetails || single.problemSolved || single.stakeholders || (Array.isArray(single.evidence) && single.evidence.length > 0)));

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
                            <span className={prioPill(f.priority)}>{f.priority}</span>
                            <h2 className="art-finding art-finding--sm" style={{ fontSize: 14 }}>{f.name}</h2>
                        </div>
                        <div className="art-card" style={{ padding: '10px 12px', borderLeft: `3px solid ${prioAccent(f.priority)}`, fontStyle: 'italic', fontSize: 10.5, color: 'var(--fg-default)', lineHeight: 1.5 }}>
                            {f.userStory}
                        </div>
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>Acceptance criteria</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {(Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 6).map((c, ci) => (
                                    <li key={ci} style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.4, paddingLeft: 14, position: 'relative', marginBottom: 4 }}>
                                        <span style={{ position: 'absolute', left: 0, color: 'var(--success-fg)', fontWeight: 700 }}>✓</span>{c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                        {f.problemSolved && (
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--nu-red-700)', marginBottom: 3 }}>Problem solved</div>
                                <p style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.45, margin: 0 }}>{f.problemSolved}</p>
                            </div>
                        )}
                        {f.technicalDetails && (
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3 }}>Technical details</div>
                                <p style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.45, margin: 0 }}>{f.technicalDetails}</p>
                            </div>
                        )}
                        {f.stakeholders && (
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 3 }}>Stakeholders</div>
                                <p style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.45, margin: 0 }}>{f.stakeholders}</p>
                            </div>
                        )}
                        {Array.isArray(f.evidence) && f.evidence.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 4 }}>Evidence</div>
                                {f.evidence.slice(0, 3).map((e, ei) => (
                                    <div key={ei} style={{ marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid var(--nu-red-600)' }}>
                                        <div style={{ fontSize: 9.5, color: 'var(--fg-strong)', lineHeight: 1.4, fontStyle: 'italic' }}>“{e.text}”</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-muted)', marginTop: 2, letterSpacing: '.04em' }}>
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
                        <span className={prioPill(f.priority)} style={{ alignSelf: 'flex-start' }}>{f.priority}</span>
                        <h3 className="art-finding art-finding--sm" style={{ fontSize: 13 }}>{f.name}</h3>
                        <p style={{ fontSize: 10.5, color: 'var(--fg-default)', lineHeight: 1.5, fontStyle: 'italic', margin: 0, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>{f.userStory}</p>
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>Acceptance</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {(Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 5).map((c, ci) => (
                                    <li key={ci} style={{ fontSize: 10, color: 'var(--fg-default)', lineHeight: 1.4, paddingLeft: 12, position: 'relative', marginBottom: 4 }}>
                                        <span style={{ position: 'absolute', left: 0, color: 'var(--success-fg)', fontWeight: 700 }}>✓</span>{c}
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

// 2026-05-23 — Refactored to NU .dtable + NU .pill primitives
// (tech-audit.html §6.12). Status + risk become NU pill variants; row hover
// + striping handled by the shared .dtable layer.
export const SystemsInventorySlide: React.FC<{ title: string; data: SystemsInventoryData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const rows = data.systems.slice(0, 8);
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
                                    {s.description && <div style={{ fontSize: 9, color: 'var(--fg-muted)', fontWeight: 400, marginTop: 2, lineHeight: 1.35 }}>{s.description}</div>}
                                </td>
                                <td style={{ color: 'var(--fg-default)', fontSize: 10 }}>{s.category}</td>
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
                    <div className="art-card" style={{ marginTop: 10, padding: '8px 14px', borderLeft: '3px solid var(--nu-red-600)', fontSize: 11, color: 'var(--fg-strong)', lineHeight: 1.5 }}>
                        {data.insight}
                    </div>
                )}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};
