# NXT Humans Intelligence Augmentation Suite

A Docker-orchestrated microservices platform: an AI agent that controls specialized
CX/research/content services over the Model Context Protocol (MCP). The flagship surface is
**Humans in Control (HiC)** — a research workbench that turns a brief plus uploads into
consulting-grade deliverables (strategy decks, personas, journey maps, service blueprints,
PRDs, competitive analyses) using multi-model AI (Gemini, Claude, OpenAI).

---

## Setup (step by step)

Two paths. **Path A** runs just HiC locally with hot reload (fastest for development).
**Path B** runs the whole suite in Docker. Detailed reference for each step is in the sections
below.

### Path A — Run HiC locally (recommended for development)

**Step 1. Install prerequisites.** Docker Desktop, Node.js 20+, Python **3.11**, Git. On
Windows use **Git Bash**. (Details: *Prerequisites*.)

**Step 2. Get the code.**
```bash
git clone https://github.com/NXTLupo/internal-solution-selfimprovement-IA-HiC.git NXT-HUMANS_AI_CX_WORKBENCH
cd NXT-HUMANS_AI_CX_WORKBENCH
git checkout self-improvement-ia-2026-05-29
```

**Step 3. Create `.env`** in the repo root with at least:
```env
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...
```
(Full template: *Environment*.)

**Step 4. Start the research proxy** (Terminal 1 — required for all AI/search/wiki calls):
```bash
cd humans-in-control-research/proxy
python -m venv venv
source venv/Scripts/activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py                          # serves http://localhost:5012
```

**Step 5. Start the SPA** (Terminal 2):
```bash
cd humans-in-control-research
npm install --legacy-peer-deps         # the flag is REQUIRED
npm run dev                            # serves http://localhost:3000
```

**Step 6. One-time: rebuild the wiki semantic index** (proxy from Step 4 must be running):
```bash
curl -X POST "http://localhost:5012/api/wiki/chunks-backfill"
```

**Step 7. Use it.** Open **http://localhost:3000** -> pick **Research Analysis** /
**Design Desk** (or reload a saved session) -> in the **Analyst Desk** chat type a prompt; add
an artifact hashtag to generate a deliverable, e.g. `#slides #NXT a 6-slide retail strategy
deck`. Export decks as PPTX/PDF. (Hashtag list: *Using HiC*.)

### Path B — Run the full suite (Docker)

**Step 1-3.** Prerequisites + clone + `.env`, same as Path A.

**Step 4. Launch.**
```bash
./launch.sh                            # Windows PowerShell: ./start-platform.ps1
# ...or HiC only:
docker compose -f docker-compose-all.yml up -d --build research-proxy research-generator
```

**Step 5. One-time wiki index rebuild** (as Path A Step 6).

**Step 6. Open** http://localhost:8000 (Launchpad) or **http://localhost:5011** (HiC).
After any edit under `humans-in-control-research/`, **rebuild** (no hot reload in Docker):
`docker compose -f docker-compose-all.yml up -d --build research-generator` then hard-refresh.

> The compose file also defines `nxt-agency-*` services that build from a separate external
> repo not included here. They are not part of this setup — start an explicit service list (as
> above) or comment them out of `docker-compose-all.yml` if `docker compose up` (all) errors.

---

## Prerequisites

- **Docker Desktop** with Compose v2 (`docker compose`). 16 GB+ RAM recommended (8 GB / 4 cores min).
- **Git**.
- **Node.js 20+** + **npm** — local frontend dev / building HiC.
- **Python 3.11** — the HiC proxy runs on 3.11+; Social Research backend requires exactly 3.11.
- POSIX shell; on **Windows** use **Git Bash** (scripts assume Unix paths).

API keys: **required** `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`. **Optional, per
feature:** Reddit (`REDDIT_CLIENT_ID`/`SECRET`/`USER_AGENT`/`REDIRECT_URI`, plus
`REDDIT_USERNAME`/`PASSWORD` for Social Analytics), Miro (`MIRO_ACCESS_TOKEN` + `MIRO_BOARD_ID`),
`FIGMA_API_TOKEN`, `TAVILY_API_KEY`, `DEEPSEEK_API_KEY`, `YOUTUBE_API_KEY`. See *Environment*.

A fresh clone includes all source, the HiC `hic-workspace/wiki/` knowledge base (~11k markdown
files), and every manifest/registry. Gitignored (regenerated locally): `wiki/.vectors.db`
(embedding index, rebuilt in Step 6), `node_modules/`, Python `venv/`, `dist/`. **Never merge
to `main`** — branch from the latest feature branch (`CLAUDE.md`).

---

## Environment (`.env`)

Create `.env` in the repo root (no committed example; secrets are gitignored):

```env
# --- Required for HiC ---
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...

# --- Reddit (Social Data Collector :5001, Social Analytics :8081, HiC deep-reddit) ---
# Create an app at https://www.reddit.com/prefs/apps (type: "script").
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USER_AGENT=script:nxt-humans:1.0
REDDIT_REDIRECT_URI=http://localhost:5001/callback
REDDIT_USERNAME=...          # Social Analytics uses PRAW script auth (username + password)
REDDIT_PASSWORD=...

# --- Miro (Miro Board Generator :5004) ---
# Token from https://miro.com/app/settings/user-profile/apps (or a dev app); board = target board id.
MIRO_ACCESS_TOKEN=...
MIRO_BOARD_ID=...            # the Miro board the generator writes into

# --- Other optional ---
FIGMA_API_TOKEN=...
TAVILY_API_KEY=...
DEEPSEEK_API_KEY=...
YOUTUBE_API_KEY=...

# --- Database defaults (fine for local) ---
POSTGRES_USER=postgres
POSTGRES_DB=app
JWT_SECRET_KEY=change-me
```

Per-app variable map:
- **Social Data Collector** (`reddit-ripper`, :5001): `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`, `REDDIT_REDIRECT_URI`.
- **Social Analytics** (`social-research-backend`, :8081): the four above **plus** `REDDIT_USERNAME` + `REDDIT_PASSWORD` (PRAW script login).
- **Miro Board Generator** (`miro-generator`, :5004): `MIRO_ACCESS_TOKEN` + `MIRO_BOARD_ID`.
- **HiC deep-reddit** (research proxy): `REDDIT_CLIENT_ID`/`SECRET`/`USER_AGENT` (read-only, no login).

`GEMINI_API_KEY` is also exposed to the HiC frontend as `API_KEY` at build time (legacy paths)
— both come from this one variable. Verify a container received keys:
`docker compose -f docker-compose-all.yml exec research-proxy env | grep API_KEY`.

---

## Service + port map

| Service | Host port | Container | Tech |
|---|---|---|---|
| Launchpad Hub (entry) | 8000 | `launchpad` | Flask + WebSocket proxy |
| AI Agent orchestrator | 8500 | `agent` | FastAPI + AsyncAnthropic |
| Reddit / Social / Journey / Video / Research MCP | 8501-8507 | `*-mcp` | JSON-RPC 2.0 |
| Social Research Frontend | 3000 | `social-research-frontend` | React 19, Redux, MUI |
| Social Research Backend | 8081 | `social-research-backend` | FastAPI, BERTopic, VADER, pgvector |
| Reddit Collector | 5001 | `reddit-ripper` | Flask |
| Video Analyzer | 5002 | `video-analyzer` | FastAPI, Whisper, FFmpeg |
| Miro Generator | 5004 | `miro-generator` | TypeScript CLI |
| Character Generator | 5010 | `consistent-character-generator` | Gemini |
| **HiC Research (SPA)** | **5011** | **`hic-research`** | React 18, Vite 6, Tailwind |
| **HiC Research Proxy** | **5012** | **`research-proxy`** | FastAPI (~16k lines), 200+ sources |
| Copilot Recipe Generator | 5013 | `copilot-recipe-generator` | FastAPI + Vite |
| Presentation Renderer | 5014 | `presentation-renderer` | React 19, framer-motion |
| Journey Mapper | 8080 | `journey-mapper` | FastAPI, Claude Opus |

> **Port 3000 is Social Research, not HiC.** In Docker, HiC is **5011** (SPA) + **5012**
> (proxy). In local dev, the HiC SPA runs on **3000** (Vite) and the proxy on **5012**.

Health checks: `curl http://localhost:5012/api/wiki/index` (proxy) · `curl http://localhost:5011/` (SPA).

---

## Running HiC (detail)

HiC is three-tier: the React SPA, the Python research proxy (`:5012` — all AI/search/wiki
calls), and the persistent `hic-workspace/` knowledge base. Read
`humans-in-control-research/CLAUDE.md` for architecture and `.claude/CLAUDE.md` for
output-quality rules.

**Docker rebuild rule.** `research-generator` is nginx serving a prebuilt static `dist/` —
**no hot reload.** After editing anything under `humans-in-control-research/`:
`docker compose -f docker-compose-all.yml up -d --build research-generator`, then hard-refresh
(Ctrl+Shift+R). Local dev (`npm run dev`) has hot reload and avoids this.

**Wiki semantic index.** `hic-workspace/wiki/.vectors.db` is gitignored (154 MB, exceeds
GitHub's limit). The wiki markdown + chunk catalog it reads from are in the clone; regenerate
embeddings once with `curl -X POST http://localhost:5012/api/wiki/chunks-backfill`
(check `GET /api/wiki/embed-status`). Manifest-chunk retrieval + exact-text grounding work
without it; only embedding-ranked semantic search needs it.

**Before shipping any HiC change:**
```bash
cd humans-in-control-research
npm run typecheck        # tsc --noEmit - MANDATORY (vite build does NOT type-check)
npm run build            # vite build -> dist/
npm run test             # vitest unit suite
npm run check:templates  # slide-template parity (web.tsx <-> pptx.ts)
```

**Using HiC.** Plain Analyst-Desk questions answer from the corpus (Gemini 3.5 Flash). An
artifact **hashtag** generates a deliverable (force-routed to Claude Opus 4.8): `#slides`,
`#journey`, `#blueprint`, `#personas`, `#themes`, `#recommendations`, `#prd`, `#competitive`,
`#case-study`, `#roadmap`, `#org`, `#proto`, `#presentation`. Brand tags: `#NXT`
(chartreuse/teal) or `#NU` (Northeastern red/near-black). All sizes/colors/fonts resolve from
Figma-sourced tokens at `/api/design-tokens` (mirrored in
`hic-workspace/design-system/figma-tokens.json`); the slide composer + renderers read tokens,
never hardcoded values.

---

## Other services — local dev quickstarts

```bash
# Social Research backend (Python 3.11 REQUIRED)
cd internal-solutions-socialresearch/backend
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
docker compose -f ../../docker-compose-all.yml exec social-research-backend python app/db_init.py

# Social Research frontend
cd internal-solutions-socialresearch/frontend && npm install && npm run dev

# Miro Generator (TypeScript CLI)
cd internal-solutions-miro-generator && npm install && npm run build && npm test
```

Restart the agent after any MCP service change so it re-discovers tools:
`docker compose -f docker-compose-all.yml restart agent`.

---

## Troubleshooting

- **HiC code change not visible at `:5011`** -> skipped the rebuild: `docker compose -f docker-compose-all.yml up -d --build research-generator` + hard refresh.
- **HiC generation/search fails** -> proxy (`:5012`) down, or `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` missing. `docker compose -f docker-compose-all.yml logs -f research-proxy`.
- **Semantic search empty on a fresh clone** -> rebuild the vector index (Step 6).
- **`npm install` fails in HiC** -> you omitted `--legacy-peer-deps`.
- **`docker compose up` (all) errors on build** -> the `nxt-agency-*` services need an external repo; start an explicit service list or comment them out.
- **Port conflicts** -> `python port_scanner.py --fix`.
- **Full reset** -> `docker compose -f docker-compose-all.yml down -v && ./launch.sh` (destroys DB volumes).

---

## Repository layout + docs

```
NXT-HUMANS_AI_CX_WORKBENCH/
  docker-compose-all.yml        # the platform definition (always use this file)
  start-platform.ps1 / launch.sh
  launchpad/                    # Flask hub + WebSocket proxy (:8000)
  mcp-services/                 # MCP wrappers + the agent orchestrator
  internal-solutions-*/         # core services (socialresearch, video-analyzer, miro, ...)
  humans-in-control-research/   # HiC: SPA + proxy + hic-workspace (the flagship service)
  .claude/                      # agent skills, hooks, output-quality rules
  CLAUDE.md                     # platform architecture + conventions
```

- `CLAUDE.md` (root) - topology, port map, branch discipline, conventions.
- `humans-in-control-research/CLAUDE.md` - HiC architecture, slide system, provider routing.
- `.claude/CLAUDE.md` - output-quality rules (brand tokens, citation protocol, banned phrases).
- `humans-in-control-research/hic-workspace/AGENTS.md` - the wiki schema (read before any wiki read/write).

---

## License

Proprietary software. All rights reserved.

*Branch: `self-improvement-ia-2026-05-29` · NXT Humans Intelligence Augmentation Suite*
