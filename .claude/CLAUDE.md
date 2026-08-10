# CLAUDE.md — Humans in Control Agent Rules

This file loads into every Claude agent session. All skills and subagents inherit these rules.

## UNIFIED VISION — read first (load-bearing)

The platform's architecture + self-improvement philosophy is encoded in
**[UNIFIED_VISION.md](UNIFIED_VISION.md)** (8 principles: Meta-Harness, RHO, SkillOpt,
Reinforcement Inference, Verbalized Sampling, anti-RAG manifest grounding, Figma lego-brick
assembly, Karpathy second-brain) + the meta-principle (CONVERGE / DELETE / GATE / SCHEDULE, do
not build-new) + the Lego-brick doctrine (Track B Method A: the model composes deliverables from
registered Figma bricks + tokens at generation time, NEVER hardcoded, the SPA never calls Figma
live). Read it before any non-trivial HiC architecture or deliverable-generation work; every plan
must trace back to it.

### THE DEFINITIVE VISION — what HiC IS (read this first, successors)
HiC is an **objective-first, manifest-native, evidence-cited, design-system-governed Artifact Factory for
consulting intelligence augmentation.** Every run produces a durable **Artifact Intermediate Representation
(AIR)** + Research Run Manifest, not merely a prompt result; AIR is the shared contract across all phases. The
eight principles bind at NINE end-to-end workflow phases — read the operational contract BEFORE touching any
pipeline, retrieval, routing, design-system, export, or self-improvement code:
- **Skill `hic-unified-vision`** (`.claude/skills/hic-unified-vision/SKILL.md`) — the loadable nine-phase
  contract + the AIR backbone. INVOKE IT before non-trivial HiC work.
- **`humans-in-control-research/plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md`** — the
  integrated AIR-first 100% plan (WS-0 backbone, WS-A..WS-J, the seven-stage sequence, the critical evaluation
  of the expert review, and the owner-decision list). v1 (same name, no `-v2`) is the file:line audit record.
The nine phases: (1) relevance = the user's objective, not source type; (2) collect from ALL packs + uploads +
the cached second brain (reused); (3) chunk with precise per-type provenance, `sources:` read at cite time;
(4) the manifest is a concept GRAPH that feeds retrieval; (5) anti-RAG = objective+manifest-first retrieval
(rerank only after manifest seeding) on themes + Analyst + Designer desks; (6) ONE routing authority
(`aiRouter.artifactModelFor`) for every #artifact, none omitted, by cost+quota+per-deliverable quality; (7)
user-influenced AND auto-triggered self-improvement behind an in-path held-out gate; (8) every GOLD page
componentized, tokenized, Nano-Banana runtime-filled; (9) every PPTX native + editable from every path. Every
plan and commit must name the phase(s) it advances and move them TOWARD these clauses, never away.

## NXT Design System — SINGLE SOURCE OF TRUTH

The design system is the published Figma library **`iSQhAVM7SI4QHAWB7y9C2z`**, whose `NXT Brand
Tokens` collection (`221:2`) carries TWO MODES: **NXT** (`221:0`) and **NU / Northeastern**
(`535:0`). Brand is a MODE FLIP on one component set, never a separate file. That canon is mirrored
(read-only) into `hic-workspace/design-system/figma-tokens.json` and served to the runtime at
**`/api/design-tokens?brand=NXT|NU`**. The component registry that maps every deliverable to its
bricks is `hic-workspace/wiki/brand/figma-node-map.md` ("COMPONENT REGISTRY").

**RULE (per [UNIFIED_VISION.md](UNIFIED_VISION.md), Figma lego-brick / never-hardcoded):** generated
output MUST resolve colors / fonts / spacing from tokens (`/api/design-tokens`, `var(--color/*)`,
`var(--font/*)`, `var(--space/*)`), NEVER from a literal hex / font name / size baked into code or
into this file. When the Figma library changes, re-pull both modes into `figma-tokens.json` and
re-chunk the node map — do not edit values here and call it done.

The values below are a NON-AUTHORITATIVE human reference (snapshot 2026-06-16). If they disagree with
`figma-tokens.json`, the JSON (and Figma) win — fix this file, not the JSON.

### Brand tokens (non-authoritative mirror)
| token | NXT (mode 221:0) | NU (mode 535:0) | role |
|---|---|---|---|
| rail | `#0D0D0D` | `#0E1626` | dark rail / sidebar |
| accent | `#B8B800` chartreuse | `#C8102E` red | accent, takeaway band, dot-mark |
| cyan / cool | `#00B7C3` | `#1D6E64` source-teal | kickers, links, cool accent |
| teal / premium | `#115054` | `#16233C` | dark panels |
| on-accent | `#0D0D0D` (black) | `#FFFFFF` (white) | text on the accent block (a11y; never black-on-red) |
| rust / warn | `#CC6644` | (red family) | problems / warnings |

### Typography (non-authoritative mirror)
- **NXT** — display `Saira Condensed SemiBold` (NOT Bebas Neue, dropped 2026-06-13), title/body
  `Archivo` (title weight 600), mono `IBM Plex Mono`.
- **NU** — SINGLE-TYPEFACE `Lato` (display=title=body=mono=Lato; weight + size carry hierarchy, per
  Northeastern's model; web title-weight 700 since Google Lato lacks 600).
- Minimal border radius 2-4px; no decorative shadows.

## Citation Protocol

### Resolution Rules
- Every `[CHUNK_XXX]` reference MUST be resolved to `"SourceName: ArticleTitle"` format
- Comma-separated chunks `[CHUNK_003, CHUNK_017]` resolve to `"Sources: SourceA, SourceB"`
- Raw filenames `[filename.pdf]` resolve to `"(Source: filename)"`

### Citation Quality Rules
- ALWAYS cite by specific source name: "Higher Ed Dive", "Reddit: r/cscareerquestions", "OpenAlex: Smith 2024"
- NEVER use generic references: "research", "studies", "data", "sources", "intelligence_sources", "analysis", "evidence", "findings", "reports", "literature", "various sources", "multiple sources"
- Every citations[] array MUST contain real, named source identifiers
- Every evidenceBasis MUST contain verbatim quotes or named entities (see Quantitative Claim Rule: numbers only inside a cited quote, never as a bare figure)

### Evidence Hierarchy (Mandatory for ALL Deliverables)
1. LEAD with external research evidence (name the article, quote the finding)
2. CORROBORATE with additional external sources (show convergence)
3. ONLY THEN contextualize with client documents
4. At least 60% of cited sources must be external (not client uploads)
5. FORBIDDEN: Opening any section with "The CLR Project Charter states..." without prior external evidence

### Evidence-Label Rule (Mandatory)
Whenever an artifact LABELS something "Evidence" (a heading, a tile, a section, a field), that
label MUST be immediately followed by a VERBATIM quote drawn from the corpus, an article snippet
or a social post, with its source attribution. The quote does NOT have to be from a named human
speaker; a verbatim sentence lifted from an article is fine. A paraphrase, a summary, or the model's
own description under an "Evidence" label is FORBIDDEN. If no verbatim corpus quote is available,
do not use the word "Evidence" as the label.
- Do NOT use "Evidence" as a label for things that are not research evidence. The service-blueprint
  "physical/digital evidence" lane is touchpoints, not corpus evidence; label it "Touchpoints" (or
  "Channels") to avoid the collision.

### CRITICAL: External Intelligence Diversity
The research corpus contains TWO categories:
- **UPLOADED CLIENT DOCUMENTS** (3-10 PDFs the user uploaded): Organizational context
- **EXTERNAL INTELLIGENCE** (~200 articles from academic, news, government, social sources): Primary evidence base

The user chose to INCLUDE these ~200 articles. They MUST be heavily represented in ALL deliverables:
- At least 50% of themes must cite external intelligence sources
- At least 30% of ALL citations must come from external sources
- Uploaded documents (*.pdf, *.txt filenames) provide context — external sources provide EVIDENCE
- If most citations reference the same 4-5 uploaded PDFs, the deliverable is FAILING
- The validation hook WILL REJECT output dominated by client documents

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
- Every slide title MUST be a complete sentence stating a CONCLUSION (a judgment), not a topic
- BAD (topic labels): "The Landscape", "Key Findings", "Recommendations", "The Path Forward"
- BAD (naked numbers, see Quantitative Claim Rule): "35% of first-year students do not return, costing $9B annually"
- GOOD: "First-year students leave faster than the institution can replace them"
- GOOD: "Fragmented CRM systems force advancement teams into manual data entry instead of donor work"
- The Partner Test: A senior partner reading ONLY slide titles must understand the complete argument
- Titles carry the JUDGMENT; the supporting number, if any, lives in a cited quote on the slide body, never in the title itself
- CONCISE + LITERAL, NO METAPHOR (2026-06-18, HARD): a title is SHORT and PLAIN, aim <= 10 words / ~70 chars, one line. State the judgment in literal business language, naming the mechanism, system, actor, or proper noun. NO figurative or cliche business metaphors/imagery. BANNED examples: "front door", "trust ceiling", "the meter", "margin closes"/"closes the margin", "where value leaks", "bleeds", "...eat(s) it", "opens the door", "walk through first", "redrawing the map". Name the literal thing instead. (NOTE: "funnel" terms - top/front of the funnel - are LEGITIMATE marketing vocabulary, NOT banned.)
- BAD (wordy + metaphor): "AI moves the retail front door from search to the assistant, but the operators who win 2026 capture the premium before the platform tax and the trust ceiling eat it" → GOOD (tight + literal): "AI assistants now originate retail traffic and convert better than search"
- BAD: "Retail 2026: The AI Front Door Opens, the Margin Closes" → GOOD: "AI raises conversion and adds new costs in 2026"
- The single deck THESIS line may run one sentence longer; every other title stays tight

### Quantitative Claim Rule (Mandatory, ALL Deliverables)
Do NOT state standalone quantitative claims (percentages, ratios, counts, dollar figures, durations-as-metrics, "Nx", "N%") as the model's own assertions in ANY user-visible field: titles, headings, prose, narratives, KPI/stat tiles, pain or opportunity statements, captions, synthesis. A naked number reads as fabricated and is the #1 AI-slop tell flagged on this project.
- A number may appear ONLY inside a VERBATIM quote that carries an inline source attribution. If a real person or named source said it, you may show the number IN THE CONTEXT OF THAT QUOTE. Example (allowed): a pull quote "I applied to 60 co-ops and heard back from 4." [Source: Reddit r/NEU]. The same "60-to-4" as a bare title or KPI tile is FORBIDDEN.
- Default to QUALITATIVE language for titles, KPIs, and prose: name the pattern (FRAGMENTED, PERSISTENT, ONE ADVISOR FOR MANY), the system, or the proper noun, not the statistic.
- evidenceBasis and pain points anchor to NAMED entities and verbatim quotes, not free-floating numbers.
- This rule overrides any older guidance (including earlier examples in this file and edit-history constraints) that asked for "a number in the title" or "quantify in dollars." Numbers are evidence carried by quotes, not assertions.

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
- "As shown above" / "As shown below" / "As we'll see" / "As we will see"
- "As discussed" / "As noted earlier" / "As mentioned" / "As previously noted"
- "In conclusion" / "To summarize" / "In summary" / "To conclude"
- "This report aims to" / "This analysis covers" / "This deck frames"

A consultant NEVER announces the framework, greets the audience, narrates the structure, or points back to "earlier" sections the reader can't see. Lead with the insight.

## No Self-Referential or Process Language

The output is a finished consulting artifact. The reader must never see ANY reference to:
- The artifact itself ("this presentation", "this deck", "this slide", "this section", "this report", "this analysis")
- The research or generation process ("based on the research", "based on the available data", "according to our analysis", "the research shows", "the data indicates", "the corpus reveals", "from the sources reviewed", "drawing on the evidence", "this report finds", "our findings suggest", "research indicates", "studies show", "sources indicate")
- Evidence limitations ("evidence is limited", "data is limited", "more research is needed", "further investigation required", "additional research needed", "due to limited data", "while data was unavailable", "in the absence of", "pending additional research")

If a process-reference prefix appears, STRIP it and keep the insight: "Based on the research, churn is the core retention failure" → "Churn is the core retention failure." (Per the Quantitative Claim Rule, the supporting figure rides in a cited quote, not as a bare assertion.) If a limitation phrase appears, omit the claim entirely and narrow the section around what IS evidenced. The reader must never see the model's awareness of what it doesn't know.

### Subject Discipline — the artifact is about its SUBJECT, never about the deliverable (2026-06-17, HARD)
The artifact IS the strategy/analysis about the subject the user named (the product, market, org, audience). It is NOT a guide for how to WRITE, STRUCTURE, SEQUENCE, or POSITION the report/deck. The single worst slop failure on this project: a "#strategy for [product]" deck that came back as inside-baseball advice on how to write the marketing report ("Lead with the industry problem", "Open with the problem", "the report's section order", "Anchor the messaging on...", "Name the checkpoint promise", an "INTERNAL POSITIONING GUIDE" label). That is meta about the deliverable, not strategy.
- Every slide/section is about: what the SUBJECT is/does (capabilities, the buyer's pain it removes), named evidence, and the decision the audience must make. The reader learns what the thing DOES and why it wins — never how the team plans to talk about it.
- FORBIDDEN as content: "lead with", "open with", "the report/deck should", "section order", "the narrative", "positioning guide", "anchor the messaging", "name the X promise", "the report's opening", "setting up the narrative", "frame the story", and any instruction-to-the-writer phrasing.
- When the corpus contains internal positioning notes or interview transcripts ABOUT how to write/position the deliverable, MINE them for the underlying subject substance (the capability, the pain, the proof) and state THAT. Never restate a writing instruction as a slide.
- Quotes are CLEAN, COMPLETE sentences about the subject/buyer. NEVER raw interview filler ("like,", "you know", lowercase mid-sentence fragments). A transcript fragment about narrative strategy is NOT evidence.
- Citations name a real source (document, person, external publication). Never cite an internal corpus/engagement label (an all-caps engagement slug, "INTERNAL POSITIONING GUIDE") as if it were a source.

These rules are enforced at runtime by `services/slidePostProcessor.ts` (META_NARRATION_PATTERNS, PROCESS_REFERENCE_REWRITES) and, for strategy/presentation decks, by the AIR SUBJECT-DISCIPLINE block in `corpusChatService` + the AIR quality gate. Patterns can be bypassed by clever phrasing; the post-processor cannot.

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

### Verbal Tics — 2026-05-25 Uplift (High Severity)
Ingested from Wikipedia "Signs of AI writing", ignorance.ai "Field Guide to AI Slop", Algorithmic Bridge "10 Signs of AI Writing". These are the AI-writing tells the prior list did not cover:

delve, delves into, delving into, tapestry, rich tapestry, tapestry of, testament, is a testament, stands as a testament, meticulous, meticulously, nestled, vibrant, enduring, enduring legacy, garner, garnered, interplay, intricate, intricacies, showcase, showcasing, bolster, bolsters, bolstered, foster, fostering, fosters, enhance, enhances, enhancing, boasts a, boasts an, paramount, of paramount, valuable insights, cultural landscape, broader landscape, utilize, utilized, utilizing, comprehensive, foundational, multifaceted, leveraging, facilitate, facilitates, facilitating, pivotal moment, pivotal role, plays a pivotal role, plays a crucial role, plays a key role, plays a vital role, plays a role in the ecosystem, marks a pivotal, represents a paradigm, represents a fundamental, embodies, epitomizes

### Copula Avoidance (Wikipedia Canonical)
Avoid replacing simple "is" with elaborate verbs:
- BAD: "The system serves as a unifying platform"
- BAD: "The CRM stands as the cornerstone of advancement"
- BAD: "The migration marks a pivotal moment in the team's evolution"
- GOOD: "The CRM is the cornerstone of advancement"
- GOOD: "The migration is the team's most significant change this year"

Watch verbs: serves as, stands as, marks (a/the), represents (a/the), embodies, epitomizes.

### Rhetorical Patterns (ignorance.ai)
- BAD: "It's not just an upgrade, it's a transformation."  (the "Not X, it's Y" parallelism)
- BAD: "Fast, efficient, and reliable."  (snappy AI triad)
- BAD: "The solution? It's simpler than you think."  (mid-sentence rhetorical question)
- BAD: "Something shifted. Everything changed."  (unearned profundity transition)
- BAD: "But here's the thing —"  (false-revelation transition)
- BAD: "We are excited to announce..."  (press-release voice)

### The Actor Rule (2026-08-07, HARD — binding on every generated sentence)
Two tests every user-visible sentence must pass, on top of the phrase bans above:
1. NAME THE ACTOR. Every claim states who or what acts: a named team, system, person, or
   audience. Abstract nouns (engagement, advancement, alignment, transformation, adoption)
   never act; dramatic verbs (leaks, dies, bleeds, unlocks, erodes, cannot see) never
   substitute for the mechanism. Ground cause and effect: X fails because Y, so Z happens.
   BAD: "Engagement leaks at three stages advancement cannot see."
   GOOD: "Alumni drop off at three stages the advancement team cannot see."
2. READ IT ALOUD. If a real person would not say the sentence out loud, rewrite it. Kill
   broken grammar, buzzwords forced into the wrong part of speech, and word-salad
   compression. Plain subject, direct verb, concrete object; delete every word that adds
   no fact or step.

### Format Tells (HARD BANS, 2026-05-25)
- NEVER emit Unicode bold/italic stylization characters (mathematical bold-script glyphs). These are AI-tell artifacts.
- **EM-DASH HARD BAN**: NEVER use the em-dash character (U+2014) anywhere in any rendered output — generated artifacts, slides, chat replies, deliverables, JSON content fields, HTML body text. Use comma, semicolon, colon, period, or parenthesis instead. Em-dashes are the single most reliable AI-writing tell. The `slidePostProcessor.ts::stripEmDashes` function auto-replaces them at runtime. ASCII hyphens in compound words remain fine.
- NEVER emit "oaicite", "oai_citation", "contentReference", "attached_file", "turn0search0" or similar ChatGPT artifact tags.

### Graphic-Collision Bans (HARD, applies to ALL diagrammatic artifacts)
- NEVER emit SVG `<line>` or `<path>` elements that cross THROUGH a node's bounding box. Route around with a midpoint, or convert the layout to a CSS grid where geometry is inherently collision-free.
- NEVER let a text label intersect a divider, arrow, dot, or other graphic primitive. If the label would, shrink the label or restructure the cell.
- NEVER absolutely-position multiple sibling elements that converge on the same coordinate. The journey-map disaster of 2026-05-24 originated from N `.activity` siblings stacking at `top: 50%`. The fix was a CSS-grid cell anatomy; the principle generalizes.
- PREFER CSS grid/flex layouts for tier diagrams, swimlanes, and matrices over SVG with absolute coordinates. CSS grid resolves overlap automatically; SVG with positional `x=`/`y=` makes the model the layout engine, which fails predictably.
- For SVG diagrams (org charts, mindmaps, architecture connectors where grids do not fit): every node's bounding box gets a 16px exclusion zone; every connector terminates at the box edge, not overshooting; bidirectional connectors use different colors at each end.

### Knowledge-Cutoff Disclaimers (Hard Ban)
NEVER write any of these in any output:
- "As an AI..." / "I'm an AI..." / "I am an AI..."
- "As of my knowledge cutoff..." / "As of my last update..."
- "My training data..."
- "I don't have real-time access..."
- "I cannot provide..."
- "I should note..."
- "Please note that..."

The reader of a finished consulting artifact must never see the AI's awareness of itself.

### Reporting-Depth Metadata (Hard Ban, 2026-05-25)
The reader sees a FINISHED CONSULTING ARTIFACT, never a debugging trace. NEVER render these as visible chrome:
- "Run ID: a3f2c1d8..."
- "Pipeline version: 1.0"
- "Framework version: ..."
- "Reproducibility hash: ..."
- "Confidence: HYPOTHESIS / EMERGING / VERIFIED"
- "Segment size: N participants"
- "Mental model: <one sentence>"
- "Non-goal: <one sentence>"
- "Persona type: Primary / Secondary / Stakeholder / Anti-persona"
- "(composite)" or "(synthetic)" name suffixes
- "↪ resolves: <pain>" arrows
- "Phase 0X · Wk YY-ZZ" eyebrow stamps
- "Pass 1B" / "Phase 1C" pipeline-stage indicators
- "[CHUNK_XXX]" raw markers that leak through citation resolution

These data points may live in `data-*` attributes, JSON fields, or audit logs — but never in user-visible text on slides, artifacts, or chat replies.

## Output Rules

### Plain Text Only
No **bold**, *italic*, # headers, or markdown in generated content. The rendering system handles formatting.

### No Fabrication, No QA Annotations
- Never invent author names, statistics, or institution names
- Never fabricate chart data or benchmarks
- If data doesn't exist for a chart, use a stat callout instead
- If a specific claim is not evidenced, omit the claim and adjust the surrounding narrative — write the section narrowly around what IS evidenced
- NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", "baseline TBD", or any other QA-style annotation in any user-facing field (titles, narratives, citations, captions, evidence basis, key quotes, key metrics, speaker notes, slide content, chat replies, deliverables). The output is a finished consulting deliverable read by executives — not an annotated draft. The reader must never see the model's notes about what's missing.

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
