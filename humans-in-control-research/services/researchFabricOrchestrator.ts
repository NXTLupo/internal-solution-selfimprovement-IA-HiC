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

Rules:
- Each query: 4-8 keywords, no filler words
- For news sources: include year references (2025, 2026) to get recent content
- For academic sources: use field-specific terminology
- For economic sources: use indicator-relevant terms (GDP, employment, market size)
- For social sources: use community language, not formal terms`;

    try {
        const result = await geminiJSON<Record<string, string>>(prompt);
        return result;
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

    // 7. CX Mesh - Subreddits
    if (enabledCategories.cxMesh?.subreddits?.length) {
        for (const sub of enabledCategories.cxMesh.subreddits) {
            sources.push({
                id: `src_${id++}`,
                type: 'subreddit',
                name: `Reddit: r/${sub}`,
                description: `Collect posts and comments from r/${sub}`,
                query: sub,
                config: { source: 'reddit', target: sub, count: 30 },
                estimatedCost: 0,
                estimatedTimeSeconds: 30,
                enabled: true,
            });
        }
    }

    // 7b. CX Mesh - TrustPilot
    if (enabledCategories.cxMesh?.trustpilot?.length) {
        for (const company of enabledCategories.cxMesh.trustpilot) {
            sources.push({
                id: `src_${id++}`,
                type: 'cx_mesh',
                name: `TrustPilot: ${company}`,
                description: `Collect reviews from TrustPilot for ${company}`,
                query: company,
                config: { source: 'trustpilot', target: company, count: 100 },
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
                description: `Collect app reviews for ${pkg}`,
                query: pkg,
                config: { source: 'playstore', target: pkg, count: 100 },
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
 * Content Enrichment: Fetch full text from top-scored items via Jina Reader.
 * Academic APIs only return titles/abstracts. This downloads the actual content
 * from the URL (landing page, open access PDF, blog post) to get the real evidence.
 */
async function enrichTopItems(items: DataSourceItem[], maxItems: number = 30): Promise<DataSourceItem[]> {
    // Only enrich items that have URLs and short content (likely just abstracts)
    const needsEnrichment = items.filter(item =>
        item.url &&
        item.url.startsWith('http') &&
        (item.content?.length || 0) < 300 &&  // Short content = likely just abstract/title
        (item as any).relevanceScore >= 60     // Only enrich relevant items
    );

    if (needsEnrichment.length === 0) return items;

    // Take top N by relevance score
    const toEnrich = needsEnrichment
        .sort((a, b) => ((b as any).relevanceScore || 0) - ((a as any).relevanceScore || 0))
        .slice(0, maxItems);

    console.log(`Content enrichment: Fetching full text for ${toEnrich.length} top-scored items via Jina Reader`);

    const PROXY = 'http://localhost:5012';
    const enriched = new Map<string, { content: string; method: string }>();

    // Fetch in small batches (3 concurrent) to avoid overwhelming Jina
    for (let i = 0; i < toEnrich.length; i += 3) {
        const batch = toEnrich.slice(i, i + 3);
        const results = await Promise.allSettled(
            batch.map(async (item) => {
                try {
                    // Smart extraction: tries PDF download first, then Jina web extraction
                    const resp = await fetch(`${PROXY}/api/extract-content?url=${encodeURIComponent(item.url!)}`, {
                        signal: AbortSignal.timeout(30000)
                    });
                    if (!resp.ok) return null;
                    const data = await resp.json();
                    const fullContent = data.content;
                    const method = data.method; // 'pdf' or 'jina'
                    if (fullContent && fullContent.length > (item.content?.length || 0)) {
                        console.log(`  Enriched "${item.title?.substring(0,40)}" via ${method} (${fullContent.length} chars)`);
                        return { id: item.id, content: fullContent.substring(0, 3000), method };  // Cap at 3KB per item (reduced from 5KB to prevent token overflow)
                    }
                    return null;
                } catch { return null; }
            })
        );

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                enriched.set(r.value.id, { content: r.value.content, method: r.value.method || 'web' });
            }
        }
    }

    console.log(`Content enrichment: ${enriched.size}/${toEnrich.length} items enriched with full text`);

    // Replace short content with full content for enriched items
    return items.map(item => {
        const enrichment = enriched.get(item.id);
        if (enrichment) {
            return { ...item, content: (enrichment as any).content || enrichment, enriched: true, extractionMethod: (enrichment as any).method || 'web' } as any;
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

export async function mergeResultsToCorpus(executionResult: ResearchExecutionResult, researchGoal?: string): Promise<string> {
    const sections: string[] = [];

    // Collect all items from all sources, then filter in one batch for efficiency
    const allItems: DataSourceItem[] = [];
    const sourceRanges: { name: string; start: number; count: number }[] = [];

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

    // CORPUS SIZE GUARD: Gemini 2.5 Flash can handle ~1M tokens input but the combined
    // corpus + system prompt + wiki knowledge + uploaded files can exceed limits.
    // Cap the corpus at 500KB (~125K tokens) to leave room for everything else.
    const MAX_CORPUS_CHARS = 500_000;
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
    }

    // Store chunk map for downstream citation resolution
    _chunkSourceMap = chunkMap;
    console.log(`[Corpus] Built chunk-to-source map: ${Object.keys(chunkMap).length} chunks mapped`);

    return corpus;
}
