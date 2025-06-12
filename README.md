# NXT HUMANS AI CX WORKBENCH

A comprehensive microservices platform for customer experience research and analysis, featuring eight integrated AI-powered applications with unified agent orchestration and professional tooling.

## Overview

The NXT Humans AI CX Workbench is a complete ecosystem for customer experience analysis, combining data collection, advanced analytics, AI-powered journey mapping, content generation, and professional visualization tools:

### Core Applications (8 Components)

1. **Reddit Data Collector**: Automated Reddit data gathering with flexible filtering and PDF export
2. **Social Research Analysis Tool**: Advanced analytics with PostgreSQL+pgvector, topic modeling, and sentiment analysis  
3. **AI Journey Mapper (Claude 3.7)**: Customer journey mapping using Claude 3.7 Sonnet with Mermaid visualization
4. **AI Journey Mapper (Claude 4)**: Advanced journey mapping with Claude 4 Sonnet for enhanced reasoning
5. **AI Journey Mapper (OpenAI o3)**: Reasoning-based journey mapping using OpenAI's o3 model with configurable effort levels
6. **Video Transcriptor**: Video/audio transcription and analysis via OpenAI Whisper API with YouTube support
7. **LinkedIn Post Generator**: Professional content creation using Extended Thinking AI pipeline with drag-and-drop interface
8. **AI Agent Assistant**: Multimodal chatbot with MCP (Model Context Protocol) tool integration for unified control

### Professional Tools

9. **Miro Generator**: TypeScript CLI tool for creating Miro boards from journey map data with comprehensive Jest testing

## Key Features

### Platform Capabilities
- **Unified AI Agent Interface**: Control all tools through conversational AI with MCP protocol integration
- **Multi-AI Model Support**: Claude 3.7, Claude 4, OpenAI o3 with configurable reasoning effort
- **Professional Content Generation**: Extended Thinking pipeline for LinkedIn content creation
- **Advanced Video Processing**: YouTube URL and file upload transcription with chunking for large files
- **Vector Database Analytics**: PostgreSQL+pgvector for semantic search and similarity analysis

### Technical Excellence  
- **Microservices Architecture**: Docker containerization with sophisticated port conflict resolution
- **Modern Frontend Stack**: React 19 + TypeScript 5.7 + Vite 6.1 for cutting-edge development
- **Comprehensive Testing**: Jest framework with TypeScript support and 30+ validation scripts
- **Professional CLI Tools**: TypeScript-based Miro integration with full test coverage
- **Multi-format Processing**: Support for PDF, CSV, TXT, video, audio, and web content

### Development & Deployment
- **One-Command Launch**: Unified launcher with automatic port conflict detection and resolution
- **Environment Flexibility**: Dynamic port allocation and API key management
- **Cross-Platform Support**: Docker Desktop with Apple Silicon optimization
- **Monitoring & Debugging**: Health checks, logging, and comprehensive troubleshooting tools

## Quick Start

### Prerequisites

- **Docker Desktop** with 8GB+ RAM recommended for optimal performance
- **API Keys** (create `.env` file in project root):
  ```env
  ANTHROPIC_API_KEY=your_anthropic_key_here  # For Claude 3.7 and Claude 4
  OPENAI_API_KEY=your_openai_key_here        # For Whisper API and o3 models
  ```
- **Optional**: PostgreSQL 16+ with pgvector extension for Social Research Tool local development

### One-Command Deployment

```bash
# Clone the repository
git clone https://github.com/NXT-Humans/NXT-HUMANS_AI_CX_WORKBENCH.git
cd NXT-HUMANS_AI_CX_WORKBENCH

# Create environment file with your API keys
cp .env.example .env
# Edit .env with your actual API keys

# Launch entire platform (recommended - automatic port conflict resolution)
./launch.sh

# Alternative: Check for conflicts first, then launch
python port_scanner.py                    # Check for port conflicts
python port_scanner.py --fix             # Auto-resolve conflicts
./launch.sh

# Stop all services
docker compose -f docker-compose-all.yml down
```

### Service Access Points

| Application | URL | Purpose |
|-------------|-----|---------|
| **Launchpad** (Main Hub) | http://localhost:8000 | Central access point with AI Agent |
| **Journey Mapper (Claude 3.7)** | http://localhost:8080 | Customer journey visualization |
| **Journey Mapper (Claude 4)** | http://localhost:8095 | Advanced reasoning journey maps |
| **Journey Mapper (OpenAI o3)** | http://localhost:8090 | o3 reasoning-based mapping |
| **Reddit Data Collector** | http://localhost:5001 | Social media data collection |
| **Social Research Tool** | http://localhost:3000 | Advanced analytics dashboard |
| **Video Transcriptor** | http://localhost:5002 | Video/audio transcription |
| **LinkedIn Post Generator** | http://localhost:5003 | Professional content creation |

### AI Agent Integration

Access the unified AI agent through the Launchpad interface to:
- Control all tools via natural language
- Upload files for processing across multiple services
- Generate comprehensive reports combining multiple data sources
- Create professional content from analysis results

## Architecture

### Microservices Platform Overview

The platform uses a sophisticated microservices architecture with Docker containerization, MCP (Model Context Protocol) integration, and unified AI agent orchestration.

### Core Application Components

#### 1. Reddit Data Collector
- **Technology**: Python Flask + PRAW API integration
- **Features**: Automated subreddit scraping, time filtering, PDF export
- **Port**: 5001
- **Key Files**: `internal-solutions-reddit-ripper/app.py`

#### 2. Social Research Analysis Tool  
- **Frontend**: React 19 + TypeScript 5.7 + Vite 6.1 + Tailwind CSS 4.0
- **Backend**: Flask + PostgreSQL 16 + pgvector extension
- **Features**: Topic modeling (BERTopic), sentiment analysis, vector search
- **Ports**: 3000 (frontend), 8081 (backend)
- **Architecture**: Modern Vite build system with hot module replacement

#### 3. AI Journey Mapper (Claude 3.7)
- **Technology**: FastAPI + Claude 3.7 Sonnet + Mermaid visualization
- **Build System**: Webpack 5.64 + React 17.0.2 (legacy compatibility)
- **Features**: Two-stage AI analysis, interactive journey diagrams
- **Port**: 8080
- **Key Files**: `internal-solutions-journeymapper/src/app.py`

#### 4. AI Journey Mapper (Claude 4)
- **Technology**: FastAPI + Claude 4 Sonnet (advanced reasoning)
- **Features**: Enhanced journey mapping with latest Claude capabilities
- **Port**: 8095
- **MCP Integration**: Port 8506

#### 5. AI Journey Mapper (OpenAI o3)
- **Technology**: FastAPI + OpenAI o3 reasoning model
- **Features**: Configurable reasoning effort (low/medium/high), advanced analysis
- **Port**: 8090
- **MCP Integration**: Port 8505

#### 6. Video Transcriptor
- **Technology**: FastAPI + OpenAI Whisper API + yt-dlp
- **Features**: YouTube URL support, file uploads, automatic chunking for large files
- **Port**: 5002
- **Key Features**: Handles files >25MB with intelligent chunking

#### 7. LinkedIn Post Generator
- **Technology**: FastAPI + Extended Thinking AI Pipeline
- **AI Models**: Claude 3.7 Sonnet (primary) + OpenAI GPT-4o (secondary)
- **Features**: 4-stage analysis pipeline (64K tokens per stage), spaCy + NLTK processing
- **Port**: 5003
- **Frontend**: Custom HTML/CSS/JS with drag-and-drop interface

#### 8. AI Agent Assistant
- **Technology**: Python + WebSockets + Claude API + MCP Protocol
- **Features**: Unified tool control, multi-model support, conversation context
- **Port**: 8500
- **Integration**: Orchestrates all services through MCP wrappers

### Professional Tools

#### 9. Miro Generator (CLI Tool)
- **Technology**: TypeScript 5.3 + Commander.js + Jest 29.7
- **Features**: Professional CLI interface, comprehensive test coverage
- **Testing**: Unit + integration tests with coverage reporting
- **Build**: ES2022 target with full TypeScript compilation

### MCP (Model Context Protocol) Integration

The platform uses MCP services as lightweight wrappers for agent integration:

```
Client → Launchpad (8000) → Agent (8500) → MCP Service (850x) → Tool Service
```

**MCP Service Ports**:
- Reddit MCP: 8501
- Social MCP: 8502  
- Journey MCP (Claude 3.7): 8503
- Video MCP: 8504
- OpenAI Journey MCP: 8505
- Claude 4 Journey MCP: 8506

### Infrastructure Components

#### Unified Launcher System
- **Port Conflict Resolution**: Automatic detection and resolution via `port_scanner.py`
- **Environment Management**: Dynamic API key injection and configuration
- **Health Monitoring**: Service health checks and status reporting
- **Docker Orchestration**: Multi-compose file management for different deployment scenarios

#### Database Systems
- **PostgreSQL 16+ with pgvector**: Vector embeddings for Social Research Tool
- **File Storage**: Persistent volumes for uploads, transcripts, and generated content
- **Session Management**: Conversation context and multi-session support
## Complete Workflow Examples

### Customer Experience Analysis Workflow

1. **Data Collection**: Use Reddit Data Collector to gather customer feedback from relevant subreddits
2. **Advanced Analytics**: Process collected data through Social Research Tool for topic modeling and sentiment analysis  
3. **Journey Visualization**: Upload processed data to AI Journey Mapper (choose Claude 3.7, Claude 4, or OpenAI o3 based on complexity needs)
4. **Video Integration**: Add customer interview videos via Video Transcriptor for deeper insights
5. **Professional Content**: Generate LinkedIn posts via LinkedIn Post Generator to share insights
6. **Board Creation**: Export journey maps to Miro boards using the CLI tool for stakeholder presentations

### AI Model Selection Guide

- **Claude 3.7**: Standard journey mapping, balanced speed and quality
- **Claude 4**: Complex analysis requiring advanced reasoning capabilities  
- **OpenAI o3**: Maximum reasoning effort for intricate customer journey scenarios (configurable effort levels)

### Testing and Development

#### Comprehensive Test Suite
```bash
# TypeScript Testing (Miro Generator - full Jest framework)
cd internal-solutions-miro-generator
npm test                    # Run all tests
npm run test:coverage       # Generate coverage reports
npm run test:watch          # Development watch mode

# Python Validation (30+ specialized test scripts)
python test_agent_tools_comprehensive.py    # Complete agent testing
python test_anthropic_api.py               # Claude API validation  
python test_openai_api.py                  # OpenAI API validation
python test_video_complete.py              # Video processing pipeline
python test_websocket_server.py            # WebSocket functionality
```

## Docker Deployment Architecture

### Multi-Configuration Support

The platform supports multiple deployment scenarios through different Docker Compose configurations:

- **`docker-compose-all.yml`**: Complete stack with all 8 applications + MCP services
- **`dynamic-compose.yml`**: Development configuration with environment-based port allocation
- **`docker-compose-claude4.yml`**: Claude 4 specific services
- **`nxt-compose.yml`**: Alternative configuration with enhanced networking
- **`docker-compose-all.override.yml`**: Generated by launcher with API key injection

### Service Connectivity

- **Network**: All services communicate through `nxt-humans-network` Docker bridge
- **Internal Communication**: Services use container names (e.g., `http://journey-mapper:8000`)
- **External Access**: Port mapping to localhost for client access
- **Volume Management**: Persistent storage for databases, uploads, and generated content

### Port Conflict Resolution

The platform includes sophisticated port management:

```bash
python port_scanner.py              # Identify conflicts
python port_scanner.py --fix        # Auto-resolve conflicts  
python port_scanner.py --kill 8080  # Force kill specific port
```

## Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# Required API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here    # For Claude 3.7 and Claude 4 integration
OPENAI_API_KEY=your_openai_key_here          # For Whisper API and o3 models

# Core Application Ports (optional - defaults provided)
LAUNCHPAD_PORT=8000                          # Central hub and WebSocket proxy
JOURNEY_MAPPER_PORT=8080                     # Claude 3.7 journey mapper
CLAUDE4_JOURNEY_MAPPER_PORT=8095             # Claude 4 journey mapper  
OPENAI_JOURNEY_MAPPER_PORT=8090              # OpenAI o3 journey mapper
REDDIT_RIPPER_PORT=5001                      # Reddit data collector
SOCIAL_RESEARCH_PORT=3000                    # Social research frontend
SOCIAL_RESEARCH_BACKEND_PORT=8081            # Social research backend
VIDEO_ANALYZER_PORT=5002                     # Video transcriptor
LINKEDIN_GENERATOR_PORT=5003                 # LinkedIn post generator

# MCP Service Ports (Model Context Protocol integration)
AGENT_PORT=8500                              # AI agent orchestrator
REDDIT_MCP_PORT=8501                         # Reddit MCP wrapper
SOCIAL_MCP_PORT=8502                         # Social MCP wrapper
JOURNEY_MCP_PORT=8503                        # Journey MCP wrapper (Claude 3.7)
VIDEO_MCP_PORT=8504                          # Video MCP wrapper
OPENAI_JOURNEY_MCP_PORT=8505                 # OpenAI o3 MCP wrapper
CLAUDE4_MCP_PORT=8506                        # Claude 4 MCP wrapper

# AI Model Configuration
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219  # Claude model version
CLAUDE4_MODEL=claude-sonnet-4-20250514      # Claude 4 model version
OPENAI_MODEL=o3                              # OpenAI model (o3, gpt-4o, etc.)
REASONING_EFFORT=medium                      # o3 reasoning effort: low, medium, high

# Feature Toggles
ENABLE_CX_AGENT=true                         # Enable AI agent integration
```

## Development and Testing

### Local Development Setup

```bash
# Individual component development
cd internal-solutions-socialresearch/frontend
npm install && npm run dev              # Modern Vite + React 19 development

cd internal-solutions-journeymapper  
npm install && npm run dev-server       # Legacy Webpack + React 17 development

cd internal-solutions-miro-generator
npm install && npm test                 # TypeScript CLI tool with Jest testing

# Python service development
cd internal-solutions-linkedin-generator
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app:app --reload      # FastAPI with hot reload
```

### Database Setup (Social Research Tool)

```bash
# PostgreSQL with pgvector extension
brew install postgresql@16 pgvector
brew services start postgresql@16
psql postgres -c "CREATE DATABASE social_research_db;"
psql postgres -c "CREATE USER social_research_user WITH PASSWORD 'your_password';"
psql social_research_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Initialize database schema
cd internal-solutions-socialresearch/backend
python init_db.py
```

## Troubleshooting

### Common Issues & Solutions

#### 1. Port Conflicts (Automatic Resolution Available)
```bash
python port_scanner.py --fix            # Auto-resolve all conflicts
python port_scanner.py --kill 8080      # Kill specific port process
lsof -ti:PORT_NUMBER | xargs kill -9     # Manual port cleanup
```

#### 2. API Key Configuration
```bash
# Update API keys
./backup-scripts/update_anthropic_key_enhanced.sh YOUR_KEY
./update_openai_key.sh YOUR_KEY

# Validate API keys
python test_anthropic_api.py             # Test Claude API access
python test_openai_api.py                # Test OpenAI API access
python test_whisper_api.py               # Test Whisper API access
```

#### 3. Docker and Service Issues
```bash
# Service health monitoring
docker compose -f docker-compose-all.yml ps
docker compose -f docker-compose-all.yml logs -f [service-name]

# Health checks
curl http://localhost:8000/health        # Launchpad
curl http://localhost:8080/health        # Journey Mapper

# Full system reset
docker compose -f docker-compose-all.yml down
docker system prune -f
./launch.sh
```

#### 4. WebSocket Connection Issues
```bash
# Check agent health
curl http://localhost:8500/health
docker compose logs agent | tail -20

# Apply fixes
./backup-scripts/fix-websocket-connection.sh
# In browser console: load client-fallback.js for connection recovery
```

#### 5. Video Transcription Issues
- Verify OpenAI API key has Whisper access
- Check logs in `internal-solutions-video-analyzer/logs/`
- For large files (>25MB), ensure chunking is working properly
- Validate YouTube URL accessibility

## Advanced Configuration & Documentation

### Comprehensive Documentation
- **`CLAUDE.md`**: Complete development guidelines and architecture
- **`TOOL-INTEGRATION-GUIDE.md`**: MCP tool integration details  
- **`PORT-CONFLICT-MANAGEMENT.md`**: Advanced port management
- **`WEBSOCKET-FIX-DOCUMENTATION.md`**: WebSocket troubleshooting

### Performance Optimization
- **Docker Resources**: Allocate 8GB+ RAM for optimal performance
- **Database Tuning**: Configure PostgreSQL connection pooling for Social Research Tool
- **API Rate Limiting**: Monitor Claude and OpenAI API usage and rate limits

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow the patterns established in `CLAUDE.md` for code quality and architecture
- Use TypeScript for new frontend components and CLI tools
- Include Jest tests for TypeScript components (see Miro Generator example)
- Add validation scripts for new Python services
- Update documentation for any new components or features

## Technology Stack Summary

### Frontend Technologies
- **Modern Stack**: React 19 + TypeScript 5.7 + Vite 6.1 + Tailwind CSS 4.0
- **Legacy Stack**: React 17.0.2 + Webpack 5.64 + Babel 7.16 (Journey Mapper compatibility)
- **CLI Tools**: TypeScript 5.3 + Commander.js + Jest 29.7 (Professional testing)

### Backend Technologies  
- **Web Frameworks**: FastAPI (modern services), Flask (legacy services)
- **AI Integration**: Claude 3.7/4 Sonnet, OpenAI o3/GPT-4o, Whisper API
- **Databases**: PostgreSQL 16+ with pgvector extension for vector embeddings
- **Infrastructure**: Docker containerization with sophisticated networking

### AI & Analytics
- **Journey Mapping**: Claude 3.7/4 Sonnet, OpenAI o3 with configurable reasoning
- **Content Generation**: Extended Thinking pipeline with multi-stage analysis  
- **Video Processing**: OpenAI Whisper with intelligent chunking for large files
- **Social Analytics**: BERTopic for topic modeling, VADER for sentiment analysis

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

- **Anthropic** for Claude 3.7 and Claude 4 Sonnet APIs
- **OpenAI** for GPT models, Whisper API, and o3 reasoning capabilities
- **Reddit** for data collection API access
- **PostgreSQL** and **pgvector** for vector database capabilities
- **Docker** for containerization and microservices orchestration

---

**NXT Humans AI CX Workbench** - A comprehensive platform for customer experience research, analysis, and professional content generation with AI-powered insights and unified agent orchestration.
