# Harness Plan — SOTA Pattern Integration (2026-06-02)

Factors the "Hardening the HiC Research Harness: A 2024-2026 State-of-the-Art Architectural
Whitepaper" (Downloads/alternative_ideas_on_harness.pdf) into the H1-H5 build in
`harness-architecture-audit-2026-06-02.md`. The whitepaper independently validated all five
audited gaps and mapped each to a NAMED, published pattern with confidence-tagged candidate
solutions (it uses Verbalized Sampling as its own ideation method). It does not contradict the
plan — it sharpens it. Read alongside the audit + the KPI contract.

## The single biggest reframing it adds

> **Make the CORPUS a first-class, content-addressed, schema-validated artifact that flows
> through every stage.** That one change simultaneously fixes the reproducibility hash
> (corpus-aware), the broken cognitive chain (themes->personas->recs share entity IDs), and
> grounding (themes cite chunk IDs that exist). Build it in H1-H2, NOT last.

So H1 (fail-loud telemetry) + H2 (content-addressed corpus) become even more clearly the
foundation everything else consumes.

---

## Phase-by-phase revisions (pattern + caveat)

### H1 — RunReceipt = an OpenTelemetry GenAI trace tree (not bespoke JSON)
- Adopt **OTel GenAI semantic conventions** (`gen_ai.request.model`, `gen_ai.usage.*`,
  `gen_ai.response.finish_reasons`): one root span per run, child `gen_ai` spans per stage,
  each carrying coverage counters (sources_attempted/succeeded, chunks_in/out,
  citations_requested/resolved). Self-host **Langfuse or Arize Phoenix** (OSS, OTel-native). The
  `RunReceipt` is a **materialized view over the trace** that asserts hard invariants.
- **Fail-loud invariants with thresholds:** `DEGRADED` if `sources_succeeded/attempted < 0.9`;
  `FAILED` if any stage returns empty-success (zero rows where >=1 required). Replace every
  empty-success return with a `Result<T, StageError>` so a stage CANNOT silently return nothing.
- Caveat: OTel GenAI conventions are still "experimental" (early 2026) — pin versions.

### H2 — Content-addressed everything + cache-as-determinism (the keystone)
- **Chunk ID = `sha256(normalized_text + source_uri + offset)`**, not a position counter
  (define canonical Unicode/whitespace normalization; vLLM moved to `sha256_cbor` for this).
- **Reproducibility hash = a Merkle root** over sorted chunk hashes ⊕ model-snapshot IDs ⊕ param
  set ⊕ prompt-template hash ⊕ git SHA, emitted as a RunReceipt attribute so two runs are PROVEN
  identical or PROVEN divergent; changing one document changes the hash.
- **Cache-as-determinism is THE mechanism, not seeds.** Per Thinking Machines (Sept 2025),
  bitwise determinism is unattainable on hosted APIs (batch-variance). Honest contract: "same
  inputs -> served same cached output," not "the model is deterministic." Normalize (prompt
  bytes, model snapshot, params) into a SHA-256 cache key; serve first successful response.
  Identity-bearing calls run temp=0 AND are cached by input hash.
- **Namespace caches for the deliberately-stochastic VS stages** so best-of-N branches do not
  collapse to one cached answer (the one place variance is wanted).
- This supersedes the earlier "seed+temp0 as primary" framing: seed/temp0 are necessary but
  insufficient; the cache is the determinism layer. Tie cache invalidation to corpus content
  changes, not TTL.

### H3 — ONE `ModelRouter.select(TaskSpec) -> ModelPlan` policy object
- Delete the three dead router abstractions. `TaskSpec = {stage, identity_bearing,
  determinism_required, reasoning_depth, grounding_criticality, output_schema}` ->
  `ModelPlan = {model, temperature, seed/cache-policy, sampling-k}`. Map deep-synthesis/recs ->
  frontier; extraction/labeling/scoring -> mid; dedup/formatting -> cheap.
  `identity_bearing => temp0 + cache`.
- Validated by **RouteLLM (ICLR 2025)** (95% GPT-4 quality at 26% of calls) and **BEST-Route
  (ICML 2025)** (up to 60% cost cut, <1% loss). A ~430ms trained difficulty classifier beats
  slow LLM-as-judge pre-routing (1-5s/request, a documented hot-path anti-pattern).
- **Version the policy; include its hash in the reproducibility hash.** **H3 and H5 compound:**
  RouteLLM bootstraps its router from LLM-judge labels, so once H5 logs judge scores, evolve the
  hand-tuned policy into a trained classifier.
- Caveat: if measured routing savings <20%, defer the trained classifier; keep hand-tuned policy.

### H4 — Typed blackboard + content-addressed EntityRegistry (broken chain becomes impossible)
- A single **run-scoped state object** (Pydantic/JSON-schema), the LangGraph reducer-driven
  "blackboard," holds `Corpus`, `Themes[]`, `Personas[]`, `Recommendations[]`. Each entity
  carries a stable **`@id = sha256(canonical_attrs)`** and `evidence: [chunk_id...]`.
- **Schema-driven handoffs:** each stage's input schema REQUIRES its upstream artifacts — the
  recommendation node literally cannot run without `themes` + `personas` populated, and every
  downstream entity must reference upstream `@id`s. This makes "recommendations never see themes"
  STRUCTURALLY IMPOSSIBLE (the throw is fail-loud, ties to H1), not a prompt patch. Entity
  resolution = canonical form + persistent ID (JSON-LD `@id` / Wikidata Q-IDs); multi-agent RAG
  ER (2025): 94.3% match accuracy, 61% fewer API calls.
- Adopt **ACE's Generator/Reflector/Curator** for how the blackboard EVOLVES so detail
  accumulates instead of being summarized away ("context collapse").

### H4b — Theme extraction = hybrid BERTopic -> LLM-label/merge -> HARD grounding gate
- **TopicGPT (NAACL 2024)** mandates a supporting quote per assignment (purity 0.74 vs 0.64).
  SOTA: cluster statistically (BERTopic), label/merge with an LLM, then **gate every theme on
  (a) minimum evidence density and (b) a VERIFIABLE citation to chunk IDs that actually exist**,
  dropping failures loudly. (Extends the cluster-grounding shipped this session.)
- **Verify citations with a cheap NLI/substring check against the actual corpus, NOT the
  generator's say-so.** Wallat et al. ("Correctness is not Faithfulness in RAG Attributions,"
  ICTIR 2025): up to 57% of citations "support" a claim but were not the retrieved/used evidence.
  Require CAUSAL grounding, not textual overlap. Content-addressed chunk IDs (H2) make every
  citation resolve to a stable, existent chunk — grounding and determinism share the fix.
- Layer **VS** to surface non-obvious tail themes, intersected with statistical clusters and run
  through the same grounding gate (novelty WITHOUT slop).

### H5 — Wire `deliverableScorer` as the reward, THEN GEPA/ACE
- The optimizers are ready and sample-efficient; they need a signal, and the signal is the
  ORPHANED scorer. **Strict ordering:** (1) call `deliverableScorer` on every deliverable in
  production, persist per-criterion scores + `validation_failures` to the RunReceipt (fixes the
  missing fields that make SkillOpt train on neutral 0.5); (2) enforce the Stop-hook validators
  as RUNTIME hard gates (reject/regenerate sub-threshold); (3) feed scored traces offline to
  **GEPA** (Agrawal et al., ICLR 2026 Oral; reflective prompt evolution, "+10% over GRPO using
  up to 35x fewer rollouts," "+12% on AIME-2025 over MIPROv2") or **ACE** (context playbook,
  +10.6% agents / +8.6% finance, adapts from natural execution feedback without labels). Fix
  SkillOpt paths or retire it for GEPA.
- **Reward design:** analytic rubrics (per-criterion, 3-5-level anchored scales, explicit
  NEGATIVE criteria for anti-patterns like ungrounded claims) beat holistic floats; categorical
  integer scales beat raw floats; per-criterion scores serve as the continuous reward.
- **Judge calibration mandatory:** a 2-model-family jury + calibration (target Krippendorff
  alpha ~0.8) to fight leniency/position bias. Keep humans in the loop for high-stakes.
- **Benchmark-contingent fallback:** if judge<->human alpha < 0.6, do NOT drive GEPA from it —
  use verifiable sub-metrics (citation-resolution rate, evidence density, schema-validity) as the
  reward until the rubric calibrates.

### Verbalized Sampling — the cross-cutting ideation engine (use surgically)
- VS (Zhang et al., arXiv:2510.01171, Northeastern/Stanford) fights mode collapse by verbalizing
  k candidates each with a `<probability>` and sampling the tail via threshold tau. Training-free,
  model-agnostic, **orthogonal to temperature**, no logit access. Variants: VS-Standard, VS-CoT
  (pushes the Pareto front), VS-Multi (best tradeoff).
- Apply ON FRONTIER MODELS, IDEATION surfaces ONLY: persona framings, novel themes (intersected
  with clusters + grounding gate), recommendation candidates. NOT empirical surfaces — it was
  correctly reverted for theme breadth (convergent, not anti-modal).
- HONEST caveat: rigorously-measured gain is **1.6-2.1x semantic diversity in creative writing**
  (the "2-3x" is marketing); VS adds latency/token cost (k candidates/call) and benefits smaller
  models LESS.

---

## KPI / accountability deltas (fold into harness-kpi-accountability-2026-06-02.md)
- K1/K2 thresholds become explicit OTel invariants: `DEGRADED if sources_succeeded/attempted <
  0.9`; `FAILED if any stage empty-success`. Measured off the trace, not prose.
- K5 (reproduction) becomes **Merkle-root equality**: two runs on identical corpus+goal produce
  the identical reproducibility hash; changing one document changes it.
- K6 (citations) splits into **resolution rate** AND **faithfulness rate** (NLI/substring causal
  check) — correctness != faithfulness.
- K10 (sentiment) and the new judge KPI: report **Krippendorff alpha** of the deliverableScorer
  jury vs human ratings; gate GEPA on alpha >= 0.6, target ~0.8.
- New KPI: **router cost-savings %** (defer the trained classifier if <20%).
- SI8 (compounding) stays the headline: a held-out brief set shows measurable quality lift vs the
  pre-loop baseline, with the reward being real (non-0.5) per-criterion scores.

## Honest caveats carried forward (temper every claim)
- "Reproducible" = "same inputs -> served same cached output," NOT "the model is deterministic."
- VS numbers are task-specific (1.6-2.1x creative-writing diversity); frontier + ideation only.
- LLM-as-judge drifts; calibrate, use analytic rubrics, humans-in-loop for high-stakes; fall back
  to verifiable sub-metrics if alpha < 0.6.
- Citation correctness != faithfulness; verify causal grounding.
- ACE/GEPA/RouteLLM percentages are benchmark-derived; DIRECTIONAL until measured on HiC's own
  briefs (which the H5 RunReceipt + held-out brief set exist to do).
- OTel GenAI conventions experimental; Anthropic "Memory for Managed Agents" launched Apr 2026
  beta — pin versions, expect churn.
