# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Companion AGENTS.md files (load on demand)

This file is the platform-wide overview. Two deeper guides cover the surfaces you'll actually be editing — read them when the task touches their scope:

- **[.Codex/AGENTS.md](.Codex/AGENTS.md)** — *always loaded.* NXT design system, citation protocol, evidence hierarchy, 350+ banned phrases, consulting frameworks (Minto / Rumelt / SCQA), content budgets, action-title rules. Applies to every generated artifact in the repo. **Note:** the em-dash hard ban and other format rules apply to *generated output* (slides, deliverables, chat replies, JSON content fields, HTML body text) — not to this file or to other repo documentation. Do not rewrite AGENTS.md prose to strip em-dashes.
- **[humans-in-control-research/AGENTS.md](humans-in-control-research/AGENTS.md)** — read FIRST for any work under `humans-in-control-research/` (the most actively developed service). Covers the three-tier proxy/SPA/wiki architecture, the 18-template slide system, the `aiRouter.ts` provider routing, the `slidePostProcessor.ts` defense-in-depth layer, the `loadGenerationContext()` wiki-first retrieval contract, and the seven-step protocol for adding a new deliverable type.
- Service-local `AGENTS.md` files exist in `internal-solutions-journeymapper/`, `internal-solutions-claude4-journey-mapper-v2/`, `internal-solutions-socialresearch/`, and `NXT-Agency/` — read them when working in those services.

> **HiC VISION (load-bearing for `humans-in-control-research/`)**: HiC is an objective-first, manifest-native,
> evidence-cited, design-system-governed **Artifact Factory** — every run emits an Artifact Intermediate
> Representation (AIR), and the 8 Unified Vision principles bind at 9 workflow phases. Before non-trivial HiC
> work, read the **`hic-unified-vision`** skill, [.Codex/UNIFIED_VISION.md](.Codex/UNIFIED_VISION.md), and
> [humans-in-control-research/plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md](humans-in-control-research/plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md).

## Architecture Overview

NXT Humans Intelligence Augmentation Suite — a Docker-orchestrated microservices platform with an AI agent that controls specialized services via Model Context Protocol (MCP).

### Data Flow
```
Browser → Launchpad:8000 → Agent:8500 → MCP Wrappers (8501-8507) → Core Services
              ↓                ↓              ↓                          ↓
         WebSocket Proxy   Codex API    JSON-RPC 2.0              Business Logic
```

- **Launchpad** (`launchpad/app.py`): Flask web UI + WebSocket proxy. Routes browser↔agent messages with Flask-Sock, auto-reconnection, 20s ping/pong. Also serves service status dashboard and handles file upload forwarding.
- **Agent** (`mcp-services/agent/app.py`): FastAPI orchestrator using `AsyncAnthropic` client. Caches tool definitions from MCP services on startup via `fetch_and_cache_tools()`. Maintains in-memory conversation state. **Restart agent after any MCP service changes.**
- **MCP Wrappers** (`mcp-services/*/app.py`): Lightweight JSON-RPC 2.0 proxies that expose core services as tools for the agent.
- **Core Services** (`internal-solutions-*/`): Independent apps (FastAPI, Flask, or Node/Vite) each with their own Dockerfile.

### NXT Agency (Vendored In-Repo)
Source is now **vendored inside this repo at `./NXT-Agency/`** (commit `1c6ae4d10`) so the cowork agent works on a fresh clone — it is no longer an external `../NXT-Agency/` sibling. All four `docker-compose-all.yml` paths reference `./NXT-Agency`. The backend connects to CX Workbench MCP services for CX tool access and exposes a noVNC browser viewport on port 6080 for live computer-use observation. The launchpad now builds from `./NXT-Agency/agency-agents-launchpad/` (multi-stage Vite→Nginx Dockerfile) rather than serving a pre-committed dist — rebuild that service if the frontend changes. API keys come from the workbench root `.env` at runtime. The vendored tree excludes `.git`/`.env`/`node_modules`/`dist`/`generated-images`.

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
npm run skillopt:train-promote           # train + auto-promote accepted edits to .Codex/skills/

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
| Copilot Recipe Generator | 5013 | copilot-recipe-generator | FastAPI + Vite React frontend, Codex Opus 4.6 |
| Presentation Renderer | 5014 | presentation-renderer | React 19, Vite 6, framer-motion (scroll-driven render of HiC narrativeComposer payloads) |
| Journey Mapper | 8080 | journey-mapper | FastAPI, Codex Opus 4.5 |
| NXT Agency Launchpad | 5050 | nxt-agency-launchpad | Nginx serving pre-built Vite dist |
| NXT Agency Backend | 8201 | nxt-agency-backend | FastAPI, computer use, noVNC (6080) |
| NXT Agency DB | — | nxt-agency-db | PostgreSQL 15 (ai_assistant) |

## Key Implementation Patterns

### MCP Protocol (JSON-RPC 2.0)
```json
{"jsonrpc": "2.0", "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "tool_name", "arguments": {}}}
```

### Codex API Wrappers (Journey Mapper pattern)
Three wrapper styles exist in `internal-solutions-journeymapper/`:
- **`claude_api_wrapper.py`** — Raw HTTP `requests.post()` to Anthropic API. Uses `x-api-key` header, `anthropic-version: 2023-06-01`. Has SSL retry logic and 30-min timeout.
- **`claude_4_5_api.py` / `claude_3_7_api.py`** — Official `anthropic` SDK with `client.messages.create()`. Simpler, preferred for new code.

Several services have their own `AGENTS.md` with local dev commands:
- `.Codex/AGENTS.md` — HiC Research output quality rules (brand colors, citation protocol, 350+ banned phrases, consulting frameworks, content budgets). Loads into every Codex session.
- `internal-solutions-journeymapper/AGENTS.md` — run commands, lint (`flake8`), type-check (`mypy`)
- `internal-solutions-claude4-journey-mapper-v2/AGENTS.md` — same pattern, port 8095
- `internal-solutions-socialresearch/AGENTS.md` — full local setup (frontend, backend, DB migrations with Alembic). **Python 3.11 required** (3.12 not supported).

### Custom Agent Skills (`.Codex/skills/`)
70+ custom skills available to Codex sessions, spanning prompt engineering, consulting frameworks, and HiC pipeline stages. Used by HiC Research for deliverable generation (deck narrative, persona architecture, strategy authoring, etc.). The Vite dev server serves these at `/skills/` for runtime access. Key skills: `hic-unified-vision` (the nine-phase operational contract — read before non-trivial HiC work), `deck-composer`, `strategy-author`, `persona-architect`, `competitive-analyst`, `theme-analyst`, `infographic-composer` (binding depth contract for `slides:infographic-exhibit`, injected into DECK MODE), `preflight`, `qa-gate`, `verbalized-sampling`, `experience-prototype-composer`, `design-exemplar-curator`, `reinforcement-inference`, `critic-revise-loop`, `mind-map-architect`, `research-planner`, `meta-themes`.

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

### Vendored Service (formerly external)
- **NXT Agency**: `./NXT-Agency/` — FastAPI backend + Vite frontend, vendored in-repo (see "NXT Agency" above). Edit it in place; only `docker-compose-all.yml` references it. The upstream lives in a separate repo, so keep changes here mergeable back if you sync.

### Humans-in-Control Research (`humans-in-control-research/`)

The most actively developed service. A React 18 + TypeScript + Vite 6 + Tailwind SPA that generates consulting-grade research deliverables (strategy decks, persona sets, service blueprints, competitive analyses) using multi-model AI (Gemini, Codex, OpenAI).

**Flat project structure** — no `src/` directory. Components and services live at the root:
```
humans-in-control-research/
├── App.tsx, index.tsx, types.ts  — app entry, type definitions
├── components/                   — React components (FileUpload, ResultsView, KnowledgeGraph,
│                                   LiveProcessingIndicator, prototype viewer, etc.)
├── services/                     — TypeScript service modules — the application's brain:
│   ├── aiRouter.ts               — model selection + provider routing (Gemini-primary on
│   │                                Stage 2/5). Artifact hashtags force-route to Codex-opus-4-8
│   │                                (see corpusChatService.ts force-route + routing note below)
│   ├── deliverableModelRouter.ts — health-aware per-#deliverable model router with
│   │                                cross-provider fallback (Pro→Flash→2.5Flash→gpt-5.5);
│   │                                reorders by provider health, per-model timeouts
│   ├── multiModelResilience.ts   — content-hash embedding cache + provider health tracker +
│   │                                per-corpus provider commitment + signature-keyed LLM cache
│   ├── geminiService.ts          — primary AI provider
│   ├── anthropicService.ts       — Codex API integration
│   ├── openaiService.ts          — OpenAI / GPT-5.5 fallback (with DeepSeek auto-fallback)
│   ├── slidePostProcessor.ts     — defense-in-depth output sanitization (350+ slop phrases,
│   │                                meta-narration, process references, citations)
│   ├── wikiService.ts            — wiki knowledge base read/write
│   ├── knowledgeGraphBuilder.ts  — citation graph + knowledge visualization
│   ├── researchFabricOrchestrator.ts — multi-source data aggregation
│   ├── deliverableFrameworks.ts  — schema definitions for all deliverable types
│   ├── hashtagParser.ts          — composer hashtag routing (#proto, #presentations, etc.)
│   ├── slideToStageHtml.ts       — 1920x1080 #stage HTML twin (the PPTX export surface;
│   │                                web.tsx is the preview twin — keep both in sync)
│   ├── slideComposer.ts          — `slides:` deck-archetype registry composer (Figma 609
│   │                                archetypes incl. slides:infographic-exhibit)
│   └── exportService.ts          — LEGACY html2canvas/jspdf + pptxgenjs paths. The REAL deck
│                                    export is stage HTML → proxy /api/gold/export-pptx-multi
├── proxy/                        — Python CORS proxy (FastAPI, ~19,000 lines)
│   ├── app.py                    — 200+ data sources, 8 connector types (REST, RSS, CKAN,
│   │                                arXiv, etc.). Also proxies AI API calls + wiki writes
│   ├── gold_pptx_export.py       — NATIVE editable PPTX exporter (Playwright GEO walk →
│   │                                native shapes/text/pictures, per-variant chrome layouts;
│   │                                never full-slide rasters, never layout-backed pic
│   │                                placeholders — python-pptx clones those onto every slide)
│   └── nxt_diagram_render.py     — native GOLD exhibit renderer (/api/ai/diagram): journey/
│                                    arch/mindmap/blueprint diagrams + E4 infographic families
│                                    (HTML/CSS → Chromium PNG; cache salted by
│                                    _DIAGRAM_STYLE_VERSION — bump it on any style change)
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
                                    and agent skill files at /skills/ from ../.Codex/skills/
```

**Prototype pipeline (`#proto (experience name)` in the composer):** A multi-stage flow — Stage 1 brief, Stage 2 research, Stage 3 visual direction, Stage 3.5 catalog injection, Stage 4 prototype coder, Stage 5 deepen — composes prototypes exclusively from the AI Experience Patterns catalog at `hic-workspace/wiki/inspiration-hub/ai-patterns/` (92+ patterns). The `design-exemplar-curator` skill picks named Behance exemplars; the `experience-prototype-composer` skill enforces "no invented UI shapes, no generic Copilot shells." Skipping the catalog at Stage 3/3.5/4 is a known anti-pattern.

**Presentation render target (`#presentation #NXT` / `#presentation #NU`):** Unlike `#proto` (rendered inside the HiC SPA), the `#presentation` directive emits a `PresentationPayload` from `services/narrativeComposer.ts` and hands it to a **separate** service — `internal-solutions-presentation-renderer/` (container `presentation-renderer`, port 5014, React 19 + Vite 6 + framer-motion, scroll-driven; forked from Inner Focus). Brand resolution swaps NXT (chartreuse + teal) ↔ NU (Huskies red + near-black) via CSS variables. The renderer now carries 12 real section components (`src/sections/`: hero, context, evidence, personas, journey, competitive, gap-analysis, quotes, recommendations, roadmap, team, CTA) behind `registry.tsx`, and is wired for the Illustrator line-art visuals (2026-06-17) — still verify a specific section renders before depending on it.

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

**Artifact routing has ONE authority: `aiRouter.artifactModelFor`** (WS-E convergence, 2026-06-30 — the parallel routing maps that used to live in `corpusChatService` are deleted). Every artifact hashtag in Analyst chat (`#slides #journey #blueprint #personas #themes #recs #prd #gap #competitive #case-study #roadmap #audit #arch`) resolves through it: bake-off-validated SCHEMA/TABLE deliverables (gap-matrix, journey-map, service-blueprint, competitive-matrix, org-chart, systems-inventory, architecture-map, timeline) → `gemini-3.5-flash`; every other artifact (case-study, personas, themes, strategy, recs, report, prd, bare `#slides`) → `Codex-opus-4-8` (`OPUS_CAP_ACTIVE = false` in `aiRouter.ts` — flip that ONE flag if the Anthropic quota cap ever returns; while true, non-schema artifacts fall back to `gemini-3.1-pro-preview`). Plain non-hashtag chat defaults to `gemini-3.5-flash` and respects the model picker. Designer chat (`chatToSlideSpec`, `chatToFreeform`) also routes to Opus 4.8. **History:** artifacts previously force-routed to `Codex-fable-5`; Anthropic temporarily banned Fable 5, so routing was repointed to `Codex-opus-4-8`. The ban is LIFTED (live probe 2026-07-13) but code still routes Opus 4.8 — the swap-back and broader re-tier (Fable 5, gpt-5.6 sol/terra/luna, sonnet-5) is gated on the bake-offs in `plans/model-retier-frontier-2026-07-13.md`. (The older `fable-to-opus-swap-2026-06-13.md` plan that code comments cite was deleted in the `ba753863a` cleanup; the re-tier plan supersedes it.) **Gotcha:** `Codex-opus-4-8` (like `Codex-fable-5` and `opus-4-[789]`) rejects the `temperature` param with a 400; the proxy strips it at the `/api/ai/anthropic` chokepoint (`proxy/app.py` ~line 8403) — do not pass `temperature` to these models.

**Active work plans** live in `humans-in-control-research/plans/` — dated files dominate (most recent first). Recent and load-bearing: `model-retier-frontier-2026-07-13.md`, `gpt-5-6-prompt-cache-adoption-2026-07-13.md`, `browseros-live-capture-2026-07-13.md`, `slides-strategic-visual-uplift-2026-07-09.md`, `critique-rigor-implementation-2026-07-08.md`, `heuristic-audit-live-prototype-uplift-2026-07-05.md`, `artifact-total-elevation-2026-07-02.md`, `hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md` (v1 same name, no `-v2`, is the audit record), `end-to-end-workflow-ideal-vs-actual-handoff-2026-06-29.md`, `e2e-gap-validation-live-2026-06-29.md`, `model-usage-optimization-vs-ri-2026-06-28.md`, the `model-bakeoff-*` trio (2026-06-28/30), `prompt-caching-expertise-and-maximization-2026-06-28.md`, `prompt-caching-stack-2026-06-23.md`. Plans older than ~2026-06-23 (harness audits, design-system builds, the supercharge/NotebookLM/Karpathy uplifts) were deleted from the tree in the `ba753863a` cleanup — retrieve them from git history if a doc still cites one; do not expect them on disk. Check `plans/` before starting non-trivial HiC work — there may already be a plan to extend rather than duplicate.

**Output quality rules** live in `.Codex/AGENTS.md` — brand colors, citation protocol, banned phrases (350+), consulting frameworks (Minto, Rumelt, SCQA), content budgets. These load into every Codex session and apply to all deliverable generation.

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
- **Detailed guides**: [README.md](README.md) is the fresh-install walkthrough (macOS + Windows, one-command bring-up). The old `NXT_HUMANS_TRAINING_MANUALS.md` was deleted in the `ba753863a` cleanup — it lives only in git history.
