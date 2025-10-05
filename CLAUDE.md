# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **LAST UPDATED**: December 2025 - Windows environment, 17+ services, innovation-alpha-005 branch

## 🚨 CRITICAL: Never Modify These Files

**Agent Core (MOST CRITICAL)**: `mcp-services/agent/app.py` controls the entire agent system
- **Working Backup**: `mcp-services/agent/app.py.backup.websocket_fix`
- **Recovery**: `cp mcp-services/agent/app.py.backup.websocket_fix mcp-services/agent/app.py`
- **Test After Changes**: Always run `python test_agent_tools_comprehensive.py`

**Other Critical Files**:
- `launchpad/app.py` - WebSocket proxy coordinator
- `port_scanner.py` - Port conflict resolution
- `launch.sh` - Primary startup script
- `docker-compose-all.yml` - Service registry

## Platform Overview

NXT Humans AI CX Workbench: Microservices platform for customer experience research with 17+ integrated services using Model Context Protocol (MCP) for unified AI agent orchestration.

**Architecture Flow**: `Browser → Launchpad (8000) → Agent (8500) → MCP Services (8501-8507) → Core Services`

## Quick Start Commands

```bash
# ESSENTIAL: First time setup (Windows: use Git Bash or PowerShell)
python test-anthropic-api.py && python test_openai_api.py  # Verify API keys
python port_scanner.py --fix                                # Fix port conflicts
docker --version                                            # Verify Docker Desktop running
./launch.sh                                                 # Start entire platform

# Development commands
docker compose -f docker-compose-all.yml ps                 # Check service status
docker compose -f docker-compose-all.yml logs -f agent      # View agent logs
docker compose -f docker-compose-all.yml restart agent      # Fix agent issues

# Emergency recovery
docker compose -f docker-compose-all.yml down && ./launch.sh
```

## Service Development

### Social Research Tool (Most Advanced Stack)
```bash
# Frontend: React 19 + TypeScript 5.7 + Vite 6 + Redux Toolkit
cd internal-solutions-socialresearch/frontend
npm install && npm run dev         # Dev server on port 5173
npm run build && npm run lint      # Build and lint check

# Backend: Flask + PostgreSQL 16 + pgvector
cd internal-solutions-socialresearch/backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python init_db.py && python -m run
```

### Journey Mappers

#### Claude 4 Journey Mapper (Port 8095) - RECOMMENDED
```bash
cd internal-solutions-claude4-journey-mapper-v2
python app.py                       # Auto-selects available port
# Features: 200K token analysis, extended thinking mode
```

#### Claude 3.7 Journey Mapper (Port 8080) - Legacy but stable
```bash
cd internal-solutions-journeymapper
python run.py                       # Standard journey mapping
```

### Miro Generator (Only Complete Testing)
```bash
cd internal-solutions-miro-generator
npm install && npm run build
npm test                            # Full test suite
npm run test:coverage               # Coverage report
npm run test:watch                  # Development mode
```

## Testing Strategy

### Python Services (68+ test scripts in root)
```bash
# Critical tests to run before commits
python test-anthropic-api.py       # Verify Anthropic API
python test_openai_api.py           # Verify OpenAI API
python test_agent_tools_comprehensive.py  # Agent integration
python test_agent_ws.py             # WebSocket connectivity
python test_whisper_api.py          # Video transcription

# Service-specific tests
python test_social_research_fix.py
python test_claude4_comprehensive_analysis.py
python test_video_transcriber.py
```

### TypeScript/JavaScript
```bash
# Only Miro Generator has complete test infrastructure
cd internal-solutions-miro-generator
npm test                            # Jest with 30s timeout
```

## Port Management

The platform includes sophisticated port conflict resolution via `port_scanner.py`:

```bash
python port_scanner.py              # Check for conflicts
python port_scanner.py --fix        # Auto-resolve conflicts
python port_scanner.py --kill 8080  # Kill specific port
```

**Core Service Ports**:
- 8000: Launchpad (WebSocket proxy)
- 8500: Agent (orchestrator) **CRITICAL**
- 8501-8507: MCP service wrappers
- 5001-5010: Core application services
- 8080-8095: Journey mapping services
- 3000/8081: Social Research (frontend/backend)

## Technology Stacks

### Modern Stack (Social Research)
- **Frontend**: React 19.0.0, TypeScript 5.7.2, Vite 6.1.0, Material-UI 6.4.3, Redux Toolkit 2.6.0
- **Backend**: Flask, PostgreSQL 16+, pgvector, BERTopic 0.15.0, VADER sentiment

### Professional CLI (Miro Generator)
- TypeScript 5.3.2, Commander.js 11.1.0, Jest 29.7.0
- Complete test coverage with path aliases (`@/`, `@cli/`, `@parsers/`)

### Legacy Stack (Journey Mappers)
- React 17.0.2, Webpack 5.64, Babel 7.16 (maintained for Mermaid compatibility)

## Windows Environment Notes

- **Docker Desktop** must be running (8GB+ RAM allocation)
- Use Git Bash, WSL, or PowerShell for bash scripts
- Path handling: Scripts use `os.path.join()` or `pathlib.Path`
- Port scanner uses Windows-specific commands (`netstat`, `tasklist`)

## API Key Configuration

Required in `.env` file (never commit):
```env
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key  # For Character Generator
```

## WebSocket Architecture

Known issues documented in `WEBSOCKET-FIX-DOCUMENTATION.md`:
- Hostname inconsistencies between containers
- Thread synchronization in proxy
- Missing ping/pong frames

**Fix**: `./backup-scripts/fix-websocket-connection.sh`

## Code Standards

### Python Services
- Type hints for functions
- Import grouping: stdlib, third-party, local
- 4-space indentation, 120 char limit
- Snake_case variables, PascalCase classes

### TypeScript (Miro Generator standard)
- ES2022 target, strict mode
- Path aliases: `@/`, `@cli/`, `@utils/`
- ESLint with explicit return types

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Agent not responding | `docker compose -f docker-compose-all.yml restart agent` |
| Port conflicts | `python port_scanner.py --fix` |
| API key errors | `python test-anthropic-api.py && python test_openai_api.py` |
| WebSocket issues | `./backup-scripts/fix-websocket-connection.sh` |
| Build failures | Check Docker Desktop running, 8GB+ RAM allocated |
| HTTPS warnings | `docker compose -f docker-compose-https.yml up -d` |

## Service-Specific Commands

### Single Service Development
```bash
cd internal-solutions-[service-name]
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python run.py  # or python app.py for FastAPI
```

### Docker Operations
```bash
docker compose -f docker-compose-all.yml up -d     # Start all
docker compose -f docker-compose-all.yml down      # Stop all
docker compose -f docker-compose-all.yml restart [service]
docker compose -f docker-compose-all.yml logs -f [service]
```

## MCP Service Registry

- Reddit MCP: 8501 → Reddit Ripper (5001)
- Social MCP: 8502 → Social Research (3000/8081)
- Journey MCP: 8503 → Journey Mapper Claude 3.7 (8080)
- Video MCP: 8504 → Video Analyzer (5002)
- OpenAI Journey MCP: 8505 → OpenAI Journey Mapper (8090)
- Claude4 Journey MCP: 8506 → Claude 4 Journey Mapper (8095)

## Recently Updated Services

### Reddit Ripper (Enhanced)
- **New**: Unified collector supporting Reddit + TrustPilot + Play Store
- **Architecture**: Factory pattern with source-specific collectors
- **Key Files**: `app_unified.py`, `services/collectors.py`
- **Models**: `models/trustpilot.py`, `models/playstore.py`
```bash
cd internal-solutions-reddit-ripper
python app_unified.py               # Unified app with multi-source support
```

### Presentation Generator
- **Port**: 5007
- **Features**: Claude integration, PowerPoint API, python-pptx
- **Key File**: `internal-solutions-presentation-generator/app.py` (190KB)

## Testing Gaps & Recommendations

**Current State**:
- ✅ Miro Generator: Complete Jest setup with coverage
- ⚠️ Python: 68+ scattered test files in root, no pytest.ini
- ❌ React Apps: No vitest or jest configuration

**TODO**: Consolidate Python tests into unified pytest framework with configuration file