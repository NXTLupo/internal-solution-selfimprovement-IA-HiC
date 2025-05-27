# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The NXT Humans AI CX Workbench is an integrated platform with six main applications:

1. **Reddit Data Collector**: Gathers Reddit data from subreddits (internal-solutions-reddit-ripper)
2. **Social Research Analysis Tool**: Advanced analytics for social media data (internal-solutions-socialresearch)
3. **AI Journey Mapper (Claude)**: Customer journey mapping using Claude 3.7 Sonnet (internal-solutions-journeymapper)
4. **AI Journey Mapper (OpenAI o3)**: Customer journey mapping using OpenAI's specialized o3 reasoning model (internal-solutions-openai-journey-mapper)
5. **AI Agent Assistant**: Multimodal chatbot agent to control all tools (mcp-services)
6. **Video Transcriptor**: Processes and analyzes video content with transcription (internal-solutions-video-analyzer)

## Architecture

The workbench uses a microservices architecture with Docker for containerization. Each service runs independently and communicates through a shared Docker network.

### Component Architecture

1. **Launchpad**: Central hub with WebSocket proxy for agent communication
2. **MCP (Model Context Protocol) Services**: Lightweight wrappers around tools for agent integration
   - reddit-mcp: Exposes Reddit Data Collector functionality
   - social-mcp: Exposes Social Research Tool functionality
   - journey-mcp: Exposes Journey Mapper functionality
   - video-mcp: Exposes Video Transcriptor functionality
3. **Agent Service**: Manages conversation context and tool invocation using Claude API

### Key Files and Directories

- `launchpad/app.py`: Central WebSocket proxy and service coordinator
- `mcp-services/`: Contains MCP service implementations
- `internal-solutions-*/`: Individual tool implementations
- `docker-compose.yml`: Main Docker Compose configuration
- `docker-compose-agent.yml`: Configuration with agent integration
- `docker-compose-video-fixed.yml`: Configuration for Video Transcriptor service
- `docker-compose-all.yml`: Full configuration with all services
- `dynamic-compose.yml`: Configuration with dynamic port allocation

## Common Commands

### Starting the Workbench

```bash
# Start the entire workbench with all services (using the new unified launcher)
./launch.sh

# Start with specific services (legacy scripts)
./backup-scripts/run-local-journey-mapper.sh  # Journey Mapper only
./backup-scripts/run-local-reddit-ripper.sh   # Reddit Ripper only
./backup-scripts/run-local-video-analyzer.sh  # Video Transcriptor only
./backup-scripts/run-local-launchpad.sh       # Launchpad only

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

# Start just the video transcriptor services
docker compose -f docker-compose-video-fixed.yml up -d
```

### API Key Setup

```bash
# Update Anthropic API key for Claude integration
./backup-scripts/update_anthropic_key_enhanced.sh YOUR_API_KEY

# Update OpenAI API key for Whisper (video transcription)
./backup-scripts/update_whisper_key.sh YOUR_API_KEY

# Test API key configuration
python test_anthropic_api.py
python test_whisper_key.py
```

### Development Commands

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
```

#### Journey Mapper Development

```bash
# Run Journey Mapper standalone
cd internal-solutions-journeymapper
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_api_key_here
python run.py

# Using enhanced Docker build for Apple Silicon
cd internal-solutions-journeymapper
docker build -f Dockerfile.enhanced -t journey-mapper .
docker run -p 8080:8000 -e ANTHROPIC_API_KEY=your_key_here journey-mapper
```

#### Social Research Tool Development

```bash
# Frontend development
cd internal-solutions-socialresearch/frontend
npm install
npm run dev

# Backend development
cd internal-solutions-socialresearch/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python init_db.py   # Initialize the database
python -m run
```

#### Agent Development

```bash
# Directly edit the agent code
cd mcp-services/agent

# Apply anti-hallucination patch
python anti_hallucination.py

# Fix WebSocket connection issues
./backup-scripts/fix-websocket-connection.sh

# Test the agent's WebSocket connection
python test_ws_fixed.py

# Test tool execution
python test_tool_execution.py
```

#### Testing WebSocket Connections

```bash
# Test WebSocket connections
python test_ws_fixed.py    # Test direct WebSocket connection
python test_client_ws.py   # Test client WebSocket connection
python test_tool_execution.py  # Test agent tool execution
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
   - Manually kill processes on specific ports with `lsof -ti:PORT_NUMBER | xargs kill -9`

3. **API Key Issues**
   - Check the API key configuration with test scripts
   - Update keys with provided scripts
   - Verify environment variables in the `.env` file

4. **Video Transcription Issues**
   - Check OpenAI API key for Whisper API access
   - Ensure ffmpeg is installed for audio processing
   - Check logs in `internal-solutions-video-analyzer/logs/` for errors

5. **Parameter Naming Inconsistency**
   - The agent and MCP services have parameter naming inconsistencies
   - Fixed with bidirectional parameter conversion in service apps
   - Use `./backup-scripts/fix-reddit-tools.sh` to apply tool naming fixes
   - For details, refer to `CX-AGENT-FIXES.md`

## Environment Variables

Key environment variables to set in a `.env` file:

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

# Tool service URLs for client access
REDDIT_RIPPER_CLIENT_URL=http://localhost:5001
JOURNEY_MAPPER_CLIENT_URL=http://localhost:8080
SOCIAL_RESEARCH_CLIENT_URL=http://localhost:3000
VIDEO_ANALYZER_CLIENT_URL=http://localhost:5002
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

3. **Journey Mapper Tools**
   - `journey.upload_file`: Upload a file for mapping
   - `journey.generate_map`: Generate a journey map
   - `journey.get_results`: Get journey map results

4. **Video Transcriptor Tools**
   - `video.transcribe`: Transcribe a video from URL or file
   - `video.get_status`: Check transcription status
   - `video.get_results`: Get transcription results

For detailed information about tool integration, refer to `TOOL-INTEGRATION-GUIDE.md`.

## Memories

### OpenAI Journey Mapper Completion Token Conditions

The OpenAI Journey Mapper should now be able to successfully process journey maps using any of the available models, including all o1-series models (o1, o1-mini, o1-preview, o1-pro), without encountering the "'ResponseUsage' object has no attribute 'completion_tokens'" error.

If the error happens again, potential hypotheses include:

1. Missed code location: Another codebase location where completion_tokens is being accessed directly
2. Asynchronous API response handling: Potential different code paths handling API responses
3. Response structure changes: OpenAI API response structure updates for o-series models
4. Docker container issue: Improper code deployment due to volume mounting or container rebuild
5. Dynamic code loading: Dynamically loaded code not visible in initial search
6. Error in exception handling: Bug in error handling preventing proper attribute management
7. Different API calls: API calls through alternative methods or libraries bypassing the fixed wrapper

Diagnostic recommendation: Check the full stack trace to pinpoint the exact error location and validate which hypothesis is correct.

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