---
id: anti-patterns/competitive.md
title: "Competitive Analysis Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, competitive, porter, blue-ocean, quality-gates]
evidence_count: 0
chunks:
  - id: "anti-patterns/competitive.md#c0"
    char_span: [0, 2025]
    sentence_count: 9
    key_terms: [analysis, feature, without, alternative, competitive, description, client, comparison]
    section: "AP-COMP-01: Feature Matrix Only / AP-COMP-02: Stale Intelligence / AP-COMP-03: Self-Congratulatory Analysis"
    token_count: 414
  - id: "anti-patterns/competitive.md#c1"
    char_span: [2070, 2680]
    sentence_count: 5
    key_terms: [strong, description, enterprise, mid-market, strategic, highest-probability, enterprise-grade, purpose-built]
    section: "AP-COMP-04: No Differentiation Insight"
    token_count: 128
  - id: "anti-patterns/competitive.md#c2"
    char_span: [2717, 3244]
    sentence_count: 3
    key_terms: [battlecard, sales, page, second-scannable, implementation, operator-grade, analyst-grade, integrations]
    section: "AP-COMP-05: Missing Battlecard"
    token_count: 125
  - id: "anti-patterns/competitive.md#c3"
    char_span: [3289, 3862]
    sentence_count: 2
    key_terms: [reviews, competitor, marketing, implementation, descriptions, acquisition, alternative, description]
    section: "AP-COMP-06: No Customer Sentiment Data"
    token_count: 130
  - id: "anti-patterns/competitive.md#c4"
    char_span: [3905, 4412]
    sentence_count: 5
    key_terms: [pricing, tco, comparison, effective, price, differentiation, implementation, capabilities]
    section: "AP-COMP-07: Missing Pricing Analysis"
    token_count: 121
  - id: "anti-patterns/competitive.md#c5"
    char_span: [4450, 4980]
    sentence_count: 5
    key_terms: [competitors, categorization, salesforce, hubspot, monday, notion, excel, com]
    section: "AP-COMP-08: Archetype Confusion"
    token_count: 117
  - id: "anti-patterns/competitive.md#c6"
    char_span: [5013, 5583]
    sentence_count: 2
    key_terms: [competitive, analysis, response, description, alternative, battlecards, prioritized, customers]
    section: "AP-COMP-09: No Action Plan"
    token_count: 123
  - id: "anti-patterns/competitive.md#c7"
    char_span: [5631, 6115]
    sentence_count: 2
    key_terms: [market, through, without, cagr, acceleration, quantitative, alternative, attribution]
    section: "AP-COMP-10: Data Without Source Citations"
    token_count: 117
---
# Competitive Analysis Anti-Patterns

Known failure modes for competitive analysis deliverables. Cross-reference: [[frameworks/competitive]]

---

### AP-COMP-01: Feature Matrix Only
- **Description**: Analysis reduced to feature comparison table. Missing strategy, positioning, sentiment, financials.
- **Detection Criteria**: Feature matrix present but lacking 10+ of the 15 required dimensions.
- **Severity**: Critical
- **Example of Mistake**: "Competitor Comparison: [checkmark table of features]"
- **Correct Alternative**: Feature matrix PLUS positioning analysis, customer sentiment, pricing/TCO, market share with trends, strategic direction, and Blue Ocean value curves.
- **Root Cause**: Feature comparison is easiest to generate. Without 15-dimension framework, AI defaults to simplest structure.

### AP-COMP-02: Stale Intelligence
- **Description**: Data older than 6 months presented without staleness warnings.
- **Detection Criteria**: Data points without dates, or data >6 months old without refresh flagging.
- **Severity**: Critical
- **Example of Mistake**: "Competitor X has 23% market share."
- **Correct Alternative**: "Competitor X: 23% share (IDC Q2 2025, CHUNK_087). Note: 10 months old. Given 15% annual growth, share likely shifted. Recommend refresh before strategic decisions."
- **Root Cause**: AI training data contains outdated statistics.

### AP-COMP-03: Self-Congratulatory Analysis
- **Description**: Client organization wins every dimension. Confirms biases rather than revealing threats.
- **Detection Criteria**: Subject rated highest on >60% of dimensions.
- **Severity**: Critical
- **Example of Mistake**: "Our client leads in quality, satisfaction, innovation, and presence."
- **Correct Alternative**: "Client leads in depth (4.2/5) and retention (92%). Trails in: pricing competitiveness (20-30% premium), time-to-market (6mo vs competitor's 6 weeks), self-service (NPS 18 vs competitor's 52)."
- **Root Cause**: AI biases toward positive findings when analyzing "for" a client.

### AP-COMP-04: No Differentiation Insight
- **Description**: Competitors listed but never answers "so what?" for strategy.
- **Detection Criteria**: Profiles without strategic implications or "What This Means" section.
- **Severity**: Major
- **Example of Mistake**: "A is strong in enterprise. B is strong in SMB. C is strong in healthcare."
- **Correct Alternative**: "Enterprise is a red ocean (3 incumbents, <5% switching). Highest-probability growth: mid-market where no purpose-built solutions exist. Position as 'enterprise-grade at mid-market simplicity.'"
- **Root Cause**: Description is easy; strategic synthesis requires explicit prompting.

### AP-COMP-05: Missing Battlecard
- **Description**: No one-page, 60-second-scannable sales battlecard.
- **Detection Criteria**: No battlecard section, or battlecard exceeding one page.
- **Severity**: Major
- **Example of Mistake**: 20-page analysis delivered to sales team.
- **Correct Alternative**: "BATTLECARD: WHY WE WIN: 3x faster implementation, unified platform. WHY WE LOSE: Deeper enterprise integrations. OBJECTION HANDLING: 'They're bigger' -> 'Size means slower.'"
- **Root Cause**: AI produces analyst-grade output when operator-grade is needed.

### AP-COMP-06: No Customer Sentiment Data
- **Description**: Analysis based on marketing materials, ignoring actual customer reviews.
- **Detection Criteria**: No G2/TrustRadius/Capterra references, no NPS comparison.
- **Severity**: Major
- **Example of Mistake**: "Competitor offers AI-powered analytics with seamless integration." (Marketing copy.)
- **Correct Alternative**: "Competitor (G2: 3.8/5, trending down from 4.1). Top complaints: 'Implementation took 8 months' (23 reviews), 'Support degraded since acquisition' (18 reviews)."
- **Root Cause**: AI defaults to official descriptions from training data.

### AP-COMP-07: Missing Pricing Analysis
- **Description**: Capabilities compared without addressing price, packaging, or TCO.
- **Detection Criteria**: No pricing table, TCO analysis, or pricing model comparison.
- **Severity**: Major
- **Example of Mistake**: Feature comparison with no cost information.
- **Correct Alternative**: "TCO (100 users, 3 years): Us $180K. A $240K. B $160K effective. C $150K effective. All converge at $150-180K -- differentiation is implementation speed, not price."
- **Root Cause**: AI lacks current pricing data.

### AP-COMP-08: Archetype Confusion
- **Description**: All competitors treated as competing identically -- no categorization by type.
- **Detection Criteria**: All competitors in one flat table without categorization.
- **Severity**: Minor
- **Example of Mistake**: "Competitors: Salesforce, HubSpot, Monday.com, Notion, Excel" -- same matrix.
- **Correct Alternative**: "Direct: Salesforce, HubSpot. Adjacent: Monday.com. Substitute: Excel (40% of SMBs). Potential: Notion. Strategy differs per archetype."
- **Root Cause**: AI lacks market structure understanding.

### AP-COMP-09: No Action Plan
- **Description**: Analysis ends at description. No competitive response strategy.
- **Detection Criteria**: No strategic response section or prioritized actions.
- **Severity**: Minor
- **Example of Mistake**: "The competitive landscape is dynamic with several strong players."
- **Correct Alternative**: "90-Day Response: (1) Update battlecards for A's new pricing, (2) Win/loss analysis on last 20 deals vs B, (3) Build competitive demo script, (4) Launch switch program targeting C's unhappy customers."
- **Root Cause**: Analysis is a natural stopping point for AI.

### AP-COMP-10: Data Without Source Citations
- **Description**: Market share, growth rates presented without attribution.
- **Detection Criteria**: Any quantitative claim without [CHUNK_XXX] or named source.
- **Severity**: Minor
- **Example of Mistake**: "Market expected to grow at 15% CAGR through 2028."
- **Correct Alternative**: "CX platform market: 14.8% CAGR through 2028 (Gartner, September 2025, CHUNK_091). Note: Pre-dates AI acceleration trend."
- **Root Cause**: AI generates plausible statistics from training data.
