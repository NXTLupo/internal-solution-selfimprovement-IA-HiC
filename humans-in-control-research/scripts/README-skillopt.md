# SkillOpt for HiC — operator's guide

This directory contains the offline SkillOpt training pipeline. See
`humans-in-control-research/plans/skillopt-for-hic-uplift-2026-05-25.md` for
the full architecture rationale; this README covers the operator surface.

## What it does

Trains HiC's per-deliverable skill documents (e.g., `journey-illustrator/SKILL.md`)
against real production artifacts using SkillOpt (arXiv:2605.23904). The
training is offline; the deployed inference path is unchanged. Skills compound
in quality every time the pipeline runs.

## Daily / weekly use

### One-off training of a single skill

```bash
# 1. Extract real rollouts
npm run skillopt:extract

# 2. Build training set (real + synthetic failures)
npm run skillopt:build-training

# 3. Train all Tier-1 skills (does NOT auto-promote)
npm run skillopt:train
```

### Training with auto-promotion (validation gate runs)

```bash
npm run skillopt:train-promote
```

Each candidate goes through `validate-candidate.py` (structural integrity,
universal hygiene, held-out failure-pattern coverage) PLUS the mandatory
layer 4: `npm run regression:obligations` (L2, 2026-08-07 - tsc, vitest,
template parity, frozen-baseline benchmarks, proxy syntax) must be green
before any promotion. A candidate that passes layers 1-3 but fails layer 4
stays un-promoted. The same suite gates epoch-proposer applications and
aiRouter routing repoints.

Additionally (R2, 2026-08-07): `build-training-set.py` REJECTS any batch with
zero exogenous rollouts (real artifacts or user feedback) - synthetic-only
training is a collapse risk, not a training run.

### Scheduled weekly retraining

```bash
# Unix cron (Sundays 6am)
0 6 * * 0 /d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/skillopt-weekly.sh

# Windows Task Scheduler — import skillopt-weekly.xml
schtasks /Create /TN "NXT-Humans\SkillOpt-Weekly" /XML scripts\skillopt-weekly.xml
```

Cost: ~$0.16/week (~$8/year) at Gemini 3.5 Flash + thinking=medium pricing.

## Components

| Script | Purpose |
|---|---|
| `run-skillopt.py` | Single-skill optimizer. Runs the SkillOpt loop (failure analyst, success analyst, hierarchical merge, ranking, patch application). |
| `score-rollouts.py` | Scoring rubric per deliverable kind. Mirrors the TS scorer in `services/deliverableScorer.ts`. |
| `extract-rollouts.py` | Scans `hic-workspace/{sample-artifacts,artifacts}/` and emits per-kind rollouts JSON. |
| `build-training-set.py` | Merges real rollouts with synthetic failure cases per kind. |
| `validate-candidate.py` | Three-layer validation gate (structural, hygiene, failure-coverage). |
| `skillopt-batch.sh` | Runs all 8 Tier-1 skills in sequence. |
| `skillopt-weekly.sh` | Full extract → train → promote → rebuild → log loop. |
| `skillopt-weekly.xml` | Windows Task Scheduler config for weekly runs. |

## Deployed skill files

Tier-1 skills that the weekly run trains:

- `humans-in-control-research/exemplar-skills/diagrams/journey-illustrator/SKILL.md`
- `.claude/skills/persona-architect/SKILL.md`
- `.claude/skills/gap-analysis-evaluator/SKILL.md`
- `.claude/skills/roadmap-builder/SKILL.md`
- `.claude/skills/recommendation-architect/SKILL.md`
- `.claude/skills/strategy-author/SKILL.md`
- `.claude/skills/service-blueprint-mapper/SKILL.md`
- `.claude/skills/deck-narrative-composer/SKILL.md`

Each becomes a trained artifact with version history (every accepted edit
logged in `D:/tmp/skillopt-batch-*/SKILL.skillopt-edits-*.json`).

## What to inspect after a run

1. `tmp/skillopt-weekly-<timestamp>/batch.log` — per-skill accept/reject summary
2. `tmp/skillopt-weekly-<timestamp>/candidates/SKILL.skillopt-edits-<timestamp>.json` — proposed edits per skill
3. `tmp/skillopt-weekly-<timestamp>/candidates/SKILL.skillopt-trace-<timestamp>.txt` — reasoning trace
4. `hic-workspace/wiki/synthesis/skillopt-weekly-log.md` — rolling weekly summary

## When to NOT auto-promote

- After a major schema change to a deliverable (e.g., new fields in `ServiceBlueprintData`). Manually review the first candidate to verify the optimizer's edits don't contradict the new schema.
- After a banned-phrase rule change. The optimizer's `optimizer_memory` may need to catch up.
- After upgrading the optimizer model (e.g., Gemini 3.5 Flash → 4.0 Pro). Re-validate edit quality on one skill first.

## Validation gate v0.2 (Phase 2 upgrade)

Current v0.1 gate runs in milliseconds — it does NOT regenerate the actual deliverable. The Phase 2 upgrade adds:

- Replay each rollout's task with the candidate skill against the real target model
- Score the regenerated output via `score-rollouts.py`
- Only promote if the candidate produces strictly higher composite scores on D_sel

Cost of Phase 2: ~$0.10 per skill (regenerates 2-3 rollouts × ~$0.04 each). Acceptable for weekly. See plan §3.4 Option C for replay implementation.

## Cost telemetry

Every `run-skillopt.py` invocation reports `estimated_cost_usd` in its trace.
The weekly run aggregates this in `batch.log`. Annual budget at current usage:

| Cadence | Cost |
|---|---|
| Per-skill, per-run | ~$0.016 |
| All 8 Tier-1, single run | ~$0.16 |
| Weekly cron (52 weeks/yr) | ~$8.32 |
| Phase 2 validation gate adds | ~$0.10/skill = ~$0.80/run = ~$42/yr |

## Failure modes and recovery

| Failure | Symptom | Recovery |
|---|---|---|
| Proxy unreachable | `weekly.sh` exits before running anything | Start `docker compose ... up -d research-proxy`, rerun |
| Optimizer LLM returns malformed JSON | `[failure-analyst-N] JSON parse failed` in log | The parse-repair layer recovers most cases; if persistent, switch optimizer to `--optimizer-model claude-sonnet-4-6` |
| All candidates rejected by validation gate | `Accepted: 0, Rejected: 8` in batch summary | Inspect `validation.log` per skill; usually means hygiene regressed or skill name was changed |
| Auto-promote succeeded but new skill produces worse output | Live deliverables score lower in next user session | Revert specific skill: `git log -- .claude/skills/<name>/SKILL.md` then `git checkout <prev-sha> -- <path>` |
