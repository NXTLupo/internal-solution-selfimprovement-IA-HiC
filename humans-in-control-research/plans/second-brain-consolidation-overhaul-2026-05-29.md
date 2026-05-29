# HiC Second Brain + Self-Improvement — Consolidation & Repair Overhaul

> ## PROGRESS LOG (2026-05-29, live implementation)
> - **Phase 1 — DONE + validated.** `constraintQualityGate.ts` added; wired into all write/read points in `promptImprovementEngine.ts`, `learningEngine.applyConstraint`; discriminator dismissals now durable to `wiki/synthesis/dismissed-constraints.md`. `learned-constraints.md` purged 46→3 (compliant). Python agent hook hardened (unit-tested 5 bad rejected / 3 good kept). Production build passes.
> - **Phase 2 — DONE + validated.** `index.md` auto-regenerates in `compileWiki` (curated enumerated, raw corpus counted). Lint self-echo fixed (`checkBrokenLinks` now skips auto-generated synthesis sources → ~17,775 false broken links eliminated).
> - **Phase 3 core — DONE + validated live.** 20/20-query parity benchmark proved Tier-1 (`.vectors.db`) serves everything, Tier-2 never fires. Removed Tier-2 retrieval block + `_semantic_scores_for_query` + legacy dual-write in `proxy/app.py`; deleted `.embeddings.json` (34 MB). Proxy restarted clean; post-surgery benchmark 20/20 chunked.
> - **Phase 5 (partial) — DONE.** Deleted confirmed-orphan `queryFabric.ts` (553 lines) + `skillOptimizer.ts` (622 lines). Build passes.
> - **All snapshots** in `D:/tmp/hic-second-brain-backup-2026-05-29/`. **Nothing committed to git.**
>
> ### ⚠ Phase 4 design amendment (critical discovery)
> The chunk store `.vectors.db` keys every article by its `wikiPath`, and the fetch-articles
> response builder **skips any article whose file path no longer exists** (`proxy/app.py:8811`).
> Therefore **physically relocating `articles/` + `social-intelligence/` would break the validated
> retrieval** — every moved file's chunks become unreachable until the chunk store's `wiki_path`
> values are migrated (or the corpus re-embedded). Phase 4 is NOT a plain `mv`. Correct options:
>   (a) move files + `UPDATE` the chunk store's stored `wiki_path` (no re-embed — vectors stay valid); OR
>   (b) move files + full re-embed (cost + hours); OR
>   (c) logical reclassification only — leave paths, treat as raw tier in index/schema (Phase 2's
>       index regen already separates curated vs corpus sections, so the mental-model goal is largely met).
> Recommended: (a) via a migration script + post-move benchmark, or (c) if physical layout is not essential.

# HiC Second Brain + Self-Improvement — Consolidation & Repair Overhaul

> Author pass: 2026-05-29. Supersedes the *additive* `karpathy-second-brain-uplift.md` (2026-05-22)
> and folds in `hic-self-improvement-loop-plan.md`. Built on four evidence-backed code audits
> (wiki/retrieval, self-improvement loop, knowledge-graph/analyst-desk, second-brain/health-check),
> every load-bearing claim verified against the live code and workspace on 2026-05-29.

---

## 0. The honest verdict (read this first)

The originating assumption was: *"the second brain and self-improvement architecture is overly
complex and not functioning properly."* After auditing the code, that is **half right, and the
correct half matters more than the wrong half:**

- **NOT broken / do NOT rebuild.** HiC already has a faithful Karpathy second brain. There is a real
  46.5 KB schema doc (`hic-workspace/AGENTS.md`, self-declaring "This file IS the schema layer"),
  a clean raw -> wiki -> outputs separation at the top level, an append-only `wiki/log.md` memory
  (2,398 lines, written today), engagement recall that **actually fires** in generation
  (`wikiService.ts:1173` `loadEngagementMemory`, wired at `App.tsx:4209`, `geminiService.ts:3955`,
  `evidenceCatalogBuilder.ts:197`), and a lint+compile health pass that **runs on a 7-day cadence**
  (`wikiLintService.ts:881`, 45 lint runs logged; `wikiService.ts:1552` incremental compile, 13 runs
  logged). The skeleton is sound. Tearing it down would destroy working compounding infrastructure.

- **YES, overly complex — by accretion, not by design.** Around that sound skeleton sits a thick
  layer of redundancy: **three parallel retrieval pipelines**, **two coexisting embedding stores
  (235 MB total)**, **a 9,570-file "wiki" that is 99% raw RAG dump and 1% organized knowledge**, a
  **stale index that lies**, **two disconnected learning loops**, ~1,200 lines of **orphaned modules**,
  and a **self-improvement file that is now net-negative**.

- **A few things ARE genuinely broken / harmful — fix these regardless of the rest:**
  1. `learned-constraints.md` is **actively damaging every generation**: 21 of 46 constraints (46%)
     are duplicate "quantify the business impact in dollars" rules that **directly contradict the
     project's #1 Quantitative Claim Rule** in `.claude/CLAUDE.md` ("This rule overrides any older
     guidance that asked for 'quantify in dollars'"). Plus generic slop injected verbatim into the
     prompt: `"Add more details and clean up the output."`, `"Make the language free of jargon and AI
     slop"`, and the boilerplate `'"Updated Slide 12: layout" needs attention: 5 user edits detected'`.
     The learning loop is teaching the model to violate the master rule. **This is the single
     highest-leverage fix in the whole audit and it is cheap.**
  2. `wiki/index.md` claims "48 pages | 0 sources | Last updated 2026-04-10" against a 9,570-file
     reality. The schema's "read the index first" navigation contract is broken.
  3. The contradiction half of the health check is **disabled** (it produced 740,156 findings from a
     self-echo bug where lint reports re-scan themselves; `App.tsx:1751`). The curator / orphan /
     pattern-miner subagents are **manual-only** and ran once. The broken-link count (17,775) is ~99%
     self-inflicted; the real number is ~79.

**So the overhaul is CONSOLIDATION + REPAIR toward Karpathy simplicity, not a from-scratch rebuild.**
The thesis of the 2026-05-22 plan was "restart and automate the loops we designed." One week later the
loops restarted (lint runs now) but the simplification never happened and the constraint file rotted
from 2 stubs to 21 harmful duplicates. **This plan is the simplification pass that 05-22 deferred.**

---

## 1. The reference architecture (what "simple and effective" means here)

From the source transcript (`Build A Claude Knowledge Base That Self-Improves!`) and the three
Karpathy walkthroughs already analyzed in the 05-22 plan. The load-bearing ideas:

1. **AI as Maintainer, not Oracle.** RAG re-derives knowledge from raw chunks on every query and
   throws the work away. The second brain *compiles* understanding once and keeps it current. The
   next question starts from compiled knowledge, not raw chunks.
2. **3 folders + 1 file.** `raw/` (junk drawer, capture only, never organized) -> `wiki/`
   (AI-organized topic pages, human never hand-edits, `index.md` first then one file per topic,
   cross-linked) -> `outputs/` (AI answers/reports that **feed back in**). Plus a `CLAUDE.md` schema
   and a `change_log` that doubles as memory (what's processed vs new).
3. **No vector DB required.** Karpathy's ~100-article / 400k-word KB runs on the LLM reading an index
   and the files it needs. The index + topical file naming *is* the retrieval engine — **because the
   organized corpus is bounded and curated.** (HiC's corpus is 5,000 articles, so it *does* need
   semantic retrieval over the raw tier — but it should need exactly **one** mechanism, not three.)
4. **The compounding loop.** Ask -> save good answers back -> each answer makes the next better.
5. **Monthly 7-stage health check.** Contradictions, broken backlinks, source provenance, raw
   coverage, stale articles (>90d), undrawn connections, new-article candidates. Catches the failure
   mode where "the AI writes something slightly wrong, you save it, the next answer builds on the
   mistake."

The gap is not the schema (HiC's is richer than Karpathy's). The gap is that HiC **kept every RAG
mechanism it ever built** instead of collapsing onto the compiled-wiki model, and let the maintainer
loops accrete duplicates faster than they prune them.

---

## 2. Current-state map (verified 2026-05-29)

### 2.1 Retrieval — THREE pipelines + TWO stores where one of each belongs

| Pipeline | Path | Reads | Status |
|---|---|---|---|
| 1. Path-load ("framework context") | `wikiService.ts:1565` `loadGenerationContext` | fixed pages by code constant `OUTPUT_TO_FRAMEWORK` (`:1580`) | **live, every generation.** Not semantic, does **not** read `index.md` despite docs claiming "wiki-first semantic retrieval" |
| 2. Embedding two-tier ("evidence pack") | `notebookRetrieval.ts` -> proxy `/api/wiki/fetch-articles` (`app.py:8639`) | Tier 1 chunked `.vectors.db` (`:9516`); Tier 2 fallback over `.embeddings.json` (`:8715`) | **live.** The genuinely good NotebookLM-style path |
| 3. Graph-walk | `kgRetrieval.ts` tool `query_knowledge_graph` (`corpusChatService.ts:3335`) | in-memory KG with **keyword-overlap edges** | **chat only.** Lowest fidelity; duplicates pipeline 2 |

Plus `embeddingAlignmentScorer.ts` (4th cosine pass for theme rerank) and
`wikiIndexService.exploreConcepts`. **5+ ways to "get relevant wiki content," each with its own
scoring math.**

| Store | Size | Writer | Reader | Verdict |
|---|---|---|---|---|
| `.vectors.db` (sqlite-vec, 768-dim gemini) | 145 MB | `_embed_and_cache_article` chunk branch (`app.py:9292`) | Tier 1 (`:9516`) | **PRIMARY — keep** |
| `.embeddings.json` | 34 MB | same fn legacy branch (`:9282`) | Tier 2 fallback only (`:8729`) | **REDUNDANT — delete.** One vector/article (title + first 1,200 chars), covers a *different, smaller* set (3,291 vs 4,980) — fires stale partial corpus |
| `.vectors.db.openai1536-backup` | 56 MB | one-time migration backup | nothing | **stale backup — archive off-tree** |

### 2.2 Wiki — 99% raw dump, 1% compiled knowledge

- Raw RAG corpus living *inside* the organized layer: `articles/` (4,010) + `social-intelligence/`
  (4,661) = **8,671 of 9,570 files (91%)**.
- Genuinely organized/compiled pages (`frameworks` 12, `anti-patterns` 13, `benchmarks` 5, `brand`
  11, `synthesis` 33, `evidence` 3, `methodologies` 2) = **79 files**.
- `wiki/industries/` = **empty** (declared page type, never populated).
- There is **no AI-librarian compile of raw -> topic pages.** `wikiCompiler.ts` only regenerates
  synthesis pages from the evidence layer. Raw scraped files are embedded as-is, never distilled.
  This is the core Karpathy gap: HiC does raw-dump-then-embed, not compile.

### 2.3 Self-improvement — two disconnected loops + a net-negative output

- **Loop 1 (localStorage):** capture (`chatFeedbackExtractor.ts:192`) -> constraint
  (`promptImprovementEngine.ts:471`) -> persist `learned-constraints.md` -> inject
  `getActiveConstraints()` at `geminiService.ts:512/3941/5181`, `evidenceCatalogBuilder.ts:190`,
  `chatToFreeform.ts:714` -> boot reload `App.tsx:1673`. **CLOSED.**
- **Loop 2 (proxy JSONL):** `feedbackService.ts` -> `learningEngine.runLearningPass` (`:661`) ->
  writes the same file. **Re-enters generation only at next app boot.** Two halves joined by a file +
  a restart.
- **Loop 3 (discriminator):** `improvementDiscriminator.discriminate` (`chatToFreeform.ts:1093`)
  dismisses bad constraints — but writes localStorage, not the wiki, so **dismissals are undone at
  next boot** by `loadWikiConstraints`.
- **Quality:** no semantic dedup (exact-match only), no banned-phrase/contradiction gate on write.
  Result: 21 duplicate dollar constraints + generic slop, all injected raw into the SPA prompt.
- **Orphaned:** `skillOptimizer.ts` (620 lines, 0 importers) — a principled SkillOpt design with no
  call site, no scheduler.
- **Data is synthetic:** `wiki/feedback/` holds only `smoke-test`/`flash-test`/`ui-test` seeds
  (`fb_seed_*`). The loop has never run on real signal at volume.

### 2.4 Knowledge graph / analyst desk — good as analytics, redundant as retrieval

- KG is **both** display (Analyst Desk, `App.tsx:651`) **and** chat retrieval (`query_knowledge_graph`
  tool). The whole graph is *also* dumped as text into the chat system prompt (`corpusChatService.ts:1456`)
  — so it feeds the model twice.
- Edges are **keyword-overlap heuristics** (`knowledgeGraphBuilder.ts:261/353/456/553`), not
  semantic — the weakest of the three retrieval paths.
- Dead weight: 4 builder expansion fns (journey/feature/roadmap/gap) + `getNeighborhood` have no live
  caller; two parallel KG renderers (`AnalystDeskKnowledgeGraph` 2,255 lines +
  `ResearchKnowledgeGraph` 1,023 lines) behind a toggle.
- `knowledgeGapFinder.ts` spends 3-4 Gemini calls per run but its output only helps the **next**
  session (via `wiki/known-gaps/` -> `wikiService.ts:1526`), never the run that paid for it.

### 2.5 Health check — half-running

- **Runs automatically:** structural lint (7-day, `wikiLintService.ts:881`) + incremental compile
  (`wikiService.ts:1552`).
- **Disabled / manual:** contradiction scan off at startup (740k findings from self-echo,
  `App.tsx:1751`); curator/orphan-auditor/pattern-miner are `.claude/skills/*.md` invoked by a human,
  ran once (`synthesis/curator-log.md`: "first curator run"). 88-frontmatter / 103-orphan backlog
  unworked. Lint signal drowning at 840 findings/run, 17,775 broken links (~99% self-echo artifact).

### 2.6 Confirmed dead code (0 importers, verified)

- `services/queryFabric.ts` — 553 lines, 0 importers.
- `services/skillOptimizer.ts` — 620 lines, 0 importers.
- `knowledgeGraphBuilder` journey/feature/roadmap/gap fns + `getNeighborhood`.
- `ResearchKnowledgeGraph.tsx` (one of two renderers) — collapse to one.
- `sessions/_reproducibility-baselines` (1 stale file, no proxy writer); `_journey-html`
  (regenerable render cache).

---

## 3. Target architecture (the simplification)

```
ONE schema:        hic-workspace/AGENTS.md  (already correct — keep, co-evolve)
ONE memory:        hic-workspace/wiki/log.md (append-only — keep)
ONE live index:    hic-workspace/wiki/index.md  (AUTO-regenerated by the compile pass — repair)

THREE clean tiers (relocate, don't rebuild):
  raw/      = sources/ (client docs) + articles/ + social-intelligence/   [RAG corpus — immutable]
  wiki/     = frameworks, anti-patterns, benchmarks, brand, synthesis, evidence, COMPILED topic pages
  outputs/  = engagements/<slug>/*.json  (deliverables that feed back via engagement memory)

ONE retrieval mechanism:
  goal/query -> embed once -> chunked .vectors.db cosine -> passages.   (delete .embeddings.json + Tier 2)
  KG = analytics/visualization ONLY (no query_knowledge_graph tool, no graph text-dump in prompt)

ONE self-improvement loop:
  capture -> synthesize ONE constraint -> DEDUP + QUALITY GATE (banned-phrase + contradiction check
  against .claude/CLAUDE.md master rules) -> single deduped learned-constraints.md -> one injection
  point -> monthly compaction that retires contradictory/generic/stale constraints.

ONE health check (scheduled, not manual):
  lint (structural) + compile (synthesis + index regen) + contradiction (fixed self-echo) +
  constraint-compaction, all on the existing 7-day cadence, findings capped and deduped.
```

Net deletion target: **3 retrieval pipelines -> 1**, **2 embedding stores -> 1** (-90 MB live, -56 MB
backup off-tree), **~1,200+ lines orphaned code removed**, **9,570 wiki files -> <1,000 meaningful
pages** (raw corpus relocated, not deleted), **46 constraints -> a deduped handful that obey the
master rule.**

---

## 4. Phased plan (sequenced by leverage / risk)

Each phase is independently shippable. Phases 1-2 are cheap, high-leverage, low-risk — do them first
even if the rest waits. Per project rules: build -> test (render, not just HTTP 200) -> stage ->
await user approval before commit; rebuild `research-generator` Docker image after any frontend edit.

### Phase 0 — Safety net (before touching anything)
- Snapshot `learned-constraints.md`, `index.md`, `.embeddings.json`, and the two `.vectors.db` to an
  off-tree archive so every deletion is reversible.
- Confirm `.vectors.db` is the live store and `.embeddings.json` only serves the fallback (re-run the
  Tier-1/Tier-2 guard check at `app.py:8715`) so deletion is provably safe.

### Phase 1 — Stop the bleeding: repair the self-improvement output (HIGHEST leverage, ~half day)
1. **Purge + rewrite `learned-constraints.md`.** Remove all 21 dollar-quantify duplicates (they
   violate the master Quantitative Claim Rule) and the 3 generic-slop entries. Keep only the
   substantively-correct, deduped rules (e.g. the persona-verbatim-quote rule — once).
2. **Add a write-time quality gate** in the constraint-synthesis path (`promptImprovementEngine.ts`
   `logChatFeedback`/`exportConstraintsToWiki` + `learningEngine.generatePayload`): before persisting,
   (a) semantic-dedup against existing constraints (not exact-match), (b) reject any constraint that
   contradicts `.claude/CLAUDE.md` master rules (run it through the banned-phrase + Quantitative-Claim
   check), (c) reject generic stubs below a specificity bar. Reuse the dedup logic that already exists
   in `inject_active_constraints_and_patterns.py:56` — promote it from the agent hook into the SPA
   write path so the SPA stops injecting the raw file.
3. **Make discriminator dismissals durable** — write dismissals to the wiki, not just localStorage,
   so `loadWikiConstraints` can't resurrect them at boot.
- **Test:** generate one deck + one persona set; diff against a pre-fix run; confirm no dollar-figure
  titles/KPIs and no "add more details" artifacts; confirm the gate rejects a planted bad constraint.

### Phase 2 — Repair the index + health check (cheap, ~half day)
1. **Auto-regenerate `index.md` inside the compile pass** (`wikiService.ts` compile / `wikiCompiler.ts`):
   real page count, real source count, real timestamp, grouped by tier. The "read index first"
   contract starts telling the truth.
2. **Fix the lint self-echo bug**: exclude `synthesis/lint-*.md` from the link scan so the broken-link
   count drops from 17,775 to the real ~79. Fix the citation-tuple serializer that emits
   `[[2013, 4, 17]]` instead of `(2013, 4, 17)` (flagged in `curator-log.md`).
3. **Re-enable contradiction scan** now that the 740k self-echo is gone — but cap findings and run it
   inside the scheduled health pass, not on page load.
4. **Work the curator backlog once** (88 frontmatter, ~79 real broken links, 103 orphans — 80 are
   `sources/` summaries that just need backlinking from `index.md`).

### Phase 3 — Collapse retrieval to one mechanism (~2-3 days)
1. **Delete `.embeddings.json` + the entire Tier-2 fallback** (`app.py:8715-8773`,
   `_semantic_scores_for_query`, `_save_embeddings`, the dual-write legacy branch at `:9282`). One
   store, one tier. If chunk store is empty, fail loud, don't silently serve a stale partial corpus.
2. **Retire the graph-walk retrieval path**: remove the `query_knowledge_graph` tool
   (`corpusChatService.ts:3335`, dispatches `:3728/:3887/:4125`) and the full-graph text dump
   (`:1456`). Chat keeps exactly the embedding retrieval (`fetch_wiki_articles`) + path fetch
   (`fetch_wiki_resource`). **KG stays as analytics/display only** (its real strength).
3. **Delete `queryFabric.ts`** (orphan, 553 lines).
4. Keep `embeddingAlignmentScorer` (cheap, useful theme rerank) and the boot-time dim-mismatch
   validator (`app.py:9451` — good ops hygiene).
- **Test:** run full pipeline on the cached co-op engagement corpus; confirm evidence packs are
  equal-or-better vs pre-change (same-or-higher external-source ratio, no empty-result regressions).

### Phase 4 — Restore the raw/wiki separation + add the missing librarian compile (~3-4 days)
1. **Relocate** `wiki/articles/` and `wiki/social-intelligence/` under a `raw/` (or
   `sources/research/`) tier. They are RAG corpus, not compiled knowledge. Update the embed/ingest
   paths and `AGENTS.md` to match. The "wiki" drops from 9,570 to <1,000 meaningful pages; the mental
   model becomes Karpathy-clean again. **No data deleted — relocated.**
2. **Add the AI-librarian compile** (the actual Karpathy gap): a GENERATE-style pass that distills
   clusters of raw sources into curated, cross-linked topic pages in `wiki/`, with `index.md` updated
   and `log.md` appended. This is what makes the next question "start from compiled understanding
   instead of raw chunks." Drive it off the existing BERTopic clusters (`_topic-cache`) so it reuses
   work already done. Throttle it like the existing incremental compile.
3. Populate or delete `wiki/industries/`.

### Phase 5 — Consolidate self-improvement + knowledge-graph code (~2-3 days)
1. **Collapse `learningEngine` to one target.** Today it routes clusters to 5 targets (skill-patch,
   framework-page, anti-pattern, exemplar, chunk-config); only `constraint` re-enters generation.
   Collapse to: cluster -> synthesize ONE constraint -> quality gate (Phase 1) -> single file. Fold
   the duplicated regex banks (`feedbackService.ts:59` == `learningEngine.ts:29`) into one module.
2. **Reconcile the two thresholds** (5-edit localStorage vs 3-cluster proxy) into one.
3. **Delete `skillOptimizer.ts`** (orphan, 620 lines) OR gate it behind an explicit offline `/loop`
   command with the validation gate wired — do not leave it dangling.
4. **KG cleanup:** delete the 4 dead builder fns + `getNeighborhood`, collapse to one renderer
   (`AnalystDeskKnowledgeGraph`), drop unused node types.
5. **Decide `knowledgeGapFinder`'s fate:** either make it feed the **current** run (worth the LLM
   spend) or demote to a cheap display-only check. As-is it pays for next-session-only benefit.

### Phase 6 — Make the health check fully autonomous (~1-2 days)
- Wire the curator/orphan/contradiction/constraint-compaction into the scheduled 7-day pass (or a
  `/loop` cron) so the deep clean stops being manual. Each check returns
  `{check, status, findings[]}`, findings capped and deduped, report appended to `log.md` and
  surfaced in the UI. Retire `_reproducibility-baselines` + `_journey-html` or document them as
  ephemeral.

---

## 5. What we deliberately KEEP (do not "simplify" these)

- `AGENTS.md` schema, `wiki/log.md` memory — already Karpathy-correct.
- `.vectors.db` chunked store + `notebookRetrieval` -> `/api/wiki/fetch-articles` — the one good
  retrieval path.
- `loadEngagementMemory` + `findPriorEngagementMatches` — the compounding loop, verified firing.
- `_embedding-cache` / `_topic-cache` / `_name-cache` — the determinism + multi-model-resilience
  substrate (load-bearing per the standing rules).
- Scheduled lint + incremental compile — keep, extend.
- KG as analytics/visualization — its defensible role.
- The single localStorage capture->constraint->inject loop — keep, gate it.

---

## 6. Risks & guardrails

- **Quality-first standing rule:** every quantity floor (theme yield, evidence density) must be met by
  upstream quality, never by relaxing a gate. The Phase-3 retrieval collapse must be benchmarked to
  prove equal-or-better evidence packs before `.embeddings.json` is deleted.
- **Determinism standing rule:** same cached corpus + same goal -> same deliverable identity. Retrieval
  changes must preserve `reproducibility_hash` stability on the cached engagement.
- **Cross-service contract:** the JM universal renderer and proxy paths read the wiki; relocating
  `articles/`/`social-intelligence/` must update every reader (grep the proxy + JM render path) before
  cutover.
- **Reversibility:** Phase 0 archive + relocate-not-delete means every step rolls back.
- **No commit without approval; rebuild Docker after frontend edits; test render not just HTTP 200.**

---

## 7. Sequencing summary

| Phase | Theme | Effort | Risk | Ship independently? |
|---|---|---|---|---|
| 0 | Safety net | ~1h | none | n/a |
| 1 | Fix net-negative constraints + quality gate | ~0.5d | low | **yes — do first** |
| 2 | Repair index + health-check self-echo | ~0.5d | low | **yes** |
| 3 | Collapse 3 retrieval paths -> 1, delete redundant store | 2-3d | med | yes (after benchmark) |
| 4 | Restore raw/wiki separation + librarian compile | 3-4d | med | yes |
| 5 | Consolidate self-improvement + KG code | 2-3d | low-med | yes |
| 6 | Autonomous health check | 1-2d | low | yes |

**If only one thing ships: Phase 1.** It removes active harm from every generation for half a day of
work. **If only two: Phase 1 + Phase 2.** Everything after that is simplification that pays off in
maintainability and speed but is not removing active harm.
