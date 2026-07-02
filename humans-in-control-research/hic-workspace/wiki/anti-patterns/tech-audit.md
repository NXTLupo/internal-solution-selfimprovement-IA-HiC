---
id: anti-patterns/tech-audit.md
title: "Tech Audit Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, tech-audit, cobit, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/tech-audit.md#c0"
    char_span: [0, 2509]
    sentence_count: 7
    key_terms: [alternative, description, systems, vendor, recommendations, detection, inventory, criteria]
    concepts: [alternative, description, recommendations, systems, detection]
    related_chunks: ["anti-patterns/tech-audit.md#c4"]
    section: "AP-TECHAUDIT-01: Vendor Name Hallucination / AP-TECHAUDIT-02: Audit Without Inventory / AP-TECHAUDIT-03: Missing Shadow IT / AP-TECHAUDIT-04: No \"Do Nothing\" Cost Scenario"
    token_count: 505
  - id: "anti-patterns/tech-audit.md#c1"
    char_span: [2558, 3039]
    sentence_count: 3
    key_terms: [red, retirement, flagged, systems, review, keep, optimization, alternative]
    concepts: [retirement, flagged, systems, review]
    section: "AP-TECHAUDIT-05: Green-Lighting Everything"
    token_count: 113
  - id: "anti-patterns/tech-audit.md#c2"
    char_span: [3090, 3656]
    sentence_count: 4
    key_terms: [utilization, salesforce, marketing, cloud, used, organization, alternative, description]
    concepts: [utilization, salesforce, marketing, cloud]
    section: "AP-TECHAUDIT-06: Missing License Utilization"
    token_count: 114
  - id: "anti-patterns/tech-audit.md#c3"
    char_span: [3706, 4252]
    sentence_count: 1
    key_terms: [security, without, framework, generic, mapping, csf, nist, recommendations]
    concepts: [security, without, framework, generic, mapping]
    section: "AP-TECHAUDIT-07: Security Without Framework"
    token_count: 137
  - id: "anti-patterns/tech-audit.md#c4"
    char_span: [4298, 4824]
    sentence_count: 3
    key_terms: [recommendations, alternative, without, team, microservices, conditional, considering, description]
    concepts: [recommendations, alternative, without]
    related_chunks: ["anti-patterns/tech-audit.md#c0"]
    section: "AP-TECHAUDIT-08: No Skills Gap Analysis"
    token_count: 110
  - id: "anti-patterns/tech-audit.md#c5"
    char_span: [4885, 5379]
    sentence_count: 2
    key_terms: [business, trends, recommendations, alternative, description, connection, generative, operations]
    concepts: [business, trends]
    section: "AP-TECHAUDIT-09: Technology Without Business Alignment"
    token_count: 110
  - id: "anti-patterns/tech-audit.md#c6"
    char_span: [5429, 6006]
    sentence_count: 2
    key_terms: [dimensions, critical, equally, identical-length, approximately, superficially, architecture, alternative]
    concepts: [dimensions, critical, equally]
    section: "AP-TECHAUDIT-10: Audit as Checkbox Exercise"
    token_count: 111
---
# Tech Audit Anti-Patterns

Known failure modes for technology audit deliverables. Cross-reference: [[frameworks/tech-audit]]

---

### AP-TECHAUDIT-01: Vendor Name Hallucination
- **Description**: AI invents specific vendor names, product versions, or platform details not in the source corpus.
- **Detection Criteria**: Any vendor/product/version not found in [CHUNK_XXX] references.
- **Severity**: Critical
- **Example of Mistake**: "The organization uses Salesforce Marketing Cloud Enterprise with Pardot and Tableau."
- **Correct Alternative**: "CRM system identified [CHUNK_042] but vendor not specified. No analytics platform mentioned -- gap requiring stakeholder interview."
- **Root Cause**: LLMs fill gaps with plausible vendor names from training data.

### AP-TECHAUDIT-02: Audit Without Inventory
- **Description**: Assessing capabilities without first listing what technology exists.
- **Detection Criteria**: Recommendations referencing "existing systems" without preceding inventory table.
- **Severity**: Critical
- **Example of Mistake**: "The technology stack is moderately mature. Consolidate redundant systems."
- **Correct Alternative**: "Systems Inventory (22 platforms): [Table: System, Category, Vendor, Version, Users, Cost, Integration Status, Health]."
- **Root Cause**: AI skips tedious inventory to jump to interesting analysis.

### AP-TECHAUDIT-03: Missing Shadow IT
- **Description**: Audit considers only sanctioned systems, ignoring unofficial tools.
- **Detection Criteria**: No mention of shadow IT or discovery methodology.
- **Severity**: Major
- **Example of Mistake**: "Inventory includes all enterprise-licensed platforms."
- **Correct Alternative**: "Shadow IT: 8 unofficial tools found -- 3 shared Google Sheets as databases, 2 personal Zapier accounts, Notion bypassing Jira. Estimated shadow spend: $12K/year."
- **Root Cause**: AI only knows systems in source documents.

### AP-TECHAUDIT-04: No "Do Nothing" Cost Scenario
- **Description**: Recommendations without quantifying cost of maintaining status quo.
- **Detection Criteria**: Investment recommendations without comparison to current state costs.
- **Severity**: Major
- **Example of Mistake**: "Migrate to cloud. Investment: $1.2M."
- **Correct Alternative**: "Do Nothing: $680K/year current (escalating 15%/year). Migration: $1.2M + $320K/year. 3-year comparison: $2.04M vs $2.16M but with 99.95% uptime vs 97.2%."
- **Root Cause**: AI generates from "what should we do?" not "should we do anything?"

### AP-TECHAUDIT-05: Green-Lighting Everything
- **Description**: No systems flagged for retirement. Every tool gets "Keep and Optimize."
- **Detection Criteria**: No Red ratings, or fewer than 15% flagged for review/retirement.
- **Severity**: Major
- **Example of Mistake**: "All systems performing adequately with room for optimization."
- **Correct Alternative**: "12 Green (Keep), 6 Yellow (Review), 4 Red (Retire -- <10% utilization). Savings from retiring Red: $180K/year."
- **Root Cause**: AI avoids negative judgments.

### AP-TECHAUDIT-06: Missing License Utilization
- **Description**: Counting platforms without assessing capability utilization. Industry avg: only 33% of MarTech used (Gartner).
- **Detection Criteria**: No utilization percentages or feature adoption analysis.
- **Severity**: Major
- **Example of Mistake**: "Organization has Salesforce Enterprise with full Marketing Cloud."
- **Correct Alternative**: "Salesforce: 23 of 47 features used (49%). Marketing Cloud: only Email Studio and Journey Builder active. Recommend downgrade saving $45K/year."
- **Root Cause**: Utilization requires operational data AI lacks.

### AP-TECHAUDIT-07: Security Without Framework
- **Description**: Generic security concerns without mapping to NIST CSF, ISO 27001, or OWASP.
- **Detection Criteria**: Security recommendations without framework references.
- **Severity**: Major
- **Example of Mistake**: "Improve security by implementing encryption and access controls."
- **Correct Alternative**: "NIST CSF mapping: Identify 3.2/5 (incomplete asset inventory), Protect 2.8/5 (MFA at 68%), Detect 2.0/5 (no SIEM), Respond 1.5/5 (no IR plan)."
- **Root Cause**: AI generates generic security advice without framework structure.

### AP-TECHAUDIT-08: No Skills Gap Analysis
- **Description**: Technology recommendations ignoring whether the team can implement them.
- **Detection Criteria**: Recommendations without skills assessment or training plans.
- **Severity**: Minor
- **Example of Mistake**: "Migrate to microservices with Kubernetes."
- **Correct Alternative**: "Conditional: Team has 0 K8s experience. Required: 2 senior DevOps hires OR 6-month upskilling ($30K). Alternative: Managed containers (ECS/Fargate)."
- **Root Cause**: AI recommends ideal solutions without considering capacity.

### AP-TECHAUDIT-09: Technology Without Business Alignment
- **Description**: Recommendations driven by tech trends rather than business needs.
- **Detection Criteria**: No explicit connection to business KPIs or customer outcomes.
- **Severity**: Minor
- **Example of Mistake**: "Implement generative AI to modernize operations."
- **Correct Alternative**: "Deploy AI ticket routing (Business Objective: reduce resolution from 4.2 to 2.1 days). Expected: 35% fewer misroutes, saving 2.1 FTE."
- **Root Cause**: Technology trends dominate training data.

### AP-TECHAUDIT-10: Audit as Checkbox Exercise
- **Description**: All 15 dimensions covered equally shallow rather than going deep on the 3-5 that matter most.
- **Detection Criteria**: All dimensions approximately equal word count, none flagged as critical.
- **Severity**: Minor
- **Example of Mistake**: 15 identical-length paragraphs covering everything superficially.
- **Correct Alternative**: "Priority Dimensions: Data Architecture (critical), Integration Landscape (critical), Security (regulatory). Remaining 12 at summary level."
- **Root Cause**: AI treats all dimensions equally unless instructed to prioritize.
