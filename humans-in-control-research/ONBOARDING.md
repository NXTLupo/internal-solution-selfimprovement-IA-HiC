# HiC Research — Engineering Onboarding & Architecture Guide

A complete orientation to the **Humans-in-Control (HiC) Research** application for engineers
new to the codebase. Covers what the app does, its architecture, every pipeline, the
feature surface, and the load-bearing-vs-legacy reality (the code has accreted; doc-comments
often describe *intent*, not what runs — this guide flags that throughout).

> Companion docs: `CLAUDE.md` (this dir, dev commands + conventions), the repo-root
> `CLAUDE.md` (Docker topology), `.claude/CLAUDE.md` (output-quality rules), and
> `plans/harness-architecture-audit-2026-06-02.md` + `plans/harness-kpi-accountability-2026-06-02.md`
> (the gap audit + KPI contract this guide's "Known Issues" summarizes).

---

## 1. What HiC Is (in one paragraph)

HiC turns a research brief + uploaded documents into **consulting-grade deliverables**
(themes, personas, recommendations, strategy decks, journey maps, service blueprints,
competitive analyses, roadmaps, PRDs, prototypes, presentations). A user states a goal,
HiC gathers evidence from 200+ external sources, scores and assembles it into one corpus,
analyzes it (LLM theme extraction + statistical topic modeling), and generates branded
artifacts — all steered conversationally through **two AI chats** rather than a wizard.
A persistent markdown "second brain" (the wiki) compounds knowledge across engagements.

## 2. Architecture at a Glance (three tiers)

```
┌─ React 19 SPA (Vite) ─ port 3000 dev / 5011 prod nginx ─ NO src/ dir, flat layout
│    App.tsx (5,814-line state machine) · CorpusChatPanel (Analyst chat) ·
│    AnalystDeskKnowledgeGraph (dashboard) · design-desk/ (Designer window)
│        │  fetch()  (browser never calls a provider/source directly)
│        ▼
├─ Research Proxy (FastAPI) ─ proxy/app.py (~13,900 lines) ─ port 5012 ─ SOURCE-MOUNTED
│    /api/ai/* provider fan-out · /api/search/* 200+ connectors · /api/wiki/* RAG ·
│    /api/artifact/* generation+export · /api/topic-model/* clustering
│        │
│        ▼
├─ External sources (OpenAlex, GDELT, RSS, Reddit/PRAW, arXiv, YouTube, jina, …)
├─ hic-workspace/wiki/ (markdown second-brain + sqlite-vec embedding store)
└─ Sibling services: journey-mapper (canonical journey/blueprint renderer),
     presentation-renderer :5014 (#presentation), social-research-backend :8081
     (RoBERTa sentiment via /api/sentiment/score)
```

**Two deploy realities to internalize day one:** the SPA at `:5011` is a **static nginx
dist — a code change needs a full Docker rebuild + hard refresh**. The proxy at `:5012` is
**source-mounted — a restart picks up changes** (force-recreate + clear `proxy/__pycache__`
for stubborn stale `.pyc`). Mixing these up is the #1 "my change isn't showing" cause.

## 3. The End-to-End User Journey (state machine)

`App.tsx` drives `AppState: IDLE → ANALYZING → SUCCESS` (`App.tsx:1137`):
1. **IDLE — brief intake** (`App.tsx:5039`): research goal, subreddits, file upload,
   source-pack selection, resume-prior-engagement. (`'heuristic'` mode swaps in a UX-brief intake.)
2. **ANALYZING** (`App.tsx:5646`): renders `LiveResearchBoard` — the live source feed, the
   **Analyst Desk** dashboard, and the docked Analyst chat. Data collection + the synthesis
   chain run inline here; the user is never navigated away.
3. **SUCCESS** (`App.tsx:5760`): renders `ChatWorkbench` (research) or `HeuristicReportView`.

Deliverables are produced two ways (see §5): the **staged synthesis chain** (auto, on data-
collection complete) and **chat hashtag directives** (on demand). The product is chat-first.

---

## 4. Frontend & UI Surfaces

The SPA is mounted from `index.tsx` (one branch: `?designer=1` renders the standalone
Designer window, else `<App/>`). `App.tsx` is the root state machine; a console boot banner
stamps the bundle version so you can confirm a fresh build.

### The two chat surfaces (the heart of the UX)
- **Analyst Desk chat — `CorpusChatPanel.tsx` (7,848 lines), `chatSurface:'analyst'`.** The
  primary interface: a right-docked slide-in panel grounded in the full corpus. Deliverables
  are driven by **hashtag directives** typed in chat (`#recommendations`, `#proto`,
  `#presentation`, `#gap`, `#strategy`, …). Mounted both in `LiveResearchBoard` and at the
  IDLE level.
- **Designer chat — `design-desk/DesignDeskChat.tsx` (657 lines), `chatSurface:'designer'`.**
  Launched in a **separate browser window** (`window.open('?designer=1')`); generates/revises
  the on-canvas artifact via the `/api/artifact/*` engine. Cross-window artifact sharing via
  the localStorage-backed `designDeskStore` (pop-up blockers silently break it).

### The Analyst Desk dashboard — `AnalystDeskKnowledgeGraph.tsx` (2,316 lines)
Two tabs: **`kg`** (a "Newsmap": metric tiles → D3 theme treemap sized by
`evidenceCount × goalAlignment` + a detail panel; clicking a source chip reverse-pivots the
treemap) and **`topics`** (`TopicModelingPanel.tsx` — BERTopic-style clusters as
sentiment-grouped cards). Recent fixes: readable treemap tiles (no blank boxes, overflow tile
for >N themes), wall-to-wall sizing, accessible tabs.

### Human feedback capture
Captured **implicitly from chat turns**: every send on both surfaces fire-and-forgets
`classifyMessage(query, lastAiReply, surface)` → `logChatFeedback` (Analyst
`CorpusChatPanel.tsx:4648`, Designer `DesignDeskChat.tsx:274`). Explicit feedback comes from
`FeedbackWidget.tsx` (thumbs/stars + "Apply now"). `GenerationReceipt.tsx` shows a per-
deliverable provenance footer.

### Frontend gotchas
- **`AnalysisCheckpoint.tsx` (2,443 lines) is effectively legacy** — renders only when
  `activeStage !== IDLE` (`App.tsx:5705`), which the live chat-driven flow never sets. The
  old 17-stage checkpoint pipeline is gone; **there are no checkpoints** in the product.
- **`ResultsView.tsx` (2,561 lines) is imported but never rendered** — the old full-page
  deliverable viewer, dead in the chat-first flow.
- **`AppState.WORKBENCH` is unreachable** — render branch exists, never set.
- `ChatWorkbench` (SUCCESS) ≠ `CorpusChatPanel` (Analyst) — different parsers, don't confuse.
- Both KG components depend on a **global `d3`** (`declare const d3`), loaded externally.

---

## 5. Analysis & Generation Engine

**Two distinct engines that newcomers constantly confuse — they share NO generation code:**

1. **Staged synthesis chain** — `GenAISession` in `geminiService.ts` (6,172 lines), invoked
   **only** from `App.tsx`. The heavyweight pipeline: themes → personas → recommendations →
   deck/blueprint/etc.
2. **Chat path** — `corpusChatService.ts::sendChatMessage` (4,335 lines), driven by
   `CorpusChatPanel`. Hashtag-routed, single-LLM-call, emits inline `:::slide` fences.

> A `#themes` typed in chat does **NOT** run `generateThemes`; it loads the `theme-analyst`
> skill into a chat prompt. Editing one engine does nothing for the other.

### Theme generation (`generateThemes`, `geminiService.ts:833`) — the elaborate path
1. **Multi-angle archive augmentation** — decompose goal into 3-4 angles, fetch goal-fit wiki
   chunks per angle, build a ≤220KB cross-engagement evidence block.
2. **Cluster grounding** — await the topic-model job (bounded 90s), instruct that every
   populated cluster maps to a theme (makes themes empirical, not free-associated).
3. **Breadth pass** — one-shot `gemini-3.1-pro-preview`, `temperature:0, seed:42`
   (determinism-first); falls back to chat Flash → GPT.
4. **Filters/floors** — meta-theme filter, LLM domain-relevance gate, thick-evidence filter
   (≥2 distinct sources), `BREADTH_FLOOR=20` retry, deliverable-aware `TOP_N` cap.
5. **Depth pass** — per-theme parallel fan-out populating subThemes/dimensions/contradictions/
   temporalArc/**`interpretation`** (de-conflated: analytical meaning, NOT recommendations).
6. Embedding goal-alignment rescore → wiki persistence → reproducibility-hash stamp.
   **Title rules** (hardened): a specific tension/finding, never a bucket ("Technology") or a
   solution/product name ("Career Pathing AI") — both hard-banned.

### Hashtag routing
`hashtagRegistry.ts::DIRECTIVES` is the single source of truth. An explicit registered
hashtag's skill **dominates** keyword scoring (`matchSkills`); the matched skill's `SKILL.md`
is concatenated into the prompt. `#proto`/`#presentation`/`#artifact` use dedicated parsers.

### What actually selects the model (important)
**`aiRouter.ts::routeTextAnalysis` is largely dead for Gemini** (its Google branch throws).
Real selection is **hardcoded literals**: synthesis chat session = `gemini-3.5-flash`; theme
breadth/depth = `gemini-3.1-pro-preview`; repetition-collapse fallback = `gpt-5.5`; chat
cross-provider escape = `claude-sonnet-4-6`. Treat `aiRouter`'s `DEFAULT_MODELS`/registry as
documentation, not control flow — **to change a synthesis model, edit the literal in
`geminiService.ts`.**

### Critic / panel / composer
- `criticReviseLoop.ts` — generic generator→critic→revisor (dot-path edits); wired into
  recommendations.
- `artifactExpertPanel.ts` — per-kind expert + hygiene critics; wired into personas/blueprint/
  roadmap/gap. **Skips LLM critics for freeform-HTML artifacts** (path edits corrupt HTML).
- `narrativeComposer.ts` — the `#presentation` path only; tool-using loop → `PresentationPayload`
  → presentation-renderer service (:5014).

---

## 6. Data Gathering, Corpus & The Wiki Second-Brain

HiC's evidence engine. Everything external goes through the proxy; the SPA never calls a
source directly.

### Source selection (deliberately NOT "enable everything")
- `analyticalLensService.ts` picks one of five **lenses** from the goal (fundraising/student/
  digital-product/enterprise-tech/general-cx), shaping persona fields, journey stages, prompts.
- `recommendDataSources()` adds only source *categories* the lens needs, plus goal-regex
  overrides. `researchFabricOrchestrator.ts::generateResearchPlan` maps categories to named
  connectors (`dataSourceConnectors.ts`, ~400 sources, all via `createProxyConnector`).

### Gather → score → enrich → assemble (`researchFabricOrchestrator.ts`, 2,153 lines)
- **Query refinement** with a hallucination guard (fidelity ≥0.35 or fall back to verbatim goal).
- **Fan-out** via `Promise.allSettled`; deep-research routes to grounded search; `reddit_deep`
  fetches posts+comments (feeds topic modeling).
- **Relevance scoring** (`filterAndScoreItems`) — body-aware 0-100, batched. **Never drops
  items** — only reorders; selection happens at packing/retrieval.
- **Enrichment** (`enrichTopItems`) — full-text for top ~300; wiki-cache first, then Jina/PDF
  (concurrency 3 — load-bearing, higher trips Jina throttle). Everything usable is archived.
- **Corpus assembly** (`mergeResultsToCorpus`) — uploads first (`CHUNK_001…`), then
  `[CHUNK_NNN] Relevance: NN/100 | … <body>`; >2.5MB → greedy pack by relevance-per-byte.

### The wiki "second brain" (`hic-workspace/`, schema in `AGENTS.md`)
Three layers: `sources/` (raw immutable), `wiki/` (LLM-maintained markdown: frameworks,
anti-patterns, benchmarks, evidence, engagements, synthesis + RAG corpus dirs with thousands
of embedding-indexed articles), and `AGENTS.md` (the schema).
- **Read at gen-time:** `wikiService.ts::loadGenerationContext` (LITE by default: framework +
  anti-patterns + brand + benchmarks; lazy-fetch the rest), injecting engagement goals +
  cross-engagement patterns so prior runs bias new ones.
- **Semantic RAG:** `POST /api/wiki/fetch-articles` (embedding-ranked bodies, goal-blended).
- **Engagement memory:** exact-slug then semantic-overlap match against prior `engagements/*`;
  `wikiCacheLoader.ts` can assemble a full cached corpus for zero-live-collection re-runs.
- **Written after a run:** `ingestResearchRun` (log, proper nouns, evidence, source archive,
  benchmark HYPOTHESIS→VERIFIED auto-upgrade); `wikiCompiler` regenerates synthesis + mines
  cross-engagement patterns; `knowledgeGapFinder` writes gap pages.

### Knowledge graph & citations
`knowledgeGraphBuilder.ts` builds source/evidence/theme/persona/rec/journey/gap nodes; themes
link to sources via name/text/URL matching. **Citation scheme:** `[CHUNK_NNN]`; the **working**
resolver is `slidePostProcessor.resolveCitations` consuming `getChunkSourceMap()`.
**Gotcha:** `citationResolver.ts` is a *stale parallel* implementation whose regex expects
`--- CHUNK_001 ---` block headers that the corpus never emits — it returns an empty map; don't
use it. IDs are 3-pad (`padStart(3,'0')`), so >999 items break 3-digit-assuming parsers.

---

## 7. Proxy Backend (FastAPI, `proxy/app.py`)

Single backend for the SPA; five jobs: provider fan-out, source connectors, wiki RAG, artifact
generation, exports + topic modeling.

### Endpoint map (categorized)
- **Provider proxies:** `/api/ai/{anthropic,gemini,openai,gemini-compat,deepseek}`, `/api/embed`.
- **Search:** `/api/sources`, `/api/source-packs`, `/api/search/{id}`, `/api/multi-search`.
- **Ingestion:** `/api/extract-pdf`, `/api/parse-upload`, `/api/extract-content`,
  `/api/transcribe-youtube` (yt-dlp + whisper).
- **Wiki:** read/write/append/list, `write-article`, `fetch-articles` (RAG entrypoint),
  `rerank`, `regrade-relevance`, embed-backfill/status.
- **Artifact:** `/api/artifact/{generate,revise,audit,view,list,export-slides}`.
- **Topic model:** `/api/topic-model/analyze` (async, returns job_id) + `/status/{id}`.
- **Sibling routing:** `journey-map/*` (journey-mapper service), `presentations/*`,
  `reddit-deep/*`, `cx/*`, `skill/*`, `feedback/*`, `export-pptx`.

### The artifact engine — `/api/artifact/generate` (`app.py:13552`)
1. **Empty-corpus gate** — `_MIN_CORPUS_HARD=800` (refuse + honest "needs corpus" notice),
   `_MIN_CORPUS_SOFT=3000` (generate with a no-fabrication directive). Load-bearing — kills the
   "confident hollow" fabrication class.
2. Skill load (`KIND_TO_SKILL_PATH`) + prompt + learned-constraints injection.
3. **Cross-provider fallback** (`_generate_artifact_with_fallback`) — per-kind chain, health-
   aware (60s cooldown after 429/5xx), returns the model actually used.
4. `_ensure_complete_html` (truncation repair) → `_apply_brand_and_anti_slop` → persist +
   rollout JSON.
- **opus-temperature-400:** `claude-opus-4-[789]` reject `temperature` (400). All Anthropic
  call sites omit it for those models (they're deterministic by default). This bug previously
  failed every Opus call silently — don't reintroduce `temperature` for opus.
- **Brand injection** (`nxt_design_system.py`): fonts + CSS + grid system; a Python whitening
  pass flips model-emitted dark panels to white (NXT); NU keeps intentional dark frames and
  swaps the wordmark to NORTHEASTERN.

### Topic modeling (`topic_modeling.py`)
Embed (OpenAI 1536-d → Gemini 3072-d fallback, content-hash cache, per-corpus provider commit)
→ objective-relevance admission → UMAP→HDBSCAN (`leaf`) → coherence + evidence-density gates →
LLM labels (temp 0, signature cache, degraded names never cached) → **measured sentiment**:
`_apply_weighted_sentiment` batch-scores OP texts through **RoBERTa via social-research-backend
`/api/sentiment/score`**, VADER fallback, OP weighted 70% over comments, computes NSS +
controversy. (RoBERTa replaced VADER because lexicon scoring rated struggle topics positive.)

### Export & QA
- **Editable PPTX/PDF/PNG** (`nxt_slide_export.py`): `parse_frames` → Chromium DOM measurement
  (with serve-time enforcement CSS so export==preview) → every text node a native editable text
  box (zero pictures); legacy/Pillow fallback if Chromium absent.
- **On-demand visual QA** (`artifact_visual_qa.py`): Chromium probes for crush/overflow/overlap/
  meter-misuse. Detection only. **`/api/artifact/audit` only — deliberately removed from the
  generate path** (inline Chromium under load hung the worker and crashed the SPA; do not
  reintroduce inline).

---

## 8. Self-Improvement, Feedback & Quality Subsystem

The most misunderstood area: **three overlapping mechanisms at different maturity levels.**

### Mechanism 1 — chat-feedback → constraint loop (LOAD-BEARING)
Chat turn → `classifyMessage` (`chatFeedbackExtractor.ts`: correction/rejection/rule, density-
preference upgraded to rule) → `logChatFeedback` (`promptImprovementEngine.ts`) →
`detectPatterns` auto-approves a constraint at **5+ edits, 60%+ one direction** →
`getActiveConstraints(kind)` injects a `LEARNED CONSTRAINTS:` block at gen-time. All writes/reads
funnel through **`constraintQualityGate.ts`** (rejects dollar/naked-number mandates that
contradict the Quantitative Claim Rule, dedupes) — **add no constraint path that bypasses it or
the store self-poisons.** Two injectors: SPA (`getActiveConstraints`) + proxy
(`_wiki_learned_constraints_block`, reads the same wiki file — currently ungated).

### Mechanism 2 — explicit feedback + learning pass (WIRED, single path)
`FeedbackWidget` → `feedbackService.submitFeedback` → `triggerLearningPassAfterFeedback` →
`learningEngine.runLearningPass` (clusters feedback by deliverable/section/polarity, 3+ signals
→ constraint/anti-pattern/skill-patch/framework/exemplar/chunk-config). This is the **only**
production caller of `runLearningPass`.

### Mechanism 3 — scoring/discrimination + SkillOpt (PARTIALLY → MOSTLY ORPHANED)
- `improvementDiscriminator.ts` — 8-dimension scorecard + constraint-attribution lineage +
  auto-dismiss of constraints that hurt scores. **One live caller:** `chatToFreeform.ts:1113`
  (freeform HTML only); UI in `ImprovementLineagePanel.tsx`.
- **`deliverableScorer.ts` — a full [0,1] rubric scorer whose docstring says it is "the
  validation signal SkillOpt needs" — has ZERO callers.** This is *why* SkillOpt trains on
  neutral 0.5: the gradient exists and nothing invokes it.
- **SkillOpt is an open loop:** `_maybe_trigger_skillopt` (`app.py`) Popens `run-skillopt.py`,
  but the script path is unreachable inside the proxy container (it returns early); the
  trajectory miner reads `_journey-rollouts/` while the artifact engine writes
  `_artifact-rollouts/`, and rollouts lack `score`/`validation_failures`. Candidates (if
  produced) go to ephemeral `/tmp`. Treat SkillOpt as non-functional until reconciled.

### Wired determinism/resilience layers
`reproducibilityHash` (stamps themes/personas; checked by a Stop hook), `multiModelResilience`
(7 services), `verbalizedConfidence` (8 geminiService sites). `evidenceRecord` is a contract
adopted only by newer Tier-2 services, not the legacy fabric.

### Load-bearing vs orphaned ledger
| Component | Status |
|---|---|
| chat-feedback classify → constraint inject | LOAD-BEARING |
| constraintQualityGate | LOAD-BEARING (don't bypass) |
| FeedbackWidget → runLearningPass | WIRED (single path) |
| improvementDiscriminator | WIRED (freeform HTML only) |
| **deliverableScorer** | **ORPHANED (zero callers)** |
| reproducibilityHash / multiModelResilience / verbalizedConfidence | LOAD-BEARING |
| SkillOpt auto-trigger + trajectory miner | OPEN LOOP (path/dir mismatch) |
| 26 `validate_*.py` Stop hooks | Claude-Code-session-only — **NOT enforced at production runtime** |

---

## 9. Output: Slides, Export, Prototypes & Design-Desk

**Two parallel artifact stacks with DIFFERENT enforcement — internalize this:**
- **SPA stack** → post-processed by `slidePostProcessor.ts` (1,660 lines): markdown strip,
  citation resolution, ~50 meta-narration regexes, **350+ slop phrases**, content budgets,
  structure validation. The real runtime quality chokepoint.
- **Proxy/JM stack** (`/api/artifact/generate`) → post-processed by **much weaker** Python in
  `app.py` (`_SLOP_SUBS` = **17** substitutions + meta/emoji/cite strips). Artifacts generated
  through the proxy do NOT get the 350-phrase treatment.

### The three artifact pipelines
- **`#proto`** — `prototypeBriefGenerator.ts` (2-pass Verbalized-Sampling brief, Opus 4.8) →
  `prototypeBuilder.ts` (decompose → interaction spec → 30 simulated sessions → design system →
  build recipe → code → critic). `experiencePrototypeComposer.ts` forces every UI region to a
  *named* pattern from the 92+ AI Experience Patterns catalog (always-on; skipping it is the
  known "generic Copilot shell" anti-pattern).
- **`#presentation`** — `narrativeComposer` → `PresentationPayload` → presentation-renderer
  (:5014). `presentationToPptx.ts` is a separate bespoke PPTX builder (NOT the 18-template system).
- **`#artifact` HTML** — `design-desk/chatToFreeform.ts` (org/arch/roadmap; **journey + blueprint
  hard-throw and route to the Journey-Mapper service**). Posts to the proxy → weaker enforcement.

### Export
- `exportService.ts` — SPA strategy-deck PPTX (pptxgenjs) + JSON + HTML reports; PDF in
  `ResultsView` (html2canvas→jsPDF).
- **Design-desk export is the most sophisticated:** `artifactExporter.ts` routes `slide` →
  `slidePptxEmitter` (schema-valid by construction) and `freeform` → `domToPptx.ts` (walks
  computed styles + `getBoundingClientRect` to native PPTX rect/oval/line/text/path — every
  element editable in PowerPoint, not a raster). Can POST `RenderSpec[]` to proxy
  `/api/export-pptx` (python-pptx + EOT-wrapped brand fonts).
- **18-template slide system** (`components/slideTemplates/{types,web,pptx}.ts`): `web.tsx`
  (render) and `pptx.ts` (export) must be kept in sync when adding a template.

### Output-stack dead/duplicate code
`artifactExporter._unused_sanitizeText`/`emitGradient` (dead); `TemplateData` union lists only
10 of 18 templates (stale — `SlideTemplate` union is the source of truth); **four separate
truncated-JSON-repair implementations** (chatToArtifact, chatToSlideSpec, prototypeBriefGenerator,
deliverableChunkers) — a consolidation candidate.

---

## 10. Known Issues & Harness Gaps (summary)

Full detail in `plans/harness-architecture-audit-2026-06-02.md`. Five cross-cutting root causes:
1. **Silent degradation** — connector/provider/parse/citation/skill failures return empty-
   success or log-only; a run on 30% of evidence looks healthy.
2. **Non-determinism** — identity-bearing calls (persona names, rec titles, proxy artifacts)
   run temp>0/no-seed; `reproducibility_hash` is corpus-blind (collapses to f(goal)); chunk IDs
   are a position counter over a stochastic sort.
3. **Routers are theater** — three router abstractions are dead; the live engine hardcodes models.
4. **Broken cognitive chain** — `generateRecommendations` never receives the themes/personas its
   prompt claims to review; no shared entity identity across deliverables.
5. **Orphaned self-improvement** — Stop hooks not enforced at runtime, SkillOpt a no-op,
   `deliverableScorer` uncalled, no structured run telemetry (debugging = docker-log archaeology).

Proposed build (see the audit): H1 observability (`RunReceipt`) → H2 determinism → H3 reliability
→ H4 relevance/depth → H5 close the self-improvement loop.

---

## 11. Newcomer Quick-Reference

- **Change the SPA?** Rebuild Docker (`docker compose -f ../docker-compose-all.yml up -d --build
  research-generator`) + hard-refresh. **Change the proxy?** Restart `research-proxy` (clear
  `__pycache__` + force-recreate if stale).
- **Two engines:** chat `#themes` ≠ `generateThemes`. Two feedback chats (analyst/designer).
  Two enforcement layers (slidePostProcessor vs weak proxy). Two scorers (discriminator wired,
  deliverableScorer orphaned). Two citation resolvers (getChunkSourceMap works, citationResolver
  stale).
- **Trust the code, not the doc-comment** — many comments reference "Opus 4.7"/"Claude fallback"
  retargeted to GPT/Gemini; doc-comments describe intent.
- **Determinism contract:** theme breadth/depth use `temperature:0, seed:42`. Don't add
  randomness to names/titles.
- **Quality-first:** floors fail loudly rather than ship single-source themes — don't "fix" low
  counts by relaxing filters.
- **Never** reintroduce inline Chromium in the generate path; **never** add `temperature` for
  opus-4-x; **never** add a constraint path that bypasses `constraintQualityGate`.

*Compiled 2026-06-02 from a full-surface read (~122K LOC: services 58K, components 27K, proxy
21K, design-desk 8.5K, root 7K). Flags reflect the code as it runs, not as comments describe it.*
