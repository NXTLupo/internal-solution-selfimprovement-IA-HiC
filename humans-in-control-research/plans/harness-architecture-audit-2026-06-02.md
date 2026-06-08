# HiC Harness Architecture Audit + Development Proposal (2026-06-02)

Audit by stage-specialist review of the live code (file:line cited throughout the six
underlying reports). Frame: the six harness goals — **relevance, depth, determinism,
consistency, reliability, self-improvement**. This document states the gaps, the
cross-cutting root causes, and a phased build to make the pipeline function as intended.

Pipeline under audit: data gathering -> extraction/corpus -> model selection/routing ->
analysis (themes/topics/personas/recs) -> artifact generation -> self-improvement loop.

---

## EXECUTIVE SUMMARY (the answer first)

HiC is a sophisticated pipeline whose **front half records and intends far more than its
back half enforces or shows.** It works when every provider is healthy and the corpus is
rich; it degrades *silently* otherwise. Five cross-cutting root causes explain the
recurring symptoms (thin themes, wrong sentiment, hollow artifacts, "crashes to landing,"
"no visible change"):

1. **Silent degradation everywhere.** Connector failures, provider fallbacks, parse
   failures, citation misses, and skill-load misses all return empty-success shapes or
   log-only warnings. A run built on 30% of intended evidence looks identical to a
   healthy one. (Gathering R5, Extraction RE1/C2, Routing G4.1, Artifact reliability.)
2. **Non-determinism by construction, despite a determinism-first standing rule.** The
   corpus chunk IDs, the relevance scores, and the identity-bearing LLM calls (persona
   names, recommendation titles, proxy-routed artifacts) run at temperature>0, no seed,
   over a live/stochastically-sorted substrate. The `reproducibility_hash` is corpus-blind
   (collapses to f(goal)); `deriveSeed()` is dead code; the proxy never forwards `seed`.
3. **The routers are theater.** Three router abstractions (`routeTextAnalysis`,
   `providerRegistry`, `deliverableModelRouter.callWithModelChain`) are dead code; the
   live engine (`geminiService.ts`, `corpusChatService.ts`) calls the SDK with hardcoded
   model literals, so health-tracking, the user's model choice, and cross-provider policy
   are bypassed on the highest-traffic paths.
4. **The cognitive chain is broken at its most important link.** Recommendations never
   receive the themes/personas their own prompt claims to review; personas get only
   citation snippets, not the depth-enriched theme findings. There is no shared entity
   identity across deliverables.
5. **The quality/self-improvement back-half is orphaned.** The 26 `validate_*.py` Stop
   hooks run only in Claude Code sessions, NOT against production generation; SkillOpt
   trains on neutral 0.5 scores and writes candidates to ephemeral /tmp; the visual-QA
   detector is on-demand only; there is no structured run telemetry (debugging is
   docker-log archaeology).

The good news: the front half (rollout capture, constraint injection, cluster grounding,
the new RoBERTa sentiment + insightful titles + treemap fixes from this session) is real
and load-bearing. The build below closes the back half and removes the silent-degradation
and non-determinism classes.

---

## GAPS BY HARNESS GOAL (highest-severity, consolidated)

### RELEVANCE
- Source selection is a 5-lens switch + literal regex over a hardcoded ID list decoupled
  from the 200+ SOURCES registry; no goal-semantic match (`analyticalLensService.ts:250`,
  `App.tsx:2966`). [P1]
- Corpus relevance is scored on a **600-char pre-enrichment snippet** and never
  re-scored after the full body is fetched; three conflicting threshold systems make the
  "low-relevance skew" partly a reporting artifact (`researchFabricOrchestrator.ts:1291,
  2029<2033, 1452`). [P0]
- "objective-keyed retrieval: 40 articles" is a `limit`, not a relevance gate; off-topic
  corpora return the 40 least-off-topic items, and themes ship even when 0/N are
  on-objective "by design" (`app.py:8860`, `geminiService.ts:824`). [P1]

### DEPTH
- Recommendations do not receive themes or persona pain points though the prompt asserts
  it reviews them — invites fabricated cross-references (`geminiService.ts:2489, 2500`;
  `App.tsx:2447`). [HIGH]
- Personas enriched on 3 truncated citation labels, not the depth-enriched theme findings
  (`geminiService.ts:2250`). [MED]
- RSS/static bodies hard-capped at 10KB before the 30KB enrichment budget; paywalled
  academic items dropped to zero, silently shifting the corpus to blogs/Reddit
  (`app.py:2139, 6075`). [P1]

### DETERMINISM
- `reproducibility_hash` is corpus-blind: reads `result.documents` which does not exist on
  theme/persona results -> hash = f(goal); the Stop hook validates a constant
  (`geminiService.ts:1701, 2455`; `reproducibilityHash.ts:23`). [HIGH]
- Identity-bearing calls run stochastic: chat session temp 0.1 no seed; persona/recs
  enrichment temp 0.2 (`geminiService.ts:521, 2316, 2574`). `deriveSeed()` is dead code
  (`multiModelResilience.ts:92`). Proxy `/api/ai/gemini` never forwards `seed`
  (`app.py:7413`). [HIGH]
- Corpus chunk IDs are a position counter over a temp-0.2-scored, relevance-sorted list,
  so the same source gets a different `CHUNK_NNN` each run (`researchFabricOrchestrator.ts:
  1386, 2068, 2079`). [P0]
- Gathered corpus is non-deterministic (live feeds + unseeded scoring/refinement) with no
  snapshot/replay. [P0]

### CONSISTENCY
- No cross-source URL/title dedup in corpus assembly; the same article becomes 2-3 chunks,
  inflating apparent convergence (`researchFabricOrchestrator.ts:1998`). [P1]
- Two citation resolvers disagree; `citationResolver.ts:38` header regex never matches the
  live `[CHUNK_NNN]` corpus format and breaks past `CHUNK_999`; resolution misses are
  dropped/placeholdered/whitespaced three different ways (`citationResolver.ts:94`,
  `slidePostProcessor.ts:106`, `app.py:12367`). [P0]
- Two theme namespaces (LLM themes vs cluster topics) named by two models, never
  reconciled; no shared entity id across themes/personas/recs. [HIGH]
- Mid-corpus/mid-tool-loop Gemini->DeepSeek swaps disguised as native responses; DeepSeek
  output is the code's own "AI-slop" (`app.py:7513`, `corpusChatService.ts:4018`). [HIGH]
- Proxy HTML artifacts enforce ~17 slop subs vs the canonical 350+; export==preview holds
  only when Chromium is present (`app.py:11748`, `nxt_slide_export.py:713`). [HIGH]

### RELIABILITY
- `/api/artifact/export-slides` still launches headless Chromium in the request worker —
  the same crash class fixed for /generate this session — with no concurrency cap
  (`app.py:10622`, `nxt_slide_export.py:333`). [HIGH]
- The visual-QA detector that knows every layout defect class is on-demand only; the
  generation path ships with zero structural validation (`app.py:13686`). [HIGH]
- The 26 `validate_*.py` Stop hooks are Claude-Code-session-only; **never enforced against
  production generation** (`hooks.json:3`, zero runtime call sites). Their guarantees in
  CLAUDE.md/MEMORY are false for artifacts users receive. [HIGH]
- Connector failures swallowed (empty-success); `multiSearch`/`executePlan` never surface
  failure reasons; sync `time.sleep` in async retry blocks the event loop; Jina 429
  backoff is process-global (`dataSourceConnectors.ts:136`, `app.py:1820, 1887`). [P0]
- opus temperature-400 guard is a hardcoded `opus-4-[789]` version enumeration, not a
  capability check — `opus-5`/extended deprecation will 400 again (`app.py:7362, 13323`).
  [MED]
- OpenAI account is permanently `insufficient_quota`; `gpt-5.5` in fallback chains is a
  dead leg that burns a timeout cycle per deliverable (`deliverableModelRouter.ts:98`). [HIGH]
- `routeVisionAnalysis` throws on its own google default; heuristic-UX vision is broken
  regardless of branch (`aiRouter.ts:542` vs `:446`). [HIGH]
- Score batch fails-open to 50; office/fallback parser ships binary noise as text;
  image uploads enter the corpus as citable apology strings (`researchFabricOrchestrator.ts:
  1442`, `app.py:6534, 6620`). [P1]

### SELF-IMPROVEMENT
- SkillOpt is a no-op: neutral 0.5 scores, empty failures, candidates to ephemeral /tmp,
  no auto-apply, path-unreachable in container (`app.py:12697, 12718, 12729`;
  `run-skillopt.py:657`). Trajectory-miner load-bearing; validation-gate + applier
  orphaned. [HIGH]
- No source-productivity feedback (the same 0-yield source is re-queried every run);
  GoalRegrade is a guaranteed `0/0` dead path (exact old-goal string match)
  (`analyticalLensService.ts:237`, `app.py:10997`). [P1]
- Two unsynchronized constraint injectors; the proxy injector has no quality gate
  (`app.py:12928` vs `constraintQualityGate.ts`). The "all filtered" startup log is a
  misleading idempotent-on-warm-cache signal, not a failure. [MED]
- No structured run telemetry; cost meter misses the dominant proxy path; fallback events
  invisible (`costMeter.ts` callers = `aiRetryClient.ts` only). [HIGH, cross-cutting]

---

## DEVELOPMENT PROPOSAL (phased, by leverage)

Principle: **make the harness fail loudly and reproduce deterministically before adding
features.** Each phase is independently shippable and verifiable on the real co-op corpus
via the in-container harness pattern established this session (no user tokens).

### PHASE H1 — OBSERVABILITY + STOP SILENT DEGRADATION (reliability foundation)
The meta-gap that makes every other gap invisible. Build first.
1. **`RunReceipt`** — one structured object assembled in the proxy where generation
   happens: per-stage status, provider-per-stage, latency, token cost, fallback/degradation
   events, defect counts, sources attempted/succeeded/failed-with-reason, corpus depth
   histogram, academic-dropped count. Persist per run; surface in the UI (extend the
   existing GenerationReceipt footer into a run panel). Closes the docker-archaeology gap.
2. **`GatheringReceipt`** in `mergeResultsToCorpus` — replace empty-success swallowing with
   explicit failure aggregation; surface "N of M sources failed; academic evidence
   unavailable" in the live feed.
3. **Degradation events as first-class** — every provider fallback, DeepSeek substitution,
   Chromium-unavailable export downgrade, and skill-load miss emits a typed event into the
   RunReceipt instead of a log-only warning.
4. **Proxy cost tracking** — wrap proxy artifact/topic LLM calls so Opus/Pro spend is
   counted (today the cost meter misses the most expensive path).

### PHASE H2 — DETERMINISM CONTRACT (reproducibility)
1. **Content-hash chunk IDs** — `CHUNK_<first8(sha(url+title))>` replacing the position
   counter; one shared resolver (kill the dead `citationResolver.ts` path); resolution
   miss -> RunReceipt event, never silent drop.
2. **Seed + temperature=0 on ALL identity-class calls** — wire `deriveSeed(purpose,
   identityKeys)` into persona/recs/strategy calls; forward `seed` through `/api/ai/gemini`
   and the proxy artifact chain; pin temperature=0 for naming/identity regardless of
   provider.
3. **Fix `reproducibility_hash` corpus source** (the `result.documents` bug) so the hash is
   corpus-aware; then use it as a **cache key** (return cached deliverable on hash hit), not
   just a stamp. Write real baselines for the drift validator.
4. **Corpus snapshot/replay** — persist the gathered raw items per engagement; on cached
   re-run, rebuild from the snapshot instead of re-hitting live feeds. Seed the relevance
   scorer + query refinement.

### PHASE H3 — RELIABILITY HARDENING (no hangs, no dead legs)
1. **Bounded Chromium** — semaphore + hard launch timeout around `export-slides` (and any
   render path); surface a `export!=preview` degradation event on Pillow/legacy fallback.
2. **Runtime QA gate (out-of-band)** — run `artifact_visual_qa` as a background task AFTER
   the response returns; store the defect report on the rollout, set `degraded`, and
   optionally trigger one bounded revision. Never inline (that caused the crash).
3. **Port the Stop-hook validators into a shared runtime gate** — a TS/Python module the
   proxy+SPA call inline with a real block-or-degrade decision, so citation/evidence/
   reproducibility/coherence checks actually run against production output.
4. **Provider availability probe** — gate fallback chains on a live health probe, not
   env-key presence; drop `gpt-5.5` from chains while OpenAI is dry; replace the
   `opus-4-[789]` temperature guard with a capability check.
5. **Fix `routeVisionAnalysis`** (add the Gemini branch) or route heuristic-UX vision
   through a working provider.
6. **Async-safe retries** — replace sync `time.sleep` in async paths; make Jina backoff
   per-host; wire the `rate-limit-pacer`.

### PHASE H4 — RELEVANCE + DEPTH (corpus quality)
1. **Enrich-then-score** (or re-score the enriched subset) so relevance reflects the body
   the model will see; collapse the three threshold systems into one.
2. **Goal-semantic source selection** — score the goal against per-source descriptions/
   categories (the registry already carries them); add URL+title dedup in corpus assembly.
3. **Wire the cognitive chain** — pass approved themes + persona pain points into
   `generateRecommendations`; enrich personas on depth-theme findings, not citation labels.
   Introduce a shared entity-id registry so themes/personas/recs reference the same
   findings.
4. **Reconcile the two theme namespaces** — make the LLM theme stage consume the cluster
   topics as its backbone (extends this session's cluster-grounding) so "themes" and
   "topics" are one reconciled set.
5. Fix GoalRegrade (embedding-similarity eligibility, not exact old-goal string).

### PHASE H5 — CLOSE THE SELF-IMPROVEMENT LOOP
1. **Real SkillOpt scoring** — route the auto-trigger through `score-rollouts.py` (real
   scores + failures from the RunReceipt defect data); write candidates to a host-mounted
   reviewable path under `.claude/skills/`; add the `skillopt-validation-gate` + a
   promote step (guarded auto-apply).
2. **Source-productivity feedback** — persist per-source yield per goal-type; feed it into
   the next run's source selection (stop re-querying 0-yield sources).
3. **Unify constraint injectors** — single gated path for SPA + proxy; fix the misleading
   "all filtered" log to distinguish "duplicates of loaded rules" from "rejected garbage."

### Sequencing rationale
H1 first (you cannot fix what you cannot see, and it de-risks every later phase by making
degradation visible). H2 next (determinism is the standing rule and the precondition for
caching, drift detection, and reproducible debugging). H3 removes the crash/hang/dead-leg
classes. H4 raises corpus and synthesis quality. H5 makes the system improve itself with a
real gradient. Each phase: build -> verify on the real corpus via the harness -> RunReceipt
confirms -> ship.

---

## VERIFIED THIS SESSION (already shipped, part of the front-half that works)
- Topic count 4->18 (opus label-temperature 400 fixed at 4 sites); insightful titles;
  RoBERTa-accurate sentiment (struggle topics now negative, verified on real data);
  treemap no-blank/readable/wall-to-wall; empty-corpus gate; cluster-grounded themes;
  de-conflated theme interpretation. These are the proof that the front-half is sound and
  the back-half (H1-H5) is where the remaining leverage is.
