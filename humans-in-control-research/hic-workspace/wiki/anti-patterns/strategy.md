---
title: "Strategy Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, strategy, rumelt, quality-gates]
evidence_count: 0
---

# Strategy Anti-Patterns

Known failure modes when generating CX strategy documents. Cross-reference: [[frameworks/strategy]]

---

### AP-STRATEGY-01: Goals Masquerading as Strategy
- **Description**: "Increase revenue 20%" or "Become the market leader" presented as strategy. These are goals, not strategies.
- **Detection Criteria**: Strategy sections containing only target metrics or aspirational statements without diagnosis, guiding policy, or coherent actions.
- **Severity**: Critical
- **Example of Mistake**: "Our strategy is to increase NPS by 15 points and reduce churn by 20% through customer-centric transformation."
- **Correct Alternative**: "Diagnosis: Churn concentrated in months 2-4, driven by onboarding complexity (67% of churned users never complete setup). Guiding policy: Reduce time-to-first-value from 14 days to 3 days via progressive disclosure. Actions: (1) Redesign setup wizard to 3 steps, (2) Deploy contextual help, (3) CSM outreach at day-2 inactivity."
- **Root Cause**: AI training data contains thousands of 'strategic plans' that are actually goal lists.

### AP-STRATEGY-02: Fluff (Buzzwords Disguised as Concepts)
- **Description**: Sentences that sound strategic but contain no actionable content. Verbal fog substituting for clear thinking.
- **Detection Criteria**: Sentences containing 3+ banned phrases (see [[brand/anti-slop]]) or failing the "would a competitor say the same thing?" test.
- **Severity**: Critical
- **Example of Mistake**: "We will leverage cutting-edge AI solutions to deliver best-in-class seamless customer experiences through holistic digital transformation."
- **Correct Alternative**: "We will deploy Claude Opus 4.6 as a tier-1 support agent (handling 40% of current call volume), freeing 12 FTEs for complex case resolution, reducing AHT from 8.2 to 3.1 minutes."
- **Root Cause**: LLMs optimize for plausible-sounding text without explicit anti-slop constraints.

### AP-STRATEGY-03: Failure to Face the Challenge
- **Description**: The diagnosis avoids naming the hard problem. Lists surface symptoms without identifying the root cause.
- **Detection Criteria**: Diagnosis listing multiple disconnected problems without identifying the central challenge.
- **Severity**: Critical
- **Example of Mistake**: "Challenges include: declining satisfaction, aging technology, siloed teams, limited budget, competitive pressure."
- **Correct Alternative**: "The central challenge is organizational: CX ownership split across 4 VP-level fiefdoms with no single accountability point. Every cross-functional initiative dies in committee. Until governance is unified, individual improvements are local optimizations that don't compound."
- **Root Cause**: Naming the real problem is uncomfortable. AI avoids confrontational diagnosis.

### AP-STRATEGY-04: Bad Strategic Objectives
- **Description**: Objectives neither strategic (connected to guiding policy) nor measurable. They float without connecting to diagnosis or actions.
- **Detection Criteria**: Objectives applicable to any organization in any industry, or without success metrics.
- **Severity**: Major
- **Example of Mistake**: "Objective 3: Foster a culture of innovation and continuous improvement."
- **Correct Alternative**: "Objective 3: Establish weekly cross-functional CX sprint reviews (Product + Support + Engineering) with shared OKR: reduce ticket reopen rate from 23% to under 10% by Q3."
- **Root Cause**: Generic objectives are safe. Specific objectives create accountability.

### AP-STRATEGY-05: Boiling the Ocean
- **Description**: Strategy trying to solve everything. No prioritization, no hard choices about what NOT to do.
- **Detection Criteria**: More than 5 strategic pillars, more than 15 initiatives, or no items explicitly deprioritized.
- **Severity**: Major
- **Example of Mistake**: "8 Strategic Pillars: Digital Transformation, Customer Centricity, Data Analytics, Employee Experience, Innovation, Sustainability, Partnerships, Operational Excellence."
- **Correct Alternative**: "3 Pillars (MECE): (1) Unified Customer Data (foundation), (2) Intelligent Routing (highest ROI -- $2.3M/year), (3) Proactive Engagement (competitive moat). Deferred: sustainability initiative (revisit Q1 2027)."
- **Root Cause**: AI is reluctant to exclude. Strategy requires exclusion.

### AP-STRATEGY-06: No Coherent Actions
- **Description**: Good diagnosis and policy but no specific, coordinated actions. Think-piece, not a plan.
- **Detection Criteria**: Actions section missing, or actions that are vague, unassigned, or have no timeline.
- **Severity**: Major
- **Example of Mistake**: Strategy ends with one-sentence recommendations.
- **Correct Alternative**: Each action has: specific deliverable, owner/team, timeline, resource estimate, dependency chain, success metric, and connection to guiding policy.
- **Root Cause**: Generating actions requires domain-specific implementation knowledge.

### AP-STRATEGY-07: Kitchen Sink Strategy
- **Description**: Every stakeholder's pet initiative included to avoid conflict. Peace treaty, not analytical framework.
- **Detection Criteria**: Initiatives that contradict each other without acknowledging tension.
- **Severity**: Major
- **Example of Mistake**: Strategy simultaneously calls for "aggressive cost reduction" and "premium service investment."
- **Correct Alternative**: "We choose premium service investment knowing it increases short-term costs by ~12%. Justified by CLV multiplier: premium-tier customers generate 3.4x lifetime value."
- **Root Cause**: AI is conflict-averse. Good strategy requires saying no.

### AP-STRATEGY-08: Missing Investment Case
- **Description**: Recommending significant changes without quantifying costs, benefits, or risk scenarios.
- **Detection Criteria**: No dollar figures, no NPV/IRR, no scenario modeling, no payback period.
- **Severity**: Major
- **Example of Mistake**: "Recommendation: Implement an enterprise CDP."
- **Correct Alternative**: "Investment: $850K impl + $240K/year. Return: $1.8M incremental revenue Year 2. NPV at 10%: $1.2M over 3 years. Breakeven: Month 18. Pessimistic (50% adoption): breakeven Month 28."
- **Root Cause**: AI lacks financial modeling knowledge to generate realistic investment cases.

### AP-STRATEGY-09: No Quick Wins
- **Description**: Strategy entirely long-term with nothing to show in first 90 days.
- **Detection Criteria**: No items with timeline under 90 days.
- **Severity**: Minor
- **Example of Mistake**: All initiatives begin Q3 or later.
- **Correct Alternative**: "90-Day Quick Wins: (1) Fix broken password reset -- 340 tickets/month, 2 sprint fix, (2) Add order status SMS -- 15% call deflection, 1 sprint."
- **Root Cause**: AI focuses on comprehensiveness over sequencing.

### AP-STRATEGY-10: Communication Plan as Afterthought
- **Description**: "Communications" section that is clearly filler. No audience segmentation, cadence, or channel strategy.
- **Detection Criteria**: Communication plan under 5 lines, or identical messaging for all audiences.
- **Severity**: Minor
- **Example of Mistake**: "Regular updates to stakeholders via email and town halls."
- **Correct Alternative**: "Executive sponsor: Monthly board update. Steering committee: Bi-weekly standup. Teams: Weekly sprint review. All-hands: Quarterly town hall with customer story + metrics."
- **Root Cause**: Communication plans require audience empathy AI struggles with.
