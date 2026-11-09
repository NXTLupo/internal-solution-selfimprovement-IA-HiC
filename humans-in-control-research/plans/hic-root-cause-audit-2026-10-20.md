# HiC root-cause audit: prompt interpretation, second brain, analysis, deliverable quality (2026-10-20)

Owner goal: "become an expert on HiC workflow, aspirations, hashtag deliverable planning / interpretation /
analysis from the user prompt, and identify all root-cause issues ... hardwired workflows, misinterpretations,
inaccurate and incomplete analyses, poor quality deliverables, and botched second brain wiki chunking and
retrieval from the analyst chat and lack of awareness of the chat model related to the themes extracted from
the corpora."

Method: the vision contract (`.claude/skills/hic-unified-vision/SKILL.md`, `UNIFIED_VISION.md`) and the 2026-09-30
audit were read first; three parallel read-only code audits (routing, second brain, deliverable quality) followed;
every load-bearing finding below was re-verified at file:line by the lead, and the three decisive ones were
measured on live session data and in a live Playwright run. "Verified" = re-read in code by the lead and, where
stated, measured live; "audit" = reported by the audit with file:line, not independently re-executed.

## 0. Verdict: five systemic causes, not fifty bugs

1. **Code interprets the request; the model never does.** Every decision before the model (template, skill,
   model, prompt blocks, length floors, coverage, grounding scope, attachment purpose) is a regex, a fixed table,
   or a first-match chain. The model receives the raw message only after the plan is fixed. (Section 1.)
2. **The chat model is fed the wrong evidence.** This engagement's own themes are displaced by cached themes from
   other engagements and then trimmed away; prior deliverable JSON is promoted to "authoritative source content";
   the Opus path, which every artifact uses, has no tools; derived synthesis is admitted as evidence. (Section 2.)
3. **The second brain mis-addresses its own chunks.** A one-character shift between chunker and resolver makes
   a large share of pages uncitable; vector-store chunk ids do not match manifest ids; key terms and concepts
   are frequency noise; retrieval on large catalogs ranks on page titles. (Section 3.)
4. **Analysis is bounded by construction and the gates mostly detect.** Breadth stops after two shards without
   novelty, depth sees 280-character snippets, uploads and web bodies are truncated below the advertised caps;
   most gates log, the repair pass degrades true claims, and several deterministic scrubbers rewrite meaning.
   (Section 4.)
5. **Three silent corruptions ship wrong output.** The quote-grounding normalizer is content-blind (blanks real
   quotes, keeps fabricated ones); the imagery pass and the claim chain race and erase each other's work; the
   em-dash sweep rewrites verbatim quotes before grounding. (Section 5.)

## 1. Prompt interpretation and routing (hard-wired decisions)

Verified by the lead at the cited lines unless marked audit.

- R1 **Attachment purpose was hard-wired.** Every chat attachment ran the PRD ledger extractor and was written into
  the engagement corpus regardless of the request (`CorpusChatPanel.tsx` ingestion block, `wikiService.ts:1249`,
  `:1277-1284`). FIXED 2026-10-20: `services/attachmentIntent.ts` (model decision, awaited before the send; see
  Section 6). Live: no ledger run on a `#slides` reformat.
- R2 **Prior deliverable JSON becomes authoritative content.** `CorpusChatPanel.tsx:7554-7565` appends the
  session's deliverable JSON (with `| Sources:`) to every query; `corpusChatService.ts:674-683` promotes any
  artifact-turn message over 300 chars containing `Sources:` to AUTHORITATIVE PASTE ("build the deliverable from
  this content, do not drop or renumber", `:2019-2035`). A `#journey` after `#personas` is built on the persona
  output as ground truth, ahead of the corpus. OPEN (P0).
- R3 **Any artifact hashtag means "generate".** `slideModeActive` is true for any template hashtag
  (`corpusChatService.ts:3995-3999`); SLIDE MODE forbids prose (`:4013`). "Why did the #gap matrix rate data
  maturity 2?" regenerates a gap matrix. OPEN.
- R4 **The clarification gate reads the chat message as a research objective.** `checkPackTrigger(query, ...)`
  (`CorpusChatPanel.tsx:5700`; `clarification.ts:286-305`) blocks any message naming an industry outside the
  selected packs ("what can we learn from retail loyalty programs" in a healthcare engagement); the deliverable
  trigger fires on everyday words and the user's answer is never merged with the original ask
  (`clarification.ts:318-342`, `CorpusChatPanel.tsx:5722`). OPEN.
- R5 **Modifiers and keyword scoring pick the wrong skill.** `#slides` is both modifier and directive; modifiers
  are skipped when extracting directives (`corpusChatService.ts:2366`) so keyword scoring loads a methodology
  skill from a word in the request ("#slides for the CIO audience" loads persona-architect). Unknown hashtags are
  silently prefix-promoted to a skill (`:2374-2386`; `#comp` becomes competitive-analyst). OPEN.
- R6 (audit) **Control hashtags anywhere in a message take the whole send** (`#help`, `#artifacts`, `#refine`,
  `#prototypes`, `#presentations`; `CorpusChatPanel.tsx:5837, 5954, 5989, 6731, 7136`), and the first HTML
  directive in catalog order wins, not the first in the message (`hashtagParser.ts:381-403`; "#report on the
  status of the #prd" runs the PRD pipeline).
- R7 (audit) **With several deliverable hashtags, skill, template, model and coverage each pick a different winner**
  (`corpusChatService.ts:2412-2419, 3151, 3995-3998, 630-639`; `artifactCatalog.ts:309-334`;
  `deliverableCoverage.ts:78-96`). Seven catalog owner skills are absent from `skill-manifest.json`, so those
  hashtags fall back to keyword guessing.
- R8 (audit) **Fixed shapes override the user's wording:** HTML word floors force a 150-word brief to 450
  (`CorpusChatPanel.tsx:6369-6370, 6519-6540`); `#approaches` always 6 cards; `#proto` always five briefs;
  persona-architect "minimum 4"; theme-analyst "at least 12"; coverage contracts append up to 24 themes and every
  feature area to any `#slides` deck (`deliverableCoverage.ts:55-75`; `CorpusChatPanel.tsx:4342-4426`). Live
  2026-10-20: a reformat of a 5-slide attachment came back as 20 slides, 9 of them corpus appendix. PARTLY FIXED:
  a content-source attachment decision now skips the deck coverage contract.
- R9 (audit) **`#strategy` deck mode is broken** (regex without word boundary, no template so no slide/deck mode,
  effort 'medium' and 32K cap for an xhigh kind; `corpusChatService.ts:3566, 4001, 4022, 3903-3907`).
- R10 (audit) **Regex compiles phrases into session-long constraints** ("without the interview quotes on slide 3"
  excludes interview sources for the session; `sessionConstraints.ts:100-122`).
- R11 (audit) **The research goal outweighs the current ask in retrieval and scoping** (prefetch angles from the
  goal, `corpusChatService.ts:3269-3283`; HTML evidence keyed on `${topic}. ${researchGoal}`,
  `CorpusChatPanel.tsx:6075-6112`; `#presentation` topic anchored to the FIRST user message,
  `narrativeComposer.ts:428-454`).

## 2. What the chat model is shown (theme awareness, evidence contamination)

- T1 **The run's own themes never reach an artifact turn.** VERIFIED LIVE on the Northeastern session: `state.json`
  holds 516 themes, 405 `source:'cached'` from other engagements (230 from an unrelated "2026 market data
  thematic synthesis" run), prepended by `mergeThemeSets` (`corpusMergeAuthority.ts:281`, `[...cached, ...fresh]`);
  the run's own 111 themes start at index 405. `shapeThemes` (`intelligenceShaping.ts:30-41`) emits name,
  description, ONE quote and source names (no pointer, no rank, no evidence count); cached entries have no quote
  and no sources. The 124K block is cut to 40K by `budgetGroundingSections` (`corpusChatService.ts:2120`): 67
  entries survive, 0 of them this engagement's. The run's own citations are `{sourceFile, text, url}` where
  `sourceFile` is a raw pointer, so even surviving entries show pointers the CORPUS block does not carry
  (audit #15). OPEN (P0): order own themes first, carry rank + evidence quotes + pointers, pin theme evidence
  chunks, and never trim the engagement's own themes before foreign ones.
- T2 **The Opus path has no tools.** `callClaude` (`corpusChatService.ts:5088-5215`) sends no `tools`; the system
  prompt instructs the model to call `fetch_wiki_articles`, `query_topic_clusters`, `query_knowledge_graph`
  (`:732, 3740-3742`). Every artifact hashtag routes to Opus 5.5, so every deliverable is written from what
  survived the prompt trim, with no way to fetch a theme's evidence or a named article. OPEN (P0).
- T3 **Derived synthesis is cited as evidence.** 485 manifest records and 633 chunk pointers across 50 artifact
  records cite `articles/hic-theme-synthesis/*`; at render the label is rewritten to "Engagement research
  synthesis" (`slideToStageHtml.ts:3332, 3345`). Deep-research model prose is ingested as `sourceType:'web'`
  (`researchFabricOrchestrator.ts:1082-1091`). OPEN (P0; prior audit B6).
- T4 (audit) **Theme pages are not linked to evidence and not admissible in chat**: 1,000 insight pages and 273
  synthesis pages are outside `EVIDENCE_ADMISSION_TYPES` (`chunkRetrieval.ts:489`) while the comment at
  `:1597-1600` claims otherwise; theme citations are stored as prose (`geminiService.ts:3272-3280`).
- T5 (audit) **Foreign themes leak into chat**: `gateForeignThemes` is asynchronous and fail-open
  (`themeRelevanceGate.ts:14-15, 169-171`); quote scoping runs only for `#prd` and coverage, never for chat
  `ctx.themes` (`App.tsx:514`).
- T6 (audit) **Gemini turns are untrimmed**: the budget trim covers only Anthropic (`corpusChatService.ts:2110`);
  Gemini turns carry the unbounded KNOWLEDGE GRAPH, the full THEMES block and 200K of uploads.

## 3. Second brain: chunking, manifest, retrieval

- S1 **One-character span shift makes pages uncitable.** VERIFIED on `articles/arxiv-cs-cl/d392895530.md`: body 637
  chars, only chunk spans (0, 638), resolver drops it (`wikiPointerResolver.ts` bounds check). Cause: the proxy
  chunker's `_strip_frontmatter` kept the blank line after the fence; the upsert and the resolver drop it
  (`wiki_chunker.py:43-53` vs `_FRONTMATTER_RE`). Audit measurement: 411 of 2,398 sampled article pages have
  zero resolvable chunks; 725 of 1,481 lose their last chunk; no-heading chunks lose their first character
  (`"Page 2]"`, `"ongratulations"`). FIXED 2026-10-20 at both ends: chunker strips like the resolver; resolver
  reads legacy shifted pages in its own coordinates (`spanShiftFor`). Existing pages heal on re-chunk; a
  backfill pass over the wiki is still needed to rewrite spans permanently.
- S2 (audit) **Vector-store chunk ids do not match manifest ids**: write-time embedding chunks raw content, the
  backfill chunks the extracted body, the manifest chunks the full page (`app.py:14002, 16920-16924, 13949`);
  150 of 514 sampled pages differ in chunk count, 122 in text. Embedding scores belong to different spans than
  the text resolved. OPEN (P0).
- S3 (audit) **Manifest is flat; key terms and concepts are frequency noise** (top key terms: like, comments,
  people, get, because, https; `wiki_chunker.py:291-327, 336-356`); 0 of 19,600 records carry key terms, so the
  600-chunk pre-rank falls back to page-title tokens and ignores both body text and embeddings
  (`chunkRetrieval.ts:815-848`). Goal tokens outweigh the question (`:805`). OPEN (P0; prior audit B2).
- S4 (audit) **MMR normalization and the protected tier flatten ranking**; a KL selection consumes the whole chat
  budget (`chunkRetrieval.ts:839-847, 1162-1163`); the 40% upload cap is a path regex (`:1145-1150`).
- S5 (audit) **Retrieval by name**: apostrophes parse as quoted document names ("What's the client's..." names
  "s the client" and injects any client-uploads page; `chunkRetrieval.ts:580`); `chunks-by-title` is unscoped
  across engagements; upload filenames are mangled by `encodeURIComponent` (`wikiService.ts:1381-1383`) and
  retitled by `_lift_internal_title` (`app.py:13760-13784`); re-upload in another engagement strips the first
  engagement's tag (`app.py:13636-13706`).
- S6 (audit) **Whole content types never reach chat**: transcripts and `ad-hoc-upload` are outside the admitted
  types; `/api/wiki/write` never embeds, so only 723 of 7,671 Reddit-deep pages are in the vector store; uploads
  are bulk-injected as the first 200K chars with no pointers.
- S7 (audit) **Provenance per chunk is thin**: Reddit comment chunks carry the original poster's author; uploads
  carry the bucket name "Client Uploads", kind `article`, and the ingestion date as `published`; no slide, page
  or speaker field.
- S8 (audit) **Embeddings**: the host outage is silent (`app.py:16657-16660, 17744-17747`); a slow host blocks the
  event loop (synchronous httpx inside async handlers, `:16186, 16651-16663`); the model's 384-piece limit never
  sees the last quarter of a 512-token chunk.

## 4. Analysis completeness and deliverable quality

- A1 (audit) **Breadth is bounded and stops early**: 10 shards x 30K tokens, exit when a 2-shard wave adds fewer
  than 3 new names (`geminiService.ts:2687-2692, 2748`); shard windows are not reranked; dedupe is exact
  lower-cased name, so cross-shard corroboration is discarded with its citations (`:2736-2739, 2836-2839`).
- A2 (audit) **Depth is snippet-only**: 30 citations x 280 chars (`:3047-3052`); relevance is scored on 250 chars
  with "when uncertain, score HIGHER" (`:1104-1131`).
- A3 VERIFIED **The breadth-floor retry reverses the evidence gate**: after a delta retry `withinDeliverableCap` is
  recomputed from relevance alone for all themes (`geminiService.ts:2133-2136`), restoring hedge-blocked themes.
- A4 (audit) **Bodies are truncated below the advertised caps**: web full text 10K (`app.py:10019`) vs the 30K
  constant; text uploads 200K (`:9862`) vs "in full"; social never enriched; relevance judged on 600 chars with a
  silent default of 50 (`researchFabricOrchestrator.ts:1422, 1575`).
- A5 (audit) **Most gates detect, not decide**: `deckPlanGate` re-asks on layout only with empty history;
  provenance is 'continue'; prose, deckQuality, renderPlan, coverageRecheck, scorer and chain-coverage alerts are
  log-only; `verifyAndAttachLedger` is not awaited so slides render and can export before verification
  (`CorpusChatPanel.tsx:7831`); the PRD ten-item rubric is never run.
- A6 (audit) **Repair degrades true claims**: "unsupported" means "no pointer in its own field"
  (`evidenceSlots.ts:315-324`); the repairer gets no evidence and must remove quantities and causality
  (`artifactRepair.ts:52-67`).
- A7 VERIFIED **Deterministic scrubbers rewrite meaning**: `stripNakedFigures` ("8% of members drive 60% of revenue"
  -> "Many members drive many revenue", `titleGate.ts:209-219`); `softenFigures` ("1-year" -> "multi-year",
  `deliverableCoverage.ts:460-501`); `replaceNakedNumbers` turns acceptance thresholds into "the stated threshold"
  (`deliverableRules.ts:193-207`); meta-narration deletion removes whole evidenced sentences ("Nothing changed in
  retention after the redesign", `slidePostProcessor.ts:467-484`); `stripQAAnnotationsDeep` collapses ellipses in
  verbatim quotes before provenance checks them (`:1171`; `artifactChain.ts:69-104`).
- A8 (audit) **Verification never removes unverified content**; a stat passes if its digits appear anywhere on the
  page (`citationVerifier.ts:231-236`); pointer binding attaches an address, not support (`pointerBinder.ts:190-221`).
- A9 (audit) **Budgets are enforced by cutting after generation**; the compress re-ask is dead code
  (`slideFieldBudgets.ts:53`); title gate 80 chars vs prompt 120.

## 5. Silent corruptions (all fixed or confirmed 2026-10-20)

- C1 VERIFIED, FIXED **Quote-grounding normalizer was content-blind.** `citationGrounding.ts:25-26` carried `[--−]`
  (the range U+002D..U+2212: every letter and digit -> "-") and `/.../g` (any three characters -> "..."): the
  dash and ellipsis characters in the classes had been replaced by ASCII at some point (present since the file's
  first commit abd397ca5). Real quotes were blanked and fabricated ones kept across themes, personas,
  recommendations, journey, gap, audit, competitive. Fixed with escapes; regression test added. Lesson: regex
  character classes must use `\uXXXX` escapes, never literal dash characters, anywhere the em-dash ban is applied.
- C2 VERIFIED **The em-dash sweep rewrites verbatim quotes before grounding** (`geminiService.ts:2928`, `—` ->
  "; " in every string). OPEN (small).
- C3 VERIFIED LIVE, FIXED **Imagery and the claim chain race.** Two concurrent pipelines after a deck parses
  (backfill -> coverage -> chain -> repair -> titles; and the imagery loop) each replaced whole slide objects
  from their own pre-image snapshot (`CorpusChatPanel.tsx` replacement sites at the chain, repair, backfill,
  fluid-edit and imagery writes). Live: two illustration calls succeeded, "[slides:img] panel image attached"
  logged, zero raster images in the DOM or the saved AIR; the repair finished 15 s after the images. Fixed with
  `services/slideRuntimeCarriers.ts` (carrier-preserving merge at every replacement; the imagery pass writes
  only its carriers onto the live slide).
- C4 VERIFIED LIVE, FIXED **The attachment decision timed out behind the blocked main thread** (two 46 s
  timeouts while the grounding build ran). The decision is now awaited before the heavy path (20 s, one attempt).

## 6. What shipped today (uncommitted, gates green)

- `services/attachmentIntent.ts` (+ test): the model decides an attachment's role / persistence / extraction
  from the user's message and hashtags; awaited before the send; a `content-source` decision skips the deck
  coverage contract.
- `services/slideRuntimeCarriers.ts` (+ test) wired into every slide replacement site in `CorpusChatPanel.tsx`.
- `services/citationGrounding.ts` normalizer repaired (+ test).
- `proxy/wiki_chunker.py` `_strip_frontmatter` aligned with the resolver (+ `proxy/tests/test_wiki_chunker_spans.py`);
  `services/wikiPointerResolver.ts` `spanShiftFor` / `shiftSpan` (+ test).
- Gates: tsc clean, 1,917 vitest, 0 orphans, generic-rules PASS; proxy and SPA rebuilt.

## 7. Remediation order (each item names the vision phase it advances)

P0 (the model's view of the evidence):
1. THEMES block: own themes first, ranked, with evidence quotes and pointers; pin theme evidence chunks into
   the pick; never trim own themes before foreign ones; apply quote scoping to chat themes. (Phases 4, 5)
2. Remove the AUTHORITATIVE PASTE promotion of session deliverable JSON; prior deliverables are context, never
   source content. (Phase 5)
3. Tools on the Claude path (`fetch_wiki_articles`, `query_topic_clusters`, `query_knowledge_graph`), or stop
   telling the model to call them. (Phase 5)
4. Exclude `insight` / `synthesis` and deep-research prose from evidence admission; mark non-citable. (Phases 2, 5)
5. Wiki backfill that re-chunks shifted pages; align vector-store chunking with the manifest chunker. (Phase 3)
P1 (interpretation):
6. Replace first-match hashtag dispatch with one model-interpreted request plan (deliverable, scope, counts,
   audience, length, brand, attachment role) that every downstream pass honors; the catalog supplies the
   vocabulary, the model supplies the reading. Collapse the eight regex tables into the catalog. (Phase 6)
7. Clarification gate reads the objective, not the chat message; merges the answer with the original ask.
P1 (analysis and gates):
8. Make provenance, claims and deckQuality decide; await verification before export; run the PRD rubric.
9. Retire meaning-changing scrubbers (figure stripping, number softening, sentence deletion) in favor of model
   repair with evidence in hand; keep deterministic scrubs to format-only.
10. Breadth: merge near-duplicate themes with their citations; depth on chunk bodies; remove the "score higher
    when uncertain" bias; keep the evidence gate across retries.

## 8. Live verification of the day's fixes (2026-10-20 17:21-17:32 UTC, same session, same test deck)

- Attachment decision: `(model) role=content-source persist=false extractLedger=false` 0.2 s after send (was a
  144 s timeout and fallback); one assistant line, the model's own note; no ledger extraction; one Opus call.
- Coverage: `[coverage] skipped: the attachment is the content for this deliverable (model decision)`; 12 slides,
  0 appendix (was 20 with 9 corpus appendix slides).
- Imagery: cover photo (continued behind the agenda), block-quote panel and the native infographic exhibit all
  present in the rendered DOM after the repair pass finished (was 0 raster images). Ledger 4 checked, 0 flagged.
- Still open, seen in the same run: means-matters stat slides lead with bare figures attributed to
  "(Source: gemini (focused research))" (deep-research prose admitted as web evidence, T3); the deck still mixes
  corpus market context into a reformat (DECK MODE mandates a fresh thesis + external citations regardless of the
  request, R8/R11; the model's content-source reading stops the padding but does not yet shape the generation
  prompt); the AIR record is persisted before the imagery pass, so it predates the images.

## 9. Implementation log (2026-10-20, "finish the plan")

P0.1 THEMES: `shapeThemesForChat` + `themeEvidencePointers` (`intelligenceShaping.ts`): own themes first, ranked, with
up to 3 evidence quotes and citable pointers (synthesis pages never citable); prior-engagement themes a capped
reference list; the budget trim cuts PRIOR-ENGAGEMENT THEMES first and own THEMES last (top 60K kept); theme
evidence chunks pinned into the pick (24 on artifact turns, 6 on chat). Designer desk uses the same shaper.
Tests: `themesForChat.test.ts`.
P0.2 Authoritative paste: `userAuthoredPart` strips the appended deliverable block before the paste test.
Tests: `authoritativePaste.test.ts`.
P0.3 Tools on Claude: `callClaude` carries fetch_wiki_articles / fetch_wiki_resource / query_knowledge_graph /
query_topic_clusters with an Anthropic tool loop (assistant turn echoed verbatim, tool_result turns; 3 iterations
on artifact turns, MAX_TOOL_ITER otherwise). The proxy stream collector already assembles tool_use input.
P0.4 Synthesis never evidence: pointer binder skips synthesis / insight pages; KL selection admission
`allow_synthesis=False`; deep-research prose written with `kind: 'synthesis'`; theme shaper labels synthesis
citations "not citable".
P0.5 Chunk addressing: write-time embed and the embed backfill chunk the same full page as the manifest chunker;
`/api/wiki/rechunk-shifted` re-chunks pages whose spans overshoot by one (dry run: 6,091 of 19,968 pages).
P1.6 Request plan: `services/requestPlan.ts` (Flash reading of mode / deliverable / scope / counts / audience /
length / brand / provided-content-only; deterministic fallback) awaited in `handleSend`; the REQUEST PLAN block
rides at the top of the grounding; a question about an artifact is answered in prose; `#help` / `#artifacts`
fire only when they are the ask; a user-limited scope or provided-content reading skips coverage padding.
Tests: `requestPlan.test.ts`.
P1.7 Clarification: pack trigger reads the engagement objective; the deliverable trigger is skipped when the
message carries a hashtag; an answer to the card is merged with the original request.
P1.8 Gates: the deck export waits for in-flight verification / repair chains (bounded 180 s). Still open: the
PRD ten-item rubric is not machine-run; provenance remains 'continue' (owner rule: repair or flag, never withhold).
P1.9 and P1.10: delegated edits in titleGate / deliverableCoverage / deliverableRules / slidePostProcessor /
prdRulesContract and geminiService / themeEvidenceGate / corpusMergeAuthority; see the gate results below.
P1.9 (delivered): `rewriteTitleWithoutFigures` / `rewriteWithheldTitles` (Flash rewrite with the slide's evidence,
deterministic strip only as fallback) wired at the panel's title step; `softenFigures` protects years, year ranges,
FY/Q and N-year terms, never softens sourced figures, and drops a measure of change instead of writing "by few";
acceptance-test given/when/then/threshold and signal targets are exempt from the number rule in both the
TypeScript contract and the Python workbook check (id tokens case-insensitive on both sides); evidenced sentences
and quote fields survive the meta-narration and ellipsis scrubs.
P1.10 (delivered): `mergeShardThemes` folds cross-shard twins (identity, then near-duplicate name) with their
citations and recounts sources; the relevance prompt calibrates uncertainty to 50 (no "score higher") and carries
the plan's sub-questions; the breadth-floor retry re-applies the evidence gate (`applyDeliverableCapWithGate`);
depth sees up to 1,200 chars per citation with its pointer, count-trimmed under 40K.
Wiki: `/api/wiki/rechunk-shifted` run live: scanned 19,968, rewritten 6,091, failures 0; the formerly uncitable page
now spans (0, 637). The forced vector re-embed (`/api/wiki/chunks-backfill?force=1`, hours, blocks a proxy worker)
is an operator step, not run here.
Gates on the finished tree: tsc clean; vitest 1,976 passed; orphans 0; generic-rules PASS; template parity PASS;
proxy compiles; `proxy/test_prd_xlsx.py` 15 passed.
Known remaining gaps (not in this pass): PRD ten-item rubric not machine-run; provenance stage stays 'continue'
(owner rule); the eight regex tables still exist beside the request plan (the plan now overrides them for mode,
control hashtags, counts/scope and brand, but the HTML word floors and `#proto` five briefs are unchanged); vector
store re-embed pending.

## 10. Reformat contract (owner report 2026-10-20, 970 s reformat with wiki fetches)

Live on the P0/P1 build: `create a #slides #NXT presentation from the attached deck content` read correctly as
content-source (no corpus write, no ledger), but the turn still carried the full research grounding (~760K chars),
DECK MODE still demanded a fresh thesis and a 40% external-citation share, and the newly enabled Opus tool loop let
the model call `fetch_wiki_articles`; three long Opus calls plus repair = 970 s. Fix: a provided-content-only plan
(the model's reading, or a content-source attachment decision) turns the turn into a REFORMAT contract:
`keepProvidedContentSections` keeps only the request plan, answer scope, brand, learned constraints and visual
system; the manifest pick is skipped; `callClaude` sends no tools and makes one call; `PROVIDED_CONTENT_CONTRACT`
tells the model the provided document is the complete source, to keep its claims and sequence, cite it by filename,
and that the source-mix / pointer-binding rules do not apply. Test: `providedContentOnly.test.ts`.

## 11. Live results after the reformat contract (2026-10-20 21:56-22:08 UTC)

- Same reformat request: 271 s (was 970 s); ONE Opus call, 539K chars (the 479K static prefix: protocol + deck
  block + skills; fresh input 17K tokens); no "Fetching evidence", no tool call; coverage skipped; 8 slides naming
  only the attachment's four initiatives (no Accenture / billable-hour corpus material); 4 slides cite
  "Source: Portfolio Narrative Test"; 3 slides carry imagery (cover, agenda, infographic).
- Remaining time sink found: 137 s in the wiki generation-context step before the Opus call; now gated off on
  provided-content turns. The 479K static prefix (prior audit A5: the 18-template protocol rides every call) is
  the next latency lever and is not addressed here.
- Prose reply: no "HiC Theme Synthesis" / "Client Uploads" labels, no em dash. Still seen and now scrubbed:
  "(Source: gemini (focused research))", "(Source: Synthesis of ... +10 more)", backtick-wrapped ids, the opener
  "is extensively documented across the research corpus. Below is a structured breakdown". Still open: bare figures
  in plain-chat prose (the number rule is enforced on artifacts, not on prose answers).

## 12. Reformat parity (owner report 2026-10-21: "AWFUL deliverable", corpus content, no information parity)

Facts (both decks extracted with python-pptx): the source `Current_Initiatives_Portfolio_Narrative 1.pptx` is 5
slides, 527 words, a cover naming four initiatives (Northeastern, Benefits Cortex / Plan Pulse, Estee Lauder / DECIEM,
Canon Financial Services) and one slide per initiative with OBJECTIVE / APPROACH / STATUS / BUSINESS VALUE and a
5.5 x 5.2 inch picture. The output `deck_2026-10-21_11_slides.pptx` is 11 slides about "hourly delivery shrinking",
"claims triage" and "dealer file errors", cites "Source: Portfolio Narrative Test" (the 5-slide TEST deck used by this
session's QA runs), and drops DECIEM entirely.

Root cause (proxy log 12:49-12:50 UTC): the attachment WAS parsed (5 slides, 5,184 chars) and inlined, the intent and
plan calls ran (content-source, onlyProvided=true), but the Opus call also carried the compacted conversation history:
three earlier reformats of the test deck in the same session (their slide titles survive compaction as "[Earlier
deliverable: N slides. Titles: ...]") plus a 40K-char history digest. Asked the identical sentence again, the model
reproduced the previous reply's deck. Secondary causes: no parity contract (the deck prompt asks for a narrative deck
composed from archetypes, so content is re-argued, not carried); no archetype carries a 110-word labeled one-pager
whole (numbered-themes bodies cap at ~140 chars; most archetypes carry 20-70 words); the source pictures were never
read; DECK MODE's variety and visual-floor rules push sibling source slides onto different, thinner archetypes.

Fixes (all shipped, gates green):
- Provided-content turns carry NO conversation history, no history digest, no prefetch, no deliverable block in the
  user turn (`providedContentOnly()` in `sendChatMessage`; the panel passes the plain query).
- `services/sourceParity.ts`: `parseSourceDeck` (slides, titles, labeled sections, entities, figures from the proxy's
  "[Slide N]" extraction), `parityPlanBlock` (one entry per source slide with the units to carry; rides in the
  provided-content grounding), `parityCheck` (title idea or half the sections, plus every named entity and figure),
  `parityRepairInstruction` (one re-ask listing the missing units), `parityFillFences` (a deterministic brief card
  per still-uncovered source slide, built from the source text). The reply opens with "Parity: X of N source slides
  carried". The deck-plan gate (variety / visual floor) yields on these turns.
- New archetype `slides:brief-card` (`slideComposer.ts`, catalog, image-slot registry, user-imagery slots): kicker,
  action title, subtitle, FOUR labeled blocks in a 2x2 grid (bodies up to 240 chars), and a 560 x 740 picture panel
  (`heroImage` variant). The parity plan maps every labeled-section source slide to one brief card.
- `/api/parse-upload` returns `slideImages` (downscaled JPEG data URIs per source slide, 2 per slide, 8 per deck);
  the panel maps each output slide to its best source slide and places that slide's picture (cover background, hero
  panel, or header scene). Live probe on the owner's deck: 5 slides, one picture on each of slides 2-5.
Tests: `sourceParity.test.ts`, `briefCard.compose.test.ts`; composer registry test updated to 29 archetypes.
Known limit: the composer's anti-slop pass still rewrites a banned metaphor inside client text ("front door" ->
"entry point"); on a reformat that is a wording change the owner may not want.

Live results (2026-10-21, owner's deck, same contaminated session):
- Run 1 (parity contract + brief card): 118 s, 5 of 5 source slides carried, zero contamination, DECIEM present; but
  the runtime imagery overwrote the placed source pictures, the claim chain flagged 4 of 4 client claims UNSOURCED and
  the repair rewrote 11 fields, the thesis panel invented "lacks a single core strategic focus", the parity line was
  invisible (deck replies drop prose outside fences), one kicker lost its number.
- Fixes: the imagery pass keeps a carrier the source supplied; no claim chain / repair on provided-content turns; the
  thesis is the source's own message (alternatives are still offered by the UI's thesis-options panel, not chosen);
  the parity receipt is an assistant chat line; kickers carry verbatim; the deck-composer skill gains section 0
  (reformat mode).
- Run 2: 86 s, one Opus call (519K chars, 479K static prefix); "Parity: 5 of 5 source slides carried"; 8 slides:
  cover, through-line interstitial, numbered-themes of the four initiatives, the three-step pattern as a flow arc,
  four brief cards with verbatim kickers ("02 BENEFITS CORTEX / PLAN PULSE") and all four labeled blocks; the source
  pictures (1536x1024) on each card and native in the exported PPTX; no verification ledger, no repair, no corpus
  terms. Exported-deck comparison: every title 100%, every section 100% except one at 80%, every entity present.
Open: the thesis-options panel still offers two alternative theses on a reformat (UI contract, not the deck); the
composer's banned-metaphor rewrite can alter a client phrase ("front door"); the 479K static prefix.

## 13. #slides archetype audit (2026-10-21): information density and visual coverage

Method: `services/archetypeDensity.audit.test.ts` walks every registered archetype spec and estimates text capacity
from region widths, type sizes and fit heights (words ~ chars / 6), and counts image regions, native visuals (bars,
matrix) and image variants. The image-slot registry decides which slides receive runtime imagery.

| archetype | words (est.) | image / visual before | after this pass |
|---|---|---|---|
| brief-card (new) | ~340 | - | picture panel 560x740 (source picture on a reformat) |
| infographic-exhibit | ~490 | native exhibit panel | unchanged |
| evidence-table | ~400 | none | header scene |
| prd-ledger / prd-trace / prd-signals / prd-story | ~350-500 | none | unchanged (workbook projections) |
| role-recommendation | ~310 | none | header scene |
| numbered-themes | ~290 | per-item thumbnails | unchanged |
| flow-arc | ~260 | none | header scene |
| role-needs | ~260 | portrait | unchanged |
| comparison-panels | ~260 | 3 icons | header scene |
| means-matters | ~215 | none | header scene |
| screen-critique | ~210 | screenshot | unchanged |
| ranked-bars | ~185 | native bars | header scene |
| stat-row | ~180 | none | header scene |
| org-model | ~170 | 3 icons | unchanged |
| quadrant | ~160 | native matrix | header scene |
| milestone-timeline | ~155 | none | header scene |
| block-quote | ~130 | scene panel | unchanged |
| problem-diptych | ~120 | none | full-bleed backdrop |
| role-roadmap | ~115 | none | header scene |
| screen-redesign | ~70 | 2 screenshots | unchanged |
| section-divider | ~55 | hero panel wired, branch none | emotive scene |
| cover | ~40 | full-bleed backdrop | unchanged |
| agenda | ~35 | cover backdrop continued | unchanged |
| scene | ~25 | illustration | unchanged |
| aggregate-roadmap | ~20 + matrix | native matrix | header scene |
| thesis-interstitial | one sentence | hero panel wired, branch none | emotive scene |

Findings: before this pass 13 of 29 archetypes carried no image or native visual at all, which is why an 8 to 12
slide deck showed one to three pictures; the thin archetypes (scene, agenda, cover, section-divider, aggregate-
roadmap, thesis-interstitial) are structural by design and the dense ones (evidence-table, infographic-exhibit,
brief-card, numbered-themes, role-recommendation) are where content belongs. The composer already supported a
header scene on every content-rail archetype (478x170, title row narrowed under it) and a full-bleed backdrop on
every dark archetype; neither was registered, so the imagery pass never filled them. Now every archetype has a
registered, wired image slot, and the imagery seam writes into composerPayload for every `slides:` template (it
used to write onto the slide root for unlisted ones, where the composer never looked).
Prefix on a reformat: the corpus roster, source breakdown, skill manifest, wiki menu, topic clusters and
methodology skills are omitted (the deck block carries the deck rules); measured in section 12's final run.

Run 3 (visual coverage + prefix cut + verbatim client wording): 105.7 s; one Opus call 330,648 chars, prefix
298,236 (was 519,113 / 479,581); 7 slides, 7 of 7 with imagery (4 source pictures on the brief cards, generated
cover / overview thumbnails / interstitial backdrop); full-size renders of every slide: no overflow, clipping,
overlap, empty block or missing label; the client's own "front door" is kept in body copy (the `_provided` marker
skips the composer's cliche rewrite). Residuals fixed after run 3: the overview's four thumbnails now take the four
source pictures (per-item match on kicker + title); no alternative theses are proposed on a reformat (the fallback
call that produced "require distinct operational models" is skipped); a thesis-interstitial is named by its thesis
instead of "Untitled Slide". Still open: generated scenes on cover / interstitial are generic for a reformat (the
source cover had no picture); the composer's cliche rewrite remains on for generated decks by design.
Run 4 (residual fixes, served from the proxy exact-match cache in 13 s because the prompt was byte-identical):
"Parity: 5 of 5 source slides carried"; brief cards 1536x1024 source pictures; the interstitial named by its thesis;
no thesis-alternatives panel on the reformat; full-size renders clean. One miss: the overview's four item pictures
stayed generated because the per-item mapping ran after a per-slide early return; moved ahead of it (run 5 below).
Run 5: "[parity] placed 8 source picture(s)"; the overview's four item pictures are the four source pictures
(1536x1024, each under its own initiative); brief cards keep theirs; full-size render of the overview: no clipping,
collisions or overflow. Final state of the reformat path: 5 of 5 source slides, zero corpus terms, 7 slides with
imagery on every slide (8 source pictures, generated cover and interstitial scenes), verbatim kickers and labels,
client wording preserved, no claim chain or repair on client text, thesis = the source's message.

### 13b. Rendered audit of every archetype (2026-10-21, closes the stop-hook item "no full rendered audit")

Method: `services/archetypeRender.audit.test.ts` renders all 29 archetypes (plus every image variant, 36 surfaces)
through `slideDataToStageHtml` from the composer suite's representative payloads (`SAMPLES`, now module-scoped in
`slideComposer.test.ts`, plus three payloads for screen-critique / screen-redesign / scene), then
`scratchpad/parity/render_audit.py` (Playwright in the research-proxy container, which carries the brand fonts)
screenshots each at 1920x1080 and measures text boxes off-canvas, text spilling its box, overlapping text boxes,
broken images and canvas usage. Fonts resolved on every surface: Saira Condensed, Archivo, IBM Plex Mono.

Defects found and fixed in `services/slideComposer.ts`:
- block-quote: the display-size opening mark descended to y236 while the quote began at y170; the first word
  rendered under the glyph (measured 68x66 px overlap). The quote now starts at y236.
- cover and agenda photo variants (and the generic full-bleed path for every dark archetype): the brand mark and
  dot-mark were painted first and buried under the photo and scrim, so photo covers shipped without the wordmark.
  `liftChromeAbovePhoto` moves the chrome above the regions as the dark set (white mark, no rail), painted once.
- evidence-table evidence cells, aggregate-roadmap matrix cells and milestone-timeline detail were caption size
  (18 px) inside rows that stretch to 170 px; raised to body size (21 px) with taller fit boxes (the fit routine
  still shrinks a long cell). This is the composer-side half of "information poor"; the other half is content
  (the parity contract in section 12 fills the cards with the source's own sentences).
Measured but not defects: numeral boxes that span their row (flow-arc, role-needs, role-recommendation,
screen-critique, means-matters figure captions, PRD header labels) register as box overlaps while the glyphs are
clear in the render; title boxes report a 61 vs 76 px line box at display size with no visible clipping.
Not fixed, by design: infographic-exhibit with an invalid exhibit image renders an empty panel above the band
(the live path always generates the exhibit; the sample carried a dummy data URI); thin archetypes (agenda,
role-roadmap, aggregate-roadmap with one word per cell) show dead space that is content-driven, not layout-driven.
Gates after the fixes: tsc clean; vitest 2087 passed, 1 skipped; template parity PASS; orphans 0; generic rules
PASS; check:skills 0 errors. research-generator rebuilt after the fixes with no live proxy traffic.
Re-run: `ARCHETYPE_RENDER_DIR=<dir> npx vitest run services/archetypeRender.audit.test.ts`, copy the directory
into the proxy container and run `render_audit.py <html dir> <out dir>`; read `defects.json` and the PNGs.
