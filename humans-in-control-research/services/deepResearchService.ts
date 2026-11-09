/**
 * Deep Research Service
 * Unified interface for live web research across all frontier AI models.
 *
 * Three modes:
 * 1. Quick Grounding (5-15s, ~$0.01-0.05) - fact-check, current data
 * 2. Focused Research (30-120s, ~$0.10-0.50) - topic exploration, evidence gathering
 * 3. Deep Research (5-30min, ~$2-5) - comprehensive landscape analysis via Gemini Interactions API
 */

import { GoogleGenAI } from "@google/genai";
import { makeGenAI } from './genaiClient';
import { providerAvailable } from './proxyConfig';

// --- TYPES ---

export type ResearchMode = 'quick' | 'focused' | 'deep';

export interface ResearchConfig {
    mode: ResearchMode;
    query: string;
    maxSearches?: number;           // focused mode: 5-20, default 10
    searchContextSize?: 'low' | 'medium' | 'high';  // OpenAI
    allowedDomains?: string[];      // (legacy field - was Claude-only; ignored on this branch)
    blockedDomains?: string[];      // (legacy field - was Claude-only; ignored on this branch)
    searchRegion?: string;          // OpenAI: country code for localization
    thinkingBudget?: number;        // (legacy Claude field; ignored on this branch)
    preferredProvider?: 'gemini' | 'openai';  // user override
}

export interface ResearchSource {
    url: string;
    title: string;
    snippet?: string;
    citedText?: string;
}

/**
 * Per-segment source attribution from Gemini's grounding metadata
 * (`groundingMetadata.groundingSupports[]`). Each entry ties a char span of the
 * synthesized `content` to the source(s) that support it — this is the data that
 * lets a downstream quote be attributed to its REAL underlying source instead of
 * the whole-doc synthesis bucket. Capturing it is the fix for the "all 167 quotes
 * stamped Dakota" mis-attribution: the span->source map existed at fetch time and
 * was previously discarded. (2026-06-30.)
 */
export interface GroundingSupport {
    start: number;          // char start index into `content`
    end: number;            // char end index into `content`
    text: string;           // the supported segment text (verbatim slice of content)
    sourceIdxs: number[];   // indices into ResearchResult.sources[]
}

export interface ResearchResult {
    mode: ResearchMode;
    provider: string;
    content: string;                // the synthesized research text
    sources: ResearchSource[];
    /** Per-span source attribution (segment -> sources). Empty when the provider
     *  returned no grounding supports. Enables real per-quote source resolution. */
    groundingSupports?: GroundingSupport[];
    searchQueriesUsed: string[];
    estimatedCost: number;
    durationMs: number;
    status: 'completed' | 'failed';
    error?: string;
}

/** Map a provider groundingMetadata object to our GroundingSupport[]. Defensive:
 *  field names per the Gemini grounded-generation response; logs nothing, returns
 *  [] when the shape is absent so callers degrade to doc-level attribution. */
function extractGroundingSupports(gm: any): GroundingSupport[] {
    const raw = gm?.groundingSupports;
    if (!Array.isArray(raw)) return [];
    const out: GroundingSupport[] = [];
    for (const s of raw) {
        const seg = s?.segment || {};
        const start = typeof seg.startIndex === 'number' ? seg.startIndex : (typeof seg.start_index === 'number' ? seg.start_index : -1);
        const end = typeof seg.endIndex === 'number' ? seg.endIndex : (typeof seg.end_index === 'number' ? seg.end_index : -1);
        const idxs = s?.groundingChunkIndices || s?.grounding_chunk_indices || [];
        if (start >= 0 && end > start && Array.isArray(idxs) && idxs.length > 0) {
            out.push({ start, end, text: String(seg.text || ''), sourceIdxs: idxs.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0) });
        }
    }
    return out;
}

export interface DeepResearchProgress {
    status: 'starting' | 'researching' | 'synthesizing' | 'completed' | 'failed';
    message: string;
    elapsedMs: number;
}

// --- COST ESTIMATES ---
export function estimateCost(mode: ResearchMode, maxSearches?: number): { low: number; high: number; description: string } {
    switch (mode) {
        case 'quick':
            return { low: 0.01, high: 0.05, description: '1-3 searches, instant results' };
        case 'focused':
            const searches = maxSearches || 10;
            return { low: searches * 0.01, high: searches * 0.03, description: `${searches} searches, iterative refinement` };
        case 'deep':
            return { low: 2.00, high: 5.00, description: 'Autonomous multi-step research, 5-30 minutes' };
    }
}

// --- GEMINI GROUNDING (Quick + Focused) ---

async function geminiGroundedSearch(config: ResearchConfig): Promise<ResearchResult> {
    const start = Date.now();
    if (!providerAvailable('gemini')) throw new Error('Gemini is not configured on the proxy');

    const ai = makeGenAI();

    // Structured research prompt following the Deep Research template pattern:
    // temporal grounding, quality rules, multi-step methodology, relevance constraints, self-validation
    const today = new Date().toISOString().split('T')[0];
    const groundedPrompt = `You are a Deep Research system. Date of research: ${today}. Language: English.

TASK: Find the most relevant, authoritative evidence for this SPECIFIC research objective:
"${config.query}"

SOURCE QUALITY RULES:
- Prioritize primary/official sources: government agencies, academic institutions, official reports, peer-reviewed research, authoritative industry analysis
- Every source MUST be DIRECTLY relevant to the research objective above. Generic tech news, product announcements, or tangentially related content is IRRELEVANT and must be excluded.
- If a claim cannot be verified, write "unspecified" - do not fabricate data
- Prefer sources with specific data points: statistics, percentages, dollar amounts, timelines, named stakeholders

RELEVANCE FILTER (CRITICAL):
Before including ANY source or finding, apply this test:
"Does this source contain specific information that a consultant working on '${config.query.substring(0, 100)}' would cite in their strategy deck?"
If NO → exclude it. If YES → include it with a specific data point.

RESEARCH METHODOLOGY:
A) Search for sources that DIRECTLY address the research objective - not the general topic area
B) For each source found, extract the SPECIFIC data point, statistic, or finding that is relevant
C) Cite each finding with its source URL
D) Synthesize findings into a coherent analysis organized by theme

ANTI-PATTERNS (these make the research useless):
- Generic AI product news (e.g., "Google releases new Gemini model") when the research is about a specific organization
- Industry trend articles with no specific data points
- Sources about a different domain than the research objective
- Marketing content or press releases with no analytical substance

OUTPUT: Provide a structured synthesis with:
1. Key findings organized by theme (each with specific data points)
2. Source citations for every factual claim
3. Gaps identified - what questions remain unanswered by available evidence`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: groundedPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const candidate = response.candidates?.[0];
    const text = response.text || '';
    const gm = candidate?.groundingMetadata;

    const sources: ResearchSource[] = (gm?.groundingChunks || [])
        .filter((c: any) => c.web)
        .map((c: any) => ({
            url: c.web.uri,
            title: c.web.title || '',
        }));

    const searchQueries = gm?.webSearchQueries || [];
    const groundingSupports = extractGroundingSupports(gm);

    return {
        mode: config.mode,
        provider: 'gemini',
        content: text,
        sources,
        groundingSupports,
        searchQueriesUsed: searchQueries,
        estimatedCost: searchQueries.length * 0.014,
        durationMs: Date.now() - start,
        status: 'completed',
    };
}

// --- GEMINI DEEP RESEARCH (Interactions API) ---

async function geminiDeepResearch(
    config: ResearchConfig,
    onProgress?: (p: DeepResearchProgress) => void
): Promise<ResearchResult> {
    const start = Date.now();
    if (!providerAvailable('gemini')) throw new Error('Gemini is not configured on the proxy');

    const ai = makeGenAI();

    onProgress?.({ status: 'starting', message: 'Initiating deep research agent...', elapsedMs: 0 });

    // Start deep research interaction
    const interaction = await (ai as any).interactions.create({
        agent: 'deep-research-pro-preview-12-2025',
        input: config.query,
        background: true,
    });

    const interactionId = interaction.id;
    onProgress?.({ status: 'researching', message: `Research task started (ID: ${interactionId})`, elapsedMs: Date.now() - start });

    // Poll for completion
    let result: any;
    const maxAttempts = 360; // 60 minutes at 10s intervals
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 10000));
        result = await (ai as any).interactions.get(interactionId);

        const elapsed = Date.now() - start;
        if (result.status === 'in_progress') {
            onProgress?.({
                status: 'researching',
                message: `Researching... (${Math.round(elapsed / 1000)}s elapsed)`,
                elapsedMs: elapsed,
            });
        } else if (result.status === 'completed') {
            onProgress?.({ status: 'completed', message: 'Research complete', elapsedMs: elapsed });
            break;
        } else if (result.status === 'failed' || result.status === 'cancelled') {
            return {
                mode: 'deep', provider: 'gemini', content: '', sources: [],
                searchQueriesUsed: [], estimatedCost: 0, durationMs: elapsed,
                status: 'failed', error: result.error || 'Research failed',
            };
        }
    }

    const outputText = result?.outputs?.[result.outputs.length - 1]?.text || '';

    return {
        mode: 'deep',
        provider: 'gemini',
        content: outputText,
        sources: [], // Deep research doesn't expose individual source URLs in the same way
        searchQueriesUsed: [],
        estimatedCost: 3.00, // Rough estimate
        durationMs: Date.now() - start,
        status: 'completed',
    };
}

// --- CLAUDE WEB SEARCH (REMOVED 2026-05-03) ---
// claudeWebSearch and the 'claude' branch in executeResearch were removed
// when this branch (HiC-Gemini-Primary) eliminated all Anthropic pipeline
// paths. Web search now routes through Gemini grounding (default) or the
// OpenAI web_search_preview tool - never through Anthropic.

// --- OPENAI WEB SEARCH ---

async function openaiWebSearch(config: ResearchConfig): Promise<ResearchResult> {
    const start = Date.now();
    const apiKey = (process.env as any).OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const tool: any = {
        type: 'web_search_preview',
        search_context_size: config.searchContextSize || (config.mode === 'quick' ? 'low' : 'medium'),
    };
    if (config.searchRegion) {
        tool.user_location = { type: 'approximate', country: config.searchRegion };
    }

    // Route through proxy to bypass CORS in browser
    const proxyUrl = typeof window !== 'undefined' ? 'http://127.0.0.1:5012/api/ai/openai' : 'https://api.openai.com/v1/responses';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (proxyUrl.includes('openai.com')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: 'gpt-5.4-mini',
            tools: [tool],
            input: config.query,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI web search failed: ${response.status} ${err}`);
    }

    const data = await response.json();
    const sources: ResearchSource[] = [];
    let content = '';

    for (const item of data.output || []) {
        if (item.type === 'message' && item.content) {
            for (const block of item.content) {
                if (block.type === 'output_text') {
                    content += block.text;
                    for (const ann of block.annotations || []) {
                        if (ann.type === 'url_citation') {
                            sources.push({
                                url: ann.url,
                                title: ann.title || '',
                                citedText: content.substring(ann.start_index, ann.end_index),
                            });
                        }
                    }
                }
            }
        }
    }

    return {
        mode: config.mode,
        provider: 'openai',
        content,
        sources,
        searchQueriesUsed: ['OpenAI managed search'],
        estimatedCost: config.mode === 'quick' ? 0.025 : 0.03,
        durationMs: Date.now() - start,
        status: 'completed',
    };
}

// --- PUBLIC API: UNIFIED ROUTER ---

/**
 * Execute a research query using the optimal provider for the selected mode.
 * User can override provider with config.preferredProvider.
 */
export async function executeResearch(
    config: ResearchConfig,
    onProgress?: (p: DeepResearchProgress) => void
): Promise<ResearchResult> {
    const provider = config.preferredProvider || getDefaultProvider(config.mode);

    try {
        switch (provider) {
            case 'gemini':
                if (config.mode === 'deep') {
                    return await geminiDeepResearch(config, onProgress);
                }
                return await geminiGroundedSearch(config);

            case 'openai':
                return await openaiWebSearch(config);

            // 2026-05-03 - 'claude' branch removed on this branch
            // (HiC-Gemini-Primary). Anthropic web search is no longer
            // available; the 'preferredProvider' type also no longer
            // includes 'claude'.

            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    } catch (error: any) {
        console.error(`Research failed (${provider}):`, error);

        // Fallback to next available provider
        const fallback = getFallbackProvider(provider) as ('gemini' | 'openai' | null);
        if (fallback && fallback !== provider) {
            console.warn(`Falling back to ${fallback}`);
            return executeResearch({ ...config, preferredProvider: fallback }, onProgress);
        }

        return {
            mode: config.mode,
            provider,
            content: '',
            sources: [],
            searchQueriesUsed: [],
            estimatedCost: 0,
            durationMs: 0,
            status: 'failed',
            error: error.message,
        };
    }
}

function getDefaultProvider(mode: ResearchMode): string {
    // 2026-05-03 - All modes default to Gemini on this branch
    // (HiC-Gemini-Primary). Anthropic provider was removed from the cascade
    // and from the preferredProvider type union.
    return 'gemini';
}

function getFallbackProvider(failed: string): string | null {
    // 2026-05-03 - Two-provider cascade after Anthropic elimination.
    // gemini → openai → null. Failures past openai surface as research errors.
    const cascade = ['gemini', 'openai'];
    const idx = cascade.indexOf(failed);
    if (idx >= 0 && idx < cascade.length - 1) return cascade[idx + 1];
    if (failed !== 'gemini') return 'gemini';
    return null;
}

/**
 * Check which research providers are available based on API keys.
 */
export function getAvailableProviders(): { provider: string; modes: ResearchMode[] }[] {
    // 2026-05-03 - Anthropic removed from the available providers list on
    // this branch (HiC-Gemini-Primary). Only Google + OpenAI surface here.
    const results: { provider: string; modes: ResearchMode[] }[] = [];
    if ((process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY) {
        results.push({ provider: 'gemini', modes: ['quick', 'focused', 'deep'] });
    }
    if ((process.env as any).OPENAI_API_KEY) {
        results.push({ provider: 'openai', modes: ['quick', 'focused'] });
    }
    return results;
}
