# Data Collection, Storage, Context & Retrieval Bulletproofing

Date: 2026-06-08
Branch: self-improvement-ia-2026-05-29
Method: verbalized sampling (VS) for candidate generation + reinforcement inference (RI) for selection under adversarial scrutiny
Scope: how fresh intelligence + AI Deep Research data is pulled, how it merges with cached and uploaded data, how duplicates are handled, how articles become chunks/manifest entries, custody/source linkage, and whether collection itself self-improves.

---

## PART 1 — HOW IT WORKS TODAY (verified, file:line)

### Collection entry points
- Source selection: `components/SourcePackSelector.tsx:34-134` (packs -> source IDs via `GET /api/source-packs`); AI Deep Research toggle (Gemini/OpenAI) on the landing page.
- Fan-out: `services/researchFabricOrchestrator.ts:968-2103` `executePlan()` runs sources via `Promise.allSettled`: deep-research (`983-1050`), data API (`1051-1061` -> proxy `/api/search/{id}`), CX mesh subreddits (`1063-1087`), Reddit-deep PRAW (`1088-1160` -> `/api/reddit-deep/fetch`).
- Deep Research: `services/deepResearchService.ts:69-205` (Gemini grounded search / `deep-research-pro-preview` interactions API).

### Article storage + dedup (proxy)
- Filename: `proxy/app.py:9472-9520` `_url_hash()` = `blake2b(normalized_url, digest_size=5)` (10 hex) -> `articles/{source-slug}/{hash}.md` (also `transcripts/`, `uploads/`).
- Write: `proxy/app.py:9562-9652` `POST /api/wiki/write-article` -> "Overwrites if the hash already exists (latest extraction wins)" (`9566`). No content-hash check; URL-hash only.
- Frontmatter custody: `_build_article_frontmatter()` `9522-9560` (url, url_hash, source, title, author, date, tier, method, extracted_at, chars, relevance, relevance_reason, engagement_goal).
- Chunk-at-ingest: `9592-9604` `chunk_for_manifest()` + `upsert_chunks_into_frontmatter()`; embed `9609-9636`; manifest upsert `9640`.
- Source resolve (custody read): `9694-9760` `_build_source_index()` walks `('social-intelligence','articles','transcripts','uploads','sources','videos')`, `idx.setdefault(fn, rel)` = first-writer-wins on basename.

### Chunk + manifest
- OLD scheme: `researchFabricOrchestrator.ts:2097-2124` `CHUNK_${i:03d}` sequential, in-memory `_chunkSourceMap`, **regenerated every run**; citations resolved from corpus TEXT by regex (`citationResolver.ts:34-56`), not the map. Generators cite these.
- NEW scheme: `proxy/wiki_chunker.py:336-409` stable pointer `"{path}#c{idx}"` persisted in page frontmatter; `.manifest.json` (`app.py:9871`) + `.manifest.journal.jsonl` (`9877`). `chunkRetrieval.ts:234-429` `pickChunksForPrompt()` reads manifest catalog, scores (keyword overlap x sentence_count), MMR-packs (lambda 0.7). Insights persist via `persistInsightAsChunk()` (`616-689`).
- Context manager: `corpusSubstrate.ts` (coverage-spanning retrieval), `engagementCommitment.ts` (provider stickiness), manifest pointers are the retrieval substrate.

### Cached + fresh + uploaded merge
- KL selection: `components/KnowledgeLibrary.tsx:33-47` `LibrarySelection` (engagementSlugs, themeClusterIds, sourceArchivePaths, socialSubreddits, articleSources) -> `App.tsx:1362` `handleLibraryApply()` -> persists to `/api/user-selection/active`.
- Instant cached display: `App.tsx:1373-1393` (dedup by theme name lowercased).
- Theme merge: `App.tsx:1507-1521` `mergeCachedThemes()` dedup by `name` (lowercased/trimmed) only.
- Corpus merge: `researchFabricOrchestrator.ts:2012-2198` `mergeResultsToCorpus()` (uploads first @relevance 100, then sources); dedup by `item.id` only, no URL-collision check.
- Reddit cache merge: `App.tsx:4743-4798` dedup by post `id` (strong, IDs stable).
- Upload dedup: `wikiService.ts:995-1027` by filename Map + `id = upload_{filename}`.

### Self-improvement
- M1 traceRecorder, M2 qualityFrontier (17 dims), M3 goldenSetRunner, M4 epochOutcomeTracker, M5 epochTrigger. ALL score deliverable OUTPUT quality. Only `retrieved_docs` touches collection (volume, not quality/source).
- Validators detect bad corpus (`validate_corpus_relevance_distribution.py`, `validate_no_silent_fallback.py`) and enforce cached coverage (`validate_cached_selection_honored.py` 100% floor) but DO NOT feed back to source selection.

---

## PART 2 — PROBLEMS SPOTTED (ranked)

| # | Severity | Problem | Evidence |
|---|----------|---------|----------|
| P1 | CRITICAL | No true mixed corpora. Any KL selection flips run to CACHED-ONLY, skipping all fresh collection. | `App.tsx:3600-3624` `_willSkipCollection` / `__hicCachedOnlyMode` |
| P2 | CRITICAL | Theme dedup is lexical (name only). Variant names ("ML Trends" vs "Machine Learning Trends") double-count; same cluster_id with different name silently passes. | `App.tsx:1512-1519` |
| P3 | HIGH | Chunk-ID dualism. Generators cite ephemeral `CHUNK_XXX` (regenerated, session-scoped); retrieval/persistence use stable manifest pointers. Two orthogonal addressing schemes. | `researchFabricOrchestrator.ts:2097-2124` vs `wiki_chunker.py:336-409` |
| P4 | HIGH | Deep Research custody loss. Synthetic URL `gemini-deep-research-<ts>`; real grounding sources only in body text, not frontmatter; new timestamp each run = accumulating near-dup syntheses (no overwrite). | `researchFabricOrchestrator.ts:1654-1686` |
| P5 | MED-HIGH | Article dedup URL-hash only; relevance frozen to first goal. Same content at different URLs = duplicate files; reused article carries stale relevance for a different objective. | `proxy/app.py:9566`, frontmatter `relevance` |
| P6 | MED | Manifest drift. `chunk_count` can diverge from page `chunks:` block (pointers beyond count -> notFound); 60s TTL catalog cache lets parallel shards select overlapping windows despite excludeIds. | `app.py:12180-12195`, `chunkRetrieval.ts:121` |
| P7 | STRUCTURAL | Self-improvement is output-only. No connector health, source-yield scoring, dedup-rate, or dead-source detection. Collection never learns. | `qualityFrontier.ts:134-139`, `proxy/app.py` SOURCES (no health fields) |
| P8 | MED | Upload dedup filename-only. Renamed same-content file double-counts. | `wikiService.ts:1001-1012` |

Note on a NON-problem: same-URL re-fetch does NOT pollute the wiki; it overwrites the same hash file (`app.py:9566`). The pollution risk is **different-URL-same-content** (P5) and **synthetic-URL deep research** (P4), not normal re-fetch.

---

## PART 3 — ENHANCEMENTS (VS candidates -> RI selection)

### ENHANCEMENT A — Make mixed corpora first-class (fixes P1)

VS candidates:
1. (p=0.20) Remove the cached-only gate; always run both. RI: REJECT — reintroduces the 50-error embedding storm the gate was added to stop (`App.tsx:3598`), and burns API on runs the user wanted cached.
2. (p=0.55) Three explicit run modes (CACHED-ONLY, FRESH-ONLY, BLENDED) chosen by an explicit UI toggle; BLENDED runs fresh collection AND resolves the KL selection, then hands both to ONE corpus-merge authority. RI: SURVIVES — explicit intent, no surprise API spend, single merge point dedups. Strongest.
3. (p=0.25) Auto-blend: infer blend when goal differs from the cached engagement goal. RI: WEAK — hidden heuristic, violates "no surprise spend"; keep as a suggestion chip, not default.

SELECT: Candidate 2. Default mode = CACHED-ONLY when a selection exists (preserve current safe behavior), but expose a "Add fresh collection to this run" toggle that sets a `blend` flag. When blended, fresh `executePlan()` output and `/api/corpus/from-selection` output both flow into Enhancement B's merge authority.

Layer trace:
- wiki (read): `/api/corpus/from-selection` unchanged; fresh path unchanged.
- manifest (persist): fresh articles ingest as today; cached articles already in manifest. Merge authority writes a per-session `corpus-merge.json` recording provenance.
- skill: `research-planner` gains a `blend_mode` input note (does not change source list).
- hook: extend `validate_cached_selection_honored.py` to also pass when blended (coverage still 100% of selection, plus fresh).
- subagent: none.
- self-improvement: emit a `blend_run` trace turn so epoch-proposer can see blend frequency.

GROUNDING FINDING (2026-06-08, from reading App.tsx 3638-3744, 4867-4875):
There are TWO parallel corpus paths today:
  (a) CACHED-ONLY (App.tsx:3638-3741): `/api/corpus/from-selection` -> articles[]
      concatenated into ONE `intelligence_sources_cached_<ts>.txt` blob pushed
      to `collectedDataFiles`, consumed by the synthesis chain (~5039).
  (b) FRESH (App.tsx:3744+ willCollectData): `executePlan()` -> `mergeResultsToCorpus(executionResult, goal, uploadsToDataSourceItems(files))` — where the Enhancement B merge authority now dedups.
The cached blob in (a) is OPAQUE to the merge authority (one giant "upload"),
so a naive blend would NOT dedup cached-vs-fresh at the article level.
THEREFORE Enhancement A must: convert the `/api/corpus/from-selection` articles
into individual `DataSourceItem[]` (id, url, content, sourceName, relevanceScore)
and pass them as a THIRD argument into `mergeResultsToCorpus` (or fold into
`uploadedItems`) so each cached article is fingerprinted and deduped against
fresh items. This is a collection-flow refactor (unify the two paths under the
merge authority) + the run-mode toggle + the validator update. It changes
runtime collection behavior, so it requires a live run to validate the blend
dedup (cannot be fully covered by unit tests alone) — schedule as its own
focused, fully-tested unit rather than rushed inline.

### ENHANCEMENT B — Single corpus-merge authority with content-addressed identity (fixes P2, P5, P8)

VS candidates:
1. (p=0.30) Add ad-hoc URL/content checks at each existing merge site (themes, articles, uploads, reddit). RI: REJECT — N scattered dedup keys is exactly today's bug surface; drifts again.
2. (p=0.60) One `corpusMergeAuthority.ts` that every path funnels through. Identity = `{ urlKey: normalizedUrl, contentHash: sha256(first 4KB normalized body), clusterId }`. Dedup precedence: clusterId > contentHash > urlKey. Themes dedup by `clusterId` then content fingerprint of summary, NOT name. Provenance preserved (`source`, `merged_from[]`, `relevance_by_goal{}`). RI: SURVIVES — single authority, deterministic, provenance kept, relevance keyed by goal kills P5 goal-drift.
3. (p=0.10) Move all dedup to the proxy. RI: PARTIAL — proxy should own article/content-hash dedup (it owns storage), but theme/cluster dedup is a frontend synthesis concern; split ownership.

SELECT: Candidate 2 (frontend authority) + adopt the article/content-hash half of Candidate 3 at the proxy write endpoint.
- Proxy: `write-article` computes `content_hash = sha256(normalized_body[:4096])`; if a DIFFERENT url_hash already has this content_hash, write a thin alias page (`alias_of: <existing>`) instead of a duplicate body, preserving both URLs in custody. (fixes P5 different-URL-same-content.)
- Frontend: `mergeResultsToCorpus`, `mergeCachedThemes`, `uploadsToDataSourceItems`, reddit merge all call `corpusMergeAuthority.merge(items)`. Themes dedup by `clusterId` first; if absent, by `sha256(normalized summary)`; name is display-only.
- relevance becomes `relevance_by_goal[goalHash]` so a reused article is re-scored for the CURRENT goal, never carrying a stale score.

Layer trace:
- wiki: alias pages added under `articles/_aliases/`.
- manifest: alias pages carry `alias_of`; `manifest_chunk_pointers` skips alias bodies (resolve to canonical).
- skill: none.
- hook: new `validate_no_corpus_duplicates.py` (Stop) — fail if two corpus items share contentHash or clusterId with different ids.
- subagent: none.
- self-improvement: merge authority logs `dedup_collapsed_count` per run -> new qualityFrontier dim `corpus_dedup_rate`.

### ENHANCEMENT C — Collapse the chunk-ID dualism (fixes P3)

VS candidates:
1. (p=0.45) Make `CHUNK_XXX` a deterministic projection of manifest pointers: build the session corpus FROM resolved manifest chunks, and map `CHUNK_001 -> {path}#c{idx}` in a persisted sidecar so citations round-trip. RI: SURVIVES, lowest blast radius — generators keep citing CHUNK_XXX, but the map is now stable + persisted, so insight chunks and exports resolve reliably.
2. (p=0.40) Retire CHUNK_XXX entirely; generators cite manifest pointers directly. RI: SURVIVES long-term but HIGH blast radius (every generator prompt + slidePostProcessor + citationResolver). Stage 2.
3. (p=0.15) Keep both, add a reconciliation pass. RI: REJECT — papers over the duality.

SELECT: Candidate 1 now (persist `CHUNK_XXX -> pointer` sidecar at `sessions/<slug>/chunk-map.json`), Candidate 2 as a tracked follow-up.

Layer trace:
- wiki/manifest: corpus assembled from `resolveChunks()` output; sidecar map persisted.
- skill: `manifest-chunk-retrieval` documents the projection contract.
- hook: extend `validate_chunk_citations.py` to verify every cited CHUNK_XXX resolves through the sidecar to a live manifest pointer.
- self-improvement: citation-resolution-failure count -> trace turn.

### ENHANCEMENT D — Deep Research custody + dedup (fixes P4)

VS candidates:
1. (p=0.65) Extract grounding sources from the Gemini/OpenAI deep-research result and write EACH as a normal article (real URL, content hash), then write the synthesis as a `kind: synthesis` page whose frontmatter `derived_from[]` lists those article hashes. Synthesis URL becomes `deepresearch://{contentHash}` (stable, dedups identical syntheses). RI: SURVIVES — restores custody, real sources become citable, identical re-runs overwrite.
2. (p=0.25) Just store grounding URLs in synthesis frontmatter without materializing articles. RI: PARTIAL — citable but those sources never enter the chunk substrate, so generation can't quote them.
3. (p=0.10) Leave as-is, label clearly. RI: REJECT — custody loss is the user's explicit concern.

SELECT: Candidate 1.

Layer trace:
- wiki: grounding sources -> `articles/{source}/{hash}.md`; synthesis -> `synthesis/deep-research/{contentHash}.md` with `derived_from[]`.
- manifest: both materialized articles and synthesis chunk normally; content-hash URL dedups re-runs.
- skill: `research-planner` notes deep-research yields materializable sources.
- hook: `validate_insight_provenance.py` extended to require `derived_from[]` on deep-research syntheses.
- self-improvement: deep-research source-yield -> connector ledger (Enhancement F).

### ENHANCEMENT E — Manifest integrity (fixes P6)

VS candidates:
1. (p=0.55) On `manifest_chunk_pointers`, clamp `chunk_count` to the page's ACTUAL `chunks:` length (read frontmatter, don't trust the journal count); add a weekly `validate_manifest_chunk_parity` audit. RI: SURVIVES — eliminates notFound pointers at the source.
2. (p=0.30) Drop the 60s catalog TTL to 0 during sharded runs. RI: PARTIAL — fixes shard overlap but costs perf on large catalogs; make it a per-run flag instead.
3. (p=0.15) Rebuild manifest from scratch each run. RI: REJECT — defeats the persistent-manifest design.

SELECT: Candidate 1 + the per-run cache-bypass flag from Candidate 2 (set when `excludeIds` is non-empty, i.e. sharded breadth is active).

Layer trace:
- manifest: parity clamp in `app.py:12180-12195`; cache-bypass param in `chunkRetrieval.ts:121`.
- hook: new weekly `validate_manifest_chunk_parity.py` (schema-drift-auditor cadence).
- self-improvement: parity-violation count surfaced in cost-telemetry.

### ENHANCEMENT F — Collection self-improvement layer (fixes P7)

VS candidates:
1. (p=0.20) Manual: log connector failures to a file, review by hand. RI: REJECT — not self-improvement.
2. (p=0.60) Connector-health ledger: proxy appends `{source_id, ts, items_returned, http_status, latency_ms, dedup_collapsed}` per `/api/search` call to `wiki/synthesis/connector-health.jsonl`. A `source-yield-scorer` skill aggregates per-source `yield_score` (relevant items / call) and `reliability` (success rate), written to `wiki/synthesis/source-scores.md`. `research-planner` reads source-scores and reorders/deprioritizes dead sources. RI: SURVIVES — closes the loop the audit found missing; research-planner already references the SOURCES registry, so it has the hook point.
3. (p=0.20) Full RL bandit over sources. RI: DEFER — premature; the ledger + greedy reorder captures 80% of value at 10% of complexity.

SELECT: Candidate 2; Candidate 3 as a later epoch.

Layer trace:
- wiki: `connector-health.jsonl`, `source-scores.md` (new synthesis pages).
- manifest: unaffected.
- skill: NEW `source-yield-scorer`; `research-planner` reads `source-scores.md`.
- hook: `validate_corpus_relevance_distribution.py` extended to append the run's per-source relevance to the ledger.
- subagent: optional `connector-health-auditor` on weekly /loop.
- self-improvement: new qualityFrontier dims `connector_reliability`, `source_yield_score`; epoch-proposer gains authority to propose source-registry deprioritization (one-edit-per-epoch compliant: editing `source-scores.md` is the edit).

---

## STATUS LOG

### Enhancement B — CORE SHIPPED + TESTED (2026-06-08)
- NEW `services/corpusMergeAuthority.ts`: content-addressed identity (clusterId > contentHash > urlKey), `mergeCorpusItems`, `mergeThemeSets`, `normalizeUrl`, `contentFingerprint`, telemetry global `__hicLastDedup`.
- NEW `services/corpusMergeAuthority.test.ts`: 17 unit tests (P2/P5/P8 regressions) — all pass.
- WIRED `researchFabricOrchestrator.mergeResultsToCorpus`: items dedup via authority before scoring; ranges rebuilt from survivors.
- WIRED `App.tsx mergeCachedThemes`: delegates to `mergeThemeSets` (clusterId+summary, not name).
- PROXY `write-article`: content-hash alias (different-URL-same-content writes a thin alias, no duplicate body, no manifest/embed) + `content_hash` frontmatter + `relevance_by_goal` merge-on-overwrite (P5).
- Verified: build exit 0; vitest 65/65; proxy syntax ok; functional alias test (A normal / B aliased / A2 overwrite / C normal; relevance_by_goal persisted; alias absent from manifest); SPA browser load 0 console errors. Test artifacts fully purged (files, content-index, manifest journal, vector rows).
- DEFERRED within B (tracked, not dropped): `validate_no_corpus_duplicates.py` Stop hook (needs dispatch-bus integration) and the `corpus_dedup_rate` qualityFrontier dim (adding an unpopulated Pareto dim risks destabilizing epoch comparison; telemetry global is already exposed for later extraction).
- LIVE-VERIFIED (2026-06-08, two cached-only runs on the Higher-Ed engagement, 572 KL items):
  - Run 1 exposed a real bug: `identityOfTheme` keyed `urlKey` on `source_synthesis_path` (the FILE, shared by all themes in it), wrongly collapsing 467 distinct themes (in 1162 -> out 109). Fixed: themes dedup by clusterId + summary fingerprint ONLY; added regression test (18 tests now pass).
  - Run 2 (post-fix): `mergeCachedThemes in 1162 -> out 576, byKey {clusterId:565, contentHash:21, urlKey:0}`. urlKey false-collapses eliminated, breadth restored, and the 21 contentHash collapses confirm the P2 fix catches reworded twins live. 0 console errors from B.
- UNRELATED pre-existing bug observed during the run (NOT B): `/api/wiki/write` 500 `[Errno 22] Invalid argument` writing `synthesis/cross-engagement-patterns.md` (Windows invalid-char write). Logged for separate triage.

### Enhancement A — SHIPPED + LIVE-VERIFIED (2026-06-08)
- NEW UI: blend toggle in `components/LandingScopeBar.tsx` ("Add fresh" / "Blend ON"); Mode pill shows cached-only | blend (cached + fresh) | fresh; sets `window.__hicBlendMode`.
- App.tsx: TWO cached-only gates made blend-aware (the master gate ~3600 AND the in-collection gate ~4274 that previously `return`ed early). When blend is on, fresh collection runs AND KL-cached articles are resolved as individual `DataSourceItem`s (`blendCachedItemsRef`, capped 200) and folded into `mergeResultsToCorpus` so the Enhancement B authority dedups cached-vs-fresh at the item level.
- The run button relabels to "Run Analysis (reusing N cached items + fresh sources)" when blend + sources are active.
- Validator: `validate_cached_selection_honored.py` intentionally unchanged - cached coverage must still hold in blend (blend only adds fresh on top).
- Verified: build exit 0; live blend run on Higher-Ed engagement (572 KL + Hacker News source): console showed `BLEND MODE`, `BLEND: resolved 200 cached articles as items`, second gate now logs `blend is ON - running fresh collection` (the old skip-log is GONE), `refineSearchQueries` fired (proof fresh collection ran), and `mergeResultsToCorpus in:371 out:371` (cached 200 + fresh 171 both through the authority). The live run ALSO caught the second-gate conflict, which was fixed and re-verified.
- UNRELATED error during run (NOT A): `/api/reddit-deep/fetch` 502 (reddit collector sidecar down/rate-limited; reddit-deep auto-fired from goal-suggested subreddits).
- NOT demonstrated: an actual cached-vs-fresh COLLAPSE (requires a fresh source that re-pulls a cached item; HN had no overlap). Collapse logic proven by the 18 unit tests + proxy same-content-diff-URL functional test.

### Enhancements E, F, D, C — SHIPPED + TESTED (2026-06-08)

**E (manifest integrity, P6):**
- `chunkRetrieval._readManifestCatalog(slug, bypassCache)`: sharded runs (excludeIds present) bypass the 60s catalog TTL so concurrent shards pick non-overlapping windows.
- NEW `.claude/hooks/scripts/validate_manifest_chunk_parity.py`: offline /loop audit; reads `.manifest.json` + journal, samples pages, reports chunk_count-vs-actual drift. Verified: 13,398 chunked records, sampled 400, 0 drift, 0 missing.

**F (collection self-improvement, P7):**
- Proxy: every `/api/search/{source_id}` call appends a row to `wiki/synthesis/connector-health.jsonl` (source_id, ts, items_returned, status, latency_ms). Endpoint refactored to a thin wrapper over `_search_source_impl` so all connector paths are captured at one point.
- NEW skill `source-yield-scorer` aggregates the ledger into `source-scores.md` (reliability + yield_score + verdict). `research-planner` step 3 now reads source-scores.md to deprioritize DEAD connectors. Closes the audit's "loop is output-only" gap.
- Verified: live `/api/search/hackernews` call wrote `{source_id:hackernews, items_returned:0, status:200, latency_ms:389}` to the ledger.

**D (deep-research custody, P4):**
- Orchestrator: synthesis item URL changed from `gemini-deep-research-<timestamp>` to `deepresearch://<contentFingerprint>` (identical re-runs dedup via the B alias instead of accumulating); `enriched:true` so it archives with its own content; grounding source URLs attached as `derivedFrom`. `writeWikiArticle` passes `kind` + `derivedFrom`.
- Proxy: `WikiArticleWriteRequest.derivedFrom` + `derived_from` frontmatter.
- Verified: write produced `articles/gemini-deep-research/cbac7cfdf8.md` with `derived_from: ["https://realsource-a.example/x","https://realsource-b.example/y","OpenAlex: Smith 2024"]`.

**C (chunk-ID projection, P3):**
- `ChunkSourceInfo.wikiPath` added; populated in `mergeResultsToCorpus`; the chunkMap is persisted via NEW proxy `POST/GET /api/session/chunk-map` (stored at `chunk-maps/<slug>.json` within WIKI_BASE) so CHUNK_XXX citations resolve to stable wiki pointers after the in-memory map is gone.
- Verified: write + read round-trip (`count 1`, `CHUNK_001.wikiPath` preserved).

**Test pass (all four):** build exit 0; vitest 66/66; py_compile OK; parity audit clean; 3 proxy functional tests pass; SPA browser load 0 console errors. A runtime NameError (F module-level constant referencing WIKI_BASE before its definition) was caught by the live proxy-start and fixed (lazy path). All test artifacts purged (deep-research probe file + vectors + content-index + manifest journal; chunk-map test file).

## PART 4 — SEQUENCING

1. Enhancement B (merge authority + content hash) — foundational; P2/P5/P8.
2. Enhancement A (blend mode) — depends on B's merge point; P1.
3. Enhancement D (deep-research custody) — depends on B's content-hash; P4.
4. Enhancement E (manifest parity) — independent; P6.
5. Enhancement C (chunk-ID projection) — independent; P3.
6. Enhancement F (collection self-improvement) — depends on B's dedup metric + D's yields; P7.

Each ships behind its own validator hook so regressions fail loudly. No relaxation of strict gates (quality-first standing rule): dedup floors and custody requirements are met by improving upstream identity, never by loosening a gate.
