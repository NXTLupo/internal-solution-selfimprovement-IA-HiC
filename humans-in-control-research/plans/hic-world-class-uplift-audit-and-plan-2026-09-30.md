# HiC world-class uplift: full-workflow audit and plan (2026-09-30)

Scope: the HiC research system end to end (collection, extraction, second brain, themes, hashtag
deliverables, multi-agent architecture, self-improvement, token and cost management, slop control,
deck quality, export) with a deep cut on the `#prd` deliverable. Method: six parallel read-only
audits over code, stored AIR records, traces, the proxy SQLite cache, the manifest, and the wiki,
plus one web-research pass on 2026 PRD practice, plus the owner's own trace of the PRD path. Every
claim below carries a file:line or an artifact path. Nothing in the tree was modified by the audit.
Gates run during the audit: `npm run typecheck` clean; `npx vitest run` 116 files / 1284 tests green
(but see finding A10: the default run makes paid provider calls when the proxy is up).

Unified Vision phases are cited per finding. Doctrines applied: NO STOPGAPS; CONVERGE / DELETE /
GATE / SCHEDULE; Lego-brick Method A; quality floors met upstream, never by relaxing a gate.

---

## 0. Executive verdict

HiC has the right architecture on paper and most of the primitives in code, but the primitives are
not joined. Five structural facts decide what ships today:

1. The evidence substrate is thinner than the vision claims. The manifest is a flat 19,600-record
   index with zero chunk-level graph fields; every `related_chunks` edge is intra-document; the one
   retrieval function the vision names (`retrieveManifestEvidence`) does not exist; 4,620 URL groups
   were ingested twice under different source names so one article counts as two "convergent"
   sources; and 915 prior-run theme summaries are admitted back as citable evidence.
2. The quality gates detect but do not decide. Slop is detected and then shipped (the repair pass
   ignores it), the deck-plan gate is console-only, 77 of 93 AIR records were never chain-checked yet
   report `deterministicFailures: []`, manifest pointers render as visible text on the export surface,
   and the Journey Mapper HTML bypasses every scrub.
3. The self-improvement loop has never closed. The golden set points at 17 exemplar files that do
   not exist, no epoch has ever run, the job counter is read by nobody, the auditor agents have never
   written a verdict, the scheduler is not registered, and the wiki compiler has overwritten three
   self-improvement ledgers with unrelated prose.
4. Spend is dominated by one uncacheable call. Theme breadth shards on Opus 4.8 are 86% of traced
   spend with the 70K-character skill block placed AFTER the corpus in the user turn; Anthropic cache
   writes exceed reads so the 1h TTL currently loses money; Gemini explicit caching has never
   engaged; and no trace records token usage.
5. The PRD exists as four disjoint shapes with no shared contract, none of which is build-ready. The
   two stored `#prd` runs carry off-objective evidence (an imaging-systems paper and a marine war-risk
   article in an agriculture-insurance PRD), every objective score is zero, and the second run shipped
   three of its core feature slides through the generic fallback renderer with a developer note on
   the slide.

The plan below fixes these in dependency order: first make the run record truthful (telemetry,
golden set, ledger protection, one engagement slug), then swap the Claude research and reasoning
model to Claude Opus 5.5 through the one routing authority (owner directive; Stage 0.5), then make
retrieval honest (dedupe, provenance, no derived-as-source), then make the gates decide (repair or
withhold), then build PRD v2 on that substrate, then cut cost, then close the self-improvement loop,
then delete the duplicate paths.

---

## 1. Vision phase scorecard (current state)

| Phase | Clause | State | Load-bearing evidence |
|---|---|---|---|
| 1 Objective relevance | rank by objective, not source type | FAILING | 91/93 AIR have empty `decomposedQuestions`; per-chunk similarity discarded at the proxy boundary (`proxy/app.py:16887-16990` returns ids only), so `objectiveScore` is 0 on every ledger row (`services/evidenceLedgerService.ts:248`) |
| 2 Collect all + second brain | reuse the cached wiki | PARTIAL | `wikiCacheLoader.ts:215-274` scans 99 archive summaries under `wiki/sources/`, never the 19.6k-page wiki; 554 `uploads/` pages have no chunks and are uncitable |
| 3 Per-type provenance | `sources:` read at cite time | PARTIAL | per-chunk `sources` on 23.5% of chunks, `resolved_sources` on 4 pages; Tier-2 page-title fallback decides most citations (`citationPointerRegistry.ts:264-291`); dates are raw RSS strings, 2,758 pages undated |
| 4 Concept-graph manifest | graph feeds retrieval | FAILING | `.manifest.json` records carry no `concepts`/`related_chunks`/`sources`; 100% of frontmatter edges intra-document (`proxy/wiki_chunker.py:456-466`) |
| 5 Anti-RAG on three surfaces | one retrieval function | PARTIAL | `pickChunksForPrompt` coexists with six bulk-body paths (`corpusChatService.ts:2060-2097, 4789`; `CorpusChatPanel.tsx:6825`; `geminiService.ts:539-545, 6550-6589`; `knowledgeGapFinder.ts:214`; `notebookRetrieval.ts:109`) |
| 6 One routing authority | none omitted | PARTIAL | three authorities disagree: `aiRouter.ts:599-636` (health/quota opts never passed), `corpusChatService.ts:3563-3571` force-route, proxy `_ARTIFACT_MODEL_CHAINS` `app.py:21902-21918` putting gap/competitive/audit/prd Opus-first against aiRouter's Flash tier |
| 7 Gated self-improvement | auto-triggered, held-out gate in path | FAILING | no golden exemplars on disk; 0 epochs; `epochTrigger.getEpochStatus` has 0 callers; `applySkillPatch` writes skills with no held-out signal (`learningEngine.ts:356-412`); ledgers overwritten by compiler (`wikiCompiler.ts:155-164`) |
| 8 GOLD imagery | every slot wired or `mode:'none'` | UNMEASURED | no image carrier persisted on any cover/agenda/numbered-themes slide in shipped AIR; 17/39 raw decks below the 40% visual floor |
| 9 Native PPTX everywhere | no raster fallback | NEAR | multi-slide gate is hard (`gold_pptx_export.py:523-525`); single-slide route only warns (`:489-491`); `html_list_to_faithful_pptx` full-slide raster still live (`:547-600`, `app.py:17867`); font embed skips silently (`pptx_export.py:212,228`) |

---

## 2. Findings by area

Each finding: id, evidence (file:line or artifact), failing scenario, durable fix, phase.

### A. Hashtag deliverable pipeline

- A1. Dead dispatch block strands five directives. `components/CorpusChatPanel.tsx:6760` sets
  `DELIVERABLE_TAGS = []`, so `allDeliverable` is always false and the handlers at `:6773-7520` for
  `#mindmap`, `#brief-dialog`, `#meta-themes`, `#deep-research` (and the Journey Mapper :8080 branch
  `:7182-7215`) never run; they fall through to prose chat. `parseRefineDirective` is imported
  (`:103`) and never called while the "Artifact ready" copy advertises `#refine` (`:5990`). Fix:
  delete the block and dispatch every `ARTIFACT_CATALOG` id from one table keyed on catalog id, with a
  test asserting every registry directive reaches a handler. Phase 6.
- A2. First-regex-wins routing. `corpusChatService.ts:656` and `:4009` take the first `ARTIFACT_TPL`
  hit. `#gap #personas #slides` routes to gemini-3.5-flash for a persona deliverable the router's own
  eval registry marks failed (`aiRouter.ts:575`). `/#compet/i` (`:580`) matches "#competency". Fix:
  collect all catalog hits, route on the highest tier, anchor every regex with a word boundary.
  Phase 6.
- A3. Claim verification is reachable from one pipeline call. `CLAIM_VERIFIED_KINDS`
  (`claimSupportVerifier.ts:23-25`) is consulted only at `geminiService.ts:3802-3803` with the literal
  kind `recommendations`; no chat-path artifact (`#strategy`, `#prd`, `#case-study`) reaches it, and
  it is fail-open (`:155-180`). Fix: make the claim gate a named `artifactChain` stage after
  provenance, gated by catalog tier; the HTML `claimLedgerGate` becomes the HTML adapter of the same
  stage. Phase 5.
- A4. Deliverable blocks are flagged but never repaired. `CorpusChatPanel.tsx:4124-4152` runs
  `runDeliverableChain` with no `repairArtifact`, unlike the slide path at `:4190-4200`. Fix: one
  `runGatedArtifact()` helper used by both. Phase 5.
- A5. The 62.8K-character 18-template SLIDE OUTPUT PROTOCOL rides every call.
  `DELIVERABLE_PROTOCOL` (`corpusChatService.ts:733-1636`, 76,889 chars) is interpolated at `:3803`
  before the first cache marker, so plain chat and a single-template `#prd` carry 17 irrelevant
  specs, and DECK MODE then declares the whole catalog "SUPERSEDED" (`:4039`). Fix: per-template spec
  files injected only for the resolved template(s); shared rules stay in the stable core. Phases 5, 6.
- A6. AIR catalog resolution misses on the chat path. The chat path passes `trigger = '#gap-matrix'`
  (`corpusChatService.ts:4266`); `catalogEntryFor` compares the raw `#`-prefixed input against
  `templateId` (`artifactCatalog.ts:128`), returns null, and `buildAir` records
  `targetModes: ['analyst']`, `templateCandidates: []`. Fix: emit the catalog id as trigger and
  normalize in `catalogEntryFor`; test every template id with and without `#`. Phase 6.
- A7. Five hashtag vocabularies drift. `hashtagRegistry.ts:52-691`, `artifactCatalog.ts:69-110`,
  `corpusChatService.ts:576-600, 2272-2348`, `hashtagParser.ts:366-460`,
  `design-desk/services/hashtagParser.ts:1-145`. `#whitepaper` is parser-and-panel only (AIR warns
  every run, `emitDeliverable.ts:392-394`); `#questionnaire` has no dispatcher; `#dense`, `#count=`,
  `#img=`, `#hero=` produce "[Unknown directive]" leaders in the reply (`:4374-4392`); registry brand
  copy still says Bebas Neue / JetBrains Mono / Roboto (`hashtagRegistry.ts:587-599`). Fix: generate
  the skill map, aliases, modifiers and UI registry from `ARTIFACT_CATALOG` at module load; brand
  strings from `/api/design-tokens`; extend `artifactCatalogCoverage.test.ts` to assert all five
  agree. Phase 6.
- A8. Hardcoded models outside the authority. `#presentation` (`hashtagParser.ts:134`,
  `CorpusChatPanel.tsx:6585`, `narrativeComposer.ts:205,914,997`), `#proto`
  (`prototypeBuilder.ts:157,168`), Designer Desk (`DesignDeskChat.tsx:377,419,470`,
  `chatToSlideSpec.ts:365`, `chatToArtifact.ts:267`), and the Opus fallback inside the force-route
  (`corpusChatService.ts:3567-3571`) when the routed model is unavailable. Fix: every call site takes
  `chooseArtifactModel(catalogId)` with `alternatives` as the fallback chain; lint-ban literal model
  ids outside `aiRouter.ts` and the provider adapters. Phase 6.
- A9. Duplicate implementations. Three claim gates (`claimSupportVerifier`, `claimLedgerGate`,
  provenance in `artifactChain.ts:262-275`); four citation resolvers (`slidePostProcessor.ts:72,137`,
  `citationResolver.ts:79,146`, `citationPointerRegistry.ts:306`, `corpusChatService.ts:5781`); skill
  bodies in `.claude/skills`, `INLINE_SKILL_TEMPLATES` (`corpusChatService.ts:2543-2600`) and
  `deliverableFrameworks.ts:519`; `deck-narrative-composer` (catalog) vs `deck-composer` (injected);
  legacy `exportService.ts` still imported by `ResultsView.tsx` and `HeuristicReportView.tsx`. Fix:
  one of each; delete the rest. Meta-principle.
- A10. Test hygiene. The default `vitest run` executes `services/__e2e__/composer.e2e.test.ts`
  against the live proxy and makes paid Gemini calls. Fix: exclude `__e2e__` from the unit config.

### B. Second brain, extraction, synthesis, themes

- B1. No single retrieval authority. `retrieveManifestEvidence()` (named at
  `.claude/skills/hic-unified-vision/SKILL.md:83`) does not exist; the de facto path is
  `pickChunksForPrompt` (`chunkRetrieval.ts:553`) -> `resolveChunks` (`wikiPointerResolver.ts:524`)
  -> `assembleChunkCorpus` (`:1111`), while `buildGroundingContext` still injects fetched article
  bodies and a 40KB raw corpus tail (`corpusChatService.ts:2060-2097`) and the `search_corpus` tool
  pulls 80 article bodies (`:4789-4797`). Fix: make the three-function path the only corpus producer;
  delete `prefetchedArticlesBlock`, the `corpusText` tail, and the `rawSources` fallback. Phase 5.
- B2. The manifest is not a graph. `.manifest.json` (24.9 MB, 19,600 records, 26 flat fields each)
  carries no `concepts`, `related_chunks`, `sources`, `source_lineage`, `objective_alignment` or
  `staleness_hash`; frontmatter has concepts on 93% of chunks but every one of 25,912 `related_chunks`
  edges is intra-document (`proxy/wiki_chunker.py:456-466`); concept "walking" in
  `chunkRetrieval.ts:725-750` admits same-page neighbours only. `pages[wp].key_terms` is read from a
  field that never exists (`proxy/app.py:16762`) so pre-rank always falls back to title tokens. Fix:
  persist per-chunk concepts into manifest records, build cross-document concept edges at backfill,
  seed retrieval from concept neighbours before the embedding tier. Phase 4.
- B3. Duplicate ingests inflate convergence. 4,620 URL groups ingested more than once, all with
  different `source` strings, 4,194 with both copies chunked (e.g. `articles/agr-agfunder-news/` vs
  `articles/agr-agfundernews/`; `articles/client-uploads/<h>.md` vs `uploads/<slug>/<h>.md`).
  `distinctSourcesOf` counts source-name strings (`geminiService.ts:1957-1961`). Fix: canonicalize by
  normalized URL at `_manifest_upsert` / write-article using the existing `corpusMergeAuthority.ts`;
  count distinct origins, not names. Phases 3, 4; Independence Rule.
- B4. Provenance coverage. Per-chunk `sources` is written only when the body has an inline
  `Source:` line or `groundingSupports` (`wiki_chunker.py:380-410, 446-450, 540-579`), so Tier 1 of
  `resolveOne` rarely fires. `describeChunkProvenance` is called from one place
  (`chunkRetrieval.ts:1152`) and never reaches `formatArticlesAsCorpusBlock`, the chat tool, or the
  rawSources blocks; the theme prompt still asks for `CHUNK_001` ids and a model-typed `sourceName`
  (`geminiService.ts:1601-1612`). Fix: default every chunk's `sources` to the page's real
  `{source,url,date}` at ingest; derive theme source names deterministically from the pointer after
  generation. Phase 3.
- B5. Themes have no evidence gate. The thick-evidence floor and 4-tier relaxation were removed
  (`geminiService.ts:1898-1908, 1966-1976`); single-source themes ship tagged; the hedge check lives
  only in `claimLedgerGate.ts:353` on the report path. Fix: run the claim ledger (HEDGE_RE,
  UNVERIFIED_IDENTIFIER) over theme descriptions and require distinct origins >= 2 for `thick`.
  Phase 5.
- B6. Theme output feeds back as evidence. 915 `insight` pages written by `persistInsightAsChunk`
  (`chunkRetrieval.ts:1340-1392`) are admitted by every catalog tier (`chunkRetrieval.ts:225, 268,
  301`) and resolve to the theme title as "source"; the two stored PRD runs cite them. Fix: exclude
  `insight`/`synthesis` types from evidence admission (keep them for engagement memory) and mark them
  non-citable in `resolveOne`. Phases 2, 5.
- B7. Second-brain reuse is a summary scan. `loadCachedItemsByGoal` reads all 99 `wiki/sources/`
  bodies serially for one frontmatter field, lexically scores, truncates to 12KB. Fix: reuse by
  manifest query (`engagement_goal` + concepts over 19.6k records) returning chunk pointers, 0.45
  floor applied to objective similarity on the record. Phase 2.
- B8. Objective decomposition is recorded on 2 of 93 artifacts; coverage runs only when
  `plan.sub_questions` is populated (`App.tsx:5674-5696`); chat artifacts depend on a window global
  (`objectivePlan.ts:71-81`). Fix: sub-questions are a mandatory step of every run and every chat
  artifact, persisted in the session manifest; `auditSubQuestionCoverage` becomes a gate input.
  Phase 1.
- B9. Uploads. 554 legacy `uploads/<slug>/` pages have no chunks and twin the `client-uploads`
  copies (`wikiService.ts:1000-1022`); vision OCR caps at 16,384 output tokens; PDFs at 120K chars /
  300 pages; `chunk_for_manifest` runs inline in async handlers (`proxy/app.py:12749, 13350`). Fix:
  retire the `uploads/` namespace, page-batch vision extraction, move chunking to `asyncio.to_thread`.
  Phases 2, 3.
- B10. Whole-wiki `/api/manifest/chunks` ships 84,545 pointer strings on landing for two counts
  (`LandingScopeBar.tsx:63`) and on the KG panel (`AnalystDeskKnowledgeGraph.tsx:415`), rebuilt per
  call with no response cache (`proxy/app.py:16712-16775`); sharded themes bypass the catalog cache
  (`chunkRetrieval.ts:592`). Fix: a counts endpoint, a cached catalog, one embedding query per run.

### C. Self-improvement loop and multi-agent architecture

- C1. The golden set has no exemplars. `hic-workspace/wiki/eval/golden-set.json` lists 17
  `html_twin` paths under `hic-workspace/sample-artifacts/` which does not exist (18 of 18 path refs
  missing, including the PRD exemplar). `goldenSetRunner.runGate` (`:211`) would score zero
  exemplars. Fix: re-freeze from current GOLD twins under a tracked, compile-excluded
  `wiki/eval/golden/`, with a vitest that fails on any missing path. Phase 7.
- C2. The job counter is computed and discarded. `epochTrigger.getEpochStatus` (`:50`) and proxy
  `/api/epochs/status` (`app.py:17526`) have zero SPA callers; `due=true` since inception. Fix: read
  it at end of run in `emitDeliverable` and enqueue the proposer when due. Phase 7.
- C3. Ledgers overwritten by the compiler. `wikiCompiler.ts:155-164 COMPILE_EXCLUDE_FILES` omits
  `improvement-epochs.md`, `verification-hierarchy.md`, `loop-trace-ledger.md`; all three now hold
  synthesized "CX maturity" prose (mtime matches `compile-history/2026-09-11-60189132.md`);
  `verification-hierarchy.md` had 13 rung mentions at `7f33b9bd5` and 0 now. Fix: exclude every
  append-only ledger by list AND frontmatter flag, with a test. Phase 7.
- C4. Skill mutation without a held-out signal. `learningEngine.ts:356-412 applySkillPatch` ->
  `/api/skill/write` (`proxy/app.py:12538`) at confidence >= 0.8 after each feedback submit, gated
  by text checks only; `deck-narrative-composer/_versions/` holds 20 versions and v1.26 carried 25
  learned blocks that were hand-pruned to 1. Fix: route candidates to the proposals store and make
  `/api/skill/write` require a gate verdict token. Phase 7, rungs 1-2.
- C5. Constraint retirement is impossible. `reviewConstraintEffectiveness` reads
  `synthesis/constraint-records.json` which nothing writes; `runLearningPass` lists retirements but
  never deletes (`learningEngine.ts:713-752, 853-856`); `dismissed-constraints.md` never created;
  `improvement-lineage.md` has one record; `promptImprovementEngine.ts:311-343` injects all 48
  constraints with no cap (the Claude Code hook caps at 6KB / 12). Fix: write the record row at
  creation, increment on application, remove retired lines on cadence, cap injection. Phase 7.
- C6. Agents are prose, not path. 23 `*-deliverable-auditor.md`, `dissent-panel`,
  `export-render-verifier`, `spa-smoke-tester`, `skillopt-validation-gate`, `skillopt-applier` have
  zero runtime references; `auditor-verdicts.jsonl` was never written; promotion is `cp` in
  `scripts/skillopt-batch.sh:138`. Fix: `skillopt-batch.sh` emits proposal files and refuses `cp`
  without an APPROVE verdict file; or delete the roster the runtime cannot call. Phase 7.
- C7. Scheduler not registered; proxy auto-trigger cannot reach its script. `Get-ScheduledTask
  \NXT-Humans\` returns nothing despite `scripts/README-skillopt.md:47-54`; `proxy/app.py:21280-21290`
  probes paths that `docker-compose-all.yml:488` never mounts; the in-memory counter resets on
  restart and feeds `score: 0.5, failures: []` (`:21254-21260`). Fix: one disk-authoritative counter
  that enqueues a documented batch job with mounted scripts; delete the Task Scheduler XML. Phase 7.
- C8. Critics fail open and some run with no rubric. `criticDispatcher.ts:135,196` return
  `accept: true` on parse or dispatch error; `EXPERT_PANELS` names `evidence-quality-auditor` and
  `verbatim-quote-auditor` (no SKILL.md) and `journey-illustrator` / `org-illustrator` (nested under
  `skills/diagrams/`, 404 at the flat path); callers ship the pre-panel artifact on failure
  (`geminiService.ts:5827`, `CorpusChatPanel.tsx:7147`); `artifactExpertPanel.ts:422,474` count
  em-dashes with an ASCII-hyphen regex; `prototypeBuilder.ts:1701-1740` records a `refine` verdict and
  ships anyway. Fix: resolve critic paths through the manifest at panel build; a missing rubric fails
  the panel as a degradation event; the `auditGate.ts:9` doctrine ("the gate declares verified")
  applies to every panel. Phase 7.
- C9. Vacuous regression obligation. `regression-obligations.mjs` obligation 4 runs
  `benchmark.mjs --diff`; `wiki/eval/benchmark-baseline.json` does not exist and `benchmark.mjs:449`
  exits 0. Fix: freeze and commit the baseline; `--diff` exits non-zero without one. Phase 7.
- C10. Fourteen skills instruct the model to violate the master rule. The "Quality Discipline v2"
  block copied into 14 skills demands titles "with data", "[N]%" specificity, "% delta, $ delta"
  impact; `constraintQualityGate.ts:46-63` would reject a learned constraint saying the same.
  `prd-compiler/SKILL.md:74` says "(TBD placeholders)" while `:39,60,120,128` ban TBD. Fix: one
  `quality-discipline` reference skill reconciled with `.claude/CLAUDE.md`, included by reference;
  `check:skills` fails on the banned demands. Phase 7; CONVERGE.
- C11. Hook sprawl. `.claude/hooks/quality_gate.py` (six scopes, `checks/`) is registered in no
  settings hook; `hooks.json` is dead config; 26 of 57 hook scripts are unreferenced. Fix: register
  the unified gate, delete the dead scripts and `hooks.json`. Meta-principle.

### D. Token, cost, caching, routing

Measured from 175 trace files, 29 run receipts, and the proxy SQLite `cachetelem` table
(2026-08-07 to 2026-09-11). Tokens estimated at chars/4; prices from `services/costMeter.ts:36-52`.

| Step | Calls | Median prompt chars | Median seconds | Est. USD total |
|---|---|---|---|---|
| Theme breadth shards (Opus 4.8) | 108 | 194K to 196K | 89 to 173 | 43.8 |
| Theme floor-retry shards | 20 | 4.8K to 129K | 17 to 133 | 3.5 |
| `#report` (Opus) | 3 | 137.6K | 186 | 1.10 |
| `#explainer` / `#approaches` / `#brief` | 6 | 118K to 138K | 81 to 108 | 1.63 |
| IngestContext (Gemini Pro) | 20 | 3.9K | 90 | 0.39 |

Anthropic cache telemetry over 131 calls: cache_read 4.93M, cache_write 5.85M, fresh 19.2M tokens.

- D1. Cost telemetry does not exist as data. `traceRecorder.ts:46-65` records no usage;
  `costMeter.ts:84-118` is in-memory and reset per run; 29/29 receipts carry tokens 0 / cost null;
  11/175 trace files are truncated at `"prompt":`. Fix: persist provider `usage` (incl. cache fields)
  per call into the trace envelope and the `cachetelem` row; size-safe writer via the proxy. Phase 6.
- D2. Theme breadth is 86% of traced spend and uncacheable by construction.
  `geminiService.ts:2499-2504` places ~48K tokens in the user turn; shards share 1-2K chars of
  prefix; the 70K-char THEME ANALYST block sits after the corpus (`:2651`). Fix: objective + skill +
  schema into `system` ahead of a cache marker, only the shard window in the user turn; then bake off
  Flash and Sonnet on this schema-bound task. Phase 6.
- D3. Anthropic caching currently loses money. Writes exceed reads; read share 16.4%; 1h TTL at 2.0x
  (`app.py:10925-10935`): est $156.9 vs $149.9 uncached vs ~$135 at 5m. `costMeter.ts` bills writes at
  1.25x while the proxy buys 1h at 2.0x. Fix: default TTL 5m, promote to 1h per session only after a
  measured second read on the same prefix; align the meter. Phase 6.
- D4. Gemini explicit caching has never engaged. Key salted with `_corpus_version()`
  (`app.py:10866-10870, 10630-10640`) rotates on every manifest journal write; `gemseen` never
  exceeds 1; 3.0% reads across 1,185 calls. Fix: key on the system text alone. Phase 6.
- D5. DECK MODE appends its largest stable block after the dynamic grounding
  (`corpusChatService.ts:4023-4044`: deck-composer + infographic skill + slides manifest, ~64K chars).
  Fix: hoist into the stable core before the first `HIC_CACHE_BREAK` (`:3898`). Phase 6.
- D6. Three routing authorities (see A8 and the scorecard row for Phase 6). `chooseArtifactModel`
  takes no opts from any caller so health/quota are dead at the authority. Fix: proxy artifact engine
  and `corpusChatService` call `chooseArtifactModel` with live health from `multiModelResilience`;
  delete the two local maps. Phase 6.
- D7. Frontier model on utility work: `wikiCompiler.ts:311,405`, `researchPlanner.ts:187`,
  `journeyBriefExporter.ts:110`, `feedbackRegeneration.ts:145`, `heuristicAnalysisService.ts:9`. Fix:
  a `_utility` routing class preferring Flash/Sonnet. Phase 6.
- D8. Always-on doublers gated on counts. HTML depth-floor expand re-sends the 137K payload when
  words < 800 (`CorpusChatPanel.tsx:5914-5928`, 6 of 9 sessions); theme floor-retry re-runs the full
  sharded breadth (`geminiService.ts:2062`, 7 of 17 sessions). Fix: issue the expand/retry as a short
  delta turn against the cached prefix with the prior answer anchored (the RI contract). Phase 6.
- D9. Re-tier plan gates never ran. `plans/model-retier-frontier-2026-07-13.md:84-105` "NOT
  implemented"; `costMeter.ts:15-30` lacks fable-5 / sonnet-5 / gpt-5.6 prices. Fix: P0 registry +
  prices, then P1 bake-offs on the two biggest spenders with `scripts/benchmark.mjs`. Phase 6.
- D10. Latency traps. `chatToFreeform.ts:1045-1046` POSTs `/api/artifact/generate`,
  `/api/artifact/revise`, `/api/journey-map/generate` with plain fetch and no signal; job+poll exists
  only for topic modeling. Fix: adopt the job+poll pattern for every server fan-out endpoint.

### E. Slop output and deck quality

Live scan of 93 AIR records, 11 artifact HTML files, 57 Journey Mapper HTML files, and 8 live chat
transcripts. Scan script and hit list are in the session scratchpad (`slop_scan.py`,
`slop_hits.json`); the table below is the summary.

| Surface (files) | em-dash | banned phrase | subject-discipline | naked number (title / any) | QA chrome | raw pointer | title > 70 |
|---|---|---|---|---|---|---|---|
| AIR slides, raw model content (59) | 1 | 126 | 28 | 1 / 12 | 11 | 0 | 178 |
| AIR slides, SHIPPED post-chain (14) | 0 | 17 | 5 | 0 / 0 | 6 | 95 | 28 |
| AIR journey-map (12) | 0 | 6 | 0 | 0 / 17 | 0 | 0 | 10 |
| AIR prd-feature (2) | 0 | 5 | 0 | 1 / 2 | 0 | 0 | 7 |
| Journey Mapper HTML (57) | 2 | 89 | 3 | 4 / 24 | 2 | 1 | 119 |
| Chat slide fences (10 decks) | 0 | 40 | 5 | 0 / 3 | 4 | 0 | 66 |

- E1. Manifest pointers render on the export surface. Shipped `slides:quadrant.sourceLine` in
  `sessions/analyze-the-executive-search-industry-to-map-current-trends/artifacts/slides_1787577788440.air.json`
  reads "...[articles/exs-clockwork/5af374bb9c.md#c3]..."; rendering the shipped payload through
  `slideDataToStageHtml` shows 5 visible pointer tokens on 4 slides; pointers also sit inside quote
  fields (`slides_1787335697290`). `slideToStageHtml.ts:2470-2491` hands the payload untouched to
  `composeSlide`, which has no `.md#c` handling. Fix: one chokepoint in `slideDataToStageHtml` that
  strips citation artifacts from every prose field and renders `formatCitationLabel(pointer)` into
  the source line. Phases 3, 9.
- E2. Slop is detected but never repaired or withheld. `artifactChain.ts:231-236` records the
  refusal; `artifactRepair.ts:177-181 needsWork` and `slideInstruction` (`:64-80`) consider only
  evidence-slot violations; `CorpusChatPanel.tsx:4157-4235` sets slides before and after repair
  regardless of `result.pass`. Shipped: "utilization of internal data assets", "wider ecosystem",
  "Lead with outcomes, not AI features". Fix: hand `repairInstruction` (slop + prose) to the repair
  model and run a deterministic phrase and `[N/A]` pass before `setSlides`. Phase 5.
- E3. 77 of 93 AIR records were never chain-checked yet report `deterministicFailures: []`
  (`artifactAirService.ts:186-191`; only `airPostChain` and `htmlArtifactChain` patch it). Fix:
  default `chainRan=false` with `deterministicFailures: ['unchecked']`, and run `runArtifactChain` for
  every artifact type (journey-map, gap-matrix, prd-feature, architecture-map, competitive-matrix,
  strategy, presentation). Phase 7.
- E4. `[N/A]` chrome ships ("(Source: Executive 360 Assessment [N/A])", 6 fields); no pattern in
  `QA_ANNOTATION_PATTERNS` (`slidePostProcessor.ts:1047-1098`); `stripQAAnnotations` does not run on
  the deck path. Fix: add the pattern; run `stripQAAnnotationsDeep` in the chain lexical stage.
- E5. `scrubEnDashes` (`slidePostProcessor.ts:2285-2293`) rewrites ASCII hyphens between digits
  ("2026-27" -> "2026 to 27", ISO dates -> "2026 to 06 to 29") on every legacy slide field via
  `cleanFieldText` -> `enforceContentBudgets` -> `postProcessSlides` (`geminiService.ts:7002`),
  against the standing hyphen rule. Fix: delete it; `stripEmDashes` already handles U+2013/U+2014.
- E6. `cleanFieldText` deletes 100+ single-word banned entries with `''` ("to enhance retention" ->
  "to retention"), the exact failure `artifactChain.ts:222-230` names. Fix: split `SLOP_PHRASES` into
  delete-safe filler and detect-only words; words go to repair, never to `''`. Also `stripEmDashes`
  rule 3 manufactures comma splices (shipped thesis "Start where Proven, measurable, low-risk gains,
  the research and reporting stages, ..."); prefer a period or semicolon between independent clauses.
- E7. Journey Mapper HTML bypasses every scrub (`proxy/app.py:21013-21025` persists after a11y
  overrides only): 57 files with em-dashes, emoji nav glyphs, 89 banned phrases ("ai-enabled" x20,
  "in the corpus" x10), "As research indicates," and a literal "[CHUNK_XXX]". Fix: run
  `_scrub_diag_text` plus the process-prefix strip over text nodes before persist.
- E8. `deckPlanGate` is fail-open and console-only (`corpusChatService.ts:4149-4160`); stored chat
  decks: 5/9 below the 40% visual floor, 4 over the numbered-themes clamp, 7 overuse one archetype;
  raw AIR 17/39 below the floor; `deckPlanGate.ts:49-114` and `deckQualityGate.ts:111-140` use
  different variety rules. Fix: on failed repair, deterministically re-map the surplus
  `numbered-themes` slide to `evidence-table` / `comparison-panels` from its own fields; one variety
  rule; verdict into AIR.
- E9. Export surface has no scrub and two soft spots. `gold_pptx_export.py` has zero em-dash/emoji/
  phrase handling; `html_to_editable_pptx` (`:489-491`) only warns on picture-only output (used by
  `SlideCanvas.tsx:560-563`); `html_list_to_faithful_pptx` (`:547-600`) is a live raster path at
  `app.py:17867`; `embed_brand_fonts` skips missing fonts with a warning (`pptx_export.py:212,228`)
  despite the "never silent" contract (`gold_pptx_export.py:1016-1019`). Fix: raise in the
  single-slide route and on missing fonts; delete the faithful path; scrub the stage HTML in
  `exportGoldDeckPptx` before POST. Phase 9.
- E10. Twin parity checks the wrong twin by name only. `scripts/check-template-parity.mjs` compares
  `SlideCanvas.tsx` to legacy `pptx.ts`, never `slideToStageHtml.ts`. Real drift: prd-feature
  `evidence[]` web-only vs `storyId, successMetric, traces, featureImages` stage-only; gap-matrix
  `insight` web-only vs `impact` stage-only; persona `motivations` web-only vs `bio, goals, behaviors,
  winConditions, stakes` stage-only; recommendation `framingTag, personaContext, whyMatters,
  heroImage, impactStrip` web-only vs `impactCards` stage-only. Fix: diff per-template field-access
  sets against `types.ts` for both twins. Phase 9.
- E11. Lexicon drift: 13 CLAUDE.md phrases absent from the runtime lexicon (incl. "ecosystem" shipped
  12x, "potentially", "disruptive", "synergy"); `enforceContentBudgets` ceilings 140/280/320/800/600
  contradict CLAUDE.md 120/200/250/600/400; "Untitled Slide" fallback ignores `thesis` and `quote`
  (`CorpusChatPanel.tsx:4546-4557`); `_DIAGRAM_STYLE_VERSION` lives in `app.py:20558` and never sees
  changes to `nxt_diagram_render.py`; mindmap connectors terminate at box centres, not edges.

### F. The `#prd` deliverable (deep cut)

F1. Four PRD shapes, no shared contract.

1. Pipeline stage `generatePRD` (`geminiService.ts:4379-4520`) -> `chunkedGeneratePRD`
   (`deliverableChunkers.ts:465-612`): 16 Cagan sections in four Flash families, 30K-token evidence
   block, title hardcoded "Product Requirements Document" (`:585`), `features: []` then a Phase-2
   feature fill. The skill's Input Contract (themes, personas, recommendations, journey) is passed as
   EMPTY arrays (`geminiService.ts:4405-4407`), so this PRD never sees the approved personas it must
   trace to. Rendered by `ResultsView.tsx:1647-1725` with hardcoded hex and Bebas Neue (dropped
   2026-06-13).
2. Analyst Desk `#prd` -> `prd-feature` GOLD slides (`corpusChatService.ts:590, 1419, 1606-1618`) on
   Opus 4.8. When `#prd` is combined with deck mode (`#slides`, `#strategy`, `#presentation`), the
   DECK MODE text says "a fence without `slides:` is a HARD FAILURE" (`:4039`), so the model emits
   `slides:prd-feature`; that key is not in `ARCHETYPE_SPECS` (`slideComposer.ts:800-1510`),
   `composeSlide` returns null, and the slide falls through to `renderGeneric`
   (`slideToStageHtml.ts:2477-2490, 2604-2606`) with a developer note printed on the slide, in the
   chat preview and the PPTX alike (`SlideCanvas.tsx:403` uses the same renderer). Live evidence:
   `prd-feature_1784174306596.air.json`, three core feature slides shipped this way with no action
   title.
3. `:::deliverable:prd_feature` chat blocks (`corpusChatService.ts:860`, `DeliverableCard.tsx:21,40`):
   a third field set.
4. `#proto` `prd_candidate` (`prototypeBriefGenerator.ts:169-174`, `prototypeBuilder.ts:204-305`):
   PRD-in-brief with feature-to-screen traceability and Stage-5 acceptance coverage. This is the only
   build-oriented PRD shape in the system and it is not reachable from `#prd`.

F2. What the two stored `#prd` AIR records show.

- Evidence ledgers of 54 and 46 pointers with `objectiveScore` 0 on every row, `decomposedQuestions`
  empty, `insightHierarchy` empty, `renderPlan.templateCandidates` empty, `targetModes` analyst only,
  `costEstimateUsd` 0, `quotaState` hardcoded healthy, `routingReason` mislabeled "bake-off-validated
  schema tier" for an Opus evidence-tier artifact (`corpusChatService.ts:4326` keys the label on
  `deliverableModelOverride()` truthiness, which is non-null for every artifact).
- Off-objective evidence admitted into an agriculture-insurance PRD: a Berkeley imaging-systems
  paper, five hugging-face-blog posts, deepmind, nvidia, microsoft-research, engadget, a Hormuz
  war-risk marine article; three derived `nxt-insight` theme pages; one "quote" that is a JSON
  provenance block. Cause: `/api/manifest/chunks-by-goal` returns ids only (per-chunk similarity
  discarded), `min_relevance` defaults 0, and the SPA requests type `insight`
  (`chunkRetrieval.ts:268`).
- Quantitative Claim Rule violations in run 2: `slides:ranked-bars` values 90/100/34/66 with unit
  "%", `means-matters` figure "90%", section-divider supporting text "With 90% facing rising
  premiums"; the AIR naked-number signal counted 1 and is review-only (`artifactAirService.ts:225-268`
  scans prose, not numeric `value` fields, and never blocks).
- Run 1 cites "Google Vertex AI" and "Reddit r/stocks" as sources for farm-risk features;
  `evidenceBasis` is paraphrase rendered under the label "Evidence" (`_DLV_LABELS`), which the
  Evidence-Label Rule forbids without a verbatim quote.
- Persona traces ("THE SMALL-SCALE DECIDING GROWER") cannot be verified: the chat artifact prompt
  carries the knowledge-graph node list (`corpusChatService.ts:1875-1935`) but not the approved
  persona, theme, or journey payloads.
- Both runs predate the 2026-08-21 chain work, so a fresh live `#prd` run is validation step one.

F3. Skills and wiki pages teach the model to fabricate numbers. `prd-compiler/SKILL.md` carries the
"Quality Discipline v2" demands (C10) plus its own "Reduce prospect identification time by 40%"
example. `wiki/frameworks/prd.md` (loaded as generation context) contains "4.2-hour daily triage",
"First Contentful Paint within 1.5 seconds", "under 200ms at p95", "conversion rate by 15%", "Must
Haves 30-40% of total scope"; `wiki/anti-patterns/prd.md` contains "68% of Tier 1 support
inquiries", "1,200 agent hours/month". The rules conflate two different kinds of number: EVIDENCE
claims about the world (governed by the Quantitative Claim Rule) and REQUIREMENT TARGETS (design
decisions a PRD must state to be testable). No rule says which is which, so the model either avoids
thresholds (vacuous acceptance criteria) or asserts them (flagged).

F4. Dangling references. `prd-compiler` points at `hic-workspace/wiki/eval/exemplars/` (does not
exist) and `prd-nu.html / prd-nxt.html` in `design-system/gold/` (only case-study twins exist);
`golden-set.json` points its PRD exemplar at `sample-artifacts/2026-05-25/11-prd-NU.html` (missing).
The held-out gate cannot score a PRD at all.

F5. Engagement split is still live. `services/engagementSlug.ts` (2026-08-21) declares one 80-char
derivation matching proxy `_safe_session_slug` (`app.py:3462-3470`), but `App.tsx:2032` sets
`window.__hicCurrentEngagementSlug` with its own inline 60-char derivation, and
`buildEngagementSlug(goal, 60|50)` is still called at `App.tsx:3910, 5993, 6128`,
`CorpusChatPanel.tsx:5397, 6387`, `DesignDeskChat.tsx:339`, `evidenceCatalogBuilder.ts:184`,
`geminiService.ts:481, 5378`, `researchFabricOrchestrator.ts:1259`. On disk: 28 engagement
directories, 16 truncated at 60 chars, 7 with a longer twin, 0 directories holding both `artifacts/`
and `state.json`. The 2026-09-10 run is split the same way, so AIR, traces, SkillOpt rollouts and
session state cannot be joined.

---

## 3. The world-class PRD specification HiC should generate (v2026)

Synthesized from SVPG (Cagan 2005, 2025), Shape Up, Amazon PR/FAQ, Reforge brief-to-spec, Intercom's
one-page brief, Figma's product-review docs, Linear, Teresa Torres, Klement job stories, Cucumber
declarative Gherkin, ISO/IEC/IEEE 29148, ISO/IEC 25010:2023, WCAG 2.2, GDPR Articles 25 and 35, FDA
design-control traceability, DO-178C bidirectional tracing, and the 2025-2026 critiques of AI-written
PRDs (Gupta, Leung, Shalaby, Torres, Osmani). Full source list is appended in Section 7.

### 3.1 Shape: two tiers, twelve sections, one traceability matrix

Tier 1, the one-page brief (readable in a 15-minute silent read; titles alone pass the Partner Test):

1. Thesis: the user, the pain, the decision requested, and what the product does for that user, in two
   sentences, citing the governing theme id.
2. Problem with evidence: one specific story showing why the status quo fails (user, need, insight),
   then two or three verbatim quotes from at least two independent source types. No solution here.
3. Why now: the named market, regulatory, technology or client change that makes waiting costly.
4. Users and jobs: one or two primary personas by id with their journey stage of struggle, and job
   stories in Klement form ("When [situation], I want to [motivation], so I can [outcome]"), each
   citing the quotes it was synthesized from.
5. Goals, non-goals, appetite: goals (including immeasurable ones), non-goals each with a reason, the
   appetite as a time budget.
6. Success signals: per signal, the observable event, the instrument, baseline status, direction,
   leading or lagging, and a guardrail (rule 3.4).

Tier 2, the build spec (what engineering and design read in full):

7. Hypotheses and assumption map: riskiest assumptions in the experiment quadrant, each with its test
   and owner; assumptions already supported by corpus quotes move to plan and cite them.
8. Solution flows, states, logic: key flows per primary job story, required states per screen (empty,
   loading, partial, error, conflict, permission, degraded provider), business rules, a live link to the
   design or prototype. Behavior, never UI prescription.
9. Requirements with acceptance tests and trace ids: each requirement singular and verifiable (29148),
   its MoSCoW tier with rationale, one or more declarative Given/When/Then scenarios, and its trace chain.
10. Quality, accessibility, privacy: the applicable 25010 characteristics with a verifiable statement
    each; WCAG 2.2 AA naming the exposed criteria; GDPR Article 25 data-minimization statement and an
    Article 35 DPIA trigger check.
11. Risks, pre-mortem, alternatives considered: risk register (failure mode, likelihood, severity, early
    signal, owner, mitigation) and the alternatives rejected with trade-offs.
12. Delivery: release criteria as minimums; phased rollout with kill criteria and rollback authority;
    tracking plan (event names, properties, owner); API and data dependencies with owning teams; open
    questions with owner and due date; one Accountable approver.

The brief is a document first. The stakeholder deck (8 to 10 slides) is a projection of it, never a
second source of truth. Figma's three review gates (Problem Alignment, Solution Alignment, Launch
Readiness) are the natural checkpoints.

### 3.2 Traceability model (adapted from FDA four-layer and DO-178C bidirectionality)

Chain: Source (S) -> Quote (Q) -> Pain or opportunity (P) -> Theme (T) and Persona (PE) -> Requirement
(R) -> Acceptance test (AT) -> Signal (M). Competitive gaps (CG) are a second permitted root for R.
Integrity rules: every R has at least one P or CG, or it is cut or typed HYPOTHESIS and carried as a
NON-OBVIOUS BET; every P has at least one Q; every Q has exactly one S; every Must-have R has at least
two independent origins behind its P set; every R has at least one AT; every AT and M points back to
an R; unused S are dropped from the matrix. Rendered as a table (R, tier, P, PE, T, Q first 80 chars,
S attribution, AT, M), never as prose.

In HiC terms: S, Q, P and T already exist in the AIR Evidence Graph and theme records; PE exists in the
persona deliverable; R, AT and M are the PRD's own AIR Artifact Graph nodes. The matrix is a derived
view over AIR, not a model-authored table.

### 3.3 Evidence-defensible prioritization

Tier assignment is derived from evidence columns, not typed by the model. Must-have requires all of:
maps to the thesis; must-be or one-dimensional Kano type read from the corpus (absence cited as a
reason users abandon, or graded satisfaction in quotes); at least two independent origins; a primary
persona; and Cagan's bar (the product should not ship without it). Should-have: one origin or a
secondary persona. Could-have: single-source or inferred. Won't-have: named with its reason (appetite,
dependency, evidence gap). Within a tier, rank by persona criticality and journey-stage severity read
from evidence. RICE or WSJF only when Reach and Effort come from real data; otherwise print the
evidence columns, not a number.

### 3.4 Success signals compatible with the Quantitative Claim Rule

A metric is a named observable signal with seven fields: signal (event in tracking-plan vocabulary),
instrument, population (persona and stage), direction, baseline status ("to be measured by [owner] by
[date]", or a cited figure only inside the quote), type (leading or lagging; at least one of each),
guardrail (with rollback authority). Targets are set at a named post-baseline event, never in the
first draft.

### 3.5 The number rule the PRD needs (owner decision, see Section 6)

Two classes of number, each with a home. EVIDENCE numbers describe the world and obey the Quantitative
Claim Rule: only inside a verbatim cited quote. REQUIREMENT numbers are design decisions (a p95 latency
bound, a WCAG level, a rollout percentage, an appetite in weeks) and are legitimate in acceptance
tests, non-functional requirements and release criteria, PROVIDED the field is typed `requirement_target`,
is never phrased as a finding, and carries a rationale that cites evidence qualitatively. The post-
processor exempts typed target fields; everywhere else the existing rule holds. Without this split the
PRD cannot be both testable and honest.

### 3.6 Ten-item PRD rubric (score 1-5; a 1 on items 2, 6 or 8 fails the artifact)

1. Thesis carries a judgment and names the decision; titles alone pass the Partner Test.
2. Problem is a specific story with verbatim named-source quotes from independent origins; no solution
   in the problem.
3. Why now is stated and cited.
4. Users bounded to primary personas with job stories traced to quotes.
5. Non-goals and appetite explicit with reasons.
6. Every requirement singular, verifiable, declaratively tested, with a complete trace chain; no orphans.
7. Tiers follow the evidence rule; Must-have is rare and defended; alternatives considered present.
8. Success signals follow the seven-field rule; leading and lagging; guardrails; no invented figures.
9. Quality, accessibility (WCAG 2.2 AA), privacy (Article 25, DPIA trigger) stated as verifiable minimums.
10. Delivery is startable and stoppable: states, data touchpoints, dependencies, tracking plan,
    rollout with kill criteria, open questions with owners and dates, one Accountable approver.

Scoring: 5 means an engineer and a designer could start without a clarifying meeting and an auditor
could open every cited source; 3 means present but partially traced; 1 means absent or fabricated.

---

## 4. The uplift plan

Seven stages in dependency order. Each stage names the phases it advances, what ships, and the gate
that proves it (built after the feature, per doctrine). Nothing here is a stopgap; every item deletes
or converges a parallel path.

### Stage 0. Make the run record truthful (P0, prerequisite for everything)

Phases 1, 6, 7. Without this, no later stage can prove it improved anything.

- 0.1 One engagement slug. Replace every `buildEngagementSlug(goal, 60|50)` call and the inline
  derivation at `App.tsx:2032` with `engagementSlugFor`; delete `buildEngagementSlug`; a vitest
  asserts no second derivation exists; a one-time migration merges the 7 split directories. (F5)
- 0.2 Usage telemetry as data. Trace envelope and `cachetelem` carry provider `usage` incl. cache
  fields; receipts carry real tokens and cost; artifact traces record the system prompt hash and size;
  size-safe writer. (D1)
- 0.3 Protect the ledgers. `COMPILE_EXCLUDE_FILES` + frontmatter flag for every append-only ledger;
  restore `verification-hierarchy.md` and `improvement-epochs.md` from git (`7f33b9bd5`). (C3)
- 0.4 Re-freeze the golden set. Tracked `wiki/eval/golden/` with current GOLD twins for every
  catalog artifact including PRD; vitest fails on any missing path; commit `benchmark-baseline.json`
  and make `--diff` exit non-zero without a baseline. (C1, C9)
- 0.5 AIR honesty. `qualityReport.chainRan` defaults false with `deterministicFailures: ['unchecked']`;
  `routingReason`, `costEstimateUsd`, `quotaState` come from the router and the meter, not literals;
  `catalogEntryFor` normalizes `#` so chat-path AIR carries real `renderPlan`. (E3, A6, F2)
- 0.6 Test hygiene: `__e2e__` out of the unit config. (A10)

**Status 2026-10-01: Stage 0 SHIPPED to the working tree (uncommitted).** 0.1 one slug: `buildEngagementSlug`
now delegates to `engagementSlugFor` (80 chars, proxy parity), `App.tsx` sets the engagement global from it, the
inline fallbacks in `geminiService` and `researchFabricOrchestrator` are gone, the proxy `/api/manifest/chunks`
filter is prefix-tolerant so records tagged at 60/59/40 characters still resolve under the canonical slug
(`_engagement_matches`), and `scripts/merge-split-sessions.py --apply` merged the seven split engagements (191
files moved, 0 collisions, 8 wiki/engagements folders renamed, pointer files left behind); pinned by
`services/engagementSlugConvergence.test.ts`. 0.2 telemetry: every proxy chokepoint appends a per-call row to
`hic-workspace/sessions/<slug>/usage.jsonl` (provider, model, input/output/cache tokens, thinking tokens, cache
TTL, list-price dollars from `model_registry.PRICES`), and `TraceTurn.usage` carries provider usage when the
caller has it (theme shards do). 0.3 ledgers: eleven append-only ledgers added to `COMPILE_EXCLUDE_FILES`;
`verification-hierarchy.md` and `loop-trace-ledger.md` restored from `7f33b9bd5` with `exclude_from_compile:
true`. 0.4 golden set: v3 registers 42 exemplar twins regenerated by `scripts/eval/build-*-slides-html.py` under
`wiki/eval/exemplars/` plus the two GOLD case-study twins; eight kinds without a builder are listed as deferred;
`services/goldenSetPaths.test.ts` fails on any missing path. 0.5 AIR honesty: `qualityReport.chainRan` defaults
false with `deterministicFailures: ['unchecked']`; `airPostChain` and `htmlArtifactChain` set `chainRan: true`.
Owner decisions applied in the same pass: 3 (insights are memory: `EVIDENCE_ADMISSION_TYPES` drops `insight`,
adds `documentation`; `buildEvidenceLedger` drops derived paths), 5 (cache TTL `auto`: 5m default, promoted to
1h per session after a proven cache read; `_hic_cache_ttl` reported to the meter), 7 (merge done), 8
(`DEFAULT_MODELS.research` and `narrative_composition` are the Claude reasoning model; `routeTextAnalysis`
gained an Anthropic case). Still open in Stage 0: `_RunReceipt.totals.cost_usd` should read `usage.jsonl`
(trivial follow-up), and the per-chunk `objectiveScore` stays 0 until Stage 1.2.

Gate: `npm run test` makes zero provider calls; every new AIR has a non-empty `modelTrace` with real
cost and a catalog-resolved `renderPlan`; `git grep buildEngagementSlug` returns nothing.

### Stage 0.5. Swap the Claude research and reasoning model to Claude Opus 5.5 (P0, owner directive 2026-09-30)

Phase 6. Owner directive: the Claude model HiC uses for research and reasoning moves from
`claude-opus-4-8` to `claude-opus-5-5`. Scope as read: every call site that routes to
`claude-opus-4-8` today (the evidence-tier artifact route, the force-route default, theme breadth
shards, `#proto` planning and code, Designer Desk, research planning, critics on the opus tier, wiki
compilation, topic-model labels, the proxy premium chain). The Gemini-defaulted `research` and
`narrative_composition` categories in `aiRouter.ts` are NOT Claude today; whether they also move is
owner decision 8 below. Runs after Stage 0.2 (telemetry) so the swap is measurable, and before
Stage 1.

API contract, verified against the vendor reference (claude-api skill, model table cached
2026-09-25), not against the pasted notes. Two details in the pasted notes are wrong and must not be
coded: depth is controlled by `output_config.effort`, not by an `effort` field inside `thinking`
(a `thinking` object of type `enabled` with a budget returns 400 on this model); and the endpoint is
`https://api.anthropic.com/v1/messages`.

| Property | Claude Opus 5.5 (`claude-opus-5-5`) | HiC today on Opus 4.8 |
|---|---|---|
| Price per 1M tokens | input 4.00, output 20.00, cache read 0.20 (0.05x), cache write 1.25x at 5m or 2.0x at 1h | 5.00 / 25.00 in `costMeter.ts:42` |
| Context / max output | 1M / 128K; streaming required for large `max_tokens` | registry `maxOutput: 64_000` (`aiRouter.ts:440`); chat sends 32,000 non-streaming (`corpusChatService.ts:5010`); proxy forwards `"stream": False` (`proxy/app.py:11589, 11944, 18245`) |
| Thinking | always on; `thinking: {type: "adaptive"}` or omit; `{type: "disabled"}` and `{type: "enabled", budget_tokens: N}` both return 400 at every effort | no SPA Anthropic body sets `thinking` (so 4.8 runs without it); `researchPlanner.ts:190` sends `budget_tokens: 4000` (will 400) |
| Depth control | `output_config: {effort: low, medium, high, xhigh, max}`, default `medium` | `thinkingEffort` is computed per skill (`corpusChatService.ts:446, 725, 3932`) but never sent |
| Thinking display | `omitted` by default; `display: "summarized"` returns a readable summary | the Live Thinking feed expects visible reasoning |
| Sampling | non-default `temperature`, `top_p`, `top_k` return 400 | proxy strips `temperature` only, and only for `opus-4-[789]|fable` (`proxy/app.py:11123`, `:22186`); `researchPlanner.ts:189` and `narrativeComposer.ts:210` still send temperature |
| Tool choice | `any` and named `tool` return 400; `auto` only; use `strict: true` | SPA Anthropic loops use `auto` (`corpusChatService.ts:5113, 5270`); the forced choices in `narrativeComposer.ts:737-769` are on the OpenAI-compatible path |
| Assistant prefill | removed (400) | no live prefill site found; `aiRouter.ts:423-424` comment still says Opus supports it |
| Preserved thinking | thinking blocks bound to the model and the conversation; editing earlier turns can 400 (accounts created on or after 2026-08-31 enforced); other models drop the blocks | HiC reconstructs assistant turns from text (`corpusChatService.ts:4896`), prunes tool pairs (`contextEngineering.ts`), and summarizes (`preCompact.ts`) |
| Refusals | `stop_reason: "refusal"` with `stop_details`; server-side `fallbacks: "default"` with beta `server-side-fallback-2026-07-01` | no `stop_reason` or `refusal` handling anywhere in `proxy/app.py` |
| Tokenizer | same as Opus 4.7 and 4.8 | token counts unchanged; cache namespaces are model-scoped so every existing cached prefix is invalidated once at the swap |
| Other | mid-conversation `role: system` messages (cache-preserving operator channel); compaction beta; fast mode 8.00 / 40.00 (Claude API only); no Priority Tier | compaction is client-side (`preCompact.ts`) |

What ships:

- 0.5.1 One registry change, no new hardcodes. Add `claude-opus-5-5` to `aiRouter.ts` (`:438-441`; `maxOutput: 128_000`), `corpusChatService.ts` AVAILABLE_MODELS (`:526-533`), `costMeter.ts` ModelId and PRICING (`:15-30, 36-52`), `proxy/model_registry.py` (`:29-46`, mark `claude-opus-4-8` sunset with successor `claude-opus-5-5`). Repoint the authority: the eval table and cost tilt (`aiRouter.ts:565-582`, tilt 25 to 20), the `OPUS_CAP_ACTIVE` fallbacks (`:604, 607, 624`), the force-route (`corpusChatService.ts:715-716, 3567-3571, 4970`). Then DELETE the per-site literals instead of editing them, by routing each through `chooseArtifactModel`: `geminiService.ts:2499-2504` (theme shards), `prototypeBuilder.ts:157, 168`, `prototypeBriefGenerator.ts:42`, `DesignDeskChat.tsx:377, 419, 470`, `chatToSlideSpec.ts:69`, `chatToFreeform.ts:207`, `researchPlanner.ts:187`, `feedbackRegeneration.ts:145`, `journeyBriefExporter.ts:110`, `wikiCompiler.ts:311, 405`, `heuristicAnalysisService.ts:9`, `proxy/topic_modeling.py:716`, `proxy/app.py:21902-21918` premium and structured chains, `deliverableModelRouter.ts:105, 133`, the critic tier names `opus-4.8` in `criticDispatcher.ts:99, 161-174` and `criticReviseLoop.ts:314-315` (and the hardcoded 5 / 25 prices at `:161-162`, which read from `costMeter` instead), UI copy at `CorpusChatPanel.tsx:5640, 8684`. This is finding A8 and D6 done as part of the swap, not after it. A lint bans model-id literals outside `aiRouter.ts`, `costMeter.ts`, the provider adapters, and `model_registry.py`.
- 0.5.2 Parameter hygiene at the proxy chokepoint. Generalize the strip at `proxy/app.py:11123` and `:22186` to every Claude 4.7+ model id (`opus-4-[789]|opus-5|sonnet-5|fable`) and to `top_p`, `top_k`, and `thinking.budget_tokens`; fix the senders too (`researchPlanner.ts:189-190` drops `temperature` and replaces `budget_tokens` with `output_config.effort`; `narrativeComposer.ts:210` drops `temperature`). The strip is defense in depth; a sender that relies on it is a bug the lint catches.
- 0.5.3 Effort policy through the authority. `chooseArtifactModel` returns `effort` alongside the model and every Anthropic body sends `thinking: {type: "adaptive", display: "summarized"}` plus `output_config: {effort}`. Policy: `xhigh` for PRD, strategy, recommendations, report and `#proto` code; `high` for every other evidence-tier artifact and the critic revisor; `medium` for theme breadth shards (schema-bound extraction) and planning; `low` for the `_utility` class (wiki compilation, labels, regeneration). The existing per-skill `thinkingEffort` (`max`, `high`, `medium`) maps onto this and is finally sent. The summarized thinking text feeds the Live Thinking indicator. Every effort choice is logged in `modelTrace.routingReason`; Stage 0.2 telemetry measures cost and latency per effort so the levels can be tuned downward on evidence, never upward on vibes.
- 0.5.4 Streaming for long outputs. The proxy Anthropic path streams upstream and buffers (or relays SSE to the SPA) whenever `max_tokens` exceeds 16,000; registry `maxOutput` becomes 128,000; the theme shard and deck calls that sit at 32,000 non-streaming today move to the streaming path. This removes the 450-second silent wait (D10) rather than working around it.
- 0.5.5 Preserved-thinking compatibility. HiC's chat history becomes append-only in the sense the vendor check requires: assistant turns are stored as the returned content blocks (thinking blocks included) and echoed back unchanged within the same conversation and model; text-only reconstruction at `corpusChatService.ts:4896` is removed; the context-engineering eviction (`contextEngineering.ts`) and `preCompact.ts` run only at the turn boundary the vendor allows, with `prefix_mismatch_behavior: "drop_block"` under the thinking-binding beta as the measured safety net; a provider fallback mid-conversation (Opus 5.5 to Gemini) carries no thinking blocks by construction. A vitest replays a stored chat transcript through the three-step check.
- 0.5.6 Refusal handling. The proxy checks `stop_reason` on every Anthropic response; `refusal` becomes a `degradation_event` (fallback-event-surfacing skill) that names `stop_details.category`, never a silent empty reply; the chokepoint sends `fallbacks: "default"` with beta `server-side-fallback-2026-07-01` so a declined request is re-run server-side. The proxy fallback chains reorder to `claude-opus-5-5`, then `claude-sonnet-5-5`, then Gemini, so a fallback stays inside the same thinking-block family where possible.
- 0.5.7 Tool definitions on the Anthropic tool loop carry `strict: true` (schema has `additionalProperties: false` and `required`), since forced `tool_choice` is no longer available to guarantee JSON shape; the `aiRouter.ts:423-424` prefill comment is deleted and an "ends with a user turn" guard is added next to the "starts with a user turn" guard at `corpusChatService.ts:4997-4999`.
- 0.5.8 Caching after the swap. Same prefix rules; one-time invalidation of every cached prefix is expected and must not be read as a regression in `cachetelem`. The Stage 4 cache work (D2, D3, D5) is done against Opus 5.5, with the meter billing cache reads at 0.05x and writes at 1.25x or 2.0x per TTL.

**Status 2026-09-30 (same day): SHIPPED to the working tree, UNCOMMITTED, pending owner approval.**
What landed: `services/claudeModelPolicy.ts` (new: `CLAUDE_REASONING_MODEL`, `CLAUDE_STRUCTURED_MODEL`,
`effortForArtifact`, `applyAnthropicRequestDefaults`, response helpers); `aiRouter.ts` registry + eval table +
candidates + `RoutingDecision.effort`; `aiRetryClient.ts` applies the contract to every Anthropic body;
`costMeter.ts` prices, 0.05x cache reads, proxy-reported write factor, `listPriceFor`; `corpusChatService.ts`
force-route, picker entry, effort hint, preserved-thinking block echo, last-turn guard, refusal error, finalizer
on the structured tier; literals deleted from `geminiService` (theme shards), `prototypeBuilder` (`CODE_MODEL =
artifactModelFor('proto')`), `researchPlanner` (temperature + budget_tokens removed), `DesignDeskChat`,
`chatToSlideSpec`, `chatToFreeform`, `wikiCompiler`, `feedbackRegeneration`, `journeyBriefExporter`,
`deliverableModelRouter`, `criticDispatcher` (prices from the meter), `criticReviseLoop`, `CorpusChatPanel`;
proxy `model_registry.py` (Opus 5.5 + Sonnet 5.5 active, Opus 4.8 sunset, `normalize_claude_body`), `app.py`
chokepoint (normalizer, `fallbacks: "default"` + beta, `thinking.block_binding.prefix_mismatch_behavior:
drop_block` + beta, SSE aggregation above `ANTHROPIC_STREAM_THRESHOLD`, refusal tagging, `input_transformations`
log, `_hic_cache_write_factor`), chains reordered Opus 5.5 / Sonnet 5.5 / Gemini, artifact-engine and
topic-label calls through the normalizer, startup registry list; `topic_modeling.py`; tests
`claudeModelPolicy.test.ts` (new), `modelIdLiterals.test.ts` (new lint), `artifactModelPolicy.test.ts`,
`opusCapConvergence.test.ts`; `vitest.config.ts` excludes `__e2e__` (0.6 / A10); both CLAUDE.md files; the five
live probe scripts. NOT changed (owner decision 8): `STAGE_MODEL` for #proto planning stays Gemini 3.1 Pro; the
Sonnet 4.6 fallbacks in `narrativeComposer`, `mindMapArchitect`, `briefDialogService`, `researchPlanner:336`,
`journeyBriefExporter:140` (Stage 6 scope, non-reasoning tier).
Gate results: `npm run typecheck` clean; `npm run test` 116 files / 1294 tests green with zero provider calls;
`docker compose up -d --build research-generator research-proxy` done; proxy startup "all proxy default models
are active, no drift"; live probe through `/api/ai/anthropic`: (1) Opus 5.5 non-streaming with temperature,
top_p, top_k, `budget_tokens` and forced `tool_choice` in the body returned HTTP 200 (normalized at the
chokepoint), (2) Opus 5.5 at `max_tokens` 17000 took the streaming path and aggregated one Message with a
summarized thinking block and real usage, (3) Sonnet 5.5 returned 200; `input_transformations: []` and
`usage.iterations` on every response prove both beta headers were accepted. Still open from the gate: the
per-path live runs (`#prd`, `#slides`, `#strategy`, theme breadth, `#proto`, Designer chat) on a seeded engagement
and the `benchmark.mjs --diff` against the Stage 0.4 baseline. Update 2026-10-01: `node scripts/benchmark.mjs
--baseline` froze `hic-workspace/eval/benchmark-baseline.json` and `--diff` now runs ("no regressions"), so the
regression obligation is no longer vacuous (C9); the baseline is honest about its gap, `golden_set_exemplars_scored:
0`, until Stage 0.4 re-freezes the exemplars. A live `#prd` was issued through the rebuilt SPA on the email-design
engagement (Stage 0.5 gate run). Result: HTTP 200 from Anthropic on `claude-opus-5-5`; the AIR
(`prd-feature_1790858517350.air.json`) records `modelTrace.routingReason` "evidence tier (aiRouter.artifactModelFor),
effort=xhigh", a run chain (`postChain` present, `chainPass: false` with the evidence-slot and deck-quality findings
recorded honestly, which the pre-August records never did), six fences including two GOLD `prd-feature` slides, zero
generic-fallback slides and zero raw pointers in the payload; the deck rendered in the browser with zero console
errors (screenshot `plans/audit-2026-09-30/live-prd-opus55-2026-10-01.png`). Two defects the live run exposed and
that were fixed the same hour: (1) the browser's default 300-second request budget expired on attempt 1 while the
proxy's 600-second ceiling let the call finish, so the deck was billed twice (cache write 307,255 then cache read
307,255 on 327,267 fresh input tokens each) and retried; `callClaude` now carries a 600-second budget matching the
proxy, and the durable fix is the SSE relay (R-L2). (2) The 32K output cap truncated the deck mid-fence at xhigh
effort; artifact kinds now request 64K (the model allows 128K and the proxy streams above 16K). (3) The screenshot
showed the Analyst Desk auto-routing strip and footer still SAYING "Claude Opus 4.8" while the id had moved: fourteen
user-facing and log strings now read `CLAUDE_REASONING_LABEL`, and `modelIdLiterals.test.ts` lints prose labels as
well as ids. Still open and
confirmed live, all Stage 1 work: `decomposedQuestions` 0, `objectiveScore` 0 on all 55 ledger rows, and the chain
flags 22 unsupported P0 claims and 13 deck-quality findings yet ships (Stage 2.1).

Gate: a live run of each touched path (`#prd`, `#slides`, `#strategy`, theme breadth, `#proto` build, Designer chat, research plan) completes with zero 400 responses from Anthropic; `modelTrace` on every AIR shows `claude-opus-5-5` with a logged effort; `git grep claude-opus-4-8` returns only `costMeter.ts`, `model_registry.py` and plan files; `scripts/benchmark.mjs --diff` against the Stage 0.4 baseline shows golden-set discrimination unchanged or better; the measured cost per theme run falls by at least the list-price difference before any Stage 4 cache work.

### Stage 1. Make retrieval honest (P0)

Phases 1 to 5.

- 1.1 One retrieval function. Create `retrieveManifestEvidence()` as the named wrapper over
  `pickChunksForPrompt -> resolveChunks -> assembleChunkCorpus`, returning scored pointers; themes,
  Analyst Desk, Designer Desk, artifacts and the eval evaluator call it; delete the six bulk-body
  paths. (B1)
- 1.2 Scores survive the boundary. `/api/manifest/chunks-by-goal` returns per-chunk similarity;
  `resolvedChunkToEvidence` records it; `min_relevance` becomes a real floor; `objectiveScore` is
  never 0 by default. (F2, phase 1) **Status 2026-10-01: SHIPPED (uncommitted).** The endpoint now returns
  a `scores` map; `chunkRetrieval` stores it as `objectiveSimilarity` on each record, admits zero-keyword
  chunks in the top decile of similarity at a low positive score (a relevance signal, never a breadth
  instrument), and the chat artifact path carries the pre-rank's normalized score onto every grounding
  chunk so the AIR ledger records a real `objectiveScore`. Still open: `min_relevance` as a hard floor
  (needs the Stage 1.6 coverage gate to decide the floor per sub-question).
- 1.3 Derived is not evidence. `insight` and `synthesis` types excluded from evidence admission and
  marked non-citable in `resolveOne`; kept for engagement memory. (B6)
- 1.4 One origin, one source. URL canonicalization at ingest via `corpusMergeAuthority`; distinct
  origins (not names) feed `thick`, convergence and the Independence Rule; merge the 4,620 dup groups;
  retire the `uploads/` namespace. (B3, B9)
- 1.5 Provenance everywhere. Default per-chunk `sources` from page `{source,url,date}` at ingest;
  ISO dates; `describeChunkProvenance` reaches every corpus block; theme source names derived from the
  pointer after generation. (B4)
- 1.6 Objective decomposition is mandatory. Sub-questions generated and persisted for every run and
  every chat artifact; `auditSubQuestionCoverage` output feeds the evidence-slot gate. (B8)
- 1.7 Concept graph in the manifest. Per-chunk concepts persisted to records; cross-document concept
  edges built at backfill; retrieval seeds from concept neighbours before the embedding tier; fix the
  dead `key_terms` read. (B2)
- 1.8 Theme evidence gate. Claim ledger (hedge, unverified identifier) on theme descriptions; distinct
  origins >= 2 for `thick`; second-brain reuse by manifest query over 19.6k records. (B5, B7)

**Status 2026-10-01 (tranche B): 1.8 SHIPPED (uncommitted).** `services/themeEvidenceGate.ts` types every theme's
evidence (distinct origins by canonical URL; `hedged` when the theme voice carries a hedge or states as fact what
its quoted evidence only hedges; `unverified_identifier` when two or more proper nouns appear in no quoted span)
and clears `withinDeliverableCap` on blocked themes without removing any theme from the Research Browser;
second-brain reuse (`loadCachedItemsByGoal`) is a manifest query over `/api/manifest/chunks-by-goal` with the 0.45
floor on the record's objective similarity, folding chunk-backed pages with pointer provenance instead of
scanning archive summaries.

**Status 2026-10-01 (tranche A, "implement the rest"): 1.1, 1.3, 1.4, 1.5, 1.6, 1.7 SHIPPED to the working
tree (uncommitted); 1.8 open.** 1.1: `buildGroundingContext` injects article bodies and the raw corpus only when the
manifest produced nothing (labelled empty-manifest fallback); `fetch_wiki_articles` is manifest-first;
`corpusChatService.grounding.test.ts` pins the contract. 1.3: `EVIDENCE_ADMISSION_TYPES` drops `insight`;
`isDerivedEvidencePath` keeps derived pages out of the evidence ledger. 1.4: `_url_canon` + `.url-index.json`
alias origins at write-article; theme `distinctSourcesOf` counts canonical origins (host + path), not names.
1.5: `chunk_for_manifest` defaults every chunk's `sources` to the page `{n, u, kind, date|date_raw, author,
subreddit}` (ISO dates; 35 proxy tests); the resolver carries the fields and `describeChunkProvenance` prints
kind, subreddit, author and date. 1.6: `ensureObjectiveDecomposition` (one anchored re-ask) runs on the App run
path and the chat `#research-plan` path; `coverage_status` is written per sub-question; the decomposition and
its status persist in the session (`research_plan_sub_questions.json`, `decomposition_status.json`) and
rehydrate on restore; `readObjectivePlan` reports `decomposition: unavailable` with the reason instead of a
silent empty plan. 1.7: `build_cross_document_edges` (concept Jaccard + shared entities, inverted index) runs at
manifest backfill and on `POST /api/manifest/cross-doc-edges/rebuild`, persisted to `wiki/.cross-doc-edges.json`
and served per engagement; `pickChunksForPrompt` adds a matched chunk's cross-document neighbours to the
concept-neighbour tier and resolves the off-shortlist ones (cap 40). R-D2: `executePlan` budgets deep-research
sources by `collectionBudgetFor` (focus-anchored to the next uncovered sub-question; skipped when every
sub-question is covered) and records `collectionBudget` on the result. Live verification of 1.6/1.7 on a fresh
run is the next step (the edge index is empty until a backfill or rebuild runs).

Gate: `corpus_reuse_provenance` and `citation_resolution` checks from `quality_gate.py` registered and
green on a live run; a replay of the two stored PRD runs through the new retrieval admits zero
`insight` pointers and zero pointers below the floor.

### Stage 2. Make the gates decide (P0)

Phases 3, 5, 7, 9.

- 2.1 Repair or withhold. `repairInstruction` (slop + prose) reaches `repairSlide`; a deterministic
  `[N/A]` and phrase pass runs before `setSlides`; the deliverable-block path gets the same
  `runGatedArtifact()` helper and repair; `deckPlanGate` re-maps surplus archetypes deterministically
  and writes its verdict into AIR. (E2, E4, A4, E8)
- 2.2 Pointer-free surfaces. One chokepoint in `slideDataToStageHtml` strips citation artifacts from
  every prose field and renders named, dated labels into source lines; Journey Mapper HTML runs the
  diagram scrub before persist; `exportGoldDeckPptx` scrubs stage HTML before POST. (E1, E7, E9)
- 2.3 Delete the hyphen bug and the word-deletion bug. Remove `scrubEnDashes`; split `SLOP_PHRASES`
  into delete-safe filler and detect-only words; `stripEmDashes` rule 3 chooses period or semicolon
  between independent clauses; reconcile `enforceContentBudgets` ceilings with CLAUDE.md; add the 13
  missing phrases. (E5, E6, E11)
- 2.4 Claim gate as a chain stage. One claim stage after provenance, tier-gated, with
  `claimLedgerGate` as its HTML adapter; delete `claimSupportVerifier` and the surplus resolvers. (A3,
  A9)
- 2.5 Export hardening. Raise in the single-slide route and on missing fonts; delete
  `html_list_to_faithful_pptx`; twin parity script diffs field-access sets of `web.tsx` and
  `slideToStageHtml.ts` against `types.ts`. (E9, E10)
- 2.6 Panels that decide. Critic paths resolved through the manifest; missing rubric fails the panel
  as a degradation event; a `refine` verdict triggers a bounded rebuild; fix the hyphen regex in panel
  telemetry. (C8)

**LIVE EVIDENCE 2026-10-01 (post-rebuild `#personas` on the agricultural-risk session, Opus 5.5 through the job
store):** the chain's new stages acted on a real artifact and the AIR recorded it honestly: `postChain.ri` =
evidence 15 -> 1, slop 5 -> 0, titles 3 -> 0 (three too-long titles rewritten), claims 16 -> 1, two repair rounds, 29
fields rewritten, `chainPass` still false for the one surviving claim (no clean verdict it did not earn); pointer
binder bound 14 of 38 fields; cross-document edges admitted 25 off-shortlist chunks into grounding. The same run
showed that chat `#personas` lands as persona-card SLIDES, not deliverable blocks, so the PRD root adapter now reads
both (fixed and rebuilt the same hour).

**Status 2026-10-01 (tranche B): 2.4 SHIPPED (uncommitted).** The claim ledger is the `claims` chain stage
(`services/claimStage.ts`, the slide adapter over `evaluateClaimLedger`: every text field becomes one block, the
ledger runs once against the grounding chunks, findings map back to slide and field); blocking findings refuse
the chain and reach the repairer with the ledger's own repair action; `claimSupportVerifier` and its single
pipeline call are deleted. `ChainContext.researchGoal` feeds the objective profile. 2.6 lands with the panels
agent's tranche-B work.

**Status 2026-10-01 (tranche A): 2.1, 2.2, 2.3, 2.5 SHIPPED (uncommitted); 2.4 and 2.6 open.** 2.1: the chain
exposes `slopFindings` and a new `titles` stage (`services/titleGate.ts`, the Partner Test: length, metaphor,
naked number, topic label; `no_verb` detect-only), both pinned in `STAGE_ORDER` and the contract schema;
`repairArtifact.needsWork` and the per-slide instruction now cover slop, titles and prose offenders (not only
evidence and grader findings); the repair prompt asks for three title candidates and `pickTitleCandidate` lets
the gate choose (R-M2); `RepairResult.ri` records per-family before/after counts (R-M1); `stripQAAnnotationsDeep`
runs in the lexical stage; the deliverable-block path runs `runGatedDeliverables` (chain + repair) and records
on the AIR; a title still carrying a bare figure after repair is WITHHELD from the deck and recorded;
`deckPlanGate` remaps surplus `numbered-themes` fences to `evidence-table` payload-to-payload when the model's
re-ask does not clear the clamp, and its verdict (`pass`, violations, visual ratio, resolution, remapped) lands
in AIR `postChain.deckPlan` and `reviewScores.deck_plan_violations`. 2.2: one `scrubCitationPointersDeep`
chokepoint in `slideDataToStageHtml` (named, dated labels in source fields; pointers stripped from prose);
`scrubStageHtmlText` before every PPTX POST; Journey Mapper HTML scrubbed before persist. 2.3: `scrubEnDashes`
deleted; `SLOP_PHRASES` split into `DELETE_SAFE_FILLER` and `DETECT_ONLY_WORDS` (detect-only words are reported,
never deleted); `stripEmDashes` rule 3 chooses semicolon only between independent clauses; budgets aligned to
CLAUDE.md; the missing phrases added; the two E7 metaphor-for-metaphor swaps removed. 2.5: non-native slides and
missing brand fonts now raise; `html_list_to_faithful_pptx` and its proxy branch deleted; `proxy/fonts/static/
Lato.ttf` added (the NU typeface had never been embedded, silently); `check:templates` diffs real field-access
sets of both twins (red by design on 12 templates until the preview-side drops are fixed). Open: 2.4 claim gate
as a chain stage; 2.6 panels that decide.

Gate: the live slop scan (scratchpad `slop_scan.py`, to be moved to `scripts/eval/`) reports zero raw
pointers, zero `[N/A]`, zero em-dashes and zero banned phrases on SHIPPED payloads for ten consecutive
artifacts; `check:templates` fails on the current prd-feature field drift until fixed.

### Stage 3. PRD v2: one contract, document-first, build-ready (P0 for the owner's goal)

Phases 1, 3, 5, 6, 8, 9. Depends on Stages 0 to 2.

- 3.1 One PRD contract on AIR. Define `PrdAir` (the Artifact Graph for kind `prd`): the twelve
  sections of 3.1, requirement nodes with trace ids, acceptance tests, signals, and the derived
  traceability matrix. The pipeline stage, `#prd`, the deliverable block and `prd_candidate` all
  emit and consume this one shape; delete the three others' field sets. (F1)
- 3.2 Inputs honored. `#prd` and the pipeline stage receive the approved personas, themes, journey
  pain points and competitive gaps as typed AIR references (not empty arrays, not a KG node list),
  and every requirement must trace to at least one; untraceable requirements are typed HYPOTHESIS and
  rendered as bets. (F1, F2)
- 3.3 Document first, deck second. `#prd` renders the two-tier document through the HTML artifact
  chain (the same path as `#report`, with the claim stage), and the 8-to-10-slide deck is a
  projection from `PrdAir`: cover, thesis, problem with quotes, why now, users and jobs, goals and
  non-goals, success signals, requirements ledger, risks and alternatives, rollout and decision. The
  `slides:prd-feature` collision is removed by registering the PRD projections as composer archetypes
  (`slides:prd-story`, `slides:prd-ledger`, `slides:prd-signals`, `slides:prd-trace`) so DECK MODE
  never has to fall back. (F1 shape 2)
- 3.4 The number rule. Implement 3.5: typed `requirement_target` fields exempt from the naked-number
  check, everything else unchanged; the AIR naked-number signal scans numeric `value` fields in
  composer payloads and blocks (not reviews) on evidence surfaces. (F3)
- 3.5 Skill and wiki reconciliation. Rewrite `prd-compiler/SKILL.md` to the v2026 spec with the
  traceability model, the prioritization rule and the seven-field signal rule; purge the numeric
  examples from `wiki/frameworks/prd.md` and `wiki/anti-patterns/prd.md` or retype them as
  requirement targets; replace the Quality Discipline v2 block with the one reference skill (C10);
  point the exemplar references at the new golden set. (F3, F4)
- 3.6 PRD-to-prototype bridge. `#proto` reads `PrdAir` as `prd_candidate` so the feature-to-screen map
  and Stage-5 acceptance coverage close the loop from research to a clickable prototype; the PRD's
  build-readiness checklist (states inventory, data touchpoints, dependencies, tracking plan, agent
  boundaries, registered component inventory) becomes the prototype brief's input. (F1 shape 4)
- 3.7 PRD auditor becomes path. `prd-deliverable-auditor` scores the ten-item rubric (3.6) as a
  runtime panel critic with a deterministic trace-integrity check (every R has a P or CG, every Q has
  an S), writes `auditor-verdicts.jsonl`, and a 1 on items 2, 6 or 8 withholds the artifact. (C6)
- 3.8 Pipeline PRD tab tokenized. `ResultsView.tsx:1647-1725` reads tokens and the current display
  face; or the tab renders the same `PrdAir` projection as the chat path. (F1 shape 1)

**Status 2026-10-01 (tranche B): 3.1 to 3.8 SHIPPED (uncommitted); the live `#prd` gate run is next.** 3.1: `services/prdAir.ts`
+ `schemas/prd_air.schema.json` (twelve sections, the S/Q/P/T/PE/CG/R/AT/M graph, typed `requirement_target`,
derived tiers, trace integrity, naked-number scan exempting quotes and typed targets, build-readiness checklist);
the pipeline PRD framework text and the `prd-feature` protocol block are gone (one shape). 3.2: `services/prdInputs.ts`
maps the approved personas, themes, journey pains, gap and competitive rows and the grounding chunks into typed
roots; an empty root set is a `PrdInputsError` the chat answers with what is missing, never an empty-array PRD.
3.3: `#prd` is an html-modality catalog entry: the panel runs the compiler prompt (`buildPrdCompilerPrompt`),
`compilePrdAir` verifies every quote verbatim against its evidence item and types untraceable requirements as
HYPOTHESIS bets, `projectPrdAirToHtml` renders the two-tier document through the same HTML artifact chain as
`#report`, and `#prd #slides` adds the `slides:prd-story / prd-ledger / prd-signals / prd-trace` projection (four
archetypes registered on both twins, visually verified at 1920x1080; `deckPlanGate` counts the three table
projections as visual). 3.4: typed targets exempt, everything else quote-only (`scanNakedNumbers`). 3.5:
`prd-compiler/SKILL.md` v2026, `wiki/frameworks/prd.md` and `wiki/anti-patterns/prd.md` retyped. 3.6:
`prototypeBriefGenerator` reads `PrdAir` as `prd_candidate` with the build-readiness checklist. 3.7: the PRD rubric
is `wiki/eval/rubrics/prd-rubric.json` (items 2, 6, 8 blocking; item 6 is the deterministic `prdTraceIntegrity`
check) scored by `runExpertPanel`, verdicts in `wiki/eval/auditor-verdicts.jsonl`, a 1 on a blocking item
withholds. 3.8: the pipeline PRD tab is token-bound and renders the same projection when a `PrdAir` is present.
`check:templates` is GREEN (every declared field renders on both twins or on neither).

Gate: a fresh live `#prd` on a seeded engagement yields a document and a deck whose every requirement
row resolves to a persona, a pain, a verbatim quote and a named dated source; zero generic-fallback
slides; the rubric scores >= 3 on all ten items with no 1s; the PPTX passes `pptx_native`.

### Stage 4. Cut cost without cutting quality (P1)

Phase 6.

- 4.1 Cache-aligned theme shards (D2); deck-mode blocks hoisted into the stable core (D5);
  per-template protocol injection (A5).
- 4.2 TTL 5m by default, 1h on measured second read; meter aligned to purchase price (D3); Gemini key
  on system text alone (D4).
- 4.3 One routing authority with live health and quota; delete the proxy chains and the force-route
  fallback; `_utility` class for Flash-tier work (D6, D7, A8).
- 4.4 Delta turns instead of full regeneration for expand and floor-retry (D8).
- 4.5 Re-tier P0 and P1 bake-offs on theme shards and `#report` with `scripts/benchmark.mjs` (D9),
  now run on Opus 5.5 (Stage 0.5) against Sonnet 5.5 and Gemini 3.5 Flash, so the cheaper tiers are
  compared to the model actually in service; job+poll for every server fan-out endpoint (D10).

**Status 2026-10-01 (tranche B): 4.3, 4.4, 4.5 SHIPPED (uncommitted).** 4.3: `chooseArtifactModel` reads live
provider health itself (`liveRoutingOpts`), `artifactModelChain` hands the proxy the authority's chain
(`model_chain` on `/api/artifact/generate|revise`), the proxy's per-kind chain tables are deleted (one registry
default remains for callers that send none), the chat force-route fallback is the authority's decision, and a
`_utility` class (`chooseUtilityModel`: Flash, structured Claude when Gemini is degraded) replaces the frontier or
literal models in wiki compile, planner reflection, feedback summarize/regenerate and the journey brief. 4.4: the
theme breadth floor retry is a delta turn (prior themes anchored by name, additions only, merged) against the
cache-aligned prefix. 4.5: `scripts/bakeoff-themes.mjs` ran live on the same 18-origin slice, two independent
repetitions per model (the first pass showed the proxy's exact-match cache serving repeats in a fraction of a
second; a per-run token fixed that): quality 1.0 reasoning / 0.957 Flash / 0.861 structured Claude; the stated
rule (at least 0.90 of the reasoning model, zero failed runs) selects Flash for theme BREADTH shards at roughly
one twenty-fifth of the per-shard cost, so `theme-breadth` joins the schema tier in `aiRouter` with the eval
numbers attached; the chat `#themes` artifact and depth/synthesis stay on the reasoning model, and the chain's
`claims` stage plus the theme evidence gate cover Flash's residual unverified quotes (verbatim rate 0.947).
Results: `plans/audit-2026-09-30/bakeoff-themes-2026-10-01.{json,md}`. D10: `POST /api/jobs` + `GET /api/jobs/<id>`
(disk-backed, any uvicorn worker answers the poll) cover the three fan-out endpoints the finding named; the Design
Desk artifact path uses them with a fifteen-minute ceiling and an AbortSignal. R-L2 (an SSE relay to the browser)
is CONVERGED into job+poll rather than built: the proxy already aggregates the provider's stream server-side above
the 16K output threshold, and the double-billing the relay was meant to cure came from a client budget shorter
than the proxy's, which job+poll removes without a second long-lived socket. The chat deck path now rides the
same store: `aiRetryClient` runs any Anthropic call budgeted above three minutes as `POST /api/jobs` (op
`/api/ai/anthropic`) and polls, so the client and proxy budgets cannot disagree and a dropped socket never loses a
finished deck; short calls keep the direct POST, and an older proxy without the jobs API falls back to it.

**Status 2026-10-01 (tranche A): 4.1 and 4.2 SHIPPED (uncommitted); 4.3, 4.4, 4.5 open.** 4.1: theme shards put the
stable prompt behind a cache breakpoint in `system` and send only the corpus window in the user turn; the DECK
MODE block is hoisted into the stable cached core; `deliverableProtocolFor` injects only the requested
templates' example blocks (plain chat: response-mode rules alone). 4.2: TTL auto (5m, promoted to 1h on a
measured in-session cache read); cost meter at purchase price; Gemini cache key on system text alone. The theme
bake-off (decision 4) and the SSE relay / job+poll items are the next cost work.

Gate: `cachetelem` shows reads > writes for Anthropic over a week; theme run cost per engagement falls
below half the current median with the golden-set discrimination unchanged.

### Stage 5. Close the self-improvement loop (P1)

Phase 7.

- 5.1 Counter -> proposer -> gate -> promotion, in path: `getEpochStatus` read at end of run; the
  proposer writes proposals; `applySkillPatch` writes to the proposals store; `/api/skill/write`
  requires a verdict token; `skillopt-batch.sh` refuses `cp` without APPROVE; one disk-authoritative
  scheduler with mounted scripts; delete the Task Scheduler XML and README claim. (C2, C4, C6, C7)
- 5.2 Constraints with a lifecycle: record rows at creation, applications counted, retirement that
  deletes, injection capped as in the Claude Code hook. (C5)
- 5.3 Register `quality_gate.py`; delete `hooks.json` and the 26 unreferenced scripts. (C11)
- 5.4 Auditor agents either become runtime panel critics (as 3.7) or are deleted.

**Status 2026-10-01 (tranche A): 5.1, 5.2, 5.3 SHIPPED (uncommitted); 5.4 open.** 5.1: `recordJobCompletion`
fires at the end of every run (`emitDeliverable`), `POST /api/epochs/jobs` keeps a disk-authoritative counter at
`wiki/synthesis/epoch-job-counter.json` (idempotent per run id, reset by the epoch ledger; the SPA falls back to
writing the same file when the endpoint is unreachable), `GET /api/epochs/status` reads it (the old
engagement-mtime scan that had read `due=true` since inception is gone), a due epoch writes ONE `epoch_due`
proposal, `applySkillPatch` proposes instead of writing, `/api/skill/write` refuses without an APPROVE verdict,
`skillopt-batch.sh` promotes only against an APPROVE verdict file, `POST /api/epochs/run-batch` is the one
scheduler (scripts dir now mounted read-only into the proxy), the in-memory per-kind autotrigger and the Task
Scheduler XML / weekly script are deleted, `self-improvement-schedule.sh` calls the endpoint. 5.2: constraint
lifecycle rows, application and regression counts, retirement that deletes, injection capped at 12 / 6,000
chars. 5.3: `quality_gate.py` registered as a Stop hook in `--stop-hook` mode (resolves `transcript_path` to the
last assistant text; text scopes only), `hooks.json` and the 9 zero-reference scripts deleted (17 unregistered
scripts still referenced by docs or code are listed in the Stage 5 report and kept); the `.codex` mirror's dead
copies removed. R-M4: the golden-set runner reports `ri_fire_rate` and `vs_candidate_spread` when AIR records
carry them (producer side still to populate `qualityReport.ri` / `vsCandidates`). Open: 5.4 auditor agents as
runtime critics or deleted.

**Status 2026-10-01 (tranche B): 5.4 SHIPPED (uncommitted).** The 22 `*-deliverable-auditor.md` agents are absorbed
into `wiki/eval/rubrics/<kind>-rubric.json` (index + aliases; 16 deterministic checks in `auditorRubrics.ts`)
and deleted; `runExpertPanel` resolves the rubric through the manifest, fails the panel as a degradation event
when it is missing, scores deterministically (a model score may lower, never raise), runs ONE bounded rebuild on
`refine`, withholds on a blocking 1, and appends one verdict line per artifact. The gap-analysis pipeline path
and the prototype reviewer honor the verdict (flagged or rebuilt, never shipped as a clean pass). AIR
`qualityReport.ri` / `vsCandidates` are produced (R-M4 producer half) and mirrored from the post-chain patch.

Gate: one complete epoch recorded in `improvement-epochs.md` with a held-out verdict; a deliberately
bad skill candidate is refused by the gate in CI.

### Stage 6. Converge the vocabulary and delete the dead paths (P1)

Phase 6; meta-principle.

- 6.1 `ARTIFACT_CATALOG` generates the skill map, aliases, modifiers and registry; brand strings from
  tokens; coverage test asserts all five vocabularies agree. (A7)
- 6.2 Delete the dead dispatch block and wire the four NotebookLM kinds and `#refine` from the catalog
  table; multi-hit routing with word-boundary regexes. (A1, A2)
- 6.3 Delete `exportService.ts`, `INLINE_SKILL_TEMPLATES`, the surplus resolvers,
  `deck-narrative-composer` vs `deck-composer` duplication, and the `_versions/` bloat. (A9)

**Status 2026-10-01 (tranche B): 6.1, 6.2, 6.3 SHIPPED (uncommitted); the orphan gate is measured, not met.** 6.1:
`ARTIFACT_CATALOG` generates the template rules, the hashtag-to-skill map, the aliases, the modifier tokens, the
HTML parser list, the Design Desk vocabulary and the registry aliases; `corpusChatService` binds the generated
constants (its four local tables and `INLINE_SKILL_TEMPLATES` are deleted); brand copy comes from the token mirror;
`artifactCatalog.coverage.test.ts` asserts the five vocabularies agree. 6.2: the 815-line unreachable dispatch
block in `CorpusChatPanel` is deleted and replaced by a catalog-keyed uplift dispatch; `#refine` and
`#questionnaire` are live; routing is multi-hit with word-boundary regexes and the highest tier wins
(`primaryCatalogHit`). 6.3: `exportService.ts` deleted (the GOLD native path is the one export,
`resultExports.ts`), `deck-narrative-composer` folded into `deck-composer` and deleted with its twenty
`_versions/` copies, `claimSupportVerifier` and the duplicate pointer resolver deleted, `citationResolver`
now delegates its text rewriting to the one resolver. `npm run check:orphans` (new) reported 553 exported
symbols with no callers outside their file; the pass that followed deleted 54 unused declarations, de-exported 294
in-file-only symbols, and recorded the 199 exports that exist only as vitest seams in `scripts/orphan-exports.allow`
(each entry named, none papered over), so the gate now reads ZERO orphans with tsc clean and the suite green.

Gate: `orphan-code-auditor` run reports zero exported functions with no callers in `services/`.

---

## 5. Validation protocol before any stage is called shipped

1. `npm run typecheck` clean; `npm run test` green with zero provider calls.
2. Rebuild `research-generator` and `research-proxy`; hard refresh; SPA smoke test with console-error
   zero.
3. A live run on a seeded engagement for each touched artifact kind; the AIR must show `chainRan`
   true, real cost, a catalog-resolved render plan, and zero `unchecked`.
4. The slop scan over the new SHIPPED payloads reports zero on the hard-ban columns.
5. For PRD: the rubric and the trace-integrity check pass; the PPTX passes `pptx_native`; the document
   passes the claim ledger with zero blocking rows.
6. Replay of the two stored PRD runs through the new retrieval and chain demonstrates each class of
   defect in F2 is now caught.

---

## 6. Owner decisions (RESOLVED 2026-10-01, via option cards)

| # | Decision | Owner's choice | Effect on the plan |
|---|---|---|---|
| 1 | Numbers in PRD | Allow typed `requirement_target` fields; evidence numbers stay quote-only | Stage 3.4 proceeds as written |
| 2 | `#prd` format | Document first, deck as a projection (`#prd #slides` adds the deck) | Stage 3.3 proceeds as written |
| 3 | Prior insights | Memory, not evidence (`citable: false`; they feed the intake brief) | Stage 1.3 / R-S4 proceed; convergence counts will drop honestly |
| 4 | Theme bake-off | Yes, spend ~$15-25 on Sonnet 5.5 and Flash vs Opus 5.5, golden-set gated | Stage 4.5 / R-T6 unblocked |
| 5 | Cache TTL | 5 minutes by default, promote to 1 hour on a proven second read in-session | Stage 4.2 / D3 proceeds as written |
| 6 | Auditor agents | Wire each rubric into the runtime panels (PRD first), delete absorbed agent files | Stage 3.7 and 5.4 proceed; deletion is in scope |
| 7 | Split sessions | Merge the seven split engagements in place, leave a pointer file in the short-named folder | Stage 0.1 includes the migration |
| 8 | Gemini categories | Move `research` and `narrative_composition` to Opus 5.5 as well | Stage 0.5 scope widens: DEFAULT_MODELS repointed; bake-offs may later re-tier |

The original question list is kept below for the record.

### 6.1 Original questions (asked 2026-09-30)

1. The number rule split (3.5): approve typed `requirement_target` fields as the one legitimate home
   for numbers outside quotes. Without it the PRD cannot be testable.
2. Document-first PRD: `#prd` alone produces the two-tier document; `#prd #slides` adds the deck
   projection. Confirm.
3. Derived-is-not-evidence: `insight`/`synthesis` pages stop being citable. Confirm (this will reduce
   apparent convergence counts on the next runs, honestly).
4. Theme model bake-off: permission to run the Flash/Sonnet bake-off on theme shards (the 86% spend
   line) with `scripts/benchmark.mjs`.
5. Anthropic TTL default to 5m with measured promotion.
6. Delete or wire the 23 per-deliverable auditor agents (Stage 5.4).
7. Session directory migration for the 7 split engagements.
8. Opus 5.5 scope (Stage 0.5): confirm that only the current Claude sites move, or also move the
   Gemini-defaulted `research` and `narrative_composition` categories (`aiRouter.ts` DEFAULT_MODELS,
   currently `gemini-3.1-pro-preview`) to Opus 5.5. Also confirm the effort policy in 0.5.3 and the
   fallback order Opus 5.5, Sonnet 5.5, Gemini.

---

## 7. Sources for Section 3 (PRD standards)

SVPG: "How To Write a Good PRD" (2005), "The Purpose of Prototypes" (2025-09), "Prototypes vs
Products" (2025-11). Basecamp Shape Up ch. 6. workingbackwards.com PR/FAQ template. Lenny Rachitsky
templates (2020) and one-pager. Yuhki Yamashita, Figma's approach to PRDs. Linear Method and "How we
run projects". Atlassian and Notion product-spec guidance. Reforge, Rothfels and Jafri (2022). Ben
Yoskovitz (2023). Malte Ubl, Design Docs at Google (2020). Intercom one-page brief (Paul Adams).
Teresa Torres, Opportunity Solution Tree and the 2026 airfocus interview. Alan Klement, job stories.
Bland and Osterwalder assumptions mapping; Huryn's canvas. Klein, "Performing a Project Premortem"
(HBR 2007); Doshi pre-mortems. Cucumber "Writing better Gherkin". ISO/IEC/IEEE 29148 (Modern
Requirements explainer); ISO/IEC 25010 (Sonar, arc42); WCAG 2.2 (ADA Title III blog, Deque); GDPR
Articles 25 and 35 (Legiscope, Transcend); FDA design-control traceability (Ketryx, Kapstone);
DO-178C (Parasoft). Aakash Gupta, "AI PRDs" (2025-08) and the 500-PRD analysis; Tom Leung (2025-12);
Fathy Shalaby (2026-07); Addy Osmani, "How to write a good spec for AI agents" (2026-01); ChatPRD,
"PRDs for AI code generation" (2026); AQ, executable specs (2026-08); Amplitude tracking-plan docs;
LaunchDarkly guarded rollouts. Standards content comes from practitioner explainers, not the paywalled
standards.

---

## 8. Audit artifacts

Evidence copied into `plans/audit-2026-09-30/`: `slop_scan.py`, `slop_scan_report.txt`, `deck_reports.json`, `render_probe.mts.txt`, `trace_cost.py`, `manifest_audit.py`, `fm_audit.py`
(slop and deck scan); and `prd_payloads.txt` (the two stored PRD payloads, de-fenced). Move `slop_scan.py`
to `scripts/eval/` as the Stage 2 gate.


---

## 9. Expert uplift proposals (2026-10-01): research depth, deliverables, token efficiency, latency, second brain

Two lenses. The senior-partner lens asks of every artifact: what decision does the client have to make, what
is the answer, what evidence carries it, what would change our mind, and can a partner read only the
titles and follow the argument. The engineer lens asks: what is the scarce resource (context tokens and
wall-clock), is it measured before it is optimized, are the primitives small and composable, and does the
system get better from its own data (the wiki is the dataset; evals are the product).

Method. Each area was worked with verbalized sampling: three candidate directions, each with a verbalized
probability of being the highest-leverage move given the Section 2 evidence (probabilities sum to 1.0),
committing to the argmax. Where the top two were within 0.10, reinforcement inference was applied: the
prior pick was restated, the single weakest assumption behind it was named, and the pick was revised or
confirmed from the audit evidence. Both passes are recorded so the reasoning can be audited. The same two
techniques are then proposed as runtime mechanisms (9.6), because the audit found them present in code
but inert in the artifact paths.

Live datum from the Stage 0.5 validation run (2026-10-01, `#prd` on the email-design engagement): the
request that reached Anthropic was 1,442,605 characters with a 653,401-character cached prefix, and the
pre-model grounding phase resolved 960 shortlisted chunks before the model was called. Those two numbers
anchor 9.3 and 9.4.

### 9.1 Research depth

Candidates. (a) 0.45, sub-question-driven collection: decompose the objective at intake and let the
sub-questions drive collection queries and a coverage gate; today 91 of 93 AIR records have no
decomposition and collection is pack-driven (B8, F2). (b) 0.35, primary-document precedence: official
documentation, filings, standards and transcripts outrank news and AI-feed articles, and independence is
counted by origin, not by source name (B3; the 2026-09-11 report run held zero developer-docs pages for a
documentation objective). (c) 0.20, counter-evidence discipline: a contradiction quota per theme.

Reinforcement pass (a vs b within 0.10). Prior pick: (a). Weakest assumption: that better-organized
retrieval helps when the corpus is still dominated by off-objective feeds (419 AI-news items on the Figma
run; hugging-face and nvidia pages inside an agriculture PRD). Revised pick: (a) and (b) are one workstream.
Decomposition without source-quality control retrieves the same noise, better organized. Items:

- R-D1 Decomposition is mandatory at intake. The clarification service (in flight on this branch) asks
  the one combined question when the objective lacks subject, industry or audience; the research planner
  then writes sub-questions with priority and expected evidence types into the session manifest and every
  AIR. Phase 1.
- R-D2 Collection budgets per sub-question. Each sub-question gets a query set and a coverage status;
  collection stops adding pack results for a covered sub-question and keeps spending on uncovered
  high-priority ones. Coverage becomes a gate input, not a thinking event. Phase 1.
- R-D3 Primary-document discovery runs for every objective at collection, not only for `#report`: the
  subject's official documentation hostnames are derived once and crawled first; those pages carry
  `kind: documentation` and outrank feeds in admission. Phase 2.
- R-D4 Origin-counted independence. Convergence, the `thick` tag, and "across sources" claims count
  distinct canonical URLs or content hashes, never source-name strings. Phase 3.
- R-D5 Counter-evidence quota. Every theme carries at least one scoping or contradicting quote, or is
  labeled single-vantage in AIR and rendered without convergence language. Phase 5.
- R-D6 The partner column. Every theme and every recommendation records the client decision it informs
  and the condition under which the opposite choice wins (the Claim-Type Discipline rule). Rendered as a
  column in the Analyst Desk, never as prose. Phase 5.

### 9.2 Deliverables

Candidates. (a) 0.50, document-first with the deck as a projection and a traceability column, the PRD v2
pattern generalized to strategy, recommendations and report (Stage 3). (b) 0.30, the decision-memo spine:
every deliverable opens with the decision requested, options considered, the recommendation, and what
would change our mind. (c) 0.20, the prototype bridge: every PRD and strategy hands a brief to `#proto`.

Reinforcement pass (margin 0.20, applied anyway because the deck is the owner's primary consumption
surface). Prior pick: (a). Weakest assumption: that users will read a document when they asked for a
deck. Revised pick: one AIR produces both; the deck renders first and stays editable, the document is the
expandable source of truth under it, and (b) becomes the Tier-1 page of (a). Items:

- R-B1 Decision-memo spine in AIR `insightHierarchy`: situation, complication, options considered (at
  least two, with the trade-off), recommendation, what would change our mind, next decision and date.
  Every deck opens with it; every document leads with it. Phase 5.
- R-B2 `slides:options-considered` archetype (two to three options, criteria rows, the chosen one marked)
  and `slides:what-changes-our-mind` (the kill conditions). Composer archetypes, token-bound. Phase 8.
- R-B3 Traceability column on every evidence-bearing row (theme, recommendation, requirement): persona,
  pain, quote id, source attribution and date. Derived from AIR, never model-authored. Phase 3.
- R-B4 The Partner Test as a blocking deterministic gate: every title has a finite verb, is at most 70
  characters, contains no banned metaphor token and no bare number; a failing title is repaired from its
  own slide body or the slide is withheld. Phase 5.
- R-B5 Prototype handoff for every PRD and strategy: the build-readiness checklist (states, data
  touchpoints, dependencies, tracking plan, component inventory) is emitted as the `#proto` brief input.
  Phase 8.

### 9.3 Token efficiency

Candidates. (a) 0.50, prompt architecture: stable prefix first and byte-identical across calls (skills,
the one template spec the request needs, design tokens), corpus in its own cached block, theme shards as
system-cached prefix plus a small user window (D2, D5, A5). (b) 0.30, retrieval right-sizing: the same
30K-token corpus is packed for every artifact kind; budgets become per-kind and coverage-driven, and
chunks are deduplicated by origin before packing. (c) 0.20, model tiering of shards and utility work to
Sonnet 5.5 or Flash behind a bake-off.

Committed: (a), then (b). No reinforcement pass (margin 0.20). The engineer's rule applies first: Stage
0.2 telemetry lands before any of these, so each is measured as cost per completed artifact, not per
request. The live `#prd` request above (1.44M characters, of which 0.65M cached) is the baseline to beat.
Items:

- R-T1 Cache-aligned theme shards (D2) with the target that Anthropic cache reads exceed writes within a
  week; TTL 5m by default with measured promotion to 1h (D3). Phase 6.
- R-T2 Per-template protocol injection (A5): a `#prd` request carries the PRD spec, not 18 specs; plain
  chat carries none. Measured as system-prompt bytes per kind in the trace. Phase 6.
- R-T3 Coverage-driven corpus budget: packing stops when every high-priority sub-question is covered by
  at least two independent origins, instead of filling the budget; origin dedupe before MMR. Phases 1, 5.
- R-T4 Effort sweep on Opus 5.5 per deliverable kind against the golden set (low, medium, high, xhigh):
  effort is the first quality-trading lever on this model and the policy in 0.5.3 is a starting point, not
  a measurement. Phase 6.
- R-T5 Cost and token SLO per artifact kind recorded in AIR `qualityReport` (input, output, cache read and
  write, dollars), with the benchmark diff failing on a regression above a declared tolerance. Phase 6.
- R-T6 Bake-off Sonnet 5.5 and Flash on theme shards and utility classes (D9), promoted only on
  golden-set discrimination unchanged. Phase 6.

### 9.4 Latency

Candidates. (a) 0.45, pre-model grounding latency: the live run resolved 960 shortlisted chunks through
sequential page reads before the model was called (the 2026-08-26 note measured 300 reads on a plain
question); a batch-resolve endpoint and a per-run catalog cache remove it. (b) 0.35, perceived latency:
stream slides as fences complete and show the summarized reasoning live. (c) 0.20, job-and-poll for every
server fan-out endpoint and parallel shard waves (D10).

Reinforcement pass (a vs b within 0.10). Prior pick: (a). Weakest assumption: that grounding dominates
wall-clock. Evidence: theme shards run 89 to 173 seconds of model time at median; grounding dominates
time-to-first-token on chat and artifacts, model time dominates total time on long generations. Revised
pick: (a) for time-to-first-token, (b) for perceived latency on long generations, in that order. Items:

- R-L1 `POST /api/manifest/resolve-batch`: one call resolves every shortlisted pointer with provenance;
  `pickChunksForPrompt` uses it; the per-run catalog is cached for the run, and shards stop re-running the
  embedding admission. Phase 5.
- R-L2 Proxy-to-SPA SSE relay for artifact calls: the proxy already aggregates upstream streams (Stage
  0.5.4); relay the events so the Analyst Desk renders each `:::slide` fence as it completes and shows the
  summarized thinking as the Live Thinking feed. Phase 6.
- R-L3 Job-and-poll for `/api/artifact/generate`, `/api/artifact/revise`, `/api/journey-map/generate`
  (D10), the pattern topic modeling already uses. Phase 6.
- R-L4 Latency budget per kind in AIR `modelTrace` (grounding ms, first token ms, model ms, render ms)
  with the benchmark diff reporting regressions. Phase 6.

### 9.5 Second brain

Candidates. (a) 0.50, make the manifest a real graph: cross-document concept edges, origin
canonicalization, typed per-chunk provenance, derived pages excluded from evidence (B2, B3, B4, B6).
(b) 0.30, compounding engagement memory: a "what we already know" brief at intake from the 19.6k-record
manifest, with insights linked to parent evidence and reused by objective similarity (B7). (c) 0.20, the
curation loop: scheduled curator, ISO dates, duplicate-page merge, lint backlog.

Committed: (a), with (b) folded into Stage 1 as its user-facing surface. No reinforcement pass (margin
0.20). The engineer's framing: the wiki is the dataset; every run must start by reading it and end by
writing to it in a form the next run can retrieve. Items:

- R-S1 Cross-document concept edges at backfill: embedding neighbours plus shared named entities, written
  into manifest records; retrieval seeds from concept neighbours before the embedding tier. Phase 4.
- R-S2 Origin canonicalization and page merge through `corpusMergeAuthority` at ingest; the 4,620 duplicate
  groups collapse; `uploads/` retires into `client-uploads`. Phases 2, 3.
- R-S3 The prior-knowledge brief at intake: before collection, query the manifest by objective and show
  the user what will be reused, with provenance and age, and let them exclude items (the KL selection
  becomes the confirmation step of this brief rather than a separate curation task). Phase 2.
- R-S4 Insights are memory, not evidence: `insight` and `synthesis` pages carry `citable: false`; they
  prime retrieval and the brief, never a citation. Phase 5.
- R-S5 Scheduled curator: ISO dates everywhere, undated pages flagged, duplicate pages merged, lint
  backlog burned down on a cadence, with the ledgers compile-excluded (C3). Phase 7.
- R-S6 Second-brain metrics in the benchmark: reuse rate per run, cross-engagement citation rate, share
  of citations with per-chunk provenance, duplicate-origin rate. Phase 7.

### 9.6 Verbalized sampling and reinforcement inference as runtime mechanisms

The audit found both techniques present as skills and partly as code, but inert where they matter: zero
`ri:` annotations in any stored trace, verbalized sampling applied in-prompt only, thesis alternatives
offered only for bare `#slides`. Items:

- R-M1 Reinforcement inference on the artifact chain: when the chain refuses (evidence-slot, claim-ledger
  or slop violations), the repair call carries the prior answer verbatim plus the typed failure list as
  the uncertainty hint, and the trace records `ri:` with the before and after verdicts. Replaces the
  current repair that ignores slop and prose findings (E2). Phases 5, 7.
- R-M2 Verbalized sampling for titles and theses: three candidate titles per slide with probabilities,
  selected by the deterministic Partner Test (R-B4), so variety is earned and the gate, not the model,
  picks. Extend `proposeAlternativeTheses` from bare `#slides` to every deck kind. Phase 5.
- R-M3 Verbalized sampling for theme naming and persona rostering at k=5 with the deterministic naming
  pass (temperature 0 and seed where the provider allows; on Claude 5.x, effort and the anchored re-ask
  carry determinism, since sampling params are rejected) choosing by evidence coverage, so the same
  corpus yields the same roster and the roster is not the single most probable one. Phase 5.
- R-M4 Both techniques are measured: `ri:` fire rate and before/after verdicts, and verbalized-sampling
  candidate spread, appear in the benchmark and in AIR `qualityReport`, so their effect is a number, not a
  claim. Phase 7.

### 9.7 Where these land in the stage plan

R-D1 to R-D6 and R-S1 to R-S4 extend Stage 1; R-B3, R-B4, R-M1 to R-M3 extend Stage 2; R-B1, R-B2, R-B5
extend Stage 3; R-T1 to R-T6 and R-L1 to R-L4 extend Stage 4; R-S5, R-S6, R-M4 extend Stage 5. Nothing
here is a new subsystem: every item converges an existing primitive onto the AIR backbone or deletes a
parallel path, and every item names the measurement that proves it.
