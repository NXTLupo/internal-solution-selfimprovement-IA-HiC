---
id: synthesis/loop-trace-ledger.md
title: Loop-trace ledger (per-run loop metrics, append-only)
type: synthesis
updated: 2026-08-07
---

# Loop-trace ledger

One row per research run. Columns: rounds = provider-call turns; fallbacks; retries; failures; repairs = failed->later-passed steps; REGRESSIONS = passed->later-failed steps; directives = V4 constraint enforcement events; models/steps = distinct counts.

Active research runs include the session initiated on 2026-04-12 [evidence/research-findings.md]. No loop-trace ledger metrics are currently available for this run.

| date (UTC) | session | rounds | fallbacks | retries | failures | repairs | regressions | directives | models | steps | wall-min | flush |
|---|---|---|---|---|---|---|---|---|---|---|---|---|