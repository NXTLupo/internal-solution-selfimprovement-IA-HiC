/**
 * Deep Research Service
 * Unified interface for live web research across all frontier AI models.
 *
 * Three modes:
 * 1. Quick Grounding (5-15s, ~$0.01-0.05) — fact-check, current data
 * 2. Focused Research (30-120s, ~$0.10-0.50) — topic exploration, evidence gathering
 * 3. Deep Research (5-30min, ~$2-5) — comprehensive landscape analysis via Gemini Interactions API
 */

import { GoogleGenAI } from "@google/genai";

// --- TYPES ---

export type ResearchMode = 'quick' | 'focused' | 'deep';

export interface ResearchConfig {
    mode: ResearchMode;
    query: string;
    maxSearches?: number;           // focused mode: 5-20, default 10
    searchContextSize?: 'low' | 'medium' | 'high';  // OpenAI
    allowedDomains?: string[];      // Claude: restrict to these domains
    blockedDomains?: string[];      // Claude: exclude these domains
    searchRegion?: string;          // OpenAI: country code for localization
    thinkingBudget?: number;        // Claude: thinking budget tokens
    preferredProvider?: 'gemini' | 'claude' | 'openai';  // user override
}

export interface ResearchSource {
    url: string;
    title: string;
    snippet?: string;
    citedText?: string;
}

export interface ResearchResult {
    mode: ResearchMode;
    provider: string;
    content: string;                // the synthesized research text
    sources: ResearchSource[];
    searchQueriesUsed: string[];
    estimatedCost: number;
    durationMs: number;
    status: 'completed' | 'failed';
    error?: string;
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
    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: config.query,
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

    return {
        mode: config.mode,
        provider: 'gemini',
        content: text,
        sources,
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
    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });

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

// --- CLAUDE WEB SEARCH ---

async function claudeWebSearch(config: ResearchConfig): Promise<ResearchResult> {
    const start = Date.now();
    const apiKey = (process.env as any).ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const maxUses = config.mode === 'quick' ? 3 : (config.maxSearches || 10);

    const toolDef: any = {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: maxUses,
    };
    if (config.allowedDomains?.length) toolDef.allowed_domains = config.allowedDomains;
    if (config.blockedDomains?.length) toolDef.blocked_domains = config.blockedDomains;

    const body: any = {
        model: 'claude-opus-4-6',
        max_tokens: 16000,
        tools: [toolDef],
        messages: [{ role: 'user', content: [{ type: 'text', text: config.query }] }],
    };

    // Enable extended thinking for focused mode
    if (config.mode === 'focused') {
        body.thinking = {
            type: 'enabled',
            budget_tokens: config.thinkingBudget || 8000,
        };
    }

    // Route through proxy to bypass CORS in browser
    const proxyUrl = typeof window !== 'undefined' ? 'http://localhost:5012/api/ai/anthropic' : 'https://api.anthropic.com/v1/messages';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (proxyUrl.includes('anthropic.com')) {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
    }
    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude web search failed: ${response.status} ${err}`);
    }

    const data = await response.json();
    const sources: ResearchSource[] = [];
    let content = '';
    let searchCount = 0;

    for (const block of data.content || []) {
        if (block.type === 'web_search_tool_result') {
            searchCount++;
            for (const result of block.content || []) {
                if (result.type === 'web_search_result') {
                    sources.push({
                        url: result.url,
                        title: result.title,
                        snippet: result.page_age,
                    });
                }
            }
        }
        if (block.type === 'text') {
            content += block.text;
            // Extract citations from text block
            for (const cit of block.citations || []) {
                if (cit.type === 'web_search_result_location' && cit.cited_text) {
                    const existing = sources.find(s => s.url === cit.url);
                    if (existing) existing.citedText = cit.cited_text;
                }
            }
        }
    }

    return {
        mode: config.mode,
        provider: 'claude',
        content,
        sources,
        searchQueriesUsed: [`${searchCount} searches executed`],
        estimatedCost: searchCount * 0.01,
        durationMs: Date.now() - start,
        status: 'completed',
    };
}

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
    const proxyUrl = typeof window !== 'undefined' ? 'http://localhost:5012/api/ai/openai' : 'https://api.openai.com/v1/responses';
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

            case 'claude':
                return await claudeWebSearch(config);

            case 'openai':
                return await openaiWebSearch(config);

            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    } catch (error: any) {
        console.error(`Research failed (${provider}):`, error);

        // Fallback to next available provider
        const fallback = getFallbackProvider(provider);
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
    // With AI proxy routes, all providers now work from browser.
    // Route to the best provider per mode:
    // - quick: Gemini (fastest grounded search)
    // - focused: Claude (best document analysis + web search)
    // - deep: Gemini (Interactions API for autonomous research)
    if (mode === 'focused') return 'claude';
    return 'gemini';
}

function getFallbackProvider(failed: string): string | null {
    // With proxy, all providers available. Cascade: gemini -> claude -> openai
    const cascade = ['gemini', 'claude', 'openai'];
    const idx = cascade.indexOf(failed);
    if (idx >= 0 && idx < cascade.length - 1) return cascade[idx + 1];
    if (failed !== 'gemini') return 'gemini';
    return null;
}

/**
 * Check which research providers are available based on API keys.
 */
export function getAvailableProviders(): { provider: string; modes: ResearchMode[] }[] {
    const results: { provider: string; modes: ResearchMode[] }[] = [];
    if ((process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY) {
        results.push({ provider: 'gemini', modes: ['quick', 'focused', 'deep'] });
    }
    if ((process.env as any).ANTHROPIC_API_KEY) {
        results.push({ provider: 'claude', modes: ['quick', 'focused'] });
    }
    if ((process.env as any).OPENAI_API_KEY) {
        results.push({ provider: 'openai', modes: ['quick', 'focused'] });
    }
    return results;
}
