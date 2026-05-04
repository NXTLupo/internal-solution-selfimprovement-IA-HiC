# HiC Research Pipeline — AI Model Audit & Optimization Brief
**Date**: 2026-05-04
**Branch**: `HiC-Gemini-Primary`
**Bundle**: `index-BTjxwmsw.js` (SPA), `index-mlu1dIVa.js` (renderer), proxy commit `44d8f2f`
**Scope**: Every AI model invocation in the HiC research workbench, end to end. Includes call-site, model id, token shape, frequency, cost, and known failure modes. Closes with a research-prompt deliverable for a partner AI agent to investigate latest-week alternatives.

---

## 1. Executive Summary

HiC's pipeline currently makes **~85–110 model calls per full research run** (collection → synthesis → chat → presentation). Spend per run is ~$8–$19 depending on whether the composer is on Gemini Pro (cheap path, currently blocked by the schema bug we just fixed) or GPT-5.5 (working path, more expensive). At the user's typical cadence of **50 runs/month**, that's $400–$960/month — **down from ~$2,150/month under the prior Anthropic-primary build**.

Three model families dominate the call graph:
- **Google Gemini** (3.1 Pro for synthesis, 2.5 Flash for batch scoring + rerank) — 80% of calls, 5% of cost
- **OpenAI GPT-5 family** (GPT-5.5 for composer, GPT-5.4-mini for TriModel slice, text-embedding-3-small for vectors, whisper-1 for audio) — 18% of calls, 75% of cost
- **Anthropic** — **eliminated 2026-05-03**. Zero calls. The proxy returns HTTP 410 Gone. No hot path remains.

Cost is heavily concentrated in **two stages**: chat replies (~$2.43/run) and the composer (~$2.48–$14.50/run). Both are hit by **context replay** — each turn re-sends the system prompt + corpus + history, and at ~363K tokens × 3+ turns, that's where the bill lives. Fixing context replay (Gemini context caching + corpus-on-demand via tool calls instead of blanket injection) is the single biggest remaining lever.

---

## 2. Pipeline Stage Map

| # | Stage | Provider | Model | Calls/Run | Tokens In/Run | Tokens Out/Run | $/Run | Code Site |
|---|---|---|---|---:|---:|---:|---:|---|
| 1 | Body-aware item scoring | Google | gemini-2.5-flash | 2 batches | 60K | 4K | $0.028 | `researchFabricOrchestrator.ts:filterAndScoreItems` |
| 2 | Per-source query refinement | Google | gemini-2.5-flash | 1 | 5K | 2K | $0.007 | `geminiService.ts:refineSearchQueries` |
| 3 | Subreddit + YouTube channel discovery | Google | gemini-2.5-flash | 2 | 8K | 1K | $0.005 | `researchFabricOrchestrator.ts:discoverSubreddits`, `youtubeChannelRegistry.ts` |
| 4 | YouTube audio transcription | OpenAI | whisper-1 | 3 (avg 30 min audio) | — | — | $0.18 | `proxy/app.py:/api/transcribe-youtube` |
| 5 | Wiki article embedding (writes) | OpenAI | text-embedding-3-small | ~33 | 13K | — | $0.0003 | `proxy/app.py:_embed_via_openai` (auto-fires on `/api/wiki/write-article`) |
| 6 | Per-query retrieval embeddings | OpenAI | text-embedding-3-small | ~12 | 0.6K | — | <$0.001 | `proxy/app.py:_embed_texts(task_type='query')` |
| 7 | Wiki rerank Stage 3 (LLM cross-encoder) | Google | gemini-2.5-flash | ~3 | 18K | 6K | $0.020 | `proxy/app.py:/api/wiki/rerank` |
| 8 | Goal regrade (debounced trigger) | Google | gemini-2.5-flash | 0–2 | 60K | 4K | $0.028 | `proxy/app.py:/api/wiki/regrade-relevance` |
| 9 | Engagement memory match | Google | gemini-2.5-flash | 1 | 8K | 2K | $0.007 | `wikiService.ts:findPriorEngagementMatches` |
| 10 | TriModel parallel — slice 1 (Gemini Pro) | Google | gemini-3.1-pro-preview | 1 | 100K | 8K | $0.205 | `researchFabricOrchestrator.ts:triModelAnalysis` |
| 11 | TriModel parallel — slice 2 (Gemini Flash) | Google | gemini-2.5-flash | 1 | 90K | 8K | $0.047 | (same) |
| 12 | TriModel parallel — slice 3 (OpenAI mini) | OpenAI | gpt-5.4-mini | 1 | 90K | 8K | $0.026 | (same) |
| 13 | Themes Pass 1 BREADTH (+ retry) | Google | gemini-3.1-pro-preview | 2 | 124K | 10K | $0.255 | `geminiService.ts:generateThemes Pass1` |
| 14 | Themes Pass 2 DEPTH (per-theme parallel) | Google | gemini-3.1-pro-preview | 21 | 105K | 63K | $0.768 | `geminiService.ts:_enrichSingleThemeDepth` |
| 15 | 8 named deliverables (personas, strategy deck, journey, blueprint, gap, tech-arch, PRD, roadmap) | Google | gemini-2.5-flash + gemini-3.1-pro-preview (mix) | 8 | 240K | 40K | $0.55 | `geminiService.ts:executeStep*` |
| 16 | Heuristic UX brief (conditional, ~50% of runs) | Google + OpenAI | gemini-3.1-pro-preview, gpt-5.5, gemini-2.5-flash | 3 | 60K | 12K | $0.48 (cond.) | `heuristicAnalysisService.ts` |
| 17 | Repetition-collapse fallback | OpenAI | gpt-5.5 | 0–1 (rare) | 30K | 4K | $0.50 (rare) | `geminiService.ts:executeStepViaGPT` |
| 18 | **AI Chat replies** (3 turns × ~363K input each) | Google or OpenAI | gemini-3.1-pro-preview (default) / gemini-2.5-flash / gpt-5.4 | 3 turns × 1 | 1,089K | 30K | **$2.43** (Gemini Pro) | `corpusChatService.ts:sendChatMessage → callOpenAI/callGemini` |
| 18a | Chat tool-loop fetch_wiki_articles | (same) | (same) | 0–5 per turn | added to 18 | (same) | included | `corpusChatService.ts:executeFetchWikiArticlesTool` |
| 19 | **Designer Chat — Persona artifact** | Google | gemini-2.5-flash (default) | 1 per generation | 8K | 2K | $0.008 | `design-desk/services/chatToArtifact.ts` |
| 19a | Designer Chat — Journey artifact | Google | gemini-2.5-flash | 1 | 8K | 2K | $0.008 | (same) |
| 19b | Designer Chat — Org-chart artifact | Google | gemini-2.5-flash | 1 | 10K | 4K | $0.013 | (same) |
| 19c | Designer Chat — Slide spec | Google | gemini-3.1-pro-preview (default) / gpt-5.4 | 1 | 16K | 6K | $0.080 | `design-desk/services/chatToSlideSpec.ts` |
| 19d | Designer Chat — Freeform HTML body | Google | gemini-2.5-flash (default) / gemini-3.1-pro-preview | 1 | 24K | 8K | $0.110 | `design-desk/services/chatToFreeform.ts` |
| 20 | **Composer (presentation)** — research-mode tool-use loop (5 turns × ~250K input) | OpenAI (GPT-5.5 — current default) **OR** Google (gemini-3.1-pro-preview when Bug E retested) | gpt-5.5 / gemini-3.1-pro-preview | 5 turns | 1,250K | 40K | **$14.50** (GPT-5.5) **/ $2.48** (Gemini Pro) | `narrativeComposer.ts:runOpenAILoop` |
| 20a | Composer tool: search_corpus | (same) | (same) | up to 8 in loop | included in 20 | included | included | `narrativeComposerExecutor.ts:search_corpus` |
| 20b | Composer tool: extract_quotes (now body-aware) | (same) | (same) | up to 4 in loop | included | included | included | `narrativeComposerExecutor.ts:extract_quotes` |
| 20c | Composer tool: extract_stats (now body-aware) | (same) | (same) | up to 4 in loop | included | included | included | `narrativeComposerExecutor.ts:extract_stats` |
| 20d | Composer tool: submit_presentation (final) | (same) | (same) | 1 | included | included | included | `narrativeComposerExecutor.ts (closes loop)` |
| 21 | Web search tool fees | Google | Gemini Search Grounding | conditional | — | — | $0.00 | `deepResearchService.ts:geminiGroundedSearch` |
| | **TOTAL per run (composer on GPT-5.5)** | | | ~85–110 | ~3,135K | ~211K | **~$19.20** | |
| | **TOTAL per run (composer on Gemini Pro after Bug E verified)** | | | ~85–110 | ~3,135K | ~211K | **~$7.28** | |

---

## 3. Per-Stage Deep Detail

### 3.1 Data Collection (collection-time, pre-synthesis)

**Body-aware item scoring** — `services/researchFabricOrchestrator.ts:filterAndScoreItems`
- Model: **gemini-2.5-flash**
- Trigger: After multi-source fan-out collects raw items
- Batching: 25 items × 3 concurrent batches (90 items max practical per run)
- Input shape: title + 600-char body excerpt per item, JSON-shaped scoring prompt
- Output: `[{i, s, r}]` array with score 0–100 + 1-sentence reason
- Failure modes: per-batch try/catch defaults to score 50 silently if Gemini errors. **Bug I fixed**: now routes through `/api/ai/gemini` proxy so prod Docker keeps API key server-side
- Per-call: ~30K in / 2K out at $0.30 / $2.50 per MTok = $0.014

**Per-source query refinement** — `services/geminiService.ts:refineSearchQueries`
- Model: **gemini-2.5-flash**
- Hallucination guard: refined queries scoring below 0.35 fidelity overlap with the goal get replaced by the verbatim goal (we observed 14/155 fallback in the latest run after upgrades vs 494/859 in earlier runs)
- Per-call: ~5K in / 2K out = $0.0075

**Subreddit + YouTube channel discovery** — `services/researchFabricOrchestrator.ts:discoverSubreddits` + `services/youtubeChannelRegistry.ts`
- Model: **gemini-2.5-flash**
- Returns 5–8 subreddits ranked by engagement; 12 YouTube channels filtered by lens
- Per-call: ~8K in / 1K out = $0.0049

**YouTube audio transcription** — `proxy/app.py:transcribe_youtube_endpoint`
- Model: **whisper-1** (OpenAI)
- Pricing: $0.006/min
- Audio split into 24MB chunks via ffmpeg, sent sequentially to Whisper
- Latency: ~10–20s per chunk; a 50-minute video takes 60–120s of wall clock
- **Known issue**: synchronous call blocks proxy event loop. **Bug K fixed** via `--workers 4`.

### 3.2 Extractions (composer tool calls, run-time)

**search_corpus** — `services/narrativeComposerExecutor.ts:search_corpus`
- No direct model call; routes to wiki cosine retrieval + rerank
- Triggers Stage 7 (rerank) which IS a model call

**extract_quotes** — `services/narrativeComposerExecutor.ts:extract_quotes` *(2026-05-04 fix)*
- No direct model call; runs JS regex heuristic on `fetchWikiArticles({ maxCharsPerArticle: 12000 })` results
- Earlier bug: scanned 800-char chunk preview → returned empty → composer emitted EVIDENCE GAP
- **Now**: scans full 12KB body per article; broadened word range 6–65; speaker-prefix pattern (`Riley Quinn: I can verify...`) catches transcript quotes that the strict `"..." — Name` regex was missing

**extract_stats** — same pattern as extract_quotes; full-body scan via fetchWikiArticles

### 3.3 Embeddings

**OpenAI text-embedding-3-small**
- Cost: $0.02 / MTok input
- Dim: 1536 (16-bit float per dim → ~6KB per vector)
- Used for: wiki article embedding (write-time auto-fire), per-query embedding (read-time)
- Sidecar storage: `hic-workspace/wiki/.embeddings.json` (atomic tmp+rename writes)
- Per-run cost: $0.0003 (rounding error)
- Provider switch: `proxy/app.py:EMBED_PROVIDERS` registry supports openai-large (3072 dim, $0.13/MTok), gemini-text-embedding-004 (768 dim, $0.025/MTok), voyage-3 (1024 dim, $0.18/$0.50). Switching providers wipes the cache and forces re-embed.

### 3.4 Wiki Writing & Recall

**Auto-embed on write** — proxy hook
- Every `/api/wiki/write-article` triggers a synchronous `_embed_and_cache_article` call
- 1–3s per article; not blocking via async because the Whisper bug (#K) showed the same single-thread issue. **Bug K mitigates** with --workers 4.

**Cosine retrieval** — `proxy/app.py:_search_chunked_articles`
- No model call; scans the in-memory by_id dict, computes cosine vs query vector
- Latency: <10ms for ~500 vectors

**Stage 3 LLM rerank** — `proxy/app.py:/api/wiki/rerank` *(2026-05-03)*
- Model: **gemini-2.5-flash** (was claude-opus-4-7 before Anthropic elimination)
- Trigger: per `search_corpus` call from composer or chat
- Caches by sha256(goal + question + chunk_ids); typical session pays the cost once per unique query
- Falls back to identity ordering on any error so retrieval never breaks
- Per-call: ~6K in / 2K out = $0.0068

**Goal regrade** — debounced 10s after `researchGoal` change
- Model: gemini-2.5-flash
- Up to 50 articles re-scored per call

**Engagement memory match** — `services/wikiService.ts:findPriorEngagementMatches`
- Model: gemini-2.5-flash
- Loads up to 40KB of synthesis context if a prior engagement matches keyword overlap ≥ 4

### 3.5 Synthesis

**TriModel parallel** — `services/researchFabricOrchestrator.ts:triModelAnalysis`
- Three slices (round-robin across collected items):
  - Gemini 3.1 Pro: ~12 items
  - Gemini 2.5 Flash: ~12 items
  - GPT-5.4-mini: ~11 items
- Used to triangulate analysis from 3 different models (different training corpora, different reasoning profiles)
- Total: $0.28/run

**Themes Pass 1 BREADTH** — `services/geminiService.ts:generateThemes`
- Model: gemini-3.1-pro-preview, one-shot with all 62 corpus parts
- Floor: 12 themes; if fewer returned, retry with under-extraction feedback (currently fires 1 retry routinely)

**Themes Pass 2 DEPTH** — `services/geminiService.ts:_enrichSingleThemeDepth` *(2026-05-03)*
- Model: gemini-3.1-pro-preview (was claude-opus-4-7)
- Per-theme parallel fan-out — 21 calls
- Each call: ~5K in (prompt + theme + citations) / ~3K out (sub-themes, dimensions, contradictions, temporalArc, implications)
- Uses `responseMimeType: 'application/json'` for strict JSON

**Named deliverables** — `services/geminiService.ts:executeStep*`
- Default: `gemini-2.5-flash`
- Specific deliverables route to gemini-3.1-pro-preview when synthesis depth matters
- Repetition-collapse fallback: if Gemini Flash repetition-collapses, falls through to GPT-5.5 (was Claude before 2026-05-03)

### 3.6 AI Chat (corpusChatService) *(major fix 2026-05-04: tool-loop wired)*

**Dispatch** — `services/corpusChatService.ts:sendChatMessage`
- User selects model in UI dropdown (Gemini 3.1 Pro / Gemini 2.5 Flash / GPT-5.4)
- 2026-05-04 fixes: model-picker selection now actually reaches the model layer (was hardcoded gpt-5.4 / gemini-2.5-flash before)
- Stale localStorage selections fall back to Gemini Pro with a console.warn

**Per-turn context** — system prompt construction
- Base skill rules: ~33K tokens
- Uploaded client docs: up to 200KB → 50K tokens
- Verified source archive: ~10K tokens
- Wiki article bodies (matched): up to 6 × 12KB = 18K tokens
- Wiki index menu: ~5K tokens
- Prefetched articles (per question): ~12K tokens
- Prior engagement insights: up to 10K tokens
- **Raw corpus**: up to 900K chars = ~225K tokens — *the big one*
- **Per-turn input total: ~363K tokens**

**Tool-loop** — fetch_wiki_articles via OpenAI tools[] or Gemini functionDeclarations
- 2026-05-04 fix: was completely missing; the system prompt told the model to call the tool but no tool was registered. Result: hallucinated body text or honest "EVIDENCE GAP" placeholders.
- Now: model can call fetch_wiki_articles 0–5 times per turn; results appended as tool messages, loop continues up to MAX_TOOL_ITER=5

**Output**: ~10K tokens per turn (prose + citations)

**Per-turn cost (Gemini Pro long-context tier)**:
- 200K @ $1.25/M = $0.25
- 163K @ $2.50/M = $0.41
- 10K out @ $15/M = $0.15
- = **$0.81/turn** × 3 turns = **$2.43**

### 3.7 Designer Chat (DesignDeskChat) — `humans-in-control-research/design-desk/`

Routes by content type:

| Artifact | Path | Default Model | Alt Model | Per-Call Cost |
|---|---|---|---|---|
| Persona | `chatToArtifact.ts` (route="persona") | gemini-2.5-flash | gpt-5.4 | ~$0.008 |
| Journey | `chatToArtifact.ts` (route="journey") | gemini-2.5-flash | gpt-5.4 | ~$0.008 |
| Org chart | `chatToArtifact.ts` (route="org") | gemini-2.5-flash | gpt-5.4 | ~$0.013 |
| Slide spec (structured JSON) | `chatToSlideSpec.ts` | gemini-3.1-pro-preview | gpt-5.4, gemini-2.5-flash | ~$0.080 |
| Freeform HTML body (slide content) | `chatToFreeform.ts` | gemini-2.5-flash → gemini-3.1-pro-preview for revisions | gpt-5.4 | ~$0.110 |

All use `responseMimeType: application/json` for structured output (except freeform which is HTML).

### 3.8 Composer (Presentation) *(major fixes 2026-05-04: schema + JSON retry + dedup)*

**Default model**: gpt-5.5 (since Bug E discriminated-union schema fix needs validation; Gemini Pro will return as default after E2E test)

**Tool-use loop** — `services/narrativeComposer.ts:runOpenAILoop`
- Force-converge at iter 5 (research mode), iter 2 (package mode) — uses tool_choice='required' to force submit
- Model required to call search_corpus first turn (forced tool_choice)
- Submit floor: cannot call submit_presentation until ≥2 retrievals
- Retry-on-malformed-JSON (Bug D fix): up to MAX_MISSING_SUBMIT_RETRIES=2 corrective rounds
- Tool dedup cache (Bug G fix): identical (tool, args) calls return cached result

**Per-turn input**: 200K (system) + ~50K (tool history per turn) = 250K avg, growing linearly with iter count

**Per-run cost**:
- GPT-5.5: 5 × ($2.50 + $0.40) = **$14.50**
- Gemini 3.1 Pro: 5 × ($0.25 + $0.125 + $0.12) = **$2.48**

### 3.9 Web Search

**Gemini Search Grounding** — `services/deepResearchService.ts:geminiGroundedSearch`
- Free tier (included in Gemini Pro/Flash)
- No additional cost
- (Anthropic web_search tool with $10/1000 search fees was eliminated 2026-05-03)

---

## 4. PTU (Token-Throughput-Usage) Analysis

| Provider | Daily PTU range at 50 runs/mo (~2 runs/day) | Notes |
|---|---:|---|
| Google Gemini 3.1 Pro | ~5.4M tokens/day input | Long-context tier (>200K) charges 2x; chat is the dominant consumer |
| Google Gemini 2.5 Flash | ~700K tokens/day input | Spread across scoring, rerank, regrade, deliverables |
| OpenAI GPT-5.5 | ~2.5M tokens/day input | Composer is the dominant consumer |
| OpenAI GPT-5.4-mini | ~180K tokens/day input | Just the TriModel mini slice |
| OpenAI text-embedding-3-small | ~30K tokens/day input | Negligible |
| OpenAI whisper-1 | ~1 hour audio/day | $0.36/day at 50 runs/mo |

**Rate limit posture**: At 2 runs/day each generating 6.27M total input tokens, we're well under any tier's free quota (Gemini default = 360M tokens/min input; OpenAI Tier 2 = 30M tokens/min). No rate-limit risk at current scale.

**Burst risk**: A single research run fires up to 21 parallel Gemini Pro calls (Themes Pass 2 DEPTH). At ~10K input tokens each = 210K tokens in one second. Well under per-second limits but worth keeping an eye on if scale grows.

---

## 5. Known Cost Drivers (Where the Money Lives)

```
Composer (5 turns × 250K context)        ████████████████████ 34%
Chat replies (3 turns × 363K context)    ████████████████████ 33%
Themes Pass 1 + 2                        ████████ 14%
8 named deliverables                      ████ 8%
TriModel parallel                          ██ 4%
Heuristic UX (conditional)                 █ 3%
Data collection (scoring/whisper/embed)    █ 3%
Everything else                            <1%
```

**67% of cost is context replay** in chat + composer. Each turn re-sends the full system prompt + corpus. Anthropic's prompt caching (or Gemini's context caching) would cut this 50–60% on hits. Currently neither is enabled.

---

## 6. Architectural Risks Per Model Choice

| Model | Risk | Mitigation in code |
|---|---|---|
| Gemini 3.1 Pro Preview | Schema brittleness on deeply-nested polymorphic objects (Bug E root cause) | 2026-05-04: discriminated-union `oneOf` per kind. Per-kind validator drops bad sections. |
| Gemini 3.1 Pro (long-context tier) | 2x pricing kicks in past 200K tokens | Chat stage already in long-context tier; composer borderline |
| Gemini 2.5 Flash | Repetition collapse on structured JSON when corpus has repeated tokens (filenames, port numbers, $-figures) | RepetitionGuard + GPT-5.5 fallback (`executeStepViaGPT`) |
| GPT-5.5 | `max_tokens` deprecated → must use `max_completion_tokens` (Bug L) | Interface enforces canonical name |
| GPT-5.5 | Defaults to Responses API on proxy → must send `x-openai-endpoint: chat` header | Composer + chat both set the header |
| OpenAI text-embedding-3-small | 1536 dim; switching providers wipes cache | Sidecar tagged with provider+model+dim; backfill endpoint exists |
| Whisper-1 | Synchronous; blocks proxy event loop on long audio | Bug K: --workers 4 |

---

## 7. Open Cost-Saving Levers (none yet implemented)

| Lever | Estimated savings/run | Effort | Quality risk |
|---|---:|---|---|
| Anthropic prompt caching → **N/A** (Anthropic eliminated) | — | — | — |
| **Gemini context caching** on the corpus block | -$1.98 | 4 hrs | None |
| Drop blanket-corpus injection in chat → tool-only retrieval | -$1.50 | 4 hrs | None (tool latency adds 1-2s) |
| Cap composer history at K=4 turns w/ Flash summarizer | -$0.80 | 2 hrs | None |
| Compress per-turn tool-result payloads | -$0.40 | 3 hrs | None |
| Bug E re-test → flip composer back to Gemini Pro | **-$12.00** | 1 hr | Need to verify schema works end-to-end |
| Stack all five | **-$16.68/run** ($0.45/run residual) | 1 day | None |

---

## 8. Research Prompt for Partner AI Agent

The following prompt is designed to be pasted into a research-capable LLM (Claude with web search, ChatGPT Pro Deep Research, Gemini Deep Research, or Perplexity) to investigate the most current and efficient model choices per pipeline stage. It targets the past week (2026-04-28 → 2026-05-04) only.

---

### --- COPY FROM HERE ---

**Role**: You are a senior research engineer specializing in production LLM cost-and-quality optimization for RAG + agentic pipelines. Your task is to investigate model alternatives that have been released, repriced, or benchmarked **between 2026-04-28 and 2026-05-04** (today is 2026-05-04). You will return concrete, sourced recommendations for replacing or supplementing the models in the Humans-in-Control (HiC) research pipeline described below.

---

### CONTEXT: What Humans-in-Control (HiC) Is

HiC is a **production research workbench** built and operated by NXT Humans, a consulting firm. It is **NOT** a generic research tool — it is a specialized, opinionated pipeline that turns raw research inputs (uploaded client documents, structured briefs, web research) into **consultant-grade deliverables** that get shipped to paying clients. The deliverables are:

- **Strategy decks** (Rumelt's Kernel: diagnosis → guiding policy → coherent actions)
- **Persona sets** (Cooper-style with goals/JTBD/pain points/motivations + verbatim citations)
- **Service blueprints** (frontstage/backstage/support-systems with pain & fail points)
- **Journey maps** (multi-stage with emotion arcs)
- **Gap analyses** (capability maturity 1–5, current vs target)
- **Tech architecture diagrams** (layered systems with data flows)
- **PRDs** (full product-requirement docs)
- **Strategic roadmaps** (NOW / NEXT / LATER horizons)
- **Recommendation sets** (5–7 strategic actions with implications)
- **Interactive scrolling presentations** (a "deck experience" with parallax, sourced from a presentation-payload JSON schema rendered by a React app at port 5014)

Quality bar is **non-negotiable**: every claim cites a real source by name (`Higher Ed Dive: <article title>`, `Reddit: r/cscareerquestions`, `OpenAlex: Smith 2024`); generic phrases like "research shows" or "studies indicate" are forbidden by post-processor; 350+ corporate-cliche phrases ("paradigm shift", "leverage synergies", "in today's rapidly evolving landscape", etc.) are auto-rejected; meta-narration ("we will now examine", "this section explores") is stripped; consulting frameworks (Minto Pyramid, Rumelt's Kernel, SCQA) are enforced.

### CONTEXT: User & Cadence

- **Operator**: One consulting principal at NXT Humans, plus one analyst. Both technical-fluent.
- **Cadence**: 1–3 research runs per day, ~50 per month
- **Engagements**: Higher-ed (Northeastern, Penn, Harvard, Iowa, Columbia, UVA), CX/CS for B2B SaaS, healthcare, retail. Engagements run 2–6 weeks each with multiple research runs per engagement.
- **Stakes**: Each research run feeds a real client deliverable. Bad output = lost engagement.
- **Spend tolerance**: Budget-conscious but quality-first. Recently migrated off Anthropic Opus (was $43/run) to a Google-primary stack (~$8–$19/run depending on composer model). User has explicitly rejected vendor-elimination of OpenAI as not worth the marginal savings vs triangulation diversity. **Gemini context caching, prompt caching, and inference cost are top of mind.**

### CONTEXT: Architecture (so you understand the constraints on model choice)

- **React 19 + Vite SPA** at port 5011, served via nginx in Docker
- **FastAPI Python proxy** at port 5012 (CORS shield + API key holder + RAG endpoints + retrieval rerank + presentation persistence)
- **Presentation renderer** (separate React/Vite app) at port 5014 — reads PresentationPayload JSON, renders parallax scrolling deck
- **PostgreSQL + pgvector** (separate service, not used by HiC pipeline directly)
- **Wiki layer**: filesystem-backed knowledge base in `hic-workspace/wiki/` with markdown frontmatter + JSON sidecar for embeddings. ~500–1000 articles per active engagement. Sidecar uses OpenAI text-embedding-3-small (1536-dim) currently.
- **Tool-use protocol**: OpenAI-style tools[] format with strict JSON schema input. Gemini hits Google's OpenAI-compatible endpoint at `generativelanguage.googleapis.com/v1beta/openai/chat/completions` so the same loop drives both providers.
- **Function-calling discipline**: Composer enforces tool_choice='required' for forced retrieval, dedup-cache on identical (tool, args), per-kind data shape validation post-submit, retry-on-malformed-JSON instead of fatal throw. Schema is now a **discriminated union** with `oneOf` per section kind so models can't emit `data: {}` empty objects.

### CONTEXT: What Just Got Fixed (so you know what's already been solved)

In the last 7 days the team has shipped a 14-bug batch fix that:
1. **Fully eliminated Anthropic** from the pipeline (proxy returns 410 Gone for /api/ai/anthropic; no Claude code path remains)
2. **Discriminated-union schema** for the composer's `submit_presentation` tool — was `data: { type: 'object' }` causing field-name drift across models; now per-kind `oneOf` enforces shape
3. **Restored chat tool-loop** for fetch_wiki_articles (was never registered — chat was hallucinating instead of retrieving)
4. **Body-aware extract_quotes / extract_stats** — was scanning 800-char chunk previews, now scans full 12KB article bodies
5. **Per-kind data shape validator** in validateAndFinalize as defense-in-depth alongside the schema
6. **Tool-call dedup cache** to prevent context bloat from repeat searches
7. **Renderer hardening** — every section's `.map()` is `Array.isArray()`-guarded; recommendations accepts `recommendations` OR `items` field synonym
8. **Proxy `--workers 4`** to stop Whisper transcriptions blocking other endpoints
9. **GPT-5.5 fixes**: `x-openai-endpoint: chat` header (proxy default was Responses API which uses `input` not `messages`); `max_completion_tokens` (GPT-5 deprecated `max_tokens`)

Do NOT recommend solutions that re-introduce Anthropic. The user's iron law is that Anthropic stays out.

---

### Constraint Window

ONLY consider information published in the **past 7 calendar days** (2026-04-28 through 2026-05-04 inclusive). If a model was released earlier but had a price drop, benchmark, or context-window expansion this week, that counts. Reject anything older — we already know about Gemini 3.1 Pro Preview and GPT-5.5; we want what's NEW this week.

### Excluded Providers

**Anthropic / Claude is permanently excluded.** Do NOT recommend Claude Opus, Sonnet, Haiku, or any Anthropic model regardless of cost or capability. Stay within:
- Google (Gemini, Gemini Embeddings, Gemini Audio)
- OpenAI (GPT, embeddings, Whisper / GPT-4o-transcribe)
- Voyage AI (embeddings & rerank only — Anthropic-owned but standalone API)
- Mistral
- Cohere (rerank, embed, command)
- Meta Llama (via Together / Groq / Fireworks)
- DeepSeek
- Together / Groq / Fireworks-hosted open-weight models
- Other non-Anthropic options

### Pipeline stages to evaluate

Each stage has been mapped to its current model + per-call cost so you can quantify gains:

1. **Body-aware item scoring** (batch JSON output, 60K in / 4K out)
   - **What it does**: After multi-source web fan-out collects ~30–80 raw items per run (RSS articles, Reddit threads, YouTube transcripts, OpenAlex papers, Crossref refs, ProPublica nonprofit data, etc.), we batch them into groups of 25 and ask the model to score each item 0–100 for relevance to the engagement goal. Score becomes part of the wiki frontmatter and drives downstream retrieval blending.
   - **Why it matters**: Determines which sources get prioritized in retrieval. Wrong scores = wrong corpus.
   - Currently: gemini-2.5-flash @ $0.30 / $2.50 per MTok. Routed via `/api/ai/gemini` proxy, `responseMimeType: application/json`.
   - Need: cheap, structured JSON, batch-friendly, ~30K context, English-strong, low temperature

2. **Per-source query refinement** + **Subreddit/YouTube channel discovery**
   - **What it does**: Takes the raw engagement goal (e.g., "Northeastern $2B advancement campaign") and per-source-category synthesizes a tighter query (e.g., for Reddit: "donor stewardship best practices nonprofit advancement"). Subreddit discovery ranks 5–8 most-engaged communities for the topic. YouTube discovery picks 12 channels from a 100-channel registry filtered by analytical lens.
   - **Why it matters**: Bad refined queries = useless corpus from that source.
   - Currently: gemini-2.5-flash
   - Need: cheap classification, JSON output, ~5K context

3. **YouTube audio transcription** (~30 min audio per run, sometimes 50+ min for alumni events)
   - **What it does**: Downloads YouTube audio via yt-dlp, splits into ≤24MB chunks via ffmpeg, sends sequentially to Whisper. Transcript becomes a `transcript` kind in the wiki, embedded for retrieval. Speakers are NOT diarized currently, but we use a transcript-quote-cleaner heuristic to strip Whisper disfluencies + video-intro meta.
   - **Why it matters**: Verbatim quotes from peer-institution YouTube content (e.g., Penn alumni board interviews, Harvard advancement panels) are some of the strongest evidence in our decks.
   - Currently: OpenAI whisper-1 @ $0.006/min, single-threaded
   - Need: streaming or batch-friendly transcription. Diarization would be a bonus (currently we use prompt heuristics to identify speakers). Latency tolerance: 30–120s per video acceptable since we transcribe at collection time, not chat time.

4. **Wiki article embeddings** (1536 dim, ~33 articles per run, plus query-time re-embeds)
   - **What it does**: Every article persisted to `hic-workspace/wiki/articles/<source>/<hash>.md` is embedded synchronously on write. The 1536-dim vector goes into a sidecar JSON file. At query time, we embed the user's question, optionally blend it with the engagement-goal embedding (`goalBlendWeight: 0.40`), then cosine-search the sidecar.
   - **Why it matters**: Retrieval quality. Ours is augmented by Stage 2 keyword filter + Stage 3 LLM rerank, so embedding quality has bounded impact, but it's still the first filter.
   - Currently: OpenAI text-embedding-3-small @ $0.02 per MTok, 1536 dim
   - Sidecar tagged with provider+model+dim — switching providers wipes the cache and forces re-embed via `/api/wiki/embed-backfill`
   - Need: ≥ 1024 dim, English-strong, sub-$0.05/MTok. Bonus: content-type-aware variants (Voyage's `voyage-3-context` style or Cohere's content-type-aware models). Note: A/B harness exists at `/api/wiki/embed-ab` for live comparison.

5. **Wiki rerank Stage 3 / LLM cross-encoder** (~6K in / 2K out per call, 3 calls/run)
   - **What it does**: After cosine retrieval returns top-K candidates (Stage 1) and keyword overlap filter trims them (Stage 2), Stage 3 sends the candidates to an LLM that scores them against the query for actual relevance (cross-encoder pattern). The LLM sees query + each chunk's body excerpt + source name. Returns sorted list with per-chunk score + reason.
   - **Why it matters**: Filters out cosine-similar-but-wrong-context hits. Has reduced "off-topic wiki content leaks into deck" failure mode.
   - Currently: gemini-2.5-flash (was claude-opus-4-7 before Anthropic elimination — switch to Flash didn't measurably hurt rerank quality since the task is bounded)
   - Has a sha256 cache at the proxy by (goal, question, chunk_ids); typical session pays the cost once per unique query
   - Need: sub-second latency, JSON output, ranking-task-tuned. **Cohere Rerank-3 and Voyage rerank-2 are likely a strong specialized fit** — please prioritize these.

6. **TriModel parallel slices** (3 slices for triangulation diversity)
   - **What it does**: Splits the enriched corpus into 3 round-robin groups, each analyzed by a different model. Three "perspectives" are merged into a multi-model synthesis block prepended to the corpus before themes generation. Diversity of training corpora is the point — same model from same family = correlated blind spots.
   - **Why it matters**: Catches what any single model misses. 5–10% of major insights only surface in 1 of the 3 slices.
   - Currently: gemini-3.1-pro-preview + gemini-2.5-flash + gpt-5.4-mini. Note this is currently 2 Gemini variants — not great for diversity. Adding a Mistral / Cohere / Llama slice would meaningfully increase triangulation.
   - Need: 3 independent reasoning models from different training corpora; 90K context; structured output

7. **Themes Pass 1 BREADTH** (one-shot 124K input → ≥12 themes JSON output)
   - **What it does**: Feeds the full corpus + tri-model synthesis block to Gemini 3.1 Pro and asks for 12+ named themes with descriptions, signals, and citations. Has a "BREADTH FLOOR VIOLATION" detector that retries with under-extraction feedback if <12 themes returned (we observed this happening routinely on first attempt — model returns 1–4 themes, retry returns 19–21).
   - **Why it matters**: Themes are the spine of the strategy deck. Under-extraction = thin output.
   - Currently: gemini-3.1-pro-preview ($1.25/M ≤200K, $2.50/M >200K). Pass 1 stays under 200K so it's cheaper tier.
   - Need: ≥1M context, strict JSON schema, breadth extraction (asking for "12+ items" reliably). The Pass 1 retry pattern suggests the current model's first-shot breadth-following is not great.

8. **Themes Pass 2 DEPTH** (per-theme parallel × 21, 5K in / 3K out each)
   - **What it does**: For each of the 21 themes from Pass 1, runs a parallel call that enriches it with sub-themes, dimensions (organizing axes), contradictions, temporal arc, and consultant-grade implications. Returns strict JSON. Was Claude Opus 4.7 before Anthropic elimination; now Gemini 3.1 Pro direct call via `responseMimeType: application/json`.
   - **Why it matters**: This is the "consultant-grade depth" that separates us from generic AI summaries. The fields (dimensions, contradictions, temporal arc) are unusual asks; many models flatten them to generic descriptions.
   - Currently: gemini-3.1-pro-preview, 21 parallel calls
   - Need: high-quality strategic reasoning, JSON output, parallel-friendly. Some risk Gemini Pro is weaker than Opus on the dimensional/contradiction nuance — please flag if you find benchmarks this week comparing these.

9. **8 named deliverables** (synthesis-grade JSON output, 30K in / 5K out each)
   - **What it does**: Each deliverable (personas, strategy deck, journey map, service blueprint, gap analysis, tech architecture, PRD, roadmap, recommendations) gets a dedicated generation pass with its own JSON schema and prompt. Some route to Gemini Pro for synthesis depth, others to Flash for speed. There's a "RepetitionGuard" that catches Gemini Flash repetition collapse and falls through to GPT-5.5 (was Claude before).
   - **Why it matters**: Each deliverable is what the client actually sees. Quality bar = "would a senior partner at McKinsey/BCG ship this?"
   - Currently: mix of gemini-2.5-flash + gemini-3.1-pro-preview
   - Need: consultant-grade synthesis with anti-slop discipline. Slide post-processor catches 350+ banned phrases at runtime, but the model should produce fewer of them in the first place.

10. **AI Chat replies with tool-loop** (363K input × 3 turns, fetch_wiki_articles tool)
    - **What it does**: User chats with their corpus via "Chat to Your Data" pane. Each turn the model receives: skill rules system prompt + uploaded docs + verified source archive + matched wiki articles + wiki index menu + prefetched-for-this-question articles + prior-engagement-insights + raw 900K-char corpus + prior conversation. Model can call `fetch_wiki_articles` to pull additional bodies on demand (this was BROKEN until 2026-05-04 — system prompt told model to call tool but no tool was registered).
    - **Why it matters**: This is the primary user interface. Wrong model = bad chat = no value.
    - Currently: gemini-3.1-pro-preview default, gemini-2.5-flash + gpt-5.4 alternates
    - **Cost driver**: Each turn replays the 363K-token system block, no caching enabled. Gemini context caching is the obvious win and not yet implemented.
    - Need: 1M+ context, tool-use compliance, low-latency first-token, **context caching support to amortize the corpus across turns**.

11. **Designer Chat — slide spec / freeform HTML / persona / journey / org-chart**
    - **What it does**: Separate chat surface where designer iterates on individual artifacts. User says "generate a persona for the senior alumni officer" or "redesign this slide for the donor segmentation theme" → model emits structured JSON (or freeform HTML for slide bodies) → renders in the design canvas. Slide spec generation is the highest stakes (fixed pixel dimensions, brand tokens, layout bands).
    - **Why it matters**: This is the design productivity surface. Lower stakes than the deck composer but high frequency.
    - Currently: gemini-2.5-flash default for personas/journeys/org charts, gemini-3.1-pro-preview for slide spec, gpt-5.4 alternate
    - Need: structured JSON output for spec; HTML generation for freeform; no schema mismatches (we just spent a week fixing those)

12. **Composer (presentation tool-use loop)** — currently the most expensive single stage
    - **What it does**: User types `#presentation #NU` (or NXT) in chat, composer fires a tool-use loop: forced first-turn `search_corpus`, then up to 4 more iterations of retrieval (search_corpus, get_themes, get_personas, get_deliverable, extract_quotes, extract_stats), then `submit_presentation` with the full PresentationPayload (a discriminated-union schema with per-section-kind shapes). Output is persisted to `hic-workspace/wiki/presentations/<slug>.json` and rendered at port 5014.
    - **Why it matters**: Single most expensive stage. 5 turns × 250K input × Opus 4.7 used to be $21.75/run. Now: GPT-5.5 = $14.50, Gemini Pro (post Bug E re-test) = $2.48.
    - Currently: gpt-5.5 (working) or gemini-3.1-pro-preview (was emitting empty `data: {}` before Bug E discriminated-union schema fix; needs re-test)
    - Per run: 5 turns × 250K input × 8K output
    - Need: rock-solid OpenAI-style tool-use protocol, strict JSON via discriminated-union schema, **proven adherence to per-kind required fields**, large context (>200K), ≥16K output tokens, **dedup-friendly** (we have a per-loop tool cache), latency tolerance ~3-5min per generation.

**For each stage, return**:
- A. **Top 1 recommendation** that beats the current model on cost-per-quality this week (2026-04-28 to 2026-05-04). If no new option this week beats current, say so explicitly — don't recommend stale options.
- B. **Source link** to the announcement, pricing page, or benchmark within the past 7 days.
- C. **Quantitative justification**: cost delta (%/run), benchmark delta (which benchmark, %/score difference), latency delta if measured.
- D. **Quality risk**: what tradeoff am I making? (e.g., shorter context, weaker JSON adherence, slower TTFT)
- E. **Migration effort**: 1-line API surface change, or substantive (different tool-use protocol, different embedding dim requiring re-embed, etc.)

**Output format**: A single markdown table with columns `Stage | Current Model | Recommended (this week) | Source URL | Cost Δ | Quality Δ | Risk | Effort`. Add a 100-word summary paragraph at the top stating which 2-3 stages have the highest-leverage improvement opportunity right now.

**Disqualifiers**: Reject any recommendation that:
- Is from before 2026-04-28
- Comes from Anthropic
- Lacks a verifiable source link to a benchmark, official pricing page, or release announcement
- Reduces context window below 200K (we have stages requiring 1M+)
- Breaks our existing OpenAI-tools-format function-calling protocol without a clear migration path

**Bonus**: If you find evidence of a major model release THIS WEEK that would justify rethinking the architecture entirely (e.g., a 10x cheaper Gemini Pro tier, a new OpenAI structured-output guarantee, a frontier reasoning model with native tool-use that would replace the composer entirely), call it out separately in a "Watch list" section.

### --- COPY TO HERE ---

---

## 9. File / Code Map for Cross-Reference

| Concern | File:Line |
|---|---|
| Model registry & default routing | `services/aiRouter.ts:142-202` |
| Chat dispatch & tool-loop | `services/corpusChatService.ts:1900-2230` |
| Composer dispatch & tool-loop | `services/narrativeComposer.ts:553-680` |
| Composer schema (discriminated union) | `services/narrativeComposerTools.ts:35-340` |
| Per-kind data validation | `services/narrativeComposer.ts:909-970` (validateAndFinalize) |
| extract_quotes / extract_stats body-aware | `services/narrativeComposerExecutor.ts:558-700` |
| TriModel parallel | `services/researchFabricOrchestrator.ts:1352-1450` |
| Themes Pass 1 + 2 | `services/geminiService.ts:1080-1340` |
| Wiki rerank | `proxy/app.py:5017-5237` |
| Goal regrade | `proxy/app.py:5240-5470` |
| Embedding A/B harness | `proxy/app.py:5470-5680` |
| OpenAI proxy + Gemini compat | `proxy/app.py:3197-3270` |
| Anthropic proxy (returns 410) | `proxy/app.py:3103-3127` |
| Designer chat — artifact dispatch | `design-desk/services/chatToArtifact.ts` |
| Designer chat — slide spec | `design-desk/services/chatToSlideSpec.ts` |
| Designer chat — freeform | `design-desk/services/chatToFreeform.ts` |

---

## 10. Open Questions for the Partner AI's Investigation

1. Has Google announced a "Gemini Flash Reasoning" tier this week that would be cheaper than Gemini Pro for the chat + composer stages?
2. Has OpenAI shipped a `gpt-5.5-mini` or `gpt-5.5-nano` with the same tool-use protocol but lower price?
3. Has Voyage shipped a v4 embedding model that beats text-embedding-3-small on retrieval quality this week?
4. Has Cohere or Voyage released an updated reranker (e.g., rerank-3) this week?
5. Are there benchmarks this week comparing GPT-5.5 vs Gemini 3.1 Pro on tool-use loop adherence with discriminated-union schemas?
6. Are there benchmarks this week on long-context (>200K) JSON-strict synthesis tasks comparable to our themes Pass 2 stage?
7. Has Whisper-3 / GPT-4o-transcribe / Gemini 2.0 Audio dropped this week with better diarization or pricing?
