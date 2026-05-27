# HiC NotebookLM-Informed Uplift Plan

**Date:** 2026-05-24
**Source analyses:**
- NotebookLM teardown (external AI engineer review, in this session)
- HiC v4.2 handoff doc (`HANDOFF_HIC_COMPREHENSIVE_2026-05-24.md`)
- 6 standing rules in agent memory

**Goal:** Produce the best possible outputs from market research data analyses. Close the four gaps where NotebookLM is ahead (retrieval depth, agentic loops, output magic, single coherent quality model) while protecting the three moats where HiC is ahead (provenance, determinism, multi-model resilience).

**Scope:** 14 wall-clock weeks, single engineer + Claude Code. With 2 engineers in parallel, 8-9 weeks.

**Discipline:** Every phase ends with a measurable acceptance criterion. No phase moves to the next until the criterion lands. Per `feedback_finish_then_test_no_phase_gates` — sub-phases inside a week execute to completion before validation; the week boundary IS the validation gate.

---

## The seven leverage patterns (mapped to phases)

| # | Pattern (from analysis) | Phase | When |
|---|---|---|---|
| 1 | Multi-angle query decomposition + reranking on chat path | Phase 2 | Wks 3-4 |
| 2 | Generator → Critic → Revisor loops on identity-class outputs | Phase 3 | Wk 5 |
| 3 | Plan-act-reflect agentic loop ("HiC Deep Research") with HITL plan-edit gate | Phase 5 | Wks 7-9 |
| 4 | Cross-corpus theme synthesis (`#meta-themes`) | Phase 6 | Wks 10-11 |
| 5 | Brief Dialog (text two-persona dialogue artifact) | Phase 6 | Wk 11 |
| 6 | Mind Map as first-class deliverable | Phase 4 | Wk 6 |
| 7 | Consolidated `claim_grounding_validator` (shadow-mode, then retire 5 validators) | Phase 7 | Wks 12-14 |

Plus three pre-existing standing-rule alignments:
- **Resilience port** — multi-model pattern from `topic_modeling.py` → `services/aiRouter.ts`
- **BERTopic-primary rewire** — `generateThemes()` calls v2 pipeline first
- **Contract-vs-implementation gap closure** — port 5 skill-only specs to actual TypeScript

---

## Phase 0 — Pre-flight (Week 0, ~3 days)

Before any pattern lands, establish the eval substrate and freeze the baseline. Without this, every later phase ships blind.

### 0.1 Golden eval corpus
- [ ] Curate 3 frozen research corpora (each 200-400 docs) with known-good theme sets and known-good citations
  - Higher-Ed co-op strategy (Northeastern-style)
  - Mid-market B2B SaaS retention (different industry, different source mix)
  - Healthcare-system patient engagement (regulatory-heavy, third source mix)
- [ ] For each: human-curated answer key with 15-25 expected themes, 3-5 expected personas, 5-7 expected recommendations
- [ ] Store at `humans-in-control-research/evals/corpus-v1/`

### 0.2 Acceptance metrics
- [ ] `theme_recall@20` — fraction of human-expected themes the pipeline surfaces in its top 20
- [ ] `citation_grounding_rate` — fraction of generated claims that map to a chunk_id whose content contains the claim's key entities + ≥1 key predicate within edit distance ≤ 15%
- [ ] `reproducibility_drift` — given same corpus_hash + goal, % of theme names that change across 5 consecutive runs (target: <5%)
- [ ] `time_to_first_theme` — seconds from "Click Collect" to first theme rendered (cache hit vs cache miss)
- [ ] `provider_failover_p99` — p99 latency added when primary provider 429s mid-pipeline (target: <8s)

### 0.3 Baseline run
- [ ] Run each golden corpus through current v4.2 pipeline, record all 5 metrics
- [ ] Save baseline at `evals/baselines/2026-05-24-pre-uplift.json`
- [ ] This is the bar every phase must beat

**Acceptance:** baseline.json exists, eval harness runs reproducibly on demand.

---

## Phase 1 — Close the contract-vs-implementation gap (Wks 1-2, ~2 eng-weeks)

The #1 problem identified by the external analysis. Five skill specs ship as `.claude/skills/*/SKILL.md` but have no runtime wiring. Until these land, every new feature has to re-solve the same provider-failure and output-malformation problems locally.

### 1.1 Port `ai-output-syntax-repair` to TypeScript (~3 days)
- [ ] New file: `humans-in-control-research/services/aiOutputRepair.ts`
- [ ] Implement the 9-rung repair ladder from the skill spec (trim wrapping → JSON5 cleanup → trailing commas → string escape recovery → truncation close → HTML/SVG/CSS recovery → schema-guided wrap)
- [ ] Wire into every `JSON.parse(modelOutput)` site in:
  - `services/geminiService.ts` (~12 sites)
  - `services/anthropicService.ts` (~6 sites)
  - `services/openaiService.ts` (~4 sites)
- [ ] Emit `RepairReport` with `degradation: true` flag on rung 6+ (truncation recovery)
- [ ] Surface degradation in `degradation_events[]` per `fallback-event-surfacing` taxonomy
- [ ] Unit tests against the 8 verbatim failure cases from `wiki/synthesis/generation-failures.md`

**Acceptance:** Zero `JSON.parse` exceptions in 100 consecutive runs against golden corpora. Truncation recoveries surface as visible Brain Status events.

### 1.2 Port `export-paint-sync` to `services/exportService.ts` (~3 days)
- [ ] Implement the 6-step paint-readiness ladder from skill spec
- [ ] Add CSS rule `body[data-export-mode] .editor-only { display: none !important; }` to brand stylesheet
- [ ] Add `className="editor-only"` to the 10 orphan editor buttons in `CorpusChatPanel.tsx` (lines 719, 724, 741, ...) and `AnalysisCheckpoint.tsx` (lines 1128, 1174, ...)
- [ ] Wrap every `html2canvas()` call site with `paintSync()` prep
- [ ] Re-inject `@font-face` declarations into html2canvas cloned document via `onclone` callback

**Acceptance:** Run export-render-verifier subagent against 5 test decks; 0 blank slides, 0 leaked editor UI, 0 mid-word label breaks, 0 missing wordmarks.

### 1.3 Port multi-model resilience to `services/aiRouter.ts` (~2 days)
- [ ] Move provider health tracker, content-hash cache helpers, per-corpus commitment from `proxy/topic_modeling.py` into a shared TypeScript module: `services/multiModelResilience.ts`
- [ ] Wrap every Anthropic/Gemini/OpenAI call in `geminiService.ts` with `withResilience(provider, fn)`
- [ ] Persist embedding cache + name cache to disk at the same paths the proxy uses (so caches are shared across surfaces)

**Acceptance:** Force OpenAI 429 mid-run; pipeline routes to Gemini within 100ms; subsequent calls in same session skip OpenAI for 10min cooldown; no user-visible failure.

### 1.4 Surface fallback events in the chat UI (~1 day)
- [ ] `CorpusChatPanel.tsx`: render `degradation_events[]` from the receipt as an inline Brain Status notice
- [ ] One-line per event with `kind`, `stage`, `detail`, `recoverable` flag
- [ ] "Why?" disclosure expands to full payload

**Acceptance:** Every silent fallback site identified in `fallback-event-surfacing` spec is now visible in chat.

### 1.5 Rewire `generateThemes()` to BERTopic-primary (~2 days)
- [ ] `services/geminiService.ts` `generateThemes()`: POST to `/api/topic-model/analyze` (v2) with target_topic_count derived from `outputMode` / `deliverableType`
- [ ] Poll `/api/topic-model/status/<id>` until complete; handle the 5 structured error shapes
- [ ] For each returned cluster, call Claude Opus 4.6 at temperature=0 to name (uses `_llm_label_clusters` cache server-side; no additional client-side cache needed)
- [ ] Existing `_runBreadthPass` becomes the small-corpus fallback (<100 docs OR BERTopic returned 0 clusters)
- [ ] `validate_theme_yield.py` + `validate_evidence_tier_distribution.py` Stop hooks already in place

**Acceptance:** `theme_recall@20` on golden corpora ≥ baseline + 15%. `reproducibility_drift` ≤ 5% across 5 runs.

**Phase 1 gate:** All 5 sub-deliverables shipped + Phase 0 eval metrics show no regression on baseline, and improvement on the metrics where Phase 1 directly applies.

---

## Phase 2 — Multi-angle query decomposition + reranking (Wks 3-4, ~2 eng-weeks)

The single most user-visible improvement in the plan. Existing skills (`wiki-query-expander`, `wiki-reranker`) become real instead of paper specs.

### 2.1 Wire query decomposition into chat preprocessing (~3 days)
- [ ] New service: `services/chatQueryPlanner.ts`
- [ ] On every user message to the Analyst Chat:
  1. Call Haiku 4.5 at temperature=0 with the `wiki-query-expander` skill prompt → emits 3-5 sub-queries spanning angles (definition / mechanism / evidence / counter-evidence / second-order)
  2. Fan out: for each sub-query, run embedding retrieval over (corpus chunks + wiki articles) — k=8 per sub-query
  3. Merge, dedup by chunk_id
  4. Pass merged set to reranker (next sub-task)
- [ ] Cache sub-queries by (user_message_hash, corpus_hash) to avoid re-expansion on retry

**Acceptance:** On a 5-question golden eval set, retrieval recall@15 ≥ baseline + 30%. Sub-query expansion latency p50 < 600ms.

### 2.2 Wire cross-encoder reranking (~2 days)
- [ ] Call Haiku 4.5 in a single batched prompt: "Score each of these N chunks 1-5 on direct relevance to the user's question"
- [ ] Apply per-chunk score, keep top 12-15 by score
- [ ] Emit reranking metadata: `_rerank_score`, `_pre_rerank_position`, `_post_rerank_position` so the UI can show what was promoted/demoted

**Acceptance:** Reranking lifts citation_grounding_rate by ≥10 points on golden eval set vs un-reranked baseline.

### 2.3 Synthesis call with reranked context (~2 days)
- [ ] Final chat answer call: Opus 4.7 with full 1M context, reranked chunks injected
- [ ] Strict `[CHUNK_NNN]` citation contract enforced (already wired via `validate_citation_resolution.py`)
- [ ] Render citations as clickable chips that scroll the sources pane to the referenced chunk

**Acceptance:** On golden eval set, citation_grounding_rate ≥ 0.85 (baseline likely ~0.65).

### 2.4 Eval pass (~1 day)
- [ ] Run all 3 golden corpora × 5 representative chat questions = 15 test cases
- [ ] Compare Phase 2 metrics vs Phase 1 baseline
- [ ] Save to `evals/runs/2026-XX-XX-phase-2.json`

**Phase 2 gate:** citation_grounding_rate ≥ 0.85 AND theme_recall@20 holds at Phase 1 levels.

---

## Phase 3 — `critic_revise_loop` skill + wire to recommendations (Wk 5, ~1 eng-week)

The architectural primitive that makes Phases 4-7 cheap. Without it, every future deliverable upgrade is a one-off pipeline.

### 3.1 Author the `critic_revise_loop` skill (~1 day)
- [ ] New skill: `.claude/skills/critic-revise-loop/SKILL.md`
- [ ] Defines the contract:
  ```typescript
  type CriticVerdict = {
    accept: boolean;
    edits: Array<{
      target_path: string;        // dot-path into the deliverable JSON
      action: 'replace' | 'append' | 'remove';
      new_value?: any;
      reason: string;             // why the critic wants this edit
    }>;
    rationale: string;
    confidence: 'high' | 'medium' | 'low';
  };

  type RevisorContract = (
    deliverable: any,
    edits: CriticVerdict['edits']
  ) => any;  // returns edited deliverable

  function criticReviseLoop<T>(opts: {
    deliverable: T;
    critics: Array<{ skill: string; max_iterations: number }>;
    revisor_model: 'sonnet-4.6' | 'opus-4.7';
    halt_when: 'all_accept' | 'iterations_exhausted';
    budget_usd?: number;          // hard cost cap
  }): Promise<{ result: T; iterations: number; critique_log: any[] }>;
  ```

### 3.2 Build the TypeScript implementation (~2 days)
- [ ] `services/criticReviseLoop.ts`
- [ ] Per critic, run up to `max_iterations` rounds:
  1. Critic skill invoked with current deliverable → CriticVerdict
  2. If `accept: true`, move to next critic
  3. Otherwise, revisor (Sonnet 4.6 at temp=0.1) applies edits → new deliverable
  4. Re-invoke critic on revised deliverable
- [ ] Halt when all critics accept OR iterations exhausted OR budget breached
- [ ] Persist `critique_log` to the deliverable's degradation_events so the user can see what changed

### 3.3 Wire to recommendations only (proof) (~2 days)
- [ ] `recommendation-architect` flow becomes:
  ```
  recommendation-architect (draft N recommendations)
    ↓
  criticReviseLoop({
    deliverable: draft,
    critics: [
      { skill: 'pre-mortem', max_iterations: 2 },
      { skill: 'stakeholder-lens-auditor', max_iterations: 2 },
      { skill: 'quantification-architect', max_iterations: 1 },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.50,
  })
    ↓
  Final recommendations with embedded risk_register + stakeholder_audit + four-tuple
  ```
- [ ] Pre-mortem critic produces edits like: "recommendation R3 missing pre-commitment for failure mode 'CFO budget pull' → append pre_commitment field"
- [ ] Stakeholder-lens critic produces edits like: "recommendation R5 fails CFO lens (payback >36mo) → append stakeholder_audit.cfo.showstoppers"

**Acceptance:** On golden eval set, recommendations carry full risk_register + stakeholder_audit + four-tuple fields. Manual review by user confirms 0 of 5 recommendations need post-hoc editing.

**Phase 3 gate:** `criticReviseLoop` works end-to-end on recommendations with budget cap honored.

---

## Phase 4 — Mind Map deliverable + reproducibility hash stamping (Wk 6, ~1 eng-week)

Two visible wins in one week: new artifact + the moat made visible.

### 4.1 `mind-map-architect` skill (~2 days)
- [ ] New skill: `.claude/skills/mind-map-architect/SKILL.md`
- [ ] Input: BERTopic v2 output (clusters with parent_topic relationships from HDBSCAN hierarchy) + research_goal
- [ ] Output: nested JSON, max depth 4, max 7 children per node, each node carries `chunk_ids[]` references
- [ ] Convergent-evidence clusters get `visual_treatment: 'convergent'` flag for renderer

### 4.2 Designer Window Mind Map renderer (~2 days)
- [ ] New slide template: `components/slideTemplates/mind-map.ts` + `mind-map.tsx`
- [ ] Use `d3-hierarchy` + `d3-tree` for force-directed radial layout
- [ ] Click-to-chat: clicking a node calls `sendPrompt('Tell me more about [node label] in the context of [parent path]')`
- [ ] Convergent-evidence nodes get a visual border treatment (cyan ring, per NXT brand)

### 4.3 `#mindmap` hashtag wiring (~1 day)
- [ ] Add to `services/hashtagRegistry.ts`
- [ ] Route to `mind-map-architect` skill → Designer Window
- [ ] Export to PNG via existing `export-paint-sync` path

### 4.4 Reproducibility hash stamping (~1 day)
- [ ] Every deliverable JSON gets a top-level `reproducibility_hash` field
- [ ] Computed at generation start: `sha256(corpus_hash + goal + framework_versions + pipeline_version)`
- [ ] Surfaced in the export ribbon ("Run ID: a3f2c1d8...") and in the deliverable footer
- [ ] `validate_theme_reproducibility.py` Stop hook already wired to use it (just stops working because the hash isn't being emitted — this fixes that)

**Phase 4 gate:** `#mindmap` produces a Mind Map artifact in Designer Window. Reproducibility hash visible on every generated deliverable. Re-running same corpus + same goal produces the same hash and same theme/persona names.

---

## Phase 5 — HiC Deep Research with HITL plan-edit gate (Wks 7-9, ~3 eng-weeks)

The "Humans in Control" feature. This is what makes the product name mean something concrete. NotebookLM has Deep Research; only HiC has it with a deliberate user-editable plan checkpoint.

### 5.1 `research-planner` skill (~3 days)
- [ ] New skill: `.claude/skills/research-planner/SKILL.md`
- [ ] Input: research_goal + uploaded brief + optional institution context
- [ ] Output: structured `research_plan.json`:
  ```yaml
  goal: <verbatim user goal>
  sub_questions:
    - id: q1
      question: <one of 5-10 sub-questions>
      expected_evidence_types: [academic, news, ...]
      expected_named_entities: [...]
      priority: high | medium | low
  source_strategy:
    - source_id: <connector_id>
      sub_question_ids: [q1, q3]
      expected_yield: <article count>
      rationale: <one sentence>
  named_institutions: [Northeastern, MIT, ...]
  expected_themes_count: <target>
  budget_usd: <hard cap>
  reflection_threshold: <evidence coverage % at which we stop iterating>
  ```
- [ ] Uses Opus 4.7 + extended thinking (planning quality > speed)

### 5.2 Plan-edit UI (~4 days)
- [ ] New React surface: `components/ResearchPlanEditor.tsx`
- [ ] Renders the plan as an editable form: each sub-question is a row with priority dropdown + expected sources chip + "remove" button
- [ ] User can: edit sub-questions, add new ones, remove low-priority ones, adjust budget cap, adjust reflection threshold
- [ ] "Approve plan" button advances to collection phase
- [ ] "Regenerate plan" button asks the planner to re-do with user notes

**Acceptance:** Operator can approve / edit / regenerate a plan before any external API calls begin.

### 5.3 Reflector loop in the data fabric (~4 days)
- [ ] `services/researchFabricOrchestrator.ts` wraps existing collection in an iteration loop
- [ ] Each iteration:
  1. Pick next source batch from current plan (5-10 sources)
  2. Run parallel collection (existing flow)
  3. Body-aware relevance score (existing)
  4. Reflector call (Sonnet 4.6): "Given the plan and the new evidence, which sub-questions are now covered? Which still have gaps? Should we adjust the plan?"
  5. Reflector emits updated plan + reasoning trace
  6. If `coverage ≥ reflection_threshold` OR `budget_remaining < single_source_cost`, exit loop
  7. Else loop
- [ ] All reflection traces persist to `engagements/<slug>/research_log.json` for audit
- [ ] Hard cap: N iterations (configurable, default 6)

### 5.4 Reflection trace UI (~2 days)
- [ ] Live-streaming view in collection phase: each reflector decision rendered as a card ("Sub-question Q3 covered by 4 articles; closing." | "Q5 needs more academic evidence; adding 3 sources.")
- [ ] User can pause / abort mid-iteration

### 5.5 `#deep-research` hashtag + eval (~2 days)
- [ ] Add to hashtag registry
- [ ] Routes to the planner → plan-edit UI → reflector loop
- [ ] Eval: run all 3 golden corpora through Deep Research mode; measure theme_recall@20 vs the Phase 1 baseline. Target: +25% recall over one-shot collection.

**Phase 5 gate:** End-to-end Deep Research run works. Operator approves plan, sees reflection trace, gets a deliverable that beats Phase 1 on recall. Reflection traces audit-readable.

---

## Phase 6 — Cross-engagement synthesis + Brief Dialog (Wks 10-11, ~2 eng-weeks)

### 6.1 `cross-engagement-pattern-miner` activation (~2 days)
- [ ] Wire `loadGenerationContext()` in `services/wikiService.ts` to read `synthesis/cross-engagement-patterns.md` and inject into the system prompt for every generation
- [ ] Schedule the miner skill as a `/loop` weekly (local /loop, not /schedule since the latter requires Claude GitHub App on the repo)
- [ ] Pattern types per the existing skill spec: recurring recommendations, persistent checkpoint rejections, high-yield source clusters, coverage shortfalls, quality anchors

### 6.2 `#meta-themes` deliverable (~2 days)
- [ ] New view in the Knowledge Library: "Themes Across Your Portfolio"
- [ ] Reads all `engagements/<slug>/themes.json` + `synthesis/cross-engagement-patterns.md`
- [ ] Renders themes that recur across ≥3 engagements (with engagement slugs as supporting evidence)
- [ ] Convergent-across-engagements flag: themes that appear in 5+ engagements get a special "platform pattern" treatment

### 6.3 Brief Dialog deliverable (~3 days)
- [ ] New skill: `.claude/skills/brief-dialog/SKILL.md`
- [ ] Two text personas:
  - **Skeptical Partner** — Bain-partner archetype; pushes back on every claim
  - **Curious Strategist** — analyst archetype; defends the work with evidence
- [ ] 3-minute read (~600-900 words)
- [ ] Renders as a transcript artifact in the Design Desk (no audio in v1)
- [ ] Each line of dialogue cites `[CHUNK_NNN]` references like every other deliverable
- [ ] `#brief-dialog` hashtag

### 6.4 ElevenLabs TTS rendering (optional v2) (~1 day)
- [ ] If user clicks "Render audio", send the transcript to ElevenLabs v3 with two distinctly non-celebrity voices
- [ ] Store the MP3 in the artifact library
- [ ] Defer if legal review wanted before any voice rendering ships

**Phase 6 gate:** `#meta-themes` shows portfolio-level themes; `#brief-dialog` produces a transcript artifact.

---

## Phase 7 — Validator consolidation in shadow mode (Wks 12-14, ~3 eng-weeks)

Premature consolidation could leave coverage gaps. So: build the new validator, run it in shadow alongside the existing 5 it could replace, tune the verbatim-match threshold, only retire originals when shadow's false-negative rate is below their combined floor.

### 7.1 `claim_grounding_validator` Stop hook (~5 days)
- [ ] New hook: `.claude/hooks/scripts/validate_claim_grounding.py`
- [ ] For each claim-bearing sentence in the deliverable:
  1. Extract key entities (NER on named things)
  2. Extract key predicate (the verb-phrase asserting the relation)
  3. Resolve the cited `[CHUNK_NNN]` or `citations[]` entry
  4. Load the chunk content
  5. Check: do the key entities + key predicate appear within an edit distance threshold (target: 15% Levenshtein on tokenized form)?
- [ ] Emit structured violation per failed claim: `{claim_sentence, expected_chunks, actual_chunks, mismatch_reason}`

### 7.2 Shadow-mode rollout (~5 days)
- [ ] Hook runs in parallel with the existing 5 (`validate_evidence`, `validate_citations`, `validate_citation_resolution`, `validate_no_silent_fallback`, `validate_evidence_recency`)
- [ ] All 6 emit verdicts; hook ledger persists to `wiki/synthesis/grounding-shadow-log.md`
- [ ] After 1 week of shadow runs, analyze:
  - False-positive rate (new hook fails when others pass on a valid deliverable)
  - False-negative rate (new hook passes when others catch a real defect)
  - Coverage gaps (defect classes only one set catches)
- [ ] Tune edit-distance threshold (likely needs adjustment per deliverable type)

### 7.3 Retire and migrate failure-message UX (~3 days)
- [ ] Once false-negative rate < combined floor of existing 5, retire originals
- [ ] Migrate existing hooks' failure-message guidance into `claim_grounding_validator`'s per-class messages
- [ ] Update `wiki/synthesis/generation-failures.md` template to reference unified validator

### 7.4 Documentation pass (~2 days)
- [ ] Update `HANDOFF_HIC_COMPREHENSIVE_2026-05-24.md` to reflect consolidated validator
- [ ] Update `documentation.html` Section 17 (quality gates) to remove retired hooks
- [ ] Update `HOOK_CATALOG` in this plan from 30 hooks to ~25

**Phase 7 gate:** Consolidated validator running solo; 5 originals retired; no regression in citation_grounding_rate on golden corpora.

---

## Model assignment — final table

The analysis got most of this right. Pushback on Claude-only-for-everything stands per the multi-model resilience rule.

| Role | Primary | Fallback | Rationale |
|---|---|---|---|
| Chat synthesis (final answer) | Opus 4.7 | Gemini 3.1 Pro | Best long-context grounded answer; Gemini matches at 1M |
| Query expansion (3-5 sub-queries) | Haiku 4.5 | Gemini 2.5 Flash | Sub-second; runs in parallel; cheap |
| Cross-encoder reranking | Haiku 4.5 | Gemini 2.5 Flash | Pairwise scoring is Haiku's sweet spot |
| BERTopic cluster naming | Opus 4.6 @ temp=0 | Heuristic top-terms (already wired) | Determinism > raw quality; cluster ID stable |
| Critic passes (pre-mortem, stakeholder-lens, contradiction-finder) | Sonnet 4.6 | Gemini 2.5 Flash | Critiques are structural |
| Revisor passes (apply critic edits) | Sonnet 4.6 | Gemini 2.5 Flash | Mechanical edit application |
| Deep Research planner | Opus 4.7 + extended thinking | Opus 4.6 | Planning quality > planning speed |
| Deep Research reflector | Sonnet 4.6 | Gemini 2.5 Flash | Iterative; needs speed |
| Mind Map JSON | Sonnet 4.6 + tool use | Gemini 2.5 Flash | Structured output mode |
| Slide titling | Haiku 4.5 | Gemini 2.5 Flash | Consolidate; remove gpt-5.5-mini dependency for non-embedding paths |
| Brief Dialog two-persona | Sonnet 4.6 (alternating role) | Gemini 2.5 Flash | Cheaper than Opus; dialogue doesn't need it |
| Embeddings (proxy) | OpenAI text-embedding-3-small | Gemini gemini-embedding-001 | Already wired with provider-keyed cache; deferring Voyage-3 bake-off |

The simplification: **drop gpt-5.5-mini entirely from the reasoning paths.** Keep OpenAI ONLY for embeddings (where it's primary with Gemini fallback). Reasoning consolidates on Anthropic with Gemini fallback. Vision/multimodal stays Gemini 3.1 Pro.

---

## Hashtag retirement discipline

Per the discipline added to the standing rules: every new hashtag must either retire an older one or be explicitly justified as core.

| New hashtag | Retires | Justification |
|---|---|---|
| `#mindmap` | — | New deliverable; no existing equivalent |
| `#deep-research` | — | New mode; no existing equivalent |
| `#meta-themes` | — | New cross-engagement view |
| `#brief-dialog` | — | New deliverable kind |

**Net hashtag count:** 22 → 26. Acceptable but watch for the next round. By Phase 7, retire `#prototypes` (consolidate into `#artifacts`) and `#presentations` (consolidate into `#artifacts`) — they're library-browse views that should be unified.

---

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phase 1 ports take longer than 2 weeks (TypeScript port complexity) | High | Pad Phase 1 to 2.5 weeks; pull Phase 2 start accordingly |
| Phase 2 query decomposition adds chat latency unacceptable to users | Medium | Phase 0 eval includes latency baseline; tune `top_k` per sub-query if p50 > 3s |
| Phase 3 critic loop costs blow up (multiple critic + revisor rounds per recommendation) | Medium | Hard `budget_usd` cap per loop; halt when exceeded; emit degradation event |
| Phase 5 Deep Research reflector loops forever on a thin corpus | Low | N-iteration hard cap; budget cap |
| Phase 7 shadow-mode reveals validator gaps that prevent retirement | Medium | Plan accommodates this: phase ends when shadow validator is good, not on calendar |
| Multi-model resilience port to TS desyncs from Python source | Medium | Move resilience constants to shared JSON config read by both sides |
| Reproducibility hash collides on similar corpora | Very low | sha256 collision space is sufficient; reject by design |

---

## What this plan deliberately does NOT do

1. **Audio Overviews.** Per the analysis: voice IP risk + consulting use-case misalignment + native multi-speaker TTS gap. Brief Dialog (Phase 6.3) is the text alternative.
2. **Migrate off BERTopic.** Reproducibility + convergent-evidence flag depend on the deterministic clustering substrate.
3. **Voyage-3 embedding swap.** Deferred. Run as a separate eval if/when there's bandwidth.
4. **Add more Stop hooks.** Phase 7 consolidates. New validation joins the unified contract as a facet.
5. **Three-provider fan-out for the same reasoning task.** Anthropic primary with Gemini fallback per role. OpenAI is embeddings-only.

---

## Acceptance criteria — the whole plan

The plan ships when:

1. All 7 phases reach their individual acceptance gates
2. Golden corpus metrics improve over the 2026-05-24 baseline:
   - `theme_recall@20` ≥ baseline + 25%
   - `citation_grounding_rate` ≥ 0.85 (from ~0.65)
   - `reproducibility_drift` ≤ 5%
   - `provider_failover_p99` < 8s
3. The 13 "contract-only" specs from Section 19 of the handoff doc are either:
   - Shipped (wired into TypeScript/Python)
   - Explicitly retired with reason documented
4. Every new deliverable kind (Mind Map, Brief Dialog) round-trips through `export-render-verifier` with zero defects on the 8 export-failure classes
5. The reproducibility_hash on every deliverable header is byte-identical across 5 consecutive runs with the same corpus_hash + goal

---

## Next concrete step

Per the analysis's offered drill-downs and the goal stated above (best possible market research outputs), the right next file to write is the `critic_revise_loop` SKILL.md. It's Phase 3 in this plan but Phases 5 and 6 reuse it. Build it once, get three deliverable upgrades.

**The TypeScript signature I'd propose:**

```typescript
// services/criticReviseLoop.ts

export type CriticVerdict = {
  accept: boolean;
  edits: Array<CriticEdit>;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
};

export type CriticEdit = {
  target_path: string;           // JSONPath into the deliverable
  action: 'replace' | 'append' | 'remove';
  new_value?: unknown;
  reason: string;
};

export type CriticReviseLoopOpts<T> = {
  deliverable: T;
  critics: Array<{
    skill_name: string;             // e.g., 'pre-mortem'
    max_iterations: number;         // default 2
    invocation_model: 'sonnet-4.6' | 'opus-4.7' | 'haiku-4.5';
  }>;
  revisor_model: 'sonnet-4.6' | 'haiku-4.5';   // default sonnet-4.6
  halt_when: 'all_accept' | 'iterations_exhausted' | 'budget_breached';
  budget_usd?: number;            // hard cost cap; default $0.50 per loop
  surface_critique_log: boolean;  // emit to degradation_events; default true
};

export type CriticReviseLoopResult<T> = {
  result: T;
  iterations_per_critic: Record<string, number>;
  critique_log: Array<{
    critic: string;
    iteration: number;
    verdict: CriticVerdict;
    edits_applied: number;
    cost_usd: number;
  }>;
  total_cost_usd: number;
  halted_reason: 'all_accept' | 'iterations_exhausted' | 'budget_breached';
};

export async function criticReviseLoop<T>(
  opts: CriticReviseLoopOpts<T>
): Promise<CriticReviseLoopResult<T>>;
```

That's the primitive. The first wire-up — `recommendation-architect` → `criticReviseLoop` with `pre-mortem` + `stakeholder-lens-auditor` + `quantification-architect` as critics — turns single-shot recommendations into 3-pass synthesized recommendations with embedded risk register + stakeholder audit + four-tuple.

Want me to write the SKILL.md spec and the TypeScript stub now, or do you want to weigh in on any phase before I start?
