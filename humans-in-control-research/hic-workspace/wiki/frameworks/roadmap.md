---
id: frameworks/roadmap.md
title: "Strategic Roadmap Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [roadmap, now-next-later, bastow, outcome-based, gist]
evidence_count: 0
chunks:
  - id: "frameworks/roadmap.md#c0"
    char_span: [0, 951]
    sentence_count: 7
    key_terms: [roadmap, strategic, now-next-later, outcome-based, specification, provides, feature, purpose]
    concepts: [roadmap, strategic, now-next-later, outcome-based, specification]
    related_chunks: ["frameworks/roadmap.md#c8"]
    section: Canonical Framework
    token_count: 177
  - id: "frameworks/roadmap.md#c1"
    char_span: [982, 3295]
    sentence_count: 11
    key_terms: [theme, initiative, strategic, themes, problem, initiatives, confidence, dimension]
    concepts: [theme, initiative, strategic, themes, initiatives]
    related_chunks: ["frameworks/roadmap.md#c2", "frameworks/roadmap.md#c3", "frameworks/roadmap.md#c8"]
    section: Required Dimensions (14)
    token_count: 493
  - id: "frameworks/roadmap.md#c2"
    char_span: [3297, 5976]
    sentence_count: 13
    key_terms: [initiative, strategic, dependency, metric, dependencies, dimension, capacity, allocation]
    concepts: [initiative, strategic, dependency, dependencies, metric]
    related_chunks: ["frameworks/roadmap.md#c1", "frameworks/roadmap.md#c3", "frameworks/roadmap.md#c8"]
    section: Required Dimensions (14)
    token_count: 505
  - id: "frameworks/roadmap.md#c3"
    char_span: [5978, 8422]
    sentence_count: 11
    key_terms: [initiatives, confidence, dimension, strategic, problem, risk, initiative, low]
    concepts: [initiatives, confidence, dimension, strategic, initiative]
    related_chunks: ["frameworks/roadmap.md#c1", "frameworks/roadmap.md#c2", "frameworks/roadmap.md#c7", "frameworks/roadmap.md#c8"]
    section: Required Dimensions (14)
    token_count: 483
  - id: "frameworks/roadmap.md#c4"
    char_span: [8424, 10664]
    sentence_count: 8
    key_terms: [debt, customer, allocation, technical, initiatives, impact, investment, validation]
    concepts: [customer, allocation, technical, initiatives, investment]
    related_chunks: ["frameworks/roadmap.md#c5"]
    section: Required Dimensions (14)
    token_count: 417
  - id: "frameworks/roadmap.md#c5"
    char_span: [10666, 11503]
    sentence_count: 11
    key_terms: [view, detail, customer, initiative-level, horizon, time, allocation, investment]
    concepts: [detail, initiative-level, customer, horizon, allocation]
    related_chunks: ["frameworks/roadmap.md#c4"]
    section: Required Dimensions (14)
    token_count: 150
  - id: "frameworks/roadmap.md#c6"
    char_span: [11547, 13712]
    sentence_count: 20
    key_terms: [roadmap, detection, fix, items, precision, presented, date, project]
    concepts: [roadmap, detection, precision, presented, items]
    section: Anti-Patterns (Generation Must Avoid)
    token_count: 423
  - id: "frameworks/roadmap.md#c7"
    char_span: [13732, 14930]
    sentence_count: 1
    key_terms: [confidence, initiative, review, completeness, allocation, capacity, gradient, detail]
    concepts: [confidence, initiative, completeness, review, allocation]
    related_chunks: ["frameworks/roadmap.md#c3"]
    section: Quality Gates
    token_count: 269
  - id: "frameworks/roadmap.md#c8"
    char_span: [14960, 17425]
    sentence_count: 19
    key_terms: [roadmap, strategic, initiatives, dependencies, decompose, features, problem, change]
    concepts: [roadmap, strategic, initiatives, dependencies, decompose]
    related_chunks: ["frameworks/roadmap.md#c0", "frameworks/roadmap.md#c1", "frameworks/roadmap.md#c2", "frameworks/roadmap.md#c3"]
    section: Generation Instructions
    token_count: 489
  - id: "frameworks/roadmap.md#c9"
    char_span: [17448, 17920]
    sentence_count: 1
    key_terms: [frameworks, initiative, roadmap, anti-patterns, benchmarks, framework, strategy, prd]
    concepts: [frameworks, initiative, anti-patterns, roadmap, benchmarks]
    section: Cross-References
    token_count: 98
---
# Strategic Roadmap Framework Specification

## Canonical Framework

**NOW-NEXT-LATER (Janna Bastow / ProdPad)** + **Outcome-Based Roadmaps (Josh Seiden)** + **GIST Planning (Itamar Gilad)**

This specification governs the generation, review, and validation of all strategic roadmap deliverables. The NOW-NEXT-LATER model provides the temporal structure with decreasing certainty. Outcome-based roadmapping (Seiden) ensures the roadmap communicates intended business and customer outcomes rather than feature lists. GIST (Goals, Ideas, Steps, Tasks) provides the decomposition hierarchy that connects strategic goals to executable work.

A roadmap is a communication tool, not a project plan. Its purpose is to align stakeholders around strategic direction, facilitate resource allocation conversations, and create shared understanding of priorities. The moment a roadmap becomes a Gantt chart of feature delivery dates, it has failed its purpose.

---

## Required Dimensions (14)

### Dimension 1: Strategic Themes (3-5, OKR-Aligned)

Define 3 to 5 strategic themes that organize the roadmap. Themes represent areas of strategic investment, not product areas or team names. Each theme must directly align to at least one organizational OKR (Objective and Key Result).

Format per theme:
- **Theme Name:** Concise, outcome-oriented (e.g., "Reduce Customer Effort" not "Build Self-Service Portal")
- **Strategic Rationale:** Why this theme matters now, grounded in data
- **Aligned OKR(s):** The organizational objectives this theme supports
- **Investment Level:** Relative allocation (percentage of total capacity)
- **Theme Owner:** Accountable executive or product leader

Themes should be MECE (Mutually Exclusive, Collectively Exhaustive) across the portfolio scope. Overlapping themes create ambiguity in initiative placement and resource allocation.

### Dimension 2: Initiatives Framed as Problems (Not Features)

Every initiative on the roadmap must be stated as a problem to solve or an outcome to achieve, not a feature to build. This is the single most important principle in this framework.

Wrong: "Build mobile app redesign"
Right: "Reduce mobile task abandonment rate from 34% to under 15%"

Wrong: "Implement AI chatbot"
Right: "Enable customers to resolve 60% of common inquiries without human assistance"

For each initiative, document:
- **Problem Statement:** What problem does this solve, for whom, and why now?
- **Target Outcome:** What measurable change will success produce?
- **Current Baseline:** What is the current state of the target metric?
- **Strategic Theme:** Which theme does this initiative belong to?
- **Appetite:** How much time/resources are you willing to invest? (Shape Up concept)
- **Confidence Level:** How confident are you that this initiative will achieve its outcome?

### Dimension 3: Time Horizons (NOW / NEXT / LATER)

**NOW (Current Quarter):** High confidence, well-defined, actively in progress or about to start. Initiatives here have PRDs, assigned teams, and clear acceptance criteria. Detail level is high.

**NEXT (Next 1-2 Quarters):** Medium confidence, shaped but not fully specified. Initiatives here have problem statements and target outcomes but solution approaches are still being explored. Discovery work may be in progress.

**LATER (3+ Quarters):** Low confidence, strategic bets and directional indicators. Initiatives here represent strategic hypotheses that may change significantly based on what is learned from NOW and NEXT work. Minimal detail is appropriate and expected.

The critical principle: **confidence decreases as time horizon extends.** Presenting LATER items with the same level of detail and certainty as NOW items is a cardinal roadmap anti-pattern. Visual presentation must make the confidence gradient immediately apparent.

### Dimension 4: Dependencies

Map cross-initiative, cross-team, and cross-system dependencies. For each dependency:
- **Source Initiative:** The initiative that has the dependency
- **Dependency:** What is needed
- **Provider:** Who/what provides it
- **Type:** Blocking (cannot start without it) / Enabling (can start but cannot complete) / Enhancing (adds value but not required)
- **Expected Resolution:** When the dependency will be resolved
- **Contingency:** What happens if the dependency is not met on time

Visualize dependency chains. Identify the critical path through dependencies. Flag circular dependencies as immediate risks requiring resolution.

### Dimension 5: Resource Requirements

For each initiative, provide a resource profile at the appropriate granularity for the time horizon:
- **NOW:** Specific team assignments, named individuals for critical roles, capacity allocation percentages
- **NEXT:** Team-level allocation, skill requirements, hiring or contracting needs
- **LATER:** Order-of-magnitude effort estimates, capability gaps that require strategic investment

Include a portfolio-level resource allocation view showing total demand versus available capacity across time horizons. Over-allocation (demand exceeding 85% of capacity) must be flagged as a risk.

### Dimension 6: Success Metrics per Initiative

Every initiative must have at least one measurable success metric. Apply the GIST framework: the initiative's success metric should trace directly to a Goal (OKR), which traces to a Strategic Theme.

For each metric: Metric Name, Current Baseline, Target Value, Measurement Method, Expected Impact Timeline (when you expect to see the metric move), Leading Indicators (early signals that the initiative is on track before the lagging metric moves).

### Dimension 7: Strategic Alignment Mapping

Provide an explicit mapping from every initiative to strategic themes, OKRs, and organizational strategy. This is not decorative -- it is the mechanism for making trade-off decisions. When capacity is constrained, the alignment mapping reveals which initiatives can be deprioritized with the least strategic impact.

Include an alignment matrix: rows are initiatives, columns are strategic themes / OKRs, cells indicate strength of alignment (direct/indirect/none). Initiatives that do not align to any strategic theme should not be on the roadmap. They are pet projects or undead initiatives that consume capacity without strategic justification.

### Dimension 8: Risk Indicators

For each initiative, assess risk across four dimensions (adapted from Cagan's four risks):
- **Value Risk:** Will this actually solve the stated problem?
- **Usability Risk:** Can users figure it out?
- **Feasibility Risk:** Can we build it with available technology and skills?
- **Viability Risk:** Does it work within our business model, regulatory environment, and organizational constraints?

Rate each dimension (Low/Medium/High) and define the discovery activities planned to de-risk before committing to full delivery.

### Dimension 9: Confidence Levels (Decreasing by Horizon)

Assign explicit confidence levels to every initiative using a standard scale:

| Confidence | Definition | Evidence Required |
|------------|------------|-------------------|
| :green_circle: High (80-100%) | Validated problem, proven solution approach, team assigned | Customer research, prototype testing, technical spike |
| :yellow_circle: Medium (40-79%) | Validated problem, solution approach under exploration | Customer research, competitive analysis |
| :orange_circle: Low (10-39%) | Hypothesized problem, directional solution concept | Market signals, stakeholder input |
| :red_circle: Speculative (<10%) | Strategic bet, minimal validation | Strategic intuition, industry trends |

NOW initiatives should predominantly be High confidence. NEXT should be Medium. LATER should be Low or Speculative. If a NOW initiative has Low confidence, it is not ready for NOW -- it needs more discovery.

### Dimension 10: Owners

Every initiative must have a single accountable owner. Not a committee, not a team -- one person. The owner is accountable for: maintaining the initiative's problem statement and success metrics, managing dependencies, communicating status, and making scope trade-off recommendations.

Additionally, define the decision-making authority: who can change the initiative's scope, timeline, or priority? Use RAPID (Recommend, Agree, Perform, Input, Decide) for clarity.

### Dimension 11: Status Indicators

Use a consistent status taxonomy across all initiatives:

- **Discovery:** Problem validation and solution exploration in progress
- **Shaping:** Solution approach defined, detailed scoping underway
- **Ready:** PRD complete, team assigned, ready to start
- **In Progress:** Active development
- **Validation:** Built but undergoing user validation / beta testing
- **Launched:** Released to production, monitoring success metrics
- **Paused:** Deliberately paused with documented reason and resumption criteria
- **Cancelled:** Removed from roadmap with documented reason and lessons learned

Every status change must be accompanied by a one-sentence rationale. Track status history to identify initiatives that oscillate (a sign of poor shaping or unclear priority).

### Dimension 12: Customer Impact Assessment

For each initiative, assess the anticipated customer impact:
- **Affected Segments:** Which customer segments are impacted (and which are not)?
- **Impact Type:** New capability / Improved capability / Removed friction / Risk reduction
- **Magnitude:** Transformational / Significant / Incremental / Maintenance
- **Measurement:** How will you measure customer impact specifically (not just business metrics)?

Include a customer journey overlay: map initiatives to stages of the customer journey to ensure balanced investment across the journey rather than concentration in one stage.

### Dimension 13: Technical Debt Allocation (15-30%)

Reserve 15-30% of total roadmap capacity for technical debt reduction, infrastructure investment, and platform improvement. This allocation is non-negotiable. Technical debt that is not explicitly budgeted is implicitly accrued.

Structure the debt allocation:
- **Mandatory debt payments:** Security patches, compliance updates, end-of-life migrations
- **Strategic debt reduction:** Refactoring that enables future velocity
- **Platform investment:** Infrastructure and tooling that benefits multiple initiatives

Track the technical debt balance over time. If the balance is growing despite the allocation, the allocation is insufficient or debt is being accrued faster than it is being repaid.

### Dimension 14: Audience-Specific Views

A single roadmap cannot serve all audiences. Generate multiple views from the same underlying data:

- **Executive View:** Strategic themes, investment allocation, portfolio-level metrics, key risks. Time horizon emphasis on NEXT and LATER. Minimal initiative-level detail.
- **Product/Engineering View:** Initiative detail, dependencies, resource allocation, technical debt. Time horizon emphasis on NOW and NEXT. Full initiative-level detail.
- **Customer/Sales View:** Customer-facing capabilities and improvements, expected availability, customer impact. No internal implementation detail. Themed by customer benefit, not by team or technology.
- **Board/Investor View:** Strategic bets, market positioning, competitive differentiation, investment thesis. Longest time horizon. Highest abstraction.

Each view must be generated from the same source data to ensure consistency. Conflicting information across views destroys trust.

---

## Anti-Patterns (Generation Must Avoid)

### The Feature Factory Roadmap
A list of features organized by quarter with delivery dates. No problem statements, no outcomes, no success metrics. The roadmap reads like a Jira backlog sorted by date. Detection: initiatives are named as nouns (features) rather than outcomes. Fix: rewrite every initiative as a problem to solve with a measurable outcome.

### The Date-Driven Roadmap
Every initiative has a specific delivery date regardless of time horizon. LATER items have the same date precision as NOW items. This creates false precision that erodes stakeholder trust when dates inevitably shift. Detection: all items have specific dates (e.g., "June 15") rather than time horizons (e.g., "Q3" or "Next"). Fix: apply the NOW/NEXT/LATER model with decreasing precision.

### The Everything Roadmap
Every request from every stakeholder is included with no prioritization or sequencing. The roadmap contains more work than the organization could deliver in three years. Detection: total estimated effort exceeds 200% of available capacity. Fix: apply ruthless prioritization; a roadmap that includes everything communicates nothing.

### The Static Roadmap
Created once, presented at an offsite, never updated. Becomes fiction within weeks. Detection: last updated date is more than 30 days ago. Fix: establish a cadence of roadmap review (monthly for NOW, quarterly for NEXT/LATER) with documented updates.

### The Gantt Chart in Disguise
Presented as a roadmap but structured as a project plan with sequential task dependencies and resource-leveled timelines. Conflates strategic communication with project management. Detection: the document includes task-level estimates and resource assignments for items beyond the current quarter. Fix: separate the roadmap (strategic communication tool) from the project plan (execution management tool).

### The One-Audience Roadmap
A single view presented to all audiences, resulting in executives drowning in technical detail while engineers lack implementation context. Detection: the same document is used in board meetings and sprint planning. Fix: generate audience-specific views from a common data source.

---

## Quality Gates

A roadmap must pass ALL of the following gates before communication to stakeholders:

| Gate | Criterion | Validation Method |
|------|-----------|-------------------|
| QG-R1 | All initiatives framed as problems/outcomes, not features | Initiative naming audit |
| QG-R2 | 3-5 strategic themes present and OKR-aligned | Theme-OKR mapping review |
| QG-R3 | No arbitrary dates without confidence levels | Date precision audit |
| QG-R4 | Confidence levels decrease from NOW to LATER | Confidence gradient check |
| QG-R5 | Every initiative has a single accountable owner | Owner field completeness |
| QG-R6 | Every initiative has at least one success metric | Metric field completeness |
| QG-R7 | Technical debt allocation is 15-30% of capacity | Allocation calculation |
| QG-R8 | Dependencies mapped and critical path identified | Dependency graph review |
| QG-R9 | Total demand does not exceed 120% of capacity | Resource demand-capacity analysis |
| QG-R10 | At least 2 audience-specific views defined | View inventory |
| QG-R11 | No anti-patterns detected | Anti-pattern checklist scan |
| QG-R12 | Rolling wave detail: NOW is detailed, LATER is directional | Detail gradient review |

---

## Generation Instructions

When generating a strategic roadmap:

1. **Start with strategy, not features.** The roadmap is a strategic communication tool. Begin with the strategic themes and OKRs, then populate with initiatives that advance those themes. Never start by listing features and then trying to group them into themes.

2. **Frame every initiative as a problem.** Before placing any item on the roadmap, articulate the problem it solves and for whom. If you cannot state the problem clearly, the initiative is not ready for the roadmap.

3. **Apply decreasing confidence.** Resist the pressure to provide equal detail across all time horizons. NOW should be crisp and specific. LATER should be deliberately vague. Stakeholders who demand specificity for LATER items should be redirected to the discovery process.

4. **Budget for reality.** Include technical debt allocation (15-30%), operational maintenance, and discovery/research activities. A roadmap that allocates 100% of capacity to new initiatives is fiction.

5. **Map dependencies early.** Dependency management is the hidden complexity of roadmapping. Surface dependencies proactively and build contingency plans for critical-path dependencies.

6. **Generate multiple views.** Never present a single roadmap to all audiences. Generate audience-specific views from a common data source. Each view should answer the questions that specific audience cares about.

7. **Plan for change.** The roadmap will change. Build in review cadences, update processes, and change communication protocols. A roadmap's value is not in its accuracy on day one but in its ability to evolve as learning accumulates.

8. **Apply the GIST hierarchy.** Goals (OKRs) decompose into Ideas (initiatives), which decompose into Steps (projects/experiments), which decompose into Tasks. The roadmap operates at the Goal and Idea levels. Steps and Tasks belong in project management tools.

9. **Validate against anti-patterns.** Before publishing, check every anti-pattern. The Feature Factory and Date-Driven roadmaps are the most common failures. If more than 30% of initiatives read as features rather than outcomes, reshape before publishing.

10. **Include what you are NOT doing.** A great roadmap communicates strategic choices -- both inclusions and exclusions. Explicitly state 3-5 things you considered but chose not to pursue, with rationale. This builds strategic credibility and prevents the "why aren't you doing X?" conversation.

---

## Cross-References

- [[anti-patterns/roadmap]] -- Common roadmap anti-patterns with detection heuristics and remediation
- [[frameworks/strategy]] -- CX strategy framework that provides the strategic context for roadmap themes
- [[frameworks/prd]] -- PRD framework for detailed initiative specification (NOW items)
- [[frameworks/gap-analysis]] -- Gap analysis that informs initiative prioritization
- [[benchmarks/cx-metrics]] -- CX metrics benchmarks for setting initiative success targets
