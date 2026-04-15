# Strategy Deck Pipeline — Forensic Audit & Failure Analysis

**Application**: NXT Humans — Humans in Control Research Generator  
**Date**: 2026-04-14  
**Status**: BROKEN — deck output is empty/fragmentary, layouts lack variety, deliverables not incorporated

---

## Executive Summary

The Strategy Deck was designed to be the crown jewel — a 15-30 slide presentation synthesizing ALL research deliverables (themes, personas, journey map, PRD, roadmap, tech architecture, gap analysis, tech audit, competitive analysis) into a cohesive narrative arc. The user explicitly requested:

1. **Every deliverable incorporated** into the deck as reformatted slide content
2. **Layout variety** across 7 universal archetypes (title, section header, content+data panel, insight chart, full-width viz, bento grid, problem/solution)
3. **No blank slides** — every slide must have complete, rendered content
4. **NXT Humans design system** — Helvetica Neue, white backgrounds, chartreuse accents, no AI illustrations

What was delivered: 27 blank slides out of 30, 3 fragments, Delete/Edit buttons visible in export, 12.8MB file (vs 198MB in prior version). The pipeline has failures at every layer — from data serialization to AI generation to HTML rendering to PDF capture.

This document traces the complete pipeline, identifies every failure point, and maps each to a specific fix.

---

## 1. The Pipeline Architecture (3 Phases + Export)

```
Phase 1: DECK_STRUCTURE (generateDeckStructure)
    Input:  DeckInputContext + user feedback
    Output: Slide outlines (slideNumber, layout, title, rationale)
    Gate:   Human checkpoint — user reviews/edits outline
        ↓
Phase 2: NARRATIVE (generateNarrative)  
    Input:  Approved structure + DeckInputContext + framework prompt
    Output: Full slides (title, content[], narrative, quote, metrics, bentoCells, etc.)
    Gate:   Human checkpoint — user reviews/edits content
        ↓
Phase 3: FINAL (visualizeNarrative)
    Input:  Approved narrative + DeckInputContext (raw)
    Output: Post-processed slides with persona images injected
    Processing: slidePostProcessor → slopCorrection → personaImageInjection
        ↓
Export: PDF (html2canvas → jsPDF) or PPTX (PptxGenJS)
```

### Where the User's Requirements Enter

| Requirement | Where It Should Be Enforced | Where It Actually Breaks |
|-------------|---------------------------|------------------------|
| All deliverables in deck | `buildDeckDigest()` serializes all deliverables | Digest truncates each to 4KB, losing 80%+ of detail |
| Layout variety (7 archetypes) | Structure prompt requests ≥4 archetypes | AI often generates 2-3 archetypes; no enforcement |
| No blank slides | PDF export captures rendered DOM | `html2canvas` fires before React finishes painting |
| NXT design system | Framework prompt + CSS | Export strips backgrounds, shows interactive UI |

---

## 2. Phase 1: DECK_STRUCTURE — The Outline

### 2.1 How Deliverables Feed In

**File**: `geminiService.ts`, line 1509

```typescript
const digest = this.buildDeckDigest(context);
```

The `buildDeckDigest()` function (lines 1419-1506) is the **single point of data ingestion** for the deck. It serializes ALL deliverable data into a text payload. Here is exactly what each deliverable contributes:

| Deliverable | What Gets Included | Character Cap | What Gets Lost |
|-------------|-------------------|---------------|----------------|
| **Themes** | Name + description + 80-char quote + citation count | 4,000 chars | Full quote text, all citations, supporting evidence |
| **Personas** | Name, role, JTBD, top pain point, top goal, 60-char quote, image status | 4,000 chars | Bio, all attributes, Cooper goals, fiveWs, motivations, opportunities |
| **Recommendations** | Title, 100-char description, action count, impact level | 4,000 chars | Full description, all action items, evidence sources |
| **Journey Stages** | Phase, customer action, pain point, emotion, touchpoint | 4,000 chars | Frontstage/backstage, actors, fail points, tech systems, MOTs |
| **PRD** | Title, 200-char purpose, top 5 features (80 chars each), 3 metrics | 4,000 chars | Full feature descriptions, user stories, requirements, risks |
| **Roadmap** | Vision, NOW/NEXT/LATER (max 4 items/horizon, 60 chars each) | 4,000 chars | Full descriptions, dependencies, owners, success metrics |
| **Tech Architecture** | 200-char overview, first 10 nodes (50 chars), first 5 flows | 4,000 chars | Full node descriptions, all flows, integration details |
| **Gap Analysis** | 150-char scope, top 5 gaps, top 3 quick wins | 4,000 chars | Full gap descriptions, capability matrix, all recommendations |
| **Tech Audit** | First 8 systems, top 3 consolidation opportunities | 4,000 chars | All integrations, health assessments, vendor details |
| **Competitive Analysis** | 150-char context, first 4 peers, top 3 gaps | 4,000 chars | Full peer profiles, all gaps, strategic implications |

**Total theoretical max**: 10 sections x 4,000 chars = 40,000 characters (~10K tokens)

**The fundamental problem**: The AI is told "use ALL of this to build the deck" but only receives skeletal summaries. A theme with 500 words of description and 5 cited quotes is compressed to a single line with an 80-character quote fragment. The AI cannot produce rich, evidence-grounded slides from this input.

### 2.2 The Structure Prompt

**File**: `geminiService.ts`, lines 1510-1582 (73 lines of instruction)

The prompt includes:

1. **Minto's Pyramid Principle** (lines 1512-1519): "Think bottom-up, present top-down. COMPLETE SENTENCE titles. PARTNER TEST. MECE."
2. **Rumelt's Kernel** (lines 1521-1524): Diagnosis, guiding policy, coherent actions
3. **Narrative Framework** (lines 1526-1544): SCR format, section-by-section planning
4. **Content-Driven Planning** (lines 1546-1557): Conditional instructions based on what deliverables exist:
   ```
   ${context.themes?.length ? `- Themes (${context.themes.length}): Plan 1-2 slides` : ''}
   ${context.personas?.length ? `- Personas (${context.personas.length}): Plan 1 slide PER KEY persona` : ''}
   ${context.recommendations?.length ? `- Recommendations (${context.recommendations.length}): Plan 1-2 slides` : ''}
   ...
   ```
   If a deliverable wasn't selected by the user, its line doesn't render — the AI never even knows it exists.
5. **Slide Count Guidance** (line 1558): "Expected total: 15-30 slides depending on available deliverables"
6. **Layout Variety** (lines 1560-1564): "NEVER same archetype 2+ consecutive. Must use >=4 of 7 archetypes."
7. **7 Archetypes Listed** (lines 1566-1573)

### 2.3 The Structure Output Schema

```typescript
{
    methodology: STRING,
    storyArc: STRING,
    slides: [{
        slideNumber: INTEGER,
        layout: ENUM (7 archetypes),
        title: STRING,
        rationale: STRING,
        sourceDeliverable?: STRING,
        personaRef?: STRING
    }]
}
```

**What's missing from the schema**: No `expectedContent` field — the AI plans a layout and title but doesn't pre-plan what data should go on each slide. The narrative phase must independently figure out what content to put where.

### 2.4 Structure Phase Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Too few slides | Digest too thin — AI can't assess "richness" | 8-12 slides instead of 15-30 |
| Monotonous layouts | AI defaults to CONTENT_DATA_PANEL | 80%+ same archetype |
| Missing deliverables | Conditional lines don't render if deliverable absent | Deck ignores available data |
| Generic titles | Digest lacks specifics for evidence-grounded titles | "Strategic Recommendations" instead of "60% of students cite documentation as their top barrier" |

---

## 3. Phase 2: NARRATIVE — Full Content Generation

### 3.1 Double Digestion

**File**: `geminiService.ts`, line 1614

```typescript
const digest = this.buildDeckDigest(context);
```

The digest is computed **again** — identical to Phase 1. This means the same 40KB of truncated data is sent twice across two AI calls, consuming token budget without adding information.

### 3.2 Framework Loading

**File**: `geminiService.ts`, lines 1620-1624

```typescript
const { getEnhancedFrameworkPrompt } = await import('./deliverableFrameworks');
frameworkPrompt = await getEnhancedFrameworkPrompt('STRATEGY_DECK');
```

This loads the compiled framework from `deliverableFrameworks.ts` — up to 6,000 characters combining:
- `DECK_STRUCTURE` framework (lines 214-282): Rumelt's Kernel, 3-layer depth, McKinsey Pyramid
- `DECK_NARRATIVE` framework (lines 284-331): Meta-narration ban, anti-slop, assertion-evidence model
- `UNIVERSAL_SLIDE_DESIGN_SYSTEM` (lines 72-175): 7 archetypes, visual rules, anti-patterns

**If this import fails** (line 1623), the AI proceeds with only inline rules — no frameworks, no design system. Failure is a `console.warn`, not an error.

### 3.3 The Narrative Prompt

**File**: `geminiService.ts`, lines 1626-1671 (45 lines)

Key instruction sections:

1. **Meta-Narration Ban** (lines 1630-1633): 21 explicit banned phrases
2. **Storytelling Rules** (lines 1635-1639): No hedge words, lead with insight
3. **Plain Text Only** (line 1641): No markdown formatting
4. **Per-Slide Field Requirements** (lines 1643-1659): title, content[], narrative, quote, speakerNotes, sources required
5. **Archetype-Specific Data** (lines 1651-1659):
   - CONTENT_DATA_PANEL requires `metrics[]` array
   - BENTO_GRID requires `bentoCells[]` array
   - PROBLEM_SOLUTION requires `problemStat` + `solutionPoints[]`
6. **Persona Image Injection** (lines 1661-1667): Instructions to set personaName/personaRole/personaQuote

### 3.4 The Narrative Output Schema

```typescript
{
    slides: [{
        slideNumber: INTEGER,
        layout: ENUM,
        title: STRING,
        content: STRING[],           // 2-4 bullets
        narrative: STRING,           // Speaker notes paragraph
        visualPrompt: STRING,        // For AI image generation
        quote: STRING,               // VERBATIM from corpus
        speakerNotes: STRING,
        sources: STRING[],           // Source names for footnotes
        personaName?: STRING,
        personaRole?: STRING,
        personaQuote?: STRING,
        metrics?: SlideMetric[],     // { label, value, unit?, change? }
        bentoCells?: BentoCell[],    // { type, value?, label?, text?, attribution? }
        problemStat?: { value, unit?, description },
        solutionPoints?: [{ title, description }],
    }]
}
```

### 3.5 Narrative Phase Failure Modes

| Failure | Cause | Impact |
|---------|-------|--------|
| Empty `metrics[]` | AI sees no data in digest to derive metrics from | Data panel renders as blank right column |
| Empty `bentoCells[]` | BENTO_GRID archetype has no content | Slide renders as empty grid |
| Missing `quote` | Digest quotes truncated to 60-80 chars; AI has nothing to cite | Quote area blank or fabricated |
| Wrong `personaName` | AI generates name that doesn't match any persona exactly | Persona image injection fails silently |
| All CONTENT_DATA_PANEL | AI defaults to safest archetype when uncertain | No layout variety |
| Meta-narration survives | AI generates banned phrases despite instructions | Post-processor catches some, not all |

---

## 4. Phase 3: FINAL — Post-Processing & Assembly

### 4.1 slidePostProcessor.ts

**File**: `slidePostProcessor.ts`, lines 522-690

Processing chain per slide:
1. **Markdown stripping**: Removes `**bold**`, `*italic*`, `# headers`, `[links](url)`
2. **Citation resolution**: `[CHUNK_XXX]` → human-readable source names via chunk map
3. **Meta-narration removal**: 19 regex patterns (lines 149-169), checked on ALL 5 fields (title, content, narrative, speakerNotes, quote)
4. **Placeholder resolution**: `[Date]`, `[TBD]`, `[X%]` → removed or replaced
5. **SaaS CTA detection**: Removes marketing call-to-action language
6. **Topic title check**: Flags titles that are topics ("Recommendations") vs conclusions ("Students need 3x more co-op documentation support")
7. **Depth validation**: Requires 3 layers (observation + implication + recommendation)
8. **Visual prompt sanitization**: Removes text instructions from image prompts

### 4.2 Slop Auto-Correction

**File**: `geminiService.ts`, lines 1968-2002

After post-processing, a second pass runs `detectBannedPhrases()` from `wikiService.ts` against all text fields. The 350-phrase slop blacklist checks for and auto-replaces phrases like "paradigm shift", "game-changer", "leverage synergies", etc.

### 4.3 Persona Image Injection

**File**: `geminiService.ts`, lines 2004-2012

For each slide with `personaName` set:
1. Search `context.personas` for a match (exact name OR case-insensitive partial match)
2. If found AND persona has `imageUrl`, inject `personaImageUrl` into slide
3. If not found: **silent failure** — no image, no error, no fallback

---

## 5. Export Layer — Where v30 Died

### 5.1 PDF Export (html2canvas → jsPDF)

**File**: `ResultsView.tsx`, lines 488-524

The PDF export captures the live DOM of each slide:

```typescript
for (let i = 0; i < slideElements.length; i++) {
    const slideElement = slideElements[i] as HTMLElement;
    // FIX APPLIED: scrollIntoView + waitForImages + waitForPaint + 300ms settle
    const canvas = await html2canvas(slideElement, { scale: 2, useCORS: true, ... });
    pdf.addImage(canvas, 'PNG', x, y, finalW, finalH);
}
```

**The v30 failure**: Before the fix applied in this session, there was NO render gate. `html2canvas` fired immediately, capturing empty or partially-rendered DOM. The fix adds:
- `scrollIntoView()` to trigger lazy rendering
- `waitForImages()` — waits for all `<img>` elements to load
- `waitForPaint()` — double `requestAnimationFrame`
- 300ms settle time
- Blank detection with retry (2 attempts)
- User warning dialog for suspected blank pages
- Print-mode CSS stripping Delete/Edit buttons

### 5.2 PPTX Export (PptxGenJS)

**File**: `exportService.ts`, lines 66-474

The PPTX export is a **separate pathway** that builds slides programmatically from data — NOT from DOM capture. This means PPTX export is immune to the v30 timing bug.

However, PPTX has its own problems:

| Archetype | PPTX Implementation Status | What Happens If Used |
|-----------|---------------------------|---------------------|
| TITLE_SLIDE | Fully implemented (lines 114-135) | Dark bg, section label, title, date |
| SECTION_HEADER | Fully implemented (lines 146-157) | Dark bg, "SECTION N", title, ghost text |
| CONTENT_DATA_PANEL | Fully implemented (lines 159-240) | 55/45 split, bullets left, metric cards right |
| CONTENT_INSIGHT_CHART | Partially implemented | Falls back to CONTENT_DATA_PANEL layout |
| FULL_WIDTH_VIZ | NOT implemented | Falls back to CONTENT_DATA_PANEL |
| BENTO_GRID | Partially implemented (lines 242-296) | 3-column grid with stat/quote cells |
| PROBLEM_SOLUTION | Partially implemented (lines 298-357) | 55/45 split, challenge left, solution right |

**3 of 7 archetypes are fully implemented.** The remaining 4 either partially render or fall back to CONTENT_DATA_PANEL. This means even if the AI generates a varied structure with 7 archetypes, the PPTX output collapses most of them into the same layout.

### 5.3 Layout Normalization

**File**: `exportService.ts`, lines 83-93 and `ResultsView.tsx`, lines 35-65

Both files contain identical normalization maps:

```typescript
const mapping = {
    'CONTENT_SPLIT_RIGHT': 'CONTENT_DATA_PANEL',
    'CONTENT_SPLIT_LEFT': 'CONTENT_DATA_PANEL',
    'FULL_BLEED_IMAGE': 'CONTENT_DATA_PANEL',
    'KEY_STATISTIC': 'CONTENT_DATA_PANEL',
    'PERSONA_SPOTLIGHT': 'CONTENT_DATA_PANEL',
    'RECOMMENDATION': 'CONTENT_DATA_PANEL',
    'CLOSING_CTA': 'CONTENT_DATA_PANEL',
    'TYPOGRAPHY_QUOTE': 'BENTO_GRID',
    'EVIDENCE_WALL': 'BENTO_GRID',
    'QUOTE_FEATURE': 'BENTO_GRID',
    'DATA_INSIGHT': 'CONTENT_INSIGHT_CHART',
    'COMPARISON': 'PROBLEM_SOLUTION',
};
```

**7 legacy layouts collapse to CONTENT_DATA_PANEL.** This normalization exists because the AI sometimes generates legacy layout names despite being told to use the 7 universal archetypes. But the mapping means layout variety is destroyed even when the AI tries to vary.

---

## 6. HTML Slide Rendering (ResultsView.tsx)

### 6.1 renderSlidePreview() — The 7 Templates

**File**: `ResultsView.tsx`, lines 841-1170

Each archetype has a distinct HTML template:

| Archetype | Template Description | Visual Distinctness |
|-----------|---------------------|-------------------|
| **TITLE_SLIDE** | Dark `#0D0D0D` bg, left-aligned editorial title (32px, weight 200), stat row at bottom (36px metrics), chartreuse section label | HIGH — dark background, large sparse type |
| **SECTION_HEADER** | Dark bg, giant 160px chartreuse ghost text (15% opacity) bleeding off edges, section number, title | HIGH — oversized ghost text is very distinctive |
| **CONTENT_DATA_PANEL** | White bg, 55/45 grid split. Left: heading + 3 bullets. Right: metric cards (3px accent left-border, 36px value, 10px label) OR quote block | MEDIUM — the workhorse layout, used most often |
| **CONTENT_INSIGHT_CHART** | White bg, hero stat at 72px + horizontal bar chart on right, narrative on left | MEDIUM — similar to data panel but with chart |
| **FULL_WIDTH_VIZ** | Adaptive: if ≤4 items renders as problem card grid (coral accent, numbered), if 5+ renders as numbered grid | LOW — often indistinguishable from data panel |
| **BENTO_GRID** | Dark `#0D0D0D` bg, 3-column glass-card grid. Cards have `rgba(255,255,255,0.06)` bg, stat cells show 32px values | HIGH — dark background with glass morphism |
| **PROBLEM_SOLUTION** | Split dark/white. Left: dark panel with problem stat (48px coral value). Right: white panel with solution points (teal accent bars) | HIGH — bi-color split is very distinctive |

### 6.2 What Actually Renders

The user reported that v30's PDF had mostly blank slides. Looking at the rendering chain:

1. **Slides are stored in React state** (`slides` array in App.tsx)
2. **ResultsView receives slides as props** and renders them in a scrollable list
3. **Each slide is a `.slide-export-target` div** with `aspect-[16/9]`
4. **Interactive controls** (Delete button, Edit button) are in an `opacity-0 group-hover:opacity-100` div — visible on hover, should be hidden in export

The rendering itself works correctly in the browser. The failure was in the capture timing (html2canvas firing before paint) and the interactive UI bleeding through (no print-mode CSS stripping).

---

## 7. The User's Requirements vs. Reality

### 7.1 "Every deliverable introduced into the deck"

**Requirement**: Themes, personas, journey map, PRD, roadmap, tech architecture, gap analysis, tech audit, competitive analysis — ALL should appear in the deck as reformatted slide content.

**Reality**: 
- `DeckInputContext` carries all 10 deliverable types (types.ts lines 516-527)
- `buildDeckDigest()` serializes all 10 into the prompt
- BUT each is capped at 4,000 characters with per-item truncation (80-100 char excerpts)
- The AI receives ~10K tokens of skeletal summaries, not the 50-100K tokens of full deliverable data
- The conditional planning instructions (lines 1546-1557) only fire if the deliverable exists in context
- **Net result**: AI plans slides for deliverables it can barely see, producing shallow content that doesn't reflect the depth of the original analysis

### 7.2 "So much variety in layouts"

**Requirement**: 7 distinct slide archetypes used with variety — never same archetype back-to-back, at least 4 of 7 used.

**Reality**:
- The structure prompt requests variety (lines 1560-1564)
- But the AI has no enforcement mechanism — it can promise variety and deliver monotony
- `normalizeLayout()` collapses 7+ legacy layouts into CONTENT_DATA_PANEL
- The PPTX export only fully renders 3 of 7 archetypes
- The HTML rendering has all 7 templates, but if the AI generates mostly CONTENT_DATA_PANEL, 5 templates go unused
- **No post-generation validation** checks whether the layout variety constraint was met

### 7.3 "The deck is broken currently"

**v30 symptoms** (from user's forensic analysis):
1. **27 of 30 slides blank** — html2canvas timing failure
2. **3 slides show fragments** — partial paint captured mid-render
3. **Delete/Edit buttons visible** — no print-mode CSS
4. **12.8MB vs 198MB** — empty canvases vs rendered content
5. **Section dividers partially render** — CSS backgrounds paint immediately, content doesn't

**Fixes applied in this session**:
- Render-complete gate (scrollIntoView + waitForImages + waitForPaint + 300ms settle)
- Print-mode CSS (`[data-print-mode="true"]` hides buttons, hover controls)
- Blank page detection with retry + user warning
- Dark background preservation (`backgroundColor: null` instead of forced `#ffffff`)

---

## 8. Specific Failure Points — Complete Inventory

### 8.1 Data Layer Failures

| # | Failure | File | Line | Severity | Fix |
|---|---------|------|------|----------|-----|
| D1 | Each deliverable capped at 4KB in digest | geminiService.ts | 1421 | CRITICAL | Raise to 8KB or paginate |
| D2 | Theme quotes truncated to 80 chars | geminiService.ts | 1424 | HIGH | Raise to 200 chars |
| D3 | Persona data reduced to 1 line | geminiService.ts | 1430-1437 | HIGH | Include attributes, goals, full bio |
| D4 | Recommendation descriptions at 100 chars | geminiService.ts | 1441 | HIGH | Raise to 300 chars |
| D5 | Roadmap items at 60 chars, max 4/horizon | geminiService.ts | 1463 | MEDIUM | Raise to 150 chars, all items |
| D6 | Tech architecture: first 10 nodes, 50 chars | geminiService.ts | 1470 | MEDIUM | All nodes, 100 chars |
| D7 | Competitive analysis: first 4 peers only | geminiService.ts | 1497 | MEDIUM | All peers |
| D8 | Digest computed twice (structure + narrative) | geminiService.ts | 1509, 1614 | LOW | Cache and reuse |
| D9 | Optional deliverables silently omitted | types.ts | 516-527 | LOW | Log which deliverables are present |

### 8.2 AI Generation Failures

| # | Failure | File | Line | Severity | Fix |
|---|---------|------|------|----------|-----|
| G1 | No slide count enforcement | geminiService.ts | 1558 | HIGH | Post-validate: reject if <12 slides |
| G2 | No layout variety enforcement | geminiService.ts | 1560 | HIGH | Post-validate: reject if <4 archetypes |
| G3 | Empty metrics[] arrays | geminiService.ts | 1651 | HIGH | Validate after generation; retry if empty |
| G4 | Empty bentoCells[] arrays | geminiService.ts | 1654 | HIGH | Same validation |
| G5 | Framework import can fail silently | geminiService.ts | 1623 | MEDIUM | Make framework mandatory; throw on failure |
| G6 | PersonaName mismatch prevents image | geminiService.ts | 2004-2012 | MEDIUM | Fuzzy match + log failures |
| G7 | AI generates legacy layout names | geminiService.ts | 1566-1573 | LOW | normalizeLayout handles this |

### 8.3 Rendering Failures

| # | Failure | File | Line | Severity | Fix |
|---|---------|------|------|----------|-----|
| R1 | PPTX: only 3/7 archetypes fully rendered | exportService.ts | 159-400 | CRITICAL | Implement BENTO_GRID, PROBLEM_SOLUTION, FULL_WIDTH_VIZ |
| R2 | PPTX: CONTENT_INSIGHT_CHART falls to DATA_PANEL | exportService.ts | normalizeLayout | HIGH | Add chart rendering |
| R3 | PDF: timing failure (v30 — FIXED) | ResultsView.tsx | 488-524 | CRITICAL | Render gate applied |
| R4 | PDF: Delete/Edit visible (v30 — FIXED) | ResultsView.tsx | 1198-1203 | HIGH | Print-mode CSS applied |
| R5 | PDF: dark slides forced white (v30 — FIXED) | ResultsView.tsx | 506 | HIGH | backgroundColor: null |
| R6 | Accent color rotation: only 3 colors | exportService.ts | 48 | LOW | Add 2 more accent colors |

### 8.4 Pipeline Orchestration Failures

| # | Failure | File | Line | Severity | Fix |
|---|---------|------|------|----------|-----|
| P1 | No pre-export validation of slide content | ResultsView.tsx | N/A | HIGH | Check each slide has title + content before export |
| P2 | No preview-before-export | ResultsView.tsx | N/A | HIGH | Add thumbnail strip for visual confirmation |
| P3 | No export telemetry | ResultsView.tsx | N/A | MEDIUM | Log per-slide capture time, content detection |
| P4 | No slide archetype content assertion | ResultsView.tsx | N/A | MEDIUM | Verify minimum DOM elements per archetype |

---

## 9. The Fix Sequence (Priority Order)

### Tier 1: Stop the Bleeding (already applied)

1. **PDF render gate** — scrollIntoView + waitForImages + waitForPaint + settle time
2. **Print-mode CSS** — strips Delete/Edit buttons, hover controls
3. **Blank detection** — retry + user warning for suspected empty pages
4. **Dark background preservation** — backgroundColor: null

### Tier 2: Data Richness (next session)

5. **Raise digest caps** — 4KB → 8KB per section, raise per-item limits (80→200 chars for quotes, 100→300 for descriptions)
6. **Include full persona data** — attributes, goals, bio in digest (not just 1-line summary)
7. **Cache digest** — compute once, reuse for structure AND narrative phases
8. **Log deliverable inventory** — at deck generation start, log which deliverables are present and their data sizes

### Tier 3: Layout Variety Enforcement (next session)

9. **Post-validate structure** — after AI generates outline, check: ≥12 slides, ≥4 unique archetypes, never same archetype 2x consecutive. Reject and retry if violated.
10. **Post-validate narrative** — after AI generates content, check: every slide has title >5 chars, content[] has ≥1 item, metrics[] non-empty for DATA_PANEL slides, bentoCells[] non-empty for BENTO_GRID slides. Flag violations.
11. **Complete PPTX archetype renderers** — implement BENTO_GRID, PROBLEM_SOLUTION, FULL_WIDTH_VIZ, CONTENT_INSIGHT_CHART fully in exportService.ts
12. **Add 2 more accent colors** — expand rotation from 3 to 5 for visual variety

### Tier 4: Quality Assurance (future)

13. **Preview-before-export** — thumbnail strip showing all captured slides before download
14. **Per-archetype DOM assertions** — verify minimum elements before capture
15. **Export telemetry** — log capture times, blank detection rates, retry counts
16. **Slide-level quality scoring** — flag slides with <50 words of content, missing quotes, empty data panels

---

## 10. Architecture Diagram

```
USER SELECTS DELIVERABLES
        ↓
┌─────────────────────────────────┐
│ App.tsx builds DeckInputContext  │ ← All 10 deliverable types (optional)
│ Lines 1094-1105                 │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ buildDeckDigest(context)        │ ← BOTTLENECK: 4KB/section cap
│ Lines 1419-1506                 │   80-100 char per-item truncation
│ Returns: ~40KB text payload     │   Loses 80%+ of deliverable detail
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ generateDeckStructure()         │ ← AI sees truncated digest
│ Lines 1508-1611                 │   Generates: slide outlines
│ Prompt: Pyramid + Rumelt +      │   Output: slideNumber, layout, title
│   conditional planning + digest │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ HUMAN CHECKPOINT                │ ← User reviews/edits outline
│ (AnalysisCheckpoint component)  │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ generateNarrative()             │ ← AI sees digest AGAIN (redundant)
│ Lines 1613-1710                 │   + framework + archetype rules
│ Prompt: framework + meta-ban    │   Generates: full slide content
│   + storytelling + digest       │   (title, bullets, metrics, quotes)
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ HUMAN CHECKPOINT                │ ← User reviews/edits content
│ (AnalysisCheckpoint component)  │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ visualizeNarrative()            │ ← Post-processing chain:
│ Lines 1953-2050                 │   1. slidePostProcessor
│                                 │   2. slopCorrection
│                                 │   3. personaImageInjection
└────────────┬────────────────────┘
             ↓
┌──────────────────┬──────────────┐
│ PDF Export       │ PPTX Export  │
│ (html2canvas)    │ (PptxGenJS)  │
│ Lines 488-524    │ Lines 66-474 │
│                  │              │
│ FIXED: render    │ 3/7 types    │
│ gate + print     │ fully impl.  │
│ mode + blank     │ 4/7 partial  │
│ detection        │ or fallback  │
└──────────────────┴──────────────┘
```

---

## 11. Comparison: What Was Promised vs. What Exists

| Promise | Implementation | Gap |
|---------|---------------|-----|
| "Feed ALL deliverables into the deck" | `DeckInputContext` carries all 10 types | Digest truncates each to 4KB skeleton |
| "15-30 slides content-driven" | Prompt says "15-30" | No enforcement; AI may generate 8 |
| "7 universal archetypes with variety" | Prompt lists 7 + variety rule | No post-validation; AI often uses 2-3 |
| "Each deliverable gets slides" | Conditional planning in prompt | AI plans vaguely from truncated data |
| "Persona slides with actual images" | Image injection in visualizeNarrative | Works if personaName matches exactly |
| "Metric cards with real data" | `metrics[]` schema field exists | AI often generates empty arrays |
| "Bento grid with mixed content" | `bentoCells[]` schema field exists | AI rarely generates correct cell structure |
| "Problem/solution split slides" | `problemStat` + `solutionPoints` exist | AI sometimes populates, often doesn't |
| "Source citations on every slide" | `sources[]` field + footnote rendering | Works when AI provides source names |
| "No AI slop or meta-narration" | 350-phrase blacklist + 19 regex patterns | Post-hoc correction; some survives |
| "Professional PDF/PPTX export" | Both pathways exist | PDF had timing failure (fixed); PPTX incomplete |

---

## 12. Conclusion

The Strategy Deck pipeline is architecturally sound — the 3-phase structure (outline → content → post-process) with human checkpoints at each gate is the right design. The `DeckInputContext` correctly carries all deliverable types. The 7 archetype system with distinct visual templates is well-conceived.

The pipeline fails at three layers:

1. **Data starvation**: `buildDeckDigest()` compresses 50-100K tokens of deliverable data into 10K tokens of skeletal summaries. The AI cannot produce rich, evidence-grounded slides from this input. This is the root cause of thin, generic deck content.

2. **No enforcement**: The prompt requests layout variety and adequate slide counts, but nothing validates the AI's output against these constraints. The pipeline trusts the AI to self-regulate, which it doesn't.

3. **Incomplete rendering**: Only 3 of 7 PPTX archetypes are fully implemented. The HTML rendering has all 7, but the PDF export had a critical timing failure (now fixed). The export layer cannot faithfully represent what the pipeline produces.

The fix sequence is: stabilize export (done) → enrich data flow → enforce constraints → complete renderers. The deck will be functional when the AI can see the full depth of each deliverable and the export layer can render every archetype the AI generates.

---

## 13. Objective Gap Analysis — Actual PPTX Output (v4, 26 Slides)

### 13.1 File Metadata

| Metric | Value |
|--------|-------|
| File | `NXT_Humans_Research_Deck (4).pptx` |
| Size | 110,340 bytes (110KB) — extremely small for a 26-slide deck |
| Slides | 26 |
| PDF version | `NXT_Humans_Strategy_Deck (32).pdf` — 144.6 MB (image-heavy capture) |

### 13.2 Slide-by-Slide Content Inventory

| Slide | Type | Title | Text Elements | Chars | Content Quality |
|-------|------|-------|---------------|-------|-----------------|
| 1 | TITLE_SLIDE | "Northeastern's Strategic Blueprint..." | 3 | 128 | OK — has section label, title, date |
| 2 | SECTION_HEADER | Same title repeated | 2 | 112 | BROKEN — duplicates slide 1 title as section header |
| 3 | CONTENT_DATA_PANEL | "Must Integrate Skills Validation and AI..." | 5 | 619 | OK — has diagnosis, complication, resolution text. Truncated mid-sentence. |
| 4 | SECTION_HEADER | "The Situation: Evolving Demands..." | 3 | 68 | THIN — section label + title + slide number only |
| 5 | CONTENT_DATA_PANEL? | "Higher Ed Undergoes Fundamental Shift..." | 2 | 94 | BROKEN — title + slide number only. No bullets, no data, no content. |
| 6 | CONTENT_DATA_PANEL | "Competitive Position Requires Accelerated Investment..." | 11 | 470 | OK — has 3 gap assessments with metric cards (CLR: 2, AI: 4, Data: 4) |
| 7 | PROBLEM_SOLUTION | "1870+ applications" / solutions | 9 | 467 | OK — has problem stat, 2 solution points. But "Marketo" appears (should be "market") |
| 8 | SECTION_HEADER | "The Complication: Core Challenges..." | 3 | 65 | THIN — section label only |
| 9 | CONTENT_DATA_PANEL | "Unclear Policy and Budget Constraints..." | 6 | 632 | OK — has 3 complication bullets + quote. Source citations present. |
| 10 | CONTENT_DATA_PANEL | "First-Year Students Lack Guidance..." | 5 | 19,389 | BROKEN — contains 19K chars of content in a single slide. Massive data dump. |
| 11 | CONTENT_DATA_PANEL | "Experienced Students Struggle..." | 9 | 516 | OK — has bullets + metric cards (1870+ applications, >5 skills) |
| 12 | CONTENT_DATA_PANEL | "Impact-Driven Alumni Seek Clearer Evidence..." | 7 | 5,571 | BROKEN — contains 5.5K chars. Quote + massive content block. |
| 13 | CONTENT_DATA_PANEL | "Corporate Partners Require Streamlined..." | 9 | 551 | OK — bullets + metric cards (Skills Transparency, +20%) |
| 14 | PROBLEM_SOLUTION | "4 levels" gap / solutions | 9 | 617 | OK — has problem stat, 2 solution points. Content truncated mid-sentence. |
| 15 | CONTENT_DATA_PANEL | "Fragmented Systems and Pending AI..." | 14 | 1,819 | HEAVY — 14 text elements about tech systems. Content dense but structured. |
| 16 | SECTION_HEADER | "The Resolution: A Coherent Path Forward" | 3 | 57 | THIN — section label only |
| 17 | CONTENT_DATA_PANEL | "Five Strategic Pillars..." | 11 | 515 | OK — 3 pillars described + metric cards |
| 18 | CONTENT_DATA_PANEL | "Immediate Actions Will Establish..." | 11 | 735 | OK — NOW horizon items with dates |
| 19 | CONTENT_DATA_PANEL | "Next-Phase Initiatives..." | 11 | 694 | OK — NEXT horizon items with dates |
| 20 | CONTENT_DATA_PANEL | "Strategic Roadmap Outlines Phased Journey..." | 5 | 456 | THIN — generic roadmap summary, no specifics |
| 21 | CONTENT_DATA_PANEL | "Key Product Features Will Drive..." | 11 | 554 | OK — PRD features with metric cards |
| 22 | CONTENT_DATA_PANEL | "Future-State Architecture Will Unify..." | 9 | 518 | OK — architecture overview with maturity metrics |
| 23 | SECTION_HEADER | "Next Steps: Mobilizing for Impact" | 3 | 51 | THIN — section label only |
| 24 | CONTENT_DATA_PANEL | "Immediate Actions and Key Milestones..." | 11 | 574 | DUPLICATE — repeats slide 18 content |
| 25 | CLOSING | "NXT Humans / Intelligence Augmentation" | 2 | 35 | OK — closing slide |
| 26 | APPENDIX | "Evidence Base" + themes list | 38 | 13,118 | MASSIVE — 13K chars of themes in single appendix. Data dump. |

### 13.3 Critical Findings from Actual Output

#### Finding A: Layout Monotony Is Extreme

| Layout | Count | Percentage |
|--------|-------|-----------|
| CONTENT_DATA_PANEL | 16 | 61.5% |
| SECTION_HEADER | 4 | 15.4% |
| PROBLEM_SOLUTION | 2 | 7.7% |
| TITLE_SLIDE | 1 | 3.8% |
| CLOSING | 1 | 3.8% |
| APPENDIX | 1 | 3.8% |
| **BENTO_GRID** | **0** | **0%** |
| **CONTENT_INSIGHT_CHART** | **0** | **0%** |
| **FULL_WIDTH_VIZ** | **0** | **0%** |

**3 of 7 archetypes are completely unused.** The prompt says "use >= 4 of 7 archetypes" but the AI generates 61% CONTENT_DATA_PANEL. The bento grid (dark background, glass-card grid), insight chart (hero stat + bar chart), and full-width viz (problem card grid) are never used despite having HTML templates and partial PPTX renderers.

#### Finding B: Content Volume Is Wildly Inconsistent

| Problem | Slides Affected | Details |
|---------|----------------|---------|
| **Slide has 19,389 characters** | Slide 10 | An entire persona analysis dumped into one slide. This is ~5 pages of text. |
| **Slide has 13,118 characters** | Slide 26 | Full theme listing in appendix. 38 text elements. |
| **Slide has 5,571 characters** | Slide 12 | Alumni persona slide with massive quote + content block. |
| **Slide has only 2 elements** | Slides 2, 5, 25 | Title + slide number. No substantive content. |
| **Content truncated mid-sentence** | Slides 3, 12, 15, 18, 19 | Text ends with "..." because PPTX renderer doesn't wrap. |

The AI doesn't know how much text fits on a slide. It generates thousands of characters for some slides and 2 elements for others. There's no character budget enforcement in the schema.

#### Finding C: Deliverable Coverage Is Incomplete

| Deliverable | Present in Deck? | How It Appears | Quality |
|-------------|-----------------|----------------|---------|
| **Themes** | Yes (appendix only) | 13K-char data dump on slide 26 | BAD — raw list, not reformatted |
| **Personas** | Partially | Slides 10, 12 reference persona pain points | BAD — persona data dumped as prose, no persona cards |
| **Recommendations** | Yes | Slides 17-19 reference recommendations | FAIR — referenced but not individually featured |
| **Journey Map** | No | Not mentioned anywhere in 26 slides | MISSING |
| **PRD** | Partially | Slide 21 mentions features | FAIR — surface-level |
| **Roadmap** | Yes | Slides 18-20 cover NOW/NEXT/LATER | FAIR — structured but repetitive |
| **Tech Architecture** | Partially | Slide 22 mentions architecture | THIN — one slide, no diagram |
| **Gap Analysis** | Yes | Slides 6, 14 show gaps | OK — uses metric cards |
| **Tech Audit** | Partially | Slide 15 lists systems | DENSE — too much for one slide |
| **Competitive Analysis** | Partially | Slide 6 shows competitor maturity | THIN — one slide only |

**The Journey Map is completely absent from the deck.** The service blueprint — with its 5+ stages, emotion curve, frontstage/backstage, moments of truth — gets zero slides. This is the deliverable most suited to FULL_WIDTH_VIZ or BENTO_GRID archetypes, and it's entirely missing.

#### Finding D: Specific Text Errors

| Error | Slide | Text |
|-------|-------|------|
| "Marketo" instead of "market" | 7, 11, 13 | "competitive job Marketo" — the AI hallucinates the marketing tool name |
| Duplicate content | 18 and 24 | Slides 18 and 24 contain identical NOW-horizon action items |
| Duplicate title | 1 and 2 | Slide 2 repeats slide 1's full title as a section header |
| Section numbering wrong | 4, 8, 16, 23 | "SECTION 3", "SECTION 7", "SECTION 15", "SECTION 22" — gaps in numbering |
| Mid-sentence truncation | 3, 12, 15, 18, 19 | Content cuts off: "ensuring scalability and sustainability (Tech Audit). This is critical for " |
| Raw citation markers | 9, 11 | "(CLR Project Charter.txt)" and "(CHUNK_039)" visible in final output |

#### Finding E: PDF Visual Quality (v32, 144.6 MB)

The 144.6 MB file size indicates the PDF contains high-resolution image captures. But the user reported:
- Section dividers (slides 4, 8, 16, 23) render only dark backgrounds with partial text
- Content slides show Delete/Edit buttons at the left edge
- Most slides are blank or near-blank in the PDF capture

This confirms the html2canvas timing failure — the PDF captures DOM before React renders content. The PPTX (110KB) has content; the PDF (144MB) has mostly empty canvases with a few fragments.

### 13.4 Gap Score Card

| Dimension | Score (0-10) | Evidence |
|-----------|-------------|----------|
| **Deliverable Coverage** | 3/10 | Journey map missing. Themes only in appendix dump. Personas as prose, not cards. |
| **Layout Variety** | 2/10 | 61% CONTENT_DATA_PANEL. 3 of 7 archetypes unused. |
| **Content Depth** | 4/10 | Some slides have evidence-grounded bullets. Many are thin or data dumps. |
| **Visual Quality (PDF)** | 1/10 | 27 of 30 blank. Timing failure. UI chrome visible. |
| **Visual Quality (PPTX)** | 5/10 | Content renders. But monotonous layout, mid-sentence truncation, no images. |
| **Narrative Arc** | 5/10 | SCR structure (Situation/Complication/Resolution) is present. But weak execution. |
| **Source Citations** | 4/10 | Some slides cite sources. Raw markers (CHUNK_039) survive in others. |
| **Data Accuracy** | 3/10 | "Marketo" hallucination. Duplicate slides. Wrong section numbers. |
| **Export Reliability** | 2/10 | PDF catastrophically broken. PPTX functional but incomplete. |
| **Overall** | **3.2/10** | Architecturally sound pipeline producing a non-functional deliverable |

### 13.5 What a Passing Deck Would Look Like

A 10/10 deck for this research engagement would have:

| Slide Range | Content | Archetype(s) |
|-------------|---------|--------------|
| 1 | Title slide with research scope | TITLE_SLIDE |
| 2 | Executive diagnosis (Rumelt's Kernel) | CONTENT_DATA_PANEL |
| 3-4 | Theme landscape (2 slides, key findings) | BENTO_GRID, CONTENT_DATA_PANEL |
| 5-8 | Persona spotlights (1 per key persona, with photo) | CONTENT_DATA_PANEL with persona image |
| 9 | Section break: "The Journey" | SECTION_HEADER |
| 10-11 | Journey map highlights (emotion curve, MOTs) | FULL_WIDTH_VIZ, CONTENT_INSIGHT_CHART |
| 12 | Section break: "The Gaps" | SECTION_HEADER |
| 13-14 | Gap analysis (maturity grid, capability gaps) | BENTO_GRID, PROBLEM_SOLUTION |
| 15 | Competitive positioning | CONTENT_INSIGHT_CHART |
| 16 | Section break: "The Plan" | SECTION_HEADER |
| 17-18 | Strategic recommendations (top 3-5) | CONTENT_DATA_PANEL |
| 19-20 | Roadmap (NOW/NEXT/LATER with metrics) | FULL_WIDTH_VIZ |
| 21 | PRD highlights (top features) | BENTO_GRID |
| 22-23 | Technology architecture + audit findings | CONTENT_DATA_PANEL, PROBLEM_SOLUTION |
| 24 | Next steps with owners and dates | CONTENT_DATA_PANEL |
| 25 | Closing | TITLE_SLIDE |
| 26 | Appendix (evidence base) | CONTENT_DATA_PANEL |

That's 26 slides using **all 7 archetypes**, covering **all 10 deliverables**, with **persona images**, **journey visualization**, and **no content dumps**.

---

## 14. PDF Visual Quality Analysis (v32, 144.6 MB)

### 14.1 File Characteristics

| Metric | Value | Interpretation |
|--------|-------|---------------|
| File size | 144.6 MB | Each slide captured as ~5.5 MB PNG — indicates html2canvas at scale=2 producing huge images |
| Expected size for 26 content-rich slides | ~30-50 MB | 144 MB suggests 26 full-bleed image captures, many of which are blank white canvases |
| v29 size (reported by user) | 198 MB | Had rendered content + persona images — larger because actual imagery |
| v30 size (reported by user) | 12.8 MB | Almost entirely empty — very small PNGs of blank pages |

### 14.2 Known PDF Rendering Failures (Pre-Fix)

The user's forensic analysis of v30 identified these exact symptoms:

1. **27 of 30 slides blank** — html2canvas captured before React painted
2. **Slide 8 shows only heading** — title text node renders first, children (bullets, data panels) mount asynchronously
3. **Slide 10 shows JTBD fragment** — persona card partially rendered, text block captured mid-paint
4. **Delete/Edit buttons visible** — no print-mode CSS stripping interactive chrome
5. **Section dividers render backgrounds only** — CSS background-color paints immediately, prop-dependent text doesn't
6. **Slide 16 ghost text partially visible** — CSS pseudo-element or positioned div renders before data props resolve

### 14.3 Fixes Applied in This Session

| Fix | Status | What It Does |
|-----|--------|-------------|
| Render-complete gate | APPLIED | scrollIntoView + waitForImages + waitForPaint + 300ms settle per slide |
| Print-mode CSS | APPLIED | `[data-print-mode="true"]` hides buttons, hover chrome, transitions |
| Blank detection + retry | APPLIED | Samples canvas pixels; retries 2x with increasing delay; warns user |
| Dark background preservation | APPLIED | `backgroundColor: null` preserves dark slides (was forcing #ffffff) |

### 14.4 Remaining PDF Risks

| Risk | Severity | Mitigation Needed |
|------|----------|------------------|
| 300ms settle may be insufficient for complex slides | MEDIUM | Increase to 500ms or add per-archetype delays |
| Persona images loaded from external URLs may timeout | HIGH | Pre-cache all images before export starts |
| Metric cards with dynamic content may not paint in time | MEDIUM | Force layout recalculation with `offsetHeight` read |
| Large decks (30+ slides) may trigger memory pressure | LOW | Monitor browser memory during export |
| html2canvas doesn't support all CSS (backdrop-filter, etc.) | LOW | Avoid glass-morphism in export-targeted slides |

---

## 15. Visual Design Audit — Slide-by-Slide (PDF v32, 23 Pages)

Every page was extracted and visually inspected. Here is the objective assessment of every slide's visual design, template usage, and broken elements.

### Slide 1 (Page 1) — TITLE_SLIDE
**What renders**: Dark `#0D0D0D` background. "PERSONAS" section label (chartreuse, 9px caps). Title text "Northeastern University's Strategic Blueprint: Empowering Students, Engaging Partners, Securing the Future." in white, ~24px. Subtitle text below in gray. Chartreuse period at end.
**Design assessment**: GOOD. Follows NXT template. Clean, editorial, readable.
**Issues**: Section label says "PERSONAS" — wrong label for a title slide. Should say the research topic or be omitted. The title is generic institutional language, not a conclusion statement.

### Slide 2 (Page 2) — CONTENT_DATA_PANEL
**What renders**: White background. Bold heading: "Northeastern Must Integrate Skills Validation and AI to Remain Competitive and Drive Impact." Three bullet points with teal ringed-dot bullets on left side. Right panel is EMPTY — no metric cards, no quote, no data.
**Design assessment**: PARTIAL. Left column renders correctly. Right column (the 45% data panel) is completely blank white space.
**Issues**: The `metrics[]` array was empty when this slide was generated. The 55/45 split layout shows a gaping void on the right. This is the single most common visual failure in the deck — data panels without data.

### Slide 3 (Page 3) — SECTION_HEADER
**What renders**: Dark background. "SECTION 1" label in chartreuse. Title: "The Situation: Evolving Demands and Landscape Shifts." Giant ghost text "The Situa..." (chartreuse, ~160px, 15% opacity) bleeding off right edge.
**Design assessment**: GOOD. This is the most visually distinctive template. Ghost text creates editorial punch.
**Issues**: Ghost text is clipped — "The Situa" instead of the full phrase. The foreignObject/text rendering truncates at the SVG boundary.

### Slide 4 (Page 4) — FULL_WIDTH_VIZ (rendered as dark fallback)
**What renders**: Entirely dark `#0D0D0D` background. White heading: "Higher Education Undergoes a Fundamental Shift Towards Skills and Digital Credentialing." Nothing else.
**Design assessment**: BROKEN. This appears to be a FULL_WIDTH_VIZ or BENTO_GRID archetype that has NO content rendered below the heading. The entire slide is a heading on a black background.
**Issues**: No data cards, no grid cells, no visualization. The template rendered the dark background and heading but the content areas (which should contain cards, stats, or a grid) are empty. This is likely a BENTO_GRID with empty `bentoCells[]`.

### Slide 5 (Page 5) — CONTENT_DATA_PANEL
**What renders**: White background. Heading: "Our Competitive Position Requires Accelerated Investment..." Three bullets on left. Right panel has THREE metric cards: "CLR MATURITY GAP: 2", "AI-DRIVEN SUPPORT GAP: 4", "DATA INTEGRATION GAP: 4" — each with colored accent border (red, chartreuse, teal) and large numerals.
**Design assessment**: GOOD. This is the template working as intended. Metric cards are properly populated and colored.
**Issues**: Minor — the metric cards show gap scores but no comparative context (e.g., "2 vs target of 5").

### Slide 6 (Page 6) — PROBLEM_SOLUTION
**What renders**: Split layout. Left: dark panel with "THE CHALLENGE" header (coral), "1870+ applications" stat (large, white), description text. Right: teal "THE SOLUTION" header, two solution points with accent bars ("Enhance AI-Driven Matching", "Streamline Digital Giving").
**Design assessment**: GOOD. The bi-color split is visually strong. Stats are prominent. Solution points are structured.
**Issues**: "Marketo" typo in description text ("extreme Marketo friction" — should be "market"). The solution descriptions are truncated mid-sentence.

### Slide 7 (Page 7) — SECTION_HEADER
**What renders**: Dark background. "SECTION 7" in chartreuse. Title: "The Complication: Core Challenges Impede Progress." Ghost text "The Comp..." partially visible.
**Design assessment**: OK. Same template as slide 3.
**Issues**: Section number jumps from 1 to 7 — numbering is broken. Ghost text clipped again.

### Slide 8 (Page 8) — CONTENT_DATA_PANEL
**What renders**: White background. Heading about unclear policy. Three bullets with evidence citations. Right panel has a QUOTE BLOCK (italic, chartreuse left border) and a PERSONA CARD at the bottom — small rounded rect with persona photo (grayscale), name "The University Transformational Leader", role text.
**Design assessment**: BEST SLIDE IN THE DECK. The quote + persona card combination is exactly what the template was designed for. The persona image renders. The citation trail is visible.
**Issues**: Persona photo is tiny (~40x40px). The quote text is small. But the structure is correct.

### Slide 9 (Page 9) — BENTO_GRID (or CONTENT_DATA_PANEL with dark styling)
**What renders**: Dark `#0D0D0D` background. Title in white. Left: persona description text in chartreuse (very dense, small font). Right: two glass-card styled panels with "1500+ Students Annually" stat and "The Just Started..." persona description. Content is EXTREMELY dense.
**Design assessment**: BROKEN LAYOUT. Text overflows its container. The chartreuse text block on the left runs edge-to-edge with no margin. The right panels are crammed. Font sizes are inconsistent (some 8px, some 14px). The dark background makes small text nearly illegible.
**Issues**: This slide has 19,389 characters of content — an entire persona analysis dumped into one slide. The rendering can't handle this volume. Text overflows, overlaps, and becomes unreadable.

### Slide 10 (Page 10) — CONTENT_DATA_PANEL
**What renders**: White background. Heading about experienced students. Three bullets. Right panel has two metric cards: "1870+ applications" and ">5 skills". Persona card at bottom: "The Experienced Co-op Seeker/Grad Student Dual" with photo.
**Design assessment**: GOOD. Similar structure to slide 8. Metric cards populated.
**Issues**: "Marketo" typo again. Persona name truncated in the small card.

### Slide 11 (Page 11) — BENTO_GRID (dark, dense)
**What renders**: Dark background. Title about alumni. Left: quote in italic with persona reference. Center and right: two large stat blocks — "Steady (Higher Ed Dive RSS from OpenAI Analysis)" and ">85% (from roadmap)." Content blocks are chartreuse-on-dark.
**Design assessment**: PROBLEMATIC. The stat blocks show raw analysis text ("from roadmap", "from OpenAI Analysis") that should have been cleaned by the post-processor. The layout is dense but readable.
**Issues**: Raw source references visible in stats. Text runs long in the cells. No visual hierarchy between the stat value and its description.

### Slide 12 (Page 12) — CONTENT_DATA_PANEL
**What renders**: White background. Heading about corporate partners. Bullets + metric cards ("SKILLS TRANSPARENCY: Needed", "TALENT ALIGNMENT: +20%"). Persona card at bottom.
**Design assessment**: GOOD. Clean execution of the template.
**Issues**: "Needed" is not a metric — it's a word. The metric card system expects numerical values.

### Slide 13 (Page 13) — PROBLEM_SOLUTION
**What renders**: Split layout. Left: dark, "THE CHALLENGE", "4 levels" stat. Right: two solution points.
**Design assessment**: GOOD. Same template as slide 6, consistent.
**Issues**: Solution descriptions truncated mid-sentence.

### Slide 14 (Page 14) — CONTENT_DATA_PANEL (tech systems)
**What renders**: White background. Heading about fragmented systems. Below: MULTIPLE SYSTEM CARDS — each a small bordered rectangle with system name, status, and description in chartreuse text on dark background.
**Design assessment**: NOVEL. This slide uses an adaptive card layout that wasn't part of the standard 7 archetypes. The system cards are functional but visually dense.
**Issues**: Cards are too small to read the full text. Descriptions are truncated. 6+ cards on one slide is too many.

### Slide 15 (Page 15) — SECTION_HEADER
**What renders**: Dark background. "SECTION 15" in chartreuse. Title: "The Resolution: A Coherent Path Forward." Ghost text visible.
**Design assessment**: OK.
**Issues**: Section number "15" is wrong — this is slide 16 of 23, section break 4 of 5.

### Slide 16 (Page 16) — CONTENT_DATA_PANEL
**What renders**: White background. Heading: "Five Strategic Pillars..." Bullets on left. Right: THREE "PILLAR" metric cards — "PILLAR 1: Policy Alignment", "PILLAR 2: AI-Driven personalization", "PILLAR 3: Skills Transparency".
**Design assessment**: GOOD. Metric cards used creatively for pillar labeling.
**Issues**: Only 3 of 5 pillars shown. "personalization" lowercase inconsistency.

### Slides 17-18 (Pages 17-18) — CONTENT_DATA_PANEL
**What renders**: Identical template — heading, bullets, metric cards with dates (August 2026, Fall 2026, Spring 2027). Color-coded accent borders.
**Design assessment**: FUNCTIONAL but MONOTONOUS. These are the 4th and 5th consecutive CONTENT_DATA_PANEL slides. The visual rhythm is completely flat.
**Issues**: Metric cards show dates as "values" — not true metrics. The same 3-card right-panel layout repeats endlessly.

### Slide 19 (Page 19) — FULL_WIDTH_VIZ (rendered as 3-column text blocks)
**What renders**: White background. Heading. Three text blocks side by side below. No data viz, no chart, no visual.
**Design assessment**: BROKEN. A "full-width visualization" slide with no visualization. Just three paragraphs of text side by side.
**Issues**: FULL_WIDTH_VIZ archetype has no chart/viz renderer. Falls back to plain text columns.

### Slide 20 (Page 20) — CONTENT_DATA_PANEL
**What renders**: White background. Heading about product features. Bullets + metric cards.
**Design assessment**: FUNCTIONAL. Same template, 6th or 7th repetition.
**Issues**: Heading truncated: "...Will Drive Student Empowerment and.." — sentence ends with "and.." which is mid-thought.

### Slide 21 (Page 21) — CONTENT_INSIGHT_CHART
**What renders**: White background. A large "1" numeral in the top-left (looks like a slide number rendering error). Heading about future-state architecture. Right side has two horizontal bar chart items ("Current Data: Empty", "Target Data: 4") with teal progress bars.
**Design assessment**: PARTIALLY WORKING. The CONTENT_INSIGHT_CHART template renders with bar chart elements. But the "1" numeral is a rendering artifact (likely the `slideNumber` field rendered as display text instead of a footnote).
**Issues**: Bar chart labels are "Empty" for current state — the data was missing. The "1" artifact in top-left is visually confusing.

### Slide 22 (Page 22) — SECTION_HEADER
**What renders**: Dark background. "SECTION 22" in chartreuse. Title: "Next Steps: Mobilizing for Impact." Ghost text.
**Design assessment**: OK.
**Issues**: "SECTION 22" — section numbering uses slide number instead of sequential section number.

### Slide 23 (Page 23) — CONTENT_DATA_PANEL
**What renders**: White background. Heading about milestones. Three action items with metric cards (dates).
**Design assessment**: DUPLICATE. This is nearly identical to slide 17. Same dates, same structure.
**Issues**: Content repetition — NOW-horizon actions appear on both slide 17 and slide 23.

### 15.1 Visual Design Scorecard

| Dimension | Score | Evidence |
|-----------|-------|----------|
| **Template variety** | 2/10 | 13 of 23 slides are CONTENT_DATA_PANEL. BENTO_GRID used once (slide 9, broken). INSIGHT_CHART used once (slide 21, partially). |
| **Dark/light rhythm** | 4/10 | Section headers are dark, content slides are white. But the alternation is inconsistent — 5+ white slides in a row. |
| **Data panel population** | 4/10 | ~60% of slides have metric cards. But 40% have empty right panels or text-only. |
| **Typography consistency** | 5/10 | Headings are consistent (bold, chartreuse period). But body text varies wildly in size (8-14px). |
| **Color usage** | 5/10 | 3-color accent rotation (red/chartreuse/teal) works. But limited to metric card borders. |
| **Ghost text rendering** | 6/10 | Section headers with oversized ghost text are the best visual element. Clipping is the only issue. |
| **Persona image integration** | 3/10 | Only 3 slides show persona cards. Images render as tiny thumbnails. |
| **Content truncation** | 2/10 | Multiple slides have mid-sentence cutoffs. Slide 9 has 19K chars overflowing. |
| **Whitespace/balance** | 3/10 | Empty right panels create unbalanced 55/45 splits. Dense slides have no breathing room. |
| **Export fidelity** | 6/10 | PDF captures content (v32 is better than v30). But rendering artifacts (the "1" numeral, ghost text clipping). |
| **Overall visual quality** | 3.5/10 | A handful of slides (5, 6, 8, 12, 13) work. The rest are monotonous, broken, or data dumps. |

### 15.2 The Broken Design Patterns

**Pattern 1: The Empty Right Panel**
Slides 2, 4, 19 show a 55/45 split where the left side has content but the right side is blank white space. This happens when the AI generates a CONTENT_DATA_PANEL layout but provides no `metrics[]` array. The renderer draws the split but has nothing to put in the data panel.

**Pattern 2: The Data Dump Slide**
Slides 9 (19K chars), 11 (5.5K chars), and 14 (1.8K chars) cram enormous amounts of text into a single slide. The rendering engine doesn't enforce a character budget per slide, so the AI's output is rendered verbatim regardless of length. Text overflows, fonts shrink, and readability collapses.

**Pattern 3: The Monotonous Sequence**
Slides 16-21 are SIX consecutive CONTENT_DATA_PANEL slides with identical visual structure: heading left, 3 metric cards right. The only variation is the metric card values and accent colors. There is zero layout variety in this stretch — no section break, no bento grid, no problem/solution split.

**Pattern 4: The Duplicate Content**
Slides 17 and 23 contain nearly identical content (NOW-horizon actions with August 2026, Fall 2026 dates). Slide 1 and the implied slide 2 duplicate the main title. The pipeline has no deduplication check.

**Pattern 5: The Ghost Text Clip**
Section header slides (3, 7, 15, 22) have the distinctive oversized ghost text element, but it clips at the SVG/div boundary. "The Situa...", "The Comp...", "The Resol...", "Next Step..." — all truncated. The ghost text needs `overflow: visible` on its container or the text needs to be sized relative to the container width.

**Pattern 6: The Orphaned Heading**
Slide 4 is just a heading on a dark background — nothing else. No data, no cards, no visualization. This is a slide that the AI generated content for but the archetype renderer couldn't populate. It should either have been a BENTO_GRID with cells or been merged into an adjacent slide.

**Pattern 7: Raw Source References in Output**
Slide 11 shows "(Higher Ed Dive RSS from OpenAI Analysis)" and "(from roadmap)" in stat blocks. These are internal pipeline references that should have been cleaned by `slidePostProcessor.ts`. The post-processor's citation resolution is not catching these patterns because they're embedded inside `metrics[]` values, not in the main `content[]` or `narrative` fields.
