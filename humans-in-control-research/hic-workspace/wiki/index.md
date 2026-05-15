# Humans in Control -- Wiki Index
> Last updated: 2026-04-10 | Total pages: 48 | Total sources: 0 | Data connectors: 150+

## Frameworks (11 pages)
- [[frameworks/personas]] -- Cooper goal-directed + JTBD persona specification (14 sections)
- [[frameworks/deck]] -- Minto Pyramid + SCR consulting deck specification
- [[frameworks/script]] -- Google Conversation Design + Rasa CALM script specification (12 components)
- [[frameworks/blueprint]] -- Bitner five-component service blueprint specification (5 swimlanes, 3 lines)
- [[frameworks/architecture]] -- C4 Model + TOGAF + Well-Architected technology architecture (20 sections)
- [[frameworks/prd]] -- Cagan/SVPG + Amazon PR/FAQ product requirements document (16 sections)
- [[frameworks/roadmap]] -- NOW-NEXT-LATER + Outcome-based strategic roadmap (14 dimensions)
- [[frameworks/strategy]] -- Rumelt's Kernel + Playing to Win CX strategy (15 sections)
- [[frameworks/gap-analysis]] -- Gartner CX Maturity + Parasuraman gaps model (8 dimensions)
- [[frameworks/tech-audit]] -- COBIT 2019 + Forrester TEI technology audit (15 dimensions)
- [[frameworks/competitive]] -- Porter's Five Forces + Blue Ocean competitive analysis (15 dimensions)

## Brand (6 pages)
- [[brand/identity]] -- Full CSS variable system, stark white + dark templates, typography, spacing
- [[brand/illustration-style]] -- Flat, geometric, vector minimalism rules and examples
- [[brand/chart-standards]] -- McKinsey/Zelazny data visualization rules, approved chart types
- [[brand/layout-patterns]] -- 6 layout patterns: split panel, section divider, recommendation callout, evidence block, stat callout, grid matrix
- [[brand/anti-slop]] -- Banned visual patterns, banned language, AI-generation detection rules
- [[brand/reference-deck]] -- Design DNA extracted from The Ordinary Personal Shopper Analysis deck (PENDING INGEST)

## Anti-Patterns (11 pages)
- [[anti-patterns/personas]] -- Demographics-first, elastic personas, missing JTBD, no scenarios
- [[anti-patterns/deck]] -- Topic titles, buried lead, death by bullets, pie charts, missing sources
- [[anti-patterns/script]] -- Robot voice, infinite retry, dead-end conversations, no escalation
- [[anti-patterns/blueprint]] -- Missing backstage, no fail points, all positive emotions, static
- [[anti-patterns/architecture]] -- Big Ball of Mud, Golden Hammer, security afterthought, missing NFRs
- [[anti-patterns/prd]] -- Solution-as-problem, feature list, vacuous criteria, missing scope
- [[anti-patterns/roadmap]] -- Feature factory, date theater, never updated, no tech debt allocation
- [[anti-patterns/strategy]] -- Goals-as-strategy, fluff, no diagnosis, boiling the ocean
- [[anti-patterns/gap-analysis]] -- Maturity theater, uniform target, no business impact, generic recs
- [[anti-patterns/tech-audit]] -- Vendor hallucination, missing shadow IT, no retire recommendations
- [[anti-patterns/competitive]] -- Feature matrix only, stale intel, self-congratulatory, no battlecard

## Benchmarks (5 pages)
- [[benchmarks/cx-metrics]] -- NPS/CSAT/CES benchmarks by industry, CX ROI data (~25 data points)
- [[benchmarks/technology-adoption]] -- MarTech utilization, AI adoption, digital transformation stats (~20 data points)
- [[benchmarks/maturity-models]] -- Gartner 5-stage vs Forrester 4-stage CX maturity distribution (~15 data points)
- [[benchmarks/financial-impact]] -- CX ROI, cost-of-bad-CX, CLV multipliers, acquisition vs retention (~15 data points)
- [[benchmarks/competitive-intel]] -- CI adoption rates, win/loss benchmarks, market research spend (~10 data points)

## Sources Registry (2 pages)
- [[sources-registry/connector-catalog]] -- Master catalog of all 150+ data source connectors across 16 categories (academic, news, government, social, AI research, etc.)
- [[sources-registry/credibility-tiers]] -- 3-tier credibility system, source provenance tracking, freshness scoring, citation span architecture

## Social Intelligence (3 pages)
- [[social-intelligence/sentiment-pipeline]] -- 10-stage sentiment pipeline: VADER + RoBERTa + ABSA + BERTopic + SBERT + LLM synthesis
- [[social-intelligence/topic-modeling]] -- BERTopic + pgvector semantic search + RAG system for social data analysis
- [[social-intelligence/cx-mesh]] -- CX Mesh integration: Reddit, TrustPilot, PlayStore collection and Voice of Customer patterns

## Deep Research (3 pages)
- [[deep-research/research-modes]] -- 3 depth modes (Quick/Focused/Deep), 6 AI models, research fabric orchestration pipeline
- [[deep-research/knowledge-graph]] -- Knowledge graph: source -> evidence -> theme -> persona -> recommendation node/edge architecture
- [[deep-research/document-ingestion]] -- User document upload (PDF/TXT/JSON/CSV/DOC), corpus construction, RAG architecture, evidence quality mapping

## Research Methodologies (2 pages)
- [[methodologies/research-fabric]] -- 7 research methods (General Synthesis, JTBD, Design Thinking, Contextual Inquiry, Service Blueprint, NPS Diagnostic, Karpathy Second Brain)
- [[methodologies/analytical-lenses]] -- 6 analytical lenses with domain-specific persona extensions and journey stages

## Evidence (2 stub pages -- pending source ingestion)
- [[evidence/cx-maturity]] -- CX maturity evidence collection (EMPTY -- needs source ingest)
- [[evidence/digital-transformation]] -- Digital transformation evidence collection (EMPTY -- needs source ingest)

## Industries (0 pages -- pending creation)
> Industry adaptation pages will be created as engagement-specific sources are ingested.

## Inspiration Hub (canonical design-system showcase -- 2026-05-14)
- **CANONICAL** [AI Experience Patterns showcase](inspiration-hub/ai-patterns/index.html) -- **72 hand-authored AI interaction patterns** across 11 sections (conversation, reasoning, decision, generation, oversight, configuration, workflow, search, data, trust, **A-Spot promo banners**) rendered live in BOTH NXT and NU design systems with brand toggle. Zero external image dependencies. Real Northeastern N logo embedded on NU brand surfaces. Dicebear headshots on persona surfaces (no more initials). Machine-readable index at [`_catalog.json`](inspiration-hub/ai-patterns/_catalog.json).
- **EXEMPLAR APPS** (compose strictly from the catalog — zero invented UI):
  - [Trailblazer Match — NU brand](inspiration-hub/exemplar-apps/trailblazer-match-nu.html) -- alumni mentor matching for first-gen Khoury students. Composes 7 catalog patterns: p-pers, p-trail, p-rec, p-dial, p-hitl, p-chat, p-trans. Synthetic data throughout: Priya/Marcus/Dr. Park, 87% match confidence, 14-alumni reasoning trail, advisor-approved outbound email.
  - [Footprint Library — NXT brand](inspiration-hub/exemplar-apps/footprint-library-nxt.html) -- anonymized alumni journey archive (radical-reinterpretation frame, p=0.05 from the VS distribution). Composes 10 catalog patterns: p-search, p-facet, p-tldr, p-sim, p-kg, p-cohort, p-budget, p-trans, p-heat, p-cot. Deep synthetic data: 18 anonymized journeys, full 8-turn interview transcript, retention-by-archetype matrix, cross-journey pattern extraction.
- [Behance reference library](inspiration-hub/index.html) -- 127 exemplars across 21 interaction archetypes with brand-toggleable mini-patterns. Pending: deeper Pattern Translation pages per exemplar.
- [Real UI Gallery](inspiration-hub/real-ui/index.html) -- **paused** -- HF datasets-server requires Key-Pair-Id auth and cannot be hotlinked; rebuild requires server-side image download via the proxy. Until then, the AI Patterns showcase is the canonical reference.
- [[exemplars/behance/ai-chatbot/niva-ai-family-assistant]] -- sample Pattern Translation page with Claude Opus 4.7 + Verbalized Sampling framings (5 #NXT + 5 #NU candidates at distinct probabilities)
- Raw index: [`exemplars/behance/_raw_index.json`](exemplars/behance/_raw_index.json) -- consolidated Behance metadata

## Exemplars (legacy directory, 1 spec page)
- [exemplars/persona-card-spec.html](exemplars/persona-card-spec.html) -- persona card visualization spec
> Other gold-standard examples will be compiled from approved generated output.

## Engagements (0 pages -- pending creation)
> Per-client context pages will be created as engagements begin.

## Synthesis (1 page)
- [[synthesis/enhancement-plan]] -- Full enhancement plan: Foundation Fixes / Pipeline Upgrades / Deep Enhancement

## Sources (0 pages -- pending ingestion)
> Source summary pages will be created via the INGEST operation.
