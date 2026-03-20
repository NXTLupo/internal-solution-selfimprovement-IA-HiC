# Social Analytics Engine: MCP Integration Guide
## Developer-Grade Documentation for No-Code Integration

**Version**: 3.2
**Last Updated**: February 2026
**Target Audience**: Copilot Studio No-Code Developers, Integration Engineers
**Service**: Social Research Analytics (Port 8081 Backend | Port 8502 MCP)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AI Models & Algorithms](#ai-models--algorithms)
3. [Analysis Pipeline](#analysis-pipeline)
4. [MCP Protocol Integration](#mcp-protocol-integration)
5. [Query Configuration](#query-configuration)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Data Models](#data-models)
8. [Integration Patterns](#integration-patterns)
9. [Error Handling](#error-handling)
10. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     SOCIAL ANALYTICS ENGINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   MCP Layer  │───▶│  Core Engine │───▶│   Database   │      │
│  │  (Port 8502) │    │ (Port 8081)  │    │ PostgreSQL   │      │
│  └──────────────┘    └──────────────┘    │  + pgvector  │      │
│         │                    │            └──────────────┘      │
│         │                    │                                   │
│    JSON-RPC 2.0         REST API                                │
│         │                    │                                   │
│         ▼                    ▼                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │           AI/ML Processing Pipeline                   │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │ BERTopic    │ VADER     │ Claude     │ pgvector     │      │
│  │ Topic Model │ Sentiment │ Summarizer │ RAG Engine   │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Asynchronous Job Processing**: Long-running analyses with real-time status updates
- **Multi-Model AI**: BERTopic, VADER, Claude Sonnet 4, OpenAI o3 (with gpt-4o fallback)
- **Vector Search**: pgvector with 1.5M+ embeddings capacity
- **Database Persistence**: PostgreSQL with full relational data model
- **MCP Compatible**: Standard JSON-RPC 2.0 protocol

---

## AI Models & Algorithms

### 1. Topic Modeling: BERTopic

**Algorithm**: Hierarchical Density-Based Spatial Clustering (HDBSCAN) + UMAP
**Model**: `all-mpnet-base-v2` (Sentence Transformers)
**Purpose**: Unsupervised discovery of conversation themes

**Configuration Options**:
```python
{
  "num_topics": 0,           # 0 = auto-detect optimal count
  "topic_terms": 10,          # Keywords per topic (default: 10)
  "min_topic_size": 10,       # Minimum posts to form topic
  "vectorizer": "CountVectorizer"  # Token extraction method
}
```

**Output Structure**:
```json
{
  "topics": {
    "positive": {
      "count": 15,
      "topics": [
        {
          "id": 0,
          "short_summary": "Users love the battery life improvements",
          "summary": "Full detailed summary...",
          "terms": [
            {"term": "battery", "weight": 0.85},
            {"term": "life", "weight": 0.72}
          ],
          "count": 245,
          "engagement": {
            "avg_score": 42.5,
            "total_comments": 1250
          },
          "sentiment_evidence": {
            "positive": ["Example quote 1", "Example quote 2"],
            "negative": []
          }
        }
      ]
    },
    "negative": { /* Same structure */ },
    "neutral": { /* Same structure */ }
  }
}
```

### 2. Sentiment Analysis: VADER

**Algorithm**: Valence Aware Dictionary and sEntiment Reasoner
**Optimized For**: Social media text (handles emojis, slang, capitalization)
**Output**: Compound score from -1 (negative) to +1 (positive)

**Thresholds**:
- Positive: compound ≥ 0.05
- Neutral: -0.05 < compound < 0.05
- Negative: compound ≤ -0.05

### 3. LLM Integration

| Model | Purpose | Max Tokens | Use Case | Status |
|-------|---------|-----------|----------|--------|
| **Claude Sonnet 4** (`claude-sonnet-4-20250514`) | Topic summarization, categorization, merging | 200K | Structured analysis, JSON responses, point consolidation | ✅ Active |
| **OpenAI o3** (fallback: `gpt-4o`) | Pros/cons extraction, chunked analysis | 128K | Sentiment extraction, alternative analysis | ✅ Active |
| **Gemini 2.5 Pro** | Reserved for future use | Variable | Not currently integrated | ⏸️ Available but unused |
| **Deepseek-R1** | Legacy/documented only | N/A | Not functional | ⚠️ Non-functional (stub implementation) |

**Claude Model Configuration**:
- Environment Variable: `CLAUDE4_MODEL`
- Default: `claude-sonnet-4-20250514`
- Configurable via `.env` or Docker environment
- Used for: Topic summarization, point merging, categorization, AI summaries

**OpenAI Model Configuration**:
- Environment Variable: `OPENAI_MODEL`
- Default: `o3`
- Fallback: `gpt-4o` (automatically used if primary model fails)
- Configurable via `.env` or Docker environment
- Used for: Sentiment analysis, pros/cons extraction, chunked analysis

**⚠️ CRITICAL: Model Configuration Warning**

The default `analysis_model` parameter is set to `'deepseek-r1'` in the codebase, but **this model is non-functional** (stub implementation returns empty strings).

**Required Action**: Always explicitly set `analysis_model: 'openai-4'` in your MCP tool calls:

```json
{
  "analysis_model": "openai-4",  // Use this instead of default 'deepseek-r1'
  "merge_method": "openai-4"     // Use this instead of default 'deepseek-r1'
}
```

If you use the default values without overriding, sentiment analysis will fail silently and return empty results.

**Model Implementation Details**:

The backend supports multiple LLM providers through dedicated wrapper modules:

- **`util/llm_models/claude.py`**:
  - Function: `get_claude_completion()`, `get_claude_completion_with_json()`
  - Model: `claude-sonnet-4-20250514` (200K context)
  - Max tokens: 4096 per request
  - Temperature: 1.0 (default)
  - Use case: Topic summarization, categorization, merging

- **`util/llm_models/openai.py`**:
  - Function: `get_openai_completion()`
  - Primary model: `o3` (environment variable: `OPENAI_MODEL`)
  - Fallback model: `gpt-4o` (automatic on error)
  - Use case: Sentiment analysis, pros/cons extraction
  - Retry logic: 3 attempts with exponential backoff

- **`util/llm_models/gemini.py`**:
  - Function: `get_gemini_completion()`
  - Model: `gemini-2.5-pro`
  - Temperature: 0.3 (default)
  - Status: Available but currently unused (commented out in routes)
  - Use case: Reserved for future multi-model support

- **`util/llm_models/deepseek.py`**:
  - Status: ⚠️ NON-FUNCTIONAL
  - Functions return empty strings (stub implementation)
  - Legacy code not removed from codebase

### 4. Vector Search: pgvector

**Embedding Model**: `all-mpnet-base-v2` (768 dimensions)
**Distance Metric**: Cosine similarity
**Index Type**: HNSW (Hierarchical Navigable Small World)
**Capacity**: Tested with 1.5M+ vectors

**RAG Query Process**:
1. User query → Embedding generation
2. Semantic search in pgvector (top-k similar posts)
3. Context assembly with post IDs
4. LLM synthesis with citation tracking

---

## Analysis Pipeline

### Topic Modeling Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOPIC MODELING WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

Step 1: DATA COLLECTION (Progress: 0-10%)
┌────────────────────────────────────┐
│ Reddit API → Posts + Comments      │
│ • Subreddit search                 │
│ • Keyword filtering (optional)     │
│ • Time range filtering             │
│ • Image processing (optional)      │
└────────────────────────────────────┘
         ↓
Step 2: DATABASE PERSISTENCE (Progress: 10-15%)
┌────────────────────────────────────┐
│ PostgreSQL Storage                 │
│ • Deduplicate posts                │
│ • Store metadata                   │
│ • Link comments to posts           │
└────────────────────────────────────┘
         ↓
Step 3: DOCUMENT PREPARATION (Progress: 15-50%)
┌────────────────────────────────────┐
│ Text Processing                    │
│ • Combine post + top comments      │
│ • Remove duplicates                │
│ • Build document corpus            │
└────────────────────────────────────┘
         ↓
Step 4: TOPIC EXTRACTION (Progress: 50-60%)
┌────────────────────────────────────┐
│ BERTopic Analysis                  │
│ • Generate embeddings              │
│ • UMAP dimensionality reduction    │
│ • HDBSCAN clustering               │
│ • Extract top terms per topic      │
└────────────────────────────────────┘
         ↓
Step 5: SIMILARITY ANALYSIS (Progress: 60-70%)
┌────────────────────────────────────┐
│ Topic Relationship Mapping         │
│ • Calculate cosine similarities    │
│ • Identify redundant topics        │
│ • Build topic graph                │
└────────────────────────────────────┘
         ↓
Step 6: LLM SUMMARIZATION (Progress: 70-80%)
┌────────────────────────────────────┐
│ Claude Sonnet 4 Analysis           │
│ • Select relevant documents        │
│ • Generate topic summaries         │
│ • Extract key quotes               │
└────────────────────────────────────┘
         ↓
Step 7: SENTIMENT EXTRACTION (Progress: 80-90%)
┌────────────────────────────────────┐
│ VADER + Evidence Collection        │
│ • Score each post/comment          │
│ • Extract evidence quotes          │
│ • Calculate engagement metrics     │
└────────────────────────────────────┘
         ↓
Step 8: PGVECTOR INDEXING (Progress: 90-99%)
┌────────────────────────────────────┐
│ Vector Database Storage            │
│ • Generate embeddings              │
│ • Store in pgvector                │
│ • Create HNSW index                │
└────────────────────────────────────┘
         ↓
Step 9: RESULT PERSISTENCE (Progress: 99-100%)
┌────────────────────────────────────┐
│ Final Storage                      │
│ • Save analysis to database        │
│ • Link to job record               │
│ • Mark job as completed            │
└────────────────────────────────────┘
```

### Sentiment Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                 SENTIMENT ANALYSIS WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

Step 1: REDDIT SEARCH (Progress: 0-5%)
┌────────────────────────────────────┐
│ Search & Collect                   │
│ • Execute Reddit search            │
│ • Fetch posts + comments           │
│ • Store raw data                   │
└────────────────────────────────────┘
         ↓
Step 2: TEXT PROCESSING (Progress: 5-20%)
┌────────────────────────────────────┐
│ Filtering Pipeline                 │
│ • RoBERTa filtering (sentiment)    │
│ • Cluster filtering OR ABSA        │
│ • Keyword extraction               │
│ • Remove noise                     │
└────────────────────────────────────┘
         ↓
Step 3: CHUNKING (Progress: 20-30%)
┌────────────────────────────────────┐
│ Prepare for LLM                    │
│ • Split into ~40K token chunks     │
│ • Maintain context                 │
│ • Create chunk manifests           │
└────────────────────────────────────┘
         ↓
Step 4: PARALLEL ANALYSIS (Progress: 30-80%)
┌────────────────────────────────────┐
│ Multi-Threaded LLM Processing      │
│ • Process chunks in parallel       │
│ • Extract pros/cons per chunk      │
│ • Track evidence with post IDs     │
│ • Max 3 workers by default         │
└────────────────────────────────────┘
         ↓
Step 5: ITERATIVE MERGING (Progress: 80-85%)
┌────────────────────────────────────┐
│ Claude Sonnet 4 Consolidation      │
│ • Merge similar points             │
│ • Deduplicate evidence             │
│ • Combine frequencies              │
│ • Iterative until < 5 items        │
└────────────────────────────────────┘
         ↓
Step 6: CATEGORIZATION (Progress: 85-90%)
┌────────────────────────────────────┐
│ Claude Sonnet 4 Semantic Grouping  │
│ • Group points by category         │
│ • Assign category names            │
│ • Maintain evidence links          │
└────────────────────────────────────┘
         ↓
Step 7: AI SUMMARY (Progress: 90-98%)
┌────────────────────────────────────┐
│ Executive Summary Generation       │
│ • Overall sentiment score          │
│ • Top positive insights            │
│ • Top negative concerns            │
│ • Actionable recommendations       │
└────────────────────────────────────┘
         ↓
Step 8: DATABASE SAVE (Progress: 98-100%)
┌────────────────────────────────────┐
│ Persist Results                    │
│ • Save to reddit_results table     │
│ • Link to job record               │
│ • Update job status                │
└────────────────────────────────────┘
```

---

## MCP Protocol Integration

### Connection Details

**MCP Service URL**: `http://social-mcp:8502` (internal) or `http://localhost:8502` (external)
**Protocol**: JSON-RPC 2.0
**Content-Type**: `application/json`

### JSON-RPC 2.0 Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      /* tool-specific arguments */
    }
  }
}
```

### Available MCP Tools

#### 1. `social_topic_model`

**Purpose**: Perform comprehensive topic modeling on social media data

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "data_source": {
      "type": "string",
      "description": "Subreddit name (e.g., 'technology', 'NBA')",
      "required": true
    },
    "search_query": {
      "type": "string",
      "description": "Keyword to filter posts (e.g., 'AI chatbots')",
      "required": true
    },
    "num_topics": {
      "type": "integer",
      "description": "Number of topics (0 = auto-detect)",
      "default": 0
    },
    "topic_terms": {
      "type": "integer",
      "description": "Keywords per topic",
      "default": 10
    }
  }
}
```

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "social_topic_model",
    "arguments": {
      "data_source": "technology",
      "search_query": "artificial intelligence",
      "num_topics": 15,
      "topic_terms": 10
    }
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "success"
  }
}
```

#### 2. `social_get_topic_status`

**Purpose**: Check job progress with real-time updates

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "job_id": {
      "type": "string",
      "description": "Job ID from topic_model call",
      "required": true
    }
  }
}
```

**Response Statuses**:
- `pending`: Job queued but not started
- `processing`: Job in progress (check `progress` field for %)
- `completed`: Job finished successfully
- `failed`: Job encountered an error
- `cancelled`: Job was cancelled by user

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-002",
  "result": {
    "status": "processing",
    "progress": 65,
    "message": "Generating summaries and metrics"
  }
}
```

#### 3. `social_get_topic_results`

**Purpose**: Retrieve completed topic modeling results

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "job_id": {
      "type": "string",
      "required": true
    }
  }
}
```

**Response Structure**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-003",
  "result": {
    "topics": [
      {
        "id": 0,
        "name": "Battery Life Improvements",
        "summary": "Users are discussing...",
        "keywords": ["battery", "life", "improvement", "charge"],
        "score": 0.85,
        "post_count": 245,
        "engagement": {
          "avg_score": 42.5,
          "total_comments": 1250,
          "avg_comments_per_post": 5.1
        },
        "sentiment_evidence": {
          "positive": ["Really impressed with the battery", "Lasts all day"],
          "negative": ["Still drains faster than expected"]
        }
      }
    ],
    "visualization_url": "http://localhost:3000/topics/550e8400-e29b-41d4-a716-446655440000",
    "analysis_result": {
      /* Full nested result object */
    }
  }
}
```

#### 4. `social_sentiment_analysis`

**Purpose**: Analyze sentiment with pros/cons extraction

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "search_query": {
      "type": "string",
      "description": "Topic to analyze",
      "required": true
    },
    "data_source": {
      "type": "string",
      "description": "Subreddit name",
      "required": true
    },
    "sentiment_type": {
      "type": "string",
      "description": "Algorithm: 'roberta', 'vader'",
      "default": "roberta"
    }
  }
}
```

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-004",
  "method": "tools/call",
  "params": {
    "name": "social_sentiment_analysis",
    "arguments": {
      "search_query": "Tesla Model 3",
      "data_source": "teslamotors",
      "sentiment_type": "roberta"
    }
  }
}
```

#### 5. `social_get_sentiment_results`

**Purpose**: Get completed sentiment analysis

**Response Structure**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-005",
  "result": {
    "sentiment": {
      "positive_aspects": [
        {
          "category": "Performance",
          "points": [
            {
              "point": "Acceleration is incredibly fast",
              "frequency": 42,
              "evidence": {
                "post 1": ["Quote from post"],
                "post 5": ["Another quote"]
              }
            }
          ]
        }
      ],
      "negative_aspects": [
        {
          "category": "Build Quality",
          "points": [
            {
              "point": "Panel gaps are inconsistent",
              "frequency": 28,
              "evidence": {
                "post 3": ["Evidence quote"]
              }
            }
          ]
        }
      ],
      "neutral_aspects": [],
      "overall_score": 0.67
    },
    "visualization_url": "http://localhost:3000/sentiment/abc123"
  }
}
```

#### 6. `social_search`

**Purpose**: Search and retrieve posts from database

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query",
      "required": true
    },
    "data_source": {
      "type": "string",
      "description": "Subreddit",
      "required": true
    },
    "limit": {
      "type": "integer",
      "description": "Max results (1-100)",
      "default": 20
    }
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "req-006",
  "result": {
    "search_id": "search-uuid",
    "results": [
      {
        "id": "abc123",
        "title": "Post title",
        "text": "Post content...",
        "source": "r/subreddit",
        "created_at": "2026-02-10T14:30:00Z",
        "score": 125
      }
    ],
    "total_count": 42
  }
}
```

---

## Query Configuration

### Topic Modeling Configuration

| Parameter | Type | Default | Range/Options | Description |
|-----------|------|---------|---------------|-------------|
| `subreddit` | string | required | Any valid subreddit | Target subreddit name |
| `keyword` | string | optional | - | Filter posts containing keyword |
| `num_posts` | integer | 800 | 50-5000 | Number of posts to fetch |
| `max_comments` | integer | 3 | 0-10 | Top comments per post |
| `num_topics` | integer | 0 | 0-50 | 0 = auto-detect optimal |
| `topic_terms` | integer | 10 | 5-20 | Keywords per topic |
| `sort` | string | 'relevance' | 'relevance', 'hot', 'new', 'top' | Reddit sort method |
| `startDate` | string | optional | ISO 8601 | Filter start date |
| `endDate` | string | optional | ISO 8601 | Filter end date |
| `index_in_pgvector` | boolean | true | true/false | Enable vector search |
| `process_images` | boolean | true | true/false | Extract text from images |
| `summary_limit` | integer | null | 1-50 | Limit topics to summarize (debug) |
| `topics_limit` | integer | null | 1-50 | Limit topics to analyze (debug) |

### Sentiment Analysis Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `subreddit` | string | required | Target subreddit |
| `query` | string | required | Search query |
| `limit` | integer | 5 | Number of posts (1-100) |
| `sort` | string | 'relevance' | 'relevance', 'hot', 'new', 'top', 'controversial' |
| `time` | string | 'all' | 'hour', 'day', 'week', 'month', 'year', 'all' |
| `application_name` | string | query | Product/app name for context |
| `filter_type` | string | 'cluster' | 'cluster', 'absa' |
| `keyword` | string | query | Keyword for filtering |
| `merge_method` | string | ⚠️ 'deepseek-r1' | **Use 'openai-4'** (default non-functional) |
| `chunk_size` | integer | 40000 | Characters per chunk (20K-60K) |
| `analysis_model` | string | ⚠️ 'deepseek-r1' | **Use 'openai-4'** (default non-functional) |
| `max_workers` | integer | 3 | Parallel processing threads (1-8) |
| `skip_filtering` | boolean | true | Skip filtering steps |

### Time Filter Options (Reddit API)

```python
TIME_FILTERS = {
  "hour": "Past hour",
  "day": "Past 24 hours",
  "week": "Past week",
  "month": "Past month",
  "year": "Past year",
  "all": "All time"
}
```

### Sort Methods (Reddit API)

```python
SORT_METHODS = {
  "relevance": "Most relevant to query",
  "hot": "Currently trending",
  "new": "Most recent",
  "top": "Highest scored",
  "controversial": "Most debated"
}
```

---

## API Endpoints Reference

### Direct REST API (Port 8081)

#### Topic Modeling Endpoints

**POST** `/api/topic-model/analyze-async`

```http
POST http://social-research-backend:8081/api/topic-model/analyze-async
Content-Type: application/json

{
  "subreddit": "technology",
  "num_posts": 800,
  "max_comments": 3,
  "index_in_pgvector": true,
  "sort": "relevance",
  "user_id": "user-123",
  "project_id": "project-456",
  "keyword": "AI",
  "startDate": "2026-01-01",
  "endDate": "2026-02-01",
  "process_images": true
}

Response (202 Accepted):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "project-456",
  "status": "pending",
  "message": "Topic modeling job submitted and queued for processing"
}
```

**GET** `/api/topic-model/job-status/{job_id}`

```http
GET http://social-research-backend:8081/api/topic-model/job-status/550e8400-e29b-41d4-a716-446655440000

Response (200 OK):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Generating summaries and metrics",
  "progress": 70,
  "created_at": "2026-02-12T10:00:00Z",
  "updated_at": "2026-02-12T10:05:00Z",

  // When status = "completed":
  "analysis_id": "analysis-789",
  "result": {
    /* Full analysis data */
  }
}
```

**DELETE** `/api/topic-model/job/{job_id}`

```http
DELETE http://social-research-backend:8081/api/topic-model/job/550e8400-e29b-41d4-a716-446655440000

Response (200 OK):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled",
  "message": "Job was cancelled by user request"
}
```

**DELETE** `/api/topic-model/project/{project_id}/cancel`

Cancel all jobs for a project:

```http
DELETE http://social-research-backend:8081/api/topic-model/project/project-456/cancel

Response:
{
  "project_id": "project-456",
  "status": "cancelled",
  "message": "3 jobs were cancelled for project project-456",
  "cancelled_job_count": 3,
  "cancelled_job_ids": ["job-1", "job-2", "job-3"]
}
```

**GET** `/api/topic-model/jobs/user/{user_id}`

Get all jobs for a user:

```http
GET http://social-research-backend:8081/api/topic-model/jobs/user/user-123?limit=20

Response:
[
  {
    "job_id": "job-1",
    "status": "completed",
    "message": "Topic modeling completed successfully",
    "progress": 100,
    "created_at": "2026-02-12T09:00:00Z",
    "updated_at": "2026-02-12T09:15:00Z",
    "parameters": {
      "subreddit": "technology",
      "num_posts": 800
    },
    "analysis_id": "analysis-123"
  }
]
```

#### Sentiment Analysis Endpoints

**POST** `/api/llm-analyzer/analyze-sentiment`

```http
POST http://social-research-backend:8081/api/llm-analyzer/analyze-sentiment
Content-Type: application/json

{
  "subreddit": "teslamotors",
  "query": "Tesla Model 3",
  "limit": 10,
  "sort": "relevance",
  "time": "month",
  "application_name": "Tesla Model 3",
  "filter_type": "cluster",
  "keyword": "Model 3",
  "merge_method": "openai-4",        // ✅ Use openai-4, NOT deepseek-r1
  "chunk_size": 40000,
  "analysis_model": "openai-4",      // ✅ Use openai-4, NOT deepseek-r1
  "max_workers": 3,
  "skip_filtering": true,
  "user_id": "user-123",
  "project_id": "project-789"
}

Response (202 Accepted):
{
  "job_id": "sentiment-job-456",
  "status": "pending",
  "message": "Job submitted and queued for processing"
}
```

**GET** `/api/llm-analyzer/job-status/{job_id}`

Same structure as topic model job status.

**POST** `/api/llm-analyzer/search`

```http
POST http://social-research-backend:8081/api/llm-analyzer/search
Content-Type: application/json

{
  "subreddit": "technology",
  "query": "artificial intelligence",
  "limit": 20,
  "sort": "relevance",
  "time": "week"
}

Response (200 OK):
{
  "search_id": "search-uuid-123",
  "subreddit": "technology",
  "query": "artificial intelligence",
  "results": [
    {
      "id": "post-abc123",
      "title": "New AI breakthrough...",
      "selftext": "Content...",
      "score": 1250,
      "num_comments": 245,
      "url": "https://reddit.com/...",
      "created_utc": 1707745200,
      "author": "username",
      "comments": [
        {
          "id": "comment-xyz",
          "body": "Comment text...",
          "score": 42,
          "author": "commenter"
        }
      ]
    }
  ],
  "count": 20
}
```

#### Health Check

**GET** `/api/health`

```http
GET http://social-research-backend:8081/api/health

Response (200 OK):
{
  "status": "healthy",
  "service": "social-research-backend"
}
```

---

## Data Models

### Database Schema

#### Users Table

```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,        -- UUID
  username VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Reddit Jobs Table

```sql
CREATE TABLE reddit_jobs (
  id VARCHAR PRIMARY KEY,                    -- Job UUID
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id VARCHAR REFERENCES reddit_results(id) ON DELETE SET NULL,

  status VARCHAR NOT NULL,                   -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  message VARCHAR,
  progress INTEGER,                          -- 0-100
  error TEXT,

  parameters JSON,                           -- Job configuration

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Reddit Analysis Results Table

```sql
CREATE TABLE reddit_results (
  id VARCHAR PRIMARY KEY,                    -- Analysis UUID
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR NOT NULL,                     -- 'sentiment' or 'topic_model'

  subreddit VARCHAR,
  topic VARCHAR,
  post_count INTEGER,
  sort_by VARCHAR,
  time_period VARCHAR,
  start_date VARCHAR,
  end_date VARCHAR,

  data JSON NOT NULL,                        -- Full analysis result
  summary JSON,                              -- AI-generated summary

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Reddit Posts Table

```sql
CREATE TABLE reddit_posts (
  id VARCHAR PRIMARY KEY,                    -- Reddit post ID
  search_id VARCHAR REFERENCES reddit_searches(id) ON DELETE CASCADE,

  subreddit VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  content TEXT,
  score INTEGER,
  created_utc FLOAT,
  url VARCHAR,
  permalink VARCHAR,
  num_comments INTEGER,
  author VARCHAR
);
```

#### Reddit Comments Table

```sql
CREATE TABLE reddit_comments (
  id VARCHAR PRIMARY KEY,                    -- Reddit comment ID
  post_id VARCHAR REFERENCES reddit_posts(id) ON DELETE CASCADE,
  parent_comment_id VARCHAR REFERENCES reddit_comments(id) ON DELETE CASCADE,

  body TEXT,
  score INTEGER,
  created_utc FLOAT,
  author VARCHAR
);
```

### pgvector Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR REFERENCES reddit_posts(id) ON DELETE CASCADE,
  subreddit VARCHAR NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),                     -- all-mpnet-base-v2 dimension
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index for fast similarity search
CREATE INDEX ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## Integration Patterns

### Pattern 1: Basic Topic Modeling

```javascript
// Copilot Studio Flow Example

async function analyzeSubredditTopics(subreddit, keyword) {
  // Step 1: Submit analysis job
  const submitResponse = await callMCP({
    method: "tools/call",
    params: {
      name: "social_topic_model",
      arguments: {
        data_source: subreddit,
        search_query: keyword,
        num_topics: 0,  // Auto-detect
        topic_terms: 10
      }
    }
  });

  const jobId = submitResponse.result.job_id;

  // Step 2: Poll for completion
  let status = "processing";
  while (status === "processing" || status === "pending") {
    await sleep(10000);  // Wait 10 seconds

    const statusResponse = await callMCP({
      method: "tools/call",
      params: {
        name: "social_get_topic_status",
        arguments: { job_id: jobId }
      }
    });

    status = statusResponse.result.status;
    const progress = statusResponse.result.progress;

    // Update user: "Analysis {progress}% complete"
    updateProgress(progress);
  }

  // Step 3: Get results
  if (status === "completed") {
    const resultsResponse = await callMCP({
      method: "tools/call",
      params: {
        name: "social_get_topic_results",
        arguments: { job_id: jobId }
      }
    });

    return resultsResponse.result.topics;
  } else {
    throw new Error("Analysis failed");
  }
}
```

### Pattern 2: Sentiment Analysis with User Interaction

```javascript
async function analyzeSentiment(product, subreddit) {
  // Step 1: Start analysis
  const response = await callMCP({
    method: "tools/call",
    params: {
      name: "social_sentiment_analysis",
      arguments: {
        search_query: product,
        data_source: subreddit,
        sentiment_type: "roberta"
      }
    }
  });

  const jobId = response.result.job_id;

  // Step 2: Poll with user updates
  let completed = false;
  while (!completed) {
    await sleep(15000);  // Poll every 15 seconds

    const status = await getMCPJobStatus(jobId);

    // Provide detailed updates to user
    sendUserMessage(`🔄 ${status.message} (${status.progress}% complete)`);

    if (status.status === "completed") {
      completed = true;

      // Step 3: Retrieve and format results
      const results = await getMCPSentimentResults(jobId);

      // Extract insights
      const positives = results.sentiment.positive_aspects;
      const negatives = results.sentiment.negative_aspects;
      const score = results.sentiment.overall_score;

      // Format for user
      return formatSentimentReport({
        product,
        score,
        positives,
        negatives,
        visualizationUrl: results.visualization_url
      });
    } else if (status.status === "failed") {
      throw new Error(status.error || "Analysis failed");
    }
  }
}
```

### Pattern 3: Contextual RAG Query

```javascript
async function askQuestion(question, subreddit) {
  // Step 1: Search relevant posts
  const searchResponse = await callMCP({
    method: "tools/call",
    params: {
      name: "social_search",
      arguments: {
        query: question,
        data_source: subreddit,
        limit: 50
      }
    }
  });

  const searchId = searchResponse.result.search_id;

  // Step 2: The backend automatically uses pgvector for semantic search
  // Results are already ranked by relevance

  // Step 3: Use results to answer question
  // (Backend handles RAG internally if integrated with LLM endpoints)

  return {
    answer: "Synthesized answer from posts",
    sources: searchResponse.result.results,
    confidence: 0.85
  };
}
```

### Pattern 4: Multi-Stage Analysis Workflow

```javascript
async function comprehensiveAnalysis(brand, competitors) {
  const results = {
    brand: null,
    competitors: []
  };

  // Parallel topic modeling for brand and competitors
  const jobs = [
    { name: brand, subreddit: getBrandSubreddit(brand) },
    ...competitors.map(c => ({ name: c, subreddit: getBrandSubreddit(c) }))
  ];

  // Submit all jobs
  const jobIds = await Promise.all(
    jobs.map(job => submitTopicModelingJob(job.name, job.subreddit))
  );

  // Wait for all completions
  const analyses = await Promise.all(
    jobIds.map(jobId => waitForCompletion(jobId))
  );

  // Compare results
  results.brand = analyses[0];
  results.competitors = analyses.slice(1);

  // Generate competitive insights
  return generateCompetitiveReport(results);
}
```

---

## Error Handling

### MCP Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `-32700` | Parse error | Check JSON syntax |
| `-32600` | Invalid request | Verify JSON-RPC 2.0 format |
| `-32601` | Method not found | Check tool name |
| `-32602` | Invalid params | Verify argument schema |
| `-32603` | Internal error | Check backend logs |

### Job Status Errors

```json
{
  "status": "failed",
  "error": "Reddit API rate limit exceeded",
  "message": "Analysis failed"
}
```

**Common Error Scenarios**:

1. **Rate Limiting**: Reddit API limits (600 requests/10 minutes)
   - Solution: Reduce `num_posts` or add delays

2. **Timeout**: Job exceeds maximum processing time
   - Solution: Use smaller dataset or increase timeout

3. **Invalid Subreddit**: Subreddit doesn't exist or is private
   - Solution: Validate subreddit before submission

4. **Insufficient Data**: Not enough posts for meaningful analysis
   - Solution: Broaden search or use different time filter

### Retry Strategy

```javascript
async function robustMCPCall(toolName, args, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await callMCP({
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      });

      return response.result;

    } catch (error) {
      if (error.code === -32603 && attempt < maxRetries - 1) {
        // Internal error, retry with exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

---

## Performance Optimization

### Best Practices

1. **Job Polling Frequency**:
   - Topic Modeling: Poll every 15-30 seconds
   - Sentiment Analysis: Poll every 10-15 seconds
   - Don't poll more than once per 5 seconds

2. **Chunk Size Tuning**:
   - Default 40K characters works for most cases
   - Increase to 60K for faster processing (fewer chunks)
   - Decrease to 20K if hitting LLM context limits

3. **Parallel Processing**:
   - Default `max_workers: 3` balances speed vs. cost
   - Increase to 5-8 for faster processing (higher API cost)
   - Decrease to 1 for cost-sensitive applications

4. **Data Volume**:
   - 500-1000 posts: Optimal for most analyses
   - 100-300 posts: Good for quick insights
   - 1000+ posts: May take 10-20 minutes

5. **Caching Strategy**:
   - Results are automatically stored in database
   - Retrieve by `analysis_id` for repeat access
   - pgvector embeddings persist for semantic search

### Performance Metrics

| Operation | Typical Time | Factors |
|-----------|--------------|---------|
| Topic Modeling (800 posts) | 8-15 minutes | Post count, comment depth, LLM speed |
| Sentiment Analysis (10 posts) | 2-5 minutes | Chunk count, LLM model, filtering |
| Search Query | <2 seconds | Database size, pgvector index |
| Job Status Check | <100ms | Database query only |

---

## Appendix A: Complete Response Examples

### Topic Modeling Complete Response

```json
{
  "total_documents": 2450,
  "total_topics": 15,
  "topics": {
    "positive": {
      "count": 6,
      "topics": [
        {
          "id": 0,
          "short_summary": "Users praise the improved battery life in recent updates",
          "summary": "The community is very positive about battery performance improvements...",
          "terms": [
            {"term": "battery", "weight": 0.89},
            {"term": "life", "weight": 0.78},
            {"term": "improved", "weight": 0.71},
            {"term": "update", "weight": 0.65}
          ],
          "count": 245,
          "score": 0.85,
          "engagement": {
            "avg_score": 42.5,
            "total_comments": 1250,
            "avg_comments_per_post": 5.1,
            "total_upvotes": 10420
          },
          "sentiment_evidence": {
            "positive": [
              "Battery life has been incredible since the update",
              "Finally getting a full day of use!",
              "The optimization really works"
            ],
            "negative": [
              "Still not as good as advertised"
            ]
          }
        }
      ]
    },
    "negative": {
      "count": 5,
      "topics": [ /* Similar structure */ ]
    },
    "neutral": {
      "count": 4,
      "topics": [ /* Similar structure */ ]
    }
  },
  "topic_similarities": {
    "0": {"1": 0.45, "2": 0.32},
    "1": {"0": 0.45, "3": 0.58}
  },
  "engagement_metrics": {
    "total_posts": 800,
    "total_comments": 3200,
    "avg_score": 38.5,
    "top_authors": [
      {"author": "user1", "post_count": 12, "avg_score": 125.5}
    ]
  },
  "keyword": "battery life",
  "pgvector_indexing": {
    "status": "success",
    "documents_indexed": 2450,
    "timestamp": "2026-02-12T10:15:00Z"
  }
}
```

### Sentiment Analysis Complete Response

```json
{
  "merged_result": {
    "positive": [
      {
        "category": "Performance",
        "points": [
          {
            "point": "Acceleration is incredibly fast and responsive",
            "frequency": 42,
            "evidence": {
              "post 1": ["The acceleration is insane!", "0-60 in under 4 seconds"],
              "post 5": ["Sports car performance at this price"],
              "post 12": ["Launch mode never gets old"]
            }
          },
          {
            "point": "Handling is precise and confidence-inspiring",
            "frequency": 28,
            "evidence": {
              "post 3": ["Corners like it's on rails"],
              "post 7": ["Best handling in its class"]
            }
          }
        ]
      },
      {
        "category": "Technology",
        "points": [
          {
            "point": "Autopilot significantly reduces highway fatigue",
            "frequency": 35,
            "evidence": {
              "post 2": ["Game changer for long drives"],
              "post 8": ["Makes commuting so much easier"]
            }
          }
        ]
      }
    ],
    "negative": [
      {
        "category": "Build Quality",
        "points": [
          {
            "point": "Panel gaps are inconsistent and noticeable",
            "frequency": 28,
            "evidence": {
              "post 4": ["Had to take it back for panel alignment"],
              "post 9": ["Quality control needs improvement"]
            }
          }
        ]
      }
    ]
  },
  "formatted_data": {
    "results": [ /* Original Reddit posts with metadata */ ]
  },
  "ai_summary": {
    "summary": "Overall sentiment is positive (68%) with strong praise for performance and technology, but concerns about build quality persist.",
    "topPositive": "Users particularly appreciate the incredible acceleration and responsive handling, with many noting it rivals sports cars at a fraction of the price.",
    "topNegative": "The main concerns relate to build quality inconsistencies, particularly panel gaps that require dealer visits to correct.",
    "recommendations": [
      "Address quality control in manufacturing to reduce panel gap issues",
      "Highlight performance advantages in marketing to leverage strongest positive sentiment",
      "Continue monitoring build quality feedback and implement preventive measures"
    ]
  },
  "analysis_id": "analysis-uuid-789"
}
```

---

## Appendix B: Copilot Studio Integration Checklist

### Prerequisites

- [x] MCP service accessible at `http://social-mcp:8502`
- [x] API credentials configured (if required)
- [x] Network connectivity between Copilot Studio and NXT Humans platform
- [x] Understanding of JSON-RPC 2.0 protocol

### Integration Steps

1. **Configure Connection**
   - Add MCP service endpoint to Copilot Studio
   - Set timeout to 180 seconds (3 minutes) for initial requests
   - Configure retry policy (3 attempts with exponential backoff)

2. **Implement Tool Discovery**
   ```json
   {
     "jsonrpc": "2.0",
     "id": "discover",
     "method": "tools/list",
     "params": {}
   }
   ```

3. **Create Conversation Flows**
   - Topic Analysis Flow
   - Sentiment Analysis Flow
   - Q&A Flow (using search)

4. **Add Progress Tracking**
   - Implement polling mechanism
   - Display progress updates to user
   - Handle cancellation requests

5. **Error Handling**
   - Catch JSON-RPC errors
   - Handle timeout scenarios
   - Provide user-friendly error messages

6. **Testing Checklist**
   - [x] Submit topic modeling job
   - [x] Poll for status updates
   - [x] Retrieve completed results
   - [x] Handle failed jobs
   - [x] Cancel running jobs
   - [x] Submit sentiment analysis
   - [x] Perform search queries

---

## Appendix C: Troubleshooting Guide

### Issue: Jobs stuck in "processing" state

**Symptoms**: Job progress stops updating
**Possible Causes**:
- Backend process crashed
- Database connection lost
- Reddit API rate limit

**Solution**:
```bash
# Check backend logs
docker compose -f docker-compose-all.yml logs -f social-research-backend

# Restart backend
docker compose -f docker-compose-all.yml restart social-research-backend

# Cancel stuck job
DELETE /api/topic-model/job/{job_id}
```

### Issue: "Rate limit exceeded" error

**Symptoms**: Job fails with rate limit message
**Solution**:
- Reduce `num_posts` parameter
- Spread requests over time
- Use different Reddit account

### Issue: No results returned

**Symptoms**: Empty topics or sentiment lists
**Possible Causes**:
- Insufficient data (< 50 posts)
- Keyword too specific
- Subreddit has little activity

**Solution**:
- Broaden search query
- Remove `keyword` filter
- Try different subreddit
- Adjust time filter to "all"

### Issue: Sentiment analysis returns empty results

**Symptoms**: Analysis completes but returns empty pros/cons/themes
**Cause**: Using default `analysis_model: 'deepseek-r1'` which is non-functional (stub implementation)

**Solution**:
Always explicitly set model parameters in your requests:
```json
{
  "analysis_model": "openai-4",
  "merge_method": "openai-4"
}
```

**Explanation**: The codebase has `deepseek-r1` as the default value, but the implementation only contains stub functions that return empty strings. You MUST override these defaults to use the functional `openai-4` model.

**Verification**:
```bash
# Check backend logs for model usage
docker compose -f docker-compose-all.yml logs -f social-research-backend | grep "model:"

# You should see: "Using model: o3" or "Using model: gpt-4o"
# If you see no model logs, deepseek stubs are being called
```

### Issue: MCP connection timeout

**Symptoms**: Request hangs, no response
**Solution**:
```javascript
// Implement timeout in your HTTP client
const response = await fetch(mcpUrl, {
  method: 'POST',
  body: JSON.stringify(request),
  timeout: 30000  // 30 seconds
});
```

---

## Support & Resources

**Documentation**: [NXT_HUMANS_TRAINING_MANUALS.md](NXT_HUMANS_TRAINING_MANUALS.md)
**Health Check**: `http://localhost:8081/api/health`
**Frontend UI**: `http://localhost:3000`
**MCP Service**: `http://localhost:8502`

---

**End of Documentation**

*This guide is maintained by the NXT Humans Intelligence Augmentation Suite team. For updates and corrections, please refer to the repository's latest version.*
