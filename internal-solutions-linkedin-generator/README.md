# LinkedIn Content Generator - NXT Humans Intelligence Augmentation Suite

## 🎯 Overview

The LinkedIn Content Generator is a sophisticated AI-powered service that transforms customer journey insights into professional LinkedIn content. It uses an Enhanced Extended Thinking AI pipeline with investigative journalism approach to create compelling, engaging content optimized for LinkedIn reach and professional impact.

## ✨ Key Features

### 🧠 Enhanced Extended Thinking AI Pipeline - **CLAUDE 4 POWERED**
- **4-Stage Analysis Process**: 64K tokens per stage for comprehensive content development (total 256K tokens)
- **Claude Sonnet 4 Integration**: Primary AI using `claude-sonnet-4-20250514` for investigative analysis
- **Dual AI Architecture**: Claude Sonnet 4 (primary) + OpenAI GPT-4o (secondary backup)
- **Investigative Journalism Approach**: Transform generic content into compelling, evidence-based narratives
- **Extended Thinking Mode**: Deep analysis with exhaustive examination and pattern recognition
- **Professional Formatting**: LinkedIn-specific optimization for maximum engagement and reach

### 📝 Advanced Content Generation Capabilities
- **Journey Map Integration**: Transform customer journey data into compelling LinkedIn narratives
- **Multiple Content Types**: Posts, articles, thought leadership pieces, case studies, insights
- **Source Attribution**: Proper research citation and author credit (fixing false first-person attribution)
- **Quality Revolution**: Eliminates "cliché and not interesting" content with substantive insights
- **Engagement Optimization**: AI-powered optimization for LinkedIn algorithms and professional reach
- **Professional Tone**: Business-appropriate language with investigative journalism style

### 🔧 Technical Architecture
- **FastAPI Backend**: High-performance async processing with uvicorn ASGI server
- **Advanced NLP**: spaCy 3.5+ and NLTK 3.6+ for sophisticated text analysis
- **Custom HTML/CSS/JS**: Drag-and-drop interface with real-time progress tracking
- **File Upload Support**: Multiple file formats for content source material

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Docker (optional, for containerized deployment)
- API Keys: Anthropic (Claude 4) and OpenAI

### Installation

#### Option 1: Standalone Installation
```bash
cd internal-solutions-linkedin-generator
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download required spaCy language model
python -m spacy download en_core_web_sm

# Set environment variables
export ANTHROPIC_API_KEY=your_anthropic_key_here
export OPENAI_API_KEY=your_openai_key_here

# Start the service
python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

#### Option 2: Docker Deployment
```bash
# From the workbench root directory
docker compose -f docker-compose-all.yml up linkedin-generator
```

### Access the Application
- **Standalone**: http://localhost:5000
- **Docker**: http://localhost:5003
- **HTTPS (with proxy)**: https://localhost:8449

## 📖 Usage Guide

### 1. Upload Source Material
- **Supported Formats**: Journey maps (JSON/HTML), PDFs, text documents
- **Drag & Drop**: Simple file upload interface
- **Content Analysis**: Automatic content type detection and preprocessing

### 2. Configure Generation Settings
- **Content Type**: Choose post type (thought leadership, case study, insights)
- **Tone**: Professional, casual, authoritative, conversational
- **Length**: Short form (150-300 words), medium (300-600), long form (600+)
- **Industry Focus**: Customize for specific business sectors

### 3. AI Processing Pipeline
The Enhanced Extended Thinking process includes:

#### Stage 1: Content Analysis (16K tokens) - **CLAUDE 4 POWERED**
- Deep semantic analysis of source material using Claude Sonnet 4's advanced reasoning
- Key insight extraction and categorization with investigative approach
- Audience relevance assessment and professional context analysis
- Comprehensive source attribution and evidence gathering

#### Stage 2: Narrative Structure (16K tokens) - **EXTENDED THINKING MODE**
- Story arc development with compelling, evidence-based narratives
- LinkedIn engagement optimization using platform-specific best practices
- Professional messaging framework with investigative journalism style
- Content quality assurance eliminating cliché and generic messaging

#### Stage 3: Content Generation (16K tokens) - **CLAUDE 4 INVESTIGATIVE ANALYSIS**
- Primary content creation with Claude Sonnet 4's enhanced capabilities
- Professional tone and style application with substantive insights
- LinkedIn algorithm optimization and engagement maximization
- Proper source citation and author credit integration

#### Stage 4: Enhancement & Optimization (16K tokens) - **DUAL AI VALIDATION**
- Secondary review with OpenAI GPT-4o for quality assurance
- Cross-validation between Claude 4 and GPT-4o for content quality
- Final engagement optimization and professional polish
- LinkedIn-specific formatting and CTA optimization

### 4. Review and Export
- **Real-time Preview**: See content as it's generated
- **Edit Capabilities**: Fine-tune generated content
- **Export Options**: Copy to clipboard, download as text/HTML
- **Analytics**: View generation metrics and processing insights

## 🔌 API Reference

### Health Check
```http
GET /health
```

### Generate Content
```http
POST /api/generate
Content-Type: multipart/form-data

Parameters:
- file: Source material file
- content_type: Type of LinkedIn content to generate
- tone: Professional tone (professional|casual|authoritative)
- length: Content length (short|medium|long)
- industry: Target industry focus
```

### Get Generation Status
```http
GET /api/status/{job_id}
```

### Download Generated Content
```http
GET /api/download/{job_id}
```

## ⚙️ Configuration

### Environment Variables
```bash
# AI API Keys (Required)
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key

# Service Configuration
PORT=5000
DEBUG=false
MAX_FILE_SIZE=50MB

# LinkedIn Optimization
LINKEDIN_OPTIMIZATION=true
ENGAGEMENT_SCORING=true

# Processing Configuration
MAX_TOKENS_PER_STAGE=16000
PROCESSING_TIMEOUT=300s
```

### Advanced Configuration
Edit `src/config.py` for advanced settings:
- AI model parameters
- Processing pipeline customization
- Content template modifications
- Industry-specific optimizations

## 📊 Performance & Monitoring

### Processing Metrics
- **Average Generation Time**: 45-90 seconds
- **Token Usage**: Up to 64K tokens total (4 × 16K stages)
- **Supported File Size**: Up to 50MB
- **Concurrent Jobs**: 5 simultaneous generations

### Quality Assurance
- **Multi-AI Validation**: Claude 4 + OpenAI cross-validation
- **Professional Standards**: Business communication best practices
- **LinkedIn Compliance**: Platform-specific content guidelines
- **Engagement Optimization**: Algorithm-aware content structuring

## 🧪 Testing

### Run Test Suite
```bash
# API connectivity tests
python test_claude_api.py
python test_marketing_generator.py

# Unit tests (if available)
pytest tests/

# Integration tests
python -m unittest discover tests/
```

### Test API Keys
```bash
# Test Anthropic integration
python -c "import anthropic; print('Anthropic SDK installed')"

# Test OpenAI integration  
python -c "import openai; print('OpenAI SDK installed')"
```

## 🔧 Troubleshooting

### Common Issues

#### API Key Problems
```bash
# Verify API keys are set
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY

# Test API connectivity
python test_claude_api.py
```

#### spaCy Model Issues
```bash
# Download language model
python -m spacy download en_core_web_sm

# Verify installation
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('spaCy model loaded successfully')"
```

#### Memory Issues
- Reduce max_tokens_per_stage in configuration
- Process smaller files
- Restart service to clear memory

#### Generation Timeout
- Increase PROCESSING_TIMEOUT in environment
- Check API rate limits
- Verify network connectivity

### Performance Optimization
- Use SSD storage for faster file processing
- Increase available RAM for large file processing
- Configure uvicorn workers for concurrent processing
- Enable Redis caching for repeated requests

## 🏗️ Architecture Details

### Tech Stack
- **Backend**: FastAPI + uvicorn ASGI server
- **AI Models**: Claude Sonnet 4 (primary), OpenAI GPT-4o (secondary)
- **NLP Processing**: spaCy 3.5+, NLTK 3.6+
- **Frontend**: Custom HTML/CSS/JS with drag-and-drop
- **File Processing**: Multi-format support with intelligent parsing

### Processing Pipeline
1. **File Upload & Validation**
2. **Content Extraction & Preprocessing**
3. **Enhanced Extended Thinking Analysis** (4 stages)
4. **Professional Content Generation**
5. **Quality Assurance & Optimization**
6. **Export & Analytics**

### Integration Points
- **MCP Protocol**: Ready for AI agent integration
- **NXT Humans Workbench**: Full integration with launchpad
- **Journey Mappers**: Direct integration with journey mapping tools
- **Analytics Suite**: Compatible with social research tools

## 🔗 Related Services

- **Journey Mapper (Claude 3.7)**: Source material generation
- **Journey Mapper (Claude 4)**: Advanced journey analysis
- **Social Research Analytics**: Content performance analysis
- **Miro Board Generator**: Visual content creation

## 📄 License

Part of the NXT Humans Intelligence Augmentation Suite. Internal use only.

## 🆘 Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review logs in `logs/` directory
3. Consult the NXT Humans Workbench documentation
4. Contact the development team

---

*This service is part of the NXT Humans Intelligence Augmentation Suite - transforming customer experience research through advanced AI technology.*