# HiC Model-Usage Optimization — Audit + VS/RI Decisions (2026-06-28)

Goal: audit HiC's total + potential model usage against the prompt-caching stack, then use
Verbalized Sampling (enumerate diverse optimization candidates with probabilities) and
Reinforcement Inference (re-ask/converge where the decision is uncertain) to commit an
optimization decision per workflow. Companion to `prompt-caching-expertise-and-maximization-2026-06-28.md`.

## 1. AUDIT — every model-calling workflow (verified from code 2026-06-28)

| Workflow | Model today | LLM? | Cost tier | Determinism | Cache coverage today |
|---|---|---|---|---|---|
| Data collection — connectors (REST/RSS/CKAN/arXiv/Reddit/etc) | none | no | $0 | n/a | n/a |
| Data collection — upload extraction (`_gemini_multimodal_extract`) | gemini-3.5-flash | yes | budget | temp 0.0 (deterministic) | **NONE — calls Gemini URL inline, BYPASSES the cached /api/ai/gemini chokepoint** |
| Data collection — relevance ranking (`themes:relevance-score`) | gemini-3.5-flash | yes | budget | temp 0 | exact-cache eligible IF via chokepoint (verify) |
| Chunking | deterministic (sentence-split) | no | $0 | yes | n/a |
| Manifest/registry add + retrieval embeddings | gemini-embedding-001 / text-embedding-3 | embed | ~$0.02/M | yes | query-embed content-hash cache EXISTS (`_query_embed_cache`) |
| Theme extraction — breadth/diversity passes | gemini-3.1-pro-preview / flash | yes | standard | temp 0.2-0.4 (INTENTIONAL diversity) | not cached BY DESIGN (VS diversity) |
| Theme extraction — synthesis + depth enrichment | gemini-3.1-pro-preview | yes | premium | temp 0 (deterministic) | exact-cache eligible IF via chokepoint |
| Chat inferences (non-hashtag) | gemini-3.5-flash | yes | budget | sampled (conversational) | prefix (implicit) + explicit-cache now available (dormant) |
| Hashtag deliverable generation | **claude-opus-4-8** (force-route) | yes | **PREMIUM** | temp stripped (deterministic) | Anthropic prefix cache (1h) + exact-cache; within-engagement near-max |
| #proto build stages | **claude-opus-4-8** | yes | **PREMIUM** | deterministic | same as hashtags |
| Images / diagrams | gemini-3.1-flash-image-preview | yes | budget | n/a | brand-image content-hash cache |

**Cost concentration (the headline):** premium spend is ~entirely **Opus 4.8 on hashtag deliverables + #proto**. Everything else is Gemini budget/standard, deterministic, or $0. The Anthropic monthly-cap 400 is a direct consequence. So optimization ROI is dominated by (a) Opus cache hit-rate and (b) not re-paying deterministic work.

## 2. Per-workflow VS + RI decisions

Method: for each workflow enumerate candidates with a probability (VS, moderate-tail), compute the
RI uncertainty signal (verbalized confidence + corroborators), and where it fires, re-ask to converge.
Committed decision is the last line of each block.

### W1. Upload extraction — VS
- (a) keep Flash, no cache (modal) — p 0.40
- (b) **content-hash cache the extraction (file-bytes sha256 -> stored text); re-uploads/re-runs skip the vision call** — p 0.30
- (c) batch pages per call — p 0.18
- (d) cheap OCR for text-only PDFs, vision only for image-heavy — p 0.12
RI signal: LOW uncertainty. (b) is deterministic (temp 0), high-frequency on re-runs, zero quality risk. The modal (a) loses a free win. **DECISION: (b) content-hash cache extraction** (route through the cached chokepoint OR add a local sha256->text store). Confidence HIGH.

### W2. Relevance ranking — VS
- (a) keep Flash per-chunk, uncached — p 0.45
- (b) **exact-cache by (chunk-hash + objective-hash)** (temp 0, deterministic) — p 0.30
- (c) batch N chunks per scoring call to cut request count — p 0.20
- (d) replace LLM scoring with embedding cosine vs objective (no LLM) — p 0.05
RI signal: LOW. (b)+(c) compose and are zero-risk. **DECISION: (b) cache + (c) batch.** Confidence HIGH.

### W3. Chunking + manifest/registry — VS
- (a) leave as-is (deterministic + embed cache exists) — p 0.55
- (b) verify embed calls are batched + content-hash cached end-to-end — p 0.30
- (c) parallelize embed backfill — p 0.15
RI signal: LOW; already cheap. **DECISION: (a) leave; (b) spot-verify embed batching.** Confidence HIGH (this workflow is already near-optimal).

### W4. Theme extraction — VS
- (a) keep Pro synthesis + Flash breadth, uncached — p 0.40
- (b) **exact-cache the deterministic synthesis/enrichment (temp 0) by corpus-version+goal hash so re-runs are $0** — p 0.30
- (c) two-tier: Flash breadth, Pro only final synthesis — p 0.20
- (d) Opus synthesis — p 0.10 (REJECT: we optimize cost down, and themes is the one auto-synth that must stay grounded; Pro is sufficient)
RI signal: MEDIUM (is Pro synthesis truly cacheable without staleness? yes — corpus-version key invalidates on any wiki write, same as tool cache). Re-ask converges: keep the temp-0.2/0.4 diversity passes UNCACHED (VS needs variation), cache ONLY the temp-0 deterministic synthesis/enrichment. **DECISION: (b), scoped to the temp-0 deterministic sub-steps only; keep diversity passes uncached.** Confidence HIGH.

### W5. Chat inferences — VS
- (a) keep Flash, implicit cache — p 0.45
- (b) **enable explicit Gemini cachedContent for the big stable corpus prefix** (now shipped, dormant) — p 0.35
- (c) route trivial/short chat to an even cheaper tier — p 0.15
- (d) RI-silent re-ask only on uncertain answers (already a skill) — p 0.05
RI signal: LOW. (b) is the highest-VOLUME path; explicit cache guarantees the discount implicit only best-efforts; it's built + verified. **DECISION: enable `GEMINI_EXPLICIT_CACHE_ENABLED=1` for the chat path** (accept the small cachedContent storage cost; net win at chat volume). Confidence HIGH.

### W6. Hashtag deliverables + #proto (Opus) — THE high-stakes, high-uncertainty decision -> RI
VS candidates:
- (a) keep Opus for ALL hashtags, cache-maxed (modal) — p 0.40
- (b) **TIER**: Opus for high-stakes narrative (strategy / recommendations / report / proto / personas / themes-synthesis); Gemini 3.1 Pro for schema-constrained extraction deliverables (gap-matrix, systems-inventory, competitive-matrix, journey-map, org-chart) where structure bounds the output — p 0.28
- (c) Opus cache-max only (exact-cache re-gens -> $0+quota-free; within-engagement prefix -> 0.1x), NO model change — p 0.22
- (d) Gemini Pro primary, Opus only on RI-triggered re-ask under uncertainty — p 0.10

RI signal: **HIGH uncertainty + HIGH stakes** -> RI re-ask fires.
- The modal (a) ignores the cost problem. (b)/(d) cut cost most but risk quality AND violate two hard constraints: the **user-locked canonical routing rule** (artifacts -> Opus 4.8, single source of truth in aiRouter.ts + CLAUDE.md) and **quality-first / never-relax-to-save-cost**. Per RI, I must not capitulate to the cost signal by silently downgrading a user-locked decision.
- RI-converged decision: **(c) as the committed default I can implement — make Opus deterministic re-generations $0 + quota-free via exact-cache, and keep within-engagement prefix cache maxed. Do NOT auto-downgrade the model.** Surface (b) tiering to the USER as an explicit opt-in choice (it is THEIR routing rule to change), with the candidate split above. This respects user-locked routing + quality-first while still cutting the dominant cost via caching, and offers the bigger cut as a user decision rather than a unilateral quality risk.
Confidence HIGH on (c)-as-default + propose-(b); deliberately NOT auto-applying (b).

## 3. Committed action list (implement = staged, await user approval per repo rules)
1. **Route upload extraction + relevance ranking through cache** (content-hash / exact-cache) — W1, W2. Highest re-run ROI, zero quality risk. **STATUS: DONE + LIVE-VERIFIED 2026-06-28 (STEP 2). See §3g.**
2. **Exact-cache the temp-0 theme synthesis/enrichment** — W4. Keep diversity passes uncached. **STATUS: DONE + LIVE-VERIFIED 2026-06-28 (STEP 2), via proxy exact-cache (lower-risk than a bespoke corpus-version call-site cache). See §3g.**
3. **Enable Gemini explicit cachedContent for chat** (`GEMINI_EXPLICIT_CACHE_ENABLED=1`) — W5. **STATUS: ENABLED (compose default flipped to 1) + LIVE-VERIFIED CREATE→HIT 2026-06-28 (STEP 2). See §3g.**
4. **Opus: exact-cache deterministic re-gens + keep prefix cache maxed** — W6(c). The within-engagement path is already near-max. (Pre-existing; not part of STEP 2.)
5. **PROPOSE to user (do not auto-apply): tiered hashtag routing** — W6(b): Opus for narrative, Gemini Pro for schema-constrained extraction deliverables. User decides (it's their canonical rule + a quality tradeoff).
6. Verify embed batching (W3); per-worker cache counters cosmetic (defer).

### STEP 2 STATUS — W1/W2/W4/W5 DONE + LIVE-VERIFIED (2026-06-28, staged not committed)  {#3g}

All four wins implemented and proven to actually HIT live (proxy not quota-blocked for Gemini). Files
left on disk in the working tree (NOT committed): `proxy/app.py`, `services/geminiService.ts`,
`docker-compose-all.yml`. Gates: proxy `ast.parse` OK; `npm run typecheck` = 0; `npx vitest run` = 388
passed (45 files). Rebuilt `research-proxy` + `research-generator` from repo root; both healthy; SPA :5011
HTTP 200.

**W1 — UPLOAD EXTRACTION CACHE — DONE.**
- Files: `proxy/app.py` — new env knobs `VISION_CACHE_ENABLED` / `VISION_CACHE_TTL_SEC` + stats dict
  `_VISION_EXTRACT_CACHE_STATS` + `_vision_extract_cache_key()` (just after `_VISION_EXTRACT_PROMPT`,
  ~line 8160); cache lookup/store wired INTO `_gemini_multimodal_extract` (~line 8170 + the success
  return); `vision_extract` block added to `/api/ai/cache-stats`. `docker-compose-all.yml` research-proxy
  env: `VISION_CACHE_ENABLED=1`, `VISION_CACHE_TTL_SEC=2592000` (30d).
- Key: `sha256(file_bytes || mime || hint || _VISION_EXTRACT_MODEL)`, ns `visionextract` in the shared
  sqlite kv. On hit returns stored text and SKIPS the vision call. Fail-open.
- Live proof: same PNG bytes twice through `/api/parse-upload` → proxy log
  `[vision-extract] CACHE HIT w1cachetest.png -> 78 chars (skipped vision call)`; `vision_extract.size`
  0→1 (stores:1). (Per-worker `hits` counter under-reports across 4 uvicorn workers; the log line + shared
  `size` are authoritative, same convention as the existing caches.)

**W2 — RELEVANCE RANKING CACHE — DONE (cache-only; batching was already a no-op).**
- Finding: `_scoreThemesByObjectiveRelevance` (geminiService.ts ~line 1097) is ALREADY a SINGLE BATCHED
  call (every candidate theme scored in one request, not per-chunk), so the §2 W2(c) "batch N per call"
  is a no-op here. The win is caching.
- Chosen approach (LOWER-RISK of the two offered): ROUTE the call through the proxy `/api/ai/gemini`
  chokepoint (was a direct `@google/genai` SDK call) via `callAIWithRetry('gemini', ...)`, so it reuses
  the PROVEN exact-cache (shared sqlite) instead of a new in-browser JS cache. The call is temp 0 +
  JSON-mode over STABLE inputs (theme list + goal) → byte-identical body on same-corpus+goal re-runs →
  genuine exact-cache hit. `.text` synthesized from the proxy's `candidates[0].content.parts[].text`.
- Key: the existing exact-cache key (full deterministic body), ns `exact`. Counters land in `exact_match`
  (cache-stats `relevance_score` block points there; no separate namespace by design).
- Live proof: relevance-score-SHAPED deterministic request twice through `/api/ai/gemini` →
  `_hic_exact_cache_hit` False (5.04s, exact size 23→24) then True (2.06s), identical scores JSON.

**W4 — THEME SYNTHESIS CACHE — DONE (via proxy exact-cache).**
- Finding: theme synthesis's DETERMINISTIC temp-0 sub-step is the PER-THEME depth ENRICHMENT call
  (`themes:depth`, geminiService.ts ~line 3045, temp 0 + seed 42), SDK-direct. Its prompt is built ONLY
  from already-finalized stable inputs (theme name/description/quote/citations + goal), so same-corpus+goal
  re-runs produce a byte-identical body. The temp-0.2/0.4 breadth/diversity passes are LEFT UNCACHED (VS).
- Chosen approach: rather than a bespoke `sha256(corpus_version+goal+deliverable+model)` call-site cache
  (which needs new proxy-endpoint plumbing into the browser), ROUTE the depth call through `/api/ai/gemini`
  (same pattern as W2) → exact-cache eligible. Added `seed` passthrough in `proxy_gemini.gen_config` so
  the temp-0+seed-42 determinism parity is preserved upstream. Invalidation is implicit: any wiki write
  that changes a theme changes the prompt body → new key → miss (functionally equivalent to a
  corpus-version key for this call's inputs).
- Key: existing exact-cache key (full deterministic body incl. seed), ns `exact`.
- Live proof: depth-SHAPED request (temp 0 + seed 42, role/parts contents) twice through `/api/ai/gemini`
  → `_hic_exact_cache_hit` False (8.71s, exact size 24→25) then True (2.04s), identical interpretation JSON.
  Seed passthrough confirmed (no 400).
- Honest scope note: this caches the depth-enrichment sub-step (the deterministic temp-0 synthesis work,
  which is the per-theme premium-model spend). The breadth shards stay uncached by design. A real
  end-to-end #themes re-run will hit IFF the upstream theme objects are byte-identical (determinism-first
  guarantees this for cached corpora); the HIT MECHANISM is proven on byte-identical input.

**W5 — EXPLICIT GEMINI CACHE — ENABLED + LIVE-VERIFIED.**
- File: `docker-compose-all.yml` research-proxy env default flipped `GEMINI_EXPLICIT_CACHE_ENABLED:-0`
  → `:-1`. No proxy code change (helpers shipped 2026-06-23, STEP 1 made the chat path reachable).
- Live proof: two `/api/ai/gemini` calls with an identical 22,000-char `systemInstruction` and DIFFERENT
  user turns at temp 0.4 (NOT exact-cacheable) → proxy logs `CREATED cachedContents/vrvzhwfknt3...` on
  call 1 then `HIT cachedContents/vrvzhwfknt3...` (same name) on call 2; `gemini_explicit.size` 0→1,
  hits 0→1. cachedContent created then referenced across different user turns.
- Storage-billing note: cachedContents carry storage cost while alive (TTL 3600s); enabling-by-default is
  the §2 W5 committed decision (net win at chat volume now that the chat path is routed). Set
  `GEMINI_EXPLICIT_CACHE_ENABLED=0` in `.env` to disable.

## 3b. CORRECTED W6 — full-roster tier ladder (the prior VS was mode-collapsed to Opus-vs-Gemini-Pro)

User correction 2026-06-28: consider Sonnet, DeepSeek, AND lower-tier OpenAI/Gemini models that
support prompt caching. Decision objective = "both: cheapest VIABLE per deliverable." Method =
VS/RI proposal -> user approves before any code change.

Verified pricing (per 1M tok in/out) + caching + quota properties:
| Model | Provider | in / out | caches? | relieves Anthropic quota | quality fit |
|---|---|---|---|---|---|
| claude-opus-4-8 | Anthropic | 5 / 25 | prefix (1h) | no | top reasoning; prefill OK |
| claude-sonnet-4-6 | Anthropic | 3 / 15 | prefix (1h, same wiring) | NO (same key) | strong; NO prefill |
| gemini-3.1-pro-preview | Google | 3.50 / 10.50 | implicit+explicit | YES | strong; cheaper OUT than Sonnet |
| gpt-5.5 | OpenAI | 5 / 20 | auto prefix | YES | strong; strips temp |
| deepseek-v4-pro | DeepSeek | 0.55 / 2.20 | auto KV | YES | jargon-heavy on narrative |
| gemini-3.5-flash | Google | 0.30 / 1.20 | implicit+explicit | YES | budget; schema-fill |
| gpt-5.4-mini | OpenAI | 0.25 / 2.00 | auto prefix | YES | budget; schema-fill |

Two objectives DISTINGUISHED: COST ($) -> Sonnet/Gemini-Pro/Flash/mini; QUOTA relief -> only
NON-Anthropic (Sonnet does NOT relieve the cap). Output-heavy deliverables favor cheaper-OUT models.

### Per-deliverable tier proposal (VS candidate -> RI-converged recommendation)
| Deliverable | Nature | Recommend | Why / RI note |
|---|---|---|---|
| #strategy | narrative, Rumelt kernel | **Opus 4.8** | top reasoning; quality risk unacceptable. Keep. |
| #recommendations | narrative, high-stakes | **Opus 4.8** | same. RI: VS+RI skills already wrap these. |
| #report (whitepaper) | longest narrative | **Opus 4.8** (or Gemini Pro if quota-pressed) | depth; output-heavy -> if quota-pressed, Gemini Pro out $10.50 vs $25. |
| #proto (build) | code gen | **Opus 4.8** | code quality; canonical rule. Keep. |
| #personas | narrative+structure | **Sonnet 4.6** (cost) / **Gemini Pro** (quota) | strong sub-Opus; Pro if off-Anthropic needed. |
| #themes synthesis | deterministic synth | **Gemini 3.1 Pro** + exact-cache | already Pro today; deterministic -> cache re-gens. |
| #case-study | narrative+structure | **Sonnet 4.6 / Gemini Pro** | mid-tier sufficient. |
| #prd | semi-structured | **Gemini Pro / Sonnet** | structure bounds it. |
| **#gap #journey** | SCHEMA-CONSTRAINED matrices/tables | **Gemini 3.5 Flash** (temp 0) | **IMPLEMENTED 2026-06-28 (validated).** Bake-off (`model-bakeoff-gap-journey-2026-06-28.md`) proved Flash == Pro on both (0 fabricated citations, 100% structural completeness, Flash cited MORE sources) at ~18x cost cut. Encoded as `DELIVERABLE_MODEL_TIER` in `corpusChatService.ts`; reversible by deleting the map entry. |
| #blueprint #competitive #org #audit #arch #roadmap | SCHEMA-CONSTRAINED matrices/tables | Gemini 3.5 Flash (proposed) / Gemini Pro fallback | **PENDING their own bake-off** — NOT yet validated, so these REMAIN on claude-opus-4-8 until measured. Likely behave like #gap/#journey (template bounds shape) but unproven. RI UNCERTAINTY: citation-faithfulness on a budget model -> MITIGATE with the post-processor + AIR gate + an empirical bake-off before committing; if Flash citations degrade, step up to Gemini Pro. |

RI convergence: the schema-constrained tier is where the big money is (8 deliverables off Opus $25-out
to Flash $1.20-out) AND the lowest quality risk because the schema constrains the shape; the residual
risk is evidence-selection / citation quality, gated by the post-processor + a bake-off. Narrative
reasoning deliverables (#strategy/#recommendations/#report/#proto) stay on Opus (quality-first,
user-locked). #personas/#case-study/#prd -> Sonnet (cost) or Gemini Pro (quota). All recommended models
are cache-capable, so the caching wins (W1-W5) apply on top of whatever tier is chosen.

This table is a PROPOSAL pending user approval (chosen method: VS/RI proposal -> approve). NOT applied.

## 3c. NANO-BANANA (image) interaction with text-model tiering (user-flagged 2026-06-28, HARD)

A deliverable that carries imagery is a MULTI-MODEL pipeline: [text model authors content] + [text model
authors per-element brandImage.concept per Universal Contract #6] + [Nano-Banana gemini-3.1-flash-image-preview
generates the image from the concept] + [native PPTX placeholder]. Tiering the TEXT model interacts:

- **Image GENERATION is model-independent + cached.** Brand images / illustrations / diagrams ALWAYS run on
  gemini-3.1-flash-image-preview via /api/ai/brand-image + /api/ai/diagram, content-hash cached. The text-model
  tier NEVER changes the image-gen step or its cost. So savings math counts ONLY the text call delta; the
  N image calls per deliverable are constant (budget + cached) and must NOT be double-counted.
- **Image CONCEPT authoring IS done by the text model.** So an EMOTIVE-imagery deliverable tiered to a budget
  model must still author content-true per-element concepts. CONSTRAINT: deliverables carrying emotive brand
  imagery (themes, personas, case-study, recommendation, covers/dividers, narrative #slides) may NOT drop below
  a model proven to author strategic concepts (Pro/Sonnet/Opus). The Flash tier is reserved for the 8
  SCHEMA-CONSTRAINED deliverables, which carry ICONS/DIAGRAMS (deterministic compositeIcon / Nano-Banana
  diagram), NOT model-authored emotive concepts -- so Flash never authors a brand-image concept. The proposed
  tier table already honors this; do not move an emotive deliverable to Flash/mini without a concept-authoring
  bake-off arm.
- **Bake-off note:** #gap + #journey (the current arms) carry NO brand imagery -> unaffected, clean text-only
  comparison. A SEPARATE arm on an emotive deliverable (#themes or #personas) must score per-element
  image-CONCEPT quality (content-true? traceable to the corpus element?) across models BEFORE tiering those.
- **"Mid-stream" determinism:** image concepts are part of the deterministic deliverable JSON, so the text
  call's exact-cache covers them; the Nano-Banana call is separately content-hash cached on the concept text.
  Changing the text model changes the concept text -> a different (still cached) image. No mid-stream breakage.

## 3d. ARCHITECTURE CORRECTION (found during #gap/#journey impl, 2026-06-28) — Gemini chat bypasses the proxy

CORRECTS the §2 "single chokepoint" assumption. `corpusChatService.callGemini` uses the **@google/genai SDK
DIRECTLY from the browser** (build-time injected key per vite.config.ts); only `callClaude` posts to the proxy
`/api/ai/anthropic`. So:
- TRUE chokepoint coverage: Anthropic (all), + SERVER-SIDE Gemini (proxy vision-extract, embeddings, the
  `/api/ai/gemini` endpoint). FALSE for: browser-side Gemini CHAT + DELIVERABLE generation (direct SDK).
- **W5 impact:** the explicit Gemini cache (built in the proxy) does NOT touch the chat path -> enabling
  `GEMINI_EXPLICIT_CACHE_ENABLED` is moot for chat until chat `callGemini` is ROUTED THROUGH `/api/ai/gemini`.
  PREREQUISITE added for W5. (Server-side Gemini callers that already hit the proxy DO benefit.)
- **#gap/#journey impact:** tiered to gemini-3.5-flash via direct SDK -> bypasses proxy exact-cache. The ~18x
  model-cost cut (Flash vs Opus) still lands (dominant win); re-gens don't ALSO get proxy cache reuse. temp 0
  still satisfies determinism-first + matches the bake-off.
- **W1/W2/W4 impact:** these need the call AT a cache chokepoint. Upload extraction (`_gemini_multimodal_extract`)
  is server-side but builds the URL inline (bypasses the proxy's OWN exact-cache wrapper) -> fix in-proxy.
  Theme synthesis runs via `corpusChatService`/`geminiService` -> confirm whether it's direct-SDK or proxy
  before wiring its exact-cache (if direct-SDK, route through proxy first, same prerequisite as W5).
- **Strategic implication:** the single highest-leverage caching enabler is to ROUTE THE BROWSER GEMINI PATH
  THROUGH THE PROXY (`/api/ai/gemini`). That one change unlocks W5 + makes W1/W2/W4 reachable for the
  Gemini-tiered deliverables. It is a larger, separate change (affects all chat) -> propose, don't rush.

### STEP 1 STATUS — DONE (2026-06-28, staged not committed)
Browser-side Gemini generation is now ROUTED THROUGH THE PROXY `/api/ai/gemini` chokepoint.
- **What changed (transport only, behavior preserved):**
  - `services/corpusChatService.ts :: callGemini` — replaced all three `@google/genai` SDK
    `ai.models.generateContent(...)` call sites (main tool-loop turn, empty-response retry,
    graceful-finalize) with a new in-function `_geminiTurn()` helper that POSTs to `/api/ai/gemini`
    via `aiRetryClient.callAIWithRetry('gemini', ...)`. The agentic TOOL LOOP, iteration caps,
    tool dispatch, junk-answer guards, exhaustion-finalize, and response parsing are UNCHANGED — only
    the per-turn transport moved. The SDK import + browser-held Gemini key are dropped from this path
    (the proxy holds the key). The prior TS-level 429->DeepSeek block was removed because the proxy
    already does 429->DeepSeek itself and returns a Gemini-shaped 200. Determinism preserved: temp 0
    for the slide-mode/`#gap`/`#journey` deliverable path (exact-cache eligible), 0.2 for chat.
    `_geminiTurn` synthesizes the SDK-only `.text` field from candidate parts so the parser is intact.
  - `proxy/app.py :: proxy_gemini` — added FUNCTION-CALLING passthrough: forwards `tools` (Gemini
    `functionDeclarations`) + optional `toolConfig` (from `body.tools`/`body.config.tools`) into the
    upstream `gemini_body`. The provider response (incl. `candidates[].content.parts[].functionCall`)
    already passes back verbatim via `JSONResponse(result)`, so the client tool loop is unaffected.
    The exact-cache key already hashed `tools`+`config`, so deterministic tool-bearing requests cache
    correctly.
- **What now routes through the proxy:** ALL Analyst chat (`gemini-3.5-flash`) + the `#gap`/`#journey`
  Flash-tiered deliverables + any council/fallback Gemini turn in `callGemini`. (Anthropic was already
  routed; OpenAI/DeepSeek unchanged.)
- **What stays on the SDK:** nothing in `callGemini` — the whole path is proxied. (Other services that
  use the Gemini SDK directly, e.g. `geminiService.ts`, are out of Step 1 scope; theme synthesis W4
  remains to be confirmed/routed in a later step.)
- **Gates:** `npm run typecheck` = 0 errors. `npx vitest run` = 388 passed (45 files). Rebuilt
  `research-proxy` + `research-generator` from repo root; both healthy.
- **Live proof:** SPA :5011 loaded with 0 console errors (only standing error = Anthropic 400 monthly
  quota cap on an auxiliary `claude-haiku-4-5` call, unrelated). A non-hashtag chat ("biggest barrier
  to AI adoption…") routed to `gemini-3.5-flash`, ran the tool loop THROUGH the proxy (multiple
  `POST /api/ai/gemini 200 OK` in proxy logs, incl. a 4KB tool-iter body and a 32KB grounded body),
  and returned a complete corpus-CITED answer in 81s. A `#gap` deliverable routed to `gemini-3.5-flash`
  through `/api/ai/gemini` (985KB/1.26MB grounded bodies) and rendered; the proxy exact-cache `size`
  grew 16->21->22 as the deterministic temp-0 deliverable calls were STORED (previously bypassed). A
  controlled byte-identical temp-0 request carrying a `tools` payload returned `_hic_exact_cache_hit=false`
  on call 1 and `true` on call 2 (size 22->23) — confirming BOTH tools passthrough AND exact-cache
  hit-on-repeat for the routed path.
- **Remaining risk / honest caveats:**
  1. The `#gap`/`#journey` deliverable's grounded prompt is NOT byte-identical across runs (per-run
     chunk selection / query expansion / learned-constraint injection vary), so back-to-back identical
     `#gap` chat messages MISS-then-STORE rather than HIT. The HIT mechanism is proven on byte-identical
     input; making real deliverable re-gens cache-hit requires upstream prompt determinism (a separate
     W4/determinism task, not Step 1).
  2. Explicit Gemini `cachedContent` (W5) is still env-gated OFF (`GEMINI_EXPLICIT_CACHE_ENABLED=0`);
     Step 1 only makes it REACHABLE for chat. Flip the env + restart proxy to enable.
  3. Anthropic key is at its monthly cap until 2026-07-01, so the Opus artifact path could not be
     re-smoke-tested this session; the change does not touch the Anthropic path.
  4. Reversible by design: revert the two edits (restore the SDK calls in `callGemini`; drop the proxy
     `tools` passthrough) to return to direct-SDK transport. Not committed (staged only).

## 3e. STEP-4 mid-tier decision (#personas/#case-study/#prd): Gemini 3.1 Pro (2026-06-28)

Objective = "both: cheapest viable per deliverable" (cost + quota relief). Sonnet 4.6 ($3/$15) is SAME
Anthropic key -> NO quota relief and itself 400-blocked until 07-01; no decisive quality edge for this
tier. Gemini 3.1 Pro ($3.50/$10.50) is cheaper on OUTPUT, relieves the quota (off-provider), already
validated (themes + the gap/journey bake-off), and becomes proxy-cache-eligible after STEP 1.
**DECISION: Gemini 3.1 Pro for the mid tier.** GATE (§3c): these carry emotive imagery -> implement ONLY
after the broadened bake-off Part B confirms Pro authors content-true per-element image concepts (running).
Sonnet stays a documented alternative if a future need is Anthropic-lineage-specific AND the quota is healthy.

## 3f. Implementation sequencing (STEP-goal 2026-06-28)
STEP 1 (route browser Gemini through proxy) = keystone, in progress. STEP 2 (W1/W2/W4 exact-cache) runs
AFTER STEP 1 (shares proxy/app.py + depends on the chokepoint). STEP 3 (broaden bake-off) in progress,
read-only parallel. STEP 4 decision committed above, implementation gated on bake-off Part B.

## 4. RI/VS provenance
This document IS a VS+RI application: each workflow enumerated diverse candidates with probabilities
(VS, moderate-tail), and the two genuinely uncertain/high-stakes decisions (W4 cacheability, W6 model
tiering) triggered an RI re-ask that converged AGAINST the modal "just downgrade to save cost" answer —
W6 specifically because the modal violates the user-locked routing rule + quality-first. The cheap,
deterministic, zero-risk caching wins (W1, W2, W4-scoped, W5) are committed; the model-tiering tradeoff
is escalated to the user, not auto-applied.
