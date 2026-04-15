# Humans in Control v3.0: Re-Architecture Development Plan

## Claude 4.6 Agent Skills, Deterministic Hooks, and MCP Data Fabric

**Author**: NXT Humans Engineering  
**Date**: April 15, 2026  
**Branch**: `Humans-in-Control-Overhaul-04.14.2026`  
**Status**: Planning (pre-implementation)

---

## Executive Summary

The Humans-in-Control research platform (v2.0) has achieved functional completeness across 10 deliverable types, 14 pipeline stages, 100+ data sources, and a knowledge graph with full provenance tracking. However, the system suffers from fundamental architectural constraints that cannot be resolved through iterative prompt engineering:

1. **Monolithic AI Service**: `geminiService.ts` (2,883 lines) contains all 20+ generation functions in a single file, making each function compete for the same Gemini chat session context
2. **Sequential Pipeline Bottleneck**: 14 stages execute sequentially (8-15 min total), with no parallelization of independent deliverables
3. **Probabilistic Quality Gap**: The system relies entirely on prompt instructions to enforce citation mandates, evidence density, and content depth — with no deterministic verification
4. **Fragile Data Proxy**: 100+ data source connectors route through a Python CORS proxy with 45-second timeouts and synchronous HTTP polling
5. **Frontend-Orchestrated Logic**: App.tsx (2,947 lines) contains pipeline orchestration, state management, data filtering, and UI rendering in one monolithic component

This plan migrates the platform from a linear, frontend-orchestrated pipeline to a **decentralized multi-agent ecosystem** powered by Claude 4.6, Agent Skills, deterministic Hooks, and Model Context Protocol servers.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Root Cause Mapping: Known Issues to Architectural Constraints](#2-root-cause-mapping)
3. [Target Architecture: Multi-Agent Ecosystem](#3-target-architecture)
4. [Claude 4.6 Integration Strategy](#4-claude-46-integration-strategy)
5. [Agent Skills Decomposition](#5-agent-skills-decomposition)
6. [Deterministic Quality Hooks](#6-deterministic-quality-hooks)
7. [MCP Data Fabric](#7-mcp-data-fabric)
8. [Frontend Re-Architecture](#8-frontend-re-architecture)
9. [Export Pipeline Rebuild](#9-export-pipeline-rebuild)
10. [Knowledge Graph Evolution](#10-knowledge-graph-evolution)
11. [Self-Improvement Engine Migration](#11-self-improvement-engine-migration)
12. [Phased Migration Roadmap](#12-phased-migration-roadmap)
13. [Risk Assessment](#13-risk-assessment)
14. [Success Metrics](#14-success-metrics)

---

## 1. Current Architecture Analysis

### System Inventory (as of April 15, 2026)

| Component | File | Lines | Responsibility | Architectural Debt |
|---|---|---|---|---|
| Root Orchestrator | `App.tsx` | 2,947 | Pipeline control, state management, UI, data filtering, wiki integration | God component — violates single responsibility |
| AI Engine | `geminiService.ts` | 2,883 | 20+ generation functions, all share one Gemini chat session | Monolithic — context pollution between stages |
| Checkpoint UI | `AnalysisCheckpoint.tsx` | 2,444 | 14 checkpoint renderers, editing, approval flow | Giant switch statement across 14 stages |
| Results Renderer | `ResultsView.tsx` | 2,333 | 10 output tabs, export, slide editing | Mixes rendering with data transformation |
| Type System | `types.ts` | 971 | 50+ interfaces and enums | Evidence fields added retroactively, inconsistent |
| Post-Processor | `slidePostProcessor.ts` | ~900 | 15+ validation/correction functions | Compensates for AI failures instead of preventing them |
| Data Connectors | `dataSourceConnectors.ts` | ~500 | 100+ proxy-routed sources | All synchronous HTTP through single proxy |
| Knowledge Graph | `knowledgeGraphBuilder.ts` | ~500 | Incremental graph from deliverables | One-way (deliverables → graph), no graph → deliverables feedback |
| Wiki Engine | `wikiService.ts` + `promptImprovementEngine.ts` | ~1,000 | Self-improvement, banned phrases, quality gates | Bespoke mechanism duplicating native Claude capabilities |
| Layout Resolver | `layoutResolver.ts` | ~230 | Content blocks → archetype mapping | Works but disconnected from PPTX export |
| Export | `exportService.ts` | ~800 | PPTX, HTML, JSON | PPTX still uses old rigid archetype renderers |
| **TOTAL** | **5 core + 8 service files** | **~11,578** | | |

### Critical Data Flow Bottlenecks

```
BOTTLENECK 1: Sequential Pipeline
  Themes → Personas → Journey → PRD → Roadmap → Recs → Gap → Audit → Competitive
  (Each waits for the previous. Journey, PRD, Gap, Audit, Competitive are INDEPENDENT
   but execute sequentially because App.tsx orchestrates them in a single async function)

BOTTLENECK 2: Single Chat Session
  geminiService.ts creates ONE Gemini chat session. All 20+ generation functions
  share this session. By stage 8, the context is polluted with 7 prior deliverables.
  Persona enrichment uses a standalone call to AVOID this, but loses corpus access.

BOTTLENECK 3: 500KB Corpus Cap
  researchFabricOrchestrator.ts caps merged corpus at 500KB. With 1500 items,
  lower-relevance articles are truncated. They appear in the Knowledge Graph
  (which reads raw data) but never reach the AI. This is WHY the KG shows depth
  but deliverables don't.

BOTTLENECK 4: Probabilistic Quality
  "You MUST cite every priority article" is a prompt instruction.
  The AI may or may not comply. There is NO deterministic verification.
  12 known issues (KI-001 through KI-012) trace back to this gap.

BOTTLENECK 5: Synchronous Proxy
  100+ data sources polled through HTTP proxy with 45s timeout.
  Batch size: 6 concurrent requests. Backoff: 1.5s-4.5s.
  Total collection: 60-180 seconds. Frequent timeout failures.
```

---

## 2. Root Cause Mapping

Every known issue traces to one of five architectural constraints. Fixing the issues individually (as we've been doing) is whack-a-mole. The re-architecture addresses the ROOT CAUSES.

| Known Issue | Symptom | Root Cause | Architecture Fix |
|---|---|---|---|
| **KI-001**: Deck output quality | Thin content blocks, generic prose | Gemini generates structure + prose simultaneously; no pre-reasoning phase | **Agent Skill** with multi-phase generation + adaptive thinking |
| **KI-002**: PPTX uses old renderers | Broken templates in PowerPoint export | HTML renderer updated but PPTX not | **Unified export pipeline** from canonical slide model |
| **KI-003**: Priority citations not verified | AI may ignore priority flags | Probabilistic instruction, no deterministic check | **Hook** with exit code 2 auto-retry |
| **KI-004**: Evidence fields may be empty | AI returns empty citations[] arrays | Schema requires fields but no content validation | **Hook** validates content quality post-generation |
| **KI-005**: Persona depth limited | Standalone call loses corpus | Context contamination workaround sacrifices data | **Subagent** with isolated 1M context window |
| **KI-006**: 500KB corpus cap | Lower-relevance items truncated | Legacy context window limitation | **Claude 4.6** 1M token window eliminates cap |
| **KI-007**: Textarea sizing | Report sections overflow | Retroactive UI fix for content budget mismatch | **Frontend refactor** with proper auto-sizing |
| **KI-008**: No themes tab | Themes not viewable as output | ResultsView never built a themes renderer | **Component decomposition** with dedicated tab |
| **KI-009**: Competitive data hidden | Maturity matrix not rendered | Frontend rendering incomplete | **Component decomposition** |
| **KI-010**: Priority not persisted | Lost on refresh | Missing localStorage call | **State management** refactor |
| **KI-011**: KG not accessible | No keyboard nav on D3 graph | D3 SVG has no ARIA | **Accessibility pass** |
| **KI-012**: Tech arch sections hidden | 10 sections generated but not displayed | Frontend rendering incomplete | **Component decomposition** |

### The Five Root Causes

1. **Monolithic AI Service** → KI-001, KI-005
2. **No Deterministic Verification** → KI-003, KI-004
3. **Context Window Limitations** → KI-006
4. **Frontend Monolith** → KI-007, KI-008, KI-009, KI-010, KI-011, KI-012
5. **Disconnected Export Pipeline** → KI-002

---

## 3. Target Architecture: Multi-Agent Ecosystem

### Architecture Diagram

```
                           ┌─────────────────────────────┐
                           │       CLAUDE.md              │
                           │  (Global Memory + Rules)     │
                           │  - NXT Design System tokens  │
                           │  - 350+ banned phrases       │
                           │  - Citation protocol         │
                           │  - Consulting frameworks     │
                           └─────────────┬───────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
            ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
            │  PRIMARY AGENT │   │  HOOK ENGINE  │   │  MCP SERVERS  │
            │  (Orchestrator)│   │  (Validators) │   │  (Data Fabric)│
            │                │   │               │   │               │
            │ - Pipeline     │   │ - Citation    │   │ - Academic    │
            │   sequencing   │   │   validator   │   │ - Government  │
            │ - Checkpoint   │   │ - Evidence    │   │ - Social      │
            │   management   │   │   density     │   │ - Web Intel   │
            │ - State routing│   │ - Content     │   │ - CX Mesh     │
            │                │   │   budget      │   │               │
            └───────┬────────┘   │ - Slop guard  │   │ Tasks (async) │
                    │            └───────────────┘   └───────────────┘
       ┌────────────┼────────────────────┐
       │            │                    │
 ┌─────▼─────┐ ┌───▼────┐ ┌─────────────▼──────────────┐
 │ SUBAGENT  │ │SUBAGENT│ │     PARALLEL SUBAGENTS      │
 │ Themes +  │ │Personas│ │ (isolated worktree each)    │
 │ Synthesis │ │        │ │                              │
 │           │ │ (full  │ │ Journey │ PRD    │ Gap       │
 │ (1M ctx   │ │ corpus │ │ Map     │ +Road  │ Analysis  │
 │  window)  │ │ access)│ │         │ map    │           │
 └─────┬─────┘ └───┬────┘ │ Tech    │ Recs   │ Tech      │
       │            │      │ Arch    │        │ Audit     │
       │            │      │         │        │           │
       │            │      │ Compet. │        │           │
       │            │      └─────────┴────────┴───────────┘
       │            │                    │
       └────────────┼────────────────────┘
                    │
            ┌───────▼───────┐
            │ STRATEGIC     │
            │ REPORT AGENT  │
            │ (consumes all │
            │  deliverables)│
            └───────┬───────┘
                    │
            ┌───────▼───────┐
            │  DECK AGENT   │
            │ (derives from │
            │  report only) │
            └───────┬───────┘
                    │
            ┌───────▼───────┐
            │  EXPORT ENGINE│
            │ (canonical    │
            │  slide model  │
            │  → PDF/PPTX/  │
            │    HTML)      │
            └───────────────┘
```

### Key Architectural Principles

1. **Each deliverable is a Skill** — isolated instructions, isolated context, isolated execution
2. **Independent deliverables run in parallel** — Journey, PRD, Gap, Audit, Competitive can fork simultaneously
3. **Quality is deterministic, not probabilistic** — Hooks validate outputs and force retries on failure
4. **Data collection is asynchronous** — MCP Tasks primitive decouples network latency from reasoning
5. **The report is the single source of truth** — The deck is ALWAYS derived from the report, never generated independently
6. **Export reads from a canonical model** — One Slide data model feeds HTML, PDF, and PPTX renderers identically

---

## 4. Claude 4.6 Integration Strategy

### 4.1 Replacing Gemini as Primary AI

The current system uses Gemini 2.5 Flash for all generation via `@google/genai`. Claude 4.6 Opus/Sonnet provides:

| Capability | Gemini 2.5 Flash | Claude 4.6 | Impact |
|---|---|---|---|
| Context window | 1M tokens | 1M tokens | Parity — eliminates 500KB corpus cap regardless |
| Structured output | `responseMimeType: "application/json"` | JSON mode + tool use | More reliable schema adherence |
| Extended thinking | Not available | `thinking: {"type": "adaptive"}` | Deep reasoning before JSON serialization |
| Tool use | Limited | Native tool calling with parallel execution | Enables MCP integration |
| Agent orchestration | Not available | Subagent spawning with worktree isolation | Enables parallel deliverable generation |
| Hooks | Not available | Event-driven deterministic validation | Enables quality gates |

### 4.2 Migration Path: Gemini → Claude

The migration does NOT require replacing Gemini entirely. The architecture supports a hybrid model:

- **Claude 4.6 Opus**: Primary reasoning engine for deliverable generation (replaces Gemini chat session)
- **Claude 4.6 Sonnet**: Lightweight tasks (formatting, classification, quick queries)
- **Gemini 2.5 Flash**: Retained for image generation (Imagen 4) and video generation (VEO 3.1)
- **Tri-model analysis**: Preserved for corpus enrichment (Gemini + Claude + OpenAI in parallel)

### 4.3 Adaptive Thinking Configuration

Each Skill specifies its thinking budget:

| Skill | Thinking Effort | Rationale |
|---|---|---|
| Strategy Report | `max` | Most complex synthesis — all 10 deliverables + 200 sources |
| Strategy Deck | `max` | 12-type content block schema requires deep pre-reasoning |
| Personas | `high` | Evidence weaving across multiple source types |
| Gap Analysis | `high` | Maturity scoring requires cross-referencing corpus |
| Competitive | `high` | Named entity extraction + archetype analysis |
| Themes | `high` | Multi-dimensional analysis across 6 lenses |
| Journey Map | `medium` | Structured blueprint with known fields |
| PRD | `medium` | Feature mapping from personas/themes |
| Roadmap | `medium` | Timeline derivation from recommendations |
| Tech Architecture | `medium` | Node/flow extraction |
| Tech Audit | `medium` | Systems inventory |

### 4.4 Eliminating the 500KB Corpus Cap

With Claude 4.6's 1M token context window (~750KB of text), the corpus cap is eliminated:

```
BEFORE (Gemini via chat session):
  500KB cap → ~1000 items max → lowest-relevance items truncated
  → KG shows depth but deliverables don't

AFTER (Claude 4.6 per-skill):
  Each skill receives FULL corpus (no cap)
  + All user-included articles (no per-source limits)
  + Priority articles tagged for mandatory citation
  → Deliverables match KG depth
```

---

## 5. Agent Skills Decomposition

### 5.1 Skill Directory Structure

```
.claude/
├── CLAUDE.md                          # Global memory (replaces wikiService rules)
├── settings.json                      # Hooks, MCP config, permissions
├── skills/
│   ├── theme-analyst/
│   │   └── SKILL.md                   # Multi-dimensional thematic analysis
│   ├── persona-architect/
│   │   └── SKILL.md                   # Cooper + JTBD persona generation
│   ├── service-blueprint-mapper/
│   │   └── SKILL.md                   # Bitner 5-component journey mapping
│   ├── tech-arch-generator/
│   │   └── SKILL.md                   # C4 + TOGAF architecture
│   ├── prd-compiler/
│   │   └── SKILL.md                   # Cagan/SVPG product requirements
│   ├── roadmap-builder/
│   │   └── SKILL.md                   # NOW/NEXT/LATER strategic roadmap
│   ├── strategy-author/
│   │   └── SKILL.md                   # Rumelt + Minto strategic recommendations
│   ├── gap-analysis-evaluator/
│   │   └── SKILL.md                   # Gartner maturity gap assessment
│   ├── tech-audit-inspector/
│   │   └── SKILL.md                   # COBIT + Forrester TEI audit
│   ├── competitive-analyst/
│   │   └── SKILL.md                   # Porter + Blue Ocean competitive analysis
│   ├── strategic-report-writer/
│   │   └── SKILL.md                   # McKinsey whitepaper synthesis
│   └── deck-narrative-composer/
│       └── SKILL.md                   # Content-block deck derivation
├── agents/
│   ├── parallel-deliverable-runner.md # Orchestrates parallel subagent execution
│   └── quality-gate-enforcer.md       # Runs validation hooks
└── hooks/
    └── hooks.json                     # Event-driven validation configuration
```

### 5.2 Skill Specification: What Each SKILL.md Contains

Each SKILL.md follows a standard structure:

```markdown
---
name: persona-architect
description: Generate evidence-grounded research personas using Cooper + JTBD frameworks
context: fork                    # Runs as isolated subagent
thinking: high                   # Adaptive thinking effort level
---

# Persona Architect

## Input Contract
- Full research corpus (all user-included articles, no truncation)
- Themes with citations (from theme-analyst skill output)
- Research goal and analytical lens

## Output Contract
- 3-8 personas, each with:
  - REQUIRED: motivations[].quote (verbatim from source, with source name)
  - REQUIRED: painPoints[].quote (verbatim from source, with source name)
  - REQUIRED: evidenceCount >= 3 per persona
  - REQUIRED: confidenceLevel (EVIDENCED if 70%+ cite sources)

## Methodology
[Full Cooper + JTBD framework instructions...]

## Anti-Patterns
[Specific anti-patterns to avoid...]

## Evidence Mandates
[Liberal quoting rules, citation density requirements...]
```

### 5.3 Parallel Execution Model

```
DEPENDENCY GRAPH:

  Ingestion (sequential — must run first)
       │
  Themes (sequential — requires ingested context)
       │
  Personas (sequential — requires themes)
       │
  ┌────┼────────────┬────────────┬────────────┐
  │    │            │            │            │
  ▼    ▼            ▼            ▼            ▼
Journey PRD+Roadmap  Recs     Gap Analysis  Tech Audit
  Map                                    Competitive
  Tech Arch
  │    │            │            │            │
  └────┼────────────┴────────────┴────────────┘
       │
  Strategic Report (sequential — requires ALL deliverables)
       │
  Strategy Deck (sequential — derives from report)
```

**Parallel phase**: 7 independent deliverables execute simultaneously as isolated subagents. Each gets its own 1M-token context with the full corpus + themes + personas. No cross-contamination. Total time = longest single deliverable (~2-3 min) instead of sum of all (~10-12 min).

### 5.4 Strategy Deck: Multi-Phase Skill

The deck skill uses progressive disclosure (the biggest quality fix):

```
PHASE 1: NARRATIVE ARC PLANNING (thinking: max)
  Input: Strategic Report (full text)
  Output: 15-30 slide outline with narrative arc (no content yet)
  The model ONLY plans the story structure.

PHASE 2: PER-SLIDE CONTENT BLOCK GENERATION (thinking: high)
  Input: Slide outline + matched report section per slide
  Output: ContentBlock[] per slide (2-5 blocks each)
  The model ONLY declares what to communicate per slide.

PHASE 3: LAYOUT RESOLUTION (deterministic, no AI)
  Input: ContentBlock[] per slide
  Output: Resolved Slide objects with archetype + mapped fields
  layoutResolver.ts runs — zero AI involvement.

PHASE 4: DETERMINISTIC ENRICHMENT (no AI)
  Input: Resolved slides + report sections
  Output: Slides with guaranteed metrics, quotes, citations
  Direct data injection from report — zero AI involvement.
```

This separation ensures that **structural planning and prose generation never compete for the same computational resources**.

---

## 6. Deterministic Quality Hooks

### 6.1 Hook Architecture

Hooks execute OUTSIDE the probabilistic AI loop. They are shell commands triggered by lifecycle events.

```json
// .claude/settings.json (hooks section)
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "python scripts/validate_citations.py",
        "timeout": 30
      },
      {
        "type": "command",
        "command": "python scripts/validate_evidence_density.py",
        "timeout": 30
      },
      {
        "type": "command",
        "command": "python scripts/validate_content_budgets.py",
        "timeout": 15
      }
    ]
  }
}
```

### 6.2 Validation Scripts

#### `scripts/validate_citations.py` — Resolves KI-003

```python
# Reads the generated deliverable JSON from stdin
# Loads prioritySources from persistent storage
# Cross-references cited sources against priority mandate
# Exit code 0: all priority sources cited (PASS)
# Exit code 2: missing priority sources (BLOCK — forces agent retry)
# stderr: specific error message for agent to act on
```

**Behavior**: When exit code 2 fires, Claude receives the stderr message and autonomously regenerates the specific content block to include the missing citation. The frontend NEVER sees non-compliant output.

#### `scripts/validate_evidence_density.py` — Resolves KI-004

```python
# For each deliverable item (recommendation, gap, feature, etc.):
#   - Check citations[] is non-empty AND contains real source names
#   - Check evidenceBasis is non-empty AND > 30 chars
#   - Check no generic placeholders ("research shows", "studies indicate")
# Exit code 0: all items have real evidence (PASS)
# Exit code 2: items with empty/generic evidence (BLOCK)
```

#### `scripts/validate_content_budgets.py` — Replaces slidePostProcessor.ts for deck

```python
# For each slide:
#   - title <= 120 chars
#   - content[i] <= 200 chars
#   - quote <= 250 chars
#   - speaker_notes <= 600 chars
#   - No meta-narration patterns
#   - No banned slop phrases
# Exit code 0: all budgets met (PASS)
# Exit code 2: violations found (BLOCK)
```

### 6.3 Hook vs. Post-Processor Comparison

| Aspect | Current Post-Processor | Hook Architecture |
|---|---|---|
| When it runs | After AI finishes, before rendering | After AI finishes, BEFORE state update |
| What it can do | Fix/flag issues | **Block and force retry** |
| Auto-correction | Truncates, strips, removes | Agent regenerates the specific failing section |
| Determinism | Yes (regex/rules) | Yes (exit codes) |
| AI awareness | AI doesn't know post-processor exists | AI receives error message and self-corrects |
| Iteration limit | One pass | Configurable (typically 3 retries max) |

---

## 7. MCP Data Fabric

### 7.1 Replacing the Python CORS Proxy

The current proxy (`research-proxy` on port 5012) handles:
- `GET /api/search/{sourceId}?q=...&limit=...` — synchronous search
- `GET /api/multi-search?q=...&sources=...` — batch search
- `POST /api/ai/{provider}` — AI model routing

The MCP architecture replaces this with standardized, asynchronous data connectors:

```
BEFORE:
  React → fetch(proxy:5012/api/search/gdelt) → proxy → GDELT API → response → React
  (synchronous, 45s timeout, fragile)

AFTER:
  Claude Agent → MCP tools/call(query_news_sources) → MCP Server → Tasks API
  (asynchronous, durable, retry-safe)
  React polls tasks/get for progress → tasks/result when complete
```

### 7.2 MCP Tool Definitions

| MCP Tool | Sources Covered | Subagent Access |
|---|---|---|
| `query_academic_registries` | OpenAlex, Semantic Scholar, Crossref, DOAJ, arXiv | Themes, Gap Analysis, Strategy |
| `query_government_databases` | College Scorecard, Federal Register, Data.gov, FRED | Tech Audit, PRD, Gap Analysis |
| `query_news_intelligence` | GDELT, Higher Ed Dive, EdSurge, Hechinger Report | Themes, Competitive, Strategy |
| `query_social_sentiment` | Reddit (custom subreddits), TrustPilot, Play Store | Personas, Recommendations |
| `query_ai_landscape` | arXiv, HuggingFace, Papers with Code, AI Lab Blogs | Tech Architecture, Competitive |
| `execute_deep_research` | Gemini grounded search, Claude web search | Cross-Cutting Synthesis |
| `fetch_web_content` | Jina Reader (custom URLs), YouTube transcription | All skills |

### 7.3 Asynchronous Task Execution (SEP-1686)

```
1. Agent calls: tools/call(query_academic_registries, {taskId: "acad-001", query: "...", keepAlive: 300})
2. MCP Server returns immediately: {status: "submitted"}
3. Server begins async data collection (OpenAlex, Semantic Scholar, Crossref in parallel)
4. React polls: tasks/get(taskId: "acad-001") → {status: "running", progress: 45}
5. React updates LiveSourceFeed with progress
6. Collection completes: tasks/get → {status: "completed"}
7. Agent retrieves: tasks/result(taskId: "acad-001") → full corpus JSON
```

**Key benefit**: Network latency is completely decoupled from the reasoning loop. No more 45-second timeouts killing the pipeline.

---

## 8. Frontend Re-Architecture

### 8.1 Component Decomposition

The current `App.tsx` (2,947 lines) must be decomposed:

```
BEFORE:
  App.tsx — everything (state, pipeline, UI, filtering, wiki, KG)

AFTER:
  App.tsx — thin shell (routing, layout)
  ├── hooks/
  │   ├── usePipelineOrchestrator.ts  — pipeline state machine
  │   ├── useSourceCuration.ts        — exclude/include/priority logic
  │   ├── useWikiIntegration.ts       — wiki loading/saving
  │   └── useKnowledgeGraph.ts        — incremental KG building
  ├── components/
  │   ├── ConfigurationPanel/         — goal input, output selection, file upload, sources
  │   ├── LiveResearchBoard/          — reasoning stream, source feed, KG
  │   ├── CheckpointModal/            — generic checkpoint with stage-specific renderers
  │   │   ├── ThemesCheckpoint.tsx
  │   │   ├── PersonasCheckpoint.tsx
  │   │   ├── ReportCheckpoint.tsx
  │   │   ├── StructureCheckpoint.tsx
  │   │   ├── NarrativeCheckpoint.tsx
  │   │   └── ... (one per stage)
  │   ├── ResultsTabs/
  │   │   ├── ThemesTab.tsx           — NEW (resolves KI-008)
  │   │   ├── PersonasTab.tsx
  │   │   ├── DeckTab.tsx
  │   │   ├── RecommendationsTab.tsx
  │   │   ├── PRDTab.tsx
  │   │   ├── RoadmapTab.tsx
  │   │   ├── JourneyTab.tsx
  │   │   ├── TechArchTab.tsx         — with sections (resolves KI-012)
  │   │   ├── GapAnalysisTab.tsx
  │   │   ├── TechAuditTab.tsx
  │   │   ├── CompetitiveTab.tsx      — with maturity matrix (resolves KI-009)
  │   │   └── EvidenceBlock.tsx       — shared evidence display component
  │   └── ExportToolbar/
  │       ├── PDFExporter.tsx
  │       ├── PPTXExporter.tsx
  │       └── HTMLReportExporter.tsx
  └── services/
      ├── claudeAgentService.ts       — Claude 4.6 API wrapper (replaces geminiService.ts)
      ├── mcpDataService.ts           — MCP data fabric client
      └── exportService.ts            — unified export from canonical model
```

### 8.2 State Management

Replace React useState sprawl (45+ variables in App.tsx) with a proper state machine:

```typescript
// Pipeline state machine
type PipelineState =
  | { phase: 'idle' }
  | { phase: 'configuring'; goal: string; outputs: OutputOption[] }
  | { phase: 'collecting'; progress: CollectionProgress }
  | { phase: 'generating'; stage: AnalysisStage; deliverables: Partial<AllDeliverables> }
  | { phase: 'checkpoint'; stage: AnalysisStage; data: any }
  | { phase: 'complete'; result: AnalysisResult }
  | { phase: 'error'; error: string; recoverable: boolean };
```

### 8.3 Resolving Remaining UI Issues

| Issue | Fix | Component |
|---|---|---|
| KI-007: Textarea sizing | Auto-resize via ResizeObserver | ReportCheckpoint.tsx |
| KI-008: No themes tab | New ThemesTab.tsx with full citation display | ResultsTabs/ |
| KI-009: Competitive incomplete | Full maturity matrix + gap summary table | CompetitiveTab.tsx |
| KI-010: Priority not persisted | Add to useCuration hook with localStorage | useSourceCuration.ts |
| KI-011: KG accessibility | ARIA attributes + keyboard nav on detail panel | ResearchKnowledgeGraph.tsx |
| KI-012: Tech arch sections hidden | Display all 10 sections in tab | TechArchTab.tsx |

---

## 9. Export Pipeline Rebuild

### 9.1 The Canonical Slide Model

Currently, HTML rendering uses an adaptive renderer but PPTX uses old rigid archetypes (KI-002). The fix: ONE canonical `Slide` model that ALL renderers consume.

```typescript
// The canonical model (already defined in types.ts)
interface Slide {
  slideNumber: number;
  layout: SlideLayout;        // Resolved by layoutResolver
  title: string;
  content: string[];           // Evidence points
  metrics?: SlideMetric[];     // Data panel numbers
  bentoCells?: BentoCell[];    // Bento grid cells
  problemStat?: {...};         // Problem/solution
  solutionPoints?: {...}[];
  quote: string;
  sources: string[];           // Citation footnotes
  personaName?: string;
  personaImageUrl?: string;
  speakerNotes: string;
  style: SlideStyle;
}
```

### 9.2 Renderer Implementations

| Renderer | Input | Output | Status |
|---|---|---|---|
| HTML (screen) | Canonical Slide | React JSX (adaptive renderer) | Done (v2.0) |
| PDF (download) | HTML → html2canvas → jsPDF | PDF file | Done (v2.0, scale 1.5) |
| PPTX (download) | Canonical Slide → PptxGenJS | PPTX file | **NEEDS REWRITE** (KI-002) |
| HTML Report | StrategicReport → template | HTML file | Done (v2.0) |

The PPTX rewrite must:
1. Read from the SAME canonical Slide model as the HTML renderer
2. Use the adaptive layout logic (show what exists, hide what doesn't)
3. NOT hardcode archetype-specific rendering branches

---

## 10. Knowledge Graph Evolution

### 10.1 Bidirectional Graph ↔ Deliverable Flow

Currently the KG is one-way: deliverables build the graph. The re-architecture makes it bidirectional:

```
CURRENT:
  Deliverables → buildSourceGraph() → KG (display only)

TARGET:
  Deliverables → buildSourceGraph() → KG
  KG → user curates → filtered corpus → Deliverables
  KG → agent queries → evidence chains → Report enrichment
```

### 10.2 Graph as Evidence Index

The KG becomes a queryable evidence index that agents can reference:

```
Agent: "What evidence supports the theme 'AI in Higher Education'?"
KG Query: nodes.filter(type === 'evidence' && edges.some(target === theme_id))
Result: [{ source: "Higher Ed Dive", title: "...", content: "..." }, ...]
```

This enables the Strategic Report agent to PULL evidence from the graph rather than hoping the AI remembers what's in the corpus.

---

## 11. Self-Improvement Engine Migration

### 11.1 CLAUDE.md Replaces wikiService Rules

The custom `promptImprovementEngine.ts` (edit logging, pattern detection, constraint approval) is replaced by CLAUDE.md as the single source of behavioral truth:

| Current Mechanism | CLAUDE.md Equivalent |
|---|---|
| `wikiService.ts` banned phrases | `## Anti-Patterns` section in CLAUDE.md |
| `promptImprovementEngine.ts` constraints | `## Learned Constraints` section (updated by hooks) |
| `deliverableFrameworks.ts` consulting frameworks | Embedded in each SKILL.md file |
| `wikiService.ts` quality gates | Hook scripts (deterministic) |
| Engagement memory | `## Prior Engagements` section (appended per run) |

### 11.2 Preserved Self-Improvement Loop

The hook architecture preserves learning:

```
1. User edits deliverable at checkpoint
2. Hook script logs edit signal (old value → new value)
3. After 5+ similar edits, hook proposes constraint
4. Constraint approved → added to CLAUDE.md ## Learned Constraints
5. Next session: CLAUDE.md loads constraint into all agent contexts
6. Output quality improves without user re-editing
```

---

## 12. Phased Migration Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Establish global memory and deterministic quality gates without changing generation logic.

| Task | Effort | Impact |
|---|---|---|
| Migrate banned phrases, design tokens, citation protocol to CLAUDE.md | 2 days | All agents inherit rules |
| Create `scripts/validate_citations.py` with exit code 2 logic | 2 days | Resolves KI-003 |
| Create `scripts/validate_evidence_density.py` | 2 days | Resolves KI-004 |
| Configure hooks.json with Stop event triggers | 1 day | Hooks active |
| Add prioritySources to localStorage | 0.5 days | Resolves KI-010 |

**Deliverable**: Existing pipeline runs unchanged, but outputs are now validated by deterministic hooks. Priority citation enforcement is guaranteed.

### Phase 2: Skill Decomposition (Week 3-4)

**Goal**: Extract the monolithic geminiService.ts into isolated Agent Skills.

| Task | Effort | Impact |
|---|---|---|
| Create 12 SKILL.md files (one per deliverable + report + deck) | 5 days | Domain expertise isolated |
| Migrate generation prompts from geminiService.ts into skills | 3 days | Prompts become maintainable |
| Implement Claude 4.6 API wrapper (`claudeAgentService.ts`) | 3 days | Claude replaces Gemini for text |
| Configure adaptive thinking per skill | 1 day | Deep reasoning for complex tasks |
| Test each skill independently | 3 days | Quality verification |

**Deliverable**: Each deliverable generated by its own skill. Sequential pipeline preserved (parallel comes in Phase 3).

### Phase 3: Parallel Execution (Week 5-6)

**Goal**: Independent deliverables execute simultaneously via subagent forking.

| Task | Effort | Impact |
|---|---|---|
| Create `parallel-deliverable-runner.md` agent definition | 2 days | Orchestration logic |
| Configure worktree isolation for 7 independent skills | 2 days | True parallel execution |
| Implement result aggregation (wait for all, merge) | 3 days | Combined output |
| Update pipeline state machine for parallel phase | 2 days | UI shows parallel progress |
| Performance testing and timeout tuning | 2 days | Validate speedup |

**Deliverable**: Pipeline time drops from 8-15 min to 3-5 min. Independent deliverables run simultaneously.

### Phase 4: Frontend Decomposition (Week 7-8)

**Goal**: Break App.tsx and ResultsView.tsx into maintainable components.

| Task | Effort | Impact |
|---|---|---|
| Extract pipeline orchestration into `usePipelineOrchestrator.ts` | 3 days | App.tsx drops to ~500 lines |
| Extract source curation into `useSourceCuration.ts` | 2 days | Curation logic testable |
| Create ThemesTab.tsx | 1 day | Resolves KI-008 |
| Create CompetitiveTab.tsx with maturity matrix | 2 days | Resolves KI-009 |
| Create TechArchTab.tsx with sections | 1 day | Resolves KI-012 |
| Add keyboard nav to Knowledge Graph | 2 days | Resolves KI-011 |
| Rewrite PPTX export from canonical model | 3 days | Resolves KI-002 |

**Deliverable**: All 12 known issues resolved. Components are testable in isolation.

### Phase 5: MCP Data Fabric (Week 9-10)

**Goal**: Replace Python proxy with MCP servers and async tasks.

| Task | Effort | Impact |
|---|---|---|
| Create MCP Server wrapping current data connectors | 5 days | Standardized data access |
| Implement SEP-1686 Tasks for async collection | 3 days | No more timeouts |
| Create `mcpDataService.ts` client | 2 days | Frontend integration |
| Update LiveSourceFeed for task polling | 2 days | Smooth progress UI |
| Retire Python CORS proxy | 1 day | Simplified infrastructure |

**Deliverable**: Data collection is asynchronous, durable, and timeout-free.

### Phase 6: Plugin Packaging (Week 11-12)

**Goal**: Bundle everything into a distributable Claude plugin.

| Task | Effort | Impact |
|---|---|---|
| Create `.claude-plugin/plugin.json` manifest | 1 day | Plugin identity |
| Package skills, hooks, agents, MCP config | 2 days | Distributable unit |
| Write plugin installation documentation | 2 days | Onboarding |
| End-to-end regression testing | 5 days | Quality assurance |
| UAT with stakeholders | 3 days | User acceptance |

**Deliverable**: The complete Humans-in-Control platform installable via `/plugin install`.

---

## 13. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Claude 4.6 API costs exceed budget | Medium | High | Adaptive thinking (use `medium` for simple tasks, `max` only for complex) |
| Gemini → Claude migration breaks image/video gen | Low | Medium | Keep Gemini for image/video only (no migration needed) |
| Parallel subagents produce inconsistent cross-references | Medium | Medium | Strategic Report agent reconciles all deliverables post-generation |
| MCP Server complexity exceeds team capacity | Medium | High | Phase 5 is last; fallback to proxy if needed |
| Hook scripts introduce latency | Low | Low | 30s timeout per hook; scripts are lightweight |
| CLAUDE.md grows too large for context | Low | Medium | Keep under 10KB; move verbose frameworks to SKILL.md files |
| User-visible behavioral changes during migration | High | Medium | Feature flags per phase; rollback capability |

---

## 14. Success Metrics

| Metric | Current (v2.0) | Target (v3.0) | Measurement |
|---|---|---|---|
| Pipeline execution time | 8-15 min | 3-5 min | Timestamp start to completion |
| Priority citation compliance | ~60% (probabilistic) | 100% (deterministic) | Hook validation pass rate |
| Evidence density per deliverable | Variable (AI-dependent) | 100% items have citations[] | Hook validation |
| Deck content quality | Thin blocks, empty panels | Rich blocks, no empty panels | Manual audit + hook validation |
| Data collection timeouts | 5-15% failure rate | 0% (async tasks) | MCP task completion rate |
| Codebase maintainability | 5 files > 2000 lines | 0 files > 500 lines | `wc -l` per file |
| Known issues resolved | 12 open | 0 open | KI tracker |
| Export consistency | HTML != PPTX | HTML == PPTX (canonical model) | Visual diff comparison |

---

## 15. Output Quality Guarantees: Why This Won't Produce the Same Garbage

The previous architecture produced bad outputs for specific, diagnosable reasons. Better architecture alone does NOT guarantee better outputs — it only ENABLES them. This section specifies the concrete mechanisms that make slop IMPOSSIBLE to reach the user, with before/after examples and deterministic enforcement.

### 15.1 The Honest Diagnosis: What Actually Causes Bad Output

| Failure Mode | Root Cause | Why Architecture Changes Alone Don't Fix It |
|---|---|---|
| **Thin deck slides** | AI generates structure + prose in one shot. Complex 12-type schema overwhelms the model. | A new skill file with the same one-shot approach produces the same thin blocks. |
| **Generic strategy boilerplate** | AI defaults to safe, generic prose when it doesn't have strong evidence in context. | A bigger context window helps, but if the prompt doesn't FORCE specificity, the AI will still be generic. |
| **Empty evidence fields** | Schema requires `citations[]` but AI returns `[]` or `["research"]`. | A hook checks non-empty, but checking `length > 0` doesn't verify the citations are REAL. |
| **Client-doc-heavy reports** | Uploaded client documents are the most "available" content. External evidence requires more work for the AI. | Even with 200 sources injected, the AI may still lean on the 3 client PDFs because they're clearest. |
| **Unresolved CHUNK references** | Citation resolution runs but misses edge cases. | A new architecture has the same regex-based resolution. Edge cases persist. |
| **Topic titles instead of action titles** | AI takes the path of least resistance ("The Landscape" instead of "35% enrollment decline at public universities signals structural shift"). | A skill instruction says "use action titles" — but that's the same prompt instruction that already failed. |

### 15.2 The Six Mechanisms That Actually Prevent Slop

Each mechanism is **deterministic** (not probabilistic), **blocking** (output cannot proceed without passing), and **specific** (checks a concrete, measurable condition).

#### Mechanism 1: Multi-Phase Deck Generation (Prevents Thin Content)

**The problem**: When the AI generates narrative arc + content blocks + JSON schema in one shot, it produces minimal content to satisfy the schema constraints.

**The fix**: Four strictly separated phases. Each phase ONLY does one thing:

```
PHASE 1 (Thinking: max, output: plain text)
  "Given this 15-section strategic report, outline a 20-slide narrative arc.
   For each slide, write ONE SENTENCE describing the insight it must convey.
   Do NOT generate any JSON. Do NOT write slide content."

  Output: Plain text outline (20 sentences)
  Quality gate: Hook verifies 15-25 slide sentences exist, each > 10 words

PHASE 2 (Thinking: high, output: JSON per slide)
  "For slide 5 ('35% of first-year students don't return, costing $9B annually'),
   generate 2-5 content blocks from this report section:
   [FULL 600-word report section injected here]"

  Output: ContentBlock[] for ONE slide
  Quality gate: Hook verifies each body slide has >= 1 evidence_bullets or quote_block

PHASE 3 (Deterministic, no AI)
  resolveLayout(blocks) → archetype
  mapToFields(blocks) → Slide object

PHASE 4 (Deterministic, no AI)
  If slide.metrics is empty AND report section has keyMetrics → inject
  If slide.sources is empty AND report section has citations → inject
  If slide.content items are < 40 chars → replace with report sentences
```

**Why this is different**: The current system does Phase 1+2 simultaneously. The AI tries to plan AND write AND format JSON at the same time. Separating them means the AI never faces a complex schema while also trying to reason about narrative.

**Enforcement**: Phase 2 generates content for ONE SLIDE AT A TIME, not all 20 at once. This is the critical difference — the AI only needs to distill one 600-word report section into 2-5 blocks, which is a tractable task.

#### Mechanism 2: Citation Validator Hook (Prevents Missing Evidence)

**The problem**: The prompt says "cite 20+ sources" but the AI cites 5 client documents and calls it done.

**The fix**: A Python script that runs after EVERY deliverable generation:

```python
# validate_citations.py (runs as Stop hook, exit code 2 = block and retry)

def validate(deliverable_json, priority_sources, corpus_sources):
    failures = []

    # CHECK 1: Priority sources MUST appear
    for ps in priority_sources:
        if ps not in str(deliverable_json):
            failures.append(f"MANDATORY: Priority source '{ps}' not cited anywhere")

    # CHECK 2: Citations array must have REAL source names (not generic)
    GENERIC = {'research', 'studies', 'data', 'sources', 'intelligence_sources',
               'analysis', 'evidence', 'findings', 'reports', 'literature'}
    for item in iterate_citation_fields(deliverable_json):
        if not item.get('citations') or len(item['citations']) == 0:
            failures.append(f"EMPTY: {item['name']} has no citations")
        else:
            for c in item['citations']:
                if c.lower().strip() in GENERIC:
                    failures.append(f"GENERIC: '{c}' is not a real source name")

    # CHECK 3: Evidence basis must contain specifics (numbers, names, quotes)
    for item in iterate_evidence_fields(deliverable_json):
        eb = item.get('evidenceBasis', '')
        has_number = bool(re.search(r'\d+%|\$\d|20[12]\d', eb))
        has_quote = '"' in eb or "'" in eb
        has_name = any(c.isupper() for word in eb.split() for c in word if len(word) > 3)
        if not (has_number or has_quote or has_name):
            failures.append(f"VAGUE: evidenceBasis for '{item['name']}' has no specifics")

    # CHECK 4: Minimum distinct sources (not just client docs)
    all_cited = extract_all_source_names(deliverable_json)
    client_docs = {s for s in all_cited if 'project charter' in s.lower()
                   or 'sow' in s.lower() or 'strategy document' in s.lower()}
    external = all_cited - client_docs
    if len(external) < 5:
        failures.append(f"SHALLOW: Only {len(external)} external sources cited. Need 5+.")

    if failures:
        sys.stderr.write("CITATION VALIDATION FAILED:\n" + "\n".join(failures))
        sys.exit(2)  # EXIT CODE 2 = BLOCK AND RETRY
    sys.exit(0)
```

**Why this is different**: The current system has NO validation. The prompt says "cite sources" and the AI may or may not comply. With exit code 2, the agent CANNOT finish until the validator passes. The agent receives the specific failure message and regenerates the failing section.

**Enforcement**: This runs on EVERY deliverable, not just the report. Recommendations with empty citations? Blocked. Gap analysis with generic evidence? Blocked. The user never sees output that hasn't passed this gate.

#### Mechanism 3: Action Title Enforcer (Prevents Generic Slide Titles)

**The problem**: "The Landscape", "Key Findings", "Recommendations" are topic labels, not insights.

**The fix**: Deterministic regex check in the hook:

```python
# validate_slide_titles.py

def is_action_title(title):
    """Action titles are complete sentences with specific data."""
    # Must contain at least one number, percentage, dollar amount, or proper noun
    has_data = bool(re.search(r'\d+%|\$\d|\d+ (students|users|institutions|companies)', title))
    # Must be a complete sentence (has a verb)
    has_verb = bool(re.search(r'\b(declined?|increased?|dropped?|grew|costs?|requires?|faces?|creates?|drives?|enables?|prevents?|exceeds?|lacks?)\b', title, re.I))
    # Must be > 8 words (topic labels are short)
    is_long_enough = len(title.split()) >= 8
    return (has_data or has_verb) and is_long_enough

for slide in slides:
    if slide['layout'] not in ('SECTION_HEADER', 'TITLE_SLIDE'):
        if not is_action_title(slide['title']):
            failures.append(f"Slide {slide['slideNumber']}: '{slide['title']}' is a topic label, not an action title")
```

**Before**: "The Landscape" / "Key Findings" / "The Path Forward"
**After**: "35% of first-year students at public institutions do not return, costing $9B annually" / "Fragmented CRM systems force advancement teams to spend 40% of time on manual data entry" / "Three priority investments in AI-powered donor matching can recover $2.3M in annual giving within 18 months"

**Enforcement**: Exit code 2 blocks the deck until every body slide has an action title with data.

#### Mechanism 4: Evidence Saturation Protocol (Prevents Client-Doc-Heavy Output)

**The problem**: The AI leans on the 3 uploaded client documents because they're the most coherent content in context. External research (200 articles) is harder to synthesize.

**The fix**: The skill instruction explicitly PROHIBITS leading with client documents:

```markdown
## Evidence Hierarchy (MANDATORY)

Every section MUST follow this source ordering:
1. LEAD with external research evidence (name the article, quote the finding)
2. CORROBORATE with additional external sources (show convergence)
3. ONLY THEN contextualize with client documents (show how the finding applies)

FORBIDDEN PATTERNS:
- "The CLR Project Charter states..." as the opening of ANY section
- "According to the client's strategy document..." without prior external evidence
- Any section where > 50% of citations are client documents

REQUIRED PATTERN:
"Higher Ed Dive reported a 15% enrollment decline across 23 public institutions
in Q1 2025 [Higher Ed Dive]. This trend is corroborated by OpenAlex data showing
a 12% reduction in undergraduate applications at mid-tier universities [OpenAlex:
Smith 2024]. For Northeastern, this translates to approximately 2,400 fewer
applicants than projected in the CLR Project Charter's enrollment targets."
```

**Enforcement**: The citation validator (Mechanism 2) checks that >= 60% of cited sources are external (not client documents). If client docs dominate, exit code 2 fires.

#### Mechanism 5: Corpus Injection Without Truncation (Prevents Shallow Research)

**The problem**: The 500KB corpus cap means only ~1000 of 1500 collected items reach the AI. The Knowledge Graph shows all 1500 but the deliverables only see 1000.

**The fix (v3.0)**: Claude 4.6's 1M token context. Each skill receives the FULL corpus. But this alone doesn't guarantee depth — the AI might still only read the first 100 items.

**Additional enforcement**: The skill instruction includes a MANDATORY CORPUS COVERAGE check:

```markdown
## Corpus Coverage Mandate

After generating your output, perform this self-check:
1. Count how many DISTINCT sources you cited
2. Count how many items are from the FIRST 100 chunks vs. LATER chunks
3. If > 80% of citations come from the first 100 chunks, you have NOT read the full corpus

You MUST cite evidence from:
- Early chunks (CHUNK_001-100): at least 3 citations
- Middle chunks (CHUNK_100-300): at least 3 citations
- Late chunks (CHUNK_300+): at least 3 citations

The validation hook will verify citation spread across the corpus range.
```

**Enforcement**: The hook checks `CHUNK_XXX` references (before resolution) and verifies they span the full corpus range. If all citations cluster in the first 50 chunks, exit code 2.

#### Mechanism 6: Per-Slide Report Section Guarantee (Prevents Empty Deck Slides)

**The problem**: The narrative generation tries to match slides to report sections, but matching fails when `sourceDeliverable` values don't align.

**The fix (v3.0)**: The deck skill receives the report as a pre-indexed structure where every slide's report section is PRE-RESOLVED before the AI sees it:

```
SLIDE 5 of 20:
  TITLE MANDATE: Must convey the insight from Report Section 4
  REPORT SECTION 4 (pre-resolved, 600 words):
  [Full section text with keyMetrics, keyQuote, citations]

  YOUR TASK: Distill this 600-word section into 2-5 content blocks.
  You MUST include:
  - At least 1 metric from the keyMetrics list
  - The keyQuote (verbatim)
  - At least 2 source names from the citations list

  Generate content blocks for THIS SLIDE ONLY.
```

**Why this is different from the current system**: The current system generates ALL 20 slides in one API call. The AI must plan, match, and generate simultaneously. The new system generates ONE SLIDE PER CALL, with the exact report section pre-injected. The AI cannot "miss" the section because it's the only input.

**Enforcement**: The hook verifies that every body slide has `metrics.length >= 1` OR `content.length >= 2`, and that `sources.length >= 1`. If any body slide is empty, exit code 2.

### 15.3 Before/After Output Examples

#### Recommendation (Before — Current v2.0)

```json
{
  "title": "Enhance Digital Engagement Platform",
  "description": "Leverage AI-powered tools to improve student engagement across digital touchpoints.",
  "impactLevel": "HIGH",
  "actionItems": ["Implement AI chatbot", "Upgrade CRM system", "Train staff on new tools"],
  "citations": [],
  "evidenceBasis": ""
}
```

**Problems**: Generic title ("Enhance Digital Engagement Platform"), empty citations, empty evidenceBasis, action items are vague.

#### Recommendation (After — v3.0 with Hooks)

```json
{
  "title": "Deploy predictive donor scoring to replace manual prospect identification — advancement officers spend 40% of time on low-potential prospects",
  "description": "Research across 4 sources identifies manual prospect identification as the primary efficiency bottleneck. Higher Ed Dive reports that institutions using AI donor scoring see 23% higher conversion rates. Reddit testimony from 14 advancement professionals confirms the '40% wasted time' finding. The CLR Project Charter's $2.1M fundraising gap aligns precisely with this inefficiency.",
  "impactLevel": "HIGH",
  "actionItems": [
    "VP of Advancement: Evaluate Salesforce Einstein and Blackbaud ML scoring by Q3 2026",
    "IT Department: Integrate donor prediction API with existing Raiser's Edge NXT within 90 days",
    "Data Governance: Establish prospect scoring model validation framework with 6-month recalibration cycle",
    "Training: Certify 15 advancement officers on AI-assisted prospect identification by end of Q4 2026"
  ],
  "citations": ["Higher Ed Dive", "Reddit: r/advancement", "OpenAlex: Chen 2024", "CLR Project Charter"],
  "evidenceBasis": "Higher Ed Dive's March 2025 report documented a 23% lift in donor conversion at 7 institutions that deployed AI scoring. A Reddit user (advancement director, 12 years) wrote: 'I spend Monday through Wednesday just sorting through spreadsheets to find who might give this year.' OpenAlex paper by Chen et al. (2024) quantified the ROI at $4.20 returned per $1 invested in predictive models."
}
```

**Why this passes**: 4 real citations (2 external, 1 social, 1 client). EvidenceBasis has specific numbers (23%, $4.20), a verbatim quote, named sources. Action items have WHO (VP, IT, Data Gov, Training), WHAT, and WHEN (Q3, 90 days, Q4). The hook validates all of this.

#### Deck Slide (Before — Current v2.0)

```
SLIDE 12: CONTENT_DATA_PANEL
Title: "Fragmented Experiences Create Friction"
Content: ["Exploring Future Opportunities", "Building My Profile", "Applying & Engaging",
          "Performing & Contributing", "Validating Impact", "Evolving Relationship"]
Metrics: []
Quote: ""
Sources: []
```

**Problems**: Title is a topic label. Content is just journey stage names (no evidence). No metrics. No quote. No sources.

#### Deck Slide (After — v3.0 with Multi-Phase + Hooks)

```
SLIDE 12: Resolved as CONTENT_DATA_PANEL (metrics present)
Title: "35% of students abandon the co-op application process at document upload,
        costing Northeastern an estimated 2,400 lost placements annually"
Content: [
  "Student surveys reveal 72% of first-years cite 'lack of clear guidance' as their
   primary barrier to co-op readiness (Reddit: r/NEU, 47 posts analyzed)",
  "The document upload step has a 35% abandonment rate — students report the interface
   requires 15+ fields with no progress indicator (Hechinger Report)",
  "Peer institutions with guided onboarding see 40% higher completion rates
   (OpenAlex: Martinez 2024, comparing 12 universities)"
]
Metrics: [
  { label: "Abandonment Rate", value: "35%", accentColor: "#CC6644" },
  { label: "Lost Placements", value: "2,400", accentColor: "#B8B800" },
  { label: "Peer Completion Lift", value: "+40%", accentColor: "#00B7C3" }
]
Quote: "I spent three hours trying to upload my resume and it kept timing out.
        I almost gave up on co-op entirely." — CS Junior, Reddit r/NEU
Sources: ["Reddit: r/NEU", "Hechinger Report", "OpenAlex: Martinez 2024"]
```

**Why this passes all 6 mechanisms**:
1. Multi-phase: This slide was generated from a single report section, not all 20 slides at once
2. Citation validator: 3 external sources cited, all real names (not generic)
3. Action title: Contains "35%", "2,400", specific institution — passes regex
4. Evidence saturation: Leads with Reddit + Hechinger (external), not client docs
5. Corpus coverage: Citations from social (Reddit), news (Hechinger), academic (OpenAlex)
6. Per-slide guarantee: Metrics non-empty (3 items), content non-empty (3 items), sources non-empty (3 items)

### 15.4 What CAN'T Be Guaranteed (Honest Limitations)

| Limitation | Why | Mitigation |
|---|---|---|
| Narrative quality is subjective | No algorithm can verify "engaging prose" vs "dry prose" | Human checkpoint review remains mandatory |
| AI may fabricate statistics | Even with source names, numbers could be invented | Hook checks that cited numbers appear in the corpus text |
| Thin corpus = thin output | If the user provides 2 sources and disables all data collection, outputs will be shallow | Hook enforces minimum source count; warns user if corpus is thin |
| Complex cross-references may be wrong | AI may link the wrong persona to the wrong journey stage | Human checkpoint review; KG visualization shows connections for verification |
| Edge case formatting | Some article titles may contain special characters that break regex matching | Robust string normalization in all matching logic |

### 15.5 The Quality Control Stack (Defense in Depth)

```
Layer 1: SKILL.MD INSTRUCTIONS
  Domain-specific expertise, evidence mandates, anti-patterns
  → Guides the AI toward good output (probabilistic, ~70% compliance)

Layer 2: ADAPTIVE THINKING
  Deep reasoning before JSON serialization
  → AI self-checks adherence to complex schemas (~85% compliance)

Layer 3: MULTI-PHASE GENERATION
  Separate planning from prose from formatting
  → Each phase is tractable (~90% compliance)

Layer 4: DETERMINISTIC ENRICHMENT
  Report data injected directly into slides (no AI)
  → Guarantees metrics, quotes, citations exist (100% for enriched fields)

Layer 5: HOOK VALIDATORS (exit code 2)
  Citation completeness, evidence density, action titles, source diversity
  → BLOCKS output until passing (100% compliance on checked criteria)

Layer 6: HUMAN CHECKPOINT
  User reviews, edits, provides feedback at every stage
  → Catches subjective quality issues + edge cases

Combined: Layers 1-3 get the AI to ~90%. Layer 4 fills gaps deterministically.
Layer 5 blocks anything that still fails. Layer 6 catches what's left.
The user NEVER sees output that hasn't passed all 6 layers.
```

---

## Appendix A: File Migration Map

| Current File | Target | Action |
|---|---|---|
| `geminiService.ts` (2,883 lines) | 12 SKILL.md files + `claudeAgentService.ts` | Decompose |
| `App.tsx` (2,947 lines) | `App.tsx` (~500) + 4 hooks + `ConfigurationPanel` | Decompose |
| `AnalysisCheckpoint.tsx` (2,444 lines) | `CheckpointModal` + 14 stage-specific components | Decompose |
| `ResultsView.tsx` (2,333 lines) | `ResultsTabs/` directory with 12 tab components | Decompose |
| `wikiService.ts` + `promptImprovementEngine.ts` | `CLAUDE.md` + hook scripts | Migrate |
| `dataSourceConnectors.ts` | MCP Server tool definitions | Migrate |
| `slidePostProcessor.ts` | Hook scripts + `validate_content_budgets.py` | Migrate |
| `layoutResolver.ts` | Preserved (deterministic, no AI) | Keep |
| `knowledgeGraphBuilder.ts` | Preserved + bidirectional query API | Extend |
| `exportService.ts` | Rewrite PPTX from canonical model | Rewrite |
| `types.ts` | Preserved + stricter evidence types | Extend |

---

## Appendix B: Dependency on Claude SDK Features

| Feature | SDK Status | Required By |
|---|---|---|
| Anthropic SDK (`@anthropic-ai/sdk`) | Stable | All Claude API calls |
| Extended thinking (`thinking: {"type": "adaptive"}`) | Stable (Claude 4.6) | All skills |
| Subagent spawning | Stable (Claude Code) | Parallel deliverable execution |
| Worktree isolation | Stable (Claude Code) | Subagent isolation |
| Event hooks (Stop, SubagentStop) | Stable (Claude Code) | Quality validation |
| Exit code 2 (block and retry) | Stable (Claude Code) | Auto-correction loop |
| MCP client | Stable | Data fabric |
| MCP Tasks (SEP-1686) | In development | Async data collection |
| Plugin manifest | Stable (Claude Code) | Distribution |
| CLAUDE.md auto-loading | Stable (Claude Code) | Global memory |

---

*NXT HUMANS Intelligence Augmentation Suite — Humans in Control Research Platform*  
*Re-Architecture Development Plan v3.0 — April 15, 2026*
