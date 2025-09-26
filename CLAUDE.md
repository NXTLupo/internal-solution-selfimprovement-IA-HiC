# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **LAST UPDATED**: September 2025 - Reflects current Windows environment and all active services

## 🚨 **CRITICAL START HERE** - First Time Setup

**Before doing ANYTHING else, run these commands in order:**

```bash
# 1. ESSENTIAL: Test API keys (will fail if not configured)
python test-anthropic-api.py && python test_openai_api.py

# 2. ESSENTIAL: Fix port conflicts (common issue on Windows)
python port_scanner.py --fix

# 3. ESSENTIAL: Check Docker is running
docker --version

# 4. Start the platform
./launch.sh
```

### 🔐 **Security Warning**
**NEVER commit API keys to the repository.** Always use `.env` files and ensure they are in `.gitignore`. If you find hardcoded API keys in any files, immediately:
1. Remove the hardcoded keys
2. Add them to `.env` files
3. Update the code to read from environment variables

**Critical Files - Never Modify Without Extreme Caution:**
- `mcp-services/agent/app.py` ⚠️ **MOST CRITICAL** - has backup at `app.py.backup.websocket_fix`
- `launchpad/app.py` - WebSocket proxy coordinator
- `port_scanner.py` - Port conflict resolution
- `launch.sh` - Primary startup script

**If Tools Stop Working:** `docker compose -f docker-compose-all.yml restart agent`

### 🔧 **Common Issues Quick Fix**

| Problem | Solution | Command |
|---------|----------|---------|
| **Agent not responding** | Restart agent service | `docker compose -f docker-compose-all.yml restart agent` |
| **Port conflicts** | Auto-kill conflicting processes | `python port_scanner.py --fix` |
| **API keys not working** | Test and verify keys | `python test-anthropic-api.py && python test_openai_api.py` |
| **Services won't start** | Check Docker is running | `docker --version` then `./launch.sh` |
| **WebSocket issues** | Apply connection fix | `./backup-scripts/fix-websocket-connection.sh` |

---

## Overview

The NXT Humans AI CX Workbench is a comprehensive microservices platform for customer experience research and analysis, featuring **17+ integrated services** with unified AI agent orchestration. The platform is currently running on **Windows** environment and all services have been verified as active.

### Critical Current State Information:
- **Environment**: Windows 10/11 (file paths use backslashes)
- **Git Status**: Some modified files (docker-compose-all.override.yml, docker-compose.yml)
- **Recently Added**: Consistent Character Generator service (Port 5010)
- **Key Services Verified**: All services documented and operational

### Main Applications:

1. **Reddit Data Collector** (Port 5001): Gathers Reddit data from subreddits (`internal-solutions-reddit-ripper`)
2. **Social Research Analysis Tool** (Ports 3000/8081): Advanced analytics with topic modeling and sentiment analysis using PostgreSQL+pgvector (`internal-solutions-socialresearch`)
3. **AI Journey Mapper (Claude 3.7)** (Port 8080): Customer journey mapping using Claude 3.7 Sonnet (`internal-solutions-journeymapper`)
4. **AI Journey Mapper (Claude 4)** (Port 8095): Advanced customer journey mapping using Claude 4 Sonnet (`internal-solutions-claude4-journey-mapper-v2`)
5. **AI Journey Mapper (OpenAI o3)** (Port 8090): Customer journey mapping using OpenAI's o3 reasoning model (`internal-solutions-openai-journey-mapper`)
6. **LinkedIn Post Generator** (Port 5003): Professional content creation using Extended Thinking analysis (`internal-solutions-linkedin-generator`)
7. **Miro Board Generator** (Port 5004): TypeScript CLI tool for converting journey maps to interactive Miro boards (`internal-solutions-miro-generator`)
8. **Video Transcriptor** (Port 5002): Video/audio transcription and analysis via Whisper API (`internal-solutions-video-analyzer`)
9. **Image Caption Generator** (Port 5005): AI-powered image captioning using Claude vision models (`internal-solutions-image-captioner`)
10. **FLUX LoRA Studio** (Port 5006): Real local LoRA training using Kohya_ss backend (`internal-solutions-flux-lora-studio`)
11. **AI Presentation Generator** (Port 5007): Dual AI analysis pipeline for creating professional PowerPoint presentations (`internal-solutions-presentation-generator`)
12. **Soundtrack Generator** (Port 5009): AI-powered audio content generation for multimedia presentations (`internal-solutions-soundtrack-generator`)
13. **Consistent Character Generator** (Port 5010): Gemini-powered character generation with consistency across images (`internal-solutions-consistent-character-generator`)
14. **AI Agent Assistant** (Port 8500): Multimodal chatbot agent with MCP tool integration (`mcp-services/agent`)
15. **MCP Services** (Ports 8501-8507): Lightweight wrappers for tool integration (`mcp-services/`)

## Architecture

The workbench uses a microservices architecture with Docker for containerization. Each service runs independently and communicates through a shared Docker network using the Model Context Protocol (MCP) pattern.

### Service Communication Flow

```
Client Browser → Launchpad (8000) → Agent (8500) → MCP Services (8501-8507) → Core Services (5001-5010, 8080-8095)
```

**How it works:**
1. **Client requests** go to the Launchpad web interface
2. **Launchpad** proxies WebSocket connections to the Agent service
3. **Agent** receives user messages and determines which tools to invoke
4. **MCP Services** act as standardized wrappers around core tools
5. **Core Services** perform the actual work (data collection, analysis, generation)

## ⚠️ CRITICAL: Windows Development Environment Notes

**This platform is currently running on Windows**. Be aware of the following Windows-specific considerations:

### Windows Path Handling
- File paths in this codebase use Windows backslashes (`C:\Users\...`)
- When running bash scripts, use Git Bash, WSL, or PowerShell with bash compatibility
- Python scripts should use `os.path.join()` or `pathlib.Path` for cross-platform compatibility

### Windows-Specific Commands
```cmd
# Use these Windows-compatible approaches:

# For PowerShell:
python port_scanner.py --fix
docker compose -f docker-compose-all.yml up -d

# For Git Bash:
./launch.sh

# For Command Prompt:
python port_scanner.py
docker compose -f docker-compose-all.yml ps
```

### Docker Desktop Requirements
- **Docker Desktop must be running** before launching services
- Allocate at least 8GB RAM in Docker Desktop settings
- Enable file sharing for the project directory
- WSL2 backend recommended for better performance

## Quick Start

For immediate deployment of the entire workbench:

```bash
# WINDOWS USERS: Use Git Bash, WSL, or PowerShell for these commands

# ESSENTIAL FIRST STEPS (run every time):
python test-anthropic-api.py && python test_openai_api.py  # Verify API keys work
python port_scanner.py --fix          # Auto-resolve port conflicts (critical on Windows)

# One-command startup (recommended for new users)
./launch.sh                           # Includes SSL cert generation, port conflict resolution, and HTTPS proxy

# Prerequisites check before launch (optional)
python port_scanner.py                  # Check for port conflicts
docker --version && docker compose version  # Verify Docker setup

# Alternative: Use backup scripts for specific components
./backup-scripts/unified-launch.sh      # Unified launcher with all services
./backup-scripts/launch-with-all-services.sh  # Legacy all-services launcher
```

### Common Development Commands

```bash
# Test suite (run before making changes)
python test-anthropic-api.py && python test_openai_api.py
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
  GEMINI_API_KEY=your_gemini_key  # For Consistent Character Generator
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
5. **API Keys**: Verify with `python test-anthropic-api.py && python test_openai_api.py`

### Critical Files - Backup Before Modifying
- `mcp-services/agent/app.py` - **MOST CRITICAL** - AI agent orchestrator
- `launchpad/app.py` - WebSocket proxy and service coordinator
- `port_scanner.py` - Port conflict resolution system
- `launch.sh` - Primary startup script

## 🔧 CURRENT STATE REALITY CHECK

### Verified Technology Stacks
**Social Research Tool** (Most Advanced):
- Frontend: React 19.0.0 + TypeScript 5.7.2 + Vite 6.1.0 + Material-UI 6.4.3 + Redux Toolkit 2.6.0
- Backend: Flask + PostgreSQL 16+ + pgvector
- **Status**: Fully modern stack with proper dependency management

**Miro Generator** (Only Complete Testing):
- TypeScript 5.3.2 + Commander.js 11.1.0 + Jest 29.7.0
- **Status**: Professional CLI with comprehensive test suite (30s timeout, coverage reports)

**Journey Mappers** (Legacy but Stable):
- React 17.0.2 + Webpack 5.64 + Babel (for Mermaid compatibility)
- **Status**: Stable legacy stack

**Consistent Character Generator** (Newest Service):
- React + TypeScript + Vite + Python Flask backend
- **Status**: Newest service with modern architecture

### Critical Gaps Identified
1. **Testing Infrastructure**: Only Miro Generator has comprehensive Jest testing framework with 30s timeout and coverage
2. **Python Testing**: No pytest.ini or unified test framework despite 48+ test scripts across services
3. **Frontend Testing**: Social Research Tool (React 19 + Vite 6) lacks vitest.config.ts, Journey Mappers lack jest.config.js

## Component-Specific Development Guidelines

### AI Journey Mapper (Claude 4)
- **Run App**: `python run.py` (auto-selects port from 8095, 8080, 5000, 3000, 9000)
- **Manual Start**: `uvicorn src.app:app --host=0.0.0.0 --port=8095 --reload`
- **Testing**: `python -m pytest tests/`
- **Type Checking**: `mypy src/`
- **Lint**: `flake8 src/`

**Code Style**:
- Use Python type hints for function parameters and return values
- Group imports (stdlib, third-party, local) with space between groups
- 4-space indentation, 120 char line limit
- Snake_case for variables/functions, PascalCase for classes

### Social Research Tool
```bash
# Frontend (React 19 + TypeScript + Vite)
cd internal-solutions-socialresearch/frontend
npm install
npm run dev          # Development server on port 5173
npm run build        # Production build
npm run lint         # ESLint with TypeScript

# Backend (Flask + PostgreSQL + pgvector)
cd internal-solutions-socialresearch/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python init_db.py && python -m run
```

### Miro Generator (TypeScript CLI)
```bash
cd internal-solutions-miro-generator
npm install && npm run build

# Testing
npm test                          # Run all tests
npm run test:coverage             # Generate coverage report
npm run test:watch                # Watch mode for development
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Issues**
   - Use `./backup-scripts/fix-websocket-connection.sh` to fix connection issues
   - Check logs with `docker logs -f agent` and `docker logs -f launchpad`
   - For detailed diagnostics, refer to `WEBSOCKET-FIX-DOCUMENTATION.md`

2. **Port Conflicts**
   - Use `python port_scanner.py` to identify conflicts
   - Use `python port_scanner.py --fix` to automatically fix conflicts
   - Use `python port_scanner.py --kill PORT_NUMBER` to kill specific port processes
   - Configure dynamic ports via environment variables in `.env` file

3. **API Key Issues**
   - Check the API key configuration with test scripts
   - Update keys with provided scripts
   - Verify environment variables in the `.env` file

4. **Video Transcription Issues**
   - Check OpenAI API key for Whisper API access with `python test_whisper_api.py`
   - Ensure ffmpeg is installed for audio processing
   - Check logs in `internal-solutions-video-analyzer/logs/` for errors

5. **Browser "Not Secure" Warnings**
   - **Enable HTTPS**: Run `docker compose -f docker-compose-https.yml up -d` to start HTTPS proxy
   - **Access secure URLs**: Use https://localhost:8443-8450 instead of http:// URLs
   - **Accept self-signed certificates**: Click "Advanced" → "Proceed to localhost" in browsers

## 🚨 CRITICAL SUMMARY

### Most Important Things to Know:

1. **NEVER MODIFY** `mcp-services/agent/app.py` without extreme caution (backup exists at `app.py.backup.websocket_fix`)
2. **Windows Environment** - Use proper path handling and Git Bash/PowerShell for commands  
3. **Only Miro Generator has comprehensive testing** - Jest with 30s timeout, coverage reports, and complete path aliases
4. **Social Research Tool is most advanced** - React 19.0.0 + TypeScript 5.7.2 + Vite 6.1.0 + Redux Toolkit 2.6.0
5. **New Consistent Character Generator** - Gemini-powered character generation service (port 5010)
6. **Docker Desktop must be running** before any launch commands
7. **Port conflicts are common** - always run `python port_scanner.py --fix` first

### Emergency Commands:
```bash
# System health check
python test-anthropic-api.py && python test_openai_api.py
curl http://localhost:8500/health

# Fix common issues  
python port_scanner.py --fix
docker compose -f docker-compose-all.yml restart agent

# Complete system reset
docker compose -f docker-compose-all.yml down && ./launch.sh
```

**Remember**: This is a Windows environment with 15+ active services. Always check service status before making changes, and use Windows-compatible commands.