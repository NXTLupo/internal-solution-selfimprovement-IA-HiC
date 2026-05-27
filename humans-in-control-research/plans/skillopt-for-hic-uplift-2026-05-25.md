# SkillOpt for HiC — Self-Evolving Skills Adaptation Plan

**Source paper**: *SkillOpt: Executive Strategy for Self-Evolving Agent Skills* — Yifan Yang et al., Microsoft / Shanghai Jiao Tong University / Tongji / Fudan, arXiv:2605.23904v1, 22 May 2026.

**Date**: 2026-05-25
**Status**: Plan only — no implementation work begins until user approves the scope and migration sequence.
**Author / Reviewer**: Drafted by Claude Code at the user's direction after reading the full paper. The user explicitly asked that this plan come BEFORE any further band-aid fixes to the broken expert-panel pipeline.

---

## TL;DR

SkillOpt diagnoses the exact architectural failure that broke our journey artifact today. Our `runExpertPanel` is a textbook example of what the paper labels "ad hoc updates, large semantic jumps, unstable updates" (Figure 1, top-left red box). SkillOpt's prescription — bounded text-patch edits, held-out validation gate, rejected-edit buffer, epoch-wise slow/meta update — is a clean replacement for our current critic-revise loop that would also turn HiC's existing per-engagement edit history into a real training signal for the skills.

This is a 4-week refactor, not a band-aid. The output is a system where each SKILL.md compounds in quality every time a user runs an engagement, every time a critic catches an issue, every time a learned constraint emerges from edit history. Today our skills are static markdown files maintained by hand and via opportunistic agent rewrites. After this work they become **trained artifacts** with version history, validation gates, and longitudinal memory.

---

## 1. Why SkillOpt applies to HiC

### 1.1 Direct quote: the failure mode SkillOpt diagnoses

> Yet weight adaptation is often unavailable for closed frontier models and expensive for open ones, while manually written or one-shot skills are brittle under a target domain or harness. Recent systems convert execution experience into reusable textual artifacts ... but leave open a more basic question: if skills are the adaptation layer, how should they be optimized? Our key idea is to treat skill editing as a controllable domain-adaptation process, with the skill document as the external state, an additional frontier model as the optimizer, and training-style controls over evidence, step size, validation, and update direction. — §1, Introduction

The bracketed pattern SkillOpt argues against (Figure 1, red side):
- Ad hoc updates with large semantic jumps
- Unstable updates
- Suboptimal skill drift
- Rejected-side updates that accumulate

This is **exactly** what happened in our session today:

| HiC failure (today, 2026-05-25)                                                                                  | SkillOpt term                                                                              |
|---|---|
| `runExpertPanel` applied 5 critic edits to a freeform-HTML journey                                            | "ad hoc updates"                                                                       |
| Each edit tried to navigate `html.grid.lane-row[0].cell[1].emo` into a string field; all 5 failed              | "large semantic jumps, unstable updates"                                                |
| The Improvement Lineage panel showed `Quality down 4 points (now 80/100)`                                       | "suboptimal skill drift" / "rejected-side updates"                                      |
| Em-dashes increased (2 → 3) — the hygiene strip never actually ran because `$ROOT` sentinel was unimplemented | No held-out validation gate; the candidate that made things worse was still applied      |
| User saw critic prose ("Return to quantification-architect with all three citation gaps flagged") in the canvas | Reflection without bounded application — exactly SkillOpt §3.5's "plausible textual diagnoses can still hurt the actual target model" |

We built a critic-revise loop without the four control mechanisms that make text-space optimization work. SkillOpt's contribution is precisely those mechanisms.

### 1.2 SkillOpt's empirical results that motivate the adoption

- **52 of 52 cells**: SkillOpt is best or tied-best on every (model, benchmark, harness) cell tested. No other approach matches this consistency.
- **+23.5 average points** over no-skill on GPT-5.5 in direct chat across 6 benchmarks
- **+5.4 average points** over the best per-cell competitor (best of human, one-shot LLM, Trace2Skill, TextGrad, GEPA, EvoSkill)
- **Cross-harness transfer**: a SpreadsheetBench skill trained on the Codex harness transferred to Claude Code with a +59.7 point gain
- **Cross-model transfer**: SpreadsheetBench skill trained on GPT-5.4 improved every smaller GPT variant tested
- **Compact artifacts**: final `best_skill.md` ranges from 379 to 1,995 tokens after only 1–4 accepted edits — meaning the optimizer doesn't bloat the skill
- **Inspectable**: every accepted edit is human-readable text; rejection reasons are auditable

For our context — Claude Opus 4.7 / Claude Sonnet 4.6 as optimizer, Gemini 3.1 Pro / GPT-5.5 as frozen target — the paper's claims align with the regime we actually deploy.

### 1.3 The deep-learning analogy that makes the discipline rigorous

| SkillOpt term                  | Deep-learning analogue                | What it controls                                              |
|---|---|---|
| Trajectory-derived edit direction | Gradient direction                    | Which way the skill should move                              |
| Edit budget Lt                  | Learning rate                          | How far the skill is allowed to move in one step              |
| Cosine / linear / constant schedule | LR schedule                            | Larger early, smaller late                                    |
| Held-out validation gate        | Held-out validation loss              | Reject any update that doesn't improve                        |
| Rejected-edit buffer            | Negative feedback / dropout            | Avoid repeating failed edits                                  |
| Epoch-wise slow/meta update    | Momentum + EMA                         | Longer-horizon stable direction                                |
| Rollout batch size              | Minibatch size                         | Evidence noise control                                        |
| Reflection minibatch size       | Microbatch                             | Local proposal noise control                                   |

This isn't decorative analogy — it's the discipline that makes propose-and-test work. Strip any one of these and the loop becomes the "ad hoc rewriting" SkillOpt argues against. We can verify this in our codebase: our `criticReviseLoop.ts` is missing the held-out validation gate, the rejected-edit buffer, the schedule, AND the slow update. So all four failure modes that SkillOpt mitigates are live in our system today.

---

## 2. HiC → SkillOpt concept mapping

### 2.1 The full mapping

| SkillOpt concept                                       | HiC equivalent (current state)                                                                                          | Gap / required new component                                                                                                            |
|---|---|---|
| Frozen target model `M`                                | Gemini 3.1 Pro for freeform-HTML; GPT-5.5 for some deliverables; Claude Opus 4.7 for strategy-author                       | None — already in place via `aiRouter.ts`                                                                                              |
| Optimizer model `O`                                    | None today                                                                                                              | **NEW**: Claude Opus 4.7 dedicated as the optimizer; never serves the target deliverable directly                                       |
| Harness `h`                                             | Three: deck-gen (geminiService.ts), freeform Design Desk (chatToFreeform.ts), prototype pipeline (Stage 1-5)              | Adapt each harness to expose a `(rollout, score)` interface for the optimizer                                                          |
| Skill document `s`                                     | `.claude/skills/<name>/SKILL.md` + `humans-in-control-research/exemplar-skills/diagrams/<name>/SKILL.md`                  | Restructure each into a SkillOpt-shaped doc with a protected `<!-- SLOW_UPDATE_START -->...<!-- SLOW_UPDATE_END -->` block             |
| Task `x`                                                | An engagement goal + corpus + uploads (one HiC research run)                                                            | None — already first-class                                                                                                             |
| Trajectory `τ(s)`                                       | The full chain: ingest → themes → personas → recommendations → deck → user edits                                       | **NEW**: Persist trajectories as structured JSON (we do partial today via `hic-workspace/sessions/<slug>/state.json`)                  |
| Scalar score `r(s) ∈ [0,1]`                            | None today (we have qualitative validation_failures, banned-phrase counts, citation diversity, evidence density)         | **NEW**: A composite score per (skill, deliverable) — see §4 for the rubric                                                            |
| Train split `D_tr`                                      | Prior engagements                                                                                                       | **NEW**: Split prior engagements into train/select/test partitions                                                                     |
| Selection split `D_sel`                                | None today                                                                                                              | **NEW**: Held-out engagement subset used only for the validation gate                                                                  |
| Test split `D_test`                                     | None today                                                                                                              | **NEW**: Locked-until-final-report set                                                                                                 |
| Rollout batch `B`                                       | A small set of recent engagements                                                                                       | **NEW**: Batch sampler                                                                                                                 |
| Reflection minibatch size `B_m`                         | N/A                                                                                                                     | **NEW**: Default `B_m = 4` per paper Table 2 panel (b)                                                                                 |
| Patch operations                                       | Our `applyEdits` uses JSON-path operations (replace / append / remove)                                                  | **REPLACE** with text-patch operations: `append / insert_after / replace / delete` with text-content matching (paper §C.2.1)            |
| Edit budget `L_t`                                       | None today (critic returns up to 5 edits, all applied)                                                                  | **NEW**: Default `L = 4` (paper Table 2 panel (d)); cosine decay across rounds                                                          |
| Held-out validation gate                               | None today                                                                                                              | **NEW**: Evaluate the candidate skill against `D_sel`; accept only if score improves                                                    |
| Rejected-edit buffer                                   | None today (critic verdict logs to console, then is forgotten)                                                          | **NEW**: Per-epoch `rejected_edits.jsonl` file; injected into next reflection prompt                                                   |
| Skill hash cache                                        | None today                                                                                                              | **NEW**: SHA256(skill content) → score cache                                                                                            |
| Slow/meta update (protected section)                   | None today                                                                                                              | **NEW**: A block in every SKILL.md, written only at epoch boundaries by a separate optimizer pass                                       |
| Optimizer-side meta skill                               | None today                                                                                                              | **NEW**: A `meta_skill.md` per skill domain that guides the optimizer (never seen by the target model)                                  |
| Best-validated skill `best_skill.md`                    | Each SKILL.md is "the" skill — no notion of "best validated"                                                            | **NEW**: Each skill becomes a directory with `current/`, `best/`, and `history/`                                                       |

### 2.2 What HiC already has that maps cleanly

- **Reproducibility hash** (services/reproducibilityHash.ts) — directly usable for the skill-hash cache (§3.5 caches by `Hash(s̃)`)
- **Learned constraints** in `cross-engagement-patterns.md` + the user-prompt-submit hook — directly usable as longitudinal training signal (the "rejected-edit buffer" pattern)
- **Critic dispatcher** (services/criticDispatcher.ts) — already does the optimizer-model-calls-frontier-LLM thing, just needs to emit text-patch edits instead of JSON-path edits
- **Multi-model resilience** (services/multiModelResilience.ts) — directly usable for the optimizer's LLM calls
- **Stop hooks** (.claude/hooks/) — already a validation surface; can be promoted to validation-gate signals
- **Stop-hook validators** — `validate_quantification.py`, `validate_evidence.py`, `validate_citations.py`, etc. — already a structured scoring rubric we can map to the `r(s)` score function

### 2.3 What HiC has that should be retired / replaced

- **`runExpertPanel` with JSON-path edits** — fundamental architectural mismatch when the deliverable is HTML or any non-tree structure. Replace with SkillOpt's text-patch approach.
- **`criticReviseLoop`'s ad-hoc apply-and-ship** — replace with the validate-and-reject loop.
- **The "halt_reason: all_accept" pattern** — replace with "halt when no candidate improves `D_sel` score".
- **In-memory critique log** — promote to persistent JSON trajectory file.
- **`PANEL_BUDGETS_USD`** — keep, but additionally bound by the edit budget `L_t`.

---

## 3. Which HiC skills are SkillOpt candidates

### 3.1 Tier 1 — Train these first (highest leverage)

These skills run on every research engagement and directly produce user-facing deliverables. They have the most edit-history signal and the highest variance in output quality. Training these is where the +23.5-point uplift will be most visible.

1. **`journey-illustrator`** (and the shared `chatToFreeform.ts::perKindGuidance('journey')`) — broke today, perfect candidate
2. **`persona-architect`** — has 5+ user-edit signals on persona-quote section, plenty of training data
3. **`gap-analysis-evaluator`** — has the dollar-quantification learned constraint, currently enforced only at the panel-critic layer
4. **`roadmap-builder`** — has the quantified-success-metric learned constraint
5. **`recommendation-architect`** — strategy-deck core; most-edited slide pattern in user history (5 user-edits on "Updated Slide 12: layout")
6. **`strategy-author`** — Rumelt's Kernel deliverable; finance-grade outputs that have to survive a partner review
7. **`service-blueprint-mapper`** — shares grid layout with journey; same critic disciplines apply
8. **`deck-narrative-composer`** — orchestrates the strategy deck slides; learned-constraint candidate

### 3.2 Tier 2 — Train after Tier 1 lands

9. `tech-arch-generator`, `tech-audit-inspector`, `competitive-analyst`, `prd-compiler`, `theme-analyst`, `wiki-synthesizer`, `experience-prototype-composer`

### 3.3 Tier 3 — Train opportunistically (lower volume)

10. `org-illustrator`, `mind-map-architect`, `brief-dialog`, `meta-themes`, `research-planner`, `competitive-analyst`

### 3.4 Skills to leave untouched (infrastructure, not deliverable quality)

- `verbalized-sampling`, `reinforcement-inference`, `critic-revise-loop` (the *primitives* — these compose with the trained skills, they don't get trained themselves)
- `escape-audit`, `lock-format`, `score-prompt`, `trim-prompt`, `decompose`, `failure-log` (meta-skills used by humans / the optimizer, not by the target model on deliverable generation)
- All `wiki-*` retrieval skills (they're retrieval, not generation)

---

## 4. The scoring function `r(s)` — the heart of the validation gate

SkillOpt requires a scalar `r(s) ∈ [0,1]` per (skill, task) pair. We don't have one today. The biggest piece of new infrastructure this plan requires is a defensible composite score that the validation gate can use.

### 4.1 Per-deliverable rubric (example: journey)

Score components, each in [0,1], weighted to a single composite. Each is **already measurable** with existing HiC infrastructure — we just need to wire them into a scorer.

| Component                                  | Source                                                                  | Weight | Rationale                                                       |
|---|---|---|---|
| Verbatim-quote density                      | `validate_freeform_structure.py::check_journey` J6                       | 0.20   | The single load-bearing trust signal for journey                |
| Named-touchpoint density                    | `validate_freeform_structure.py::check_journey` J7                       | 0.10   | Evidence-of-system-fragmentation signal                          |
| Emotion specificity                         | `validate_freeform_structure.py::check_journey` J8                       | 0.10   | Psychological depth signal                                       |
| Dashboard presence                          | `validate_freeform_structure.py::check_journey` J9                       | 0.10   | Journey-level synthesis present                                   |
| Citation diversity (≥3 distinct sources)    | `validate_citations.py`                                                  | 0.15   | Existing rubric                                                  |
| Evidence external-ratio (≥60% external)     | `validate_evidence.py`                                                  | 0.15   | Existing rubric                                                  |
| Em-dash count = 0                           | `validate_ai_slop.py`                                                   | 0.05   | Banned-character check                                            |
| Banned-phrase count = 0                     | `precheck_slop.py`                                                     | 0.05   | 350+ phrase blacklist                                            |
| User-edit delta (if available)              | `chatFeedbackExtractor.ts` (existing edit logger)                      | 0.10   | If the user kept the deliverable mostly as-is, that's signal     |
| **Composite**                                | weighted sum / 1.00                                                     |        |                                                                  |

For each deliverable type we define its own rubric. The validators already exist as Stop hooks — they just emit pass/fail today. The new work is wrapping them to emit a normalized [0,1] sub-score and combining into the composite.

### 4.2 Cross-deliverable normalization

To compare skill versions across engagements, scores need to be relative to a baseline. We snapshot the no-skill score (target model with empty skill) on `D_sel` once per release; all skill versions are scored as deltas vs that baseline. This is the paper's `+X.X` improvement notation (Table 1).

### 4.3 The selection-split sourcing question (HiC-specific)

SkillOpt assumes a clean dataset. HiC engagements are heterogeneous (different goals, different corpora, different users). Options:

- **Option A** — Use the last N engagements as `D_sel`, sliding-window. Simple but introduces selection bias toward recent users.
- **Option B** — Curate a "golden" set of 8-12 historical engagements per deliverable type. Most-recent + most-edited + most-diverse. Requires one-time curation.
- **Option C** — Synthesize selection engagements: regenerate each prior engagement under the candidate skill, score against the original (which we have user edits on). This is closer to the paper's setup. Requires playable replay of historical corpora — most of which we have in `hic-workspace/sessions/`.

**Recommendation**: Option C — replay historical engagements. We already persist `corpus.json`, `chat.json`, `knowledge_graph.json` per session; the engagement is replayable. Replay 6-8 engagements per deliverable type, score the candidate skill's output against the original user-approved output. This gives a defensible held-out signal that's specific to the deliverable (not generic).

---

## 5. The text-patch operations (replacing JSON-path edits)

### 5.1 SkillOpt's four operations (paper §C.3)

```json
{
  "op": "append",
  "content": "<markdown to add at end of skill>"
}
{
  "op": "insert_after",
  "target": "<exact heading or text already in the skill>",
  "content": "<markdown to insert after target>"
}
{
  "op": "replace",
  "target": "<exact text to replace>",
  "content": "<replacement>"
}
{
  "op": "delete",
  "target": "<exact text to remove>"
}
```

Each edit also carries `support_count` (how many independent reflections proposed it) and `source_type` (`failure | success`). Edits are applied via deterministic string operations on the skill document — no AST navigation, no JSON-path traversal, no risk of "diving into a string."

### 5.2 Why this fixes our break

Today our journey artifact has a `html: string` field. A critic emits `target_path: html.grid.lane-row[0].cell[1].emo` — that crashes because we try to walk INTO the html string.

Under SkillOpt's pattern, the critic instead emits:

```json
{
  "op": "insert_after",
  "target": "### 5. Evidence depth contract (the JM ambition)",
  "content": "### 5a. Verbatim quote anti-fabrication\nIf the corpus does not carry a verbatim quote for a cell, OMIT the .vq element. Fabricated quotes are auto-reject.\n"
}
```

The edit applies to **the SKILL document, not the deliverable**. The deliverable is downstream — it's what the target model produces *using* the updated skill. The critic never touches the deliverable directly. This is the cleanest separation possible and it would have prevented today's failure.

### 5.3 Adapter on our side

We replace `applyEdits<T>(deliverable: T, edits: CriticEdit[]): T` with `applySkillPatch(skillDoc: string, edits: SkillEdit[]): string`. Pure-text-on-text. The deliverable is regenerated by the target model after the skill is patched, not edited directly.

---

## 6. The architecture

### 6.1 New directory layout

```
.claude/skills/<name>/
  SKILL.md                          # ← the current best-validated skill (deployed)
  meta/
    optimizer_memory.md             # ← optimizer-side meta-skill (not shipped to target)
    history.jsonl                   # ← every accepted edit, append-only
    rejected_edits.jsonl            # ← negative-feedback buffer (epoch-local)
    selection_scores.json           # ← skill-hash → r(s) cache
  slow_update.md                   # ← protected content, only rewritten at epoch boundaries
  D_sel.json                        # ← selection-split engagement IDs
  D_test.json                       # ← test-split engagement IDs (locked until final report)
```

### 6.2 The optimization loop (per skill)

```
1. Sample rollout batch B from D_train (4 engagements)
2. For each engagement: run h(M, x, s_current) → trajectory + score
3. Split trajectories into failure and success minibatches (B_m=4)
4. For each failure minibatch:
     optimizer_call(analyst_failure.md, [trajectories], skill_current) → patch proposal
5. For each success minibatch:
     optimizer_call(analyst_success.md, [trajectories], skill_current) → patch proposal
6. Merge failure proposals (merge_failure.md)
7. Merge success proposals (merge_success.md)
8. Final failure-prioritized merge (merge_final.md)
9. Rank merged edits, keep top L_t (ranking.md)
10. Apply edits → candidate skill s̃
11. If Hash(s̃) ∈ cache: use cached score; else:
      score = evaluate(M, h, s̃, D_sel)
      cache[Hash(s̃)] = score
12. If score > current: s_current = s̃; if also > best: s_best = s̃; commit to SKILL.md
13. Else: append edits + failure patterns to rejected_edits.jsonl
14. End of epoch: slow-update pass on protected section; meta-skill update
```

### 6.3 Where this lives in HiC

**Optimizer service**: New `services/skillOptimizer.ts` that orchestrates the loop. Calls Anthropic via the existing proxy with the seven SkillOpt prompt contracts (paper §C.2.1–§C.2.8).

**Runner harness**: New `proxy/skillopt_runner.py` (or a Python CLI) that runs offline — this is a TRAINING process that produces the skill, not an inference-time call. The deployed app never invokes the optimizer.

**Scoring service**: New `services/deliverableScorer.ts` that consumes the existing Stop-hook validators and emits the [0,1] composite.

**Replay service**: New `services/engagementReplay.ts` that re-runs a historical engagement with a candidate skill. Reads `hic-workspace/sessions/<slug>/{corpus,chat,knowledge_graph,state}.json` and replays through `geminiService.ts` / `chatToFreeform.ts` with the new skill plugged in.

**CLI entry point**: `npm run skillopt -- --skill journey-illustrator --epochs 4 --budget 80` — runs the full SkillOpt loop offline, writes a new `best/SKILL.md`, requires explicit user approval before promoting it to the deployed `SKILL.md`.

### 6.4 Inference-time impact

**Zero**. This is the most important property of SkillOpt for our context. The deployed agent (Gemini Pro / GPT-5.5 / Claude Opus on the user-facing side) just reads the current `SKILL.md`. The optimizer never runs at inference time. The cost is paid once during training; after export, the optimized `best_skill.md` adds nothing to per-request latency or cost (paper §4.6).

This is what lets us actually adopt this. If it required inference-time critic calls, we'd reintroduce the cost-and-latency overhead the user already pushed back on. The training-only optimizer pattern means: deploy unchanged, train offline, swap skill files when a new `best_skill.md` is approved.

---

## 7. Migration sequence

### Phase 0 — Foundations (1 week)

| Day | Work                                                                                                       |
|---|---|
| 1 | Pause all `runExpertPanel` calls in production paths (the band-aid fix from earlier in this session). Apply a guard that reverts to baseline behavior when the deliverable has an `html: string` field. |
| 2 | Build `services/deliverableScorer.ts`: per-deliverable composite scoring rubric, wired against existing Stop-hook validators. |
| 3 | Build `services/engagementReplay.ts`: replay a historical session deterministically. |
| 4 | Curate `D_sel` for each Tier-1 skill: 6-8 historical engagement IDs per deliverable type. |
| 5 | Run baseline measurement: every Tier-1 skill at current state scored on `D_sel`. This is the "no-skill" baseline for all subsequent uplift claims. |

### Phase 1 — Single-skill proof of concept (1 week, journey)

| Day | Work                                                                                                       |
|---|---|
| 1 | Restructure `journey-illustrator/SKILL.md` to SkillOpt shape: protected slow-update block, removed JSON-path-specific guidance, text-patch-friendly section structure. |
| 2 | Build `services/skillOptimizer.ts` with the seven prompt contracts from paper §C.2. |
| 3 | Build `proxy/skillopt_runner.py` CLI. |
| 4 | Run SkillOpt for journey for 4 epochs against curated `D_sel`. Capture rollouts, edits proposed, edits accepted, score deltas. |
| 5 | Review: is the optimized `best/SKILL.md` actually better? Score deltas vs baseline, manual inspection of 3 engagements regenerated under it. If yes, promote to deployed; if no, debug. |

**Acceptance**: journey on `D_sel` improves by ≥5 absolute points on the composite rubric vs no-skill baseline.

### Phase 2 — Tier-1 skill rollout (1 week, parallel)

Once Phase 1's pattern is proven, run the same loop for the other 7 Tier-1 skills in parallel. Each gets its own `D_sel`, its own optimizer run, its own validation gate.

### Phase 3 — Slow/meta update + transfer (1 week)

| Day | Work                                                                                                       |
|---|---|
| 1-2 | Implement the epoch-wise slow/meta update on every Tier-1 skill. |
| 3-4 | Implement the optimizer-side meta-skill that captures cross-engagement editing patterns (this is naturally complementary to our existing `cross-engagement-pattern-miner` subagent). |
| 5 | Cross-deliverable transfer test: train a skill on educational-coop engagements, score on a customer-purchase engagement. Test the paper's transfer claim. |

### Phase 4 — Retire band-aid critic-revise loop (close-out)

Once all Tier-1 skills are SkillOpt-trained:

- Delete `services/criticReviseLoop.ts::applyEdits` JSON-path path
- Delete `runExpertPanel` JSON-path edit application (keep the deterministic em-dash + slop strip — that's the only universal hygiene pass that should run inline)
- Update `services/artifactExpertPanel.ts::EXPERT_PANELS` to be advisory-only (critics emit rationales that go into the next training cycle's rollout, not into the deliverable)
- Mark the previous `criticReviseLoop` architecture as deprecated in CLAUDE.md

---

## 8. Risks and open questions

### 8.1 Risks

1. **Replay non-determinism**: Replaying a historical engagement with a different skill on the same corpus will produce different output. Temperature=0 plus seeded sampling on the target model mitigates this. We already enforce this for some calls (per `feedback_determinism_first_for_cached_runs`). Need full coverage.

2. **Selection-split contamination**: If `D_train` overlaps with `D_sel`, validation is meaningless. Need a hard split at curation time.

3. **Score-function gaming**: If the optimizer learns to optimize the rubric components without improving actual quality, we get Goodhart's law. Mitigation: hold the user-edit-delta component above 10% weight; it's the only signal that's not directly visible to the optimizer model.

4. **Skill bloat**: SkillOpt's paper-reported skill sizes (379–1,995 tokens) are small. Our current journey-illustrator skill is already ~5,000 tokens (long). The optimizer might try to extend rather than refactor. Mitigation: cosine-decaying edit budget (paper §3.4); enforce a max skill size per deliverable type.

5. **Cost**: Each training run involves ~16 rollout batches × ~8 minibatches × ~3 optimizer calls = ~400 Claude Opus calls per skill per epoch. At ~$0.15/call = ~$60 per skill per epoch. 8 Tier-1 skills × 4 epochs = ~$2,000 in training cost. This is paid once.

6. **Optimizer LLM drift**: If we upgrade Claude Opus 4.7 → 4.8, previously-trained skills may no longer be optimal. SkillOpt's transfer experiments show robustness, but we should re-validate at each model upgrade. Adds operational overhead.

### 8.2 Open questions to resolve before implementation

- **Who owns the `D_sel` curation decision?** This is the most consequential one-time setup; bad curation makes everything downstream meaningless.
- **Should the optimizer be allowed to add new sections, or only edit within existing structure?** SkillOpt's `append` operation says yes; our SKILL.md schema is more opinionated. Recommend: yes, but with a max-section-count guard.
- **Do we expose the trained skill's history.jsonl to the agent at runtime?** Paper says no — the deployed skill is `best_skill.md` only. We agree.
- **How do we handle skills used by both deck path AND freeform path (e.g., journey)?** Two separate trainings, two separate `best_skill.md` per harness — OR one training with both harnesses as part of the rollout. Paper's harness-agnostic design suggests one training. Recommend: one skill, harness-agnostic.
- **What's the relationship to existing self-improvement infrastructure** (`promptImprovementEngine.ts`, `chatFeedbackExtractor.ts`, learned-constraints injection)? **These become the training-data substrate.** Edit-history → trajectory scores; chatFeedback → success/failure labels; learned constraints → seed rules in the meta-skill. The existing infra was building toward this without knowing it.

---

## 9. Acceptance criteria for considering SkillOpt-for-HiC "shipped"

1. **Phase 1 success**: journey-illustrator's SkillOpt-trained `best_skill.md` improves `D_sel` composite score by ≥5 absolute points vs no-skill baseline AND produces a journey artifact that passes all Stop-hook validators on 6 out of 6 replay engagements.

2. **Phase 2 success**: All 8 Tier-1 skills meet the same criterion as Phase 1.

3. **Cross-harness transfer success**: Journey skill trained against the freeform-HTML harness transfers to the deck PPTX harness with a positive delta (paper claims +59.7 on a related transfer; we'd accept any positive number).

4. **Retirement success**: `runExpertPanel`'s JSON-path edit application is removed from the codebase. Only deterministic hygiene (em-dash, banned-phrase strip) runs inline. All other critic feedback flows through the offline SkillOpt loop.

5. **Operational continuity**: Inference-time cost and latency unchanged from pre-SkillOpt baseline. The skill files are the only artifacts that change.

6. **Inspectability**: Every accepted edit in every skill has a `history.jsonl` entry naming the engagement IDs it was trained on, the rejected alternatives, and the score delta. A human reviewer can audit any skill's training history end-to-end.

---

## 10. What this plan does NOT do

- **Does not change which deliverables HiC produces.** Same set of artifacts.
- **Does not change inference-time architecture.** Target model and harness untouched.
- **Does not affect user-facing UX.** The deck/Design Desk/chat surfaces look identical.
- **Does not introduce new dependencies.** Uses existing Anthropic + Gemini proxies.
- **Does not require model re-training.** Frontier model weights stay frozen.
- **Does not require user approval for individual edits.** SkillOpt is automated; user approves the *trained skill*, not individual edits within it. (Same approval gate we use today for SKILL.md changes.)

---

## 11. The unresolved question (your call)

Two paths forward, both legitimate:

### Path A — Ship the band-aid fixes from today, defer SkillOpt to a sprint
- Apply the `applyEdits` corruption guard (already drafted, not yet rebuilt)
- Apply the `$ROOT` sentinel fix (already drafted)
- Implement the two-pass JM regeneration pattern (~1 hour) for the immediate quality lift
- Park SkillOpt for a dedicated 4-week sprint with proper scoping, when you have engineering bandwidth and budget approval for the ~$2K training cost

### Path B — Skip the band-aids, commit to SkillOpt as the architectural fix
- The applyEdits + $ROOT fixes still ship (they're prerequisites — the corruption can't continue)
- The two-pass JM regeneration is deferred — it's a sophisticated band-aid that SkillOpt makes obsolete
- Begin Phase 0 immediately

### My recommendation

**Path A** for the next 24-48 hours (the band-aid fixes are already drafted; shipping them removes the live corruption blocker), then **Path B** as the durable architectural answer once Path A is stable. The two are not in tension — Path A's fixes are still load-bearing during Path B's transition, and Path A's two-pass JM pattern provides an immediate quality lift that doesn't conflict with SkillOpt's later landing.

But this is your call. Let me know which sequence to commit to before I touch any more code.
