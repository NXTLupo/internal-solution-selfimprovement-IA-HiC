/**
 * Corpus Chat Service v2 — Chat-Driven Research Workbench
 *
 * Multi-model conversational interface grounded in the full research corpus,
 * wiki knowledge base, and specialized consulting skills.
 *
 * Models:
 * - Claude Opus 4.7 (Anthropic) — Primary: deep reasoning, strategy, agentic, vision, 1M context
 * - Claude Sonnet 4.6 (Anthropic) — Fast reasoning, structured output
 * - Gemini 2.5 Flash (Google) — Rapid data extraction, image generation
 * - GPT-5.4-mini (OpenAI) — Strict JSON schema compliance
 *
 * Architecture:
 * - Tiered knowledge loading (brand/constraints always, skills on-demand)
 * - Skill manifest matching (keyword triggers -> lazy-load SKILL.md + wiki companions)
 * - Adaptive thinking (budget_tokens scaled by task complexity)
 * - Full corpus grounding (no 500KB cap for Claude 4.7)
 */

export type ChatModel = 'claude-opus-4-7' | 'gemini-2.5-flash' | 'gpt-5.4';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: ChatModel;
    timestamp: number;
    tokenCount?: number;
    durationMs?: number;
    imageData?: string; // base64 image for inline rendering
    skillUsed?: string; // which skill was activated for this response
}

export interface SourceReference {
    id: string;
    sourceName: string;
    title: string;
    url?: string;
    tier?: number;
    date?: string;
}

export interface ChatContext {
    corpusText: string;
    themes?: any[];
    personas?: any[];
    recommendations?: any[];
    journeyStages?: any[];
    prd?: any;
    roadmap?: any;
    gapAnalysis?: any;
    techAudit?: any;
    competitiveAnalysis?: any;
    techArchitecture?: any;
    strategicReport?: any;
    researchGoal: string;
    sourceCount: number;
    articleCount: number;
    sourceReferences?: SourceReference[];
    chunkMap?: Record<string, { sourceName: string; title: string; url?: string }>;
    uploadedFileContents?: string;
    // Knowledge Graph state — the AI must understand the graph structure
    knowledgeGraph?: { nodes: any[]; edges: any[]; stats?: any };
    // Tiered knowledge (loaded by ChatWorkbench)
    wikiBrand?: string;
    wikiLearnedConstraints?: string;
    wikiBenchmarks?: string;
    wikiEvidence?: string;
    wikiMethodologies?: string;
    wikiEngagement?: string;
    wikiSourceArchive?: string; // Full source archive from wiki with verified URLs
    skillManifest?: SkillManifestEntry[];
    nxtDesignSystemRules?: string;
}

// --- Skill Manifest Types ---

export interface SkillManifestEntry {
    id: string;
    name: string;
    description: string;
    category: 'research-deliverable' | 'prompt-engineering';
    triggers: string[];
    wikiCompanions: string[];
    benchmarks: string[];
    outputTypes: string[];
    bestModel: ChatModel;
    thinkingEffort: 'max' | 'high' | 'medium';
    executionContext: 'primary' | 'subagent';
    path: string;
}

export interface SkillContext {
    skill: SkillManifestEntry;
    skillContent: string;       // Full SKILL.md content
    companionContent: string;   // Concatenated wiki companion pages
}

// --- Model Configuration ---

export interface ModelConfig {
    id: ChatModel;
    name: string;
    provider: 'anthropic' | 'openai' | 'google';
    description: string;
    contextWindow: string;
    strengths: string;
    color: string;
    available: boolean;
    maxCorpusChars: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: '1M token context — loads the ENTIRE corpus, knowledge graph, wiki, and skills with zero truncation.',
        contextWindow: '1M tokens',
        strengths: 'Full corpus grounding, fast responses, image generation, no context limitations',
        color: '#B8B800',
        available: true,
        maxCorpusChars: 900000, // No truncation — load everything
    },
    {
        id: 'claude-opus-4-7',
        name: 'Claude Opus 4.7',
        provider: 'anthropic',
        description: 'Deep reasoning, strategy authoring, creative narratives. 1M context window.',
        contextWindow: '1M tokens',
        strengths: 'Complex reasoning, liberal quoting, framework adherence, long-form narrative',
        color: '#CC6644',
        available: true,
        maxCorpusChars: 900000, // Claude 4.7 also has 1M context — no truncation
    },
    {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        provider: 'openai',
        description: 'Flagship reasoning model. Strict JSON schema compliance. 1M+ context window — full corpus grounding.',
        contextWindow: '1M tokens',
        strengths: 'Schema adherence, deep reasoning, large-corpus synthesis',
        color: '#00B7C3',
        available: true,
        maxCorpusChars: 900000,
    },
];

// --- Thinking Budget ---

type ThinkingEffort = 'max' | 'high' | 'medium';

const THINKING_BUDGETS: Record<ThinkingEffort, number> = {
    max: 32000,
    high: 16000,
    medium: 8000,
};

// --- Deliverable Output Protocol ---

const DELIVERABLE_PROTOCOL = `
========================================================================
RESPONSE MODE — READ THIS FIRST ON EVERY TURN
========================================================================

Your response format is ALWAYS determined by what the user explicitly asks for. There are three modes, and the DEFAULT is plain chat.

--- 1. DEFAULT: PLAIN GROUNDED CHAT (use this unless another mode is triggered) ---
When the user asks a question, requests analysis, brainstorms, or makes any conversational request, respond as an expert research analyst:
  - Plain prose, grounded in the corpus
  - Cite named sources inline: e.g., "Higher Ed Dive reports that..." or "[r/NEU post, Mar 2026]"
  - Liberal quoting — pull verbatim where possible
  - Use light markdown for readability (bold for emphasis, short bullet lists, a header if the answer is long)
  - Answer directly. No preamble, no "Great question".
  - DO NOT emit :::slide, :::deliverable:, or :::nxt: fences. Answering in prose is your default contract.

The knowledge graph is ALREADY being built automatically in the background (themes, personas, recs, gaps, etc. populate without you having to emit cards). So when the user asks a question, just answer — don't force structure on them.

--- 2. SLIDE MODE: triggered ONLY by #slide in the user's message ---
If and only if the user's message contains "#slide" (case-insensitive), switch to slide generation using the SLIDE OUTPUT PROTOCOL below. Optional brand hashtag:
  - #slide #NU  → Northeastern brand (near-black + Huskies Red)
  - #slide #NXT → NXT Humans brand (teal + chartreuse) — also the default if no brand hashtag
  - #slide alone → NXT Humans brand

Examples:
  "#slide #NU give me a persona for Sarah Chen"     → emit one :::slide template=persona-card brand=nu
  "#slide show the top 3 themes"                    → emit 3 :::slide template=theme-cluster blocks
  "Build a 5-slide deck on the roadmap #slide #NU"  → emit 5 :::slide blocks

NOT slide mode:
  "Who are our customers?"           → prose answer, not a slide
  "What themes are emerging?"        → prose summary with citations, not a slide
  "Summarize the competitive data"   → prose analysis, not a slide
  (unless the user adds #slide)

--- 3. DELIVERABLE CARD MODE: triggered ONLY by explicit request for approvable cards ---
If the user explicitly asks for "approvable cards", "persona cards I can approve", "pin-able deliverables", or similar phrasing that makes the approval intent explicit, emit :::deliverable:TYPE blocks per the schema below. These are interactive cards the user approves into the knowledge graph.

If the user just asks "create personas" or "what themes exist" WITHOUT mentioning cards or approvals, answer in prose. The background synthesis already populates the knowledge graph — you don't need to emit cards for the KG to know about these items.

--- THE RULE ---
Structured outputs (:::slide, :::deliverable:, :::nxt:) are ALWAYS opt-in. If neither #slide nor explicit card-approval phrasing appears in the user's message, your response is PLAIN PROSE. Questions deserve answers. Conversations deserve conversation.

========================================================================

DELIVERABLE CARD SCHEMA (only used when user explicitly asks for cards):
When the user asks you to CREATE approvable deliverable cards (e.g. "generate 5 persona cards I can approve"),
output them as :::deliverable blocks so the UI can render them as inspectable, approvable cards.

Format:
:::deliverable:TYPE
{JSON object matching the deliverable schema}
:::

Supported types and their required JSON fields:
- :::deliverable:theme — {name, description, quote, citations: [{sourceName, text, url?}], status: "hypothesis"|"supported"|"verified", isCrossDocument: boolean}
- :::deliverable:persona — {name, role, demographics?, quote, bio, jtbd, goals: {lifeGoal, experienceGoal, functionalGoal}, painPoints: [{label, quote, source}], motivations: [{label, quote, source}]}
- :::deliverable:recommendation — {title, description, impactLevel: "critical"|"high"|"medium"|"low", evidenceBasis, citations: [string], effort?, timeline?}
- :::deliverable:journey_stage — {phase, touchpoint, customerAction, frontstage, backstage, support, painPoint, emotion, fail_point?, citations: [string]}
- :::deliverable:prd_feature — {name, description, priority: "must"|"should"|"could"|"won't", userStory, acceptanceCriteria: [string], citations: [string]}
- :::deliverable:roadmap_item — {title, description, horizon: "now"|"next"|"later", effort, impact, dependencies: [string], citations: [string]}
- :::deliverable:gap — {capability, currentMaturity: 1-5, targetMaturity: 1-5, gap: number, severity: "critical"|"high"|"medium"|"low", impact, citations: [string]}
- :::deliverable:competitive_peer — {name, position, strengths: [string], weaknesses: [string], citations: [string]}
- :::deliverable:tech_audit_system — {name, category, status, risk, description, citations: [string]}
- :::deliverable:tech_node — {name, layer, type, description, constraints: [string], citations: [string]}

IMPORTANT:
- Output MULTIPLE deliverables when asked (e.g., "create personas" = 4-6 persona blocks)
- Each block is ONE deliverable item — the user inspects and approves each individually
- The user's approval commits the deliverable to the knowledge graph
- Include verbose evidence: verbatim quotes, specific data points, named sources in every field
- You can mix prose text with deliverable blocks (explain your reasoning, then output the blocks)

SLIDE OUTPUT PROTOCOL — 18 TEMPLATES x 2 VISUAL BRANDS:

When the user asks to create a slide (or set of slides), output ONE :::slide block per slide.
Pick the template that best matches the content. Mark it on the fence: :::slide template=NAME

VISUAL BRAND (chosen via hashtag in the user's prompt):
  #NXT  → NXT Humans brand — teal sidebar (#115054), chartreuse accent (#CACA20), Archivo.  DEFAULT.
  #NU   → Northeastern University brand — near-black sidebar (#141414), Huskies Red accent (#C8102E), Archivo.
          Use #NU only when the user requests Northeastern-branded output.

If the user's prompt contains #NU (or "Northeastern"), you MAY echo brand=nu on the fence:
  :::slide template=persona-card brand=nu
    {...}
  :::
Otherwise omit brand= on the fence and the renderer defaults to NXT.
The hashtag in the user's prompt is authoritative — the parser will auto-apply the brand to every
slide in your response even if you forget to set brand=. Do NOT mention the hashtag in the slide
JSON itself; it's a routing directive, not content.

The 18 templates and when to use each (when the user requests multiple slides on themes,
ROTATE through theme-cluster, theme-spotlight, theme-arc, and theme-mosaic instead of
repeating the same layout — variety reads as designerly, repetition reads as templated):

1.  persona-card        → user requests personas, archetypes, customer segments
2.  recommendation      → user requests strategic actions, what to do, next steps
3.  theme-cluster       → equal-weight horizontal columns (3-4 themes, parallel weight, default theme layout)
3a. theme-spotlight     → ONE dominant theme + 2-3 supporting (asymmetric 60/40 hero layout — use when one theme leads)
3b. theme-arc           → narrative chain of 3-4 themes with progression arrows (use when themes build sequentially: cause → effect → response)
3c. theme-mosaic        → 2x2 inverse-checkerboard of 4 parallel themes (alternating dark/light cells — gallery rhythm; use for 4 equal themes with strong visual punch)
4.  competitive-matrix  → user requests competitive analysis, peer comparison, capability scoring
5.  block-quote         → user wants a single powerful verbatim quote highlighted
6.  case-study          → user requests an example, real-world case, success/failure story
7.  principles          → user requests guiding principles, design tenets, operating beliefs (3-5 items)
8.  stat-row            → user requests key metrics, numbers, "by the numbers" (3-4 stats)
9.  timeline            → user requests roadmap, phases, sequencing (3-5 phases)
10. section-divider     → between major sections of a deck
11. service-blueprint   → user requests a service blueprint, journey map, frontstage/backstage analysis (Bitner 5-component)
12. gap-matrix          → user requests gap analysis, maturity scoring, current-vs-target capabilities (Gartner 1-5)
13. architecture-map    → user requests technology architecture, system diagram, C4 layers, tech stack
14. prd-feature         → user requests product requirements, feature specs, MoSCoW breakdown
15. systems-inventory   → user requests tech audit, systems catalog, legacy vs current state

EVERY slide block carries:
- "title": action title (complete sentence stating a conclusion with data)
- "sources": ["Named Source 1", "Named Source 2", ...]   ← always required, never empty

CONTENT BUDGETS (write to fit, do NOT submit copy that will be truncated):
The slide canvas is fixed at 960x540. Every text slot has a hard character
budget. The renderer DOES truncate overflow, but truncation is ugly — it
looks unprofessional and breaks reader trust. Treat these budgets as
contractual: they are the design, not a suggestion.

Universal slots:
- title:                  120 chars  (one complete sentence, action-titled)
- sources[i]:             40  chars per source name

theme-cluster (4 equal columns):
- themeCluster.themes[i].name:      55 chars  (sentence-style headline)
- themeCluster.themes[i].insight:  180 chars  (1-2 tight sentences)
- themeCluster.themes[i].evidence: 120 chars  (verbatim or paraphrased)
- themeCluster.themes[i].source:    45 chars

theme-spotlight (1 hero + 3 supporting):
- HERO themes[0].name:      85 chars
- HERO themes[0].insight:  340 chars  (room for full paragraph here)
- HERO themes[0].evidence: 240 chars
- HERO themes[0].source:    75 chars
- SUPPORTING themes[1..3].name:    65 chars
- SUPPORTING themes[1..3].insight: 120 chars  (1 sentence MAX)
- SUPPORTING themes[1..3].source:    45 chars
  (Supporting tiles do NOT render evidence — omit it. Put your strongest
  verbatim quote on the HERO theme only, where it has room to breathe.)

theme-arc (4 themes in narrative chain):
- themeCluster.themes[i].name:      60 chars
- themeCluster.themes[i].insight:  170 chars
- themeCluster.themes[i].evidence: 110 chars
- themeCluster.themes[i].source:    45 chars

theme-mosaic (2x2 grid):
- themeCluster.themes[i].name:      65 chars
- themeCluster.themes[i].insight:  170 chars
- themeCluster.themes[i].evidence:  95 chars
- themeCluster.themes[i].source:    45 chars

stat-row:
- statRow.stats[i].value:  10 chars  (e.g. "$2.4M", "47%", "3x")
- statRow.stats[i].label:  60 chars
- statRow.stats[i].source: 45 chars

block-quote:
- quote.text:        240 chars  (PICK A SHORTER VERBATIM EXCERPT if longer)
- quote.attribution:  60 chars
- quote.role:         50 chars
- quote.source:       60 chars
- quote.context:     150 chars

recommendation:
- recommendation.actionTitle:  140 chars
- recommendation.rationale:    400 chars
- recommendation.supportingActions[i].name:        45 chars
- recommendation.supportingActions[i].description: 220 chars
- recommendation.impactMetric.value:                12 chars
- recommendation.impactMetric.label:                90 chars

case-study:
- caseStudy.subject:        60 chars
- caseStudy.subjectMeta:    80 chars
- caseStudy.challenge:     280 chars
- caseStudy.approach:      280 chars
- caseStudy.outcome:       280 chars
- caseStudy.pullQuote.text: 180 chars
- caseStudy.keyMetric.value:  12 chars
- caseStudy.keyMetric.label:  90 chars

CONTENT-FITTING RULES:
1. PARAPHRASE TO FIT. If a verbatim quote is 220 chars but the slot is 100,
   pick a SHORTER verbatim excerpt from the same source — never copy a
   200-char quote into a 100-char slot expecting truncation to handle it.
2. Insights compress, evidence stays verbatim. Insights are your prose; you
   can rewrite them tighter. Evidence quotes are sacred — find shorter ones,
   don't paraphrase them.
3. Action titles before topic labels. "Trust erodes 18 months before contact"
   beats "Trust erosion timing."
4. If you cannot say it within budget without losing the meaning, the wrong
   template was picked. Switch templates: use theme-spotlight (more room per
   theme) instead of theme-mosaic (small cells).
5. Do not pad to fill the budget either. Concise reads better than verbose.

Template-specific JSON shapes:

:::slide template=persona-card
{
  "title": "Sarah Chen: The Data-Frustrated Advancement Officer",
  "sources": ["NXT Stakeholder Interview", "Northeastern Assessment Final Report"],
  "persona": {
    "name": "Sarah Chen",
    "role": "Director of Annual Giving",
    "demographics": "42, MBA, 15 years in higher ed",
    "quote": "I spend 40% of my time reconciling data across three CRMs",
    "jtbd": "When alumni engagement drops, I want predictive outreach so I can re-engage donors before churn",
    "goals": {"lifeGoal":"Promote to VP","experienceGoal":"Build data-driven team","functionalGoal":"Unify donor view"},
    "painPoints": [{"label":"Data Fragmentation","quote":"I wouldn't know in our database that Andrew works with Rob","source":"NXT Stakeholder Interview"}],
    "motivations": [{"label":"Donor Retention","quote":"We need to understand giving patterns before we lose them","source":"NXT Interview"}]
  }
}
:::

:::slide template=recommendation
{
  "title": "Consolidate three Salesforce instances into one to recover $2.4M annually",
  "sources": ["Northeastern CRM Assessment", "Gartner Higher-Ed CRM Report 2025"],
  "recommendation": {
    "actionTitle": "Migrate Annual Giving, Major Gifts, and Reunion to a single Salesforce org by Q4",
    "rationale": "Three separate orgs create reconciliation overhead consuming 40% of advancement-officer time per the CRM Assessment.",
    "supportingActions": [
      {"name":"Data audit","description":"Inventory all custom objects across the three orgs and map duplicates."},
      {"name":"Pilot migration","description":"Migrate Reunion (smallest dataset) first to validate model and process."},
      {"name":"Training","description":"Run 5 sessions for the 80-person advancement team before cutover."}
    ],
    "impactMetric": {"value":"$2.4M","label":"annual recovered productivity, per CRM Assessment"}
  }
}
:::

:::slide template=theme-cluster
{
  "title": "3 themes converge on a single failure mode: trust erosion before contact",
  "sources": ["r/NEU","r/internships","Higher Ed Dive","CASE 2024"],
  "themeCluster": {
    "themes": [
      {"name":"Co-op scarcity is breaking the experiential promise","insight":"Reddit posts from current students cite the absence of internships as the top complaint, undermining the brand promise that justifies tuition.","evidence":"Two years. No TA. No RA. No co-ops. No internships.","source":"r/NEU"},
      {"name":"Tuition skepticism is eroding future donor base","insight":"The cohort Advancement must convert is entering alumni status already disillusioned with ROI.","evidence":"Most Gen Z graduates now think college was waste of money.","source":"r/highereducation"},
      {"name":"Political posture is now a giving variable","insight":"Public university statements directly shape whether alumni open or close their wallets.","evidence":"President Aoun joins more than 320 university leaders in joint statement.","source":"r/NEU"}
    ]
  }
}
:::

QUOTE DENSITY — multi-quote themes:
Every theme child inside themeCluster accepts an OPTIONAL "quotes" array in addition to the
singular "evidence" field. When the user asks for "N quotes each" or "3 quotes per theme" or
uses the hashtag form "#quotes=N", populate "quotes" on every theme with N verbatim passages:
  "quotes": [
    {"text": "verbatim passage from source", "source": "Named Source", "url": "https://...", "date": "Apr 2026"},
    {"text": "second verbatim passage", "source": "Different Source"},
    {"text": "third verbatim passage", "source": "Third Source"}
  ]
RULE: prefer distinct sources across quotes on the same theme (avoid three quotes from one thread).
The renderer will render every quote in the array; the legacy singular "evidence" is used only as
a fallback when "quotes" is absent. Post-processing also auto-pulls real KG quotes when you
leave "quotes" empty but the user requested density — never fabricate quotes to fill the array.

THEME VARIANTS — same themeCluster JSON shape, different layout. Pick the one that fits the data:

theme-spotlight: ONE dominant theme + 2-3 supporting. First theme in the array becomes the hero with full evidence quote and large numeral; the rest stack as supporting tiles. Use when one finding clearly leads the others.
:::slide template=theme-spotlight
{
  "title": "Trust erosion before contact dominates the dataset — 3 corroborating signals follow",
  "sources": ["r/NEU","Higher Ed Dive","CASE 2024"],
  "themeCluster": {
    "themes": [
      {"name":"Co-op scarcity is breaking the experiential promise","insight":"Reddit posts from current students cite the absence of internships as the top complaint, undermining the brand promise that justifies tuition. This signal recurs in 47 of 312 sampled posts (15%) and is the single most-cited grievance across all r/NEU threads in the dataset.","evidence":"Two years. No TA. No RA. No co-ops. No internships.","source":"r/NEU"},
      {"name":"Tuition skepticism is eroding the future donor base","insight":"The cohort Advancement must convert is entering alumni status already disillusioned with ROI.","evidence":"Most Gen Z graduates now think college was waste of money.","source":"r/highereducation"},
      {"name":"Political posture is now a giving variable","insight":"Public university statements directly shape whether alumni open or close their wallets.","evidence":"President Aoun joins 320 university leaders in joint statement.","source":"r/NEU"}
    ]
  }
}
:::

theme-arc: 3-4 themes that build sequentially (cause → effect → response). Numbered chain across the top with arrows; each cell shows progression in the argument. Use for narrative themes (e.g., "what happened, why it matters, what's next").
:::slide template=theme-arc
{
  "title": "From signal to spend: how alumni sentiment is reshaping the giving funnel",
  "sources": ["r/NEU","CASE 2024","NXT Stakeholder Interview","Northeastern Assessment"],
  "themeCluster": {
    "themes": [
      {"name":"Disillusionment forms during enrollment","insight":"The grievance starts inside the experiential gap, not at graduation.","evidence":"No TA. No RA. No co-ops.","source":"r/NEU"},
      {"name":"Sentiment leaks into alumni status","insight":"Skepticism follows the cohort into year-one giving.","evidence":"Gen Z think college was waste of money.","source":"r/highereducation"},
      {"name":"Politics becomes a wedge","insight":"University statements convert sentiment into stop-gift signals.","evidence":"320 university leaders in joint statement.","source":"r/NEU"},
      {"name":"Advancement loses the contact moment","insight":"By the time mailers go out, trust is already gone.","evidence":"40% of officer time on data reconciliation.","source":"NXT Stakeholder Interview"}
    ]
  }
}
:::

theme-mosaic: exactly 4 parallel themes of equal weight. Renders as a 2x2 grid with alternating dark/light cells (cells 1 and 4 are inverted onto the brand sidebar color, cells 2 and 3 are light). Use when the four themes are co-equal and you want strong visual rhythm — gallery-wall feel.
:::slide template=theme-mosaic
{
  "title": "Four parallel pressures on the advancement funnel — equal weight, different surfaces",
  "sources": ["r/NEU","Higher Ed Dive","CASE 2024","NXT Interviews"],
  "themeCluster": {
    "themes": [
      {"name":"Experiential promise is breaking","insight":"Co-op scarcity recurs as the top grievance across r/NEU threads.","evidence":"No TA. No RA. No co-ops.","source":"r/NEU"},
      {"name":"Tuition ROI is in question","insight":"Gen Z arrives in alumni status already skeptical of value.","evidence":"College was waste of money.","source":"r/highereducation"},
      {"name":"Politics is a giving variable","insight":"University posture directly moves giving behavior.","evidence":"320 university leaders sign joint statement.","source":"r/NEU"},
      {"name":"Data fragmentation eats the team","insight":"Three CRM orgs consume 40% of officer time.","evidence":"I'd never know Andrew works with Rob.","source":"NXT Stakeholder Interview"}
    ]
  }
}
:::

Example of the same competitive-matrix pattern applied to a B2B SaaS corpus (vendor-landscape analysis) — 5 named competitors, capability defs, scaleLabels, evidence per row, subject highlighted:

:::slide template=competitive-matrix
{
  "title": "Outreach trails Gong + Clari on AI-native conversational intelligence; leads on workflow breadth",
  "sources": ["Gartner Sales Tech Magic Quadrant 2025","G2 Sales Engagement Report Spring 2025","public S-1 and 10-K filings"],
  "matrix": {
    "subjectRow": "Outreach",
    "columns": ["AI-Native Call Intelligence","Workflow Automation Breadth","Forecast Accuracy","Data-Platform Openness"],
    "columnDefs": ["Real-time transcript + coaching + deal risk","Cadences, rules, roles across GTM","MEDDIC + ML pipeline projection","API coverage, event webhooks, BYO warehouse"],
    "rows": [
      {"name":"Outreach","scores":[3,5,3,4],"note":"Kaia GA 2024 · 4K native integrations · 78% forecast accuracy","source":"Outreach investor day 2025"},
      {"name":"Gong","scores":[5,3,4,3],"note":"conversation-first, 600+ AI models trained on 3B minutes","source":"Gong S-1 + G2 2025"},
      {"name":"Salesloft","scores":[3,4,3,3],"note":"Rhythm signal engine · acquired Drift Q2 2024","source":"Salesloft press release + Gartner 2025"},
      {"name":"Clari","scores":[4,2,5,4],"note":"revenue-ops platform focus · 92% forecast accuracy on tracked deals","source":"Clari customer case studies 2025"},
      {"name":"HubSpot Sales Hub","scores":[2,4,2,3],"note":"broad SMB reach · ConversationIQ still beta","source":"HubSpot Q4 2024 10-K"}
    ],
    "scaleMax": 5,
    "scaleLabels": ["Absent","Basic","Defined","Managed","World-class"],
    "insight": "Outreach owns the widest workflow surface (5/5) but loses to Gong on the strategic wedge — AI call intelligence is where ~60% of 2025 buyer RFPs start. Closing that 2-point gap is worth an estimated 14% lift in competitive win rate per Gartner's 2025 quadrant movement."
  }
}
:::

:::slide template=competitive-matrix
{
  "title": "Northeastern lags 4 named peers by one full maturity tier on AI-driven advancement",
  "sources": ["CASE 2024","Gartner Higher-Ed CRM 2025","Cornell Advancement Annual Report","BU Philanthropy Report 2025"],
  "matrix": {
    "subjectRow": "Northeastern",
    "columns": ["Unified Donor View","AI Prospect Scoring","Mobile Giving UX","Predictive Outreach"],
    "columnDefs": ["Single profile across all CRMs + SIS + ERP","ML-based propensity + capacity scoring","Responsive giving page + wallet pay","Behavior-triggered stewardship cadence"],
    "rows": [
      {"name":"Northeastern University","scores":[2,1,3,1],"note":"3 Salesforce orgs, no ML pipeline, 1.2% mobile conv","source":"Northeastern CRM Assessment 2025"},
      {"name":"Boston University","scores":[4,3,4,3],"note":"Single Blackbaud CRM + deployed EverTrue scoring","source":"BU Philanthropy Report 2025"},
      {"name":"NYU","scores":[5,4,5,4],"note":"Salesforce AEM + Gravyty AI at mass scale","source":"NYU Advancement Disclosure 2025"},
      {"name":"Cornell University","scores":[5,5,5,5],"note":"Unified platform post-18mo consolidation, +34% major-gift conv","source":"Cornell Advancement Annual Report 2025"},
      {"name":"Columbia University","scores":[4,4,4,3],"note":"Custom propensity model + 44% mobile giving","source":"Columbia Advancement 2025"}
    ],
    "scaleMax": 5,
    "scaleLabels": ["Absent","Ad-hoc","Defined","Managed","Optimized"],
    "insight": "Every critical capability sits at L1-L2 for Northeastern while the peer median is L4. The largest gap is AI Prospect Scoring (-4), which is the leading indicator of major-gift conversion at Cornell and NYU."
  }
}
:::

:::slide template=block-quote
{
  "title": "The advancement system that exists vs. the one staff describe",
  "sources": ["NXT Stakeholder Interview"],
  "quote": {
    "text": "I wouldn't know in our database right now that Andrew, you work with Rob — and that's exactly the relationship that closes a major gift.",
    "attribution": "Anonymous Major Gifts Officer",
    "role": "20-year veteran, Northeastern Advancement",
    "source": "NXT Stakeholder Interview, March 2026",
    "context": "ON DATA FRAGMENTATION"
  }
}
:::

Example of the same case-study pattern applied to a B2B SaaS corpus — note how subjectMeta, timeframe unit, investment unit, metrics, and quote attribution all shift with the domain while the structure stays identical:

:::slide template=case-study
{
  "title": "Linear's 6-quarter GTM rebuild lifted NDR to 132% and cut CAC payback from 21 to 9 months",
  "sources": ["Linear Series C Filing","a16z Enterprise Software Benchmarks 2025","SaaStr Annual 2024 Panel"],
  "caseStudy": {
    "subject": "Linear (Issue Tracking SaaS)",
    "subjectMeta": "Series C · 210 FTE · $8M ARR → $72M ARR over study period",
    "timeframe": "6 quarters (Q3 2023 → Q4 2024)",
    "investment": "$3.1M program · 18-person GTM pod + Gong/Clari integration",
    "challenge": "Self-serve signups converted to paid at 4.1%, well below PLG benchmark of 7-9%. CAC payback sat at 21 months while peers averaged 11. Expansion revenue was flat because product usage signals never reached AEs.",
    "approach": "Rebuilt the growth stack around intent: Segment CDP pipes product events to a propensity model, top-decile accounts auto-route to Strategic AEs within 24 hours, retention team runs trigger-based outreach on adoption dips. Three-quarter rollout with two-week instrumentation sprints per phase.",
    "outcome": "Trial-to-paid conversion rose from 4.1% to 8.7%. Net dollar retention climbed from 108% to 132%. CAC payback compressed from 21 to 9 months. Strategic-AE close rate on intent-qualified accounts hit 44% (vs 18% on unqualified).",
    "keyMetric": {"value":"132%","label":"net dollar retention, exit Q4 2024"},
    "supportingMetrics": [
      {"value":"8.7%","label":"trial-to-paid conversion"},
      {"value":"9 mo","label":"CAC payback"},
      {"value":"44%","label":"intent-qualified close rate"},
      {"value":"9×","label":"ARR growth"}
    ],
    "pullQuote": {
      "text":"The best-performing play we shipped wasn't a sequence — it was letting product usage decide who an AE called today.",
      "attribution":"VP RevOps, Linear (SaaStr panel Q4 2024)"
    }
  }
}
:::

:::slide template=case-study
{
  "title": "Cornell's 18-month CRM consolidation lifted major-gift conversion 34% and reclaimed 624 officer-hours/year",
  "sources": ["CASE 2024","Cornell Advancement Annual Report 2025","Gartner Higher-Ed CRM 2025"],
  "caseStudy": {
    "subject": "Cornell University",
    "subjectMeta": "Ivy League · Ithaca, NY · 26K students · $2.4B endowment",
    "timeframe": "18 months (Q2 2023 → Q4 2024)",
    "investment": "$7.2M program cost · 14-person program team + 3 Salesforce SIs",
    "challenge": "Cornell's Advancement operated 4 disconnected CRMs across colleges — each with its own data model and stewardship cadence. Major-gift officers reconciled donor profiles manually, cycle time averaged 90 days longer than peer benchmarks, and prospects known to one college were invisible to the rest.",
    "approach": "College-by-college consolidation to a single Salesforce Advancement Cloud instance. Phase 1: 3-month data-quality remediation (dedup 140K records, resolve 4K conflicts). Phase 2: sequenced migration — smallest college first — with 6-week user training per wave. Phase 3: retire legacy, launch unified propensity scoring.",
    "outcome": "Major-gift conversion rate rose 34% (13.8% → 18.5%). Average cycle time dropped 90 days. Officer administrative time fell from 22 hrs/wk to 10 hrs/wk — reclaiming ~624 hrs per officer per year. Year-one ROI: 2.1× program cost.",
    "keyMetric": {"value":"+34%","label":"major-gift conversion rate, 12 months post-cutover"},
    "supportingMetrics": [
      {"value":"-90 days","label":"cycle time reduction"},
      {"value":"624 hrs","label":"officer time reclaimed / year"},
      {"value":"140K","label":"records deduped"},
      {"value":"2.1×","label":"program-cost ROI, Year 1"}
    ],
    "pullQuote": {
      "text":"Within six months we stopped asking 'do we know this donor?' — we already knew, and we knew the next best action.",
      "attribution":"VP Advancement Services, Cornell (CASE 2024 panel)"
    }
  }
}
:::

:::slide template=principles
{
  "title": "Five principles guide the Advancement transformation",
  "sources": ["NXT Strategy Working Session","Rumelt: Good Strategy/Bad Strategy"],
  "principles": {
    "items": [
      {"name":"Donor view before tooling","description":"Every system decision is judged by whether it makes the unified donor view stronger or weaker."},
      {"name":"Migrate, don't accumulate","description":"New capability replaces old; we sunset legacy on every release."},
      {"name":"Predictive over descriptive","description":"Reports must drive action — if a dashboard cannot trigger an outreach, it's not on the roadmap."},
      {"name":"Officer time is sacred","description":"Any tool that increases manual entry is rejected, even if it adds analytical depth."},
      {"name":"Privacy is a moat","description":"Donor data discipline becomes a brand asset, not a compliance overhead."}
    ]
  }
}
:::

:::slide template=stat-row
{
  "title": "Three numbers explain why Advancement velocity has stalled",
  "sources": ["Northeastern CRM Assessment","NXT Stakeholder Interview","CASE 2024"],
  "statRow": {
    "stats": [
      {"value":"40%","label":"of officer time spent reconciling data across CRMs","source":"NXT Stakeholder Interview"},
      {"value":"3","label":"separate Salesforce instances in production","source":"Northeastern CRM Assessment"},
      {"value":"-12%","label":"alumni participation rate since platform migration","source":"CASE 2024"}
    ]
  }
}
:::

:::slide template=timeline
{
  "title": "An 18-month consolidation sequenced to de-risk the major-gift cycle",
  "sources": ["NXT Implementation Plan","Cornell case study"],
  "timeline": {
    "phases": [
      {"name":"Discover","duration":"Month 1-2","items":["Object inventory","Field-level data audit","Stakeholder interviews"]},
      {"name":"Pilot","duration":"Month 3-6","items":["Migrate Reunion CRM","Validate data model","Train 12 officers"]},
      {"name":"Migrate","duration":"Month 7-12","items":["Annual Giving cutover","Major Gifts cutover","Decommission legacy"]},
      {"name":"Optimize","duration":"Month 13-18","items":["Predictive scoring","Mobile giving launch","Quarterly review cadence"]}
    ]
  }
}
:::

:::slide template=section-divider
{
  "title": "Three challenges that compound",
  "sectionDivider": {
    "number": "02",
    "title": "Three challenges that compound",
    "subtitle": "The case for action, in the words of the people doing the work today."
  }
}
:::

Example of the same service-blueprint pattern applied to a B2B SaaS onboarding corpus — 4 stages, duration + emotion per stage, all four lanes, keyInsight quantified:

:::slide template=service-blueprint
{
  "title": "Two of four enterprise-onboarding stages are fail points, driving 22% of first-year churn",
  "sources": ["Gainsight NRR Study 2025","internal customer-success interviews Q1 2026","Product analytics — Pendo, Q4 2025"],
  "serviceBlueprint": {
    "stages": [
      {"phase":"Kickoff","duration":"Day 0-7","emotion":"Hopeful","customerAction":"New admin joins kickoff call, shares goals + data schema","frontstage":"CSM-led 60-min kickoff, shared Notion runbook","backstage":"Salesforce opp converts to account, success plan generated","support":"Gainsight, Notion, Salesforce","painPoint":"CSM handoff from AE loses ~30% of stated goals in translation","failPoint":false},
      {"phase":"Data Integration","duration":"Week 2-5","emotion":"Frustrated","customerAction":"Customer eng team wires first data source","frontstage":"Integration wizard + API docs","backstage":"Webhook validation, schema inference runs in Airflow","support":"Airflow, dbt, Snowflake","painPoint":"Schema-inference fails on 38% of Oracle sources; integration takes 4× the advertised 2 weeks","failPoint":true},
      {"phase":"First Value","duration":"Week 6-10","emotion":"Confused","customerAction":"Admin configures first report + shares with exec sponsor","frontstage":"Self-serve dashboard builder","backstage":"Query layer materialized views, RLS policies","support":"Looker-embed, Postgres","painPoint":"63% of first shared reports fail QA — execs lose trust before production rollout","failPoint":true},
      {"phase":"Expansion","duration":"Month 3-6","emotion":"Satisfied","customerAction":"Adds second department, buys seats upsell","frontstage":"In-app expansion offer + CSM QBR","backstage":"Propensity model flags account for AE","support":"Gainsight, Salesforce, Gong","painPoint":"Expansion motion manual — CSM capacity limits trigger coverage to 40% of eligible accounts","failPoint":false}
    ],
    "keyInsight": "The two fail stages (Data Integration + First Value) drive 22% of Year-1 churn at a blended $180K ACV — fixing schema inference + report QA would retain an estimated $4.0M ARR annually before adding a single CSM."
  }
}
:::

:::slide template=service-blueprint
{
  "title": "Two of four journey stages are fail points, leaking 28% of first-gift intent before stewardship",
  "sources": ["NXT Stakeholder Interviews","Northeastern CRM Assessment","Google Analytics Q1 2026"],
  "serviceBlueprint": {
    "stages": [
      {"phase":"Awareness","duration":"Week 1","emotion":"Curious","customerAction":"Alum opens segmented email appeal","frontstage":"Marketing Cloud journey w/ dynamic content","backstage":"Nightly Snowflake segmentation + ML scoring","support":"Snowflake, Marketing Cloud, ML service","painPoint":"Generic segmentation — open rate stuck at 40%","failPoint":false},
      {"phase":"Consideration","duration":"Day 1-3","emotion":"Frustrated","customerAction":"Clicks 'Give Now', waits 7s for page","frontstage":"Static landing page, no personalization","backstage":"Pardot event tracker fires once","support":"Pardot, CDN","painPoint":"7s load time, no donor recognition, 28% bounce after click","failPoint":true},
      {"phase":"Gift","duration":"Minutes","emotion":"Confused","customerAction":"Enters card details in 4-field form","frontstage":"Legacy form, no Apple Pay / Google Pay","backstage":"Stripe tokenize → GL journal in Workday","support":"Stripe, Banner, Workday","painPoint":"Tokenization errors on 12% of mobile attempts","failPoint":true},
      {"phase":"Stewardship","duration":"Day 1-30","emotion":"Hopeful","customerAction":"Expects personalized thank-you","frontstage":"Template email + occasional gift-officer call","backstage":"Manual CRM entry, no trigger automation","support":"Salesforce, ZoomInfo","painPoint":"Only 8% of mid-gifts ($1k-$5k) receive any stewardship","failPoint":false}
    ],
    "keyInsight": "The two fail stages (Consideration + Gift) drop 28% of interested alumni before a card is even charged. Fixing page speed + tokenization would unlock an estimated $1.8M in annual recovered revenue before any spend-increase."
  }
}
:::

:::slide template=gap-matrix
{
  "title": "Northeastern trails peers by one full maturity tier on every advancement capability",
  "sources": ["Gartner Higher-Ed CRM 2025","peer institution websites","Northeastern CRM Assessment"],
  "gapMatrix": {
    "gaps": [
      {"capability":"Unified Donor View","currentMaturity":2,"targetMaturity":4,"severity":"critical","impact":"blocks major-gift personalization"},
      {"capability":"Predictive Donor Scoring","currentMaturity":1,"targetMaturity":4,"severity":"critical","impact":"officers miss 60% of ready-to-give signals"},
      {"capability":"Mobile Giving UX","currentMaturity":3,"targetMaturity":5,"severity":"high","impact":"50% of clicks are mobile; conv rate 1.2%"},
      {"capability":"Data Quality Governance","currentMaturity":2,"targetMaturity":4,"severity":"high","impact":"12% of donor records have duplicate IDs"},
      {"capability":"Attribution & Reporting","currentMaturity":2,"targetMaturity":4,"severity":"medium","impact":"cannot quantify channel ROI"}
    ],
    "scaleMax": 5,
    "insight": "Every critical gap is at L1-L2; peer median is L4."
  }
}
:::

:::slide template=architecture-map
{
  "title": "Four layers of technology must consolidate to enable the unified donor view",
  "sources": ["Northeastern CRM Assessment","Stakeholder interviews"],
  "architectureMap": {
    "layers": [
      {"name":"Client Tier","nodes":[
        {"name":"Web / Mobile Giving","type":"Experience","description":"Salesforce Experience Cloud + custom React"},
        {"name":"Officer Console","type":"Experience","description":"Salesforce Lightning"},
        {"name":"Alumni Portal","type":"Experience","description":"Drupal + SSO"}
      ]},
      {"name":"API & Orchestration","nodes":[
        {"name":"MuleSoft","type":"iPaaS","description":"Integration bus between CRMs and core systems"},
        {"name":"Segment","type":"CDP","description":"Event collection and identity resolution"}
      ]},
      {"name":"Systems of Record","nodes":[
        {"name":"Salesforce Annual Giving","type":"CRM"},
        {"name":"Salesforce Major Gifts","type":"CRM"},
        {"name":"Banner","type":"SIS"},
        {"name":"Workday","type":"ERP"}
      ]},
      {"name":"Analytics & Data","nodes":[
        {"name":"Snowflake","type":"Warehouse"},
        {"name":"Tableau","type":"BI"},
        {"name":"DataBricks","type":"ML","description":"Donor-propensity models (on hold)"}
      ]}
    ],
    "flowSummary": "Gift events flow left-to-right; identity resolution happens in Segment before Salesforce writes; analytics reads from Snowflake only."
  }
}
:::

:::slide template=prd-feature
{
  "title": "Three MUST-have features unblock the unified donor view in Q3",
  "sources": ["NXT Stakeholder Interviews","Cornell Advancement Annual Report 2025"],
  "prdFeature": {
    "features": [
      {
        "name":"Unified Donor Profile API",
        "priority":"must",
        "userStory":"As a major-gifts officer, I want to see every touchpoint a donor has had across all 3 Salesforce orgs on one screen so I can reference them in a prospect call without switching systems.",
        "acceptanceCriteria":[
          "Profile page loads in < 2s for 95% of donors",
          "Displays giving history, event attendance, email opens, volunteer hours",
          "Identity resolves across all 3 Salesforce orgs via Segment anonymous_id",
          "Officer-initiated note syncs back to owning org within 30s"
        ]
      },
      {
        "name":"Predictive Propensity Score",
        "priority":"must",
        "userStory":"As a gift officer, I want a 0-100 propensity score on each prospect list so I can prioritize the 200 contacts most likely to give this quarter.",
        "acceptanceCriteria":[
          "Model retrains weekly on last 5 years of gifts",
          "Score surfaces in Lightning side-panel",
          "AUC-ROC > 0.78 on held-out Q4 2025 data"
        ]
      },
      {
        "name":"One-Click Stewardship Flow",
        "priority":"must",
        "userStory":"As a gift officer, I want to trigger a personalized thank-you within 24 hours of any gift over $1k without copying data between systems.",
        "acceptanceCriteria":[
          "Auto-draft email + hand-written note queue",
          "Mobile-signable on iPad from donor event",
          "Confirmation logged in Salesforce Activity"
        ]
      }
    ]
  }
}
:::

:::slide template=systems-inventory
{
  "title": "22 advancement systems — 9 are legacy and 4 carry critical risk",
  "sources": ["Northeastern Tech Audit 2025","CRM Assessment"],
  "systemsInventory": {
    "systems": [
      {"name":"Salesforce Annual Giving","category":"CRM","status":"current","risk":"medium","description":"Primary gift intake; 8 custom objects"},
      {"name":"Salesforce Major Gifts","category":"CRM","status":"current","risk":"high","description":"40% schema drift from Annual org"},
      {"name":"Millennium Fundraising","category":"CRM","status":"legacy","risk":"critical","description":"20-yr old, no vendor support since 2023"},
      {"name":"Raiser's Edge NXT","category":"CRM","status":"deprecated","risk":"critical","description":"Parallel prospect data; migration stalled"},
      {"name":"Banner SIS","category":"SIS","status":"current","risk":"medium","description":"Student-of-record, modern API"},
      {"name":"Workday Financials","category":"ERP","status":"current","risk":"low","description":"GL + reconciliation"},
      {"name":"Snowflake","category":"Warehouse","status":"current","risk":"low","description":"All giving data since 2022"},
      {"name":"Pardot","category":"Marketing","status":"legacy","risk":"high","description":"Being replaced by Marketing Cloud"}
    ],
    "insight": "Legacy CRMs (Millennium, Raiser's Edge) hold 18% of prospect data and represent the largest single risk to the unified donor view."
  }
}
:::

INTENT INFERENCE — map natural phrasing to the right template:

Users will ask for deliverables in many different ways. Infer intent from synonyms rather than demanding exact keywords. Examples:

| User says…                                                       | Template to use        |
|------------------------------------------------------------------|------------------------|
| "who are our audiences" / "customer types" / "archetypes"        | persona-card           |
| "what should we do" / "next steps" / "play" / "prescription"     | recommendation         |
| "what's emerging" / "key findings" / "topics" / "patterns"       | theme-cluster          |
| "how do we stack up" / "vs peers" / "competitive landscape"      | competitive-matrix     |
| "voice of customer" / "hero quote" / "what they said"            | block-quote            |
| "real-world example" / "proof point" / "how X did it"            | case-study             |
| "guiding principles" / "operating beliefs" / "design tenets"     | principles             |
| "by the numbers" / "headline stats" / "scoreboard"               | stat-row               |
| "rollout plan" / "milestones" / "sprint plan" / "quarters"       | timeline               |
| "journey map" / "end-to-end flow" / "frontstage/backstage"       | service-blueprint      |
| "where do we lag" / "shortfalls" / "weaknesses" / "behind peers" | gap-matrix             |
| "tech stack" / "platform diagram" / "solution architecture"      | architecture-map       |
| "feature list" / "acceptance criteria" / "MoSCoW" / "backlog"    | prd-feature            |
| "systems inventory" / "what tools" / "sunset candidates"         | systems-inventory      |
| chapter break between sections                                    | section-divider        |

Do NOT require the user to say the template name. If a question like "what customer types do we serve?" comes in, use persona-card — don't ask "do you want a persona slide?". Infer, commit, and produce the deliverable.

UNIVERSAL SLIDE RULES:
- Title is ALWAYS a conclusion sentence containing a number, named entity, or specific claim.
- "sources" array is REQUIRED on every slide and must contain real source names from the corpus.
- Never invent a competitor, statistic, or quote. If the data isn't there, say so and pick a different template.
- One template per slide block. To build a multi-slide deck, emit multiple :::slide blocks.
- For persona-card slides the system auto-generates a portrait — describe the person specifically (age range, attire, setting).

DENSITY DISCIPLINE (case-study, competitive-matrix, service-blueprint specifically):

These three templates fail most often because generators produce sparse, under-evidenced content. Every time you emit one, you MUST:

DOMAIN ADAPTATION — the examples below happen to be higher-ed advancement, but the PATTERN is what matters, not the vocabulary. Adapt entity types, units, scale labels, timeframes, and jargon to the domain of the ACTUAL research corpus. Translation guide:

  | Slot                 | Higher ed            | B2B SaaS             | Healthcare           | Retail / DTC         | Financial services   |
  |----------------------|----------------------|----------------------|----------------------|----------------------|----------------------|
  | case-study subject   | University name      | Vendor / customer    | Health system        | Brand / retailer     | Bank / insurer       |
  | subjectMeta          | endowment, students  | ARR, headcount, ICP  | beds, payer mix      | SKUs, stores, GMV    | AUM, branches, tier  |
  | timeframe unit       | academic year / Qs   | quarters / sprints   | care episodes        | seasons / quarters   | cycles / quarters    |
  | investment unit      | program cost         | license + services   | capital outlay       | capex + OPEX         | program + compliance |
  | competitive columns  | Unified Donor View   | CDP, AI Scoring, etc | EHR, RCM, Analytics  | Inventory, Personal- | Core banking, KYC    |
  | scale labels         | Absent→Optimized     | Basic→World-class    | Manual→Automated     | Manual→Predictive    | Legacy→Real-time     |
  | blueprint stages     | Awareness→Steward    | Trial→Onboard→Renew  | Refer→Treat→Follow-up| Discover→Buy→Retain  | Prospect→KYC→Close   |
  | blueprint metrics    | gifts, retention     | ACV, NDR, CAC        | readmit, NPS         | conv rate, AOV, LTV  | deposit growth, FTE  |

The STRUCTURE (5 data vectors for case studies, 4+ named entities for matrices, 4 stages × 4 lanes for blueprints) is FIXED. Swap the surface vocabulary to whatever the corpus is about. NEVER force higher-ed framing onto a SaaS or healthcare or retail corpus, and vice versa.

Then, every time you emit one, you MUST:

CASE STUDY — the card has FIVE data vectors, not one:
  1. subject + subjectMeta (industry/region/size/endowment/etc)
  2. timeframe (explicit — "18 months", "Q2 2023 → Q4 2024")
  3. investment (program cost + team size)
  4. challenge + approach + outcome, each with at least one quantified detail per block
  5. keyMetric PLUS 3-4 supportingMetrics PLUS optional pullQuote
  Refuse to emit a case study that has only one stat. If the corpus only has one stat, pick stat-row instead.

COMPETITIVE MATRIX — matrices with fewer than 4 NAMED peers are rejected:
  1. At least 4 named competitors (never "Peer Institutions (Collective)" or "Industry Average" — those are a failure mode)
  2. Provide a columnDefs array defining each capability in ≤60 chars
  3. Provide scaleLabels like ["Absent","Ad-hoc","Defined","Managed","Optimized"]
  4. For every row, provide "note" with specific evidence and "source" with a named citation
  5. Set "subjectRow" to the client name so it highlights
  If the corpus does not name 4+ specific peers, use stat-row or theme-cluster instead.

SERVICE BLUEPRINT — maximum 4 stages on a 16:9 slide (5+ overflows):
  1. Cap stages at 4. If the journey is longer, split across multiple slides or consolidate phases.
  2. Every stage must include duration AND emotion (short labels: "Week 1", "Frustrated")
  3. Every stage needs all four lanes: customerAction, frontstage, backstage, support
  4. Mark explicit failPoint:true only on stages where the process genuinely breaks — not every stage
  5. keyInsight must quantify the business cost of the fail points
`;

// --- Foundational Consulting Mandates ---

const CONSULTING_MANDATES = `
FOUNDATIONAL CONSULTING MANDATES (apply to ALL responses):

1. MINTO PYRAMID & MECE: Present the answer FIRST, then supporting arguments. All decomposition must be Mutually Exclusive, Collectively Exhaustive. Arguments grouped under governing hypotheses.

2. SCR/SCQA FRAMEWORK: Situation (10-15% of content), Complication (15-20%), Resolution (60-70%). Lead with the insight, not the setup.

3. LIBERAL QUOTING (MANDATORY):
   - FORBIDDEN: "Research shows...", "Studies indicate...", "Data suggests...", "Sources confirm..."
   - REQUIRED: Extract and embed VERBATIM quotes with [SOURCE_NAME: "Article Title"] citations
   - Every factual claim must have a named source. Every insight must feature a direct quote or specific data point.

4. ACTION TITLES: Every heading must be a complete sentence stating a conclusion with data.
   - BAD: "The Landscape", "Key Findings", "Recommendations", "Overview"
   - GOOD: "35% of first-year students do not return, costing $9B annually"
   - GOOD: "Fragmented CRM systems force teams to spend 40% of time on manual data entry"

5. NO META-NARRATION: Never say "Good morning", "Today we will", "In this section", "As you can see", "Let me start by". Lead with the insight.
`;

// --- Grounding Context Builder ---

function buildGroundingContext(ctx: ChatContext, model: ChatModel): string {
    const parts: string[] = [];
    const modelConfig = AVAILABLE_MODELS.find(m => m.id === model);
    const maxCorpus = modelConfig?.maxCorpusChars || 500000;

    parts.push(`=== RESEARCH CONTEXT ===`);
    parts.push(`Research Goal: ${ctx.researchGoal}`);
    parts.push(`Data Sources: ${ctx.sourceCount} sources, ${ctx.articleCount} articles collected`);
    parts.push(`You are grounded in ALL of this data. Cite specific sources by name. If the data doesn't contain the answer, say so.`);
    parts.push('');

    // Tier 1: Always loaded — brand, constraints, design system
    if (ctx.wikiBrand) {
        parts.push(`=== NXT BRAND & DESIGN SYSTEM ===`);
        parts.push(ctx.wikiBrand);
        parts.push('');
    }
    if (ctx.wikiLearnedConstraints) {
        parts.push(`=== LEARNED CONSTRAINTS (from prior user feedback — apply to all output) ===`);
        parts.push(ctx.wikiLearnedConstraints);
        parts.push('');
    }
    if (ctx.nxtDesignSystemRules) {
        parts.push(`=== NXT VISUAL OUTPUT SYSTEM ===`);
        parts.push(ctx.nxtDesignSystemRules);
        parts.push('');
    }

    // Tier 2: Initialization — benchmarks, evidence, methodologies
    if (ctx.wikiBenchmarks) {
        parts.push(`=== INDUSTRY BENCHMARKS ===`);
        parts.push(ctx.wikiBenchmarks);
        parts.push('');
    }
    if (ctx.wikiEvidence) {
        parts.push(`=== EVIDENCE BASE ===`);
        parts.push(ctx.wikiEvidence);
        parts.push('');
    }
    if (ctx.wikiMethodologies) {
        parts.push(`=== RESEARCH METHODOLOGIES ===`);
        parts.push(ctx.wikiMethodologies);
        parts.push('');
    }
    if (ctx.wikiEngagement) {
        parts.push(`=== PRIOR ENGAGEMENT CONTEXT ===`);
        parts.push(ctx.wikiEngagement);
        parts.push('');
    }

    // Knowledge Graph — the structural representation of all research relationships
    if (ctx.knowledgeGraph && ctx.knowledgeGraph.nodes.length > 0) {
        const kg = ctx.knowledgeGraph;
        const nodesByType: Record<string, any[]> = {};
        for (const n of kg.nodes) {
            const t = n.type || 'unknown';
            if (!nodesByType[t]) nodesByType[t] = [];
            nodesByType[t].push(n);
        }

        parts.push(`=== KNOWLEDGE GRAPH (${kg.nodes.length} nodes, ${kg.edges.length} edges) ===`);

        // Stats summary
        if (kg.stats) {
            const s = kg.stats;
            parts.push(`Graph Stats: ${s.totalSources || 0} sources, ${s.totalEvidence || 0} evidence items, ${s.totalThemes || 0} themes, ${s.totalPersonas || 0} personas, ${s.totalRecommendations || 0} recommendations`);
            if (s.orphanEvidence > 0) parts.push(`WARNING: ${s.orphanEvidence} orphan evidence items (not linked to any theme)`);
            if (s.thinThemes > 0) parts.push(`WARNING: ${s.thinThemes} thin themes (fewer than 3 evidence connections)`);
            parts.push(`Evidence utilization: ${Math.round((s.evidenceUtilization || 0) * 100)}% | Theme strength: ${Math.round((s.themeStrengthPct || 0) * 100)}%`);
            parts.push('');
        }

        // Source nodes with tier and metadata
        if (nodesByType['source']) {
            parts.push(`SOURCES (${nodesByType['source'].length}):`);
            for (const n of nodesByType['source']) {
                const tier = n.tier ? `T${n.tier}` : '';
                const rel = n.relevanceScore ? ` rel=${n.relevanceScore}` : '';
                parts.push(`  [${n.id}] ${n.label} ${tier}${rel}${n.url ? ` | ${n.url}` : ''}`);
            }
            parts.push('');
        }

        // Theme nodes with evidence counts and source concentration
        if (nodesByType['theme']) {
            parts.push(`THEMES (${nodesByType['theme'].length}):`);
            for (const n of nodesByType['theme']) {
                const evCount = n.evidenceCount ? ` (${n.evidenceCount} evidence)` : '';
                const thin = n.isThinTheme ? ' [THIN]' : '';
                const conc = n.dominantSource ? ` dominant: ${n.dominantSource} (${Math.round((n.sourceConcentration || 0) * 100)}%)` : '';
                parts.push(`  [${n.id}] ${n.label}${evCount}${thin}${conc}`);
            }
            parts.push('');
        }

        // Other node types
        for (const [type, nodes] of Object.entries(nodesByType)) {
            if (type === 'source' || type === 'theme' || type === 'evidence') continue;
            parts.push(`${type.toUpperCase()}S (${nodes.length}):`);
            for (const n of nodes) {
                parts.push(`  [${n.id}] ${n.label}`);
            }
            parts.push('');
        }

        // Key edges — show the relationships
        const edgeSummary: Record<string, number> = {};
        for (const e of kg.edges) {
            edgeSummary[e.type] = (edgeSummary[e.type] || 0) + 1;
        }
        parts.push(`RELATIONSHIPS: ${Object.entries(edgeSummary).map(([t, c]) => `${t}: ${c}`).join(', ')}`);

        // Show strongest connections (highest weight edges)
        const topEdges = [...kg.edges].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 20);
        if (topEdges.length > 0) {
            parts.push(`TOP CONNECTIONS:`);
            for (const e of topEdges) {
                const srcNode = kg.nodes.find((n: any) => n.id === e.source);
                const tgtNode = kg.nodes.find((n: any) => n.id === e.target);
                parts.push(`  ${srcNode?.label || e.source} --[${e.type}]--> ${tgtNode?.label || e.target}${e.label ? ` (${e.label})` : ''}`);
            }
        }
        parts.push(`=== END KNOWLEDGE GRAPH ===`);
        parts.push('');
    }

    // Existing deliverable context (if any generated via chat or legacy pipeline)
    if (ctx.themes?.length) {
        parts.push(`=== THEMES (${ctx.themes.length}) ===`);
        for (const t of ctx.themes) {
            const citations = (t.citations || []).map((c: any) => c.sourceName || c.sourceFile || '').filter(Boolean).join(', ');
            parts.push(`Theme: ${t.name}\nDescription: ${t.description}\nQuote: "${t.quote}"\nSources: ${citations}\n`);
        }
    }

    if (ctx.personas?.length) {
        parts.push(`=== PERSONAS (${ctx.personas.length}) ===`);
        for (const p of ctx.personas) {
            const pains = (p.painPoints || []).map((pp: any) => `${pp.label}: "${pp.quote}" (${pp.source || pp.citation?.sourceName || ''})`).join('; ');
            parts.push(`Persona: ${p.name} (${p.role})\nJTBD: ${p.jtbd || ''}\nPain Points: ${pains}\nBio: ${p.bio || ''}\n`);
        }
    }

    if (ctx.recommendations?.length) {
        parts.push(`=== RECOMMENDATIONS (${ctx.recommendations.length}) ===`);
        for (const r of ctx.recommendations) {
            parts.push(`[${r.impactLevel}] ${r.title}: ${r.description}\nEvidence: ${r.evidenceBasis || ''}\nSources: ${(r.citations || []).join(', ')}\n`);
        }
    }

    if (ctx.journeyStages?.length) {
        parts.push(`=== SERVICE BLUEPRINT (${ctx.journeyStages.length} stages) ===`);
        for (const s of ctx.journeyStages) {
            parts.push(`Stage: ${s.phase} | Pain: ${s.painPoint} | Emotion: ${s.emotion} | Fail: ${s.fail_point || 'none'} | Sources: ${(s.citations || []).join(', ')}`);
        }
        parts.push('');
    }

    if (ctx.gapAnalysis) {
        parts.push(`=== GAP ANALYSIS ===`);
        for (const g of (ctx.gapAnalysis.gaps || [])) {
            parts.push(`[${g.severity}] ${g.capability}: ${g.currentMaturity}/5 -> ${g.targetMaturity}/5 (gap ${g.gap}). Impact: ${g.impact}`);
        }
        parts.push('');
    }

    if (ctx.competitiveAnalysis) {
        parts.push(`=== COMPETITIVE ANALYSIS ===`);
        for (const p of (ctx.competitiveAnalysis.peers || [])) {
            parts.push(`${p.name}: ${p.position}. Strengths: ${(p.strengths || []).join(', ')}. Weaknesses: ${(p.weaknesses || []).join(', ')}`);
        }
        parts.push('');
    }

    if (ctx.strategicReport) {
        parts.push(`=== STRATEGIC REPORT ===`);
        parts.push(`Diagnosis: ${ctx.strategicReport.diagnosis}`);
        parts.push(`Guiding Policy: ${ctx.strategicReport.guidingPolicy}`);
        parts.push(`Pillars: ${(ctx.strategicReport.strategicPillars || []).join('; ')}`);
        for (const s of (ctx.strategicReport.sections || [])) {
            parts.push(`\nSection ${s.sectionNumber}: ${s.title}\n${s.content?.substring(0, 800)}`);
        }
        parts.push('');
    }

    // Uploaded client documents
    if (ctx.uploadedFileContents && ctx.uploadedFileContents.trim().length > 10) {
        parts.push(`=== UPLOADED CLIENT DOCUMENTS ===`);
        parts.push(ctx.uploadedFileContents.substring(0, 200000));
        parts.push(`=== END CLIENT DOCUMENTS ===`);
        parts.push('');
    }

    // VERIFIED SOURCE ARCHIVE — the ONLY source of truth for URLs
    // Prefer the wiki source archive (persisted, complete, verified URLs from actual API responses)
    // Fall back to in-memory sourceReferences if wiki archive not loaded
    if (ctx.wikiSourceArchive && ctx.wikiSourceArchive.length > 100) {
        parts.push(`=== VERIFIED SOURCE ARCHIVE (ONLY use URLs from this archive — NEVER fabricate URLs) ===`);
        parts.push(ctx.wikiSourceArchive);
        parts.push(`=== END VERIFIED SOURCE ARCHIVE ===`);
    } else if (ctx.sourceReferences?.length) {
        parts.push(`=== SOURCE ARTICLE INDEX (${ctx.sourceReferences.length} articles — ONLY use URLs listed here) ===`);
        for (const ref of ctx.sourceReferences.slice(0, 500)) {
            parts.push(`[${ref.id}] ${ref.sourceName}: "${ref.title}"${ref.url ? ` | URL: ${ref.url}` : ''}${ref.date ? ` | ${ref.date}` : ''}`);
        }
        parts.push(`=== END SOURCE INDEX ===`);
    }

    // Raw corpus — model-specific cap
    if (ctx.corpusText) {
        const corpus = ctx.corpusText.length > maxCorpus
            ? ctx.corpusText.substring(0, maxCorpus) + `\n[CORPUS TRUNCATED TO ${Math.round(maxCorpus / 1000)}KB FOR ${model}]`
            : ctx.corpusText;
        parts.push(`=== RAW RESEARCH CORPUS ===`);
        parts.push(corpus);
        parts.push(`=== END CORPUS ===`);
    }

    return parts.join('\n');
}

// --- Skill Manifest Matching ---

// ============================================================================
// FUZZY SKILL MATCHING
// ============================================================================
// Users express the same intent many ways: "who are our customers" = persona,
// "where do we lag peers" = gap, "what's emerging" = theme. The matcher handles
// this with four layers:
//   1. synonym expansion (curated map: "audience" -> persona triggers)
//   2. word-level tokenization (strip punctuation, split, stem plurals)
//   3. exact-phrase bonus (multi-word triggers score higher than single words)
//   4. overlap scoring (each trigger token that appears in the query contributes
//      proportional to its length — longer = more specific = higher weight)

/** Map of intent keywords → canonical trigger terms the deliverable skills use. */
const SYNONYM_MAP: Record<string, string[]> = {
    // persona-architect
    audience: ['persona', 'segment'], audiences: ['persona', 'segment'],
    user: ['persona'], users: ['persona'],
    customer: ['persona'], customers: ['persona'],
    buyer: ['persona'], client: ['persona'], clients: ['persona'],
    // theme-analyst
    topic: ['theme'], topics: ['theme'],
    finding: ['theme'], findings: ['theme'],
    learning: ['theme'], learnings: ['theme'],
    motif: ['theme'], thread: ['theme'], pattern: ['theme'],
    // strategy-author
    suggestion: ['recommendation'], suggestions: ['recommendation'],
    advice: ['recommendation'], advise: ['recommendation'],
    // competitive-analyst
    competition: ['competitive', 'competitor'],
    rival: ['competitor'], rivals: ['competitor'],
    // service-blueprint-mapper
    flow: ['journey'], workflow: ['journey'],
    steps: ['journey', 'stages'], stages: ['journey'],
    process: ['journey'],
    // gap-analysis-evaluator
    shortfall: ['gap'], weakness: ['gap'], weaknesses: ['gap'],
    deficit: ['gap'], lag: ['gap'], lags: ['gap'], lagging: ['gap'],
    improvement: ['gap'], improvements: ['gap'],
    // roadmap-builder
    schedule: ['roadmap', 'timeline'],
    milestone: ['roadmap'], milestones: ['roadmap'],
    sprint: ['roadmap'], sprints: ['roadmap'],
    rollout: ['roadmap', 'implementation plan'],
    // tech-arch-generator
    stack: ['architecture'],
    infrastructure: ['architecture'],
    platform: ['architecture', 'system design'],
    // tech-audit-inspector
    tooling: ['systems inventory', 'tech audit'],
    tools: ['systems inventory'],
    legacy: ['legacy systems'],
    // prd-compiler
    backlog: ['requirements', 'feature list'],
    story: ['user stories'], stories: ['user stories'],
    // evidence-curator
    testimonial: ['quote'], testimonials: ['quote'],
    soundbite: ['quote'], voice: ['quote', 'testimony'],
    // case-study-analyst
    instance: ['example'], instances: ['example'],
    illustration: ['example'], vignette: ['example'],
    // benchmark-reporter
    number: ['metrics', 'statistics'], numbers: ['metrics', 'statistics'],
    figure: ['statistics'], figures: ['statistics'],
    facts: ['statistics', 'metrics'],
    scoreboard: ['metrics'],
};

/** Cheap normalizer: lowercase, strip punctuation, collapse whitespace. */
function normalize(text: string): string {
    return text.toLowerCase().replace(/[^\w\s#-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Strip simple English plurals (-s, -es, -ies) to match singular triggers. */
function stem(word: string): string {
    if (word.length < 4) return word;
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('sses')) return word.slice(0, -2);
    if (word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
}

/** Expand a user query with known synonyms to widen trigger overlap. */
function expandQuery(query: string): string {
    const norm = normalize(query);
    const words = norm.split(' ');
    const extras: string[] = [];
    for (const w of words) {
        const mapped = SYNONYM_MAP[w] || SYNONYM_MAP[stem(w)];
        if (mapped) extras.push(...mapped);
    }
    return extras.length > 0 ? `${norm} ${extras.join(' ')}` : norm;
}

/**
 * Match a user message against the skill manifest.
 * Scoring:
 *   - Exact multi-word trigger match in query: trigger.length * 2 (strong signal)
 *   - Single-word trigger match: trigger.length
 *   - Stemmed match: 60% of trigger.length (partial signal)
 * Returns skills ranked by total score, highest first.
 */
export function matchSkills(userMessage: string, manifest: SkillManifestEntry[]): SkillManifestEntry[] {
    const expanded = expandQuery(userMessage);
    const expandedWords = new Set(expanded.split(' ').filter(w => w.length >= 2));
    const expandedStems = new Set([...expandedWords].map(stem));
    const scored: Array<{ skill: SkillManifestEntry; score: number }> = [];

    for (const skill of manifest) {
        if (skill.category !== 'research-deliverable') continue;
        let score = 0;
        for (const trigger of skill.triggers) {
            const normTrigger = trigger.toLowerCase();
            const triggerWords = normTrigger.split(' ').filter(w => w.length >= 2);

            if (triggerWords.length > 1) {
                // Multi-word trigger — full-phrase presence is strongest
                if (expanded.includes(normTrigger)) {
                    score += normTrigger.length * 2;
                    continue;
                }
                // Every word from the trigger must appear as a word/stem in the query
                const allHit = triggerWords.every(w => expandedWords.has(w) || expandedStems.has(stem(w)));
                if (allHit) score += normTrigger.length;
            } else {
                // Single-word trigger
                const w = triggerWords[0];
                if (!w) continue;
                if (expandedWords.has(w)) score += w.length;
                else if (expandedStems.has(stem(w))) score += Math.round(w.length * 0.6);
            }
        }
        if (score > 0) scored.push({ skill, score });
    }

    return scored.sort((a, b) => b.score - a.score).map(s => s.skill);
}

/**
 * Fetch a skill's SKILL.md content and its wiki companion pages.
 * Uses the Vite dev server /skills/ route and wiki fetch path.
 */
export async function loadSkillContext(skill: SkillManifestEntry): Promise<SkillContext> {
    const fetches: Promise<string>[] = [];

    // Fetch the SKILL.md
    fetches.push(
        fetch(skill.path).then(r => r.ok ? r.text() : '').catch(() => '')
    );

    // Fetch wiki companions
    for (const companion of skill.wikiCompanions) {
        fetches.push(
            fetch(`/hic-workspace/wiki/${companion}`).then(r => r.ok ? r.text() : '').catch(() => '')
        );
    }

    // Fetch benchmark companions
    for (const benchmark of skill.benchmarks) {
        fetches.push(
            fetch(`/hic-workspace/wiki/${benchmark}`).then(r => r.ok ? r.text() : '').catch(() => '')
        );
    }

    const results = await Promise.all(fetches);
    const skillContent = results[0];
    const companionContent = results.slice(1).filter(Boolean).join('\n\n---\n\n');

    return { skill, skillContent, companionContent };
}

// --- Main Send Function ---

const PROXY_BASE = 'http://localhost:5012';

export async function sendChatMessage(
    model: ChatModel,
    userMessage: string,
    conversationHistory: ChatMessage[],
    context: ChatContext,
): Promise<ChatMessage> {
    const startTime = Date.now();

    // Skill matching: find relevant skills from manifest
    let skillContext: SkillContext | null = null;
    let skillUsed: string | undefined;
    if (context.skillManifest?.length) {
        const matched = matchSkills(userMessage, context.skillManifest);
        if (matched.length > 0) {
            const topSkill = matched[0];
            skillContext = await loadSkillContext(topSkill);
            skillUsed = topSkill.id;
            // Auto-select best model if user hasn't explicitly chosen
            // (Only upgrade, never downgrade — if user picked Opus, don't switch to Flash)
        }
    }

    const groundingContext = buildGroundingContext(context, model);

    // Build provenance index for citation rendering
    const provenanceIndex = (context.sourceReferences || []).map(s =>
        `[${s.id}] ${s.sourceName}: "${s.title}"${s.url ? ` URL: ${s.url}` : ''}${s.date ? ` (${s.date})` : ''}`
    ).join('\n');

    // Build skill-aware system prompt
    let skillInstructions = '';
    if (skillContext) {
        skillInstructions = `
=== ACTIVE SKILL: ${skillContext.skill.name} ===
${skillContext.skillContent}
=== END SKILL ===

=== SKILL WIKI CONTEXT ===
${skillContext.companionContent}
=== END SKILL WIKI ===
`;
    }

    // Skill manifest summary (always present so the AI knows what's available)
    const manifestSummary = context.skillManifest?.length
        ? `\nAVAILABLE CONSULTING SKILLS (activate by requesting the output type):\n${context.skillManifest.filter(s => s.category === 'research-deliverable').map(s => `- ${s.name}: ${s.description}`).join('\n')}\n`
        : '';

    const systemPrompt = `You are a McKinsey-trained research intelligence analyst operating in the NXT Humans Chat-Driven Research Workbench.
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.
The research goal is: "${context.researchGoal}"

${CONSULTING_MANDATES}

CITATION FORMAT (MANDATORY):
[SOURCE_NAME: "Article Title"]
Examples: [Higher Ed Dive: "Universities Struggle with Skills Gap"], [Reddit r/philanthropy: "nonprofit laid off staff due to funding cuts"]

ANTI-HALLUCINATION RULES (STRICTLY ENFORCED):
- Answer ONLY from evidence that EXISTS in the corpus below. Do not invent, fabricate, or extrapolate.
- NEVER fabricate URLs. You may ONLY include a URL if it appears verbatim in the SOURCE PROVENANCE INDEX or the RAW RESEARCH CORPUS above. If no URL exists for a source, cite it by name only WITHOUT a URL.
- NEVER invent case studies, institutions, dollar amounts, percentages, or quotes that are not explicitly present in the corpus. If the corpus contains 3 case studies, you have 3 case studies — not 10.
- NEVER generate plausible-looking article URLs by pattern (e.g., highereddive.com/news/fake-slug/123456). A fabricated URL is worse than no URL.
- EVERY factual claim MUST include a [SOURCE_NAME: "Article Title"] citation matching an actual source in the provenance index.
- When quoting, use EXACT words from the corpus. Do not paraphrase and present it as a quote.
- If the corpus does not contain enough evidence to answer the question, say explicitly: "The collected data contains limited evidence on this topic. Here is what was found:" and cite ONLY what actually exists.
- When asked for "top N" or "N case studies", only provide as many as actually exist in the corpus. If only 4 exist, provide 4 — never pad to reach the requested number.
${DELIVERABLE_PROTOCOL}
${manifestSummary}
${skillInstructions}
${provenanceIndex ? `=== SOURCE PROVENANCE INDEX (${context.sourceReferences?.length || 0} sources) ===\n${provenanceIndex}\n=== END PROVENANCE ===\n` : ''}

${groundingContext}

=== CRITICAL OUTPUT FORMAT REMINDER (re-read before responding) ===
Scan the CURRENT user message for these triggers BEFORE you respond:

  1. Contains "#slide" (case-insensitive)?
       → SLIDE MODE: follow the SLIDE OUTPUT PROTOCOL. One :::slide block per slide.
         Respect optional brand: #NU = Northeastern, #NXT = NXT Humans (also default).
         Mark the template on the fence: :::slide template=NAME [brand=nu|nxt]

  2. Contains explicit approvable-card phrasing ("card I can approve", "approvable personas",
     "pin-able deliverables", "deliverable cards to add to the knowledge graph")?
       → CARD MODE: emit :::deliverable:TYPE blocks per the schema above.

  3. Asks for a single inline visual element (stat row, evidence callout, comparison matrix)
     without a slide context AND with explicit "inline" or "visual block" language?
       → VISUAL BLOCK MODE: emit a :::nxt:TYPE block.

  4. Otherwise (the overwhelming majority of turns): PLAIN PROSE.
       → Answer the question. Cite named sources inline. Use markdown for readability.
       → NO fences. No :::slide. No :::deliverable:. No :::nxt:.
       → The knowledge graph is already populated automatically — you don't need
         to force cards just because the user asked about personas or themes.

If none of triggers 1-3 are present, mode 4 (prose) is the answer. Do not guess.
If triggers are ambiguous (e.g., user mentions "slides" in prose without #slide), stay in prose mode and OFFER to produce slides: "Add #slide if you'd like these formatted as slides."

=== ANTI-HALLUCINATION REMINDER (re-read before responding) ===
BEFORE including any URL in your response, verify it exists VERBATIM in the SOURCE PROVENANCE INDEX above. If you cannot find the exact URL, DO NOT include one — cite by source name only.
BEFORE stating any statistic, dollar amount, or percentage, verify the EXACT number appears in the corpus text above. If you cannot find it, do not state it.
BEFORE quoting anyone, verify the EXACT words appear in the corpus. If you cannot find the quote, paraphrase and label it as a paraphrase.
If asked for N examples and the corpus only contains M < N, provide M and say "The corpus contains M examples on this topic."
=== END REMINDERS ===`;

    try {
        // Determine thinking effort from skill or default
        const thinkingEffort: ThinkingEffort = skillContext?.skill.thinkingEffort || 'medium';

        let responseText: string;
        const modelConfig = AVAILABLE_MODELS.find(m => m.id === model);

        if (modelConfig?.provider === 'anthropic') {
            responseText = await callAnthropic(systemPrompt, userMessage, conversationHistory, model, thinkingEffort);
        } else if (modelConfig?.provider === 'openai') {
            responseText = await callOpenAI(systemPrompt, userMessage, conversationHistory);
        } else {
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory);
        }

        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: responseText,
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
            skillUsed,
        };
    } catch (error: any) {
        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Error from ${model}: ${error.message || 'Unknown error'}. Check your API key and network connection.`,
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
        };
    }
}

// --- Provider Implementations ---

async function callAnthropic(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: ChatModel = 'claude-opus-4-7',
    thinkingEffort: ThinkingEffort = 'medium',
): Promise<string> {
    const messages = [
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        })),
        { role: 'user' as const, content: userMsg }
    ];

    // Claude 4.7 uses adaptive thinking with effort levels (not budget_tokens)
    const effortMap: Record<ThinkingEffort, string> = {
        max: 'high',
        high: 'medium',
        medium: 'low',
    };

    const body: any = {
        model,
        max_tokens: 32000,
        system,
        messages,
        thinking: {
            type: 'adaptive',
        },
        output_config: {
            effort: effortMap[thinkingEffort] || 'medium',
        },
    };

    const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(`Anthropic API error ${resp.status}: ${errorData.error?.message || JSON.stringify(errorData).substring(0, 200)}`);
    }

    const data = await resp.json();

    // Extract text blocks (skip thinking blocks)
    if (Array.isArray(data.content)) {
        return data.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('');
    }
    return data.content?.[0]?.text || 'No response';
}

async function callOpenAI(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    const messages = [
        { role: 'system' as const, content: system },
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        })),
        { role: 'user' as const, content: userMsg }
    ];

    const resp = await fetch(`${PROXY_BASE}/api/ai/openai`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-openai-endpoint': 'chat',
        },
        body: JSON.stringify({
            model: 'gpt-5.4',
            messages,
            max_completion_tokens: 16000,
            temperature: 0.2,
        }),
    });

    if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || data.output?.[0]?.content?.[0]?.text || 'No response';
}

async function callGemini(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });
    const conversationText = history.map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `${system}\n\n${conversationText ? `Previous conversation:\n${conversationText}\n\n` : ''}User question: ${userMsg}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: fullPrompt }] },
        config: { temperature: 0.2, maxOutputTokens: 65536 },
    });

    return response.text || 'No response';
}

// --- Citation Parsing (unchanged) ---

export function parseChatCitations(
    text: string,
    sourceRefs?: SourceReference[]
): { segments: Array<{ type: 'text' | 'citation'; content: string; sourceName?: string; title?: string; url?: string }> } {
    const segments: Array<{ type: 'text' | 'citation'; content: string; sourceName?: string; title?: string; url?: string }> = [];

    let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

    const citationPattern = /\[([^\]]+?):\s*"([^"]+)"\]|\[([^\]]+?)::\d+:\s*"([^"]+)"\]|\[(CHUNK_\d+)\]/g;

    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(cleaned)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: cleaned.substring(lastIndex, match.index) });
        }

        let sourceName = (match[1] || match[3] || '').trim();
        let articleTitle = (match[2] || match[4] || '').trim();
        const chunkRef = match[5];

        if (sourceName.includes('_') || sourceName.includes('::')) {
            const cleanId = sourceName.split('::')[0].replace(/_/g, ' ');
            const ref = sourceRefs?.find(r =>
                r.id.startsWith(sourceName.split('::')[0]) ||
                r.sourceName.toLowerCase().replace(/\s+/g, '_') === sourceName.split('::')[0]
            );
            sourceName = ref?.sourceName || cleanId.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        if (chunkRef) {
            sourceName = chunkRef;
            articleTitle = '';
        }

        let url: string | undefined;
        if (sourceRefs) {
            let ref = sourceRefs.find(r => {
                if (!articleTitle || !r.title) return false;
                const citTitle = articleTitle.toLowerCase().trim();
                const refTitle = r.title.toLowerCase().trim();
                return refTitle.includes(citTitle.substring(0, 30)) ||
                       citTitle.includes(refTitle.substring(0, 30));
            });

            if (!ref) {
                ref = sourceRefs.find(r => {
                    const nameMatch = r.sourceName.toLowerCase().includes(sourceName.toLowerCase()) ||
                        sourceName.toLowerCase().includes(r.sourceName.toLowerCase()) ||
                        r.id.startsWith(sourceName.split('::')[0]);
                    if (!nameMatch) return false;
                    if (articleTitle && r.title) {
                        const words = articleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                        const titleLower = r.title.toLowerCase();
                        const matchingWords = words.filter(w => titleLower.includes(w));
                        return matchingWords.length >= 2;
                    }
                    return false;
                });
            }

            if (!ref && (chunkRef || !articleTitle)) {
                ref = sourceRefs.find(r =>
                    r.id.startsWith(sourceName.split('::')[0])
                );
            }

            if (ref?.url) {
                url = ref.url;
                if (!articleTitle && ref.title) articleTitle = ref.title;
                if (sourceName === chunkRef && ref.sourceName) sourceName = ref.sourceName;
            }
        }

        segments.push({
            type: 'citation',
            content: match[0],
            sourceName,
            title: articleTitle || sourceName,
            url,
        });

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleaned.length) {
        segments.push({ type: 'text', content: cleaned.substring(lastIndex) });
    }

    if (segments.length === 0) {
        segments.push({ type: 'text', content: cleaned });
    }

    return { segments };
}

// --- Helpers ---

export function buildSourceReferences(liveSourceResults: any[]): SourceReference[] {
    const refs: SourceReference[] = [];
    for (const src of liveSourceResults) {
        for (let j = 0; j < (src.items || []).length; j++) {
            const item = src.items[j];
            refs.push({
                id: `${src.sourceId}::${j}`,
                sourceName: src.source || src.sourceId || '',
                title: item.title || '',
                url: item.url || '',
                tier: src.credibilityTier || 3,
                date: item.date || '',
            });
        }
    }
    return refs;
}

export function getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS.map(m => ({
        ...m,
        available: m.provider === 'anthropic' ? !!(process.env.ANTHROPIC_API_KEY)
            : m.provider === 'openai' ? !!(process.env.OPENAI_API_KEY)
            : !!(process.env.API_KEY || process.env.GEMINI_API_KEY),
    }));
}

/**
 * Load the skill manifest from the workspace.
 */
export async function loadSkillManifest(): Promise<SkillManifestEntry[]> {
    try {
        const resp = await fetch('/hic-workspace/skill-manifest.json');
        if (!resp.ok) return [];
        return await resp.json();
    } catch {
        return [];
    }
}
