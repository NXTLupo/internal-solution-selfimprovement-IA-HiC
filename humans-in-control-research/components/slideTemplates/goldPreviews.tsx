/**
 * goldPreviews.tsx - GOLD-frame preview twins (2026-06-11, task #32).
 *
 * Every component here is the 960x540 half-scale twin of its 1920x1080 stage
 * renderer in services/slideToStageHtml.ts, on the GoldFrame chrome from the
 * live Figma design-system files (NXT iSQhAVM7SI4QHAWB7y9C2z / NU
 * z2v9Pvhg23hlljEitPBdAt). Supersedes the legacy nu-artifact-stage /
 * SlideShell renderers in web.tsx for these 15 templates so that
 * preview = Figma = PPTX export, exactly as case-study / service-blueprint /
 * journey-map already are.
 *
 * Conventions: stage px values divide by 2; line clamps protect the 540px
 * canvas; all colors ride brand TOKENS (never literals except shared status
 * colors that match the stage twins); SOLID fills only.
 */
import React from 'react';
import { hex, densityCaps, type SlideDensity } from './types';
import { nxtBrand, type Brand } from './brands';
import { GoldFrame } from './web';
import type {
    PersonaCardData, RecommendationData, ThemeClusterData, CompetitiveMatrixData,
    BlockQuoteData, PrinciplesData, StatRowData, TimelineData,
    GapMatrixData, ArchitectureMapData, PrdFeatureData, SystemsInventoryData,
} from './types';

const resolveT = (b?: Brand): Brand => b || nxtBrand;
const fonts = (T: Brand) => ({
    mono: `'${T.FONT_MONO}', monospace`,
    body: `'${T.FONT_BODY}', sans-serif`,
    display: `'${T.FONT_DISPLAY}', ${T.FONT_TITLE === 'Lora' ? 'serif' : 'sans-serif'}`,
    serifish: T.FONT_TITLE === 'Lora' ? 'serif' : 'sans-serif',
});
const clamp = (lines: number): React.CSSProperties => ({
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical',
});
const srcMeta = (sources?: string[]) =>
    sources && sources.length ? `Sources: ${sources.slice(0, 3).join(' · ')}` : undefined;

const SectLabel: React.FC<{ T: Brand; children: React.ReactNode; color?: string; rule?: boolean }> = ({ T, children, color, rule }) => (
    <div style={{ fontFamily: fonts(T).mono, fontWeight: 600, fontSize: 7, letterSpacing: '1px', color: color || hex(T.GREY), textTransform: 'uppercase', borderBottom: rule ? `1px solid ${hex(T.HAIRLINE)}` : 'none', paddingBottom: rule ? 3 : 0 }}>{children}</div>
);

// === STAT ROW ===============================================================
export const StatRowSlide: React.FC<{ title: string; data: StatRowData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const rawStats = data.stats || [];
    const stats = rawStats.slice(0, densityCaps('stat-row', density).items);
    const n = Math.max(stats.length, 1); const dense = n >= 4;
    // DENSE STRUCTURAL LAYOUT (W2): quadrant grid + dark insight column,
    // twin of slideToStageHtml renderStatRowDense + Figma NU 198:3 / NXT 321:3.
    // Routes from the RAW array so caps can't mask the predicate.
    const denseRoute = rawStats.length >= 4
        || (rawStats.length >= 3 && rawStats.every(s => s.meaning && s.matters) && !!(data.convergentInsight && data.patternSignal));
    if (denseRoute) {
        const four = rawStats.slice(0, 4);
        return (
            <GoldFrame brand={brand} kicker="BY THE NUMBERS" title={title} meta={srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.76fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 13, minHeight: 0 }}>
                        {four.map((s, i) => (
                            <div key={i} style={{ borderTop: `2px solid ${hex(T.CHARTREUSE)}`, padding: '8px 10px 7px 0', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                                <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 31, lineHeight: 1.06, color: hex(T.INK), ...clamp(1) }}>{s.value}</div>
                                <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 12.5, lineHeight: 1.3, color: hex(T.INK), ...clamp(2) }}>{s.label}</div>
                                {s.meaning && <div style={{ fontSize: 11, lineHeight: 1.4, color: hex(T.INK), ...clamp(2) }}>{s.meaning}</div>}
                                <div style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: '0.5px', color: hex(T.ACCENT_COOL), marginTop: 'auto', textTransform: 'uppercase', ...clamp(1) }}>{s.source}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ background: hex(T.INK), color: hex(T.WHITE), padding: '17px 18px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
                        {data.convergentInsight && <>
                            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: hex(T.CHARTREUSE) }}>Convergent insight</div>
                            <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontWeight: Number(T.TITLE_WEIGHT), fontSize: 15.5, lineHeight: 1.42, color: hex(T.WHITE), ...clamp(5) }}>{data.convergentInsight}</div>
                        </>}
                        {data.convergentInsight && data.patternSignal && <div style={{ height: 1, background: hex(T.GREY), width: '100%' }} />}
                        {data.patternSignal && <>
                            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: hex(T.GOLD_ACCENT) }}>Pattern</div>
                            <div style={{ fontSize: 11.5, lineHeight: 1.48, color: hex(T.PANEL), ...clamp(4) }}>{data.patternSignal}</div>
                        </>}
                    </div>
                </div>
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker="BY THE NUMBERS" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n},1fr)`, gap: dense ? 12 : 16, marginBottom: 10, flex: 1, minHeight: 0 }}>
                {stats.map((s, i) => (
                    <div key={i} style={{ borderTop: `2px solid ${hex(T.CHARTREUSE)}`, paddingTop: 7, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: dense ? 30 : 38, lineHeight: 1, color: hex(T.INK) }}>{s.value}</div>
                        <div style={{ fontFamily: F.body, fontSize: dense ? 11 : 13, lineHeight: 1.3, color: hex(T.INK), ...clamp(2) }}>{s.label}</div>
                        {s.meaning && <><SectLabel T={T}>Means</SectLabel><div style={{ fontSize: dense ? 9.5 : 11, lineHeight: 1.4, color: hex(T.INK), ...clamp(2) }}>{s.meaning}</div></>}
                        {s.matters && <><SectLabel T={T}>Matters</SectLabel><div style={{ fontSize: dense ? 9.5 : 11, lineHeight: 1.4, color: hex(T.INK), ...clamp(2) }}>{s.matters}</div></>}
                        <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), marginTop: 'auto', textTransform: 'uppercase', ...clamp(1) }}>{s.source}</div>
                    </div>
                ))}
            </div>
            {data.convergentInsight && (
                <div style={{ background: hex(T.PANEL), padding: '9px 12px', borderLeft: `2px solid ${hex(T.CHARTREUSE)}` }}>
                    <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7, letterSpacing: '1px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase', marginBottom: 3 }}>Convergent insight</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4, color: hex(T.INK), ...clamp(2) }}>{data.convergentInsight}</div>
                    {data.patternSignal && <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.4, color: hex(T.INK), borderTop: `1px solid ${hex(T.HAIRLINE)}`, paddingTop: 4, ...clamp(1) }}><span style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Pattern</span>{data.patternSignal}</div>}
                </div>
            )}
        </GoldFrame>
    );
};

// === THEME SPOTLIGHT (hero + supporting) ====================================
export const ThemeSpotlightSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const themes = (data.themes || []).slice(0, densityCaps('theme-spotlight', density).items);
    if (themes.length === 0) return <GoldFrame brand={brand} kicker="EMERGING THEME · SPOTLIGHT" title={title}><div /></GoldFrame>;
    const primary = themes[0]; const supporting = themes.slice(1);
    const denseSup = themes.length >= 5;
    return (
        <GoldFrame brand={brand} kicker="EMERGING THEME · SPOTLIGHT" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, flex: 1, minHeight: 0, alignItems: 'start' }}>
                <div style={{ borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, paddingLeft: 11, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '1px', color: hex(T.CHARTREUSE), textTransform: 'uppercase' }}>01 · Primary theme</div>
                    <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 19, lineHeight: 1.1, color: hex(T.INK), ...clamp(2) }}>{primary.name}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.35, color: hex(T.INK), ...clamp(3) }}>{primary.insight}</div>
                    {primary.evidence && <div style={{ fontFamily: F.body, fontSize: 12, lineHeight: 1.4, color: hex(T.INK), borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, padding: '4px 7px', background: hex(T.PANEL), fontStyle: 'italic', ...clamp(3) }}>&ldquo;{primary.evidence}&rdquo;</div>}
                    {primary.implication && <div><SectLabel T={T}>Implication</SectLabel><div style={{ fontSize: 11.5, lineHeight: 1.35, color: hex(T.INK), ...clamp(2) }}>{primary.implication}</div></div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                    <SectLabel T={T} rule>Supporting signals</SectLabel>
                    {supporting.map((t, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 6, minWidth: 0 }}>
                            <div style={{ fontFamily: F.display, fontSize: denseSup ? 15 : 19, color: hex(T.CHARTREUSE) }}>{String(i + 2).padStart(2, '0')}</div>
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: denseSup ? 11 : 12.5, color: hex(T.INK), marginBottom: 2, ...clamp(1) }}>{t.name}</div>
                                <div style={{ fontSize: denseSup ? 9.5 : 11, lineHeight: 1.35, color: hex(T.INK), marginBottom: 2, ...clamp(2) }}>{t.insight}</div>
                                {t.evidence && !denseSup && <div style={{ fontSize: 9.5, fontStyle: 'italic', color: hex(T.GREY), lineHeight: 1.35, marginBottom: 2, ...clamp(2) }}>&ldquo;{t.evidence}&rdquo;</div>}
                                <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', ...clamp(1) }}>{t.source}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {data.patternSignal && (
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.35, color: hex(T.INK), background: hex(T.PANEL), padding: '5px 9px', borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, ...clamp(1) }}>
                    <span style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Pattern signal</span>{data.patternSignal}
                </div>
            )}
        </GoldFrame>
    );
};

// === THEME CLUSTER (equal columns) ==========================================
export const ThemeClusterSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const themes = (data.themes || []).slice(0, Math.min(densityCaps('theme-cluster', density).items, 4));
    const n = Math.max(themes.length, 1); const dense = n >= 4;
    return (
        <GoldFrame brand={brand} kicker="EMERGING THEMES" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n},1fr)`, gap: dense ? 10 : 14, flex: 1, minHeight: 0 }}>
                {themes.map((t, i) => (
                    <div key={i} style={{ borderTop: `2px solid ${hex(T.CHARTREUSE)}`, paddingTop: 7, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>{String(i + 1).padStart(2, '0')}</div>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: dense ? 14 : 16, lineHeight: 1.12, color: hex(T.INK), ...clamp(2) }}>{t.name}</div>
                        {/* 2026-06-12 user feedback: body copy raised (+1px at preview
                            scale, +2px on the export stage twin); the source rides
                            INSIDE the evidence block directly under the quote (was
                            marginTop:'auto', floating it to the card bottom). */}
                        <div style={{ fontSize: dense ? 11 : 12.5, lineHeight: 1.4, color: hex(T.INK), ...clamp(3) }}>{t.insight}</div>
                        {t.evidence ? (
                            <div style={{ fontSize: dense ? 10.5 : 11.5, lineHeight: 1.4, fontStyle: 'italic', color: hex(T.INK), borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, background: hex(T.PANEL), padding: '3px 6px' }}>
                                <span style={{ ...clamp(3), display: '-webkit-box' }}>&ldquo;{t.evidence}&rdquo;</span>
                                <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', fontStyle: 'normal', marginTop: 3, ...clamp(1) }}>{t.source}</div>
                            </div>
                        ) : (
                            <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', ...clamp(1) }}>{t.source}</div>
                        )}
                    </div>
                ))}
            </div>
            {data.patternSignal && (
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.35, color: hex(T.INK), background: hex(T.PANEL), padding: '5px 9px', borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, ...clamp(1) }}>
                    <span style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Pattern signal</span>{data.patternSignal}
                </div>
            )}
        </GoldFrame>
    );
};

// === THEME ARC (progression chain) ==========================================
export const ThemeArcSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const themes = (data.themes || []).slice(0, Math.min(densityCaps('theme-arc', density).items, 5));
    const n = Math.max(themes.length, 1);
    return (
        <GoldFrame brand={brand} kicker="THEMATIC ARC" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n},1fr)`, gap: 10, flex: 1, minHeight: 0 }}>
                {themes.map((t, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, overflow: 'hidden', borderTop: `2px solid ${i === n - 1 ? hex(T.ACCENT_WARN) : hex(T.CHARTREUSE)}`, paddingTop: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontFamily: F.display, fontSize: 18, color: i === n - 1 ? hex(T.ACCENT_WARN) : hex(T.CHARTREUSE), lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
                            {i < n - 1 && <span style={{ fontFamily: F.mono, fontSize: 10, color: hex(T.GREY) }}>&rarr;</span>}
                        </div>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, lineHeight: 1.12, color: hex(T.INK), ...clamp(2) }}>{t.name}</div>
                        <div style={{ fontSize: 10.5, lineHeight: 1.4, color: hex(T.INK), ...clamp(4) }}>{t.insight}</div>
                        {t.evidence && <div style={{ fontSize: 9.5, lineHeight: 1.35, fontStyle: 'italic', color: hex(T.GREY), ...clamp(3) }}>&ldquo;{t.evidence}&rdquo;</div>}
                        <div style={{ marginTop: 'auto', borderTop: `1px solid ${hex(T.HAIRLINE)}`, paddingTop: 4 }}>
                            {t.signal && <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase', ...clamp(2) }}>Signal · {t.signal}</div>}
                            <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', ...clamp(1) }}>{t.source}</div>
                        </div>
                    </div>
                ))}
            </div>
            {data.patternSignal && (
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.35, color: hex(T.INK), background: hex(T.PANEL), padding: '5px 9px', borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, ...clamp(1) }}>
                    <span style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Pattern signal</span>{data.patternSignal}
                </div>
            )}
        </GoldFrame>
    );
};

// === THEME MOSAIC (2x2 inverse checkerboard) ================================
export const ThemeMosaicSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand }) => {
    const T = resolveT(brand); const F = fonts(T);
    const themes = (data.themes || []).slice(0, 4);
    return (
        <GoldFrame brand={brand} kicker="THEME MOSAIC" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
                {themes.map((t, i) => {
                    const inverse = i === 0 || i === 3;
                    return (
                        <div key={i} style={{ background: inverse ? hex(T.BAND) : hex(T.PANEL), padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '1px', color: inverse ? hex(T.CHARTREUSE) : hex(T.GREY), textTransform: 'uppercase' }}>{String(i + 1).padStart(2, '0')}</div>
                            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, lineHeight: 1.12, color: inverse ? hex(T.BAND_TEXT) : hex(T.INK), ...clamp(2) }}>{t.name}</div>
                            <div style={{ fontSize: 10.5, lineHeight: 1.38, color: inverse ? hex(T.BAND_TEXT) : hex(T.INK), opacity: inverse ? 0.92 : 1, ...clamp(3) }}>{t.insight}</div>
                            {t.evidence && <div style={{ fontSize: 9.5, lineHeight: 1.35, fontStyle: 'italic', color: inverse ? hex(T.BAND_TEXT) : hex(T.GREY), opacity: inverse ? 0.8 : 1, ...clamp(2) }}>&ldquo;{t.evidence}&rdquo;</div>}
                            <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: inverse ? hex(T.CHARTREUSE) : hex(T.GREY), textTransform: 'uppercase', marginTop: 'auto', ...clamp(1) }}>{t.source}</div>
                        </div>
                    );
                })}
            </div>
        </GoldFrame>
    );
};

// === THEME OVERVIEW (Figma GOLD themes overview 590:9 / NU 625:385) =========
// 4-column theme grid: numeral, name, [dominance pill + mood], insight, quote,
// cyan SOURCE, sub-theme chips, rust tension; accent takeaway band (GoldFrame).
// theme-cluster ALIASES here. Enrichment fields degrade gracefully when absent.
export const ThemeOverviewSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const caps = densityCaps('theme-overview', density);
    const themes = (data.themes || []).slice(0, Math.min(caps.items, 4));
    const n = Math.max(themes.length, 1); const dense = n >= 4;
    return (
        <GoldFrame brand={brand} kicker="EMERGING THEMES" title={title} meta={srcMeta(sources)} takeaway={data.takeaway || data.patternSignal}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n},1fr)`, gap: dense ? 12 : 16, flex: 1, minHeight: 0 }}>
                {themes.map((t, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 24, lineHeight: 1, color: hex(T.INK) }}>{String(i + 1).padStart(2, '0')}</div>
                        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: dense ? 13 : 14, lineHeight: 1.1, letterSpacing: '-0.2px', color: hex(T.INK), ...clamp(2) }}>{t.name}</div>
                        {(t.dominance || t.mood) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                                {t.dominance && <span style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '2px 5px', borderRadius: 2, background: t.dominance === 'RECURRING' ? hex(T.HAIRLINE) : hex(T.CHARTREUSE), color: t.dominance === 'RECURRING' ? hex(T.INK) : hex(T.BAND_TEXT) }}>{t.dominance}</span>}
                                {t.mood && <span style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.3px', color: hex(T.GREY) }}>{t.mood}</span>}
                            </div>
                        )}
                        <div style={{ fontSize: dense ? 10.5 : 11.5, lineHeight: 1.5, color: hex(T.INK), ...clamp(3) }}>{t.insight}</div>
                        {t.evidence && <div style={{ fontSize: dense ? 10 : 11, lineHeight: 1.48, fontStyle: 'italic', color: hex(T.INK), ...clamp(2) }}>&ldquo;{t.evidence}&rdquo;</div>}
                        {t.source && <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', textTransform: 'uppercase', color: hex(T.ACCENT_COOL), ...clamp(1) }}>Source: {t.source}</div>}
                        {Array.isArray(t.subthemes) && t.subthemes.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {t.subthemes.slice(0, caps.sub).map((s, j) => (
                                    <span key={j} style={{ fontFamily: F.mono, fontSize: 7, color: hex(T.INK), border: `1px solid ${hex(T.HAIRLINE)}`, borderRadius: 2, padding: '2px 5px' }}>{s}</span>
                                ))}
                            </div>
                        )}
                        {t.tension && <div style={{ fontSize: 8.5, lineHeight: 1.4, color: hex(T.INK), borderLeft: `2px solid ${hex(T.ACCENT_WARN)}`, paddingLeft: 6, ...clamp(2) }}>{t.tension}</div>}
                    </div>
                ))}
            </div>
        </GoldFrame>
    );
};

// === THEME DETAIL (Figma GOLD theme detail 590:11 / NU 625:581) =============
// One theme deep-dive: insight lede, [dominance pill + mood + convergence pill],
// two-column body (CONVERGENT EVIDENCE quote stack | WHAT IT MEANS / SUB-THEMES /
// THE TENSION), accent takeaway band. theme-spotlight ALIASES here.
export const ThemeDetailSlide: React.FC<{ title: string; data: ThemeClusterData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const caps = densityCaps('theme-detail', density);
    const t: any = (data.themes || [])[0] || {};
    const quotes: any[] = Array.isArray(t.quotes) && t.quotes.length
        ? t.quotes.slice(0, caps.sub)
        : (t.evidence ? [{ text: t.evidence, source: t.source }] : []);
    return (
        <GoldFrame brand={brand} kicker={`THEME DETAIL${t.name ? ` · ${String(t.name).toUpperCase()}` : ''}`} title={title} meta={srcMeta(sources)} takeaway={data.takeaway || data.patternSignal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minHeight: 0 }}>
                {t.insight && <div style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.42, color: hex(T.INK), ...clamp(2) }}>{t.insight}</div>}
                {(t.dominance || t.mood || t.convergenceLabel) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                        {t.dominance && <span style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '3px 6px', borderRadius: 2, background: hex(T.CHARTREUSE), color: hex(T.BAND_TEXT) }}>{t.dominance}</span>}
                        {t.mood && <span style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.3px', color: hex(T.GREY) }}>{t.mood}</span>}
                        {t.convergenceLabel && <span style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '3px 6px', borderRadius: 2, border: `1px solid ${hex(T.HAIRLINE)}`, color: hex(T.GREY) }}>{t.convergenceLabel}</span>}
                    </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24, flex: 1, minHeight: 0, alignItems: 'start' }}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <SectLabel T={T}>Convergent evidence</SectLabel>
                        {quotes.map((q, i) => (
                            <div key={i} style={{ borderLeft: `2px solid ${i % 2 === 1 ? hex(T.ACCENT_COOL) : hex(T.ACCENT_WARN)}`, paddingLeft: 9, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ fontFamily: F.body, fontSize: 12, lineHeight: 1.4, color: hex(T.INK), ...clamp(3) }}>&ldquo;{q.text || q.quote || ''}&rdquo;</div>
                                {q.source && <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', textTransform: 'uppercase', color: hex(T.GREY), ...clamp(1) }}>Source: {q.source}</div>}
                            </div>
                        ))}
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(t.whatItMeans || t.implication) && (
                            <div><SectLabel T={T}>What it means</SectLabel><div style={{ fontSize: 11, lineHeight: 1.5, color: hex(T.INK), marginTop: 3, ...clamp(5) }}>{t.whatItMeans || t.implication}</div></div>
                        )}
                        {Array.isArray(t.subthemes) && t.subthemes.length > 0 && (
                            <div><SectLabel T={T}>Sub-themes</SectLabel>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                                    {t.subthemes.map((s: string, j: number) => <span key={j} style={{ fontFamily: F.mono, fontSize: 7.5, color: hex(T.INK), border: `1px solid ${hex(T.HAIRLINE)}`, borderRadius: 2, padding: '3px 6px' }}>{s}</span>)}
                                </div>
                            </div>
                        )}
                        {t.tension && (
                            <div style={{ borderLeft: `3px solid ${hex(T.ACCENT_WARN)}`, paddingLeft: 9, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: hex(T.ACCENT_WARN) }}>The tension</div>
                                <div style={{ fontSize: 11, lineHeight: 1.4, fontWeight: 500, color: hex(T.INK), ...clamp(3) }}>{t.tension}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GoldFrame>
    );
};

// === BLOCK QUOTE ============================================================
export const BlockQuoteSlide: React.FC<{ data: BlockQuoteData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ data: q, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const corr = (q.corroboratingData || []).slice(0, densityCaps('block-quote', density).sub);
    // DENSE STRUCTURAL LAYOUT (W2): three voice cards + WHERE THEY CONVERGE
    // band, twin of renderBlockQuoteDense + Figma NU 199:3 / NXT 322:3.
    const extra = (q.additionalQuotes || []);
    if (q.text && extra.length >= 2) {
        const voices = [{ text: q.text, attribution: q.attribution, role: q.role, source: q.source }, ...extra.slice(0, 2)];
        const syn = q.synthesis || q.implication;
        return (
            <GoldFrame brand={brand} kicker={q.context ? q.context.toUpperCase() : 'IN THEIR WORDS'} meta={srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13, flex: 1, minHeight: 0, marginBottom: 10 }}>
                    {voices.map((v, i) => (
                        <div key={i} style={{ borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, padding: '11px 13px 10px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                            <div style={{ fontFamily: F.display, fontSize: 27, lineHeight: 0.8, color: hex(T.CHARTREUSE) }}>&ldquo;</div>
                            <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontSize: 12.5, lineHeight: 1.48, color: hex(T.INK), ...clamp(7) }}>{v.text}</div>
                            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8.5, letterSpacing: '1px', color: hex(T.INK), textTransform: 'uppercase', marginTop: 'auto', ...clamp(1) }}>{v.attribution}</div>
                            {v.source && <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase', ...clamp(1) }}>{v.source}</div>}
                            {v.role && <div style={{ fontSize: 8.5, lineHeight: 1.35, color: hex(T.GREY), ...clamp(1) }}>{v.role}</div>}
                        </div>
                    ))}
                </div>
                {syn && (
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14, alignItems: 'center', background: hex(T.PANEL), padding: '11px 16px', flexShrink: 0 }}>
                        <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8.5, letterSpacing: '1.5px', color: hex(T.ACCENT_WARN), textTransform: 'uppercase' }}>Where they converge</div>
                        <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontWeight: Number(T.TITLE_WEIGHT), fontSize: 13, lineHeight: 1.46, color: hex(T.INK), ...clamp(3) }}>{syn}</div>
                    </div>
                )}
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker={q.context ? q.context.toUpperCase() : 'VOICE OF THE FIELD'} meta={srcMeta(sources)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minHeight: 0 }}>
                <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 24, lineHeight: 1.18, color: hex(T.INK), ...clamp(5) }}>&ldquo;{q.text}&rdquo;</div>
                {q.contextParagraph && <div style={{ fontSize: 12.5, lineHeight: 1.45, color: hex(T.INK), ...clamp(3) }}>{q.contextParagraph}</div>}
                <div style={{ fontFamily: F.body, fontSize: 12, color: hex(T.GREY) }}>
                    <b style={{ fontWeight: 600, color: hex(T.INK) }}>{q.attribution}</b>
                    {q.role ? ` · ${q.role}` : ''}{q.source ? ` · ${q.source}` : ''}
                </div>
                {corr.length > 0 && (
                    <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: `repeat(${corr.length},1fr)`, gap: 10, padding: '8px 10px', background: hex(T.PANEL), borderLeft: `2px solid ${hex(T.CHARTREUSE)}` }}>
                        <div style={{ gridColumn: '1 / -1', fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>Corroborating data</div>
                        {corr.map((c, i) => (
                            <div key={i} style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: F.display, fontSize: 18, lineHeight: 1, color: hex(T.INK) }}>{c.value}</div>
                                <div style={{ fontSize: 10, lineHeight: 1.3, color: hex(T.INK), margin: '2px 0', ...clamp(2) }}>{c.label}</div>
                                {c.source && <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', ...clamp(1) }}>{c.source}</div>}
                            </div>
                        ))}
                    </div>
                )}
                {q.implication && (
                    <div style={{ fontSize: 11.5, lineHeight: 1.4, color: hex(T.INK), borderTop: `1px solid ${hex(T.HAIRLINE)}`, paddingTop: 6, ...clamp(2) }}>
                        <span style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Implication</span>{q.implication}
                    </div>
                )}
            </div>
        </GoldFrame>
    );
};

// === RECOMMENDATION =========================================================
export const RecommendationSlide: React.FC<{ title: string; data: RecommendationData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data: r, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const caps = densityCaps('recommendation', density);
    const rawSupporting = r.supportingActions || [];
    const rawEvidence = r.evidence || [];
    const supporting = rawSupporting.slice(0, caps.items);
    const evidence = rawEvidence.slice(0, caps.sub);
    const grid = r.impactGrid || {};
    const hasGrid = !!(grid.baseline || grid.target || grid.timeframe || grid.owner);
    const dense = supporting.length >= 4 || evidence.length >= 3;
    // SLIDE-SYSTEM VARIANT (NU_Giving role-block G2): numbered action rows +
    // right impact-card stack.
    const impactCards = (r.impactCards || []);
    if (impactCards.length >= 2) {
        const acts = rawSupporting.slice(0, 4);
        return (
            <GoldFrame brand={brand} kicker={(r.framingTag || 'STRATEGIC RECOMMENDATION').toUpperCase()} title={title} meta={r.personaContext || srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.62fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        {r.rationale && <div style={{ fontSize: 11, lineHeight: 1.4, color: hex(T.INK), marginBottom: 8, ...clamp(3) }}>{r.rationale}</div>}
                        <SectLabel T={T} rule>{r.actionsLabel || 'Supporting actions'}</SectLabel>
                        {acts.map((a, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 9, alignItems: 'start', padding: '8px 0', borderBottom: `1px solid ${hex(T.HAIRLINE)}` }}>
                                <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 22, lineHeight: 1, color: hex(T.CHARTREUSE) }}>{String(i + 1).padStart(2, '0')}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 12, color: hex(T.INK), marginBottom: 2, ...clamp(1) }}>{a.name}</div>
                                    <div style={{ fontSize: 10, lineHeight: 1.36, color: hex(T.INK), ...clamp(3) }}>{a.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
                        <SectLabel T={T} rule>Projected impact</SectLabel>
                        {impactCards.slice(0, 3).map((c, i) => (
                            <div key={i} style={{ position: 'relative', background: hex(T.PANEL), padding: '11px 13px', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, width: 2, height: '100%', background: hex(T.CHARTREUSE) }} />
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '1.2px', color: hex(T.ACCENT_WARN), textTransform: 'uppercase' }}>{c.label}</div>
                                <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontWeight: Number(T.TITLE_WEIGHT), fontSize: 13, lineHeight: 1.18, color: hex(T.INK), marginTop: 4, ...clamp(2) }}>{c.headline}</div>
                                <div style={{ fontSize: 9.5, lineHeight: 1.34, color: hex(T.INK), marginTop: 4, ...clamp(4) }}>{c.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </GoldFrame>
        );
    }
    // DENSE STRUCTURAL LAYOUT (W2): full-width action rows + impact band +
    // evidence cards, twin of renderRecommendationDense + Figma NU 194:3 /
    // NXT 319:3. The payload class that broke the 2026-06-11 fintech decks.
    // Routes from the RAW arrays so caps can't mask the predicate.
    if (rawSupporting.length >= 4 || (rawSupporting.length >= 3 && rawEvidence.length >= 2 && hasGrid)) {
        const acts = rawSupporting.slice(0, 6);
        const evi = rawEvidence.slice(0, 2);
        return (
            <GoldFrame brand={brand} kicker={(r.framingTag || 'STRATEGIC RECOMMENDATION').toUpperCase()} title={title} meta={r.personaContext || srcMeta(sources)}>
                {r.actionTitle && <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 15, lineHeight: 1.12, color: hex(T.INK), borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, paddingLeft: 8, marginBottom: 4, ...clamp(2) }}>{r.actionTitle}</div>}
                {r.rationale && <div style={{ fontSize: 10.5, lineHeight: 1.4, color: hex(T.INK), marginBottom: 6, ...clamp(2) }}>{r.rationale}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {acts.map((a, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 200px 1fr', gap: 11, alignItems: 'start', padding: '6px 0', borderBottom: `1px solid ${hex(T.HAIRLINE)}`, borderTop: i === 0 ? `1.5px solid ${hex(T.INK)}` : undefined }}>
                            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 21, lineHeight: 1, color: hex(T.CHARTREUSE) }}>{String(i + 1).padStart(2, '0')}</div>
                            <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 12.5, lineHeight: 1.25, color: hex(T.INK), ...clamp(2) }}>{a.name}</div>
                            <div style={{ fontSize: 10.5, lineHeight: 1.4, color: hex(T.INK), ...clamp(2) }}>{a.description}</div>
                        </div>
                    ))}
                </div>
                {hasGrid && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, background: hex(T.PANEL), padding: '8px 12px', marginTop: 7, flexShrink: 0 }}>
                        {([['Baseline', grid.baseline], ['Target', grid.target], ['Timeframe', grid.timeframe], ['Owner', grid.owner]] as const).filter(([, v]) => v).map(([h, v]) => (
                            <div key={h} style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>{h}</div>
                                <div style={{ fontSize: 10.5, lineHeight: 1.34, color: hex(T.INK), marginTop: 2, ...clamp(2) }}>{v}</div>
                            </div>
                        ))}
                    </div>
                )}
                {evi.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 7, flexShrink: 0 }}>
                        {evi.map((e, i) => (
                            <div key={i} style={{ borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, padding: '5px 9px', minWidth: 0 }}>
                                <div style={{ fontSize: 10, lineHeight: 1.4, color: hex(T.INK), fontStyle: 'italic', ...clamp(2) }}>&ldquo;{e.text}&rdquo;</div>
                                <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.ACCENT_COOL), textTransform: 'uppercase', marginTop: 3, ...clamp(1) }}>{e.attribution}{e.source ? ` · ${e.source}` : ''}</div>
                            </div>
                        ))}
                    </div>
                )}
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker={(r.framingTag || 'STRATEGIC RECOMMENDATION').toUpperCase()} title={title} meta={r.personaContext || srcMeta(sources)}>
            {r.actionTitle && <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 16, lineHeight: 1.15, color: hex(T.INK), borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, paddingLeft: 8, marginBottom: 5, ...clamp(2) }}>{r.actionTitle}</div>}
            {r.rationale && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: hex(T.INK), marginBottom: 7, ...clamp(2) }}>{r.rationale}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
                {supporting.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                        <SectLabel T={T} rule>{r.actionsLabel || 'Supporting actions'}</SectLabel>
                        {supporting.map((a, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 6, marginTop: dense ? 2 : 4 }}>
                                <div style={{ fontFamily: F.display, fontSize: dense ? 14 : 18, color: hex(T.CHARTREUSE) }}>{String(i + 1).padStart(2, '0')}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: dense ? 11 : 13, color: hex(T.INK), marginBottom: 1, ...clamp(1) }}>{a.name}</div>
                                    <div style={{ fontSize: dense ? 9.5 : 11, lineHeight: 1.4, color: hex(T.INK), ...clamp(3) }}>{a.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0, overflow: 'hidden' }}>
                    {evidence.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <SectLabel T={T} rule>Evidence</SectLabel>
                            {evidence.map((e, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: dense ? 9.5 : 11, lineHeight: 1.45, color: hex(T.INK), fontStyle: 'italic', ...clamp(3) }}>&ldquo;{e.text}&rdquo;</div>
                                    <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', marginTop: 2, ...clamp(1) }}>{e.attribution}{e.source ? ` · ${e.source}` : ''}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {hasGrid && (
                        <div style={{ background: hex(T.PANEL), padding: '8px 10px', borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, marginTop: evidence.length ? 0 : 'auto' }}>
                            <SectLabel T={T}>Projected impact</SectLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 5 }}>
                                {([['Baseline', grid.baseline], ['Target', grid.target], ['Timeframe', grid.timeframe], ['Owner', grid.owner]] as const).filter(([, v]) => v).map(([h, v]) => (
                                    <div key={h} style={{ minWidth: 0 }}>
                                        <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase' }}>{h}</div>
                                        <div style={{ fontSize: 10.5, lineHeight: 1.35, color: hex(T.INK), marginTop: 1, ...clamp(2) }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            {r.impactMetric && (
                                <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6, borderTop: `1px solid ${hex(T.HAIRLINE)}`, paddingTop: 5 }}>
                                    <div style={{ fontFamily: F.display, fontSize: 19, color: hex(T.CHARTREUSE) }}>{r.impactMetric.value}</div>
                                    <div style={{ fontSize: 10.5, color: hex(T.INK), ...clamp(2) }}>{r.impactMetric.label}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {r.implication && (
                <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.4, color: hex(T.INK), ...clamp(2) }}>
                    <span style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Implication</span>{r.implication}
                </div>
            )}
        </GoldFrame>
    );
};

// === PERSONA CARD ===========================================================
export const PersonaCardSlide: React.FC<{ data: PersonaCardData; sources?: string[]; hasImage?: boolean; imageUrl?: string; brand?: Brand; density?: SlideDensity }> = ({ data: p, sources = [], imageUrl, brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const pains = (p.painPoints || []).slice(0, densityCaps('persona-card', density).items);
    const goals = p.goals || {};
    const densePp = pains.length >= 4;
    // DENSE STRUCTURAL LAYOUT (W2): dark identity column + 2x2 evidence
    // quadrants, twin of renderPersonaCardDense + Figma NU 199:124 / NXT 322:124.
    const quadCount = [
        (goals.lifeGoal || goals.experienceGoal || goals.functionalGoal) ? 1 : 0,
        pains.length >= 2 ? 1 : 0,
        ((p.behaviors || []).length >= 2) ? 1 : 0,
        ((p.winConditions || []).length >= 2) ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    if (quadCount >= 3 && p.quote) {
        const quads: Array<{ label: string; color: string; items: string[] }> = [];
        const goalItems = [goals.functionalGoal, goals.experienceGoal, goals.lifeGoal].filter(Boolean) as string[];
        if (goalItems.length) quads.push({ label: 'Goals', color: hex(T.ACCENT_COOL), items: goalItems });
        if (pains.length) quads.push({ label: 'Pain points', color: hex(T.ACCENT_WARN), items: pains.slice(0, 3).map(pp => pp.label || pp.quote || '') });
        if ((p.behaviors || []).length) quads.push({ label: 'Behaviors', color: hex(T.ACCENT_COOL), items: (p.behaviors || []).slice(0, 3) });
        if ((p.winConditions || []).length) quads.push({ label: 'What wins them', color: hex(T.CHARTREUSE), items: (p.winConditions || []).slice(0, 3) });
        return (
            <GoldFrame brand={brand} kicker="PERSONA" title={`${p.name}`} meta={srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
                    <div style={{ background: hex(T.INK), color: hex(T.WHITE), padding: 17, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 24, lineHeight: 1.06, color: hex(T.WHITE), textTransform: 'uppercase', ...clamp(2) }}>{p.name}</div>
                        {p.role && <div style={{ fontSize: 11, lineHeight: 1.35, color: hex(T.PANEL), ...clamp(2) }}>{p.role}</div>}
                        {(p.descriptors || p.demographics) && <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '0.5px', lineHeight: 1.6, color: hex(T.GOLD_ACCENT), textTransform: 'uppercase', ...clamp(2) }}>{p.descriptors || p.demographics}</div>}
                        <div style={{ height: 1, background: hex(T.GREY), width: '100%' }} />
                        <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '1.5px', color: hex(T.CHARTREUSE), textTransform: 'uppercase' }}>Defining quote</div>
                        <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontSize: 12.5, lineHeight: 1.5, color: hex(T.WHITE), ...clamp(5) }}>&ldquo;{p.quote}&rdquo;</div>
                        {p.stakes && <div style={{ marginTop: 'auto', fontSize: 9.5, lineHeight: 1.45, color: hex(T.PANEL), ...clamp(3) }}>{p.stakes}</div>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, minHeight: 0 }}>
                        {quads.slice(0, 4).map((qd, i) => (
                            <div key={i} style={{ borderTop: `2px solid ${qd.color}`, padding: '9px 11px 7px 0', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8.5, letterSpacing: '1.5px', color: hex(T.INK), textTransform: 'uppercase' }}>{qd.label}</div>
                                {qd.items.map((it, j) => (
                                    <div key={j} style={{ display: 'grid', gridTemplateColumns: '6px 1fr', gap: 6, alignItems: 'start' }}>
                                        <span style={{ width: 4, height: 4, marginTop: 4, background: qd.color, display: 'block' }} />
                                        <p style={{ fontSize: 9.5, lineHeight: 1.4, color: hex(T.INK), margin: 0, ...clamp(2) }}>{it}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker="PERSONA" title={`${p.name}`} meta={p.demographics || srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18, flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                    {imageUrl && <img src={imageUrl} alt={p.name} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 2 }} />}
                    <div style={{ fontFamily: F.body, fontSize: 14, color: hex(T.GREY), ...clamp(2) }}>{p.role}</div>
                    {p.quote && <div style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1.45, color: hex(T.INK), fontStyle: 'italic', borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, padding: '5px 9px', background: hex(T.PANEL), ...clamp(4) }}>&ldquo;{p.quote}&rdquo;</div>}
                    {p.bio && <div style={{ fontSize: 11.5, lineHeight: 1.45, color: hex(T.INK), ...clamp(4) }}>{p.bio}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                    {p.jtbd && <div><SectLabel T={T} rule>Jobs to be done</SectLabel><div style={{ fontSize: 11.5, lineHeight: 1.45, color: hex(T.INK), marginTop: 3, ...clamp(2) }}>{p.jtbd}</div></div>}
                    {(goals.lifeGoal || goals.experienceGoal || goals.functionalGoal) && (
                        <div>
                            <SectLabel T={T} rule>Goals (Cooper hierarchy)</SectLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginTop: 4 }}>
                                {([['Life', goals.lifeGoal], ['Experience', goals.experienceGoal], ['Functional', goals.functionalGoal]] as const).filter(([, v]) => v).map(([g, v]) => (
                                    <div key={g} style={{ borderTop: `1px solid ${hex(T.CHARTREUSE)}`, paddingTop: 3, minWidth: 0 }}>
                                        <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', marginBottom: 2 }}>{g}</div>
                                        <div style={{ fontSize: 10.5, lineHeight: 1.35, ...clamp(3) }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {pains.length > 0 && (
                        <div>
                            <SectLabel T={T} rule>Pain points</SectLabel>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: densePp ? 3 : 5, marginTop: 4 }}>
                                {pains.map((pp, i) => (
                                    <div key={i} style={{ borderLeft: `2px solid ${hex(T.ACCENT_WARN)}`, padding: '2px 7px', minWidth: 0 }}>
                                        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: densePp ? 10 : 12, color: hex(T.INK), ...clamp(1) }}>{pp.label}</div>
                                        {pp.quote && <div style={{ fontSize: densePp ? 9 : 10.5, lineHeight: 1.4, color: hex(T.INK), fontStyle: 'italic', marginTop: 1, ...clamp(2) }}>&ldquo;{pp.quote}&rdquo;</div>}
                                        {pp.source && <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', marginTop: 1, ...clamp(1) }}>{pp.source}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GoldFrame>
    );
};

// === PRINCIPLES =============================================================
export const PrinciplesSlide: React.FC<{ title: string; data: PrinciplesData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const items = (data.items || []).slice(0, densityCaps('principles', density).items);
    const cols = items.length >= 7 ? 4 : items.length >= 3 ? 3 : 2;
    const dense = items.length >= 7;
    // SLIDE-SYSTEM VARIANT (NU_Giving): dark two-panel problem diptych.
    if (data.variant === 'diptych' && items.length >= 2) {
        return (
            <GoldFrame brand={brand} kicker="OUR PERSPECTIVE" title={title} meta={srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, minHeight: 0, alignContent: 'center' }}>
                    {items.slice(0, 2).map((it, i) => (
                        <div key={i} style={{ position: 'relative', background: hex(T.INK), padding: '22px 24px', minHeight: 190, overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: hex(T.CHARTREUSE) }} />
                            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 26, color: hex(T.CHARTREUSE), lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                            <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontWeight: Number(T.TITLE_WEIGHT), fontSize: 17, lineHeight: 1.2, color: hex(T.WHITE), marginTop: 4, ...clamp(2) }}>{it.name}</div>
                            <div style={{ fontSize: 11, lineHeight: 1.45, color: hex(T.PANEL), marginTop: 7, ...clamp(5) }}>{it.description}</div>
                        </div>
                    ))}
                </div>
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker="PRINCIPLES" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: dense ? 10 : 12, flex: 1, minHeight: 0, alignContent: 'start' }}>
                {items.map((it, i) => (
                    <div key={i} style={{ borderTop: `2px solid ${hex(T.CHARTREUSE)}`, paddingTop: 7, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontFamily: F.mono, fontSize: dense ? 7 : 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>Principle {String(i + 1).padStart(2, '0')}</div>
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: dense ? 13 : 16, lineHeight: 1.1, color: hex(T.INK), ...clamp(2) }}>{it.name}</div>
                        <div style={{ fontSize: dense ? 10 : 12, lineHeight: 1.45, color: hex(T.INK), ...clamp(4) }}>{it.description}</div>
                    </div>
                ))}
            </div>
        </GoldFrame>
    );
};

// === TIMELINE ===============================================================
export const TimelineSlide: React.FC<{ title: string; data: TimelineData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const caps = densityCaps('timeline', density);
    const phases = (data.phases || []).slice(0, caps.items);
    const maxItems = Math.max(0, ...phases.map(p => Array.isArray(p.items) ? Math.min(p.items.length, caps.sub) : 0));
    const dense = phases.length >= 6 || maxItems >= 6;
    // SLIDE-SYSTEM VARIANT (NU_Giving): role rows x horizon columns.
    const roleRows = (data.rows || []);
    if (roleRows.length >= 2 && phases.length >= 2) {
        const horizons = phases.slice(0, 4);
        return (
            <GoldFrame brand={brand} kicker="ROADMAP" title={title} meta={srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(${horizons.length},1fr)`, gap: 9, flex: 1, minHeight: 0, alignContent: 'start' }}>
                    <div />
                    {horizons.map((h, i) => (
                        <div key={i} style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8.5, letterSpacing: '1px', color: i === horizons.length - 1 ? hex(T.CHARTREUSE) : hex(T.GREY), textTransform: 'uppercase', paddingBottom: 5, borderBottom: `1.5px solid ${hex(T.INK)}`, ...clamp(1) }}>{h.name}</div>
                    ))}
                    {roleRows.slice(0, 4).map((r, ri) => (
                        <React.Fragment key={ri}>
                            <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontWeight: Number(T.TITLE_WEIGHT), fontSize: 15, color: hex(T.INK), paddingTop: 9, ...clamp(2) }}>{r.role}</div>
                            {(r.cells || []).slice(0, horizons.length).map((c, j) => (
                                <div key={j} style={{ position: 'relative', background: hex(T.WHITE), padding: '12px 11px 9px', minHeight: 64, overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 2, background: j === horizons.length - 1 ? hex(T.INK) : hex(T.CHARTREUSE) }} />
                                    <p style={{ fontSize: 10, lineHeight: 1.38, color: hex(T.INK), margin: 0, ...clamp(3) }}>{c}</p>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker="ROADMAP" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(phases.length, 1)},1fr)`, gap: dense ? 9 : 11, flex: 1, minHeight: 0 }}>
                {phases.map((p, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `2px solid ${hex(T.CHARTREUSE)}`, paddingTop: 7, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontFamily: F.mono, fontSize: dense ? 7.5 : 8.5, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>Phase {String(i + 1).padStart(2, '0')}</div>
                        {p.duration && <div style={{ fontFamily: F.body, fontSize: dense ? 9.5 : 10.5, color: hex(T.ACCENT_COOL), fontWeight: 600 }}>{p.duration}</div>}
                        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: dense ? 14 : 16.5, color: hex(T.INK), lineHeight: 1.1, ...clamp(2) }}>{p.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 2.5 : 3.5, marginTop: 3 }}>
                            {(p.items || []).slice(0, caps.sub).map((it, j) => (
                                <div key={j} style={{ fontSize: dense ? 9.5 : 11.5, lineHeight: 1.4, color: hex(T.INK), paddingLeft: 7, position: 'relative', ...clamp(2) }}>
                                    <span style={{ position: 'absolute', left: 0, top: 4, width: 3, height: 3, background: hex(T.CHARTREUSE) }} />
                                    {it}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </GoldFrame>
    );
};

// === COMPETITIVE MATRIX =====================================================
export const CompetitiveMatrixSlide: React.FC<{ title: string; data: CompetitiveMatrixData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data: m, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const caps = densityCaps('competitive-matrix', density);
    const cols = (m.columns || []).slice(0, caps.sub);
    const rowsRaw = (m.rows || []).slice(0, caps.items);
    const rows = m.subjectRow ? [...rowsRaw].sort((a, b) => (a.name === m.subjectRow ? -1 : b.name === m.subjectRow ? 1 : 0)) : rowsRaw;
    const dense = rows.length >= 9;
    // SLIDE-SYSTEM VARIANT (NU_Giving): two-tier prose evidence table.
    const prose = (m.rowsProse || []);
    if (prose.length >= 2) {
        const top = prose.filter(r => r.tier !== 'second').slice(0, 3);
        const second = prose.filter(r => r.tier === 'second').slice(0, 6);
        const rowStyle = (isTop: boolean): React.CSSProperties => ({
            display: 'grid', gridTemplateColumns: '4px 120px 1.05fr 1.15fr 90px', gap: 10, alignItems: 'start',
            padding: isTop ? '10px 0' : '8px 0', borderBottom: `1px solid ${hex(T.HAIRLINE)}`,
            background: isTop ? hex(T.WHITE) : undefined,
        });
        return (
            <GoldFrame brand={brand} kicker="COMPETITIVE EVIDENCE" title={title} meta={srcMeta(sources)}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '4px 120px 1.05fr 1.15fr 90px', gap: 10, paddingBottom: 5, borderBottom: `1.5px solid ${hex(T.INK)}`, fontFamily: F.mono, fontWeight: 600, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>
                        <div /><div>Institution</div><div>What they prove</div><div>Implication</div><div>Evidence</div>
                    </div>
                    {[...top.map(r => ({ r, isTop: true })), ...second.map(r => ({ r, isTop: false }))].map(({ r, isTop }, i) => (
                        <div key={i} style={rowStyle(isTop)}>
                            <div style={{ width: 3, height: '100%', background: isTop ? hex(T.CHARTREUSE) : 'transparent' }} />
                            <div style={{ fontFamily: isTop ? `'${T.FONT_TITLE}', ${F.serifish}` : F.body, fontWeight: 600, fontSize: isTop ? 13 : 10.5, color: hex(T.INK), lineHeight: 1.2, ...clamp(2) }}>{r.name}</div>
                            <div style={{ fontSize: isTop ? 10.5 : 9.5, lineHeight: 1.3, color: isTop ? hex(T.ACCENT_WARN) : hex(T.INK), fontWeight: isTop ? 600 : 400, ...clamp(2) }}>{r.prove}</div>
                            <div style={{ fontSize: isTop ? 10 : 9, lineHeight: 1.3, color: hex(T.INK), ...clamp(2) }}>{r.implication}</div>
                            <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', lineHeight: 1.3, ...clamp(2) }}>{r.evidenceTag}</div>
                        </div>
                    ))}
                    {m.patternLine && (
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'center', background: hex(T.INK), padding: '9px 16px', marginTop: 8 }}>
                            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8, letterSpacing: '1.5px', color: hex(T.CHARTREUSE), textTransform: 'uppercase' }}>Pattern</div>
                            <div style={{ fontSize: 10.5, lineHeight: 1.36, color: hex(T.WHITE), ...clamp(2) }}>{m.patternLine}</div>
                        </div>
                    )}
                </div>
            </GoldFrame>
        );
    }
    const dot = (s: number) => {
        const c = s >= 4 ? hex(T.INK) : s >= 3 ? hex(T.CHARTREUSE) : s >= 2 ? hex(T.ACCENT_COOL) : hex(T.HAIRLINE);
        return <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 5, background: c, opacity: s >= 2 && s < 3 ? 0.6 : 1 }} />;
    };
    const th: React.CSSProperties = { fontFamily: F.mono, fontSize: dense ? 7.5 : 8.5, letterSpacing: '0.8px', color: hex(T.GREY), textTransform: 'uppercase', borderBottom: `1.5px solid ${hex(T.INK)}`, fontWeight: 600, textAlign: 'left', padding: dense ? '3px 4px' : '5px 5px', verticalAlign: 'top' };
    const td: React.CSSProperties = { padding: dense ? '3px 4px' : '5px 5px', borderBottom: `1px solid ${hex(T.HAIRLINE)}`, textAlign: 'left', verticalAlign: 'top' };
    return (
        <GoldFrame brand={brand} kicker="COMPETITIVE MATRIX" title={title} meta={srcMeta(sources)}>
            {/* MERGED-FLOW CELLS (W2): header name + def and competitor name +
                note each render as ONE pre-line text node, mirroring the stage
                twin's collision-free single-text-box contract (GOLD
                competitive-dense NU 198:57 / NXT 321:57). */}
            <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1 }}>
                <thead><tr>
                    <th style={th}><div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>Competitor</div></th>
                    {cols.map((c, i) => <th key={i} style={th}><div style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>{c}{m.columnDefs?.[i] ? '\n' + m.columnDefs[i] : ''}</div></th>)}
                </tr></thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} style={r.name === m.subjectRow ? { background: hex(T.PANEL) } : undefined}>
                            <td style={{ ...td, fontFamily: F.body, fontWeight: 600, fontSize: dense ? 10 : 12, color: hex(T.INK) }}>
                                <div style={{ whiteSpace: 'pre-line', lineHeight: 1.3, ...clamp(3) }}>{r.name}{r.note ? '\n' + r.note : ''}</div>
                            </td>
                            {(r.scores || []).slice(0, cols.length).map((s, j) => <td key={j} style={td}>{dot(s)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
            {m.insight && (
                <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.4, color: hex(T.INK), background: hex(T.PANEL), padding: '5px 9px', borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, ...clamp(2) }}>{m.insight}</div>
            )}
        </GoldFrame>
    );
};

// === GAP MATRIX =============================================================
export const GapMatrixSlide: React.FC<{ title: string; data: GapMatrixData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const gaps = (data.gaps || []).slice(0, densityCaps('gap-matrix', density).items);
    const scaleMax = data.scaleMax || 5;
    const dense = gaps.length >= 9;
    const sevColor: Record<string, string> = { critical: hex(T.ACCENT_WARN), high: hex(T.ACCENT_WARN), medium: hex(T.GOLD_ACCENT), low: hex(T.GREY) };
    const bar = (lvl: number) => (
        <div style={{ width: 70, height: dense ? 5 : 6, background: hex(T.HAIRLINE), position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((lvl / scaleMax) * 100)}%`, background: hex(T.CHARTREUSE) }} />
        </div>
    );
    const th: React.CSSProperties = { fontFamily: F.mono, fontSize: dense ? 7.5 : 8.5, letterSpacing: '0.8px', color: hex(T.GREY), textTransform: 'uppercase', borderBottom: `1.5px solid ${hex(T.INK)}`, fontWeight: 600, textAlign: 'left', padding: dense ? '3px 4px' : '5px 5px' };
    const td: React.CSSProperties = { padding: dense ? '3px 4px' : '5px 5px', borderBottom: `1px solid ${hex(T.HAIRLINE)}`, verticalAlign: 'top', textAlign: 'left' };
    return (
        <GoldFrame brand={brand} kicker="CAPABILITY GAP" title={title} meta={srcMeta(sources)}>
            <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1 }}>
                <thead><tr><th style={th}>Capability</th><th style={th}>Current</th><th style={th}>Target</th><th style={th}>Severity</th><th style={th}>Impact</th></tr></thead>
                <tbody>
                    {gaps.map((g, i) => (
                        <tr key={i}>
                            <td style={{ ...td, fontFamily: F.body, fontWeight: 600, fontSize: dense ? 10 : 12, color: hex(T.INK), minWidth: 100 }}>{g.capability}</td>
                            <td style={td}>{bar(g.currentMaturity)}<div style={{ fontFamily: F.mono, fontSize: 7.5, color: hex(T.GREY), marginTop: 1 }}>L{g.currentMaturity}/{scaleMax}</div></td>
                            <td style={td}>{bar(g.targetMaturity)}<div style={{ fontFamily: F.mono, fontSize: 7.5, color: hex(T.GREY), marginTop: 1 }}>L{g.targetMaturity}/{scaleMax}</div></td>
                            <td style={{ ...td, fontFamily: F.mono, fontSize: dense ? 7.5 : 8.5, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700, color: sevColor[g.severity] || hex(T.INK) }}>{g.severity}</td>
                            <td style={{ ...td, fontSize: dense ? 9 : 10.5, lineHeight: 1.35, color: hex(T.INK) }}><span style={clamp(2)}>{g.impact}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </GoldFrame>
    );
};

// === ARCHITECTURE MAP =======================================================
export const ArchitectureMapSlide: React.FC<{ title: string; data: ArchitectureMapData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const layers = (data.layers || []).slice(0, 6);
    const nodeCap = densityCaps('architecture-map', density).sub;
    return (
        <GoldFrame brand={brand} kicker="ARCHITECTURE" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {layers.map((l, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 7, borderTop: `1.5px solid ${hex(T.CHARTREUSE)}`, paddingTop: 5, flex: 1, alignItems: 'center' }}>
                        <div style={{ fontFamily: F.display, fontSize: 16.5, color: hex(T.INK), textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {(l.nodes || []).slice(0, nodeCap).map((nd, j) => (
                                <div key={j} style={{ background: hex(T.PANEL), borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, padding: '4px 7px', fontSize: 10.5, lineHeight: 1.3, minWidth: 70, maxWidth: 200 }}>
                                    <div style={{ fontWeight: 600, color: hex(T.INK), ...clamp(1) }}>{nd.name}</div>
                                    {nd.type && <div style={{ fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase', marginTop: 1 }}>{nd.type}</div>}
                                    {nd.description && <div style={{ fontSize: 9, color: hex(T.GREY), marginTop: 1, lineHeight: 1.35, ...clamp(2) }}>{nd.description}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {data.flowSummary && (
                    <div style={{ fontSize: 11.5, lineHeight: 1.4, color: hex(T.INK), background: hex(T.PANEL), padding: '6px 9px', borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, ...clamp(2) }}>
                        <span style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Flow</span>{data.flowSummary}
                    </div>
                )}
            </div>
        </GoldFrame>
    );
};

// === PRD FEATURE ============================================================
export const PrdFeatureSlide: React.FC<{ title: string; data: PrdFeatureData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const caps = densityCaps('prd-feature', density);
    const features = (data.features || []).slice(0, caps.items);
    const cols = features.length >= 5 ? 3 : features.length >= 3 ? 2 : 1;
    const dense = features.length >= 5;
    const priColor: Record<string, string> = { must: hex(T.CHARTREUSE), should: hex(T.ACCENT_COOL), could: hex(T.GREY), wont: hex(T.GREY) };
    // DENSE STRUCTURAL LAYOUT (W2): two full-depth feature cards, twin of
    // renderPrdFeatureDense + Figma NU 199:50 / NXT 322:50. The W0 paginator
    // caps deep payloads at 2/slide, so this is the deep rendering path.
    const isDeep = (f: any) => !!f.userStory && Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length >= 3;
    if (features.length > 0 && features.length <= 2 && features.some(isDeep)) {
        return (
            <GoldFrame brand={brand} kicker="FEATURE SPEC" title={title} meta={srcMeta(sources)}>
                <div style={{ display: 'grid', gridTemplateColumns: features.length >= 2 ? '1fr 1fr' : '1fr', gap: 15, flex: 1, minHeight: 0 }}>
                    {features.slice(0, 2).map((f, i) => (
                        <div key={i} style={{ borderTop: `2px solid ${hex(T.INK)}`, padding: '11px 13px 9px 0', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 24, lineHeight: 1, color: hex(T.CHARTREUSE) }}>{String(i + 1).padStart(2, '0')}</div>
                                <div style={{ fontFamily: `'${T.FONT_TITLE}', ${F.serifish}`, fontWeight: Number(T.TITLE_WEIGHT), fontSize: 14.5, lineHeight: 1.15, color: hex(T.INK), flex: 1, minWidth: 0, ...clamp(2) }}>{f.name}</div>
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 7.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 6px', background: hex(T.INK), color: hex(T.WHITE), flexShrink: 0 }}>{f.priority}</div>
                            </div>
                            {f.problemSolved && <div style={{ fontSize: 10, lineHeight: 1.42, color: hex(T.INK), ...clamp(2) }}>{f.problemSolved}</div>}
                            {f.userStory && <>
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>User story</div>
                                <div style={{ fontSize: 10.5, lineHeight: 1.5, color: hex(T.INK), fontStyle: 'italic', ...clamp(4) }}>{f.userStory}</div>
                            </>}
                            {Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length > 0 && <>
                                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase' }}>Acceptance criteria</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {f.acceptanceCriteria.slice(0, 5).map((ac, j) => (
                                        <div key={j} style={{ display: 'grid', gridTemplateColumns: '7px 1fr', gap: 5, alignItems: 'start' }}>
                                            <span style={{ width: 4.5, height: 4.5, marginTop: 4, background: hex(T.ACCENT_COOL), display: 'block' }} />
                                            <p style={{ fontSize: 9.5, lineHeight: 1.42, color: hex(T.INK), margin: 0, ...clamp(2) }}>{ac}</p>
                                        </div>
                                    ))}
                                </div>
                            </>}
                            {(f.technicalDetails || f.stakeholders) && (
                                <div style={{ marginTop: 'auto', borderTop: `1px solid ${hex(T.HAIRLINE)}`, paddingTop: 5, display: 'flex', flexDirection: 'column', gap: 2, fontFamily: F.mono, fontSize: 7.5, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase' }}>
                                    {f.technicalDetails && <div style={clamp(1)}>{f.technicalDetails}</div>}
                                    {f.stakeholders && <div style={clamp(1)}>Stakeholders: {f.stakeholders}</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </GoldFrame>
        );
    }
    return (
        <GoldFrame brand={brand} kicker="FEATURE SPEC" title={title} meta={srcMeta(sources)}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: dense ? 10 : 12, flex: 1, minHeight: 0 }}>
                {features.map((f, i) => (
                    <div key={i} style={{ borderTop: `2px solid ${hex(T.CHARTREUSE)}`, paddingTop: 7, display: 'flex', flexDirection: 'column', gap: dense ? 3.5 : 5, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 7 }}>
                            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: dense ? 12.5 : 16.5, lineHeight: 1.1, color: hex(T.INK), ...clamp(2) }}>{f.name}</div>
                            <div style={{ fontFamily: F.mono, fontSize: dense ? 7 : 8.5, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, padding: '2px 5px', color: priColor[f.priority] || hex(T.INK), border: '1.5px solid currentColor', flex: '0 0 auto' }}>{f.priority}</div>
                        </div>
                        {f.problemSolved && <div style={{ fontSize: dense ? 9 : 11.5, lineHeight: 1.45, color: hex(T.INK), ...clamp(3) }}>{f.problemSolved}</div>}
                        {f.userStory && <div style={{ fontSize: dense ? 8.5 : 11, lineHeight: 1.45, fontStyle: 'italic', color: hex(T.INK), borderLeft: `2px solid ${hex(T.ACCENT_COOL)}`, padding: '3px 6px', background: hex(T.PANEL), ...clamp(3) }}>{f.userStory}</div>}
                        {Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length > 0 && (
                            <>
                                <div style={{ fontFamily: F.mono, fontSize: dense ? 7 : 8, letterSpacing: '0.8px', color: hex(T.GREY), textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Acceptance criteria</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 1.5 : 2.5 }}>
                                    {f.acceptanceCriteria.slice(0, caps.sub).map((ac, j) => (
                                        <div key={j} style={{ fontSize: dense ? 8.5 : 10.5, lineHeight: 1.4, color: hex(T.INK), paddingLeft: 7, position: 'relative', ...clamp(2) }}>
                                            <span style={{ position: 'absolute', left: 0, top: 4, width: 3, height: 3, background: hex(T.CHARTREUSE) }} />
                                            {ac}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </GoldFrame>
    );
};

// === SYSTEMS INVENTORY ======================================================
export const SystemsInventorySlide: React.FC<{ title: string; data: SystemsInventoryData; sources?: string[]; brand?: Brand; density?: SlideDensity }> = ({ title, data, sources = [], brand, density }) => {
    const T = resolveT(brand); const F = fonts(T);
    const systems = (data.systems || []).slice(0, densityCaps('systems-inventory', density).items);
    const dense = systems.length >= 12;
    const statusColor: Record<string, string> = { current: hex(T.CHARTREUSE), legacy: hex(T.GREY), deprecated: hex(T.ACCENT_WARN), planned: hex(T.ACCENT_COOL) };
    const riskColor: Record<string, string> = { critical: hex(T.ACCENT_WARN), high: hex(T.ACCENT_WARN), medium: hex(T.GOLD_ACCENT), low: hex(T.GREY) };
    const th: React.CSSProperties = { fontFamily: F.mono, fontSize: dense ? 7 : 8.5, letterSpacing: '0.8px', color: hex(T.GREY), textTransform: 'uppercase', borderBottom: `1.5px solid ${hex(T.INK)}`, fontWeight: 600, textAlign: 'left', padding: dense ? '2.5px 4px' : '4px 5px' };
    const td: React.CSSProperties = { padding: dense ? '2.5px 4px' : '4px 5px', borderBottom: `1px solid ${hex(T.HAIRLINE)}`, verticalAlign: 'top', textAlign: 'left' };
    return (
        <GoldFrame brand={brand} kicker="SYSTEMS INVENTORY" title={title} meta={srcMeta(sources)}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>System</th><th style={th}>Category</th><th style={th}>Status</th><th style={th}>Risk</th><th style={th}>Notes</th></tr></thead>
                <tbody>
                    {systems.map((s, i) => (
                        <tr key={i}>
                            <td style={{ ...td, fontFamily: F.body, fontWeight: 600, fontSize: dense ? 9.5 : 11.5, color: hex(T.INK), minWidth: 85 }}>{s.name}</td>
                            <td style={{ ...td, fontFamily: F.mono, fontSize: dense ? 7 : 8.5, letterSpacing: '0.5px', color: hex(T.GREY), textTransform: 'uppercase' }}>{s.category}</td>
                            <td style={{ ...td, fontFamily: F.mono, fontSize: dense ? 7 : 8.5, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700, color: statusColor[s.status] || hex(T.INK) }}>{s.status}</td>
                            <td style={{ ...td, fontFamily: F.mono, fontSize: dense ? 7 : 8.5, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700, color: riskColor[s.risk] || hex(T.INK) }}>{s.risk}</td>
                            <td style={{ ...td, fontSize: dense ? 8.5 : 10, lineHeight: 1.35, color: hex(T.INK) }}><span style={clamp(2)}>{s.description}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.insight && (
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.4, color: hex(T.INK), background: hex(T.PANEL), padding: '5px 9px', borderLeft: `2px solid ${hex(T.CHARTREUSE)}`, ...clamp(2) }}>
                    <span style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '1px', color: hex(T.GREY), textTransform: 'uppercase', marginRight: 4, fontWeight: 600 }}>Insight</span>{data.insight}
                </div>
            )}
        </GoldFrame>
    );
};
