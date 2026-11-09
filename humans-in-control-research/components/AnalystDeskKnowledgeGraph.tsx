/**
 * Analyst Desk Knowledge Graph - Option 1 redesign
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
 * Persona portrait graphics are retained - they render as clipped rounded
 * rectangles in the linkage strip and in the detail panel persona section.
 *
 * Reverse-pivot: clicking a source chip in the detail panel rewires the
 * treemap to highlight which themes that source contributes to.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cachedOnlyMode } from '../services/runState';
import type { KGNode, KnowledgeGraph } from '../services/knowledgeGraphBuilder';
import WikiArticleViewer from './WikiArticleViewer';
import TopicModelingPanel from './TopicModelingPanel';
import { ResearchBrowser } from './ResearchBrowser';
import { ThemeDeepDiveModal } from './ThemeDeepDiveModal';
import { useSemanticSearch } from '../services/semanticUiSearch';

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
    snug: { height: 'min(72vh, 860px)', minHeight: '560px', label: 'SNUG', tooltip: 'Compact - fits alongside tile grid' },
    tall: { height: 'min(115vh, 1500px)', minHeight: '820px', label: 'TALL', tooltip: 'Expanded - prioritizes treemap readability' },
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
    currentStatus?: string;     // short status line, e.g. "Gemini 3.1 Pro · 342 chunks"
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
    /** Preferred adaptive size - overrides height/minHeight when provided.
     *  'snug' fits alongside other content; 'tall' prioritizes treemap
     *  readability; 'full' uses 100dvh (viewport-fill). */
    size?: DeskSize;
    /** Optional setter so the desk can self-cycle size via the toggle pill. */
    onSizeChange?: (s: DeskSize) => void;
    excludedSources?: Set<string>;
    setExcludedSources?: React.Dispatch<React.SetStateAction<Set<string>>>;
    theme?: DeskTheme;
    activity?: PipelineActivity;
    // 2026-05-10 (HiC-Reddit-Deep Phase 2) - Drives the Topic Modeling tab.
    // When `redditDeepItems` has 10+ entries, the tab strip appears at the
    // top of the desk. `topicModelResult` is the precomputed TopicResult
    // from the parent's background job; `topicModelStatus` lets the panel
    // show a progress indicator while the job is still running.
    redditDeepItems?: any[];
    topicModelResult?: any;
    topicModelStatus?: { jobId?: string; status: 'idle' | 'running' | 'completed' | 'failed'; message?: string };
    /** 2026-05-11 - Callback to bubble panel-computed topic results up to
     *  App.tsx state so they survive tab switches. Without this, switching
     *  Knowledge Graph ↔ Topic Modeling forces a fresh compute every time. */
    onTopicModelResult?: (result: any) => void;
    researchGoal?: string;
    // 2026-06-06 - Research Browser (unified Themes + Topics surface).
    // App.tsx passes themes + topics + engagement slug + the wiki/chat
    // bridge callbacks. The Browser sits as a third tab next to KG +
    // legacy Topics; sharing filter state with the treemap via
    // researchBrowserState.
    themesData?: any;          // themesResult.themes
    engagementSlug?: string;
    onOpenWiki?: (wikiPath: string, chunkPointer?: string) => void;
    onPrefillChat?: (chunkPointers: string[], titleHint: string) => void;
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
    return s.length > n ? s.slice(0, n - 1) + '...' : s;
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
            }}>{count === 0 && inferring ? '...' : count}</span>
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
 * CorpusCompositionBar (X.1) - horizontal strip above the treemap showing
 * the extraction-depth distribution of the current evidence pool. Turns
 * Phase 1.6's per-node `extractionDepth` classifications into an operator
 * dashboard: "5  · 12  · 47  · 188  · 9 ⌘" tells you instantly
 * whether your corpus has teeth or is RSS-blurb shallow.
 *
 * Also renders a thin proportional stacked bar underneath the counts so the
 * RATIO of deep → shallow is visible without math. Pure presentational -
 * no network, no state.
 */
/**
 * P4 (2026-06-06) - MANIFEST HEALTH PILL.
 *
 * Surfaces the cached-corpus footprint the user is querying against, so
 * they can see at a glance what's in scope BEFORE generating. Reads:
 *   - GLOBAL CATALOG: /api/manifest/chunks (total addressable wiki chunks)
 *   - KL SELECTION: /api/user-selection/active (items the user curated)
 *   - MODE: window.__hicCachedOnlyMode (cached-only run flag set by App.tsx)
 *
 * Polls every 15s so a fresh ingest or KL change reflects without reload.
 * Best-effort: missing endpoints yield "-" placeholders, never errors.
 */
const ManifestHealthPill: React.FC<{ theme: ReturnType<typeof useTokens> }> = ({ theme: t }) => {
    const [stats, setStats] = useState<{ chunks: number; sources: number; klItems: number; cachedOnly: boolean }>({
        chunks: 0, sources: 0, klItems: 0, cachedOnly: false,
    });
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const c = await fetch('http://127.0.0.1:5012/api/manifest/chunks?engagement=&types=social-post,article,upload,transcript,synthesis');
                const sel = await fetch('http://127.0.0.1:5012/api/user-selection/active');
                if (cancelled) return;
                let chunks = 0, sources = 0, klItems = 0;
                if (c.ok) {
                    const cd = await c.json();
                    chunks = cd.chunk_id_count || 0;
                    sources = cd.source_count || 0;
                }
                if (sel.ok) {
                    const sd = await sel.json();
                    if (sd && !sd._uncommitted) {
                        klItems = (sd.theme_cluster_ids?.length || 0)
                            + (sd.article_sources?.length || 0)
                            + (sd.social_subreddits?.length || 0)
                            + (sd.engagement_slugs?.length || 0)
                            + (sd.source_archive_paths?.length || 0);
                    }
                }
                const cachedOnly = cachedOnlyMode();
                setStats({ chunks, sources, klItems, cachedOnly });
            } catch { /* silent */ }
        };
        void load();
        const interval = setInterval(load, 15_000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);
    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
    const pill = (label: string, value: string, accent?: string): React.ReactElement => (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: 0.5, padding: '4px 10px',
            background: t.theme === 'light' ? '#F7F7F2' : '#1A1A1A',
            border: `1px solid ${t.line}`, borderRadius: 2,
            color: t.muted,
        }}>
            <span style={{ color: t.muted, textTransform: 'uppercase' }}>{label}</span>
            <span style={{ color: accent || t.text, fontWeight: 600 }}>{value}</span>
        </span>
    );
    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            padding: '8px 12px', borderBottom: `1px solid ${t.line}`,
            background: t.theme === 'light' ? t.panelAlt : '#0F0F0F',
            flexShrink: 0,
        }}>
            {pill('Catalog', `${fmt(stats.chunks)} chunks`, t.lime)}
            {pill('Sources', fmt(stats.sources), t.tealMid)}
            {pill('KL', `${stats.klItems} items`, stats.klItems > 0 ? t.lime : t.muted)}
            {pill('Mode', stats.cachedOnly ? 'cached-only' : 'fresh+cached', stats.cachedOnly ? t.lime : t.rust)}
        </div>
    );
};

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

    // Palette per depth - deep extractions use tokens' accent colors, shallow use muted.
    const deepColor = t.theme === 'light' ? t.text : t.lime;
    const depths: Array<{ key: keyof typeof counts; glyph: string; label: string; color: string; strong: boolean }> = [
        // 2026-06-08 - Emoji removed (forbidden). Labels stand alone; the bullet is ASCII-safe.
        { key: 'transcript',    glyph: '', label: 'TRANSCRIPTS', color: deepColor,   strong: true },
        { key: 'pdf_extracted', glyph: '', label: 'PDFs',         color: deepColor,   strong: true },
        { key: 'full_text',     glyph: '', label: 'FULL-TEXT',    color: deepColor,   strong: true },
        { key: 'dataset',       glyph: '', label: 'DATASETS',     color: t.tealMid,   strong: true },
        { key: 'snippet',       glyph: '', label: 'SNIPPETS',     color: t.muted,     strong: false },
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: t.tealMid, letterSpacing: 1 }} title="Persisted to wiki archive - reusable across engagements">
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

// 2026-06-03 - Treemap weight = RELEVANCE to the research topic, NOT evidence
// density. Per the user: a theme already IS recurring evidence for a topic, so
// tile area should convey how central the theme is to the objective, not how
// many evidence nodes happen to link to it. Prefer the model's self-scored
// goalAlignment (0-100); fall back to relevanceScore (normalize >1 as a 0-100
// scale); default mid (0.6) so legacy nodes without either field don't
// collapse to slivers. (Evidence counts still live in the detail modal.)
function _treemapWeight(t: KGNode): number {
    const alignment = (t as any)?.metadata?.goalAlignment;
    if (typeof alignment === 'number') return Math.max(0.1, Math.max(0, Math.min(100, alignment)) / 100);
    const rs = t.relevanceScore;
    if (typeof rs === 'number') return Math.max(0.1, rs > 1 ? Math.min(100, rs) / 100 : Math.max(0, Math.min(1, rs)));
    return 0.6;
}

// 2026-06-02 - READABLE-TILE GUARANTEE. The user requirement: "no empty boxes,
// only tiles with theme headers, each large enough to read the title." Two fixes:
//   (1) CAP the number of tiles to what fits at a readable minimum size given the
//       available area (maxTiles = area / MIN_READABLE_TILE_AREA). Themes beyond
//       the cap collapse into ONE labeled "+N MORE" overflow tile - never a blank.
//   (2) COMPRESS the weight dynamic range (sqrt) for LAYOUT only, so a 2-evidence
//       theme still gets a readable area next to a 160-evidence theme. The true
//       weight is kept on the tile for color/emphasis and the sort order (most
//       important lands top-left) still conveys importance.
// With the wall-to-wall + tall desk, the area is large enough that all ~30-40
// themes render as readable, titled tiles.
const MIN_READABLE_TILE_AREA = 8200;  // ~128w x 64h - smallest tile that fits a title
const OVERFLOW_ID = '__treemap_overflow__';

function _maxReadableTiles(width: number, height: number): number {
    const area = Math.max(0, width) * Math.max(0, height);
    if (area <= 0) return 6;
    return Math.max(6, Math.floor(area / MIN_READABLE_TILE_AREA));
}

function computeTreemap(themes: KGNode[], width: number, height: number): TreemapTile[] {
    if (!themes.length || width <= 0 || height <= 0) return [];

    // Cap to readable count; collapse the remainder into a single labeled overflow
    // node so no theme is rendered as an unreadable, unlabeled sliver.
    const sortedAll = [...themes].sort((a, b) => _treemapWeight(b) - _treemapWeight(a));
    const maxTiles = _maxReadableTiles(width, height);
    let display: KGNode[] = sortedAll;
    let overflow: KGNode | null = null;
    if (sortedAll.length > maxTiles) {
        display = sortedAll.slice(0, maxTiles - 1);
        const rest = sortedAll.slice(maxTiles - 1);
        const restWeight = rest.reduce((s, t) => s + _treemapWeight(t), 0);
        overflow = {
            id: OVERFLOW_ID,
            label: `+${rest.length} more themes`,
            type: 'theme',
            evidenceCount: Math.round(restWeight),
            metadata: { goalAlignment: 45, _overflowCount: rest.length },
        } as any;
        display = [...display, overflow];
    }

    // Layout value: sqrt-compressed weight so low-weight tiles still get a
    // readable area. Floor keeps the smallest tile above the readable minimum.
    const layoutValue = (t: KGNode): number =>
        t.id === OVERFLOW_ID ? Math.sqrt(Math.max(1, _treemapWeight(t)))
                             : Math.max(1.0, Math.sqrt(_treemapWeight(t)));

    if (typeof d3 === 'undefined') {
        const cols = Math.ceil(Math.sqrt(display.length));
        const rows = Math.ceil(display.length / cols);
        const tw = width / cols;
        const th = height / rows;
        return display.map((t, i) => ({
            node: t,
            x: (i % cols) * tw,
            y: Math.floor(i / cols) * th,
            w: tw - 2,
            h: th - 2,
            weight: _treemapWeight(t),
        }));
    }
    const root = d3.hierarchy({ children: display.map(t => ({ node: t, value: layoutValue(t) })) })
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
        weight: _treemapWeight(leaf.data.node),
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

    // 2026-06-03 FIX - floor the dims so a transient 0-measurement (before the
    // ResizeObserver settles, or a momentarily-collapsed flex row) cannot make
    // computeTreemap return [] and blank the themes pane.
    const tiles = useMemo(() => computeTreemap(themes, dims.w || 640, dims.h || 420), [themes, dims.w, dims.h]);

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
                // 2026-06-03 - Evidence-density signals (concentration / thin)
                // are NOT shown on THEME tiles anymore: tile area now conveys
                // relevance, and the textual badges ate the title's real estate.
                // Sources keep their density tint + count footer. Detail modal
                // carries the full evidence breakdown for themes.
                const isTheme = n.type === 'theme';
                const conc = isTheme ? 0 : (n.sourceConcentration || 0);
                const thin = isTheme ? false : !!n.isThinTheme;
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
                const isOverflow = n.id === OVERFLOW_ID;
                // computeTreemap caps tiles to a readable minimum size, so EVERY
                // rendered tile shows its title (no blank boxes). The low guard
                // only catches degenerate 0-dimension cases during resize.
                const showLabel = tile.w > 36 && tile.h > 18;
                // Theme tiles no longer carry a count footer (relevance is the
                // size; evidence lives in the modal) - so the title claims the
                // whole tile. Sources still show their item-count footer.
                const showCount = !isOverflow && !isTheme && tile.w > 80 && tile.h > 50;
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
                        onClick={() => { if (!isOverflow) onSelect(n); }}
                        title={isOverflow
                            ? `${(n.metadata as any)?._overflowCount || 0} additional themes not shown, widen or expand the desk to see them`
                            : isTheme
                                ? `${n.label}${typeof (n.metadata as any)?.goalAlignment === 'number' ? ` · ${Math.round((n.metadata as any).goalAlignment)}/100 relevance` : ''} · click for sources`
                                : `${n.label} · ${n.evidenceCount || 0} evidence${n.dominantSource ? ` · ${n.dominantSource}` : ''}`}
                        style={{
                            position: 'absolute',
                            left: tile.x, top: tile.y,
                            width: tile.w, height: tile.h,
                            background: bg,
                            color: fg,
                            border: `${borderWidth}px solid ${borderColor}`,
                            padding: '8px 10px',
                            display: 'flex', flexDirection: 'column', justifyContent: isOverflow ? 'center' : 'space-between',
                            alignItems: isOverflow ? 'center' : 'stretch',
                            cursor: isOverflow ? 'default' : 'pointer',
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
                                {/* 2026-05-11 - Sources show item count + mean relevance;
                                    themes keep the "N evidence" label they always had. */}
                                {n.type === 'source' ? (
                                    <span>
                                        {(n.metadata as any)?.itemCount || 0} items
                                        {typeof (n.metadata as any)?.meanRelevance === 'number'
                                            ? ` · ${(n.metadata as any).meanRelevance}% rel`
                                            : ''}
                                    </span>
                                ) : (
                                    <span>{n.evidenceCount || 0} evidence</span>
                                )}
                                {conc >= 0.7 && <span style={{ color: isSelected ? t.tileSelInk : t.rust, fontWeight: 700 }}> concentration</span>}
                                {thin && conc < 0.7 && <span style={{ fontStyle: 'italic' }}>thin</span>}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

// 2026-06-03 - Resolve a source/evidence reference to a SAFE open target.
// BUG: clicking a source link bounced the user to the landing page. Cause:
// Crossref items carry a BARE DOI ("10.21061/jcte...") with no scheme, and
// other items carry relative paths. Rendered as <a href="10.21061/...">, the
// browser resolved them against localhost:5011, the SPA router caught the
// unknown path, and reset to the landing view. This returns an absolute
// external URL (prefixing bare DOIs), an archived-wiki target (opens the
// stored article in-app), or null (render as plain text - never a bad href).
export function resolveSourceTarget(o: { url?: string; wikiPath?: string }): { kind: 'external' | 'archive'; href: string } | null {
    const url = (o.url || '').trim();
    const wikiPath = (o.wikiPath || '').trim();
    if (/^https?:\/\//i.test(url)) return { kind: 'external', href: url };
    if (/^doi:/i.test(url)) return { kind: 'external', href: `https://doi.org/${url.replace(/^doi:/i, '')}` };
    if (/^10\.\d{4,}\/\S+$/.test(url)) return { kind: 'external', href: `https://doi.org/${url}` }; // bare DOI
    if (/^www\./i.test(url)) return { kind: 'external', href: `https://${url}` };
    if (wikiPath) return { kind: 'archive', href: wikiPath };           // stored wiki article
    if (url && /\.md$/i.test(url)) return { kind: 'archive', href: url }; // relative wiki path
    return null; // unknown/garbage - do NOT emit an href that the SPA router would catch
}

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
    // evidence beyond #24 even when a theme had 80+ supporting passages -
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

            {/* Goal-alignment badge - surfaces how directly this theme answers the
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

            {/* Sub-themes - distinct mechanisms inside the umbrella theme */}
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

            {/* Organizing dimensions - analytical axes that explain how the theme varies */}
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

            {/* Contradictions - conflicting evidence the corpus contains */}
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

            {/* Temporal arc - how this theme has evolved over time */}
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

            {/* Implications - consultant-grade verbs to act on */}
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

            {/* Evidence list (paginated - see EVIDENCE_INITIAL_PAGE above) */}
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
                                        {(() => {
                                            const tgt = resolveSourceTarget(ev);
                                            const lbl = shortLabel(ev.label, 130);
                                            const linkStyle = { color: t.text, fontSize: 13, fontWeight: 600, textDecoration: 'none', lineHeight: 1.4, borderBottom: `1px dotted ${t.muted}` } as React.CSSProperties;
                                            if (tgt?.kind === 'external') {
                                                return <a href={tgt.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{lbl} ↗</a>;
                                            }
                                            if (tgt?.kind === 'archive') {
                                                return <button type="button" onClick={(e) => { e.stopPropagation(); onOpenArchive?.(tgt.href); }} style={{ ...linkStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>{lbl} ⌘</button>;
                                            }
                                            return <span style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{lbl}</span>;
                                        })()}
                                    </div>
                                    {quote && (
                                        <div style={{
                                            marginTop: 6,
                                            fontSize: 12,
                                            lineHeight: 1.55,
                                            color: t.muted,
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}>
                                            {/* 2026-06-03 - the detail view is now a wide modal, so
                                                show a far longer source excerpt (was 260 chars) to give
                                                "more detail from the source materials" the user asked for. */}
                                            {shortLabel(quote, 700)}
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
                                        {/* Extraction depth badge - makes it visibly evident when
                                            evidence is a full-text article, PDF, or transcript vs a
                                            headline blurb. Phase 1.6 surfaces the classification the
                                            orchestrator wrote onto the evidence node. */}
                                        {ev.extractionDepth && (() => {
                                            const depth = ev.extractionDepth;
                                            const glyph = depth === 'transcript' ? '' : depth === 'pdf_extracted' ? '' : depth === 'full_text' ? '' : depth === 'dataset' ? '' : depth === 'snippet' ? '' : '•';
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
                    {/* Expand / collapse - surfaces evidence beyond the
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

            {/* Source chips - drive reverse-pivot */}
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
                            Treemap pivoted - highlighting themes this source drives.
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

            {/* Primary link when the node resolves to a real source target.
                Routes bare DOIs / relative wiki paths correctly instead of
                bouncing to the landing page. */}
            {(() => {
                const tgt = resolveSourceTarget(node);
                if (!tgt) return null;
                const baseStyle = { color: t.lime, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', borderBottom: `1px solid ${t.lime}`, paddingBottom: 2 } as React.CSSProperties;
                return (
                    <div style={{ padding: '12px 18px', borderTop: `1px solid ${divider}` }}>
                        {tgt.kind === 'external'
                            ? <a href={tgt.href} target="_blank" rel="noopener noreferrer" style={baseStyle}>Open source ↗</a>
                            : <button type="button" onClick={() => onOpenArchive?.(tgt.href)} style={{ ...baseStyle, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 2px 0', fontFamily: 'inherit' }}>Open archived source ⌘</button>}
                    </div>
                );
            })()}
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
const AnalystDeskKnowledgeGraph: React.FC<Props> = ({ graph, onNodeClick, height, minHeight, size, onSizeChange, excludedSources, setExcludedSources, theme = 'dark', activity, redditDeepItems = [], topicModelResult, topicModelStatus, researchGoal = '', onTopicModelResult, themesData, engagementSlug, onOpenWiki, onPrefillChat }) => {
    // 2026-06-08 - UNIFIED ANALYST DESK. Per owner directive, the desk is now a
    // SINGLE surface: the Research Browser (themes + topic-modeled topics merged,
    // relevance-ranked, keyword-searchable). The separate KNOWLEDGE GRAPH and
    // TOPIC MODELING tabs are retired (the tab strip is hidden below). The
    // topic-model job still runs upstream (App.tsx) and its result flows into the
    // Browser's merged frame - we just don't expose it as its own destination.
    // Default tab is 'browser'; 'kg'/'topics' code stays in place (dead-but-reversible).
    const [activeTab, setActiveTab] = useState<'kg' | 'topics' | 'browser'>('browser');
    // 2026-06-08 - Theme deep-dive modal (replaces the KG detail panel's role for
    // the unified Research Browser): clicking a theme's inspect opens full depth +
    // evidence with working source link-backs.
    const [inspectItem, setInspectItem] = useState<any | null>(null);
    const showTopicTab = (redditDeepItems?.length || 0) >= 10 || !!topicModelResult;
    const t = theme === 'light' ? LIGHT : DARK;
    useEffect(() => { ensureKeyframes(); }, []);
    const [selected, setSelected] = useState<KGNode | null>(null);
    const [pivotSource, setPivotSource] = useState<KGNode | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    // Phase 1-retrofit (2026-04-20) - WIKI ARTICLE BROWSER
    // When set, the WikiArticleViewer overlay renders on top of the desk
    // and fetches the body so the user can verify the AI has the full text.
    const [viewerWikiPath, setViewerWikiPath] = useState<string | null>(null);
    // Internal size state used only if the parent doesn't pass `size` - keeps
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

    // 2026-05-19 - Themes are partitioned by goalAlignment so off-topic
    // themes cannot dominate the headline tile. The threshold (60) matches
    // the goalAlignment rubric in geminiService.ts - 60 = "essential context
    // but not the headline", 40 = "adjacent / triangulation".
    //
    // 2026-05-19b - CRITICAL FIX: the original logic emptied the main pane
    // entirely when ALL themes scored < 60 (observed in the wild: 19 themes
    // generated, every one scored < 60, headline pane showed 0 themes).
    // New behavior:
    //   • If at least 1 theme scores >= 60: split (>=60 main, <60 adjacent)
    //   • If ZERO themes score >= 60: show ALL themes in main pane, sorted
    //     by goalAlignment desc, and surface a banner warning the user that
    //     no theme cleared the alignment floor (= corpus alignment is weak).
    // The display layer must NEVER hide all themes. A weak-alignment corpus
    // is a problem the user must SEE, not a reason to render blank.
    const GOAL_ALIGNMENT_FLOOR = 60;
    const _allThemes = useMemo(() => graph.nodes.filter(n => n.type === 'theme'), [graph]);
    const _themeAlignment = (n: KGNode): number => {
        const v = (n as any)?.metadata?.goalAlignment;
        // Missing alignment is treated as "ungated" (100) - never hide
        // legacy themes that pre-date the field.
        return typeof v === 'number' ? v : 100;
    };
    const _aboveFloor = useMemo(
        () => _allThemes.filter(n => _themeAlignment(n) >= GOAL_ALIGNMENT_FLOOR),
        [_allThemes]
    );
    const _weakAlignmentFallback = _allThemes.length > 0 && _aboveFloor.length === 0;
    // 2026-05-20 - Semantic cross-type search via /api/embed. Single input
    // that ranks every node category by cosine similarity to the user's query
    // (Gemini gemini-embedding-001, debounced 300ms). Typing "co-op problems"
    // surfaces themes about internship friction, sources about experiential
    // learning gripes, etc. - anything semantically close, not just literal
    // matches. Substring matches still rank highest (proper-noun safety).
    const [searchQuery, setSearchQuery] = useState('');
    const _nodeSearchText = (n: KGNode): string => {
        const meta = (n as any).metadata || {};
        return [
            n.label,
            (n as any).name,
            (n as any).description,
            (n as any).quote,
            (n as any).source,
            (n as any).sourceName,
            (n as any).title,
            meta.evidenceText,
            meta.summary,
            Array.isArray((n as any).tags) ? ((n as any).tags as any[]).join(' ') : '',
            Array.isArray((n as any).citations) ? ((n as any).citations as any[]).map((c: any) => `${c?.sourceName || ''} ${c?.text || ''}`).join(' ') : '',
        ].filter(Boolean).join(' - ').slice(0, 1500);
    };
    const _nodeId = (n: KGNode): string => `kg_${n.type}_${n.id}`;

    // Run semantic search once over ALL nodes, then partition by type.
    // Single embedding round-trip covers every panel.
    const _allFilterableNodes = useMemo(() => graph.nodes, [graph]);
    // 2026-05-20 - Defaults: minSimilarity 0.55 (was 0.30, too loose for
    // Gemini gemini-embedding-001 baseline). Cap to top 60 across panels.
    // Fallback top-5 keeps the UI from going blank when nothing crosses
    // the floor - UI labels those as weak matches.
    const semantic = useSemanticSearch<KGNode>(
        _allFilterableNodes,
        _nodeId,
        _nodeSearchText,
        searchQuery,
        { minSimilarity: 0.55, topN: 60, fallbackTopN: 5 },
    );
    const _allowedNodeIds = useMemo<Set<string> | null>(() => {
        if (!searchQuery.trim()) return null;       // empty query → no filter
        return new Set(semantic.filtered.map(_nodeId));
    }, [searchQuery, semantic.filtered]);
    const _passesSearch = (n: KGNode): boolean => !_allowedNodeIds || _allowedNodeIds.has(_nodeId(n));

    const themes = useMemo(() => {
        const base = _weakAlignmentFallback
            ? [..._allThemes].sort((a, b) => _themeAlignment(b) - _themeAlignment(a))
            : _aboveFloor;
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [_allThemes, _aboveFloor, _weakAlignmentFallback, _allowedNodeIds]);
    const adjacentThemes = useMemo(() => {
        const base = _weakAlignmentFallback
            ? []
            : _allThemes
                .filter(n => _themeAlignment(n) < GOAL_ALIGNMENT_FLOOR)
                .sort((a, b) => _themeAlignment(b) - _themeAlignment(a));
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [_allThemes, _weakAlignmentFallback, _allowedNodeIds]);
    const [showAdjacent, setShowAdjacent] = useState(false);
    const personas = useMemo(() => {
        const base = graph.nodes.filter(n => n.type === 'persona');
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [graph, _allowedNodeIds]);
    const sources = useMemo(() => {
        const base = graph.nodes.filter(n => n.type === 'source');
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [graph, _allowedNodeIds]);
    const evidence = useMemo(() => {
        const base = graph.nodes.filter(n => n.type === 'evidence');
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [graph, _allowedNodeIds]);
    const recs = useMemo(() => {
        const base = graph.nodes.filter(n => n.type === 'recommendation');
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [graph, _allowedNodeIds]);
    const barriers = useMemo(() => {
        const base = graph.nodes.filter(n => n.type === 'gap');
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [graph, _allowedNodeIds]);
    const journeys = useMemo(() => {
        const base = graph.nodes.filter(n => n.type === 'journey_stage');
        return _allowedNodeIds ? base.filter(_passesSearch) : base;
    }, [graph, _allowedNodeIds]);

    const _searchTotalHits = _allowedNodeIds
        ? themes.length + personas.length + sources.length + evidence.length + recs.length + barriers.length + journeys.length
        : 0;

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

    // 2026-06-03 - Esc closes the detail modal.
    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected]);

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
        <div style={{
            width: '100%',
            height: resolvedHeight,
            minHeight: resolvedMinHeight,
            background: t.bg,
            color: t.text,
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${t.line}`,
            overflow: 'hidden',
            fontFamily: 'Archivo, sans-serif',
        }}>
        {/* 2026-05-11 - Research objective banner. Sits above the tab strip
            and the treemap, anchoring everything below it to what the user
            actually asked for. Truncates long goals to a single visible line
            with a hover-tooltip for the full text. Hidden when the goal
            isn't set (e.g., the desk is being used standalone). */}
        {researchGoal && researchGoal.trim() && (
            <div
                title={researchGoal}
                style={{
                    padding: '14px 20px',
                    borderBottom: `1px solid ${t.line}`,
                    background: t.theme === 'light' ? t.panelAlt : '#0F0F0F',
                    display: 'flex', alignItems: 'baseline', gap: 14,
                    flexShrink: 0,
                }}
            >
                <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 11, letterSpacing: 2.5,
                    color: t.muted,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                }}>
                    Research Objective
                </span>
                <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 17, letterSpacing: 0.5,
                    color: t.text,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    minWidth: 0,
                }}>
                    {researchGoal}
                </span>
            </div>
        )}
        {/* 2026-05-10 - Tab strip. 2026-06-06: third tab added - RESEARCH
            BROWSER (unified Themes + Topics surface). The strip now shows
            whenever there's either deep-Reddit data OR themes data to
            render in the Browser. */}
        {/* 2026-06-08 - Tab strip RETIRED. Unified single-surface Analyst Desk =
            Research Browser only. KG + Topic Modeling tabs removed per owner
            directive; their code remains below (unreached) for reversibility. */}
        {false && (
            <div style={{
                display: 'flex', gap: 0, borderBottom: `1px solid ${t.line}`,
                background: t.theme === 'light' ? t.panelAlt : '#0F0F0F',
                flexShrink: 0,
            }}>
                {([
                    { key: 'kg' as const, label: 'KNOWLEDGE GRAPH', count: undefined },
                    { key: 'browser' as const, label: 'RESEARCH BROWSER', count: ((themesData?.themes?.length || (Array.isArray(themesData) ? themesData.length : 0)) + (topicModelResult?.topic_count || 0)) || undefined },
                    { key: 'topics' as const, label: 'TOPIC MODELING', count: topicModelResult?.topic_count },
                ]).map(tab => {
                    const isActive = activeTab === tab.key;
                    const isLoading = tab.key === 'topics' && !topicModelResult && topicModelStatus?.status === 'running';
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '10px 18px',
                                background: isActive ? t.bg : 'transparent',
                                border: 'none',
                                borderBottom: isActive ? `2px solid ${t.lime}` : '2px solid transparent',
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 13, letterSpacing: 2,
                                color: isActive ? t.text : t.muted,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                                transition: 'border-color 140ms, color 140ms',
                            }}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 10, color: t.lime, letterSpacing: 0.5,
                                }}>{tab.count}</span>
                            )}
                            {isLoading && (
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: t.lime, animation: 'ad-dot-blink 1.2s ease-in-out infinite',
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>
        )}
        {/* When Topics or Browser tabs are active, render those and skip the grid. */}
        {activeTab === 'topics' ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <TopicModelingPanel
                    redditDeepItems={redditDeepItems}
                    researchGoal={researchGoal}
                    cachedResult={topicModelResult}
                    onResult={onTopicModelResult}
                    upstreamStatus={topicModelStatus}
                />
            </div>
        ) : activeTab === 'browser' ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <ResearchBrowser
                    themes={themesData?.themes || (Array.isArray(themesData) ? themesData : [])}
                    topics={[]}
                    engagementSlug={engagementSlug}
                    onOpenWiki={(wp, cp) => { onOpenWiki?.(wp, cp); }}
                    onOpenChat={(pointers, hint) => { onPrefillChat?.(pointers, hint); }}
                    onInspect={(it) => setInspectItem(it)}
                />
            </div>
        ) : (
        <div
            style={{
                width: '100%',
                flex: 1,
                minHeight: 0,
                background: t.bg,
                color: t.text,
                display: 'grid',
                // Rows: [inferring strip] breadcrumb, metrics, [composition], treemap+detail, linkage
                // The composition row (X.1) is `auto` - collapses to 0 when no evidence yet.
                gridTemplateRows: isRunning ? 'auto auto auto auto 1fr auto' : 'auto auto auto 1fr auto',
                fontFamily: 'Archivo, sans-serif',
                overflow: 'hidden',
                // S3.5 collision guard: contain layout/size so treemap growth
                // can't push sibling content. The parent wrapper (App.tsx) still
                // sizes the card; this just ensures internal overflow stays
                // inside this box.
                contain: 'layout size',
            }}
        >
            {/* Row 0 - pipeline status strip (only when running) */}
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

            {/* Row 1 - breadcrumb */}
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
                {/* SNUG/TALL/FULL moved to the parent VIEW popover - keeping
                    only the breadcrumb + pivot indicator in this row eliminates
                    the 3-pill-cluster that collided with the right-edge
                    flyout rail. sizeSetter still called from props when the
                    parent passes `onSizeChange`. */}
            </div>

            {/* 2026-05-20 - Semantic search row. Filters every metric tile
                + every panel below by cosine similarity to the query (Gemini
                embeddings via /api/embed, debounced 300ms). Empty query →
                no filtering. Indicator on the right shows whether the
                current filter is semantic (embeddings ready) or literal
                (substring fallback while embeddings compute). */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 22px',
                borderBottom: `1px solid ${t.line}`,
                background: t.theme === 'light' ? t.panel : t.bg,
            }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search themes, sources, personas, recs... (semantic)"
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: 12,
                        border: `1px solid ${t.line}`,
                        borderRadius: 2,
                        background: t.bg,
                        outline: 'none',
                        color: t.text,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: 0.3,
                    }}
                />
                {searchQuery.trim() && (
                    <span style={{
                        fontSize: 9,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: semantic.usedSemantic ? t.lime : t.muted,
                        fontWeight: 600,
                        fontFamily: 'Archivo, sans-serif',
                        minWidth: 140,
                        textAlign: 'right',
                    }}>
                        {semantic.isComputing
                            ? 'embedding...'
                            : semantic.usedSemantic
                                ? `semantic · ${_searchTotalHits} hit(s)`
                                : `literal · ${_searchTotalHits} hit(s)`}
                    </span>
                )}
                {searchQuery.trim() && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        title="Clear search"
                        style={{
                            background: 'transparent',
                            border: `1px solid ${t.line}`,
                            padding: '6px 10px',
                            fontSize: 10,
                            letterSpacing: 1.5,
                            textTransform: 'uppercase',
                            color: t.muted,
                            cursor: 'pointer',
                            fontFamily: 'Archivo, sans-serif',
                            fontWeight: 600,
                        }}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* P4 (2026-06-06) - MANIFEST HEALTH pill row. Surfaces the
                cached-corpus footprint the user is querying against so they
                can see at a glance what's in scope BEFORE generating. */}
            <ManifestHealthPill theme={t} />

            {/* P3 (2026-06-06) - Auto-hide empty metric tiles. Tiles with
                count 0 AND not currently being generated are vestigial; they
                signal "should work but isn't". The themes / sources / evidence
                / topics tiles always render (they're foundational); personas /
                recs / barriers / journeys auto-hide until chat-driven
                generation populates them. */}
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
                <MetricTile label="Sources" count={sources.length} accent={t.text} active={typeFilter === 'source'} inferring={activeStageKey === 'sources'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'source' ? null : 'source')} />
                <MetricTile label="Evidence" count={evidence.length} accent={t.muted} inferring={activeStageKey === 'evidence'} compact={effectiveSize === 'snug'} />
                {/* P6: surface topic clusters in the metric row when topic-modeling has run. */}
                {(topicModelResult?.topic_count > 0) && (
                    <MetricTile label="Topics" count={topicModelResult.topic_count} accent={t.tealMid} compact={effectiveSize === 'snug'} onClick={() => setActiveTab('topics')} />
                )}
                {(personas.length > 0 || activeStageKey === 'personas') && (
                    <MetricTile label="Personas" count={personas.length} accent={t.tealMid} active={typeFilter === 'persona'} inferring={activeStageKey === 'personas'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'persona' ? null : 'persona')} />
                )}
                {(recs.length > 0 || activeStageKey === 'recs') && (
                    <MetricTile label="Recs" count={recs.length} accent={t.tealMid} active={typeFilter === 'recommendation'} inferring={activeStageKey === 'recs'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'recommendation' ? null : 'recommendation')} />
                )}
                {(barriers.length > 0 || activeStageKey === 'barriers') && (
                    <MetricTile label="Barriers" count={barriers.length} accent={t.rust} active={typeFilter === 'gap'} inferring={activeStageKey === 'barriers'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'gap' ? null : 'gap')} />
                )}
                {(journeys.length > 0 || activeStageKey === 'journeys') && (
                    <MetricTile label="Journeys" count={journeys.length} accent={t.tealMid} active={typeFilter === 'journey_stage'} inferring={activeStageKey === 'journeys'} compact={effectiveSize === 'snug'} onClick={() => setTypeFilter(typeFilter === 'journey_stage' ? null : 'journey_stage')} />
                )}
            </div>

            {/* CORPUS COMPOSITION BAR (X.1) - shows extraction depth distribution
                so the operator can see at a glance what the wiki archive holds.
                Counts drive confidence: "47 full-text + 12 PDFs + 5 transcripts"
                reads very differently from "188 headlines". Only renders when
                there's actual evidence in the graph. */}
            {evidence.length > 0 && <CorpusCompositionBar evidence={evidence} />}

            {/* 2026-05-19 - WEAK ALIGNMENT BANNER. Fires when zero themes
                cleared the goalAlignment floor. The previous behavior was
                to hide all themes (empty treemap), which was worse than
                useless - the user had no signal that themes existed at all.
                Now we show all themes in the main pane AND surface this
                banner so the user sees the alignment concern. Action:
                regenerate themes (corpus may have pulled in off-topic
                material) or accept the current set with the caveat. */}
            {_weakAlignmentFallback && (
                <div style={{
                    background: t.panel, borderLeft: `3px solid ${t.rust}`,
                    padding: '10px 14px', margin: '0 0 8px 0',
                    fontFamily: 'Archivo, sans-serif', fontSize: 11,
                    letterSpacing: 0.3, color: t.text,
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <span style={{ color: t.rust, fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                        WEAK ALIGNMENT
                    </span>
                    <span>
                        All {_allThemes.length} theme{_allThemes.length === 1 ? '' : 's'} scored below the {GOAL_ALIGNMENT_FLOOR}/100 goal-alignment floor.
                        Showing them anyway, sorted by alignment. The corpus may have pulled in off-topic material -
                        consider regenerating themes or narrowing the research goal.
                    </span>
                </div>
            )}

            {/* Row 3 - treemap (ALWAYS full width).
                2026-06-03 - The detail view is now a centered MODAL (see below),
                not a right-hand column, so the treemap keeps the FULL width whether
                or not a theme is selected. This gives theme titles the maximum
                readable area and gives the detail a large, focused surface for
                source material instead of a thin side panel. */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                // 2026-06-03 FIX - the parent's `1fr` row can resolve to ~0 height
                // when the desk card's flex chain doesn't propagate a definite
                // height, which collapsed the treemap to 0px and rendered the
                // themes pane BLANK despite themes being present. A hard floor
                // guarantees the treemap always has a readable, non-zero height.
                minHeight: 'clamp(380px, 56vh, 680px)',
            }}>
                <div style={{ position: 'relative', minHeight: 0, background: t.bg, overflow: 'hidden' }}>
                    {/* 2026-05-11 - Sources tile up in the SAME treemap as themes:
                        size = relevance to research goal (computed in the KG builder
                        as the sum of item relevance scores). Other filtered types
                        (personas, recs, barriers, journeys) still render as the
                        flat grid via FilteredList. */}
                    {typeFilter === 'source' ? (
                        <ThemeTreemap
                            themes={sources}
                            highlighted={highlighted}
                            selectedId={selected?.type === 'source' ? selected.id : null}
                            onSelect={handleSelect}
                        />
                    ) : typeFilter && typeFilter !== 'theme' ? (
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
                    {/* 2026-05-19 - Adjacent Findings drawer. Surfaces themes
                        the model scored < 60 on goalAlignment so they aren't
                        silently lost (the user might still want to inspect a
                        tangent), but keeps them out of the headline treemap. */}
                    {typeFilter !== 'source' && (!typeFilter || typeFilter === 'theme') && adjacentThemes.length > 0 && (
                        <div style={{
                            position: 'absolute', left: 0, right: 0, bottom: 0,
                            background: t.panel, borderTop: `1px solid ${t.line}`,
                            padding: '8px 14px', maxHeight: showAdjacent ? '40%' : 32,
                            overflowY: showAdjacent ? 'auto' : 'hidden',
                            transition: 'max-height 180ms ease',
                            zIndex: 2,
                        }}>
                            <button type="button"
                                onClick={() => setShowAdjacent(v => !v)}
                                title={`${adjacentThemes.length} themes scored below the ${GOAL_ALIGNMENT_FLOOR}/100 goal-alignment floor and were dropped from the main treemap. Click to inspect.`}
                                style={{
                                    background: 'transparent', color: t.muted, border: 'none',
                                    cursor: 'pointer', fontSize: 10, letterSpacing: 1.5,
                                    textTransform: 'uppercase', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 8, padding: 0,
                                }}>
                                <span style={{ color: t.rust }}>●</span>
                                {showAdjacent ? '▾' : '▸'} {adjacentThemes.length} adjacent finding{adjacentThemes.length === 1 ? '' : 's'} (goal-alignment &lt; {GOAL_ALIGNMENT_FLOOR})
                            </button>
                            {showAdjacent && (
                                <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                                    {adjacentThemes.map(n => (
                                        <button key={n.id} type="button"
                                            onClick={() => handleSelect(n)}
                                            style={{
                                                textAlign: 'left', background: 'transparent', border: `1px solid ${t.line}`,
                                                padding: '6px 10px', cursor: 'pointer', color: t.text,
                                                fontFamily: 'Archivo, sans-serif', fontSize: 11,
                                                display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                                            }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {n.label || (n as any).name || n.id}
                                            </span>
                                            <span style={{
                                                fontSize: 9, letterSpacing: 1.5, color: t.muted, fontWeight: 600,
                                                fontFamily: "'JetBrains Mono', monospace",
                                            }}>
                                                {Math.round(_themeAlignment(n))}/100 · {n.evidenceCount || 0} evidence
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2026-06-03 - Detail MODAL. The detail view is a centered, focused
                overlay (not a thin right-hand column) so it can show rich source
                material at a comfortable reading width. Backdrop click or the X
                closes it; the treemap keeps full width underneath. */}
            {selected && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setSelected(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(13,13,13,0.62)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '4vh 4vw',
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            width: 'min(920px, 94vw)',
                            maxHeight: '88vh',
                            display: 'flex', flexDirection: 'column',
                            background: t.panel,
                            border: `1px solid ${t.theme === 'light' ? t.line : t.hairline}`,
                            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                            overflow: 'hidden',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            aria-label="Close"
                            title="Close (Esc)"
                            style={{
                                position: 'absolute', top: 10, right: 10, zIndex: 5,
                                width: 30, height: 30, lineHeight: '28px',
                                background: t.theme === 'light' ? '#FFFFFF' : t.bg,
                                color: t.text, border: `1px solid ${t.theme === 'light' ? t.line : t.hairline}`,
                                cursor: 'pointer', fontSize: 16, fontFamily: 'Archivo, sans-serif',
                                textAlign: 'center', padding: 0,
                            }}
                        >×</button>
                        <div style={{ minHeight: 0, overflow: 'auto', flex: 1 }}>
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
                    </div>
                </div>
            )}

            {/* Row 4 - linkage strip */}
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
        )}
        </div>
        </ActivityCtx.Provider>
        </ThemeCtx.Provider>
        {/* Wiki article viewer overlay - opened by the ⌘ READ ARCHIVED button
            on any archived evidence node. Lives at the top level so its
            fixed-position overlay escapes the desk's stacking context. */}
        <ThemeDeepDiveModal
            item={inspectItem}
            onClose={() => setInspectItem(null)}
            onOpenWiki={(wp) => setViewerWikiPath(wp)}
        />
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
                    <span>Inferring - results will appear here</span>
                </>
                : <span>No entries yet - run a deliverable via Chat to Data</span>
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
