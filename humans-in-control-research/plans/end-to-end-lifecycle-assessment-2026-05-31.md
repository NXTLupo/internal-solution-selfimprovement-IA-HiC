# HiC End-to-End Lifecycle Assessment & Integrated Remediation Plan (2026-05-31)

Full-lifecycle audit: knowledge/data extraction -> corpora creation -> retrieval -> synthesis ->
artifact generation -> self-improvement. Grounded in four parallel code audits + the live
"too brief" artifact the user flagged. Goal: make the recent spot-fixes connect to, and lift, the
whole lifecycle instead of patching one path at a time.

---

## 0. The meta-problem (read first)

HiC is not one pipeline; it is **several parallel pipelines that share data but NOT a single enforced
quality contract.** Quality fixes have landed unevenly across them. Concretely:

- **2 corpus-build paths**: Path A (`executePlan` -> `mergeResultsToCorpus`, scored+enriched+deduped)
  and Path B (the ~1,475-source `sourceIds[]` multi-search in `App.tsx`, **unscored, unenriched,
  undeduped**) — and Path B is where most of the corpus volume comes from.
- **2 embed paths**: write-time (`_embed_and_cache_article`, **degraded**: 1200-char single chunk,
  `chars=0`, untagged, url_hash-keyed) and operator backfill (`/api/wiki/chunks-backfill`,
  full-fidelity, wikiPath-keyed) — they even produce **duplicate rows** with different keys.
- **3+ artifact render paths**: JM-routed (`/api/journey-map/generate` -> `_apply_brand_and_anti_slop`),
  proxy artifact engine (`/api/artifact/generate` -> `_apply_brand_and_anti_slop`), and the
  **HTML-deliverable path (`/api/artifacts/{slug}/view`) which bypasses `_apply_brand_and_anti_slop`
  entirely** (the linked brief had 87 em-dashes + 0 quotes/cards/tables, 429 visible words).

My spot-fixes this session (minChars, retrieval routing, leaked-artifact backstop, domain gate) are
correct but landed on a SUBSET of paths. The user's two complaints — "brief too brief / weak journey"
— live in stages (synthesis depth, artifact prompt assembly, self-improvement wiring) my spot-fixes
did not reach. This plan connects them.

---

## 1. Stage-by-stage findings

### Stage 1 — EXTRACTION (breadth, not depth)
- ~1,475 sources / 11 packs / 8 connectors. Engineered for breadth.
- **Path B (the dominant corpus) is never relevance-scored, enriched, or deduped** (`App.tsx:3963-3976`);
  `filterAndScoreItems` runs only on Path A.
- Per-source hard cap **`limit=15`** (`App.tsx:3605`); only top-300 items ever enriched to full text.
- **Reddit-deep cache serves stale, off-objective posts** keyed ONLY on subreddit name, no goal/recency
  filter (`wikiCacheLoader.ts:496-507`) — the 253 stale co-op posts.
- Objective does NOT constrain collection; `filterAndScoreItems` policy is "KEEP ALL" (sort only).

### Stage 2 — CORPORA CREATION (the weak substrate beneath my retrieval fixes)
- **Fresh-run articles embedded DEGRADED**: `/api/wiki/write-article` -> `_embed_and_cache_article`
  passes only `content[:1200]`, no `chars/kind/tier/relevance/engagement_goal/wikiPath`
  (`app.py:8439-8445`). So a fresh run's tail content is NOT retrievable; `chars=0` is stored.
- **`chars=0` IS the root of the minChars bug I band-aided on the retrieval side** — the write side
  still stores 0. Fix it at the source.
- write path keys by `url_hash`, backfill by `wikiPath` -> **duplicate rows**.
- **Industry tagging unwired** (`classifyIndustries` 0 callers; no `industries` column).
- **Single global `.vectors.db`, no engagement scoping** — only a 30% goal-blend at query time, never a
  WHERE clause -> **cross-engagement pollution** (the co-op-into-AI-design bleed).
- Full-fidelity embedding only happens via a MANUAL backfill; no auto-trigger after a run.

### Stage 3 — RETRIEVAL (fixed this session, but sits on the weak substrate above)
- FIXED: `minChars` now measures matched-chunk text (0->40 design articles); empty-path admission;
  objective-keyed corpus routing for artifacts; domain-relevance gate; analogue-aware.
- REMAINING: retrieval reads a store where fresh data is truncated/untagged and cross-engagement
  polluted. My fixes are necessary but not sufficient until Stage 2 is fixed.

### Stage 4 — SYNTHESIS (the "too brief" root cause)
- The "strategic brief" = `generateStrategicReport()`. Prompt is rich and correct; the FAILURE is
  mechanical:
  - **Phase 1 generates the WHOLE report in one chat-session call on Gemini Flash with NO
    `maxOutputTokens` + a 20KB repetition-guard truncation** (`geminiService.ts:5762-5848`) -> long
    sections get clipped -> thin brief. (Code comment admits "often runs out of tokens.")
  - **Theme Pass-2 depth fields never reach the report**: `serializeThemes` drops
    subThemes/dimensions/contradictions/temporalArc/implications (`geminiService.ts:5090-5097`).
  - **No landscape/opportunity/challenge framing stage wired in**: `generateCrossCuttingSynthesis`
    exists but is gated + never serialized into the report.
  - **TOP_N truncates themes to 7-12** before the brief sees them.
  - **No per-section depth floor**; failed sections silently dropped.

### Stage 5 — ARTIFACT GENERATION
- **Journey contract is RICH** (4-6 phases, 12+ quotes, cross-cutting pains+opportunities, diagnostic
  title) — but `_create_prompt` appends ~150 lines of **legacy generic-journey instructions that
  CONTRADICT it** (re-introduce KPIs/charts banned elsewhere) (`dynamic_journey_mapper.py:1155-1308`),
  diluting depth. That is why the journey underperforms its own contract.
- **Brief contract is the THINNEST in the system**: JM `brief_contract` + proxy
  `_kind_layout_hint("brief")` = one line, no quote floor, no depth floor, no "EXPAND if unmet"
  instruction (every other artifact has one). Direct cause of "too brief."
- **`/api/artifacts/{slug}/view` bypasses `_apply_brand_and_anti_slop`** (`app.py:4056`) -> em-dashes,
  no design-system injection, no leaked-artifact backstop. A whole render path outside the chokepoint.

### Stage 6 — SELF-IMPROVEMENT (structurally disconnected from the weak artifacts)
- The localStorage constraint loop is closed for **in-SPA Gemini generation only**.
- **The JM journey/blueprint route and ALL proxy artifact kinds (brief, persona, recommendation...)
  receive ZERO learned constraints and ZERO engagement memory.** The exact artifacts the user is
  unhappy about never benefit from the loop.
- Loop has never run on real signal (feedback dir is synthetic seeds); SkillOpt autotrigger is a
  likely no-op in Docker.

---

## 2. How the stages connect (the causal chain to the user's complaints)

```
"Brief too brief"  <= Stage 4 single-call token-clip + dropped theme depth + no framing stage
                      + Stage 5 thinnest-in-system brief contract (no EXPAND floor)
                      + /api/artifacts/view bypasses anti-slop (em-dashes, no DS)
"Journey weak"     <= Stage 5 prompt self-contradiction (legacy block fights the rich contract)
                      + Stage 6 journey route gets no constraints/engagement memory
                      + (now mitigated) Stage 3 retrieval was starved by minChars/chars=0
"Off-objective /   <= Stage 1 unscored Path B + stale reddit cache
 thin themes"         + Stage 2 chars=0 degraded embed + no engagement scoping
                      + Stage 3 minChars (FIXED) reading that weak store
```

My spot-fixes corrected Stage 3 and added output-hygiene backstops on 2 of 3 render paths. The
remaining gaps are Stages 1, 2, 4, 5-brief, 5-view-path, and 6 — and they are why depth/framing are
still weak.

---

## 3. Integrated remediation plan (sequenced; each phase shippable)

### A. Close the corpora-creation substrate (Stage 2) — makes retrieval fixes real
A1. `_embed_and_cache_article` write path: embed the FULL body (not `content[:1200]`); set
    `chars=len(content)`, `kind`, `tier`, `relevance`, `engagement_goal`, `wikiPath` in `embed_entry`
    (`app.py:8439-8445`). Kills the `chars=0` root cause and makes fresh-run tail content retrievable.
A2. Key both embed paths on `wikiPath` to stop duplicate rows.
A3. `writeWikiArticle` POST: add `relevanceScore`, `engagementGoal` (`researchFabricOrchestrator.ts:1663`).
A4. Add `engagement_goal` boost (not hard filter) to `VectorStore.search` to cut cross-engagement
    pollution at the source (complements the domain gate).
A5. Wire `classify_deterministic` into the write/embed path + add `industries` column (industry tag
    becomes real, enables vertical-aware retrieval).

### B. Fix synthesis depth (Stage 4) — the "too brief" fix
B1. Convert `generateStrategicReport` Phase 1 from one chat-call to a per-section fan-out on
    `aiRouter` research tier (`claude-opus-4-8`) with explicit high `maxOutputTokens`; the 20KB
    repetition guard must not gate report sections.
B2. Serialize theme Pass-2 depth fields into the report prompt (`serializeThemes`).
B3. Always run `generateCrossCuttingSynthesis` once themes+personas+recs exist; serialize it; add an
    explicit "LANDSCAPE FRAMING" section (space / opportunities / challenges) to the manifest.
B4. Pass the full thick-evidence theme set to the report (don't pre-truncate to TOP_N).
B5. Add a per-section word-count floor with regenerate-on-thin (mirror the theme BREADTH_FLOOR retry).

### C. Fix artifact depth + close the render-path gap (Stage 5)
C1. Author a real `brief` depth contract (SCQA + diagnosis + 3-5 evidenced findings each with 2-3
    verbatim quotes + opportunities + recommendations + "EXPAND if any floor unmet") in BOTH JM
    `brief_contract` and proxy `_kind_layout_hint("brief")`.
C2. Delete/neutralize the legacy generic-journey block in `_create_prompt`
    (`dynamic_journey_mapper.py:1155-1308`) so the rich contract is not diluted.
C3. **Route `/api/artifacts/{slug}/view` through `_apply_brand_and_anti_slop`** (and the
    leaked-artifact backstop + NXT design-system injection) so the third render path is covered.
    This is the universal-coverage fix that makes the Phase-4 backstop actually universal.

### D. Connect self-improvement to the weak artifacts (Stage 6)
D1. Thread `learned_constraints` (getActiveConstraints) + `engagement_context` into the journey-map
    POST body (`CorpusChatPanel.tsx:6553`) and the proxy `/api/artifact/generate` ->
    `_artifact_generation_prompt`. Closes the loop for journey + all proxy artifacts.

### E. Tighten collection on-objective (Stage 1) — feeds everything
E1. Route Path B `proxyResults` through `filterAndScoreItems` + `enrichTopItems` + dedup before
    corpus build (`App.tsx:3963`). Single highest-leverage depth fix in Stage 1.
E2. Goal+recency-key the Reddit-deep cache loader (`wikiCacheLoader.ts:496`) so stale off-objective
    posts are not served.
E3. Auto-fire `/api/wiki/chunks-backfill` after residual archival so this run's data is fully
    embedded before generation reads retrieval (lower priority once A1 lands).

---

## 4. Sequencing & leverage

| Phase | Theme | Fixes the user-visible symptom | Risk |
|---|---|---|---|
| A (Stage 2) | Corpora substrate (chars=0, fidelity, engagement scope) | thin/off-objective everything | med |
| B (Stage 4) | Synthesis depth | **"brief too brief"** directly | med |
| C (Stage 5) | Artifact contracts + view-path coverage | **"brief too brief" + "journey weak"** + em-dash leak | low |
| D (Stage 6) | Self-improvement wiring to weak artifacts | compounding quality on journey/artifacts | low |
| E (Stage 1) | On-objective collection depth | richer corpus for all | med |

**If only one phase ships: C** (cheap, directly fixes the two complaints + closes the render-path
hole). **Then B** (real depth). **A** makes the retrieval fixes structurally sound. **D** makes it
compound. **E** raises the ceiling.

---

## 5. What my spot-fixes already did (and where they connect)
- Stage 3 retrieval: minChars/admission/routing/domain-gate -> FIXED + verified (0->40 design).
- Output hygiene: leaked-artifact backstop + synthesis-citation strip on 2 of 3 render paths
  (JM-routed + `/api/artifact/generate`). **Gap: `/api/artifacts/view` (Phase C3).**
- They are the right fixes for retrieval + hygiene; they do NOT touch synthesis depth (B), artifact
  contracts (C1/C2), the substrate (A), or self-improvement wiring (D). This plan adds those so the
  whole lifecycle lifts together rather than one path at a time.

## 6. Verification (per phase)
- Regenerate the AI-design strategic brief + journey #slides after B+C; assert: brief >= N sections,
  >= M words/section, quotes/cards present, framing section present, 0 em-dashes on the view path,
  0 leaked/synthesis citations.
- Cross-objective (retail / healthcare) re-run to confirm no hardwiring + analogue-awareness holds.
- Fresh-engagement re-run after A to confirm this-run data is retrievable + engagement-scoped.
```
