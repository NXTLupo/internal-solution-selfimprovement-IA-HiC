# The HiC Pipeline — Definitive System Document (2026-06-12)

The single end-to-end reference for what each phase of Humans in Control exists
to do, how it does it today, and the laws that bind it. Companion deep-dives
with file:line mechanics live in `plans/pipeline-analysis-2026-06-12/`.
Operational onboarding: `HANDOVER_2026-06-12_NEW_DEVELOPER.md`.

## The system in one sentence

A trustworthy second brain that turns a research objective into
consulting-grade, dual-brand deliverables whose every claim traces to a real,
addressable chunk of evidence, and that gets better every time a human
corrects it.

## The six phases

```
1 COLLECT    research goal -> fresh, relevant corpus (200+ sources, packs,
             uploads, deep research, KL cache blend)
2 INDEX      corpus -> chunked wiki pages + manifest pointers (<path>#cN)
             the anti-RAG substrate
3 SYNTHESIZE corpus -> themes (breadth shards + depth enrichment), priority
             (goal-alignment 0-100) + sentiment (cluster-level), Analyst Desk
4 CONVERSE   chat grounded by manifest-chunk retrieval (3-tier catalog,
             MMR-packed ~30K tok) + theme/KG awareness; cite-by-pointer
5 DELIVER    hashtag deliverables: ONE engine, manifest-grounded, rendered
             through Figma-derived GOLD templates, Fable 5 generation
6 IMPROVE    feedback -> regeneration, learned constraints, SkillOpt training
             (gated), epochs; human approves every promotion
```

## Phase 1 — Data selection / collection

INTENT: find relevant, FRESH data (news, articles, social posts, YouTube,
academic, uploads) matched to the research objective; compound prior spend via
the Knowledge Library; merge deterministically.

MECHANICS: `researchFabricOrchestrator.ts` fans out to the proxy's 200+
SOURCES (8 connector types); source packs compose runs; `corpusMergeAuthority`
dedups (clusterId > contentHash > urlKey); BLEND mode resolves the committed
KL selection as first-class corpus items; ingest paths archive everything to
the wiki, chunked at write time.

LAWS: KL selection is a per-session act (no auto-arm on fresh load). Every
ingested item must become a chunked, engagement-tagged manifest record
(tier-1 visibility) — the known gap is paths that miss the tag.

## Phase 2 — Chunking / corpus storage / manifest indexing

INTENT: a persistent, addressable, deterministic retrieval substrate for AI
context management. Classic RAG is the documented root cause of hollow
deliverables and is banned for deliverable grounding.

MECHANICS: `proxy/wiki_chunker.py` writes `chunks:` frontmatter (500-1500
char spans, stable `<wikiPath>#c<N>` pointers, key_terms, char_span);
`wiki/.manifest.json` + journal declare what exists (chunk_count is the
retrievability gate); `chunkRetrieval.ts` ranks deterministically (key-term
pre-rank -> MMR pack, lambda 0.7, ~30K tokens) over a 3-tier catalog:
tier-1 engagement-tagged, tier-2 committed KL selection, tier-3 whole-wiki
fallback (2026-06-12; loud, never silent). `resolveChunks` dereferences exact
spans; `validate_chunk_citations.py` rejects fabricated pointers;
`citationPointerRegistry` resolves pointers to named sources at render.

LAWS: count only pointer-shaped ids inside frontmatter; parity gate weekly;
generated insights persist BACK as chunks (the corpus compounds); appends
don't re-chunk (ledgers only).

## Phase 3 — Auto-theme extraction (Analyst Desk)

INTENT: deep, relevant themes — empirical findings grounded in convergent
evidence — categorized by priority (goal-alignment 0-100, embedding-scored)
and sentiment, persisted to the wiki and the engagement.

MECHANICS: Pass 1 BREADTH (sharded relevance-ranked windows, MCR 30K
tok/shard, GPT-5.5 recovery on Gemini repetition-collapse, 28-theme floor with
broaden-on-need); meta-theme filter (no corpus-gap themes); evidence tiers
(thick = 2+ sources); Pass 2 DEPTH enrichment (subThemes, contradictions,
temporalArc) for goalAlignment >= 40. `topic_modeling.py` provides
deterministic clustering + cluster-level sentiment as grounding. Themes
stream to the desk and persist to `engagements/<slug>/themes.json` + a
chunked synthesis article.

LAWS: meet quantity floors by improving retrieval upstream, never by relaxing
the strict gate; depth-of-corpus-synthesis is the quality benchmark.

## Phase 4 — AI chat retrieval + theme awareness

INTENT: the chat knows the desk's themes AND the comprehensive corpus through
the manifest — never through bulk injection.

MECHANICS: `buildGroundingContext` composes: corpus metadata, brand + learned
constraints + Figma-live tokens (`/api/design-tokens`), knowledge-graph theme
summary, theme block, then the MANIFEST-CHUNK corpus as leading evidence
(bulk corpus demoted to tail). Tool loop (fetch_wiki_articles,
query_topic_clusters, 5-iteration cap + forced finalize). preCompact digests
old turns. Artifact turns suppress the legacy embedding pre-fetch entirely.

LAWS: deliverable turns ground via MCR only; plain chat = Gemini 3.5 Flash;
raw pointers never reach the user.

## Phase 5 — Hashtag deliverable generation

INTENT: highest consulting-grade artifacts from chat, in ONE engine:
manifest-grounded evidence, Figma-derived GOLD design systems (NXT + NU),
Claude Fable 5 generation, deterministic renderers.

MECHANICS: artifact hashtags force-route to `claude-fable-5` before grounding
(conservative 600K-char corpus budget). The SLIDE OUTPUT PROTOCOL carries 20
templates x 2 brands, slide-system variants, the density axis
(base|dense, DENSITY_SPEC ceilings, never pad / never drop evidenced items),
the DECOMPOSITION rule (overview + detail slides over cramming), and live
Figma tokens (never invented hex). Fences parse -> `slidePaginator`
decomposes -> `slidePostProcessor` sanitizes (350+ banned phrases,
meta-narration, citation resolution) -> GOLD twins render: `web.tsx`/
`goldPreviews` (960x540 preview) and `slideToStageHtml` (1920x1080 stage) ->
`/api/gold/export-pptx-multi` (Playwright MEASURE/GEO -> native editable
PPTX). Design knowledge reaches the model via Figma-live tokens + codified
template contracts + manifest-chunked design-system pages
(`brand/figma-node-map.md`, anatomy pages).

LAWS: twin-sync (preview / stage / Figma exemplar move together);
preview-clean does NOT prove export-clean — audit exported PPTX shape
geometry; stage twins bound text with server-side trunc budgets, never CSS
clamping; numbers only inside attributed quotes; action titles; em-dash ban.
Compliance state per hashtag: `plans/pipeline-analysis-2026-06-12/
phase-5-hashtag-audit.md` (not all hashtags are fully on the ONE engine yet —
the audit ranks the gaps).

## Phase 6 — Recurring, human-intervening self-improvement

INTENT: every correction becomes durable signal at three timescales:
immediate (Apply-now regeneration with cumulative de-nested feedback),
session+ (learned constraints injected into every prompt and every Claude
Code session), and cross-engagement (SkillOpt: feedback folds into skill
training sets as verbatim failure trajectories; promotion gated by
validate-candidate — never bypassed).

MECHANICS: FeedbackWidget (votes/stars/text, train_skill option),
chatFeedbackExtractor, learningEngine clustering -> 5 targets (constraints /
skill patches / framework queue / anti-patterns / exemplars),
promptImprovementEngine chat rules, traceRecorder + Pareto -> epoch proposer.

LAWS: the validation gate is sacred; constraints carry source + confidence;
renderer-class feedback (layout, type, alignment) must land in renderer
twins, not prompts; user approval gates every framework-level change.

## Cross-phase invariants (the constitution)

1. MANIFEST, NOT RAG — every deliverable grounds via chunk pointers.
2. ONE ENGINE — every artifact hashtag flows through the composer path.
3. FIGMA IS THE DESIGN SOURCE OF TRUTH — live tokens, GOLD exemplars,
   auto-layout matrices, dual-brand always.
4. DETERMINISM FOR CACHED RUNS — same corpus + goal => same identity fields.
5. EVIDENCE OR SILENCE — no fabrication, no QA annotations, numbers only in
   cited quotes, named sources always.
6. HONEST SURFACING — no silent fallbacks, routed models displayed, receipts
   over archaeology.
7. HUMAN IN CONTROL — checkpoints, gated promotions, approval before commit.
