# NXT HUMANS INTELLIGENCE AUGMENTATION

A comprehensive microservices platform for customer experience research and analysis, featuring twelve integrated AI-powered applications with unified agent orchestration, professional tooling, and complete HTTPS security infrastructure.

## Overview

The NXT Humans Intelligence Augmentation platform is a complete ecosystem for customer experience analysis, combining data collection, advanced analytics, AI-powered journey mapping, content generation, and professional visualization tools with enterprise-grade security.

## Docker Guide

For setup, running, HTTPS, data volumes, and troubleshooting using Docker and Docker Compose, see `README-DOCKER.md`.

## 🚀 Latest Updates (January 2025)

### ✨ **New Claude Sonnet 4 Integration**
- **🆕 Claude 4 Journey Mapper**: Complete new service utilizing Claude Sonnet 4's advanced reasoning capabilities
- **🔍 Extended Thinking Mode**: 200K token analysis for comprehensive data examination and pattern recognition
- **📊 Enhanced Journey Analysis**: Multi-stage systematic investigation with evidence-based insights
- **🎯 Investigative Approach**: Deep data mining and sophisticated insight extraction

### 📝 **Enhanced LinkedIn Post Generator**
- **⚡ Claude 4 Integration**: Upgraded from Claude 3.5 to Claude Sonnet 4 for superior content quality
- **🔍 Investigative Journalism Style**: Transform generic content into compelling, evidence-based narratives
- **📚 Proper Source Attribution**: Enhanced research citation and author credit (fixing false first-person attribution)
- **🚀 Comprehensive Analysis**: Extended thinking mode for thorough examination of uploaded files
- **💡 Quality Revolution**: Eliminated "cliché and not interesting" content with substantive insights

### 🔧 **Technical Improvements**
- **🐳 Docker Integration**: Full Claude 4 service containerization with MCP protocol support
- **🌐 Launchpad Integration**: Seamless replacement of OpenAI Journey Mapper with Claude 4 version
- **🔗 MCP Service Architecture**: New Claude 4 MCP wrapper for agent integration (port 8506)
- **⚙️ Configuration Management**: Updated Docker Compose with proper service dependencies
- **🎨 UI/UX Enhancements**: Updated dashboard with Claude 4 service cards and branding

### Core Applications (12 Components)

1. **Reddit Data Collector** (Port 5001): Automated Reddit data gathering with flexible filtering and PDF export
2. **Social Research Analysis Tool** (Ports 3000/8081): Advanced analytics with PostgreSQL+pgvector, topic modeling, and sentiment analysis using React 19 + TypeScript 5.7 + Vite 6.1
3. **AI Journey Mapper (Claude 3.7)** (Port 8080): Customer journey mapping using Claude 3.7 Sonnet with Mermaid visualization
4. **🆕 AI Journey Mapper (Claude 4)** (Port 8095): **NEW** Advanced journey mapping with Claude Sonnet 4's enhanced reasoning capabilities, extended thinking mode, and 200K token analysis for comprehensive insights
5. **AI Journey Mapper (OpenAI o3)** (Port 8090): Reasoning-enhanced customer journey mapping using OpenAI's o3 model with configurable effort levels
6. **Video Transcriptor** (Port 5002): Video/audio transcription and analysis via OpenAI Whisper API with YouTube support and enhanced processing pipeline
7. **LinkedIn Post Generator** (Port 5003): Professional content creation using **Enhanced Extended Thinking AI pipeline** with investigative journalism approach and Claude Sonnet 4 integration
8. **Miro Generator** (Port 5004): TypeScript CLI tool for creating Miro boards from journey map data with comprehensive Jest testing
9. **A11y Image Caption Generator** (Port 5005): WCAG-compliant accessibility image captioning using Claude 3.7 Sonnet for screen readers and inclusive design
10. **Flux LoRA Studio** (Port 5006): AI image generation and training studio using Flux models with LoRA fine-tuning capabilities
11. **Presentation Generator** (Port 5007): AI-powered presentation creation with Claude integration for professional slide generation
12. **Mulmocast Wizard** (Port 5008): Multi-modal content casting and distribution platform with advanced media processing
13. **AI Agent Assistant** (Port 8500): Multimodal chatbot with MCP (Model Context Protocol) tool integration for unified control

## Key Features

### Intelligence Augmentation Capabilities
- **🆕 Enhanced AI Model Suite**: Claude 3.7, **Claude Sonnet 4** (latest), with advanced reasoning and extended thinking capabilities
- **Unified AI Agent Interface**: Control all tools through conversational AI with MCP protocol integration
- **🚀 Advanced Journey Mapping**: Claude 4's 200K token analysis for exhaustive data examination and comprehensive insights
- **📝 Enhanced Content Generation**: **Investigative journalism-style** LinkedIn content using Claude Sonnet 4 with proper source attribution
- **Advanced Video Processing**: YouTube URL and file upload transcription with enhanced chunking for large files
- **Accessibility AI**: WCAG-compliant alt text generation for screen readers and inclusive design
- **Vector Database Analytics**: PostgreSQL+pgvector for semantic search and similarity analysis

### Enterprise Security & Professional Experience
- **Complete HTTPS Infrastructure**: SSL certificates with nginx proxy for secure connections
- **Professional Visual Identity**: Service-specific favicons and consistent branding across all applications
- **Large File Support**: 500MB upload limits with extended timeouts for AI processing operations
- **Browser Security Compliance**: Eliminates "Not Secure" warnings with trusted certificate management

### Technical Excellence  
- **Microservices Architecture**: Docker containerization with sophisticated port conflict resolution
- **Modern Frontend Stack**: React 19 + TypeScript 5.7 + Vite 6.1 for cutting-edge development
- **Comprehensive Testing**: Jest framework with TypeScript support and 30+ validation scripts
- **Professional CLI Tools**: TypeScript-based Miro integration with full test coverage
- **Multi-format Processing**: Support for PDF, CSV, TXT, video, audio, and web content

### Development & Deployment
- **One-Command Launch**: Unified launcher with automatic HTTPS setup and port conflict detection
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

| Application | HTTP URL | HTTPS URL (Secure) | Purpose |
|-------------|----------|-------------------|---------|
| **Launchpad** (Main Hub) | http://localhost:8000 | https://localhost:8443 | Central access point with AI Agent |
| **Journey Mapper (Claude 3.7)** | http://localhost:8080 | https://localhost:8444 | Customer journey visualization |
| **🆕 Journey Mapper (Claude 4)** | http://localhost:8095 | *Direct HTTP only* | **NEW** Advanced reasoning with 200K token analysis |
| **Journey Mapper (OpenAI o3)** | http://localhost:8090 | https://localhost:8445 | o3 reasoning-based mapping |
| **Reddit Data Collector** | http://localhost:5001 | https://localhost:8446 | Social media data collection |
| **Social Research Tool** | http://localhost:3000 | https://localhost:8447 | Advanced analytics dashboard |
| **Video Transcriptor** | http://localhost:5002 | https://localhost:8448 | Video/audio transcription |
| **LinkedIn Post Generator** | http://localhost:5003 | https://localhost:8449 | Professional content creation |
| **Miro Generator** | http://localhost:5004 | https://localhost:8450 | Board creation interface |
| **A11y Image Caption Generator** | http://localhost:5005 | *Direct HTTP only* | Accessibility AI for screen readers |
| **Flux LoRA Studio** | http://localhost:5006 | *Direct HTTP only* | AI image generation and training |
| **Presentation Generator** | http://localhost:5007 | *Direct HTTP only* | AI-powered presentation creation |
| **Mulmocast Wizard** | http://localhost:5008 | *Direct HTTP only* | Multi-modal content casting |

**🔒 HTTPS Benefits**: Secure connections eliminate browser "Not Secure" warnings and provide professional experience with green lock icons.

### AI Agent Integration

Access the unified AI agent through the Launchpad interface to:
- Control all tools via natural language
- Upload files for processing across multiple services
- Generate comprehensive reports combining multiple data sources
- Create professional content from analysis results

## Architecture

### Intelligence Augmentation Platform Overview

The Intelligence Augmentation platform uses a sophisticated microservices architecture with Docker containerization, complete HTTPS security infrastructure, MCP (Model Context Protocol) integration, and unified AI agent orchestration.

### Core Application Components

#### 1. Reddit Data Collector
- **Technology**: Python Flask + PRAW API integration
- **Features**: Automated subreddit scraping, time filtering, PDF export
- **Port**: 5001
- **Key Files**: `internal-solutions-reddit-ripper/app.py`

#### 2. Social Research Analysis Tool  
- **Frontend**: React 19 + TypeScript 5.7 + Vite 6.1 + Tailwind CSS 4.0 + Material-UI 6.4+
- **Backend**: Flask + PostgreSQL 16 + pgvector extension for vector embeddings
- **Features**: Topic modeling (BERTopic), sentiment analysis, vector search, Redux Toolkit 2.6+ state management
- **Ports**: 3000 (frontend), 8081 (backend)
- **Architecture**: Modern Vite build system with ESM modules, HMR, and strict TypeScript compilation
- **Database**: PostgreSQL 16+ with pgvector extension for semantic search and similarity analysis

#### 3. AI Journey Mapper (Claude 3.7)
- **Technology**: FastAPI + Claude 3.7 Sonnet + Mermaid visualization
- **Build System**: Webpack 5.64 + React 17.0.2 (legacy compatibility)
- **Features**: Two-stage AI analysis, interactive journey diagrams
- **Port**: 8080
- **Key Files**: `internal-solutions-journeymapper/src/app.py`

#### 4. 🆕 AI Journey Mapper (Claude 4) - **NEWLY ENHANCED**
- **Technology**: FastAPI + Claude Sonnet 4 (`claude-sonnet-4-20250514`) with extended thinking mode
- **Advanced Features**: 
  - **200K Token Analysis**: Comprehensive data examination using maximum output capacity
  - **Extended Thinking Mode**: Multi-stage analysis with systematic data investigation
  - **Enhanced Reasoning**: Claude 4's advanced reasoning capabilities for complex journey patterns
  - **Investigative Analysis**: Deep pattern recognition and insight extraction
  - **Comprehensive Quotes & Citations**: Extensive source attribution and evidence-based insights
- **Port**: 8095
- **MCP Integration**: Port 8506
- **Key Files**: `internal-solutions-claude4-journey-mapper-v2/src/app.py`

#### 5. AI Journey Mapper (OpenAI o3)
- **Technology**: FastAPI + OpenAI o3 reasoning model
- **Features**: Configurable reasoning effort (low/medium/high), advanced analysis
- **Port**: 8090
- **MCP Integration**: Port 8505

#### 6. Video Transcriptor
- **Technology**: FastAPI + OpenAI Whisper API + yt-dlp + FFmpeg integration
- **Features**: YouTube URL support, file uploads (MP4, AVI, MOV, WAV, MP3), automatic chunking for large files (>25MB), real-time processing status
- **Port**: 5002
- **Key Features**: Handles files up to 500MB with intelligent chunking, parallel processing, JSON export, batch processing queue
- **Quality**: 99+ language support, 95%+ accuracy for clear audio, error recovery with retry mechanisms

#### 7. 📝 LinkedIn Post Generator - **ENHANCED WITH CLAUDE 4**
- **Technology**: FastAPI + **Enhanced Extended Thinking AI Pipeline** + uvicorn ASGI server
- **AI Models**: **Claude Sonnet 4** (`claude-sonnet-4-20250514`) for investigative analysis + OpenAI GPT-4o (secondary)
- **Enhanced Features**: 
  - **Investigative Journalism Approach**: Transform data into compelling, evidence-based narratives
  - **4-Stage Extended Thinking Pipeline**: 64K tokens per stage for comprehensive content development
  - **Comprehensive Source Attribution**: Proper research citation and author credit
  - **Advanced NLP Processing**: spaCy 3.5+ and NLTK 3.6+ for sophisticated text analysis
  - **Professional Content Quality**: Business-appropriate language with LinkedIn optimization
  - **Multi-format Support**: Journey maps (JSON/HTML), PDFs, text documents
- **Port**: 5003
- **Frontend**: Custom HTML/CSS/JS with drag-and-drop interface and real-time progress tracking
- **Performance**: 45-90 second generation time, up to 50MB file support

#### 8. Miro Generator (CLI Tool)
- **Technology**: TypeScript 5.3 + Commander.js + Jest 29.7
- **Features**: Professional CLI interface, comprehensive test coverage
- **Testing**: Unit + integration tests with coverage reporting
- **Build**: ES2022 target with full TypeScript compilation

#### 9. A11y Image Caption Generator
- **Technology**: FastAPI + Claude 3.7 Sonnet Vision + PIL
- **Features**: WCAG 2.1 compliant alt text, bulk processing, accessibility-focused prompting
- **Port**: 5005
- **AI Integration**: Base64 image encoding, context-aware accessibility descriptions
- **Export Formats**: JSON, CSV, TXT with structured accessibility metadata

#### 10. Flux LoRA Studio
- **Technology**: Python + Flux AI models + LoRA fine-tuning + Gradio interface
- **Features**: AI image generation, model training, LoRA customization, batch processing
- **Port**: 5006
- **Key Features**: Flux model integration, custom LoRA training, image generation pipeline

#### 11. Presentation Generator
- **Technology**: FastAPI + Claude integration + PowerPoint API + python-pptx
- **Features**: AI-powered slide generation, template customization, content extraction
- **Port**: 5007  
- **Key Features**: Professional presentation creation, Claude content generation, multi-format export

#### 12. Mulmocast Wizard
- **Technology**: TypeScript + Node.js + Multi-modal processing + WebSockets
- **Features**: Content casting, media distribution, real-time streaming, format conversion
- **Port**: 5008
- **Key Features**: Multi-modal content processing, distribution platform, advanced media handling

#### 13. AI Agent Assistant
- **Technology**: Python + WebSockets + Claude API + MCP Protocol
- **Features**: Unified tool control, multi-model support, conversation context
- **Port**: 8500
- **Integration**: Orchestrates all services through MCP wrappers

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
- **🆕 Claude 4 Journey MCP: 8506** (**NEW** - Advanced reasoning wrapper)

### A11y Image Caption Generator: Digital Accessibility AI

The **A11y Image Caption Generator** is a professional accessibility-focused AI service that transforms how organizations approach digital inclusion and WCAG compliance. Powered by Claude 3.7 Sonnet's advanced vision capabilities, it generates professional-grade alt text and accessibility descriptions for screen readers and inclusive design workflows.

#### 🌟 **Accessibility Mission & Impact**

**Why This Service Matters**:
- **Digital Inclusion**: Making the web accessible to users with visual impairments  
- **WCAG Compliance**: Helping organizations meet accessibility standards (WCAG 2.1 AA)
- **Screen Reader Support**: Optimized descriptions for assistive technologies
- **Legal Compliance**: Supporting ADA and accessibility requirement adherence
- **Human-Centered AI**: Using Claude's intelligence for social good

**Target Users**:
- **Web Developers** building accessible websites
- **UX/UI Designers** creating inclusive experiences
- **Content Creators** needing compliant alt text
- **Accessibility Professionals** auditing digital content
- **Organizations** ensuring WCAG 2.1 compliance

#### 🤖 **Advanced AI Technology**

**Claude 3.7 Sonnet Vision Integration**:
- **Professional Prompting**: "Generate a WCAG 2.1 compliant alt text description for this image. Focus on the essential visual information that would help someone using a screen reader understand the content and context..."
- **Contextual Analysis**: Understands image purpose, meaning, and accessibility requirements
- **High Accuracy**: 95%+ confidence scores for reliable professional use
- **Base64 Processing**: Secure image encoding pipeline for Claude API integration

**Accessibility-Focused Features**:
- **WCAG Standards**: Follows established accessibility guidelines and best practices
- **Purpose-Driven**: Describes what images convey, not just what's visible
- **Concise & Clear**: Optimal length and clarity for screen reader consumption
- **Action-Oriented**: Describes interactions, functions, and contextual meaning

#### 💻 **Professional Interface & Workflow**

**Intelligence Augmentation Design**:
- **Branded Header**: Matches Intelligence Augmentation suite visual identity
- **Accessibility Symbols**: ♿ Universal Access icons throughout interface
- **Professional Cyan Gradient**: Consistent with platform color scheme (#01C4C8)
- **Dark Theme**: High contrast design optimized for accessibility

**Bulk Processing Capabilities**:
- **Multi-Image Upload**: Support for up to 10 images per batch (10MB each)
- **Drag-and-Drop Interface**: Intuitive file selection with real-time validation
- **Format Support**: JPG, PNG, GIF, BMP, WebP with comprehensive validation
- **Batch Statistics**: Processing time, confidence metrics, and success rates

#### ✏️ **Advanced Editing & Export Features**

**Caption Editor Tools**:
- **Find & Replace**: Regex-supported text replacement across all captions
- **Case Sensitivity**: Flexible text matching options for precise editing
- **Whole Words**: Professional editing controls for accuracy
- **Real-Time Updates**: Live preview of changes with modification highlighting

**Professional Export Options**:

**JSON Export** (Structured Accessibility Data):
```json
{
  "export_info": {
    "accessibility_standard": "WCAG 2.1",
    "purpose": "Alt text for screen readers and accessibility compliance"
  },
  "alt_text_data": [
    {"filename": "image.jpg", "alt_text": "Professional WCAG description"}
  ]
}
```

**CSV Export** (Accessibility Spreadsheet):
```csv
filename,alt_text,confidence,processing_time,wcag_compliant
image.jpg,"Accessibility description",0.95,2.3s,Yes
```

**TXT Export** (Plain Alt Text):
```
# WCAG 2.1 Alt Text
# Generated for accessibility compliance

image.jpg: Professional accessibility description
```

#### 🎯 **Professional Use Cases**

**Web Development Workflows**:
1. Upload website/app images for WCAG compliance
2. Generate professional alt text using Claude 3.7 vision AI
3. Bulk edit descriptions for consistency and accuracy
4. Export alt text directly into HTML/CMS systems
5. Ensure compliance with accessibility standards

**Content Management Applications**:
- **Blog Images**: Professional alt text for articles and content
- **E-commerce**: Product image accessibility descriptions
- **Social Media**: Inclusive content for all users
- **Documentation**: Technical content accessibility
- **Marketing**: Accessible promotional materials

**Accessibility Auditing Process**:
- **Compliance Testing**: Verify existing alt text quality against WCAG standards
- **Bulk Processing**: Handle large image libraries efficiently
- **Standard Reporting**: Generate WCAG-compliant documentation
- **Quality Assurance**: Professional accessibility review and validation

#### 🚀 **Live Service Access**

**URL**: http://localhost:5005
- **Professional A11y Interface** with accessibility-focused design
- **WCAG-Compliant Alt Text Generation** using Claude 3.7 Sonnet
- **Bulk Processing** for enterprise accessibility workflows
- **Multiple Export Formats** for various development environments

**Perfect for**:
- **Government Agencies** ensuring ADA compliance
- **Educational Institutions** creating accessible content
- **Healthcare Organizations** with accessibility requirements
- **Enterprise Companies** meeting WCAG standards
- **Non-Profits** promoting digital inclusion

**🌈 Social Impact**: Making the digital world more accessible and inclusive for everyone - transforming generic AI captions into accessibility-focused social impact solutions.

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

### Digital Accessibility Workflow

1. **Content Audit**: Upload website, app, or marketing images to A11y Image Caption Generator
2. **WCAG Compliance**: Generate professional alt text using Claude 3.7 Sonnet with accessibility-focused prompting
3. **Bulk Editing**: Use find/replace tools to ensure consistency across all image descriptions
4. **Export Integration**: Download structured JSON, CSV, or TXT files for direct CMS/HTML integration
5. **Quality Assurance**: Review confidence scores and accessibility metadata for compliance verification
6. **Legal Documentation**: Generate WCAG-compliant reports for accessibility audits and ADA compliance

### 🤖 AI Model Selection Guide

#### **Journey Mapping Models**
- **🚀 Claude Sonnet 4** (`claude-sonnet-4-20250514`): **RECOMMENDED** - Latest model with 200K token analysis, extended thinking mode, and superior reasoning for complex journey scenarios
- **⚡ Claude 3.7**: Standard journey mapping, proven reliability, balanced speed and quality
- **🧠 OpenAI o3**: Alternative reasoning approach with configurable effort levels (low/medium/high)

#### **Content Generation Models**  
- **📝 Claude Sonnet 4**: **PRIMARY** - Investigative journalism-style content with comprehensive source attribution
- **🔄 OpenAI GPT-4o**: **SECONDARY** - Backup for content generation and analysis

#### **When to Use Each Model**
- **Use Claude 4** for: Complex customer journeys, detailed analysis requiring maximum insight depth, professional content requiring investigative rigor
- **Use Claude 3.7** for: Standard journey mapping, proven workflows, faster processing needs
- **Use OpenAI o3** for: Alternative reasoning approaches, specific o3-optimized workflows

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

- **`docker-compose-all.yml`**: Complete stack with all 12 applications + MCP services
- **`docker-compose-https.yml`**: HTTPS proxy service for secure connections
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

### HTTPS Security Infrastructure

The platform includes enterprise-grade security features:

```bash
# Launch with automatic HTTPS setup
./launch.sh                          # Starts both HTTP and HTTPS services

# Manual HTTPS configuration
docker compose -f docker-compose-https.yml up -d    # Start HTTPS proxy
./setup-https.sh                     # Setup trusted certificates

# Access secure endpoints
open https://localhost:8443           # Secure launchpad
open https://localhost:8444           # Secure journey mapper
```

**Security Features**:
- **Self-signed SSL certificates** with automatic generation
- **Nginx HTTPS proxy** with 500MB upload limits
- **Extended timeouts** for long AI processing operations  
- **Professional browser experience** eliminating "Not Secure" warnings
- **Trusted certificate installation** for green lock experience

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
MIRO_GENERATOR_PORT=5004                     # Miro board generator
IMAGE_CAPTIONER_PORT=5005                    # A11y Image Caption Generator
FLUX_LORA_STUDIO_PORT=5006                   # Flux LoRA Studio
PRESENTATION_GENERATOR_PORT=5007             # Presentation Generator
MULMOCAST_WIZARD_PORT=5008                   # Mulmocast Wizard

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
- **Accessibility AI**: Claude 3.7 Sonnet Vision for WCAG-compliant alt text generation
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

**NXT Humans Intelligence Augmentation** - A comprehensive platform for customer experience research, analysis, and professional content generation with AI-powered insights, unified agent orchestration, and enterprise-grade security infrastructure.
