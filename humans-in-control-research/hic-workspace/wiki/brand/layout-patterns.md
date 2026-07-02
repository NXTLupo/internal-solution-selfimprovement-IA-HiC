---
id: brand/layout-patterns.md
title: "Layout Patterns Library"
type: brand
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md, The_Ordinary_Personal_Shopper_Analysis.pptx]
confidence: high
status: active
tags: [brand, layout, patterns, split-panel, section-divider, callout]
evidence_count: 0
chunks:
  - id: "brand/layout-patterns.md#c0"
    char_span: [0, 269]
    sentence_count: 4
    key_terms: [patterns, composition, layout, improvisation, deliverables, complete, freeform, multiple]
    concepts: [patterns, composition, layout]
    token_count: 52
  - id: "brand/layout-patterns.md#c1"
    char_span: [301, 2064]
    sentence_count: 2
    key_terms: [var, column, nxt-muted, evidence, content, divider, split-, data]
    concepts: [column, nxt-muted, evidence, content, divider]
    related_chunks: ["brand/layout-patterns.md#c2", "brand/layout-patterns.md#c8"]
    section: "Pattern 1: The Split Panel"
    token_count: 476
  - id: "brand/layout-patterns.md#c2"
    char_span: [2066, 2410]
    sentence_count: 1
    key_terms: [evidence, column, pattern, body-length, screenshots, conclusion, paragraphs, contains]
    concepts: [evidence, column, pattern]
    related_chunks: ["brand/layout-patterns.md#c1"]
    section: "Pattern 1: The Split Panel"
    token_count: 79
  - id: "brand/layout-patterns.md#c3"
    char_span: [2447, 4136]
    sentence_count: 5
    key_terms: [var, letter-spacing, text-transform, center, font-headline, color, major, font-family]
    concepts: [letter-spacing, text-transform, font-headline, center, font-family]
    related_chunks: ["brand/layout-patterns.md#c5", "brand/layout-patterns.md#c9"]
    section: "Pattern 2: The Section Divider"
    token_count: 430
  - id: "brand/layout-patterns.md#c4"
    char_span: [4138, 4843]
    sentence_count: 6
    key_terms: [section, title, text, number, counterclockwise, highlighting, intentional, chartreuse]
    concepts: [section, title, number]
    section: "Pattern 2: The Section Divider"
    token_count: 167
  - id: "brand/layout-patterns.md#c5"
    char_span: [4887, 6385]
    sentence_count: 4
    key_terms: [var, recommendation-, font-family, font-size, recommendations, text-transform, font-headline, margin-bottom]
    concepts: [recommendation-, font-family, font-size, recommendations, text-transform]
    related_chunks: ["brand/layout-patterns.md#c3", "brand/layout-patterns.md#c7", "brand/layout-patterns.md#c9"]
    section: "Pattern 3: The Recommendation Callout"
    token_count: 394
  - id: "brand/layout-patterns.md#c6"
    char_span: [6387, 7206]
    sentence_count: 4
    key_terms: [recommendation, headline, text, chartreuse, checkout, optional, maximum, flow]
    concepts: [recommendation, headline, chartreuse, checkout, optional]
    section: "Pattern 3: The Recommendation Callout"
    token_count: 195
  - id: "brand/layout-patterns.md#c7"
    char_span: [7242, 8923]
    sentence_count: 2
    key_terms: [var, font-family, evidence-, font-size, quotes, color, font-body, data]
    concepts: [font-family, evidence-, font-size, quotes, font-body]
    related_chunks: ["brand/layout-patterns.md#c5", "brand/layout-patterns.md#c9"]
    section: "Pattern 4: The Evidence Block"
    token_count: 443
  - id: "brand/layout-patterns.md#c8"
    char_span: [8925, 9808]
    sentence_count: 5
    key_terms: [evidence, blocks, source, content, text-xs, border, italic, quotes]
    concepts: [evidence, blocks, source, content, text-xs]
    related_chunks: ["brand/layout-patterns.md#c1"]
    section: "Pattern 4: The Evidence Block"
    token_count: 212
  - id: "brand/layout-patterns.md#c9"
    char_span: [9842, 11555]
    sentence_count: 2
    key_terms: [var, font-family, font-size, letter-spacing, number, color, stat-, margin-top]
    concepts: [font-family, font-size, letter-spacing, number, color]
    related_chunks: ["brand/layout-patterns.md#c3", "brand/layout-patterns.md#c5", "brand/layout-patterns.md#c7", "brand/layout-patterns.md#c11"]
    section: "Pattern 5: The Stat Callout"
    token_count: 448
  - id: "brand/layout-patterns.md#c10"
    char_span: [11557, 12309]
    sentence_count: 5
    key_terms: [stat, callouts, number, left-aligned, descriptor, retention, increase, maximum]
    concepts: [callouts, left-aligned, number, descriptor, retention]
    section: "Pattern 5: The Stat Callout"
    token_count: 202
  - id: "brand/layout-patterns.md#c11"
    char_span: [12342, 13861]
    sentence_count: 1
    key_terms: [var, grid-matrix, border-bottom, color, font-family, background, comparison, structured]
    concepts: [grid-matrix, border-bottom, font-family, background, color]
    related_chunks: ["brand/layout-patterns.md#c9"]
    section: "Pattern 6: The Grid Matrix"
    token_count: 394
  - id: "brand/layout-patterns.md#c12"
    char_span: [13863, 15007]
    sentence_count: 8
    key_terms: [columns, header, visual, row, separation, highlight, borders, content]
    concepts: [columns, header, visual, separation, highlight]
    section: "Pattern 6: The Grid Matrix"
    token_count: 270
  - id: "brand/layout-patterns.md#c13"
    char_span: [15039, 16318]
    sentence_count: 8
    key_terms: [recommendation, evidence, patterns, panel, split, inside, appear, column]
    concepts: [recommendation, evidence, patterns, panel, split]
    section: Pattern Composition Rules
    token_count: 272
---
# Layout Patterns Library

Six layout patterns form the complete composition system for NXT Humans deliverables. Every page, slide, or screen in any output MUST use one of these patterns or a composition of multiple patterns. No freeform layouts. No improvisation.

---

## Pattern 1: The Split Panel

The workhorse layout. Used for the majority of analysis content where text-based insight is paired with visual evidence.

### Structure

| Left Column (50%) | Divider | Right Column (50%) |
|---|---|---|
| Headline + body text + bullets | 1px vertical `--nxt-rule` line | Screenshot, chart, data table, or illustration |

### When to Use

- Analysis slides pairing a finding with its evidence
- Research pages where a conclusion is supported by a data visualization
- Comparison layouts where narrative context sits alongside quantitative data
- Any content that has both a "what we found" and a "here is proof" component

### Specifications

```css
.split-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  align-items: start;
  min-height: 400px;
}

.split-panel__text {
  padding: var(--space-lg);       /* 2rem */
  padding-right: var(--space-xl); /* 3rem — extra breathing room before the divider */
}

.split-panel__divider {
  width: 1px;
  background: var(--nxt-rule);    /* #E0E0E0 */
  align-self: stretch;
  /* Positioned between columns via grid or absolute positioning */
}

.split-panel__evidence {
  padding: var(--space-lg);       /* 2rem */
  padding-left: var(--space-xl);  /* 3rem — extra breathing room after the divider */
}
```

### Text Column Content Order

1. **Section label** (optional): `--text-xs`, `--nxt-muted`, uppercase, `letter-spacing: 0.1em`
2. **Headline**: `--font-headline`, `--text-2xl` or `--text-3xl`, `--nxt-heading`
3. **Lead paragraph**: `--text-lg`, `--nxt-body`, 1-2 sentences maximum
4. **Bullet points**: `--text-base`, `--nxt-body`, square bullet markers in `--nxt-muted`, `--space-sm` between items
5. **Source citation** (if applicable): `--text-xs`, `--nxt-muted`

### Evidence Column Rules

- Evidence fills the column width with `--space-lg` padding on all sides
- Charts include their conclusion title within the evidence column
- Screenshots get a 1px `--nxt-rule` border
- Data tables use the Grid Matrix pattern (Pattern 6) scaled to fit
- The evidence column NEVER contains body-length paragraphs — it is visual, not textual

---

## Pattern 2: The Section Divider

A full-bleed visual break that signals a major topic transition. Uses DARK mode. Appears between major sections of a document or presentation.

### Structure

Full-width dark background spanning the entire viewport/page. Oversized display type. Minimal content.

### When to Use

- Between major sections of a research report (e.g., between "Findings" and "Recommendations")
- Title slides in presentations
- Opening pages of document chapters
- Any moment where the reader needs a visual "deep breath" before the next section

### Specifications

```css
.section-divider {
  background: var(--nxt-black);   /* #0D0D0D */
  color: var(--nxt-white);        /* #FFFFFF */
  width: 100%;
  min-height: 100vh;              /* Full viewport height for slides */
  display: flex;
  align-items: center;
  padding: var(--space-2xl);      /* 5rem */
  position: relative;
  overflow: hidden;               /* Allows text to crop at edges */
}

.section-divider__title {
  font-family: var(--font-headline);
  font-size: var(--text-5xl);     /* 4.5rem — or larger */
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.0;
  color: var(--nxt-white);
  max-width: 70%;                 /* Text does not span full width */
}

.section-divider__sidebar {
  position: absolute;
  left: var(--space-md);          /* 1rem from left edge */
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: center center;
  font-family: var(--font-headline);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: var(--nxt-muted);        /* Subtle — not competing with title */
  white-space: nowrap;
}
```

### Rules

1. **"NXT HUMANS" vertical sidebar on the left edge.** Rotated 90 degrees counterclockwise. This is a brand watermark that appears on every section divider.
2. **Title text may crop/overflow edges.** Oversized display type that extends beyond the visible area is intentional. It creates visual tension and signals confidence.
3. **Maximum two text elements.** The title and optionally a subtitle or section number. No paragraphs, no bullets, no images.
4. **Section number** (optional): `--text-sm`, `--nxt-muted`, positioned above the title. Format: "01", "02", etc.
5. **No chartreuse or cyan on section dividers** unless highlighting a single word in the title. White text on black is the default.

---

## Pattern 3: The Recommendation Callout

A high-visibility block that demands attention. Used for key recommendations, critical action items, and must-not-miss findings.

### Structure

Full-width block with chartreuse background. Bold headline. Optional supporting text.

### When to Use

- Key recommendations that the reader must act on
- Critical findings that change the strategic direction
- Action items with assigned owners and deadlines
- "If you read nothing else, read this" moments

### Specifications

```css
.recommendation-callout {
  background: var(--nxt-recommend);      /* #B8B800 */
  color: var(--nxt-recommend-text);      /* #0D0D0D */
  padding: var(--space-lg) var(--space-xl); /* 2rem top/bottom, 3rem left/right */
  margin: var(--space-lg) 0;             /* Vertical separation from surrounding content */
}

.recommendation-callout__label {
  font-family: var(--font-headline);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: var(--space-xs);        /* 0.25rem */
  opacity: 0.7;
}

.recommendation-callout__headline {
  font-family: var(--font-headline);
  font-size: var(--text-2xl);            /* 1.75rem */
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1.2;
  margin-bottom: var(--space-sm);        /* 0.5rem */
}

.recommendation-callout__body {
  font-family: var(--font-body);
  font-size: var(--text-base);           /* 1rem */
  line-height: 1.6;
  max-width: 60ch;                       /* Readable line length */
}
```

### Rules

1. **MUST pop visually.** The chartreuse background is the most aggressive element in the design system. It exists to interrupt the reader's flow and force attention.
2. **Short, decisive headline.** "Redesign the checkout flow before Q4 launch" not "Considerations for potential checkout improvements."
3. **Optional label above headline**: "RECOMMENDATION", "CRITICAL FINDING", "ACTION REQUIRED" in `--text-xs` uppercase.
4. **Body text is optional.** If the headline says it all, leave it at that. If context is needed, keep it to 2-3 sentences maximum.
5. **Maximum 2-3 recommendation callouts per document section.** Overuse destroys the pattern's impact. If everything is a recommendation, nothing is.
6. **Text color is always black (#0D0D0D) on chartreuse.** Never white text — insufficient contrast ratio.

---

## Pattern 4: The Evidence Block

A visually distinct container for cited data, verbatim quotes, and metric callouts. Evidence blocks signal "this is not opinion — this is data."

### Structure

Light cyan-tinted background block containing data, quotes, or metrics with a source citation.

### When to Use

- Verbatim customer quotes from research
- Specific metrics or data points that support a finding
- Referenced statistics from external sources
- Any content where provenance and credibility matter

### Specifications

```css
.evidence-block {
  background: var(--nxt-evidence);       /* #E8F4F8 */
  padding: var(--space-lg);              /* 2rem */
  margin: var(--space-md) 0;             /* 1rem vertical separation */
  border-left: 3px solid var(--nxt-cyan); /* #00B7C3 left accent border */
  position: relative;
}

.evidence-block__label {
  font-family: var(--font-headline);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--nxt-secondary);           /* #666666 */
  margin-bottom: var(--space-sm);
}

.evidence-block__content {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--nxt-body);                /* #333333 */
  line-height: 1.6;
}

.evidence-block__quote {
  font-family: var(--font-body);
  font-size: var(--text-lg);             /* 1.15rem — slightly larger for quotes */
  font-style: italic;
  color: var(--nxt-heading);             /* #0D0D0D */
  line-height: 1.6;
}

.evidence-block__source {
  font-family: var(--font-body);
  font-size: var(--text-xs);             /* 0.7rem */
  color: var(--nxt-muted);              /* #999999 */
  text-align: right;
  margin-top: var(--space-sm);
}
```

### Rules

1. **Source citation is mandatory.** Every evidence block MUST have a source in `--text-xs` at the bottom-right. No exceptions.
2. **Evidence blocks are first-class design elements, NOT footnotes.** They are sized, positioned, and styled to be read as primary content. They do not shrink into margins or hide at the bottom of pages.
3. **Label above content**: "CUSTOMER QUOTE", "SURVEY DATA", "BENCHMARK", "EXTERNAL SOURCE" in `--text-xs` uppercase.
4. **Left border accent.** The 3px cyan left border distinguishes evidence blocks from recommendation callouts and provides a subtle visual anchor.
5. **Verbatim quotes use italic.** Direct quotes are styled with `font-style: italic` at `--text-lg`. Paraphrased data uses regular weight at `--text-base`.
6. **Maximum 80 characters per line** inside evidence blocks. Use `max-width: 50ch` on quote text for optimal readability.

---

## Pattern 5: The Stat Callout

A high-impact data point displayed at oversized scale. The visual equivalent of saying the number out loud in a presentation.

### Structure

Large number with a descriptor below and a source citation beneath that.

### When to Use

- The single most important data point on a page
- KPI dashboards where 3-5 key metrics need immediate visibility
- Opening a section with a "hook" number that frames the subsequent analysis
- Executive summary pages where speed of comprehension matters

### Specifications

```css
.stat-callout {
  text-align: left;                      /* Left-aligned, not centered */
  padding: var(--space-md) 0;
}

.stat-callout__number {
  font-family: var(--font-headline);
  font-size: var(--text-5xl);            /* 4.5rem */
  font-weight: 900;
  color: var(--nxt-chartreuse);          /* #B8B800 */
  line-height: 1.0;
  letter-spacing: -0.02em;              /* Tighten tracking on large numbers */
}

.stat-callout__descriptor {
  font-family: var(--font-body);
  font-size: var(--text-sm);             /* 0.8rem */
  color: var(--nxt-secondary);           /* #666666 */
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: var(--space-xs);           /* 0.25rem */
}

.stat-callout__source {
  font-family: var(--font-body);
  font-size: var(--text-xs);             /* 0.7rem */
  color: var(--nxt-muted);              /* #999999 */
  margin-top: var(--space-xs);
}
```

### Stat Callout Grouping

When displaying 3-5 stat callouts in a row:

```css
.stat-callout-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-lg);                  /* 2rem between callouts */
  padding: var(--space-lg) 0;
}
```

### Rules

1. **Number in chartreuse.** The oversized number is ALWAYS `--nxt-chartreuse`. This is the primary use of the accent color in the stat callout pattern.
2. **Descriptor is a label, not a sentence.** "Increase in retention" not "We observed an increase in customer retention rates." Maximum 5 words.
3. **Include the unit.** "18%" not "18". "$1.2M" not "1.2M". "4.7/5.0" not "4.7". The number must be self-contained.
4. **Source is mandatory.** Even for stat callouts. `--text-xs` below the descriptor.
5. **Maximum 5 stat callouts in a group.** More than 5 dilutes impact and creates visual noise.
6. **Left-aligned, not centered.** Stat callouts align to the left margin of their container, consistent with the overall left-aligned layout system.

---

## Pattern 6: The Grid Matrix

A structured comparison table for feature assessments, maturity evaluations, and multi-dimensional analysis.

### Structure

Clean grid with header row, consistent column widths, and minimal visual chrome.

### When to Use

- Feature comparison across products or competitors
- Maturity assessment across capabilities
- Scoring rubrics (e.g., heuristic evaluation results)
- Any structured data with rows and columns where a chart is not appropriate

### Specifications

```css
.grid-matrix {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: var(--text-sm);             /* 0.8rem — compact for data density */
}

.grid-matrix th {
  font-family: var(--font-headline);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nxt-heading);             /* #0D0D0D */
  background: var(--nxt-panel);          /* #F5F5F0 */
  padding: var(--space-sm) var(--space-md); /* 0.5rem 1rem */
  text-align: left;
  border-bottom: 2px solid var(--nxt-rule); /* #E0E0E0 — heavier bottom border on header */
}

.grid-matrix td {
  padding: var(--space-sm) var(--space-md);
  color: var(--nxt-body);                /* #333333 */
  border-bottom: 1px solid var(--nxt-rule);
  vertical-align: top;
}

.grid-matrix tr:nth-child(even) td {
  background: var(--nxt-off-white);      /* #FAFAFA — subtle alternating rows */
}

.grid-matrix td.highlight {
  color: var(--nxt-chartreuse);          /* For standout values */
  font-weight: 700;
}
```

### Rules

1. **Header row uses `--font-headline`** (Bebas Neue) in uppercase. This distinguishes it from body content and anchors the visual hierarchy.
2. **Header background is `--nxt-panel`** (#F5F5F0). Not white, not dark — the warm gray signals "header" without competing with content.
3. **2px bottom border on header row**, 1px on all other rows. This single difference in border weight creates sufficient visual separation.
4. **Alternating row shading** with `--nxt-off-white` (#FAFAFA). Subtle enough to not create visual noise, distinct enough to aid row tracking.
5. **Left-aligned text in all cells.** Numbers may be right-aligned within their column for decimal alignment.
6. **No vertical borders between columns.** Adequate `--space-md` padding between columns provides visual separation without grid lines. The only borders are horizontal.
7. **Maximum 7 columns.** Beyond 7 columns, the matrix becomes unreadable. Split into multiple matrices or restructure the analysis.
8. **Highlight values sparingly.** Use `.highlight` class (chartreuse, bold) for the 1-3 most important values in the entire matrix. Not for every "good" score.

---

## Pattern Composition Rules

Pages often combine multiple patterns. These rules govern how patterns interact.

### Stacking Order (top to bottom)

1. Section Divider (if starting a new section)
2. Stat Callout group (if opening with key metrics)
3. Split Panel (primary analysis content)
4. Recommendation Callout (if a recommendation follows from the analysis)
5. Evidence Block (supporting data for the recommendation)
6. Grid Matrix (detailed comparison or assessment data)

### Spacing Between Patterns

- Between any two patterns: `--space-xl` (3rem) minimum
- Between Section Divider and next content: `--space-2xl` (5rem)
- Between Recommendation Callout and Evidence Block: `--space-md` (1rem) — tighter coupling because they are related

### Nesting

- Evidence Blocks may appear inside the text column of a Split Panel
- Stat Callouts may appear inside the evidence column of a Split Panel
- Grid Matrices may appear inside the evidence column of a Split Panel
- Recommendation Callouts are ALWAYS full-width — never nested inside a Split Panel column

---

## Cross-References

- [[brand/identity]] — CSS variables for all colors, fonts, and spacing tokens used in these patterns
- [[brand/chart-standards]] — Chart rendering rules that apply when charts appear inside Split Panel evidence columns
