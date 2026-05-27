---
title: "Deck Structure Anti-Patterns"
type: anti-pattern
created: 2026-05-19
updated: 2026-05-19
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md, .claude/CLAUDE.md, Minto Pyramid Principle, Rumelt Good Strategy / Bad Strategy]
confidence: high
status: active
tags: [anti-patterns, deck, narrative-structure, slide-flow, quality-gates]
evidence_count: 0
---

# Deck Structure Anti-Patterns

Known failure modes in strategy-deck composition — the narrative arc, slide ordering, and section-to-section logic. These are distinct from per-slide anti-patterns (those live in `deck.md`); this page covers the architecture of the deck as a whole.

---

### AP-DECKSTRUCTURE-001: Buried Recommendation
- **Description**: The deck's central recommendation appears for the first time on slide 28 of a 35-slide deck, after 27 slides of context, methodology, and findings. The Minto Principle is inverted: answer last, evidence first.
- **Detection Criteria**: First slide that contains the actual recommendation text is past the 70% mark of the deck. Or: the executive summary slide does not state the recommendation in a single sentence.
- **Severity**: Critical
- **Example of Mistake**: Slides 1-27 walk through landscape, themes, personas, and journey. Slide 28 finally states "we recommend a co-op program redesign focused on three pillars."
- **Correct Alternative**: Lead with the recommendation on slide 3 (after cover + agenda). Use the rest of the deck to defend it. A partner reading only slides 1, 3, and the executive summary must understand the entire argument.
- **Root Cause**: AI defaults to a chronological narrative (research → findings → conclusion) rather than the consulting-deck convention (conclusion → supporting structure → evidence).

### AP-DECKSTRUCTURE-002: No SCQA Skeleton
- **Description**: Deck lacks the Situation → Complication → Resolution arc. Sections read as a flat list of findings with no narrative tension. The reader cannot tell why anything matters.
- **Detection Criteria**: No "Complication" or equivalent section that names what's at stake. Or: the deck moves from "Here's the market" to "Here's our recommendation" with no intervening "Why the status quo fails" beat.
- **Severity**: Critical
- **Example of Mistake**: Section 1 "The Landscape", Section 2 "Our Personas", Section 3 "Our Recommendations" — no section names the problem to be solved.
- **Correct Alternative**: Mandatory sections in order — Situation (10-15% of deck), Complication (15-20%), Resolution (60-70%). Even a 12-slide deck needs at least one slide explicitly framing the complication.
- **Root Cause**: AI optimizes for completeness (cover all the topics) over persuasion (build narrative tension).

### AP-DECKSTRUCTURE-003: Topic-Label Section Headers
- **Description**: Section divider slides use generic labels — "Key Findings", "Recommendations", "The Path Forward", "Our Approach" — instead of action titles that state the section's argument.
- **Detection Criteria**: Any section-header slide whose title matches a banned pattern: `^(Key|The|Our)\s+\w+$`, or one of {Introduction, Conclusion, Summary, Recommendations, Next Steps, The Path Forward, The Way Forward, Our Approach, Methodology}.
- **Severity**: Major
- **Example of Mistake**: Section divider reads "Recommendations". The reader does not know what's being recommended until they advance.
- **Correct Alternative**: "Three coordinated actions can recover 22% of attrition without raising tuition" — a complete sentence stating the section's claim. The reader knows the argument before reading the supporting slides.
- **Root Cause**: Section headers are treated as labels for navigation rather than load-bearing argument carriers. Same Partner Test as content slides applies.

### AP-DECKSTRUCTURE-004: Evidence Severed From Claim
- **Description**: Recommendations on slide N; the evidence supporting them lives on slides N+12 through N+15 in a "data backup" section. Reader cannot evaluate the recommendation without flipping pages.
- **Detection Criteria**: Recommendation slides cite zero specific data points inline. Or: an "Appendix" or "Supporting Data" section contains the only quantitative evidence.
- **Severity**: Critical
- **Example of Mistake**: Slide 14 recommends "Expand co-op partnerships to mid-market employers." No statistic, no source, no named partner case study on the slide. Slide 31 (appendix) contains the participation-rate data that would support this.
- **Correct Alternative**: Each recommendation slide carries its own minimum-viable evidence — at least one statistic and one named source — on the same slide. Appendix exists for depth, not for the load-bearing data.
- **Root Cause**: AI separates "the recommendation" from "the evidence" as content categories. They must be co-located per slide.

### AP-DECKSTRUCTURE-005: Repetitive Layout Monotony
- **Description**: 80% of slides use the same template (e.g., title + 3-column grid + footer). The visual rhythm flattens; the reader's attention disengages by the third such slide.
- **Detection Criteria**: Any single slide template exceeds 60% of the deck's slide count. Or: zero use of `block-quote`, `stat-row`, `case-study`, or `section-divider` templates.
- **Severity**: Major
- **Example of Mistake**: A 24-slide deck uses `recommendation` template for 19 of 24 slides.
- **Correct Alternative**: Mix at least 6 distinct templates across any deck of 15+ slides. Quotes break monotony; stat-row slides act as section punctuation; section dividers reset attention.
- **Root Cause**: The slide generator picks the highest-confidence template for each content unit. Without a diversity check on template distribution, the dominant template wins everywhere.

### AP-DECKSTRUCTURE-006: No Decision Moment
- **Description**: Deck ends with a "Thank you" slide or a "Next Steps" list. There is no slide that asks the reader to commit to something specific.
- **Detection Criteria**: Last 3 slides contain no verb framed as a request ("approve", "fund", "endorse", "commit", "decide"). Or: the final non-title slide is a process slide ("Here's the implementation timeline") rather than a decision slide.
- **Severity**: Major
- **Example of Mistake**: Deck closes with slide 23 "Roadmap", slide 24 "Thank you / Questions". The reader leaves with no action to take.
- **Correct Alternative**: Penultimate slide states the decision being requested: "We recommend approval of the three-phase rollout, a $4.2M FY26 budget, and Q1 sponsorship by the Provost's office." This is the slide a Partner uses to close the meeting.
- **Root Cause**: AI defaults to "presentation" mode (here is information) rather than "deal" mode (here is the ask).

### AP-DECKSTRUCTURE-007: Tail-Loaded Quantification
- **Description**: All numbers, percentages, and dollar figures cluster in the final 30% of the deck. The first two-thirds reads as qualitative, narrative prose — strong on framing, weak on stakes.
- **Detection Criteria**: Count of `\d+%` and `\$[\d,.]+` patterns in slides 1 - N/3 is less than 25% of the deck's total quantification.
- **Severity**: Major
- **Example of Mistake**: Slides 1-15 contain three numbers total ("a number of students", "many institutions", "considerable cost"). Slides 16-22 contain 38 specific statistics.
- **Correct Alternative**: Quantify the stakes early. The Complication section should carry the punch — "first-year attrition costs the institution $9B annually" by slide 4-5, not slide 17.
- **Root Cause**: AI buries hard numbers as "supporting detail" rather than treating them as the load-bearing claims.

---

## Learned Anti-Patterns (auto-grown)

Auto-appended by `appendLearnedAntiPattern` when the constraint engine detects 5+ user-correction patterns at this stage. New entries are added below by the runtime; do not delete the marker line.

<!-- LEARNED_AP_MARKER -->

### AP-LEARNED: User consistently addeds "Updated Slide 12: layout"
- **Detection**: 5 edits, 5+ occurrences
- **Description**: "Updated Slide 12: layout" needs attention: 5 user edits detected (avg delta: 24 chars).
- **Source**: Learned from user edit patterns
- **Added**: 2026-04-15
