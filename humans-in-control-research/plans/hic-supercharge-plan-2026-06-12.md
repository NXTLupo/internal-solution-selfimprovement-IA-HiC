# HiC Supercharge Plan — per-phase recommendations (2026-06-12)

Method: per phase, verbalized sampling generated k=3 candidate strategies
(frame + probability that it is the highest-leverage move given the owner's
intent corpus); the winner was selected and hardened with grafts from
runners-up; a reinforcement-inference pass then re-attacked the weakest
recommendation with the draft as anchor. Inputs: the 4 phase analyses in
plans/pipeline-analysis-2026-06-12/, the intent synthesis (8 themes), and
HIC_PIPELINE_DEFINITIVE_2026-06-12.md.

Owner-intent anchors every candidate was scored against: manifest-not-RAG,
determinism, dual-brand Figma fidelity, honest surfacing, depth-over-volume,
structural density, KL-binding, compounding self-improvement.

---

## PHASE 1 — COLLECTION: "Grade the river, not just the catch"

VS candidates:
- (a) frame=infrastructure "Tier-1 guarantee": close every ingest path that
  misses engagement tagging; assert non-empty tier-1 after collection. p=0.40
- (b) frame=relevance "Goal-scoped grading at ingest": per-goal regrade of
  the candidate catalog at engagement start + freshness decay in pre-rank. p=0.35
- (c) frame=observability "Yield funnel telemetry": per-connector
  fetched->deduped->kept->chunked counters on the collection UI. p=0.25

RECOMMENDATION (a + b grafted, c as the measurement layer):
1. ENGAGEMENT-TAG GUARANTEE (S, P0): audit parse-upload, deep-research
   custody, reddit-deep, transcripts ingest paths; every manifest record gets
   the session slug; post-collection assert "tier-1 catalog non-empty" surfaced
   in the scope bar. Kills the tier-3-as-default precision loss observed live
   (0/10,407 tagged for an active session).
2. GOAL-SCOPED RELEVANCE + FRESHNESS (M): batch-regrade candidate records
   against THIS goal at engagement start (existing regrade endpoint, scoped +
   cached); add published/ingested timestamps to records; pre-rank applies
   recency decay tuned by goal type. Directly serves "fresh data" intent at
   retrieval, not just at fetch.
3. CONNECTOR YIELD FUNNEL (S): per-connector counters -> yield-ledger + UI.
   Measurement before further collection tuning.

## PHASE 2 — MANIFEST: "Make tier-1 fast, snapshotted, and self-checking"

VS candidates:
- (a) frame=performance "Per-engagement catalog snapshot": persist the
  goal-ranked catalog at collection end; turns rank the snapshot. p=0.40
- (b) frame=recall "Hybrid tie-breaker": deterministic lexical first,
  cached embedding assist only on the shortlist tail. p=0.30
- (c) frame=integrity "Drift sentinels": scheduled parity + tier-1 health
  asserts per engagement. p=0.30

RECOMMENDATION (a primary, c grafted; b behind a flag):
1. CATALOG SNAPSHOT (M, P1): engagements/<slug>/catalog-snapshot.json written
   post-collection (pre-ranked, goal-scoped); chat + theme shards consume it.
   Faster, more deterministic (fixed candidate set = identical MMR packs),
   and removes the 43K-pointer whole-wiki re-rank per turn.
2. HEALTH SENTINELS (S): weekly parity run + per-engagement tier-1 assert +
   append-dirty rechunk queue.
3. HYBRID TIE-BREAK (M, flagged OFF by default): embedding assist for the
   shortlist tail only, cached by (goal, chunkId); ship only with an A/B
   yield-ledger comparison proving recall lift without identity drift.

## PHASE 3 — THEMES: "Sentiment + confidence become first-class, shards stop collapsing"

VS candidates:
- (a) frame=metadata "Per-theme sentiment + confidence": cluster rollup now,
  per-theme pass later; flows to desk AND chat. p=0.35
- (b) frame=reliability "Fable-backed shards": swap collapse-prone Gemini
  shards to Fable 5 for the breadth pass (it already writes the deliverables;
  repetition-collapse class disappears). p=0.40
- (c) frame=evidence "Multi-quote breadth": 3 verbatim quotes per theme at
  breadth, not 1. p=0.25

RECOMMENDATION (b primary — RI pass upgraded it from candidate to lead; a + c grafted):
1. FABLE-5 BREADTH SHARDS (M, P0): route _runBreadthShard primary to
   claude-fable-5 (no temperature; 32K out), Gemini 3.5 Flash as the cheap
   fallback, GPT-5.5 recovery retained. Eliminates the "1111"x66 collapse +
   recovery latency that currently taxes every large run. Cost guard: shard
   count cap + the existing budget telemetry.
2. PER-THEME SENTIMENT + CONFIDENCE (M): inherit cluster sentiment at
   breadth; depth pass refines; both persist in themes.json and render in the
   desk (priority = goalAlignment, sentiment chips).
3. MULTI-QUOTE BREADTH (S): theme schema carries up to 3 verbatim quotes with
   pointers at breadth (the wiki backfill already upgrades weak ones).

## PHASE 4 — CHAT: "Close the awareness gap: rank, sentiment, contradictions, validated citations"

VS candidates:
- (a) frame=awareness "Depth-aware theme context": goalAlignment rank +
  sentiment + contradictions injected into shapeThemes. p=0.45
- (b) frame=integrity "Chat-time citation validation": resolve pointers
  pre-finalize, RI re-ask on dead ones. p=0.30
- (c) frame=navigation "Cluster auto-injection": topic clusters surface
  automatically when goal-fit > 0.6. p=0.25

RECOMMENDATION (a + b together — they share the finalize hook; c follows):
1. DEPTH-AWARE THEME CONTEXT (M, P1): shapeThemes carries rank, sentiment,
   confidence, contradictions (budgeted: top-N by alignment get depth fields);
   prompt rule to surface tensions. The chat finally "knows what the desk
   knows."
2. CITATION PRE-VALIDATION (S, P1): resolve emitted pointers before finalize;
   one RI re-ask on dead pointers; cached. Closes the hollow-citation hole at
   generation time instead of render time.
3. CLUSTER AUTO-INJECTION (M): TOPIC CLUSTERS block (terms, sentiment,
   counts) when goal-fit clears threshold; tool return enriched.

## PHASE 5 — DELIVERABLES: "Finish the ONE-ENGINE migration"

(Existing state per the audit: MCR coverage ~59% of hashtags, GOLD rendering
~41%; slide-mode hashtags are compliant; freeform/HTML/presentation paths lag.)

VS candidates:
- (a) frame=consolidation "MCR everywhere": port pickChunksForPrompt
  grounding into the artifact engine, freeform generators, and
  narrativeComposer. p=0.45
- (b) frame=design "Figma token sync to every surface": HTML artifacts +
  freeform exemplars consume /api/design-tokens; variable-binding pass on the
  GOLD frames. p=0.30
- (c) frame=quality "Pre-generation gates": evidence-density pre-check +
  schema validation before any artifact engine call. p=0.25

RECOMMENDATION (a primary, b + c sequenced behind it):
1. MCR EVERYWHERE (M-L, P0): one shared grounding helper
   (buildManifestCorpusForGoal) consumed by: proxy /api/artifact/generate
   (#org #arch HTML artifacts), chatToFreeform/chatToSlideSpec (Designer),
   HTML directives (#strategy #brief #report #explainer), narrativeComposer
   (#presentation), #recommendations (replace objective-keyed retrieval).
   Every artifact cites pointers; the citation hook covers them for free.
2. FIGMA TOKEN SYNC (S-M): HTML artifact CSS variables hydrate from
   /api/design-tokens at generation; GOLD frame variable-binding pass
   (collections NXT 221:2 / NU 95:2) clears the registered deviation.
3. PRE-GENERATION GATES (M): evidence-density pre-check + payload schema
   validation before the model call on non-slide paths (slide paths already
   have the protocol + post-processor).

## PHASE 6 — SELF-IMPROVEMENT: "From manual loop to scheduled flywheel"

VS candidates:
- (a) frame=automation "Scheduled SkillOpt + epoch auto-fire": batch runs
  when feedback accumulates; epoch readiness surfaced. p=0.40
- (b) frame=robustness "Fix the silent drops": classifier retry/fallback;
  constraint dedup; checkpoint-edit pipeline revival. p=0.35
- (c) frame=accountability "Constraint effectiveness ledger": per-run scores
  adjust confidence; retire dead constraints. p=0.25

RECOMMENDATION (b first — RI pass: automation on top of silent drops
amplifies noise; fix capture THEN schedule; a second; c third):
1. CAPTURE ROBUSTNESS (S, P0): chatFeedbackExtractor try/catch + retry +
   regex fallback + failure logging (the prose-instead-of-JSON failure is
   live); constraint dedup at /api/wiki/append; revive checkpoint-edit
   clustering.
2. SCHEDULED FLYWHEEL (M, P1): auto-fire skillopt extract->build->batch when
   5+ train_skill events accumulate (48h cadence, gate untouched); epoch
   readiness on the landing strip; both human-approved before promotion.
3. EFFECTIVENESS LEDGER (L): constraint confidence adjusts from run quality
   scores; retirement proposals surfaced to the user.

---

## REINFORCEMENT-INFERENCE PASS (anchored self-critique, applied)

Weakest draft elements re-attacked with the draft as anchor:
1. Phase 3 originally led with sentiment metadata; the critique: metadata on
   top of a collapse-prone generator polishes unreliable output. Fable-backed
   shards promoted to lead (the generator IS the bottleneck).
2. Phase 6 originally led with scheduling; the critique: scheduling a loop
   with silent capture drops automates noise. Capture robustness promoted.
3. Phase 5 "MCR everywhere" risk: divergent corpus shapes per engine; answer:
   ONE shared helper, not per-engine ports (consolidation is the point).
4. Cross-phase determinism risk from the hybrid tie-break (Phase 2.3):
   demoted behind a flag + A/B evidence requirement.

## PRIORITY SEQUENCE (across phases)

P0 (this/next week): 1.1 engagement-tag guarantee · 3.1 Fable breadth shards
· 5.1 MCR-everywhere helper (start with #recommendations + artifact engine)
· 6.1 capture robustness
P1: 2.1 catalog snapshot · 4.1 depth-aware theme context · 4.2 citation
pre-validation · 6.2 scheduled flywheel · 5.2 Figma token sync
P2: 1.2 goal-scoped relevance/freshness · 3.2 sentiment/confidence ·
4.3 cluster auto-injection · 5.3 pre-generation gates · 2.3 hybrid flag ·
6.3 effectiveness ledger

Each P0 item ships with the standard verification protocol (typecheck, tests,
rebuild, browser flow, output inspection) and registers its learned
constraint on completion.

## EXECUTION RECORD - P0 wave (2026-06-12 EVE)

All four P0 items SHIPPED + gated (tsc 0 errors, py_compile OK, 79/79 tests,
both containers rebuilt, browser load 0 console errors):

1. 6.1 CAPTURE ROBUSTNESS: chatFeedbackExtractor JSON-salvage + regex
   fallback + 2 attempts; constraint dedup at /api/wiki/append
   (LIVE-VERIFIED: duplicate key returned deduped=true, dropped=1).
2. 3.1 FABLE BREADTH SHARDS: _runBreadthShard primary -> claude-fable-5;
   Gemini->GPT-5.5 chain preserved as fallback. NOT yet exercised on a live
   theme run (next large run verifies; watch [Themes-S*] logs for
   "generating via Claude Fable 5").
3. 1.1 ENGAGEMENT-TAG GUARANTEE: /api/wiki/write engagement param +
   frontmatter injection (newline bug caught + fixed in live test);
   writeWikiPage opts; upload seeding chunk+tagged. LIVE-VERIFIED tier-1
   round-trip. Remaining ingest paths to sweep: deep-research custody,
   transcripts (registered as P1 follow-up).
4. 5.1 MCR SHARED HELPER: buildManifestCorpusForGoal in chunkRetrieval.ts;
   #recommendations + HTML directives lead with manifest chunks
   (embedding-RAG -> fallback). NOT yet live-run on a generation.
   BONUS (audit gap #1): chatToFreeform artifact-engine calls now carry
   llm_model (was silently dropping Fable -> Sonnet default).

P1 queue unchanged (catalog snapshot, depth-aware theme context, citation
pre-validation, scheduled flywheel, Figma token sync). Audit follow-ups
worth pulling forward: dead #mindmap/#meta-themes dispatch, missing #refine
handler, #recs vs #recommendations engine fork.

## TRUNCATION FIX (2026-06-12 EVE, user screenshot feedback)

Root cause: render-time trunc() char budgets chopped mid-sentence with "..."
across the journey slide (pains, opportunities, cells, takeaway). Three-layer
fix shipped:
1. GENERATION (the real fix): SLIDE OUTPUT PROTOCOL global "FIT THE CANVAS"
   rule - per-field budgets are summarization targets, complete thoughts
   mandatory, quote FRAGMENTS in tight cells, no inline attributions in list
   items + journey-specific field budgets + "WRITE LIKE A HUMAN CONSULTANT"
   voice rules (plain SVO sentences, concrete nouns, varied openings).
2. RENDER GUARD: stage-twin trunc() rewritten clause-aware + ellipsis-free
   (finish sentence <=1.35x budget -> sentence boundary -> clause boundary ->
   word boundary, never "..."); covers EVERY stage template through the one
   function. Web-twin truncate() was already graceful - twins now match.
   Journey budgets raised to protocol+slack (pain 92, cell 115-125).
3. FIGMA/WIKI: no-truncation contract appended to the journey anatomy page
   (manifest-chunked); GOLD frames already model full-text cells.

Gates: tsc 0 errors, build OK, SPA rebuilt. NOT live-run: a fresh #journey
generation verifying the model writes to budget (next run; check no "..."
anywhere + geometry audit on export - pain budget raise may need the
full-mode fit re-checked).
