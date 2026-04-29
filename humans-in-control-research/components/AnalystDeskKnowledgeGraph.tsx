/**
 * Analyst Desk Knowledge Graph — Option 1 redesign
 *
 * A dense, dashboard-style view of the research knowledge graph inspired by
 *   - Newsmap (area-weighted theme treemap)
 *   - Spate (trend linkage strip)
 *   - persona cards (portrait tiles with source linking)
 *
 * Layout (top → bottom):
 *   1. Breadcrumb row + view toggle
 *   2. Metric tiles (themes / personas / sources / evidence / recs / barriers)
 *   3. Theme treemap  |  Detail panel (evidence + sources with link-outs)
 *   4. Linkage strip (personas, barriers, journeys, recommendations)
 *
 * Contract mirrors ResearchKnowledgeGraph.tsx so it's a drop-in sibling:
 *   same Props shape, same `graph` input, same `onNodeClick` callback.
 * Persona portrait graphics are retained — they render as clipped rounded
 * rectangles in the linkage strip and in the detail panel persona section.
 *
 * Reverse-pivot: clicking a source chip in the detail panel rewires the
 * treemap to highlight which themes that source contributes to.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KGNode, KnowledgeGraph } from '../services/knowledgeGraphBuilder';
import WikiArticleViewer from './WikiArticleViewer';

declare const d3: any;

// --- NXT BRAND TOKENS (themed) ---
export type DeskTheme = 'dark' | 'light';

interface Tokens {
    theme: DeskTheme;
    bg: string;
    panel: string;
    panelAlt: string;
    line: string;         // structural divider
    hairline: string;     // subtle inner separator
    text: string;
    muted: string;
    teal: string;
    tealMid: string;
    lime: string;
    limeInk: string;      // ink color readable on lime bg
    rust: string;
    green: string;
    tileBase: string;     // default treemap tile bg
    tileInk: string;      // text color on base tile
    tileHot: string;      // highlighted/pivoted tile bg
    tileHotInk: string;   // ink on hot tile
    tileSel: string;      // selected tile bg
    tileSelInk: string;   // ink on selected tile
    tileDim: string;      // dimmed (out-of-pivot) tile bg
    portraitFilter: string; // CSS filter for persona imagery
}

const DARK: Tokens = {
    theme: 'dark',
    bg: '#0D0D0D',
    panel: '#141414',
    panelAlt: '#1A1A1A',
    line: '#2A2A2A',
    hairline: '#1F1F1F',
    text: '#F5F5F0',
    muted: '#8A8A85',
    teal: '#115054',
    tealMid: '#00B7C3',
    lime: '#B8B800',
    limeInk: '#0D0D0D',
    rust: '#CC6644',
    green: '#0CCE6B',
    tileBase: '#B8B800',
    tileInk: '#0D0D0D',
    tileHot: '#B8B800',
    tileHotInk: '#0D0D0D',
    tileSel: '#0D0D0D',
    tileSelInk: '#B8B800',
    tileDim: '#141414',
    portraitFilter: 'grayscale(100%) contrast(1.15) brightness(0.95)',
};

// Stark-white, high-contrast variant. The palette leans typographic:
// tiles are white/off-white with 1px black rules; selection inverts to
// pure black with chartreuse ink; accent colors shift darker to remain
// legible on white; persona portraits keep the editorial grayscale pass.
const LIGHT: Tokens = {
    theme: 'light',
    bg: '#FFFFFF',
    panel: '#FFFFFF',
    panelAlt: '#F6F5F0',
    line: '#0D0D0D',
    hairline: '#E4E2DB',
    text: '#0D0D0D',
    muted: '#5A5A52',
    teal: '#0B3D40',
    tealMid: '#0B7E85',
    lime: '#9A9A00',
    limeInk: '#0D0D0D',
    rust: '#8B3A1E',
    green: '#0A8A4A',
    tileBase: '#FFFFFF',
    tileInk: '#0D0D0D',
    tileHot: '#FFFFFF',
    tileHotInk: '#0D0D0D',
    tileSel: '#0D0D0D',
    tileSelInk: '#CACA20',
    tileDim: '#F6F5F0',
    portraitFilter: 'grayscale(100%) contrast(1.08) brightness(1)',
};

const ThemeCtx = React.createContext<Tokens>(DARK);
const useTokens = () => React.useContext(ThemeCtx);
const ActivityCtx = React.createContext<{ activeStageKey: string | null; isRunning: boolean }>({ activeStageKey: null, isRunning: false });
const useActivity = () => React.useContext(ActivityCtx);

// Inject keyframes once. Guarded by a global flag so repeated mounts don't
// stack <style> elements. Powers the inferring-tile pulse + status-dot blink.
const KEYFRAMES_ID = 'analyst-desk-keyframes';
function ensureKeyframes() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(KEYFRAMES_ID)) return;
    const el = document.createElement('style');
    el.id = KEYFRAMES_ID;
    el.textContent = `
@keyframes ad-pulse-border { 0%,100% { box-shadow: 0 0 0 0 rgba(184,184,0,0); } 50% { box-shadow: 0 0 0 3px rgba(184,184,0,0.55); } }
@keyframes ad-pulse-border-light { 0%,100% { box-shadow: 0 0 0 0 rgba(13,13,13,0); } 50% { box-shadow: 0 0 0 3px rgba(13,13,13,0.25); } }
@keyframes ad-dot-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
@keyframes ad-stripe { 0% { background-position: 0 0; } 100% { background-position: 24px 0; } }
@keyframes ad-shimmer { 0% { opacity: 0.35; } 50% { opacity: 0.75; } 100% { opacity: 0.35; } }
`;
    document.head.appendChild(el);
}

// --- PIPELINE ACTIVITY TYPES ---
// Which KG category a given AnalysisStage feeds. Anything absent from the
// map lights up the top status strip but not a specific metric tile.
export type DeskStageKey = 'themes' | 'personas' | 'journeys' | 'recs' | 'barriers' | 'sources' | 'evidence';
export const STAGE_TO_DESK: Record<string, DeskStageKey | null> = {
    IDLE: null,
    DATA_REVIEW: 'sources',
    INGESTION: 'evidence',
    THEMES: 'themes',
    PERSONAS: 'personas',
    JOURNEY_MAP: 'journeys',
    RECOMMENDATIONS: 'recs',
    GAP_ANALYSIS: 'barriers',
    TECH_AUDIT_STAGE: null,
    COMPETITIVE_ANALYSIS: null,
    TECH_ARCH: null,
    PRD: null,
    ROADMAP: null,
    STRATEGIC_REPORT: null,
    DECK_STRUCTURE: null,
    NARRATIVE: null,
    FINAL: null,
};

const STAGE_LABEL: Record<string, string> = {
    DATA_REVIEW: 'Reviewing collected data',
    INGESTION: 'Ingesting corpus',
    THEMES: 'Extracting themes',
    PERSONAS: 'Synthesizing personas',
    JOURNEY_MAP: 'Mapping journeys',
    RECOMMENDATIONS: 'Authoring recommendations',
    GAP_ANALYSIS: 'Identifying gaps & barriers',
    TECH_AUDIT_STAGE: 'Auditing tech stack',
    COMPETITIVE_ANALYSIS: 'Running competitive analysis',
    TECH_ARCH: 'Designing architecture',
    PRD: 'Drafting PRD',
    ROADMAP: 'Sequencing roadmap',
    STRATEGIC_REPORT: 'Composing strategic report',
    DECK_STRUCTURE: 'Structuring deck',
    NARRATIVE: 'Writing narrative',
    FINAL: 'Finalizing assets',
};

// --- ADAPTIVE SIZING ---
// Three height presets the user can cycle through. Each resolves to a
// viewport-aware CSS length. Defaults live in the root component.
export type DeskSize = 'snug' | 'tall' | 'full';
const SIZE_PRESETS: Record<DeskSize, { height: string; minHeight: string; label: string; tooltip: string }> = {
    snug: { height: 'min(72vh, 860px)', minHeight: '560px', label: 'SNUG', tooltip: 'Compact — fits alongside tile grid' },
    tall: { height: 'min(115vh, 1500px)', minHeight: '820px', label: 'TALL', tooltip: 'Expanded — prioritizes treemap readability' },
    full: { height: '100dvh', minHeight: '100dvh', label: 'FULL', tooltip: 'Fills the viewport (same as EXPAND)' },
};

/** Pick a sensible default size based on viewport width and theme count.
 *  Tablets and narrow windows default to snug; wide desktops to tall. */
function pickDefaultSize(themeCount: number): DeskSize {
    if (typeof window === 'undefined') return 'tall';
    const vw = window.innerWidth;
    if (vw < 1100) return 'snug';
    if (themeCount >= 14) return 'tall';
    return 'tall';
}

export interface PipelineActivity {
    activeStage?: string;       // AnalysisStage value, e.g. 'PERSONAS'
    currentStatus?: string;     // short status line, e.g. "Claude Opus · 342 chunks"
    lastEvent?: string;         // most recent narrative event message
    isRunning?: boolean;        // any stage is actively inferring right now
}

interface Props {
    graph: KnowledgeGraph;
    onNodeClick?: (node: KGNode) => void;
    /** Accepts a pixel number or any CSS length ('85vh', '100%', etc.).
     *  When `size` is provided, `height`/`minHeight` are ignored.
     *  Kept for backward compatibility with existing call sites. */
    height?: number | string;
    /** Optional min-height floor so very short viewports don't cramp the desk. */
    minHeight?: number | string;
    /** Preferred adaptive size — overrides height/minHeight when provided.
     *  'snug' fits alongside other content; 'tall' prioritizes treemap
     *  readability; 'full' uses 100dvh (viewport-fill). */
    size?: DeskSize;
    /** Optional setter so the desk can self-cycle size via the toggle pill. */
    onSizeChange?: (s: DeskSize) => void;
    excludedSources?: Set<string>;
    setExcludedSources?: React.Dispatch<React.SetStateAction<Set<string>>>;
    theme?: DeskTheme;
    activity?: PipelineActivity;
}

// --- HELPERS ---
function edgeId(e: any, which: 'source' | 'target'): string {
    const v = e[which];
    return typeof v === 'string' ? v : (v && v.id) || '';
}

function neighborsOf(node: KGNode, graph: KnowledgeGraph): KGNode[] {
    const ids = new Set<string>();
    for (const e of graph.edges) {
        const s = edgeId(e, 'source');
        const t = edgeId(e, 'target');
        if (s === node.id && t) ids.add(t);
        else if (t === node.id && s) ids.add(s);
    }
    return graph.nodes.filter(n => ids.has(n.id));
}

function neighborsByType(node: KGNode, graph: KnowledgeGraph, types: string[]): KGNode[] {
    return neighborsOf(node, graph).filter(n => types.includes(n.type));
}

function themeEvidence(theme: KGNode, graph: KnowledgeGraph): KGNode[] {
    return neighborsByType(theme, graph, ['evidence']);
}

function themeSources(theme: KGNode, graph: KnowledgeGraph): KGNode[] {
    const direct = neighborsByType(theme, graph, ['source']);
    const ids = new Set(direct.map(n => n.id));
    for (const ev of themeEvidence(theme, graph)) {
        if (ev.parentSourceId && !ids.has(ev.parentSourceId)) {
            const s = graph.nodes.find(n => n.id === ev.parentSourceId);
            if (s) { ids.add(s.id); direct.push(s); }
        }
    }
    return direct;
}

function buildBreadcrumbs(node: KGNode, graph: KnowledgeGraph): KGNode[] {
    const crumbs: KGNode[] = [node];
    const seen = new Set<string>([node.id]);
    let current: KGNode | null = node;
    while (current) {
        let parent: KGNode | null = null;
        if (current.type === 'evidence' && current.parentSourceId) {
            parent = graph.nodes.find(n => n.id === current!.parentSourceId) || null;
        } else if (current.type === 'theme') {
            const srcs = neighborsByType(current, graph, ['source']);
            parent = srcs[0] || null;
        } else if (current.type === 'persona' || current.type === 'recommendation' || current.type === 'gap') {
            const themes = neighborsByType(current, graph, ['theme']);
            parent = themes[0] || null;
        }
        if (!parent || seen.has(parent.id)) break;
        seen.add(parent.id);
        crumbs.unshift(parent);
        current = parent;
    }
    return crumbs;
}

function nodeAccent(n: KGNode, t: Tokens): string {
    if (n.type === 'theme') return t.lime;
    if (n.type === 'persona') return t.tealMid;
    if (n.type === 'recommendation') return t.tealMid;
    if (n.type === 'gap') return t.rust;
    if (n.type === 'source') return t.text;
    if (n.type === 'journey_stage') return t.tealMid;
    return t.muted;
}

function shortLabel(s: string | undefined, n = 48): string {
    if (!s) return '';
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --- SUBCOMPONENTS ---

const MetricTile: React.FC<{ label: string; count: number; accent: string; onClick?: () => void; active?: boolean; inferring?: boolean; compact?: boolean }> = ({ label, count, accent, onClick, active, inferring, compact }) => {
    const t = useTokens();
    const pulseAnim = t.theme === 'light' ? 'ad-pulse-border-light' : 'ad-pulse-border';
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                background: active ? accent : t.panel,
                color: active ? (t.theme === 'light' ? '#FFFFFF' : t.bg) : t.text,
                border: `1px solid ${active ? accent : (inferring ? accent : t.line)}`,
                padding: compact ? '10px 12px' : '14px 18px',
                textAlign: 'left',
                cursor: onClick ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: compact ? 2 : 4,
                transition: 'background 120ms, color 120ms',
                fontFamily: 'Archivo, sans-serif',
                minWidth: 0,
                position: 'relative',
                animation: inferring ? `${pulseAnim} 1.6s ease-in-out infinite` : undefined,
            }}
        >
            <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: compact ? 26 : 36,
                lineHeight: 1,
                letterSpacing: 1,
                color: active ? (t.theme === 'light' ? '#FFFFFF' : t.bg) : accent,
            }}>{count === 0 && inferring ? '…' : count}</span>
            <span style={{
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: active ? (t.theme === 'light' ? '#FFFFFF' : t.bg) : t.muted,
                fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>{label}
                {inferring && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 9, letterSpacing: 1.5,
                        color: active ? (t.theme === 'light' ? '#FFFFFF' : t.bg) : accent,
                        fontWeight: 700,
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, animation: 'ad-dot-blink 1s ease-in-out infinite' }} />
                        INFERRING
                    </span>
                )}
            </span>
        </button>
    );
};

/**
 * CorpusCompositionBar (X.1) — horizontal strip above the treemap showing
 * the extraction-depth distribution of the current evidence pool. Turns
 * Phase 1.6's per-node `extractionDepth` classifications into an operator
 * dashboard: "5 🎬 · 12 📑 · 47 📄 · 188 📰 · 9 ⌘" tells you instantly
 * whether your corpus has teeth or is RSS-blurb shallow.
 *
 * Also renders a thin proportional stacked bar underneath the counts so the
 * RATIO of deep → shallow is visible without math. Pure presentational —
 * no network, no state.
 */
const CorpusCompositionBar: React.FC<{ evidence: KGNode[] }> = ({ evidence }) => {
    const t = useTokens();
    const counts = useMemo(() => {
        const c = { transcript: 0, pdf_extracted: 0, full_text: 0, snippet: 0, headline: 0, dataset: 0 };
        let archived = 0;
        let totalChars = 0;
        let totalSeconds = 0;
        for (const n of evidence) {
            const d = (n.extractionDepth || 'headline') as keyof typeof c;
            if (d in c) c[d]++;
            if (n.wikiPath) archived++;
            if (typeof n.contentLength === 'number') totalChars += n.contentLength;
            if (typeof n.metadata?.duration_sec === 'number') totalSeconds += n.metadata.duration_sec;
        }
        return { ...c, archived, totalChars, totalSeconds, total: evidence.length };
    }, [evidence]);

    // Palette per depth — deep extractions use tokens' accent colors, shallow use muted.
    const deepColor = t.theme === 'light' ? t.text : t.lime;
    const depths: Array<{ key: keyof typeof counts; glyph: string; label: string; color: string; strong: boolean }> = [
        { key: 'transcript',    glyph: '🎬', label: 'TRANSCRIPTS', color: deepColor,   strong: true },
        { key: 'pdf_extracted', glyph: '📑', label: 'PDFs',         color: deepColor,   strong: true },
        { key: 'full_text',     glyph: '📄', label: 'FULL-TEXT',    color: deepColor,   strong: true },
        { key: 'dataset',       glyph: '📊', label: 'DATASETS',     color: t.tealMid,   strong: true },
        { key: 'snippet',       glyph: '📰', label: 'SNIPPETS',     color: t.muted,     strong: false },
        { key: 'headline',      glyph: '•',  label: 'HEADLINES',    color: t.muted,     strong: false },
    ];

    // Proportional bar segments (ignore empty categories)
    const segments = depths.map(d => ({ ...d, count: counts[d.key] as number })).filter(d => d.count > 0);
    const barTotal = segments.reduce((s, d) => s + d.count, 0) || 1;

    const charsLabel = counts.totalChars > 0
        ? (counts.totalChars >= 1_000_000 ? `${(counts.totalChars / 1_000_000).toFixed(1)}M` : `${Math.round(counts.totalChars / 1000)}K`)
        : '';
    const audioLabel = counts.totalSeconds > 0
        ? `${Math.round(counts.totalSeconds / 60)} min audio`
        : '';

    return (
        <div style={{
            borderBottom: `1px solid ${t.theme === 'light' ? t.hairline : t.line}`,
            padding: '8px 16px',
            background: t.theme === 'light' ? t.panelAlt : '#0F0F0F',
            display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        }}>
            <span style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: 2,
                color: t.muted, textTransform: 'uppercase' as const,
            }}>CORPUS</span>
            {/* Counts row */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {depths.map(d => {
                    const n = counts[d.key] as number;
                    if (n === 0) return null;
                    return (
                        <span
                            key={d.key}
                            title={`${n} ${d.label.toLowerCase()} in corpus`}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                fontSize: 11, letterSpacing: 0.4,
                                color: t.text,
                                fontWeight: d.strong ? 700 : 400,
                            }}
                        >
                            <span style={{ fontSize: 13 }} aria-hidden>{d.glyph}</span>
                            <span style={{ color: d.color, fontWeight: 700 }}>{n}</span>
                            <span style={{ color: t.muted, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>{d.label}</span>
                        </span>
                    );
                })}
                {counts.archived > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: t.tealMid, letterSpacing: 1 }} title="Persisted to wiki archive — reusable across engagements">
                        ⌘ {counts.archived} ARCHIVED
                    </span>
                )}
                {charsLabel && (
                    <span style={{ fontSize: 10, color: t.muted, letterSpacing: 0.5 }} title="Total chars of extracted content in corpus">
                        {charsLabel} chars
                    </span>
                )}
                {audioLabel && (
                    <span style={{ fontSize: 10, color: t.muted, letterSpacing: 0.5 }} title="Total transcribed audio duration">
                        {audioLabel}
                    </span>
                )}
            </div>
            {/* Proportional ratio bar */}
            <div style={{ flex: 1, minWidth: 120, maxWidth: 300, display: 'flex', height: 6, border: `1px solid ${t.theme === 'light' ? t.hairline : t.line}`, overflow: 'hidden' }}>
                {segments.map(seg => (
                    <div
                        key={seg.key}
                        title={`${seg.label}: ${seg.count} (${Math.round((seg.count / barTotal) * 100)}%)`}
                        style={{
                            flex: seg.count / barTotal,
                            background: seg.color,
                            opacity: seg.strong ? 1 : 0.45,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const PersonaPortrait: React.FC<{ node: KGNode; size?: number; onClick?: () => void; active?: boolean }> = ({ node, size = 44, onClick, active }) => {
    const t = useTokens();
    const ring = active ? t.lime : t.line;
    return (
        <button
            type="button"
            onClick={onClick}
            title={node.label}
            style={{
                width: size,
                height: size,
                padding: 0,
                background: t.panelAlt,
                border: `2px solid ${ring}`,
                cursor: onClick ? 'pointer' : 'default',
                overflow: 'hidden',
                display: 'block',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {node.imageUrl ? (
                <img
                    src={node.imageUrl}
                    alt={node.label}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: t.portraitFilter,
                    }}
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.tealMid,
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: size * 0.42,
                    letterSpacing: 1,
                    background: t.panelAlt,
                }}>
                    {(node.label || '?').slice(0, 2).toUpperCase()}
                </div>
            )}
        </button>
    );
};

// --- THEME TREEMAP ---
interface TreemapTile {
    node: KGNode;
    x: number; y: number; w: number; h: number;
    weight: number;
}

function computeTreemap(themes: KGNode[], width: number, height: number): TreemapTile[] {
    if (!themes.length || width <= 0 || height <= 0) return [];
    if (typeof d3 === 'undefined') {
        // Simple row fallback if d3 isn't available for some reason
        const cols = Math.ceil(Math.sqrt(themes.length));
        const rows = Math.ceil(themes.length / cols);
        const tw = width / cols;
        const th = height / rows;
        return themes.map((t, i) => ({
            node: t,
            x: (i % cols) * tw,
            y: Math.floor(i / cols) * th,
            w: tw - 2,
            h: th - 2,
            weight: t.evidenceCount || 1,
        }));
    }
    const root = d3.hierarchy({ children: themes.map(t => ({ node: t, value: Math.max(1, t.evidenceCount || 1) })) })
        .sum((d: any) => d.value)
        .sort((a: any, b: any) => b.value - a.value);
    const tm = d3.treemap().size([width, height]).paddingInner(3).round(true);
    tm(root);
    return root.leaves().map((leaf: any) => ({
        node: leaf.data.node,
        x: leaf.x0,
        y: leaf.y0,
        w: Math.max(0, leaf.x1 - leaf.x0),
        h: Math.max(0, leaf.y1 - leaf.y0),
        weight: leaf.value,
    }));
}

const ThemeTreemap: React.FC<{
    themes: KGNode[];
    highlighted: Set<string> | null;
    selectedId: string | null;
    onSelect: (n: KGNode) => void;
}> = ({ themes, highlighted, selectedId, onSelect }) => {
    const t = useTokens();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 640, h: 360 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            setDims({ w: Math.max(0, rect.width), h: Math.max(0, rect.height) });
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const tiles = useMemo(() => computeTreemap(themes, dims.w, dims.h), [themes, dims.w, dims.h]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: t.bg,
                overflow: 'hidden',
            }}
        >
            {themes.length === 0 && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: t.muted, fontSize: 11, letterSpacing: 2,
                    textTransform: 'uppercase',
                    gap: 8,
                    padding: 24,
                    textAlign: 'center',
                }}>
                    {/* Skeleton placeholder tiles when inferring */}
                    <div style={{
                        position: 'absolute', inset: 4, display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gridTemplateRows: 'repeat(3, 1fr)',
                        gap: 4,
                        pointerEvents: 'none',
                    }}>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} style={{
                                background: t.panelAlt,
                                border: `1px solid ${t.hairline}`,
                                animation: 'ad-shimmer 1.6s ease-in-out infinite',
                                animationDelay: `${(i % 4) * 120}ms`,
                                opacity: 0.5,
                            }} />
                        ))}
                    </div>
                    <div style={{ position: 'relative', zIndex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: t.text }}>
                        Themes will appear here
                    </div>
                </div>
            )}
            {tiles.map(tile => {
                const n = tile.node;
                const isSelected = n.id === selectedId;
                const isHighlighted = highlighted ? highlighted.has(n.id) : true;
                const conc = n.sourceConcentration || 0;
                const thin = !!n.isThinTheme;
                // Theme-aware tile palette. Light mode goes typographic:
                // white tiles with hairline rules; selection inverts to
                // deep black with chartreuse ink. Dark mode keeps the
                // chartreuse-on-black newsmap feel.
                let bg: string, fg: string;
                if (isSelected) {
                    bg = t.tileSel;
                    fg = t.tileSelInk;
                } else if (!isHighlighted) {
                    bg = t.tileDim;
                    fg = t.muted;
                } else if (conc >= 0.7) {
                    bg = t.theme === 'light' ? t.panelAlt : t.rust;
                    fg = t.theme === 'light' ? t.rust : t.text;
                } else if (thin) {
                    bg = t.theme === 'light' ? t.panelAlt : t.teal;
                    fg = t.theme === 'light' ? t.muted : t.text;
                } else {
                    bg = t.tileBase;
                    fg = t.tileInk;
                }
                const borderColor = t.theme === 'light' ? t.line : t.bg;
                const borderWidth = isSelected ? 2 : 1;
                const showLabel = tile.w > 60 && tile.h > 28;
                const showCount = tile.w > 80 && tile.h > 50;
                // Responsive type curve: narrow tiles get smaller type and tighter
                // letter-spacing so long words like "DONOR" don't overflow the tile
                // width and get clipped by the parent overflow:hidden. Ceiling 32px,
                // floor 11px, slope tuned so a 60px tile lands at ~13px font.
                const labelFs = Math.min(32, Math.max(11, tile.w / 9));
                const labelLs = tile.w < 110 ? 0 : 0.5;
                const labelLineClamp = Math.max(1, Math.floor((tile.h - (showCount ? 28 : 16)) / (labelFs * 1.1)));
                return (
                    <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelect(n)}
                        title={`${n.label} — ${n.evidenceCount || 0} evidence${n.dominantSource ? ` · ${n.dominantSource}` : ''}`}
                        style={{
                            position: 'absolute',
                            left: tile.x, top: tile.y,
                            width: tile.w, height: tile.h,
                            background: bg,
                            color: fg,
                            border: `${borderWidth}px solid ${borderColor}`,
                            padding: '8px 10px',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textAlign: 'left',
                            transition: 'background 140ms, opacity 140ms',
                            opacity: isHighlighted ? 1 : (t.theme === 'light' ? 0.55 : 0.35),
                            fontFamily: 'Archivo, sans-serif',
                        }}
                    >
                        {showLabel && (
                            <span style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: labelFs,
                                lineHeight: 1.1,
                                letterSpacing: labelLs,
                                display: '-webkit-box',
                                WebkitLineClamp: labelLineClamp,
                                WebkitBoxOrient: 'vertical' as any,
                                overflow: 'hidden',
                                // Word-break fallbacks so long words (DONOR, ADVANCEMENT) wrap
                                // instead of overflowing the tile width and being clipped by
                                // the parent. 'anywhere' is the modern one; 'break-word' is
                                // the legacy fallback. Combined with maxWidth they guarantee
                                // every glyph stays inside the tile.
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word',
                                hyphens: 'auto',
                                maxWidth: '100%',
                                minWidth: 0,
                            }}>{n.label}</span>
                        )}
                        {showCount && (
                            <span style={{
                                fontSize: 10,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                opacity: 0.85,
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 8,
                            }}>
                                <span>{n.evidenceCount || 0} evidence</span>
                                {conc >= 0.7 && <span style={{ color: isSelected ? t.tileSelInk : t.rust, fontWeight: 700 }}>⚠ concentration</span>}
                                {thin && conc < 0.7 && <span style={{ fontStyle: 'italic' }}>thin</span>}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

// --- DETAIL PANEL ---
const DetailPanel: React.FC<{
    node: KGNode | null;
    graph: KnowledgeGraph;
    excludedSources?: Set<string>;
    setExcludedSources?: React.Dispatch<React.SetStateAction<Set<string>>>;
    onSelectNode: (n: KGNode) => void;
    onPivotSource: (n: KGNode | null) => void;
    pivotSource: KGNode | null;
    onOpenArchive?: (wikiPath: string) => void;
}> = ({ node, graph, excludedSources, setExcludedSources, onSelectNode, onPivotSource, pivotSource, onOpenArchive }) => {
    const t = useTokens();
    if (!node) {
        return (
            <div style={{
                padding: 20,
                color: t.muted,
                fontSize: 11,
                letterSpacing: 1.5,
                fontFamily: 'Archivo, sans-serif',
                textTransform: 'uppercase',
                lineHeight: 1.8,
                background: t.panel,
                borderLeft: `1px solid ${t.theme === 'light' ? t.line : t.hairline}`,
                height: '100%',
            }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: t.text, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    Analyst Desk
                </div>
                <div style={{ maxWidth: 300, fontSize: 11, lineHeight: 1.6, textTransform: 'none', color: t.muted, letterSpacing: 0 }}>
                    Click a theme tile to inspect evidence. Click any source chip to reverse-pivot the treemap and see which themes that source drives.
                </div>
            </div>
        );
    }

    const accent = nodeAccent(node, t);
    // 2026-04-28: previously capped at .slice(0, 24) which silently hid every
    // evidence beyond #24 even when a theme had 80+ supporting passages —
    // making themes look thinner than they were and burying cross-source
    // corroboration. Now the panel shows ALL evidence with a paginated
    // expand/collapse: first EVIDENCE_INITIAL_PAGE on load, full list when
    // the user clicks "Show all". No data is hidden by default.
    const allEvidence = themeEvidence(node, graph);
    const [evidenceExpanded, setEvidenceExpanded] = useState(false);
    const EVIDENCE_INITIAL_PAGE = 12;
    const linkedEvidence = evidenceExpanded ? allEvidence : allEvidence.slice(0, EVIDENCE_INITIAL_PAGE);
    const linkedSources = themeSources(node, graph);
    const linkedPersonas = neighborsByType(node, graph, ['persona']);
    const linkedRecs = neighborsByType(node, graph, ['recommendation']);
    const linkedBarriers = neighborsByType(node, graph, ['gap']);
    const isSource = node.type === 'source';
    const divider = t.theme === 'light' ? t.line : t.hairline;

    return (
        <div style={{
            height: '100%',
            overflow: 'auto',
            background: t.panel,
            borderLeft: `1px solid ${divider}`,
            fontFamily: 'Archivo, sans-serif',
            color: t.text,
        }}>
            {/* Header */}
            <div style={{
                padding: '18px 22px 14px',
                borderBottom: `1px solid ${divider}`,
                position: 'sticky', top: 0,
                background: t.panel,
                zIndex: 2,
            }}>
                <div style={{
                    fontSize: 10,
                    letterSpacing: 2.2,
                    textTransform: 'uppercase',
                    color: accent,
                    fontWeight: 700,
                    marginBottom: 6,
                }}>
                    {node.type.replace('_', ' ')}
                </div>
                <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 28,
                    lineHeight: 1.08,
                    letterSpacing: 0.5,
                    color: t.text,
                    textTransform: 'uppercase',
                }}>
                    {node.label}
                </div>
                {node.evidenceCount !== undefined && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 18, fontSize: 11, letterSpacing: 1.2, color: t.muted, textTransform: 'uppercase' }}>
                        <span><b style={{ color: t.lime }}>{node.evidenceCount}</b> evidence</span>
                        {node.sourceConcentration !== undefined && (
                            <span><b style={{ color: node.sourceConcentration >= 0.7 ? t.rust : t.text }}>
                                {(node.sourceConcentration * 100).toFixed(0)}%
                            </b> source concentration</span>
                        )}
                        {node.isThinTheme && <span style={{ color: t.rust }}>thin</span>}
                    </div>
                )}
            </div>

            {/* Quote */}
            {node.metadata?.quote && (
                <div style={{
                    padding: '18px 22px',
                    borderBottom: `1px solid ${divider}`,
                    background: t.panelAlt,
                }}>
                    <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: t.text,
                        borderLeft: `3px solid ${t.lime}`,
                        paddingLeft: 12,
                    }}>
                        "{shortLabel(node.metadata.quote, 320)}"
                    </div>
                </div>
            )}

            {/* Goal-alignment badge — surfaces how directly this theme answers the
                research objective (Tier C goalAlignment 0..100). High-alignment
                themes get a teal badge; tangential themes get a muted one. */}
            {node.type === 'theme' && typeof node.metadata?.goalAlignment === 'number' && (
                <div style={{ padding: '10px 22px 0' }}>
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        fontSize: 9,
                        letterSpacing: 1.6,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'transparent',
                        border: `1px solid ${node.metadata.goalAlignment >= 70 ? t.lime : node.metadata.goalAlignment >= 40 ? t.tealMid : t.muted}`,
                        color: node.metadata.goalAlignment >= 70 ? t.lime : node.metadata.goalAlignment >= 40 ? t.tealMid : t.muted,
                    }}>
                        Goal alignment {Math.round(node.metadata.goalAlignment)}/100
                    </span>
                </div>
            )}

            {/* Description */}
            {(node.metadata?.description || node.metadata?.bio || node.metadata?.role) && (
                <div style={{ padding: '14px 22px', fontSize: 13, lineHeight: 1.65, color: t.muted, borderBottom: `1px solid ${divider}` }}>
                    {node.metadata?.role && <div style={{ color: t.tealMid, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{node.metadata.role}</div>}
                    {shortLabel(node.metadata?.description || node.metadata?.bio, 700)}
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────
                Tier C multi-faceted theme rendering. Each block reads from
                node.metadata.* fields populated by the new theme schema in
                geminiService.ts. Sections only render if their data exists,
                so non-theme nodes (sources, personas, recs) are unaffected.
                ────────────────────────────────────────────────────────────── */}

            {/* Sub-themes — distinct mechanisms inside the umbrella theme */}
            {node.type === 'theme' && Array.isArray(node.metadata?.subThemes) && node.metadata.subThemes.length > 0 && (
                <DetailSection label={`Sub-themes (${node.metadata.subThemes.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {node.metadata.subThemes.map((sub: any, i: number) => (
                            <div key={i} style={{
                                borderLeft: `3px solid ${t.tealMid}`,
                                paddingLeft: 12,
                                paddingTop: 4,
                                paddingBottom: 4,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>
                                    {sub.name}
                                </div>
                                {sub.description && (
                                    <div style={{ fontSize: 12, lineHeight: 1.55, color: t.muted }}>
                                        {sub.description}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DetailSection>
            )}

            {/* Organizing dimensions — analytical axes that explain how the theme varies */}
            {node.type === 'theme' && Array.isArray(node.metadata?.dimensions) && node.metadata.dimensions.length > 0 && (
                <DetailSection label="Dimensions">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {node.metadata.dimensions.map((dim: any, i: number) => (
                            <div key={i}>
                                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: t.tealMid, fontWeight: 700, marginBottom: 5 }}>
                                    {dim.axis}
                                </div>
                                {Array.isArray(dim.values) && dim.values.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {dim.values.map((v: string, j: number) => (
                                            <span key={j} style={{
                                                fontSize: 11,
                                                padding: '3px 8px',
                                                background: 'transparent',
                                                border: `1px solid ${t.muted}`,
                                                color: t.text,
                                                fontFamily: "'JetBrains Mono', monospace",
                                            }}>{v}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DetailSection>
            )}

            {/* Contradictions — conflicting evidence the corpus contains */}
            {node.type === 'theme' && Array.isArray(node.metadata?.contradictions) && node.metadata.contradictions.length > 0 && (
                <DetailSection label={`Contradictions (${node.metadata.contradictions.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {node.metadata.contradictions.map((c: any, i: number) => (
                            <div key={i} style={{
                                padding: 12,
                                background: t.panelAlt,
                                borderLeft: `3px solid ${t.rust}`,
                            }}>
                                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: t.rust, fontWeight: 700, marginBottom: 6 }}>
                                    Conflicting evidence
                                </div>
                                <div style={{ fontSize: 12, lineHeight: 1.55, color: t.text, marginBottom: 6 }}>
                                    <b>Claim:</b> {c.claim}
                                </div>
                                <div style={{ fontSize: 12, lineHeight: 1.55, color: t.text, marginBottom: 6 }}>
                                    <b>Counter:</b> {c.counterClaim}
                                </div>
                                {c.resolution && (
                                    <div style={{ fontSize: 11, lineHeight: 1.55, color: t.muted, fontStyle: 'italic', marginTop: 6 }}>
                                        Synthesis: {c.resolution}
                                    </div>
                                )}
                                {((Array.isArray(c.sources) && c.sources.length > 0) || (Array.isArray(c.counterSources) && c.counterSources.length > 0)) && (
                                    <div style={{ marginTop: 8, fontSize: 9, letterSpacing: 1.4, color: t.muted, textTransform: 'uppercase' }}>
                                        {Array.isArray(c.sources) && c.sources.length > 0 && <>Claim sources: {c.sources.join(' · ')}</>}
                                        {Array.isArray(c.counterSources) && c.counterSources.length > 0 && (
                                            <> {Array.isArray(c.sources) && c.sources.length > 0 ? ' | ' : ''}Counter sources: {c.counterSources.join(' · ')}</>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DetailSection>
            )}

            {/* Temporal arc — how this theme has evolved over time */}
            {node.type === 'theme' && node.metadata?.temporalArc && (() => {
                const arc = node.metadata.temporalArc;
                const hasContent = arc.pre2024 || arc.in2024_2025 || arc.in2025_2026 || arc.forwardSignal;
                if (!hasContent) return null;
                const periods: { key: string; label: string; text: string }[] = [
                    { key: 'pre2024', label: 'Pre-2024', text: arc.pre2024 },
                    { key: 'in2024_2025', label: '2024-2025', text: arc.in2024_2025 },
                    { key: 'in2025_2026', label: '2025-2026', text: arc.in2025_2026 },
                    { key: 'forwardSignal', label: 'Forward signal', text: arc.forwardSignal },
                ].filter(p => p.text);
                return (
                    <DetailSection label="Temporal arc">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {periods.map(p => (
                                <div key={p.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                        flexShrink: 0,
                                        width: 90,
                                        fontSize: 9,
                                        letterSpacing: 1.6,
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                        color: t.tealMid,
                                        paddingTop: 2,
                                    }}>
                                        {p.label}
                                    </div>
                                    <div style={{ flex: 1, fontSize: 12, lineHeight: 1.55, color: t.text }}>
                                        {p.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DetailSection>
                );
            })()}

            {/* Implications — consultant-grade verbs to act on */}
            {node.type === 'theme' && Array.isArray(node.metadata?.implications) && node.metadata.implications.length > 0 && (
                <DetailSection label={`Implications (${node.metadata.implications.length})`}>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.6, color: t.text }}>
                        {node.metadata.implications.map((imp: string, i: number) => (
                            <li key={i} style={{ marginBottom: 8 }}>{imp}</li>
                        ))}
                    </ol>
                </DetailSection>
            )}

            {/* Persona portraits for this node */}
            {linkedPersonas.length > 0 && (
                <DetailSection label="Personas">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        {linkedPersonas.map(p => (
                            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', cursor: 'pointer' }} onClick={() => onSelectNode(p)}>
                                <PersonaPortrait node={p} size={52} onClick={() => onSelectNode(p)} />
                                <div style={{ fontSize: 10, color: t.text, maxWidth: 72, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0.3 }}>{shortLabel(p.label, 18)}</div>
                            </div>
                        ))}
                    </div>
                </DetailSection>
            )}

            {/* Evidence list (paginated — see EVIDENCE_INITIAL_PAGE above) */}
            {linkedEvidence.length > 0 && (
                <DetailSection label={`Evidence (${evidenceExpanded || allEvidence.length <= EVIDENCE_INITIAL_PAGE ? allEvidence.length : `${linkedEvidence.length} of ${allEvidence.length}`})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {linkedEvidence.map(ev => {
                            const src = ev.parentSourceId ? graph.nodes.find(n => n.id === ev.parentSourceId) : null;
                            const tierColor = ev.tier === 1 ? t.lime : ev.tier === 2 ? t.tealMid : t.muted;
                            const quote = ev.metadata?.content || ev.metadata?.text || '';
                            return (
                                <div key={ev.id} style={{
                                    borderLeft: `3px solid ${tierColor}`,
                                    paddingLeft: 12,
                                    paddingTop: 3, paddingBottom: 3,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                        {ev.url ? (
                                            <a
                                                href={ev.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    color: t.text,
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    textDecoration: 'none',
                                                    lineHeight: 1.4,
                                                    borderBottom: `1px dotted ${t.muted}`,
                                                }}
                                            >
                                                {shortLabel(ev.label, 130)} ↗
                                            </a>
                                        ) : (
                                            <span style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{shortLabel(ev.label, 130)}</span>
                                        )}
                                    </div>
                                    {quote && (
                                        <div style={{
                                            marginTop: 6,
                                            fontSize: 12,
                                            lineHeight: 1.55,
                                            color: t.muted,
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}>
                                            {shortLabel(quote, 260)}
                                        </div>
                                    )}
                                    <div style={{ marginTop: 6, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: t.muted, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {src && (
                                            <button
                                                type="button"
                                                onClick={() => { onSelectNode(src); onPivotSource(src); }}
                                                style={{ background: 'none', border: 'none', color: tierColor, cursor: 'pointer', padding: 0, letterSpacing: 1.5, fontFamily: 'Archivo, sans-serif', fontSize: 9, textTransform: 'uppercase' }}
                                            >
                                                {src.label}
                                            </button>
                                        )}
                                        {/* Extraction depth badge — makes it visibly evident when
                                            evidence is a full-text article, PDF, or transcript vs a
                                            headline blurb. Phase 1.6 surfaces the classification the
                                            orchestrator wrote onto the evidence node. */}
                                        {ev.extractionDepth && (() => {
                                            const depth = ev.extractionDepth;
                                            const glyph = depth === 'transcript' ? '🎬' : depth === 'pdf_extracted' ? '📑' : depth === 'full_text' ? '📄' : depth === 'dataset' ? '📊' : depth === 'snippet' ? '📰' : '•';
                                            const labelMap: Record<string, string> = { transcript: 'TRANSCRIPT', pdf_extracted: 'PDF', full_text: 'FULL TEXT', dataset: 'DATASET', snippet: 'SNIPPET', headline: 'HEADLINE' };
                                            const isDeep = depth === 'full_text' || depth === 'pdf_extracted' || depth === 'transcript';
                                            const kchars = ev.contentLength ? ` · ${ev.contentLength >= 1000 ? `${Math.round(ev.contentLength / 1000)}k` : ev.contentLength} chars` : '';
                                            return (
                                                <span
                                                    title={ev.wikiPath ? `${labelMap[depth]}${kchars} · archived at wiki/${ev.wikiPath}` : `${labelMap[depth]}${kchars}`}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '2px 6px',
                                                        fontSize: 9, letterSpacing: 1.2,
                                                        fontWeight: 700,
                                                        color: isDeep ? (t.theme === 'light' ? t.text : t.lime) : t.muted,
                                                        border: `1px ${isDeep ? 'solid' : 'dashed'} ${isDeep ? (t.theme === 'light' ? t.text : t.lime) : t.muted}`,
                                                        background: 'transparent',
                                                    }}
                                                >
                                                    <span aria-hidden>{glyph}</span>{labelMap[depth]}{kchars}
                                                </span>
                                            );
                                        })()}
                                        {ev.tier && <span>T{ev.tier}</span>}
                                        {ev.relevanceScore !== undefined && <span>rel {Math.round(ev.relevanceScore)}</span>}
                                        {ev.freshnessScore !== undefined && <span>fresh {Math.round(ev.freshnessScore)}</span>}
                                        {ev.wikiPath && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); onOpenArchive?.(ev.wikiPath!); }}
                                                title={`Open archived wiki article: ${ev.wikiPath}`}
                                                style={{
                                                    color: t.tealMid, fontSize: 9, letterSpacing: 0.5,
                                                    background: 'transparent',
                                                    border: `1px solid ${t.tealMid}`,
                                                    padding: '2px 6px', cursor: 'pointer',
                                                    fontFamily: 'inherit', fontWeight: 700,
                                                }}
                                            >⌘ READ ARCHIVED ↗</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Expand / collapse — surfaces evidence beyond the
                        EVIDENCE_INITIAL_PAGE without forcing the user to live
                        in a 24-item ceiling that masks how thoroughly the theme
                        is supported. */}
                    {allEvidence.length > EVIDENCE_INITIAL_PAGE && (
                        <button
                            type="button"
                            onClick={() => setEvidenceExpanded(v => !v)}
                            style={{
                                marginTop: 12,
                                padding: '8px 14px',
                                background: 'transparent',
                                border: `1px solid ${t.tealMid}`,
                                color: t.tealMid,
                                fontSize: 10,
                                letterSpacing: 1.6,
                                fontWeight: 700,
                                fontFamily: 'Archivo, sans-serif',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                            }}
                        >
                            {evidenceExpanded
                                ? `↑ Show first ${EVIDENCE_INITIAL_PAGE}`
                                : `↓ Show all ${allEvidence.length} evidence items`}
                        </button>
                    )}
                </DetailSection>
            )}

            {/* Source chips — drive reverse-pivot */}
            {linkedSources.length > 0 && (
                <DetailSection label={`Sources (${linkedSources.length})`}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {linkedSources.map(s => {
                            const isPivot = pivotSource?.id === s.id;
                            const excluded = excludedSources?.has(s.label || '') || excludedSources?.has(s.id);
                            return (
                                <div key={s.id} style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isPivot) onPivotSource(null);
                                            else onPivotSource(s);
                                            onSelectNode(s);
                                        }}
                                        title={isPivot ? 'Clear pivot' : 'Pivot treemap to this source'}
                                        style={{
                                            background: isPivot ? t.lime : t.panelAlt,
                                            color: isPivot ? t.limeInk : t.text,
                                            border: `1px solid ${isPivot ? t.lime : (t.theme === 'light' ? t.line : t.line)}`,
                                            padding: '6px 10px',
                                            fontSize: 11,
                                            letterSpacing: 0.5,
                                            cursor: 'pointer',
                                            opacity: excluded ? 0.4 : 1,
                                            fontFamily: 'Archivo, sans-serif',
                                        }}
                                    >
                                        {s.label}{s.metadata?.itemCount ? ` · ${s.metadata.itemCount}` : ''}
                                    </button>
                                    {setExcludedSources && s.label && (
                                        <button
                                            type="button"
                                            title={excluded ? 'Re-include source' : 'Exclude source'}
                                            onClick={() => {
                                                setExcludedSources(prev => {
                                                    const next = new Set(prev || []);
                                                    if (next.has(s.label || '')) next.delete(s.label || '');
                                                    else next.add(s.label || '');
                                                    return next;
                                                });
                                            }}
                                            style={{
                                                background: t.bg,
                                                color: excluded ? t.lime : t.muted,
                                                border: `1px solid ${t.line}`,
                                                padding: '0 6px',
                                                fontSize: 10,
                                                fontFamily: 'Archivo, sans-serif',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {excluded ? '+' : '×'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {isSource && pivotSource?.id === node.id && (
                        <div style={{ marginTop: 10, fontSize: 10, letterSpacing: 1, color: t.lime }}>
                            Treemap pivoted — highlighting themes this source drives.
                            <button type="button" onClick={() => onPivotSource(null)} style={{ marginLeft: 8, color: t.text, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>clear</button>
                        </div>
                    )}
                </DetailSection>
            )}

            {/* Recommendations + barriers */}
            {linkedRecs.length > 0 && (
                <DetailSection label={`Recommendations (${linkedRecs.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {linkedRecs.map(r => (
                            <button key={r.id} type="button" onClick={() => onSelectNode(r)} style={{
                                background: t.panelAlt,
                                border: `1px solid ${divider}`,
                                borderLeft: `3px solid ${t.tealMid}`,
                                padding: '8px 12px',
                                color: t.text,
                                fontSize: 12,
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontFamily: 'Archivo, sans-serif',
                                lineHeight: 1.45,
                            }}>{shortLabel(r.label, 160)}</button>
                        ))}
                    </div>
                </DetailSection>
            )}

            {linkedBarriers.length > 0 && (
                <DetailSection label={`Gaps / Barriers (${linkedBarriers.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {linkedBarriers.map(b => (
                            <button key={b.id} type="button" onClick={() => onSelectNode(b)} style={{
                                background: t.panelAlt,
                                border: `1px solid ${divider}`,
                                borderLeft: `3px solid ${t.rust}`,
                                padding: '8px 12px',
                                color: t.text,
                                fontSize: 12,
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontFamily: 'Archivo, sans-serif',
                                lineHeight: 1.45,
                            }}>{shortLabel(b.label, 160)}</button>
                        ))}
                    </div>
                </DetailSection>
            )}

            {/* Primary link when node itself has a URL */}
            {node.url && (
                <div style={{ padding: '12px 18px', borderTop: `1px solid ${divider}` }}>
                    <a href={node.url} target="_blank" rel="noopener noreferrer" style={{
                        color: t.lime,
                        fontSize: 11,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        borderBottom: `1px solid ${t.lime}`,
                        paddingBottom: 2,
                    }}>
                        Open source ↗
                    </a>
                </div>
            )}
        </div>
    );
};

const DetailSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
    const t = useTokens();
    const divider = t.theme === 'light' ? t.hairline : t.hairline;
    return (
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${divider}` }}>
            <div style={{
                fontSize: 10,
                letterSpacing: 2.6,
                textTransform: 'uppercase',
                color: t.muted,
                marginBottom: 12,
                fontWeight: 700,
            }}>{label}</div>
            {children}
        </div>
    );
};

// --- LINKAGE STRIP ---
const LinkageStrip: React.FC<{
    selected: KGNode | null;
    graph: KnowledgeGraph;
    personas: KGNode[];
    barriers: KGNode[];
    recs: KGNode[];
    journeys: KGNode[];
    onSelect: (n: KGNode) => void;
}> = ({ selected, graph, personas, barriers, recs, journeys, onSelect }) => {
    const t = useTokens();
    // S3.3: which group is expanded to show all chips (popover). null = none.
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const LINKAGE_MAX_VISIBLE = 6;
    const activeIds = useMemo(() => {
        if (!selected) return new Set<string>();
        const s = new Set<string>();
        for (const n of neighborsOf(selected, graph)) s.add(n.id);
        // 2-hop via themes when a persona/rec is selected
        if (selected.type === 'persona' || selected.type === 'recommendation' || selected.type === 'gap') {
            for (const theme of neighborsByType(selected, graph, ['theme'])) {
                for (const n of neighborsOf(theme, graph)) s.add(n.id);
            }
        }
        return s;
    }, [selected, graph]);

    const renderGroup = (label: string, nodes: KGNode[], accent: string, portrait = false) => {
        if (!nodes.length) return null;
        const isExpanded = expandedGroup === label;
        const hasOverflow = nodes.length > LINKAGE_MAX_VISIBLE;
        const visible = isExpanded ? nodes : nodes.slice(0, LINKAGE_MAX_VISIBLE);
        const overflowCount = nodes.length - LINKAGE_MAX_VISIBLE;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: t.muted, fontWeight: 700, fontFamily: 'Archivo, sans-serif' }}>
                    <span>{label} <span style={{ color: accent }}>{nodes.length}</span></span>
                    {isExpanded && (
                        <button
                            type="button"
                            onClick={() => setExpandedGroup(null)}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 9, letterSpacing: 1.5, fontFamily: 'Archivo, sans-serif', padding: 0, textTransform: 'uppercase' }}
                        >collapse</button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {visible.map(n => {
                        const isSelected = selected?.id === n.id;
                        const isActive = !selected || activeIds.has(n.id);
                        if (portrait && n.type === 'persona') {
                            return <PersonaPortrait key={n.id} node={n} size={42} active={isSelected} onClick={() => onSelect(n)} />;
                        }
                        return (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => onSelect(n)}
                                style={{
                                    background: isSelected ? accent : t.panel,
                                    color: isSelected ? (t.theme === 'light' ? '#FFFFFF' : t.bg) : t.text,
                                    border: `1px solid ${isSelected ? accent : (t.theme === 'light' ? t.hairline : t.line)}`,
                                    borderLeft: `3px solid ${accent}`,
                                    padding: '6px 10px',
                                    fontSize: 11,
                                    letterSpacing: 0.4,
                                    cursor: 'pointer',
                                    opacity: isActive ? 1 : (t.theme === 'light' ? 0.4 : 0.35),
                                    transition: 'opacity 140ms, background 140ms',
                                    fontFamily: 'Archivo, sans-serif',
                                    maxWidth: 240,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                                title={n.label}
                            >{shortLabel(n.label, 36)}</button>
                        );
                    })}
                    {hasOverflow && !isExpanded && (
                        <button
                            type="button"
                            onClick={() => setExpandedGroup(label)}
                            title={`Show all ${nodes.length} ${label.toLowerCase()}`}
                            style={{
                                background: 'transparent',
                                color: accent,
                                border: `1px dashed ${accent}`,
                                padding: '6px 10px',
                                fontSize: 10,
                                letterSpacing: 0.4,
                                cursor: 'pointer',
                                fontFamily: 'Archivo, sans-serif',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                            }}
                        >+{overflowCount} more</button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            borderTop: `1px solid ${t.theme === 'light' ? t.line : t.line}`,
            background: t.panel,
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            alignItems: 'start',
        }}>
            {renderGroup('Personas', personas, t.tealMid, true)}
            {renderGroup('Barriers', barriers, t.rust)}
            {renderGroup('Journeys', journeys, t.tealMid)}
            {renderGroup('Recommendations', recs, t.tealMid)}
        </div>
    );
};

// --- ROOT COMPONENT ---
const AnalystDeskKnowledgeGraph: React.FC<Props> = ({ graph, onNodeClick, height, minHeight, size, onSizeChange, excludedSources, setExcludedSources, theme = 'dark', activity }) => {
    const t = theme === 'light' ? LIGHT : DARK;
    useEffect(() => { ensureKeyframes(); }, []);
    const [selected, setSelected] = useState<KGNode | null>(null);
    const [pivotSource, setPivotSource] = useState<KGNode | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    // Phase 1-retrofit (2026-04-20) — WIKI ARTICLE BROWSER
    // When set, the WikiArticleViewer overlay renders on top of the desk
    // and fetches the body so the user can verify the AI has the full text.
    const [viewerWikiPath, setViewerWikiPath] = useState<string | null>(null);
    // Internal size state used only if the parent doesn't pass `size` — keeps
    // the toggle functional for standalone mounts while letting App.tsx take
    // authority over persistence when it wants to.
    const themeCountEarly = useMemo(() => graph.nodes.filter(n => n.type === 'theme').length, [graph]);
    const [internalSize, setInternalSize] = useState<DeskSize>(() => size || pickDefaultSize(themeCountEarly));
    const effectiveSize: DeskSize = size || internalSize;
    const sizeSetter = useCallback((s: DeskSize) => {
        if (onSizeChange) onSizeChange(s);
        else setInternalSize(s);
    }, [onSizeChange]);
    // Resolve effective height: explicit height prop wins (backward compat);
    // otherwise use the active size preset.
    const resolvedHeight = height != null
        ? (typeof height === 'number' ? `${height}px` : height)
        : SIZE_PRESETS[effectiveSize].height;
    const resolvedMinHeight = minHeight != null
        ? (typeof minHeight === 'number' ? `${minHeight}px` : minHeight)
        : SIZE_PRESETS[effectiveSize].minHeight;

    const activeStageKey: DeskStageKey | null = activity?.activeStage ? (STAGE_TO_DESK[activity.activeStage] || null) : null;
    const stageLabel = activity?.activeStage ? (STAGE_LABEL[activity.activeStage] || activity.activeStage) : '';
    const isRunning = !!activity?.isRunning || (activity?.activeStage && activity.activeStage !== 'IDLE');

    const themes = useMemo(() => graph.nodes.filter(n => n.type === 'theme'), [graph]);
    const personas = useMemo(() => graph.nodes.filter(n => n.type === 'persona'), [graph]);
    const sources = useMemo(() => graph.nodes.filter(n => n.type === 'source'), [graph]);
    const evidence = useMemo(() => graph.nodes.filter(n => n.type === 'evidence'), [graph]);
    const recs = useMemo(() => graph.nodes.filter(n => n.type === 'recommendation'), [graph]);
    const barriers = useMemo(() => graph.nodes.filter(n => n.type === 'gap'), [graph]);
    const journeys = useMemo(() => graph.nodes.filter(n => n.type === 'journey_stage'), [graph]);

    // Reset selection if the graph changes wholesale
    useEffect(() => {
        if (selected && !graph.nodes.find(n => n.id === selected.id)) {
            setSelected(null);
        }
        if (pivotSource && !graph.nodes.find(n => n.id === pivotSource.id)) {
            setPivotSource(null);
        }
    }, [graph, selected, pivotSource]);

    const handleSelect = (n: KGNode) => {
        setSelected(n);
        onNodeClick?.(n);
    };

    const highlighted = useMemo<Set<string> | null>(() => {
        if (!pivotSource) return null;
        // Find theme ids directly linked to pivotSource OR to evidence whose parentSourceId matches
        const ids = new Set<string>();
        const pivotEvidenceIds = new Set(
            evidence.filter(e => e.parentSourceId === pivotSource.id).map(e => e.id)
        );
        for (const e of graph.edges) {
            const srcId = edgeId(e, 'source');
            const tgtId = edgeId(e, 'target');
            const tgtNode = graph.nodes.find(n => n.id === tgtId);
            const srcNode = graph.nodes.find(n => n.id === srcId);
            if (srcNode?.type === 'theme' && (tgtId === pivotSource.id || pivotEvidenceIds.has(tgtId))) ids.add(srcNode.id);
            if (tgtNode?.type === 'theme' && (srcId === pivotSource.id || pivotEvidenceIds.has(srcId))) ids.add(tgtNode.id);
        }
        return ids;
    }, [pivotSource, graph, evidence]);

    const crumbs = selected ? buildBreadcrumbs(selected, graph) : [];

    return (
        <>
        <ThemeCtx.Provider value={t}>
        <ActivityCtx.Provider value={{ activeStageKey, isRunning: !!isRunning }}>
        <div
            style={{
                width: '100%',
                height: resolvedHeight,
                minHeight: resolvedMinHeight,
                background: t.bg,
                color: t.text,
                display: 'grid',
                // Rows: [inferring strip] breadcrumb, metrics, [composition], treemap+detail, linkage
                // The composition row (X.1) is `auto` — collapses to 0 when no evidence yet.
                gridTemplateRows: isRunning ? 'auto auto auto auto 1fr auto' : 'auto auto auto 1fr auto',
                fontFamily: 'Archivo, sans-serif',
                border: `1px solid ${t.line}`,
                overflow: 'hidden',
                // S3.5 collision guard: contain layout/size so treemap growth
                // can't push sibling content. The parent wrapper (App.tsx) still
                // sizes the card; this just ensures internal overflow stays
                // inside this box.
                contain: 'layout size',
            }}
        >
            {/* Row 0 — pipeline status strip (only when running) */}
            {isRunning && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '8px 16px',
                    borderBottom: `1px solid ${t.line}`,
                    background: t.theme === 'light' ? t.panelAlt : '#0F0F0F',
                    fontFamily: 'Archivo, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* animated stripe along bottom edge */}
                    <div style={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
                        background: `repeating-linear-gradient(90deg, ${t.lime} 0 12px, transparent 12px 24px)`,
                        animation: 'ad-stripe 0.8s linear infinite',
                        opacity: 0.85,
                    }} />
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
                        color: t.lime,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.lime, animation: 'ad-dot-blink 1s ease-in-out infinite', flexShrink: 0 }} />
                        Inferring
                    </span>
                    <span style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 16,
                        letterSpacing: 1.5,
                        color: t.text,
                        textTransform: 'uppercase',
                    }}>{stageLabel || 'Pipeline active'}</span>
                    {activity?.currentStatus && (
                        <span style={{ fontSize: 10, color: t.muted, letterSpacing: 0.5, minWidth: 0, flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activity.currentStatus}
                        </span>
                    )}
                    {activity?.lastEvent && (
                        <span style={{
                            marginLeft: 'auto',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10, color: t.muted, letterSpacing: 0.2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: '45%',
                        }}>
                            › {activity.lastEvent}
                        </span>
                    )}
                </div>
            )}

            {/* Row 1 — breadcrumb */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 22px',
                borderBottom: `1px solid ${t.theme === 'light' ? t.line : t.line}`,
                minHeight: 48,
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: t.muted,
                background: t.panel,
            }}>
                <span style={{ color: t.theme === 'light' ? t.text : t.lime, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 2, marginRight: 14 }}>Analyst Desk</span>
                {crumbs.length === 0 && <span style={{ color: t.muted }}>Select a theme or source to begin</span>}
                {crumbs.map((c, i) => (
                    <React.Fragment key={c.id}>
                        {i > 0 && <span style={{ color: t.muted }}>›</span>}
                        <button
                            type="button"
                            onClick={() => handleSelect(c)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: i === crumbs.length - 1 ? (t.theme === 'light' ? t.text : t.lime) : t.text,
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: 11,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                fontWeight: i === crumbs.length - 1 ? 700 : 400,
                                fontFamily: 'Archivo, sans-serif',
                                borderBottom: i === crumbs.length - 1 ? `1px solid ${t.theme === 'light' ? t.lime : t.lime}` : 'none',
                            }}
                        >{shortLabel(c.label, 32)}</button>
                    </React.Fragment>
                ))}
                {pivotSource && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: t.theme === 'light' ? t.text : t.lime, fontWeight: 700 }}>Pivot: {shortLabel(pivotSource.label, 28)}</span>
                        <button type="button" onClick={() => setPivotSource(null)} style={{ background: 'none', border: `1px solid ${t.line}`, color: t.text, padding: '4px 8px', cursor: 'pointer', fontSize: 10, letterSpacing: 1, fontFamily: 'Archivo, sans-serif' }}>clear</button>
                    </span>
                )}
                {/* SNUG/TALL/FULL moved to the parent VIEW popover — keeping
                    only the breadcrumb + pivot indicator in this row eliminates
                    the 3-pill-cluster that collided with the right-edge
                    flyout rail. sizeSetter still called from props when the
                    parent passes `onSizeChange`. */}
            </div>

            {/* Row 2 — metric tiles. S3.6: grid auto-fits so SNUG mode can
                break to two rows without CSS changes; tiles downsize via
                their own internal breakpoint. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: effectiveSize === 'snug'
                    ? 'repeat(auto-fit, minmax(112px, 1fr))'
                    : 'repeat(auto-fit, minmax(136px, 1fr))',
                gap: 1,
                background: t.theme === 'light' ? t.line : t.line,
                padding: '1px 0',
            }}>
                <MetricTile label="Themes" count={themes.length} accent={t.lime} active={typeFilter === 'theme'} inferring={activeStageKey === 'themes'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'theme' ? null : 'theme')} />
                <MetricTile label="Personas" count={personas.length} accent={t.tealMid} active={typeFilter === 'persona'} inferring={activeStageKey === 'personas'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'persona' ? null : 'persona')} />
                <MetricTile label="Sources" count={sources.length} accent={t.text} active={typeFilter === 'source'} inferring={activeStageKey === 'sources'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'source' ? null : 'source')} />
                <MetricTile label="Evidence" count={evidence.length} accent={t.muted} inferring={activeStageKey === 'evidence'} compact={effectiveSize === 'snug'} />
                <MetricTile label="Recs" count={recs.length} accent={t.tealMid} active={typeFilter === 'recommendation'} inferring={activeStageKey === 'recs'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'recommendation' ? null : 'recommendation')} />
                <MetricTile label="Barriers" count={barriers.length} accent={t.rust} active={typeFilter === 'gap'} inferring={activeStageKey === 'barriers'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'gap' ? null : 'gap')} />
                <MetricTile label="Journeys" count={journeys.length} accent={t.tealMid} active={typeFilter === 'journey_stage'} inferring={activeStageKey === 'journeys'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'journey_stage' ? null : 'journey_stage')} />
            </div>

            {/* CORPUS COMPOSITION BAR (X.1) — shows extraction depth distribution
                so the operator can see at a glance what the wiki archive holds.
                Counts drive confidence: "47 full-text + 12 PDFs + 5 transcripts"
                reads very differently from "188 headlines". Only renders when
                there's actual evidence in the graph. */}
            {evidence.length > 0 && <CorpusCompositionBar evidence={evidence} />}

            {/* Row 3 — treemap + detail panel */}
            <div style={{
                display: 'grid',
                // S3.7: dense treemaps (many themes) get more horizontal space so
                // tiles stay legible. Sparse treemaps give the detail panel more room.
                gridTemplateColumns: themes.length > 15
                    ? 'minmax(0, 2.4fr) minmax(320px, 0.9fr)'
                    : themes.length < 6
                        ? 'minmax(0, 1.4fr) minmax(360px, 1fr)'
                        : 'minmax(0, 1.8fr) minmax(360px, 0.9fr)',
                minHeight: 0,
            }}>
                <div style={{ position: 'relative', minHeight: 0, background: t.bg, overflow: 'hidden' }}>
                    {typeFilter && typeFilter !== 'theme' ? (
                        <FilteredList
                            nodes={graph.nodes.filter(n => n.type === typeFilter)}
                            onSelect={handleSelect}
                            selectedId={selected?.id || null}
                        />
                    ) : (
                        <ThemeTreemap
                            themes={themes}
                            highlighted={highlighted}
                            selectedId={selected?.type === 'theme' ? selected.id : null}
                            onSelect={handleSelect}
                        />
                    )}
                </div>
                <DetailPanel
                    node={selected}
                    graph={graph}
                    excludedSources={excludedSources}
                    setExcludedSources={setExcludedSources}
                    onSelectNode={handleSelect}
                    onPivotSource={setPivotSource}
                    pivotSource={pivotSource}
                    onOpenArchive={setViewerWikiPath}
                />
            </div>

            {/* Row 4 — linkage strip */}
            <LinkageStrip
                selected={selected}
                graph={graph}
                personas={personas}
                barriers={barriers}
                recs={recs}
                journeys={journeys}
                onSelect={handleSelect}
            />
        </div>
        </ActivityCtx.Provider>
        </ThemeCtx.Provider>
        {/* Wiki article viewer overlay — opened by the ⌘ READ ARCHIVED button
            on any archived evidence node. Lives at the top level so its
            fixed-position overlay escapes the desk's stacking context. */}
        <WikiArticleViewer
            wikiPath={viewerWikiPath}
            onClose={() => setViewerWikiPath(null)}
        />
        </>
    );
};

const FilteredListEmpty: React.FC = () => {
    const t = useTokens();
    const { isRunning } = useActivity();
    return (
        <div style={{
            gridColumn: '1 / -1', padding: 40, textAlign: 'center',
            color: t.muted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
            {isRunning
                ? <>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.lime, animation: 'ad-dot-blink 1s ease-in-out infinite' }} />
                    <span>Inferring — results will appear here</span>
                </>
                : <span>No entries yet — run a deliverable via Chat to Data</span>
            }
        </div>
    );
};

const FilteredList: React.FC<{ nodes: KGNode[]; onSelect: (n: KGNode) => void; selectedId: string | null }> = ({ nodes, onSelect, selectedId }) => {
    const t = useTokens();
    const selectedInk = t.theme === 'light' ? '#FFFFFF' : t.bg;
    return (
        <div style={{
            width: '100%', height: '100%', overflow: 'auto',
            padding: 12, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 8,
            background: t.bg,
        }}>
            {nodes.map(n => {
                const accent = nodeAccent(n, t);
                const isSelected = selectedId === n.id;
                return (
                    <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelect(n)}
                        style={{
                            background: isSelected ? (t.theme === 'light' ? t.tileSel : accent) : t.panel,
                            color: isSelected ? (t.theme === 'light' ? t.tileSelInk : t.bg) : t.text,
                            border: `1px solid ${isSelected ? (t.theme === 'light' ? t.tileSel : accent) : (t.theme === 'light' ? t.hairline : t.line)}`,
                            borderLeft: `3px solid ${accent}`,
                            padding: '10px 12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: 4,
                            fontFamily: 'Archivo, sans-serif',
                        }}
                    >
                        {n.type === 'persona' && (
                            <div style={{ marginBottom: 4 }}>
                                <PersonaPortrait node={n} size={40} />
                            </div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{shortLabel(n.label, 60)}</div>
                        {n.metadata?.role && <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isSelected ? selectedInk : t.muted }}>{shortLabel(n.metadata.role, 40)}</div>}
                        {n.tier && <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: isSelected ? selectedInk : t.muted }}>T{n.tier}{n.metadata?.itemCount ? ` · ${n.metadata.itemCount} items` : ''}</div>}
                    </button>
                );
            })}
            {nodes.length === 0 && (<FilteredListEmpty />)}
        </div>
    );
};

export default AnalystDeskKnowledgeGraph;
