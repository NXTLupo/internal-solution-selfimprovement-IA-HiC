// 2026-05-26 - Static ESM import for the hashtag registry. Replaces the
import { THESIS_OPTIONS_CONTRACT, parseThesisOptions, buildThesisAirRecord, stripThesisOptions, proposeAlternativeTheses } from './thesisOptions';
import { callAIWithRetry } from './aiRetryClient';
import { DEFAULT_MODELS, CLAUDE_REASONING_MODEL, CLAUDE_STRUCTURED_MODEL, effortForArtifact, effortFromSkillHint, maxEffort, type ClaudeEffort } from './aiRouter';
import { readObjectivePlan, toAirDecomposedQuestions } from './objectivePlan';
// Node-style `require('./hashtagRegistry')` call that broke at runtime
// in the Vite browser bundle. `hashtagRegistry.ts` has no dependencies
// on this file, so no circular risk. The `_hashtagRegistryModule` alias
// is used by `extractHashtagDirectives` below.
import * as _hashtagRegistryModule from './hashtagRegistry';
// 2026-06-09 - MANIFEST-CHUNK GROUNDING (the new engine, intent A.1). Replaces
// the bulk-RAG corpusText dump with manifest-selected, pointer-addressed chunk
// bodies so deliverables assemble from wiki+MANIFEST, not RAG (standing rule
// feedback_deliverables_manifest_wiki_not_rag). pickChunksForPrompt pre-ranks the
// engagement's chunk catalog; resolveChunks dereferences pointers to verbatim
// spans; assembleChunkCorpus renders the cite-by-pointer block.
import { beginGenerationLedger, noteGenerationStep, enrich, buildEnrichmentRecord, buildDegradationNotice } from './generationLedger';
import { buildExhibitCatalogBlock } from './exhibitCatalog';
import { ok, fail } from './stepEnvelope';
import { artifactModelFor, HIC_CACHE_BREAK } from './aiRouter';
// 2026-10-01 - Three-brand contract (NXT / NU / DECIEM): the brand variant type and the normalizer
// come from the brands token mirror; brandVariantOf is the ONE hashtag resolver (hashtagParser).
import { normalizeBrandId, type BrandVariantId } from '../components/slideTemplates/brands';
import { brandVariantOf } from './hashtagParser';
import { catalogEntryFor, CATALOG_TEMPLATE_RULES, CATALOG_HASHTAG_TO_SKILL_ID, CATALOG_HASHTAG_ALIASES, CATALOG_MODIFIER_TOKENS, isCatalogModifier, primaryCatalogHit, catalogDirectiveRegex } from './artifactCatalog';
import { pickChunksForPrompt, assembleChunkCorpus, chunkCitationInstructions } from './chunkRetrieval';
import { resolveChunks, currentEngagementSlug } from './wikiPointerResolver';
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
export type ChatModel = 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'deepseek-v4-flash' | 'deepseek-v4-pro' | 'gpt-5.5' | 'claude-opus-5-5' | 'claude-opus-4-8' | 'council';

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
    /**
     * E2.2: the candidate theses this deck chose between. Present only on a deck turn
     * that offered a real choice, so the UI can let the user take a different one. The
     * chosen candidate is flagged inside the list; the message CONTENT never shows the
     * menu.
     */
    thesisOptions?: Array<{ id: number; thesis: string; implies: string; chosen: boolean }>;
    /**
     * 2026-08-26 (owner report): the clarification gate blocked a prompt that already
     * named its subject, industry-equivalent, and audience, in words a fixed keyword
     * list did not happen to cover. The gate itself is now much more conservative (a
     * content-richness backstop independent of any list), but the plan's REJECT is
     * still explicit that clarification is not removed entirely: a genuinely bare
     * ask should still be caught before a full run is spent on a guess. The bridge
     * between those two facts is trust made instant rather than trust made a retype:
     * carrying the original query here lets the chooser run it exactly as written
     * with one click, instead of asking the user to type the identical message again
     * to signal an override they may not know exists.
     */
    clarificationBypassQuery?: string;
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
        brand?: BrandVariantId;
        sectionCount?: number;
        citationCount?: number;
        sourceCount?: { external: number; uploaded: number; analysis: number; total: number };
    };
    /** 2026-05-25 - Journey-map launcher (kept for backward compat). New
     *  generations use artifactLaunchUrl below. */
    journeyMapUrl?: string;
    journeyMapMeta?: {
        title?: string;
        brand?: BrandVariantId;
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
        brand?: BrandVariantId;
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
        brand?: BrandVariantId;
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
        brand: BrandVariantId;
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
        brand?: BrandVariantId;
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
    /** 2026-06-09 - Manifest-chunk-addressed corpus block (the new engine).
     *  Precomputed in sendChatMessage via pickChunksForPrompt+resolveChunks+
     *  assembleChunkCorpus. When present, buildGroundingContext LEADS with this
     *  (cite-by-pointer) and DEMOTES the bulk corpusText to a supplementary tail,
     *  honoring the wiki+MANIFEST grounding rule over bulk RAG. */
    manifestChunkCorpus?: string;
    /** 2026-06-25 - by-name retrieval note. When the user NAMED a specific document,
     *  this states which named docs were found in the corpus and which were NOT, with
     *  a hard instruction: answer the found ones from their pointer-cited chunks, and
     *  for the missing ones say plainly they are not in the corpus - NEVER fabricate a
     *  source (the documented `(Source: Gemini)` hallucination). */
    namedDocNote?: string;
    /** 2026-06-18 (research-run-failure-analysis P0.2) - when the user PASTES substantive,
     *  structured content into an artifact request (e.g. "generate #slides … #### 1 … #### 10"),
     *  that paste is the AUTHORITATIVE basis for the deliverable. buildGroundingContext emits it
     *  ABOVE the manifest PRIMARY EVIDENCE so it outranks retrieved corpus, with a hard rule to
     *  build FROM it (preserve item set/order/framing) and use the corpus only to corroborate/cite.
     *  Fixes "the model ignores the verbatim info I shoved into the prompt". */
    authoritativePaste?: string;
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
        // 2026-09-30 (owner directive, plan Stage 0.5) - Claude Opus 5.5: THE
        // deliverable-generation model for every artifact hashtag (#slides,
        // #journey, #personas, #prd, ...). Force-routed by sendChatMessage when an
        // artifact hashtag is present; also selectable directly in the picker.
        // 1M context, 128K output, $4/$20 per 1M. Thinking always on (adaptive),
        // depth via output_config.effort (services/claudeModelPolicy.ts).
        id: CLAUDE_REASONING_MODEL as ChatModel,
        name: 'Claude Opus 5.5',
        provider: 'anthropic',
        description: "Anthropic's Opus 5.5. Deliverable-generation default for artifact hashtags (slides, journeys, personas...). 1M context, adaptive thinking always on, $4/$20 per 1M tokens.",
        contextWindow: '1M tokens',
        strengths: 'Instruction-following, structured slide JSON, consulting-grade prose, low slop',
        color: '#CC785C',
        available: !!(process.env.ANTHROPIC_API_KEY),
        // 600K chars ~= 150K tokens, well within the 1M window, leaving ample
        // headroom for system prompt + history + output. Kept conservative (not
        // raised to the full window) to preserve prior corpus-packing behavior.
        maxCorpusChars: 600_000,
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

// --- Artifact hashtag -> slide template map ---
// 2026-06-11 - ARTIFACT hashtags are slide-mode triggers in their own right
// (ONE-ENGINE rule). #journey is a JOURNEY MAP (actor-lane matrix per the
// Figma GOLD journey frames), NOT the Bitner blueprint; #blueprint owns
// frontstage/backstage (corrected 2026-06-11 per user).
// 2026-06-12 - Hoisted to module scope: consumed by BOTH the early Fable
// force-route (before grounding-context budgeting) and the slide-mode
// prompt gate inside sendChatMessage. One table, no twin-drift.
// 2026-10-01 (plan Stage 6.1 / A7): the template rules are GENERATED from ARTIFACT_CATALOG (one
// vocabulary); the hand-written regex table that lived here is gone. Word-boundary regexes,
// every alias from the catalog.
const ARTIFACT_TPL: Array<[RegExp, string]> = CATALOG_TEMPLATE_RULES;

// --- Per-deliverable model TIER OVERRIDE (bake-off-validated) ---
// 2026-06-28 - EVIDENCE-VALIDATED downgrade, scoped to TWO deliverables.
// The default for EVERY artifact hashtag is claude-opus-4-8 (the force-route
// below). This map OVERRIDES that default per-deliverable, keyed on the slide
// TEMPLATE id resolved from ARTIFACT_TPL (i.e. the value the force-route already
// has in hand), NOT on the hashtag text.
//
// JUSTIFICATION: plans/model-bakeoff-gap-journey-2026-06-28.md (companion to
// plans/model-usage-optimization-vs-ri-2026-06-28.md §3b/§3c). On identical
// grounded evidence, Gemini 3.5 Flash MATCHED Gemini 3.1 Pro on #gap and
// #journey across every measured dimension (0 fabricated citations, 100%
// structural completeness, 0 anti-slop violations; Flash cited MORE distinct
// sources) at ~9x lower cost than Pro / ~18x lower than Opus. These two are
// SCHEMA-CONSTRAINED matrices (gap-matrix, journey-map) whose template bounds
// the output shape; they carry NO model-authored emotive brand imagery
// (per §3c the Nano-Banana concept-authoring constraint), so a budget tier is
// safe. Both run DETERMINISTIC (temperature 0 - see callGemini deterministic
// gate) which makes them exact-cache eligible.
//
// REVERSIBLE BY DESIGN: delete a map entry -> that deliverable falls back to
// the claude-opus-4-8 default. The other SIX schema-constrained deliverables
// (#blueprint #competitive #org #audit #arch #roadmap) are NOT yet validated
// and INTENTIONALLY stay on Opus pending their own bake-off. Narrative
// (#strategy #recommendations #report #proto) and emotive-imagery (#personas
// #themes #case-study #recommendation) deliverables also stay on Opus per
// quality-first + the §3c concept-authoring constraint.
// --- USER-CHOSEN SPLIT (2026-06-28) while Opus 4.8 is quota-capped (until 07-01) ---
// FLASH for the SCHEMA/TABLE deliverables (bake-off-proven equal to Gemini 3.1 Pro,
// ~18x cheaper): the template bounds the output shape. PRO for everything else artifact
// (case-study, personas, themes, strategy, recommendations, report, prd) - evidence- and
// imagery-heavy, where Flash leaves quotes/concepts thin (live-observed empty case-study
// quotes). REVERSIBLE: set ARTIFACT_DEFAULT_DURING_CAP=null to restore the Opus default
// for non-schema artifacts after the cap lifts; the schema->Flash tier stays (validated).
// WS-E (2026-06-30) - ROUTING CONVERGED onto the ONE authority: aiRouter.artifactModelFor. The parallel
// DELIVERABLE_MODEL_TIER map + ARTIFACT_DEFAULT_DURING_CAP const that used to live here are DELETED (no
// duplicate routing brain). artifactModelFor is the single source of truth: schema/table deliverables
// (gap-matrix/journey-map/service-blueprint/competitive-matrix/org-chart/systems-inventory/architecture-map/
// timeline) -> gemini-3.5-flash (bake-off-validated); every other artifact (case-study/personas/themes/
// strategy/recs/report/prd + bare #slides) -> gemini-3.1-pro-preview while OPUS_CAP_ACTIVE, claude-opus-4-8
// after. Reverse the cap by flipping OPUS_CAP_ACTIVE in aiRouter (one flag). Rationale + bake-off evidence:
// plans/model-bakeoff-*.md + the aiRouter header block.

/** Resolve the per-deliverable model override for a message, or null if none.
 *  Keys on the ARTIFACT_TPL template id (gap-matrix / journey-map / ...), so a
 *  bare "#gap" and a "#gap #slides #NU" both resolve to the same tier entry.
 *  Returns null for plain chat and for any deliverable NOT in the tier map
 *  (those keep the claude-opus-4-8 force-route default). */
function deliverableModelOverride(userMessage: string): ChatModel | null {
    if (!isArtifactGenerationMessage(userMessage)) return null;
    const avail = (id: ChatModel | null): ChatModel | null =>
        id && AVAILABLE_MODELS.find(m => m.id === id)?.available ? id : null;
    // WS-E: delegate to the ONE routing authority. Pass the ARTIFACT_TPL template id when present
    // (gap-matrix/...), else the raw message (artifactModelFor normalizes hashtags + a bare #slides).
    // A2 (2026-10-01): multi-hit routing; the highest routing tier among the named deliverables wins.
    const hit = primaryCatalogHit(userMessage);
    return avail(artifactModelFor(hit?.entry.templateId || userMessage) as ChatModel);
}

/** True when the message carries #slide/#slides or any artifact hashtag -
 *  i.e. the turn is a deliverable generation, not plain grounded chat.
 *  Exported (2026-06-12) so the panel's in-flight UI (loading indicator,
 *  progress placeholder) can label the ROUTED model instead of the picker
 *  state - the "processing screen showed 3.5 Flash while Fable generated"
 *  defect. */
export function isArtifactGenerationMessage(userMessage: string): boolean {
    return /#slides?\b/i.test(userMessage) || ARTIFACT_TPL.some(([re]) => re.test(userMessage));
}

/** D18 (2026-07-01): does this message target a deck/HTML ARTIFACT (any catalog directive), even ones NOT in
 *  ARTIFACT_TPL (#strategy/#playground/#approaches - generated via the strategy-author multi-slide path in
 *  sendChatMessage but previously OUTSIDE AIR emission because isArtifactGenerationMessage was false for them)?
 *  Broader than isArtifactGenerationMessage: it also resolves via the artifact catalog SSOT. Used ONLY to gate
 *  AIR emission (NOT routing/model-override), so it cannot change generation behavior - it only ensures every
 *  catalog artifact emits an AIR. */
export function messageTargetsArtifact(userMessage: string): boolean {
    if (isArtifactGenerationMessage(userMessage)) return true;
    const tags = userMessage.match(/#[a-z][a-z-]*/gi) || [];
    for (const t of tags) {
        const e = catalogEntryFor(t);
        if (e && (e.modality === 'slides' || e.modality === 'html')) return true;
    }
    return false;
}

/** 2026-06-18 (research-run-failure-analysis P0.2) - detect a SUBSTANTIVE pasted body inside an
 *  artifact request. When present it becomes the AUTHORITATIVE basis for the deliverable (emitted
 *  above PRIMARY EVIDENCE), fixing "the model ignores the verbatim info I shoved into the prompt".
 *  Heuristic: long body, OR an enumerated/structured paste (#### N, "1." lists, or inline Source:
 *  citations). Returns the full message (directive + content) so the model sees the complete spec;
 *  returns null for short conversational artifact asks ("#slides on retail trends") which SHOULD
 *  ground from the corpus, not from a one-line prompt. */
export function extractAuthoritativePaste(userMessage: string): string | null {
    const body = (userMessage || '').trim();
    if (body.length < 300) return null;                          // a one-line ask: ground from corpus
    const enumerated = /(^|\n)\s*#{2,4}\s*\d+[.)]/.test(body)    // "#### 1." headers
        || /(^|\n)\s*\d+[.)]\s+\S/.test(body)                    // "1. " / "1) " lists
        || /\bSources?:/i.test(body)                             // inline source attributions
        || /\[[^\]]+\.(pdf|docx?|txt)[^\]]*\]/i.test(body);      // bracketed file citations
    if (enumerated) return body;                                 // structured paste -> authoritative
    return body.length >= 1200 ? body : null;                    // long-but-unstructured: require >=1200
}

/** The model that sendChatMessage will actually run for this message.
 *  Mirrors the force-route logic exactly: artifact hashtags -> the Claude
 *  reasoning model (when the Anthropic key is configured), everything else -> the caller's
 *  model. Single source of truth for in-flight UI labels. */
export function routedModelFor(userMessage: string, fallback: ChatModel): ChatModel {
    if (fallback !== 'council' && isArtifactGenerationMessage(userMessage)) {
        // 2026-06-28 - per-deliverable tier override (bake-off-validated #gap/#journey
        // -> gemini-3.5-flash) takes precedence over the Opus default. Mirror the
        // force-route order exactly so the in-flight UI labels the ACTUAL model.
        const tier = deliverableModelOverride(userMessage);
        if (tier) return tier;
        const claude = AVAILABLE_MODELS.find(m => m.id === CLAUDE_REASONING_MODEL);
        if (claude?.available) return CLAUDE_REASONING_MODEL as ChatModel;
    }
    return fallback;
}

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
When the user asks a question, requests analysis, brainstorms, or makes any conversational request, respond as an expert research analyst. Your reply renders in a rich text pane that formats Markdown beautifully, so STRUCTURE the answer for fast scanning (this is REQUIRED, not optional - a flat wall of text is a failure):
  - LEAD WITH THE ANSWER: open with a 1-2 sentence direct answer / bottom line (Minto). No preamble, no "Great question", no restating the question.
  - SECTION HEADERS: when the answer has 2 or more distinct parts, break it with "## " headers (short, 2-5 words, a noun phrase). For a sub-point under a section use "### ".
  - BULLETS for any list of items, options, factors, or findings. One idea per bullet, ideally one line. Start a bullet with a "**Bold lead-in:**" when the point has a label, then the explanation.
  - NUMBERED LIST ("1." "2.") for sequences, steps, ranked priorities, or a recommended order.
  - BLOCKQUOTE ("> ") for a pulled VERBATIM quote from the corpus, with its source named on the next line.
  - **Bold** the single most important phrase per section; keep paragraphs to 2-3 sentences.
  - Cite named sources inline: e.g., "Industry Press reports that..." or "[r/example post, Mar 2026]". Liberal verbatim quoting.
  - Match depth to the question: a one-line factual question gets a tight 1-2 sentence answer (do NOT force headers onto a simple answer); a "compare / what are the / walk me through" question gets the full structured treatment.
  - HONOR EXPLICIT COUNTS: if the user names a number ("10 steps", "top 5", "3 examples"), produce EXACTLY that many items as a SINGLE numbered list 1..N. Do NOT regroup them under fewer section headers - "the 10 steps" means a flat 1..10 numbered list the reader can count, NOT 3 phases with sub-bullets.
  - ANSWER FROM THE MANIFEST-SELECTED EVIDENCE ALREADY IN THIS PROMPT. The PRIMARY EVIDENCE below was retrieved via the manifest (anti-RAG grounding) for exactly this question; answer directly from it. For a conversational question call fetch_wiki_articles AT MOST ONCE, and ONLY if that manifest evidence genuinely lacks the answer. Do NOT keep fetching across turns - repeated fetching is what makes a simple question take minutes. A plain question should be answered in one pass over the grounded evidence.
  - Plain text only INSIDE the structure (the Markdown above IS the allowed formatting); no HTML, no tables, no emoji, no em-dashes.
  - DO NOT emit :::slide, :::deliverable:, or :::nxt: fences. Answering in structured prose is your default contract.
  - EXCEPTION: an ARTIFACT hashtag (#journey, #blueprint, #case-study, #compete, #gap, #personas, #themes, #recommendations, #roadmap, #prd, #audit, #arch) is a request for the ARTIFACT, not for prose. Section 2 applies even without #slide/#slides.

WHITESPACE MECHANICS (MANDATORY - the renderer needs real line breaks to build structure; this is the #1 thing models get wrong):
  - Every "## " or "### " header is ON ITS OWN LINE, with a BLANK LINE before it and a BLANK LINE after it. NEVER put a header in the middle of a sentence or run it together with body text.
  - Every bullet is ON ITS OWN LINE starting with "- ". Never chain bullets inline.
  - Separate every paragraph with a BLANK LINE.
  - A header is a SHORT label ("## Standardize the data backbone"), NEVER a header glued to its body ("## 1. Standardize the data backbone Unify the CRM..." is WRONG - the body must drop to the next line).

EXACT SHAPE TO EMIT (note the blank lines and line breaks):
"""
A portfolio AI playbook runs in four sequential phases, each building on the last.

## 1. Standardize the data backbone

- **Unify the CRM model:** Put every portfolio company on one user account-and-contact schema so data is not siloed.
- **Centralize specialist talent:** Pool the scarce platform architects into one shared-service team.

## 2. Encode governance

- **Policies into the tooling:** Load compliance rules into the AI's system prompts so output is compliant by default.
"""

The knowledge graph is built automatically in the background, so you never need to emit cards. But you DO owe the reader a clean, scannable, well-structured answer - a flat wall of text is the failure mode we are fixing. Structure every multi-part answer; keep a one-line factual answer to one or two sentences.

--- 2. SLIDE MODE: triggered by #slide, #slides, OR any artifact hashtag ---
If the user's message contains "#slide" OR "#slides" (case-insensitive - "#slides" counts), OR any slide-template artifact hashtag (#journey, #blueprint, #case-study, #compete, #gap, #personas, #themes, #recommendations, #roadmap, #prd, #audit, #arch, #org), switch to slide generation using the SLIDE OUTPUT PROTOCOL below. This OVERRIDES the prose default. An artifact hashtag answered in markdown prose is a HARD FAILURE: the renderer only draws cards from :::slide fences, so prose renders as raw markdown slop. The artifact hashtag picks the TEMPLATE (#journey → journey-map, the actor-lane journey matrix; #blueprint → service-blueprint, the frontstage/backstage Bitner model; #roadmap → timeline; #audit → systems-inventory; #arch → architecture-map; #org → org-chart, the reporting-tier matrix); #slide/#slides forces slide output for anything else:
  - "5 #personas ... #slides"        → emit 5 :::slide template=persona-card blocks (NOT prose, NOT markdown)
  - "8 #themes ... #slides"          → emit :::slide template=theme-overview blocks (max 4 themes per block → 2 blocks for 8); a single dominant theme deserving a full slide → theme-detail
  - "#recommendations ... #slide"    → emit :::slide template=recommendation blocks
  - "#competitive ... #slides"       → emit :::slide template=competitive-matrix blocks
  Optional brand hashtag: #NU → the client organization (near-black + Huskies Red); #DECIEM → DECIEM (The Abnormal Beauty Company: black and white canvases, Poppins Bold uppercase headlines and labels, Josefin Sans body, Nunito for tables and data, pink / cyan / purple pops from the DECIEM PowerPoint template); #NXT → NXT Humans (teal + chartreuse, default).

CRITICAL: when #slide/#slides is present you MUST emit :::slide fences. NEVER answer a #slides request in markdown prose (no ###, no >, no * bullets) - that is a hard failure. The renderer only draws cards from :::slide blocks.

Examples:
  "#slide #NU give me a persona for Jordan Ellis"     → emit one :::slide template=persona-card brand=nu
  "5 #personas designer archetypes #slides #NXT"    → emit 5 :::slide template=persona-card brand=nxt
  "#slide show the top 3 themes"                    → emit ONE :::slide template=theme-overview block (3 columns in the grid)
  "Build a 5-slide deck on the roadmap #slide #NU"  → emit 5 :::slide blocks
  "#slide #DECIEM give me a persona for Jordan Ellis" → emit one :::slide template=persona-card brand=deciem

VIZ (content-true diagram in a slide's image slot) — AUTHOR THE MEANING, never decoration:
  A slide may carry a "viz" object. The diagram is drawn by the engine from YOUR authored data +
  labels (NOT random shapes), token-themed to the brand, and exported as a native, replaceable
  PowerPoint picture. Use it on slides:cover / slides:section-divider / slides:thesis-interstitial
  (they reserve a full-bleed image panel). Author the viz from the SAME corpus evidence as the prose.
  Shape of the "viz" object (pick the family that fits the content):
   - operatingNetwork (operating model / ecosystem): { "family":"operatingNetwork", "industry":"<run industry>",
       "hub":"<center node name>", "labels":["<hub>","<node>","<node>",...], "links":[[0,1],[0,2],...] }
       (labels[0] is the hub; links are REAL relationships between node indices)
   - funnelFlow (pipeline/conversion): { "family":"funnelFlow", "labels":["Identify","Qualify",...], "stages":[100,60,38,...] }
   - journeyLine (lifecycle): { "family":"journeyLine", "labels":["Acquire","Onboard",...], "stages":[/*count*/] }
   - timelineGantt (roadmap): { "family":"timelineGantt", "labels":["Quiet phase",...], "tracks":[{"start":0,"dur":2},...] }
   - maturityRadar (assessment): { "family":"maturityRadar", "labels":["Data","Pipeline",...], "scores":[0.5,...], "target":[0.85,...] }
   - capabilityStack (layers): { "family":"capabilityStack", "labels":["Ledger","Payments",...] }
   - comparisonMatrix / proportionStack / instrumentDial / dataField are also available (see the manifest).
  RULES: every label is REAL (a named function/stage/dimension from the evidence), the links/edges
  must make sense (the actual dependencies), never invent numbers as bare claims (the shape carries
  magnitude). One viz per slide. Omit "viz" if the slide has no diagrammatic content.
  ICONS-IN-DIAGRAMS (optional): add "icons" - an array of icon ids aligned by index to the
  labels/nodes (one per node/stage) - to mark each node with a small DOMAIN GLYPH inside the diagram.
  The engine resolves the glyph + its colour from brand tokens (never a hex; never text-in-image).
  Universal ids: risk, opportunity, growth, governance, compliance, data, insight, workflow,
  automation, integration, people, team, customer, time, roadmap, milestone, target, decision, alert,
  cost, value, security, channel, network, document, search, ai, feedback, scale. Industry ids look
  like "<industry>:<concept>" (e.g. healthcare:heartbeat, fintech:ledger). Use icons only where a
  per-node mark adds meaning. (Small per-card / per-peer / per-action emblems on NON-deck artifacts
  are auto-filled by the runtime from the GOLD audit - you do NOT author those.)
  Example:
  :::slide template=slides:section-divider brand=nxt
  { "kicker":"OPERATING MODEL", "title":"Advancement runs on one shared donor record",
    "viz": { "family":"operatingNetwork", "industry":"advancement", "hub":"Shared donor record",
      "labels":["Shared donor record","Gift Officers","Annual Giving","Major Gifts","Planned Giving","Stewardship"],
      "links":[[0,1],[0,2],[0,3],[0,4],[0,5],[1,3]],
      "icons":["data","people","feedback","value","time","customer"] } }
  :::

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

HONOR THE USER'S EXPLICIT STRUCTURE (HARD RULE, 2026-06-15):
When the user specifies the deck's STRUCTURE, that instruction OVERRIDES the default template grouping and you MUST follow it literally:
  - A SLIDE COUNT ("15-slide deck", "exactly 8 slides") is a contract: emit that many content slides (a section-divider counts only if the user includes it in the count).
  - "ONE SLIDE PER <X>" / "a slide for EACH <X>" / "dedicate a slide to every <X>" (app, product, tool, competitor, persona, capability, stakeholder, phase) is a COVERAGE contract: ENUMERATE every distinct <X> named in the grounded corpus / uploaded documents and emit ONE slide for EACH. Do NOT collapse them into a few thematic slides, and do NOT silently drop instances. If the uploads name nine apps, emit nine app slides - one per app, each with that app's own features, benefits, and use cases.
  - "Rely exclusively on the uploaded documents" / "only the uploads" scopes grounding: build every claim from the uploaded sources, not external corpus or general knowledge.
  - If the corpus does not contain enough named instances of <X> to satisfy a count, say so in ONE short line and emit a slide for each instance you CAN evidence - NEVER invent items to hit a number (No Fabrication rule).
The user's explicit structure beats the template's default item-per-block grouping every time. Before emitting, re-read the user's directive and confirm your slide set satisfies it (right count, one per named entity, correct grounding scope).

FIT THE CANVAS - CHARACTER BUDGETS ARE SUMMARIZATION TARGETS (HARD RULE, 2026-06-12):
Every text field on a slide has a finite physical budget. The renderer does NOT scroll and a cut-off sentence makes the artifact unusable. YOU do the summarizing at generation time:
  - Write every field as a COMPLETE thought that fits its budget. If the evidence is longer, COMPRESS THE IDEA (drop subordinate clauses, use the strongest fragment of a quote) - never write a sentence that will be cut mid-thought.
  - Per-field defaults unless a template says otherwise: matrix/table cells <= 100 chars; stacked list items (pains, opportunities, bullets) <= 80 chars; persona/JTBD voice lines <= 95 chars; KPI tile values 1-3 words; takeaway band <= 200 chars (max two lines).
  - Quotes inside tight cells: quote the decisive FRAGMENT ("only 3 business days to accept"), not the full sentence; the full verbatim quote belongs on evidence surfaces (block-quote, evidence fields) where there is room.
  - Source attributions do NOT ride inside tight list items; they live in the slide-level sources[] and on quote/evidence fields that have space.

WRITE LIKE A HUMAN CONSULTANT (HARD RULE, 2026-06-12):
  - Plain, direct sentences a partner would say out loud. Subject-verb-object. Contractions are fine.
  - Concrete nouns over abstractions: "users build their own spreadsheets" not "users employ manual tracking methodologies".
  - One idea per cell or bullet. No stacked qualifiers, no noun chains, no consulting filler.
  - Vary sentence openings across cells; sibling cells must not all start with the same verb or noun.

When the user asks to create a slide (or set of slides), output ONE :::slide block per slide.
Pick the template that best matches the content. Mark it on the fence: :::slide template=NAME

VISUAL BRAND (chosen via hashtag in the user's prompt):
  Use the EXACT color / font / spacing values from the "FIGMA DESIGN TOKENS" block above (pulled
  live from Figma via MCP). Do NOT hardcode or invent any hex code or font name. If the FIGMA DESIGN
  TOKENS block is absent, state that brand tokens are unavailable rather than guessing a value.
  #NXT = NXT Humans (DEFAULT).  #NU = the client organization - use only when the client organization is requested.
  #DECIEM = DECIEM (The Abnormal Beauty Company: black and white canvases, Poppins Bold uppercase headlines and labels, Josefin Sans body, Nunito for tables and data, pink / cyan / purple pops from the DECIEM PowerPoint template) - use only when #DECIEM is present.

If the user's prompt contains #NU (or "the client organization"), you MAY echo brand=nu on the fence:
  :::slide template=persona-card brand=nu
    {...}
  :::
If the user's prompt contains #DECIEM, you MAY echo brand=deciem on the fence the same way.
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
3.  theme-overview      → DEFAULT theme layout (Figma GOLD 590:9): 4-column theme grid. Per theme, set the
                          ENRICHMENT fields so it renders the real Figma anatomy: dominance ("DOMINANT"|"RECURRING"),
                          mood (one lowercase affect word, e.g. "exhausted"), insight, evidence (one verbatim quote),
                          source, subthemes (2-4 short chip labels), tension (one rust-bordered line naming the conflict).
                          Set slide-level "takeaway" for the accent synthesis band. Fields degrade gracefully if omitted.
3a. theme-detail        → ONE theme deep-dive (Figma GOLD 590:11): use when a single theme deserves a full slide.
                          themes:[ONE theme] with quotes:[2-3 {text,source}] (the CONVERGENT EVIDENCE column),
                          whatItMeans (interpretation paragraph), subthemes, tension, convergenceLabel
                          (e.g. "CONVERGENT ACROSS THREE SOURCE TYPES"), dominance, mood; slide-level takeaway band.
3b. theme-arc           → narrative chain of 3-4 themes with progression arrows (use when themes build sequentially: cause → effect → response)
3c. theme-mosaic        → 2x2 ivory grid of 4 parallel themes (uniform pale surface, hairline rules, chartreuse accent bar on the primary cell - restrained gallery rhythm for 4 co-equal themes)
    (theme-cluster / theme-spotlight are DEPRECATED aliases of theme-overview / theme-detail - do NOT emit them; emit the names above.)
4.  competitive-matrix  → user requests competitive analysis, peer comparison, capability scoring
5.  block-quote         → user wants a single powerful verbatim quote highlighted
6.  case-study          → user requests an example, real-world case, success/failure story.
                          GOLD deep-dive variants (set "variant" in caseStudy): four-block
                          (default), before-after (operating-model shift: beforeAfter payload),
                          evidence-stack (3 verbatim quotes: evidence[] payload).
                          VARIANT SELECTION (mandatory): when the corpus gives you 2-3 VERBATIM
                          quotes (real sentences lifted from articles/posts) that converge on this
                          subject, EMIT variant:"evidence-stack" and populate evidence:[{quote, source,
                          shows}] with those verbatim quotes - the convergent-evidence section is the
                          point of a case study and a bare four-block card with no quotes is the weak
                          fallback. Use before-after only when the case is genuinely an operating-model
                          shift. Use four-block only when verbatim quotes are NOT available. When the
                          user asks for SEVERAL case studies, DIVERSIFY: mix evidence-stack /
                          before-after / four-block across the set rather than repeating one shape.
                          evidence[] quotes are CLEAN complete sentences with named sources, never
                          raw interview filler. Subjects are NAMED real entities, never archetypes.
                          "takeaway" fills the GOLD bottom band.
7.  principles          → user requests guiding principles, design tenets, operating beliefs (3-5 items)
8.  stat-row            → user requests key metrics, numbers, "by the numbers" (3-4 stats)
9.  timeline            → user requests roadmap, phases, sequencing (3-5 phases)
10. section-divider     → between major sections of a deck
11. service-blueprint   → user requests a service blueprint, journey map, frontstage/backstage analysis (Bitner 5-component)
12. gap-matrix          → user requests gap analysis, maturity scoring, current-vs-target capabilities (Gartner 1-5)
13. architecture-map    → user requests technology architecture, system diagram, C4 layers, tech stack
14. prd-feature         → user requests product requirements, feature specs, MoSCoW breakdown
15. systems-inventory   → user requests tech audit, systems catalog, legacy vs current state
16. org-chart           → user requests an org chart, reporting structure, who-reports-to-whom, decision authority (#org). Reporting tiers of evidence-cited node cards; the org chart IS the body.
17. executive-brief      → #brief / #explainer / #report WITH #slide (GOLD slide twin). One template, three variants: brief (hero finding + finding cards), explainer (stepped concept + GOTCHAS), report (exec-summary key findings). Bare #brief/#explainer/#report (no #slide) stay long-form HTML documents.

Universal contract (every slide):
- "title": action title (complete sentence stating a conclusion with data)
- "sources": [...]   ← required, never empty, deduplicated
- "density": "base" (default) | "dense" - UNIVERSAL axis on every template.
  Emit "dense" (or fence attr density=dense) when the user asks for more
  detail / more lines / more quotes / #dense, or modifies a prior generation
  to add items beyond the base ceiling. Dense raises item ceilings in BOTH
  the preview and the PPTX export twin; never pad to reach a ceiling - every
  added item must be evidenced. Full per-template ceilings live in the render
  contract's references/web-layouts.md (UNIVERSAL DENSITY AXIS section).
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

=== READ FIRST - THE EXAMPLES BELOW ARE STRUCTURE-ONLY (DOMAIN-BLIND) ===
Every example slide below exists ONLY to show the JSON shape, keys, and field
types for its template. The examples use ASSORTED, FICTIONAL subjects purely as
filler. They are NOT your subject, NOT your evidence, and NOT a domain hint.
HARD RULES:
  - Build EVERY field from the USER'S actual corpus and the subject named in the
    user's message. Match only the SHAPE of these examples, never their content.
  - NEVER copy an example's domain, named entities, sources, numbers, or phrasing.
    If the user's subject is retail / healthcare / fintech / anything, your output
    must be entirely about THAT subject.
  - The strings "the client organization", "Peer A", "Peer B", "Peer C", "Peer D",
    "operations", "placement", "customer", "customers", "high-value-deal", "the subscription", "r/example",
    "Industry Panel 2024", "Outreach", "Gong", "Linear" are EXAMPLE FILLER. If any of them
    (or any other entity the user did not provide) appears in your output and the
    user did not supply it, that is a HARD FAILURE - regenerate from the corpus.

:::slide template=persona-card
{
  "title": "Jordan Ellis: The Data-Frustrated Operations Officer",
  "sources": ["NXT Stakeholder Interview", "the client organization Assessment Final Report"],
  "persona": {
    "name": "Jordan Ellis",
    "role": "Director of Renewals",
    "demographics": "42, MBA, 15 years in higher ed",
    "quote": "I spend 40% of my time reconciling data across three CRMs",
    "jtbd": "When customers engagement drops, I want predictive outreach so I can re-engage customers before churn",
    "goals": {"lifeGoal":"Promote to VP","experienceGoal":"Build data-driven team","functionalGoal":"Unify customer view"},
    "painPoints": [{"label":"Data Fragmentation","quote":"I wouldn't know in our database that Andrew works with Rob","source":"NXT Stakeholder Interview"}],
    "motivations": [{"label":"Customer Retention","quote":"We need to understand spend patterns before we lose them","source":"NXT Interview"}]
  }
}
:::

:::slide template=recommendation
{
  "title": "Consolidate three Salesforce instances into one to recover $2.4M annually",
  "sources": ["the client organization CRM Assessment", "Gartner CRM 2025", "Peer A Operations Annual Report 2025"],
  "recommendation": {
    "actionTitle": "Migrate Renewals, Key Accounts, and Reunion to a single Salesforce org by Q4",
    "rationale": "Three separate orgs create reconciliation overhead consuming 40% of operations-officer time per the CRM Assessment. Peer A's 18-month consolidation lifted high-value-deal conversion 34% - that is the pattern to follow.",
    "supportingActions": [
      {"name":"Data audit","description":"Inventory all custom objects across the three orgs and map duplicates. Dedicated team runs this for 8 weeks before migration planning begins."},
      {"name":"Pilot migration","description":"Migrate Reunion (smallest dataset) first to validate model and process. Two-week instrumentation sprint follows cutover."},
      {"name":"Training","description":"Run 5 sessions for the 80-person operations team before cutover - job-role-specific, not generic product training."}
    ],
    "impactGrid": {
      "baseline": "40% officer time on reconciliation across 3 orgs",
      "target": "<12% reconciliation time, single unified org",
      "timeframe": "9 months, 3-phase cutover",
      "owner": "VP Operations + 12-person program team"
    },
    "impactMetric": {"value":"$2.4M","label":"annual recovered productivity"},
    "evidence": [
      {"text":"I wouldn't know in our database right now that Andrew, you work with Rob - that's exactly the relationship that closes a high-value deal.","source":"NXT Stakeholder Interview","attribution":"Account Lead"},
      {"text":"Within six months we stopped asking 'do we know this customer?' - we already knew, and we knew the next best action.","source":"Industry Panel 2024 panel","attribution":"VP Operations, Peer A"}
    ],
    "implication":"This is the unlock for every downstream Operations initiative - prospect scoring, predictive outreach, and retention automation are all blocked by the fragmented data layer."
  }
}
:::

:::slide template=theme-overview
{
  "title": "Themes converge on a single failure mode: trust erosion before contact",
  "sources": ["r/example","r/example","Industry Press","Industry Panel 2024"],
  "themeCluster": {
    "themes": [
      {"name":"Placement scarcity is breaking the core value promise","dominance":"DOMINANT","mood":"betrayed","insight":"Current users cite the absence of promised placements as the top complaint, undermining the brand promise that justifies the price.","evidence":"Two years. No TA. No RA. No placements. No onboarding.","source":"r/example","subthemes":["Experiential promise","Year-one disappointment"],"tension":"The plan is sold on placements the provider cannot supply."},
      {"name":"Value skepticism is eroding the future customer base","dominance":"RECURRING","mood":"disillusioned","insight":"The cohort Operations must convert enters customers status already disillusioned with the return on the purchase.","evidence":"Most Gen Z buyers now think the purchase was a waste of money.","source":"r/industry","subthemes":["ROI doubt","Pre-soured customers"],"tension":"The future customer is skeptical before first contact."},
      {"name":"Political posture is now a spend variable","dominance":"RECURRING","mood":"wary","insight":"Public university statements directly shape whether customers open or close their wallets.","evidence":"the CEO joins more than 320 university leaders in a joint statement.","source":"r/example","subthemes":["Statement risk","Pledge volatility"],"tension":"Each public stance moves spend in both directions."}
    ],
    "takeaway": "Trust leaks during enrollment, compounds through graduation, and Operations never sees it because the data layer cannot assemble a unified customer view."
  }
}
:::

(Corpus-meta-commentary ban, titles-as-quotes ban, preferred-quote-source
priority, quote-density rules, and theme-count minimums are in the render
contract's references/anti-slop-rules.md and references/web-layouts.md - do
not restate them here.)

:::slide template=theme-detail
{
  "title": "Placement scarcity breaks the core value promise that justifies the subscription",
  "sources": ["r/example","Industry Press","Industry Panel 2024","NXT Stakeholder Interview"],
  "themeCluster": {
    "themes": [
      {
        "name":"Placement scarcity",
        "dominance":"DOMINANT",
        "mood":"betrayed",
        "convergenceLabel":"CONVERGENT ACROSS THREE SOURCE TYPES",
        "insight":"Users arrive expecting placements and onboarding; their absence is the defining disappointment of year one and the most-cited grievance across r/example.",
        "quotes":[
          {"text":"Two years. No TA. No RA. No placements. No onboarding. The whole reason I picked the client organization is gone.","source":"r/example"},
          {"text":"The career office told me to apply harder. There just are not enough postings.","source":"r/example"},
          {"text":"We promise experiential learning in every brochure and cannot place the users we admit.","source":"NXT Stakeholder Interview"}
        ],
        "whatItMeans":"The gap is not a user failing; it is a supply failing. The brand promise that justifies the subscription breaks during enrollment, before Operations ever makes contact.",
        "subthemes":["Experiential promise","Supply shortfall","Year-one disappointment"],
        "tension":"The plan is sold on placements the provider cannot supply."
      }
    ],
    "takeaway": "Fix placement supply and the year-one grievance disappears at its source; leave it and the cohort enters customers status already disillusioned."
  }
}
:::

:::slide template=theme-arc
{
  "title": "Customer trust breaks in three sequential stages - enrollment, graduation, customers",
  "sources": ["r/example","Industry Panel 2024","Industry Press","Gartner CRM 2025"],
  "themeCluster": {
    "themes": [
      {
        "name":"Experiential promise breaks at enrollment",
        "insight":"Users arrive expecting placements and onboarding; 15% of r/example threads cite their absence as the defining disappointment of year one.",
        "evidence":"Two years. No TA. No RA. No placements. No onboarding.",
        "source":"r/example",
        "signal":"47 of 312 r/example posts cite experiential gap"
      },
      {
        "name":"ROI skepticism crystallizes at graduation",
        "insight":"By the time users churn, 54% already believe the purchase was not worth the cost, locking in a skeptical posture before Operations ever makes first contact.",
        "evidence":"Most Gen Z buyers now think the purchase was a waste of money.",
        "source":"r/industry",
        "signal":"54% Gen Z ROI skepticism (vs 22% Millennial)"
      },
      {
        "name":"Customers disengagement hardens within 5 years",
        "insight":"Disengaged customers do not return. Industry Panel 2024 shows participation declines 12% per migration event, and recovery takes 7-10 years when it happens at all.",
        "evidence":"Participation is now at 14%, down from 19% pre-migration.",
        "source":"Industry Panel 2024",
        "signal":"-12% participation per platform migration"
      },
      {
        "name":"Operations loses visibility before it can act",
        "insight":"Three separate Salesforce instances mean Operations cannot see these signals until they surface as spend declines - by which point the trust has already left the building.",
        "evidence":"I wouldn't know in our database that Andrew works with Rob.",
        "source":"NXT Stakeholder Interview",
        "signal":"3 disconnected orgs, zero cross-college visibility"
      }
    ],
    "patternSignal":"Trust erosion is not one event - it is a four-stage cascade. Operations today sees only stage four, and only as a lagging indicator."
  }
}
:::

:::slide template=theme-mosaic
{
  "title": "Four parallel operations frictions - each isolated, together compounding",
  "sources": ["NXT Interview","Industry Panel 2024","Gartner 2025","Peer A Annual Report 2025"],
  "themeCluster": {
    "themes": [
      {
        "name":"Data Fragmentation",
        "insight":"Three Salesforce orgs prevent a single customer view. Officers reconcile 40% of their week manually.",
        "evidence":"I spend 40% of my time reconciling data across three CRMs.",
        "source":"NXT Interview",
        "signal":"40% officer time on reconciliation"
      },
      {
        "name":"Prospect Blindness",
        "insight":"No ML propensity model means high-capacity customers go un-scored. Peer schools run this at L4 maturity; the client organization sits at L1.",
        "evidence":"We have the data, we just cannot see it across the three systems we are running.",
        "source":"NXT Interview",
        "signal":"L1 maturity vs peer median L4"
      },
      {
        "name":"Mobile Giving Gap",
        "insight":"1.2% mobile conversion vs Peer D at 44%. The checkout page was not rebuilt after the last platform migration.",
        "evidence":"Mobile conversion sits at 1.2% - Peer D runs 44% on a rebuilt responsive page.",
        "source":"Gartner 2025",
        "signal":"1.2% vs 44% peer mobile conversion"
      },
      {
        "name":"Retention Latency",
        "insight":"Behavior-triggered outreach does not exist. Cadences are manual and batched monthly - peers run trigger-based daily.",
        "evidence":"Within six months we stopped asking do we know this customer.",
        "source":"Peer A Annual Report 2025",
        "signal":"0 triggered touchpoints; peers run 12+/quarter"
      }
    ],
    "patternSignal":"All four frictions share one upstream cause: the data layer. Fix the unified customer view and every downstream Operations capability becomes accessible."
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

:::slide template=block-quote
{
  "title": "The operations system that exists vs. the one staff describe",
  "sources": ["NXT Stakeholder Interview","Industry Panel 2024","Gartner CRM 2025"],
  "quote": {
    "text": "I wouldn't know in our database right now that Andrew, you work with Rob - and that's exactly the relationship that closes a high-value deal. We have the data, we just can't see it across the three systems we're running.",
    "attribution": "Anonymous Account Lead",
    "role": "20-year veteran, the client organization Operations",
    "source": "NXT Stakeholder Interview, March 2026",
    "context": "ON DATA FRAGMENTATION",
    "contextParagraph":"This quote comes from a stakeholder interview conducted during the March 2026 CRM assessment. The officer is describing how three siloed Salesforce instances - one per college - prevent even basic relationship mapping across customer households. This is the single most-cited friction point across 14 stakeholder interviews.",
    "corroboratingData": [
      {"value":"40%","label":"of officer time spent on manual data reconciliation","source":"NXT Interview"},
      {"value":"-12%","label":"customers participation since the last platform migration","source":"Industry Panel 2024"},
      {"value":"L1","label":"the client organization maturity tier vs. peer median of L4","source":"Gartner 2025"}
    ],
    "implication":"Consolidating to a unified customer view is a prerequisite to every other operations initiative - prospect scoring, predictive outreach, and retention automation all assume a single system of record."
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

:::slide template=principles
{
  "title": "Five principles guide the Operations transformation",
  "sources": ["NXT Strategy Working Session","Rumelt: Good Strategy/Bad Strategy"],
  "principles": {
    "items": [
      {"name":"Customer view before tooling","description":"Every system decision is judged by whether it makes the unified customer view stronger or weaker."},
      {"name":"Migrate, don't accumulate","description":"New capability replaces old; we sunset legacy on every release."},
      {"name":"Predictive over descriptive","description":"Reports must drive action - if a dashboard cannot trigger an outreach, it's not on the roadmap."},
      {"name":"Officer time is sacred","description":"Any tool that increases manual entry is rejected, even if it adds analytical depth."},
      {"name":"Privacy is a moat","description":"Customer data discipline becomes a brand asset, not a compliance overhead."}
    ]
  }
}
:::

:::slide template=stat-row
{
  "title": "Three numbers explain why Operations velocity has stalled",
  "sources": ["the client organization CRM Assessment","NXT Stakeholder Interview","Industry Panel 2024"],
  "statRow": {
    "stats": [
      {
        "value":"40%",
        "label":"of officer time spent reconciling data across CRMs",
        "meaning":"Front-line fundraisers burn nearly half their week on manual record merging instead of customer conversations.",
        "matters":"Every reclaimed hour compounds: peer schools freed 600+ hrs/officer/year and moved high-value-deal close-rates 30%+.",
        "source":"NXT Stakeholder Interview"
      },
      {
        "value":"3",
        "label":"separate Salesforce instances in production",
        "meaning":"Three disconnected orgs means prospect work at one college is invisible to every other college.",
        "matters":"Peer A consolidated 4 → 1 and unlocked 34% conversion lift in 18 months - the window is closing as peers move.",
        "source":"the client organization CRM Assessment"
      },
      {
        "value":"-12%",
        "label":"customers participation decline since platform migration",
        "meaning":"Participation is the leading indicator of high-value-deal pipeline 7-10 years out, and it is moving the wrong direction.",
        "matters":"Without action the cohort Operations must convert in the next decade will enter customers status already disengaged.",
        "source":"Industry Panel 2024"
      }
    ],
    "convergentInsight":"Three independent signals - officer time, system fragmentation, and participation decline - all point to the same root cause: Operations is operating a platform, not a unified customer system. Fix the platform and the other two metrics move together.",
    "patternSignal":"Peer institutions (Peer A, BU, Peer B) that closed this gap in 12-18 months posted 30%+ high-value-deal conversion lifts within the first post-cutover year."
  }
}
:::

:::slide template=timeline
{
  "title": "An 18-month consolidation sequenced to de-risk the high-value-deal cycle",
  "sources": ["NXT Implementation Plan","Peer A case study"],
  "timeline": {
    "phases": [
      {"name":"Discover","duration":"Month 1-2","items":["Object inventory","Field-level data audit","Stakeholder interviews"]},
      {"name":"Pilot","duration":"Month 3-6","items":["Migrate Reunion CRM","Validate data model","Train 12 officers"]},
      {"name":"Migrate","duration":"Month 7-12","items":["Renewals cutover","Key Accounts cutover","Decommission legacy"]},
      {"name":"Optimize","duration":"Month 13-18","items":["Predictive scoring","Mobile spend launch","Quarterly review cadence"]}
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

:::slide template=gap-matrix
{
  "title": "the client organization trails peers by one full maturity tier on every operations capability",
  "sources": ["Gartner CRM 2025","peer institution websites","the client organization CRM Assessment"],
  "gapMatrix": {
    "gaps": [
      {"capability":"Unified Customer View","currentMaturity":2,"targetMaturity":4,"severity":"critical","impact":"blocks high-value-deal personalization"},
      {"capability":"Predictive Customer Scoring","currentMaturity":1,"targetMaturity":4,"severity":"critical","impact":"officers miss 60% of ready-to-give signals"},
      {"capability":"Mobile Giving UX","currentMaturity":3,"targetMaturity":5,"severity":"high","impact":"50% of clicks are mobile; conv rate 1.2%"},
      {"capability":"Data Quality Governance","currentMaturity":2,"targetMaturity":4,"severity":"high","impact":"12% of customer records have duplicate IDs"},
      {"capability":"Attribution & Reporting","currentMaturity":2,"targetMaturity":4,"severity":"medium","impact":"cannot quantify channel ROI"}
    ],
    "scaleMax": 5,
    "insight": "Every critical gap is at L1-L2; peer median is L4."
  }
}
:::

:::slide template=architecture-map
{
  "title": "Four layers of technology must consolidate to enable the unified customer view",
  "sources": ["the client organization CRM Assessment","Stakeholder interviews"],
  "architectureMap": {
    "layers": [
      {"name":"Client Tier","nodes":[
        {"name":"Web / Mobile Giving","type":"Experience","description":"Salesforce Experience Cloud + custom React"},
        {"name":"Officer Console","type":"Experience","description":"Salesforce Lightning"},
        {"name":"Customers Portal","type":"Experience","description":"Drupal + SSO"}
      ]},
      {"name":"API & Orchestration","nodes":[
        {"name":"MuleSoft","type":"iPaaS","description":"Integration bus between CRMs and core systems"},
        {"name":"Segment","type":"CDP","description":"Event collection and identity resolution"}
      ]},
      {"name":"Systems of Record","nodes":[
        {"name":"Salesforce Renewals","type":"CRM"},
        {"name":"Salesforce Key Accounts","type":"CRM"},
        {"name":"Banner","type":"SIS"},
        {"name":"Workday","type":"ERP"}
      ]},
      {"name":"Analytics & Data","nodes":[
        {"name":"Snowflake","type":"Warehouse"},
        {"name":"Tableau","type":"BI"},
        {"name":"DataBricks","type":"ML","description":"Customer-propensity models (on hold)"}
      ]}
    ],
    "flowSummary": "Gift events flow left-to-right; identity resolution happens in Segment before Salesforce writes; analytics reads from Snowflake only."
  }
}
:::


:::slide template=systems-inventory
{
  "title": "22 operations systems - 9 are legacy and 4 carry critical risk",
  "sources": ["the client organization Tech Audit 2025","CRM Assessment"],
  "systemsInventory": {
    "systems": [
      {"name":"Salesforce Renewals","category":"CRM","status":"current","risk":"medium","description":"Primary gift intake; 8 custom objects"},
      {"name":"Salesforce Key Accounts","category":"CRM","status":"current","risk":"high","description":"40% schema drift from Annual org"},
      {"name":"Millennium Fundraising","category":"CRM","status":"legacy","risk":"critical","description":"20-yr old, no vendor support since 2023"},
      {"name":"Raiser's Edge NXT","category":"CRM","status":"deprecated","risk":"critical","description":"Parallel prospect data; migration stalled"},
      {"name":"Banner SIS","category":"SIS","status":"current","risk":"medium","description":"Student-of-record, modern API"},
      {"name":"Workday Financials","category":"ERP","status":"current","risk":"low","description":"GL + reconciliation"},
      {"name":"Snowflake","category":"Warehouse","status":"current","risk":"low","description":"All spend data since 2022"},
      {"name":"Pardot","category":"Marketing","status":"legacy","risk":"high","description":"Being replaced by Marketing Cloud"}
    ],
    "insight": "Legacy CRMs (Millennium, Raiser's Edge) hold 18% of prospect data and represent the largest single risk to the unified customer view."
  }
}
:::

INTENT INFERENCE - map natural phrasing to the right template:

Users will ask for deliverables in many different ways. Infer intent from synonyms rather than demanding exact keywords. Examples:

| User says...                                                       | Template to use        |
|------------------------------------------------------------------|------------------------|
| "who are our audiences" / "customer types" / "archetypes"        | persona-card           |
| "what should we do" / "next steps" / "play" / "prescription"     | recommendation         |
| "what's emerging" / "key findings" / "topics" / "patterns"       | theme-overview         |
| "unpack one theme" / "full slide on the dominant theme"          | theme-detail           |
| "how do we stack up" / "vs peers" / "competitive landscape"      | competitive-matrix     |
| "voice of customer" / "hero quote" / "what they said"            | block-quote            |
| "real-world example" / "proof point" / "how X did it"            | case-study             |
| "guiding principles" / "operating beliefs" / "design tenets"     | principles             |
| "by the numbers" / "headline stats" / "scoreboard"               | stat-row               |
| "rollout plan" / "milestones" / "sprint plan" / "quarters"       | timeline               |
| "journey map" / "end-to-end journey" / "who does what per stage" | journey-map            |
| "service blueprint" / "frontstage/backstage" / "Bitner"          | service-blueprint      |
| "org chart" / "reporting lines" / "who reports to whom" / "decision authority" | org-chart  |
| "#brief / #explainer / #report" + #slide (the GOLD slide twin)   | executive-brief        |
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

DOMAIN ADAPTATION - the examples below happen to be higher-ed operations, but the PATTERN is what matters, not the vocabulary. Adapt entity types, units, scale labels, timeframes, and jargon to the domain of the ACTUAL research corpus. Translation guide:

  | Slot                 | Higher ed            | B2B SaaS             | Healthcare           | Retail / DTC         | Financial services   |
  |----------------------|----------------------|----------------------|----------------------|----------------------|----------------------|
  | case-study subject   | University name      | Vendor / customer    | Health system        | Brand / retailer     | Bank / insurer       |
  | subjectMeta          | balance sheet, users  | ARR, headcount, ICP  | beds, payer mix      | SKUs, stores, GMV    | AUM, branches, tier  |
  | timeframe unit       | academic year / Qs   | quarters / sprints   | care episodes        | seasons / quarters   | cycles / quarters    |
  | investment unit      | program cost         | license + services   | capital outlay       | capex + OPEX         | program + compliance |
  | competitive columns  | Unified Customer View   | CDP, AI Scoring, etc | EHR, RCM, Analytics  | Inventory, Personal- | Core banking, KYC    |
  | scale labels         | Absent→Optimized     | Basic→World-class    | Manual→Automated     | Manual→Predictive    | Legacy→Real-time     |
  | blueprint stages     | Awareness→Steward    | Trial→Onboard→Renew  | Refer→Treat→Follow-up| Discover→Buy→Retain  | Prospect→KYC→Close   |
  | blueprint metrics    | gifts, retention     | ACV, NDR, CAC        | readmit, NPS         | conv rate, AOV, LTV  | deposit growth, FTE  |

The STRUCTURE (5 data vectors for case studies, 4+ named entities for matrices, 4 stages × 4 lanes for blueprints) is FIXED. Swap the surface vocabulary to whatever the corpus is about. NEVER force higher-ed framing onto a SaaS or healthcare or retail corpus, and vice versa.

Then, every time you emit one, you MUST:

CASE STUDY - the card has FIVE data vectors, not one:
  1. subject + subjectMeta (industry/region/size/balance sheet/etc)
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

JOURNEY MAP (#journey) - the GOLD actor-lane matrix. WHO does WHAT at each stage. NOT frontstage/backstage (that is service-blueprint).
  THE MATRIX IS THE ENTIRE SLIDE BODY (2026-06-12 redesign): personas render as a PERSONAS voice row inside the table, pain points render as stacked per-phase cells, opportunities render as an OPPORTUNITIES row, and kpiTiles embed inside their phase header cells. Nothing sits above the table.
  JSON shape (emit as :::slide template=journey-map):
  { "title": "<action title>", "sources": ["<named source>", ...], "journeyMap": {
      "journeyType": "<context, e.g. OPERATIONS STAFF VIEW>",
      "scope": "<one clause>", "actors": "<actor list>", "phasesLabel": "<e.g. Five, matriculation to spend>",
      "stages": [ {"name": "Matriculation"}, {"name": "Placement", "critical": true}, ... ],   // 4-5 base, 6 dense; mark AT MOST 1-2 critical
      "lanes": [ {"actor": "Operations staff", "role": "owns the pipeline", "cells": ["<what they do at stage 1>", "not engaged", ...]}, ... ],  // 3 base, 4 dense; cells align to stages
      "painPoints": [ ["<pain 1>", "<pain 2>", "<pain 3>"], ... ],            // aligns to stages; EACH PHASE gets an ARRAY of AT LEAST THREE evidenced pains (user rule 2026-06-12) - stack renders inside that phase's cell. Never pad: if the corpus evidences fewer for a phase, emit what is evidenced.
      "personas": ["<JTBD one-liner>", ...],                                   // ORDERED BY JOURNEY ARC: first persona maps to the first phase, last to the final phase (they distribute start->end into the voice row)
      "overallPainPoints": ["<pattern> (Named Source)", ...],                  // ORDERED BY ARC: distribute start->end INTO the per-phase pain stacks
      "opportunities": ["<opportunity> (Named Source)", ...],                  // ORDERED BY ARC: distribute start->end across the OPPORTUNITIES row - write each to address the phase it lands on
      "kpiTiles": [ {"label": "KEY FINDING", "value": "<QUALITATIVE hero word>", "sub": "<mono subline>", "isHeadline": true}, ... ],  // max 3, ORDERED BY ARC (first/mid/final phase headers); value is a WORD/PHRASE, never a naked number
      "keyInsight": "<takeaway band - structural cost in qualitative language>" } }
  Rules: every cell is ONE short clause; "not engaged" for stages an actor skips; quotes with numbers stay in evidence fields elsewhere, never in tiles/titles; cite NAMED sources in slide-level sources[]. ARC ORDERING IS LOAD-BEARING: the renderer places personas/overallPainPoints/opportunities/kpiTiles into phase columns by their array position (item 1 -> first phase, last item -> final phase), so order every one of these arrays to match the journey's chronology.
  JOURNEY FIELD BUDGETS (complete thoughts, never cut - summarize the idea to fit): lane cells <= 100 chars; each pain item <= 80 chars (a short complete phrase or a decisive quote FRAGMENT - no inline source attributions, no trailing clauses); persona voice lines <= 95 chars; opportunity items <= 80 chars; kpiTile value 1-2 words; keyInsight <= 200 chars (one or two punchy sentences, never three).

ORG CHART (#org) - the GOLD reporting-tier matrix. WHO reports to WHOM and WHO can act. DESCRIPTIVE of the structure that EXISTS TODAY, never an ideal you invent.
  THE TIER MATRIX IS THE ENTIRE SLIDE BODY: 2-4 stacked tier rows top->bottom, each a row of node cards joined by a hairline drop. Order tiers by authority - tier 1 DECIDES, the last tier DELIVERS. Mark the single decision-authority node emphasis:true (it gets the accent top border).
  JSON shape (emit as :::slide template=org-chart):
  { "title": "<action title - a conclusion about the structure, e.g. 'Three reporting tiers separate the person who hears the defect from the person who can fix it'>",
    "sources": ["<named source>", ...],
    "orgChart": {
      "subject": "<operation + state, e.g. SUPPORT OPERATION · AS-IS>",
      "tiers": [
        { "label": "TIER 1 · DECIDES", "nodes": [ {"title": "VP Customer Operations", "role": "Owns the support P&L and the staffing plan", "source": "Org Announcement", "emphasis": true} ] },
        { "label": "TIER 2 · DIRECTS", "nodes": [ {"title": "Director, Support", "role": "Owns queues, SLAs, and the agent roster", "source": "Org Announcement"}, ... ] },
        { "label": "TIER 3 · DELIVERS", "nodes": [ {"title": "Tier-1 agents", "role": "Absorb FAQ volume; first to hear every defect", "source": "Agent Listening Session"}, ... ] }
      ],
      "keyInsight": "<takeaway band - the one structural conclusion the chart proves, in qualitative language>" } }
  Rules: 2-4 tiers; 1-4 node cards per tier (5 dense); pair each tier label's number with its VERB (DECIDES / DIRECTS / DELIVERS / ADVISES). Every node card carries a NAMED source (where the role/reporting line is evidenced) - never generic. role is ONE concrete responsibility clause. Mark AT MOST one node emphasis:true. CSS-grid layout only; no overlapping connectors.
  NAME THE ACTUAL LEADER (evidence-gated): when a source explicitly NAMES the person who heads a team AND ties that name to that team/role, the node title MUST be that person's name + role (e.g. "Diane McGillivray, SVP Operations"), NOT a team label alone, and NEVER an anonymized code (C01, C02, ...). Resolve real names from roster/client-upload sources (which name people); anonymized-interview transcripts (filenames ending _anonymized) code speakers - do NOT carry those codes into node titles. STRICT: only attach a name to a team when the SAME source connects them; if the roster names a person but you are not certain which team they lead, use the role title alone rather than guess. NEVER invent or infer a name; NEVER anonymize a name the corpus provides. A correct role-only node beats a wrong or fabricated name.
  ORG FIELD BUDGETS (complete thoughts, never cut): node title <= 42 chars; role <= 110 chars (one clause); source <= 30 chars (the named source, no "SOURCE:" prefix - the renderer adds it); keyInsight <= 200 chars.

EXECUTIVE BRIEF (#brief / #explainer / #report) - ONE GOLD slide template, THREE variants. Pick variant from the hashtag: #brief -> variant "brief", #explainer -> variant "explainer", #report -> variant "report".
  JSON shape (emit as :::slide template=executive-brief):
  { "title": "<finding-grade action title>", "sources": ["<named source>", ...],
    "executiveBrief": {
      "variant": "brief" | "explainer" | "report",
      "subject": "<kicker subject, e.g. ONBOARDING READINESS>",
      "hero": {"stat": "<ONE qualitative dominant finding word/phrase>", "label": "<what it measures>"},   // brief/report only; omit for explainer. Per the Quantitative Claim Rule a bare number belongs in a cited section quote, not here.
      "sections": [ {"heading": "<finding / concept step / exec-summary point>", "body": "<1-3 sentence prose>", "evidence": {"quote": "<verbatim corpus quote>", "source": "<Named Source>"}} ],   // 2-4 base, 6 dense
      "gotchas": ["<pitfall / caveat>", ...],   // EXPLAINER variant only: severity-flagged pitfalls
      "keyInsight": "<takeaway band - the one conclusion the brief proves>" } }
  Rules by variant: brief = optional hero finding + 2-4 finding cards (each a claim + cited quote); explainer = numbered concept-step cards (the renderer numbers them) + a GOTCHAS strip of pitfalls; report = hero + 3-5 exec-summary key-findings. Every section body is plain consultant prose; evidence quotes are verbatim from the corpus with a NAMED source. This is the SLIDE twin - the same #brief/#explainer/#report also produce a long-form HTML document when #slide is absent.
  BRIEF FIELD BUDGETS (complete thoughts, never cut): heading <= 64 chars; body <= 220 chars; evidence quote <= 150 chars; gotcha item <= 110 chars; hero stat <= 40 chars; keyInsight <= 200 chars.

DECOMPOSITION RULE (UNBOUNDED DENSITY - MANDATORY): a 16:9 slide has a PHYSICAL ceiling; when the user's request exceeds a template's dense ceiling, NEVER cram and NEVER drop evidenced items - DECOMPOSE into multiple :::slide blocks: one OVERVIEW slide + DETAIL slides per segment. Recipes:
  - 10-phase journey -> journey-map OVERVIEW (all phases, compressed cells, dashboard) + journey-map DETAIL slides of 4-5 phases each; "N quotes per phase" -> per-phase block-quote or theme-detail slides carrying the verbatim quotes
  - 10 themes -> theme-mosaic INDEX slide + theme-overview slides of 3-4 themes each (or theme-detail per priority theme)
  - heavy case-study evidence -> four-block deep-dive slide + an evidence-stack CONTINUATION slide for the extra verbatim quotes
  - deep PRD stories -> max 2 fully-detailed features per prd-feature slide; emit additional prd-feature slides
  - 4-level org -> level-1/2 overview slide + one branch slide per major sub-tree
  - "20-slide presentation" -> budget sections first (SCQA), then apply these recipes per section
Every decomposed slide stands alone (own action title, own sources); the overview slide's takeaway band carries the synthesis.

DENSE PAYLOAD FIELDS (W2 dense layouts - emit these when the corpus carries them; the renderer routes full payloads to purpose-built dense layouts instead of shrinking type):
  - block-quote, 3 convergent voices: primary voice in text/attribution/source, the other two in additionalQuotes:[{text, attribution, role, source}], one-sentence convergence in synthesis. Routes to the three-voice card layout.
  - stat-row, 4 stats OR 3 full stats (meaning+matters each) plus convergentInsight+patternSignal: routes to the quadrant grid + insight column. Never trim a 4th evidenced stat to fit.
  - recommendation, 4-6 supportingActions (or 3 + impactGrid + 2 evidence): routes to full-width action rows + impact band + evidence cards. Emit every evidenced action; the layout absorbs them.
  - persona-card carrying goals + painPoints + behaviors:["<observed behavior>", x3] + winConditions:["<what wins them>", x3] (optionally descriptors as an uppercase trait strip, stakes as a relationship-stakes line): routes to the identity column + 2x2 evidence quadrants.
  - prd-feature, userStory + 3-5 acceptanceCriteria per feature: max 2 such features per slide (decomposition recipe above); routes to the two-deep-card layout with technicalDetails/stakeholders in the footer.
  - prd REQUIREMENTS LEDGER (2026-07-02): every #prd response ALSO emits ONE closing prd-feature slide whose prdFeature carries ONLY "requirements": { "functional": [{"id":"FR-1","text":"..."}], "nonFunctional": [{"id":"NFR-1","text":"..."}], "outOfScope": [{"id":"OOS-1","text":"..."}] } (no features array on that slide). 4-6 rows per column, each a complete evidenced sentence; out-of-scope rows state what is deliberately NOT built and why in a clause. Title states the boundary judgment (e.g. "The requirements draw a hard line between the answer surface we build and the queue we refuse to rebuild"). Renders as the three-column FR/NFR/OOS ledger; ids are sequential and stable.
These fields are evidence carriers: behaviors, winConditions, additionalQuotes and synthesis come from the corpus (verbatim quotes keep inline named-source attribution), never invented to fill a layout.

SLIDE-SYSTEM VARIANTS (2026-06-11, from the NU Giving uplift; Figma GOLD slides pages NU 103:2 / NXT 324:2 carry the exemplars). Emit these via the EXISTING templates' optional fields when the content matches the shape:
  - section-divider with variant:"thesis": single-sentence interstitial (title = the sentence, max ~12 words, no numeral). Use for the one-line conviction beat between acts.
  - principles with variant:"diptych" and exactly 2 items: dark two-panel problem-statement pair (name = short claim, description = 2-3 sentences). Use for "two challenges / two truths" framings.
  - competitive-matrix with rowsProse:[{name, prove, implication, evidenceTag, tier:"top"|"second"}] + patternLine: two-tier prose evidence table; put the 1-2 strongest subjects on tier "top". Use when evidence rows are prose findings, not scores.
  - recommendation with impactCards:[{label, headline, body}] (2-3 cards: REVENUE / C-SAT / SERVICE NEEDS or similar): renders numbered action rows + right impact-card stack. Use for role-scoped or outcome-anchored recommendations.
  - timeline with rows:[{role, cells:[per-horizon initiative]}] while phases[] carries the horizon names: renders the role x horizon aggregate-roadmap grid. Use to unify multiple role roadmaps on one slide.
All variant fields are evidence carriers from the corpus; never pad a tier, card, or cell to fill the layout.

SERVICE BLUEPRINT (#blueprint) - frontstage/backstage Bitner model, maximum 4 stages on a 16:9 slide (5+ overflows):
  1. Cap stages at 4. If the journey is longer, split across multiple slides or consolidate phases.
  2. Every stage must include duration AND emotion (short labels: "Week 1", "Frustrated")
  3. Every stage needs all four lanes: customerAction, frontstage, backstage, support
  4. Mark explicit failPoint:true only on stages where the process genuinely breaks - not every stage
  5. keyInsight names the STRUCTURAL cost of the fail points in qualitative language (the system, the handoff, the named pattern). Numbers appear ONLY inside a verbatim quote with inline source attribution, never as your own assertion (Quantitative Claim Rule)
  6. painPoint/citation fields cite NAMED sources ("NXT Stakeholder Interviews", "the client organization CRM Assessment"), never raw file paths or chunk pointers
`;

// --- Foundational Consulting Mandates ---

// ============================================================================
// 2026-10-01 (plan R-T2 / Stage 4.1, audit A5): PER-TURN PROTOCOL INJECTION.
// DELIVERABLE_PROTOCOL carries the full 18-template SLIDE OUTPUT PROTOCOL (~63K chars of
// per-template JSON examples). It used to ride EVERY call: plain chat on Flash, a
// single-template #prd, and DECK MODE (which then declared the whole catalog superseded).
// This builder returns only what the turn needs:
//   'none'      -> the response-mode rules only (plain chat)
//   'deck'      -> the response-mode rules only (DECK MODE injects its own archetype catalog)
//   {templates} -> rules + the template catalog list + ONLY the requested templates' example
//                  blocks + the shared decomposition / dense-field / variant rules
// The stable core stays byte-identical PER TEMPLATE KIND, so the Anthropic prefix cache keys on
// (kind), not on a 63K blob that was identical but mostly irrelevant.
// ============================================================================
const _SLIDE_PROTOCOL_HEADER = 'SLIDE OUTPUT PROTOCOL - 18 TEMPLATES x 2 VISUAL BRANDS:';
const _EXAMPLE_FENCE = '\n:::slide template=';
const _EXAMPLES_END_MARKER = '\nDECOMPOSITION RULE (UNBOUNDED DENSITY - MANDATORY)';

export type ProtocolMode = 'all' | 'none' | 'deck' | { templates: string[] };

/** Template families: asking for one member includes its siblings' examples. */
const _TEMPLATE_FAMILIES: Record<string, string[]> = {
    'theme-overview': ['theme-overview', 'theme-detail', 'theme-arc', 'theme-mosaic', 'theme-cluster', 'theme-spotlight'],
    'theme-cluster': ['theme-overview', 'theme-detail', 'theme-arc', 'theme-mosaic', 'theme-cluster', 'theme-spotlight'],
    'executive-brief': ['executive-brief'],
};

export function deliverableProtocolFor(mode: ProtocolMode): string {
    const full = DELIVERABLE_PROTOCOL;
    if (mode === 'all') return full;
    const headerIdx = full.indexOf(_SLIDE_PROTOCOL_HEADER);
    if (headerIdx < 0) return full;   // structure changed; fail open to the full protocol
    const head = full.slice(0, headerIdx);
    if (mode === 'none' || mode === 'deck') return head.trimEnd() + '\n';
    const exStart = full.indexOf(_EXAMPLE_FENCE, headerIdx);
    const exEnd = full.indexOf(_EXAMPLES_END_MARKER, headerIdx);
    if (exStart < 0 || exEnd < 0 || exEnd < exStart) return full;
    const catalog = full.slice(headerIdx, exStart);
    const examples = full.slice(exStart, exEnd);
    const tail = full.slice(exEnd);
    const want = new Set<string>();
    for (const t of mode.templates) {
        const k = String(t || '').toLowerCase().trim();
        if (!k) continue;
        for (const member of (_TEMPLATE_FAMILIES[k] || [k])) want.add(member);
    }
    const blocks = examples.split(_EXAMPLE_FENCE).slice(1);   // each begins with "<name>\n{ ... }\n:::"
    const kept = blocks.filter(b => {
        const name = b.split(/[\s\n]/, 1)[0].toLowerCase();
        return want.has(name);
    });
    const examplesOut = kept.length ? _EXAMPLE_FENCE + kept.join(_EXAMPLE_FENCE) : '\n';
    return head + catalog + examplesOut + tail;
}

/** The templates a message asks for (ALL catalog hits, not only the first; audit A2). */
export function requestedSlideTemplates(userMessage: string): string[] {
    const out: string[] = [];
    for (const [re, tpl] of ARTIFACT_TPL) {
        if (re.test(userMessage) && !out.includes(tpl)) out.push(tpl);
    }
    return out;
}

const CONSULTING_MANDATES = `
FOUNDATIONAL CONSULTING MANDATES (apply to ALL responses):

1. MINTO PYRAMID & MECE: Present the answer FIRST, then supporting arguments. All decomposition must be Mutually Exclusive, Collectively Exhaustive. Arguments grouped under governing hypotheses.

2. SCR/SCQA FRAMEWORK: Situation (10-15% of content), Complication (15-20%), Resolution (60-70%). Lead with the insight, not the setup.

3. LIBERAL QUOTING (MANDATORY):
   - FORBIDDEN: "Research shows...", "Studies indicate...", "Data suggests...", "Sources confirm..."
   - REQUIRED: Extract and embed VERBATIM quotes with [SOURCE_NAME: "Article Title"] citations
   - Every factual claim must have a named source. Every insight must feature a direct quote or specific data point.
   - QUOTES ARE COMPLETE SENTENCES: never a lowercase mid-sentence fragment ("installing fire detection and protection equipment."). Pick a span that starts and ends as a sentence, or pick a different span.
   - DECK-LEVEL EVIDENCE DIVERSITY (MANDATORY): across the whole deck, no single citation may carry more than a third of the slides; never reuse the same verbatim quote on two slides; at least 60% of citations name external (non-upload) sources. If your draft repeats one source line slide after slide, you are FAILING - retrieve different ledger sources per slide before delivering.

4. ACTION TITLES: Every title is a complete sentence stating a SPECIFIC, CONTESTABLE conclusion - a named cause, mechanism, actor, or change a reader could disagree with. A title earns its place by being specific and contestable, NOT by carrying a figure. THIS APPLIES TO EVERY CONTENT SLIDE - capability lists, data-source inventories, measurement frameworks, and outcome slides included; the KICKER carries the topic label ("AI CAPABILITIES"), the TITLE carries the judgment ("The platform learns risk-scoring from every farmer interaction"). A kicker plus a descriptive subtitle is NOT a title.
   - BAD (topic label): "The Landscape", "Key Findings", "Recommendations", "Overview"
   - BAD (naked number, violates the Quantitative Claim Rule): a title built around a percentage or dollar figure. A number lives ONLY inside an attributed quote on the slide body, never in a title.
   - BAD (generically true, nobody could disagree): "Customer experience matters", or a "Three core capabilities define the ..." list framing.
   - GOOD: "Fragmented CRM systems force operations teams into manual data entry instead of customer work"
   - GOOD: "First-year users leave faster than the institution can replace them"
   - NO colon-then-triad titles ("X: a, b, and c"). State the single claim; move any list into the body.
   - NO antithesis / negative parallelism in a title, signal, or label: avoid the "X, not Y" form (e.g. "core practice, not a side task"; "proof, not pitch"), "it is not X, it is Y", "not just X but Y", "more than just", and "goes beyond". Assert the positive claim directly.
   - NO preamble-noun-plus-colon openers ("The competitive thesis:", "The technical wedge:", "The go-to-market narrative:"). Lead with the claim, not the label for it.
   - Use NO term on the anti-slop banlist (corporate cliches, marketing superlatives, and the Tier-1 AI-tell words). Substitute the plain word; avoid the "best of breed" superlative. Do not LEAN on the "value/worth" marketing pairing - name the specific worth (what it does, for whom) rather than reaching for the umbrella phrase.
   - ONE message per slide: a title joining two claims with "and" becomes two slides.
   - QUOTE FIDELITY: quotes are verbatim, with two corrections only - (a) fix an unambiguous transcription mis-hearing of a proper noun in the product's own domain (the model name rendered as "clawed" becomes "Claude" when that is plainly what was said), and (b) never pick a span carrying filler ("yada yada yada", "and so on"); choose a cleaner sentence that makes the same point. Never paraphrase; never invent.

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
        const isYoutube = name.includes('youtube') || name.includes('customers-association');
        const isReddit = name.includes('reddit') || name.includes('r/');
        const isAcademic = name.includes('openalex') || name.includes('crossref') || name.includes('semantic scholar') || name.includes('doaj') || name.includes('arxiv') || name.includes('europe pmc') || name.includes('eric');
        const isJina = name.includes('jina') || name.includes('web extract') || name.includes('news.northeastern') || name.includes('president.northeastern') || name.includes('finance.northeastern');
        const isRss = name.includes('rss') || name.includes('higher ed dive') || name.includes('inside higher ed') || name.includes('chronicle') || name.includes('edsurge') || name.includes('diverse') || name.includes('education week') || name.includes('spend') || name.includes('news') || name.includes('case');

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
        `    • RSS / news (Industry Press, IHE, Chronicle, EdSurge, etc.): ${buckets.rss} sources`,
        `    • Jina-reader web scrapes (institutional sites, peer URLs): ${buckets.jina} sources`,
        `    • YouTube customers-engagement transcripts: ${buckets.youtube} sources`,
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

export function buildGroundingContext(ctx: ChatContext, model: ChatModel): string {
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
        // Capped (2026-10-03): a 278KB archive pushed one #recs prompt to ~460K tokens and two timeouts.
        parts.push(ctx.wikiSourceArchive.length > 60_000 ? `${ctx.wikiSourceArchive.slice(0, 60_000)}
[archive truncated]` : ctx.wikiSourceArchive);
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

    // 2026-06-09 - MANIFEST-CHUNK CORPUS (the new engine, intent A.1) = PRIMARY
    // evidence (cite-by-pointer). 2026-06-16 - MOVED ABOVE the pre-fetched article
    // bodies + prior insights so the manifest LEADS and DRIVES the deliverable's
    // structure/insights (the anti-RAG rule feedback_deliverables_manifest_wiki_not_rag).
    // The article bodies + raw corpus below are explicitly SUPPLEMENTARY - factual
    // reference only (e.g. resolving the real names/titles of team leaders that live
    // in a client roster the manifest pack did not surface), never the driver.
    // 2026-06-18 (research-run-failure-analysis P0.2) - AUTHORITATIVE USER CONTENT. When the user
    // pastes substantive structured content into an artifact request, it is the ground truth for the
    // deliverable and must OUTRANK the retrieved manifest corpus. Emitted FIRST so the model treats it
    // as the spine; the PRIMARY EVIDENCE below becomes corroboration/citation, not a competing source.
    if (ctx.authoritativePaste && ctx.authoritativePaste.length > 80) {
        parts.push(`=== AUTHORITATIVE SOURCE CONTENT (user-supplied - THIS is the basis for the deliverable) ===`);
        parts.push([
            'The user pasted the content below as the authoritative material for this deliverable. Rules:',
            '1. BUILD THE DELIVERABLE FROM THIS CONTENT. Do NOT drop, merge, renumber, re-order, or substitute',
            '   its items; if it lists N enumerated items, produce coverage for all N, in the given order,',
            '   preserving each item\'s title and framing.',
            '2. Facts, figures, dates, and quotes present here are USER-ASSERTED GROUND TRUTH - use them as-is',
            '   even if the corpus below phrases them differently or does not contain them. Do NOT swap a',
            '   user-supplied fact for a corpus alternative.',
            '3. The PRIMARY EVIDENCE / corpus below is SUPPLEMENTARY here: use it only to corroborate, add a',
            '   source attribution, or fill a gap the paste leaves - never to override or replace the paste.',
        ].join('\n'));
        parts.push('');
        parts.push(ctx.authoritativePaste);
        parts.push(`=== END AUTHORITATIVE SOURCE CONTENT ===`);
        parts.push('');
    }

    if (ctx.namedDocNote && ctx.namedDocNote.length > 0) {
        parts.push(`=== NAMED-DOCUMENT DIRECTIVE (the user referenced specific document(s)) ===`);
        parts.push(ctx.namedDocNote);
        parts.push(`=== END NAMED-DOCUMENT DIRECTIVE ===`);
        parts.push('');
    }

    if (ctx.manifestChunkCorpus && ctx.manifestChunkCorpus.length > 80) {
        parts.push(`=== PRIMARY EVIDENCE (manifest-selected, cite by pointer) ===`);
        parts.push(chunkCitationInstructions());
        parts.push('');
        parts.push(ctx.manifestChunkCorpus);
        parts.push('');
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

    // Phase 1-retrofit - PRE-FETCHED ARTICLE BODIES (keyword-matched wiki bodies for
    // THIS question). 2026-06-16 - DEMOTED to a SUPPLEMENTARY factual reference placed
    // AFTER the manifest PRIMARY block (was at the top, which made bulk RAG the driver
    // and hollowed deliverables). It now carries the SPECIFIC FACTS the manifest pack
    // can miss - the real names/titles of leaders in a client roster, dates, figures -
    // WITHOUT setting the deliverable's structure. This is why #org could not name the
    // team heads: the roster lived only in these bodies, and they were suppressed for
    // artifacts. Now injected for artifacts too, but supplementary, so the manifest leads.
    // 2026-10-01 (plan Stage 1.1, audit B1, UNIFIED_VISION phase 5): bulk article bodies are
    // injected ONLY when the manifest produced no grounding at all (the explicit empty-manifest
    // fallback the vision allows). When the manifest pack is present it is the one evidence
    // producer; named documents reach it through the by-name tier, so the "roster facts" case
    // that justified the supplementary block is served with pointers and provenance instead.
    const _manifestLeads = !!(ctx.manifestChunkCorpus && ctx.manifestChunkCorpus.length > 80);
    if (!_manifestLeads && ctx.prefetchedArticlesBlock && ctx.prefetchedArticlesBlock.length > 200) {
        parts.push(`=== ARTICLE BODIES (empty-manifest fallback: the manifest returned no grounding for this question) ===`);
        parts.push(ctx.prefetchedArticlesBlock);
        parts.push(`=== END ARTICLE BODIES ===`);
    }

    // Raw corpus - model-specific cap.
    // 2026-05-30 - OBJECTIVE-RELEVANCE: when goal-blended pre-fetched article
    // bodies are present (the fixed /api/wiki/fetch-articles cosine retrieval),
    // DEMOTE the raw corpus to a small supplementary tail so it cannot drown the
    // objective-relevant evidence (the old behavior dumped the entire corpus,
    // making the retrieval merely additive). Only when retrieval returned nothing
    // do we fall back to the full corpus, so the chat is never starved.
    // 2026-06-09 - manifest-chunk corpus ALSO triggers demotion (it is the new
    // primary evidence; the bulk corpus must not drown it).
    if (ctx.corpusText && !_manifestLeads) {
        // Stage 1.1: the raw corpus tail is the empty-manifest fallback only; with manifest grounding
        // present it no longer rides along (it was 40KB of un-pointered text on every artifact).
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
// 2026-10-01 (Stage 6.1): generated from the catalog (ownerSkill per entry); `#presentation` now
// resolves to deck-composer (deck-narrative-composer is deleted).
const HASHTAG_TO_SKILL_ID: Record<string, string> = CATALOG_HASHTAG_TO_SKILL_ID;

// Aliases the user may type (registry .aliases + common plurals). These
// resolve to the SAME owning skill as the canonical hashtag.
const HASHTAG_ALIASES: Record<string, string> = CATALOG_HASHTAG_ALIASES;

// Hashtags that are MODIFIERS, not directives. Their presence does NOT
// select a skill - they decorate whichever directive was chosen.
const HASHTAG_MODIFIERS: ReadonlySet<string> = CATALOG_MODIFIER_TOKENS;

/**
 * Extract registered hashtag directives from a user message. Returns the
 * owning skill IDs in document order. Unrecognized hashtags are returned
 * separately so the caller can warn the user. When an unrecognized hashtag
 * has a strong fuzzy match in the registry (score >= 80 - id-prefix match),
 * it is auto-promoted to the directive so the user's near-miss intent
 * still routes correctly. Borderline matches (score < 80) stay in the
 * unknown list with a "did you mean" suggestion.
 */
function extractHashtagDirectives(userMessage: string): {
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
        if (HASHTAG_MODIFIERS.has(raw) || isCatalogModifier(raw) || isCatalogModifier(m[0].toLowerCase())) continue;
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
        // 2026-06-14 - defensive: a manifest entry may omit `triggers` (e.g. a
        // quality-enhancer that only composes_with, never keyword-matches). Iterating
        // undefined threw "triggers is not iterable" and crashed matchSkills on every
        // chat turn. Quality enhancers with no triggers simply score 0 here and load
        // via composes_with instead.
        for (const trigger of (skill.triggers || [])) {
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

// 2026-10-01 (Stage 6.3 / A9): INLINE_SKILL_TEMPLATES is deleted. Skill bodies live on disk under
// .claude/skills (served at /skills/); the manifest's remaining inline:// entries resolve to the
// minimal stub below, and case-study-analyst points at its disk SKILL.md.

export async function loadSkillContext(skill: SkillManifestEntry): Promise<SkillContext> {
    const cached = _skillContextCache.get(skill.id);
    if (cached) return cached;

    // 2026-05-26 - Inline-template skills (path = "inline://<template-name>")
    // are in-memory; do NOT fetch. The skill manifest uses inline:// for
    // skills whose body is embedded in the dispatcher (case-study-analyst,
    // block-quote, benchmark-reporter etc.). Calling fetch() on a custom
    // URL scheme throws "Fetch API cannot load inline://..." in browsers.
    // Resolve inline:// manifest entries to the minimal stub body (Stage 6.3), or fall back
    // to a minimal stub keyed on the skill id. Either way, NEVER fetch.
    if (skill.path?.startsWith('inline://')) {
        const templateName = skill.path.slice('inline://'.length);
        const inlineBody = `# ${skill.name}\n\n${skill.description || ''}\n\nTriggers: ${(skill.triggers || []).join(', ')}\n`;
        const ctx: SkillContext = { skill, skillContent: inlineBody, companionContent: '' };
        _skillContextCache.set(skill.id, ctx);
        return ctx;
    }

    // 2026-06-14 - HARDENING: a manifest entry with no `path` (or a non-string path)
    // must NEVER crash the whole chat turn. Before this guard, a missing `path` slipped
    // past the inline:// check above (undefined?.startsWith -> falsy) and threw
    // "Cannot read properties of undefined (reading 'replace')" at skill.path.replace
    // below, killing every chat turn (the human-voice-editor entry shipped without a
    // path). Fall back to a description-only stub keyed on the skill id, same shape as
    // the inline fallback. Sister fix to the `triggers || []` guard in matchSkills.
    if (typeof skill.path !== 'string' || !skill.path) {
        const stub = `# ${skill.name || skill.id}\n\n${skill.description || ''}\n`;
        const ctx: SkillContext = { skill, skillContent: stub, companionContent: '' };
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
    // GUARD (2026-06-15): a skill-manifest entry missing `wikiCompanions` /
    // `benchmarks` threw "TypeError: wikiCompanions is not iterable" on every
    // chat turn (unhandledrejection caught live in Playwright). Same crash-class
    // as the missing-path / missing-triggers manifest bugs - skillReferences was
    // already guarded with `|| []`; these two were not. Defensive transport.
    for (const companion of (skill.wikiCompanions || [])) {
        fetches.push(
            fetch(`/hic-workspace/wiki/${companion}`).then(r => r.ok ? r.text() : '').catch(() => '')
        );
    }

    // Fetch benchmark companions
    for (const benchmark of (skill.benchmarks || [])) {
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

function renderDeliverableJsonReply(text: string): string {
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

// SLIDES-deck archetype catalog (Figma 609). Fetched at runtime - the SAME #proto mechanism
// (fetchProtoComponentManifest): the model COMPOSES a deck from the manifest, so adding/altering an
// archetype is a manifest edit with ZERO code change. Cached per session; fail-open (empty -> the
// model falls back to the legacy GOLD templates rather than erroring).
let _slidesManifestCache: string | null = null;
// 2026-07-03 (owner-directed): the infographic-composer skill carries the per-family DEPTH
// contracts for slides:infographic-exhibit (two-layer elements, cited stats, family-by-data-shape).
// Injected whole into DECK MODE so infographic payloads arrive data-dense, never bare labels.
let _infographicSkillCache: string | null = null;
let _deckComposerSkillCache: string | null = null;
async function fetchDeckComposerSkill(): Promise<string> {
    if (_deckComposerSkillCache !== null) return _deckComposerSkillCache;
    for (const url of ['/skills/deck-composer/SKILL.md',
                       `${PROXY_BASE}/api/file?path=.claude/skills/deck-composer/SKILL.md`]) {
        try {
            const r = await fetch(url);
            if (r.ok) {
                const t = await r.text();
                const body = t.startsWith('{') ? String((JSON.parse(t) || {}).content || '') : t;
                if (body && body.length > 400) { _deckComposerSkillCache = body; return body; }
            }
        } catch { /* try next */ }
    }
    _deckComposerSkillCache = '';
    return '';
}

async function fetchInfographicSkill(): Promise<string> {
    if (_infographicSkillCache !== null) return _infographicSkillCache;
    for (const url of ['/skills/infographic-composer/SKILL.md',
                       `${PROXY_BASE}/api/file?path=.claude/skills/infographic-composer/SKILL.md`]) {
        try {
            const r = await fetch(url);
            if (r.ok) {
                const t = await r.text();
                const body = t.startsWith('{') ? String((JSON.parse(t) || {}).content || '') : t;
                if (body && body.length > 400) { _infographicSkillCache = body; return body; }
            }
        } catch { /* try next */ }
    }
    _infographicSkillCache = '';
    return '';
}

async function fetchSlidesArchetypeManifest(): Promise<string> {
    if (_slidesManifestCache !== null) return _slidesManifestCache;
    try {
        const r = await fetch(`${PROXY_BASE}/api/wiki/read-article/${encodeURIComponent('design-system/slides-component-manifest.md')}`);
        if (r.ok) {
            const j = await r.json().catch(() => null);
            _slidesManifestCache = (j && (j.content || j.body || j.markdown)) ? String(j.content || j.body || j.markdown) : '';
        } else { _slidesManifestCache = ''; }
    } catch { _slidesManifestCache = ''; }
    return _slidesManifestCache;
}

// EXEMPLAR CONTRACT (2026-08-07): lives in services/exemplarContract.ts (shared with the
// Designer desk builders); consumed below on every artifact turn.

// E5 (2026-07-02, artifact-total-elevation) - COMPONENT-SPEC RETRIEVAL. The component registry
// (wiki brand/figma-node-map.md) has been manifest-chunked since 6/23 but NOTHING retrieved it at
// generation time, so the model composed slides from prose memory of the bricks instead of their
// actual anatomy + image slots. This reads the registry page once per session and, per artifact
// request, extracts ONLY the sections relevant to the message's directives (keyword-matched on the
// '## ' section headings), capped, and appends them to the design-system rules block. Fail-open.
let _nodeMapCache: string | null = null;
async function fetchComponentSpecBlock(userMessage: string): Promise<string> {
    try {
        if (_nodeMapCache === null) {
            const r = await fetch(`${PROXY_BASE}/api/wiki/read-article/${encodeURIComponent('brand/figma-node-map.md')}`);
            if (r.ok) {
                const j = await r.json().catch(() => null);
                _nodeMapCache = (j && (j.content || j.body || j.markdown)) ? String(j.content || j.body || j.markdown) : '';
            } else { _nodeMapCache = ''; }
        }
        if (!_nodeMapCache) return '';
        // Directive -> registry-section keywords. A section is kept when its heading matches any
        // keyword for a directive present in the message (plus 'image-slot' rows for slot anatomy).
        const TAG_KEYS: Array<[RegExp, string[]]> = [
            [/#slides?\b/i, ['slides', 'archetype', 'cover', 'divider']],
            [/#journey\b/i, ['journey']],
            [/#blueprint\b/i, ['blueprint']],
            [/#personas?\b/i, ['persona']],
            [/#themes?\b/i, ['theme']],
            [/#recs?\b|#recommendations?\b/i, ['recommendation']],
            [/#strategy\b/i, ['strategy']],
            [/#competitive\b/i, ['competitive']],
            [/#case-stud(y|ies)\b/i, ['case-study', 'case study']],
            [/#roadmap\b/i, ['roadmap', 'timeline']],
            [/#gap\b/i, ['gap']],
            [/#audit\b/i, ['audit']],
            [/#arch\b/i, ['architecture']],
            [/#org\b/i, ['org']],
            [/#prd\b/i, ['prd']],
            [/#brief\b|#explainer\b|#report\b/i, ['brief', 'executive', 'explainer', 'report']],
            [/#mindmap\b/i, ['mindmap', 'mind map']],
            [/#meta-themes\b/i, ['meta-theme']],
        ];
        const keys = TAG_KEYS.filter(([re]) => re.test(userMessage)).flatMap(([, ks]) => ks);
        if (keys.length === 0) return '';
        const sections = _nodeMapCache.split(/\n(?=## )/);
        const kept: string[] = [];
        for (const s of sections) {
            const head = (s.split('\n', 1)[0] || '').toLowerCase();
            // Program sections named for the artifact (JOURNEY IN-TABLE REDESIGN, THEMES OVERVIEW...)
            // ride whole; the cross-artifact REGISTRY/AUDIT tables contribute only THIS artifact's
            // rows (heading + table header + matching lines) - the full tables are 10x the budget.
            if (/component registry|image-slot registry|image audit|emotive slots|content archetypes/.test(head)) {
                const lines = s.split('\n');
                const rows = lines.filter((l, i) => i < 4 || keys.some(k => l.toLowerCase().includes(k)));
                if (rows.length > 4) kept.push(rows.join('\n'));
            } else if (keys.some(k => head.includes(k))) {
                kept.push(s);
            }
        }
        if (kept.length === 0) return '';
        let block = kept.join('\n');
        if (block.length > 7000) block = block.slice(0, 7000) + '\n[component-spec block truncated]';
        return `\n\n=== COMPONENT REGISTRY SPECS (brand/figma-node-map.md - the ACTUAL brick anatomy + image slots for this artifact; compose against these, never prose memory) ===\n${block}`;
    } catch { return ''; }
}

/** 2026-07-08 (live NFP feedback failure: HTTP 400 "input token count exceeds 1048576"):
 * chat messages that carry baked images (the heuristic critique deck embeds annotated
 * screenshots + proposed renders as data: URIs inside slide fences) must NEVER replay
 * their base64 into a model prompt - 13 screens of baked PNGs is ~20MB of text. ONE
 * chokepoint: every history turn and the outgoing message are scrubbed before any
 * provider payload (also covers the pre-compaction summarizer). The UI keeps the real
 * message objects; only the model-facing copies are scrubbed. */
const DATA_URI_RX = /data:[a-zA-Z0-9.+/-]+;base64,[A-Za-z0-9+/=]{256,}/g;
// non-global twin for detection (a /g regex's .test() is stateful via lastIndex)
const DATA_URI_TEST = /data:[a-zA-Z0-9.+/-]+;base64,[A-Za-z0-9+/=]{256,}/;
export function stripDataUris(text: string): string {
    return (text || '').replace(DATA_URI_RX, '[embedded image omitted]');
}

export async function sendChatMessage(
    model: ChatModel,
    userMessage: string,
    conversationHistory: ChatMessage[],
    context: ChatContext,
    opts?: { signal?: AbortSignal; onProgress?: (status: string) => void },
): Promise<ChatMessage> {
    const startTime = Date.now();
    // E2.2: candidate theses surfaced to the UI so the user can take a different one.
    let _thesisCandidatesForUi: ReturnType<typeof parseThesisOptions>['candidates'] | undefined;
    // DF-A2: one enrichment ledger per turn. Every best-effort grounding step
    // below records a typed envelope into it, so a deck generated without design
    // tokens, without the exemplar contract, or without manifest grounding is
    // DISTINGUISHABLE in the durable record from one that had all three. It used
    // to be a console.warn and nothing else.
    const _genTurnId = beginGenerationLedger(`turn_${startTime}`);
    if (DATA_URI_TEST.test(userMessage)) userMessage = stripDataUris(userMessage);
    if (conversationHistory.some(m => DATA_URI_TEST.test(m.content))) {
        const before = conversationHistory.reduce((n, m) => n + m.content.length, 0);
        conversationHistory = conversationHistory.map(m =>
            DATA_URI_TEST.test(m.content) ? { ...m, content: stripDataUris(m.content) } : m);
        const after = conversationHistory.reduce((n, m) => n + m.content.length, 0);
        console.log(`[chat] scrubbed embedded images from history for the model payload (${Math.round((before - after) / 1024)}KB removed)`);
    }
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

    // V4 (2026-08-07, sota-elevation plan) - DIRECTIVE-TO-CONSTRAINT COMPILER.
    // Imperatives in the user's turn ("don't use the transcript", "more
    // graphics", "use it again") compile into typed SESSION constraints that
    // are enforced deterministically downstream (chunkRetrieval exclusion
    // filter, deckPlanGate visual floor) and persist for the whole session
    // until lifted (owner decision 7). The echo-back below makes enforcement
    // visible; it is prepended to the reply just before return.
    let _v4Echo = '';
    let _v4Constraints: import('./sessionConstraints').SessionConstraints | undefined;
    try {
        const sc = await import('./sessionConstraints');
        const _slug = (typeof window !== 'undefined' ? (window as any).__hicCurrentEngagementSlug : '') || '';
        const compiled = sc.compileDirectives(userMessage, _slug);
        _v4Constraints = compiled.constraints;
        if (compiled.changed) {
            _v4Echo = sc.describeEnforcement(compiled.constraints, compiled.turnActions);
            sc.noteDirectiveEnforcement(_slug, compiled.turnActions.length);
            console.info(`[chat][V4] session constraints updated: ${compiled.turnActions.join(' | ')}`);
        } else if (_v4Constraints.excludeSources.length || _v4Constraints.visualQuotaFloor !== undefined) {
            // Standing constraints stay visible on artifact turns so the user
            // never wonders whether an earlier ask is still enforced.
            if (isArtifactGenerationMessage(userMessage)) {
                _v4Echo = sc.describeEnforcement(_v4Constraints);
            }
        }
    } catch { /* constraints unavailable = pre-V4 behavior */ }

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
            noteGenerationStep(ok('gen:plannedRetrieval', planResult.final_count));
            console.log(`[Chat Wire 4] multi-angle: ${planResult.plan.sub_queries.length} sub-queries → ${planResult.post_dedup_count} merged → ${planResult.final_count} reranked`);
        } catch (err: any) {
            // Non-blocking: if the planner fails, chat falls back to its
            // original single-shot retrieval. Surfaced in console only.
            noteGenerationStep(fail('gen:plannedRetrieval', err));
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
    // 2026-06-12 - was SUPPRESSED for artifact generations (standing rule
    // feedback_deliverables_manifest_wiki_not_rag): deliverables ground via manifest
    // chunk pointers. 2026-06-16 - RE-ENABLED for artifacts: the suppression made the
    // artifact path BLIND to factual content that lives only in article bodies (the
    // real names/titles of team leaders in a client roster), so #org could only emit
    // anonymized codes (C01-C10) from the anonymized interview chunks even though the
    // names existed in the selected corpus and plain chat could read them. The anti-RAG
    // rule is now honored by PLACEMENT, not suppression: buildGroundingContext puts the
    // manifest PRIMARY block FIRST (it drives structure/insights) and demotes this
    // pre-fetch to a SUPPLEMENTARY factual-reference tail. So artifacts get the facts
    // without bulk RAG driving the deliverable.
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
            // 2026-06-16 - ARTIFACT path gets a LEAN pre-fetch (8 bodies / ~48KB),
            // plain chat keeps the full pre-roll (20 / ~200KB). Rationale: for a
            // deliverable the manifest PRIMARY block leads and these bodies are only a
            // SUPPLEMENTARY factual reference (resolving real names/titles the manifest
            // pack misses), so a lean budget gives the facts without re-introducing the
            // bulk-RAG dilution + cost the anti-RAG rule warns about. Plain Q&A still
            // benefits from the denser pre-roll.
            const _isArtifact = isArtifactGenerationMessage(userMessage);
            const prefetchedArticles = await Promise.race([
                prefetchArticlesForMessage(userMessage, {
                    limit: _isArtifact ? 8 : 20,
                    maxCharsPerArticle: _isArtifact ? 6_000 : 12_000,
                    minChars: 500,
                    engagementGoal,
                    goalBlendWeight: 0.30,
                }),
                new Promise<any[]>(resolve => setTimeout(() => resolve([]), 8000)),
            ]);
            if (prefetchedArticles && prefetchedArticles.length > 0) {
                // DF-H1 + DF-C2 (2026-08-21) - THE TWO-TIER RULE, APPLIED WHERE THE
                // BODIES ACTUALLY REACH THE MODEL.
                //
                // This pre-fetch used to take whatever the ranked query returned and
                // hand it to a formatter that cut it off at a character count. Two
                // problems, both invisible in the log line above: the ranked order is
                // global, so a densely-covered angle could take every slot and starve
                // a thin one; and the cut was blind, so a thin deck could not be told
                // from a truncated corpus.
                //
                // Selection is now per sub-question (the objective supplies the
                // angles), and the cut is budgeted with a TYPED synopsis that names
                // what was elided and tells the model the block is a sample.
                const { selectForFullText } = await import('./extractionTier');
                const { applyStepBudget, renderSynopsis } = await import('./stepBudget');
                const _angles = String(engagementGoal || userMessage)
                    .split(/[.;?]|\band\b/i)
                    .map(a => a.trim())
                    .filter(a => a.length > 12)
                    .slice(0, 5);
                const _candidates = prefetchedArticles.map((a: any, i: number) => ({
                    id: String(a?.path || a?.slug || `art_${i}`),
                    title: String(a?.title || ''),
                    snippet: String(a?.body || a?.content || ''),
                    sourceName: String(a?.sourceName || a?.source || ''),
                    score: typeof a?.score === 'number' ? a.score : undefined,
                    // Round-robin the ranked list across the angles so each angle
                    // gets its own slots. With no angles every article shares one
                    // bucket, which is exactly the old global behavior.
                    subQuestionId: _angles.length ? `angle_${i % _angles.length}` : 'all',
                    fullText: String(a?.body || a?.content || ''),
                }));
                const _selection = selectForFullText(_candidates, {
                    perSubQuestion: _isArtifact ? 3 : 6,
                    totalCap: _isArtifact ? 8 : 20,
                });
                const _keepIds = new Set([..._selection.alreadyFull, ..._selection.capture].map(c => c.id));
                const _kept = _keepIds.size
                    ? prefetchedArticles.filter((a: any, i: number) =>
                        _keepIds.has(String(a?.path || a?.slug || `art_${i}`)))
                    : prefetchedArticles;
                const _raw = formatArticlesAsCorpusBlock(_kept, 1_000_000);
                const _budgeted = applyStepBudget(_raw, {
                    kind: 'article_bodies',
                    itemsTotal: prefetchedArticles.length,
                    separator: '\n\n---\n\n',
                    budget: _isArtifact ? 48_000 : 200_000,
                });
                const block = _budgeted.text + renderSynopsis(_budgeted.synopsis);
                if (block.length > 200) {
                    context = { ...context, prefetchedArticlesBlock: block };
                    noteGenerationStep(ok('gen:wikiPrefetch', _kept.length));
                    console.log(`[chat] wiki pre-fetch: ${_kept.length}/${prefetchedArticles.length} article bodies over `
                        + `${_angles.length || 1} angle(s) (${Math.round(block.length / 1024)}KB`
                        + `${_budgeted.synopsis ? `, ${_budgeted.synopsis.itemsShown} shown of ${_budgeted.synopsis.itemsTotal}, remainder elided with a synopsis` : ', within budget'}`
                        + `${_selection.starved.length ? `, ${_selection.starved.length} angle(s) starved` : ''})`);
                }
            }
        } catch (err: any) {
            noteGenerationStep(fail('gen:wikiPrefetch', err));
            console.warn('[chat] wiki pre-fetch skipped:', err?.message || err);
        }
    }

    // 2026-06-09 - FIGMA-LIVE DESIGN TOKENS (never hardcoded). Fetch the brand's
    // tokens from the proxy /api/design-tokens (sourced from Figma via MCP on the
    // token-sheet nodes 223:2/97:2) and inject as nxtDesignSystemRules so
    // buildGroundingContext carries the real token values into the Analyst Desk +
    // Designer Chat prompt. Additive + non-fatal: on any failure the model still
    // has its inline brand guidance. This replaces reliance on hardcoded hex.
    if (!context.nxtDesignSystemRules) {
        // 2026-10-01 - ONE brand resolver (hashtagParser.brandVariantOf) so #NXT / #NU / #DECIEM all
        // reach the same /api/design-tokens?brand= feed. The bare "northeastern" alias stays NU.
        const brandTag: BrandVariantId = brandVariantOf(userMessage) === 'NXT' && /northeastern/i.test(userMessage)
            ? 'NU'
            : brandVariantOf(userMessage);
        const TOKENS_UNAVAILABLE = `=== FIGMA DESIGN TOKENS (${brandTag}) UNAVAILABLE ===\nThe live Figma token source could not be reached. Do NOT invent or hardcode any hex code, font, or spacing value. State that brand tokens are unavailable.`;
        try {
            const tokResp = await fetch(`${PROXY_BASE}/api/design-tokens?brand=${brandTag}&format=prompt`);
            if (tokResp.ok) {
                const tokBlock = await tokResp.text();
                if (tokBlock && tokBlock.length > 40) {
                    context = { ...context, nxtDesignSystemRules: tokBlock };
                    noteGenerationStep(ok('gen:designTokens', tokBlock.length));
                    console.log(`[chat] Figma-live design tokens injected for ${brandTag} (${tokBlock.length} chars)`);
                } else {
                    context = { ...context, nxtDesignSystemRules: TOKENS_UNAVAILABLE };
                    console.error(`[chat] Figma design-tokens returned empty for ${brandTag} - NOT falling back to hardcoded values.`);
                }
            } else {
                context = { ...context, nxtDesignSystemRules: TOKENS_UNAVAILABLE };
                console.error(`[chat] Figma design-tokens HTTP ${tokResp.status} for ${brandTag} - NOT falling back to hardcoded values.`);
            }
        } catch (err: any) {
            context = { ...context, nxtDesignSystemRules: TOKENS_UNAVAILABLE };
            noteGenerationStep(fail('gen:designTokens', err));
            console.error('[chat] Figma design-tokens fetch FAILED - NOT falling back to hardcoded values:', err?.message || err);
        }
    }

    // E5 (2026-07-02) - COMPONENT-SPEC RETRIEVAL: slide/HTML artifact requests additionally carry
    // the registry sections for their bricks (anatomy + image slots) so the model composes against
    // the ACTUAL component contract. Rides the existing nxtDesignSystemRules carrier (converge,
    // no new prompt plumbing); additive + fail-open.
    if (messageTargetsArtifact(userMessage)) {
        try {
            const specBlock = await fetchComponentSpecBlock(userMessage);
            if (specBlock) {
                context = { ...context, nxtDesignSystemRules: (context.nxtDesignSystemRules || '') + specBlock };
                noteGenerationStep(ok('gen:componentSpec', specBlock.length));
                console.log(`[chat] E5 component-spec retrieval: ${specBlock.length} chars of registry anatomy injected`);
            }
        } catch (err: any) {
            noteGenerationStep(fail('gen:componentSpec', err));
            console.warn('[chat] E5 component-spec retrieval skipped:', err?.message || err);
        }
        // EXEMPLAR CONTRACT (2026-08-07): the hashtag's Figma exemplar anatomy is consulted
        // BEFORE composition on every artifact turn; consultation is logged for the L1 ledger.
        try {
            const { fetchExemplarContract, noteExemplarConsultation } = await import('./exemplarContract');
            const exemplarBlock = await fetchExemplarContract(userMessage);
            if (exemplarBlock) {
                context = { ...context, nxtDesignSystemRules: (context.nxtDesignSystemRules || '') + exemplarBlock };
                noteGenerationStep(ok('gen:exemplarContract', exemplarBlock.length));
                console.log(`[chat] exemplar-contract consulted: ${exemplarBlock.length} chars injected (design-system/exemplar-manifest.md)`);
                noteExemplarConsultation();
            }
        } catch (err: any) {
            noteGenerationStep(fail('gen:exemplarContract', err));
            console.warn('[chat] exemplar-contract retrieval skipped:', err?.message || err);
        }
    }

    // 2026-06-09 - MANIFEST-CHUNK GROUNDING (the new engine, intent A.1). Before
    // building the prompt, pre-rank the engagement's manifest chunk catalog
    // against the user's message (+ research goal as extra context), resolve the
    // selected pointers to verbatim spans, and render a cite-by-pointer corpus
    // block. buildGroundingContext then LEADS with this and demotes the bulk
    // corpusText to a tail. Non-fatal + fail-LOUD: on empty/err we leave
    // manifestChunkCorpus unset and the bulk-corpus path stands (never silently
    // claims manifest grounding when it did not happen).
    // Stage-3/D11: capture the resolved grounding chunks at function scope so the slide-deck artifact
    // path (which does NOT flow through emitDeliverable) can emit an AIR with a REAL evidence ledger below.
    let _airGroundingChunks: any[] = [];
    if (!context.manifestChunkCorpus) {
        try {
            const _slug = currentEngagementSlug();
            if (_slug) {
                const _picked = await pickChunksForPrompt(userMessage, _slug, {
                    extraContext: context.researchGoal || '',
                    // 2026-06-16 FIX (#org "no data" despite data existing): the tier-1.5
                    // objective-ranked admission ranks the WHOLE-WIKI candidate pool by this
                    // objective. Passing the GOAL alone meant a SPECIFIC deliverable request
                    // (e.g. "#org the client organization Operations, spend, customers relations teams")
                    // could not admit request-relevant chunks the engagement's KL selection /
                    // goal did not already cover - so the org/reporting evidence (present in the
                    // wiki) was never in the candidate pool, the MMR pack could not select it,
                    // and Opus refused with "no data" even though the data EXISTS. Blend the
                    // user's request INTO the admission objective (request leads, goal as
                    // context) so the request pulls its own matching corpus into the pool; the
                    // MMR pack still ranks the FINAL selection by userMessage + goal. Capped for
                    // the chunks-by-goal URL query param.
                    researchObjective: [userMessage, context.researchGoal || ''].filter(Boolean).join('\n').slice(0, 800),
                    // 2026-08-26 (owner report, live: 300+ sequential /api/wiki/read calls
                    // measured on a plain chat question before the model was ever invoked).
                    // 30K tokens was sized for full artifact generation (a deck needs broad,
                    // diverse evidence); a conversational answer does not, and MMR's
                    // source-type-balance diversification was spreading that budget across
                    // hundreds of distinct pages on a large corpus, each requiring its own
                    // resolveChunks() network round trip BEFORE retrieval even finished.
                    // Manifest grounding itself stays on for chat (anti-RAG principle,
                    // unchanged) - only the budget shrinks to match what a chat answer
                    // actually needs, the same reasoning already applied to maxOutputTokens
                    // for chat vs. deliverable Gemini calls just above in this file.
                    tokenBudget: messageTargetsArtifact(userMessage) ? 30_000 : 6_000,
                });
                // 2026-06-25 - BY-NAME honesty floor. If the user named specific
                // document(s), tell the model which were FOUND (answer from their
                // pointer-cited chunks) and which were NOT (say so; never fabricate a
                // source). This kills the documented `(Source: Gemini)` hallucination
                // when a named doc misses retrieval.
                const _matched = _picked.namedRefsMatched || [];
                const _missing = _picked.namedRefsMissing || [];
                if (_matched.length || _missing.length) {
                    const _noteLines: string[] = [];
                    if (_matched.length) {
                        _noteLines.push(`FOUND in the corpus (answer from their chunks below, cite by [wikiPath#cN]): ${_matched.map(t => `"${t}"`).join(', ')}.`);
                    }
                    if (_missing.length) {
                        _noteLines.push(`NOT FOUND in the corpus: ${_missing.map(t => `"${t}"`).join(', ')}. For these, state plainly that the document is not in the current corpus and offer to ingest it. Do NOT summarize it from memory, do NOT infer its contents, and NEVER attribute a claim to a model name or a generic source (e.g. "Source: Gemini") - that is a fabrication.`);
                    }
                    context = { ...context, namedDocNote: _noteLines.join('\n') };
                    console.log(`[chat] BY-NAME: matched=${JSON.stringify(_matched)} missing=${JSON.stringify(_missing)}`);
                }
                if (_picked.chunkIds.length > 0) {
                    const _resolved = await resolveChunks(_picked.chunkIds);
                    if (_resolved.chunks.length > 0) {
                        // 2026-07-01 quality: drop bot/moderator boilerplate + tombstones BEFORE they ground the
                        // generation (live AIR showed "I am a bot..." cited as evidence). Shared predicate with the
                        // evidence ledger. Never let the filter empty the corpus - if all were junk, keep the raw set.
                        const { isNonEvidenceChunk } = await import('./evidenceLedgerService');
                        const _clean = _resolved.chunks.filter((c: any) => !isNonEvidenceChunk(c?.text));
                        // 2026-10-01 (plan Stage 1.2, audit F2): carry the pre-rank's normalized objective
                        // relevance (0-100) onto each resolved chunk so the AIR evidence ledger records a
                        // real objectiveScore instead of 0 on every row (the stored PRD runs read 0/55).
                        const _scoreOf = (id: string) => (_picked.scores && Number.isFinite(_picked.scores[id])) ? _picked.scores[id] : undefined;
                        const _grounding = (_clean.length > 0 ? _clean : _resolved.chunks)
                            .map((c: any) => (_scoreOf(c.id) === undefined ? c : { ...c, retrievalScore: _scoreOf(c.id) }));
                        if (_clean.length < _resolved.chunks.length) {
                            console.log(`[chat] quality: dropped ${_resolved.chunks.length - _clean.length} non-evidence (bot/mod) chunk(s) from grounding`);
                        }
                        context = {
                            ...context,
                            manifestChunkCorpus: assembleChunkCorpus(_grounding),
                        };
                        _airGroundingChunks = _grounding;  // Stage-3/D11: real AIR evidence ledger source
                        // 2026-08-21: the SAME set is what the deterministic pointer
                        // binder needs. Recorded HERE, at the artifact-grounding
                        // moment, rather than inside assembleChunkCorpus: every
                        // retrieval path calls that helper, so a later unrelated
                        // call clobbered the deck's set between prompt assembly and
                        // the chain (a live run considered 6 fields and bound 0
                        // while the same artifact binds 6 against its own set).
                        // Recorded, not swallowed (DF-A2): this projection is the
                        // pointer binder's ONLY input, and a silent failure here is
                        // what made a live deck bind zero while binding ten offline.
                        // `enrich` records the envelope itself, so no outer note.
                        await enrich('gen:groundingProjection', async () => {
                            const { noteGroundingChunks } = await import('./pointerBinder');
                            noteGroundingChunks(_grounding);
                            return _grounding.length;
                        });
                        noteGenerationStep(ok('gen:manifestGrounding', _resolved.chunks.length));
                        console.log(`[chat] MANIFEST-CHUNK grounding: ${_resolved.chunks.length} chunks from ${_resolved.sourcesRead} wiki pages (catalog=${_picked.catalogSize}, ~${_picked.estimatedTokens} tok) - leading evidence; bulk corpus demoted`);
                    } else {
                        console.warn(`[chat] MANIFEST-CHUNK grounding: ${_picked.chunkIds.length} pointers selected but 0 resolved (notFound=${_resolved.notFound.length}); falling back to bulk corpus`);
                    }
                } else {
                    console.warn(`[chat] MANIFEST-CHUNK grounding: catalog empty for "${_slug}" (mid-collection?); falling back to bulk corpus`);
                }
            }
        } catch (err: any) {
            noteGenerationStep(fail('gen:manifestGrounding', err));
            console.warn('[chat] MANIFEST-CHUNK grounding failed (non-fatal), using bulk corpus:', err?.message || err);
        }
    }

    // 2026-06-12 - FABLE FORCE-ROUTE (Jonathan's directive). Any artifact
    // hashtag (#slides, #journey, #personas, #themes, ...) routes deliverable
    // generation to Claude Opus 4.8 regardless of the picker selection; plain
    // chat keeps the user's selected model. This MUST happen BEFORE
    // buildGroundingContext so Fable's conservative maxCorpusChars budget
    // (600K chars, window unverified) governs corpus packing - a 1.4M-char
    // Gemini-budgeted corpus would overflow the assumed 200K-token window.
    // Council mode is exempt (the user explicitly opted into the 3-model fan).
    if (model !== 'council' && isArtifactGenerationMessage(userMessage)) {
        // WS-E (2026-06-30): per-deliverable routing is resolved by the ONE authority
        // aiRouter.artifactModelFor (via deliverableModelOverride). Schema/table -> gemini-3.5-flash
        // (bake-off-validated); everything else -> gemini-3.1-pro-preview (capped) / claude-opus-4-8
        // (after). Reversible via the single OPUS_CAP_ACTIVE flag in aiRouter.
        const tierOverride = deliverableModelOverride(userMessage);
        if (tierOverride && model !== tierOverride) {
            console.info(`[chat][route] Bake-off-validated tier override: ${model} -> ${tierOverride} (deliverable)`);
            model = tierOverride;
        } else if (!tierOverride && model !== CLAUDE_REASONING_MODEL) {
            // 2026-10-01 (plan Stage 4.3 / A8, D6): the fallback is the AUTHORITY's, not a local
            // literal. chooseArtifactModel reads live provider health and the key inventory
            // (quotaExhausted) and returns the model that should run plus its alternatives.
            const claudeCfg = AVAILABLE_MODELS.find(m => m.id === CLAUDE_REASONING_MODEL);
            const { chooseArtifactModel } = await import('./aiRouter');
            const _kind = primaryCatalogHit(userMessage)?.entry.templateId || 'slides';
            const decision = chooseArtifactModel(String(_kind), claudeCfg?.available ? {} : { quotaExhausted: [CLAUDE_REASONING_MODEL] });
            if (decision.selectedModel !== model) {
                console.info(`[chat][route] Artifact hashtag detected - routing authority: ${model} -> ${decision.selectedModel} (${decision.reason})`);
                model = decision.selectedModel as ChatModel;
            }
        }
    }

    // 2026-06-18 (research-run-failure-analysis P0.2) - if this artifact request carries a substantive
    // pasted spec, mark it AUTHORITATIVE so buildGroundingContext emits it above PRIMARY EVIDENCE and
    // the model builds FROM it instead of silently re-deriving from the corpus (dropping/renumbering
    // items, swapping the user's facts for corpus alternatives).
    if (!context.authoritativePaste && isArtifactGenerationMessage(userMessage)) {
        const _paste = extractAuthoritativePaste(userMessage);
        if (_paste) {
            context = { ...context, authoritativePaste: _paste };
            console.info(`[chat] AUTHORITATIVE PASTE detected (${_paste.length} chars) - user content leads; corpus demoted to corroboration`);
        }
    }

    // DF-A2, the input side of `narrow_scope`. A turn whose critical grounding
    // steps failed is told so IN THE PROMPT. Reading it after the fact in a log
    // is too late: the model has already written confident prose against a corpus
    // it never received.
    const _degradationNotice = buildDegradationNotice(buildEnrichmentRecord(_genTurnId));
    if (_degradationNotice) {
        (context as any)._evidenceDensityPreamble = `${evidenceDensityPreamble}\n${_degradationNotice}\n`;
        console.warn('[chat] grounding degraded for this turn; narrowing notice injected');
    }

    const groundingContext = buildGroundingContext(context, model);

    // Build provenance index for citation rendering
    const provenanceIndex = (context.sourceReferences || []).map(s =>
        `[${s.id}] ${s.sourceName}: "${s.title}"${s.url ? ` URL: ${s.url}` : ''}${s.date ? ` (${s.date})` : ''}`
    ).join('\n');

    // 2026-10-01 (plan R-T2): protocol for THIS turn. Deck mode (#presentation / #strategy / bare
    // #slides) injects its own archetype catalog later; a template hashtag gets only its examples;
    // plain chat gets the response-mode rules alone.
    const _tplRequested = requestedSlideTemplates(userMessage);
    const _deckModeEarly = /#presentation|#strateg/i.test(userMessage) || (/#slides?\b/i.test(userMessage) && _tplRequested.length === 0);
    const _protocolForThisTurn = _deckModeEarly
        ? deliverableProtocolFor('deck')
        : (_tplRequested.length > 0
            ? deliverableProtocolFor({ templates: _tplRequested })
            : (isArtifactGenerationMessage(userMessage) ? deliverableProtocolFor('all') : deliverableProtocolFor('none')));

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

    // E1 (2026-07-02, artifact-total-elevation): CACHE-ALIGNED PROMPT ARCHITECTURE. The system prompt is
    // assembled [STABLE CORE][marker][ENGAGEMENT BLOCK][marker][DYNAMIC grounding + short tail]. The proxy
    // converts each marker into an Anthropic cache_control breakpoint, so the stable core (rules, protocol,
    // output format, anti-slop) amortizes ACROSS engagements and the engagement block amortizes across
    // every call within one engagement. Non-Anthropic providers strip the marker at the proxy. Do NOT
    // interleave engagement-varying values into the stable core - that reorders the cache boundary.
    const CACHE_BREAK = HIC_CACHE_BREAK;

    let systemPrompt = `You are a McKinsey-trained research intelligence analyst operating in the NXT Humans Chat-Driven Research Workbench.
The research goal, live source roster, and corpus composition for THIS run are in the ENGAGEMENT CONTEXT block further below.

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
   (retail loyalty patterns for customers engagement, supply-chain orchestration
   patterns for customer pipelines, AI-lab innovation cycles for operations
   technology) are EXACTLY the kind of lateral insight an expert researcher
   curates. Embrace them.
5. When citing out-of-industry evidence, frame as PATTERN to borrow:
   GOOD: "Borrow Sephora's tiered-loyalty pattern for customers status."
   GOOD: "The retail abandoned-cart recovery playbook applies directly to
          incomplete donation flows."
   BAD: "Sephora has a tiered customers program" (implies an existing thing)

(The live ACTIVE CATEGORIES roster for this run appears in the ENGAGEMENT CONTEXT block below.)
================================================================================

=== CORPUS SOURCE COMPOSITION ===
The corpus contains content from MULTIPLE source types (the live per-type breakdown
is in the ENGAGEMENT CONTEXT block below). Every type is first-class evidence. You
MUST cite from a balanced mix - not just uploads.

SOURCE-MIX DISCIPLINE (MANDATORY):
- Uploads (client-provided PDFs, interviews, internal docs) provide CONTEXT - the client's POV, their data, their stakeholder voices
- External sources (RSS articles, jina-reader web scrapes, YouTube transcripts, Reddit threads, OpenAlex/Crossref/Semantic Scholar papers, DOAJ open-access research) provide EVIDENCE - third-party validation, peer-institution comparisons, sector benchmarks
- ≥40% of citations in any analysis MUST come from non-upload external sources
- If your draft response leans >60% on uploads, you are FAILING the source-mix discipline - REVISE before delivering
- Citations from "Industry Press", "Inside Higher Ed", "Chronicle of Higher Education", "EdSurge", "Diverse Issues in Higher Ed", YouTube customers-engagement transcripts, OpenAlex papers, and topical Reddit threads are FIRST-CLASS evidence - not optional padding
- For every theme/recommendation/persona, surface BOTH internal (upload) and external evidence - the convergence is the strategic insight

CITATION FORMAT (MANDATORY):
[SOURCE_NAME: "Article Title"]
Examples: [Industry Press: "Universities Struggle with Skills Gap"], [Reddit r/spend: "nonprofit laid off staff due to funding cuts"], [YouTube: "Peer D Customers Q&A - Customer Engagement Panel 2025"], [OpenAlex: Smith et al. 2024]

ANTI-HALLUCINATION RULES (STRICTLY ENFORCED):
- Answer ONLY from evidence that EXISTS in the corpus below, EXCEPT when an "AUTHORITATIVE SOURCE CONTENT" block is present above: that block is user-supplied ground truth, and its facts, figures, dates, and quotes ARE permitted and TAKE PRECEDENCE even if the corpus phrases them differently or does not contain them - never swap a user-supplied fact for a corpus alternative. Absent such a block, do not invent, fabricate, or extrapolate.
- NEVER fabricate URLs. You may ONLY include a URL if it appears verbatim in the SOURCE PROVENANCE INDEX or the RAW RESEARCH CORPUS above. If no URL exists for a source, cite it by name only WITHOUT a URL.
- NEVER invent case studies, institutions, dollar amounts, percentages, or quotes that are not explicitly present in the corpus. If the corpus contains 3 case studies, you have 3 case studies - not 10.
- NEVER generate plausible-looking article URLs by pattern (e.g., highereddive.com/news/fake-slug/123456). A fabricated URL is worse than no URL.
- EVERY factual claim MUST include a [SOURCE_NAME: "Article Title"] citation matching an actual source in the provenance index.
- When quoting, use EXACT words from the corpus. Do not paraphrase and present it as a quote.
- If the corpus does not contain enough evidence to answer the question, say explicitly: "The collected data contains limited evidence on this topic. Here is what was found:" and cite ONLY what actually exists.
- When asked for "top N" or "N case studies", only provide as many as actually exist in the corpus. If only 4 exist, provide 4 - never pad to reach the requested number.

ON-DEMAND WIKI RETRIEVAL (function-calling - used by Gemini Pro on this branch):
You have the fetch_wiki_articles tool. The in-prompt corpus is always capped by the context window, but the WIKI ARCHIVE (hundreds of articles, transcripts, and documents) is queryable end-to-end via this tool. Call it BEFORE spend up on a claim, BEFORE using an article title as a quote, and BEFORE saying "the corpus is limited":

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
When retrieving evidence for a major claim, pull from MULTIPLE wiki kinds - not just uploads. The wiki has three kinds: \`article\` (RSS scrapes, jina-reader web extracts, OpenAlex papers, Reddit threads), \`transcript\` (YouTube customers transcripts, interview transcripts), \`upload\` (client PDFs).
  - For evidence/data sections: call fetch_wiki_articles(query, kind: "article") to retrieve external research first.
  - For human voice / lived-experience sections: call fetch_wiki_articles(query, kind: "transcript") to retrieve YouTube + interview content.
  - For client-context sections only: call fetch_wiki_articles(query, kind: "upload") to retrieve client PDFs.
  - DEFAULT: omit \`kind\` so all three are returned, then select balanced evidence across all of them.
If your draft answer cites only uploads, that is a violation of source-mix discipline - make additional retrievals with kind="article" and kind="transcript" before responding.

When tool results return empty or error, the archive genuinely doesn't have evidence for that claim - narrow your answer to what IS evidenced, or tell the user plainly which dimension lacks coverage in conversational prose. Do NOT fabricate. NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", or any QA-style annotation in any chat response, deliverable artifact, slide, persona, or other user-facing output. The reader is the user - not a QA dashboard.
${_protocolForThisTurn}

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
         Respect optional brand: #NU = the client organization, #DECIEM = DECIEM (black and white, Poppins Bold uppercase headlines and labels, Josefin Sans body, Nunito for tables and data, pink / cyan / purple pops), #NXT = NXT Humans (also default).
         Mark the template on the fence: :::slide template=NAME [brand=nu|deciem|nxt]

  2. Contains explicit approvable-card phrasing ("card I can approve", "approvable personas",
     "pin-able deliverables", "deliverable cards to add to the knowledge graph")?
       → CARD MODE: emit :::deliverable:TYPE blocks per the schema above.

  3. Asks for a single inline visual element (stat row, evidence callout, comparison matrix)
     without a slide context AND with explicit "inline" or "visual block" language?
       → VISUAL BLOCK MODE: emit a :::nxt:TYPE block.

  4. Otherwise (the overwhelming majority of turns): PLAIN PROSE.
       → Answer the question in plain consultant prose. Cite named sources inline.
       → Write the way a senior consultant writes a memo: short paragraphs, one idea
         each, concrete nouns. Do NOT build a markdown brochure: no ### headers, no
         **bold** walls, no decorative * bullet lists unless the user explicitly asked
         for a list. A short bulleted list is fine when the content is genuinely a list.
       → OBEY THE PLAIN-VOICE / ANTI-SLOP RULES below. They apply to prose answers
         exactly as they apply to slides. A chat reply full of slop is a HARD failure.
       → NO fences. No :::slide. No :::deliverable:. No :::nxt:.
       → The knowledge graph is already populated automatically - you don't need
         to force cards just because the user asked about personas or themes.
       → For long-form requests (manual / specification / technical guide / N-page /
         comprehensive / detailed / "ALL"), apply the LENGTH & DEPTH DISCIPLINE above.

If none of triggers 1-3 are present, mode 4 (prose) is the answer. Do not guess.
If triggers are ambiguous (e.g., user mentions "slides" in prose without #slide), stay in prose mode and OFFER to produce slides: "Add #slide if you'd like these formatted as slides."

=== PLAIN-VOICE / ANTI-SLOP RULES (apply to EVERY prose answer) ===
The reader is an expert. Write like a senior consultant, not a marketing brochure. The full NXT Humans banned-phrase list (350+ entries) is enforced on this reply downstream; do not make it work. These bans are absolute - a reply that breaks them is a hard failure, not a style nit:

- BANNED corporate-cliche and AI-slop wording: robust, seamless, leverage / leverages / leveraging, holistic, synergy, ecosystem, enterprise-grade, world-class, comprehensive, foundational, multifaceted, and the rest of the corporate-buzzword and hype family. Say the plain thing.
- BANNED verbal tics: delve, delve into, tapestry, meticulous, vibrant, garner, showcase, bolster, foster / fosters / fostering, facilitate / facilitates, utilize / utilizes (write "use"), underscore, paramount, embodies, epitomizes.
- BANNED copula-avoidance: do not dress up "is" with "serves as", "stands as", "acts as". Write "X is Y", not "X serves as a Y".
- BANNED "enhance rather than replace" and "enhance / enhances / enhancing" in your OWN voice (the verb is a tell). If a source said it verbatim, you may quote it with attribution; never narrate it yourself.
- BANNED rhetorical patterns: the "Not just X, it's Y" parallelism; snappy three-word triads; mid-sentence rhetorical questions; press-release voice ("We are excited to...").
- BANNED meta-narration: "The ultimate goal is to", "It is designed to", "successfully deployed", "plays a key / vital / crucial / pivotal role". State the thing plainly.
- NO em-dash (U+2014) and NO emoji, anywhere.
- Numbers are evidence carried by a cited quote, never a bare assertion you make.
Write subject-verb-object sentences with concrete nouns and varied openings. If you catch yourself reaching for a buzzword, say the plain thing instead.
=== END PLAIN-VOICE / ANTI-SLOP RULES ===

========================================================================
PROVENANCE LOCK - SOURCE IDENTITY IS NOT YOURS TO AUTHOR (HARD, every slide, every field)
1. Every quote, statistic, and named finding MUST carry its manifest chunk pointer ([<wikiPath>#cN]) in the same field, copied EXACTLY from the evidence provided below. No pointer = the claim does not ship as sourced content: drop it and narrow the slide around what IS evidenced.
2. NEVER author a source identity. Do not invent report titles, study names, events, speakers, or publication names. Do not rename a source to sound more fitting ("X Industry Report, 2026"). The attribution field carries ONLY the source name exactly as the evidence block states it; a runtime verifier cross-checks every attribution against the pointed chunk's recorded sources and relabels or strips mismatches.
3. NEVER reuse a real organization's name (any vendor, publisher, or body) as a source label unless THAT organization is the pointed chunk's recorded source.
4. Quotes are VERBATIM sentences from the pointed chunk. Never assemble, paraphrase-as-quote, or lightly reword. A paraphrase is prose (no quote marks) and still carries its pointer.
5. CROSS-INDUSTRY EVIDENCE IS FRAMED, NEVER PASSED OFF: when the pointed source is from a different industry than this engagement's subject, the text MUST name that industry explicitly as an analog ("a nonprofit-sector benchmark", "in asset-management distribution", "a banking risk practice") and draw the lesson across. Presenting off-industry evidence as if it were about the subject's industry is a hard failure.
========================================================================
${CACHE_BREAK}================================================================================
=== ENGAGEMENT CONTEXT (this research run) ===
================================================================================
The research goal is: "${context.researchGoal}"
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.

=== ACTIVE CATEGORIES WITH CONTENT (cite from these when relevant) ===
${categoryRoster}

=== CORPUS SOURCE COMPOSITION (live breakdown) ===
${corpusBreakdown.summary}
${manifestSummary}
${wikiResourceManifest}
${topicModelBlock}
${skillInstructions}
${provenanceIndex ? `=== SOURCE PROVENANCE INDEX (${context.sourceReferences?.length || 0} sources) ===\n${provenanceIndex}\n=== END PROVENANCE ===\n` : ''}
${CACHE_BREAK}${groundingContext}

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
        // 2026-09-30 (plan 0.5.3): the effort that callClaude will send as
        // output_config.effort. Policy floor for the artifact kind (prd/strategy/recs/
        // report -> xhigh; other evidence artifacts -> high), raised by a skill's own
        // thinkingEffort hint, never lowered by it. Plain chat on Claude gets 'medium'.
        {
            const _tplHit = primaryCatalogHit(userMessage);
            const _kind = _tplHit?.entry.templateId ? _tplHit.entry.templateId : (isArtifactGenerationMessage(userMessage) ? 'slides' : null);
            _chatEffortHint = _kind ? maxEffort(effortForArtifact(_kind), effortFromSkillHint(thinkingEffort)) : 'medium';
            _chatArtifactKind = _kind;
        }

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
                if (cfg.contextWindow.includes('200K')) return 200_000; // legacy 200K-window models
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
        // 2026-06-11 - ARTIFACT hashtags are slide-mode triggers in their own
        // right (ONE-ENGINE rule). "#journey ... #NU" with no #slides produced
        // a wall of markdown prose on Gemini 3.1 Pro because the prose default
        // applied; the artifact never rendered. An artifact hashtag IS the
        // request for the artifact. (ARTIFACT_TPL is module-scope - shared
        // with the early Fable force-route.)
        const _primaryHit = primaryCatalogHit(userMessage);
        const artifactTplHit: [RegExp, string] | undefined = _primaryHit?.entry.templateId
            ? [catalogDirectiveRegex(_primaryHit.entry.aliases), _primaryHit.entry.templateId]
            : ARTIFACT_TPL.find(([re]) => re.test(userMessage));
        const slideModeActive = /#slides?\b/i.test(userMessage) || !!artifactTplHit;
        let slideModeTpl = '(pick the template that best matches the content)';
        if (slideModeActive) {
            const tplHint = artifactTplHit ? artifactTplHit[1]
              : /#personas?\b/i.test(userMessage) ? 'persona-card'
              : /#themes?\b/i.test(userMessage) ? 'theme-overview'
              : /(#recommendations?|#recs?)\b/i.test(userMessage) ? 'recommendation'
              : /#compet/i.test(userMessage) ? 'competitive-matrix'
              : /#case/i.test(userMessage) ? 'case-study'
              : /#road/i.test(userMessage) ? 'timeline'
              : '(pick the template that best matches the content)';
            slideModeTpl = tplHint;
            // 2026-10-01 - brand id on the fence comes from the ONE resolver: nxt | nu | deciem
            const brandHint = normalizeBrandId(brandVariantOf(userMessage));
            systemPrompt += `\n\n========================================================================\nSLIDE MODE IS ACTIVE - the user's message contains #slide/#slides or an artifact hashtag. You MUST respond with one or more :::slide fenced blocks per the SLIDE OUTPUT PROTOCOL above. Default template for THIS request: ${tplHint}; brand=${brandHint}. HARD RULES: (1) NEVER answer in markdown prose - no ###, no >, no * bullets; the renderer only draws cards from :::slide fences, so prose renders as raw markdown slop. (2) If the user named a count ("5 #personas", "8 #themes"), produce that many items - theme-cluster packs up to 4 themes per block, so 8 themes = 2 blocks. (3) Every slide's JSON must be valid and match the declared template schema. (4) Citations inside slide JSON use NAMED source names, never raw file paths or .md#cNN pointers. (5) Numbers appear only inside verbatim quotes with inline attribution, never as bare assertions in titles/keyInsight/painPoints.\n========================================================================`;

            // DECK MODE (SLIDES archetype system, Figma 609). A multi-slide narrative deck
            // (#slides without a specific artifact template, OR #presentation / #strategy) is COMPOSED
            // from the registered SLIDES archetypes - the way #proto composes from its component
            // manifest. The model SELECTS + VARIES archetypes per slide and emits
            // `:::slide template=slides:<archetype>`; slideComposer renders each from the registry
            // spec (no per-archetype code). Specific artifact hashtags (#personas/#themes/#journey/...)
            // keep their GOLD templates - they are not decks.
            const deckMode = /#presentation|#strateg/i.test(userMessage) || (/#slides?\b/i.test(userMessage) && !artifactTplHit);
            // 2026-10-01 (plan D5 / Stage 4.1): remember where the deck block starts so it can be HOISTED
            // into the stable core (before the first cache breakpoint) instead of riding the dynamic
            // tail. The deck-composer skill + infographic skill + archetype manifest (~64K chars) are
            // identical for every deck of a brand; appended after the grounding they were never cached.
            const _spBeforeDeck = systemPrompt.length;
            console.info(`[chat][deck] DECK MODE ${deckMode ? 'ACTIVE - SLIDES archetype registry injected (model must vary archetypes)' : 'OFF (single artifact template: ' + slideModeTpl + ')'}`);
            if (deckMode) {
                const slidesManifest = await fetchSlidesArchetypeManifest();
                const infographicSkill = await fetchInfographicSkill();
                const deckComposerSkill = await fetchDeckComposerSkill();
                if (slidesManifest) {
                    systemPrompt += `\n\n========================================================================\nDECK MODE - COMPOSE FROM THE SLIDES ARCHETYPE REGISTRY (Figma 609)\nEVIDENCE BINDING COMES FIRST (2026-08-21: three consecutive live decks bound ZERO pointers, so a runtime gate had to narrow every factual claim away):\n  Every field that states a FACT carries the manifest pointer for that fact, in square brackets, INSIDE the same string. A field with no pointer may carry judgment, framing or a recommendation, never a fact.\n  WORKED PAIR - given the corpus span [articles/retail-dive/aa11bb22cc.md#c4] "Assistant sessions converted at a higher rate than paid search in Q3":\n    WRONG: "heading": "Assistant sessions convert better than paid search"   (a fact with no pointer; the gate strips the claim and the slide ends up weaker than the evidence you actually had)\n    RIGHT: "heading": "Assistant sessions convert better than paid search [articles/retail-dive/aa11bb22cc.md#c4]"\n  This applies to EVERY archetype and EVERY field: heading, description, intro, row cells, stat labels, quote text, takeaway. Copy the pointer character for character from the corpus block. Never invent a pointer, and never attach one to a claim that span does not support.\n  THE sourceLine / source / attribution FIELDS CARRY THE POINTER TOO. This is where four consecutive live decks failed: the model wrote a bare name ("Source: Clockwork; Recruiterflow") because the payload contract said only "sourceLine", so every downstream gate had nothing to verify. The field carries the name AND the pointer:\n    "sourceLine": "Source: Clockwork [articles/clockwork-blog/9f2a71c4de.md#c2]"\n  Several sources are semicolon-separated, each with its own pointer. A source label without a pointer is an unverifiable claim and the runtime treats it as one.\nTHIS SUPERSEDES the "SLIDE OUTPUT PROTOCOL - 18 TEMPLATES" catalog above: for THIS deck do NOT use any of those GOLD template names (persona-card, theme-cluster, recommendation, timeline, case-study, etc.). Use ONLY the SLIDES archetypes in the catalog below, EACH with the \`slides:\` prefix. A fence without \`slides:\` is a HARD FAILURE in deck mode.\nThis is a narrative DECK, composed from the registered SLIDES archetypes the same way a prototype is composed from its component manifest. For EVERY slide emit a fence of the form:\n  :::slide template=slides:<archetype> brand=${brandHint}\n  { ...payload exactly as the catalog's PAYLOAD line specifies for that archetype... }\n  :::\nThe \`slides:\` prefix is MANDATORY - it routes the slide through the registry composer. The JSON body fields MUST match the archetype's PAYLOAD contract verbatim (key names + array lengths).\n${THESIS_OPTIONS_CONTRACT}
NARRATIVE ARC - PLAN THE BUSINESS ARGUMENT FIRST (MANDATORY; this GOVERNS the whole deck, archetype choice serves it):\nA deck is ONE argument told start to finish, NOT an assortment of on-topic slides. BEFORE choosing any archetype, decide the deck's spine and make every slide advance it:\n  1. THESIS: one contestable sentence the whole deck proves (state the answer up front, Minto). Every slide ladders up to it.\n  2. ARC (Rumelt kernel + SCQA), in this order: (a) SETUP / context the audience accepts; (b) COMPLICATION / DIAGNOSIS - the central tension or failure named with evidence (why the status quo is unacceptable); (c) EVIDENCE - the themes/proof that establish the diagnosis; (d) IMPLICATION / SO-WHAT for the business; (e) GUIDING POLICY + COHERENT ACTIONS - the recommendation and the moves that follow; (f) CLOSE - the decision or ask. A landscape/outlook deck STILL resolves to "and therefore..."; never end on a flat list.\n  3. CONNECTIVE TISSUE: consecutive slides must FOLLOW from one another - read top-to-bottom the titles alone must tell the whole argument (the Partner Test). Use section-divider / thesis-interstitial to mark arc TRANSITIONS, never as filler.\n  3a. TITLE CRAFT (CONCISE + LITERAL, NO METAPHOR - HARD): every slide title is SHORT and PLAIN. Aim <= 10 words / ~70 chars, one line; state the judgment in literal business language naming the mechanism, system, actor, or proper noun. BANNED: figurative/cliche business metaphors and imagery - e.g. "front door", "trust ceiling", "the meter", "margin closes" / "closes the margin", "where value leaks", "bleeds", "...eat(s) it", "opens the door", "walk through first", "redrawing the map". Name the literal thing instead. ("funnel" terms - top/front of the funnel - are LEGITIMATE marketing vocabulary, NOT banned.) BAD (wordy + metaphor): "AI moves the retail front door from search to the assistant, but the operators who win 2026 are the ones who capture the premium before the platform tax and the trust ceiling eat it" -> GOOD (tight + literal): "AI assistants now originate retail traffic and convert better than search". BAD: "Retail 2026: The AI Front Door Opens, the Margin Closes" -> GOOD: "AI raises conversion and adds new costs in 2026". The single deck THESIS line may run one sentence longer, but the metaphor ban has NO exception: the thesis, the synthesis, and the closing/recommendation titles are where the model is most tempted to reach for "front door / trust ceiling / margin closes" - they must stay just as literal as the body titles (length latitude is NOT license for figurative language). Keep titles contestable (a named cause/change a reader could disagree with), never topic labels.\n  3b. SUBJECT DISCIPLINE - NO META-NARRATION (HARD, applies to EVERY field of EVERY slide): the deck is ABOUT THE SUBJECT (the market, product, org, audience the user named), NEVER about the deck/report itself. NEVER describe how the deck is built, structured, sequenced, or where to go next in it. BANNED as content anywhere (title, subtitle, kicker, agenda items + group labels, section-divider supporting, thesis, body): "how this deck/report is built", "where to ideate", "from diagnosis to ideation", "the framework" (as a section name), "the (2026) takeaway" (as a section name), "at a glance" (as a section name), "how might we questions" (as a LABEL - real HMW questions belong in body content, never as a TOC entry), "the through-line / the pattern behind / the section order / setting up the narrative", and any "01: <name of a deck section>" agenda item that points at the deck's OWN parts. The AGENDA (slides:agenda), if used, lists the SUBJECT'S domains in plain business language (e.g. "Customer-facing failure modes", "Operational cost drivers", "The recommended response") - each item names a real content area of the SUBJECT, never a deck-process step. cover.subtitle / section-divider.supporting / thesis state a fact about the SUBJECT, never about the document. A reader must never see that this is a generated deck or how it was assembled.\n  4. SUBSTANCE LIVES IN BODY SLIDES: the argument is carried by CONTENT-DENSE archetypes (numbered-themes, evidence-table, block-quote, org-model, stat-row with real MEANS/MATTERS) - cover/agenda/divider/thesis are CONNECTIVE, not where the content goes. A deck that is mostly sparse connective slides is WRONG and reads as empty.\n  5. If AUTHORITATIVE SOURCE CONTENT is present (a user-pasted enumerated set), build the arc AROUND it IN THE USER'S ORDER - sequence their items into setup -> diagnosis -> evidence -> so-what; never drop, merge, or reorder them.\n${buildExhibitCatalogBlock()}\nSELECTION DOCTRINE (be SMART - choose the archetype that fits each slide's content AND its role in the arc above; do NOT default to one):\n  - PLAN FIRST (mandatory): before emitting any fence, decide the archetype for EACH slide from ITS content, then emit the slides in that order. Across the deck use AT LEAST 5 DISTINCT archetypes; a deck that is mostly one archetype is WRONG.\n  - slides:numbered-themes is NOT a catch-all. It profiles EXACTLY 4 items on ONE slide (a grouped summary, e.g. four themes/plays at a glance). Use it AT MOST once or twice per deck. NEVER use it for one-subject-per-slide content, and NEVER repeat it.\n  - Map each slide to the archetype that matches its SHAPE: opener -> slides:cover; contents (6+ slides) -> slides:agenda; section break or one-line assertion -> slides:section-divider / slides:thesis-interstitial; a single deep-dive subject (one app, one capability, one role) -> slides:block-quote (hero voice) OR slides:role-needs / slides:role-recommendation (single-subject layouts); compare named subjects across criteria -> slides:evidence-table; three hard proof numbers -> slides:stat-row; a 3-part model/architecture -> slides:org-model; two contrasting forces -> slides:problem-diptych; phased plan -> slides:role-roadmap / slides:aggregate-roadmap; a 3-6 step SEQUENCE or process -> slides:flow-arc (numbered step cards with connectors - NEVER text columns for a process); 2x2 positioning or tradeoff space -> slides:quadrant (plots the named subjects); dated milestones -> slides:milestone-timeline (visual time axis); hard proof numbers with mechanism + stakes -> slides:means-matters (hero numerals + MEANS body + dark MATTERS cards + one source line; prefer this over bare stat-row when the WHY matters); a ranking or share-of distribution -> slides:ranked-bars (proportional bars); side-by-side option/vendor panels -> slides:comparison-panels; a STRUCTURAL finding that prose columns would bury (a sequence of 3-5 concrete moves, a before/after contrast, a labeled qualitative distribution, or an evidence-source mix) -> slides:infographic-exhibit (the runtime composes a NATIVE data panel from the payload's own steps/beforeAfter/stats/citations fields; never author an image URL).
  - VISUAL FLOOR (2026-07-09, gate-enforced): at least 40% of BODY slides (everything except cover/agenda/divider/thesis/scene) use VISUAL archetypes - flow-arc, quadrant, milestone-timeline, means-matters, ranked-bars, comparison-panels, evidence-table, stat-row, aggregate-roadmap, or infographic-exhibit. Content with SHAPE (a sequence, a comparison, a ranking, a position, a timeline, hard numbers) MUST land on its matching visual archetype, never a text-column layout. A deterministic gate re-asks when the deck under-shoots; compose visual the first time. slides:infographic-exhibit stays capped at 3 per deck and only with real evidenced fields.\n  - INFOGRAPHIC DEPTH (HARD, 2026-07-03): every steps[]/actions[] entry is an OBJECT { "title": <the move, <=45 chars>, "description": <one concrete line naming the actor/system/mechanism, <=90 chars> } - NEVER a bare name string. A step without its description renders as an empty card; compress the idea, never omit the line.\n  - RUNTIME PHOTOGRAPHIC IMAGERY (2026-07-03): the runtime fills content-derived editorial photography AFTER generation - a full-bleed scene behind the cover (continued behind the agenda), an environmental thumbnail per numbered-themes item, and an environmental portrait on role-needs. The scenes are derived from YOUR OWN payload text (title/subtitle, item name+body, persona.name), so write those fields as CONCRETE, DEPICTABLE subject language (name the actor, place, or system - whatever domain the corpus is about). PERSONA DEPICTION (2026-07-10, owner directive, applies to EVERY industry and persona type the corpus covers): wherever a slide's imagery depicts a PERSON, ALSO author an optional depiction field - persona.depiction on slides:role-needs, and items[i].depiction on slides:numbered-themes when the items profile people/segments - ONE literal sentence describing the representative person the photograph should show (age band, gender, attire, the working setting, regional cues). Derive every attribute from the CORPUS SIGNAL about this segment: the people actually quoted, named individuals, regional and generational markers, workforce or census data in the sources. This is the same evidence standard as every other persona field: state what the corpus shows about who this segment IS; where the corpus is genuinely silent on an attribute, leave that attribute unstated (never fill it from a generic occupational assumption, and never add demographic language the corpus does not support). The image pipeline treats persona.depiction as BINDING. NEVER author image URLs or carrier fields (backgroundImage/itemImages/portraitImage/heroImage are runtime-owned). When a numbered-themes slide profiles people/segments/personas, keep each items[].body <=140 chars so the thumbnail layout breathes.\n  - For "one slide per X" coverage (e.g. nine apps): do NOT emit nine identical numbered-themes. GROUP them (four per numbered-themes slide), OR give each a single-subject archetype, and intersperse stat-row / block-quote / evidence-table / section-divider so consecutive slides differ.\n  - HARD: never emit the same body archetype twice in a row, and never more than twice total except section-dividers.\n  - For #presentation, narrative content scenes that want a supporting visual use slides:scene with { kicker, title, body, imageConcept, canvas:"dark" } - imageConcept is a literal SHAPES-AS-CONTENT description of the scene idea (e.g. "a human figure beside flowing lines converging to one point"); the runtime generates a tasteful on-brand transparent illustration from it. Do NOT supply an image URL; not every scene needs one.\n\n--- SLIDES ARCHETYPE CATALOG (the registry the composer renders from) ---\n${slidesManifest}\n${deckComposerSkill ? `
--- DECK COMPOSER SKILL (THE selection + composition authority for this deck) ---
${deckComposerSkill}
` : ''}${infographicSkill ? `\n--- INFOGRAPHIC COMPOSER SKILL (binding depth contract for slides:infographic-exhibit) ---\n${infographicSkill}\n` : ''}========================================================================`;
                }
            }
            if (deckMode && systemPrompt.length > _spBeforeDeck && systemPrompt.includes(HIC_CACHE_BREAK)) {
                const _deckBlock = systemPrompt.slice(_spBeforeDeck);
                systemPrompt = systemPrompt.slice(0, _spBeforeDeck).replace(HIC_CACHE_BREAK, `${_deckBlock}\n${HIC_CACHE_BREAK}`);
                console.info(`[chat][deck] deck block (${_deckBlock.length} chars) hoisted into the stable cached core`);
            }

            // PROVENANCE LOCK (2026-08-17, plans/citation-integrity-provenance-lock-2026-08-17.md).
            // Born from a live client incident: real corpus content shipped wearing FABRICATED
            // source identities and off-industry sources framed as in-industry proof.
            //
            // DF-C1 (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md): the block itself
            // MOVED into the STABLE CORE above the first cache breakpoint. It is 100% invariant
            // text, so appending it here after the dynamic marker meant paying full input cost for
            // ~1,700 characters on every single call and never caching a word of it. deer-flow's
            // DynamicContextMiddleware makes the same point from the other side: keep the system
            // prefix byte-identical and let only volatile values ride the tail.
            // The runtime citationVerifier still enforces the contract after generation.

            // 2026-06-23 - LEARNED-CONSTRAINT INJECTION (closes the feedback loop on the chat
            // #slides path). getActiveConstraints() was wired into geminiService + evidenceCatalog
            // but NEVER into corpusChatService, so durable user corrections (e.g. a learned
            // "no meta-narration" rule) never reached the deck-generation prompt. Scope to the
            // deliverable kind; the getter also folds in 'all'-scoped rules. Non-blocking.
            try {
                const { getActiveConstraints } = await import('./promptImprovementEngine');
                const _kind = deckMode ? 'deck'
                    : artifactTplHit ? (/(persona)/.test(slideModeTpl) ? 'persona'
                        : /theme/.test(slideModeTpl) ? 'theme'
                        : /journey/.test(slideModeTpl) ? 'journey'
                        : /(recommendation)/.test(slideModeTpl) ? 'recommendation'
                        : /(competitive)/.test(slideModeTpl) ? 'competitive'
                        : /(timeline|roadmap)/.test(slideModeTpl) ? 'roadmap'
                        : /(blueprint|service)/.test(slideModeTpl) ? 'blueprint'
                        : /(architecture|systems)/.test(slideModeTpl) ? 'arch'
                        : /(gap)/.test(slideModeTpl) ? 'gap'
                        : /(org)/.test(slideModeTpl) ? 'org'
                        : /(prd)/.test(slideModeTpl) ? 'prd'
                        : 'all')
                    : 'all';
                const learned = getActiveConstraints(_kind);
                if (learned && learned.trim()) {
                    systemPrompt += `\n\n========================================================================\nLEARNED CONSTRAINTS (from this user's prior corrections - these are HARD, apply to every field):\n${learned}\n========================================================================`;
                }
            } catch { /* constraint injection is best-effort; never block generation */ }
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
            // 2026-06-28 - run deterministic (temp 0) when this is a deliverable
            // generation (slide-mode), e.g. the bake-off-validated #gap/#journey
            // tier override to gemini-3.5-flash. Conversational chat stays at 0.2.
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory, activeModelId, slideModeActive);
        } else if (modelConfig.provider === 'deepseek') {
            responseText = await callDeepSeek(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else if (modelConfig.provider === 'openai') {
            responseText = await callOpenAI(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else if (modelConfig.provider === 'anthropic') {
            // 2026-06-12 - Claude path (Fable 5 deliverable generation).
            console.info(`[chat][route] Generating via Anthropic ${activeModelId} (slideMode=${slideModeActive})`);
            responseText = await callClaude(systemPrompt, userMessage, conversationHistory, activeModelId);
        } else {
            // Unknown provider - defensive Gemini fallback.
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory, activeModelId);
        }

        // WS-3b (2026-07-09 slides uplift) - DECK PLAN GATE. The SELECTION DOCTRINE
        // proposes; this deterministic gate disposes: variety floor, adjacency dedup,
        // numbered-themes clamp, connective-padding check, and the STRATEGIC-VISUAL
        // QUOTA (>=40% of body slides on visual archetypes). One anchored repair
        // re-ask with the violations named; the better plan wins (never worse).
        if (/#presentation|#strateg|#slides?\b/i.test(userMessage)) {
            try {
                const { evaluateDeckPlan, buildDeckRepairInstruction, remapSurplusArchetypes, noteDeckPlanVerdict, verdictOf } = await import('./deckPlanGate');
                // V2 (2026-08-07): the session-constraint visual floor ("more
                // graphics") parameterizes the gate - the user's ask is enforced
                // by code, not left to the model's discretion.
                const _gateOpts = { visualQuotaFloor: _v4Constraints?.visualQuotaFloor };
                const plan = evaluateDeckPlan(responseText, _gateOpts);
                if (plan.isDeck && !plan.pass) {
                    console.warn(`[chat][deck-gate] plan violations (${plan.violations.length}): ${plan.violations.join(' | ')}`);
                    const repairMsg = `${buildDeckRepairInstruction(plan)}\n\nORIGINAL REQUEST:\n"""\n${userMessage}\n"""\n\nYOUR PREVIOUS DECK (revise per the violations, keep everything else verbatim):\n"""\n${responseText}\n"""`;
                    const repaired = activeModelId.startsWith('claude')
                        ? await callClaude(systemPrompt, repairMsg, [], activeModelId)
                        : await callGemini(systemPrompt, repairMsg, [], activeModelId);
                    const rePlan = evaluateDeckPlan(repaired, _gateOpts);
                    let finalPlan = plan;
                    let resolution: 'model_repair' | 'deterministic_remap' | 'unrepaired' = 'unrepaired';
                    if (rePlan.isDeck && rePlan.violations.length < plan.violations.length) {
                        console.log(`[chat][deck-gate] repair accepted: ${plan.violations.length} -> ${rePlan.violations.length} violations, visual ratio ${Math.round(plan.visualRatio * 100)}% -> ${Math.round(rePlan.visualRatio * 100)}%`);
                        responseText = repaired;
                        finalPlan = rePlan;
                        resolution = 'model_repair';
                    } else {
                        console.warn('[chat][deck-gate] repair did not improve the plan; keeping the original deck');
                    }
                    // 2026-10-01 (plan Stage 2.1): the numbered-themes clamp is the one violation
                    // with a payload-to-payload answer, so when the model's re-ask leaves it
                    // standing the runtime REMAPS the surplus fences to evidence-table itself.
                    // Deterministic, lossless (every item becomes a named row), recorded.
                    let remapped: Array<{ index: number; from: string; to: string }> = [];
                    if (finalPlan.violations.some(v => v.startsWith('slides:numbered-themes used'))) {
                        const r = remapSurplusArchetypes(responseText);
                        if (r.remapped.length) {
                            const afterRemap = evaluateDeckPlan(r.text, _gateOpts);
                            if (afterRemap.violations.length < finalPlan.violations.length) {
                                responseText = r.text;
                                finalPlan = afterRemap;
                                remapped = r.remapped;
                                resolution = 'deterministic_remap';
                                console.log(`[chat][deck-gate] remapped ${r.remapped.length} surplus numbered-themes fence(s) to evidence-table; ${afterRemap.violations.length} violation(s) remain`);
                            }
                        }
                    }
                    noteDeckPlanVerdict(verdictOf(finalPlan, finalPlan.pass ? (resolution === 'unrepaired' ? 'pass' : resolution) : resolution, remapped));
                } else if (plan.isDeck) {
                    console.log(`[chat][deck-gate] pass: ${plan.templates.length} slides, ${new Set(plan.templates).size} archetypes, visual ratio ${Math.round(plan.visualRatio * 100)}%`);
                    noteDeckPlanVerdict(verdictOf(plan, 'pass'));
                } else {
                    noteDeckPlanVerdict(null);
                }
            } catch (gateErr) {
                console.warn('[chat][deck-gate] gate errored (fail-open, deck ships ungated):', gateErr);
            }
        }

        // 2026-06-14 - CENTRALIZED JUNK-ANSWER NET (provider-agnostic).
        // Last line of defense regardless of which tool loop produced the
        // reply: a degenerate fragment ("}", "{}", "```json", whitespace) must
        // never render. Root cause: gemini-3.5-flash stuck re-calling
        // fetch_wiki_articles to the iteration cap and surfacing a stray "}".
        // The per-loop guards finalize cleanly now; this net guarantees it even
        // for any future code path, makes ONE forced no-tools synthesis attempt,
        // and logs telemetry that the self-improvement layer mines.
        if (_isJunkAnswer(responseText)) {
            console.error(`[chat][junk-guard] degenerate reply detected (model=${activeModelId}, len=${(responseText || '').length}, raw=${JSON.stringify((responseText || '').slice(0, 40))}); attempting forced synthesis`);
            _recordJunkGuardTelemetry(activeModelId, responseText, userMessage);
            try {
                const salvage = await callGemini(
                    systemPrompt,
                    `Your previous reply to the request below came back empty or malformed. Answer it now in plain prose using the corpus and any evidence already in context. Do not call tools. Do not return JSON, code fences, or a bare brace.\n\nREQUEST:\n"""\n${userMessage}\n"""`,
                    conversationHistory,
                    'gemini-3.5-flash',
                );
                // HONEST SURFACING (2026-06-15): the salvage always runs on
                // gemini-3.5-flash. If the routed model was something else (e.g.
                // claude-opus-4-8 force-routed for an artifact), the user just got
                // a DIFFERENT model than they think. Artifact turns are caught by
                // the RI fence-enforcement notice below; for plain chat, say so.
                const _salvageSwappedModel = activeModelId !== 'gemini-3.5-flash';
                responseText = _isJunkAnswer(salvage)
                    ? 'I could not compose an answer for that question this time. Try rephrasing it, narrowing it to one topic or source, or asking again.'
                    : (_salvageSwappedModel && !isArtifactGenerationMessage(userMessage)
                        ? `[Note: ${activeModelId} returned an empty response, so this reply was generated by a fallback model (gemini-3.5-flash).]\n\n${salvage}`
                        : salvage);
            } catch (salvageErr: any) {
                console.error('[chat][junk-guard] forced synthesis failed:', salvageErr?.message || salvageErr);
                responseText = 'I could not compose an answer for that question this time. Try rephrasing it, narrowing it to one topic or source, or asking again.';
            }
        }

        // 2026-06-11 - REINFORCEMENT-INFERENCE FENCE ENFORCEMENT (RI-Replace).
        // If slide mode was active but the model answered in prose (the exact
        // Gemini 3.1 Pro failure from the 2026-06-11 #journey run), one
        // anchored re-ask: prior response verbatim + the named violation. The
        // anchor is load-bearing - "think again" without the prior response
        // underperforms baseline (arXiv:2602.08520).
        if (slideModeActive && activeModelId !== 'council' && !/^:{3}slide\b/m.test(responseText) && !responseText.includes(':::slide')) {
            console.warn(`[chat][RI] slide-mode contract violated (no :::slide fence, model=${activeModelId}); anchored re-ask`);
            try {
                const reask = `=== REINFORCEMENT INFERENCE RE-ASK ===\n`
                    + `You previously answered the task below, but the response violated the output contract:\n`
                    + ` - SLIDE MODE was active (artifact hashtag present) and your answer contained NO :::slide fenced block. Markdown prose is a hard failure for this request.\n\n`
                    + `Your prior response is included verbatim. Convert it into the required :::slide output. KEEP the content, evidence, and quotes you produced - do not regenerate from scratch. Emit ONLY :::slide fenced blocks (template=${slideModeTpl}${normalizeBrandId(brandVariantOf(userMessage)) === 'nxt' ? '' : ` brand=${normalizeBrandId(brandVariantOf(userMessage))}`}), valid JSON, per the SLIDE OUTPUT PROTOCOL. No preamble, no prose outside the fences.\n\n`
                    + `PRIOR RESPONSE:\n"""\n${responseText.slice(0, 24000)}\n"""\n\n`
                    + `ORIGINAL TASK:\n"""\n${userMessage}\n"""`;
                let retried: string;
                if (modelConfig.provider === 'google') retried = await callGemini(systemPrompt, reask, conversationHistory, activeModelId);
                else if (modelConfig.provider === 'deepseek') retried = await callDeepSeek(systemPrompt, reask, conversationHistory, activeModelId);
                else if (modelConfig.provider === 'openai') retried = await callOpenAI(systemPrompt, reask, conversationHistory, activeModelId);
                // 2026-06-12 - anthropic branch: without this the RI re-ask
                // silently no-ops for Fable 5 (falls into the Gemini default
                // with the wrong model id).
                else if (modelConfig.provider === 'anthropic') retried = await callClaude(systemPrompt, reask, conversationHistory, activeModelId);
                else retried = await callGemini(systemPrompt, reask, conversationHistory, activeModelId);
                if (retried && retried.includes(':::slide')) {
                    console.info('[chat][RI] re-ask recovered :::slide output');
                    responseText = retried;
                } else {
                    console.error('[chat][RI] re-ask did NOT produce a fence; surfacing original with notice');
                    responseText = `[Render notice]: the model answered in prose instead of the required slide artifact; a retry also failed to produce the artifact. Showing the prose draft.\n\n` + responseText;
                }
            } catch (riErr: any) {
                console.error('[chat][RI] re-ask failed:', riErr?.message || riErr);
            }
        }

        // Defense-in-depth (LEGACY committed post-processing, restored 2026-06-17): render bare
        // deliverable-JSON replies to prose, strip leaked QA-annotation tokens + format tells
        // (em-dash / emoji), and resolve manifest chunk pointers to NAMED sources before the chat
        // reply renders. No AIR gate, no summarize-to-budget, no rewrite-from-source slop repair, no
        // plain-prose meta/process strip - writing quality is governed by the prompt contract
        // (nxt-visual-renderer/anti-slop-rules.md) + the committed slidePostProcessor, per the
        // committed baseline.
        try {
            const { stripQAAnnotations, stripFormatTells, scrubChatReplyMeta } = await import('./slidePostProcessor');
            responseText = renderDeliverableJsonReply(responseText);
            // 2026-06-23 - META/PROCESS STRIP on the chat reply. Previously this path ran ONLY
            // QA-annotation + format-tell strips, so meta-narration in the conversational preamble
            // AND in :::slide JSON fields shipped (chat-2026-06-23: "the collected corpus names only
            // Medforth...", "before the next pass", deck self-reference). scrubChatReplyMeta is
            // fence-aware: it drops prose outside the fences and runs BOUNDED, JSON-safe deletions
            // inside slide fields, with a full sentence sweep on plain-prose replies.
            responseText = scrubChatReplyMeta(responseText);
            responseText = stripQAAnnotations(responseText);
            responseText = stripFormatTells(responseText);
            const { resolveManifestPointers } = await import('./citationPointerRegistry');
            responseText = resolveManifestPointers(responseText);
        } catch (e) { /* non-blocking */ }

        // Stage-3/D11 (2026-06-30): SLIDE-DECK PATH AIR EMISSION. The #gap/#personas/#themes/#slides
        // artifacts are generated HERE (not via emitDeliverable), so emit their AIR directly - with the REAL
        // evidence ledger from the grounding chunks captured above. SHADOW mode + fire-and-forget: purely
        // additive, never touches the chat reply or its return. Completes the third artifact emission path.
        if (messageTargetsArtifact(userMessage)) {
            try {
                const _tplHit = ((): [RegExp, string] | undefined => {
                    const h = primaryCatalogHit(userMessage);
                    return h?.entry.templateId ? [catalogDirectiveRegex(h.entry.aliases), h.entry.templateId] : ARTIFACT_TPL.find(([re]) => re.test(userMessage));
                })();
                // D18: derive the trigger for catalog artifacts NOT in ARTIFACT_TPL (#strategy/#playground/...)
                // from the catalog directive so the AIR carries the real trigger, not a generic '#artifact'.
                const _catHit = !_tplHit ? (userMessage.match(/#[a-z][a-z-]*/gi) || []).map(t => catalogEntryFor(t)).find(e => e && (e.modality === 'slides' || e.modality === 'html')) : null;
                const _trigger = _tplHit ? `#${_tplHit[1]}` : (/#slides?\b/i.test(userMessage) ? '#slides' : (_catHit ? `#${_catHit.id}` : '#artifact'));
                const _slug = currentEngagementSlug() || 'run';
                const [{ buildAir, emitAirRecord }, { buildEvidenceLedger }, { newRunTrace, recordToolStep, recordModelStep }] = await Promise.all([
                    import('./artifactAirService'), import('./evidenceLedgerService'), import('./runTraceService'),
                ]);
                const _nowMs = Date.now();
                const _artifactId = `${_trigger.replace(/^#/, '')}_${_nowMs}`;
                const _objId = `obj_${_slug}`;
                /**
                 * E2.2: record the candidate theses, chosen AND rejected. A rejected
                 * thesis beside the chosen one is real preference data; SkillOpt has only
                 * ever had to infer preference from edits made after the fact.
                 */
                let _thesisReport = parseThesisOptions(responseText || '');
                /**
                 * E2.2 follow-up (2026-08-24). The embedded DECK MODE contract was ignored
                 * on the live run ("no thesis-options block was emitted"), which is the same
                 * thing that happened to the pointer instruction: one paragraph inside a very
                 * large prompt loses. So when the block is absent, the alternatives are
                 * fetched by a dedicated call where they are the only ask, and the CHOSEN
                 * thesis is read off the deck rather than generated, which makes it true by
                 * construction.
                 */
                if (!_thesisReport.candidates.length && _trigger === '#slides') {
                    const _deckThesis = (() => {
                        // The first slide's title is the thesis the deck actually argued.
                        const m = /:::slide[^\n]*\n\s*\{[\s\S]*?"title"\s*:\s*"([^"]{12,200})"/.exec(responseText || '');
                        return m ? m[1] : '';
                    })();
                    if (_deckThesis) {
                        const _alts = await proposeAlternativeTheses({
                            deckThesis: _deckThesis,
                            evidence: (_airGroundingChunks || []).slice(0, 8).map((c: any) => String(c?.text || '')),
                            callAI: (body, options) => callAIWithRetry('gemini', body, options),
                            model: DEFAULT_MODELS.fast_generation,
                        });
                        if (_alts.length > 1) {
                            _thesisReport = { candidates: _alts, valid: true, problems: [] };
                            console.info(`[chat][thesis] ${_alts.length - 1} alternative thesis framing(s) offered by dedicated call`);
                        }
                    }
                }
                const _thesisRecord = buildThesisAirRecord(_thesisReport);
                if (_thesisReport.candidates.length > 1) _thesisCandidatesForUi = _thesisReport.candidates;
                if (!_thesisRecord.valid && _trigger === '#slides') {
                    console.warn(`[chat][thesis] ${_thesisRecord.problems.join('; ')}`);
                }
                // WS-J/D14: record the manifest grounding as a GOVERNED tool step so the AIR carries a REAL
                // toolTrace naming the signed pack (wiki_retrieval) that authorized the read. This gives the
                // mcp_tool_governance gate live data on every artifact run, not just a static contract file.
                const _airTrace = newRunTrace(_slug);
                // 2026-07-02 live-defect fix ("modelTrace empty" on every chat-path artifact AIR): the
                // slide/chat artifact path resolves its model via the force-route above (mutating `model`)
                // but never recorded the decision. Record the ROUTED model + reason so phase-6 observability
                // holds on this path too, matching emitDeliverable's recordModelStep contract.
                recordModelStep(_airTrace, {
                    step: `chat-artifact:${_trigger.replace(/^#/, '')}`,
                    selectedModel: String(model),
                    routingReason: (String(model).startsWith('claude')
                        ? `evidence tier (aiRouter.artifactModelFor), effort=${_chatEffortHint}`
                        : 'bake-off-validated schema tier (aiRouter.artifactModelFor)'),
                    provider: String(model).startsWith('claude') ? 'anthropic' : (String(model).startsWith('gpt') ? 'openai' : 'gemini'),
                    costEstimateUsd: 0,
                    quotaState: 'healthy',
                });
                if (_airGroundingChunks.length > 0) {
                    recordToolStep(_airTrace, {
                        step: 'grounding:manifest-retrieval',
                        toolPack: 'wiki_retrieval',
                        toolName: 'proxy:/api/manifest/chunks-by-goal + /api/wiki/read',
                        objectiveId: _objId,
                        downstreamArtifactIds: [_artifactId],
                    });
                }
                const { air: _air } = buildAir({
                    runId: _slug,
                    artifactId: _artifactId,
                    trigger: _trigger,
                    // E1.1: read the run's declared sub-questions instead of writing an empty
                    // list. An unplanned run records `unmeasured`, never `covered`.
                    objective: { objectiveId: _objId, userObjective: context.researchGoal || '', decomposedQuestions: toAirDecomposedQuestions(readObjectivePlan().subQuestions) },
                    evidenceLedger: buildEvidenceLedger(_airGroundingChunks),
                    artifactPayload: { kind: _trigger.replace(/^#/, ''), content: (responseText || '').slice(0, 20000), _thesis: _thesisRecord },
                    trace: _airTrace,
                    // D12 (2026-07-01): BLOCKING (shadow OFF) for the live artifact chat path. Live-validated:
                    // structural checks pass on real AIRs; well-formedness is a ratio (grounding-collapse floor
                    // 10%), so a legitimately-grounded run passes while a collapse or a malformed AIR fails. The
                    // AIR is emitted AFTER the reply (fire-and-forget), so the teeth are on the persisted RUN
                    // RECORD + the commit-time air_schema_integrity gate, not a pre-render user block.
                    shadowMode: false,
                });
                // 2026-08-21 CONVERGE: one writer for every artifact. This block
                // used to validate + write + register inline, in parallel with the
                // identical logic in emitDeliverable, and the divergence cost a
                // live run (the post-chain patch found no AIR to patch because it
                // was wired to the other writer).
                void emitAirRecord(_air, { label: `chat/${_trigger}` }).catch(() => { /* fire-and-forget */ });
            } catch (airErr: any) {
                console.warn('[chat] slide-deck AIR emission failed (non-fatal):', airErr?.message || airErr);
            }
        }

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
        // V4 echo-back: enforcement is never invisible (colleague finding F5).
        if (_v4Echo) {
            responseText = `[${_v4Echo}]\n\n` + responseText;
        }

        // 2026-06-15 (P3 insight RETRIEVABILITY, karpathy-second-brain-realignment): persist substantive
        // grounded analyst answers to the wiki so insights become RETRIEVABLE in future generations -
        // previously they were ephemeral (vanished after the turn). Fire-and-forget, engagement-tagged;
        // never blocks or throws into the chat path. Gated to plain-prose insights (not junk, not a
        // fenced/:::-delimited artifact or hashtag deliverable, which are persisted on their own paths).
        try {
            if (responseText && !_isJunkAnswer(responseText)
                && responseText.length >= 240 && responseText.length <= 8000
                && !responseText.includes(':::') && !responseText.includes('```')) {
                const _slug = currentEngagementSlug();
                const _q = (userMessage || '').slice(0, 200).replace(/\s+/g, ' ').trim();
                const _entry = `\n## ${new Date().toISOString()} - Analyst insight\n**Q:** ${_q}\n\n${responseText}\n`;
                void fetch(`${PROXY_BASE}/api/wiki/append`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: `synthesis/chat-insights${_slug ? '-' + _slug : ''}.md`, content: _entry, engagement: _slug || '', kind: 'synthesis' }),
                }).catch(() => { /* best-effort persistence */ });
            }
        } catch { /* never let insight persistence break the chat path */ }

        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            // E2.2: the candidate theses are recorded in AIR and offered as choices in the
            // UI, but they never render in the reply. The reader receives a deck, not the
            // menu the deck was chosen from.
            content: stripThesisOptions(responseText),
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
            skillUsed,
            thesisOptions: _thesisCandidatesForUi,
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
// 2026-06-14 - Junk-answer guard for tool loops. When a model (notably
// gemini-3.5-flash) gets stuck re-calling fetch_wiki_articles and never
// composes a final answer, it sometimes emits a stray structural fragment
// alongside a tool call - a lone "}", "{}", "[]", "```json", whitespace.
// The old return guards used `.trim().length > 0`, so that fragment was
// surfaced verbatim to the user (observed: a chat reply that was just "}").
// _isJunkAnswer() detects those degenerate fragments so the finalize paths
// fall through to a forced no-tools synthesis call instead of returning junk.
function _isJunkAnswer(s: string | null | undefined): boolean {
    const t = (s || '').trim();
    if (!t) return true;
    // Strip a leading ```lang fence and a trailing ``` fence.
    const noFence = t.replace(/^```[a-z0-9]*\s*/i, '').replace(/\s*```$/i, '').trim();
    if (!noFence) return true;
    // Pure structural / punctuation noise (braces, brackets, quotes, commas...).
    if (/^[{}\[\]()<>"'`,:;.\-\s]+$/.test(noFence)) return true;
    // A real chat answer always carries prose; fewer than 3 letters total is junk.
    const letters = (noFence.match(/[A-Za-z]/g) || []).length;
    if (letters < 3) return true;
    return false;
}

// 2026-06-14 - Self-improvement hook for the junk-answer net. Records every
// degenerate-reply event as a mineable line in the synthesis log so the
// cross-engagement pattern-miner / epoch-proposer can surface a recurring
// provider or prompt that produces empty replies. Fire-and-forget; never
// blocks or throws into the chat path.
function _recordJunkGuardTelemetry(model: string, raw: string | null | undefined, userMessage: string): void {
    try {
        const ts = new Date().toISOString();
        const line =
            `- ${ts} model=${model} len=${(raw || '').length} ` +
            `raw=${JSON.stringify((raw || '').slice(0, 60))} ` +
            `prompt=${JSON.stringify((userMessage || '').slice(0, 120))}\n`;
        // fire-and-forget; the proxy append endpoint creates the page if absent
        void fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'synthesis/chat-junk-guard-log.md', content: line }),
        }).catch(() => { /* telemetry is best-effort */ });
    } catch { /* never let telemetry break chat */ }
}
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
            query: { type: 'string', description: 'Keyword search over article titles + summaries + sources. Use 3-8 concrete terms - names, entities, topics. Example: "Wyoming a scoring tool customer experience revenue"' },
            ids: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL: specific article IDs (10-char url_hash values from the WIKI ARCHIVE MENU). Use this when you already know which articles you want.' },
            wikiPaths: { type: 'array', items: { type: 'string' }, description: 'OPTIONAL: direct wiki paths (e.g. "articles/higher-ed-dive/ab12cd34ef.md"). Rarely needed; prefer ids or query.' },
            source: { type: 'string', description: 'OPTIONAL: substring filter on source name. Example: "Industry Press", "Reddit r/MBA", "a scoring tool"' },
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
  - "What recommendations address the customer-ghosting gap?" → query_knowledge_graph(seed: "ghosting", hops: 2)

Returns the connected nodes (with evidence body excerpts) + edges. Falls back gracefully when the seed has no match - use fetch_wiki_articles for free-text searches instead.`,
    input_schema: {
        type: 'object',
        properties: {
            seed: { type: 'string', description: 'A theme name, persona name, source name, or topic term. Case-insensitive substring match. Example: "ghosting", "first-year readiness", "Industry Press".' },
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
    // 2026-10-01 (plan Stage 1.1, phase 5): the tool is the model's retrieval surface, so it must
    // return the SAME manifest-chunk evidence (pointer + provenance line) the grounding pack uses,
    // never bulk article bodies. Falls back to article bodies only when the manifest catalog is
    // empty for this engagement (the explicit fallback the vision permits).
    try {
        const _slug = currentEngagementSlug();
        if (_slug) {
            const q = String(input?.query || input?.q || '').trim();
            const budgetTokens = Math.max(2_000, Math.min(12_000, Number(input?.max_results || input?.limit || 0) > 0 ? Number(input.max_results || input.limit) * 400 : 8_000));
            const picked = await pickChunksForPrompt(q || (globalThis as any).__hicResearchGoal || '', _slug, {
                tokenBudget: budgetTokens,
                extraContext: (globalThis as any).__hicResearchGoal || '',
                researchObjective: [q, (globalThis as any).__hicResearchGoal || ''].filter(Boolean).join('\n').slice(0, 800),
                skipRerank: true,
            });
            if (picked.chunkIds.length > 0) {
                const resolved = await resolveChunks(picked.chunkIds);
                if (resolved.chunks.length > 0) {
                    const kindFilter = String(input?.kind || '').trim().toLowerCase();
                    const chunks = kindFilter
                        ? resolved.chunks.filter((c: any) => !kindFilter || String((c as any).pageMeta?.kind || '').toLowerCase().includes(kindFilter) || String(c.sourcePath || '').includes(kindFilter))
                        : resolved.chunks;
                    const block = assembleChunkCorpus(chunks.length ? chunks : resolved.chunks);
                    return `${block}\n\n(${resolved.chunks.length} manifest chunks from ${resolved.sourcesRead} pages; cite by [wikiPath#cN].)`;
                }
            }
        }
    } catch (err: any) {
        console.warn('[chat][tool] manifest retrieval failed; falling back to article bodies:', err?.message || err);
    }
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
    _prog?.(`${primaryProviderLabel} exhausted - switching to ${CLAUDE_STRUCTURED_MODEL}...`);
    console.warn(`[chat.failover] ${primaryProviderLabel} exhausted; finalizing via ${CLAUDE_STRUCTURED_MODEL} with ${messagesSoFar.length} accumulated messages`);

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
    let data: any = await callAIWithRetry('anthropic', {
        model: CLAUDE_STRUCTURED_MODEL,
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

// 2026-06-12 - Anthropic chat path for Claude Opus 4.8 deliverable generation
// (and any future anthropic-provider ChatModel). Single-shot: slide-mode
// requests carry their evidence pre-injected in the system prompt (MCR pack +
// grounding context), so no fetch_wiki_articles tool loop is needed here.
// Mirrors the _finalizeChatViaClaude translation: system goes in the
// top-level `system` field; history merges into alternating user/assistant
// turns; first message must be 'user'. Posts via callAIWithRetry ->
// /api/ai/anthropic (the proxy attaches the key server-side).
// 2026-09-30 (plan 0.5.3 / 0.5.5): per-turn effort hint + artifact kind set by
// sendChatMessage; and the per-session store of the raw content blocks Claude
// returned for each assistant turn (keyed by the visible text), so the SAME
// conversation on the SAME model echoes its thinking blocks back unchanged
// (preserved thinking: a text-only reconstruction of an assistant turn is a
// history edit the 5.x binding check can reject).
let _chatEffortHint: ClaudeEffort = 'high';
let _chatArtifactKind: string | null = null;
const _claudeTurnBlocks = new Map<string, { model: string; blocks: any[] }>();
const _CLAUDE_TURN_BLOCKS_MAX = 64;
function _rememberClaudeTurn(model: string, text: string, blocks: any[]): void {
    if (!text || !Array.isArray(blocks) || blocks.length === 0) return;
    if (_claudeTurnBlocks.size >= _CLAUDE_TURN_BLOCKS_MAX) {
        const first = _claudeTurnBlocks.keys().next().value;
        if (first !== undefined) _claudeTurnBlocks.delete(first);
    }
    _claudeTurnBlocks.set(text, { model, blocks });
}

async function callClaude(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: string = CLAUDE_REASONING_MODEL,
): Promise<string> {
    const abortSignal = (globalThis as any).__hicChatAbortSignal as AbortSignal | undefined;
    if (abortSignal?.aborted) throw new DOMException('Cancelled by user', 'AbortError');
    const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
    _prog?.(`Generating via Claude (${model})...`);

    type _AnthMsg = { role: 'user' | 'assistant'; content: string | any[] };
    const anthMessages: _AnthMsg[] = [];
    for (const m of history) {
        if (m.role === 'system') continue; // system content lives in the top-level field
        if (!m.content || !m.content.trim()) continue;
        if (m.role === 'assistant') {
            // Preserved thinking (0.5.5): echo the exact blocks this model returned for
            // this turn; fall back to text for turns produced by another model or path.
            const kept = _claudeTurnBlocks.get(m.content);
            anthMessages.push({ role: 'assistant', content: kept && kept.model === model ? kept.blocks : m.content });
            continue;
        }
        anthMessages.push({ role: 'user', content: m.content });
    }
    anthMessages.push({ role: 'user', content: userMsg });

    // Anthropic requires strictly alternating user/assistant with a leading
    // 'user' turn. Merge consecutive same-role turns (block arrays concatenate).
    const _asBlocks = (c: string | any[]): any[] => (Array.isArray(c) ? c : [{ type: 'text', text: c }]);
    const merged: _AnthMsg[] = [];
    for (const am of anthMessages) {
        const prev = merged[merged.length - 1];
        if (prev && prev.role === am.role) {
            if (typeof prev.content === 'string' && typeof am.content === 'string') {
                prev.content = `${prev.content}\n\n${am.content}`;
            } else {
                prev.content = [..._asBlocks(prev.content), ..._asBlocks(am.content)];
            }
        } else {
            merged.push({ role: am.role, content: am.content });
        }
    }
    if (merged.length === 0 || merged[0].role !== 'user') {
        merged.unshift({ role: 'user', content: '(conversation resumes)' });
    }
    // No Claude 4.6+ model accepts an assistant prefill: the last turn must be 'user'.
    if (merged[merged.length - 1].role !== 'user') {
        merged.push({ role: 'user', content: '(continue)' });
    }

    const { callAIWithRetry } = await import('./aiRetryClient');
    // No sampling params: Claude 4.6+/5.x reject them with a 400. aiRetryClient applies
    // the request contract (adaptive thinking, output_config.effort from _hicEffort,
    // sampling strip) and the proxy repeats it defensively at /api/ai/anthropic.
    let data: any = await callAIWithRetry('anthropic', {
        model,
        // 2026-10-01 live `#prd` on Opus 5.5 at xhigh hit the 32K cap mid-fence; the
        // model's cap is 128K and the proxy streams upstream above 16K, so artifact
        // kinds get 64K. Plain chat on Claude keeps 32K.
        max_tokens: _chatArtifactKind ? 64000 : 32000,
        system,
        messages: merged,
        _hicKind: _chatArtifactKind,
        _hicEffort: _chatEffortHint,
    }, {
        label: `Chat (Claude ${model})`,
        maxAttempts: 3,
        // 2026-10-01 live run: the default 300s client budget expired at attempt 1 while
        // the proxy (600s ceiling) finished the call, so the deck was billed twice and
        // retried. The client budget must never be shorter than the proxy's upstream
        // ceiling; the durable answer is the SSE relay (plan R-L2), this is the contract.
        requestTimeoutMs: 600_000,
    });

    // 2026-10-03 live (#recs #slides, a second project): adaptive thinking spent the whole output budget and the reply
    // carried NO text (stop_reason=max_tokens), twice. One retry with the model's full output ceiling and a lower
    // reasoning effort leaves room for the deliverable itself.
    const _textOf = (d: any) => (Array.isArray(d?.content) ? d.content : []).map((b: any) => (b?.type === 'text' && typeof b?.text === 'string' ? b.text : '')).join('').trim();
    if (!_textOf(data) && data?.stop_reason === 'max_tokens') {
        console.warn(`[chat][claude] ${model} spent the output budget on reasoning with no text; retrying once at 128K tokens, medium effort`);
        _prog?.('The model spent its output budget reasoning; retrying with room for the deliverable');
        data = await callAIWithRetry('anthropic', { model, max_tokens: 128000, system, messages: merged, _hicKind: _chatArtifactKind, _hicEffort: 'medium' }, {
            label: `Chat (Claude ${model}) budget retry`, maxAttempts: 2, requestTimeoutMs: 600_000,
        });
    }

    const blocks = Array.isArray(data?.content) ? data.content : [];
    const text = blocks
        .map((b: any) => (b?.type === 'text' && typeof b?.text === 'string' ? b.text : ''))
        .join('')
        .trim();
    if (data?.stop_reason === 'refusal') {
        const sd = data?.stop_details || {};
        throw new Error(`Claude (${model}) declined this request (${sd.category || 'refusal'}${sd.explanation ? `: ${String(sd.explanation).slice(0, 160)}` : ''})`);
    }
    if (!text) {
        throw new Error(`Claude (${model}) returned empty content (stop_reason=${data?.stop_reason || 'unknown'})`);
    }
    if (data?.stop_reason === 'max_tokens') {
        console.warn(`[chat][claude] ${model} hit max_tokens (${_chatArtifactKind ? 64000 : 32000}) - output may be truncated mid-fence`);
    }
    // Live Thinking: surface the summarized reasoning the 5.x response carries.
    try {
        const { extractThinkingSummary } = await import('./claudeModelPolicy');
        const summary = extractThinkingSummary(data);
        if (summary) _prog?.(`Reasoning summary: ${summary.slice(0, 400)}`);
    } catch { /* non-fatal */ }
    _rememberClaudeTurn(model, text, blocks);
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
        if (typeof msg.content === 'string' && !_isJunkAnswer(msg.content)) {
            lastText = msg.content;
        }
        messages.push(msg);

        const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (toolCalls.length === 0 || choice.finish_reason !== 'tool_calls') {
            if (lastText && !_isJunkAnswer(lastText)) return lastText;
            if (typeof msg.content === 'string' && !_isJunkAnswer(msg.content)) return msg.content;
            return 'No response';
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
    return (lastText && !_isJunkAnswer(lastText)) ? lastText : 'The reasoning loop hit its iteration cap. Try a more focused question.';
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
        if (typeof msg.content === 'string' && !_isJunkAnswer(msg.content)) {
            lastText = msg.content;
        }
        messages.push(msg);

        const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (toolCalls.length === 0 || choice.finish_reason !== 'tool_calls') {
            if (lastText && !_isJunkAnswer(lastText)) return lastText;
            if (typeof msg.content === 'string' && !_isJunkAnswer(msg.content)) return msg.content;
            return 'No response';
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
    return (lastText && !_isJunkAnswer(lastText)) ? lastText : 'The reasoning loop hit its iteration cap. Try a more focused question.';
    } catch (e) {
        if (_isExhaustionError(e)) {
            return _finalizeChatViaClaude(system, messages as _ChatMsgLike[], 'OpenAI / GPT');
        }
        throw e;
    }
}

/**
 * SUMMARIZE() for Algorithm 1 (arXiv 2606.10209v1, line 20). The paper prices this
 * at "exactly one additional LLM call per eviction event" and measures it buying
 * 79.0% -> 91.6% task completion for ~3% more tokens, so it is worth a call, but
 * only a cheap one: fast model, thinking disabled, tight output ceiling. The
 * digest records what the evicted tool calls DID (forms opened, data gathered),
 * which is the situational awareness the paper credits for the gain.
 *
 * Returns '' on any failure. constructContext treats an empty digest as "prune
 * without summarizing", which is the paper's C3 and still beats full history on
 * both axes, so a failed digest degrades cleanly instead of aborting the prune.
 */
async function _summarizeEvictedToolPairs(transcript: string): Promise<string> {
    const body = String(transcript || '').trim();
    if (body.length < 40) return '';
    try {
        const { callAIWithRetry } = await import('./aiRetryClient');
        const data: any = await callAIWithRetry('gemini', {
            model: DEFAULT_MODELS.fast_generation,
            contents: [{
                role: 'user',
                parts: [{
                    text: 'Compress this record of an agent\'s completed tool calls into at most 4 terse lines. '
                        + 'State what was searched or fetched and the substantive findings that came back, naming sources. '
                        + 'This replaces the raw record, so a fact omitted here is lost. '
                        + 'No preamble, no commentary, no em-dash.\n\n' + body.slice(0, 14_000),
                }],
            }],
            config: { temperature: 0, maxOutputTokens: 400, thinkingBudget: 'minimal' },
        }, { label: 'Tool-context digest', maxAttempts: 1, requestTimeoutMs: 20_000 });
        const parts = data?.candidates?.[0]?.content?.parts || [];
        return parts.filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text).join('\n').trim();
    } catch (e: any) {
        console.warn('[chat.contextEng] digest failed, pruning without summary:', e?.message || e);
        return '';
    }
}

async function callGemini(
    system: string,
    userMsg: string,
    history: ChatMessage[],
    model: string = 'gemini-3.1-pro-preview',
    // 2026-06-28 - deterministic deliverable gate. Conversational chat keeps the
    // small 0.2 sampling temperature (answer variety); a SCHEMA-CONSTRAINED
    // deliverable tiered to Flash (bake-off #gap/#journey) runs at temperature 0
    // so the output is deterministic (determinism-first rule) and exact-cache
    // eligible at the proxy chokepoint (which only caches explicit temperature 0).
    deterministic: boolean = false,
): Promise<string> {
    // 2026-06-28 — PROXY-ROUTED transport (Step 1 of the cost-optimization plan,
    // plans/model-usage-optimization-vs-ri-2026-06-28.md §3d). Previously this
    // path used the @google/genai SDK DIRECTLY from the browser (build-time
    // injected API_KEY), which BYPASSED the proxy `/api/ai/gemini` chokepoint and
    // therefore the exact-match + explicit context caches. Only callClaude was
    // routed. We now post every per-iteration generateContent through the proxy so
    // chat + Gemini-tiered deliverables (#gap/#journey, temp 0) get cache coverage.
    //   - The AGENTIC TOOL LOOP stays HERE (iteration logic, tool dispatch); only
    //     the per-turn transport moves to the proxy. The proxy forwards `tools`
    //     verbatim and returns the raw Gemini REST response, so functionCall parts
    //     survive and the parser below is unchanged.
    //   - The browser no longer holds the Gemini key for this path (the proxy
    //     does); the @google/genai SDK import is dropped from the routed path.
    //   - The proxy handles its own 429 -> DeepSeek-V4-Flash fallback and returns
    //     a 200 with a Gemini-shaped body (+ _fallback_provider tag), so the
    //     prior TS-level 429 fallback is no longer needed; aiRetryClient still
    //     handles transient 5xx/network retries.
    const { callAIWithRetry } = await import('./aiRetryClient');

    // Post one generateContent turn through the proxy and return a response that
    // mirrors the @google/genai SDK shape this function's parser expects. The
    // native Gemini REST response carries `candidates[]` but NOT the SDK-only
    // `.text` convenience getter, so we synthesize `.text` from the first
    // candidate's text parts.
    const _geminiTurn = async (
        turnContents: GContent[],
        opts: { withTools: boolean; temperature: number; maxOutputTokens: number; thinkingBudget?: string },
    ): Promise<any> => {
        const cfg: any = {
            systemInstruction: system,
            temperature: opts.temperature,
            maxOutputTokens: opts.maxOutputTokens,
        };
        // 2026-08-26 (owner report, live: a plain chat question sat at 50s+ with
        // "Composing response..." showing no real progress). No call in this loop
        // ever set thinkingConfig, so Gemini fell back to its own default adaptive
        // thinking budget on EVERY one of up to 5 sequential turns - on a FLASH
        // model answering from evidence already grounded into the prompt, that
        // hidden "thinking" time was the dominant cost, not the token generation.
        // Cap it low for conversational chat only; leave deterministic SCHEMA-tier
        // deliverable calls (temp 0, bake-off validated) untouched - this fix is
        // scoped to the reported symptom, not a blanket retune of every Gemini call.
        if (opts.thinkingBudget) cfg.thinkingBudget = opts.thinkingBudget;
        const data: any = await callAIWithRetry('gemini', {
            model,
            contents: turnContents,
            // Mirror the SDK's config object; the proxy reads temperature/
            // maxOutputTokens from `config` and (Step 1) forwards `tools`.
            config: cfg,
            // The proxy uses top-level systemInstruction (Gemini REST shape) for
            // the explicit context cache; provide it both inline-in-config (for
            // SDK-parity semantics) and at top level (what the proxy reads).
            systemInstruction: { parts: [{ text: system }] },
            ...(opts.withTools ? { tools } : {}),
        }, {
            label: `Chat (Gemini ${model})`,
            maxAttempts: 3,
            // The tool loop can legitimately run long on a dense corpus; keep the
            // generous ceiling the SDK path effectively had (no explicit timeout).
            requestTimeoutMs: 540_000,
        });
        // Synthesize the SDK `.text` convenience field from candidate text parts.
        if (data && typeof data.text !== 'string') {
            const _parts = data?.candidates?.[0]?.content?.parts || [];
            const _t = _parts
                .filter((p: any) => typeof p?.text === 'string' && p.text.length > 0)
                .map((p: any) => p.text)
                .join('\n');
            if (_t) data.text = _t;
        }
        return data;
    };

    // Gemini conversation = list of `{role, parts:[{text|functionCall|functionResponse}]}`
    type GPart = { text?: string } | { functionCall?: { name: string; args: any } } | { functionResponse?: { name: string; response: { result: string } } };
    type GContent = { role: 'user' | 'model' | 'function'; parts: GPart[] };
    // `let`, not `const`: the context-engineering policy below (Algorithm 1 of
    // arXiv 2606.10209v1) REPLACES this array with a pruned one between
    // iterations rather than only ever appending to it.
    let contents: GContent[] = [];
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
    // 2026-08-26 (owner report, latency). The prompt already TELLS the model to
    // call fetch_wiki_articles "at most once" for a conversational question, but
    // that was compliance-only - nothing stopped a second or third call, and each
    // one is a full extra retrieval + model round trip that compounds the wait.
    // Enforce it in code for chat: the manifest corpus is already grounded into
    // the prompt (Unified Vision anti-RAG principle), so a repeat fetch is
    // redundant, not additive. Deliverable calls (deterministic) are unaffected.
    let _fetchWikiArticlesCalls = 0;
    const _geminiLoopStart = Date.now();
    // 2026-06-23 - PLAIN-CHAT LATENCY FIX. The conversational chat path (gemini-3.5-flash)
    // was burning all 5 agentic tool-iterations re-fetching the wiki (the prompt pushes
    // fetch_wiki_articles even though the manifest corpus is ALREADY injected), each round
    // growing the context -> 270s+ for a simple question. The corpus is in the prompt, so a
    // conversational answer needs at most ONE optional fetch. Cap the chat loop at 3 iterations.
    // (Hashtag deliverables force-route to Opus / callClaude, which keeps the full MAX_TOOL_ITER.)
    const _chatIterCap = Math.min(MAX_TOOL_ITER, 3);
    /**
     * 2026-08-26 CONTEXT ENGINEERING (Algorithm 1, "Less Context, Better Agents",
     * arXiv 2606.10209v1, at .claude/research/context_engineering.pdf). Tool
     * responses in this loop are the verbose kind the paper targets: one
     * fetch_wiki_articles can return 20 article bodies, and every retained pair is
     * re-sent on each subsequent iteration. On the paper's benchmark, keeping full
     * tool history scored 71.0% task completion against 91.6% for recency pruning
     * plus summarization, at 2.68x the tokens, so retention loses on both axes.
     *
     * N is DERIVED, not copied. The paper sets N=5 from its own task structure
     * ("a single itemization line requires 2-3 tool calls... five thus provide
     * working memory for approximately two complete itemization cycles"), and is
     * explicit that the window follows the workflow. HiC's chat structure is much
     * shorter: the manifest corpus is already grounded into the prompt, the
     * protocol tells the model to fetch at most once, and that limit is now
     * enforced in code below. One fetch is a complete cycle here, so two pairs is
     * the same "roughly two cycles" of working memory at HiC's scale. Copying 5
     * into a 3-iteration loop would make the policy inert.
     *
     * Deliverable generation keeps full tool context: those runs are the ones
     * whose quality the bake-offs validated, and the paper's own scope section
     * declines to claim universal generalization.
     */
    const _keepToolPairs = deterministic ? Infinity : 2;
    try {
    for (let iter = 0; iter < _chatIterCap; iter += 1) {
        // 2026-05-26 - Abort + wall-clock check at each iteration boundary
        const _sig = (globalThis as any).__hicChatAbortSignal as AbortSignal | undefined;
        if (_sig?.aborted) throw new DOMException('Cancelled by user', 'AbortError');
        if (Date.now() - _geminiLoopStart > MAX_TOOL_WALLCLOCK_MS) {
            console.warn(`[chat.tools] Gemini wall-clock budget ${MAX_TOOL_WALLCLOCK_MS}ms exceeded at iter ${iter + 1}; finalizing with current evidence`);
            break;
        }
        const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
        _prog?.(`Reasoning... iter ${iter + 1}/${_chatIterCap} (Gemini)`);
        // 2026-05-26 - 429 fallback to DeepSeek-V4-Flash. When Gemini returns
        // quota-exhausted (HTTP 429 or "Resource exhausted" message), don't
        // grind through retries - immediately re-fire the same call through
        // the proxy /api/ai/deepseek endpoint. DeepSeek is in the pipeline
        // and has separate Azure quota. The chat user sees zero downtime;
        // a one-line progress notice surfaces the fallback.
        // 2026-06-28 - routed through the proxy /api/ai/gemini chokepoint (was a
        // direct @google/genai SDK call). The proxy applies exact-match + explicit
        // context caching and handles its own 429 -> DeepSeek-V4-Flash fallback
        // (returning a Gemini-shaped 200 with _fallback_provider), so the prior
        // TS-level 429 fallback block is no longer needed here. Determinism: temp 0
        // for Gemini-tiered deliverables (bake-off #gap/#journey), 0.2 for chat.
        // Algorithm 1: build the context to SEND from the accumulated history.
        // A no-op on iteration 1 and whenever tool pairs are within the window,
        // in which case it returns the same array by reference.
        if (Number.isFinite(_keepToolPairs)) {
            try {
                const ce = await import('./contextEngineering');
                const built = await ce.constructContext(contents, {
                    isToolCall: ce.geminiIsToolCall,
                    isToolResponse: ce.geminiIsToolResponse,
                    makeSummaryMessage: ce.geminiSummaryMessage,
                    keepWindow: _keepToolPairs,
                    summaryWindow: ce.DEFAULT_SUMMARY_WINDOW,
                    summarize: async (evicted) => _summarizeEvictedToolPairs(
                        ce.geminiEvictedToText(evicted as any[]),
                    ),
                });
                if (!built.unchanged) {
                    contents = built.kept as GContent[];
                    console.log(`[chat.contextEng] pruned ${built.evictedPairs} tool pair(s) before iter ${iter + 1}; summarized=${built.summarized}; context now ${contents.length} turns`);
                }
            } catch (ceErr: any) {
                // Never let the context policy break the answer: on any failure the
                // full accumulated context stands, which is the old behavior.
                console.warn('[chat.contextEng] skipped (non-fatal):', ceErr?.message || ceErr);
            }
        }
        const response: any = await _geminiTurn(contents, {
            withTools: true,
            temperature: deterministic ? 0 : 0.2,
            // A conversational chat answer is short (16K ample); a schema-
            // constrained deliverable needs more room for the full matrix.
            maxOutputTokens: deterministic ? 32768 : 16384,
            thinkingBudget: deterministic ? undefined : 'low',
        });

        const cand = (response as any).candidates?.[0];
        const respParts: GPart[] = cand?.content?.parts || [];

        // Concat any text parts so the user gets a final answer if model also speaks
        const textBits = respParts
            .filter((p: any) => typeof p?.text === 'string' && p.text.length > 0)
            .map((p: any) => p.text);
        // 2026-06-14 - Only retain SUBSTANTIVE text. A stray "}" emitted next to
        // a tool call must not clobber lastText, or it surfaces as the answer.
        if (textBits.length > 0) {
            const joined = textBits.join('\n');
            if (!_isJunkAnswer(joined)) lastText = joined;
        }

        // Execute every functionCall part
        const callParts = respParts.filter((p: any) => p?.functionCall);
        if (callParts.length === 0) {
            const finalText = lastText || (response as any).text || '';
            if (finalText && !_isJunkAnswer(finalText)) return finalText;

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
            // No tools on the retry - force a textual answer.
            const retryResp = await _geminiTurn(contents, {
                withTools: false,
                temperature: 0.2,
                maxOutputTokens: 65536,
                thinkingBudget: deterministic ? undefined : 'low',
            });
            const retryParts: GPart[] = (retryResp as any).candidates?.[0]?.content?.parts || [];
            const retryText = retryParts
                .filter((p: any) => typeof p?.text === 'string' && p.text.length > 0)
                .map((p: any) => p.text)
                .join('\n')
                || (retryResp as any).text
                || '';
            if (retryText.trim().length > 0 && !_isJunkAnswer(retryText)) return retryText;
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
                if (!deterministic && _fetchWikiArticlesCalls >= 1) {
                    result = 'You have already fetched the wiki once this turn. Do not call fetch_wiki_articles again - answer now from the evidence already gathered, or state plainly what is missing.';
                } else {
                    _fetchWikiArticlesCalls += 1;
                    try {
                        result = await executeFetchWikiArticlesTool(call.args || {});
                    } catch (e: any) {
                        result = `(tool error: ${e?.message || 'unknown'})`;
                    }
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
    if (lastText && !_isJunkAnswer(lastText)) return lastText;
    // ENHANCEMENT P1b (2026-06-08) — graceful finalize instead of a dead-end.
    // The loop fetched evidence but never emitted a final answer (common when
    // the user asks to "focus on articles, exclude social/<institution>" and the
    // model keeps re-fetching trying to find them). Make ONE no-tools call that
    // forces the model to answer from the evidence already in `contents`, and to
    // be explicit if the corpus skewed social with few external articles - never
    // return the old "try a more focused question" dead-end.
    try {
        const _prog = (globalThis as any).__hicChatProgressFn as ((s: string) => void) | undefined;
        _prog?.('Synthesizing from gathered evidence...');
        contents.push({ role: 'user', parts: [{ text: 'You have gathered enough evidence above. Do NOT call any more tools. Answer the question now using the article, transcript, and data bodies you already retrieved. If the corpus skewed toward social posts and you found few external articles or transcripts, say so plainly and synthesize from what IS available. Never return an empty answer or tell the user to ask a more focused question.' }] });
        const finalResp: any = await _geminiTurn(contents, {
            withTools: false,
            temperature: 0.2,
            maxOutputTokens: 65536,
            thinkingBudget: deterministic ? undefined : 'low',
        });
        const finalText = finalResp?.text
            || (finalResp?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('\n').trim();
        if (finalText && !_isJunkAnswer(finalText)) return finalText;
    } catch (e: any) {
        console.warn('[chat.tools] graceful finalize failed (non-fatal):', e?.message || e);
    }
    return 'I gathered evidence but could not compose a final answer within the tool budget. Try narrowing the question (one institution, one theme, or one source type).';
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
