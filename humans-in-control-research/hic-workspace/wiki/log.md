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


## [2026-04-21] generate | Identify named university case studies from 2025 and 2026, specifically related 
  - themes: 34
  - personas: 0
  - recommendations: 0
  - sources: 169
  - evidence: 860


## [2026-04-21] ingest | Engagement memory: identify-named-university-case-studies-from-2025-a
  - goal: Identify named university case studies from 2025 and 2026, specifically related 
  - themes: 34
  - personas: 0
  - recommendations: 0
  - sources: 169


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:11:22.376Z


## [2026-05-22] lint | Wiki health check (run lint_1779451882694)
- pages_scanned: 122
- total_findings: 271
- errors: 0
- warnings: 187
- info: 84
- duration_ms: 6538
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:14:27.499Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:16:41.349Z


## [2026-05-22] learn | Learning pass learn_1779452217553
  - clusters: 1
  - applied: 0
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - constraints_retired: 0
  - duration_ms: 1334


## [2026-05-22] learn | Learning pass learn_1779452272488
  - clusters: 2
  - applied: 1
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - constraints_retired: 0
  - duration_ms: 2630


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:20:58.498Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:32:19.910Z


## [2026-05-22] learn | Learning pass learn_1779453164057
  - clusters: 3
  - applied: 2
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - constraints_retired: 0
  - duration_ms: 9604


## [2026-05-22] compile | Wiki compile run compile_1779453211760
  - synthesis_regenerated: 3
  - patterns_compiled: 0
  - duration_ms: 38293


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:36:29.839Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:38:19.255Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:38:24.057Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:50:00.911Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:59:26.953Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T12:59:59.781Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T13:00:43.636Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T13:13:50.816Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T13:31:42.752Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T13:33:39.203Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T13:39:53.709Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T14:59:42.819Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T15:02:03.698Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T15:39:07.918Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T15:50:03.775Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T16:02:16.451Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T16:05:42.114Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T16:09:55.775Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:05:10.633Z


## [2026-05-22] lint | Wiki health check (run lint_1779483915780)
- pages_scanned: 130
- total_findings: 366
- errors: 0
- warnings: 277
- info: 89
- duration_ms: 12476
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:15:15.601Z


## [2026-05-22] lint | Wiki health check (run lint_1779484520733)
- pages_scanned: 130
- total_findings: 445
- errors: 0
- warnings: 356
- info: 89
- duration_ms: 11656
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:19:21.719Z


## [2026-05-22] lint | Wiki health check (run lint_1779484766801)
- pages_scanned: 130
- total_findings: 524
- errors: 0
- warnings: 435
- info: 89
- duration_ms: 19434
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:23:59.702Z


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:24:05.388Z


## [2026-05-22] lint | Wiki health check (run lint_1779485050523)
- pages_scanned: 130
- total_findings: 603
- errors: 0
- warnings: 514
- info: 89
- duration_ms: 9909
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:26:30.370Z


## [2026-05-22] lint | Wiki health check (run lint_1779485195485)
- pages_scanned: 130
- total_findings: 682
- errors: 0
- warnings: 593
- info: 89
- duration_ms: 10217
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T21:58:41.816Z


## [2026-05-22] lint | Wiki health check (run lint_1779487126904)
- pages_scanned: 130
- total_findings: 761
- errors: 0
- warnings: 672
- info: 89
- duration_ms: 11300
- next_due: 2026-05-29


## [2026-05-22] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-22T23:22:05.315Z


## [2026-05-22] lint | Wiki health check (run lint_1779492130503)
- pages_scanned: 130
- total_findings: 840
- errors: 0
- warnings: 751
- info: 89
- duration_ms: 17560
- next_due: 2026-05-29


## [2026-05-22] compile | Wiki compile run compile_1779493401234
  - synthesis_regenerated: 1
  - patterns_compiled: 0
  - duration_ms: 15569


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T00:09:15.430Z


## [2026-05-23] lint | Wiki health check (run lint_1779494960891)
- pages_scanned: 131
- total_findings: 921
- errors: 0
- warnings: 832
- info: 89
- duration_ms: 18174
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T00:14:54.961Z


## [2026-05-23] lint | Wiki health check (run lint_1779495300115)
- pages_scanned: 132
- total_findings: 1633
- errors: 0
- warnings: 1544
- info: 89
- duration_ms: 21034
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T00:27:53.848Z


## [2026-05-23] lint | Wiki health check (run lint_1779496079035)
- pages_scanned: 132
- total_findings: 2345
- errors: 0
- warnings: 2256
- info: 89
- duration_ms: 24517
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T02:17:52.489Z


## [2026-05-23] lint | Wiki health check (run lint_1779502677639)
- pages_scanned: 132
- total_findings: 3056
- errors: 0
- warnings: 2967
- info: 89
- duration_ms: 26593
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T02:28:53.099Z


## [2026-05-23] lint | Wiki health check (run lint_1779503338648)
- pages_scanned: 132
- total_findings: 3767
- errors: 0
- warnings: 3678
- info: 89
- duration_ms: 22751
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T02:42:46.332Z


## [2026-05-23] lint | Wiki health check (run lint_1779504171468)
- pages_scanned: 132
- total_findings: 4478
- errors: 0
- warnings: 4389
- info: 89
- duration_ms: 60646
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T10:26:12.690Z


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T10:26:16.650Z


## [2026-05-23] lint | Wiki health check (run lint_1779531981906)
- pages_scanned: 132
- total_findings: 5189
- errors: 0
- warnings: 5100
- info: 89
- duration_ms: 25500
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T10:32:42.120Z


## [2026-05-23] lint | Wiki health check (run lint_1779532367504)
- pages_scanned: 132
- total_findings: 5900
- errors: 0
- warnings: 5811
- info: 89
- duration_ms: 20098
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T10:36:12.940Z


## [2026-05-23] lint | Wiki health check (run lint_1779532578112)
- pages_scanned: 132
- total_findings: 6611
- errors: 0
- warnings: 6522
- info: 89
- duration_ms: 28186
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T10:37:10.362Z


## [2026-05-23] lint | Wiki health check (run lint_1779532635491)
- pages_scanned: 132
- total_findings: 7322
- errors: 0
- warnings: 7233
- info: 89
- duration_ms: 21449
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T11:49:45.265Z


## [2026-05-23] lint | Wiki health check (run lint_1779536990524)
- pages_scanned: 132
- total_findings: 8033
- errors: 0
- warnings: 7944
- info: 89
- duration_ms: 34721
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T11:56:17.173Z


## [2026-05-23] lint | Wiki health check (run lint_1779537382340)
- pages_scanned: 132
- total_findings: 8744
- errors: 0
- warnings: 8655
- info: 89
- duration_ms: 21645
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T11:57:03.580Z


## [2026-05-23] lint | Wiki health check (run lint_1779537428822)
- pages_scanned: 132
- total_findings: 9455
- errors: 0
- warnings: 9366
- info: 89
- duration_ms: 22014
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T12:04:44.030Z


## [2026-05-23] lint | Wiki health check (run lint_1779537889169)
- pages_scanned: 133
- total_findings: 10170
- errors: 0
- warnings: 10081
- info: 89
- duration_ms: 26716
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T12:14:42.860Z


## [2026-05-23] lint | Wiki health check (run lint_1779538488891)
- pages_scanned: 133
- total_findings: 10881
- errors: 0
- warnings: 10792
- info: 89
- duration_ms: 22524
- next_due: 2026-05-30


## [2026-05-23] compile | Wiki compile run compile_1779539093665
  - synthesis_regenerated: 1
  - patterns_compiled: 0
  - duration_ms: 18781


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T14:44:11.546Z


## [2026-05-23] lint | Wiki health check (run lint_1779547456721)
- pages_scanned: 134
- total_findings: 11594
- errors: 0
- warnings: 11505
- info: 89
- duration_ms: 33029
- next_due: 2026-05-30


## [2026-05-23] compile | Wiki compile run compile_1779548615769
  - synthesis_regenerated: 1
  - patterns_compiled: 0
  - duration_ms: 16940


## [2026-05-23] learn | Learning pass learn_1779553974488
  - clusters: 3
  - applied: 2
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 8990


## [2026-05-23] learn | Learning pass learn_1779553976206
  - clusters: 3
  - applied: 2
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 9130


## [2026-05-23] learn | Learning pass learn_1779553978614
  - clusters: 3
  - applied: 2
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 8789


## [2026-05-23] learn | Learning pass learn_1779554016175
  - clusters: 3
  - applied: 2
  - queued: 1
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 9625


## [2026-05-23] learn | Learning pass learn_1779554314639
  - clusters: 4
  - applied: 2
  - queued: 2
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 13033


## [2026-05-23] learn | Learning pass learn_1779554316243
  - clusters: 4
  - applied: 2
  - queued: 2
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 13134


## [2026-05-23] learn | Learning pass learn_1779554571448
  - clusters: 5
  - applied: 2
  - queued: 3
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 16957


## [2026-05-23] learn | Learning pass learn_1779554575258
  - clusters: 5
  - applied: 2
  - queued: 3
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 16519


## [2026-05-23] learn | Learning pass learn_1779554643296
  - clusters: 5
  - applied: 2
  - queued: 3
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 16300


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T18:20:18.542Z


## [2026-05-23] lint | Wiki health check (run lint_1779560423687)
- pages_scanned: 135
- total_findings: 12305
- errors: 0
- warnings: 12216
- info: 89
- duration_ms: 36823
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T18:23:09.547Z


## [2026-05-23] lint | Wiki health check (run lint_1779560594692)
- pages_scanned: 135
- total_findings: 13016
- errors: 0
- warnings: 12927
- info: 89
- duration_ms: 30135
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T18:26:19.485Z


## [2026-05-23] lint | Wiki health check (run lint_1779560784650)
- pages_scanned: 135
- total_findings: 13727
- errors: 0
- warnings: 13638
- info: 89
- duration_ms: 35419
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T18:45:56.870Z


## [2026-05-23] lint | Wiki health check (run lint_1779561962039)
- pages_scanned: 135
- total_findings: 14438
- errors: 0
- warnings: 14349
- info: 89
- duration_ms: 35881
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T18:48:26.021Z


## [2026-05-23] lint | Wiki health check (run lint_1779562111223)
- pages_scanned: 135
- total_findings: 15149
- errors: 0
- warnings: 15060
- info: 89
- duration_ms: 30428
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T19:34:07.028Z


## [2026-05-23] lint | Wiki health check (run lint_1779564852185)
- pages_scanned: 135
- total_findings: 15860
- errors: 0
- warnings: 15771
- info: 89
- duration_ms: 41102
- next_due: 2026-05-30


## [2026-05-23] compile | Wiki compile run compile_1779566130869
  - synthesis_regenerated: 1
  - patterns_compiled: 0
  - duration_ms: 15795


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T20:01:48.862Z


## [2026-05-23] lint | Wiki health check (run lint_1779566514002)
- pages_scanned: 136
- total_findings: 16574
- errors: 0
- warnings: 16485
- info: 89
- duration_ms: 33265
- next_due: 2026-05-30


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T20:03:44.228Z


## [2026-05-23] lint | Wiki health check (run lint_1779566629376)
- pages_scanned: 136
- total_findings: 17285
- errors: 0
- warnings: 17196
- info: 89
- duration_ms: 31552
- next_due: 2026-05-30


## [2026-05-23] compile | Wiki compile run compile_1779567869700
  - synthesis_regenerated: 1
  - patterns_compiled: 0
  - duration_ms: 20098


## [2026-05-23] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-23T21:33:27.757Z


## [2026-05-23] lint | Wiki health check (run lint_1779572012896)
- pages_scanned: 137
- total_findings: 17997
- errors: 0
- warnings: 17908
- info: 89
- duration_ms: 33403
- next_due: 2026-05-30


## [2026-05-24] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-24T13:59:52.184Z


## [2026-05-24] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-24T13:59:56.020Z


## [2026-05-24] lint | Wiki health check (run lint_1779631201122)
- pages_scanned: 137
- total_findings: 18708
- errors: 0
- warnings: 18619
- info: 89
- duration_ms: 39441
- next_due: 2026-05-31


## [2026-05-24] learn | Learning pass learn_1779631935960
  - clusters: 5
  - applied: 2
  - queued: 3
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 22825


## [2026-05-24] learn | Learning pass learn_1779631948261
  - clusters: 6
  - applied: 2
  - queued: 4
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 45457


## [2026-05-24] learn | Learning pass learn_1779632021855
  - clusters: 6
  - applied: 2
  - queued: 4
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 19261


## [2026-05-24] compile | Wiki compile run compile_1779632037164
  - synthesis_regenerated: 1
  - patterns_compiled: 0
  - duration_ms: 19219


## [2026-05-24] learn | Learning pass learn_1779632086429
  - clusters: 6
  - applied: 2
  - queued: 4
  - rejected: 0
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 20918


## [2026-05-24] learn | Learning pass learn_1779632794059
  - clusters: 6
  - applied: 2
  - queued: 3
  - rejected: 1
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 18764


## [2026-05-24] learn | Learning pass learn_1779632795127
  - clusters: 6
  - applied: 2
  - queued: 3
  - rejected: 1
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 19551


## [2026-05-24] learn | Learning pass learn_1779632833440
  - clusters: 6
  - applied: 2
  - queued: 3
  - rejected: 1
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 19486


## [2026-05-24] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-24T16:35:59.939Z


## [2026-05-24] lint | Wiki health check (run lint_1779640565091)
- pages_scanned: 143
- total_findings: 37217
- errors: 0
- warnings: 37128
- info: 89
- duration_ms: 46843
- next_due: 2026-05-31


## [2026-05-24] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-24T16:57:32.131Z


## [2026-05-24] lint | Wiki health check (run lint_1779641857266)
- pages_scanned: 143
- total_findings: 55715
- errors: 0
- warnings: 55626
- info: 89
- duration_ms: 8127
- next_due: 2026-05-31


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T03:37:35.643Z


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T12:50:18.851Z


## [2026-05-25] lint | Wiki health check (run lint_1779713423945)
- pages_scanned: 144
- total_findings: 74219
- errors: 0
- warnings: 74130
- info: 89
- duration_ms: 4787
- next_due: 2026-06-01


## [2026-05-25] compile | Wiki compile run compile_1779714483826
  - synthesis_regenerated: 4
  - patterns_compiled: 0
  - duration_ms: 51442


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T13:35:22.986Z


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T14:42:45.762Z


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T15:32:30.492Z


## [2026-05-25] compile | Wiki compile run compile_1779724503062
  - synthesis_regenerated: 3
  - patterns_compiled: 0
  - duration_ms: 47561


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T18:23:24.956Z


## [2026-05-25] compile | Wiki compile run compile_1779734191664
  - synthesis_regenerated: 5
  - patterns_compiled: 0
  - duration_ms: 60856


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T19:14:21.575Z


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T23:14:21.604Z


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T23:20:45.350Z


## [2026-05-25] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-25T23:54:07.265Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T00:22:23.865Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T00:52:20.614Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T01:06:09.277Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T01:09:51.950Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T02:01:14.429Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T02:15:54.811Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T02:15:57.198Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T11:21:11.193Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:00:43.093Z


## [2026-05-26] lint | Wiki health check (run lint_1779796848236)
- pages_scanned: 151
- total_findings: 148223
- errors: 0
- warnings: 148134
- info: 89
- duration_ms: 119381
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:10:34.731Z


## [2026-05-26] lint | Wiki health check (run lint_1779797439851)
- pages_scanned: 152
- total_findings: 296207
- errors: 0
- warnings: 296118
- info: 89
- duration_ms: 6788
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:14:38.688Z


## [2026-05-26] lint | Wiki health check (run lint_1779797683914)
- pages_scanned: 152
- total_findings: 444190
- errors: 0
- warnings: 444101
- info: 89
- duration_ms: 6912
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:15:29.531Z


## [2026-05-26] lint | Wiki health check (run lint_1779797734867)
- pages_scanned: 152
- total_findings: 592173
- errors: 0
- warnings: 592084
- info: 89
- duration_ms: 8448
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:21:12.309Z


## [2026-05-26] lint | Wiki health check (run lint_1779798077454)
- pages_scanned: 152
- total_findings: 740156
- errors: 0
- warnings: 740067
- info: 89
- duration_ms: 9076
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:38:00.537Z


## [2026-05-26] lint | Wiki health check (run lint_1779799085675)
- pages_scanned: 152
- total_findings: 888139
- errors: 0
- warnings: 888050
- info: 89
- duration_ms: 20693
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T12:45:45.923Z


## [2026-05-26] lint | Wiki health check (run lint_1779799551025)
- pages_scanned: 152
- total_findings: 1036122
- errors: 0
- warnings: 1036033
- info: 89
- duration_ms: 20932
- next_due: 2026-06-02


## [2026-05-26] compile | Wiki compile run compile_1779800355851
  - synthesis_regenerated: 4
  - patterns_compiled: 0
  - duration_ms: 71448


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T13:28:15.420Z


## [2026-05-26] lint | Wiki health check (run lint_1779802100697)
- pages_scanned: 153
- total_findings: 1184106
- errors: 0
- warnings: 1184017
- info: 89
- duration_ms: 17879
- next_due: 2026-06-02


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T14:01:49.930Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T14:19:22.719Z


## [2026-05-26] compile | Wiki compile run compile_1779806241851
  - synthesis_regenerated: 3
  - patterns_compiled: 0
  - duration_ms: 59638


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T15:16:15.247Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T18:00:06.061Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T18:17:47.330Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T19:47:36.927Z


## [2026-05-26] learn | Learning pass learn_1779825179412
  - clusters: 6
  - applied: 2
  - queued: 3
  - rejected: 1
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 19867


## [2026-05-26] learn | Learning pass learn_1779825177903
  - clusters: 6
  - applied: 2
  - queued: 3
  - rejected: 1
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 21839


## [2026-05-26] learn | Learning pass learn_1779825210839
  - clusters: 6
  - applied: 2
  - queued: 3
  - rejected: 1
  - skills_touched: none
  - chunk_configs_promoted: none
  - constraints_retired: 0
  - duration_ms: 21171


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T19:56:11.408Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T20:01:11.457Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T20:02:50.978Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T20:02:58.545Z


## [2026-05-26] session | AI Analyst session started
  - user_agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)
  - started_at: 2026-05-26T20:05:35.199Z

