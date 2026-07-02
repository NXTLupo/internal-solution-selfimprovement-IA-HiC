---
id: frameworks/deck.md
title: "Strategy Deck Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [deck, minto, pyramid-principle, scr, presentations, mckinsey]
evidence_count: 0
chunks:
  - id: "frameworks/deck.md#c0"
    char_span: [0, 364]
    sentence_count: 3
    key_terms: [deck, strategy, anti-patterns, authoritative, specification, deliverable, methodology, generating]
    concepts: [strategy]
    section: Purpose
    token_count: 60
  - id: "frameworks/deck.md#c1"
    char_span: [390, 2891]
    sentence_count: 13
    key_terms: [complete, complication, conclusion, group, slide, arguments, assertion, component]
    concepts: [complete, complication, conclusion, arguments, assertion]
    section: Canonical Framework
    token_count: 503
  - id: "frameworks/deck.md#c2"
    char_span: [2893, 4654]
    sentence_count: 6
    key_terms: [chart, bar, data, charts, presentations, visualization, never, state]
    concepts: [chart, presentations, visualization, charts, never]
    section: Canonical Framework
    token_count: 399
  - id: "frameworks/deck.md#c3"
    char_span: [4679, 6830]
    sentence_count: 6
    key_terms: [slide, chapter, component, executive, title, evidence, sentences, complete]
    concepts: [chapter, slide, component, executive, evidence]
    related_chunks: ["frameworks/deck.md#c7"]
    section: Required Structure
    token_count: 437
  - id: "frameworks/deck.md#c4"
    char_span: [6832, 7823]
    sentence_count: 1
    key_terms: [recommendation, methodology, appendix, digital, impact, data, bibliography, dependencies]
    concepts: [recommendation, methodology, appendix, digital, impact]
    section: Required Structure
    token_count: 208
  - id: "frameworks/deck.md#c5"
    char_span: [7843, 9432]
    sentence_count: 8
    key_terms: [partner, slide, test, restructure, charts, titles, narrative, client]
    concepts: [partner, slide, restructure, charts, titles]
    related_chunks: ["frameworks/deck.md#c8"]
    section: Quality Gates
    token_count: 337
  - id: "frameworks/deck.md#c6"
    char_span: [9462, 10535]
    sentence_count: 4
    key_terms: [chart, title, annotations, information, footnotes, hierarchy, standards, insight]
    concepts: [chart, title, annotations, information, footnotes]
    section: Slide Design Principles
    token_count: 255
  - id: "frameworks/deck.md#c7"
    char_span: [10555, 12352]
    sentence_count: 22
    key_terms: [audience, evidence, slide, data, rather, slides, titles, alternatives]
    concepts: [audience, evidence, slide, alternatives, rather]
    related_chunks: ["frameworks/deck.md#c3"]
    section: Anti-Patterns
    token_count: 373
  - id: "frameworks/deck.md#c8"
    char_span: [12382, 14097]
    sentence_count: 9
    key_terms: [slide, pyramid, recommendation, titles, chart, generating, appendix, argument]
    concepts: [slide, recommendation, pyramid, titles, chart]
    related_chunks: ["frameworks/deck.md#c5"]
    section: Generation Instructions
    token_count: 356
  - id: "frameworks/deck.md#c9"
    char_span: [14120, 14567]
    sentence_count: 1
    key_terms: [deck, frameworks, personas, brand, industry-specific, chart-standards, client-specific, layout-patterns]
    concepts: [frameworks, personas, brand]
    section: Cross-References
    token_count: 92
---
# Strategy Deck Framework Specification

## Purpose

This page is the authoritative reference the AI reads before generating any strategy deck deliverable. It codifies the canonical methodology, required structure, quality gates, and anti-patterns that govern deck creation. Every generated deck must comply with these standards or be flagged for human review.

---

## Canonical Framework

### Minto Pyramid Principle

Barbara Minto's "The Pyramid Principle" (1987, McKinsey & Company) is the foundational logic structure for all consulting communication. The core rules:

1. **Start with the answer.** The governing thought -- the single most important conclusion -- appears first. Every subsequent element exists to support it. Audiences should never have to wait to understand the recommendation.

2. **Group and summarize supporting arguments.** Arguments are organized into mutually exclusive, collectively exhaustive (MECE) groups. Each group has its own governing thought that summarizes its children.

3. **Logically order within each group.** Arguments within a group follow one of four logical orderings:
   - **Deductive** (major premise, minor premise, conclusion)
   - **Chronological** (first, then, finally)
   - **Structural** (component A, component B, component C)
   - **Comparative** (most important to least important)

4. **Ideas at each level summarize the ideas below.** A parent node is never merely a topic label -- it is a complete assertion that the children collectively prove.

### SCR (Situation-Complication-Resolution)

The SCR framework structures the narrative arc of the executive summary -- the most critical slide in any deck. It creates tension that compels the audience to engage:

- **Situation**: The undisputed facts that set the context. The audience nods along because everything stated here is already known and accepted. This builds trust and shared ground.
- **Complication**: The problem, change, or tension that disrupts the situation. This is where the audience leans in -- the complication creates urgency and emotional engagement.
- **Resolution**: The recommended course of action that addresses the complication. This is the governing thought of the entire deck.

The SCR must fit on one slide. If it requires two slides, the narrative is not yet sharp enough.

### Assertion-Evidence Model

Robert Kosara and others have demonstrated that slides with assertion headlines (complete sentences stating a conclusion) paired with visual evidence (charts, diagrams, images) outperform traditional topic-title-plus-bullets slides in comprehension and retention. Rules:

- The slide title IS the insight (a complete declarative sentence)
- The body IS the evidence (a chart, diagram, or structured data -- not a bullet list)
- If a slide requires bullets, each bullet is a complete sentence with its own assertion

### Nancy Duarte's Sparkline

Duarte's "Resonate" (2010) maps effective presentations against a narrative arc that alternates between "what is" (current state) and "what could be" (future state). The deck structure should create this oscillation:

1. **What is** -- Situation and current performance
2. **What could be** -- The opportunity or vision
3. **What is** -- Barriers and complications
4. **What could be** -- Proposed solution and expected outcomes
5. **New bliss** -- The transformed future state with the recommendation implemented

This creates emotional momentum that propels the audience toward agreement.

### Gene Zelazny Data Visualization Standards

Zelazny's "Say It with Charts" (McKinsey, 1985, updated 2001) establishes the data visualization standards for consulting presentations:

| Comparison Type | Recommended Chart | Never Use |
|----------------|-------------------|-----------|
| Component (parts of whole) | Stacked bar, waterfall, treemap | Pie chart |
| Item (ranking) | Horizontal bar | Vertical bar for 7+ items |
| Time series (trend) | Line chart | Bar chart for continuous data |
| Frequency (distribution) | Histogram, box plot | Pie chart |
| Correlation | Scatter plot | Line chart for non-sequential data |

**Absolute rules:**
- Never use pie charts. They fail at the one task they attempt (comparing areas). Stacked bars or waterfalls always outperform.
- Never use 3D effects on any chart. They distort proportions and add no information.
- Every chart must have a title that states the insight, not the metric. "Revenue grew 23% YoY driven by enterprise expansion" not "Revenue FY2024-FY2025."
- Every data point must have a visible source citation on the slide.
- Y-axes start at zero for bar charts (truncated axes distort comparisons).

---

## Required Structure

Every strategy deck must include these five structural components in order.

### Component 1: Title Slide

- Deck title (action-oriented, not topic-oriented)
- Client name and logo placement per brand standards
- Date and version number
- Classification (confidential, internal, draft)
- Author/team attribution

**Good title:** "Accelerating Digital Enrollment to Capture $47M in Unrealized Revenue"
**Bad title:** "Digital Transformation Strategy Presentation"

### Component 2: Executive Summary in SCR Format

This is the single most important slide. It must be comprehensible in isolation -- a senior executive who reads only this slide should understand the situation, the problem, the recommendation, and the expected impact.

Structure:
- **Situation** (2-3 sentences): Undisputed context the audience already accepts
- **Complication** (2-3 sentences): The tension, threat, or opportunity that demands action
- **Resolution** (2-3 sentences): The recommended course of action with quantified expected impact
- **Key proof points** (3-5 bullets): The strongest supporting evidence, each a complete sentence

The Partner Test applies here: a senior partner reading only the executive summary should be able to present the deck's core argument in a meeting without seeing any other slide.

### Component 3: Body/Exhibits with Pyramid Chapter Structure

The body follows the Minto Pyramid: 3-5 chapters, each with a governing assertion, organized MECE. Each chapter contains:

- **Chapter divider slide**: States the chapter's governing assertion as a complete sentence
- **Evidence slides** (2-5 per chapter): Each slide has an action title and supporting evidence
- **Synthesis slide** (optional): Summarizes implications of the chapter's evidence

Within each chapter, slides follow a logical order (deductive, chronological, structural, or comparative). The order must be explicitly chosen and defensible.

**Pyramid validation test:** Read only the chapter dividers. They should form a complete, logical argument that proves the executive summary's resolution.

### Component 4: Specific Prioritized Recommendations

Recommendations must be:

- **Specific**: Named owners, timelines, and budgets (not "improve digital experience" but "redesign the plan comparison tool by Q3 2026 with a $400K budget, owned by VP Digital Product")
- **Prioritized**: Ranked by impact and feasibility using a 2x2 matrix or numbered sequence
- **Sequenced**: Organized into phases (quick wins, medium-term, structural) with dependencies mapped
- **Quantified**: Each recommendation includes expected impact on identified KPIs
- **Actionable**: The next step for each recommendation is clear and assignable

### Component 5: Appendix with Methodology and Data

The appendix contains everything a skeptical analyst would need to validate the findings:

- Research methodology (sample sizes, collection methods, date ranges, limitations)
- Full data tables behind key charts
- Statistical significance indicators where applicable
- Glossary of terms and acronyms
- Bibliography and source list
- Interview/survey guides used
- Detailed assumptions log

---

## Quality Gates

| Gate | Requirement | Failure Consequence |
|------|-------------|---------------------|
| Action titles | Every slide title is a complete sentence stating a conclusion | Rewrite all titles |
| Partner Test | Reading only titles tells the complete story | Restructure narrative |
| One insight per slide | No slide makes more than one point | Split slides |
| MECE structure | Chapters are mutually exclusive, collectively exhaustive | Restructure |
| No pie charts | Zero pie charts in the deck | Replace with bars/waterfalls |
| Chart standards | All charts follow Zelazny standards (source, insight title, zero-base) | Revise charts |
| Sources cited | Every data point has a visible source on the slide | Add sources |
| SCR executive summary | Executive summary follows SCR format and passes the Partner Test | Rewrite |
| Quantified recommendations | Every recommendation includes expected impact | Add quantification |
| Duarte Sparkline | Narrative alternates between "what is" and "what could be" | Restructure arc |

### The Partner Test (Expanded)

The Partner Test is the single most important quality gate. It simulates a scenario where a senior partner receives the deck 5 minutes before a client meeting and must present it cold. The test:

1. Read only the slide titles in sequence
2. Can you understand the argument? (Logical completeness)
3. Can you present it persuasively? (Narrative flow)
4. Can you answer likely client questions? (Evidence sufficiency)
5. Do you know what to ask the client to do? (Clear call to action)

If any answer is "no," the deck fails.

---

## Slide Design Principles

### Information Hierarchy

Every slide has three layers of information, consumed in order:

1. **Title** (read first, 2 seconds): The insight -- a complete sentence the audience remembers
2. **Visual** (scanned second, 5-10 seconds): The evidence that proves the title
3. **Annotations** (read third, if needed): Footnotes, sources, caveats

### Layout Standards

- **Whitespace**: Minimum 15% of slide area is empty space. Crowded slides signal unclear thinking.
- **Font hierarchy**: Title (18-24pt bold), body (14-16pt regular), footnotes (10-12pt)
- **Color palette**: Maximum 5 colors per deck. Use brand primary for key data, gray for context, one accent for emphasis.
- **Alignment**: All elements snap to a grid. No floating objects with irregular margins.

### Chart Annotation Standards

Every chart requires:
- An insight title (what the chart proves, not what it shows)
- Axis labels with units
- A source citation (bottom-left or bottom-right)
- Callout annotations on the 1-2 most important data points
- A legend only if the chart has more than 2 series

---

## Anti-Patterns

### 1. Topic Titles
Slide titles that name a topic ("Market Overview," "Customer Segmentation") rather than stating a conclusion. Topic titles force the audience to read the entire slide to understand the point. They are the most common and most damaging deck failure.

### 2. Buried Lead
Placing the recommendation at the end of the deck rather than the beginning. Consulting decks are not mystery novels. The answer comes first; the evidence follows.

### 3. Death by Bullets
Slides consisting entirely of bullet points with no visual evidence. If a point can be made with a chart, diagram, or image, it should be. Bullets are a last resort, and each bullet must be a complete assertion.

### 4. Data Dump
Including every piece of collected data rather than curating the evidence that supports the argument. More data does not mean more persuasive. Ruthless editing is a sign of clear thinking.

### 5. The Franken-Deck
Assembling slides from previous decks without unifying the narrative, visual style, or argument structure. Every slide must serve the current deck's governing thought.

### 6. Invisible Logic
Chapters that follow no discernible logical order. The audience should never wonder "why is this slide here?" The logical progression (deductive, chronological, structural, comparative) must be self-evident.

### 7. The False Dichotomy
Presenting only two options (do nothing vs. recommended approach) when the audience expects a genuine evaluation of alternatives. Include 2-3 viable alternatives with honest pros/cons before recommending one.

### 8. Missing "So What"
Charts or data slides that present information without interpreting it. Every piece of evidence must be connected to a conclusion. If the audience has to generate the insight themselves, the deck has failed.

---

## Generation Instructions

When the AI generates strategy decks using this framework:

1. **Build the pyramid first.** Before writing any slide, construct the full argument pyramid: governing thought, 3-5 chapter assertions, and the evidence nodes under each. Validate the pyramid for MECE structure and logical completeness before generating slides.

2. **Write the executive summary first.** The SCR slide is the anchor. If the SCR cannot be written clearly, the argument is not ready for a deck.

3. **Write all slide titles before writing slide bodies.** Read the titles in sequence. Apply the Partner Test. If the titles alone do not tell a complete, persuasive story, restructure before proceeding.

4. **Apply the Duarte Sparkline.** Map the title sequence against the what-is / what-could-be oscillation. Ensure the narrative builds emotional momentum.

5. **Choose chart types using the Zelazny matrix.** Never default to the most familiar chart type. Match the comparison type to the recommended visualization.

6. **Quantify every recommendation.** If a recommendation cannot be quantified (even with ranges or estimates), flag it as "IMPACT PENDING -- requires [specific analysis] to quantify."

7. **Populate the appendix.** Include methodology, data tables, assumptions, and sources. The appendix is not optional.

8. **Run all quality gates before delivery.** Every gate must pass. Document gate results in output metadata.

9. **Cross-reference related frameworks.** When generating decks, check:
   - [[anti-patterns/deck]] for industry-specific presentation failure modes
   - [[brand/chart-standards]] for client-specific chart formatting rules
   - [[brand/layout-patterns]] for slide template and grid specifications

---

## Cross-References

- [[anti-patterns/deck]] -- Industry-specific deck failure modes and remediation
- [[brand/chart-standards]] -- Client-specific chart formatting, color palettes, and typography
- [[brand/layout-patterns]] -- Slide template grids, margin standards, and component placement
- [[frameworks/personas]] -- Personas inform audience analysis for deck framing
- [[frameworks/blueprint]] -- Service blueprints provide source material for operational slides
