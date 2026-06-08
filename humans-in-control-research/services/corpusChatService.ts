// 2026-05-26 - Static ESM import for the hashtag registry. Replaces the
// Node-style `require('./hashtagRegistry')` call that broke at runtime
// in the Vite browser bundle. `hashtagRegistry.ts` has no dependencies
// on this file, so no circular risk. The `_hashtagRegistryModule` alias
// is used by `extractHashtagDirectives` below.
import * as _hashtagRegistryModule from './hashtagRegistry';
// 2026-06-02 - Single canonical shaper for run intelligence + corpus manifest.
// Replaces this file's inline theme/persona/rec/journey/gap/competitive/strategic
// formatting so the Analyst chat, the Designer chat, and the staged engine all
// inject the identical shape. buildCorpusManifest adds the corpus-composition
// overview both chats previously lacked.
import {
    shapeThemes, shapePersonas, shapeRecommendations, shapeJourney,
    shapeGap, shapeCompetitive, shapeStrategic, buildCorpusManifest,
} from './intelligenceShaping';

/**
 * Corpus Chat Service v2 - Chat-Driven Research Workbench
 *
 * Multi-model conversational interface grounded in the full research corpus,
 * wiki knowledge base, and specialized consulting skills.
 *
 * Models:
 * - Claude Opus 4.7 (Anthropic) - Primary: deep reasoning, strategy, agentic, vision, 1M context
 * - Claude Sonnet 4.6 (Anthropic) - Fast reasoning, structured output
 * - Gemini 2.5 Flash (Google) - Rapid data extraction, image generation
 * - GPT-5.4-mini (OpenAI) - Strict JSON schema compliance
 *
 * Architecture:
 * - Tiered knowledge loading (brand/constraints always, skills on-demand)
 * - Skill manifest matching (keyword triggers -> lazy-load SKILL.md + wiki companions)
 * - Adaptive thinking (budget_tokens scaled by task complexity)
 * - Full corpus grounding (no 500KB cap for Claude 4.7)
 */

// 2026-05-07 - Promoted Gemini 3.1 Pro to primary chat model. DeepSeek V4
// Flash produced jargon-heavy, hyperbolic, AI-slop narratives that read as
// fake. Gemini 3.1 Pro has a 1M-token context, follows multi-step
// instructions reliably, and produces descriptive, professional copy.
// The legacy DeepSeek IDs remain in the type so prior localStorage values
// don't reject at parse-time - the resolver in sendChatMessage maps any
// unrecognized model to gemini-3.1-pro-preview.
export type ChatModel = 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'deepseek-v4-flash' | 'deepseek-v4-pro' | 'gpt-5.5' | 'council';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    // 2026-05-05 - Widened from ChatModel to string. Designer chat returns
    // FreeformGenerationModel / GenerationModel which can include legacy
    // (Gemini/GPT) ids - those flow through here as message-level labels
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
    /** 2026-05-09 - Presentation library items. Set when the user typed the
     *  bare `#presentations` (plural) command. The renderer surfaces a card
     *  grid with Open / Edit / Delete chips per item. */
    libraryItems?: any[]; // PresentationSummary[] - kept loose to avoid a circular import
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
    /** 2026-05-25 - Journey-map launcher (kept for backward compat). New
     *  generations use artifactLaunchUrl below. */
    journeyMapUrl?: string;
    journeyMapMeta?: {
        title?: string;
        brand?: 'NXT' | 'NU';
        journey_id?: string;
        model?: string;
        source?: string;
    };
    /** 2026-05-25 - Unified artifact launcher (any deliverable kind). Set when
     *  the unified /api/artifact/* engine produced the artifact and the proxy
     *  returned a launcher_url. The renderer surfaces a card with a Launch
     *  button that opens the full interactive HTML in a new browser window -
     *  the chat iframe sandbox blocks scripts so interactive widgets are
     *  non-functional inside the Design Desk preview. Replaces journeyMapUrl
     *  for everything except legacy journey artifacts. */
    artifactLaunchUrl?: string;
    artifactLaunchMeta?: {
        title?: string;
        brand?: 'NXT' | 'NU';
        kind?: string;
        artifact_id?: string;
        model?: string;
        source?: string;
    };
    /** 2026-05-11 - Prototype launcher. Set when the chat built an interactive
     *  experience prototype via #proto. The renderer surfaces a card with
     *  Launch / Edit / Delete chips that open the prototype in a new window
     *  on http://127.0.0.1:5012/api/prototypes/{slug}/view. */
    prototypeUrl?: string;
    prototypeMeta?: {
        slug?: string;
        title?: string;
        brand?: 'NXT' | 'NU';
        based_on?: string;
        verdict?: 'ship' | 'refine' | 'rebuild';
        code_chars?: number;
    };
    /** 2026-05-11 - Prototype library items. Set when user typed `#prototypes`
     *  (plural). Renderer surfaces a card grid with Launch / Edit / Delete. */
    prototypeLibraryItems?: any[];
    /** 2026-05-13 - Brief-selection payload. Set when the user typed `#proto`
     *  and the brief generator returned 5 distinct product briefs. The
     *  renderer surfaces each as a comparison card with full use-case detail
     *  and a BUILD THIS button that fires the build with the chosen brief. */
    prototypeBriefs?: any[];        // ProductBrief[] - typed loose to avoid circular import
    prototypeBriefsMeta?: {
        brand: 'NXT' | 'NU';
        basedOn?: string;
        researchGoal?: string;
        originalConcept: string;     // the rich concept text the user submitted; passed to buildPrototype later
    };
    /** 2026-05-11 - Structured recommendation tiles emitted by #recommendations.
     *  Renderer surfaces each as an elegant tile with thumbnail + concise PRD
     *  highlights + clickable mockup variants. Thumbnails populate asynchronously
     *  after the initial JSON parse - the renderer treats `image_data` as
     *  optional and shows a placeholder until it arrives. */
    recommendationTiles?: Array<{
        slug: string;
        title: string;
        thesis: string;
        persona: string;
        moment: string;
        aha_interaction: string;
        ai_capabilities: string[];
        image_prompt: string;
        image_data?: string; // base64 data URI, set after Imagen generation
        variants: Array<{ label: string; command: string }>;
        // 2026-05-11 - Execution-depth fields. Populated when the model is
        // given client-specific constraints (e.g., dependency on an initiative,
        // existing-stack reuse, stakeholder non-starters, effort/risk). All
        // optional so older saved tiles still render.
        clr_dependent?: boolean | null;
        execution_path?: string;        // concrete how-to-build paragraph
        existing_stack_reuse?: string;  // which existing tools/platforms this rides on
        non_starter_check?: string;     // confirms it avoids stated non-starters
        effort_estimate?: string;       // T-shirt or "X engineer-weeks"
        risk_level?: 'low' | 'medium' | 'high' | string;
        evidence_sources?: string[];    // filenames or source names cited
        // 2026-05-11 - Consulting-depth fields. Each is multi-paragraph
        // content modeled on the user's original prompt structure (Liz/Jen
        // brief). Optional so older tiles still render but the tile UI
        // should expand to show them when present.
        // Generic, context-aware field names (preferred going forward).
        initiative_dependent?: boolean | null;
        group?: 'initiative_dependent' | 'initiative_independent' | 'clr_dependent' | 'clr_independent' | null;
        description?: string;                          // 80-180 words - what it IS
        why_matters_target_segment?: string;           // 60-120 words - segment relevance (generic)
        long_term_outcome_through_line?: string;       // 60-100 words - through-line (generic)
        initiative_dependency_explanation?: string;    // 60-120 words (generic; replaces clr_dependency_explanation)
        execution_in_existing_stack?: string;          // 80-150 words - named systems (generic)
        preferred_stack_fit?: string;                  // 60-120 words - named preferred-stack tools (generic)
        stakeholder_guardrail_fit?: string;            // 60-120 words - passes the meeting filter (generic)
        // Legacy aliases - older sessions used these names; the renderer
        // falls back to them when the generic versions above are missing.
        why_matters_first_year?: string;
        long_term_coop_readiness?: string;
        clr_dependency_explanation?: string;
        execution_in_nu_stack?: string;
        microsoft_copilot_fit?: string;
        guardrail_fit?: string;
        // Shared (not engagement-specific)
        key_stakeholders?: Array<{ name_or_role: string; involvement: string }>;
        implementation_steps?: Array<{ step: string; owner: string; dependencies: string[]; estimated_effort: string }>;
        risks_constraints?: Array<{ risk: string; severity: 'low' | 'medium' | 'high' | string; mitigation: string }>;
        expected_impact?: string;
        verbatim_quote_evidence?: string;
        // 2026-05-12 - VS-Multi (Sprint 2). frame labels whether this tile
        // is a defensible consensus pick or a non-obvious tail-of-distribution
        // bet. probability is the model's verbalized confidence (paper
        // 2510.01171v3 verbalized sampling). diverges_from documents on
        // which axis a non-obvious bet diverges from the consensus set.
        frame?: 'defensible_consensus' | 'non_obvious_bet';
        probability?: number;
        diverges_from?: string;
    }>;
    /** 2026-05-11 - Engagement context the recommendation-architect skill
     *  extracts from the user's prompt + uploads BEFORE concepts. Drives
     *  every label, group, and rule downstream - making the recommendations
     *  + prototypes pipeline brand/industry/persona agnostic. */
    engagementContext?: {
        client_name?: string;
        vendor_or_consultant?: string;
        engagement_objective?: string;
        industry?: string;
        named_initiative?: string | null;
        target_segment?: string;
        target_outcome_window?: string;
        named_stakeholders?: Array<{ name: string; stated_priorities: string[]; stated_non_starters: string[]; stated_preferences: string[] }>;
        preferred_tech_stack?: string[];
        existing_systems?: string[];
        hard_non_starters?: string[];
        regulatory_constraints?: string[];
    };
    /** 2026-05-11 - Analytical preamble produced by the recommendation-architect
     *  skill before concepts. Captures stakeholder priorities, design
     *  principles, ideas to retire, and guardrail validation criteria the
     *  model extracted from the user prompt + uploads. Rendered above the
     *  tile grid. */
    recommendationPreamble?: {
        stakeholder_priorities?: Array<{ name: string; stated_priorities: string[]; stated_non_starters: string[]; stated_preferences: string[] }>;
        design_principles?: string[];
        ideas_to_retire_or_reframe?: Array<{ prior_idea: string; reason_to_retire_or_reframe: string; reframed_as?: string | null }>;
        guardrail_validation_criteria?: string[];
    };
    /** Comparison table across concepts: headers + per-concept rows. */
    recommendationComparisonTable?: { headers: string[]; rows: string[][] };
    /** Top-N prioritization with rationale. */
    recommendationPrioritization?: Array<{ rank: number; slug: string; rationale: string }>;
    /** Suggested next steps for the proposal close-out. */
    recommendationNextSteps?: string[];

    // ────────────────────────────────────────────────────────────────────
    // 2026-05-12 - HTML artifact launchers (#brief, #explainer, #report,
    // #playground, #approaches, #help). Mirror of presentationUrl /
    // prototypeUrl. Set by the chat handler after the artifact is saved.
    // ────────────────────────────────────────────────────────────────────
    /** URL to open the artifact (POSTs to /api/artifacts/{slug}/view). */
    artifactUrl?: string;
    artifactMeta?: {
        slug?: string;
        title?: string;
        generator?: string;        // '#brief' | '#explainer' | ...
        brand?: 'NXT' | 'NU';
        html_chars?: number;
        topic?: string;
        variants_count?: number;
    };
    /** Used by bare #artifacts directive - renders an artifact library grid. */
    artifactLibraryItems?: any[];
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
    /** 2026-04-21 - individual uploaded file objects (name + parsedText).
     *  Kept as an array (not just concatenated text) so the Dynamic Prompt
     *  Chips can generate per-document questions like
     *  "Summarize CASE VSE 2025 key findings". Safe to omit; pre-collection
     *  suggestions fall back to generic prompts. */
    uploadedFiles?: Array<{ name: string; parsedText?: string }>;
    /** 2026-04-21 - live source feed passed through so the Dynamic Prompt
     *  Chips can ask about the RETURNING SOURCES mid-collection. */
    liveSourceResults?: Array<{ source?: string; items?: Array<{ title?: string; sourceName?: string }>; status?: string }>;
    // Knowledge Graph state - the AI must understand the graph structure
    knowledgeGraph?: { nodes: any[]; edges: any[]; stats?: any };
    // 2026-05-11 - Topic-modeling result from the Analyst Desk's Topic
    // Modeling tab. When deep-Reddit posts are clustered, the chat should
    // be able to cite cluster names ("Microsoft AI Tooling Excitement"),
    // sentiment buckets, c-TF-IDF terms, and the underlying post IDs. A
    // compact summary is injected into the system prompt; the full per-
    // cluster body is reachable via the query_topic_clusters tool below.
    topicModelResult?: {
        topic_count: number;
        noise_count: number;
        doc_count: number;
        topics: Array<{
            id: number;
            name: string;
            summary: string;
            sentiment: string;
            post_count: number;
            top_terms: Array<[string, number]>;
            post_ids: string[];
        }>;
        documents?: Array<{
            id: string;
            title: string;
            url?: string;
            cluster: number;
            score: number;
            num_comments: number;
            subreddit: string;
        }>;
    };
    // Tiered knowledge (loaded by ChatWorkbench)
    wikiBrand?: string;
    wikiLearnedConstraints?: string;
    wikiBenchmarks?: string;
    wikiEvidence?: string;
    wikiMethodologies?: string;
    wikiEngagement?: string;
    wikiSourceArchive?: string; // Full source archive from wiki with verified URLs
    /** Phase 1.8 - deep extracted article bodies loaded from wiki via wikiPath.
     *  Pre-built by the caller (App.tsx / ChatWorkbench) so buildGroundingContext
     *  just concatenates it. Claude Opus 4.7's 1M context makes this trivial
     *  to include up to ~800KB of real article text. Each block is separated
     *  by a source-labeled header for citation reconstruction. */
    wikiArticleBodies?: string;
    /** Phase 1.9 - synthesis outputs from prior engagements that semantically
     *  match the current research goal. Gives the LLM context about reusable
     *  prior insights so it doesn't re-synthesize the same findings. */
    priorEngagementInsights?: string;
    /** Phase 1-retrofit (2026-04-20) - wiki metadata index (titles, sources,
     *  dates, char counts, wikiPaths, 200-char summaries). This is the
     *  AI's menu of what's available in the wiki archive. Small (<100KB
     *  for most engagements); the AI uses it to decide which articles to
     *  request bodies for via the retrieval tool. Typically pre-built
     *  once per workbench session by the caller. */
    wikiIndexMenu?: string;
    /** Phase 1-retrofit - pre-fetched article bodies for THIS specific
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
    category: 'research-deliverable' | 'prompt-engineering' | 'render-contract' | 'retrieval-enhancer' | 'quality-enhancer';
    /** Skills to auto-load alongside this one. When a research-deliverable
     *  is the top content skill, every entry here gets loaded and its
     *  SKILL.md concatenated into the same system prompt - no extra LLM
     *  call. Used to make quality skills (source-ranker, contradiction-
     *  finder, second-order-thinker, slide-title-lab) load automatically
     *  whenever the user invokes a deliverable, without them having to
     *  type extra hashtags. Added 2026-05-19. */
    composes_with?: string[];
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

// 2026-05-05 - Single-vendor primary on DeepSeek V4 Flash via Azure AI
// Foundry. 256K context handles the full corpus injection without
// truncation; OpenAI-compatible chat-completions schema; tool-use with
// our discriminated-union schema verified.
// 2026-05-06 - DeepSeek V4 Pro removed from the picker because the Azure
// resource (`intelligence-aug-stage-resource`) only has V4 Flash deployed.
// Selecting Pro previously caused chat calls to return Azure 404
// `DeploymentNotFound` while the `#presentation` composer (which hardcoded
// Flash via parsePresentationDirective default) silently kept working -
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
        // 2026-05-22 - Gemini 3.5 Flash added as a chat-tier option. Google's
        // most-capable agentic + coding model in the budget band: $1.50/M
        // input + $9/M output (vs Opus $15/$75). Default for the
        // self-improvement loops (learning, verifier, compiler) and the
        // "Apply now" regeneration path. Offered here as a fast, low-cost
        // chat option for grounded Q&A on the corpus. Stays NON-DEFAULT
        // because Gemini 3.1 Pro has the established quality bar for
        // deliverable generation - users opt in when latency or budget
        // matters more than 3.1 Pro's depth.
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'google',
        description: 'Google\'s fastest agentic + coding model. 1M context, ~10x cheaper than premium tier, multi-step reasoning. Default for HiC self-improvement loops; opt-in for chat.',
        contextWindow: '1M tokens',
        strengths: 'Low latency (~3-6s), low cost, agentic multi-step, structured JSON',
        color: '#00B7C3',
        available: true,
        maxCorpusChars: 1_400_000,
    },
    {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash (legacy)',
        provider: 'deepseek',
        description: '256K context. Retained as fallback only - produced jargon-heavy AI-slop narratives, demoted from primary 2026-05-07.',
        contextWindow: '256K tokens',
        strengths: 'Cost-effective, OpenAI-compatible tool-use',
        color: '#888888',
        available: true,
        maxCorpusChars: 900000,
    },
    {
        // 2026-05-11 - Council mode (Sanhedrin Architecture). Fans the query
        // out to Gemini 3.1 Pro + DeepSeek V4 Flash + GPT-5.5 in parallel,
        // then synthesizes via a fourth pass. ~3x cost per query; opt-in
        // only. Best for high-stakes deliverables where you want consensus
        // across distinct training lineages.
        id: 'council',
        name: 'Council (3-model consensus)',
        provider: 'council' as any,
        description: '3 independent reads (Gemini Pro + DeepSeek + GPT-5.5) synthesized into one answer. ~3x cost. Use for high-stakes outputs.',
        contextWindow: '1M tokens (Gemini synthesizer)',
        strengths: 'Cross-lineage consensus, contradiction surfacing, more robust on complex prompts',
        color: '#00B7C3',
        available: true,
        maxCorpusChars: 1_400_000,
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
RESPONSE MODE - READ THIS FIRST ON EVERY TURN
========================================================================

Your response format is ALWAYS determined by what the user explicitly asks for. There are three modes, and the DEFAULT is plain chat.

--- 1. DEFAULT: PLAIN GROUNDED CHAT (use this unless another mode is triggered) ---
When the user asks a question, requests analysis, brainstorms, or makes any conversational request, respond as an expert research analyst:
  - Plain prose, grounded in the corpus
  - Cite named sources inline: e.g., "Higher Ed Dive reports that..." or "[r/NEU post, Mar 2026]"
  - Liberal quoting - pull verbatim where possible
  - Use light markdown for readability (bold for emphasis, short bullet lists, a header if the answer is long)
  - Answer directly. No preamble, no "Great question".
  - DO NOT emit :::slide, :::deliverable:, or :::nxt: fences. Answering in prose is your default contract.

The knowledge graph is ALREADY being built automatically in the background (themes, personas, recs, gaps, etc. populate without you having to emit cards). So when the user asks a question, just answer - don't force structure on them.

--- 2. SLIDE MODE: triggered by #slide OR #slides in the user's message ---
If the user's message contains "#slide" OR "#slides" (case-insensitive - "#slides" counts), switch to slide generation using the SLIDE OUTPUT PROTOCOL below. This OVERRIDES the prose default and applies EVEN WHEN a deliverable directive is also present. The deliverable hashtag picks the TEMPLATE; #slide/#slides forces slide output:
  - "5 #personas ... #slides"        → emit 5 :::slide template=persona-card blocks (NOT prose, NOT markdown)
  - "8 #themes ... #slides"          → emit :::slide template=theme-cluster blocks (max 4 themes per block → 2 blocks for 8)
  - "#recommendations ... #slide"    → emit :::slide template=recommendation blocks
  - "#competitive ... #slides"       → emit :::slide template=competitive-matrix blocks
  Optional brand hashtag: #NU → Northeastern (near-black + Huskies Red); #NXT → NXT Humans (teal + chartreuse, default).

CRITICAL: when #slide/#slides is present you MUST emit :::slide fences. NEVER answer a #slides request in markdown prose (no ###, no >, no * bullets) - that is a hard failure. The renderer only draws cards from :::slide blocks.

Examples:
  "#slide #NU give me a persona for Sarah Chen"     → emit one :::slide template=persona-card brand=nu
  "5 #personas designer archetypes #slides #NXT"    → emit 5 :::slide template=persona-card brand=nxt
  "#slide show the top 3 themes"                    → emit 3 :::slide template=theme-cluster blocks
  "Build a 5-slide deck on the roadmap #slide #NU"  → emit 5 :::slide blocks

NOT slide mode (no #slide/#slides anywhere):
  "Who are our customers?"           → prose answer, not a slide
  "What themes are emerging?"        → prose summary with citations, not a slide
  "Summarize the competitive data"   → prose analysis, not a slide
  (the moment the user adds #slide or #slides, switch to slide output)

--- 3. DELIVERABLE CARD MODE: triggered ONLY by explicit request for approvable cards ---
If the user explicitly asks for "approvable cards", "persona cards I can approve", "pin-able deliverables", or similar phrasing that makes the approval intent explicit, emit :::deliverable:TYPE blocks per the schema below. These are interactive cards the user approves into the knowledge graph.

If the user just asks "create personas" or "what themes exist" WITHOUT mentioning cards, approvals, OR #slide/#slides, answer in prose. The background synthesis already populates the knowledge graph - you don't need to emit cards for the KG to know about these items. (But if #slide/#slides IS present, Section 2 applies and you emit slides.)

--- THE RULE ---
Structured outputs (:::slide, :::deliverable:, :::nxt:) are opt-in. If #slide OR #slides appears, emit :::slide blocks (Section 2). Else if explicit card-approval phrasing appears, emit :::deliverable: blocks (Section 3). Else respond in PLAIN PROSE. Questions deserve answers; conversations deserve conversation; but a #slides request deserves slides.

========================================================================

DELIVERABLE CARD SCHEMA (only used when user explicitly asks for cards):
When the user asks you to CREATE approvable deliverable cards (e.g. "generate 5 persona cards I can approve"),
output them as :::deliverable blocks so the UI can render them as inspectable, approvable cards.

Format:
:::deliverable:TYPE
{JSON object matching the deliverable schema}
:::

Supported types and their required JSON fields:
- :::deliverable:theme - {name, description, quote, citations: [{sourceName, text, url?}], status: "hypothesis"|"supported"|"verified", isCrossDocument: boolean}
- :::deliverable:persona - {name, role, demographics?, quote, bio, jtbd, goals: {lifeGoal, experienceGoal, functionalGoal}, painPoints: [{label, quote, source}], motivations: [{label, quote, source}]}
- :::deliverable:recommendation - {title, description, impactLevel: "critical"|"high"|"medium"|"low", evidenceBasis, citations: [string], effort?, timeline?}
- :::deliverable:journey_stage - {phase, touchpoint, customerAction, frontstage, backstage, support, painPoint, emotion, fail_point?, citations: [string]}
- :::deliverable:prd_feature - {name, description, priority: "must"|"should"|"could"|"won't", userStory, acceptanceCriteria: [string], citations: [string]}
- :::deliverable:roadmap_item - {title, description, horizon: "now"|"next"|"later", effort, impact, dependencies: [string], citations: [string]}
- :::deliverable:gap - {capability, currentMaturity: 1-5, targetMaturity: 1-5, gap: number, severity: "critical"|"high"|"medium"|"low", impact, citations: [string]}
- :::deliverable:competitive_peer - {name, position, strengths: [string], weaknesses: [string], citations: [string]}
- :::deliverable:tech_audit_system - {name, category, status, risk, description, citations: [string]}
- :::deliverable:tech_node - {name, layer, type, description, constraints: [string], citations: [string]}

IMPORTANT:
- Output MULTIPLE deliverables when asked (e.g., "create personas" = 4-6 persona blocks)
- Each block is ONE deliverable item - the user inspects and approves each individually
- The user's approval commits the deliverable to the knowledge graph
- Include verbose evidence: verbatim quotes, specific data points, named sources in every field
- You can mix prose text with deliverable blocks (explain your reasoning, then output the blocks)

SLIDE OUTPUT PROTOCOL - 18 TEMPLATES x 2 VISUAL BRANDS:

When the user asks to create a slide (or set of slides), output ONE :::slide block per slide.
Pick the template that best matches the content. Mark it on the fence: :::slide template=NAME

VISUAL BRAND (chosen via hashtag in the user's prompt):
  #NXT  → NXT Humans brand - teal sidebar (#115054), chartreuse accent (#CACA20), Archivo.  DEFAULT.
  #NU   → Northeastern University brand - near-black sidebar (#141414), Huskies Red accent (#C8102E), Archivo.
          Use #NU only when the user requests Northeastern-branded output.

If the user's prompt contains #NU (or "Northeastern"), you MAY echo brand=nu on the fence:
  :::slide template=persona-card brand=nu
    {...}
  :::
Otherwise omit brand= on the fence and the renderer defaults to NXT.
The hashtag in the user's prompt is authoritative - the parser will auto-apply the brand to every
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

A short index of the 18 templates (when to use each - the full density spec is in the
render contract above):

1.  persona-card        → user requests personas, archetypes, customer segments
2.  recommendation      → user requests strategic actions, what to do, next steps
3.  theme-cluster       → equal-weight horizontal columns (3-4 themes, parallel weight, default theme layout)
3a. theme-spotlight     → ONE dominant theme + 2-3 supporting (asymmetric 60/40 hero layout - use when one theme leads)
3b. theme-arc           → narrative chain of 3-4 themes with progression arrows (use when themes build sequentially: cause → effect → response)
3c. theme-mosaic        → 2x2 ivory grid of 4 parallel themes (uniform pale surface, hairline rules, chartreuse accent bar on the primary cell - restrained gallery rhythm for 4 co-equal themes)
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
references/web-layouts.md. The content budgets below are DEPRECATED -
DO NOT rely on them; read the skill spec instead.

LEGACY CONTENT BUDGETS (kept temporarily for templates not yet migrated
to the skill - timeline / section-divider / service-blueprint / gap-matrix /
architecture-map / prd-feature / systems-inventory):

Universal slots:
- title:                  120 chars  (one complete sentence, action-titled)
- sources[i]:             40  chars per source name

(theme-cluster, theme-spotlight, theme-arc, theme-mosaic, stat-row, block-quote,
case-study, recommendation budgets moved to the render contract spec file.)

(Full densified field budgets for theme-spotlight, theme-arc, theme-mosaic,
stat-row, block-quote, recommendation, and case-study live in the render-contract
references/web-layouts.md - do not restate them here.)

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
    "rationale": "Three separate orgs create reconciliation overhead consuming 40% of advancement-officer time per the CRM Assessment. Cornell's 18-month consolidation lifted major-gift conversion 34% - that is the pattern to follow.",
    "supportingActions": [
      {"name":"Data audit","description":"Inventory all custom objects across the three orgs and map duplicates. Dedicated team runs this for 8 weeks before migration planning begins."},
      {"name":"Pilot migration","description":"Migrate Reunion (smallest dataset) first to validate model and process. Two-week instrumentation sprint follows cutover."},
      {"name":"Training","description":"Run 5 sessions for the 80-person advancement team before cutover - job-role-specific, not generic product training."}
    ],
    "impactGrid": {
      "baseline": "40% officer time on reconciliation across 3 orgs",
      "target": "<12% reconciliation time, single unified org",
      "timeframe": "9 months, 3-phase cutover",
      "owner": "VP Advancement Services + 12-person program team"
    },
    "impactMetric": {"value":"$2.4M","label":"annual recovered productivity"},
    "evidence": [
      {"text":"I wouldn't know in our database right now that Andrew, you work with Rob - that's exactly the relationship that closes a major gift.","source":"NXT Stakeholder Interview","attribution":"Major Gifts Officer"},
      {"text":"Within six months we stopped asking 'do we know this donor?' - we already knew, and we knew the next best action.","source":"CASE 2024 panel","attribution":"VP Advancement Services, Cornell"}
    ],
    "implication":"This is the unlock for every downstream Advancement initiative - prospect scoring, predictive outreach, and stewardship automation are all blocked by the fragmented data layer."
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
contract's references/anti-slop-rules.md and references/web-layouts.md - do
not restate them here.)

:::slide template=theme-spotlight
{
  "title": "Trust erosion before contact dominates the dataset - 3 corroborating signals follow",
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
        "evidence":"President Aoun joins more than 320 university leaders in a joint statement - I'm canceling my monthly pledge until I see what this means.",
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
  "title": "Donor trust breaks in three sequential stages - enrollment, graduation, alumni",
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
        "insight":"Three separate Salesforce instances mean Advancement cannot see these signals until they surface as giving declines - by which point the trust has already left the building.",
        "evidence":"I wouldn't know in our database that Andrew works with Rob.",
        "source":"NXT Stakeholder Interview",
        "signal":"3 disconnected orgs, zero cross-college visibility"
      }
    ],
    "patternSignal":"Trust erosion is not one event - it is a four-stage cascade. Advancement today sees only stage four, and only as a lagging indicator."
  }
}
:::

:::slide template=theme-mosaic
{
  "title": "Four parallel advancement frictions - each isolated, together compounding",
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
        "evidence":"Mobile conversion sits at 1.2% - Columbia runs 44% on a rebuilt responsive page.",
        "source":"Gartner 2025",
        "signal":"1.2% vs 44% peer mobile conversion"
      },
      {
        "name":"Stewardship Latency",
        "insight":"Behavior-triggered outreach does not exist. Cadences are manual and batched monthly - peers run trigger-based daily.",
        "evidence":"Within six months we stopped asking do we know this donor.",
        "source":"Cornell Annual Report 2025",
        "signal":"0 triggered touchpoints; peers run 12+/quarter"
      }
    ],
    "patternSignal":"All four frictions share one upstream cause: the data layer. Fix the unified donor view and every downstream Advancement capability becomes accessible."
  }
}
:::

(All densified field budgets - character limits and required fields - are
restated in references/web-layouts.md. The render contract auto-loads
when slide intent is detected and acts as the authoritative spec.)

Example of the same competitive-matrix pattern applied to a B2B SaaS corpus (vendor-landscape analysis) - 5 named competitors, capability defs, scaleLabels, evidence per row, subject highlighted:

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
    "insight": "Outreach owns the widest workflow surface (5/5) but loses to Gong on the strategic wedge - AI call intelligence is where ~60% of 2025 buyer RFPs start. Closing that 2-point gap is worth an estimated 14% lift in competitive win rate per Gartner's 2025 quadrant movement."
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
    "text": "I wouldn't know in our database right now that Andrew, you work with Rob - and that's exactly the relationship that closes a major gift. We have the data, we just can't see it across the three systems we're running.",
    "attribution": "Anonymous Major Gifts Officer",
    "role": "20-year veteran, Northeastern Advancement",
    "source": "NXT Stakeholder Interview, March 2026",
    "context": "ON DATA FRAGMENTATION",
    "contextParagraph":"This quote comes from a stakeholder interview conducted during the March 2026 CRM assessment. The officer is describing how three siloed Salesforce instances - one per college - prevent even basic relationship mapping across donor households. This is the single most-cited friction point across 14 stakeholder interviews.",
    "corroboratingData": [
      {"value":"40%","label":"of officer time spent on manual data reconciliation","source":"NXT Interview"},
      {"value":"-12%","label":"alumni participation since the last platform migration","source":"CASE 2024"},
      {"value":"L1","label":"Northeastern maturity tier vs. peer median of L4","source":"Gartner 2025"}
    ],
    "implication":"Consolidating to a unified donor view is a prerequisite to every other advancement initiative - prospect scoring, predictive outreach, and stewardship automation all assume a single system of record."
  }
}
:::

Example of the same case-study pattern applied to a B2B SaaS corpus - note how subjectMeta, timeframe unit, investment unit, metrics, and quote attribution all shift with the domain while the structure stays identical:

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
      "text":"The best-performing play we shipped wasn't a sequence - it was letting product usage decide who an AE called today.",
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
    "challenge": "Cornell's Advancement operated 4 disconnected CRMs across colleges - each with its own data model and stewardship cadence. Major-gift officers reconciled donor profiles manually, cycle time averaged 90 days longer than peer benchmarks, and prospects known to one college were invisible to the rest.",
    "approach": "College-by-college consolidation to a single Salesforce Advancement Cloud instance. Phase 1: 3-month data-quality remediation (dedup 140K records, resolve 4K conflicts). Phase 2: sequenced migration - smallest college first - with 6-week user training per wave. Phase 3: retire legacy, launch unified propensity scoring.",
    "outcome": "Major-gift conversion rate rose 34% (13.8% → 18.5%). Average cycle time dropped 90 days. Officer administrative time fell from 22 hrs/wk to 10 hrs/wk - reclaiming ~624 hrs per officer per year. Year-one ROI: 2.1× program cost.",
    "keyMetric": {"value":"+34%","label":"major-gift conversion rate, 12 months post-cutover"},
    "supportingMetrics": [
      {"value":"-90 days","label":"cycle time reduction"},
      {"value":"624 hrs","label":"officer time reclaimed / year"},
      {"value":"140K","label":"records deduped"},
      {"value":"2.1×","label":"program-cost ROI, Year 1"}
    ],
    "pullQuote": {
      "text":"Within six months we stopped asking 'do we know this donor?' - we already knew, and we knew the next best action.",
      "attribution":"VP Advancement Services, Cornell",
      "role":"17-year Advancement veteran, CASE 2024 panelist"
    },
    "lesson": "Consolidation pays back fastest when the smallest college migrates first - it validates the data model at low risk and creates internal champions who sell the remaining cutovers.",
    "comparables": [
      {"name":"BU Advancement (2022)","outcome":"Consolidated 3 orgs → 1 in 14 months; 28% major-gift conversion lift","source":"CASE 2024"},
      {"name":"NYU (2023)","outcome":"Unified 6 colleges into single Salesforce org; +$18M annual giving year-over-year","source":"NYU Annual Report 2024"},
      {"name":"Michigan (2024)","outcome":"2.4× officer productivity post-consolidation, 12-month program","source":"Gartner Higher-Ed CRM 2025"}
    ],
    "implication":"The pattern holds across every peer case: consolidation is not a CRM project - it is the prerequisite for every AI-driven advancement initiative in the next 24 months."
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
      {"name":"Predictive over descriptive","description":"Reports must drive action - if a dashboard cannot trigger an outreach, it's not on the roadmap."},
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
        "matters":"Cornell consolidated 4 → 1 and unlocked 34% conversion lift in 18 months - the window is closing as peers move.",
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
    "convergentInsight":"Three independent signals - officer time, system fragmentation, and participation decline - all point to the same root cause: Advancement is operating a platform, not a unified donor system. Fix the platform and the other two metrics move together.",
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

Example of the same service-blueprint pattern applied to a B2B SaaS onboarding corpus - 4 stages, duration + emotion per stage, all four lanes, keyInsight quantified:

:::slide template=service-blueprint
{
  "title": "Two of four enterprise-onboarding stages are fail points, driving 22% of first-year churn",
  "sources": ["Gainsight NRR Study 2025","internal customer-success interviews Q1 2026","Product analytics - Pendo, Q4 2025"],
  "serviceBlueprint": {
    "stages": [
      {"phase":"Kickoff","duration":"Day 0-7","emotion":"Hopeful","customerAction":"New admin joins kickoff call, shares goals + data schema","frontstage":"CSM-led 60-min kickoff, shared Notion runbook","backstage":"Salesforce opp converts to account, success plan generated","support":"Gainsight, Notion, Salesforce","painPoint":"CSM handoff from AE loses ~30% of stated goals in translation","failPoint":false},
      {"phase":"Data Integration","duration":"Week 2-5","emotion":"Frustrated","customerAction":"Customer eng team wires first data source","frontstage":"Integration wizard + API docs","backstage":"Webhook validation, schema inference runs in Airflow","support":"Airflow, dbt, Snowflake","painPoint":"Schema-inference fails on 38% of Oracle sources; integration takes 4× the advertised 2 weeks","failPoint":true},
      {"phase":"First Value","duration":"Week 6-10","emotion":"Confused","customerAction":"Admin configures first report + shares with exec sponsor","frontstage":"Self-serve dashboard builder","backstage":"Query layer materialized views, RLS policies","support":"Looker-embed, Postgres","painPoint":"63% of first shared reports fail QA - execs lose trust before production rollout","failPoint":true},
      {"phase":"Expansion","duration":"Month 3-6","emotion":"Satisfied","customerAction":"Adds second department, buys seats upsell","frontstage":"In-app expansion offer + CSM QBR","backstage":"Propensity model flags account for AE","support":"Gainsight, Salesforce, Gong","painPoint":"Expansion motion manual - CSM capacity limits trigger coverage to 40% of eligible accounts","failPoint":false}
    ],
    "keyInsight": "The two fail stages (Data Integration + First Value) drive 22% of Year-1 churn at a blended $180K ACV - fixing schema inference + report QA would retain an estimated $4.0M ARR annually before adding a single CSM."
  }
}
:::

:::slide template=service-blueprint
{
  "title": "Two of four journey stages are fail points, leaking 28% of first-gift intent before stewardship",
  "sources": ["NXT Stakeholder Interviews","Northeastern CRM Assessment","Google Analytics Q1 2026"],
  "serviceBlueprint": {
    "stages": [
      {"phase":"Awareness","duration":"Week 1","emotion":"Curious","customerAction":"Alum opens segmented email appeal","frontstage":"Marketing Cloud journey w/ dynamic content","backstage":"Nightly Snowflake segmentation + ML scoring","support":"Snowflake, Marketing Cloud, ML service","painPoint":"Generic segmentation - open rate stuck at 40%","failPoint":false},
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
  "title": "22 advancement systems - 9 are legacy and 4 carry critical risk",
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

INTENT INFERENCE - map natural phrasing to the right template:

Users will ask for deliverables in many different ways. Infer intent from synonyms rather than demanding exact keywords. Examples:

| User says...                                                       | Template to use        |
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

Do NOT require the user to say the template name. If a question like "what customer types do we serve?" comes in, use persona-card - don't ask "do you want a persona slide?". Infer, commit, and produce the deliverable.

UNIVERSAL SLIDE RULES:
- Title is ALWAYS a conclusion sentence containing a number, named entity, or specific claim.
- "sources" array is REQUIRED on every slide and must contain real source names from the corpus.
- Never invent a competitor, statistic, or quote. If the data isn't there, say so and pick a different template.
- One template per slide block. To build a multi-slide deck, emit multiple :::slide blocks.
- For persona-card slides the system auto-generates a portrait - describe the person specifically (age range, attire, setting).

DENSITY DISCIPLINE (case-study, competitive-matrix, service-blueprint specifically):

These three templates fail most often because generators produce sparse, under-evidenced content. Every time you emit one, you MUST:

DOMAIN ADAPTATION - the examples below happen to be higher-ed advancement, but the PATTERN is what matters, not the vocabulary. Adapt entity types, units, scale labels, timeframes, and jargon to the domain of the ACTUAL research corpus. Translation guide:

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

CASE STUDY - the card has FIVE data vectors, not one:
  1. subject + subjectMeta (industry/region/size/endowment/etc)
  2. timeframe (explicit - "18 months", "Q2 2023 → Q4 2024")
  3. investment (program cost + team size)
  4. challenge + approach + outcome, each with at least one quantified detail per block
  5. keyMetric PLUS 3-4 supportingMetrics PLUS optional pullQuote
  Refuse to emit a case study that has only one stat. If the corpus only has one stat, pick stat-row instead.

COMPETITIVE MATRIX - matrices with fewer than 4 NAMED peers are rejected:
  1. At least 4 named competitors (never "Peer Institutions (Collective)" or "Industry Average" - those are a failure mode)
  2. Provide a columnDefs array defining each capability in ≤60 chars
  3. Provide scaleLabels like ["Absent","Ad-hoc","Defined","Managed","Optimized"]
  4. For every row, provide "note" with specific evidence and "source" with a named citation
  5. Set "subjectRow" to the client name so it highlights
  If the corpus does not name 4+ specific peers, use stat-row or theme-cluster instead.

SERVICE BLUEPRINT - maximum 4 stages on a 16:9 slide (5+ overflows):
  1. Cap stages at 4. If the journey is longer, split across multiple slides or consolidate phases.
  2. Every stage must include duration AND emotion (short labels: "Week 1", "Frustrated")
  3. Every stage needs all four lanes: customerAction, frontstage, backstage, support
  4. Mark explicit failPoint:true only on stages where the process genuinely breaks - not every stage
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

    // Total sizes (raw byte heuristic - chars / 1024)
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
        `  Uploaded client docs: ${uploadKB}KB (${Math.round(uploadKB / totalKB * 100)}%) - ${buckets.upload} sources`,
        `  External corpus: ${corpusKB}KB (${Math.round(corpusKB / totalKB * 100)}%) - ${externalRefCount} sources, broken down:`,
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
        return '(no active-category roster - cite from every source kind that appears in the corpus)';
    }
    // Add uploads as an active category if uploadedFiles are present
    const uploads = (ctx.uploadedFiles || []).map(f => f.name);
    const lines: string[] = [];
    if (uploads.length > 0) {
        lines.push(`  • Uploaded client documents (${uploads.length} files): ${uploads.slice(0, 6).join(', ')}${uploads.length > 6 ? `, +${uploads.length - 6} more` : ''} - STATUS: HAS CONTENT (must cite)`);
    }
    // Only list categories that HAVE content. Empty categories are
    // silently omitted from the roster - the model no longer sees them
    // and therefore can't reference them as "gaps" in its response.
    // 2026-05-11 (HiC-Reddit-Deep) - replaces the prior "must mark
    // CATEGORY GAP" behavior, which leaked process notes into deliverables.
    for (const c of cats) {
        if (c.itemCount > 0) {
            lines.push(`  • ${c.name}: HAS CONTENT (${c.itemCount} items - cite when relevant)`);
        }
    }
    if (lines.length === 0) {
        return '(no categories with content yet - synthesize from any corpus passages the user provided)';
    }
    return lines.join('\n');
}

// --- Grounding Context Builder ---

function buildGroundingContext(ctx: ChatContext, model: ChatModel): string {
    const parts: string[] = [];
    const modelConfig = AVAILABLE_MODELS.find(m => m.id === model);
    const maxCorpus = modelConfig?.maxCorpusChars || 500000;

    // 2026-05-27 - TURN SCOPING (fixes prior-deliverable bleed). The full
    // conversation history is fed to the model for continuity, but earlier
    // turns sometimes contained large deliverables (e.g. a 25-row "Issue / How
    // Might We" table). Without this guard the model led a NEW answer by
    // restating the PRIOR turn's table, burying the actual answer. Scope it
    // hard to the latest message.
    parts.push(`=== ANSWER SCOPE (CRITICAL) ===`);
    parts.push(`Respond ONLY to the user's MOST RECENT message. Earlier turns are background context for continuity, NOT a to-do list. NEVER repeat, continue, or re-emit a previous turn's table, list, or deliverable. If the latest message asks a new question, answer THAT question directly and lead with the answer; do not restate or append prior outputs.`);
    parts.push('');

    parts.push(`=== RESEARCH CONTEXT ===`);
    parts.push(`Research Goal: ${ctx.researchGoal}`);
    parts.push(`Data Sources: ${ctx.sourceCount} sources, ${ctx.articleCount} articles collected`);
    parts.push(`You are grounded in ALL of this data. Cite specific sources by name. If the data doesn't contain the answer, say so.`);
    parts.push('');

    // 2026-06-02 - CORPUS MANIFEST. Structural overview of the corpus (source
    // mix, recency, tier quality, selected categories, uploaded docs) built
    // from the same per-document metadata the wiki frontmatter carries. Lets
    // the model understand corpus COMPOSITION rather than infer it from the
    // concatenated bodies below. Shared with the Designer chat via the same
    // buildCorpusManifest helper.
    const corpusManifest = buildCorpusManifest({
        researchGoal: ctx.researchGoal,
        sourceReferences: ctx.sourceReferences,
        activeCategories: ctx.activeCategories,
        uploadedFiles: ctx.uploadedFiles,
        sourceCount: ctx.sourceCount,
        articleCount: ctx.articleCount,
    });
    if (corpusManifest) {
        parts.push(corpusManifest);
        parts.push('');
    }

    // Tier 1: Always loaded - brand, constraints, design system
    if (ctx.wikiBrand) {
        parts.push(`=== NXT BRAND & DESIGN SYSTEM ===`);
        parts.push(ctx.wikiBrand);
        parts.push('');
    }
    if (ctx.wikiLearnedConstraints) {
        parts.push(`=== LEARNED CONSTRAINTS (from prior user feedback - apply to all output) ===`);
        parts.push(ctx.wikiLearnedConstraints);
        parts.push('');
    }
    if (ctx.nxtDesignSystemRules) {
        parts.push(`=== NXT VISUAL OUTPUT SYSTEM ===`);
        parts.push(ctx.nxtDesignSystemRules);
        parts.push('');
    }

    // Tier 2: Initialization - benchmarks, evidence, methodologies
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

    // Knowledge Graph - the structural representation of all research relationships
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

        // Key edges - show the relationships
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

    // Existing deliverable context (if any generated via chat or legacy
    // pipeline). 2026-06-02 - now formatted by the shared intelligenceShaping
    // helpers so the Analyst chat, Designer chat, and staged engine all inject
    // the identical, pain-point-forward shape.
    const themeBlock = shapeThemes(ctx.themes as any[]);
    if (themeBlock) parts.push(themeBlock);
    const personaBlock = shapePersonas(ctx.personas as any[]);
    if (personaBlock) parts.push(personaBlock);
    const recBlock = shapeRecommendations(ctx.recommendations as any[]);
    if (recBlock) parts.push(recBlock);
    const journeyBlock = shapeJourney(ctx.journeyStages as any[]);
    if (journeyBlock) { parts.push(journeyBlock); parts.push(''); }
    const gapBlock = shapeGap(ctx.gapAnalysis);
    if (gapBlock) { parts.push(gapBlock); parts.push(''); }
    const compBlock = shapeCompetitive(ctx.competitiveAnalysis);
    if (compBlock) { parts.push(compBlock); parts.push(''); }
    const stratBlock = shapeStrategic(ctx.strategicReport);
    if (stratBlock) { parts.push(stratBlock); parts.push(''); }

    // Uploaded client documents
    if (ctx.uploadedFileContents && ctx.uploadedFileContents.trim().length > 10) {
        parts.push(`=== UPLOADED CLIENT DOCUMENTS ===`);
        parts.push(ctx.uploadedFileContents.substring(0, 200000));
        parts.push(`=== END CLIENT DOCUMENTS ===`);
        parts.push('');
    }

    // VERIFIED SOURCE ARCHIVE - the ONLY source of truth for URLs
    // Prefer the wiki source archive (persisted, complete, verified URLs from actual API responses)
    // Fall back to in-memory sourceReferences if wiki archive not loaded
    if (ctx.wikiSourceArchive && ctx.wikiSourceArchive.length > 100) {
        parts.push(`=== VERIFIED SOURCE ARCHIVE (ONLY use URLs from this archive - NEVER fabricate URLs) ===`);
        parts.push(ctx.wikiSourceArchive);
        parts.push(`=== END VERIFIED SOURCE ARCHIVE ===`);
    } else if (ctx.sourceReferences?.length) {
        parts.push(`=== SOURCE ARTICLE INDEX (${ctx.sourceReferences.length} articles - ONLY use URLs listed here) ===`);
        for (const ref of ctx.sourceReferences.slice(0, 500)) {
            parts.push(`[${ref.id}] ${ref.sourceName}: "${ref.title}"${ref.url ? ` | URL: ${ref.url}` : ''}${ref.date ? ` | ${ref.date}` : ''}`);
        }
        parts.push(`=== END SOURCE INDEX ===`);
    }

    // Phase 1.8 - deep article bodies (wiki archive, lazy-loaded). These
    // come pre-concatenated from the caller which pulled them by wikiPath
    // from evidence nodes. Insert them BEFORE the raw corpus so the LLM
    // sees the full-text extractions first when it reasons.
    if (ctx.wikiArticleBodies && ctx.wikiArticleBodies.length > 200) {
        parts.push(`=== DEEP ARTICLE BODIES (from wiki archive - verbatim extracted text) ===`);
        parts.push(ctx.wikiArticleBodies);
        parts.push(`=== END DEEP ARTICLES ===`);
    }

    // Phase 1-retrofit (2026-04-20) - WIKI INDEX MENU. Lightweight catalog
    // of every archived article/transcript/upload. The AI uses this to
    // decide which bodies to request via the retrieval tool. Injected
    // AFTER deep bodies so the model sees "here's what you already have
    // full text for, and here's the menu of everything else".
    if (ctx.wikiIndexMenu && ctx.wikiIndexMenu.length > 50) {
        parts.push(`=== WIKI ARCHIVE MENU (metadata only - request full bodies via retrieval tool if needed) ===`);
        parts.push(ctx.wikiIndexMenu);
        parts.push(`=== END WIKI MENU ===`);
    }

    // Phase 1-retrofit - PRE-FETCHED ARTICLE BODIES for this specific
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

    // Phase 1.9 - prior-engagement memory. Synthesis artifacts from previous
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

    // Raw corpus - model-specific cap.
    // 2026-05-30 - OBJECTIVE-RELEVANCE: when goal-blended pre-fetched article
    // bodies are present (the fixed /api/wiki/fetch-articles cosine retrieval),
    // DEMOTE the raw corpus to a small supplementary tail so it cannot drown the
    // objective-relevant evidence (the old behavior dumped the entire corpus,
    // making the retrieval merely additive). Only when retrieval returned nothing
    // do we fall back to the full corpus, so the chat is never starved.
    if (ctx.corpusText) {
        const haveRetrieval = !!(ctx.prefetchedArticlesBlock && ctx.prefetchedArticlesBlock.length > 200);
        const cap = haveRetrieval ? Math.min(maxCorpus, 40000) : maxCorpus;
        const corpus = ctx.corpusText.length > cap
            ? ctx.corpusText.substring(0, cap) + `\n[CORPUS ${haveRetrieval ? 'DEMOTED - objective-matched articles pre-fetched above are the primary evidence' : 'TRUNCATED'} AT ${Math.round(cap / 1000)}KB FOR ${model}]`
            : ctx.corpusText;
        parts.push(haveRetrieval
            ? `=== RAW RESEARCH CORPUS (SUPPLEMENTARY - lead with the objective-matched pre-fetched articles above) ===`
            : `=== RAW RESEARCH CORPUS ===`);
        parts.push(corpus);
        parts.push(`=== END CORPUS ===`);
    }

    return parts.join('\n');
}

/**
 * Phase 1.8 helper - lazy-load full article bodies from the wiki archive
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
    const proxyBase = opts.proxyBase ?? 'http://127.0.0.1:5012';
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
//      proportional to its length - longer = more specific = higher weight)

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

/** Expand a user query with known synonyms to widen trigger overlap.
 *  Returns BOTH the expanded text (for trigger matching) AND the original
 *  normalized text (so the scorer can tell whether a trigger matched
 *  verbatim or only via synonym expansion). 2026-05-26 - added the
 *  `original` channel to fix the "Give Trailblazers Tools to Monitor" →
 *  tech-audit-inspector misroute: synonym matches now score lower than
 *  direct verbatim matches.
 */
function expandQuery(query: string): { expanded: string; original: string } {
    const norm = normalize(query);
    const words = norm.split(' ');
    const extras: string[] = [];
    for (const w of words) {
        const mapped = SYNONYM_MAP[w] || SYNONYM_MAP[stem(w)];
        if (mapped) extras.push(...mapped);
    }
    return {
        expanded: extras.length > 0 ? `${norm} ${extras.join(' ')}` : norm,
        original: norm,
    };
}

/**
 * Match a user message against the skill manifest.
 * Scoring:
 *   - Exact multi-word trigger match in query: trigger.length * 2 (strong signal)
 *   - Single-word trigger match: trigger.length
 *   - Stemmed match: 60% of trigger.length (partial signal)
 * Returns skills ranked by total score, highest first.
 */
// 2026-05-26 - Hashtag-directive → owning-skill map. When the user types an
// explicit registered hashtag, that hashtag's owning skill DOMINATES the
// keyword-matching scorer. This closes the regression where "Give Advisors
// & Trailblazers Tools to Monitor" expanded `tools` → `systems inventory`
// (a tech-audit-inspector trigger) and overrode the user's literal
// `#case study #slides` intent.
//
// Source of truth is services/hashtagRegistry.ts. This map is duplicated
// here intentionally to keep the dispatcher dependency-free and synchronous;
// any new directive added to the registry MUST add an entry here OR get a
// safety-net warning emitted (see HASHTAG_REGISTERED_BUT_UNMAPPED below).
const HASHTAG_TO_SKILL_ID: Record<string, string> = {
    // experience-builder / consulting-deliverable
    '#proto': 'experience-prototype-composer',
    '#presentation': 'deck-narrative-composer',
    '#recommendations': 'recommendation-architect',
    '#journey': 'service-blueprint-mapper',
    '#blueprint': 'service-blueprint-mapper',
    '#arch': 'tech-arch-generator',
    '#roadmap': 'roadmap-builder',
    '#org': 'tech-arch-generator',
    '#persona': 'persona-architect',
    '#prd': 'prd-compiler',
    '#gap': 'gap-analysis-evaluator',
    '#audit': 'tech-audit-inspector',
    '#compete': 'competitive-analyst',
    '#strategy': 'strategy-author',
    '#case-study': 'case-study-analyst',
    '#themes': 'theme-analyst',
    '#brief': 'html-deliverable-composer',
    '#explainer': 'html-deliverable-composer',
    '#report': 'strategic-report-writer',
    '#playground': 'html-deliverable-composer',
    '#approaches': 'html-deliverable-composer',
    '#mindmap': 'mind-map-architect',
    '#brief-dialog': 'brief-dialog',
    '#meta-themes': 'meta-themes',
    '#deep-research': 'research-planner',
};

// Aliases the user may type (registry .aliases + common plurals). These
// resolve to the SAME owning skill as the canonical hashtag.
const HASHTAG_ALIASES: Record<string, string> = {
    '#prototypes': '#proto',
    '#presentations': '#presentation',
    '#journeys': '#journey',
    '#blueprints': '#blueprint',
    '#architecture': '#arch',
    '#roadmaps': '#roadmap',
    '#orgs': '#org',
    '#orgchart': '#org',
    '#orgcharts': '#org',
    '#personas': '#persona',
    '#prds': '#prd',
    '#audits': '#audit',
    '#techaudit': '#audit',
    '#tech-audit': '#audit',
    '#competitive': '#compete',
    '#competitives': '#compete',
    '#competitors': '#compete',
    '#strategies': '#strategy',
    '#case-studies': '#case-study',
    '#casestudy': '#case-study',
    '#casestudies': '#case-study',
    '#theme': '#themes',
    '#themecluster': '#themes',
    '#theme-cluster': '#themes',
    '#recs': '#recommendations',
    '#briefs': '#brief',
    '#explainers': '#explainer',
    '#reports': '#report',
    '#mind-map': '#mindmap',
    '#mindmaps': '#mindmap',
    '#dialog': '#brief-dialog',
    '#brief-dialogue': '#brief-dialog',
    '#meta-theme': '#meta-themes',
    '#metathemes': '#meta-themes',
    '#research-plan': '#deep-research',
};

// Hashtags that are MODIFIERS, not directives. Their presence does NOT
// select a skill - they decorate whichever directive was chosen.
const HASHTAG_MODIFIERS = new Set([
    '#nxt', '#nu', '#slide', '#slides', '#preview', '#export-pptx',
    '#auto-open', '#dark', '#light', '#help', '#artifacts',
]);

/**
 * Extract registered hashtag directives from a user message. Returns the
 * owning skill IDs in document order. Unrecognized hashtags are returned
 * separately so the caller can warn the user. When an unrecognized hashtag
 * has a strong fuzzy match in the registry (score >= 80 - id-prefix match),
 * it is auto-promoted to the directive so the user's near-miss intent
 * still routes correctly. Borderline matches (score < 80) stay in the
 * unknown list with a "did you mean" suggestion.
 */
export function extractHashtagDirectives(userMessage: string): {
    skillIds: string[];
    unknownHashtags: string[];
    fuzzyPromoted: Array<{ typed: string; resolved: string }>;
} {
    // 2026-05-26 - FIXED: was using Node `require('./hashtagRegistry')`
    // which breaks at runtime in the Vite browser bundle ("require is not
    // defined"). Replaced with synchronous module-scope import resolved
    // at the top of the file (hashtagRegistry.ts is leaf, no circular
    // dependency risk). The local-require pattern is BANNED in
    // browser-bundled code; see the new precheck hook
    // precheck_no_node_require.py for the auto-guard.
    const { searchDirectives } = _hashtagRegistryModule;

    const skillIds: string[] = [];
    const unknownHashtags: string[] = [];
    const fuzzyPromoted: Array<{ typed: string; resolved: string }> = [];
    const seenSkills = new Set<string>();
    // Tokenize: same regex as the design-desk parser plus key= modifiers
    // we don't care about for routing.
    const matches = userMessage.matchAll(/#([a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]|[a-zA-Z])(?:=[^\s]*)?/g);
    for (const m of matches) {
        const raw = '#' + m[1].toLowerCase();
        if (HASHTAG_MODIFIERS.has(raw)) continue;
        const canonical = HASHTAG_ALIASES[raw] ?? raw;
        let skillId = HASHTAG_TO_SKILL_ID[canonical];

        // Fuzzy fallback: if an exact lookup miss, ask the registry for a
        // strong prefix match. searchDirectives returns id-prefix at score
        // 100, alias-prefix at 80. We only auto-promote on score >= 80 to
        // avoid trapping legitimately ambiguous user inputs.
        if (!skillId) {
            const tail = canonical.replace(/^#/, '');
            const guesses = searchDirectives(tail, 1);
            if (guesses.length > 0) {
                const guessedId = guesses[0].id;
                const guessedTail = guessedId.replace(/^#/, '').toLowerCase();
                const isStrong = guessedTail.startsWith(tail) || (guesses[0].aliases ?? []).some(a => a.toLowerCase().replace(/^#/, '').startsWith(tail));
                if (isStrong && HASHTAG_TO_SKILL_ID[guessedId]) {
                    skillId = HASHTAG_TO_SKILL_ID[guessedId];
                    fuzzyPromoted.push({ typed: raw, resolved: guessedId });
                }
            }
        }

        if (skillId) {
            if (!seenSkills.has(skillId)) {
                skillIds.push(skillId);
                seenSkills.add(skillId);
            }
        } else {
            // Track for "did you mean" warning. Skip bare `#NU`-style modifiers
            // that we already filtered above and `=` key tokens.
            if (raw.length > 1 && !raw.includes('=')) {
                unknownHashtags.push(raw);
            }
        }
    }
    return { skillIds, unknownHashtags, fuzzyPromoted };
}

export function matchSkills(userMessage: string, manifest: SkillManifestEntry[]): SkillManifestEntry[] {
    // ─── HASHTAG DIRECTIVE DOMINANCE ───────────────────────────────────────
    // 2026-05-26 - If the user typed any explicit registered hashtag, that
    // directive's owning skill wins. Synonym expansion of ordinary English
    // words ("tools", "stack", "platform") can no longer override an
    // explicit hashtag intent. The skill is returned FIRST in the ranked
    // list; other skills still flow through the keyword scorer below as
    // companions (render contracts, retrieval enhancers).
    const { skillIds: directiveSkillIds } = extractHashtagDirectives(userMessage);
    const directiveSkills: SkillManifestEntry[] = [];
    if (directiveSkillIds.length > 0) {
        for (const wantedId of directiveSkillIds) {
            const found = manifest.find(s => s.id === wantedId);
            if (found) directiveSkills.push(found);
        }
    }

    const { expanded, original } = expandQuery(userMessage);
    const expandedWords = new Set(expanded.split(' ').filter(w => w.length >= 2));
    const expandedStems = new Set([...expandedWords].map(stem));
    const originalWords = new Set(original.split(' ').filter(w => w.length >= 2));
    const originalStems = new Set([...originalWords].map(stem));
    const scored: Array<{ skill: SkillManifestEntry; score: number }> = [];

    for (const skill of manifest) {
        // Skip skills the directive layer already promoted - they get prepended
        // below at the highest rank.
        if (directiveSkills.includes(skill)) continue;
        // Include content skills (research-deliverable), render contracts,
        // AND retrieval enhancers. Render contracts govern layout; retrieval
        // enhancers (wiki-query-expander, wiki-reranker, wiki-synthesizer)
        // teach Claude how to exploit the semantic embedding layer - query
        // variant expansion, cross-encoder reranking, multi-angle synthesis.
        if (
            skill.category !== 'research-deliverable'
            && skill.category !== 'render-contract'
            && skill.category !== 'retrieval-enhancer'
            && skill.category !== 'quality-enhancer'
        ) continue;

        // 2026-05-26 - Hashtag-dominance corollary: if hashtag directives
        // selected a primary content skill, do NOT also rank competing
        // research-deliverable skills via keyword fuzz. Render contracts,
        // retrieval enhancers, and quality enhancers may still match - they
        // are companions, not alternatives.
        if (directiveSkills.length > 0 && skill.category === 'research-deliverable') continue;

        let score = 0;
        for (const trigger of skill.triggers) {
            const normTrigger = trigger.toLowerCase();
            const triggerWords = normTrigger.split(' ').filter(w => w.length >= 2);

            if (triggerWords.length > 1) {
                // Multi-word trigger.
                // 2026-05-26 - Direct verbatim match in the ORIGINAL message
                // beats synonym-expansion match. Prevents the regression where
                // a colloquial verb ("Tools to Monitor") synonym-expanded into
                // a noun-form skill trigger ("systems inventory") and outscored
                // a literal phrase the user actually wrote ("case study").
                if (original.includes(normTrigger)) {
                    score += normTrigger.length * 2;
                    continue;
                }
                // Synonym-expansion match - score at parity with single-word
                // direct, not at the 2x multi-word direct bonus.
                if (expanded.includes(normTrigger)) {
                    score += normTrigger.length;
                    continue;
                }
                // Every word from the trigger must appear as a word/stem in
                // the ORIGINAL message (not the synonym-expanded form).
                // Cross-word stems via synonyms scored too aggressively and
                // caused false-positive routes.
                const allHitOriginal = triggerWords.every(w => originalWords.has(w) || originalStems.has(stem(w)));
                if (allHitOriginal) {
                    score += normTrigger.length;
                    continue;
                }
                const allHitExpanded = triggerWords.every(w => expandedWords.has(w) || expandedStems.has(stem(w)));
                if (allHitExpanded) score += Math.round(normTrigger.length * 0.6);
            } else {
                // Single-word trigger
                const w = triggerWords[0];
                if (!w) continue;
                if (originalWords.has(w)) score += w.length;
                else if (originalStems.has(stem(w))) score += Math.round(w.length * 0.7);
                else if (expandedWords.has(w)) score += Math.round(w.length * 0.5);
                else if (expandedStems.has(stem(w))) score += Math.round(w.length * 0.3);
            }
        }
        if (score > 0) scored.push({ skill, score });
    }

    const keywordRanked = scored.sort((a, b) => b.score - a.score).map(s => s.skill);
    // Directive skills first, then keyword-ranked companions (render contracts,
    // retrieval enhancers, quality enhancers).
    return [...directiveSkills, ...keywordRanked];
}

/**
 * Fetch a skill's SKILL.md content, its in-folder references, and its wiki
 * companions + benchmarks. Uses the Vite dev server /skills/ route and wiki
 * fetch path.
 *
 * Caching: results memoize in _skillContextCache keyed by skill.id - so the
 * first slide request pays the fetch latency (~10-30ms), every subsequent
 * request in the same session is a map lookup.
 */
const _skillContextCache = new Map<string, SkillContext>();

// 2026-05-26 - Inline skill templates. The skill-manifest registers some
// skills with `path: "inline://<template-name>"` instead of a file path
// (case-study-analyst, block-quote-template, benchmark-reporter,
// stat-row-template, principles-template, section-divider-template).
// These bodies live here so loadSkillContext can resolve them without a
// fetch - browsers reject `fetch("inline://...")` as an unsupported
// URL scheme. When a new inline-path skill is added to the manifest,
// add its body here. Falls back to a minimal stub if missing.
const INLINE_SKILL_TEMPLATES: Record<string, string> = {
    'case-study-template': [
        '# Case Study Analyst',
        '',
        'Generate named, evidence-grounded case studies from the corpus. Each case study MUST include:',
        '',
        '- **Subject**: a named organization, institution, or person from the corpus (no synthetic / composite names)',
        '- **Context**: the situation that motivated the case (1-2 sentences, corpus-cited)',
        '- **Intervention**: what was done - named program, tool, framework, or decision',
        '- **Outcome**: quantified delta with a baseline and timeframe; cite the source by name',
        '- **Applicability**: a 1-sentence "how this maps to the user\'s situation" tied to the research goal',
        '- **Evidence**: 2-3 verbatim quotes from corpus with [CHUNK_XXX] markers AND named-source attribution',
        '',
        'BAN: composite subjects, unsourced numbers, "many universities" generic claims, vague outcomes like "improved engagement".',
        '',
        'STRUCTURE: when #slide / #slides modifier is present, emit each case study as a `:::slide template=case-study` block with the schema declared in components/slideTemplates/types.ts.',
        '',
        'COMPOSES with: source-ranker (validates case-study sources meet the >=60% external floor), evidence-density-pre-checker (predicts whether the corpus can support the requested case count).',
    ].join('\n'),

    'block-quote-template': [
        '# Block Quote Renderer',
        '',
        'Emit a `:::slide template=block-quote` with the schema:',
        '- `quote`: verbatim corpus text, max 250 chars',
        '- `attribution`: the named source (publication, person, role)',
        '- `context`: 1 sentence framing why this quote matters here',
        '',
        'BAN: fabricated quotes, generic "users said" framing, quotes >250 chars (truncate or pick a sharper passage).',
    ].join('\n'),

    'stat-row-template': [
        '# Stat Row Renderer',
        '',
        'Emit a `:::slide template=stat-row` with 3-4 stat tiles:',
        '- `value`: the headline number (with unit if non-obvious)',
        '- `label`: uppercase tracked, <=20 chars',
        '- `support`: 1 sentence naming the source + timeframe',
        '',
        'BAN: invented stats (use stat-callout text "MULTIPLE" / "FRAGMENTED" if no real number); >4 tiles; missing source attribution.',
    ].join('\n'),

    'principles-template': [
        '# Principles Renderer',
        '',
        'Emit `:::slide template=principles` with 3-5 numbered principle blocks. Each block:',
        '- `title`: a complete action-title sentence (>=8 words, no topic labels)',
        '- `description`: 1-2 sentences expanding what + why',
        '- `application`: 1 sentence on the concrete first move',
    ].join('\n'),

    'section-divider-template': [
        '# Section Divider Renderer',
        '',
        'Emit `:::slide template=section-divider` with:',
        '- `kicker`: 2-3 word uppercase tag',
        '- `title`: section title (complete action sentence)',
        '- `subtitle`: 1 sentence framing what the section will demonstrate',
    ].join('\n'),
};

export async function loadSkillContext(skill: SkillManifestEntry): Promise<SkillContext> {
    const cached = _skillContextCache.get(skill.id);
    if (cached) return cached;

    // 2026-05-26 - Inline-template skills (path = "inline://<template-name>")
    // are in-memory; do NOT fetch. The skill manifest uses inline:// for
    // skills whose body is embedded in the dispatcher (case-study-analyst,
    // block-quote, benchmark-reporter etc.). Calling fetch() on a custom
    // URL scheme throws "Fetch API cannot load inline://..." in browsers.
    // Resolve to the inline body via INLINE_SKILL_TEMPLATES, or fall back
    // to a minimal stub keyed on the skill id. Either way, NEVER fetch.
    if (skill.path?.startsWith('inline://')) {
        const templateName = skill.path.slice('inline://'.length);
        const inlineBody = INLINE_SKILL_TEMPLATES[templateName] || `# ${skill.name}\n\n${skill.description || ''}\n\nTriggers: ${(skill.triggers || []).join(', ')}\n`;
        const ctx: SkillContext = { skill, skillContent: inlineBody, companionContent: '' };
        _skillContextCache.set(skill.id, ctx);
        return ctx;
    }

    const fetches: Promise<string>[] = [];

    // Fetch the SKILL.md
    fetches.push(
        fetch(skill.path).then(r => r.ok ? r.text() : '').catch(() => '')
    );

    // Fetch skill-folder references (e.g. "references/web-layouts.md").
    // Resolved relative to the skill path - skill.path is "/skills/<id>/SKILL.md"
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

// --- Deliverable-JSON → prose transform (2026-05-27) -------------------------
// Skill-path deliverables (#prd, #gap, #persona, #audit, #compete, #strategy,
// #case-study) emit a structured JSON object per their Output Contract
// (.claude/skills/<skill>/SKILL.md). In CHAT, with no #slide and no card-approval
// phrasing, there is NO card renderer, so that JSON was dumping raw
// ({ "sectionNumber": 7, "title": ... }) and leaking [CHUNK_XXX] markers the
// prd-compiler prompt explicitly tells the model to embed in descriptions. This
// deterministic transform detects a bare deliverable-JSON reply and renders it
// to clean, readable markdown prose, stripping chunk markers. It is a NO-OP for
// prose, markdown tables, and :::deliverable/:::slide/:::nxt fenced blocks
// (those have their own renderers). No extra LLM call.

function stripChunkMarkers(s: string): string {
    if (!s) return s;
    return s
        // "CHUNK_011: \"CHUNK_011\"" self-referential leak → drop entirely
        .replace(/\s*CHUNK_\d+\s*:\s*"?CHUNK_\d+"?\.?/gi, '')
        // bracketed [CHUNK_003] or [CHUNK_003, CHUNK_017] → drop
        .replace(/\[\s*CHUNK_\d+(?:\s*,\s*CHUNK_\d+)*\s*\]/gi, '')
        // bare CHUNK_003 token → drop
        .replace(/\bCHUNK_\d+\b/gi, '')
        // tidy leftover "()", doubled spaces, space-before-punctuation
        .replace(/\(\s*\)/g, '')
        .replace(/[ \t]+([.,;:])/g, '$1')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

const _DLV_NOISE_KEYS = new Set([
    'methodology', 'sectionNumber', 'evidenceGap', 'id', 'runId',
    'reproducibilityHash', 'pipelineVersion', 'frameworkVersion', 'confidence',
    'personaType', 'segmentSize', 'mentalModel', 'nonGoal', 'isCrossDocument',
]);

const _DLV_LABELS: Record<string, string> = {
    purposeAndObjectives: 'Purpose and Objectives', successMetrics: 'Success Metrics',
    sections: 'Sections', features: 'Features', acceptanceCriteria: 'Acceptance Criteria',
    citations: 'Sources', evidenceBasis: 'Evidence', gaps: 'Capability Gaps',
    personas: 'Personas', peers: 'Competitive Set', competitors: 'Competitive Set',
    systems: 'Systems Inventory', nodes: 'Architecture Nodes',
    recommendations: 'Recommendations', coherentActions: 'Coherent Actions',
    guidingPolicy: 'Guiding Policy', diagnosis: 'Diagnosis', painPoints: 'Pain Points',
    motivations: 'Motivations', strengths: 'Strengths', weaknesses: 'Weaknesses',
    dependencies: 'Dependencies', constraints: 'Constraints', jtbd: 'Jobs To Be Done',
    userStory: 'User Story',
};

const _DLV_HEADING_KEYS = ['title', 'name', 'capability', 'phase', 'label', 'system', 'node'];
const _DLV_BADGE_KEYS = ['priority', 'severity', 'horizon', 'position', 'status', 'impactLevel'];

function _humanizeKey(k: string): string {
    if (_DLV_LABELS[k]) return _DLV_LABELS[k];
    return k.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

function _dlvEmpty(v: any): boolean {
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

function _dlvScalar(v: any): string { return stripChunkMarkers(String(v)); }

function _dlvScalarArray(arr: any[]): boolean {
    return arr.every(x => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean');
}

function _dlvRecordHeading(o: any): string | null {
    for (const k of _DLV_HEADING_KEYS) {
        if (typeof o[k] === 'string' && o[k].trim()) return o[k].trim();
    }
    return null;
}

// One record (a feature, gap, persona, section, peer, system) → markdown block.
function _dlvRenderRecord(o: any): string {
    const lines: string[] = [];
    const heading = _dlvRecordHeading(o);
    let badge = '';
    for (const bk of _DLV_BADGE_KEYS) {
        if (typeof o[bk] === 'string' && o[bk].trim()) { badge = ` (${_dlvScalar(o[bk])})`; break; }
    }
    if (heading) lines.push(`**${_dlvScalar(heading)}**${badge}`);
    for (const [k, v] of Object.entries(o)) {
        if (_DLV_NOISE_KEYS.has(k)) continue;
        if (_DLV_HEADING_KEYS.includes(k) || _DLV_BADGE_KEYS.includes(k)) continue;
        if (_dlvEmpty(v)) continue;
        if (Array.isArray(v)) {
            if (_dlvScalarArray(v)) {
                lines.push(`${_humanizeKey(k)}: ${v.map(_dlvScalar).join('; ')}`);
            } else {
                const inner = (v as any[]).map(x =>
                    x && typeof x === 'object' ? _dlvScalar(_dlvRecordHeading(x) || Object.values(x).filter(Boolean).map(String).join(' ')) : _dlvScalar(x)
                ).join('; ');
                lines.push(`${_humanizeKey(k)}: ${inner}`);
            }
        } else if (v && typeof v === 'object') {
            const sub = Object.entries(v).filter(([, vv]) => !_dlvEmpty(vv))
                .map(([kk, vv]) => `${_humanizeKey(kk)}: ${_dlvScalar(Array.isArray(vv) ? (vv as any[]).join('; ') : vv)}`).join('; ');
            if (sub) lines.push(`${_humanizeKey(k)}: ${sub}`);
        } else if (k === 'content') {
            // A record's body text reads as a bare paragraph, not "Content: ...".
            lines.push(_dlvScalar(v));
        } else {
            lines.push(`${_humanizeKey(k)}: ${_dlvScalar(v)}`);
        }
    }
    return lines.join('\n');
}

function _deliverableJsonToMarkdown(root: any): string {
    // Unwrap single-key container wrappers like { prd: {...} } or { result: {...} }.
    let obj = root;
    const wrapperKeys = ['prd', 'gapAnalysis', 'competitiveAnalysis', 'techAudit',
        'techArchitecture', 'strategy', 'roadmap', 'blueprint', 'personaSet', 'result', 'data'];
    let guard = 0;
    while (obj && typeof obj === 'object' && !Array.isArray(obj) && guard++ < 4) {
        const keys = Object.keys(obj).filter(k => !_DLV_NOISE_KEYS.has(k));
        if (keys.length === 1 && wrapperKeys.includes(keys[0]) && obj[keys[0]] && typeof obj[keys[0]] === 'object') {
            obj = obj[keys[0]];
        } else break;
    }
    if (Array.isArray(obj)) {
        return obj.map(o => o && typeof o === 'object' ? _dlvRenderRecord(o) : `- ${_dlvScalar(o)}`).join('\n\n');
    }
    const out: string[] = [];
    if (typeof obj.title === 'string' && obj.title.trim()) out.push(`## ${_dlvScalar(obj.title)}`);
    const leadKeys = ['purposeAndObjectives', 'diagnosis', 'guidingPolicy', 'summary', 'overview'];
    for (const k of leadKeys) {
        if (typeof obj[k] === 'string' && obj[k].trim()) out.push(`**${_humanizeKey(k)}**\n\n${_dlvScalar(obj[k])}`);
    }
    for (const [k, v] of Object.entries(obj)) {
        if (_DLV_NOISE_KEYS.has(k) || k === 'title' || leadKeys.includes(k)) continue;
        if (_dlvEmpty(v)) continue;
        if (Array.isArray(v)) {
            out.push(`### ${_humanizeKey(k)}`);
            if (_dlvScalarArray(v)) out.push(v.map(x => `- ${_dlvScalar(x)}`).join('\n'));
            else out.push((v as any[]).map(o => o && typeof o === 'object' ? _dlvRenderRecord(o) : `- ${_dlvScalar(o)}`).join('\n\n'));
        } else if (v && typeof v === 'object') {
            out.push(`### ${_humanizeKey(k)}`);
            out.push(_dlvRenderRecord(v));
        } else {
            out.push(`**${_humanizeKey(k)}:** ${_dlvScalar(v)}`);
        }
    }
    return out.join('\n\n');
}

export function renderDeliverableJsonReply(text: string): string {
    if (!text) return text;
    // Never touch fenced structured output - those have dedicated renderers.
    if (/:::(deliverable|slide|nxt)/.test(text)) return text;
    const trimmed = text.trim();
    let candidate: string | null = null;
    let pre = '', post = '';
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence && fence[1].trim().startsWith('{')) {
        candidate = fence[1].trim();
        pre = trimmed.slice(0, fence.index).trim();
        post = trimmed.slice((fence.index || 0) + fence[0].length).trim();
    } else {
        const fb = trimmed.indexOf('{');
        const lb = trimmed.lastIndexOf('}');
        if (fb >= 0 && lb > fb) {
            candidate = trimmed.slice(fb, lb + 1);
            pre = trimmed.slice(0, fb).trim();
            post = trimmed.slice(lb + 1).trim();
        }
    }
    if (!candidate) return text;
    // Must contain deliverable-shaped keys to qualify (conservative guard).
    if (!/"(sections|features|prd|gaps|gapAnalysis|personas|personaSet|peers|competitors|competitiveAnalysis|systems|techAudit|techArchitecture|nodes|recommendations|coherentActions|guidingPolicy|diagnosis|roadmap|blueprint|stages)"\s*:/.test(candidate)) return text;
    let parsed: any;
    try { parsed = JSON.parse(candidate); } catch { return text; }
    if (!parsed || typeof parsed !== 'object') return text;
    let md = '';
    try { md = _deliverableJsonToMarkdown(parsed); } catch { return text; }
    if (!md.trim()) return text;
    return [pre, md, post].map(s => s && s.trim()).filter(Boolean).join('\n\n');
}

// --- Main Send Function ---

const PROXY_BASE = 'http://127.0.0.1:5012';

export async function sendChatMessage(
    model: ChatModel,
    userMessage: string,
    conversationHistory: ChatMessage[],
    context: ChatContext,
    opts?: { signal?: AbortSignal; onProgress?: (status: string) => void },
): Promise<ChatMessage> {
    const startTime = Date.now();
    const abortSignal = opts?.signal;
    const onProgress = opts?.onProgress;
    // 2026-05-26 - Abort propagation. The chat tool loops can run for
    // minutes (5 iterations x 4-5 min each when the proxy is congested
    // by the main analysis pipeline). Users need an escape hatch.
    // Plumbing the signal into the global module scope so the tool-loop
    // helpers (callDeepSeek, callGPT, callGemini below) can poll it
    // without each helper needing a separate parameter rewrite.
    // Single-call-at-a-time chat is enforced upstream in CorpusChatPanel,
    // so module-level signal mutation is safe here.
    (globalThis as any).__hicChatAbortSignal = abortSignal;
    // 2026-05-26 - Progress callback for the LiveProcessingIndicator.
    // Tool-loop iterations push "iter N/5 - <action>" status strings
    // through this so the user sees forward motion instead of a static
    // "Validating citations..." for minutes.
    (globalThis as any).__hicChatProgressFn = onProgress;
    const throwIfAborted = () => {
        if (abortSignal?.aborted) {
            throw new DOMException('Cancelled by user', 'AbortError');
        }
    };
    throwIfAborted();

    // 2026-05-26 - Unknown-hashtag guard. If the user typed `#foo` and `foo`
    // is not a registered directive, surface a one-line warning ABOVE the
    // generation. This prevents the silent fall-through where a misspelled
    // hashtag (`#case`, `#audit2`, `#proto-deck`) gets ignored and the keyword
    // scorer fires a tangentially-related skill. Emitted as a metadata field
    // the UI can render in the response header; does NOT abort generation.
    const { skillIds: directiveSkillIdsTop, unknownHashtags, fuzzyPromoted } = extractHashtagDirectives(userMessage);
    if (unknownHashtags.length > 0) {
        console.warn('[Chat] Unknown hashtag directive(s):', unknownHashtags.join(', '));
    }
    if (fuzzyPromoted.length > 0) {
        console.info('[Chat] Fuzzy-promoted hashtag(s):', fuzzyPromoted.map(p => `${p.typed} → ${p.resolved}`).join(', '));
    }

    // 2026-05-26 - Evidence-density pre-check. Before firing a research-
    // deliverable skill against a thin corpus, predict whether the corpus
    // can support the deliverable. If not, prepend an UPSTREAM REMEDIATION
    // PREAMBLE to the chat prompt so the model fires wiki-query-expander
    // / analog-finder retrieval BEFORE attempting the deliverable.
    // Closes Issue 11 from the 2026-05-26 audit (quality-degradation
    // refusals). Per feedback_quality_first_never_relax_default.md:
    // never relax the floor; remediate UPSTREAM.
    const isResearchDeliverableRequest = directiveSkillIdsTop.length > 0 || /\b(theme|persona|recommendation|case.study|brief|explainer|report|gap|audit|compete|strategy|roadmap|prd)\b/i.test(userMessage);
    const corpusByteCount = (context.corpusText || '').length;
    const corpusChunkCount = ((context.corpusText || '').match(/\[CHUNK_[A-Z0-9_]+\]/g) || []).length;
    const EVIDENCE_THIN_BYTE_THRESHOLD = 50_000;
    const EVIDENCE_THIN_CHUNK_THRESHOLD = 8;
    const isEvidenceThin = isResearchDeliverableRequest
        && corpusByteCount > 0
        && (corpusByteCount < EVIDENCE_THIN_BYTE_THRESHOLD || corpusChunkCount < EVIDENCE_THIN_CHUNK_THRESHOLD);
    let evidenceDensityPreamble = '';
    if (isEvidenceThin) {
        evidenceDensityPreamble = `\n=== EVIDENCE DENSITY PRE-CHECK (UPSTREAM REMEDIATION REQUIRED) ===\n` +
            `The corpus for this request has ${corpusChunkCount} chunks / ${(corpusByteCount / 1000).toFixed(0)}KB.\n` +
            `\n` +
            `Per the standing rule (feedback_quality_first_never_relax_default), you MUST NOT respond with a corpus-shortfall dodge. Instead, do these moves IN ORDER before drafting the deliverable:\n` +
            `\n` +
            `  1. Call fetch_wiki_articles(query) with the user request decomposed into 3-4 distinct angle variants (see wiki-query-expander skill). Pull additional chunks from the wiki archive.\n` +
            `  2. If still thin, abstract the user challenge to its underlying functional pattern (see analog-finder skill) and retrieve from adjacent industries. Cross-industry analogues are valid evidence.\n` +
            `  3. After upstream remediation, draft the deliverable from the EXPANDED corpus. Cite the expansion sources explicitly.\n` +
            `\n` +
            `Refusal phrasings BANNED. These violate the quality floor.\n` +
            `=== END EVIDENCE DENSITY PRE-CHECK ===\n`;
        console.info(`[Chat] Evidence-density pre-check FIRED: ${corpusChunkCount} chunks / ${corpusByteCount} bytes - UPSTREAM remediation preamble injected.`);
        const _prog0 = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
        _prog0?.(`Corpus is thin (${corpusChunkCount} chunks). Firing upstream wiki retrieval before drafting...`);
    }
    (context as any)._evidenceDensityPreamble = evidenceDensityPreamble;

    // 2026-05-24 NotebookLM uplift Wire 4: Multi-angle query decomposition
    // + cross-encoder reranking. Replaces single-pass retrieval with the
    // NotebookLM-grade pattern. Fires only for substantive questions
    // (length >= 24 chars + at least one of: ?, "how", "why", "what",
    // "explain", "compare"). Hashtag-driven chat skips this; hashtag
    // routes have their own retrieval.
    const isHashtagCommand = /(^|\s)#\w/.test(userMessage);
    const isSubstantiveQuestion = userMessage.length >= 24 && /[?]|how|why|what|explain|compare|when|where/i.test(userMessage);

    // Derive an in-memory chunk array from corpusText. The chat path receives
    // chunks as a joined string with [CHUNK_XXX] markers; we split on those
    // to reconstruct {id, body, source} records for keyword scoring.
    // ChatContext also accepts a pre-built corpusChunks array (untyped escape
    // hatch) if callers want to skip the parsing step.
    const preBuiltChunks = (context as any).corpusChunks as Array<{ id?: string; chunk_id?: string; body?: string; content?: string; text?: string; source?: string; sourceName?: string }> | undefined;
    const derivedChunks: Array<{ id: string; body: string; source: string }> = [];
    if (!preBuiltChunks && context.corpusText) {
        const chunkRegex = /\[CHUNK_([A-Z0-9_]+)\]([\s\S]*?)(?=\[CHUNK_[A-Z0-9_]+\]|$)/g;
        let match: RegExpExecArray | null;
        while ((match = chunkRegex.exec(context.corpusText)) !== null) {
            const id = `CHUNK_${match[1]}`;
            const body = match[2].trim();
            if (body.length < 20) continue;
            const sourceMeta = context.chunkMap?.[id];
            derivedChunks.push({ id, body, source: sourceMeta?.sourceName || '' });
        }
    }
    const corpusChunks = preBuiltChunks || derivedChunks;

    if (!isHashtagCommand && isSubstantiveQuestion && corpusChunks.length > 20) {
        try {
            const { plannedRetrieval } = await import('./chatQueryPlanner');
            const firstId = (corpusChunks[0] as any)?.id ?? (corpusChunks[0] as any)?.chunk_id ?? '';
            const corpusHash = String(corpusChunks.length) + '_' + firstId;
            // Build a retrieve() that scores against the in-memory corpus chunks
            const planResult = await plannedRetrieval({
                userMessage,
                corpusContext: (context.researchGoal || '').slice(0, 200),
                corpusHash,
                retrieve: async (query: string, k: number) => {
                    // Cheap keyword scoring as fallback retrieve (proxy-side
                    // embedding retrieval is preferred but adds latency on
                    // first chat turn - this delivers acceptable recall).
                    const queryTokenArr = query.toLowerCase().split(/\s+/).filter(t => t.length >= 4);
                    const queryTokenCount = queryTokenArr.length;
                    const scored = corpusChunks.map((c: any) => {
                        const text = (c.body || c.content || c.text || '').toLowerCase();
                        let score = 0;
                        for (let i = 0; i < queryTokenArr.length; i++) {
                            if (text.includes(queryTokenArr[i])) score += 1;
                        }
                        return { chunk_id: c.id || c.chunk_id, body: c.body || c.content || '', source: c.source || c.sourceName || '', score: score / Math.max(queryTokenCount, 1) };
                    });
                    return scored.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
                },
                kPerSubQuery: 8,
                keepTopAfterRerank: 12,
            });
            // Stash the reranked chunks on the context so downstream synthesis
            // sees the better top-k. Falls back gracefully if context lacks
            // the slot.
            (context as any)._plannedRetrieval = planResult;
            console.log(`[Chat Wire 4] multi-angle: ${planResult.plan.sub_queries.length} sub-queries → ${planResult.post_dedup_count} merged → ${planResult.final_count} reranked`);
        } catch (err: any) {
            // Non-blocking: if the planner fails, chat falls back to its
            // original single-shot retrieval. Surfaced in console only.
            console.warn('[Chat Wire 4] planned retrieval failed (non-fatal):', err?.message || err);
        }
    }

    // Skill matching: find relevant skills from manifest.
    // Load at MOST one content skill (research-deliverable) and ALWAYS load
    // every matching render-contract AND retrieval-enhancer skill alongside
    // it. Render contracts govern slide layout; retrieval enhancers teach
    // Claude how to exploit the semantic embedding layer (query variant
    // expansion, cross-encoder reranking, multi-angle synthesis).
    let skillContext: SkillContext | null = null;
    let renderContracts: SkillContext[] = [];
    let retrievalEnhancers: SkillContext[] = [];
    let qualityEnhancers: SkillContext[] = [];
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

        // 2026-05-19 - Quality enhancers auto-load via composes_with.
        // When a deliverable skill is the top content skill, walk its
        // composes_with array and pull every referenced quality skill into
        // the same system prompt. The user does NOT have to type extra
        // hashtags - every deliverable inherits its quality stack. One
        // LLM call carries all layered instructions (the quality skill
        // SKILL.md content gets concatenated into the prompt, not invoked
        // as a separate call), so cost stays ~prompt-token only.
        const composersToLoad = new Set<string>();
        for (const src of [topContentSkill, ...matchedContracts, ...matchedEnhancers]) {
            if (!src) continue;
            const composes = (src as any).composes_with as string[] | undefined;
            if (!Array.isArray(composes)) continue;
            for (const id of composes) {
                // Skip composers already loaded via direct keyword match -
                // no double-loading.
                if (id === topContentSkill?.id) continue;
                if (matchedContracts.find(s => s.id === id)) continue;
                if (matchedEnhancers.find(s => s.id === id)) continue;
                composersToLoad.add(id);
            }
        }
        if (composersToLoad.size > 0) {
            const composerSkills = context.skillManifest.filter(s => composersToLoad.has(s.id));
            if (composerSkills.length > 0) {
                qualityEnhancers = await Promise.all(composerSkills.map(loadSkillContext));
                console.log(`[chat] quality enhancers auto-loaded via composes_with: ${qualityEnhancers.map(c => c.skill.id).join(', ')}`);
            }
        }
    }

    // Phase 1-retrofit (2026-04-20) - WIKI PRE-FETCH. If the caller hasn't
    // already populated prefetchedArticlesBlock, best-effort pull the top
    // keyword-matching article bodies from the wiki archive. Non-blocking
    // by design: proxy outage or slow wiki returns an empty block and the
    // rest of the grounding context still carries the chat. Gated on the
    // user message having enough substance (≥12 chars) and no prior block
    // already present - keeps double-loading at zero.
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
            // 2026-05-20 - Pre-fetch budgets raised. Was limit:6 / 80KB total.
            // For a corpus with ~600 indexed chunks, 6 articles is a thin pre-roll
            // and the model would then have to spend turns on tool calls to fill
            // in the rest. New: 20 articles / 200KB block. Each turn now lands
            // ~3x more relevant evidence in front of the model BEFORE any
            // tool call is required, so artifacts answer denser even on
            // single-turn questions.
            const prefetchedArticles = await Promise.race([
                prefetchArticlesForMessage(userMessage, {
                    limit: 20, maxCharsPerArticle: 12_000, minChars: 500,
                    engagementGoal,
                    goalBlendWeight: 0.30,
                }),
                new Promise<any[]>(resolve => setTimeout(() => resolve([]), 8000)),
            ]);
            if (prefetchedArticles && prefetchedArticles.length > 0) {
                const block = formatArticlesAsCorpusBlock(prefetchedArticles, 200_000);
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
    // 2026-05-19 - Quality enhancers come AFTER retrieval enhancers so they
    // operate on top of the retrieval set the model just assembled. These
    // are auto-loaded via composes_with on the active content skill - the
    // user does NOT have to opt in. Source-ranker disciplines citation
    // diversity; contradiction-finder forces engagement with counter-
    // evidence; second-order-thinker deepens recommendations; slide-title-
    // lab governs slide titles. The instructions are concatenated INTO this
    // single generation call - zero extra LLM round-trips.
    for (const qe of qualityEnhancers) {
        skillInstructions += `
=== QUALITY ENHANCER (auto-loaded via composes_with): ${qe.skill.name} ===
The deliverable you are generating MUST internalize and apply the rules below.
These are not optional - they are quality gates the runtime enforces post-hoc
via slidePostProcessor + hic-output-qa. Applying them inline is cheaper than
having your output rejected and regenerated.
${qe.skillContent}
=== END QUALITY ENHANCER ===
`;
    }

    // 2026-05-11 - Topic-model summary block. Compact: cluster names,
    // sentiments, post counts, top terms, summaries. The model uses
    // query_topic_clusters(id_or_name) for representative-post deep dives.
    const topicModelBlock = buildTopicModelSummaryForPrompt(context);

    // Skill manifest summary (always present so the AI knows what's available)
    const manifestSummary = context.skillManifest?.length
        ? `\nAVAILABLE CONSULTING SKILLS (activate by requesting the output type):\n${context.skillManifest.filter(s => s.category === 'research-deliverable').map(s => `- ${s.name}: ${s.description}`).join('\n')}\n`
        : '';

    // 2026-05-11 - Wiki resource manifest. Compact directory of every
    // framework / anti-pattern / benchmark / methodology page available in
    // the wiki, one line each, ~70-150 tokens per entry. The model uses
    // fetch_wiki_resource(path) to load any of these on demand instead of
    // us pre-loading them all (which used to burn ~30-70KB per prompt).
    // Safe-fails to empty string if the proxy is unreachable.
    let wikiResourceManifest = '';
    try {
        const { renderWikiManifestForPrompt } = await import('./wikiService');
        const lines = await renderWikiManifestForPrompt();
        if (lines && lines.length > 50) {
            wikiResourceManifest = `\n=== WIKI RESOURCE MANIFEST (call fetch_wiki_resource(path) on demand) ===\n${lines}\n=== END MANIFEST ===\n`;
        }
    } catch (e) {
        console.warn('[chat] wiki manifest unavailable:', e);
    }

    // Compute per-source-type breakdown of the corpus so the model SEES what
    // it actually has access to. Counts by source-name patterns; not perfect
    // (some sources have ambiguous names) but accurate enough to enforce the
    // external-citation floor and surface diagnostics back to the user.
    const corpusBreakdown = computeCorpusSourceBreakdown(context);
    const categoryRoster = buildCategoryRoster(context);

    let systemPrompt = `You are a McKinsey-trained research intelligence analyst operating in the NXT Humans Chat-Driven Research Workbench.
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.
The research goal is: "${context.researchGoal}"

================================================================================
=== IRON LAW: USER-SELECTED SOURCES MUST BE USED ===
================================================================================

The user is an EXPERT RESEARCHER. Every source category in the list below was
toggled ON deliberately. The user has reasons - including pulling cross-industry
analogies, out-of-domain examples, and lateral evidence INTO the analysis. Your
job is to honor that selection, NOT second-guess it.

ABSOLUTE RULES:
1. Every source category the user toggled ON appears in the ACTIVE CATEGORIES
   roster below. Where a category HAS CONTENT, you should surface at least one
   citation from it when relevant.
2. Categories that yielded no usable content MUST be silently omitted from your
   response. NEVER write "CATEGORY GAP", "no content collected", "category
   omitted", or any other meta-narration about empty sources. The reader is an
   executive consuming a finished artifact - they should not see the model's
   notes about which buckets came back empty. Just write the deliverable from
   the evidence that IS available.
3. NEVER reason "this category seems off-topic" for categories that HAVE
   content - the user is an expert; if they toggled it and there's evidence,
   it's relevant.
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

=== ACTIVE CATEGORIES WITH CONTENT (cite from these when relevant) ===
${categoryRoster}
================================================================================

=== CORPUS SOURCE COMPOSITION ===
The corpus below contains content from MULTIPLE source types. Every type is
first-class evidence. You MUST cite from a balanced mix - not just uploads.

${corpusBreakdown.summary}

SOURCE-MIX DISCIPLINE (MANDATORY):
- Uploads (client-provided PDFs, interviews, internal docs) provide CONTEXT - the client's POV, their data, their stakeholder voices
- External sources (RSS articles, jina-reader web scrapes, YouTube transcripts, Reddit threads, OpenAlex/Crossref/Semantic Scholar papers, DOAJ open-access research) provide EVIDENCE - third-party validation, peer-institution comparisons, sector benchmarks
- ≥40% of citations in any analysis MUST come from non-upload external sources
- If your draft response leans >60% on uploads, you are FAILING the source-mix discipline - REVISE before delivering
- Citations from "Higher Ed Dive", "Inside Higher Ed", "Chronicle of Higher Education", "EdSurge", "Diverse Issues in Higher Ed", YouTube alumni-engagement transcripts, OpenAlex papers, and topical Reddit threads are FIRST-CLASS evidence - not optional padding
- For every theme/recommendation/persona, surface BOTH internal (upload) and external evidence - the convergence is the strategic insight

CITATION FORMAT (MANDATORY):
[SOURCE_NAME: "Article Title"]
Examples: [Higher Ed Dive: "Universities Struggle with Skills Gap"], [Reddit r/philanthropy: "nonprofit laid off staff due to funding cuts"], [YouTube: "Columbia Alumni Q&A - Donor Engagement Panel 2025"], [OpenAlex: Smith et al. 2024]

ANTI-HALLUCINATION RULES (STRICTLY ENFORCED):
- Answer ONLY from evidence that EXISTS in the corpus below. Do not invent, fabricate, or extrapolate.
- NEVER fabricate URLs. You may ONLY include a URL if it appears verbatim in the SOURCE PROVENANCE INDEX or the RAW RESEARCH CORPUS above. If no URL exists for a source, cite it by name only WITHOUT a URL.
- NEVER invent case studies, institutions, dollar amounts, percentages, or quotes that are not explicitly present in the corpus. If the corpus contains 3 case studies, you have 3 case studies - not 10.
- NEVER generate plausible-looking article URLs by pattern (e.g., highereddive.com/news/fake-slug/123456). A fabricated URL is worse than no URL.
- EVERY factual claim MUST include a [SOURCE_NAME: "Article Title"] citation matching an actual source in the provenance index.
- When quoting, use EXACT words from the corpus. Do not paraphrase and present it as a quote.
- If the corpus does not contain enough evidence to answer the question, say explicitly: "The collected data contains limited evidence on this topic. Here is what was found:" and cite ONLY what actually exists.
- When asked for "top N" or "N case studies", only provide as many as actually exist in the corpus. If only 4 exist, provide 4 - never pad to reach the requested number.

ON-DEMAND WIKI RETRIEVAL (function-calling - used by Gemini Pro on this branch):
You have the fetch_wiki_articles tool. The in-prompt corpus is always capped by the context window, but the WIKI ARCHIVE (hundreds of articles, transcripts, and documents) is queryable end-to-end via this tool. Call it BEFORE giving up on a claim, BEFORE using an article title as a quote, and BEFORE saying "the corpus is limited":

  - Asked for 3 verbatim quotes per theme? Call fetch_wiki_articles(query: <theme terms>, limit: 30) to pull 30 real bodies, then select the 3 best quotes. Synthesis tasks: use limit 40-60. Narrow factual lookups: 10-15.
  - Need a specific peer institution's outcome? Call fetch_wiki_articles(query: "<peer name> <topic>", source: "<outlet>") to retrieve the article body.
  - Building a case study slide? Call fetch_wiki_articles(query: "<subject> <vendor> <outcome>", kind: "article") to get the case study body, then write from it.
  - Never call more than 2-3 times per turn. Be specific in your queries.


TOPIC-MODELING RETRIEVAL (NEW 2026-05-11):
If a TOPIC CLUSTERS section appears in this system prompt, the engagement also ran a BERTopic-style clustering pass over the deep-Reddit corpus. Treat those clusters as FIRST-CLASS sources of insight: they represent coherent conversation patterns the embedding+clustering pipeline discovered, then a frontier LLM (Claude Opus) named and summarized. They are complementary to the manually-synthesized themes in the knowledge graph - the KG themes capture cross-source patterns; the topic clusters capture pure social-conversation patterns.

When building deliverables, ACTIVELY weave topic-cluster insights in alongside KG-theme evidence:
  - For personas: a cluster's representative posts are real verbatim voice. Pull them via query_topic_clusters.
  - For strategy decks / slides: cite cluster names ("Microsoft AI Tooling Excitement", "Advisor Conflicts and Burnout") as themes the social data surfaced, alongside KG themes the synthesis pipeline named.
  - For journey maps: negative clusters often map to pain-point stages; positive clusters to moments of truth.
  - For recommendations: cluster sentiment distribution is a forward-looking signal - a recommendation that addresses 3 negative clusters has stronger backing than one tied to a single anecdote.

Decision rule for which tool to call:
  - User asks about a specific TOPIC CLUSTER (named or numbered in the prompt above) → query_topic_clusters(topic_id_or_name) - pulls representative posts with scores, comment counts, subreddits
  - User asks an open-ended research question → fetch_wiki_articles (semantic search)
  - User asks for framework / anti-pattern / benchmark / brand standard → fetch_wiki_resource

DIVERSE-KIND RETRIEVAL (CRITICAL for source-mix discipline):
When retrieving evidence for a major claim, pull from MULTIPLE wiki kinds - not just uploads. The wiki has three kinds: \`article\` (RSS scrapes, jina-reader web extracts, OpenAlex papers, Reddit threads), \`transcript\` (YouTube alumni transcripts, interview transcripts), \`upload\` (client PDFs).
  - For evidence/data sections: call fetch_wiki_articles(query, kind: "article") to retrieve external research first.
  - For human voice / lived-experience sections: call fetch_wiki_articles(query, kind: "transcript") to retrieve YouTube + interview content.
  - For client-context sections only: call fetch_wiki_articles(query, kind: "upload") to retrieve client PDFs.
  - DEFAULT: omit \`kind\` so all three are returned, then select balanced evidence across all of them.
If your draft answer cites only uploads, that is a violation of source-mix discipline - make additional retrievals with kind="article" and kind="transcript" before responding.

When tool results return empty or error, the archive genuinely doesn't have evidence for that claim - narrow your answer to what IS evidenced, or tell the user plainly which dimension lacks coverage in conversational prose. Do NOT fabricate. NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", or any QA-style annotation in any chat response, deliverable artifact, slide, persona, or other user-facing output. The reader is the user - not a QA dashboard.
${DELIVERABLE_PROTOCOL}
${manifestSummary}
${wikiResourceManifest}
${topicModelBlock}
${skillInstructions}
${provenanceIndex ? `=== SOURCE PROVENANCE INDEX (${context.sourceReferences?.length || 0} sources) ===\n${provenanceIndex}\n=== END PROVENANCE ===\n` : ''}

${groundingContext}

=== LENGTH & DEPTH DISCIPLINE (re-read before responding) ===
Match the OUTPUT SIZE to what the user actually requested. Common signals:

  • "manual" / "specification" / "technical guide" / "playbook" → 4000-12000+ words.
    Multi-section document with named chapters, working code blocks (not toy
    snippets), table-of-contents-worthy structure. Each section gets several
    full paragraphs plus concrete artifacts (config files, API examples,
    architecture diagrams in ASCII, runnable bash/Python/TypeScript).

  • "N page" or "N words" or "comprehensive" or "exhaustive" or "deep dive" or
    "detailed" → respect the stated target. A 25-page manual is ~6250-7500 words
    (250-300 words/page). Don't ship 2000 words and call it a manual.

  • "ALL technical details" / "ALL [X]" / "everything we know about" → enumerate
    exhaustively. List every model, every technique, every protocol, every
    library, every command that appears in the corpus. Do not summarize - list.

  • "code snippets where appropriate" / "show me how" / "with examples" → include
    actual runnable code in fenced blocks, not pseudocode. Show config files,
    API requests with full JSON, install commands, complete function bodies.
    Default to 3-8 code blocks per technical section.

  • "brief" / "tl;dr" / "in 200 words" / single-question conversational turn →
    stay tight. Don't pad. Match the requested register.

When the user requests a long deliverable, DO NOT produce a thin citation-stuffed
outline. Citations are evidence for claims - they are not the deliverable. The
deliverable is the document the user asked for, written end-to-end, with citations
woven in to support specific claims. A "technical manual" reads like a manual, not
like an annotated bibliography.

EXPANSION DISCIPLINE for long-form requests:
  - Every section should have multiple substantive paragraphs of actual content
  - Every claim that depends on the corpus should cite [Source: Title]
  - Code blocks should be complete and runnable, not "// implement this"
  - Lists should be exhaustive when "all" or "every" is requested, not truncated
  - If you have evidence for 20 techniques, list 20 - not 5 with "and more"

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
       → The knowledge graph is already populated automatically - you don't need
         to force cards just because the user asked about personas or themes.
       → For long-form requests (manual / specification / technical guide / N-page /
         comprehensive / detailed / "ALL"), apply the LENGTH & DEPTH DISCIPLINE above.

If none of triggers 1-3 are present, mode 4 (prose) is the answer. Do not guess.
If triggers are ambiguous (e.g., user mentions "slides" in prose without #slide), stay in prose mode and OFFER to produce slides: "Add #slide if you'd like these formatted as slides."

=== ANTI-HALLUCINATION REMINDER (re-read before responding) ===
BEFORE including any URL in your response, verify it exists VERBATIM in the SOURCE PROVENANCE INDEX above. If you cannot find the exact URL, DO NOT include one - cite by source name only.
BEFORE stating any statistic, dollar amount, or percentage, verify the EXACT number appears in the corpus text above. If you cannot find it, do not state it.
BEFORE quoting anyone, verify the EXACT words appear in the corpus. If you cannot find the quote, paraphrase and label it as a paraphrase.
If asked for N examples and the corpus only contains M < N, provide M and say "The corpus contains M examples on this topic."
=== END REMINDERS ===`;

    try {
        // 2026-05-11 (HiC-Active-Loop #4) - stash the KG for the
        // query_knowledge_graph tool. Set early so any tool-loop iteration
        // can reach it. Cleared in the finally block at the end.
        setCurrentChatGraph((context as any)?.knowledgeGraph || null);
        // 2026-05-11 - stash topic-model result for query_topic_clusters.
        setCurrentChatTopicModel((context as any)?.topicModelResult || null);

        // Determine thinking effort from skill or default
        const thinkingEffort: ThinkingEffort = skillContext?.skill.thinkingEffort || 'medium';

        // 2026-05-11 (HiC-Active-Loop #3) - PreCompact mid-session.
        // Before dispatching the new message, check if the history is large
        // enough to risk Context Representation Drift. If so, summarize the
        // older turns into a single digest and replace them. Recent turns
        // (>= 10) stay intact for short-term continuity.
        try {
            const { shouldCompactHistory, buildCompactionPrompt, buildCompactionMessage } = await import('./preCompact');
            // Use the active model's context window as the budget cap. Gemini
            // 3.1 Pro = 1M tokens; DeepSeek V4 Flash = 256K; Council uses the
            // synthesizer's window (Gemini Pro).
            const activeWindow = (() => {
                const id = (model === 'council') ? 'gemini-3.1-pro-preview' : model;
                const cfg = AVAILABLE_MODELS.find(m => m.id === id);
                if (!cfg) return 256_000;
                if (cfg.contextWindow.includes('1M')) return 1_000_000;
                if (cfg.contextWindow.includes('256K')) return 256_000;
                if (cfg.contextWindow.includes('128K')) return 128_000;
                return 128_000;
            })();
            const decision = shouldCompactHistory(conversationHistory, activeWindow);
            if (decision.shouldCompact) {
                console.log(`[chat.precompact] ${decision.reason} - summarizing ${decision.olderCount} older turns, keeping ${decision.keepRecentCount} recent`);
                const olderTurns = conversationHistory.slice(0, decision.olderCount);
                const recentTurns = conversationHistory.slice(decision.olderCount);
                // Summarize via Gemini Pro - fast, reliable, follows structure.
                const summarizerPrompt = buildCompactionPrompt(olderTurns, context.researchGoal || '');
                let digest = '';
                try {
                    digest = await callGemini(
                        'You are a precise session digester. Follow the format exactly.',
                        summarizerPrompt,
                        [],
                        'gemini-3.1-pro-preview',
                    );
                } catch (digestErr) {
                    console.warn('[chat.precompact] summarization failed, skipping compaction:', digestErr);
                }
                if (digest && digest.length > 200) {
                    const digestMsg = buildCompactionMessage(digest, olderTurns.length);
                    conversationHistory = [digestMsg, ...recentTurns];
                    console.log(`[chat.precompact] compacted to ${conversationHistory.length} turns`);
                }
            }
        } catch (compactErr) {
            console.warn('[chat.precompact] non-fatal error:', compactErr);
        }

        let responseText: string;
        let modelConfig = AVAILABLE_MODELS.find(m => m.id === model);
        // 2026-05-07 - Defensive: if the requested model isn't registered
        // (stale localStorage from legacy DeepSeek-only era, removed entry,
        // etc.), fall back to Gemini 3.1 Pro and warn.
        let activeModelId: string = model;
        if (!modelConfig) {
            const fallback = AVAILABLE_MODELS.find(m => m.id === 'gemini-3.1-pro-preview') || AVAILABLE_MODELS[0];
            if (!fallback) throw new Error('No chat models registered - AVAILABLE_MODELS is empty');
            console.warn(`[chat] Requested model ${JSON.stringify(model)} is not in AVAILABLE_MODELS; falling back to ${fallback.id}`);
            modelConfig = fallback;
            activeModelId = fallback.id;
        }

        // 2026-06-01 - HARD SLIDE-MODE GATE. The prose contract relies on the
        // model noticing "#slide"; users type "#slides" (plural) paired with a
        // deliverable directive (#personas / #themes / ...). Literal models then
        // answered "create personas" as MARKDOWN PROSE instead of emitting
        // :::slide persona-card blocks (the renderer only draws cards from
        // :::slide fences, so the user saw raw ###/>/* markdown). Enforce the
        // contract at the code level so it cannot be argued away by the model.
        if (/#slides?\b/i.test(userMessage)) {
            const tplHint =
                /#personas?\b/i.test(userMessage) ? 'persona-card'
              : /#themes?\b/i.test(userMessage) ? 'theme-cluster'
              : /(#recommendations?|#recs?)\b/i.test(userMessage) ? 'recommendation'
              : /#compet/i.test(userMessage) ? 'competitive-matrix'
              : /#case/i.test(userMessage) ? 'case-study'
              : /#road/i.test(userMessage) ? 'timeline'
              : '(pick the template that best matches the content)';
            const brandHint = /#nu\b/i.test(userMessage) ? 'nu' : 'nxt';
            systemPrompt += `\n\n========================================================================\nSLIDE MODE IS ACTIVE - the user's message contains #slide/#slides. You MUST respond with one or more :::slide fenced blocks per the SLIDE OUTPUT PROTOCOL above. Default template for THIS request: ${tplHint}; brand=${brandHint}. HARD RULES: (1) NEVER answer in markdown prose - no ###, no >, no * bullets; the renderer only draws cards from :::slide fences, so prose renders as raw markdown slop. (2) If the user named a count ("5 #personas", "8 #themes"), produce that many items - theme-cluster packs up to 4 themes per block, so 8 themes = 2 blocks. (3) Every slide's JSON must be valid and match the declared template schema.\n========================================================================`;
        }

        // 2026-05-07 - Multi-provider dispatch. Gemini 3.1 Pro is primary;
        // DeepSeek retained only as a legacy fallback.
        // 2026-05-11 - Council mode (Sanhedrin) fans the prompt to 3 models
        // in parallel and synthesizes. Caller opted in by selecting 'council'.
        if (activeModelId === 'council') {
            const { runCouncilSynthesis } = await import('./councilSynthesis');
            // Dispatch shim: each council reader runs through its provider's
            // normal call path so it inherits the same system prompt, tool
            // schema, and corpus context the user already configured.
            const sendOne = async (m: ChatModel, msg: string, hist: ChatMessage[]) => {
                if (m === 'gemini-3.1-pro-preview') return callGemini(systemPrompt, msg, hist, m);
                if (m === 'deepseek-v4-flash' || m === 'deepseek-v4-pro') return callDeepSeek(systemPrompt, msg, hist, m);
                if (m === 'gpt-5.5') return callOpenAI(systemPrompt, msg, hist, m);
                // Default - Gemini Pro
                return callGemini(systemPrompt, msg, hist, 'gemini-3.1-pro-preview');
            };
            const council = await runCouncilSynthesis({
                userMessage,
                history: conversationHistory,
                context,
                sendOne,
            });
            console.log(`[council] confidence=${council.confidence}, reads=${council.reads.filter(r => r.ok).length}/3, synth=${council.synthesisLatencyMs}ms`);
            responseText = council.finalText;
        } else if (modelConfig.provider === 'google') {
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else if (modelConfig.provider === 'deepseek') {
            responseText = await callDeepSeek(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else if (modelConfig.provider === 'openai') {
            responseText = await callOpenAI(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else {
            // (provider 'anthropic' - not currently registered, retained for future)
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory, activeModelId);
        }

        // Defense-in-depth: strip any leaked QA-annotation tokens
        // ("EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]") from
        // the chat reply before it's rendered. Prompts forbid these tokens;
        // this layer guarantees they never reach the user.
        try {
            const { stripQAAnnotations, stripFormatTells } = await import('./slidePostProcessor');
            // 2026-05-27 - Render bare deliverable-JSON replies (#prd / #gap /
            // #persona / #audit / #compete / #strategy / #case-study skill
            // outputs) into clean markdown prose and strip leaked [CHUNK_XXX]
            // markers. No-op for prose, tables, and fenced structured output.
            responseText = renderDeliverableJsonReply(responseText);
            responseText = stripQAAnnotations(responseText);
            // 2026-05-26 - Em-dash hard-ban per .claude/CLAUDE.md ("Format
            // Tells"). 2026-05-27 - extended to a HARD emoji ban too via
            // stripFormatTells (em-dash + emoji). Chat replies were letting
            // "data-including" and model emoji ("Pong! ") reach users.
            // Applied unconditionally; ASCII hyphens + layout glyphs untouched.
            responseText = stripFormatTells(responseText);
        } catch (e) { /* non-blocking */ }

        // 2026-05-26 - Surface unknown / fuzzy-promoted hashtag notices to the
        // user. Two cases:
        //   1) fuzzyPromoted - the directive WAS resolved via prefix match.
        //      Tell the user what we routed to so they can correct next time.
        //   2) unknownHashtags - no resolution found. Suggest closest match.
        // Both are emitted as plain-text leaders above the response so the
        // analyst sees the routing decision without reading logs.
        const notices: string[] = [];
        if (fuzzyPromoted.length > 0) {
            notices.push(
                '[Routed]: ' + fuzzyPromoted.map(p => `${p.typed} → ${p.resolved}`).join(' · ')
            );
        }
        if (unknownHashtags.length > 0) {
            try {
                const { searchDirectives } = await import('./hashtagRegistry');
                const suggestions = unknownHashtags
                    .map(h => {
                        const guesses = searchDirectives(h.replace(/^#/, ''), 1);
                        return guesses.length > 0 ? `${h} → did you mean ${guesses[0].id}?` : `${h} (unknown)`;
                    })
                    .join(' · ');
                notices.push(`[Unknown directive]: ${suggestions}`);
            } catch (e) { /* non-blocking */ }
        }
        if (notices.length > 0) {
            responseText = notices.join('\n') + '\n\n' + responseText;
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
// 2026-05-26 - Wall-clock budget for chat tool loops. Caps the worst-case
// at 3 minutes per turn (vs the 23-min case-study wait we observed during
// pipeline contention). When the budget is exceeded, the loop short-circuits
// and finalizes with whatever evidence was gathered so far. Quality preserved
// because 3 min of well-grounded retrieval beats 23 min of redundant tool
// calls hitting the same articles. Per-provider override possible if needed.
const MAX_TOOL_WALLCLOCK_MS = 180_000;
const TOOL_CALL_TIMEOUT_MS = 18_000;

const FETCH_WIKI_ARTICLES_TOOL = {
    name: 'fetch_wiki_articles',
    description: `Retrieve FULL article bodies from the wiki archive on demand. Use this to pull verbatim text for quotes, specific data points, named entities, or any claim that needs body evidence.

The archive contains every article, transcript, and uploaded document collected during this research session. When the in-prompt corpus shows only headlines or snippets for a topic, CALL THIS TOOL to get the real body text.

Good times to call:
  - The user asked for N verbatim quotes and you only see article titles in the in-prompt corpus
  - You're about to omit a claim because the prompt didn't include body text - try a retrieval first
  - You need to cite a specific named competitor, case study, or peer institution
  - You need timestamped or dated text (transcripts, news articles)

Returns: array of articles with title, source, url, date, and body text (up to maxCharsPerArticle chars each). Never returns titles-only.`,
    input_schema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Keyword search over article titles + summaries + sources. Use 3-8 concrete terms - names, entities, topics. Example: "Wyoming EverTrue donor experience revenue"' },
            ids: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL: specific article IDs (10-char url_hash values from the WIKI ARCHIVE MENU). Use this when you already know which articles you want.' },
            wikiPaths: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL: direct wiki paths (e.g. "articles/higher-ed-dive/ab12cd34ef.md"). Rarely needed; prefer ids or query.' },
            source: { type: 'string', description: 'OPTIONAL: substring filter on source name. Example: "Higher Ed Dive", "Reddit r/MBA", "EverTrue"' },
            kind: { type: 'string', enum: ['article', 'transcript', 'upload'], description: 'OPTIONAL: restrict to articles, YouTube transcripts, or uploaded client documents.' },
            minChars: { type: 'number', description: 'OPTIONAL: skip entries shorter than this many body chars. Default 500 (filters out archive stubs).' },
            limit: { type: 'number', description: 'Max articles to return. Default 25, hard max 80. Use 40-60 for synthesis tasks that need broad evidence coverage; 10-15 for narrow factual lookups.' },
            maxCharsPerArticle: { type: 'number', description: 'Max body chars per article. Default 12000, hard max 20000.' },
        },
    },
};

// 2026-05-11 - Companion tool to fetch_wiki_articles. Articles are
// research evidence (Reddit threads, RSS bodies, YouTube transcripts,
// uploaded PDFs). Resources are structured wiki pages (frameworks,
// anti-patterns, benchmarks, methodologies, brand standards, exemplars).
// They live in different parts of the wiki and have different shapes;
// keeping them on separate tools makes the model's intent explicit.
const FETCH_WIKI_RESOURCE_TOOL = {
    name: 'fetch_wiki_resource',
    description: `Read a specific wiki resource (framework, anti-pattern, benchmark, methodology, brand standard, exemplar, social-intelligence page, deep-research page, industry adaptation) on demand.

Use this for STRUCTURED reference content - NOT for research articles. For article bodies, transcripts, or uploaded documents, use fetch_wiki_articles instead.

The system prompt includes a WIKI MANIFEST listing every fetchable path with a 1-line summary. Call this tool with one of those exact paths. Common patterns:
  - You need the full framework spec for a deliverable: fetch_wiki_resource(path: "frameworks/PERSONAS.md")
  - You need named anti-patterns to avoid: fetch_wiki_resource(path: "anti-patterns/STRATEGY_DECK.md")
  - You need benchmark numbers to cite: fetch_wiki_resource(path: "benchmarks/cx-metrics.md")
  - You need methodology details to explain provenance: fetch_wiki_resource(path: "methodologies/research-fabric.md")

The tool returns the full markdown body. Paths NOT in the manifest are rejected.`,
    input_schema: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Exact wiki path from the manifest. Example: "frameworks/PERSONAS.md"' },
        },
        required: ['path'],
    },
};

// 2026-05-11 - Topic-modeling awareness for the chat. Compact summary
// goes into the system prompt; deep dives into individual clusters use the
// query_topic_clusters tool below. The model needs BOTH - the summary so
// it knows topics exist and can reference them by name in deliverables,
// the tool so it can pull representative posts when synthesizing depth.

function buildTopicModelSummaryForPrompt(ctx: ChatContext): string {
    const tm = ctx.topicModelResult;
    if (!tm || !tm.topics || tm.topics.length === 0) return '';
    const lines: string[] = [];
    lines.push(`=== TOPIC CLUSTERS FROM REDDIT-DEEP CORPUS (${tm.topic_count} topics, ${tm.doc_count} posts, ${tm.noise_count} noise) ===`);
    lines.push(`These clusters were discovered by BERTopic-style analysis (Gemini embeddings → UMAP → HDBSCAN → LLM-named). Each represents a coherent conversation pattern in the Reddit data the user pulled. Cite cluster names verbatim in deliverables - they are LLM-synthesized labels of real discussion clusters, not your own taxonomy.`);
    lines.push('');
    // Group by sentiment for fast scanning
    const bySent = new Map<string, typeof tm.topics>();
    for (const t of tm.topics) {
        const s = (t.sentiment || 'neutral').toLowerCase();
        if (!bySent.has(s)) bySent.set(s, []);
        bySent.get(s)!.push(t);
    }
    const sentimentOrder = ['negative', 'positive', 'neutral', 'mixed'];
    for (const sent of sentimentOrder) {
        const topics = bySent.get(sent);
        if (!topics || topics.length === 0) continue;
        lines.push(`### ${sent.toUpperCase()} (${topics.length} clusters)`);
        for (const t of topics) {
            const terms = (t.top_terms || []).slice(0, 6).map(([w]) => w).join(', ');
            const summary = (t.summary || '').trim();
            lines.push(`  • [Topic #${t.id}] "${t.name}" - ${t.post_count} posts | terms: ${terms}`);
            if (summary) lines.push(`    ${summary.slice(0, 240)}`);
        }
        lines.push('');
    }
    lines.push('To pull representative posts from a specific cluster (full titles, scores, subreddits, comment counts), call query_topic_clusters(topic_id_or_name).');
    lines.push('=== END TOPIC CLUSTERS ===');
    return lines.join('\n');
}

const QUERY_TOPIC_CLUSTERS_TOOL = {
    name: 'query_topic_clusters',
    description: `Drill into a specific Reddit topic cluster discovered by the Analyst Desk's topic-modeling pass. Returns the representative posts (titles, scores, subreddits, comment counts, URLs) for the requested cluster.

Use this when you need:
  - Specific post titles to quote from a named cluster ("show me the actual posts in the 'Advisor Conflicts and Burnout' cluster")
  - Subreddit distribution within a cluster (where the conversation is happening)
  - Top-scoring posts for evidence in a slide or persona

The cluster ID is the integer shown in the TOPIC CLUSTERS section of your system prompt (e.g., [Topic #3]). Alternatively, pass the cluster's name verbatim and we'll match. The summary, top terms, and sentiment are ALREADY in your system prompt - this tool returns the underlying posts only.`,
    input_schema: {
        type: 'object',
        properties: {
            topic_id: { type: 'number', description: 'Integer cluster id (preferred - exact match)' },
            topic_name: { type: 'string', description: 'Cluster name (case-insensitive substring match if topic_id is omitted)' },
            limit: { type: 'number', description: 'Max posts to return. Default 10, max 30.' },
        },
    },
};

let _currentChatTopicModel: ChatContext['topicModelResult'] | null = null;
function setCurrentChatTopicModel(tm: any) { _currentChatTopicModel = tm; }

async function executeQueryTopicClustersTool(input: any): Promise<string> {
    try {
        const tm = _currentChatTopicModel;
        if (!tm || !tm.topics?.length) {
            return '(topic modeling has not run on this engagement - no clusters available)';
        }
        const requestedId = typeof input?.topic_id === 'number' ? input.topic_id : null;
        const requestedName = String(input?.topic_name || '').trim().toLowerCase();
        const limit = Math.max(1, Math.min(30, Number(input?.limit) || 10));

        let topic = null as null | (typeof tm.topics)[number];
        if (requestedId !== null) {
            topic = tm.topics.find(t => t.id === requestedId) || null;
        } else if (requestedName) {
            topic = tm.topics.find(t => t.name.toLowerCase().includes(requestedName)) || null;
        } else {
            return '(error: pass topic_id or topic_name)';
        }
        if (!topic) {
            const choices = tm.topics.map(t => `  #${t.id} "${t.name}"`).join('\n');
            return `No cluster matched. Available clusters:\n${choices}`;
        }

        const docs = (tm.documents || []).filter(d => d.cluster === topic!.id);
        const sortedDocs = [...docs].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);

        const lines: string[] = [];
        lines.push(`Cluster #${topic.id}: "${topic.name}"`);
        lines.push(`Sentiment: ${topic.sentiment} · ${topic.post_count} posts · top terms: ${topic.top_terms.slice(0, 6).map(t => t[0]).join(', ')}`);
        if (topic.summary) lines.push(`Summary: ${topic.summary}`);
        lines.push('');
        lines.push(`--- Top ${sortedDocs.length} posts by score ---`);
        for (const d of sortedDocs) {
            lines.push(`  [${d.score}↑ · ${d.num_comments} comments · r/${d.subreddit}] ${d.title}`);
            if (d.url) lines.push(`    ${d.url}`);
        }
        // Subreddit distribution
        const subMap = new Map<string, number>();
        for (const d of docs) {
            const k = d.subreddit || '?';
            subMap.set(k, (subMap.get(k) || 0) + 1);
        }
        if (subMap.size > 0) {
            lines.push('');
            lines.push('Subreddit distribution:');
            for (const [sub, n] of Array.from(subMap.entries()).sort((a, b) => b[1] - a[1])) {
                lines.push(`  r/${sub} × ${n}`);
            }
        }
        return lines.join('\n');
    } catch (err: any) {
        return `(error querying topic clusters: ${err?.message || 'unknown error'})`;
    }
}

// 2026-05-11 (HiC-Active-Loop #4) - Knowledge-graph-as-retrieval tool.
// The KG nodes are already constructed at synthesis time (themes, evidence,
// sources, personas, recommendations, gaps, journey stages). Letting the
// chat model query the graph directly is graph-RAG: pin to a hub node,
// walk N hops, return the connected subgraph with evidence body excerpts.
// Cheaper than full-corpus semantic search when the question has an
// obvious entrypoint; more accurate than embedding-only retrieval because
// the relationships were assembled by the upstream synthesis, not inferred.
const QUERY_KG_TOOL = {
    name: 'query_knowledge_graph',
    description: `Walk the engagement's knowledge graph from a seed term. Returns the connected subgraph (themes, evidence, sources, personas, recommendations, gaps) up to N hops out.

Use this when the user asks about a SPECIFIC theme, persona, source, or finding that you already know exists in the engagement. The KG was built by the synthesis pipeline and contains explicit relationships the model can walk.

Good times to call:
  - "What evidence supports the X theme?" → query_knowledge_graph(seed: "X", hops: 2) returns the theme + its linked evidence + the sources those evidence pieces came from
  - "Which themes did r/CareerAdvice drive?" → query_knowledge_graph(seed: "CareerAdvice", hops: 2)
  - "What recommendations address the donor-ghosting gap?" → query_knowledge_graph(seed: "ghosting", hops: 2)

Returns the connected nodes (with evidence body excerpts) + edges. Falls back gracefully when the seed has no match - use fetch_wiki_articles for free-text searches instead.`,
    input_schema: {
        type: 'object',
        properties: {
            seed: { type: 'string', description: 'A theme name, persona name, source name, or topic term. Case-insensitive substring match. Example: "ghosting", "first-year readiness", "Higher Ed Dive".' },
            hops: { type: 'number', description: 'How many graph hops to expand from the seed. 1 = direct neighbors only (fast, focused). 2 = neighbors-of-neighbors (DEFAULT - typical theme→evidence→source path). 3 = wide (use sparingly).' },
            maxNodes: { type: 'number', description: 'Cap on returned nodes. Default 25, max 60. Lower for tight focused queries.' },
        },
        required: ['seed'],
    },
};

let _currentChatGraph: any = null;

/** Stash the current engagement's knowledge graph so the tool executor can
 *  reach it. Called at the top of sendChatMessage from the context. */
function setCurrentChatGraph(graph: any) { _currentChatGraph = graph; }

/** Execute query_knowledge_graph via the kgRetrieval helper. */
async function executeQueryKGTool(input: any): Promise<string> {
    try {
        const seed = String(input?.seed || '').trim();
        if (!seed) return '(error: seed is required)';
        if (!_currentChatGraph || !_currentChatGraph.nodes?.length) {
            return '(knowledge graph not yet built for this engagement - use fetch_wiki_articles or fetch_wiki_resource instead)';
        }
        const { queryKnowledgeGraph, renderKGResult } = await import('./kgRetrieval');
        const result = queryKnowledgeGraph(_currentChatGraph, seed, {
            hops: Number(input?.hops) || 2,
            maxNodes: Number(input?.maxNodes) || 25,
            includeBodies: true,
        });
        return renderKGResult(result);
    } catch (err: any) {
        return `(error querying knowledge graph: ${err?.message || 'unknown error'})`;
    }
}

/** Execute fetch_wiki_resource via the wikiService helper. */
async function executeFetchWikiResourceTool(input: any): Promise<string> {
    try {
        const path = String(input?.path || '').trim();
        if (!path) return '(error: path is required)';
        const { fetchWikiResourceByPath } = await import('./wikiService');
        const result = await fetchWikiResourceByPath(path);
        if (!result.ok) return `(error: ${result.error || 'fetch failed'})`;
        const body = result.content || '';
        const header = `Path: ${result.path}\nTitle: ${result.title || '(untitled)'}\nBytes: ${body.length}\n\n---\n\n`;
        // Cap at 20KB per resource to prevent any single page from
        // monopolizing the model's working context.
        return header + body.slice(0, 20_000);
    } catch (err: any) {
        return `(error fetching wiki resource: ${err?.message || 'unknown error'})`;
    }
}

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
            // 2026-05-20 - Budgets raised. Old: default 5, hard max 15,
            // max chars 8K. Across 3 tool calls that's ~45 articles max from
            // a 600-chunk corpus - chat-composed decks were citing 5-8% of
            // the indexed evidence and the user could see the gap. New:
            // default 25 / hard max 80 / 12K chars per body. Proxy ceiling
            // is 250 chunks; we're still well under it for any single call.
            articles = await fetchWikiArticles({
                ids: Array.isArray(input?.ids) ? input.ids.slice(0, 80) : undefined,
                wikiPaths: Array.isArray(input?.wikiPaths) ? input.wikiPaths.slice(0, 80) : undefined,
                query: typeof input?.query === 'string' ? input.query : undefined,
                source: typeof input?.source === 'string' ? input.source : undefined,
                kind: typeof input?.kind === 'string' ? input.kind : undefined,
                minChars: typeof input?.minChars === 'number' ? input.minChars : 500,
                limit: Math.max(1, Math.min(80, Number(input?.limit) || 25)),
                maxCharsPerArticle: Math.max(500, Math.min(20_000, Number(input?.maxCharsPerArticle) || 12000)),
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

// 2026-05-03 - callAnthropic / Anthropic chat path removed on this branch
// (HiC-Gemini-Primary). The primary dispatch is still callGemini / callOpenAI
// / callDeepSeek through sendChatMessage; Anthropic is NOT a primary chat
// option in the UI. But see the 2026-05-27 escape below - Claude is the
// FUNDED cross-provider finalize when any primary exhausts.

// =================================================================
// 2026-05-27 - Cross-provider Claude finalize escape (Issue 10 fix)
// =================================================================
// Architectural rule (per the user's directive): NO chat helper should die
// from a single-provider failure. When the primary provider's retry budget
// is exhausted (insufficient_quota / 429-after-retries / Azure content_filter
// / persistent 5xx), the chat helper hands the current conversation + any
// tool results gathered so far to Claude Sonnet 4.6 for a final synthesis
// (no further tool calls).
//
// Claude is the ONLY funded cross-provider escape on this platform. The
// ANTHROPIC_API_KEY is the platform's primary required key (journey-mapper
// runs claude-opus-4-8 on it); GPT is registered as a chain alternative but
// is currently dry (insufficient_quota). DeepSeek is Azure content-filter-
// prone on this corpus and unreliable as a backup.
//
// Composes with deliverableModelRouter (deliverable path) + multiModelResilience
// (provider health tracker). Mirrors that pattern for the chat path.

function _isExhaustionError(e: unknown): boolean {
    const msg = String((e as any)?.message || e || '');
    // Match the friendly strings callAIWithRetry emits on exhaustion + raw
    // provider errors that propagate through. Covers OpenAI/Azure quota,
    // Gemini "Resource exhausted", DeepSeek/Azure content_filter, persistent
    // 5xx after retries, and the model-router "all models exhausted".
    return /insufficient[_ ]?quota|HTTP 429|rate.?limit|resource exhausted|quota exhausted|content[_ ]?filter|ResponsibleAI|block action|HTTP 50[234]|gateway error|temporarily overloaded|after \d+ attempts|all models exhausted|DeepSeek fallback \d{3}/i.test(msg);
}

interface _ChatMsgLike {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    tool_call_id?: string;
    name?: string;
}

async function _finalizeChatViaClaude(
    system: string,
    messagesSoFar: _ChatMsgLike[],
    primaryProviderLabel: string,
): Promise<string> {
    const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
    _prog?.(`${primaryProviderLabel} exhausted - switching to Claude Sonnet 4.6...`);
    console.warn(`[chat.failover] ${primaryProviderLabel} exhausted; finalizing via Claude Sonnet 4.6 with ${messagesSoFar.length} accumulated messages`);

    // Translate OpenAI-shape messages -> Anthropic Messages API shape.
    // System goes in the top-level `system` field (NOT a role). Tool calls +
    // results collapse into synthetic user/assistant text turns so Claude
    // has the evidence without needing to invoke tools itself.
    type _AnthMsg = { role: 'user' | 'assistant'; content: string };
    const anthMessages: _AnthMsg[] = [];
    const toolNameById = new Map<string, string>();

    for (const m of messagesSoFar) {
        if (m.role === 'system') continue; // top-level field
        if (m.role === 'user') {
            anthMessages.push({ role: 'user', content: m.content || '' });
            continue;
        }
        if (m.role === 'assistant') {
            const parts: string[] = [];
            if (typeof m.content === 'string' && m.content.trim()) parts.push(m.content.trim());
            if (Array.isArray(m.tool_calls) && m.tool_calls.length) {
                for (const tc of m.tool_calls) {
                    toolNameById.set(tc.id, tc.function.name);
                    parts.push(`[Called tool ${tc.function.name}(${(tc.function.arguments || '').slice(0, 200)})]`);
                }
            }
            anthMessages.push({ role: 'assistant', content: parts.join('\n') || '(thinking)' });
            continue;
        }
        if (m.role === 'tool') {
            const toolName = m.name || (m.tool_call_id && toolNameById.get(m.tool_call_id)) || 'tool';
            const body = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
            // Tool results are conveyed as a user turn carrying the retrieved data.
            anthMessages.push({
                role: 'user',
                content: `[Result from ${toolName}]\n${body.slice(0, 12000)}`,
            });
            continue;
        }
    }

    // Final instruction so Claude synthesizes rather than asks for more data.
    anthMessages.push({
        role: 'user',
        content: 'All data gathering is complete. Provide your final answer now, using the evidence above. Do not request additional tools or data.',
    });

    // Anthropic requires alternating user/assistant. Merge consecutive same-role
    // turns by concatenating their content (the tool-result + final-instruction
    // case produces consecutive user turns).
    const merged: _AnthMsg[] = [];
    for (const am of anthMessages) {
        const prev = merged[merged.length - 1];
        if (prev && prev.role === am.role) {
            prev.content = `${prev.content}\n\n${am.content}`;
        } else {
            merged.push({ role: am.role, content: am.content });
        }
    }
    if (merged.length === 0 || merged[0].role !== 'user') {
        // Anthropic requires the first message to be 'user'.
        merged.unshift({ role: 'user', content: 'Please answer using the evidence already retrieved above.' });
    }

    const { callAIWithRetry } = await import('./aiRetryClient');
    const data: any = await callAIWithRetry('anthropic', {
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system,
        messages: merged,
        temperature: 0.2,
    }, {
        label: `Chat (Claude finalize after ${primaryProviderLabel})`,
        maxAttempts: 2,
    });

    const blocks = Array.isArray(data?.content) ? data.content : [];
    const text = blocks
        .map((b: any) => (typeof b?.text === 'string' ? b.text : ''))
        .join('')
        .trim();
    if (!text) {
        throw new Error(`Claude finalize returned empty content after ${primaryProviderLabel} exhausted (stop_reason=${data?.stop_reason || 'unknown'})`);
    }
    _prog?.(`Claude Sonnet 4.6 finalized.`);
    return text;
}

// 2026-05-04 - Both call paths now respect the user's model selection AND
// implement a fetch_wiki_articles tool-loop. The previous versions hardcoded
// 'gpt-5.4' / 'gemini-2.5-flash' (silently bypassing the picker) and lacked
// the tool registration entirely (the system prompt told the model to call
// fetch_wiki_articles but the function was never declared, causing
// hallucinations and "EVIDENCE GAP" placeholders).

// 2026-05-05 - Azure DeepSeek-V4-Flash chat path. OpenAI-compatible
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

    const tools = [
        {
            type: 'function' as const,
            function: {
                name: FETCH_WIKI_ARTICLES_TOOL.name,
                description: FETCH_WIKI_ARTICLES_TOOL.description,
                parameters: FETCH_WIKI_ARTICLES_TOOL.input_schema,
            },
        },
        {
            type: 'function' as const,
            function: {
                name: FETCH_WIKI_RESOURCE_TOOL.name,
                description: FETCH_WIKI_RESOURCE_TOOL.description,
                parameters: FETCH_WIKI_RESOURCE_TOOL.input_schema,
            },
        },
        {
            type: 'function' as const,
            function: {
                name: QUERY_TOPIC_CLUSTERS_TOOL.name,
                description: QUERY_TOPIC_CLUSTERS_TOOL.description,
                parameters: QUERY_TOPIC_CLUSTERS_TOOL.input_schema,
            },
        },
    ];

    let lastText = '';
    const _deepseekLoopStart = Date.now();
    try {
    for (let iter = 0; iter < MAX_TOOL_ITER; iter += 1) {
        // 2026-05-26 - Abort + wall-clock check at each iteration boundary
        const _sig = (globalThis as any).__hicChatAbortSignal as AbortSignal | undefined;
        if (_sig?.aborted) throw new DOMException('Cancelled by user', 'AbortError');
        if (Date.now() - _deepseekLoopStart > MAX_TOOL_WALLCLOCK_MS) {
            console.warn(`[chat.tools] DeepSeek wall-clock budget ${MAX_TOOL_WALLCLOCK_MS}ms exceeded at iter ${iter + 1}; finalizing with current evidence`);
            break;
        }
        const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
        _prog?.(`Reasoning... iter ${iter + 1}/${MAX_TOOL_ITER} (DeepSeek)`);
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
                    // 2026-05-05 - DeepSeek V4 Flash sometimes emits whitespace-only
                    // or empty `arguments` strings for arg-less tools; trim first.
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeFetchWikiArticlesTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (tc.function.name === FETCH_WIKI_RESOURCE_TOOL.name) {
                try {
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeFetchWikiResourceTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (tc.function.name === QUERY_KG_TOOL.name) {
                try {
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeQueryKGTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (tc.function.name === QUERY_TOPIC_CLUSTERS_TOOL.name) {
                try {
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeQueryTopicClustersTool(args);
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
    } catch (e) {
        if (_isExhaustionError(e)) {
            return _finalizeChatViaClaude(system, messages as _ChatMsgLike[], 'DeepSeek');
        }
        throw e;
    }
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

    const tools = [
        {
            type: 'function' as const,
            function: {
                name: FETCH_WIKI_ARTICLES_TOOL.name,
                description: FETCH_WIKI_ARTICLES_TOOL.description,
                parameters: FETCH_WIKI_ARTICLES_TOOL.input_schema,
            },
        },
        {
            type: 'function' as const,
            function: {
                name: FETCH_WIKI_RESOURCE_TOOL.name,
                description: FETCH_WIKI_RESOURCE_TOOL.description,
                parameters: FETCH_WIKI_RESOURCE_TOOL.input_schema,
            },
        },
        {
            type: 'function' as const,
            function: {
                name: QUERY_TOPIC_CLUSTERS_TOOL.name,
                description: QUERY_TOPIC_CLUSTERS_TOOL.description,
                parameters: QUERY_TOPIC_CLUSTERS_TOOL.input_schema,
            },
        },
    ];

    let lastText = '';
    const _gptLoopStart = Date.now();
    try {
    for (let iter = 0; iter < MAX_TOOL_ITER; iter += 1) {
        // 2026-05-26 - Abort + wall-clock check at each iteration boundary
        const _sig = (globalThis as any).__hicChatAbortSignal as AbortSignal | undefined;
        if (_sig?.aborted) throw new DOMException('Cancelled by user', 'AbortError');
        if (Date.now() - _gptLoopStart > MAX_TOOL_WALLCLOCK_MS) {
            console.warn(`[chat.tools] GPT wall-clock budget ${MAX_TOOL_WALLCLOCK_MS}ms exceeded at iter ${iter + 1}; finalizing with current evidence`);
            break;
        }
        const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
        _prog?.(`Reasoning... iter ${iter + 1}/${MAX_TOOL_ITER} (GPT)`);
        // 2026-05-12 - Use shared retry client. OpenAI's API returns
        // 429 (quota / rate-limit) and 5xx transients under load - both
        // are retryable with backoff. Previously a single failure killed
        // the chat turn; now we get three attempts with backoff.
        const { callAIWithRetry } = await import('./aiRetryClient');
        const data = await callAIWithRetry('openai', {
            model,
            messages,
            tools,
            tool_choice: 'auto',
            max_completion_tokens: 16000,
            temperature: 0.2,
        }, {
            label: `Chat (iter ${iter + 1})`,
            headers: { 'x-openai-endpoint': 'chat' },
        });
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
                    // 2026-05-05 - DeepSeek V4 Flash sometimes emits whitespace-only
                    // or empty `arguments` strings for arg-less tools; trim first.
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeFetchWikiArticlesTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (tc.function.name === FETCH_WIKI_RESOURCE_TOOL.name) {
                try {
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeFetchWikiResourceTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (tc.function.name === QUERY_KG_TOOL.name) {
                try {
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeQueryKGTool(args);
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (tc.function.name === QUERY_TOPIC_CLUSTERS_TOOL.name) {
                try {
                    const rawArgs = (tc.function.arguments || '').trim();
                    const args = rawArgs ? JSON.parse(rawArgs) : {};
                    result = await executeQueryTopicClustersTool(args);
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
    } catch (e) {
        if (_isExhaustionError(e)) {
            return _finalizeChatViaClaude(system, messages as _ChatMsgLike[], 'OpenAI / GPT');
        }
        throw e;
    }
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
        functionDeclarations: [
            {
                name: FETCH_WIKI_ARTICLES_TOOL.name,
                description: FETCH_WIKI_ARTICLES_TOOL.description,
                parameters: FETCH_WIKI_ARTICLES_TOOL.input_schema,
            },
            {
                name: FETCH_WIKI_RESOURCE_TOOL.name,
                description: FETCH_WIKI_RESOURCE_TOOL.description,
                parameters: FETCH_WIKI_RESOURCE_TOOL.input_schema,
            },
            {
                name: QUERY_TOPIC_CLUSTERS_TOOL.name,
                description: QUERY_TOPIC_CLUSTERS_TOOL.description,
                parameters: QUERY_TOPIC_CLUSTERS_TOOL.input_schema,
            },
        ],
    }];

    let lastText = '';
    const _geminiLoopStart = Date.now();
    try {
    for (let iter = 0; iter < MAX_TOOL_ITER; iter += 1) {
        // 2026-05-26 - Abort + wall-clock check at each iteration boundary
        const _sig = (globalThis as any).__hicChatAbortSignal as AbortSignal | undefined;
        if (_sig?.aborted) throw new DOMException('Cancelled by user', 'AbortError');
        if (Date.now() - _geminiLoopStart > MAX_TOOL_WALLCLOCK_MS) {
            console.warn(`[chat.tools] Gemini wall-clock budget ${MAX_TOOL_WALLCLOCK_MS}ms exceeded at iter ${iter + 1}; finalizing with current evidence`);
            break;
        }
        const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
        _prog?.(`Reasoning... iter ${iter + 1}/${MAX_TOOL_ITER} (Gemini)`);
        // 2026-05-26 - 429 fallback to DeepSeek-V4-Flash. When Gemini returns
        // quota-exhausted (HTTP 429 or "Resource exhausted" message), don't
        // grind through retries - immediately re-fire the same call through
        // the proxy /api/ai/deepseek endpoint. DeepSeek is in the pipeline
        // and has separate Azure quota. The chat user sees zero downtime;
        // a one-line progress notice surfaces the fallback.
        let response: any;
        try {
            response = await ai.models.generateContent({
                model,
                contents,
                config: {
                    systemInstruction: system,
                    temperature: 0.2,
                    maxOutputTokens: 65536,
                    tools: tools as any,
                } as any,
            });
        } catch (geminiErr: any) {
            const msg = String(geminiErr?.message || geminiErr || '');
            const is429 = /429|resource exhausted|quota|rate.?limit/i.test(msg);
            if (!is429) throw geminiErr;
            console.warn(`[chat.tools] Gemini 429/quota at iter ${iter + 1}; falling back to DeepSeek-V4-Flash`);
            _prog?.(`Gemini quota exhausted - switching to DeepSeek-V4-Flash...`);
            // Translate Gemini contents -> DeepSeek/OpenAI-compat messages
            const deepseekMessages: any[] = [{ role: 'system', content: system }];
            for (const turn of contents) {
                const role = turn.role === 'model' ? 'assistant' : 'user';
                const text = (turn.parts || []).map((p: any) => p?.text || '').join('\n').trim();
                if (text) deepseekMessages.push({ role, content: text });
            }
            const dsResp = await fetch(`${PROXY_BASE}/api/ai/deepseek`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'deepseek-v4-flash',
                    messages: deepseekMessages,
                    max_tokens: 32000,
                    temperature: 0.2,
                    stream: false,
                }),
                signal: AbortSignal.timeout(120_000),
            });
            if (!dsResp.ok) {
                const errTxt = await dsResp.text().catch(() => '');
                throw new Error(`DeepSeek fallback ${dsResp.status}: ${errTxt.slice(0, 200)}`);
            }
            const dsData = await dsResp.json();
            const dsContent = dsData?.choices?.[0]?.message?.content || '';
            // Build a synthetic Gemini-shaped response so the downstream parser is unchanged
            response = {
                candidates: [{
                    content: { parts: [{ text: dsContent }] },
                    finishReason: dsData?.choices?.[0]?.finish_reason || 'STOP',
                }],
                text: dsContent,
                _fallback_provider: 'deepseek-v4-flash',
            };
        }

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
            const finalText = lastText || (response as any).text || '';
            if (finalText && finalText.trim().length > 0) return finalText;

            // 2026-05-23 - Empty-response guard. Gemini sometimes returns a
            // response with no function calls AND no text after a long tool
            // chain (degraded API session, safety filter on a non-blocking
            // signal, or finishReason=OTHER). Previously we surfaced the
            // literal string "No response" to the user. Now: log the
            // finishReason, append a closing nudge, and retry once. If that
            // also comes back empty, return a clearer message.
            const finishReason = cand?.finishReason || 'unknown';
            console.warn(
                `[chat.tools] Gemini returned empty content on iter ${iter + 1} ` +
                `(finishReason=${finishReason}, parts=${respParts.length}). ` +
                `Retrying once with a closing nudge.`
            );
            contents.push({ role: 'model', parts: respParts.length > 0 ? respParts : [{ text: '' }] });
            contents.push({
                role: 'user',
                parts: [{
                    text: 'Provide your final answer now using the wiki/KG/topic data you have already retrieved. Do not call any more tools. If you cannot answer from the data on hand, say what is missing in one sentence.',
                }],
            });
            const retryResp = await ai.models.generateContent({
                model,
                contents,
                config: {
                    systemInstruction: system,
                    temperature: 0.2,
                    maxOutputTokens: 65536,
                    // No tools on the retry - force a textual answer.
                } as any,
            });
            const retryParts: GPart[] = (retryResp as any).candidates?.[0]?.content?.parts || [];
            const retryText = retryParts
                .filter((p: any) => typeof p?.text === 'string' && p.text.length > 0)
                .map((p: any) => p.text)
                .join('\n')
                || (retryResp as any).text
                || '';
            if (retryText.trim().length > 0) return retryText;
            return 'Model returned an empty response after retrieving data. The API may be degraded - try again, or rephrase the question more narrowly.';
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
            } else if (call.name === FETCH_WIKI_RESOURCE_TOOL.name) {
                try {
                    result = await executeFetchWikiResourceTool(call.args || {});
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (call.name === QUERY_KG_TOOL.name) {
                try {
                    result = await executeQueryKGTool(call.args || {});
                } catch (e: any) {
                    result = `(tool error: ${e?.message || 'unknown'})`;
                }
            } else if (call.name === QUERY_TOPIC_CLUSTERS_TOOL.name) {
                try {
                    result = await executeQueryTopicClustersTool(call.args || {});
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
    } catch (e) {
        if (_isExhaustionError(e)) {
            // Translate Gemini contents -> OpenAI-shape for the Claude finalizer.
            // Tool turns (role:'function' with functionResponse parts) become
            // user turns carrying the retrieved data so Claude has the evidence.
            const openAIShape: _ChatMsgLike[] = [{ role: 'system', content: system }];
            for (const turn of contents) {
                const turnRole = (turn as any).role;
                if (turnRole === 'function') {
                    const fr = ((turn as any).parts || []).find((p: any) => p?.functionResponse);
                    const name = fr?.functionResponse?.name || 'tool';
                    const result = fr?.functionResponse?.response?.result;
                    const content = typeof result === 'string' ? result : (result == null ? '' : JSON.stringify(result));
                    openAIShape.push({ role: 'tool', content, name });
                    continue;
                }
                const partsText = ((turn as any).parts || [])
                    .map((p: any) => {
                        if (typeof p?.text === 'string') return p.text;
                        if (p?.functionCall) return `[Called tool ${p.functionCall.name}(${JSON.stringify(p.functionCall.args || {}).slice(0, 200)})]`;
                        return '';
                    })
                    .filter((s: string) => s.length)
                    .join('\n');
                openAIShape.push({
                    role: turnRole === 'model' ? 'assistant' : 'user',
                    content: partsText,
                });
            }
            return _finalizeChatViaClaude(system, openAIShape, 'Gemini');
        }
        throw e;
    }
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
