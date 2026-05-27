---
title: HiC Evaluation Substrate
type: eval
created: 2026-05-24
purpose: golden-corpus + KPI harness for the NotebookLM uplift plan
---

# HiC Evaluation Substrate

Phase 0 of `plans/hic-notebooklm-uplift-plan-2026-05-24.md`. Every subsequent phase must beat the baseline metrics captured here.

## Directory layout

```
evals/
├── README.md                      ← this file
├── kpi_definitions.json           ← canonical metric definitions
├── run_eval.py                    ← harness (CLI)
├── corpus-v1/                     ← three golden corpora
│   ├── higher-ed-coop/
│   │   ├── corpus.jsonl           ← N items: {id, title, body, source, source_type}
│   │   ├── goal.txt               ← research goal
│   │   ├── expected_themes.json   ← human-curated answer key
│   │   ├── expected_personas.json
│   │   └── expected_recommendations.json
│   ├── b2b-saas-retention/
│   └── healthcare-engagement/
├── baselines/                     ← frozen results per pipeline version
│   └── 2026-05-24-pre-uplift.json
└── runs/                          ← timestamped run outputs
    └── YYYY-MM-DD-phase-N.json
```

## The 5 KPIs

Per Phase 0 acceptance criteria in the uplift plan.

### 1. theme_recall@20

Fraction of human-expected themes the pipeline surfaces in its top 20.

```python
def theme_recall_at_20(generated_themes, expected_themes):
    generated_names_top20 = {normalize(t.name) for t in generated_themes[:20]}
    matched = sum(
        1 for e in expected_themes
        if any(fuzzy_match(normalize(e.name), gn, threshold=0.7) for gn in generated_names_top20)
    )
    return matched / len(expected_themes)
```

**Acceptance bar:** Phase 1 ≥ baseline + 15%. Plan-end ≥ baseline + 25%.

### 2. citation_grounding_rate

Fraction of generated claims that map to a chunk_id whose content contains the claim's key entities + ≥1 key predicate within edit distance ≤ 15%.

```python
def citation_grounding_rate(deliverable, chunk_source_map):
    claims = extract_claim_sentences(deliverable)
    grounded = 0
    for claim in claims:
        cited_chunks = resolve_chunk_refs(claim)
        if not cited_chunks:
            continue
        key_entities = extract_named_entities(claim)
        key_predicate = extract_predicate(claim)
        for chunk_id in cited_chunks:
            chunk_body = chunk_source_map[chunk_id].body
            if (
                all(entity_in_body(e, chunk_body) for e in key_entities) and
                predicate_match(key_predicate, chunk_body, edit_distance_threshold=0.15)
            ):
                grounded += 1
                break
    return grounded / max(len(claims), 1)
```

**Acceptance bar:** Phase 2 ≥ 0.85. Baseline likely ~0.65.

### 3. reproducibility_drift

Given the same `corpus_hash + goal`, percentage of theme names that change across 5 consecutive runs.

```python
def reproducibility_drift(runs):
    # runs: list of theme-name sets from N=5 consecutive runs with same hash
    baseline = runs[0]
    drift_count = 0
    total = 0
    for r in runs[1:]:
        total += len(baseline)
        drift_count += len(baseline.symmetric_difference(r)) / 2
    return drift_count / total
```

**Acceptance bar:** ≤ 5%.

### 4. time_to_first_theme

Seconds from "Click Collect" to first theme rendered.

**Acceptance bar:** Cache hit (repeat corpus): < 8s. Cache miss (fresh corpus): < 60s for 200-doc corpus.

### 5. provider_failover_p99

p99 latency added when primary provider 429s mid-pipeline.

**Acceptance bar:** < 8s.

## Running the harness

```bash
cd humans-in-control-research
python evals/run_eval.py --corpus corpus-v1/higher-ed-coop --pipeline-version v4.2 --output evals/runs/2026-05-24-baseline.json
```

The harness:
1. Loads the golden corpus
2. POSTs to `/api/topic-model/analyze` with target_topic_count=25
3. Polls `/api/topic-model/status/<id>` until complete
4. Computes all 5 KPIs
5. Writes the run JSON

## Baseline frozen at 2026-05-24

The baseline file at `baselines/2026-05-24-pre-uplift.json` represents HiC v4.2 BEFORE the NotebookLM uplift began. Every Phase eval result MUST be compared against this baseline. Regressions block phase advancement.
