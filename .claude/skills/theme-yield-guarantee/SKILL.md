---
name: theme-yield-guarantee
version: 2.0
description: HiC produces 15-25 themes from a 200+ document corpus by delegating cluster identification to BERTopic with nr_topics="auto" and auto-scaled min_cluster_size — the same approach proven in internal-solutions-socialresearch/backend/util/topic_model/BertTopic.py. The count comes from the algorithm reading the corpus, NOT from policy. LLM extraction supplements clustering by naming clusters (temperature=0). Quality gates (citation diversity, source diversity, evidence density) are enforced by Stop hooks AT NAMING TIME, not by tier relaxation. The 4-tier relaxation policy from v1.0 was REMOVED 2026-05-24 after observing that the sister Social Research service solves this problem with one BERTopic pipeline + zero relaxation tiers. Per the standing rules feedback_quality_first_never_relax_default and feedback_determinism_first_for_cached_runs, the count is met by upstream quality, not by lowering standards.
thinking: high
category: deliverable-enforcer
triggers:
  - theme yield
  - theme floor
  - "at least 20 themes"
  - "#theme-guarantee"
  - bertopic primary
---

# Theme Yield Guarantee — v2.0 (Simplified)

## The 2026-05-24 architectural reset

v1.0 of this skill codified a 4-tier evidence-relaxation policy that admitted single-source, unresolved-citation, and inherited-from-cache themes to hit a count floor. The user correctly flagged that as quality-blind. The forensic read of `internal-solutions-socialresearch/backend/util/topic_model/BertTopic.py` revealed that the working sister service produces 15-25 themes from 200+ docs with no relaxation tiers — just BERTopic with auto-scaled hyperparameters + LLM naming.

This skill is now a one-page contract pointing at the right architecture, not a 200-line policy.

## The architecture (matches Social Research, verified working)

1. **CLUSTERING is primary** — `proxy/topic_modeling.py` runs BERTopic with:
   - UMAP with `random_state=42` (deterministic; already in code)
   - HDBSCAN with `min_cluster_size` auto-scaled by corpus size (see `BertTopic.py:776-985` table)
   - `nr_topics="auto"` — the algorithm picks the count
   - SentenceTransformer embeddings (`all-mpnet-base-v2`)
2. **LLM NAMING is secondary** — for each cluster, Gemini Pro or Claude at `temperature=0` produces `{ name, description, lesson, implication }` from cluster top-terms + top documents. Naming is deterministic per cluster (no `temperature: 0.1`).
3. **QUALITY GATES are external** — the existing Stop hooks (validate_citations, validate_source_diversity, validate_evidence, validate_evidence_tier_distribution, validate_theme_yield) enforce HiC's partner-grade quality standards AT NAMING TIME, not via in-pipeline tier relaxation.
4. **No relaxation tiers.** No cached merge. No multi-angle LLM competition. If the corpus is genuinely thin (fewer than ~100 distinct documents), BERTopic will produce fewer clusters and the validators will surface that as a CORPUS quality problem, not be papered over.

## Expected yield (from Social Research's measured table)

| Corpus size | min_cluster_size | Typical theme count |
|---|---|---|
| <10 docs | 2 | 1-2 |
| 10-100 docs | 3 | 2-5 |
| 100-200 docs | 8 | 5-10 |
| 200-600 docs | 7 | **8-15** |
| >600 docs | 5 | **15-25** |

HiC research runs typically operate on 200-500 doc corpora → expect 8-15 themes natively from BERTopic. To reliably hit 15-25, the corpus must be larger OR the framework page must be loaded so retrieval pulls richer evidence (`validate_framework_page_exists.py` catches missing framework pages).

## Composition

- **`topic-cluster-to-theme-converter`** (also v2 after reset) — the primary theme generator. Reads BERTopic output, hands each cluster to a deterministic LLM naming pass.
- **`deterministic-naming-pass`** — the temperature=0 + seed contract that the naming step must honor.
- **`validate_theme_yield.py`** — Stop hook backstop that fails if shipped count < 20.
- **`validate_evidence_tier_distribution.py`** — Stop hook that ALARMS if any `evidence_tier` other than `thick` appears (the v1.0 tier vocabulary stays in the validator as an early-warning that the old policy crept back in).
- **`validate_theme_reproducibility.py`** — Stop hook that fails on drift across runs with the same corpus + goal hash.

## Hard rules

1. **BERTopic is the source of truth for cluster identity.** LLM extraction must not compete; it only names.
2. **No relaxation tiers.** Any code introducing `evidence_tier='single_source'` / `'unresolved_citation'` / `'inherited_from_cache'` is a regression and must be reverted.
3. **Temperature=0 on naming.** Social Research uses 0.1; HiC tightens to 0 for cross-deliverable identity stability.
4. **Quality gates run at naming time.** Citations, evidence density, source diversity — these are enforced by Stop hooks on the named themes, not by in-pipeline policy.
5. **If yield <15 on a 200+ doc corpus**, that's a CORPUS quality problem (missing framework page, broken retrieval, hallucinated queries) — fix upstream, not by relaxing the gate.
6. **No emoji.** Repo-wide rule.

## Why this is shorter than v1.0

The previous v1.0 of this skill ran ~250 lines codifying a 4-tier policy with detailed admission rules per tier. The right architecture doesn't need that complexity. The Social Research service produces stable, high-quality themes from 200+ document corpora using ~30 lines of BERTopic configuration + a simple LLM naming call. Match that. Subtract the policy. The standing rules (`feedback_quality_first_never_relax_default`, `feedback_determinism_first_for_cached_runs`, `feedback_check_sister_services_first`) make the rest of the discipline explicit.
