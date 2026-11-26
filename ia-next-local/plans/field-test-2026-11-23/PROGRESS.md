# Uplift execution log (field test 2026-11-23)

Plan: `ia-next-local-field-test.html` in this folder (issue ids S1..P2, workstreams 0, A..H).
Rules: no commit without the owner's approval; rebuild only when `GET /api/tasks` shows nothing running; no paid API.
Nothing here is committed. All changes sit in the worktree `D:\NXT-HUMANS_AI_CX_WORKBENCH-ia-next-local`.

How to test offline (no rebuild): `powershell -File plans/field-test-2026-11-23/rig/test.ps1 [pytest args]`
How to deploy: `docker compose -f ia-next-local.compose.yml up -d --build` (from `ia-next-local/`).
How to drive the page: start the private Chromium on port 9333, then `node d.mjs "@say.js"` with MSG/SHOT/MAXS set
(scripts in the session scratchpad `pw/`, copies in `rig/`; `rig/d.mjs` needs `npm i playwright-core` beside it).
Do not write Python or PowerShell with backslashes through a shell heredoc: it corrupts `\b`, `\s`, `\u`. Write a
script file and run it.

Status key: TODO, WIP, DONE (code + offline test), LIVE (rebuilt and checked through the page).

## Batch 1: currency contract + quick web answer (Case 1)
- [x] LIVE 0.1 `ia_next/currency.py`: window from the request (today / N days / since year / history), `stamp()`,
      `parse_date`, `page_date`, `inside`, `spread`, `tier`, `show`. Owner time zone `IA_NEXT_TZ` (default America/New_York;
      the container clock is UTC, so "today" must not use it).
- [x] LIVE 0.2 date and period in the search planner prompt; SearXNG `time_range`; dated Bing News items join each query
      (`localsearch._dated_news`).
- [x] LIVE 0.3 published date read from page metadata on fetch (`studio._page_text` returns 4 values; Last-Modified alone
      does not count).
- [x] LIVE 0.4 pack items, web pages and second-brain reuse filtered by the window; at most 2 undated from packs and 2 from
      the web; under 4 current sources the run stops and says so.
- [x] LIVE 0.5 date, author and tier sent to HiC `write-article` (HiC already accepted them). `sources.json` now holds
      `window`, `currency` (spread + left out), `data_packs.kept` and `data_packs.query`.
- [x] DONE 0.6 scorecard hard check `sources_current` (80 percent, 100 for "today").
- [x] LIVE B.1 `ia_next/webanswer.py` + rule in `agent._turn`: news and lookups answered in chat from Bing News RSS,
      Google News RSS and SearXNG, code-written dated links, no engagement, no pack, no artifact. Measured through the page:
      30 s cold, 21 s warm (target 20; sentences shortened after that measurement, not yet re-measured).
- [ ] TODO 0.7 window shown as an editable chip on the plan card; dates shown on citations in reports and decks;
      backfill dates on wiki pages written since 17 Nov.

## Batch 2: speed floor
- [x] DONE S1 token rate recorded per call (`Usage.tokens_per_second`, `providers.speed()`); under 10 tokens/s the writer
      moves to the 14.9 GB file for 15 min and the page health bar says why (`health._check_speed`). Needs LIVE check.
- [x] DONE S6 search seat on the resident model (verifier still Nemotron for reports; move to deep-only with E9 depth).
- [x] LIVE S2 `deckstudio.compose_in_steps`: storyline call, then three slides per call at medium effort, saved under
      `results/decks/_partial/` so a retry resumes; timeout text says what happened. Setting `IA_NEXT_DECK_STEPS` (legacy
      deck tests run with it off; mark a test `@pytest.mark.deck_steps`). First live run: 10 slides written in about 5 min
      (field test: 55 min), then pictures.
- [x] DONE S4 (part) plan-card estimates use the last three runs, not nine. Still TODO: estimate from live token rate.
- [x] DONE S5 `router.fill` writes a report's brief and a journey's persona in code, so those cards appear at once.
- [ ] TODO scheduler (three lanes), Ollama env (no sysmem fallback is a host setting: tell the owner)

## Batch 3: collection integrity
- [x] DONE E3 keyword query for packs (`studio.keywords`), counts after filtering, an empty selected pack stops the run;
      selected-pack items protected from the relevance filter (E7, part).
- [ ] TODO E4 archive everything fetched; E6 stricter reuse (term overlap); E7 topic statement for relevance
- [x] DONE S3 plans on one engagement share evidence: a research run under way is waited for, evidence that arrived since the
      card was made is reused (`plan._sibling_research`, `_evidence_since`); plans queue for the graphics card (`plan._STUDIO`).
- [x] LIVE E7 selected packs: `hic.pack_items(loose=...)` returns their items without the word match; kept when relevance
      is at least 0.38. Case 2 run 2: 10 of 18 sources from AI Trends (was 2 of 10).
- [x] DONE E9 (part) two depths: `studio.depth_of` (fast by default, deep when the request says deep, thorough, exhaustive or
      comprehensive, or `IA_NEXT_DEPTH=deep`). Fast skips the second-model review; rules in code still check quotes, citations
      and wording. TODO: a depth choice on the plan card; source and passage budgets per depth.
- [x] DONE report in steps: `localwriter.write_in_steps` (outline call assigns every finding to a section, then one call per
      section at medium effort; `IA_NEXT_REPORT_STEPS`). Old path measured 24 Nov: 1,007 s in write and review.
- [x] DONE collection meets its own bar: undated pages beyond what the 80 percent rule allows are dropped at collection.
- [x] DONE one empty pack among several selected is named in the summary and the run continues; all empty still stops.
- [x] DONE `plan._research_args` passes the subject as the research goal (it had passed the ordering sentence, and the
      search went looking for audio-overview best practices).
- [ ] TODO S7 pack ingestion (pack search takes 2 to 5 min of a run; 226 sources for two packs took 329 s)

## Batch 4: page and artifact defects
- [x] DONE U1 evidence card (`plain.isEvidence`, `kindOfTask`): "Evidence ready", findings list, no report buttons, zero checks
      reads "Not checked". Needs LIVE check.
- [x] DONE U2 (part) a card on screen repaints on audio_rendered / scorecard / task_done. The black video player is NOT
      reproduced yet: check when Case 3's audio runs through the page.
- [x] DONE U5 engagement counts from a grouped query (`task_count`). U6 (part) research step says what it is doing (`store.say`).
- [x] DONE A1 `router.split` + `fill_many` + `reply_many`: one plan card per named output, no model call; `_CLAIMS` widened.
- [x] DONE A2 `router.subject_of`: the goal is the subject, else the engagement objective.
- [x] DONE A3 New conversation clears the engagement and the pack choice (web/app.js `#newConv`). Needs LIVE check.
- [x] DONE S3 for reports: `plan.reuse_evidence` + `studio._held_evidence`: a report on covered evidence skips collection and
      analysis unless the request asks for new or fresh research. Needs LIVE check.
- [x] DONE D1 (more): themes deck storyline built in code from the themes artifact (`deckstudio._themes_story`), no plain
      bullet slides in stepped decks, slide rules against copied purpose lines and instruction verbs, source lines carry
      dates and a number-only title falls back to the publisher (E10).
- [x] DONE U4 (part) audio transcript and shared source lists keep pointers in attributes, not in view. TODO: model display
      names on failure cards and the spend panel.
- [x] DONE A4 (part) a failed task writes its episode line (`store.event` on task_failed). TODO: recall across engagements.
- [ ] TODO U6 item titles, citation links
- [x] LIVE U3 themes in two levels: `localhic.topics_two_level` (every passage placed, a source's own centre removed before
      clustering, k-means for themes then groups), `themes.build` names five clusters per call and saves partial results,
      page shows groups, share bar, sources, newest date, one-source label, dated quote link, passages on demand.
      Fresh Case 2 run 3: 503 s total, 14 themes in 4 groups from 17 sources, 1 single-source.
- [x] DONE U7 `ia_next/prose.py` scrub (applied to theme and group names and insights so far; apply to report, deck,
      journey map, audio next).
- [x] DONE D1 (part) the deck's storyline takes the engagement's themes as its spine when the request says themes.
- [ ] TODO D1 rest (dated source lines, claim-strength check, photo prompt formula); P1/P2 prototype

## Batch 5: gaps
- [x] DONE E (first version) live feed on running research and themes cards: `studio.live` writes `live.json` (sources as
      read, findings as verified), themes write partial `themes.json`; `web/app.js liveEl` polls and animates rows in.
      Needs LIVE check through the page. TODO: incremental theme board during research itself.
- [x] DONE F (part) rename an engagement (`store.rename_engagement`, `POST /api/engagements/{id}/rename`, Rename button in
      the engagement sheet); counts from the table. TODO: merge, tags, multi-engagement scope.
- [x] LIVE D Library (first version): `ia_next/libraryview.py` over the existing local full-text index (`store.evidence_fts`),
      routes `/api/library/search|item|add`, rail item Library, three columns (filters, results, source), pick rows and add
      them to the engagement in focus. Measured in the page: 29 ms a search. TODO: most rows are undated (sources collected
      before 24 Nov carry no date; backfill), page boilerplate in some source text, saved themes as rows, vector search.

## Batch 6: self-improvement
- [x] DONE H (part) scorecard outcome checks: `no_internal_text` (hard), `packs_used` and `source_spread` (soft), beside
      `sources_current` (hard). TODO: failures and overruns into `improve.groups`; the four cases as scripted runs
      (`rig/run_case.py`, `rig/run_case3.py` are the start).

## Tests
493 pass, 24 skipped (was 463). Legacy tests run with DECK_STEPS, REPORT_STEPS off and depth deep (conftest); mark new
tests `deck_steps`, `report_steps`, `fast_depth`, `period` to get the new defaults. New: `tests/test_currency.py`, `tests/test_field_test_routing.py`. Legacy collection tests run with no default period through
an autouse fixture in `tests/conftest.py`; mark a test `@pytest.mark.period` to get the 30-day default.

## Log
- 2026-11-23 late: Figma set to the Intel card (measured), plan page v10. Execution started.
- 2026-11-24 00:10: batch 1 rebuilt and live. Case 1 through the page: 8 stories, all dated 23 Nov 2026, linked, no
  engagement created. Screenshot `shots/b1-case1.png` (scratchpad).
- 2026-11-24 00:40: S1, S6, E3, scorecard gate coded and tested; second rebuild pending.
- 2026-11-24 01:30: Case 2 over the API, run 1 (before pack fix): 358 s total (research 129, analyst 148, themes 80), 10 sources
  all inside 30 days, 2 from the pack, 6 themes. Run 2 (after): research 136 s, 18 sources all inside 30 days, 10 from
  AI Trends, analyst 218 s. Field test figure for the same case was over 30 min.
- Measure with `python rig/run_case.py "<message>" --packs ai_trends --title "<title>"` (add `--no-start` to see the plan,
  `--plan <id>` to start and follow one).
- 2026-11-24 03:00: themes two-level + prose scrub + stepped deck live. Lesson: `sed -i` with nested quotes broke an f-string
  and I rebuilt with it; always run the suite between an edit and a rebuild.
- `rig/run_case.py` now sends the card's switched-off steps as skipped (an empty skip list had been re-running research).
- OPEN: Analyst step is not needed for themes alone (themes read passages, not findings): skipping it would cut about
  3 min from Case 2. Other outputs need the findings, so do it only with a "sources only" research mode.
- 2026-11-24 04:10: first stepped deck read end to end: coherent and current, but (a) it argued one theme instead of presenting
  the themes, (b) one subtitle was a copied planning note, (c) takeaways were instruction verbs, (d) two bullet slides were
  mostly empty, (e) one verified quote in ten slides. Fixes above; second run in progress (12-slide themes storyline).
- 2026-11-24 05:00: second deck (themes storyline in code): 532 s, 11 slides, dated source lines. Read end to end: an
  off-subject theme (seafood) reached a slide. Added a scope check on themes (relevance under 0.25 is dropped; measured
  0.20 for that theme, 0.29 or more for the rest) and the prose scrub on every deck field.
- Case 3 run A (rig/run_case3.py): the four-output request produced four plan cards in 0.2 s and deck and journey waited
  for the shared research. Two defects: the strict empty-pack stop killed the run because AI Trends held nothing on
  students that month (now: stop only when every selected pack is empty, otherwise say which was empty), and the report
  started its own research (now: a report shares the evidence run like every other output; `_RESEARCH_GATE`).
- The harness refuses a loop that stops running tasks. Let outdated runs end on their own before a rebuild.
- 2026-11-24 06:30: Case 3 run A finished its report on the old build: research 329 s, analyst 185 s, write and review 1,007 s,
  and the new `sources_current` gate marked it Needs review (79 percent). Run B starts after the rebuild with: stepped
  report, fast depth, shared research for the report, pack rule, research goal fix, live feed, rename, A3, U4.
- 2026-11-24 07:30: checked in the page: Library search and source pane; engagement sheet has Rename; the research card
  is labelled Evidence, its running step names the real activity and the live feed lists sources as they are read.
  Run A's journey map finished in 290 s (field test: 33 min).
- Case 3 run B started on the build with stepped report, fast depth, shared research, pack rule and research-goal fix.
  Log: scratchpad `run_c3b.log`. Next: read every output of run B end to end, then Case 4, then all four cases through
  the page, then update the plan page with the results and links.
- 2026-11-24 08:40: CASE 3 RUN B (build before the last four fixes), over the API:
  themes stage 519 s (research 273, analyst 131, themes 105): 8 sources, 9 themes in 3 groups. Too thin for "exhaustive":
  38 older and 27 undated pages were left out and 50 pack sources timed out.
  four-output request: 4 plan cards in 0.2 s, research not repeated. Audio script 105 s (field test 33 min). Report 152 s
  from the shared evidence, fast depth (old path 1,007 s). Deck 408 s, 9 slides, 3 verified quotes. Journey map running.
  Report read end to end: current sources and exact quotes, but 5 sources carry it, it said "the audience should", used
  "holistic", cited a personal blog about school pupils in a higher-ed report, and its source list had no dates.
  Fixed after that read (not yet rebuilt): dates in the report's source list, scrub of the writer's own sentences, a
  scope instruction, byline dates read from page text, deeper collection for exhaustive requests, parallel page reads.
- STILL OPEN after run B: source tiering (a personal blog counted like a publisher), population scope check on findings,
  thin corpora in a 30-day window (consider 90 days for research with a visible chip), pack search time and timeouts (S7).
- 2026-11-24 09:20: CASE 3 RUN B TOTAL 1,487 s (24.8 min) for themes plus four outputs; journey map 289 s. Rebuilt with
  the post-read fixes. Page driver written: `rig/ui_case.js` (run with `node d.mjs "@ui_case.js"`, env MSG, ENGNAME or
  ENG+ENGTITLE, PACKS by shown name, SHOT, MAXS). Case 2 through the page is running: engagement made by name, AI Trends
  chosen, plan started, evidence card shows three steps.
- Fixed after that (NOT yet rebuilt): slide text is never cut with an ellipsis (`slidepage._clip` ends at a clause);
  an artifact's research estimate leaves out the report-writing time (the card said 19 min for about 7).
- NEXT: read the Case 2 page run; rebuild; Case 4 through the page (nurse staffing engagement + Healthcare pack for fresh
  evidence, then `#proto`); Case 1 and Case 3 through the page; then add an "Execution" section to the plan page
  (`ia-next-local-field-test.html`, published at https://claude.ai/artifact/4ukoKJDEhi1R88CtAcHZkP) with before and after
  timings and links, and republish.
- 2026-11-24 10:30 THROUGH THE PAGE (`rig/ui_case.js`):
  Case 1: answer in chat in 14.3 s then 8.6 s; eight stories each dated the day asked, linked; no engagement, pack or plan.
  One run missed a feed and said nothing carried today's date (fixed: an empty feed is asked again; NOT yet rebuilt).
  Case 2: 639 s (10.6 min); first source row on the card at 54 s; 25 themes in 6 groups from 196 passages in 29 sources,
  27 dated in the last 30 days, 13 from AI Trends, 4 single-source. Misses: 10 min by 39 s, pack share 45 percent against
  70, no theme on screen in the first 90 s. Built after it and rebuilt: themes plans stop at collection (`collect_only`),
  findings are pulled on demand (`analyse_only`, `plan._needs_findings`). Not yet re-measured.
  Case 4 step 1 (fresh research in the nurse staffing engagement with the Healthcare pack) is running through the page.
- Screenshots for the plan page are in the scratchpad report `img/` as x1-web-answer, x2-live, x2-themes, x3-library.
- 2026-11-24 11:30 CHECKPOINT. Rebuilt on the final code of this session; 493 tests pass; no task running.
  Case 4 through the page: research + report 624 s (11 new sources, 10 inside 30 days, 5 from the Healthcare pack, beside
  23 earlier), prototype 271 s (5 screens, 15 blocks from 15 findings). Not yet read screen by screen.
  Plan page republished as version 11 with an "Execution" section (before and after for all four cases, what changed,
  what is open); copy saved here with `img/x*.png`. Working tree: about 41 changed or new files, nothing committed.
- RESUME HERE (in this order):
  1. Re-measure Case 2 through the page on this build (themes now stop at collection; expect about 7 to 8 min) and Case 3
     through the page (`rig/ui_case.js`, two messages: the themes request with PACKS="Higher Ed,AI Trends", then the
     four-output request with ENG and ENGTITLE). Render and play the audio in the page (U2 black video player is still
     unreproduced).
  2. Read the Case 4 prototype and the run B journey map and deck end to end; fix what a partner would reject.
  3. Evidence breadth: S7 pack ingestion into the local index, source tiering, a population scope check on findings,
     a period chip and a depth chip on the plan card (`plan.options_for`).
  4. Prototype P1 (each screen shows the finding it answers) and P2 (card names the model that answered).
  5. Live theme board while research is still collecting; merge, tags and multi-engagement scope (Gap 3).
  6. H: failures and overruns into `improve.groups`; the four cases as a release gate.
  7. Side-by-side with Gemini Notebook for each artifact kind (owner's standing rule).
  8. Ask the owner for commit approval; update README.md and LOCAL.md (README still names Nemotron for the conversation
     seat and says the folder is uncommitted).
- 2026-11-24 13:00: RESUME item 1 (part): Case 2 through the page on the final build: 418 s (7.0 min), 25 themes in 7 groups,
  28 sources, first source row at 42 s, card estimate "about 7 min". Under the 10 minute bar.
  Case 3 through the page is running (themes request with both packs; the four-output request follows).
- Built after that rebuild (NOT yet deployed): prototype chart titles written from what the bars compute, with an optional
  `measure` (average of a number field per group); prototype cards cite a finding's source with its date
  (`protokit` item `source`, `prototype._cited_sources`); the sources-only evidence card says how many sources were read
  and lists them.
- Case 4 prototype first screen read: a real product shell with sample data marked, but its chart said "average patients
  per nurse" and drew record counts (fixed above), its first tile is "400 of 400 records", and its evidence cards carried
  no source (fixed above, needs a new run to see).
- 2026-11-24 14:40 CASE 3 THROUGH THE PAGE (engagement eng_c37efd59bb40 "Higher ed students and AI (page run)"):
  themes request with both packs: 499 s, 18 sources, 19 themes in 5 groups, first source row at 37 s.
  four-output request: four plan cards; findings pulled on demand 206 s (32 findings); AUDIO FAILED its evidence check
  (12 of 19 turns cut, no retry); report 369 s with 2 open findings; themes deck 559 s; journey map running.
- Built and tested, NOT deployed (494 tests): audio script gets one repair attempt before failing; period and depth as
  choices on every evidence-backed plan card (`plan._evidence_options`, `currency.for_choice`); prototype chart titles and
  cited cards; sources-only evidence card text.
- NEXT: when the journey map ends, rebuild; ask for the audio overview again through the page, make the voices, confirm
  the card shows a working player (U2); read the page-run report, deck and journey map; update the plan page.
- 2026-11-24 16:30 CASE 3 THROUGH THE PAGE, COMPLETE: 2,114 s (35.2 min) for themes plus the four-output request; journey
  map 346 s (6 phases, 25 quotes); the audio script failed once (12 of 19 turns cut), then passed on a new request after
  the repair pass was deployed (153 s, 40 turns).
- U2 FIXED AND CONFIRMED IN THE PAGE: "Make the audio" on the card starts the voices at once on this machine
  (`audio.request_voices(by_person=True)`, no spend approval for a free local render), the button reads "Making the
  voices", and the card repaints on `audio_rendered`. Measured: player on the card 259 s after the press, duration 556 s,
  no reload, no video element. My first version of this never rendered (it set the in-progress flag the renderer itself
  checks); a test now proves the render runs. 495 tests pass. Deployed.
- Deployed in the same builds: period and depth choices on plan cards (seen in the page as "Evidence from"), prototype
  chart titles and cited cards, sources-only evidence card text. NOT yet deployed: the card label "Audio ready".
- 2026-11-24 evening, GOAL "fix what is still open". READ the Case 3 page-run report and deck end to end as a partner.
  Rejected for: K-12 teachers, K-12 parents and Chinese school pupils written up in a higher-ed report; a note.com
  personal page carrying a section; an eight-sentence quote and one cut inside a bracket; "described in the ledger";
  advice ("the faculty senate should") at the end of every paragraph, with offices my own prompt had suggested; the
  deck had a slide named "Interface elements obscure substantive educational insights" (page furniture clustered into
  a theme), three off-subject slides (job pipelines, CPT visas), and speaker notes written as stage directions.
  Measured root cause for the deck: of the themes' passages, many were menus, newsletter forms, a form's list of
  states and one page whose words came back reversed; theme-level relevance did not catch them (0.40 to 0.48).
- BUILT, 507 tests pass, NOT yet deployed (no rebuild yet):
  - NEW `ia_next/evidencequality.py`: `grade/stamp/weak/mix` (source tier 1 primary, 2 publisher, 3 other, 4
    self-published or press release), `trim_quote` (whole sentences, at most 340 chars, verbatim), `scope` (one call:
    population of the request; each finding's `about` group inside, beside or outside), `prose_like`, `readable`,
    `on_subject` (passage floor 0.40, best 40 percent always stay).
  - studio: weak web pages held back (join only a collection under 10 sources, at most 2), unreadable pages skipped,
    `quality` in sources.json and the summary; Analyst schema has `about` (ANALYST_SCHEMA), quotes trimmed, scope
    check (`config.SCOPE_CHECK`, test marker `scope_check`), at most 2 findings per weak source, furniture passages
    not sent to the Analyst; findings.json has `left_out_of_scope` and `population`.
  - localwriter: blocks never give advice (implication only), no suggested offices, "about:" and weak marks on ledger
    lines, "ledger" wording scrubbed, Sources list labels self-published and press release.
  - themes: passages filtered by `on_subject` before clustering (event `passages_left_out`).
  - deckstudio: `spoken()` removes stage directions from notes; second slide kicker THE PATTERN; quote slide goes to
    the most on-goal theme.
  - scorecard: soft checks `source_quality` and `population_scope`.
- NEXT: read the journey map and prototype; rebuild when no task runs; re-run Case 3 themes + report + deck through
  the page and read them again; then S7 pack speed, live theme board, prototype model name, improvement loop.
- 2026-11-24 late: OWNER (mid-run): "I still don't see any progress on managing engagements like projects, naming them,
  editing their settings. That was part of my original uplift plan instructions." Gap 3 moved to the front and BUILT,
  DEPLOYED and checked through the page (rig/eng_ui.js; no console errors):
  - store: engagements gain client, description, tags, settings (JSON: packs, period, depth, brand, audience), pinned,
    archived, merged_into, updated. `update_engagement`, `merge_engagements` (nothing moved or deleted: merged ones
    are hidden and their work shows under the target through `family()`), `unmerge_engagement`. `create_task` fills a
    brief from the engagement's defaults; the plan card opens on the engagement's period and depth.
  - routes: GET/POST /api/engagements/{eid}/settings, POST /api/engagements/bulk, /merge, /{eid}/unmerge.
  - page: NEW web/engagements.js. "Manage" beside the rail heading opens the Engagements panel (search, tag filter,
    create, multi-select bar: archive/restore, pin, tag, merge). "Settings" on a row or on an engagement's sheet opens
    its settings (name, client, description, tags, evidence period, depth, brand, audience, data packs, merged list
    with Separate, pin, archive). A pack choice in the composer is saved as that engagement's default.
  - tests: tests/test_engagement_projects.py (5). Suite 514 passed, 24 skipped.
- Also built and DEPLOYED in the same rebuilds: evidence quality (see the entry above), journey map persona is a
  composite (a persona named after a real person in a source is renamed), [S#] marks stripped from short lanes, step
  cards name the model that answered (`providers.ANSWERED`), pack search in batches of 10, six at a time, 40 s limit
  (measured: one batch of the Higher Ed pack held 150 s and another 81 s for nothing; 251 s in all).
- RUNNING: Case 3 themes through the page on this build, engagement "Higher ed students and AI (run 3)"
  (log: scratchpad pw/r3-themes.log). NEXT: read its themes; then the four-output request; read report and deck again.
- STILL OPEN after that: live theme board during collection; H (failures and overruns into improve.groups, four cases
  as a release gate); Gemini Notebook side by side; three-lane scheduler; estimates from the live token rate; Library
  backfill; README.md and LOCAL.md; commit approval.
- 2026-11-24 night. Case 3 themes through the page after the evidence fixes:
  - run 3 (eng "Higher ed students and AI (run 3)"): 297 s, 9 sources, 6 themes in 2 groups, every theme on the
    subject, no page furniture. Clean but thin: 26 older, 7 undated, 4 self-published and 15 off-subject items left out.
  - widened candidates (localsearch.MAX_RESULTS 24, studio.MAX_WEB_SOURCES 14, 10 page readers, 5 items per feed for
    packs the person selected, one more item per publisher from a selected pack), rebuilt.
  - run 4 (eng_25014f0d8d39): 282 s, 15 sources all dated in the last 30 days, 11 from primary sources or
    publishers, 10 themes in 3 groups, first source row at 38 s; research step 156 s. AI Trends pack still gave
    nothing on students this month (reported on the card as "1 to look at").
  - read of run 4 themes: one K-12 theme ("Teacher training lags behind AI adoption in classrooms") and Title Case
    group names. Fixed: themes get the same population check as findings (`themes_other_population` event), group
    names go through sentence case. Deployed.
- Also deployed: improvement loop inputs (task_failed, took_too_long, soft_failed), live "subjects recurring across
  the sources so far" on the research card (`studio.recurring`), README and LOCAL Round 12, plan estimates scaled by
  the writer's measured token rate (`providers.slow_factor`). 517 tests.
- DECIDED NOT TO BUILD: auto-picked packs as removable chips on the plan card. Picking packs needs a model call (and a
  second model loaded), and the plan card must appear in under a second. The composer's pack picker and the
  engagement's default packs cover the choice before Start.
- RUNNING: four-output request in run 4's engagement (log pw/r4-four.log). NEXT: read its report, deck, journey map;
  update the plan page; ask for commit approval.
- 2026-11-24 night, CASE 3 ON THE SECOND-PASS BUILD (run 4, eng_25014f0d8d39), through the page: themes 282 s, then
  the four-output request 1,300 s (findings 202 s with 11 findings left out as other populations; report 122 s; audio
  script 84 s; deck 552 s; journey map 318 s, composite persona "Jordan"). 26.4 min in all. `rig/gate.py` passes on it.
- Read of run 4's report and deck: fixed afterwards and deployed: "ecosystem" and "research shows that" repaired in
  `prose.py`; a quote slide whose quote failed is relabelled THE EVIDENCE; ledger lines mark entries that share a
  publisher (Independence Rule). 519 tests pass. Final rebuild done, page smoke-checked.
- Plan page published as version 13 (second pass section, engagement screenshots x5 and x6, new "still open" list).
- OPEN, in order: (1) the Analyst's `about` label is trusted (one finding on Chinese teenagers was labelled "Chinese
  students"); (2) Cases 1, 2 and 4 not re-run on the second-pass build; (3) Gemini Notebook side by side (needs the
  owner's signed-in session); (4) scheduled pack ingestion into the local index; (5) three-lane scheduler; (6)
  Library dates and vector search; (7) commit approval from the owner (about 60 changed or new files, nothing committed).
- 2026-11-24, third pass. THIRD PASS (the stop check listed what was still open; each item below was built, 527 tests):
  - Three lanes: NEW `ia_next/lanes.py` (studio: two same-model pieces of work side by side, another model waits for
    an empty studio; card: one generating call or picture at a time, first come first served, memory budget, clock
    starts after the wait; network: 12 page reads). Wired in `providers.chat`, `providers.openai_image`,
    `localrank.embed`, `studio._page_text`, `plan._run` (replaces `_STUDIO`). `GET /api/lanes`. tests/test_lanes.py.
  - Local pack index: NEW `ia_next/packindex.py` (remembers every item a pack search returns, idle pass every 6 h
    for packs in use, FTS search by the question's words). `hic.pack_items` adds local hits and answers from the
    index when HiC is down. Routes `/api/packs/index`, `/api/packs/index/ingest`. First ingest: 299 sources of
    higher_ed, ai_trends and healthcare in 301 s, 259 items held. Note: AI Trends' newest item was dated 5 Nov.
  - Library: `libraryview.backfill` (date from the address or the opening text; a vector per row, 32 at a time) and
    `by_meaning` (search joins word matches with the closest sources by meaning). All 1,210 rows checked: 316 gained
    a date; every row has a vector. A sentence with no matching keywords returned 21 sources in 0.1 s.
  - Population check judges each group per source with the source's opening and the quote (the "Chinese students"
    label on a source about schoolchildren).
  - Gemini Notebook: the Notebook browser profile was in use and a live run needs the owner's sign-in (same block as
    the 9 Nov audit). NEW `rig/notebook_compare.py` measures an engagement's outputs with that audit's instruments
    beside the figures it recorded from the owner's real Notebook artifacts. Run 4: 55 citation marks to 10 dated
    sources and 0 figures in the writer's voice (Notebook: 0 citations, 2 to 6 figures); 9 of 9 slides editable with
    sources (Notebook: 15 full-slide pictures); 19 report quotes and 21 journey quotes found word for word.
- RUNNING: all four cases through the page on this build (pw/allcases.sh; logs f1, f2, f3a, f3b, f4). Case 1: 34 s
  on a cold model, seven dated stories.
- 2026-11-24, third pass, cases. ALL FOUR CASES THROUGH THE PAGE ON THE FINAL BUILD (rig/allcases.sh, then repeats):
  - Case 1: 34 s on a cold model, seven dated stories in chat.
  - Case 2: first 6.3 min, 40 sources but 13 themes: the fixed passage floor (0.40) removed 117 of 183 passages on a
    broad goal. Floor now follows the run (72 percent of the top quarter's score, between 0.22 and 0.40). Re-run:
    8.8 min, 39 sources, 28 themes in 7 groups, all with a checked quote (eng_faf4e112cd3a).
  - Case 3 (eng_fd2c50cb8e24): themes 7.6 min, 28 sources (pack index), 16 themes in 5 groups; report clean of K-12,
    false corroboration and banned words. With two studio slots the deck took 17.2 and the journey map 14.0 min side
    by side (sequential: 7.3 and 4.9): the model server keeps ONE prompt cache, so interleaved writers lose it on
    every call. STUDIO_SLOTS back to 1, shortest waiting work first (`lanes.typical`). Re-measured in the run 3
    engagement: audio 98 s, report 152 s, journey 292 s, deck 435 s; 19.6 min for the four with findings.
  - Case 4: report 267 s (36 sources). The prototype FAILED: my cited cards put web addresses in the page and the
    prototype's check refuses any address. Cards now carry title, site and date only (`prototype._site`). Re-run:
    3.8 min, cards cite S35, S36, S79, S100, chart titles written from the computation, 0 addresses in the page.
  - Gate: failed the first final-build runs on source_quality (13 of 28 strong) and on the two slow side-by-side
    outputs. `evidencequality.rebalance` now drops the least relevant unranked sites until 60 percent are publishers
    or primary sources. Final themes run (eng_d95a25964046): 7.8 min, 28 sources, 17 strong, AI Trends 3 kept from
    the local index, gate passed.
  - `rig/notebook_compare.py` on Case 3 final: 65 citation marks to 14 dated sources, 0 own-voice figures, 23
    verified quotes, 12 of 12 editable slides with sources (Notebook, 9 Nov audit: 0, 2 to 6, 0 of 16, 0 of 15).
- 530 tests pass. Final rebuild deployed. Plan page published with a "Third pass" section.
- OPEN: a live Gemini Notebook run (owner's signed-in session); pack feeds that never answer (60 of 226 in the last
  run); audio realism; commit approval.
- 2026-11-24, fourth pass. FOURTH PASS (the stop check listed five items; 535 tests, deployed):
  - Feeds: probe asked 116 suspects one at a time, 115 answered; `college_scorecard` and `hc_reddit_askdocs` hang and
    are set aside. Batches time out inside HiC whatever the concurrency (6 at once: 116 skipped; 3 at once: 90). So
    `hic.PACK_SEARCH_BUDGET = 75` s, most recently productive feeds first (`packindex.productive`), the rest from the
    index; idle ingest in batches of 3; `packindex.probe` on the idle pass. Three packs: 79 s (was 139 to 172 s).
  - Audio: `audio.liven` splits long factual turns and inserts the other speaker's reaction (one call, search seat;
    `config.AUDIO_EXCHANGES`, test marker `audio_exchanges`). Run: 49 turns, 11 exchanges. Fixed after reading it: no
    insert into a turn that is a question or has no pointer.
  - Plan card "Data packs" choice (`hic.quick_packs`, `packs_for_choice`, `plan._pack_option`, brief `no_packs`): seen
    in the page with the agent's picks.
  - Two at once: `lanes.card(holder=task id)` keeps the card with the writing piece for HOLD_SECONDS (2.0) between
    its calls. STUDIO_SLOTS default 2 again. Measured in eng_d95a25964046: deck 723 s and journey map 500 s side by
    side, 725 s wall for both (FIFO turn-taking: 1,031 s for the deck alone; sequential: 727 to 878 s). Long work
    waits up to 8 s at the studio door so short work started with it goes first.
  - OWNER stopped the deck and journey map by accident mid-run. Asking again returned the stopped cards (idem key).
    `store.create_task` now retires the key of a stopped or failed task so the request makes it again. Test added.
  - Gemini Notebook live: second attempt, the signed-in browser profile is in use by another program. Not done.
- Plan page published with a "Fourth pass" section. OPEN: live Notebook run (owner's sign-in); commit approval.
- 2026-11-24 (still the 24th: I had mislabelled the third and fourth passes as 25 Nov; corrected everywhere).
  RE-RUNS AFTER THE FOURTH PASS, through the page (pw/allcases3.sh):
  - Case 1: 13.6 s. Case 2 (eng "AI themes right now (fourth pass)"): 414 s, 30 sources, 21 themes in 6 groups, gate
    passed. Audio there: 85 s, 24 turns, 5 min, 3 exchanges, no doubled question.
  - Case 4 "Research what changed this week ..., write a short report, then build a prototype ...": three faults.
    (1) report written from held evidence: `plan._FRESH` now treats an order to research, "what changed" and a short
    period as a request for new collection. (2) goal garbled ("a short a of a staffing planner"): `router.subject_of`
    takes the clause that names no output. (3) a 7-day report cited 3 older held sources and failed sources_current:
    `studio.in_period` limits a dated run's findings to its period. Final run: report 677 s (13 new sources, 24 of 30
    cited from the last 7 days, check passed), prototype 308 s.
- 537 tests pass; final rebuild deployed; plan page republished.
- OPEN: live Gemini Notebook run (owner's sign-in); a one-week question is thin (5 of 13 new sources strong) and took
  11.3 min; audio can leave two turns by one speaker when the check cuts an answer; commit approval.
- 2026-11-24, fifth pass (the stop check: weekly question thin and slow, audio turn order). 540 tests, deployed.
  - `studio.wants_short`: "a short report" pulls about 14 findings and writes 3 or 4 sections.
  - `localsearch.grounded` sorts candidates by source tier before its cap.
  - `audio.settle`: an unanswered question is dropped and two statements by one speaker are merged. New script: 34
    turns, none by the same speaker twice in a row.
  - Found on the way: the pack choice's default was not applied when left alone (`plan.apply_options` now sets
    "auto"); a second weekly request failed with "only 3 sources" because the first had collected the week's pages
    (`research_lead` counts held in-period sources toward the minimum).
  - Measured through the page, new engagement "Universities and AI this week", no pack selected: 322 s; research 116,
    analyst 120, writer 87; 12 sources, 11 from the last 7 days, 12 of 12 strong; Higher Ed pack picked by the agent;
    sources_current and source_quality pass. (The nurse engagement's weekly report: 594 s with 60 held sources.)
- OPEN: live Gemini Notebook run (owner's sign-in); commit approval (owner's standing rule).
- 2026-11-24. Live Gemini Notebook run, third attempt: the automation browser profile
  (ms-playwright-mcp\mcp-chrome-38fa3fc) is held by a Chrome started 23 Nov 08:10 under a different Playwright
  server process (node pid 2132), which is another session's browser. Not closed: it is not this session's to stop,
  and whether it is signed in to Google is unknown. BLOCKED on the owner: either close that browser or run the
  Notebook side by hand; `rig/notebook_compare.py <engagement id>` gives our column.
- Commit: BLOCKED on the owner's approval (standing rule: no commit without it). 58 changed or new files, 540 tests.
- 2026-11-24. OWNER APPROVED THE COMMIT (no push): ce385dc47 on ia-next-local-2026-11-19, 80 files, generated case
  outputs (plans/field-test-2026-11-23/out) left out. Owner chose to keep the audit comparison, then closed the other
  browser session and asked for a retry.
- LIVE GEMINI NOTEBOOK, read only (nothing created or changed in the account): existing notebook "Students and
  Artificial Intelligence in Education" (17 sources, 20 Nov) with briefing, 20:36 audio, deck, infographic, quiz,
  flashcards, mind map. Briefing measured: about 3,100 words, 125 sentences, 51 with a figure in the writer's own
  voice, 0 links or citation marks (5 bracketed organization-and-year attributions), 11 quoted fragments, sources
  2023 to 2026, teens or K-12 named 9 times, 0 sentences about the document. Ours (final Case 3 report): 65 marks to
  14 dated sources, 0 own-voice figures, 23 of 23 quotes verified, all sources from the last 30 days.
  Notebook is ahead on density of named studies and figures and on audio length; ours on traceability, currency and
  population. Plan page republished with the live table.
- OPEN: nothing blocked. Push is the owner's call.
- 2026-11-24, after the commit. Live Notebook deck: 14 slides, each one 1376 x 768 picture, no slide text in the
  page; cover subtitle garbled. Audio 20:36.
- Named evidence: `localwriter._reported_by` writes the publication and month in front of every quote
  ("eCampus News, November 2026: "..." [S2]"). Seen through the page: research report in 117 s, 16 findings, 12
  sources, 0 open, all checks pass (task_11610fa53dbd).
- "Write a short report for a provost from these findings" routes to the document builder (artifact, kind report):
  648 s, and a false "Needs review (no_cut_sentences)" because the source's own quote held an ellipsis. The check now
  counts only text that ENDS on an ellipsis; the task re-scored clean. 542 tests. Deployed.
- OPEN: the document builder's time (10.8 min for a short report; the research report takes 2); Notebook's picture
  slides are more striking than our editable ones; push is the owner's call.
- 2026-11-24, sixth pass. OWNER: "Uplift where we still trail" (document builder speed, deck design, figures per page).
  - Routing: a request that asks for a "report" and names no other document kind goes to the research report by rule
    (`router.route`). Seen in the page: "Write a short report for a provost ..." planned in 2.9 s and written in 105 s,
    all checks pass (it had gone to the document builder: 648 s).
  - Reports open with "The figures at a glance": up to six verified quotes that carry a figure, one per source first,
    each introduced by publication and month (`localwriter.render`, `evidencequality.has_figure`; a year is not a
    figure).
  - Decks get one code-built slide "Sources report these figures in their own words": two or three cards headed by
    publication and month, each a verbatim quote that carries a figure (`deckstudio.figures_slide`,
    `config.DECK_FIGURES_SLIDE`, test marker `deck_figures`). Seen in the page (task_416613fe5278, slide 11): two cards,
    no hard failure. Its sources are listed last card first so the quote check reads the right source.
  - Document builder (generic documents, one 12,000-token call): medium effort cut a white paper from 610 s to 174 s
    and the reviewer failed it (score 0.0, claims wider than sources). REVERTED to high effort. Not fixed: these
    documents (white paper, brief, explainer and the like) still take about 10 minutes; writing them in steps is the fix.
  - Not done on purpose: Notebook's stat-dial slides state bare figures, which the owner's Quantitative Claim Rule
    forbids (no KPI tile without its quote). Our figures stay inside quotes.
- 546 tests pass. Deployed. UNCOMMITTED: router.py, localwriter.py, deckstudio.py, evidencequality.py, config.py,
  localartifact.py (comment only), tests, this log, the plan page. Needs the owner's approval to commit.
- Sixth pass committed with the owner's approval: f0bcc3d70 (fourth commit, not pushed). Owner also said: build the
  stepped document writer now.
- BUILT: `localartifact.generate_in_steps` (PLAN_SCHEMA, SECTION_SCHEMA; plan at high effort, each section its own
  call at medium effort, material first in every call; `config.DOC_STEPS`, test marker `doc_steps`). 547 tests.
  Measured through the page, same engagement: white paper 403 s (371 s author, 32 s reviewer), reviewer score 1.00,
  no hard failure (task_5bd38e30a468). Before: 648 s at high effort in one call (score 1.00); 202 s at medium effort
  in one call (score 0.00, reverted). One measurement.
- UNCOMMITTED: localartifact.py, config.py, tests (conftest, test_evidencequality), this log, the plan page.
- 2026-11-25. Stepped document writer committed with approval (b4d62a76e). Second timing: an explainer on the
  28-source engagement took 822 s (reviewer 1.00), so the stepped writer is faster only on small engagements
  (403 s on 12 sources). Documents on large engagements remain slow.
- Figures set large inside their quotes on the deck's figures slide (`deckstudio._figure_parts`, `_txt_figures`; page
  and editable PowerPoint). Seen in the page: task_b975c9e94d85, slide 10, deck 496 s, no failed check; PowerPoint
  runs are 31 pt bold for the figure and 18 pt for the rest. 548 tests. Deployed. UNCOMMITTED: deckstudio.py,
  tests/test_evidencequality.py, this log.
- OWNER (25 Nov): wants to run a human QA across all artifacts once every job has stopped. All jobs stopped; no
  further runs started.
- NEXT FIX, designed, NOT built (no job may run during the owner's review): in `localartifact.generate_in_steps`, give
  each section call only the `<source>` blocks whose ids its plan line (`covers`) names, falling back to the whole
  material when fewer than two are named. Every section call currently reads all the material, which is why a
  28-source explainer took 822 s. Measure on the 28-source engagement (eng_d95a25964046) against 822 s and the
  reviewer score.
