/**
 * corpusSubstrate.ts - Step 5 of plans/volume-to-insight-substrate-2026-06-03.md
 *
 * Thin TypeScript client over the two proxy substrate endpoints
 * (POST /api/corpus/scope + POST /api/corpus/retrieve), plus a
 * yield-ledger event recorder consumers call at every repointed site.
 *
 * The contract this file enforces:
 *   - Consumers do NOT cap by per-source N (e.g. `redditDeepItems.slice(0,50)`).
 *     They pass a `{types, industries, engagement, min_relevance}` filter and
 *     a `{max_count, max_chars}` budget. The proxy ranks by manifest relevance
 *     (deterministic, stable sort) and stops at the budget.
 *   - For evidence retrieval, consumers ask for a coverage-spanning set via
 *     `retrieveCoverage()`, which expands the goal into <=6 fixed deterministic
 *     angles (or accepts an explicit `sub_queries` array) and round-robin
 *     merges the results so the returned set SPANS angles instead of
 *     over-representing one neighborhood.
 *   - Every call site records a yield-ledger event so Step 6 can surface
 *     docs-in -> retrieved -> candidates -> shipped as a standing telemetry.
 *
 * Determinism: same engagement + same goal + same budget MUST produce the
 * same returned set. The proxy is responsible for the stable sort; this
 * client is responsible for NOT injecting randomness (no Math.random, no
 * Date.now-derived seeds passed downstream).
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

// ----------------------------------------------------------------------------
// Substrate types - mirrors the proxy response envelopes verbatim.
// ----------------------------------------------------------------------------

export interface CorpusScopeRequest {
    /** Manifest record types to include, e.g. ['social-post','article','upload']. */
    types?: string[];
    /** Industry tags to require (any-overlap). */
    industries?: string[];
    /** Engagement slug to require (substring match against wikiPath / title). */
    engagement?: string;
    /** Drop records whose manifest relevance is below this floor. 0 = no floor. */
    min_relevance?: number;
    /** Max records to return. 0 = uncapped (NOT recommended for prompt input). */
    max_count?: number;
    /** Max total char budget across returned records. 0 = uncapped. */
    max_chars?: number;
}

export interface CorpusScopeRecord {
    wikiPath: string;
    type: string;
    title: string;
    relevance: number;
    chars: number;
    industries: string[];
    summary: string;
}

export interface CorpusScopeResponse {
    /** How many manifest records matched the filters (BEFORE budget). */
    scope_size: number;
    /** How many records the budget allowed through. */
    returned: number;
    /** Total chars across returned records. */
    total_chars: number;
    budget: { max_count: number; max_chars: number; min_relevance: number };
    filters: { types: string[]; industries: string[]; engagement: string };
    records: CorpusScopeRecord[];
}

export interface CorpusRetrieveRequest {
    goal: string;
    /** Optional explicit angles. If omitted, proxy uses 6 fixed deterministic templates. */
    sub_queries?: string[];
    /** How many angles to expand the goal into. Max 6. Default 5. */
    angles?: number;
    /** Top-k per angle before round-robin merge. Default 8. */
    per_angle?: number;
    /** Cap on merged set size. Default 24. */
    max_total?: number;
    /** Manifest type filter passed down to /api/wiki/fetch-articles. */
    kind?: string;
    /** Manifest source filter passed down to /api/wiki/fetch-articles. */
    source?: string;
    /** Body truncation budget per article. Default 20000. */
    maxCharsPerArticle?: number;
}

export interface CorpusRetrieveArticle {
    id?: string;
    wikiPath?: string;
    title?: string;
    source?: string;
    date?: string;
    url?: string;
    content?: string;
    matched_chunks?: Array<{ text: string; score?: number }>;
    [k: string]: any;
}

export interface CorpusRetrieveResponse {
    goal: string;
    angles: string[];
    per_angle_counts: Record<string, number>;
    /** Sum of per-angle hits BEFORE dedup. */
    scoped_in: number;
    /** Returned set size AFTER dedup + budget. */
    returned: number;
    articles: CorpusRetrieveArticle[];
}

// ----------------------------------------------------------------------------
// Yield-ledger ring buffer - Step 5 records, Step 6 surfaces.
// ----------------------------------------------------------------------------

/**
 * A single funnel data point emitted at a repointed consumer call site.
 * Step 6 (yield-ledger live surface + held-out scoring) reads from
 * getYieldEvents() and appends rendered rows to wiki/synthesis/yield-ledger.md.
 */
export interface YieldLedgerEvent {
    ts: number;
    /** Where the event fired, e.g. 'themes.archive-aug', 'topic-model.scope', 'personas.prefetch'. */
    consumer: string;
    /** Engagement slug if known. */
    engagement?: string;
    /** First 80 chars of the research goal for context. */
    goal?: string;
    /** docs in manifest scope (BEFORE budget). */
    scope_size?: number;
    /** docs the consumer actually consumed. */
    retrieved?: number;
    /** candidates the consumer downstream produced (e.g. themes, personas), if known yet. */
    candidates?: number;
    /** items shipped to the user, if known yet. */
    shipped?: number;
    /** Free-form annotation (fallback fired, starvation observed, etc.). */
    note?: string;
}

const RING_CAP = 256;
const _ring: YieldLedgerEvent[] = [];

export function recordYieldEvent(evt: Omit<YieldLedgerEvent, 'ts'>): void {
    const e: YieldLedgerEvent = { ts: Date.now(), ...evt };
    _ring.push(e);
    if (_ring.length > RING_CAP) _ring.splice(0, _ring.length - RING_CAP);
    try {
        // Structured console log so Step 6 (and devtools today) can grep
        // [yield-ledger] in proxy + browser logs without changing data flow.
        // eslint-disable-next-line no-console
        console.info(
            `[yield-ledger] consumer=${e.consumer}` +
            (e.engagement ? ` engagement=${e.engagement}` : '') +
            (e.scope_size !== undefined ? ` scope=${e.scope_size}` : '') +
            (e.retrieved !== undefined ? ` retrieved=${e.retrieved}` : '') +
            (e.candidates !== undefined ? ` candidates=${e.candidates}` : '') +
            (e.shipped !== undefined ? ` shipped=${e.shipped}` : '') +
            (e.note ? ` note="${e.note}"` : '')
        );
    } catch { /* non-fatal */ }
}

function getYieldEvents(): YieldLedgerEvent[] {
    return _ring.slice();
}


// ----------------------------------------------------------------------------
// API: scope + retrieve.
// ----------------------------------------------------------------------------

/**
 * Filter the persistent manifest deterministically. Replaces 50/subreddit and
 * other arbitrary per-source caps with budget-aware relevance ranking over
 * the whole corpus. Same inputs -> same returned set.
 */
async function scopeCorpus(req: CorpusScopeRequest): Promise<CorpusScopeResponse> {
    const resp = await fetch(`${PROXY_BASE}/api/corpus/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            types: req.types,
            industries: req.industries,
            engagement: req.engagement,
            min_relevance: req.min_relevance ?? 0,
            max_count: req.max_count ?? 0,
            max_chars: req.max_chars ?? 0,
        }),
    });
    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`scopeCorpus: HTTP ${resp.status}: ${t.slice(0, 200)}`);
    }
    return resp.json();
}

/**
 * Multi-angle retrieval + coverage merge (NotebookLM Pattern 4). Expands the
 * goal into <=6 fixed deterministic angles (or uses the explicit sub_queries
 * passed in), fans out per angle to /api/wiki/fetch-articles, round-robin
 * merges with dedup so the returned set SPANS angles. Default budget: 24.
 */
export async function retrieveCoverage(req: CorpusRetrieveRequest): Promise<CorpusRetrieveResponse> {
    const resp = await fetch(`${PROXY_BASE}/api/corpus/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            goal: req.goal,
            sub_queries: req.sub_queries,
            angles: req.angles ?? 5,
            per_angle: req.per_angle ?? 8,
            max_total: req.max_total ?? 24,
            kind: req.kind,
            source: req.source,
            maxCharsPerArticle: req.maxCharsPerArticle ?? 20000,
        }),
    });
    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`retrieveCoverage: HTTP ${resp.status}: ${t.slice(0, 200)}`);
    }
    return resp.json();
}

// ----------------------------------------------------------------------------
// Consumer helper: prefetch substrate evidence for a downstream deliverable.
//
// Use case: personas, recommendations, journey-map, roadmap, barriers consume
// in-session GenAISession context but historically had NO archive evidence
// downstream of themes. This helper pulls a coverage-spanning evidence block
// (or returns null if the corpus is empty) the consumer can prepend to the
// prompt as a SUBSTRATE EVIDENCE section. Format mirrors the existing
// CROSS-ENGAGEMENT WIKI ARCHIVE block in geminiService.ts::generateThemes so
// citation discipline carries through downstream.
// ----------------------------------------------------------------------------

export interface SubstratePrefetchOpts {
    consumer: string;            // 'personas' | 'recommendations' | 'journey' | 'roadmap' | 'barriers'
    goal: string;
    engagement?: string;
    /** Override the default angle count for this consumer. Default 5. */
    angles?: number;
    /** Per-angle top-k. Default 6 (smaller than themes because downstream uses fewer passages). */
    perAngle?: number;
    /** Merged-set ceiling. Default 18. */
    maxTotal?: number;
    /** Per-article char truncation. Default 6500. */
    maxCharsPerArticle?: number;
}

export interface SubstratePrefetchResult {
    /** Already-formatted SUBSTRATE EVIDENCE block ready to prepend to a prompt.
     *  Empty string if no evidence retrieved. */
    block: string;
    /** Raw articles for citation handling. */
    articles: CorpusRetrieveArticle[];
    /** The angle list the proxy ran, for prompt transparency. */
    angles: string[];
    /** Whether the call returned zero articles (starvation signal). */
    starved: boolean;
}

export async function prefetchSubstrateForDeliverable(
    opts: SubstratePrefetchOpts,
): Promise<SubstratePrefetchResult> {
    const t0 = Date.now();
    let res: CorpusRetrieveResponse | null = null;
    try {
        res = await retrieveCoverage({
            goal: opts.goal,
            angles: opts.angles ?? 5,
            per_angle: opts.perAngle ?? 6,
            max_total: opts.maxTotal ?? 18,
            maxCharsPerArticle: opts.maxCharsPerArticle ?? 6500,
        });
    } catch (e: any) {
        recordYieldEvent({
            consumer: `${opts.consumer}.prefetch`,
            engagement: opts.engagement,
            goal: (opts.goal || '').slice(0, 80),
            scope_size: 0,
            retrieved: 0,
            note: `prefetch failed: ${(e?.message || String(e)).slice(0, 120)}`,
        });
        return { block: '', articles: [], angles: [], starved: true };
    }

    const articles = res.articles || [];
    const starved = articles.length === 0;

    recordYieldEvent({
        consumer: `${opts.consumer}.prefetch`,
        engagement: opts.engagement,
        goal: (opts.goal || '').slice(0, 80),
        scope_size: res.scoped_in,
        retrieved: articles.length,
        note: starved
            ? `starvation: 0 articles across ${res.angles.length} angles in ${Date.now() - t0}ms`
            : `coverage: ${articles.length} articles across ${res.angles.length} angles in ${Date.now() - t0}ms`,
    });

    if (starved) return { block: '', articles: [], angles: res.angles, starved: true };

    const lines: string[] = [];
    let totalChars = 0;
    const BUDGET = 80_000;
    for (let i = 0; i < articles.length; i++) {
        const a: any = articles[i];
        const matched = Array.isArray(a.matched_chunks) && a.matched_chunks.length > 0
            ? a.matched_chunks.map((c: any) => c.text).join('\n---\n')
            : (a.content || '').slice(0, opts.maxCharsPerArticle ?? 6500);
        if (!matched.trim()) continue;
        const header = `[SUBSTRATE_${String(i + 1).padStart(3, '0')}] ${a.title || a.source || 'Untitled'}` +
            `${a.source ? ` · Source: ${a.source}` : ''}` +
            `${a.date ? ` · ${a.date}` : ''}` +
            `${a.url ? `\nURL: ${a.url}` : ''}`;
        const block = `${header}\n${matched}\n`;
        if (totalChars + block.length > BUDGET) break;
        lines.push(block);
        totalChars += block.length;
    }

    if (lines.length === 0) return { block: '', articles, angles: res.angles, starved: true };

    const block = `=== SUBSTRATE EVIDENCE - multi-angle coverage retrieval from the corpus manifest ===
The following ${lines.length} passages were retrieved from the persistent corpus
manifest via ${res.angles.length}-angle coverage retrieval (NotebookLM Pattern 4 -
round-robin merge across angles so the set SPANS the semantic neighborhood
instead of over-representing one cluster). They are first-class evidence for
${opts.consumer}.

Treat each passage as a CITABLE SOURCE - they have SUBSTRATE_NNN identifiers
distinct from in-session CHUNK_NNN markers. Cite by sourceName (e.g. "Higher
Ed Dive: <title>"), not by SUBSTRATE_NNN itself.

ANGLES THAT INFORMED THIS RETRIEVAL:
${res.angles.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

${lines.join('\n')}
=== END SUBSTRATE EVIDENCE ===

`;

    return { block, articles, angles: res.angles, starved: false };
}
