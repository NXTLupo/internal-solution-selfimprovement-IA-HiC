---
id: anti-patterns/prd.md
title: "PRD Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, prd, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/prd.md#c0"
    char_span: [0, 2317]
    sentence_count: 11
    key_terms: [problem, features, strategic, business, alternative, description, need, user]
    concepts: [problem, features, strategic, business, alternative]
    section: "AP-PRD-001: Solution Masquerading as Problem / AP-PRD-002: Feature List Without Strategic Context"
    token_count: 439
  - id: "anti-patterns/prd.md#c1"
    char_span: [2363, 3389]
    sentence_count: 4
    key_terms: [criteria, acceptance, queries, results, language, search, fast, implementation]
    concepts: [criteria, acceptance, queries, results, language]
    section: "AP-PRD-003: Vacuous Acceptance Criteria"
    token_count: 201
  - id: "anti-patterns/prd.md#c2"
    char_span: [3436, 4443]
    sentence_count: 3
    key_terms: [search, scope, analytics, language, requires, natural, built, state]
    concepts: [search, scope, analytics, language, requires]
    section: "AP-PRD-004: Missing Out-of-Scope Section"
    token_count: 199
  - id: "anti-patterns/prd.md#c3"
    char_span: [4482, 5469]
    sentence_count: 6
    key_terms: [metrics, success, metric, self-service, resolution, trade-offs, guardrail, increase]
    concepts: [metrics, success, self-service, metric, resolution]
    section: "AP-PRD-005: No Guardrail Metrics"
    token_count: 205
  - id: "anti-patterns/prd.md#c4"
    char_span: [5521, 6323]
    sentence_count: 2
    key_terms: [current, without, months, target, nps, baseline, achieve, metrics]
    concepts: [current, without, months, target, baseline]
    section: "AP-PRD-006: Success Metrics Without Baselines"
    token_count: 184
  - id: "anti-patterns/prd.md#c5"
    char_span: [6378, 7320]
    sentence_count: 2
    key_terms: [implementation, stories, technical, user, search, perspective, developer, describe]
    concepts: [implementation, stories, technical, search, perspective]
    section: "AP-PRD-007: User Stories That Are Actually Tasks"
    token_count: 183
  - id: "anti-patterns/prd.md#c6"
    char_span: [7362, 8319]
    sentence_count: 3
    key_terms: [risks, risk, mitigation, payment, dependency, processor, adoption, severity]
    concepts: [risks, mitigation, payment, dependency, processor]
    section: "AP-PRD-008: Missing Risk Assessment"
    token_count: 181
  - id: "anti-patterns/prd.md#c7"
    char_span: [8353, 9479]
    sentence_count: 3
    key_terms: [requirements, prd, incorporating, specification, validated, document, learning, exactly]
    concepts: [requirements, incorporating, specification, validated, document]
    section: "AP-PRD-009: PRD-as-Contract"
    token_count: 215
  - id: "anti-patterns/prd.md#c8"
    char_span: [9522, 10629]
    sentence_count: 7
    key_terms: [stakeholder, alignment, disagreements, stakeholders, engineering, unresolved, approved, document]
    concepts: [stakeholder, alignment, disagreements, stakeholders, engineering]
    section: "AP-PRD-010: No Stakeholder Alignment"
    token_count: 218
---
# PRD Anti-Patterns

Known failure modes in product requirements document deliverables. Use as negative few-shot examples during generation to ensure PRDs are problem-anchored, measurable, and actionable.

---

### AP-PRD-001: Solution Masquerading as Problem
- **Description**: The problem statement describes a desired solution rather than the actual problem to be solved. This forecloses the solution space and prevents discovery of better alternatives.
- **Detection Criteria**: Problem statement contains implementation-specific language (e.g., "build a chatbot," "create a dashboard," "implement SSO") rather than describing the user need or business outcome.
- **Severity**: Critical
- **Example of Mistake**: "Problem: We need to build an AI-powered chatbot to handle customer inquiries."
- **Correct Alternative**: "Problem: 68% of Tier 1 support inquiries are repetitive questions with known answers, consuming 1,200 agent hours/month. Customers wait an average of 7 minutes for answers available in our knowledge base."
- **Root Cause**: AI generates solutions because they are concrete and satisfying to articulate. Staying at the problem level requires deliberate restraint and is less common in training data.

### AP-PRD-002: Feature List Without Strategic Context
- **Description**: The PRD is a shopping list of features with no explanation of the strategic rationale, business objectives, or theory of value creation connecting the features to outcomes.
- **Detection Criteria**: Features listed without a preceding section that explains what business problem they solve, what user need they address, or how success will be measured at the portfolio level.
- **Severity**: Critical
- **Example of Mistake**: "Features: 1. User profile page. 2. Search functionality. 3. Notification system. 4. Admin dashboard. 5. Reporting module."
- **Correct Alternative**: Strategic context establishes the product thesis: "Reducing onboarding time-to-value from 14 days to 3 days for mid-market customers will improve 90-day retention by 15-20% (validated in pilot cohort A). The following capabilities directly serve this objective..."
- **Root Cause**: AI excels at enumerating features from patterns in training data but struggles to synthesize the strategic narrative that gives features meaning and priority.

### AP-PRD-003: Vacuous Acceptance Criteria
- **Description**: Acceptance criteria are stated in vague terms that cannot be objectively verified. Any implementation could plausibly satisfy or fail the criteria depending on interpretation.
- **Detection Criteria**: Acceptance criteria containing words like "intuitive," "fast," "user-friendly," "seamless," or "robust" without quantitative thresholds or specific behavioral definitions.
- **Severity**: Critical
- **Example of Mistake**: "Acceptance Criteria: The search feature should be fast and return relevant results."
- **Correct Alternative**: "Acceptance Criteria: Search returns results in <500ms at p95 for queries up to 100 characters. First-page results include the user's target item in >85% of test cases across the validation query set (n=200 queries). Zero-result rate is <5% for queries matching existing catalog items."
- **Root Cause**: AI generates natural language descriptions of desired behavior rather than testable specifications because most PRD examples in training data use informal language.

### AP-PRD-004: Missing Out-of-Scope Section
- **Description**: The PRD defines what will be built but does not explicitly state what will NOT be built, leading to scope creep and misaligned expectations across stakeholders.
- **Detection Criteria**: No "Out of Scope" or "Non-Goals" section. No explicit documentation of features or capabilities that were considered and deliberately excluded.
- **Severity**: Major
- **Example of Mistake**: A PRD for a search feature that does not state whether faceted search, natural language queries, or search analytics are in or out of scope.
- **Correct Alternative**: "Out of Scope for v1: Natural language query parsing (planned for v2), search analytics dashboard (requires data pipeline work, tracked in separate initiative), personalized result ranking (blocked on recommendation engine, ETA Q3)."
- **Root Cause**: AI optimizes for describing what will exist rather than drawing boundaries around what will not. Exclusion requires knowledge of adjacent possibilities that AI may not proactively consider.

### AP-PRD-005: No Guardrail Metrics
- **Description**: Success metrics are defined but guardrail metrics (things that must NOT get worse) are absent. Optimizing one metric at the expense of others is a common failure mode.
- **Detection Criteria**: Only positive/target metrics defined. No counter-metrics, health metrics, or explicitly stated constraints on acceptable trade-offs.
- **Severity**: Major
- **Example of Mistake**: "Success metric: Increase self-service resolution rate from 40% to 65%." No guardrail preventing this from being achieved by making it impossible to reach a human agent.
- **Correct Alternative**: "Success metric: Self-service resolution rate 40% to 65%. Guardrails: CSAT must remain above 4.2 (currently 4.4). Human agent accessibility within 2 minutes must remain below current 3.5-minute average. Escalation-to-resolution time must not increase."
- **Root Cause**: AI generates the requested positive outcomes without modeling the system-level trade-offs that optimization pressure creates.

### AP-PRD-006: Success Metrics Without Baselines
- **Description**: Target metrics are specified without documenting the current baseline, making it impossible to assess whether the target is ambitious, realistic, or already achieved.
- **Detection Criteria**: Metrics state targets ("achieve 95% uptime") without current state ("currently at 91.2% uptime over the past 6 months").
- **Severity**: Major
- **Example of Mistake**: "Goal: Achieve NPS of 50." Without knowing the current NPS is 47 versus 12, the effort and feasibility cannot be assessed.
- **Correct Alternative**: "Goal: Improve NPS from 31 (baseline: Q4 2025 survey, n=2,400) to 45 within 12 months. Interim target: 38 at 6 months."
- **Root Cause**: AI generates aspirational targets from industry benchmarks without grounding them in the specific organization's current performance.

### AP-PRD-007: User Stories That Are Actually Tasks
- **Description**: Items labeled as "user stories" describe implementation tasks from the developer's perspective rather than user needs from the customer's perspective.
- **Detection Criteria**: Stories that begin with "As a developer" or describe technical implementation steps rather than user-observable outcomes. Stories with no clear "so that" benefit clause.
- **Severity**: Major
- **Example of Mistake**: "As a developer, I want to implement a REST API endpoint for user search so that the frontend can call it."
- **Correct Alternative**: "As a hiring manager, I want to search candidates by skill and experience level so that I can quickly build a shortlist without manually reviewing every profile. (Technical note: requires search API endpoint, see architecture spec.)"
- **Root Cause**: AI conflates the implementation task backlog with user story format, especially when prompted to generate "stories" for technical work items.

### AP-PRD-008: Missing Risk Assessment
- **Description**: The PRD does not identify risks to delivery, adoption, or value realization, and includes no mitigation strategies or contingency plans.
- **Detection Criteria**: No risk section. No mention of technical risks, market risks, adoption risks, dependency risks, or regulatory risks.
- **Severity**: Major
- **Example of Mistake**: A PRD for a payment system with no mention of PCI compliance risk, fraud risk, or integration dependency on a third-party payment processor.
- **Correct Alternative**: Risk register with severity and mitigation: "Risk: Payment processor API rate limits may throttle peak-hour transactions (likelihood: medium, impact: high). Mitigation: implement request queuing with priority lanes; negotiate elevated rate limits before launch."
- **Root Cause**: AI generates the positive vision of the product and does not proactively enumerate what could go wrong because risk identification requires adversarial thinking.

### AP-PRD-009: PRD-as-Contract
- **Description**: The PRD is treated as a rigid specification that must be implemented exactly as written, rather than a living document that evolves as the team learns. This creates waterfall dynamics in nominally agile teams.
- **Detection Criteria**: Language like "must implement exactly as specified," no versioning strategy, no learning milestones, and no mechanism for incorporating discovery insights during implementation.
- **Severity**: Minor
- **Example of Mistake**: A 40-page PRD with detailed specifications for every feature, presented as the complete and final specification with no provision for iteration.
- **Correct Alternative**: PRD structured in tiers: P0 requirements (firm, validated), P1 requirements (high confidence, subject to user testing), P2 requirements (hypotheses, will be validated during first sprint). Update cadence defined: "PRD reviewed bi-weekly; section owners responsible for incorporating sprint learnings."
- **Root Cause**: AI generates definitive documents and lacks the meta-awareness to build in its own uncertainty or the team's future learning into the document structure.

### AP-PRD-010: No Stakeholder Alignment
- **Description**: The PRD does not document which stakeholders have been consulted, which have approved, or where unresolved disagreements exist. Alignment is assumed rather than verified.
- **Detection Criteria**: No RACI or stakeholder section. No sign-off log. No documentation of open questions, unresolved debates, or known disagreements between stakeholders.
- **Severity**: Minor
- **Example of Mistake**: A PRD published to the team with no record of whether engineering leadership, design, legal, or customer success have reviewed and agreed to the scope and priorities.
- **Correct Alternative**: Stakeholder alignment section: "Approved by: VP Product (scope), Engineering Lead (feasibility), Legal (compliance review pending, ETA April 15). Open disagreement: Sales wants feature X in v1; Product recommends v2 based on usage data. Decision: escalated to CPO, deadline April 12."
- **Root Cause**: AI generates the document content but cannot simulate the organizational alignment process that makes PRDs actionable. Stakeholder management is a human-process concern that AI consistently omits.
