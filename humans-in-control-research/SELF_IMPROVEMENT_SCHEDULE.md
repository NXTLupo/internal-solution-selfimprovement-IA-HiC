# Self-Improvement Schedule (the "second brain" cadence) — 2026-06-16

Wires the self-improvement primitives onto a cadence, per the Karpathy / Matt Wolfe second-brain
pattern: **nightly ingest → weekly maintenance → monthly health-check**, with a propose-and-test gate
on anything that edits the harness (RHO/SkillOpt discipline).

Two execution lanes:
- **Headless (CLI)** jobs run via `scripts/self-improvement-schedule.sh` + OS scheduler.
- **Claude-driven** jobs (agents/skills that need the Claude runtime) run via Claude Code `/schedule`
  (cloud cron) or `/loop`.

---

## Cadence table

| Job | Lane | Cadence | Mechanism | Gate |
|---|---|---|---|---|
| Proactive ingest (poll youtube channels) | headless | nightly 01:00 | `self-improvement-schedule.sh nightly` → `POST /api/scheduler/poll-youtube-channels` | n/a (additive ingest) |
| Manifest-chunk parity audit | headless | nightly 01:00 | same runner → `validate_manifest_chunk_parity.py` | report-only |
| SkillOpt retrain (Tier-1 skills) | headless | weekly Sun 06:00 | `skillopt-weekly.sh` (existing `skillopt-weekly.xml`) | **STRICT** — `validate-candidate.py` held-out coverage ≥0.5 + hygiene-delta ≥ -0.05 before `--auto-promote` |
| wiki-curator (broken-link/orphan cleanup, stale >90d) | Claude | weekly | `/schedule` or `/loop 7d` → `@wiki-curator` | proposes deletions; human approves |
| cross-engagement-pattern-miner | Claude | weekly | `/schedule` → `/cross-engagement-pattern-miner` | writes `cross-engagement-patterns.md` (injected next run) |
| orphan-code-auditor | Claude | weekly | `/schedule` → `@orphan-code-auditor` | report-only |
| schema-drift-auditor | Claude | weekly / pre-release | `/schedule` → `@schema-drift-auditor` | report-only |
| epoch-proposer (one bounded harness edit) | Claude | when `jobs_since_last_epoch ≥ 5` (check weekly) | `/epoch-proposer` | **STRICT** — golden-set `compareReports`; applies only on `apply` verdict |
| Monthly health-check (7-stage audit: contradictions, broken backlinks, stale, unsourced, suggested articles) | Claude | monthly 1st | `/schedule` monthly → health-check pass over `wiki/` | propose-then-approve |

---

## Install — headless lane (Windows Task Scheduler)

Mirror the existing `skillopt-weekly.xml`. Register three tasks (run from repo root):

```powershell
# nightly 01:00
schtasks /create /tn "NXT-Humans\SelfImprove-Nightly" /sc daily /st 01:00 ^
  /tr "\"C:\Program Files\Git\bin\bash.exe\" -c \"/d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/self-improvement-schedule.sh nightly\""
# weekly Sun 06:00  (SkillOpt already covered by skillopt-weekly.xml; this adds the unified pass)
schtasks /create /tn "NXT-Humans\SelfImprove-Weekly" /sc weekly /d SUN /st 06:00 ^
  /tr "\"C:\Program Files\Git\bin\bash.exe\" -c \"/d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/self-improvement-schedule.sh weekly\""
# monthly 1st 05:00
schtasks /create /tn "NXT-Humans\SelfImprove-Monthly" /sc monthly /d 1 /st 05:00 ^
  /tr "\"C:\Program Files\Git\bin\bash.exe\" -c \"/d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/self-improvement-schedule.sh monthly\""
```

Unix cron equivalent:
```
0 1 * * *  /d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/self-improvement-schedule.sh nightly
0 6 * * 0  /d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/self-improvement-schedule.sh weekly
0 5 1 * *  /d/NXT-HUMANS_AI_CX_WORKBENCH/humans-in-control-research/scripts/self-improvement-schedule.sh monthly
```

Health log accrues to `hic-workspace/wiki/synthesis/self-improvement-health-log.md`.

## Install — Claude lane

The agent/skill jobs need the Claude runtime. Create them with the `/schedule` skill (CronCreate
cloud routines) — recommended invocations:

```
/schedule weekly Mon 07:00  — run @wiki-curator, @orphan-code-auditor, then /cross-engagement-pattern-miner; write findings to wiki/synthesis/
/schedule weekly Mon 07:30  — check epochTrigger; if jobs_since_last_epoch >= 5 run /epoch-proposer (gate-gated, apply only on `apply` verdict)
/schedule monthly 1 08:00   — run the 7-stage wiki health-check; propose fixes for human approval
```

Or, for an interactive session, `/loop 7d @wiki-curator` etc. These are NOT auto-created by this
commit (spawning recurring autonomous cloud agents is an outward action) — create them on approval.

---

## Gate posture (ties to the gating audit, plans/de-rag-consistency-audit-2026-06-16.md)

- **Anything that EDITS the harness goes through a strict gate** before landing: SkillOpt
  (`validate-candidate.py`) and epoch-proposer (`goldenSetRunner.compareReports`). Schedule only
  *fires* these; the gate decides what persists.
- The **weak live loops** (`learningEngine`, `promptImprovementEngine` — count/heuristic auto-approve,
  no re-scoring) are NOT scheduled here; they fire per-feedback in the SPA. Hardening them to route
  through the strict gate (propose-only → gated apply) is the open remediation from the gating audit.
- Read-only auditors (manifest-parity, orphan, schema-drift, wiki-curator findings) never auto-mutate;
  they report and propose. Human-in-the-loop on deletions and harness edits.
