---
name: source-yield-scorer
description: "Score data collection, not output: aggregate the proxy's connector-health ledger into per-source reliability and yield scores and write source-scores.md, which research-planner reads to deprioritize dead connectors. Run on a weekly cadence."
invocation: model
version: "1.0"
status: active
thinking: medium
category: agentic-loop
triggers:
  - "#source-scores"
  - score sources
  - connector health
---

# Source Yield Scorer

## Scope

Enhancement F (data-pipeline-bulletproofing-2026-06-08). The collection-side self-improvement loop the architecture audit found missing - the prior loop scored only deliverable OUTPUT, never data COLLECTION. Aggregates the proxy's connector-health ledger (per /api/search call: items_returned, http_status, latency_ms) into per-source reliability + yield scores, and writes source-scores.md. research-planner reads it to deprioritize dead connectors and prefer high-yield ones. Run on a weekly /loop cadence.

## You Are

The collection-quality learner. The HiC self-improvement loop (traceRecorder, qualityFrontier, epochOutcomeTracker) scores how good the DELIVERABLE is. Nothing scored how good the DATA COLLECTION is - so the system re-selected dead connectors every run. This skill closes that gap: it turns the connector-health ledger into a ranked source scorecard the research-planner consults before choosing sources.

## When to activate

- Weekly `/loop` cadence, or on demand via `#source-scores`.
- After a research run that hit many connectors (the ledger has fresh rows).

Do NOT activate mid-generation (it is an offline aggregation, not a hot-path step).

## Inputs

- `hic-workspace/wiki/synthesis/connector-health.jsonl` - one row per `/api/search/{source_id}` call:
  ```json
  {"source_id":"openalex","ts":"2026-06-08T...","items_returned":18,"status":200,"latency_ms":820,"error":""}
  ```
  (Appended by `proxy/app.py::_connector_health_append`, Enhancement F.)
- Optional: `hic-workspace/wiki/synthesis/generation-failures.md` for cross-referencing corpus-relevance complaints to specific sources.

## Output - source-scores.md

Write `hic-workspace/wiki/synthesis/source-scores.md`. One row per source_id seen in the ledger:

```
# Source scores (updated <YYYY-MM-DD>)

| source_id | calls | success_rate | avg_items | yield_score | reliability | verdict |
|-----------|-------|--------------|-----------|-------------|-------------|---------|
| openalex  | 142   | 0.98         | 16.2      | 0.91        | 0.98        | KEEP    |
| some_rss  | 40    | 0.20         | 0.4       | 0.06        | 0.20        | DEAD    |
```

Definitions (compute deterministically from the ledger):
- `calls` = row count for the source.
- `success_rate` = fraction of rows with status 200.
- `avg_items` = mean items_returned over successful rows.
- `yield_score` = normalize(avg_items) * success_rate, clamped 0..1 (normalize avg_items by the 90th-percentile avg_items across all sources so one prolific source does not flatten the rest).
- `reliability` = success_rate adjusted down if avg latency is in the worst quartile.
- `verdict`: DEAD if success_rate < 0.3 OR avg_items < 0.5; WEAK if yield_score < 0.25; KEEP otherwise.

## Hard rules

1. **Deterministic.** Same ledger -> same scorecard. No randomness, no LLM scoring of numbers - these are arithmetic aggregates. (An LLM may write the one-line verdict rationale, but the numbers are computed.)
2. **Never delete a source from the registry.** This skill only RANKS; research-planner deprioritizes. Removal is a human decision.
3. **Append, never destroy the ledger.** The .jsonl is the audit trail. If it exceeds ~50MB, roll it to `connector-health.<date>.jsonl` and start fresh; do not truncate silently.
4. **No emoji.** Repo-wide rule.
5. **Surface, don't hide, gaps.** If a source has < 5 calls, mark verdict UNKNOWN (insufficient data) rather than guessing.

## Composition

- WRITES `synthesis/source-scores.md`; READ by `research-planner` step 3.
- COMPLEMENTS `validate_corpus_relevance_distribution.py` (which detects a low-relevance corpus per run) by attributing the low relevance to specific connectors over time.
- The epoch-proposer may cite a DEAD verdict as the evidence for a proposed source-registry deprioritization edit (one edit per epoch).
