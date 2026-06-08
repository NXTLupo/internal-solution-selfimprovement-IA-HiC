---
id: frameworks/architecture.md
title: "Technology Architecture Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [architecture, c4-model, togaf, well-architected, system-design]
evidence_count: 0
chunks:
  - id: "frameworks/architecture.md#c0"
    char_span: [0, 798]
    sentence_count: 5
    key_terms: [architecture, well-architected, specification, technology, framework, provides, model, togaf]
    section: Canonical Framework
    token_count: 138
  - id: "frameworks/architecture.md#c1"
    char_span: [827, 3354]
    sentence_count: 19
    key_terms: [architecture, section, state, business, capabilities, technical, cost, debt]
    section: Required Sections (20)
    token_count: 508
  - id: "frameworks/architecture.md#c2"
    char_span: [3356, 5812]
    sentence_count: 16
    key_terms: [data, section, management, container, integration, address, level, architecture]
    section: Required Sections (20)
    token_count: 476
  - id: "frameworks/architecture.md#c3"
    char_span: [5814, 8299]
    sentence_count: 15
    key_terms: [architecture, section, technology, deployment, adrs, availability, state, measurement]
    section: Required Sections (20)
    token_count: 491
  - id: "frameworks/architecture.md#c4"
    char_span: [8301, 9536]
    sentence_count: 6
    key_terms: [architecture, risks, migration, risk, strategy, organizational, probability, governance]
    section: Required Sections (20)
    token_count: 241
  - id: "frameworks/architecture.md#c5"
    char_span: [9582, 11501]
    sentence_count: 11
    key_terms: [architecture, integration, address, define, personalization, real-time, management, data]
    section: CX-Specific Architecture Considerations
    token_count: 334
  - id: "frameworks/architecture.md#c6"
    char_span: [11545, 13012]
    sentence_count: 8
    key_terms: [architecture, security, everything, technology, rationale, components, generated, reference]
    section: Anti-Patterns (Generation Must Avoid)
    token_count: 239
  - id: "frameworks/architecture.md#c7"
    char_span: [13032, 14043]
    sentence_count: 1
    key_terms: [minimum, section, adr, checklist, decisions, migration, contains, register]
    section: Quality Gates
    token_count: 232
  - id: "frameworks/architecture.md#c8"
    char_span: [14073, 15540]
    sentence_count: 4
    key_terms: [architecture, technology, solutions, business, decision, document, warrants, address]
    section: Generation Instructions
    token_count: 295
  - id: "frameworks/architecture.md#c9"
    char_span: [15563, 15943]
    sentence_count: 1
    key_terms: [architecture, frameworks, anti-patterns, framework, strategy, architectures, requirements, evaluating]
    section: Cross-References
    token_count: 72
---
# Technology Architecture Framework Specification

## Canonical Framework

**C4 Model (Simon Brown)** + **TOGAF ADM (The Open Group)** + **AWS/Azure Well-Architected Framework**

This specification governs the generation, review, and validation of all technology architecture deliverables. The C4 Model provides the visualization hierarchy (Context, Container, Component, Code). TOGAF ADM provides the iterative architecture development method and governance structure. The Well-Architected frameworks provide the lens-based evaluation of operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.

No architecture deliverable may be approved without satisfying the section requirements, quality gates, and anti-pattern checks defined herein.

---

## Required Sections (20)

### Section 1: Executive Summary

A one-page synthesis for executive stakeholders. Must answer three questions: What is the architecture for? What are the key decisions? What does it cost in time, money, and risk? Use the SCR (Situation-Complication-Resolution) narrative structure. Include a single architecture decision summary table with columns: Decision, Rationale, Trade-off, Status.

### Section 2: Business Context and KPIs

Map every architectural decision to a business outcome. Include a business capability model showing which capabilities the architecture serves. Define KPIs that the architecture must support or enable -- these are not the architecture's own metrics (those belong in NFRs) but the business metrics the technology must not impede. Examples: customer acquisition cost, time-to-resolution, NPS impact, revenue per digital interaction.

### Section 3: Architecture Principles and Constraints

State 5-10 governing principles using the TOGAF format: Name, Statement, Rationale, Implications. Separate immutable constraints (regulatory, contractual, organizational) from design preferences. Every principle must be testable -- "prefer loosely coupled services" is insufficient; "all service-to-service communication must use asynchronous messaging except where synchronous response is required within 200ms SLA" is testable.

### Section 4: Scope

Define explicit boundaries using an IN/OUT table. List systems, capabilities, and domains that are in scope. List adjacent systems that are out of scope but require integration consideration. State the architecture's time horizon (typically 18-36 months for target state).

### Section 5: Current State Assessment and Technical Debt

Document the as-is architecture with the same rigor as the target state. Include a technical debt register with columns: Debt Item, Category (code/design/infrastructure/test), Business Impact (quantified), Remediation Cost, Interest Rate (cost of inaction per quarter), Priority. Use the Technical Debt Quadrant (Martin Fowler): Reckless-Deliberate, Reckless-Inadvertent, Prudent-Deliberate, Prudent-Inadvertent.

### Section 6: Future State (Target Architecture)

The aspirational end state. Must be described in terms of capabilities delivered, not technologies chosen. Technology choices appear in Section 14. The future state must demonstrate clear resolution of problems identified in the current state assessment and must trace to business KPIs from Section 2.

### Section 7: C4 Level 1 -- System Context Diagram

Shows the system as a single box surrounded by its users (personas, roles) and external systems it interacts with. Every arrow must be labeled with the interaction type (REST API, event stream, file transfer, manual process). Include trust boundaries. This diagram must be understandable by non-technical stakeholders in under 60 seconds.

### Section 8: C4 Level 2/3 -- Container and Component Diagrams

**Level 2 (Container):** Decompose the system into containers -- applications, data stores, message brokers, file systems. Show technology choices per container. Show communication protocols between containers.

**Level 3 (Component):** For each container that warrants deeper decomposition, show internal components, their responsibilities, and their interactions. Not every container requires Level 3 -- apply judgment based on complexity and risk.

All diagrams must use the C4 notation conventions: blue for internal, grey for external, dashed lines for async, solid for sync.

### Section 9: Data Architecture

Define the data model at a conceptual level (entities and relationships, not table schemas). Include data flow diagrams showing how data moves through the system. Address data ownership, master data management, data lineage, and data quality rules. For CX architectures, this section must address Customer Data Platform (CDP) integration, identity resolution strategy, consent management, and the unified customer profile schema.

### Section 10: Integration Architecture

Document all integration points using a standardized format: Source, Target, Protocol, Pattern (request-reply/pub-sub/batch/streaming), Data Format, Volume, SLA, Error Handling Strategy. For CX platforms, address omnichannel orchestration using MACH principles (Microservices, API-first, Cloud-native, Headless). Define the API strategy: API gateway placement, versioning policy, rate limiting, authentication mechanism.

### Section 11: Security Architecture

Apply defense-in-depth. Address: identity and access management (IAM), network segmentation, encryption (at rest, in transit, in use), secrets management, vulnerability management, incident response integration, compliance mapping (GDPR, SOC2, PCI-DSS as applicable). Include a threat model using STRIDE or MITRE ATT&CK. For CX architectures, specifically address PII handling, consent enforcement at the API layer, and data residency requirements.

### Section 12: Scalability and Performance Targets

Quantify expected load profiles: peak concurrent users, transactions per second, data volume growth rate. Define scaling strategy (horizontal/vertical, auto-scaling triggers). Include capacity planning assumptions and their expiry dates. State performance budgets: page load time, API response time (p50, p95, p99), throughput floors.

### Section 13: Deployment Topology

Document the deployment model: cloud provider(s), regions, availability zones, container orchestration platform, CI/CD pipeline architecture. Include environment strategy (dev/staging/production/DR). Address infrastructure-as-code approach and drift detection. Show the deployment pipeline from commit to production with gate stages.

### Section 14: Technology Stack with Rationale

For every technology choice, provide: Technology Name, Version, Purpose, Alternatives Considered, Selection Rationale, Risk, License, Support Model. Group by layer (presentation, application, data, infrastructure). Technology choices must trace to architecture principles from Section 3.

### Section 15: Non-Functional Requirements with Quantified SLAs

Every NFR must follow the Planguage format or equivalent measurable specification. Avoid subjective language. Structure: NFR Category, Requirement Statement, Target Value, Minimum Acceptable Value, Measurement Method, Measurement Frequency. Categories: Availability, Performance, Scalability, Security, Maintainability, Observability, Disaster Recovery (RTO/RPO), Accessibility (WCAG level).

### Section 16: Architecture Decision Records (ADRs)

Use the Nygard ADR format for all significant decisions:
- **Title:** Short noun phrase (ADR-001: Use Event-Driven Architecture for Order Processing)
- **Status:** Proposed / Accepted / Deprecated / Superseded
- **Context:** The forces at play, including technical, political, and project-specific constraints
- **Decision:** The change being proposed or enacted, stated in full sentences
- **Consequences:** What becomes easier, what becomes harder, what new risks emerge

Maintain ADRs as living documents. Superseded ADRs must reference their replacement. Minimum 5 ADRs for any non-trivial architecture.

### Section 17: Gap Analysis

Map current state to future state using a structured gap register: Capability, Current Maturity (1-5), Target Maturity, Gap Description, Remediation Approach, Estimated Effort, Dependencies. Use a heatmap visualization for executive communication.

### Section 18: Migration Architecture

Define the transition path from current to future state. Must include: migration strategy per component (strangler fig, parallel run, big bang with rollback, blue-green), data migration approach, rollback procedures, feature flagging strategy, and a defined point of no return for each phase. Address the "frozen caveman" anti-pattern -- do not assume current-state systems will remain unchanged during migration.

### Section 19: Risks and Mitigations

Use a risk register with quantified impact and probability: Risk ID, Description, Category (technical/organizational/external), Probability (1-5), Impact (1-5), Risk Score, Mitigation Strategy, Residual Risk, Owner. Include both technical risks (vendor lock-in, scalability ceiling) and organizational risks (skill gaps, change resistance). Top 5 risks must have fully developed mitigation plans, not single-line responses.

### Section 20: Governance Model

Define: Architecture Review Board composition, decision rights (RACI), review cadence, exception process, compliance monitoring approach, architecture fitness functions (evolutionary architecture), and the process for updating this architecture as conditions change. Reference TOGAF Architecture Governance framework.

---

## CX-Specific Architecture Considerations

### Customer Data Platform (CDP) Architecture

Address the CDP integration pattern: event collection layer, identity resolution engine, profile unification store, segmentation engine, activation layer. Define the real-time vs. batch processing split. Specify the identity graph approach (deterministic, probabilistic, or hybrid). Map to vendor-neutral capabilities before selecting specific CDP products.

### Omnichannel Orchestration (MACH Architecture)

Apply MACH principles to ensure channel-agnostic experience delivery. Define the experience orchestration layer that sits above individual channel implementations. Address: journey state management, cross-channel context passing, channel failover strategies, and consistent personalization across web, mobile, contact center, email, and emerging channels.

### Real-Time Personalization Architecture

Document the decisioning architecture: feature store, model serving infrastructure, A/B testing framework, real-time event processing (expected latency under 100ms for inline personalization). Address the cold-start problem for new users. Define the feedback loop from interaction data to model retraining.

### AI/ML Integration Architecture

Specify the ML platform architecture: model registry, feature store, training pipeline, serving infrastructure, monitoring and drift detection. Address responsible AI requirements: explainability, bias detection, human-in-the-loop escalation points. For generative AI components, define guardrails, content filtering, and hallucination mitigation strategies.

### Contact Center Cloud Architecture

Address CCaaS integration: telephony/SIP integration, IVR/IVA architecture, agent desktop integration, workforce management data flows, quality management recording architecture, real-time and historical reporting data pipelines. Define the escalation architecture from AI-assisted to human-assisted interactions.

---

## Anti-Patterns (Generation Must Avoid)

### Big Ball of Mud
Architecture that lacks discernible structure. Symptoms: no clear boundaries between components, shared databases across services, circular dependencies, "everything calls everything." The generated architecture must demonstrate clear separation of concerns with explicit, documented interfaces.

### Golden Hammer
Using one technology or pattern for everything regardless of fit. Every technology choice must include alternatives considered and a rationale that goes beyond familiarity. If the same technology appears in more than 60% of components, the document must explicitly justify this concentration.

### Security as Afterthought
Security considerations bolted on at the end rather than woven throughout. The generated document must reference security implications in integration architecture, data architecture, and deployment topology -- not only in the dedicated security section.

### Resume-Driven Architecture
Selecting technologies because they are fashionable rather than appropriate. Rationale must reference the specific problem being solved, not industry trends. Phrases like "modern," "cutting-edge," or "industry-leading" without quantified justification are prohibited.

### Diagram-Only Architecture
Architecture documents that consist primarily of diagrams with minimal written explanation. Every diagram must have accompanying narrative that explains the design rationale, not merely describes what the diagram shows.

---

## Quality Gates

An architecture deliverable must pass ALL of the following gates before approval:

| Gate | Criterion | Validation Method |
|------|-----------|-------------------|
| QG-A1 | All 20 sections present and substantive | Section checklist review |
| QG-A2 | Every technology choice has documented rationale | ADR and stack table audit |
| QG-A3 | All NFRs are quantified with measurement methods | NFR table completeness check |
| QG-A4 | C4 diagrams present at minimum Level 1 and Level 2 | Diagram inventory |
| QG-A5 | Security addressed in at least 3 sections beyond the security section | Cross-reference audit |
| QG-A6 | Migration path defined with rollback procedures | Migration section review |
| QG-A7 | No anti-patterns detected | Anti-pattern checklist scan |
| QG-A8 | Business KPIs traceable to architectural decisions | Traceability matrix |
| QG-A9 | Risk register contains minimum 10 risks with mitigations | Risk register count |
| QG-A10 | ADR log contains minimum 5 decisions | ADR count |

---

## Generation Instructions

When generating a Technology Architecture document:

1. **Start with business context.** Never begin with technology selection. Understand the problem space, stakeholders, and success criteria before proposing solutions.
2. **Apply the C4 model top-down.** Begin at Level 1 (Context) and decompose only where complexity warrants it. Not every container needs Level 3 detail.
3. **Run the TOGAF ADM phases mentally.** Preliminary (principles) -> Architecture Vision -> Business Architecture -> Information Systems Architecture -> Technology Architecture -> Opportunities and Solutions -> Migration Planning.
4. **Apply Well-Architected lenses.** After drafting the architecture, evaluate it against each pillar: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.
5. **Validate against anti-patterns.** Before finalizing, explicitly check for each listed anti-pattern and document the check.
6. **Quantify everything.** Replace adjectives with numbers. "High availability" becomes "99.95% uptime measured monthly." "Fast response" becomes "p95 API latency under 200ms."
7. **Write ADRs for every non-obvious decision.** If a competent architect might reasonably choose a different path, the decision warrants an ADR.
8. **Address CX-specific concerns.** Every architecture in this domain must address customer data, personalization, and omnichannel orchestration even if the primary scope is a single channel.

---

## Cross-References

- [[anti-patterns/architecture]] -- Common architecture anti-patterns with detection heuristics
- [[frameworks/tech-audit]] -- Technology audit framework for evaluating existing architectures
- [[frameworks/strategy]] -- CX strategy framework that provides the business context for architecture decisions
- [[frameworks/prd]] -- Product requirements that architecture must satisfy
