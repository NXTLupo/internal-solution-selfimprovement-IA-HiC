// services/chatQueryPlanner.ts
// Multi-angle query decomposition + cross-encoder reranking on the chat path.
// Implements the NotebookLM-inspired retrieval depth pattern.
//
// 2026-05-24 — Phase 2 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
//
// Pipeline:
//   user_message
//     → query_expansion (Haiku 4.5 @ temp=0)
//       → 3-5 sub-queries spanning angles
//     → parallel embedding retrieval (k=8 per sub-query)
//     → merge + dedup by chunk_id
//     → cross-encoder reranking (Haiku 4.5 batched scoring 1-5)
//       → keep top 12-15
//     → final synthesis (Opus 4.7 with full context)
//
// Pairs with .claude/skills/wiki-query-expander/SKILL.md and
// .claude/skills/wiki-reranker/SKILL.md (existing skill specs).

import { parseJSONWithRepair } from './aiOutputRepair';
import { stableHash, withResilience, isThrottleError, type DegradationEvent } from './multiModelResilience';

export type SubQuery = {
    id: string;                       // q1, q2, ...
    query: string;                    // the actual sub-query text
    angle: 'definition' | 'mechanism' | 'evidence' | 'counter_evidence' | 'second_order' | 'named_entities';
    priority: 'high' | 'medium' | 'low';
};

export type RetrievedChunk = {
    chunk_id: string;
    body: string;
    source: string;
    score?: number;                   // embedding similarity
    _rerank_score?: number;           // post-rerank
    _pre_rerank_position?: number;
    _post_rerank_position?: number;
    _matched_sub_queries?: string[];  // which sub-queries this chunk surfaced for
};

export type QueryPlan = {
    user_message: string;
    sub_queries: SubQuery[];
    plan_hash: string;
    expanded_via: 'haiku-4.5' | 'gemini-2.5-flash' | 'cache_hit';
};


// ──────────────────────────────────────────────────────────────────────────
// Cache for sub-query expansion (user_message_hash + corpus_hash → plan)
// ──────────────────────────────────────────────────────────────────────────

const _planCache = new Map<string, QueryPlan>();

function planCacheKey(userMessage: string, corpusHash: string): string {
    return stableHash(userMessage, corpusHash);
}


// ──────────────────────────────────────────────────────────────────────────
// Stage 1 — Query expansion
// ──────────────────────────────────────────────────────────────────────────

const QUERY_EXPANSION_PROMPT = `You are decomposing a research question into 3-5 sub-questions to maximize retrieval recall across a heterogeneous corpus (academic, news, government data, social media, client uploads).

Decompose the user's question into sub-queries spanning these angles:
1. **definition** — What is X? Background, terminology, scope.
2. **mechanism** — How does X work? Causal pathways, intermediate steps.
3. **evidence** — What measurements / data / case studies support X?
4. **counter_evidence** — What contradicts X? Failures, exceptions, opposing views.
5. **second_order** — What does X enable / preclude downstream?
6. **named_entities** — Which specific organizations / people / products are involved?

Pick 3-5 angles MOST RELEVANT to the user's question. Don't force all six.

Return ONLY a JSON array, one object per sub-query:
[
  {"id": "q1", "query": "...", "angle": "definition", "priority": "high"},
  ...
]

User question:
{{USER_MESSAGE}}

Optional context about the corpus topic:
{{CORPUS_CONTEXT}}
`;


async function callHaikuJSON<T>(
    prompt: string,
    proxyBase: string,
    purpose: string,
): Promise<T> {
    const { result } = await withResilience<T>({
        primary: 'anthropic',
        fallbacks: ['gemini'],
        stage: `query_expansion:${purpose}`,
        is429: isThrottleError,
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 800,
                    temperature: 0,
                    messages: [{ role: 'user', content: prompt }],
                }
                : {
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: {
                        temperature: 0,
                        responseMimeType: 'application/json',
                    },
                };
            const resp = await fetch(`${proxyBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error(`${provider} HTTP ${resp.status}: ${text.slice(0, 300)}`);
            }
            const data = await resp.json();
            const textOut = provider === 'anthropic'
                ? (data.content?.[0]?.text ?? '')
                : (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
            return parseJSONWithRepair<T>(textOut, {
                calling_context: `query_expansion:${purpose}:${provider}`,
            });
        },
    });
    return result;
}


export async function expandQuery(
    userMessage: string,
    corpusContext: string,
    corpusHash: string,
    proxyBase: string = 'http://localhost:5012',
): Promise<QueryPlan> {
    const cacheKey = planCacheKey(userMessage, corpusHash);
    const cached = _planCache.get(cacheKey);
    if (cached) {
        return { ...cached, expanded_via: 'cache_hit' };
    }

    const prompt = QUERY_EXPANSION_PROMPT
        .replace('{{USER_MESSAGE}}', userMessage)
        .replace('{{CORPUS_CONTEXT}}', corpusContext || '(no additional context)');

    const subQueries = await callHaikuJSON<SubQuery[]>(prompt, proxyBase, 'expand');

    // Validate shape; clamp to 3-5 if model returned outside range
    const validated = (Array.isArray(subQueries) ? subQueries : [])
        .filter(q => q && typeof q.query === 'string' && q.query.trim())
        .slice(0, 5);
    if (validated.length === 0) {
        // Fallback: just use the user message as a single q1
        validated.push({
            id: 'q1',
            query: userMessage,
            angle: 'evidence',
            priority: 'high',
        });
    }
    // Ensure ids
    validated.forEach((q, i) => { q.id = q.id || `q${i + 1}`; });

    const plan: QueryPlan = {
        user_message: userMessage,
        sub_queries: validated,
        plan_hash: cacheKey,
        expanded_via: 'haiku-4.5',
    };
    _planCache.set(cacheKey, plan);
    return plan;
}


// ──────────────────────────────────────────────────────────────────────────
// Stage 2 — Parallel embedding retrieval
// ──────────────────────────────────────────────────────────────────────────

export type RetrievalFn = (query: string, k: number) => Promise<RetrievedChunk[]>;

export async function retrievePerSubQuery(
    plan: QueryPlan,
    retrieve: RetrievalFn,
    kPerQuery: number = 8,
): Promise<RetrievedChunk[]> {
    const results = await Promise.all(
        plan.sub_queries.map(async (sq) => {
            const chunks = await retrieve(sq.query, kPerQuery).catch(() => [] as RetrievedChunk[]);
            return chunks.map(c => ({ ...c, _matched_sub_queries: [sq.id] }));
        })
    );

    // Merge + dedup by chunk_id; preserve which sub-queries matched
    const byId = new Map<string, RetrievedChunk>();
    for (const chunkList of results) {
        for (const chunk of chunkList) {
            const existing = byId.get(chunk.chunk_id);
            if (existing) {
                existing._matched_sub_queries = Array.from(new Set([
                    ...(existing._matched_sub_queries ?? []),
                    ...(chunk._matched_sub_queries ?? []),
                ]));
                // Keep the higher embedding score
                if ((chunk.score ?? 0) > (existing.score ?? 0)) {
                    existing.score = chunk.score;
                }
            } else {
                byId.set(chunk.chunk_id, { ...chunk });
            }
        }
    }
    return Array.from(byId.values());
}


// ──────────────────────────────────────────────────────────────────────────
// Stage 3 — Cross-encoder reranking
// ──────────────────────────────────────────────────────────────────────────

const RERANK_PROMPT = `You are a research librarian scoring how directly each chunk below answers the user's question.

USER QUESTION:
{{USER_MESSAGE}}

For each chunk, output a score 1-5:
  5 = directly answers the question (the chunk explicitly contains the answer)
  4 = strongly relevant (chunk supports the answer with named evidence)
  3 = moderately relevant (chunk discusses the topic but doesn't answer)
  2 = tangentially relevant (chunk touches the topic peripherally)
  1 = off-topic

Return ONLY a JSON array of {chunk_id, score, reason}, one per chunk, in the same order:
[
  {"chunk_id": "...", "score": 5, "reason": "directly answers; quoted finding"},
  ...
]

CHUNKS TO SCORE:
{{CHUNKS}}
`;


export async function rerankChunks(
    userMessage: string,
    chunks: RetrievedChunk[],
    proxyBase: string = 'http://localhost:5012',
    keepTop: number = 12,
): Promise<RetrievedChunk[]> {
    if (chunks.length === 0) return chunks;

    // Record pre-rerank positions sorted by embedding score
    const sorted = chunks.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    sorted.forEach((c, i) => { c._pre_rerank_position = i; });

    // Build chunks payload (cap body to ~500 chars per chunk to stay in context)
    const chunksPayload = sorted.map((c, i) =>
        `[${i}] chunk_id=${c.chunk_id} | source=${c.source}\n` +
        `body: ${(c.body || '').slice(0, 500).replace(/\s+/g, ' ')}`
    ).join('\n\n');

    const prompt = RERANK_PROMPT
        .replace('{{USER_MESSAGE}}', userMessage)
        .replace('{{CHUNKS}}', chunksPayload);

    const scores = await callHaikuJSON<Array<{ chunk_id: string; score: number; reason: string }>>(
        prompt, proxyBase, 'rerank'
    ).catch(() => [] as Array<{ chunk_id: string; score: number; reason: string }>);

    // Apply scores by chunk_id (model may reorder or shorten)
    const scoreById = new Map<string, number>();
    for (const s of scores) {
        if (s.chunk_id && typeof s.score === 'number') {
            scoreById.set(s.chunk_id, s.score);
        }
    }

    for (const chunk of sorted) {
        chunk._rerank_score = scoreById.get(chunk.chunk_id) ?? (chunk.score ?? 0) * 5; // fallback: scale embedding to 0-5
    }

    sorted.sort((a, b) => (b._rerank_score ?? 0) - (a._rerank_score ?? 0));
    sorted.forEach((c, i) => { c._post_rerank_position = i; });

    return sorted.slice(0, keepTop);
}


// ──────────────────────────────────────────────────────────────────────────
// Top-level orchestrator
// ──────────────────────────────────────────────────────────────────────────

export type PlannedRetrievalResult = {
    plan: QueryPlan;
    chunks: RetrievedChunk[];
    pre_dedup_count: number;
    post_dedup_count: number;
    final_count: number;
    degradation_events: DegradationEvent[];
};

export async function plannedRetrieval(opts: {
    userMessage: string;
    corpusContext: string;
    corpusHash: string;
    retrieve: RetrievalFn;
    proxyBase?: string;
    kPerSubQuery?: number;
    keepTopAfterRerank?: number;
}): Promise<PlannedRetrievalResult> {
    const proxyBase = opts.proxyBase ?? 'http://localhost:5012';
    const degradationEvents: DegradationEvent[] = [];

    const plan = await expandQuery(opts.userMessage, opts.corpusContext, opts.corpusHash, proxyBase);
    const merged = await retrievePerSubQuery(plan, opts.retrieve, opts.kPerSubQuery ?? 8);
    const preDedupCount = plan.sub_queries.length * (opts.kPerSubQuery ?? 8);
    const postDedupCount = merged.length;
    const reranked = await rerankChunks(opts.userMessage, merged, proxyBase, opts.keepTopAfterRerank ?? 12);

    return {
        plan,
        chunks: reranked,
        pre_dedup_count: preDedupCount,
        post_dedup_count: postDedupCount,
        final_count: reranked.length,
        degradation_events: degradationEvents,
    };
}
