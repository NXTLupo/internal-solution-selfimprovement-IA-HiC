# Stranded-Workflow Integration Plan — 2026-06-15

Goal: identify HiC features that are **built but not wired into the live unified pipeline** (or half-integrated so they fracture the end-to-end flow), and target each for integration, enhancement, or deletion. Produced from a read-only forensic audit (subagent, 42 tool-uses, all claims grep/read-verified) plus the design-system propagation findings from the upload/vision work this session.

## The spine every feature must serve
1. **Ingestion → readable corpus** — uploads (`FileUpload` landing + in-chat attachments) via proxy `/api/parse-upload`; external connectors via `/api/search/*`.
2. **Knowledge layer (anti-RAG)** — wiki markdown + manifest (chunk pointers `path#cN` + frontmatter spans + `engagement` tag + `relevance`) + vector store.
3. **Retrieval/grounding** — `chunkRetrieval.pickChunksForPrompt` → catalog (tier-1 engagement / tier-1.5 objective-ranked / tier-2 KL / tier-3 whole-wiki) → `resolveChunks` → MMR pack.
4. **Generation** — `corpusChatService.sendChatMessage` force-routes artifact hashtags to `claude-opus-4-8`; assembles skills + manifest chunks + Figma tokens + learned constraints → `:::slide` fences.
5. **Render twins (1:1)** — `slideToStageHtml.ts` (export → python-pptx) + `web.tsx` (preview); brand via `BRAND_ID`.
6. **Quality/anti-slop** — `slidePostProcessor.ts` + `.claude/hooks` + single-source lexicon.
7. **Self-improvement** — feedback → learned constraints → injected; SkillOpt; engagement memory.

---

## Fixed THIS session (code landed, typecheck 0; NOT yet rebuilt/live-verified)
- **Vision extraction (Stage 1).** `/api/parse-upload` now sends images AND image-only/scanned PDFs to Gemini multimodal (`_gemini_multimodal_extract`); replaces the "Phase 3 pending" placeholder. **Verified live**: a 0-text image-only PDF returned 19,438 chars. Covers both landing + in-chat uploads (same endpoint).
- **Upload chunk/tag (Stage 2).** `writeAdHocUpload` now passes `{ chunk: true, engagement: sessionSlug }` so in-chat uploads enter the manifest catalog + engagement scope (landing path already did via `write-article` / `seedWikiFromUploads`).
- **Objective-ranked admission, tier-1.5 (Stage 3).** New `/api/manifest/chunks-by-goal` ranks the whole store by semantic closeness to the research objective and returns **manifest-validated** pointers (never raw RAG); `chunkRetrieval` unions it into the catalog; threaded through all 4 `pickChunksForPrompt` callers. Fixes engagement-slug starvation ("1 page").
- **Logo de-hardcode (Stage 5).** `hydrateTokensFromFigma` now hydrates `t.logo`; both twins read `BRAND_LOGO_SVG/WORDMARK` from the token feed (NXT←hydrated `TOKENS`, NU←hydrated `nuBrand`) instead of a baked-in mark.
- **Structural-adherence rule (Stage 4).** SLIDE OUTPUT PROTOCOL now has a HARD RULE: honor explicit slide count + "one slide per <entity>" coverage + "rely only on uploads" scoping; never fabricate to hit a count.

**Deploy gate:** all SPA changes need one `research-generator` rebuild + hard refresh; proxy changes are live. Then re-upload the screenshots/PDFs (cached empty parses must be re-ingested) and re-run the deck to verify per-app coverage.

---

## P0 — Highest impact (silently degrades every generation)

### S3.1  `loadGenerationContext()` bypassed on the generation spine
- **Where:** absent from `corpusChatService.ts` (`sendChatMessage`) and `narrativeComposer.ts`; present in 6 other modules.
- **Impact:** the wiki-first framework / anti-pattern / brand / learned-constraint page injection the architecture promises is unmet for every chat-driven artifact + `#presentation`. (Nuance to verify: the skill-injection + manifest-chunk + design-token paths DO run on the spine, so part of the contract is covered; confirm exactly which framework/anti-pattern PAGES are missing before wiring, to avoid double-injection.)
- **Action:** wire `loadGenerationContext()` (or fold its page set into the manifest-chunk assembly) into `sendChatMessage` prompt assembly. **Effort M.**

### S1/S2.x  Design-system propagation: export twin hardcodes the whole palette
- **Where:** `slideToStageHtml.ts` `NXT`/`NU` are literal `BrandTokens` constants; `brandTokens()` returns one of them — it never reads the hydrated Figma tokens (only the shared type scale is hydrated). `web.tsx` uses hydrated `TOKENS`.
- **Impact:** the **downloaded PPTX cannot reflect any new Figma color/font work**, and preview ≠ export at the token level. This is the root "new Figma components aren't deployed." (Logo specifically is now fixed; color/font remain.)
- **Also:** **hydration-target inconsistency** — `hydrateTokensFromFigma('NXT')` mutates the global `TOKENS`, but `nxtBrand = {...TOKENS}` is a pre-hydration **snapshot**, so any consumer reading `getBrand('nxt')` gets stale values. NU is fine (passed as the hydration target).
- **Action:** map `brandTokens()` from the hydrated `Brand` (read `TOKENS` for NXT / `nuBrand` for NU); fix `nxtBrand` to hydrate (pass it as a target, or make it a getter). Careful migration with a per-field color/font diff + export re-verify. **Effort M–L.** (Deferred from this session deliberately — load-bearing renderer, and the designer is mid-flight in Figma.)

### S4.1  Two parallel deck pipelines
- **Where:** legacy 3-phase `generateDeckStructure → generateNarrative → visualizeNarrative` (+ `buildDeckDigest` 4KB truncation bug) still wired in `App.tsx:3274-3310, 5929-5943`, parallel to the unified `:::slide` engine.
- **Impact:** a user on the legacy deck UI path gets the known-broken (3.2/10, blank-slide) output, not the GOLD engine — fractures "one engine, no exceptions."
- **Action:** confirm if the App.tsx deck path is still reachable; if so redirect to `sendChatMessage` slide-mode and delete the 3-phase methods + `buildDeckDigest`. **Effort M–L.**

## P1 — Fractures a promised capability

### S4.2  `#presentation` routing fork → scaffold renderer
- `CorpusChatPanel.tsx:5797` intercepts `#presentation` → `narrativeComposer` before `sendChatMessage`, so `HASHTAG_TO_SKILL_ID['#presentation']` is dead config; target `presentation-renderer` (5014) is scaffolding only. **Action:** finish renderer sections OR remove the fork and fold `#presentation` into the GOLD `:::slide` engine. **Effort L / S.**

### S7.1  Self-improvement loop not closed
- `epochTrigger.getEpochStatus` has no SPA consumer; nothing auto-fires the epoch-proposer; `cross-engagement-patterns.md` stuck at `patterns_compiled: 0`; SkillOpt manual-only. Likely **blocked by a `/api/wiki/write` 500 `[Errno 22]`** (Windows invalid-filename char) that prevents writing the patterns file. **Action:** fix the wiki-write filename sanitization first (unblocks the miner), then add an auto-fire trigger + a `getEpochStatus` consumer. **Effort M.**

### S6.1  Anti-slop lexicon single-source migration incomplete
- Canonical `anti-slop-lexicon.json` is read only by the new validator; `slidePostProcessor` (SLOP_PHRASES), `wikiService` (BANNED_PHRASES), `nxt-visual-renderer/anti-slop-rules.md` still hold divergent copies; shadow detectors (negative_parallelism, triad, bold_colon) log but never block. **Action:** point runtime banlists at the canonical JSON; promote shadow detectors after an FPR ramp. **Effort M.** (Note: the deck console showed `negative-parallelism-comma` + `colon-then-list-title` tells flagged-but-not-blocked — this is why.)

### S5.1  Parity guard blind spot
- `check-template-parity.mjs` validates `SlideCanvas.tsx` + `pptx.ts` but NOT `slideToStageHtml.ts` (the export twin). It's in de-facto sync now, but drift wouldn't fail loudly. **Action:** extend the guard to assert `slideToStageHtml.ts` covers the template union. **Effort S.**

### S4.3  `buildManifestCorpusForGoal` not exercised on the spine
- Helper consumed only by `CorpusChatPanel.tsx`, "NOT yet live-run on a generation" (supercharge plan §5.1); not used by `corpusChatService`/`narrativeComposer`. (Tier-1.5 work this session routes through `pickChunksForPrompt` directly; reconcile the two entry points.) **Effort S–M.**

## P2 — Dead code / housekeeping (delete after confirming)
- **V3 research-fabric cluster** — `coverageScorer.ts` (~320 LOC) + `methods/MethodExecutor.ts` (~120 LOC): zero external callers; `queryFabric.ts` already deleted; `wiki/methodologies/research-fabric.md` documents a dead API. Delete files + wiki section. **S.**
- **`wikiCacheLoader.ts`** engagement-bundle helpers (~294 LOC, 6 fns) — orphaned, superseded by `wikiService` manifest fns. **M.**
- **`chunkedGenerateBlueprint`** (`deliverableChunkers.ts:580`) — the 1 of 7 chunked generators never wired. Wire or delete. **S.**
- **`RecommendationTilesGrid`** + `#recommendations` tile-export in `CorpusChatPanel` — dead post-unification. **S.**
- **`wikiNarrator.ts`** (4 narrators), **`aiRetryClient`** sugar (`callGemini/...`), **`FeedbackReceipt.tsx`** (import commented out) — orphaned. Delete. **S.**
- **Doc fixes:** `types.ts` header says "10 templates" (union is 22); orphan report is 3 weeks stale.

## Caveats from the audit
- Template twin-drift is NOT a current problem (parity passes 22/22).
- Some strands are "doubly stranded" (e.g., the Fable-5 breadth-shard branch `_runBreadthShard` points to a banned model).
- "Code landed, not live-verified" items are *unverified shipping*, distinct from stranded code — excluded here unless also unwired.

## Suggested sequence
1. Deploy + verify THIS session's fixes (vision + chunk/tag + tier-1.5 + logo + per-app rule) — one rebuild, re-upload, re-run deck.
2. P0: `loadGenerationContext` on the spine; then the export-twin token migration (with the `nxtBrand` hydration fix).
3. P1: self-improvement unblock (wiki-write filename bug) → it cascades into the pattern-miner + `#meta-themes`.
4. P1/P2: lexicon single-source; parity-guard extension; then dead-code deletions in one sweep behind `noUnusedLocals`.
