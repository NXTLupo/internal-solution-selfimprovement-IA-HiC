---
id: synthesis/loop-trace-ledger.md
title: Loop-trace ledger (per-run loop metrics, append-only)
type: synthesis
updated: 2026-08-07
exclude_from_compile: true
---

# Loop-trace ledger

One row per research run (L1, sota-elevation plan 2026-08-07). Columns:
rounds = provider-call turns; fallbacks; retries; failures; repairs =
failed->later-passed steps; REGRESSIONS = passed->later-failed steps;
directives = V4 constraint enforcement events; models/steps = distinct counts.

| date (UTC) | session | rounds | fallbacks | retries | failures | repairs | regressions | directives | models | steps | wall-min | flush |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-08-07 18:21 | live-test-2026-08-07 | 2 | 1 | 1 | 1 | 0 | 1 | 3 | 1 | 1 | 0.4 | finalize |

<!-- 2026-10-01: restored from git 7f33b9bd5 after the wiki compiler overwrote this append-only ledger on 2026-09-11 (plan Stage 0.3, audit C3). -->
