# IA Next Local: enhancements needed

From the owner's human QA of real-world use, started 25 Nov 2026. The owner reports each item; it is recorded here
in the owner's terms, with what "done" means and what is known about the cause. Nothing here is built yet. Items are
numbered in the order reported.

## How every enhancement here is scoped (owner's rule, 25 Nov 2026)

Each enhancement is reported from one run, and that run is only the evidence. The enhancement itself applies to
**every** user, research objective, data pack, brand and kind of output (report, deck, themes, journey map,
prototype, audio, document), wherever the same behaviour appears. Nothing here is to be solved for the one case
that exposed it. A fix that works only for the example in the screenshot is not done. The subject, pack, brand and
engagement named under "Reported from" are examples, never the scope.

| # | Enhancement | Area | Status |
|---|---|---|---|
| E1 | The live research card must not blink, and its sources and themes must open for reading and conversation without disturbing the run | Live research card | Open |
| E2 | Deep research must search every source in the chosen data packs, as HiC does, and every claim must carry a detailed citation | Research depth and citations | Open |
| E3 | Any output made from detailed research must be as deep as the research: more substance per page and named cases from comparable organizations | Depth of outputs | Open |
| E4 | The user can choose the brand for every kind of output, in the message box, before sending | Branding | Withdrawn by the owner, 25 Nov |
| E5 | Anything the user opens on a running card stays open, and the process details it shows are accurate, live and readable | Running cards | Open |
| E6 | Designed visual outputs need typography with real impact, to the Gemini Notebook bar, and must honour the detail the user asked for | Visual design and depth | Open |
| E7 | Every output built on evidence must rest on a body of evidence that matches the detail requested and the data pack chosen, and must show how much it rests on | Evidence behind outputs | Open |
| E8 | The assistant answers at once: the conversation model is never left unloaded, so no message waits a minute and a half for it to load | Responsiveness | Open |
| E9 | The current request alone sets the subject and perspective of the work; brand, audience, earlier engagements, earlier conversation and stored memory never change it unless the user asks | Prompt adherence and isolation | Open |
| E10 | Images or illustrations always accompany an infographic, fitted to its subject and its brand | Visual design | Open |
| E11 | The period research collects from is the user's choice: a period that is selected or named (for example 90 days) is the period the run uses | Research period | Open |
| E12 | An approved video is always made or says why it was not; it shows its progress and survives a restart of the app | Media | Open |
| E13 | A recording that cannot be transcribed is refused at upload with the reason, in words a person can act on | Transcription | Open |
| E14 | When a person asks about, or asks for, work that is already running or has already failed, the assistant answers about that work in plain words: it never presents the person's own running work as something in their way, and never passes on a decoder's error as the reason | Assistant replies about work | Built for every kind of work and checked through the page (26 Nov) |
| E15 | Work started by attaching a file shows its card in the conversation at once, and its result arrives in that conversation when it is done | Cards for attached files | Built and checked through the page with three recordings |
| E16 | Files are the person's, not an engagement's: any uploaded file can be used for an analysis or an artifact in any engagement, alone if the person wants; each engagement keeps in context the files uploaded in it | Files | Built, tested, checked through the page (plan card and file picker); full deck run recorded in the Log |
| E17 | The models the build brief recommended are installed and compared on this machine; none is replaced by a model that happened to be on disk, and none is swapped in if it slows the system or lowers quality | Models | Image seat swapped (owner's decision); speech, scanned pages, embeddings and screenshot judge measured side by side, see E17 |
| E18 | The app looks like professional enterprise software: a dark navigation set off from the white workspace, the NXT Humans logo in white, a taller header, a Library that is easy to navigate, and every right-hand panel in the Library's visual language | Interface and branding | Built and checked through the page: all 19 panels opened and photographed |
| E19 | The chat feels responsive: an answer shows in the conversation as it is written, and the checked reply replaces it | Responsiveness | Built and checked through the page (26 Nov) |

## The pervasive theme (owner, 25 Nov 2026)

The owner has now reported the same failure four times, in four kinds of output: **work requested at a detailed
setting, with a data pack of hundreds of sources chosen, comes back resting on very little evidence.** It appears
as thin findings (E2), a shallow deck (E3), a shallow infographic (E6) and a journey map built on six sources (E7).

These are one problem with one root, not four. The root is in E2: the research does not search the whole pack and
caps what it keeps. E3, E6 and E7 are what that looks like downstream, plus each output's own failure to use what
evidence there is. Whoever builds this should fix the root first and then verify every kind of output against it,
not patch each output separately.

---

## E1. The live research card blinks, and nothing on it can be opened

Reported from (an example, not the scope): 25 Nov 2026, a deep research run. Screenshot: `img/e1-live-card.png`.
Applies to every running card that shows work arriving (research, themes and any output that streams its progress).

### What the owner sees

- The card that shows incoming sources and emerging themes is the right pattern, and should stay.
- The themes keep blinking while the run is in progress. It is visually jarring.
- Nothing on the card can be opened. A theme cannot be read in full, a source cannot be opened to read the article
  or data source, and there is no way to talk to the assistant about what is arriving.

### What is needed

1. **No blinking.** A theme or subject that is already on the card stays still. New ones arrive without the existing
   ones being redrawn, and a count that changes updates in place.
2. **Open a theme.** Selecting a theme opens it in full: its statement, the passages behind it, and the sources
   those passages come from.
3. **Open a source.** Selecting a source opens the full article or data source for reading, with its publisher, date
   and address.
4. **Talk about it.** From an open theme or source, the owner can ask the assistant about it and get an answer
   grounded in that theme or source.
5. **The run is not disturbed.** Opening, reading and conversing never pause, slow, restart or redraw the research
   run, and the card keeps updating behind the open panel.

### Done means

- Watched for a full deep research run, no theme or subject on the card flickers, jumps or re-animates.
- A theme and a source can each be opened and read in full while the run is still going, and closing the panel
  returns to the same place on the card.
- A question asked about an open theme or source is answered while the run continues, and the run finishes in its
  usual time with the same result.
- Checked by a person in the page, not only by a test.

### Known about the cause (from the code, not yet confirmed in the page)

- The card polls every few seconds. On each poll the "subjects recurring across the sources" block is rebuilt from
  scratch and re-inserted at the top of the card (`web/app.js`, about lines 1158 to 1165), even when nothing changed.
  That is the likely source of the blinking. Sources and findings rows are only added once, which is why they do
  not blink.
- The block the owner calls themes is, during collection, a list of word pairs that two or more sources share. It is
  made in code and is not the named themes that come later. Opening one "in full" therefore needs a decision: show
  the passages and sources that share the subject now, and the named theme once it exists.
- The Library panel already opens a source in full, and the finished themes page already shows a theme's passages.
  Neither is reachable from the running card.

### Also visible in the same screenshot (noted by Claude, not reported by the owner)

- Two of the subjects are page furniture, not subjects: "getty images" and "main content". The filter that keeps
  page furniture out of themes is not applied to this block.
- "high school" appears in a run about higher education, so the population check is not applied to this block
  either.

---

## E2. Deep research over a data pack returns thin evidence, and its claims carry no citations

Reported from (an example, not the scope): 25 Nov 2026, the Evidence card of a run on universities and AI with the
Higher Ed pack. Screenshot: `img/e2-evidence-card.png`. Applies to every research run on any subject and any pack.

### What the owner sees

- The run was presented as deep research across the Higher Ed data pack, which holds over 200 data sources. The card
  reports 27 findings from 45 sources. That is a very thin set of evidence for a detailed research effort.
- Each finding on the card is a claim with an italic quote under it and nothing else. No publication, no article
  title, no author, no date, no link. A reader cannot tell where any claim comes from. These are claims with no
  citations.
- The owner's question, recorded as asked: "Have you even looked at the citation skill/expert that was already
  created?"

### The answer to that question

No. The uplift of 24 Nov did not read or use the citation and evidence experts that already exist in this repository,
and IA Next Local's code refers to none of them. They are:

- `.claude/skills/evidence-curator`: one verbatim quote with full attribution and source context.
- `.claude/skills/source-ranker`: ranks sources on credibility, recency, relevance and class; enforces the
  external-source floors.
- `.claude/skills/manifest-chunk-retrieval`: how HiC's generators pull evidence through manifest chunk pointers.
- `.claude/agents/evidence-quality-auditor`: a citation-by-citation auditor with a Use, Verify or Cut verdict.
- `.claude/agents/chunk-retrieval-strategist`: plans which chunks a generation should read.
- The citation protocol in `.claude/CLAUDE.md` (cite by specific source name; Scope-Match, Independence and
  Evidence-Label rules).

The source tiers and population check built on 24 Nov (`ia_next/evidencequality.py`) were written from scratch
beside these, instead of from them. That is a gap in how the work was done, and part of this enhancement is to
close it.

### What is needed

1. **All sources, like HiC.** When a data pack is chosen, deep research searches every source in it, the way HiC's
   research run does, and the card says how many of the pack's sources were searched, how many answered, and how
   many contributed evidence.
2. **Depth that matches the word "deep".** The amount of evidence scales with the pack and the request: many more
   sources read and many more findings than 45 and 27, with coverage across the pack's publishers instead of a
   handful.
3. **Detailed citations on every claim.** Wherever a finding, quote or claim is shown (the Evidence card, the live
   card, reports, decks, themes, audio transcripts), it carries its publication, article title, author when known,
   published date and a link that opens the exact passage.
4. **Use the experts that exist.** The citation protocol and the evidence and citation skills and agents listed
   above are read first and are the basis of the work. Anything IA Next Local does differently from them is a stated
   decision, not an omission.

### Done means

- On a deep run with any data pack selected, on any subject, the card shows that all of that pack's sources were
  searched, and the owner judges the evidence deep enough for a detailed research effort. Checked on at least three
  different packs and subjects, not one.
- No claim appears anywhere in the product without its named source, date and link beside it. Checked by a person
  on the Evidence card and in at least one report, deck and themes page.
- Selecting a citation opens the passage it points to.
- The owner can see which existing citation or evidence expert each part of the behaviour follows.

### Known about the cause (from the code, not yet confirmed against this run)

- **The pack search is capped by design.** It asks each source for only 2 to 5 of its latest items, keeps at most 20
  pack items for a selected pack (30 on a deep request), allows 2 or 3 items per publisher, and since 24 Nov stops
  after a 75 second budget and reads the rest from a local index that is still small. How HiC's own research run
  searches a whole pack has not been read yet; that is the first step of this work.
  (`ia_next/hic.py` `pack_items`, `ia_next/studio.py` `research_lead`.)
- **Filters then remove more.** Items older than the period, undated items beyond a small allowance, off-subject
  items and self-published pages are dropped, and the least relevant unranked sites are trimmed to hold the share of
  publishers. Each filter was added on 24 Nov to raise quality; together they shrink a run.
- **Findings are capped.** The Analyst is asked for about 26 findings in all (about 14 for a short report), whatever
  the number of sources. (`ia_next/studio.py` `analyst`.)
- **The Evidence card drops the citation.** Each finding holds its source id and a pointer to its passage, but the
  card draws only the claim and the quote. (`web/app.js`, the evidence branch of the card body.)
- **The quote is shown without quotation marks or attribution,** so a reader cannot tell it is a verbatim passage.

### Open question for the owner

- "This week" on this run limited evidence to the last 7 days. Deep research across a whole pack and a one-week
  window pull against each other: should a deep request default to a longer period, or keep the stated period and
  say plainly how little the pack published inside it?

---

## E3. Outputs made from detailed research are too shallow, and lack cases from comparable organizations

Reported from (an example, not the scope): 25 Nov 2026, a deck on AI adoption in higher education in Northeastern
branding, made after a run presented as deep research. Screenshot: `img/e3-shallow-deck.png`.

Applies to every deep or detailed research request, for any research objective, any data pack, any brand, and any
output made from it: decks, reports, documents, themes, journey maps, prototypes and audio.

### What the owner sees

- The output is too shallow for work that came from detailed research. In the example, a slide carries a title, one
  sentence, two short lines and a takeaway band, with most of the slide empty.
- It should contain more case studies of what comparable organizations have done. In the example those are other
  universities; in general they are the peers, competitors or reference organizations of whoever the work is for.
- Getting those cases needs deeper research across the data pack. That dependency is E2.

### What is needed

1. **Depth carries through.** When the user asks for detailed research (the deep setting, or words such as
   detailed, thorough or exhaustive), every output made from it is correspondingly substantial. The depth setting
   governs the outputs, not only the collection.
2. **Named cases from comparable organizations.** Detailed research looks for, and outputs present, specific cases:
   which organization, what it did, when, and what came of it, each with its citation (per E2). The kind of
   organization follows from the request and the audience, never from a fixed list.
3. **Substance on every page or slide.** Each slide or section carries enough evidence to stand on its own: the
   claim, the mechanism, and the named evidence behind it. No page is mostly empty.
4. **Say so when the evidence is thin.** If the research did not find enough for a deep output, the user is told
   before the output is made, with what was found and what was missing, and can widen the search.
5. **General by construction.** The behaviour is driven by the request, the audience and the evidence. It contains
   no rule written for one subject, sector, pack or brand.

### Done means

- For detailed research requests on at least three unrelated subjects with different packs and brands, the owner
  judges each output deep enough, and each contains named cases from comparable organizations with citations.
- No slide or section in those outputs is mostly empty or states a claim with no named evidence.
- When evidence is thin, the user sees that before the output is made.
- Checked by a person reading the outputs end to end.

### Depends on

- **E2** for the evidence: without every source in the pack searched and cited, there are too few cases to show.

### Known about the cause (from the code, not yet confirmed against this run)

- **Depth stops at collection.** The deep setting widens the search and adds a second review of a report. It does
  not change how much a deck, document or other output contains. (`ia_next/studio.py` `depth_of`.)
- **A deck has a fixed, small shape.** It is asked for about ten slides with tight word limits per field, whatever
  the amount of evidence. (`ia_next/deckstudio.py`.)
- **Nothing asks for cases.** A case-study output exists as its own kind, and a competitive gap analysis searches for
  named peers, but ordinary research and decks do not look for comparable organizations or reserve room for them.
- **Figures are stripped from the writer's own lines.** A line that carried a figure is rewritten without it, which
  can leave a vague statement behind (in the example, "Organizational adoption reached a very high level"). The
  figure belongs in a cited quote on the slide instead of disappearing.

### Also visible in the same screenshot (noted by Claude, not reported by the owner)

- The first slide in view shows a dark panel with no title text beside its photograph. It may be cut off by the
  screenshot; it should be checked.
- The slide's two short lines read as fragments, not evidence, and neither names a source.

---

## E4. The brand cannot be chosen for every output where the request is written

> **Withdrawn by the owner on 25 Nov 2026:** "never mind, I see that I can select the brand on the card."
> The plan card shows a Brand choice (screenshot: `img/e4-plan-card-brand.png`). Nothing below is to be built unless
> the owner reopens it. The record is kept because two facts in it still hold and may matter later: the research
> report, a generated image and a generated video accept no brand anywhere, and the brand list is written by hand in
> several places instead of read from the design system.

### Seen on the same plan card (noted by Claude, not reported by the owner, not an enhancement until the owner says so)

- The request said "portrait" and "detailed detail". The card opened on Landscape and Standard: the words in the
  request did not set the card's Shape and Detail choices.
- The card's Goal reads "portrait infographic ( detail) of [AI Adoption in Higher Ed]": the instruction words were
  left in the subject, and the word "detailed" was cut out of the middle of it.

Reported from (an example, not the scope): 25 Nov 2026, the message box while asking for a portrait infographic.
Screenshot: `img/e4-composer-no-brand.png`.

Applies to every kind of output the user can ask for, and to every brand the system holds now or gains later.

### What the owner sees

- The message box offers the engagement, Make, Files and the data pack. It offers no way to choose the brand.
- The owner's question, recorded as asked: "why am I not able to select branding for EVERY artifact that the user
  wants to make (not just decks)?"

### The answer to that question

- **There is no brand control in the message box at all.** A brand can be set in three other places today: on the
  plan card after the message is sent, by typing a brand hashtag in the request, or as the engagement's default in
  its settings (added 24 Nov). None of these is visible while writing the request, which is where the engagement and
  the data pack are chosen.
- **Three kinds of output accept no brand anywhere:** the research report, a generated image and a generated video.
  Every other kind (deck, journey map, themes, diagram and infographic, data table, audio overview, prototype,
  documents, Reddit listening) accepts one, but only through the three routes above.

### What is needed

1. **A brand choice in the message box,** beside the engagement and the data pack, for every request that makes
   something. It shows the brand that will be used before the message is sent.
2. **Every kind of output honours it,** including the research report, images and video, in the page and in every
   download (PDF, PowerPoint, image).
3. **One source of truth for the brand.** The choice in the message box, the engagement's default, a brand hashtag
   and the plan card never disagree silently: the card shows which one won and why, and the user can change it there.
4. **The list of brands comes from the design system,** not from a list written into the page, so a brand added to
   the system appears everywhere without further work.
5. **A sensible default.** With nothing chosen, the engagement's default brand applies; with no default, the house
   brand.

### Done means

- For every kind of output the system makes, a person can choose a brand in the message box, send the request, and
  receive that output in that brand, in the page and in each download.
- The brand shown before sending is the brand of the result. Checked for each brand the system holds.
- Adding a brand to the design system makes it selectable for every kind of output with no change to the page's code.

### Known about the cause (from the code)

- The message box has controls for the engagement, Make, Files and data packs only (`web/index.html`,
  `web/app.js`).
- The plan card's Brand choice is built from each tool's own list of accepted brands. `start_research_report`,
  `generate_image` and `generate_video` declare none, so their cards show no Brand choice. (`ia_next/agent.py`
  `TOOLS`, `ia_next/plan.py` `options_for`.)
- The brand list is written out by hand in several places (the tools' schemas, the plan card's labels, and the
  engagement settings panel added on 24 Nov, which lists three brands). The design tokens that define the brands are
  not what any of them read.

---

## E5. "Details" snaps shut on a running card, and what it shows must be accurate and live

Reported from (an example, not the scope): 25 Nov 2026, the Details disclosure on a running infographic card.
Screenshot: `img/e5-details-snaps-shut.png`.

Applies to every card for every kind of work, running or finished, and to every element on a card that the user can
open, expand, scroll or select (Details, checks, speaker notes, findings, source lists, live feeds).

### What the owner sees

- Clicking "Details" opens it, and it snaps shut again a moment later. The owner cannot keep it open long enough to
  read what the work is doing.
- The owner needs it to stay open and wants the processes it lists double-checked as accurate and real-time.

### What is needed

1. **It stays open.** Anything the user opens on a card stays open until the user closes it, however often the card
   updates. The same holds for where the user has scrolled, what they have selected, and what they are typing.
2. **It updates in place.** While open, the details change as the work changes, without closing, jumping or
   flickering (the same rule as E1).
3. **It is accurate.** Every line states something that is really happening or has really happened: the step, the
   model that is actually answering, and what the step has produced so far. No label names a system that is not the
   one doing the work.
4. **It is live.** The view says how fresh it is, and is never more than a few seconds behind the work.
5. **It is readable.** The steps are written for a person: what each is doing, for how long, and with what result
   so far. Internal identifiers and fields that mean nothing in this product are kept out of the main view.

### Done means

- On a running card of every kind of work, a person opens Details and reads it for the whole run without it closing.
- For at least three different kinds of work, a person compares the details shown against what the system is doing at
  that moment (the model in use, the step, the output so far) and finds them the same, within a few seconds.
- Every other open element on a card (checks, notes, lists) also survives a full run without closing or scrolling
  back.

### Checked on 25 Nov: are these real-time processes? (from the code; not yet verified against a live run)

- **Yes, they are real.** Each line is read from the task's own record: one line per step, with the step's name, the
  model, its state and its latest progress note. Nothing is invented by the page. (`web/app.js`, the function that
  builds the Details text; `ia_next/store.py` steps.)
- **"writing: 86 tokens" is live.** It is the count of tokens the model has written so far in the current call,
  reported by the model call itself every 3 seconds. The page then asks for the task every 3 seconds, so the view can
  be about 3 to 6 seconds behind.
- **The model named is the one the step was given, corrected at the end.** Since 24 Nov a step's model is replaced by
  the model that actually answered, but only when the step finishes. While a step is running, a substitution (for
  example the smaller model taking over when the card is slow) is not yet shown.
- **One label is wrong.** The step is called "Information Designer (HiC renderer)". Whether HiC or this machine
  draws the picture in this build has not been checked; if it is this machine, the label is false and must change.
- **Two lines mean nothing here.** "Spent 0 USD of 0.8 USD" is a leftover from the paid product: this build costs
  nothing. The task and engagement identifiers are internal.
- **It is coarse.** A long step shows as a single line; the work inside it (which section, which slide, which
  source) appears only when that step reports it.

### Known about the cause of the snapping shut (from the code)

- The card is rebuilt from scratch every time the page refreshes its tasks, about every 3 seconds, and on each event
  from the work. The Details element is created new and closed on every rebuild, so the one the user opened is
  thrown away. (`web/app.js`: the card body is assembled into a new list of elements, with a new Details element,
  on every refresh.)
- The same rebuild is why other things on a running card can reset, and it is the same root as the blinking in E1.
  Fixing the rebuild once, so a card updates the parts that changed instead of replacing itself, addresses both.

---

## E6. Visual outputs have weak typography, and ignore the level of detail that was asked for

Reported from (an example, not the scope): 25 Nov 2026, an infographic made from a request that asked for a portrait
shape and detailed depth. Screenshot: `img/e6-infographic.png`.

Applies to every designed visual output in every brand: infographics, posters, diagrams, mind maps, architecture
and journey pictures, slides, and the cover and section pages of documents.

### What the owner sees

- The typography is weak and has no impact. In the example every block has the same treatment: a small label, a
  heading, one sentence, a quote box, and a large empty area in between. Nothing is given emphasis by size, weight
  or contrast.
- Gemini Notebook is the quality bar. Its infographics and slides lead with large, confident type and a clear visual
  hierarchy.
- The request asked for detailed depth and the result is too shallow: a handful of blocks, one sentence each.

### What is needed

1. **Typography that carries the message.** A clear hierarchy on every visual: one dominant statement, supporting
   points at a visibly lower level, evidence set apart, with scale, weight and contrast doing the work. The treatment
   comes from the brand's design tokens (per brand, never hard-coded sizes or colours).
2. **The space is used.** No block is mostly empty. Type and content are sized to the area they are given, in every
   shape (portrait, landscape, square).
3. **Variety with purpose.** Different kinds of content get different treatments (a headline finding, a comparison,
   a sequence, a quoted figure, a named case), instead of one repeated block.
4. **Detail means detail.** The detail level the user asks for (concise, standard, detailed), whether chosen on the
   card or written in the request, sets how much the visual carries: more findings, more named evidence and more
   cases at "detailed". This is E3 applied to visuals.
5. **Measured against Gemini Notebook.** Before a kind of visual is called done, its output is set beside Gemini
   Notebook's for the same subject and judged by the owner. This is already the owner's standing rule; it was not
   done for visuals in the 24 Nov work.
6. **Still honest.** Impact never comes from stating a bare figure. A figure can be set large only inside its quoted,
   attributed source (as the deck's figures slide now does).

### Done means

- For at least three unrelated subjects, in each brand and each shape, the owner sets the visual beside Gemini
  Notebook's and judges ours at least equal in typographic impact.
- A request for detailed depth produces a visibly denser visual than a standard one, on the same evidence.
- No block is mostly empty, and no two adjacent blocks are identical in treatment unless the content calls for it.
- Checked by a person looking at the rendered visual and its PDF and PowerPoint downloads.

### Depends on

- **E2 and E3** for the content: a detailed visual needs the deeper, cited evidence those describe.

### Known about the cause (from the code and the earlier screenshots; not yet confirmed against this run)

- **The words in the request did not set the detail.** On the plan card for this request the Detail choice opened on
  Standard although the request said detailed (noted under E4). Unless the user changes the card, "detailed" is
  never applied.
- **The detail setting is small in effect.** It changes how many blocks are asked for, not how much each carries or
  how the type is set.
- **One block shape.** The infographic is drawn from a fixed block template with fixed type sizes, so every block
  looks the same and a short sentence leaves the block empty.
- **No side-by-side with Gemini Notebook was made for visuals.** The 24 Nov comparison covered a briefing document
  and a deck only.

### Also visible in the same screenshot (noted by Claude, not reported by the owner)

- The blocks shown are about court rulings on international student visas and training, in an infographic asked for
  on AI adoption in higher education. The content is off the subject of the request, which is the subject and
  population filtering of E2 not reaching this output.
- The picture opened under the heading "Diagram" although an infographic was asked for.

---

## E7. An output built on evidence rests on too little of it

Reported from (an example, not the scope): 25 Nov 2026, a journey map made at the detailed setting with the Higher Ed
data pack. Its Sources list holds six entries. Screenshot: `img/e7-journey-map-sources.png`.

Applies to every output that is built on evidence (journey maps, personas, decks, reports, documents, themes,
infographics, prototypes, audio), for any subject, data pack and brand.

### What the owner sees

- The journey map's evidence is too thin: six sources behind an artifact made at the detailed setting from a pack of
  more than 200 sources.
- This is the pervasive theme of this document (see the section above the first item).

### What is needed

1. **Evidence in proportion.** The body of evidence an output rests on scales with the detail requested and with what
   the chosen pack and the web hold on the subject. A detailed request uses the breadth E2 collects, not the first
   handful of sources.
2. **Each output uses what was collected.** When an engagement holds many sources and findings, an output draws on
   them widely. No output silently narrows itself to a few sources that happened to rank first.
3. **Method-appropriate evidence.** Each kind of output gets the evidence its method needs. A journey map or persona
   needs first-hand voices of the people it describes (interviews, surveys, community posts), across the whole
   journey, not only news articles about them.
4. **The output states its evidence base.** Every output shows, where the reader will see it, how many sources and
   findings it rests on, from which publishers and packs, and over what period, with each source dated and linked
   (per E2).
5. **Thin evidence is said before the work is made.** When the evidence available is too little for the output and
   detail requested, the user is told at the plan stage, with what exists and what is missing, and can widen the
   search first (the same rule as E3).
6. **A bar the system checks.** Each kind of output has a minimum body of evidence for each detail level. Work under
   the bar is marked as such, not presented as finished detailed work.

### Done means

- For detailed requests on at least three unrelated subjects with different packs, each kind of evidence-built output
  rests on a body of evidence the owner judges proportionate, and states that body plainly.
- No output made at the detailed setting rests on a handful of sources without saying so before it is made.
- A journey map or persona draws on first-hand voices where the pack or the web holds them.
- Checked by a person reading each output and its source list.

### Depends on

- **E2** for collection across the whole pack and for citations. **E3** for carrying depth through to outputs.

### Known about the cause (from the code; not yet confirmed against this run)

- **Collection is the first limit** (see E2): few items per source, caps on what is kept, and filters that shrink a
  run further.
- **Outputs read a budgeted slice.** Each builder is given the findings plus the passages that fit a fixed budget and
  rank highest for its goal, so a large engagement is narrowed before the output is written.
- **The journey map has a fixed, small shape:** four to six phases with a few quotes each, whatever the evidence. It
  cites what it quotes, so a small shape yields a short source list.
- **Depth does not reach it.** The detailed setting changes collection only (see E3); the journey map is built the
  same way at every setting.
- **No minimum is enforced.** The checks confirm that quotes are real and sources are current. None checks that an
  output rests on enough evidence for the detail requested.

### Also visible in the same screenshot (noted by Claude, not reported by the owner)

- The sources are listed with no date and no link.
- The closing statement reads "navigate a landscape of ambiguity and eroded trust": figurative wording that the
  house rules ban, which the word repair did not catch.
- Two entries are the same publisher under two names ("Inside Higher Ed" and "insidehighered.com"), so six entries
  are five publishers.

---

## E8. A new message waits about a minute and a half while the conversation model is loaded again

Reported from (an example, not the scope): 25 Nov 2026. A journey map had just finished; the next message, in a new
engagement, showed "Loading Qwen into memory (about a minute and a half)". Screenshot: `img/e8-model-reload.png`.

Applies to every message a user sends, in any engagement, after any kind of work, and to every model the assistant
depends on to reply.

### What the owner sees

- The conversation model is loaded into memory again for a new engagement, even though another engagement has only
  just run. The user waits about a minute and a half before anything happens.
- The owner's question, recorded as asked: "Why does Qwen orchestrator agent have to be re-loaded into memory for
  every new engagement? Even after another engagement has just ran?"

### The answer to that question (from the code; the cause in this exact run is not yet confirmed)

It is not the new engagement that causes the reload. It is what the previous piece of work did to the graphics card:

- **Making a picture unloads every language model.** Before each picture, the app tells the model server to unload
  all language models to make room on the card for the image engine. Journey maps (the persona photograph), decks,
  infographics and personas all make pictures. So after any of them, the conversation model is gone, and the next
  message has to load it again. This matches the screenshot: a journey map finished, then the reload.
  (`ia_next/localmedia.py`: the models are freed before every picture.)
- **Other things that also unload it:** work that uses a different large model (the prototype's own model, the
  second reviewer on a deep report), which pushes the conversation model off the card; a slow-card fallback added on
  24 Nov, which unloads the model it gives up on; and thirty minutes with no use.
- Nothing loads the conversation model back when that work ends. It is loaded only when the next message arrives,
  which is when the user is waiting.

### What is needed

1. **The assistant is always ready.** After any work finishes, a new message gets its first response without a
   model load. The user never waits on loading for an ordinary message.
2. **Reloading is the system's job, done in the background.** If the conversation model had to leave the card, it is
   brought back as soon as the card is free, before the user asks for anything.
3. **Do not unload when there is room.** A model is unloaded only when the memory is truly needed, decided from what
   is actually free on the card, not as a fixed step before every picture.
4. **Requests that need no model do not wait for one.** Requests the system already routes by rule (a hashtag, a
   named output) show their plan card at once even if a model is loading.
5. **Honest when a wait is unavoidable.** If a load cannot be avoided, the user sees why and for how long, and can
   keep working: opening earlier work, reading sources, queuing the request.
6. **General.** The same holds for every model the assistant needs to reply, on any card size, without rules written
   for one model or one kind of work.

### Done means

- After each kind of work finishes (including those that make pictures or use another model), a person sends a new
  message in a new engagement and gets a first response in seconds, with no loading notice. Checked for every kind
  of work.
- Across a full working session of mixed requests, the user never sees a loading notice of more than a few seconds
  that they did not cause by starting heavy work themselves.
- Speed of the heavy work itself is not made worse: pictures and prototypes still complete in their usual time.

### Known constraints to design around

- The card has 24 GB. The conversation and writing model holds about 18 GB; the image engine needs about 12 GB. They
  do not both fit, so pictures cannot simply stop unloading the model. The fix is in when the model comes back, in
  unloading only what is needed, or in keeping a small conversation model resident, and it needs measuring.
- A load takes about a minute and a half on this machine. The lanes built on 24 Nov already know when the card is
  free, which is the moment a background reload can start.

### Also visible in the same screenshot (noted by Claude, not reported by the owner)

- The request named the Northeastern brand, a detailed deck and an audience in its own words. Whether the plan card
  that followed picked those up from the words was not visible; the earlier infographic request shows the card
  ignoring "portrait" and "detailed" (noted under E4).

---

## E9. A new request is bent by things outside it: its own brand words, and earlier work

Reported from (an example, not the scope): 25 Nov 2026. The request was for a detailed deck, in the Northeastern
brand, for faculty, on trends in AI adoption with students across major US universities. The research step then
searched for "Northeastern University student AI adoption survey Pew Center generative usage".
Screenshot: `img/e9-northeastern-in-search.png`.

Applies to every request, for any subject, brand, audience and kind of output, and to every way earlier work can
reach a new request.

### What the owner is concerned about

- **Prompt adherence.** The system must do what the current request says: its subject, its scope, its audience.
- **Earlier engagements poisoning the well.** Work, settings and memory from earlier engagements and prompts must not
  taint the perspective of a new engagement or a new prompt.
- In the example the work took a Northeastern-led perspective although the request was about US higher education
  universities in general.

### What the investigation found (25 Nov, read-only)

**Confirmed in this run, from the task's own record:**

- The research goal stored for this run is, word for word: "in the Northeastern brand for faculty to understand
  trends in AI Adoption with Students across major US Universities". The brand phrase and the audience phrase were
  left inside the subject. The search planner was handed that text and wrote a query about Northeastern University.
- The same thing happened on the earlier request in this conversation (for a provost): its stored research goal also
  begins "in the Northeastern brand for University provost to understand ...".
- So the Northeastern-led perspective in this run came first from **the request's own words being misread**: a brand
  is how the output looks, and an audience is who it is for; neither is what the research is about. The code that
  extracts the subject removes output names and politeness, and does not remove brand or audience phrases.
  (`ia_next/router.py` `subject_of`.)
- The message box showed "New engagement" when the request was typed. The work ran in the existing engagement
  "Universities and AI this week", which already held 45 sources and 27 findings from earlier requests limited to
  one week. Why it went there instead of a new engagement has not been traced; the request's words "from this
  engagement" and the conversation's earlier work are the likely reasons.

**Other ways earlier work can reach a new request (from the code; not confirmed as active in this run):**

- **Evidence already held by the engagement.** An output made in an existing engagement is built from everything that
  engagement holds, including evidence collected for earlier, differently worded requests.
- **The second brain.** Research first reuses pages from the shared wiki that match the goal. That wiki holds pages
  from every engagement and from HiC's client work. In this run the first source listed came from it.
- **The conversation.** Earlier turns of the same conversation are in the assistant's context when it reads a new
  message, in full or as a summary. An earlier audience, subject or brand can colour how the next message is read.
- **Engagement defaults.** Since 24 Nov an engagement stores default data packs, period, depth, brand and audience,
  and a pack chosen in the message box is saved as that engagement's default. These apply to later work without
  being restated.
- **Stored memory.** The assistant keeps memory about the user and one line per finished piece of work, and can
  recall them when it chooses to.
- **The local pack index and the Library.** Items collected by earlier runs are kept and searched by later ones.

### What is needed

1. **The request governs.** The subject, scope and perspective of any work come from the current request. Nothing
   else may change them.
2. **Brand is presentation only.** A brand named or chosen sets how the output looks. It never becomes a subject, a
   search term, a source preference or a point of view, unless the user says the work is about that organization.
3. **Audience is who it is for.** The audience shapes tone, emphasis and what to recommend. It never narrows or
   redirects what is researched.
4. **Clean by default.** A new engagement starts with nothing carried over. In an existing engagement, earlier
   evidence is used only when it bears on the current request, and the user can see and change what is being reused.
5. **Everything carried over is shown.** Before work starts, the plan states the subject as the system understood
   it, separately from the brand, audience, period and depth, and lists anything taken from earlier work: evidence,
   defaults, reused pages, memory. The user can correct or remove each one.
6. **The engagement shown is the engagement used.** Work goes where the message box says it will go. "New
   engagement" means a new, empty engagement.
7. **A stated subject wins over a stored default,** every time, and the card says which was applied.
8. **General.** This is enforced the same way for every brand, audience, subject and kind of output. No rule is
   written for one organization's name.

### Done means

- For a set of at least ten request pairs that differ only in brand, or only in audience, the research queries, the
  sources collected and the findings are the same within each pair. Only presentation and emphasis differ. The set
  covers several unrelated subjects and every brand.
- A request made in a fresh engagement right after a different engagement shows no trace of the earlier one in its
  queries, sources, findings or wording.
- Every plan card states the understood subject apart from brand and audience, and lists what is carried over.
  A person confirms the list is complete by comparing it with what the run actually used.
- The engagement named in the message box is the one the work is filed in, checked for new and existing engagements.
- Checked by a person reading the queries, the source list and the finished outputs, not only by a test.

### Relation to the other items

- This is a different root from the thin-evidence theme. E2 is about how much is collected; E9 is about whether what
  is collected and written follows the request. A fix to E2 that searches more of the pack with a bent subject would
  collect more of the wrong thing, so E9's subject handling comes first or with it.
- E8's note and E4's note record the same weakness from another side: words in the request (portrait, detailed,
  Northeastern brand) are not turned into the right settings, and are left in the subject instead.


## E10. Images or illustrations always accompany an infographic

Owner, 25 Nov 2026: "images and/or illustrations ALWAYS should accompany infographics appropriately".

### Scope

Every infographic, for any subject, brand, shape (landscape, portrait, square) and level of detail. Not a rule about
one poster.

### What is needed

- Every idea on an infographic shows its own picture, whether or not it also shows a quotation, and the lead idea
  shows the largest one.
- The picture fits the idea (a scene a person can recognise from the subject) and the brand (the brand's own colours).
- A picture is never dropped to make room for text; the canvas makes room.
- When pictures cannot be made (the picture engine is not running), the person is told so in the result.

### Done means

- A count of pictures equal to the count of ideas, on every shape and brand, checked by a test and by reading a poster
  made through the page.

### Known about the cause

- The typographic redesign made for E6 put the quotation in the picture's place on the lead idea and on ideas led by a
  quotation, and showed the remaining pictures as small circles. The preview used to check that redesign drew its
  cards with empty picture slots, so the loss was not seen.
- The picture style named NXT's colours for every brand, and the stand-in scene named a university for every subject.

## E11. The period research collects from is the user's choice

Owner, 25 Nov 2026: "duration for research should be left up to the user, meaning, if I want to collect data for a
research run 90 days out and select it, IT SHOULD BE honored".

### Scope

Every kind of work that collects or reads dated evidence (research, themes, and the research step of a deck, journey
map, document, infographic or any other output), for any subject and any data pack. The period can be chosen three
ways: in the request's own words, on the plan card ("Evidence from"), or in the engagement's settings.

### What is needed

- A period chosen in any of the three ways is the period the run uses: for searching, for reading the data packs, for
  reusing held sources and for choosing what findings are drawn from.
- The 30-day period applies only when nobody chose one.
- A longer period reaches further back into each source, so it is not filled from each feed's newest items alone.
- When a period leaves evidence out, the result says how much and how to widen it. The choice stays with the user.
- The words that name the period are not part of the subject that is researched.

### Done means

- A run with 90 days selected keeps sources from the whole 90 days, and its result names that period.
- The same holds when 90 days is the engagement's saved period and the plan card is not touched.

### Known about the cause

- The plan card sends only a choice the person changed. An engagement's saved period was shown on the card and then
  not used by the run, which fell back to 30 days.
- Phrasings such as "90 days out", "a 90-day window" and "going back six months" were not read as a period.
- A deep read asked each feed for its ten newest items whatever the period.


## E12. An approved video is always made, or says why it was not

Owner, 25 Nov 2026: "the video pipeline never runs". The approval card read "Approved. The video is being made; it
appears here when it is ready" and nothing followed.

### Scope

Every piece of work a person approves that is not a task with its own card: video clips today, and any approved work
added later. For any engagement and any prompt.

### What is needed

- Approved work records that it started and how it ended, and its card shows which: working (with the time so far),
  ready, or failed with the reason.
- A restart of the app does not lose it: it is made again without the person asking twice.
- Anything in flight is visible to whoever is about to restart the app.
- The card keeps looking for as long as the work can take.

### Known about the cause

- The approved clip ran in a bare thread. It was not a task, nothing recorded its start, and the page stopped
  looking after six minutes while a clip is allowed forty.
- On 25 Nov the clip was approved while Claude was rebuilding the app and making preview pictures on the same picture
  engine. The rebuilds ended the thread. Claude's check before each rebuild read the task list, which does not list
  an approved clip.

## E13. A recording that cannot be transcribed says why, at upload

Owner, 25 Nov 2026: "the transcriber hasn't run either".

### Scope

Every uploaded recording, video or audio, of any size and from any device.

### What is needed

- A file that did not arrive whole is refused when it is uploaded, with what is wrong and what to do.
- The reason is shown where the person uploaded the file, not only on a card elsewhere.

### Known about the cause

- The transcriber did run, 39 seconds, and failed with "Invalid data found when processing input". The uploaded file
  "studentA (1).MOV" is 53.8 MB of a recording that states about 900 MB: the download stopped early and the part that
  describes the recording is missing. The two other copies in the same folder are also incomplete (29 KB, and 9 MB of
  about 198 MB).
- The failure was written on a task card in decoder language, and the upload chip said the transcript had started.


## E14. The assistant's answers about running and failed work mislead

Owner, 25 Nov 2026, two screenshots. Status: open, not started (the owner asked for it to be listed; more items follow).

### Scope

Every reply the assistant gives about work in the studio, of any kind (transcripts, research, decks, pictures, video,
audio), in any engagement: work that is running, queued, finished or failed.

### What the owner saw

- A video was attached and its transcript started at once. Three seconds later the owner wrote "transcribe the
  attached video file" and was told "The studio is still working on a piece of work ... I can plan new work as soon
  as it is done". The work in question was the transcript the owner was asking for. The owner then asked what on the
  machine was preventing the transcription. Nothing was.
- Asked whether an uploaded video had been transcribed, the assistant said the file's data was invalid and suggested
  re-uploading it or converting it to MP4. The file was a 54 MB part of a 900 MB recording. Re-uploading the same
  copy would have failed again, and the format was never the problem.

### What is needed

- A request for something that is already running is answered as that: what is running, since when, where its card
  is, and how long it usually takes. It is not described as other work the person must wait behind.
- A reply about failed work gives the cause in words a person can act on and the one step that fixes it. It does not
  repeat a decoder or library error, and it does not guess at causes the record does not support.
- "The studio is busy" is said only when the running work is different work from what the person asked for, and then
  it names that work.

### Done means

- Attaching a recording and then asking for its transcript gets "your video is being transcribed now", checked
  through the page.
- Asking about a failed transcript of an incomplete file gets the incomplete-file reason and "get the whole file",
  checked through the page.
- The same holds for one other kind of work (for example a deck that is running, and one that failed).

### Known about the cause (from the records, not yet from the code)

- The busy reply is given whenever any task is running, without comparing that task with the request.
- A failed task stores the raw exception text, and the assistant explains the failure from that text. Since 25 Nov a
  new incomplete upload is refused with a plain reason (E13), but older failed tasks and other kinds of failure still
  carry raw errors.


## E15. Work started by attaching a file has no card in the conversation

Owner, 25 Nov 2026: "there is no card for the video transcription task? Where's the card??" and "so where will the
transcript appear when it is done? This is bad UX". Status: open, not started.

### Scope

Every piece of work that starts because a file was attached or uploaded (video and audio transcripts today, any
file-triggered work added later), in any engagement and any conversation.

### What the owner saw

- A 24-minute video was attached. The upload chip said "Uploaded; Whisper large-v3 is transcribing it (see its
  card)". No card appeared in the conversation. The only sign of the work was "Working on 1 task" in the page header.
- Nothing in the conversation says where the transcript will arrive.

### What is needed

- The work's card appears in the conversation the moment the upload is accepted, showing its steps, the time so far
  and the expected time, like every other card.
- When the work finishes, its result (the transcript, its downloads) is on that card in the same conversation.
- The work is linked to the conversation it was started from, so reopening the conversation shows the card again and
  the assistant knows that this work belongs to it.
- The upload chip never points at a card that is not on screen.

### Done means

- Attach a recording: a card is in the thread within a second or two, and stays through a page reload.
- When it finishes, the transcript opens from that card. Checked through the page.

### Known about the cause (from the code)

- On an accepted upload the page refreshes the task's data but adds no card to the thread, and the upload route does
  not record the task against the conversation (the table that links conversations to tasks has no row for it).


## E16. Files are the person's, and work can be made from files alone

Owner, 25 Nov 2026: "this new engagement failed for lack of evidence, but the evidence was simply the uploaded files I
told it to analyze for the deck ... users should be able to specify only an analysis or artifact based solely on
uploaded files, if they want to." And: "files shouldn't be locked to specific engagements and should be able to be
leveraged whenever users want them to be. Engagements should have in context memory about files that were uploaded
within those engagements, though."

### The distinction

- A file belongs to the person. Once uploaded it can be used in any engagement and any conversation, when the person
  names it, attaches it or picks it.
- An engagement remembers the files uploaded or used inside it, as context for its own work. That record is not a
  lock: the same file can be used elsewhere.

### Scope

Every kind of work that rests on evidence (decks, journey maps, documents, infographics, themes, tables, audio,
prototypes, reports), every file type that can be uploaded (documents, text, spreadsheets, transcripts of recordings),
any engagement, new or existing.

### What the owner saw

- Six transcripts were uploaded and analysed in one engagement. A new conversation asked for a deck "based on the
  uploaded files". The work was filed in a new, empty engagement, research was switched off, and the deck failed after
  two minutes with a message that named an internal tool.

### What is needed

- A request that names files ("the uploaded files", "my transcripts", a file by name) gets those files in the
  engagement its work is filed in, wherever they were uploaded. The first engagement keeps them.
- Work from files alone is a normal choice: the plan says the files are read first, research is off unless asked for,
  and the result is built only from them.
- The page lets a person pick any file they have uploaded for the message they are writing, from any engagement.
- An engagement's context lists the files uploaded in it.
- A plan with nothing to build from says so on the card. It does not start and fail.

### Built on 25 Nov

- `router.files_basis`, `files_only`: the request's own words. `transcripts.library`, `named_in`, `bring`,
  `copy_uploads`: every uploaded file, the ones a request names, and copying them to where the work is filed.
  `agent._with_files`: applied to every request for work, new engagement or existing. `plan.build_steps`: uploads
  count as what the engagement holds, "read first", research off for files only. `plan.start`: research stays on when
  an engagement holds nothing. `agent.focus_context`: the engagement's files in its context. Routes `GET /api/files`
  and `POST /api/engagements/{id}/files/use`.
- Checked through the page: the owner's own sentence, in a new conversation, produced a plan card that reads "Holds 11
  uploaded files, copied from "Higher ed students and AI (gate run)". 11 are read first ... made from your files
  only", with research off. The plan was not started.

### The open items, built later on 25 Nov

The owner's correction: "I had uploaded fresh files that I intended to use within a pre-existing engagement. That
should be acceptable in addition to having a file picker."

- Fresh uploads are used within the engagement they were uploaded to. A request that rests on "the uploaded files",
  sent with no engagement in the message box, is filed in the engagement that holds those files and is made from
  them only (`transcripts.home_of`, `agent._new_engagement_for`). A file named in the request is found wherever it
  was uploaded. Attached files file the work in their own engagement. This replaces the first version, which copied
  the files into a new engagement.
- File picker: the Files button opens "Your files", every uploaded file from every engagement that is not archived,
  with search, checkboxes, "Upload from this computer" and "Attach to my next message". A file picked for another
  engagement is copied into it (`openFilePicker`, `GET /api/files`, `POST /api/engagements/{id}/files/use`).
- The plan card's "Carried over" row lists the files by name, and the evidence line says how many of the
  engagement's files the work is made from.
- An audience written in square brackets is read ("For: educators").
- Fresh files stay attached across "New conversation" and the message box opens on their engagement. Chips leave the
  message box once their files have gone with a message.
- A short subject with an acronym ("AI usage") is kept as the subject.
- Checked through the page with the owner's sentence in a new conversation: plan in 4.1 seconds, subject "AI usage",
  for educators, filed in "Higher ed students and AI (gate run)", 11 files listed by name, "Made from 11 of the 12
  uploaded files this engagement holds ... made from your files only", research off. The picker listed 20 files,
  found 4 on "StudentA", attached one, and it stayed attached after "New conversation".

### The last open items, built the same day

- Which set of files a request means is a choice on the plan card: "Files" lists each sitting of uploads in the
  engagement, newest first, by when it was added and its first file names, and "All N files in this engagement". The
  set chosen is the set the work is made from (`transcripts.sittings`, `plan._files_option`, `plan.apply_options`).
  Seen on the page with two sittings and the "all" choice.
- A file can be removed from the library in the picker: "Remove", then "Remove from your files?" on the same row.
  The file leaves the list and is no longer picked up as "the uploaded files"; the engagement keeps it so finished
  work still resolves its citations, and it can be put back (`transcripts.set_removed`, route
  `POST /api/engagements/{id}/files/{sid}/remove`). Checked on the page with a throwaway file: 21 files before, 20
  after.
- A deck made mostly from the person's own files is told to let them speak: one quote slide in every four, each a
  sentence copied exactly from a file, from different files (`deckstudio.compose_in_steps`). The first files-only deck
  had one verbatim quote in 18 slides.
- The "Sources, continued" slide carries a line under its title; its empty line was the open check on that deck.
- File-set times are shown in the person's time zone.
- The full files-only deck runs are recorded in the plan's Log.
- A quote from a recording is shown only as a clean, complete sentence in the speaker's own voice, word for word
  (`evidencequality.clean_spoken`, `is_clean_sentence`, `spoken_source`; applied in the deck's quote check, the
  journey map, the infographic and the shared quote trimmer). A quote with filler ("like", "you know", "kind of"), a
  fragment, a question, or a line addressed to "you" is replaced by a clean sentence of the same file on the same
  point, or left out. Tried on the three real decks: of five spoken quotes, one was replaced by a clean sentence of
  the same student on the same point and four were left out, since no clean
  sentence on their point exists in those transcripts. Decks from raw interviews therefore carry few quotes. Speaker
  labels would let the rule pick the student's sentences with certainty; the recommended speech model provides them
  (E17).


## E17. Recommended models were replaced by what was on disk

Owner, 25 Nov 2026, on a picture with an extra hand: "Are we using the best image model for these?" Then, shown the
original recommendation: "these were in the original recommendations and, for some reason, never made it to the
pipeline", "was the decision made simply by what was on disk? That's faulty logic", "check the other recommendations
that were overturned", and "if you are going to swap models make sure that there is no quality or performance
degradation. We do not want to choke the system, introduce latency, or degrade quality of deliverables."

### The audit: recommended in the brief of 19 Nov against what was built

| Seat | Recommended | Built | Why it differs |
|---|---|---|---|
| Image | OpenMOSS MOSS-Image-SFT (FLUX 3 Image Klein for reference edits if its terms fit) | Stable Diffusion 3.5 Large | Its weights were on disk. No comparison, no note to the owner |
| Embeddings | Google EmbeddingGemma 2 | qwen3-embedding 0.6b | Was on disk. No comparison |
| Scanned pages | LightOnOCR-3-0.8B (4B for hard tables) | Qwen 3.8 27B reads the page images | Already loaded. No comparison |
| Speech to text | Microsoft VibeVoice-ASR-Streaming-1.5B, with speaker attribution | Whisper large-v3 | Its weights were on disk. No comparison; speaker attribution was lost |
| Screenshot judge | SenseNova-Loop-9B | Qwen 3.8 27B | Recorded at the time: the repository needs a sign-in |
| Conversation | Nemotron 3.5 Lightning | Qwen 3.8 27B | Measured bake-off, the owner's decision of 23 Nov |
| Search planning | Nemotron | Qwen 3.8 27B | Measured on 23 Nov: a second large model loaded for three short calls |
| Writing, analysis, prototypes, quick jobs, video | Qwen, Qwen, Ornith, MiniCPM5, Kandinsky Lite | As recommended | |

Never tried, named as alternatives only: Microsoft Aion 1.0 Instruct, LTX-2.5, Nanbeige4.3.

### The rule for every swap

A recommended model replaces the one in use only after a side by side on this machine: the same inputs, time per
unit of work, peak graphics memory, and the outputs read by a person. It is not swapped in if it is slower in the way
a person feels, if it does not fit beside the rest of the work on the 24 GB card, or if its output is not better. The
owner decides from the measurements.

### Image seat: measured on this machine, 25 Nov

Same prompts with hands in them, 1024 by 1024, one picture each, the conversation model unloaded first as the app
does. Script and pictures: scratch `bake/bake.py`, `bake2.py`, `sheet-*.jpg`.

| Model and setting | Seconds a picture | Peak graphics memory |
|---|---|---|
| Stable Diffusion 3.5 Large, 28 steps (in use) | 27 to 32 | 15.0 to 17.3 GB |
| MOSS-Image-SFT, 8-bit file, 25 steps (ComfyUI's template) | 80 to 85 | 11.8 to 12.4 GB |
| MOSS-Image-SFT, 8-bit file, 14 steps | 48 to 54 | 11.7 to 12.4 GB |
| MOSS-Image-SFT, full precision, 25 steps | 48 to 54 | 15.5 to 16.9 GB |
| MOSS-Image-SFT, full precision, 14 steps | 32 to 36 | 15.9 to 16.9 GB |

Read of the pictures (six prompts, one seed, a small sample): MOSS-Image followed the prompt in all six and drew
hands correctly; Stable Diffusion missed the prompt in four (a pencil through a hand, no teacher in a classroom
scene, a scanner resting on a box, garbled text on a phone). At 14 steps MOSS-Image keeps its hands and people; one
of three scenes changed its viewpoint from the one asked for.

Nothing was swapped. The closest candidate is MOSS-Image-SFT at full precision and 14 steps: about 5 seconds a
picture slower than today, the same graphics memory, better pictures on this sample. The owner decides.

FLUX 3 Image Klein is gated behind its publisher's licence, which the owner must accept; published terms limit
commercial use by revenue. Not downloaded. FLUX.2 dev is on disk and is a 29 GB file for a 24 GB card.

### Image seat: outcome

Swapped to MOSS-Image-SFT on the owner's decision of 25 Nov ("5 seconds more per image, if higher quality, is not
horrible"), after a second quality read at the setting deployed: all six prompts at full precision, 14 and 18 steps.
At 14 steps every picture was coherent with hands drawn correctly, in 28 to 36 seconds; at 18 steps one scene followed
its asked viewpoint more closely, in 38 to 43 seconds. Deployed at 14 steps (`IA_NEXT_MOSS_STEPS` changes it), full
precision transformer, ComfyUI's own template graph (`localmedia._moss_graph`). Stable Diffusion 3.5 Large is the
fallback when the MOSS files are missing or a MOSS run fails, and the substitution is recorded
(`IA_NEXT_IMAGE_MODEL=sd35` forces it). Through the app after the swap: an illustration at 768 by 768 in 27 seconds
and a deck photograph at 1344 by 896 in 43 seconds, both answered by `comfyui:moss-image-sft`. Peak graphics memory
measured 16 to 20 GB on a 24 GB card with the conversation model unloaded, as before. Not yet done: a full deck and
a full infographic read end to end on the new model.

### The other three seats: checked on 25 Nov, not yet compared

| Seat | Recommended model | Obtainable today | What a comparison needs |
|---|---|---|---|
| Speech to text | microsoft/VibeVoice-ASR-Streaming-1.5B | Yes: MIT, not gated, Transformers weights | A Python runtime with GPU PyTorch and Transformers beside the app (Whisper runs through faster-whisper, which cannot load it); the same recordings through both; word accuracy, speaker labels, minutes per hour of sound |
| Embeddings | google/embeddinggemma-2 | Yes: Apache 2.0, not gated; not in the model server's list | A parallel index, as the brief says, never a switch of the shared store; the same questions against both; what each retrieves |
| Scanned pages | lightonai/LightOnOCR-3-0.8B | Yes: Apache 2.0, not gated, Transformers weights | The same runtime as the speech model; the same scanned pages through it and through Qwen; text accuracy and seconds a page |
| Screenshot judge | sensenova/SenseNova-Loop-9B | Yes now: Apache 2.0, no longer gated (it needed a sign-in on 19 Nov) | The same runtime; the same prototype screenshots through it and through Qwen |

Two runtimes now sit beside the app, outside it: `D:\IA-Next-Runtimes\asr-bakeoff` (Transformers 4.57, for VibeVoice)
and `D:\IA-Next-Runtimes\vision-bakeoff` (Transformers 5.22, for EmbeddingGemma 2, LightOnOCR-3 and SenseNova-Loop).
Nothing was swapped; each seat below is measured for the owner's decision.

### Speech to text: measured 26 Nov

Same recordings, the app's own Whisper code timed inside its container (large-v3, int8, batched, beam 5, on the
processor) against VibeVoice-ASR-Streaming-1.5B in bf16 on the graphics card with Qwen resident, as it is in use.
The owner's interview recordings were read on this machine only; nothing was uploaded. Scripts and output:
`asr-bakeoff/run_vibevoice.py`, `compare.py`, `out/`.

| Recording | Whisper large-v3 (in use) | VibeVoice-ASR 1.5B |
|---|---|---|
| studentA2, 5 min | 188 s on the processor | 69 s on the card |
| studentA, 24 min | 652 s for the whole task (transcribe, chunk, file) | 748 s to transcribe |
| Graphics memory | none | peak 24.1 of 24.5 GB beside Qwen (about 350 MB to spare) |
| Words shared, in order | 96.9% of Whisper's (24 min) | 93.3% of VibeVoice's |
| Speaker labels | none | 110 turns on the 24 min interview; Speaker 0 asked 38 of the 39 questions, Speaker 1 spoke 3,141 of the 3,829 words |
| AI tool names (24 min) | ChatGPT 17, Claude 1; wrote "chat to beauty" and "cloud" | ChatGPT 19, Claude 2 |

Read of the 177 passages where they differ on the 24 minute interview: most are style. VibeVoice writes speech
verbatim, false starts and repeated words included; Whisper drops repeats and reads cleaner.
Each has real errors: Whisper turns Claude into "cloud" and ChatGPT into "chat to beauty"; VibeVoice swaps an
interviewer's word for a similar-sounding one and garbles one clause. Neither is clearly more accurate on content.

What each would mean for the app. VibeVoice's speaker labels give the quote rules (E16) certainty about which
sentences are the student's, and it names the tools correctly. Against that: it needs the graphics card, it filled the
card to within 350 MB of its limit beside the resident Qwen (a picture or a second model at the same time would not
fit), and on the long interview it was slower than the app's Whisper, which never touches the card. Not swapped. A
middle path for the owner to weigh: keep Whisper for the text and run VibeVoice only for speaker labels, only when the
card is free (no picture, no video, no long build); it would add minutes to a long interview and a second pass to plan.

### Scanned pages: measured 26 Nov

Eight pages from public papers and reports (two-column papers, a results table, a magazine page, references, report
pages), printed to pictures at 300 dpi and roughened like an office scan (skew, grain, blur, JPEG); each PDF's own
text layer is the answer key. Qwen got the app's prompt and settings (`localhic.READ_SYSTEM`, 130 dpi as the app
renders a scan, and again at 2048 px); LightOnOCR-3 got its own empty prompt at 2048 px, its publisher's advice. Script
and pages: `vision-bakeoff/make_scans.py`, `ocr_bench.py`, `scans/`, `out/ocr.json`.

| Reader | Seconds a page (median, mean) | Words found (F1) | Numbers found | Graphics memory |
|---|---|---|---|---|
| Qwen 3.8 27B, 130 dpi (in use) | 53, 58 | 0.943 | 97.5% | none extra (resident) |
| Qwen 3.8 27B, 2048 px | 57, 59 | 0.944 | 92.9% | none extra |
| LightOnOCR-3-0.8B, 8-bit, through Ollama | 15, 36 (first page 174 s with the load) | 0.950 | 85.2% | 1.1 GB, fits beside Qwen |
| LightOnOCR-3-4B, 6-bit, through Ollama | 39, 47 | 0.917 | 85.4% | 3.9 GB; loading it pushed Qwen out |

Read of the misses: LightOnOCR (both sizes) drops page footnotes and reference marks, and with them real figures (on
one page 2021, 64, 101; on another 129, 597, a DOI); Qwen kept every one. On words both are near perfect on clean
pages. LightOnOCR in Transformers on Windows is not usable: its Qwen 3.5 layers fall back to "much slower" reference
code without two Linux kernels, and it filled the card; through Ollama it runs on proper kernels. The Ollama files are
community conversions of LightOn's weights (prithivMLmods), not LightOn's own.

What it means: LightOnOCR-0.8B reads a scanned page about four times faster (a 20-page scan: about 5 minutes against
about 19) and fits beside the resident Qwen, but it loses footnotes and some figures, which this app quotes and cites.
Qwen stays. A choice for the owner: LightOnOCR for long scans when speed matters more than footnotes. The 4B is no
better here and costs Qwen its place on the card. Measured on the way: when a model pushes Qwen out, reloading Qwen
took 197 seconds, which a person waiting in the chat would feel.

### Embeddings: measured 26 Nov

Every source the app holds (478 unique titles across 24 engagements) ranked against six topic goals, a source counting
as relevant when it was collected for that topic; and 120 student and university sources labelled by hand (20 on, 44
between, 56 off) against "How college students use AI tools in their coursework and career preparation", the app's
own relevance decision (`localrank.on_topic`). qwen3-embedding through Ollama with the app's query prefix; EmbeddingGemma
2 (text encoder only) with its documented search prefixes. Script: `vision-bakeoff/embed_bench.py`, `out/embed.json`.

| Model | Mean ranking quality (AUC, 6 topics) | On against off, hand labels (AUC) | Median score: on / between / off |
|---|---|---|---|
| qwen3-embedding 0.6b (in use) | 0.888 | 0.987 | 0.60 / 0.52 / 0.34 |
| EmbeddingGemma 2 | 0.886 | 0.979 | 0.74 / 0.67 / 0.63 |

A tie. Gemma ranks the student topic better (0.862 against 0.805) and co-op and AI news worse. Qwen's scores spread on
and off topic far apart, which the app's keep and drop lines rely on (KEEP 0.45); Gemma's sit close together, so a swap
would need new lines and a rebuilt index for no measured gain. Not swapped.


## E18. A professional, enterprise look, and a Library that is easy to navigate

Owner, 26 Nov 2026: "can you add a higher degree of polish to the branding, making the logo white on black, and the
header treatment slightly taller? Let's make this look like a professional app"; "the left nav needs to be visually
set off from the rest of the stark white experience. I want a professional, enterprise software look, similar to a
slack app"; "the library could use a UX/UI/Branding overhaul. The three panel layout feels sloppy, hard to navigate,
and the interface isn't as polished as the rest of the system"; "whatever visual changes you make to the library panel
should be applied to every right panel flyout ... Audit all right panel displays".

What was wrong with the Library: it opened in the 820 px panel while a later rule widened a different element, so
three columns shared 820 px; the filter column needed a sideways scrollbar, titles wrapped to six lines, and the empty
reading pane took the most room. The "Add" button sat disabled in the header in a washed-out accent.

Built (web/app.js `openLibrary`, `libMenu`; web/app.css "the Library" and "one flyout system"; libraryview facets):
- Shell: near-black navigation (#121412, brand band #0D0D0D) with the white NXT Humans wordmark; chartreuse for the
  active engagement, the New conversation button and the Updates badge; a 76 px top bar with a 32 px title.
- Library: one search bar; one row of filter menus (period, data pack, engagement, publisher) that list every value
  with its count and find as the person types; results beside the source being read; searched words marked in both;
  "PYMNTS: ..." titles shown without the repeated publisher; picked rows gather in a dark bar under the results with
  "Add to <engagement>"; the reader adds one source, or says it is already in this engagement; arrow keys move through
  results; on a phone, results then the source with a way back. The filter lists are no longer cut at 14.
- Every flyout (one sheet): a 76 px header matching the top bar; the intro sentence each panel opened with is now a
  one-line subtitle; header actions as outlined buttons; no boxed close button on open; underline tabs; flat rows for
  memory, schedules, chats and files; the Library's search field on every search box; the files footer stays in view;
  disabled buttons in grey.

Checked through the page after each rebuild: 19 flyouts opened by script (pw/audit_flyouts.js), each photographed;
every header 76 px, none scrolls sideways, no stray "null". Found and fixed on the way: icons not drawn (wrong icon
names), "null" printed by the DOM's replaceChildren, the engagement tag chips unstyled after the old Library CSS was
removed, the search icon reaching text fields and a select. Suite: 624 passed, 24 skipped.


## E14, the rest, and E19: replies about work in plain words, and answers that stream (26 Nov)

The owner's goal kept both open: E14 was built for recordings only, and chat answers arrived all at once after 26 to 31
seconds.

E14 for every kind of work (`agent.work_status_reply`, `plain_task_failure`; tests `test_work_status_in_plain_words.py`):
"is my deck done?", "why did the journey map fail?", "where is my report?", "how is the prototype going?" are answered
from the task records with no model call: running work names its step and how long it has been working; finished work of
one kind is one sentence with each piece's subject ("Three decks are ready: for ..."); failed work says why in words a
person can act on and points to the card's Try again button. The failure reasons the app has recorded were read first: a
parser's message, a server timeout, a context limit naming a setting, browser script errors, a tool's name and a decoder's
error each become a plain sentence; reasons already written in plain words are kept. A request for work of a kind that is
already being made says it is already being made. Checked through the page: "is my deck done?" with the gate-run
engagement in focus answered in 3 seconds, "10 decks are ready: for ... (the newest finished about 12 hours ago)".

E19, streaming (`providers.STREAM_TEXT`, `agent.live_writer`, `/api/conversations/{cid}/live`, `showLiveText` in the
page; tests `test_streaming_chat.py`): the model's stream is read as it arrives and the text so far is kept in memory for
the conversation (never in the event log); the page reads it every 700 ms while it waits. A question about the person's
files streams only its opening summary: its quoted points are checked against their passages before they are shown, so
they arrive with the finished reply, which replaces the streamed text. Checked through the page, gate-run engagement,
"what are the key themes in the interviews?": first words at 9 seconds, finished reply at 29 seconds (the same total as
before; the first words used to wait for the whole reply). The first answer after a rebuild took 54 seconds while the
model warmed up. Suite: 634 passed, 24 skipped.
