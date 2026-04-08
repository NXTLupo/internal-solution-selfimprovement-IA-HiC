# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### NXT Agency (External Repo)
Source lives in `../NXT-Agency/` (sibling directory, not inside this repo). Integrated via `docker-compose-all.yml`. The backend connects to CX Workbench MCP services for CX tool access and exposes a noVNC browser viewport on port 6080 for live computer-use observation. The launchpad serves a pre-built Vite dist via Nginx — rebuild in `../NXT-Agency/agency-agents-launchpad/` if the frontend changes.

### Critical Files (modify with caution)
- `mcp-services/agent/app.py` — AI orchestrator; `tool_services` dict (~line 92) maps service names to MCP URLs
- `launchpad/app.py` — WebSocket proxy hub (~1,370 lines)
- `docker-compose-all.yml` — Full platform config (**always use this file**, never `docker-compose.yml` alone)

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
# Miro Generator (only service with full Jest setup)
cd internal-solutions-miro-generator
npm test                    # Jest with ts-jest
npm run test:coverage       # With coverage report

# Social Research Backend (pytest)
cd internal-solutions-socialresearch/backend
pytest                      # pytest>=7.4.0, pytest-cov>=4.1.0
```
Most services lack formal test suites — test via Docker health checks and manual validation.

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
| Research Generator | 5011 | hic-research | React 19, Vite, Gemini AI, human-in-loop |
| Copilot Recipe Generator | 5013 | copilot-recipe-generator | FastAPI + Vite React frontend, Claude Opus 4.6 |
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
- `internal-solutions-journeymapper/CLAUDE.md` — run commands, lint (`flake8`), type-check (`mypy`)
- `internal-solutions-claude4-journey-mapper-v2/CLAUDE.md` — same pattern, port 8095
- `internal-solutions-socialresearch/CLAUDE.md` — full local setup (frontend, backend, DB migrations with Alembic). **Python 3.11 required** (3.12 not supported).

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

The Research Generator was moved into this repo at `humans-in-control-research/` — a React 19 SPA (Vite + Gemini AI) with no backend. All AI calls happen client-side.

### Dockerfile Patterns
- **Layer caching**: Copy `requirements.txt`/`package.json` before source code
- **Multi-stage builds**: Research Generator (Node builder → serve runtime) and Social Research Frontend (Node builder → serve runtime)
- **Volume mounts in dev**: Docker Compose mounts source directories for live editing (e.g., `./launchpad:/app`)
- **CPU-only PyTorch**: Social Research Backend uses `--index-url https://download.pytorch.org/whl/cpu` to avoid CUDA bloat

### Frontend Tech Split
- **Modern Vite services**: Character Generator, Research Generator, Social Research Frontend (React 19, TypeScript, Vite 6)
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

**`openai_journey` in agent tool_services**: The agent references `OPENAI_JOURNEY_MCP_URL` but no matching `openai-journey-mcp` service exists in `docker-compose-all.yml`. This will silently fail tool discovery at startup — expected behavior until that service is added.

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
