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

// 2026-05-07 — Promoted Gemini 3.1 Pro to primary chat model. DeepSeek V4
// Flash produced jargon-heavy, hyperbolic, AI-slop narratives that read as
// fake. Gemini 3.1 Pro has a 1M-token context, follows multi-step
// instructions reliably, and produces descriptive, professional copy.
// The legacy DeepSeek IDs remain in the type so prior localStorage values
// don't reject at parse-time — the resolver in sendChatMessage maps any
// unrecognized model to gemini-3.1-pro-preview.
export type ChatModel = 'gemini-3.1-pro-preview' | 'deepseek-v4-flash' | 'deepseek-v4-pro';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    // 2026-05-05 — Widened from ChatModel to string. Designer chat returns
    // FreeformGenerationModel / GenerationModel which can include legacy
    // (Gemini/GPT) ids — those flow through here as message-level labels
    // for display only, not for routing.
    model?: string;
    timestamp: number;
    tokenCount?: number;
    durationMs?: number;
    imageData?: string; // base64 image for inline rendering
    skillUsed?: string; // which skill was activated for this response
    /** When the chat is delivering a pre-made Design Desk artifact, this holds a reference. */
    deliveredArtifactId?: string;
    deliveredArtifactType?: 'persona' | 'journey' | 'org';
    /** When true, the artifact is rendered inside a 16:9 NXT slide frame (triggered by #slide / #slides). */
    deliveredAsSlide?: boolean;
    /** When the chat composed an interactive presentation, this is the renderer URL.
     * Triggers a Launch button to open the presentation in a separate window. */
    presentationUrl?: string;
    presentationMeta?: {
        title?: string;
        brand?: 'NXT' | 'NU';
        sectionCount?: number;
        citationCount?: number;
        sourceCount?: { external: number; uploaded: number; analysis: number; total: number };
    };
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
    /**
     * The data-source categories the user explicitly toggled ON during data
     * collection. The synthesis layer MUST cite from each of these. If a
     * category yielded no usable content, the response MUST mark it as
     * `CATEGORY GAP: <category>` rather than silently omitting it.
     * Populated by App.tsx from liveSourceResults / proxyResults.
     */
    activeCategories?: Array<{ name: string; sourceCount: number; itemCount: number }>;
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
    /** 2026-04-21 — individual uploaded file objects (name + parsedText).
     *  Kept as an array (not just concatenated text) so the Dynamic Prompt
     *  Chips can generate per-document questions like
     *  "Summarize CASE VSE 2025 key findings". Safe to omit; pre-collection
     *  suggestions fall back to generic prompts. */
    uploadedFiles?: Array<{ name: string; parsedText?: string }>;
    /** 2026-04-21 — live source feed passed through so the Dynamic Prompt
     *  Chips can ask about the RETURNING SOURCES mid-collection. */
    liveSourceResults?: Array<{ source?: string; items?: Array<{ title?: string; sourceName?: string }>; status?: string }>;
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
    /** Phase 1.8 — deep extracted article bodies loaded from wiki via wikiPath.
     *  Pre-built by the caller (App.tsx / ChatWorkbench) so buildGroundingContext
     *  just concatenates it. Claude Opus 4.7's 1M context makes this trivial
     *  to include up to ~800KB of real article text. Each block is separated
     *  by a source-labeled header for citation reconstruction. */
    wikiArticleBodies?: string;
    /** Phase 1.9 — synthesis outputs from prior engagements that semantically
     *  match the current research goal. Gives the LLM context about reusable
     *  prior insights so it doesn't re-synthesize the same findings. */
    priorEngagementInsights?: string;
    /** Phase 1-retrofit (2026-04-20) — wiki metadata index (titles, sources,
     *  dates, char counts, wikiPaths, 200-char summaries). This is the
     *  AI's menu of what's available in the wiki archive. Small (<100KB
     *  for most engagements); the AI uses it to decide which articles to
     *  request bodies for via the retrieval tool. Typically pre-built
     *  once per workbench session by the caller. */
    wikiIndexMenu?: string;
    /** Phase 1-retrofit — pre-fetched article bodies for THIS specific
     *  message, pulled by keyword-matching the user's question against the
     *  wiki index. Purely additive: absent means "no pre-fetch happened"
     *  (proxy down, short message, or caller opted out) and the rest of
     *  the grounding context still works exactly as before. */
    prefetchedArticlesBlock?: string;
    skillManifest?: SkillManifestEntry[];
    nxtDesignSystemRules?: string;
}

// --- Skill Manifest Types ---

export interface SkillManifestEntry {
    id: string;
    name: string;
    description: string;
    /** render-contract: always loaded (alongside any triggered content skill)
     *  when ANY trigger keyword matches. Used for layout/design contracts that
     *  must govern every slide emission regardless of which consulting lens
     *  produced the content. Today: nxt-visual-renderer. */
    category: 'research-deliverable' | 'prompt-engineering' | 'render-contract' | 'retrieval-enhancer';
    triggers: string[];
    /** Wiki pages (in hic-workspace/wiki/) to load alongside SKILL.md */
    wikiCompanions: string[];
    benchmarks: string[];
    /** References inside the skill's OWN folder (e.g. "references/web-layouts.md").
     *  Resolved relative to the skill path, fetched from the /skills/ static route. */
    skillReferences?: string[];
    outputTypes: string[];
    bestModel: ChatModel;
    thinkingEffort: 'max' | 'high' | 'medium';
    executionContext: 'primary' | 'subagent';
    path: string;
}

export interface SkillContext {
    skill: SkillManifestEntry;
    skillContent: string;       // Full SKILL.md content
    companionContent: string;   // Concatenated wiki companion pages + skill references
}

// --- Model Configuration ---

export interface ModelConfig {
    id: ChatModel;
    name: string;
    provider: 'anthropic' | 'openai' | 'google' | 'deepseek';
    description: string;
    contextWindow: string;
    strengths: string;
    color: string;
    available: boolean;
    maxCorpusChars: number;
}

// 2026-05-05 — Single-vendor primary on DeepSeek V4 Flash via Azure AI
// Foundry. 256K context handles the full corpus injection without
// truncation; OpenAI-compatible chat-completions schema; tool-use with
// our discriminated-union schema verified.
// 2026-05-06 — DeepSeek V4 Pro removed from the picker because the Azure
// resource (`intelligence-aug-stage-resource`) only has V4 Flash deployed.
// Selecting Pro previously caused chat calls to return Azure 404
// `DeploymentNotFound` while the `#presentation` composer (which hardcoded
// Flash via parsePresentationDirective default) silently kept working —
// confusing the user about which model was actually running. The Pro entry
// will be re-added when/if a Pro deployment is provisioned on Azure.
export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        provider: 'google',
        description: '1M context, follows multi-step rules reliably, produces descriptive professional prose. Primary HiC reasoning model 2026-05-07.',
        contextWindow: '1M tokens',
        strengths: 'Long-context reasoning, instruction-following, low jargon/hyperbole, professional tone',
        color: '#B8B800',
        available: true,
        // 1M tokens × ~4 chars/tok = ~4MB chars. We cap at 1.4MB so the
        // system prompt + uploads + wiki menu + history all fit with
        // headroom for tool-loop turns.
        maxCorpusChars: 1_400_000,
    },
    {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash (legacy)',
        provider: 'deepseek',
        description: '256K context. Retained as fallback only — produced jargon-heavy AI-slop narratives, demoted from primary 2026-05-07.',
        contextWindow: '256K tokens',
        strengths: 'Cost-effective, OpenAI-compatible tool-use',
        color: '#888888',
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

NOTE ON LAYOUT SPEC LOCATION (2026-04-21 REFACTOR):
The full per-template content budgets, JSON example shapes, titles-as-quotes ban,
meta-narration ban, corpus meta-commentary ban, theme-count rules, quote density
rules, and preferred quote-source priority order now live in the nxt-visual-renderer
RENDER CONTRACT skill. That skill is auto-loaded into the system prompt by the
matchSkills / loadSkillContext loader whenever ANY slide-intent keyword appears in
the user message ("slide", "deck", "#slide", theme-*/case-study/recommendation/
stat-row/block-quote etc.). Those rules and examples are authoritative over
anything that remains inline below.

SEE:
  - /skills/nxt-visual-renderer/SKILL.md            (overview + 18-template roster)
  - /skills/nxt-visual-renderer/references/web-layouts.md       (field budgets + JSON examples)
  - /skills/nxt-visual-renderer/references/anti-slop-rules.md   (titles-as-quotes ban, meta-narration, etc.)

A short index of the 18 templates (when to use each — the full density spec is in the
render contract above):

1.  persona-card        → user requests personas, archetypes, customer segments
2.  recommendation      → user requests strategic actions, what to do, next steps
3.  theme-cluster       → equal-weight horizontal columns (3-4 themes, parallel weight, default theme layout)
3a. theme-spotlight     → ONE dominant theme + 2-3 supporting (asymmetric 60/40 hero layout — use when one theme leads)
3b. theme-arc           → narrative chain of 3-4 themes with progression arrows (use when themes build sequentially: cause → effect → response)
3c. theme-mosaic        → 2x2 ivory grid of 4 parallel themes (uniform pale surface, hairline rules, chartreuse accent bar on the primary cell — restrained gallery rhythm for 4 co-equal themes)
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

Universal contract (every slide):
- "title": action title (complete sentence stating a conclusion with data)
- "sources": [...]   ← required, never empty, deduplicated
For per-template budgets + JSON shapes, read the render contract's
references/web-layouts.md. The content budgets below are DEPRECATED —
DO NOT rely on them; read the skill spec instead.

LEGACY CONTENT BUDGETS (kept temporarily for templates not yet migrated
to the skill — timeline / section-divider / service-blueprint / gap-matrix /
architecture-map / prd-feature / systems-inventory):

Universal slots:
- title:                  120 chars  (one complete sentence, action-titled)
- sources[i]:             40  chars per source name

(theme-cluster, theme-spotlight, theme-arc, theme-mosaic, stat-row, block-quote,
case-study, recommendation budgets moved to the render contract spec file.)

(Full densified field budgets for theme-spotlight, theme-arc, theme-mosaic,
stat-row, block-quote, recommendation, and case-study live in the render-contract
references/web-layouts.md — do not restate them here.)

Template-specific JSON shape examples (kept for templates not yet migrated to
the render-contract reference file):

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
  "sources": ["Northeastern CRM Assessment", "Gartner Higher-Ed CRM Report 2025", "Cornell Advancement Annual Report 2025"],
  "recommendation": {
    "actionTitle": "Migrate Annual Giving, Major Gifts, and Reunion to a single Salesforce org by Q4",
    "rationale": "Three separate orgs create reconciliation overhead consuming 40% of advancement-officer time per the CRM Assessment. Cornell's 18-month consolidation lifted major-gift conversion 34% — that is the pattern to follow.",
    "supportingActions": [
      {"name":"Data audit","description":"Inventory all custom objects across the three orgs and map duplicates. Dedicated team runs this for 8 weeks before migration planning begins."},
      {"name":"Pilot migration","description":"Migrate Reunion (smallest dataset) first to validate model and process. Two-week instrumentation sprint follows cutover."},
      {"name":"Training","description":"Run 5 sessions for the 80-person advancement team before cutover — job-role-specific, not generic product training."}
    ],
    "impactGrid": {
      "baseline": "40% officer time on reconciliation across 3 orgs",
      "target": "<12% reconciliation time, single unified org",
      "timeframe": "9 months, 3-phase cutover",
      "owner": "VP Advancement Services + 12-person program team"
    },
    "impactMetric": {"value":"$2.4M","label":"annual recovered productivity"},
    "evidence": [
      {"text":"I wouldn't know in our database right now that Andrew, you work with Rob — that's exactly the relationship that closes a major gift.","source":"NXT Stakeholder Interview","attribution":"Major Gifts Officer"},
      {"text":"Within six months we stopped asking 'do we know this donor?' — we already knew, and we knew the next best action.","source":"CASE 2024 panel","attribution":"VP Advancement Services, Cornell"}
    ],
    "implication":"This is the unlock for every downstream Advancement initiative — prospect scoring, predictive outreach, and stewardship automation are all blocked by the fragmented data layer."
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

(Corpus-meta-commentary ban, titles-as-quotes ban, preferred-quote-source
priority, quote-density rules, and theme-count minimums are in the render
contract's references/anti-slop-rules.md and references/web-layouts.md — do
not restate them here.)

:::slide template=theme-spotlight
{
  "title": "Trust erosion before contact dominates the dataset — 3 corroborating signals follow",
  "sources": ["r/NEU","Higher Ed Dive","CASE 2024","r/highereducation"],
  "themeCluster": {
    "themes": [
      {
        "name":"Co-op scarcity is breaking the experiential promise",
        "insight":"Reddit posts from current students cite the absence of internships as the top complaint, undermining the brand promise that justifies tuition. This signal recurs in 47 of 312 sampled posts (15%) and is the single most-cited grievance across r/NEU threads in the last 12 months.",
        "evidence":"Two years. No TA. No RA. No co-ops. No internships. The whole reason I picked Northeastern is gone and nobody will answer me on what's happening.",
        "source":"r/NEU",
        "implication":"Advancement cannot ask the cohort for donations in 10 years if the experiential promise breaks during enrollment."
      },
      {
        "name":"Tuition skepticism is eroding the future donor base",
        "insight":"The cohort Advancement must convert enters alumni status already disillusioned with ROI. Gen Z cohort data shows 54% of graduates skeptical of degree value vs 22% for Millennials at the same career stage.",
        "evidence":"Most Gen Z graduates now think college was a waste of money.",
        "source":"r/highereducation",
        "signal":"54% Gen Z ROI skepticism (vs 22% Millennial)"
      },
      {
        "name":"Political posture is now a giving variable",
        "insight":"Public university statements directly shape whether alumni open or close their wallets. CASE 2024 tracked a 12-point swing in giving intent tied to institutional political statements across 14 surveyed schools.",
        "evidence":"President Aoun joins more than 320 university leaders in a joint statement — I'm canceling my monthly pledge until I see what this means.",
        "source":"r/NEU",
        "signal":"12-pt giving-intent swing per political statement"
      }
    ],
    "patternSignal":"Three independent signals converge on one mechanism: trust leaks during enrollment, compounds through graduation, and Advancement never sees it because the data layer cannot assemble a unified donor view."
  }
}
:::

:::slide template=theme-arc
{
  "title": "Donor trust breaks in three sequential stages — enrollment, graduation, alumni",
  "sources": ["r/NEU","CASE 2024","Higher Ed Dive","Gartner Higher-Ed CRM 2025"],
  "themeCluster": {
    "themes": [
      {
        "name":"Experiential promise breaks at enrollment",
        "insight":"Students arrive expecting co-ops and internships; 15% of r/NEU threads cite their absence as the defining disappointment of year one.",
        "evidence":"Two years. No TA. No RA. No co-ops. No internships.",
        "source":"r/NEU",
        "signal":"47 of 312 r/NEU posts cite experiential gap"
      },
      {
        "name":"ROI skepticism crystallizes at graduation",
        "insight":"By the time students graduate, 54% already believe their degree was not worth the cost, locking in a skeptical posture before Advancement ever makes first contact.",
        "evidence":"Most Gen Z graduates now think college was a waste of money.",
        "source":"r/highereducation",
        "signal":"54% Gen Z ROI skepticism (vs 22% Millennial)"
      },
      {
        "name":"Alumni disengagement hardens within 5 years",
        "insight":"Disengaged alumni do not return. CASE 2024 shows participation declines 12% per migration event, and recovery takes 7-10 years when it happens at all.",
        "evidence":"Participation is now at 14%, down from 19% pre-migration.",
        "source":"CASE 2024",
        "signal":"-12% participation per platform migration"
      },
      {
        "name":"Advancement loses visibility before it can act",
        "insight":"Three separate Salesforce instances mean Advancement cannot see these signals until they surface as giving declines — by which point the trust has already left the building.",
        "evidence":"I wouldn't know in our database that Andrew works with Rob.",
        "source":"NXT Stakeholder Interview",
        "signal":"3 disconnected orgs, zero cross-college visibility"
      }
    ],
    "patternSignal":"Trust erosion is not one event — it is a four-stage cascade. Advancement today sees only stage four, and only as a lagging indicator."
  }
}
:::

:::slide template=theme-mosaic
{
  "title": "Four parallel advancement frictions — each isolated, together compounding",
  "sources": ["NXT Interview","CASE 2024","Gartner 2025","Cornell Annual Report 2025"],
  "themeCluster": {
    "themes": [
      {
        "name":"Data Fragmentation",
        "insight":"Three Salesforce orgs prevent a single donor view. Officers reconcile 40% of their week manually.",
        "evidence":"I spend 40% of my time reconciling data across three CRMs.",
        "source":"NXT Interview",
        "signal":"40% officer time on reconciliation"
      },
      {
        "name":"Prospect Blindness",
        "insight":"No ML propensity model means high-capacity donors go un-scored. Peer schools run this at L4 maturity; Northeastern sits at L1.",
        "evidence":"We have the data, we just cannot see it across the three systems we are running.",
        "source":"NXT Interview",
        "signal":"L1 maturity vs peer median L4"
      },
      {
        "name":"Mobile Giving Gap",
        "insight":"1.2% mobile conversion vs Columbia at 44%. The giving page was not rebuilt after the last platform migration.",
        "evidence":"Mobile conversion sits at 1.2% — Columbia runs 44% on a rebuilt responsive page.",
        "source":"Gartner 2025",
        "signal":"1.2% vs 44% peer mobile conversion"
      },
      {
        "name":"Stewardship Latency",
        "insight":"Behavior-triggered outreach does not exist. Cadences are manual and batched monthly — peers run trigger-based daily.",
        "evidence":"Within six months we stopped asking do we know this donor.",
        "source":"Cornell Annual Report 2025",
        "signal":"0 triggered touchpoints; peers run 12+/quarter"
      }
    ],
    "patternSignal":"All four frictions share one upstream cause: the data layer. Fix the unified donor view and every downstream Advancement capability becomes accessible."
  }
}
:::

(All densified field budgets — character limits and required fields — are
restated in references/web-layouts.md. The render contract auto-loads
when slide intent is detected and acts as the authoritative spec.)

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
  "sources": ["NXT Stakeholder Interview","CASE 2024","Gartner Higher-Ed CRM 2025"],
  "quote": {
    "text": "I wouldn't know in our database right now that Andrew, you work with Rob — and that's exactly the relationship that closes a major gift. We have the data, we just can't see it across the three systems we're running.",
    "attribution": "Anonymous Major Gifts Officer",
    "role": "20-year veteran, Northeastern Advancement",
    "source": "NXT Stakeholder Interview, March 2026",
    "context": "ON DATA FRAGMENTATION",
    "contextParagraph":"This quote comes from a stakeholder interview conducted during the March 2026 CRM assessment. The officer is describing how three siloed Salesforce instances — one per college — prevent even basic relationship mapping across donor households. This is the single most-cited friction point across 14 stakeholder interviews.",
    "corroboratingData": [
      {"value":"40%","label":"of officer time spent on manual data reconciliation","source":"NXT Interview"},
      {"value":"-12%","label":"alumni participation since the last platform migration","source":"CASE 2024"},
      {"value":"L1","label":"Northeastern maturity tier vs. peer median of L4","source":"Gartner 2025"}
    ],
    "implication":"Consolidating to a unified donor view is a prerequisite to every other advancement initiative — prospect scoring, predictive outreach, and stewardship automation all assume a single system of record."
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
      "attribution":"VP Advancement Services, Cornell",
      "role":"17-year Advancement veteran, CASE 2024 panelist"
    },
    "lesson": "Consolidation pays back fastest when the smallest college migrates first — it validates the data model at low risk and creates internal champions who sell the remaining cutovers.",
    "comparables": [
      {"name":"BU Advancement (2022)","outcome":"Consolidated 3 orgs → 1 in 14 months; 28% major-gift conversion lift","source":"CASE 2024"},
      {"name":"NYU (2023)","outcome":"Unified 6 colleges into single Salesforce org; +$18M annual giving year-over-year","source":"NYU Annual Report 2024"},
      {"name":"Michigan (2024)","outcome":"2.4× officer productivity post-consolidation, 12-month program","source":"Gartner Higher-Ed CRM 2025"}
    ],
    "implication":"The pattern holds across every peer case: consolidation is not a CRM project — it is the prerequisite for every AI-driven advancement initiative in the next 24 months."
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
      {
        "value":"40%",
        "label":"of officer time spent reconciling data across CRMs",
        "meaning":"Front-line fundraisers burn nearly half their week on manual record merging instead of donor conversations.",
        "matters":"Every reclaimed hour compounds: peer schools freed 600+ hrs/officer/year and moved major-gift close-rates 30%+.",
        "source":"NXT Stakeholder Interview"
      },
      {
        "value":"3",
        "label":"separate Salesforce instances in production",
        "meaning":"Three disconnected orgs means prospect work at one college is invisible to every other college.",
        "matters":"Cornell consolidated 4 → 1 and unlocked 34% conversion lift in 18 months — the window is closing as peers move.",
        "source":"Northeastern CRM Assessment"
      },
      {
        "value":"-12%",
        "label":"alumni participation decline since platform migration",
        "meaning":"Participation is the leading indicator of major-gift pipeline 7-10 years out, and it is moving the wrong direction.",
        "matters":"Without action the cohort Advancement must convert in the next decade will enter alumni status already disengaged.",
        "source":"CASE 2024"
      }
    ],
    "convergentInsight":"Three independent signals — officer time, system fragmentation, and participation decline — all point to the same root cause: Advancement is operating a platform, not a unified donor system. Fix the platform and the other two metrics move together.",
    "patternSignal":"Peer institutions (Cornell, BU, NYU) that closed this gap in 12-18 months posted 30%+ major-gift conversion lifts within the first post-cutover year."
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

// --- Corpus source-mix breakdown ---
//
// Surfaces a per-source-type breakdown of the corpus so the chat system
// prompt can show the model exactly what it has access to (not just upload
// PDFs). Counts come from heuristic source-name pattern matching against
// common scope markers in the raw corpus and source references.

interface CorpusBreakdown {
    summary: string;
    uploadKB: number;
    externalKB: number;
    transcriptKB: number;
    redditKB: number;
    academicKB: number;
    rssKB: number;
}

function computeCorpusSourceBreakdown(ctx: ChatContext): CorpusBreakdown {
    const corpus = ctx.corpusText || '';
    const uploads = ctx.uploadedFileContents || '';
    const refs = ctx.sourceReferences || [];

    // Total sizes (raw byte heuristic — chars / 1024)
    const uploadKB = Math.round((uploads.length || 0) / 1024);
    const corpusKB = Math.round((corpus.length || 0) / 1024);

    // Bucket source references by name pattern
    const buckets = { rss: 0, jina: 0, youtube: 0, reddit: 0, academic: 0, openalex: 0, other: 0, upload: 0 };
    const bucketSources = { rss: new Set<string>(), jina: new Set<string>(), youtube: new Set<string>(), reddit: new Set<string>(), academic: new Set<string>(), openalex: new Set<string>(), other: new Set<string>(), upload: new Set<string>() };

    for (const ref of refs) {
        const name = (ref.sourceName || '').toLowerCase();
        const isUpload = name.includes('upload') || name.includes('client') || name.includes('uploaded');
        const isYoutube = name.includes('youtube') || name.includes('alumni-association');
        const isReddit = name.includes('reddit') || name.includes('r/');
        const isAcademic = name.includes('openalex') || name.includes('crossref') || name.includes('semantic scholar') || name.includes('doaj') || name.includes('arxiv') || name.includes('europe pmc') || name.includes('eric');
        const isJina = name.includes('jina') || name.includes('web extract') || name.includes('news.northeastern') || name.includes('president.northeastern') || name.includes('finance.northeastern');
        const isRss = name.includes('rss') || name.includes('higher ed dive') || name.includes('inside higher ed') || name.includes('chronicle') || name.includes('edsurge') || name.includes('diverse') || name.includes('education week') || name.includes('philanthropy') || name.includes('news') || name.includes('case');

        let bucket: keyof typeof buckets = 'other';
        if (isUpload) bucket = 'upload';
        else if (isYoutube) bucket = 'youtube';
        else if (isReddit) bucket = 'reddit';
        else if (isAcademic) bucket = 'academic';
        else if (isJina) bucket = 'jina';
        else if (isRss) bucket = 'rss';

        buckets[bucket] += 1;
        bucketSources[bucket].add(ref.sourceName);
    }

    // External = anything that isn't an upload
    const externalRefCount = (Object.keys(buckets) as Array<keyof typeof buckets>)
        .filter(k => k !== 'upload')
        .reduce((s, k) => s + buckets[k], 0);

    const totalKB = uploadKB + corpusKB || 1;

    const summary = [
        `Total corpus: ${totalKB}KB across ${refs.length} cataloged sources`,
        `  Uploaded client docs: ${uploadKB}KB (${Math.round(uploadKB / totalKB * 100)}%) — ${buckets.upload} sources`,
        `  External corpus: ${corpusKB}KB (${Math.round(corpusKB / totalKB * 100)}%) — ${externalRefCount} sources, broken down:`,
        `    • RSS / news (Higher Ed Dive, IHE, Chronicle, EdSurge, etc.): ${buckets.rss} sources`,
        `    • Jina-reader web scrapes (institutional sites, peer URLs): ${buckets.jina} sources`,
        `    • YouTube alumni-engagement transcripts: ${buckets.youtube} sources`,
        `    • Reddit topical threads: ${buckets.reddit} sources`,
        `    • Academic papers (OpenAlex, Crossref, Semantic Scholar, DOAJ): ${buckets.academic} sources`,
        `    • Other / uncategorized: ${buckets.other} sources`,
    ].join('\n');

    return {
        summary,
        uploadKB,
        externalKB: corpusKB,
        transcriptKB: buckets.youtube,
        redditKB: buckets.reddit,
        academicKB: buckets.academic,
        rssKB: buckets.rss,
    };
}

/**
 * Format the active-category roster for the system prompt. Each category line
 * shows the source name + item count + a status flag (HAS CONTENT / EMPTY).
 * The model is instructed to cite from each non-empty category, and to mark
 * the empty ones explicitly as CATEGORY GAP in its response.
 */
function buildCategoryRoster(ctx: ChatContext): string {
    const cats = ctx.activeCategories || [];
    if (cats.length === 0) {
        return '(no active-category roster — synthesis must still cite from every source kind that appears in the corpus)';
    }
    // Add uploads as an active category if uploadedFiles are present
    const uploads = (ctx.uploadedFiles || []).map(f => f.name);
    const lines: string[] = [];
    if (uploads.length > 0) {
        lines.push(`  • Uploaded client documents (${uploads.length} files): ${uploads.slice(0, 6).join(', ')}${uploads.length > 6 ? `, +${uploads.length - 6} more` : ''} — STATUS: HAS CONTENT (must cite)`);
    }
    for (const c of cats) {
        const status = c.itemCount > 0 ? `HAS CONTENT (${c.itemCount} items — must cite)` : 'EMPTY (must mark CATEGORY GAP in response)';
        lines.push(`  • ${c.name}: STATUS: ${status}`);
    }
    return lines.join('\n');
}

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

    // Phase 1.8 — deep article bodies (wiki archive, lazy-loaded). These
    // come pre-concatenated from the caller which pulled them by wikiPath
    // from evidence nodes. Insert them BEFORE the raw corpus so the LLM
    // sees the full-text extractions first when it reasons.
    if (ctx.wikiArticleBodies && ctx.wikiArticleBodies.length > 200) {
        parts.push(`=== DEEP ARTICLE BODIES (from wiki archive — verbatim extracted text) ===`);
        parts.push(ctx.wikiArticleBodies);
        parts.push(`=== END DEEP ARTICLES ===`);
    }

    // Phase 1-retrofit (2026-04-20) — WIKI INDEX MENU. Lightweight catalog
    // of every archived article/transcript/upload. The AI uses this to
    // decide which bodies to request via the retrieval tool. Injected
    // AFTER deep bodies so the model sees "here's what you already have
    // full text for, and here's the menu of everything else".
    if (ctx.wikiIndexMenu && ctx.wikiIndexMenu.length > 50) {
        parts.push(`=== WIKI ARCHIVE MENU (metadata only — request full bodies via retrieval tool if needed) ===`);
        parts.push(ctx.wikiIndexMenu);
        parts.push(`=== END WIKI MENU ===`);
    }

    // Phase 1-retrofit — PRE-FETCHED ARTICLE BODIES for this specific
    // user message. The caller keyword-matched the question against the
    // wiki index and pulled top-N bodies. Insert them near the top so the
    // AI treats them as primary evidence when it writes the response.
    // This is the fast-path RAG: no tool call needed, real text is
    // already in the prompt.
    if (ctx.prefetchedArticlesBlock && ctx.prefetchedArticlesBlock.length > 200) {
        parts.push(`=== TOPIC-MATCHED ARTICLE BODIES (pre-fetched from wiki for THIS question) ===`);
        parts.push(ctx.prefetchedArticlesBlock);
        parts.push(`=== END TOPIC-MATCHED ARTICLES ===`);
    }

    // Phase 1.9 — prior-engagement memory. Synthesis artifacts from previous
    // research runs that semantically match the current goal. Gives the LLM
    // "memory" across engagements so it builds on prior findings rather than
    // re-synthesizing. Explicit directive to cite provenance so the user
    // knows when an insight is reused vs newly synthesized.
    if (ctx.priorEngagementInsights && ctx.priorEngagementInsights.length > 200) {
        parts.push(`=== PRIOR ENGAGEMENT INSIGHTS (synthesis from previous related research runs) ===`);
        parts.push(`When reusing any finding below, cite it as [prior engagement: <slug>] so the operator sees reuse vs fresh synthesis.`);
        parts.push(ctx.priorEngagementInsights);
        parts.push(`=== END PRIOR INSIGHTS ===`);
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

/**
 * Phase 1.8 helper — lazy-load full article bodies from the wiki archive
 * for every evidence node in the graph that carries a wikiPath. Stitches
 * them into a single labeled block the chat grounding context can consume.
 *
 * - Bounded: up to `maxArticles` articles, up to `perArticleChars` chars each
 * - Prioritized: prefers transcripts + PDFs + full_text over snippets
 * - Safe: network failures per-article are swallowed; best-effort concat
 */
export async function loadWikiArticleBodies(
    graph: { nodes: any[] } | undefined,
    opts: { maxArticles?: number; perArticleChars?: number; proxyBase?: string } = {}
): Promise<string> {
    if (!graph || !Array.isArray(graph.nodes)) return '';
    const maxArticles = opts.maxArticles ?? 40;
    const perArticleChars = opts.perArticleChars ?? 8000;
    const proxyBase = opts.proxyBase ?? 'http://localhost:5012';
    // Pick evidence nodes that have a wikiPath
    const withPath = graph.nodes.filter((n: any) => n.type === 'evidence' && n.wikiPath);
    if (withPath.length === 0) return '';
    // Priority order: transcript > pdf_extracted > full_text > others
    const depthRank: Record<string, number> = { transcript: 1, pdf_extracted: 2, full_text: 3 };
    withPath.sort((a: any, b: any) => {
        const ra = depthRank[a.extractionDepth] ?? 9;
        const rb = depthRank[b.extractionDepth] ?? 9;
        if (ra !== rb) return ra - rb;
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
    const picked = withPath.slice(0, maxArticles);
    const blocks: string[] = [];
    await Promise.all(picked.map(async (n: any) => {
        try {
            const resp = await fetch(`${proxyBase}/api/wiki/read-article/${encodeURIComponent(n.wikiPath)}`);
            if (!resp.ok) return;
            const data = await resp.json();
            const body = (data.content || '').replace(/^---\n[\s\S]*?\n---\n\n?/, '').trim();
            if (body.length < 100) return;
            const trimmed = body.length > perArticleChars ? body.substring(0, perArticleChars) + '\n[...truncated...]' : body;
            const sourceLabel = n.metadata?.sourceName || n.label || 'Source';
            const depth = n.extractionDepth || 'article';
            blocks.push(`--- ${sourceLabel} (${depth.toUpperCase()}, wiki/${n.wikiPath}) ---\n${trimmed}`);
        } catch { /* swallow */ }
    }));
    return blocks.join('\n\n');
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
        // Include content skills (research-deliverable), render contracts,
        // AND retrieval enhancers. Render contracts govern layout; retrieval
        // enhancers (wiki-query-expander, wiki-reranker, wiki-synthesizer)
        // teach Claude how to exploit the semantic embedding layer — query
        // variant expansion, cross-encoder reranking, multi-angle synthesis.
        if (
            skill.category !== 'research-deliverable'
            && skill.category !== 'render-contract'
            && skill.category !== 'retrieval-enhancer'
        ) continue;
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
 * Fetch a skill's SKILL.md content, its in-folder references, and its wiki
 * companions + benchmarks. Uses the Vite dev server /skills/ route and wiki
 * fetch path.
 *
 * Caching: results memoize in _skillContextCache keyed by skill.id — so the
 * first slide request pays the fetch latency (~10-30ms), every subsequent
 * request in the same session is a map lookup.
 */
const _skillContextCache = new Map<string, SkillContext>();

export async function loadSkillContext(skill: SkillManifestEntry): Promise<SkillContext> {
    const cached = _skillContextCache.get(skill.id);
    if (cached) return cached;

    const fetches: Promise<string>[] = [];

    // Fetch the SKILL.md
    fetches.push(
        fetch(skill.path).then(r => r.ok ? r.text() : '').catch(() => '')
    );

    // Fetch skill-folder references (e.g. "references/web-layouts.md").
    // Resolved relative to the skill path — skill.path is "/skills/<id>/SKILL.md"
    // and references live under "/skills/<id>/<ref>".
    const skillFolder = skill.path.replace(/\/SKILL\.md$/i, '');
    for (const ref of (skill.skillReferences || [])) {
        fetches.push(
            fetch(`${skillFolder}/${ref}`).then(r => r.ok ? r.text() : '').catch(() => '')
        );
    }

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

    const ctx = { skill, skillContent, companionContent };
    _skillContextCache.set(skill.id, ctx);
    return ctx;
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

    // Skill matching: find relevant skills from manifest.
    // Load at MOST one content skill (research-deliverable) and ALWAYS load
    // every matching render-contract AND retrieval-enhancer skill alongside
    // it. Render contracts govern slide layout; retrieval enhancers teach
    // Claude how to exploit the semantic embedding layer (query variant
    // expansion, cross-encoder reranking, multi-angle synthesis).
    let skillContext: SkillContext | null = null;
    let renderContracts: SkillContext[] = [];
    let retrievalEnhancers: SkillContext[] = [];
    let skillUsed: string | undefined;
    if (context.skillManifest?.length) {
        const matched = matchSkills(userMessage, context.skillManifest);
        const topContentSkill = matched.find(s => s.category === 'research-deliverable') || null;
        const matchedContracts = matched.filter(s => s.category === 'render-contract');
        const matchedEnhancers = matched.filter(s => s.category === 'retrieval-enhancer');

        if (topContentSkill) {
            skillContext = await loadSkillContext(topContentSkill);
            skillUsed = topContentSkill.id;
        }
        if (matchedContracts.length > 0) {
            renderContracts = await Promise.all(matchedContracts.map(loadSkillContext));
            console.log(`[chat] render contracts active: ${renderContracts.map(c => c.skill.id).join(', ')}`);
        }
        if (matchedEnhancers.length > 0) {
            retrievalEnhancers = await Promise.all(matchedEnhancers.map(loadSkillContext));
            console.log(`[chat] retrieval enhancers active: ${retrievalEnhancers.map(c => c.skill.id).join(', ')}`);
        }
    }

    // Phase 1-retrofit (2026-04-20) — WIKI PRE-FETCH. If the caller hasn't
    // already populated prefetchedArticlesBlock, best-effort pull the top
    // keyword-matching article bodies from the wiki archive. Non-blocking
    // by design: proxy outage or slow wiki returns an empty block and the
    // rest of the grounding context still carries the chat. Gated on the
    // user message having enough substance (≥12 chars) and no prior block
    // already present — keeps double-loading at zero.
    if (!context.prefetchedArticlesBlock && userMessage && userMessage.trim().length >= 12) {
        try {
            const { prefetchArticlesForMessage, formatArticlesAsCorpusBlock } = await import('./wikiIndexService');
            // Phase 2.5 (2026-04-28): pass the original engagement goal so the
            // proxy blends its embedding with the chat question. Strengthens
            // recall of archive content the user collected for this engagement
            // but a narrow chat question wouldn't otherwise surface.
            const engagementGoal = (context as any)?.researchGoal
                || (context as any)?.goal
                || (context as any)?.brief
                || undefined;
            const prefetchedArticles = await Promise.race([
                prefetchArticlesForMessage(userMessage, {
                    limit: 6, maxCharsPerArticle: 12_000, minChars: 500,
                    engagementGoal,
                    goalBlendWeight: 0.30,
                }),
                new Promise<any[]>(resolve => setTimeout(() => resolve([]), 6000)),
            ]);
            if (prefetchedArticles && prefetchedArticles.length > 0) {
                const block = formatArticlesAsCorpusBlock(prefetchedArticles, 80_000);
                if (block.length > 200) {
                    context = { ...context, prefetchedArticlesBlock: block };
                    console.log(`[chat] wiki pre-fetch: injected ${prefetchedArticles.length} article bodies (${Math.round(block.length / 1024)}KB)`);
                }
            }
        } catch (err: any) {
            console.warn('[chat] wiki pre-fetch skipped:', err?.message || err);
        }
    }

    const groundingContext = buildGroundingContext(context, model);

    // Build provenance index for citation rendering
    const provenanceIndex = (context.sourceReferences || []).map(s =>
        `[${s.id}] ${s.sourceName}: "${s.title}"${s.url ? ` URL: ${s.url}` : ''}${s.date ? ` (${s.date})` : ''}`
    ).join('\n');

    // Build skill-aware system prompt.
    // Render contracts come FIRST so the AI internalizes the layout rules
    // before it sees the content skill's methodology. One render contract
    // block per matched render-contract skill; no cap (there's only one
    // today: nxt-visual-renderer).
    let skillInstructions = '';
    for (const rc of renderContracts) {
        skillInstructions += `
=== RENDER CONTRACT: ${rc.skill.name} ===
${rc.skillContent}
${rc.companionContent ? `\n=== RENDER CONTRACT REFERENCES ===\n${rc.companionContent}\n=== END REFERENCES ===\n` : ''}
=== END RENDER CONTRACT ===
`;
    }
    if (skillContext) {
        skillInstructions += `
=== ACTIVE SKILL: ${skillContext.skill.name} ===
${skillContext.skillContent}
=== END SKILL ===

=== SKILL WIKI CONTEXT ===
${skillContext.companionContent}
=== END SKILL WIKI ===
`;
    }
    // Retrieval enhancers come AFTER content/render skills so they frame
    // HOW the AI should call fetch_wiki_articles on top of whatever
    // content skill is active. Multiple can stack (expand -> rerank ->
    // synthesize) when the user's question triggers all three.
    for (const re of retrievalEnhancers) {
        skillInstructions += `
=== RETRIEVAL ENHANCER: ${re.skill.name} ===
${re.skillContent}
=== END RETRIEVAL ENHANCER ===
`;
    }

    // Skill manifest summary (always present so the AI knows what's available)
    const manifestSummary = context.skillManifest?.length
        ? `\nAVAILABLE CONSULTING SKILLS (activate by requesting the output type):\n${context.skillManifest.filter(s => s.category === 'research-deliverable').map(s => `- ${s.name}: ${s.description}`).join('\n')}\n`
        : '';

    // Compute per-source-type breakdown of the corpus so the model SEES what
    // it actually has access to. Counts by source-name patterns; not perfect
    // (some sources have ambiguous names) but accurate enough to enforce the
    // external-citation floor and surface diagnostics back to the user.
    const corpusBreakdown = computeCorpusSourceBreakdown(context);
    const categoryRoster = buildCategoryRoster(context);

    const systemPrompt = `You are a McKinsey-trained research intelligence analyst operating in the NXT Humans Chat-Driven Research Workbench.
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.
The research goal is: "${context.researchGoal}"

================================================================================
=== IRON LAW: USER-SELECTED SOURCES MUST BE USED ===
================================================================================

The user is an EXPERT RESEARCHER. Every source category in the list below was
toggled ON deliberately. The user has reasons — including pulling cross-industry
analogies, out-of-domain examples, and lateral evidence INTO the analysis. Your
job is to honor that selection, NOT second-guess it.

ABSOLUTE RULES:
1. Every source category the user toggled ON appears in the ACTIVE CATEGORIES
   roster below. You MUST surface at least one citation from EACH category in
   your response.
2. If a category yielded no usable content during retrieval, you MUST mark it
   explicitly as: \`CATEGORY GAP: <category name> — no relevant content
   collected for this query\` so the user can decide whether to retry or de-select.
3. NEVER silently omit a toggled category. NEVER reason "this category seems
   off-topic" — the user is an expert; if they toggled it, it's relevant.
4. Out-of-domain evidence is a FEATURE, not a bug. Cross-industry analogies
   (retail loyalty patterns for alumni engagement, supply-chain orchestration
   patterns for donor pipelines, AI-lab innovation cycles for advancement
   technology) are EXACTLY the kind of lateral insight an expert researcher
   curates. Embrace them.
5. When citing out-of-industry evidence, frame as PATTERN to borrow:
   GOOD: "Borrow Sephora's tiered-loyalty pattern for alumni status."
   GOOD: "The retail abandoned-cart recovery playbook applies directly to
          incomplete donation flows."
   BAD: "Sephora has a tiered alumni program" (implies an existing thing)

=== ACTIVE CATEGORIES (every one must be cited or marked CATEGORY GAP) ===
${categoryRoster}
================================================================================

=== CORPUS SOURCE COMPOSITION ===
The corpus below contains content from MULTIPLE source types. Every type is
first-class evidence. You MUST cite from a balanced mix — not just uploads.

${corpusBreakdown.summary}

SOURCE-MIX DISCIPLINE (MANDATORY):
- Uploads (client-provided PDFs, interviews, internal docs) provide CONTEXT — the client's POV, their data, their stakeholder voices
- External sources (RSS articles, jina-reader web scrapes, YouTube transcripts, Reddit threads, OpenAlex/Crossref/Semantic Scholar papers, DOAJ open-access research) provide EVIDENCE — third-party validation, peer-institution comparisons, sector benchmarks
- ≥40% of citations in any analysis MUST come from non-upload external sources
- If your draft response leans >60% on uploads, you are FAILING the source-mix discipline — REVISE before delivering
- Citations from "Higher Ed Dive", "Inside Higher Ed", "Chronicle of Higher Education", "EdSurge", "Diverse Issues in Higher Ed", YouTube alumni-engagement transcripts, OpenAlex papers, and topical Reddit threads are FIRST-CLASS evidence — not optional padding
- For every theme/recommendation/persona, surface BOTH internal (upload) and external evidence — the convergence is the strategic insight

CITATION FORMAT (MANDATORY):
[SOURCE_NAME: "Article Title"]
Examples: [Higher Ed Dive: "Universities Struggle with Skills Gap"], [Reddit r/philanthropy: "nonprofit laid off staff due to funding cuts"], [YouTube: "Columbia Alumni Q&A — Donor Engagement Panel 2025"], [OpenAlex: Smith et al. 2024]

ANTI-HALLUCINATION RULES (STRICTLY ENFORCED):
- Answer ONLY from evidence that EXISTS in the corpus below. Do not invent, fabricate, or extrapolate.
- NEVER fabricate URLs. You may ONLY include a URL if it appears verbatim in the SOURCE PROVENANCE INDEX or the RAW RESEARCH CORPUS above. If no URL exists for a source, cite it by name only WITHOUT a URL.
- NEVER invent case studies, institutions, dollar amounts, percentages, or quotes that are not explicitly present in the corpus. If the corpus contains 3 case studies, you have 3 case studies — not 10.
- NEVER generate plausible-looking article URLs by pattern (e.g., highereddive.com/news/fake-slug/123456). A fabricated URL is worse than no URL.
- EVERY factual claim MUST include a [SOURCE_NAME: "Article Title"] citation matching an actual source in the provenance index.
- When quoting, use EXACT words from the corpus. Do not paraphrase and present it as a quote.
- If the corpus does not contain enough evidence to answer the question, say explicitly: "The collected data contains limited evidence on this topic. Here is what was found:" and cite ONLY what actually exists.
- When asked for "top N" or "N case studies", only provide as many as actually exist in the corpus. If only 4 exist, provide 4 — never pad to reach the requested number.

ON-DEMAND WIKI RETRIEVAL (function-calling — used by Gemini Pro on this branch):
You have the fetch_wiki_articles tool. The in-prompt corpus is always capped by the context window, but the WIKI ARCHIVE (hundreds of articles, transcripts, and documents) is queryable end-to-end via this tool. Call it BEFORE giving up on a claim, BEFORE using an article title as a quote, and BEFORE saying "the corpus is limited":

  - Asked for 3 verbatim quotes per theme? Call fetch_wiki_articles(query: <theme terms>, limit: 6) to pull 6 real bodies, then select the 3 best quotes.
  - Need a specific peer institution's outcome? Call fetch_wiki_articles(query: "<peer name> <topic>", source: "<outlet>") to retrieve the article body.
  - Building a case study slide? Call fetch_wiki_articles(query: "<subject> <vendor> <outcome>", kind: "article") to get the case study body, then write from it.
  - Never call more than 2-3 times per turn. Be specific in your queries.

DIVERSE-KIND RETRIEVAL (CRITICAL for source-mix discipline):
When retrieving evidence for a major claim, pull from MULTIPLE wiki kinds — not just uploads. The wiki has three kinds: \`article\` (RSS scrapes, jina-reader web extracts, OpenAlex papers, Reddit threads), \`transcript\` (YouTube alumni transcripts, interview transcripts), \`upload\` (client PDFs).
  - For evidence/data sections: call fetch_wiki_articles(query, kind: "article") to retrieve external research first.
  - For human voice / lived-experience sections: call fetch_wiki_articles(query, kind: "transcript") to retrieve YouTube + interview content.
  - For client-context sections only: call fetch_wiki_articles(query, kind: "upload") to retrieve client PDFs.
  - DEFAULT: omit \`kind\` so all three are returned, then select balanced evidence across all of them.
If your draft answer cites only uploads, that is a violation of source-mix discipline — make additional retrievals with kind="article" and kind="transcript" before responding.

When tool results return empty or error, the archive genuinely doesn't have evidence for that claim — narrow your answer to what IS evidenced, or tell the user plainly which dimension lacks coverage in conversational prose. Do NOT fabricate. NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", or any QA-style annotation in any chat response, deliverable artifact, slide, persona, or other user-facing output. The reader is the user — not a QA dashboard.
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
        let modelConfig = AVAILABLE_MODELS.find(m => m.id === model);
        // 2026-05-07 — Defensive: if the requested model isn't registered
        // (stale localStorage from legacy DeepSeek-only era, removed entry,
        // etc.), fall back to Gemini 3.1 Pro and warn.
        let activeModelId: string = model;
        if (!modelConfig) {
            const fallback = AVAILABLE_MODELS.find(m => m.id === 'gemini-3.1-pro-preview') || AVAILABLE_MODELS[0];
            if (!fallback) throw new Error('No chat models registered — AVAILABLE_MODELS is empty');
            console.warn(`[chat] Requested model ${JSON.stringify(model)} is not in AVAILABLE_MODELS; falling back to ${fallback.id}`);
            modelConfig = fallback;
            activeModelId = fallback.id;
        }

        // 2026-05-07 — Multi-provider dispatch. Gemini 3.1 Pro is primary;
        // DeepSeek retained only as a legacy fallback.
        if (modelConfig.provider === 'google') {
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else if (modelConfig.provider === 'deepseek') {
            responseText = await callDeepSeek(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else if (modelConfig.provider === 'openai') {
            responseText = await callOpenAI(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else {
            // (provider 'anthropic' — not currently registered, retained for future)
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory, activeModelId);
        }

        // Defense-in-depth: strip any leaked QA-annotation tokens
        // ("EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]") from
        // the chat reply before it's rendered. Prompts forbid these tokens;
        // this layer guarantees they never reach the user.
        try {
            const { stripQAAnnotations } = await import('./slidePostProcessor');
            responseText = stripQAAnnotations(responseText);
        } catch (e) { /* non-blocking */ }

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

// --- NATIVE TOOL-USE LOOP (2026-04-20) ---------------------------------
// Claude gets a single tool, `fetch_wiki_articles`, which lets it pull
// full article bodies from the wiki archive mid-reasoning. The loop
// iterates up to MAX_TOOL_ITER times; each time Claude emits a `tool_use`
// block, we execute the call against the existing /api/wiki/fetch-articles
// endpoint and echo the result back as a `tool_result` block. When Claude
// finishes thinking (stop_reason !== 'tool_use'), we extract the final
// text and return.
//
// Safety guarantees:
//   - Tools are OPT-IN per call via callAnthropic(..., { enableTools })
//     and we default to TRUE only for models in the Claude family.
//   - If the wiki archive is empty (index returns nothing), we omit the
//     tool entirely so Claude can't call it, preserving existing behavior.
//   - MAX_TOOL_ITER = 5 caps runaway loops.
//   - Every tool call has an 18-second timeout; a failing call returns a
//     tool_result with is_error=true so Claude sees the failure and keeps
//     reasoning instead of the whole chat crashing.
//   - The loop is completely transparent to callers: callAnthropic still
//     returns a final string; the sole difference is the string may have
//     drawn on real body text pulled during the loop.

const MAX_TOOL_ITER = 5;
const TOOL_CALL_TIMEOUT_MS = 18_000;

const FETCH_WIKI_ARTICLES_TOOL = {
    name: 'fetch_wiki_articles',
    description: `Retrieve FULL article bodies from the wiki archive on demand. Use this to pull verbatim text for quotes, specific data points, named entities, or any claim that needs body evidence.

The archive contains every article, transcript, and uploaded document collected during this research session. When the in-prompt corpus shows only headlines or snippets for a topic, CALL THIS TOOL to get the real body text.

Good times to call:
  - The user asked for N verbatim quotes and you only see article titles in the in-prompt corpus
  - You're about to omit a claim because the prompt didn't include body text — try a retrieval first
  - You need to cite a specific named competitor, case study, or peer institution
  - You need timestamped or dated text (transcripts, news articles)

Returns: array of articles with title, source, url, date, and body text (up to maxCharsPerArticle chars each). Never returns titles-only.`,
    input_schema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Keyword search over article titles + summaries + sources. Use 3-8 concrete terms — names, entities, topics. Example: "Wyoming EverTrue donor experience revenue"' },
            ids: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL: specific article IDs (10-char url_hash values from the WIKI ARCHIVE MENU). Use this when you already know which articles you want.' },
            wikiPaths: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL: direct wiki paths (e.g. "articles/higher-ed-dive/ab12cd34ef.md"). Rarely needed; prefer ids or query.' },
            source: { type: 'string', description: 'OPTIONAL: substring filter on source name. Example: "Higher Ed Dive", "Reddit r/MBA", "EverTrue"' },
            kind: { type: 'string', enum: ['article', 'transcript', 'upload'], description: 'OPTIONAL: restrict to articles, YouTube transcripts, or uploaded client documents.' },
            minChars: { type: 'number', description: 'OPTIONAL: skip entries shorter than this many body chars. Default 500 (filters out archive stubs).' },
            limit: { type: 'number', description: 'Max articles to return. Default 5, hard max 15. Keep small — body text is verbose.' },
            maxCharsPerArticle: { type: 'number', description: 'Max body chars per article. Default 8000, hard max 20000.' },
        },
    },
};

/** Execute the fetch_wiki_articles tool by calling the existing client
 *  wrapper. Returns a compact text block for the tool_result `content`
 *  field so Claude sees it as standard text in the conversation.
 *  Timeouts and fetch errors surface as `(error: ...)` inside the
 *  returned string; the caller decides whether to mark is_error. */
async function executeFetchWikiArticlesTool(input: any): Promise<string> {
    try {
        const { fetchWikiArticles } = await import('./wikiIndexService');
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), TOOL_CALL_TIMEOUT_MS);
        let articles: any[] = [];
        try {
            articles = await fetchWikiArticles({
                ids: Array.isArray(input?.ids) ? input.ids.slice(0, 15) : undefined,
                wikiPaths: Array.isArray(input?.wikiPaths) ? input.wikiPaths.slice(0, 15) : undefined,
                query: typeof input?.query === 'string' ? input.query : undefined,
                source: typeof input?.source === 'string' ? input.source : undefined,
                kind: typeof input?.kind === 'string' ? input.kind : undefined,
                minChars: typeof input?.minChars === 'number' ? input.minChars : 500,
                limit: Math.max(1, Math.min(15, Number(input?.limit) || 5)),
                maxCharsPerArticle: Math.max(500, Math.min(20_000, Number(input?.maxCharsPerArticle) || 8000)),
            });
        } finally { clearTimeout(timer); }
        if (!articles || articles.length === 0) {
            return 'No articles matched. Try a different query, broader terms, or omit the source filter.';
        }
        const totalChars = articles.reduce((s, a) => s + (a.content?.length || 0), 0);
        const header = `Found ${articles.length} article${articles.length === 1 ? '' : 's'} (total ${Math.round(totalChars / 1024)}KB body text):\n\n`;
        const blocks = articles.map((a, i) => {
            const meta = [
                `id=${a.id || '?'}`,
                a.source ? `source=${a.source}` : '',
                a.date ? `date=${a.date}` : '',
                a.kind && a.kind !== 'article' ? `kind=${a.kind}` : '',
                `${a.chars || a.content?.length || 0} chars`,
            ].filter(Boolean).join(' | ');
            return `[${i + 1}] ${meta}\nTitle: ${a.title || '(untitled)'}\n${a.url ? `URL: ${a.url}\n` : ''}WikiPath: ${a.wikiPath}\nBody:\n${a.content || '(empty body)'}`;
        });
        return header + blocks.join('\n\n---\n\n');
    } catch (err: any) {
        const msg = err?.name === 'AbortError' ? `timeout after ${TOOL_CALL_TIMEOUT_MS}ms` : (err?.message || 'unknown error');
        return `(error fetching wiki articles: ${msg})`;
    }
}

// 2026-05-03 — callAnthropic / Anthropic chat path removed on this branch
// (HiC-Gemini-Primary). All chat traffic dispatches to callOpenAI or
// callGemini via sendChatMessage. Restoring Anthropic requires re-adding
// the function, the /api/ai/anthropic proxy route, the model registry
// entries, and the dispatch branch.

// 2026-05-04 — Both call paths now respect the user's model selection AND
// implement a fetch_wiki_articles tool-loop. The previous versions hardcoded
// 'gpt-5.4' / 'gemini-2.5-flash' (silently bypassing the picker) and lacked
// the tool registration entirely (the system prompt told the model to call
// fetch_wiki_articles but the function was never declared, causing
// hallucinations and "EVIDENCE GAP" placeholders).

// 2026-05-05 — Azure DeepSeek-V4-Flash chat path. OpenAI-compatible
// chat-completions wire format with tool-loop. The proxy
// (/api/ai/deepseek) handles the api-key header (NOT Authorization:
// Bearer) and 429-Retry-After backoff. Uses max_tokens (DeepSeek does
// not require the GPT-5 max_completion_tokens rename).
async function callDeepSeek(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: string = 'deepseek-v4-flash',
): Promise<string> {
    type DSMsg = {
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string | null;
        tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
        tool_call_id?: string;
        name?: string;
    };
    const messages: DSMsg[] = [
        { role: 'system', content: system },
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
        { role: 'user', content: userMsg },
    ];

    const tools = [{
        type: 'function' as const,
        function: {
            name: FETCH_WIKI_ARTICLES_TOOL.name,
            description: FETCH_WIKI_ARTICLES_TOOL.description,
            parameters: FETCH_WIKI_ARTICLES_TOOL.input_schema,
        },
    }];

    let lastText = '';
    for (let iter = 0; iter < MAX_TOOL_ITER; iter += 1) {
        const resp = await fetch(`${PROXY_BASE}/api/ai/deepseek`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                tools,
                tool_choice: 'auto',
                max_tokens: 16000,
                temperature: 0.2,
                stream: false,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error(`DeepSeek API ${resp.status}: ${errText.slice(0, 300)}`);
        }
        const data = await resp.json();
        const choice = data.choices?.[0];
        if (!choice) throw new Error('DeepSeek returned no choices');

        const msg = choice.message || {};
        if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
            lastText = msg.content;
        }
        messages.push(msg);

        const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (toolCalls.length === 0 || choice.finish_reason !== 'tool_calls') {
            return lastText || msg.content || 'No response';
        }

        console.log(`[chat.tools] iter ${iter + 1}: DeepSeek called ${toolCalls.length} tool(s): ${toolCalls.map((tc: any) => tc.function.name).join(', ')}`);
        for (const tc of toolCalls) {
            let result = '';
            if (tc.function.name === FETCH_WIKI_ARTICLES_TOOL.name) {
                try {
                    // 2026-05-05 — DeepSeek V4 Flash sometimes emits whitespace-only
                    // or empty `arguments` strings for arg-less tools; trim first.
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeFetchWikiArticlesTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else {
                result = `(unknown tool: ${tc.function.name})`;
            }
            messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.function.name,
                content: result,
            });
        }
    }
    console.warn(`[chat.tools] DeepSeek iteration cap ${MAX_TOOL_ITER} reached`);
    return lastText || 'The reasoning loop hit its iteration cap. Try a more focused question.';
}

async function callOpenAI(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: string = 'gpt-5.5',
): Promise<string> {
    type OpenAIMsg = {
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string | null;
        tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
        tool_call_id?: string;
        name?: string;
    };
    const messages: OpenAIMsg[] = [
        { role: 'system', content: system },
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
        { role: 'user', content: userMsg },
    ];

    const tools = [{
        type: 'function' as const,
        function: {
            name: FETCH_WIKI_ARTICLES_TOOL.name,
            description: FETCH_WIKI_ARTICLES_TOOL.description,
            parameters: FETCH_WIKI_ARTICLES_TOOL.input_schema,
        },
    }];

    let lastText = '';
    for (let iter = 0; iter < MAX_TOOL_ITER; iter += 1) {
        const resp = await fetch(`${PROXY_BASE}/api/ai/openai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-openai-endpoint': 'chat',
            },
            body: JSON.stringify({
                model,
                messages,
                tools,
                tool_choice: 'auto',
                max_completion_tokens: 16000,
                temperature: 0.2,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error(`OpenAI API ${resp.status}: ${errText.slice(0, 300)}`);
        }
        const data = await resp.json();
        const choice = data.choices?.[0];
        if (!choice) throw new Error('OpenAI returned no choices');

        const msg = choice.message || {};
        if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
            lastText = msg.content;
        }
        messages.push(msg);

        const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (toolCalls.length === 0 || choice.finish_reason !== 'tool_calls') {
            return lastText || msg.content || 'No response';
        }

        // Execute every tool call this turn (parallel-safe within one turn)
        console.log(`[chat.tools] iter ${iter + 1}: GPT called ${toolCalls.length} tool(s): ${toolCalls.map((tc: any) => tc.function.name).join(', ')}`);
        for (const tc of toolCalls) {
            let result = '';
            if (tc.function.name === FETCH_WIKI_ARTICLES_TOOL.name) {
                try {
                    // 2026-05-05 — DeepSeek V4 Flash sometimes emits whitespace-only
                    // or empty `arguments` strings for arg-less tools; trim first.
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeFetchWikiArticlesTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else {
                result = `(unknown tool: ${tc.function.name})`;
            }
            messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                name: tc.function.name,
                content: result,
            });
        }
    }
    console.warn(`[chat.tools] OpenAI iteration cap ${MAX_TOOL_ITER} reached`);
    return lastText || 'The reasoning loop hit its iteration cap. Try a more focused question.';
}

async function callGemini(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: string = 'gemini-3.1-pro-preview',
): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });

    // Gemini conversation = list of `{role, parts:[{text|functionCall|functionResponse}]}`
    type GPart = { text?: string } | { functionCall?: { name: string; args: any } } | { functionResponse?: { name: string; response: { result: string } } };
    type GContent = { role: 'user' | 'model' | 'function'; parts: GPart[] };
    const contents: GContent[] = [];
    // Fold prior chat history (user/assistant) into Gemini's user/model alternation
    for (const m of history) {
        if (m.role === 'system') continue;
        contents.push({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        });
    }
    contents.push({ role: 'user', parts: [{ text: userMsg }] });

    // Gemini's tool spec: { functionDeclarations: [{ name, description, parameters }] }
    const tools = [{
        functionDeclarations: [{
            name: FETCH_WIKI_ARTICLES_TOOL.name,
            description: FETCH_WIKI_ARTICLES_TOOL.description,
            parameters: FETCH_WIKI_ARTICLES_TOOL.input_schema,
        }],
    }];

    let lastText = '';
    for (let iter = 0; iter < MAX_TOOL_ITER; iter += 1) {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction: system,
                temperature: 0.2,
                maxOutputTokens: 65536,
                tools: tools as any,
            } as any,
        });

        const cand = (response as any).candidates?.[0];
        const respParts: GPart[] = cand?.content?.parts || [];

        // Concat any text parts so the user gets a final answer if model also speaks
        const textBits = respParts
            .filter((p: any) => typeof p?.text === 'string' && p.text.length > 0)
            .map((p: any) => p.text);
        if (textBits.length > 0) lastText = textBits.join('\n');

        // Execute every functionCall part
        const callParts = respParts.filter((p: any) => p?.functionCall);
        if (callParts.length === 0) {
            return lastText || (response as any).text || 'No response';
        }

        // Append assistant turn with all its parts (Gemini requires the model
        // turn to be in history before the function response turn).
        contents.push({ role: 'model', parts: respParts });

        console.log(`[chat.tools] iter ${iter + 1}: Gemini called ${callParts.length} tool(s): ${callParts.map((p: any) => p.functionCall.name).join(', ')}`);

        const responseParts: GPart[] = [];
        for (const cp of callParts) {
            const call = (cp as any).functionCall;
            let result = '';
            if (call.name === FETCH_WIKI_ARTICLES_TOOL.name) {
                try {
                    result = await executeFetchWikiArticlesTool(call.args || {});
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else {
                result = `(unknown tool: ${call.name})`;
            }
            responseParts.push({
                functionResponse: { name: call.name, response: { result } },
            });
        }
        contents.push({ role: 'user', parts: responseParts });
    }
    console.warn(`[chat.tools] Gemini iteration cap ${MAX_TOOL_ITER} reached`);
    return lastText || 'The reasoning loop hit its iteration cap. Try a more focused question.';
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
