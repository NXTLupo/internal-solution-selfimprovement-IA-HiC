---
id: frameworks/prd.md
title: "Product Requirements Document Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [prd, cagan, svpg, amazon-prfaq, shape-up, product-management]
evidence_count: 0
chunks:
  - id: "frameworks/prd.md#c0"
    char_span: [0, 959]
    sentence_count: 7
    key_terms: [specification, requirements, empowered, framework, problem, product, amazon, cagan]
    concepts: [specification, requirements, empowered, framework, problem]
    related_chunks: ["frameworks/prd.md#c6"]
    section: Canonical Framework
    token_count: 184
  - id: "frameworks/prd.md#c1"
    char_span: [988, 3244]
    sentence_count: 16
    key_terms: [problem, user, section, story, criteria, stories, acceptance, statement]
    concepts: [problem, section, criteria, story, stories]
    section: Required Sections (16)
    token_count: 471
  - id: "frameworks/prd.md#c2"
    char_span: [3246, 5754]
    sentence_count: 13
    key_terms: [metrics, requirements, guardrail, personas, requirement, data, research, primary]
    concepts: [metrics, requirements, guardrail, personas, requirement]
    related_chunks: ["frameworks/prd.md#c7"]
    section: Required Sections (16)
    token_count: 506
  - id: "frameworks/prd.md#c3"
    char_span: [5756, 8386]
    sentence_count: 15
    key_terms: [data, requirements, section, delivery, risk, constraints, technical, feature]
    concepts: [requirements, section, delivery, constraints, technical]
    related_chunks: ["frameworks/prd.md#c7"]
    section: Required Sections (16)
    token_count: 514
  - id: "frameworks/prd.md#c4"
    char_span: [8388, 10173]
    sentence_count: 15
    key_terms: [scope, section, confidence, prd, questions, progressively, assumptions, development]
    concepts: [scope, confidence, section, questions, progressively]
    section: Required Sections (16)
    token_count: 378
  - id: "frameworks/prd.md#c5"
    char_span: [10204, 11418]
    sentence_count: 6
    key_terms: [rice, impact, reach, time, confidence, defined, product, require]
    concepts: [impact, confidence, reach, defined, product]
    section: Prioritization Framework
    token_count: 294
  - id: "frameworks/prd.md#c6"
    char_span: [11462, 13059]
    sentence_count: 13
    key_terms: [detection, requirements, fix, user, feature, problem, prd, statement]
    concepts: [detection, requirements, feature, problem, statement]
    related_chunks: ["frameworks/prd.md#c0"]
    section: Anti-Patterns (Generation Must Avoid)
    token_count: 322
  - id: "frameworks/prd.md#c7"
    char_span: [13079, 14218]
    sentence_count: 1
    key_terms: [metrics, section, completeness, requirements, priority, timeline, defined, review]
    concepts: [metrics, completeness, section, requirements, priority]
    related_chunks: ["frameworks/prd.md#c2", "frameworks/prd.md#c3"]
    section: Quality Gates
    token_count: 267
  - id: "frameworks/prd.md#c8"
    char_span: [14248, 16241]
    sentence_count: 12
    key_terms: [prd, write, data, release, define, anti-patterns, build, team]
    concepts: [write, anti-patterns, release, define, build]
    section: Generation Instructions
    token_count: 406
  - id: "frameworks/prd.md#c9"
    char_span: [16264, 16763]
    sentence_count: 1
    key_terms: [frameworks, anti-patterns, architecture, prds, framework, strategic, strategy, defines]
    concepts: [frameworks, anti-patterns, architecture, framework, strategic]
    section: Cross-References
    token_count: 101
---
# Product Requirements Document Framework Specification

## Canonical Framework

**Cagan/SVPG (Inspired/Empowered)** + **Amazon PR/FAQ** + **Basecamp Shape Up**

This specification governs the generation, review, and validation of all Product Requirements Documents. The Cagan/SVPG model provides the philosophical foundation: start with the problem, validate with customers, empower engineering teams to find solutions. The Amazon PR/FAQ discipline forces clarity of customer benefit before any work begins. Shape Up contributes the appetite concept -- fixed time, variable scope -- and the notion of shaping work at the right level of abstraction before handing it to teams.

A PRD generated under this framework is not a feature specification. It is a problem definition with enough context for an empowered team to discover and deliver a solution. The PRD defines the "what" and "why" with sufficient precision; the "how" belongs to the delivery team.

---

## Required Sections (16)

### Section 1: Problem Statement (Data-Backed)

State the problem in one to three paragraphs. The problem must be grounded in evidence: customer research data, support ticket analysis, behavioral analytics, competitive intelligence, or direct user quotes. Avoid stating the problem as the absence of a solution ("users don't have a dashboard" is a solution statement masquerading as a problem; "users cannot identify which of their 200+ accounts require immediate attention, resulting in an average 4.2-hour daily triage process" is a problem statement).

Include: Who has this problem? How many of them? How often? What is the cost of the problem persisting (in revenue, retention, operational cost, or customer effort)?

The Amazon PR/FAQ discipline applies here: write the press release first. If you cannot articulate a compelling customer benefit in press-release language, the problem is not yet understood well enough to proceed.

### Section 2: User Stories

Write user stories in the standard format: "As a [persona], I want [capability] so that [outcome]." Every story must reference a persona defined in Section 5. Stories must be INVEST-compliant: Independent, Negotiable, Valuable, Estimable, Small, Testable.

Group stories into epics where natural clustering exists. Each epic should represent a coherent user workflow, not an arbitrary grouping. Include story maps (Jeff Patton's User Story Mapping) showing the backbone of user activities and the walking skeleton of minimum functionality.

### Section 3: Acceptance Criteria (Given/When/Then)

Every user story must have at least one acceptance criterion in Gherkin syntax:
- **Given** [precondition/context]
- **When** [action/trigger]
- **Then** [expected outcome/observable result]

Acceptance criteria define the boundary between "done" and "not done." They must be specific enough for automated testing. Avoid criteria that require subjective judgment ("the page loads quickly") -- quantify instead ("the page reaches First Contentful Paint within 1.5 seconds on a 4G connection").

Include both happy-path and edge-case criteria. For each story, define at minimum: one happy path, one error/edge case, and one boundary condition.

### Section 4: Success Metrics (SMART + Guardrails)

Define primary success metrics using the SMART framework: Specific, Measurable, Achievable, Relevant, Time-bound. For each metric, specify: Metric Name, Current Baseline, Target Value, Measurement Method, Measurement Frequency, Target Date.

Critically, define **guardrail metrics** -- things that must NOT degrade as a result of pursuing the primary metrics. Example: if the primary metric is "increase conversion rate by 15%," a guardrail might be "customer support contact rate must not increase by more than 5%." This prevents local optimization that damages the broader experience.

Include a Driver/Guardrail/Learning taxonomy:
- **Driver metrics:** The metrics you are trying to move (1-3 maximum)
- **Guardrail metrics:** The metrics you are protecting (2-5)
- **Learning metrics:** The metrics you are observing to build understanding (unlimited)

### Section 5: Personas

Define each persona with: Name, Role/Title, Demographics (relevant ones only), Goals, Frustrations, Behavioral Patterns, Technology Proficiency, Quote (a representative statement from research). Personas must be grounded in research data, not invented from assumptions. Reference the source research for each persona.

For CX-specific PRDs, include both customer personas and internal user personas (agents, supervisors, analysts) since CX platforms typically serve both audiences simultaneously.

### Section 6: Functional Requirements (Outcomes, Not Implementations)

State requirements as outcomes the system must achieve, not as implementation instructions. Wrong: "Add a dropdown menu with filter options." Right: "Users must be able to narrow the display to items matching specific criteria; the system must support at least 5 concurrent filter dimensions with results updating within 500ms."

Organize requirements by capability area, not by UI screen. Each requirement must have: ID, Description, Priority (from the prioritization framework), Acceptance Criteria Reference, Dependency References.

### Section 7: Non-Functional Requirements

Address: Performance (response times, throughput), Scalability (user/data volume growth), Availability (uptime SLA), Security (authentication, authorization, data protection), Accessibility (WCAG 2.1 AA minimum), Internationalization, Browser/Device support matrix, Data retention and archival.

Each NFR must be quantified. "The system must be fast" is not a requirement. "API response time must be under 200ms at p95 under a load of 1,000 concurrent users" is a requirement.

### Section 8: Technical Constraints and Dependencies

List constraints that the delivery team must work within: existing technology stack requirements, integration mandates, vendor contracts, regulatory requirements, organizational standards. For each constraint, state: Constraint, Source (who/what imposes it), Flexibility (immutable/negotiable), Impact on Solution Space.

List dependencies on other teams, systems, or deliverables. For each dependency: Dependency, Owner, Expected Delivery Date, Confidence Level, Contingency if Delayed.

### Section 9: Wireframes and Mockups

Include visual representations at the appropriate fidelity level. For Shape Up-style work, these should be "fat marker sketches" -- enough to communicate the concept without dictating pixel-level design. Higher fidelity is appropriate when the interaction pattern is novel or the UI is the core value proposition.

Every wireframe must be annotated with: the user story it supports, the key interactions, and any constraints on the design (accessibility requirements, brand guidelines, technical limitations that affect layout).

### Section 10: Data Requirements and Privacy

Define: what data the feature collects, processes, stores, and shares. For each data element: Data Element, Classification (public/internal/confidential/restricted), Retention Period, Legal Basis for Processing (GDPR Article 6), Consent Requirement, Cross-Border Transfer Implications.

Include a Data Protection Impact Assessment (DPIA) summary if the feature processes personal data at scale or introduces new processing purposes. Address the right to erasure, data portability, and consent withdrawal mechanics.

### Section 11: Release Criteria

Define what must be true before the feature can be released to production. Structure as: Must-Have (blocking), Should-Have (expected), Nice-to-Have (if time permits). Include: testing coverage thresholds, performance benchmarks met, security review completed, documentation updated, monitoring and alerting configured, rollback procedure validated, stakeholder sign-off obtained.

### Section 12: Risk Assessment

Identify risks to successful delivery and adoption. For each risk: Risk Description, Category (technical/market/organizational/regulatory), Likelihood (1-5), Impact (1-5), Risk Score, Mitigation Strategy, Owner. Distinguish between delivery risks (can we build it?) and outcome risks (will it solve the problem?). The Cagan framework emphasizes four risk types: Value (will customers use it?), Usability (can they figure it out?), Feasibility (can we build it?), Viability (does it work for the business?).

### Section 13: Assumptions and Open Questions

List every assumption the PRD rests on. Each assumption must have: Statement, Confidence Level (high/medium/low), Validation Plan, Impact if Wrong. Open questions are items that need resolution before or during development. Each must have: Question, Owner, Target Resolution Date, Impact on Scope if Unresolved.

This section is a living document -- assumptions should be progressively validated and questions progressively answered throughout discovery and delivery.

### Section 14: Out of Scope / Non-Goals

Explicitly state what this PRD does NOT address. This is as important as the scope itself. For each exclusion: Item, Reason for Exclusion, Future Consideration (yes/no/maybe with timeframe). Non-goals prevent scope creep and set clear expectations. They also provide a record of conscious decisions to defer, which informs future planning.

### Section 15: Timeline

Apply the Shape Up appetite model: define the time budget (typically 2, 4, or 6 weeks) and shape the scope to fit within it. If the scope cannot fit within the appetite, reshape (reduce scope) rather than extend the timeline.

Include: Phase (Discovery/Alpha/Beta/GA), Duration, Key Milestones, Dependencies, Confidence Level. Longer-term items should have lower confidence and wider ranges. Never present a single-point estimate beyond a 4-week horizon without an explicit confidence interval.

### Section 16: Stakeholder Sign-Off

Define who must approve the PRD before development begins and what they are approving. Use a RACI or RAPID matrix: Responsible (writes the PRD), Accountable (final decision), Consulted (input required), Informed (kept updated). Include: Stakeholder Name/Role, Sign-Off Scope (full PRD / specific sections), Date, Status.

---

## Prioritization Framework

All features and requirements MUST be prioritized using one of the following methods:

### MoSCoW

- **Must Have:** The product is not viable without these. Non-negotiable for the defined appetite.
- **Should Have:** Important but the product is still viable without them. First candidates if scope must be reduced.
- **Could Have:** Desirable. Included only if time and resources permit after Must and Should are delivered.
- **Won't Have (this time):** Explicitly deferred. Documented for future consideration.

### RICE Scoring

For more granular prioritization, apply RICE:
- **Reach:** How many users/customers will this affect in a defined time period? (Number)
- **Impact:** How much will this move the success metric per user? (3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal)
- **Confidence:** How confident are you in the Reach and Impact estimates? (100% = high, 80% = medium, 50% = low)
- **Effort:** How many person-weeks will this require? (Number)

RICE Score = (Reach x Impact x Confidence) / Effort

Every requirement at the epic level must have either a MoSCoW classification or a RICE score. Individual user stories within a Must Have epic do not require separate RICE scoring.

---

## Anti-Patterns (Generation Must Avoid)

### Solution Masquerading as Problem
The problem statement describes the absence of a specific solution rather than the underlying user need. Detection: the problem statement contains the name of a feature or technology. Fix: ask "why?" three times to get to the actual problem.

### Feature Shopping List
The PRD reads as a list of features with no connecting narrative about user problems or outcomes. Detection: requirements are organized by UI component rather than user goal. Fix: restructure around user workflows and outcomes.

### Unmeasurable Success
Success metrics are vague ("improve user satisfaction") or absent. Detection: no baseline values, no target values, no measurement method. Fix: apply SMART framework rigorously; if you cannot measure it, you cannot ship it.

### Everything is P1
All requirements are marked as highest priority, rendering the prioritization meaningless. Detection: more than 40% of requirements are Must Have or P1. Fix: apply MoSCoW with a strict budget -- Must Haves should be 30-40% of total scope maximum.

### Ivory Tower PRD
Written without customer input, based entirely on stakeholder opinions or competitor copying. Detection: no research citations, no user quotes, no behavioral data. Fix: halt and conduct discovery research before proceeding.

### Infinite Scope / Missing Non-Goals
The PRD lacks an out-of-scope section, allowing unbounded interpretation of requirements. Detection: Section 14 is missing or contains fewer than 3 items. Fix: for every feature included, identify at least one related feature that is explicitly excluded.

---

## Quality Gates

A PRD must pass ALL of the following gates before development begins:

| Gate | Criterion | Validation Method |
|------|-----------|-------------------|
| QG-P1 | Problem statement cites at least 2 data sources | Source audit |
| QG-P2 | All user stories have acceptance criteria in Given/When/Then | Story-criteria mapping |
| QG-P3 | Success metrics have baselines and targets | Metrics table completeness |
| QG-P4 | Guardrail metrics defined alongside driver metrics | Metrics taxonomy review |
| QG-P5 | All requirements prioritized (MoSCoW or RICE) | Priority field completeness |
| QG-P6 | Must Haves represent no more than 40% of total scope | Priority distribution check |
| QG-P7 | Personas grounded in cited research | Persona source audit |
| QG-P8 | Out of scope section contains minimum 3 items | Section 14 count |
| QG-P9 | Data privacy requirements addressed | Section 10 completeness |
| QG-P10 | Stakeholder sign-off matrix defined | Section 16 presence |
| QG-P11 | No anti-patterns detected | Anti-pattern checklist scan |
| QG-P12 | Timeline uses confidence intervals for items beyond 4 weeks | Timeline review |

---

## Generation Instructions

When generating a PRD:

1. **Start with the press release.** Write the Amazon-style press release (2-3 paragraphs) describing the customer benefit as if the product is already launched. If this is difficult to write, the problem is not yet well understood.
2. **Ground every claim in data.** Do not state a problem exists without evidence. If evidence is unavailable, explicitly note the assumption and define a validation plan.
3. **Write for the delivery team.** The primary audience is the engineering and design team that will build the solution. Write with enough context that they can make good decisions independently, without enough prescription that they lose autonomy.
4. **Apply Shape Up shaping.** Define the appetite first, then shape the scope to fit. A well-shaped PRD has clear boundaries (you know what to build and what NOT to build), a solved core concept (the main interaction pattern is defined), and open details (room for the team to make implementation choices).
5. **Prioritize ruthlessly.** If everything is important, nothing is. Apply MoSCoW or RICE to every requirement. Be willing to move items to Won't Have.
6. **Define success before building.** Success metrics, guardrail metrics, and release criteria must all be defined before development begins, not retrofitted after launch.
7. **Address privacy by design.** Data requirements and privacy considerations are not optional sections. Every feature that touches user data must have a complete data classification and processing basis.
8. **Validate against anti-patterns.** Before finalizing, explicitly check for each listed anti-pattern. A PRD that passes quality gates but exhibits anti-patterns is still deficient.
9. **Maintain as a living document.** The PRD is not a contract carved in stone. Assumptions should be updated as they are validated or invalidated. Open questions should be resolved and their answers incorporated. The PRD evolves through discovery, delivery, and post-launch learning.

---

## Cross-References

- [[anti-patterns/prd]] -- Common PRD anti-patterns with detection heuristics and remediation
- [[frameworks/personas]] -- Persona development framework with research methodology
- [[frameworks/roadmap]] -- Strategic roadmap framework that provides the portfolio context for individual PRDs
- [[frameworks/strategy]] -- CX strategy that defines the strategic pillars PRDs must align to
- [[frameworks/architecture]] -- Technology architecture that defines the technical constraints PRDs must respect
