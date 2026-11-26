# IA Next Local: audit, benchmark and completion plan (2026-11-19)

Sections 1 to 3 are the audit as written on 19 Nov. Sections 4 to 6 are the plan as executed, with what was measured.

## 1. What the owner asked for, in their words

| # | Goal | Source |
|---|---|---|
| G1 | "a free, local version of IA Next that works exactly as designed but without any token cost or API cost", on open-weight models suited to this laptop, reusing models already on disk, storage on D: | /goal, 19 Nov |
| G2 | The completion kit, in order: fix writing on the failed report; prove pictures through a real deck; five-second video with sound; close the Reddit-parity and self-judging gaps; "run every unfinished workflow through the application" and publish measured timings | completion kit |
| G3 | Mind maps state their themes in full sentences, never truncated bullets; every artifact downloads as image, PDF and 16:9 PowerPoint; diagrams are EDITABLE in PowerPoint, never a picture on a slide | 19 Nov |
| G4 | "a sleek animated visual of what is happening with the agent, sub-agent orchestration ... hand-offs, skill usage"; "The processes are so opaque!" | 19 Nov |
| G5 | Before each artifact: show the mandatory steps, which may involve research, ask whether to perform each step, show each step's expected duration, "in beautiful cards in the chat UI with animations" | 19 Nov |
| G6 | "I expect these artifacts to be as high quality as gemini notebook artifacts. That's the bar, with better graphical quality and professional grade content" | 19 Nov, repeated |
| G7 | The checked data pack informs the run; a run never uses the wrong engagement's data | 19 Nov |
| G8 | Nothing sits stuck or slow without saying why | 19 Nov |
| G9 | Audit, plan, complete what is incomplete, fix what is broken, elevate what is sub-par, execute | /goal, 19 Nov |

Standing constraints: no paid API; keys are never touched; no commit without approval; the other projects and IA Next
on 9400 are not modified; no rebuild under running work.

## 2. The benchmark: Gemini Notebook, as captured in this project

Source: the live signed-in run of 9 Nov (notebook 25078bb9, 12 sources, 10 outputs) recorded in
`humans-in-control-research/plans/hic-vs-notebooklm-artifact-audit-2026-11-09.md`,
`gemini-notebook-parity-closeout-2026-11-09.md`, `notebooklm-studio-reverse-engineering-2026-11-03.md`, the IA Next
clause grading in `Downloads/IA-Next-UX-Audit-2026-11-16/ENHANCEMENT-PLAN.md` Part 6, and the files in
`Downloads/HiC-Artifact-Samples/_gemini-notebook-comparison/` (deck .pptx, infographic .png, audio .m4a, video .mp4)
and `Downloads/IA-Next-UX-Audit-2026-11-16/R-deck-compare/gemini-reference-render/` (15 slide images).
REA finding: the NotebookLM client is a shell; its intelligence is server-side, so parity is behavioural, measured on
outputs. No Gemini capture exists for FAQ, timeline, journey map or themes; those are held to the project's own bar.

The pass checks per artifact (a local artifact must pass all of its rows; "keep" rows are where this project already
beats Gemini and must not regress):

| Artifact | Gemini measured | Parity checks | Keep |
|---|---|---|---|
| Mind map | root + 6 branches, 3-5 children each, interactive tree, zoom, image export, no node citations | one root; at least 5 branches; at least 3 children per branch; no near-duplicate branches; click a node to ask about it; zoom and keyboard; image export | every node tied to a passage; editable PowerPoint |
| Infographic | one illustrated canvas, title + one-line subtitle, 6 nodes in 2 groups, each a short label + one-sentence caption + illustration; landscape/portrait/square; concise/standard/detailed; style prompt; zero bare figures | image in the conversation; 3 orientations, 3 densities, a style choice; title + subtitle; 4-6 nodes, grouped when unordered; label of about 5 words + one-sentence caption; an illustration per node in one style; shape matches claim; labels inside geometry; no clipped text; zero figures outside quotes | pointer per element; text version; saved file |
| Slide deck | 15 slides, a drawn visual on every slide, about 12 visual forms, subtitle on 13 of 15, takeaway band on 7, one palette; format and length pickers; outline review; revise one slide; PPTX is 15 flat pictures with misspelt baked text | every slide: title + 1-2 line subtitle, no two identical; a drawn visual on every content slide, tables alone do not count; shape matches claim, labels inside; one illustration style; bottom-line band on argument slides; at least 8 visual forms per 15; format and length options; outline review; one-slide revision; PDF with selectable text | native editable PowerPoint; action titles; figures only in cited quotes; sources in notes/footer |
| Report | about 2,900 words, matrices and flow diagrams, all 12 sources, zero citations, 40+ bare figures, meta opener | 2,000-3,000 words; at least one comparative matrix and one content-true diagram; at least 80% of collected sources cited; headings are judgments; saved and re-openable; no figure outside a quote; no meta opener | citations; verified quotes |
| Study guide | 10 short-answer Q/A, 5 essay prompts, 18-term glossary | those three parts at those counts; answer key cites passages | citations |
| FAQ / chronology | no capture | questions as the audience asks them, cited answers; dated cited entries in order | saved file |
| Data table | every row: named source, verbatim quote, resolvable citation; interpretation column labelled | same; CSV keeps citations; no other engagement's material | Sources column |
| Flashcards | 50 cards; Got it / Missed it; Explain sends the card to chat | count/focus settable, up to about 50; marking with counter and reset; Explain; printable | citation per card |
| Quiz | 10 scenario MCQs, A-D; trapped in an iframe | at least 10 MCQs, 4 options, complete-sentence stems, at most 30% number recall; key hidden until answered; why right and why each distractor is wrong; exportable | citations |
| Audio overview | 23:41 deep dive, two hosts, org-level attribution, 11 bare figures; deep dive / brief / critique / debate | four formats; two voices; downloadable file; natural dialogue; spoken source names; cited transcript; no spoken figure outside a quote | script approval before voices |
| Video overview | 5:07, three formats, producer-notes review; collapsed 12 sources to 1; meta opener | script review before render; draws on most sources; no meta opener; persists after reload | corpus fidelity |
| Chat, sources, layout | citation chips open the passage; per-source checkboxes scope everything; sources / chat / studio panels; output cards | same | approvals; receipts naming failed sources |

## 3. Where IA Next Local stands (audited 19 Nov, evening)

DONE before this plan: all model calls local (Nemotron, Qwen, Ornith, MiniCPM via Ollama; SearXNG search; Piper and
Whisper speech); dedicated ComfyUI on D: for pictures (SD 3.5 Large, about 50 s each) and video (Kandinsky 6.0 Lite
Distill, five seconds with sound, 209 s); NVIDIA driver 621.24; exports to PNG, PDF and editable PowerPoint; a real
deck with five embedded photographs; checker false positives fixed.

Broken or unproven at audit time:

| # | Finding | Evidence |
|---|---|---|
| B1 | A research report dies in the Writer on malformed model JSON after research and findings succeed | task_572203cf5b6a, 19 Nov: "Expecting ',' delimiter" |
| B2 | After a video the engine keeps about 18 GB of graphics memory; a mind map then ran 14 minutes at one word a second | task_c15ab16d8979 |
| B3 | A chat turn waits while a task holds the graphics card (15 minutes observed) | same |
| B4 | A cold first chat turn takes about 100 s to load the model with no explanation (now explained by the live view; still slow) | measured |
| B5 | An artifact on a new topic was researched inside an unrelated engagement | plan_15a73752f64e |
| B6 | Diagrams ignore the chosen data pack; a mind map on material that lacks the topic fails after minutes | task_c15ab16d8979 |
| B7 | Writers spell figures out in words ("seven percent") to pass the no-bare-figure rule | local mind map, deck |
| B8 | The agent's first tool calls sometimes fail before the plan appears | 19 Nov journey request |
| B9 | Mind map: 5 branches with 1-2 points each, static picture. Below Gemini's 6 branches x 3-5 children, interactive | mm_local_baseline.png |
| B10 | Never run locally through the app: journey map, themes, data table, audio overview, Reddit listening, the 18 document kinds, prototype, scanned PDF | completion kit step 5 |
| B11 | Plan card steps are one row per specialist; no steering options (orientation, density, length, format); deck photographs not a step | plan.py |
| B12 | Reddit listening is a local method not matched to Social Research; the screenshot judge is not independent | completion kit step 4 |
| B13 | Ollama and the engine do not start by themselves after a reboot | 19 Nov |

## 4. The plan, with where each item stands

Status words: DONE means run on real work through the app and checked; BUILT means code and tests exist but it has not
been run on real work since the change; OPEN means not done.

### A. Make it dependable
| # | Work | Status | Evidence |
|---|---|---|---|
| A1 | Structured output cannot kill a run: a reply cut at the token limit is asked again with twice the room, and a cut JSON object is closed at its last complete value | DONE | the report that died (task_572203cf5b6a) finished on retry (task_890538f617c8) |
| A2 | Graphics memory is released before every model call; the engine restarts when it sits idle holding memory | DONE | a video through chat (228 s), then a mind map in its normal 161 s; engine held 0.03 GB after the video |
| A3 | The conversation stays answerable while the studio works: the reply is written from the task list by code, at once; "stop" stops the work | DONE | 1.3 s reply during a running mind map (was 15 minutes, then 95 to 155 s with a small model) |
| A4 | A figure written in words is a figure, in one shared check used by every writer | DONE | reports, mind maps, infographics, study pages, audio; decks have a repair pass |
| A5 | A made-up or missing engagement id becomes the focused engagement; one start script | DONE / BUILT | the co-op journey planned on the first tool call; `scripts/start_all.ps1` written, not yet run after a reboot |
| A6 | A plain question is answered from the engagement's passages in one call, with a checked sentence on every point | DONE | 4.3 s, cited to [S34] with its exact sentence (was a ten-tool loop with no answer) |
| A7 | The agent cannot say a plan is ready or work has started unless a tool result says so; a hashtag, or a making request that names its output in plain words, whose tool was never called is pointed out once; a request that names a prototype, deck or diagram is never also planned as a research report | DONE | "#reddit" plans Reddit listening; "Build a clickable prototype of ..." had been answered by reading old tasks with no plan, and once with two plan cards |
| A8 | A document's spend approval is gone here (local work costs nothing); the audio script review stays | DONE | five study pages and an audio overview ran without a spend card |
| A9 | What the person asked for is their own words, never the page's context note | DONE | a deck request had been read as a Reddit request because the note listed Reddit work |

### B. The plan card
| # | Work | Status | Evidence |
|---|---|---|---|
| B1 | Plan before work; research offered with the chosen packs; a new engagement for a new topic; measured times | DONE | "Map the journey of [student looking for a co-op]" from the nurse engagement: new engagement, Higher Ed research, journey map, 982 s end to end |
| B2 | The choices each artifact takes, on the card: shape and detail (pictures), format and length (audio), layout (documents), brand | BUILT | read from each tool's own arguments; tested; not yet clicked in a browser |
| B3 | What was asked for, shown before starting: audience, persona, scope, the slides planned | BUILT | on the card; read-only (the outline cannot be edited on the card yet) |
| B4 | One real artifact of every kind started from its plan through the chat | DONE | section 5; started through the app's own routes by a driver, not by clicking |

### C. Artifacts against the Gemini Notebook bar
| # | Work | Status | Evidence |
|---|---|---|---|
| C1 | Mind map: 5 to 7 branches, 3 or 4 cited sentences each, no figures; an explorable tree (open, close, zoom, keyboard, ask about a node, the passages behind each branch); image, PDF, editable PowerPoint | DONE | 7 branches x 3; tree checked in a browser |
| C2 | Illustrated infographic: title, subtitle, 4 to 8 ideas in one or two groups, each with its own locally made illustration in one style, a label and a caption; editable PowerPoint | DONE | 9 of 9 checks; read by eye (info_v4.png) |
| C3 | Deck: a subtitle on every slide, drawn forms, bottom-line bands, pictures, editable text; figures in words repaired; footer names never cut mid-word; sentence-case titles | DONE | deck 3: 767 s, 8 slides, 106 text runs, 5 pictures, 5 of 5 checks, 0 open checks |
| C4 | Report: a briefing of 2,000 words or more, a summary, an action line per section, a comparative matrix, each quote shown once, sentence-case headings, no causal claim from a correlation | DONE | 4,542 words, 34 quotes, checker 0 findings, reviewer 1.0 |
| C5 | Study guide, FAQ, timeline, flashcards and quiz as saved pages with cited items; marking, score, reset and "Ask about this" | DONE except the timeline, which is BUILT (not re-run since the quote fix) | study guide 10 / 5 / 18; quiz 14 scenario questions; flashcards 38 cards, 4 of 5; FAQ 4 of 4 |
| C6 | Audio overview: the model's words, the checked quote spoken by code with its source named, two voices | DONE | 11 turns, all cited; voices in 24 s |
| C6b | Video overview: the audio overview's voices over the newest deck's slides, as one MP4, from a button on the audio overview | DONE | 186.8 s of H.264 video with AAC sound at 720p, made in 6 s; it is narrated slides, not generated scenes |
| C7 | A grader for section 2's checks (`scripts/grade.py`) | DONE | used for every row in section 5 |
| C8 | Collected sources are kept by meaning, not shared words | DONE | 7 off-subject items left out of the co-op research |
| C9 | A prototype is loaded in a browser before it ships. A script that does not parse, a run-time error, a blank screen, navigation that changes nothing and buttons that do nothing are each sent to a repair that rewrites only the lines at fault (the syntax error's line comes from the browser; a function whose brackets do not pair is named by a count); a page still broken after the repairs is refused, never shipped | DONE for the checks and repairs (each proven on a real failed build); the builder model itself stays unreliable | four refused builds repaired offline in one to two lines each; task_1dcbae982cc1 shipped working |

### D. Proof and records
| # | Work | Status |
|---|---|---|
| D1 | Acceptance runs through the app with times and checks | DONE for the kinds in section 5 |
| D2 | Tests: 357 pass, 24 skipped (they assert paid-provider behaviour) | DONE |
| D3 | Reddit parity with Social Research; an independent screenshot judge | OPEN |
| D4 | Scanned PDF, retrieval recall and the kit's operational regression list | OPEN |
| D5 | The 19 consulting document kinds (PRD, roadmap, personas and so on) run locally | DONE for executive brief, personas, recommendations and gap analysis; the other fifteen are OPEN |

## 5. Measured results (19 and 20 Nov, this laptop, all through the app)

"Checks" are `scripts/grade.py` against section 2. Times are wall time of the task; a first chat turn after idle adds
about 100 s while the orchestration model loads, and a turn with it loaded takes 2 to 15 s.

| Artifact | Time | Result | Checks |
|---|---|---|---|
| Research report, new engagement, Higher Ed pack | 895 s | 11 sources kept (7 off-subject left out), 35 findings, 4,542 words, 34 quotes, reviewer 1.0 | 7 of 8 (8 of 11 sources cited, below the 80% line) |
| Journey map, after that research | 79 s | 7 stages, 7 quoted pains | 4 of 4 |
| Mind map | 99 to 182 s | 7 branches x 3 sentences, 5 sources, editable PowerPoint | 8 of 9 before the no-figure rule; re-run has 6 to 7 branches and no figures |
| Illustrated infographic | 246 s | 6 ideas in 2 groups, 6 distinct illustrations | 9 of 9 |
| Deck with photographs | 767 s | 8 slides, 5 pictures, 106 editable text runs, 0 open checks | 5 of 5 |
| Study guide | 125 s | 10 questions, 5 essays, 18 terms, reviewer 1.0 | 6 of 6 |
| Quiz | 326 s | 14 scenario questions, every option explained | 6 of 6 (two questions were duplicates; fixed in code, not re-run) |
| Flashcards, FAQ, timeline | 186, 138, 86 s | 38 cards (4 of 5: Gemini makes 50), 13 questions (4 of 4), 8 dated events | timeline not re-run since the quote fix |
| Themes | 98 s | 8 themes, each with a quote | 3 of 3 |
| Data table | 242 s | 21 rows, every cell's quote checked | 3 of 3 |
| Audio overview | 57 s script + 24 s voices | 11 turns, all cited, about 4 minutes | 4 of 4 |
| Video clip | 228 s | five seconds with sound, through chat and its approval | decoded: picture, sound, length |
| Reddit listening | 161 s | 25 posts, 6 themes, 18 quotes; labelled "not comparable with Social Research" | not graded |
| Prototype | 9 to 20 min | nine requests through the app on 20 Nov: five builds refused in the browser (script errors; one wrongly, by a check since corrected), one request never planned (routing, since corrected), two builds shipped broken before the blank-screen and dead-navigation checks existed, one shipped working after them. That one (task_1dcbae982cc1, 1,182 s, 56 KB): an assignment list of 450 records with filters, and a row opens its rule screen with allowed and prohibited uses | read by eye and clicked in a browser: no script error, the row opens the rule screen; two tab names from the direction were not found by the screenshot step |
| Executive brief | not timed here | a short brief with checked quotes, reviewer 1.0 | read; not graded by the report checklist |
| Video overview | 6 s after the audio exists | 186.8 s MP4, H.264 and AAC, 720p, the voices over the deck's 8 slides | decoded: picture, sound, length |
| Timeline, re-run | 126 s | 15 dated entries, every quote found in its source | reviewer 1.0 |
| Personas | 529 s | four personas that differ by what the student produces, 1,574 words; the first run (413 s) repeated a paragraph and scored 0 with the reviewer, fixed by a stronger outline and a tidy pass in code | reviewer 1.0; 1 quote not found in its source; one figure written in words sits outside a quote |
| Recommendations | 451 s | first run came back in the DECIEM brand nobody asked for (the model filled the argument); a brand is now used only when the person names it; the re-run is in the house brand | reviewer 1.0; 1 quote not found |
| Gap analysis | 544 s | current state, target state and a table of gaps | reviewer 1.0; 2 quotes not found |
| A question in chat | 4 s | one answer, cited with its exact sentence | n/a |
| A question while the studio is busy | 1.3 s | what is running, which step, for how long | n/a |

## 6. What is still below the bar, plainly

- No fresh Gemini Notebook run was made for this comparison (it needs the owner's Google sign-in). "Parity" here means
  the measured counts and the captured references of 9 Nov, plus reading each local artifact.
- Prototype: the local builder model wrote a broken page in most runs on 20 Nov (a syntax error, a wrong function
  call, content never attached, tabs that redirect, a main button that only highlights). Each of those is now caught in
  the browser and repaired line by line, and the last runs are in section 5. The checks are deliberately conservative:
  a main action that does nothing can still pass when other buttons on the page work. Design quality varies from run to
  run and is below HiC's cloud-built prototypes. A build takes 9 to 19 minutes.
- No vision model on this machine is independent of both the brief's and the build's publishers, so no model looks at
  the prototype's pixels. The browser checks above are the substitute. The independent screenshot judge stays open.
- Flashcards: 38 against Gemini's 50. Report: 8 of 11 sources cited.
- The video overview is narrated slides. Gemini's has generated scenes. Local video is five-second clips only.
- Nobody has listened to the audio overview or the video's sound; only levels and transcripts were checked.
- Reddit listening works and is labelled "not comparable with Social Research"; parity with that engine is open.
- Scanned PDFs, retrieval recall and the kit's regression list are open. Four of the 19 consulting document kinds
  were run locally (brief, personas, recommendations, gap analysis). Their quotes are checked and one or two per
  document were not found in their source; the figure-in-words check that guards reports is not yet applied to them.
- The plan card and the live view were checked in a browser with real plans, and every start was driven through the
  app's own routes; nobody has yet clicked Start in the page on real work. The outline on the card is read-only.
- The orchestration model still routes some requests wrongly on the first try; code now corrects the cases seen (a
  question, a hashtag, a named output, a report planned beside a prototype, a claim with no tool behind it).
- The checker fixes found here (typography in quotes, the name under a quotation counted as part of it, a source's own
  em-dash) also apply to IA Next on port 9400 and were not ported there. Nothing is committed.

## 7. 20 Nov, second half: a fresh Gemini Notebook run, and what it changed

The owner signed the automation browser in. Notebook `38896cfc` holds 17 of the 18 source pages (The New Yorker did
not load there). Seven outputs were generated and measured; captures are in
`d:/NXT-HUMANS_AI_CX_WORKBENCH/.playwright-mcp/gemini-2026-11-20/`. The same sources and requests also went through
open-notebook on Gemini 4 Carbon (`D:/ia-next-local-kit/open-notebook/`, loopback only), for document kinds Gemini
Notebook has no button for.

| Gemini Notebook output | Measured on 20 Nov | What it changed here |
|---|---|---|
| Briefing document | 2,927 words, 0 citations, 121 percentage figures in its own voice, 16 em-dashes | nothing: the local report cites and quotes |
| Flashcards | 25 cards, one-sentence answers, no citations | local target raised from 24 to 50 (38 measured before) |
| Quiz | 12 scenario questions | none |
| Mind map | 49 nodes on four levels (4 areas, 10 topics, 34 points), every node opens | the local map gets a fourth level (areas) and up to nine branches; every level opens in the workspace tree |
| Slide deck | 14 slides, each one picture; the title slide's baked text is garbled | none |
| Infographic | one illustrated canvas with statistics and a comparison chart | each local idea now shows a checked quote with its source, preferring the quote that carries the figure |
| Audio overview | 20:36, two natural voices | Kokoro voices replace Piper where its files are present; the local script runs 1,500 to 1,900 words and is written as a conversation |

Owner directions taken on 20 Nov and what was built for each:

| Direction | Built |
|---|---|
| "Below the bar artifacts are unacceptable" | prototypes are drawn by a tested runtime (`protokit.py`) that the model fills with a specification: two of two shipped through the app in 186 s and 207 s, 40 and 46 browser checks, where one of nine hand-written builds had shipped |
| "The experts creating each artifact must be experts in creative direction, UI development, UX and graphic design, and modern AI engineering and experience" | `craft.py` states each discipline as the decisions its expert makes; it is given to the creative direction, the prototype specification and the document author. The governed Creative Director skill text is unchanged (changing it needs the owner's approved evaluation) |
| "The personas are NOT personas! Act like a UX Researcher" | a persona set has its own method, schema and page: behavioural dimensions, three to five archetypes, each with a verbatim quote, positions on the dimensions, goals, behaviours, frustrations, needs, tools, a typical episode and design implications, plus a side-by-side comparison |
| "Gap analysis is meant for competitive analyses and tables must be used with evidence and case studies" | `#gap` and `#competitive` produce a competitive gap analysis: named competitors, a capability matrix whose every rating opens its reason, case study cards with a verbatim quote, and a gap table by priority |
| "With gap analyses, the multi-agent orchestration needs to include web search" | the plan card's research step is required for a gap analysis and is aimed at named peers, what each did and case studies |
| "They read as walls of text" | every locally written document page folds to its points, has a section bar, takeaways first, citation chips that name their source, and tables that filter; exports strip the script and show everything open |

Fixed in the same stretch: all nine "quote not found" reports on local documents were checker errors (typography, and
a dash this module itself replaces); the check now compares words. A document's own prose can no longer state a
figure (rewritten, else the sentence is removed). A structured document is written in short steps, after one large
reply ran past twenty minutes.

Measured after the changes: the persona set took 182 s (3 personas, 3 dimensions, reviewer 1.0, every quote found).
The other proof runs are recorded below as they finish.

