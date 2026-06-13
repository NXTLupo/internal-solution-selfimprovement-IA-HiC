---
id: social-intelligence/topic-modeling.md
title: "Topic Modeling & Semantic Analysis"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [social-research-backend, api_topic_model.py]
confidence: high
status: active
tags: [topic-modeling, bertopic, semantic, pgvector, embeddings, clustering]
evidence_count: 0
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "social-intelligence/topic-modeling.md#c0"
    char_span: [0, 1793]
    sentence_count: 10
    key_terms: [topic, documents, using, pipeline, clustering, c-tf-idf, modeling, hdbscan]
    section: BERTopic Pipeline
    token_count: 360
  - id: "social-intelligence/topic-modeling.md#c1"
    char_span: [1795, 3946]
    sentence_count: 1
    key_terms: [topic, posts, documents, subreddit, number, none, per, embeddings]
    section: BERTopic Pipeline
    token_count: 483
  - id: "social-intelligence/topic-modeling.md#c2"
    char_span: [3948, 5070]
    sentence_count: 1
    key_terms: [topic-model, int, api, topics, count, returns, cancel, sentiment]
    section: BERTopic Pipeline
    token_count: 292
  - id: "social-intelligence/topic-modeling.md#c3"
    char_span: [5097, 7179]
    sentence_count: 7
    key_terms: [subreddit, post, comment, models, content, returns, stores, vector]
    section: pgvector Integration
    token_count: 470
  - id: "social-intelligence/topic-modeling.md#c4"
    char_span: [7229, 8555]
    sentence_count: 2
    key_terms: [search, openai-compatible, via, context, claude, prompt, api, llm]
    section: RAG (Retrieval-Augmented Generation) System
    token_count: 324
  - id: "social-intelligence/topic-modeling.md#c5"
    char_span: [8584, 9273]
    sentence_count: 1
    key_terms: [wiki, theme, topic, embeddings, similarity, identify, provides, semantic]
    section: Wiki Integration Rules
    token_count: 116
  - id: "social-intelligence/topic-modeling.md#c6"
    char_span: [9296, 9676]
    sentence_count: 1
    key_terms: [social-intelligence, competitive, frameworks, analysis, social, topic, sentiment-pipeline, credibility-tiers]
    section: Cross-References
    token_count: 86
---
# Topic Modeling & Semantic Analysis

This page documents the BERTopic-powered topic modeling pipeline and the pgvector-backed semantic search system that together provide thematic analysis and retrieval-augmented generation (RAG) over indexed social data.

## BERTopic Pipeline

The topic modeling pipeline is implemented in `util/topic_model/BertTopic.py` and orchestrated by `app/routes/api_topic_model.py`. It processes social media posts into coherent topic clusters using a four-stage machine learning pipeline.

### Pipeline Stages

**1. Document Embedding**

All input documents (post title + selftext + comments concatenated) are encoded into 768-dimensional dense vectors using `all-mpnet-base-v2`. This model is shared across embedding, clustering, and merging stages.

**2. UMAP Dimensionality Reduction**

High-dimensional embeddings are projected into lower-dimensional space using UMAP (Uniform Manifold Approximation and Projection), preserving local neighborhood structure while making data tractable for clustering.

**3. HDBSCAN Clustering**

Reduced embeddings are clustered using HDBSCAN (`hdbscan==0.8.38.post1`). Key properties: density-based (discovers clusters of varying shapes), noise-aware (outlier documents assigned to cluster -1), and no fixed k (topic count is determined automatically from the data).

**4. c-TF-IDF Topic Representation**

BERTopic extracts representative keywords per cluster using class-based TF-IDF (c-TF-IDF). A `CountVectorizer` tokenizes clustered documents, and c-TF-IDF scores identify the most distinctive terms. Redundant keywords are filtered via `filter_redundant_keywords()` (max 10 terms per topic).

### Processing Flow

The async endpoint `/api/topic-model/analyze-async` executes the following steps within a background thread:

1. **Fetch Reddit posts** -- via `fetch_reddit_posts()` or `fetch_reddit_posts_with_keyword()` from PRAW, with optional image processing
2. **Save to database** -- `save_posts_to_database()` persists raw posts for future retrieval
3. **Retrieve full corpus** -- For non-keyword searches, merges new API results with existing database records for the subreddit
4. **Build document corpus** -- `process_posts_for_analysis()` concatenates title, content, and comments per post
5. **Run BERTopic** -- `analyze_topics(documents, post_ids, scores)` executes the four-stage pipeline
6. **Calculate topic similarities** -- `calculate_topic_similarities()` computes cosine similarity between topic c-TF-IDF vectors to identify related themes
7. **Generate summaries** -- `summarize_topics()` sends representative documents for each topic to an LLM for one-sentence and short summary generation
8. **Sentiment analysis per topic** -- `process_top_topics()` applies VADER sentiment scoring to documents within each topic cluster, categorizing topics as positive, negative, or neutral
9. **Extract engagement metrics** -- `extract_engagement_metrics()` computes upvote distributions, comment frequency, and posting patterns
10. **Index in pgvector** -- If enabled, `index_data_in_pgvector()` stores embeddings for later semantic search

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `subreddit` | (required) | Target subreddit name |
| `num_posts` | 800 | Number of posts to fetch (API default; HiC sends 200) |
| `max_comments` | 3 | Maximum comments per post |
| `sort` | relevance | Reddit sort order |
| `keyword` | (empty) | Optional keyword filter for targeted searches |
| `startDate` / `endDate` | (none) | Date range filter |
| `process_images` | true | Whether to process image content in posts |
| `index_in_pgvector` | true | Whether to store embeddings for RAG |
| `summary_limit` | (none) | Debugging: limit number of summaries generated |
| `topics_limit` | (none) | Debugging: limit number of topics processed |

### Job Management

Topic modeling runs asynchronously with full lifecycle management:

- **Create**: POST `/api/topic-model/analyze-async` returns `job_id` (HTTP 202)
- **Poll**: GET `/api/topic-model/job-status/{job_id}` returns status, progress (0-100), and result
- **Cancel**: DELETE `/api/topic-model/job/{job_id}` signals cancellation via threading `Event`
- **Batch cancel**: DELETE `/api/topic-model/project/{project_id}/cancel`
- **List**: GET `/api/topic-model/jobs/user/{user_id}` or `/jobs/project/{project_id}`

### Output Structure

The completed analysis returns:

```
{
  "total_documents": <int>,
  "total_topics": <int>,
  "topics": {
    "positive": { "count": <int>, "topics": [...] },
    "negative": { "count": <int>, "topics": [...] },
    "neutral":  { "count": <int>, "topics": [...] }
  },
  "topic_similarities": [...],
  "engagement_metrics": { ... },
  "topic_engagement_metrics": { ... },
  "pgvector_indexing": { "success": <bool>, "inserted": <int> }
}
```

Each topic entry includes: topic ID, name, keyword representation (term + weight pairs), one-sentence summary, short summary, sentiment category and score, sentiment distribution, document count, and engagement metrics.

## pgvector Integration

PostgreSQL with the pgvector extension (0.5.1) provides persistent vector storage and similarity search for the RAG system.

### Database Schema

The `reddit_embeddings` table stores one row per indexed post:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `subreddit` | TEXT | Subreddit name for scoped queries |
| `post_id` | TEXT | Reddit post identifier |
| `embedding` | vector(768) | SentenceTransformer embedding |

An IVFFlat index (`reddit_embeddings_idx`) with 100 lists accelerates cosine similarity lookups.

### Core Functions

**`index_data_in_pgvector(subreddit, reddit_data, log_dir)`**

Creates tables if needed, then calls `store_reddit_data_in_pgvector()`. Returns `{ success, inserted }`.

**`store_reddit_data_in_pgvector(subreddit, reddit_data)`**

Encodes each post (title + content + all comment bodies concatenated) into a 768-d vector using `all-mpnet-base-v2`. Inserts in batches of 100. Duplicate-skipping logic is present but commented out, so re-indexing creates duplicate entries.

**`query_pgvector(subreddit, query, top_k=25)`**

Encodes the query string, then performs cosine distance search (`<=>` operator) scoped to the target subreddit. Returns the top-k most similar post IDs with their distance scores.

**`get_rag_response(subreddit, prompt, top_k=15)`**

Executes `query_pgvector()`, then fetches full post records (including nested comment trees) from the `RedditPost` and `RedditComment` ORM models via SQLAlchemy. Returns structured post data with title, content, score, timestamp, and hierarchical comments.

**`clear_pgvector_data()`**

Truncates the entire `reddit_embeddings` table. Used for full resets.

### ORM Models

The application uses SQLAlchemy models defined in `app/db/models/reddit_models.py`:

- `RedditPost` -- Stores post metadata (title, content, score, author, URL, permalink, timestamps) with a relationship to comments
- `RedditComment` -- Stores comment data (body, score, author, parent_comment_id) enabling hierarchical comment tree reconstruction

## RAG (Retrieval-Augmented Generation) System

The RAG endpoint combines vector search with keyword search for comprehensive retrieval before passing context to an LLM.

### Endpoint

**POST `/api/rag/query`**

Request body:
```json
{
  "prompt": "What do users think about battery life?",
  "subreddit": "ouraring",
  "topicData": { ... },
  "model": "claude"
}
```

### Retrieval Strategy

The system uses a dual-retrieval approach:

1. **Vector search**: `get_rag_response()` finds the 15 most semantically similar posts via pgvector cosine distance
2. **Keyword search**: `get_keyword_response()` extracts keywords from the prompt using an LLM, then queries the PostgreSQL database for posts and comments containing those keywords (case-insensitive `CONTAINS` matching)
3. **Merge**: Results are deduplicated by post ID and combined into a unified context set

### LLM Synthesis

The combined context (formatted as markdown with post IDs, titles, content, and comments) plus existing topic data is assembled into a RAG prompt via `get_rag_prompt()`. Multi-model support:

| Model Key | Provider |
|-----------|----------|
| `claude` | Anthropic Claude |
| `openai-4o` | OpenAI GPT-4o |
| `gemini-1.5-pro` | Google (via OpenAI-compatible API) |
| `gemini-2.5` | Google (via OpenAI-compatible API) |

All use temperature 0.6 for balanced creativity and factual grounding.

## Wiki Integration Rules

- Topic clusters should inform `wiki/evidence/` pages and cross-reference wiki theme categories
- Each topic's one-sentence summary provides a candidate theme title; the short summary provides initial theme description content
- Semantic search results from RAG can validate or contradict existing wiki benchmark data
- Topic modeling results from different subreddits should be compared across engagements to identify cross-industry patterns
- pgvector embeddings enable cross-engagement semantic similarity -- querying one subreddit's embeddings with themes from another project
- Topic similarity scores identify overlapping themes that may warrant consolidation in wiki synthesis pages

## Cross-References

- [[social-intelligence/sentiment-pipeline]] -- VADER and RoBERTa scoring details
- [[social-intelligence/cx-mesh]] -- How social data enters the research fabric
- [[sources-registry/credibility-tiers]] -- Social data credibility rating
- [[frameworks/competitive]] -- Topic clusters in competitive analysis
- [[frameworks/gap-analysis]] -- Topic themes as gap analysis dimensions
