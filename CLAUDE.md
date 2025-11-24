# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

The NXT Humans Intelligence Augmentation Suite is a **microservices platform** with 14 integrated AI-powered applications. The system follows a distributed architecture where each service runs in its own Docker container, communicating through a unified network.

### Core Communication Flow
```
Browser → Launchpad (8000) → Agent (8500) → MCP Services (8501+) → Core Services (5001+, 8080+)
                                    ↓
                            JSON-RPC 2.0 Protocol
                                    ↓
                        [tools/list, tools/call methods]
```

### Critical Services
- **Launchpad** ([launchpad/app.py](launchpad/app.py)): Central hub and WebSocket proxy - routes all frontend communication to the AI agent with thread-safe message forwarding
- **AI Agent** ([mcp-services/agent/app.py](mcp-services/agent/app.py)): Core orchestrator using Claude API and JSON-RPC 2.0 for tool discovery/execution - **modify with extreme caution**
- **MCP Wrappers** ([mcp-services/*/app.py](mcp-services/)): Lightweight protocol adapters exposing core services to the agent via Model Context Protocol (JSON-RPC 2.0)

## Common Development Tasks

### Starting the Platform
```bash
# Full platform launch (recommended)
./launch.sh              # Linux/Mac/Git Bash
launch-windows.bat       # Windows Command Prompt
launch-windows.ps1       # Windows PowerShell

# Check and fix port conflicts before launch
python port_scanner.py --fix

# View running services
docker compose -f docker-compose-all.yml ps

# Check logs for specific service
docker compose -f docker-compose-all.yml logs -f [service-name]

# Restart a service (use actual container names - see Service Port Map below)
docker compose -f docker-compose-all.yml restart consistent-character-generator
docker compose -f docker-compose-all.yml restart social-research-frontend

# Stop all services
docker compose -f docker-compose-all.yml down

# Full reset (removes volumes and networks)
docker compose -f docker-compose-all.yml down -v
```

### Running Tests
```bash
# IMPORTANT: All test files with hardcoded API keys have been removed for security
# Tests are no longer available in this repository

# To verify API keys are set correctly:
# Windows Command Prompt
echo %ANTHROPIC_API_KEY%
echo %OPENAI_API_KEY%

# Windows PowerShell
echo $env:ANTHROPIC_API_KEY
echo $env:OPENAI_API_KEY

# Linux/Mac/Git Bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

### Frontend Development

#### Social Research Frontend (React 19 + TypeScript 5.7 + Vite)
**Location**: `internal-solutions-socialresearch/frontend`
**Port**: 5173 (dev server) → proxied to 3000 in Docker
**Tech**: React 19.0.0, TypeScript 5.7.2, Vite 6.1.0, Material-UI 6.4.3, Redux Toolkit 2.6.0

```bash
cd internal-solutions-socialresearch/frontend
npm install
npm run dev      # Vite dev server with HMR on port 5173
npm run build    # TypeScript compilation + production build
npm run lint     # ESLint with TypeScript support
npm run preview  # Preview production build locally
```

**Proxy Configuration**: Vite proxies `/api/*` requests to backend at `http://localhost:8081` (see [vite.config.ts](internal-solutions-socialresearch/frontend/vite.config.ts))

#### Character Generator (React + TypeScript + Vite)
**Location**: `internal-solutions-consistent-character-generator`
**Port**: 5010
**Tech**: Flask backend, React frontend, Google Gemini API (Imagen 3, Veo 3.1)

```bash
cd internal-solutions-consistent-character-generator
npm install
npm run dev      # Development server with HMR
npm run build    # Production build to dist/
```

**Key Files**:
- [services/geminiService.ts](internal-solutions-consistent-character-generator/services/geminiService.ts): Gemini API integration (character/scene/video generation)
- [types.ts](internal-solutions-consistent-character-generator/types.ts): TypeScript type definitions
- [App.tsx](internal-solutions-consistent-character-generator/App.tsx): Main UI orchestration
- IndexedDB stores: characters, scenes, objects, videoClips

### Backend Development

#### FastAPI Services
Used by: Video Analyzer, Journey Mapper (both versions), LinkedIn Generator, Image Captioner, Presentation Generator

```bash
cd internal-solutions-[service-name]
python -m venv venv

# Activate virtual environment
source venv/bin/activate       # Linux/Mac/Git Bash
venv\Scripts\activate          # Windows Command Prompt
venv\Scripts\Activate.ps1      # Windows PowerShell

pip install -r requirements.txt
uvicorn app:app --reload --port [PORT]
```

#### Flask Services
Used by: Launchpad, Reddit Ripper, Character Generator

```bash
cd [service-directory]
python -m venv venv
# Activate venv as shown above
pip install -r requirements.txt
python app.py
```

#### Social Research Backend Architecture
**Location**: `internal-solutions-socialresearch/backend`
**Port**: 8081
**Framework**: FastAPI with async support
**Database**: PostgreSQL 16 with pgvector extension

**Key Components**:
- **Topic Modeling**: [BertTopic.py](internal-solutions-socialresearch/backend/util/topic_model/BertTopic.py) - Main topic modeling logic
- **Sentiment Analysis**: [sentiment_analyzer.py](internal-solutions-socialresearch/backend/util/topic_model/sentiment_analyzer.py) - VADER sentiment analysis
- **Vector Search**: [pgvector.py](internal-solutions-socialresearch/backend/util/llm_models/pgvector/pgvector.py) - Semantic search with embeddings
- **LLM Providers**: [llm_provider.py](internal-solutions-socialresearch/backend/util/llm_models/llm_provider.py) - Supports Claude, OpenAI, Gemini, Mistral
- **Data Sources**: [reddit_fetcher_topic_model.py](internal-solutions-socialresearch/backend/util/data_source/reddit_fetcher_topic_model.py)

**API Routes**:
- `/api/reddit/*` - Reddit data collection
- `/api/topic-model/*` - Topic modeling and analysis
- `/api/pgvector/*` - Vector search and RAG
- `/api/llm-analyzer/*` - LLM-based analysis

### Database Operations (Social Research)
```bash
# Initialize PostgreSQL with pgvector (run from backend directory)
cd internal-solutions-socialresearch/backend
python app/db_init.py

# Or initialize from within running container
docker compose -f docker-compose-all.yml exec social-research-backend python app/db_init.py

# Check pgvector extension status
docker compose -f docker-compose-all.yml exec social-research-db psql -U postgres -c "SELECT * FROM pg_extension WHERE extname='vector';"

# Access PostgreSQL shell directly
docker compose -f docker-compose-all.yml exec social-research-db psql -U postgres

# View database tables
docker compose -f docker-compose-all.yml exec social-research-db psql -U postgres -c "\dt"
```

**Database Schema**:
- `reddit_posts` - Raw Reddit post data
- `reddit_comments` - Comment data
- `jobs` - Background job tracking for topic modeling
- Vector embeddings stored using pgvector for semantic search

## Service-Specific Details

### Character Generator (Port 5010)
**Tech Stack**: Flask backend, React + TypeScript + Vite frontend, Google Gemini API (Imagen 3, Veo 3.1)
**Container**: `consistent-character-generator`

**Key Features**:
- Character consistency using Imagen 3's reference image capabilities
- Scene composition with multiple characters
- Video generation with Veo 3.1
- Audio-to-video sync (experimental via [AudioSyncVideoGenerator.tsx](internal-solutions-consistent-character-generator/components/AudioSyncVideoGenerator.tsx))
- IndexedDB for browser-based persistence (no backend database required)

**Important Files**:
- [services/geminiService.ts](internal-solutions-consistent-character-generator/services/geminiService.ts): Core Gemini API integration
- [services/audioAnalysisService.ts](internal-solutions-consistent-character-generator/services/audioAnalysisService.ts): Audio-to-video feature analysis
- [types.ts](internal-solutions-consistent-character-generator/types.ts): TypeScript type definitions
- [App.tsx](internal-solutions-consistent-character-generator/App.tsx): Main UI orchestration

**Veo 3.1 Video Generation**:
- Model: `veo-3.1-fast-generate-preview`
- Async operation with polling via `getVideosOperation()`
- Handles safety filter rejections with clear error messages
- Typical generation time: 2-3 minutes
- API key must be passed in URL for browser access to videos

### Social Research Analytics (Port 3000/8081)
**Tech Stack**: React 19 + TypeScript 5.7 frontend, FastAPI + PostgreSQL 16 backend
**Container Names**: `social-research-frontend`, `social-research-backend`, `social-research-db`

**Key Features**:
- **Topic Modeling**: BERTopic with HDBSCAN clustering and UMAP dimensionality reduction
- **Sentiment Analysis**: VADER (Valence Aware Dictionary and sEntiment Reasoner)
- **Vector Search**: pgvector extension for semantic similarity search
- **RAG**: Retrieval-Augmented Generation for contextual Q&A
- **Multi-source Data**: Reddit, TrustPilot, Google Play Store reviews

**Technology Stack**:
- **Frontend**: React 19, Redux Toolkit, Material-UI, D3.js for visualizations
- **Backend**: FastAPI with async support, SQLAlchemy ORM, Alembic migrations
- **ML Models**: sentence-transformers for embeddings, BERTopic for topic extraction
- **Database**: PostgreSQL 16 with pgvector (1.5M+ embeddings tested)

**Workflow**:
1. Data collection via [reddit_fetcher_topic_model.py](internal-solutions-socialresearch/backend/util/data_source/reddit_fetcher_topic_model.py)
2. Topic modeling creates async jobs tracked in database
3. Results stored with embeddings for semantic search
4. RAG queries combine vector search + LLM generation

## Technology Stack

### AI Models Integration
- **Claude 4 Sonnet** (`claude-sonnet-4-20250514`): Advanced journey mapping with 200K context
- **Claude 3.7 Sonnet** (`claude-3-7-sonnet-20250219`): Reliable journey mapping and analysis
- **OpenAI GPT-4o**: Content generation
- **OpenAI Whisper API**: Audio/video transcription
- **Google Gemini** (`gemini-2.5-flash-image-preview`): Character generation
- **Google Veo 3.1** (`veo-3.1-fast-generate-preview`): Video generation

### Service Port Map
| Service | Port | Container Name |
|---------|------|---------------|
| Launchpad Hub | 8000 | launchpad |
| AI Agent Orchestrator | 8500 | agent |
| Social Research Frontend | 3000 | social-research-frontend |
| Social Research Backend | 8081 | social-research-backend |
| Reddit Data Collector | 5001 | reddit-ripper |
| Journey Mapper (Claude 3.7) | 8080 | journey-mapper |
| Journey Mapper (Claude 4) | 8095 | claude4-journey-mapper |
| Video Analyzer | 5002 | video-analyzer |
| LinkedIn Generator | 5003 | linkedin-generator |
| Character Generator | 5010 | consistent-character-generator |
| Image Caption Generator | 5005 | image-captioner |
| Miro Generator | 5004 | miro-generator |
| Presentation Generator | 5007 | presentation-generator |
| Soundtrack Generator | 5009 | soundtrack-generator |
| Amazon Market Intelligence | 5008 | scrapehero-amazon |
| MCP Services | 8501-8506 | Various MCP wrappers |

## Critical Implementation Details

### MCP Protocol (JSON-RPC 2.0)
The agent communicates with MCP services using JSON-RPC 2.0:

**Tool Discovery** ([mcp-services/agent/app.py:102-150](mcp-services/agent/app.py)):
```python
# Agent sends JSON-RPC request to each MCP service
{
    "jsonrpc": "2.0",
    "id": "tools_list_reddit_0",
    "method": "tools/list",
    "params": {}
}

# MCP service responds with available tools
{
    "jsonrpc": "2.0",
    "id": "tools_list_reddit_0",
    "result": {
        "tools": [
            {
                "name": "collect_reddit_data",
                "description": "...",
                "inputSchema": {...}
            }
        ]
    }
}
```

**Tool Execution**: Agent caches tool definitions and invokes via `tools/call` method with proper parameter mapping

### WebSocket Connection Management
The Launchpad ([launchpad/app.py](launchpad/app.py)) acts as a WebSocket proxy between browser and agent:
- **Thread synchronization** for bidirectional message forwarding
- **Automatic reconnection** when agent connection drops
- **Error recovery** with graceful degradation
- **Connection pooling** for multiple concurrent clients

**Critical**: Changes to agent system prompt or tool definitions require agent restart for cache refresh

### Parameter Naming Conventions
MCP wrappers normalize parameter names between services:
- Reddit MCP: `file_id` ↔ `file` conversion
- Social MCP: `job_id` validation
- Journey MCP: Multiple tool name aliases (`generate_journey_map`, `create_journey_map`)

### Windows Development Considerations
- **Path Separators**: Use `os.path.join()` for cross-platform paths
- **Docker Desktop**: Required for container orchestration
- **Shell Scripts**: Git Bash recommended for running `.sh` files
- **Port Conflicts**: More common on Windows - always run `python port_scanner.py --fix` before launch
- **Environment Variables**: PowerShell uses `$env:VAR`, CMD uses `%VAR%`, Git Bash uses `$VAR`

## Development Workflow Patterns

### Adding a New Service
1. **Create Core Service**: `internal-solutions-[name]/`
   - Add `app.py` (Flask) or `app.py` with `uvicorn` (FastAPI)
   - Create `requirements.txt` with dependencies
   - Add `Dockerfile` (use `python:3.9-slim` or `python:3.10-slim`)

2. **Create MCP Wrapper**: `mcp-services/[name]-mcp/`
   - Implement JSON-RPC 2.0 endpoints: `tools/list`, `tools/call`
   - Add `app.py` with tool definitions and parameter validation
   - Create `requirements.txt` (include `fastapi`, `uvicorn`, `requests`)

3. **Update Docker Compose**: [docker-compose-all.yml](docker-compose-all.yml)
   - Add service definition with ports, environment vars, volumes
   - Connect to `nxt-humans-network`
   - Add MCP wrapper service with `depends_on` core service

4. **Register with Agent**: [mcp-services/agent/app.py](mcp-services/agent/app.py)
   - Add service URL to `tool_services` dict (line ~92)
   - Agent will auto-discover tools via `fetch_and_cache_tools()` on startup

5. **Update Launchpad**: [launchpad/app.py](launchpad/app.py)
   - Add service URL environment variables
   - Update navigation menu with new service link

6. **Environment Configuration**: `.env`
   - Add service-specific API keys or configuration
   - Add port mappings if non-standard

### Modifying Agent Behavior
The agent's system prompt and tool handling logic are in [mcp-services/agent/app.py](mcp-services/agent/app.py). Changes affect the entire platform:

**After modifying agent code**:
```bash
# Restart agent to reload code and refresh tool cache
docker compose -f docker-compose-all.yml restart agent

# Monitor agent logs for errors
docker compose -f docker-compose-all.yml logs -f agent

# Test WebSocket connection in browser DevTools (Network tab → WS filter)
```

**Agent Configuration**:
- Model: `ANTHROPIC_MODEL` env var (default: `claude-3-7-sonnet-20250219`)
- Tool cache: Populated on startup via `fetch_and_cache_tools()` (line 102)
- Conversation state: Stored in-memory per WebSocket connection

## Troubleshooting Guide

### Port Conflicts
```bash
# Automatic port conflict detection and resolution
python port_scanner.py         # Check for conflicts
python port_scanner.py --fix   # Kill conflicting processes

# Manual port cleanup (Linux/Mac/Git Bash)
lsof -ti:PORT | xargs kill -9

# Manual port cleanup (Windows Command Prompt)
netstat -ano | findstr :PORT   # Find PID
taskkill /PID [PID] /F         # Kill process

# Manual port cleanup (Windows PowerShell)
Get-NetTCPConnection -LocalPort PORT | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### Service Not Responding
```bash
# Check health
curl http://localhost:[PORT]/health

# View logs
docker compose -f docker-compose-all.yml logs -f [service-name]

# Restart service
docker compose -f docker-compose-all.yml restart [service-name]

# Full reset
docker compose -f docker-compose-all.yml down
docker system prune -f
./launch.sh
```

### Container Name Reference
When restarting services, use the actual container names:
- `consistent-character-generator` (not character-generator)
- `social-research-frontend` (not socialresearch-frontend)
- `social-research-backend` (not socialresearch-backend)
- `image-captioner` (not image-caption-generator)
- `scrapehero-amazon` (not amazon-market-intelligence)

### API Key Issues
```bash
# Verify keys are set in environment
# Linux/Mac/Git Bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY

# Windows Command Prompt
echo %ANTHROPIC_API_KEY%
echo %OPENAI_API_KEY%

# Windows PowerShell
echo $env:ANTHROPIC_API_KEY
echo $env:OPENAI_API_KEY

# Verify keys are passed to Docker containers
docker compose -f docker-compose-all.yml exec agent env | grep API_KEY

# Check .env file has keys (should NOT print actual keys for security)
grep "ANTHROPIC_API_KEY=" .env
grep "OPENAI_API_KEY=" .env
```

**Important**: The `.env` file is the source of truth for API keys. [launch.sh](launch.sh) reads and exports these values to Docker Compose.

### WebSocket Connection Issues
**Symptoms**: Chat interface not responding, "Connecting..." message persists, tool execution fails

**Diagnosis**:
```bash
# 1. Check agent container is running
docker compose -f docker-compose-all.yml ps agent

# 2. View agent logs for errors
docker compose -f docker-compose-all.yml logs -f agent

# 3. Check launchpad proxy logs
docker compose -f docker-compose-all.yml logs -f launchpad

# 4. Monitor WebSocket in browser DevTools
# Open Chrome DevTools → Network tab → WS filter
# Look for ws://localhost:8000/ws connections
```

**Solutions**:
```bash
# Restart agent (most common fix)
docker compose -f docker-compose-all.yml restart agent

# Restart launchpad if proxy issues
docker compose -f docker-compose-all.yml restart launchpad

# Full platform restart
docker compose -f docker-compose-all.yml down
./launch.sh
```

**Root Causes**:
- Agent tool cache corruption → restart agent
- Launchpad thread deadlock → restart launchpad
- MCP service unavailable → check logs for specific service
- API key invalid/expired → verify `.env` file

## Performance Considerations

### Resource Requirements
- **Minimum**: 8GB RAM, 4 cores for basic operation
- **Recommended**: 16GB+ RAM, 8+ cores for smooth performance
- **Database**: PostgreSQL benefits from SSD storage
- **Vector operations**: Scale with dataset size (2.5M docs tested)

### Optimization Points
- Use Docker resource limits to prevent runaway containers
- Enable pgvector HNSW indices for large datasets
- Implement caching for frequently accessed data
- Use batch processing for bulk operations
- Monitor with `docker stats` for resource usage

## Utility Scripts

The repository includes several utility scripts for development and maintenance:

### Port Management
- [port_scanner.py](port_scanner.py): Detect and resolve port conflicts
- [kill_ports.py](kill_ports.py): Kill processes on specific ports

### Platform Launchers
- [launch.sh](launch.sh): Main launcher (Linux/Mac/Git Bash) - handles .env setup, port conflicts, Docker orchestration
- [launch-windows.bat](launch-windows.bat): Windows Command Prompt launcher
- [launch-windows.ps1](launch-windows.ps1): Windows PowerShell launcher
- [launch.py](launch.py): Python-based launcher (cross-platform alternative)

### Development Tools
- [refresh_agent_tools.py](refresh_agent_tools.py): Refresh agent tool cache without full restart
- [run-agent-directly.py](run-agent-directly.py): Run agent service locally for debugging
- [port_scanner.py](port_scanner.py): Scan for and fix port conflicts

### Database Management (Social Research)
- [internal-solutions-socialresearch/backend/app/db_init.py](internal-solutions-socialresearch/backend/app/db_init.py): Initialize PostgreSQL with pgvector
- [internal-solutions-socialresearch/backend/fix_embeddings.py](internal-solutions-socialresearch/backend/fix_embeddings.py): Repair embedding data

**Note**: All test scripts (`test_*.py`) have been removed for security. Use Docker logs and browser DevTools for debugging instead.

## Security Notes

- **Never commit `.env` file** - contains API keys and is in `.gitignore`
- All secrets must use environment variables (not hardcoded)
- Services communicate through internal Docker network (`nxt-humans-network`)
- External access only through defined port mappings
- HTTPS endpoints available for production deployment (self-signed certs in `ssl-certs/`)
- All test files with hardcoded API keys have been removed (October 2025 security audit)