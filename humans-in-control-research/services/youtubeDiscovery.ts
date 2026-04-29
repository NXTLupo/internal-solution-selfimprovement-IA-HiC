/**
 * YouTube Discovery — AI-driven video search query expansion + end-to-end
 * discover→rank→transcribe orchestration.
 *
 * The user's brief is usually a long role-framed prompt ("ROLE You are an
 * elite market research analyst... MISSION Surface quantified case studies
 * from named peer institutions..."). Feeding that raw into a YouTube search
 * returns garbage. This module takes the extracted research objective and
 * asks Gemini for 3-5 targeted video search queries optimized for YouTube's
 * search engine (short, entity-rich, "CASE conference CRM consolidation"
 * style).
 *
 * Then the orchestrator:
 *   1. Picks lens-appropriate channels via youtubeChannelRegistry
 *   2. Calls /api/youtube/discover-by-channels (proxy endpoint) which
 *      fans out to each channel's RSS and scores videos by keyword overlap
 *   3. Returns the top N video URLs (default 5) with metadata
 *   4. Those URLs flow into the existing Video Transcriber connector path
 *      — Whisper transcribes, transcripts land in wiki/transcripts/,
 *      and the transcripts become first-class DataSourceItems in the corpus
 */

import { extractResearchObjective } from './wikiService';
import { tryRepairJson } from './aiRouter';

// --- AI QUERY SUGGESTION ---

export interface VideoQuerySuggestions {
    queries: string[];              // 3-5 YouTube search queries
    namedEntities: string[];        // Key orgs/people/tools for channel prioritization
    rationale?: string;             // Why these queries (debug/audit)
}

/**
 * Ask Gemini for 3-5 targeted YouTube search queries given the research
 * objective. Returns empty queries on any failure — caller falls back to
 * using the objective string directly.
 */
export async function suggestVideoQueries(goal: string, lens?: string): Promise<VideoQuerySuggestions> {
    const objective = extractResearchObjective(goal);
    if (!objective || objective.length < 20) {
        return { queries: [], namedEntities: [] };
    }

    // Use the proxy's Gemini endpoint so we don't need a client-side API key
    const PROXY_BASE = 'http://localhost:5012';
    const prompt = `You are optimizing YouTube search queries for a research project.

RESEARCH OBJECTIVE:
"""
${objective.substring(0, 2000)}
"""

${lens ? `ACTIVE LENS: ${lens}\n` : ''}

Generate 3-5 YouTube search queries that will surface high-signal video content for this research. Rules:
- Each query: 3-8 words, entity-rich ("CASE conference CRM consolidation"), NOT sentence-style
- Avoid generic terms ("innovation", "strategy", "best practices")
- Name specific conferences/vendors/orgs/methodologies when they're clearly implied
- Skip clickbait modifiers ("ultimate", "shocking", "hacks")

Also extract the NAMED ENTITIES from the objective (specific orgs, tools, frameworks, people) — these let us prioritize YouTube CHANNELS belonging to those entities.

Return STRICT JSON only:
{
  "queries": ["query 1", "query 2", "query 3"],
  "namedEntities": ["Entity 1", "Entity 2"],
  "rationale": "one-sentence why these queries"
}`;

    try {
        // 2026-04-29 — Hardening pass.
        //   1. responseMimeType + responseSchema forces Gemini into strict
        //      JSON mode so it self-terminates cleanly (no more "Unexpected
        //      end of JSON input" from mid-string truncation).
        //   2. maxOutputTokens raised 800 -> 2048 — 800 was being hit on
        //      runs with rich namedEntities or longer rationale, producing
        //      truncated output even WITH JSON mode.
        //   3. tryRepairJson before JSON.parse covers the rare case where
        //      the proxy passes an older Gemini response shape or strips
        //      something unexpected in transit.
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'object',
                        properties: {
                            queries: { type: 'array', items: { type: 'string' } },
                            namedEntities: { type: 'array', items: { type: 'string' } },
                            rationale: { type: 'string' },
                        },
                        required: ['queries', 'namedEntities'],
                    },
                },
            }),
            signal: AbortSignal.timeout(25_000),
        });
        if (!resp.ok) return { queries: [], namedEntities: [] };
        const data = await resp.json();
        // Gemini response shape: { candidates: [{ content: { parts: [{ text }] } }] }
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            || data?.text
            || '';
        if (!text) return { queries: [], namedEntities: [] };
        // tryRepairJson handles fences, leading prose, truncated braces,
        // unterminated strings, and wraps non-JSON as a typed error.
        const cleaned = tryRepairJson(text);
        let parsed: any;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr: any) {
            console.warn('[YouTubeDiscovery] JSON parse failed even after repair; raw head:', text.slice(0, 200));
            return { queries: [], namedEntities: [] };
        }
        if (parsed?._error) {
            console.warn('[YouTubeDiscovery] non-JSON Gemini response:', parsed._raw?.slice(0, 120));
            return { queries: [], namedEntities: [] };
        }
        return {
            queries: Array.isArray(parsed.queries) ? parsed.queries.filter((q: any) => typeof q === 'string').slice(0, 5) : [],
            namedEntities: Array.isArray(parsed.namedEntities) ? parsed.namedEntities.filter((e: any) => typeof e === 'string').slice(0, 10) : [],
            rationale: typeof parsed.rationale === 'string' ? parsed.rationale : undefined,
        };
    } catch (err: any) {
        console.warn('[YouTubeDiscovery] suggestVideoQueries failed:', err?.message || err);
        return { queries: [], namedEntities: [] };
    }
}

// --- CHANNEL-BASED DISCOVERY via proxy endpoint ---

export interface DiscoveredVideo {
    video_id: string;
    url: string;
    title: string;
    channel_id: string;
    channel_title?: string;
    published?: string;
    duration_sec?: number;
    score: number;              // relevance score 0-10 against goal keywords
    matched_queries?: string[]; // which suggested queries matched
}

export interface DiscoverByChannelsResult {
    total_channels_queried: number;
    total_videos_scanned: number;
    videos: DiscoveredVideo[];
    errors: string[];
}

/**
 * Ask the proxy to fan out to N channel RSS feeds, collect recent uploads,
 * score each against the goal+queries, and return the top K videos ranked
 * by relevance. Non-blocking: network failures return empty result.
 */
export async function discoverVideosByChannels(params: {
    channelIds: string[];
    goal: string;
    queries?: string[];
    limitPerChannel?: number;      // max videos per channel (default 10)
    maxResults?: number;           // total cap (default 15)
    minRelevance?: number;         // min score 0-10 (default 3)
}): Promise<DiscoverByChannelsResult> {
    if (!params.channelIds || params.channelIds.length === 0) {
        return { total_channels_queried: 0, total_videos_scanned: 0, videos: [], errors: [] };
    }
    const PROXY_BASE = 'http://localhost:5012';
    try {
        const resp = await fetch(`${PROXY_BASE}/api/youtube/discover-by-channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel_ids: params.channelIds,
                goal: params.goal,
                queries: params.queries ?? [],
                limit_per_channel: params.limitPerChannel ?? 10,
                max_results: params.maxResults ?? 15,
                min_relevance: params.minRelevance ?? 3,
            }),
            signal: AbortSignal.timeout(60_000), // RSS fan-out takes time
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            console.warn(`[YouTubeDiscovery] discover-by-channels HTTP ${resp.status}: ${err.substring(0, 200)}`);
            return { total_channels_queried: 0, total_videos_scanned: 0, videos: [], errors: [`HTTP ${resp.status}`] };
        }
        return await resp.json();
    } catch (err: any) {
        console.warn('[YouTubeDiscovery] discover-by-channels failed:', err?.message || err);
        return { total_channels_queried: 0, total_videos_scanned: 0, videos: [], errors: [err?.message || 'unknown'] };
    }
}
