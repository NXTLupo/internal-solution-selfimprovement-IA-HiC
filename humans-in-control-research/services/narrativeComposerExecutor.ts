// narrativeComposerExecutor.ts
//
// Concrete ToolExecutor implementation. Maps the six narrative-composer
// tools onto existing HiC infrastructure:
//   - search_corpus / extract_quotes / extract_stats → /api/wiki/fetch-articles
//   - get_themes / get_personas / get_deliverable    → analysis session state
//
// The executor takes the current session state at construction and stays
// stateless thereafter. Each tool call hits the proxy or reads from the
// already-captured session — no globals.

import type {
  ToolExecutor,
  SearchCorpusInput,
  SearchCorpusResult,
  GetThemesResult,
  GetPersonasResult,
  GetDeliverableInput,
  GetDeliverableResult,
  ExtractQuotesInput,
  ExtractQuotesResult,
  ExtractStatsInput,
  ExtractStatsResult,
} from './narrativeComposerTools';

import { fetchWikiArticles, type WikiArticleBody } from './wikiIndexService';

// ============================================================================
// SESSION STATE — what the executor reads from to answer get_* tools
// ============================================================================

export interface ExecutorSessionState {
  engagementGoal: string;
  themes?: Array<{
    name: string;
    description: string;
    quote?: string;
    citations?: Array<{
      sourceFile?: string;
      sourceName?: string;
      text?: string;
      url?: string;
      author?: string;
      publicationDate?: string;
    }>;
    isCrossDocument?: boolean;
    status?: string;
  }>;
  personas?: Array<{
    name?: string;
    role?: string;
    demographics?: string;
    quote?: string;
    bio?: string;
    goals?: { life?: string; experience?: string; functional?: string };
    painPoints?: Array<unknown>;
    motivations?: Array<unknown>;
    confidenceLevel?: string;
  }>;
  // Deliverables keyed by kind (matches narrativeComposerTools.GetDeliverableInput.kind)
  deliverables?: {
    journey_map?: unknown;
    recommendations?: unknown;
    roadmap?: unknown;
    gap_analysis?: unknown;
    tech_arch?: unknown;
    tech_audit?: unknown;
    competitive?: unknown;
    prd?: unknown;
    strategic_report?: unknown;
  };
}

// ============================================================================
// SCOPE → KIND MAPPING
// ============================================================================
// The proxy's kind filter accepts: 'article' (external research), 'transcript',
// 'upload' (client docs), 'source' (source-summary). For our scope semantics:
//   external_only → kind=article (and transcripts are external too)
//   uploaded_only → kind=upload
//   both          → no kind filter

function scopeToKindFilter(scope: 'external_only' | 'uploaded_only' | 'both'): string | undefined {
  if (scope === 'uploaded_only') return 'upload';
  // For external_only and both, we don't pass kind filter — multi-kind retrieval
  // is what we want; the source-classification happens on the result side via
  // article.kind inspection when we map results back to citations.
  return undefined;
}

function articleScope(article: WikiArticleBody): 'external' | 'uploaded' | 'analysis' {
  const kind = (article.kind || '').toLowerCase();
  if (kind === 'upload') return 'uploaded';
  if (kind === 'analysis' || kind === 'theme-synthesis') return 'analysis';
  return 'external';
}

// ============================================================================
// HELPER — convert a WikiArticleBody into a SearchCorpusResult chunk
// ============================================================================

// Per-chunk text size cap. Keeping this LEAN is what prevents context
// explosion across 8-10 tool calls. 800 chars * 6 chunks * 8 calls = ~38KB
// of tool-result payload — well within budget. The model has the full
// chunk_id and source name to cite; it doesn't need the entire body.
const CHUNK_TEXT_CHARS = 800;

// ============================================================================
// GOAL-RELEVANCE FILTER (cross-engagement contamination guard)
// ============================================================================
// The wiki accumulates content across all engagements. A "challenges" query
// for engagement A will retrieve high-cosine-similarity articles from
// engagements B, C, D — often with nothing to do with A's topic. This guard
// applies the same fidelity-overlap pattern that the proxy uses for query
// refinement (refineSearchQueries), but at the result level: tokenize the
// engagement goal into keywords, count how many appear in each article's
// title + body preview, and drop articles below a minimum overlap ratio.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'their', 'they',
  'them', 'these', 'those', 'are', 'was', 'were', 'will', 'would', 'should',
  'could', 'have', 'has', 'had', 'about', 'above', 'across', 'after', 'before',
  'being', 'between', 'each', 'few', 'further', 'more', 'most', 'other',
  'some', 'such', 'than', 'then', 'there', 'through', 'until', 'very',
  'what', 'when', 'where', 'which', 'while', 'why', 'around', 'because',
  'against', 'beyond', 'during', 'within', 'without', 'upon',
  // Generic narrative terms that match almost any strategic content — a goal
  // like "challenges and opportunities" should NOT be reduced to those words
  'challenges', 'opportunities', 'challenge', 'opportunity', 'strategy',
  'strategic', 'analysis', 'framework', 'approach', 'context', 'goals',
  'goal', 'objectives', 'overview', 'summary', 'narrative',
]);

function extractGoalKeywords(goal: string): string[] {
  if (!goal) return [];
  return goal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
}

function goalRelevanceFilter(
  articles: WikiArticleBody[],
  goal: string,
  minOverlap: number,
): WikiArticleBody[] {
  const keywords = extractGoalKeywords(goal);
  // If the goal is very short or has no signal terms, don't filter at all —
  // it would drop everything. Better to let the model see results than over-filter.
  if (keywords.length < 2) return articles;

  return articles.filter(a => {
    const haystack = ((a.title || '') + ' ' + (a.content || '').slice(0, 2000)).toLowerCase();
    let hits = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) hits += 1;
    }
    const overlap = hits / keywords.length;
    return overlap >= minOverlap;
  });
}

// ============================================================================
// LLM RERANK (Stage 3 — cross-encoder pattern)
// ============================================================================
// After cosine bi-encoder retrieval (Stage 1) and goal-relevance keyword
// filter (Stage 2), we have N candidates that all pass minimum bars but
// may not be ordered by true relevance. Bi-encoders score each chunk in
// isolation; a cross-encoder (the LLM here) sees the goal+question+chunk
// together and can reason about whether the chunk *actually answers* the
// question rather than just topically overlapping.
//
// The proxy's /api/wiki/rerank endpoint is responsible for the actual LLM
// call, caching, and identity-fallback on failure. Here we just shape the
// request, send it, and reorder our article array by the returned scores.
//
// Failure mode: any error → return the input array unchanged. Retrieval
// must never break because rerank is unavailable.

const RERANK_PROXY = 'http://localhost:5012';

interface RerankOutcome {
  articles: WikiArticleBody[];
  // Score (0..1) per article in the returned order. null = no rerank score
  // (e.g., fallback path executed because the rerank call failed).
  scores: Array<number | null>;
}

async function rerankArticles(
  articles: WikiArticleBody[],
  goal: string,
  question: string,
  modelId?: string,
): Promise<RerankOutcome> {
  // Skip rerank for trivial inputs — not worth an LLM call
  if (articles.length < 2) {
    return { articles, scores: articles.map(() => null) };
  }
  if (!goal && !question) {
    return { articles, scores: articles.map(() => null) };
  }

  // Build candidate payload. chunk_id here is the article id + position so
  // we can map back to the original article afterwards.
  const candidates = articles.map((a, i) => ({
    chunk_id: `${a.id}_${i}`,
    text: (a.content || '').slice(0, CHUNK_TEXT_CHARS),
    source_name: a.source && a.title ? `${a.source}: ${a.title}` : (a.title || a.source || 'Unknown'),
  }));

  const idIndex = new Map<string, number>();
  candidates.forEach((c, i) => idIndex.set(c.chunk_id, i));

  try {
    const resp = await fetch(`${RERANK_PROXY}/api/wiki/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        question,
        candidates,
        // 2026-05-03 — Default rerank migrated to Gemini Flash (3% of Opus
        // cost; same quality for chunk-relevance scoring). Caller can still
        // override via modelId param.
        model: modelId || 'gemini-2.5-flash',
      }),
    });
    if (!resp.ok) {
      // Proxy returned non-200 — fall back to input order
      return { articles, scores: articles.map(() => null) };
    }
    const json = await resp.json();
    const ranked = Array.isArray(json?.ranked) ? json.ranked : [];
    if (ranked.length === 0) {
      return { articles, scores: articles.map(() => null) };
    }

    // Reorder articles per rerank scores. Any candidate the rerank dropped
    // (shouldn't happen — proxy backfills at score 0) is appended at the end.
    const reordered: WikiArticleBody[] = [];
    const reorderedScores: Array<number | null> = [];
    const consumed = new Set<number>();
    for (const r of ranked) {
      const cid = String(r?.chunk_id || '');
      const idx = idIndex.get(cid);
      if (typeof idx === 'number' && !consumed.has(idx)) {
        reordered.push(articles[idx]);
        const s = Number(r?.score);
        reorderedScores.push(Number.isFinite(s) ? Math.max(0, Math.min(1, s)) : null);
        consumed.add(idx);
      }
    }
    // Append any leftover originals (defensive — shouldn't fire if proxy honors contract)
    articles.forEach((a, i) => {
      if (!consumed.has(i)) {
        reordered.push(a);
        reorderedScores.push(null);
      }
    });
    return { articles: reordered, scores: reorderedScores };
  } catch (e) {
    // Network error, abort signal, malformed JSON — keep retrieval working
    // by falling back to the existing (cosine + keyword) order.
    return { articles, scores: articles.map(() => null) };
  }
}

// ============================================================================

function articleToChunk(
  article: WikiArticleBody,
  score: number,
  idx: number,
  chunkRelevance?: number | null,
): SearchCorpusResult['chunks'][number] {
  // Stable chunk identifier: derive from article id + position in returned set.
  const chunkId = `${article.id}_${idx}`;
  const text = (article.content || '').slice(0, CHUNK_TEXT_CHARS);
  // Article-level relevance (0-100 from frontmatter). Pass through unmodified,
  // including null/undefined for articles graded before relevance scoring existed.
  const articleRelevance =
    typeof article.article_relevance === 'number'
      ? Math.max(0, Math.min(100, article.article_relevance))
      : (article.article_relevance ?? null);
  return {
    chunk_id: chunkId,
    text,
    score,
    chunk_relevance: typeof chunkRelevance === 'number' ? chunkRelevance : (chunkRelevance ?? null),
    article_relevance: articleRelevance,
    source: {
      name: article.source && article.title
        ? `${article.source}: ${article.title}`
        : (article.title || article.source || 'Unknown source'),
      url: article.url,
      publicationDate: article.date,
      scope: articleScope(article),
      wikiPath: article.wikiPath,
    },
  };
}

// ============================================================================
// QUOTE EXTRACTION HEURISTIC
// ============================================================================

// Pulls candidate verbatim quotes (10-50 words) from chunk text.
// Looks for double-quoted spans first; falls back to first 1-2 sentences
// in the chunk if quotes are absent. Each candidate is attributed via
// surrounding context when possible.
function extractCandidateQuotes(
  text: string,
  sourceName: string,
  chunkId: string,
  url: string | undefined,
  max: number,
): Array<{ text: string; attribution: string; role?: string; source_name: string; chunk_id: string; url?: string }> {
  const candidates: Array<{ text: string; attribution: string; role?: string; source_name: string; chunk_id: string; url?: string }> = [];

  // Pattern 1: double-quoted spans, 10-50 words
  const quotedRe = /"([^"]{40,400})"/g;
  let m: RegExpExecArray | null;
  while ((m = quotedRe.exec(text)) !== null && candidates.length < max) {
    const quoted = m[1].trim();
    const wordCount = quoted.split(/\s+/).length;
    if (wordCount < 10 || wordCount > 50) continue;
    // Attribution heuristic: look for "— Name" or "said NAME" within 80 chars after the close quote
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 120);
    const attMatch = after.match(/[—–-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/) || after.match(/said\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    candidates.push({
      text: quoted,
      attribution: attMatch ? attMatch[1] : 'Anonymous',
      source_name: sourceName,
      chunk_id: chunkId,
      url,
    });
  }

  // Pattern 2 fallback: first 1-2 sentences if no quotes found
  if (candidates.length === 0) {
    const sentences = text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => {
        const wc = s.split(/\s+/).length;
        return wc >= 10 && wc <= 50;
      });
    for (const s of sentences.slice(0, max)) {
      candidates.push({
        text: s,
        attribution: 'Source',
        source_name: sourceName,
        chunk_id: chunkId,
        url,
      });
    }
  }

  return candidates;
}

// ============================================================================
// STAT EXTRACTION HEURISTIC
// ============================================================================

// Pulls numeric data points from chunk text. Looks for patterns like:
//   $5.1 billion, 35%, 12-18%, 90-99% accuracy, 1,057 participants, 70 hospitals
// Returns the matched number + ~80 chars of surrounding context as the label.
function extractCandidateStats(
  text: string,
  sourceName: string,
  chunkId: string,
  url: string | undefined,
  max: number,
): Array<{ value: string; label: string; context?: string; source_name: string; chunk_id: string; url?: string }> {
  const candidates: Array<{ value: string; label: string; context?: string; source_name: string; chunk_id: string; url?: string }> = [];

  // Patterns ordered specific → general. First match wins for any given position.
  const patterns: RegExp[] = [
    /\$\s?[\d.]+\s?(?:billion|million|trillion|B|M|T)\b/gi,            // $5.1 billion
    /\b\d{1,3}(?:,\d{3})+\s+[a-z]+(?:\s+[a-z]+)?/gi,                   // 1,057 participants
    /\b\d{1,3}(?:[-–]\d{1,3})?%(?:\s+[a-z]+){0,3}/gi,                  // 35%, 90-99% accuracy
    /\b\d{1,4}\+?\s+[a-z]+(?:\s+[a-z]+){0,2}/gi,                       // 70 hospitals, 3000+ studies
  ];

  const claimed: Array<[number, number]> = [];
  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      if (candidates.length >= max) break;
      // Skip overlapping matches
      const start = m.index, end = m.index + m[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      claimed.push([start, end]);

      const value = m[0].trim().slice(0, 12);
      // Context: ±60 chars
      const ctxStart = Math.max(0, start - 60);
      const ctxEnd = Math.min(text.length, end + 60);
      const context = text.slice(ctxStart, ctxEnd).replace(/\s+/g, ' ').trim();
      // Label: words immediately following the number, up to 60 chars
      const after = text.slice(end, end + 90).replace(/\s+/g, ' ').trim();
      const label = (after.split(/[.!?,;]/)[0] || after).slice(0, 60);

      candidates.push({
        value,
        label: label || 'measurement',
        context,
        source_name: sourceName,
        chunk_id: chunkId,
        url,
      });
    }
    if (candidates.length >= max) break;
  }

  return candidates;
}

// ============================================================================
// PUBLIC FACTORY — build a ToolExecutor for a given session state
// ============================================================================

export function createNarrativeComposerExecutor(
  session: ExecutorSessionState,
): ToolExecutor {
  return {
    async search_corpus(input: SearchCorpusInput): Promise<SearchCorpusResult> {
      // Default to 6 (was 8) and cap at 12 (was 20). Smaller per-call payloads
      // keep the multi-turn message history under control.
      const limit = Math.min(12, input.limit ?? 6);
      const goal = input.engagement_goal ?? session.engagementGoal;

      try {
        // Over-fetch by 2x because the goal-relevance filter below will drop
        // articles that don't pass the fidelity threshold. Without over-fetch
        // the model gets too few results when the wiki has a lot of off-engagement
        // content (which is the common case — wiki accumulates across engagements).
        const articles = await fetchWikiArticles({
          query: input.query,
          kind: scopeToKindFilter(input.scope),
          limit: limit * 2,
          maxCharsPerArticle: 1500,
          engagementGoal: goal,
          // ↑ from 0.40 to 0.70: heavier bias toward goal-relevance in initial
          // ranking. This alone won't prevent off-topic contamination — the
          // hard filter below does that — but it reduces the over-fetch cost.
          goalBlendWeight: 0.70,
        });

        // Filter post-fetch when scope=external_only — exclude any 'upload' articles
        const scopeFiltered = input.scope === 'external_only'
          ? articles.filter(a => articleScope(a) !== 'uploaded')
          : articles;

        // ====== GOAL-RELEVANCE HARD FILTER ======
        // Mirrors the source-aware fidelity guard you built for query
        // refinement, but applied to results. Drop any article whose title +
        // first 2KB of content does not have sufficient keyword overlap with
        // the engagement goal. This prevents cross-engagement wiki content
        // (e.g., "Intelligence Augmentation" articles surfacing during a
        // "Northeastern advancement" query) from leaking into the model's
        // context — which was the root cause of the topic-drift failure.
        const goalFiltered = goalRelevanceFilter(scopeFiltered, goal, /*minOverlap*/ 0.25);

        // ====== STAGE 3: LLM CROSS-ENCODER RERANK ======
        // Cosine + keyword filtering get us "topically related." This stage
        // asks an LLM whether each candidate actually answers the goal +
        // question. Cached server-side by (goal, question, chunk_ids) so a
        // typical session pays the cost once per unique query shape.
        // Falls back to input order on any failure — never breaks retrieval.
        const rerankOutcome = await rerankArticles(
          goalFiltered,
          goal,
          input.query,
          /* modelId */ undefined, // proxy default = gemini-2.5-flash (2026-05-03)
        );

        const finalArticles = rerankOutcome.articles.slice(0, limit);
        const finalScores = rerankOutcome.scores.slice(0, limit);
        const chunks = finalArticles.map((a, i) => {
          // Composite display score: prefer the rerank cross-encoder score
          // when available (most informative for ordering); otherwise keep
          // the legacy positional fallback so back-compat consumers still
          // see a non-null value.
          const chunkRel = finalScores[i] ?? null;
          const composite = chunkRel ?? (1.0 - i * 0.05);
          return articleToChunk(a, composite, i, chunkRel);
        });
        return {
          chunks,
          total_returned: chunks.length,
          query_echoed: input.query,
          scope_used: input.scope,
        };
      } catch (e) {
        // Graceful degradation per wikiIndexService contract
        return { chunks: [], total_returned: 0, query_echoed: input.query, scope_used: input.scope };
      }
    },

    async get_themes(): Promise<GetThemesResult> {
      const themes = (session.themes ?? []).map(t => ({
        name: t.name,
        description: t.description,
        quote: t.quote,
        citations: (t.citations ?? []).map(c => ({
          sourceFile: c.sourceFile ?? '',
          sourceName: c.sourceName ?? '',
          text: c.text,
          url: c.url,
          author: c.author,
          publicationDate: c.publicationDate,
          scope: 'analysis' as const,
        })),
        isCrossDocument: t.isCrossDocument,
        status: t.status,
      }));
      return { themes, count: themes.length };
    },

    async get_personas(): Promise<GetPersonasResult> {
      const personas = (session.personas ?? []).map(p => ({
        name: p.name ?? 'Unnamed',
        role: p.role ?? '',
        demographics: p.demographics,
        quote: p.quote,
        bio: p.bio,
        goals: p.goals,
        painPoints: (p.painPoints ?? []).map(pp => {
          if (typeof pp === 'string') return { description: pp };
          if (pp && typeof pp === 'object') {
            const o = pp as Record<string, unknown>;
            return { description: String(o.description ?? o.text ?? ''), citation: o.citation as never };
          }
          return { description: '' };
        }),
        motivations: (p.motivations ?? []).map(mm => {
          if (typeof mm === 'string') return { description: mm };
          if (mm && typeof mm === 'object') {
            const o = mm as Record<string, unknown>;
            return { description: String(o.description ?? o.text ?? ''), citation: o.citation as never };
          }
          return { description: '' };
        }),
        confidenceLevel: p.confidenceLevel,
      }));
      return { personas, count: personas.length };
    },

    async get_deliverable(input: GetDeliverableInput): Promise<GetDeliverableResult> {
      const data = (session.deliverables ?? {})[input.kind as keyof NonNullable<ExecutorSessionState['deliverables']>] ?? null;
      return { kind: input.kind, data, exists: data !== null && data !== undefined };
    },

    async extract_quotes(input: ExtractQuotesInput): Promise<ExtractQuotesResult> {
      const max = Math.min(10, input.max ?? 5);
      // Re-use search_corpus to retrieve candidate articles, then heuristic-extract.
      const search = await this.search_corpus({
        query: input.filter,
        scope: input.scope,
        limit: 10,
      });
      const all: ExtractQuotesResult['quotes'] = [];
      for (const c of search.chunks) {
        if (all.length >= max) break;
        const candidates = extractCandidateQuotes(c.text, c.source.name, c.chunk_id, c.source.url, max - all.length);
        all.push(...candidates);
      }
      return { quotes: all.slice(0, max), total_returned: Math.min(all.length, max) };
    },

    async extract_stats(input: ExtractStatsInput): Promise<ExtractStatsResult> {
      const max = Math.min(8, input.max ?? 4);
      const search = await this.search_corpus({
        query: input.filter,
        scope: input.scope,
        limit: 10,
      });
      const all: ExtractStatsResult['stats'] = [];
      for (const c of search.chunks) {
        if (all.length >= max) break;
        const candidates = extractCandidateStats(c.text, c.source.name, c.chunk_id, c.source.url, max - all.length);
        all.push(...candidates);
      }
      return { stats: all.slice(0, max), total_returned: Math.min(all.length, max) };
    },
  };
}

// ============================================================================
// EXECUTOR + TRACKER WRAPPER — registers chunks with citation tracker on every tool call
// ============================================================================

import type { CitationTracker } from './narrativeComposerTools';

export function wrapWithTracker(executor: ToolExecutor, tracker: CitationTracker): ToolExecutor {
  const register = (chunks: SearchCorpusResult['chunks']) => {
    tracker.register(chunks.map(c => ({ chunk_id: c.chunk_id, source: { name: c.source.name, scope: c.source.scope } })));
  };
  return {
    async search_corpus(input) {
      const r = await executor.search_corpus(input);
      register(r.chunks);
      return r;
    },
    async get_themes() {
      return executor.get_themes();
    },
    async get_personas() {
      return executor.get_personas();
    },
    async get_deliverable(input) {
      return executor.get_deliverable(input);
    },
    async extract_quotes(input) {
      const r = await executor.extract_quotes(input);
      // Register the chunk_ids the quotes claim
      tracker.register(r.quotes.map(q => ({
        chunk_id: q.chunk_id,
        source: { name: q.source_name, scope: input.scope === 'uploaded_only' ? 'uploaded' as const : 'external' as const },
      })));
      return r;
    },
    async extract_stats(input) {
      const r = await executor.extract_stats(input);
      tracker.register(r.stats.map(s => ({
        chunk_id: s.chunk_id,
        source: { name: s.source_name, scope: input.scope === 'uploaded_only' ? 'uploaded' as const : 'external' as const },
      })));
      return r;
    },
  };
}
