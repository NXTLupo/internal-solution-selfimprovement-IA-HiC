// semanticUiSearch.ts -- 2026-05-20
//
// Reusable semantic-search engine for in-memory UI lists (topics, themes,
// nodes, sources, recommendations - anything with searchable text). Backs
// the Topic Modeling search + Analyst Desk search with the same Gemini
// embedding endpoint that powers NotebookLM-style theme retrieval, so
// "co-op problems" matches "internship difficulties" the way the user
// reasonably expects.
//
// Core mechanics:
//   1. Each item exposes a stable string text + a stable id (used as cache key).
//   2. On first use OR data refresh, items are batch-embedded via /api/embed
//      and cached. Subsequent calls reuse the vectors.
//   3. The query is embedded ONCE per active query string, debounced 300ms
//      so typing doesn't generate an embedding per keystroke. An LRU of the
//      last 50 query embeddings handles back-and-forth typing fast.
//   4. Ranking: cosine similarity (descending). A substring "literal-match"
//      pass runs FIRST so exact tokens always rank highest (covers proper
//      nouns, codes, acronyms that embedding can blur).
//   5. Items below `minSimilarity` (default 0.30) are dropped entirely.
//   6. Failure-isolated: if embedding fails, returns substring-filtered
//      results so search never goes blank.
//
// React integration: useSemanticSearch hook returns { filtered, isComputing,
// usedSemantic } - UI can render a tiny "semantic" indicator while
// re-embedding so the user knows what they're seeing.

import { useEffect, useMemo, useRef, useState } from 'react';

const PROXY_BASE = 'http://127.0.0.1:5012';
const DEBOUNCE_MS = 300;
const QUERY_CACHE_MAX = 50;
const ITEM_BATCH_SIZE = 64;
// 2026-05-20 - Settled at 0.42 after two over-corrections:
//   • 0.30 was too loose (everything passed; "finance" returned cybersecurity themes).
//   • 0.55 was too tight (short-text items like theme labels never crossed it;
//     "AI" returned 0 themes even when AI-prefixed themes existed).
// Gemini gemini-embedding-001 baseline pair similarity in higher-ed institutional
// corpora clusters around 0.35-0.50. The 0.42 inflection lets adjacent-topic
// matches surface for short-text items (themes, recommendations) while still
// filtering noise for long-text items (sources, evidence). Per-call overrides
// are still honored - long-text consumers should pass minSimilarity: 0.50+ and
// short-text consumers should pass 0.40-0.42.
const LITERAL_BONUS = 1.5;   // multiplicative boost when item text literally contains the query
const EMBED_TIMEOUT_MS = 15_000;
// 2026-05-20 - Top-N cap. Even when many items pass the floor,
// surfacing >TOP_N items per panel reintroduces noise. NotebookLM-style:
// rank-then-cap. UI can still page beyond this if it wants to.
const DEFAULT_TOP_N = 25;
// If NOTHING passes the floor but the user clearly intended a search,
// surface the top FALLBACK_N so the panel doesn't go blank.
const FALLBACK_TOP_N = 5;

// ============================================================================
// Embedding cache (process lifetime, not persisted)
// ============================================================================

interface EmbedCacheEntry { vec: number[]; addedAt: number; }

const itemEmbeddingCache = new Map<string, EmbedCacheEntry>();
const queryEmbeddingLRU: Array<{ key: string; vec: number[] }> = [];

function getCachedItemEmbed(key: string): number[] | null {
    const entry = itemEmbeddingCache.get(key);
    return entry ? entry.vec : null;
}

function setCachedItemEmbed(key: string, vec: number[]): void {
    itemEmbeddingCache.set(key, { vec, addedAt: Date.now() });
}

function getCachedQueryEmbed(key: string): number[] | null {
    for (let i = queryEmbeddingLRU.length - 1; i >= 0; i--) {
        if (queryEmbeddingLRU[i].key === key) {
            // Promote to most-recent end
            const entry = queryEmbeddingLRU.splice(i, 1)[0];
            queryEmbeddingLRU.push(entry);
            return entry.vec;
        }
    }
    return null;
}

function setCachedQueryEmbed(key: string, vec: number[]): void {
    queryEmbeddingLRU.push({ key, vec });
    while (queryEmbeddingLRU.length > QUERY_CACHE_MAX) queryEmbeddingLRU.shift();
}

// ============================================================================
// Low-level embedding fetch
// ============================================================================

interface ApiEmbedResponse {
    embeddings: number[][];
    model: string;
    provider: string;
    dim: number;
    task_type: string;
    error?: string;
}

async function embedTexts(texts: string[], task_type: 'query' | 'document'): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    const resp = await fetch(`${PROXY_BASE}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, task_type }),
        signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`/api/embed HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = await resp.json() as ApiEmbedResponse;
    if (data.error) throw new Error(`embed error: ${data.error}`);
    return data.embeddings || [];
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

// ============================================================================
// Batch item embedding (idempotent - only embeds keys not already cached)
// ============================================================================

async function ensureItemEmbeddings<T>(
    items: T[],
    getId: (item: T) => string,
    getText: (item: T) => string,
): Promise<void> {
    const needsEmbedding: { key: string; text: string }[] = [];
    for (const it of items) {
        const key = getId(it);
        if (!key) continue;
        if (getCachedItemEmbed(key)) continue;
        const text = (getText(it) || '').trim().slice(0, 1500);
        if (text.length < 4) continue;
        needsEmbedding.push({ key, text });
    }
    if (needsEmbedding.length === 0) return;

    for (let i = 0; i < needsEmbedding.length; i += ITEM_BATCH_SIZE) {
        const slice = needsEmbedding.slice(i, i + ITEM_BATCH_SIZE);
        try {
            const vectors = await embedTexts(slice.map(s => s.text), 'document');
            slice.forEach((s, idx) => {
                if (vectors[idx]) setCachedItemEmbed(s.key, vectors[idx]);
            });
        } catch (err: any) {
            console.warn('[semanticUiSearch] item batch embed failed (non-fatal):', err?.message || err);
            // Continue to next batch - partial coverage is better than zero.
        }
    }
}

async function ensureQueryEmbedding(query: string): Promise<number[] | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const cached = getCachedQueryEmbed(trimmed);
    if (cached) return cached;
    try {
        const [vec] = await embedTexts([trimmed], 'query');
        if (vec && vec.length > 0) {
            setCachedQueryEmbed(trimmed, vec);
            return vec;
        }
    } catch (err: any) {
        console.warn('[semanticUiSearch] query embed failed (non-fatal):', err?.message || err);
    }
    return null;
}

// ============================================================================
// Substring fast-path
// ============================================================================

function substringMatches(text: string, tokens: string[]): boolean {
    if (tokens.length === 0) return true;
    const lower = text.toLowerCase();
    return tokens.every(tok => lower.includes(tok));
}

// ============================================================================
// Public ranking - pure function, no debounce / no React
// ============================================================================

export interface RankedItem<T> {
    item: T;
    similarity: number;
    literalMatch: boolean;
}

export interface RankOptions {
    minSimilarity?: number;
    /** Max items to return. Defaults to DEFAULT_TOP_N. */
    topN?: number;
    /** When no item passes the floor, return up to this many top-scoring
     *  items anyway, so the UI never goes blank on a typed query. */
    fallbackTopN?: number;
}

/**
 * Rank items by semantic similarity to query. Assumes items + query are
 * already embedded (call ensureItemEmbeddings / ensureQueryEmbedding first).
 * Returns items sorted desc by similarity, with items below min dropped.
 * Substring matches get a multiplicative boost so exact tokens always
 * surface near the top even when the embedding similarity is mediocre.
 */
export function rankBySimilarity<T>(
    items: T[],
    getId: (item: T) => string,
    getText: (item: T) => string,
    query: string,
    queryVec: number[] | null,
    options: RankOptions = {},
): RankedItem<T>[] {
    const minSim = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
    const topN = options.topN ?? DEFAULT_TOP_N;
    const fallbackTopN = options.fallbackTopN ?? FALLBACK_TOP_N;
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    // Score EVERY item first so we can do rank-then-cap (NotebookLM-style)
    // and fall back to top-N when nothing crosses the floor.
    const scored: RankedItem<T>[] = [];
    for (const it of items) {
        const key = getId(it);
        const text = getText(it) || '';
        const literal = substringMatches(text, tokens);

        let sim = 0;
        if (queryVec) {
            const itemVec = getCachedItemEmbed(key);
            if (itemVec) sim = cosineSimilarity(queryVec, itemVec);
        }
        const effective = literal ? Math.max(sim, minSim) * LITERAL_BONUS : sim;
        scored.push({ item: it, similarity: effective, literalMatch: literal });
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    // Primary pass: items at or above the floor (or with a literal token match).
    let kept = scored.filter(s => s.literalMatch || s.similarity >= minSim);

    // Fallback: query produced no above-floor results - surface the top FALLBACK_N
    // so the panel doesn't go blank. Caller can inspect literalMatch / similarity
    // to render a "weak match" indicator.
    if (kept.length === 0 && queryVec && scored.length > 0) {
        kept = scored.slice(0, fallbackTopN);
    }

    // Cap to topN - even when many items pass the floor, only the most
    // similar ones are useful in a treemap/list panel.
    return kept.slice(0, topN);
}

// ============================================================================
// React hook - debounced, async-safe, returns filtered subset
// ============================================================================

export interface UseSemanticSearchResult<T> {
    /** Filtered + ranked items. While embeddings are still being computed,
     *  this falls back to substring matches so search never goes blank. */
    filtered: T[];
    /** True while a query embedding or item embedding batch is in flight. */
    isComputing: boolean;
    /** True when filtered was produced by semantic ranking; false when it's
     *  a substring fallback (initial load, network error, empty query). */
    usedSemantic: boolean;
    /** Per-item similarity scores for the items in `filtered`, same order.
     *  Useful when UI wants to surface "best match" indicators. */
    similarities: number[];
    /** 2026-05-20 - Exposed so consumers can do per-type bucketing without a
     *  second embedding round-trip. Pass it to rankBySimilarity() with a
     *  pre-bucketed item list to get per-type top-K results. Null while
     *  the query is still being embedded or when the query is empty. */
    queryVec: number[] | null;
}

export interface UseSemanticSearchOptions {
    minSimilarity?: number;
    /** Set to false to disable semantic ranking entirely and use pure
     *  substring filtering. */
    enabled?: boolean;
    /** Max items returned. Caller-tunable per panel. */
    topN?: number;
    /** Top-N fallback when zero items pass the floor. */
    fallbackTopN?: number;
}

/**
 * React hook for semantic search over an in-memory list.
 *
 *   const { filtered, isComputing, usedSemantic } = useSemanticSearch(
 *     items, getId, getText, query
 *   );
 *
 * - getId(item)   → stable cache key (used to cache item embedding)
 * - getText(item) → text to embed and substring-match against
 * - query         → user's search query (debounced 300ms internally)
 */
export function useSemanticSearch<T>(
    items: T[],
    getId: (item: T) => string,
    getText: (item: T) => string,
    query: string,
    options: UseSemanticSearchOptions = {},
): UseSemanticSearchResult<T> {
    const enabled = options.enabled !== false;
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [queryVec, setQueryVec] = useState<number[] | null>(null);
    const [embeddingTick, setEmbeddingTick] = useState(0);   // bumps after batch embed completes
    const [isComputing, setIsComputing] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // Debounce the query so typing doesn't hit /api/embed per keystroke.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [query]);

    // Embed the query once it stabilizes.
    useEffect(() => {
        if (!enabled || !debouncedQuery.trim()) {
            setQueryVec(null);
            return;
        }
        const cached = getCachedQueryEmbed(debouncedQuery.trim());
        if (cached) { setQueryVec(cached); return; }
        let cancelled = false;
        setIsComputing(true);
        ensureQueryEmbedding(debouncedQuery).then(vec => {
            if (cancelled) return;
            setQueryVec(vec);
            setIsComputing(false);
        }).catch(() => {
            if (cancelled) return;
            setQueryVec(null);
            setIsComputing(false);
        });
        return () => { cancelled = true; };
    }, [debouncedQuery, enabled]);

    // Embed items whenever the list changes. Idempotent - only new items
    // hit /api/embed. Bumps embeddingTick when done so memoized filter
    // re-runs once vectors are available.
    useEffect(() => {
        if (!enabled || items.length === 0) return;
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        let cancelled = false;
        setIsComputing(true);
        ensureItemEmbeddings(items, getId, getText).then(() => {
            if (cancelled || ac.signal.aborted) return;
            setEmbeddingTick(t => t + 1);
            setIsComputing(false);
        }).catch(() => {
            if (cancelled || ac.signal.aborted) return;
            setIsComputing(false);
        });
        return () => { cancelled = true; ac.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, enabled]);

    const result = useMemo<UseSemanticSearchResult<T>>(() => {
        const trimmed = debouncedQuery.trim();

        // Empty query → return everything, no filtering.
        if (!trimmed) {
            return { filtered: items, isComputing: false, usedSemantic: false, similarities: items.map(() => 1), queryVec: null };
        }

        // Semantic disabled OR no query embedding yet → substring fallback.
        if (!enabled || !queryVec) {
            const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
            const matched: T[] = [];
            const sims: number[] = [];
            for (const it of items) {
                if (substringMatches(getText(it) || '', tokens)) {
                    matched.push(it);
                    sims.push(1);
                }
            }
            return { filtered: matched, isComputing, usedSemantic: false, similarities: sims, queryVec: null };
        }

        // Semantic ranking path.
        const ranked = rankBySimilarity(items, getId, getText, trimmed, queryVec, {
            minSimilarity: options.minSimilarity,
            topN: options.topN,
            fallbackTopN: options.fallbackTopN,
        });
        return {
            filtered: ranked.map(r => r.item),
            isComputing,
            usedSemantic: true,
            similarities: ranked.map(r => r.similarity),
            queryVec,
        };
        // embeddingTick is included to re-run after item batch embed completes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, debouncedQuery, queryVec, enabled, isComputing, embeddingTick, options.minSimilarity, options.topN, options.fallbackTopN]);

    return result;
}

// ============================================================================
// Helpers exposed for non-React callers
// ============================================================================

export {
    ensureItemEmbeddings,
    ensureQueryEmbedding,
    cosineSimilarity,
    substringMatches,
};
