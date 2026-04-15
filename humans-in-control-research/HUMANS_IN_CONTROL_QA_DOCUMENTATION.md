# Humans in Control — QA, Testing & Implementation Status Documentation

**Version**: 2.0  
**Date**: April 15, 2026  
**Branch**: `Humans-in-Control-Overhaul-04.14.2026`  
**Platform**: NXT Humans Intelligence Augmentation Suite

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Pipeline Flow & Stages](#2-pipeline-flow--stages)
3. [Deliverable Specifications](#3-deliverable-specifications)
4. [Source Curation System](#4-source-curation-system)
5. [Evidence & Citation Pipeline](#5-evidence--citation-pipeline)
6. [Strategy Deck Pipeline](#6-strategy-deck-pipeline)
7. [Wiki Self-Improvement Engine](#7-wiki-self-improvement-engine)
8. [Export & Rendering](#8-export--rendering)
9. [Functional Test Cases](#9-functional-test-cases)
10. [Integration Test Cases](#10-integration-test-cases)
11. [UAT Scenarios](#11-uat-scenarios)
12. [Known Issues & Unfinished Work](#12-known-issues--unfinished-work)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Component & Service Inventory](#14-component--service-inventory)
15. [Type System Reference](#15-type-system-reference)
16. [Data Source Connector Registry](#16-data-source-connector-registry)

---

## 1. System Architecture

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript + Vite | React 19.2, Vite 6.2, TS 5.8 |
| Styling | Tailwind CSS + Inline Styles | Tailwind 3.4 |
| AI Primary | Google Gemini (gemini-2.5-flash) | @google/genai 1.49 |
| AI Secondary | Claude (claude-sonnet-4-6), OpenAI (gpt-5.4-mini) | Via proxy |
| Image Gen | Imagen 4 (via Gemini) | gemini-2.5-flash-image |
| Video Gen | VEO 3.1 (via Gemini) | veo-3.1-generate |
| Proxy | Python CORS proxy | Port 5012 |
| Export | PptxGenJS, html2canvas, jsPDF | 3.12, 1.4.1, 2.5.1 |
| Graph | D3.js (force-directed) | v7+ |
| Animations | Framer Motion | 11.0 |
| Container | Docker (multi-stage Node build) | Port 5011 |

### Data Flow

```
User Uploads + Research Goal
       |
  Data Collection (100+ sources via proxy:5012)
       |
  Source Curation (include/exclude/priority toggles)
       |
  Filtered Corpus (base64 text file)
       |
  Gemini Chat Session (ingestion -> themes -> personas -> ...)
       |
  10 Deliverables (each with citations[] + evidenceBasis)
       |
  Strategic Report (full whitepaper from all deliverables + raw sources)
       |
  Strategy Deck (content blocks -> layout resolver -> adaptive renderer)
       |
  Export (PDF, PPTX, HTML, JSON, CSV)
```

### Key Files

| File | Purpose | Lines |
|---|---|---|
| `App.tsx` | Root orchestrator: pipeline, state, routing | ~2900 |
| `services/geminiService.ts` | All AI generation (20+ functions) | ~2700 |
| `services/layoutResolver.ts` | Content-block to archetype resolution | ~230 |
| `services/slidePostProcessor.ts` | Validation, correction, content budgets | ~900 |
| `services/exportService.ts` | PPTX, HTML, JSON export | ~800 |
| `services/wikiService.ts` | Wiki CRUD, banned phrases, quality gates | ~600 |
| `services/promptImprovementEngine.ts` | Edit detection, constraint learning | ~400 |
| `services/researchFabricOrchestrator.ts` | Data collection, corpus assembly | ~1000 |
| `services/dataSourceConnectors.ts` | 100+ unified data source connectors | ~500 |
| `services/knowledgeGraphBuilder.ts` | Incremental KG construction | ~500 |
| `components/AnalysisCheckpoint.tsx` | 14 checkpoint renderers | ~2450 |
| `components/ResultsView.tsx` | 10 output tabs + export | ~2350 |
| `components/ResearchKnowledgeGraph.tsx` | D3 force graph | ~1020 |
| `types.ts` | All interfaces and enums | ~900 |

---

## 2. Pipeline Flow & Stages

### Stage Sequence

| # | Stage | Checkpoint? | Generates | Key Function |
|---|---|---|---|---|
| 0 | Configuration | No | Research goal, output selection, file uploads, data source toggles | App.tsx |
| 1 | Data Collection | No (live feed) | `liveSourceResults[]` (100-1500 items from 15-25 sources) | `researchFabricOrchestrator.ts` |
| 2 | Source Curation | Inline | `excludedSources` Set, `prioritySources` Set | App.tsx SOURCE DETAIL panel |
| 3 | Ingestion | Yes | Confidence score, summary, key stakeholders, data types | `ingestContext()` |
| 4 | Themes | Yes | 12-25 themes with `citations[]`, `isCrossDocument`, `status` | `generateThemes()` |
| 5 | Personas | Yes | 3-8 personas with evidence arrays (motivations, painPoints, opportunities) | `generatePersonas()` |
| 6a | Journey Map | Yes | 5-8 service blueprint stages with `citations[]`, `evidenceBasis` | `generateJourneyMap()` |
| 6b | Tech Architecture | Yes | Nodes, flows, 10 sections with citations per node | `generateTechArchitecture()` |
| 6c | PRD | Yes | 16 sections + features with `citations[]`, `evidenceBasis` per feature | `generatePRD()` |
| 6d | Roadmap | Yes | NOW/NEXT/LATER items with `citations[]`, `evidenceBasis` | `generateRoadmap()` |
| 6e | Recommendations | Yes | Strategic recs with `citations[]`, `evidenceBasis` + 15-section strategy doc | `generateRecommendations()` |
| 6f | Gap Analysis | Yes | Capability gaps with `citations[]`, `evidenceBasis` + risk register | `generateGapAnalysis()` |
| 6g | Tech Audit | Yes | Systems inventory + integration map with `citations[]`, `evidenceBasis` | `generateTechAudit()` |
| 6h | Competitive | Yes | Peers, maturity matrix, gap summary with `citations[]`, `evidenceBasis` | `generateCompetitiveAnalysis()` |
| 7 | Strategic Report | Yes (editable) | 12-18 section whitepaper with keyMetrics, keyQuote, citations per section | `generateStrategicReport()` |
| 8 | Deck Structure | Yes | 15-30 slide outlines with `sourceDeliverable`, `personaRef` | `generateDeckStructure()` |
| 9 | Deck Narrative | Yes | Content blocks per slide -> `resolveLayout()` -> Slide objects | `generateNarrative()` |
| 10 | Final | Yes | Persona images injected, post-processing, slop correction | `visualizeNarrative()` |

### Stage Dependencies

```
Configuration
  -> Data Collection (if sources enabled)
    -> Source Curation (inline, during collection)
  -> Ingestion (checkpoint)
    -> Themes (checkpoint)
      -> Personas (checkpoint)
        -> [parallel branches]:
          -> Journey Map (checkpoint)
          -> Tech Architecture (checkpoint)
          -> PRD (checkpoint)
            -> Roadmap (checkpoint)
          -> Recommendations (checkpoint)
            -> Cross-Cutting Synthesis
          -> Gap Analysis (checkpoint)
          -> Tech Audit (checkpoint)
          -> Competitive Analysis (checkpoint)
        -> Strategic Report (checkpoint, requires all deliverables)
          -> Deck Structure (checkpoint)
            -> Deck Narrative (checkpoint)
              -> Final Visualization (checkpoint)
```

### Checkpoint Approval Flow

Each checkpoint supports three actions:

1. **Approve & Continue** — Accepts output as-is, advances pipeline
2. **Provide Feedback** — Regenerates current stage with user feedback injected into prompt
3. **Edit Data** — User modifies fields directly, edited data persists to next stage

All edits are logged via `promptImprovementEngine.ts` for cross-session learning.

---

## 3. Deliverable Specifications

### Evidence Fields Per Deliverable

| Deliverable | TypeScript Type | `citations[]` | Schema Requires? | Rendering Shows? |
|---|---|---|---|---|
| Themes | `Theme` | Full `Citation[]` with sourceFile, text, url, sourceName, author, date | Required (3+ per theme) | Full display in checkpoint |
| Personas | `Persona` | `EvidenceItem[]` on motivations, painPoints, opportunities | Required (quote + source) | Full display in output tab |
| Journey Map | `ServiceBlueprintStage` | `citations?: string[]` | Required | EvidenceBlock in detail view |
| Recommendations | `StrategicRecommendation` | `citations?: string[]` | Required | EvidenceBlock in output tab |
| PRD | `PRDFeature` | `citations?: string[]` | Required | EvidenceBlock per feature |
| Roadmap | `RoadmapItem` | `citations?: string[]` | Required | EvidenceBlock per item |
| Gap Analysis | `GapItem` | `citations?: string[]` | Required | EvidenceBlock per gap |
| Tech Audit | `SystemRecord` | `citations?: string[]` | Required | EvidenceBlock per system |
| Competitive | `CompetitorProfile` | `citations?: string[]` | Required | EvidenceBlock per peer |
| Tech Architecture | `TechnicalArchitecture` | `citations?: string[]` | Required (per node) | EvidenceBlock per node |

### Evidence Display Component

All output tabs use a shared `EvidenceBlock` component that renders:
- **Source pills**: Teal-colored tag badges with source names
- **Evidence basis**: Italic text summarizing the supporting data
- Renders nothing when both fields are absent

---

## 4. Source Curation System

### State Management

```typescript
excludedSources: Set<string>  // Keys: "sourceId::articleIndex" or "kg::nodeId"
prioritySources: Set<string>  // Same key format, marks for mandatory citation
```

**Default state**: ALL articles INCLUDED (only excluded items tracked in the Set)

### Toggle Locations

| Location | Key Format | Action |
|---|---|---|
| SOURCE DETAIL panel (per article) | `"sourceId::j"` | Include/Exclude toggle + Priority star |
| SOURCE DETAIL header (per source) | `"sourceId"` | Exclude ALL articles from source |
| Knowledge Graph node | `"kg::nodeId"` | Exclude via graph interaction |

### Filtering Pipeline

1. **At Ingestion** (App.tsx lines 2179-2230): Corpus text filtered by `excludedSources` before `ingestContext()`. Excluded articles never reach the Gemini chat session. Supports both direct exclusion (`sourceId::j`) and KG exclusion (`kg::nodeId` with dual title matching: full + 40-char prefix).

2. **At Report Generation** (App.tsx lines 1174-1197): `liveSourceResults` filtered into `curatedSources` before `generateStrategicReport()`. Priority articles tagged with `priority: true` property.

3. **Evidence Catalog** (geminiService.ts lines 2440-2475): ALL included articles injected (no per-source caps). Priority articles sort first, then by relevance score. No article that reaches this point is dropped.

### Priority Citation Enforcement

- Priority articles marked with `*** PRIORITY CITATION ***` in evidence catalog
- Report prompt mandates: "You MUST cite EVERY priority-flagged article by name, include a direct quote or specific data point, place them prominently"
- **Known gap**: No post-generation validation that priority articles were actually cited (see KI-003)

### Persistence

| What | Where | Restored? |
|---|---|---|
| `excludedSources` | `localStorage: hic_curation_{slug}` | Not auto-restored (manual) |
| `prioritySources` | Not persisted | Lost on refresh (KI-010) |
| Curation decisions | `wiki/sources/{date}-{slug}-curation.md` | Available for cross-session reference |
| Edit signals | `promptImprovementEngine` | Pattern detection for future runs |

---

## 5. Evidence & Citation Pipeline

### Evidence Injection into Strategic Report

| Aspect | Implementation |
|---|---|
| Articles per source | ALL included articles (no cap). Previously limited to 10-15. |
| Content depth | T1 Academic: 2000 chars, T2 News: 1500 chars, T3 Social: 3000 chars |
| Sort order | Priority articles FIRST, then by relevance score descending |
| Citation resolution | `[CHUNK_XXX]` resolved to `"SourceName: ArticleTitle"` via chunk map |
| Minimum sources | Prompt mandates 20+ distinct named sources per report |
| Mandatory elements | Case studies (3+ min), verbatim social evidence, convergent evidence notation |

### Citation Resolution Pipeline

1. **At Generation**: `resolveChunksInText()` replaces `[CHUNK_XXX]` with `"SourceName: ArticleTitle"` in all deliverable serialization
2. **At Post-Processing**: `resolveCitations()` in slidePostProcessor handles `[FILE N]`, `[CHUNK_XXX]`, comma-separated chunk lists, raw filenames
3. **Final Sweep**: Regex removes any surviving `[CHUNK_XXX]` references
4. **In ResultsView**: `cleanText()` applies all above + whitespace cleanup

### Deterministic Slide Enrichment

After AI generates content blocks and layout resolution runs, a deterministic enrichment step (geminiService.ts) injects report data directly into slides:

| Condition | Action |
|---|---|
| Empty `metrics[]` | Filled from matching report section `keyMetrics` |
| Empty `quote` | Filled from matching report section `keyQuote` |
| Empty `sources[]` | Filled from matching report section `citations` |
| Content labels < 40 chars | Replaced with report section evidence sentences |
| Empty `content[]` | Pulled from matching report section (first 3 sentences > 50 chars) |

### Report Section Matching (Per-Slide)

Multi-strategy matching connects slides to report sections:
1. Exact `sourceDeliverable` match
2. Partial deliverable prefix match (e.g., `"themes"` matches `"themes_deep_dive"`)
3. Title substring match (first 25 chars)
4. Keyword fallback (words > 4 chars from slide title)

---

## 6. Strategy Deck Pipeline

### Content-Block Architecture

The AI declares WHAT to communicate using 12 content block types. The layout resolver determines HOW to present it.

#### 12 Content Block Types

| Block Type | Purpose | Maps To |
|---|---|---|
| `hero_stat` | Headline number | `metrics[]` |
| `evidence_bullets` | Research findings with sources | `content[]` |
| `metric_cards` | KPI data points | `metrics[]` |
| `quote_block` | Verbatim quote with provenance | `quote` + `sources[]` |
| `persona_card` | Persona reference (image auto-injected) | `personaName/Role/Quote` |
| `problem_statement` | Challenge with evidence | `problemStat` |
| `solution_points` | Actionable solutions | `solutionPoints[]` |
| `data_grid` | Mixed data for bento layout | `bentoCells[]` |
| `journey_strip` | Service blueprint stage | `content[]` |
| `comparison_row` | Gap/competitive comparison | `bentoCells[]` |
| `narrative_text` | Analytical prose | `narrative` |
| `section_label` | Section divider | (SECTION_HEADER layout) |

#### Layout Resolution Rules (Priority-Ordered)

| Priority | Condition | Layout |
|---|---|---|
| 1 | Only `section_label` blocks | SECTION_HEADER |
| 2 | No evidence/metrics/data blocks | TITLE_SLIDE |
| 3 | `problem_statement` + `solution_points` | PROBLEM_SOLUTION |
| 4 | `hero_stat` + 3+ metric items | CONTENT_INSIGHT_CHART |
| 5 | 4+ data_grid items OR 4+ distinct block types | BENTO_GRID |
| 6 | 3+ evidence_bullet items without metrics | FULL_WIDTH_VIZ |
| 7 | Default | CONTENT_DATA_PANEL |

#### Adaptive Slide Renderer (HTML/PDF)

Body slides use ONE adaptive renderer (replaced 5 rigid archetype templates):
- **Left side**: Title, evidence points, problem stat, solution points, quote, persona card
- **Right data panel**: Only appears IF metrics, bento cells, or right-side quote exist
- **Full-width**: When no data panel data exists, content expands to 100%

### Post-Processing Pipeline

| Step | Function | Auto-Corrects? |
|---|---|---|
| Markdown stripping | `stripSlideMarkdown()` | Yes |
| Citation resolution | `resolveCitations()` | Yes |
| CHUNK sweep | Regex removal | Yes |
| Meta-narration removal | `removeMetaNarration()` (19 patterns) | Yes |
| Placeholder resolution | `resolvePlaceholders()` | Yes |
| SaaS CTA detection | `detectSaasCTAs()` | No (flags only) |
| Topic title check | `isTopicTitle()` | No (flags only) |
| Depth validation | `validateSlideDepth()` (3-layer) | No (flags only) |
| Hallucination guard | Fabricated stat detection | No (flags only) |
| Visual prompt sanitization | `sanitizeVisualPrompt()` | Yes |
| Slop correction | 350+ banned phrases | Yes (removes) |
| Content budgets | `enforceContentBudgets()` | Yes (truncates at sentence boundary) |

### Content Budget Limits

| Field | Max Chars | Truncation |
|---|---|---|
| `title` | 120 | Sentence boundary |
| `content[i]` | 200 | Sentence boundary |
| `quote` | 250 | Sentence boundary |
| `narrative` | 400 | Sentence boundary |
| `speakerNotes` | 600 | Sentence boundary |
| `bentoCells[i].text` | 100 | Sentence boundary |
| `solutionPoints[i].desc` | 150 | Sentence boundary |

### Structure Validation (Auto-Retry)

| Rule | Severity | Action |
|---|---|---|
| Every available deliverable must have >= 1 slide | Blocking | Auto-retry with feedback |
| Slide count >= 12 (if 5+ deliverables) | Blocking | Auto-retry |
| Persona slides must exist (if personas available) | Blocking | Auto-retry |
| Journey map slide must exist (if journey available) | Blocking | Auto-retry |
| No 3+ consecutive same `sourceDeliverable` | Warning | Logged |

---

## 7. Wiki Self-Improvement Engine

### Cross-Session Learning Loop

```
User edits at checkpoint
  -> logEdit(stage, field, original, edited)
    -> detectPatterns() (every 5th edit)
      -> Auto-approve patterns with 5+ occurrences and 60%+ consensus
        -> getActiveConstraints() injected into generation prompts
          -> exportConstraintsToWiki() persists to wiki/synthesis/learned-constraints.md
            -> loadWikiConstraints() on next session startup
```

### Wiki Integration Points

| Phase | Wiki Input | Wiki Output |
|---|---|---|
| Pre-Generation | Frameworks, anti-patterns, benchmarks, evidence, constraints, engagement memory | -- |
| Report Generation | Learned constraints + engagement memory | Report archived |
| Deck Narrative | Learned constraints + engagement memory | -- |
| Post-Run | -- | Sources, themes, evidence, curation decisions archived |

### Quality Assessment

| Metric | Method | Threshold |
|---|---|---|
| Slop detection | `detectBannedPhrases()` — 350+ phrases in 14 categories | 0 violations = pass |
| Quality score | `scoreOutput()` — completeness, depth, evidence, visual, specificity (0-5 each) | >= 3.8 overall |
| Evidence density | `computeEvidenceDensity()` — citation coverage percentage | > 60% = good |

---

## 8. Export & Rendering

### Export Formats

| Format | Implementation | Notes |
|---|---|---|
| PDF | html2canvas (scale 1.5) + jsPDF | JPEG 0.85 for light slides, PNG for dark |
| PPTX | PptxGenJS with archetype renderers | 16:9, NXT brand colors, footnote strips |
| HTML Report | `exportStrategicReportHTML()` | NXT-branded whitepaper with TOC, citations, metrics |
| JSON | Full result object (images stripped) | For data portability |
| CSV | Per-tab export | Personas, features, roadmap items, etc. |

### NXT Design System Tokens

| Token | Value | Usage |
|---|---|---|
| `--nxt-lime` | #B8B800 | Accent, buttons, highlights |
| `--nxt-teal` | #115054 | Headers, primary actions |
| `--nxt-cyan` | #00B7C3 | Data panels, links |
| `--nxt-negative` | #CC6644 | Problems, warnings |
| `--nxt-black` | #0D0D0D | Dark backgrounds, sidebar |
| Font Primary | Archivo (200-900) | All body text |
| Font Display | Bebas Neue | Section headers, titles |
| Font Code | JetBrains Mono (400-500) | Citations, code, IDs |
| Border Radius | 2-4px | Minimal, modern aesthetic |

---

## 9. Functional Test Cases

### TC-001: Research Pipeline — Happy Path

| Step | Action | Expected Result |
|---|---|---|
| 1 | Enter research goal + upload 2 PDFs | Goal text captured, files shown in grid |
| 2 | Select outputs: Personas, Strategy Deck, Journey Map, Recommendations | 4 checkboxes selected |
| 3 | Enable News + Academic sources | Source toggles green |
| 4 | Click "Collect Data & Initialize" | Live source feed shows collection progress |
| 5 | Wait for collection complete | Source pills appear, item counts shown |
| 6 | Click a source pill | SOURCE DETAIL panel opens with article list |
| 7 | Toggle 3 articles to "Excluded" | Articles grayed out, excluded count updates |
| 8 | Flag 2 articles as "Priority" | Gold star appears |
| 9 | Approve Ingestion checkpoint | Themes generation starts |
| 10 | Review themes, mark 2 as Priority, 1 as Skip | Theme statuses update |
| 11 | Approve each deliverable checkpoint in sequence | Pipeline advances through all stages |
| 12 | At Strategic Report checkpoint, verify evidence depth | Report has 12+ sections, keyMetrics, keyQuotes, named citations |
| 13 | Toggle 2 report sections "Skip in Deck" | Sections dimmed |
| 14 | Approve report, review deck structure | sourceDeliverable + personaRef badges visible per slide |
| 15 | Approve narrative, view final results | Slides render with metrics, quotes, source pills |
| 16 | Export PDF, PPTX, HTML Report | Files download, PDF < 40MB |

### TC-002: Source Curation — Excluded Articles Must Not Appear

| Step | Action | Expected Result |
|---|---|---|
| 1 | Collect data with 5+ sources | Sources collected |
| 2 | Exclude ALL articles from one source (e.g., Reddit) | Source header shows "Excluded" |
| 3 | Run full pipeline | Pipeline completes |
| 4 | Search report text for excluded source name | Excluded source NOT cited anywhere |
| 5 | Check theme citations | No theme cites excluded source |

### TC-003: Source Curation — Priority Articles Must Be Cited

| Step | Action | Expected Result |
|---|---|---|
| 1 | Flag 3 specific articles as Priority | Gold stars visible |
| 2 | Run pipeline through Strategic Report | Report generated |
| 3 | Search report for each priority article's title/source | All 3 articles cited by name |

### TC-004: Evidence Display in All Output Tabs

| Step | Action | Expected Result |
|---|---|---|
| 1 | Generate full pipeline | All deliverables created |
| 2 | Navigate to Recommendations tab | Each rec shows EvidenceBlock with citations + evidenceBasis |
| 3 | Navigate to Roadmap tab | Each item shows EvidenceBlock |
| 4 | Navigate to PRD tab | Each feature shows EvidenceBlock |
| 5 | Navigate to Gap Analysis tab | Each gap shows EvidenceBlock |
| 6 | Navigate to Competitive tab | Each peer shows EvidenceBlock |
| 7 | Navigate to Tech Audit tab | Each system shows EvidenceBlock |
| 8 | Navigate to Journey tab | Each stage shows EvidenceBlock in detail view |
| 9 | Navigate to Tech Arch tab | Each node shows EvidenceBlock |

### TC-005: Checkpoint Editing

| Step | Action | Expected Result |
|---|---|---|
| 1 | At Themes checkpoint, edit a theme description | Text updates, "hasEdits" flag true |
| 2 | Approve with edits | Edited data persists to next stage |
| 3 | At Report checkpoint, edit section content | Textarea auto-sizes, content updates |
| 4 | Toggle section "Skip in Deck" | Section dims, `includeInDeck=false` |
| 5 | At Structure checkpoint, reorder slides | Slide numbers update |
| 6 | Delete a slide | Slide removed, remaining renumbered |
| 7 | Change slide layout dropdown | Layout updates (7 archetype options) |

### TC-006: Deck Narrative — Content Block Generation

| Step | Action | Expected Result |
|---|---|---|
| 1 | Approve deck structure | Narrative generation starts |
| 2 | At Narrative checkpoint, verify slide has metrics | Metric cards visible with numbers + labels |
| 3 | Verify slide has source citations | Teal source pill tags visible |
| 4 | Verify persona slide has persona card | Persona name, role, image shown |
| 5 | Approve narrative, view final slides | Adaptive renderer shows content without broken templates |

### TC-007: Knowledge Graph Curation

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open Knowledge Graph | D3 force graph renders with source, theme, persona nodes |
| 2 | Click a source node | Detail panel shows node metadata |
| 3 | Exclude a source via KG toggle | `"kg::nodeId"` added to excludedSources |
| 4 | Run pipeline | Excluded source's articles filtered from corpus |

---

## 10. Integration Test Cases

### IT-001: Proxy Data Collection

| Test | Endpoint | Expected |
|---|---|---|
| Health check | `GET http://localhost:5012/health` | 200 OK |
| Search GDELT | `GET /api/search/gdelt?q=higher+education&limit=5` | JSON with `items[]`, `credibilityTier` |
| Search OpenAlex | `GET /api/search/openalex?q=AI+education&limit=5` | JSON with `items[]`, T1 tier |
| Multi-search | `GET /api/multi-search?q=test&sources=gdelt,openalex` | Array of results per source |
| Timeout | Request with 45s timeout | AbortError if exceeded |
| Retry | Simulate 503 response | Retries 3x with 1.5s/3s/4.5s backoff |

### IT-002: Gemini API Integration

| Test | Operation | Expected |
|---|---|---|
| Chat session create | `new GenAISession(goal, ...)` | Session created, system instruction set |
| Ingest context | `ingestContext(files)` | Returns confidence score, stakeholders |
| Stream response | `sendMessageStream()` | Chunks received, fullText assembled |
| Schema validation | `responseMimeType: "application/json"` | Response matches schema |
| Retry on 503 | `withRetry()` with transient error | Retries 3x with exponential backoff |
| JSON repair | `tryRepairJson()` on malformed response | Valid JSON returned |

### IT-003: Tri-Model Analysis

| Test | Scenario | Expected |
|---|---|---|
| All 3 succeed | Gemini + Claude + OpenAI respond | Synthesis from all 3 models |
| Claude fails | Claude returns error | Synthesis from Gemini + OpenAI only |
| All fail | All models return errors | Graceful degradation, original corpus used |
| Timeout | Model exceeds dynamic timeout | AbortError caught, fallback to remaining models |

---

## 11. UAT Scenarios

### UAT-001: End-to-End Research Quality

**Scenario**: User conducts research on "Higher Education CX Strategy" with 5 uploaded documents and 10+ data sources enabled.

**Acceptance Criteria**:
- Report cites 20+ distinct named sources (not "research" or "intelligence_sources")
- Report includes at least 3 case studies with named institutions
- Report includes verbatim social evidence (Reddit/forum quotes)
- Every deliverable tab shows EvidenceBlock with citations and evidence basis
- Deck slides have source citation pills visible
- Excluded articles do NOT appear in any output
- Priority articles ARE cited in the report

### UAT-002: Source Curation Control

**Scenario**: User excludes all Tier 3 (community) sources, keeps only T1 + T2.

**Acceptance Criteria**:
- No Reddit, forum, or community source cited in report or deck
- Themes grounded exclusively in academic + news sources
- Persona evidence arrays cite only T1/T2 sources

### UAT-003: Deck Visual Quality

**Scenario**: User generates a strategy deck and exports as PDF.

**Acceptance Criteria**:
- No blank/empty slide panels
- Every body slide has at least 2 evidence points or metrics
- Slide titles are conclusion sentences (not topic labels)
- No meta-narration ("Good morning", "We will present")
- PDF size < 40MB
- PPTX renders all archetypes correctly

### UAT-004: Self-Improvement Learning

**Scenario**: User runs 2 analyses. In session 1, they consistently shorten persona quotes. In session 2, the system should auto-apply the constraint.

**Acceptance Criteria**:
- Session 1: edits logged, pattern detected after 5+ edits
- Session 1: constraint auto-approved ("persona quotes < X chars")
- Session 2: constraint loaded from wiki on startup
- Session 2: persona quotes generated shorter without user intervention

---

## 12. Known Issues & Unfinished Work

### CRITICAL

#### KI-001: Strategy Deck Output Quality

**Severity**: CRITICAL  
**Status**: Partially mitigated

The deck output still does not consistently reflect the depth of collected research data. The content-block system and report-first architecture are implemented, but the AI sometimes generates thin content blocks. The deterministic enrichment step helps but cannot fully compensate.

**Root Cause**: Gemini 2.5 Flash may produce minimal content blocks when given a complex 12-type schema. Per-slide report section matching can miss sections due to `sourceDeliverable` mismatches.

**Workaround**: Deterministic enrichment injects report metrics/quotes/citations into thin slides. Users should review at Narrative checkpoint and provide feedback to regenerate.

#### KI-002: PPTX Export Still Uses Old Archetype Renderers

**Severity**: CRITICAL  
**Status**: Not started

The HTML renderer was replaced with an adaptive renderer, but the PPTX export in `exportService.ts` still uses the old 7 rigid archetype renderers. PPTX output may have broken templates (empty data panels, mismatched layouts) even when the HTML preview looks correct.

**Fix needed**: Complete rewrite of PPTX slide generation to match adaptive renderer logic.

#### KI-003: No Validation That Priority Articles Were Actually Cited

**Severity**: CRITICAL  
**Status**: Not started

The prompt says "MUST cite every priority article" but there is no post-generation validation. The AI may ignore priority flags. No error or warning is shown to the user if priority articles are missing from the report.

**Fix needed**: Post-generation scan of report text for priority article titles + user warning.

### HIGH

#### KI-004: Deliverable Evidence Depends on AI Compliance

**Severity**: HIGH  
**Status**: Schema enforcement only

While Gemini schemas now REQUIRE `citations[]` and `evidenceBasis` as fields, the AI may return empty arrays or generic strings. There is no post-generation validation that these fields are actually populated with real source names.

#### KI-005: Persona Enrichment Uses Standalone Call Without Full Corpus

**Severity**: HIGH  
**Status**: By design (mitigated)

Persona enrichment deliberately uses a standalone Gemini call to avoid context contamination. The persona AI only sees the roster + theme citations (up to 20 evidence quotes), NOT the full 500KB+ research corpus. Theme evidence injection added as mitigation.

#### KI-006: 500KB Corpus Cap at Ingestion

**Severity**: HIGH  
**Status**: By design

The research corpus text has a hard 500KB cap in `mergeResultsToCorpus()`. Lower-relevance items get truncated. These truncated items still appear in the Knowledge Graph but don't reach theme/persona generation. Report generation bypasses this via direct `rawSources` injection.

#### KI-007: Report Checkpoint Textarea Sizing

**Severity**: HIGH  
**Status**: Partially fixed

Report section textareas use `rows={Math.ceil(content.length / 90)}` which is an approximation. Very long sections may still require scrolling. No auto-resize on user input.

### MEDIUM

#### KI-008: No Dedicated Themes Output Tab

**Severity**: MEDIUM  
**Status**: Not started

Themes are the foundational deliverable but have no dedicated tab in ResultsView. They're visible in the checkpoint and knowledge graph but cannot be viewed/exported as a standalone output.

#### KI-009: Competitive Analysis Missing Benchmark + Maturity Matrix in Rendering

**Severity**: MEDIUM  
**Status**: Partially rendered

The competitive analysis generates `benchmarkDimensions[]`, `maturityMatrix[]`, and `gapSummary[]` but only peers are rendered in the output tab. The full competitive positioning data is generated but hidden.

#### KI-010: Priority Sources Not Persisted to localStorage

**Severity**: MEDIUM  
**Status**: Not started

`excludedSources` is persisted to localStorage but `prioritySources` is not. Priority flags are lost on page refresh.

#### KI-011: D3 Knowledge Graph Not Keyboard Accessible

**Severity**: MEDIUM  
**Status**: Known gap

The force-directed graph uses D3 SVG elements with no ARIA attributes or keyboard navigation. Screen readers cannot interpret the graph structure. The detail panel IS accessible.

#### KI-012: Tech Architecture Sections Not Rendered in Output Tab

**Severity**: MEDIUM  
**Status**: Not started

Tech Architecture generates 10 sections (current state, future state, data arch, security, etc.) but the output tab only shows the node diagram and basic node details. The rich section content is hidden.

---

## 13. Non-Functional Requirements

### Performance

| Metric | Target | Current | Status |
|---|---|---|---|
| Data collection (15 sources) | < 120s | 60-180s | Variable |
| Full pipeline (all 10 deliverables) | < 10min | 8-15min | Variable |
| PDF export | < 30s | 15-45s | Variable |
| PDF file size | < 40MB | 20-35MB | Pass |
| PPTX export | < 10s | 3-8s | Pass |
| Knowledge graph render (500 nodes) | < 2s | 1-3s | Pass |

### Reliability

| Scenario | Handling |
|---|---|
| Gemini 503/overloaded | Exponential backoff retry (3 attempts, 2-5s base delay) |
| Network disconnect mid-stream | Full step retry (up to 5 attempts) |
| Proxy timeout | 45s AbortSignal, 3 retries with 1.5s-4.5s backoff |
| Malformed JSON response | `tryRepairJson()` with bracket balancing, markdown stripping |
| localStorage quota exceeded | Remove oldest projects, then strip images, then warn |
| Wiki write failure | Non-blocking try/catch, analysis continues |
| Tri-model partial failure | Continue with available models (graceful degradation) |

### Security

| Concern | Status |
|---|---|
| API keys in environment variables | Pass — Keys injected via Vite define, not in source |
| No user authentication | N/A — Single-user local deployment |
| CORS proxy | Pass — Proxy on localhost only |
| File upload validation | Partial — No max file size enforcement |

---

## 14. Component & Service Inventory

### React Components

| Component | Lines | Props | State | Purpose |
|---|---|---|---|---|
| `App.tsx` | ~2900 | 0 | 45+ | Root orchestrator: pipeline, state, routing |
| `AnalysisCheckpoint.tsx` | ~2450 | 5 | 23 | 14 checkpoint renderers (edit/approve/feedback) |
| `ResultsView.tsx` | ~2350 | 4 | 19 | 10 output tabs + export (PDF/PPTX/JSON/CSV) |
| `ResearchKnowledgeGraph.tsx` | ~1020 | 5 | 3 | D3 force-directed knowledge graph |
| `FileUpload.tsx` | ~140 | 2 | 2 | Drag & drop file upload with DOCX extraction |
| `LiveSourceFeed.tsx` | ~200 | 7 | 1 | Real-time data collection progress |
| `HeuristicBriefIntake.tsx` | ~300 | 2 | 10 | UX heuristic evaluation form (8 dimensions) |
| `HeuristicReportView.tsx` | ~23200 | 2 | N/A | UX heuristic report viewer |

### Services

| Service | Functions | Purpose |
|---|---|---|
| `geminiService.ts` | 20+ | All AI generation (themes through deck visualization) |
| `layoutResolver.ts` | 2 | Content-block to archetype resolution + field mapping |
| `slidePostProcessor.ts` | 15+ | Validation, correction, content budgets, slop detection |
| `exportService.ts` | 5+ | PPTX, HTML report, JSON export |
| `wikiService.ts` | 10+ | Wiki CRUD, banned phrases, quality gates, framework loading |
| `promptImprovementEngine.ts` | 10+ | Edit logging, pattern detection, constraint management |
| `researchFabricOrchestrator.ts` | 8+ | Data collection, corpus assembly, query refinement |
| `dataSourceConnectors.ts` | 100+ | Unified proxy connector factory for 100+ data sources |
| `deepResearchService.ts` | 6+ | 3-mode live web research (quick/focused/deep) |
| `knowledgeGraphBuilder.ts` | 10+ | Incremental KG construction from deliverables |
| `aiRouter.ts` | 5+ | Multi-model routing, JSON repair |
| `heuristicAnalysisService.ts` | 2 | 8-dimension UX evaluation |
| `cxIntegrationService.ts` | 10+ | Reddit/TrustPilot/Play Store collection + topic modeling |

---

## 15. Type System Reference

### Core Pipeline Types

```typescript
// Analysis stages (pipeline checkpoints)
enum AnalysisStage {
  IDLE, DATA_REVIEW, INGESTION, THEMES, PERSONAS,
  PRD, ROADMAP, JOURNEY_MAP, TECH_ARCH, RECOMMENDATIONS,
  GAP_ANALYSIS, TECH_AUDIT_STAGE, COMPETITIVE_ANALYSIS,
  STRATEGIC_REPORT, DECK_STRUCTURE, NARRATIVE, FINAL
}

// Output selection
enum OutputOption {
  PERSONAS, STRATEGY_DECK, JOURNEY_MAP, TECH_ARCH,
  STRATEGIC_RECS, PRD, ROADMAP, GAP_ANALYSIS,
  TECH_AUDIT, COMPETITIVE_ANALYSIS
}

// Analytical lenses
type AnalyticalLens = 'general_cx' | 'fundraising_advancement' |
  'student_learner' | 'digital_product' | 'enterprise_technology' | 'custom';
```

### Evidence Types

```typescript
interface Citation {
  sourceFile: string;    // CHUNK_XXX reference
  text: string;          // Verbatim quote (10-30 words)
  url?: string;
  sourceName?: string;   // Human-readable source name
  author?: string;
  publicationDate?: string;
}

interface EvidenceItem {
  label: string;
  quote: string;         // Direct quote from source
  citation: Citation;
}
```

### Content Block Types

```typescript
type ContentBlockType =
  | 'hero_stat' | 'evidence_bullets' | 'metric_cards' | 'quote_block'
  | 'persona_card' | 'problem_statement' | 'solution_points' | 'data_grid'
  | 'journey_strip' | 'comparison_row' | 'narrative_text' | 'section_label';

interface SlideGeneration {
  slideNumber: number;
  title: string;
  background: 'light' | 'dark';
  sourceDeliverable: string;
  personaRef?: string;
  blocks: ContentBlock[];
  speakerNotes: string;
  sources: string[];
}
```

### Slide Architecture

```typescript
type SlideLayout =
  | 'TITLE_SLIDE' | 'SECTION_HEADER' | 'CONTENT_DATA_PANEL'
  | 'CONTENT_INSIGHT_CHART' | 'FULL_WIDTH_VIZ' | 'BENTO_GRID'
  | 'PROBLEM_SOLUTION'
  // + 10 legacy aliases mapped at render time
```

---

## 16. Data Source Connector Registry

### Source Categories

| Category | Sources | Tier |
|---|---|---|
| Higher-Ed News | Higher Ed Dive, Inside Higher Ed, EdSurge, Hechinger Report, Campus Technology, The Conversation, Open Campus | T2 |
| Academic Literature | OpenAlex, Semantic Scholar, Crossref, DOAJ, Europe PMC, CORE, DataCite, Zenodo | T1 |
| Education Data | College Scorecard, ERIC | T1 |
| Economic Data | World Bank, FRED | T1 |
| Government Data | USAspending, Federal Register, Congress.gov, SEC EDGAR | T1 |
| Open Data Portals | Data.gov, Data.gov.uk, NYC Open Data, Data.gov.au, Open Canada, EU Data, LA/SF/Texas data portals | T1 |
| Tech & Social | Hacker News, GDELT | T2/T3 |
| AI News | MIT Tech Review, IEEE Spectrum, VentureBeat, TechCrunch, Ars Technica, WIRED, The Verge, + 14 more | T2 |
| AI Lab Blogs | OpenAI, Google AI, DeepMind, Meta AI, Microsoft Research, NVIDIA, Hugging Face, Anthropic, + 12 more | T2 |
| AI Research | arXiv (8 categories), OpenReview, DBLP | T1 |
| AI Models & Datasets | Hugging Face Models/Datasets, OpenML, Kaggle, Papers with Code | T2 |
| AI Policy | Brookings, Stanford HAI, OECD, EFF, Ada Lovelace, AI Now, Georgetown CSET, NIST AI | T1 |
| AI Communities | Stack Overflow AI, Reddit r/MachineLearning, r/artificial, r/LocalLLaMA | T3 |
| CX Mesh | Reddit (custom subreddits), TrustPilot, Google Play Store reviews | T3 |
| Web Intelligence | Jina Reader (custom URLs), YouTube transcription | T2/T3 |
| Deep Research | Gemini grounded search (quick), Claude web search (focused), Gemini Interactions (deep) | T1 |

### Credibility Tiers

| Tier | Label | Examples | Visual Encoding |
|---|---|---|---|
| T1 | Academic / Government | OpenAlex, Federal Register, College Scorecard | Solid black fill, no stroke |
| T2 | Industry / News | Higher Ed Dive, GDELT, VentureBeat | Dark gray fill, medium stroke |
| T3 | Community / Social | Reddit, TrustPilot, Play Store reviews | Transparent fill, dashed stroke |

---

*NXT HUMANS Intelligence Augmentation Suite — Humans in Control Research Platform*  
*Generated April 15, 2026 — Branch: Humans-in-Control-Overhaul-04.14.2026*
