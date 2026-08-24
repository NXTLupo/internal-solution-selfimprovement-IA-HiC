---
name: evidence-density-pre-checker
invocation: model
version: 1.0
description: Audits the corpus BEFORE theme/persona/recommendation generation begins. Predicts how many thick-evidence themes the current corpus can support. If the prediction is below the floor (20), fires upstream remediation — wiki-query-expander for additional retrieval angles, analog-finder for cross-industry analogues, framework-page check, search-query hallucination-guard inspection — BEFORE the generation pass runs, so the breadth pass starts with a corpus that can clear strict thick-evidence. Implements the standing rule (feedback_quality_first_never_relax_default): meet quantity floors by improving UPSTREAM, not by relaxing the strict gate. The shipping path that makes the 4-tier relaxation safety net rarely fire.
thinking: high
category: upstream-quality
triggers:
  - corpus density
  - pre-check corpus
  - "will themes succeed"
  - "#corpus-check"
  - "#density-precheck"
---

# Evidence Density Pre-Checker

## You Are

The discipline that catches a thin corpus BEFORE generation fires, instead of after. Today's pipeline runs the breadth pass against whatever the retrieval layer delivered, then discovers post-hoc that 87% of items were LOW relevance (the 2026-05-24 Northeastern run). By then the cost has been spent and the relaxation tiers fire.

Per the standing rule, the way to hit the 20-25 theme floor is upstream quality. This skill runs the audit upstream — BEFORE the breadth pass — and if the corpus can't support the floor, it fires the remediation BEFORE generation. The breadth pass then runs against an enriched corpus and produces strict thick-evidence themes.

## When to activate

- IMMEDIATELY after retrieval completes (the `[Corpus] Built chunk-to-source map` log line) and BEFORE `generateThemes` starts
- After any retrieval-enrichment pass — re-check the corpus to confirm the enrichment lifted predicted yield above the floor
- When the user types `#corpus-check` to inspect what generation would produce

Do NOT activate when:
- The deliverable is a NARROW themes deliverable (e.g., "themes for one specific subtopic" — narrow corpora legitimately produce fewer themes)
- The corpus comes from explicit user-curated uploads only (the user has pre-selected the sources)
- The pipeline is in a "cheap pass" mode (the pre-check itself costs <$0.05; cheaper than running generation against a doomed corpus)

## The 5-step audit protocol

### Step 1 — Corpus census

Count:
- Total chunks
- Distinct sources (`sourceName` field)
- Distinct source TYPES (academic, news, government, social, client-upload)
- Goal-keyword density (% of chunks containing ≥1 goal keyword)

### Step 2 — Relevance distribution check

Use the body-aware relevance scoring already in the pipeline:
- HIGH / MODERATE / LOW counts per the relevanceScoring output
- If `LOW_pct > 70%`, FLAG `corpus_relevance_skewed`
- If `HIGH_count < 5`, FLAG `corpus_high_relevance_thin`

### Step 3 — Framework-page check

For the target deliverable type:
- Does `wiki/frameworks/<type>.md` exist? If 404, FLAG `framework_page_missing` (this was a root cause on 2026-05-24)
- Does `wiki/anti-patterns/<type>.md` exist? If 404, FLAG `anti_patterns_missing`

### Step 4 — Search-query refinement check

Inspect the most recent `[refineSearchQueries] hallucination guard` log entry:
- If >10% of queries were below fidelity threshold and replaced with goal verbatim, FLAG `query_refinement_broken`

### Step 5 — Predicted thick-evidence yield

Apply this empirical model (tuned against the 2026-05-24 Northeastern run + the prior 9 sessions):

```
predicted_thick_yield = min(
  distinct_sources_in_high_relevance × 0.7,
  total_chunks_in_high_relevance / 8,
  distinct_source_types × 6
)
```

Then:
- predicted_thick_yield ≥ 25 → CORPUS_READY (no remediation needed)
- predicted_thick_yield 20-24 → CORPUS_MARGINAL (recommend ONE remediation: wiki-query-expander on coverage gaps)
- predicted_thick_yield 12-19 → CORPUS_THIN (fire TWO remediations: wiki-query-expander + analog-finder)
- predicted_thick_yield < 12 → CORPUS_INSUFFICIENT (halt generation; require manual review OR explicit user override)

## Remediation playbook (per FLAG)

| Flag | Remediation |
|---|---|
| `framework_page_missing` | HALT generation. Author the missing framework page first (this is a precondition, not a corpus issue) |
| `anti_patterns_missing` | WARN but allow; generation will lack failure-mode awareness |
| `corpus_relevance_skewed` | Invoke `wiki-query-expander` with 3-4 new angle variants targeted at the high-relevance source clusters |
| `corpus_high_relevance_thin` | Invoke `analog-finder` to pull cross-industry analogues that carry external sources |
| `query_refinement_broken` | Re-run retrieval with the original goal verbatim (skip the refinement layer) |
| `predicted_thick_yield < 20` | Fire the appropriate remediation per the predicted_thick_yield tier above |

## Output contract

Return a structured PreCheckReport BEFORE generation starts:

```yaml
corpus_status: <CORPUS_READY | CORPUS_MARGINAL | CORPUS_THIN | CORPUS_INSUFFICIENT>
census:
  total_chunks: <N>
  distinct_sources: <N>
  distinct_source_types: <N>
  goal_keyword_density: <0-1>
relevance:
  high_count: <N>
  moderate_count: <N>
  low_count: <N>
  low_pct: <0-1>
prediction:
  predicted_thick_yield: <N>
  reasoning: <one-line explanation>
flags: [<flag_name>, ...]
remediations_to_fire:
  - skill: wiki-query-expander
    args: <specific angles to try>
  - skill: analog-finder
    args: <functional pattern to seek analogues for>
halt_generation: <true|false>
halt_reason: <when halt=true, why>
```

## Engineering implementation (TypeScript)

New service module (co-located with `services/wikiService.ts`, which already owns `scoreOutput`):

```typescript
export interface PreCheckReport {
  corpus_status: 'CORPUS_READY' | 'CORPUS_MARGINAL' | 'CORPUS_THIN' | 'CORPUS_INSUFFICIENT';
  census: { total_chunks: number; distinct_sources: number; distinct_source_types: number; goal_keyword_density: number; };
  relevance: { high_count: number; moderate_count: number; low_count: number; low_pct: number; };
  prediction: { predicted_thick_yield: number; reasoning: string; };
  flags: string[];
  remediations_to_fire: Array<{ skill: string; args: any }>;
  halt_generation: boolean;
  halt_reason?: string;
}

export async function preCheckCorpus(
  goal: string,
  deliverableType: string,
  corpus: { chunks: any[]; chunkSourceMap: any; },
  relevanceScoring: { high: number; moderate: number; low: number; },
): Promise<PreCheckReport> {
  // ... full implementation per the 5 steps above
}
```

Caller flow in `geminiService.ts`:

```typescript
// 2026-05-24 — Per the standing quality-first rule, pre-check the corpus
// BEFORE generation. If thin, run remediations upstream so the breadth
// pass operates on an enriched corpus.
const preCheck = await preCheckCorpus(this.goal, 'themes', this.corpus, this.relevanceScoring);

if (preCheck.halt_generation) {
  throw new GenerationBlockedError({
    kind: 'corpus_insufficient_pre_generation',
    detail: preCheck.halt_reason,
    flags: preCheck.flags,
  });
}

for (const remediation of preCheck.remediations_to_fire) {
  // Fire each remediation upstream
  await this._invokeRemediation(remediation);
}

// Re-run pre-check to confirm remediations worked
const reCheck = await preCheckCorpus(this.goal, 'themes', this.corpus, this.relevanceScoring);
if (reCheck.prediction.predicted_thick_yield < 20) {
  // Surface as a degradation event but proceed; this is the rare case where
  // the corpus genuinely cannot support 20 thick-evidence themes
  this._emitDegradationEvent({
    kind: 'corpus_thin_after_remediation',
    stage: 'themes-pre-check',
    detail: `Predicted yield ${reCheck.prediction.predicted_thick_yield}; remediations exhausted.`,
  });
}

// NOW run the breadth pass — against an enriched corpus
const themes = await this._runMultiAngleBreadthPass(/* ... */);
```

## Hard rules

1. **Pre-check runs BEFORE generation, never after.** Post-hoc detection is too late — the cost has been spent.
2. **Halt is a real option.** CORPUS_INSUFFICIENT should genuinely block generation, not warn-and-proceed. Per the standing rule, we don't ship degraded output to make a count work.
3. **Remediations have a budget.** At most 2 retrieval-enrichment passes; if the corpus is still thin after 2, accept the degradation and surface it.
4. **Predictions are calibrated.** The empirical model above is tuned against the Northeastern 2026-05-24 baseline. As more sessions complete, the model should be refit by `cross-engagement-pattern-miner` Pattern 5.
5. **No emoji.** Repo-wide rule.

## Composition

- **Triggers** `wiki-query-expander` and `analog-finder` as remediations (these are the upstream-quality enlarger skills)
- **Triggers** halt via `validate_framework_page_exists.py` precheck logic if framework page is missing
- **Composes with** `multi-angle-theme-aggregator` and `topic-cluster-to-theme-converter` — the pre-check sets up the corpus state these skills operate on
- **Calibrated by** `cross-engagement-pattern-miner` — the predicted_thick_yield model improves as more sessions are observed
- **Eliminates need for** `theme-yield-guarantee` relaxation tiers (which stay as emergency safety nets per the standing rule)
- **Pairs with** `validate_corpus_relevance_distribution.py` Stop hook — the hook catches what the pre-check missed at the end of generation
