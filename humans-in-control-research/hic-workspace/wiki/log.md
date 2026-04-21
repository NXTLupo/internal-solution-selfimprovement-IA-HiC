# Humans in Control -- Wiki Operations Log

> Append-only chronological record. Every INGEST, GENERATE, and LINT operation gets an entry.

---

## [2026-04-10] bootstrap | Wiki Architecture Initialization
- Operation: Full wiki bootstrap from HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md
- Pages created: 11 framework pages, 6 brand pages, 11 anti-pattern pages, 5 benchmark pages, 2 evidence stubs
- Source material: Agent instructions document (Part VII specifications)
- Key decisions:
  - Stark white template designated as default for all HiC deliverables
  - Gartner vs Forrester maturity model contradiction flagged in benchmarks/maturity-models
  - All benchmark data marked HYPOTHESIS until verified against ingested primary sources
  - Reference deck page (brand/reference-deck) created as stub pending PPTX ingest
- Next actions: Ingest source documents from .claude/skills/intelligence/ to seed evidence pages

## [2026-04-10] bootstrap | Wiki Bootstrap Complete
- Final page count: 38 wiki pages across 7 directories
  - Frameworks: 11 (personas, deck, script, blueprint, architecture, prd, roadmap, strategy, gap-analysis, tech-audit, competitive)
  - Brand: 6 (identity, illustration-style, chart-standards, layout-patterns, anti-slop, reference-deck)
  - Anti-Patterns: 11 (one per deliverable type, 8-12 patterns each)
  - Benchmarks: 5 (cx-metrics, technology-adoption, maturity-models, financial-impact, competitive-intel)
  - Evidence: 2 (stubs -- cx-maturity, digital-transformation)
  - Synthesis: 1 (enhancement-plan)
  - Root: 2 (index, log)
- Source documents copied: 11 files across client-docs/, research/, frameworks/, assets/
- Code integration:
  - Created services/wikiService.ts -- reads wiki pages, assembles enhanced prompts, scores quality, detects slop
  - Updated services/deliverableFrameworks.ts -- added getEnhancedFrameworkPrompt() that combines static prompts with wiki context
  - Updated vite.config.ts -- added wikiStaticPlugin() to serve wiki files at /hic-workspace/wiki/
- AGENTS.md (schema layer) installed at hic-workspace/AGENTS.md
- Status: Wiki foundation complete. Source ingestion and evidence population pending.
- Quality baseline: ~2.9/5.0 estimated (target: 3.8+/5.0 after wiki integration)

## [2026-04-10] bootstrap | Data Source & Research Intelligence Layer
- Operation: Extend wiki to account for all ~150+ data source connectors and research capabilities
- New directories created: sources-registry/, social-intelligence/, deep-research/, methodologies/
- Pages created:
  - sources-registry/connector-catalog.md -- master catalog of all 150+ connectors across 16 categories
  - sources-registry/credibility-tiers.md -- 3-tier system, provenance tracking, freshness scoring
  - social-intelligence/sentiment-pipeline.md -- 10-stage pipeline (VADER + RoBERTa + ABSA + BERTopic + SBERT + LLM)
  - social-intelligence/topic-modeling.md -- BERTopic + pgvector + RAG architecture
  - social-intelligence/cx-mesh.md -- Reddit/TrustPilot/PlayStore integration and VoC patterns
  - deep-research/research-modes.md -- 3 depth modes, 6 AI models, research fabric orchestration
  - deep-research/knowledge-graph.md -- Node/edge architecture for evidence traceability
  - methodologies/research-fabric.md -- 7 research methods, stage pipelines, method executor
  - methodologies/analytical-lenses.md -- 6 domain lenses with persona extensions and journey stages
- Code updates:
  - wikiService.ts: Added SocialIntelligenceContext and ResearchContext interfaces, updated loadGenerationContext() and assembleEnhancedPrompt() to include social/research context
  - wiki/index.md: Added 4 new sections (Sources Registry, Social Intelligence, Deep Research, Methodologies)
- Updated total page count: 47 wiki pages
- Key insight: The wiki must treat social sentiment data, deep research learnings, and semantic analysis results as first-class evidence that compounds across engagements


## [2026-04-12] verify | Deployment verification
  - all features confirmed in Docker


## [2026-04-12] generate | Quality score: recommendations
  - score: 83
  - constraints: 0
  - date: 2026-04-12


## [2026-04-12] generate | Quality score: recommendations
  - score: 100
  - constraints: 0
  - date: 2026-04-12


## [2026-04-12] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 8
  - recommendations: 8
  - sources: 147
  - evidence: 600


## [2026-04-12] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 8
  - recommendations: 8
  - sources: 147


## [2026-04-13] generate | Quality score: recommendations
  - score: 88
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: recommendations
  - score: 95
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 6
  - recommendations: 11
  - sources: 147
  - evidence: 631


## [2026-04-13] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 6
  - recommendations: 11
  - sources: 147


## [2026-04-13] generate | Quality score: recommendations
  - score: 95
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: recommendations
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 16
  - personas: 7
  - recommendations: 13
  - sources: 147
  - evidence: 721


## [2026-04-13] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 16
  - personas: 7
  - recommendations: 13
  - sources: 147


## [2026-04-13] generate | Quality score: journey_map
  - score: 95
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: recommendations
  - score: 68
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 16
  - personas: 6
  - recommendations: 12
  - sources: 147
  - evidence: 760


## [2026-04-13] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 16
  - personas: 6
  - recommendations: 12
  - sources: 147


## [2026-04-13] generate | Quality score: journey_map
  - score: 95
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: recommendations
  - score: 88
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-13] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-13


## [2026-04-14] generate | Quality score: journey_map
  - score: 45
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: journey_map
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: recommendations
  - score: 88
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 16
  - personas: 8
  - recommendations: 12
  - sources: 147
  - evidence: 784


## [2026-04-14] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 16
  - personas: 8
  - recommendations: 12
  - sources: 147


## [2026-04-14] generate | Quality score: journey_map
  - score: 75
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: recommendations
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 7
  - recommendations: 10
  - sources: 147
  - evidence: 822


## [2026-04-14] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 7
  - recommendations: 10
  - sources: 147


## [2026-04-14] generate | Quality score: journey_map
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: journey_map
  - score: 75
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_architecture
  - score: 95
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: recommendations
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: gap_analysis
  - score: 90
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: journey_map
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: recommendations
  - score: 85
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: gap_analysis
  - score: 95
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-14


## [2026-04-14] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 21
  - personas: 6
  - recommendations: 13
  - sources: 147
  - evidence: 656


## [2026-04-14] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 21
  - personas: 6
  - recommendations: 13
  - sources: 147


## [2026-04-15] generate | Quality score: journey_map
  - score: 95
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: prd
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: roadmap
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: recommendations
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: tech_audit
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 0
  - date: 2026-04-15


## [2026-04-15] learn | Anti-pattern: User consistently addeds "Updated Slide 12: layout"
  - type: deck_structure
  - detection: 5 edits, 5+ occurrences


## [2026-04-15] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 15
  - personas: 8
  - recommendations: 12
  - sources: 147
  - evidence: 743


## [2026-04-15] learn | Anti-pattern: User consistently correcteds "source_curation"
  - type: data_review
  - detection: 7 edits, 7+ occurrences


## [2026-04-15] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 15
  - personas: 8
  - recommendations: 12
  - sources: 147


## [2026-04-15] generate | Quality score: journey_map
  - score: 95
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: recommendations
  - score: 95
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: gap_analysis
  - score: 95
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 17
  - personas: 6
  - recommendations: 10
  - sources: 147
  - evidence: 739


## [2026-04-15] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 17
  - personas: 6
  - recommendations: 10
  - sources: 147


## [2026-04-15] generate | Quality score: journey_map
  - score: 70
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: recommendations
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-15] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-15


## [2026-04-16] generate | Quality score: journey_map
  - score: 95
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: recommendations
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: gap_analysis
  - score: 95
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: journey_map
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: journey_map
  - score: 85
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: journey_map
  - score: 50
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: recommendations
  - score: 95
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: journey_map
  - score: 70
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: recommendations
  - score: 88
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: gap_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Quality score: competitive_analysis
  - score: 100
  - constraints: 2
  - date: 2026-04-16


## [2026-04-16] generate | Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 5
  - recommendations: 10
  - sources: 147
  - evidence: 606


## [2026-04-16] ingest | Engagement memory: create-a-comprehensive-strategy-and-roadmap-of-tac
  - goal: Create a comprehensive strategy and roadmap of tactics for Northeastern Universi
  - themes: 18
  - personas: 5
  - recommendations: 10
  - sources: 147


## [2026-04-16] generate | Quality score: journey_map
  - score: 90
  - constraints: 2
  - date: 2026-04-16


## [2026-04-18] generate | Quality score: journey_map
  - score: 85
  - constraints: 2
  - date: 2026-04-18


## [2026-04-18] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-18


## [2026-04-18] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-18


## [2026-04-18] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-18


## [2026-04-18] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-18


## [2026-04-20] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-20


## [2026-04-20] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-20


## [2026-04-20] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-20


## [2026-04-20] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-20


## [2026-04-20] generate | ROLE You are an elite market research analyst embedded with a University's Advan
  - themes: 18
  - personas: 6
  - recommendations: 9
  - sources: 187
  - evidence: 1203


## [2026-04-20] ingest | Engagement memory: role-you-are-an-elite-market-research-analyst-embe
  - goal: ROLE You are an elite market research analyst embedded with a University's Advan
  - themes: 18
  - personas: 6
  - recommendations: 9
  - sources: 187


## [2026-04-21] generate | Quality score: tech_architecture
  - score: 100
  - constraints: 2
  - date: 2026-04-21


## [2026-04-21] generate | Quality score: prd
  - score: 100
  - constraints: 2
  - date: 2026-04-21


## [2026-04-21] generate | Quality score: roadmap
  - score: 100
  - constraints: 2
  - date: 2026-04-21


## [2026-04-21] generate | Quality score: tech_audit
  - score: 100
  - constraints: 2
  - date: 2026-04-21

