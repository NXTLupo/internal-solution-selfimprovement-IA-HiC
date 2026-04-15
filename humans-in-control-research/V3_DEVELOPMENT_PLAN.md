# Humans in Control v3.0: Definitive Development Plan

## From Monolithic Gemini Pipeline to Claude 4.6 Multi-Agent Ecosystem

**Author**: NXT Humans Engineering  
**Date**: April 15, 2026  
**Current Branch**: `Humans-in-Control-Overhaul-04.14.2026`  
**Codebase**: 18,596 lines across 17 core files  
**Known Issues**: 12 (KI-001 through KI-012)

---

## Why This Plan Exists

We have iterated on the current architecture for weeks. We added citation fields to every type. We rewrote the narrative generator to use content blocks. We added deterministic enrichment. We added EvidenceBlock to every output tab. We removed article-per-source caps. We added priority citation enforcement to the prompt.

**The outputs are still not good enough.**

The fundamental problem is not the prompts, the schemas, or the rendering. It is that a single Gemini 2.5 Flash chat session cannot simultaneously hold 200 research articles in context, reason deeply about strategic implications, AND produce structurally complex JSON output without degrading on at least one axis. Every fix we apply to one axis weakens another.

This plan replaces the architecture, not the concept. The concept is right: collect evidence, let humans curate it, generate consulting-grade deliverables, present them beautifully. The execution machinery needs to change.

---

## Table of Contents

1. [Honest Assessment: What Failed and Why](#1-honest-assessment)
2. [Architecture: What Changes and What Stays](#2-architecture)
3. [The Claude 4.6 Migration](#3-claude-46-migration)
4. [Agent Skills: One Expert Per Deliverable](#4-agent-skills)
5. [The Deck Problem: A Complete Rethink](#5-the-deck-problem)
6. [Deterministic Quality Hooks](#6-deterministic-quality-hooks)
7. [MCP Data Fabric](#7-mcp-data-fabric)
8. [Frontend Decomposition](#8-frontend-decomposition)
9. [The Export Problem](#9-the-export-problem)
10. [Implementation Phases](#10-implementation-phases)
11. [Output Quality Contract](#11-output-quality-contract)
12. [What We Will NOT Do](#12-what-we-will-not-do)

---

## 1. Honest Assessment: What Failed and Why

### The Actual File Inventory (Every Line Accounted For)

| File | Lines | What It Does | What's Wrong With It |
|---|---|---|---|
| `geminiService.ts` | 2,883 | 16 generation functions sharing one Gemini chat session | By stage 8, the context is polluted with 7 prior deliverables. The AI loses focus. Persona enrichment uses a standalone call to avoid this but loses corpus access. |
| `App.tsx` | 2,947 | Pipeline orchestration + state (45+ useState hooks) + UI + data filtering + wiki integration | God component. Every bug requires reading 3,000 lines to understand impact. |
| `AnalysisCheckpoint.tsx` | 2,444 | 14 checkpoint renderers in one component | Giant switch statement. Adding a field to one checkpoint risks breaking another. |
| `ResultsView.tsx` | 2,333 | 10 output tabs + export + slide editing + evidence display | Mixes rendering logic with data transformation. PPTX export still uses old archetype renderers. |
| `wikiService.ts` | 1,287 | Wiki CRUD, banned phrases (350+), quality gates, framework loading | Duplicates what CLAUDE.md does natively. 350 banned phrases in a JS array is unmaintainable. |
| `types.ts` | 971 | 50+ interfaces, evidence fields added retroactively | `citations?: string[]` was bolted onto existing types. Not designed for evidence-first output. |
| `researchFabricOrchestrator.ts` | 973 | Data collection, corpus assembly, 500KB cap | The 500KB cap is the single biggest cause of shallow output. |
| `slidePostProcessor.ts` | 888 | 15+ validation functions that run AFTER generation | Compensates for AI failures instead of preventing them. |
| `exportService.ts` | 813 | PPTX with old rigid archetypes, HTML report, JSON | PPTX renderer was never updated when HTML went adaptive. |
| `knowledgeGraphBuilder.ts` | 716 | Incremental graph from deliverables | One-way: deliverables build the graph, but the graph can't feed back into deliverables. |
| `dataSourceConnectors.ts` | 460 | 100+ proxy-routed data sources | All synchronous through port 5012. 45-second timeouts. Frequent failures. |
| `promptImprovementEngine.ts` | 395 | Edit logging, pattern detection, constraint learning | Bespoke mechanism. Claude Code hooks do this natively with exit code 2. |
| **Total** | **18,596** | | |

### The 16 Generation Functions in geminiService.ts

Every one of these shares the same Gemini chat session context:

```
Line  446: ingestContext()           — reads files, establishes context
Line  617: generateThemes()          — 12-25 themes from corpus
Line  718: generatePersonas()        — 3-8 personas (standalone call for enrichment)
Line  938: generateRecommendations() — strategic recs + 15-section strategy doc
Line 1072: generateCrossCuttingSynthesis()
Line 1135: generateJourneyMap()      — 5-8 service blueprint stages
Line 1237: generatePRD()             — 16 Cagan sections + features
Line 1317: generateRoadmap()         — NOW/NEXT/LATER items
Line 1376: generateTechArchitecture() — nodes, flows, 10 sections
Line 1539: generateDeckStructure()   — 15-30 slide outlines
Line 1695: generateNarrative()       — content blocks per slide
Line 2070: generateGapAnalysis()     — capability maturity gaps
Line 2127: generateTechAudit()       — systems inventory + integrations
Line 2222: generateCompetitiveAnalysis() — peers, matrix, gaps
Line 2323: generateStrategicReport() — 12-18 section whitepaper
Line 2664: visualizeNarrative()      — post-processing + image injection
```

**The problem**: By the time `generateStrategicReport()` runs at line 2323, the chat session has accumulated context from 10+ prior generation calls. The AI is reasoning about the strategic report while holding theme schemas, persona enrichment results, journey map stages, PRD features, roadmap items, recommendations, gap analysis, tech audit, and competitive analysis in its working memory. This is why the report cites client documents more than external research — the client documents were ingested first and sit at the top of the context window.

### The Specific Failures We've Seen

| Failure | Example | Root Cause |
|---|---|---|
| Thin deck slides | Slide 12 had 6 journey stage names as content, no evidence | AI generated all 20 slides in one API call. Schema overwhelmed reasoning. |
| Generic slide titles | "The Landscape", "The Path Forward", "Forging a Unified Future" | Prompt says "action titles" but AI defaults to safe topic labels under cognitive load. |
| Empty data panels | CONTENT_DATA_PANEL with 0 metrics, blank right panel | AI chose archetype but couldn't fill archetype-specific fields simultaneously. |
| Client-doc-heavy reports | 80% of citations reference the 3 uploaded PDFs | External evidence (200 articles) is diluted across 500KB of context. Client docs are concentrated and recent. |
| Unresolved CHUNK references | `[CHUNK_074]` leaked into final output | Citation resolution regex missed edge cases (comma-separated, multi-line). |
| Empty evidence fields | `citations: []`, `evidenceBasis: ""` | Schema requires the fields but Gemini returns minimal content to satisfy the schema constraint. |
| Persona evidence thin | "Based on 2 evidence sources" | Standalone enrichment call only receives theme citations (20 quotes), not the full corpus. |

---

## 2. Architecture: What Changes and What Stays

### What STAYS (proven, working, not the problem)

| Component | Why It Stays |
|---|---|
| `layoutResolver.ts` (231 lines) | Deterministic, correct, no AI involvement. Content blocks map cleanly to templates. |
| `knowledgeGraphBuilder.ts` (716 lines) | Graph construction logic is sound. Just needs bidirectional query support. |
| `types.ts` (971 lines) | Evidence fields were added correctly. Types are the contract — they stay and get stricter. |
| React + Vite + Tailwind frontend | The rendering technology is fine. The components need decomposition, not replacement. |
| Source curation UI (include/exclude/priority) | The UX pattern is right. The data flow needs to be guaranteed end-to-end. |
| NXT Design System tokens | Visual design is established and consistent. |
| Gemini for image/video generation | Imagen 4 and VEO 3.1 have no Claude equivalent. Keep Gemini for visual generation only. |

### What CHANGES (the root causes of bad output)

| Current | Target | Why |
|---|---|---|
| Single Gemini chat session for all 16 functions | One Claude 4.6 agent per deliverable (isolated context) | Eliminates context contamination. Each agent sees ONLY what it needs. |
| Sequential pipeline (8-15 min) | Parallel subagents for independent deliverables (3-5 min) | Journey, PRD, Gap, Audit, Competitive are independent. Run them simultaneously. |
| Prompt instructions for quality ("MUST cite 20 sources") | Deterministic hooks with exit code 2 (BLOCK until compliant) | Probabilistic instruction replaced by mathematical verification. |
| 500KB corpus cap at ingestion | Full corpus per agent (Claude 4.6's 1M token window) | No truncation. Every user-included article reaches every agent. |
| 2,883-line monolithic geminiService.ts | 12 SKILL.md files (one per deliverable + report + deck) | Each skill has isolated instructions, anti-patterns, evidence mandates. |
| Post-processor compensates for AI failures | Hooks PREVENT bad output from being generated | Shift from reactive correction to proactive blocking. |
| PPTX export uses old archetype renderers | Unified export from canonical Slide model | Same data model feeds HTML, PDF, and PPTX identically. |
| Python CORS proxy (synchronous, 45s timeout) | MCP Server with async Tasks (SEP-1686) | Decouples network latency from reasoning. Zero timeouts. |
| Custom promptImprovementEngine.ts | CLAUDE.md global memory + hook-based learning | Native Claude Code mechanism replaces bespoke 395-line service. |

---

## 3. The Claude 4.6 Migration

### Why Claude 4.6, Not "Better Gemini Prompts"

We have spent weeks writing better Gemini prompts. The prompts are good. The problem is structural:

1. **Gemini chat session accumulates context from all prior stages.** By stage 10, the AI is reasoning in a 500KB+ context of mixed deliverable schemas. Claude 4.6 with isolated subagents gives each deliverable a CLEAN 1M-token context.

2. **Gemini has no extended thinking.** It generates JSON and prose simultaneously. Claude 4.6's adaptive thinking (`thinking: {"type": "adaptive"}`) allows deep reasoning BEFORE JSON serialization. The model debates narrative arcs internally, then emits structured output.

3. **Gemini has no hook mechanism.** We can't block bad output and force retry. Claude Code hooks with exit code 2 are a native, deterministic quality gate.

4. **Gemini's JSON schema mode is rigid.** When the schema is complex (12 content block types with 20+ optional fields each), Gemini satisfies the schema minimally. Claude 4.6's tool use mode is more flexible — it can use multiple tool calls per turn, allowing per-slide generation.

### Hybrid Model Architecture

| Model | Role | Context |
|---|---|---|
| Claude 4.6 Opus | Strategic Report, Strategy Deck (highest reasoning) | Max thinking effort, 1M context |
| Claude 4.6 Sonnet | All other deliverables (good reasoning, faster) | High thinking effort, 1M context |
| Claude 4.6 Sonnet | Lightweight tasks (classification, formatting) | Medium thinking effort |
| Gemini 2.5 Flash | Image generation (Imagen 4) | Retained, no migration needed |
| Gemini 2.5 Flash | Video generation (VEO 3.1) | Retained, no migration needed |
| Tri-model (Gemini + Claude + OpenAI) | Corpus enrichment (parallel analysis) | Retained, proven architecture |

### What Changes in the API Layer

```typescript
// BEFORE: geminiService.ts
const session = new GenAISession(goal, approach, outputs, lens, wiki);
const themes = await session.generateThemes(feedback, onStream);
const personas = await session.generatePersonas(themes, feedback, onStream, onStatus);
// ... 14 more sequential calls on the same session

// AFTER: claudeAgentService.ts
const corpus = await loadFullCorpus(curatedSources); // No 500KB cap
const themes = await runSkill('theme-analyst', { corpus, goal, lens }); // Isolated agent
const personas = await runSkill('persona-architect', { corpus, themes, goal }); // Isolated agent

// Parallel execution for independent deliverables:
const [journey, prd, recs, gap, audit, competitive] = await Promise.all([
  runSkill('service-blueprint-mapper', { corpus, themes, personas }),
  runSkill('prd-compiler', { corpus, themes, personas }),
  runSkill('strategy-author', { corpus, themes, personas }),
  runSkill('gap-analysis-evaluator', { corpus, themes }),
  runSkill('tech-audit-inspector', { corpus, themes }),
  runSkill('competitive-analyst', { corpus, themes }),
]);

// Sequential (depends on all above):
const roadmap = await runSkill('roadmap-builder', { corpus, recs, gap });
const report = await runSkill('strategic-report-writer', { corpus, ALL_DELIVERABLES, rawSources });
const deck = await runSkill('deck-narrative-composer', { report }); // Derived ONLY from report
```

Each `runSkill()` call:
1. Creates a fresh Claude 4.6 agent with the SKILL.md instructions loaded
2. Passes the full corpus (no truncation) + relevant upstream deliverables
3. Runs the Stop hook after generation to validate output
4. Returns only if hooks pass (exit code 0). Retries automatically on exit code 2.

---

## 4. Agent Skills: One Expert Per Deliverable

### Skill Directory Structure

```
.claude/
├── CLAUDE.md                              # Global rules (all agents inherit)
│   ├── NXT Design System tokens
│   ├── 350+ banned slop phrases
│   ├── Citation protocol (CHUNK resolution rules)
│   ├── Evidence hierarchy (external > client docs)
│   ├── Anti-pattern registry
│   └── Learned constraints (cross-session)
│
├── settings.json                          # Hooks + MCP configuration
│
├── skills/
│   ├── theme-analyst/
│   │   └── SKILL.md                       # 6-lens thematic analysis, 12-25 themes
│   ├── persona-architect/
│   │   └── SKILL.md                       # Cooper + JTBD, full corpus access
│   ├── service-blueprint-mapper/
│   │   └── SKILL.md                       # Bitner 5-component, fail points
│   ├── tech-arch-generator/
│   │   └── SKILL.md                       # C4 + TOGAF, 10 sections
│   ├── prd-compiler/
│   │   └── SKILL.md                       # Cagan 16-section, MoSCoW
│   ├── roadmap-builder/
│   │   └── SKILL.md                       # NOW/NEXT/LATER, outcome-based
│   ├── strategy-author/
│   │   └── SKILL.md                       # Rumelt Kernel + Minto Pyramid
│   ├── gap-analysis-evaluator/
│   │   └── SKILL.md                       # Gartner 5-level maturity
│   ├── tech-audit-inspector/
│   │   └── SKILL.md                       # COBIT + Forrester TEI
│   ├── competitive-analyst/
│   │   └── SKILL.md                       # Porter + Blue Ocean
│   ├── strategic-report-writer/
│   │   └── SKILL.md                       # McKinsey whitepaper (THE critical skill)
│   └── deck-narrative-composer/
│       └── SKILL.md                       # Multi-phase deck derivation
│
├── agents/
│   └── parallel-runner.md                 # Orchestrates parallel subagent execution
│
└── hooks/
    ├── hooks.json                         # Event-driven validation config
    └── scripts/
        ├── validate_citations.py          # Priority + density + authenticity
        ├── validate_evidence.py           # Non-empty, non-generic, specific
        ├── validate_titles.py             # Action titles, not topic labels
        ├── validate_budgets.py            # Character limits per field
        └── validate_source_diversity.py   # >= 60% external sources
```

### What Each SKILL.md Contains (Template)

```markdown
---
name: [deliverable-name]
description: [one-line purpose]
thinking: [max | high | medium]    # Adaptive thinking effort
---

# [Deliverable Name] Skill

## You Are
[Consulting persona — e.g., "a McKinsey senior partner writing a strategy report"]

## Input Contract
[Exactly what data this skill receives — corpus, upstream deliverables, goal, lens]

## Output Contract
[Exact JSON schema with REQUIRED fields — the hook validates against this]

## Methodology
[The consulting framework — Minto, Rumelt, Cooper, Bitner, Cagan, etc.]

## Evidence Mandates
[How many sources, what types, evidence hierarchy, quoting rules]

## Anti-Patterns (Instant Rejection)
[Specific examples of bad output that will be caught by hooks]

## Before/After Examples
[Concrete examples of BAD output → GOOD output for this deliverable]
```

### The Strategic Report Skill (The Most Critical Skill)

This skill replaces the current `generateStrategicReport()` function (lines 2323-2589 of geminiService.ts). It is the SINGLE MOST IMPORTANT generation task because the deck is derived entirely from the report.

**Key differences from current implementation:**

1. **Full corpus access**: The current function receives rawSources through an evidence catalog with content caps (2000 chars T1, 1500 chars T2, 3000 chars T3). The skill receives the ENTIRE corpus with no caps — Claude 4.6's 1M context handles it.

2. **Isolated context**: The current function runs as the 11th call on a shared Gemini chat session. The skill runs as a fresh Claude agent that sees ONLY: the corpus, the 10 deliverable outputs, and the skill instructions. No accumulated schema noise.

3. **Adaptive thinking (max effort)**: The current function has no pre-reasoning phase. The skill uses `thinking: {"type": "adaptive", "budget_tokens": 32000}` to force deep internal debate about the strategic diagnosis before writing prose.

4. **Evidence hierarchy enforced**: The skill instruction explicitly mandates: "Lead every section with external research evidence. Client documents provide context, not evidence. The hook validates that >= 60% of cited sources are external."

### The Deck Narrative Skill (The Most Changed Skill)

The current `generateNarrative()` (line 1695) generates all slides in one API call. The new skill generates **one slide per invocation**:

```
FOR EACH SLIDE:
  1. Receive: slide outline + pre-matched report section (600 words)
  2. Generate: 2-5 content blocks for THIS SLIDE ONLY
  3. Hook validates: >= 1 evidence block, >= 1 source, title is action title
  4. If hook fails: agent retries with specific error message
  5. If hook passes: slide added to deck

AFTER ALL SLIDES:
  1. layoutResolver.ts maps blocks → archetypes (deterministic, no AI)
  2. Deterministic enrichment injects report metrics/quotes/citations
  3. Content budget hook validates character limits
```

**Why one slide per call matters**: When the AI generates 20 slides simultaneously, it satisfies the schema minimally (producing thin blocks) because the combinatorial complexity is too high. When it generates ONE slide from ONE report section, the task is tractable: distill 600 words into 2-5 content blocks. The AI has enough reasoning capacity to include real evidence, specific metrics, and verbatim quotes.

---

## 5. The Deck Problem: A Complete Rethink

The Strategy Deck has been the most persistent quality failure. Every version has produced slides with thin content, generic titles, empty data panels, or missing evidence. Here is exactly what changes and why:

### Phase 1: Narrative Arc (Claude Opus, thinking: max)

**Input**: The complete strategic report (12-18 sections, 5000-10000 words)
**Output**: Plain text — 15-25 slide titles, each a complete sentence with data
**NOT output**: No JSON. No content blocks. No schema. Just sentences.

```
Example output:
1. [TITLE] Northeastern University faces a $2.1M fundraising gap driven by 35% first-year attrition and fragmented donor engagement systems
2. [SECTION] Research Landscape
3. 42% of advancement officers report spending more time on data entry than donor cultivation, according to 14 Reddit testimonials and a Higher Ed Dive investigation
4. AI-powered donor matching at 7 peer institutions produced a 23% conversion lift, but Northeastern's Raiser's Edge NXT lacks ML integration
...
```

**Hook validation**: Every body slide title must contain a number OR a named entity AND be >= 8 words. Exit code 2 if any title is a topic label.

### Phase 2: Per-Slide Content (Claude Sonnet, thinking: high, ONE CALL PER SLIDE)

**Input**: Slide title + matched report section (full text with keyMetrics, keyQuote, citations)
**Output**: 2-5 ContentBlock[] for this one slide

The report section is PRE-MATCHED before the AI sees it. The matching is deterministic (not AI-dependent):

```python
# Match report section to slide
for slide in slides:
    for section in report.sections:
        if section.sourceDeliverable == slide.sourceDeliverable:
            slide.matched_section = section
            break
    if not slide.matched_section:
        # Keyword fallback
        slide.matched_section = best_keyword_match(slide.title, report.sections)
```

**Hook validation per slide**:
- At least 1 `evidence_bullets` or `quote_block` block (evidence exists)
- `sources` array has >= 1 real source name (not generic)
- If report section had keyMetrics, at least 1 `metric_cards` or `hero_stat` block

### Phase 3: Layout Resolution (No AI — layoutResolver.ts)

Exactly as it works today. `resolveLayout(blocks)` maps content blocks to archetype. `mapToFields(blocks)` produces standard Slide object. This is deterministic and works correctly.

### Phase 4: Deterministic Enrichment (No AI)

Exactly as implemented today, but now it's a safety net rather than the primary content source:
- Empty metrics → inject from report section keyMetrics
- Empty quote → inject from report section keyQuote
- Empty sources → inject from report section citations
- Short content labels → replace with report sentences

### Phase 5: Final Validation Hook

```python
# validate_deck.py (runs after all slides assembled)
for slide in slides:
    if slide.layout not in ('SECTION_HEADER', 'TITLE_SLIDE'):
        assert len(slide.content) >= 2, f"Slide {slide.number}: fewer than 2 evidence points"
        assert len(slide.sources) >= 1, f"Slide {slide.number}: no source citations"
        assert is_action_title(slide.title), f"Slide {slide.number}: topic label title"
        if slide.metrics:
            for m in slide.metrics:
                assert m.value and m.label, f"Slide {slide.number}: empty metric"
```

Exit code 2 on any failure. The deck CANNOT be presented to the user until every slide passes.

---

## 6. Deterministic Quality Hooks

### Hook Configuration

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "python .claude/hooks/scripts/validate_citations.py",
        "timeout": 30
      },
      {
        "type": "command",
        "command": "python .claude/hooks/scripts/validate_evidence.py",
        "timeout": 30
      },
      {
        "type": "command",
        "command": "python .claude/hooks/scripts/validate_titles.py",
        "timeout": 15
      },
      {
        "type": "command",
        "command": "python .claude/hooks/scripts/validate_source_diversity.py",
        "timeout": 15
      }
    ],
    "SubagentStop": [
      {
        "type": "command",
        "command": "python .claude/hooks/scripts/validate_citations.py",
        "timeout": 30
      }
    ]
  }
}
```

### What Each Hook Validates

| Hook | Checks | Blocks On |
|---|---|---|
| `validate_citations.py` | Priority sources cited, citations[] non-empty, no CHUNK leaks | Missing priority source, empty citations, unresolved [CHUNK_XXX] |
| `validate_evidence.py` | evidenceBasis non-empty, contains specifics (numbers/quotes/names), not generic | "Research shows" without specifics, empty evidenceBasis |
| `validate_titles.py` | Slide titles are action titles (data + verb + >= 8 words) | "The Landscape", "Key Findings", "Recommendations" |
| `validate_source_diversity.py` | >= 60% of cited sources are external (not client documents) | Client-doc-heavy output where 3 PDFs dominate citations |
| `validate_budgets.py` | Title <= 120ch, content[i] <= 200ch, quote <= 250ch | Character budget violations |

### The Retry Loop

```
Agent generates deliverable
  → Hook runs (30s timeout)
    → Exit 0: PASS → output committed to state
    → Exit 2: BLOCK → error message sent to agent
      → Agent reads specific failure ("Slide 7 title is a topic label")
      → Agent regenerates ONLY the failing section
      → Hook runs again
      → (Max 3 retries before escalating to user)
```

---

## 7. MCP Data Fabric

### Replacing the Python Proxy

| Current (Port 5012) | Target (MCP Server) |
|---|---|
| `GET /api/search/{sourceId}?q=...` synchronous | `tools/call(query_sources, {taskId, query, sources})` async |
| 45-second timeout, 3 retries | SEP-1686 Tasks: submit → poll → retrieve (no timeout) |
| 6 concurrent requests, 800ms batch delay | Unlimited concurrent tasks, server manages parallelism |
| Proxy routes AI calls too (Gemini/Claude/OpenAI) | AI calls go direct via Anthropic SDK (no proxy needed) |

### MCP Tool Definitions

| Tool | Sources | Used By |
|---|---|---|
| `query_academic` | OpenAlex, Semantic Scholar, Crossref, arXiv, DOAJ | theme-analyst, gap-analysis, strategy |
| `query_government` | College Scorecard, Federal Register, Data.gov, FRED | tech-audit, prd, gap-analysis |
| `query_news` | GDELT, Higher Ed Dive, EdSurge, Hechinger Report | theme-analyst, competitive, strategy |
| `query_social` | Reddit (subreddits), TrustPilot, Play Store | persona-architect, strategy-author |
| `query_ai_landscape` | arXiv, HuggingFace, Papers with Code, AI Lab Blogs | tech-arch, competitive |
| `deep_research` | Gemini grounded, Claude web search | cross-cutting synthesis |
| `fetch_urls` | Jina Reader (custom URLs), YouTube transcription | any skill |

### Async Collection Flow

```
1. User clicks "Collect Data"
2. Frontend calls MCP: tools/call(query_academic, {taskId: "a1", query: "..."})
3. MCP Server returns immediately: {status: "submitted"}
4. Frontend shows LiveSourceFeed with progress
5. Frontend polls: tasks/get("a1") → {status: "running", progress: 45%}
6. Collection completes: {status: "completed"}
7. Frontend retrieves: tasks/result("a1") → full JSON array of articles
8. Articles stored in liveSourceResults (same state as today)
9. User curates (include/exclude/priority) using same UI as today
10. Curated sources passed to agents (no proxy involved)
```

---

## 8. Frontend Decomposition

### App.tsx (2,947 lines → ~500 lines)

```
App.tsx (thin shell: routing, layout, mode selection)
├── hooks/
│   ├── usePipeline.ts          — pipeline state machine (replaces 45+ useState)
│   ├── useCuration.ts          — excludedSources, prioritySources, localStorage
│   ├── useWiki.ts              — load/save wiki, engagement memory
│   └── useKnowledgeGraph.ts    — incremental graph building
├── panels/
│   ├── ConfigPanel.tsx         — goal, outputs, files, sources
│   ├── ResearchBoard.tsx       — reasoning stream, source feed, KG
│   └── ExportToolbar.tsx       — PDF, PPTX, HTML, JSON, CSV
├── checkpoints/
│   ├── CheckpointShell.tsx     — modal frame, approval/feedback/edit flow
│   ├── ThemesCheckpoint.tsx
│   ├── PersonasCheckpoint.tsx
│   ├── ReportCheckpoint.tsx    — editable sections, include-in-deck toggles
│   ├── StructureCheckpoint.tsx — sourceDeliverable badges, layout dropdown
│   ├── NarrativeCheckpoint.tsx — metrics, bento, problem/solution, personas, sources
│   └── [one per stage]
├── results/
│   ├── ThemesTab.tsx           — NEW (resolves KI-008)
│   ├── PersonasTab.tsx
│   ├── DeckTab.tsx             — adaptive renderer
│   ├── RecsTab.tsx
│   ├── PRDTab.tsx
│   ├── RoadmapTab.tsx
│   ├── JourneyTab.tsx
│   ├── TechArchTab.tsx         — with sections (resolves KI-012)
│   ├── GapTab.tsx
│   ├── TechAuditTab.tsx
│   ├── CompetitiveTab.tsx      — with maturity matrix (resolves KI-009)
│   └── EvidenceBlock.tsx       — shared component
└── services/
    ├── claudeAgent.ts          — Claude 4.6 API wrapper
    ├── mcpClient.ts            — MCP data fabric
    └── exportEngine.ts         — unified export from canonical Slide model
```

### Every KI Resolved

| KI | Resolution | Component |
|---|---|---|
| KI-001: Deck quality | Multi-phase generation + per-slide hooks | deck-narrative-composer skill |
| KI-002: PPTX old renderers | Unified export from canonical Slide model | exportEngine.ts |
| KI-003: Priority not validated | Hook with exit code 2 | validate_citations.py |
| KI-004: Evidence AI-dependent | Hook validates non-empty + non-generic | validate_evidence.py |
| KI-005: Persona standalone | Full corpus per agent (no standalone workaround needed) | persona-architect skill |
| KI-006: 500KB corpus cap | Claude 4.6 1M context, no cap | claudeAgent.ts |
| KI-007: Textarea sizing | Auto-resize via ResizeObserver | ReportCheckpoint.tsx |
| KI-008: No themes tab | New ThemesTab.tsx | results/ThemesTab.tsx |
| KI-009: Competitive incomplete | Full maturity matrix + gap summary | results/CompetitiveTab.tsx |
| KI-010: Priority not persisted | useCuration hook with localStorage | hooks/useCuration.ts |
| KI-011: KG accessibility | ARIA + keyboard nav | ResearchKnowledgeGraph.tsx |
| KI-012: Tech arch sections | Display all 10 sections | results/TechArchTab.tsx |

---

## 9. The Export Problem

### The Root Cause (KI-002)

The HTML slide renderer was rewritten to be adaptive (show whatever content exists). The PPTX renderer in `exportService.ts` was NOT updated. It still has 7 rigid archetype branches that expect specific fields (metrics[] for CONTENT_DATA_PANEL, bentoCells[] for BENTO_GRID, etc.). When these fields are empty, PPTX slides are broken.

### The Fix: Canonical Slide Model → Multiple Renderers

```
Canonical Slide Object (from layoutResolver.ts)
       │
       ├── HTML Renderer (adaptive, works today)
       │     └── html2canvas → PDF
       │
       ├── PPTX Renderer (REWRITE: adaptive, same logic as HTML)
       │     └── PptxGenJS
       │
       └── HTML Report Renderer (works today)
            └── exportStrategicReportHTML()
```

The PPTX rewrite mirrors the HTML adaptive renderer:
1. Always render: title, evidence points (content[]), source footnotes
2. Conditionally render: metrics panel (if metrics exist), persona card (if personaName exists), problem/solution (if problemStat exists), quote (if quote exists)
3. Never render empty panels

---

## 10. Implementation Phases

### Phase 1: Hooks + CLAUDE.md (Week 1-2) — Immediate Quality Improvement

| Task | Days | Impact |
|---|---|---|
| Create CLAUDE.md with banned phrases, design tokens, citation protocol | 2 | All agents inherit rules |
| Write validate_citations.py (priority + density + authenticity) | 2 | KI-003 resolved |
| Write validate_evidence.py (non-empty, non-generic, specific) | 2 | KI-004 resolved |
| Write validate_titles.py (action titles for deck) | 1 | Generic titles blocked |
| Write validate_source_diversity.py (>= 60% external) | 1 | Client-doc dominance blocked |
| Configure hooks.json with Stop triggers | 0.5 | Hooks active |
| Add prioritySources to localStorage | 0.5 | KI-010 resolved |
| Unit test hooks against simulated payloads | 2 | Quality verified |

**Result**: Current pipeline continues running (Gemini), but output is now validated by deterministic hooks. Bad output is blocked and retried. This is the fastest path to quality improvement.

### Phase 2: Claude 4.6 + Skills (Week 3-5) — Architecture Migration

| Task | Days | Impact |
|---|---|---|
| Implement claudeAgent.ts (Claude 4.6 API wrapper with adaptive thinking) | 3 | Claude replaces Gemini for text |
| Create 12 SKILL.md files from existing prompts in geminiService.ts | 5 | Domain expertise isolated |
| Implement per-skill agent spawning (runSkill function) | 3 | Isolated contexts per deliverable |
| Wire skills into pipeline (replace geminiService calls) | 3 | Skills active |
| Test each skill independently with hooks | 3 | Quality verified per skill |

**Result**: Each deliverable generated by isolated Claude 4.6 agent. Full corpus access (no 500KB cap). KI-005 and KI-006 resolved.

### Phase 3: Parallel Execution + Deck Rethink (Week 6-7)

| Task | Days | Impact |
|---|---|---|
| Configure parallel subagent execution for 7 independent deliverables | 3 | Pipeline 3-5 min instead of 8-15 |
| Implement per-slide deck generation (one API call per slide) | 4 | KI-001 resolved |
| Write deck-specific hooks (per-slide evidence, action titles) | 2 | Deck quality guaranteed |
| End-to-end testing of parallel + deck pipeline | 3 | Full pipeline verified |

**Result**: Pipeline time drops dramatically. Deck quality fundamentally improved by per-slide generation.

### Phase 4: Frontend + Export (Week 8-9)

| Task | Days | Impact |
|---|---|---|
| Decompose App.tsx into hooks + panels + checkpoints | 5 | Maintainability |
| Create ThemesTab.tsx, CompetitiveTab.tsx (full), TechArchTab.tsx (full) | 3 | KI-008, KI-009, KI-012 |
| Rewrite PPTX export from canonical Slide model (adaptive, not archetype) | 3 | KI-002 resolved |
| Accessibility pass on Knowledge Graph | 2 | KI-011 resolved |

**Result**: All 12 KIs resolved. Frontend maintainable. Export consistent.

### Phase 5: MCP + Plugin (Week 10-12)

| Task | Days | Impact |
|---|---|---|
| Create MCP Server wrapping data connectors | 5 | Standardized data access |
| Implement SEP-1686 Tasks for async collection | 3 | Zero timeouts |
| Create mcpClient.ts for frontend | 2 | Frontend integration |
| Retire Python proxy | 1 | Simplified infrastructure |
| Package as plugin (.claude-plugin/plugin.json) | 2 | Distributable |
| Full regression testing + UAT | 5 | Quality assurance |

**Result**: Complete v3.0 platform.

---

## 11. Output Quality Contract

### What We Guarantee (Deterministically Enforced)

| Quality Dimension | Guarantee | Enforcement |
|---|---|---|
| Priority articles cited | 100% of user-flagged articles appear in report | validate_citations.py exit code 2 |
| Evidence fields populated | Every recommendation, gap, feature, stage, peer has non-empty citations[] and evidenceBasis | validate_evidence.py exit code 2 |
| Action titles on deck slides | Every body slide title contains data (number/name) and is >= 8 words | validate_titles.py exit code 2 |
| Source diversity | >= 60% of cited sources are external research, not client documents | validate_source_diversity.py exit code 2 |
| Content budgets | Title <= 120ch, content[i] <= 200ch, quote <= 250ch, speakerNotes <= 600ch | validate_budgets.py exit code 2 |
| No CHUNK leaks | Zero unresolved [CHUNK_XXX] references in any output | validate_citations.py exit code 2 |
| No banned slop | Zero instances of 350+ banned phrases ("paradigm shift", "holistic approach", etc.) | CLAUDE.md + hook |
| No empty deck panels | Every body slide has >= 2 content items OR >= 1 metric | validate_deck.py exit code 2 |

### What We Cannot Guarantee (Requires Human Judgment)

| Quality Dimension | Why | Mitigation |
|---|---|---|
| Narrative engagement | "Is this well-written?" is subjective | Human checkpoint review at every stage |
| Strategic insight quality | "Is this the right diagnosis?" requires domain expertise | Report checkpoint is editable — user refines |
| Fabricated statistics | AI may invent plausible-sounding numbers | Hook checks cited numbers exist in corpus text (approximate) |
| Cross-reference accuracy | AI may link wrong persona to wrong journey stage | KG visualization shows connections for manual verification |

---

## 12. What We Will NOT Do

| Rejected Approach | Why |
|---|---|
| Replace Gemini entirely | Imagen 4 and VEO 3.1 have no Claude equivalent. Keep Gemini for visuals. |
| Build a custom agent framework | Claude Code's native subagent + skill + hook architecture is sufficient. Don't rebuild what exists. |
| Rewrite the Knowledge Graph | The graph builder works. It needs bidirectional query support, not a rewrite. |
| Abandon the frontend | React + Vite + Tailwind is fine. Decompose the components, don't rebuild the stack. |
| Add more prompt instructions to Gemini | We have spent weeks doing this. The prompts are good. The architecture is the constraint. |
| Make the deck "smarter" with one big prompt | Per-slide generation is the only approach that produces consistently rich content. One big prompt will always produce thin content. |
| Trust the AI to self-validate | "Check your own work" is a probabilistic instruction. Hooks are deterministic. |

---

*NXT HUMANS Intelligence Augmentation Suite*  
*Humans in Control Research Platform v3.0 Development Plan*  
*April 15, 2026*
