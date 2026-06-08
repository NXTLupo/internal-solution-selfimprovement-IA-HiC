---
id: methodologies/research-fabric.md
title: "Research Fabric Orchestration"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [researchFabricOrchestrator.ts, methods/MethodExecutor.ts]
confidence: high
status: active
tags: [research-fabric, orchestration, methodology, pipeline]
evidence_count: 0
chunks:
  - id: "methodologies/research-fabric.md#c0"
    char_span: [0, 493]
    sentence_count: 3
    key_terms: [research, orchestration, researchfabricorchestrator, services, fabric, source, data, methodexecutor]
    token_count: 101
  - id: "methodologies/research-fabric.md#c1"
    char_span: [522, 2826]
    sentence_count: 20
    key_terms: [sources, search, phase, research, reviews, goal, function, papers]
    section: Orchestration Pipeline
    token_count: 517
  - id: "methodologies/research-fabric.md#c2"
    char_span: [2828, 4223]
    sentence_count: 10
    key_terms: [items, function, relevance, content, scoring, phase, score, extraction]
    section: Orchestration Pipeline
    token_count: 339
  - id: "methodologies/research-fabric.md#c3"
    char_span: [4262, 6090]
    sentence_count: 12
    key_terms: [applicable, pipeline, required, ingest, lenses, stages, product, framework]
    section: The Seven Research Methodologies
    token_count: 454
  - id: "methodologies/research-fabric.md#c4"
    char_span: [6092, 6784]
    sentence_count: 3
    key_terms: [segmentation, wiki, applicable, synthesis, pipeline, required, driver, lenses]
    section: The Seven Research Methodologies
    token_count: 161
  - id: "methodologies/research-fabric.md#c5"
    char_span: [6816, 7540]
    sentence_count: 1
    key_terms: [stage, methodology, stageid, output, getavailableoutputs, completedstages, interpretations, previousresults]
    section: Method Executor Interface
    token_count: 147
  - id: "methodologies/research-fabric.md#c6"
    char_span: [7573, 8296]
    sentence_count: 2
    key_terms: [user, checkpoint, narrative, personas, review, stages, themes, methodology-specific]
    section: Human-in-the-Loop Pipeline
    token_count: 161
  - id: "methodologies/research-fabric.md#c7"
    char_span: [8325, 8734]
    sentence_count: 1
    key_terms: [wiki, deep-research, research, methodology-specific, analytical-lenses, cross-references, knowledge-graph, research-modes]
    section: Wiki Integration Rules
    token_count: 89
---
# Research Fabric Orchestration

The Research Fabric is the central orchestration layer that ties together deep
research, data source connectors, CX mesh integration, and AI-powered quality
filtering into a unified research workflow. It is responsible for planning,
executing, scoring, enriching, and merging research data from dozens of
heterogeneous sources into a single corpus ready for analysis.

Source: `services/researchFabricOrchestrator.ts`, `services/methods/MethodExecutor.ts`

---

## Orchestration Pipeline

The fabric operates in seven sequential phases. Phases 1-3 run before data
collection begins (planning). Phases 4-7 execute the plan and prepare the
corpus for the analysis pipeline.

### Phase 1: Subreddit Discovery

**Function**: `discoverSubreddits(researchGoal, industryContext)`

Uses Gemini 2.5 Flash to identify 5-8 relevant Reddit communities based on
the research goal and optional industry context. Returns ranked
SubredditRecommendation objects with name, description, relevance reason,
estimated engagement level (high/medium/low), and approximate member count.

### Phase 2: Query Refinement

**Function**: `refineSearchQueries(goal, lens, enabledSources)`

A human researcher does not search "Identify emerging needs in the remote work
sector." They search "remote work productivity challenges 2026." This phase
generates one targeted search query per enabled data source, optimized for
that source's search engine characteristics.

Rules enforced by the AI prompt:
- Each query: 4-8 keywords, no filler words
- News sources: include year references (2025, 2026) for recency
- Academic sources: use field-specific terminology
- Economic sources: use indicator-relevant terms (GDP, employment, market size)
- Social sources: use community language, not formal terms

Falls back to the raw research goal if refinement fails.

### Phase 3: Research Plan Generation

**Function**: `generateResearchPlan(goal, lens, enabledCategories)`

Assembles a ResearchPlan object containing all enabled sources with per-source
cost and time estimates. The plan is presented to the user for review before
execution begins. Source categories available:

1. AI Deep Research (quick/focused/deep mode)
2. GDELT News Monitoring (30 articles)
3. OpenAlex Academic Papers (20 papers)
4. Semantic Scholar (15 papers with citation graphs)
5. World Bank Indicators (10 economic indicators)
6. Hacker News Discussions (20 threads)
7. Wikipedia Trends (5 articles)
8. Web Intelligence (Jina Reader extraction from user-provided URLs)
9. CX Mesh -- Reddit subreddits (100 posts each)
10. CX Mesh -- TrustPilot reviews (100 reviews each)
11. CX Mesh -- Play Store reviews (100 reviews each)
12. YouTube Search (10 videos)
13. Video Transcription (per-URL, approximately 120 seconds each)

### Phase 4: Parallel Execution

**Function**: `executePlan(plan, onProgress)`

Executes all enabled sources in parallel using Promise.allSettled. Each source
type routes to its handler: deep_research to executeResearch(), data_api to
the connector map, subreddit/cx_mesh to collectSocialData(). Progress is
reported per-source. Failures are caught per-source without aborting the plan.

### Phase 5: Relevance Scoring

**Function**: `filterAndScoreItems(items, goal)`

All items from all sources are scored 0-100 for relevance using Gemini 2.5
Flash. Scoring rubric: 90-100 directly addresses goal, 70-89 closely related,
40-69 tangential, 0-39 not relevant. Items below 30 are dropped. Items 30-60
are flagged as tangential but retained. If scoring fails, all items default
to score 50.

### Phase 6: Content Enrichment

**Function**: `enrichTopItems(items, maxItems)`

Fetches full text for top-scored items with short content (under 300 chars)
via the content extraction proxy. Processes in batches of 3 concurrent
requests, caps at 5,000 characters per item, marks enriched items with
extraction method (pdf or jina).

### Phase 7: Corpus Merging

**Function**: `mergeResultsToCorpus(executionResult, researchGoal)`

Merges all scored, enriched items into a structured text corpus with CHUNK_XXX
IDs for citation tracking. Each chunk includes relevance score, freshness
score, credibility tier, and source attribution.

---

## The Seven Research Methodologies

Source: `services/methods/MethodExecutor.ts`

### 1. General Research Synthesis (default)

**ID**: `general_synthesis`
**Pipeline**: Ingest -> Themes -> Personas -> [optional: Journey Map,
Recommendations, PRD, Roadmap, Tech Arch, Gap Analysis, Tech Audit,
Competitive Analysis] -> Deck Structure -> Slide Narratives
**Stages**: 13 total (4 required, 9 optional)
**Applicable lenses**: all

### 2. Jobs to Be Done

**ID**: `jtbd`
**Pipeline**: Ingest -> Switching Timeline -> Forces of Progress ->
Circumstance Segments -> Product Implications
**Stages**: 5, all required
**Applicable lenses**: cx, product, market
**Framework**: Christensen + Ulwick. Maps push, pull, anxiety, and habit
forces. Segments by circumstance not demographics.

### 3. Human-Centered Design

**ID**: `design_thinking`
**Pipeline**: Ingest -> Tensions & Insights -> POV Statements -> How Might We
-> Concept Territories -> Prototype Experiments
**Stages**: 6, all required
**Applicable lenses**: cx, product, digital
**Framework**: IDEO + Stanford d.school. Converts research into framed
opportunities and experiment designs.

### 4. Contextual Inquiry

**ID**: `contextual_inquiry`
**Pipeline**: Ingest -> Atomic Observations -> Five Models -> Recurring
Breakdowns -> Design Implications
**Stages**: 5, all required
**Applicable lenses**: cx, product, organizational
**Five Models**: Flow, Sequence, Artifact, Cultural, Physical (Beyer &
Holtzblatt). Separates what people said from what they did.

### 5. Service Blueprinting

**ID**: `service_blueprint`
**Pipeline**: Ingest -> Service Blueprint -> Failure Analysis -> Redesign Options
**Stages**: 4, all required
**Applicable lenses**: cx, organizational, digital
**Framework**: Shostack/Bitner. Maps frontstage against backstage operations
and support systems.

### 6. NPS Closed-Loop Diagnostics

**ID**: `nps_diagnostic`
**Pipeline**: Ingest -> Score Segmentation -> Driver Analysis -> Save Actions
**Stages**: 4, all required
**Applicable lenses**: cx, market, organizational
**Key**: Promoter/Passive/Detractor segmentation with operational loyalty
driver identification and targeted save interventions.

### 7. Karpathy Second Brain

**ID**: `karpathy_second_brain`
**Pipeline**: Classify Operation -> Extract & Update -> Wiki Synthesis -> Lint
& Validate
**Stages**: 4 (3 required, Lint optional)
**Applicable lenses**: all
**Key**: Persistent research memory with immutable raw sources, contradiction
tracking, and wiki synthesis. Closest analog to the wiki architecture itself.

---

## Method Executor Interface

Every methodology implements the MethodExecutor interface:

- `executeStage(stageId, context)`: Execute a specific pipeline stage
- `getNextStage(completedStages)`: Determine which stage runs next
- `getAvailableOutputs()`: List all available output types

**MethodContext** provides: researchGoal, analyticalLens, corpus (merged text),
previousResults (Map of stage ID to result), and optional feedback for
regeneration.

**MethodResult** captures: stageId, data (stage-specific output), methodology
(how AI approached the analysis), observations (facts), inferences
(interpretations), recommendations (actions), uncertainties (unknowns),
conflicts (source disagreements), and nextQuestions (follow-up investigations).

---

## Human-in-the-Loop Pipeline

Seven checkpoint stages gate AI output through human review:

1. **DATA_REVIEW**: Review collected data, toggle sources on/off
2. **INGESTION**: AI analyzes corpus structure; user reviews key entities
3. **THEMES**: AI extracts themes; user promotes, demotes, or edits
4. **PERSONAS**: AI synthesizes personas; user validates
5. **[Dynamic branches]**: Methodology-specific stages with per-stage checkpoints
6. **DECK_STRUCTURE**: McKinsey SCR narrative arc; user reorders slides
7. **NARRATIVE**: Evidence-backed slide content generation
8. **FINAL**: Asset visualization (images, video)

At every checkpoint, the user can approve, edit, or regenerate with feedback.
No stage advances without explicit human approval.

---

## Wiki Integration Rules

- Each research execution is logged in wiki/log.md
- Deep research findings trigger INGEST, fanning out across wiki pages
- Methodology-specific insights are filed into wiki/synthesis/
- The Karpathy Second Brain methodology is the closest analog to the wiki
  compounding architecture

Cross-references: [[deep-research/research-modes]], [[deep-research/knowledge-graph]], [[methodologies/analytical-lenses]]
