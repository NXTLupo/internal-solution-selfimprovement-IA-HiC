---
title: "Gap Analysis Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, gap-analysis, maturity-model, quality-gates]
evidence_count: 0
---

# Gap Analysis Anti-Patterns

Known failure modes when generating CX gap analysis deliverables. Cross-reference: [[frameworks/gap-analysis]]

---

### AP-GAP-01: Maturity Theater
- **Description**: Maturity scores assigned without behavioral evidence. Numbers appear precise but justified by vague assertions.
- **Detection Criteria**: Maturity scores without behavioral descriptions at each level, or without [CHUNK_XXX] evidence citations.
- **Severity**: Critical
- **Example of Mistake**: "Technology: 2.5/5 -- The organization has moderate technology capabilities."
- **Correct Alternative**: "Technology: 2.3/5 -- Level 2 behavior: CRM deployed but 41% adoption. Marketing automation purchased but only email campaigns active. CRM-MA integration via manual CSV export, not API."
- **Root Cause**: AI generates plausible scores but lacks domain knowledge to describe specific behavioral markers.

### AP-GAP-02: Uniform Target (Everything to Level 5)
- **Description**: All target maturity set to Level 5. Unrealistic -- Level 5 is world-class (1% of organizations per Gartner).
- **Detection Criteria**: All target scores at 4.5+ or no dimension-specific rationale for targets.
- **Severity**: Major
- **Example of Mistake**: "Target: People 5.0, Process 5.0, Technology 5.0, Data 5.0, Governance 5.0..."
- **Correct Alternative**: "Targets calibrated to strategy: Technology 4.0 (competitive differentiator), People 3.5 (adequate), Governance 3.0 (minimum viable -- compliance-driven), Data 4.5 (critical enabler)."
- **Root Cause**: AI defaults to "higher is better" without strategic prioritization.

### AP-GAP-03: No Business Impact Quantification
- **Description**: Gaps identified without translating to financial or operational impact.
- **Detection Criteria**: Gap items missing dollar amounts, revenue impact, cost exposure, or productivity metrics.
- **Severity**: Critical
- **Example of Mistake**: "Gap: Data governance underdeveloped. Impact: Data quality issues affect decision-making."
- **Correct Alternative**: "Gap: Data governance at 1.5 (vs target 3.0). Impact: 23% duplicate customer records causing $340K/year wasted marketing spend and 8.2hr/week analyst time on manual cleaning."
- **Root Cause**: Quantifying impact requires specific financial data AI lacks without wiki evidence pages.

### AP-GAP-04: Individual Gap Focus (Ignoring Root Cause Clusters)
- **Description**: Each gap treated independently when multiple gaps share a common root cause.
- **Detection Criteria**: More than 8 prioritized actions without clustering or root cause analysis.
- **Severity**: Major
- **Example of Mistake**: Separate actions for CRM quality, marketing attribution, sales alignment, and customer 360.
- **Correct Alternative**: "Root Cause Cluster: No unified CDP. This single root cause drives gaps in Data, Technology, Measurement, and Process. Closing it addresses 4 of 8 gaps. Investment: $650K. Savings: $1.2M/year."
- **Root Cause**: AI processes gaps linearly, not systemically.

### AP-GAP-05: Missing Remediation Timeline
- **Description**: Gaps identified but no actionable remediation roadmap.
- **Detection Criteria**: No Quick Win / Tactical / Strategic / Transformational categorization.
- **Severity**: Major
- **Example of Mistake**: "Address technology and data gaps as a priority."
- **Correct Alternative**: "Quick Wins (0-3mo): CRM dedup sprint. Tactical (3-6mo): CDP evaluation. Strategic (6-18mo): CDP implementation. Transformational (12-36mo): Predictive analytics platform."
- **Root Cause**: AI generates assessments but struggles with operational planning.

### AP-GAP-06: Generic Recommendations
- **Description**: Recommendations applicable to any organization regardless of specific gaps.
- **Detection Criteria**: Recommendations not referencing specific gap scores, evidence, or context.
- **Severity**: Major
- **Example of Mistake**: "Invest in employee training to improve CX capabilities."
- **Correct Alternative**: "Deploy CX certification for 23 frontline managers (People gap: 2.1 vs 3.5 target). Curriculum: NPS driver analysis (4hr), complaint root cause (8hr), service recovery (4hr). Budget: $45K."
- **Root Cause**: Without wiki evidence, AI defaults to universally-applicable advice.

### AP-GAP-07: All Gaps Same Severity
- **Description**: Every gap marked "High" -- eliminates prioritization value.
- **Detection Criteria**: More than 60% of gaps at same severity level.
- **Severity**: Minor
- **Example of Mistake**: "People: High. Process: High. Technology: High. Data: High."
- **Correct Alternative**: "Critical: Data (gap 2.8, $1.2M exposure). High: Technology (gap 2.3). Medium: Process (gap 1.5). Low: Culture (gap 0.8, improving)."
- **Root Cause**: AI avoids relative ranking without forced differentiation.

### AP-GAP-08: No Baseline Data
- **Description**: Current scores without historical baseline or trend data.
- **Detection Criteria**: No comparison to previous assessment, industry benchmarks, or peer group.
- **Severity**: Minor
- **Example of Mistake**: "Current Technology Maturity: 2.3"
- **Correct Alternative**: "Technology: 2.3 (up from 1.8 at Q2 2025 assessment). Industry median: 2.7. Peer group: 2.5. Trend: Improving but below peers."
- **Root Cause**: Without wiki benchmarks, AI has no reference points.

### AP-GAP-09: Spider Chart Without Action Plan
- **Description**: Radar visualization disconnected from prioritized actions.
- **Detection Criteria**: Radar chart present but no linked remediation initiatives.
- **Severity**: Minor
- **Example of Mistake**: Beautiful radar chart followed by generic text.
- **Correct Alternative**: Radar with 3 largest gaps highlighted, each linked to numbered initiatives.
- **Root Cause**: AI generates visualizations and text independently.

### AP-GAP-10: Ignoring Organizational Constraints
- **Description**: Targets assuming unlimited budget, talent, and organizational will.
- **Detection Criteria**: No budget estimates, resource requirements, or change management considerations.
- **Severity**: Minor
- **Example of Mistake**: "Full enterprise data transformation including CDP, real-time analytics, AI personalization."
- **Correct Alternative**: "Budget-Constrained ($500K/year): Phase 1: CRM data quality ($80K). Phase 2: Lightweight CDP. Phase 3: Defer AI to Year 2. Change management: Requires VP-level sponsor."
- **Root Cause**: AI optimizes for ideal solution without constraints.
