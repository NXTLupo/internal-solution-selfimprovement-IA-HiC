# NXT HUMANS INTELLIGENCE AUGMENTATION SUITE

## 🚀 The Platform

**NXT Humans Intelligence Augmentation** is a comprehensive microservices ecosystem delivering 14 integrated AI-powered applications for customer experience research, social analytics, content generation, and professional media creation. Built with enterprise-grade security, unified orchestration, and cutting-edge AI models.

## ✨ Key Highlights

- **14 Production Services** running simultaneously via Docker orchestration
- **Unified AI Agent** controlling all tools through natural language (MCP Protocol)
- **Latest AI Models**: Claude 4 Sonnet, Claude 3.7, OpenAI GPT-4o, Whisper API
- **Enterprise Security**: Complete HTTPS infrastructure with SSL certificates
- **One-Command Launch**: Automated deployment with port conflict resolution
- **Professional UX**: Service-specific branding, favicons, and visual identity

## 🎯 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/NXT-Humans/NXT-HUMANS_AI_CX_WORKBENCH.git
cd NXT-HUMANS_AI_CX_WORKBENCH

# 2. Set up API keys
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and OPENAI_API_KEY

# 3. Launch everything
./launch.sh

# 4. Access the platform
open http://localhost:8000  # Main Launchpad Hub
```

## 🧠 Intelligence Augmentation Services

### Core Applications

| Service | Port | Purpose | Technology |
|---------|------|---------|------------|
| **Launchpad Hub** | 8000 | Central command center with AI Agent | Python, WebSockets, MCP |
| **Social Research Analytics** | 3000/8081 | Advanced Reddit analytics with topic modeling | React 19, TypeScript 5.7, PostgreSQL, pgvector |
| **Reddit Data Collector** | 5001 | Social media data harvesting with TrustPilot, Play Store integration | Flask, PRAW, BeautifulSoup |
| **Journey Mapper (Claude 3.7)** | 8080 | Customer journey visualization | FastAPI, Claude 3.7, Mermaid |
| **Journey Mapper (Claude 4)** | 8095 | Advanced journey analysis with 200K tokens | FastAPI, Claude 4 Sonnet |
| **Video Analyzer** | 5002 | Video/audio transcription with YouTube support | FastAPI, Whisper API, FFmpeg |
| **LinkedIn Post Generator** | 5003 | Professional content with investigative journalism style | FastAPI, Claude 4, Extended Thinking |
| **Image Caption Generator** | 5005 | WCAG-compliant accessibility descriptions | FastAPI, Claude 3.7 Vision |
| **Character Generator** | 5010 | Consistent AI character creation | Flask, Gemini API, IndexedDB |
| **Presentation Generator** | 5007 | AI-powered slide creation | FastAPI, Claude, python-pptx |
| **Soundtrack Generator** | 5009 | AI music and audio generation | Python, Audio processing |
| **Flux LoRA Studio** | 5006 | AI image generation and training | Flux models, LoRA fine-tuning |
| **Miro Generator** | 5004 | Journey map to Miro board conversion | TypeScript CLI, Jest |
| **Amazon Market Intelligence** | 5011 | Product research and analysis | Flask, ScraperAPI |

### AI Agent & MCP Services

| Service | Port | Purpose |
|---------|------|---------|
| **AI Agent Orchestrator** | 8500 | Unified control via natural language |
| **Reddit MCP** | 8501 | Reddit tool wrapper for agent |
| **Social MCP** | 8502 | Social analytics wrapper |
| **Journey MCP** | 8503 | Journey mapping wrapper |
| **Video MCP** | 8504 | Video analysis wrapper |
| **Claude4 MCP** | 8506 | Claude 4 journey wrapper |

## 🎨 What's New (October 2025)

### Recent Updates
- **Security Audit**: Removed all hardcoded API keys and test files
- **UI Simplification**: Social Research now defaults to Topic Modeling only
- **Enhanced Data Collection**: Reddit Ripper now supports TrustPilot and Play Store
- **Bug Fixes**: Fixed subreddit parameter passing, job creation, real analysis implementation
- **Clean Codebase**: Removed 150+ test files, cleaned up logging directories

### Platform Capabilities
- **Multi-Source Data Collection**: Reddit, TrustPilot, Google Play Store reviews
- **Advanced Analytics**: Topic modeling (BERTopic), sentiment analysis (VADER), vector embeddings
- **Professional Content**: Investigative journalism-style LinkedIn posts with proper attribution
- **Accessibility Focus**: WCAG 2.1 compliant image descriptions for screen readers
- **Enterprise Features**: 500MB file uploads, extended timeouts, batch processing

## 📊 Service Access Points

### Primary Services (HTTP)
```
http://localhost:8000   # Launchpad Hub (Main Entry)
http://localhost:3000   # Social Research Frontend
http://localhost:5001   # Reddit Data Collector
http://localhost:5002   # Video Analyzer
http://localhost:5003   # LinkedIn Generator
http://localhost:5005   # Image Caption Generator
http://localhost:8080   # Journey Mapper (Claude 3.7)
http://localhost:8095   # Journey Mapper (Claude 4)
```

### HTTPS Secure Access
```
https://localhost:8443  # Secure Launchpad
https://localhost:8444  # Secure Journey Mapper
https://localhost:8447  # Secure Social Research
https://localhost:8448  # Secure Video Analyzer
```

## 🔧 Technology Stack

### Frontend
- **Modern**: React 19.0.0, TypeScript 5.7.2, Vite 6.1.0, Redux Toolkit 2.6.0
- **UI Libraries**: Material-UI 6.4.3, Tailwind CSS 4.0, Recharts
- **Legacy Support**: React 17.0.2 with Webpack 5.64 (Journey Mapper)

### Backend
- **Frameworks**: FastAPI (modern services), Flask (legacy services)
- **Databases**: PostgreSQL 16 with pgvector extension
- **AI Integration**: Anthropic Claude SDK, OpenAI SDK, Google Gemini
- **Infrastructure**: Docker, nginx, WebSockets, MCP Protocol

### AI Models
- **Claude 4 Sonnet** (`claude-sonnet-4-20250514`) - Latest reasoning
- **Claude 3.7 Sonnet** - Proven reliability
- **OpenAI GPT-4o** - Alternative generation
- **Whisper API** - Audio transcription
- **Gemini** - Character generation

## 🏗️ Architecture

### Microservices Communication
```
Browser → Launchpad (8000) → Agent (8500) → MCP Services → Core Applications
                                    ↓
                           Model Context Protocol
                                    ↓
                         [Reddit, Social, Journey, Video]
```

### Docker Network
- **Network**: `nxt-humans-network` bridge
- **Internal DNS**: Services communicate via container names
- **Volume Mounts**: Persistent storage for uploads, databases, generated content
- **Health Checks**: Automatic restart on failure

## 🛠️ Advanced Configuration

### Environment Variables (.env)
```env
# Required API Keys
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Optional Services
GEMINI_API_KEY=your_key_here
REDDIT_CLIENT_ID=your_reddit_id
REDDIT_CLIENT_SECRET=your_reddit_secret

# Port Configuration (defaults shown)
LAUNCHPAD_PORT=8000
AGENT_PORT=8500
SOCIAL_RESEARCH_PORT=3000
REDDIT_RIPPER_PORT=5001
VIDEO_ANALYZER_PORT=5002
```

### Port Management
```bash
# Check for conflicts
python port_scanner.py

# Auto-fix conflicts
python port_scanner.py --fix

# Kill specific port
python port_scanner.py --kill 8080
```

### Docker Commands
```bash
# Start all services
./launch.sh

# View running services
docker compose -f docker-compose-all.yml ps

# Check logs
docker compose -f docker-compose-all.yml logs -f [service-name]

# Restart specific service
docker compose -f docker-compose-all.yml restart [service-name]

# Stop everything
docker compose -f docker-compose-all.yml down
```

## 💡 Example Workflows

### Customer Research Pipeline
1. **Collect Data**: Use Reddit Ripper to gather posts from relevant subreddits
2. **Analyze Topics**: Process through Social Research for topic modeling
3. **Map Journey**: Upload to Journey Mapper (Claude 4) for visualization
4. **Generate Content**: Create LinkedIn post about insights
5. **Export**: Generate Miro board for stakeholder presentation

### Video Content Analysis
1. **Upload/URL**: Provide YouTube URL or video file to Video Analyzer
2. **Transcribe**: Get accurate transcription via Whisper API
3. **Analyze**: Process transcript through Social Research
4. **Visualize**: Create journey map from video insights
5. **Share**: Generate accessible captions for video

### Accessibility Workflow
1. **Upload Images**: Batch upload to Image Caption Generator
2. **Generate Alt Text**: Create WCAG 2.1 compliant descriptions
3. **Bulk Edit**: Use find/replace for consistency
4. **Export**: Download JSON/CSV for CMS integration

## 🐛 Troubleshooting

### Common Issues

**Port Conflicts**
```bash
python port_scanner.py --fix  # Automatic resolution
```

**API Key Issues**
```bash
# Verify keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Check container has keys
docker compose -f docker-compose-all.yml exec agent env | grep API_KEY
```

**Service Not Responding**
```bash
# Check health
curl http://localhost:8000/health

# Restart service
docker compose -f docker-compose-all.yml restart [service-name]

# Full reset
docker compose -f docker-compose-all.yml down
docker system prune -f
./launch.sh
```

**Database Issues (Social Research)**
```bash
# Reset database
docker compose -f docker-compose-all.yml exec social-research-backend python init_db.py

# Check pgvector
docker compose -f docker-compose-all.yml exec social-research-db psql -U postgres -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

## 📚 Documentation

### Key Files
- **CLAUDE.md** - Development guidelines and architecture details
- **README-DOCKER.md** - Docker setup and troubleshooting
- **PORT-CONFLICT-MANAGEMENT.md** - Advanced port management
- **TOOL-INTEGRATION-GUIDE.md** - MCP tool integration

### Development
```bash
# Frontend development (React/Vite)
cd internal-solutions-socialresearch/frontend
npm install
npm run dev

# Backend development (FastAPI)
cd internal-solutions-video-analyzer
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload

# TypeScript CLI (Miro Generator)
cd internal-solutions-miro-generator
npm install
npm run build
npm link  # Make available globally
```

## 🔒 Security Notes

- **API Keys**: Never commit `.env` file
- **HTTPS**: Self-signed certificates for local development
- **Removed**: All test files with hardcoded keys have been deleted
- **Best Practice**: Use environment variables for all sensitive data

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Follow patterns in CLAUDE.md
4. Commit changes (`git commit -m 'Add AmazingFeature'`)
5. Push to branch (`git push origin feature/AmazingFeature`)
6. Open Pull Request

## 📄 License

Proprietary software. All rights reserved.

## 🙏 Acknowledgments

- **Anthropic** - Claude 3.7 and Claude 4 Sonnet APIs
- **OpenAI** - GPT-4o and Whisper APIs
- **Google** - Gemini API
- **PostgreSQL** - Database with pgvector
- **Docker** - Containerization platform
- **Reddit** - PRAW API access

---

**NXT Humans Intelligence Augmentation Suite** - Enterprise-grade AI platform for customer experience research, social analytics, and content generation. Powered by cutting-edge AI models with unified orchestration.

*Current Branch: innovation-alpha-005-cleaned*
*Last Updated: October 2025*
*Platform Version: 2.0.0*