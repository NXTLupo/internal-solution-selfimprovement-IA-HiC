# IA Next Local

IA Next, with every model call answered on this laptop. No paid API is called and no token is billed.

- Branch `ia-next-local-2026-11-19`, in its own worktree: `D:\NXT-HUMANS_AI_CX_WORKBENCH-ia-next-local\ia-next-local`.
- Address: http://127.0.0.1:9460 (IA Next keeps 9400). Its own containers, networks and data volume.
- Built from IA Next as it stood on 2026-11-19, following `IA_Next_Local_Model_Guide.md` for the Puget C160-G
  (RTX 5090 Laptop GPU with 24 GB, 96 GB memory).

## Run it

```powershell
# 1. Ollama must be running on the host (it already is on this machine; its model store is on D:).
powershell -File scripts\pull_models.ps1          # once: downloads only what is missing
# 2. Start. --env-file only fills the two free Reddit credential names; no other value reaches a container.
docker compose -f ia-next-local.compose.yml --env-file D:/NXT-HUMANS_AI_CX_WORKBENCH/.env up -d --build
# 3. Open http://127.0.0.1:9460
docker compose -f ia-next-local.compose.yml down  # stop; the data volume is kept
```

HiC's research proxy should be running too (the suite): the local build uses its free routes for data packs, the
shared wiki, diagrams and PowerPoint export. Without it, chat, uploads of text, and anything built from files already
read still work.

## How "no paid call" is guaranteed

1. **No key exists in the build.** `config.py` reads no provider key, the compose file has no `env_file`, and the
   `anthropic` package is not installed.
2. **A guard on every request.** `providers.py` wraps the HTTP client for the whole process: a request to
   `api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `api.elevenlabs.io` and the other
   hosts in `config.METERED_HOSTS` raises before it leaves.
3. **HiC cannot be made to spend.** HiC holds paid keys. An audit of its proxy sorted every route IA Next uses;
   `hic._call` passes each request through `localhic.intercept`, which answers the paid ones here or refuses them.
4. **Social Research's analysis is not called.** It uses Claude for summaries, evidence and themes.

## Seats and models

| Seat (IA Next model) | Local model | Publisher | Where it runs |
|---|---|---|---|
| Orchestration (Opus 5.5) | Nemotron 3.5 Lightning 30B-A3B Q4_0 | NVIDIA | Ollama, GPU |
| Artifact, Analysis (Opus 5.5, Sonnet 5.5) | Qwen3.8-27B Q4_K_M | Alibaba | Ollama, GPU |
| Prototyper | Ornith 1.5 35B-A3B Q4_K_M, else Qwen | Ornith | Ollama, GPU |
| Fast (GPT-6 Luna, Haiku 5.5) | MiniCPM5-2B Q4_K_M | OpenBMB | Ollama |
| Verifier (Gemini 4 Carbon) | Nemotron for Qwen authors, Qwen for Nemotron authors | other publisher | Ollama, GPU |
| Vision (screenshots, scanned pages, pictures) | Qwen3.8-27B (it takes images) | Alibaba | Ollama, GPU |
| Search (Gemini 4 Argon) | Nemotron plans queries; SearXNG finds pages | NVIDIA + free software | container |
| Embeddings (themes) | qwen3-embedding 0.6b | Alibaba | Ollama |
| Speech to text (OpenAI) | faster-whisper small | OpenAI weights, MIT | container, CPU |
| Text to speech (ElevenLabs) | Piper, two voices (lessac, ryan) | Rhasspy, MIT | container, CPU |
| Image (gpt-image) | MOSS-Image-SFT, full precision, 14 steps (since 25 Nov 2026; Stable Diffusion 3.5 Large is the fallback) | OpenMOSS, Apache 2.0 | ComfyUI, GPU |
| Video (Gemini Omni) | not set up yet (see Status) | | |

A seat is a chain (`config.SEATS[...]["chain"]`): the first installed model answers, the model that actually
answered is the one recorded, and a substitution is logged once as a `local_model_substituted` event.
Judge independence is by publisher (`config.vendor_of`).

Already on this machine before this build: both Qwen3.8-27B quantisations, qwen3.5 9B, qwen3 4B, the embedding
model, the Whisper weights, one Piper voice, and FLUX.2 dev and SD 3.5 Large image weights. Downloaded for it, to
D:: Nemotron (18.9 GB), MiniCPM5-2B (1.6 GB), Ornith (21.7 GB), a second Piper voice (63 MB).

## What changed from IA Next

| File | Change |
|---|---|
| `ia_next/config.py` | Local seats and chains, no keys, zero prices, publisher identity, metered-host list |
| `ia_next/providers.py` | Same functions and return shapes, answered by Ollama; the guard; seat resolution; context sizing that refuses instead of truncating |
| `ia_next/localsearch.py` | Search-grounded research without Gemini: model-written queries, SearXNG results, same reply shape |
| `ia_next/localhic.py` | HiC's paid routes answered here: source guides, picture and scanned-PDF reading, theme clustering, documents; others refused |
| `ia_next/localartifact.py` | The 19 document kinds written by the local author and laid out in the brand page style |
| `ia_next/localspeech.py` | Piper voices and Whisper transcription |
| `ia_next/localmedia.py` | Pictures through ComfyUI when an engine is running; a plain message when not |
| `ia_next/studio.py` | The Analyst reads sources in windows that fit the GPU and merges the findings |
| `ia_next/hic.py`, `verify.py`, `prototype.py`, `artifacts.py`, `transcripts.py`, `audio.py`, `media.py`, `social.py`, `themes.py`, `agent.py`, `deck.py`, `app.py` | Small edits to route through the local layer |
| `ia-next-local.compose.yml`, `search/settings.yml`, `requirements.txt`, `scripts/pull_models.ps1` | The local stack |
| `tests/test_local_build.py`, `tests/conftest.py` | The local contract; 22 paid-mechanics tests skipped with reasons |

## What stays the same

The workspace, the 26 tools, engagements, approvals, schedules, memory, the verbatim-quote checks, the two
verification rungs, the native PowerPoint deck, the mind map frame, downloads (PNG, PDF, editable PowerPoint), the
sandboxed renderer, and HiC's free routes (212-source data packs, the shared wiki, diagrams).

## Differences a person will notice

- **Time instead of money.** Qwen writes about 25 tokens a second on this GPU. A report or a document takes minutes.
  Switching between Nemotron and Qwen reloads a model (15 to 20 seconds each way).
- **Reddit listening uses IA Next's own method** (the local analyst labels sentiment), and its page says so. The
  shared Social Research method needs Claude.
- **Documents are written by the local author** in the page style, not by HiC's artifact engine, so they are plainer
  than HiC's documents.
- **Long material is read in parts.** A prompt that cannot fit the local context limit is refused with a clear
  message; nothing is cut silently (`IA_NEXT_MAX_CTX`, default 65,536 tokens).

## Status on 2026-11-19

Measured on this laptop, through the app's own API, with zero external charge recorded.

| Work | Result |
|---|---|
| Chat with the 26-tool agent (Nemotron) | Works. 1 to 12 seconds a turn when Nemotron is loaded; up to 2 minutes when a model must be swapped in |
| Research report, end to end | Works. 20 minutes: 16 sources (10 from the healthcare pack, 187 of 212 pack sources searched), 14 findings with verbatim quotes, cited report, one repair, judged by Nemotron |
| Mind map | Works. 93 seconds; themes as full sentences; PNG and editable PowerPoint export |
| Speech (Piper) and transcription (Whisper) | Work. 9 seconds of two-voice audio in 3.6 s; transcribed back word for word in 8 s |
| Search adapter (SearXNG) | Works |
| Guard against paid hosts | Works (a request to api.anthropic.com is refused) |
| Tests | 303 pass, 22 skipped with reasons (paid mechanics), 0 fail |

Not yet run end to end here (the code paths are in place): decks, journey maps, themes, data tables, audio
overviews, prototypes with Ornith, HiC-style documents from the local author, Reddit listening, scanned-PDF reading.

Not set up:

- **Pictures.** The image weights are on disk, but the ComfyUI install in `D:\nxt-ai-capabilities` does not start
  (its PyTorch and `comfy_kitchen` disagree). It belongs to another project and was left alone. Decks build without
  photographs until an engine answers at `IA_NEXT_COMFY_URL`.
- **Video.** Installed on 2026-11-19, see "Completion kit, round 2" below.
- **SenseNova screenshot judge.** Its repository needs a sign-in. Qwen reviews screenshots for now.

Known quality gap: the local report scored low on IA Next's own checks (17 open findings, mostly numbers written
outside quotes and claims the judge could not tie to a source). The pipeline is faithful; the writing is not yet at
the paid build's level. The guide's bake-off (same prompts, three runs, frozen evidence) has not been run.

## Completion kit, round 1 (2026-11-19, later the same day)

Following `IA_Next_Completion_Kit` in its order.

**1. Writing, replayed on the frozen first report** (`tests/fixtures/nurse_staffing_report`, no re-collection):

| | Old checker, old Writer | Fixed checker, old Writer | Fixed checker, new Writer |
|---|---|---|---|
| Deterministic findings | 12 | 2 | 0 |
| Judge (Nemotron) | 0.44 | 0.44 | 1.00 |

- 10 of the 12 findings were the checker's, not the Writer's: real quotes that differed from their source only in
  typography (curly or straight apostrophes, a restyled inner quotation, a space before a full stop, the quote's
  closing punctuation), em-dashes inside two cited source titles, and a quote over the 400-character pattern cap.
  Fixed in `verify.py`. The same checker ships in IA Next.
- The Writer is now `localwriter.py`: the model writes claims and names evidence ids; code inserts the verified
  quotes and citations; a block that states a figure itself is rewritten once, alone.
- Not yet done: a full live report through the app with the new Writer, and the blind three-run bake-off.

**2. Pictures.** IA Next Local has its own image engine: `D:\IA-Next-Runtimes\ComfyUI_windows_portable` (official
v0.46.0, checksum verified), port 8189, loopback, core nodes only, started by `scripts/start_image_engine.ps1`. Its
PyTorch is pinned to 2.11.0+cu128 because NVIDIA driver 576.57 cannot run the archive's CUDA 13.0 build. It reads the
SD 3.5 Large weights in place through `extra_model_paths.yaml`. The pinned graph is `workflows/image.api.json`.
Proof: a 7-slide deck made through the app in 14 minutes; reopened, its PowerPoint holds 5 embedded pictures and
editable text on every slide. One picture takes about 50 seconds.

**3. Video.** Not installed. File inventory for the Lite Distill ComfyUI path: about 25 GB (Lite transformer 6.4 GB,
Qwen2.5-VL encoder about 16 GB, CLIP-L, video VAE, audio VAE, vocoder), without the optional 19 GB prompt
beautifier. The publisher notes part of the extension needs a newer NVIDIA driver than this laptop has.

**4. Honest labels.** A local Reddit listening page now says "Local method, not comparable with Social Research".
A prototype's reviewer shares a publisher with neither the design brief (Qwen) nor the build (Ornith): Nemotron
reviews the source, and the screenshot review is recorded as pending until an independent vision model is installed.

**Found along the way.** While a task holds the GPU, a chat turn that checks its status can wait minutes (654
seconds once). The deck Writer spelled a figure out in words to pass the no-bare-numbers rule. Tests: 307 pass,
22 skipped with reasons.

## Completion kit, round 2 (2026-11-19): driver update and video

**Driver.** The NVIDIA driver went from 576.57 to Studio 621.24 (the owner ran the installer). The old driver package is
exported to `D:\IA-Next-Runtimes\nvidia-driver\rollback-576.57`. After the reboot: one picture in 57 seconds, Nemotron
fully on the GPU. Ollama did not restart by itself; start the Ollama app after a reboot. The engine's PyTorch stays on
the CUDA 12.8 build, which works on the new driver.

**Video: Kandinsky 6.0 Lite Distill, five seconds with sound.**

- Engine: the same dedicated ComfyUI, now with one reviewed extension, the official Kandinsky 6 nodes
  (`github.com/kandinskylab/kandinsky-6`, commit `73b892b7`, source kept in `D:\IA-Next-Runtimes\src\kandinsky-6`,
  copied by hand into `custom_nodes/kandinsky6`). The engine starts with `--disable-all-custom-nodes
  --whitelist-custom-nodes kandinsky6`, so nothing else loads. The extension's only network code is its optional
  "Download models" button, which is not used. Its requirements added packages and changed none; the environment
  before it is in `freeze-before-video-2026-11-19.txt`.
- Files, staged by hand from the publisher's table into the engine's own `ComfyUI/models` (25.4 GB measured, against
  the guide's 26.7 GB estimate): Lite Distill transformer 6.38 GB, Qwen2.5 VL text encoder 16.58 GB, CLIP-L 0.25 GB,
  HunyuanVideo VAE 0.49 GB, audio VAE 1.22 GB, BigVGAN vocoder 0.49 GB plus its config. Not downloaded: Pro Distill,
  the Qwen3.5-9B prompt beautifier (19.3 GB) and the super-resolution models.
- Graph: `workflows/video.api.json` (source of truth `localmedia._video_graph`). The publisher's text-to-video template
  without its super-resolution, beautifier and MagCache branches; 10 steps, CFG 1, denoise 1, audio scaling 0.417,
  864x480, 121 frames at 24 frames a second. Only the two captions vary per request.
- Code: `localmedia.video` runs the graph and decodes the file with PyAV before returning it. A clip with no audio
  stream, a silent track or a length other than five seconds is refused. `media.generate_video` accepts five seconds
  only, still needs the person's approval, and records the measured streams with the saved clip.
- Measured: first clip in 209 seconds from a cold engine. H.264 864x480, 121 frames, AAC 44.1 kHz, 5.04 seconds, audio
  peak 0.22. Frames checked by eye: the nurse writes on the board, then turns to the colleague. Saved as
  `D:\ia-next-local-kit\out\video_clip1.mp4`.
- Through the app: a chat request called `generate_video` and stopped at a pending approval
  (`appr_b1ac9ac5876c`). The approval was left for the owner, so the approved leg has not run through the chat.
- Not done: nobody has listened to the sound track (only its level was measured); image-to-video; a warm-run time;
  lengths other than five seconds.

## Round 3 (2026-11-19, evening): the plan before the work, and the live view

**Plan cards (`ia_next/plan.py`, `web/plan.js`).** An artifact asked for in a conversation no longer starts. The agent's
tool call returns a plan, shown as a card: what the engagement holds and whether it mentions the request, a research
step the person switches on or off (on by default when the material does not cover the request, using the data packs
they chose), and the required making steps. Each step shows an expected time: the median of that specialist's finished
runs on this machine, or the set-up measurement until a run finishes here, or "not yet timed". Start runs the chosen
steps in order, research first. Work started by a schedule, an approval or a retry is not planned again. The attachment
guard still runs before a plan is written.

**Live view (`web/orchestra.js`).** A chat turn draws You, the Agent and a branch per tool call; a task card draws the
Agent and each specialist step with its model, the skill it loaded and the elapsed time. Driven by the events
`agent_step`, `agent_tool` and `skill_used`.

**Graphics memory.** After a video the engine kept about 18 GB and a mind map ran at one word a second for 14 minutes.
`providers._room` now asks the engine to let go before every model call, and `scripts/start_image_engine.ps1` restarts
an engine that sits idle holding more than 2 GB.

Not done: a plan card has not been started end to end through the chat on real work; the watchdog has not been
exercised by a real video; the making steps are one row per specialist, so a deck's photographs are not yet a separate
optional step; no artifact has been compared side by side with a Gemini Notebook one.

## Round 4 (19 and 20 Nov): audit, the Gemini Notebook bar, and the completion plan

The audit of what was asked for, the benchmark taken from the Gemini Notebook captures, the plan and its measured
results are in `PLAN-COMPLETION-2026-11-19.md`. In short:

- Asking for an artifact shows a plan card (steps, optional research with the chosen packs, a new engagement for a new
  topic, the choices the artifact takes, measured times). A question is answered from the engagement's passages with
  a checked sentence on each point. While the studio works, the conversation answers at once from the task list.
- New local kinds: study guide, FAQ, timeline, flashcards, quiz (`localstudy.py`); an illustrated infographic
  (`illustrated.py`); an explorable mind map (`web/mindtree.js`).
- The Writer writes a full briefing with a matrix; collected sources are filtered by meaning (`localrank.py`);
  figures in words are caught everywhere; a document's quotes are no longer failed by the name beneath them.
- `scripts/grade.py <task id>` grades a finished artifact against the bar. `scripts/start_all.ps1` starts Ollama, the
  picture engine and the app.

Start everything: `powershell -ExecutionPolicy Bypass -File scripts\start_all.ps1`

## Round 5 (20 Nov): prototypes are checked in the browser and repaired by the line

- The render service reports four things about a prototype besides its screenshots: a script error with its line
  (a syntax error is located by parsing each script inside a function that is never called), a screen that shows
  no text outside its navigation, navigation that leaves the first view unchanged, and buttons that change no text.
- `prototype.py` repairs these without asking for the whole file again: `repair_script_lines` rewrites a line that
  ends inside a string, `repair_runtime_lines` rewrites the lines the browser points at (it reads the whole script
  when it is under 60,000 characters), and `unbalanced_functions` names the function whose brackets do not pair. Code
  puts each line back in place. A revision or repair is kept only when the browser shows the page is no worse. A page
  that still fails is refused and saved as `prototype.rejected.txt`.
- Routing: a making request that names its output in plain words is pointed at its tool (`agent.named_tool`), and a
  request that names a prototype, deck or diagram is not also planned as a research report
  (`plan.named_instead_of_report`). The person's own words are kept apart from the page's context note (`agent.SAID`).
- The audio overview has a "Video overview" button: its voices over the newest deck's slides as an MP4 (`narrated.py`).
- Tests: 357 pass, 24 skipped.
- Documents: a brand other than the house brand is used only when the person names it (`plan.brand_asked`); the local
  author's document is tidied by code (`localartifact.tidy`: a repeated paragraph kept once, a standfirst that repeats
  a paragraph dropped, announcing openers cut); the personas outline asks for personas that differ in what they do.

## Round 6 (20 Nov, later): a tested prototype runtime, research-shaped documents, a deeper mind map, new voices

- `protokit.py`: the prototype is a tested runtime (navigation, shared filters, tiles and bars from one seeded dataset,
  a table with search, sort and a detail drawer, an assistant whose drafts a person accepts, edits or rejects, forms,
  steppers). The author seat returns a JSON specification; `normalize` makes any specification drawable. The
  hand-written path remains behind `freeform` in the brief.
- `craft.py`: the studio standard (creative direction, experience design, interface craft, graphic design, AI
  experience) given to the seats that decide content and form.
- `docpage.py`: the pages for a persona set, a competitive gap analysis and any other document. `for_export` strips
  the folding script so exports show every section.
- `localartifact.py`: `SHAPED` kinds (personas, gap, competitive) have their own schema and instructions and are
  written in steps (`_steps`); `no_figures` clears figures from the writer's own prose in any document shape.
- `artifacts.unverified_quotes` compares words, so typography no longer fails a real quote.
- `plan.competitive`: a gap analysis always searches the web for peers and competitors.
- `mindtree.js` and `/api/tasks/{id}/mindmap`: areas above branches, four levels, every level opens.
- `illustrated.proof`: a checked quote under each infographic idea.
- `localspeech.py`: Kokoro voices when `/models/speech/kokoro` holds the model (mounted from
  `D:/ia-next-local-models/kokoro`), else Piper. `audio.LOCAL_LENGTH` and the conversation rules lengthen the script.
- open-notebook runs beside this build for comparison: `D:/ia-next-local-kit/open-notebook/run` (ports 8562 and 5065).

## Round 7 (20 Nov, evening): journey map, architecture, poster infographic, slide-template PowerPoint, visible steps

- `journeymap.py`: the local journey map. The standalone Journey Mapper's depth rules (four to six phases as events,
  activities, pains with severity and frequency, verbatim quotes per phase, named touchpoints, an emotional read,
  journey-level pains and opportunities) as a JSON specification written in steps, every quote checked by code
  (`check`), and a page drawn by code with an experience curve. `journey.build` uses it when `config.LOCAL`.
- `docpage.architecture` and `localartifact.ARCH_SCHEMA`: zones, components and flows; arrows are drawn by the page's
  script only in the gutters between neighbouring zones, and every flow is also a table row.
- `illustrated.page`: the infographic is a poster of colour blocks in the brand's colours with a dark title block.
- `slidepage.py`: the same data laid out as whole 16:9 slides. Generation saves `slides.html` beside the page and
  `exporter.source` hands it to the PowerPoint export only; the page and its PDF are unchanged. The template uses no
  inline pills and no CSS-generated quotation marks, because the exporter turns both into floating boxes.
- `store.stage`: each step of long work is a node in the live view, with its role, model and a line of result.
- `localartifact.bounded`: every string and list in a step schema has a limit, so a reply cannot run on;
  `localartifact.calm` settles a citation the model repeated; `docpage.cite` draws citations as footnote numbers.
- Personas: `lifestyle_images` (one photograph per persona from the local picture engine), traits, motivation and
  channel bars. `plan.competitive` makes web search a required step of a gap analysis and sends the whole topic.
- The page says IA Next Local and "no cost"; the paid IA Next is the one on port 9400.
- Checks kept in `D:/ia-next-local-kit/out`: `kit_walk.py` (prototype), `doc_walk.py` (documents), `jm_measure.py`
  (dots on the curve), `arch_shot.py` (no arrow through a box), `pptx_overlaps.py`, `slides_fit.py`.
- Known gaps: the live view shows elapsed time, not expected time per step; two documents can still start at the same
  moment; a gap analysis's research step also writes a full report, which takes most of its time; the slide deck and
  the video overview were not changed.
- Tests: 377 pass, 24 skipped.

## Round 8 (20 to 22 Nov): PowerPoint text that cannot re-wrap, a deeper mind map, evidence table in the gap deck

- `exporter.steady`: applied to every PowerPoint made from a slide page. PowerPoint substitutes the brand face when
  it is not installed, lines run wider, and text wrapped where it did not in the browser (a label broke as "GOAL/S",
  a bullet gained a line and sat on the next one). One-line boxes are stored with wrap="none"; multi-line boxes store
  a 90 percent fit. Confirmed by rendering the persona, journey and gap decks in PowerPoint. `VERSION` is "6" so
  kept exports are made again.
- `exporter.source`: a finished gap analysis or architecture is laid out again from its `data.json` at export, so a
  slide template fix reaches finished work. Persona sets and journey maps keep their saved `slides.html` (their
  photographs are not kept in the saved data).
- `slidepage.competitive`: a table "Why each one is rated as it is" (capability, organization, rating, what the
  source shows, source), five rows a slide; a case study part with no text is left out with its label.
- `diagram.MIND_NODES = 50`: a mind map under fifty nodes gets the second pass, asked for four or five sentences a
  branch and up to eleven branches. Measured 22 Nov: 44 nodes (4 areas, 11 branches, 28 points) and 30 verbatim
  quotes behind them; the run before had 35. Sentences that state a figure are still dropped, which is why it
  stops short of fifty.
- Gap analysis through the app (task_5bef2184b37e): web evidence step (34 findings, 46 sources, no report written),
  5 organizations, 5 capabilities, 4 case studies, 5 gaps, reviewer 1.00.
- The agent's instructions no longer say video is not set up, and the report tool no longer names a price.
- Tests: 379 pass, 24 skipped.
- Slide deck (22 Nov): `deckstudio.own_outline` drops an outline the agent invented (five invented items had made a
  six-slide deck); with no outline the composer is given nine named slide roles (`ROLES`) and the count is in the
  reply's grammar (`SCHEMA_LONG`); `normalize` drops a slide whose title repeats; the cover title's height is counted
  by word wrap, so the subtitle no longer sits under its last line. Through the app: task_3b5548177ec7, ten different
  slides, five pictures, two verified quotes, rendered in PowerPoint with no overlap.
- Video overview (22 Nov): `/api/tasks/task_83f61c0cfd58/video`, 518.9 seconds, 1280 by 720, AAC sound, made in 106
  seconds, each picture pushed in and faded.
- Live view: a running step reads "Qwen, deck composer, 4 min of about 12 min", seen in the browser.
- Known gaps now: the mind map has 44 nodes where Gemini's had 49; sub-steps appear in the live view only when they
  begin; two documents can start at the same moment; the PowerPoint chrome is a background picture; a deck cover's
  kicker is cut at 90 characters. Tests: 380 pass, 24 skipped.

## Round 9 (22 Nov): legible slide decks and PDFs, the gap page's citations, the video plays

- Owner, 22 Nov: the gap page's citations spilled across its cards; the persona and architecture decks and PDFs were
  illegible, with odd wrapping and slide breaks; the video did not load.
- `docpage.cite`: a replacement meant to move the full stop before a footnote had been mangled into two control
  characters, which deleted every footnote's closing tag (58 on the gap page), so the rest of each card was one
  unwrapped line of footnote text. Fixed and tested; the finished gap page was redrawn from its data (the old file is
  kept as `artifact.before-citation-fix.html`). The persona motivation rows used the class `bar`, which is also the
  section menu, and stretched the menu into a two-column grid: renamed `mbar`.
- `slidepage.py` rebuilt for a room: body 28 px (14 pt in PowerPoint), titles 60 px, nothing under 20 px (10 pt); the
  condensed face only for slide titles. Persona set: overview with photographs, where each persona sits (in words),
  then two slides per persona (who they are; what they do and need, with a "Design for this persona" band). Journey:
  two slides per phase (what happens and how it feels; pain points with quotes and where to act). Gap analysis: one
  case study per slide, evidence three rows a slide, gaps three a slide. Architecture: zones, connections, weak points
  (where, what fails, who it hurts, quote), changes. `_clip` no longer reads "U.S." as a sentence end and never leaves a
  cell empty; `_whole` leaves out an optional line rather than cutting it. Checked with `slides_fit2.py` (in the
  renderer's image): no overflow and no trimmed sentence on the persona, gap, journey and architecture slides.
- `exporter.relayout`: finished persona sets and journey maps are laid out again from their saved data, photographs
  taken from their pages; `VERSION` 7.
- PDF of a page with slides is now printed from the slides, one slide per page with real text, through a new
  `print` mode in `render/app.py` (the windowed PDF painted only the first and last page of a long slide document).
- Video: served inline with byte ranges (`FileResponse`), one made at a time per audio overview (`_LOCKS`), and the
  index moved in front of the media by `narrated.faststart` (the encoder's own faststart, through PyAV, wrote a file
  with no readable streams). The app's "Video overview" button now shows progress and plays the video in the card.
  Checked in the browser: metadata in under 0.1 s, plays, seeks.
- `agent.hashtag_kind` + `plan.gate`: a document hashtag fixes the kind as well as the tool ("#architecture" had been
  planned as a technology audit, and matched no hashtag at all).
- Tests: 384 pass, 24 skipped.
- Later the same day: `artifacts.unverified_quotes` returns whole quotes (they were cut to 160 characters, so
  `repair_quotes` could never find a long one on the page) and passes a long quote whose letters run unbroken in a
  source (PDF text splits words: the gap analysis's one "unverified" quote was faithful; its source reads
  "r estrictive"). `slidepage.org_summary` fills an empty organization summary from that organization's own cited
  matrix evidence (San Jose State's card was blank). A journey phase keeps its second pain's quote when the first has
  none. The gap page was redrawn: 59 footnotes, every quote found in its source. Its card summary still reads "1 quoted
  passages not found" from the original run; the check record was not edited by hand. Tests: 386 pass, 24 skipped.
- A fresh gap analysis through the app with every fix in place (task_10319147d807, 682 s: research 391 s, writing
  213 s): 79 sources, 5 organizations, 5 capabilities, 4 case studies, 5 gaps, reviewer 1.00, 0 quoted passages not
  found; its record has no findings; its page has 62 footnotes, all closed. Gap rows with a long cell now go two to a
  slide so every sentence stays whole: 15 slides, 15 PDF pages, nothing under 10 pt, nothing trimmed. It supersedes
  task_5bef2184b37e, whose record still carries the original run's note. Tests: 386 pass, 24 skipped.

## Round 10 (22 Nov): video transcription, the local counterpart of the standalone Video Analyzer

- Owner, 22 Nov: "was the local version of Intelligence Augmentation's stand alone video transcription tool ever
  implemented? ... accept youtube links and/or uploaded video files ... DO NOT OMIT THIS IMPORTANT TOOL CAPABILITY".
  It had not been: only audio uploads under 25 MB were transcribed (faster-whisper small, synchronously).
- `videotranscript.py`: tool `transcribe_video` (agent, plan card with four steps, hashtag `#transcribe`) and the upload
  route (every video, and audio over 25 MB, streamed to disk and transcribed as a task). Fetcher (yt-dlp, captions as
  a fallback), Transcriber (Whisper large-v3, faster-whisper int8), Writer (TXT, Markdown, SRT, VTT, JSON), Archivist
  (source S# with address and channel, second brain with timestamped manifest chunks, `chunks.json`). The card has
  download buttons; the page links every file and every moment; PowerPoint and PDF are made from `slides.html`.
- One-time download (done 22 Nov): `snapshot_download("Systran/faster-whisper-large-v3",
  local_dir="D:/ia-next-local-models/whisper/faster-whisper-large-v3")`, 3.09 GB, MIT licence. Compose mounts it
  read-only; `requirements.txt` adds yt-dlp and youtube-transcript-api.
- `store._Stage.say` now writes the running step's line as it changes and `expect()` sets a step's expected time;
  the live view shows the line under the running step (`web/orchestra.js`, `.orc__said`).
- `plan.is_question` ignores links: "Please transcribe ...: https://www.youtube.com/watch?v=..." was refused as a
  question because of the link's "?".
- Measured through the app: a 19-second YouTube clip (S131) in 35 s; an uploaded 08:38 narrated video (S132) in
  150 s, 98.6 percent of the script's words recovered in order; a 15-minute YouTube talk with the live view showing
  "02:22 of 15:04 transcribed" and "2 min of about 4 min".
- Batched decoding (`BATCH = 16`, faster-whisper's BatchedInferencePipeline, same weights): the 08:38 video in 174 s
  instead of 406 s; on the benchmark 99.5 percent of the words were the same as one-at-a-time decoding. Word timings
  are cut into subtitle lines (`cues`: a sentence end after 1.5 s, or 7 s, or 84 characters). The running step's
  expected time follows the pace of the recording (`st.expect` from the progress).
- Second brain check, 22 Nov: transcripts take the same path as uploads and pack sources (one S# in
  `uploaded_sources.json` and the evidence index, `secondbrain.archive` to HiC's `write-article`, manifest chunks cut
  by HiC's char spans, `material()` by pointer for every builder, the source guide, the Sources panel). Builders read
  chunks by pointer, so they never depend on embeddings. The whole-second-brain search (`recall`, HiC
  `chunks-by-goal`) does: HiC embeds with `EMBED_PROVIDER=local`, served by social-research-backend:8081, which was
  stopped after Docker restarted, so pages written today until 22:14 have no chunk-store embedding. The backend was
  started through docker-compose-all; new pages embed on write (checked: the zoo clip is found). Pages written during
  the outage need `POST /api/wiki/chunks-backfill` (skips pages already embedded); not run, awaiting the owner.
- Owner decisions, 22 Nov: (1) backfill approved: `POST /api/wiki/chunks-backfill` started 14:46 PST; HiC's own check
  found 9,398 wiki pages without a chunk-store entry (far more than the afternoon's outage), embedding at 0.7 pages a
  second with no failures, about 3.6 hours; HiC's health stays instant, second-brain search takes about 20 s while it
  runs. (2) S131 ("Me at the zoo") removed from eng_ad1e84d10f22: source record, evidence row and second-brain map
  entry; backup `results/uploaded_sources.json.before-removing-S131.json`; the shared wiki page stays (the test
  engagement's S4 uses it). (3) task_5bef2184b37e kept as history; task_10319147d807 is the clean gap analysis.
- Backfill outcome (22 Nov, 20:30 PST): the first run embedded about 9,170 of 9,398 missing pages with no failures,
  then one HiC worker stalled near the end at full processor load (no DONE line) and blocked a second run in its
  `has_article` pass. `docker compose -f docker-compose-all.yml restart research-proxy` (no HiC session or job open)
  cleared it. HiC's `/api/wiki/embed-status`: the live chunk store (`/hic-workspace/wiki/.vectors.local-768.db`, not
  the stale `.vectors.db`) holds 25,675 pages and 123,842 chunks against 24,174 wiki articles; whole-second-brain search
  returns the Stanford transcript's chunk as the top hit for its content.
- 23 Nov, owner's choice: the superseded gap analysis task_5bef2184b37e was deleted (its task, step and conversation
  rows removed; its folder kept at results/deleted/task_5bef2184b37e; a task_deleted event records it). The gap analysis
  is task_10319147d807.

## Round 11 (23 Nov): the modernization uplift, built and measured

The plan is `plans/modernization-uplift-plan-2026-11-23.md` (its section 10 has the step-by-step status). Nothing is
committed. Tests: 463 pass, 24 skipped (from 436 at the start of the day). README "The uplift of 23 Nov 2026" maps
each change to its module.

- Self-improvement (WS-1): `scorecard.py` scores every finished task in code; a failed hard check puts "Needs review
  (...)" at the front of the summary, and a clean re-score after a fix removes it. Good / Needs work buttons record
  the owner's verdict. `improve.py` turns repeated failures into gated skill candidates or attention items; nothing is
  promoted without the owner.
- Caching and residency (WS-2): per-call telemetry and `GET /api/tasks/{id}/telemetry`; one fixed context per model;
  one byte-identical head for every stepped writer; a call inside a step streams and the step shows "writing: N
  tokens so far" (now also for steps opened with `start_node`: the Analyst, the Writer, the Deck Composer). Measured
  on Ollama 0.40.16: `prompt_eval_count` reports the whole prompt even when it is reused, so reuse is read from the
  prompt time; a changed `num_ctx` reloads the model.
- Orchestration bake-off (`scripts/bakeoff_orchestration.py`, 15 cases the rules leave to the model): Qwen alone had
  a median of 3.4 s and 0.3 s of model loads; Nemotron beside Qwen 11.9 s and 250.6 s. Graded accuracy 60 vs 53
  percent (80 vs 53 counting `recall` as right for evidence questions). The owner chose Qwen alone (23 Nov): the
  conversation seat is Qwen, and while a studio task runs the task list answers at once instead of queueing behind it.
- Second brain (WS-3): `/health/deep` and a page banner; recall falls back to the engagement's own sources when HiC
  cannot search; coverage on the Sources panel ("63 of 63 sources archived in the wiki, read as 512 passages");
  pages archived while the embedder was down are re-chunked when it returns. Measured live: HiC's search costs about
  25 s per query over 123,842 chunks, so rephrased searches run only when the first comes back thin, and the 2B
  model's rerank needed its array length fixed by the grammar (it returned 11 scores for 12 passages). Live recall
  went from 56 s to 15 s with the rerank applied. HiC's own chunker on a one-hour transcript: joined as one block
  (the old audio path), 20 of 22 chunks started and ended mid-sentence with no timestamps; as timestamped
  paragraphs, none. Audio uploads now keep timestamped paragraphs, as video transcripts did.
- Routing (WS-4): `router.py`. Live: "Map the technical architecture students and advisors use for AI help in
  coursework #architecture" got its plan card in 0.34 s with no model call (event `routed_in_code`).
- Context and memory (WS-5): Ollama 0.40.16 has no tokenizer endpoint (404). Characters per token measured
  (`scripts/calibrate_tokens.py`): evidence about 4.1 on Qwen, Nemotron and MiniCPM, JSON 2.9 to 3.6. With the old
  three-per-token count a full builder call needed 36,512 tokens and jumped to the 65,536 window (a reload); now it
  stays on 32,768. Ollama refuses an over-long prompt with a 400 ("request (N tokens) exceeds the available context
  size") rather than cutting it; chat resends at the step that holds N. Long conversations are compacted; tool
  results become one line and a file after their turn. Episodic memory (`episodes.jsonl`) is read by `recall`;
  learned entries no recall used for 60 days move to `MEMORY.archive.md` (the person's own instructions stay).
- One builder engine (WS-6): `builder.py` runs every builder: personas, architecture, competitive analysis, journey
  map, the five study pages and the deck. `tests/fixtures/builder_golden*.json` record what the old loops sent the
  model (clean and with a failing step); the engine sends the same bytes. Ornith was not removed: the plan called it
  unused, but the Prototyper uses it (36 calls, 13 prototype steps). `DORMANT_SEATS` marks the two seats nothing
  reads. Stylesheets: no page defines a class twice with different values, so 143 working names were not renamed;
  `tests/test_css_collisions.py` fails on a new collision.
- Live end-to-end (the architecture request above, plan started through the API): research 305 s (8 sources
  collected, 31 findings), architecture 141 s on the engine with every step on the card, reviewer 1.00. The scorecard
  marked it "Needs review (no_cut_sentences)": the first slide's 177-character standfirst ended "uneven learning…"
  against a 170 budget. Fixed in `slidepage._lead` (optional lines whole, a little longer, or left out; never cut);
  re-scored clean, all 5 slides fit, and the exported PowerPoint was rendered through PowerPoint (SaveCopyAs) and
  read slide by slide. The page loads with no console error from this work.
- Seen and left alone (not from this round): two old journey-map previews (task_33d8e1eb5016, task_5f7643f28f2d)
  fill the console with "Blocked script execution" because the preview frame is sandboxed; in the architecture's
  flow table some "To" cells are set smaller than others; two weak-point quotes cite a source titled "Video overview";
  the "Student users" zone came back with no components.
- Owner decisions, 23 Nov (after the round): hard gates stay as listed; "Needs review" work stays visible with its
  label; moving HiC's embedder to Ollama is planned in `plans/hic-embedder-on-ollama-plan-2026-11-23.md` (Ollama's
  `qwen3-embedding:0.6b` measured at 1,024 dimensions against HiC's 768, so option B means a full re-embed), nothing
  in HiC changed.


## Round 12 (24 Nov): the field-test uplift, executed and measured through the page

The owner's field test of 23 Nov failed all four cases. `plans/field-test-2026-11-23/PROGRESS.md` is the log of what
was built, in order, with every measurement; README "The field-test uplift of 24 Nov 2026" maps each change to its
module. Tests: 516 pass, 24 skipped (from 463).

- Through the page on the final builds: today's AI news in 9 to 14 seconds with dated links; AI Trends themes in 7.0
  minutes (25 themes in 7 groups, 28 sources); themes, report, deck, journey map and audio on higher education
  students and AI in 35 minutes; research, report and a five-screen prototype on a prior engagement in about 15.
- A partner's read of the Case 3 outputs on 24 Nov still rejected them: K-12 and school-pupil evidence in a report on
  college students, a personal page carrying a section, page furniture clustered into a theme and shown as a slide,
  a persona named after a real student, speaker notes written as stage directions. Each has a fix in code
  (`evidencequality.py`, `themes.build`, `journeymap.composite`, `deckstudio.spoken`) and a test.
- Engagements are managed as projects (owner, 24 Nov): settings, tags, pin, archive, multi-select, merge and separate.
  Checked through the page with `plans/field-test-2026-11-23/rig/eng_ui.js`.
- Lessons kept: a shell heredoc corrupts backslashes in a patch (write the patch as a file); run the suite between an
  edit and a rebuild; a metric passing says nothing until the artifact is read end to end; a prompt that lists example
  actors gets those actors back in every report.
- Third pass (24 Nov): the lanes (`lanes.py`), the local pack index (`packindex.py`), dates and search by meaning for
  the Library, a population check that reads what each source says, a release gate and a Gemini Notebook comparison by
  the 9 Nov audit's instruments. Measured: two pieces of work side by side on one card are slower than one after the
  other (deck 17.2 and journey map 14.0 minutes against 9.2 and 5.3), so the studio runs one at a time, shortest first.
- Open: a live Gemini Notebook run on the same subject needs the owner's signed-in session.
