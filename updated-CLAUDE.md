# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The NXT Humans AI CX Workbench is an integrated platform with four main applications:

1. **Reddit Data Collector**: Gathers Reddit data from subreddits (internal-solutions-reddit-ripper)
2. **Social Research Analysis Tool**: Advanced analytics for social media data (internal-solutions-socialresearch)
3. **AI Journey Mapper**: Customer journey mapping using Claude 3.7 Sonnet (internal-solutions-journeymapper)
4. **AI Agent Assistant**: Multimodal chatbot agent to control all tools (mcp-services)

## Quick Start Commands

```bash
# Start the entire workbench with all services (without AI agent)
./backup-scripts/check-and-run.sh

# Start the workbench with AI agent enabled
./backup-scripts/launch-with-agent.sh your_api_key_here

# Start only specific services
./backup-scripts/run-local-journey-mapper.sh  # Journey Mapper only
./backup-scripts/run-local-reddit-ripper.sh   # Reddit Ripper only
./backup-scripts/run-local-video-analyzer.sh  # Video Analyzer only
./backup-scripts/run-local-launchpad.sh       # Launchpad only

# Stop all services
./backup-scripts/stop-workbench.sh

# View status of running containers
docker compose -f dynamic-compose.yml ps

# View logs for a specific service
docker compose -f dynamic-compose.yml logs [service-name]
docker compose -f dynamic-compose.yml logs -f [service-name]  # Follow logs

# Check WebSocket connections
python test_ws_fixed.py    # Test direct WebSocket connection
python test_client_ws.py   # Test client WebSocket connection
python test_tool_execution.py  # Test agent tool execution

# Manage API keys
./backup-scripts/update_anthropic_key_enhanced.sh  # Update Anthropic API key
python test_anthropic_api.py  # Test Anthropic API key
./backup-scripts/update_whisper_key.sh  # Update Whisper API key

# Fix common issues
./backup-scripts/fix-websocket-connection.sh  # Fix WebSocket issues
python mcp-services/agent/anti_hallucination.py  # Apply anti-hallucination patch
./backup-scripts/fix-pdf-urls.sh  # Fix PDF URL generation
./backup-scripts/fix-reddit-tools.sh  # Fix Reddit tool naming
./backup-scripts/restart-agent.sh  # Restart agent to apply system prompt changes
python port_scanner.py  # Scan for port conflicts
python port_scanner.py --fix  # Automatically fix port conflicts
```

## Starting the Workbench

### Option 1: Docker-based Deployment (Recommended)

```bash
# Start the entire workbench with all services
./backup-scripts/check-and-run.sh

# Alternatively, use docker-compose directly
docker compose -f dynamic-compose.yml up -d

# Stop all services
./backup-scripts/stop-workbench.sh
# or
docker compose -f dynamic-compose.yml down
```

### Option 2: Running Services Individually

```bash
# Start Launchpad
cd launchpad
python app.py

# Start Journey Mapper
cd internal-solutions-journeymapper
python run.py

# Start Reddit Ripper
cd internal-solutions-reddit-ripper
python app.py

# Start Social Research Tool (Frontend)
cd internal-solutions-socialresearch/frontend
npm install
npm run dev

# Start Social Research Tool (Backend)
cd internal-solutions-socialresearch/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python init_db.py   # Initialize the database first
python -m run

# Start Video Analyzer
cd internal-solutions-video-analyzer
python run.py
```

## Environment Setup

### macOS Setup

1. **Install Docker Desktop for Mac** if not already installed
2. **Install Node.js 20+**: `brew install node@20`
3. **Install PostgreSQL with pgvector** (for Social Research Tool):
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   brew install pgvector
   brew services restart postgresql@16
   ```
4. **Create the database**:
   ```bash
   psql postgres
   CREATE DATABASE social_research_db;
   CREATE USER social_research_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE social_research_db TO social_research_user;
   \q

   # Enable pgvector extension
   psql social_research_db
   CREATE EXTENSION IF NOT EXISTS vector;
   \q
   ```

### Linux Setup

1. **Install Docker and Docker Compose**
2. **Install build-essential**: `sudo apt-get install -y build-essential`
3. **Install Node.js 20+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

## Environment Variables

Create a `.env` file in the root directory with these variables:

```
ANTHROPIC_API_KEY=your_api_key_here  # Required for Claude 3.7 integration
OPENAI_API_KEY=your_api_key_here     # Required for Whisper API (video transcription)

# Port configuration
LAUNCHPAD_PORT=8000                  # Optional, default: 8000
JOURNEY_MAPPER_PORT=8080             # Optional, default: 8080
REDDIT_RIPPER_PORT=5001              # Optional, default: 5001
SOCIAL_RESEARCH_PORT=3000            # Optional, default: 3000
SOCIAL_RESEARCH_BACKEND_PORT=8081    # Optional, default: 8081
VIDEO_ANALYZER_PORT=5002             # Optional, default: 5002

# Agent configuration
ENABLE_CX_AGENT=true                 # Enable AI agent integration
AGENT_WS_URL=ws://agent:8500         # WebSocket URL for agent (container)
AGENT_CLIENT_WS_URL=ws://localhost:8500  # WebSocket URL for client
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219  # Claude model to use

# Service URLs for client access
REDDIT_RIPPER_CLIENT_URL=http://localhost:5001  # URL for client access to Reddit Ripper
JOURNEY_MAPPER_CLIENT_URL=http://localhost:8080  # URL for client access to Journey Mapper
SOCIAL_RESEARCH_CLIENT_URL=http://localhost:3000  # URL for client access to Social Research
VIDEO_ANALYZER_CLIENT_URL=http://localhost:5002  # URL for client access to Video Analyzer
```

## Development Guidelines

### Journey Mapper Development

```bash
cd internal-solutions-journeymapper

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install system dependencies (Linux)
sudo apt-get update
sudo apt-get install -y build-essential python3-dev wkhtmltopdf xvfb

# Install dependencies
pip install -r requirements.txt

# Start the application
python run.py

# Set log level for debugging
export LOG_LEVEL=DEBUG  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# Direct API start (development mode)
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```

For Apple Silicon Macs (M1/M2/M3), use the enhanced Dockerfile:

```bash
docker build -f Dockerfile.enhanced -t journey-mapper .
docker run -p 8080:8000 -e ANTHROPIC_API_KEY=your_key_here journey-mapper
```

### Social Research Tool Development

```bash
# Frontend development
cd internal-solutions-socialresearch/frontend
npm install
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type checking
tsc -b

# Backend development
cd internal-solutions-socialresearch/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python init_db.py   # Initialize the database
python -m run

# Database migrations
cd backend
./init_alembic.sh  # First time only
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Reddit Ripper Development

```bash
cd internal-solutions-reddit-ripper
python -m venv venv
source venv/bin/activate
pip install flask praw fpdf
python app.py

# Clean generated PDFs and status files
rm -rf downloads/*

# Run with debug logging
export FLASK_DEBUG=1
python app.py
```

### Video Analyzer Development

```bash
cd internal-solutions-video-analyzer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set OpenAI API key for Whisper transcription
export OPENAI_API_KEY=your_api_key_here

# Run the application
python run.py

# For simplified version (without some dependencies)
python run-simple.py
```

### Agent Development

```bash
# Directly edit the agent code
cd mcp-services/agent

# Apply anti-hallucination patch
python anti_hallucination.py

# Fix WebSocket connection issues
./backup-scripts/fix-websocket-connection.sh

# Test the agent's WebSocket connection
python test_ws_fixed.py

# Fix Claude direct integration
python mcp-services/agent/fix_claude_direct.py

# Debug agent issues
docker logs -f agent

# Fix Reddit tool naming
./backup-scripts/fix-reddit-tools.sh

# Fix PDF URL generation
./backup-scripts/fix-pdf-urls.sh

# Apply system prompt enhancements
./backup-scripts/restart-agent.sh

# Test tool execution
python test_tool_execution.py
```

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

3. For detailed specifications, refer to `brand-style-guide.md`

## Testing

While the codebase doesn't include formal testing frameworks, use these approaches:

### Manual Testing

1. **Component Testing**: Test each application independently
   ```bash
   # Journey Mapper
   cd internal-solutions-journeymapper
   python run.py
   # Open http://localhost:8080 and test file uploads and journey mapping

   # Reddit Ripper
   cd internal-solutions-reddit-ripper
   python app.py
   # Open http://localhost:5001 and test data collection and PDF generation

   # Social Research Tool
   cd internal-solutions-socialresearch/backend
   python -m run
   cd ../frontend
   npm run dev
   # Open http://localhost:3000 and test data analysis and visualization
   ```

2. **Integration Testing**: Test the complete workflow
   ```bash
   # Start all services
   ./backup-scripts/check-and-run.sh
   # Open http://localhost:8000 and test the integrated workflow
   ```

### Agent Testing

```bash
# Test WebSocket connections
python test_ws_fixed.py  # Test direct WebSocket connection
python test_client_ws.py  # Test client WebSocket connection

# Test tool execution
python test_tool_execution.py

# Debug WebSocket traffic with Chrome DevTools
# 1. Open Chrome DevTools (F12)
# 2. Select the Network tab
# 3. Filter for "WS" to show only WebSocket connections
# 4. Monitor messages in real-time

# Test Reddit tool endpoints directly
curl -X POST -H "Content-Type: application/json" \
     -d '{"subreddit":"StableDiffusion","limit":10}' \
     http://localhost:8501/reddit.search

curl -X POST -H "Content-Type: application/json" \
     -d '{"subreddit":"StableDiffusion","limit":10}' \
     http://localhost:8501/reddit.generate_pdf
```

## Common Issues and Solutions

### WebSocket Connection Issues

The WebSocket connection between the frontend and agent can be unstable. If you encounter issues:

1. Check the connection status in browser console
2. Run `./backup-scripts/fix-websocket-connection.sh` to fix WebSocket configuration
3. Verify Docker network settings with `docker network inspect nxthumans_ai_cx_workbench_nxt-humans-network`
4. Check logs with `docker logs -f agent` and `docker logs -f launchpad`
5. Monitor WebSocket traffic with Chrome DevTools (Network tab, WS filter)
6. Apply the client-side fallback by injecting `client-fallback.js` in the browser console

For detailed diagnostics, refer to `WEBSOCKET-FIX-DOCUMENTATION.md`

### Parameter Naming Inconsistency

The agent and MCP services have parameter naming inconsistencies that can cause tool failures:

1. **Journey Mapper**: The agent expects "file_id" but journey-mcp expects "file"
   - Fixed with bidirectional parameter conversion in `mcp-services/journey-mcp/app.py`

2. **Reddit Tool Naming**: Multiple tool name aliases need to be supported
   - Fixed with alias handling in `mcp-services/reddit-mcp/app.py`
   - Use `./backup-scripts/fix-reddit-tools.sh` to apply the fix

For detailed information, refer to `CX-AGENT-FIXES.md`

### PDF URL Generation Issues

PDF URLs may not work properly due to environment configuration:

1. Set `REDDIT_RIPPER_CLIENT_URL=http://localhost:5001` in the `.env` file
2. Run `./backup-scripts/fix-pdf-urls.sh` to fix URL generation
3. Check Reddit MCP logs for parameter issues

### Port Conflicts

If you encounter port conflicts:

1. Run `python port_scanner.py` to identify conflicts
2. Run `python port_scanner.py --fix` to automatically fix conflicts
3. Manually kill processes on specific ports with `lsof -ti:PORT_NUMBER | xargs kill -9`
4. Edit the `.env` file to use different ports

### API Key Issues

1. Set the required API keys in the `.env` file:
   - `ANTHROPIC_API_KEY` for Claude 3.7 Sonnet
   - `OPENAI_API_KEY` for Whisper API (video transcription)

2. Update keys with the provided scripts:
   - `./backup-scripts/update_anthropic_key_enhanced.sh` for Anthropic API key
   - `./backup-scripts/update_whisper_key.sh` for OpenAI/Whisper API key

3. Test API keys:
   - `python test_anthropic_api.py` for Anthropic API
   - `python test_whisper_api.py` for Whisper API

### Compilation and Build Issues

For C extension compilation issues:

1. **Journey Mapper**:
   - Install build dependencies: `sudo apt-get install -y build-essential python3-dev`
   - For Apple Silicon Macs, use the enhanced Dockerfile
   - Check logs in `internal-solutions-journeymapper/logs/` for errors

2. **Social Research Tool**:
   - Use Node.js 20+ for frontend compatibility
   - Check for pgvector extension in PostgreSQL
   - Use Python 3.11 (Python 3.12 is not fully supported)

## Docker Integration

### Container Management

```bash
# View running containers
docker compose ps

# Start specific services
docker compose -f dynamic-compose.yml up -d [service-name]

# Stop specific services
docker compose -f dynamic-compose.yml stop [service-name]

# Restart specific services
docker compose -f dynamic-compose.yml restart [service-name]

# View container logs
docker compose -f dynamic-compose.yml logs -f [service-name]

# Access container shell
docker compose -f dynamic-compose.yml exec [service-name] bash

# Inspect container networks
docker network inspect nxthumans_ai_cx_workbench_nxt-humans-network

# Clean up stopped containers
docker compose -f dynamic-compose.yml down
```

### Docker Compose Files

The platform uses multiple Docker Compose configurations:

1. `docker-compose.yml`: Base configuration
2. `dynamic-compose.yml`: Configuration with dynamic port allocation
3. `docker-compose-agent.yml`: Configuration with AI agent integration
4. `docker-compose-video.yml`: Configuration with video analyzer integration
5. `docker-compose-all.yml`: Full configuration with all services

### Docker Networks

- All services communicate through the `nxt-humans-network` Docker network
- Container names are used for internal communication
- Host port mappings are used for external access

## Agent Architecture

The AI Agent uses a Model Context Protocol (MCP) architecture:

1. **Agent Orchestrator** (`mcp-services/agent/`):
   - Core component that communicates with Claude API
   - Manages tool discovery and invocation
   - Handles WebSocket connections with the frontend

2. **MCP Services**:
   - **Reddit MCP** (`mcp-services/reddit-mcp/`): Exposes Reddit Ripper functionality
   - **Journey MCP** (`mcp-services/journey-mcp/`): Exposes Journey Mapper functionality
   - **Social MCP** (`mcp-services/social-mcp/`): Exposes Social Research functionality
   - **Video MCP** (`mcp-services/video-mcp/`): Exposes Video Analyzer functionality

3. **WebSocket Proxy** (`launchpad/app.py`):
   - Routes WebSocket connections from frontend to agent
   - Handles connection management and error recovery
   - Implements thread synchronization and message forwarding

### Data Flow

1. User sends message through chat interface
2. WebSocket Proxy forwards message to Agent Service
3. Agent Service sends message to Claude API
4. Claude determines if tools need to be used
5. Agent Service invokes appropriate MCP Service
6. Results are returned to Claude for formatting
7. Response is sent back to the user

## Critical Files

- **Agent System Prompt**: `mcp-services/agent/app.py` - Contains the system prompt for Claude
- **WebSocket Proxy**: `launchpad/app.py` - Handles WebSocket connections
- **Tool Implementation**: MCP service app.py files contain tool definitions and implementations
- **Environment Configuration**: `.env` file and Docker Compose files
- **Fix Scripts**: Various scripts in the root directory and backup-scripts/ for common issues