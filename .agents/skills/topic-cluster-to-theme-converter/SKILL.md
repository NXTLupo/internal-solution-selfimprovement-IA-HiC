---
name: topic-cluster-to-theme-converter
invocation: model
version: 2.0
description: PRIMARY theme generator for HiC (promoted 2026-05-24 from additive to primary). Mirrors the working architecture in internal-solutions-socialresearch/backend/util/topic_model/BertTopic.py — BERTopic with UMAP random_state=42 + HDBSCAN with auto-scaled min_cluster_size produces 15-25 stable clusters from a 200+ document corpus; an LLM names each cluster at temperature=0 from top-terms + 25 example documents. Theme identity comes from the deterministic clustering layer; LLM only names. Same cached corpus + same goal → same theme set. Per feedback_check_sister_services_first, the simpler proven architecture replaces the over-engineered LLM-extraction layer that produced 13 unstable themes on the 2026-05-24 Northeastern run.
thinking: high
category: upstream-quality
triggers:
  - cluster to theme
  - bertopic themes
  - "#topics-to-themes"
  - primary theme pipeline
---

# Topic Cluster to Theme Converter — v2.0 (Primary, not additive)

## The pipeline (matches Social Research)

```
1. Retrieve corpus (existing HiC retrieval — 200+ wiki + external articles)
2. Embed via SentenceTransformer('all-mpnet-base-v2') — proxy/topic_modeling.py
3. Reduce dimensionality via UMAP (random_state=42, fixed)
4. Cluster via HDBSCAN with corpus-scaled min_cluster_size:
     - <10 docs: 2
     - 10-100: 3
     - 100-200: 8
     - 200-600: 7
     - >600: 5
5. Extract top-10 terms per cluster (c-TF-IDF, deterministic)
6. Select up to 25 example documents per cluster via SentenceTransformer cosine similarity
7. LLM-NAME each cluster (Gemini Pro or Codex at temperature=0):
     - prompt = top_terms + example_documents + research_goal
     - output = { short_summary, one_sentence_summary, long_summary, lesson, implication }
8. Attach citations (top documents → sourceName references)
9. Apply quality gates via Stop hooks (citation diversity, source diversity, evidence density)
10. Stamp reproducibility_hash for cross-deliverable identity stability
```

This is what Social Research does. It produces 15-25 themes from 200+ docs. HiC ports it.

## Why this is PRIMARY now

v1.0 of this skill framed cluster-to-theme as ADDITIVE — it would supply 15-30 extra candidates that joined the LLM extraction pool. That was wrong. BERTopic IS the theme identification algorithm; LLM extraction was the redundant layer.

Per `feedback_check_sister_services_first` (saved 2026-05-24 alongside this rewrite): the sister Social Research service already proved the architecture. Don't compete with it; replicate it.

## What HiC adds vs Social Research (the small, real superiority)

| HiC-specific | Why |
|---|---|
| Tighter LLM temperature (`0` vs Social Research's `0.1`) | Cross-deliverable identity stability — themes feed personas + recommendations + slides, so naming drift would propagate |
| Quality gates via Stop hooks | Partner-grade output discipline; Social Research is exploratory and doesn't need this |
| Citation traceability across heterogeneous corpus (academic + news + government + uploads, not just Reddit) | `[CHUNK_NNN]` resolution layer |
| `reproducibility_hash` for cross-deliverable consistency | Stable theme IDs across the full deliverable chain |

Everything else is identical to Social Research's pipeline.

## Engineering wiring (next step — TypeScript port)

The Python pipeline already exists at `humans-in-control-research/proxy/topic_modeling.py` and matches Social Research's approach in shape. The frontend wiring in `services/geminiService.ts` `generateThemes()` should:

1. Call `/api/topic-model/analyze` with the corpus
2. Poll `/api/topic-model/status/<job_id>` until completed
3. For each topic in `result.topics`, call an LLM at `temperature=0` to name the cluster (see `internal-solutions-socialresearch/backend/util/topic_prompt.py:9-29` for the exact prompt pattern)
4. Apply the existing thick-evidence filter at TOP_N=25 (the simpler version from the 2026-05-24 reset)
5. Stamp `reproducibility_hash` so the Stop hooks can verify cross-run stability

The existing LLM extraction (`_runBreadthPass` and related) becomes the FALLBACK for corpora too small for BERTopic to produce stable clusters (<100 docs).

## Composition

- **Reads from**: `proxy/topic_modeling.py` via `/api/topic-model/analyze` + `/api/topic-model/status`
- **Reference implementation**: `internal-solutions-socialresearch/backend/util/topic_model/BertTopic.py` (verified working)
- **Naming pattern**: `internal-solutions-socialresearch/backend/util/topic_prompt.py:9-29`
- **Pairs with**: `deterministic-naming-pass` (the temperature=0 contract this skill honors), `theme-yield-guarantee` v2.0 (the count-is-from-algorithm rule)
- **Validated by**: `validate_theme_yield.py`, `validate_theme_reproducibility.py`, `validate_evidence_tier_distribution.py`, `validate_citation_resolution.py`, `validate_source_diversity.py`

## Hard rules

1. **BERTopic with random_state=42 is the cluster source of truth.** LLM cannot compete with it.
2. **LLM names at temperature=0.** Social Research uses 0.1; we tighten one notch for full reproducibility.
3. **Stop hooks enforce HiC-specific quality.** Citations, evidence density, source diversity — handled by validators, not in-pipeline policy.
4. **Reproducibility hash on every deliverable.** Same corpus + same goal → same theme IDs and names.
5. **No emoji.** Repo-wide rule.
