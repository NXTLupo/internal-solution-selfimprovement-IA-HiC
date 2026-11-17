# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The Social Research Analysis Tool is a comprehensive platform for analyzing Reddit data with two primary components:

1. **Topic Modeling Tool**: Explores key themes in a subreddit without predefined topics
   - Provides topics with sentiment scores
   - Interactive theme maps
   - RAG-powered AI chat

2. **Social LLM Analyzer**: Analyzes sentiment around specific topics within subreddits
   - Identifies positive and negative aspects
   - Generates summaries and suggestions
   - Creates visualizations

## Project Structure

- **Frontend**: React TypeScript application with Tailwind CSS
  - Located in `/frontend`
  - Uses Vite for building

- **Backend**: Flask Python application 
  - Located in `/backend`
  - Connects to PostgreSQL with pgvector extension
  - Uses various LLM providers (Anthropic Claude, OpenAI, Mistral, etc.)

## Development Commands

### Starting the Application

#### Option 1: Docker Setup (Recommended)

```bash
# Ensure Docker network exists
docker network create nxt-humans

# Build the containers 
docker compose build

# Start all services
docker compose up

# Start in detached mode
docker compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8081
- PgAdmin: http://localhost:5050

#### Option 2: Local Development

Frontend:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Backend:
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (Python 3.11 recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize the database (make sure PostgreSQL is running)
python init_db.py

# Start the backend server
python -m run
```

### Database Setup (PostgreSQL with pgvector)

```bash
# Install PostgreSQL with pgvector (macOS example)
brew install postgresql@16
brew services start postgresql@16
brew install pgvector
brew services restart postgresql@16

# Create the database
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

### Frontend Commands

```bash
# Development server
npm run dev

# Type checking and build
npm run build

# Linting
npm run lint
```

### Backend Commands

```bash
# Initialize database
python init_db.py

# Run application
python -m run

# Database migrations
cd backend
./init_alembic.sh  # First time only
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## Environment Variables

Create a `.env` file in the project root and backend directory with the following variables:

```
# Database Configuration
POSTGRES_USER=social_research_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=social_research_db
POSTGRES_HOST=localhost  # Use 'db' when running with Docker
POSTGRES_PORT=5432

# API Keys (as needed)
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
MISTRAL_API_KEY=your_mistral_api_key
GOOGLE_API_KEY=your_google_api_key
```

## Architecture

### Frontend Architecture
- React with TypeScript
- Redux Toolkit for state management
- Tailwind CSS for styling
- Axios for API calls
- React Router for navigation

### Backend Architecture
- Flask API server
- SQLAlchemy ORM for database interactions
- pgvector for vector embeddings
- Multiple LLM integrations (Anthropic, OpenAI, Google, Mistral)
- PRAW for Reddit data collection
- Text processing pipeline for sentiment analysis

### Data Processing Pipeline
The sentiment analysis pipeline includes:
1. Reddit data input
2. Text processing
3. Sentiment scoring with RoBERTa
4. Filter type selection
5. Chunking for LLM analysis
6. LLM-based sentiment analysis
7. Point merging and categorization

### LLM models (2026-11-09)
Every LLM analysis call goes through `backend/util/llm_models/claude.py` on **`claude-opus-5-5`**:
topic summaries (`BertTopic.summarize_topics`), sentiment evidence (`extract_sentiment_evidence`),
image descriptions (`image_processing/content_processor`), RAG chat + its keyword extraction
(`api_pgvector`), and the LLM Analyzer chunks/merges/AI summary (`api_llm_analyzer`).
- Override with `SOCIAL_RESEARCH_CLAUDE_MODEL`. `CLAUDE4_MODEL` is deliberately ignored (the
  workbench root `.env` pins it to a retired snapshot that 404s).
- Opus 5.5 rejects `temperature`/`top_p`/`top_k` and always thinks: `claude.py` drops the
  `temperature` argument callers still pass, reads text by block type (a response starts with a
  `thinking` block), uses `max_tokens=16000`, sets `output_config.effort`, and enables the
  server-side refusal fallback (`fallbacks: "default"`).
- `util/llm_models/deepseek.py` is a stub returning `""`; the legacy `deepseek-r1` analyzer value is
  mapped to Opus 5.5 in `process_chunk`.
- Non-LLM models are unchanged: BERTopic + `all-mpnet-base-v2` embeddings, CardiffNLP RoBERTa
  sentiment (one cached pipeline per process).

### Topic-modeling run lifecycle and triage
`POST /api/topic-model/analyze-async` creates a `reddit_jobs` row and runs
`process_topic_model_job` in a thread: fetch (8%) -> save/retrieve posts (9%) -> BERTopic (50%)
-> similarities (60%) -> Claude topic summaries (70%) -> RoBERTa per-post sentiment + Claude
evidence (75-90%) -> pgvector index + save into `reddit_results` where `id` = the project id in
the `/topic-modeling/<projectId>` URL (99-100%).
- Keyword runs: Reddit relevance search (the UI Sort By is ignored), limited to the date range,
  plus stored posts whose title/body/stored comments mention the keyword (whole word, case-insensitive),
  newest first. Reddit search does not index comments. The post browser
  `/reddit-browser/subreddit/<name>?q=&start=&end=` applies the same whole-word rule; keyword results
  link to it.
- Triage: `select id,status,progress,message,error,parameters from reddit_jobs order by created_at desc`
  in `social-research-db` (database `app`); backend logs; per-run artifacts in `backend/log_topic/`
  (shared by all jobs and wiped at each job start).
- The backend runs gunicorn with the source volume-mounted: `docker compose -f docker-compose-all.yml
  restart social-research-backend` reloads code, and kills any running job (it is marked orphaned).
  Check `reddit_jobs` for `processing` rows first.

## Common Issues and Solutions

- **Memory errors in Docker**: Adjust memory limits in docker-compose.yml
- **Database connection issues**: Ensure correct PostgreSQL setup with pgvector extension
- **Node.js compatibility**: Use Node.js 20+ for frontend development
- **Python version compatibility**: Use Python 3.11 (3.12 not supported)