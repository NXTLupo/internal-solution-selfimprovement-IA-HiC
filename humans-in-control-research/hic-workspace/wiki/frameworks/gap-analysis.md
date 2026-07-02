---
id: frameworks/gap-analysis.md
title: "Gap Analysis Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [gap-analysis, gartner, forrester, maturity-model, parasuraman]
evidence_count: 0
chunks:
  - id: "frameworks/gap-analysis.md#c0"
    char_span: [0, 999]
    sentence_count: 5
    key_terms: [framework, organizational, model, optimized, quality, service, level, gap]
    concepts: [framework, organizational, model, optimized, quality]
    section: Canonical Foundations
    token_count: 193
  - id: "frameworks/gap-analysis.md#c1"
    char_span: [1031, 3706]
    sentence_count: 34
    key_terms: [process, dimension, processes, description, continuous, skill, workforce, employee]
    concepts: [process, dimension, processes, description, continuous]
    section: The 8 Required Dimensions
    token_count: 507
  - id: "frameworks/gap-analysis.md#c2"
    char_span: [3708, 6209]
    sentence_count: 34
    key_terms: [data, quality, systems, customer, architecture, integration, operational, analytical]
    concepts: [quality, systems, customer, architecture, integration]
    section: The 8 Required Dimensions
    token_count: 474
  - id: "frameworks/gap-analysis.md#c3"
    char_span: [6211, 8688]
    sentence_count: 30
    key_terms: [experience, customer, journey, behavioral, governance, defined, closed-loop, investment]
    concepts: [experience, customer, behavioral, governance, journey]
    related_chunks: ["frameworks/gap-analysis.md#c4"]
    section: The 8 Required Dimensions
    token_count: 456
  - id: "frameworks/gap-analysis.md#c4"
    char_span: [8690, 11092]
    sentence_count: 28
    key_terms: [customer, metrics, measurement, behavioral, centricity, culture, values, organization]
    concepts: [customer, metrics, measurement, behavioral, centricity]
    related_chunks: ["frameworks/gap-analysis.md#c3"]
    section: The 8 Required Dimensions
    token_count: 447
  - id: "frameworks/gap-analysis.md#c5"
    char_span: [11138, 13714]
    sentence_count: 10
    key_terms: [gap, service, customer, definition, diagnostic, difference, questions, expectations]
    concepts: [service, customer, definition, diagnostic, difference]
    section: "Parasuraman's 5 Gaps of Service Quality"
    token_count: 445
  - id: "frameworks/gap-analysis.md#c6"
    char_span: [13755, 15801]
    sentence_count: 3
    key_terms: [gap, impact, current, target, state, dimension, typically, gaps]
    concepts: [impact, current, target, dimension, typically]
    related_chunks: ["frameworks/gap-analysis.md#c8"]
    section: Quality Gates and Scoring Protocol
    token_count: 411
  - id: "frameworks/gap-analysis.md#c7"
    char_span: [15803, 16592]
    sentence_count: 5
    key_terms: [months, transformational, deploy, effort, redesign, requires, impact, cross-functional]
    concepts: [months, transformational, deploy, effort, redesign]
    section: Quality Gates and Scoring Protocol
    token_count: 160
  - id: "frameworks/gap-analysis.md#c8"
    char_span: [16612, 18048]
    sentence_count: 12
    key_terms: [without, level, dimension, target, organization, measurement, gap, root]
    concepts: [without, dimension, level, organization, target]
    related_chunks: ["frameworks/gap-analysis.md#c6"]
    section: Anti-Patterns
    token_count: 272
  - id: "frameworks/gap-analysis.md#c9"
    char_span: [18078, 19455]
    sentence_count: 14
    key_terms: [gap, gaps, anti-pattern, score, assumptions, dimensions, benchmark, framework]
    concepts: [anti-pattern, assumptions, dimensions, score, benchmark]
    section: Generation Instructions
    token_count: 270
---
# Gap Analysis Framework

## Canonical Foundations

This framework synthesizes two complementary analytical traditions:

1. **Gartner CX Maturity Model** -- a five-level progression from ad-hoc to optimized capability across organizational dimensions. Gartner's research consistently finds that 41% of organizations remain at Level 1 (Ad Hoc / Reactive), while only 1% have reached Level 5 (Optimized / Predictive). The gap between aspiration and execution is the primary value lever for consulting engagements.

2. **Gaps Model of Service Quality** (Parasuraman, Zeithaml, and Berry, 1985; revised 1988) -- identifies five structural gaps between customer expectations and organizational delivery. Originally published in the *Journal of Marketing*, the model remains the most cited service quality framework in business literature.

The intersection of these two models provides both a diagnostic (where are we?) and an explanatory (why are we here?) lens for any CX transformation engagement.

---

## The 8 Required Dimensions

Every gap analysis must assess the organization across all eight dimensions. Omitting a dimension creates blind spots that surface as failed implementations.

### Dimension 1: People

The workforce capability, structure, and alignment dimension. Covers talent acquisition, role clarity, skill development, and cross-functional collaboration.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | No dedicated CX roles. Customer-facing staff receive generic onboarding only. Tribal knowledge dominates. High turnover in frontline positions. No formal skill assessment. |
| 2 - Developing | CX roles exist but report into siloed departments. Basic training programs deployed. Competency frameworks drafted but not enforced. Employee satisfaction measured annually at best. |
| 3 - Defined | CX Center of Excellence (CoE) established with dotted-line authority. Role-based certification paths in place. Regular cross-functional workshops. Employee NPS tracked quarterly. |
| 4 - Managed | Dedicated CX leadership at VP/SVP level with P&L influence. Predictive workforce planning models. Continuous learning platforms with personalized skill paths. Employee experience directly linked to CX KPIs. |
| 5 - Optimized | CX embedded in every job description across the organization. Real-time skill gap detection via AI. Autonomous learning ecosystems. Workforce composition dynamically adjusts to customer demand signals. |

### Dimension 2: Process

End-to-end workflow design, standardization, and continuous improvement capability.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | Processes are undocumented and person-dependent. Outcomes vary by shift, location, and individual. No process ownership. Firefighting is the norm. |
| 2 - Developing | Key processes documented but inconsistently followed. Some process owners assigned. Improvement happens reactively after major failures. SLAs exist for a handful of workflows. |
| 3 - Defined | Enterprise process taxonomy in place. RACI matrices for all customer-facing workflows. Regular process reviews on a quarterly cadence. Lean/Six Sigma applied to high-volume processes. |
| 4 - Managed | Process mining and task mining deployed at scale. Real-time process monitoring dashboards. Statistical process control applied to critical paths. Process variants automatically flagged for review. |
| 5 - Optimized | Self-healing processes that detect and correct deviations autonomously. Continuous process optimization via AI/ML. Process intelligence feeds directly into strategic planning. Zero-touch resolution for standard scenarios. |

### Dimension 3: Technology

Systems landscape, integration maturity, and technology enablement for CX delivery.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | Fragmented tools with no integration. Significant shadow IT. Manual data entry between systems. No single source of truth for customer data. Spreadsheets as primary analytical tool. |
| 2 - Developing | Core systems identified (CRM, ticketing, telephony). Point-to-point integrations for critical flows. API strategy discussed but not formalized. Some reporting automation. |
| 3 - Defined | Integration platform deployed (iPaaS or ESB). API-first policy for new systems. Unified customer data platform in progress. Self-service capabilities for standard requests. |
| 4 - Managed | Real-time event-driven architecture. AI/ML models in production for prediction and personalization. Omnichannel orchestration engine operational. Technology decisions driven by CX impact scoring. |
| 5 - Optimized | Composable architecture with plug-and-play capability modules. Autonomous system health monitoring and scaling. Technology stack continuously evaluated against emerging capabilities. Innovation lab operationalized. |

### Dimension 4: Data

Data quality, accessibility, governance, and analytical capability.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | Data siloed in departmental systems. No data dictionary. Quality unknown. Reports are manually compiled and often contradictory. No consent management. |
| 2 - Developing | Master data management initiative launched. Basic data quality rules for key entities (customer, product). Reporting consolidated into a BI tool. Privacy policy exists but enforcement is manual. |
| 3 - Defined | Enterprise data catalog operational. Data stewards assigned per domain. Automated data quality scoring. Customer 360 view available to frontline. Consent management platform deployed. |
| 4 - Managed | Real-time data pipelines feeding operational and analytical workloads. Predictive data quality (anomaly detection on ingestion). Data literacy programs across business functions. Privacy-by-design embedded in data architecture. |
| 5 - Optimized | Self-service data products available to every team. AI-driven data quality remediation. Data monetization strategy active. Federated data governance with automated policy enforcement. |

### Dimension 5: Governance

Decision rights, accountability structures, and organizational alignment for CX outcomes.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | No formal CX governance. Decisions made by loudest voice or most senior person in the room. No investment prioritization framework. CX budget buried in departmental line items. |
| 2 - Developing | CX steering committee formed but meets irregularly. Basic prioritization criteria defined. CX budget identified but not ring-fenced. Accountability limited to customer service department. |
| 3 - Defined | CX governance board with cross-functional representation meets monthly. Defined intake process for CX initiatives. Investment framework with ROI thresholds. CX OKRs cascade to department level. |
| 4 - Managed | CX governance integrated into enterprise portfolio management. Real-time initiative tracking with automated escalation. Customer impact assessment required for all business cases. Board-level CX reporting. |
| 5 - Optimized | Customer-centric governance embedded in corporate charter. Autonomous CX investment allocation based on predicted impact. Every major decision evaluated through customer lens by default. |

### Dimension 6: Customer Experience

The direct quality of customer interactions, journey design, and experience orchestration.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | No journey mapping. Touchpoints managed independently. Customer feedback collected sporadically. No closed-loop process. Experience varies wildly by channel. |
| 2 - Developing | Priority journeys mapped (top 3-5). Basic VOC program in place (post-transaction surveys). Some closed-loop follow-up on detractors. Channel consistency guidelines drafted. |
| 3 - Defined | Full journey inventory maintained. Proactive experience monitoring at key moments of truth. Systematic closed-loop across all feedback channels. Personalization rules deployed for primary segments. |
| 4 - Managed | Real-time journey orchestration based on behavioral signals. Predictive churn and next-best-action models operational. Emotion detection and sentiment analysis integrated into live interactions. Experience A/B testing at scale. |
| 5 - Optimized | Anticipatory experience design -- needs addressed before customer articulates them. Autonomous journey optimization via reinforcement learning. Experience innovation driven by emerging behavioral data. |

### Dimension 7: Measurement

Metrics architecture, insight generation, and performance management capability.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | Vanity metrics only (call volume, email count). No CX-specific KPIs. Measurement is backward-looking. No linkage between CX metrics and business outcomes. |
| 2 - Developing | Core CX metrics deployed (NPS, CSAT, CES). Dashboards available but updated manually or weekly. Some correlation analysis between satisfaction and retention. |
| 3 - Defined | Balanced CX scorecard with leading and lagging indicators. Automated dashboards with daily refresh. Driver analysis identifies which touchpoints move the needle. CX metrics integrated into management incentives. |
| 4 - Managed | Real-time CX performance monitoring. Predictive models for satisfaction and churn. Statistical significance testing for all CX experiments. Financial linkage model quantifies CX impact on revenue and cost. |
| 5 - Optimized | Self-updating measurement frameworks that detect when metrics become stale. AI-generated insight narratives. Prescriptive analytics recommending specific actions. Measurement democratized across the organization. |

### Dimension 8: Culture

Organizational mindset, values alignment, and behavioral norms regarding customer centricity.

| Level | Behavioral Description |
|-------|----------------------|
| 1 - Ad Hoc | Internally focused culture. Customer is abstract concept in strategy decks. No customer stories in internal communication. "That's not my department" is acceptable response. |
| 2 - Developing | CEO references customer centricity in communications. Customer stories shared occasionally. Some teams adopt customer-first language. Recognition programs exist but are inconsistent. |
| 3 - Defined | Customer-centric values formally embedded in corporate values statement. Regular customer immersion programs (ride-alongs, listening labs). CX recognition program operational across all business units. |
| 4 - Managed | Customer empathy measurably embedded in hiring, promotion, and performance criteria. Psychological safety enables frontline to escalate systemic issues. Customer advisory boards influence product roadmap. |
| 5 - Optimized | Every employee can articulate how their work impacts customer outcomes. Customer advocacy is reflexive, not mandated. Organization actively co-creates with customers. Culture self-reinforces customer centricity without management intervention. |

---

## Parasuraman's 5 Gaps of Service Quality

Each gap represents a structural failure point between customer expectations and organizational delivery. The gap analysis must assess all five.

### Gap 1: Knowledge Gap
**Definition**: The difference between what customers actually expect and what management believes customers expect.
**Root Causes**: Insufficient VOC programs, over-reliance on assumption, lack of frontline feedback channels, research bias toward confirming existing beliefs.
**Diagnostic Questions**: When was the last primary customer research conducted? How many layers exist between frontline staff and decision-makers? Do executives spend time in direct customer contact?

### Gap 2: Policy Gap (Standards Gap)
**Definition**: The difference between management's understanding of customer expectations and the service quality specifications they set.
**Root Causes**: Cost-driven standard setting, feasibility constraints overriding customer needs, lack of formal service design discipline, absent service level objectives for experiential dimensions.
**Diagnostic Questions**: Are service standards written from the customer's perspective or the organization's? Do standards cover emotional and functional dimensions?

### Gap 3: Delivery Gap (Performance Gap)
**Definition**: The difference between service quality specifications and the service actually delivered.
**Root Causes**: Insufficient training, role ambiguity, poor technology enablement, inadequate staffing models, misaligned incentives.
**Diagnostic Questions**: What is the variance between target and actual performance on key SLAs? Where do process breakdowns most frequently occur?

### Gap 4: Communication Gap
**Definition**: The difference between the service delivered and the service promised through external communications.
**Root Causes**: Marketing and operations misalignment, overpromising in campaigns, failure to manage expectations, inconsistent messaging across channels.
**Diagnostic Questions**: Are marketing teams involved in service design reviews? Is there a formal process for validating promises against delivery capability?

### Gap 5: Service Gap (Customer Gap)
**Definition**: The difference between customer expectations and perceived service. This is the cumulative result of Gaps 1-4.
**Root Causes**: Any combination of the preceding four gaps. The service gap cannot be closed by addressing it directly -- it requires closing the upstream gaps.
**Diagnostic Questions**: What is the magnitude of the expectation-perception delta? Which upstream gaps contribute most to the overall service gap?

---

## Quality Gates and Scoring Protocol

### Maturity Scoring Rules

- Each dimension is scored independently on the 1-5 scale using the behavioral descriptions above.
- Scoring must be evidence-based: cite specific artifacts, interviews, or observations that justify each score.
- Half-point scores (e.g., 2.5) are permitted when an organization demonstrates some but not all behaviors at a level.
- **Current state** and **target state** must be assessed separately for every dimension.
- The gap magnitude (target minus current) is the primary input for prioritization.

### Visualization Requirements

- **Spider/Radar Chart**: Plot all 8 dimensions on a radar chart with current state (solid line) and target state (dashed line). The visual area between the two lines represents the aggregate gap.
- **Gap Magnitude Table**: Tabular format showing dimension, current score, target score, gap size, and business impact estimate.

### Business Impact Quantification

Every gap must be translated into financial terms:
- **Revenue impact**: Lost revenue from customer churn, reduced wallet share, or missed cross-sell/upsell attributable to the gap.
- **Cost impact**: Excess operational cost from inefficiency, rework, or manual workarounds caused by the gap.
- **Risk impact**: Potential financial exposure from compliance failures, brand damage, or competitive displacement.

Formula: `Gap Business Impact ($) = (Revenue at Risk + Excess Cost + Risk Exposure) x Confidence Factor`

The confidence factor (0.5 to 1.0) accounts for estimation uncertainty.

### Root Cause Clustering

After scoring, cluster gaps by root cause to identify systemic issues:
- **Capability gaps**: Skills, knowledge, or talent deficits (typically affects People, Culture, Measurement)
- **Architecture gaps**: Structural or systemic design failures (typically affects Technology, Data, Process)
- **Alignment gaps**: Misalignment between strategy, governance, and execution (typically affects Governance, Customer Experience)

### Remediation Roadmap

Classify all recommended actions into four horizons:

| Horizon | Timeline | Characteristics | Examples |
|---------|----------|----------------|----------|
| Quick Wins | 0-3 months | Low effort, visible impact. Builds momentum and credibility. | Close feedback loops, fix broken journey steps, deploy missing dashboards. |
| Tactical | 3-9 months | Moderate effort, measurable ROI. Requires cross-functional coordination. | Implement VOC platform, redesign top 3 journeys, deploy integration layer. |
| Strategic | 9-18 months | High effort, transformational impact. Requires executive sponsorship. | Build CX CoE, deploy CDP, redesign governance model. |
| Transformational | 18-36 months | Fundamental organizational change. Multi-year investment. | Culture transformation, composable architecture migration, AI-at-scale deployment. |

---

## Anti-Patterns

These are the most common failure modes observed in gap analysis engagements. The framework must actively guard against each.

1. **The Flattery Trap**: Inflating maturity scores to avoid difficult conversations with stakeholders. Every score must be defensible with evidence. If a client self-assesses at Level 4, demand artifacts.

2. **Dimension Cherry-Picking**: Analyzing only the dimensions where the organization is weakest or strongest. All 8 dimensions are mandatory. Partial analysis produces partial transformation.

3. **Target State Fantasy**: Setting all target states to Level 5 regardless of strategic necessity. Not every organization needs Level 5 in every dimension. Target states must be justified by business strategy and competitive context.

4. **Gap Without Impact**: Identifying gaps without quantifying business impact. A gap without a dollar figure attached is an observation, not an insight.

5. **Root Cause Avoidance**: Describing symptoms (scores) without diagnosing root causes. The Parasuraman gaps model exists precisely to force root cause identification.

6. **Roadmap Without Sequencing**: Listing recommendations without temporal sequencing or dependency mapping. A roadmap is not a to-do list.

7. **Measurement Myopia**: Focusing the Measurement dimension assessment on whether metrics exist rather than whether they drive action. Dashboards that nobody acts on score no higher than Level 2.

---

## Generation Instructions

When generating a gap analysis deliverable, the AI agent must:

1. Collect current-state evidence across all 8 dimensions before scoring. Do not score from assumptions.
2. Score each dimension independently. Document the evidence supporting each score.
3. Assess all 5 Parasuraman gaps and identify which upstream gaps contribute to the observed service gap.
4. Generate the spider/radar visualization with current and target overlays.
5. Quantify every gap in business impact terms. If exact figures are unavailable, provide ranges with stated assumptions.
6. Cluster gaps by root cause (Capability, Architecture, Alignment).
7. Build the remediation roadmap with all four horizons populated.
8. Apply anti-pattern checks before finalizing: verify no scores are unsupported, no dimensions are missing, no targets are unjustified, and no gaps lack impact quantification.
9. Include the Gartner benchmark context (41% at Level 1, 1% at Level 5) to frame the client's relative position.
10. Cross-reference findings with other framework analyses if available.

---

## Cross-References

- [[anti-patterns/gap-analysis]] -- Detailed anti-pattern catalog with real-world failure examples
- [[benchmarks/maturity-models]] -- Industry benchmark data by vertical and company size
- [[frameworks/strategy]] -- Strategy framework for connecting gap findings to strategic recommendations
