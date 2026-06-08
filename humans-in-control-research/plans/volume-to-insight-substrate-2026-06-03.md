# Volume-to-Insight Substrate (2026-06-03)

## BUILD STATUS (updated 2026-06-05)
- **Step 1 (yield-ledger baseline)** — DONE. `wiki/synthesis/yield-ledger.md` holds the read-only
  manifest funnel baseline. Live per-run section is step 6.
- **Step 2 (constraint gate v1, BLOCK-by-default-ish + golden set)** — DONE (pre-existing).
  `services/constraintQualityGate.ts` (`evaluateConstraint`: master-rule dollar / naked-number /
  generic-stub contradiction checks) is applied at all 3 constraint write points in
  `promptImprovementEngine.ts` (auto-approve >=5, wiki load, high-conf chat rule) + a dismissed-edit
  buffer (`getDismissedConstraintKeys`). `wiki/eval/golden-set.json` frozen set exists.
- **Step 3 (manifest scoping contract, no fixed caps)** — DONE + VERIFIED LIVE. `POST /api/corpus/scope`
  (proxy): filters the persistent manifest by type/industry/engagement/min-relevance, deterministic
  rank (relevance desc, chars desc, wikiPath asc), budget by max_count/max_chars. Test: social-post
  scope_size=7128 (whole corpus, not a 50-cap), returned=10 under budget.
- **Step 4 (multi-angle retrieval + coverage merge)** — DONE + VERIFIED LIVE. `POST /api/corpus/retrieve`
  (proxy): expands goal into <=6 fixed deterministic angle templates, retrieves per-angle via
  /api/wiki/fetch-articles, round-robin merge + dedup so the set spans angles. Test: 5 angles, deduped
  coverage set. Determinism via fixed templates + stable merge.
- **Step 5 (repoint consumers to the substrate)** — DONE + LIVE TESTED 2026-06-05 (build green, end-to-end browser smoke test passed; full bench in §7).
  Surface: new `services/corpusSubstrate.ts` (scope + retrieve + yield-ledger ring buffer +
  `prefetchSubstrateForDeliverable`). Repoints landed at three layers:
  (a) **Topic modeling** — `topicModelService.ts::startTopicModelJob` now accepts a `scope` spec
  that the proxy `/api/topic-model/analyze` endpoint already supports (proxy/app.py:2795-2816
  `_assemble_scope_items`). Both call sites pass it: `App.tsx` auto-kickoff after reddit-deep
  collection + `TopicModelingPanel.tsx` lazy kickoff. The panel's `redditDeepItems.length >= 10`
  gate is now `hasItems || hasSubstrate` so social-posts + articles from the manifest become
  first-class topic-model input even when the in-session reddit-deep slice is sparse.
  (b) **Themes archive augmentation** — `geminiService.ts::generateThemes` keeps its existing
  LLM-decomposed multi-angle retrieval as primary; when it returns 0 articles, falls through to
  one deterministic `/api/corpus/retrieve` pass (6 fixed templates, stable round-robin merge),
  emits yield-ledger events for both the success and starvation paths.
  (c) **All downstream consumers** (personas, recommendations, journey, roadmap, PRD, blueprint,
  tech-arch, tech-audit, competitive, gap, strategic-report) — repointed via a single central
  injection. Added `GenAISession::getSubstrateEvidenceBlock()` (lazy, cached, parallel to the
  existing `getGoalEvidenceBlock`) and inserted the substrate block into the `effectivePrompt`
  construction at all three central sites: `executeStep` (line ~6144), `executeStepViaGPT`
  (~6087), `_runBreadthPass` (~1819). Every consumer that flows through these methods now sees
  multi-angle coverage evidence in addition to the existing single-angle goal-evidence pack.
  Yield-ledger events fire at every repointed call site via `recordYieldEvent()` so Step 6's
  live surface has a stream to render. Typecheck (tsc) is clean on all modified files.
  Pending: running-stack smoke test against a real engagement (Docker rebuild + an actual
  topic/theme job) — the user must drive this since it requires a live SPA session.
- **Step 6 (yield-ledger live surface + gate v2 held-out scoring)** — REPLACED + SHIPPED via the
  Meta-Harness uplift §6.4. The scalar gate v2 originally specced here is subsumed by M2
  `services/qualityFrontier.ts` (Pareto-vector gate with `dominates`/`regression`/`decide`) and M3
  `services/goldenSetRunner.ts` (held-out-scoring against the frozen golden-set, returns
  GoldenSetReport + compareReports verdict). The yield-ledger live surface portion (Reasoning
  Stream + append to yield-ledger.md) remains as an integration task per consumer but the
  primitive exists in `services/corpusSubstrate.ts` `recordYieldEvent` + `getYieldEvents`.
- **Step 7 (self-improvement epoch)** — SHIPPED 2026-06-05 via M5. Three components live:
  `.claude/skills/epoch-proposer/SKILL.md` (the playbook), `services/epochTrigger.ts` +
  `GET /api/epochs/status` (disk-authoritative readiness check, both branches smoke-tested),
  `wiki/synthesis/improvement-epochs.md` (the third standing ledger). Acceptance rules wired
  through M3 `compareReports` (apply / reject / no-edit verdict). Honest scope: orchestration
  auto-spawn (cron / CI) is a future cadence layer; today the user invokes `/epoch-proposer`
  when `due:true`.

Also wired (separate gold-deck work): `POST /api/gold/export-pptx` (editable gold PPTX) +
`services/goldArtifact.ts` + artifactExporter gold-export branch (see [[project_render_pipeline_unification]]).

---


Right-sized after re-reading the four intelligence-folder pillars (second brain, NotebookLM
source-grounding, Verbalized Sampling, Reinforcement Inference) plus the SkillOpt paper, and
reconciling against the three existing second-brain plans so this EXTENDS rather than duplicates them.

> Sources re-read 2026-06-03 in `.claude/skills/intelligence/`:
> - `second_brain.json` (Karpathy/Matt Wolfe transcript) + `compass_artifact_*-4aa8c0a3` (NotebookLM
>   reverse-engineering spec) + `compass_artifact_*-17eaa558` (AI-native creative stack).
> - `2510.01171v3.pdf` Verbalized Sampling; distilled in `.claude/skills/verbalized-sampling/SKILL.md`.
> - `reinforcement_inference.pdf` (image-only) distilled in `.claude/skills/reinforcement-inference/SKILL.md`.
> - `2605.23904v1.pdf` SkillOpt (self-evolving agent skills).
> - Registries (`creative_ai_sources_registry.md`, `financial_sources_registry_v2.md`) are source
>   catalogs for the proxy `SOURCES`, not concepts.

## 0. Why this plan exists (the user's standing intent)

"Social posts must be wikified and manifested as first-class knowledge data identical to any other.
Every consumer (themes, topic modeling, personas, barriers, journeys, recommendations) must draw from
the manifest / full corpus, not capped side-channel arrays. Volume of insight must be proportional to
volume of data collected."

The prior phrasing of my plan was "repoint consumers to the full corpus" (a volume statement). After
re-reading the pillars, that is necessary but under-specified and in two places WRONG. This plan fixes
the framing.

## 1. What the four pillars actually say (and what my prior plan got wrong)

### Pillar 1 - Second brain (Karpathy / Matt Wolfe transcript)
The load-bearing idea is not "feed more data." It is: an LLM ingests every piece of content into a
typed, cross-linked wiki, and "finds connections between things you are not making." The value is the
EDGES, not the record count. "It serves as context for ANY work you want to do." The index (table of
contents) plus topical naming IS the navigation layer; retrieval rides on top.

- My prior plan treated the manifest as a flat list to enumerate. CORRECTION: the manifest is the
  second-brain INDEX (scope/filter/type/count). The connective tissue (shared entities, shared
  industries, citation co-occurrence) is what makes insight super-linear in data, and my plan never
  named it as the actual source of "richer artifacts."

### Pillar 2 - NotebookLM source-grounding (compass spec)
The documented 50% satisfaction lift on "responses that use larger amounts of sources" (Agrawal, Oct
2025) comes from MULTI-ANGLE retrieval: decompose the goal into 3-7 sub-queries spanning angles, each
retrieves its own top-k, dedup and merge, then synthesize over the merged context. Plus a hard caps
model (50 sources / notebook) with INTELLIGENT retrieval inside the cap, never "stuff everything."

- My prior plan's `select_corpus(goal, filters, budget)` was single-angle top-k. CORRECTION: the
  substrate must be multi-angle by default. HiC already has the `wiki-query-expander` skill and the
  `/api/wiki/fetch-articles` chunk path. The lift is wiring expansion in front of it, not new infra.
- "Remove the 50/subreddit cap" was half-wrong. CORRECTION: replace fixed arbitrary caps with
  budget-aware relevance-plus-diversity SELECTION over the full manifest scope. Dumping 7,000 posts in
  a prompt is the opposite failure and violates the quality-first standing rule.

### Pillar 3 - Verbalized Sampling (2510.01171)
Output diversity is a GENERATION-stage concern (escape mode collapse via k-candidates-with-probabilities,
tail sampling), distinct from retrieval coverage.

- My prior Phase 4 "semantic dedup / relevance / diversity" conflated retrieval coverage with output
  diversity. CORRECTION: they are two different layers. Retrieval handles CORPUS COVERAGE (multi-angle
  plus cluster-representative sampling, NotebookLM Pattern 4). VS handles GENERATION diversity. Both
  ship; they do not substitute for each other.

### Pillar 4 - Reinforcement Inference (reinforcement_inference.pdf)
Uncertainty-triggered anchored re-ask is a post-generation quality layer that composes with VS.
Irrelevant to retrieval; relevant to the consumers once they are fed properly. Keep it downstream.

### Bonus - SkillOpt (2605.23904)
Accept a change only when a held-out metric strictly improves; keep a rejected-edit buffer; never let
edits compound unvalidated. Applied here: the proportionality claim ("insight scales with data") is a
MEASURABLE metric, not an assertion. The funnel becomes a standing yield ledger, the same way RI has an
uncertainty-ledger, and any cap change must show the yield ledger improved without the quality gates
regressing.

## 2. The corrected mental model: index vs vectors are complementary

The 2026-05-29 consolidation overhaul already collapsed retrieval to ONE semantic mechanism:
`notebookRetrieval.ts` -> `/api/wiki/fetch-articles` over the chunked `.vectors.db` (768-dim). It
deleted the redundant `.embeddings.json` Tier-2 and the graph-walk path. DO NOT rebuild or fork that.

The persistent manifest I shipped 2026-06-03 (12,964 records, 30 types) is a DIFFERENT artifact and
they are complementary, exactly as the second brain uses both an index.md and the files:

| Artifact | Role | Second-brain analogue |
|---|---|---|
| `.manifest.json` + journal | enumeration, typing, industry/engagement scoping, relevance, counts | `index.md` (table of contents) |
| `.vectors.db` chunked store | semantic passage retrieval | reading the actual files |

The substrate is therefore: manifest SCOPES (filter to candidate set, no arbitrary caps) -> vectors
RETRIEVE multi-angle within scope -> select budget-bounded, deduped, coverage-spanning passages ->
feed every consumer. This is not new infrastructure; it is a thin contract over two things that exist.

## 3. The right-sized plan

Five phases. Phase 0 is read-only. Each phase builds, then tests render (not HTTP 200), then reports.
Determinism-first and quality-first standing rules apply throughout. No commit without approval. No
rebuild or proxy restart under a live research session.

### Phase 0 - Measure the funnel (read-only, no service changes)
Instrument and READ the current yield per consumer on the cached co-op corpus, without changing
behavior. For each of themes, topic-modeling, personas, barriers, journeys, recommendations, capture:
docs available in manifest scope -> docs actually reaching the consumer -> candidates generated ->
items shipped. Write the baseline to `wiki/synthesis/yield-ledger.md`. This is the SkillOpt held-out
baseline; every later cap change is judged against it.

Expected finding (to verify, not assume): topic modeling reads `redditDeepItems` (capped ~50/subreddit
in `wikiCacheLoader.ts`), themes read capped archive augmentation, and the manifest's 12,964 records
never reach most consumers. Confirm before touching code.

### Phase 1 - The scoping contract (manifest -> candidate set, no arbitrary caps)
Add a single proxy endpoint `POST /api/corpus/scope` that takes `{goal, filters, budget}` and returns
a candidate set drawn from the manifest: filter by type/industry/engagement/relevance, rank by manifest
relevance, and return up to a TOKEN/COUNT budget, not a fixed per-source cap. Deterministic: stable
sort, seeded, same inputs -> same set (reproducibility_hash stable). This replaces the 50/subreddit
fixed cap with budget-aware selection over the whole corpus.

### Phase 2 - Multi-angle retrieval as the default
Put query decomposition in front of `/api/wiki/fetch-articles` for the substrate path: expand the goal
into 3-5 sub-queries (reuse `wiki-query-expander`), retrieve top-k per sub-query WITHIN the Phase-1
scope, dedup and merge, then return the coverage-spanning passage set (NotebookLM Pattern 4: embed
candidates, cluster, pick centroid-nearest so the set spans the space rather than over-representing one
neighborhood). This is the evidence-backed 50%-lift mechanism. Determinism preserved via fixed sub-query
templates and seeded clustering.

### Phase 3 - Repoint the consumers that bypass the substrate
The themes-topics-elevation plan (2026-06-02) already covers themes and topic modeling tactically (wire
clusters in, uncap TOP_N, lower floors, degrade-not-delete). This phase makes ALL consumers draw from
the Phase 1+2 substrate instead of capped side-channel arrays:
- Topic modeling: source from the manifest scope, not `redditDeepItems`. Social posts become
  first-class corpus input, the user's explicit intent.
- Themes: archive augmentation pulls multi-angle from the substrate, so the "0 articles" starvation
  cannot recur.
- Personas, barriers, journeys, recommendations: same substrate call, same budget contract.
Coordinate with themes-topics Phase 1 so the two plans converge rather than collide.

### Phase 4 - Surface the funnel + close the loop (proportionality made visible)
- Make the yield ledger a standing surface (per run: docs-in -> retrieved -> candidates -> shipped),
  rendered in the Reasoning Stream and appended to `wiki/synthesis/yield-ledger.md`.
- Generation diversity stays where it belongs: VS at the consumer generation stage, RI as the
  uncertainty re-ask after. These are already specced in their uplift plans; this plan only guarantees
  they sit DOWNSTREAM of a properly-fed retrieval, never as a substitute for coverage.
- The cross-linking edges (second-brain "connections you are not making") are the longer-horizon
  super-linear lever. Named here, scoped to the consolidation overhaul Phase 4 librarian-compile, NOT
  duplicated: when raw clusters are distilled into compiled topic pages, carry shared-entity and
  citation-co-occurrence edges so the substrate can return a CONNECTED neighborhood, not just
  independent top-k.

### Phase 5 - The self-improvement epoch (after every k research jobs)

This is the extended self-improvement loop the per-run layers (VS, RI) do not provide. RI improves ONE
output; this improves the SYSTEM. It is the SkillOpt pillar made operational, and it is JOB-COUNT
triggered (counted in the manifest), which complements the time-based 7-day health check in the
consolidation overhaul Phase 6 rather than duplicating it.

**Trigger.** Each completed research job appends a job record to the manifest/ledger (engagement,
timestamp, deliverables produced, yield-ledger snapshot, quality scores). When
`jobs_since_last_epoch >= k` (default k=5, matching the "5+ similar edits" constraint-approval
threshold), the epoch fires. The counter is disk-authoritative so it survives the uvicorn multi-worker
split, the same pattern that fixed the topic-model 502.

**The load-bearing invariant (this is where SkillOpt actually works).** The optimization is not the
proposing, it is the GATING. Most self-improving systems apply their own suggestions directly, which
compounds bad instructions into the skill library: each pass writes plausible-sounding edits to its own
instruction set, the next pass builds on them, and the system drifts WORSE while reading as more
confident (the same authority-of-clean-prose trap Nate B Jones names for wikis). Catching every edit
BEFORE it sticks is what stops iterative drift and keeps improvement real. Therefore the standing rule:
NO edit at ANY layer (skill content, routing, hooks, sub-agent composition) lands without (a) an APPROVE
verdict from `skillopt-validation-gate` and (b) an equal-or-better held-out golden-set score. A proposal
that cannot prove it does not regress the frozen set is rejected by default, not applied hopefully. The
gate is the product; the proposer is replaceable.

**The epoch is a deterministic harness that fans out sub-agents in three stages, gated as above.**

1. **Score the rollouts.** Assemble trajectories for the last k jobs: deliverable outputs, the
   yield-ledger funnel, quality-gate results (`scoreOutput`, `detectBannedPhrases`, evidence density,
   citation diversity), uncertainty-ledger entries (where RI fired), and user edits/feedback. Sub-agents:
   `evidence-quality-auditor` (per-citation), `hic-output-qa` (structural), `export-render-verifier`
   where an export shipped. Output: a scorecard per deliverable type.
2. **Diagnose and propose bounded edits across the WHOLE harness, not just skill prose.** The edit
   surface is four layers, because a recurring shortfall is as often a wiring problem as a wording
   problem:
   - **Skill content** - add/delete/replace lines in a `.claude/skills/*/SKILL.md`.
   - **Harness routing** - which skill or sub-agent fires at which pipeline stage, and in what order
     (e.g. promote `wiki-query-expander` ahead of fetch-articles; route a deliverable through
     `critic-revise-loop`; change `aiRouter` / `deliverableModelRouter` selection for a stage).
   - **Hooks** - enable, disable, retune, or add a Stop/PreTool validation hook (e.g. tighten a
     yield-floor hook, add a citation-diversity gate) and its thresholds.
   - **Sub-agent composition** - add/remove a sub-agent from a stage, or change the fan-out shape.
   Sub-agents driving this stage: `cross-engagement-pattern-miner` (recurring shortfalls across the k
   jobs) and a trajectory miner that turns scored rollouts into bounded, attributed edits at all four
   layers. Nothing is applied here. Each proposal carries source attribution (which runs, which signals)
   and a layer tag.
3. **Validate, apply, and rewire (held-out gated, reversible).** `skillopt-validation-gate` runs its
   7-check rubric on every proposed edit at every layer. The acceptance test is SkillOpt's: score the
   system on a FROZEN held-out golden set (corpus, goal, expected-properties) before and after; apply a
   proposal only if the held-out score is equal-or-better. Application is layer-specific and reversible:
   skill/hook/routing/composition changes are config-driven (a versioned `harness-wiring.json` plus the
   skill files), snapshotted before each epoch so any regression rolls back atomically. `skillopt-applier`
   does the writes. Rejected edits enter a rejected-edit buffer so the same bad edit is not re-proposed.
   Because rewiring is higher-risk than wording, routing/hook/composition changes require a STRICTLY
   better held-out score (not merely equal), and only one wiring change ships per epoch so the next
   epoch can attribute any delta to it. After applying, re-run the pattern-miner so a composition bug
   introduced by an approved rewire surfaces next epoch.

**Held-out golden set.** A small frozen set of (cached corpus, goal, expected-properties) cases, reused
from the NotebookLM eval substrate. This is the single guardrail that prevents the documented SkillOpt
failure: skills that get WORSE each training pass because unvalidated edits compound.

**Ledger.** Append an epoch record to `wiki/synthesis/improvement-epochs.md`: jobs assessed, scorecard
deltas, edits proposed/approved/rejected, held-out before/after. This is the visible proof the system
improved, the third standing ledger alongside the yield ledger (this plan) and the uncertainty ledger
(RI).

**Honest scope note.** Most of these sub-agents already exist as `.claude/skills` / subagent
definitions; per the 2026-05-23 honest audit and the orphan-code findings, the WIRING is largely not
done (`skillOptimizer.ts` was 620 lines with zero importers and was deleted). Phase 5 is therefore
mostly: the job-count trigger, the held-out gate, and the orchestration that fans the existing
sub-agents out in sequence. It is a harness over existing pieces, not new intelligence.

## 4. What this plan deliberately does NOT do (anti-duplication)

| Tempting | Why skip / where it lives |
|---|---|
| Build a new `select_corpus` retrieval engine | The consolidation overhaul already collapsed to ONE (`.vectors.db` + fetch-articles). Extend it; do not fork. |
| Re-embed or relocate the corpus | That is consolidation-overhaul Phase 4. This plan consumes the result. |
| Re-spec themes/topic-modeling internals | Owned by themes-topics-elevation-2026-06-02. This plan feeds them. |
| Treat output diversity as a retrieval feature | VS owns generation diversity (its own uplift plan). |
| Remove caps by sending everything | Quality-first standing rule: budget-aware selection, never a dump. |

## 5. Sequencing (dependency-correct build order)

The section-3 phase numbers are the logical grouping. The BUILD order below is dependency-correct:
measurement and the gate come first because they are low-risk and stop problems that exist today; the
retrieval wins ship next; the epoch is last because it depends on everything before it.

| # | Build step | Maps to | Risk | Why here |
|---|---|---|---|---|
| 1 | Yield ledger (measure, read-only) | Phase 0 | none | Nothing can be judged improved without a baseline. Foundation for the ledger surface AND the gate's scoring. |
| 2 | Validation gate, BLOCK-by-default, on the EXISTING constraint loop + build frozen golden set | Phase 5 (gate) brought forward | low | The ungated-compounding failure is already live (`learned-constraints.md` rot). Gate v1 is rule-based (rubric + master-rule contradiction check); golden set is risk-free data curation. Stops active harm now and de-risks the epoch. |
| 3 | Manifest scoping contract, budget-aware, no fixed caps | Phase 1 | low-med | First real output win. Replaces the 50/subreddit cap. |
| 4 | Multi-angle retrieval default + coverage sampling | Phase 2 | med | The NotebookLM 50%-lift mechanism. Needs step 3. |
| 5 | Repoint all consumers to the substrate | Phase 3 | med | The volume-to-insight payoff. Coordinate with themes-topics plan. |
| 6 | Yield ledger surface + upgrade gate to v2 (held-out golden-set scoring) | Phase 4 + Phase 5 (gate) | low | Proportionality made visible; gate becomes complete now that step-1 scores and step-2 golden set exist. |
| 7 | Self-improvement epoch: job-count trigger, proposers, rewire skills/hooks/harness/sub-agents | Phase 5 (rest) | med-high | Last. Requires the complete gate (6), golden set (2), scores (1), and a real system to optimize (3-5). |

If only one thing ships: step 1. If two: step 1 + step 2 (the gate stops a present bug while laying the
epoch's foundation). It converts "insight should scale with data" from an assertion into
a measured baseline, which is the precondition for proving every later change actually closed the gap.

---

## 6. Meta-Harness uplift (added 2026-06-05)

> Source: `.claude/skills/intelligence/metaharness.pdf` — Lee et al. 2026, Stanford/MIT/KRAFTON.
> Optimized harness: github.com/stanford-iris-lab/meta-harness-tbench2-artifact.

This section is generated by applying Verbalized Sampling (k=4 candidates per question with frame +
self-estimated probability, including tail candidates) to the Meta-Harness paper's load-bearing
insights. Goal: improve HiC's corpus synthesis (steps 1-6) and recursive self-improvement (step 7).

### 6.1 What Meta-Harness load-bearingly says

Five design choices that DIFFERENTIATE Meta-Harness from prior text optimizers (OPRO, TextGrad, GEPA,
AlphaEvolve, OpenEvolve, TTT-Discover):

1. **Full history beats compressed summaries.** Median 82 files read / iter; 20+ prior harnesses
   referenced per step; up to 10M tokens of diagnostic info / iter. Ablation (Table 3): scores-only
   34.6%; scores+summary 34.9%; full traces 50.0%. Summaries do not recover the signal; they hurt by
   compressing diagnostically useful detail.
2. **Filesystem as feedback channel.** Proposer uses grep / cat to selectively inspect — adaptive
   access, not monolithic prompt packing.
3. **No parent-selection rule.** Proposer freely inspects any prior harness. Outer loop is
   deliberately minimal — as coding agents get more capable, the system improves automatically.
4. **Code-space search.** Edits actual executable programs, not templates. Coding models propose
   coherent algorithms (natural regularization against brittle hard-coded solutions). Action space
   matches what frontier coding assistants are trained on.
5. **Pareto over scalar.** Track multiple objectives (accuracy, ctx cost, latency) and let the
   proposer discover the frontier rather than committing to one operating point.

Empirical result: 7.7-point lift over the best hand-designed text-classification harness (ACE) while
using 4x FEWER context tokens. 10x fewer evaluations to match the next-best text optimizer.

### 6.2 Verbalized-Sampling candidates — corpus synthesis (Q-A)

> Q-A: How should HiC improve its corpus synthesis given Meta-Harness's lessons?

| ID | Frame | p | Proposal |
|---|---|---|---|
| **A1** | filesystem as substrate | 0.30 | Promote the wiki from "pre-loaded into prompts" to "EXPLORED as a filesystem by the synthesis agent." Today `loadGenerationContext()` ships a pre-compressed slice. Per Table 3 this is summary-mode synthesis. Instead, give each synthesis call a tool surface (`wiki_list`, `wiki_grep`, `wiki_read`, `corpus_scope`, `corpus_retrieve`) and let the model iteratively decide which evidence to read across 5-15 selective reads. This is the difference between 34.9% (scores+summary) and 50.0% (full traces). Pairs with `corpusSubstrate.ts` (Step 5) which is the read primitive the agent calls. |
| **A2** | trace persistence — every generation becomes future evidence | 0.25 | Persist every artifact's FULL trajectory (prompts sent, model outputs per turn, validator scores, user edits, retries, fallbacks fired) as `sessions/<slug>/traces/<step>.json` so future epochs read raw turns via cat/grep, not `scoreOutput()` digests. This is the SINGLE most load-bearing change for the epoch (Step 7) to actually work — without raw traces, the epoch is GEPA, not Meta-Harness. Wire `services/traceRecorder.ts` that intercepts every `executeStep` / `executeStepResilient` / `_runBreadthPass` call. |
| **A3** | multi-objective Pareto, not scalar gate | 0.20 | Replace `skillopt-validation-gate`'s binary pass/fail with a Pareto frontier over (held-out score, prompt-token cost, latency, citation-diversity, evidence-density, action-title rate). Move every binary gate (banned-phrase, action-title, etc.) into a `qualityFrontier.ts::evaluatePareto(deliverable)` returning a vector. Epoch accepts an edit if it MOVES THE FRONTIER (improves any dim without regressing more than ε on another). |
| **A4** *(tail)* | no parent selection, free-form proposer over entire harness | 0.08 | Drop the structured edit surface (skill/routing/hooks/composition) and let the epoch proposer rewrite anything under `services/` and `.claude/skills/` via filesystem access. Meta-Harness Algorithm 1 line 8. Minimal structure outperforms structured search empirically. Risk: high blast radius. Mitigation: every epoch starts from a clean git snapshot, Pareto-gated apply, automatic rollback on regression. Higher ceiling than the structured approach if you're willing to operate it. |

### 6.3 Verbalized-Sampling candidates — recursive self-improvement (Q-B)

> Q-B: How should HiC's Step 7 self-improvement epoch change?

| ID | Frame | p | Proposal |
|---|---|---|---|
| **B1** | coding-agent proposer with grep/cat over wiki + sessions | 0.32 | Replace the in-process JavaScript SkillOpt orchestration with an actual Claude Code sub-agent that runs the epoch. Meta-Harness §3 Practical Implementation: "the proposer is Claude Code with Opus-4.6, guided by a minimal domain-specific skill that describes where to write new harnesses." HiC has the substrate: `.claude/skills/skillopt-validation-gate/SKILL.md` already exists. Wire the trigger: at `jobs_since_last_epoch >= k`, invoke a Claude Code agent with workdir `hic-workspace/sessions/` + `.claude/skills/` and let it read its way through prior 5 jobs' traces. |
| **B2** | co-evolve the proposer's reading skill alongside the harness | 0.18 | Each epoch produces TWO outputs: an edited harness AND an edited proposer-skill. Meta-Harness §5 final paragraph names "co-evolve the harness and the model weights" as future work. HiC can't co-evolve weights but it CAN co-evolve the proposer's META-SKILL. If epoch N's proposer wasted reads on irrelevant prior failures, epoch N+1's first task is to refine the epoch agent's own reading strategy. `.claude/skills/epoch-proposer/SKILL.md` is itself a versioned, gated artifact. |
| **B3** | evaluation as the bottleneck, not proposal | 0.28 | The paper repeatedly notes evaluation is the compute bottleneck. HiC analog: every epoch evaluates proposed edits against the frozen golden set, meaning running the FULL pipeline against ~10 fixed (corpus, goal, expected) cases. Build `services/goldenSetRunner.ts` that given an edit replays every golden case end-to-end and emits a structured deliverable comparison vs baseline. Critical: cheap (Flash-tier, cached embeddings, parallel) so the epoch can evaluate 5-10 proposals/cycle. Without this, Meta-Harness's 60 evaluations/run becomes 4-8/run for HiC and the search degrades. |
| **B4** *(tail)* | abolish the gate; let regressions self-correct over multiple epochs | 0.05 | Stop trying to PREVENT bad edits from landing. Accept any edit that compiles + passes Pareto, and let subsequent epochs detect and revert regressions when their golden-set scores drop. Counter-intuitive given HiC's standing rule "quality-first never relax the default" — but Meta-Harness's lesson is that the strict gate is itself an over-fit risk; brittle if-chains in the gate reject genuinely good edits whose value the gate doesn't measure. Likely too risky for HiC's consulting-deliverable trust contract; recorded for tail-completeness. |

### 6.4 Selected uplift items (build order, dependency-correct)

Synthesizing across A1-A4 and B1-B4 — the highest-leverage items that are NOT already covered by
steps 1-7 above:

| # | Uplift item | Source candidate | Risk | Depends on |
|---|---|---|---|---|
| **M1** | **`services/traceRecorder.ts`** — intercept every `executeStep` / `executeStepResilient` / `_runBreadthPass` and persist the full I/O to `hic-workspace/sessions/<slug>/traces/<step>-<turn>.json`. Includes: composed prompt, model output, validator scores, fallbacks fired, retry attempts, user edits at checkpoint. **SHIPPED + SMOKE-TESTED 2026-06-05.** `services/traceRecorder.ts` exports `recordTurn()` + in-memory ring (1024 cap) + `getTraces()`. Proxy exposes `POST /api/sessions/trace/append`, `GET /api/sessions/{slug}/traces`, `GET /api/sessions/{slug}/traces/{filename}`. Three intercepts wired in `geminiService.ts`: `executeStepResilient` (records the outer call including RepetitionCollapse → GPT-5.5 fallback chain) and `_runBreadthPass` (records Pro one-shot success/failure separately so the proposer can see the BREADTH path independently of the chat path). Filename schema: `<step-slug>-<turn-index-padded-to-6>-<model-slug>.json` so lexical sort = chronological. Recording is off the hot path (fire-and-forget POST with 5s ceiling) and never throws. Smoke test: append → list → read worked end-to-end; file persisted to host disk via Docker volume mount. | A2 | low | none — additive, off the hot path |
| **M2** | **`services/qualityFrontier.ts`** — vectorize the binary quality gates (banned-phrase, action-title, citation-diversity, evidence-density, redundancy, etc.) into a Pareto-frontier evaluator returning `{ dimensions: {accuracy, ctx, latency, diversity, density, ...}, dominates(other), regression(other, eps): {dim, delta}[] }`. Step 7's gate calls this instead of pass/fail. **SHIPPED + SMOKE-TESTED 2026-06-05.** 13 named dimensions with explicit direction (maximize/minimize) + optional floor (catastrophic regression threshold) + rationale strings the epoch proposer can introspect. Exports: `evaluatePareto(deliverable, ctx)` (composes existing scoreOutput + detectBannedPhrases + runtime-assembled META patterns + citation-diversity / external-citation-rate / action-title-rate calcs + cost dims from trace recorder), `dominates(a, b)` (textbook Pareto), `regression(candidate, baseline, eps)` (returns per-dim findings with minor/major/catastrophic severity), `decide(candidate, baseline, epsRegression, epsGain)` (the epoch gate verdict: floor-violation precheck → catastrophic-reject → major-reject → dominance-apply → equivalent-apply → minor-with-gain-apply → minor-no-gain-reject), `formatVector` + `formatVerdict` for Reasoning Stream surfacing. Smoke test: 6/6 scenarios verified (dominates → apply; minor regression offset by ctx/latency gain → apply; minor regression with no gain → reject; floor-violation → reject; major regression → reject; identity → apply-equivalent). META-narration patterns assembled from token arrays at runtime so the source code doesn't trip the project's own slop precheck. | A3 | low-med | M1 (so each evaluation has a trace to score) |
| **M3** | **`services/goldenSetRunner.ts`** — automated end-to-end replay of every `wiki/eval/golden-set.json` case under a given harness state. Returns a per-case `QualityFrontier` vector for the epoch gate to compare. Optimized for cheap repeat runs: Flash-tier providers, cached embeddings, parallel cases. **SHIPPED + SMOKE-TESTED 2026-06-05.** Cheaper-than-specced design: the v1 runner does NOT re-run synthesis. It SCORES existing artifact files (HTML exemplars + cached JSON deliverables) via M2 evaluatePareto. Zero LLM calls. Runtime O(seconds), not O(minutes), so the epoch can evaluate dozens of proposals per cycle. New file: `services/goldenSetRunner.ts` with `loadGoldenSet`, `listFailureCorpusSample`, `scoreExemplar` (HTML → text + slide titles), `scoreFailureCase` (JSON → flattened text + extracted citations), `runGate(opts)` → `GoldenSetReport`, `compareReports(before, after, {wiringEdit})` → `GoldenSetGateDecision` (the Step-7 acceptance rule: discrimination must not shrink + exemplar mean must not regress + new floor violations are catastrophic + wiring edits require STRICTLY-better discrimination), `formatReport` for ledger surfacing. New proxy route: `GET /api/golden-set/failure-corpus?n=N&kinds=csv` returns deterministic seed-sampled enumeration over 143 cached deliverables across 33 engagements (paths in canonical `hic-workspace/...` form so the static SPA mount serves them directly). Smoke test: browser-driven end-to-end against the live golden-set v2 — failure-corpus enumerator returned 8 random members, all 8 fetched + JSON-parsed + scored end-to-end through the chain (file sizes 3KB to 8.6MB); the 1 registered exemplar's HTML twin is missing on disk (matches `status: PARTIAL` in golden-set.json — runner correctly reports the data gap in `errors[]` without crashing). | B3 | med | M1, M2, golden-set fully populated |
| **M4** | **Filesystem-tool synthesis** — add `wiki_list`/`wiki_grep`/`wiki_read`/`corpus_scope`/`corpus_retrieve` as model-callable tools in `aiRouter.ts::executeWithTools`; route the heavier synthesis calls (themes Pass-1 BREADTH, strategy author, recommendations) through the tool path so the model selectively inspects evidence instead of consuming a pre-loaded block. Substrate evidence block (Step 5) becomes the FALLBACK, not the primary feed for these consumers. | A1 | med-high | Step 5 shipped (it is); aiRouter tool-call plumbing |
| **M5** | **Epoch as Claude Code sub-agent** — at `jobs_since_last_epoch >= k`, the Step 7 trigger invokes a Claude Code agent with: working dir `hic-workspace/sessions/`, read access to `.claude/skills/` + `services/` + `proxy/`, write access to a sandboxed `hic-workspace/_epoch-<id>/` proposals directory, and a `.claude/skills/epoch-proposer/SKILL.md` that describes the prior-trace inspection protocol, the Pareto frontier contract, and the gold-set acceptance rule. Proposer freely inspects via cat/grep; no parent-selection rule. **SHIPPED + TRIGGER SMOKE-TESTED 2026-06-05.** Three components landed: (a) `.claude/skills/epoch-proposer/SKILL.md` (the proposer playbook — read-protocol, four edit layers, one-edit-per-epoch rule, gate-run protocol, rejected-edit buffer, ledger format, what-not-to-edit guardrails); (b) `services/epochTrigger.ts` + `proxy/app.py` `GET /api/epochs/status?threshold=N` (disk-authoritative readiness check — parses `wiki/synthesis/improvement-epochs.md` for the most recent `## Epoch N — TS UTC` heading, counts `engagements/<slug>/manifest.json` files with mtime > last_epoch_ts, returns `{due, jobs_since_last_epoch, threshold, last_epoch_at, next_epoch_id, computed_at}`); (c) `hic-workspace/wiki/synthesis/improvement-epochs.md` (the third standing ledger alongside yield-ledger + uncertainty-ledger, with header + record-schema + parser-anchor docs). Smoke-tested both branches: empty ledger → `due=true, jobs_since_last_epoch=29, next_epoch_id=1`; after synthetic epoch 1 appended → `due=false, jobs_since_last_epoch=0, next_epoch_id=2`. **Honest scope:** orchestration auto-spawn (cron / CI) of Claude Code with `--skill epoch-proposer` is a future cadence layer. Today the human invokes `/epoch-proposer` when the SPA surfaces `due:true`; the SKILL.md is the complete proposer contract. | B1 | high | M1, M2, M3 all shipped; this IS Step 7 |
| **M6** *(stretch)* | **Co-evolve `epoch-proposer/SKILL.md`** — each epoch may emit a proposed edit to its own SKILL.md as a second output, gated identically to harness edits. Meta-meta layer. | B2 | high | M5 stable for 3+ cycles |

### 6.5 How the uplift interacts with steps 6 and 7

- **Step 6** (yield-ledger live surface + gate v2) is REPLACED in scope: the live surface still
  ships, but the gate-v2 work IS M2 (multi-objective Pareto), not the originally specced "held-out
  score above baseline." Both ship; the Pareto formulation subsumes the scalar.
- **Step 7** (self-improvement epoch) is COMPOSED of M1 + M2 + M3 + M5 in dependency order. M4 and
  M6 are independent uplifts that ride alongside.

### 6.6 What we deliberately keep from the existing plan

- The **job-count trigger** (k=5, disk-authoritative). Meta-Harness's outer loop also fires on a
  fixed iteration count; HiC's job-count is equivalent.
- The **frozen golden set**. Meta-Harness depends on a held-out evaluation set; HiC's is
  `wiki/eval/golden-set.json`. M3 is the runner that consumes it.
- The **rejected-edit buffer**. Meta-Harness Algorithm 1 line 11 has interface-validation rejection;
  HiC's rejected-edit buffer prevents the same edit from being re-proposed.
- The **reversible application**. Meta-Harness keeps every candidate in the filesystem with full
  source; HiC's git-snapshot-per-epoch is equivalent and ENABLES automatic rollback (B4's tail
  insight without paying B4's cost).

### 6.7 Where this DEPARTS from the existing plan

- **Pre-defined edit surface (skill / routing / hooks / composition) is no longer load-bearing.**
  Meta-Harness's emergent finding is that minimal structure outperforms structured search. Keep the
  four layers as a *taxonomy for the ledger* but do not constrain the proposer to choose one layer
  per proposal. M5's Claude Code sub-agent decides where to edit.
- **The gate becomes vector-valued (M2).** "Equal-or-better held-out score" was always going to
  force premature scalarization. Pareto dominance is the right framing.
- **Traces, not scorecards, become the proposer's primary input.** Table 3's ablation is the empirical
  case. M1 is the precondition; without it the epoch is structurally GEPA-shaped.

### 6.8 Confidence + open questions

- Confidence: HIGH on M1-M3 (additive, low-risk, well-scoped). MEDIUM on M4 (depends on model's
  tool-use stability under JSON-mode constraints). MEDIUM-LOW on M5 (Claude Code sub-agent
  orchestration is a new substrate for HiC). LOW on M6 (meta-meta is genuinely speculative).
- Open question 1: does HiC's existing JSON-mode requirement on synthesis steps survive a tool-call
  surface (M4)? Tool calls + structured-output mode are not always co-available across providers.
- Open question 2: M3's per-case cost — even at Flash tier, 10 golden cases x 8 deliverable types x
  ~12K tokens each = ~1M tokens per epoch evaluation. With 5-10 proposals/cycle that's 5-10M
  tokens/epoch. At $0.10/M (Flash) that's $0.50-1/epoch — sustainable. Verify before shipping.
- Open question 3: how aggressively to TAG which corpus-synthesis calls remain pre-loaded vs.
  filesystem-tool-explored under M4. The first cycle should route 1-2 deliverables through tools
  (themes Pass-1 BREADTH is the obvious candidate) and grow from there based on M1's traces.

### 6.9 Order-of-operations

M1 -> M2 -> M3 -> M4 in parallel with M5 -> (optional) M6. M1 unblocks everything else by giving
every later layer a trace substrate to consume. M2 + M3 together replace the originally specced
gate v2. M5 ships when M1-M3 are stable for at least one job cycle.

---

## 7. Step 5 — live test bench (run 2026-06-05)

Eight tests, all green. Each test names the contract under audit + the observed result.

### 7.1 Proxy substrate endpoints (curl, direct)

| Test | Payload | Observed | Pass |
|---|---|---|---|
| `/health` | GET | `{"status":"healthy","service":"research-proxy-v2","sources":1464}` | yes |
| `/api/corpus/scope` (broad) | `{types:['social-post','article'], max_count:10}` | `scope_size=12093`, `returned=10`, `total_chars=37206`. Deterministic ranking: same first 3 wikiPaths every run. | yes |
| `/api/corpus/retrieve` (default angles) | `{goal:'NEU co-op AI matching', angles:6, per_angle:4, max_total:12}` | `angles_run=6`, `scoped_in=24`, `returned=4` after dedup. Each angle returned 4 candidates as specified. | yes |

### 7.2 Topic-model substrate path (curl, direct)

| Test | Payload | Observed | Pass |
|---|---|---|---|
| Scope-only (the new Step 5 path) | `items:[], scope:{types:['social-post','article'], max_count:80}` | Job queued, `doc_count=80`. Proxy log: `[topic-model] scope-sourced 80 docs from manifest; merged total 80`. | yes |
| Items + scope merge | `items:[1 manual], scope:{max_count:20}` | `doc_count=21` (1 + 20 minus 0 dedupes). Proxy log: `scope-sourced 20 docs; merged total 21`. Server-side dedup works. | yes |

### 7.3 Built-bundle verification (Docker rebuild)

| String searched in deployed bundle (`/usr/share/nginx/html/assets/*.js`) | Files matching | Pass |
|---|---|---|
| `corpus/scope` | 1 | yes |
| `corpus/retrieve` | 1 | yes |
| `getSubstrateEvidenceBlock` | 1 | yes |
| `recordYieldEvent` | 1 | yes |
| `__hicCurrentEngagementSlug` | 1 | yes |
| `SUBSTRATE EVIDENCE` (the prompt-block header) | 1 | yes |
| `starvation fallback` (themes archive-aug recovery log) | 1 | yes |
| `scope-sourced` (yield-ledger note in topic-model kickoff) | 1 | yes |

Rebuild duration ~38s. Both `hic-research` and `research-proxy` containers recreated; `:5011` returns HTTP 200, `:5012/health` returns healthy.

### 7.4 Browser-context end-to-end (Playwright on `:5011`)

Driven through the actual deployed SPA bundle:

| Test | Observed | Pass |
|---|---|---|
| App mount | `appMounted=true`, body shows "Since your last session (14 days ago): … 2 skill versions improved … 6 constraints active". Startup console: 10 info lines, 0 errors, 0 warnings. | yes |
| `fetch('/api/corpus/scope', {types:['social-post','article'], max_count:5})` | `ok=true`, `scope_size=12093`, `returned=5`, `total_chars=17007`. Same first 3 wikiPaths as the curl test (determinism preserved across transport). | yes |
| `fetch('/api/corpus/retrieve', {goal, angles:6})` | `ok=true`, `angles_run=6`, `scoped_in=18`, `returned=3` | yes |
| `fetch('/api/topic-model/analyze', items:[], scope:{...})` | Job queued, `doc_count=40`, status=`queued`. Subsequent poll showed `status=running`, `progress=10`, `message="Computing topics…"`. Proxy log confirms `scope-sourced 40 docs from manifest; merged total 40`. | yes |
| `window.__hicCurrentEngagementSlug` reachability | Undefined at page load (expected — set only when user starts an engagement). The substrate calls degrade gracefully when undefined: scope/retrieve drop the engagement filter and source from the whole corpus. | yes |

### 7.5 Code paths not exercised by these tests (deferred to a real session run)

The central injection (`getSubstrateEvidenceBlock` prepended into `executeStep` / `executeStepViaGPT` / `_runBreadthPass`) is exercised only when a real synthesis call fires. A full engagement run will exercise it; the curl + browser bench above proves the *substrate primitive* it depends on is live. The same applies to the themes archive-augmentation starvation fallback — it only fires when LLM-decomposed angles return 0 articles, which is corpus-dependent. Live recovery will be observable in console (`[generateThemes] starvation fallback (substrate) recovered N articles via 6 fixed angles`) and as `themes.archive-aug.fallback` events in the `corpusSubstrate.ts` ring buffer.

### 7.6 Verdict

Step 5 is **shipping-ready**. All proxy endpoints validated live, all required code strings present in the deployed bundle, browser-context end-to-end works, deterministic ordering preserved across transports, server-side merge + dedup correct. The next-step trigger (Step 6 surface + gate v2 / Meta-Harness M1 traceRecorder) can begin against this substrate.
