/**
 * Quote Extractor — deterministic verbatim-quote pulling for slide generation.
 *
 * The slide AI may emit `evidence` (single quote) or `quotes[]` (multi-quote)
 * fields on every theme/persona/barrier. When the user asks for a specific
 * quote density ("3 quotes each", "#quotes=5"), this module enriches the
 * model's JSON output with REAL verbatim text pulled from the knowledge graph
 * and source corpus — no fabrication.
 *
 * Why deterministic? The LLM is great at claim-making but prone to quote
 * drift (paraphrasing, composite quotes, or inventing plausible-sounding
 * attributions). By pulling quotes from collected evidence nodes directly,
 * we guarantee every quote on a slide is:
 *   - Traceable to a specific evidence node in the KG
 *   - Sourced from a named, tiered connector
 *   - Carrying the real URL for link-out
 *
 * Extraction strategy (high to low confidence):
 *   Tier A: Match theme name / insight keywords against evidence node content
 *   Tier B: Match theme's linked source edges back to their child evidence
 *   Tier C: Fall back to top-relevance evidence from the most-cited source
 *
 * Scoring: quote candidates are ranked by (relevance, source-tier bonus,
 * length fitness 80-240 chars, freshness). Same-source dedup prevents three
 * quotes from one Reddit thread when three different sources are available.
 */

import type { KGNode, KnowledgeGraph } from './knowledgeGraphBuilder';
import type { SlideQuote } from '../components/slideTemplates/types';

// --- TUNING CONSTANTS ---
const MIN_QUOTE_CHARS = 40;
const MAX_QUOTE_CHARS = 240;
const IDEAL_QUOTE_CHARS = 140;
const DEFAULT_MAX_PER_THEME = 3;

// Stopwords that shouldn't drive keyword overlap scoring
const STOPWORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'are',
    'was', 'were', 'but', 'not', 'their', 'them', 'they', 'into', 'than',
    'which', 'what', 'when', 'where', 'also', 'been', 'being', 'about', 'more',
    'most', 'some', 'over', 'between', 'through', 'across', 'within',
]);

/** Normalize a string to stopword-filtered lowercase word tokens of 4+ chars. */
function tokens(s: string | undefined): Set<string> {
    if (!s) return new Set();
    const out = new Set<string>();
    for (const raw of s.toLowerCase().split(/\W+/)) {
        if (raw.length < 4 || STOPWORDS.has(raw)) continue;
        out.add(raw);
    }
    return out;
}

/** Count token-set intersection size — the basic keyword overlap metric. */
function overlap(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const t of a) if (b.has(t)) n++;
    return n;
}

/** Edge-id extraction for nodes regardless of whether d3 has hydrated them. */
function edgeId(e: any, which: 'source' | 'target'): string {
    const v = e[which];
    return typeof v === 'string' ? v : (v && v.id) || '';
}

/** All evidence nodes this theme is linked to, via any edge type. */
function linkedEvidence(theme: KGNode, graph: KnowledgeGraph): KGNode[] {
    const ids = new Set<string>();
    for (const e of graph.edges) {
        const s = edgeId(e, 'source');
        const t = edgeId(e, 'target');
        if (s === theme.id) ids.add(t);
        else if (t === theme.id) ids.add(s);
    }
    return graph.nodes.filter(n => ids.has(n.id) && n.type === 'evidence');
}

/** All source nodes this theme is linked to — direct edges + parent of linked evidence. */
function linkedSources(theme: KGNode, graph: KnowledgeGraph): KGNode[] {
    const direct: KGNode[] = [];
    const ids = new Set<string>();
    for (const e of graph.edges) {
        const s = edgeId(e, 'source');
        const t = edgeId(e, 'target');
        let other: string | null = null;
        if (s === theme.id) other = t;
        else if (t === theme.id) other = s;
        if (!other) continue;
        const n = graph.nodes.find(nn => nn.id === other);
        if (n && n.type === 'source' && !ids.has(n.id)) {
            direct.push(n); ids.add(n.id);
        }
    }
    // Add parent sources of linked evidence
    for (const ev of linkedEvidence(theme, graph)) {
        if (ev.parentSourceId && !ids.has(ev.parentSourceId)) {
            const src = graph.nodes.find(n => n.id === ev.parentSourceId);
            if (src) { direct.push(src); ids.add(src.id); }
        }
    }
    return direct;
}

/** Child evidence under a given source node. */
function evidenceUnderSource(source: KGNode, graph: KnowledgeGraph): KGNode[] {
    return graph.nodes.filter(n => n.type === 'evidence' && n.parentSourceId === source.id);
}

/** Pull the most quotable text snippet out of an evidence node's metadata.
 *  Evidence nodes may carry content either as `metadata.content` (collected
 *  text) or `metadata.text` (citation text). Prefer longer of the two. */
function evidenceText(ev: KGNode): string {
    const m = ev.metadata || {};
    const candidates = [m.content, m.text, ev.label].filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (candidates.length === 0) return '';
    // Pick the longest-above-threshold, falling back to longest overall
    const above = candidates.filter(c => c.length >= MIN_QUOTE_CHARS);
    return (above.length > 0 ? above : candidates).sort((a, b) => b.length - a.length)[0];
}

/** Trim a snippet to sentence or clause boundaries within the target window.
 *  Aims to land within MAX_QUOTE_CHARS without cutting mid-word. */
function trimToSentence(raw: string, max = MAX_QUOTE_CHARS): string {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    // Try to end at the last sentence terminator inside [max*0.5, max]
    const minEnd = Math.floor(max * 0.55);
    const slice = text.slice(0, max);
    const lastTerm = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('! '),
    );
    if (lastTerm >= minEnd) return slice.slice(0, lastTerm + 1).trim();
    // Fall back to last comma or space
    const lastComma = slice.lastIndexOf(', ');
    if (lastComma >= minEnd) return slice.slice(0, lastComma).trim() + '…';
    return slice.replace(/\s+\S*$/, '') + '…';
}

/** Score a quote candidate for fitness on a theme. Higher is better. */
interface QuoteCandidate {
    text: string;
    sourceNode?: KGNode;
    evidenceNode: KGNode;
    score: number;
    url?: string;
}
function scoreCandidate(ev: KGNode, src: KGNode | undefined, themeTokens: Set<string>): QuoteCandidate | null {
    const raw = evidenceText(ev);
    if (!raw || raw.length < MIN_QUOTE_CHARS) return null;
    const text = trimToSentence(raw);
    const evTokens = tokens(text);
    const keywordHits = overlap(themeTokens, evTokens);

    // Length fitness: peaks near IDEAL_QUOTE_CHARS, falls off on both sides
    const lenDelta = Math.abs(text.length - IDEAL_QUOTE_CHARS);
    const lenScore = Math.max(0, 1 - lenDelta / IDEAL_QUOTE_CHARS);

    // Source tier bonus: T1 (academic/gov) > T2 (news) > T3 (community)
    const tier = src?.tier ?? ev.tier ?? 3;
    const tierScore = tier === 1 ? 1.0 : tier === 2 ? 0.75 : 0.5;

    // Relevance carries through from AI scoring done at collection time
    const rel = typeof ev.relevanceScore === 'number' ? ev.relevanceScore / 100 : 0.5;

    // Freshness — 90-day half-life. Missing dates score neutrally.
    const fresh = typeof ev.freshnessScore === 'number' ? ev.freshnessScore / 100 : 0.5;

    const score =
        keywordHits * 1.8 +       // semantic fit dominates
        lenScore * 0.9 +           // tight quotes preferred
        tierScore * 0.8 +          // authoritative sources preferred
        rel * 0.6 +                // AI-judged relevance
        fresh * 0.3;               // recency tiebreaker

    return {
        text,
        sourceNode: src,
        evidenceNode: ev,
        score,
        url: ev.url,
    };
}

/**
 * Extract up to N real quotes for a theme from the knowledge graph.
 *
 * The theme argument can be either a KGNode (when iterating over graph
 * nodes) or a loose { name, insight } pair (when the AI emitted a theme
 * object in slide JSON and we need to match back to the graph).
 */
export interface ThemeLike {
    id?: string;
    label?: string;
    name?: string;
    insight?: string;
}

export function extractQuotesForTheme(
    theme: ThemeLike,
    graph: KnowledgeGraph,
    opts: { count?: number; excludeSources?: Set<string> } = {},
): SlideQuote[] {
    const count = Math.max(1, Math.min(10, opts.count ?? DEFAULT_MAX_PER_THEME));
    const themeName = theme.name || theme.label || '';
    const themeText = `${themeName} ${theme.insight || ''}`;
    const themeTokens = tokens(themeText);

    // Locate the theme node in the graph. If theme.id is given, use it.
    // Otherwise match by label (name).
    let themeNode: KGNode | undefined;
    if (theme.id) themeNode = graph.nodes.find(n => n.id === theme.id);
    if (!themeNode) themeNode = graph.nodes.find(n => n.type === 'theme' && n.label?.toLowerCase() === themeName.toLowerCase());
    if (!themeNode) {
        // Fuzzy match: theme label contained in slide theme name or vice versa
        themeNode = graph.nodes.find(n => {
            if (n.type !== 'theme') return false;
            const nl = (n.label || '').toLowerCase();
            const sl = themeName.toLowerCase();
            return nl.length > 4 && (nl.includes(sl) || sl.includes(nl));
        });
    }

    // Gather candidate evidence pool
    const candidatePool: Array<{ ev: KGNode; src?: KGNode }> = [];
    if (themeNode) {
        // Tier B: theme's directly-linked evidence nodes
        for (const ev of linkedEvidence(themeNode, graph)) {
            const src = ev.parentSourceId ? graph.nodes.find(n => n.id === ev.parentSourceId) : undefined;
            candidatePool.push({ ev, src });
        }
        // Tier C: if sparse, include evidence from linked sources not already counted
        if (candidatePool.length < count * 2) {
            const seenEvIds = new Set(candidatePool.map(c => c.ev.id));
            for (const src of linkedSources(themeNode, graph)) {
                for (const ev of evidenceUnderSource(src, graph)) {
                    if (seenEvIds.has(ev.id)) continue;
                    seenEvIds.add(ev.id);
                    candidatePool.push({ ev, src });
                }
            }
        }
    }

    // Tier A: Also include ALL evidence nodes with strong keyword overlap to
    // the theme text — this catches quotes the graph edges missed.
    if (candidatePool.length < count * 2 && themeTokens.size > 0) {
        const seenEvIds = new Set(candidatePool.map(c => c.ev.id));
        for (const ev of graph.nodes) {
            if (ev.type !== 'evidence' || seenEvIds.has(ev.id)) continue;
            const evTok = tokens(evidenceText(ev));
            if (overlap(themeTokens, evTok) >= 3) {
                const src = ev.parentSourceId ? graph.nodes.find(n => n.id === ev.parentSourceId) : undefined;
                candidatePool.push({ ev, src });
            }
        }
    }

    // Score, filter out excluded sources, and sort
    const excluded = opts.excludeSources || new Set<string>();
    const scored: QuoteCandidate[] = [];
    for (const { ev, src } of candidatePool) {
        if (src?.label && excluded.has(src.label)) continue;
        const c = scoreCandidate(ev, src, themeTokens);
        if (c) scored.push(c);
    }
    scored.sort((a, b) => b.score - a.score);

    // Diversify: prefer distinct sources. Keep the top-scored candidate per
    // source, then relax if we still need more to hit `count`.
    const picked: QuoteCandidate[] = [];
    const usedSources = new Set<string>();
    for (const c of scored) {
        const sourceKey = c.sourceNode?.id || c.sourceNode?.label || c.evidenceNode.parentSourceId || 'unknown';
        if (usedSources.has(sourceKey)) continue;
        picked.push(c);
        usedSources.add(sourceKey);
        if (picked.length >= count) break;
    }
    // Backfill from the same-source pool if we still have gaps
    if (picked.length < count) {
        const pickedEvIds = new Set(picked.map(p => p.evidenceNode.id));
        for (const c of scored) {
            if (pickedEvIds.has(c.evidenceNode.id)) continue;
            picked.push(c);
            if (picked.length >= count) break;
        }
    }

    return picked.map(c => ({
        text: c.text,
        source: c.sourceNode?.label || c.evidenceNode.metadata?.sourceName || 'Source',
        attribution: c.evidenceNode.metadata?.author || undefined,
        url: c.url,
        date: c.evidenceNode.metadata?.date || undefined,
    }));
}

/**
 * Detect quote density directives in a user message.
 *
 * Matches patterns like:
 *   "3 quotes each"          → { count: 3, perTheme: true }
 *   "#quotes=5"              → { count: 5 }
 *   "with 4 quotes"          → { count: 4 }
 *   "include three quotes"   → { count: 3 }
 *
 * Returns null when no directive is present.
 */
export function detectQuoteDensity(message: string): { count: number; perTheme: boolean } | null {
    if (!message) return null;
    const m = message.toLowerCase();

    // Hashtag form: #quotes=N
    const hashMatch = m.match(/#quotes\s*=\s*(\d+)/);
    if (hashMatch) {
        const n = parseInt(hashMatch[1], 10);
        if (n >= 1 && n <= 10) return { count: n, perTheme: true };
    }

    // "N quotes each" or "N quotes per"
    const eachMatch = m.match(/(\d+)\s+quotes?\s+(?:each|per)/);
    if (eachMatch) {
        const n = parseInt(eachMatch[1], 10);
        if (n >= 1 && n <= 10) return { count: n, perTheme: true };
    }

    // "with N quotes" / "include N quotes" / "N quotes per theme"
    const withMatch = m.match(/(?:with|include|show|add|give|pull)\s+(\d+)\s+quotes?/);
    if (withMatch) {
        const n = parseInt(withMatch[1], 10);
        if (n >= 1 && n <= 10) return { count: n, perTheme: true };
    }

    // Word-number forms
    const wordMap: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    };
    const wordMatch = m.match(/\b(one|two|three|four|five|six|seven|eight)\s+quotes?\s+(?:each|per)/);
    if (wordMatch && wordMap[wordMatch[1]]) {
        return { count: wordMap[wordMatch[1]], perTheme: true };
    }

    return null;
}

/**
 * Enrich a parsed slide JSON block in-place by pulling real quotes from the
 * knowledge graph for every theme that doesn't already carry `quotes[]`.
 *
 * This is called after the AI produces slide JSON and before the renderer
 * consumes it — guaranteeing every theme on a quote-dense slide shows real
 * corpus-backed text. Fabrication impossible: if no matching evidence exists,
 * the function leaves `quotes[]` empty and the renderer falls back to the
 * `evidence` / `source` pair.
 *
 * @returns the same slide object (for chaining), mutated in place
 */
export function enrichSlideWithQuotes(slide: any, graph: KnowledgeGraph, directive: { count: number }): any {
    if (!slide || typeof slide !== 'object') return slide;
    if (!directive || directive.count < 1) return slide;

    // The slide shapes that carry a themes array: themeCluster
    const themes = slide?.themeCluster?.themes;
    if (Array.isArray(themes)) {
        for (const t of themes) {
            if (Array.isArray(t.quotes) && t.quotes.length >= directive.count) continue;
            const pulled = extractQuotesForTheme(t, graph, { count: directive.count });
            if (pulled.length > 0) {
                t.quotes = pulled;
            }
        }
    }
    return slide;
}
