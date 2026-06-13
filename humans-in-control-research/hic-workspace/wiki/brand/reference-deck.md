---
id: brand/reference-deck.md
title: "Reference Deck Design DNA"
type: brand
created: 2026-04-10
updated: 2026-04-10
sources: [The_Ordinary_Personal_Shopper_Analysis.pptx]
confidence: medium
status: needs-review
tags: [brand, reference-deck, design-dna, the-ordinary]
evidence_count: 0
chunks:
  - id: "brand/reference-deck.md#c0"
    char_span: [0, 336]
    sentence_count: 2
    key_terms: [design, reference, identity, deck, dna, presentation, foundation, decisions]
    token_count: 68
  - id: "brand/reference-deck.md#c1"
    char_span: [381, 2657]
    sentence_count: 7
    key_terms: [text, observations, color, level, usage, per, slide, analysis]
    section: "Current Status: Awaiting Full Ingestion / Expected Content After Ingestion"
    token_count: 485
  - id: "brand/reference-deck.md#c2"
    char_span: [2659, 3898]
    sentence_count: 3
    key_terms: [charts, component, illustrations, chart, color, style, positioning, components]
    section: Expected Content After Ingestion
    token_count: 271
  - id: "brand/reference-deck.md#c3"
    char_span: [3934, 6182]
    sentence_count: 9
    key_terms: [slide, layout, slides, patterns, step, directory, pptx, analysis]
    section: INGEST Operation Instructions
    token_count: 498
  - id: "brand/reference-deck.md#c4"
    char_span: [6213, 7233]
    sentence_count: 1
    key_terms: ["deck's", brand, influence, expected, identity, derived, charts, system]
    section: Preliminary Observations
    token_count: 198
---
# Reference Deck Design DNA

This page captures the design DNA extracted from the reference presentation deck: **The_Ordinary_Personal_Shopper_Analysis.pptx**. It serves as the empirical foundation for the NXT Humans visual identity — the identity system was derived from this deck's design decisions, not invented in the abstract.

---

## Current Status: Awaiting Full Ingestion

This page is a placeholder that requires population via the INGEST operation against the source PowerPoint file. Until the deck is fully processed, the content below represents the expected structure and known preliminary observations. The `confidence: medium` and `status: needs-review` frontmatter flags reflect this incomplete state.

---

## Expected Content After Ingestion

The INGEST operation should extract and document the following from The_Ordinary_Personal_Shopper_Analysis.pptx:

### 1. Layout Decision Catalog

For each slide or slide type in the deck:

- **Slide number and title**
- **Layout pattern used** (mapped to the six patterns in [[brand/layout-patterns]]: Split Panel, Section Divider, Recommendation Callout, Evidence Block, Stat Callout, Grid Matrix)
- **Grid structure** (column count, column widths, gutter sizes)
- **Content placement** (where text, data, and visuals sit relative to each other)
- **Margin and padding values** (measured or estimated in rem/px)
- **Deviations from standard patterns** (any layout choices that do not map cleanly to the six defined patterns — these should be flagged for potential addition to the pattern library)

### 2. Color Usage Analysis

- **Background colors used per slide** (sampled hex values)
- **Text colors per hierarchy level** (headline, body, secondary, muted — sampled)
- **Accent color usage** (where chartreuse and cyan appear, at what frequency, on which element types)
- **Semantic color usage** (warning, critical, positive — if present)
- **Color ratio analysis** (approximate percentage of surface covered by each color on representative slides)
- **Dark mode usage** (which slides use dark backgrounds, and what triggers the switch)

### 3. Typography Hierarchy Observations

- **Font identification** (confirm Bebas Neue, Archivo, and any other fonts present)
- **Size measurements per text level** (approximate rem/pt sizes for each heading level and body text)
- **Weight usage** (bold, semibold, regular, light — which levels use which weights)
- **Case treatment** (which text levels are uppercase, title case, sentence case)
- **Letter spacing observations** (tight, normal, wide — per text level)
- **Line height observations** (per text level)

### 4. Illustration Style Analysis

- **Number of illustrations in the deck**
- **Style classification per illustration** (flat/geometric, photographic, diagrammatic, etc.)
- **Color usage in illustrations** (confirm three-color-maximum rule, accent color choices)
- **Shape vocabulary** (circles, rectangles, triangles, lines — frequency of each)
- **Any deviations from the flat geometric standard** (gradients, shadows, organic shapes — flag as exceptions or violations)

### 5. Chart and Data Visualization Inventory

- **Number and types of charts** in the deck
- **Chart title style** (conclusion titles vs. descriptive labels — assess compliance)
- **Color treatment in charts** (neutral base + highlight, or other)
- **Axis and grid treatment** (y-axis zero base, gridline style, label positioning)
- **Source citation presence and format**
- **Any banned chart types present** (pie charts, donut charts, 3D charts — flag as violations)

### 6. Component Inventory

- **Recurring visual components** (callout boxes, evidence blocks, stat displays, dividers)
- **Component variations** (how the same component type varies across slides)
- **Border and separator styles** (line weights, colors, positioning)
- **Spacing between components** (measured or estimated)

---

## INGEST Operation Instructions

To populate this page, execute the following process:

### Step 1: Source File Location

Locate `The_Ordinary_Personal_Shopper_Analysis.pptx` in the project directory or knowledge base. Expected locations:

- Project root or `knowledge/` directory
- Agent instructions directory
- Uploaded via file transfer

### Step 2: Extraction Method

Use one of the following approaches:

**Option A: Python python-pptx extraction**
```python
from pptx import Presentation
from pptx.util import Inches, Pt, Emu

prs = Presentation('The_Ordinary_Personal_Shopper_Analysis.pptx')
for slide_num, slide in enumerate(prs.slides, 1):
    # Extract: layout name, shapes, text content, positions, colors, fonts
    # Document each slide against the six layout patterns
```

**Option B: Manual visual audit**
Open the deck and document each slide against the six layout patterns, noting colors, fonts, sizes, and spacing. Screenshot representative slides for the wiki.

**Option C: AI-assisted visual analysis**
Export slides as images and use multimodal analysis to extract design properties, then validate against the CSS variable system in [[brand/identity]].

### Step 3: Documentation Format

For each slide or slide group, document in this structure:

```markdown
### Slide [N]: [Title]

**Pattern**: [Layout pattern name from the six defined patterns]
**Grid**: [Column structure]
**Colors**: [Background, text, accent — with hex values]
**Typography**: [Font, size, weight for each text level present]
**Evidence elements**: [Charts, screenshots, quotes — type and positioning]
**Compliance**: [Full / Partial / Deviation — with notes on any deviations]
```

### Step 4: Synthesis

After documenting all slides:

1. Identify the most frequently used layout pattern
2. Identify any patterns in the deck that are NOT in the current six-pattern library
3. Note any design decisions that contradict the current brand rules (these need resolution)
4. Calculate color usage ratios across the entire deck
5. Confirm or update font identification and size scale

### Step 5: Update This Page

Replace this placeholder content with the extracted analysis. Update frontmatter:

```yaml
confidence: high
status: active
evidence_count: [number of slides analyzed]
```

---

## Preliminary Observations

Based on the deck's influence on the existing identity system, these properties are expected but not yet confirmed via direct extraction:

- The deck uses a stark white primary background consistent with Rule 1 of [[brand/anti-slop]]
- Section dividers use full-bleed dark (near-black) backgrounds
- Chartreuse appears as a power accent on recommendation elements
- Typography uses a condensed/display headline font (likely Bebas Neue or similar)
- Layouts favor the Split Panel pattern with text-left, evidence-right composition
- Charts use neutral base colors with single-element highlighting
- No pie charts are expected based on the McKinsey influence

These observations require validation via the INGEST process.

---

## Cross-References

- [[brand/identity]] — CSS variable system derived from this deck's design decisions
- [[brand/layout-patterns]] — Six layout patterns codified from this deck's slide compositions
- [[brand/illustration-style]] — Illustration rules derived from this deck's visual treatment
