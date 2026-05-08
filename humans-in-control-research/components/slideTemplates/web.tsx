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
export const PersonaCardSlide: React.FC<{ data: PersonaCardData; sources?: string[]; hasImage: boolean; brand?: Brand }> = ({ data, sources = [], hasImage, brand }) => {
    const T = resolveT(brand);
    const p = data;
    return (
        <div style={{ padding: '32px 36px 22px', display: 'flex', flexDirection: 'column', gap: 11, height: '100%' }}>
            <div>
                <Tag text="PERSONA" />
                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 900, fontSize: hasImage ? 28 : 34, color: hex(T.INK), lineHeight: 1.0, marginTop: 4, letterSpacing: '-0.02em' }}>{p.name}</div>
                <div style={{ fontSize: hasImage ? 12 : 14, color: hex(T.SECONDARY), fontWeight: 500, marginTop: 4 }}>
                    {p.role}{p.demographics ? `  |  ${p.demographics}` : ''}
                </div>
            </div>
            {p.quote && (
                <div style={{ fontSize: hasImage ? 11 : 13, fontStyle: 'italic', color: hex(T.INK), borderLeft: `3px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 12, lineHeight: 1.45, fontWeight: 300 }}>
                    "{p.quote}"
                </div>
            )}
            {p.jtbd && (
                <div style={{ fontSize: hasImage ? 10 : 11, color: hex(T.INK), background: hex(T.PANEL), padding: '8px 12px', lineHeight: 1.4 }}>
                    <strong style={{ fontWeight: 700 }}>JTBD: </strong>{p.jtbd}
                </div>
            )}
            {p.goals && (
                <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(p.goals).filter(([, v]) => v).map(([k, v]) => {
                        const isLife = k === 'lifeGoal';
                        const isExp = k === 'experienceGoal';
                        return (
                            <div key={k} style={{ flex: 1, fontSize: 9, padding: '8px 10px', background: hex(isLife ? T.TEAL : isExp ? T.CHARTREUSE_PALE : T.PANEL), color: hex(isLife ? T.WHITE : T.INK), lineHeight: 1.3 }}>
                                <div style={{ fontWeight: 700, fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4, color: hex(isLife ? T.CHARTREUSE_BRIGHT : T.SECONDARY) }}>{k.replace('Goal', '')}</div>
                                {v}
                            </div>
                        );
                    })}
                </div>
            )}
            {p.painPoints && p.painPoints.length > 0 && (
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: hex(T.RED), marginBottom: 4 }}>PAIN POINTS</div>
                    {p.painPoints.slice(0, hasImage ? 2 : 3).map((pp, i) => (
                        <div key={i} style={{ fontSize: hasImage ? 9 : 10, color: hex(T.BODY), marginBottom: 5, paddingLeft: 10, borderLeft: `2px solid ${hex(T.RULE)}`, lineHeight: 1.4 }}>
                            <strong style={{ color: hex(T.INK) }}>{pp.label}:</strong> "{truncate(pp.quote, 140)}" <span style={{ fontSize: 8, color: hex(T.MUTED) }}>({pp.source})</span>
                        </div>
                    ))}
                </div>
            )}
            {p.motivations && p.motivations.length > 0 && (
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: hex(T.GREEN), marginBottom: 4 }}>MOTIVATIONS</div>
                    {p.motivations.slice(0, hasImage ? 2 : 3).map((m, i) => (
                        <div key={i} style={{ fontSize: hasImage ? 9 : 10, color: hex(T.BODY), marginBottom: 5, paddingLeft: 10, borderLeft: `2px solid ${hex(T.RULE)}`, lineHeight: 1.4 }}>
                            <strong style={{ color: hex(T.INK) }}>{m.label}:</strong> "{truncate(m.quote, 140)}" <span style={{ fontSize: 8, color: hex(T.MUTED) }}>({m.source})</span>
                        </div>
                    ))}
                </div>
            )}
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 2. RECOMMENDATION (strategy-author) ===
export const RecommendationSlide: React.FC<{ title: string; data: RecommendationData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const hasGrid = !!(data.impactGrid && (data.impactGrid.baseline || data.impactGrid.target || data.impactGrid.timeframe || data.impactGrid.owner));
    const hasEvidence = !!(data.evidence && data.evidence.length > 0);
    return (
    <div style={{ padding: '28px 40px 16px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div>
            <Tag text="STRATEGIC RECOMMENDATION" brand={brand} />
            <Title text={title} size={24} brand={brand} />
        </div>
        <div style={{ display: 'flex', gap: 22, flex: 1, minHeight: 0 }}>
            {/* LEFT — action + supporting actions + evidence strip */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 700, fontSize: 15, color: hex(T.INK), lineHeight: 1.3, borderLeft: `3px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 12 }}>
                    {data.actionTitle}
                </div>
                {data.rationale && (
                    <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.55, fontWeight: 300 }}>{truncate(data.rationale, 360)}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                    {data.supportingActions.slice(0, 5).map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 22, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, flexShrink: 0, width: 28 }}>
                                {String(i + 1).padStart(2, '0')}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 10.5, color: hex(T.INK), marginBottom: 2, letterSpacing: '-0.005em' }}>{a.name}</div>
                                <div style={{ fontSize: 9.5, color: hex(T.BODY), lineHeight: 1.45, fontWeight: 300 }}>{truncate(a.description, 220)}</div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* EVIDENCE STRIP — transcript/corpus quotes that justify the action */}
                {hasEvidence && (
                    <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${hex(T.RULE)}` }}>
                        <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: hex(T.SECONDARY), marginBottom: 6 }}>EVIDENCE</div>
                        <QuoteStack quotes={(data.evidence || []).slice(0, 2)} size="compact" brand={brand} maxChars={180} />
                    </div>
                )}
            </div>
            {/* RIGHT — 4-cell impact grid OR legacy hero number */}
            {hasGrid ? (
                <div style={{ flex: 1, minWidth: 0, background: hex(T.PALE), padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, overflow: 'hidden' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase' as const, color: hex(T.SECONDARY) }}>PROJECTED IMPACT</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
                        {[
                            { k: 'BASELINE', v: data.impactGrid?.baseline, color: T.MUTED },
                            { k: 'TARGET', v: data.impactGrid?.target, color: T.TEAL },
                            { k: 'TIMEFRAME', v: data.impactGrid?.timeframe, color: T.CYAN },
                            { k: 'OWNER', v: data.impactGrid?.owner, color: T.CHARTREUSE_BRIGHT },
                        ].map(c => (
                            <div key={c.k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontSize: 7, letterSpacing: '2px', color: hex(c.color), fontWeight: 800, textTransform: 'uppercase' as const }}>{c.k}</div>
                                <div style={{ fontSize: 11, color: hex(T.INK), lineHeight: 1.3, fontWeight: 700 }}>{c.v ? truncate(c.v, 110) : '—'}</div>
                            </div>
                        ))}
                    </div>
                    {data.impactMetric && (
                        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${hex(T.RULE)}` }}>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: heroNumberSize(data.impactMetric.value, { max: 38, min: 20, baseChars: 4 }), color: hex(T.TEAL), lineHeight: 1, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{data.impactMetric.value}</div>
                            <div style={{ fontSize: 9, color: hex(T.SECONDARY), marginTop: 4, lineHeight: 1.35 }}>{truncate(data.impactMetric.label, 80)}</div>
                        </div>
                    )}
                </div>
            ) : data.impactMetric && (() => {
                const mSize = heroNumberSize(data.impactMetric.value, { max: 60, min: 30, baseChars: 4 });
                return (
                    <div style={{ flex: 1, minWidth: 0, background: hex(T.PALE), padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, overflow: 'hidden' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: hex(T.SECONDARY), marginBottom: 8 }}>PROJECTED IMPACT</div>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: mSize, color: hex(T.TEAL), lineHeight: 1.0, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{data.impactMetric.value}</div>
                        <div style={{ fontSize: 10, color: hex(T.INK), marginTop: 10, lineHeight: 1.35, fontWeight: 500 }}>{truncate(data.impactMetric.label, 100)}</div>
                    </div>
                );
            })()}
        </div>
        {/* IMPLICATION line */}
        {data.implication && (
            <div style={{ fontSize: 10, color: hex(T.INK), fontWeight: 600, borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 8 }}>
                <span style={{ letterSpacing: '1.5px', fontSize: 7.5, color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 800, marginRight: 8, textTransform: 'uppercase' as const }}>IMPLICATION</span>
                {truncate(data.implication, 260)}
            </div>
        )}
        <SourceFooter sources={sources} brand={brand} />
    </div>
    );
};

// === 3. THEME CLUSTER (theme-analyst) ===
export const ThemeClusterSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const themes = data.themes.slice(0, 4);
    return (
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
            <div>
                <Tag text="EMERGING THEMES" brand={brand} />
                <Title text={title} size={28} brand={brand} />
            </div>
            <div style={{ display: 'flex', gap: 0, flex: 1, borderTop: `1px solid ${hex(T.RULE)}`, minHeight: 0 }}>
                {themes.map((t, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, padding: '14px 14px 8px', borderLeft: i > 0 ? `1px solid ${hex(T.RULE)}` : 'none', display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 30, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1 }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: hex(T.INK), lineHeight: 1.22, letterSpacing: '-0.01em' }}>{truncate(t.name, 60)}</div>
                        <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>{truncate(t.insight, 200)}</div>
                        <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={130} />
                        {(!t.quotes || t.quotes.length === 0) && (
                            <div style={{ fontSize: 8, color: hex(T.MUTED), marginTop: 'auto', paddingTop: 6 }}>{truncate(t.source, 50)}</div>
                        )}
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 3a. THEME SPOTLIGHT — hero theme (60%) + supporting tiles (40%). ===
// Use when one theme dominates and 2-3 corroborate it. Asymmetric, dramatic.
// 2026-04-21: gracefully degrades when the AI only supplied one theme — hero
// expands to fill the slide and the supporting panel is hidden entirely
// rather than rendering an empty white rectangle ("gaping hole").
export const ThemeSpotlightSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const all = data.themes.slice(0, 4);
    const hero = all[0];
    const supporting = all.slice(1, 4);
    if (!hero) return null;
    const hasSupporting = supporting.length > 0;
    if (!hasSupporting) {
        console.warn(`[ThemeSpotlight] rendering hero-only — AI supplied ${all.length} theme(s), minimum 3 required for full spotlight layout`);
    }
    return (
        <div style={{ padding: '28px 36px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div>
                <Tag text={hasSupporting ? "EMERGING THEME — SPOTLIGHT" : "EMERGING THEME"} brand={brand} />
                <Title text={title} size={22} brand={brand} />
            </div>
            <div style={{ display: 'flex', gap: 22, flex: 1, minHeight: 0 }}>
                {/* Hero — 60% when supporting present, 100% otherwise */}
                <div style={{
                    flex: hasSupporting ? 3 : 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    paddingRight: hasSupporting ? 18 : 0,
                    borderRight: hasSupporting ? `1px solid ${hex(T.RULE)}` : 'none',
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 56, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.9, letterSpacing: '-0.04em' }}>01</div>
                        <div style={{ fontWeight: 800, fontSize: hasSupporting ? 17 : 22, color: hex(T.INK), lineHeight: 1.15, letterSpacing: '-0.015em' }}>{truncate(hero.name, hasSupporting ? 90 : 140)}</div>
                    </div>
                    <div style={{ fontSize: hasSupporting ? 10.5 : 12, color: hex(T.BODY), lineHeight: 1.55, fontWeight: 300 }}>{truncate(hero.insight, hasSupporting ? 420 : 600)}</div>
                    <QuoteStack quotes={resolveThemeQuotes(hero)} size="hero" brand={brand} maxChars={hasSupporting ? 280 : 400} />
                    {/* PATTERN SIGNAL — cross-source pattern callout under the hero quote */}
                    {data.patternSignal && (
                        <div style={{
                            marginTop: 4,
                            background: hex(T.PALE),
                            padding: '9px 12px 10px',
                            borderLeft: `3px solid ${hex(T.CYAN)}`,
                        }}>
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: hex(T.CYAN), marginBottom: 3 }}>PATTERN SIGNAL</div>
                            <div style={{ fontSize: 10, color: hex(T.INK), lineHeight: 1.5, fontWeight: 400 }}>{truncate(data.patternSignal, 260)}</div>
                        </div>
                    )}
                    {/* IMPLICATION — per-hero-theme implication line */}
                    {hero.implication && (
                        <div style={{
                            fontSize: 10, color: hex(T.INK), fontWeight: 600,
                            borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 8, marginTop: 'auto',
                        }}>
                            <span style={{ letterSpacing: '1.5px', fontSize: 7.5, color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 800, marginRight: 8 }}>IMPLICATION</span>
                            {truncate(hero.implication, 220)}
                        </div>
                    )}
                </div>
                {/* Supporting panel — 2-sentence signals */}
                {hasSupporting && (
                    <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: hex(T.SECONDARY), marginBottom: 6 }}>SUPPORTING SIGNALS</div>
                        {supporting.map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < supporting.length - 1 ? `1px solid ${hex(T.RULE)}` : 'none' }}>
                                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 22, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, flexShrink: 0, width: 26 }}>
                                    {String(i + 2).padStart(2, '0')}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ fontWeight: 700, fontSize: 10.5, color: hex(T.INK), lineHeight: 1.2, letterSpacing: '-0.005em' }}>{truncate(t.name, 80)}</div>
                                    {/* 2-sentence mini-finding instead of one thin line */}
                                    <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.45, fontWeight: 300 }}>{truncate(t.insight, 220)}</div>
                                    <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={160} />
                                    {t.signal && (
                                        <div style={{ fontSize: 7.5, letterSpacing: '1.5px', color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 800, textTransform: 'uppercase' as const, marginTop: 2 }}>
                                            SIGNAL · {truncate(t.signal, 60)}
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

// === 3b. THEME ARC — narrative chain (cause → effect → resolution). ===
// Use when themes build sequentially. Connector lines visualize causation.
export const ThemeArcSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const themes = data.themes.slice(0, 4);
    return (
        <div style={{ padding: '30px 40px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <div>
                <Tag text="THEMATIC ARC" brand={brand} />
                <Title text={title} size={22} brand={brand} />
            </div>
            {/* Numbered chain — top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 4 }}>
                {themes.map((t, i) => (
                    <React.Fragment key={`n-${i}`}>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' as const }}>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 40, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, letterSpacing: '-0.03em' }}>
                                {String(i + 1).padStart(2, '0')}
                            </div>
                        </div>
                        {i < themes.length - 1 && (
                            <div style={{ width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const }}>
                                <div style={{ width: '100%', height: 1, background: hex(T.INK) }} />
                                <div style={{ position: 'absolute' as const, right: -1, top: '50%', marginTop: -4, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: `6px solid ${hex(T.INK)}` }} />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Theme cells — body row with expanded density */}
            <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, marginTop: 2 }}>
                {themes.map((t, i) => (
                    <React.Fragment key={`c-${i}`}>
                        <div style={{ flex: 1, minWidth: 0, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ fontWeight: 800, fontSize: 11.5, color: hex(T.INK), lineHeight: 1.2, letterSpacing: '-0.01em' }}>{truncate(t.name, 70)}</div>
                            {/* Expanded 2-3 sentence description */}
                            <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>{truncate(t.insight, 280)}</div>
                            <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={140} />
                            {/* SIGNAL metric tag — concrete proof the step is real */}
                            {t.signal && (
                                <div style={{
                                    marginTop: 'auto',
                                    borderTop: `1px solid ${hex(T.RULE)}`,
                                    paddingTop: 5,
                                    fontSize: 7.5,
                                    letterSpacing: '1.5px',
                                    color: hex(T.CHARTREUSE_BRIGHT),
                                    fontWeight: 800,
                                    textTransform: 'uppercase' as const,
                                    lineHeight: 1.35,
                                }}>
                                    SIGNAL · <span style={{ color: hex(T.INK), letterSpacing: '0.3px', textTransform: 'none' as const, fontWeight: 700 }}>{truncate(t.signal, 56)}</span>
                                </div>
                            )}
                        </div>
                        {i < themes.length - 1 && <div style={{ width: 1, background: hex(T.RULE), margin: '6px 0' }} />}
                    </React.Fragment>
                ))}
            </div>
            {/* Optional cross-step pattern signal */}
            {data.patternSignal && (
                <div style={{ fontSize: 9.5, color: hex(T.INK), background: hex(T.PALE), padding: '7px 12px', borderLeft: `3px solid ${hex(T.CYAN)}`, lineHeight: 1.5 }}>
                    <span style={{ fontSize: 7.5, letterSpacing: '2px', color: hex(T.CYAN), fontWeight: 800, marginRight: 8, textTransform: 'uppercase' as const }}>PATTERN</span>
                    {truncate(data.patternSignal, 240)}
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 3c. THEME MOSAIC — 2x2 ivory grid with hairline rules. ===
// REDESIGNED 2026-04-21: the original black-and-white inverse-checkerboard
// read as stark/off-brand. Replaced with a uniform ivory (PALE) surface for
// all four cells, separated by hairline rules (RULE), with a single
// chartreuse accent bar on the PRIMARY cell (index 0) to denote priority.
// The primary cell earns its visual weight through the accent bar and
// slightly bolder number, not through surface inversion.
export const ThemeMosaicSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const themes = data.themes.slice(0, 4);
    while (themes.length < 4) themes.push({ name: '', insight: '', evidence: '', source: '' });

    return (
        <div style={{ padding: '22px 30px 14px', display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
            <div>
                <Tag text="THEMATIC MOSAIC" brand={brand} />
                <Title text={title} size={20} brand={brand} />
            </div>
            {/* 2x2 grid — uniform ivory, hairline rules, one chartreuse accent on primary */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: 0,
                flex: 1,
                minHeight: 0,
                background: hex(T.PALE),
                border: `1px solid ${hex(T.RULE)}`,
            }}>
                {themes.map((t, i) => {
                    if (!t.name) return <div key={i} style={{
                        borderRight: i % 2 === 0 ? `1px solid ${hex(T.RULE)}` : 'none',
                        borderBottom: i < 2 ? `1px solid ${hex(T.RULE)}` : 'none',
                    }} />;
                    const isPrimary = i === 0;
                    return (
                        <div key={i} style={{
                            padding: '14px 18px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            overflow: 'hidden',
                            // Hairline rules between cells (no line on outer edges)
                            borderRight: i % 2 === 0 ? `1px solid ${hex(T.RULE)}` : 'none',
                            borderBottom: i < 2 ? `1px solid ${hex(T.RULE)}` : 'none',
                            // Chartreuse accent bar on the PRIMARY cell only
                            borderTop: isPrimary ? `3px solid ${hex(T.CHARTREUSE_BRIGHT)}` : '3px solid transparent',
                            position: 'relative' as const,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                                <div style={{
                                    fontFamily: `'${T.FONT}', sans-serif`,
                                    fontWeight: isPrimary ? 300 : 200,
                                    fontSize: 32,
                                    color: hex(T.CHARTREUSE_BRIGHT),
                                    lineHeight: 1,
                                    letterSpacing: '-0.03em',
                                }}>
                                    {String(i + 1).padStart(2, '0')}
                                </div>
                                <div style={{
                                    fontWeight: 800,
                                    fontSize: 12,
                                    color: hex(T.INK),
                                    lineHeight: 1.15,
                                    letterSpacing: '-0.01em',
                                    flex: 1,
                                }}>{truncate(t.name, 80)}</div>
                            </div>
                            {/* 2-3 sentence insight instead of the old 1-line */}
                            <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>{truncate(t.insight, 240)}</div>
                            <QuoteStack quotes={resolveThemeQuotes(t)} size="compact" brand={brand} maxChars={140} />
                            {t.signal && (
                                <div style={{
                                    marginTop: 'auto',
                                    paddingTop: 5,
                                    fontSize: 7.5,
                                    letterSpacing: '1.5px',
                                    color: hex(T.CHARTREUSE_BRIGHT),
                                    fontWeight: 800,
                                    textTransform: 'uppercase' as const,
                                }}>
                                    SIGNAL · <span style={{ color: hex(T.INK), letterSpacing: '0.3px', textTransform: 'none' as const, fontWeight: 700 }}>{truncate(t.signal, 52)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Optional cross-theme pattern footer */}
            {data.patternSignal && (
                <div style={{ fontSize: 9.5, color: hex(T.INK), background: hex(T.WHITE), padding: '7px 12px', borderLeft: `3px solid ${hex(T.CYAN)}`, lineHeight: 1.5 }}>
                    <span style={{ fontSize: 7.5, letterSpacing: '2px', color: hex(T.CYAN), fontWeight: 800, marginRight: 8, textTransform: 'uppercase' as const }}>PATTERN</span>
                    {truncate(data.patternSignal, 240)}
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 4. COMPETITIVE MATRIX (competitive-analyst) ===
// Expanded density: column definitions under each header, per-row evidence line,
// scale legend at bottom (Absent → Optimized), subject row highlighted.
export const CompetitiveMatrixSlide: React.FC<{ title: string; data: CompetitiveMatrixData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const max = data.scaleMax || 5;
    // Reserve 22% for name + evidence column, split remaining among capability columns
    const nameColPct = 22;
    const capColPct = (100 - nameColPct) / data.columns.length;
    const rows = data.rows.slice(0, 7);
    const subjectLower = (data.subjectRow || '').toLowerCase();

    // Compute average score per capability for "gap vs best" bar marker
    const bestPerCol: number[] = data.columns.map((_, ci) => Math.max(...rows.map(r => r.scores[ci] || 0)));

    return (
        <div style={{ padding: '28px 36px 16px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'hidden' }}>
            <div>
                <Tag text="COMPETITIVE LANDSCAPE" brand={brand} />
                <Title text={title} size={22} brand={brand} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 10, tableLayout: 'fixed' as const }}>
                <thead>
                    <tr style={{ background: hex(T.TEAL), color: hex(T.WHITE) }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left' as const, fontWeight: 700, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase' as const, width: `${nameColPct}%` }}>INSTITUTION</th>
                        {data.columns.map((c, i) => (
                            <th key={i} style={{ padding: '8px 6px', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' as const, width: `${capColPct}%`, textAlign: 'center' as const, verticalAlign: 'top' as const }}>
                                <div style={{ lineHeight: 1.2 }}>{truncate(c, 32)}</div>
                                {data.columnDefs?.[i] && (
                                    <div style={{ fontSize: 7, fontWeight: 400, marginTop: 4, opacity: 0.75, letterSpacing: '0.5px', textTransform: 'none' as const, lineHeight: 1.3 }}>{truncate(data.columnDefs[i], 50)}</div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => {
                        const isSubject = subjectLower && row.name.toLowerCase().includes(subjectLower);
                        return (
                            <tr key={ri} style={{ background: isSubject ? hex(T.CHARTREUSE_PALE) : (ri % 2 === 0 ? hex(T.WHITE) : hex(T.PALE)), borderBottom: `1px solid ${hex(T.RULE)}` }}>
                                <td style={{ padding: '10px 12px', color: hex(T.INK), verticalAlign: 'top' as const }}>
                                    <div style={{ fontWeight: isSubject ? 900 : 700, fontSize: 11, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{truncate(row.name, 48)}</div>
                                    {row.note && <div style={{ fontSize: 8, fontWeight: 400, color: hex(T.MUTED), marginTop: 3, lineHeight: 1.35, fontStyle: 'italic' as const }}>{truncate(row.note, 90)}</div>}
                                </td>
                                {row.scores.map((s, si) => (
                                    <td key={si} style={{ padding: '8px 4px', textAlign: 'center' as const, verticalAlign: 'middle' as const }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 3 }}>
                                            {Array.from({ length: max }).map((_, di) => (
                                                <div key={di} style={{ width: 8, height: 8, background: di < s ? hex(T.CHARTREUSE_BRIGHT) : hex(T.RULE) }} />
                                            ))}
                                        </div>
                                        <div style={{ fontSize: 8, fontWeight: 700, color: s === bestPerCol[si] ? hex(T.GREEN) : s < bestPerCol[si] - 1 ? hex(T.RUST) : hex(T.MUTED) }}>
                                            {s}/{max}{s < bestPerCol[si] ? ` · -${bestPerCol[si] - s}` : ''}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {/* Scale legend */}
            {data.scaleLabels && data.scaleLabels.length === max && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: hex(T.MUTED), fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, paddingLeft: `${nameColPct}%`, paddingTop: 2 }}>
                    {data.scaleLabels.map((l, i) => (
                        <span key={i} style={{ flex: 1, textAlign: 'center' as const }}>L{i + 1}  {truncate(l, 16)}</span>
                    ))}
                </div>
            )}
            {data.insight && (
                <div style={{ fontSize: 10, color: hex(T.INK), background: hex(T.PALE), padding: '10px 14px', borderLeft: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, lineHeight: 1.5, fontWeight: 400 }}>
                    {truncate(data.insight, 280)}
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 5. BLOCK QUOTE (evidence-curator) — denser with context + corroborating data ===
export const BlockQuoteSlide: React.FC<{ data: BlockQuoteData; sources?: string[]; brand?: Brand }> = ({ data, sources = [], brand }) => {
    const T = resolveT(brand);
    const hasSidebar = !!(data.corroboratingData && data.corroboratingData.length > 0);
    // Quote body gets a little smaller when the sidebar is present so both fit.
    const quoteText = data.text || '';
    const qLen = quoteText.length;
    const baseQuoteSize = hasSidebar
        ? (qLen > 340 ? 15 : qLen > 220 ? 18 : qLen > 140 ? 20 : 22)
        : (qLen > 280 ? 18 : qLen > 180 ? 22 : qLen > 110 ? 26 : 28);
    return (
    <div style={{ padding: '34px 48px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 14, left: 28, fontFamily: 'Georgia, serif', fontSize: 100, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.7, fontWeight: 700, opacity: 0.6 }}>"</div>
        {data.context && (
            <div style={{ fontSize: 9, color: hex(T.SECONDARY), fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, marginLeft: 46 }}>{truncate(data.context, 90)}</div>
        )}
        <div style={{ display: 'flex', gap: 28, flex: 1, minHeight: 0 }}>
            {/* LEFT — hero quote + context paragraph + attribution */}
            <div style={{ flex: hasSidebar ? 2 : 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 300, fontSize: baseQuoteSize, color: hex(T.INK), lineHeight: 1.35, fontStyle: 'italic' as const, letterSpacing: '-0.005em' }}>
                    {smartQuoteClip(quoteText, hasSidebar ? 460 : 520)}
                </div>
                {/* CONTEXT paragraph — 3-4 sentences of who/when/why */}
                {data.contextParagraph && (
                    <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.6, fontWeight: 300, paddingLeft: 14, borderLeft: `1px solid ${hex(T.RULE)}` }}>
                        {truncate(data.contextParagraph, 480)}
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto' }}>
                    <div style={{ width: 40, height: 1, background: hex(T.CHARTREUSE_BRIGHT) }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 12, color: hex(T.INK) }}>{data.attribution}</div>
                        {data.role && <div style={{ fontSize: 10, color: hex(T.SECONDARY), marginTop: 2 }}>{data.role}</div>}
                    </div>
                </div>
            </div>
            {/* RIGHT — CORROBORATING DATA sidebar */}
            {hasSidebar && (
                <div style={{ flex: 1, minWidth: 0, background: hex(T.PALE), padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, borderTop: `3px solid ${hex(T.CYAN)}`, overflow: 'hidden' }}>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: hex(T.CYAN) }}>CORROBORATING DATA</div>
                    {(data.corroboratingData || []).slice(0, 3).map((d, i) => {
                        const sz = heroNumberSize(d.value, { max: 30, min: 18, baseChars: 4 });
                        return (
                            <div key={i} style={{ borderTop: i > 0 ? `1px solid ${hex(T.RULE)}` : 'none', paddingTop: i > 0 ? 10 : 0 }}>
                                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 300, fontSize: sz, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{d.value}</div>
                                <div style={{ fontSize: 9.5, color: hex(T.INK), marginTop: 4, lineHeight: 1.4, fontWeight: 500 }}>{truncate(d.label, 100)}</div>
                                {d.source && (
                                    <div style={{ fontSize: 7.5, letterSpacing: '1.2px', color: hex(T.MUTED), marginTop: 3, textTransform: 'uppercase' as const, fontWeight: 700 }}>{truncate(d.source, 40)}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        {/* IMPLICATION line */}
        {data.implication && (
            <div style={{ fontSize: 10, color: hex(T.INK), fontWeight: 600, paddingTop: 6 }}>
                <span style={{ letterSpacing: '1.5px', fontSize: 7.5, color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 800, marginRight: 8, textTransform: 'uppercase' as const }}>IMPLICATION</span>
                {truncate(data.implication, 260)}
            </div>
        )}
        <div style={{ fontSize: 9, color: hex(T.MUTED), borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 8 }}>
            Source: {data.source}{sources && sources.length > 0 ? `  |  ${sources.filter(s => s !== data.source).join('  |  ')}` : ''}
        </div>
    </div>
    );
};

// === 6. CASE STUDY (case-study-analyst) ===
// Left column (65%): subject meta strip + 3 colored blocks (challenge/approach/outcome)
// Right column (35%): dashboard with hero metric + supporting metrics + optional quote
export const CaseStudySlide: React.FC<{ title: string; data: CaseStudyData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const hasRightPanel = !!(data.keyMetric || data.supportingMetrics?.length || data.pullQuote || data.comparables?.length);
    return (
    <div style={{ padding: '22px 32px 14px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
        <div>
            <Tag text={`CASE STUDY  /  ${data.subject.toUpperCase()}`} brand={brand} />
            <Title text={title} size={22} brand={brand} />
        </div>
        {/* Subject meta strip — industry / region / size / timeframe / investment */}
        {(data.subjectMeta || data.timeframe || data.investment) && (
            <div style={{ display: 'flex', gap: 22, fontSize: 9, fontWeight: 500, color: hex(T.SECONDARY), letterSpacing: '0.5px', paddingBottom: 6, borderBottom: `1px solid ${hex(T.RULE)}`, flexWrap: 'wrap' as const }}>
                {data.subjectMeta && <span>{truncate(data.subjectMeta, 90)}</span>}
                {data.timeframe && <span><strong style={{ color: hex(T.INK), letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontSize: 8 }}>TIMEFRAME</strong>  {truncate(data.timeframe, 40)}</span>}
                {data.investment && <span><strong style={{ color: hex(T.INK), letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontSize: 8 }}>INVESTMENT</strong>  {truncate(data.investment, 40)}</span>}
            </div>
        )}
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
            {/* LEFT — Challenge / Approach / Outcome narrative (denser) */}
            <div style={{ flex: hasRightPanel ? 1.9 : 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 0 }}>
                {[
                    { label: 'CHALLENGE', text: data.challenge, color: T.RED, bg: 'FFF5F5' },
                    { label: 'APPROACH', text: data.approach, color: T.CYAN, bg: 'F0FBFC' },
                    { label: 'OUTCOME', text: data.outcome, color: T.GREEN, bg: 'F0FBF5' },
                ].map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 12px', background: i % 2 === 0 ? hex(T.WHITE) : hex(T.PALE), borderLeft: `3px solid ${hex(b.color)}`, marginBottom: 4, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 76, flexShrink: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: hex(b.color), textTransform: 'uppercase' as const }}>{b.label}</div>
                        </div>
                        <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300, flex: 1, minWidth: 0 }}>{truncate(b.text, 340)}</div>
                    </div>
                ))}
                {/* LESSON FOR ADVANCEMENT — footer row synthesizing the takeaway */}
                {data.lesson && (
                    <div style={{ display: 'flex', gap: 12, padding: '9px 12px', background: hex(T.PALE), borderLeft: `3px solid ${hex(T.CHARTREUSE_BRIGHT)}`, marginTop: 2, minWidth: 0 }}>
                        <div style={{ width: 76, flexShrink: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '2px', color: hex(T.CHARTREUSE_BRIGHT), textTransform: 'uppercase' as const }}>LESSON</div>
                        </div>
                        <div style={{ fontSize: 10, color: hex(T.INK), lineHeight: 1.5, fontWeight: 500, flex: 1, minWidth: 0 }}>{truncate(data.lesson, 280)}</div>
                    </div>
                )}
            </div>
            {/* RIGHT — Metrics dashboard + comparables + optional pull quote */}
            {hasRightPanel && (
                <div style={{ flex: 1, minWidth: 0, background: hex(T.TEAL), padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                    {data.keyMetric && (() => {
                        const mSize = heroNumberSize(data.keyMetric.value, { max: 46, min: 22, baseChars: 4 });
                        return (
                            <div>
                                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: hex(T.CHARTREUSE_BRIGHT), marginBottom: 4 }}>KEY OUTCOME</div>
                                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: mSize, color: hex(T.WHITE), lineHeight: 1.0, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{data.keyMetric.value}</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 5, lineHeight: 1.35, fontWeight: 400 }}>{truncate(data.keyMetric.label, 90)}</div>
                            </div>
                        );
                    })()}
                    {/* Supporting metrics */}
                    {data.supportingMetrics && data.supportingMetrics.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: data.supportingMetrics.length > 1 ? '1fr 1fr' : '1fr', gap: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 9 }}>
                            {data.supportingMetrics.slice(0, 4).map((m, i) => {
                                const sz = heroNumberSize(m.value, { max: 24, min: 14, baseChars: 4 });
                                return (
                                    <div key={i}>
                                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 300, fontSize: sz, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{m.value}</div>
                                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 3, lineHeight: 1.3, fontWeight: 400 }}>{truncate(m.label, 60)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* COMPARABLES strip — 2-3 other orgs with adjacent results */}
                    {data.comparables && data.comparables.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 9 }}>
                            <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' as const, color: hex(T.CHARTREUSE_BRIGHT), marginBottom: 5 }}>COMPARABLES</div>
                            {data.comparables.slice(0, 3).map((c, i) => (
                                <div key={i} style={{ marginBottom: 5, paddingBottom: 4, borderBottom: i < Math.min(data.comparables!.length, 3) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                    <div style={{ fontSize: 9, color: hex(T.WHITE), fontWeight: 700, lineHeight: 1.25 }}>{truncate(c.name, 48)}</div>
                                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35, fontWeight: 300, marginTop: 2 }}>{truncate(c.outcome, 80)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Pull quote — full sentence preferred, role shown */}
                    {data.pullQuote && (
                        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 10 }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.92)', fontStyle: 'italic' as const, lineHeight: 1.5, borderLeft: `2px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 9, fontWeight: 300 }}>
                                "{smartQuoteClip(data.pullQuote.text, 200)}"
                            </div>
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', marginTop: 5, paddingLeft: 11, lineHeight: 1.4 }}>
                                — {data.pullQuote.attribution}{data.pullQuote.role ? `, ${data.pullQuote.role}` : ''}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        <SourceFooter sources={sources} brand={brand} />
    </div>
    );
};

// === 7. PRINCIPLES (strategy-author) ===
export const PrinciplesSlide: React.FC<{ title: string; data: PrinciplesData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const items = data.items.slice(0, 5);
    return (
        <div style={{ padding: '40px 56px 24px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
            <div>
                <Tag text="GUIDING PRINCIPLES" brand={brand} />
                <Title text={title} size={28} brand={brand} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                {items.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '14px 0', borderTop: `1px solid ${hex(T.RULE)}`, minWidth: 0 }}>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 36, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.9, width: 56, flexShrink: 0, letterSpacing: '-0.04em' }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: hex(T.INK), lineHeight: 1.2, marginBottom: 4, letterSpacing: '-0.01em' }}>{truncate(p.name, 70)}</div>
                            <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>{truncate(p.description, 200)}</div>
                        </div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 8. STAT ROW (benchmark-reporter) ===
export const StatRowSlide: React.FC<{ title: string; data: StatRowData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const stats = data.stats.slice(0, 4);
    const accents = [T.CHARTREUSE_BRIGHT, T.CYAN, T.RUST, T.TEAL];
    return (
        <div style={{ padding: '28px 38px 16px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
            <div>
                <Tag text="BY THE NUMBERS" brand={brand} />
                <Title text={title} size={22} brand={brand} />
            </div>
            {/* Stat cells — each now carries meaning + matters interpretation */}
            <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flex: data.convergentInsight ? 'none' : 1 }}>
                {stats.map((s, i) => {
                    const size = heroNumberSize(s.value, { max: 50, min: 24, baseChars: 4 });
                    return (
                        <div key={i} style={{ flex: 1, minWidth: 0, padding: '12px 16px 14px', borderLeft: i > 0 ? `1px solid ${hex(T.RULE)}` : 'none', display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: size, color: hex(accents[i % accents.length]), lineHeight: 1.0, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: 10.5, color: hex(T.INK), lineHeight: 1.35, fontWeight: 600 }}>{truncate(s.label, 100)}</div>
                            {/* WHAT IT MEANS */}
                            {s.meaning && (
                                <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300, paddingTop: 3, borderTop: `1px solid ${hex(T.RULE)}` }}>
                                    <span style={{ fontSize: 7, letterSpacing: '1.5px', color: hex(T.SECONDARY), fontWeight: 800, marginRight: 6, textTransform: 'uppercase' as const }}>MEANS</span>
                                    {truncate(s.meaning, 160)}
                                </div>
                            )}
                            {/* WHY IT MATTERS NOW */}
                            {s.matters && (
                                <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>
                                    <span style={{ fontSize: 7, letterSpacing: '1.5px', color: hex(accents[i % accents.length]), fontWeight: 800, marginRight: 6, textTransform: 'uppercase' as const }}>MATTERS</span>
                                    {truncate(s.matters, 160)}
                                </div>
                            )}
                            <div style={{ fontSize: 7.5, color: hex(T.MUTED), marginTop: 'auto', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700, paddingTop: 4 }}>{truncate(s.source, 60)}</div>
                        </div>
                    );
                })}
            </div>
            {/* CONVERGENT INSIGHT row — fills the dead bottom with synthesis across stats */}
            {data.convergentInsight && (
                <div style={{ background: hex(T.PALE), padding: '12px 18px', borderLeft: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: hex(T.CHARTREUSE_BRIGHT) }}>CONVERGENT INSIGHT</div>
                    <div style={{ fontSize: 11, color: hex(T.INK), lineHeight: 1.55, fontWeight: 400 }}>{truncate(data.convergentInsight, 320)}</div>
                    {data.patternSignal && (
                        <div style={{ fontSize: 9.5, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300, marginTop: 2, paddingTop: 6, borderTop: `1px solid ${hex(T.RULE)}` }}>
                            <span style={{ fontSize: 7.5, letterSpacing: '2px', color: hex(T.CYAN), fontWeight: 800, marginRight: 8, textTransform: 'uppercase' as const }}>PATTERN</span>
                            {truncate(data.patternSignal, 240)}
                        </div>
                    )}
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 9. TIMELINE (roadmap-builder) ===
export const TimelineSlide: React.FC<{ title: string; data: TimelineData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const phases = data.phases.slice(0, 5);
    return (
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
            <div>
                <Tag text="ROADMAP" brand={brand} />
                <Title text={title} size={28} brand={brand} />
            </div>
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 2, background: hex(T.RULE) }} />
                <div style={{ position: 'absolute', top: 18, left: 0, width: `${(100 / phases.length) * 0.5}%`, height: 2, background: hex(T.CHARTREUSE_BRIGHT) }} />
                {phases.map((ph, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px', position: 'relative' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? hex(T.CHARTREUSE_BRIGHT) : hex(T.WHITE), border: `2px solid ${hex(i === 0 ? T.CHARTREUSE_BRIGHT : T.RULE)}`, marginLeft: 0, marginTop: 11, zIndex: 1 }} />
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: hex(T.SECONDARY), textTransform: 'uppercase' }}>
                            PHASE {String(i + 1).padStart(2, '0')}{ph.duration ? `  ·  ${ph.duration}` : ''}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: hex(T.INK), lineHeight: 1.2, letterSpacing: '-0.01em' }}>{ph.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                            {ph.items.slice(0, 4).map((item, ii) => (
                                <div key={ii} style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.4, fontWeight: 300, paddingLeft: 8, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 0, color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 700 }}>·</span>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 10. SECTION DIVIDER (deck-narrative-composer) ===
// This template ignores the standard shell — it goes full-bleed dark.
export const SectionDividerFullBleed: React.FC<{ data: SectionDividerData; brand?: Brand }> = ({ data, brand }) => {
    const T = resolveT(brand);
    return (
    <div style={{
        width: T.WEB_W, height: T.WEB_H, background: hex(T.TEAL),
        position: 'relative', overflow: 'hidden',
        fontFamily: `'${T.FONT}', sans-serif`,
        padding: '48px 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
        {/* Top — number. Font shrinks for 3+ digit section numbers (100+). */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: heroNumberSize(data.number, { max: 160, min: 72, baseChars: 2 }), color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.85, letterSpacing: '-0.05em', whiteSpace: 'nowrap' as const }}>
                {data.number}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '4px', color: hex(T.CHARTREUSE_BRIGHT), textTransform: 'uppercase' }}>SECTION</div>
                <div style={{ width: 80, height: 1, background: hex(T.CHARTREUSE_BRIGHT), marginTop: 8 }} />
            </div>
        </div>
        {/* Bottom — title + subtitle; title size scales down for long titles */}
        <div style={{ maxWidth: '92%' }}>
            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 900, fontSize: data.title.length > 40 ? 44 : data.title.length > 28 ? 52 : 56, color: hex(T.WHITE), lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                {data.title}
            </div>
            {data.subtitle && (
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 14, fontWeight: 300, lineHeight: 1.45 }}>
                    {truncate(data.subtitle, 180)}
                </div>
            )}
        </div>
        {/* Brand mark bottom right */}
        <div style={{ position: 'absolute', bottom: 32, right: 64, display: 'grid', gridTemplateColumns: 'repeat(3, 6px)', gap: 4 }}>
            {Array(9).fill(0).map((_, i) => <span key={i} style={{ width: 6, height: 6, background: hex(T.CHARTREUSE_BRIGHT) }} />)}
        </div>
    </div>
    );
};

// === 11. SERVICE BLUEPRINT (service-blueprint-mapper / journey_stage) ===
// CSS Grid layout with explicit row heights so lanes cannot collapse into
// each other. Cap to 4 stages (5 is too cramped on 16:9). Every cell is
// aggressively truncated — we prefer pointed single sentences over overflow.
export const ServiceBlueprintSlide: React.FC<{ title: string; data: ServiceBlueprintData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const stages = data.stages.slice(0, 4);

    const lanes: Array<{ key: string; label: string; accent?: string; highlight?: boolean }> = [
        { key: 'customerAction', label: 'CUSTOMER', accent: T.CHARTREUSE_BRIGHT, highlight: true },
        { key: 'frontstage', label: 'FRONTSTAGE' },
        { key: 'backstage', label: 'BACKSTAGE' },
        { key: 'support', label: 'SUPPORT / DATA' },
    ];
    // Grid template: first column 104px (label), remaining split equally among stages
    const gridCols = `104px repeat(${stages.length}, 1fr)`;
    const emotionIcon = (e?: string) => {
        if (!e) return '';
        const low = e.toLowerCase();
        if (low.includes('frustrat') || low.includes('angry') || low.includes('confus')) return '😟';
        if (low.includes('hope') || low.includes('excited') || low.includes('curious')) return '🙂';
        if (low.includes('disappoint') || low.includes('abandon') || low.includes('lost')) return '☹️';
        if (low.includes('delight') || low.includes('satisf')) return '😀';
        return '•';
    };

    return (
        <div style={{ padding: '26px 32px 14px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
            <div>
                <Tag text="SERVICE BLUEPRINT" brand={brand} />
                <Title text={title} size={22} brand={brand} />
            </div>
            {/* Grid — every row is a clear horizontal lane. minmax prevents collapse. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gridTemplateRows: `30px 22px ${lanes.map(() => 'minmax(42px, 1fr)').join(' ')} minmax(50px, auto)`,
                border: `1px solid ${hex(T.RULE)}`,
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
            }}>
                {/* Phase header row */}
                <div style={{ padding: '6px 10px', fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: hex(T.MUTED), background: hex(T.TEAL_DARK), color2: hex(T.WHITE) as any, textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', background: hex(T.TEAL), color: hex(T.WHITE) }}>PHASE</div>
                {stages.map((st, i) => (
                    <div key={`ph-${i}`} style={{ padding: '6px 10px', fontWeight: 800, fontSize: 11, color: hex(T.WHITE), background: hex(T.TEAL), borderLeft: `1px solid ${hex(T.TEAL_DARK)}`, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center' }}>{truncate(st.phase, 28)}</div>
                ))}

                {/* Duration / emotion strip row */}
                <div style={{ padding: '2px 10px', fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', color: hex(T.MUTED), textTransform: 'uppercase' as const, background: hex(T.PALE), display: 'flex', alignItems: 'center' }}>DURATION · MOOD</div>
                {stages.map((st, i) => (
                    <div key={`meta-${i}`} style={{ padding: '2px 10px', fontSize: 8, color: hex(T.SECONDARY), background: hex(T.PALE), borderLeft: `1px solid ${hex(T.RULE)}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {st.emotion && <span>{emotionIcon(st.emotion)}</span>}
                        <span style={{ fontWeight: 500 }}>{st.duration || ''}{st.duration && st.emotion ? ' · ' : ''}{st.emotion || ''}</span>
                    </div>
                ))}

                {/* Lanes */}
                {lanes.map((lane, li) => ([
                    <div key={`l-label-${li}`} style={{ padding: '6px 10px', background: lane.highlight ? hex(T.PANEL) : hex(T.WHITE), borderTop: `1px solid ${hex(T.RULE)}`, borderLeft: lane.highlight ? `3px solid ${hex(T.CHARTREUSE_BRIGHT)}` : 'none', display: 'flex', alignItems: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: hex(lane.accent || T.SECONDARY), textTransform: 'uppercase' as const, lineHeight: 1.2 }}>{lane.label}</div>
                    </div>,
                    ...stages.map((st, i) => {
                        const txt = (st as any)[lane.key] as string | undefined;
                        return (
                            <div key={`l-${li}-${i}`} style={{
                                padding: '6px 10px',
                                borderTop: `1px solid ${hex(T.RULE)}`,
                                borderLeft: `1px solid ${hex(T.RULE)}`,
                                fontSize: 9,
                                color: hex(T.BODY),
                                lineHeight: 1.4,
                                fontWeight: 300,
                                background: lane.highlight ? hex(T.PALE) : hex(T.WHITE),
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'flex-start',
                            }}>
                                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, textOverflow: 'ellipsis' as const }}>
                                    {truncate(txt, 110) || '—'}
                                </span>
                            </div>
                        );
                    }),
                ])).flat()}

                {/* Fail-points row */}
                <div style={{ padding: '6px 10px', background: '#FBEAEA', borderTop: `2px solid ${hex(T.RED)}`, display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: hex(T.RED), textTransform: 'uppercase' as const, lineHeight: 1.2 }}>FAIL<br />POINTS</div>
                </div>
                {stages.map((st, i) => (
                    <div key={`fp-${i}`} style={{ padding: '6px 10px', borderTop: `2px solid ${hex(T.RED)}`, borderLeft: `1px solid ${hex(T.RULE)}`, fontSize: 9, color: hex(st.failPoint ? T.RED : T.BODY), lineHeight: 1.4, fontWeight: st.failPoint ? 700 : 300, background: st.failPoint ? '#FBEAEA' : hex(T.WHITE), display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, textOverflow: 'ellipsis' as const }}>
                            {st.failPoint ? '⚠  ' : ''}{truncate(st.painPoint, 110) || '—'}
                        </span>
                    </div>
                ))}
            </div>
            {data.keyInsight && (
                <div style={{ fontSize: 10, color: hex(T.INK), background: hex(T.PALE), padding: '8px 12px', borderLeft: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, lineHeight: 1.4 }}>{truncate(data.keyInsight, 260)}</div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 12. GAP MATRIX (gap-analysis-evaluator / gap) ===
export const GapMatrixSlide: React.FC<{ title: string; data: GapMatrixData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const max = data.scaleMax || 5;
    const rows = data.gaps.slice(0, 6);
    const sevColor = (s: string) => s === 'critical' ? T.RED : s === 'high' ? T.RUST : s === 'medium' ? T.CHARTREUSE : T.SECONDARY;
    return (
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <div>
                <Tag text="MATURITY GAP ANALYSIS" brand={brand} />
                <Title text={title} size={26} brand={brand} />
            </div>
            {/* Scale header */}
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '32%' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 700, letterSpacing: '1px', color: hex(T.MUTED) }}>
                    {Array.from({ length: max }).map((_, i) => <span key={i}>L{i + 1}</span>)}
                </div>
                <div style={{ width: 80, fontSize: 8, fontWeight: 700, letterSpacing: '1px', color: hex(T.MUTED), textAlign: 'right' as const }}>SEVERITY</div>
            </div>
            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {rows.map((g, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: `1px solid ${hex(T.RULE)}` }}>
                        <div style={{ width: '30%', fontSize: 11, color: hex(T.INK), fontWeight: 700, letterSpacing: '-0.01em' }}>{g.capability}</div>
                        <div style={{ flex: 1, position: 'relative', height: 18, background: hex(T.PALE) }}>
                            {/* Current bar (chartreuse) */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(g.currentMaturity / max) * 100}%`, background: hex(T.CHARTREUSE_BRIGHT) }} />
                            {/* Target marker (teal triangle) */}
                            <div style={{ position: 'absolute', left: `calc(${(g.targetMaturity / max) * 100}% - 6px)`, top: -4, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${hex(T.TEAL)}` }} />
                            {/* Current value label */}
                            <div style={{ position: 'absolute', left: 6, top: 1, fontSize: 9, fontWeight: 700, color: hex(T.INK), lineHeight: '16px' }}>{g.currentMaturity}</div>
                            {/* Target value label */}
                            <div style={{ position: 'absolute', right: 6, top: 1, fontSize: 9, fontWeight: 700, color: hex(T.TEAL), lineHeight: '16px' }}>→ {g.targetMaturity}</div>
                        </div>
                        <div style={{ width: 80, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', color: hex(sevColor(g.severity)), textAlign: 'right' as const }}>{g.severity}</div>
                    </div>
                ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 24, fontSize: 8, color: hex(T.MUTED), fontWeight: 500 }}>
                <span><span style={{ display: 'inline-block', width: 14, height: 8, background: hex(T.CHARTREUSE_BRIGHT), verticalAlign: 'middle', marginRight: 4 }} />CURRENT</span>
                <span>▲ TARGET</span>
                {data.insight && <span style={{ flex: 1, textAlign: 'right' as const, color: hex(T.INK) }}>{data.insight}</span>}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 13. ARCHITECTURE MAP (tech-arch-generator / tech_node) ===
export const ArchitectureMapSlide: React.FC<{ title: string; data: ArchitectureMapData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const layers = data.layers.slice(0, 5);
    return (
        <div style={{ padding: '36px 40px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <div>
                <Tag text="SYSTEM ARCHITECTURE" brand={brand} />
                <Title text={title} size={26} brand={brand} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {layers.map((layer, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'stretch', minHeight: 0, flex: 1 }}>
                        {/* Layer label */}
                        <div style={{ width: 130, background: i % 2 === 0 ? hex(T.TEAL) : hex(T.PANEL), padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: hex(i % 2 === 0 ? T.CHARTREUSE_BRIGHT : T.SECONDARY), textTransform: 'uppercase' as const }}>LAYER {String(i + 1).padStart(2, '0')}</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: hex(i % 2 === 0 ? T.WHITE : T.INK), marginTop: 3, lineHeight: 1.2 }}>{layer.name}</div>
                        </div>
                        {/* Nodes */}
                        <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignContent: 'flex-start' }}>
                            {layer.nodes.slice(0, 6).map((n, ni) => (
                                <div key={ni} style={{ flex: '1 1 calc(33% - 6px)', minWidth: 0, border: `1px solid ${hex(T.RULE)}`, padding: '6px 10px', background: hex(T.WHITE) }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: hex(T.INK), lineHeight: 1.2, letterSpacing: '-0.01em' }}>{n.name}</div>
                                    {n.type && <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', color: hex(T.CHARTREUSE_BRIGHT), textTransform: 'uppercase' as const, marginTop: 2 }}>{n.type}</div>}
                                    {n.description && <div style={{ fontSize: 8, color: hex(T.BODY), lineHeight: 1.35, marginTop: 3, fontWeight: 300 }}>{n.description}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {data.flowSummary && (
                <div style={{ fontSize: 9, color: hex(T.INK), background: hex(T.PALE), padding: '8px 12px', borderLeft: `3px solid ${hex(T.CHARTREUSE_BRIGHT)}`, lineHeight: 1.4, fontWeight: 400 }}>
                    <span style={{ fontWeight: 700, letterSpacing: '1px', fontSize: 8, color: hex(T.SECONDARY), marginRight: 6 }}>FLOW:</span>{data.flowSummary}
                </div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 14. PRD FEATURE CARD (prd-compiler / prd_feature) ===
export const PrdFeatureSlide: React.FC<{ title: string; data: PrdFeatureData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const allFeatures = Array.isArray(data?.features) ? data.features : [];
    const prioColor = (p: string) => p === 'must' ? T.RED : p === 'should' ? T.CHARTREUSE_BRIGHT : p === 'could' ? T.CYAN : T.MUTED;

    // 2026-05-06 — DEEP-mode detection: when the composer emits a single
    // feature with rich narrative fields (technicalDetails / problemSolved /
    // stakeholders / evidence), switch to a full-slide layout that renders
    // every field. Multi-feature payloads keep the original compact 3-card
    // layout below.
    const single = allFeatures.length === 1 ? allFeatures[0] : null;
    const isDeep = !!(single && (single.technicalDetails || single.problemSolved || single.stakeholders || (Array.isArray(single.evidence) && single.evidence.length > 0)));

    if (isDeep && single) {
        const f = single;
        return (
            <div style={{ padding: '32px 40px 16px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'hidden' }}>
                <div>
                    <Tag text="PRODUCT REQUIREMENTS" brand={brand} />
                    <Title text={title} size={22} brand={brand} />
                </div>
                <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
                    {/* LEFT COLUMN — User story + acceptance criteria */}
                    <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ display: 'inline-block', background: hex(prioColor(f.priority)), color: hex(f.priority === 'should' ? T.INK : T.WHITE), fontSize: 7, fontWeight: 700, letterSpacing: '2px', padding: '3px 8px', textTransform: 'uppercase' as const }}>{f.priority}</span>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 800, fontSize: 13, color: hex(T.INK), letterSpacing: '-0.01em' }}>{f.name}</div>
                        </div>
                        <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontStyle: 'italic' as const, fontWeight: 300, padding: '8px 10px', background: hex(T.PALE), borderLeft: `3px solid ${hex(prioColor(f.priority))}` }}>{f.userStory}</div>
                        <div>
                            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '2px', color: hex(T.SECONDARY), textTransform: 'uppercase' as const, marginBottom: 4 }}>ACCEPTANCE CRITERIA</div>
                            {(Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 6).map((c, ci) => (
                                <div key={ci} style={{ fontSize: 8.5, color: hex(T.BODY), lineHeight: 1.35, fontWeight: 300, paddingLeft: 12, position: 'relative', marginBottom: 3 }}>
                                    <span style={{ position: 'absolute', left: 0, color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 700 }}>✓</span>{c}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* RIGHT COLUMN — Technical details, problem, stakeholders, evidence */}
                    <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                        {f.problemSolved && (
                            <div>
                                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '2px', color: hex(T.RED), textTransform: 'uppercase' as const, marginBottom: 3 }}>PROBLEM SOLVED</div>
                                <div style={{ fontSize: 8.5, color: hex(T.BODY), lineHeight: 1.45, fontWeight: 300 }}>{f.problemSolved}</div>
                            </div>
                        )}
                        {f.technicalDetails && (
                            <div>
                                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '2px', color: hex(T.CYAN), textTransform: 'uppercase' as const, marginBottom: 3 }}>TECHNICAL DETAILS</div>
                                <div style={{ fontSize: 8.5, color: hex(T.BODY), lineHeight: 1.45, fontWeight: 300 }}>{f.technicalDetails}</div>
                            </div>
                        )}
                        {f.stakeholders && (
                            <div>
                                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '2px', color: hex(T.SECONDARY), textTransform: 'uppercase' as const, marginBottom: 3 }}>STAKEHOLDERS</div>
                                <div style={{ fontSize: 8.5, color: hex(T.BODY), lineHeight: 1.45, fontWeight: 300 }}>{f.stakeholders}</div>
                            </div>
                        )}
                        {Array.isArray(f.evidence) && f.evidence.length > 0 && (
                            <div style={{ borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 6 }}>
                                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '2px', color: hex(T.CHARTREUSE_BRIGHT), textTransform: 'uppercase' as const, marginBottom: 4 }}>EVIDENCE</div>
                                {f.evidence.slice(0, 3).map((e, ei) => (
                                    <div key={ei} style={{ marginBottom: 5, paddingLeft: 8, borderLeft: `2px solid ${hex(T.CHARTREUSE_BRIGHT)}` }}>
                                        <div style={{ fontSize: 8, color: hex(T.INK), lineHeight: 1.35, fontStyle: 'italic' as const, fontWeight: 300 }}>"{e.text}"</div>
                                        <div style={{ fontSize: 7, color: hex(T.MUTED), marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
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

    // COMPACT mode (default) — multi-feature, side-by-side cards
    const features = allFeatures.slice(0, 3);
    return (
        <div style={{ padding: '36px 40px 20px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <div>
                <Tag text="PRODUCT REQUIREMENTS" brand={brand} />
                <Title text={title} size={26} brand={brand} />
            </div>
            <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                {features.map((f, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: hex(T.WHITE), border: `1px solid ${hex(T.RULE)}`, borderTop: `4px solid ${hex(prioColor(f.priority))}` }}>
                        {/* Priority badge */}
                        <div style={{ padding: '10px 14px 0' }}>
                            <span style={{ display: 'inline-block', background: hex(prioColor(f.priority)), color: hex(f.priority === 'should' ? T.INK : T.WHITE), fontSize: 7, fontWeight: 700, letterSpacing: '2px', padding: '3px 8px', textTransform: 'uppercase' as const }}>
                                {f.priority}
                            </span>
                        </div>
                        {/* Feature name */}
                        <div style={{ padding: '8px 14px', fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 800, fontSize: 14, color: hex(T.INK), lineHeight: 1.2, letterSpacing: '-0.01em' }}>{f.name}</div>
                        {/* User story */}
                        <div style={{ padding: '0 14px 12px', fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontStyle: 'italic' as const, borderBottom: `1px solid ${hex(T.RULE)}`, fontWeight: 300 }}>{f.userStory}</div>
                        {/* Acceptance criteria */}
                        <div style={{ padding: '10px 14px 12px', flex: 1 }}>
                            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '2px', color: hex(T.SECONDARY), textTransform: 'uppercase' as const, marginBottom: 6 }}>ACCEPTANCE CRITERIA</div>
                            {(Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria : []).slice(0, 5).map((c, ci) => (
                                <div key={ci} style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.4, fontWeight: 300, paddingLeft: 12, position: 'relative', marginBottom: 4 }}>
                                    <span style={{ position: 'absolute', left: 0, color: hex(T.CHARTREUSE_BRIGHT), fontWeight: 700 }}>✓</span>{c}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};

// === 15. SYSTEMS INVENTORY (tech-audit-inspector / tech_audit_system) ===
export const SystemsInventorySlide: React.FC<{ title: string; data: SystemsInventoryData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const rows = data.systems.slice(0, 8);
    const riskColor = (r: string) => r === 'critical' ? T.RED : r === 'high' ? T.RUST : r === 'medium' ? T.CHARTREUSE : T.GREEN;
    const statusColor = (s: string) => s === 'legacy' ? T.RUST : s === 'deprecated' ? T.RED : s === 'planned' ? T.CYAN : T.GREEN;
    return (
        <div style={{ padding: '36px 40px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <div>
                <Tag text="SYSTEMS INVENTORY" brand={brand} />
                <Title text={title} size={26} brand={brand} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 10 }}>
                <thead>
                    <tr style={{ background: hex(T.TEAL), color: hex(T.WHITE) }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left' as const, fontWeight: 700, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase' as const }}>SYSTEM</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left' as const, fontWeight: 700, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase' as const, width: '18%' }}>CATEGORY</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase' as const, width: '14%' }}>STATUS</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase' as const, width: '12%' }}>RISK</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((s, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? hex(T.WHITE) : hex(T.PALE), borderBottom: `1px solid ${hex(T.RULE)}` }}>
                            <td style={{ padding: '8px 12px', color: hex(T.INK), fontWeight: 700 }}>
                                {s.name}
                                {s.description && <div style={{ fontSize: 8, color: hex(T.MUTED), fontWeight: 300, marginTop: 2, lineHeight: 1.3 }}>{s.description}</div>}
                            </td>
                            <td style={{ padding: '8px 12px', color: hex(T.BODY), fontSize: 9 }}>{s.category}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' as const }}>
                                <span style={{ display: 'inline-block', background: hex(statusColor(s.status)), color: hex(T.WHITE), fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', padding: '2px 8px', textTransform: 'uppercase' as const }}>{s.status}</span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' as const }}>
                                <span style={{ display: 'inline-block', background: hex(riskColor(s.risk)), color: hex(s.risk === 'medium' ? T.INK : T.WHITE), fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', padding: '2px 8px', textTransform: 'uppercase' as const }}>{s.risk}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.insight && (
                <div style={{ fontSize: 10, color: hex(T.INK), background: hex(T.PALE), padding: '10px 12px', borderLeft: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, lineHeight: 1.5 }}>{data.insight}</div>
            )}
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};
