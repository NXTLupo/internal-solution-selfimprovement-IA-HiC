---
id: anti-patterns/deck.md
title: "Deck Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, deck, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/deck.md#c0"
    char_span: [0, 2743]
    sentence_count: 11
    key_terms: [slide, slides, points, recommendation, alternative, description, bullet, rather]
    section: "AP-DECK-001: Topic Titles Instead of Action Titles / AP-DECK-002: Buried Lead / AP-DECK-003: Death by Bullets"
    token_count: 507
  - id: "anti-patterns/deck.md#c1"
    char_span: [2779, 3661]
    sentence_count: 4
    key_terms: [slides, situation-complication-resolution, narrative, previous, sections, section, titles, story]
    section: "AP-DECK-004: No Narrative Arc"
    token_count: 161
  - id: "anti-patterns/deck.md#c2"
    char_span: [3691, 4482]
    sentence_count: 2
    key_terms: [pie, charts, chart, visualization, data, segments, showing, value]
    section: "AP-DECK-005: Pie Charts"
    token_count: 170
  - id: "anti-patterns/deck.md#c3"
    char_span: [4520, 5311]
    sentence_count: 3
    key_terms: [adoption, digital, "slide's", visual, stock, informational, presentation, professional]
    section: "AP-DECK-006: Decorative Visuals"
    token_count: 151
  - id: "anti-patterns/deck.md#c4"
    char_span: [5354, 6115]
    sentence_count: 2
    key_terms: [without, source, market, statistics, global, reach, distinguishing, best-in-class]
    section: "AP-DECK-007: Missing Sources on Data"
    token_count: 170
  - id: "anti-patterns/deck.md#c5"
    char_span: [6150, 7004]
    sentence_count: 2
    key_terms: [categories, example, segments, overlap, rules, discriminating, exhaustiveness, professionals]
    section: "AP-DECK-008: MECE Violations"
    token_count: 164
  - id: "anti-patterns/deck.md#c6"
    char_span: [7042, 7952]
    sentence_count: 3
    key_terms: [data, recommendation, recommended, response, support, action, cause, chart]
    section: "AP-DECK-009: \"So What?\" Failure"
    token_count: 180
  - id: "anti-patterns/deck.md#c7"
    char_span: [7992, 8949]
    sentence_count: 5
    key_terms: [structure, deck, question, strategic, includes, sections, sequence, specific]
    section: "AP-DECK-010: Template-Driven Deck"
    token_count: 168
---
# Deck Anti-Patterns

Known failure modes in presentation deck deliverables. Use as negative few-shot examples during generation to prevent common structural and narrative mistakes.

---

### AP-DECK-001: Topic Titles Instead of Action Titles
- **Description**: Slide titles name a category ("Market Overview," "Competitive Landscape") rather than stating the conclusion or insight the audience should take away.
- **Detection Criteria**: Slide title is a noun phrase with no verb, no claim, and no directional statement. Reader cannot determine the slide's argument from the title alone.
- **Severity**: Critical
- **Example of Mistake**: "Customer Satisfaction Results"
- **Correct Alternative**: "Customer satisfaction dropped 12 points in Q3 driven by checkout latency, not product quality"
- **Root Cause**: AI mimics template-driven decks from training data where topic labels are the norm. Generating a conclusion requires synthesizing the slide content first, which is a harder generation task.

### AP-DECK-002: Buried Lead
- **Description**: The most important insight appears on slide 12 or later instead of within the first three slides. The audience must endure background context before reaching the point.
- **Detection Criteria**: Executive summary or key recommendation appears after slide 5; opening slides are definitional or contextual rather than insight-driven.
- **Severity**: Critical
- **Example of Mistake**: Slides 1-10 cover methodology, market context, and definitions. The strategic recommendation appears on slide 14.
- **Correct Alternative**: Slide 2 presents the core recommendation. Slides 3-5 provide the three strongest supporting arguments. Methodology and context move to an appendix.
- **Root Cause**: AI follows a chronological generation pattern (setup then payoff) rather than a consulting pyramid structure (answer first, evidence second).

### AP-DECK-003: Death by Bullets
- **Description**: Slides contain eight or more bullet points, creating dense text walls that the audience reads instead of listens to. Cognitive load exceeds what a single slide can support.
- **Detection Criteria**: Any slide with more than six bullet points or more than 75 words of body text (excluding titles and source lines).
- **Severity**: Major
- **Example of Mistake**: A slide titled "Key Findings" followed by 11 bullet points of varying specificity and importance.
- **Correct Alternative**: Maximum three to four bullet points per slide. Each point is a complete sentence making a single claim. Split overflow into additional slides or move detail to appendix.
- **Root Cause**: AI maximizes information density per output unit, treating each slide as a container to fill rather than a single argument to land.

### AP-DECK-004: No Narrative Arc
- **Description**: Slides are a disconnected collection of analyses with no throughline connecting them. The deck reads as a report, not a story.
- **Detection Criteria**: Remove all slide bodies and read titles in sequence. If the titles do not tell a coherent story with logical flow, the narrative arc is missing.
- **Severity**: Critical
- **Example of Mistake**: Slides jump from market sizing to competitive analysis to user research to technology audit with no connective tissue explaining why each section follows the previous.
- **Correct Alternative**: A situation-complication-resolution structure where each section explicitly builds on the previous one. Transition slides or bridging statements connect major sections.
- **Root Cause**: AI generates sections independently, optimizing each in isolation without maintaining a global narrative state across the full deck.

### AP-DECK-005: Pie Charts
- **Description**: Data is presented using pie charts, which are consistently shown in visualization research to be inferior to bar charts for accurate value comparison.
- **Detection Criteria**: Any pie chart or donut chart in the deliverable, especially those with more than three segments.
- **Severity**: Minor
- **Example of Mistake**: A six-segment pie chart showing market share with segments of 28%, 24%, 19%, 15%, 9%, and 5%.
- **Correct Alternative**: A horizontal bar chart sorted by value, making relative differences immediately perceptible. Reserve pie charts only for showing a single proportion versus its complement (e.g., 73% vs. 27%).
- **Root Cause**: Pie charts are extremely common in training data despite being a known antipattern in data visualization best practice.

### AP-DECK-006: Decorative Visuals
- **Description**: Images, icons, or graphics are included for aesthetic reasons but do not encode data or support the slide's insight. They consume space without adding meaning.
- **Detection Criteria**: Removing the visual does not reduce the informational content of the slide. Stock photography of handshakes, lightbulbs, or diverse teams meeting in glass offices.
- **Severity**: Minor
- **Example of Mistake**: A stock photo of a person using a laptop placed next to bullet points about digital adoption metrics.
- **Correct Alternative**: A trend chart showing digital adoption rate over six quarters, directly supporting the slide's claim.
- **Root Cause**: AI associates "professional presentation" with imagery and attempts to match the expected visual density of consulting decks.

### AP-DECK-007: Missing Sources on Data
- **Description**: Quantitative claims, statistics, or external benchmarks are presented without source attribution, making the data unverifiable.
- **Detection Criteria**: Any numerical claim without a footnote, source line, or parenthetical citation. Phrases like "industry average" or "best-in-class" without a named source.
- **Severity**: Major
- **Example of Mistake**: "The global CX market will reach $32B by 2028" with no source, date, or methodology note.
- **Correct Alternative**: "The global CX market will reach $32B by 2028 (Forrester, CX Market Forecast, March 2026, based on 2024 baseline of $21B)."
- **Root Cause**: AI generates plausible statistics from parametric memory without distinguishing between recalled facts and fabricated figures.

### AP-DECK-008: MECE Violations
- **Description**: Categories in frameworks, segmentations, or analyses overlap (not mutually exclusive) or leave gaps (not collectively exhaustive). This undermines analytical rigor.
- **Detection Criteria**: Any two categories where a real-world example could plausibly fit in both, or where a known example fits in neither.
- **Severity**: Major
- **Example of Mistake**: Customer segments labeled "Digital Natives," "Mobile-First Users," and "Tech-Savvy Professionals" -- these categories overlap significantly.
- **Correct Alternative**: Segments defined by a single discriminating axis (e.g., primary channel preference) with explicit boundary rules and an "other" category to ensure exhaustiveness.
- **Root Cause**: AI generates categories by semantic similarity rather than by applying a consistent segmentation logic with clear exclusion rules.

### AP-DECK-009: "So What?" Failure
- **Description**: Data is presented without implication, interpretation, or recommended action. The audience is left to draw their own conclusions from raw information.
- **Detection Criteria**: Slides contain charts or data tables but no interpretive text explaining what the data means for the business or what action it implies.
- **Severity**: Critical
- **Example of Mistake**: A chart showing NPS declining from 42 to 31 over four quarters with no commentary, root cause hypothesis, or recommended response.
- **Correct Alternative**: The same chart with an annotation: "NPS decline correlates with post-purchase support wait times exceeding 8 minutes (r=0.84). Recommendation: invest in tier-1 support automation to restore sub-5-minute response within Q2."
- **Root Cause**: AI treats data presentation as the deliverable rather than understanding that insight and recommendation are the actual value.

### AP-DECK-010: Template-Driven Deck
- **Description**: The deck follows a rigid cookie-cutter structure regardless of the specific strategic question, audience, or context. Every engagement produces the same slide sequence.
- **Detection Criteria**: Deck structure is identical across different clients, industries, or problem types. Sections exist because the template includes them, not because the analysis requires them.
- **Severity**: Major
- **Example of Mistake**: A startup go-to-market deck that includes a 10-slide "organizational readiness assessment" section copied from an enterprise transformation template.
- **Correct Alternative**: Deck structure is derived from the strategic question. Sections are included only if they contribute to answering that question. The sequence reflects the specific argument being made.
- **Root Cause**: AI relies on structural patterns from training data and reproduces the most common deck architectures without adapting structure to content.
