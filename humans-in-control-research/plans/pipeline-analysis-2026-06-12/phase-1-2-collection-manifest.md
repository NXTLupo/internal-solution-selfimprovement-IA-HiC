# HiC Pipeline Analysis — Phases 1-2: Collection + Chunking/Manifest (2026-06-12)

## PHASE 1 - DATA SELECTION / COLLECTION

### (a) INTENT
Find relevant, FRESH data (news, articles, social posts, YouTube videos, academic papers, client uploads) matched to the user's research objective, composed from curated source packs, and merged deterministically with cached intelligence (Knowledge Library) so prior spend compounds.

### (b) CURRENT IMPLEMENTATION
- researchFabricOrchestrator.ts (~2,100 lines) fans out to 200+ sources across 8 connector types (REST APIs, RSS, CKAN, Socrata, arXiv/OpenAlex/Crossref/Semantic Scholar, Reddit deep, YouTube transcription, web pages) via proxy /api/search/* + /api/multi-search.
- Source packs (industry + cross-cutting) compose runs in the landing UI; advanced individual sources union with packs; AI Deep Research (Gemini/OpenAI) as a first-class connector with custody (deep-research custody path in proxy).
- corpusMergeAuthority.ts: deterministic dedup/merge of fresh + cached + uploaded corpus using three precedence keys (clusterId > contentHash > urlKey).
- BLEND MODE (App.tsx ~3675): KL selection items resolve as first-class corpus items, deduped against fresh, categorized by true source type.
- 2026-06-08 enhancement: engagement-tagging at ingest (proxy wiki_write_article ~9934-9940 + wiki_check_article ~10175-10180) re-tags cached articles + new canonical pages with the session slug for tier-1 manifest visibility.
- Knowledge Library: per-session committed selection (user-selections/active.json; fresh load marks _uncommitted - the no-auto-arm rule).

### (c) KNOWN WEAKNESSES & GAPS
1. ENGAGEMENT-TAGGING GAP ON FRESH SLUGS: the 2026-06-08 tagging exists at the article-write path, but a restored/fresh session slug can still own 0 manifest records (observed live 2026-06-12: 0/10,407 for the session slug) - the trace from req.engagement -> frontmatter/manifest record is incomplete for some collection paths (uploads parsed via /api/parse-upload, deep-research custody, reddit-deep). Tier-3 whole-wiki fallback (2026-06-12) compensates at retrieval, but tier-1 precision is lost.
2. NO FRESHNESS DECAY in ranking: a 2-year-old article ranks equal to yesterday's news; "fresh data" intent is honored at COLLECTION (live fetch) but not at RETRIEVAL ranking.
3. NO PER-GOAL RELEVANCE GRADING at ingest: the same article scores identically for unrelated goals (relevance field exists in manifest records but is goal-agnostic at write time; the regrade endpoint exists but is batch/manual).
4. NO PER-CONNECTOR YIELD TELEMETRY: fetch count -> dedup -> budget-drop funnel invisible per source; source-yield-scorer skill exists but is not wired into a live dashboard.
5. KL SELECTION DORMANCY has no UI affordance hinting "you have 425 cached items one click away" beyond the scope-bar line.

### (d) CANDIDATE IMPROVEMENTS
1. I1 FRESHNESS DECAY RANKING (M): add published/ingested timestamps to manifest records; pickChunksForPrompt pre-rank applies exponential recency decay weighted by goal type (news-sensitive goals decay faster).
2. I2 PER-GOAL RELEVANCE SCORER (M): at engagement start, batch-regrade the candidate catalog against THIS goal (the existing regrade endpoint, scoped + cached) so tier-1/2 pre-rank uses goal-specific relevance.
3. I3 CONNECTOR YIELD TELEMETRY (S): per-connector funnel counters (fetched/deduped/kept/manifest-chunked) appended to the yield-ledger + surfaced in the collection UI.
4. I4 ENGAGEMENT-TAG AUTO-INJECT EVERYWHERE (S): audit every ingest path (parse-upload, deep-research custody, reddit-deep, transcripts) to guarantee req.engagement reaches the manifest record - closes the tier-1 starvation root cause.
5. I5 KL SELECTION UX HINT (M): landing-strip call-to-action when a dormant selection matches the new goal (keyword overlap), one-click re-arm.

## PHASE 2 - CHUNKING / CORPUS STORAGE / MANIFEST INDEXING

### (a) INTENT
A persistent, addressable, deterministic retrieval substrate: every wiki page carries chunk frontmatter with stable pointers (<wikiPath>#c<N>); the manifest declares what exists; retrieval is transparent CPU-only ranking over manifest metadata - auditable, deterministic, scoped. Anti-RAG by design.

### (b) CURRENT IMPLEMENTATION
- Writer: proxy/wiki_chunker.py (chunk_for_manifest + upsert_chunks_into_frontmatter; idempotent; self-healing orphan sweep after the 2026-06-11 regex-corruption purge). Chunked write paths: /api/wiki/write {chunk:true}, /api/wiki/write-article, retrofit-chunks.
- Chunk contract: 500-1500 char paragraph-bounded spans; char_span indexes the post-frontmatter body; key_terms drive pre-rank; section = nearest heading.
- Manifest: wiki/.manifest.json (~10,400 records; ~9,780 chunked) + journal replayed at read; parity gate validate_manifest_chunk_parity.py (0 mismatches baseline).
- Retrieval (services/chunkRetrieval.ts): 3-tier catalog (tier-1 engagement-tagged -> tier-2 committed KL selection union -> tier-3 whole-wiki fallback [2026-06-12]); key-term pre-rank (shortlist ~960 on large catalogs); MMR diversity pack (lambda 0.7, ~30K-token budget); sharded breadth excludeIds windows; resolveChunks dereferences exact char spans (notFound dropped, never guessed); assembleChunkCorpus + cite-by-pointer instructions; validate_chunk_citations.py Stop hook; citationPointerRegistry render-time resolution.
- Write-back: persistInsightAsChunk + engagement deliverable registry -> the corpus compounds.

### (c) KNOWN WEAKNESSES & GAPS
1. Tier-1 starvation (see Phase 1 gap #1) makes tier-3 the de-facto path for some sessions - precision cost on huge catalogs (43K pointers pre-ranked each turn).
2. Catalog read latency: whole-wiki catalog fetch + pre-rank per chat turn (~1-2s, cached 60s) - fine today, scales linearly with wiki growth.
3. Key-term pre-rank is lexical only: no embedding assist for vocabulary-mismatch goals (by design for determinism, but recall suffers on paraphrase-heavy corpora).
4. No chunk-level quality/recency metadata in pre-rank (sentence_count + relevance only).
5. Appends leave tails unindexed until the next full write/retrofit (acceptable for ledgers, a trap for evidence pages).

### (d) CANDIDATE IMPROVEMENTS
1. I6 TIER-1 GUARANTEE (S, = I4): every ingest path manifest-tags with the session slug; add a startup assert per engagement ("tier-1 catalog non-empty after collection").
2. I7 CATALOG SNAPSHOT PER ENGAGEMENT (M): persist the pre-ranked goal-scoped catalog at collection end; chat turns rank the snapshot (faster + more deterministic than re-ranking the world).
3. I8 HYBRID PRE-RANK OPT-IN (M): deterministic lexical first; embedding-assist ONLY as a tie-breaker on the shortlist tail, cached by (goal, chunkId) - preserves determinism guarantees while lifting recall.
4. I9 CHUNK RECENCY + TYPE WEIGHTS (S): pre-rank score incorporates record type (upload vs article vs synthesis) and age bucket.
5. I10 APPEND-AWARE RECHUNK QUEUE (S): /api/wiki/append marks pages dirty; a scheduled sweep rechunks dirty evidence pages.
