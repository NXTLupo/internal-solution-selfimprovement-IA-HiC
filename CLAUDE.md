# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The NXT Humans AI CX Workbench is a comprehensive microservices platform for customer experience research and analysis, featuring ten main applications integrated through a unified AI agent interface:

1. **Reddit Data Collector**: Gathers Reddit data from subreddits (internal-solutions-reddit-ripper)
2. **Social Research Analysis Tool**: Advanced analytics with topic modeling and sentiment analysis using PostgreSQL+pgvector (internal-solutions-socialresearch)
3. **AI Journey Mapper (Claude 3.7)**: Customer journey mapping using Claude 3.7 Sonnet (internal-solutions-journeymapper)
4. **AI Journey Mapper (Claude 4)**: Advanced customer journey mapping using Claude 4 Sonnet (internal-solutions-claude4-journey-mapper)
5. **AI Journey Mapper (OpenAI o3)**: Customer journey mapping using OpenAI's o3 reasoning model (internal-solutions-openai-journey-mapper)
6. **LinkedIn Post Generator**: Professional content creation using Extended Thinking analysis (internal-solutions-linkedin-generator)
7. **Miro Board Generator**: TypeScript CLI tool for converting journey maps to interactive Miro boards (internal-solutions-miro-generator)
8. **AI Agent Assistant**: Multimodal chatbot agent with MCP tool integration (mcp-services)
9. **Video Transcriptor**: Video/audio transcription and analysis via Whisper API (internal-solutions-video-analyzer)
10. **Image Caption Generator**: AI-powered image captioning using MobileNetV2 and LSTM models (internal-solutions-image-captioner)

## Architecture

The workbench uses a microservices architecture with Docker for containerization. Each service runs independently and communicates through a shared Docker network.

### Component Architecture

1. **Launchpad**: Central hub with WebSocket proxy for agent communication
2. **MCP (Model Context Protocol) Services**: Lightweight wrappers around tools for agent integration
   - reddit-mcp: Exposes Reddit Data Collector functionality
   - social-mcp: Exposes Social Research Tool functionality
   - journey-mcp: Exposes Claude 3.7 Journey Mapper functionality
   - claude4-journey-mcp: Exposes Claude 4 Journey Mapper functionality
   - openai-journey-mcp: Exposes OpenAI o3 Journey Mapper functionality
   - video-mcp: Exposes Video Transcriptor functionality
3. **Agent Service**: Manages conversation context and tool invocation using Claude API

### Key Files and Directories

- `launchpad/app.py`: Central WebSocket proxy and service coordinator
- `mcp-services/`: Contains MCP service implementations
- `internal-solutions-*/`: Individual tool implementations
- `docker-compose.yml`: Main Docker Compose configuration
- `docker-compose-agent.yml`: Configuration with agent integration
- `docker-compose-claude4.yml`: Configuration for Claude 4 Journey Mapper
- `docker-compose-video-fixed.yml`: Configuration for Video Transcriptor service
- `docker-compose-all.yml`: Full configuration with all services
- `dynamic-compose.yml`: Configuration with dynamic port allocation for development
- `nxt-compose.yml`: Alternative compose configuration
- `port_scanner.py`: Port conflict detection and resolution utility

## Quick Start

For immediate deployment of the entire workbench:

```bash
# One-command startup (recommended for new users)
./launch.sh

# Prerequisites check before launch
python port_scanner.py                  # Check for port conflicts
docker --version && docker compose version  # Verify Docker setup

# Alternative: Use backup scripts for specific components
./backup-scripts/unified-launch.sh      # Unified launcher with all services
./backup-scripts/launch-with-all-services.sh  # Legacy all-services launcher
```

### Prerequisites

- Docker Desktop with sufficient resources (8GB+ RAM recommended)
- `.env` file with required API keys:
  ```
  ANTHROPIC_API_KEY=your_anthropic_key
  OPENAI_API_KEY=your_openai_key
  ```
- For Social Research Tool local development: PostgreSQL 16+ with pgvector extension

## Build and Development Commands

### Quick Start
```bash
# Primary startup command
./launch.sh                           # Unified launcher with port conflict detection
python port_scanner.py --fix          # Auto-resolve port conflicts before startup
```

### Service Management
```bash
# Start entire workbench
docker compose -f docker-compose-all.yml up -d

# Start specific service configurations
docker compose -f docker-compose-video-fixed.yml up -d      # Video Transcriptor
docker compose -f docker-compose-claude4.yml up -d          # Claude 4 Journey Mapper  
docker compose -f dynamic-compose.yml up -d                 # Development with dynamic ports

# Stop all services
docker compose -f docker-compose-all.yml down
```

### Docker Commands

```bash
# View running containers
docker compose -f dynamic-compose.yml ps

# View logs for a specific service
docker compose -f dynamic-compose.yml logs -f [service-name]

# Access a container shell
docker compose -f dynamic-compose.yml exec [service-name] bash

# Restart a specific service
docker compose -f dynamic-compose.yml restart [service-name]

# Start specific service configurations
docker compose -f docker-compose-video-fixed.yml up -d      # Video Transcriptor only
docker compose -f docker-compose-claude4.yml up -d          # Claude 4 Journey Mapper
docker compose -f nxt-compose.yml up -d                     # Alternative configuration
docker compose -f docker-compose-all.yml up -d              # All services

# Port conflict detection and resolution
python port_scanner.py                # Check for port conflicts
python port_scanner.py --fix          # Automatically resolve conflicts
python port_scanner.py --kill 8080    # Kill specific port processes

# Dynamic port allocation for development
docker compose -f dynamic-compose.yml up -d  # Uses environment variables for ports
```

### API Key Setup

```bash
# Update Anthropic API key for Claude integration (3.7 and 4)
./backup-scripts/update_anthropic_key_enhanced.sh YOUR_API_KEY
./update_claude4_api_key.sh YOUR_API_KEY  # For Claude 4 specifically

# Update OpenAI API key for Whisper (video transcription) and o3 models
./backup-scripts/update_whisper_key.sh YOUR_API_KEY
./update_openai_key.sh YOUR_API_KEY

# Test API key configuration
python test_anthropic_api.py    # Tests both Claude 3.7 and 4
python test_whisper_key.py      # Tests Whisper API
python test_openai_key.py       # Tests OpenAI API including o3 access

# Enhanced startup with automatic port conflict resolution
./backup-scripts/enhanced-check-and-run.sh  # Startup with conflict detection
./backup-scripts/start-with-api-keys.sh     # Startup with API key validation
```

### Component Development

#### Social Research Tool (React 19 + Vite + TypeScript)
```bash
cd internal-solutions-socialresearch/frontend
npm install
npm run dev          # Vite dev server (port 5173) with HMR
npm run build        # TypeScript + Vite production build
npm run lint         # ESLint with TypeScript rules
npm run preview      # Preview production build

# Backend (Flask + PostgreSQL + pgvector)
cd ../backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python init_db.py && python -m run

# Database setup (PostgreSQL 16+ with pgvector)
brew install postgresql@16 pgvector && brew services start postgresql@16
psql postgres -c "CREATE DATABASE social_research_db;"
psql social_research_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### Journey Mapper (React 17 + Webpack)
```bash
cd internal-solutions-journeymapper
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key && python run.py

# Frontend development
npm install
npm run dev-server   # Webpack dev server (port 3000, proxies to :8000)
npm run build        # Webpack production build
npm run api          # Python backend only (uvicorn)
npm run start        # Build + start backend

# Code quality (when configured)
mypy src/ && flake8 src/
```

#### Claude 4 Journey Mapper Development

```bash
# Run Claude 4 Journey Mapper with latest Claude 4 Sonnet model
cd internal-solutions-claude4-journey-mapper
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_api_key_here
python run.py        # Starts service on port 8095

# Update Claude 4 API key
./update_key.sh YOUR_API_KEY

# Run with MCP service integration
./run-with-mcp.sh    # Starts with MCP wrapper on port 8003

# Using Docker
docker compose -f docker-compose-claude4.yml up -d
```

#### OpenAI Journey Mapper Development

```bash
# Run OpenAI Journey Mapper with o3 reasoning model support
cd internal-solutions-openai-journey-mapper
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your_api_key_here
python run.py        # Supports o3, o1, o1-mini, o1-preview, o1-pro models

# Run with specific reasoning effort for o3 model
OPENAI_MODEL=o3 REASONING_EFFORT=medium python run.py

# Update OpenAI API key
./update_openai_key.sh YOUR_API_KEY

# Test o3 model access
python test_openai_api.py  # Verifies organization access to o3
```

#### Video Transcriptor Development

```bash
# Run Video Transcriptor standalone
cd internal-solutions-video-analyzer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install yt-dlp pytube pydub openai requests  # Add extra dependencies
export OPENAI_API_KEY=your_api_key_here
python run.py  # Starts service on port 5002

# Run with simple version (fewer dependencies)
python run-simple.py

# Test OpenAI/Whisper API connectivity
python test_openai_key.py
python test_whisper_api.py
```

#### LinkedIn Post Generator Development

```bash
# Run LinkedIn Generator standalone
cd internal-solutions-linkedin-generator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm  # Download spaCy language model
export ANTHROPIC_API_KEY=your_anthropic_key_here
export OPENAI_API_KEY=your_openai_key_here
python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload  # Starts service on port 5003 (mapped from 5000)

# Test API connectivity
python -c "import anthropic; print('Anthropic SDK installed')"
python -c "import openai; print('OpenAI SDK installed')"

# Using Docker
docker compose -f docker-compose-all.yml up linkedin-generator
```

#### Miro Generator (TypeScript CLI)
```bash
cd internal-solutions-miro-generator
npm install && npm run build

# CLI Usage
npx miro-gen config --init                    # Interactive setup
npx miro-gen validate -i journey.html -v      # Validate journey map
npx miro-gen generate -i journey.html -o ./output  # Generate Miro board
npx miro-gen generate -i journey.html --dry-run    # Preview changes

# Development
npm run dev          # ts-node development
npm run watch        # TypeScript compilation in watch mode
npm run lint         # ESLint TypeScript checking

# Testing (Jest with TypeScript)
npm test             # Run test suite
npm run test:coverage # Coverage reports
npm run test:watch   # Watch mode
```

#### Image Caption Generator (FastAPI + TensorFlow)
```bash
cd internal-solutions-image-captioner
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export PORT=5005 && python app.py

# Development
uvicorn app:app --host 0.0.0.0 --port 5005 --reload

# Using Docker
docker build -t image-captioner .
docker run -p 5005:5005 image-captioner
```

### Testing Infrastructure

#### Comprehensive Testing Commands
```bash
# API Integration Testing
python test_anthropic_api.py      # Claude API (3.7 and 4)  
python test_openai_api.py         # OpenAI API (o3 and others)
python test_whisper_api.py        # Whisper API for video transcription

# Agent & WebSocket Testing  
python test_agent_tools_comprehensive.py    # Complete agent functionality
python test_complete_chatbot_functionality.py  # End-to-end testing

# MCP Service Testing
python test_mcp_tools.py          # All MCP service tools
python test_video_complete.py     # Video processing pipeline

# TypeScript Testing (Miro Generator only has full test suite)
cd internal-solutions-miro-generator
npm test && npm run test:coverage
```

#### Agent Development

```bash
# Agent service development
cd mcp-services/agent
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Apply anti-hallucination patch
python anti_hallucination.py

# Fix WebSocket connection issues
./backup-scripts/fix-websocket-connection.sh

# Test agent functionality
python test_ws_fixed.py         # Test WebSocket connection
python test_tool_execution.py   # Test tool execution
python test_key.py              # Test API key configuration

# MCP service development
cd mcp-services/[service-name]   # reddit-mcp, social-mcp, journey-mcp, video-mcp
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py                   # Run individual MCP service
```

### Debugging and Monitoring

```bash
# Service Health Checks
curl http://localhost:8000/health  # Launchpad
curl http://localhost:8080/health  # Journey Mapper
docker compose -f docker-compose-all.yml ps  # Container status

# Log Monitoring  
docker compose -f docker-compose-all.yml logs -f [service-name]
docker logs -f agent              # Agent service logs
docker logs -f launchpad          # Launchpad logs

# System Reset
docker compose -f docker-compose-all.yml down
docker system prune -f && ./launch.sh
```

### Code Quality Standards

#### Frontend Code Quality
```bash
# Modern Vite Stack (Social Research)
cd internal-solutions-socialresearch/frontend  
npm run lint && npm run build    # ESLint + TypeScript compilation

# Legacy Webpack Stack (Journey Mapper)  
cd internal-solutions-journeymapper
npm run build                    # Webpack production build

# TypeScript CLI (Miro Generator)
cd internal-solutions-miro-generator
npm run lint && npm test         # ESLint + Jest testing
```


## Troubleshooting

### Common Issues

1. **WebSocket Connection Issues**
   - Use `./backup-scripts/fix-websocket-connection.sh` to fix connection issues
   - Check logs with `docker logs -f agent` and `docker logs -f launchpad`
   - Apply client-side fallback by injecting `client-fallback.js` in the browser console
   - For detailed diagnostics, refer to `WEBSOCKET-FIX-DOCUMENTATION.md`

2. **Port Conflicts**
   - Use `python port_scanner.py` to identify conflicts
   - Use `python port_scanner.py --fix` to automatically fix conflicts
   - Use `python port_scanner.py --kill PORT_NUMBER` to kill specific port processes
   - Use `./backup-scripts/enhanced-check-and-run.sh` for startup with conflict detection
   - Manually kill processes on specific ports with `lsof -ti:PORT_NUMBER | xargs kill -9`
   - Configure dynamic ports via environment variables in `.env` file
   - For detailed port management, refer to `PORT-CONFLICT-MANAGEMENT.md`

3. **API Key Issues**
   - Check the API key configuration with test scripts
   - Update keys with provided scripts
   - Verify environment variables in the `.env` file

4. **Video Transcription Issues**
   - Check OpenAI API key for Whisper API access with `python test_whisper_api.py`
   - Ensure ffmpeg is installed for audio processing
   - Check logs in `internal-solutions-video-analyzer/logs/` for errors
   - For large files, ensure chunking is working properly (>25MB files are automatically chunked)
   - Verify YouTube URL validity and accessibility

5. **Parameter Naming Inconsistency**
   - The agent and MCP services have parameter naming inconsistencies
   - Fixed with bidirectional parameter conversion in service apps
   - Use `./backup-scripts/fix-reddit-tools.sh` to apply tool naming fixes
   - For details, refer to `CX-AGENT-FIXES.md`

6. **Testing and Debugging Issues**
   - Run comprehensive test suite with `python test_agent_tools_comprehensive.py`
   - Check individual service health with specific test scripts
   - Use `python test_complete_chatbot_functionality.py` for end-to-end validation
   - For WebSocket issues, use `python test_websocket_server.py`
   - Validate API keys before deployment with key-specific test scripts

7. **Favicon Display Issues**
   - **Browser showing "i" icon instead of custom favicons**: Clear browser cache with Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - **Persistent favicon issues**: Run `./debug-favicons.sh` to test favicon accessibility across all services
   - **Force favicon refresh**: Add timestamp query parameter `?t=$(date +%s)` to favicon URLs
   - **Browser-specific fixes**:
     - Chrome: Settings → Privacy → Clear browsing data → Cached images
     - Firefox: about:preferences#privacy → Clear Data → Cached Web Content  
     - Safari: Preferences → Privacy → Manage Website Data → Remove All
   - **Service restart**: `docker compose -f docker-compose-all.yml restart` to ensure favicon changes take effect

8. **Browser "Not Secure" Warnings**
   - **Enable HTTPS**: Run `docker compose -f docker-compose-https.yml up -d` to start HTTPS proxy
   - **Access secure URLs**: Use https://localhost:8443-8450 instead of http:// URLs
   - **Accept self-signed certificates**: Click "Advanced" → "Proceed to localhost" in browsers
   - **Install certificate for trusted green lock**: Run `./setup-https.sh` for installation instructions
   - **HTTPS service ports**:
     - Launchpad: https://localhost:8443
     - Journey Mapper: https://localhost:8444  
     - OpenAI Journey: https://localhost:8445
     - Reddit Collector: https://localhost:8446
     - Social Research: https://localhost:8447
     - Video Transcriptor: https://localhost:8448
     - LinkedIn Generator: https://localhost:8449
     - Miro Generator: https://localhost:8450

## Environment Variables

Key environment variables to set in a `.env` file:

```
# API Keys
ANTHROPIC_API_KEY=your_api_key_here  # Required for Claude 3.7 and 4 integration
OPENAI_API_KEY=your_api_key_here     # Required for Whisper API and o3 models

# Port configuration
LAUNCHPAD_PORT=8000                  # Optional, default: 8000
JOURNEY_MAPPER_PORT=8080             # Optional, default: 8080 (Claude 3.7)
CLAUDE4_JOURNEY_MAPPER_PORT=8095     # Optional, default: 8095 (Claude 4)
OPENAI_JOURNEY_MAPPER_PORT=8090      # Optional, default: 8090 (OpenAI o3)
REDDIT_RIPPER_PORT=5001              # Optional, default: 5001
SOCIAL_RESEARCH_PORT=3000            # Optional, default: 3000
SOCIAL_RESEARCH_BACKEND_PORT=8081    # Optional, default: 8081
VIDEO_ANALYZER_PORT=5002             # Optional, default: 5002
LINKEDIN_GENERATOR_PORT=5003         # Optional, default: 5003
MIRO_GENERATOR_PORT=5004             # Optional, default: 5004
IMAGE_CAPTIONER_PORT=5005            # Optional, default: 5005

# MCP Service Ports
AGENT_PORT=8500                      # Agent service
REDDIT_MCP_PORT=8501                 # Reddit MCP service
SOCIAL_MCP_PORT=8502                 # Social MCP service
JOURNEY_MCP_PORT=8503                # Journey MCP service
CLAUDE4_MCP_PORT=8003                # Claude 4 MCP service
OPENAI_JOURNEY_MCP_PORT=8505         # OpenAI Journey MCP service
VIDEO_MCP_PORT=8504                  # Video MCP service

# Agent configuration
ENABLE_CX_AGENT=true                 # Enable AI agent integration
AGENT_WS_URL=ws://agent:8500         # WebSocket URL for agent (container)
AGENT_CLIENT_WS_URL=ws://localhost:8500  # WebSocket URL for client
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219  # Claude model to use
CLAUDE4_MODEL=claude-sonnet-4-20250514      # Claude 4 model

# OpenAI o3 Configuration
OPENAI_MODEL=o3                      # OpenAI model (o3, gpt-4o, etc.)
REASONING_EFFORT=medium              # o3 reasoning effort: low, medium, high

# Tool service URLs for client access
REDDIT_RIPPER_CLIENT_URL=http://localhost:5001
JOURNEY_MAPPER_CLIENT_URL=http://localhost:8080
CLAUDE4_JOURNEY_CLIENT_URL=http://localhost:8095
OPENAI_JOURNEY_CLIENT_URL=http://localhost:8090
SOCIAL_RESEARCH_CLIENT_URL=http://localhost:3000
VIDEO_ANALYZER_CLIENT_URL=http://localhost:5002
LINKEDIN_GENERATOR_CLIENT_URL=http://localhost:5003
MIRO_GENERATOR_CLIENT_URL=http://localhost:5004
IMAGE_CAPTIONER_CLIENT_URL=http://localhost:5005
```

## Tool Integration

The AI Agent uses a Model Context Protocol (MCP) architecture to integrate tools:

### Available Tools

1. **Reddit Data Collector Tools**
   - `reddit.search`: Search for posts in a subreddit
   - `reddit.get_status`: Check status of a search job
   - `reddit.get_results`: Get results of a completed job

2. **Social Research Tools**
   - `social.search`: Search for posts in the database
   - `social.topic_model`: Perform topic modeling
   - `social.sentiment_analysis`: Perform sentiment analysis

3. **Journey Mapper Tools (Claude 3.7)**
   - `journey.upload_file`: Upload a file for mapping
   - `journey.generate_map`: Generate a journey map
   - `journey.get_results`: Get journey map results

4. **Claude 4 Journey Mapper Tools**
   - `claude4_journey.upload_file`: Upload a file for advanced mapping
   - `claude4_journey.generate_map`: Generate journey map with Claude 4
   - `claude4_journey.get_results`: Get enhanced journey map results

5. **OpenAI o3 Journey Mapper Tools**
   - `openai_journey.upload_file`: Upload a file for reasoning-based mapping
   - `openai_journey.generate_map`: Generate journey map with o3 reasoning
   - `openai_journey.get_results`: Get reasoning-enhanced journey map results
   - `openai_journey.set_reasoning_effort`: Configure reasoning effort (low/medium/high)

6. **Video Transcriptor Tools**
   - `video.transcribe`: Transcribe a video from URL or file
   - `video.get_status`: Check transcription status
   - `video.get_results`: Get transcription results

**Note**: The LinkedIn Post Generator, Miro Board Generator, and Image Caption Generator are currently available as standalone services (ports 5003, 5004, and 5005 respectively) but lack MCP integration for AI Agent access. The LinkedIn Generator can create professional LinkedIn content from journey map data using advanced "Extended Thinking" analysis with Claude 3.7 Sonnet and OpenAI GPT-4o. The Miro Generator provides a comprehensive TypeScript CLI for converting journey maps to interactive Miro boards with advanced layout and styling capabilities. The Image Caption Generator provides AI-powered image captioning using MobileNetV2 and LSTM models for automatic image description.

**Service-Specific Favicons**: Each service now includes branded favicon files for enhanced user experience:
- `reddit-favicon.svg`, `video-favicon.svg`, `chart-favicon.svg`, `route-favicon.svg`
- `brain-favicon.svg`, `linkedin-favicon.svg`, `claude4-favicon.svg`, `caption-favicon.svg`

For detailed information about tool integration, refer to `TOOL-INTEGRATION-GUIDE.md`.

## Architecture Patterns

### Multi-Technology Frontend Architecture

The platform employs three distinct build systems optimized for different use cases:

1. **Social Research Tool**: Modern Vite 6+ + React 19 + TypeScript 5.7+
   - Lightning-fast HMR and ESM modules  
   - Strict TypeScript compilation with path aliases (`@/*` → `./src/*`)
   - Tailwind CSS 4+ with PostCSS, Material-UI 6.4+ components
   - Redux Toolkit 2.6+ for state management

2. **Journey Mapper**: Legacy Webpack 5+ + React 17 + Babel
   - Stable ecosystem compatibility with Mermaid 10.7+ integration
   - Custom Webpack configuration for diagram rendering
   - Proxy configuration for seamless development (port 3000 → 8000)

3. **Miro Generator**: TypeScript 5.3+ CLI + Jest 29.7+ Testing  
   - Professional CLI with Commander.js 11.1+ and comprehensive path aliases
   - Full Jest testing suite with coverage reports and watch mode
   - ES2022 target with Docker support

### Docker Configuration Patterns

The platform uses multiple Docker Compose files for different deployment scenarios:

- `docker-compose-all.yml`: Complete stack with all services
- `docker-compose-agent.yml`: Core services with agent integration
- `docker-compose-claude4.yml`: Claude 4 Journey Mapper specific configuration
- `dynamic-compose.yml`: Dynamic port allocation for development
- `nxt-compose.yml`: Alternative configuration with enhanced networking
- `docker-compose-video-fixed.yml`: Video-specific service configuration
- `docker-compose-all.override.yml`: Environment-specific overrides

### Port Management System

The platform includes a sophisticated port conflict resolution system:

- **Automatic Detection**: `port_scanner.py` identifies conflicting processes
- **Conflict Resolution**: `port_scanner.py --fix` automatically resolves conflicts
- **Dynamic Allocation**: All services support environment-based port configuration
- **Enhanced Startup**: `enhanced-check-and-run.sh` includes pre-startup conflict detection
- **Container Communication**: `update_docker_hosts.py` manages inter-container networking
- **Manual Control**: Individual port management with kill options

### MCP Service Architecture

Each tool is wrapped with a lightweight MCP (Model Context Protocol) service that:
- Exposes tool functionality through standardized interfaces
- Handles parameter conversion between agent and tool APIs  
- Provides error handling and logging
- Manages tool-specific authentication and configuration

**MCP Service Port Allocation**:
```
Agent Service:           8500 (AI agent orchestrator)
Reddit MCP:             8501 (Reddit data collector wrapper)
Social MCP:             8502 (Social research tool wrapper)
Journey MCP:            8503 (Claude 3.7 journey mapper wrapper)
Video MCP:              8504 (Video transcriptor wrapper)
OpenAI Journey MCP:     8505 (OpenAI o3 journey mapper wrapper)
Claude 4 Journey MCP:   8506 (Claude 4 journey mapper wrapper)
```

**Communication Flow**: `Client → Launchpad (8000) → Agent (8500) → MCP Service (850x) → Tool Service`

## Memories

### TypeScript and Modern Frontend Development

The Social Research Tool has been updated to use modern development practices:
- TypeScript 5.7+ with strict type checking
- React 19 with latest hooks and features
- Vite 6+ for fast development and building
- ESLint with TypeScript rules for code quality

When working on frontend components, follow the established patterns in `internal-solutions-socialresearch/frontend/src/`.

### Database Requirements for Social Research Tool

The Social Research Tool requires PostgreSQL with the pgvector extension for vector embeddings:
- PostgreSQL 16+ recommended
- pgvector extension for similarity search
- Alembic for database migrations
- Connection pooling for performance

**Database Setup Commands**:
```bash
# Install PostgreSQL with pgvector (macOS)
brew install postgresql@16 pgvector
brew services start postgresql@16

# Create database and user
psql postgres -c "CREATE DATABASE social_research_db;"
psql postgres -c "CREATE USER social_research_user WITH PASSWORD 'your_password';"
psql social_research_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Initialize database schema
cd internal-solutions-socialresearch/backend
python init_db.py
```

### OpenAI Journey Mapper o3 Model Support

The OpenAI Journey Mapper supports all OpenAI models including o1-series (o1, o1-mini, o1-preview, o1-pro). The completion token handling has been fixed to work with all model types.

If "'ResponseUsage' object has no attribute 'completion_tokens'" errors occur:
1. Check the full stack trace to identify the exact location
2. Verify the OpenAI API wrapper in `openai_api_wrapper.py` is being used
3. Check for direct usage of OpenAI API bypassing the wrapper
4. Ensure proper error handling in response processing

### Video Transcriptor Naming Update

The service previously called "Video Analyzer" has been renamed to "Video Transcriptor" to better reflect its primary purpose of transcribing video and audio content. The frontend interface has been updated with this new name, but some backend code and directory structures still use the old "video-analyzer" naming for compatibility. When working with this component:

1. Use "Video Transcriptor" in user-facing documentation and interfaces
2. Directory paths still use "internal-solutions-video-analyzer"
3. The JSON download feature allows users to download transcripts in a structured format
4. The transcription pipeline supports both YouTube URLs and direct video file uploads
5. The system includes optimizations for long videos via chunking and parallel processing

### MCP Agent WebSocket Communication

The WebSocket communication between the frontend and agent can be unstable. Key components involved:

1. `launchpad/app.py`: Contains WebSocket proxy implementation with reconnection logic
2. `mcp-services/agent/app.py`: Contains agent implementation
3. `client-fallback.js`: Implements browser-side fallback for connection issues

When troubleshooting WebSocket issues, check these files and verify the WebSocket URLs in environment variables.

### MCP Agent Response Formatting and Critical Issues

**CRITICAL WARNING**: The MCP agent link corruption issue is NOT in the agent code - it's in the frontend rendering!

#### **Link Corruption Issue Analysis**

**Root Cause Identified**: The HTML corruption pattern `Download">URL">Download Transcript JSON` occurs because:

1. **Agent generates clean markdown**: `[Download Transcript JSON](URL)`
2. **Frontend chatbot.js converts to HTML**: Lines 464-470 in `/launchpad/static/chatbot.js`
3. **Something corrupts the HTML during rendering**: The exact corruption mechanism is still unknown

**Failed Fix Attempts**:
- ❌ Modifying agent system prompts - agent already generates correct markdown
- ❌ Adding HTML cleanup functions to agent - broke tool execution entirely
- ❌ Removing HTML attributes from chatbot.js - corruption happens elsewhere

**Working Solution**: 
- ✅ Agent backup restored from `app.py.backup.websocket_fix`
- ✅ Tool execution works correctly
- ⚠️ Link corruption may still exist but agent functionality is preserved

#### **Agent Hallucination Fix History**

**What Broke Tool Execution**:
1. Added HTML cleanup function `clean_html_to_markdown()` to agent
2. Applied cleanup to all Claude responses
3. Added excessive system prompt restrictions
4. Result: Agent stopped executing tools and started hallucinating responses

**What Fixed Tool Execution**:
1. Restored working backup: `mcp-services/agent/app.py.backup.websocket_fix`
2. Restarted agent container: `docker compose -f docker-compose-all.yml restart agent`
3. Result: Tools execute properly, agent responds correctly

#### **Critical Rules for Future Modifications**

**NEVER MODIFY THESE FILES WITHOUT EXTREME CAUTION**:
- `mcp-services/agent/app.py` - Core agent logic
- Tool execution flow in `process_message()` function
- Tool parsing logic in `parse_tool_calls()` function

**SAFE TO MODIFY**:
- Frontend files in `launchpad/static/` for UI fixes
- System prompts for behavior changes (but test thoroughly)
- Tool-specific MCP services in `mcp-services/*/app.py`

#### **Debugging Tools**

**Check Agent Health**:
```bash
curl http://localhost:8500/health
docker compose -f docker-compose-all.yml logs agent | tail -20
```

**Restart Agent Only**:
```bash
docker compose -f docker-compose-all.yml restart agent
```

**Restore Working Backup**:
```bash
cd /path/to/mcp-services/agent
cp app.py.backup.websocket_fix app.py
docker compose -f docker-compose-all.yml restart agent
```

#### **Link Corruption Investigation Notes**

**For Future Investigation**:
1. The corruption pattern suggests HTML parsing/rendering issue
2. Check browser developer tools for actual HTML being rendered
3. Investigate if WebSocket message processing corrupts HTML
4. Test with simple markdown links to isolate the issue
5. Check if the issue occurs in all browsers or just specific ones

**Do NOT**:
- Modify agent core logic to fix presentation issues
- Add HTML processing to agent responses
- Change tool execution flow for formatting fixes

The agent works correctly - the issue is purely cosmetic in link rendering.

### CSS and UI Development

When making UI changes, follow these guidelines:

1. Add custom CSS to the appropriate files:
   - `launchpad/static/enhanced-components.css` - Common components
   - `launchpad/static/enhanced-header.css` - Header styling
   - `launchpad/static/enhanced-styles.css` - Global styles

2. Apply NXT Humans branding consistently:
   - **Primary Color**: Cyan #01C4C8 (rgba(1,196,200,1))
   - **Dark Background**: #121B26
   - **Secondary Colors**: Light Grey #5A6275, Medium Grey #4A5165
   - **Typography**: Segoe UI / system fonts
   - **Logo**: Located at `/internal-solutions-socialresearch/frontend/public/nxt-humans-logo.png`
   - **Service Favicons**: Each service has branded favicons in their respective `/static/` directories
     - Reddit Ripper: `reddit-favicon.svg`
     - Social Research: `chart-favicon.svg`
     - Video Transcriptor: `video-favicon.svg`
     - LinkedIn Generator: `linkedin-favicon.svg`

3. For detailed specifications, refer to `brand-style-guide.md`

### AI-Powered Service Architecture

The platform includes specialized AI services with distinct architectural patterns:

**LinkedIn Post Generator**: FastAPI + Extended Thinking Engine
- **Backend**: FastAPI with uvicorn ASGI server for async processing
- **AI Pipeline**: 4-stage Extended Thinking analysis (64K tokens per stage)  
- **AI Models**: Claude 3.7 Sonnet (primary) + OpenAI GPT-4o (secondary)
- **NLP Processing**: spaCy 3.5+ and NLTK 3.6+ for advanced text analysis
- **Frontend**: Custom HTML/CSS/JS with drag-and-drop and progress tracking

**Multi-Model Journey Mapping Architecture**:
- **Claude 3.7**: Traditional customer journey mapping (`internal-solutions-journeymapper`)
- **Claude 4**: Advanced reasoning and analysis (`internal-solutions-claude4-journey-mapper`)  
- **OpenAI o3**: Reasoning-enhanced mapping with configurable effort levels (`internal-solutions-openai-journey-mapper`)

## Key File Locations

When working on specific functionality, these are the critical files to understand:

### Core Service Files
- `launchpad/app.py`: Main WebSocket proxy and service coordinator
- `launchpad/templates/index.html`: Main UI template
- `mcp-services/agent/app.py`: AI agent service implementation (CRITICAL - do not modify core tool execution logic)
- `launch.sh`: Primary startup script with port conflict detection

### Configuration Files
- `docker-compose-all.yml`: Complete service configuration
- `docker-compose-all.override.yml`: Generated by launch.sh with API keys
- `dynamic-compose.yml`: Development configuration with dynamic ports
- `.env`: Environment variables (create from examples in documentation)
- `port_scanner.py`: Port conflict resolution utility

### Tool-Specific Entry Points
- `internal-solutions-journeymapper/run.py`: Journey Mapper standalone entry (Claude 3.7)
- `internal-solutions-claude4-journey-mapper/run.py`: Claude 4 Journey Mapper entry (advanced reasoning)
- `internal-solutions-openai-journey-mapper/run.py`: OpenAI o3 Journey Mapper entry (reasoning models)
- `internal-solutions-video-analyzer/run.py`: Video Transcriptor entry (YouTube + file upload)
- `internal-solutions-linkedin-generator/app.py`: LinkedIn Post Generator entry (FastAPI + Extended Thinking)
- `internal-solutions-miro-generator/app.py`: Miro Generator web interface entry (Flask + TypeScript CLI integration)
- `internal-solutions-miro-generator/src/index.ts`: Miro Generator CLI entry (TypeScript + Commander.js)
- `internal-solutions-image-captioner/app.py`: Image Caption Generator entry (FastAPI + TensorFlow)
- `internal-solutions-socialresearch/frontend/src/main.tsx`: Social Research frontend entry (React 19 + TypeScript)
- `internal-solutions-socialresearch/backend/run.py`: Social Research backend entry (Flask + pgvector)

### Frontend Build Configuration Files
- `internal-solutions-socialresearch/frontend/package.json`: Modern Vite + TypeScript stack
- `internal-solutions-socialresearch/frontend/vite.config.ts`: Vite configuration with path aliases
- `internal-solutions-socialresearch/frontend/tsconfig.json`: TypeScript strict configuration
- `internal-solutions-journeymapper/package.json`: Legacy Webpack + React 17 stack
- `internal-solutions-journeymapper/webpack.config.js`: Custom Webpack configuration for Mermaid
- `internal-solutions-miro-generator/package.json`: TypeScript CLI tool with Jest testing
- `internal-solutions-miro-generator/tsconfig.json`: TypeScript configuration with ES2022 target and path aliases
- `internal-solutions-miro-generator/jest.config.js`: Jest configuration for comprehensive testing

### Critical Backup Files
- `mcp-services/agent/app.py.backup.websocket_fix`: Working agent backup (restore if tool execution breaks)
- `launchpad/static/chatbot.js`: Frontend chat client (source of link corruption issue)
- `client-fallback.js`: Browser-side WebSocket reconnection fallback

## Testing Infrastructure & Development Patterns

### Testing Framework Availability

**Jest (TypeScript) - Fully Configured**: Only the Miro Generator has a complete testing infrastructure
```bash
cd internal-solutions-miro-generator
npm test                    # Jest + TypeScript with 30s timeout
npm run test:coverage       # Text, LCOV, and HTML reporters
npm run test:watch          # Watch mode for TDD
```

**Python Testing - Ad-hoc Scripts**: 30+ standalone test scripts without unified framework
```bash
# Core functionality validation
python test_agent_tools_comprehensive.py test_complete_chatbot_functionality.py
python test_anthropic_api.py test_openai_api.py test_whisper_api.py

# Service-specific testing  
python test_mcp_tools.py test_video_complete.py test_websocket_server.py
```

**Frontend Testing Gap**: Neither React application has configured test frameworks despite modern build systems.

## Code Quality Standards

### Python Code Style
- **Formatting**: 4-space indentation, 120 character line limit
- **Type Hints**: Use Python type hints for all function parameters and return values
- **Error Handling**: Use specific exception types, proper logging with `src.utils.logger`
- **Imports**: Group imports (stdlib, third-party, local) with spaces between groups

### JavaScript/TypeScript Code Style
- **TypeScript**: Strict mode enabled, use proper type definitions
- **React**: Use functional components with hooks, follow modern React patterns
- **ESLint**: Follow configured ESLint rules for consistency (Social Research and Miro Generator)