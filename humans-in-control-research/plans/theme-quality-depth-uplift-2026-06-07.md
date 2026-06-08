# Theme Quality + Depth Uplift Plan (2026-06-07)

Goal: maximize QUALITY, DEPTH, and BREADTH of generated themes in HiC by improving the
~60-chunk corpus SELECTION that feeds Pass-1 BREADTH, without the 9,260-chunk resolve-flood
(166x ERR_INSUFFICIENT_RESOURCES) and without relaxing the 28-theme breadth floor or grounding
floor. PLAN ONLY. No code changes here.

---

## 0. Method note (where VS and RI were applied)

- **Reinforcement Inference (RI)** is applied in Section 1. For the 158-vs-10 theme-yield gap I
  did NOT collapse to the first plausible cause. I generated four weighted candidate root causes
  from code evidence (file:line) and kept all four with honest weights, because the trigger
  signal (a 16x yield swing at a fixed budget) is exactly the "peaky-but-not-confident" condition
  RI says warrants a second, anchored pass rather than a snap diagnosis.
- **Verbalized Sampling (VS)** is applied in Section 2. I enumerated k=6 candidate plan
  approaches with calibrated probabilities (moderate-tail, most < 0.10), surfaced the modal
  option and the tail options, then committed to one with explicit reasoning per the VS
  "commit after sampling" pattern. This deliberately avoids mode-collapsing to the obvious
  "just raise the budget" answer.

---

## 1. RI-weighted root-cause analysis of the 158-vs-10 gap

Two runs, same ~60-chunk / 30K-token budget (`DEFAULT_CORPUS_TOKEN_BUDGET = 30_000`,
chunkRetrieval.ts:54; injected at geminiService.ts:2004). Run 1 resolved ALL 9,260 chunks and
scored on PER-CHUNK `key_terms` -> 59 chunks -> 158 themes. Run 2 used the cheap TITLE-token
pre-rank shortlist -> 61 chunks -> 10 themes -> tripped the floor.

The ONLY thing that changed between runs is the SELECTION path (chunkRetrieval.ts:276-294 vs the
full resolve at :299). The token budget, the Pass-1 prompt (geminiService.ts:1331+), the cluster
block (:1304), temp=0/seed=42 (:2033-2034), and the floor (:1820) were identical. So the cause is
in selection. Candidate root causes, weighted from code:

### Cause A — Title-token pre-rank picks near-duplicate, low-diversity chunks (weight 0.45) ← PRIMARY

When `catalog.length > LARGE_CATALOG (600)` and any page carries key_terms, the prelim score is
pure overlap of `promptKeywords` against `rec.sourceKeyTerms` (chunkRetrieval.ts:280-284). For
social-post/article records the manifest `key_terms` are EMPTY (proxy app.py:12163-12173 sends
them, but `_readManifestCatalog` falls back to tokenizing the page TITLE when empty,
chunkRetrieval.ts:150-153). Titles within ONE subreddit or ONE source are highly repetitive
("Northeastern co-op...", "NEU co-op..."), so the top-shortlist collapses onto a single
title-cluster. The final 61 chunks are near-duplicates of each other -> the model sees one
narrow slice of the corpus -> 10 themes is the honest ceiling of that slice. Run 1 resolved
all 9,260 and scored on diverse PER-CHUNK key_terms, so its 59 chunks spanned far more of the
corpus -> 158 themes. This is the strongest fit: it explains BOTH the low yield AND why the
expensive path yielded more (breadth came from chunk DIVERSITY, not from chunk count, since both
runs landed ~60 chunks). Diversity, not relevance, is the lever.

### Cause B — Two-stage scoring discards the precise signal at the gate (weight 0.30)

The shortlist is chosen on COARSE page-level/title tokens (chunkRetrieval.ts:287-288:
`shortlist = max(200, ceil(budget*4/1000)*4)` ~ 480), THEN re-scored on precise per-chunk
key_terms (chunkRetrieval.ts:314-318). A chunk whose per-chunk key_terms strongly match the goal
but whose PAGE TITLE does not, never enters the shortlist, so its precise score is never computed.
Run 1 skipped the coarse gate entirely (resolve-all) and scored every chunk on the precise
signal. The coarse gate is a recall filter that silently drops high-precision tail chunks -> a
thinner, less goal-spanning final set. Corroborates A: both reduce the effective corpus the model
reasons over.

### Cause C — sentence-count tie-break + zero-score drop starve the budget (weight 0.15)

Score is `overlap * max(1, sentenceCount)` (chunkRetrieval.ts:318); zero-overlap chunks are
dropped unless pinned (:320-323); ties break toward SHORTER chunks (:330-333). On the shortlist
path, if title-token overlap is sparse, many chunks score 0 and are dropped, and the survivors
are the shortest high-overlap chunks -> the 61 selected chunks are thin (low sentenceCount) ->
less evidence per chunk -> fewer extractable themes. Run 1's per-chunk scoring found overlap in
more chunks (richer key_terms), so fewer were zero-dropped. Plausible secondary contributor;
weighted below A/B because it modulates depth-per-chunk more than breadth.

### Cause D — Goal-token overlap is the wrong objective for breadth (weight 0.10)

Both runs optimize the SAME objective: maximize keyword overlap with the goal string. A
breadth pass does not want the 60 chunks MOST similar to the goal; it wants 60 chunks that
COVER the corpus's distinct sub-topics. Pure relevance ranking is anti-breadth by construction
(it concentrates on one neighborhood). Run 1 accidentally got breadth because resolve-all + diverse
per-chunk terms diluted the concentration; the shortlist path concentrated it. This is the
structural framing behind A; weighted low as a standalone cause because it is really "why A
happens," but it points directly at the fix (stratify by cluster, not by relevance).

**RI verdict (anchored second pass over the four candidates):** A is primary, B is the mechanism
that makes A worse, C explains the depth/thinness component, D names the objective error. The
committed fix must (1) restore corpus-spanning DIVERSITY to the ~60-chunk set, (2) stop discarding
the precise signal at a coarse gate, and (3) do both without resolving all 9,260. The deterministic
BERTopic clusters already loaded at geminiService.ts:1285-1311 are the ready-made diversity
backbone the selector currently ignores.

---

## 2. VS candidate plan approaches (k=6) then committed spine

Distribution-level enumeration, moderate-tail (probabilities are calibrated estimates of "this is
the approach a thoughtful reviewer would land on," not a softmax; they need not sum to 1).

| # | Approach | p | Frame |
|---|---|---|---|
| 1 | Raise the token budget 30K -> 60K/100K so more chunks fit | 0.34 | MODAL. Obvious, cheap, but does not fix diversity; 120 near-duplicate chunks still yield ~10 themes. Rejected as primary. |
| 2 | Better cheap scoring: title + page-relevance + recency blend | 0.18 | Shifted. Improves recall into the shortlist but still optimizes relevance, not coverage. Partial fix for B, ignores A/D. |
| 3 | Two-stage cheap-shortlist -> embedding/NLI re-rank to final 60 | 0.14 | Shifted. Strong precision, but an embedding re-rank STILL concentrates on the goal neighborhood unless diversity-constrained; adds a provider call + determinism risk. |
| 4 | **Cluster-stratified selection over the deterministic BERTopic clusters + MMR packing** | 0.12 | TAIL (committed). Breadth becomes STRUCTURAL: allocate the ~60-chunk budget across the existing clusters, pick the top per-chunk-scored, diversity-deduped chunks within each. Fixes A+B+C+D at the selection layer, CPU-only, deterministic, no flood. |
| 5 | Escalate every themes run to the chunk-retrieval-strategist subagent | 0.06 | TAIL. The subagent (.claude/agents/chunk-retrieval-strategist.md) already encodes diversity + per-source penalties. Right tool for HARD cases, wrong default (latency + it is a planner, not the hot path). Use as escalation, not spine. |
| 6 | Deepen Pass-2 only (more evidence per theme), leave selection alone | 0.04 | TAIL. Treats the symptom HiC does NOT have (depth) and ignores breadth. Pass-2 DEPTH already runs (geminiService.ts:1869-1889). Rejected. |

**Committed spine = #4 (cluster-stratified selection + MMR diversity packing), with #3 as an
optional within-cluster re-rank knob and #5 as the escalation path for hard corpora.**

Why #4 over the modal #1: the RI analysis shows the deficit is DIVERSITY, not chunk count. Adding
budget multiplies near-duplicates; stratifying across the BERTopic clusters guarantees the ~60
chunks span the corpus's empirical sub-topic structure. The clusters are already computed
deterministically (UMAP random_state=42 + HDBSCAN, per topic-cluster-to-theme-converter SKILL.md
v2.0) and already injected at geminiService.ts:1304, so the breadth pass is ALREADY told "account
for every cluster" while being FED a chunk set that may cover only one. #4 closes that gap: feed
the model chunks that actually span the clusters its prompt demands it cover. It is CPU-only and
deterministic, honoring the cached-run determinism standing rule.

---

## 3. The committed plan — phases, each traced through the 6 architecture layers

For every phase: wiki (read path) / manifest (persist path) / skill (model discipline) /
hook (Stop guardrail) / subagent (deep audit) / self-improvement (epoch feedback). Layers that
do not apply are marked "n/a because Y."

### Phase 1 — Cluster-stratified shortlist in `pickChunksForPrompt`

Replace the single relevance-sorted shortlist (chunkRetrieval.ts:280-294) with a cluster-aware
allocation: read the engagement's BERTopic clusters (each cluster carries `chunk_ids[]` via the
mind-map / topic pipeline), allocate the budget proportionally across clusters (floor of ~3-4
chunks/cluster so small clusters are not starved), and within each cluster keep the top per-chunk
key_terms-scored chunks. Resolve only the per-cluster shortlists (still hundreds, never 9,260).

- **wiki**: read deterministic clusters from the topic-model artifact already used at
  geminiService.ts:1287 (`this.topicClusters` / `topicClustersPromise`); cluster->chunk_ids map
  is the BERTopic output described in topic-cluster-to-theme-converter SKILL.md. Read-only.
- **manifest**: the cluster->chunk mapping must be exposed to chunkRetrieval. Either via the
  selection endpoint (proxy app.py:12121 `chunks-from-selection`, add a `cluster_id` per page/chunk)
  or a sibling endpoint that returns cluster membership for the selected chunk_ids. Persist path =
  the existing manifest journal (`_manifest_load`, app.py:12141).
- **skill**: `topic-cluster-to-theme-converter` (cluster determinism contract) +
  `manifest-chunk-retrieval` (the pointer contract `pickChunksForPrompt` must honor).
- **hook**: n/a because Phase 1 is selection logic, not an emission; no Stop event fires on chunk
  picking. (Citation enforcement is Phase 4.)
- **subagent**: `chunk-retrieval-strategist` (.claude/agents/chunk-retrieval-strategist.md) is the
  reference rubric for the stratification weights (it already specifies cross-source diversity
  bonus + same-source penalty); the inline implementation is the cheap version of its core path.
- **self-improvement**: the strategist's `selection_rationale` and the existing M1 trace
  (`recordTurn`, geminiService.ts:2061 with `note: deliverable=#themes`) let the epoch-proposer
  correlate "cluster coverage in the selected set" with downstream theme yield.

### Phase 2 — MMR diversity packing in the final budget greedy-pack

Replace the score-desc + shorter-first greedy pack (chunkRetrieval.ts:330-353) with Maximal
Marginal Relevance: when adding each next chunk, penalize it by similarity to chunks ALREADY
selected (cheap proxy = Jaccard overlap of per-chunk `key_terms`, no embeddings needed). This stops
60 near-duplicate chunks from filling the budget (RI Cause A) even within a cluster.

- **wiki**: n/a because MMR operates on already-resolved `ResolvedChunk.keyTerms`
  (wikiPointerResolver.ts:272-280) in memory; no new wiki read.
- **manifest**: n/a because no new persisted artifact; packing is ephemeral selection.
- **skill**: `manifest-chunk-retrieval` (selection still emits chunk pointers); document the MMR
  lambda as a tunable in that skill so it is discoverable.
- **hook**: n/a because still pre-emission selection.
- **subagent**: `chunk-retrieval-strategist` diversity constraint (rubric lines on
  distinct-source-count) is the spec MMR implements cheaply.
- **self-improvement**: log selected-set diversity score (1 - mean pairwise key_term Jaccard) into
  the trace note so epoch-proposer sees whether higher diversity tracks higher yield.

### Phase 3 — #cN citation-granularity enforcement (close the inconsistency)

The model currently cites page-level `sourceFile` sometimes and `#cN` other times. The corpus
block already instructs `[<wikiPath>#cN]` (chunkRetrieval.ts:421-438 `chunkCitationInstructions`),
and a preflight `validateCitations` exists (chunkRetrieval.ts:459-489) but is not the gate. Make
the Stop hook the enforcement point and run the preflight client-side before emit.

- **wiki**: read the engagement chunk-id Set (`getEngagementChunkIdSet`, chunkRetrieval.ts:646) to
  validate pointers are real, not fabricated.
- **manifest**: n/a because validation reads the existing manifest id set; nothing new persisted.
- **skill**: `manifest-chunk-retrieval` (citation-by-pointer contract).
- **hook**: `validate_chunk_citations.py` (Stop) — referenced at chunkRetrieval.ts:30 and :433.
  Tighten it to REJECT page-level `[wikiPath]` evidence citations that omit `#cN` when the chunk
  set is available, matching the `_CITATION_RE = /\[([^\]\s]+#c\d+)\]/g` shape (chunkRetrieval.ts:450).
- **subagent**: `chunk-retrieval-strategist` trigger #3 ("repeated validator rejection") — when the
  tightened hook keeps rejecting a themes run, escalate selection to the strategist.
- **self-improvement**: rejections already flow to `wiki/synthesis/hook-rejection-log.md`
  (`logSkillOptTrajectory`, chunkRetrieval.ts:683); epoch-proposer mines it for systemic citation
  drift.

### Phase 4 — RI-anchored re-ask BEFORE the breadth-floor brute-force re-prompt

Today a low yield (10 themes) trips the floor (geminiService.ts:1820-1848) which re-prompts with
"find AT LEAST N." That is an UNANCHORED "try harder" re-ask, which the RI skill states
underperforms baseline (reinforcement-inference SKILL.md:32-33). Insert an RI-Replace pass FIRST:
anchor on the prior themes verbatim + the named uncertainty signals (low count, low avg
goalAlignment 49/100, grounding 84%), and only fall to the brute re-prompt if RI does not clear
the floor. Pair with the cluster-stratified corpus from Phase 1 so the re-ask sees a BROADER set.

- **wiki**: n/a because RI re-asks on the already-loaded corpus + prior payload; no new wiki read.
- **manifest**: persist the RI ledger entry per reinforcement-inference SKILL.md:272-291.
- **skill**: `reinforcement-inference` (RI-Replace, threshold 1.2 for themes per its table) +
  `verbalized-sampling` (the Verbalized Confidence directive is ALREADY emitted at
  geminiService.ts:1324 `buildVerbalizedConfidenceDirective`, so the trigger signal exists).
- **hook**: n/a because RI is an orchestrator pass, not a Stop guardrail (RI SKILL.md:299 — RI is
  a separate layer, does not replace qa-gate).
- **subagent**: n/a because RI is inline two-pass reasoning, not a delegated audit.
- **self-improvement**: append to `wiki/synthesis/uncertainty-ledger.md`; epoch-proposer reads
  recurring "themes uncertain on breadth" patterns to tune the prompt, not the run.

### Phase 5 — Evidence-density pre-check + budget-as-safety-valve (quality-first)

Run the `evidence-density-pre-checker` skill BEFORE Pass-1 to predict supportable theme count from
the stratified set. Only if the prediction is below floor AND cluster coverage is already maxed do
we raise the token budget (the modal VS option #1) as a SAFETY VALVE, never as the default. This
honors the quality-first standing rule: hit the floor by improving upstream selection, not by
inflating context.

- **wiki**: read framework/anti-pattern pages via `loadGenerationContext` to inform the density
  prediction.
- **manifest**: n/a because the pre-check reads the selected chunk set; it persists no artifact
  (its remediation calls other skills which persist their own).
- **skill**: `evidence-density-pre-checker` + `wiki-query-expander` (its remediation arm) +
  `analog-finder` (cross-industry breadth when the corpus is genuinely thin).
- **hook**: n/a because pre-check is advisory upstream, not an emission gate.
- **subagent**: `chunk-retrieval-strategist` when the pre-check says coverage is thin and selection
  needs the deep planner.
- **self-improvement**: log predicted-vs-actual theme count to the trace so epoch-proposer
  calibrates the predictor.

---

## 4. Self-assessment

- **overallConfidence: medium-high.** The selection-is-the-lever diagnosis is strongly evidenced:
  the only delta between the two runs is the code branch at chunkRetrieval.ts:276-299, and both
  runs landed ~60 chunks, which rules out raw count and points squarely at chunk composition
  (diversity). The cluster backbone already exists and is already referenced by the prompt, so the
  fix extends a present primitive rather than inventing one.

- **leastDefensibleClaims:**
  1. That the BERTopic cluster->chunk_id mapping is readily available to `chunkRetrieval.ts` at
     selection time. I verified clusters are loaded in `generateThemes` (`this.topicClusters`,
     geminiService.ts:1287) and that the converter skill describes per-cluster example documents,
     but I did NOT verify the cluster artifact exposes a `chunk_ids[]` field in the exact pointer
     shape `pickChunksForPrompt` consumes. VERIFY before building Phase 1.
  2. The weight on Cause A (0.45) vs B (0.30). Both are selection-diversity causes; the split is a
     calibrated estimate, not a measured one. A controlled re-run (log the selected 60 chunk_ids
     and their distinct source/cluster counts for both paths) would confirm.
  3. That MMR via key_term Jaccard is a good-enough diversity proxy without embeddings. It is the
     cheap, deterministic choice; if key_terms are sparse on some chunks the proxy weakens.

- **What to verify before building:**
  1. Inspect the topic-model artifact (proxy/topic_modeling.py output + the `topicClusters` shape
     in geminiService.ts) to confirm a usable cluster->chunk_ids map; if absent, add it to the
     `chunks-from-selection` response (proxy app.py:12173) rather than a new pipeline.
  2. Instrument the existing path: log selected chunk_ids + distinct-source + distinct-cluster
     counts for one title-pre-rank run and one resolve-all run on the SAME corpus to measure the
     diversity gap directly (confirms Cause A weight).
  3. Confirm `validate_chunk_citations.py` currently treats page-level citations as acceptable
     (the source of the #cN inconsistency) before tightening it in Phase 3.
  4. Confirm the breadth-floor re-prompt (geminiService.ts:1820) is the first re-ask today, so the
     RI pass in Phase 4 inserts cleanly ahead of it.
