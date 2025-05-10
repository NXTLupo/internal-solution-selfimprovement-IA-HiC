# NXT HUMANS AI CX WORKBENCH: COMPREHENSIVE GUIDE

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Reddit Data Collector](#reddit-data-collector)
4. [Social Research Analysis Tool](#social-research-analysis-tool)
5. [AI Journey Mapper](#ai-journey-mapper)
6. [Integration Workflow](#integration-workflow)
7. [AI Models and Technologies](#ai-models-and-technologies)
8. [Getting Started](#getting-started)
9. [Troubleshooting](#troubleshooting)

## Introduction

The NXT HUMANS AI CX WORKBENCH is an integrated platform designed for comprehensive customer experience research, analysis, and visualization using advanced AI techniques. The platform combines data collection from social media, sophisticated analytics, and AI-powered journey mapping to provide actionable insights for businesses looking to understand their customer experience landscape.

This workbench enables end-to-end CX research workflows through three core applications working together seamlessly:

1. **Reddit Data Collector**: For gathering rich social data from specific communities
2. **Social Research Analysis Tool**: For applying advanced analytics to extract meaningful patterns
3. **AI Journey Mapper**: For transforming data into visualized customer journeys using Claude 3.7 Sonnet

## System Overview

### Architecture

The workbench follows a microservices architecture, with three main applications and a central launchpad:

```
┌────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│                │      │                      │      │                      │
│  Reddit Data   │──────▶  Social Research     │──────▶  AI Journey          │
│  Collector     │      │  Analysis Tool       │      │  Mapper              │
│                │      │                      │      │                      │
└────────────────┘      └──────────────────────┘      └──────────────────────┘
        ▲                         ▲                             ▲
        │                         │                             │
        │                         │                             │
        │                         ▼                             │
        │                ┌──────────────────────┐              │
        │                │                      │              │
        └────────────────│     Launchpad        │──────────────┘
                         │                      │
                         └──────────────────────┘
```

### Key Components

- **Launchpad**: Central dashboard for accessing all three applications
- **Docker Containers**: Each application runs in its own container
- **Shared Network**: All containers communicate over a Docker network
- **PostgreSQL Database**: Stores structured data and vector embeddings (for Social Research Tool)
- **API Integration**: Each service exposes RESTful APIs for interoperability
- **File Storage**: Shared directories for data exchange between services

## Reddit Data Collector

The Reddit Data Collector is a specialized tool designed to gather posts and comments from Reddit subreddits and export them to structured PDF format for further analysis.

### Core Functionality

1. **Data Collection**: Gathers posts and comments from specified subreddits
2. **Time Filtering**: Can retrieve data from various time periods (day, week, month, year, all time)
3. **Configurable Collection**: Controls for post count and comment depth
4. **Batch Processing**: Handles large data volumes via job system
5. **Export to PDF**: Structured document generation for each collection
6. **Progress Tracking**: Real-time monitoring of collection jobs

### Technology Stack

- **Backend**: Python with Flask
- **Reddit API**: PRAW (Python Reddit API Wrapper)
- **PDF Generation**: FPDF library
- **Asynchronous Processing**: Background job management for large collections
- **RESTful API**: For programmatic access and status monitoring

### Key Components

1. **`app.py`**: The main Flask application with routes, data collection logic, and API endpoints
2. **Job Management System**: Handles asynchronous processing of collection requests
3. **PDF Generator**: Formats and renders collected data into readable documents
4. **API Layer**: RESTful API endpoints for initiating and monitoring collection jobs
5. **Storage System**: `/downloads` directory for storing generated PDFs

### API Endpoints

- `POST /api/scrape`: Start a new collection job
  - Parameters: subreddit, post_count, time_filter, comments_per_post
  - Returns: job_id for tracking the collection

- `GET /api/status/<job_id>`: Check collection status
  - Returns: Job status, progress, and available files

- `GET /api/download/<job_id>/<filename>`: Download generated PDF file

### Data Collection Process

1. User submits collection parameters via form or API
2. System validates parameters and creates a job
3. Collector connects to Reddit API and begins fetching data
4. Posts and comments are processed and formatted
5. Data is split into manageable chunks for PDF generation
6. PDFs are saved to the downloads directory
7. Job status is updated for tracking

## Social Research Analysis Tool

The Social Research Analysis Tool is a sophisticated analytics platform that analyzes social media data to extract meaningful insights about topics and sentiment patterns, using both traditional NLP techniques and advanced AI models.

### Core Functionality

1. **Topic Modeling**: Identifies key themes and topics in Reddit data
2. **Sentiment Analysis**: Multi-dimensional analysis of emotional tone and sentiment
3. **Interactive Visualizations**: Data exploration through various visualization types
4. **RAG-powered AI Chat**: Interact with the analyzed data through natural language
5. **Filtering & Search**: Targeted analysis of specific topics or keywords
6. **Export Options**: Share insights in multiple formats

### Technology Stack

#### Frontend
- **Framework**: React with TypeScript
- **State Management**: Redux Toolkit
- **UI Components**: Material UI and custom components
- **Visualization**: D3.js for interactive charts
- **Network**: Axios for API communication

#### Backend
- **API Server**: Flask with Python
- **Data Processing**: Pandas, NumPy, scikit-learn
- **Database**: PostgreSQL with pgvector extension for vector embeddings
- **NLP Components**: NLTK, spaCy, HuggingFace Transformers
- **Topic Modeling**: BERTopic, cluster analysis
- **Vector Database**: pgvector for similarity search

### Key Components

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

3. **RAG System**:
   - Vector embeddings stored in PostgreSQL
   - Semantic search capabilities
   - Document retrieval and relevance scoring
   - LLM-augmented responses with source citations

### AI Models Integration

- **Claude 3.7 Sonnet**: For high-quality sentiment analysis and RAG responses
- **Transformer Models**: For embedding generation and initial sentiment classification
- **BERTopic**: For topic modeling and clustering
- **Custom ML Pipeline**: For multi-stage sentiment analysis with feedback loops

### Data Flow

1. Reddit data is imported from PDF files (from Reddit Data Collector)
2. Data undergoes preprocessing and cleaning
3. For topic modeling:
   - Documents are embedded and clustered
   - Topics are identified and visualized
4. For sentiment analysis:
   - Content is filtered using ML techniques
   - Filtered content is processed through LLM analysis
   - Results are categorized and presented with evidence

## AI Journey Mapper

The AI Journey Mapper is an advanced tool that transforms customer experience data into comprehensive visual journey maps using Anthropic's Claude 3.7 Sonnet LLM with sophisticated chain-of-thought processing techniques.

### Core Functionality

1. **Multi-Format Data Processing**: Handles PDF, CSV, TXT, and JSON inputs
2. **Two-Stage AI Analysis**: Progressive refinement of journey insights
3. **Interactive Visualizations**: HTML-based responsive journey maps
4. **Chain-of-Thought Processing**: Explicit reasoning with evidence
5. **Direct Evidence Capture**: Quotes and citations from source data
6. **Export Options**: HTML, PDF, and PNG formats

### Technology Stack

- **Backend**: Python with FastAPI framework
- **AI Integration**: Anthropic Claude 3.7 Sonnet API
- **Data Processing**: pandas, pypdf, scikit-learn, spacy
- **HTML Rendering**: Jinja2 templates with custom JavaScript
- **PDF Generation**: wkhtmltopdf (with xvfb for headless operation)
- **Vector Search**: Annoy or FAISS for efficient similarity search

### Key Components

1. **`DynamicJourneyMapper` Class**: Core AI analysis engine in `src/ai_analysis/dynamic_journey_mapper.py`
   - Manages the two-pass analysis process
   - Handles prompt construction and Claude API interactions
   - Processes responses and generates HTML visualizations

2. **Data Processing Pipeline**: Components in `src/data_ingestion/data_processor.py`
   - Extracts text from various file formats
   - Cleans and preprocesses data for analysis
   - Chunks large documents for efficient processing

3. **Prompt Engineering**: Templates in `src/utils/prompts.py`
   - Sophisticated prompts optimized for Claude 3.7
   - Chain-of-thought guidance for explicit reasoning
   - Instructions for evidence collection and citation

4. **Visualization Engine**: HTML/CSS/JavaScript generation
   - Responsive design with CSS Grid and Flexbox
   - Interactive elements with vanilla JavaScript
   - Evidence linking and expansion functionality

### Journey Mapping Process

The application uses a sophisticated dual-pass analysis technique:

1. **First Analysis Pass**:
   - Processes input data across formats
   - Identifies journey stages from evidence
   - Maps emotions, activities, pain points and opportunities
   - Creates an initial journey map

2. **Second Analysis Pass**:
   - Analyzes the first map output critically
   - Refines journey stages with deeper insights
   - Enhances visualization with more specific metrics
   - Generates improved HTML visualization with evidence

3. **Evidence Collection**:
   - Extracts direct quotes from source data
   - Includes citations for all insights
   - Uses formatted blockquotes to distinguish evidence

### API Endpoints

- `POST /api/upload`: Upload files for journey mapping
  - Accepts multipart/form-data with PDF, CSV, TXT files
  - Returns: file_id for the uploaded file

- `POST /api/generate-journey`: Generate journey map
  - Parameters: file_id, journey_name, options
  - Returns: journey_id for the generated journey map

- `GET /api/journey-maps`: List all journey maps
  - Returns: List of available journey maps with metadata

- `GET /api/journey-maps/<journey_id>`: Get a specific journey map
  - Returns: HTML content of the journey map

## Integration Workflow

The NXT HUMANS AI CX WORKBENCH is designed for a seamless end-to-end workflow that takes you from data collection to actionable customer journey insights.

### Complete Workflow

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  1. Data        │     │  2. Data            │     │  3. Journey          │
│  Collection     │────▶│  Analysis           │────▶│  Mapping             │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
```

1. **Data Collection Phase**:
   - Use Reddit Data Collector to gather data from relevant subreddits
   - Specify time periods, post counts, and comment depth
   - Export data as structured PDF documents

2. **Data Analysis Phase**:
   - Import PDFs into the Social Research Analysis Tool
   - Run topic modeling to discover key themes and topics
   - Perform sentiment analysis on specific topics of interest
   - Use RAG-powered chat to explore insights further

3. **Journey Mapping Phase**:
   - Upload analysis results to AI Journey Mapper
   - Generate comprehensive customer journey maps
   - Review journey stages, emotions, pain points, and opportunities
   - Export for sharing with stakeholders

### Data Handoff Points

- **Collection to Analysis**: PDF files from Reddit Data Collector are imported into Social Research Tool
- **Analysis to Mapping**: Data insights from Social Research Tool are uploaded to AI Journey Mapper

### Sample End-to-End Use Case

1. **Research Question**: "How do customers perceive the onboarding experience for product X?"
2. **Data Collection**: 
   - Collect 500 posts from r/ProductX with 50 comments each
   - Export as structured PDFs
3. **Data Analysis**:
   - Identify key topics through topic modeling
   - Find "onboarding" related topics and analyze sentiment
   - Extract positive and negative aspects with evidence
4. **Journey Mapping**:
   - Upload onboarding analysis to Journey Mapper
   - Generate customer journey map showing stages and pain points
   - Review specific evidence for each journey stage
   - Export the journey map for presentation

## AI Models and Technologies

The NXT HUMANS AI CX WORKBENCH leverages a variety of advanced AI models and technologies across its components.

### Core AI Models

1. **Anthropic Claude 3.7 Sonnet**
   - **Used in**: AI Journey Mapper, Social Research Tool
   - **Capabilities**: Advanced text understanding, chain-of-thought reasoning, evidence extraction
   - **Implementation**: Direct API integration via the Anthropic SDK
   - **Model Version**: claude-3-7-sonnet-20250219
   - **Key Features**:
     - Extended context window (200K tokens)
     - Sophisticated reasoning capabilities
     - High-quality evidence extraction
     - Multi-format understanding

2. **Transformer-Based Models**
   - **Used in**: Social Research Tool
   - **Models Include**:
     - RoBERTa for sentiment classification
     - Sentence-BERT for embeddings
     - DeBERTa for aspect-based sentiment analysis
   - **Implementation**: HuggingFace Transformers library
   - **Key Features**:
     - Pre-trained language understanding
     - Dense vector embeddings
     - Classification capabilities

3. **BERTopic**
   - **Used in**: Social Research Tool
   - **Capabilities**: Topic modeling with transformer embeddings
   - **Implementation**: BERTopic library
   - **Key Features**:
     - Document clustering
     - Topic extraction and labeling
     - Visualization of topic spaces

### Vector Search Technologies

1. **pgvector**
   - **Used in**: Social Research Tool
   - **Implementation**: PostgreSQL extension for vector operations
   - **Key Features**:
     - Vector similarity search
     - Persistent storage of embeddings
     - Integration with PostgreSQL

2. **FAISS / Annoy**
   - **Used in**: AI Journey Mapper
   - **Implementation**: Optional libraries for vector search
   - **Key Features**:
     - Fast approximate nearest neighbor search
     - Efficient memory usage
     - Scalable to large document collections

### NLP Technologies

1. **NLTK & spaCy**
   - **Used in**: All components
   - **Capabilities**: Text processing, tokenization, entity recognition
   - **Key Features**:
     - Linguistic analysis
     - Named entity recognition
     - Part-of-speech tagging

2. **scikit-learn**
   - **Used in**: Social Research Tool, AI Journey Mapper
   - **Capabilities**: Machine learning algorithms, dimension reduction
   - **Key Features**:
     - Clustering algorithms
     - Feature extraction
     - Model evaluation

3. **HDBSCAN**
   - **Used in**: Social Research Tool
   - **Capabilities**: Hierarchical density-based clustering
   - **Key Features**:
     - Identifying clusters of varying densities
     - Works well with high-dimensional data
     - Flexible cluster shapes

### AI Pipeline Architectures

1. **Two-Stage Analysis** (AI Journey Mapper)
   - Initial analysis phase captures broad patterns
   - Refinement phase adds detail and corrects errors
   - Result is more accurate and comprehensive journey maps

2. **Multi-Step Sentiment Analysis** (Social Research Tool)
   - ML filtering to identify relevant content
   - Chunking for efficient LLM processing
   - LLM analysis for detailed sentiment extraction
   - Merging phases to consolidate findings

3. **RAG Architecture** (Social Research Tool)
   - Document vectorization and storage
   - Semantic search for relevant passages
   - LLM-augmented responses with source evidence
   - Interactive chat interface for exploration

## Getting Started

### System Requirements

- **Docker and Docker Compose** (recommended)
- **Node.js 20+** (for Social Research Tool frontend)
- **Python 3.9+** (3.11 recommended for Social Research Tool)
- **PostgreSQL with pgvector extension** (for local development)
- **Anthropic API key** (for Claude 3.7 access)

### Quick Start with Docker

1. **Clone the repository** (if applicable)
2. **Set up environment variables**:
   ```bash
   # Create .env file with your API key
   echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
   ```

3. **Start all services**:
   ```bash
   ./check-and-run.sh
   ```

4. **Access the central dashboard**:
   Open http://localhost:8000 in your browser

### Manual Installation

For detailed instructions on installing and running each component separately, see the main [CLAUDE.md](CLAUDE.md) file.

## Troubleshooting

### Common Issues and Solutions

1. **API Key Issues**
   - **Symptom**: "Invalid API key" errors in logs
   - **Solution**: 
     - Update your Anthropic API key in the `.env` file
     - Run `./update_anthropic_key.sh` to apply the change
     - Check logs for specific error messages

2. **Docker Installation Problems**
   - **Symptom**: Container build failures
   - **Solution**:
     - Ensure Docker is installed and running
     - Check Docker daemon has sufficient resources (8GB+ RAM recommended)
     - For external drive access: check file permissions

3. **Journey Mapper Build Issues**
   - **Symptom**: Compilation failures for C extensions
   - **Solution**:
     - Install build tools: `build-essential`, `python3-dev`
     - For annoy/blis errors: ensure GCC is available
     - Check logs in `journey_mapper/logs/` directory

4. **Social Research Tool Issues**
   - **Symptom**: Frontend fails to start or shows errors
   - **Solution**:
     - Ensure Node.js 20+ is installed (required for React 19)
     - For database connection errors: verify pgvector is installed
     - For backend issues: check Flask logs for detailed errors

5. **Port Conflicts**
   - **Symptom**: "Address already in use" errors
   - **Solution**:
     - Use `check-and-run.sh` which handles port conflicts automatically
     - Manually free ports: `lsof -ti:PORT_NUMBER | xargs kill -9`
     - Configure custom ports in `.env` file

For more detailed troubleshooting steps, refer to the [CLAUDE.md](CLAUDE.md) file.