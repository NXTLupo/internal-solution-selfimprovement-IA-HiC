# IA Next Local: plan for the enhancements of 25 Nov 2026

This plan builds what `ENHANCEMENTS-NEEDED.md` records (E1 to E9; E4 is withdrawn). The owner's instruction is to
build the plan and execute it now. Read this file first when resuming: the status table is kept current.

## Rules for every workstream

- **General, never the example.** Each change is driven by the request, the audience and the evidence. No rule is
  keyed to one subject, sector, pack or brand. Each is checked on unrelated subjects before it is called done.
- **Root before symptoms.** Four items (E2, E3, E6, E7) are one problem: detailed work resting on little evidence.
  Collection is fixed first; each output is then verified against it.
- **Subject before depth.** E9 comes before E2: more searching with a bent subject collects more of the wrong thing.
- **Use what exists.** The citation protocol in `.claude/CLAUDE.md` and the skills `evidence-curator` and
  `source-ranker` were read on 25 Nov and are the basis of the citation work. What they require: a verbatim quote
  with the real source named (publication and title, or speaker and role); no generic references; a figure only
  inside its attributed quote; sources ranked on credibility, recency, relevance and class; at least 60 percent of
  cited sources external.
- **How HiC searches a pack (read 25 Nov, `proxy/app.py` `multi_search`, `services/researchPlanRunner.ts`):** it asks
  every source of the pack for up to 10 items per query, 8 sources at a time, once per sub-question of the research
  plan. IA Next Local asked each source for 2 to 5 items with one keyword string and kept at most 20 to 30.
- **Safety:** tests before every rebuild; rebuild only when no task is running; no commit without the owner's
  approval; nothing pushed.

## Workstreams, in order

| # | Workstream | Covers | Status |
|---|---|---|---|
| A | The request governs: subject apart from brand, audience and settings; words in the request set the card's choices; work is filed where the message box says; the plan shows the understood subject and what is carried over | E9, notes under E4 and E8 | Built, tested, checked through the page |
| B | Cards update in place: nothing blinks, whatever is opened stays open; sources and themes open in a panel for reading and questions while the run continues; details are accurate | E1, E5 | Built, tested, checked on a live run |
| C | Deep research searches the whole pack the way HiC does, and scales findings with it; every claim shows publication, title, date and link everywhere | E2 | Built, tested, checked on a live run; period question open for the owner |
| D | Depth reaches every output: more substance per page, named cases from comparable organizations, a stated evidence base, a minimum per detail level, a warning at the plan when evidence is thin | E3, E7 | Built and tested for deck, journey map, document; deck checked live |
| E | Visual outputs: typographic hierarchy from brand tokens, no empty blocks, varied treatments, detail honoured; compared with Gemini Notebook | E6 | Built; previews drawn for three brands and four shapes; one live poster read; Gemini Notebook comparison is the owner's judgment |
| F | The assistant is always ready: the conversation model is brought back in the background after work that unloads it | E8 | Built, tested, checked after a restart |
| G | Documents: each section reads only the sources its plan names (deferred from 24 Nov) | carried over | Built and tested; not yet timed on a large engagement |
| H | Infographics always carry their pictures: every idea shows its illustration with or without a quotation, the lead idea the largest; picture colours from the brand tokens; the stand-in scene from the subject; the result says so when pictures could not be made | E10 | Built and tested; previews drawn with real illustrations in two brands; live run recorded in the Log |
| I | The period is the user's choice: named in the request (more phrasings read), chosen on the plan card, or saved on the engagement, it is the period every step uses; a longer period reads further back into each feed; period and audience words stay out of the subject | E11 | Built and tested; live run recorded in the Log |
| J | Approved media is followed to its end: started, ready or failed is recorded and shown on its card; a restart makes it again; `GET /api/busy` lists everything a restart would end | E12 | Built and tested; the owner's clip resumed after the rebuild (result in the Log) |
| K | An incomplete recording is refused at upload with the reason, shown on the upload chip | E13 | Built and tested; checked with the owner's file through the upload route; the chip text is not yet deployed |
| L | An attached recording is a request of its conversation: its transcript is tied to the conversation, a card per recording appears at once with its steps, a status line and a notice say when it is ready, the transcript attaches itself for the next message, the card offers "Use in my next message", the downloads and next steps; any number of recordings, one after another; questions about them are answered from their records | E14, E15 | Built, tested, checked through the page with three recordings |

## A. The request governs (E9)

1. `router.subject_of` and the plan's subject: remove brand phrases ("in the X brand", "X branding", brand hashtags)
   and audience phrases ("for faculty to understand", "for a provost") from the subject; keep the audience as the
   audience. Driven by the list of brands the system holds, not by one name.
2. Words in the request set the card's choices: brand, shape (portrait, landscape, square), detail (concise,
   standard, detailed), depth (deep words), period. A choice stated in words is the card's starting value.
3. The research brief carries subject, audience and brand as separate fields; the search planner is given the
   subject only.
4. The plan card shows "Subject understood as" apart from brand and audience, and "Carried over" (held evidence,
   engagement defaults, reused pages).
5. The engagement shown in the message box is the one used; "New engagement" makes a new one.
6. Check: request pairs that differ only in brand or only in audience give the same subject and the same queries
   (unit tests over at least ten pairs across unrelated subjects; then through the page).

## B. Cards update in place (E1, E5)

1. A card keeps its DOM between refreshes: text and counts change in place, rows are added, nothing is rebuilt.
   Open state of every disclosure, scroll position and selection survive.
2. The subjects block changes only when its data changes, and is filtered for page furniture and population.
3. A source row and a theme or subject open a side panel with the full text, publisher, date and link, and a box to
   ask the assistant about it. Reading and asking never touch the run.
4. Details: readable lines, the model actually answering while running, no cost line in this build, correct labels.

## C. Deep research across the whole pack (E2)

1. On a deep request the chosen packs are read whole into the local index first (every source, 10 items each),
   with progress on the card, when the index for that pack is older than six hours.
2. Search the index with every planner query, not one keyword string; rank by meaning against the subject; keep in
   proportion to depth (deep: up to 60 pack sources, 4 per publisher) with the publisher mix reported.
3. Findings scale with the sources read, not a fixed total.
4. Citations everywhere: Evidence card, live card, themes, reports, decks, journey maps and transcripts show
   publication, article title, date and a link to the passage; quotes are marked as quotes.
5. The card states pack coverage: sources in the pack, searched, answered, contributed.

## D. Depth reaches every output (E3, E7)

1. Depth and detail are passed to every builder; each has a shape per level (slides, sections, phases, blocks).
2. Research looks for named cases from comparable organizations when depth is deep; builders reserve room for them.
3. Each output states its evidence base (sources, findings, publishers, period).
4. A minimum body of evidence per kind and level; under it, the plan says so before Start and the result is marked.

## E. Visual outputs (E6)

1. Infographic and poster blocks: a dominant statement, sized type from brand tokens, varied block treatments,
   content sized to its block; detail changes how much each carries.
2. Side by side with Gemini Notebook for the same subject, judged by the owner.

## F. Always ready (E8)

1. When work that unloaded the conversation model ends and the card is free, load it back in the background.
2. Unload only when the memory is needed. Requests routed by rule show their plan card without waiting for a model.

## G. Documents

1. Each section call receives only the sources its plan line names; measured on a large engagement.

## Log

- 25 Nov: plan written. Citation experts and HiC's pack search read. Workstream A started.
- 25 Nov, A built (`router.presentation_free`, `router.stated`, `plan.understood`, `agent._new_engagement_for`):
  brand, audience and setting words leave the subject for any brand and audience; words in the request set the
  card's shape, detail, depth and brand; the card shows "Subject understood as", "For", "Filed in" and "Carried
  over"; with "New engagement" showing, work is filed in a new, empty engagement whatever the model passes, and a
  request the rules can place gets its card with no model call. Data packs are picked from the subject, never the
  audience. Tests: `tests/test_request_governs.py` (25 brand and audience variants on each of five unrelated
  subjects give one subject). Page check: a DECIEM infographic for a board on insurance claims, plan card in 2.8
  seconds, subject clean, new engagement, Portrait, Detailed, DECIEM and Deep preselected.
- 25 Nov, B built: a running card is updated in place (`paintTask`, `web/app.js`), so "Details" stays open and no
  row replays its entry animation. Cause of the blink found: each repaint re-attached the live view, which replayed
  every row's animation. Subjects are redrawn only when they change and never hold page furniture
  (`studio._FURNITURE`, `studio._prose`). Every source, finding, subject and theme row opens a reading panel with the
  full text, publication, date, link and a box to ask about it (`/api/engagements/{eid}/reading`, `/mentions`,
  `/ask`; `answers.ask`). A question takes the next turn on the card ahead of the running work (`lanes.URGENT`) or
  runs on the processor, so the run is never stopped. A question typed in the conversation about the focused
  engagement is answered the same way while work runs. Details now reads as steps in words with the model answering
  now (`store.note_model`), and the cost line is gone. The label "Information Designer (HiC renderer)" was checked
  and is accurate: HiC's renderer draws the picture.
- 25 Nov, F built: the conversation model is loaded in the background when the studio goes quiet and when the app
  starts (`providers.ready_soon`), with the context its calls use, so no reload follows. A picture frees only the
  memory it needs (`localmedia._free_language_models`). Idle keep-alive raised from 30 minutes to 2 hours. Checked:
  after a restart the model was in memory about 100 seconds later with no message sent.
- 25 Nov, C built: a deep request with data packs reads every source of each pack, ten items per source, once per
  question of the research plan (`packindex.read_whole`), two sources at a time on four lines, with a time allowance
  of four minutes and a six-hour freshness rule. It then searches everything held with every question, ranks by
  meaning against the subject (`localrank.scores`), keeps up to 60 pack sources at four per publisher, reads the
  short ones in full side by side, and takes findings in proportion to the sources read (up to 90). The card states
  how many of the pack's sources were read and answered. Every finished page gains publication, date and address on
  each Sources row and a "Built on" line (`citations.py`, run when a task finishes). The Evidence card names
  publication, article and date on every finding and opens the source at the quote.
- 25 Nov, D built: one detail level (`depthlevel.py`) is decided from the card and the request's words, written
  into every task's brief, and read by the builders: deck 16 to 20 slides with at least three named-case slides
  (10 to 13 standard, 6 to 8 concise) and closing slides that list each cited publication, article and date;
  journey map six to eight phases with two or three more quotes each; documents seven to ten sections of three to
  five paragraphs. Deep research asks for named cases from comparable organizations. The plan says when the held
  evidence is thin for the level asked, and switches research on for detailed work.
- 25 Nov, live run through the page (new engagement, Healthcare pack, "a detailed slide deck in the DECIEM brand
  for hospital operations leaders to understand nurse retention in US hospitals"): the stored goal was "nurse
  retention in US hospitals", the audience its own field, level detailed. All 200 sources of the pack were read in
  201 seconds; 83 held items on the subject. 25 sources were kept (20 inside the last 30 days), 28 on-subject
  articles were left out only for being older than 30 days, and 23 findings passed their checks. The deck: 22
  slides in 12.4 minutes, three CASE slides on named organizations, two closing slides that list each cited
  publication with its date. On the running card: "Details" stayed open and updated in place for the whole check,
  no row replayed its animation, a source opened in full with publication, date and link, and a question about it
  was answered in 12.7 seconds while the run carried on.
- 25 Nov, found on that run and fixed: an off-subject article reached the card before the relevance check (deep
  candidates below the relevance line are now never read or shown); the subject panel listed menu text (sentences
  only); the deck put its closing slide twelfth of twenty (closing slides now end the deck); the deck cited 8 of 25
  sources (the storyline is told to spread across sources); the DECIEM lockup's 8 pt artwork marked the deck
  "Needs review" (a brand lockup is no longer counted as reading text); source tables are four rows a slide at the
  deck's reading size.
- 25 Nov, G built (`localartifact.only_sources`): each section call carries only the sources its plan line names,
  with the checked findings that cite them.
- 25 Nov, E built (`illustrated.page`): the headline is sized to its length, the point of the page sits on a band
  in the accent colour, the lead idea runs across the full width, every idea carries a numeral, some ideas are led
  by their quotation, no cell is left empty, and a portrait poster grows taller with the number of ideas instead of
  shrinking its type. Brands that set titles in capitals get more room. All colours and faces come from the brand
  tokens. Every section the designer writes can now reach the canvas (the detailed setting had shown four ideas of
  eight). Previews: `plans/field-test-2026-11-23/rig/poster_preview.py`.
- Open for the owner: (1) whether a deep request should default to a longer period than 30 days, since the period
  was what limited the live run; (2) the side by side of the new poster with Gemini Notebook; (3) spelled-out
  figures still reach some deck titles; (4) audio and data tables have no shape per level yet; (5) G is not yet
  timed on a large engagement.
- 25 Nov, later live runs on the same engagement: a detailed portrait infographic in 3.4 minutes (the new poster;
  it showed four ideas of eight and clipped two captions, both fixed afterwards and re-drawn in preview, not yet
  re-run live); a detailed journey map whose plan card said the held evidence was thin for a detailed map and
  switched research on, then mapped six phases with 27 quotes found word for word in 5.9 minutes. Its page states
  "Built on 4 of the 31 sources this engagement holds", which showed the map still drew on few sources; the
  detailed map is now told to spread its quotes across sources (not yet re-run live).
- 25 Nov, finished pages made on less evidence than their level needs now say so in their "Built on" line.
- 25 Nov, later, two more items from the owner (E10, E11), built as H and I.
  H: the E6 redesign had put the quotation in the picture's place on the lead idea and on quote-led ideas, and the
  preview that checked it drew empty picture slots. Every idea now shows its illustration (`illustrated.page`), the
  lead idea the largest; the picture style takes its colours from the brand tokens (`illustrated.style`) and its
  stand-in scene from the subject; the picture engine gets its own list of things to avoid for a drawing; the result
  says so when pictures could not be made. The preview rig now draws with real illustrations.
  I: an engagement's saved period was shown on the plan card and not used by the run, because the page sends only a
  changed choice (`store.create_task` now applies it); "90 days out", "a 90-day window", "going back six months" and
  "three months of coverage" are read as periods (`currency._SPAN_LEAD`, `_SPAN_TAIL`); a deep read asks each feed for
  20 items at 90 days and 30 beyond (`studio.per_source_for`); themes use the chosen period; messages name the plan
  card's "Evidence from" choice; period words and an audience named after an output stay out of the subject
  (`router._period_free`, `_FOR_AFTER_OUTPUT`).
- 25 Nov, live run through the page (new engagement, Retail & Commerce pack, "Make a detailed portrait infographic
  in the DECIEM brand for store operations leaders on warehouse automation in grocery retail, going back 90 days"):
  subject understood as "warehouse automation in grocery retail", for "store operations leaders"; the run's recorded
  period was the last 3 months "the request says going back 90 days"; 36 sources kept, 33 dated inside the period,
  7 of them older than 30 days, the oldest 79 days; 34 checked findings; the poster shows 8 ideas and 8
  illustrations in the DECIEM colours. Whole run 22 minutes (research 13, poster 8); the first source reached the
  card after 6.8 minutes, since each feed was asked for 20 items.
- Read on that poster and still open: the 8 ideas came from 3 of the 36 sources (a detailed infographic is now told
  to spread across sources, not yet re-run); one title carries a spelled-out amount; one source is named "report";
  the first illustration drew its idea too literally (a turkey on a robot).
- 25 Nov, later still, two more items from the owner (E12, E13), built as J and K. The owner approved a 5-second
  clip while Claude was rebuilding the app and making preview pictures on the same engine; the rebuilds ended the
  clip's thread and its card said "being made" for an hour. J: `media.run_approved` records started, ready and
  failed; `media.recover` makes a cut-off clip again at start-up; `GET /api/approvals/{id}/video` gives its card the
  state; the card looks for an hour, not six minutes; `GET /api/busy` lists tasks, running plans and approved media.
  After the rebuild the owner's clip resumed by itself and was ready 3.5 minutes later (5.04 seconds, 864 by 480,
  with sound). K: the uploaded "studentA (1).MOV" was 53.8 MB of a recording that states about 900 MB;
  `videotranscript.container_problem` refuses such a file at upload with the reason, and the upload chip shows it.
- 25 Nov, L built on the owner's instruction (the use: an interview recording as the basis of a study guide, and
  several recordings at once). Server: the upload carries its conversation and `store.link_task` ties the transcript
  to it; `agent.recordings_reply` answers "transcribe the attached video" and "is it done" from the transcripts' own
  records before any model call; `agent.plain_failure` words a failure; a finished transcript is noted in the
  assistant's memory. Page: `recordingsEl` (the request, a status line, one card per recording), the finished card's
  "Use in my next message", the next steps for a transcript, the card named for its recording.
- 25 Nov, checked through the page with three recordings attached at once (8:38, 3:06 and 0:05 of sound): the first
  card was in the conversation 0.3 seconds after the upload was accepted; "transcribe the attached video files" was
  answered in 3.8 seconds with each recording's state; all three were ready after 5.4 minutes, the status line said
  so, each transcript attached itself to the conversation, and the cards offered the downloads and next steps; a
  question about the first recording was answered with a sentence quoted from its transcript, in 93 seconds (slow:
  the conversation model had been unloaded for Whisper). Found and fixed after that run: the three cards carried the
  engagement's name, and waiting recordings said "being transcribed now". The owner's 198 MB recording could not be
  used for this check: the test browser cannot be handed a file over 50 MB.
- 25 Nov, E16 (files are the person's; work from files alone), built and checked through the page; detail in
  ENHANCEMENTS-NEEDED.md. Two full runs of the owner's request, in a new conversation, filed in "Higher ed students
  and AI (gate run)" and made from its uploaded files only: a detailed deck of 18 slides in 11 minutes (one verbatim
  quote, one open check: an empty line on "Sources, continued"); then, after the quote instruction and the sources
  slide fix, a standard deck of 12 slides with 3 quote slides from 3 different files and no open check.
- Read on the second deck and still open: the quotes are spoken sentences with their filler ("like", "kind of"),
  which the owner's rule for finished work does not allow; a transcript quote needs a clean, complete sentence.
- 25 Nov, quotes from recordings. A full detailed deck from the owner's files with the clean-quote rule alone carried
  one quote in 19 slides (five dropped as raw speech) and two pairs of slides that said the same thing. The deck
  writer is now handed the clean sentences it may quote (`evidencequality.quotable`), and a slide that repeats an
  earlier one in other words is dropped. Full run after that: 17 slides in about 11 minutes, 3 quote slides, each a
  clean sentence found word for word in its file, from 2 of the 11 files, no failed check, no repeated slide.
  Read on it and still open: two of the three quotes sit loosely under their slide's title, the deck has two closing
  slides, and titles carry odd capitals ("Step-by-Step", "AI-Guided").
- 25 Nov, E17: recommended models against installed, and the image side by side, in ENHANCEMENTS-NEEDED.md. No model
  was swapped; the image seat waits for the owner's decision.
- 25 Nov, further full runs of the files-only deck, each read slide by slide, and what each changed:
  quotes placed by shared words put clean sentences under points they did not make (one named a student's school),
  so a spoken quote is now placed by meaning with the research's embedding scorer (`deckstudio.fit_quotes`: the
  writer's own clean choice is kept from 0.50, another sentence replaces it only from 0.62), and a sentence that says
  who the speaker is (age, school, name) is never quoted; one closing slide ends a deck; titles are sentence case,
  through hyphens and in mid-sentence, with names kept; a figure of speech in a title is a title problem the repair
  pass rewrites; "to summarize" as a verb is no longer flagged as meta-narration. Last full run: 19 slides in about
  11 minutes from the 11 files, one quote slide, on its point ("Usually it's enough if I just upload a screenshot of
  my math homework." under "Students use AI for step-by-step math help"), one closing slide, no title problem, no
  failed check. Raw interview speech holds few clean sentences that make a slide's point, so such decks carry few
  quotes; speaker labels from the recommended speech model (E17) would raise that.
- 25 Nov, image seat swapped to MOSS-Image-SFT on the owner's decision (E17), and both artifact kinds run end to end
  on it through the page, from the owner's 11 files only. Deck: 17 slides, 5 pictures, 2 quote slides (each clean,
  word for word, on its slide's point, from 2 recordings), one closing slide, no title problem, no source id in any
  visible text, no open check, no failed check. A deck photograph read at full size: a student writing in a notebook
  beside a laptop, hands correct. Infographic: 8 ideas, 8 illustrations in the Northeastern colours, from 5 files, no
  substitution to the fallback model. Read on the infographic and fixed after it: its quote lines were fragments of
  speech and one named the speaker's college; a poster's quote from a recording is now a clean sentence that does not
  say where the speaker studies, or it is absent (`illustrated.proof`). Also from these runs: the storyline of a deck
  made from recordings is planned around the clean sentences they hold, and source ids are removed from every text a
  reader or presenter sees (`deckstudio.strip_source_ids`).
- 26 Nov, chat responsiveness (owner): "what are the top use cases for AI with students based on the uploaded
  transcripts" took about five minutes. The focused engagement was empty, so the quick answer failed and the model
  fell into eight tool steps; and Qwen had to load, because its two-hour keep-alive expired overnight. Fixed: a
  question or a digest ("summarize the interviews", "key themes from the transcripts") about the person's data is
  answered in the chat in one call, from the focused engagement when it holds material, else from the engagement
  with the latest files, and the reply names it (`agent.answer_home`, `plan.is_data_ask`); a question that names the
  files reads only the uploads (`agent.file_ids`); chat answers read half the passages (`answers.CHAT_BUDGET_CHARS`);
  speech is quoted only as a clean sentence from inside the quote, else the point stands alone; when nothing holds
  material the reply says so at once. The conversation model has no idle expiry (`providers.keep_alive`) and a
  ten-minute watch reloads it if pushed out. Through the page: the same three questions answered in 26 to 31 seconds
  from the transcripts only.
- 26 Nov, header (owner): the NXT Humans logo in the rail and the top bar on narrow screens; the top bar title reads
  "Intelligence Augmentation: Deep Research Workbench" (shortened to "Intelligence Augmentation" under 1000 px,
  hidden on phones); tab title "Deep Research Workbench".
- State at the end of the day: suite 624 passed, 24 skipped; the running app is built from this tree; nothing is
  committed.
