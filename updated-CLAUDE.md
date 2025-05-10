# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The NXT Humans AI CX Workbench is an integrated platform with three main applications:

1. **Reddit Data Collector**: Gathers Reddit data from subreddits (internal-solutions-reddit-ripper)
2. **Social Research Analysis Tool**: Advanced analytics for social media data (internal-solutions-socialresearch)
3. **AI Journey Mapper**: Customer journey mapping using Claude 3.7 Sonnet (internal-solutions-journeymapper)

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
cd internal-solutions-journey-mapper
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

## Common Development Commands

### Build, Run and Test Commands

#### Docker Management
```bash
# Start all services with Docker
./check-and-run.sh

# Check container status
docker compose ps

# View logs
docker compose logs [service-name]
docker compose logs -f [service-name]  # Follow logs in real-time

# Restart a specific service
docker compose restart [service-name]

# Enter container shell
docker compose exec [service-name] bash

# Stop all services
./stop-workbench.sh
```

#### Social Research Tool

```bash
# Frontend Development
cd internal-solutions-socialresearch/frontend

# Install dependencies 
npm install

# Start development server (TypeScript)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type checking
npm run typecheck

# Backend Development
cd internal-solutions-socialresearch/backend

# Start backend server
python -m run

# Initialize database
python init_db.py

# Database migrations
./init_alembic.sh  # First time only
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head

# Run specific API endpoints for testing
python -m routes.api_llm_analyzer  # Test LLM analyzer
python -m routes.api_topic_model   # Test topic modeling
```

#### Reddit Ripper

```bash
# Start development server
cd internal-solutions-reddit-ripper
python app.py

# Clean generated PDFs and status files
rm -rf downloads/*

# Run with debug logging
export FLASK_DEBUG=1
python app.py
```

#### Journey Mapper

```bash
# Start development server
cd internal-solutions-journey-mapper
python run.py

# Run with debug logging
export LOG_LEVEL=DEBUG
python run.py

# Clean generated journey maps
rm -rf journey_maps/*

# Direct API server start (development mode with auto-reload)
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload

# Update API key
export ANTHROPIC_API_KEY=your_api_key_here
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

## UI and Brand Guidelines

The NXT Humans workbench follows specific brand guidelines:

- **Primary Color**: Cyan #01C4C8
- **Dark Background**: #121B26
- **Typography**: Segoe UI / system fonts
- **UI Components**: Card-based design with standardized elements

When making UI changes, refer to `brand-style-guide.md` for detailed specifications. All UI components should be consistent across the three applications and the central launchpad.

## Testing

While the codebase doesn't include formal testing frameworks, you can validate application functionality through:

1. **Manual Testing**: Run each application independently to verify basic functionality
2. **E2E Testing**: Test the full workflow from data collection to journey mapping
3. **Server Logs**: Check application logs for errors:
   - Journey Mapper: `/internal-solutions-journey-mapper/logs/`
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
   - Update API key: `./update_anthropic_key.sh`

3. **Docker Issues**
   - Ensure Docker is installed and running
   - Check available resources (CPU/Memory)
   - For external drive access issues, check file permissions
   - Container networking: Update container URLs from 'localhost' to container names
   - Journey Mapper build issues: Update Dockerfile to include `build-essential` package
   - Social Research Node.js version: Use Node.js 20 or later (update image to `node:20-slim`)
   - Check container networking: `docker network inspect nxthumans_ai_cx_workbench_nxt-humans-network`

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
   - Required package versions:
     - Frontend: React 19+, TypeScript 5.7+
     - Backend: Flask 2.3+, SQLAlchemy <2.0.0, Python 3.11 (doesn't support 3.12)

6. **Application Not Loading**
   - Check Docker logs: `docker compose logs [service-name]`
   - Verify port availability: `lsof -i :PORT_NUMBER`
   - Check browser network console for errors
   - Check container network communication: Use container names instead of localhost

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

## Known Issues

1. The Journey Mapper service requires the build-essential package and other dependencies to successfully build C extensions. This has been addressed in the enhanced Docker configuration.
2. The Social Research Tool requires Node.js 20 or later for compatibility with React Router and other dependencies.
3. Container networking should use container names instead of localhost URLs for inter-service communication.
4. Default API key in the repository should be replaced with a valid key before using the workbench.