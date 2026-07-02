---
id: frameworks/tech-audit.md
title: "Technology Audit Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [tech-audit, cobit, forrester-tei, well-architected, nist-csf]
evidence_count: 0
chunks:
  - id: "frameworks/tech-audit.md#c0"
    char_span: [0, 1513]
    sentence_count: 6
    key_terms: [framework, technology, governance, provides, security, impact, cybersecurity, management]
    concepts: [framework, technology, governance, provides, security]
    related_chunks: ["frameworks/tech-audit.md#c10"]
    section: Canonical Foundations
    token_count: 283
  - id: "frameworks/tech-audit.md#c1"
    char_span: [1546, 3818]
    sentence_count: 4
    key_terms: [integration, api, assessment, technology, technical, cost, management, dimension]
    concepts: [integration, assessment, technology, technical, management]
    related_chunks: ["frameworks/tech-audit.md#c2", "frameworks/tech-audit.md#c3", "frameworks/tech-audit.md#c4", "frameworks/tech-audit.md#c5", "frameworks/tech-audit.md#c6"]
    section: The 15 Required Dimensions
    token_count: 466
  - id: "frameworks/tech-audit.md#c2"
    char_span: [3820, 6038]
    sentence_count: 1
    key_terms: [security, assessment, performance, management, dimension, frequency, tdr, time]
    concepts: [security, assessment, performance, management, dimension]
    related_chunks: ["frameworks/tech-audit.md#c1", "frameworks/tech-audit.md#c3", "frameworks/tech-audit.md#c5"]
    section: The 15 Required Dimensions
    token_count: 483
  - id: "frameworks/tech-audit.md#c3"
    char_span: [6040, 8442]
    sentence_count: 2
    key_terms: [data, assessment, dimension, criteria, strategy, management, cloud, scope]
    concepts: [assessment, dimension, criteria, strategy, management]
    related_chunks: ["frameworks/tech-audit.md#c1", "frameworks/tech-audit.md#c2", "frameworks/tech-audit.md#c4", "frameworks/tech-audit.md#c5"]
    section: The 15 Required Dimensions
    token_count: 465
  - id: "frameworks/tech-audit.md#c4"
    char_span: [8444, 11091]
    sentence_count: 3
    key_terms: [compliance, time, assessment, percentage, technology, criteria, internal, required]
    concepts: [compliance, assessment, percentage, technology, criteria]
    related_chunks: ["frameworks/tech-audit.md#c1", "frameworks/tech-audit.md#c3", "frameworks/tech-audit.md#c6", "frameworks/tech-audit.md#c11"]
    section: The 15 Required Dimensions
    token_count: 517
  - id: "frameworks/tech-audit.md#c5"
    char_span: [11093, 12339]
    sentence_count: 1
    key_terms: [dimension, skills, technical, proof-of-concept, assessment, capability, innovation, investment]
    concepts: [dimension, skills, proof-of-concept, technical, assessment]
    related_chunks: ["frameworks/tech-audit.md#c1", "frameworks/tech-audit.md#c2", "frameworks/tech-audit.md#c3"]
    section: The 15 Required Dimensions
    token_count: 232
  - id: "frameworks/tech-audit.md#c6"
    char_span: [12362, 14055]
    sentence_count: 11
    key_terms: [recommendations, methodology, assessment, investment, technology, risk, analysis, scoring]
    concepts: [recommendations, methodology, assessment, investment, technology]
    related_chunks: ["frameworks/tech-audit.md#c1", "frameworks/tech-audit.md#c4", "frameworks/tech-audit.md#c11"]
    section: Report Structure
    token_count: 345
  - id: "frameworks/tech-audit.md#c7"
    char_span: [14081, 14974]
    sentence_count: 5
    key_terms: [end-of-life, red, misaligned, strategy, because, review, system, color]
    concepts: [end-of-life, misaligned, strategy, because, review]
    section: Color Coding System
    token_count: 184
  - id: "frameworks/tech-audit.md#c8"
    char_span: [15018, 16497]
    sentence_count: 7
    key_terms: [investment, implementation, quantification, risk, cost, benefits, annual, factor]
    concepts: [implementation, quantification, investment, benefits, consolidation]
    section: Forrester TEI Calculation Methodology
    token_count: 276
  - id: "frameworks/tech-audit.md#c9"
    char_span: [16554, 17875]
    sentence_count: 6
    key_terms: [missing, step, tdr, estimate, patterns, remediation, debt, components]
    concepts: [missing, estimate, patterns, remediation, components]
    section: SQALE Technical Debt Ratio -- Detailed Application
    token_count: 270
  - id: "frameworks/tech-audit.md#c10"
    char_span: [17895, 19498]
    sentence_count: 11
    key_terms: [without, technology, security, systems, foundational, compliance, sanctioned, trajectory]
    concepts: [without, technology, security, systems, foundational]
    related_chunks: ["frameworks/tech-audit.md#c0"]
    section: Anti-Patterns
    token_count: 299
  - id: "frameworks/tech-audit.md#c11"
    char_span: [19528, 21057]
    sentence_count: 14
    key_terms: [technology, assessment, available, anti-patterns, architecture, deliverable, benchmarks, capability]
    concepts: [technology, assessment, available, anti-patterns, architecture]
    related_chunks: ["frameworks/tech-audit.md#c1", "frameworks/tech-audit.md#c4", "frameworks/tech-audit.md#c6"]
    section: Generation Instructions
    token_count: 289
---
# Technology Audit Framework

## Canonical Foundations

This framework integrates four industry-standard bodies of knowledge:

1. **COBIT 2019** (Control Objectives for Information and Related Technologies, ISACA) -- governance and management framework for enterprise IT. Provides 40 governance and management objectives organized across five domains: Evaluate, Direct and Monitor (EDM); Align, Plan and Organize (APO); Build, Acquire and Implement (BAI); Deliver, Service and Support (DSS); Monitor, Evaluate and Assess (MEA).

2. **Forrester Total Economic Impact (TEI)** -- a rigorous methodology for quantifying the financial impact of technology investments across four dimensions: Cost Savings, Benefits, Flexibility, and Risk. TEI moves technology discussions from feature comparisons to business value conversations.

3. **AWS Well-Architected Framework** (applicable to any cloud platform) -- six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability. Provides a consistent approach to evaluating architectures against best practices.

4. **NIST Cybersecurity Framework (CSF) 2.0** -- organizes cybersecurity activities into six core functions: Govern, Identify, Protect, Detect, Respond, and Recover. Provides a common taxonomy for security posture assessment.

The synthesis of these four frameworks ensures that technology audits cover governance, financial impact, architectural quality, and security posture as integrated concerns.

---

## The 15 Required Dimensions

### Dimension 1: Technology Stack Inventory and Shadow IT

**Scope**: Complete enumeration of all technology assets -- sanctioned and unsanctioned. Shadow IT typically accounts for 30-40% of enterprise technology spend (Gartner).

**Assessment Criteria**:
- Is there a maintained Configuration Management Database (CMDB) or technology catalog?
- What discovery methods are used (network scanning, SSO logs, expense report analysis, browser extension audits)?
- How many unsanctioned SaaS applications are in active use?
- What is the overlap/redundancy ratio across tools serving similar functions?
- Are end-of-life/end-of-support systems identified and tracked?

**Evidence Artifacts**: CMDB extract, SaaS management platform report, network scan results, software asset management data.

### Dimension 2: Integration and API Maturity

**Scope**: How systems communicate, share data, and orchestrate workflows across boundaries.

**Assessment Criteria**:
- Integration topology: point-to-point, hub-and-spoke, event-driven, or mesh?
- API strategy: REST, GraphQL, gRPC, SOAP legacy? API versioning and lifecycle policy?
- API gateway deployed? Rate limiting, authentication, monitoring in place?
- What percentage of integrations are real-time vs. batch?
- Is there an integration Center of Excellence or shared services team?
- iPaaS or ESB platform assessment (capacity, reliability, vendor roadmap).

**Maturity Indicators**: API catalog completeness, self-service API onboarding capability, average time to build a new integration, integration failure rate.

### Dimension 3: Technical Debt (SQALE / TDR)

**Scope**: The accumulated cost of suboptimal technical decisions that constrain future velocity.

**SQALE Method** (Software Quality Assessment based on Lifecycle Expectations): Classifies technical debt into categories aligned with software lifecycle characteristics -- testability, reliability, changeability, efficiency, security, maintainability, portability, and reusability.

**Technical Debt Ratio (TDR) Formula**:

```
TDR = (Remediation Cost / Development Cost) x 100
```

- **Remediation Cost**: Estimated effort (in hours or dollars) to resolve all identified debt items.
- **Development Cost**: Estimated effort to rebuild the system from scratch.

**Interpretation Scale**:
- TDR < 5%: Manageable, healthy codebase
- TDR 5-10%: Elevated, requires dedicated remediation sprints
- TDR 10-20%: Problematic, velocity measurably impaired
- TDR > 20%: Critical, rewrite or major refactoring warranted

**Assessment Criteria**:
- Static analysis results (SonarQube, CodeClimate, or equivalent)
- Average age of open code quality issues
- Percentage of codebase covered by automated tests
- Frequency and severity of production incidents attributable to technical debt
- Developer survey: estimated percentage of time spent on debt vs. new capability

### Dimension 4: Security Posture

**Scope**: Aligned with NIST CSF 2.0 functions: Govern, Identify, Protect, Detect, Respond, Recover.

**Assessment Criteria**:
- Vulnerability management: scan frequency, mean time to remediate (MTTR) by severity
- Identity and access management: MFA coverage, least-privilege enforcement, PAM deployment
- Network security: segmentation, zero-trust architecture progress, encryption in transit/at rest
- Application security: SAST/DAST/SCA in CI/CD pipeline, OWASP Top 10 coverage
- Security operations: SOC capability, SIEM/SOAR deployment, mean time to detect (MTTD)
- Incident response: documented playbooks, tabletop exercise frequency, post-incident review process
- Third-party risk: vendor security assessment program, supply chain security controls

**Color Coding Applied**: Red findings require immediate remediation plans.

### Dimension 5: Scalability and Performance

**Scope**: The ability of systems to handle current and projected load without degradation.

**Assessment Criteria**:
- Current resource utilization (CPU, memory, storage, network) at P50, P95, P99
- Load testing history and results for critical systems
- Auto-scaling configuration and effectiveness
- Performance SLAs and actual attainment (latency, throughput, error rate)
- Capacity planning process: demand forecasting accuracy, lead time for provisioning
- Database performance: query optimization, indexing strategy, connection pool management
- CDN and caching strategy effectiveness

### Dimension 6: Vendor Assessment

**Scope**: Health, viability, and strategic alignment of technology vendors.

**Assessment Criteria**:
- Vendor financial health (public filings, funding status, market position)
- Product roadmap alignment with organizational strategy
- Vendor lock-in assessment: data portability, API openness, contractual exit terms
- Support quality: SLA attainment, escalation effectiveness, assigned resource quality
- Vendor concentration risk: dependency on single vendors for critical capabilities
- Contract renewal timeline and negotiation leverage analysis

### Dimension 7: License Optimization

**Scope**: Ensuring technology investments are right-sized and cost-efficient.

**Assessment Criteria**:
- License utilization rate by product (active users / licensed seats)
- Shelfware identification (purchased but unused capabilities)
- License model appropriateness (per-seat, consumption, enterprise agreement)
- True-up risk assessment for consumption-based models
- Open source alternative analysis for commercial tools with low differentiation
- Negotiation leverage: competitive alternatives, contract timing, multi-year discount structures

### Dimension 8: Data Architecture

**Scope**: How data is stored, modeled, moved, and made accessible across the technology landscape.

**Assessment Criteria**:
- Data platform strategy: warehouse, lakehouse, data mesh, or hybrid
- Data modeling standards: dimensional modeling, entity-relationship, or graph
- Data pipeline architecture: ETL vs. ELT, batch vs. streaming, orchestration tooling
- Data catalog and discoverability: metadata management, lineage tracking
- Master data management: golden record strategy, duplicate detection, merge rules
- Data quality framework: profiling, validation, monitoring, remediation workflows

### Dimension 9: Cloud Maturity

**Scope**: Progress along the cloud adoption journey from lift-and-shift to cloud-native.

**Assessment Criteria (aligned with Cloud Adoption Framework)**:
- Workload distribution: on-premises, IaaS, PaaS, SaaS, serverless
- Cloud-native adoption: containerization, orchestration (Kubernetes), microservices
- Multi-cloud or hybrid strategy: intentional vs. accidental, management tooling
- FinOps maturity: cost visibility, allocation, optimization, forecasting
- Cloud Center of Excellence: landing zone standards, reference architectures, guardrails

### Dimension 10: DevOps and CI/CD

**Scope**: Software delivery velocity, reliability, and automation maturity.

**Assessment Criteria (DORA Metrics)**:
- Deployment frequency: how often code reaches production
- Lead time for changes: commit to production elapsed time
- Change failure rate: percentage of deployments causing incidents
- Mean time to restore: elapsed time from incident to resolution
- CI/CD pipeline coverage: percentage of applications with automated build, test, deploy
- Infrastructure as Code (IaC) adoption: percentage of infrastructure provisioned via code
- Environment parity: consistency between dev, staging, and production

### Dimension 11: Disaster Recovery and Business Continuity (RPO/RTO)

**Scope**: Organizational preparedness for technology failures and catastrophic events.

**Key Metrics**:
- **Recovery Point Objective (RPO)**: Maximum acceptable data loss measured in time. RPO = 0 means no data loss tolerated (synchronous replication required).
- **Recovery Time Objective (RTO)**: Maximum acceptable downtime. RTO = 0 means immediate failover required (active-active architecture).

**Assessment Criteria**:
- RPO/RTO defined and documented for all Tier 1 and Tier 2 systems
- Backup strategy: frequency, retention, geographic distribution, encryption
- DR testing: frequency, scope, results, gap remediation tracking
- Runbook completeness and currency for DR scenarios
- Communication plan: internal and external notification procedures
- Dependencies: third-party service DR alignment, SLA coverage

### Dimension 12: Compliance

**Scope**: Regulatory and standards compliance relevant to the technology landscape.

**Assessment Criteria**:
- Applicable regulatory frameworks (GDPR, CCPA/CPRA, HIPAA, SOX, PCI-DSS, industry-specific)
- Compliance monitoring: automated vs. manual, continuous vs. periodic
- Audit readiness: evidence collection automation, control documentation currency
- Data sovereignty: awareness and enforcement of data residency requirements
- Record retention: policy compliance, automated lifecycle management
- Compliance debt: known gaps, remediation timelines, risk acceptance documentation

### Dimension 13: Internal Tool UX

**Scope**: The experience quality of tools used by employees, often overlooked in technology audits.

**Assessment Criteria**:
- Employee satisfaction surveys specific to technology tools
- Task completion efficiency: clicks/steps required for common workflows
- Training burden: time required to onboard new employees on internal tools
- Workaround prevalence: percentage of users employing unofficial workarounds
- Accessibility compliance: WCAG adherence for internal applications
- Mobile enablement: field workforce and remote worker tool accessibility

### Dimension 14: Innovation Readiness

**Scope**: The organization's capacity to evaluate, pilot, and adopt emerging technologies.

**Assessment Criteria**:
- Innovation budget: dedicated allocation vs. discretionary
- Experimentation infrastructure: sandbox environments, proof-of-concept process
- Emerging technology tracking: formal technology radar or equivalent
- Time from proof-of-concept to production deployment
- AI/ML readiness: data maturity, talent, governance, ethical framework
- Patent/IP portfolio and R&D investment trajectory

### Dimension 15: Skills and Team Capability

**Scope**: The technical talent dimension -- distinct from the People dimension in gap analysis, which covers broader workforce concerns.

**Assessment Criteria**:
- Skills inventory: documented, current, and gap-analyzed
- Critical role dependency: single points of failure in technical knowledge
- Recruitment pipeline: time-to-fill for technical roles, offer acceptance rate
- Training investment: budget per capita, certification attainment rates
- Vendor vs. internal capability balance: strategic skills insourced, commodity skills outsourced
- Community of Practice activity: knowledge sharing, internal tech talks, open source contribution

---

## Report Structure

Every technology audit deliverable must follow this structure:

### 1. Executive Summary (2-3 pages max)
- Overall technology health assessment with composite score
- Top 3 risks requiring immediate attention (Red items)
- Top 3 opportunities for value creation
- Investment requirement summary (order of magnitude)

### 2. Scope and Methodology
- Systems and domains in scope / explicitly out of scope
- Data collection methods (interviews, system access, document review, automated scanning)
- Assessment frameworks applied and scoring methodology
- Limitations and caveats

### 3. Current State Assessment by Domain
- Each of the 15 dimensions assessed with evidence, scoring, and color coding
- Cross-cutting themes identified across dimensions

### 4. Risk Matrix
- Likelihood vs. Impact matrix for all identified technology risks
- Risk categorization: Operational, Security, Financial, Strategic, Compliance
- Risk ownership assignment recommendations

### 5. Recommendations and Roadmap
- Prioritized recommendations with effort/impact classification
- Dependency mapping between recommendations
- Phased roadmap (Quick Wins / Tactical / Strategic / Transformational)
- Decision criteria for Build vs. Buy vs. Partner for each recommendation

### 6. Investment Analysis (Forrester TEI Methodology)
- Total Economic Impact calculation for top recommendations
- Four-dimensional analysis: Cost Savings, Benefits, Flexibility, Risk
- Three-year NPV projection with sensitivity analysis
- Payback period for each major investment

### 7. Appendices
- Detailed system inventory
- Full scoring matrices
- Interview summary (anonymized)
- Technical deep-dive findings
- Glossary of terms

---

## Color Coding System

Applied to every system, capability, and dimension assessed:

| Color | Meaning | Action Required |
|-------|---------|----------------|
| **Green** (Keep) | Healthy, well-maintained, aligned with strategy. No significant risks or gaps. | Continue current investment and maintenance cadence. |
| **Yellow** (Review) | Functional but showing signs of strain, approaching end-of-life, or misaligned with future direction. | Schedule formal review within 6 months. Develop contingency plan. |
| **Red** (Retire) | Actively creating risk, significantly impeding operations, end-of-life/support, or fundamentally misaligned with strategy. | Initiate replacement or decommissioning plan immediately. Include in next budget cycle. |

Color assignment must be evidence-based. A system is not Red simply because it is old; it is Red because its age creates demonstrable risk or operational impact.

---

## Forrester TEI Calculation Methodology

For each major technology investment recommendation, compute the Total Economic Impact across four pillars:

### Cost Savings
Direct cost reductions: license consolidation, infrastructure right-sizing, manual labor elimination, vendor consolidation.
Quantification: Current annual cost minus projected annual cost, year-over-year for three years.

### Benefits
Revenue enablement, productivity improvement, customer experience enhancement, speed-to-market acceleration.
Quantification: Use conservative estimates. Apply a risk-adjustment factor (typically 10-25% reduction) to account for implementation uncertainty.

### Flexibility
Future optionality created by the investment: ability to scale, adopt new capabilities, enter new markets, or respond to disruption.
Quantification: Assign a probability-weighted value to the most likely future scenarios enabled.

### Risk
Quantification of risk reduced or eliminated by the investment. Also captures implementation risk (the risk that the investment itself fails to deliver projected value).
Risk adjustment: Apply organization-specific implementation risk factor based on historical project success rates.

### Composite Calculation

```
TEI = NPV(Cost Savings + Benefits + Flexibility - Implementation Costs) x Risk Adjustment Factor
```

Present as a three-year cash flow model with:
- Initial investment (Year 0)
- Annual costs and benefits (Years 1-3)
- Cumulative NPV
- Payback period
- Internal rate of return (IRR)

---

## SQALE Technical Debt Ratio -- Detailed Application

### Step 1: Categorize Debt Items
Assign each identified technical debt item to a SQALE characteristic:
- **Testability**: Missing tests, untestable architecture
- **Reliability**: Known defects, fragile components, missing error handling
- **Changeability**: Tight coupling, missing abstraction, hardcoded configuration
- **Efficiency**: Performance bottlenecks, resource waste, unoptimized queries
- **Security**: Known vulnerabilities, insecure patterns, missing input validation
- **Maintainability**: Code duplication, missing documentation, inconsistent patterns
- **Portability**: Platform dependencies, hardcoded paths, vendor lock-in at code level
- **Reusability**: Monolithic components, missing interfaces, copy-paste patterns

### Step 2: Estimate Remediation Cost
For each item, estimate the effort in person-hours to resolve. Use T-shirt sizing for initial assessment, then refine top items to hour estimates.

### Step 3: Compute TDR
Sum all remediation costs. Estimate development cost (total rebuild effort). Divide.

### Step 4: Trend Analysis
TDR at a single point in time is useful. TDR trending over time is powerful. If TDR is increasing quarter-over-quarter, the organization is accumulating debt faster than it is paying it down -- a trajectory that eventually results in system replacement.

---

## Anti-Patterns

1. **The Inventory Trap**: Spending 80% of the audit cataloging systems and 20% analyzing them. The inventory is a means, not an end. Prioritize depth of analysis on high-impact systems over completeness of the catalog.

2. **Shiny Object Syndrome**: Recommending emerging technologies (AI, blockchain, quantum) without establishing that foundational capabilities (integration, data quality, security) are sufficient to support them. Innovation readiness requires foundational maturity.

3. **Vendor Bias**: Allowing vendor relationships or partner incentives to influence technology recommendations. Every recommendation must be defensible on merit. Declare conflicts of interest.

4. **Security Theater Assessment**: Checking compliance boxes (firewalls exist, passwords have complexity rules) without testing actual security posture. Penetration testing results and incident history reveal more than policy documents.

5. **Cost-Only Lens**: Evaluating technology exclusively through cost reduction. Technology is also a revenue enabler, risk mitigator, and competitive differentiator. Forrester TEI exists precisely to capture all four value dimensions.

6. **Ignoring Shadow IT**: Declaring the audit complete based on sanctioned systems only. Shadow IT often exists because sanctioned tools fail to meet business needs -- it is a symptom, not just a compliance problem.

7. **Snapshot Without Trajectory**: Assessing current state without analyzing trajectory (improving, stable, or degrading). A system at Yellow and improving requires different action than a system at Yellow and degrading.

---

## Generation Instructions

When generating a technology audit deliverable, the AI agent must:

1. Collect evidence across all 15 dimensions. Do not skip dimensions due to data scarcity -- note the limitation and assess with available evidence.
2. Apply color coding (Green/Yellow/Red) to every assessed system and capability with documented rationale.
3. Compute SQALE TDR where code-level data is available. Where unavailable, use qualitative technical debt assessment from developer interviews.
4. Build the risk matrix with all identified risks plotted on likelihood vs. impact axes.
5. Apply Forrester TEI methodology to the top 3-5 investment recommendations.
6. Structure the report according to the seven-section template above.
7. Ensure the executive summary is genuinely executive-readable: no jargon, clear business implications, specific dollar figures.
8. Cross-reference technology findings with gap analysis results (if available) to identify where technology gaps are root causes of CX maturity gaps.
9. Include RPO/RTO assessment for all Tier 1 systems. Flag any system where actual recovery capability does not meet stated objectives.
10. Validate all anti-patterns are avoided before finalizing the deliverable.

---

## Cross-References

- [[anti-patterns/tech-audit]] -- Expanded anti-pattern analysis with case studies
- [[frameworks/architecture]] -- Enterprise architecture framework for deeper architectural assessment
- [[benchmarks/technology-adoption]] -- Industry benchmarks for technology adoption by vertical and company size
