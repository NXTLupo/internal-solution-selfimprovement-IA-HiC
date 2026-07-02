---
id: social-intelligence/cx-mesh.md
title: "CX Mesh Integration Layer"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [cxIntegrationService.ts, services/dataSourceConnectors.ts]
confidence: high
status: active
tags: [cx-mesh, reddit, trustpilot, playstore, social-data, voice-of-customer]
evidence_count: 0
industries: [saas, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/cx-mesh.md#c0"
    char_span: [0, 925]
    sentence_count: 5
    key_terms: [research, social, services, backend, integration, data, mesh, collection]
    concepts: [research, social, services, backend, integration]
    related_chunks: ["social-intelligence/cx-mesh.md#c5", "social-intelligence/cx-mesh.md#c6"]
    section: Architecture
    token_count: 188
  - id: "social-intelligence/cx-mesh.md#c1"
    char_span: [954, 2879]
    sentence_count: 4
    key_terms: [count, parameters, reddit, jobid, collect, returns, socialcollectionconfig, source]
    concepts: [count, parameters, reddit, socialcollectionconfig, jobid]
    section: Social Data Collection
    token_count: 469
    sources: [{"n":"\"reddit\"`","u":""},{"n":"\"trustpilot\"`","u":""},{"n":"\"playstore\"`","u":""},{"n":"'reddit' | 'trustpilot' | 'playstore';","u":""}]
  - id: "social-intelligence/cx-mesh.md#c2"
    char_span: [2905, 3790]
    sentence_count: 2
    key_terms: [string, subreddit, relevant, research, communities, researchfabricorchestrator, subredditrecommendation, estimatedengagement]
    concepts: [string, subreddit, relevant, research, communities]
    section: Subreddit Discovery
    token_count: 187
  - id: "social-intelligence/cx-mesh.md#c3"
    char_span: [3837, 5218]
    sentence_count: 5
    key_terms: [subreddit, analysis, journey, returns, posts, api, data, rag]
    concepts: [subreddit, analysis, journey, returns, posts]
    section: Integration with Social Research Backend
    token_count: 345
  - id: "social-intelligence/cx-mesh.md#c4"
    char_span: [5250, 5691]
    sentence_count: 2
    key_terms: [servicestatus, string, checkservicehealth, typescript, available, endpoints, interface, operation]
    concepts: [servicestatus, string]
    section: Service Health Monitoring
    token_count: 98
  - id: "social-intelligence/cx-mesh.md#c5"
    char_span: [5741, 6676]
    sentence_count: 8
    key_terms: [social, evidence, nodes, tier, research, credibility, data, community]
    concepts: [social, evidence, nodes, research, credibility]
    related_chunks: ["social-intelligence/cx-mesh.md#c0", "social-intelligence/cx-mesh.md#c6", "social-intelligence/cx-mesh.md#c8"]
    section: How CX Mesh Data Enters the Research Corpus
    token_count: 181
  - id: "social-intelligence/cx-mesh.md#c6"
    char_span: [6715, 7403]
    sentence_count: 1
    key_terms: [social, competitive, research, users, authentically, intelligence, ambivalence, communities]
    concepts: [social, competitive, research, users]
    related_chunks: ["social-intelligence/cx-mesh.md#c0", "social-intelligence/cx-mesh.md#c5"]
    section: Voice of Customer (VoC) Patterns
    token_count: 118
  - id: "social-intelligence/cx-mesh.md#c7"
    char_span: [7432, 8225]
    sentence_count: 3
    key_terms: [connector, forums, channels, social, datasourceconnectors, credibilitytier, machinelearning, social-relevant]
    concepts: [connector, forums, channels, social]
    section: Data Source Connectors
    token_count: 177
  - id: "social-intelligence/cx-mesh.md#c8"
    char_span: [8254, 9060]
    sentence_count: 1
    key_terms: [wiki, evidence, trustpilot, playstore, subreddit, social, themes, pages]
    concepts: [evidence, trustpilot, playstore, subreddit, social]
    related_chunks: ["social-intelligence/cx-mesh.md#c5"]
    section: Wiki Integration Rules
    token_count: 158
  - id: "social-intelligence/cx-mesh.md#c9"
    char_span: [9083, 9567]
    sentence_count: 1
    key_terms: [social-intelligence, sources-registry, competitive, frameworks, analysis, social, sentiment-pipeline, connector-catalog]
    concepts: [social-intelligence, sources-registry, competitive, frameworks, analysis]
    section: Cross-References
    token_count: 104
---
# CX Mesh Integration Layer

The CX Mesh is the integration fabric that connects HiC Research to live social intelligence services. It routes social data from collection through analysis into the research corpus, enforcing human checkpoints at each boundary crossing.

## Architecture

The CX Mesh is implemented primarily in `services/cxIntegrationService.ts` within the HiC Research application. It acts as a typed client layer over three backend services:

| Service | Port | Role |
|---------|------|------|
| Reddit Ripper | 5001 | Social data collection (Reddit, TrustPilot, PlayStore) |
| Social Research Backend | 8081 | Topic modeling, sentiment analysis, RAG queries |
| Journey Mapper | 8080 | Interactive journey map generation from research data |

All browser-side requests are routed through a research proxy (port 5012) at `/api/cx` to handle CORS. Server-side requests go directly to the backend service URLs.

## Social Data Collection

### Three Collection Modes

**Reddit (via PRAW)**
- Endpoint: `/collect` with `source: "reddit"`
- Parameters: subreddit name (`target`), post count (50-500), time filter (day/week/month/year/all), comments per post (default 5)
- Returns posts with title, selftext, score, author, permalink, timestamps, and nested comments up to depth 2
- Rate-limited at 10 seconds per PRAW configuration

**TrustPilot**
- Endpoint: `/collect` with `source: "trustpilot"`
- Parameters: company URL (`target`), review count
- Collected via `services/trustpilot_scraper.py` in the Reddit Ripper service
- Returns structured review data (rating, title, text, date, author)

**PlayStore**
- Endpoint: `/collect` with `source: "playstore"`
- Parameters: Android package name (`target`), review count
- Collected via `services/playstore_collector.py` in the Reddit Ripper service
- Returns app reviews with rating, text, thumbs-up count, and timestamps

### Collection Workflow

The collection process is asynchronous with a three-step flow:

1. **`startCollection(config)`** -- POSTs to `/collect` with source-specific parameters. Returns a `jobId` immediately.
2. **`pollCollectionJob(jobId, onProgress)`** -- Polls `/status/{jobId}` every 5 seconds for up to 10 minutes (120 attempts). Calls the `onProgress` callback with current status, progress, and collected count.
3. **`downloadCollectionData(jobId, filename)`** -- Fetches the completed JSON file from `/download/{jobId}/{filename}`.

The convenience function `collectSocialData(config, onProgress)` wraps all three steps into a single call returning a `SocialDataSummary`.

### SocialCollectionConfig Type

```typescript
interface SocialCollectionConfig {
    source: 'reddit' | 'trustpilot' | 'playstore';
    target: string;         // subreddit name, company URL, or package name
    count: number;          // 50-500
    timeFilter?: string;    // day, week, month, year, all
}
```

## Subreddit Discovery

Before collection begins, the research fabric orchestrator (`services/researchFabricOrchestrator.ts`) can automatically discover relevant subreddits using AI.

**`discoverSubreddits(researchGoal, industryContext?)`** sends a prompt to Gemini 2.5 Flash asking it to identify 5-8 active, relevant subreddit communities given the research goal. The response is a structured array:

```typescript
interface SubredditRecommendation {
    name: string;              // subreddit name (no r/ prefix)
    description: string;       // what the community discusses
    relevanceReason: string;   // why it's relevant to the research
    estimatedEngagement: string; // "high" | "medium" | "low"
    memberCount: string;       // approximate member count
}
```

This enables the researcher to make informed decisions about which communities to collect from, rather than guessing subreddit names.

## Integration with Social Research Backend

Once data is collected, the CX Mesh provides typed access to the Social Research Backend's analysis capabilities.

### Topic Modeling

**`startTopicModeling(subreddit, numPosts=200)`** -- POSTs to `/api/topic-model/analyze-async` with parameters:
- `subreddit`: target subreddit
- `num_posts`: 200 (HiC default)
- `max_comments`: 3
- `sort`: relevance
- `user_id`: "hic-research"
- `index_in_pgvector`: true (enables RAG queries later)

**`pollTopicModelingJob(jobId, onProgress)`** -- Polls job status every 5 seconds. Returns the full topic analysis result on completion.

### Sentiment Analysis

**`startSentimentAnalysis(subreddit, query, limit=50)`** -- POSTs to `/api/llm-analyzer/analyze-sentiment` with:
- `skip_filtering`: true (HiC handles its own filtering)
- `sort`: relevance
- `time`: all
- Returns `job_id` for async polling

### RAG Queries

**`queryRAG(prompt, subreddit)`** -- POSTs to `/api/rag/query` for semantic search plus LLM synthesis over indexed social data. Uses Claude as the default model. Returns an answer string with source references.

### Journey Map Generation

**`generateJourneyMap(dataBlob, fileName, title, journeyType)`** -- Sends research data to the Journey Mapper service (port 8080) via multipart form upload. The `prepareJourneyData()` helper converts themes, personas, and pain points into a text format the Journey Mapper can ingest.

## Service Health Monitoring

**`checkServiceHealth()`** checks all three backend services by hitting their `/health` endpoints with a 3-second timeout. Returns an array of `ServiceStatus` objects:

```typescript
interface ServiceStatus {
    name: string;       // "Reddit Ripper" | "Social Research" | "Journey Mapper"
    available: boolean;
    url: string;
}
```

This is called before any CX Mesh operation to provide clear feedback when a required service is down.

## How CX Mesh Data Enters the Research Corpus

Social data enters the HiC Research knowledge graph at **Tier 3 credibility** (community/social source). The integration path:

1. Raw social data is collected via Reddit Ripper and returned as JSON
2. The data is optionally analyzed via topic modeling and/or sentiment analysis on the Social Research Backend
3. Results are presented to the researcher at a human checkpoint for review
4. Approved findings are incorporated into the research corpus as evidence nodes
5. Evidence nodes connect to theme nodes, persona nodes, and deliverable sections

The Tier 3 classification means social evidence is treated as directional signal, not definitive proof. It gains credibility weight when:
- Multiple independent social sources converge on the same finding
- Social evidence is corroborated by Tier 1 (academic/institutional) or Tier 2 (industry report) sources
- Engagement metrics (upvotes, comment depth) indicate community validation

## Voice of Customer (VoC) Patterns

Social data provides unique value that formal research often misses:

- **Unprompted complaints**: Users describe problems in their own language without researcher framing bias
- **Emotional intensity**: Raw social posts capture frustration, delight, and ambivalence more authentically than survey responses
- **Emerging themes**: New issues surface in social communities before they appear in structured research
- **Competitive mentions**: Users frequently compare products and services, providing unsolicited competitive intelligence
- **Temporal patterns**: Posting frequency and sentiment shifts over time reveal the impact of product changes, marketing campaigns, or external events

## Data Source Connectors

Beyond the three core social channels, the broader data source connector system (`services/dataSourceConnectors.ts`) provides access to 120+ sources organized by category. All connectors route through the research proxy (port 5012) which handles CORS, rate limits, and retries.

Social-relevant connector categories include:

- **Tech & Social**: Hacker News discourse
- **AI Communities**: Reddit r/MachineLearning, r/artificial, r/LocalLLaMA, Stack Overflow AI
- **Video**: YouTube search, AI content channels (Two Minute Papers, Lex Fridman, Sentdex)
- **Community Forums**: Hugging Face Forums, PyTorch Forums, TensorFlow Forum

Each connector returns `DataSourceItem` objects with a `credibilityTier` rating (1, 2, or 3) and a `sourceType` classification used for evidence categorization.

## Wiki Integration Rules

- CX Mesh findings should populate `wiki/evidence/` pages tagged with `source=social` and the specific platform (reddit, trustpilot, playstore)
- Subreddit-specific insights should be filed under `wiki/engagements/` for client-specific context, preserving the subreddit name and collection date
- Cross-subreddit patterns (themes appearing in multiple communities) should inform `wiki/synthesis/` pages as convergent evidence
- TrustPilot and PlayStore review themes should feed into `wiki/benchmarks/` for competitive intelligence -- star ratings provide quantitative baselines
- Engagement metrics from social data should be recorded alongside evidence to enable quality-weighted analysis
- AI-discovered subreddit recommendations from `discoverSubreddits()` should be logged for research reproducibility

## Cross-References

- [[social-intelligence/sentiment-pipeline]] -- Full sentiment analysis pipeline details
- [[social-intelligence/topic-modeling]] -- BERTopic and pgvector technical documentation
- [[frameworks/competitive]] -- Social data in competitive analysis
- [[frameworks/gap-analysis]] -- Voice of Customer in gap identification
- [[sources-registry/connector-catalog]] -- Full connector registry (120+ sources)
- [[sources-registry/credibility-tiers]] -- Tier 3 social evidence classification
