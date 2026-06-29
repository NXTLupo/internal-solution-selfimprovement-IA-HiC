# Prompt Caching — Expert Reference + Maximization Ledger (2026-06-28)

Companion to `prompt-caching-stack-2026-06-23.md` (which records the shipped stack).
This file is the AUTHORITATIVE per-provider/per-model caching reference + the verified
"are we maxing it" audit, written after a live verification pass against the running proxy.

## 1. Per-provider / per-model caching mechanics (the expertise)

### Anthropic — Claude Opus 4.8, Sonnet 4.6 (explicit prefix cache)
- Mechanism: `cache_control: {type:"ephemeral"}` breakpoints on the stable prefix. Cache order is
  **tools -> system -> messages**. A breakpoint caches everything from the start of the request up to
  and including the marked block. Up to **4 breakpoints**; the API serves the LONGEST matching prefix.
- Economics: cache WRITE = 1.25x input price (5m TTL) or 2x (1h TTL); cache READ = **0.1x** input price.
  Break-even is ~2 reuses for 5m, more for 1h, both trivially met in a multi-deliverable session.
- Minimums: **1024 tokens** to be cacheable (Opus/Sonnet). HiC gates at `ANTHROPIC_CACHE_MIN_CHARS=4000`
  (~1000 tok) which is fine because grounding prompts are tens of KB.
- TTL: default 5m; **1h via `anthropic-beta: extended-cache-ttl-2025-04-11`** (HiC defaults to 1h).
- Determinism note: Opus 4.8 REJECTS `temperature` (400) -> proxy strips it; absent/0 temp = deterministic.

### OpenAI — GPT-5.5 (automatic prefix cache + routing key)
- Mechanism: **automatic** — prefixes >1024 tokens are cached with no header; identical leading content
  is discounted (cached input ~0.1x-0.25x depending on tier). `prompt_cache_key` ROUTES same-prefix
  requests to the same cache shard to raise hit rate (HiC keys it on the engagement slug).
- No write premium, no TTL knob (provider-managed, ~5-10 min idle eviction). Stable prefix = free win.
- Determinism: default temperature is 1.0 (SAMPLED) -> HiC only exact-caches when temperature == 0 explicit.

### Gemini — 3.1 Pro, 3.5 Flash (implicit + EXPLICIT cachedContent)
- **Implicit** (what HiC uses today): automatic best-effort prefix reuse when a request shares a long
  stable prefix with a recent one. NOT guaranteed; no API surface; ~0.25x on the implicitly-cached portion.
- **Explicit** (`cachedContent` / CachedContent API): create a cache object from the stable prefix
  (system + corpus), get a `name`, reference it on subsequent `generateContent` calls. GUARANTEES the
  discount, carries an explicit TTL, billed for storage while alive. Min context floor applies
  (low-thousands of tokens for 2.5/3.x Flash) — HiC corpora are well above it.
- Determinism: proxy applies 0.2 default -> HiC only exact-caches when temperature == 0 explicit.

### DeepSeek (fallback) — automatic disk KV cache, no code needed.

## 2. HiC coverage — VERIFIED LIVE 2026-06-28

Single chokepoint confirmed: ALL generation routes through `/api/ai/*` (proxy 5012) — `aiRetryClient`,
`corpusChatService` (callClaude/callGemini/callOpenAI), `prototypeBuilder` (#proto callClaudeStage),
deck/artifact export. No browser-runtime bypass (openaiService DIRECT_URL is server-only).

| Layer | Live status |
|---|---|
| Exact-match deterministic cache | **PROVEN**: identical Gemini temp=0 request, call1 1.60s vs call2 0.25s (6.4x), cache-stats hits:1 hit_rate:1.0 size:1. Returns BEFORE the provider call -> $0 AND quota-free on hit. |
| Anthropic prefix cache | Wired + enabled (1h). Corpus is concatenated into `systemPrompt` -> top-level `system` field -> breakpoint covers it. Within-session multi-deliverable = the corpus reads at ~0.1x after the first call. |
| OpenAI prompt_cache_key | Wired (engagement slug). |
| Gemini | IMPLICIT (best-effort) always on. EXPLICIT `cachedContent` SHIPPED 2026-06-28 (wired in `/api/ai/gemini`, env-gated, dormant by default). Live-verified: create-then-HIT on same prefix across two calls with different user turns. |
| Tool/stage cache | Wired on fetch-articles (corpus-version-keyed; any wiki write invalidates). |
| Telemetry | `GET /api/ai/cache-stats` live; costMeter books hits at $0. |

**Dominant pattern (many deliverables on one corpus in a session): Opus + OpenAI are already near-max**
— stable prefix + TTL means everything after the first call reads cached.

## 3. Gap ledger — what "to the max" still leaves on the table

| # | Gap | $ impact | Risk | Decision |
|---|---|---|---|---|
| 1 | **Gemini explicit `cachedContent`** for Flash chat (highest-volume path) + Pro research. Implicit is best-effort; explicit guarantees the discount. | Medium (Flash is cheap per call, very high volume) | Medium (cache lifecycle: create/TTL/invalidate-on-corpus-change) | **DONE 2026-06-28 — SHIPPED + LIVE-VERIFIED, dormant by default.** See §6. |
| 2 | **Opus cross-engagement static-block reuse.** System prompt opens with the per-engagement research goal, so the ~50KB static instruction block (IRON LAW / anti-hallucination / DELIVERABLE_PROTOCOL / skills) never caches across engagements. | High on the EXPENSIVE model, but only saves the FIRST call of each new engagement (within-engagement already maxed). | Higher (reorder a 350-line load-bearing system prompt: static-first, restate goal at the end for recency). Anthropic's own guidance is static-content-first, so the direction is vendor-aligned. | **PLAN** — sketch + behavioral diff before touching. |
| 3 | Per-worker hit/miss counters (size is shared via sqlite, counters are not) understate telemetry across 4 uvicorn workers. | None (cosmetic) | Low | Accept; note in stats. |
| 4 | Tool cache only covers fetch-articles; query_topic_clusters / fetch_wiki_resource uncached. | Low | Low | Defer. |

## 4. Quota-burn connection (why this matters now)
The app's Anthropic key hit its monthly usage cap (400 until 2026-07-01). Caching is the structural
defense: the exact-match layer makes repeated deterministic Opus generations cost $0 AND skip the
provider entirely (no quota draw), and the prefix cache cuts every grounded Opus call's input to ~0.1x.
Maximizing both is the direct lever on the cap. The determinism-first rule (same corpus+goal -> same
identity, temp 0 + seed) is what makes cached runs exact-cache-eligible — keep it.

## 5. Env knobs (current)
`EXACT_CACHE_ENABLED=1` `EXACT_CACHE_TTL_SEC=3600` `EXACT_CACHE_MAX=512`
`TOOL_CACHE_ENABLED=1` `TOOL_CACHE_TTL_SEC=900`
`ANTHROPIC_CACHE_TTL=1h` `PROMPT_CACHE_ENABLED=1` `ANTHROPIC_CACHE_MIN_CHARS=4000`
`SEMANTIC_CACHE_ENABLED=0` `SEMANTIC_CACHE_THRESHOLD=0.97`
`GEMINI_EXPLICIT_CACHE_ENABLED=0` `GEMINI_CACHE_TTL_SEC=3600` `GEMINI_CACHE_MIN_CHARS=8000`

## 6. Gap #1 resolution — Gemini explicit context cache (SHIPPED 2026-06-28)

**What:** Explicit `cachedContents` support at the single Gemini chokepoint
(`proxy/app.py :: proxy_gemini`). When a request's stable system prefix
(`systemInstruction`) exceeds `GEMINI_CACHE_MIN_CHARS`, the proxy looks up (or
creates) a `CachedContent` object keyed by `sha256(model + system-prefix +
_corpus_version())`, strips `systemInstruction` from the inline body, and
references the cache via `cachedContent` on the `generateContent` call. The
suffix (user turn) still generates fresh, so it applies to normal-temperature
chat (NOT only deterministic requests) but is skipped when the request is already
an exact-cache hit (exact-match returns before any of this runs).

**Functions added** (proxy/app.py, ~line 9416-9540):
`_gemini_system_prefix_text`, `_gemini_normalized_system_instruction`,
`_gemini_explicit_cache_key`, `_gemini_cache_store_get/_put/_delete`,
`_gemini_create_cached_content`; in-request closures `_gem_attach_explicit_cache`,
`_gem_detach_explicit_cache`, `_gem_response_is_cache_miss`. Stats dict
`_GEMINI_EXPLICIT_CACHE_STATS` surfaced under `gemini_explicit` in
`GET /api/ai/cache-stats`. Cache names live in the SHARED sqlite kv (ns
`gemcache`) so all 4 uvicorn workers reuse one object; stored TTL is remote TTL
minus 120s so we stop referencing before Gemini evicts.

**Invalidation + fail-open:** key includes `_corpus_version()` (any wiki write
rotates it, same as the tool cache). On a provider "cache not found/expired"
(400/403/404 mentioning the cache) the proxy deletes the stale stored name,
recreates ONCE and retries; if recreate fails it detaches and runs a plain inline
call. Every branch fails open to the existing inline behavior — generation never
breaks on a cache problem.

**Live verification (gate ON):** two `/api/ai/gemini` calls with an identical
25,080-char `systemInstruction` and DIFFERENT final user turns, `temperature 0.4`
(NOT exact-cacheable). Both returned 200 with valid Gemini content. Proxy logs:
`CREATED cachedContents/xcii6...` on call 1, `HIT cachedContents/xcii6...` (same
name) on call 2 — confirming create-then-reuse across workers via shared sqlite
(`cache-stats gemini_explicit.size=1` stable). NOTE: the per-worker hit/miss
counters (Gap #3, pre-existing) can read 0 when call 2 lands on a different worker
than call 1; the logs + shared `size` are the authoritative reuse signal.

**Shipped state: DORMANT.** Compose default `GEMINI_EXPLICIT_CACHE_ENABLED=0`
(fresh clone ships off, consistent with `SEMANTIC_CACHE_ENABLED`). The running
proxy was returned to the dormant default after verification; with the gate off
the helpers are a verified no-op (regression-checked: normal Gemini calls still
200, zero explicit-cache log activity). Flip `GEMINI_EXPLICIT_CACHE_ENABLED=1`
(root `.env`) + restart `research-proxy` to enable. Rationale for dormant:
`cachedContents` objects carry storage billing while alive; enable deliberately
when a session's high-volume Flash chat against one corpus justifies it.
