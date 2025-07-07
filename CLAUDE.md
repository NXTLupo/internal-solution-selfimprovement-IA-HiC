# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The NXT Humans AI CX Workbench is a comprehensive microservices platform for customer experience research and analysis, featuring sixteen main applications integrated through a unified AI agent interface:

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
11. **FLUX LoRA Studio**: Real local LoRA training using Kohya_ss backend optimized for Apple Silicon M3 (internal-solutions-flux-lora-studio)
12. **MulmoCast**: Multi-modal presentation platform for AI-native content creation with MulmoScript format (internal-solutions-mulmocast)
13. **AI Presentation Generator**: Dual AI analysis pipeline for creating professional PowerPoint presentations (internal-solutions-presentation-generator)
14. **Claude 4 Journey Mapper V2**: Enhanced customer journey mapping with advanced React architecture (internal-solutions-claude4-journey-mapper-v2)
15. **Presentation AI**: Next.js-based presentation platform with Plate editor and advanced UI components (presentation-ai)
16. **Soundtrack Generator**: AI-powered audio content generation for multimedia presentations (internal-solutions-soundtrack-generator)
17. **Mulmocast MCP**: MCP service wrapper for multimedia content generation integration (mcp-services/mulmocast-mcp)

## Architecture

The workbench uses a microservices architecture with Docker for containerization. Each service runs independently and communicates through a shared Docker network using the Model Context Protocol (MCP) pattern.

### Service Communication Flow

```
Client Browser → Launchpad (8000) → Agent (8500) → MCP Services (8501-8507) → Core Services (5001-5008, 8080-8095)
```

**How it works:**
1. **Client requests** go to the Launchpad web interface
2. **Launchpad** proxies WebSocket connections to the Agent service
3. **Agent** receives user messages and determines which tools to invoke
4. **MCP Services** act as standardized wrappers around core tools
5. **Core Services** perform the actual work (data collection, analysis, generation)

### Component Architecture

1. **Launchpad (Port 8000)**: Central hub with WebSocket proxy for agent communication
   - Serves web interface for all services
   - Handles WebSocket connections and message routing
   - Provides unified access point for the entire platform

2. **Agent Service (Port 8500)**: AI orchestrator that manages conversation context and tool invocation
   - Uses Claude API for natural language understanding
   - Parses user requests and determines appropriate tool chains
   - **CRITICAL**: Core agent logic should never be modified without extreme caution

3. **MCP (Model Context Protocol) Services (Ports 8501-8507)**: Lightweight wrappers around tools for agent integration
   - reddit-mcp (8501): Exposes Reddit Data Collector functionality
   - social-mcp (8502): Exposes Social Research Tool functionality
   - journey-mcp (8503): Exposes Claude 3.7 Journey Mapper functionality
   - video-mcp (8504): Exposes Video Transcriptor functionality
   - openai-journey-mcp (8505): Exposes OpenAI o3 Journey Mapper functionality
   - claude4-journey-mcp (8506): Exposes Claude 4 Journey Mapper functionality
   - mulmocast-mcp (8507): Exposes MulmoCast multimedia content generation functionality

4. **Core Services**: The actual tools that perform work
   - **AI Journey Mappers**: Claude 3.7 (8080), Claude 4 (8095), OpenAI o3 (8090)
   - **Data Collection**: Reddit Ripper (5001), Social Research (3000/8081)
   - **Content Generation**: LinkedIn (5003), Video Transcriptor (5002), Presentation (5007)
   - **Specialized Tools**: Miro Generator (5004), Image Captioner (5005), FLUX LoRA (5006), MulmoCast (5008)

### Key Files and Directories

- `launchpad/app.py`: Central WebSocket proxy and service coordinator
- `mcp-services/`: Contains MCP service implementations
- `internal-solutions-*/`: Individual tool implementations
- `docker-compose-all.yml`: **PRIMARY** - Full configuration with all services
- `docker-compose-agent.yml`: Core services with agent integration
- `docker-compose-claude4.yml`: Claude 4 Journey Mapper specific configuration
- `docker-compose-video-fixed.yml`: Video Transcriptor only
- `docker-compose-https.yml`: HTTPS proxy with SSL certificates
- `dynamic-compose.yml`: Dynamic port allocation for development using environment variables
- `nxt-compose.yml`: Alternative configuration with enhanced networking
- `docker-compose-all.override.yml`: Automatically generated runtime configuration with API keys
- `port_scanner.py`: Port conflict detection and resolution utility

#### Service Entry Points
- **FastAPI Services**: Use `run.py` or `app.py` pattern with uvicorn
- **Flask Services**: Use `run.py` pattern with flask.run()
- **TypeScript CLI**: Use `src/index.ts` with Commander.js patterns
- **React Frontends**: Use `src/main.tsx` (Vite) or `src/index.js` (Webpack)

## Quick Start

For immediate deployment of the entire workbench:

```bash
# One-command startup (recommended for new users)
./launch.sh                           # Includes SSL cert generation, port conflict resolution, and HTTPS proxy

# Prerequisites check before launch
python port_scanner.py                  # Check for port conflicts
docker --version && docker compose version  # Verify Docker setup

# Alternative: Use backup scripts for specific components
./backup-scripts/unified-launch.sh      # Unified launcher with all services
./backup-scripts/launch-with-all-services.sh  # Legacy all-services launcher
```

### Automated Features in launch.sh
The main launch script includes several automated features:
- **Automatic SSL Certificate Generation**: Creates self-signed certificates for HTTPS
- **Port Conflict Resolution**: Automatically kills conflicting processes
- **HTTPS Proxy Setup**: Configures nginx proxy for secure connections
- **API Key Validation**: Ensures required API keys are present in .env
- **Service Health Verification**: Tests both HTTP and HTTPS endpoints

### Common Development Commands

```bash
# Test suite (run before making changes)
python test_anthropic_api.py && python test_openai_api.py
python test_agent_tools_comprehensive.py

# Single service development
cd internal-solutions-[service-name]
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python run.py  # or python app.py for FastAPI services

# Frontend development (varies by stack)
cd internal-solutions-socialresearch/frontend && npm run dev    # Modern React 19 + Vite
cd internal-solutions-journeymapper && npm run dev-server       # Legacy React 17 + Webpack
cd internal-solutions-miro-generator && npm test                # TypeScript CLI with Jest

# Docker operations
docker compose -f docker-compose-all.yml up -d     # Start all services
docker compose -f docker-compose-all.yml logs -f agent  # View agent logs
docker compose -f docker-compose-all.yml restart agent  # Restart critical agent
```

### Prerequisites

- Docker Desktop with sufficient resources (8GB+ RAM recommended)
- `.env` file with required API keys:
  ```
  ANTHROPIC_API_KEY=your_anthropic_key
  OPENAI_API_KEY=your_openai_key
  ```
- For Social Research Tool local development: PostgreSQL 16+ with pgvector extension

## ⚠️ CRITICAL WARNINGS - READ FIRST

### NEVER Modify Agent Core Logic
**MOST CRITICAL**: Never modify `mcp-services/agent/app.py` without extreme caution. This file controls the entire agent system.

- **Working Backup**: `mcp-services/agent/app.py.backup.websocket_fix` contains the last known working version
- **Common Failure**: Modifying tool execution logic breaks the entire agent system
- **Safe Restoration**: 
  ```bash
  cd mcp-services/agent
  cp app.py.backup.websocket_fix app.py
  docker compose -f docker-compose-all.yml restart agent
  ```
- **Test After Changes**: Always run `python test_agent_tools_comprehensive.py` after any agent modifications

### Code Quality and Build Requirements

Before committing any changes:
1. **Python Services**: Ensure virtual environment is activated and dependencies are installed
2. **React Apps**: Run `npm run build` to verify TypeScript compilation
3. **Agent Changes**: ALWAYS test with `python test_agent_tools_comprehensive.py`
4. **Port Conflicts**: Run `python port_scanner.py --fix` before starting services
5. **API Keys**: Verify with `python test_anthropic_api.py && python test_openai_api.py`

### Development Workflow Essentials
```bash
# ALWAYS check these before making changes
python test_anthropic_api.py && python test_openai_api.py  # Test API keys
curl http://localhost:8500/health                          # Check agent health
docker compose -f docker-compose-all.yml ps                # Check container status

# ALWAYS use these for safe startup
./launch.sh                        # Primary startup with conflict detection
python port_scanner.py --fix       # Resolve port conflicts
```

### Critical Files - Backup Before Modifying
- `mcp-services/agent/app.py` - **MOST CRITICAL** - AI agent orchestrator
- `launchpad/app.py` - WebSocket proxy and service coordinator
- `port_scanner.py` - Port conflict resolution system
- `launch.sh` - Primary startup script

## Build and Development Commands

### Quick Start
```bash
# Primary startup command
./launch.sh                           # Unified launcher with port conflict detection
python port_scanner.py --fix          # Auto-resolve port conflicts before startup

# Alternative startup with explicit conflict resolution
python port_scanner.py               # Check for conflicts first
./launch.sh                          # Then launch all services
```

### Essential Commands for Development
```bash
# Service health checks
curl http://localhost:8000/health     # Launchpad status
curl http://localhost:8500/health     # Agent status
docker compose -f docker-compose-all.yml ps  # All container status

# View logs for debugging
docker compose -f docker-compose-all.yml logs -f [service-name]
docker logs -f agent                  # Agent-specific logs (critical for debugging)

# Restart specific services
docker compose -f docker-compose-all.yml restart agent
docker compose -f docker-compose-all.yml restart launchpad

# Complete system reset
docker compose -f docker-compose-all.yml down
docker system prune -f
./launch.sh
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
# Run LinkedIn Generator standalone with podcast support
cd internal-solutions-linkedin-generator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm  # Download spaCy language model
export ANTHROPIC_API_KEY=your_anthropic_key_here
export OPENAI_API_KEY=your_openai_key_here
export MULMOCAST_URL=http://localhost:5008          # For Docker internal communication
export MULMOCAST_CLIENT_URL=http://localhost:5008   # For frontend audio access
python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload  # Starts service on port 5003 (mapped from 5000)

# Test API connectivity
python -c "import anthropic; print('Anthropic SDK installed')"
python -c "import openai; print('OpenAI SDK installed')"

# Test podcast generation
python -c "import requests; print('✅ Podcast test:', requests.get('http://localhost:5008/health').json())"

# Using Docker with podcast support
docker compose -f docker-compose-all.yml up linkedin-generator mulmocast

# Test podcast generation in browser
open test_linkedin_podcast.html  # Quick status check and audio player test
```

**CRITICAL PODCAST FIX APPLIED**: Fixed podcast audio URL generation where frontend couldn't access Mulmocast audio files. Added `MULMOCAST_CLIENT_URL` environment variable to generate client-accessible URLs (`http://localhost:5008`) instead of internal Docker URLs (`http://mulmocast:5008`).

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

#### FLUX LoRA Studio (Apple Silicon M3 Optimized)
```bash
# Local development (Apple Silicon M3 optimized)
cd internal-solutions-flux-lora-studio
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export PORT=5006 && python app.py  # Starts on port 5006

# Launch with local Apple Silicon optimization
./launch-flux-local.sh              # Launches Kohya_ss + web interface

# Using Docker (standard deployment)
docker compose -f docker-compose-all.yml up flux-lora-studio
```

#### MulmoCast (Multi-modal Presentation Platform)
```bash
# CLI development with GraphAI integration
cd internal-solutions-mulmocast
npm install
npm run build

# CLI usage with AI agents (8 different AI integrations)
npx mulmocast create --format video --input journey.json
npx mulmocast generate --output presentation.mp4

# Development with ESM modules
npm run dev          # TypeScript compilation in watch mode
npm run test         # tsx test runner (Node.js native testing)
npm run lint         # ESLint + Prettier

# 15+ specialized CLI commands for AI processing
npx mulmocast --help # View all available AI processing commands
```

#### Claude 4 Journey Mapper V2 (Enhanced React Architecture)
```bash
# Enhanced Claude 4 service with React 17 + Webpack
cd internal-solutions-claude4-journey-mapper-v2
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_api_key_here
python run.py        # Starts enhanced service (port varies)

# Frontend development (identical to main Journey Mapper)
npm install
npm run dev-server   # Webpack dev server
npm run build        # Webpack production build

# Note: This is an enhanced version of the main Claude 4 Journey Mapper
# with improved React architecture and additional features
```

#### Presentation AI (Next.js Platform)
```bash
# Modern Next.js 14 + React 18 + TypeScript 5.7
cd presentation-ai
npm install
npm run dev -p 3002  # Next.js dev server on port 3002
npm run build        # Next.js production build

# Database operations (Prisma ORM)
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio

# Advanced features
# - Plate editor with 40+ plugins for rich text editing
# - Radix UI component library for modern interface
# - AI SDK integration with multiple providers
# - No testing framework configured (potential improvement area)
```

#### AI Presentation Generator (Claude 4 Strategic Visual Intelligence)
```bash
# Standalone development with Claude 4 strategic visual generation
cd internal-solutions-presentation-generator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # Includes cairosvg, Wand for SVG processing
export ANTHROPIC_API_KEY=your_key && export OPENAI_API_KEY=your_key

# Install ImageMagick for enhanced SVG conversion (recommended)
brew install imagemagick
pip install --upgrade Wand cairosvg

# ALWAYS use the updated app.py with strategic visual intelligence
./start-claude4-svg.sh          # Enhanced startup script with dependency checks
# OR manually:
python app.py        # Starts on port 5007 with Claude 4 strategic visuals

# Using Docker (automatically includes all dependencies)
docker compose -f docker-compose-all.yml up presentation-generator
# Access via https://localhost:8452 (HTTPS proxy)

# Test Claude 4 strategic visual generation
curl http://localhost:5007/test-svg/strategic_framework  # Test strategic visuals  
curl http://localhost:5007/svg-capabilities              # View all visual types
curl -X POST http://localhost:5007/generate \
  -F "file=@business_strategy.pdf" \
  -F "output_format=pptx"                               # Generate strategic presentation

# Strategic visual types available:
# - strategic_framework: 2x2 matrices, competitive positioning
# - transformation_journey: Evolution paths, maturity models
# - ecosystem_diagram: Stakeholder maps, value networks
# - process_flow: Strategic workflows, decision frameworks
# - conceptual_model: Business model canvases, strategic architecture
# - relationship_map: Influence networks, organizational dynamics
# - strategic_metaphor: Visual analogies for complex concepts
```

**CRITICAL BUG FIX APPLIED**: Fixed "unhashable type: 'list'" error in Claude 4 SVG generation where `framework_type` could be passed as a list instead of string. The system now ensures type safety in the `generate_svg_with_claude4()` function, preventing crashes during strategic visual generation.

**CLAUDE 4 MODEL FIX APPLIED**: Updated both `analyze_content_with_ai()` and `generate_svg_with_claude4()` functions to use the correct Claude 4 model (`claude-sonnet-4-20250514`) instead of Claude 3.5 Sonnet. This ensures the service actually uses Claude 4's advanced reasoning capabilities for strategic visual intelligence.

**STRATEGIC VISUAL INTELLIGENCE**: The presentation generator now uses Claude 4's advanced reasoning to create sophisticated, consultative-grade visualizations focused on strategic frameworks rather than basic charts. This addresses user feedback requesting "more strategic and insightful and conceptual information graphics."

**CRITICAL: The app.py file contains Claude 4 SVG generation code. Always restart the service after modifications to load the updated code.**

#### Soundtrack Generator Development

```bash
# AI-powered soundtrack generation for multimedia content
cd internal-solutions-soundtrack-generator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your_openai_key_here    # Required for audio generation
python app.py        # Starts on port 5009

# Using Docker
docker compose -f docker-compose-all.yml up soundtrack-generator

# Test soundtrack generation endpoints
curl http://localhost:5009/health              # Service health check
curl -X POST http://localhost:5009/generate \
  -F "duration=30" \
  -F "mood=energetic" \
  -F "style=electronic"                       # Generate 30-second energetic electronic track
```

**Features**:
- AI-powered music composition using OpenAI's audio models
- Multiple genre and mood options (electronic, ambient, cinematic, etc.)
- Variable duration support (15s to 5 minutes)
- Integration with MulmoCast for multimedia presentations
- Real-time generation with progress tracking

### Testing Infrastructure

#### Test Commands by Category
```bash
# Essential API Testing (Run these first)
python test_anthropic_api.py      # Claude API (3.7 and 4) - REQUIRED
python test_openai_api.py         # OpenAI API (o3 and others) - REQUIRED
python test_whisper_api.py        # Whisper API for video transcription

# Agent & System Testing
python test_agent_tools_comprehensive.py    # Complete agent functionality
python test_complete_chatbot_functionality.py  # End-to-end testing
python test_mcp_tools.py          # All MCP service tools
python test_video_complete.py     # Video processing pipeline

# TypeScript Testing (Only Miro Generator has comprehensive test suite)
cd internal-solutions-miro-generator
npm test                          # Jest + TypeScript tests
npm run test:coverage             # Generate coverage reports
npm run test:watch                # Watch mode for development

# Modern Frontend Testing (Social Research - no tests configured yet)
cd internal-solutions-socialresearch/frontend
npm run lint                      # ESLint with TypeScript
npm run build                     # TypeScript compilation check
```

#### Critical Testing Notes
- **48+ Python test scripts** exist but no pytest framework is configured
- **Only Miro Generator** has comprehensive Jest testing infrastructure
- **React applications** lack configured test frameworks despite modern build systems (Social Research Tool has no vitest.config.ts, Journey Mapper has no jest.config.js)
- **Presentation AI** (Next.js) and **Claude 4 Journey Mapper V2** also lack test configurations
- **Most tests focus on API connectivity** rather than unit/integration testing
- **MulmoCast** uses Node.js native testing (`tsx --test`) but lacks comprehensive framework

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
# Modern Vite Stack (Social Research) - React 19 + TypeScript 5.7
cd internal-solutions-socialresearch/frontend  
npm install                      # Install dependencies
npm run lint                     # ESLint with TypeScript rules
npm run lint:fix                 # Auto-fix ESLint issues
npm run build                    # TypeScript + Vite production build
npm run preview                  # Preview production build
npm run dev                      # Development server with HMR (port 5173)

# Legacy Webpack Stack (Journey Mapper) - React 17 + Webpack 5
cd internal-solutions-journeymapper
npm install                      # Install dependencies
npm run build                    # Webpack production build
npm run dev-server               # Development server (port 3000 → proxy to 8000)
npm run start                    # Build + start backend

# TypeScript CLI (Miro Generator) - Only service with comprehensive testing
cd internal-solutions-miro-generator
npm install                      # Install dependencies
npm run build                    # TypeScript compilation
npm run lint                     # ESLint with TypeScript
npm run test                     # Jest test suite
npm run test:coverage            # Test coverage reports
npm run test:watch               # Watch mode for TDD
npm run dev                      # ts-node development mode
```

#### Python Service Quality Standards
```bash
# FastAPI Services (Modern Pattern)
cd internal-solutions-[service-name]
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port [PORT] --reload  # Development with auto-reload

# Flask Services (Legacy Pattern) 
cd internal-solutions-[service-name]
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python run.py                    # Standard Flask startup

# Testing (No pytest framework - ad-hoc scripts only)
python test_[service]_api.py     # Service-specific API tests
python test_[feature].py         # Feature-specific tests
```

## Development Patterns & Code Conventions

### Technology Stack Decision Matrix
When working with different services, understand which technology stack to use:

**Modern React Stack (Social Research Tool)**:
- **When to use**: New frontend features, modern UI components, performance-critical interfaces
- **Pattern**: React 19 + Vite + TypeScript 5.7 + Tailwind CSS + Redux Toolkit
- **Key files**: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`
- **Commands**: `npm run dev` (port 5173), `npm run build`, `npm run lint`

**Legacy React Stack (Journey Mapper)**:
- **When to use**: Mermaid diagram integration, stable ecosystem compatibility
- **Pattern**: React 17 + Webpack 5 + Babel + Custom configuration
- **Key files**: `webpack.config.js`, `package.json` (note: no modern test framework)
- **Commands**: `npm run dev-server` (port 3000), `npm run build`

**TypeScript CLI (Miro Generator)**:
- **When to use**: Command-line tools, comprehensive testing needed
- **Pattern**: TypeScript 5.3 + Commander.js + Jest 29.7 + ES2022
- **Key files**: `jest.config.js`, `tsconfig.json` with path aliases
- **Commands**: `npm test`, `npm run test:coverage`, `npm run test:watch`

**Next.js Platform (Presentation AI)**:
- **When to use**: Full-stack applications, rich text editing, database integration
- **Pattern**: Next.js 14 + React 18 + TypeScript 5.7 + Prisma ORM
- **Key files**: `next.config.js`, Advanced Plate editor, Radix UI components
- **Commands**: `npm run dev -p 3002`, `npm run db:push`, `npm run db:studio`

**Advanced ESM CLI (MulmoCast)**:
- **When to use**: Complex AI orchestration, multi-modal content processing
- **Pattern**: TypeScript 5.7 + GraphAI + ESModule + 8 AI agent integrations
- **Key files**: `package.json` with ESModule type, `tsconfig.json` with NodeNext
- **Commands**: `tsx --test` (Node.js native), 15+ specialized AI commands

### Service Development Patterns

#### FastAPI Services (Modern - Ports 5002-5007, 8090, 8095)
```python
# Standard pattern for modern services
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class RequestModel(BaseModel):
    field: str

@app.post("/api/endpoint")
async def endpoint(request: RequestModel):
    # Use async/await patterns
    result = await process_data(request.field)
    return {"result": result}

# Development server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
```

#### Flask Services (Legacy - Ports 5001, 8080, 8081)
```python
# Standard pattern for legacy services
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/endpoint', methods=['POST'])
def endpoint():
    data = request.json
    result = process_data(data['field'])
    return jsonify({"result": result})

# Standard Flask startup
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=True)
```

#### MCP Service Wrapper Pattern (Ports 8501-8507)
```python
# Standard MCP wrapper pattern
from fastapi import FastAPI
import httpx

app = FastAPI()

@app.post("/tools/{tool_name}")
async def tool_proxy(tool_name: str, payload: dict):
    # Proxy to core service with parameter conversion
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{CORE_SERVICE_URL}/{tool_name}", json=payload)
        return response.json()
```

### Environment Configuration Patterns

#### Service-Level Environment Management
```bash
# Root level configuration
/.env                           # Master configuration for all services

# Service-specific overrides
/internal-solutions-[service]/.env     # Service-specific environment variables
/internal-solutions-[service]/.env.example  # Developer templates
```

#### Required Environment Variables by Service Type
```bash
# All AI Services
ANTHROPIC_API_KEY=your_key     # Required for Claude 3.7 and 4 services
OPENAI_API_KEY=your_key        # Required for OpenAI and Whisper services

# MCP Agent Configuration
AGENT_WS_URL=ws://agent:8500          # Container-to-container WebSocket URL
AGENT_CLIENT_WS_URL=ws://localhost:8500  # Client-to-container WebSocket URL

# Database Services (Social Research Only)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PGVECTOR_ENABLED=true
```

### Testing Strategy by Technology Stack

#### Jest Testing (TypeScript - Miro Generator Only)
```json
// jest.config.js - Only comprehensive testing framework
{
  "testEnvironment": "node",
  "testTimeout": 30000,
  "coverageReporters": ["text", "lcov", "html"],
  "testPathIgnorePatterns": ["/node_modules/", "/dist/"]
}
```

#### Python Testing (Ad-hoc Scripts - No pytest framework)
```bash
# API connectivity testing
python test_anthropic_api.py          # ALWAYS run first
python test_openai_api.py             # ALWAYS run first
python test_whisper_api.py            # For video services

# System integration testing
python test_agent_tools_comprehensive.py  # Complete agent functionality
python test_complete_chatbot_functionality.py  # End-to-end testing
python test_mcp_tools.py               # All MCP service tools
```

#### Setting Up Testing Frameworks (Future Improvement)
```bash
# For Python services (recommended setup)
# Create pytest.ini in project root:
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*

# For Social Research frontend (recommended setup)
# Create vitest.config.ts:
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

### Docker Development Patterns

#### Multi-Compose Strategy
```bash
# Full stack deployment
docker-compose-all.yml          # All 14 services + infrastructure

# Development scenarios
dynamic-compose.yml             # Environment-based port allocation
docker-compose-https.yml        # HTTPS proxy with SSL certificates
docker-compose-claude4.yml      # Claude 4 specific services only
docker-compose-video-fixed.yml  # Video transcriptor only
```

#### Container Networking Patterns
```yaml
# Standard service definition pattern
services:
  service-name:
    build: ./internal-solutions-service-name
    ports:
      - "${SERVICE_PORT:-5001}:5000"  # Environment-based port mapping
    networks:
      - nxt-humans-network            # Shared network for inter-service communication
    environment:
      - API_KEY=${API_KEY}            # Environment variable injection
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
FLUX_LORA_STUDIO_PORT=5006           # Optional, default: 5006
PRESENTATION_GENERATOR_PORT=5007     # Optional, default: 5007
SOUNDTRACK_GENERATOR_PORT=5009       # Optional, default: 5009

# MCP Service Ports
AGENT_PORT=8500                      # Agent service
REDDIT_MCP_PORT=8501                 # Reddit MCP service
SOCIAL_MCP_PORT=8502                 # Social MCP service
JOURNEY_MCP_PORT=8503                # Journey MCP service
CLAUDE4_MCP_PORT=8003                # Claude 4 MCP service
OPENAI_JOURNEY_MCP_PORT=8505         # OpenAI Journey MCP service
VIDEO_MCP_PORT=8504                  # Video MCP service
MULMOCAST_MCP_PORT=8507              # MulmoCast MCP service

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
FLUX_LORA_STUDIO_CLIENT_URL=http://localhost:5006
PRESENTATION_GENERATOR_CLIENT_URL=http://localhost:5007
SOUNDTRACK_GENERATOR_CLIENT_URL=http://localhost:5009
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

7. **MulmoCast Tools**
   - `mulmocast.create`: Create multimedia presentations from data
   - `mulmocast.generate`: Generate video/audio content
   - `mulmocast.get_formats`: List available output formats

**Note**: The LinkedIn Post Generator, Miro Board Generator, Image Caption Generator, FLUX LoRA Studio, and AI Presentation Generator are currently available as standalone services (ports 5003-5007) but some lack MCP integration for AI Agent access. The LinkedIn Generator creates professional LinkedIn content using "Extended Thinking" analysis. The Miro Generator provides a TypeScript CLI for interactive Miro boards. The Image Caption Generator uses MobileNetV2 and LSTM models. FLUX LoRA Studio offers real local LoRA training optimized for Apple Silicon M3. The AI Presentation Generator creates professional PowerPoint presentations using dual AI analysis.

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
MulmoCast MCP:          8507 (MulmoCast multimedia wrapper)
```

**Communication Flow**: `Client → Launchpad (8000) → Agent (8500) → MCP Service (850x) → Tool Service`

## Critical Development Guidelines

### CRITICAL: Agent Service Modification Warning

**⚠️ NEVER modify `/mcp-services/agent/app.py` core logic without extreme caution**

- **Working Backup**: `mcp-services/agent/app.py.backup.websocket_fix` contains the last known working version
- **Common Failure**: Modifying tool execution logic breaks the entire agent system
- **Safe Restoration**: `cp app.py.backup.websocket_fix app.py && docker compose -f docker-compose-all.yml restart agent`
- **Core Functions**: Never modify `process_message()` or `parse_tool_calls()` functions
- **Testing**: Always test tool execution after any agent changes with `python test_agent_tools_comprehensive.py`

### TypeScript and Frontend Architecture Patterns

**Modern Stack (Social Research Tool)**:
- TypeScript 5.7+ with strict compilation and path aliases (`@/*` → `./src/*`)
- React 19 + Vite 6+ with ESM modules and lightning-fast HMR
- Redux Toolkit 2.6+ for state management, Material-UI 6.4+ components
- **No testing framework configured** despite modern build system

**Legacy Stack (Journey Mapper)**:
- React 17 + Webpack 5 with Babel for Mermaid diagram compatibility
- Custom Webpack configuration for stable ecosystem integration
- Proxy configuration for development (port 3000 → 8000)

**Professional CLI (Miro Generator)**:
- TypeScript 5.3+ with Jest 29.7+ comprehensive testing suite
- ES2022 target with Commander.js and full coverage reporting
- **Only service with complete test infrastructure**

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

**Content Generation & Training Architecture**:
- **FLUX LoRA Studio**: Real local LoRA training using Kohya_ss backend optimized for Apple Silicon M3
- **MulmoCast**: Multi-modal presentation platform with MulmoScript JSON format for AI-native content
- **AI Presentation Generator**: Dual AI analysis pipeline (Claude 3.7 + OpenAI GPT-4o) for PowerPoint generation

## Key File Locations & Development Priorities

### Most Critical Files (Modify with Extreme Caution)
- `mcp-services/agent/app.py`: **CRITICAL** - AI agent orchestrator (has working backup)
- `launchpad/app.py`: WebSocket proxy and service coordinator
- `port_scanner.py`: Port conflict resolution system
- `launch.sh`: Primary startup script with conflict detection

#### FastAPI Services (Modern Python)
- `internal-solutions-claude4-journey-mapper/run.py`: Claude 4 Journey Mapper (advanced reasoning)
- `internal-solutions-openai-journey-mapper/run.py`: OpenAI o3 Journey Mapper (reasoning models)  
- `internal-solutions-video-analyzer/run.py`: Video Transcriptor (YouTube + file upload)
- `internal-solutions-linkedin-generator/app.py`: LinkedIn Generator (Extended Thinking pipeline)
- `internal-solutions-image-captioner/app.py`: Image Caption Generator (TensorFlow + Claude Vision)
- `internal-solutions-presentation-generator/app.py`: AI Presentation Generator (Dual AI pipeline)

#### Flask Services (Legacy Python)
- `internal-solutions-journeymapper/run.py`: Journey Mapper Claude 3.7 (Webpack + React 17)
- `internal-solutions-socialresearch/backend/run.py`: Social Research backend (pgvector)
- `internal-solutions-flux-lora-studio/app.py`: FLUX LoRA Studio (Apple Silicon M3)

#### TypeScript Services
- `internal-solutions-miro-generator/src/index.ts`: Miro Generator CLI (Jest testing)
- `internal-solutions-mulmocast/src/cli/bin.ts`: MulmoCast CLI (GraphAI integration)
- `internal-solutions-socialresearch/frontend/src/main.tsx`: Social Research frontend (React 19 + Vite)
- `presentation-ai/src/app/page.tsx`: Presentation AI main page (Next.js 14 + Prisma)
- `internal-solutions-claude4-journey-mapper-v2/run.py`: Enhanced Claude 4 Journey Mapper

#### MCP Service Wrappers (Port 8501-8507)
- `mcp-services/reddit-mcp/app.py`: Reddit Data Collector wrapper
- `mcp-services/social-mcp/app.py`: Social Research wrapper  
- `mcp-services/journey-mcp/app.py`: Claude 3.7 Journey Mapper wrapper
- `mcp-services/claude4-journey-mcp/app.py`: Claude 4 Journey Mapper wrapper
- `mcp-services/openai-journey-mcp/app.py`: OpenAI o3 Journey Mapper wrapper
- `mcp-services/video-mcp/app.py`: Video Transcriptor wrapper

### Frontend Build Configuration Files
- `internal-solutions-socialresearch/frontend/package.json`: Modern Vite + TypeScript stack
- `internal-solutions-socialresearch/frontend/vite.config.ts`: Vite configuration with path aliases
- `internal-solutions-socialresearch/frontend/tsconfig.json`: TypeScript strict configuration
- `internal-solutions-journeymapper/package.json`: Legacy Webpack + React 17 stack
- `internal-solutions-journeymapper/webpack.config.js`: Custom Webpack configuration for Mermaid
- `internal-solutions-miro-generator/package.json`: TypeScript CLI tool with Jest testing
- `internal-solutions-miro-generator/tsconfig.json`: TypeScript configuration with ES2022 target and path aliases
- `internal-solutions-miro-generator/jest.config.js`: Jest configuration for comprehensive testing
- `internal-solutions-mulmocast/package.json`: Advanced ESM + GraphAI stack with multiple AI integrations
- `internal-solutions-mulmocast/tsconfig.json`: TypeScript 5.7+ configuration with ESM modules
- `presentation-ai/package.json`: Next.js 14 + React 18 + TypeScript 5.7 with Plate editor
- `presentation-ai/next.config.js`: Next.js configuration with AI SDK integration
- `internal-solutions-claude4-journey-mapper-v2/package.json`: Enhanced Claude 4 React architecture

### Critical Backup Files
- `mcp-services/agent/app.py.backup.websocket_fix`: Working agent backup (restore if tool execution breaks)
- `launchpad/static/chatbot.js`: Frontend chat client (source of link corruption issue)
- `client-fallback.js`: Browser-side WebSocket reconnection fallback

## Testing Infrastructure Reality Check

### Critical Testing Infrastructure Assessment

**IMPORTANT**: Despite extensive documentation, the testing infrastructure has significant gaps that affect development workflow.

#### Testing Framework Status by Service:
- ✅ **Miro Generator Only**: Complete Jest + TypeScript testing framework (jest.config.js, 30s timeout, coverage reports)
- ❌ **Social Research Tool**: No testing framework configured (React 19 + Vite 6 has no vitest.config.ts)
- ❌ **Journey Mapper**: No testing framework configured (React 17 + Webpack has no jest.config.js)
- ❌ **All Python Services**: 30+ ad-hoc test scripts without pytest framework (no pytest.ini, conftest.py, or pyproject.toml)

#### Missing Critical Test Configurations:
```bash
# What should exist but doesn't:
pytest.ini                                                    # Python test configuration
conftest.py                                                   # Python test fixtures  
internal-solutions-socialresearch/frontend/vitest.config.ts   # Modern React testing
internal-solutions-journeymapper/jest.config.js              # Legacy React testing
presentation-ai/jest.config.js                               # Next.js testing
internal-solutions-claude4-journey-mapper-v2/jest.config.js  # Enhanced Claude 4 testing
internal-solutions-mulmocast/jest.config.js                  # Advanced CLI testing (uses tsx --test instead)
```

#### Available Testing (Jest - TypeScript Only):
```bash
cd internal-solutions-miro-generator
npm test                    # Jest + TypeScript with 30s timeout
npm run test:coverage       # Text, LCOV, and HTML reporters  
npm run test:watch          # Watch mode for TDD
```

#### Available Testing (Python - Ad-hoc Scripts):
```bash
# Core functionality validation (no unified framework)
python test_agent_tools_comprehensive.py test_complete_chatbot_functionality.py
python test_anthropic_api.py test_openai_api.py test_whisper_api.py

# Service-specific testing  
python test_mcp_tools.py test_video_complete.py test_websocket_server.py
```

## Development Workflow Best Practices

### Before Making Changes
1. **Test API Keys**: `python test_anthropic_api.py && python test_openai_api.py`
2. **Check Agent Health**: `curl http://localhost:8500/health`
3. **Backup Critical Files**: Especially if modifying `mcp-services/agent/app.py`
4. **Identify Technology Stack**: FastAPI vs Flask, React 19 vs React 17, Jest vs ad-hoc testing

### Making Changes Safely
1. **Use Appropriate Testing**: Jest for Miro Generator, ad-hoc scripts for Python services
2. **Follow Stack Patterns**: Modern stack (Vite + React 19) vs Legacy stack (Webpack + React 17)
3. **Test Tool Execution**: `python test_agent_tools_comprehensive.py` after agent changes
4. **Check Service Integration**: Test MCP service wrappers if modifying core services

### Code Quality Standards

#### Python Services
- **FastAPI**: Use async/await patterns, Pydantic models, proper error handling
- **Flask**: Follow existing patterns, use SQLAlchemy ORM for database services
- **Type Hints**: All function parameters and return values
- **Error Handling**: Specific exceptions, proper logging
- **Testing**: Create corresponding `test_*.py` scripts for new functionality (no pytest framework available)

#### TypeScript Services
- **Modern Stack (Social Research)**: React 19 hooks, strict TypeScript, Redux Toolkit patterns
- **Legacy Stack (Journey Mapper)**: React 17 patterns, Webpack compatibility
- **CLI Tools (Miro Generator)**: Commander.js patterns, comprehensive Jest testing
- **Path Aliases**: Use `@/*` imports where configured

#### TypeScript Configuration Patterns

**Advanced Path Mapping (Miro Generator)**:
```json
{
  "paths": {
    "@/*": ["src/*"],
    "@cli/*": ["src/cli/*"],
    "@parsers/*": ["src/parsers/*"],
    "@miro/*": ["src/miro/*"],
    "@utils/*": ["src/utils/*"],
    "@types/*": ["src/types/*"]
  }
}
```

**Modern React Configuration (Social Research)**:
```json
{
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Development Patterns**:
- **ES2022 Target**: Modern JavaScript features in CLI tools
- **Project References**: Vite-optimized TypeScript compilation
- **Strict Configuration**: Professional-grade type checking with selective overrides

## Environment Configuration Architecture

### Multi-Level Environment Management

The platform uses a hierarchical environment configuration system that can be complex to navigate:

**Root Level**: `/.env` (master configuration)
**Service Level**: Individual service `.env` files for service-specific overrides
**Development**: `.env.example` templates for developer onboarding

#### Environment File Hierarchy:
```bash
.env                                           # Master configuration
internal-solutions-video-analyzer/.env         # Service-specific overrides
internal-solutions-presentation-generator/.env # Service-specific overrides
internal-solutions-socialresearch/.env.example # Development template
```

#### Environment Injection Scripts:
- `internal-solutions-video-analyzer/set_env_at_startup.py`
- Service-specific environment loading patterns throughout the codebase

## Additional Documentation References

The project includes 35+ specialized documentation files for specific scenarios:

### Architecture & Integration Documentation
- `mcp-agent-architecture.md`: Detailed MCP service architecture
- `WEBSOCKET-FIX-DOCUMENTATION.md`: WebSocket connection troubleshooting
- `TOOL-INTEGRATION-GUIDE.md`: MCP tool integration patterns
- `PORT-CONFLICT-MANAGEMENT.md`: Port conflict resolution strategies

### Service-Specific Fix Documentation
- `CX-AGENT-FIXES.md`: Agent parameter naming fixes
- `CLAUDE4-JOURNEY-MAPPER-INTEGRATION-FIX.md`: Claude 4 integration details
- `VIDEO_TRANSCRIBER_FIX_SUMMARY.md`: Video service fixes
- `PRESENTATION_GENERATOR_DEPLOYMENT_SUMMARY.md`: Presentation service deployment

### Development & Operations Guides
- `brand-style-guide.md`: NXT Humans branding specifications
- `FLUX-LOCAL-LAUNCHER.md`: Local LoRA training setup
- `API-KEY-SETUP.md`: API key configuration guide
- `WHISPER-API-GUIDE.md`: Whisper integration details

## Development Automation Scripts

### Script Categories in `backup-scripts/`

The `backup-scripts/` directory contains critical development automation and over 40 specialized scripts organized by function:

```bash
# Launch Scripts (12+ variants)
backup-scripts/unified-launch.sh              # Comprehensive launcher
backup-scripts/quick-launch.sh                # Fast development startup  
backup-scripts/enhanced-check-and-run.sh      # With conflict detection

# Fix Scripts (20+ specialized)
backup-scripts/fix-websocket-connection.sh    # WebSocket debugging
backup-scripts/fix-reddit-tools.sh            # Tool parameter fixes
backup-scripts/patch-agent-hallucination.sh   # Agent behavior fixes

# API Key Management (5+ scripts)
backup-scripts/update_anthropic_key_enhanced.sh
backup-scripts/update-whisper-key.sh
backup-scripts/test-whisper-key.sh

# Monitoring & Debugging (8+ scripts)
backup-scripts/monitor-video-service.sh
backup-scripts/verify-tools.sh
backup-scripts/debug.sh
```

#### Critical Scripts for Development:
- `backup-scripts/enhanced-check-and-run.sh`: Pre-startup validation with port conflict detection
- `backup-scripts/fix-websocket-connection.sh`: Connection recovery procedures
- `backup-scripts/patch-agent-hallucination.sh`: Agent behavior fixes and recovery

## SSL Certificate Management

### Certificate Infrastructure

Complete SSL certificate management system for HTTPS development:

```bash
ssl-certs/
├── localhost+2-key.pem          # Multi-domain private key
├── localhost+2.pem              # Multi-domain certificate  
├── localhost.crt                # Standard certificate
├── localhost.key                # Standard private key
└── openssl.conf                 # Certificate configuration

# Certificate Management Scripts:
setup-https.sh                   # Automated HTTPS setup
setup-trusted-https.sh           # Trusted certificate installation
install-certificate.sh          # Browser certificate installation
```

#### HTTPS Proxy Configuration:
- **nginx-https.conf**: Production HTTPS configuration
- **nginx-simple.conf**: Development HTTPS configuration
- **Extended Timeouts**: 500MB upload support with 10-minute timeouts

## CI/CD and Deployment

### Azure Container Apps Integration (Social Research Tool)

The Social Research Tool includes production deployment infrastructure:

- **GitHub Actions**: Automated build and deployment pipeline (`.github/workflows/build-and-deploy.yml`)
- **Azure ACR**: Container registry integration with automated image builds
- **Production Environment**: `social-research-env` in East US 2
- **Configuration**: `compose.deploy.yml` for production builds, `containerapp.yaml` for Azure deployment

```bash
# Production deployment
docker compose -f compose.deploy.yml build
docker compose -f compose.deploy.yml push
```

## Architecture Visualization

### Service Communication Flow:
```
Client Browser → Launchpad (8000) → Agent (8500) → MCP Services (8501-8507) → Core Services (5001-5008, 8080-8095)
```

### Port Allocation Matrix:
```
Core Services:     5001-5008, 8080-8095
MCP Wrappers:      8501-8507  
Infrastructure:    8000 (Launchpad), 8500 (Agent)
HTTPS Proxy:       8443-8450
```

### Technology Stack Matrix:
```
Cutting-Edge Frontend: React 19.0.0 + Vite 6.1.0 + TypeScript 5.7.2 (Social Research)
Next.js Platform:      Next.js 14.2.23 + React 18.2.0 + TypeScript 5.7.3 (Presentation AI)
Advanced CLI:          TypeScript 5.7.3 + GraphAI + ESModule (MulmoCast)
Professional CLI:      TypeScript 5.3.2 + Jest 29.7.0 + ES2022 (Miro Generator)
Legacy Frontend:       React 17.0.2 + Webpack 5.64.0 + Babel 7.16.0 (Journey Mappers)
Backend:              FastAPI (modern) + Flask (legacy)
Databases:            PostgreSQL 16 + pgvector + Prisma ORM
Infrastructure:       Docker + nginx + SSL certificates
```

## Docker Architecture Patterns

### Dockerfile Variants by Service Type:
- **Standard Dockerfiles**: Basic containerization
- **Enhanced Dockerfiles**: `Dockerfile.enhanced` for optimized builds
- **Simple Dockerfiles**: `Dockerfile.simple` for minimal containers
- **Development Dockerfiles**: Development-specific configurations

#### Container Optimization Patterns:
```bash
# Multi-stage build patterns
internal-solutions-*/Dockerfile.enhanced       # Production-optimized
internal-solutions-*/Dockerfile.simple         # Minimal footprint
presentation-ai/Dockerfile.simple              # Next.js optimized
```

#### Frontend Container Architecture:
- **Dual-container Pattern**: Frontend + Backend separation (Social Research)
- **Single-container Pattern**: Monolithic services
- **CLI Container Pattern**: Tool-based containers (Miro Generator)
- **Next.js Container Pattern**: Full-stack applications with database integration (Presentation AI)

## Important Notes for Future Development

### Keeping CLAUDE.md Updated

This file should be updated when:
- New services are added to the platform
- Technology stacks are upgraded (React versions, TypeScript, etc.)
- Testing frameworks are implemented 
- New build commands or development patterns are introduced
- Critical architecture changes affect multiple services

### Current Gaps to Address

1. **Testing Infrastructure**: Implement modern testing frameworks for Social Research Tool (vitest), Journey Mappers (jest), and Presentation AI
2. **Service Discovery**: Some services (Presentation AI, Claude 4 V2) were not documented until this analysis
3. **Version Management**: Track major dependency updates across the 16+ services
4. **Documentation Sync**: Ensure README.md and CLAUDE.md stay synchronized with actual service capabilities

## Quick Reference Commands

### Essential Daily Commands
```bash
# Start everything
./launch.sh

# Check system health
python test_anthropic_api.py && python test_openai_api.py
curl http://localhost:8500/health && curl http://localhost:8000/health

# Fix port conflicts
python port_scanner.py --fix

# Restart agent (safe)
docker compose -f docker-compose-all.yml restart agent

# View logs
docker compose -f docker-compose-all.yml logs -f agent
docker compose -f docker-compose-all.yml logs -f [service-name]
```

### Development by Service Type
```bash
# Modern React Stack (Social Research)
cd internal-solutions-socialresearch/frontend && npm run dev

# Legacy React Stack (Journey Mappers)  
cd internal-solutions-journeymapper && npm run dev-server

# TypeScript CLI (Miro Generator)
cd internal-solutions-miro-generator && npm test

# Next.js Platform (Presentation AI)
cd presentation-ai && npm run dev -p 3002

# FastAPI Services
uvicorn app:app --host 0.0.0.0 --port [PORT] --reload

# Flask Services
python run.py
```