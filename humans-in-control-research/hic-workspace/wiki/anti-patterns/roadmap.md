---
title: "Roadmap Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, roadmap, quality-gates]
evidence_count: 0
---

# Roadmap Anti-Patterns

Known failure modes in roadmap deliverables. Use as negative few-shot examples during generation to ensure roadmaps communicate strategy, uncertainty, and trade-offs rather than just timelines.

---

### AP-ROADMAP-001: Feature Factory
- **Description**: The roadmap is a backlog of features listed in delivery order with no connection to strategic objectives, customer outcomes, or business metrics. Features are the unit of planning rather than problems or outcomes.
- **Detection Criteria**: Every roadmap item is a feature name (e.g., "Build dashboard," "Add SSO," "Create API"). No items framed as problems to solve, outcomes to achieve, or hypotheses to validate.
- **Severity**: Critical
- **Example of Mistake**: "Q1: Notification system. Q2: Admin dashboard. Q3: Reporting module. Q4: Mobile app."
- **Correct Alternative**: "Q1: Reduce onboarding drop-off from 40% to 20% (notification system is one candidate solution). Q2: Enable self-serve account management to reduce support tickets by 30%. Q3: Deliver data visibility that supports quarterly business reviews without manual report generation."
- **Root Cause**: AI generates concrete deliverables because they are easier to enumerate than abstract outcomes. Feature-level roadmaps dominate training data.

### AP-ROADMAP-002: Date Theater
- **Description**: Every roadmap item has a specific delivery date expressed with false confidence, regardless of how far in the future it is or how uncertain the scope remains.
- **Detection Criteria**: Items 6+ months out have specific week or month delivery dates. No confidence indicators, no ranges, no explicit uncertainty markers.
- **Severity**: Critical
- **Example of Mistake**: "September 15: Launch AI-powered recommendation engine. October 3: Complete data migration. November 22: Go live with new pricing model."
- **Correct Alternative**: "Now (high confidence): Notification infrastructure. Next (medium confidence, Q2 window): Self-serve account management. Later (low confidence, H2 exploration): AI-powered recommendations -- scope TBD pending Q1 user research results."
- **Root Cause**: AI generates dates because roadmap templates in training data include them. AI cannot assess delivery uncertainty and defaults to specific dates to appear precise.

### AP-ROADMAP-003: Never Updated
- **Description**: The roadmap is created once and not maintained, becoming a historical artifact rather than a living strategic document. No versioning, no review cadence, no update history.
- **Detection Criteria**: No "last updated" date, no version history, no defined review cadence, and no process for incorporating new information.
- **Severity**: Major
- **Example of Mistake**: A roadmap created in January that is still being referenced in July with no updates despite three pivots, two staffing changes, and a major customer loss.
- **Correct Alternative**: Roadmap header includes: "Version: 3.2. Last updated: 2026-04-08. Review cadence: bi-weekly with product leadership. Next review: 2026-04-22. Change log: v3.2 reprioritized mobile initiative based on Q1 usage data."
- **Root Cause**: AI generates point-in-time documents without building in the maintenance processes that keep them useful. This is a process design failure rather than a content generation failure.

### AP-ROADMAP-004: No Capacity for Unexpected Work
- **Description**: The roadmap allocates 100% of team capacity to planned initiatives, leaving zero buffer for bugs, incidents, technical emergencies, or strategic opportunities that arise mid-cycle.
- **Detection Criteria**: Every sprint or quarter is fully allocated. No "buffer" or "unplanned" allocation. No capacity reserved for support, maintenance, or discovery work.
- **Severity**: Major
- **Example of Mistake**: Q2 roadmap shows three major initiatives consuming 100% of engineering capacity with no slack for the inevitable production incidents.
- **Correct Alternative**: "Q2 capacity allocation: 70% planned initiatives, 15% technical debt and maintenance, 15% unplanned buffer (historically, unplanned work has consumed 12-18% of capacity per quarter)."
- **Root Cause**: AI optimizes for a clean narrative where all capacity is deployed toward strategic goals, not reflecting the messy operational reality of software teams.

### AP-ROADMAP-005: Missing Technical Debt Allocation
- **Description**: The roadmap shows only new feature work with no allocation for technical debt reduction, infrastructure improvements, or developer experience investments.
- **Detection Criteria**: No roadmap items categorized as technical debt, platform improvements, or infrastructure. All items are user-facing feature work.
- **Severity**: Major
- **Example of Mistake**: A 12-month roadmap with 16 feature initiatives and zero infrastructure, performance, or debt-reduction items.
- **Correct Alternative**: Explicit technical debt items with business justification: "Q2: Database migration from MySQL to PostgreSQL (reduces query latency for search from 800ms to <200ms, unblocks three feature initiatives in Q3, estimated 3 person-weeks)."
- **Root Cause**: AI generates stakeholder-facing roadmap items and treats infrastructure work as invisible plumbing rather than strategic investment worthy of roadmap real estate.

### AP-ROADMAP-006: Items as Features Not Problems
- **Description**: Roadmap items describe what will be built rather than what problem will be solved, closing the solution space prematurely and preventing the team from discovering better approaches during implementation.
- **Detection Criteria**: Every item is a noun or verb-noun pair describing an artifact ("Build X," "Launch Y," "Implement Z"). No items framed as questions, hypotheses, or outcome targets.
- **Severity**: Major
- **Example of Mistake**: "Q3: Build recommendation engine."
- **Correct Alternative**: "Q3: Increase basket size by 15% through personalized product discovery (recommendation engine is leading hypothesis; A/B test against curated collections and search improvement)."
- **Root Cause**: Identical to Feature Factory -- AI defaults to concrete artifacts because they are less ambiguous to generate than outcome-framed items.

### AP-ROADMAP-007: No Confidence Levels on Future Items
- **Description**: All roadmap items are presented with equal certainty regardless of whether they are committed, planned, or speculative. This misleads stakeholders about what they can depend on.
- **Detection Criteria**: No confidence tags, no Now/Next/Later tiering, no probability estimates. Items 9 months out appear with the same visual weight as items starting next week.
- **Severity**: Major
- **Example of Mistake**: A Gantt chart showing 12 months of initiatives all rendered in the same solid color with specific start and end dates.
- **Correct Alternative**: Three-tier system: "Committed (green, funded, staffed, scoped): items 0-6 weeks. Planned (amber, budgeted, tentatively scoped): items 6 weeks-3 months. Exploratory (gray, unfunded, hypothesis-stage): items 3+ months."
- **Root Cause**: AI generates uniform formatting for all items and does not differentiate visual or textual confidence signals based on temporal distance or planning maturity.

### AP-ROADMAP-008: Missing Dependencies
- **Description**: The roadmap does not identify dependencies between initiatives or external dependencies on other teams, vendors, or platform capabilities, making the sequence appear arbitrary.
- **Detection Criteria**: No dependency arrows, no prerequisite annotations, no "blocked by" indicators. Items could be rearranged in any order without apparent impact.
- **Severity**: Major
- **Example of Mistake**: "Q2: Payment redesign. Q3: Subscription management." No indication that subscription management is entirely dependent on the payment redesign completing first.
- **Correct Alternative**: Explicit dependency mapping: "Subscription management (Q3) is blocked by: (1) Payment redesign completion (Q2, critical path), (2) Billing API v2 from finance team (external, ETA June 15, status: on track). If payment redesign slips >2 weeks, subscription management moves to Q4."
- **Root Cause**: AI generates items as independent units and does not model the dependency graph that constrains execution order.

### AP-ROADMAP-009: Single Audience View
- **Description**: The roadmap is a single artifact serving all audiences, forcing executives to wade through implementation details and engineers to parse strategic abstractions. Different audiences need different views.
- **Detection Criteria**: One roadmap document with no audience indicators, no executive summary layer, and no technical detail layer. Or a roadmap so detailed that it takes 20 minutes to parse the strategic direction.
- **Severity**: Minor
- **Example of Mistake**: A single roadmap that mixes "Migrate to Kubernetes" and "Increase market share in APAC by 10%" at the same level of detail.
- **Correct Alternative**: Multi-layer roadmap: Executive view (3-5 strategic themes with outcome targets), Product view (initiatives mapped to themes with quarterly timing), Engineering view (epics and technical enablers with sprint-level detail and dependency chains).
- **Root Cause**: AI generates a single coherent document and does not naturally produce the multi-resolution views that different stakeholders require.

### AP-ROADMAP-010: No Success Metrics per Initiative
- **Description**: Roadmap items lack defined success criteria, making it impossible to evaluate whether completed initiatives achieved their intended impact.
- **Detection Criteria**: Items have delivery dates but no success metrics, no hypothesis statements, and no post-launch evaluation criteria.
- **Severity**: Major
- **Example of Mistake**: "Q2: Launch new onboarding flow." Ships on time. No one evaluates whether it actually improved onboarding completion rates.
- **Correct Alternative**: "Q2: Launch new onboarding flow. Success criteria: onboarding completion rate increases from 58% to 75% within 60 days of launch. Evaluation: A/B test first 30 days, full rollout if completion rate exceeds 68%. If below 60%, pause and investigate."
- **Root Cause**: AI treats delivery as the success event rather than impact realization, reflecting the common organizational pattern of celebrating launches over measuring outcomes.
