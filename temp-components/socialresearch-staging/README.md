# Social Research Analysis Tool

This repository provides two  tools designed for Reddit-based social research:

## 🔍 Topic Modeling Tool

This tool helps users explore the **key themes** occurring in a subreddit, without a predefined topic.

- **Input**: Subreddit name.
- **Output**:
  - Topics with sentiment scores.
  - Interactive theme maps.
  - RAG-powered AI chat

## 🧠 Social LLM Analyzer

This tool helps users analyze sentiment around a **specific topic within a subreddit**, also provides tracable data to understand the nuances and emotional tone of discussions

- **Input**: Subreddit name and a defined topic.
- **Output**:
  - Positive and negative aspects.
  - Summary and suggestions.
  - Visualizations.


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
   docker compose -f docker-compose.dev.yml build
   ```
   > **Note** ./docker-compose.dev.yml will be used for local development
   
7. Configure environment variables (ask developer for the .env file)
   
8. **Run the Containers**
   
   For local development (recommended):
   ```sh
   docker compose -f docker-compose.dev.yml up
   ```

   
   The application's frontend will be available at http://localhost:3000, backend at http://localhost:8081/, http://localhost:8081/health is available for checking

## Potential Errors and Solutions

| Error | Description | Solution |
|-------|-------------|----------|
| Error exit code 139 with seg fault | Container crashes with segmentation fault | Check memory allocation with `docker stats`. If total memory is less than 8 GB, increase memory allocation in Docker configuration. For Mac users, see [this StackOverflow thread](https://stackoverflow.com/questions/44533319/how-to-assign-more-memory-to-docker-container). |
| Azure login failure | `.azure` directory missing | Verify the `.azure` directory exists after running `palm az-login`. For Windows users, ensure the `AZURE_AUTH_LOCATION` is correctly set in your `.env` file. |
| Network connection issues | Docker network not created | Run `docker network create nxt-humans` before starting containers. |
| Docker daemon not running | Error: "this error may indicate that the docker daemon is not running" or "open //./pipe/docker_engine: The system cannot find the file specified" | Ensure Docker Desktop is running or start the Docker service. Verify with `docker info` or `docker version`. |
|Front end type errors|| CD to ./frontend and use `npx eslint ./src`

   
## Deployment option 2: Deploy it on Azure with Github Action

The application is deployed to Azure Container Apps using two separate GitHub Actions workflows:

### CI/CD Pipeline Overview

1. **Separate Workflows**:
   - `.github/workflows/frontend-deploy.yml` - Builds and deploys the frontend container
   - `.github/workflows/backend-deploy.yml` - Builds and deploys the backend container

2. **Build Process**:
   - Workflows are triggered manually via `workflow_dispatch`, or main branch is updated
   - Containers are built using `frontend.compose.deploy.yml` and `backend.compose.deploy.yml`

3. **Deployment Process**:
   - Built containers are pushed to Azure Container Registry (ACR)
   - The containers are then deployed to Azure Container Apps using the configuration in:
     - `frontend-containerapp.yaml` for the frontend
     - `backend-containerapp.yaml` for the backend

4. **Environment Configuration**:
   - All secrets must be added to GitHub repository secrets, please see .env.example for the required secrets
   - Both applications share Container App Environment: `social-research-env`

### How Secrets Flow from Repository to Production

1. **Repository Secrets**: Secrets are stored in GitHub repository settings, or you can run `gh secret list` to check available environment variables set up on repository level secrets
2. **GitHub Actions Access**: Workflows access these secrets using `${{ secrets.SECRET_NAME }}` syntax
3. **Azure Authentication**: Workflows use Azure service principal secrets to authenticate with Azure
4. **Container App Configuration**: During deployment, secrets are:
   - Injected as environment variables into the container apps
   - Replaced in the `*-containerapp.yaml` configuration files (Extra caution: order matters, e.g. first replace REDDIT_CLIENT_ID before CLIENT_ID, otherwise the REDDIT_CLIENT_ID will be partially replaced when CLIENT_ID is replaced)
   - Made available to the running application containers
5. **Runtime Access**: Applications access these as standard environment variables

Example flow: `REDDIT_CLIENT_ID` → GitHub Secret → GitHub Actions → Azure Container Apps → Application Environment Variable

To deploy: Add required secrets to GitHub repository settings or CLI, then trigger workflows from the GitHub Actions tab.

## Deployment option 3: Local Deployment with Python virtual environment

> **Note**: This deployment option is **not recommended**. We prefer using **Option 1 (Docker deployment)** for local development. This section may lack details and is provided for reference only.
### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

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


6. Database Setup (PostgreSQL with pgvector on macOS)

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
    E --> G
    G --> H
    H --> I
    I --> J
    J --> L
    L --> M

    classDef default fill:#2d3748,stroke:#4299e1,stroke-width:2px,color:#e2e8f0;
    classDef process fill:#2d3748,stroke:#48bb78,stroke-width:2px,color:#e2e8f0;
    classDef ml fill:#553c9a,stroke:#9f7aea,stroke-width:2px,color:#e2e8f0;
    classDef llm fill:#744210,stroke:#d69e2e,stroke-width:2px,color:#e2e8f0;
    
    class A,M process;
    class D,E,G,I,J ml;
    class H llm;
    class B,C,L default;
```

## Topic Modeling Pipeline
ML pipeline for topic discovery and analysis:

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'fontFamily': 'arial', 'fontSize': '13px' }}}%%
graph TD
    A[Start]
    B[Reddit Data Fetch and Text Preprocessing]
    C[Document Vectorization]
    D[sentence-bert Embeddings]
    E[UMAP Reduction]
    G[HDBSCAN Clustering]
    H[Topic Summarization with llm api]
    I[Sentiment Analysis]
    J[Topic Similarity]
    L[PGVector Indexing]
    M[Results Storage]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> G
    G --> H
    H --> I
    I --> J
    J --> L
    L --> M

    classDef default fill:#2d3748,stroke:#4299e1,stroke-width:2px,color:#e2e8f0;
    classDef process fill:#2d3748,stroke:#48bb78,stroke-width:2px,color:#e2e8f0;
    classDef ml fill:#553c9a,stroke:#9f7aea,stroke-width:2px,color:#e2e8f0;
    classDef llm fill:#744210,stroke:#d69e2e,stroke-width:2px,color:#e2e8f0;
    
    class A,M process;
    class D,E,G,I,J ml;
    class H llm;
    class B,C,L default;
```
