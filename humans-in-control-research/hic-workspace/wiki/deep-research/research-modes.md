---
title: "Deep Research Modes & AI-Powered Intelligence"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [deepResearchService.ts, researchFabricOrchestrator.ts, aiRouter.ts]
confidence: high
status: active
tags: [deep-research, gemini, claude, openai, web-search, research-fabric]
evidence_count: 0
---

# Deep Research Modes & AI-Powered Intelligence

The HiC Research platform provides a unified deep research interface that routes
queries across three frontier AI providers -- Gemini, Claude, and OpenAI -- each
exposing different web search and autonomous research capabilities. The system
selects the optimal provider per mode but supports user overrides and automatic
fallback when a provider fails.

Source: `services/deepResearchService.ts`


## Three Research Depth Modes

### 1. Quick Grounding (5-15 seconds, ~$0.01-0.05)

**Provider**: Gemini Grounded Search via `gemini-2.5-flash`
**Function**: `geminiGroundedSearch(config)`
**Default for**: quick mode

Quick Grounding performs 1-3 Google searches through the Gemini API's native
`googleSearch` tool. The model synthesizes results into a short response with
grounding metadata that includes source URLs, web search queries used, and
grounding chunks.

**Returns**: synthesized text + `groundingMetadata` containing `groundingChunks`
(each with `web.uri` and `web.title`) and `webSearchQueries` used.

**Use cases**: rapid fact-checking, verifying a statistic, getting current data
on a narrow question, quick context gathering before a deeper investigation.

**Cost model**: `searchQueriesUsed.length * $0.014` per query executed.


### 2. Focused Research (30-120 seconds, ~$0.10-0.50)

Focused Research performs iterative, multi-search investigation with extended
thinking. Two providers are available, with automatic fallback.

#### Provider A: Claude Web Search (default for focused mode)

**Model**: `claude-opus-4-6`
**Tool**: `web_search_20250305` (named `web_search`)
**Function**: `claudeWebSearch(config)`
**Max searches**: configurable via `maxSearches` (default 10)
**Extended thinking**: enabled with `budget_tokens` (default 8,000)

Claude Web Search supports domain filtering:
- `allowedDomains`: restrict searches to specific domains (e.g., `["scholar.google.com", "nature.com"]`)
- `blockedDomains`: exclude specific domains from results

The response is parsed for `web_search_tool_result` blocks (each containing
`web_search_result` items with URL, title, and page_age) and `text` blocks
with inline `citations` of type `web_search_result_location` carrying
`cited_text` for exact quote extraction.

#### Provider B: OpenAI Web Search (fallback)

**Model**: `gpt-5.4-mini`
**Tool**: `web_search_preview`
**Function**: `openaiWebSearch(config)`
**Context size**: `low` for quick mode, `medium` for focused mode (configurable)
**Geolocation**: optional `searchRegion` (country code) for localized results

OpenAI's response uses `output_text` blocks with `url_citation` annotations
that include `start_index` / `end_index` for precise cited text extraction.

**Fallback chain**: Gemini -> Claude -> OpenAI. If the preferred provider
fails, the system cascades to the next available provider automatically.


### 3. Deep Research (5-30 minutes, ~$2-5)

**Provider**: Gemini Interactions API
**Agent**: `deep-research-pro-preview-12-2025`
**Function**: `geminiDeepResearch(config, onProgress)`
**Default for**: deep mode

Deep Research launches an autonomous multi-step research agent that performs
its own search strategy, reads multiple documents, and synthesizes findings
over an extended period. This is the most thorough mode, suitable for
comprehensive literature reviews, market landscape analysis, or competitive
intelligence.

**Lifecycle**:
1. `ai.interactions.create()` with `background: true` starts the agent
2. Polling via `ai.interactions.get(interactionId)` every 10 seconds
3. Status transitions: `in_progress` -> `completed` (or `failed`/`cancelled`)
4. Maximum polling: 360 attempts (60 minutes at 10-second intervals)
5. Final output extracted from `result.outputs[last].text`

**Progress callback**: `onProgress(DeepResearchProgress)` fires during polling
with status (`starting`, `researching`, `synthesizing`, `completed`, `failed`),
a human-readable message, and `elapsedMs`.

**Use cases**: comprehensive landscape analysis, academic literature review,
multi-source competitive intelligence, strategic market assessment.


## AI Model Registry

Source: `services/aiRouter.ts`

The platform maintains a registry of 6 AI models with capability metadata
used for intelligent task routing.

| Model ID | Provider | Display Name | Vision | Max Context | Max Output | Cost Tier |
|---|---|---|---|---|---|---|
| claude-opus-4-6 | Anthropic | Claude Opus 4.6 | Yes | 1,000,000 | 128,000 | Premium |
| claude-sonnet-4-6 | Anthropic | Claude Sonnet 4.6 | Yes | 1,000,000 | 64,000 | Standard |
| gpt-5.4 | OpenAI | GPT-5.4 | Yes | 1,050,000 | 128,000 | Standard |
| gpt-5.4-mini | OpenAI | GPT-5.4 Mini | Yes | 400,000 | 128,000 | Budget |
| gemini-2.5-flash | Google | Gemini 2.5 Flash | Yes | 1,048,576 | 65,536 | Budget |
| gemini-3.1-pro-preview | Google | Gemini 3.1 Pro | Yes | 1,000,000 | 65,536 | Premium |


## Task Routing

The `DEFAULT_MODELS` mapping routes task categories to the optimal model:

| Task Category | Default Model | Rationale |
|---|---|---|
| research | claude-opus-4-6 | Deep analysis, 1M context, premium reasoning |
| fast_generation | gpt-5.4-mini | Fast structured JSON (PRDs, roadmaps, tables) |
| vision | claude-opus-4-6 | UX heuristic analysis, screenshot evaluation |
| image | gemini-2.5-flash | Imagen 4 via Gemini API, flash-image fallback |
| video | gemini-2.5-flash | Veo 3.1 via Gemini API |

Each category also defines a ranked list of alternative models
(`MODELS_FOR_CATEGORY`). When a provider's API key is unavailable, the router
selects the next available model in that category's list.


## Research Configuration Interface

```typescript
interface ResearchConfig {
    mode: 'quick' | 'focused' | 'deep';
    query: string;
    maxSearches?: number;           // focused mode: 5-20, default 10
    searchContextSize?: 'low' | 'medium' | 'high';  // OpenAI
    allowedDomains?: string[];      // Claude: restrict to these domains
    blockedDomains?: string[];      // Claude: exclude these domains
    searchRegion?: string;          // OpenAI: country code for localization
    thinkingBudget?: number;        // Claude: thinking budget tokens
    preferredProvider?: 'gemini' | 'claude' | 'openai';
}
```


## Research Result Schema

Every research execution returns a uniform `ResearchResult`:

- `mode`: which depth mode was used
- `provider`: which AI provider executed the query
- `content`: the synthesized research text
- `sources`: array of `{ url, title, snippet?, citedText? }`
- `searchQueriesUsed`: queries the model executed
- `estimatedCost`: dollar cost estimate
- `durationMs`: wall-clock execution time
- `status`: `completed` or `failed`
- `error`: error message if failed


## Provider Availability Detection

`getAvailableProviders()` checks environment variables to determine which
providers can be used at runtime:
- `GEMINI_API_KEY` or `API_KEY` -> Gemini (quick, focused, deep)
- `ANTHROPIC_API_KEY` -> Claude (quick, focused)
- `OPENAI_API_KEY` -> OpenAI (quick, focused)

Only Gemini supports the `deep` mode via the Interactions API. Claude and
OpenAI are limited to quick and focused modes.


## CORS Proxy Architecture

When running in the browser (`typeof window !== 'undefined'`), API calls route
through a local proxy at `http://localhost:5012/api/ai/` to bypass CORS
restrictions. The proxy forwards requests to:
- `anthropic` -> `https://api.anthropic.com/v1/messages`
- `openai` -> `https://api.openai.com/v1/responses`


## Wiki Integration Rules

- Deep research findings should be ingested into the wiki using the standard
  INGEST operation defined in Part IV of AGENTS.md
- Each deep research run should create a `wiki/sources/` summary page
  documenting what was found, what queries were used, and which providers
  contributed
- Key findings should fan out to update `wiki/evidence/`, `wiki/benchmarks/`,
  and `wiki/frameworks/` pages as appropriate
- Research plans and execution results should be logged in `wiki/log.md`
- Content enrichment results (full-text Jina extractions) should be filed as
  evidence with source attribution
- Relevance scores from the fabric orchestrator should map to wiki confidence
  levels: 90-100 = high, 70-89 = medium, 40-69 = low, below 40 = filtered

Cross-references: [[sources-registry/connector-catalog]], [[sources-registry/credibility-tiers]], [[methodologies/research-fabric]]
