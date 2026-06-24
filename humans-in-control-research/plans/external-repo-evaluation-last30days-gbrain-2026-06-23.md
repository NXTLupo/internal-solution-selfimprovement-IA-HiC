# Unified Vision, End-to-End Implementation, and External-Repo Evaluation (2026-06-23)

> Two-part deliverable.
> **Part 1** articulates the unified vision in full and traces the implemented end-to-end
> workflow (collection -> theme extraction -> chunking -> manifest -> registry -> anti-RAG chat ->
> hashtag generation -> self-improvement), grounded in file:line evidence.
> **Part 2** objectively evaluates two external repos a colleague recommended
> ([last30days-skill](https://github.com/mvanhorn/last30days-skill),
> [GBrain](https://github.com/garrytan/gbrain)) for fit against that vision, and where they fit,
> builds an integration plan using Verbalized Sampling + Reinforcement Inference.
>
> Status: ANALYSIS + PLAN ONLY. Nothing implemented. Nothing committed.

---

# PART 1 — THE UNIFIED VISION, IN FULL

Canon: `.claude/UNIFIED_VISION.md` (always loaded via `.claude/CLAUDE.md`). Distilled from
`.claude/skills/intelligence/` (Meta-Harness, RHO, SkillOpt, Reinforcement Inference, Verbalized
Sampling, NotebookLM spec, second_brain.json) and ratified by the owner across the 2026-06 sessions.

## The 8 principles

1. **Meta-Harness** — self-improvement reads complete rollouts (prompt + tool calls + output +
   edits), never a lossy digest.
2. **RHO** — label-free self-preference with an **S>0 promotion gate**. A change ships only if it
   beats the incumbent on a held-out signal; nothing is promoted on vibes.
3. **SkillOpt** — bounded skill/library edits, attributed to source rollouts, behind a strict
   held-out gate. Drift in = skills that get worse each pass; the gate is what makes the loop
   net-positive.
4. **Reinforcement Inference** — uncertainty-triggered re-ask. Low confidence => re-ask/re-generate
   from source, never emit a hedged or fabricated answer.
5. **Verbalized Sampling** — fight typicality bias / mode collapse. Diversify candidates; never
   collapse to the single most-probable phrasing (themes, headlines, exemplars especially).
6. **NotebookLM / ANTI-RAG** — source-grounding via the **MANIFEST**, never embedding-RAG
   injection. **ONE grounding chokepoint.** Legacy embedding-RAG that injects raw `rawSources`/themes
   is the root of hollow output and is being **deleted, not extended**.
7. **Figma as design-system-of-record — LEGO-BRICK, NEVER HARDCODED.** Every deliverable is
   composed from NAMED, REGISTERED Figma components + variables + tokens, the way `#proto` builds a
   UI from `proto-component-manifest.md`. The model reads brick contracts from markdown at generation
   time and COMPOSES; it never invents UI shapes, never hardcodes values.
8. **Karpathy second-brain** — a markdown wiki + index pointers the model reads at runtime. **Not a
   vector DB.** `MEMORY.md`-style indexes point at atomic files; the manifest is markdown the model
   retrieves and reads. Knowledge compounds in files, not in weights or an opaque store.

## The meta-principle: CONVERGE, DELETE, GATE, SCHEDULE — do not build-new

HiC already built these primitives. They are inconsistently wired, shadowed by parallel legacy
machinery, ungated, and unscheduled. The standing job is to **converge** duplicate paths onto one
chokepoint, **delete** the legacy parallel, **gate** every self-improvement loop behind a held-out
check, and **schedule** the curators/miners/auditors. Reach for a NEW subsystem only after confirming
the primitive does not already exist.

## NO STOPGAPS, EVER. Lego-brick doctrine (Track B, Method A).

Fix root causes durably; deferring a known durable improvement is itself a stopgap. The model
composes from registered bricks at generation time; tokens come from `/api/design-tokens` (modes NXT
`221:0` / NU `535:0`); **the SPA never calls Figma at runtime** (the published library is mirrored
into `figma-tokens.json` + the registry, which are the runtime carriers). Brand = a token MODE flip;
density = a token mode. Single source of truth for routing: Gemini 3.5 Flash for plain chat, Claude
Opus 4.8 for ALL hashtag deliverables incl `#proto`.

**The through-line:** every load-bearing surface (collection, retrieval, generation, design,
self-improvement) resolves to a **markdown manifest the model reads** plus **one chokepoint** plus **a
gate**. That is the lens the external repos must be judged against.

---

# PART 1 (cont.) — THE IMPLEMENTED END-TO-END WORKFLOW

Verification baseline at time of writing (confirmed live): `npm run typecheck` = 0,
`npx vitest run` = 221/221 (29 files), `node scripts/check-template-parity.mjs` = 24/24, HEAD =
`b573f05b1`.

## Stage 1 — Data collection

**Where:** `proxy/app.py` (SOURCES registry ~L190-520; 8 connector types: REST L7353, RSS L7551,
arXiv L7334, CKAN L7673, Socrata L7701, static-URL L7515, web-search L7745, Invidious/YouTube
L7761), `services/researchFabricOrchestrator.ts` (~2,100 lines; fan-out, dedup, `SourceDocument[]`).

- **200+ sources, add-by-dict** — a new source is a dict entry, no code change.
- **Gated-source filter** (`proxy/app.py` L7400-7506, `detect_pdf_url` L7412): academic results
  without an open-access PDF are dropped, preventing abstract-only corpus pollution.
- **Source packs** (`proxy/app.py` L7095-7176; `healthcare_sources.py` 200 entries; `pack_match`):
  industry/theme bundles resolve to source-id unions; surfaced via `GET /api/source-packs`.
- **Reddit-deep** (`POST /api/reddit-deep/fetch` L2452; PRAW; `discoverSubreddits()`
  researchFabricOrchestrator L131): subreddits auto-inferred from the goal, 50 posts x ~10 comments
  per subreddit. **This is the documented source-skew origin** (collection-volume imbalance, not a
  retrieval bug).
- **Uploads** (`POST /api/parse-upload` L8088): PDF/PPTX/Office/text + **Gemini multimodal vision OCR**
  for image-only PDFs and screenshots (L8119, L8158).
- **Remote PDFs** (`GET /api/extract-pdf` L7770; `_persist_remote_pdf` L7776): fetched, extracted,
  and **persisted into the same wiki -> chunk -> manifest pipeline**.

All collected artifacts are written to `hic-workspace/wiki/articles/` (and
`social-intelligence/reddit-deep/`) via `POST /api/wiki/write-article` (L11002), content-hash
de-duplicated (`_content_index.json`), chunked at write time, embedded full-fidelity, and upserted
into the manifest journal. **Verdict: fully implemented, no stubs.**

## Stage 2 — Theme extraction

**Where:** `services/geminiService.ts` `generateThemes()` (the reference anti-RAG generator),
backed by the `theme-analyst` / `theme-yield-guarantee` / `topic-cluster-to-theme-converter` skills.
Topic clustering lives in `proxy/topic_modeling.py` (UMAP + HDBSCAN + c-TF-IDF + outlier reduction,
L439-520); surfaced via `services/topicModelService.ts`.

- Naming-class calls are seeded deterministically (`deriveSeed()` in `multiModelResilience.ts`
  L92-100) per the determinism-first rule.
- **Verbalized Sampling** is the intended Pass-1 BREADTH mechanism (k candidates + probabilities +
  CoT) to escape "system fragmentation / shadow IT" mode-collapse.
- **Gap (honest):** `parent_topic` hierarchy is in the schema but not populated (flat clusters);
  VS/RI are encoded in the `emitDeliverable` trace envelope but only ~6/22 deliverables route through
  that wrapper today. Theme generation itself is implemented; full VS/RI coverage is aspirational.

## Stage 3 — Chunking + manifest (the anti-RAG substrate)

**Where:** chunking at write time (`proxy/app.py` `wiki_chunker.chunk_for_manifest` L11080);
manifest in `hic-workspace/wiki/articles/.manifest.{base,journal}.jsonl`; retrieval in
`services/chunkRetrieval.ts` (~1,140 lines).

- **Chunk id scheme:** `<wikiPath>#c<index>` (stable, durable). `researchFabricOrchestrator`
  `getChunkSourceMap()` + `citationPointerRegistry` resolve pointers to named sources at every render
  surface.
- **`pickChunksForPrompt()`** (L361-631): CPU-only key-term pre-rank -> resolve subset -> MMR
  diversity pack (lambda 0.7) -> **social soft-cap `SOCIAL_MAX_FRAC=0.4`** (L568-620). The cap
  **releases when non-social candidates run out** — the residual half of the Reddit-skew problem.
- **Tiered admission** (L141-281): tier-1 engagement-scoped; tier-2 committed KL selection
  (`userSelected=true`, `USER_SELECTED_TIER=100000`, **never dropped, trumps auto-ranking**); tier-1.5
  objective-ranked; tier-3 whole-wiki fallback.
- **`assembleChunkCorpus()`** (L654-682): renders chunks as a cite-by-pointer block with a mandatory
  citation contract (L728-745).
- **Insight-as-chunk second brain** (`persistInsightAsChunk` L857-938, `persistDeliverableInsights`
  L1036-1080): every generated insight is written back as a `kind:insight` wiki chunk (distinct from
  `article` so synthesis never masquerades as external evidence), so the manifest grows from
  generation. Content-hash idempotent.
- **Self-healing manifest reconcile** (`proxy/app.py` `_manifest_reconcile` L11719, 20s after boot
  then every 1800s): catches direct-disk writes that bypass the API.
- **Resilience** (`multiModelResilience.ts`): content-hash embedding cache, provider-health 429
  cooldown, per-corpus provider commitment, signature-keyed identity-call cache.

**Verdict:** This is the strongest realization of the vision in the codebase. **Residual legacy-RAG**
is narrow and demoted: tier-1.5 uses an embedding cosine to *rank* candidates, but results are filtered
to manifest-tied pointers; the chat path keeps a ~40KB raw-corpus tail placed *below* PRIMARY EVIDENCE.
Neither is a primary grounding path. Do not expand them.

## Stage 4 — Registry referencing (Figma lego-brick)

**Where:** registry markdown `hic-workspace/wiki/brand/figma-node-map.md` (COMPONENT REGISTRY) +
machine contract `plans/figma-audit/registry.json`; mirrored tokens
`hic-workspace/design-system/figma-tokens.json` served at `/api/design-tokens?brand=NXT|NU`.

- **Parity gate** `services/figmaRegistryParity.test.ts`: every `slideToStageHtml` dispatch template
  must be `firstClass` (Figma-backed, node-anchored) OR `renderer_only` (explicitly quarantined with
  reason). Reverse-gap + planned-renderer burn-down + non-increasing **no-hardcode hex ceiling** per
  twin file. `scripts/check-template-parity.mjs` enforces web/pptx union parity (24/24).
- **Composition (Method A):** `services/slideComposer.ts` composes from `ARCHETYPE_SPECS` data +
  one token resolver, no per-archetype `renderX`, no literal hex/font. Renderer twins
  `services/slideToStageHtml.ts` (1920x1080 export) + `components/slideTemplates/goldPreviews.tsx` /
  `SlideCanvas.tsx` (React preview) + `components/slideTemplates/pptx.ts`. `types.ts` carries the
  `SlideTemplate` union + `DENSITY_SPEC`/`densityCaps`.
- **`#proto` mirror:** `services/prototypeBuilder.ts` reads
  `design-system/proto-component-manifest.md` (75 node-anchored `proto/<Name>` ids), fetches LIVE
  tokens (no hardcode fallback), composes via multi-agent pods, then `extractManifestProtoIds()` +
  fidelity check surfaces invented (non-manifest) components; `@babel/standalone` compile gate +
  syntax repair.

**Verdict:** implemented and gated. Known token-fidelity defects remain a burn-down list
(executive-brief raw frame, tech-arch raster connectors, a few literal cyan/border hexes).

## Stage 5 — AI chat with corpus awareness (anti-RAG, both desks)

**Analyst Desk** (`services/corpusChatService.ts` `sendChatMessage`): plain question ->
`pickChunksForPrompt` -> `resolveChunks` -> `assembleChunkCorpus` placed as **PRIMARY EVIDENCE**,
research context + manifest overview + active-category roster injected, raw `corpusText` demoted to a
capped supplementary tail. Agentic `callGemini` tool-loop (`fetch_wiki_articles`) **capped at
min(MAX_TOOL_ITER, 3)**, `maxOutputTokens` 16384 (the 2026-06-23 latency fix, 276s -> ~83s). Replies
render through `components/ChatProse.tsx` (`normalizeMarkdown` reconstructs block boundaries from
Flash's inline markers; `forceOrderedList` enforces exact counts).

**Designer Desk** (`design-desk/DesignDeskChat.tsx` `buildPromptCorpusGrounded` L259): mirrors the
same `pickChunksForPrompt` path (30K token budget) -> manifest chunks as PRIMARY EVIDENCE + shaped
intelligence snapshot; `EvidenceStatus` strip surfaces CORPUS/UPLOADS/THEMES/PERSONAS/JOURNEY
awareness. Routes artifacts to Opus 4.8.

**Finalizer** `slidePostProcessor.ts` `scrubChatReplyMeta()` (L727): **fence-aware** — drops
preamble/postamble prose, runs bounded JSON-safe in-field meta/process deletions, and does a
structure-preserving line-by-line sweep on plain prose. Distinct from the geminiService deliverable
finalizer (which flattens newlines, hence the separate chat path).

**Verdict:** both desks realize anti-RAG manifest grounding. The chat raw-corpus tail is the only
residual; it is demoted, not primary.

## Stage 6 — Hashtag generation (in alignment with the vision)

`services/hashtagParser.ts` extracts directives (`#slides #journey #personas #proto #presentation
#brief #explainer ...`) non-destructively. `corpusChatService` `isArtifactGenerationMessage` /
`routedModelFor` **force-route every artifact hashtag to `claude-opus-4-8`** (single source of truth;
Opus rejects `temperature`, proxy strips it). The SLIDE OUTPUT PROTOCOL + `nxt-visual-renderer` render
contract + matched methodology skill are injected; output is `:::slide template=NAME` fenced JSON
composed from the registry; `#proto` runs the pod pipeline; `#presentation` emits a
`PresentationPayload` to the separate `:5014` renderer. Every artifact grounds on the manifest, not
RAG. **Verdict:** aligned and implemented; the theme-overview/detail Figma twins were the latest
addition (2026-06-23).

## Stage 7 — Self-improvement (self-recursive + user-influenced)

**Self-recursive (mostly gated):**
- **SkillOpt offline pipeline** (`scripts/skillopt-batch.sh`, `npm run skillopt:*`): extract rollouts
  (Meta-Harness, full traces) -> build training set -> per-skill train -> **`validate-candidate.py`
  held-out gate** -> auto-promote on PASS. GATED.
- **Trace + quality** (`services/traceRecorder.ts` ring buffer; `services/qualityFrontier.ts` Pareto
  evaluator, 15 dimensions, `decide()` epoch gate = RHO S>0; `services/emitDeliverable.ts` wrapper).
- **`epoch-proposer` skill** (one bounded edit per epoch, gated via `goldenSetRunner`),
  **`cross-engagement-pattern-miner`** -> `wiki/synthesis/cross-engagement-patterns.md` injected into
  every generation, **`scripts/benchmark.mjs`** (6-phase regression gate vs `benchmark-baseline.json`).

**User-influenced (mostly gated):**
- **Edit-learning** (`services/promptImprovementEngine.ts`): `logEdit` -> `detectPatterns` (5+
  similar) -> **`constraintQualityGate.evaluateConstraint()`** -> auto-approved constraint;
  `getActiveConstraints()` gates again at injection (master-rule + stub filters). GATED.
- **FeedbackWidget** -> `classifyMessage` -> `logChatFeedback` -> high-confidence rule persists
  durably to `wiki/synthesis/learned-constraints.md`. GATED on import + injection.

### CRITICAL FINDING — the one ungated loop (root cause confirmed in code)

`services/learningEngine.ts` `applySkillPatch()` (L352-385) -> `patchSkillFile()` (L387) ->
`patchSkillContent()` (L405) -> `POST /api/skill/write` **writes an LLM-synthesized "under-80-word"
patch directly into a live `SKILL.md` with NO `evaluateConstraint()` gate.** The sibling
`applyConstraint()` path *does* gate (L332). This is the only self-improvement writer that bypasses
the gate.

**Observed damage:** `.claude/skills/deck-narrative-composer/SKILL.md` (uncommitted working-tree
change, version bumped 1.19 -> 1.27) has ~8 auto-appended "learned behavior" entries dated
2026-06-22/23 that are **truncated mid-sentence and near-duplicates** ("...with comprehensive",
"Strictly adhere", "...framework with"). This is precisely the SkillOpt drift principle 3 + the GATE
meta-principle exist to prevent, and the drift the memory warned was the prime slop suspect.

**Durable fix (no stopgap):** gate `applySkillPatch` exactly like `applyConstraint` — call
`evaluateConstraint(candidate.payload)` before `patchSkillFile`, reject on `!accept`; additionally
require the patch be a complete sentence (no trailing-conjunction / no truncation) and dedupe against
existing learned-behavior entries by normalized key. Then hand-clean the corrupted skill file (revert
the uncommitted appends) and audit every `skills/*/SKILL.md` for the same rot. This belongs in the
plan below because the integration of any external learning machinery MUST land behind this gate.

---

# PART 2 — EXTERNAL REPO EVALUATION (objective)

The judging lens (from Part 1): **(a)** Does it add value the vision wants? **(b)** Does it respect
ONE grounding chokepoint / anti-RAG / never-duplicate / converge-don't-build-new? **(c)** Does it
avoid re-introducing embedding-RAG as a primary path or an alien runtime?

## Repo A — last30days-skill (mvanhorn)

**What it is:** a multi-platform, recency-windowed (30-day) research agent. Resolves a topic to
entities, fans out in parallel to Reddit, X, YouTube, TikTok, Hacker News, **Polymarket**, GitHub,
Bluesky, etc., scores by real engagement (upvotes, likes, transcript mentions, prediction-market
odds, star/PR velocity), merges clusters across platforms by entity overlap, and synthesizes a cited
brief. Ships as a Claude Code skill + MCP bundle + Agent-Skills plugin. Python 3.12, yt-dlp, a
vendored Node "Bird" client for X, optional ScrapeCreators/Brave/Perplexity keys, SQLite for
watchlists. MIT.

**Honest fit assessment:**

| Dimension | Verdict |
|---|---|
| Multi-source social fan-out | HiC ALREADY HAS THIS (reddit-deep, YouTube+Whisper, RSS, web). Duplicate. |
| NEW connectors HiC lacks | **X, TikTok/IG, Hacker News, Polymarket (prediction-market odds), GitHub velocity, Bluesky** — genuinely additive. Polymarket odds are a uniquely strong, hard-to-fake relevance signal HiC has no analogue for. |
| 30-day recency window as a first-class axis | **Additive.** HiC stores recency in frontmatter but has no "last-N-days" collection/retrieval mode. |
| Engagement-scoring as a cross-platform relevance signal | **Additive,** and complements MMR/key-term ranking. |
| Its synthesis/brief layer | **REJECT.** HiC has its own anti-RAG manifest grounding + citation contract + slidePostProcessor. Adopting last30days' synthesis would create a second grounding path (violates ONE chokepoint, principle 6). |
| Running it as an MCP the model queries | **REJECT** for the same reason — parallel grounding. |
| Runtime/legal | **VERIFY (low confidence).** The X "Bird" client and ScrapeCreators scraping carry ToS/legal exposure and paid-credit cost; must be assessed before adopting those specific connectors. |

**Net verdict: PARTIAL ADOPT — as collection inputs only.** Wrap the *connectors* (and the
recency-window + engagement-score concepts) as new HiC proxy SOURCE entries that feed the existing
`wiki -> chunk -> manifest` pipeline. **Do not** adopt its synthesis layer or run it as a parallel
brain. **Gate behind the Reddit-skew fix first** (adding more social collection before fixing the
source-type quota would worsen the documented P0).

## Repo B — GBrain (Gary Tan)

**What it is:** a synthesis-augmented retrieval system. Markdown files in a Git repo are the system
of record, synced into **Postgres + pgvector**; retrieval is **hybrid (vector HNSW + BM25 + Reciprocal
Rank Fusion + ZeroEntropy reranking + per-query graph signals)**; a **zero-LLM self-wiring knowledge
graph** extracts typed edges (`attended`, `works_at`, `founded`, `mentions`...) and backlinks from
markdown/wikilink syntax on every write; a synthesis layer (`gbrain think`) returns a cited answer
**plus gap analysis** ("what the brain doesn't know yet"); a background **"dream cycle"** does dedup,
contradiction surfacing, salience scoring. MCP server (30+ tools), schema packs with audited schema
evolution, multi-user federation. TypeScript/Bun, Postgres/PGLite, pgvector, OpenAI/ZeroEntropy/Voyage
embeddings.

**Honest fit assessment — this one cuts directly against a core principle, so be precise:**

| Component | Verdict |
|---|---|
| **Postgres + pgvector + hybrid (vector/BM25/RRF/rerank) retrieval engine** | **HARD REJECT.** This IS the embedding-RAG-as-primary-path that principles 6 + 8 explicitly reject and the meta-principle is actively DELETING. Adopting it would re-introduce the legacy parallel HiC spent months removing, and add an alien runtime (Bun + Postgres). Non-negotiable. |
| **Running GBrain as the memory MCP the model queries** | **REJECT** — creates a second grounding chokepoint parallel to the manifest. |
| **Zero-LLM typed-edge graph auto-wiring + backlink maintenance over markdown** | **ADOPT THE PATTERN.** This is doctrine-aligned (markdown system of record, zero-LLM, model reads files) and maps onto HiC's `knowledgeGraphBuilder.ts` + the `[[wikilink]]` convention + the documented 17,775-broken-link backlog the `wiki-curator` chases. A deterministic link/backlink wirer fixes rot at the source. |
| **Gap-aware synthesis ("what the brain doesn't know yet")** | **ADOPT THE PATTERN (converge).** Maps onto HiC's `evidence-density-pre-checker` skill + `reinforcement-inference` (uncertainty-triggered re-ask) + `contradiction-finder`. A first-class "corpus gap" signal before generation is vision-aligned; build it as a native retrieval-time output, not via GBrain's engine. |
| **Dream-cycle background enrichment (dedup, contradiction, salience)** | **ADOPT THE PATTERN (schedule).** This is literally the SCHEDULE meta-principle: HiC already has `wiki-curator`, `cross-engagement-pattern-miner`, the manifest-reconcile loop. GBrain validates formalizing + scheduling them; its `contradiction-detection eval` maps to `contradiction-finder`. |
| Multi-user federation / OAuth / BullMQ queue | OUT OF SCOPE — operational overhead, no vision need. |

**Net verdict: SELECTIVE PATTERN ADOPT, HARD REJECT OF THE ENGINE.** GBrain is an excellent
reference implementation of three patterns the vision already wants (zero-LLM typed graph, gap-aware
synthesis, scheduled enrichment), but its core retrieval engine is the exact architecture HiC's
anti-RAG doctrine forbids. Extract the patterns as native HiC primitives converged onto existing
chokepoints; import none of the engine.

---

# PART 3 — IMPLEMENTATION PLAN (Verbalized Sampling + Reinforcement Inference)

## VS pass — candidate integration architectures (VS-CoT, k=5, moderate-tail)

<vs_thinking>
MODAL answer the obvious reviewer reaches for: "Install both repos as MCP servers and let the model
query them as extra brains." This is the highest-probability, lowest-insight answer and it is WRONG
for HiC: it creates parallel grounding paths (violates ONE chokepoint), re-introduces embedding-RAG
(violates anti-RAG), and bolts on alien runtimes (violates converge-don't-build-new). Name it, mark
it high-probability, and reject it.

Evidence pointing AWAY from the modal answer: the meta-principle ("converge/delete, reach for NEW only
after confirming the primitive doesn't exist"); the no-stopgaps mandate; the fact that HiC already has
the collection fan-out, the graph builder, the curators, and the gap-checker skill. So the real design
space is "how much do we EXTRACT vs IMPORT, and in what SEQUENCE relative to the known Reddit-skew P0
and the ungated-skill-patch bug."
</vs_thinking>

| # | Frame | Candidate architecture | p |
|---|---|---|---|
| 1 | convention-honoring (REJECT) | Install last30days + GBrain as MCP servers; let Opus query them alongside the manifest. | **0.42** |
| 2 | partial-import | Import last30days connectors wholesale into the proxy; mount GBrain (PGLite) as a side store the curators sync to. | 0.18 |
| 3 | **shifted-frame (RECOMMEND)** | **Extract patterns, not engines.** Wrap last30days *connectors* as native proxy SOURCE entries feeding the existing manifest (gated behind a Reddit-skew quota fix); uplift `knowledgeGraphBuilder` with GBrain's zero-LLM typed-edge + backlink wiring; build a native "corpus gap" retrieval-time signal (converge evidence-density-pre-checker + RI); formalize the curators as a scheduled "enrichment cycle". Import zero foreign runtime. | 0.16 |
| 4 | radical-reinterpretation | Adopt NOTHING as code; treat both repos purely as design references and write three native HiC primitives (recency-windowed engagement collection, deterministic typed-graph wirer, gap-aware retrieval) from scratch on existing chokepoints. | 0.06 |
| 5 | sequencing-first | Same as #3 but make the FIRST shipped change the two defects the integration would otherwise amplify (source-type collection quota + the ungated skill-patch gate), so the new machinery lands on a fixed foundation. | 0.05 |

**COMMIT: a blend of #3 (the architecture) sequenced by #5 (fix the foundation first).** Rationale:
#3 is the only candidate that honors every principle (ONE chokepoint, anti-RAG, never-hardcode-alien,
converge-don't-build-new) while still capturing the genuine value (new connectors, the typed graph,
gap-awareness). #5 prevents the integration from worsening the two known defects. #1 is rejected on
record despite being the obvious move.

## The committed plan (phased, each phase gated)

### Phase 0 — Fix the foundation the integration would otherwise amplify (do FIRST)
- **0a. Gate the skill-patch loop.** In `services/learningEngine.ts` `applySkillPatch()`, call
  `evaluateConstraint(candidate.payload)` before `patchSkillFile`; reject on `!accept`; add a
  completeness check (reject trailing-conjunction/truncated patches) + dedupe by normalized key.
  Hand-clean `deck-narrative-composer/SKILL.md` (revert the uncommitted truncated appends) and audit
  all `skills/*/SKILL.md`. *Gate:* `npm run typecheck` + vitest green; a unit test that a truncated
  patch is rejected.
- **0b. Source-type collection quota.** Make `SOCIAL_MAX_FRAC` (and an upstream collection-volume
  balance) a hard floor for non-social evidence at chunk admission, per
  `research-run-failure-analysis-2026-06-18` P0. *Gate:* `scripts/benchmark.mjs` THEMES phase shows
  external-citation share rise on a Reddit-heavy fixture.

### Phase 1 — last30days connectors as native proxy sources (collection inputs only)
- Add new connector types / SOURCES entries for the platforms HiC lacks (priority order by
  value-minus-risk): **Hacker News, GitHub velocity, Polymarket odds** (no scraping/legal risk) FIRST;
  **X / TikTok / IG / Bluesky** only after a ToS + cost review (see RI flags).
- Add a **recency-window** parameter (`since_days`) to `/api/search` and a `last30days` source pack.
- Persist results to `wiki/articles/...` with an `engagement_score` frontmatter field; let the
  existing chunk/manifest/retrieval pipeline ground on them. **No synthesis layer, no MCP.**
- *Gate:* a collected Polymarket/HN item is retrievable via `pickChunksForPrompt` and cites by
  pointer; source-type quota (0b) holds; benchmark DATA_COLLECTION phase green.

### Phase 2 — GBrain pattern 1: zero-LLM typed-edge graph + backlink wiring
- Uplift `services/knowledgeGraphBuilder.ts` (and/or a proxy write-time hook) to extract typed edges
  + backlinks deterministically from `[[wikilink]]` / typed-link syntax on every wiki write — no LLM.
  Reduces the broken-link backlog at the source; feeds the existing knowledge-graph visualization and
  can add adjacency signal to tier-1.5 admission.
- *Gate:* broken-link count (lint pass) drops; graph build is zero-LLM (cost telemetry shows $0);
  vitest for the edge extractor.

### Phase 3 — GBrain pattern 2: native gap-aware retrieval signal (converge, don't add)
- Emit a "corpus gap" object at retrieval time (converge `evidence-density-pre-checker` +
  `reinforcement-inference`): before a hashtag generation, surface what the manifest is thin on, so
  RI can re-ask or the chat can say "the corpus lacks X" honestly (already partly the chat's job).
- *Gate:* RI ledger (`wiki/synthesis/uncertainty-ledger.md`) shows gap-triggered re-asks; no new
  grounding path introduced.

### Phase 4 — GBrain pattern 3: schedule the enrichment cycle
- Formalize the existing `wiki-curator` + `cross-engagement-pattern-miner` + manifest-reconcile into a
  scheduled "enrichment cycle" (dedup + contradiction surfacing via `contradiction-finder` + salience),
  per the SCHEDULE meta-principle. *Gate:* runs on cadence; writes a curator log; no regression in
  benchmark.

## RI pass — confidence self-assessment and what to verify before building

**overallConfidence: medium.** The architecture (extract patterns, reject engines, converge on
chokepoints) is high-confidence because it falls directly out of the written vision. The
*implementation specifics* carry real uncertainty that must be resolved by inspection before coding:

- **leastDefensibleClaims:**
  1. *last30days connectors are cleanly extractable.* (low-medium) — I evaluated the README, not the
     source. **VERIFY:** read `mcp/` and the platform clients; confirm a connector can be lifted
     without dragging in its synthesis engine or SQLite store.
  2. *X / ScrapeCreators connectors are safe to adopt.* (LOW) — ToS, legal, and paid-credit exposure
     unassessed. **VERIFY before Phase 1 social connectors;** default to HN/GitHub/Polymarket
     (key-light, low-risk) first.
  3. *knowledgeGraphBuilder.ts cleanly accepts a zero-LLM typed-edge wirer.* (medium) — I mapped it
     from the docs, did not read the file end-to-end. **VERIFY:** read it before Phase 2 scoping.
  4. *GBrain's graph approach meaningfully beats HiC's current builder.* (medium) — GBrain's published
     P@5/R@5 numbers are on its own 240-page corpus, not HiC's wiki. **VERIFY:** prototype on a real
     engagement before claiming the uplift.
- **rationale:** The plan's *direction* is dictated by the vision and is safe; the *cost/legal/extraction*
  facts for specific connectors and the exact graph-builder seam are the shaky parts and are explicitly
  deferred to a verify-before-build step rather than asserted.

**This plan does not authorize any code.** Phase 0 (the gate fix + skill cleanup) is the highest-value,
lowest-risk first move and is recommended for approval ahead of the external-repo phases.

---

# PART 4 — PROMPT CACHING END-TO-END + EFFICIENCY DIMENSIONS FROM THE REPOS

## 4.1 The implemented prompt-caching stack (grounded in `proxy/app.py` + `services/costMeter.ts`)

HiC's caching is a deliberate multi-layer stack, ordered cheapest-reuse-first. Per AI request the
order is: **exact-match -> semantic -> provider-prefix -> call -> store.**

| Layer | Where | Mechanism | State |
|---|---|---|---|
| **L1 exact-match (skip the call entirely)** | `proxy/app.py` L8975-9150; wired in anthropic L9386/9467, gemini L9497/9618, openai L9717/9759 | Content-addressed SHA-256 over provider+model+system+messages/contents+tools+schema+max_tokens (`_ai_exact_cache_key` L9096). **Only deterministic calls** (`_request_is_deterministic` L9072: anthropic absent/0 ok since Opus strips temp; openai/gemini require explicit 0). Hit replays stored response with `_hic_exact_cache_hit:true`. | **ON** (`EXACT_CACHE_ENABLED=1`, TTL 3600s, cap 512) |
| **Cross-worker sharing** | `_cache_db` L9015 | Proxy runs **4 uvicorn workers** -> per-process dicts never hit across round-robin. Backed by a **shared SQLite (WAL) `.ai_cache.db`** on the wiki volume so all 4 workers + restart warm-starts share one store. | ON |
| **L2 semantic (skip near-duplicate calls)** | L9203-9300 | Cosine over `provider|model|corpus_version|sha(system)` buckets, threshold 0.97, marks hit as `_hic_exact_cache_hit` ($0). | **DORMANT** (`SEMANTIC_CACHE_ENABLED=0`) — shipped real + flippable, off because exact-match captures most value and 0.97-similar != identical (correctness risk). |
| **L3 Anthropic prefix `cache_control`** | `_inject_anthropic_cache_control` L9318 | Up to 2 ephemeral breakpoints (last tool + system block), min ~4000 chars (~1024 tok), **1h TTL default** (`ANTHROPIC_CACHE_TTL=1h`). HiC's stable-grounding-in-system / dynamic-turn-in-messages shape is exactly the prefix caching wants. | ON |
| **L3 OpenAI** | L9707 | `prompt_cache_key` injected for prefix reuse. | ON |
| **L3 Gemini** | costMeter L187-194 | Native implicit/explicit context cache; `cachedContentTokenCount` read back for cost. | native |
| **Tool/result cache** | L9159-9201; wired `/api/wiki/fetch-articles` L12138/12406 | Keyed on tool name + **`_corpus_version()`** + args -> corpus drift auto-misses. | ON |
| **Embedding query cache** | `_query_embed_cache_*` L2096-2128 | Caches query-embedding vectors by text+provider+dim. | ON |
| **Cost accounting** | `services/costMeter.ts` L59-212 | Prices `cacheRead` (~0.1x), `cacheWrite` (anthropic ~1.25x premium), books **$0 on exact-cache hit**, tracks `costNoCacheUSD` vs `costUSD` so the saved delta is reportable. | ON |
| **Observability** | `GET /api/ai/cache-stats` L12016 | Reports every layer's hits/misses/stores + config. | ON |

**Verdict on prompt caching: essentially complete and production-grade on the LLM-call-cost axis.**
All three provider prefix mechanisms are wired, an app-level skip-the-call exact layer sits above them
(correctly cross-worker via shared SQLite), the cost meter quantifies the savings, and there is a stats
endpoint. The only deliberately-unused layer is semantic (dormant by design). There is no obvious gap
on the *prompt-caching* axis itself.

## 4.2 Do the repos offer NEW efficiency dimensions? (honest)

Prompt caching optimizes ONE axis: **the input-token cost of an LLM call you still make** (plus
skip-the-call on identical/near requests). The repos contribute little to THAT axis, but they surface
adjacent efficiency axes HiC has only partially exploited. Corrected for two facts verified in code:
HiC's `knowledgeGraphBuilder.ts` is **already non-LLM**, and HiC **already has ETag-conditional delta
collection** for the YouTube channel scheduler (`_poll_single_channel`).

| Efficiency axis | HiC today | Repo source | New? | Honest call |
|---|---|---|---|---|
| Input-token reuse / skip-call / tool cache | ✅ complete (4.1) | — | No | Nothing to gain from the repos here. |
| Turn on semantic near-dup cache | ⚠️ dormant 0.97 | GBrain's hybrid retrieval (mild validation that near-match reuse has value) | No | Keep dormant unless cost telemetry shows exact-match miss-rate is high; the doctrine rightly fears serving 0.97-similar-but-wrong. |
| **Collection-side delta caching (don't re-fetch the window; fetch only the delta + persist a watchlist)** | ⚠️ partial — ETag/last-seen exists ONLY for YouTube channels (`_poll_single_channel` L8634) | **last30days `--store` + watchlist + briefing delta** | **YES (generalization)** | **Best genuinely-new efficiency win.** Generalize conditional-GET (ETag/If-Modified-Since) + a last-seen watermark + persisted watchlist across RSS/REST sources and the recency window. Saves external fetches + ingest + embedding compute (NOT LLM tokens) on repeated/scheduled runs. Composes with content-hash dedup. |
| **Idle-time precompute (move cost off the interactive hot path)** | ✅ partial — manifest-reconcile loop (1800s) | **GBrain "dream cycle"** + last30days scheduled briefings | partial | Extend the existing scheduled-curator pattern to precompute graph edges / gap analysis / salience during idle so interactive generation is faster. Amortization, complements caching. |
| **Two-tier cheap-retrieval vs expensive-synthesis (zero-LLM default path)** | ✅ partial — manifest pre-rank is CPU-only/zero-LLM | **GBrain `search` (no LLM) vs `think` (LLM)** | partial | Formalize "answer from zero-LLM manifest retrieval first; only escalate to a generation call when synthesis is actually needed." Saves whole calls on lookup-class chat turns (overlaps open-item #2 in the handoff: sub-15s plain chat). |
| Zero-LLM graph/link building | ✅ ALREADY non-LLM (`knowledgeGraphBuilder.ts`, verified) | GBrain zero-LLM typed edges | **No (efficiency)** | Correction to earlier assumption: HiC already avoids LLM here, so there is NO compute saving. GBrain's graph value is QUALITY (typed edges + backlinks), not efficiency. Keep it in Phase 2 as a quality uplift, not an efficiency one. |
| Rerank-for-tighter-context (fewer input tokens into generation) | ❌ MMR diversity only, no reranker | GBrain RRF + ZeroEntropy rerank | YES but **doctrine tension** | A reranker that shrinks the context to fewer high-signal chunks would cut input tokens, but it is embedding-RAG-adjacent (the path anti-RAG forbids as a PRIMARY grounder). FLAG, do not recommend; if ever pursued it must stay subordinate to manifest pointers, never replace them. |

**Bottom line for the user's question:** the repos add **nothing to prompt caching itself** (HiC's stack
is already complete there). Their genuine efficiency contribution is on **adjacent axes** that caching
does not touch: (1) **collection-side delta caching** (last30days watchlist/ETag — the strongest new
win, and it slots into Phase 1 of the integration plan above), (2) **idle-time precompute** (dream
cycle — extends Phase 4), and (3) **a formal zero-LLM-retrieval-before-synthesis tier** (search-vs-think
— pairs with the handoff's sub-15s-chat open item). The GBrain zero-LLM-graph idea is NOT an efficiency
gain (HiC already builds its graph without an LLM); it stays a quality uplift. The reranking idea offers
token savings but is rejected on doctrine grounds.

These fold into the phased plan: **delta-collection -> Phase 1** (with the connectors),
**search-vs-think tier -> a new Phase 1.5** (cheap before expensive), **dream-cycle precompute ->
Phase 4**. None require importing either repo's engine.

# PART 5 — PERPLEXICA EVALUATION (cost-savings lens, 2026-06-24)

Repo: https://github.com/BunsDev/perplexica-search-engine-ai (a "Vane"-rebranded fork of
ItzCrazyKns/Perplexica). MIT. TypeScript/Next.js + Drizzle ORM + Docker.

## What it is
An open-source AI search engine (Perplexity alternative): web search via **SearXNG** (free,
self-hosted metasearch over Google/Bing/DuckDuckGo/etc., no API key) -> embeddings + similarity +
rerank -> an LLM synthesizes a **cited answer**. LLM providers: Ollama (local/free), OpenAI,
Anthropic, Gemini, Groq, any OpenAI-compatible. Smart modes (Speed/Balanced/Quality), focus modes
(web/academic/discussions). Exposes an `/api/search` endpoint. Fully self-hostable with $0 cloud cost
when paired with local Ollama.

## The cost reality it would address (grounded in proxy/app.py)
- HiC web search/body-fetch today = **Jina Reader free tier** (the `jina` + 199 `web_search`
  connectors) + **Google News RSS** (`news.google.com/rss/search?q=site:X`) + 200+ free
  REST/RSS/CKAN/arXiv sources.
- **There are NO Brave / Tavily / SerpAPI / Exa / Jina API keys in the pipeline** (grep clean).
  **HiC already pays $0 for web search.** The only "cost" is Jina free-tier RATE LIMITING (the
  documented "backing off Jina Reader for 60s per-process" cascade) - a throughput/reliability cost,
  not a dollar cost.
- The one place a paid search key appears is `TAVILY_API_KEY` in **NXT-Agency** (optional, cowork
  agent web search) - not HiC's research pipeline, and Tavily has a free tier.
- HiC LLM spend is already cache-optimized (Part 4) and deliberately uses premium models
  (Gemini/Claude/Opus) for quality per the vision.

## Verdict: NOT worth pursuing for cost savings. Hard-reject the app; narrow conditional on SearXNG.

| Dimension | Finding |
|---|---|
| **Direct cost savings** | **~$0.** The thing Perplexica replaces (paid search) is a cost HiC does not have. Its Ollama-local LLM option can't cut HiC's LLM cost without tanking deliverable quality (the vision mandates premium models for hashtag artifacts; cache stack already optimizes spend). |
| **Architecture vs vision** | **HARD REJECT the app.** Perplexica IS a RAG synthesizer (web -> embeddings -> rerank -> LLM cited answer) - the embedding-RAG-as-primary-grounding pattern principles 6+8 explicitly reject (same verdict as GBrain's engine). Adopting it = a 2nd grounding path + a 2nd chat + a 2nd Next.js/Drizzle stack = violates ONE-chokepoint + converge-don't-build-new. |
| **Extractable component (SearXNG)** | **Conditional MAYBE - on reliability, NOT cost.** SearXNG as a free, keyless metasearch CONNECTOR feeding the manifest could (a) remove the Jina free-tier rate-limit cascade and (b) help the hub-page collection gap (find real articles via metasearch instead of a dead `static_url` landing page, e.g. the KPMG case). But it ADDS a self-hosted container (RAM/CPU/maintenance) and SearXNG itself gets throttled/blocked by the engines it scrapes - so it trades a free-but-rate-limited dependency for a self-hosted-but-also-throttleable one. HiC already has 199 web_search connectors, so this is an alternative backend, not a new capability. |
| **Operational cost** | Pursuing the app = MORE infra (Next.js app + Drizzle DB + SearXNG + optional Ollama), the opposite of a saving. |

**Recommendation (RI-calibrated, confidence: high on the verdict, medium on the SearXNG upside
magnitude):** Do **not** adopt Perplexica. The cost premise does not hold - HiC's search is already
free and its LLM cost is already optimized. The only piece worth a *future* spike is **SearXNG as an
optional fallback/alternative search backend**, and that decision should be made on **reliability
grounds** (is the Jina 60s back-off actually starving collection? - measure it first) not cost. If
collection reliability is the real pain, a SearXNG connector is a small, doctrine-aligned add (like
the Lobsters/Bluesky connectors) that also helps the parked static_url hub-page problem - but it is a
reliability/breadth play, explicitly not the cost-savings play the goal asked about.

**What to verify before any SearXNG spike:** the actual frequency/impact of the Jina rate-limit
back-off in real runs (proxy logs), and whether self-hosted SearXNG's own throttling by Google/Bing
nets out better than Jina free-tier for HiC's query volume.

## Appendix — file:line index used in this analysis

- Vision: `.claude/UNIFIED_VISION.md`; output canon `.claude/CLAUDE.md`.
- Collection: `proxy/app.py` L190-520, L2452, L7095-7800, L8088-8191, L11002-11140, L11719-11801;
  `proxy/healthcare_sources.py`; `services/researchFabricOrchestrator.ts` L131, L1102-1291.
- Theme/cluster: `services/geminiService.ts` `generateThemes`; `proxy/topic_modeling.py` L439-520;
  `services/topicModelService.ts`.
- Chunk/manifest: `services/chunkRetrieval.ts` L141-281, L361-631, L654-682, L857-938, L1036-1080;
  `services/multiModelResilience.ts` L77-100.
- Registry/Figma: `hic-workspace/wiki/brand/figma-node-map.md`; `plans/figma-audit/registry.json`;
  `services/figmaRegistryParity.test.ts`; `services/slideComposer.ts`; `components/slideTemplates/{types.ts,goldPreviews.tsx,pptx.ts}`;
  `services/slideToStageHtml.ts`; `services/prototypeBuilder.ts` L36-84, L737-810, L1089-1110, L1372.
- Chat: `services/corpusChatService.ts` (`sendChatMessage`, `routedModelFor` L570-602, force-route
  L3120-3133, grounding L1674+); `design-desk/DesignDeskChat.tsx` L52-76, L259-282;
  `components/ChatProse.tsx`; `services/slidePostProcessor.ts` `scrubChatReplyMeta` L727-775.
- Self-improvement: `services/learningEngine.ts` L232-317, **L352-385 (ungated)**, L387-420, L444;
  `services/promptImprovementEngine.ts`; `services/constraintQualityGate.ts`;
  `services/qualityFrontier.ts`; `services/traceRecorder.ts`; `services/emitDeliverable.ts`;
  `scripts/skillopt-batch.sh`; `scripts/benchmark.mjs`; `.claude/skills/{epoch-proposer,cross-engagement-pattern-miner}/SKILL.md`.
