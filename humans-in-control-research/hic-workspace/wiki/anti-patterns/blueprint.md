---
title: "Blueprint Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, blueprint, quality-gates]
evidence_count: 0
---

# Blueprint Anti-Patterns

Known failure modes in service blueprint deliverables. Use as negative few-shot examples during generation to ensure blueprints expose the operational reality behind the customer experience.

---

### AP-BLUEPRINT-001: Missing Backstage
- **Description**: The blueprint shows only frontstage customer interactions and ignores everything below the line of visibility. The real operational complexity, cost drivers, and failure risks live backstage, and omitting them renders the blueprint decorative.
- **Detection Criteria**: No rows or swim lanes for backstage actions, support processes, or internal systems. The blueprint is effectively a journey map relabeled as a blueprint.
- **Severity**: Critical
- **Example of Mistake**: A blueprint showing "Customer places order" connected to "Order confirmed" with no backstage representation of inventory check, payment processing, fraud screening, or warehouse routing.
- **Correct Alternative**: Full backstage layer showing each internal process triggered by frontstage actions: payment gateway call, inventory reservation, fraud score evaluation, and warehouse assignment with system names and SLAs.
- **Root Cause**: AI defaults to the customer's perspective because training data contains far more journey maps than service blueprints. Generating backstage requires domain knowledge of operations that AI must infer.

### AP-BLUEPRINT-002: No Fail Points Identified
- **Description**: The blueprint depicts a frictionless process with no identified failure points, bottlenecks, or risk indicators. Every real service has failure modes; omitting them makes the blueprint useless for improvement planning.
- **Detection Criteria**: No fail point markers (typically lightning bolts or warning indicators), no error state branches, and no recovery flows documented.
- **Severity**: Critical
- **Example of Mistake**: A 15-step service blueprint where every step flows smoothly to the next with no documented failure scenarios.
- **Correct Alternative**: Fail points marked at each high-risk step (e.g., "Payment gateway timeout: 2.3% failure rate, triggers retry then manual review") with associated recovery processes.
- **Root Cause**: AI generates idealized happy-path processes and treats failure documentation as optional commentary rather than core blueprint content.

### AP-BLUEPRINT-003: All Emotions Positive
- **Description**: The emotional journey layer shows only positive or neutral emotions at every stage. No real service experience is uniformly positive; this signals the blueprint was generated without genuine research input.
- **Detection Criteria**: Emotion indicators are "satisfied," "delighted," or "confident" across all stages with no negative or mixed emotions documented.
- **Severity**: Major
- **Example of Mistake**: Emotional state during a warranty claim process labeled as "Hopeful" at filing, "Pleased" at review, and "Delighted" at resolution.
- **Correct Alternative**: "Frustrated and anxious" at filing (product broke), "Uncertain" during review (no status visibility), "Relieved but still annoyed" at resolution (took 11 days when promised 5).
- **Root Cause**: AI defaults to positive framing to appear optimistic, and avoids generating negative emotional states unless the prompt explicitly requests realistic emotional mapping.

### AP-BLUEPRINT-004: Static Rather Than Dynamic
- **Description**: The blueprint captures a single fixed process with no representation of how the service varies based on customer segment, channel, exception type, or load conditions.
- **Detection Criteria**: No conditional branches, no segment-specific paths, no peak-vs-normal load variations documented.
- **Severity**: Major
- **Example of Mistake**: A single linear returns process that does not differentiate between in-store return, mail return, and curbside return despite each having different backstage operations.
- **Correct Alternative**: Conditional branches at the channel selection point with distinct backstage processes for each return method, annotated with volume percentages and processing time differences.
- **Root Cause**: AI generates the modal (most common) path and treats variations as edge cases rather than as first-class blueprint content.

### AP-BLUEPRINT-005: Missing Technology and Systems Layer
- **Description**: The blueprint shows human actions and processes but does not document the technology systems, APIs, databases, or platforms that enable each step.
- **Detection Criteria**: No technology row, no system names, no integration points documented. Backstage actions reference human roles but not the tools they use.
- **Severity**: Major
- **Example of Mistake**: Backstage row says "Agent processes refund" without specifying that this involves Salesforce Service Cloud, Stripe refund API, and the internal reconciliation database.
- **Correct Alternative**: Technology layer showing specific systems at each step: "Salesforce Service Cloud (case management) -> Stripe API (refund initiation) -> NetSuite (financial reconciliation)."
- **Root Cause**: AI lacks knowledge of specific client technology stacks and generates generic process descriptions rather than system-specific operational documentation.

### AP-BLUEPRINT-006: No Personas Mapped to Stages
- **Description**: The blueprint describes a generic "customer" without connecting specific persona types to the stages where their experience diverges.
- **Detection Criteria**: Single unlabeled "customer" swim lane with no persona indicators or segment-specific annotations.
- **Severity**: Minor
- **Example of Mistake**: One customer row labeled "User" for an onboarding blueprint that serves both self-serve SMBs and enterprise accounts with fundamentally different processes.
- **Correct Alternative**: Persona indicators at divergence points: "At this stage, Enterprise Persona routes to dedicated CSM onboarding while SMB Persona enters automated guided setup."
- **Root Cause**: AI treats the customer as a monolithic actor and does not cross-reference persona deliverables when generating blueprints.

### AP-BLUEPRINT-007: Too Abstract
- **Description**: Blueprint stages contain fewer than five actions each, resulting in a high-level overview that provides no operational detail for implementation.
- **Detection Criteria**: Any stage with fewer than five combined frontstage and backstage actions. Total blueprint has fewer than 25 discrete actions.
- **Severity**: Major
- **Example of Mistake**: An entire "Purchase" stage represented by three actions: "Select product," "Enter payment," "Receive confirmation."
- **Correct Alternative**: Purchase stage expanded to include: browse catalog, compare options, add to cart, select shipping method, enter shipping address, select payment method, enter payment details, review order summary, confirm purchase, receive order confirmation email, trigger inventory reservation, initiate payment authorization.
- **Root Cause**: AI generates at summary level by default and requires explicit prompting to drill into operational detail.

### AP-BLUEPRINT-008: Too Granular
- **Description**: Blueprint contains more than 15 actions per stage, mixing micro-interactions and system-level events in a way that obscures the service flow rather than clarifying it.
- **Detection Criteria**: Any stage with more than 15 actions, or actions at inconsistent levels of abstraction (e.g., "Click submit button" alongside "Evaluate credit risk").
- **Severity**: Minor
- **Example of Mistake**: A login stage with 18 actions including "Move cursor to username field," "Type username," "Move cursor to password field," "Type password," "Click show password icon."
- **Correct Alternative**: Appropriate level of abstraction for the audience. Operational blueprints: 8-12 actions per stage. Strategic blueprints: 5-7 actions per stage. Micro-interaction detail belongs in separate wireflow documentation.
- **Root Cause**: AI cannot gauge the appropriate level of abstraction without explicit audience context and sometimes over-generates to appear thorough.

### AP-BLUEPRINT-009: No Metrics Layer
- **Description**: Blueprint documents the process but includes no performance metrics, SLAs, or measurement points, making it impossible to assess service quality or identify improvement targets.
- **Detection Criteria**: No KPIs, no time measurements, no cost indicators, and no quality metrics attached to any stage or action.
- **Severity**: Major
- **Example of Mistake**: A support escalation blueprint with no documented resolution time targets, cost per escalation, or customer satisfaction measurement points.
- **Correct Alternative**: Each stage annotated with relevant metrics: "Tier 1 triage: target <2 min, current avg 4.7 min, cost $3.20/interaction. CSAT measurement point after resolution."
- **Root Cause**: AI treats the process flow as the complete deliverable and does not proactively layer performance data without explicit instructions.

### AP-BLUEPRINT-010: Created Without Cross-Functional Input
- **Description**: The blueprint reflects a single department's perspective (usually marketing or product) rather than incorporating operations, IT, finance, and frontline staff viewpoints.
- **Detection Criteria**: Backstage processes reference only one department. No evidence of multiple stakeholder perspectives in the documentation notes or review comments.
- **Severity**: Major
- **Example of Mistake**: A returns blueprint written entirely from the customer service perspective with no representation of warehouse operations, finance reconciliation, or quality assurance inspection processes.
- **Correct Alternative**: Blueprint developed with documented input from at least three functional areas, with each backstage swim lane owned by a named department and validated by that department's representative.
- **Root Cause**: AI generates from a single viewpoint by default and cannot simulate genuine cross-functional collaboration without explicit multi-perspective prompting.

### AP-BLUEPRINT-011: Missing Wait Times and Handoffs
- **Description**: The blueprint shows actions as a continuous flow without documenting the wait times between steps or the handoff points where responsibility transfers between teams, systems, or channels.
- **Detection Criteria**: No time annotations between actions, no handoff indicators, and no queue or wait state representations.
- **Severity**: Critical
- **Example of Mistake**: "Customer submits claim" directly connected to "Claim reviewed" with no representation of the 3-5 business day wait, email notification, or internal routing queue.
- **Correct Alternative**: Explicit wait states with time ranges: "Customer submits claim -> [Wait: 3-5 business days, email confirmation sent at submission, no status updates during wait] -> Claims team reviews." Handoff points marked with responsible party on each side.
- **Root Cause**: AI generates action sequences without modeling the temporal dimension of service delivery, where wait times are often the primary source of customer dissatisfaction.
