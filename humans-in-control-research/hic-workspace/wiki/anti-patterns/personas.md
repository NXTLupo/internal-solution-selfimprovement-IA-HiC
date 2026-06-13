---
id: anti-patterns/personas.md
title: "Personas Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, personas, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/personas.md#c0"
    char_span: [0, 2620]
    sentence_count: 7
    key_terms: [persona, personas, behavioral, alternative, description, detection, criteria, severity]
    section: "AP-PERSONA-001: Demographics-First Thinking / AP-PERSONA-002: Elastic Persona / AP-PERSONA-003: Too Many Personas"
    token_count: 493
  - id: "anti-patterns/personas.md#c1"
    char_span: [2679, 3473]
    sentence_count: 1
    key_terms: [points, pain, confidence, usability, citing, source, users, plausible-sounding]
    section: "AP-PERSONA-004: Generic Pain Points Without Evidence"
    token_count: 158
  - id: "anti-patterns/personas.md#c2"
    char_span: [3520, 4257]
    sentence_count: 4
    key_terms: [persona, statements, functional, emotional, design, social, job, decision-making]
    section: "AP-PERSONA-005: Missing JTBD Integration"
    token_count: 143
  - id: "anti-patterns/personas.md#c3"
    char_span: [4302, 4951]
    sentence_count: 1
    key_terms: [narrative, persona, representative, quotes, scenario, day-in-the-life, storytelling, alternative]
    section: "AP-PERSONA-006: No Scenarios or Quotes"
    token_count: 121
  - id: "anti-patterns/personas.md#c4"
    char_span: [4994, 5834]
    sentence_count: 3
    key_terms: [features, workarounds, new, behaviors, patterns, positive, release, david]
    section: "AP-PERSONA-007: Aspirational Persona"
    token_count: 153
  - id: "anti-patterns/personas.md#c5"
    char_span: [5877, 6615]
    sentence_count: 1
    key_terms: [anti-persona, deliverable, user, deprioritized, documentation, deliberately, exclusionary, incompatible]
    section: "AP-PERSONA-008: Missing Anti-Persona"
    token_count: 144
  - id: "anti-patterns/personas.md#c6"
    char_span: [6673, 7403]
    sentence_count: 1
    key_terms: [demographic, personas, differentiated, professional, representing, segmentation, suspiciously, alternative]
    section: "AP-PERSONA-009: All Personas Same Age and Education"
    token_count: 129
  - id: "anti-patterns/personas.md#c7"
    char_span: [7459, 8373]
    sentence_count: 1
    key_terms: [confidence, validated, attributes, analytics, attribute, inferred, persona, primary]
    section: "AP-PERSONA-010: No Research Confidence Indicators"
    token_count: 174
---
# Personas Anti-Patterns

Known failure modes in persona deliverables. Use as negative few-shot examples during generation to steer output away from common traps.

---

### AP-PERSONA-001: Demographics-First Thinking
- **Description**: Persona leads with age, income, and education rather than behaviors, motivations, and jobs-to-be-done. The result reads like a census form instead of a behavioral archetype.
- **Detection Criteria**: First three attributes listed are demographic fields; behavioral drivers appear below the fold or are absent entirely.
- **Severity**: Critical
- **Example of Mistake**: "Sarah, 34, Female, MBA, household income $120K, lives in suburban Denver."
- **Correct Alternative**: "Sarah is a time-starved decision-maker who batches errands into single sessions and abandons any process requiring more than two clicks of effort. She is 34, holds an MBA, and lives in suburban Denver."
- **Root Cause**: Training data over-represents marketing demographic templates. AI defaults to structured tabular fields before synthesizing behavioral insight.

### AP-PERSONA-002: Elastic Persona
- **Description**: A single persona is stretched to represent such a broad population that it loses predictive power. If the persona describes everyone, it describes no one.
- **Detection Criteria**: Persona contains contradictory behaviors (e.g., "prefers self-service AND wants white-glove support") or age ranges spanning 20+ years.
- **Severity**: Critical
- **Example of Mistake**: "Tech-Savvy Professional, ages 22-55, who values both cutting-edge innovation and proven reliability."
- **Correct Alternative**: Split into two distinct personas with clear behavioral boundaries and documented overlap zones.
- **Root Cause**: AI attempts to maximize coverage and avoid excluding segments, producing a persona that hedges across all possible user types.

### AP-PERSONA-003: Too Many Personas
- **Description**: Deliverable contains more than five primary personas, diluting strategic focus and making prioritization impossible.
- **Detection Criteria**: More than five persona cards in a single deliverable without explicit tiering (primary vs. secondary vs. anti-persona).
- **Severity**: Major
- **Example of Mistake**: Eight fully detailed personas each given equal weight, with no guidance on which to design for first.
- **Correct Alternative**: Three to four primary personas, one to two secondary, and one explicit anti-persona. Each tier has documented prioritization rationale.
- **Root Cause**: AI generates exhaustively to appear thorough, lacking the editorial judgment to cut and prioritize.

### AP-PERSONA-004: Generic Pain Points Without Evidence
- **Description**: Pain points are stated as universal truths with no research backing, source attribution, or confidence level.
- **Detection Criteria**: Pain points use phrases like "users often feel" or "customers typically struggle with" without citing interviews, surveys, or behavioral data.
- **Severity**: Major
- **Example of Mistake**: "Users are frustrated by long wait times and want faster service."
- **Correct Alternative**: "In 12 of 18 usability sessions (67%), participants abandoned the queue after 45 seconds, citing uncertainty about estimated wait time as the primary trigger (Source: Q3 usability study, n=18, confidence: moderate)."
- **Root Cause**: AI synthesizes plausible-sounding pain points from general knowledge rather than grounding claims in specific evidence.

### AP-PERSONA-005: Missing JTBD Integration
- **Description**: Persona describes who the user IS but not what they are trying to ACCOMPLISH. Jobs-to-be-done framework is absent, leaving the persona without actionable design direction.
- **Detection Criteria**: No "When I... I want to... So that..." statements or equivalent functional/emotional/social job framing.
- **Severity**: Major
- **Example of Mistake**: A detailed persona profile with demographics, psychographics, and brand affinities but zero job statements.
- **Correct Alternative**: Each persona includes two to four primary JTBD statements covering functional, emotional, and social dimensions.
- **Root Cause**: AI treats personas as static profiles rather than decision-making tools connected to design outcomes.

### AP-PERSONA-006: No Scenarios or Quotes
- **Description**: Persona lacks narrative scenarios and representative quotes, making it impossible to empathize with or use in design workshops.
- **Detection Criteria**: Persona is purely structured data with no narrative text, day-in-the-life scenario, or verbatim (or synthesized) quotes.
- **Severity**: Minor
- **Example of Mistake**: A bulleted attribute list with no storytelling elements.
- **Correct Alternative**: Each persona includes at least one scenario paragraph and two to three representative quotes that capture voice and frustration in first person.
- **Root Cause**: AI optimizes for information density over narrative utility.

### AP-PERSONA-007: Aspirational Persona
- **Description**: The persona describes who the organization WISHES users were rather than who they actually are. Behaviors reflect ideal adoption patterns, not observed reality.
- **Detection Criteria**: All behaviors are positive ("eagerly adopts new features," "proactively provides feedback"), with no friction, workarounds, or resistance documented.
- **Severity**: Critical
- **Example of Mistake**: "David enthusiastically reads every release note and immediately tries new features on launch day."
- **Correct Alternative**: "David ignores release notes and discovers new features only when his existing workflow breaks. He resents forced updates and searches for workarounds before adopting changes."
- **Root Cause**: AI tends toward positive framing and avoids generating negative behavioral patterns unless explicitly prompted.

### AP-PERSONA-008: Missing Anti-Persona
- **Description**: Deliverable does not define who the product is NOT for, leading to scope creep and diluted value proposition.
- **Detection Criteria**: No explicit anti-persona or "not our user" section in the deliverable.
- **Severity**: Major
- **Example of Mistake**: Five personas covering different segments but no documentation of which user types should be deliberately excluded or deprioritized.
- **Correct Alternative**: Include at least one anti-persona with clear rationale for exclusion (e.g., "Enterprise procurement officers are not our target; their buying process is incompatible with our self-serve model").
- **Root Cause**: AI avoids exclusionary statements by default, interpreting inclusivity as a quality signal.

### AP-PERSONA-009: All Personas Same Age and Education
- **Description**: Despite representing different behavioral segments, all personas share suspiciously similar demographic profiles, suggesting copy-paste generation rather than genuine segmentation.
- **Detection Criteria**: Three or more personas within a five-year age range and identical education level.
- **Severity**: Minor
- **Example of Mistake**: Four personas all aged 28-33, all with bachelor's degrees, differentiated only by job title.
- **Correct Alternative**: Demographic variation that reflects actual user base composition, informed by analytics or research data.
- **Root Cause**: AI anchors on a "default professional" archetype and varies surface details without adjusting underlying demographic assumptions.

### AP-PERSONA-010: No Research Confidence Indicators
- **Description**: Persona attributes are presented with uniform certainty regardless of whether they are grounded in primary research, inferred from analytics, or speculated.
- **Detection Criteria**: No confidence tags (high/medium/low), no source attribution, and no indication of which attributes are validated versus hypothesized.
- **Severity**: Major
- **Example of Mistake**: Every persona attribute stated as fact with no distinction between "validated in 30 interviews" and "assumed based on industry norms."
- **Correct Alternative**: Each key attribute tagged with confidence level and source: "Primary channel preference: mobile (high confidence, validated in analytics, n=12,400)" versus "Brand perception: neutral (low confidence, inferred from two interview mentions)."
- **Root Cause**: AI presents all generated content with equal authority, lacking mechanisms to self-assess evidential strength.
