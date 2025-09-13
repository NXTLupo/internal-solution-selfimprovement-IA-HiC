# Social Research Analysis Tool - NXT Humans Intelligence Augmentation Suite

## 🎯 Overview

The Social Research Analysis Tool is a comprehensive AI-powered analytics platform that combines advanced social media data analysis with cutting-edge vector database technology. Built with modern React 19 + TypeScript 5.7 + Vite 6.1 stack, it provides professional-grade social research capabilities with real-time insights and semantic search functionality.

## ✨ Key Features

### 🔍 Advanced Topic Modeling Tool
This tool helps users explore the **key themes** occurring in a subreddit using sophisticated AI models:

- **Input**: Subreddit name and filtering parameters
- **AI-Powered Analysis**: 
  - **BERTopic Integration**: Advanced topic modeling with transformer-based embeddings
  - **Vector Embeddings**: PostgreSQL + pgvector for semantic similarity search
  - **Sentiment Analysis**: VADER and transformer-based sentiment scoring
  - **Interactive Visualizations**: Dynamic theme maps and trend analysis
- **Output**:
  - Topics with detailed sentiment scores and confidence metrics
  - Interactive theme maps with clustering visualization
  - RAG-powered AI chat interface for conversational analysis
  - Exportable analytics reports and data visualizations

### 🧠 Social LLM Analyzer
Advanced sentiment analysis tool that provides deep insights into specific topics within subreddit discussions:

- **Input**: Subreddit name, defined topic, and analysis parameters
- **Advanced Processing**:
  - **Multi-stage Sentiment Pipeline**: RoBERTa + DeBERTa + Custom LLM analysis
  - **Aspect-Based Sentiment Analysis (ABSA)**: Topic-specific sentiment extraction
  - **Clustering Algorithms**: Sentence-BERT + HDBSCAN for content grouping
  - **Real-time Processing**: Live data streaming and progressive analysis
- **Output**:
  - Comprehensive positive and negative sentiment breakdowns
  - AI-generated summaries with actionable insights and recommendations
  - Professional data visualizations and trend analysis
  - Detailed analytics with statistical confidence measures


## Deployment option 1: Local Deployment with Docker

1. **Complete the Setup**
   - Follow the instructions in the repository: [NXT-Humans Dev Environment](https://github.com/NXT-Humans/nxth-dev-env)

2. **Ensure Docker Daemon is Running**
   - Open **Docker Desktop** or ensure the daemon is active via CLI:
     ```sh
     docker info
     ```

3. **Azure Login**
   - In the root directory, run:
     ```sh
     palm az-login
     ```
     > **Note** This will pop up an authorization web window for you to log in, and all credentials will be mounted inside the container ```root./.azure```. Check if this exists when there is error with Azure login
     

4. **Ensure the Docker Network Exists**
   - Create the network if it does not exist:
     ```sh
     docker network create nxt-humans
     ```

5. **Windows Users Only:**
   - Ensure `AZURE_AUTH_LOCATION` is set in `./.env`, for example:
     ```sh
     AZURE_AUTH_LOCATION=C:\Users\username\.azure
     ```

6. **Build the Docker Containers**
   ```sh
   docker compose build
   ```
   > **Note** ./docker-compose.yml will be used
   
7. Configure environment variables (ask developer for the .env file)
   
8. **Run the Containers**
   ```sh
   docker compose up
   ```

## Potential Errors and Solutions

| Error | Description | Solution |
|-------|-------------|----------|
| Error exit code 139 with seg fault | Container crashes with segmentation fault | Check memory allocation with `docker stats`. If total memory is less than 8 GB, increase memory allocation in Docker configuration. For Mac users, see [this StackOverflow thread](https://stackoverflow.com/questions/44533319/how-to-assign-more-memory-to-docker-container). |
| Azure login failure | `.azure` directory missing | Verify the `.azure` directory exists after running `palm az-login`. For Windows users, ensure the `AZURE_AUTH_LOCATION` is correctly set in your `.env` file. |
| Network connection issues | Docker network not created | Run `docker network create nxt-humans` before starting containers. |

   
## Deployment option 2: Deploy it on Azure with Github Action (WIP)
Container deployment is handled via the GitHub Actions workflow located at: ```.\.github\workflows\build-and-deploy.yml```, which will use ```\compose.deploy.yml``` instead of ```\docker-compose.yml```
### ⚙️ Local Testing with `act`

> **Note**: GitHub Actions require you to push changes to GitHub in order to test them. To streamline local testing, use the following workflow: ```.github/workflows/local-build-act.yml```
> This workflow is designed to be used with [`act`](https://github.com/nektos/act), a tool that enables local testing of GitHub Actions.
> For more details, refer to the [`act` documentation](https://github.com/nektos/act).

## Deployment option 3: Local Deployment with Python virtual environment

### Frontend Setup (Modern React 19 + Vite 6.1 Stack)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (Node.js 18+ required):
```bash
npm install
# Or using yarn/pnpm for faster installs
yarn install
pnpm install
```

3. Start the development server with HMR:
```bash
npm run dev          # Vite dev server with hot module replacement
npm run build        # TypeScript + Vite production build  
npm run preview      # Preview production build locally
npm run lint         # ESLint with TypeScript rules
```

**Development Features**:
- **Hot Module Replacement (HMR)**: Instant updates without page refresh
- **TypeScript Strict Mode**: Full type safety with path aliases (`@/components`, `@/utils`)
- **Vite Dev Server**: Lightning-fast startup and builds (port 5173)
- **ESLint Integration**: Real-time code quality checking
- **Tailwind CSS**: Utility-first styling with live reloading

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
# First install Python 3.11 if not already installed
# On Windows: Download from https://www.python.org/downloads/release/python-3115/
# On Unix-based systems:
# For Ubuntu/Debian: sudo apt-get install python3.11
# For MacOS with Homebrew: brew install python@3.11

py -3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables (ask developer for the .env file)

5. For OpenAI Azure:
   1. Install Azure CLI and signin
   ![image](https://github.com/user-attachments/assets/fde6c82f-8e9e-4899-bae2-8064a04b8397)

   https://learn.microsoft.com/en-us/azure/ai-studio/quickstarts/get-started-code?tabs=windows

   
   2. Hit enter when prompts Select a subscription and tenant after login
      
   ![image](https://github.com/user-attachments/assets/9f83d223-23b0-4507-866e-499e1e2236e6)


## Database Setup (PostgreSQL with pgvector on macOS) (Havn't tested out)

* **Install PostgreSQL:** 
  * Install PostgreSQL version 11 or newer (version 16 recommended).
  * Using Homebrew: 
    ```bash
    brew install postgresql@16 # Or your preferred version >= 11
    brew services start postgresql@16
    ```
  * Verify installation: 
    ```bash
    psql --version
    ```

* **Install pgvector Extension:** 
  * Using Homebrew: 
    ```bash
    brew install pgvector
    ```
  * You might need to link it to your PostgreSQL installation if prompted or if the extension isn't found later. Restarting the PostgreSQL service might be needed: 
    ```bash
    brew services restart postgresql@16
    ```

* **Create Database and User (Optional but Recommended):** 
  * Use `psql` (comes with PostgreSQL) or a GUI tool like pgAdmin.
  * Connect to the default `postgres` database: 
    ```bash
    psql postgres
    ```
  * Run the following SQL commands using psql on terminal:
    ```sql
    CREATE DATABASE social_research_db; -- Replace 'your_secure_password' with a strong password
    CREATE USER social_research_user WITH PASSWORD 'your_secure_password';
    GRANT ALL PRIVILEGES ON DATABASE social_research_db TO social_research_user;
    \q
    ```

* **Enable pgvector Extension in your Database:** 
  * Connect to your newly created database: 
    ```bash
    psql social_research_db
    ```
  * Run the following SQL command:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    \q
    ```


## Sentiment Analysis Pipeline
ML pipeline for sentiment analysis:

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '13px' }}}%%
graph TD
    A[Start]
    B[Reddit Data Input]
    C[Text Processing]
    D[RoBERTa Sentiment Scoring Filtering]
    E{Filter Type Selection}
    F1[Sentence-BERT + HDBSCAN Clustering Filter]
    F2[ABSA + DeBERTa Filter]
    G[Data Chunking]
    H[Sentiment Analysis with LLM]
    I[Point Merging with LLM]
    J[Category Merging with LLM]
    K[Final Results]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F1
    E --> F2
    F1 --> G
    F2 --> G
    G --> H
    H --> I
    I --> J
    J --> K

    classDef default fill:#2d3748,stroke:#4299e1,stroke-width:2px,color:#e2e8f0;
    classDef decision fill:#2c5282,stroke:#4299e1,stroke-width:2px,color:#e2e8f0;
    classDef process fill:#2d3748,stroke:#48bb78,stroke-width:2px,color:#e2e8f0;
    
    class E decision;
    class A,K process;
    class B,C,D,F1,F2,G,H,I,J default;
```

## 🚀 Modern Tech Stack

### Frontend (Cutting-Edge React 19 Stack)
- **React 19**: Latest React with enhanced hooks, concurrent features, and server components
- **TypeScript 5.7**: Strict type checking with advanced inference and path aliases (`@/*` → `./src/*`)
- **Vite 6.1**: Lightning-fast development with ESM modules, HMR, and optimized builds
- **Tailwind CSS 4.0**: Modern utility-first CSS with advanced features and PostCSS integration
- **Material-UI 6.4+**: Professional component library with modern design tokens
- **Redux Toolkit 2.6+**: State management with RTK Query for efficient data fetching
- **Build System**: Modern Vite configuration with path aliases, strict TypeScript, and optimized bundling

### Backend (Production-Ready Python Stack)
- **Flask**: Robust web framework with RESTful API design
- **PostgreSQL 16+**: Advanced relational database with enterprise-grade performance
- **pgvector Extension**: Vector embeddings for semantic search and similarity analysis
- **PRAW**: Python Reddit API Wrapper for comprehensive Reddit data access
- **BERTopic**: Advanced topic modeling with transformer-based embeddings
- **Sentence-BERT**: Semantic text embeddings for clustering and similarity
- **VADER & RoBERTa**: Multi-layered sentiment analysis pipeline
- **HDBSCAN**: Density-based clustering for topic grouping
- **Alembic**: Database migrations and schema management

### AI & Analytics Infrastructure
- **Vector Database**: PostgreSQL + pgvector for semantic search capabilities
- **NLP Pipeline**: Advanced text processing with spaCy and NLTK
- **ML Models**: BERTopic, Sentence-BERT, RoBERTa for comprehensive text analysis
- **Real-time Processing**: WebSocket integration for live data streaming
- **Data Visualization**: D3.js integration for interactive charts and analytics

## Setup with local virtual env 

### Prerequisites
- Python 3.11 (recommended), doesn't support 3.12
- Node.js 14+

