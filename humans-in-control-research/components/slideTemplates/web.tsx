/**
 * SLIDE TEMPLATES — Web (React) renderers for all 10 NXT Humans templates.
 *
 * Each renderer fills the content panel right of the brand sidebar (and,
 * optionally, the image panel). Templates favor restraint: massive negative
 * space, sharp corners, single-accent color, conclusion titles only.
 */

import React from 'react';
import { TOKENS, hex } from './types';
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, CaseStudyData, PrinciplesData, StatRowData, TimelineData, SectionDividerData,
} from './types';

const T = TOKENS;

// === SHARED CHROME ===

interface ShellProps {
    children: React.ReactNode;
    imageUrl?: string;
    imagePanel?: React.ReactNode; // overrides image when provided (for portraits etc.)
}

export const SlideShell: React.FC<ShellProps> = ({ children, imageUrl, imagePanel }) => (
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

// === MICRO-PRIMITIVES ===

const Tag: React.FC<{ text: string; color?: string }> = ({ text, color = T.CHARTREUSE_BRIGHT }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: hex(color) }}>{text}</div>
);

const Title: React.FC<{ text: string; size?: number }> = ({ text, size = 28 }) => (
    <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 900, fontSize: size, color: hex(T.INK), lineHeight: 1.05, letterSpacing: '-0.015em' }}>{text}</div>
);

const SourceFooter: React.FC<{ sources: string[] }> = ({ sources }) =>
    sources && sources.length > 0 ? (
        <div style={{ fontSize: 8, color: hex(T.MUTED), borderTop: `1px solid ${hex(T.RULE)}`, paddingTop: 6, marginTop: 'auto' }}>
            Sources: {sources.join('  |  ')}
        </div>
    ) : null;

// === 1. PERSONA CARD (persona-architect) ===
export const PersonaCardSlide: React.FC<{ data: PersonaCardData; sources?: string[]; hasImage: boolean }> = ({ data, sources = [], hasImage }) => {
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
export const RecommendationSlide: React.FC<{ title: string; data: RecommendationData; sources?: string[] }> = ({ title, data, sources = [] }) => (
    <div style={{ padding: '40px 56px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
        <Tag text="STRATEGIC RECOMMENDATION" />
        <Title text={title} size={32} />
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
            {data.impactMetric && (
                <div style={{ flex: 1, background: hex(T.PALE), padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}` }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: hex(T.SECONDARY), marginBottom: 8 }}>PROJECTED IMPACT</div>
                    <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 64, color: hex(T.TEAL), lineHeight: 1, letterSpacing: '-0.04em' }}>{data.impactMetric.value}</div>
                    <div style={{ fontSize: 11, color: hex(T.INK), marginTop: 8, lineHeight: 1.3, fontWeight: 500 }}>{data.impactMetric.label}</div>
                </div>
            )}
        </div>
        <SourceFooter sources={sources} />
    </div>
);

// === 3. THEME CLUSTER (theme-analyst) ===
export const ThemeClusterSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[] }> = ({ title, data, sources = [] }) => {
    const themes = data.themes.slice(0, 4);
    return (
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
            <div>
                <Tag text="EMERGING THEMES" />
                <Title text={title} size={28} />
            </div>
            <div style={{ display: 'flex', gap: 0, flex: 1, borderTop: `1px solid ${hex(T.RULE)}` }}>
                {themes.map((t, i) => (
                    <div key={i} style={{ flex: 1, padding: '16px 16px 0', borderLeft: i > 0 ? `1px solid ${hex(T.RULE)}` : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 32, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 1 }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: hex(T.INK), lineHeight: 1.2, letterSpacing: '-0.01em' }}>{t.name}</div>
                        <div style={{ fontSize: 9, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>{t.insight}</div>
                        {t.evidence && (
                            <div style={{ fontSize: 9, fontStyle: 'italic', color: hex(T.INK), borderLeft: `2px solid ${hex(T.CHARTREUSE_BRIGHT)}`, paddingLeft: 8, lineHeight: 1.4 }}>
                                "{t.evidence}"
                            </div>
                        )}
                        <div style={{ fontSize: 8, color: hex(T.MUTED), marginTop: 'auto', paddingTop: 8 }}>{t.source}</div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 4. COMPETITIVE MATRIX (competitive-analyst) ===
export const CompetitiveMatrixSlide: React.FC<{ title: string; data: CompetitiveMatrixData; sources?: string[] }> = ({ title, data, sources = [] }) => {
    const max = data.scaleMax || 5;
    const colW = `${(85 / data.columns.length).toFixed(2)}%`;
    return (
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <div>
                <Tag text="COMPETITIVE LANDSCAPE" />
                <Title text={title} size={26} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                    <tr style={{ background: hex(T.TEAL), color: hex(T.WHITE) }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', width: '15%' }}></th>
                        {data.columns.map((c, i) => (
                            <th key={i} style={{ padding: '10px 8px', fontWeight: 700, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', width: colW, textAlign: 'center' }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri % 2 === 0 ? hex(T.WHITE) : hex(T.PALE), borderBottom: `1px solid ${hex(T.RULE)}` }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: hex(T.INK), fontSize: 11 }}>{row.name}</td>
                            {row.scores.map((s, si) => (
                                <td key={si} style={{ padding: '8px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                        {Array.from({ length: max }).map((_, di) => (
                                            <div key={di} style={{ width: 8, height: 8, background: di < s ? hex(T.CHARTREUSE_BRIGHT) : hex(T.RULE) }} />
                                        ))}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.insight && (
                <div style={{ fontSize: 11, color: hex(T.INK), background: hex(T.PALE), padding: '12px 16px', borderLeft: `4px solid ${hex(T.CHARTREUSE_BRIGHT)}`, lineHeight: 1.5, fontWeight: 400 }}>
                    {data.insight}
                </div>
            )}
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 5. BLOCK QUOTE (evidence-curator) ===
export const BlockQuoteSlide: React.FC<{ data: BlockQuoteData; sources?: string[] }> = ({ data, sources = [] }) => (
    <div style={{ padding: '60px 80px', display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 28, left: 56, fontFamily: 'Georgia, serif', fontSize: 120, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.7, fontWeight: 700, opacity: 0.85 }}>"</div>
        {data.context && (
            <div style={{ fontSize: 9, color: hex(T.SECONDARY), fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>{data.context}</div>
        )}
        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 300, fontSize: 28, color: hex(T.INK), lineHeight: 1.35, fontStyle: 'italic', letterSpacing: '-0.01em', maxWidth: '90%' }}>
            {data.text}
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

// === 6. CASE STUDY (case-study-analyst) ===
export const CaseStudySlide: React.FC<{ title: string; data: CaseStudyData; sources?: string[] }> = ({ title, data, sources = [] }) => (
    <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        <div>
            <Tag text={`CASE STUDY  /  ${data.subject.toUpperCase()}`} />
            <Title text={title} size={26} />
        </div>
        <div style={{ display: 'flex', gap: 16, flex: 1 }}>
            <div style={{ flex: 2, display: 'flex', gap: 0, flexDirection: 'column' }}>
                {[
                    { label: 'CHALLENGE', text: data.challenge, color: T.RED },
                    { label: 'APPROACH', text: data.approach, color: T.CYAN },
                    { label: 'OUTCOME', text: data.outcome, color: T.GREEN },
                ].map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: i < 2 ? `1px solid ${hex(T.RULE)}` : 'none' }}>
                        <div style={{ width: 100, flexShrink: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: hex(b.color) }}>{b.label}</div>
                        </div>
                        <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300, flex: 1 }}>{b.text}</div>
                    </div>
                ))}
            </div>
            {data.keyMetric && (
                <div style={{ flex: 1, background: hex(T.TEAL), padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: hex(T.CHARTREUSE_BRIGHT), marginBottom: 8 }}>KEY OUTCOME</div>
                    <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 64, color: hex(T.WHITE), lineHeight: 1, letterSpacing: '-0.04em' }}>{data.keyMetric.value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 1.3, fontWeight: 400 }}>{data.keyMetric.label}</div>
                </div>
            )}
        </div>
        <SourceFooter sources={sources} />
    </div>
);

// === 7. PRINCIPLES (strategy-author) ===
export const PrinciplesSlide: React.FC<{ title: string; data: PrinciplesData; sources?: string[] }> = ({ title, data, sources = [] }) => {
    const items = data.items.slice(0, 5);
    return (
        <div style={{ padding: '40px 56px 24px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
            <div>
                <Tag text="GUIDING PRINCIPLES" />
                <Title text={title} size={28} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                {items.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '14px 0', borderTop: `1px solid ${hex(T.RULE)}` }}>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 36, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.9, width: 56, flexShrink: 0, letterSpacing: '-0.04em' }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: hex(T.INK), lineHeight: 1.2, marginBottom: 4, letterSpacing: '-0.01em' }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: hex(T.BODY), lineHeight: 1.5, fontWeight: 300 }}>{p.description}</div>
                        </div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 8. STAT ROW (benchmark-reporter) ===
export const StatRowSlide: React.FC<{ title: string; data: StatRowData; sources?: string[] }> = ({ title, data, sources = [] }) => {
    const stats = data.stats.slice(0, 4);
    const accents = [T.CHARTREUSE_BRIGHT, T.CYAN, T.RUST, T.TEAL];
    return (
        <div style={{ padding: '40px 56px 24px', display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
            <div>
                <Tag text="BY THE NUMBERS" />
                <Title text={title} size={28} />
            </div>
            <div style={{ display: 'flex', gap: 0, flex: 1, alignItems: 'center' }}>
                {stats.map((s, i) => (
                    <div key={i} style={{ flex: 1, padding: '0 20px', borderLeft: i > 0 ? `1px solid ${hex(T.RULE)}` : 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 64, color: hex(accents[i % accents.length]), lineHeight: 0.95, letterSpacing: '-0.04em' }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: 11, color: hex(T.INK), lineHeight: 1.3, fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontSize: 8, color: hex(T.MUTED), marginTop: 4 }}>{s.source}</div>
                    </div>
                ))}
            </div>
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 9. TIMELINE (roadmap-builder) ===
export const TimelineSlide: React.FC<{ title: string; data: TimelineData; sources?: string[] }> = ({ title, data, sources = [] }) => {
    const phases = data.phases.slice(0, 5);
    return (
        <div style={{ padding: '40px 48px 24px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
            <div>
                <Tag text="ROADMAP" />
                <Title text={title} size={28} />
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
            <SourceFooter sources={sources} />
        </div>
    );
};

// === 10. SECTION DIVIDER (deck-narrative-composer) ===
// This template ignores the standard shell — it goes full-bleed dark.
export const SectionDividerFullBleed: React.FC<{ data: SectionDividerData }> = ({ data }) => (
    <div style={{
        width: T.WEB_W, height: T.WEB_H, background: hex(T.TEAL),
        position: 'relative', overflow: 'hidden',
        fontFamily: `'${T.FONT}', sans-serif`,
        padding: '56px 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
        {/* Top — number */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 200, fontSize: 180, color: hex(T.CHARTREUSE_BRIGHT), lineHeight: 0.8, letterSpacing: '-0.06em' }}>
                {data.number}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '4px', color: hex(T.CHARTREUSE_BRIGHT), textTransform: 'uppercase' }}>SECTION</div>
                <div style={{ width: 80, height: 1, background: hex(T.CHARTREUSE_BRIGHT), marginTop: 8 }} />
            </div>
        </div>
        {/* Bottom — title + subtitle */}
        <div style={{ maxWidth: '85%' }}>
            <div style={{ fontFamily: `'${T.FONT}', sans-serif`, fontWeight: 900, fontSize: 56, color: hex(T.WHITE), lineHeight: 1.0, letterSpacing: '-0.025em' }}>
                {data.title}
            </div>
            {data.subtitle && (
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', marginTop: 16, fontWeight: 300, lineHeight: 1.4 }}>
                    {data.subtitle}
                </div>
            )}
        </div>
        {/* Brand mark bottom right */}
        <div style={{ position: 'absolute', bottom: 32, right: 64, display: 'grid', gridTemplateColumns: 'repeat(3, 6px)', gap: 4 }}>
            {Array(9).fill(0).map((_, i) => <span key={i} style={{ width: 6, height: 6, background: hex(T.CHARTREUSE_BRIGHT) }} />)}
        </div>
    </div>
);
