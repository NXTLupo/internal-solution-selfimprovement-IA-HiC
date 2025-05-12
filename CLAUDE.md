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
./check-and-run.sh

# Start the workbench with AI agent enabled
./launch-with-agent.sh your_api_key_here

# Stop all services
./stop-workbench.sh

# View status of running containers
docker compose -f dynamic-compose.yml ps

# View logs for a specific service (e.g., journey-mapper)
docker compose -f dynamic-compose.yml logs journey-mapper

# View logs continuously
docker compose -f dynamic-compose.yml logs -f journey-mapper

# Restart a specific service
docker compose -f dynamic-compose.yml restart [service-name]

# Update Anthropic API key
./update_anthropic_key.sh
```

## Starting the Workbench

### Option 1: Docker-based Deployment (Recommended)

```bash
# Start the entire workbench with all services
./check-and-run.sh

# Alternatively, use docker-compose directly
docker compose -f dynamic-compose.yml up -d

# Stop all services
./stop-workbench.sh
# or
docker compose -f dynamic-compose.yml down
```

### Using the Enhanced Journey Mapper Setup

```bash
# For setting up Journey Mapper with all dependencies
./setup-journey-mapper.sh

# Or use the enhanced Dockerfile
cd internal-solutions-journeymapper
docker build -f Dockerfile.enhanced -t journey-mapper .
docker run -p 8080:8000 -e ANTHROPIC_API_KEY=your_key_here journey-mapper
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
python init_db.py  # Initialize the database first
python -m run
```

## Initial Setup

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

Set these environment variables or add them to a `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here  # Required for Journey Mapper and Social Research Tool
LAUNCHPAD_PORT=8000                  # Optional, default: 8000
JOURNEY_MAPPER_PORT=8080             # Optional, default: 8080
REDDIT_RIPPER_PORT=5001              # Optional, default: 5001
SOCIAL_RESEARCH_PORT=3000            # Optional, default: 3000
SOCIAL_RESEARCH_BACKEND_PORT=8081    # Optional, default: 8081
```

## Application Architecture

### 1. Reddit Data Collector (internal-solutions-reddit-ripper)

- **Technology**: Python with Flask, PRAW (Reddit API), FPDF
- **Main Entry Point**: app.py
- **Features**: Subreddit scraping, time filtering, PDF generation, batch processing
- **Access URL**: http://localhost:5001
- **Key Files**:
  - `app.py`: Main Flask application and API endpoints
  - `downloads/`: Directory where generated PDF files are stored

### 2. Social Research Analysis Tool (internal-solutions-socialresearch)

- **Technology**: Python backend (Flask), ReactJS frontend (TypeScript), PostgreSQL with pgvector
- **Main Components**:
  - **Backend**: `/backend/run.py` - Flask API server
  - **Frontend**: `/frontend/src/` - React application
- **Key Features**: Topic modeling, sentiment analysis, interactive visualizations, RAG
- **Access URL**: http://localhost:3000 (frontend), http://localhost:8081 (backend API)
- **Node.js Version**: Requires Node.js 20+
- **Database**: PostgreSQL with pgvector extension for vector embeddings
- **Architecture**:
  - **Frontend**: React with TypeScript, Redux Toolkit for state management, Tailwind CSS
  - **Backend**: Flask API server, SQLAlchemy ORM, pgvector for vector embeddings
  - **Data Processing Pipeline**: Text processing, sentiment scoring, chunking, LLM analysis

### 3. AI Journey Mapper (internal-solutions-journeymapper)

- **Technology**: Python with FastAPI, Anthropic Claude 3.7 Sonnet
- **Main Components**:
  - `src/app.py`: FastAPI application with main routes
  - `src/ai_analysis/dynamic_journey_mapper.py`: Core journey mapping logic
  - `src/data_ingestion/data_processor.py`: Data preprocessing
  - `src/utils/prompts.py` and `src/utils/enhanced_prompts.py`: Claude prompt templates
- **Features**: Multi-format data processing, two-stage AI analysis, interactive visualizations
- **Access URL**: http://localhost:8080
- **Dependencies**: Requires build-essential, python3-dev, wkhtmltopdf, and xvfb for compiling C extensions and PDF generation
- **Generated Output**: HTML journey maps are stored in the `journey_maps` directory

### 4. Launcher (launchpad)

- **Technology**: Python with Flask
- **Main Entry Point**: app.py
- **Purpose**: Central dashboard to access all three applications
- **Access URL**: http://localhost:8000
- **Features**: Health monitoring of all services, unified navigation

## Development Guidelines

### Journey Mapper Development

```bash
cd internal-solutions-journeymapper

# Install dependencies
sudo apt-get update  # For Ubuntu/Debian
sudo apt-get install -y build-essential  # Required for compiling C extensions
pip install -r requirements.txt

# Start the application
python run.py

# Set log level for debugging
export LOG_LEVEL=DEBUG  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# Direct API start (development mode)
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload

# Update API key
# Edit the .env file in the root directory or set environment variable:
export ANTHROPIC_API_KEY=your_api_key_here
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

# Type checking (implicit in build)
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
pip install flask praw fpdf
python app.py

# Clean generated PDFs and status files
rm -rf downloads/*

# Run with debug logging
export FLASK_DEBUG=1
python app.py
```

## Data Workflows

### Complete Workflow

1. **Data Collection**: Use Reddit Ripper to collect data from subreddits
2. **Data Analysis**: Process collected PDFs through Social Research Tool to find key topics
3. **Journey Mapping**: Upload PDFs to Journey Mapper for customer journey visualization

### Journey Mapper Data Processing

1. Upload PDF, CSV, or TXT files
2. Files are processed by `data_processor.py` to extract text and context
3. Claude 3.7 Sonnet performs first-pass analysis
4. Second-pass analysis refines the journey map
5. Interactive HTML journey map is generated and saved

### Social Research Tool Processing

1. **Topic Modeling Pipeline**:
   - Text preprocessing and cleaning
   - Document embedding generation
   - Clustering and dimension reduction
   - Topic identification and labeling
   - Topic engagement metrics calculation

2. **Sentiment Analysis Pipeline**:
   - RoBERTa sentiment scoring and filtering
   - Sentence-BERT clustering or ABSA analysis
   - Data chunking for LLM processing
   - Multi-stage LLM analysis for sentiment extraction
   - Category merging and final results generation

## UI and Brand Guidelines

The NXT Humans workbench follows specific brand guidelines:

- **Primary Color**: Cyan #01C4C8 (rgba(1,196,200,1))
- **Dark Background**: #121B26
- **Secondary Colors**: Light Grey #5A6275, Medium Grey #4A5165
- **Typography**: Segoe UI / system fonts
- **UI Components**: Card-based design with standardized elements

When making UI changes, refer to `brand-style-guide.md` for detailed specifications. All UI components should be consistent across the three applications and the central launchpad.

## Testing

While the codebase doesn't include formal testing frameworks, you can validate application functionality through:

1. **Manual Testing**: Run each application independently to verify basic functionality
2. **E2E Testing**: Test the full workflow from data collection to journey mapping
3. **Server Logs**: Check application logs for errors:
   - Journey Mapper: `/internal-solutions-journeymapper/logs/`
   - Social Research: Backend console output
   - Reddit Ripper: Flask console output

## Troubleshooting

1. **Port Conflicts**
   - The `check-and-run.sh` script automatically handles port conflicts
   - To manually configure ports, edit the `.env` file
   - Stop specific ports: `lsof -ti:PORT_NUMBER | xargs kill -9`

2. **API Key Issues**
   - Ensure your Anthropic API key is correctly set in `.env` file
   - Check application logs for API key errors
   - Default Anthropic model is Claude 3.7 Sonnet (claude-3-7-sonnet-20250219)

3. **Docker Issues**
   - Ensure Docker is installed and running
   - Check available resources (CPU/Memory)
   - For external drive access issues, check file permissions
   - Container networking: Update container URLs from 'localhost' to container names
   - Journey Mapper build issues: Update Dockerfile to include `build-essential` package
   - Social Research Node.js version: Use Node.js 20 or later (update image to `node:20-slim`)

4. **Journey Mapper Issues**
   - Compilation failures: Install build-essential package
   - C extension errors: Check that gcc and build tools are available
   - Missing annoy/blis: These require C compiler tools to build
   - Annoy compilation failure: This is a common issue, may need Docker build with proper build tools
   - Check logs in `logs/` directory for debugging information

5. **Social Research Tool Issues**
   - Node.js version: Requires Node.js 20+ for React Router and other dependencies
   - npm warnings about engine compatibility: Update Node.js version
   - crypto getRandomValues errors: Update to newer Node.js version
   - Database connection issues: Ensure pgvector extension is installed in PostgreSQL
   - Memory errors in Docker: Adjust memory limits in docker-compose.yml
   - Python version compatibility: Use Python 3.11 (3.12 not supported)

6. **Application Not Loading**
   - Check Docker logs: `docker compose logs [service-name]`
   - Verify port availability: `lsof -i :PORT_NUMBER`
   - Check browser network console for errors
   - Check container network communication: Use container names instead of localhost

## Useful Commands

```bash
# Check status of running containers
docker compose ps

# View logs for a specific service
docker compose logs [service-name]

# View logs continuously
docker compose logs -f [service-name]

# Restart a specific service
docker compose restart [service-name]

# Enter a container's shell
docker compose exec [service-name] bash

# Check container networking
docker network inspect nxthumans_ai_cx_workbench_nxt-humans-network

# Update API key
./update_anthropic_key.sh

# Check and kill processes on a specific port
lsof -ti:PORT_NUMBER | xargs kill -9

# Force restart all services
./restart-all-services.sh

# Docker network management
docker network create nxt-humans  # Create network (if needed)
docker network ls  # List networks
```

## Repository Structure

```
/
├── check-and-run.sh       # Main startup script
├── docker-compose.yml     # Docker configuration
├── dynamic-compose.yml    # Dynamic port Docker configuration
├── launchpad/             # Central navigation dashboard
├── internal-solutions-journeymapper/   # Journey mapping app
│   ├── src/               # Source code
│   │   ├── app.py         # FastAPI main app
│   │   ├── ai_analysis/   # Claude integration
│   │   └── data_ingestion/ # Data processing
│   ├── journey_maps/      # Generated journey maps
│   └── uploads/           # User uploaded files
├── internal-solutions-reddit-ripper/    # Reddit data collector
└── internal-solutions-socialresearch/   # Social data analytics
    ├── backend/           # Flask API server
    │   ├── app/           # Main application code
    │   ├── routes/        # API endpoints
    │   ├── util/          # Utility functions and LLM integrations
    │   └── db/            # Database models and services
    └── frontend/          # React application
        ├── src/           # Frontend source code
        ├── components/    # React components
        ├── hooks/         # Custom React hooks
        ├── pages/         # Page components
        ├── services/      # API service functions
        └── store/         # Redux store and slices
```

## Key API Endpoints

### Reddit Ripper

- `/api/scrape` - Initiate data collection (POST)
- `/api/status/<job_id>` - Check status of collection (GET)
- `/api/download/<job_id>/<filename>` - Download generated PDFs (GET)

### Social Research Tool

- `/api/topic-model/analyze-async` - Start topic modeling (POST)
- `/api/llm-analyzer/search` - Search Reddit data (POST)
- `/api/llm-analyzer/analyze-sentiment/<search_id>` - Analyze sentiment (POST)

### Journey Mapper

- `/api/upload` - Upload files for journey mapping (POST)
- `/api/generate-journey` - Generate journey map (POST)
- `/api/journey-maps` - List all journey maps (GET)

## AI Models and Integration

The workbench uses several AI models, with Claude 3.7 Sonnet being the primary model:

1. **Claude 3.7 Sonnet**
   - Used for journey mapping and sentiment analysis
   - Environment variable: `ANTHROPIC_MODEL=claude-3-7-sonnet-20250219`
   - Integration through the Anthropic API

2. **Topic Modeling**
   - Uses BERTopic in the Social Research Tool
   - Also leverages various transformer models for embeddings

3. **Vector Embeddings**
   - Uses pgvector extension for PostgreSQL
   - Enables similarity search for document retrieval

4. **Additional LLM Integrations**
   - OpenAI models
   - Mistral models
   - Google/Gemini models
   - Configuration through environment variables in `.env` file

## Quick Fixes for Common Issues

1. **Replace placeholder API key**
   ```bash
   # Update the API key in the .env file
   sed -i '' 's/your_api_key_here/YOUR_ACTUAL_KEY/g' .env
   ```

2. **Fix port conflicts**
   ```bash
   # Find and kill processes using a specific port
   lsof -ti:8000 | xargs kill -9  # For Launchpad
   lsof -ti:8080 | xargs kill -9  # For Journey Mapper
   lsof -ti:5001 | xargs kill -9  # For Reddit Ripper
   lsof -ti:3000 | xargs kill -9  # For Social Research frontend
   ```

3. **Force restart all services**
   ```bash
   ./restart-all-services.sh
   ```

## Known Issues

1. The Journey Mapper service requires the build-essential package and other dependencies to successfully build C extensions. This has been addressed in the enhanced Docker configuration.
2. The Social Research Tool requires Node.js 20 or later for compatibility with React Router and other dependencies.
3. Container networking should use container names instead of localhost URLs for inter-service communication.
4. Default API key in the repository should be replaced with a valid key before using the workbench.
5. Social Research Tool works best with Python 3.11; Python 3.12 is not fully supported due to library compatibility issues.