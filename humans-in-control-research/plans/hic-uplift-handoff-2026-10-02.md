# HiC uplift handoff (2026-10-02, end of session fdaba13b)

Successor: read this file first, then `plans/deliverable-rules-and-coverage-all-hashtags-2026-10-02.md`
(the spec) and `plans/deciem-brand-mode-2026-10-01.md`. Memory pointers:
`feedback_uploads_always_thoroughly_analyzed_2026_10_02.md`, `feedback_no_blockers_on_output_requests_2026_10_01.md`,
`feedback_prd_partner_grade_standard_2026_10_01.md`, `project_deciem_brand_mode_2026_10_01.md`.

## 0. Status after session 945d83e2 (2026-10-02 evening): steps 1-7 executed

| Step | State | Evidence |
|---|---|---|
| 1 Bring the platform up | done | images rebuilt four times; proxy healthy; openpyxl 3.1.5; SPA smoke 0 console errors once the stopped embedding backend was started (A13) |
| 2 Repair manifest pages | done | 8 pages reindexed; `upload-pages` lists all Northeastern uploads with true chunk counts (62/54/53/62 for the SOWs) |
| 3 The three PowerPoints | done | attached in the analyst chat from the owner's Downloads folder; "Analyzed 3 chat attachments: 141 feature and feedback items"; 13 uploads listed; ledger 1,017 items, every document read in full (276 chunks) |
| 4 Live Northeastern #prd | done twice (2,657 and 2,718 requirements, 100% of 915 ledger items and 596 board themes covered, export checks pass); READ against the rubric and by `hic-output-qa`: FAIL on trace, tiers, signals, why-now. Every code-level cause found is fixed (sections 4b-4e); a third live run verifies the fixes | sections 4b-4e |
| 5 Contracts for every other hashtag | done in code and verified live on #personas #journey #slides, #slides #deciem, #report #deciem (coverage receipts in the replies, export re-check on PPTX) | `deliverableCoverage.ts`, `coverageRecheck.ts`, 63+ tests, `check:deliverable-rules`, `check:generic-rules` |
| 6 Open items | done: foreign synthesis quotes (A7, 324 quotes from 27 pages dropped live); `check:orphans` 0; DECIEM live smoke (deck branding correct; report blank-page defect R4 fixed) | |
| 7 Close out | plans and memory updated; tsc 0; vitest 1,829; pytest 15; check:orphans 0; check:skills 0 errors (repointed the export-paint-sync skill off the deleted exportService.ts); check:content still flags banned words inside AIR records SHIPPED by today's live runs (data, not code; the universal scrub now replaces that vocabulary); NOT committed (owner approval required) | |

## 1. What we are trying to achieve

The owner's goal: every HiC deliverable is consulting grade and comprehensive. Every uploaded document is
read in full, every stated feature, piece of feedback, and board theme is accounted for, and those rules are
enforced by code (not prompts) for every project and every hashtag. Binding owner directives (verbatim
where quoted):

- `#prd` produces a structured requirements WORKBOOK (.xlsx), not an HTML page. Bar: McKinsey / Bain /
  top software firm.
- "there should be requirements documented against every articulated feature and piece of feedback".
- "all captured themes in the Research Assembly Board are ALSO ALL reflected in requirements".
- "Document uploads, whether in the beginning of a research project or in the analyst chat SHOULD ALWAYS
  BE THOROUGHLY ANALYZED".
- "NO BLOCKERS WHEN THE USER ASKS FOR AN OUTPUT": synthesize missing prerequisites (personas, journey, gaps)
  in the same run; gates repair or flag, never withhold.
- "these rules must be deterministically enforced and generalized for ANY RESEARCH PROJECT".
- "these rules should also be enforced with ALL other hashtag outputs, not just PRD".
- `#deciem` brand mode on any hashtag (done; see the DECIEM plan).

## 2. Where we are

### Done in code (all UNCOMMITTED; staged + unstaged on branch `hic-clarification-and-ledger-2026-08-26`)

- Root cause of the thin Northeastern PRD (22 requirements, no upload content) found. It was NOT the
  manifest. Causes: the picker rejected .pptx; uploads were similarity-sampled (16 of 258 chunks reached the
  compiler); the compiler only accepted pain/gap roots; one model call wrote the whole PRD; other
  engagements' theme synthesis leaked in; chat attachments were never ingested.
- Ingestion: `wikiService.ingestUploadedDocuments()` is the single path for research-start and chat
  uploads. Accepts .pptx/.ppt/.xlsx/.xls (`ACCEPTED_EXTS` in `components/ChatAttachmentDropzone.tsx`, reused
  by `FileUpload.tsx`). `proxy/evidence_hygiene.py` handles mojibake repair, docx/xlsx readers, duplicate
  collapse, and synthesis-owner scoping.
- Engagement ledger: `services/engagementLedger.ts` (STATED SF-n, FEEDBACK FB-n, THEME groups TH-n; read
  in full; persisted at `engagements/<slug>/ledger.json`). `services/prdScopeLedger.ts` re-exports it.
- Rule engine: `services/deliverableRules.ts` (universal rules + coverage-contract interface) and the PRD
  contract in `services/prdRulesContract.ts`. In-path order: generate, universal rules, coverage, targeted
  gap-fill, deterministic fill, receipt. Never refuses.
- PRD compile: `prdCompiler.compilePrdFromLedger` (per feature area, batches of 25, 6 parallel). The
  pain/gap-only root rule is deleted. Evidence budget is 120 x 900 chars with uploads first.
- Export: `proxy/prd_xlsx.py` via `POST /api/prd/export-xlsx` (15+ sheets incl. Coverage Ledger, Themes,
  Checks; `X-Prd-Checks` header = independent re-check). `components/PrdWorkbookCard.tsx` in chat.
- `#prd` no-blocker: `services/prdRootSynthesis.ts` builds full personas / journey / gap matrix in-run.
  Deck fixes: no blank slides, no collisions, 12 pt floor, `titleGate.stripNakedFigures` repairs instead of
  dropping.
- DECIEM brand mode: complete in code (tokens, fonts measured, art rotation, imagery, template-based PPTX).
- Proxy endpoints added: `/api/wiki/repair-mojibake`, `/api/manifest/reindex-pages`,
  `GET /api/engagement/upload-pages`, `/api/design-assets/deciem/*`.

### Verified offline

- tsc 0 errors; vitest 155 files / 1,773 tests pass; `test_prd_xlsx` 14 pass; ingestion 40 pytest + 26
  vitest pass; `npm run check:prd-rules` (in `check:all`) passes.
- Live ledger extraction over 10 Northeastern documents: 759 items. Includes the SOW deliverables, the 8
  readiness buckets + 32 sub-items, Chris Boland's notes, and the prototype feedback (FB-15..19, FB-20, FB-38).
- Two-industry fixtures reach 100% coverage: synthetic hospital (88 requirements), university (1,731
  requirements; 649/649 scope items; 595/595 themes).

### NOT done / unknown

- **The rebuild did NOT land.** Images `research-generator` / `research-proxy` date from 2026-10-02 05:53
  PDT, i.e. before the uplift code. Both containers `hic-research` and `research-proxy` are EXITED (255) since
  2026-10-03 00:03 UTC (Docker engine stop). Nothing in sections above is live yet.
- Nothing has been verified live after the ledger / rule-engine work.
- No contracts yet for hashtags other than `#prd`.
- `check:orphans` was already failing before this work (74 orphan exports repo-wide).

## 3. Git state (read before touching the index)

- Staged: 555 files (~77.5K+ / 55.7K-), including 68 deletions (`.claude/agents/*-deliverable-auditor.md`,
  hook scripts, old skill versions). Unstaged: 232 more files. All of it awaits owner approval.
- A helper agent once ran `git stash` + `pop`, which wiped the staging. It was restored with
  `git read-tree 2f29698c3dad6d1e8badf17ef6f0b1071122b034`. A backup of the index tree taken just before:
  `744bda0396a064c86ae4f1948ace98edbfbc1833`.
- **Tell every helper agent: never `git stash`, `git checkout --`, `git reset`, or commit.**
- Never commit without the owner's explicit approval; never merge to main; never push to the NXT-Humans
  origin (only the selfimprovement remote, and only when asked).

## 4. Remaining work, in order

### Step 1. Bring the platform up with the new code
1. Confirm nobody is mid-run: `docker compose -f docker-compose-all.yml logs --since 10m research-proxy`
   should show no `POST /api/ai` or `/api/jobs` traffic. (Containers are currently stopped, so this is a
   formality, but check if they have been restarted.)
2. `docker compose -f docker-compose-all.yml up -d --build research-proxy research-generator`
   (run in background; ~5-10 min). Confirm with `docker images` that both images are newer than this file.
3. Proxy health: `curl -s localhost:5012/health`. Check `openpyxl` imported:
   `docker compose -f docker-compose-all.yml exec research-proxy python -c "import openpyxl"`.
4. Smoke-load http://localhost:5011 with Playwright (agent `spa-smoke-tester`): 0 console errors, 0
   failed requests. HTTP 200 is not proof.

### Step 2. Repair mis-recorded manifest pages
`POST /api/manifest/reindex-pages` with the 4 SOW client-upload pages, `synthesis/enhancement-plan.md`,
`synthesis/generation-failures.md`, `articles/hic-theme-synthesis/12982218ca.md`, and
`articles/hic-theme-synthesis/d64c43d1a7.md`. Read the endpoint in `proxy/app.py` for the body shape. Then
`GET /api/engagement/upload-pages?slug=<northeastern slug>` and confirm all 12 uploads are listed with
correct chunk counts.

### Step 3. Get the 3 PowerPoints in
Vision-Project.pptx, NU_ExpHub_People_and_Sessions 9-25 v1.pptx, NU_ExpHub_People_and_Sessions.pptx were
rejected by the old picker. They live on the owner's machine. Ask the owner to attach them in the
Northeastern session's analyst chat (now accepted). Confirm the `hic:upload-analysis` chat line and that the
ledger grew (`engagements/<slug>/ledger.json`).

### Step 4. Live Northeastern `#prd`, verified item by item
Run `#prd` in the Northeastern session (expect 20-40 min, 1,000+ requirements). Pass bar:
- console shows `[#prd] scope and feedback ledger: ...`;
- chat shows the receipt and lists by name any item that needed a deterministic fill;
- workbook downloads; sheets Coverage Ledger, Themes, Checks exist; `X-Prd-Checks` = pass;
- every ledger item and every board theme maps to >= 1 requirement. Specifically spot-check the
  prototype walkthrough feedback (FB-15..20, FB-38), the 8 readiness buckets, every SOW deliverable, and
  Chris Boland's notes;
- READ the workbook against the ten-item PRD rubric (`hic-workspace/wiki/eval/rubrics/prd-rubric.json`).
  "It rendered" is not verification. Then run `hic-output-qa` as the external check.
- also re-run the persona + journey deck and export PPTX: 0 blank slides, 0 overlaps, no slop.

### Step 5. Coverage contracts for every other hashtag (Stage 2)
Implement one contract per row of the table in `plans/deliverable-rules-and-coverage-all-hashtags-2026-10-02.md`
on `services/deliverableRules.ts`, following the "how to add a contract" doc at the top of that file and the
PRD contract as the pattern. Order by owner value: #personas, #journey, #recs, #strategy/#slides/#presentation,
#report family, #gap, #competitive, #roadmap, #blueprint, #themes, then the rest. For each:
wire it into that hashtag's generation path in `CorpusChatPanel.tsx` / `corpusChatService.ts`, add a
receipt in chat, add an export-time re-check where an export exists, and add two-industry fixtures. Add
`npm run check:deliverable-rules` to `check:all` and a grep gate against engagement-specific literals in
non-test code. "Comprehensive" allows merging items into one unit that cites them all; it never allows an
item to be unaccounted for.

### Step 6. Open items
- Board theme quotes can point at other engagements' synthesis pages: wire `applyEvidenceHygiene`
  (`services/chunkRetrieval.ts`) into the PRD engagement-scope rule.
- Reconcile `check:orphans` (74 orphans; wire or delete, do not suppress).
- DECIEM live smoke (`#slides #deciem`, `#personas #deciem`, `#report #deciem`, open the exported PPTX).

### Step 7. Close out
Update the status tables in both plan files, update memory, run tsc + vitest + `check:all`, report to the
owner with evidence (counts, screenshots, workbook sheet list), and ask for commit approval. Do not commit
before that.

## 4b. Issues found in the 2026-10-02 expert audit (session 945d83e2), all fixed in code

Found by reading the ledger, rule engine, compiler, proxy routes and chat paths end to end, then confirmed by a
test or a live probe. Each is fixed; the test that pins it is named.

| # | Issue (root cause) | Fix | Pinned by |
|---|---|---|---|
| A1 | A failed or empty ledger extraction call still counted its chunks as read (`readByDoc` was filled from the PLAN, before any call ran), so "every document read in full" passed on documents nobody read; no retry. | Chunks count only for calls whose reply parses; one retry; a failed part marks the document `incomplete` and it is re-analyzed next run. Extractor version bumped (no ledger had been persisted yet, so nothing is lost). | `engagementLedger.test.ts` "a failed extraction is never counted as read" |
| A2 | `writeLedgerDocuments` treated an unreadable ledger file (network error, 5xx, corrupt JSON) as "no ledger" and wrote WITHOUT the sha precondition, overwriting every other document's analysis. | `readLedgerFile` distinguishes missing (404 / not exists) from unreadable; the writer aborts on unreadable. | "an unreadable ledger file is never overwritten" |
| A3 | `assignAreas` kept word surface forms in a MODULE-LEVEL map, so one project's wording picked another project's area labels in the same browser session (non-deterministic, cross-engagement). | Map reset per call. | existing area determinism tests |
| A4 | Ledger dedupe stop list contained "students student" (an industry literal in generic code); `prd_xlsx.py` stop list had the same. Feedback dedupe merged items with opposite dispositions ("remove X" vs "change X"). | Literals removed; feedback merges require equal disposition. | "feedback items with opposite dispositions are not merged"; `check:generic-rules` |
| A5 | `/api/engagement/upload-pages` used the substring fallback of `_engagement_matches`: a short slug matched other clients' uploads (`?engagement=x` listed 368 pages from every engagement) and a tagged upload could match by title. | `_upload_engagement_matches`: a tagged record must match a tag; untagged records match by path/title only for slugs of 24+ characters. | live probe after rebuild |
| A6 | The same route's frontmatter-scan fallback counted chunks in the first 4KB only (a 62-chunk SOW page reported 10). | Reads the whole frontmatter. | live probe (Step 2 output) |
| A7 | Board theme quotes pointing at OTHER engagements' synthesis pages (handoff Step 6 open item). | New `POST /api/engagement/page-owners` (owner resolved by `evidence_hygiene.synthesis_engagement`); `scopeThemeQuotesToEngagement` drops foreign quotes (themes kept) before any deliverable reads them; the universal `engagement-scope` rule also drops quotes on `ledgerStats.foreignPages`. Wired into `#prd` and every coverage contract. | `deliverableCoverage.test.ts` "scopes theme quotes" |
| A8 | `removeDeleteSafeFiller` (documented idempotent, runs on every generated text) collapsed punctuation pairwise, so "..." became ".." then "."; every ellipsis lost a dot per pass and the writing-scrub rule could never settle. | Runs of punctuation keep their last mark, an ellipsis is kept whole. | coverage contract tests (writing-scrub passes on truncated fills) |
| A9 | The workbook's independent export check did not re-check the number rule. | `naked_numbers` (Python twin of `nakedNumbers`) over requirement and acceptance-test text; new Checks row. | `prdRules.generality.test.ts` (Python checks all pass) |
| A10 | No hashtag other than `#prd` read the ledger or the board themes: coverage was unenforced for every other deliverable (the Step 5 gap itself). | `services/deliverableCoverage.ts` + `services/coverageRecheck.ts`, wired in-path (see Step 5 status below). | 63 tests in `check:deliverable-rules` |
| A11 | `check:orphans` failed (60 at audit time): 22 symbols exported but only used in their own file, 4 dead functions, 1 test-only helper the UI never used, 32 test seams counted as dead code. | 22 un-exported; `brandFromTags`, `PRIORITY_LABEL`, `debugArtFeasibility`, `artSafeBox` (+ its `STAGE_CONTENT_BOX`/`SafeBox`) deleted; `hasPrdWorkbook` wired into `PrdWorkbookCard` (a reloaded page says the workbook is no longer in memory instead of a failing click); the scanner now reports test seams (used in their own module AND imported by a test) separately, never hiding them; `planCanvasFor` allowlisted with its reason. 0 orphans. | `npm run check:orphans` |
| A12 | `#prd` with no documents, themes or sources told the user to "run #prd again once personas exist" (a soft blocker). | The reply says what fed nothing and that attached documents become requirement rows; the brief still ships. | read |
| A13 | Live smoke: `/api/embed` 500 `[Errno -2] Name or service not known` after session restore. Root cause: the local embedding provider (`social-research-backend`) was stopped with the rest of the platform. | Platform containers restarted with `docker compose -f docker-compose-all.yml start` (no rebuild). Not a code defect. | `curl /api/embed` returns vectors |

### 4c. Issues found by READING the live Northeastern workbooks (run 1: 2,657 requirements; run 2: 2,718), all fixed

| # | Issue (root cause) | Fix | Pinned by |
|---|---|---|---|
| B1 | The number-rule repair rewrote NAMES that carry a number ("Student 360" became "Student the stated threshold") and its pattern ate the following space ("...thresholdor any other"): 579 damaged cells, 178 with glued words. | `NAME_NUMBER_RE` protects a capitalized word + figure with no unit (quantity openers like "Over 200" excluded; dates excluded); the unit, and only the unit, takes the space; a figure never ends on a separator. Shared with the PrdAir validator (`stripNameNumbers`) and twinned in `prd_xlsx.naked_numbers`. Run 2: 0 damaged cells, the name intact in 422 cells. | `deliverableRules.numbers.test.ts` |
| B2 | "95% of students" could only become "the stated threshold of students". | A share of a population becomes a quantifier ("nearly all of the students"); a hyphenated measure a compound ("multi-day"); the stated-threshold fallback only for what is left. | same |
| B3 | Python twin of the id pattern only allowed a lowercase suffix, so "H-1B" failed the export check while the TS rule passed it. | Suffix in either case. | export check on the run-2 record passes |
| B4 | 174 must-haves kept a must tier after the universal rules dropped the quotes that gave them two independent origins (tiers derived BEFORE quote drops; the engine's final pass re-checked but never re-repaired). | The engine repeats check and repair until stable (two extra rounds max). Offline on the run-2 record: 174 -> 0 errors, must-haves 1,280 -> 1,106. | generality tests |
| B5 | 11 pains stayed in the record with no verbatim quote. | PRD rule `pain-has-quote`: an unquoted pain is removed and unlinked; a requirement left with no root is typed HYPOTHESIS; tiers re-derived. Never a fabricated quote. | generality tests (rule list) |
| B6 | 107 board theme names in the PRD record carried naked figures; theme names and insights were not prose units of the PRD adapter. | Theme name and insight are units (number rule + writing scrub reach them). | generality tests |
| B7 | The writing-scrub repair parsed unit ids with `split(':')`; ids containing a colon (`eng:<slug>#2`) were never repaired, so the rule could not settle. | Parse up to the last `': '`. | university generality test |
| B8 | `documentKind` typed three slide decks as contracts (321 items) because a deck says "deliverables"; kinds were frozen at extraction. | Strong contract markers decide; deck files and page markers (unless the page is a requirements list) next; kinds recomputed from the page on every ledger read. | real-page probe |
| B9 | 407 rows were the delivery party's own obligations ("<vendor> staffs the engagement with ...") typed as product requirements. | Workbook type `Engagement`: every root a contract item and the subject a party named in the contract's title. Still covered and traced; engineering can filter it. | `test_prd_xlsx.py::test_engagement_requirement_typing` |
| C1 | Chat-only work (upload analysis, the 50-minute #prd reply, any chat artifact) was never auto-saved: chat lived in a ref the debounced session save did not watch; reopening a session then saved the stale transcript over it. | `App.tsx` schedules a silent save 4s after the transcript settles (or every 60s during a long generation); a just-restored transcript schedules nothing. | live run 2 |
| C2 | The PrdAir record existed only in the browser: when the window closed the record behind the workbook was gone and could not be re-validated. | The export endpoint writes `{slug}.prdair.json` next to `{slug}.requirements.xlsx`; the compile log prints validation errors grouped by kind. | live run 2 (file written) |

### 4d. External QA (`hic-output-qa`, ten-item PRD rubric) of the run-2 workbook: FAIL, and what was fixed

Scores: thesis 4, problem 3, why-now 2, users-and-jobs 3, non-goals 4, requirements-and-trace 1, tiers 2,
signals 1, quality-accessibility-privacy 4, delivery 3. Fixed in code from its ranked defects:

| # | QA defect | Root cause | Fix |
|---|---|---|---|
| Q1 | 194 garbled split requirements ("The across every later co-op.") with tests naming a wrong id | the splitter took the first word ending in "s" as the verb, split shared objects and noun lists; the fill test embedded an id that renumbering made stale | `splitCompound` splits only when provably two sentences (verb followed by its object, object kept, both halves at least five words), else leaves the requirement intact; the check counts only safe splits; fill tests no longer embed ids. `prdSplit.test.ts` |
| Q2 | 154 rationales claimed "two independent sources" on 0-1 origin requirements | a model rationale survived whenever its tier survived | the derived sentence always leads; the model reason is kept only when it does not overclaim (composed from the captured original, so re-derivation never stacks) |
| Q3 | Checks sheet all green while the record said `pass:false` | the sheet never rendered the generation receipt | every receipt rule is a Checks row, plus "Generation receipt: every rule passes" |
| Q4 | 330 SOW obligations mixed into the requirements an engineer starts from | (B9 typed them) | own sheet `Engagement Obligations`, same columns and ids |
| Q5 | 174 must-haves, 107 theme-name figures, 11 unquoted pains | see B4, B5, B6 | fixed above |

### 4e. Live run 2 (#prd, #personas #journey #slides + PPTX, #slides #deciem, #report #deciem): verified and fixed

Verified live: chat turns persist (C1: the #prd turn and reply are in `chat.json`); coverage contracts fire in-path
(`[coverage] personas: 113/683 carried by the model's slides, 570 filled into 36 slide(s); receipt pass`; deck
39/593 + 554 filled); deck PPTX export (41 slides) with `Export coverage re-check: all 683 client items and research
themes are carried by the exported slides.`; DECIEM branding correct on the deck; name-number damage gone (0 cells).

| # | Defect seen live | Fix |
|---|---|---|
| R1 | The #prd workbook reply was lost both times the window closed on the download (the reply was set after the download) | the reply, coverage block and workbook card are set first; the download fires 1.5s later |
| R2 | 9MB HTML brief (2,700 requirements projected; 34,000 claim rows) | the brief projects 150 requirements (must first) and 150 ledger rows, and names the workbook as the full set |
| R3 | appendix fill quotes flagged "source label but no corpus pointer" by the deck provenance lock; "(1 of 22)" titles read as naked figures; a raw `[articles/...]` pointer in fill text; "REPORT · EXECUTIVE SUMMARY" kicker; "entrys" | fills carry `pointer` beside the quote and the verifier lets a quote use pointers on its own object; titles "Appendix: <area>" / ", continued"; pointer text stripped from fill prose; kicker subject "Client scope and research themes"; item names go through the number repair; plural fixed; large appendices merge six related items per section |
| R4 | `#report #deciem` launched BLANK: the reply stopped at the length limit inside `<style>` (no continuation on HTML artifacts) and the appendix was appended inside the unclosed style; the receipt still passed | every HTML artifact gets `maxTokens 64000` + continuation turns; the appendix closes any open style/script/comment before appending; a document with almost no readable body says so in the reply; the title drops request hashtags ("#deciem ...") |

Seen live, NOT fixed in this session (rendering, outside the rule engine): chat preview titles differ from the PPTX
titles for persona slides; previews clipped on the right; journey preview icons overlap the stage header; the
`#report #deciem` stylesheet resolved its accent to NU red tokens on a DECIEM page; DECIEM deck body text shows raw
file-name citations "(Source: ... .txt)".

### 4f. Live run 3 (after every fix above): the #prd passes end to end

`#prd` on the Northeastern session, 38 minutes, 2,637 requirements (Must 1,137, Should 1,420, Could 3, Won't 77):
generation receipt passes on all 13 rules; the workbook's independent checks all pass (Checks sheet now includes every
receipt rule); 915/915 ledger items and 596/596 board themes covered, 0 by deterministic fallback; 334 rows on the
Engagement Obligations sheet; 0 glued or em-dash cells; PrdAir validation errors 292 -> 64 (all remaining are figures in
theme CATEGORY labels and in requirement notes, which the rule exempts); the brief's claim check fell from 34,120 to
2,656 rows (cap) and the window stayed open through the download; the reply carries the workbook card, both coverage
lines and the receipt. `#report #deciem` rendered body text and the appendix (not blank).

Fixed from run 3 (code, then a final rebuild + smoke PASS):

| # | Defect | Fix |
|---|---|---|
| F1 | the number repair corrupted a TRUNCATED source path ("hic-theme-synthesis/the stated thresholde4b6fb89") and a modifier ("unified 360 student profile") in report appendices | any letter-led slash path is protected; a 2+ digit figure that modifies a SINGULAR noun is a name (counts take plurals or units); twinned in Python; fill prose strips bracketed paths even without ".md" |
| F2 | the appendix sat at x=0 outside the body column | the appendix section carries its own centered measure |
| F3 | "Won't 77." rendered by the chat markdown as list item "01" | count lines never end in "<number>." |
| F4 | 19 of 143 run-3 splits read a noun with a relative clause as a verb ("The Hub resources that apply ...") | no split when the right half's first word is followed by that/which/who/whose |
| F5 | the artifact page's tab title carried an em dash | " · HiC Artifact" |

Seen in run 3, recorded, not fixed: the brief still ships 206 blocking claim rows (UNVERIFIED_QUOTE 145, UNSOURCED_FACT
86) while the rule receipt passes, because the claim chain grades the brief, not the record (the two gates should be
reconciled); the DECIEM report footer "Copy as prompt" is pink on pink; after a Claude 504 the #report fell back to
Gemini 3.1 Pro but the trace still names claude-opus-5-5; the report's first paragraph calls itself a PRD
(self-reference) and "#deciem" leaked into the retrieval query; appendix entries still include other engagements' board
themes (see the board-admission item below); an inline `<svg height="auto">` in a report logs a console error.

### 4g. Open items implemented 2026-10-03 (owner decisions: board-admission gate = yes; quote-support judge = skip)

| # | Open item | Root cause | Fix |
|---|---|---|---|
| G1 | Off-topic themes from other engagements on the board | the Knowledge Library selection is user-level and follows the user across goals; its engagement-theme harvest offers every board. Measured: lexical gate (co-op 0, fundraising 0.19), objective embedding and own-ledger kNN embedding (fundraising 0.37-0.48 interleaved with co-op 0.35-0.50) cannot separate them | `services/themeRelevanceGate.ts`: other-engagement themes are judged once by a fast model (batched, temperature 0) against the objective and the client's own scope; verdicts cached in `engagements/<slug>/theme-relevance.json`; own themes never judged; failures keep the theme. ONE chokepoint in `App.tsx` (an effect on the board's theme set covers KL apply, hydration and the run merge) takes held themes off the board and out of the cached selection with a notice; `#prd` and every coverage contract read the board through the same gate |
| G2 | The brief shipped 206 blocking claim rows while the receipt passed | 20 quotes were research-corpus HEADLINES (RSS items with a URL and no wiki page, e.g. CHUNK_375), so the brief's chain could not resolve them; inside a quote cell they were checked against other quotes' pointers (145 UNVERIFIED_QUOTE) | the brief projects only quotations with a resolvable wiki pointer (they stay in the record and the workbook with their URL source); reproduced offline on the run-3 record: 206 -> 20 blocking; the reply labels the receipt as the record's and the claim check as the HTML brief's |
| G3 | Trace named claude-opus-5-5 after a 504 fell back to Gemini; the chat chip named the chat model | the trace and insight records used the requested model | the served model (`result.modelUsed`) is recorded and stamped on the artifact reply |
| G4 | "This strategic product requirements document (PRD) synthesizes ..." opened the report; "#deciem" was the retrieval query | the meta scrub knew fewer nouns and verbs; the grounding helper took the raw request | whole-sentence removal for "This <document> synthesizes/summarizes/examines ..."; more document nouns and verbs; hashtags stripped at `buildManifestCorpusForGoal` (every caller) |
| G5 | DECIEM report in NU red | the artifact system prompt said "Use NXT brand tokens (or NU when brand=DECIEM)" | a per-brand token rule (NXT / NU / DECIEM); the proxy maps `var(--nu-red*)` to `var(--deciem-pink)` on DECIEM pages as a backstop |
| G6 | "Copy as prompt" pink on pink | the non-NXT brand override's `button[class*="primary"]` (with !important) hit the HiC footer button | the override excludes `.__hic_btn` |
| G7 | `<svg height="auto">` console error | model-authored invalid attribute | the proxy drops `height/width="auto"` from inline svg on every view and export re-read |
| G8 | Chat slide previews clipped on the right | fixed 420px scale inside a shrink-wrapped bubble | the preview box measures its width and scales to fit; replies with slide cards take the full column |
| G9 | Journey preview icons overlapped the header row | the stage CSS painted square glyph icons as `object-fit:cover` photos (3x blow-up) | `contain`, 72px max, padded (the web twin already used contain) |
| G10 | Raw file-name citations "(Source: ....txt)" in deck text | the pointer registry stored the upload's FILE NAME as its source name | registration uses `readableSourceName`; the bracket-file fallback strips extensions, copy suffixes and underscores |
| G11 | Persona slide title differed between preview and PPTX | the #prd synthesized persona / journey / gap slides skipped the artifact chain every other deck takes | they now go through `verifyAndAttachLedger`. (The renderers were ruled out: both twins render `slide.title`.) |

### 4h. Live run 4 (the 4g fixes + a second project: agricultural property insurance, 6 client documents)

Verified live: the board gate set aside 48 off-topic themes on the university board (596 -> 548) and 25 on the
insurance board (215 -> 190); no clipped previews at 1392 or 1280 wide; no journey icon overlap; DECIEM report accents
pink (0 NU red); footer button readable; no svg console errors; no self-reference opener; the insurance `#prd` compiled
922 requirements, ledger coverage 612/612, export check pass, validation errors 3. Defects found and fixed:

| # | Defect | Root cause | Fix |
|---|---|---|---|
| H1 | DECIEM report body text rgb(230,230,230) on #FAFAFA | the artifact declared a dark-canvas `:root` token block; the brand override forces the light surface but left `--nxt-text-*` alone | the override sets `--nxt-bg/surface/text-primary/text-secondary` from the forced surface (`!important`, same `:root` selector) |
| H2 | `#recs #slides` timed out twice (Opus 504) then returned empty on a ~460K-token prompt | the chat panel loaded the NEWEST `wiki/sources/` archive of ANY engagement and injected all of it into every chat prompt (a 278KB university-advancement archive in an insurance session; also a fundraising contamination path) | only the archive whose name matches this engagement's slug is loaded (none otherwise; manifest grounding supplies URLs), capped at 60KB in the panel and in the prompt builder |
| H3 | the #prd reply (coverage, receipt, workbook card) still missing from the saved transcript after the window closed on the download | the 1.5s head start was shorter than the 4s chat-save debounce | the panel fires `hic:flush-session-save` (App saves immediately) and the download waits 3s |
| H4 | HTML report citations still read "... - 09302026.txt (Oct 2026)" | two more renderers used the raw page title: TS `resolveOne` and the proxy `_manifest_pointer_label` | both turn a file name into a document name (no extension, copy suffix, underscores or final/redacted tags) |
| H5 | appendix entries headed "CLUSTER 1023" | unnamed topic-model clusters reach the board | a generic cluster name is replaced by its statement or its first quote |
| H6 | `#prd` re-admitted 17 held themes (207 on the record vs 190 on the board) | `themesFromContext` dropped the `source: cached` provenance the gate reads | provenance kept on `ThemeInput` / `PrdThemeInput` |

### 4i. Live run 5 (verification of 4h) and the fixes it led to

Verified live: DECIEM report body text rgb(90,90,90) on rgb(250,250,250); citations name documents ("SOW012 NXT Humans
NU Dashboard (Oct 2026)", no extensions or underscores); the insurance `#prd` (920 requirements, 421/421 scope items,
190/190 themes, 13/13 rules pass, export check pass) and its reply SURVIVED the window closing on the download (coverage
lines, receipt and workbook card in the saved transcript after a reload).

| # | Defect | Root cause | Fix |
|---|---|---|---|
| J1 | `#recs #slides` on the insurance project: "returned empty content (stop_reason=max_tokens)" after 687s, twice across runs | adaptive thinking spent the whole 64K output budget; no text block | one retry at the 128K ceiling with medium effort when a Claude chat reply has no text and stopped for length |
| J2 | the archive loader exited silently | it read the goal from a prop that is empty at mount | reads the live context; logs when no archive matches |
| J3 | an email-design and a beauty-brand theme still reached the Northeastern appendix | the judge's 80-item batch omitted some verdicts; unjudged themes are kept by default | themes still unjudged after a batch are asked again in batches of 20 |
| J4 | appendix text "A the stated threshold email benchmark dataset of the stated threshold widgets" | fill prose built from theme insights carrying figures; the number repair is crude on them | fill headings and bodies prefer the item's sentences without bare figures (the figures stay in the verbatim quote) |
| J5 | an appendix entry "Unlabelled research cluster" with body "Cluster 50." | generic cluster statements | a generic cluster's body is its readable heading (from its quote) |
| J9 | insurance must-haves "The plan builder vendors the farm could use ..." | the splitter read the noun pair "suppliers and vendors" (bare "and", no comma) as two verbs | no split for a plural noun joined by a bare "and" to another plural |

Live run 6 confirmed J1 (the budget retry fired, `#recs #slides` on the insurance project delivered 8 slides, coverage
20/180 + 160 filled, receipt pass), J2 (archive line logged, none loaded) and the board gate (22 more held on the
university board). Its findings, fixed:

| # | Defect | Root cause | Fix |
|---|---|---|---|
| K4 | the 8 appendix slides of `#recs #slides` existed in state but never rendered in the chat | the chat attaches slide cards to a reply by model + timestamp; fill slides had no `model` | fill slides carry the batch's model |
| K1 | "the stated threshold" still in fill text (61 in one report appendix), even in headings | an item whose every sentence carries figures fell through to the crude repair | a fill keeps a sentence when each figure also appears in the entry's own verbatim quote (a sourced figure; those units are exempt from the number rule) and drops unsourced sentences; a heading with no usable sentence becomes `Research theme: "<quote>"` |
| K2 | "Unlabelled research cluster" entries | board clusters with no name, statement or quote | content-free generic clusters are outside every coverage universe (nothing to account for) |
| K5 | area labels "Key and Message", "Risk and Step", "Farm and Report" | structural words counted as subject terms | added to the area stop list (now e.g. "Plan and Farmers", "Tool and Farmers") |

Live run 7 confirmed K4 (7 appendix cards rendered under 8 recommendations) and K2 (0 generic-cluster labels), and
found 15 remaining placeholders. An OFFLINE AUDIT over both real projects (every one of 591 and 172 items forced into
the appendix) reproduced them exactly and drove the last fixes, now pinned by `services/appendixAudit.test.ts`:

| # | Defect | Root cause | Fix |
|---|---|---|---|
| L1 | "the stated threshold" in fill prose where an item's figures had no supporting quote | bodies fell back to the raw statement; merged "Also:" headings were checked against the lead entry's quote only | bodies keep only sourced or figure-free sentences (no fallback); unsourced figures are SOFTENED (`softenFigures`: "80% refuse" -> "most refuse", "95%-adopted" -> "widely adopted", "within 180 days" -> "within a set period") and any survivor is removed, never replaced by a placeholder |
| L2 | `\u0000the stated threshold\u0000` leaking from the number rule in ANY deliverable whose text has both a protected token (a year, an id, a name) and a figure | the protected-span marker carried its index in digits, which the repair then rewrote | markers use letter keys (`markerKey`) |
| L3 | appendix bodies repeating their heading word for word; headings cut mid-phrase in deck cards | | an echo body is left empty; card headings use the first clause or a word-boundary cut at 90 characters |
| L4 | appendix slides vanished after a reload | restore re-lifts slides from the reply's fences, which never held the fills | the fills ride on the reply (`coverageSlides`, saved with the transcript) and are re-lifted with it |

Offline audit result after the fixes, both projects: 0 placeholders, 0 generic-cluster labels, 0 em dashes, 0 file
names in display text; receipts pass.

Not a defect (checked): the email-design and retail entries in the university appendix are that board's OWN themes
(synthesized there, using email and retail as analogies), not other engagements' themes; the gate does not judge own
themes by design.

Open (minor): one two-source citation rendered without its "; " separator in a DECIEM report; all three renderers join
with "; ", so the source of that instance was not reproduced.

QA findings NOT fixed by code in this session (owner-visible, recorded honestly):
- Off-objective board themes (17 advancement and fundraising themes from another engagement, plus agriculture, email
  design, executive search and marketing strays) generate requirements. They are ON THE BOARD (admitted by second-brain
  reuse), and the owner rule is that every board theme is reflected. A lexical relevance gate was measured on the real
  board and rejected: genuine co-op themes scored 0 while fundraising scored 0.19. Fix belongs at BOARD ADMISSION with a
  semantic (embedding) relevance gate against the objective; not in the PRD.
- Quote-to-claim support: some requirements cite a quote that does not support the claim (two different requirements
  citing "They are not built under this SOW."); 365 quotes are five words or fewer. Needs a support-scoring pass (model
  judge or entailment) and a whole-sentence widening of ledger quotes at extraction.
- Why-now rests on generic external posts; only 30 of 2,718 requirements link to a success signal; open-question due
  dates are events, not dates; scale (2,718 rows, 8 exact duplicates) needs a dedupe pass. These are generation-quality
  items for the sections pass and a requirement-dedupe rule.

Still open after this session (each needs its own investigation, not a patch):
- The #prd HTML BRIEF (secondary output) claim chain reports 2,034 blocking rows (UNVERIFIED_IDENTIFIER 1100, INDEPENDENCE_INFLATED 801, UNSOURCED_FACT 425) when 2,600+ requirements are projected into one HTML page. The workbook is the primary output and passes its checks; the brief should project a summary tier, not every requirement.
- Board theme synthesis writes figures into theme NAMES upstream (the PRD now repairs its copy; the board itself still shows them).
- `GET /hic-workspace/wiki/engagements/<slug>.md` 404 during #prd (the engagement memo page is not written for this engagement); harmless, logged.
- The research-pass call ("research pains and gaps") returned an empty reply on a 333KB prompt in run 1; requirements for those pains came from other passes. The prompt should be bounded.

### 4j. Analyst Chat typing latency (2026-10-04)
Typing into the Analyst Chat composer lagged keystrokes behind. Cause: every keystroke called `setInput` in
`CorpusChatPanel`, which re-rendered the whole panel (every message and every SlideCanvas card) before the textarea
could paint. Fix (`components/CorpusChatPanel.tsx`):
- `ComposerTextarea` (memoized, module level) owns the text in local state and paints each keystroke immediately; the
  panel copy updates inside `startTransition`, so React can interrupt the heavy panel render.
- Programmatic writes (chips, hashtag picker, ENHANCE, clear-after-send) go through a syncing `setInput` that bumps a
  `composerSync` counter, which pushes the new value into the textarea.
- `handleSend` and the hashtag picker read the live DOM value (`inputRef.current.value`), never the lagging panel copy.
- The browser check found two older composer bugs, both fixed: the hashtag menu reopened right after a pick (the pick
  rewrote the text before the cursor moved; the first text change after a pick is now skipped), and pressing Enter to
  pick a directive ALSO sent the message (`handleKeyDown` now returns when the menu already cancelled the key).
- Live check (heavy 36-turn session): 40 characters typed with no delay land exactly; keydown-to-paint p50 is about 36-80ms.
  Enter picks without sending; Shift+Enter adds a newline. 0 console errors.
- Leftover: the verifying agent's Enter test (before the fix) sent "#pr" to the saved risk-and-market session, which
  now carries one extra "#pr" turn and a canned clarification reply (no model call). Delete that turn in the UI if wanted.

## 5. Gotchas learned this session

- Helper agents must run on Opus (`model: opus`); Fable 5.1 hit "out of usage credits".
- Python heredocs that write TS regexes turn `\b` into a backspace byte. Write scripts to files and check
  with `cat -A`.
- A shebang in an `.mjs` imported by a test broke vitest loading (`check-template-parity.mjs`).
- Claude 4.6+/5.x rejects temperature, thinking budgets, forced tool_choice and prefill; long PRD compiles
  need `maxTokens: 96000` + continuation turns.
- HiC has no HMR: every frontend change needs a `research-generator` rebuild. Port 3000 is Social Research;
  HiC is 5011, proxy 5012. Never rebuild under a live research session.
- No em-dash in generated output or new code.
