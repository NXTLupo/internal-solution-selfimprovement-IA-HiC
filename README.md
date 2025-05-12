# NXT HUMANS AI CX WORKBENCH

The NXT Humans AI CX Workbench is an integrated platform for customer experience analysis, combining social media data collection, advanced analytics, and AI-powered journey mapping with a multimodal chatbot assistant.

## Overview

The NXT Humans AI CX Workbench consists of four main components:

1. **Reddit Data Collector**: Gather Reddit data from specific subreddits with flexible time filtering and PDF export capabilities.
2. **Social Research Analysis Tool**: Advanced analytics for social media data, including topic modeling, sentiment analysis, and visualization.
3. **AI Journey Mapper**: Customer journey mapping using Claude 3.7 Sonnet, transforming customer data into visual journey maps.
4. **AI Agent Assistant**: Multimodal chatbot agent that integrates all tools through a unified interface.

## Key Features

- **Unified Platform**: Access all tools through a centralized launchpad
- **Containerized Deployment**: Easy deployment using Docker Compose
- **AI-Powered Analysis**: Leverage Claude 3.7 Sonnet for advanced data interpretation
- **Interactive Visualizations**: Dynamic customer journey maps and social data insights
- **Multi-format Data Processing**: Support for various data formats (PDF, CSV, TXT)
- **Tool Integration**: AI agent with tool-use capabilities for seamless workflow

## Quick Start

### Prerequisites

- Docker Desktop
- Anthropic API Key (Claude 3.7 Sonnet)

### Starting the Workbench

```bash
# Clone the repository
git clone https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git
cd NXT-HUMANS_AI_CX_WORKBENCH

# Start the workbench without AI agent
./check-and-run.sh

# Start the workbench with AI agent enabled
./launch-with-agent.sh your_api_key_here

# Stop all services
./stop-workbench.sh
```

### Accessing the Applications

- **Launchpad**: http://localhost:8000
- **Journey Mapper**: http://localhost:8080
- **Reddit Data Collector**: http://localhost:5001
- **Social Research Tool**: http://localhost:3000
- **AI Agent**: Accessible through the Launchpad interface

## Architecture

### 1. Reddit Data Collector

- **Technology**: Python with Flask, PRAW
- **Features**: Subreddit scraping, time filtering, PDF generation
- **Key Files**: 
  - `internal-solutions-reddit-ripper/app.py`
  - `internal-solutions-reddit-ripper/templates/`

### 2. Social Research Analysis Tool

- **Frontend**: React with TypeScript, Redux Toolkit, Tailwind CSS
- **Backend**: Flask API, SQLAlchemy ORM, pgvector
- **Features**: Topic modeling, sentiment analysis, RAG implementation
- **Key Directories**:
  - `internal-solutions-socialresearch/frontend/`
  - `internal-solutions-socialresearch/backend/`

### 3. AI Journey Mapper

- **Technology**: Python with FastAPI, Claude 3.7 integration
- **Features**: Multi-format data processing, two-stage AI analysis
- **Key Files**:
  - `internal-solutions-journeymapper/src/app.py`
  - `internal-solutions-journeymapper/src/ai_analysis/dynamic_journey_mapper.py`

### 4. AI Agent Assistant

- **Technology**: Python, WebSockets, Claude 3.7 integration
- **Features**: Tool-use capabilities, real-time communication
- **Key Files**:
  - `mcp-services/agent/app.py`
  - `mcp-services/reddit-mcp/app.py`, `mcp-services/social-mcp/app.py`, `mcp-services/journey-mcp/app.py`

## Docker Compose Configuration

The platform uses two Docker Compose configurations:

1. `dynamic-compose.yml`: Base configuration for all services without the AI agent
2. `docker-compose-agent.yml`: Extended configuration including the AI agent and MCP services

### Service Connectivity

- All services communicate through a Docker network named `nxt-humans-network`
- Internal services use container names for communication
- External access uses port mapping to localhost

## Environment Variables

Set these environment variables or add them to a `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here  # Required for Claude 3.7 integration
LAUNCHPAD_PORT=8000                  # Optional, default: 8000
JOURNEY_MAPPER_PORT=8080             # Optional, default: 8080
REDDIT_RIPPER_PORT=5001              # Optional, default: 5001
SOCIAL_RESEARCH_PORT=3000            # Optional, default: 3000
SOCIAL_RESEARCH_BACKEND_PORT=8081    # Optional, default: 8081
AGENT_ORCHESTRATOR_PORT=8500         # Optional, default: 8500
REDDIT_MCP_PORT=8501                 # Optional, default: 8501
SOCIAL_MCP_PORT=8502                 # Optional, default: 8502
JOURNEY_MCP_PORT=8503                # Optional, default: 8503
ENABLE_CX_AGENT=true                 # Enable AI agent integration
```

## Data Workflows

### Complete Workflow

1. **Data Collection**: Use Reddit Ripper to collect data from subreddits
2. **Data Analysis**: Process collected PDFs through Social Research Tool
3. **Journey Mapping**: Upload PDFs to Journey Mapper for visualization

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Use `lsof -ti:PORT_NUMBER | xargs kill -9` to free up ports
   - Edit the `.env` file to use different ports

2. **API Key Issues**
   - Ensure your Anthropic API key is correctly set
   - Use `./update_anthropic_key.sh` to update the key

3. **Docker Issues**
   - Ensure Docker is running with sufficient resources
   - Check container logs: `docker compose logs [service-name]`

4. **WebSocket Connection Issues**
   - Check launchpad/app.py for WebSocket proxy configuration
   - Verify agent service is running: `docker compose ps agent`

## Advanced Configuration

For advanced configuration and development, refer to:

- `CLAUDE.md`: Detailed development guidelines
- `mcp-agent-architecture.md`: AI agent architecture details
- `TOOL-INTEGRATION-GUIDE.md`: Tool integration documentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

- Anthropic for Claude 3.7 Sonnet API
- Reddit API for data collection capabilities