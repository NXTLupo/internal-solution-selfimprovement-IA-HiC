# Hermes Agent vs. HiC's Implemented Self-Improvement System: Expert Evaluation + VS/RI Proposals

**Date:** 2026-06-26
**Status:** EVALUATION + PROPOSALS. Code-verified (3 parallel source audits). Nothing implemented, nothing committed.
**Sources:** Hermes Agent = github.com/NousResearch/hermes-agent (README, docs, mudrii/hermes-agent-docs). HiC = local uncommitted tree.

---

## Part 1 - HiC's self-improvement system AS ACTUALLY IMPLEMENTED (not the theory)

Mapped against the UNIFIED_VISION self-improvement principles: Meta-Harness (learn from full traces), RHO (label-free self-preference, S>0 promotion gate), SkillOpt (bounded edits behind a held-out gate), and the meta-principle CONVERGE / DELETE / GATE / SCHEDULE.

### 1A. What is REAL and FIRING on the live path (verified)
- **Full-trace capture substrate (Meta-Harness, real):** `traceRecorder.ts` -> proxy `/api/sessions/trace/append` writes 77 complete turn traces under `sessions/<slug>/traces/` (verbatim `prompt`, `model_id`, `step_label`, `elapsed_ms`, `attempts`, `fallback_fired`, `failed`, `response`). Plus 55 full journey rollouts in `sessions/_journey-rollouts/*.json` auto-written on every journey gen (`proxy/app.py:17614-17640`). Plus a real feedback ledger `wiki/feedback/*/*.jsonl`. This is a genuine "learn from full rollouts, not summaries" substrate, and it is accumulating real data.
- **Runtime generation gates (GATE, real):** proxy `artifact_engine_auditor` (`app.py:18640-18732`) + `evidence_density_precheck` gate generation on the live user path and log verdicts to `wiki/synthesis/hook-rejection-log.md` (16 real entries).
- **Runtime feedback -> improvement loop (real + gated):** `learningEngine.runLearningPass()` fires on every FeedbackWidget submit. `clusterFeedback` (>=3) -> `routeCluster` -> `generatePayload` (Flash) -> apply at confidence >=0.8. BOTH `applyConstraint()` AND `applySkillPatch()` are now GATED (`evaluateConstraint` + `isCompleteSkillPatch` + dedupe, `learningEngine.ts:390-399`). **The 2026-06-23 "ungated applySkillPatch drift" bug is FIXED** - `applySkillPatch` patches live `.claude/skills/<name>/SKILL.md` only after passing the same gate as `applyConstraint` plus a completeness check, with a `patchAlreadyPresent` dedupe.
- **Edit-learning loop (real + gated + wired):** `classifyMessage` fires on every chat message (both panels); `promptImprovementEngine` writes a constraint immediately for high-confidence rules (>=0.75) or after >=5 same-stage/field edits (>=60% same direction), each gated by `evaluateConstraint`. `getActiveConstraints()` injects learned constraints into ~8 live generation call sites (`geminiService.ts:790/5283/6584`, `corpusChatService.ts:3580`, etc.), gated again at injection.
- **Prior-run injection (real):** `recurringShortfallBlock` (known-gaps, relevance-gated to the goal) is woven into `effectivePrompt` (`geminiService.ts:7268`); `engagementMemory` block injected via `evidenceCatalogBuilder.ts:204`.
- **Agent-session Stop hooks (real, but Claude-Code-only):** `dispatch_validators.py` + `run_hooks_parallel.py` (26 validators) gate the AGENT's output, not the runtime SPA path. Memory's claim confirmed.
- **One scheduled background loop:** proxy `_manifest_reconcile_loop()` (1800s) - data hygiene, not self-improvement.

### 1B. What is CODED but ORPHANED / NEVER RUN (the real gap vs the vision)
1. **RHO S>0 promotion gate is an ORPHAN.** `goldenSetRunner.runGate()` + `compareReports()` (the literal held-out before/after gate: rejects on new floor violations, exemplar-mean regression >0.05, or `discrimination_delta <= 0`) plus `wiki/eval/golden-set.json` (17 exemplars + negative corpus, frozen 2026-06-15) are FULLY CODED with **zero callers**. No candidate change has ever been compared against an incumbent on the held-out signal. The most ambitious principle (RHO) exists only as dead code.
2. **The offline SkillOpt closed loop has NEVER run.** `hic-workspace/skillopt/` does not exist (no `proposals/`, no `applied-log.md`). The npm `skillopt:extract` reads the WRONG directory (`sample-artifacts/` absent, `artifacts/` = 6 files) and is decoupled from the 55 REAL rollouts, which only `proxy/skillopt_trajectory_miner.py` reads - and the miner's primary pattern keys on `validation_failures`, a field that appears in **0 of 55** real rollouts (DEAD pattern). The optimizer (`run-skillopt.py`, Gemini Flash ACE/GEPA loop) + validator (`validate-candidate.py`, 3-layer) are real and runnable but fed nothing.
3. **The epoch loop has produced ZERO epochs.** `improvement-epochs.md` has no epoch records; `epochTrigger.getEpochStatus` has zero callers (the "epoch ready" signal is never even surfaced); `yield-ledger.md` (a documented input) does not exist.
4. **benchmark.mjs is STATIC, not a live gate.** It scores file-computable metrics against a frozen fixture (no model called); the regression baseline JSON does not exist on disk, so `--diff` is a no-op. The fixture is stale (2026-05-26).
5. **cross-engagement-pattern-miner output is WASTED on the main path.** `loadGenerationContext()` populates `context.crossEngagementPatterns`, but `assembleEnhancedPrompt()` (the canonical generation path) never reads it. Only 4 chat directives (`#gap/#compete/#audit/#strategy`) inject it.
6. **The acceptance gate is a heuristic, not a held-out check.** `evaluateConstraint` is regex + 40-char floor + dedupe + master-rule-contradiction guards. It catches the two known rot classes (dollar-quant mandates, generic stubs/truncation) but a novel net-negative constraint that clears the floor, dodges the regexes, and ends in a period will pass. The reactive retirement loop (`reviewConstraintEffectiveness`, retires at effectiveness <0.3 after >=20 applications) is under-fed (`constraint-records.json` not written by any live path observed).
7. **Two un-converged edit-learning loops:** localStorage `promptImprovementEngine` (>=5 edits) and wiki `learningEngine` clustering (>=3 events) are parallel, with different thresholds and stores, both gating through the same heuristic. CONVERGE violation.

### 1C. Honest verdict on HiC's self-improvement system
HiC has built **more** self-improvement machinery than almost any comparable app, and the **react** half is genuinely wired+gated+firing (feedback -> gated constraint -> live injection; full-trace capture accumulating). But the half that makes improvement COMPOUND and stay net-positive is coded-but-orphaned: the held-out **promotion** gate (RHO) has no caller, the offline loop has never closed (and reads the wrong substrate), no epoch has run, and scheduling is ~15%. Scored against the meta-principle: **CONVERGE ~40%, DELETE ~30% (orphans accreting), GATE ~50% (runtime real, promotion orphaned), SCHEDULE ~15%.** The system CAPTURES and REACTS; it does not yet CLOSE THE LOOP or PROVE an improvement before promoting it.

---

## Part 2 - Hermes Agent, as built (verified)

Hermes (Nous Research, MIT, Python-dominant) is a single-core self-improving terminal agent. The mechanisms relevant to HiC:
- **Single agent core** (`AIAgent` in `run_agent.py`) used by ALL surfaces (CLI, gateway, ACP, cron) - "behavior is consistent across all platforms." A convergence exemplar.
- **ProviderTransport ABC** (`agent/transports/`): `AnthropicTransport`, `ChatCompletionsTransport`, `ResponsesApiTransport`, `BedrockTransport`, each owning message/tool/kwargs conversion + response normalization; streaming/retries/cache/credentials stay on the core.
- **Autonomous Curator** (`hermes curator`, `agent/curator.py`): "reviews agent-created skills, CONSOLIDATES overlap, ARCHIVES stale entries, writes PER-RUN REPORTS, PROTECTS PINNED skills." Skills auto-create after 5+ tool calls and **self-patch during use when outdated, incomplete, or wrong**.
- **Memory:** `MEMORY.md` agent-curated facts with periodic NUDGES to persist; `SOUL.md`; SQLite session store with **FTS5 full-text cross-session recall + LLM summarization** and `parent_session_id` lineage; pluggable providers (Honcho dialectic user model).
- **Context compression** (`context_compressor.py`): triggers at 50% of context window; summarizes the MIDDLE via `call_llm(task="compression")`; `compression.protect_last_n` (default 20) + first-turn protection; sanitizes orphaned tool-call/result pairs.
- **Trajectory pipeline** (`agent/trajectory.py`, `trajectory_compressor.py`, `batch_runner.py`): batch trajectory generation + compression, **ShareGPT-format export** for SFT/eval/debug. A connected, runnable capture-to-training path.
- Reasoning effort levels (low/med/high/xhigh) + `reasoning_timeouts.py`; `moa_loop.py` (mixture-of-agents); programmatic tool calling via `execute_code`.

**Key comparative insight:** Hermes' self-improvement is curator-consolidation + skill-patch-when-wrong + trajectory-export-for-offline-SFT, with a human/curator as the quality arbiter. **Hermes does NOT have an automated held-out S>0 promotion gate.** So HiC's RHO/goldenSetRunner design is actually MORE ambitious than Hermes on the promotion-gate axis. Where Hermes is decisively AHEAD is **loop CLOSURE and EXECUTION**: its curator runs, its trajectory pipeline is connected and runs, the loop is end-to-end and actually used. HiC has superior gate DESIGN; Hermes has superior loop WIRING.

### Does Hermes get HiC there or closer?
- **Closer on closure/execution: YES.** Hermes is a working reference for the connected trajectory pipeline + scheduled curator that HiC has coded but never closed.
- **It validates HiC's architecture:** markdown-as-memory, skill docs, gated patches, single core, scheduled curation - HiC and Hermes converged on the same shape independently.
- **It does NOT replace HiC's RHO gate:** HiC's held-out S>0 design is the more ambitious piece; the gap is WIRING it, not designing it. **Borrow Hermes' curator + "connect/schedule/close" discipline; do NOT fork the engine** (HiC is a browser SPA + Python proxy for consulting deliverables, not a Python terminal agent; forking repeats the colleague-bundle anti-pattern).

---

## Part 3 - Proposals (Verbalized Sampling + Reinforcement Inference)

### VS - candidate enhancements (frame + probability)
- **P1 - CLOSE the loop (connect real substrate -> optimizer -> RHO gate)** (typical, p~0.30). (a) Repoint `extract-rollouts.py` to read `sessions/<slug>/traces/` + `_journey-rollouts/` (the REAL substrate) instead of the empty `sample-artifacts/`. (b) Fix the trajectory-miner's dead pattern to key on the actual rollout schema (`failed`/`fallback_fired` from traces). (c) Make the SkillOpt promotion step call the orphaned `goldenSetRunner.runGate` + `compareReports` (the held-out S>0 gate) instead of / in addition to the heuristic `validate-candidate.py`. Realizes Meta-Harness + RHO + SkillOpt closure in one connected path.
- **P2 - Hermes Autonomous Curator for constraints+skills** (shifted, p~0.25). A scheduled HiC curator that CONSOLIDATES overlapping learned constraints (the gate dedupes exact-ish keys but never merges near-duplicates corpus-wide - the "21 quantify-in-dollars rules" rot), ARCHIVES stale/low-effectiveness ones (feed the under-fed retirement loop), PROTECTS pinned master rules, and writes PER-RUN reports. Composes with the existing wiki-curator subagent. Borrows Hermes `curator.py` 1:1.
- **P3 - Held-out micro-gate at constraint acceptance** (RHO-purist, p~0.18). Upgrade `evaluateConstraint` from heuristic to a real S>0 check: before injecting a NEW constraint, A/B it on the golden-set negative corpus - keep it only if discrimination improves. Turns the heuristic floor into a constraint-level RHO gate. Higher cost per acceptance.
- **P4 - SCHEDULE the (now-connected) loop + curators** (cron-first, p~0.15). Use the proven `_manifest_reconcile_loop` pattern (or `/loop`) to actually schedule the cross-engagement miner, the curator (P2), and the connected SkillOpt run (P1) on a cadence, each gated. Moves SCHEDULE from ~15% toward real.
- **P5 - Wire the DROPPED cross-engagement-patterns into the main prompt** (CONVERGE/wiring, p~0.12). `assembleEnhancedPrompt` loads `context.crossEngagementPatterns` then never injects it; inject it (relevance-gated) on the canonical path, not just the 4 chat directives. Cheap, recovers wasted miner output.
- **P6 - Hermes context compression for unbounded history** (p~0.08). Port the 50%-trigger / summarize-middle / protect_last_n=20 pattern to the chat/GenAISession history (the token-1M-overflow risk). Tangential to self-improvement; real fix.
- **P7 - ShareGPT trajectory export -> make benchmark.mjs LIVE** (p~0.06). Adopt Hermes `trajectory_compressor` ShareGPT export so traces become portable eval data and `benchmark.mjs` can score REAL generations (today it is static + baseline-less).

### RI - re-derivation at the uncertain joints
- **Is the highest leverage "design a better gate" or "wire the gate that exists"?** Re-derived from the audit: HiC's gate DESIGN (RHO/goldenSetRunner) already exceeds Hermes'; the deficit is WIRING/CLOSURE. So the top-value work is CONNECT + SCHEDULE + CLOSE, not build-new - which also satisfies the meta-principle (do not build new before confirming the primitive exists). **Resolution: P1 + P5 + P2 + P4 over P3.** P3 is real but second-order (improve the gate after the loop that uses it actually runs).
- **Does Hermes add anything HiC's design lacks?** Net-new for HiC = (a) the curator-as-scheduled-consolidator (HiC dedupes but never consolidates/archives/protects-pinned at corpus scale), and (b) the existence proof that connected-trajectory + scheduled-curator is the working shape. Hermes does NOT add a better promotion gate.
- **Risk of the closed loop going net-negative?** That is precisely why P1 routes promotion through the held-out `runGate`/`compareReports` (strictly-better for wiring, equal-or-better for content) rather than the heuristic - the loop only compounds if every promotion is PROVED on held-out signal. Keep human-in-the-loop until the gate has demonstrated it blocks regressions.

### Synthesized recommendation (priority)
1. **P1 (P0):** connect real traces -> optimizer -> RHO promotion gate. The single move that turns "captures + reacts" into "closes + proves." Realizes Meta-Harness, RHO, SkillOpt closure.
2. **P5 (P0, cheap):** inject the dropped cross-engagement-patterns on the main path.
3. **P2 (P1):** Hermes curator - consolidate / archive / protect-pinned / report; cleans the constraint pile, feeds retirement.
4. **P4 (P1):** schedule the connected loop + curators (gated).
5. **P3 (P2):** constraint-level held-out micro-gate (after P1 proves the gate works).
6. **Watch:** P6 (context compression), P7 (ShareGPT -> live benchmark).

### What NOT to do
- Do not fork or vendor Hermes (Python terminal agent != browser SPA + consulting-deliverable proxy).
- Do not replace HiC's RHO gate design with Hermes' human-curator model; HiC's is more ambitious - wire it.
- Do not add a third edit-learning loop; CONVERGE the existing two before extending.

### Acceptance (when HiC's self-improvement matches the vision)
1. The offline SkillOpt loop runs end-to-end against the REAL rollout substrate and lands at least one gated, promoted skill edit with a per-run report.
2. `runGate`/`compareReports` has a live caller; no harness/skill edit promotes without a strictly/equal-better held-out verdict (RHO realized).
3. cross-engagement-patterns inject on the canonical generation path.
4. A scheduled curator consolidates/archives constraints and writes a report on a cadence.
5. typecheck 0, tests green, live-verified - no claim of "shipped" without the pre-claim checklist.
