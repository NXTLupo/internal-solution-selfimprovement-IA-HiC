---
id: social-intelligence/sentiment-pipeline.md
title: "Sentiment Analysis Pipeline"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [api_llm_analyzer.py, social-research-backend]
confidence: high
status: active
tags: [sentiment, vader, roberta, absa, nlp, social-research]
evidence_count: 0
industries: [ai_research, saas]
industry_method: llm
chunks:
  - id: "social-intelligence/sentiment-pipeline.md#c0"
    char_span: [0, 816]
    sentence_count: 6
    key_terms: [sentiment, pipeline, analysis, evidence, research, social-research-backend, social, gpu]
    section: Architecture Overview
    token_count: 143
  - id: "social-intelligence/sentiment-pipeline.md#c1"
    char_span: [840, 2963]
    sentence_count: 5
    key_terms: [stage, via, comments, reddit, twitter-roberta-base-sentiment, data, util, trustpilot]
    section: Processing Stages
    token_count: 486
  - id: "social-intelligence/sentiment-pipeline.md#c2"
    char_span: [2965, 5004]
    sentence_count: 1
    key_terms: [sentiment, stage, analysis, cluster, clustering, keyword, density-based, noise]
    section: Processing Stages
    token_count: 469
  - id: "social-intelligence/sentiment-pipeline.md#c3"
    char_span: [5006, 7126]
    sentence_count: 6
    key_terms: [frequency, post, via, similarity, chunk, evidence, negative, positive]
    section: Processing Stages
    token_count: 467
  - id: "social-intelligence/sentiment-pipeline.md#c4"
    char_span: [7146, 7673]
    sentence_count: 2
    key_terms: [query, api, post, sentiment, analyze-sentiment, rag, analyze-async, llm-analyzer]
    section: API Endpoints
    token_count: 124
  - id: "social-intelligence/sentiment-pipeline.md#c5"
    char_span: [7704, 8097]
    sentence_count: 1
    key_terms: [bundled, scikit-learn, transformers, bertopic, hdbscan, sentence-transformers, vadersentiment, sentence-bert]
    section: Backend Technology Stack
    token_count: 142
  - id: "social-intelligence/sentiment-pipeline.md#c6"
    char_span: [8126, 8565]
    sentence_count: 1
    key_terms: [twitter-roberta-base-sentiment, filtering, sentiment, deberta-v3-base-absa-v1, all-mpnet-base-v2, filteringcluster, filteringroberta, aspect-targeted]
    section: Filter Types Reference
    token_count: 120
  - id: "social-intelligence/sentiment-pipeline.md#c7"
    char_span: [8601, 9538]
    sentence_count: 6
    key_terms: [research, points, hic, emotional, sentiment, negative, social-research-backend, journey]
    section: Integration with HiC Research
    token_count: 192
  - id: "social-intelligence/sentiment-pipeline.md#c8"
    char_span: [9567, 10133]
    sentence_count: 1
    key_terms: [evidence, tier, engagement, analysis, pages, wiki, corroborated, attribution]
    section: Wiki Integration Rules
    token_count: 110
  - id: "social-intelligence/sentiment-pipeline.md#c9"
    char_span: [10156, 10579]
    sentence_count: 1
    key_terms: [social-intelligence, sources-registry, frameworks, sentiment, connector-catalog, credibility-tiers, topic-modeling, construction]
    section: Cross-References
    token_count: 94
---
# Sentiment Analysis Pipeline

This page documents the end-to-end sentiment analysis pipeline that powers social intelligence within the HiC Research platform. The pipeline transforms raw social media text into structured sentiment evidence suitable for research deliverables.

## Architecture Overview

The sentiment pipeline is implemented in the social-research-backend service (port 8081). It exposes a single orchestration endpoint that chains ten processing stages sequentially, producing a final Pros/Cons analysis with engagement metrics and per-point evidence citations.

The backend is a Flask application running Python 3.11. All NLP models are loaded at runtime on the container's CPU -- no GPU is required, though GPU acceleration is detected and used when available via `util.device.get_torch_device()`.

## Processing Stages

### Stage 1 -- Data Input

Social data enters the pipeline from three collection channels, each served by the Reddit Ripper service (port 5001):

- **Reddit**: Posts and comments scraped via PRAW. Configurable post count (typically 5-500), sort order (relevance, hot, new, top), and time filter (day, week, month, year, all). Comments are fetched with nested replies up to depth 2.
- **TrustPilot**: Customer reviews collected by company URL via the TrustPilot scraper module.
- **PlayStore**: App reviews collected by Android package name via the PlayStore collector module.

The CX Integration Service (`cxIntegrationService.ts`) in HiC Research calls the `/collect` endpoint on the Reddit Ripper, polls `/status/{jobId}`, and downloads the resulting JSON from `/download/{jobId}/{filename}`.

### Stage 2 -- Text Cleaning and Tokenization

The `TextProcessor` class (`util/text_processing/post_processor.py`) normalizes raw social text:

- Strips smart quotes, Unicode artifacts, and non-ASCII characters
- Combines post title, selftext, and comment bodies into unified document strings
- Formats data into a structure compatible with downstream filter classes
- Preserves metadata (score, author, timestamps) for later engagement analysis

### Stage 3 -- RoBERTa Sentiment Classification

`FilteringRoBERTa` (`util/text_processing/filtering_roberta.py`) applies the `cardiffnlp/twitter-roberta-base-sentiment` model via the Hugging Face `transformers` pipeline.

- **Labels**: POSITIVE, NEGATIVE, NEUTRAL
- **Threshold**: Content is considered relevant (non-neutral) if the confidence score exceeds 0.50
- **Behavior**: Posts failing the relevance check have their title and selftext cleared but remain in the dataset structure. Comments failing the check are removed entirely.
- **Output**: A filtered dataset plus a log file (`3.2.filtered_content_roberta.json`) recording what was removed and why.

### Stage 4 -- VADER Lexicon-Based Scoring

`sentiment_analyzer.py` (`util/topic_model/sentiment_analyzer.py`) applies the VADER (Valence Aware Dictionary and sEntiment Reasoner) analyzer from `vaderSentiment~=3.3.2`.

- **Score range**: Compound score from -1.0 (most negative) to +1.0 (most positive)
- **Categorization thresholds**: positive (> 0.05), negative (< -0.05), neutral (between)
- **Per-topic analysis**: `analyze_topic_sentiment()` scores all documents within a BERTopic cluster and returns the average compound score, sentiment category, and distribution counts
- **Singleton pattern**: The VADER analyzer is initialized once and reused across all scoring calls to minimize memory allocation

### Stage 5 -- Aspect-Based Sentiment Analysis (ABSA)

`FilteringABSA` (`util/text_processing/filtering_ABSA.py`) applies the `yangheng/deberta-v3-base-absa-v1.1` model to extract sentiment tied to specific aspects or features.

- **Input format**: Text is combined with a keyword using `[SEP]` token: `"{text} [SEP] {keyword}"`
- **Labels**: NEG, NEU, POS
- **Relevance threshold**: Content is relevant if sentiment is not neutral AND confidence exceeds 0.6
- **Use case**: When a keyword is provided, ABSA filters content to only items expressing sentiment about that specific aspect, enabling targeted analysis (e.g., "battery life" sentiment within a product subreddit)

### Stage 6 -- Density-Based Clustering

`Filtering` (`util/text_processing/filtering_cluster.py`) uses HDBSCAN density-based clustering to separate signal from noise.

- **Embedding model**: SentenceTransformer `all-mpnet-base-v2` (768-dimensional embeddings)
- **Clustering parameters**: min_cluster_size=2, min_samples=1, metric=euclidean, cluster_selection_method=eom
- **Noise removal**: Points assigned to cluster label -1 (noise) are filtered out -- these are posts and comments that do not cluster with any coherent group
- **Filter selection**: The pipeline uses either ABSA (stage 5) or Cluster filtering (stage 6) based on the `filter_type` parameter, not both simultaneously

### Stage 7 -- Chunking for LLM Analysis

`chunk_filtered_data()` (`util/text_processing/chunking.py`) splits the filtered, formatted posts into processable segments for LLM consumption.

- **Default chunk size**: 40,000 characters
- **Behavior**: Posts are kept intact (never split mid-post). A new chunk is started when adding the next post would exceed the size limit.
- **Output**: A list of dictionaries, each containing numbered posts (e.g., `"post 1"`, `"post 2"`)

### Stage 8 -- LLM-Based Sentiment Synthesis

Chunked data is sent to an LLM for structured Pros/Cons extraction. The pipeline supports multiple providers:

- **Claude** (Anthropic) -- via `get_claude_completion()`
- **OpenAI** -- via `get_openai_completion()`
- **Mistral** -- via Mistral-specific prompts
- **DeepSeek** -- via `get_single_deepseek_completion()`

Each chunk is processed in parallel using `ThreadPoolExecutor` with configurable `max_workers`. The LLM receives a system prompt instructing it to return structured JSON with `positive` and `negative` arrays, where each entry contains a `point`, `frequency`, and `evidence` dictionary mapping post IDs to quoted text.

### Stage 9 -- Point Merging via SBERT Embeddings

`PointMerger` (`util/text_processing/merge_sbert.py`) deduplicates semantically similar points across chunks using Sentence-BERT.

- **Embedding model**: `all-mpnet-base-v2`
- **Similarity metric**: Cosine similarity with a default threshold of 0.6
- **Merge strategy**: Points exceeding the similarity threshold are grouped. The point with the highest frequency (and longest text as tiebreaker) becomes the representative. Frequencies are summed and evidence dictionaries are merged with deduplication.
- **Scope**: Positive and negative categories are merged independently

### Stage 10 -- Output: Pros/Cons with Engagement Metrics

The final output combines:

- **Pros/Cons analysis**: Ranked lists of positive and negative points with frequency counts and verbatim evidence quotes linked to source post IDs
- **Engagement metrics**: Extracted by `extract_engagement_metrics()` from `util/topic_model/user_engament.py`, including upvote distributions, comment counts, and posting frequency patterns
- **Analysis metadata**: Total documents processed, chunk count, model used, processing timestamps

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/llm-analyzer/analyze-sentiment` | POST | Full sentiment pipeline with filter selection. Parameters: subreddit, query, limit, sort, time, filter_type (cluster or ABSA), keyword, merge_method, chunk_size, analysis_model, max_workers, skip_filtering |
| `/api/topic-model/analyze-async` | POST | BERTopic async analysis with integrated VADER sentiment per topic |
| `/api/rag/query` | POST | RAG query against indexed social data with LLM synthesis |

## Backend Technology Stack

| Component | Library | Version |
|-----------|---------|---------|
| VADER | vaderSentiment | ~=3.3.2 |
| RoBERTa | transformers | ~=4.34.0 |
| ABSA (DeBERTa) | transformers | ~=4.34.0 |
| BERTopic | bertopic | ~=0.15.0 |
| HDBSCAN | hdbscan | ==0.8.38.post1 |
| Sentence-BERT | sentence-transformers | (bundled) |
| scikit-learn | scikit-learn | (bundled) |
| UMAP | umap-learn | (bundled) |

## Filter Types Reference

| Filter Class | Model | Purpose |
|-------------|-------|---------|
| `FilteringRoBERTa` | cardiffnlp/twitter-roberta-base-sentiment | Binary sentiment relevance gating |
| `FilteringABSA` | yangheng/deberta-v3-base-absa-v1.1 | Aspect-targeted sentiment filtering |
| `FilteringCluster` (Filtering) | all-mpnet-base-v2 + HDBSCAN | Density-based noise removal |
| `FilteringVADER` | vaderSentiment lexicon | Compound score categorization |

## Integration with HiC Research

The social-research-backend (port 8081) is accessed from HiC Research via `cxIntegrationService.ts`. The integration flow is:

1. HiC Research calls `startSentimentAnalysis(subreddit, query, limit)` which POSTs to `/api/llm-analyzer/analyze-sentiment`
2. The endpoint returns a `job_id` immediately (HTTP 202)
3. HiC Research polls job status until completion
4. Results enter the main research corpus with **Tier 3 credibility** (social/community source)

Sentiment data feeds into multiple deliverable types:

- **Persona pain points**: Negative sentiment points with high frequency become candidate pain points
- **Journey emotional states**: VADER compound scores map to emotional valence at journey stages
- **Recommendation generation**: Recurring negative themes with strong evidence drive improvement recommendations
- **Gap analysis dimensions**: Aspect-level sentiments reveal gaps between user expectations and product reality

## Wiki Integration Rules

- Sentiment findings should be filed into `wiki/evidence/` pages with full source attribution (subreddit, post ID, timestamp)
- Topic clusters from the BERTopic stage map to wiki theme analysis pages
- Aspect sentiments feed into specific deliverable sections (persona pain points, gap analysis dimensions)
- Engagement metrics (upvotes, comment reply counts) serve as proxy evidence quality indicators -- higher engagement implies greater community validation
- All social evidence carries a Tier 3 credibility rating unless corroborated by Tier 1 or Tier 2 sources

## Cross-References

- [[sources-registry/connector-catalog]] -- Full list of data source connectors
- [[sources-registry/credibility-tiers]] -- Evidence credibility framework
- [[frameworks/personas]] -- How sentiment feeds persona construction
- [[frameworks/gap-analysis]] -- Aspect sentiment in gap analysis
- [[social-intelligence/topic-modeling]] -- BERTopic pipeline details
- [[social-intelligence/cx-mesh]] -- CX Mesh integration layer
