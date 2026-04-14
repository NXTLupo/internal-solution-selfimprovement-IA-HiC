---
title: "HiC Research Platform Enhancement Plan"
type: synthesis
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md, app-inventory-2026-04-10]
confidence: high
status: active
tags: [enhancement-plan, architecture, wiki-integration, quality]
evidence_count: 0
---

# Enhancement Plan: Wiki-Integrated Generation Architecture

## Current State Assessment

The Humans in Control research platform is a production-grade multi-AI orchestration system with:
- 11 deliverable types with consulting framework prompts (deliverableFrameworks.ts)
- Multi-model AI routing (Claude Opus 4.6, GPT-5.4, Gemini 2.5 Flash)
- 7-stage human-in-the-loop pipeline with dynamic branching
- 3-tier credibility system for sources (Peer-Reviewed / Established / Community)
- Source provenance tracking with freshness and relevance scoring
- 20 elite visual style systems
- Knowledge graph visualization
- Export to PPTX, JSON, PDF

**Overall quality score: ~2.9/5.0 (below 3.8 minimum)**

## Three Critical Problems Diagnosed

### Problem 1: Shallow Deliverables (Depth: 3.0/5.0)
- **ROOT CAUSE**: Framework knowledge in deliverableFrameworks.ts is static. Good prompts, but no compiled evidence, benchmarks, or anti-patterns to draw from. Every generation starts from the same prompt text.
- **SOLUTION**: Wire generation pipeline to load wiki/frameworks/, wiki/benchmarks/, wiki/anti-patterns/, and wiki/evidence/ pages before each generation. The prompt assembles from compiled knowledge.
- **WIKI PAGES AFFECTED**: All 11 framework pages, all anti-pattern pages, all benchmark pages
- **QUALITY GATE**: Generated output references specific data points from wiki pages. Depth scoring averages 3.5+.

### Problem 2: AI Slop Visuals (Visual Quality: 2.5/5.0)
- **ROOT CAUSE**: Current brand palette (teal #115054, lime #CACA20, orange #FD8E2E) differs from the specified NXT Humans identity (chartreuse #B8B800, cyan #00B7C3, stark white #FFFFFF). No anti-slop enforcement layer.
- **SOLUTION**: Create wikiService.ts that loads wiki/brand/ pages. Apply CSS variables from wiki/brand/identity.md. Enforce anti-slop rules from wiki/brand/anti-slop.md during output rendering.
- **WIKI PAGES AFFECTED**: All 6 brand pages
- **QUALITY GATE**: Generated HTML outputs use correct CSS variables. Anti-slop language detection catches banned phrases.

### Problem 3: Evidence Starvation (Evidence: 2.5/5.0)
- **ROOT CAUSE**: Sources processed at query time via real-time connectors. No pre-compiled evidence base. Evidence doesn't persist across runs.
- **SOLUTION**: Implement INGEST operation that deeply processes sources into wiki/evidence/ and wiki/sources/ pages. At GENERATE time, draw from pre-compiled evidence base.
- **WIKI PAGES AFFECTED**: wiki/evidence/, wiki/sources/, wiki/benchmarks/
- **QUALITY GATE**: Every major section has 3+ cited data points. Sources & Methodology appendix present.

## Implementation Phases

### Phase 1: Foundation Fixes (Week 1-2)

#### FIX 1.1: Wiki Service Layer
- **FILE**: Create `services/wikiService.ts`
- **PURPOSE**: Read wiki pages from hic-workspace/wiki/ at generation time
- **FUNCTIONS**:
  - `loadFramework(type: string): string` -- loads wiki/frameworks/[type].md
  - `loadAntiPatterns(type: string): string` -- loads wiki/anti-patterns/[type].md
  - `loadBenchmarks(topics: string[]): string` -- loads relevant benchmark pages
  - `loadEvidence(topics: string[]): string` -- loads relevant evidence pages
  - `loadBrandStandards(): BrandConfig` -- loads wiki/brand/ pages
  - `loadIndex(): WikiIndex` -- parses wiki/index.md for navigation
  - `appendLog(entry: WikiLogEntry): void` -- appends to wiki/log.md
- **IMPACT**: Every generation draws from compiled wiki knowledge instead of static prompts

#### FIX 1.2: Generation Pre-Flight Check
- **FILE**: Modify generation pipeline in `App.tsx` and `services/aiRouter.ts`
- **CHANGE**: Before generating any deliverable, MUST load and verify:
  1. Framework page exists and is not empty
  2. Anti-pattern page exists
  3. Relevant benchmark data available
  4. Brand standards loaded
- **IMPACT**: Prevents generation without compiled knowledge context

#### FIX 1.3: Brand System Migration
- **FILE**: Update CSS variables in deliverable rendering
- **CHANGE**: Replace current palette with wiki/brand/identity.md CSS variables
- **CURRENT**: teal #115054, lime #CACA20, orange #FD8E2E
- **TARGET**: chartreuse #B8B800, cyan #00B7C3, stark white #FFFFFF, black #0D0D0D
- **NOTE**: This affects ResultsView.tsx and exportService.ts rendering only. The app chrome/UI can retain its current palette.

### Phase 2: Pipeline Upgrades (Week 3-6)

#### FIX 2.1: Enhanced Prompt Assembly
- **FILE**: Modify `services/deliverableFrameworks.ts`
- **CHANGE**: Each framework constant becomes a function that assembles from wiki pages:
  ```
  getFrameworkPrompt('PERSONAS') =>
    wiki/frameworks/personas.md (structure)
    + wiki/anti-patterns/personas.md (what to avoid)
    + wiki/benchmarks/cx-metrics.md (evidence to cite)
    + wiki/brand/identity.md (visual rendering)
  ```
- **IMPACT**: Prompts become dynamic, drawing from the ever-evolving wiki

#### FIX 2.2: Quality Scoring Integration
- **FILE**: Create `services/qualityScorer.ts`
- **FUNCTIONS**:
  - `scoreCompleteness(output, frameworkPage): number` -- sections present / required
  - `scoreDepth(output): number` -- average analysis layers
  - `scoreEvidence(output): number` -- cited data points per section
  - `scoreVisualQuality(output, brandPages): number` -- brand compliance
  - `scoreSpecificity(output): number` -- actionability assessment
  - `overallScore(): number` -- weighted aggregate (min 3.8 to pass)
- **IMPACT**: Every deliverable scored before presentation. Sub-threshold triggers regeneration.

#### FIX 2.3: Anti-Slop Language Filter
- **FILE**: Create `services/antiSlopFilter.ts`
- **FUNCTIONS**:
  - `detectBannedPhrases(text: string): BannedPhrase[]` -- scans against wiki/brand/anti-slop.md
  - `suggestReplacements(phrases: BannedPhrase[]): Replacement[]` -- specific data alternatives
  - `enforceFilter(output: string): FilterResult` -- returns cleaned output + violations
- **IMPACT**: Catches "In today's rapidly evolving landscape" and similar slop before output

### Phase 3: Deep Enhancement (Week 7-12)

#### FIX 3.1: INGEST Operation
- Implement the full source ingest workflow from Part IV
- Deep extraction of every data point from uploaded sources
- Fan-out across 10-15 wiki pages per source
- Source summary pages in wiki/sources/

#### FIX 3.2: Evidence Persistence
- Modify SavedProject to persist extracted evidence in wiki/evidence/
- Cross-reference evidence across engagements
- Build citation chains from source to evidence to deliverable

#### FIX 3.3: Exemplar Collection
- After human approval of generated output, offer to save as exemplar
- Build wiki/exemplars/ library from approved outputs
- Use exemplars as few-shot examples in future generation

#### FIX 3.4: Industry Adaptation Pages
- Expand analytical lens configs into full wiki/industries/ pages
- Cross-reference industry-specific data across frameworks

#### FIX 3.5: LINT Operation
- Implement periodic wiki health check (Part IV, Operation 3)
- Contradiction scanning, staleness detection, orphan detection
- Cross-reference symmetry verification

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Overall quality score | 2.9/5.0 | 3.8+/5.0 | Part VI scoring system |
| Completeness | 3.5/5.0 | 4.5+/5.0 | Required sections present |
| Depth | 3.0/5.0 | 3.5+/5.0 | Analysis layers per section |
| Evidence density | 2.5/5.0 | 3.0+/section | Cited data points |
| Visual quality | 2.5/5.0 | 4.0+/5.0 | Brand compliance checks |
| Specificity | 3.0/5.0 | 4.0+/5.0 | Actionability assessment |
| Wiki pages | 35 | 100+ | Total active pages |
| Evidence data points | 0 | 200+ | Total cited entries |
| Sources ingested | 0 | 10+ | Source summary pages |
