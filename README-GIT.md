# NXT HUMANS AI CX WORKBENCH

A comprehensive platform for customer experience research, analysis, and visualization using advanced AI techniques.

## Overview

The NXT Humans AI CX Workbench is an integrated platform with three main applications:

1. **Reddit Data Collector**: Gathers Reddit data from subreddits
2. **Social Research Analysis Tool**: Advanced analytics for social media data
3. **AI Journey Mapper**: Customer journey mapping using Claude 3.7 Sonnet

## Features

- End-to-end workflow for customer experience research and analysis
- Topic modeling to discover key themes in social data
- Multi-dimensional sentiment analysis
- Interactive visualizations for data exploration
- RAG (Retrieval Augmented Generation) capabilities
- Two-stage AI analysis for customer journey mapping
- Export options for sharing insights

## Architecture

The workbench is composed of three main components:

### 1. Reddit Data Collector
- **Technology**: Python with Flask, PRAW (Reddit API), FPDF
- **Features**: Subreddit scraping, time filtering, PDF generation, batch processing
- **Access URL**: http://localhost:5001

### 2. Social Research Analysis Tool
- **Technology**: Python backend (Flask), ReactJS frontend (TypeScript), PostgreSQL with pgvector
- **Features**: Topic modeling, sentiment analysis, interactive visualizations, RAG
- **Access URL**: http://localhost:3000 (frontend), http://localhost:8081 (backend API)

### 3. AI Journey Mapper
- **Technology**: Python with FastAPI, Anthropic Claude 3.7 Sonnet
- **Features**: Multi-format data processing, two-stage AI analysis, interactive visualizations
- **Access URL**: http://localhost:8080

### 4. Launcher (launchpad)
- **Technology**: Python with Flask
- **Purpose**: Central dashboard to access all three applications
- **Access URL**: http://localhost:8000

## Installation

### Prerequisites
- Docker and Docker Compose (recommended)
- Node.js 20+
- Python 3.9+
- PostgreSQL with pgvector extension (for local development)
- Anthropic API key

### Docker-based Installation (Recommended)

```bash
# Clone this repository
git clone https://github.com/yourusername/nxt-humans-ai-cx-workbench.git
cd nxt-humans-ai-cx-workbench

# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

# Start all services
./check-and-run.sh
```

### Manual Installation

See [CLAUDE.md](CLAUDE.md) for detailed instructions on installing and running each component separately.

## Usage

1. **Start the platform**:
   ```bash
   ./check-and-run.sh
   ```

2. **Access the central dashboard**:
   Open http://localhost:8000 in your browser

3. **Workflow**:
   - Collect data with Reddit Data Collector
   - Analyze with Social Research Tool
   - Create journey maps with Journey Mapper

## Documentation

- [CLAUDE.md](CLAUDE.md): Comprehensive documentation
- [journey-mapper-dependencies-guide.md](journey-mapper-dependencies-guide.md): Detailed guide for Journey Mapper dependencies
- [brand-style-guide.md](brand-style-guide.md): UI and brand guidelines

## License

This project is proprietary and for internal use only. All rights reserved.

## Acknowledgments

- Built with Claude 3.7 Sonnet from Anthropic
- Uses pgvector for vector embeddings and search
- Integrated with Reddit API for data collection