# CLAUDE.md — Humans in Control Agent Rules

This file loads into every Claude agent session. All skills and subagents inherit these rules.

## NXT Design System

### Brand Colors
- Black: `#0D0D0D` (dark backgrounds, sidebar)
- Chartreuse/Lime: `#B8B800` (accent, highlights, buttons)
- Cyan: `#00B7C3` (data panels, links, secondary accent)
- Rust/Negative: `#CC6644` (problems, warnings, errors)
- Teal: `#115054` (headers, primary actions)
- Success: `#0CCE6B`
- Error: `#FF5A5A`
- Accent rotation for metrics: `#CC6644`, `#B8B800`, `#00B7C3`

### Typography
- Body: Archivo (weights 200-900)
- Display: Bebas Neue (section headers, large titles)
- Code/Citations: JetBrains Mono (400-500)
- Minimal border radius: 2-4px
- No decorative shadows

## Citation Protocol

### Resolution Rules
- Every `[CHUNK_XXX]` reference MUST be resolved to `"SourceName: ArticleTitle"` format
- Comma-separated chunks `[CHUNK_003, CHUNK_017]` resolve to `"Sources: SourceA, SourceB"`
- Raw filenames `[filename.pdf]` resolve to `"(Source: filename)"`

### Citation Quality Rules
- ALWAYS cite by specific source name: "Higher Ed Dive", "Reddit: r/cscareerquestions", "OpenAlex: Smith 2024"
- NEVER use generic references: "research", "studies", "data", "sources", "intelligence_sources", "analysis", "evidence", "findings", "reports", "literature", "various sources", "multiple sources"
- Every citations[] array MUST contain real, named source identifiers
- Every evidenceBasis MUST contain specific numbers, verbatim quotes, or named entities

### Evidence Hierarchy (Mandatory for ALL Deliverables)
1. LEAD with external research evidence (name the article, quote the finding)
2. CORROBORATE with additional external sources (show convergence)
3. ONLY THEN contextualize with client documents
4. At least 60% of cited sources must be external (not client uploads)
5. FORBIDDEN: Opening any section with "The CLR Project Charter states..." without prior external evidence

## Consulting Frameworks

### Minto Pyramid Principle
- Present the answer FIRST, then supporting arguments
- All problem decomposition must be MECE (Mutually Exclusive, Collectively Exhaustive)
- Arguments grouped logically under governing hypotheses

### Rumelt's Kernel (Strategy Deliverables)
1. DIAGNOSIS: Name THE central challenge with specific evidence
2. GUIDING POLICY: State the strategic approach (a DECISION, not a goal)
3. COHERENT ACTIONS: 5-7 actions that reinforce each other

### SCR / SCQA Framework
- Situation: What is the current state? (10-15% of content)
- Complication: Why is the status quo unacceptable? (15-20%)
- Resolution: What must be done? (60-70%)

### Action Titles (All Slide Titles)
- Every slide title MUST be a complete sentence stating a conclusion with data
- BAD: "The Landscape", "Key Findings", "Recommendations", "The Path Forward"
- GOOD: "35% of first-year students do not return, costing $9B annually"
- GOOD: "Fragmented CRM systems force advancement teams to spend 40% of time on manual data entry"
- The Partner Test: A senior partner reading ONLY slide titles must understand the complete argument

## Meta-Narration Ban

NEVER use any of these phrases in ANY output field:
- "Good morning" / "Good afternoon" / "Good evening"
- "Welcome to" / "Thank you for being here" / "Thank you for joining"
- "Today we will" / "Today we'll" / "We will present" / "We are going to"
- "We now move to" / "We are now entering" / "Let us now examine"
- "This is where we" / "In this section" / "In this presentation" / "In this deck"
- "As you can see" / "This slide shows" / "The next slide"
- "Our objective is to" / "Allow me to" / "Before we begin"
- "I'd like to start by" / "Let's dive into" / "Let's explore"

A consultant NEVER announces the framework, greets the audience, or narrates the structure. Lead with the insight.

## Banned Slop Phrases (350+ — Instant Rejection)

### Corporate Cliches (High Severity)
paradigm shift, game-changer, holistic approach, cutting-edge, best-in-class, leverage synergies, robust solution, seamless integration, actionable insights, thought leadership, value proposition, core competency, move the needle, circle back, deep dive, low-hanging fruit, synergy, ecosystem, disruptive, innovative solution

### AI Slop (High Severity)
in today's rapidly evolving landscape, it's important to note, it's worth noting, it should be noted, needless to say, at the end of the day, the reality is, the fact of the matter, when it comes to, in terms of, with respect to, as we navigate, in this ever-changing, the landscape of

### Hedge Words (Medium Severity)
it seems, perhaps, it's possible, may or may not, to some extent, in some ways, arguably, potentially, conceivably, it could be said

### Filler Phrases (Medium Severity)
moving forward, going forward, at this point in time, in the current climate, as we move forward, looking ahead, on a go-forward basis, at the present time

### False Profundity
fundamental shift, seismic shift, unprecedented, transformative, revolutionary, groundbreaking, trailblazing, world-class

## Output Rules

### Plain Text Only
No **bold**, *italic*, # headers, or markdown in generated content. The rendering system handles formatting.

### No Fabrication
- Never invent author names, statistics, or institution names
- Never fabricate chart data or benchmarks
- If data doesn't exist for a chart, use a stat callout instead
- Flag "EVIDENCE GAP" when evidence is insufficient — never silently omit

### Prose Over Lists
- Prioritize narrative prose over bulleted lists
- Use bulleted lists only when the schema explicitly requires arrays
- Each paragraph should weave 2-3 different sources showing convergent evidence

### Content Budgets (Deck Slides)
- title: 120 chars max
- content[i]: 200 chars max
- quote: 250 chars max
- narrative: 400 chars max
- speakerNotes: 600 chars max

## Self-Improvement Protocol

### Edit Learning
User edits at checkpoints are logged. After 5+ similar edits, a constraint is auto-approved. Approved constraints are injected into subsequent generation prompts.

### Engagement Memory
Prior research on similar goals is loaded from wiki engagement memory. Use it to avoid repeating analysis and to build on prior insights.

### Learned Constraints
Check wiki/synthesis/learned-constraints.md for constraints learned from prior sessions. Apply them to all generation.
