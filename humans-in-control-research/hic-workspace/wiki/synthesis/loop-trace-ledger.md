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
| 2026-10-01 21:24 | deliver-a-2026-risk-and-market-analysis-report-e | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 86.3 | stale |
| 2026-10-03 21:10 | generate-a-comprehensive-product-requirements-do | 249 | 7 | 0 | 0 | 0 | 0 | 0 | 4 | 64 | 0.0 | stale |
| 2026-10-04 18:16 | deliver-a-2026-risk-and-market-analysis-report-e | 75 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 47 | 207.1 | stale |
| 2026-10-09 17:13 | generate-a-comprehensive-product-requirements-do | 296 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 64 | 0.0 | stale |
| 2026-11-09 04:31 | identify-high-converting-email-design-patterns-a | 2 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0.0 | stale |
| 2026-11-09 04:31 | analyze-the-2026-ai-software-development-and-con | 11 | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 11 | 36358.0 | stale |
| 2026-11-16 22:15 | 1-understand-emerging-northeastern-university-st | 71 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 19 | 0.0 | stale |
