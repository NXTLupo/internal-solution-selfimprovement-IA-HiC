# SkillOpt for HiC: operator's guide

This directory contains the offline SkillOpt training pipeline. See
`humans-in-control-research/plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md`
(Stage 5, findings C2/C4/C6/C7) for the current architecture; this README covers the
operator surface.

## What it does

Trains HiC's per-deliverable skill documents (e.g., `journey-illustrator/SKILL.md`)
against real production artifacts using SkillOpt (arXiv:2605.23904). The
training is offline; the deployed inference path is unchanged. A trained
candidate becomes a PROPOSAL; a skill changes only after the held-out gate
rules APPROVE.

## The loop (one path, four gates)

```
jobs complete  ->  counter  ->  epoch due  ->  batch (proposals)  ->  held-out verdict  ->  promotion
   emitDeliverable   proxy        proposal      skillopt-batch.sh      <skill>.verdict.json   cp (APPROVE only)
```

1. **Counter.** Every emitted artifact ends with `epochTrigger.recordJobCompletion`
   (`services/emitDeliverable.ts`). One count per research run. The proxy's
   `GET /api/epochs/status` is the disk-authoritative reader; until the proxy
   exposes `POST /api/epochs/jobs`, the SPA persists the count at
   `wiki/synthesis/epoch-job-counter.json` and merges it with the proxy status.
2. **Epoch due.** When `jobs_since_last_epoch >= threshold` (default 5) the run
   writes ONE pending proposal (`target_layer: epoch`) to `/api/epochs/proposals`.
   The owner sees it in the SPA (EpochProposalsPanel). Nothing is applied.
3. **Batch.** `POST /api/epochs/run-batch` (proxy) runs `scripts/skillopt-batch.sh`
   with the scripts mounted. For every validator-ACCEPTED candidate the batch writes
   `hic-workspace/skillopt/proposals/<batch>/<skill>.proposal.json`. The validator
   (`validate-candidate.py`) is a rung 1-2 structural check; it is NOT a promotion
   signal.
4. **Verdict.** The held-out gate (`services/goldenSetRunner.ts` `runGate` before and
   after, `compareReports`) writes `<skill>.verdict.json` next to the proposal:
   `{"verdict": "APPROVE" | "REJECT" | "HUMAN-REVIEW", "discrimination_before", "discrimination_after", "golden_set_version"}`.
5. **Promotion.** `skillopt-batch.sh --auto-promote` (or `--promote-only`) copies a
   candidate over the live SKILL.md ONLY when the verdict file says APPROVE and
   `npm run regression:obligations` is green. No verdict, no `cp`. The same verdict
   shape rides to `POST /api/skill/write` as `gate_verdict`; the proxy refuses a
   skill write without it.

Feedback-driven skill patches (`services/learningEngine.ts`) follow the same rule:
`applySkillPatch` writes a `kind: skill_patch` proposal to `/api/epochs/proposals`;
`patchSkillFile` throws without an APPROVE verdict.

## Scheduler: there is ONE

The proxy job counter is the scheduler. There is no cron and no Windows Task
Scheduler job: `skillopt-weekly.sh` and `skillopt-weekly.xml` were deleted on
2026-10-01 (the task they described was never registered; `Get-ScheduledTask
\NXT-Humans\` returned nothing). Expected proxy contract:

- `GET /api/epochs/status?threshold=5` ->
  `{due, jobs_since_last_epoch, threshold, last_epoch_at, next_epoch_id, computed_at, pending_proposal_id}`
  where `jobs_since_last_epoch` is a disk-persisted job count (not an engagement mtime scan).
- `POST /api/epochs/jobs` `{run_id, deliverable, threshold}` -> the same status after the
  increment; idempotent per `run_id`.
- `POST /api/epochs/run-batch` `{epoch_id?, dry_run?, skills?}` ->
  `{ok, batch_id, proposals_dir, started_at}`; runs the batch with mounted scripts and
  writes proposals only.

## Manual use

```bash
# 1. Extract real rollouts
npm run skillopt:extract

# 2. Build training set (real + synthetic failures)
npm run skillopt:build-training

# 3. Train all Tier-1 skills -> proposals (never promotes)
npm run skillopt:train

# 4. Plan only (creates no directories)
bash scripts/skillopt-batch.sh --dry-run

# 5. Promote one candidate that has an APPROVE verdict file
BATCH_ID=<batch> bash scripts/skillopt-batch.sh --promote-only \
  --skill=persona-architect \
  --candidate=/d/tmp/skillopt-batch-<batch>/SKILL.candidate-<ts>.md \
  --skill-path=.claude/skills/persona-architect/SKILL.md
```

`build-training-set.py` REJECTS any batch with zero exogenous rollouts (real
artifacts or user feedback): synthetic-only training is a collapse risk, not a
training run.

## Components

| Script | Purpose |
|---|---|
| `run-skillopt.py` | Single-skill optimizer. Runs the SkillOpt loop (failure analyst, success analyst, hierarchical merge, ranking, patch application). |
| `score-rollouts.py` | Scoring rubric per deliverable kind. Mirrors the TS scorer in `services/deliverableScorer.ts`. |
| `extract-rollouts.py` | Scans `hic-workspace/{sample-artifacts,artifacts}/` and emits per-kind rollouts JSON. |
| `build-training-set.py` | Merges real rollouts with synthetic failure cases per kind. |
| `validate-candidate.py` | Rung 1-2 validation (structural, hygiene, failure-coverage). ACCEPT produces a proposal, never a promotion. |
| `skillopt-batch.sh` | Runs all Tier-1 skills, writes proposal files, promotes only on an APPROVE verdict file. |
| `regression-obligations.mjs` | Layer 4: tsc, vitest, template parity, frozen-baseline benchmark, proxy syntax. Fails when `hic-workspace/eval/benchmark-baseline.json` is absent. |

## Deployed skill files

Tier-1 skills the batch trains:

- `.claude/skills/diagrams/journey-illustrator/SKILL.md`
- `.claude/skills/persona-architect/SKILL.md`
- `.claude/skills/gap-analysis-evaluator/SKILL.md`
- `.claude/skills/roadmap-builder/SKILL.md`
- `.claude/skills/recommendation-architect/SKILL.md`
- `.claude/skills/strategy-author/SKILL.md`
- `.claude/skills/service-blueprint-mapper/SKILL.md`
- `.claude/skills/deck-composer/SKILL.md`
- `.claude/skills/human-voice-editor/SKILL.md`

## What to inspect after a batch

1. `<OUT_DIR>/<skill>.log` and `<skill>.validation.log`: per-skill train + validate output
2. `hic-workspace/skillopt/proposals/<batch>/<skill>.proposal.json`: the candidate awaiting a verdict
3. `hic-workspace/skillopt/proposals/<batch>/<skill>.verdict.json`: the held-out ruling
4. `hic-workspace/wiki/synthesis/epoch-proposals.json`: the owner-review ledger (`epoch_due`, `skill_patch`)
5. `hic-workspace/wiki/synthesis/improvement-epochs.md`: one record per completed epoch

## When to hold a verdict at HUMAN-REVIEW

- After a major schema change to a deliverable (e.g., new fields in `ServiceBlueprintData`). Read the candidate against the new schema first.
- After a banned-phrase rule change. The optimizer's `optimizer_memory` may need to catch up.
- After upgrading the optimizer model. Re-validate edit quality on one skill first.

## Cost telemetry

Every `run-skillopt.py` invocation reports `estimated_cost_usd` in its trace. At
Gemini 3.5 Flash + thinking=medium pricing a nine-skill batch costs well under a
dollar; the held-out gate adds no model calls (mechanical scoring).

## Failure modes and recovery

| Failure | Symptom | Recovery |
|---|---|---|
| Proxy unreachable | `recordJobCompletion` logs "Epoch tracker offline"; local counter still persists | Start `docker compose -f docker-compose-all.yml up -d research-proxy` |
| Optimizer LLM returns malformed JSON | `[failure-analyst-N] JSON parse failed` in log | The parse-repair layer recovers most cases; if persistent, switch optimizer to `--optimizer-model claude-sonnet-4-6` |
| All candidates rejected by validation gate | `Accepted (proposals): 0` in batch summary | Inspect `validation.log` per skill; usually means hygiene regressed or skill name was changed |
| Promotion refused | `PROMOTION REFUSED: no verdict file` | Run the held-out gate and write `<skill>.verdict.json`; a validator ACCEPT is not a verdict |
| Promoted skill produces worse output | Live deliverables score lower in the next session | Revert: `git log -- .claude/skills/<name>/SKILL.md` then `git checkout <prev-sha> -- <path>`; the epoch outcome tracker also files a rollback verdict |
