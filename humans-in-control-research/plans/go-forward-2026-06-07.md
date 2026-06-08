# HiC Go-Forward Plan — consolidated (2026-06-07)

status: proposed
supersedes-sequencing-of: intent-realization-plan-2026-06-07 (§3 phases), theme-quality-depth-uplift-2026-06-07 (reordered per verification below)
method: verbalized-sampling (sequence framing) + reinforcement-inference (root-cause weighting), carried from the two source plans
verification-status: integrates this session's VERIFIED-LIVE work + a fresh code verification (topic artifact `post_ids` shape). Build items below are NOT yet implemented.

This is the single authoritative go-forward sequence. It folds the theme-quality-depth audit into the master intent-realization plan and reorders it based on a verification done this session.

---

## 0. What is VERIFIED-LIVE shipped (the foundation to build on)

- **Phase 0.2** researchGoal default emptied (`App.tsx:1257`) — cold-load browser-verified.
- **Phase 1 grounding contract** — `corpusGroundingText` is now a superset of every text a generator was shown (`registerGroundingText`, geminiService.ts), incl. the MCR chunk text.
- **Phase 2 bounded generation + Phase 2.0 manifest catalog** — themes generate cached-only via the manifest-chunk-retrieval (MCR) contract:
  - proxy `POST /api/manifest/chunks-from-selection` → 9,260-pointer catalog from the KL selection (was `catalog=0`).
  - `pickChunksForPrompt` → ~30K-token chunk corpus (not 1.6MB bulk); themes Pass-1 succeeds (was empty-response failure).
  - **Fix A** (title-token pre-rank, shortlist ~480, resolve only those) → 0 console errors (was 166 ERR_INSUFFICIENT_RESOURCES).
  - **Fix B** (register MCR chunk text into grounding) → theme citation grounding **54/64 = 84%** (was 9/40 = 22%; 6/58 INCONCLUSIVE originally).
  - Run converged: Pass-1 10 → breadth-floor re-prompt → 34 → 32 enriched → persisted, page-traceable citations.

**The open quality gap (this plan's primary target):** theme BREADTH/DEPTH depends on WHICH ~60 of 9,260 chunks are selected. The cheap title pre-rank picked a narrow set (10 Pass-1 themes) vs the old resolve-all per-chunk scoring (158). Breadth comes from chunk DIVERSITY, not count.

---

## 1. RI-weighted root cause (carried + confirmed)

Why 158 vs 10 themes at the same ~60-chunk / 30K budget:
- **H-A (0.45, primary): selection collapses onto near-duplicate chunks.** Manifest `key_terms` are empty for social/article records, so the pre-rank tokenizes repetitive page TITLES (`chunkRetrieval.ts` `_readManifestCatalog` title fallback) → the shortlist clusters in one title-neighborhood. The resolve-all run scored diverse per-chunk key_terms → spanned the corpus.
- **H-B (0.30): coarse shortlist discards high-precision tail** before precise per-chunk scoring runs.
- **H-C (0.15): zero-score drop + shorter-first tie-break** starve the budget with thin chunks.
- **H-D (0.10): goal-keyword overlap is anti-breadth** — it concentrates, doesn't cover.

The fix family must increase DIVERSITY of the selected chunk set without re-introducing the resolve-flood.

---

## 2. Verification done this session (reorders the theme-depth plan)

The theme-quality-depth plan's committed Phase 1 was **cluster-stratified selection over BERTopic clusters**. Load-bearing unknown: do clusters expose chunk membership in the pointer shape `pickChunksForPrompt` consumes? **Verified in code:**
- `topic_modeling.py:1154-1162` — each topic carries `post_ids = items[i].id` (member doc ids), AND `member_indices` (`:1474`). So membership EXISTS.
- BUT `post_ids` are doc/post ids, **not** `<wikiPath>#cN` chunk pointers. Cluster-stratified selection therefore needs a `post_id → wikiPath → chunk-pointer` reconciliation step — non-trivial, and the topic artifact consumed in `generateThemes` (`:1207-1222`) currently exposes only `top_terms/summary/sentiment/post_count/name`, not `post_ids`, to the chunk selector.

**Consequence:** cluster-stratification is high-leverage but has a real prerequisite. **MMR diversity packing has NO prerequisite** (operates on resolved-chunk key-term overlap) and attacks H-A directly. So MMR leads; cluster-stratification is gated on the mapping.

---

## 3. The go-forward sequence (VS-committed)

`<vs_thinking>` k=5 sequence framings: modal "do the full theme-depth plan in order" p≈0.30 (rejected — its Phase 1 has an unverified-until-now prerequisite); "raise the token budget" p≈0.20 (rejected — treats symptom, not diversity, and inflates cost); **committed: "diversity-first, prerequisite-free wins before prerequisite-bound ones, then sweep"** p≈0.34; "sweep generators first" p≈0.10 (rejected — themes are the proven template; finish theme quality before propagating); "rebuild selection on embeddings" p≈0.06 (rejected — embeddings are NOT the manifest contract; over-build).

### PHASE A — Theme diversity (prerequisite-free, highest leverage)
- **A1. MMR diversity packing** in `pickChunksForPrompt`'s greedy budget pack: penalize each candidate by max key-term Jaccard overlap with already-selected chunks (CPU-only, no embeddings, deterministic). Directly defeats H-A near-duplicate collapse.
- **A2. Raise the resolve shortlist** (currently ~480) and widen the cheap pre-rank signal beyond title (title + manifest `relevance` + light recency), so the precise per-chunk re-rank has a broader, more diverse candidate pool (mitigates H-B).
- **A3. Verify**: re-run the cached-only theme flow; target Pass-1 theme count back near the breadth floor WITHOUT a re-prompt, grounding ≥80%, 0 resource errors, deterministic across two runs.
- 6-layer: wiki (n/a — selection logic) · manifest (consumes the chunk catalog; no schema change) · skill (`manifest-chunk-retrieval`, `chunk-retrieval-strategist` as escalation) · hook (`validate_theme_reproducibility.py` confirms determinism holds) · subagent (`themes-deliverable-auditor`) · self-improvement (theme yield → `yield-ledger.md`).

### PHASE B — Cluster-stratified selection (gated on the post_id mapping)
- **B0. Prerequisite spike**: confirm `items[i].id` (the topic `post_ids`) is reconcilable to manifest wikiPaths (read the substrate-doc assembly that feeds `bertopic`/topic-model; determine if `id` IS/contains the wikiPath). If reconcilable → B1; if not → B is deferred and Phase A + the existing breadth-floor re-prompt carry breadth.
- **B1.** Expose per-topic `post_ids` (→ chunk pointers) to `pickChunksForPrompt`; allocate the ~60-chunk budget ACROSS the deterministic clusters with a per-cluster floor, so breadth is structural, not luck. This makes the prompt's existing "account for every cluster" instruction (`geminiService.ts` clusterBlock) actually true of the corpus it's fed.
- 6-layer: wiki (n/a) · manifest (post_id↔chunk reconciliation is the new contract) · skill (`topic-cluster-to-theme-converter`, `manifest-chunk-retrieval`) · hook (reproducibility validator) · subagent (`chunk-retrieval-strategist` owns non-trivial stratified selection) · self-improvement (cluster→theme coverage → yield-ledger).

### PHASE C — Citation granularity enforcement (cross-cutting)
- **C1.** `validate_chunk_citations.py` (Stop hook) rejects page-level citations that omit `#cN` when the resolved chunk set is available — the model honored `#cN` inconsistently (21 pointers one run, 0 the next; page-traceable but not chunk-precise). This is the manifest-contract teeth.
- 6-layer: hook is the primary layer; skill (`manifest-chunk-retrieval` already specifies the contract); self-improvement (rejections → `hook-rejection-log.md` for the epoch proposer).

### PHASE D — Generator sweep (propagate the proven template)
- **D1.** Apply the verified `buildChunkCorpusBlock` helper (now with A1/A2 diversity) to personas, recommendations, journey, gap, competitive — replacing the `buildEvidenceCatalogBlock` bulk-injection sites. Themes is the proven template; each generator inherits MCR + diversity + grounding + `#cN` citation.
- Verify each surface end-to-end (build → browser → flow → output) before claiming, per the pre-claim checklist.
- 6-layer: as themes (full trace per generator).

### PHASE E — Cached-only airtightness completion (carry-over)
- **E1.** The archive-augmentation live `/api/wiki/fetch-articles` is already gated off for themes under MCR. Confirm the same for the other generators after the sweep; `validate_no_silent_fallback.py` + `quota-monitor` confirm zero external spend on a cached run.

---

## 4. Self-assessment (RI on this plan)

overallConfidence: medium-high (the foundation is verified-live; the new phases are well-scoped).

leastDefensibleClaims:
1. **A1 MMR alone restores breadth.** MMR reduces redundancy but doesn't guarantee cluster COVERAGE — if the cheap shortlist never surfaces a cluster's chunks, MMR can't recover them. That's why B (cluster-stratification) exists. Verify A in isolation (A3) before assuming it's sufficient; if breadth still trips the floor, B becomes required, not optional.
2. **B0 reconciliation is small.** I confirmed `post_ids` EXIST but not that they map cleanly to wikiPaths — the substrate-doc `id` field shape is unread. B0 is a spike precisely because this is unverified.
3. **Determinism under MMR.** Greedy MMR is deterministic given a stable candidate order + stable tie-breaks; confirm the candidate sort is fully ordered (no Map-iteration-order dependence) so two runs produce identical selections.

What to verify before building: (a) the `pickChunksForPrompt` greedy-pack insertion point for MMR + that its candidate ordering is deterministic; (b) the substrate-doc `id` → wikiPath mapping (B0); (c) that `validate_chunk_citations.py` can see the resolved chunk set at Stop time (C1).

Standing-rule check: every phase raises quality by IMPROVING UPSTREAM SELECTION (diversity, coverage, citation teeth) — none relaxes the 28-theme breadth floor or the grounding floor. Determinism preserved. Manifest-chunk contract strengthened, not bypassed.
