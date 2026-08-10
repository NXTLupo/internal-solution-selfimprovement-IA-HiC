---
id: synthesis/verification-hierarchy.md
title: Verification-hierarchy audit of every HiC improvement loop and gate
type: synthesis
updated: 2026-08-07
---

# Verification-hierarchy audit (R1, 2026-08-07)

Per the RSI survey (arXiv 2607.07663 §5.2) and UNIFIED_VISION phase 7: demonstrated
self-improvement strength tracks the reliability of its verification signal. Rungs, strongest
first: RUNG 1 deterministic code checks; RUNG 2 execution / held-out evaluation; RUNG 3
learned or LLM judges; RUNG 4 intrinsic self-assessment. THE RULE: no improvement loop
promotes on rung-3/4 signal alone; every promotion carries at least one rung-1/2 signal plus
exogenous grounding (R2).

## Gate and signal inventory

| Gate / signal | Rung | Notes |
|---|---|---|
| tsc --noEmit, vitest, check:templates | 1 | Repo-level regression obligations |
| #proto compile gate (Babel parse + repair loop) | 1 | Deterministic; repair is model-driven but acceptance is code |
| deckPlanGate (visual quota, archetype/fence validity; V1 variety rules) | 1 | Deterministic plan checks with named-violation repair re-ask |
| slidePostProcessor (banned phrases, meta-narration, em-dash strip, citation resolution) | 1 | Pattern-based; bypassable by clever phrasing but deterministic in what it checks |
| D3(b) export token lint (detect-only until ~2026-08-21) | 1 | New; makes Law 1 checkable on every export |
| Golden-set gate (M3, epoch-proposer acceptance) | 2 | Frozen held-out set; in-path |
| scripts/benchmark.mjs + bake-off protocol | 2 | The evidence bar for every routing repoint |
| e2e suite (services/__e2e__/, live proxy) | 2 | Execution-level; slow, run at decision points |
| L2 regression-obligations suite (frozen corpus of previously-passing artifacts) | 2 | New (this plan); mandatory before SkillOpt promotion, epoch application, routing repoints |
| SkillOpt validate-candidate (structural, hygiene, held-out failure coverage) | 2 | Held-out failure patterns = rung 2; structural checks = rung 1 |
| auditGate LLM legs / kill-only Critic / collapseAndScore | 3 | Judge; verdicts become debuggable per-criterion under R4 (BinEval) |
| Per-deliverable auditor subagents, dissent-panel, evidence-quality-auditor | 3 | Judges; useful for finding, never sufficient for promotion |
| hic-output-qa, heuristic tri-model critique | 3 | Judge panel; diversity mitigates but does not remove judge limits |
| NFP-style persona judges (D4 G2, creative-director analyze) | 3 | Persona critique; real user feedback ALWAYS outranks the persona |
| Model self-critique inside a single generation (criticReviseLoop critics without external evidence) | 4 | Permitted for DRAFT IMPROVEMENT only, never as a promotion or "verified" signal |
| Model confidence / self-consistency statements in chat | 4 | Never load-bearing |

## Loop-by-loop verdicts

| Improvement loop | Signals used | Verdict |
|---|---|---|
| SkillOpt (weekly skill training) | rollout scores (3) + validate-candidate held-out coverage (2) + structural checks (1) + L2 suite (2, new) + human approval | COMPLIANT; R2 grounding rule now enforced in build-training-set |
| Epoch-proposer (harness edits) | trace inspection (3) + golden-set gate (2) + ONE-bounded-edit constraint + L2 suite (2, new) | COMPLIANT |
| Edit-learning (5+ similar user edits -> constraint) | user edits (exogenous, rung 2 equivalent) | COMPLIANT; the strongest grounding class we have |
| criticReviseLoop at generation time | critics (3/4) + deterministic gates on the final artifact (1) | COMPLIANT as long as the FINAL acceptance is the gate, not the critic; critics alone never declare "verified" (standing rule) |
| Rubric evolution (R3, planned) | edit-history + gate-failure clusters (2) + golden set (2) + L2 (2) + human approval | DESIGNED COMPLIANT; do not ship without all three |
| Chat-reply quality (Analyst/Designer prose) | anti-slop scrub (1) + model judgment (4) | COMPLIANT for output hygiene; NOT an improvement loop (nothing promotes) |

## Remediations found by this audit

1. No rung-4-only PROMOTION path exists today. The one rung-4 surface (in-generation
   self-critique) never promotes anything; acceptance is always a rung-1 gate. KEEP IT THAT WAY:
   any new critic wired as an acceptance signal must pair with a rung-1/2 check first.
2. The gap this audit closes is rung documentation, not rung violation: before 2026-08-07 the
   rule was implicit. It is now UNIFIED_VISION phase 7 text and enforced in R2's validator.
3. WATCH ITEM: V6's craft detectors enter the revise loop as rung-1 pattern checks; if they are
   ever softened to "the model decides if the sentence is vague," that is a rung-4 regression -
   keep them deterministic.
