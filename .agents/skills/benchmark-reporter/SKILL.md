---
name: benchmark-reporter
description: Extract three or four hero metrics with named sources and render them as a stat row; every number travels inside an attributed quote. Used for benchmark, metrics and by-the-numbers requests.
invocation: runtime
disable-model-invocation: true
version: "1.0"
status: active
thinking: medium
triggers:
  - benchmark
  - benchmarks
  - metric
  - metrics
  - key numbers
  - stat
  - stats
  - statistic
  - statistics
  - by the numbers
  - kpi
  - kpis
  - performance numbers
  - data points
  - figures
  - facts and figures
  - top numbers
  - headline stats
  - scoreboard
  - scorecard
  - top metrics
loader:
  title: Benchmark Reporter
  role: research-deliverable
  execution_context: subagent
  benchmarks:
    - benchmarks/cx-metrics.md
    - benchmarks/financial-impact.md
    - benchmarks/technology-adoption.md
  output_types:
    - stat-row
    - evidence-block
---

# Benchmark Reporter

Extracts 3-4 hero metrics with named sources and renders them as oversized statistics. Every number carries an attribution — no hero stats without citations. Owns the stat-row slide template.
