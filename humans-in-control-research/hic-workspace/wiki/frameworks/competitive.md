---
title: "Competitive Analysis Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [competitive, porter, blue-ocean, battlecard, market-intelligence]
evidence_count: 0
---

# Competitive Analysis Framework

## Canonical Foundations

This framework integrates three complementary strategic models:

1. **Porter's Five Forces** (Michael Porter, 1979) -- structural analysis of industry competition. Assesses the fundamental attractiveness and profit potential of an industry by examining five forces that shape competitive intensity. Published in *Harvard Business Review* and expanded in *Competitive Strategy* (1980) and *Competitive Advantage* (1985).

2. **Blue Ocean Strategy** (W. Chan Kim and Renee Mauborgne, 2005) -- a framework for creating uncontested market space by simultaneously pursuing differentiation and low cost. Challenges the assumption that competition is a zero-sum game. The Strategy Canvas and ERRC Grid are the primary analytical tools.

3. **Battlecard Methodology** -- a practitioner framework from competitive intelligence (CI) and sales enablement disciplines. Translates strategic analysis into field-actionable artifacts that sales teams can use in live competitive situations.

The synthesis enables analysis at three levels: structural (Porter), strategic (Blue Ocean), and tactical (Battlecard).

---

## Two Analysis Modes

### Mode A: Named Entity Analysis

Used when specific competitors are identified and publicly researchable.

**Data Sources**: Public filings (10-K, 10-Q, proxy statements), G2/TrustRadius/Capterra reviews, job postings (signal for strategic priorities), patent filings, press releases, analyst reports (Gartner MQ, Forrester Wave, IDC MarketScape), LinkedIn employee counts, product documentation, pricing pages, customer case studies.

**Output**: Head-to-head comparison across all 15 dimensions with named competitors. Feature-level granularity. Direct quote extraction from review platforms.

**Constraints**: Only use publicly available information. Do not recommend or imply competitive intelligence gathering methods that violate ethical boundaries or terms of service.

### Mode B: Archetype Analysis

Used when the client is entering a new market, competitors are private/obscure, or strategic positioning is the primary concern rather than tactical battlecard preparation.

**Method**: Define competitor archetypes based on strategic positioning patterns:
- **The Incumbent**: Dominant market share, deep enterprise relationships, broad product portfolio, slow to innovate.
- **The Disruptor**: VC-funded, product-led growth, aggressive pricing, modern tech stack, limited enterprise features.
- **The Niche Specialist**: Deep domain expertise in a narrow segment, high switching costs within their niche, limited breadth.
- **The Platform Player**: Competing via ecosystem, marketplace, or integration network rather than individual features.
- **The Adjacent Entrant**: Large company entering from an adjacent market, leveraging existing customer relationships and brand.

**Output**: Analysis against archetype patterns rather than named entities. Focuses on strategic positioning and differentiation opportunities.

---

## The 15 Required Dimensions

### Dimension 1: Features and Capabilities

**Scope**: Functional comparison of product/service offerings at the capability level.

**Assessment Method**:
- Build a feature taxonomy organized by capability domain (not by product menu structure)
- Score each capability: Not Available, Basic, Standard, Advanced, Best-in-Class
- Identify table-stakes features (parity required) vs. differentiators (competitive advantage)
- Map feature roadmaps where publicly available (conference announcements, blog posts, beta programs)
- Flag capabilities where the client leads, trails, or is at parity

### Dimension 2: Pricing and Total Cost of Ownership (TCO)

**Scope**: Not just list price, but the full economic picture of adoption and operation.

**TCO Components**:
- License/subscription fees (per-seat, consumption, flat-rate)
- Implementation costs (professional services, integration, data migration)
- Training and change management costs
- Ongoing operational costs (administration, customization, maintenance)
- Hidden costs (overages, premium support tiers, required add-ons)
- Exit costs (data extraction, contract penalties, migration effort)

**Assessment Method**: Build a 3-year TCO model for a standardized customer profile. Normalize across competitors for apples-to-apples comparison.

### Dimension 3: Positioning and Messaging

**Scope**: How competitors present themselves to the market -- the narrative they use to create preference.

**Assessment Method**:
- Extract positioning statements from homepage, about page, and primary landing pages
- Identify the value proposition structure: For [audience] who [need], our [product] provides [benefit] unlike [alternative]
- Analyze messaging hierarchy: what do they lead with? What do they emphasize?
- Identify messaging evolution over time (Wayback Machine, press release timeline)
- Map positioning to a 2x2 framework (e.g., simplicity vs. power, vertical vs. horizontal)

### Dimension 4: Strengths and Weaknesses

**Scope**: Honest, evidence-based assessment of competitive advantages and vulnerabilities.

**Assessment Method**:
- Synthesize findings from all other dimensions into a SWOT-style summary per competitor
- Validate strengths with external evidence (customer reviews, analyst recognition, market share data)
- Validate weaknesses with external evidence (negative reviews, support complaints, employee Glassdoor feedback)
- Distinguish between structural strengths/weaknesses (hard to change) and tactical ones (can change quickly)

### Dimension 5: Market Share and Growth

**Scope**: Quantitative market position and trajectory.

**Assessment Method**:
- Absolute market share (revenue-based and unit-based where available)
- Market share trend: gaining, stable, or declining over 3-year window
- Revenue growth rate (public companies: annual report; private companies: estimated from headcount growth, funding rounds, job postings)
- Customer count and logo growth trajectory
- Segment-specific share: may dominate one segment while trailing in another

### Dimension 6: Customer Sentiment (G2 / TrustRadius / NPS)

**Scope**: The voice of actual customers as expressed on review platforms and in satisfaction data.

**Assessment Method**:
- Aggregate ratings from G2, TrustRadius, Capterra, and Gartner Peer Insights
- Analyze review volume and recency (stale reviews are less indicative)
- Extract top positive themes (what customers love) and top negative themes (what frustrates them)
- Track rating trajectory over time: improving or declining?
- Estimate NPS where available (some competitors publish it; others can be inferred from review sentiment distribution)
- Quote extraction: pull the 3-5 most telling positive and negative quotes per competitor

### Dimension 7: Technology Stack

**Scope**: The underlying technology choices that constrain or enable competitive capabilities.

**Assessment Method**:
- Public technology indicators: job postings (frameworks, languages, platforms), engineering blog posts, conference talks, GitHub repositories
- Architecture style: monolith, microservices, serverless, hybrid
- Cloud platform: AWS, Azure, GCP, multi-cloud, on-premises options
- AI/ML capabilities: what models, what use cases, build vs. buy
- Mobile approach: native, hybrid, responsive web
- API strategy: public API availability, developer ecosystem

### Dimension 8: Go-to-Market Strategy

**Scope**: How competitors acquire and expand customers.

**Assessment Method**:
- Primary GTM motion: enterprise sales, product-led growth (PLG), channel/partner, hybrid
- Sales model: inside sales, field sales, self-serve, combination
- Marketing approach: content marketing, paid acquisition, events, analyst relations, community
- Free tier or trial strategy: freemium, free trial duration, feature limitations
- Land-and-expand indicators: initial deal size vs. expansion revenue trajectory
- Sales cycle length (inferred from job postings, case studies, analyst commentary)

### Dimension 9: Distribution and Channels

**Scope**: The pathways through which competitors reach customers.

**Assessment Method**:
- Direct vs. channel mix: percentage of revenue through partners
- Marketplace presence: AWS Marketplace, Azure Marketplace, Salesforce AppExchange, etc.
- System integrator and consulting partnerships
- Technology partnerships and OEM arrangements
- Referral and affiliate programs
- Geographic distribution model: direct presence vs. distributor network

### Dimension 10: Customer Base

**Scope**: Who the competitor serves and the characteristics of their installed base.

**Assessment Method**:
- Customer count: total and by segment (enterprise, mid-market, SMB)
- Logo quality: marquee customers that signal market credibility
- Industry vertical concentration or diversification
- Geographic distribution of customer base
- Customer size profile: average deal size, largest customers, long tail
- Churn indicators: customer testimonial currency, case study age, logo removal from website

### Dimension 11: Financial Health

**Scope**: The competitor's financial capacity to invest, compete, and sustain operations.

**Assessment Method**:
- Public companies: Revenue, revenue growth, gross margin, operating margin, cash position, R&D spend (% of revenue), customer acquisition cost trends
- Private companies: Funding history (total raised, last round size, valuation), investor quality, burn rate estimates (headcount x average comp), runway estimate
- Profitability trajectory: path to profitability or sustainable unit economics
- Financial risk indicators: layoffs, office closures, executive departures, down rounds

### Dimension 12: Innovation and R&D

**Scope**: The competitor's capacity and commitment to building future capabilities.

**Assessment Method**:
- R&D investment: absolute spend and percentage of revenue
- Patent filing activity and patent portfolio composition
- Product release velocity: major releases, minor releases, patch frequency
- Innovation signals: research publications, conference presentations, open-source contributions
- Acquisition history: acqui-hires, technology acquisitions, strategic acquisitions
- Technology partnership announcements (often signal R&D direction)

### Dimension 13: Partnerships and Ecosystem

**Scope**: The network of relationships that extend the competitor's reach and capability.

**Assessment Method**:
- Technology partnerships: integrations, co-development, embedded relationships
- Channel partnerships: resellers, referral partners, managed service providers
- Strategic alliances: co-marketing, co-selling, joint solutions
- Ecosystem health: partner count, partner growth trajectory, partner satisfaction
- Dependency risks: over-reliance on a single platform partner

### Dimension 14: Geographic Presence

**Scope**: Where the competitor operates and the depth of their geographic coverage.

**Assessment Method**:
- Headquarters and office locations (LinkedIn data, careers page)
- Revenue distribution by region (public filings or estimated)
- Localization: language support, regional compliance, local data residency
- Regional market position: may be dominant in one region and marginal in another
- International expansion trajectory: recent office openings, new language support, regional partnerships

### Dimension 15: Leadership and Culture

**Scope**: The people, values, and organizational character that shape competitive behavior.

**Assessment Method**:
- Leadership team: backgrounds, tenure, prior companies, domain expertise
- Founder status: founder-led vs. professional management (different risk/innovation profiles)
- Glassdoor/Blind ratings: overall score, CEO approval, culture and values, work-life balance
- Company values and mission statement: aspirational vs. operational
- DEI commitments and public reporting
- Employer brand: ability to attract top talent (acceptance rates, tenure data)

---

## Required Visualizations

### 1. Positioning Map (2x2 Matrix)

Select two strategic dimensions most relevant to the competitive landscape. Common axis pairs:
- Ease of Use vs. Depth of Functionality
- Price vs. Feature Richness
- Vertical Focus vs. Horizontal Breadth
- Innovation Speed vs. Enterprise Readiness

Plot the client and all competitors as circles sized by market share. Include arrows showing directional movement over the past 12-24 months.

### 2. Feature Matrix

Rows: capability categories and individual features.
Columns: client and each competitor.
Cells: availability and maturity rating (Not Available / Basic / Standard / Advanced / Best-in-Class).
Color coding for quick scanning: dark green (Best-in-Class), green (Advanced), yellow (Standard), orange (Basic), red (Not Available).

### 3. Strategy Canvas (Value Curves)

Derived from Blue Ocean Strategy. The strategy canvas plots competitors on a set of value factors with connected lines forming each competitor's "value curve."

**Construction**:
- X-axis: 8-12 value factors that the industry competes on (derived from customer research and competitive analysis)
- Y-axis: Offering level (Low to High)
- Plot one curve per competitor
- The client's current curve and desired future curve should both be shown

**Interpretation**: Where curves converge, the industry competes on parity factors. Where curves diverge, differentiation exists. The Blue Ocean opportunity lives where the client can create a fundamentally different curve shape.

### 4. Radar/Spider Chart

Plot all 15 dimensions (or a selected subset) on a radar chart with one trace per competitor. Useful for quick visual comparison of competitive profiles.

---

## Battlecard Specification

### Format Constraints
- **One page maximum** (front only; back is optional for supporting data)
- **60-second scannable**: A sales rep must be able to extract the key points in under one minute during a live call
- **Updated quarterly** at minimum; triggered updates when competitor makes major announcement

### Required Sections

**Section 1: Why We Win**
- 3-5 bullet points. Each bullet: specific, evidence-backed, and tied to a customer outcome (not a feature).
- Format: "[Capability] enables [customer outcome], which competitors cannot match because [structural reason]."
- Include one proof point per bullet (customer quote, case study metric, analyst validation).

**Section 2: Why We Lose**
- 3-5 bullet points. Honest assessment of scenarios where the competitor has a genuine advantage.
- This section builds credibility with the sales team. If it reads as marketing fluff, the entire battlecard loses trust.
- Format: "[Scenario/requirement] favors [competitor] because [specific reason]. Mitigation: [how to address]."

**Section 3: Objection Handling**
- Top 5-7 objections the sales team encounters when competing against this competitor.
- Format: "When they say: [objection]. Respond with: [response]. Evidence: [proof point]."
- Objections must be sourced from actual sales conversations, not hypothesized.

**Section 4: Proof Points**
- 3-5 customer wins against this competitor with quantified outcomes.
- Format: "[Customer name/industry], switched from [competitor], achieved [quantified result] in [timeframe]."
- Include competitive displacement case studies where available.

**Section 5: Quick Stats** (sidebar or footer)
- Competitor founded date, headquarters, employee count, estimated revenue, funding status
- G2/TrustRadius aggregate rating
- Key analyst positioning (Leader/Challenger/Visionary/Niche)

---

## Porter's Five Forces -- Detailed Application

### Force 1: Threat of New Entrants
**Assessment Questions**:
- What are the barriers to entry: capital requirements, regulatory, technology, network effects, brand, switching costs?
- How have entry barriers changed in the past 3 years (cloud infrastructure and AI have lowered many barriers)?
- Which adjacent industries have players that could enter this market with existing capabilities?
- What is the pace of new entrant formation? Accelerating or decelerating?

**Scoring**: High / Medium / Low threat. High threat means industry profits are vulnerable to new competition.

### Force 2: Bargaining Power of Suppliers
**Assessment Questions**:
- How concentrated is the supply base for critical inputs (technology platforms, talent, data)?
- What is the switching cost for changing key suppliers?
- Are there substitute inputs available?
- Can suppliers credibly threaten forward integration?

**In Technology Markets**: Key suppliers include cloud infrastructure providers, AI model providers, and specialized talent pools. Concentration in AI foundation models is increasing supplier power.

### Force 3: Bargaining Power of Buyers
**Assessment Questions**:
- How concentrated is the buyer base? Do a few large customers represent significant revenue share?
- How price-sensitive are buyers? Is the purchase a significant expense relative to their budget?
- How high are switching costs for buyers? Can they credibly threaten to switch?
- How informed are buyers? Do they have full visibility into competitive alternatives and pricing?

### Force 4: Threat of Substitutes
**Assessment Questions**:
- What alternative approaches can customers use to solve the same problem?
- Are substitutes improving in capability or declining in cost?
- What is the switching cost from the product category to a substitute?
- How do substitutes compare on price-performance?

**Critical in AI/CX Markets**: The "build it yourself" option is always a substitute. Open-source alternatives and composable architectures are lowering the bar for DIY solutions.

### Force 5: Competitive Rivalry
**Assessment Questions**:
- How many competitors of similar size exist? (More = higher rivalry)
- What is the industry growth rate? (Slow growth = higher rivalry as firms compete for share)
- How differentiated are the offerings? (Commoditized = higher rivalry)
- What are the exit barriers? (High exit barriers = competitors stay and fight)
- What is the competitive behavior pattern? (Price war vs. differentiation vs. collaboration)

### Synthesis
Plot all five forces on a pentagon diagram. Forces rated High are colored red, Medium yellow, Low green. The overall pattern reveals the structural attractiveness of the competitive environment.

---

## Blue Ocean ERRC Grid

The ERRC Grid is the action framework of Blue Ocean Strategy. It identifies four categories of strategic action to break the value-cost trade-off.

### Eliminate
**Question**: Which factors that the industry takes for granted should be eliminated?

These are features, services, or capabilities that add cost but deliver no meaningful customer value. They persist due to industry convention, not customer demand. Eliminating them reduces cost structure without reducing perceived value.

**Examples in CX/Technology Markets**: On-premises deployment options for cloud-native buyers, feature bloat in enterprise editions, annual in-person user conferences (when virtual is preferred), printed documentation.

### Reduce
**Question**: Which factors should be reduced well below the industry standard?

These are factors where the industry over-delivers relative to customer willingness to pay. Reducing investment frees resources for differentiation.

**Examples**: Customization options (when configuration is sufficient), implementation complexity (when guided setup is preferred), support tier proliferation (when two tiers serve 95% of needs).

### Raise
**Question**: Which factors should be raised well above the industry standard?

These are under-served dimensions where increased investment creates disproportionate customer value. Raising them commands premium pricing or accelerates adoption.

**Examples**: Time-to-value (implementation in days vs. months), data portability (open APIs, standard export formats), transparency (public pricing, open roadmaps), customer education.

### Create
**Question**: Which factors should be created that the industry has never offered?

These are entirely new value dimensions that redefine the competitive landscape. The most powerful Blue Ocean moves create factors that competitors cannot quickly replicate due to structural barriers.

**Examples**: AI-generated insights as a product feature (not just analytics), outcome-based pricing (pay for results not seats), embedded compliance automation, community-driven product development.

### Grid Construction

| Factor | Eliminate | Reduce | Raise | Create |
|--------|-----------|--------|-------|--------|
| [List industry factors under the appropriate action column] | | | | |

The ERRC Grid should be populated based on customer research, competitive analysis, and strategic discussion. It is not a data artifact -- it is a strategic choice artifact.

---

## Anti-Patterns

1. **Feature Comparison Myopia**: Reducing competitive analysis to a feature checklist. Features are the "what" -- strategy, positioning, and business model are the "why." A competitor with fewer features but superior GTM motion or network effects may be a greater threat than one with more features.

2. **Point-in-Time Snapshot**: Analyzing competitors as they are today without projecting trajectory. A competitor growing at 80% year-over-year with $100M in funding will look different in 18 months. Always assess direction and velocity, not just position.

3. **Confirmation Bias**: Seeking evidence that confirms the client's existing beliefs about competitors. The analysis must challenge assumptions. If the client believes they lead on innovation, test that belief against patent data, release velocity, and analyst commentary.

4. **Asymmetric Depth**: Analyzing one competitor in depth while giving others superficial treatment. Maintain consistent depth across all competitors in scope to enable valid comparison.

5. **Public Data Only for the Client**: Applying rigorous external data collection to competitors while using unchallenged internal assertions for the client's own assessment. The client must be assessed with the same rigor as competitors.

6. **Battlecard Bias**: Creating battlecards that are so optimistic they lack credibility with the sales team. The "Why We Lose" section is the credibility test. If it is empty or dismissive, the entire battlecard will be ignored.

7. **Ignoring Substitutes and Non-Consumption**: Focusing exclusively on direct competitors while ignoring substitute solutions (spreadsheets, manual processes, build-your-own) that represent the largest share of the addressable market in many categories.

8. **Stale Intelligence**: Treating competitive analysis as a one-time deliverable rather than a living system. Competitive intelligence decays rapidly. Build in refresh triggers and monitoring mechanisms.

---

## Generation Instructions

When generating a competitive analysis deliverable, the AI agent must:

1. Confirm the analysis mode: Named Entity or Archetype. If Named Entity, validate that sufficient public information exists for each competitor before committing to the scope.
2. Assess all 15 dimensions for each competitor. Where data is unavailable, state the gap explicitly rather than guessing.
3. Apply Porter's Five Forces at the industry level. Score each force and generate the pentagon visualization.
4. Construct the Strategy Canvas with value curves for the client and all analyzed competitors. Identify convergence zones (parity) and divergence zones (differentiation).
5. Build the ERRC Grid based on findings from all 15 dimensions and the strategy canvas analysis.
6. Generate all four required visualizations: Positioning Map, Feature Matrix, Strategy Canvas, Radar Chart.
7. Produce one Battlecard per named competitor (or per archetype in Mode B) following the specification above.
8. Quantify market share and growth where possible. Clearly label estimates vs. confirmed data points.
9. Source customer sentiment from actual review platforms with attribution. Do not fabricate or paraphrase reviews.
10. Apply anti-pattern checks before finalizing: verify no confirmation bias, no feature-only analysis, no stale data, and honest "Why We Lose" sections in battlecards.
11. Date-stamp all competitive data points. Competitive intelligence has a shelf life -- the consumer of the analysis must know the recency of each data point.

---

## Cross-References

- [[anti-patterns/competitive]] -- Expanded anti-pattern catalog with competitive analysis failure case studies
- [[benchmarks/competitive-intel]] -- Benchmark data for competitive intelligence program maturity
- [[frameworks/strategy]] -- Strategy framework for connecting competitive findings to strategic positioning and roadmap decisions
