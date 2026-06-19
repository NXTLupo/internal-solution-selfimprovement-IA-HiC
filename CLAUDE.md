# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Companion CLAUDE.md files (load on demand)

This file is the platform-wide overview. Two deeper guides cover the surfaces you'll actually be editing — read them when the task touches their scope:

- **[.claude/CLAUDE.md](.claude/CLAUDE.md)** — *always loaded.* NXT design system, citation protocol, evidence hierarchy, 350+ banned phrases, consulting frameworks (Minto / Rumelt / SCQA), content budgets, action-title rules. Applies to every generated artifact in the repo. **Note:** the em-dash hard ban and other format rules apply to *generated output* (slides, deliverables, chat replies, JSON content fields, HTML body text) — not to this file or to other repo documentation. Do not rewrite CLAUDE.md prose to strip em-dashes.
- **[humans-in-control-research/CLAUDE.md](humans-in-control-research/CLAUDE.md)** — read FIRST for any work under `humans-in-control-research/` (the most actively developed service). Covers the three-tier proxy/SPA/wiki architecture, the 18-template slide system, the `aiRouter.ts` provider routing, the `slidePostProcessor.ts` defense-in-depth layer, the `loadGenerationContext()` wiki-first retrieval contract, and the seven-step protocol for adding a new deliverable type.
- Service-local `CLAUDE.md` files exist in `internal-solutions-journeymapper/`, `internal-solutions-claude4-journey-mapper-v2/`, and `internal-solutions-socialresearch/` — read them when working in those services.

## Architecture Overview

NXT Humans Intelligence Augmentation Suite — a Docker-orchestrated microservices platform with an AI agent that controls specialized services via Model Context Protocol (MCP).

### Data Flow
```
Browser → Launchpad:8000 → Agent:8500 → MCP Wrappers (8501-8507) → Core Services
              ↓                ↓              ↓                          ↓
         WebSocket Proxy   Claude API    JSON-RPC 2.0              Business Logic
```

- **Launchpad** (`launchpad/app.py`): Flask web UI + WebSocket proxy. Routes browser↔agent messages with Flask-Sock, auto-reconnection, 20s ping/pong. Also serves service status dashboard and handles file upload forwarding.
- **Agent** (`mcp-services/agent/app.py`): FastAPI orchestrator using `AsyncAnthropic` client. Caches tool definitions from MCP services on startup via `fetch_and_cache_tools()`. Maintains in-memory conversation state. **Restart agent after any MCP service changes.**
- **MCP Wrappers** (`mcp-services/*/app.py`): Lightweight JSON-RPC 2.0 proxies that expose core services as tools for the agent.
- **Core Services** (`internal-solutions-*/`): Independent apps (FastAPI, Flask, or Node/Vite) each with their own Dockerfile.

### NXT Agency (External Repo — Required Sibling)
Source lives in `../NXT-Agency/` (sibling directory, not inside this repo). **`docker compose up` will fail if this directory doesn't exist** — the compose file references `../NXT-Agency/` for build context and volume mounts. The backend connects to CX Workbench MCP services for CX tool access and exposes a noVNC browser viewport on port 6080 for live computer-use observation. The launchpad serves a pre-built Vite dist via Nginx — rebuild in `../NXT-Agency/agency-agents-launchpad/` if the frontend changes.

### Critical Files (modify with caution)
- `mcp-services/agent/app.py` — AI orchestrator (~900 lines); `tool_services` dict maps service names to MCP URLs
- `launchpad/app.py` — WebSocket proxy hub (~1,200 lines)
- `docker-compose-all.yml` — Full platform config (~550 lines). **Always use this file**, never `docker-compose.yml` alone

### Branch & Commit Discipline
- **Never merge to main.** Main is owner-controlled and runs months behind feature branches. Branch FROM the latest feature branch (e.g., `HiC-*`) to inherit recent work — never from main.
- **Never commit without explicit user approval.** During multi-task work, stage changes and wait for the user to test each task's output before committing.
- **Build, then test, then commit** — in that order. HTTP 200 alone is not sufficient validation; verify the app actually renders / behaves before handing off.

### Dormant MCP Services
These exist in the filesystem but are **not** in `docker-compose-all.yml` or `tool_services`:
- `mcp-services/linkedin-mcp/` — LinkedIn integration (not wired up)
- `mcp-services/mulmocast-mcp/` — Podcast/multimodal cast (not wired up)
- `mcp-services/claude4-journey-mcp/` — Was removed from compose; `claude4-journey-mapper-v2` service also removed
- `mcp-services/openai-journey-mcp/` — Referenced in `tool_services` as `openai_journey` but has no compose service (silently fails at startup)

## Essential Commands

### Platform Startup
```bash
# Quick Start
start-platform.ps1         # Windows PowerShell (auto-starts Docker, validates keys)
./launch.sh                # Linux/Mac/Git Bash

# Docker Operations (always use docker-compose-all.yml)
docker compose -f docker-compose-all.yml up -d        # Start all
docker compose -f docker-compose-all.yml ps            # View status
docker compose -f docker-compose-all.yml logs -f [svc] # Check logs
docker compose -f docker-compose-all.yml restart [svc]  # Restart one service
docker compose -f docker-compose-all.yml down           # Stop all
docker compose -f docker-compose-all.yml down -v        # Full reset (destroys volumes)

# Port Conflicts
python port_scanner.py --fix     # Auto-fix before launch
```

### Development Workflows

All services use Docker volume mounts, so local file edits are reflected inside containers. For local (non-Docker) development:

#### Python Backend Services (FastAPI/Flask)
```bash
cd internal-solutions-[service-name]
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port [PORT]   # FastAPI
python app.py                             # Flask
```

#### Node/React Frontend Services (Vite)
```bash
cd internal-solutions-[service-name]
npm install
npm run dev       # Vite dev server with HMR
npm run build     # Production build
npm run lint      # ESLint (where configured)
```

#### Database (PostgreSQL + pgvector)
```bash
docker compose -f docker-compose-all.yml exec social-research-backend python app/db_init.py
docker compose -f docker-compose-all.yml exec social-research-db psql -U postgres
```
Credentials: `postgres`/`postgres`, database: `app`, pgvector 0.5.1 for semantic search.

### Testing
```bash
# HiC Research (vitest + tsc gate)
cd humans-in-control-research
npm run typecheck                        # tsc --noEmit — MANDATORY before shipping any HiC change
                                         # (vite build does NOT type-check; esbuild skips TS errors)
npm run test                             # vitest unit suite (jsdom; design-desk/ + services/)
npx vitest run services/corpusMergeAuthority.test.ts   # single test file
npx vitest run -t "name pattern"         # single test by name
npm run test:e2e                         # E2E deliverable tests — SLOW, requires live proxy :5012 + API keys
npm run check:templates                  # web.tsx ↔ pptx.ts slide-template parity check

# HiC SkillOpt — offline skill-training pipeline (mines hic-workspace rollouts → proposes skill edits)
npm run skillopt:all                     # extract rollouts → build training set → train (gated)
npm run skillopt:dry-run                 # propose skill edits without writing them
npm run skillopt:train-promote           # train + auto-promote accepted edits to .claude/skills/

# Miro Generator (Jest)
cd internal-solutions-miro-generator
npm test                    # Jest with ts-jest
npm run test:coverage       # With coverage report

# Social Research Backend (pytest)
cd internal-solutions-socialresearch/backend
pytest                      # pytest>=7.4.0, pytest-cov>=4.1.0
```
Other services lack formal test suites — test via Docker health checks and manual validation.

### Environment Validation
```bash
# Test API keys locally before launching
python test-anthropic-api.py
python test_openai_api.py

# Verify API keys in containers
docker compose -f docker-compose-all.yml exec agent env | grep API_KEY

# Health checks
docker compose -f docker-compose-all.yml exec agent curl -s http://localhost:8500/health
docker compose -f docker-compose-all.yml exec launchpad curl -s http://localhost:8000/health
```

## Service Port Map

| Service | Host Port | Container | Key Tech |
|---------|-----------|-----------|----------|
| Launchpad Hub | 8000 | launchpad | Flask + WebSocket proxy |
| AI Agent | 8500 | agent | FastAPI + AsyncAnthropic |
| Reddit MCP | 8501 | reddit-mcp | JSON-RPC 2.0 |
| Social MCP | 8502 | social-mcp | JSON-RPC 2.0 |
| Journey MCP | 8503 | journey-mcp | JSON-RPC 2.0 |
| Video MCP | 8504 | video-mcp | JSON-RPC 2.0 |
| Research MCP | 8507 | research-mcp | JSON-RPC 2.0 |
| Social Research Frontend | 3000 | social-research-frontend | React 19, Redux Toolkit, MUI, Vite |
| Social Research Backend | 8081 | social-research-backend | FastAPI, BERTopic, VADER, pgvector |
| Reddit Collector | 5001 | reddit-ripper | Flask (TrustPilot, Play Store too) |
| Video Analyzer | 5002 | video-analyzer | FastAPI, Whisper API, FFmpeg |
| Miro Generator | 5004 | miro-generator | TypeScript CLI, Jest |
| Character Generator | 5010 | consistent-character-generator | Gemini (Imagen 3, Veo 3.1), IndexedDB |
| Research Generator | 5011 | hic-research | React 18, Vite, Gemini AI, human-in-loop |
| Research Proxy | 5012 | research-proxy | Python proxy for HiC Research AI calls |
| Copilot Recipe Generator | 5013 | copilot-recipe-generator | FastAPI + Vite React frontend, Claude Opus 4.6 |
| Presentation Renderer | 5014 | presentation-renderer | React 19, Vite 6, framer-motion (scroll-driven render of HiC narrativeComposer payloads) |
| Journey Mapper | 8080 | journey-mapper | FastAPI, Claude Opus 4.5 |
| NXT Agency Launchpad | 5050 | nxt-agency-launchpad | Nginx serving pre-built Vite dist |
| NXT Agency Backend | 8201 | nxt-agency-backend | FastAPI, computer use, noVNC (6080) |
| NXT Agency DB | — | nxt-agency-db | PostgreSQL 15 (ai_assistant) |

## Key Implementation Patterns

### MCP Protocol (JSON-RPC 2.0)
```json
{"jsonrpc": "2.0", "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "tool_name", "arguments": {}}}
```

### Claude API Wrappers (Journey Mapper pattern)
Three wrapper styles exist in `internal-solutions-journeymapper/`:
- **`claude_api_wrapper.py`** — Raw HTTP `requests.post()` to Anthropic API. Uses `x-api-key` header, `anthropic-version: 2023-06-01`. Has SSL retry logic and 30-min timeout.
- **`claude_4_5_api.py` / `claude_3_7_api.py`** — Official `anthropic` SDK with `client.messages.create()`. Simpler, preferred for new code.

Several services have their own `CLAUDE.md` with local dev commands:
- `.claude/CLAUDE.md` — HiC Research output quality rules (brand colors, citation protocol, 350+ banned phrases, consulting frameworks, content budgets). Loads into every Claude Code session.
- `internal-solutions-journeymapper/CLAUDE.md` — run commands, lint (`flake8`), type-check (`mypy`)
- `internal-solutions-claude4-journey-mapper-v2/CLAUDE.md` — same pattern, port 8095
- `internal-solutions-socialresearch/CLAUDE.md` — full local setup (frontend, backend, DB migrations with Alembic). **Python 3.11 required** (3.12 not supported).

### Custom Agent Skills (`.claude/skills/`)
70+ custom skills available to Claude Code sessions, spanning prompt engineering, consulting frameworks, and HiC pipeline stages. Used by HiC Research for deliverable generation (deck narrative, persona architecture, strategy authoring, etc.). The Vite dev server serves these at `/skills/` for runtime access. Key skills: `deck-narrative-composer`, `strategy-author`, `persona-architect`, `competitive-analyst`, `theme-analyst`, `preflight`, `qa-gate`, `verbalized-sampling`, `experience-prototype-composer`, `design-exemplar-curator`, `reinforcement-inference`, `critic-revise-loop`, `mind-map-architect`, `research-planner`, `meta-themes`.

### Service Code Conventions
```python
# All services must have a health endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "name"}

# API keys from environment, never hardcoded
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Retry with exponential backoff for API calls
for attempt in range(max_retries):
    try:
        response = client.messages.create(...)
        break
    except Exception:
        if attempt < max_retries - 1:
            time.sleep(2 ** attempt)
        else:
            raise
```

### External Repo Dependencies
One service builds from a sibling directory outside this repo:
- **NXT Agency**: `../NXT-Agency/` — FastAPI backend + Vite frontend

Changes to this service require working in its respective repo. Only `docker-compose-all.yml` references it.

### Humans-in-Control Research (`humans-in-control-research/`)

The most actively developed service. A React 18 + TypeScript + Vite 6 + Tailwind SPA that generates consulting-grade research deliverables (strategy decks, persona sets, service blueprints, competitive analyses) using multi-model AI (Gemini, Claude, OpenAI).

**Flat project structure** — no `src/` directory. Components and services live at the root:
```
humans-in-control-research/
├── App.tsx, index.tsx, types.ts  — app entry, type definitions
├── components/                   — React components (FileUpload, ResultsView, KnowledgeGraph,
│                                   LiveProcessingIndicator, prototype viewer, etc.)
├── services/                     — TypeScript service modules — the application's brain:
│   ├── aiRouter.ts               — model selection + provider routing (Gemini-primary on
│   │                                Stage 2/5). Artifact hashtags force-route to claude-opus-4-8
│   │                                (see corpusChatService.ts force-route + routing note below)
│   ├── deliverableModelRouter.ts — health-aware per-#deliverable model router with
│   │                                cross-provider fallback (Pro→Flash→2.5Flash→gpt-5.5);
│   │                                reorders by provider health, per-model timeouts
│   ├── multiModelResilience.ts   — content-hash embedding cache + provider health tracker +
│   │                                per-corpus provider commitment + signature-keyed LLM cache
│   ├── geminiService.ts          — primary AI provider
│   ├── anthropicService.ts       — Claude API integration
│   ├── openaiService.ts          — OpenAI / GPT-5.5 fallback (with DeepSeek auto-fallback)
│   ├── slidePostProcessor.ts     — defense-in-depth output sanitization (350+ slop phrases,
│   │                                meta-narration, process references, citations)
│   ├── wikiService.ts            — wiki knowledge base read/write
│   ├── knowledgeGraphBuilder.ts  — citation graph + knowledge visualization
│   ├── researchFabricOrchestrator.ts — multi-source data aggregation
│   ├── deliverableFrameworks.ts  — schema definitions for all deliverable types
│   ├── hashtagParser.ts          — composer hashtag routing (#proto, #presentations, etc.)
│   └── exportService.ts          — PPTX (pptxgenjs) + PDF (jspdf) export
├── proxy/                        — Python CORS proxy (FastAPI, ~16,000 lines)
│   └── app.py                    — 200+ data sources, 8 connector types (REST, RSS, CKAN,
│                                   arXiv, etc.). Also proxies AI API calls + wiki writes
├── hic-workspace/                — persistent knowledge base
│   ├── wiki/                     — topic directories (benchmarks, frameworks, evidence,
│   │                                synthesis, inspiration-hub/ai-patterns, etc.)
│   ├── sources/                  — client uploads + research articles
│   └── sessions/                 — per-run state (chat, corpus, knowledge graph, etc.)
├── exemplar-skills/              — load-bearing reference library for Stage 3/4 prototypes
├── hooks/                        — runtime hooks (e.g., constraint injection)
├── plans/                        — active multi-item uplift plans (HTML-as-default,
│                                   verbalized-sampling, reinforcement-inference, …)
├── design-desk/                  — design notes + deferred UX items
├── styles/                       — NXT design system CSS
└── vite.config.ts                — custom plugins serve wiki markdown at /hic-workspace/wiki/
                                    and agent skill files at /skills/ from ../.claude/skills/
```

**Prototype pipeline (`#proto (experience name)` in the composer):** A multi-stage flow — Stage 1 brief, Stage 2 research, Stage 3 visual direction, Stage 3.5 catalog injection, Stage 4 prototype coder, Stage 5 deepen — composes prototypes exclusively from the AI Experience Patterns catalog at `hic-workspace/wiki/inspiration-hub/ai-patterns/` (92+ patterns). The `design-exemplar-curator` skill picks named Behance exemplars; the `experience-prototype-composer` skill enforces "no invented UI shapes, no generic Copilot shells." Skipping the catalog at Stage 3/3.5/4 is a known anti-pattern.

**Presentation render target (`#presentation #NXT` / `#presentation #NU`):** Unlike `#proto` (rendered inside the HiC SPA), the `#presentation` directive emits a `PresentationPayload` from `services/narrativeComposer.ts` and hands it to a **separate** service — `internal-solutions-presentation-renderer/` (container `presentation-renderer`, port 5014, React 19 + Vite 6 + framer-motion, scroll-driven; forked from Inner Focus). Brand resolution swaps NXT (chartreuse + teal) ↔ NU (Huskies red + near-black) via CSS variables. As of this writing the renderer is **scaffolding only** (payload contract + brand tokens; section components are a later iteration) — do not assume a slide type renders until verified.

**Local development:**
```bash
cd humans-in-control-research
npm install --legacy-peer-deps && npm run dev    # Vite dev server on port 3000
# Proxy (separate terminal):
cd proxy && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python app.py   # Port 5012
```

**Docker**: `research-generator` (container: `hic-research`, port 5011) + `research-proxy` (port 5012). The proxy volume-mounts `hic-workspace/wiki/` so wiki writes from the container persist to the host.

**Rebuild required on every frontend change** — the HiC container is nginx serving a static Vite dist with **no HMR**. After editing anything under `humans-in-control-research/`, run `docker compose -f docker-compose-all.yml up -d --build research-generator` and hard-refresh the browser. Port `3000` belongs to **Social Research**, not HiC — never suggest `npm run dev` on `:3000` for HiC work.

**Artifact generation routes to Claude Opus 4.8.** Every artifact hashtag in Analyst chat (`#slides #journey #blueprint #personas #themes #recs #prd #gap #competitive #case-study #roadmap #audit #arch`) force-routes generation to `claude-opus-4-8` inside `corpusChatService.sendChatMessage` (before grounding-context budgeting). Plain non-hashtag chat defaults to `gemini-3.5-flash` and respects the model picker. Designer chat (`chatToSlideSpec`, `chatToFreeform`) also routes to Opus 4.8. **History:** artifacts previously force-routed to `claude-fable-5`; Anthropic temporarily banned Fable 5, so all routing was repointed to `claude-opus-4-8` (reverse via `plans/fable-to-opus-swap-2026-06-13.md` once the ban lifts). **Gotcha:** `claude-opus-4-8` (like `claude-fable-5` and `opus-4-[789]`) rejects the `temperature` param with a 400; the proxy strips it at the `/api/ai/anthropic` chokepoint (`proxy/app.py` ~line 8403) — do not pass `temperature` to these models.

**Active work plans** live in `humans-in-control-research/plans/` — dated files dominate (most recent first). Recent and load-bearing: `hic-supercharge-plan-2026-06-12.md`, `fable-5-swap-and-anti-rag-2026-06-12.md`, `harness-master-roadmap-2026-06-02.md`, `harness-architecture-audit-2026-06-02.md`, `harness-rehardening-2026-06-02.md`, `nxt-design-system-200-build-2026-06-01.md`, `design-system-wiki-catalog-2026-06-01.md`, `end-to-end-lifecycle-assessment-2026-05-31.md`, `journey-retrieval-pipeline-fix-2026-05-31.md`, `preview-vs-export-parity-audit-2026-05-29.md`, `karpathy-second-brain-uplift.md`, `hic-notebooklm-uplift-plan-2026-05-24.md`, `hic-honest-audit-and-remediation-2026-05-23.md`. Older but still-referenced: `html-as-default-output-uplift.md`, `verbalized-sampling-uplift.md`, `reinforcement-inference-uplift.md`. Check there before starting non-trivial HiC work — there may already be a plan to extend rather than duplicate.

**Output quality rules** live in `.claude/CLAUDE.md` — brand colors, citation protocol, banned phrases (350+), consulting frameworks (Minto, Rumelt, SCQA), content budgets. These load into every Claude Code session and apply to all deliverable generation.

The legacy directory `internal-solutions-research-generator/` still exists but Docker builds from `humans-in-control-research/`.

### Dockerfile Patterns
- **Layer caching**: Copy `requirements.txt`/`package.json` before source code
- **Multi-stage builds**: Research Generator (Node builder → serve runtime) and Social Research Frontend (Node builder → serve runtime)
- **Volume mounts in dev**: Docker Compose mounts source directories for live editing (e.g., `./launchpad:/app`)
- **CPU-only PyTorch**: Social Research Backend uses `--index-url https://download.pytorch.org/whl/cpu` to avoid CUDA bloat

### Frontend Tech Split
- **HiC Research SPA**: `humans-in-control-research/` (React 18.3, TypeScript 5.8, Vite 6, Tailwind 3.4, pptxgenjs/jspdf for export, vitest). Flat structure — no `src/` directory.
- **Modern Vite services**: Character Generator, Social Research Frontend (React 19, TypeScript, Vite 6)
- **Embedded Vite frontend**: Copilot Recipe Generator has a `frontend/` subdirectory (React + Vite); build with `cd frontend && npm install && npm run build` before the FastAPI backend serves the static dist.
- **Legacy webpack**: Journey Mapper (React 17, webpack 5, but frontend is mostly vanilla JS + HTML templates)
- **TypeScript CLI**: Miro Generator (Node CLI with Jest tests)

## Adding New Services

1. Create core service in `internal-solutions-[name]/` with app.py, requirements.txt, Dockerfile
2. Create MCP wrapper in `mcp-services/[name]-mcp/` implementing `tools/list` and `tools/call`
3. Add both to `docker-compose-all.yml` on network `nxt-humans-network`
4. Register MCP URL in `tool_services` dict in `mcp-services/agent/app.py`
5. Restart agent: `docker compose -f docker-compose-all.yml restart agent`

## Troubleshooting

**Port Conflicts**: `python port_scanner.py --fix` (or `lsof -ti:PORT | xargs kill -9` on Linux, `taskkill /PID [PID] /F` on Windows)

**Agent/Chat Not Responding**: Check agent logs first, then restart:
```bash
docker compose -f docker-compose-all.yml logs -f agent
docker compose -f docker-compose-all.yml restart agent
```

**Container Name Gotchas**: Use exact names from docker-compose:
- `consistent-character-generator` (not character-generator)
- `social-research-frontend` / `social-research-backend` (not socialresearch-*)
- `hic-research` (container name for research-generator)

**`openai_journey` in agent tool_services**: See "Dormant MCP Services" above — silently fails tool discovery at startup. Expected behavior.

**NXT Agency DB Issues**: Separate PostgreSQL instance (`nxt-agency-db`, database `ai_assistant`). Not shared with Social Research DB.

**API Keys**: Verify they're reaching containers: `docker compose -f docker-compose-all.yml exec agent env | grep API_KEY`

**Full Reset**: `docker compose -f docker-compose-all.yml down -v && ./launch.sh`

## Environment & Platform Notes

- **Primary dev environment**: Windows 11 with Git Bash. Use Unix path separators in scripts.
- **Required API keys**: `ANTHROPIC_API_KEY` (required), `OPENAI_API_KEY`, `GEMINI_API_KEY` (for Character Generator/Research Generator)
- **Optional keys**: `REDDIT_CLIENT_ID`/`SECRET`, `MIRO_ACCESS_TOKEN`, `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`
- **Config**: All in root `.env` file. Service-specific `.env.example` files exist in some service directories.
- **Resources**: Min 8GB RAM, 4 cores; recommended 16GB+ RAM for full platform
- **Detailed guides**: [NXT_HUMANS_TRAINING_MANUALS.md](NXT_HUMANS_TRAINING_MANUALS.md)
