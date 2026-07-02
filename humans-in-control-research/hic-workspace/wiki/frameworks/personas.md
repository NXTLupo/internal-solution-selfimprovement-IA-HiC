---
id: frameworks/personas.md
title: "Personas Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [personas, cooper, jtbd, nngroup, user-research]
evidence_count: 0
chunks:
  - id: "frameworks/personas.md#c0"
    char_span: [0, 358]
    sentence_count: 3
    key_terms: [persona, anti-patterns, authoritative, specification, deliverable, methodology, generating, canonical]
    concepts: [persona]
    section: Purpose
    token_count: 59
  - id: "frameworks/personas.md#c1"
    char_span: [384, 2671]
    sentence_count: 12
    key_terms: [persona, goals, demographics, design, behavioral, different, framework, personas]
    concepts: [persona, demographics, goals, behavioral, design]
    related_chunks: ["frameworks/personas.md#c8"]
    section: Canonical Framework
    token_count: 481
  - id: "frameworks/personas.md#c2"
    char_span: [2673, 3255]
    sentence_count: 1
    key_terms: [research, assumption-based, qualitative, interviews, data, characteristics, longitudinal, speculation]
    concepts: [research, assumption-based, qualitative, interviews]
    section: Canonical Framework
    token_count: 138
  - id: "frameworks/personas.md#c3"
    char_span: [3295, 5650]
    sentence_count: 10
    key_terms: [section, specific, tagline, goal, demographics, goals, jtbd, experience]
    concepts: [section, specific, tagline, demographics, experience]
    section: Required Sections (14 Components)
    token_count: 492
  - id: "frameworks/personas.md#c4"
    char_span: [5652, 8091]
    sentence_count: 11
    key_terms: [section, context, constructed, quotes, patterns, include, journey, points]
    concepts: [section, constructed, context, quotes, patterns]
    section: Required Sections (14 Components)
    token_count: 489
  - id: "frameworks/personas.md#c5"
    char_span: [8093, 9932]
    sentence_count: 5
    key_terms: [section, preferences, decision, include, persona, alternatives, brand, competitive]
    concepts: [section, preferences, decision, include, persona]
    section: Required Sections (14 Components)
    token_count: 349
  - id: "frameworks/personas.md#c6"
    char_span: [9952, 11545]
    sentence_count: 4
    key_terms: [anti-persona, product, persona, primary, archetype, personas, failure, rewrite]
    concepts: [anti-persona, product, persona, primary, archetype]
    section: Quality Gates
    token_count: 317
  - id: "frameworks/personas.md#c7"
    char_span: [11565, 12491]
    sentence_count: 3
    key_terms: [observation, comparison, recommendation, depth, implication, example, users, differentiating]
    concepts: [observation, comparison, recommendation, implication, depth]
    section: Depth Scoring
    token_count: 188
  - id: "frameworks/personas.md#c8"
    char_span: [12511, 13977]
    sentence_count: 15
    key_terms: [personas, persona, research, overwhelmed, behavioral, segments, knowing, support]
    concepts: [personas, persona, research, overwhelmed, behavioral]
    related_chunks: ["frameworks/personas.md#c1", "frameworks/personas.md#c9", "frameworks/personas.md#c10"]
    section: Anti-Patterns
    token_count: 309
  - id: "frameworks/personas.md#c9"
    char_span: [14007, 15598]
    sentence_count: 6
    key_terms: [research, personas, data, observation-implication-recommendation, section, anti-persona, insufficient, confidence]
    concepts: [research, personas, section, anti-persona, insufficient]
    related_chunks: ["frameworks/personas.md#c8"]
    section: Generation Instructions
    token_count: 323
  - id: "frameworks/personas.md#c10"
    char_span: [15621, 16162]
    sentence_count: 1
    key_terms: [persona, frameworks, identity, personas, brand, industry-specific, conversational, persona-driven]
    concepts: [persona, frameworks, identity, personas, brand]
    related_chunks: ["frameworks/personas.md#c8"]
    section: Cross-References
    token_count: 109
---
# Personas Framework Specification

## Purpose

This page is the authoritative reference the AI reads before generating any persona deliverable. It codifies the canonical methodology, required sections, quality gates, and anti-patterns that govern persona creation. Every generated persona must comply with these standards or be flagged for human review.

---

## Canonical Framework

### Cooper's Goal-Directed Design (1999)

Alan Cooper's "The Inmates Are Running the Asylum" (1999) and its refinement in "About Face" (2003, 2014) established goal-directed personas as a design methodology, not a marketing exercise. The core principles:

1. **Behavior over demographics.** Personas are defined by behavioral patterns observed in research, not by age/income/location segments. Two users with identical demographics who exhibit different behaviors belong to different personas. Two users with radically different demographics who share behavioral patterns belong to the same persona.

2. **Goals as organizing principle.** Cooper defines three tiers of goals that structure every persona:
   - **Life goals** -- Aspirational, identity-level motivations (e.g., "live a fulfilling life," "be respected in my field"). Rarely more than one per persona. These explain *why* the person engages with the domain at all.
   - **Experience goals** -- How the person wants to *feel* while interacting (e.g., "feel confident I am making the right choice," "not feel stupid"). These drive tone, pacing, and UX emotion design.
   - **Functional goals** -- Task-level outcomes (e.g., "compare three plans side by side," "complete enrollment in under 10 minutes"). These drive feature priorities and information architecture.

3. **Precision over inclusivity.** A persona that tries to represent everyone represents no one. The power of a persona is its specificity -- it forces design decisions by making tradeoffs visible.

### Jobs to Be Done (Christensen/Ulwick)

Clayton Christensen's "Competing Against Luck" (2016) and Tony Ulwick's Outcome-Driven Innovation framework complement Cooper by shifting focus from *who* the user is to *what progress they are trying to make*. The JTBD statement format is mandatory for every persona:

> "When [situation/trigger], I want to [motivation/action], so I can [expected outcome/progress]."

This format forces three things: contextual specificity (when), behavioral intent (want), and measurable outcome (so I can). A persona without a JTBD statement is incomplete.

### Nielsen Norman Group 5-Level Persona Quality Framework

NNGroup's research on persona effectiveness identifies five maturity levels. This framework targets **Level 4+**:

| Level | Name | Characteristics | Acceptable? |
|-------|------|-----------------|-------------|
| 1 | Assumption-based | No research, pure speculation | No |
| 2 | Qualitative light | 3-5 interviews, thin data | No |
| 3 | Qualitative solid | 8-15 interviews, pattern analysis | Minimum |
| 4 | Mixed methods | Qual + quant, validated segments | Target |
| 5 | Longitudinal | Ongoing research, living personas | Ideal |

When research data is unavailable, every assumption-based element must be flagged with "HYPOTHESIS -- requires validation via [specific research method]."

---

## Required Sections (14 Components)

Every persona generated by the system must include all 14 sections. Omitting a section requires an explicit justification in the output metadata.

### Section 1: Identity and Demographics with Tagline

A concise identity block including name, age, occupation, location, household composition, and income range. The tagline is a single sentence (8-15 words) that captures the persona's defining behavioral tension -- not a job title restatement.

**Good tagline:** "Wants premium quality but resents every minute spent researching it."
**Bad tagline:** "A 34-year-old marketing manager in Chicago."

Demographics serve only as context anchors -- they help stakeholders visualize a real person. They must never be the differentiating axis.

### Section 2: Psychographics

Values, attitudes, beliefs, and personality traits that influence decision-making. Use established frameworks where applicable (e.g., Schwartz value dimensions, Big Five trait indicators). Include:

- Core values (2-3, ranked by influence on relevant behavior)
- Attitudes toward the product/service category
- Risk tolerance profile
- Information processing style (systematic vs. heuristic)
- Trust formation patterns (authority-driven, peer-driven, evidence-driven)

### Section 3: Goals -- Hierarchical per Cooper

Three tiers, explicitly labeled:

- **Life goal** (1): The deep aspiration this domain activity connects to
- **Experience goals** (2-3): How they want to feel during the interaction
- **Functional goals** (3-5): Concrete tasks and outcomes they need to accomplish

Each goal must be specific enough to generate a testable design hypothesis. "Have a good experience" is not a goal. "Feel confident I chose the right plan without needing to call support" is a goal.

### Section 4: JTBD Statement

Exactly one primary JTBD and optionally 1-2 secondary JTBD statements, following the canonical format:

> "When [specific situation/trigger], I want to [specific motivation/action], so I can [measurable outcome]."

The situation must be concrete (not "when I need insurance" but "when my employer switches benefits providers during open enrollment and I have 14 days to decide"). The outcome must describe progress the person is trying to make.

### Section 5: Pain Points -- Specific and Contextualized

Minimum 4, maximum 8 pain points. Each must follow the structure:

- **What happens** (observable behavior or system failure)
- **When it happens** (specific trigger or context)
- **Why it matters** (consequence for the persona's goals)
- **Current workaround** (how they cope today -- reveals design opportunities)

Generic pain points like "the process is confusing" fail the specificity test. "The plan comparison page shows 47 features in a flat list with no way to filter by what matters to me, so I default to choosing the cheapest option and hope for the best" passes.

### Section 6: Behaviors and Habits

Observable patterns of action, not inferred traits. Include:

- Information-seeking behavior (where, when, how often)
- Decision-making cadence (impulsive vs. deliberate, solo vs. collaborative)
- Channel preferences and switching patterns
- Frequency and recency of relevant interactions
- Habitual sequences (e.g., "always checks reviews before price")

### Section 7: Technology Usage

Technology proficiency, device preferences, platform ecosystems, and digital comfort level. Avoid binary "tech-savvy / not tech-savvy" labels. Instead, describe specific capabilities and limitations:

- Primary device(s) and OS
- App ecosystem (which apps they actually use daily vs. have installed)
- Digital literacy indicators (can they complete a multi-step online form without assistance?)
- Accessibility requirements
- Connectivity context (always-on, intermittent, data-conscious)

### Section 8: Journey Context

Where this persona typically enters the journey, which stages they spend the most time in, where they drop off, and which touchpoints matter most. This section bridges personas to journey maps. Include:

- Primary entry point(s) into the experience
- Critical decision moments
- Most common abandonment points
- Touchpoints with highest emotional intensity
- Cross-channel transition points

### Section 9: Representative Quotes (1-3)

Verbatim or constructed quotes that capture the persona's voice, frustrations, and aspirations. Quotes must sound like a real person speaking, not a requirements document. If quotes are constructed (not from research), mark them as "CONSTRUCTED -- reflects behavioral patterns, not direct research data."

### Section 10: Day-in-the-Life Scenario

A 150-300 word narrative describing a typical day that includes the relevant interaction context. This scenario grounds the persona in reality and helps stakeholders build empathy. It must include:

- Time-of-day context (when does the relevant activity happen?)
- Competing priorities (what else is demanding attention?)
- Environmental factors (where are they physically? what interruptions occur?)
- Emotional state leading into the interaction

### Section 11: Brand/Solution Relationships

Current relationship with the client's brand and competitive alternatives. Include:

- Awareness level (unaware, aware, considering, using, advocating)
- Competitive set (which alternatives has this persona used or considered?)
- Switching triggers (what would cause them to leave or arrive?)
- Loyalty drivers (functional, emotional, or inertial?)
- Brand perception in their own words

### Section 12: Communication Preferences

How this persona prefers to receive information and be contacted. Include channel preferences (email, SMS, phone, chat, in-app), frequency tolerance, tone expectations, and opt-out triggers. Distinguish between preferences for transactional vs. marketing vs. support communications.

### Section 13: Decision-Making Process

The cognitive and social process this persona follows when making relevant decisions. Include:

- Solo vs. collaborative (who influences the decision?)
- Information sufficiency threshold (how much research before deciding?)
- Decision criteria hierarchy (which factors are weighted highest?)
- Time horizon (how long from trigger to decision?)
- Regret avoidance patterns (what post-decision validation do they seek?)

### Section 14: Research Confidence Metadata

Transparency layer documenting the evidence basis for each section:

- Data source(s) per section (interview, survey, analytics, assumption)
- Sample size where applicable
- Recency of data
- Confidence level per section (high / medium / low / hypothesis)
- Recommended validation methods for low-confidence sections

---

## Quality Gates

The following quality gates must be satisfied before a persona is considered complete. Any failure triggers a revision cycle.

| Gate | Requirement | Failure Consequence |
|------|-------------|---------------------|
| Behavioral differentiation | Personas within a set are differentiated by behavior, not demographics | Merge or restructure |
| Set size | 3-5 personas per project/product scope | Justify exceptions |
| Primary designation | Exactly one persona marked as primary | Designate before delivery |
| Anti-persona | At least one negative/anti-persona included showing who the product is NOT for | Add anti-persona |
| Assumption flagging | All content without research backing marked "HYPOTHESIS" | Flag or remove |
| JTBD completeness | Every persona has at least one fully-formed JTBD statement | Revise |
| Goal hierarchy | All three Cooper goal tiers present and non-trivial | Revise |
| Quote authenticity | Quotes sound like a human speaking, not a spec document | Rewrite |
| Specificity test | Pain points and behaviors are specific enough to generate design decisions | Rewrite |

### Anti-Persona Requirements

The anti-persona defines a user archetype that the product or service intentionally does NOT serve. This is not a villain -- it is a legitimate user type whose needs conflict with the primary persona's needs or the business strategy. Include:

- Why this archetype is excluded (strategic, economic, or capability reasons)
- What would happen if the product tried to serve them (dilution of value proposition)
- How to identify and gracefully redirect them

---

## Depth Scoring

Every insight in the persona must achieve the following three-layer depth:

1. **Observation** -- What was seen or measured (the data point)
2. **Implication** -- What it means for the design/strategy (the "so what")
3. **Recommendation** -- What to do about it (the actionable response)

**Example of insufficient depth:**
> "Users find the comparison tool confusing." (Observation only)

**Example of sufficient depth:**
> "Users spend an average of 4.2 minutes on the comparison page before abandoning (Observation). This suggests the information density exceeds their processing capacity during a stressful enrollment period, and the lack of progressive disclosure forces cognitive overload at the worst moment (Implication). Redesign the comparison experience as a guided wizard that surfaces 3-5 differentiating features based on the user's stated priorities, with full detail available on demand (Recommendation)."

---

## Anti-Patterns

The following failure modes must be actively avoided:

### 1. Demographic-First Personas
Building personas around demographic segments (e.g., "Millennial Mike") rather than behavioral patterns. This produces marketing segments, not design tools.

### 2. Elastic Personas
Personas so broadly defined that any design decision can be justified as "meeting the persona's needs." If a persona cannot reject a feature, it is useless.

### 3. Persona Proliferation
Creating more than 5-7 personas, fragmenting focus and preventing prioritization. If a team cannot remember all personas by name, there are too many.

### 4. Aspiration Laundering
Attributing idealized behaviors to personas that research does not support. Personas describe how people *actually behave*, not how we wish they would behave.

### 5. The Empathy Mirage
Personas with rich emotional detail but no behavioral specificity. Knowing that a persona "feels overwhelmed" is useless without knowing what they *do* when overwhelmed (call support? abandon? ask a friend? Google it?).

### 6. Static Personas
Treating personas as permanent artifacts rather than living documents that evolve with new research. Include a "last validated" date and scheduled review cadence.

### 7. Consensus Personas
Personas built by committee to satisfy all stakeholders, resulting in bland, non-committal descriptions that drive no decisions. The primary persona must be designated by the research lead, not voted on.

---

## Generation Instructions

When the AI generates personas using this framework:

1. **Begin with behavioral patterns.** If research data is available, cluster behaviors before creating identity details. If no research data exists, state this explicitly and flag all content as hypothesis-level.

2. **Apply the 14-section template exhaustively.** Do not skip sections. If a section cannot be completed due to insufficient data, include the section header with a note: "INSUFFICIENT DATA -- requires [specific research method] to complete."

3. **Write in third person present tense.** "Sarah researches plans on her phone during her commute" not "Sarah would research plans."

4. **Use the depth scoring model.** Every pain point, behavior, and goal must reach the observation-implication-recommendation level. Surface-level descriptions are rejected.

5. **Generate the anti-persona.** After completing the primary set, explicitly create one anti-persona that defines the boundary of the product's intended audience.

6. **Populate research confidence metadata honestly.** Do not inflate confidence. If the persona is generated from secondary research or assumptions, say so.

7. **Test against quality gates before delivery.** Run every gate check. If any gate fails, revise before presenting output.

8. **Cross-reference related frameworks.** When generating personas, check:
   - [[anti-patterns/personas]] for known failure modes in the specific industry
   - [[benchmarks/cx-metrics]] for quantitative targets that personas should be designed to move
   - [[brand/identity]] for tone and naming conventions

---

## Cross-References

- [[anti-patterns/personas]] -- Industry-specific persona failure modes and remediation
- [[benchmarks/cx-metrics]] -- Quantitative targets (NPS, CSAT, CES) that persona-driven design should influence
- [[brand/identity]] -- Brand voice, naming conventions, and visual identity standards for persona documents
- [[frameworks/blueprint]] -- Service blueprints consume personas to define the customer actions lane
- [[frameworks/script]] -- Conversational AI scripts must be calibrated to persona communication preferences and technology usage
