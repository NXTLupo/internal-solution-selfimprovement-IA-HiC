---
id: anti-patterns/architecture.md
title: "Architecture Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, architecture, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/architecture.md#c0"
    char_span: [0, 2546]
    sentence_count: 9
    key_terms: [architecture, service, technology, components, component, contracts, framework, data]
    section: "AP-ARCH-001: Big Ball of Mud / AP-ARCH-002: Golden Hammer"
    token_count: 431
  - id: "anti-patterns/architecture.md#c1"
    char_span: [2590, 3743]
    sentence_count: 3
    key_terms: [security, architecture, authentication, section, considerations, authorization, integrated, decision]
    section: "AP-ARCH-003: Security as Afterthought"
    token_count: 208
  - id: "anti-patterns/architecture.md#c2"
    char_span: [3798, 4851]
    sentence_count: 5
    key_terms: [targets, system, architecture, availability, quantitative, concurrent, recovery, latency]
    section: "AP-ARCH-004: Missing Non-Functional Requirements"
    token_count: 226
  - id: "anti-patterns/architecture.md#c3"
    char_span: [4903, 6005]
    sentence_count: 6
    key_terms: [alternatives, throughput, replay, kafka, adr, considered, rationale, streaming]
    section: "AP-ARCH-005: No Architecture Decision Records"
    token_count: 212
  - id: "anti-patterns/architecture.md#c4"
    char_span: [6050, 7108]
    sentence_count: 2
    key_terms: [diagram, written, architecture, constraints, operational, diagrams, design, deliverable]
    section: "AP-ARCH-006: Diagram-Only Architecture"
    token_count: 189
  - id: "anti-patterns/architecture.md#c5"
    char_span: [7161, 8344]
    sentence_count: 4
    key_terms: [lock-in, migration, abstraction, proprietary, aws, risk, documentation, architecture]
    section: "AP-ARCH-007: Vendor Lock-In Without Evaluation"
    token_count: 220
  - id: "anti-patterns/architecture.md#c6"
    char_span: [8386, 9405]
    sentence_count: 5
    key_terms: [architecture, target, migration, current-state, state, coexistence, plan, strangler]
    section: "AP-ARCH-008: Missing Migration Path"
    token_count: 184
  - id: "anti-patterns/architecture.md#c7"
    char_span: [9447, 10539]
    sentence_count: 4
    key_terms: [scaling, scalable, architecture, bottlenecks, concurrent, dimensions, horizontal, throughput]
    section: "AP-ARCH-009: No Scalability Targets"
    token_count: 223
  - id: "anti-patterns/architecture.md#c8"
    char_span: [10582, 11616]
    sentence_count: 2
    key_terms: [debt, architecture, technical, compromises, remediation, new, deliberate, inventory]
    section: "AP-ARCH-010: Ignoring Technical Debt"
    token_count: 180
---
# Architecture Anti-Patterns

Known failure modes in technology architecture deliverables. Use as negative few-shot examples during generation to ensure architecture documents are decision-ready and operationally grounded.

---

### AP-ARCH-001: Big Ball of Mud
- **Description**: The architecture lacks clear boundaries between components, domains, or services. Everything depends on everything else, making the system impossible to reason about, test, or evolve independently.
- **Detection Criteria**: Architecture diagram shows more than 60% of components with bidirectional dependencies. No clear domain boundaries or service contracts defined. Changing one component requires coordinated changes across three or more others.
- **Severity**: Critical
- **Example of Mistake**: A single "Application Layer" box connecting to a single "Database" box with no decomposition of internal domains, bounded contexts, or interface contracts.
- **Correct Alternative**: Components organized by domain boundary with explicit interface contracts (APIs, events, shared schemas). Dependencies are unidirectional where possible. Each bounded context owns its data store.
- **Root Cause**: AI generates architecture at the level of abstraction present in training data, which frequently depicts simplified overview diagrams rather than properly decomposed domain architectures.

### AP-ARCH-002: Golden Hammer
- **Description**: A single technology, framework, or pattern is applied to every component regardless of whether it is the best fit. The architecture is driven by familiarity rather than requirements analysis.
- **Detection Criteria**: Every service uses the same language, framework, and data store despite having fundamentally different workload characteristics (e.g., a real-time streaming service and a batch reporting service both using the same synchronous REST + PostgreSQL stack).
- **Severity**: Major
- **Example of Mistake**: All 12 microservices built with Spring Boot + PostgreSQL, including an event ingestion pipeline processing 50K events/second and a static content management service handling 10 requests/day.
- **Correct Alternative**: Technology selection justified per component based on workload characteristics: event pipeline uses Kafka + ClickHouse for high-throughput append-only writes; CMS uses a lightweight framework with SQLite.
- **Root Cause**: AI anchors on the most commonly represented technology stack in training data and applies it uniformly. Polyglot architecture requires explicit per-component reasoning.

### AP-ARCH-003: Security as Afterthought
- **Description**: Security considerations appear as a final section or footnote rather than being integrated into every architectural decision. Retrofitting security costs 3-10x more than building it in from the start.
- **Detection Criteria**: Security mentioned only in a standalone "Security Considerations" section at the end of the document. No security annotations on data flows, no threat model, no authentication/authorization architecture.
- **Severity**: Critical
- **Example of Mistake**: A 30-page architecture document with a two-paragraph "Security" section on page 29 that says "All communications will be encrypted and authentication will be implemented."
- **Correct Alternative**: Security integrated throughout: data flow diagrams annotated with encryption in transit and at rest, authentication/authorization architecture as a first-class section, threat model for each external interface, and security NFRs with measurable targets.
- **Root Cause**: AI generates architecture by component category and treats security as a cross-cutting concern to mention last rather than a foundational constraint to weave through every decision.

### AP-ARCH-004: Missing Non-Functional Requirements
- **Description**: The architecture specifies what the system does but not how well it must do it. Performance targets, availability SLAs, scalability ceilings, and disaster recovery objectives are absent.
- **Detection Criteria**: No NFR section, or NFRs stated without quantitative targets (e.g., "the system should be fast" instead of "p99 latency under 200ms for search queries at 1000 concurrent users").
- **Severity**: Critical
- **Example of Mistake**: "The system must be highly available and performant" with no defined RPO, RTO, throughput targets, or latency budgets.
- **Correct Alternative**: NFR table with measurable targets: "Availability: 99.95% monthly (max 22 min downtime/month). Search p99: <200ms at 1000 concurrent users. Recovery: RPO 1 hour, RTO 4 hours. Storage: support 10TB growth/year for 5 years."
- **Root Cause**: AI generates qualitative descriptions of desired behavior rather than quantitative engineering constraints because training data contains more narrative architecture documents than specification-grade ones.

### AP-ARCH-005: No Architecture Decision Records
- **Description**: The architecture presents decisions as facts without documenting the alternatives considered, trade-offs evaluated, or rationale for selection. Future teams cannot understand why choices were made.
- **Detection Criteria**: Technology and pattern selections stated without alternatives discussed, trade-off analysis, or decision rationale. No ADR section or linked ADR documents.
- **Severity**: Major
- **Example of Mistake**: "The system will use Kafka for event streaming" with no discussion of why Kafka was chosen over RabbitMQ, Amazon SQS, or Pulsar, and no documentation of the evaluation criteria.
- **Correct Alternative**: ADR format: "Decision: Kafka for event streaming. Context: need 50K events/sec sustained throughput with 7-day replay. Alternatives considered: RabbitMQ (insufficient throughput), SQS (no replay), Pulsar (team lacks expertise). Trade-off: higher operational complexity accepted for throughput and replay guarantees."
- **Root Cause**: AI presents conclusions with authority and does not naturally generate the deliberative process that produced them.

### AP-ARCH-006: Diagram-Only Architecture
- **Description**: The architecture consists of boxes-and-arrows diagrams with no accompanying written context, decision rationale, or operational documentation. Diagrams alone are ambiguous.
- **Detection Criteria**: Architecture deliverable is primarily or exclusively diagrams (C4, UML, or informal) with minimal prose explaining the design intent, constraints, and operational model.
- **Severity**: Major
- **Example of Mistake**: A C4 context diagram and container diagram with no written text explaining why the system is decomposed this way, what the key design constraints are, or how the system is operated.
- **Correct Alternative**: Each diagram accompanied by a written section covering: design intent, key constraints driving the structure, operational model (deployment, monitoring, incident response), and evolution strategy.
- **Root Cause**: AI may generate architecture as primarily structural/visual output, treating diagram generation as the terminal deliverable rather than as an illustration supporting written architectural reasoning.

### AP-ARCH-007: Vendor Lock-In Without Evaluation
- **Description**: The architecture deeply couples to a specific vendor's proprietary services without documenting the lock-in risk, evaluating alternatives, or providing an abstraction layer for future migration.
- **Detection Criteria**: Proprietary managed services used at more than three integration points with no abstraction layer, no multi-cloud contingency, and no lock-in risk assessment.
- **Severity**: Major
- **Example of Mistake**: Architecture uses AWS DynamoDB, AWS Step Functions, AWS Cognito, and AWS AppSync with direct SDK calls throughout, and no documentation of what migration to another provider would require.
- **Correct Alternative**: Lock-in risk assessment for each proprietary service. Abstraction layers at critical integration points. Documentation of migration effort estimates. Explicit acceptance of lock-in where the trade-off is justified (e.g., "DynamoDB lock-in accepted: 40% cost saving vs. self-managed, migration estimated at 3 person-months if needed").
- **Root Cause**: AI recommends the most commonly documented solutions from training data (typically major cloud providers) without analyzing vendor dependency as an architectural risk.

### AP-ARCH-008: Missing Migration Path
- **Description**: The architecture describes a target state without documenting how to get there from the current state. There is no phased migration plan, no coexistence strategy, and no rollback approach.
- **Detection Criteria**: Target architecture described in isolation with no current-state documentation, no transition architecture, and no migration phases.
- **Severity**: Major
- **Example of Mistake**: A microservices target architecture for a team currently running a monolith, with no strangler fig pattern, no parallel-run strategy, and no phased decomposition plan.
- **Correct Alternative**: Current-state architecture documented alongside target state. Migration plan with three to five phases, each delivering incremental value. Coexistence patterns (strangler fig, branch by abstraction) defined. Rollback criteria for each phase.
- **Root Cause**: AI generates target states because they are cleaner and more interesting to describe, and avoids the messy operational reality of migration planning.

### AP-ARCH-009: No Scalability Targets
- **Description**: The architecture claims to be "scalable" without defining what load it must support, what the scaling dimensions are, or where the scaling bottlenecks exist.
- **Detection Criteria**: The word "scalable" appears without accompanying numbers. No load modeling, no capacity planning, no identification of scaling bottlenecks.
- **Severity**: Major
- **Example of Mistake**: "The microservices architecture enables horizontal scalability" with no definition of target concurrent users, transaction throughput, or data volume growth projections.
- **Correct Alternative**: "Target: 10K concurrent users at launch, scaling to 100K within 18 months. Scaling dimensions: API gateway (horizontal, auto-scale at 70% CPU), search index (sharded by region, reshard at 500GB), event bus (partition-based, add partitions at 80% throughput capacity). Identified bottleneck: single-writer payment ledger, requires redesign at >5K TPS."
- **Root Cause**: AI uses "scalable" as a qualitative positive attribute rather than an engineering constraint that requires quantitative specification.

### AP-ARCH-010: Ignoring Technical Debt
- **Description**: The architecture presents a clean-slate design without acknowledging the existing technical debt that will constrain implementation, or creates new technical debt without documenting it.
- **Detection Criteria**: No technical debt inventory, no debt remediation plan, and no documentation of known compromises in the proposed architecture.
- **Severity**: Minor
- **Example of Mistake**: A new architecture layered on top of a legacy system with known data quality issues, but the architecture document assumes clean data inputs throughout.
- **Correct Alternative**: Technical debt inventory with severity ratings and remediation timeline. New architectural compromises documented as deliberate debt with payoff triggers (e.g., "Shared database between Service A and B is deliberate debt; split when either service exceeds 100 QPS independently").
- **Root Cause**: AI generates idealized architectures and avoids surfacing constraints, compromises, or inherited problems that would complicate the clean narrative.
