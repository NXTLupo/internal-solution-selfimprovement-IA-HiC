/**
 * Wiki Index + Retrieval — client wrapper for the RAG endpoints added
 * to the proxy (2026-04-20). These two endpoints are the foundation of
 * the wiki-as-context-store architecture:
 *
 *   GET  /api/wiki/index             — metadata menu of every archived article
 *                                      (url_hash id, title, source, summary, chars, path)
 *   POST /api/wiki/fetch-articles    — full bodies for ids / keyword query
 *
 * The in-memory corpus passed to each chat turn is now capped at the
 * context window; the wiki itself can hold hundreds of thousands of chars
 * per engagement. This client lets the AI (or the chat pre-fetch layer)
 * pull specific bodies on demand without stuffing everything into every
 * system prompt.
 *
 * All functions are NON-BLOCKING by contract: failures return empty
 * results (not throws), so a proxy outage degrades gracefully instead of
 * breaking theme/persona/challenge/recommendation generation.
 */

const PROXY = 'http://localhost:5012';

export interface WikiIndexEntry {
    id: string;              // url_hash (10-char blake2b)
    wikiPath: string;        // relative path under /hic-workspace/wiki/
    kind: 'article' | 'transcript' | 'upload' | string;
    url: string;
    title: string;
    source: string;
    date?: string;
    author?: string;
    tier?: string;           // '1' | '2' | '3' as string (from frontmatter)
    method?: string;         // 'pdf' | 'jina' | 'whisper' | 'source-native' | ...
    channel?: string;        // for transcripts
    engagement?: string;     // for uploads
    chars: number;
    mtime: number;           // unix seconds
    summary?: string;        // first N chars of body, set per request
}

export interface WikiIndexResponse {
    total: number;
    returned: number;
    built_at?: number;
    entries: WikiIndexEntry[];
}

export interface WikiFetchArticlesParams {
    ids?: string[];               // url_hash values
    wikiPaths?: string[];         // direct paths (e.g. articles/source/hash.md)
    query?: string;               // keyword search over title + summary
    kind?: string;                // 'article' | 'transcript' | 'upload'
    source?: string;              // substring match
    minChars?: number;
    limit?: number;               // default 10, max 50
    maxCharsPerArticle?: number;  // default 20000, max 50000
    // Phase 2.5 (2026-04-28): goal-blended retrieval — when present, the proxy
    // blends the chat-question embedding with the engagement goal embedding,
    // strengthening recall of previously archived content aligned with the
    // broader engagement context (not just the narrow chat question).
    engagementGoal?: string;      // original research goal text
    goalBlendWeight?: number;     // 0..1, default 0.30 server-side
}

export interface WikiArticleBody {
    id: string;
    wikiPath: string;
    url: string;
    title: string;
    source: string;
    date?: string;
    kind: string;
    tier?: string;
    chars: number;
    content: string;    // actual body text, stripped of frontmatter + header
}

export interface WikiFetchArticlesResponse {
    total_matched: number;
    returned: number;
    articles: WikiArticleBody[];
}

/**
 * Fetch the lightweight wiki metadata index. Returns empty array on any
 * error — callers should treat the absence of the wiki gracefully.
 *
 * @param opts.summary_len  chars of body preview to include (default 200)
 * @param opts.limit        cap on entries returned (default 0 = all)
 * @param opts.kind         filter: article|transcript|upload
 * @param opts.source       substring match on source name
 * @param opts.minChars     skip articles shorter than this
 * @param opts.forceRebuild bypass proxy's 30s cache
 * @param opts.signal       optional AbortSignal for timeout
 */
export async function fetchWikiIndex(opts: {
    summary_len?: number;
    limit?: number;
    kind?: string;
    source?: string;
    minChars?: number;
    forceRebuild?: boolean;
    signal?: AbortSignal;
} = {}): Promise<WikiIndexEntry[]> {
    try {
        const params = new URLSearchParams();
        if (opts.summary_len !== undefined) params.set('summary_len', String(opts.summary_len));
        if (opts.limit !== undefined) params.set('limit', String(opts.limit));
        if (opts.kind) params.set('kind', opts.kind);
        if (opts.source) params.set('source', opts.source);
        if (opts.minChars !== undefined) params.set('min_chars', String(opts.minChars));
        if (opts.forceRebuild) params.set('force_rebuild', '1');

        const url = `${PROXY}/api/wiki/index${params.toString() ? '?' + params.toString() : ''}`;
        const resp = await fetch(url, {
            signal: opts.signal || AbortSignal.timeout(10000),
        });
        if (!resp.ok) {
            console.warn(`[wikiIndex] fetch failed: HTTP ${resp.status}`);
            return [];
        }
        const data: WikiIndexResponse = await resp.json();
        return data.entries || [];
    } catch (e: any) {
        console.warn('[wikiIndex] fetch error:', e?.message || e);
        return [];
    }
}

/**
 * Fetch full article bodies by id, path, or keyword query. Returns empty
 * array on any error — same non-blocking contract as fetchWikiIndex.
 *
 * Use this when the AI (or the pre-fetch layer) needs real text to quote:
 * call fetchWikiIndex first to get the menu, then fetchWikiArticles to
 * pull the bodies for whichever ids match the question.
 */
export async function fetchWikiArticles(params: WikiFetchArticlesParams): Promise<WikiArticleBody[]> {
    try {
        const resp = await fetch(`${PROXY}/api/wiki/fetch-articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            // 45s accommodates proxy-saturation windows during active
            // collection (up to 10 parallel wiki write + embed calls can
            // queue the semantic search behind them). Previously 20s,
            // which timed out on user clicks mid-collection.
            signal: AbortSignal.timeout(45_000),
        });
        if (!resp.ok) {
            console.warn(`[wikiIndex] fetch-articles failed: HTTP ${resp.status}`);
            return [];
        }
        const data: WikiFetchArticlesResponse = await resp.json();
        return data.articles || [];
    } catch (e: any) {
        console.warn('[wikiIndex] fetch-articles error:', e?.message || e);
        return [];
    }
}

/**
 * Convenience: format a batch of fetched articles as a corpus block ready
 * for injection into a system prompt. Each article gets a header line with
 * source/title/url so the AI knows what it's citing. Trims to total char
 * budget, dropping the longest articles first if over budget.
 */
export function formatArticlesAsCorpusBlock(articles: WikiArticleBody[], maxTotalChars: number = 80_000): string {
    if (!articles || articles.length === 0) return '';
    // Shallow-copy, sort by chars asc so we drop longest first when over budget
    const working = [...articles];
    let total = 0;
    const kept: WikiArticleBody[] = [];
    for (const a of working) {
        const block = renderArticleBlock(a);
        if (total + block.length > maxTotalChars) continue;
        total += block.length;
        kept.push(a);
    }
    if (kept.length === 0) return '';
    const header = `\n=== WIKI ARTICLE BODIES (${kept.length} articles, ${Math.round(total / 1024)}KB) — real text pulled from the archive for this question ===\n`;
    return header + kept.map(renderArticleBlock).join('\n\n---\n\n');
}

function renderArticleBlock(a: WikiArticleBody): string {
    const urlLine = a.url ? `URL: ${a.url}\n` : '';
    const dateLine = a.date ? `Date: ${a.date}\n` : '';
    const sourceLine = a.source ? `Source: ${a.source}\n` : '';
    return `Title: ${a.title || '(untitled)'}\n${sourceLine}${dateLine}${urlLine}WikiPath: ${a.wikiPath}\nContent:\n${a.content}`;
}

/**
 * Semantic-neighbor exploration for the dynamic prompt chip system.
 * Returns archive articles bucketed by cosine similarity to the goal.
 * Non-blocking — all failure modes return empty buckets.
 */
export interface WikiExploreNeighbor {
    id: string;
    title: string;
    source: string;
    kind: string;
    date?: string;
    wikiPath?: string;
    summary?: string;
    similarity: number;
}
export interface WikiExploreConceptsResponse {
    goal_preview?: string;
    total_indexed?: number;
    candidates_scored?: number;
    strong: WikiExploreNeighbor[];        // cosine >= 0.60
    adjacent: WikiExploreNeighbor[];      // 0.35 <= cosine < 0.60
    weak: WikiExploreNeighbor[];          // 0.25 <= cosine < 0.35
    reason?: string;
}
// Per-session cache for exploreConcepts. The dynamic-prompt-chip layer
// re-fires suggestPrompts on every state tick during mid-collection —
// 11 identical calls in a single collection burn 11 OpenAI query-embed
// requests + 11 proxy round-trips for the same goal. Cache by
// goal+limit+minSim+kind with a 5-min TTL. The archive itself changes
// slowly (sub-minute between writes at most), so 5 min is safe.
const EXPLORE_CACHE_TTL_MS = 5 * 60 * 1000;
interface ExploreCacheEntry { expires: number; data: WikiExploreConceptsResponse }
const _exploreCache = new Map<string, ExploreCacheEntry>();

export async function exploreConcepts(
    goal: string,
    opts: { limit?: number; minSim?: number; kind?: string; signal?: AbortSignal; bypassCache?: boolean } = {},
): Promise<WikiExploreConceptsResponse> {
    const empty: WikiExploreConceptsResponse = { strong: [], adjacent: [], weak: [] };
    if (!goal || goal.trim().length < 8) return empty;

    const cacheKey = `${goal.trim()}|${opts.limit ?? 8}|${opts.minSim ?? 0.25}|${opts.kind || ''}`;
    if (!opts.bypassCache) {
        const cached = _exploreCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) return cached.data;
    }

    try {
        const resp = await fetch(`${PROXY}/api/wiki/explore-concepts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goal,
                limit: opts.limit ?? 8,
                minSim: opts.minSim ?? 0.25,
                kind: opts.kind,
            }),
            signal: opts.signal || AbortSignal.timeout(12_000),
        });
        if (!resp.ok) return empty;
        const data = await resp.json();
        const result: WikiExploreConceptsResponse = {
            goal_preview: data.goal_preview,
            total_indexed: data.total_indexed,
            candidates_scored: data.candidates_scored,
            strong: data.strong || [],
            adjacent: data.adjacent || [],
            weak: data.weak || [],
            reason: data.reason,
        };
        _exploreCache.set(cacheKey, { expires: Date.now() + EXPLORE_CACHE_TTL_MS, data: result });
        return result;
    } catch (e: any) {
        const isAbort = e?.name === 'AbortError' || /aborted/i.test(e?.message || '');
        if (!isAbort) console.warn('[exploreConcepts] error:', e?.message || e);
        return empty;
    }
}

/**
 * Keyword pre-fetch: extract meaningful tokens from a user message and
 * return matching wiki article bodies. Used by the chat service to enrich
 * a single turn's context with topic-relevant real text, WITHOUT requiring
 * the AI to call the retrieval tool directly (that's the next iteration).
 */
export async function prefetchArticlesForMessage(message: string, opts: {
    limit?: number;
    maxCharsPerArticle?: number;
    minChars?: number;
    kind?: string;
    engagementGoal?: string;       // Phase 2.5: blends with chat question for retrieval
    goalBlendWeight?: number;      // Phase 2.5: 0..1, default 0.30 (chat dominates, goal biases)
} = {}): Promise<WikiArticleBody[]> {
    const trimmed = (message || '').trim();
    if (trimmed.length < 8) return [];
    // Use the raw message as the query — proxy tokenizes and scores server-side.
    // engagementGoal (when provided) biases the retrieval embedding toward
    // archive content relevant to the broader engagement context. Strengthens
    // recall of articles graded high-relevance at collection time but only
    // weakly cosine-matched to a narrow chat question.
    return fetchWikiArticles({
        query: trimmed,
        limit: opts.limit ?? 6,
        maxCharsPerArticle: opts.maxCharsPerArticle ?? 12_000,
        minChars: opts.minChars ?? 500,
        kind: opts.kind,
        engagementGoal: opts.engagementGoal,
        goalBlendWeight: opts.goalBlendWeight,
    });
}
