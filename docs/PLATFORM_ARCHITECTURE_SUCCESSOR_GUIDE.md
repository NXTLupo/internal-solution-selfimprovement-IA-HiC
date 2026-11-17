# NXT Humans Intelligence Augmentation Suite: Successor Architecture Guide

**Written for:** the next engineer or agent who inherits this platform and has to extend it without
breaking it. Assumes you can read TypeScript and Python but know nothing about this repo.

**Dated:** 2026-11-10. **Branch at time of writing:** `hic-clarification-and-ledger-2026-08-26`.

---

## 0. How this document was produced, and how to distrust it

Everything below was read out of the working tree on 2026-11-10, not recalled from the existing
CLAUDE.md files. Where the committed documentation disagrees with the code, the code is recorded
here and the disagreement is listed in **Section 10: Documentation drift**. Read that section before
you trust any other document in this repo.

Three habits this codebase punishes, learned the hard way:

1. **A build that succeeds proves nothing about types.** `vite build` uses esbuild, which strips
   TypeScript without checking it. `npm run typecheck` is the only gate.
2. **HTTP 200 proves nothing about rendering.** The HiC container is nginx serving a static bundle;
   it will happily serve a broken React app.
3. **Counts are not reading.** Artifacts have shipped with every mechanical check green and a dead
   stylesheet. Open the output.

### Measuring the tree yourself

```bash
# source lines per service (excludes node_modules, venv, dist)
find <service-dir> -type f \( -name '*.py' -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' \) \
  -not -path '*/node_modules/*' -not -path '*/venv/*' -not -path '*/dist/*' -exec cat {} + | wc -l
```

Measured 2026-11-10:

| Service directory | Source files | Source lines |
|---|---:|---:|
| `humans-in-control-research/` | 718 | 265,723 |
| `internal-solutions-socialresearch/` | 124 | 27,316 |
| `internal-solutions-claude4-journey-mapper-v2/` | 209 | 26,383 |
| `internal-solutions-video-analyzer/` | 32 | 25,275 |
| `internal-solutions-journeymapper/` | 118 | 16,339 |
| `NXT-Agency/` | 69 | 13,760 |
| `mcp-services/` | 28 | 11,009 |
| `internal-solutions-miro-generator/` | 17 | 7,465 |
| `internal-solutions-consistent-character-generator/` | 25 | 6,638 |
| `launchpad/` | 24 | 5,924 |
| `internal-solutions-copilot-recipe-generator/` | 18 | 5,483 |
| `internal-solutions-presentation-renderer/` | 29 | 4,031 |
| `internal-solutions-research-generator/` (legacy) | 13 | 4,199 |
| `internal-solutions-reddit-ripper/` | 13 | 2,419 |
| `internal-solutions-video-renderer/` | 1 `.mjs` | ~ |

**One service is roughly 60% of the platform.** `humans-in-control-research` (HiC) is where nearly
all active development happens, and most of this guide is about it.

---

### 0.1 The owner's recorded complaints, 2026-10-01 to 2026-11-10

**Read this before the architecture.** This is the acceptance bar, stated by the person who sets it.
Entries are his words where a verbatim record exists, and otherwise the objectively observable fact
he reported. **No causes are offered here.** Where a measurement is given it is a measurement, not
an explanation. Successors should resist the urge to annotate this list with theories; the list is
useful precisely because it is what was observed, not what anyone concluded.

#### Output quality and writing

| Date | Complaint |
|---|---|
| 2026-11-08 | "the report and all other artifact copy/writing is full of AI slop... the last generated report doesn't seem to be plugged into [the skills and critics]" |
| 2026-11-09 | A shipped `#brief` judged "still AI slop looking and not professional and lacks much graphical content" |
| 2026-11-10 | A `#quiz` stem: "this isnt proper English? It's jibberish! Not even a sentence!! SLOP!" (the stem read `Reviewing what capabilities a guide to Meta Muse lists for the agent`) |
| 2026-10-21 | A reformatted deck called an "AWFUL deliverable"; reported as corpus content with no information parity to the source |
| 2026-10-01 | Deliverables arriving as thin cards: "make sure each deliverable is more than just a lame set of cards ... consulting grade, no shortcuts" |

#### Imagery, diagrams and visual design

| Date | Complaint |
|---|---|
| 2026-10-23 | After run 12: "zero diagrams which I asked for"; templates and visuals not elevated |
| 2026-10-26 | "the images are terrible and the model did not listen to the prompt ... and over indexed on the upload in the analyst chat even though I asked for some prior context from the external corpora" |
| 2026-11-09 | "#infographics requires images/graphics! NOT JUST GLYPHS AND ICONS" |
| 2026-11-09 | "THERE's a design system for NXT, NU and Deciem in the FIGMAS YOU HAVE ACCESS TO!!!!" |
| 2026-11-09 | An exhibit "does not yet have the illustrative richness of the Gemini reference" |
| 2026-11-10 | A layer-stack SVG exhibit: "that black isometric stack is awful. Make it elegant" |
| 2026-11-09 | Measured by him on the stored library: 22 of 24 artifacts carried zero images |

#### Latency

| Date | Report |
|---|---|
| 2026-10-04 | Analyst chat: could not type. A first fix was shipped and the lag persisted; he reported it again |
| 2026-10-20 | A `#slides` reformat of an attached deck took **970 seconds** |
| 2026-11-08 | A run appeared stuck; it was parked at a review checkpoint with no visible indication |

#### Cost

| Date | Report |
|---|---|
| 2026-09-30 | Directed the Claude research and reasoning model to Opus 5.5 through the one routing authority |
| (standing) | "I SAID ALWAYS USE OPUS 5.5 except when a flash model is needed!!!!" |

The cost record in this repo is thin, and that itself is a finding: `costEstimateUsd` was hardcoded
to 0 on 838 of 860 AIR files, and the `usage.jsonl` ledger did not exist on disk
(`plans/harness-capability-curve-uplift-2026-10-30.md`). Both were addressed in that plan's E10/R1
rows. A successor asking "what did this run cost" before 2026-10-30 will not find an answer.

#### Quality of the analysis itself

| Date | Complaint |
|---|---|
| 2026-10-01 | Hit "A PRD needs typed evidence roots ... approve personas first" on a `#prd` over a 271-source corpus, and rejected the gate: "THEY SHOULD BE GENERATED ALONG WITH THE PRD." |
| 2026-10-02 | "Document uploads, whether in the beginning of a research project or in the analyst chat SHOULD ALWAYS BE THOROUGHLY ANALYZED" |
| 2026-10-02 | "make sure all captured themes in the Research Assembly Board are ALSO ALL reflected in requirements (each theme should generate a set of requirements as well THAT IS WHY THEY ARE THEMES THAT ARE IMPORTANT!!)" |
| 2026-10-02 | Observed on a Northeastern `#prd`: 3 of 12 uploads rejected by the picker; of 258 upload chunks ingested, 16 reached the compiler |
| 2026-10-02 | Theme quotes from other engagements and from NXT's own material appeared in the evidence |
| 2026-10-05 | `#presentation` returned "Could not compose presentation: Gemini-compat API 502" |

#### Scope of the fix, and instruction adherence

| Date | Directive |
|---|---|
| 2026-10-02 | "these rules must be deterministically enforced and generalized for ANY RESEARCH PROJECT, not just this current NU session" |
| 2026-10-02 | "these rules should also be enforced with ALL other hashtag outputs, not just PRD. Consulting grade deliverables must be comprehensive" |
| 2026-10-24 | "don't just fix the slides, FIX THE SYSTEM" |
| 2026-10-30 | "implement in FULL" |
| 2026-11-09 | "Ensure HiC achieves absolute parity with Gemini Notebook" |
| 2026-11-09 | `#slides` named "THE most critical artifact" |

#### Competitive benchmark he ran himself

On 2026-11-09 he ran a signed-in Gemini Notebook session against the same material and scored six
fresh outputs. Recorded observations: Gemini's exported `.pptx` was 15 full-slide rasters
(`text_runs=0`); its video collapsed 12 sources to 1; its outputs carried zero citations except in
the Data Table; two of its sources failed silently; and it mangled dollar figures. He then directed
parity work regardless of those findings.

#### The pattern he has stated about verification

Every artifact he rejected on 2026-11-09 had passed its automated checks. The `#brief` he called
"AI slop looking" scored prose 0.99 with zero slop sites. The `#quiz` stem he called "jibberish" sat
in a file whose image, citation and em-dash counts were all clean. His standing instruction that
follows from this: read the artifact end to end, because counts are not reading.

---

## 1. Platform topology

### 1.1 The one compose file

`docker-compose-all.yml` (702 lines) is the only compose file that matters. `docker-compose.yml`,
`docker-compose-agent.yml`, `docker-compose-https.yml`, `nxt-compose.yml` and `restored2.yml` exist
and are stale. **Always** pass `-f docker-compose-all.yml`.

It declares **24 services**, one bridge network (`nxt-humans-network`) and six named volumes
(`social-research-db-data`, `journey-uploads`, `miro-generator-uploads`, `miro-generator-output`,
`consistent-character-generator-data`, `nxt-agency-db-data`).

The 24, in file order: `launchpad`, `agent`, `reddit-mcp`, `social-mcp`, `journey-mcp`,
`research-mcp`, `video-mcp`, `journey-mapper`, `reddit-ripper`, `social-research-frontend`,
`social-research-backend`, `social-research-db`, `video-analyzer`, `miro-generator`,
`consistent-character-generator`, `copilot-recipe-generator`, `research-generator`,
`research-proxy`, `presentation-renderer`, `video-renderer`, `video-render-mcp`,
`nxt-agency-launchpad`, `nxt-agency-db`, `nxt-agency-backend`.

### 1.2 Request flow

```
Browser
  |
  +-- :8000  Launchpad (Flask + flask_sock)  --WS-->  :8500 Agent orchestrator
  |                                                      |  JSON-RPC 2.0 /mcp
  |                                                      v
  |                             MCP wrappers 8501 / 8502 / 8503 / 8504 / 8507 / 8508
  |                                                      |  HTTP
  |                                                      v
  |                             Core services (Flask / FastAPI / Node)
  |
  +-- :5011  HiC SPA (nginx serving a static Vite dist, NO HMR)
  |             |  fetch()
  |             v
  |          :5012 research-proxy (FastAPI; proxy/app.py is 28,459 lines, 223 HTTP routes)
  |             +-- /api/ai/*      provider fan-out, body normalization, cost meter, caches
  |             +-- /api/search/*  1,277 registered sources, 9 connector types
  |             +-- /api/wiki/*    second-brain read / write / embed (25 routes)
  |             +-- /api/memory/*  the ONE memory door shared by every agent
  |             +-- /api/gold/*    native editable PPTX export
  |             +-- /api/epochs/*  self-improvement proposals and gates (14 routes)
  |
  +-- :5050  NXT Agency launchpad --> :8201 NXT Agency backend (+ :6080 noVNC)
  +-- :5014  presentation-renderer
  +-- :5015  video-renderer
```

### 1.3 Port map (read from the compose file)

| Port | Container | Image / build | Stack |
|---:|---|---|---|
| 8000 | `launchpad` | `python:3.9-slim`, pip on boot | Flask + flask_sock WebSocket proxy |
| 8500 | `agent` | `python:3.10-slim`, pip on boot | FastAPI orchestrator |
| 8501 | `reddit-mcp` | `python:3.9-slim` | JSON-RPC 2.0, 3 tools |
| 8502 | `social-mcp` | `python:3.9-slim` | JSON-RPC 2.0, 6 tools |
| 8503 | `journey-mcp` | `python:3.10-slim` | JSON-RPC 2.0, 5 tools |
| 8504 | `video-mcp` | `python:3.11-slim`, uvicorn | JSON-RPC 2.0, 4 tools |
| 8507 | `research-mcp` | `python:3.10-slim`, uvicorn | JSON-RPC 2.0, 11 tools |
| 8508 | `video-render-mcp` | `python:3.11-slim`, uvicorn | JSON-RPC 2.0, 3 tools |
| 8080 | `journey-mapper` | `Dockerfile.enhanced` | FastAPI, `ANTHROPIC_MODEL=claude-opus-4-8` |
| 5001 | `reddit-ripper` | `python:3.9-slim`, `app_unified.py` | Flask collector |
| 3000 | `social-research-frontend` | `Dockerfile.dev` (Vite on 5173) | React 19 + Redux Toolkit + MUI |
| 8081 | `social-research-backend` | `Dockerfile` (gunicorn) | Flask + BERTopic + transformers |
| (internal) | `social-research-db` | `ankane/pgvector:v0.5.1` | Postgres + pgvector |
| 5002 | `video-analyzer` | `python:3.11-slim` + ffmpeg | FastAPI + Whisper + yt-dlp |
| 5004 | `miro-generator` | `Dockerfile.simple` | TypeScript CLI (Jest) |
| 5010 | `consistent-character-generator` | `Dockerfile` | React + `@google/genai` |
| 5013 | `copilot-recipe-generator` | `python:3.11-slim`, uvicorn | FastAPI + embedded Vite frontend |
| 5011 | `research-generator` (container **`hic-research`**) | multi-stage Node 20 to nginx | React 18 + Vite 6 |
| 5012 | `research-proxy` | `proxy/Dockerfile` | FastAPI + Playwright Chromium |
| 5014 | `presentation-renderer` | `Dockerfile` (serves 4500) | React 19 + framer-motion |
| 5015 | `video-renderer` | `Dockerfile` (serves 4600) | Node + HyperFrames, `shm_size: 2gb` |
| 5050 | `nxt-agency-launchpad` | multi-stage Vite to nginx | React catalog UI |
| 8201 / 6080 | `nxt-agency-backend` | `docker/Dockerfile.backend` | FastAPI + computer use + noVNC |
| (internal) | `nxt-agency-db` | `postgres:15-alpine` | DB `ai_assistant` |

**Naming traps:** the compose service is `research-generator`, the container is `hic-research`.
Port 3000 is Social Research, never HiC. Container names that differ from their directory:
`consistent-character-generator`, `social-research-frontend`, `social-research-backend`.

### 1.4 What was actually running when this was written

```
hic-research               Up 11 hours
research-proxy             Up 11 hours (healthy)
social-research-frontend   Up 16 hours (healthy)
lupo-searxng               Up 16 hours      <-- NOT in docker-compose-all.yml
```

`lupo-searxng` (host port 8890, bound to 127.0.0.1) is started outside the compose file. If you
bring the platform down it survives, and if you are looking for its definition it is not in any
compose file in this repo.

### 1.5 Dormant code that looks live

In `mcp-services/` but **not** in `docker-compose-all.yml`:

- `linkedin-mcp/` (367 lines)
- `mulmocast-mcp/` (628 lines)
- `claude4-journey-mcp/` (1,166 lines), paired with the removed `claude4-journey-mapper-v2`
- `openai-journey-mcp/` (950 lines)

`internal-solutions-claude4-journey-mapper-v2/` (26,383 lines) and
`internal-solutions-research-generator/` (4,199 lines, the legacy HiC) are both on disk with no
compose service. Never assume a directory is wired in; grep `docker-compose-all.yml` first.

Both are traced in 2.14 and 2.15, because their size and names make them look current when they are
not. Two findings worth carrying forward: the v2 journey mapper is an **abandoned mid-migration
fork** whose two copies are both older than the live service, and the legacy research generator
**still injects a provider key into browser HTML on port 5011**, the pattern HiC removed and the
port HiC now uses.

**Correction to the older docs:** `openai_journey` is no longer in the agent's `tool_services`.
`mcp-services/agent/app.py:87` now holds exactly six entries: `reddit`, `social`, `journey`,
`video`, `research`, `video_render`. The "silently fails at startup" warning in the root CLAUDE.md
is obsolete.

---

## 2. Service by service

### 2.1 Launchpad (`launchpad/app.py`, 1,386 lines)

Flask, `flask_sock` for WebSockets, `psutil` for process checks, a direct `anthropic` client import.
Routes include `/`, `/agent`, `/mcp-chat`, `/status`, per-service `/proxy/<mcp>/<path>`
passthroughs, `/api/threads`, `/api/agency/reviews` and `/api/agency/reviews/<id>/decision` (the
human approval surface for NXT Agency), `/api/digest`, `/api/logs`, `/api/metrics`.

It is both the service dashboard and the browser-to-agent WebSocket relay. Every downstream URL
arrives by environment variable, so it hardcodes no hosts (`get_dynamic_urls()` at line 52 builds
them, with a `request_is_secure` flag for the HTTPS variant).

**Service monitoring:** `check_service()` (line 178) probes one service, `update_all_services()`
(274) sweeps them, and `service_checker()` (296) runs that sweep on a background thread. The result
feeds both `/status` and the WebSocket proxy's preflight.

**The WebSocket proxy is the trickiest code in the file** (`ws_proxy`, line 561). Flask-Sock is
synchronous and the agent connection is asyncio, so the two are bridged by thread-safe queues rather
than by making either side change model:

- The **main thread owns the Flask-Sock socket**, for both send and receive. Only it calls
  `ws.receive()` and `ws.send()`.
- A **background thread runs an asyncio loop** (`_agent_loop`, line 616) that connects to the agent,
  reads agent messages and pushes them to `agent_to_client_queue`.
- The main thread pushes browser messages to `client_to_agent_queue`.
- `shutdown_event` (a `threading.Event`) and `agent_ws_holder` (a one-element list used as a mutable
  reference) coordinate teardown.

Violating that ownership split, for example calling `ws.send()` from the background thread, is the
class of bug this structure exists to prevent.

Before connecting it refuses early: if `services_status['agent']` is not `running` it sends a typed
error frame naming the current status rather than hanging the browser. It then sends a
`{"type": "status", "status": "connecting"}` frame, so the UI can show state.

`_agent_loop` retries with `max_retries = 3` and a growing `retry_delay`, emitting a
`{"status": "reconnecting"}` frame between attempts, and distinguishes handshake failures
(`InvalidStatusCode`, `InvalidHandshake`) from transport failures (`WebSocketException`).

**Protocol pings are disabled on purpose**: `ping_interval=None, ping_timeout=None` (lines 625-626),
because application-level pings handle keepalive. If you re-enable protocol pings you will get
double keepalive and spurious disconnects.

One stale detail lives here: the service descriptions around line 1052 still advertise "Claude 3.7
Sonnet" and "Claude Sonnet 4" journey mappers, which no longer reflect the deployed models.

### 2.2 Agent orchestrator (`mcp-services/agent/app.py`, 863 lines plus three modules)

The platform coordinator, version 2.0.0.

- **`hic_door.py` (252 lines)** is the agent's only way out. It holds **no provider key and no model
  id**. Model seats come from `GET /api/models` on the research proxy; every completion goes through
  the proxy's provider routes, so the agent inherits body normalization, the cost meter, caching and
  the event sink. Memory recall and admission go through `/api/memory/*`. Skills come from the
  registry's `platform-agent` packages and are re-fetched when their hash changes, so a SkillOpt
  promotion lands on the next turn after the TTL. Every path degrades to "no extra context" when the
  proxy is unreachable, except model calls, which have no other route; the turn then reports the
  outage rather than answering from nothing.
- **`threads.py` (181 lines)** is a thread registry persisted to `hic-workspace/agent/threads.json`
  plus `conversations/<id>.json`, so a restart loses nothing. `route_message` sends a new ask to the
  thread that already owns its job id or engagement. Each thread is marked `cloud` or `local` by the
  prefixes of the tools it ran (`LOCAL_TOOL_PREFIXES = ("computer_", "browser_", "desktop_",
  "screen_", "local_")`): work in platform containers is cloud, work needing the user's own machine
  is local.
- **`anti_hallucination.py` (272 lines)** guards tool-result formatting.

Startup calls `fetch_and_cache_tools()`, which runs `tools/list` against each MCP service with a
three-attempt retry. **Restart the agent after changing any MCP service** or its tool cache is stale.
`POST /refresh-tools` does it without a restart.

It also exposes `POST /api/webhooks/hic`, the signed callback where delegated HiC jobs report back,
and `POST /api/threads/report` for the same from NXT Agency.

### 2.3 MCP wrappers

All speak JSON-RPC 2.0 at `/mcp`:

```json
{"jsonrpc": "2.0", "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "...", "arguments": {}}}
```

Tool counts measured 2026-11-10: `reddit-mcp` 3, `video-render-mcp` 3, `video-mcp` 4,
`journey-mcp` 5, `social-mcp` 6, `research-mcp` 11.

`research-mcp` is the bridge that lets *other* agent platforms drive HiC:
`launch_research_app`, `run_deliverable`, `get_job`, `get_run_state`, `list_artifacts`,
`get_run_telemetry`, `list_skills`, `get_skill`, `recall_memory`, `admit_memory`, `get_digest`.
Note the last three: the MCP surface is a client of the same memory and skill doors the SPA uses.

### 2.4 Journey Mapper (`internal-solutions-journeymapper/`, 16,339 lines)

FastAPI, entry at `src/app.py` (1,148 lines), booted by `run.py`. `src/` is 6,531 Python lines:

| File | Lines | Role |
|---|---:|---|
| `ai_analysis/dynamic_journey_mapper.py` | 2,820 | the engine: prompt build, API call, HTML validation, repair, fallback |
| `app.py` | 1,148 | FastAPI routes and the server-rendered UI |
| `data_ingestion/data_processor.py` | 1,063 | multi-format ingestion |
| `utils/prompts.py` | 605 | prompt library |
| `utils/vector_store.py` | 378 | optional RAG index |
| `conversation/interface.py` | 243 | conversational refinement |
| `wkhtmltopdf_config.py` | 83 | PDF export config |

**Routes:** `GET /` (server-rendered HTML with the model picker baked in), `GET /api/models`,
`GET /api/check-key`, `POST /api/analyze`, `GET /api/export-pdf/{journey_id}`,
`POST /api/edit-journey-map/{journey_id}`, `DELETE /api/remove-element/{journey_id}`, and a
service-worker kill switch at `GET /sw.js` and `/dev-sw.js` that self-destructs stale workers. That
kill switch exists because a cached service worker produced a blank page; if you see a blank Journey
Mapper, suspect the worker before the app.

**`POST /api/analyze`** is multipart and takes `files[]`, `title`, `description`, `journey_type`,
`llm_model`, `content_selection`, `brand`, `artifact_type`, `render_mode`. Brand and artifact type
are parameters, so this service is brand-aware in the same sense HiC is. It mints a `journey_id`
(uuid4) per run.

**RAG is optional and silently degrades.** `analyze_files` tries
`from src.utils.vector_store import init_vector_store`; on `ImportError` it sets `use_rag = False`
and logs "Vector store module not found, disabling RAG capabilities". `VectorStore` itself
(`utils/vector_store.py:12`) tries `faiss` first (`IndexFlatL2`, 1536-dim default), falls back to
`annoy`, and falls back again to a plain numpy scan. Three silent degradation levels in one class;
check the logs before assuming retrieval ran.

**`DynamicJourneyMapper`** (`ai_analysis/dynamic_journey_mapper.py:37`) is a two-pass HTML generator,
not a JSON generator. Its method chain: `generate_journey_map` to `_extract_journey_info` to
`_preprocess_data` / `_simplify_data_for_prompt` to `_extract_journey_insights` to `_create_prompt`
to `_call_anthropic_api` to `_validate_and_fix_html`. When the model returns truncated HTML it runs
`_create_retry_prompt` with the incomplete HTML, and `_fix_html(html, missing_tags)` closes what is
missing. `_create_fallback_html` produces a usable artifact when generation fails outright, and
`_create_second_pass_prompt` feeds the first pass's HTML and insights back for deepening.
`render_journey_map_html`, `_extract_journey_from_html` and `_extract_summary_from_html` read
structure back out of the generated HTML.

That last point matters downstream: **HTML is this service's output contract**, which is why the
Miro Generator parses HTML (2.7) rather than consuming JSON.

**Ingestion** (`data_processor.py`) handles JSON, PDF, CSV and plain text, and classifies text with
`_is_transcript()` so transcripts, feedback and journey documents get different structuring. It
writes intermediate artifacts to `logs/` at every stage (`raw_json.txt`, `extracted_pdf.txt`,
`structured_transcript.txt`, `complete_processed_data.json`), which makes failures diagnosable
stage by stage.

**Models:** `DEFAULT_ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8")`
(`src/app.py:131`), and `get_available_models()` returns exactly three ids offered in the UI
dropdown:

```python
["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
```

`claude-opus-4-8` is **sunset** in `proxy/model_registry.py`. Compose also pins it. See 11.2.

Three generations of Claude wrapper coexist at the repo root:

- `claude_api_wrapper.py` (129 lines): raw `requests.post`, SSL retry, 30-minute timeout, and a
  `_model_deprecates_temperature` guard that strips `temperature` for `opus-4-8` so the call does
  not 400.
- `claude_4_5_api.py` and `claude_3_7_api.py` (40 lines each): the official SDK. Prefer these for
  new code.

HiC's `#journey` path proxies to this service's `/api/analyze` over the internal network
(`JOURNEY_MAPPER_URL` on `research-proxy`), which is why a journey deliverable can fail even when
HiC itself is healthy.

### 2.5 Social Research (`internal-solutions-socialresearch/`, 27,316 lines)

The only service with a real database and a real classical-NLP stack (Section 7 covers the
algorithms). Python 3.11 required; 3.12 is unsupported. Flask under gunicorn with blueprints
`api_reddit`, `api_reddit_proxy`, `api_topic_model`, `api_llm_analyzer`, `api_pgvector`,
`api_embed`, `api_local_llm`, `api_user`, `debugging_tool`.

`api_embed.py` matters beyond this service: it serves a local `SentenceTransformer` embedding
endpoint, and `research-proxy` defaults to it (`EMBED_PROVIDER=local`) so HiC retrieval never
starves on a Gemini 429.

### 2.6 Video Analyzer (`internal-solutions-video-analyzer/app.py`, 1,028 lines)

FastAPI. `yt-dlp` to download, `pydub` and ffmpeg to chunk audio, `youtube_transcript_api` as the
cheap first try, OpenAI Whisper as the main path, Gemini multimodal as the fallback. ffmpeg is
apt-installed at container start, so first boot is slow by design. The directory's 25,275 lines are
mostly static assets and historical fix scripts; the service is the one file.

**Routes:** `GET /` (UI), `GET /api`, `GET /health`, `POST /upload-video`, `POST /analyze-youtube`,
`GET /jobs`, `GET /jobs/{job_id}`, `GET /transcript/{job_id}`.

**Job model:** work runs off the event loop via `_run_job_off_loop(job_fn, ...)`, progress is
reported through a closure factory `_progress_reporter(job_id, lo, hi)` that maps a stage's internal
progress into a global percentage band (for example transcription occupies 60 to 90), and
`_restore_jobs_from_disk()` rebuilds job state on boot so a restart does not lose completed work.
`_save_transcript_sidecar()` writes the transcript next to the artifact.

**The Whisper 25MB limit is handled in two layers**, and the comment at line 445 records why. A file
over the limit returns 413, and the pipeline used to fall back to silence detection, emitting
"Speech segment" placeholders for every timestamp, which looked like a successful transcription of
nothing. The fix:

```python
WHISPER_MAX_BYTES    = 24 * 1024 * 1024   # 24 MB, 1 MB margin under the 25 MB API cap
WHISPER_CHUNK_SECONDS = 600               # 10-minute chunks, about 5 MB each at 64 kbps mono
```

1. `_whisper_optimize_audio()` recompresses to Whisper's recommended format with ffmpeg: mono
   (`-ac 1`), 16 kHz (`-ar 16000`, Whisper's internal sample rate), 64 kbps MP3, video dropped
   (`-vn`). That is roughly 5x smaller than the previous 44.1 kHz stereo 165 kbps output, so most
   videos under about two hours now fit in one request.
2. `_split_audio_for_whisper()` chunks anything still too large into 10-minute segments.
   `_whisper_segments_to_list(segments, offset_seconds)` offsets each chunk's timestamps by its
   start time, so the stitched transcript keeps a continuous monotonic timeline.

`_audio_duration_seconds()` reads duration with ffprobe and returns 0 on failure, letting the
chunker fall back to deciding on file size alone.

**Provider fallback is recorded in the output.** `process_video` reads
`getattr(transcript_data, "method", "whisper")` and writes a `==== GEMINI TRANSCRIPTION ====` or
`==== WHISPER TRANSCRIPTION ====` banner into the saved transcript, so which provider ran is visible
in the artifact rather than only in logs. The Gemini model is configurable:
`GEMINI_TRANSCRIBE_MODEL` defaults to `gemini-3.5-flash` (a current id).

`_assert_reachable(host, port)` preflights network reachability, which turns an opaque hang into a
named failure.

### 2.7 Miro Generator (`internal-solutions-miro-generator/`, 7,465 lines)

Node TypeScript CLI, Jest with ts-jest, and the only coverage target in the suite
(`npm run test:coverage`). Dependencies are scraping and orchestration utilities (`cheerio`,
`axios`, `p-limit`, `p-retry`, `joi`, `commander`, `inquirer`), not a web framework.

`src/` is 4,412 lines in 13 files:

| File | Lines | Role |
|---|---:|---|
| `parsers/journey-parser.ts` | 824 | parses Journey Mapper HTML into a typed `JourneyMap` |
| `miro/board-generator.ts` | 657 | turns a `JourneyMap` plus a `LayoutResult` into Miro widgets |
| `utils/grid-layout.ts` | 569 | computes the board layout (the collision-free grid) |
| `miro/api-client.ts` | 491 | Miro REST client |
| `types/index.ts` | 486 | `JourneyMap`, `Touchpoint`, `PainPoint`, `Emotion`, `Quote`, `Action`, `Channel` |
| `cli/index.ts` | 472 | commander CLI |
| `utils/config.ts` | 432 | token and board config |
| `utils/index.ts`, `errors.ts`, `logger.ts` | 447 | support |

**Input contract:** it consumes Journey Mapper's rendered HTML, not a JSON API.
`journey-parser.ts` is therefore coupled to that service's markup, so a Journey Mapper template
change can break the Miro generator silently. This is the only cross-service coupling in the suite
that runs through HTML.

CLI commands: `generate` (with `--output`, `--board-id`, `--template`, `--config`, `--dry-run`,
`--verbose`, `--force`), `validate`, `config` (`--set-token`, `--set-board`, `--show`, `--init`),
`template` (`--list`, `--create`, `--delete`), `test`.

`board-generator.ts` maps each journey element type to a Miro shape and style through dedicated
resolvers: `getTouchpointStyle` and `getTouchpointShape`, `getPainPointStyle`, `getEmotionStyle` and
`getEmotionShape`, `getQuoteStyle`, `getActionStyle`, `getChannelStyle` and `getChannelShape`.
Adding a journey element type means touching the type union, the parser, the layout and both
resolvers.

### 2.8 Consistent Character Generator

React with exactly three dependencies: `react`, `react-dom`, `@google/genai`. A thin Flask `app.py`
serves the built SPA and a few operational routes (`/health`, `/api/status`, `/api/video-status`,
`/api/video-debug`, `/api/clear-data`, static and asset serving). All generation happens in the
browser.

Two service modules: `services/geminiService.ts` and `services/audioAnalysisService.ts`.
Components: `Gallery.tsx`, `AudioSyncVideoGenerator.tsx`, `CharacterNamingModal.tsx`,
`DownloadModal.tsx`, `ui.tsx`.

**Models it calls directly**, hardcoded in `services/geminiService.ts`:

- `gemini-3.1-flash-image-preview` at lines 347, 363, 390, 424 and 1001 (image generation and edits)
- `veo-3.1-fast-generate-preview` at line 478 (video, the fast tier chosen for latency)

Both are current-tier ids, so this service is **not** a model-drift site, unlike the three in 11.2
and the one in 11.3. It is still a direct-to-provider caller holding `GEMINI_API_KEY` in its own
container, outside the proxy's scrub, cost meter and cache.

Persistence is browser IndexedDB, so generated characters live in whichever browser made them and
are invisible to the rest of the platform.

Its compose entry carries a trick worth keeping: an anonymous volume `- /app/dist` shadows the host
bind mount, so the image's built frontend is not hidden by a host directory that has no `dist/`.
Remove it and port 5010 serves a "frontend needs to be built" placeholder.

### 2.9 Copilot Recipe Generator (`app.py`, 1,826 lines)

FastAPI serving a built Vite React app from `frontend/`. Build the frontend before the backend can
serve it. It generates Microsoft Copilot Studio and Power Automate recipes: YAML topic definitions,
auto-trigger phrases, and flow bodies.

Structure: `load_knowledge()` ingests `knowledge/` (docx, pdf and md covering conversation design,
agentic commerce, UX heuristics, platform landscape); `evidence/` holds worked example reports;
`load_templates()` and `get_template()` serve a template registry; `build_system_prompt()` assembles
a long rule list; `generate_topic_yaml()` emits the deliverable; `_auto_trigger_phrases()` derives
trigger phrases from the topic name and description. Helpers `_strip_emojis()` and
`_yaml_safe_value()` exist because emoji and unescaped YAML break Power Automate JSON escaping.

**This service pins three Claude ids at module scope and writes them into generated artifacts:**

```python
MODEL                = "claude-opus-4-6"            # app.py:35
RECIPE_MODEL_OPUS    = "claude-opus-4-6"            # app.py:38
RECIPE_MODEL_SONNET  = "claude-sonnet-4-6"          # app.py:39
RECIPE_MODEL_HAIKU   = "claude-haiku-4-5-20251001"  # app.py:40
```

`claude-opus-4-6` is marked **sunset** in `proxy/model_registry.py` with successor
`claude-opus-5-5`. The ids are not only used for this service's own calls: they are substituted into
the generated recipe text (`app.py:566` and `app.py:915`) and asserted in the system prompt as
"RULE 45: CURRENT MODEL IDS (UPDATE THIS WHEN MODELS CHANGE)", which also instructs the reader that
Opus and Sonnet take no date suffix while Haiku does. A user who follows a generated recipe builds a
Power Automate flow against a retired model.

This is the most consequential model drift in the repo, because it travels outward into deliverables
instead of failing inside a container. See 11.3.

### 2.10 Presentation Renderer

React 19 plus `framer-motion`, scroll-driven, serving 4500 mapped to host 5014. Brand resolution
swaps NXT and NU through CSS variables.

**The contract it consumes** is `PresentationPayload`, defined at
`humans-in-control-research/services/presentationTypes.ts:319` and produced by
`services/narrativeComposer.ts` for `#presentation`. It is versioned (`schemaVersion: 1`) and its
`meta` block carries both content and observability:

```ts
meta: {
  slug, title, subtitle[], brand, theme, generatedAt,
  sourceEngagement?,        // wiki path back to the engagement memo
  narrativeThesis,          // the user's thesis verbatim, hashtags stripped
  composerModel,            // which model composed it
  composerToolCalls,
  sourceCount: { external, uploaded, analysis, total },
  citationCount,
}
```

`sourceCount` splitting external from uploaded is how the evidence-hierarchy rule (at least 60%
external) stays checkable on a rendered presentation, not only at generation time.

`narrativeComposer.ts` drives the model through tool calls and nudges it when it stalls
(line 225: "Retrieval is complete. Call submit_presentation NOW with the full PresentationPayload").
This is a tool-use composition loop, not a single prompt.

`src/sections/` contains **14** section components plus `_primitives.tsx` and `registry.tsx`:
Hero, Context, Evidence, Personas, Journey, Competitive, GapAnalysis, Quotes, Recommendations,
Roadmap, Team, Cta, Themes, TechArch. (The root CLAUDE.md says 12; it is two behind.)

### 2.11 Video Renderer (`server.mjs`, 277 lines)

One file, one dependency, `hyperframes` (Apache-2.0). Deterministic HTML-to-MP4: a paused, seekable
timeline captured frame by frame through Chrome BeginFrame, then encoded by ffmpeg. Node-only, which
is why it is a sidecar rather than part of the Python proxy, the same split already used for
`gold_pptx_export` and `nxt_diagram_render`.

It is a raw `node:http` server with no framework and three routes:

| Route | Method | Behavior |
|---|---|---|
| `/health` | GET | reports `active`, `queued` and `jobs.size` |
| `/lint` | POST | free composition check; the gate runs BEFORE the queue |
| `/render` | POST | enqueues a render, returns a job id |

Concurrency is an explicit queue, not a framework pool. `MAX_CONCURRENT` defaults to 1
(`MAX_CONCURRENT_RENDERS`), `MAX_QUEUE` bounds the backlog, and a full queue answers **503** with
"render queue is full; retry later" rather than accepting work it cannot start. Rendering takes
minutes and holds a Chromium per worker, which is why the queue is explicit.

The lint-before-queue ordering is deliberate and the MCP wrapper repeats it: `video-render-mcp`
exposes `lint_composition`, `render_composition` and `render_status`, and its tool descriptions tell
the model to lint first, because linting is free while rendering is minutes of CPU that bakes copy
into pixels.

`shm_size: 2gb` in compose because each worker is roughly one Chromium at ~256MB and headless
Chromium crashes on the default 64MB `/dev/shm`. Renders land on a mounted `renders/` directory
because they outlive the request that made them.

### 2.12 Reddit Ripper (`app_unified.py`, 384 lines)

Despite the name it is a **multi-source review and post collector**, not Reddit-only. Flask, with a
background-thread job model: `collect_data_background(job)` runs the collection, `save_job_status`
persists progress, and the browser polls `/api/status/<job_id>`.

Routes: `/` (UI), `/api/sources` (capability discovery), `/api/collect` (start a job),
`/api/status/<job_id>`, `/api/download/<job_id>/<filename>`, `/api/scrape` (a legacy Reddit-only
endpoint kept for older callers), `/static/<path>`.

Collectors sit behind an abstract base and a factory, which is why `/api/sources` enumerates
capabilities at runtime instead of hardcoding a list:

- `services/collectors.py`: `DataCollector` (ABC), `RedditCollector`, `TrustPilotCollector`,
  `CollectorFactory` with `get_supported_sources()` and `get_source_params()`
- `services/playstore_collector.py`: `PlayStoreCollector`
- `services/trustpilot_scraper.py`: `TrustPilotScraper` and `TrustPilotAPI`, two strategies for the
  same source because TrustPilot's markup changes
- `models/trustpilot.py`, `models/playstore.py`: typed records

Output is a PDF built by `generate_pdf_unified()` with per-source formatters (`format_reddit_item`,
`format_trustpilot_item`, `format_generic_item`). To add a source you write a `DataCollector`
subclass, register it in `CollectorFactory`, and add a formatter.

### 2.13 NXT Agency (`NXT-Agency/`, 13,760 lines, vendored in-repo)

FastAPI backend plus a Vite catalog frontend, built from source in compose (no pre-committed dist,
so a fresh clone works).

- **173 agent prompt markdown files** across 14 categories: `specialized` 28, `marketing` 27,
  `engineering` 23, `game-development` 10, `design` 8, `sales` 8, `testing` 8, `paid-media` 7,
  `project-management` 6, `spatial-computing` 6, `strategy` 6, `support` 6, `academic` 5,
  `product` 5.
- **`backend/app/llm/router.py`** carries its OWN `MODEL_MAP` with friendly keys (`claude-opus` to
  `claude-opus-4-6`, `claude-sonnet` to `claude-sonnet-4-6`, `gpt-5`, `gemini-pro` to
  `gemini-3.1-pro-preview`). **This is a second, older model registry that does not track HiC's.**
  See Section 10.
- **`backend/app/orchestration/`** is a typed multi-agent OS: `contracts.py` (Pydantic `TaskType`,
  `TaskStatus`, `EngagementPlan`, `TaskNode`, `WorkerHandoff`, `ModelRoute`, `EvidenceRef`,
  `ApprovalGateSpec`, `BudgetCap`, `DecisionRecord`), `control_tower.py` ("the only agent permitted
  to orchestrate other agents": intake, decomposition, routing, permissioning, approval gates,
  worker dispatch, verification, assembly), plus `router.py`, `workers.py`, `verifier.py`,
  `approval.py`, `state.py`.
- **`backend/app/tools/`**: `computer_use.py` (414 lines, noVNC on 6080), `cx_services.py`
  (1,125 lines, the bridge into this platform's MCP services), `figma.py`, `image_gen.py`,
  `prototype_gen.py`, `review_gate.py`, `code_exec.py`, `web_search.py`, `file_ops.py`,
  `delegate.py`, `text_analysis.py`.
- **`backend/app/hic_bridge.py`** plus env `HIC_PROXY_URL`, `HIC_AGENT_URL`, `PROXY_AUTH_TOKEN`:
  NXT Agency admits and recalls facts through the same memory door and reports delegated work back
  to the platform agent.

**`agents/registry.py` (364 lines)** is the loader. Agent definitions are **Markdown files with YAML
frontmatter**, exactly like Claude Code skills: `_parse_frontmatter()` splits metadata from body,
`_slugify()` derives the id from the filename, and an optional `_defaults.yaml` plus a per-agent
`<name>.yaml` supply overrides. `AgentDefinition._generate_prompts()` derives starter prompts, and
`to_dict()` serializes for the catalog UI. The default model key is `claude-sonnet`
(`registry.py:84`), resolved through `MODEL_MAP`.

**`agents/engine.py` (600 lines)** is the agent loop: `AgentEngine.run()` and `run_stream()`, with
`_build_system_prompt(agent, has_tools)`, `_execute_tool()` and a module-level
`_build_tool_result()`. Tool schemas come from `self.tools.get_anthropic_tools()` (lines 162 and
318), so the tool surface is assembled per run rather than fixed.

**`agents/launchpad_compat.py` (2,247 lines)** is the largest file in the service and exists to keep
the older launchpad contract working. It holds its own `anthropic.AsyncAnthropic` client
(`_get_extraction_client()`) pinned to `claude-haiku-4-5-20251001` for extraction work.

Human approval is real: `REVIEW_TIMEOUT_S` defaults to 600 seconds and the launchpad exposes
`/api/agency/reviews/<id>/decision`.

### 2.14 Claude 4 Journey Mapper v2 (`internal-solutions-claude4-journey-mapper-v2/`, 26,383 lines)

**Dormant. No compose service, no MCP wrapper in compose.** Its paired wrapper
`mcp-services/claude4-journey-mcp/` (1,166 lines) is also absent from compose, and the root
CLAUDE.md records both as removed. It is the second-largest tree in the repo and nothing starts it.

Documented here because 26,383 lines of plausible-looking code is a trap for a successor who
assumes it runs.

**It is a fork of the live Journey Mapper, mid-migration, and the migration was abandoned.** The
same modules exist twice, at the repo root and under `src/`, and two of the four have diverged:

| File | root | `src/` | state |
|---|---:|---:|---|
| `app.py` | 1,073 | 1,065 | **DIFFER** |
| `ai_analysis/dynamic_journey_mapper.py` | 2,087 | 1,935 | **DIFFER** |
| `data_ingestion/data_processor.py` | 1,063 | 1,063 | identical |
| `utils/prompts.py` | 605 | 605 | identical |

Neither copy is authoritative. The live service
(`internal-solutions-journeymapper/src/ai_analysis/dynamic_journey_mapper.py`) is 2,820 lines, so
**both v2 copies are older and smaller than the service that is actually deployed**. Treat this tree
as a historical branch, not as a newer version its name suggests.

Measured precisely, the duplication is a near-exact copy whose bodies drifted:

- The React components are **byte-identical** between `components/` and `src/components/` in all
  four subdirectories (`conversation` 2 files, `data` 2, `journey` 3, `layout` 3), plus
  `MermaidJourneyMap.jsx`.
- The two engine copies declare the **same 17 methods**, so no capability was added or removed; only
  the implementations diverged (2,087 against 1,935 lines).
- The two `app.py` copies expose the **same routes**, differing by exactly one:
  `@app.get("/static/nxt-humans-logo.png")` exists only at the root.

That is the signature of a copy-paste restructuring into `src/` that was started, partially edited
on both sides, and abandoned without deleting either side.

Frontend stack is React plus `mermaid` and `lucide-react` (four dependencies total), with npm
scripts `build`, `dev`, `dev-server`, `api`, `start`. `MermaidJourneyMap.jsx` is the renderer, which
is why the committed `static/js/` carries mermaid and dagre-d3 vendor bundles.

Further decay signals, all verified:

- `flask_app.py` imports `src.ai_analysis.journey_analyzer` and
  `src.visualization.journey_map_generator`. **Neither file exists anywhere in the tree**, so that
  entry point cannot start. `app.py` is the FastAPI entry; `flask_app.py` is dead.
- `ai_analysis/__initi__.py` is a typo of `__init__.py` and both are present.
- `routes/`, `models/` and `visualization/` contain only `__init__.py`.
- `claude_api_wrapper.py:7` defaults to `model="claude-opus-4-5"` and
  `dynamic_journey_mapper.py:40` defaults to `claude-sonnet-4-20250514`. Both are retired snapshots.
- Checked-in build output (`static/js/vendors-*.main.js`, mermaid and dagre-d3 bundles) is duplicated
  at root and under `static/`, and a `server.log` is committed.

Its routes mirror the live service (`/api/models`, `/api/check-key`, `/api/analyze`,
`/api/export-pdf/{id}`, `/api/edit-journey-map/{id}`, `/api/remove-element/{id}`), which is the
clearest evidence it was a parallel rewrite rather than a different product.

**Recommendation:** delete it, or move it to an `archive/` directory with a README. If a feature in
it is wanted, port the feature into `internal-solutions-journeymapper` rather than reviving the
fork; the live engine is already ahead of both copies.

### 2.15 Legacy Research Generator (`internal-solutions-research-generator/`, 4,199 lines)

**Dormant. No compose service.** Docker builds HiC from `humans-in-control-research/`. This is the
ancestor of HiC, and the root CLAUDE.md says so in one line.

Structure: React plus Vite (`App.tsx` 716, `components/ResultsView.tsx` 827,
`CheckpointManager.tsx` 349, `ThinkingViewer.tsx` 298, `InteractiveControls.tsx` 114,
`FileUpload.tsx` 109), a `services/geminiService.ts` (549) and a Python
`services/interactive_analysis.py` (532), served by `serve.py` (465) or `app.py` (119).

`serve.py` shows the shape HiC inherited and then rebuilt: `POST /api/analysis/start`,
`POST /api/analysis/<session_id>/checkpoint`, `GET /api/analysis/<session_id>/thinking`,
`GET /api/analysis/<session_id>/status`, with `run_interactive_analysis(session_id)` and
`add_thinking_event(session_id, pass_type, content, confidence)`.

**`services/interactive_analysis.py` (532 lines) is the ancestor of HiC's checkpoint machinery**,
and it is worth reading precisely because it is small enough to hold in your head while HiC's
equivalent is spread across `App.tsx` and a dozen services. It defines:

- Three enums: `CheckpointStage`, `CheckpointStatus`, `ThinkingPassType`.
- Three dataclasses: `ThinkingEvent`, `Checkpoint`, `AnalysisSettings` (with
  `enable_checkpoints: bool = True`).
- `InteractiveAnalysisOrchestrator`, which holds
  `checkpoint_handlers: Dict[CheckpointStage, Callable]` and exposes
  `register_checkpoint_handler(stage, handler)`.
- `AnalysisSession`, which builds its checkpoint list in `_initialize_checkpoints()`, tracks
  `current_checkpoint_idx`, and walks them setting `CheckpointStatus.ACTIVE` as it goes.

The handler-registry pattern (a stage maps to a pluggable callable) and the typed thinking-pass
events are both ideas HiC still uses; the legacy file is the clearest statement of them.

Its `services/geminiService.ts` calls `gemini-3-pro-preview`, `gemini-3-pro-image-preview` and
`veo-3.1-generate-preview`. Note `gemini-3-pro-preview` is **not** a canonical id; the registry
knows `gemini-3.1-pro-preview`. One more reason not to revive this tree as-is.

**It still carries the key-injection vulnerability HiC removed.** `app.py` reads
`GEMINI_API_KEY` from the environment and interpolates it into an `INDEX_TEMPLATE` HTML string
served to the browser:

```python
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
PORT = int(os.environ.get('PORT', 5011))
INDEX_TEMPLATE = """ ... """   # "injects the API key and serves the React app"
```

It also defaults to **port 5011**, the port HiC now occupies. Nothing starts it, so it is not an
active exposure, but it is a working example of the exact pattern 10.6 says never to reintroduce,
sitting in the repo under a name a successor could mistake for current. Delete or archive it.

---

## 3. Humans-in-Control Research (HiC): the core

265,723 lines. React 18.3 + TypeScript 5.8 + Vite 6 + Tailwind 3.4 SPA, with a FastAPI proxy.

### 3.1 Flat layout, no `src/`

Deliberate. Vite's default resolve is `./` and the `@` alias points at `.`
(`vite.config.ts:125-127`; the service CLAUDE.md cites line 70, which is now the `/config.json` dev
handler).

| Area | Size |
|---|---:|
| `App.tsx` | 8,177 lines (root state machine) |
| `types.ts` | 1,101 lines |
| `services/` | 480 files, 141,932 lines |
| `components/` | 37,543 lines in the top 20 |
| `proxy/` | 48,238 lines, of which `app.py` is 28,459 |

### 3.2 The ten largest services, and what each owns

| Module | Lines | Responsibility |
|---|---:|---|
| `services/geminiService.ts` | 7,755 | primary generation engine, `GenAISession` stateful chat, per-deliverable prompts |
| `services/corpusChatService.ts` | 6,661 | the Analyst Desk chat brain and hashtag dispatch |
| `services/slideToStageHtml.ts` | 3,671 | the 1920x1080 `#stage` HTML twin (the PPTX export surface) |
| `services/wikiService.ts` | 3,438 | wiki read/write, `loadGenerationContext()`, `detectBannedPhrases()`, `scoreOutput()` |
| `services/slideComposer.ts` | 3,297 | the `slides:` deck-archetype registry (29 archetypes, geometry specs) |
| `services/slidePostProcessor.ts` | 2,961 | runtime output sanitization, the defense-in-depth layer |
| `services/researchFabricOrchestrator.ts` | 2,478 | multi-source aggregation, chunking, the `[CHUNK_XXX]` id scheme |
| `services/prototypeBuilder.ts` | 2,291 | the `#proto` five-stage build pipeline |
| `services/chunkRetrieval.ts` | 1,813 | manifest-driven retrieval, the anti-RAG contract |
| `services/narrativeComposer.ts` | 1,532 | `PresentationPayload` for the external renderer |

Largest component: `components/CorpusChatPanel.tsx` at 10,220 lines. If you have to change chat
behavior, expect to work there and in `corpusChatService.ts` together.

### 3.3 The proxy (`proxy/app.py`, 28,459 lines, 223 routes)

Route families by count: `wiki` 25, `sessions` 14, `epochs` 14, `ai` 13, `eval` 12, `manifest` 8,
`artifacts` 7, `memory` 6, `artifact` 6, `prototypes` 5, `journey-map` 5, `cx` 5, `skill` 4,
`retention` 4, `presentations` 4, `feedback` 4, `air` 4.

AI routes: `/api/ai/anthropic`, `/api/ai/gemini`, `/api/ai/gemini-compat`, `/api/ai/openai`,
`/api/ai/deepseek`, `/api/ai/generate`, `/api/ai/diagram`, `/api/ai/illustration`,
`/api/ai/illustrations`, `/api/ai/brand-image`, `/api/ai/image-screen`, `/api/ai/cache-stats`,
`/api/ai/status`.

Supporting proxy modules:

| Module | Lines | Purpose |
|---|---:|---|
| `topic_modeling.py` | 1,830 | UMAP + HDBSCAN + c-TF-IDF clustering with LLM labeling |
| `creative_ai_sources.py` | 1,607 | 200-source creative/AI pack |
| `nxt_diagram_render.py` | 1,339 | native GOLD exhibit renderer (HTML/CSS to Chromium PNG) |
| `wiki_chunker.py` | 1,216 | chunking and frontmatter upsert for the manifest |
| `gold_pptx_export.py` | 1,185 | HTML stage to native editable PPTX |
| `prd_xlsx.py` | 1,138 | `#prd` workbook export |
| `proto_partials.py` | 928 | prototype partial rendering |
| `pptx_export.py` | 902 | legacy PPTX path |
| `nxt_slide_export.py` | 783 | slide export helpers |
| `memory_store.py` | 578 | the shared fact store (Python twin of `memoryLifecycle.ts`) |
| `nxt_design_system.py` | 528 | token serving |
| `wiki_vector_store.py` | 462 | embedding index over wiki articles |
| `evidence_hygiene.py` | 439 | evidence checks |
| `brain_growth.py` | 395 | scheduled second-brain growth |
| `rate_limit_pacer.py` | 385 | per-provider token buckets |
| `skillopt_trajectory_miner.py` | 376 | rollout mining for skill training |
| `artifact_visual_qa.py` | 323 | rendered-artifact QA |
| `model_registry.py` | 233 | the proxy half of the model contract |

### 3.4 Data sources

`SOURCES` in `proxy/app.py:499` is a 1,749-line literal with **1,277 source ids** across **9
connector types**:

| Connector type | Count |
|---|---:|
| `static_url` | 517 |
| `rss` | 506 |
| `web_search` | 199 |
| `rest` | 38 |
| `ckan` | 7 |
| `socrata` | 6 |
| `invidious` | 2 |
| `jina` | 1 |
| `gdelt` | 1 |

Four additional industry packs are merged in at import time, each ~250 sources:
`creative_ai_sources.py` (200), `travel_tourism_sources.py` (264), `social_clubs_sources.py` (260),
`energy_sources.py` (254), plus healthcare, insurance and agriculture blocks defined inline around
`proxy/app.py:2261-2316`. Adding a source is a dict entry, not a code change. Most news sites have a
WAF, so a browser-compatible User-Agent is mandatory.

### 3.5 The nine-phase vision, stated plainly

The repo's governing idea, encoded in `.claude/UNIFIED_VISION.md` and the `hic-unified-vision`
skill: HiC is an **objective-first, manifest-native, evidence-cited, design-system-governed Artifact
Factory**. Each run emits a durable **Artifact Intermediate Representation (AIR)**, not just a
prompt result. Eight principles bind at nine workflow phases: objective-driven relevance; collect
from all packs plus uploads plus the cached brain; chunk with per-type provenance; a manifest that
is a concept graph; anti-RAG objective-and-manifest-first retrieval; one routing authority; gated
self-improvement; componentized tokenized design; native editable PPTX from every path.

Treat that as the design intent and this document as the implementation record. They mostly agree.

---

## 4. AI model architecture

### 4.1 One routing authority

`services/aiRouter.ts` (1,042 lines) is the single source of truth. The convergence of 2026-06-30
deleted the parallel routing maps that used to live in `corpusChatService.ts`. There is no second
routing brain in HiC.

The Claude model id and request contract live in exactly one dependency-free module,
`services/claudeModelPolicy.ts`, re-exported from `aiRouter.ts`:

```ts
export const CLAUDE_REASONING_MODEL = 'claude-opus-5-5';   // line 29
export const CLAUDE_REASONING_LABEL = 'Claude Opus 5.5';   // line 31
export const CLAUDE_STRUCTURED_MODEL = 'claude-sonnet-5-5'; // line 35
```

`services/modelIdLiterals.test.ts` fails the build if any call site hardcodes a Claude id.

### 4.2 `MODEL_REGISTRY` (`aiRouter.ts:389`)

| Model | Provider | Vision | Max context | Max output | Cost tier |
|---|---|---|---:|---:|---|
| `claude-opus-5-5` | anthropic | yes | 1,000,000 | 128,000 | premium |
| `claude-sonnet-5-5` | anthropic | yes | 1,000,000 | 128,000 | premium |
| `claude-sonnet-4-6` | anthropic | yes | 200,000 | 64,000 | premium |
| `claude-opus-4-8` | anthropic | yes | 1,000,000 | 64,000 | premium (sunset, back-compat only) |
| `gemini-3.1-pro-preview` | google | yes | 1,000,000 | 65,536 | premium |
| `gemini-3.5-flash` | google | yes | 1,000,000 | 65,536 | budget |
| `gemini-2.5-flash` | google | yes | 1,048,576 | 65,536 | budget (sunset) |
| `gpt-5.5` | openai | yes | 1,200,000 | 128,000 | premium |
| `gpt-5.4` | openai | yes | 1,050,000 | 128,000 | standard |
| `gpt-5.4-mini` | openai | yes | 400,000 | 128,000 | budget |
| `deepseek-v4-flash` | deepseek | no | 256,000 | 8,192 | standard |
| `deepseek-v4-pro` | deepseek | no | 256,000 | 8,192 | premium |

Image generation uses `gemini-3.1-flash-image-preview`.

### 4.3 `DEFAULT_MODELS` by task category (`aiRouter.ts:783`)

```ts
research:              CLAUDE_REASONING_MODEL     // claude-opus-5-5
fast_generation:       'gemini-3.5-flash'
vision:                'gemini-3.5-flash'
image:                 'gemini-3.1-flash-image-preview'
video:                 'gemini-3.1-flash-image-preview'
narrative_composition: CLAUDE_REASONING_MODEL
fast_agentic:          'gemini-3.5-flash'
```

These feed non-deliverable agentic tasks. Deliverable routing is the force-route below, not a
category default.

### 4.4 Artifact routing: `artifactModelFor` and `chooseArtifactModel`

Every artifact hashtag resolves through `aiRouter.artifactModelFor(kind)`, which delegates to
`chooseArtifactModel(kind).selectedModel`. Two tiers:

**Schema tier to `gemini-3.5-flash`** (`SCHEMA_FLASH_ARTIFACTS`): template ids `gap-matrix`,
`journey-map`, `service-blueprint`, `competitive-matrix`, `org-chart`, `systems-inventory`,
`architecture-map`, `timeline`; hashtag aliases `gap`, `journey`, `blueprint`, `competitive`,
`compete`, `org`, `audit`, `arch`, `tech-arch`, `roadmap`; plus `theme-breadth`.

Bake-off evidence: Flash matched Gemini 3.1 Pro on completeness with zero fabricated citations at
roughly 18x lower cost (`plans/model-bakeoff-gap-journey-2026-06-28.md`,
`plans/model-bakeoff-broadened-2026-06-28.md`). The theme-breadth entry came from a later bake-off
(2026-10-01): Flash quality 0.957 at about $0.005/shard against the reasoning model's 1.0 at
$0.144/shard.

**Everything else to `claude-opus-5-5`**: case-study, personas, themes, strategy, recommendations,
report, prd, bare `#slides`, and the `#proto` build path.

`chooseArtifactModel` is not a switch statement; it is a scoring engine. It weighs bake-off eval
quality, live provider quota and health (`multiModelResilience.isProviderHealthy`), and relative
cost, and returns `{selectedModel, reason, alternatives, evalBasis}`. The seeded
`ARTIFACT_EVAL_REGISTRY` holds class defaults (`_schema`, `_evidence`) plus per-deliverable
overrides. Known seat: Flash scores 0.3 on `personas` because a bake-off measured it failing 1 of 3
runs with truncation.

**The registry is refreshed from measurement.** `applyModelMatrix()` reads `evals/model-matrix.json`
via `/api/eval/matrix` and replaces each model's quality for a deliverable class with its measured
pass rate on that class's cases. Hand-entered seats are the cold-start default and are overwritten
by measurement, never the other way round.

### 4.5 The one reversible quota flag

```ts
export const OPUS_CAP_ACTIVE = false;   // aiRouter.ts:547
```

While `true`, no generation path may route to Claude; every site that would pick Opus falls to
`gemini-3.1-pro-preview`, and `prototypeBuilder.CODE_MODEL` follows. This consolidates a workaround
that used to live in three places. If an Anthropic cap returns, flip this one flag and touch nothing
else.

### 4.6 The Claude 5.x request contract (this is where 400s come from)

Every Claude 4.6+ model, Opus 5.5 included, **rejects** the following with HTTP 400:

- `temperature`, `top_p`, `top_k` at non-default values
- a thinking budget (`budget_tokens`) or `thinking: {type: "disabled"}`
- forced `tool_choice` (`any` / `tool` / `required`); only `auto` is accepted
- assistant-message prefill (a trailing assistant turn)

Thinking is **always on**, adaptive only. Depth is `output_config.effort`, one of
`low | medium | high | xhigh | max`, set per deliverable by
`claudeModelPolicy.effortForArtifact(kind)`:

- `xhigh`: PRD, strategy, recommendations, report, `#proto`
- `high`: every other evidence-tier artifact, and the critic revisor (the default)
- `medium`: theme shards, schema tiers
- `low`: utility calls

Enforcement is doubled. `applyAnthropicRequestDefaults` normalizes every body in
`aiRetryClient`; the proxy repeats it at the `/api/ai/anthropic` chokepoint
(`model_registry.normalize_claude_body`). The proxy also streams upstream above 16K `max_tokens`
and aggregates, sends `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) so classifier
refusals re-run server side, and sets `thinking.block_binding.prefix_mismatch_behavior: drop_block`
(beta `thinking-binding-controls-2026-08-01`) so an edited history degrades instead of 400ing.
`callClaude` echoes each assistant turn's returned content blocks, thinking included, back unchanged
on the same model (preserved thinking).

Env knobs: `ANTHROPIC_STREAM_THRESHOLD`, `ANTHROPIC_SERVER_FALLBACKS`,
`ANTHROPIC_THINKING_BINDING_DROP`.

### 4.7 Vendor-drift guard (`proxy/model_registry.py`)

Mirrors the TS registry with a lifecycle status per model: `active`, `sunset` (with a `successor`),
`banned`. A request for a retired or unknown model raises a startup alarm and a RunReceipt
degradation instead of surfacing as an opaque provider 400 mid-run. Current non-active entries:

- `claude-fable-5`: **banned**, successor `claude-opus-5-5`
- `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`: **sunset**, successor `claude-opus-5-5`
- `gemini-2.5-flash`: **sunset**, successor `gemini-3.5-flash`

### 4.8 Model seats (`routing_seats()`)

Served at `/api/models` so no service hardcodes an id:

```python
reasoning:        "claude-opus-5-5"
structured:       "claude-sonnet-5-5"
chat:             "gemini-3.5-flash"
agent_chat:       "gemini-3.5-flash"
agent_tool_chain: "claude-opus-5-5"
```

`services/modelSeats.test.ts` pins these to the TS values so `/api/models` cannot drift from the
router.

### 4.9 Resilience layers

- `services/multiModelResilience.ts`: content-hash embedding cache, provider health tracker,
  per-corpus provider commitment, signature-keyed LLM cache.
- `services/deliverableModelRouter.ts` (health-aware, cross-provider fallback with per-model
  timeouts).
- `proxy/rate_limit_pacer.py`: per-provider token buckets so a 429 from one provider throttles only
  that provider.
- `services/aiOutputRepair.ts` behind `aiRouter.tryRepairJson`: a nine-rung repair ladder for
  truncated or malformed model JSON, including bracket balancing that removes stray mid-string
  closers (a real `#slides` failure), double-escaped Gemini streams, and `\r` stripping.
- Caches in the proxy: Gemini explicit context cache (`GEMINI_EXPLICIT_CACHE_ENABLED=1`, TTL 3600s,
  8,000-char minimum prefix), vision/upload-extraction cache (`VISION_CACHE_ENABLED=1`, 30-day TTL).

---

## 5. Agentic systems

Four distinct agent systems run here. They are not the same thing and they do not share code, only
doors.

### 5.1 The platform agent (`mcp-services/agent`)

Covered in 2.2. Chat on the Flash seat, tool-chain synthesis on the reasoning seat, thread registry,
shared memory, skill packages. It is the coordinator the Launchpad talks to.

### 5.2 Claude Code skills and hooks (`.claude/`)

This is the agent system that writes the code, and it is load-bearing at runtime too.

**90 skills** in `.claude/skills/`. The Vite dev server and the nginx container both serve them at
`/skills/`, and compose mounts them read-only into `hic-research` so editing a `SKILL.md` on the
host takes effect on the next chat request **with no image rebuild**. The proxy mounts the same
directory read-write at `/skills` so the learning engine can patch them.

Skill families: pipeline-stage owners (`deck-composer`, `persona-architect`, `strategy-author`,
`theme-analyst`, `competitive-analyst`, `prd-compiler`, `roadmap-builder`, `gap-analysis-evaluator`,
`service-blueprint-mapper`, `org-chart`, `tech-arch-generator`, `tech-audit-inspector`,
`case-study-analyst`, `recommendation-architect`, `html-deliverable-composer`,
`strategic-report-writer`, `questionnaire-author`, `mind-map-architect`, `meta-themes`,
`brief-dialog`, `infographic-composer`, `explainer`); reasoning techniques (`verbalized-sampling`,
`reinforcement-inference`, `critic-revise-loop`, `pre-mortem`, `second-order-thinker`,
`analog-finder`, `contradiction-finder`, `stakeholder-lens-auditor`, `quantification-architect`);
retrieval (`manifest-chunk-retrieval`, `wiki-query-expander`, `wiki-reranker`, `wiki-synthesizer`,
`source-ranker`, `evidence-density-pre-checker`, `theme-yield-guarantee`,
`topic-cluster-to-theme-converter`); quality (`preflight`, `qa-gate`, `human-voice-editor`,
`score-prompt`, `stress-test`, `drift-check`, `constrain`, `lock-format`); operations
(`git-branch-protocol`, `hic-rebuild-verify`, `service-log-triage`, `rate-limit-pacer`,
`long-running-service-call`, `export-paint-sync`, `fallback-event-surfacing`,
`mcp-service-bootstrap`); self-improvement (`epoch-proposer`, `skillopt-validation-gate`,
`cross-engagement-pattern-miner`, `source-yield-scorer`); and `ask-hic`, the router over all of them.

**47 hook scripts** in `.claude/hooks/scripts/`, split by phase:

- *Precheck (PreToolUse)*: `precheck_commit_approval.py`, `precheck_main_branch.py`,
  `precheck_startup_mode.py`, `precheck_wiki_write.py`, `precheck_slop.py`,
  `precheck_orphan_export.py`, `precheck_axios_pin.py`, `precheck_no_node_require.py`.
- *Validators (Stop)*: 30+ `validate_*.py` covering citations (`validate_citations.py`,
  `validate_citation_resolution.py`, `validate_chunk_citations.py`,
  `validate_claim_grounding.py`, `validate_insight_provenance.py`), evidence
  (`validate_evidence.py`, `validate_evidence_recency.py`, `validate_evidence_tier_distribution.py`,
  `validate_source_diversity.py`, `validate_corpus_relevance_distribution.py`), output form
  (`validate_no_em_dashes.py`, `validate_no_emoji.py`, `validate_ai_slop.py`,
  `validate_titles.py`, `validate_text_hierarchy.py`, `validate_no_truncation.py`,
  `validate_self_referential_freeform.py`, `validate_freeform_structure.py`), pipeline integrity
  (`validate_manifest_chunk_parity.py`, `validate_theme_yield.py`,
  `validate_theme_reproducibility.py`, `validate_topic_model_completion.py`,
  `validate_no_silent_fallback.py`, `validate_cached_selection_honored.py`,
  `validate_slide_variety.py`, `validate_journey_overview_slide.py`), and
  `validate_quantification.py`, `validate_speculative_claims.py`,
  `validate_framework_page_exists.py`, `validate_ai_output_syntax.py`.
- *Injection and session*: `inject_active_constraints_and_patterns.py` (pushes learned constraints
  into generation prompts), `session_start_context.py`, `post_hic_rebuild_reminder.py`,
  `post_agent_restart_reminder.py`, `stop_chat_antislop.py`, `pre_export_dom_audit.py`.
- `dispatch_validators.py` is the fan-out; `_lib.py` the shared helpers.

**15 subagent definitions** in `.claude/agents/`, including `hic-output-qa`,
`evidence-quality-auditor`, `export-render-verifier`, `spa-smoke-tester`, `platform-health`,
`chunk-retrieval-strategist`, `schema-drift-auditor`, `orphan-code-auditor`, `wiki-curator`,
`quota-monitor`, `dissent-panel`, `pre-mortem-runner`, `skillopt-validation-gate`,
`skillopt-applier`, `parallel-deliverable-runner`.

### 5.3 The `#proto` pipeline (`services/prototypeBuilder.ts`, 2,291 lines)

A staged agent that builds a working React prototype from corpus evidence:

| Stage | Output | Notes |
|---|---|---|
| 1. Concept Decomposer | Experience Brief (JSON) | populates a PRD candidate from corpus evidence only; a thin corpus yields a thin PRD honestly |
| 2. Interaction Architect | Interaction Spec (JSON) | maps every feature to a screen; a Must-have that cannot be demonstrated keeps an `unmapped_reason` rather than being dropped |
| 2.5 Simulated Sessions | `SimulatedUserSession[]` | synthetic sessions the prototype must satisfy |
| 3. Visual Designer | Design System (JSON, brand-aware) | |
| 3.5 Catalog injection | STUDY-THESE block | named patterns from the AI Experience Patterns catalog |
| 4. Prototype Coder | single-file React component | |
| 5. Critic + Refiner | Critique JSON + corrected code | audits acceptance-criteria coverage and `success_assertions` |

Planning stages use `STAGE_MODEL = 'gemini-3.1-pro-preview'`; code stages route through the one
authority (cap-aware). The build path never uses GPT-5.5, which rejects non-default temperature.

Two hard rules enforced downstream: no verbatim corpus quote may appear in rendered prototype text
(a blocking failure at Stage 4), and every region must come from a named pattern in
`hic-workspace/wiki/inspiration-hub/ai-patterns/`. Skipping the catalog at Stage 3, 3.5 or 4 is a
known anti-pattern.

### 5.4 Critic and sampling machinery

- `services/criticReviseLoop.ts` (632 lines) plus `criticDispatcher.ts`: generator, critics emitting
  structured edits, revisor, stop when every critic accepts or the budget runs out.
- `services/reinforcementInference.ts`: `reinforceIfUncertain` re-asks the model **with its prior
  answer pinned in the prompt** plus an uncertainty hint, so it revises only the weak parts. Written
  because five regeneration sites in `geminiService.ts` used to discard the prior answer and re-ask
  from scratch, the exact anti-pattern the RI paper names.
- `services/verbalizedConfidence.ts` and the `verbalized-sampling` skill: ask for a verbalized
  probability distribution over k candidates instead of one answer, recovering the diversity lost to
  typicality bias. Applied at themes, recommendations, prototype concepts, personas, slide
  narrative.
- `services/artifactExpertPanel.ts` (749 lines) and `.claude/agents/dissent-panel.md`: five named
  adversarial critics in independent contexts so they do not collapse into one voice.

---

## 6. The second brain

### 6.1 Three concentric layers

1. **`hic-workspace/sources/`**: raw, immutable source documents (client uploads, research files).
2. **`hic-workspace/wiki/`**: the LLM-maintained markdown knowledge base.
3. **`hic-workspace/AGENTS.md`**: the schema, which co-evolves with the wiki. Read it before any
   wiki operation; it defines page types, frontmatter, ingest/generate/lint operations and the
   quality rubric.

### 6.2 Wiki inventory, measured 2026-11-10

**23,838 markdown files.**

| Directory | Files | What it holds |
|---|---:|---|
| `articles/` | 13,238 | ingested external research, embedding-indexed |
| `social-intelligence/` | 9,340 | social posts and derived intelligence |
| `uploads/` | 637 | parsed client documents |
| `synthesis/` | 296 | cross-run synthesis, learned constraints, logs |
| `sources/` | 102 | per-source summaries |
| `engagements/` | 52 | one page per engagement |
| `transcripts/` | 24 | interview and video transcripts |
| `design-system/` | 23 | token and component documentation |
| `industries/` | 23 | industry taxonomies |
| `brand/` | 22 | brand standards, `figma-node-map.md` component registry |
| `known-gaps/` | 17 | auto-generated failure-family pages |
| `anti-patterns/` | 14 | per-deliverable failure modes |
| `frameworks/` | 13 | per-deliverable framework pages |
| `prototypes/` | 9 | prototype records |
| `evidence/` | 9 | evidence pages |
| `benchmarks/` | 6 | benchmark pages |
| `deep-research/`, `exemplars/`, `methodologies/`, `sources-registry/`, `mentors/` | 1 to 3 each | |

Empty but wired: `chunk-maps/`, `eval/`, `feedback/`, `inspiration-hub/`, `presentations/`,
`user-selections/`.

Serving: dev through a Vite middleware plugin (`vite.config.ts:12-45`), production through a
read-only compose mount at `/usr/share/nginx/html/hic-workspace`. As of the 2026-10-30 hardening the
wiki is **not** baked into the image, because it holds client uploads and derived client synthesis;
`nginx.conf` refuses the sensitive paths. Writes from the container go through `/api/wiki/write*` on
the proxy, which has the directory mounted read-write.

### 6.3 Anti-RAG: manifest-chunk retrieval

`services/chunkRetrieval.ts` (1,813 lines) replaces four named anti-patterns:

1. bulk-injecting full article bodies into prompts,
2. sampling top-N by relevance and silently dropping the rest,
3. generators reading in-memory state instead of the wiki,
4. generated insights living only in transient JSON.

The contract: the wiki is addressable memory; the **manifest** declares which chunks are in an
engagement's corpus; the service pre-ranks chunks against the prompt by their declared `key_terms`
(CPU-only, deterministic, no LLM call), resolves the selected subset through wiki page frontmatter,
and hands the generator a prompt-ready corpus block. Every emitted insight is written back as a wiki
chunk, so the manifest grows from generation as well as ingestion. That write-back is the actual
feedback loop.

Composes with `services/wikiPointerResolver.ts`, `services/citationPointerRegistry.ts` (registers
each chunk's REAL source so cite-time resolution uses the chunk's attribution, not the page title),
`proxy/wiki_chunker.py`, and the `validate_chunk_citations.py` / `validate_insight_provenance.py`
Stop hooks.

Semantic retrieval exists alongside it: `POST /api/wiki/fetch-articles` returns embedding-ranked
article bodies (`proxy/wiki_vector_store.py`). For broad questions fire 3 to 4 angle variants
(`wiki-query-expander`); for narrow ones cross-encode the candidate set (`wiki-reranker`).

Untrusted-content framing is explicit: `services/untrustedFraming.ts` exports `UNTRUSTED_TAG` and
`defuseFrameTags`, applied at the chunk-assembly chokepoint.

### 6.4 Sessions and runs

`hic-workspace/sessions/<engagement-slug>/runs/<run-id>/`. 49 sessions on disk, 62 `state.json`
files. Per-run artifacts observed:

`state.json`, `corpus.json`, `manifest.json`, `chat.json`, `knowledge_graph.json`,
`topic_model.json`, `metadata.json`, `reddit_deep.json`, `usage.jsonl`,
`research_plan_sub_questions.json`, `MERGED_INTO.txt` (session merge pointer), and per-call step
results named `<stage>-<seq>-<model-id>.json`, for example
`themes-s1-shard-000002-claude-opus-4-8.json` and
`ingestcontext-000001-gemini-3-1-pro-preview.json`. **The model id is in the filename**, so you can
audit which model produced which stage of any past run by listing a directory.

`hic-workspace/artifacts/` holds 128 saved artifacts, one JSON per deliverable, slug-named from the
artifact title.

### 6.5 The shared memory door

`proxy/memory_store.py` (578 lines) is a faithful Python port of the pure functions in
`services/memoryLifecycle.ts` (754 lines) and `services/memoryRetrieval.ts`. Before it existed, the
fact store (`wiki/synthesis/memory-facts.json`) was reachable only through the SPA, so three of the
four agents could neither read nor write it.

Every agent now admits and recalls through `/api/memory/*`: the SPA, the platform agent, research-mcp
(and through it Claude Code sessions), the Claude Code hook, and NXT-Agency.

Lifecycle, with the default config:

| Knob | Default |
|---|---|
| `maxFacts` | 100 |
| `factConfidenceThreshold` | 0.7 |
| `stalenessAgeDays` | 90 |
| `stalenessMinCandidates` | 3 |
| `stalenessMaxRemovalsPerCycle` | 10 |
| `stalenessProtectedCategories` | `["correction"]` |
| `consolidationMinFacts` | 8 |
| `consolidationMaxGroupsPerCycle` | 3 |
| `evictionPolicy` | `confidence` (hybrid shadow enabled) |
| eviction weights | confidence 0.65, confirmation 0.25, access 0.10 |
| eviction half-lives | confirmation 90 days, access 30 days |
| `evictionCorrectionReservedFraction` | 0.10 |

Categories: `preference`, `knowledge`, `context`, `behavior`, `goal`, `correction`.

Pipeline functions: `admit_facts` (gate), `merge_facts`, `select_stale_candidates` /
`apply_staleness_decisions`, `select_consolidation_groups` / `apply_consolidation`,
`detect_reinforcement` / `apply_reinforcement` (deterministic, from user messages),
`hybrid_score` / `evict_to_capacity`, and `run_lifecycle_pass` as the driver. Retrieval side:
`salient_terms`, `select_memory_facts(objective, max_n=8, min_relevance=0.2)`,
`render_facts_for_injection(max_chars=2400)`.

IO is the only impure part: a cross-process `StoreLock` (the proxy runs several uvicorn workers) and
atomic per-pid temp writes, so two workers admitting simultaneously cannot lose a fact.

**Parity is pinned**: `evals/fixtures/memory-parity.json` holds expected outputs that both
`services/memoryParity.test.ts` and `proxy/tests/test_memory_store.py` assert against. The
TypeScript is the reference; change it first, then the port, then the fixture.

### 6.6 Scheduled brain growth (`proxy/brain_growth.py`, 395 lines)

Three deterministic steps, run by the proxy's daily pass and on demand via `POST /api/brain/grow`:

1. **Known gaps from the eval lane.** Every artifact that failed its post-generation chain became a
   frontier eval case. Each case is read together with the AIR it points at and its failures are
   reduced to FAMILIES. A family seen in two or more cases (`MIN_CASES_FOR_GAP = 2`) gets a page
   `known-gaps/failure-<family>.md` with one `## <date> | <engagement>` block per occurrence. Pages
   are regenerated whole, so reruns never duplicate blocks. Families include `UNSOURCED_FACT`,
   `UNRESOLVED_SOURCE`, `UNVERIFIED_QUOTE`, `DATE_SCOPE_MISMATCH`.
2. **Engagement frontmatter backfill.** The wiki compiler groups engagement pages by
   `engagement_type` and `industry` and compiles a cross-engagement pattern once five share a group
   (`MIN_ENGAGEMENTS_FOR_PATTERN = 5`). `saveEngagementMemory` wrote neither key, so no group ever
   formed; this step backfills both.
3. **Pattern-due report.** Groups at threshold whose pattern page is missing or stale are reported
   as due; the SPA's incremental compile (`wikiCompiler.ts`) writes the pattern on its next run.
   `mentors/` is never written here; it grows only through the gated skill path.

---

## 7. Semantic, sentiment and thematic clustering

Two independent clustering stacks exist. Know which one you are in.

### 7.1 HiC proxy: `proxy/topic_modeling.py` (1,830 lines)

**No PyTorch, no sentence-transformers in this path.** It piggybacks on embeddings generated
elsewhere.

Pipeline: embed documents, UMAP dimensionality reduction, HDBSCAN clustering, c-TF-IDF
representative terms per cluster, then an LLM call to label each cluster with a topic name, a
one-sentence summary and sentiment.

Embedding providers, in order of fallback: OpenAI `text-embedding-3-small` (1536-d), then Gemini
`gemini-embedding-001` (3072-d, singular `embedContent` fired concurrently, because
`batchEmbedContents` only works on `text-embedding-004`). Dimension mismatch is irrelevant since
clustering is rotation-invariant. The platform default is `EMBED_PROVIDER=local`, the
sentence-transformer served by social-research-backend, so retrieval never starves on a quota error.

Two UMAP projections are computed for different purposes (`_reduce_and_cluster`):

```python
cluster_n_neighbors = max(2, min(10, max(5, n // 25)))   # small: preserves LOCAL structure
plot_n_neighbors    = max(2, min(15, n - 1))             # larger: better 2D visualization
reducer = umap.UMAP(..., metric="cosine", random_state=42)
clusterer = hdbscan.HDBSCAN(min_cluster_size=5, cluster_selection_method='leaf', ...)
```

`random_state=42` everywhere: determinism is a requirement, not an accident.
`cluster_selection_method='leaf'` splits the HDBSCAN tree at leaves because the default `eom` was
collapsing 218 posts into too few topics. An outlier-reduction pass assigns HDBSCAN noise documents
(label -1) to their nearest cluster by original-space distance, a concept ported from BERTopic's
`reduce_outliers`.

Three resilience layers were added 2026-05-24, each with named functions:

- **Provider health**: `_provider_is_healthy()`, `_record_provider_429()`,
  `_record_provider_success()`. A provider that 429s is skipped for a cooldown window rather than
  hammered.
- **Content-hash embedding cache**: `_hash_content(text, provider)`,
  `_load_cached_embedding()`, `_save_cached_embedding()`. Disk-backed, survives proxy restarts. The
  largest single cost and reliability win on this path.
- **Cluster-signature name cache**: `_cluster_signature(top_terms, sample_titles, research_goal)`,
  `_load_cached_name()`, `_save_cached_name()`. Gives deterministic naming even when the labeling
  provider is stochastic beyond temperature 0.

Embedding dispatch is `embed_documents()` over `_embed_via_openai()` (batch 32),
`_embed_via_gemini()` and `_embed_via_local()`.

CPU-bound UMAP and HDBSCAN run via numba and hold the GIL, so `_run_cpu()` offloads them to a thread
to keep the async proxy responsive.

#### Representative terms, and the coherence gate

`_ctfidf_top_terms()` builds class-based TF-IDF with sklearn's `CountVectorizer` plus
`TfidfTransformer`: documents are pooled per cluster, so the terms that score highest are the ones
distinctive to that cluster rather than to the corpus.

`_is_cluster_coherent(top_terms)` is a deliberately cheap check: the top three terms must not be
stopword pollution, and must clear a minimum length. The code states why it is cheap. Semantically
related terms that are not orthographically similar ("advisor", "coaching", "student") would fail a
bigram-overlap test despite being coherent, so that approach is avoided; real embedding similarity
would be accurate but costs a network call per cluster, and stopword filtering alone catches the
noise actually observed in BERTopic output.

#### Sentiment: two models, with a documented correction

Sentiment is not a single call. `_vader_compound(text)` uses VADER on the first 2,000 characters.
`_roberta_compounds(texts)` batch-scores through the social-research backend at
`SENTIMENT_ROBERTA_URL` (default
`http://social-research-backend:8081/api/sentiment/score`), which runs CardiffNLP
`twitter-roberta-base-sentiment`.

**RoBERTa is primary and VADER is the fallback, because VADER was measurably wrong here.** The
comment at line 849 records the failure: VADER is a lexicon tool that reads encouraging words
("great", "good luck") as positive even in posts describing struggles, so a cluster named "Negative
Internship Experiences" came out positive. A 300-second client timeout covers the model cold start
of about 18 seconds plus a batched score of several hundred texts, and `_ROBERTA_OK` flips to False
for the rest of the run after one failure so the pipeline does not retry-storm.

Cluster sentiment is **weighted, not averaged**:

- `_engagement_weight(score)` is log-scaled: `1.0 + log10(1 + score)` for positive scores, and
  **0.5 for downvoted or zero-score units**, so unpopular posts count less without vanishing.
- `_OP_POOL_WEIGHT = 0.70`, because "the OP defines what the topic is ABOUT; comments are
  reactions".
- `_pool_stats(units)` computes weighted positive, negative and mean over
  `(compound, weight, author)` units; `_weighted_cluster_sentiment()` and
  `_apply_weighted_sentiment(topics, items)` apply it per cluster.

#### Two pipelines: `run_pipeline` and `run_pipeline_v2`

`run_pipeline()` (line 1076) is the original. `run_pipeline_v2()` (line 1595) adds:

- `_source_stratified_cluster()`, which clusters within source strata so one loud source cannot
  dominate.
- `_infer_source_type(item)` and `_distinct_sources_in_cluster()` for provenance tagging.
- `_apply_quality_gates()`, which runs **before** LLM naming, so noise clusters never cost a model
  call.

**The quality gate has exactly one drop criterion, and the removed one is instructive.** Coherence
drops stopword-polluted clusters. Source diversity was removed as a drop criterion on 2026-06-03;
the comment explains that the old "two or more distinct sources or DROP" rule "discriminated against
exactly the data the user chose, collapsing 16 clusters to 7". A topic drawn from a single subreddit
can carry real insight. Source diversity is now recorded as a neutral tag (`single_source`,
`convergent_evidence`, `source_types`, `distinct_source_count`), never as a reason to hide a cluster.

That is the general pattern in this codebase: when a gate fought the user's explicit selection, the
gate was demoted to a tag rather than the selection being overridden.

`_reduce_outliers(labels, arr, threshold=0.45)` assigns HDBSCAN noise documents to their nearest
cluster by original-space distance, a concept ported from BERTopic's `reduce_outliers`.

### 7.2 Theme generation in HiC

`topic-cluster-to-theme-converter` is the primary theme generator: deterministic topic clustering
(fixed UMAP seed, auto-scaled HDBSCAN) finds 15 to 25 clusters, and the model names each from top
terms and example documents. **Theme count comes from the data, not from policy**
(`theme-yield-guarantee`): citation, source and evidence gates run at naming time with no relaxation
tiers. `deterministic-naming-pass` adds a signature-keyed response cache plus frozen inputs so the
same cached corpus and goal yield the same names.

Theme breadth is sharded by `GenAISession._runBreadthShard` in `services/geminiService.ts:2536`,
which calls `artifactModelFor('theme-breadth')` (line 2547) and tags the body
`_hicKind: 'theme-breadth'` so `aiRetryClient` sends the matching effort. Shards run in parallel
(line 2746). Per the 2026-10-01 bake-off the shards route to `gemini-3.5-flash`, while theme depth,
synthesis and the `#themes` chat artifact stay on the reasoning model.
`services/deliverableChunkers.ts` (1,147 lines) owns the per-deliverable chunk budgets that feed
this.

### 7.3 Social Research: the classical NLP stack

`internal-solutions-socialresearch/backend`. Declared in `requirements.txt`: `bertopic~=0.15.0`,
`hdbscan==0.8.38.post1`, `scikit-learn~=1.2.2`, `transformers~=4.34.0`, `vaderSentiment~=3.3.2`,
`nltk~=3.8.1`, `praw~=7.8.1`, `numpy>=1.24,<2.0` (NumPy 2 is NOT supported).

**Sentiment and filtering models (real HuggingFace checkpoints):**

| Stage | Model | File |
|---|---|---|
| Sentiment filter | `cardiffnlp/twitter-roberta-base-sentiment` | `util/text_processing/filtering_roberta.py` |
| Aspect-based sentiment | `yangheng/deberta-v3-base-absa-v1.1` (NEG / NEU / POS) | `util/text_processing/filtering_ABSA.py` |
| Cluster filtering | `all-mpnet-base-v2` | `util/text_processing/filtering_cluster.py` |
| Point merging | `all-mpnet-base-v2` | `util/text_processing/merge_sbert.py` |
| Topic embeddings | `all-mpnet-base-v2` | `util/topic_model/BertTopic.py` |
| pgvector index | same as BERTopic | `util/llm_models/pgvector/pgvector.py` |

The RoBERTa pipeline uses `truncation=True, max_length=512` plus a hard tokenizer truncation, added
2026-06-03 after an over-length post caused a tensor-size crash on the topic-modeling page.

**BERTopic hyperparameters are tiered by corpus size** (`util/topic_model/BertTopic.py:915+`), with
five `BERTopic(...)` constructions. Two measured tiers:

- `num_documents < 10`: `UMAP(n_neighbors=min(3, n-1), n_components=2, min_dist=0.1,
  metric='cosine', n_epochs=200, random_state=42)`; `HDBSCAN(min_cluster_size=min(2, n),
  min_samples=1, cluster_selection_method='eom', prediction_data=True)`;
  `BERTopic(min_topic_size=min(2, n), n_gram_range=(1,3), top_n_words=10, nr_topics="auto")`.
- `num_documents < 100`: `UMAP(n_neighbors=3, n_components=3, min_dist=0.15, n_epochs=300)`;
  `HDBSCAN(min_cluster_size=3, min_samples=1, alpha=1.0)`; `BERTopic(min_topic_size=3)`.

Stopwords are the union of NLTK, scikit-learn `ENGLISH_STOP_WORDS` and a custom list.
`random_state=42` throughout.

**The analysis job** (`app/routes/api_llm_analyzer.py`, progress percentages are the real ones):

```
 1%  search Reddit posts (PRAW)
 5%  process and filter data
10%  process Reddit data (TextProcessor)
15%  RoBERTa sentiment filtering          -> 3.roberta_filtered.json
20%  ABSA or cluster filtering
25%  chunk data for analysis
30%  per-chunk LLM analysis via ThreadPoolExecutor
85%  merge analysis results (DeepSeek or SBERT point merger)
95%  save to Postgres
98%  generate AI summary
```

Each stage writes a numbered JSON to `SENTIMENT_LOG_DIR`, so you can diff a failing run stage by
stage.

**Merge strategies.** The 85% merge step has two implementations and the choice is a request
parameter (`merge_method`):

- `util/text_processing/merge_sbert.py`: `PointMerger(similarity_threshold=0.6)` embeds points with
  `all-mpnet-base-v2`, builds a `cosine_similarity` matrix, and greedily merges any pair at or above
  the threshold, tracking `used_indices` so a point merges once.
- `util/text_processing/merge_ds.py`: `merge_similar_points(chunk_results, merge_prompt)`, the
  LLM-based merge. **This path calls the DeepSeek stub and therefore returns empty strings.**

**Vector store.** pgvector 0.5.1 on `ankane/pgvector:v0.5.1`, database `app`, credentials
`postgres`/`postgres`. The schema is a single table created by `create_pgvector_tables()`:

```sql
CREATE TABLE IF NOT EXISTS reddit_embeddings (
    ...,
    embedding vector(768)
)
```

**768 dimensions, because `SENTENCE_TRANSFORMER_MODEL = "all-mpnet-base-v2"`** is the same encoder
BERTopic uses, so topic space and retrieval space agree. Changing the encoder means migrating the
column. `get_sentence_transformer()` passes `device=get_torch_device()` (`util/device.py`), so it
uses GPU when present and CPU otherwise; the image installs CPU-only torch deliberately.

Call path: `index_data_in_pgvector(subreddit, reddit_data, log_dir)` wraps
`store_reddit_data_in_pgvector()`; `query_pgvector(subreddit, query, top_k=25)` retrieves and
`get_rag_response(subreddit, prompt, top_k=15)` composes the answer. Retrieval is partitioned by
subreddit, so cross-community questions need multiple queries.

**LLM seat**: `util/llm_models/claude.py` pins `DEFAULT_CLAUDE_MODEL = "claude-opus-5-5"` with a
fallback chain `("claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5")`,
overridable by `SOCIAL_RESEARCH_CLAUDE_MODEL`. It deliberately does **not** read the legacy
`CLAUDE4_MODEL` variable, because the workbench root `.env` pins that to a retired snapshot that
404s. `gemini.py` still uses `gemini-2.5-pro` and `openai.py` defaults to `o3` with a `gpt-4o`
fallback; both are off the platform's canonical model list (Section 11.2).

**`deepseek.py` is a silent stub**, and this matters:

```python
def get_single_deepseek_completion(*args, **kwargs):
    return ""

def get_json_deepseek_completion(*args, **kwargs):
    return ""
```

`api_llm_analyzer.py` imports both at module top and uses them on the merge path. Any analysis
configured to merge through DeepSeek gets empty strings with no error, which reads downstream as an
empty or failed run rather than a misconfiguration. If you are debugging a Social Research run that
completes with nothing in it, check which merge method was selected before anything else.

### 7.4 Knowledge graph and mind maps

`services/knowledgeGraphBuilder.ts` (864 lines) builds the citation graph;
`components/AnalystDeskKnowledgeGraph.tsx` (2,533 lines) and `ResearchKnowledgeGraph.tsx` render it.
`mind-map-architect` turns topic clusters plus the research goal into a nested map, at most four
levels deep and seven children per node, each node carrying chunk references for click-to-chat
drill-down. `_umap_plot_2d` in `topic_modeling.py` supplies the 2D coordinates.

---

## 8. The artifact generation pipeline

### 8.1 The catalog is the authority

`services/artifactCatalog.ts` enumerates **39 artifact entries**, written first by design so no
hashtag is silently omitted. Each entry declares:

```ts
id, aliases[], templateId, ownerSkill, tier, modality, editability,
routingClass, imageBearing, airKind?, designDeskKind?
```

- `tier`: `schema` | `evidence` | `narrative` | `imagery` | `collection` | `code`
- `modality`: `slides` | `html` | `figma_spec` | `image` | `analysis` | `external_render` | `multi`
- `editability`: `native_pptx` | `html_document` | `spa_only` | `external_renderer`
- `routingClass`: `schema_flash` | `evidence_pro` | `code` | `collection` | `external`

**The catalog generates five vocabularies that used to drift as hand-kept copies**: the directive to
owning-skill map, the alias to canonical-hashtag map, the modifier set, the slide-template rules,
and the Design Desk content vocabulary. Two coverage tests
(`artifactCatalog.coverage.test.ts`, `artifactCatalogCoverage.test.ts`) fail the build if a
directive is added anywhere without a catalog entry.

**It never holds a model id.** It owns the contract; `aiRouter` owns the model.

`services/hashtagRegistry.ts` (1,076 lines) is the human-copy layer over it: **47 directives** with
names, summaries, descriptions and examples, feeding autocomplete, `#help` and the suggested-prompt
chips. Brand copy is derived from the token mirror, never from literal hex or font strings.

The 47 directives:

```
#approaches #arch #artifacts #audio-overview #audit #blogpost #blueprint #brief #brief-dialog
#case-study #chronology #compete #critique #datatable #deep-research #dense #design #dossier
#explainer #faq #flashcards #gap #help #infographic #journey #meta-themes #mindmap #org #persona
#playground #prd #presentation #presentations #proto #prototypes #questionnaire #quiz
#recommendations #refine #report #roadmap #slide #slides #strategy #studyguide #themes
#video-overview
```

Modifiers decorate rather than select: `#nxt` `#nu` `#deciem` (brand), `#slide` `#slides` (view),
`#dense` (density), `#dark` `#light` (theme), `#preview` `#export-pptx` `#auto-open` (export),
`#count=` `#img=` `#hero=` `#model=` `#sections=` `#name=` `#rec=` (value-taking), plus the image
directives `#img-diagram` `#img-generate` `#img-icon` `#img-none` `#no-image` `#generate-image`.

### 8.2 Two chains, one per modality

#### Slide / structured artifacts: `services/artifactChain.ts` (524 lines)

`STAGE_ORDER` is a pinned contract (`artifactChain.test.ts`). Do not reorder casually:

```
normalize -> lexical -> titles -> bindPointers -> provenance -> claims
          -> evidenceSlots -> exhibits -> prose -> grade -> renderPlan -> deckQuality
```

Why that order, recorded in the code:

- `titles` runs on the scrubbed title **before** binding, so a pointer the binder attaches never
  counts toward title length.
- `bindPointers` runs before `provenance` and the evidence gate because it supplies the pointers
  they read. Three prompt-level attempts to make the model carry its own pointers were measured and
  failed; the runtime computes them from the chunk set the model was shown.
- `claims` is the ONE claim gate; the HTML chain calls `evaluateClaimLedger` directly and this stage
  is its slide adapter.
- `exhibits` before `prose` so a section can never describe a chart that failed to render.
- `grade` is last of the inspection stages because it grades the other gates as well as the
  artifact.
- `deckQuality` judges the shape of the deck, so it runs after the visual count is known.

`ChainResult` carries `pass`, `legacyPass`, per-stage `scores`, `below` thresholds with whether each
may block, the `dag` actually executed (the middle group runs in parallel, with `parallelMs` and
`wallMs`), plus the slot, prose, grade, deckQuality, exhibit, bind, claim and title reports and a
concatenated `repairInstruction`.

`scrubStrings` deep-walks every string in the artifact, never touching media keys or citation
pointers. **This is load-bearing**: see Section 11.4.

#### Prose documents: `services/htmlArtifactChain.ts` (665 lines)

`#report`, `#whitepaper`, `#brief`, `#explainer`, `#prd` and every NotebookLM-family kind run
`runHtmlArtifactChain` before `saveArtifact`:

1. **Chrome strip plus declared source labels.** `stripModelChrome` removes model-authored footers,
   buttons and audit blocks; the runtime owns chrome.
2. **Claim-ledger gate.** `services/claimLedgerGate.ts` (886 lines) runs reason-coded per-sentence
   checks against the goal text and the run's chunks.
3. **Deterministic fixes.**
4. **Bounded narrowing repair.** Up to `MAX_REPAIR_ROUNDS`, narrowing only, batch capped at 30
   sentences per call (a live `#prd` with 123 blocking rows repaired zero because one oversized
   batch truncated its JSON reply), then re-gate.
5. **Prose signal (stage 4.5).** `services/proseSignal.ts` measures reader-visible blocks for the
   contrast template, oracular paragraph enders, cadence and actor failures, then runs ONE bounded
   voice-only repair over offending blocks. Facts, quotes and pointers are preserved by contract and
   by `applySentenceRepairs` re-attaching each row's own pointers. Headings over 13 words are voice
   targets too (the hard "aim 10 words or fewer" action-title clause).
6. **Quote marking** (`markReportedQuotes`), **citation rendering** (`renderCitations` emits
   `<sup class="hic-cites">` with short labels, full label in `title`, deduped per block), **source
   index** (`buildSourceIndexHtml`).
7. **AIR patch** (`patchAir`) records before/after ledgers, stripped chrome, repair rounds,
   sentences repaired and prose scores.

Two guards exist because of a live defect: `sentenceTypeHeld` (a question must remain a question;
the voice stage turned 2 of 15 quiz stems into gerund fragments) and an inline-markup skip (a span
carrying `<b>`, `<q>`, `<a>` and similar is left alone, because repairs are written back as
`escapeHtml(cleaned)` and destroyed option letters in 6 of 15 quiz questions).

### 8.3 Slide rendering: two twins that must stay in sync

| Surface | File | Size |
|---|---|---|
| Chat preview | `components/slideTemplates/web.tsx` | 960x540 |
| Export stage | `services/slideToStageHtml.ts` | 1920x1080 |
| PPTX legacy | `components/slideTemplates/pptx.ts` | |

`npm run check:templates` guards parity. **24 GOLD slide templates** in
`components/slideTemplates/types.ts`:

```
persona-card recommendation theme-overview theme-detail theme-cluster theme-spotlight theme-arc
theme-mosaic competitive-matrix block-quote case-study principles stat-row timeline
section-divider service-blueprint journey-map gap-matrix architecture-map prd-feature
systems-inventory executive-brief org-chart journey-brief
```

Separately, DECK MODE composes full decks from **29 `slides:` archetypes** in
`services/slideComposer.ts` `ARCHETYPE_SPECS` (Method A: geometry specs, no per-archetype render
code):

```
agenda aggregate-roadmap block-quote brief-card comparison-panels cover evidence-table flow-arc
infographic-exhibit means-matters milestone-timeline numbered-themes org-model prd-ledger
prd-signals prd-story prd-trace problem-diptych quadrant ranked-bars role-needs
role-recommendation role-roadmap scene screen-critique screen-redesign section-divider stat-row
thesis-interstitial
```

The `slides:` namespace exists to keep these distinct from the colliding GOLD template names.

### 8.4 Export: the real path and the legacy path

**Real path** (structural rewire of 2026-06-05): each `SlideData` renders to a fresh 1920x1080
`#stage` HTML through `services/slideToStageHtml.ts`, POSTed to `/api/gold/export-pptx-multi`, where
`proxy/gold_pptx_export.py` Playwright-walks the stage geometry into ONE native, fully editable
`.pptx`: native text runs, native shapes, native swappable pictures, per-variant chrome layouts,
embedded brand fonts.

Critical constant: the 1920px stage is 144 px/in, so `PX2PT = 13.333 * 72.0 / 1920 = 0.5`. Using the
1280px exporter's 0.75 oversizes every glyph by 1.5x and causes text collisions.

Two prohibitions, each from a real incident: **never a full-slide raster**, and **never
layout-backed picture placeholders**, because python-pptx clones layout placeholders onto every
later slide (the 2026-07-02 empty-placeholder epidemic).

Brand-aware source: NXT and NU start from python-pptx's default `Presentation()`; a DECIEM deck
(stage HTML with `data-brand="deciem"`) starts from the dissected DECIEM template (34 layouts, zero
slides) so the export inherits that master and theme, and per-variant chrome layouts clone from the
template's own BLANK layout rather than the default index 6.

**Legacy path**: `services/exportService.ts` (html2canvas to jsPDF, pptxgenjs via
`components/slideTemplates/pptx.ts`). Fallback only. The `export-paint-sync` skill documents the
paint-readiness contract for it: wait for fonts, decoded images, flushed effects and two stable
frames before capture, or slides export blank.

### 8.5 Native exhibit rendering

`proxy/nxt_diagram_render.py` (1,339 lines) at `/api/ai/diagram` renders journey, architecture,
mindmap and blueprint diagrams plus the E4 infographic families as HTML/CSS to Chromium PNG. The
cache is salted by `_DIAGRAM_STYLE_VERSION`, currently **`"v33-concept-cluster"`**
(`proxy/app.py:25556`). **Bump it on any style change** or old artifacts keep serving stale images.
Infographic-exhibit panels are re-rendered at export time so old decks pick up renderer improvements.

A standing rule (memory D17): journey, arch, mindmap and blueprint are native exhibit images, never
image-generation output.

### 8.6 Graphic-collision rules, learned from failures

- Never emit SVG `<line>` or `<path>` that crosses through a node's bounding box.
- Never let a text label intersect a divider, arrow or dot.
- Never absolutely-position sibling elements converging on one coordinate. The journey-map failure of
  2026-05-24 came from N `.activity` siblings stacking at `top: 50%`; the fix was a CSS-grid cell
  anatomy, and the principle generalizes.
- Prefer CSS grid or flex for tier diagrams, swimlanes and matrices. Grid resolves overlap
  automatically; SVG with absolute coordinates makes the model the layout engine, which fails
  predictably.
- For SVG that must exist: 16px exclusion zone per node, connectors terminate at the box edge,
  bidirectional connectors use different colors at each end.

### 8.7 The design system

Single source of truth is the published Figma library `iSQhAVM7SI4QHAWB7y9C2z`, whose
`NXT Brand Tokens` collection (`221:2`) carries two modes: NXT (`221:0`) and NU (`535:0`). Brand is
a **mode flip on one component set**, never a separate file.

Mirrored read-only into `hic-workspace/design-system/figma-tokens.json`. Measured top-level keys:
`_meta`, `NXT`, `NU`, `_grid`, `DECIEM`. Each brand carries `color`, `font`, `space`, `type`,
`radius`, `logo`; DECIEM adds `_source` and `art`. Served at
`/api/design-tokens?brand=NXT|NU|DECIEM` (`proxy/nxt_design_system.py`).

**DECIEM is a third brand but not a Figma mode.** Its tokens were extracted from the DECIEM
PowerPoint template into the `DECIEM` block plus `hic-workspace/design-system/deciem/` (template
pptx, corner art, logos), served at `/api/design-assets/deciem/`. Brand ids are `nxt | nu | deciem`,
resolved through `brands.normalizeBrandId` / `getBrand`, never a two-way ternary.

Generated output must resolve colors, fonts and spacing from tokens
(`var(--color/*)`, `var(--font/*)`, `var(--space/*)`), never from a literal baked into code. When
Figma changes, re-pull both modes and re-chunk `wiki/brand/figma-node-map.md`.

Also in `hic-workspace/design-system/`: `icon-catalog.json`, `icon-glyphs.json`,
`icon-manifest.json`, `icon-sprite.svg`, `icon-taxonomy/` and two gallery HTML files.

### 8.8 Output quality enforcement

`.claude/CLAUDE.md` holds the rules; `services/slidePostProcessor.ts` (2,961 lines) is the runtime
chokepoint that cannot be bypassed by clever phrasing the way a prompt rule can. It enforces 350+
banned slop phrases, meta-narration patterns, process-reference rewrites, citation resolution
(`[CHUNK_003]` to `"Higher Ed Dive: <title>"`), the em-dash strip, the emoji strip, Unicode
stylization bans, and provider artifact-tag bans.

The rules worth internalizing, because they are the ones most often violated:

- **Quantitative Claim Rule.** A number may appear only inside a verbatim quote carrying an inline
  source attribution. A bare percentage in a title, KPI tile or prose is forbidden.
- **Action titles.** Every slide title is a complete sentence stating a conclusion, 10 words or
  fewer, literal, no metaphor. The Partner Test: a senior partner reading only the titles must get
  the whole argument.
- **Subject discipline.** The artifact is about its subject, never about the deliverable. The worst
  failure recorded on this project was a `#strategy` deck that came back as advice on how to write
  the marketing report.
- **Evidence-label rule.** The word "Evidence" must be immediately followed by a verbatim corpus
  quote with attribution. No paraphrase. The service-blueprint "evidence" lane is touchpoints; label
  it "Touchpoints".
- **Scope-match, independence, claim-type ledger.** A citation must support the actual wording
  (same population, period, system, comparison, causal strength). Several citations repeating one
  original claim are one source. Six claim types exist; only SUPPORTED FACT, DERIVATION and
  DEFENSIBLE INFERENCE may be stated declaratively.
- **Two-pass QA order.** Pass 1 claims, pass 2 prose. Never mixed.
- **No QA annotations in output.** "EVIDENCE GAP", "TBD", confidence labels, run ids, phase stamps
  and `[CHUNK_XXX]` leakage are all forbidden in user-visible text. They may live in `data-*`
  attributes or audit logs.

---

## 9. Recursive self-improvement

This is the most distinctive part of the platform and the easiest to break. The governing rule:
**nothing improves itself without passing a gate.**

### 9.1 The five improvement targets (`services/learningEngine.ts`, 1,154 lines)

Loop 4 reads the feedback event stream, clusters events by
`(deliverable_type, section_scope, signal_polarity)`, and routes patterns crossing a threshold to:

1. **Constraint store**: `wiki/synthesis/learned-constraints.md` plus a lifecycle row in
   `synthesis/constraint-records.json`.
2. **Skill patch**: **proposed** to `/api/epochs/proposals` as `kind: skill_patch`. The live
   `SKILL.md` is written only by `patchSkillFile` with an APPROVE held-out verdict. **The learning
   pass never writes a skill.**
3. **Framework page**: `wiki/frameworks/<type>.md`, diff queued.
4. **Anti-pattern entry**: `wiki/anti-patterns/<type>.md`, auto-applied at ledger rung 3.
5. **Exemplar update**: `wiki/exemplars/<type>.md` from positive signals, rung 3.

It also computes constraint effectiveness from lifecycle rows and **retires** under-performing
constraints by deleting their ledger lines with a `retired:` marker. Improvement that does not work
is removed, not accumulated.

A sixth route exists for chunking: complaint text matching `CHUNK_INCOMPLETE_PATTERNS`
(truncated, cut off, missing slides, incomplete) or `CHUNK_TOOSHORT_PATTERNS` (more depth, too
brief, shallow, sparse) promotes to a persistent chunk-budget override after three or more clusters.

### 9.2 SkillOpt: offline skill training (arXiv:2605.23904)

Trains per-deliverable skill documents against real production artifacts. Training is offline; the
deployed inference path is unchanged. **One path, four gates:**

```
jobs complete -> counter -> epoch due -> batch (proposals) -> held-out verdict -> promotion
emitDeliverable   proxy      proposal    skillopt-batch.sh    <skill>.verdict.json   cp (APPROVE only)
```

1. **Counter.** Every emitted artifact ends with `epochTrigger.recordJobCompletion`
   (`services/emitDeliverable.ts`). One count per research run.
   `GET /api/epochs/status` (`proxy/app.py:21437`) is the disk-authoritative reader. Note:
   `scripts/README-skillopt.md` says the SPA keeps its own counter at
   `wiki/synthesis/epoch-job-counter.json` "until the proxy exposes `POST /api/epochs/jobs`". That
   endpoint now exists (`proxy/app.py:21446`), so the README is one step behind; check whether the
   SPA-side counter is still needed before relying on either.
2. **Epoch due.** At `jobs_since_last_epoch >= threshold` (default 5), one pending proposal
   (`target_layer: epoch`) is written to `/api/epochs/proposals`. The owner sees it in the SPA's
   `EpochProposalsPanel`. Nothing is applied.
3. **Batch.** `POST /api/epochs/run-batch` runs `scripts/skillopt-batch.sh`. Validator-ACCEPTED
   candidates become `hic-workspace/skillopt/proposals/<batch>/<skill>.proposal.json`. The validator
   (`validate-candidate.py`) is a structural check, **not** a promotion signal.
4. **Verdict.** The held-out gate (`services/goldenSetRunner.ts` `runGate` before and after, then
   `compareReports`) writes `<skill>.verdict.json`:
   `{"verdict": "APPROVE"|"REJECT"|"HUMAN-REVIEW", "discrimination_before", "discrimination_after",
   "golden_set_version"}`.
5. **Promotion.** `--auto-promote` copies a candidate over the live `SKILL.md` only when the verdict
   says APPROVE **and** `npm run regression:obligations` is green. No verdict, no copy. The same
   verdict shape rides to `POST /api/skill/write`; the proxy refuses a skill write without it.

npm entry points: `skillopt:extract`, `skillopt:build-training`, `skillopt:train`,
`skillopt:train-promote`, `skillopt:dry-run`, `skillopt:all`, `skillopt:pool` (`SKILLOPT_POOL=8`),
`skillopt:pool-live`.

#### The promotion path, traced

`scripts/skillopt-batch.sh` is 383 lines. Promotion is `promote_candidate()` at line 154, and it
refuses in three distinct ways before it will copy anything:

```bash
if [ ! -f "$candidate" ]; then
  echo "  PROMOTION REFUSED: candidate not found: $candidate"; return 1; fi
if [ ! -f "$verdict_file" ]; then
  echo "  PROMOTION REFUSED: no verdict file at $verdict_file (the held-out gate has not ruled;
        a validator ACCEPT is not a verdict)"; return 1; fi
if [ "$verdict" != "APPROVE" ]; then
  echo "  PROMOTION REFUSED: verdict is '${verdict:-unreadable}', not APPROVE"; return 1; fi
cp "$candidate" "$skill_path"
```

Only after the copy does it call `record_epoch` (which appends a `## Epoch N` block naming the
skill, candidate, live path, batch and verdict) and then DELETE `/api/epochs/canary`, retiring the
canary because the skill file now carries the change.

`write_proposal()` stamps each proposal `"status": "pending_gate"` and records the validator's role
explicitly in the artifact: `"validator": "validate-candidate.py ACCEPT (rung 1-2 structural; NOT a
promotion signal)"`. The pipeline writes down its own epistemics so a later reader cannot mistake a
structural pass for evidence.

**Three independent enforcement points, not one.** This is the part worth preserving if you
refactor:

1. **The shell** refuses without an APPROVE verdict file (above).
2. **The SPA** refuses in `services/learningEngine.ts:595`: `patchSkillFile(skillName, candidate,
   gateVerdict)` opens with `assertApproveVerdict(gateVerdict)` and throws otherwise. Pinned by
   `services/learningEngineProposals.test.ts` ("the learning pass never touches
   `/api/skill/write`; `patchSkillFile` throws without an APPROVE verdict").
3. **The proxy** refuses at `POST /api/skill/write` (`proxy/app.py:15607`). It requires
   `gate_verdict` with `verdict == "APPROVE"`, `discrimination_before`, `discrimination_after` with
   discrimination not shrinking, **and `content_sha256` of the exact content being written**, so an
   APPROVE cannot be replayed for different content. That hash binding is the detail that makes the
   gate more than a flag check.

Around it: `/api/skill/read`, `/api/skill/list-versions` and `/api/skill/rollback` give the skill
store versioning and an undo path (archives live under each skill's `_versions/`).

If a skill patch is a no-op duplicate, `patchSkillFile` detects it (`updated === oldContent`), logs
"skill patch is a duplicate of an existing learned behavior", and returns success without writing.
If `/api/skill/read` is unavailable, it degrades by appending the signal to
`wiki/synthesis/skill-improvements.md` rather than dropping it.

#### The gate, verified by execution (2026-11-10)

`--promote-only` runs `promote_candidate()` alone, with no training and no model calls, so the gate
can be exercised directly. Point `PROPOSALS_ROOT` and `--skill-path` at a scratch directory and all
four branches are observable:

| Case | Setup | Observed output | Live file |
|---|---|---|---|
| 1 | candidate path does not exist | `PROMOTION REFUSED: candidate not found: <path>` | unchanged |
| 2 | candidate exists, no verdict file | `PROMOTION REFUSED: no verdict file at <path> (the held-out gate has not ruled; a validator ACCEPT is not a verdict)` | unchanged |
| 3 | verdict `{"verdict":"REJECT"}` | `PROMOTION REFUSED: verdict is 'REJECT', not APPROVE (<path>)` | unchanged |
| 4 | verdict `{"verdict":"APPROVE",...}` | `PROMOTED to <path> (verdict APPROVE from <path>)` then `EPOCH N recorded` | replaced by the candidate |

Reproduce:

```bash
cd humans-in-control-research
S=<scratch-dir>; mkdir -p "$S/proposals/testbatch"
printf '# Candidate\n' > "$S/candidate.md"; printf '# Live\n' > "$S/live-skill.md"
export PROPOSALS_ROOT="$S/proposals" BATCH_ID=testbatch
bash scripts/skillopt-batch.sh --promote-only --skill=demo \
     --candidate="$S/candidate.md" --skill-path="$S/live-skill.md"
```

**Warning, learned the hard way.** Case 4 does not confine itself to your scratch directory.
`record_epoch` appends an epoch block to the LIVE
`hic-workspace/wiki/synthesis/improvement-epochs.md` under `$HIC_DIR`, regardless of
`PROPOSALS_ROOT`, and then issues `DELETE /api/epochs/canary` against the proxy. Snapshot that file
before running case 4, and remove only your own appended block afterwards. Do **not** use
`git checkout --` on it: this repo's working tree always carries other uncommitted changes, and
reverting the file to HEAD destroys them. On 2026-11-10 exactly that mistake discarded fourteen
uncommitted epoch records (ids 14 to 27) permanently.

The TypeScript and proxy halves of the gate are pinned by tests that pass today:
`services/learningEngineProposals.test.ts`, `services/memoryParity.test.ts`,
`services/modelSeats.test.ts` and `services/modelIdLiterals.test.ts` (4 files, 14 tests, green on
2026-11-10).

#### Steps 1 to 3, also verified by execution (2026-11-10)

`hic-workspace/skillopt/` is absent not because the pipeline is broken but because **no rollouts had
been extracted in this checkout**. Running the first three steps shows the whole chain working, with
no model call and no live mutation:

**Step 1, extract rollouts** (`npm run skillopt:extract`, reads `hic-workspace`, writes to
`../tmp/skillopt-rollouts`). It scored 207 real artifacts across 14 deliverable kinds. The output is
a useful quality census in its own right:

| Kind | Rollouts | Failures | Successes | Avg score |
|---|---:|---:|---:|---:|
| prd | 60 | 11 | 49 | 0.92 |
| strategy-slide | 60 | 43 | 17 | 0.71 |
| journey | 21 | 20 | 1 | **0.39** |
| persona | 14 | 13 | 1 | 0.62 |
| gap-analysis | 11 | 9 | 2 | 0.66 |
| recommendation | 11 | 9 | 2 | 0.66 |
| arch | 7 | 5 | 2 | 0.71 |
| meta-themes | 7 | 7 | 0 | 0.59 |
| competitive | 5 | 2 | 3 | 0.83 |
| org | 4 | 4 | 0 | 0.59 |
| blueprint | 3 | 3 | 0 | 0.58 |
| roadmap | 3 | 3 | 0 | 0.59 |
| tech-audit | 1 | 1 | 0 | 0.59 |

Read that table before planning quality work. `#prd` is healthy. **`#journey` is the worst
deliverable in the system by a wide margin** (avg 0.39, 20 failures in 21 runs, the only kind
scoring below 0.5), which is consistent with it being the one deliverable that leaves HiC entirely
and renders through the separate Journey Mapper service (2.4). Several kinds sit at a flat 0.59 with
zero successes, which is the score of an artifact that fails the chain the same way every time.

**Step 2, build the training set** (`npm run skillopt:build-training`, writes to
`../tmp/skillopt-training`). It folds in feedback from `wiki/feedback` and emits seven per-skill
training files: journey 22, blueprint 4, persona 15, gap-analysis 12, roadmap 4, recommendation 12,
strategy-slide 61.

**Step 3, batch planning** (`npm run skillopt:dry-run`). Before the training set existed, all nine
trainable skills reported `SKIP: rollouts file not found`. After it, all nine resolve and zero skip:

```
[deck-composer] DRY-RUN: would train with budget=4 epochs=1 -> proposal at .../deck-composer.proposal.json
...
DRY-RUN complete (no directories created). Skipped: 0
```

The nine trainable skills are `human-voice-editor`, `journey-illustrator`,
`service-blueprint-mapper`, `strategy-author`, `roadmap-builder`, `deck-composer`,
`gap-analysis-evaluator`, `persona-architect`, `recommendation-architect`. Dry-run creates no
directories by contract (`scripts/skillopt-batch.sh:273`).

**The live counter**, read from the running proxy at `GET /api/epochs/status?threshold=5`:

```json
{"due": false, "jobs_since_last_epoch": 0, "threshold": 5,
 "last_epoch_at": "2026-11-03 18:39:25Z", "next_epoch_id": 14,
 "pending_proposal_id": null,
 "loop": {"epochs_without_heldout_win": 0, "paused": false, "pause_after": 3,
          "last_batch_id": null, "last_approve_at": null},
 "rescore": {"last_failures": 29, "last_at": "2026-11-10T04:24:05Z"}}
```

Two things this reveals that the scripts do not:

1. **The loop pauses itself.** `pause_after: 3` means three consecutive epochs without a held-out
   win stop the loop and set `paused_reason`. Self-improvement that stops improving halts rather
   than grinding on, which is the safeguard that keeps SkillOpt from drifting the skill library.
2. **A rescore lane feeds it.** `rescore.last_failures: 29` is what drives epoch-due proposals; the
   live pending proposal reads "Epoch 9 due: 22 artifact(s) failed rescoring in the last 168 h
   (threshold 5)". Epoch proposals come from measured artifact failures, not from a timer.

`GET /api/epochs/proposals` returns real pending proposals (for example `prop_1793474680_1`,
`epoch_id` 9), each carrying its own `proposed_edit` naming the exact call to run.

#### The training step itself: executed 2026-11-10, nine skills, zero promotions

`scripts/run-skillopt.py` generates candidate skill edits by calling a model. The request shape
(line 246):

```python
DEFAULT_MODEL = 'gemini-3.5-flash'          # line 70
body = {'contents': {'parts': [{'text': prompt}]},
        'config': {'responseMimeType': 'application/json',
                   'temperature': 0.2,
                   'thinking_config': {'thinking_level': 'medium'}}}
POST {PROXY_BASE}/api/ai/gemini             # 120s timeout, proxy auth headers
```

So training routes through the proxy like everything else, inheriting the cost meter and caching,
and uses the cheap tier. Its CLI defaults are `--epochs 1`, `--budget 4` (edits per epoch),
`--minibatch 4`, `--pool 0` (0 means the single-candidate loop), and `--score-mode text`, where
`text` is offline rung-1 text metrics and `live` installs the candidate and runs the eval lane.

`skillopt-batch.sh` overrides the pool to 8 and runs all nine trainable skills.

**The run.** `npm run skillopt:train` (no `--auto-promote`), batch id
`skillopt-batch-20261110-090128`, started 09:01:28 and finished 11:15:12 local, about two hours
fourteen minutes. It made **680 optimizer calls** on `gemini-3.5-flash` across **9 pool epochs**
and scored **72 candidates** (8 per skill: the incumbent, one mutation of it, six proposer runs).

**The result: every skill rejected. The incumbent won all nine pools.**

| skill | kind | rollouts | SKILL.md | incumbent | best challenger | margin |
|---|---|---|---|---|---|---|
| `deck-composer` | strategy-slide | 61 | 41,762 ch | 0.975 | proposer-6 0.974 | 0.001 |
| `journey-illustrator` | journey | 22 | 31,344 ch | 0.943 | mutation 0.939 | 0.004 |
| `persona-architect` | persona | 15 | 24,444 ch | 0.940 | proposer-1 0.935 | 0.005 |
| `service-blueprint-mapper` | blueprint | 4 | 19,990 ch | 0.930 | proposer-4 0.921 | 0.009 |
| `roadmap-builder` | roadmap | 4 | 19,103 ch | 0.930 | proposer-3 0.928 | 0.002 |
| `gap-analysis-evaluator` | gap-analysis | 12 | 18,502 ch | 0.922 | proposer-2 0.914 | 0.008 |
| `strategy-author` | strategy-slide | 61 | 21,857 ch | 0.895 | proposer-1 0.891 | 0.004 |
| `recommendation-architect` | recommendation | 12 | 36,291 ch | 0.877 | mutation 0.874 | 0.003 |
| `human-voice-editor` | strategy-slide | 61 | 6,957 ch | 0.863 | proposer-2 0.863 | 0.000 |

Each pool ended `Pareto front: [0]; winner: [0] incumbent` and then
`The incumbent is not beaten this epoch; no candidate is written`, so the batch summary reads
`Accepted (proposals): 0 / Rejected: 9 / Promoted: 0`.

**Two pools are worth looking at individually.** In `strategy-author` the Pareto front was `[0, 3]`:
proposer-2 genuinely dominated the incumbent on one axis (`failure_coverage` 0.95 against 0.94) and
was still rejected, because the weighted tie-break ranked it lower (0.879 against 0.895). In
`human-voice-editor` proposer-2 tied the incumbent exactly at 0.863 and lost, because a tie goes to
the incumbent. Those are the designed behaviors, not faults, but they show the gate is strict in
both directions.

**What the scores show about the scorer itself.** The rung-1 vector is
`{integrity 0.25, hygiene 0.25, failure_coverage 0.35, size 0.15}` (`run-skillopt.py:713`), and
`size` is defined at line 658 as

```python
ratio = len(candidate_text) / max(1, len(baseline_text))
size  = 1.0 if ratio <= 1.0 else max(0.0, 1.0 - (ratio - 1.0) / 0.6)
```

The incumbent's ratio is 1.0 by construction, so its `size` is always exactly 1.00 and every
candidate that adds a sentence scores below it. Across the 72 candidates scored in this batch,
**`size` was the only dimension that varied at all in six of the nine pools** (journey-illustrator,
roadmap-builder, deck-composer, gap-analysis-evaluator, persona-architect,
recommendation-architect). `integrity` was 1.00 for all 72. In the other three pools exactly one
further dimension moved: `hygiene` in human-voice-editor and service-blueprint-mapper,
`failure_coverage` in strategy-author. A successor planning quality work should know that under
`--score-mode text`, a candidate that only adds instruction text can lose on the one axis that moves
and cannot gain on the three that do not. `--score-mode live` is the other rung and was not run
here.

**Footprint left behind: none that matters.** Because no candidate was written, no proposal files
were created, `hic-workspace/skillopt/proposals/` still does not exist, no epoch record was
appended to `improvement-epochs.md` (`record_epoch` runs only on promotion), and
`git status .claude/skills` shows only the `deck-composer/SKILL.md` edit that predates the batch.
The full logs and the nine scored pool files (`SKILL.pool-<ts>.json`, one per skill, each listing
all 8 candidates with their vectors) are under `/tmp/skillopt-batch-20261110-090128/`.

**One defect surfaced.** Four rollouts in the `journey-illustrator` pool failed with
`JSON parse failed after all repairs: Expecting ',' delimiter` (log lines 206 to 212) even after
`ai-output-syntax-repair` ran. Flash returned malformed JSON that the repair chain could not fix,
those analyst outputs were dropped, and the pool continued without them. The run does not count or
surface these, so they are visible only in the log.

To reproduce one skill cheaply:

```bash
bash scripts/skillopt-batch.sh --skill=deck-composer --budget=1 --epochs=1
# NOTHING is promoted without an APPROVE verdict file, so this is safe to inspect.
```

Note that `--skill=` acts as a filter in batch mode, not as the promote-only selector.

Supporting scripts: `extract-rollouts.py`, `build-training-set.py`, `score-rollouts.py`,
`validate-candidate.py`, `run-skillopt.py`, plus `proxy/skillopt_trajectory_miner.py`.

The agent `.claude/agents/skillopt-validation-gate.md` runs an eight-check rubric and exists for one
reason: **bad instructions compounded into the skill library produce skills that get worse with each
pass**. The gate is what makes the loop net-positive.

### 9.3 The eval lane

`humans-in-control-research/evals/`:

- `cases/frontier/`: **1,063 cases**, each generated from an artifact that failed its chain.
- `results/`: 431 result files.
- `judges.json`: **21 judges**, versioned, with an explicit blocking rule:

  > A judge with `kind=llm` may block only when `human_agreement.n >= 30` and
  > `human_agreement.kappa >= 0.4`. Deterministic judges encode a rule and may block.

  `human_agreement` is filled by a nightly job (`/api/eval/judge-agreement`) joining
  `evals/labels.jsonl` with `evals/verdicts.jsonl`. Twelve of the judges mirror the chain stages
  (`chain:normalize` through `chain:deckQuality`).
- `labels.jsonl` (human labels), `verdicts.jsonl` (machine verdicts), `kpi_definitions.json`,
  `fixtures/`, `run_eval.py`, `eval.spec.ts`.

npm: `eval`, `eval:live`, `eval:promote`, `eval:rescore` (`--rescore --hours 24`),
`eval:constraint`.

This lane closes the loop in both directions: failures become cases, and
`aiRouter.applyModelMatrix()` feeds measured pass rates back into routing (4.4).

### 9.4 The cadence

`scripts/self-improvement-schedule.sh` runs only the headless CLI jobs:

| Mode | Cron | Jobs |
|---|---|---|
| `nightly` | `0 1 * * *` | proactive ingest (`/api/scheduler/poll-youtube-channels`), manifest-chunk parity audit |
| `weekly` | `0 6 * * 0` | nightly plus SkillOpt retrain |
| `monthly` | `0 5 1 * *` | weekly plus full health-check summary |

`set -uo pipefail`, deliberately **not** `-e`: one failing job must not abort the cadence. Output
appends to `hic-workspace/wiki/synthesis/self-improvement-health-log.md`.

Claude-driven jobs (wiki-curator, cross-engagement-pattern-miner, epoch-proposer, orphan and schema
auditors) are scheduled separately through Claude Code `/schedule` or `/loop`.

**Broken reference:** the script's header points at
`humans-in-control-research/SELF_IMPROVEMENT_SCHEDULE.md` for those Claude-driven jobs. **That file
does not exist anywhere in the tree** (verified 2026-11-10). The cadence for the Claude-side jobs is
therefore undocumented outside the subagent definitions in `.claude/agents/` (`wiki-curator`,
`orphan-code-auditor`, `schema-drift-auditor`, `quota-monitor`, each of which states its own
intended cadence in its frontmatter). Either restore the file from git history or delete the
reference.

### 9.5 Other improvement machinery

| Module | Lines | Role |
|---|---:|---|
| `services/promptImprovementEngine.ts` | 810 | constraint records and lifecycle |
| `services/improvementDiscriminator.ts` | 603 | does a candidate actually discriminate better? |
| `services/goldenSetRunner.ts` | 598 | the held-out gate |
| `services/qualityFrontier.ts` | 667 | frontier tracking |
| `services/auditorRubrics.ts` | 831 | auditor rubric definitions |
| `services/engagementLedger.ts` | 1,148 | per-engagement decisions and rules |
| `services/deliverableCoverage.ts` | 1,063 | per-hashtag coverage contracts |
| `services/knowledgeGapFinder.ts` | 702 | surfacing what the corpus cannot answer |
| `services/skillReview.ts` | | reviews a proposed skill patch |
| `services/constraintQualityGate.ts` | | gates a proposed constraint |

Repo-level guards: `npm run check:all` chains typecheck, unit tests, template parity, skills check,
content check, orphan-export check, PRD rules, deliverable rules, judges check, bundle-secrets check
and the eval run.

---

## 10. Docker configuration

### 10.1 Two image strategies, and why

Services split into two camps, and the split is deliberate.

**Install-on-boot** (`image: python:3.x-slim` plus a `command:` that pip-installs): `launchpad`,
`agent`, all six MCP wrappers, `reddit-ripper`, `video-analyzer`, `copilot-recipe-generator`. These
are small-dependency services where a slow first boot is acceptable and a Dockerfile would be
ceremony.

**Built images** (`build:` with a Dockerfile): everything with heavy or native dependencies.

The cost of install-on-boot is real and is documented in `proxy/Dockerfile`: the proxy used to run
that way, reinstalling 50-plus packages on every start, which produced a 60 to 120 second window
where the container reported `Up` but uvicorn had not bound port 5012, and every browser request in
that window returned `ERR_EMPTY_RESPONSE`. If a service starts reporting that symptom, suspect
install-on-boot before suspecting the app.

`video-analyzer` still pays this cost on purpose: its command is
`apt-get update && apt-get install -y ffmpeg && pip install ... && python run.py`.

### 10.2 The Dockerfiles that matter

There are 20 Dockerfiles in the tree; several are unused variants (`Dockerfile.enhanced`,
`Dockerfile.simple`, `Dockerfile.web`, `Dockerfile.dev`). Check `docker-compose-all.yml` for which
one a service actually builds. Three are worth reading in full.

**`humans-in-control-research/Dockerfile`** (multi-stage, Node 20 to nginx):

```dockerfile
FROM node:20-alpine AS builder
RUN npm install --legacy-peer-deps
RUN npm run build && npm run check:bundle-secrets    # the secret gate runs IN the build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

It then explicitly copies `DESIGN.md`, `public/logo.png`, `public/documentation.html`,
`public/nu-design-gallery` and three `hic-workspace/*.json` manifests, because Vite's `publicDir`
copy proved unreliable in this image and those files silently 404ed to the SPA fallback, rendering
as broken images or empty loaders. The wiki is deliberately **not** baked in (it holds client
uploads); compose mounts it read-only and `nginx.conf` returns 404 for the sensitive paths.

**`humans-in-control-research/proxy/Dockerfile`** is designed around a specific constraint: compose
mounts `./proxy:/app` at runtime, which **overlays anything copied to `/app` at build time**. So the
image copies no application source. Dependencies install to global site-packages
(`/usr/local/lib/python3.11/site-packages`), where they survive the overlay. Editing `app.py` needs
no rebuild; editing `requirements.txt` does.

It bakes in ffmpeg, `build-essential` (hdbscan, numba, llvmlite and pynndescent need to compile),
`libxml2-dev`/`libxslt-dev` for lxml, and curl for the healthcheck. Playwright Chromium is installed
by naming the Debian runtime libraries explicitly rather than running `playwright install-deps`,
which assumes Ubuntu and pulls `ttf-unifont` and `ttf-ubuntu-font-family`, neither of which exists
on Debian bookworm. Brand fonts are copied to `/usr/share/fonts/truetype/nxt/` and `fc-cache` run,
so Chromium renders Saira Condensed and Archivo identically to the CSS preview. That font step is
what makes exported PPTX text match the browser.

**`internal-solutions-socialresearch/backend/Dockerfile`** installs CPU-only torch first, from a
separate index, to avoid pulling CUDA wheels:

```dockerfile
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.4.1+cpu \
 && pip install -r requirements.txt
CMD ["sh","-lc","python startup.py && gunicorn --bind 0.0.0.0:8081 \
     --workers ${GUNICORN_WORKERS:-1} --timeout ${GUNICORN_TIMEOUT:-240} 'app:create_app()'"]
```

Order matters: torch first, so the requirements resolve against the CPU build. `startup.py` runs
before gunicorn and downloads NLTK data, so the first boot needs network. Defaults are one worker
and a 240-second timeout, because BERTopic runs inside the request.

### 10.3 Mounts

35 host bind mounts, 6 named volumes, and 11 read-only mounts. The read-only set is the security
surface worth knowing:

| Mount | Service | Why read-only |
|---|---|---|
| `hic-workspace/.runtime` | `agent`, `research-mcp`, `nxt-agency-backend` | they read the proxy token; only the proxy writes it |
| `.claude/skills` | `research-generator` | the SPA serves skills; only the proxy may patch them |
| `hic-workspace` | `research-generator` | nginx serves the wiki; writes go through the proxy API |
| `humans-in-control-research/scripts` | `research-proxy` | `run-batch` executes them, never edits them |
| `components`, `services` | `research-proxy` | an ingestion test compares against SPA source |
| `NXT-Agency/agent-prompts` | `nxt-agency-backend` | prompt definitions are inputs |
| `launchpad/static` | `video-analyzer` | shared branding assets |

The same `.claude/skills` directory is mounted **read-only into the SPA and read-write into the
proxy** (`- ./.claude/skills:/skills`). That asymmetry is the enforcement mechanism behind 9.2: the
learning engine can only patch a skill by going through the proxy, where the APPROVE gate lives.

Named volumes hold state that must outlive a container: `social-research-db-data`,
`nxt-agency-db-data`, `journey-uploads`, `miro-generator-uploads`, `miro-generator-output`,
`consistent-character-generator-data`.

### 10.4 Health, ordering and restart

Only four services declare a `healthcheck`: `social-research-frontend` (a node one-liner against
5173, 120s start period), `social-research-backend` (a Python socket probe, **240s start period**,
20 retries, because BERTopic and transformers load slowly), `social-research-db` and
`nxt-agency-db` (both `pg_isready`). `research-proxy` carries its healthcheck in its Dockerfile
instead (curl `/health`, 60s start period).

Only two `depends_on` entries use `condition: service_healthy`, both waiting on a database:
`social-research-backend` on `social-research-db`, and `nxt-agency-backend` on `nxt-agency-db`.
Every other `depends_on` waits only for container start, not readiness, which is why the agent
retries tool discovery three times rather than assuming the MCP services are up.

`restart: unless-stopped` appears on exactly one service, `social-research-frontend`. Everything
else uses the default, so a crashed container stays down until you bring it up.

`pull_policy: build` on `research-generator` and `research-proxy` makes a plain
`docker compose up -d` rebuild from the working tree every time, so `git pull` followed by `up -d`
always serves the pulled code. Layer caching keeps the no-change case fast.

`shm_size: 2gb` on `video-renderer` only.

### 10.5 Network and port binding

One bridge network, `nxt-humans-network`. Every service joins it, so services address each other by
compose service name (`http://research-proxy:5012`, `http://social-research-backend:8081`).

One service binds differently from the rest:

```yaml
research-proxy:
  ports:
    - "127.0.0.1:${RESEARCH_PROXY_PORT:-5012}:5012"
```

The explicit IPv4 bind works around Docker Desktop on Windows advertising `[::]:5012` without
forwarding IPv6. Chrome resolves `localhost` to `::1` first; before this, every browser request
connected and then hung silently. With it, IPv6 fails fast and Happy Eyeballs falls back to
127.0.0.1 in under 100ms. Use `0.0.0.0:PORT:PORT` only if you need LAN access.

Every other port is `${VAR:-default}`, so the whole map is overridable from `.env` without editing
compose.

---

## 11. Documentation drift and known gaps

Verified against the code on 2026-11-10. Fix these as you touch them.

### 11.1 Drift in the committed CLAUDE.md files

| Claim | Where | Reality |
|---|---|---|
| `research` category default is `gemini-3.1-pro-preview` | `humans-in-control-research/CLAUDE.md` model table | `aiRouter.ts:783` sets `research: CLAUDE_REASONING_MODEL` (`claude-opus-5-5`). Same for `narrative_composition`. |
| Presentation renderer has 12 section components | root `CLAUDE.md` | 14 exist in `src/sections/` (Themes and TechArch are the additions). |
| `openai_journey` is in `tool_services` and silently fails | root `CLAUDE.md` troubleshooting | Removed. Six services remain. |
| 18 slide templates | `humans-in-control-research/CLAUDE.md` | 24 in `components/slideTemplates/types.ts`. |
| `proxy/app.py` is ~16,000 / ~19,000 lines | both CLAUDE.md files | 28,459 lines. |
| `services/slidePostProcessor.ts` is ~1,700 lines | service CLAUDE.md | 2,961 lines. |
| `services/wikiService.ts` is ~2,600 lines | service CLAUDE.md | 3,438 lines. |
| `App.tsx` ~6,700 lines, `geminiService.ts` ~6,700 | service CLAUDE.md | 8,177 and 7,755. |
| "200+ data sources" | both | 1,277 in the main registry plus four packs of ~250. |
| `mcp-services/agent/app.py` is ~900 lines | root CLAUDE.md | 863, but it is now four modules totaling ~1,570 including `hic_door`, `threads`, `anti_hallucination`. |
| `launchpad/app.py` ~1,200 lines | root CLAUDE.md | 1,386. |
| 70+ custom skills | root CLAUDE.md | 90. |
| Agent uses `AsyncAnthropic` with a cached tool list | root CLAUDE.md | It holds no provider key; all completions go through the proxy via `hic_door.complete()`. |
| `process.env.API_KEY` is defined as `GEMINI_API_KEY` at `vite.config.ts:63-64` | service CLAUDE.md "Common Pitfalls" | **Removed 2026-10-30.** No provider key enters the bundle. The only `define` is `process.env.DESIGN_DESK_ENABLED`. This is the most dangerous stale claim in the repo: it invites a successor to reintroduce the vulnerability. See 11.6. |
| `@` alias at `vite.config.ts:70` | service CLAUDE.md | Now lines 125-127. |
| Wiki plugin at `vite.config.ts:12-45` | service CLAUDE.md | Roughly correct; `wikiStaticPlugin` spans 12-45 and serves both `/hic-workspace/` and `/skills/`. |
| `SELF_IMPROVEMENT_SCHEDULE.md` documents the Claude-side cadence | `scripts/self-improvement-schedule.sh` header | The file does not exist anywhere in the tree. |
| "RULE 45: CURRENT MODEL IDS" naming `claude-opus-4-6` | `internal-solutions-copilot-recipe-generator/app.py` system prompt | `claude-opus-4-6` is sunset. The id is written into generated Power Automate recipes, so the drift leaves the platform. See 11.3. |
| Reddit Ripper is a Reddit collector | root CLAUDE.md port table calls it "Flask (TrustPilot, Play Store too)" | Accurate, and worth promoting: it is a multi-source collector behind a `CollectorFactory`, with Reddit as one of four. |

### 11.2 Model-id drift across services

The platform has **one** canonical model policy (`services/claudeModelPolicy.ts` plus
`proxy/model_registry.py`) and **four** places that ignore it. Three fail inward (below); the
fourth, the Copilot Recipe Generator, fails outward and gets its own section 10.3.

1. **`NXT-Agency/backend/app/llm/router.py`** `MODEL_MAP`: `claude-opus` maps to `claude-opus-4-6`
   (sunset), `claude-sonnet` to `claude-sonnet-4-6`, `gemini-pro` to `gemini-3.1-pro-preview`, plus
   `gpt-5`, `o3`, `gpt-4o`, `gemini-2.5-*`. `anthropic_provider.py` defaults to
   `claude-sonnet-4-20250514`, a retired snapshot. `launchpad_compat.py` pins
   `claude-haiku-4-5-20251001` for extraction.
2. **`internal-solutions-socialresearch/backend/util/llm_models/`**: `gemini.py` uses
   `gemini-2.5-pro` (sunset tier), `openai.py` defaults to `o3` with a `gpt-4o` fallback. Only
   `claude.py` is current (`claude-opus-5-5`).
3. **`internal-solutions-journeymapper`**: compose pins `claude-opus-4-8`, which
   `proxy/model_registry.py` marks **sunset** with successor `claude-opus-5-5`.

None of these is broken today, but all three will fail silently or loudly when a vendor retires an
id, which is precisely the failure class `model_registry.py` was written to catch. The registry
cannot catch them because they do not route through it.

### 11.3 Model drift that reaches the user: the Copilot Recipe Generator

Separated from 10.2 because the consequence is different in kind. The other drift sites fail inside
a container, where an operator sees the error. This one **writes retired model ids into deliverables
the user takes away and builds against.**

`internal-solutions-copilot-recipe-generator/app.py` pins at module scope:

```python
MODEL                = "claude-opus-4-6"            # line 35   <-- SUNSET
RECIPE_MODEL_OPUS    = "claude-opus-4-6"            # line 38   <-- SUNSET
RECIPE_MODEL_SONNET  = "claude-sonnet-4-6"          # line 39
RECIPE_MODEL_HAIKU   = "claude-haiku-4-5-20251001"  # line 40
```

Those constants are substituted into generated recipe bodies at `app.py:566` and `app.py:915`, and
the system prompt asserts them as current fact under "RULE 45: CURRENT MODEL IDS (UPDATE THIS WHEN
MODELS CHANGE)", including guidance on which ids take a date suffix.

`proxy/model_registry.py` marks `claude-opus-4-6` **sunset** with successor `claude-opus-5-5`. The
registry cannot catch this, because the recipe generator never routes through the proxy.

**Fix shape:** have this service read `/api/models` (the seats endpoint, 4.8) at startup instead of
hardcoding, or at minimum move the four constants behind the registry so a sunset shows up as an
alarm. Until then, treat RULE 45 as a standing maintenance task: whenever
`CLAUDE_REASONING_MODEL` changes, grep this file.

### 11.4 The scrub defect class (read this before touching any text-cleaning function)

On 2026-11-09 a prose tidy, `/ +([.,;:])/g -> '$1'`, ran over whole HTML documents including
`<style>` blocks. Inside CSS that deletes the descendant combinator: `.brief .s-top` becomes
`.brief.s-top`, which matches an element carrying both classes, so it matches nothing. Documents
shipped with dead stylesheets: collapsed grids, serif fallback, and inline SVG exhibits falling back
to the SVG default `fill`, which is black. 34 of 69 artifacts had a `<style>` block; 57 were
repaired.

**Four copies of the same tidy existed**, found one at a time by regenerating different artifact
kinds:

1. `slidePostProcessor.scrubArtifactHtmlMeta`
2. `citationPointerRegistry.renderPointerCitationsHtml` (hid because it returns early when a
   document has no `.md#c` pointer)
3. `slidePostProcessor.stripEmoji` (reached via `artifactChain.scrubStrings`, which walks EVERY
   string including `html`)
4. `artifactExpertPanel.stripEmDashesInPlace` (same deep walk, through the expert panel)

The fix that closes the class rather than the instance: **each tidy exists only to clean up after
its own deletion, so each returns the input byte-identical when there is nothing to strip**, and
masks `<style>`, `<script>`, `<pre>`, `<code>`, `<textarea>` when it does strip
(`maskNonProseRegions`). `goldArtifact.scrubStageHtmlText` already did this correctly and was the
model to copy. Pins: `services/artifactCssIntegrity.test.ts` (15 cases),
`services/quizStemIntegrity.test.ts` (6), `services/prdVisualSlots.test.ts` (11).

A related trap in the same family: `test()` on a global regex is stateful. Keep a non-global twin
for presence checks (`EMOJI_PRESENT_RE`).

### 11.5 Operational traps

- **No HMR in the HiC container.** After editing anything under `humans-in-control-research/`:
  `docker compose -f docker-compose-all.yml up -d --build research-generator`, then hard-refresh.
  Skill `.md` files and `hic-workspace` are volume-mounted and do not need a rebuild; `.ts`/`.tsx`
  do.
- **Never rebuild under a live session.** Idle means no running jobs, no job polls and no
  post-chain traffic.
- **Proxy code is volume-mounted**, so `app.py` edits need only a container restart, and only if the
  change touches FastAPI app initialization. `requirements.txt` edits need `--build`.
- **The proxy binds `127.0.0.1:5012` explicitly** because Docker Desktop on Windows advertises
  `[::]:5012` without forwarding IPv6, and Chrome resolves `localhost` to `::1` first. Without the
  explicit IPv4 bind every browser request connected and hung.
- **`--legacy-peer-deps` is mandatory** for `npm install` in HiC.
- **`process.env.API_KEY` no longer exists in the bundle.** The service CLAUDE.md still says it is
  defined as `GEMINI_API_KEY` at `vite.config.ts:63-64`. That was removed by the 2026-10-30
  hardening (WS-0 S1). The only `define` left is `process.env.DESIGN_DESK_ENABLED`
  (`vite.config.ts:121-122`). See 11.6 below; do not write code that expects a provider key in the
  browser.
- **Vite uses `usePolling: true`** because inotify does not propagate through WSL2 mounts. Disable it
  and saved edits stop hot-reloading.
- **Proxy auth is on by default.** Leave `PROXY_AUTH_TOKEN` unset and the proxy generates one per
  start, publishing it to `hic-workspace/.runtime/config.json`, served as `/config.json`. Never
  print or materialize that token.
- **No provider key enters the browser bundle.** `npm run check:bundle-secrets` runs inside the
  Dockerfile build and fails the image if one does.
- **Large uploads**: `/api/parse-upload` and `/api/extract-pdf` run synchronously against PyPDF2; a
  500-page PDF can block ~60s. Do not shorten proxy timeouts without testing upload-heavy flows.
- **A stuck run is usually a parked review checkpoint**, not a crash. Diagnose by proxy silence plus
  the run's `state.json` stage.
- **`grep "Timeout (0:00"` in research-proxy logs** names event-loop blockers and worker deaths.

### 11.6 The browser holds no provider key (2026-10-30, WS-0 S1/S2)

This is the single most important security change in the platform's history, and the service
CLAUDE.md still documents the pre-change world. Before it, provider API keys were compiled into the
browser bundle through `vite.config.ts` `define`, and the browser called Gemini directly. Anyone who
could load the SPA held the keys, and every proxy control (outbound scrub, cache, cost meter, auth)
was bypassed.

Now:

- **`services/proxyConfig.ts`** is the one place the SPA learns where the proxy is and how to
  authenticate. A single fetch interceptor adds the shared token to every request aimed at the
  proxy, so the roughly 60 modules that hardcode `http://127.0.0.1:5012` needed no change and no new
  call site can forget the header.
- **`services/genaiClient.ts`** is the one constructor for the Google GenAI SDK in the browser.
  Every former `new GoogleGenAI({ apiKey: process.env.API_KEY })` goes through `makeGenAI()`, which
  passes the literal placeholder `'routed-through-proxy'` and points `baseUrl` at
  `${proxyBase()}/api/gemini-sdk`. The proxy replaces the `x-goog-api-key` header with the real key.
- **The token is runtime configuration, never a build-time constant.** nginx writes `/config.json`
  from the environment at container start; the Vite dev server serves the same shape from the
  environment at request time (`vite.config.ts:74-92`).
- **`npm run check:bundle-secrets` runs inside the Dockerfile build** and fails the image if a
  provider key reaches the bundle.
- `scripts/generateAspotImages.ts` and `scripts/generateExemplarPatterns.ts` still read
  `process.env.API_KEY`, which is correct: they are Node build scripts, not browser code.

If you are adding an AI call from the SPA, route it through the proxy. There is no other path, and
there should not be one.

### 11.7 Dead code that looks alive, and what to do about it

Three trees invite a successor to trust them. Each is traced in Section 2; this is the disposal
list.

| Tree | Lines | State | Action |
|---|---:|---|---|
| `internal-solutions-claude4-journey-mapper-v2/` | 26,383 | abandoned fork, duplicated root and `src/`, both copies older than the live service, `flask_app.py` imports two files that do not exist | delete or move to `archive/` with a README; port features into the live service instead of reviving |
| `internal-solutions-research-generator/` | 4,199 | the legacy HiC; still interpolates `GEMINI_API_KEY` into browser HTML and defaults to port 5011 | delete or archive; it demonstrates the pattern 10.6 forbids |
| `mcp-services/{linkedin,mulmocast,claude4-journey,openai-journey}-mcp/` | 3,111 | four wrappers with no compose service | delete the two whose core services are gone (`claude4-journey`, `openai-journey`); decide on `linkedin` and `mulmocast` |

None of these is an active exposure, because nothing starts them. The risk is a successor reading
them as current, which is why they are documented rather than only listed.

### 11.8 Known damage to the epoch audit trail (2026-11-10)

`hic-workspace/wiki/synthesis/improvement-epochs.md` currently contains epochs **1 to 13**. It is
missing **epochs 14 to 27**, which existed as uncommitted working-tree content and were destroyed on
2026-11-10 while this guide was being written. Cause: a `git checkout --` on that file, intended to
undo a single appended test record, reverted it to HEAD and discarded fourteen records written since
commit `ddea250af`. They were never staged, so they are not recoverable from git, the container
bind-mounts the same file, and no VSS snapshot exists.

**Repaired, in the only way it could be.** The content is gone, but its forward consequence was
fixable. `record_epoch` computes the next id as `max(existing ids) + 1`
(`scripts/skillopt-batch.sh:116`), so a ledger ending at 13 would have reissued 14 and produced two
different records under one id. A **tombstone block, `## Epoch 27 (TOMBSTONE, not a real epoch)`**,
was appended to the ledger recording the loss, its cause, the unrecoverable ids and the last good
commit. The append was verified to remove zero lines, and the live counter moved accordingly:

```
GET /api/epochs/status  ->  "next_epoch_id": 28     (was 14 before the repair)
```

Remaining consequences a successor must expect:

- The audit trail has a **gap, not a collision**. Ids 14 to 27 will never be issued; the tombstone
  explains why they are absent.
- Nothing in the repo referenced the lost ids, and no `_versions/` archive corresponds to them, so
  no skill state depends on them. The loss is historical record, not running behavior.
- If epoch provenance matters for a decision, treat anything citing an epoch between 14 and 27 as
  unverifiable.

The procedural lesson is in 11.10 and is the reason that section now names this file explicitly.

### 11.9 Dormant-by-absence, resolved

This section previously read that `hic-workspace/skillopt/` does not exist and that the promotion
path therefore had no local evidence of having run. A full nine-skill batch was executed on
2026-11-10 (9.2 carries the per-skill table). The directory still does not exist, and now the
reason is known and benign: **the incumbent skill won all nine pools, so no candidate was ever
written**, and proposals are produced only for a candidate that beats its incumbent.

What this does and does not tell a successor. It does establish that the pipeline runs end to end
against real rollouts: 680 optimizer calls, 72 scored candidates, nine clean rejections, no crash.
It does not establish that the promotion path works on live data, because nothing reached it. The
gate's four branches were exercised separately with scratch paths (9.2), not by this batch. Until a
`proposals/<batch>/` directory appears from a real win, treat promotion as verified in isolation
only.

### 11.10 Git discipline (non-negotiable)

- **Never merge to main.** Main is owner-controlled and runs months behind feature branches. Branch
  from the latest feature branch.
- **Never commit without the owner's explicit approval.** Stage and wait.
- **Never push to the NXT-Humans origin.**
- Build, then test, then commit, in that order.
- Hooks enforce the first three: `precheck_main_branch.py`, `precheck_commit_approval.py`.

---

## 12. Where to look first, by task

| You need to... | Start here |
|---|---|
| Change which model generates an artifact | `services/aiRouter.ts` `chooseArtifactModel` + `ARTIFACT_EVAL_REGISTRY`. Nothing else. |
| Change the Claude request shape | `services/claudeModelPolicy.ts` AND `proxy/model_registry.py::normalize_claude_body`. Both. |
| Add a deliverable type | `services/artifactCatalog.ts` first (the coverage tests fail otherwise), then the framework and anti-pattern wiki pages, then the template twins (`web.tsx` + `slideToStageHtml.ts` + `pptx.ts`), then the generator, then `deliverableFrameworks.ts`, then `slidePostProcessor` wiring, then the `types.ts` union. |
| Add a data source | One dict entry in `proxy/app.py` `SOURCES` or a pack module. No code change. |
| Fix output voice or slop | `.claude/CLAUDE.md` for the rule, `services/slidePostProcessor.ts` for runtime enforcement, `services/proseSignal.ts` for the measurement. |
| Fix a citation | `services/citationResolver.ts`, `citationPointerRegistry.ts`, `chunkRetrieval.describeChunkProvenance`. |
| Fix a broken PPTX | `proxy/gold_pptx_export.py`, and check `PX2PT`. Not `exportService.ts`, which is legacy. |
| Fix a diagram | `proxy/nxt_diagram_render.py`, and bump `_DIAGRAM_STYLE_VERSION`. |
| Fix theme yield | `services/deliverableChunkers.ts`, `proxy/topic_modeling.py`, the `theme-yield-guarantee` skill. Do not relax the gate. |
| Add an MCP service | Core service, wrapper with `tools/list` + `tools/call`, compose entry on `nxt-humans-network`, `tool_services` in the agent, restart the agent. |
| Understand why a run failed | The run's `state.json` stage, then `usage.jsonl`, then the per-stage `<stage>-<seq>-<model>.json` files, then proxy logs. |
| Add a self-improvement signal | `services/learningEngine.ts`. Remember: proposals only. The gate promotes. |
| Check platform health | `.claude/agents/platform-health.md`, or `/health` on each service. |

### Command crib

```bash
# platform
docker compose -f docker-compose-all.yml up -d
docker compose -f docker-compose-all.yml ps
docker compose -f docker-compose-all.yml logs -f research-proxy
docker compose -f docker-compose-all.yml up -d --build research-generator   # after any HiC frontend edit

# HiC gates
cd humans-in-control-research
npm run typecheck          # MANDATORY before shipping
npm run test               # vitest
npm run check:templates    # web.tsx <-> pptx.ts parity
npm run check:all          # everything
npx vitest run services/<file>.test.ts
npx vitest run -t "name pattern"

# self-improvement
npm run skillopt:dry-run
npm run eval
bash scripts/self-improvement-schedule.sh nightly

# social research
cd internal-solutions-socialresearch/backend && pytest
docker compose -f docker-compose-all.yml exec social-research-backend python app/db_init.py
```

---

## 13. The three documents to read after this one

1. **`.claude/CLAUDE.md`**: the output-quality contract. Brand tokens, citation protocol, evidence
   hierarchy, 350+ banned phrases, consulting frameworks, content budgets, action-title rules. It
   loads into every agent session and binds every generated artifact.
2. **`.claude/UNIFIED_VISION.md`** plus the `hic-unified-vision` skill: the eight principles and the
   nine-phase operational contract. Every plan should name the phase it advances.
3. **`humans-in-control-research/plans/`**: dated plans, most recent first. Check before starting any
   non-trivial HiC work; there is usually a plan to extend rather than duplicate. Plans older than
   ~2026-06-23 were deleted from the tree in cleanup commit `ba753863a` and live only in git history.

Per-service CLAUDE.md files exist in `humans-in-control-research/`,
`internal-solutions-journeymapper/`, `internal-solutions-claude4-journey-mapper-v2/`,
`internal-solutions-socialresearch/` and `NXT-Agency/`. Read the service one before working in it,
and correct it when it is wrong, which Section 10 says it sometimes is.
