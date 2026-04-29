/**
 * Research Fabric Orchestrator
 * The brain that ties together deep research, data source connectors,
 * and CX mesh into a unified research workflow.
 *
 * Responsibilities:
 * 1. Recommend data sources based on research goal + analytical lens
 * 2. Generate a research plan (presented to user for approval)
 * 3. Execute plan in parallel with progress tracking
 * 4. Merge results into unified research context
 * 5. AI-powered subreddit discovery for social listening
 */

import { estimateCost, ResearchMode, executeResearch } from './deepResearchService';
import { ALL_CONNECTORS, DataSourceConnector, DataSourceResult, DataSourceQuery, DataSourceItem } from './dataSourceConnectors';
import { collectSocialData, SocialCollectionConfig, SocialDataSummary } from './cxIntegrationService';
import { AnalyticalLens } from '../types';
import { GoogleGenAI } from "@google/genai";
import { tryRepairJson } from './aiRouter';

/**
 * Chunk-to-source mapping built during corpus assembly.
 * Maps CHUNK_001, CHUNK_002, etc. to human-readable source names and titles.
 * Used by slidePostProcessor to resolve [CHUNK_XXX] citations to real source names.
 */
export interface ChunkSourceInfo {
    sourceName: string;
    title: string;
    url?: string;
}

let _chunkSourceMap: Record<string, ChunkSourceInfo> = {};

/** Get the chunk-to-source mapping from the last corpus build */
export function getChunkSourceMap(): Record<string, ChunkSourceInfo> {
    return _chunkSourceMap;
}

// --- TYPES ---

export interface ResearchPlanSource {
    id: string;
    type: 'deep_research' | 'data_api' | 'cx_mesh' | 'subreddit';
    name: string;
    description: string;
    query: string;
    config?: any;               // source-specific configuration
    estimatedCost: number;
    estimatedTimeSeconds: number;
    enabled: boolean;           // user can toggle
}

export interface ResearchPlan {
    goal: string;
    lens: AnalyticalLens;
    sources: ResearchPlanSource[];
    totalEstimatedCost: { low: number; high: number };
    totalEstimatedTimeSeconds: number;
    recommendedSubreddits?: SubredditRecommendation[];
}

export interface SubredditRecommendation {
    name: string;
    description: string;
    relevanceReason: string;
    estimatedEngagement: 'high' | 'medium' | 'low';
    memberCount?: string;
}

export interface ResearchExecutionResult {
    planId: string;
    sources: {
        sourceId: string;
        name: string;
        type: string;
        status: 'completed' | 'failed' | 'skipped';
        items: DataSourceItem[];
        error?: string;
        durationMs: number;
    }[];
    totalItems: number;
    totalSources: number;
    successfulSources: number;
    durationMs: number;
}

export interface ResearchProgress {
    sourceId: string;
    sourceName: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    itemsCollected: number;
    message: string;
}

// --- SUBREDDIT DISCOVERY ---

/**
 * Use AI to discover the most relevant and engaged subreddits
 * for a given research goal and industry context.
 * Returns ranked recommendations with relevance reasoning.
 */
async function geminiJSON<T>(prompt: string): Promise<T> {
    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.2 },
    });
    let text = response.text || '{}';
    if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
    else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();
    try { return JSON.parse(text); } catch { return JSON.parse(tryRepairJson(text)); }
}

export async function discoverSubreddits(
    researchGoal: string,
    industryContext?: string
): Promise<SubredditRecommendation[]> {
    const prompt = `Given this research goal, identify the 5-8 most active and relevant Reddit communities (subreddits) where real users discuss this topic. Return ONLY a JSON array.

RESEARCH GOAL: ${researchGoal}
${industryContext ? `INDUSTRY CONTEXT: ${industryContext}` : ''}

Return JSON array: [{ "name": "subreddit_name", "description": "what they discuss", "relevanceReason": "why relevant", "estimatedEngagement": "high|medium|low", "memberCount": "approximate" }]
No r/ prefix. No NSFW. Sort by relevance.`;

    try {
        const result = await geminiJSON<SubredditRecommendation[]>(prompt);
        return Array.isArray(result) ? result : [];
    } catch (e) {
        console.error('Subreddit discovery failed:', e);
        return [];
    }
}

// --- FRESHNESS HELPER ---
function computeFreshnessFromDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Unknown';
        const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= 30) return '100 (< 1 month)';
        if (ageDays <= 180) return '85 (< 6 months)';
        if (ageDays <= 365) return '70 (< 1 year)';
        if (ageDays <= 730) return '50 (< 2 years)';
        return '25 (> 2 years)';
    } catch { return 'Unknown'; }
}

// --- QUERY REFINEMENT ---

/**
 * Use AI to generate targeted, source-specific search queries from the research goal.
 * A human researcher doesn't search "Identify emerging needs in remote work sector" --
 * they search "remote work productivity challenges 2026" or "hybrid workforce tools market size."
 */
/**
 * Option B refinement for CX Mesh subreddits (and TrustPilot/Play Store).
 * For each community target, ask Gemini to produce a brief-specific 4–8 word
 * keyword query that would surface posts RELEVANT TO THE RESEARCH GOAL within
 * that community. Prevents the old behavior where r/neu was searched for "neu"
 * (matches everything) or for the full 500-char goal text.
 *
 * Returns Record<target, refinedQuery>. Gracefully falls back to a heuristic
 * (extract nouns from the goal) if the Gemini call fails.
 */
export async function refineSubredditQueries(
    goal: string,
    lens: AnalyticalLens,
    subreddits: string[]
): Promise<Record<string, string>> {
    if (!subreddits.length) return {};
    const goalExcerpt = goal.slice(0, 400);  // keep prompt bounded
    const prompt = `You are optimizing Reddit search queries. For each subreddit below, generate ONE tight 4-8 keyword query that would find posts RELEVANT TO the research goal within that subreddit's community.

RESEARCH GOAL: ${goalExcerpt}
ANALYTICAL LENS: ${lens}

SUBREDDITS:
${subreddits.map(s => `- r/${s}`).join('\n')}

Rules:
- The subreddit IS the topic filter; your query narrows to goal-relevant posts
- 4-8 keywords, no filler, no full sentences
- Use community-native language (not formal/corporate speak)
- NEVER return the subreddit name itself as the query
- If the subreddit is tangential to the goal, still produce the best adjacent query

Return a JSON object where each key is the subreddit name (without "r/") and the value is the query string. Example for goal "university advancement strategy":
{"neu": "alumni giving student experience advancement", "fatfire": "philanthropy donor motivation giving back", "cscareerquestions": "bootcamp tuition ROI career outcomes"}`;

    try {
        const result = await geminiJSON<Record<string, string>>(prompt);
        // Sanity-check — if Gemini returns the subreddit name verbatim (old bug), replace with goal snippet
        const out: Record<string, string> = {};
        for (const sub of subreddits) {
            const q = (result[sub] || '').trim();
            if (!q || q.toLowerCase() === sub.toLowerCase()) {
                // Heuristic fallback: extract top content words from the goal
                out[sub] = heuristicSubredditQuery(goal);
            } else {
                out[sub] = q;
            }
        }
        return out;
    } catch (e) {
        console.warn('[subreddit refine] Gemini failed, using heuristic:', e);
        const fallback: Record<string, string> = {};
        for (const sub of subreddits) fallback[sub] = heuristicSubredditQuery(goal);
        return fallback;
    }
}

/** Tiny heuristic: extract the highest-signal 6 words from the research goal.
 *  Removes stop words and returns the result as a space-joined query. */
function heuristicSubredditQuery(goal: string): string {
    const STOP = new Set(['the','a','an','and','or','of','to','in','for','on','at','by','with','from','as','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','can','may','might','shall','this','that','these','those','it','its','their','they','them','what','which','who','how','when','where','why','we','our','us','your','my','me','i','he','she','his','her','about','into','through','during','before','after','between','without','within','role','you','research','analyst','elite','market']);
    const words = goal.toLowerCase().match(/[a-z]{3,}/g) || [];
    const filtered = words.filter(w => !STOP.has(w));
    // Take first 6 unique content words
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const w of filtered) {
        if (!seen.has(w)) { seen.add(w); uniq.push(w); if (uniq.length >= 6) break; }
    }
    return uniq.join(' ');
}

// ============================================================================
// HALLUCINATION GUARD (2026-04-28) — Phase 2.5 fidelity check
// ============================================================================
// The LLM rewrites the goal into source-specific keywords. Without a guardrail,
// it can drift — adding angles ("luxury experience", "subscription model") that
// the user didn't intend. We check each refined query for fidelity to the
// original goal: a fraction of its content tokens must overlap with the goal's
// content tokens. If overlap is below FIDELITY_THRESHOLD, we reject the rewrite
// for that source and fall back to the verbatim goal.

const QUERY_FIDELITY_STOP_WORDS = new Set([
    'the','and','or','of','in','to','for','on','at','by','with','an','a',
    'is','are','was','were','be','been','being','this','that','these','those',
    'it','its','from','into','about','as','if','than','then','but','not',
    'can','could','should','would','may','might','must','will','shall',
    'how','what','why','when','where','who','which','do','does','did','done',
]);

// Regex: split on any non-alphanumeric (keeps numbers like "2025" as tokens)
const QUERY_TOKEN_RE = /[a-z0-9]+/g;

function extractQueryTokens(s: string): Set<string> {
    if (!s) return new Set();
    const lower = s.toLowerCase();
    const matches = lower.match(QUERY_TOKEN_RE) || [];
    const out = new Set<string>();
    for (const t of matches) {
        if (t.length < 3) continue;
        if (QUERY_FIDELITY_STOP_WORDS.has(t)) continue;
        // Allow numerics through (years, model versions, etc.)
        out.add(t);
    }
    return out;
}

/** Fraction of refined query's content tokens that came from the original goal.
 * 1.0 = every token in refined is in goal (perfect fidelity, possibly redundant).
 * 0.0 = no overlap (LLM hallucinated entire query). */
function queryFidelityScore(goal: string, refined: string): number {
    const g = extractQueryTokens(goal);
    const r = extractQueryTokens(refined);
    if (r.size === 0) return 0;
    let overlap = 0;
    for (const t of r) if (g.has(t)) overlap++;
    return overlap / r.size;
}

const FIDELITY_THRESHOLD = 0.35;  // ≥35% of refined tokens must come from goal
const MIN_GOAL_TOKEN_OVERLAP = 1; // refined must include ≥1 goal token

/** Tokenize a source ID for fidelity scoring. "bombas_impact" -> {bombas, impact},
 * "wayfair_ir" -> {wayfair}. Strips generic suffixes (_blog, _press, _news, _ir,
 * _impact, _newsroom, etc.) so the brand/entity name is what counts. */
function extractSourceIdTokens(sourceId: string): Set<string> {
    if (!sourceId) return new Set();
    const GENERIC_SUFFIXES = new Set([
        'blog','press','news','newsroom','ir','impact','feed','rss','api','docs',
        'about','insights','resources','articles','com','co','org','io','data',
        'main','tech','platform','site','reports','research','sub','main',
    ]);
    const parts = sourceId.toLowerCase().split(/[_-]+/).filter(Boolean);
    const out = new Set<string>();
    for (const p of parts) {
        if (p.length < 3) continue;
        if (GENERIC_SUFFIXES.has(p)) continue;
        out.add(p);
    }
    return out;
}

/** Validates each refined query against the original goal. Replaces low-fidelity
 * rewrites with the verbatim goal so the proxy hits the source with content
 * the user actually authored. Logs each rejection so quality drift is visible.
 *
 * 2026-04-29 — Source-aware: the source's own name tokens (e.g. "bombas",
 * "wayfair", "salesforce") count toward the fidelity numerator. Without this
 * adjustment, perfectly valid source-tailored refinements like
 * "Bombas social impact giving" scored 1/4 token overlap against a goal that
 * never mentions Bombas, and got replaced with the verbose 250-char goal —
 * defeating the entire point of refinement. With it, the brand name acts as
 * a free goal-aligned token, so adding it doesn't penalize fidelity.
 */
function validateRefinedQueries(
    goal: string,
    refined: Record<string, string>,
): { validated: Record<string, string>; rejected: string[] } {
    const goalTokens = extractQueryTokens(goal);
    const validated: Record<string, string> = {};
    const rejected: string[] = [];

    for (const [source, query] of Object.entries(refined)) {
        if (!query || typeof query !== 'string') {
            validated[source] = goal;
            rejected.push(`${source}: empty/invalid -> fallback`);
            continue;
        }
        // Goal tokens AUGMENTED with the source's own ID tokens for this validation.
        // A query like "Bombas social impact giving" against source "bombas_impact"
        // now gets credit for "bombas" being a legitimate source-scoping token.
        const sourceTokens = extractSourceIdTokens(source);
        const augmentedGoalTokens = new Set([...goalTokens, ...sourceTokens]);

        const queryTokens = extractQueryTokens(query);
        const overlap = [...queryTokens].filter(t => augmentedGoalTokens.has(t)).length;
        // Fidelity score uses the same augmented set
        const fidelity = queryTokens.size === 0 ? 0 : overlap / queryTokens.size;

        if (overlap < MIN_GOAL_TOKEN_OVERLAP || fidelity < FIDELITY_THRESHOLD) {
            validated[source] = goal;
            rejected.push(
                `${source}: fidelity=${fidelity.toFixed(2)} overlap=${overlap}/${queryTokens.size} ` +
                `(refined was: ${JSON.stringify(query.slice(0, 80))})`,
            );
        } else {
            validated[source] = query;
        }
    }

    if (rejected.length > 0) {
        console.warn(
            `[refineSearchQueries] hallucination guard: ${rejected.length}/${Object.keys(refined).length} ` +
            `queries below fidelity threshold ${FIDELITY_THRESHOLD}, replaced with goal verbatim:\n  ` +
            rejected.join('\n  '),
        );
    }

    return { validated, rejected };
}

export async function refineSearchQueries(
    goal: string,
    lens: AnalyticalLens,
    enabledSources: string[]
): Promise<Record<string, string>> {
    const sourceList = enabledSources.join(', ');
    const prompt = `Given this research goal, generate ONE highly targeted search query for EACH data source listed. Each query must be specific, use keywords that the source's search engine will match well, and directly serve the research objective. No generic terms. No full sentences. Just precise search keywords.

RESEARCH GOAL: ${goal}
ANALYTICAL LENS: ${lens}
DATA SOURCES TO GENERATE QUERIES FOR: ${sourceList}

Return a JSON object where each key is the source name and the value is the optimized search query string. Example:
{"GDELT": "remote work technology adoption enterprise 2025 2026", "OpenAlex": "hybrid workforce productivity digital collaboration tools", "Hacker News": "remote work tools startups"}

CRITICAL FIDELITY RULES — do NOT introduce concepts the goal does not contain:
- Each query: 4-8 keywords, no filler words
- AT LEAST ONE keyword in each query MUST appear in the original goal
- Do NOT invent industries, brands, geographies, or stakeholders not in the goal
- Year references (2025, 2026) are allowed; treat as goal-aligned
- Synonyms for goal terms are OK; tangential adjacencies are NOT
- For news sources: include year references for recent content
- For academic sources: use field-specific terminology of the goal's domain
- For economic sources: use indicator-relevant terms tied to the goal
- For social sources: use community language, not formal terms`;

    try {
        const result = await geminiJSON<Record<string, string>>(prompt);
        // Phase 2.5 hallucination guard — validate every refined query against
        // the original goal. Low-fidelity rewrites get replaced with the goal
        // verbatim so we don't query sources with concepts the user didn't ask.
        const { validated } = validateRefinedQueries(goal, result || {});
        return validated;
    } catch (e) {
        console.warn('Query refinement failed, using research goal as fallback:', e);
        const fallback: Record<string, string> = {};
        for (const src of enabledSources) fallback[src] = goal;
        return fallback;
    }
}

// --- PLAN GENERATION ---

/**
 * Generate a research plan based on the goal, lens, and user preferences.
 * The plan is presented to the user for review and customization.
 */
export async function generateResearchPlan(
    goal: string,
    lens: AnalyticalLens,
    enabledCategories: {
        deepResearch?: { mode: ResearchMode };
        newsMedia?: boolean;
        academic?: boolean;
        economic?: boolean;
        socialTrends?: boolean;
        webIntelligence?: { urls?: string[] };
        cxMesh?: { subreddits?: string[]; trustpilot?: string[]; playstore?: string[] };
        videoSearch?: boolean;
        videoTranscripts?: string[];   // YouTube URLs to transcribe
    }
): Promise<ResearchPlan> {
    const sources: ResearchPlanSource[] = [];
    let id = 0;

    // --- AI QUERY REFINEMENT: Generate targeted queries per source ---
    const enabledSourceNames: string[] = [];
    if (enabledCategories.deepResearch) enabledSourceNames.push('AI Deep Research');
    if (enabledCategories.newsMedia) enabledSourceNames.push('GDELT');
    if (enabledCategories.academic) enabledSourceNames.push('OpenAlex', 'Semantic Scholar');
    if (enabledCategories.economic) enabledSourceNames.push('World Bank');
    if (enabledCategories.socialTrends) enabledSourceNames.push('Hacker News', 'Wikipedia');
    if (enabledCategories.videoSearch) enabledSourceNames.push('YouTube');

    let refinedQueries: Record<string, string> = {};
    if (enabledSourceNames.length > 0) {
        try {
            refinedQueries = await refineSearchQueries(goal, lens, enabledSourceNames);
        } catch {
            // Fallback: use goal directly
        }
    }
    const q = (sourceName: string) => refinedQueries[sourceName] || goal;

    // 1. AI Deep Research
    if (enabledCategories.deepResearch) {
        const mode = enabledCategories.deepResearch.mode;
        const cost = estimateCost(mode);
        sources.push({
            id: `src_${id++}`,
            type: 'deep_research',
            name: `AI Deep Research (${mode})`,
            description: cost.description,
            query: q('AI Deep Research'),
            config: { mode },
            estimatedCost: (cost.low + cost.high) / 2,
            estimatedTimeSeconds: mode === 'quick' ? 10 : mode === 'focused' ? 60 : 600,
            enabled: true,
        });
    }

    // 2. News & Media
    if (enabledCategories.newsMedia) {
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'GDELT News Monitoring',
            description: 'Global news articles related to research topic',
            query: q('GDELT'),
            config: { connector: 'GDELT', limit: 30 },
            estimatedCost: 0,
            estimatedTimeSeconds: 5,
            enabled: true,
        });
    }

    // 3. Academic Literature
    if (enabledCategories.academic) {
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'OpenAlex Academic Papers',
            description: 'Peer-reviewed research papers and citations',
            query: q('OpenAlex'),
            config: { connector: 'OpenAlex', limit: 20 },
            estimatedCost: 0,
            estimatedTimeSeconds: 5,
            enabled: true,
        });
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'Semantic Scholar',
            description: 'Academic papers with citation graphs',
            query: q('Semantic Scholar'),
            config: { connector: 'Semantic Scholar', limit: 15 },
            estimatedCost: 0,
            estimatedTimeSeconds: 5,
            enabled: true,
        });
    }

    // 4. Economic Data
    if (enabledCategories.economic) {
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'World Bank Indicators',
            description: 'Economic development indicators',
            query: q('World Bank'),
            config: { connector: 'World Bank', limit: 10 },
            estimatedCost: 0,
            estimatedTimeSeconds: 3,
            enabled: true,
        });
    }

    // 5. Social Trends
    if (enabledCategories.socialTrends) {
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'Hacker News Discussions',
            description: 'Tech industry discourse and trending topics',
            query: q('Hacker News'),
            config: { connector: 'Hacker News', limit: 20 },
            estimatedCost: 0,
            estimatedTimeSeconds: 3,
            enabled: true,
        });
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'Wikipedia Trends',
            description: 'Public interest and awareness signals',
            query: q('Wikipedia'),
            config: { connector: 'Wikipedia Trends', limit: 5 },
            estimatedCost: 0,
            estimatedTimeSeconds: 8,
            enabled: true,
        });
    }

    // 6. Web Intelligence
    if (enabledCategories.webIntelligence?.urls?.length) {
        for (const url of enabledCategories.webIntelligence.urls) {
            sources.push({
                id: `src_${id++}`,
                type: 'data_api',
                name: `Web Extract: ${new URL(url).hostname}`,
                description: `Extract content from ${url}`,
                query: url,
                config: { connector: 'Jina Reader', limit: 1 },
                estimatedCost: 0,
                estimatedTimeSeconds: 5,
                enabled: true,
            });
        }
    }

    // 7. CX Mesh - Subreddits (Option B: AI-refined per-subreddit queries)
    //
    // Each subreddit gets a bespoke Gemini-generated keyword query that finds
    // goal-relevant posts within that community. Replaces the old bug where
    // r/neu was searched for "neu" (matches everything because members mention
    // their school constantly). Downstream AI relevance scoring layers further
    // filtering on top.
    if (enabledCategories.cxMesh?.subreddits?.length) {
        const subreddits = enabledCategories.cxMesh.subreddits;
        let refined: Record<string, string> = {};
        try {
            refined = await refineSubredditQueries(goal, lens, subreddits);
        } catch {
            // refineSubredditQueries already has internal heuristic fallback;
            // this outer catch is just defense-in-depth.
        }
        for (const sub of subreddits) {
            const q = refined[sub] || heuristicSubredditQuery(goal);
            sources.push({
                id: `src_${id++}`,
                type: 'subreddit',
                name: `Reddit: r/${sub}`,
                description: `Collect posts from r/${sub} matching: "${q}"`,
                query: q,
                config: { source: 'reddit', target: sub, count: 30, goalQuery: goal, refinedQuery: q },
                estimatedCost: 0,
                estimatedTimeSeconds: 30,
                enabled: true,
            });
        }
    }

    // 7b. CX Mesh - TrustPilot
    // Same fix as subreddits above — pass the research goal as the query so
    // reviews are filtered for brief-relevance, not brand-name-self-match.
    if (enabledCategories.cxMesh?.trustpilot?.length) {
        for (const company of enabledCategories.cxMesh.trustpilot) {
            sources.push({
                id: `src_${id++}`,
                type: 'cx_mesh',
                name: `TrustPilot: ${company}`,
                description: `Collect reviews from TrustPilot for ${company} relevant to the research goal`,
                query: goal,
                config: { source: 'trustpilot', target: company, count: 100, goalQuery: goal },
                estimatedCost: 0,
                estimatedTimeSeconds: 45,
                enabled: true,
            });
        }
    }

    // 7c. CX Mesh - Play Store
    if (enabledCategories.cxMesh?.playstore?.length) {
        for (const pkg of enabledCategories.cxMesh.playstore) {
            sources.push({
                id: `src_${id++}`,
                type: 'cx_mesh',
                name: `Play Store: ${pkg}`,
                description: `Collect app reviews for ${pkg} relevant to the research goal`,
                query: goal,
                config: { source: 'playstore', target: pkg, count: 100, goalQuery: goal },
                estimatedCost: 0,
                estimatedTimeSeconds: 30,
                enabled: true,
            });
        }
    }

    // 8. YouTube Search + Video Transcription
    if (enabledCategories.videoSearch) {
        sources.push({
            id: `src_${id++}`,
            type: 'data_api',
            name: 'YouTube Search',
            description: 'Find relevant videos, talks, and webinars',
            query: q('YouTube'),
            config: { connector: 'YouTube Search', limit: 10 },
            estimatedCost: 0,
            estimatedTimeSeconds: 5,
            enabled: true,
        });
    }
    if (enabledCategories.videoTranscripts?.length) {
        for (const url of enabledCategories.videoTranscripts) {
            sources.push({
                id: `src_${id++}`,
                type: 'data_api',
                name: `Transcribe: ${url.substring(0, 50)}...`,
                description: `Auto-transcribe video for RAG analysis`,
                query: url,
                config: { connector: 'Video Transcriber', limit: 1 },
                estimatedCost: 0,
                estimatedTimeSeconds: 120, // transcription takes time
                enabled: true,
            });
        }
    }

    const enabledSources = sources.filter(s => s.enabled);
    const totalCostLow = enabledSources.reduce((s, src) => s + src.estimatedCost * 0.7, 0);
    const totalCostHigh = enabledSources.reduce((s, src) => s + src.estimatedCost * 1.3, 0);
    const maxTime = Math.max(...enabledSources.map(s => s.estimatedTimeSeconds), 0);

    return {
        goal,
        lens,
        sources,
        totalEstimatedCost: { low: Math.round(totalCostLow * 100) / 100, high: Math.round(totalCostHigh * 100) / 100 },
        totalEstimatedTimeSeconds: maxTime + 10, // parallel execution + overhead
    };
}

// --- PLAN EXECUTION ---

/**
 * Execute a research plan in parallel.
 * Calls deep research, data APIs, and CX mesh connectors.
 */
export async function executePlan(
    plan: ResearchPlan,
    onProgress?: (p: ResearchProgress) => void
): Promise<ResearchExecutionResult> {
    const start = Date.now();
    const enabledSources = plan.sources.filter(s => s.enabled);
    const connectorMap = new Map(ALL_CONNECTORS.map(c => [c.name, c]));

    const results = await Promise.allSettled(
        enabledSources.map(async (source) => {
            onProgress?.({ sourceId: source.id, sourceName: source.name, status: 'running', itemsCollected: 0, message: `Querying ${source.name}...` });

            try {
                let items: DataSourceItem[] = [];

                if (source.type === 'deep_research') {
                    // AI Deep Research via deepResearchService (routes to Gemini/Claude/OpenAI)
                    onProgress?.({ sourceId: source.id, sourceName: source.name, status: 'running', itemsCollected: 0, message: `Running ${source.config.mode} AI research...` });

                    const researchResult = await executeResearch({
                        mode: source.config.mode || 'focused',
                        query: source.query,
                    }, (p) => {
                        onProgress?.({ sourceId: source.id, sourceName: source.name, status: 'running', itemsCollected: 0, message: p.message });
                    });

                    // The synthesized research content (always include — this is the AI's analysis)
                    items = [{
                        id: `research_${source.id}`,
                        title: `AI Research (${researchResult.provider}): ${source.query.substring(0, 60)}`,
                        content: researchResult.content,
                        sourceType: 'web',
                        sourceName: `${researchResult.provider} (${source.config.mode} research)`,
                    }];

                    // RELEVANCE FILTER: Only filter out clearly off-topic results
                    // (e.g., Gemini product news for a higher-ed query).
                    // Use broad domain matching — include anything that mentions ANY
                    // domain-relevant term from the research query OR common domain synonyms.
                    const allQueryText = `${source.query} ${researchGoal || ''}`.toLowerCase();
                    const queryWords = allQueryText.split(/\s+/).filter(w => w.length > 3);
                    // Add domain synonyms so "fundraising" matches when query says "advancement"
                    const domainSynonyms = new Set<string>();
                    if (allQueryText.includes('fundrais') || allQueryText.includes('advancement') || allQueryText.includes('donor') || allQueryText.includes('giving')) {
                        ['fundrais', 'donor', 'giving', 'advancement', 'philanthrop', 'alumni', 'endowment', 'stewardship', 'solicit', 'campaign'].forEach(s => domainSynonyms.add(s));
                    }
                    if (allQueryText.includes('higher ed') || allQueryText.includes('university') || allQueryText.includes('college') || allQueryText.includes('student')) {
                        ['higher ed', 'university', 'college', 'student', 'campus', 'enrollment', 'tuition', 'faculty', 'academic'].forEach(s => domainSynonyms.add(s));
                    }
                    if (allQueryText.includes('co-op') || allQueryText.includes('coop') || allQueryText.includes('experiential') || allQueryText.includes('career')) {
                        ['co-op', 'coop', 'experiential', 'career', 'intern', 'employer', 'workforce', 'skill'].forEach(s => domainSynonyms.add(s));
                    }

                    let includedSources = 0;
                    let filteredSources = 0;
                    // Only apply strict filtering for KNOWN irrelevant patterns
                    const IRRELEVANT_PATTERNS = [/gemini.*flash/i, /gemini.*pro/i, /apple.*siri/i, /google.*workspace/i, /chatgpt.*update/i, /openai.*release/i, /claude.*update/i];

                    for (const src of researchResult.sources) {
                        const title = src.title || '';
                        const titleLower = title.toLowerCase();

                        // Only filter if title matches a KNOWN irrelevant pattern
                        const isKnownIrrelevant = IRRELEVANT_PATTERNS.some(p => p.test(title));
                        // OR if it has zero overlap with query words AND zero domain synonym matches
                        const hasQueryOverlap = queryWords.some(w => titleLower.includes(w));
                        const hasDomainOverlap = Array.from(domainSynonyms).some(s => titleLower.includes(s));

                        if (isKnownIrrelevant && !hasQueryOverlap && !hasDomainOverlap) {
                            filteredSources++;
                            console.log(`[DeepResearch] Filtered irrelevant source: "${title}"`);
                        } else {
                            items.push({
                                id: `research_src_${items.length}`,
                                title: src.title || src.url,
                                content: src.citedText || src.snippet || src.title || '',
                                url: src.url,
                                sourceType: 'web',
                                sourceName: researchResult.provider,
                            });
                            includedSources++;
                        }
                    }
                    if (filteredSources > 0) {
                        console.log(`[DeepResearch] Relevance filter: ${includedSources} sources kept, ${filteredSources} irrelevant sources removed`);
                    }

                } else if (source.type === 'data_api') {
                    // Free data API
                    const connectorName = source.config.connector;
                    const connector = connectorMap.get(connectorName);
                    if (!connector) throw new Error(`Unknown connector: ${connectorName}`);

                    const result = await connector.query({
                        query: source.query,
                        limit: source.config.limit,
                    });
                    items = result.items;

                } else if (source.type === 'subreddit' || source.type === 'cx_mesh') {
                    // CX Mesh (Reddit Ripper)
                    try {
                        const data = await collectSocialData(source.config as SocialCollectionConfig, (job) => {
                            onProgress?.({
                                sourceId: source.id, sourceName: source.name,
                                status: 'running', itemsCollected: job.collected,
                                message: `Collected ${job.collected}/${job.total} items`,
                            });
                        });
                        items = data.items.map((item: any, i: number) => ({
                            id: `cx_${source.id}_${i}`,
                            title: item.title || `${source.config.source} item`,
                            content: item.selftext || item.body || item.content || item.title || '',
                            url: item.permalink
                                ? (item.permalink.startsWith('http') ? item.permalink : `https://www.reddit.com${item.permalink}`)
                                : (item.url && item.url.startsWith('http') ? item.url : undefined),
                            date: item.created ? new Date(item.created * 1000).toISOString() : undefined,
                            sourceType: 'social' as const,
                            sourceName: `${source.config.source}: ${source.config.target}`,
                        }));
                    } catch (e: any) {
                        // CX Mesh services might be offline — graceful degradation
                        throw new Error(`CX service unavailable: ${e.message}`);
                    }
                }

                onProgress?.({ sourceId: source.id, sourceName: source.name, status: 'completed', itemsCollected: items.length, message: `Completed: ${items.length} items` });

                return { sourceId: source.id, name: source.name, type: source.type, status: 'completed' as const, items, durationMs: 0 };

            } catch (e: any) {
                onProgress?.({ sourceId: source.id, sourceName: source.name, status: 'failed', itemsCollected: 0, message: `Failed: ${e.message}` });
                return { sourceId: source.id, name: source.name, type: source.type, status: 'failed' as const, items: [], error: e.message, durationMs: 0 };
            }
        })
    );

    const sourceResults = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : {
            sourceId: enabledSources[i].id, name: enabledSources[i].name,
            type: enabledSources[i].type, status: 'failed' as const,
            items: [], error: 'Promise rejected', durationMs: 0,
        }
    );

    const totalItems = sourceResults.reduce((s, r) => s + r.items.length, 0);
    const successful = sourceResults.filter(r => r.status === 'completed').length;

    return {
        planId: `plan_${Date.now()}`,
        sources: sourceResults,
        totalItems,
        totalSources: enabledSources.length,
        successfulSources: successful,
        durationMs: Date.now() - start,
    };
}

/**
 * AI-powered SCORED relevance filter using Gemini.
 * Returns items with relevanceScore (0-100) and reason attached.
 * Items below 30 are dropped. Items 30-60 flagged as tangential.
 */
async function filterAndScoreItems(items: DataSourceItem[], goal: string): Promise<DataSourceItem[]> {
    if (items.length === 0) return items;
    if (items.length <= 3) {
        // Score even tiny sets but don't drop
        return items.map(item => ({ ...item, relevanceScore: 70 }));
    }

    try {
        const titleList = items.map((item, i) => `${i}: ${item.title}`).join('\n');

        const prompt = `RESEARCH GOAL: "${goal}"

Score each item's relevance to the research goal on a 0-100 scale.
- 90-100: Directly addresses the research goal with specific data or analysis
- 70-89: Closely related, provides useful context or evidence
- 40-69: Tangentially related, might provide background
- 0-39: Not relevant -- different topic entirely

ITEMS:
${titleList}

Return JSON array of objects: [{"i": 0, "s": 85, "r": "Directly discusses university fundraising digital strategies"}]
Where i=item index, s=score 0-100, r=one-sentence reason.
IMPORTANT: Score EVERY item. Be STRICT on relevance.`;

        const result = await geminiJSON<{i: number; s: number; r: string}[]>(prompt);
        if (!Array.isArray(result)) return items;

        // Attach scores to items
        const scoreMap = new Map(result.map(r => [r.i, { score: r.s, reason: r.r }]));
        const scored = items.map((item, idx) => {
            const info = scoreMap.get(idx);
            return {
                ...item,
                relevanceScore: info?.score ?? 50,
                relevanceReason: info?.reason,
            };
        });

        // KEEP ALL ITEMS — do NOT drop evidence before the AI analyzes it
        // Relevance scores are attached for sorting and post-analysis scoring,
        // but no item is excluded. The AI must see everything to perform
        // comprehensive cross-source analysis. Confidence is computed AFTER
        // theme extraction based on what sources actually contributed.
        const highRelevance = scored.filter(item => (item.relevanceScore ?? 0) >= 60).length;
        const moderate = scored.filter(item => (item.relevanceScore ?? 0) >= 30 && (item.relevanceScore ?? 0) < 60).length;
        const lowRelevance = scored.filter(item => (item.relevanceScore ?? 0) < 30).length;
        console.log(`AI relevance scoring: ${scored.length} items scored (${highRelevance} high, ${moderate} moderate, ${lowRelevance} low relevance) for "${goal.substring(0, 50)}..."`);

        // Sort by relevance so highest-quality items appear first in corpus,
        // but ALL items are included
        return scored.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    } catch (e) {
        console.warn('AI relevance scoring failed, keeping all items:', e);
        return items.map(item => ({ ...item, relevanceScore: 50 }));
    }
}

// Backward compat alias
const filterRelevantItems = filterAndScoreItems;

/**
 * Merge research results into a single text corpus suitable for ingestion.
 * Applies relevance filtering to remove off-topic items.
 * Preserves source attribution for citation tracking.
 */
/**
 * Content Enrichment: Fetch full text from top-scored items via the proxy's
 * /api/extract-content endpoint (PDF-first, Jina web fallback). Academic APIs
 * return only titles + abstracts — this downloads the real article so the AI
 * can cite specific findings instead of refusing for lack of body text.
 *
 * URL-based fast-path: items whose URL points to a known full-text source
 * (DOI, Europe PMC, arXiv, PubMed Central, OpenAlex, OSF, *.pdf, etc.) are
 * always enriched regardless of how long their abstract happens to be —
 * because even a 2000-char Europe PMC abstract is still a tiny fraction of
 * the 30-page paper sitting one DOI redirect away.
 */
const FULL_TEXT_SOURCE_PATTERNS = [
    /doi\.org\//i,
    /europepmc\.org\/article/i,
    /ncbi\.nlm\.nih\.gov\/(pmc|pubmed)/i,
    /pmc\.ncbi\.nlm\.nih\.gov/i,
    /arxiv\.org\/(abs|pdf)/i,
    /openalex\.org\//i,
    /api\.openalex\.org\//i,
    /\.pdf($|\?)/i,
    /osf\.io\//i,
    /biorxiv\.org\//i,
    /medrxiv\.org\//i,
    /ssrn\.com\//i,
    /researchgate\.net\/publication/i,
    /semanticscholar\.org\/paper/i,
];

function isLikelyFullTextSource(url: string): boolean {
    return FULL_TEXT_SOURCE_PATTERNS.some(p => p.test(url));
}

// Hosts where Jina / web extraction reliably FAILS or times out. Items from
// these domains already arrive with their body text from their native
// connector (Reddit selftext, tweet text, etc.) — re-extracting them via
// Jina just burns 45s per item and returns nothing. We exclude them from
// the enrichment filter below; they still participate in residual wiki
// archival using whatever body the connector produced.
const JINA_BLOCKED_HOSTS = [
    /reddit\.com/i,
    /redd\.it/i,
    /twitter\.com/i,
    /x\.com\//i,
    /t\.co\//i,
    /instagram\.com/i,
    /discord\.com/i,
    /discord\.gg/i,
    /facebook\.com/i,
    /linkedin\.com/i,
    /tiktok\.com/i,
    /mastodon\./i,
    /bsky\.app/i,
];

function isJinaBlockedUrl(url: string): boolean {
    return JINA_BLOCKED_HOSTS.some(p => p.test(url));
}

const ENRICHMENT_PER_ITEM_CAP = 30_000; // 30KB per item (was 3KB) — fits comfortably in 1M-token Claude/Gemini context
const ENRICHMENT_RELEVANCE_FLOOR = 40;   // was 60 — let medium-relevance items through
const ENRICHMENT_GENERIC_LENGTH_GATE = 5_000; // was 300 — abstracts run 1-3KB; only skip if item already has substantial body
// Phase 1-retrofit (2026-04-20): the wiki is the canonical RAG store — we archive EVERYTHING
// and rely on metadata retrieval to pull bodies on demand. The 80-item cap that used to sit
// here meant 96% of collected items stayed as headlines (the user's audit caught this:
// "4 full-text · 357 snippets · 288 headlines"). Raised to 300 so a typical ~500-item scored
// corpus gets nearly full-body coverage, with the wiki catching anything the in-context
// window can't hold. Concurrency bumped from 3 → 6 to keep wall-clock reasonable.
const ENRICHMENT_TOP_N = 300;
// Split concurrency (2026-04-21): cache checks hit local proxy only and are
// cheap (4-6s each), so we run them 8-wide. Jina web extraction goes to an
// external rate-limited service and bursts above 3 reliably trip its throttle
// AND create 45-second timeout pileups (observed: 20+ consecutive timeouts on
// Reddit / slow institutional URLs). Keeping Jina at 3 matches the pre-v3.1
// behavior Jina tolerated, while still doubling throughput overall because
// the cache phase runs separately at 8.
const CACHE_CHECK_CONCURRENCY = 8;
const JINA_EXTRACT_CONCURRENCY = 3;

async function enrichTopItems(items: DataSourceItem[], maxItems: number = ENRICHMENT_TOP_N): Promise<DataSourceItem[]> {
    // Items qualify for enrichment if they have an http URL AND either:
    //   (a) their URL points to a known full-text source (DOI/PMC/arXiv/etc) — always enrich, OR
    //   (b) their existing content is shorter than the generic length gate.
    // Both paths still respect the relevance floor.
    const needsEnrichment = items.filter(item => {
        if (!item.url || !item.url.startsWith('http')) return false;
        if (((item as any).relevanceScore || 0) < ENRICHMENT_RELEVANCE_FLOOR) return false;
        // Skip Reddit/Twitter/Discord/etc. — the native connector already
        // returned the selftext/body, and Jina can't scrape these anyway.
        // (Unless the URL is ALSO a known full-text source, which no social
        // URL matches, but keep the guard order safe.)
        if (isJinaBlockedUrl(item.url) && !isLikelyFullTextSource(item.url)) return false;
        const len = item.content?.length || 0;
        return isLikelyFullTextSource(item.url) || len < ENRICHMENT_GENERIC_LENGTH_GATE;
    });

    // 2026-04-29 — DO NOT early-return when needsEnrichment is empty.
    // Previously the function bailed here, which silently skipped the
    // residual wiki archival step at the bottom. Now that RSS body
    // expansion (Tier 1: trafilatura) gives most items full 10KB bodies
    // BEFORE this function runs, almost nothing needs enrichment — and
    // the early return was sending everything past the wiki without
    // archiving it. Let the enrichment loop be a no-op when toEnrich
    // is empty; residual archival below will pick up the full-body items.

    // Sort by relevance, but break ties by giving full-text-source URLs priority —
    // they yield 10-30KB of real evidence; landing-page scrapes typically yield <5KB.
    const toEnrich = needsEnrichment
        .sort((a, b) => {
            const scoreDelta = ((b as any).relevanceScore || 0) - ((a as any).relevanceScore || 0);
            if (scoreDelta !== 0) return scoreDelta;
            const aFull = isLikelyFullTextSource(a.url!) ? 1 : 0;
            const bFull = isLikelyFullTextSource(b.url!) ? 1 : 0;
            return bFull - aFull;
        })
        .slice(0, maxItems);

    const fullTextCount = toEnrich.filter(i => isLikelyFullTextSource(i.url!)).length;
    if (toEnrich.length > 0) {
        console.log(`Content enrichment: Fetching full text for ${toEnrich.length} items (${fullTextCount} from known full-text sources, ${toEnrich.length - fullTextCount} via web extraction)`);
    } else {
        console.log(`Content enrichment: skipped (all ${items.length} items already have full body via RSS expansion). Residual wiki archival will handle persistence.`);
    }

    const PROXY = 'http://localhost:5012';
    // 2026-04-21 — Map keyed by ITEM REFERENCE (not string id) to defeat the
    // prior collision bug: different items occasionally shared item.id strings
    // across connector code paths (e.g. Tier 0 URLs plus CX-mesh items plus
    // connector-factory items producing overlapping "cx_0", "jina_0", etc.),
    // and the old Map<string, ...> silently overwrote them on set(). Object
    // identity is guaranteed unique per item, so this cannot collide.
    const enriched = new Map<DataSourceItem, { content: string; method: string; wikiPath?: string }>();
    let cachedHits = 0;     // Phase 1.7: how many we skipped via wiki dedup
    let wikiWrites = 0;     // Phase 1.2: how many we persisted after extraction
    let collisionWarnings = 0; // diagnostic: count if we ever try to set the same item twice

    /**
     * Check the wiki archive for an already-extracted copy of this URL.
     * Returns the cached content + wikiPath on hit, null on miss / error.
     * Failures are silent — we fall through to the normal fetch path.
     */
    async function checkWikiCache(url: string): Promise<{ content: string; wikiPath: string } | null> {
        try {
            const check = await fetch(`${PROXY}/api/wiki/check-article?url=${encodeURIComponent(url)}`, {
                signal: AbortSignal.timeout(4000),
            });
            if (!check.ok) return null;
            const data = await check.json();
            if (!data.cached || !data.wikiPath) return null;
            // Cached — fetch the full body from wiki
            const read = await fetch(`${PROXY}/api/wiki/read-article/${encodeURIComponent(data.wikiPath)}`, {
                signal: AbortSignal.timeout(6000),
            });
            if (!read.ok) return null;
            const readData = await read.json();
            if (!readData.content) return null;
            // Strip the YAML frontmatter + header block so just the body comes through.
            // Frontmatter is ---\n...\n---\n; header is "# Title\n\nSource: ...\n\n"
            const stripped = readData.content
                .replace(/^---\n[\s\S]*?\n---\n\n?/, '')
                .replace(/^#\s+[^\n]+\n\n?/, '')
                .replace(/^Source:\s+\[[^\]]+\]\([^)]+\)\n\n?/, '')
                .trim();
            if (stripped.length < 500) return null;
            return { content: stripped, wikiPath: data.wikiPath };
        } catch {
            return null;
        }
    }

    /**
     * Persist an extracted article to the wiki. Returns the wikiPath on
     * success or null on failure. Non-blocking — enrichment still succeeds
     * if the write fails.
     */
    async function writeWikiArticle(item: DataSourceItem, content: string, method: string, source: string): Promise<string | null> {
        try {
            // 2026-04-29 — Timeout raised from 8s to 25s. The proxy's
            // /api/wiki/write-article endpoint synchronously embeds the
            // article via OpenAI (1-3s per call) before returning. With
            // 8-wide concurrency from residual archival, some writes
            // succeeded server-side but the client's 8s window had already
            // expired by the time the response arrived — causing the
            // frontend to undercount persistence (e.g. "9/46 persisted"
            // when the proxy actually wrote ~30). 25s comfortably covers
            // the slowest p99 OpenAI embed even under burst load.
            const resp = await fetch(`${PROXY}/api/wiki/write-article`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: item.url,
                    content,
                    source: source || undefined,
                    title: item.title || undefined,
                    date: (item as any).date || (item as any).publicationDate || undefined,
                    tier: (item as any).credibilityTier || undefined,
                    method,
                    kind: 'article',
                }),
                signal: AbortSignal.timeout(25000),
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            return data.wikiPath || null;
        } catch {
            return null;
        }
    }

    let enrichFailures = 0;
    let enrichNon200 = 0;

    // ===== PHASE 1 — Wiki cache checks (local proxy, cheap, 8-wide) =====
    // This pass ONLY asks the proxy "do you already have this URL archived?"
    // and loads the body if so. No Jina traffic. Cache checks are ~4-6s each
    // and don't hit external rate limits, so we run them wide.
    const cacheMisses: DataSourceItem[] = [];
    for (let i = 0; i < toEnrich.length; i += CACHE_CHECK_CONCURRENCY) {
        const batch = toEnrich.slice(i, i + CACHE_CHECK_CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(async (item) => {
                const cached = await checkWikiCache(item.url!);
                return cached ? { item, cached } : { item, cached: null };
            })
        );
        for (const r of results) {
            if (r.status !== 'fulfilled' || !r.value) continue;
            const { item, cached } = r.value;
            if (cached) {
                cachedHits++;
                console.log(`  Wiki cache HIT "${item.title?.substring(0, 40)}" (${cached.content.length} chars, ${cached.wikiPath})`);
                if (enriched.has(item)) collisionWarnings++;
                enriched.set(item, {
                    content: cached.content.substring(0, ENRICHMENT_PER_ITEM_CAP),
                    method: 'wiki-cache',
                    wikiPath: cached.wikiPath,
                });
            } else {
                cacheMisses.push(item);
            }
        }
    }
    if (cachedHits > 0) {
        console.log(`[Enrich] Phase 1 (cache): ${cachedHits}/${toEnrich.length} items served from wiki archive. ${cacheMisses.length} require fresh extraction.`);
    }

    // ===== PHASE 2 — Jina / PDF extraction for cache misses (3-wide) =====
    // Jina is an external rate-limited service. Empirically bursts above 3
    // parallel requests trigger throttle → 45-second timeout pileups
    // (observed 2026-04-21: 20+ consecutive timeouts after a 6-wide burst).
    // Keeping this strict at 3 prevents the pileup and actually delivers
    // more successful extractions per run despite lower concurrency.
    for (let i = 0; i < cacheMisses.length; i += JINA_EXTRACT_CONCURRENCY) {
        const batch = cacheMisses.slice(i, i + JINA_EXTRACT_CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(async (item) => {
                try {
                    // Smart extraction: tries PDF download first, then Jina web extraction
                    const resp = await fetch(`${PROXY}/api/extract-content?url=${encodeURIComponent(item.url!)}`, {
                        signal: AbortSignal.timeout(45000)
                    });
                    if (!resp.ok) {
                        enrichNon200++;
                        console.warn(`  Enrich FAIL "${item.title?.substring(0, 50)}" → HTTP ${resp.status} @ ${item.url?.substring(0, 80)}`);
                        return null;
                    }
                    const data = await resp.json();
                    const fullContent = data.content;
                    const method = data.method; // 'pdf' or 'jina'
                    if (fullContent && fullContent.length > (item.content?.length || 0)) {
                        console.log(`  Enriched "${item.title?.substring(0,40)}" via ${method} (${fullContent.length} chars)`);
                        const capped = fullContent.substring(0, ENRICHMENT_PER_ITEM_CAP);
                        const wikiPath = await writeWikiArticle(item, capped, method, (item as any).sourceName || '');
                        if (wikiPath) wikiWrites++;
                        return { item, content: capped, method, wikiPath: wikiPath || undefined };
                    }
                    return null;
                } catch (err: any) {
                    enrichFailures++;
                    const errMsg = err?.name === 'TimeoutError' ? 'timeout' : (err?.message || 'unknown').substring(0, 100);
                    console.warn(`  Enrich ERR "${item.title?.substring(0, 50)}" → ${errMsg}`);
                    return null;
                }
            })
        );
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value && r.value.item) {
                if (enriched.has(r.value.item)) collisionWarnings++;
                enriched.set(r.value.item, {
                    content: r.value.content,
                    method: r.value.method || 'web',
                    wikiPath: (r.value as any).wikiPath,
                });
            }
        }
    }

    // Honest summary: the Map is keyed by item reference, so enriched.size is
    // now the TRUE count of unique items that received content (previously the
    // Map was keyed by string id and silently collapsed collisions, producing
    // "freshly extracted: -9" nonsense like "6/35 items enriched" when 17 had
    // actually succeeded). cachedHits and freshlyExtracted are counted
    // independently from their own logic branches.
    const freshlyExtracted = Math.max(0, enriched.size - cachedHits);
    console.log(`Content enrichment: ${enriched.size}/${toEnrich.length} items enriched (cached: ${cachedHits}, freshly extracted: ${freshlyExtracted}, persisted to wiki: ${wikiWrites}, failed: ${enrichFailures}, non-200: ${enrichNon200})`);
    if (collisionWarnings > 0) {
        console.warn(`[Enrich] ${collisionWarnings} unexpected item-reference collisions during set() — investigate if >0`);
    }

    // Phase 1-retrofit (2026-04-20) — WIKI-FIRST ARCHIVAL FOR EVERYTHING.
    // Items that skipped enrichment (already have >5KB body from Reddit/API)
    // or whose URL wasn't enrichable (social posts with no http URL, transcripts)
    // still carry real content we want queryable via the wiki later. Archive
    // them now — purely additive, does NOT alter the in-memory `items`
    // passed downstream to theme/persona/challenge/recommendation generation.
    // enriched is keyed by item reference, so membership check is direct.
    const residualToArchive = items.filter(item => {
        if (enriched.has(item)) return false;                         // already in wiki via enrichment
        const len = (item.content || '').length;
        if (len < 500) return false;                                  // pure headlines — skip (future: on-demand extraction tool)
        if (((item as any).relevanceScore || 0) < 30) return false;  // noise — drop
        return true;
    });
    if (residualToArchive.length > 0) {
        console.log(`Wiki residual archival: writing ${residualToArchive.length} items that bypassed enrichment (pre-existing body >=500 chars)`);
        let residualWrites = 0;
        // Bounded concurrency; this is fire-and-forget for the active session
        // but we do await so the wiki is populated BEFORE the caller returns
        // and the metadata index builder (next phase) has real files to scan.
        // Residual archival writes to local proxy only — use cache-check
        // concurrency (8-wide), not Jina-extract concurrency.
        for (let i = 0; i < residualToArchive.length; i += CACHE_CHECK_CONCURRENCY) {
            const batch = residualToArchive.slice(i, i + CACHE_CHECK_CONCURRENCY);
            const writes = await Promise.allSettled(
                batch.map(async (item) => {
                    // Use the item's own URL if present; otherwise synthesize a
                    // stable pseudo-URL so blake2b hashing produces a
                    // deterministic wiki path per session+item.
                    const stableUrl = item.url
                        || `hic://residual/${(item as any).sourceName || 'source'}/${encodeURIComponent(item.id)}`;
                    const pseudoItem = { ...item, url: stableUrl };
                    const wp = await writeWikiArticle(
                        pseudoItem as DataSourceItem,
                        (item.content || '').substring(0, ENRICHMENT_PER_ITEM_CAP),
                        (item as any).extractionMethod || 'source-native',
                        (item as any).sourceName || ''
                    );
                    return wp ? { id: item.id, wikiPath: wp } : null;
                })
            );
            for (const w of writes) {
                if (w.status === 'fulfilled' && w.value) {
                    residualWrites++;
                    // Attach wikiPath so KG builder + retrieval layer can reference it.
                    // Safe mutation — `items` is our locally-scoped collection.
                    const target = items.find(it => it.id === w.value!.id);
                    if (target) (target as any).wikiPath = w.value.wikiPath;
                }
            }
        }
        console.log(`Wiki residual archival: ${residualWrites}/${residualToArchive.length} persisted`);
    }

    // Replace short content with full content for enriched items. Also attach
    // the wikiPath so downstream KG builders can reference the archive copy.
    // Lookup is by item reference (not id), so no collisions — every item
    // that was successfully enriched in this pass gets its body swapped in.
    return items.map(item => {
        const enrichment = enriched.get(item);
        if (enrichment) {
            return {
                ...item,
                content: enrichment.content,
                enriched: true,
                extractionMethod: enrichment.method || 'web',
                wikiPath: enrichment.wikiPath,
            } as any;
        }
        return item;
    });
}

/**
 * TRI-MODEL PARALLEL ANALYSIS — Split enriched corpus across Gemini, Claude, OpenAI
 * Each model analyzes a third of the enriched items and produces a focused summary.
 * The three summaries are merged into a unified "multi-model synthesis" that gets
 * prepended to the corpus, giving the main session diverse analytical perspectives.
 */
const PROXY = 'http://localhost:5012';

async function triModelAnalysis(enrichedItems: DataSourceItem[], researchGoal: string): Promise<string> {
    if (enrichedItems.length < 6 || !researchGoal) return '';

    // Split enriched items into 3 groups by round-robin (ensures each model gets diverse sources)
    const groups: DataSourceItem[][] = [[], [], []];
    enrichedItems.forEach((item, i) => groups[i % 3].push(item));

    const modelConfigs = [
        { name: 'Gemini', endpoint: `${PROXY}/api/ai/gemini`, model: 'gemini-2.5-flash' },
        { name: 'Claude', endpoint: `${PROXY}/api/ai/anthropic`, model: 'claude-sonnet-4-6' },
        { name: 'OpenAI', endpoint: `${PROXY}/api/ai/openai`, model: 'gpt-5.4-mini' },
    ];

    const analyzeWithModel = async (config: typeof modelConfigs[0], items: DataSourceItem[]): Promise<string> => {
        const itemText = items.map((item, i) => `[${i+1}] ${item.title}\n${item.content?.substring(0, 1500) || ''}`).join('\n\n');
        const prompt = `Research objective: "${researchGoal}"

Analyze these ${items.length} research items and extract:
1. The 3-5 most important findings relevant to the research objective (with specific data points)
2. Any contradictions or tensions between sources
3. Gaps — what questions do these sources NOT answer?

ITEMS:\n${itemText}

Be specific. Cite item numbers. Extract statistics, percentages, and named entities.`;

        // Scale timeout by payload size: base 90s + 2s per item (large payloads need more time)
        const timeoutMs = Math.min(300000, 90000 + items.length * 2000);
        const MAX_RETRIES = 2;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                let body: any;
                let headers: Record<string, string> = { 'Content-Type': 'application/json' };

                if (config.name === 'Gemini') {
                    body = { model: config.model, contents: prompt, config: { temperature: 0.2 } };
                } else if (config.name === 'Claude') {
                    body = { model: config.model, max_tokens: 4000, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] };
                } else {
                    body = { model: config.model, input: prompt };
                }

                const resp = await fetch(config.endpoint, {
                    method: 'POST', headers, body: JSON.stringify(body),
                    signal: AbortSignal.timeout(timeoutMs),
                });

                if (!resp.ok) {
                    console.warn(`[TriModel] ${config.name} failed (attempt ${attempt + 1}): HTTP ${resp.status}`);
                    if (attempt < MAX_RETRIES - 1) { await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); continue; }
                    return '';
                }

                const data = await resp.json();

                // Extract text from different response formats
                if (config.name === 'Gemini') {
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || '';
                } else if (config.name === 'Claude') {
                    return (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '';
                } else {
                    return (data.output || []).filter((i: any) => i.type === 'message')
                        .flatMap((i: any) => (i.content || []).filter((b: any) => b.type === 'output_text').map((b: any) => b.text)).join('\n') || '';
                }
            } catch (e: any) {
                const isTimeout = e.message?.includes('timed out') || e.message?.includes('aborted') || e.name === 'TimeoutError';
                console.warn(`[TriModel] ${config.name} ${isTimeout ? 'timed out' : 'failed'} (attempt ${attempt + 1}/${MAX_RETRIES}, timeout ${Math.round(timeoutMs/1000)}s):`, e.message);
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
                    continue;
                }
                return '';
            }
        }
        return '';
    };

    console.log(`[TriModel] Running parallel analysis: ${groups.map((g, i) => `${modelConfigs[i].name}(${g.length} items)`).join(', ')}`);

    const results = await Promise.allSettled(
        modelConfigs.map((config, i) => analyzeWithModel(config, groups[i]))
    );

    const summaries = results
        .map((r, i) => {
            const text = r.status === 'fulfilled' ? r.value : '';
            return text ? `\n=== ${modelConfigs[i].name.toUpperCase()} ANALYSIS (${groups[i].length} items) ===\n${text}` : '';
        })
        .filter(Boolean);

    if (summaries.length === 0) return '';

    const successCount = summaries.length;
    console.log(`[TriModel] ${successCount}/3 models returned analysis`);

    return `\n=== TRI-MODEL PARALLEL ANALYSIS ===\nThree reasoning models each analyzed a different subset of the enriched evidence.\nModels: ${modelConfigs.filter((_, i) => results[i].status === 'fulfilled' && (results[i] as any).value).map(c => c.name).join(', ')}\n${summaries.join('\n')}\n=== END TRI-MODEL ANALYSIS ===\n`;
}

export async function mergeResultsToCorpus(
    executionResult: ResearchExecutionResult,
    researchGoal?: string,
    uploadedItems?: DataSourceItem[],
): Promise<string> {
    const sections: string[] = [];

    // Collect all items from all sources, then filter in one batch for efficiency
    const allItems: DataSourceItem[] = [];
    const sourceRanges: { name: string; start: number; count: number }[] = [];

    // Inject uploaded client documents as a synthetic "Client Uploads" source
    // so they appear as first-class source tiles in the Analyst Desk treemap
    // and as evidence nodes linked to any themes citing their text. They arrive
    // pre-enriched (parsed body is already in `content`) with relevanceScore=100
    // so the scorer won't filter them out. Placed FIRST so chunk IDs for client
    // docs occupy CHUNK_001..CHUNK_NN — makes citation resolution intuitive.
    if (uploadedItems && uploadedItems.length > 0) {
        sourceRanges.push({ name: 'Client Uploads', start: allItems.length, count: uploadedItems.length });
        allItems.push(...uploadedItems);
        console.log(`[Corpus] Injected ${uploadedItems.length} client upload(s) as first-class corpus items`);
    }

    for (const source of executionResult.sources) {
        if (source.status !== 'completed' || source.items.length === 0) continue;
        sourceRanges.push({ name: source.name, start: allItems.length, count: source.items.length });
        allItems.push(...source.items);
    }

    // Run AI relevance SCORING on ALL items at once
    let scoredItems = researchGoal && allItems.length > 5
        ? await filterAndScoreItems(allItems, researchGoal)
        : allItems.map(item => ({ ...item, relevanceScore: 70 }));

    // CONTENT ENRICHMENT: Fetch full text for top-scored items with short content
    scoredItems = await enrichTopItems(scoredItems);

    // TRI-MODEL PARALLEL ANALYSIS: Split enriched items across Gemini/Claude/OpenAI
    // Each model analyzes a subset; merged synthesis prepended to corpus
    let triModelSynthesis = '';
    if (researchGoal) {
        const enrichedItems = scoredItems.filter(item => (item as any).enriched);
        if (enrichedItems.length >= 6) {
            try {
                triModelSynthesis = await triModelAnalysis(enrichedItems, researchGoal);
            } catch (e) {
                console.warn('[TriModel] Analysis failed (non-blocking):', e);
            }
        }
    }

    // Build STRUCTURED corpus with chunk IDs for citation tracking
    // NO STATIC TIER LABELS — source credibility is determined POST-ANALYSIS
    // based on actual contribution to the research objective
    let chunkIndex = 0;
    const chunkMap: Record<string, ChunkSourceInfo> = {};

    // Group items by source, sorted by RELEVANCE SCORE (highest first)
    // Every source is equal until the AI proves otherwise through analysis
    const scoredSet = new Set(scoredItems.map(i => i.id));

    const rangesWithRelevance = sourceRanges.map(range => {
        const sourceItems = allItems.slice(range.start, range.start + range.count);
        const kept = sourceItems.filter(item => scoredSet.has(item.id));
        const avgRelevance = kept.length > 0
            ? kept.reduce((sum, item) => sum + ((item as any).relevanceScore || 50), 0) / kept.length
            : 0;
        return { ...range, avgRelevance, kept };
    });
    // Sort by average relevance — most relevant sources appear first
    rangesWithRelevance.sort((a, b) => b.avgRelevance - a.avgRelevance);

    for (const range of rangesWithRelevance) {
        const kept = range.kept;

        if (kept.length === 0) continue; // Skip empty sources silently

        sections.push(`\n=== SOURCE: ${range.name} (${kept.length} items, avg relevance: ${Math.round(range.avgRelevance)}/100) ===\n`);

        for (const item of kept) {
            chunkIndex++;
            const chunkId = `CHUNK_${String(chunkIndex).padStart(3, '0')}`;
            const score = (item as any).relevanceScore || '?';
            const freshness = item.date ? `Freshness: ${computeFreshnessFromDate(item.date)}` : 'Undated';
            const enrichedTag = (item as any).enriched ? ` | FULL TEXT (${(item as any).extractionMethod || 'web'})` : '';

            // Track chunk-to-source mapping for human-readable citation resolution
            chunkMap[chunkId] = {
                sourceName: range.name,
                title: item.title || '',
                url: item.url,
            };

            sections.push(`[${chunkId}] Relevance: ${score}/100 | ${freshness}${enrichedTag}`);
            sections.push(`SOURCE: ${range.name}`);
            sections.push(`Title: ${item.title}`);
            if (item.url) sections.push(`URL: ${item.url}`);
            if (item.date) sections.push(`Date: ${item.date}`);
            sections.push(item.content);
            sections.push('');
        }
    }

    const activeSources = rangesWithRelevance.filter(r => r.kept.length > 0).length;

    // Add citation instruction header at the top
    const header = `=== RESEARCH CORPUS: ${scoredItems.length} items from ${activeSources} sources ===
NO PRE-ASSIGNED CREDIBILITY TIERS. Source value is determined by YOU based on actual contribution to the research objective. An academic paper irrelevant to the goal is worth less than a practitioner Reddit post that describes exactly the problem the client faces. Judge each source by what it contributes, not where it came from.
CITATION RULE: Cite sources using [CHUNK_XXX] format. Every factual claim must reference the chunk it came from. Cite from across the FULL corpus range.\n`;

    let corpus = header + (triModelSynthesis ? triModelSynthesis + '\n\n' : '') + sections.join('\n');

    // CORPUS SIZE GUARD (raised 2026-04-29). Gemini 2.5 Flash supports a 1M-
    // token input window — that's roughly 3.5MB of text. The previous 500KB
    // cap was sized for Claude's 200K-token window and was strangling the
    // theme synthesis: a 1077-chunk corpus was being truncated to ~20 chunks,
    // producing only 4 themes regardless of prompt instructions.
    //
    // New cap: 2.5MB. Matches the Gemini config in App.tsx:2786
    // (maxChars: 2_500_000). Leaves ~30% headroom for system prompt + wiki
    // knowledge + uploaded files within Gemini's actual budget.
    //
    // Claude fallback path: if Gemini repetition-collapses, the orchestrator
    // routes to Claude. Claude has a 200K-token (~600KB) limit, so the
    // fallback layer applies its own tighter truncation downstream — that
    // logic is unchanged. Don't pre-truncate for Claude here; doing so
    // strangles Gemini for a tail-case fallback that may not even trigger.
    const MAX_CORPUS_CHARS = 2_500_000;
    if (corpus.length > MAX_CORPUS_CHARS) {
        console.warn(`[Corpus] Corpus size ${Math.round(corpus.length / 1024)}KB exceeds ${MAX_CORPUS_CHARS / 1024}KB limit. Truncating low-relevance items.`);
        // Truncate from the end (lowest-relevance items are last since we sort by relevance)
        corpus = corpus.substring(0, MAX_CORPUS_CHARS);
        // Ensure we don't cut mid-chunk — find last complete chunk boundary
        const lastChunkEnd = corpus.lastIndexOf('\n[CHUNK_');
        if (lastChunkEnd > MAX_CORPUS_CHARS * 0.8) {
            corpus = corpus.substring(0, lastChunkEnd);
        }
        corpus += '\n\n[CORPUS TRUNCATED — lowest-relevance items omitted to fit context window]\n';
    } else {
        console.log(`[Corpus] Corpus size ${Math.round(corpus.length / 1024)}KB (under ${MAX_CORPUS_CHARS / 1024}KB cap — full corpus passed to LLM)`);
    }

    // Store chunk map for downstream citation resolution
    _chunkSourceMap = chunkMap;
    console.log(`[Corpus] Built chunk-to-source map: ${Object.keys(chunkMap).length} chunks mapped`);

    return corpus;
}
