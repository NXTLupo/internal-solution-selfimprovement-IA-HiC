# HiC Pipeline Analysis — Phases 3-4: Theme Extraction + Chat Retrieval (2026-06-12)

## PHASE 3 - AUTO-THEME EXTRACTION (Analyst Desk)

### (a) INTENT
Extract deep, relevant themes from the corpus via multi-pass consulting-grade architecture. Themes are empirical findings grounded in convergent evidence, categorized by objective relevance (0-100) and sentiment (positive/neutral/negative), then persisted to wiki and rendered in the Analyst Desk theme wall (Research Browser, all themes ranked by relevance).

### (b) CURRENT IMPLEMENTATION
Files: services/geminiService.ts (~1132-2130+), services/corpusSubstrate.ts, proxy/topic_modeling.py, services/wikiService.ts

1. Pass 1 BREADTH (2180-2381): Gemini 3.1 Pro one-shot on cached corpus or SHARDED breadth (2491-2553) running relevance-ranked corpus windows in parallel waves until yield saturates; MCR manifest chunks ~30K tokens per shard (2495); GPT-5.5 recovery on shard repetition-collapse (2448-2468). Legacy corpus sharding (2567-2630) for fresh/upload runs (80K-char windows).
2. Early under-extraction retry (1749-1778): < 5 themes re-prompts with goal-alignment relaxation.
3. Meta-theme post-filter (1794-1834): rejects themes naming corpus gaps (LACK_WORD + CORPUS_REFERENCE regex proximity within 80 chars).
4. Objective-relevance scoring (1902-1905): themes scored 0-100 vs research goal via embedding cosine (embeddingAlignmentScorer.ts).
5. Relevance-first ranking (1931-1966): sort by goalAlignment desc; distinct_source_count + evidence_tier ('thick' = 2+ sources); keep ALL (no cap for the Research Browser).
6. BREADTH FLOOR retry (1988-2028): < 28 themes post-filter re-runs with broaden=true (2014).
7. Pass 2 DEPTH enrichment (2049-2083): parallel per-theme enrichment (subThemes, dimensions, contradictions, temporalArc, implications); goalAlignment >= 40 gate (2066); 250-theme cost guard.
8. Wiki persistence (2121): _persistThemesToWiki() writes a synthesis article (chunked + embedded) + engagements/<slug>/themes.json streamed via onThemeProgress (2545).

Sentiment & clustering: proxy/topic_modeling.py (deterministic UMAP+HDBSCAN on corpus embeddings; per-cluster sentiment via Gemini 3.5 Flash, 217-261, cached by cluster signature 139). Cluster block injected as Phase-3 grounding (geminiService 1427-1456): "Your themes MUST account for this structure." Sentiment lives at CLUSTER level only.

### (c) KNOWN WEAKNESSES & GAPS
1. Gemini repetition-collapse on theme shards ("1111" x66, 2026-06-08); early abort at 3KB tail; GPT-5.5 recovery is post-hoc latency.
2. MCR engagement-scoping blind spot: fresh/upload runs have an empty engagement catalog -> legacy single-pass fallback (2240-2250) which collapses (927KB witness, 38 themes).
3. Theme->chat awareness depth: chat receives theme NAMES + descriptions only via shapeThemes() (corpusChatService 1704); sentiment / clusterGroups / contradictions / implications never reach downstream.
4. Sentiment centralized to clusters; per-theme sentiment defaults "neutral".
5. Quote extraction shallow: 1 exemplary quote per theme at breadth (schema 1600); multi-quote trails only in depth pass.
6. Dual-track relevance scoring: embedding-cosine with cold-start variance falls back to LLM self-scoring (2043).

## PHASE 4 - AI CHAT RETRIEVAL + THEME AWARENESS

### (a) INTENT
The Analyst chat knows the desk themes AND the comprehensive corpus via the manifest: manifest-chunk retrieval (MCR) leads the prompt as cite-by-pointer evidence; themes + knowledge graph give the chat awareness of what the analysis already established; the chat never bulk-RAGs.

### (b) CURRENT IMPLEMENTATION
File: services/corpusChatService.ts (buildGroundingContext 1545-1824)

1. Grounding layers in order: research context header; corpus manifest metadata (composition/source mix/recency); brand + learned constraints + Figma-live design tokens (/api/design-tokens); knowledge graph block (1625-1698; theme nodes with evidenceCount + dominantSource at 1664); shapeThemes() theme block (1704; names + descriptions ONLY); MANIFEST-CHUNK corpus (1787-1798; primary evidence, cite-by-pointer, bulk corpus demoted); raw corpus tail.
2. MCR hot path: pickChunksForPrompt (key-term pre-rank, shortlist ~960 on large catalogs) -> MMR pack (lambda 0.7, ~30K tok) -> resolveChunks (verbatim char_span slices) -> assembleChunkCorpus + chunkCitationInstructions. 3-tier catalog: engagement-tagged / committed KL selection / whole-wiki fallback (2026-06-12).
3. Render-time pointer resolution via citationPointerRegistry.ts (raw #cN never reaches the user).
4. Tool loop: fetch_wiki_articles + query_topic_clusters, max 5 iterations, then finalize (forced-finalize guard ~4276).
5. preCompact history compaction (~3100): older turns digested; theme context NOT re-injected per turn.
6. 2026-06-12: artifact hashtags force-route to claude-fable-5 BEFORE grounding (600K-char budget); embedding article pre-fetch SUPPRESSED for artifact turns.

### (c) KNOWN WEAKNESSES & GAPS
1. Theme metadata starvation: chat lacks sentiment/subThemes/dimensions/confidence/contradictions -> cannot prioritize or surface tensions.
2. Goal-alignment rank invisible to chat: shapeThemes passes an unranked list.
3. Topic clusters not wired to chat: cluster sentiment/top-terms never injected; query_topic_clusters only fires on explicit user request.
4. Citation pointer validation happens at render only; the model cannot pre-validate -> hollow-citation risk.
5. Theme-generation path retains its own legacy fallback on empty engagement catalogs (tier-3 fixed the CHAT path only).

## (d) CANDIDATE IMPROVEMENTS (effort S/M/L)
1. THEME SENTIMENT FLOW TO CHAT (M): shapeThemes() carries theme.sentiment (cluster rollup until a per-theme pass exists); KG nodes annotated; retrieval re-ranking uses sentiment for "what's working / what's at risk" questions.
2. MANIFEST-SCOPED ARTICLES FOR FRESH RUNS (S-M): temp engagement-scope + TTL tag at ingest so the breadth pass sees a non-empty catalog -> MCR sharded path instead of legacy bulk (also fixes the collapse-prone 927KB single-pass).
3. DEPTH-AWARE CHAT CONTEXT (M): conditional injection of subThemes/contradictions/confidence; prompt rule to surface contradictions; RI keyed on depth-confidence.
4. CHAT-TIME CITATION VALIDATION (S): resolve emitted pointers BEFORE finalize; RI re-ask on dead pointers; cached resolutions.
5. TOPIC-CLUSTER AWARENESS IN CHAT (M): auto-inject a TOPIC CLUSTERS section (id, top terms, sentiment, post_count) when goal-fit > 0.6; enrich the tool's return with sentiment.

Best ROI: #1 + #2 (~3 days) — unblocks risk/opportunity differentiation in chat AND the fresh-run MCR starvation that forces the banned bulk path.
