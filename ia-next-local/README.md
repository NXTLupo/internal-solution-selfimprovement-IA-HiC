# IA Next Local

IA Next Local is the IA Next research agent with every model call answered on this machine. A person talks to one
agent in plain words. The agent plans the work, a studio of specialist steps does it on open-weight models, and code
checks the result. No paid API is called and nothing is billed.

This file was written from the code on 20 Nov 2026. Where it gives a measured number, it names the record the number
comes from: `LOCAL.md` (the build log) or `PLAN-COMPLETION-2026-11-19.md` (the audit and its measured runs). When
those records and the code disagree, the code is right. The code was still being edited that afternoon, so a limit or
a constant named here may have moved since; each one names the function or constant to check.

| Fact | Value | Where it is set |
|---|---|---|
| Address | http://127.0.0.1:9460, this machine only | `ia-next-local.compose.yml` |
| Compose project | `ia-next-local` | `ia-next-local.compose.yml` |
| Containers | `ia-next-local` (the app), `ia-next-local-render` (Chromium), `ia-next-local-search` (SearXNG) | `ia-next-local.compose.yml` |
| Data | the Docker volume `ia-next-local-data`, mounted at `/data` | `ia-next-local.compose.yml`, `ia_next/config.py` |
| Language models | Ollama on the host, `http://host.docker.internal:11434` | `IA_NEXT_OLLAMA_URL` |
| Pictures and video | a dedicated ComfyUI on the host, port 8189 | `IA_NEXT_COMFY_URL`, `scripts/start_image_engine.ps1` |
| Agent tools | 26, fixed when the app starts | `ia_next/agent.py` and the specialist modules |
| Git | nothing in this folder is committed | `git status` shows the folder as untracked |

## Contents

1. [What differs from the paid IA Next and from HiC](#what-differs-from-the-paid-ia-next-and-from-hic)
2. [How to start, rebuild and test it](#how-to-start-rebuild-and-test-it)
3. [How the build makes a paid call impossible](#how-the-build-makes-a-paid-call-impossible)
4. [Which model fills each seat](#which-model-fills-each-seat)
5. [How the agent handles a message](#how-the-agent-handles-a-message)
6. [How a plan card turns a request into ordered steps](#how-a-plan-card-turns-a-request-into-ordered-steps)
7. [How tasks, steps and the live view are recorded](#how-tasks-steps-and-the-live-view-are-recorded)
8. [Where evidence comes from and how it is checked](#where-evidence-comes-from-and-how-it-is-checked)
9. [How each artifact is made](#how-each-artifact-is-made)
10. [How downloads are made](#how-downloads-are-made)
11. [The craft standard and where it is injected](#the-craft-standard-and-where-it-is-injected)
12. [Safety and honesty rules that code enforces](#safety-and-honesty-rules-that-code-enforces)
13. [What was measured on this machine](#what-was-measured-on-this-machine)
14. [The uplift of 23 Nov 2026](#the-uplift-of-23-nov-2026)
15. [Known limits](#known-limits)
16. [Map of the folder](#map-of-the-folder)

## What differs from the paid IA Next and from HiC

There are three systems. They run side by side and do not share containers, networks or data volumes.

| | HiC and the suite | IA Next (paid) | IA Next Local |
|---|---|---|---|
| Compose file | `docker-compose-all.yml` in the main workbench | `ia-next/ia-next.compose.yml` | `ia-next-local.compose.yml` |
| Port | HiC's research proxy on 5012, among others | 9400 | 9460 |
| Models | Claude, Gemini and GPT through paid APIs | Claude, Gemini and GPT through paid APIs | open-weight models in Ollama on this machine |
| Provider keys | in the workbench root `.env` | read from that `.env` | none: `config.py` reads no key and the compose file has no `env_file` |
| Cost of a model call | billed | billed and metered | 0.00; tokens, seconds and model are still recorded |
| Documents | written by HiC's artifact engine | requested from HiC's artifact engine | written here by `ia_next/localartifact.py` |
| Web search | provider search grounding | Gemini with Google Search grounding | a local model writes queries, SearXNG finds pages |
| Voices | paid speech services | HiC's speech route | Kokoro or Piper inside the app container |
| Pictures and video | paid image and video models | paid image and video models | ComfyUI on this machine |

IA Next Local still calls HiC's research proxy, through the host, for routes that use no paid model: data packs and
source collectors, the shared wiki (the second brain), the native diagram renderer and the PowerPoint exporter. Every
such call passes through `ia_next/localhic.py` first. A route that could reach a paid model inside HiC is either
answered on this machine or refused. When HiC is not running, each call raises `HicUnavailable` with a readable reason
and the work that does not need HiC still runs.

## How to start, rebuild and test it

Three things must be running on the host before the app is useful: Ollama (language models and the embedding model),
the picture engine (only for pictures and video), and Docker Desktop.

```powershell
# Everything, in order: Ollama, the picture engine, then the three containers. It reports what answers.
powershell -ExecutionPolicy Bypass -File scripts\start_all.ps1

# Or by hand:
powershell -File scripts\pull_models.ps1                 # once: pulls the models each seat names into Ollama
powershell -ExecutionPolicy Bypass -File scripts\start_image_engine.ps1   # the picture and video engine, port 8189
docker compose -f ia-next-local.compose.yml --env-file D:/NXT-HUMANS_AI_CX_WORKBENCH/.env up -d --build
# open http://127.0.0.1:9460
docker compose -f ia-next-local.compose.yml down         # stop; the data volume is kept
```

`--env-file` fills two names only, `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`, which the compose file passes by
name. No other value from that file reaches a container.

**Rebuild after a code change.** The `Dockerfile` copies `ia_next/` and `web/` into the image, so an edit has no
effect until the image is rebuilt:

```powershell
docker compose -f ia-next-local.compose.yml --env-file D:/NXT-HUMANS_AI_CX_WORKBENCH/.env up -d --build --no-deps ia-next-local
```

A restart ends work in flight. At start-up `plan.recover()` marks any plan that was running as failed and says so on
its card. Do not rebuild while a task is running.

**The picture engine.** `scripts/start_image_engine.ps1` starts ComfyUI from `D:\IA-Next-Runtimes\ComfyUI_windows_portable`
on 127.0.0.1:8189 with all custom nodes disabled except the Kandinsky 6 video nodes, and with API nodes disabled. It
then watches the engine: when the engine has nothing queued and still holds more than 2 GB of graphics memory for 20
seconds, the script restarts it. The app waits up to 90 seconds (`localmedia.ENGINE_WAIT`) for a restarting engine.

**Tests.** The tests are offline. `tests/conftest.py` points HiC, the renderer, Social Research, Ollama, SearXNG and
the picture engine at a closed port, so no test reaches a live service. It also skips 24 tests copied from the paid
build that assert paid-provider behaviour, each with its reason. The last full run (23 Nov 2026) was 463 passed and
24 skipped. Some tests read `scripts/` (the builder golden record and the stylesheet scanner), so mount it too. Each
form starts a temporary container:

```powershell
docker run --rm -u root -v "${PWD}/tests:/app/tests:ro" -v "${PWD}/ia_next:/app/ia_next:ro" -v "${PWD}/web:/app/web:ro" `
  -v "${PWD}/scripts:/app/scripts:ro" ia-next-local:0.1 python -m pytest -q -p no:cacheprovider tests
```

```sh
# Git Bash: copies the tree into the container so nothing is written back
R=$PWD && MSYS_NO_PATHCONV=1 docker run --rm -v "$R:/src:ro" ia-next-local:0.1 sh -c "mkdir -p /tmp/w && cd /src && \
  cp -r ia_next tests workflows web render scripts search Dockerfile requirements.txt LOCAL.md ia-next-local.compose.yml /tmp/w/ 2>/dev/null; \
  cd /tmp/w && python -m pytest tests -q -p no:cacheprovider"
```

`python -I scripts/grade.py <task id>` grades a finished artifact against the checks in
`PLAN-COMPLETION-2026-11-19.md` section 2. It reads the running app on 127.0.0.1:9460 and calls no model.

## How the build makes a paid call impossible

1. **No key exists.** `config.py` sets `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` and `OPENAI_API_KEY` to empty strings and
   reads none from the environment. The compose file passes no provider key.
2. **A guard on every request.** `providers._install_guard()` wraps `httpx.Client.send` and `httpx.AsyncClient.send`
   for the whole process. A request to any host in `config.METERED_HOSTS` raises `ProviderError` before it leaves.
3. **HiC cannot be made to spend.** `hic._call` hands each request to `localhic.intercept`. Source guides, upload
   parsing, topic modelling, speech and document jobs are answered here. Any other path under `localhic.PAID_PREFIXES`
   raises `Refused`.
4. **The meter still runs.** `providers.Usage.usd` returns 0.0. Each call is written to the `spend` table with its
   model, tokens and seconds.

## Which model fills each seat

A seat is a role. `config.SEATS` gives each seat a primary model and a chain. `providers.resolve` uses the first
model of the chain that Ollama has installed and that has the capability the call needs (tools or vision). The model
that answered is the one recorded, and a substitution is logged once as a `local_model_substituted` event.

| Seat | Primary model | Chain after the primary | Used for | Called in |
|---|---|---|---|---|
| orchestration | Qwen3.8 27B, Q4_K_M (owner's decision, 23 Nov) | Qwen3.8 27B IQ4_XS, Nemotron 3.5 Lightning 30B-A3B, Qwen3.5 9B | the conversation agent and its tool loop; a question answered from sources | `agent._turn`, `agent._steps`, `answers.answer` |
| search | Qwen3.8 27B, Q4_K_M (the resident model, since 24 Nov) | Qwen IQ4_XS, Qwen3.5 9B | writing three to five web search queries; the check of who each finding is about | `studio.research_lead` through `localsearch.grounded` |
| analysis | Qwen3.8 27B, Q4_K_M | Qwen IQ4_XS, Qwen3.5 9B | findings with exact quotes, upload analysis, theme naming, diagram and infographic specifications, data tables, Reddit themes | `studio.analyst`, `transcripts.py`, `themes.py`, `diagram.py`, `illustrated.py`, `datatable.py`, `social.py` |
| artifact | Qwen3.8 27B, Q4_K_M | Qwen IQ4_XS, Qwen3.5 9B | the report, decks, documents, study pages, the journey map, audio scripts, the prototype's direction and specification | `localwriter.py`, `deckstudio.py`, `localartifact.py`, `localstudy.py`, `journeymap.py`, `audio.py`, `prototype.py`, `protokit.py` |
| fast | MiniCPM5 2B, Q4_K_M | Qwen3 4B, Qwen3.5 9B | source guides, the data pack picker, the library filter, the memory reviewer | `localhic._guide`, `hic.pick_packs`, `library.py`, `reviewer.py` |
| prototype | Ornith 1.5 35B-A3B, Q4_K_M | Qwen3.8 27B, Qwen IQ4_XS | the hand-written prototype build, which no tool argument selects today (see the prototype section) | `prototype._ask` |
| verifier | Nemotron, with Qwen as secondary | Qwen IQ4_XS, Qwen3.5 9B | the reviewer of a deep report or document (a fast report is checked in code only) | `verify.judge` |
| vision | Qwen3.8 27B | Qwen IQ4_XS, Qwen3.5 9B | reading pictures and the pages of a scanned PDF | `localhic._read_image` |
| image | `comfyui:sd3.5-large` | none | deck pictures, persona and journey photographs, infographic illustrations, `generate_image` | `providers.openai_image`, `localmedia.image` |
| video | `comfyui:kandinsky-6.0-lite-distill` | none | one five-second clip with sound | `media.generate_video`, `localmedia.video` |
| deep_reasoning, research | Qwen3.8 27B | Qwen IQ4_XS | configured; no module calls these seats | `config.py` only |

**The verifier is a rule.** `verify.judge_model_for(author)` returns the verifier's primary when its publisher differs
from the author's, else the secondary. Publisher comes from `config.vendor_of` (Nemotron is NVIDIA, Qwen is Alibaba,
Ornith is Ornith, MiniCPM is OpenBMB). Reports and documents are written by Qwen, so Nemotron reviews them.

**Models outside the seats.**

| Job | Model or engine | Where it runs | Code |
|---|---|---|---|
| Embeddings | `qwen3-embedding:0.6b` | Ollama `/api/embed` | `localrank.py` (is a collected source on the subject), `localhic._embed` (theme clustering) |
| Speech, preferred | Kokoro (`kokoro-v1.0.onnx`), voices `af_heart`, `am_michael`, `af_bella`, `am_fenrir` | app container, processor | `localspeech._kokoro`, used when both Kokoro files are under `/models/speech/kokoro` |
| Speech, fallback | Piper, preferring `en_US-lessac-medium` and `en_US-ryan-medium` | app container, processor | `localspeech.dialogue` |
| Video and long-recording transcription | Whisper large-v3 (`Systran/faster-whisper-large-v3`, MIT), int8, 16 threads | app container, processor | `videotranscript.transcribe` |
| Listening | faster-whisper `small`, `int8` | app container, processor | `localspeech.transcribe` |
| Pictures | Stable Diffusion 3.5 Large (`sd3.5_large_fp8_scaled.safetensors`), 28 steps | ComfyUI on the host | `localmedia._graph`, pinned in `workflows/image.api.json` |
| Video | Kandinsky 6.0 Lite Distill, 10 steps, 864x480, 121 frames at 24 frames a second | ComfyUI on the host | `localmedia._video_graph`, pinned in `workflows/video.api.json` |
| Web search | SearXNG, which queries public search engines with no key | `ia-next-local-search` | `localsearch.search` |
| Page rendering | Chromium through Playwright | `ia-next-local-render` | `render/app.py` |

**How a local call is shaped** (`providers.chat`). Every call goes to Ollama `/api/chat` with temperature 0.2 and seed
7. A JSON schema is passed as Ollama's `format`, so a reply is held to the schema by grammar. The context window is
chosen from the prompt's size in steps of 16,384, 32,768 and 65,536 tokens up to `IA_NEXT_MAX_CTX` (default 65,536); a
prompt that cannot fit is refused with a message, never cut. A structured reply that runs out of room is asked once
more with twice the room. A JSON object cut off mid-way is closed at its last complete value (`providers.repair_json`).
Before each call `providers._room` asks the picture engine to release graphics memory, because both share one
graphics card.

## How the agent handles a message

`ia_next/agent.py` is the one entry point for a conversation. Each conversation has a fixed system prompt, a snapshot
of the person's memory taken when it started, and the fixed list of 26 tools.

**What reaches the agent with a message** (`agent.turn`): the person's own words, kept separately from the page's
context note (`agent.SAID`, `store.TURN`); the focused engagement; the files attached in this conversation, checked
against the engagement's stored uploads; the sources the person switched off; the data packs chosen in the composer;
and a line listing the work this conversation started.

**The order of decisions in one turn** (`agent._turn`):

1. **The studio is busy.** If a task is running and the orchestration model is not in memory, code writes the reply
   from the task list at once: what is running, which step, for how long. The word stop, cancel, halt or abort stops
   the running tasks. No model is called (`agent.desk_reply`).
2. **The message is a question.** If an engagement is focused and `plan.is_question` is true (it asks something and
   names no output and no hashtag), `answers.answer` makes one call. The model returns points, each with a source id
   and one copied sentence. Code keeps a point only when the sentence is found in that source's passages and the
   point's own words state no figure.
3. **Otherwise the tool loop runs** (`agent._steps`), for at most 10 steps.

**The 26 tools.**

| Group | Tools | Module |
|---|---|---|
| Research and evidence | `start_research_report`, `start_social_analysis`, `analyze_uploads`, `start_themes`, `recall`, `read_report`, `list_engagements` | `agent.py`, `social.py`, `transcripts.py`, `themes.py` |
| Artifacts | `start_deck`, `revise_slide`, `rebrand_deck`, `start_journey_map`, `start_artifact`, `start_diagram`, `start_datatable`, `start_audio_overview`, `render_audio_overview`, `start_prototype`, `generate_image`, `generate_video` | `deck.py`, `agent.py`, `artifacts.py`, `diagram.py`, `datatable.py`, `audio.py`, `prototype.py`, `media.py` |
| Work in flight | `task_status`, `stop_task`, `retry_task`, `schedule_task` | `agent.py`, `lifecycle.py`, `schedule.py` |
| Memory and sending | `remember`, `forget`, `send_email` | `memory.py`, `agent.py` |

**Hashtag routing** (`agent.HASHTAG_TOOLS`). A hashtag names the tool that must be called.

| Hashtag | Tool |
|---|---|
| `#reddit`, `#social` | `start_social_analysis` |
| `#mindmap`, `#diagram`, `#infographic` | `start_diagram` |
| `#slides`, `#deck` | `start_deck` |
| `#journey` | `start_journey_map` |
| `#themes` | `start_themes` |
| `#datatable`, `#table` | `start_datatable` |
| `#audio`, `#podcast` | `start_audio_overview` |
| `#proto`, `#prototype` | `start_prototype` |
| `#report`, `#research` | `start_research_report` |
| `#quiz`, `#faq`, `#flashcards`, `#studyguide`, `#chronology`, `#timeline`, `#brief`, `#prd`, `#roadmap`, `#strategy`, `#personas`, `#blueprint`, `#competitive`, `#gap`, `#arch`, `#org`, `#audit`, `#whitepaper`, `#explainer`, `#recs`, `#recommendations`, `#case-study` | `start_artifact` |

A request with no hashtag that opens with a making verb and names an output in plain words ("Build a clickable
prototype of ...") is matched to its tool the same way (`agent.named_tool`, `plan.NAMED_OUTPUTS`).

**The guards that correct the orchestration model.** A local model picks the wrong tool, invents an id, or claims work
it did not start. Each case seen is corrected in code, not in the prompt.

| Guard | What it does | Code |
|---|---|---|
| Engagement repair | An engagement id that is not an engagement, or an empty one for a tool that cannot open an engagement, becomes the focused engagement. The focus comes from the page. | `agent.repair_engagement` |
| Plan before work | An artifact tool called inside a conversation returns a plan, and nothing starts. | `plan.gate` |
| A question is not work | A making tool called for a message that is a question returns an error telling the model to answer from the evidence. | `plan.gate`, `plan.is_question` |
| Hashtag match | A plan for any tool other than the hashtag's tool is refused. | `plan.gate`, `agent.hashtag_tool` |
| No report beside another output | A research report planned for a request that names a prototype, deck, diagram, journey map, audio overview or study page, and no report, is refused. | `plan.named_instead_of_report` |
| Brand only when named | A brand other than the house brand is used only when the person's words name it. | `plan.brand_asked` |
| Attached files scope the work | Work started while files attached with this message go unnamed is refused with the facts. | `attachments.unnamed_fresh` |
| Unbacked claim | A reply that says a plan is ready or work has started, when no tool result in the turn carries one, is challenged once. If the claim remains, the reply is replaced with a fixed sentence saying nothing was planned. | `agent.unbacked_claim` |
| Tool never called | When the hashtag's or named output's tool was not called, the model is told once to call it. | `agent._steps` |
| Step limit | Two steps before the limit the model is told to finish with a reply. | `agent._steps` |
| Requested sources | The sources the agent declares for a tool call (`required_sources`) travel in the turn context into the task's brief, where the builder enforces them. | `agent.execute_tool`, `store.create_task`, `material.py` |

**Approvals** (`ia_next/control.py`). An approval is bound to a hash of the tool name and its exact arguments. A
denied call is final. In this build the calls that ask are: `send_email` (class `send`), `generate_video` and
`render_audio_overview` (class `spend`, worded as no cost), a scheduled task, and a skill evaluation. A document asks
for no approval here, because `artifacts.execute` skips the spend approval when `config.LOCAL` is true. The
per-conversation spend limit never trips, because `agent._paid_estimate` returns nothing in this build.

## How a plan card turns a request into ordered steps

`ia_next/plan.py` holds the plan. `plan.gate` runs for every tool call. For the ten artifact tools in `plan.KINDS`,
called inside a conversation, it writes a row in the `plans` table and returns "a plan card is shown"; the page draws
the card from `GET /api/plans/{id}` (`web/plan.js`). Work started by a schedule, an approval or a retry is not planned
again.

**The steps on a card** (`plan.build_steps`):

| Step | Required | What it says |
|---|---|---|
| Check what the engagement holds | yes | How many findings and sources the engagement holds, and which content words of the request they do not mention. It is a word check against the findings and source titles (`plan.coverage`): covered when the engagement holds material and at most a third of the request's content words are missing. |
| Research the topic | optional, on by default when the material does not cover the request | Uses the data packs chosen in the composer, else general sources. When the engagement holds another topic, the step opens a new engagement named after the request so the two topics are not mixed. |
| Search the web for peers and competitors | required | Replaces the research step for a competitive gap analysis (`kind` is `gap` or `competitive`). It is always on, whatever the engagement holds, and it sends the whole request as the topic (`plan.competitive`, `plan._research_args`). |
| One row per specialist | yes | The making steps, named as the task's nodes are named. |

The research and material steps appear only for tools that build from evidence (`plan.NEEDS_EVIDENCE`: diagram, deck,
journey map, document, themes, data table, audio overview).

**Expected time** (`plan.expected`). Each step shows the median of that specialist's last nine finished runs on this
machine. Until a run has finished, it shows the figure measured when the build was set up, and the card says which.
The set-up figures in `plan.py` are: Brief Lead 20 seconds, Research Lead 240, Analyst 540, Writer and Verifier 400,
Information Designer 95, Deck Composer 840. Every other specialist shows "not yet timed" until it has run.

**Choices on the card** (`plan.options_for`). The card offers only the choices the tool's own argument list accepts:
kind and shape and detail for a picture, format and length for audio, layout for a document, brand, and period and
order for Reddit listening. It also shows what was asked for (audience, persona, scope, the slides planned), read-only.

**Start** (`plan.start`, `plan._run`). Pressing Start runs the chosen steps in a background thread, in order:

1. If research is on, `agent.launch_research` starts a research task with `evidence_only` set. The task stops after
   the Analyst and writes no report (`studio.run_research_task`). The plan waits for it. If it fails, the artifact is
   not started.
2. If the research opened a new engagement, the artifact is made in that engagement from what the research found.
3. The artifact's own tool runs and the plan waits for its task.

A required step cannot be skipped. Only a proposed plan starts, so a second click does nothing.

## How tasks, steps and the live view are recorded

`ia_next/store.py` keeps everything in one SQLite file (`/data/ia_next.sqlite3`): engagements, tasks, nodes,
conversations, events, approvals, evidence (full-text indexed) and spend.

- **A task** is one piece of studio work. It is idempotent by key: the same call returns the existing task.
  `store.create_task` adds the person's request, the required sources and the selected data packs to every brief.
- **A node** is one specialist step of a task, with its specialist name, its model, its state and a one-line result.
  `store.finish_node` marks a node `available` only when its result file exists and is not empty. Otherwise it is
  `failed`.
- **`store.stage(task, specialist, model)`** makes each sub-step of long work its own node. It is a context manager:
  the node starts on entry, `st.say(...)` records what came of it, and the node finishes on exit with a small result
  file under `results/tasks/<task>/steps/`. A persona set, for example, shows one node per persona.
- **Stop** (`store.request_stop`, `store.TaskStopped`) takes effect after the model call in flight and keeps what was
  written. **Try again** (`lifecycle.retry`) reruns a failed or stopped task with the same brief.
- **Events** are append-only. The live view (`web/orchestra.js`) draws a chat turn from `agent_step` and `agent_tool`
  events and a task from its nodes. For a running node `store.get_task` adds `expected_s`, the median time of earlier
  finished steps of the same kind (`store.usual_seconds`), and the page shows the elapsed time "of about" that figure.

Files live under `/data/engagements/<engagement>/results/`. Each task writes into `results/tasks/<task>/` (decks into
`results/decks/<task>/`). The files directly under `results/` are the latest successful copies that other builders
read. `store.safe_path` refuses any path outside the engagement's folder.

## Where evidence comes from and how it is checked

**One loader for every builder** (`ia_next/material.py`). `material.load` returns the engagement's findings and
sources: research findings, analysed uploads, and every finished Reddit listening (its themes' checked quotes become
findings and its posts become sources). Sources the person named are a contract: `material.requested` reads a
subreddit or "Reddit" from the person's own words and from the agent's `required_sources`, and `load` raises
`MissingEvidence`, naming the tool that collects them, when the engagement has none.

**The second brain** (`ia_next/secondbrain.py`). Every source is archived in HiC's wiki, where HiC chunks it and enters
it in its manifest. Builders read evidence back as chunks with pointers. `secondbrain.material` includes every chunk
of every source when they fit the budget (60,000 characters by default), else the chunks that rank highest against
the objective, with requested sources first. When HiC is not running, sources are cut into local chunks of 1,500
characters. `studiokit.load_material` wraps this for the studio outputs and gives every chunk a pointer.

**The research pipeline** (`ia_next/studio.py`). Four nodes, in order.

| Step | Model | What it does | What code checks |
|---|---|---|---|
| Brief Lead | rules, no model | Writes the brief. | Audience, goal, scope, structure and constraints must all be present. |
| Research Lead | Nemotron writes the queries; MiniCPM picks data packs and filters library pages; `qwen3-embedding` scores relevance | Collects, in this order: Reddit posts when the person asked for them (the run fails with instructions if the engagement has none), library pages, pages reused from the second brain, publications the person named (through HiC's registry), items from HiC data packs plus HiC's sources that sit in no pack (at most 10 pack items, at most 2 per publisher), then up to 8 web pages from SearXNG, each fetched and read. | Search redirects are never sources. A page under 400 characters is skipped. `localrank.on_topic` drops collected sources that score below the line against the goal, keeps at least six, and never drops a source the person asked for. Nothing is dropped when the embedding model does not answer. New sources are archived in the second brain. |
| Analyst | Qwen (analysis seat) | Reads the passages in windows of 42,000 characters, a source's passages kept together, and returns findings: a claim, a verbatim quote, a source id, a claim type. | A finding is kept only when its quote is in its source's text (`verify._norm` folds quote marks, dashes and spacing; the words must match). Each kept finding gets the pointer of the chunk that holds its quote. No surviving finding fails the step. |
| Writer and Verifier | Qwen writes (`localwriter.py`); Nemotron reviews | See the report section below. | See below. |

**The two checks on finished text** (`ia_next/verify.py`).

- `verify.deterministic` uses no model. On the writer's own words (quotes and source titles excluded) it flags
  em-dash characters, the phrases in `verify.SLOP`, and the meta-narration phrases in `verify.META`. On the whole text
  it flags a citation that names no collected source, a text with no citation, a quoted passage that is not in its
  cited source, and a number outside a quote. A year is not a number for this rule; a figure spelled in words is
  (`studiokit.spelled_figures`).
- `verify.judge` is a model from a different publisher than the author. It scores a checklist: five standing criteria
  plus up to five success criteria from the brief, or a checklist of its own for a study page, a persona set, a
  competitive analysis or an architecture. It reads every source in full when they total 30,000 characters or less,
  else the passage around each cited quote. A reply that is not JSON is asked for once more.
- `verify.score` is the judge's score minus 0.05 per deterministic finding. It decides whether a repair is kept.

**The quote check for pages** (`ia_next/artifacts.py`).

- `quoted_passages` reads what a page presents as a quotation: text inside `<blockquote>` or `<q>`, and quotation marks
  within one run of text. Scripts, styles and the `<cite>` under a quote are not counted.
- `unverified_quotes` compares words only (`artifacts._words` drops punctuation and typography): a quote passes when
  its words appear, in order, in one source.
- `repair_quotes` is free and only narrows: a quote that matches one source sentence at a ratio of 0.85 or more takes
  that sentence's exact words; any other loses its quotation marks, so it no longer stands as a quotation.

**Figures in the writer's own voice** are checked in every writer: `localwriter.check_prose` (reports),
`localartifact.no_figures` (documents and the journey map), `deckstudio.fix_figures` (decks), `studiokit.numbers_supported`
(diagrams, tables, study pages, audio) and `answers.py` (chat answers). A figure may reach the reader only inside a
checked quote.

## How each artifact is made

Every builder that works from evidence first runs `transcripts.run_uploads_first`: uploads the engagement's findings
do not cover yet are analysed as a visible Transcript Analyst step before the main step.

### Research report

Asked for with `#report`, `#research` or a plain request for research. Tool: `start_research_report`.

The first three steps are the research pipeline above. The fourth is `studio.write_and_verify`:

| Order | Who | Model | What happens |
|---|---|---|---|
| 1 | Writer | Qwen | Every finding becomes a ledger entry `E1..En`. The model returns a summary and five to eight sections of three to five blocks; each block is its own paragraph plus the ids of the evidence that supports it and the ids of the quotes to show. The schema lists the valid ids. |
| 2 | Code | none | If the draft used fewer than two thirds of the entries, the Writer is asked once more to bring in the missing ones; the fuller version is kept. |
| 3 | Code, then Writer | Qwen | `check_prose` tests each block's own words: no quotation marks, no em-dash, no banned phrase, no figure in digits or in words. Failing blocks are rewritten once, each with its failure named. A block that still fails is left out when other blocks carry its evidence. |
| 4 | Code | none | `localwriter.render` builds the Markdown: each paragraph with its `[S#]` citations, each quote inserted exactly as the Analyst verified it and shown once, headings put in sentence case, a "What to do" line per section, a table "The evidence at a glance" with one row per section when there are three or more, and the Sources list. |
| 5 | Verifier | code, then Nemotron | `verify.deterministic`, then `verify.judge`. |
| 6 | Writer and Verifier | Qwen, Nemotron | If either check found something, one repair is written with the findings as feedback, and checked the same way. The repair is kept only when its score is higher. |

Saved in `results/tasks/<task>/`: `brief.json`, `sources.json`, `findings.json`, `report.draft.md`, `verification.json`,
`report.md`. The card shows the report, its checks and the reviewer's score. Downloads: PNG, PDF and PowerPoint, from
the report set in the brand's page style (`exporter.report_page`).

### Journey map

Asked for with `#journey` or "journey map". Tool: `start_journey_map` (persona, scope, brand, optional source ids).

`journey.build` hands the work to `ia_next/journeymap.py` when `config.LOCAL` is true. The method is the standalone
Journey Mapper's, written as data in steps and drawn by code.

| Order | Step shown in the live view | Model | What happens |
|---|---|---|---|
| 1 | Journey researcher: the persona and the phases | Qwen (artifact seat) | Four to six phases, each a concrete event with a time window, an emotional level (very low to very high), one word for the emotion, a first-person mindset line and a reason; then the title, the standfirst and the persona (who they are, goals, one quote, a photograph brief). Fewer than three phases fails the map. |
| 2 | Journey researcher: phase i of n | Qwen | For one phase: actions, touchpoints, what goes well, pains (each with severity, frequency in words and a verbatim quote), one or two more quotes, a moment of truth if it has one, and opportunities. A phase whose step fails is dropped. |
| 3 | Journey researcher: what cuts across the journey | Qwen | Journey-level pains with why each persists, opportunities each tied to a pain and an owner, and a takeaway. |
| 4 | Evidence check: every quote against its source | code, no model | `journeymap.check` compares each quote's words with every source. A quote found in another source takes that source's id. A quote found nowhere, or under four words, is removed; the pain keeps its words. At most two moments of truth are kept. Repeated citation runs are settled (`localartifact.calm`). |
| 5 | Editor: no figure in the writer's own voice | Qwen, then code | `localartifact.no_figures`. |
| 6 | Photographer: lifestyle photograph | SD 3.5 Large | One photograph of the persona from its brief. If the picture engine is not running, the step says so and the map ships without it. |

Each step's schema is passed through `localartifact.bounded` (strings limited to 520 characters here), and each reply
has room for 4,500 tokens. Fields are ordered so the ones the map cannot do without come first.

The page (`journeymap.page`) is a CSS grid with one column per phase and one row per lane, so nothing overlaps: mindset,
what they do, touchpoints, what goes well, the experience curve, the emotional read, pain points, quotes in their words,
and opportunities. The curve is one line drawn by code through one point per phase; each point is marked as a moment
of truth, a friction point (a high-severity pain) or an activity. Buttons switch lanes on and off and bring one phase
forward. Below the grid are the journey-level pains, the opportunities, the takeaway and the numbered sources.

Saved: `journey.json`, `journey.html`, `slides.html`. Downloads: PNG and PDF from the page; PowerPoint from
`slides.html`, an overview slide and one slide per phase.

### Documents

Asked for with a document hashtag (see the routing table) or its plain name. Tool: `start_artifact` with a `kind`.
`artifacts.KINDS` lists 24 kinds: 19 document kinds and 5 study formats.

`artifacts.run_artifact_task` is the same for every kind:

| Order | Node | Model | What happens |
|---|---|---|---|
| 1 | Transcript Analyst (only when uploads are unanalysed) | Qwen | Reads the attached files first. |
| 2 | Artifact Studio (local author) | Qwen (artifact seat) | `artifacts.corpus_for` builds the corpus: the checked findings, then each source's chunks. The request goes to HiC's job route, which `localhic` answers by running `localartifact.generate` in a thread. The sub-steps below appear as their own nodes. |
| 3 | Code | none | Em-dash characters are replaced. `unverified_quotes`, then `repair_quotes`, then a recount. The page, its data and its slide layout are saved. |
| 4 | Verifier | Nemotron | `verify.judge` with the kind's checklist. If the review fails to run, the document is kept and the card says so. |

Which path `localartifact.generate` takes:

| Kind | Path | Schema and steps | Page |
|---|---|---|---|
| `personas` | shaped, in steps | `PERSONA_SCHEMA`. "UX Researcher: behavioural dimensions and clusters" (three or four dimensions, three to five personas with name, situation and position on each dimension), then "UX Researcher: persona n of N" for each (quote, goals, behaviours, frustrations, needs, tools, a typical episode, design implications, traits, motivation and channel strengths, a photograph brief). | `docpage.personas`: a tab per persona, a card with the quote, the positions on each dimension, bars with no figure on them, and a side-by-side comparison. |
| `gap`, `competitive` | shaped, in steps | `COMPETITIVE_SCHEMA`. "Strategist: who is compared" (subject, three to six named competitors, takeaways), "Strategist: capability matrix" (one cell per name per capability, rated leads, on par, behind or no evidence, with a cited reason), "Strategist: case studies and gaps". | `docpage.competitive`: who is compared, a matrix whose every cell opens its reason, case study cards with a quote, a gap table that filters by priority. |
| `arch` | shaped, in steps | `ARCH_SCHEMA`. "Solutions Architect: zones and components", "what moves between them", "weak points and the target". | `docpage.architecture`: zones side by side with their components; arrows drawn only in the gutters between neighbouring zones; every flow also a table row. |
| `studyguide`, `faq`, `chronology`, `flashcards`, `quiz` | `localstudy.generate` | See study pages below. | `localstudy.render` |
| every other kind | one call | `localartifact.SCHEMA` (title, standfirst, takeaways, five to eight sections of prose, quotes and an optional table), with the kind's outline from `localartifact.OUTLINES`, 12,000 tokens of room. | `docpage.document`: takeaways first, a section bar, sections that fold to their one-sentence point. |

A shaped kind asked for as slides (`render_mode` is `slides`) takes the one-call path.

What code does to a document after the model:

| Function | What it does |
|---|---|
| `localartifact.bounded` | Copies a step's schema with a length limit on every string (700 characters by default) and an item limit on every list (8 by default), so a reply cannot run on. Each step has room for 4,500 tokens (`STEP_TOKENS`). |
| `localartifact.shaped_ok` | Refuses a persona set with fewer than two usable personas, a competitive analysis with fewer than two named competitors or fewer than three matrix rows, and an architecture with fewer than two zones or fewer than four placed components. |
| `localartifact.no_figures` | Finds every string of the writer's own prose that states a figure (digits or words; years, citations and numbers that belong to a name the sources use are excepted). One call rewrites those passages; a rewrite is kept only when it has no figure, keeps its citations and is at least half the length. Otherwise the sentences that state the figure are removed. Shown as the step "Editor: no figure in the writer's own voice". |
| `localartifact.calm` | Settles a citation the model repeated: a run keeps each source once, two at most. |
| `localartifact.tidy` | One-call documents only: a paragraph given twice is kept once, a standfirst that repeats a paragraph is dropped, a title that is only the document type takes the first heading, and announcing openers are cut. |
| `localartifact.lifestyle_images` | Persona sets: one photograph per persona from its brief, as the steps "Photographer: lifestyle photograph n of N". A persona whose picture cannot be made keeps its numbered mark. The saved data keeps the brief, never the picture bytes. |
| `localartifact.CHECKLISTS` | The reviewer's criteria for personas, competitive and architecture. The reviewer reads a plain-text form of the data in which each claim keeps its `[S#]` mark (`localartifact.plain`). |
| `docpage.cite` | Draws `[S#]` marks as small footnote numbers in the order the page first cites them. |

Saved: `artifact.html`, `data.json`, `slides.html`, `verification.json`, `artifact.json`, `sources.json`. The page is
served only inside a sandboxed frame. Downloads: PNG and PDF from the page with every section open
(`docpage.for_export` removes the folding script); PowerPoint from `slides.html`.

### Study pages: study guide, FAQ, timeline, flashcards, quiz

Asked for with `#studyguide`, `#faq`, `#chronology` or `#timeline`, `#flashcards`, `#quiz`. Tool: `start_artifact`.

`localstudy.generate` makes one call to Qwen (artifact seat) with the kind's schema. Every item names a source id and
one copied sentence. `localstudy.check` then removes an item with an unknown source, a quote under 20 characters, a
figure in its own words that its quote does not carry, or words that point at "the source" or "the text". A timeline
entry is held to a different test: a known source, a quote, a date and a sortable date key. The check removes
duplicates, sorts timeline entries by date, and requires a quiz question to have four distinct options, a stem that
ends with a question mark and three reasons for the wrong options. When the main list is below its floor, up to two
further passes ask only for what is missing.

| Kind | Floor in `localstudy.FLOORS` |
|---|---|
| Study guide | 10 questions, 5 essay prompts, 18 glossary terms |
| FAQ | 10 items |
| Timeline | 6 dated entries |
| Flashcards | 50 cards |
| Quiz | 10 questions |

A count below its floor is reported in the task's summary; the page is still saved. The page works without scripts
(answers open with the browser's own disclosure control). With scripts, flashcards count Got it and Missed it, a quiz
marks each answer and explains every option, and "Ask about this" sends the item to the conversation. The reviewer
uses `localstudy.CHECKLIST`.

### Prototype

Asked for with `#proto`, `#prototype` or "prototype". Tool: `start_prototype` (experience, audience, must-include
screens, brand).

The task has one node named Prototyper. Inside it, `prototype.build` runs these steps in this build:

| Order | Step shown in the live view | Model | What happens |
|---|---|---|---|
| 1 | Creative Director: the product, its screens and its data | Qwen (artifact seat) | Returns a direction as JSON: the product, its screens, sample data and visual language. Pattern ids must come from the AI Experience Patterns catalog (`design_patterns.json`); unknown ids are removed. The craft standard is added to the message. If no direction comes back, the build works from the brief. |
| 2 | Product Designer: what is on each screen | Qwen (artifact seat) | `protokit.compose` returns a small JSON specification: the product, its fields, and each screen's blocks. Blocks are `kpis`, `chart`, `table`, `cards`, `assistant`, `form` and `steps`. |
| 3 | Code | none | `protokit.normalize` makes the specification safe to draw: valid fields, the direction's screens by name and order, at least one working block on every screen and a table somewhere. `protokit.render` writes one self-contained page: the brand block, the kit's styles, the specification as data, and the kit's runtime script, which is the same script every time. |
| 4 | Code | none | `prototype.validate_html` refuses external scripts, stylesheets, frames, network calls, form submission and web addresses. A page that fails is saved as `prototype.rejected.txt` and the task fails. |
| 5 | Browser check: every screen opened and clicked | the render service, no model | `POST /shots` loads the page in Chromium, clicks to each screen and returns a screenshot of each, the screens it could not reach, and script errors. A page with a script error is saved as `prototype.rejected.txt` and is not shipped. If the renderer is down the page ships and the summary says it was not opened in a browser. |

The render service also reports a script that does not parse (with its line), a screen that shows almost no text
outside its navigation, and buttons that change no text (`render/app.py`: `syntax_errors`, `empty_screen`,
`dead_action`).

Saved: `prototype.html`, `prototype.json` (the specification, the direction, open design checks), `screens/NN.png`.
The page is served only with the prototype's Content-Security-Policy inside a frame sandboxed to `allow-scripts`.
Downloads: one page per screen as PNG, PDF and PowerPoint.

**The hand-written path.** `prototype.build` still holds the earlier path, in which the prototype seat (Ornith) writes
the whole file, a validator allows one correction, a model from a third publisher reviews the source, and line repairs
(`repair_script_lines`, `repair_runtime_lines`, `unbalanced_functions`) rewrite only the lines the browser points at.
It runs only when the brief carries `freeform`, and `start_prototype_task` never sets that field.

### Slide deck

Asked for with `#slides`, `#deck` or "deck". Tools: `start_deck`, `revise_slide`, `rebrand_deck`.

One node, Deck Composer, runs `deckstudio.build`:

| Order | Who | Model | What happens |
|---|---|---|---|
| 1 | Deck Composer | Qwen (artifact seat) | One call with the findings and the sources' chunks returns the slides as data: a title, a subtitle, points, an optional quote, a takeaway, an image prompt and one layout from `cover`, `statement`, `cards`, `layers`, `table`, `flow`, `architecture`, `quote`, `bullets`, `closing`. The person's outline is followed, one slide per item after the cover. |
| 2 | Code, then the composer | Qwen | When the person asked for particular sources, the slides that cite them are counted. Fewer than half gets one rewrite; none at all fails the deck. |
| 3 | Code | none | `check_quotes` drops a quote that is not in its source. |
| 4 | Code, then the composer | Qwen | `fix_titles`: one repair round for titles that fail the action-title rule. `fix_figures`: each line that states a figure is rewritten once without it. Titles are put in sentence case. |
| 5 | Picture engine | SD 3.5 Large | Up to five images (`MAX_IMAGES`): photographs for cover and statement slides, one illustration style elsewhere. A failed image leaves the slide without one. |
| 6 | Code | none | `verify.deterministic` on the visible text; its findings are recorded as open checks. `write_pptx` writes a native PowerPoint with python-pptx, and `verify_pptx` reopens it. A file that fails the reopen check fails the deck. |

Saved in `results/decks/<task>/`: `deck.pptx`, `deck.html`, `deck.json`, `sources.json`, the images. Brands are `nxt`,
`nu` and `deciem`, from `brand_tokens.json`. `rebrand_deck` renders a finished deck again in another brand with no
model call. `revise_slide` rewrites one slide and keeps the previous version. Downloads: the PowerPoint is the native
deck file; PNG and PDF are one page per slide.

### Diagram, mind map and infographic

Asked for with `#diagram`, `#mindmap`, `#infographic`, or "draw". Tool: `start_diagram` (mode, family, orientation,
density, brand).

One node, Information Designer, runs `diagram.build`:

| Order | Who | Model | What happens |
|---|---|---|---|
| 1 | Information Designer | Qwen (analysis seat) | One call over the engagement's passages returns sections. Each item has a label, a detail and evidence: words copied from a passage, with that passage's pointer. |
| 2 | Code | none | `check_section` keeps an item only when its evidence is in the passage it points at, and a number only where the passage carries it. A section with too little left is dropped. If no section survives, nothing is drawn. |
| 3 | Drawing | see below | |

How each shape is drawn:

| Shape | Drawn by | Detail |
|---|---|---|
| Mind map | `mindmap.py`, in the render service | The request asks for four levels: the subject, three or four areas, eight or nine branches under them, and each branch's sentences. A checked map gets one more pass, which keeps what was checked and asks for more, when it has fewer than 5 branches (`MIND_BRANCHES`), a branch with fewer than 3 sentences (`MIND_CHILDREN`), or fewer than 50 nodes in all (`MIND_NODES`). A branch shows at most 5 sentences and a map holds at most 11 branches (`MIND_MAX_CHILDREN`, `MIND_MAX_BRANCHES`). The picture is one 1920 by 1080 page in the brand's tokens: the subject in a hub, a card per branch, connectors, a takeaway band and the sources. A fit pass shrinks the type together and drops a card's last sentence only when the smallest type still overflows; a sentence is never cut. The page as drawn is saved as `slide.html`. |
| The explorable mind map | `web/mindtree.js`, from `GET /api/tasks/{id}/mindmap` | The workspace draws a tree from the saved data: subject, areas (shown when the branches fall into two to six areas), branches, sentences. Every level opens and closes by click or keyboard; there is zoom, "Ask about this", and the quoted passages behind each branch. |
| Illustrated infographic | `illustrated.py`, when the picture engine answers | `illustrated.pick` takes 4, 6 or 8 ideas by density, in one or two groups. One call to Qwen names a concrete scene for each idea. SD 3.5 Large draws each scene in one style with no text. `illustrated.proof` adds a checked quote under each idea, preferring one that carries a figure. The canvas is a poster of colour blocks with a dark title block; all text is laid out by code. |
| Other diagram families and the poster infographic | HiC's native exhibit renderer (`/api/ai/diagram`), no image model | Families: process flow, comparison, stat row, concept cluster, funnel, pyramid, nested, flowchart, architecture, ranked bars. When the picture engine is not running, an infographic is a poster of two to six of these exhibits, composed by `diagram.compose_poster`. If HiC cannot draw a diagram the task fails; it never falls back to an image model. |

Saved: `diagram.png` or `infographic.png`, `diagram.json`, `diagram.html` (the picture, a text version of every
section with the passage words behind each label, and the sources), and `slide.html` for a mind map or an illustrated
infographic. Downloads: the PNG is the picture itself; the PDF is that picture on one page; the PowerPoint comes from
HiC's `/api/ai/diagram-pptx`.

### Audio overview and video overview

**Audio overview.** Asked for with `#audio`, `#podcast` or "audio overview". Tools: `start_audio_overview` (format,
length, focus), then `render_audio_overview`.

| Order | Who | Model | What happens |
|---|---|---|---|
| 1 | Audio Producer | Qwen (artifact seat) | Writes a two-voice script in one of four formats: `deep-dive`, `brief`, `critique`, `debate`. Target lengths in this build (`audio.LOCAL_LENGTH`): short 500 to 650 spoken words, default 1,500 to 1,900, long 2,600 to 3,200. A brief is always short. The model writes each turn's own words and names a passage and one sentence to quote. |
| 2 | Code | none | `check_script_local`: a turn's own words carry no quotation and no figure. A quote found in its passage is spoken after the turn with its source named aloud; a quote not found is left out. If fewer than four turns pass, or fewer than 60 percent of the turns written, no script is saved. |
| 3 | The person | none | The script is saved as a cited transcript page. The voices wait for an approval card, worded as no cost. |
| 4 | Voices | Kokoro, else Piper | `localspeech.dialogue` gives each speaker a voice, speaks every turn, and encodes one MP3 at 96 kbit/s. |

Saved: `script.json`, `audio.html`, `audio.mp3`.

**Video overview.** A button on a finished audio overview calls `GET /api/tasks/{id}/video`. `narrated.build` plays the
overview's voices over the slides of the engagement's newest finished deck, or over its newest picture when there is
no deck. Each still is shown for an equal share of the sound, pushed in slowly and faded into the next, as one MP4
(H.264 and AAC). No model is called. It needs the voices and at least one deck or picture.

**A video clip** (`generate_video`) is separate: one five-second clip with sound from Kandinsky 6.0 Lite Distill,
always behind an approval. `localmedia.video` decodes the file before returning it and refuses a clip with no sound
track, a silent track, or a length other than five seconds.

### Themes

Asked for with `#themes`. Tool: `start_themes`.

One node, Theme Analyst. `themes.build` loads the engagement's chunks (at least eight passages are needed) and sends
them to HiC's topic-model route, which `localhic.topics` answers on this machine: `qwen3-embedding` vectors, UMAP with
a fixed seed (42) for twelve or more passages, HDBSCAN, a KMeans split when only one cluster is found, and TF-IDF top
terms, for up to twelve clusters. Qwen (analysis seat) then names each cluster from up to five of its passages and
copies one quote. Code checks the quote against the cluster's passages; a theme whose quote is not there keeps its
name and shows no quote. Saved: `themes.json`, `themes.html`.

### Data table

Asked for with `#datatable` or `#table`. Tool: `start_datatable` (goal, optional columns).

One node, Table Analyst (Qwen, analysis seat). Rows are entities the passages name; each cell has a value, a quote
copied from a passage and that passage's pointer. `datatable.check_rows` keeps a cell only when its quote is in its
passage and its value carries no number the quote lacks. An unsupported cell stays empty, and an entity no passage
names is dropped. Limits: 30 rows, 7 columns. Saved: `datatable.html`, `datatable.csv`, `datatable.json`.

### Reddit listening

Asked for with `#reddit`, `#social` or a named subreddit. Tool: `start_social_analysis`.

`social.run_social_task` tries three methods in order:

1. For one subreddit, Social Research's shared run. Its address comes from `IA_NEXT_SOCIAL_RESEARCH_URL`. The compose
   file does not set it, and the default in `social.py` is a closed port, so in this build the step fails and the run
   goes on. The card shows that step as failed.
2. The **Social Collector** reads public posts and up to five top comments each through Reddit's app-only OAuth
   (25 posts by default, 50 at most), then Social Research's method is tried on those posts. It fails the same way.
3. The **Social Analyst (language model)**, Qwen (analysis seat), finds themes, each carried by quotes checked against
   the post they cite, and labels each post's sentiment. The result is marked as the local method and its summary and
   page say it is not comparable with Social Research.

Saved: `social.json`, `social.html`, `posts.csv`. A finished listening is evidence for every other builder.

### Uploaded files

Tool: `analyze_uploads`, or automatically before any builder.

Text and subtitle files become sources directly. A PDF's text layer is read by PyMuPDF in the app; a PDF with no text
layer is read page by page (20 pages at most) by the vision seat, as is a picture. Word, PowerPoint and Excel files go
to HiC's parser, which uses no model. Audio (25 MB at most) is transcribed by faster-whisper. The Transcript Analyst
(Qwen, analysis seat) then extracts findings whose quotes are checked against their source; a speaker the source never
names is cleared. Each source also gets a short guide from the fast seat.

### Video transcripts

Tool: `transcribe_video` (a YouTube link or a link to a video or audio page or file, or `#transcribe`), or an uploaded
video. Code: `ia_next/videotranscript.py`. This is the local counterpart of the standalone Video Analyzer
(`internal-solutions-video-analyzer`), which downloads a video's sound with yt-dlp and sends it to OpenAI's `whisper-1`
(Whisper large-v2 behind an API). Here every step runs on this machine with open software and open weights:

1. Fetcher: yt-dlp fetches the sound of the video (or the upload is read from `uploads/videos/`). A live stream, a
   recording over four hours or a file over 4 GB is refused with the reason. A YouTube video whose sound cannot be
   fetched falls back to its published captions (youtube-transcript-api), as the standalone tool does, and the summary
   says so.
2. Transcriber: Whisper large-v3 through faster-whisper, int8 on the processor, voice-activity filtering, one
   transcription at a time. The weights are read from `D:/ia-next-local-models/whisper/faster-whisper-large-v3`
   (mounted read-only at `/models/whisper`). The running step shows "MM:SS of MM:SS transcribed" and an expected time
   computed from the recording's length.
3. Writer: `transcript.txt` (timestamped paragraphs of about a minute), `transcript.md`, `transcript.srt`,
   `transcript.vtt` and `segments.json`, all downloadable from the card and the page.
4. Archivist: the transcript becomes the engagement's next source (S#), with its YouTube address and the channel as its
   publisher, and is written to the second brain (HiC's wiki, `write-article`). Each manifest chunk (`path#cN`) carries
   the timestamps it covers; `chunks.json` maps every pointer to its time range and a link to that moment in the video.

Measured 22 Nov: 08:38 of narrated speech in 150 s (98.6 percent of the script's 1,334 words recovered in order); a
19-second YouTube clip in 35 s including the model's first load. Uploads of audio under 25 MB still take the quick
path (faster-whisper small, synchronous); larger audio and every video file go to this tool.

## How downloads are made

`ia_next/exporter.py` serves `GET /api/tasks/{id}/export/{png|pdf|pptx}` for every finished task that has a page. For
an audio overview that page is its cited transcript; the sound itself is the MP3, and the video overview is the MP4.
Each export is kept in `results/tasks/<task>/exports/` under a hash of what it was made from, one per format.

| Artifact | PNG | PDF | PowerPoint |
|---|---|---|---|
| Deck | one page per slide (a ZIP when there are several) | the same pages | the native `deck.pptx` the deck task wrote |
| Diagram, mind map, infographic | the saved picture | the picture on one page | HiC's `/api/ai/diagram-pptx`: a mind map and an illustrated infographic from their drawn page, any other family from its specification |
| Journey map, persona set, competitive gap analysis, architecture, other documents | the page, cut into 16:9 pages | the same pages, printed by Chromium | from `slides.html`, whole slides |
| Report, upload findings, themes, data table, study pages, Reddit listening, audio transcript | the page, cut into 16:9 pages | the same pages | the same pages as stages |
| Prototype | one page per screen | the same pages | one slide per screen |

**The page stays as designed.** `ia_next/slidepage.py` lays the same checked data out again as 1920 by 1080 slides
that each hold one whole thing: a journey gets an overview and one slide per phase, a persona set one slide per persona
and a comparison, an architecture its zones, connections and weak points, a competitive analysis its matrix, cases and
gaps, any other document a title slide and one slide per section. What goes on a slide is chosen by count and length;
text is never cut inside a sentence, and what does not fit stays on the page. The builder saves this as `slides.html`
beside the page. `exporter.source` hands it to the PowerPoint export only. The page and its PDF are unchanged.

**How a page becomes pages** (`render/app.py`, `POST /pages`). The render service lays the page out at 1280 CSS
pixels, wider when a table scrolls sideways. Mode `flow` cuts it into 16:9 pages without cutting through a line, a
picture or a small box. Mode `slides` makes one page of each matching element. Mode `screens` makes one page of each
screen of an app. For PowerPoint it returns stages: each stage is one page as a 1920 by 1080 document with a picture
of the page (its text hidden) and every line of text laid over it as positioned text.

**Who writes the PowerPoint file.** HiC's exporter does: `/api/gold/export-pptx-multi` for stages and
`/api/ai/diagram-pptx` for diagrams. When HiC cannot be reached the export raises `ExportError` and makes no file. It
never falls back to pictures of slides.

**Text boxes are made safe against re-wrapping.** For slides made from stages, `exporter.steady` edits the finished
file: a text box that held one line in the browser is set never to wrap, and a box that held several lines keeps its
width and stores a fit of 90 percent. This is for the case where PowerPoint substitutes another typeface because the
brand's is not installed and the lines run wider.

## The craft standard and where it is injected

`ia_next/craft.py` states five disciplines as the decisions each expert makes: creative direction, experience design,
interface craft, graphic design and AI experience. `craft.STANDARD` joins all five. `craft.EDITORIAL` is creative
direction, graphic design and a "reader's task" paragraph, for written documents that have no controls.

| Where | Which block | Code |
|---|---|---|
| The Creative Director's message for a prototype | `STANDARD` | `prototype.direct` |
| The prototype specification's system prompt | `STANDARD` | `protokit.SPEC_SYSTEM` |
| The persona set's system prompt | `STANDARD` | `localartifact.craft_text` |
| The competitive gap analysis and the architecture | `EDITORIAL` | `localartifact.craft_text` |
| Every one-call document | `EDITORIAL` | `localartifact.generate` |

Layout, type and colour are code: brand tokens (`brand_tokens.json`, `deck.brand_kit`), the page style
(`pagestyle.py`, `docpage.py`) and the prototype kit. The model's part is the judgment the blocks describe.

## Safety and honesty rules that code enforces

| Rule | How it is enforced |
|---|---|
| Nothing is sent to a paid service | No key in the build; `providers._install_guard` refuses metered hosts; `localhic.intercept` refuses HiC's paid routes. |
| The app is reachable from this machine only | The compose file publishes 9460 on 127.0.0.1. The render and search containers publish no port. |
| Model-written pages cannot reach anything | The render container sits only on an internal Docker network, has a read-only file system, no volume and no key, and inside a page it refuses every request other than `data:` and `blob:`. |
| A prototype runs in a sandbox | Served only with `PROTOTYPE_CSP` (`default-src 'none'`, `connect-src 'none'`, `sandbox allow-scripts`) inside an iframe sandboxed to `allow-scripts`, never with same-origin rights. The task's result path is the JSON, so the generic view route cannot serve the page without the policy. |
| A document runs in a sandbox | Served from `/api/tasks/{id}/artifact` inside a sandboxed iframe with `ARTIFACT_CSP`. A journey map is served with the same headers. |
| A quote must be found word for word | Findings (`studio.analyst`), report text (`verify.deterministic`), pages (`artifacts.unverified_quotes`), journey quotes (`journeymap.check`), deck quotes (`deckstudio.check_quotes`), labels, cells and spoken lines (`studiokit.check_quote`), chat answers (`answers.py`). A quote that fails is dropped, restored to the source's words, or shown without quotation marks. |
| No figure in the writer's own voice | See "Figures in the writer's own voice" above. A figure spelled in words counts. |
| A prototype is opened in a browser before it ships | `prototype._build_from_kit` calls the render service; a script error means the page is refused and saved as a `.txt` that is never served. |
| A step with no result is failed | `store.finish_node` requires a result file that is not empty. |
| Web, upload and post text is data | Source text is wrapped in tags in every prompt and each system prompt says it is never instructions. Only the Markdown renderer writes HTML, and it escapes everything first (`web/md.js`). |
| Work is built from what the person pointed at | `attachments.unnamed_fresh`, `deck.clean_source_ids`, `deck.scope_material`, `material.load`. |
| A specialist writes only inside its engagement | `store.safe_path`. |
| The HiC token is never logged or returned | `hic._token` reads it on every call from the read-only mount of HiC's runtime config. |
| A video clip is what was asked for | `localmedia.video` decodes it and checks picture, sound and length. |

## What was measured on this machine

All figures in this section are copied from `PLAN-COMPLETION-2026-11-19.md` (sections 5 and 7) and `LOCAL.md`. They
are wall times of tasks run through the app on 19 and 20 Nov 2026. Several builders changed after their run, so read
them as a record of those runs. The record also notes that a first chat turn after idle adds about 100 seconds while
the orchestration model loads.

| Artifact | Time recorded | Result recorded |
|---|---|---|
| Research report | 895 s | 11 sources kept (7 left out as off the subject), 35 findings, 4,542 words, 34 quotes, reviewer 1.0 |
| Journey map (the earlier builder) | 79 s | 7 stages, 7 quoted pains |
| Mind map | 99 to 182 s | 7 branches of 3 sentences, 5 sources |
| Illustrated infographic | 246 s | 6 ideas in 2 groups, 6 illustrations |
| Deck with photographs | 767 s | 8 slides, 5 pictures, 106 editable text runs |
| Study guide | 125 s | 10 questions, 5 essays, 18 terms |
| Quiz | 326 s | 14 questions |
| Flashcards, FAQ, timeline | 186, 138, 86 s | 38 cards, 13 questions, 8 dated events |
| Themes | 98 s | 8 themes, each with a quote |
| Data table | 242 s | 21 rows |
| Audio overview | 57 s for the script, 24 s for the voices | 11 turns, all cited |
| Video overview | 6 s after the audio exists | 186.8 s of video over 8 slides |
| Video clip | 228 s | five seconds with sound |
| Reddit listening | 161 s | 25 posts, 6 themes, 18 quotes |
| Persona set (in steps) | 182 s | 3 personas, 3 dimensions, reviewer 1.0, every quote found |
| Prototype from the kit | 186 s and 207 s | two of two shipped, with 40 and 46 browser checks |
| A question in chat | 4 s | one answer cited with its exact sentence |
| A question while the studio is busy | 1.3 s | what is running, which step, for how long |

`LOCAL.md` also records: one picture takes about 50 seconds, Qwen writes about 25 tokens a second on this graphics
card, and switching between Nemotron and Qwen reloads a model in 15 to 20 seconds each way.

## The uplift of 23 Nov 2026

The plan is `plans/modernization-uplift-plan-2026-11-23.md`; `LOCAL.md` Round 11 records what was built and measured.
What changed, by workstream:

| Workstream | What it added | Where |
|---|---|---|
| WS-1 self-improvement | A code-computed scorecard on every finished task (hard checks: quotes found in their sources, footnotes closed, no figure in the writer's voice, slides that fit, no repeated slides, text of 10 pt or more, a PowerPoint that re-opens). A hard failure puts "Needs review (...)" at the front of the summary. The owner's verdict buttons (Good, Needs work) record feedback. Every ten scored tasks, repeated failures become a candidate edit of a governed skill (held-out evaluation and promotion still need the owner) or an attention item when only code can fix them. | `scorecard.py`, `improve.py`, `POST /api/tasks/{id}/feedback`, `/score`, `POST /api/improve/run` |
| WS-2 caching and residency | Per-call telemetry (tokens sent, model load and prompt seconds, the context used) and a per-task reuse report. Each model keeps one fixed context (`CTX_FLOOR`) so it is not reloaded. Every stepped writer sends one byte-identical head (material first). A call inside a visible step streams, and the step shows "writing: N tokens so far". | `providers.py`, `prompts.py`, `store._Stage`, `GET /api/tasks/{id}/telemetry` |
| WS-3 second brain | A deep health check of every dependency, with what each outage disables, and a banner on the page. Recall searches HiC's manifest first, widens a thin search with two rephrasings, reranks with the fast model, and answers from the engagement's own sources when HiC cannot search. Pages archived while HiC's embedder was down are re-chunked when it returns (every ten minutes). The Sources panel shows coverage on demand. Audio transcripts are kept as timestamped paragraphs, as video ones were. | `health.py`, `secondbrain.py`, `schedule.py`, `web/studio.js`, `transcripts.py` |
| WS-4 routing | Requests the rules can place (a hashtag, a named output, a video link) go to their plan card with no model call; questions and briefs that need judgement go to the model. The guards that check a model's choice live in the same module. | `router.py` |
| WS-5 context and memory | Evidence budgets in tokens per seat, from measured characters per token (`CHARS_PER_TOKEN`); a prompt the server refuses as too long is sent again at the step that holds it. Long conversations are compacted (older turns summarized into the system prompt, the last six kept; tool results become one line and a file). Episodic memory: one line per finished task with its checks and verdict, read by `recall`. Learned memory entries no recall used for 60 days move to `MEMORY.archive.md`; the person's own instructions stay. | `secondbrain.budget_chars`, `providers.context_for`, `agent.compact`, `memory.py` |
| WS-6 one builder engine | Every builder runs on `builder.run`: personas, architecture, competitive analysis, journey map, the five study pages and the deck. Each declares its steps (and, for the shaped documents, its page, slides and counts). A golden record of the old loops' model inputs proves the move changed nothing. A stylesheet gate fails the tests when a page gives one class two meanings. | `builder.py`, `tests/test_builder*.py`, `tests/test_css_collisions.py` |

Decided 23 Nov: Qwen alone holds the conversation seat; Ornith stays; the stylesheet gate replaces a mass rename; the
hard gates stay as listed; "Needs review" work is shown with its label; moving HiC's embedder to Ollama has its own plan
(`plans/hic-embedder-on-ollama-plan-2026-11-23.md`) and waits for approval.

## The field-test uplift of 24 Nov 2026

The owner ran four cases through the page on 23 Nov and every one failed a partner's read. The catalogue, the plan and
the running log are in `plans/field-test-2026-11-23/` (`PROGRESS.md` first). What changed, by subject:

| Subject | What it added | Where |
|---|---|---|
| Currency | The period a request implies is decided in code ("today" is the calendar date in `IA_NEXT_TZ`; research with no stated period means the last 30 days). Pages older than the period and undated pages beyond a small allowance are left out, and `sources_current` is a hard check. The plan card shows the period and the depth as choices before Start. | `currency.py`, `studio.research_lead`, `scorecard._currency_check`, `plan._evidence_options` |
| A web answer in chat | A plain question about the news is answered in the conversation in seconds, from dated news feeds, with links written by code. No engagement, pack or artifact is made. | `webanswer.py`, `agent._turn` |
| Speed | The deck and the report are written in short saved steps; one request for several outputs makes one plan card each with no model call; the plans share one evidence run and queue for the graphics card; a slow model hands its call to the smaller file and the card names the model that answered. | `deckstudio.compose_in_steps`, `localwriter.write_in_steps`, `router.split`, `plan.py`, `providers._fast_enough`, `providers.ANSWERED` |
| Evidence quality | Every source gets a tier from its address and its pack (primary, publisher, other site, self-published or press release); the lowest tier joins only a short collection and never carries more than two findings. Each finding says who it is about, and one short call places that group inside, beside or outside the population the request names: outside findings leave. Quotes are cut to whole sentences. Page furniture and scrambled text are not passages. | `evidencequality.py`, `studio.analyst`, `themes.build`, checks `source_quality` and `population_scope` |
| Themes | Two levels (groups of themes), each theme with its share, sources, packs, newest date and its passages on demand. Only passages that read as sentences and speak to the goal are grouped. | `themes.py`, `localhic.py` |
| Engagements as projects | An engagement has a client, a description, tags, a pin, an archive mark and its own defaults for new work (data packs, evidence period, depth, brand, audience). Several can be selected to archive, pin, tag or merge. A merge folds the others' work and chats under one engagement, copies their sources into it and can be undone; nothing is moved or deleted. | `store.update_engagement`, `store.merge_engagements`, `/api/engagements/{id}/settings`, `/bulk`, `/merge`, `web/engagements.js` |
| Library | Every source this machine has collected, searched from the local full-text index with facets, read in place and added to the engagement in focus. | `libraryview.py`, `/api/library/*`, `web/app.js` |
| Live view | Sources and checked findings appear on the running card; the subjects that two or more sources share are listed in code while collection is still running; themes appear as they are named. | `studio.live`, `studio.recurring`, `web/app.js` |
| Journey map | The persona is a composite: a persona named after a real person in a source takes the name that was asked for. Short lanes carry no citation marks. | `journeymap.composite`, `journeymap.check` |
| Audio | The script gets one repair pass; "Make the audio" on the card starts the voices at once and the card shows the player when they exist. | `audio.py` |
| Improvement loop | Failed tasks, tasks that ran past their bar and soft checks that did not pass now reach the loop as attention items. | `improve.groups` |
| Pack search | Batches of 10 sources, six at a time, 40 seconds each: a slow feed no longer holds 24 others for 150 seconds. | `hic.pack_items` |
| Local pack index | Every item a pack search returns is kept in a local full-text index, an idle pass every six hours reads more of each feed for the packs in use, and a research run searches the index by the question's own words beside the live feeds. It answers when HiC does not. | `packindex.py`, `hic.pack_items`, `/api/packs/index`, `/api/packs/index/ingest` |
| Lanes | Studio: two pieces of work at a time, the shortest waiting first. Card: one generating call or picture at a time inside a memory budget, and the card stays with the piece that is writing until it pauses, so the model server's one prompt cache is kept (deck and journey map together 12.1 minutes; 17.2 with plain turn-taking). A call's clock starts after its wait. Network: twelve page reads at once. | `lanes.py`, `GET /api/lanes` |
| Pack search budget | The live search stops at 75 seconds, asks the most recently productive feeds first and reads the rest from the local index; feeds of a failed batch are asked alone on the idle pass and the ones that hang are set aside for a week. | `hic.pack_items`, `packindex.probe`, `POST /api/packs/index/probe` |
| Pack choice on the plan card | When neither the person nor the engagement chose packs, the card offers the packs picked (the agent's, else picked in code from the request's words), each alone, or none. | `hic.quick_packs`, `plan._pack_option` |
| Audio as a conversation | Long factual turns are split and the other speaker comes in with a short reaction written for that moment; facts and quotes stay where they were. | `audio.liven` |
| Asking again | Work that was stopped or failed can be requested again; finished work is returned as it is. | `store.create_task` |
| Library dates and meaning | Stored sources get a date from their address or opening text and a vector; a search joins word matches with the sources closest in meaning. | `libraryview.backfill`, `libraryview.by_meaning`, `POST /api/library/backfill` |
| Release gate and comparison | A gate script checks every output of a run against the bars. A comparison script measures a run with the instruments of the 9 Nov Gemini Notebook audit, beside the figures recorded from real Notebook artifacts. | `plans/field-test-2026-11-23/rig/gate.py`, `rig/notebook_compare.py` |

Measured through the page on 24 Nov (the field test's figures in brackets): today's AI news 9 to 14 seconds (a refusal,
or 35 minutes); AI Trends themes 7.0 minutes (30); five outputs on higher education students and AI 35 minutes (about
3 hours 20 minutes); research, report and prototype on a prior engagement about 15 minutes.

## Known limits

These are current as of 20 Nov 2026. Each was checked against the code.

- **Sub-steps are not listed in advance.** The plan card lists the specialist steps before work starts. Inside a
  specialist, each sub-step is a node created when it begins (`store.stage`), so the live view does not show the
  personas or journey phases still to come. A running step shows its elapsed time and the median time of earlier steps
  of its kind.
- **Two documents can start at the same moment.** Each task starts its own thread at once and nothing queues them, so
  two tasks can ask for the one graphics card together.
- **Only an artifact's text is native in PowerPoint.** For pages exported as stages, the boxes and colour blocks are
  one background picture per slide and the text is laid over it as editable text. Decks and HiC-drawn diagrams are the
  exception: they are native shapes. PowerPoint substitutes a font when the brand faces are not installed on the
  machine that opens the file; `exporter.steady` keeps the text from re-wrapping in that case but does not restore
  the brand's face.
- **The slide deck and the video overview received only small changes** in the last rounds of work. The video overview
  is narrated slides, not generated scenes.
- **A local reply ends when a field reaches its length limit.** Step schemas are bounded, so a reply stops at the
  limit instead of running on. Steps therefore write the fields an artifact cannot do without first and free
  description last (`journeymap.FRAME`, the persona detail step in `localartifact._steps`).
- **Nothing in this folder is committed to git.** The whole folder is untracked.
- **Reddit listening uses the local method.** The shared Social Research engine is not reachable in this compose
  setup, so every run shows a failed shared-engine step before the local steps and is labelled not comparable.
- **No model reviews a kit-built prototype.** The browser check is the gate. `prototype.json` records `review` as
  empty. In the hand-written path, a screenshot review is recorded as pending unless an installed vision model shares
  a publisher with neither the direction nor the build.
- **The Prototyper node names the wrong model.** The node is labelled with the prototype seat (Ornith), while the
  kit path's two model steps run on the artifact seat (Qwen). The sub-steps show the right model.
- **The agent's system prompt says video is not set up.** `agent.SYSTEM` still tells the agent that video is not
  available in this build, while the `generate_video` tool exists and makes a clip when the engine has the Kandinsky
  nodes. The `generate_image` and `start_diagram` tool descriptions still quote a price.
- **HiC is needed for some work.** Data packs, named publications, second-brain reuse, non-mind-map diagrams, Word,
  PowerPoint and Excel uploads, and every PowerPoint export other than a deck's need HiC's research proxy on port 5012.
- **Long material is read in parts.** A prompt that cannot fit `IA_NEXT_MAX_CTX` is refused with a message.
- **Open items in the record.** `PLAN-COMPLETION-2026-11-19.md` lists as open: parity of Reddit listening with Social
  Research, an independent screenshot judge, scanned PDFs run end to end, and most of the 19 document kinds, which
  have not been run locally through the app.

## Map of the folder

### Top level

| Path | What it is |
|---|---|
| `README.md` | This file. |
| `LOCAL.md` | The build log: what changed from IA Next, round by round, with measured results. |
| `PLAN-COMPLETION-2026-11-19.md` | The audit, the Gemini Notebook benchmark, the completion plan and its measured runs. |
| `INFORMATION_ARCHITECTURE.md` | How the workspace page is organized and why. |
| `ia-next-local.compose.yml` | The three services, two networks and one volume. |
| `Dockerfile`, `requirements.txt` | The app image: Python 3.11, FastAPI, python-pptx, faster-whisper, Piper, Kokoro, scikit-learn, UMAP, PyMuPDF, lameenc. |
| `workflows/` | The pinned ComfyUI graphs: `image.api.json`, `video.api.json`. |
| `bakeoffs/`, `regression/` | Model bake-off and regression records dated 2026-11-11, carried over from the paid build. |

### `ia_next/`

| Module | What it does |
|---|---|
| `__init__.py` | Package marker. |
| `agent.py` | The conversation agent: system prompt, the tool list, the guards, the tool loop. |
| `answers.py` | Answers a question from an engagement's passages in one call, with a checked sentence per point. |
| `app.py` | The FastAPI service: conversations, tasks, plans, approvals, uploads, exports, sandboxed page routes. |
| `artifacts.py` | The document task: corpus, the job call, the quote check and repair, the reviewer. |
| `attachments.py` | Files attached in a conversation, verified against stored uploads, and the refusal when fresh ones go unnamed. |
| `audio.py` | Audio overview scripts, their check, and the voice render behind an approval. |
| `builder.py` | The one builder engine (23 Nov): a builder declares its steps; the engine runs them as visible steps, merges each reply, keeps going past an optional failure and repairs when a step says so. |
| `channels.py` | The signed webhook channel and the link from a channel person to their conversations. |
| `config.py` | Seats and chains, service addresses, the context limit, the metered-host list, publisher identity. |
| `control.py` | Approvals bound to a hash of the exact call. |
| `craft.py` | The craft standard given to the seats that decide content and form. |
| `datatable.py` | Data tables with a checked quote behind every cell. |
| `deck.py` | Brand kits and tokens, the deck task runner and tools, source scoping, the earlier deck writer. |
| `deckstudio.py` | The deck builder in use: composition, checks, images, the native PowerPoint, the preview. |
| `diagram.py` | Diagram, mind map and infographic specifications, their check, and the drawing paths. |
| `docpage.py` | The pages for a persona set, a competitive gap analysis, an architecture and any other document. |
| `exporter.py` | PNG, PDF and PowerPoint for every finished task with a page. |
| `health.py` | The deep health check (23 Nov): every dependency, whether it answers, and what its outage disables. |
| `hic.py` | The link to HiC's research proxy: token, calls, data packs, named publications. |
| `illustrated.py` | The illustrated infographic: ideas, scenes, illustrations, proof quotes, the poster page. |
| `improve.py` | The self-improvement loop (23 Nov): repeated scorecard failures and the owner's rejections become gated skill candidates or attention items. |
| `journey.py` | The journey task's entry point; hands the work to `journeymap.py` in this build. |
| `journeymap.py` | The local journey map: steps, the quote check, the page and its experience curve. |
| `labels.py` | A person's Useful or Not right labels and judge calibration. |
| `library.py` | The imported research library and the pages it seeds into research. |
| `lifecycle.py` | Stop and Try again for tasks. |
| `localartifact.py` | The local document author: outlines, shaped schemas, steps, `bounded`, `calm`, `no_figures`, `lifestyle_images`, `CHECKLISTS`. |
| `localhic.py` | HiC's paid routes answered here (guides, upload reading, topics, speech, documents) or refused. |
| `localmedia.py` | Pictures and video through ComfyUI; graphics memory release. |
| `localrank.py` | Scores collected sources against the goal with the embedding model. |
| `localsearch.py` | Model-written queries and SearXNG results in the shape the Research Lead reads. |
| `localspeech.py` | Kokoro and Piper voices; Whisper transcription. |
| `localstudy.py` | Study guide, FAQ, timeline, flashcards and quiz: schemas, checks, page. |
| `localwriter.py` | The report Writer: claims from the model, quotes and citations inserted by code. |
| `material.py` | The one evidence loader and the contract for sources the person named. |
| `media.py` | The `generate_image` and `generate_video` tools. |
| `memory.py` | The person's memory files and the gate that promotes candidate notes. |
| `mindmap.py` | The mind map's 16:9 page and its fit pass. |
| `narrated.py` | The video overview: voices over slides as one MP4. |
| `pagestyle.py` | The shared page style for IA Next's own HTML artifacts. |
| `plan.py` | Plan cards: the gate, steps, expected times, choices, start and recovery. |
| `prompts.py` | One prompt order for every stepped writer: the material first, byte-identical across steps. |
| `protokit.py` | The prototype kit: specification schema, `normalize`, the page and its runtime script. |
| `prototype.py` | The prototype task: direction, the kit build, the validator, the browser check, the hand-written path and its repairs. |
| `providers.py` | Every model call: the guard, seat resolution, context sizing, the Ollama call, JSON repair. |
| `regression.py` | Regression cases per absorbed application. |
| `reviewer.py` | The background memory reviewer, every fourth turn, from the person's own words. |
| `router.py` | Routing in code (23 Nov): the tool a request names, its arguments, and the guards that check a model's choice. |
| `schedule.py` | Scheduled tool calls. |
| `scorecard.py` | The code-computed scorecard on every finished task (23 Nov) and the "Needs review" mark. |
| `secondbrain.py` | Archiving sources in HiC's wiki, reading them back as chunks, reuse, source guides, passages. |
| `skills.py` | Versioned creator skills and the held-out evaluation gate. |
| `slidepage.py` | The same data laid out as whole 16:9 slides for the PowerPoint export. |
| `social.py` | Reddit collection, the shared-engine attempt, the local analysis, the page and CSV. |
| `store.py` | SQLite state: engagements, tasks, nodes, `stage()`, events, evidence, stop. |
| `studio.py` | The research pipeline: Brief Lead, Research Lead, Analyst, Writer and Verifier; the journey task runner. |
| `studiokit.py` | Evidence handling shared by studio outputs: passages, quote checks, figures in digits and in words. |
| `teams.py` | The Microsoft Teams channel. |
| `themes.py` | Themes: clustering through the topic-model route, naming, the quote check, the page. |
| `transcripts.py` | Uploads as sources, transcription, the Transcript Analyst, uploads-first. |
| `verify.py` | The deterministic checks and the reviewer from a different publisher. |
| `brand_tokens.json`, `design_patterns.json`, `fonts/` | Read-only copies of HiC's brand tokens and pattern catalog; embedded brand typefaces. |

### `web/`

| File | What it does |
|---|---|
| `index.html`, `app.css` | The one workspace page and its styles. The page is titled IA Next Local. |
| `app.js` | The workspace: conversation, cards, panels, sandboxed frames. |
| `catalog.js` | The list of capabilities that feeds the home tiles, the Make menu and the coaching. |
| `make.js` | The composer's Make menu. |
| `md.js` | The Markdown renderer; it escapes HTML first. |
| `mindtree.js` | The explorable mind map tree. |
| `orchestra.js` | The live view of a chat turn and of a task's steps. |
| `packs.js` | The data packs picker. |
| `plain.js` | Plain words for everything the system reports. |
| `plan.js` | The plan card. |
| `studio.js` | An engagement's sources, their switches and guides. |
| `vendor/mermaid.min.js` | A vendored copy of Mermaid. |

### `render/`, `search/`

| File | What it does |
|---|---|
| `render/app.py` | The render service: `/shots` (prototype screens and browser checks) and `/pages` (16:9 pages, PDF, stages). |
| `render/Dockerfile` | Python 3.11 with Playwright and Chromium, run as an unprivileged user. |
| `search/settings.yml` | SearXNG settings: JSON output on, no limiter, internal use only. |

### `scripts/`

| File | What it does |
|---|---|
| `start_all.ps1` | Starts Ollama, the picture engine and the containers, and reports what answers, including HiC. |
| `start_image_engine.ps1` | Starts the dedicated ComfyUI and restarts it when it sits idle holding graphics memory. |
| `pull_models.ps1` | Pulls the six models the seats and embeddings name into Ollama. |
| `grade.py` | Grades a finished artifact against the benchmark checks. |
| `benchmark_prototypes.py` | Compares a prototype with reference prototypes. |
| `make_brand_fonts.py` | Makes the embedded brand typeface subsets. |
| `sync_brand_tokens.py`, `sync_design_patterns.py` | Refresh the read-only copies of HiC's tokens and pattern catalog. |
| `bakeoff_seats.py`, `bakeoff_analysis.py` | Seat bake-offs written for the paid build's container. |
| `bakeoff_orchestration.py` | Which model should hold the conversation seat: Nemotron beside Qwen, or Qwen alone (23 Nov). |
| `calibrate_tokens.py` | Measures characters per token for each model; writes `/data/token_calibration.json`. |
| `builder_golden.py` | Records what the stepped builders send to the model, for `tests/test_builder.py`. |
| `css_collisions.py` | Renders every page type and reports a class defined twice with different values. |

### `tests/`

| File | What it covers |
|---|---|
| `conftest.py` | Points every outside service at a closed port; skips the 24 paid-mechanics tests with reasons. |
| `test_attention.py` | Hidden engagements, rehomed files, "that deck", the conversation spend limit. |
| `test_capability_catalog.py` | The page's catalog matches what the agent can do. |
| `test_collection_second_brain.py` | Collection through the second brain and HiC's source registry. |
| `test_core.py` | Core rules, offline: a step with no result is failed, tasks are idempotent, approvals cover the exact call, the deterministic checks, the reviewer's publisher, journey quotes. |
| `test_creator_skills.py` | Governed skills: seeded, read, edited only as evaluated candidates. |
| `test_data_packs.py` | Every data pack and general source reachable from research. |
| `test_deck_media.py` | The deck builder and the media tools. |
| `test_docpage.py` | The persona, competitive and document pages. |
| `test_exports.py` | Mind map text in full; PNG, PDF and editable PowerPoint exports. |
| `test_frontend_api.py` | Static assets, engagement focus on a message, the media listing. |
| `test_hic_link.py` | The link to HiC: the token, readable errors, uploads through HiC, data packs in research. |
| `test_hic_studio.py` | The document task, themes and recall from the second brain. |
| `test_journeymap.py` | The local journey map: steps, checked quotes, the drawn curve. |
| `test_labels_reviewer.py` | Labels, judge calibration, the memory reviewer, spend recording. |
| `test_library.py` | The library import and research seeding. |
| `test_lifecycle.py` | Stop, Try again, and asking before research when findings exist. |
| `test_local_build.py` | The local contract: no key, the guard, the message shape, seat chains, publisher-based reviewers, HiC's paid routes. |
| `test_memory_scope.py` | Each person's memory is their own. |
| `test_plan.py` | The plan gate, steps, expected times, start and routing corrections. |
| `test_prototype_screens.py` | Prototype screenshots and reachability checks. |
| `test_regression.py` | Regression cases fail on bad outputs. |
| `test_requested_sources.py` | Sources the person asked for are the evidence. |
| `test_schedule_channels_skills.py` | Schedules, the webhook's signature, the skill gate. |
| `test_second_brain.py` | Archiving and reading back chunks. |
| `test_social_parity.py` | Time window, order, topic map and CSV for Reddit listening. |
| `test_social_transcripts_prototype.py` | The Social Analyst, transcript analysis and the Prototyper. |
| `test_sources_panel.py`, `test_sources_panel_review.py` | The sources list, guides and the passage behind a citation. |
| `test_studio_outputs.py` | Diagrams, infographics, data tables and audio overviews checked against their passages. |
| `test_teams.py` | The Teams channel. |
| `test_unified_reddit.py` | Adopting Social Research's shared run. |
| `test_uplift.py` | The 23 Nov uplift: telemetry, deep health, the scorecard, the improvement loop, contexts, streaming, recall and its fallback, the embedding retry, budgets in tokens, compaction, episodic memory, retirement. |
| `test_router.py` | Routing in code: hashtags, named outputs, links, questions, and the arguments read from a message. |
| `test_builder.py`, `test_builder_single_call.py` | Every builder on the engine sends the model what it sent before (golden records in `fixtures/`). |
| `test_css_collisions.py` | No page gives one class two meanings. |
| `tests/fixtures/nurse_staffing_report/` | A frozen report (brief, findings, sources, drafts) used to replay the Writer and the checks. |
