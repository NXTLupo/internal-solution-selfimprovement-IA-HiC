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

// Truncate text to a character budget with an ellipsis, preserving word boundaries.
export function truncate(text: string | undefined, max: number): string {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.substring(0, max - 1).replace(/\s+\S*$/, '') + '…';
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
                            <strong style={{ color: hex(T.INK) }}>{pp.label}:</strong> "{pp.quote.length > 140 ? pp.quote.substring(0, 139).replace(/\s+\S*$/, '') + '…' : pp.quote}" <span style={{ fontSize: 8, color: hex(T.MUTED) }}>({pp.source})</span>
                        </div>
                    ))}
                </div>
            )}
            {p.motivations && p.motivations.length > 0 && (
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: hex(T.GREEN), marginBottom: 4 }}>MOTIVATIONS</div>
                    {p.motivations.slice(0, hasImage ? 2 : 3).map((m, i) => (
                        <div key={i} style={{ fontSize: hasImage ? 9 : 10, color: hex(T.BODY), marginBottom: 5, paddingLeft: 10, borderLeft: `2px solid ${hex(T.RULE)}`, lineHeight: 1.4 }}>
                            <strong style={{ color: hex(T.INK) }}>{m.label}:</strong> "{m.quote.length > 140 ? m.quote.substring(0, 139).replace(/\s+\S*$/, '') + '…' : m.quote}" <span style={{ fontSize: 8, color: hex(T.MUTED) }}>({m.source})</span>
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
    return (
    <div style={{ padding: '40px 56px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
        <Tag text="STRATEGIC RECOMMENDATION" brand={brand} />
        <Title text={title} size={32} brand={brand} />
        <div style={{ display: 'flex', gap: 40, flex: 1 }}>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 700, fontSize: 16, color: hex(T.INK), lineHeight: 1.3, borderLeft: `3px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 14 }}>
                    {data.actionTitle}
                </div>
                {data.rationale && (
                    <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.6, fontWeight: 300 }}>{data.rationale}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {data.supportingActions.slice(0, 5).map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 28, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, flexShrink: 0, width: 32 }}>
                                {String(i + 1).padStart(2, '0')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 11, color: hex(T.INK), marginBottom: 2 }}>{a.name}</div>
                                <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.45, fontWeight: 300 }}>{a.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {data.impactMetric && (() => {
                const mSize = heroNumberSize(data.impactMetric.value, { max: 60, min: 30, baseChars: 4 });
                return (
                    <div style={{ flex: 1, minWidth: 0, background: hex(T.PALE), padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, overflow: 'hidden' }}>
                        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: hex(T.SECONDARY), marginBottom: 8 }}>PROJECTED IMPACT</div>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: mSize, color: hex(T.TEAL), lineHeight: 1.0, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{data.impactMetric.value}</div>
                        <div style={{ fontSize: 11, color: hex(T.INK), marginTop: 10, lineHeight: 1.35, fontWeight: 500 }}>{truncate(data.impactMetric.label, 100)}</div>
                    </div>
                );
            })()}
        </div>
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
                        {t.evidence && (
                            <div style={{ fontSize: 9, fontStyle: 'italic', color: hex(T.INK), borderLeft: `2px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 8, lineHeight: 1.4 }}>
                                "{truncate(t.evidence, 140)}"
                            </div>
                        )}
                        <div style={{ fontSize: 8, color: hex(T.MUTED), marginTop: 'auto', paddingTop: 6 }}>{truncate(t.source, 50)}</div>
                    </div>
                ))}
            </div>
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

// === 5. BLOCK QUOTE (evidence-curator) ===
export const BlockQuoteSlide: React.FC<{ data: BlockQuoteData; sources?: string[]; brand?: Brand }> = ({ data, sources = [], brand }) => {
    const T = resolveT(brand);
    return (
    <div style={{ padding: '56px 72px 40px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 24, left: 52, fontFamily: 'Georgia, serif', fontSize: 120, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.7, fontWeight: 700, opacity: 0.85 }}>"</div>
        {data.context && (
            <div style={{ fontSize: 9, color: hex(T.SECONDARY), fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>{truncate(data.context, 80)}</div>
        )}
        {/* Quote size scales with length so a 400-char quote doesn't overflow the canvas */}
        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 300, fontSize: data.text.length > 280 ? 18 : data.text.length > 180 ? 22 : data.text.length > 110 ? 26 : 28, color: hex(T.INK), lineHeight: 1.4, fontStyle: 'italic', letterSpacing: '-0.005em', maxWidth: '92%' }}>
            {truncate(data.text, 420)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ width: 48, height: 1, background: hex(T.CHARTREUSE_BRIGHT) }} />
            <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: hex(T.INK) }}>{data.attribution}</div>
                {data.role && <div style={{ fontSize: 10, color: hex(T.SECONDARY), marginTop: 2 }}>{data.role}</div>}
            </div>
        </div>
        <div style={{ fontSize: 9, color: hex(T.MUTED), marginTop: 'auto', borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 8 }}>
            Source: {data.source}{sources && sources.length > 0 ? `  |  ${sources.join('  |  ')}` : ''}
        </div>
    </div>
    );
};

// === 6. CASE STUDY (case-study-analyst) ===
// Left column (65%): subject meta strip + 3 colored blocks (challenge/approach/outcome)
// Right column (35%): dashboard with hero metric + supporting metrics + optional quote
export const CaseStudySlide: React.FC<{ title: string; data: CaseStudyData; sources?: string[]; brand?: Brand }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand);
    const hasRightPanel = !!(data.keyMetric || data.supportingMetrics?.length || data.pullQuote);
    return (
    <div style={{ padding: '28px 36px 18px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'hidden' }}>
        <div>
            <Tag text={`CASE STUDY  /  ${data.subject.toUpperCase()}`} brand={brand} />
            <Title text={title} size={24} brand={brand} />
        </div>
        {/* Subject meta strip — industry / region / size / timeframe / investment */}
        {(data.subjectMeta || data.timeframe || data.investment) && (
            <div style={{ display: 'flex', gap: 24, fontSize: 9, fontWeight: 500, color: hex(T.SECONDARY), letterSpacing: '0.5px', paddingBottom: 8, borderBottom: `1px solid ${hex(T.RULE)}`, flexWrap: 'wrap' as const }}>
                {data.subjectMeta && <span>{truncate(data.subjectMeta, 80)}</span>}
                {data.timeframe && <span><strong style={{ color: hex(T.INK), letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontSize: 8 }}>TIMEFRAME</strong>  {truncate(data.timeframe, 40)}</span>}
                {data.investment && <span><strong style={{ color: hex(T.INK), letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontSize: 8 }}>INVESTMENT</strong>  {truncate(data.investment, 40)}</span>}
            </div>
        )}
        <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0 }}>
            {/* LEFT — Challenge / Approach / Outcome narrative */}
            <div style={{ flex: hasRightPanel ? 1.9 : 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 0 }}>
                {[
                    { label: 'CHALLENGE', text: data.challenge, color: T.RED, bg: 'FFF5F5' },
                    { label: 'APPROACH', text: data.approach, color: T.CYAN, bg: 'F0FBFC' },
                    { label: 'OUTCOME', text: data.outcome, color: T.GREEN, bg: 'F0FBF5' },
                ].map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, padding: '11px 14px', background: i % 2 === 0 ? hex(T.WHITE) : hex(T.PALE), borderLeft: `3px solid ${hex(b.color)}`, marginBottom: 6, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 84, flexShrink: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: hex(b.color), textTransform: 'uppercase' as const }}>{b.label}</div>
                        </div>
                        <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300, flex: 1, minWidth: 0 }}>{truncate(b.text, 260)}</div>
                    </div>
                ))}
            </div>
            {/* RIGHT — Metrics dashboard + optional pull quote */}
            {hasRightPanel && (
                <div style={{ flex: 1, minWidth: 0, background: hex(T.TEAL), padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
                    {data.keyMetric && (() => {
                        const mSize = heroNumberSize(data.keyMetric.value, { max: 52, min: 26, baseChars: 4 });
                        return (
                            <div>
                                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: hex(T.CHARTREUSE_BRIGHT), marginBottom: 6 }}>KEY OUTCOME</div>
                                <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: mSize, color: hex(T.WHITE), lineHeight: 1.0, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{data.keyMetric.value}</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 1.35, fontWeight: 400 }}>{truncate(data.keyMetric.label, 90)}</div>
                            </div>
                        );
                    })()}
                    {/* Supporting metrics — small grid below hero */}
                    {data.supportingMetrics && data.supportingMetrics.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: data.supportingMetrics.length > 1 ? '1fr 1fr' : '1fr', gap: 10, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12 }}>
                            {data.supportingMetrics.slice(0, 4).map((m, i) => {
                                const sz = heroNumberSize(m.value, { max: 26, min: 16, baseChars: 4 });
                                return (
                                    <div key={i}>
                                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 300, fontSize: sz, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>{m.value}</div>
                                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 3, lineHeight: 1.3, fontWeight: 400 }}>{truncate(m.label, 60)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Pull quote — verbatim testimony pinned to bottom */}
                    {data.pullQuote && (
                        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12 }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic' as const, lineHeight: 1.45, borderLeft: `2px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 10, fontWeight: 300 }}>
                                "{truncate(data.pullQuote.text, 140)}"
                            </div>
                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 6, paddingLeft: 12 }}>— {truncate(data.pullQuote.attribution, 60)}</div>
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
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflow: 'hidden' }}>
            <div>
                <Tag text="BY THE NUMBERS" brand={brand} />
                <Title text={title} size={28} brand={brand} />
            </div>
            <div style={{ display: 'flex', gap: 0, flex: 1, alignItems: 'stretch' }}>
                {stats.map((s, i) => {
                    const size = heroNumberSize(s.value, { max: 60, min: 30, baseChars: 4 });
                    return (
                        <div key={i} style={{ flex: 1, minWidth: 0, padding: '16px 18px', borderLeft: i > 0 ? `1px solid ${hex(T.RULE)}` : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, overflow: 'hidden' }}>
                            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: size, color: hex(accents[i % accents.length]), lineHeight: 1.0, letterSpacing: '-0.035em', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: 11, color: hex(T.INK), lineHeight: 1.35, fontWeight: 500 }}>{truncate(s.label, 90)}</div>
                            <div style={{ fontSize: 8, color: hex(T.MUTED), marginTop: 'auto', letterSpacing: '0.5px' }}>{truncate(s.source, 60)}</div>
                        </div>
                    );
                })}
            </div>
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
    const features = data.features.slice(0, 3);
    const prioColor = (p: string) => p === 'must' ? T.RED : p === 'should' ? T.CHARTREUSE_BRIGHT : p === 'could' ? T.CYAN : T.MUTED;
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
                            {f.acceptanceCriteria.slice(0, 5).map((c, ci) => (
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
