import { currentEngagementSlugOrDerive } from './engagementSlug';
// notebookRetrieval.ts -- 2026-05-19
//
// NotebookLM-style retrieval. Instead of sending the entire 1M+ char corpus
// to the LLM and asking it to "find what's relevant," this module:
//
//   1. Embeds the research goal once (via Gemini gemini-embedding-001 RETRIEVAL_QUERY)
//   2. Retrieves the top-K wiki chunks by cosine similarity to the goal
//   3. Returns a compact, goal-anchored "evidence pack" to prepend to ANY
//      artifact generation prompt
//
// The full corpus is NOT discarded - it stays available as breadth context.
// But the goal-filtered evidence pack is shown FIRST, with strong instructions
// to ground citations in these chunks. The LLM is biased toward the on-topic
// slice without losing fallback access.
//
// This applies UNIFORMLY to every generate*() method in GenAISession:
// themes, personas, journey, gap, recommendations, roadmap, prd, blueprint,
// tech-arch, tech-audit, competitive, strategy-report. One helper, one call
// per session, every artifact benefits.
//
// Composes cleanly with the existing /api/wiki/fetch-articles two-tier
// retrieval (chunked store first, legacy semantic+keyword fallback) - no
// new proxy endpoints needed.

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface RelevantChunk {
    id: string;
    title: string;
    source: string;
    sourceDate: string;
    wikiPath: string;
    /** The actual evidence text, already trimmed to maxCharsPerArticle. */
    content: string;
    /** Article-level relevance (0-1) from collection-time Gemini grading.
     *  Distinct from any retrieval-time similarity score. */
    articleRelevance?: number;
    /** Cosine similarity score the chunked retrieval assigned (0-1). */
    chunkScore?: number;
    /** The most-relevant chunks that matched, if the chunked retriever ran. */
    matchedChunks?: Array<{ section?: string; text: string; score?: number }>;
}

export interface GoalRetrievalOptions {
    /** Maximum articles to return. Default 120 (was 40, 2026-05-20). On a
     *  14-source / ~600-chunk corpus, 40 left ~85% of evidence on the floor.
     *  120 × 7K chars = 840K chars ≈ 210K tokens, well inside the 1M-token
     *  envelope of Gemini 3.1 Pro / Opus 4.7. Proxy enforces a 250 cap. */
    limit?: number;
    /** Max chars per article body. Default 7000 (was 4000, 2026-05-20).
     *  4K truncated mid-section for any moderately long article; 7K lets
     *  most ERIC papers, EdSurge analyses, and Hechinger investigations
     *  through intact. */
    maxCharsPerArticle?: number;
    /** Minimum char count an article needs to be included. Default 500 -
     *  excludes pure-headline stubs. */
    minChars?: number;
    /** How much the engagement goal biases retrieval vs the angle query. 1.0
     *  = pure goal embedding (NotebookLM-style); 0.0 = pure angle. Default
     *  1.0 because for the unified evidence pack we want goal alignment. */
    goalBlendWeight?: number;
    /** Optional kind filter (e.g. "article", "synthesis", "transcript").
     *  Default: all kinds. */
    kind?: string;
}

export interface GoalEvidencePack {
    /** Ready-to-paste evidence block, formatted with chunk headers + bodies. */
    promptBlock: string;
    /** Raw chunks for downstream consumers (citation linking, knowledge
     *  graph builders, etc). */
    chunks: RelevantChunk[];
    /** Counts for logging + UI surfaces. */
    stats: {
        retrieved: number;
        totalChars: number;
        articleSources: string[];
    };
}

/**
 * Retrieve the top-K most goal-relevant chunks from the wiki via embedding
 * similarity. Single call to /api/wiki/fetch-articles which runs the
 * two-tier chunked-then-legacy retrieval pipeline.
 *
 * Failure-isolated: any error returns an empty pack so callers can fall back
 * to the full-corpus behavior.
 */
export async function retrieveGoalRelevantEvidence(
    researchGoal: string,
    options: GoalRetrievalOptions = {},
): Promise<GoalEvidencePack> {
    const empty: GoalEvidencePack = {
        promptBlock: '',
        chunks: [],
        stats: { retrieved: 0, totalChars: 0, articleSources: [] },
    };

    const goal = (researchGoal || '').trim();
    if (goal.length < 8) return empty;

    const limit = options.limit ?? 120;
    const maxCharsPerArticle = options.maxCharsPerArticle ?? 7000;
    const minChars = options.minChars ?? 500;
    const goalBlendWeight = options.goalBlendWeight ?? 1.0;

    let payload: any;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/fetch-articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: goal,
                engagement: currentEngagementSlugOrDerive(goal),   // WS-0 S9: never admit another client's uploads
                engagementGoal: goal,
                goalBlendWeight,
                limit,
                maxCharsPerArticle,
                minChars,
                kind: options.kind,
            }),
            // 180s - chunked retrieval on a 3322-article + 6322-chunk store
            // (post-backfill) can take 30-90s end-to-end on a cold cache.
            // Previous 60s timeout was bumping into the cold-path latency.
            // The proxy's own /api/wiki/fetch-articles uses 300s server-side,
            // so the client should match-or-exceed that bound for the slow
            // path. Real-world warm-cache calls return in 1-3s.
            signal: AbortSignal.timeout(180_000),
        });
        if (!resp.ok) {
            console.warn(`[notebookRetrieval] /api/wiki/fetch-articles HTTP ${resp.status}`);
            return empty;
        }
        payload = await resp.json();
    } catch (err: any) {
        console.warn(`[notebookRetrieval] retrieval failed:`, err?.message || err);
        return empty;
    }

    let articles = Array.isArray(payload?.articles) ? payload.articles : [];
    if (articles.length === 0) return empty;

    // 2026-05-20 - HARD RULE: Synthesis articles (the system's own past
    // theme/analysis outputs) are EXCLUDED from new-synthesis retrieval.
    //
    // Why: if synthesis A cites article B, and we then ask for synthesis A'
    // on a related goal, NotebookLM retrieves A as the top-cosine match
    // because A was generated FROM the same goal text. A' ends up citing A
    // and B becomes invisible. This produces compounding inbreeding -
    // syntheses cite syntheses cite syntheses, and primary evidence
    // (Hechinger, OpenAI Blog, campus_tech, Reddit, client uploads) gets
    // squeezed out of the 40-chunk retrieval pack.
    //
    // The fix: primary sources (articles, transcripts, uploads, reddit-deep,
    // jina-reader, etc.) are the EVIDENCE substrate for new syntheses.
    // Synthesis articles inform the META-IMPROVEMENT loop (the engine that
    // reads past syntheses to learn what worked) but NEVER appear as
    // evidence for a new analysis.
    //
    // Opt-in escape hatch: if caller explicitly sets options.kind='synthesis'
    // (or any 'synthesis'-containing kind), the filter is bypassed. This
    // lets the meta-improvement reader pull synthesis articles deliberately.
    const wantsSynthesis = typeof options.kind === 'string' && /synthesis/i.test(options.kind);
    if (!wantsSynthesis) {
        const beforeCount = articles.length;
        articles = articles.filter((a: any) => {
            const kind = (a?.kind || '').toLowerCase();
            // Match "synthesis", "hic-theme-synthesis", "theme-synthesis", etc.
            return !kind.includes('synthesis');
        });
        const filteredCount = beforeCount - articles.length;
        if (filteredCount > 0) {
            console.log(`[notebookRetrieval] filtered ${filteredCount} synthesis article(s) from evidence pack (use opt-in kind=synthesis for the meta-improvement loop)`);
        }
    }

    if (articles.length === 0) return empty;

    const chunks: RelevantChunk[] = [];
    let totalChars = 0;
    const sourceSet = new Set<string>();

    for (const a of articles) {
        if (!a || typeof a !== 'object') continue;
        const content = typeof a.content === 'string' ? a.content : '';
        if (content.length < minChars) continue;

        chunks.push({
            id: a.id || '',
            title: a.title || '',
            source: a.source || '',
            sourceDate: a.date || '',
            wikiPath: a.wikiPath || '',
            content,
            articleRelevance: typeof a.article_relevance === 'number' ? a.article_relevance : undefined,
            chunkScore: typeof a.score === 'number' ? a.score : undefined,
            matchedChunks: Array.isArray(a.matched_chunks) ? a.matched_chunks : undefined,
        });
        totalChars += content.length;
        if (a.source) sourceSet.add(String(a.source));
    }

    if (chunks.length === 0) return empty;

    // Format the prompt block. Each chunk gets a CHUNK_NNN header (matching
    // the existing citation convention in slidePostProcessor + citation
    // resolvers) so generated artifacts can reference these by ID.
    const blockLines: string[] = [];
    blockLines.push('=== GOAL-FILTERED EVIDENCE PACK (NotebookLM-style retrieval) ===');
    blockLines.push('The chunks below are the TOP-RELEVANT material from the corpus,');
    blockLines.push('retrieved by EMBEDDING SIMILARITY to the research goal. They are');
    blockLines.push('ALREADY filtered for relevance - you do not need to score them.');
    blockLines.push('');
    blockLines.push('PRIORITIZE THESE CHUNKS WHEN CITING. They are the highest-fidelity');
    blockLines.push('match to the research goal in the entire wiki. Lead with them.');
    blockLines.push('The full corpus is available below for breadth, but every CLAIM');
    blockLines.push('and every CITATION should anchor to one of the chunks here first.');
    blockLines.push('');
    blockLines.push(`Research goal: "${goal}"`);
    blockLines.push(`Retrieved ${chunks.length} chunks across ${sourceSet.size} distinct sources.`);
    blockLines.push('');

    chunks.forEach((chunk, idx) => {
        const chunkId = `EVIDENCE_${String(idx + 1).padStart(3, '0')}`;
        blockLines.push(`--- ${chunkId} ---`);
        blockLines.push(`SOURCE: ${chunk.source || '(unknown source)'}`);
        if (chunk.sourceDate) blockLines.push(`DATE: ${chunk.sourceDate}`);
        if (chunk.title) blockLines.push(`TITLE: ${chunk.title}`);
        if (typeof chunk.articleRelevance === 'number') {
            blockLines.push(`ARTICLE_GOAL_FIT: ${chunk.articleRelevance.toFixed(2)} (collection-time grade)`);
        }
        if (typeof chunk.chunkScore === 'number') {
            blockLines.push(`RETRIEVAL_SCORE: ${chunk.chunkScore.toFixed(3)} (embedding similarity to goal)`);
        }
        blockLines.push('');
        blockLines.push(chunk.content);
        blockLines.push('');
    });

    blockLines.push('=== END GOAL-FILTERED EVIDENCE PACK ===');
    blockLines.push('');

    return {
        promptBlock: blockLines.join('\n'),
        chunks,
        stats: {
            retrieved: chunks.length,
            totalChars,
            articleSources: Array.from(sourceSet),
        },
    };
}

/**
 * Format a one-line summary for console logging.
 */
export function describeRetrievalStats(pack: GoalEvidencePack): string {
    if (pack.stats.retrieved === 0) return 'no goal-relevant chunks retrieved';
    const kb = Math.round(pack.stats.totalChars / 1024);
    const topSources = pack.stats.articleSources.slice(0, 5).join(', ');
    return `${pack.stats.retrieved} chunks, ${kb}KB total, ${pack.stats.articleSources.length} unique sources (top: ${topSources})`;
}
