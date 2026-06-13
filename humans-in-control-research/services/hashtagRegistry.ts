// hashtagRegistry.ts - 2026-05-12 (Sprint Hashtag-UX)
//
// Single source of truth for every chat directive (hashtag) HiC supports.
// Used by:
//   • hashtagParser.ts - runtime parsing (parsers reference DIRECTIVES by id)
//   • CorpusChatPanel.tsx - autocomplete dropdown when user types '#'
//   • #help command - generates the live hashtag guide HTML artifact
//   • Suggested-prompts (DynamicPromptChips) - every chip includes the right tag
//
// When adding a new directive, register it here FIRST. The autocomplete,
// help artifact, and analytics all read from this list.

export type DirectiveCategory =
    | 'experience-builder'       // produces interactive prototypes / artifacts
    | 'consulting-deliverable'   // produces consulting-grade content
    | 'browse'                   // lists saved items
    | 'edit-refine'              // modifies an existing artifact
    | 'system'                   // utility / help
    ;

export interface HashtagDirective {
    /** The hashtag itself, with leading #. Lowercase. */
    id: string;
    /** Short display name. */
    name: string;
    /** Category for grouping in the help UI. */
    category: DirectiveCategory;
    /** One-line description for autocomplete + help. */
    summary: string;
    /** Multi-line longer description for the help artifact. */
    description: string;
    /** Alternate forms the user might type that route here (plurals, aliases). Lowercase, with leading #. */
    aliases?: string[];
    /** Hashtags this directive often combines with (e.g. #brief + #NXT). */
    combinesWith?: string[];
    /** Modifiers this directive accepts (e.g. `--variants k`). */
    modifiers?: Array<{ token: string; description: string; values?: string }>;
    /** Concrete example usages. */
    examples: string[];
    /** Whether the directive requires research context (themes/personas/corpus) to be loaded. */
    requiresContext: boolean;
    /** Whether the directive runs verbalized sampling under the hood. */
    usesVerbalizedSampling: boolean;
    /** Whether the directive runs the Verbalized Confidence directive (R1 self-assessment envelope). */
    usesVerbalizedConfidence?: boolean;
    /** When this was added - helps users orient to what's new. */
    introduced: string;
    /** Optional output type for the help artifact's grouping. */
    outputType?: 'prototype' | 'html_artifact' | 'presentation' | 'recommendation_tiles' | 'library_list' | 'chat_response' | 'freeform_slide' | 'slide_template';
}

export const DIRECTIVES: HashtagDirective[] = [
    // ────────────────────────────────────────────────────────────────────
    // Experience builders (produce interactive output you launch in a window)
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#proto',
        name: 'Prototype Builder',
        category: 'experience-builder',
        summary: 'Build an interactive AI-native prototype experience that runs in its own window.',
        description:
            'Runs the 5-stage Concept Decomposer → Interaction Architect → Visual Designer → Prototype Coder → Critic pipeline. Produces a self-contained React+JSX HTML prototype that uses real AI calls (Gemini, Claude, GPT) wired same-origin. Stage 1 applies verbalized sampling at three framings (convention-honoring / shifted-frame / radical) so the prototype shape is not deterministic from the slug click. When a #recommendations Non-Obvious Bet tile is the source, Stage 1 commits to the radical-reinterpretation framing.',
        combinesWith: ['#NXT', '#NU'],
        modifiers: [
            { token: '#name=<slug>', description: 'Reference a saved recommendation tile by slug - pulls its full consulting brief into Stage 1' },
        ],
        examples: [
            '#proto first-year readiness coach #NXT',
            '#proto #name=zero-draft-resume-builder #NU',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-11',
        outputType: 'prototype',
    },
    {
        id: '#prototypes',
        name: 'Prototype Library',
        category: 'browse',
        summary: 'List every saved prototype with Launch / Edit / Delete chips.',
        description: 'Bare hashtag (no topic). Renders all prototypes the current session has produced as a grid of cards. Each card shows title, code size, verdict, and the based-on slug. Launch opens the prototype in a new window; Edit applies a user-provided revision through the 5-stage pipeline; Delete soft-deletes to .deleted/.',
        examples: ['#prototypes'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-11',
        outputType: 'library_list',
    },
    {
        id: '#presentation',
        name: 'Strategic Presentation',
        category: 'consulting-deliverable',
        summary: 'Generate a multi-slide strategy presentation grounded in the corpus.',
        description: 'Composes a strategic narrative deck (~12-30 slides) using Rumelt-kernel diagnosis → guiding policy → coherent actions. Renders inline as slide canvases with NXT design tokens. Supports brand modifiers (#NXT default, #NU institutional) and modifiers like #hero, #sections, #preview, #export-pptx, #auto-open.',
        combinesWith: ['#NXT', '#NU'],
        modifiers: [
            { token: '#hero="..."', description: 'Override the hero slide headline' },
            { token: '#sections=themes,personas,recs', description: 'Restrict to listed section kinds' },
            { token: '#preview', description: 'Render without persisting' },
            { token: '#export-pptx', description: 'Also produce .pptx file' },
            { token: '#auto-open', description: 'Synchronous popup workaround' },
        ],
        examples: [
            '#presentation Co-op readiness strategy for first-year students #NU',
            '#presentation #sections=themes,recs #export-pptx',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        introduced: '2026-05-03',
        outputType: 'presentation',
    },
    {
        id: '#presentations',
        name: 'Presentation Library',
        category: 'browse',
        summary: 'List every saved presentation with Open / Edit / Delete chips.',
        description: 'Bare hashtag. Mirrors #prototypes for the presentation library.',
        examples: ['#presentations'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-09',
        outputType: 'library_list',
    },

    // ────────────────────────────────────────────────────────────────────
    // Consulting deliverables (the HTML-artifact family - Sprints H2 + H4)
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#recommendations',
        name: 'AI Tool Recommendations',
        category: 'consulting-deliverable',
        summary: 'Generate consulting-grade recommendations as GOLD recommendation slides (action title, supporting actions, impact, cited evidence).',
        description:
            'Loads the recommendation-architect skill. Extracts engagement_context (client, vendor, industry, named initiative, target segment, named stakeholders, preferred tech stack, hard non-starters, regulatory constraints) from your prompt + uploads, then produces consulting-grade recommendations grounded in the corpus via manifest-chunk retrieval. Routes through the ONE canonical engine (sendChatMessage slide-mode) and renders the GOLD recommendation slide template (action title, numbered supporting actions, impact grid/strip, cited evidence quotes, implication) - identical pipeline to #journey/#blueprint. #recommendations and #recs are the same directive. PPTX export via the gold-stage pipeline.',
        aliases: ['#recs', '#recommendation'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides', '#dense'],
        examples: [
            '#recommendations First-year co-op readiness for Northeastern; Microsoft Copilot preferred, FERPA, Liz + Jen as stakeholders #NU',
            '#recs Advancement modernization moves grounded in the corpus #slides',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-11',
        outputType: 'slide_template',
    },

    // ────────────────────────────────────────────────────────────────────
    // Design Desk freeform-HTML artifacts (5 diagram kinds + persona).
    // These route through chat → design-desk/services/chatToFreeform.ts
    // and produce a single freeform HTML slide that inherits the matching
    // exemplar's visual treatment for NXT or NU brand. Currently DO NOT
    // use Verbalized Sampling or Verbalized Confidence - VS/VC rollout to
    // this pipeline is the next scope after R1 calibrates on themes.
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#journey',
        name: 'Customer Journey Map',
        category: 'consulting-deliverable',
        summary: 'Generate a GOLD actor-lane journey matrix (stages x actor lanes, pain stacks, personas/opportunities, KPI tiles).',
        description:
            'Routes through the ONE canonical engine (sendChatMessage slide-mode) and renders the GOLD journey-map slide template: an actor-lane matrix where the matrix IS the body (stages across the top, actor lanes down, PERSONAS voice row, stacked per-phase pain cells, OPPORTUNITIES row, embedded KPI tiles, takeaway band). Manifest-chunk grounded; cite-by-pointer. NOT the Bitner blueprint (that is #blueprint). Inherits NU or NXT GOLD tokens. PPTX export via the gold-stage pipeline.',
        aliases: ['#journeys'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#journey First-year applicant from interest to enrolled #NU',
            '#journey Donor lifecycle from cultivation to stewardship #NXT',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-05-04',
        outputType: 'slide_template',
    },
    {
        id: '#blueprint',
        name: 'Service Blueprint',
        category: 'consulting-deliverable',
        summary: 'Generate a GOLD service blueprint (Bitner frontstage/backstage matrix + fail points).',
        description:
            'Routes through the ONE canonical engine (sendChatMessage slide-mode) and renders the GOLD service-blueprint slide template: the Bitner model as a matrix (phase header, mood strip, Customer / Frontstage / Backstage / Support·Data lanes, fail-points row). Manifest-chunk grounded. #blueprint owns frontstage/backstage; #journey owns the actor-lane journey. Inherits NU or NXT GOLD tokens. PPTX via the gold-stage pipeline.',
        aliases: ['#blueprints'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides', '#dense'],
        examples: [
            '#blueprint Skill-gap coaching for SME co-ops #NU',
            '#blueprint Advancement onboarding for new mid-major institutions',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-05-04',
        outputType: 'slide_template',
    },
    {
        id: '#arch',
        name: 'System Architecture Diagram',
        category: 'consulting-deliverable',
        summary: 'Generate a GOLD architecture map (layers of components, integration flows, cited nodes).',
        description:
            'Routes through the ONE canonical engine (sendChatMessage slide-mode) and renders the GOLD architecture-map slide template: layered components, integration flows, data stores, and external systems, each node annotated with corpus citations (C4 + TOGAF context conventions). Manifest-chunk grounded. Inherits NU or NXT GOLD tokens. PPTX via the gold-stage pipeline.',
        aliases: ['#architecture'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#arch Donor data platform with Slate, EverTrue, and Microsoft Copilot #NXT',
            '#arch CLR verification system: skills graph + verifier + display layer',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-05-04',
        outputType: 'slide_template',
    },
    {
        id: '#roadmap',
        name: 'Strategic Roadmap',
        category: 'consulting-deliverable',
        summary: 'Generate a GOLD roadmap timeline (NOW / NEXT / LATER horizons with initiatives, milestones, dependencies).',
        description:
            'Routes through the ONE canonical engine (sendChatMessage slide-mode) and renders the GOLD timeline slide template: NOW / NEXT / LATER horizon columns with initiatives, milestones, owner badges, and gating criteria. Manifest-chunk grounded. Inherits NU or NXT GOLD tokens. PPTX via the gold-stage pipeline.',
        aliases: ['#roadmaps'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#roadmap 6-month CLR-skill-gap-coach rollout #NU',
            '#roadmap 2026 advancement modernization sequence',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-05-04',
        outputType: 'slide_template',
    },
    {
        id: '#org',
        name: 'Org Chart',
        category: 'consulting-deliverable',
        summary: 'Generate a GOLD org chart - reporting tiers of evidence-cited node cards (DECIDES / DIRECTS / DELIVERS).',
        description:
            'Routes through the ONE canonical engine (sendChatMessage slide-mode) and renders the GOLD org-chart slide template (built from Figma NU 178:3): 2-4 reporting TIER rows, each a row of node cards with a role title, a one-line responsibility, and a NAMED source, joined by hairline drops; the decision-authority node carries an accent top border. The org chart IS the slide body. DESCRIPTIVE of the structure that exists today, never prescriptive. Manifest-chunk grounded; evidence-sensitive (best with client docs that name roles and reporting lines). Inherits NU or NXT GOLD tokens. PPTX via the gold-stage pipeline.',
        aliases: ['#orgs', '#orgchart', '#orgcharts'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides', '#dense'],
        examples: [
            '#org Northeastern Advancement Office reporting hierarchy #NU',
            '#org Co-op program stakeholders: Liz, Jen, deans, employer partners',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-05-04',
        outputType: 'slide_template',
    },
    {
        id: '#persona',
        name: 'CX Persona Card',
        category: 'consulting-deliverable',
        summary: 'Generate a CX persona card (Cooper goal-directed + JTBD) rendered through the AI chat path with the persona-card slide template.',
        description:
            'Produces persona cards through the AI chat path (NOT the design-desk freeform pipeline). Uses the persona-architect skill - two-phase: Phase A roster (archetype identification), Phase B enrichment (per-persona detail with lifeGoal / experienceGoal / functionalGoal, JTBD, motivations with verbatim corpus quotes, attributes, behaviors, tech usage). Renders inside the persona-card slide template. PPTX export available. NOT YET wired to Verbalized Sampling or Verbalized Confidence - Phase B is the highest-leverage persona surface for both, planned in R1 rollout.',
        aliases: ['#personas'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#persona First-year applicant overwhelmed by application volume #NU',
            '#personas Donor archetypes for a mid-major advancement office',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-04-15',
        outputType: 'slide_template',
    },

    // ────────────────────────────────────────────────────────────────────
    // Slide-template-rendering directives. These route through
    // sendChatMessage (corpusChatService.ts). Combined with #slide they
    // emit dedicated slide templates (prd-feature, gap-matrix, etc.).
    // Without #slide they emit chat prose with embedded :::deliverable
    // fences. Currently NO VS/VC applied - these go through the same
    // chat path as everything else and inherit only the universal tone
    // rules + prompt-improvement learned constraints.
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#prd',
        name: 'Product Requirements (PRD features)',
        category: 'consulting-deliverable',
        summary: 'Generate PRD features (problem, user story, acceptance criteria, MoSCoW priority, citations) - chat + slide-template.',
        description:
            'Loads the prd-compiler skill. Produces PRD feature blocks using the Cagan/SVPG 16-section framework: problem statement, user stories, acceptance criteria, success metrics, functional/NFRs, wireframe notes, risks, timeline. Combined with #slide, renders the prd-feature slide template. Chat-grade output otherwise.',
        aliases: ['#prds'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#prd Co-op readiness self-assessment widget #slide',
            '#prd Donor identification AI assistant for advancement officers',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-04-10',
        outputType: 'slide_template',
    },
    {
        id: '#gap',
        name: 'Gap Analysis',
        category: 'consulting-deliverable',
        summary: 'Generate a capability gap analysis with Gartner 5-level maturity scoring, severity, risk register.',
        description:
            'Loads the gap-analysis-evaluator skill. Produces capability gaps with currentMaturity / targetMaturity (1-5 Gartner scale), severity (critical/high/medium/low), business impact, evidence citations, quick wins, and risk register. Combined with #slide, renders the gap-matrix slide template.',
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#gap Advancement data quality and donor segmentation #slide',
            '#gap First-year academic-to-career bridge capability assessment',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-04-10',
        outputType: 'slide_template',
    },
    {
        id: '#audit',
        name: 'Tech Audit (Systems Inventory)',
        category: 'consulting-deliverable',
        summary: 'Generate a systems inventory with risk, consolidation opportunities, and integration map.',
        description:
            'Loads the tech-audit-inspector skill. Two-phase audit: systems inventory (each system tagged by category, status, risk, integration) → consolidation opportunities. Combined with #slide, renders the systems-inventory slide template.',
        aliases: ['#audits', '#techaudit'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#audit Advancement office tech stack - what to keep, consolidate, retire #slide',
            '#audit First-year career services systems and overlap points',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-04-10',
        outputType: 'slide_template',
    },
    {
        id: '#compete',
        name: 'Competitive Analysis',
        category: 'consulting-deliverable',
        summary: 'Generate a competitive matrix (peers, benchmark dimensions, maturity, gap summary).',
        description:
            'Loads the competitive-analyst skill. Dual-mode: named entity extraction (Slate, EverTrue, Anthology) + archetype analysis (peer institutions vs aspirational peers). Produces benchmark dimensions, maturity matrix, gap summary. Combined with #slide, renders the competitive-matrix template.',
        aliases: ['#competitive', '#competitives', '#competitors'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#compete Mid-major advancement offices using AI for donor identification #slide',
            '#competitive How Slate, EverTrue, and Salesforce position vs Microsoft Copilot for advancement',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-04-10',
        outputType: 'slide_template',
    },
    {
        id: '#case-study',
        name: 'Case Study Set',
        category: 'consulting-deliverable',
        summary: 'Generate named, evidence-grounded case studies (5W + outcome + applicability) from the corpus.',
        description:
            'Loads the case-study-analyst skill. Produces named, evidence-grounded case studies sourced from the corpus: subject (named institution / company), context, intervention, outcome with quantified delta, applicability-to-your-situation. Each case study cites verbatim quotes and named external sources. Combined with #slide or #slides, renders one case-study slide per study using the case-study slide template. The default count is 5; override with #count=N (1-12).',
        aliases: ['#case-studies', '#casestudy', '#casestudies'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        modifiers: [
            { token: '#count=N', description: 'Override default case-study count (1-12)', values: '1-12' },
        ],
        examples: [
            '#case-study Named higher-ed AI-readiness programs that improved first-year retention #slides #NU',
            '#case-study 5 SME co-op match programs across mid-major institutions #count=5',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        introduced: '2026-05-26',
        outputType: 'slide_template',
    },
    {
        id: '#strategy',
        name: 'Strategy Recommendations (Rumelt Kernel)',
        category: 'consulting-deliverable',
        summary: 'Generate strategic recommendations using Rumelt\'s Kernel: diagnosis → guiding policy → coherent actions.',
        description:
            'Loads the strategy-author skill. Produces Rumelt-kernel-grounded strategic recommendations: ONE diagnosis naming THE central challenge with specific evidence, ONE guiding policy stating the strategic approach as a DECISION, and 5-7 coherent actions that reinforce each other. Plus 15-section strategy document. Combined with #slide, renders strategy-relevant templates (timeline, principles, theme-arc).',
        aliases: ['#strategies'],
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        examples: [
            '#strategy Win first-year co-op readiness for SME employers #NU',
            '#strategy Reposition advancement office around verified outcomes',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        usesVerbalizedConfidence: false,
        introduced: '2026-04-10',
        outputType: 'slide_template',
    },
    {
        id: '#brief',
        name: 'Stakeholder Brief (HTML one-pager)',
        category: 'consulting-deliverable',
        summary: 'Generate a NXT-branded one-pager HTML artifact intended for a stakeholder to read in 90 seconds.',
        description:
            'Composes the html-deliverable-composer + verbalized-sampling skills. Produces a self-contained HTML page with a finding-grade title, one hero data point, 2-3 supporting findings, one diagram (VS-picked diagram type), Copy-as-prompt footer. Optimized for one screen + scroll. NXT branding by default (#NU for Northeastern variant). Visual layout is VS-picked from k=5 candidates - escapes the centered-card SaaS default. Add #slide for the GOLD slide TWIN (executive-brief, brief variant: hero finding + finding cards with cited evidence), manifest-grounded and brand-token skinned.',
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        modifiers: [
            { token: '--variants k', description: 'Emit k distinct variants in a 2×3 grid with Pick-this buttons (k=2-6)', values: '2-6' },
        ],
        examples: [
            '#brief Why first-year brand-name fixation costs NU $2.4B in unfilled SME co-ops #NU',
            '#brief Co-op skill-gap coach launch plan for Liz --variants 6',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-12',
        outputType: 'html_artifact',
    },
    {
        id: '#explainer',
        name: 'Concept Explainer (HTML deep-dive)',
        category: 'consulting-deliverable',
        summary: 'Generate a NXT-branded HTML explainer page for a learner to understand a concept end-to-end.',
        description:
            'Modeled on the "How rate limiting works" pattern: flow diagram up top, 2-4 annotated code/data snippets beside the prose, "Gotchas" section at the bottom with severity-coded callouts. Information architecture is VS-picked from k=5 candidates (flow-led / snippet-led / Q&A / worked-example / decision-tree). NXT branded. Copy-as-prompt footer. Length 1500-3500 words. Optimized for sequential read. Add #slide for the GOLD slide TWIN (executive-brief, explainer variant: stepped concept cards + GOTCHAS strip), manifest-grounded and brand-token skinned.',
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        modifiers: [
            { token: '--variants k', description: 'Emit k distinct variant IAs to compare' },
        ],
        examples: [
            '#explainer How CLR verifies skill claims',
            '#explainer Why our recommendation pipeline uses Verbalized Sampling',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-12',
        outputType: 'html_artifact',
    },
    {
        id: '#report',
        name: 'Strategic Report (HTML long-form)',
        category: 'consulting-deliverable',
        summary: 'Generate a long-form HTML strategic report with tabbed sections + embedded charts.',
        description:
            'For prose-dominant content where a slide deck would be the wrong format. Tabbed or anchored sections (default: Executive Summary / Findings / Recommendations / Next Steps - but the section IA is VS-picked from alternatives). Embedded charts per section. Evidence panels with verbatim corpus quotes. Length 3000-8000 words. Optimized for navigation, not sequential read. Sharable URL. Add #slide for the GOLD slide TWIN (executive-brief, report variant: hero finding + exec-summary key findings), manifest-grounded and brand-token skinned.',
        combinesWith: ['#NXT', '#NU', '#slide', '#slides'],
        modifiers: [
            { token: '--variants k', description: 'Emit k distinct report-structure variants' },
        ],
        examples: [
            '#report 2026 first-year co-op readiness state-of-the-union #NU',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-12',
        outputType: 'html_artifact',
    },
    {
        id: '#playground',
        name: 'Interactive Tuning Playground',
        category: 'consulting-deliverable',
        summary: 'Generate an interactive HTML playground for tuning parameters, with a Copy-as-prompt export.',
        description:
            'Self-contained HTML with interactive controls (NOT always sliders - VS picks the right interaction pattern: easing-curve picker, drag-to-position, before/after swap, code+live-preview, motion timeline, scrubber, etc.). Live preview area. Copy-as-prompt button serializes the user\'s settings as a prompt string to paste back into HiC for iteration. Modeled on the Thariq checkout-button-hover example. Escapes the sliders-by-default mode collapse.',
        combinesWith: ['#NXT', '#NU'],
        examples: [
            '#playground first-year career-card swipe animation',
            '#playground advisor-dashboard density tuning',
        ],
        requiresContext: false,
        usesVerbalizedSampling: true,
        introduced: '2026-05-12',
        outputType: 'html_artifact',
    },
    {
        id: '#approaches',
        name: 'Approach Picker (VS-Multi inline)',
        category: 'consulting-deliverable',
        summary: 'Generate a side-by-side comparison of 6 distinct approaches to a decision - 3 conventional + 3 non-obvious.',
        description:
            'Native VS-Multi rendered as a picker UI. Turn 1: 3 conventional approaches (full distribution) - Defensible Consensus row. Turn 2: 3 more approaches at probability < 0.05 explicitly distinct from turn 1 - Non-Obvious Bets row. Each card: name, 2-3 pros, 2-3 cons, when-to-pick-this, probability pill, "Pick this" button. Same UX shape as #recommendations, different surface - decisions/tradeoffs instead of tool concepts.',
        modifiers: [
            { token: '--variants k', description: 'Override default 6 (3+3 split)' },
        ],
        examples: [
            '#approaches How to roll out the CLR-skill-gap coach across NU',
            '#approaches Which advisor-outreach model fits a 200-student cohort',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-12',
        outputType: 'html_artifact',
    },
    {
        id: '#artifacts',
        name: 'Artifact Library',
        category: 'browse',
        summary: 'List every saved HTML artifact (briefs, explainers, reports, playgrounds, approach-pickers).',
        description: 'Bare hashtag. Renders all artifacts as a grid of cards. Each card shows title, generator (#brief / #explainer / #report / #playground / #approaches), date, variant-history badge if produced via --variants k. Launch / Show-other-variants / Delete chips.',
        examples: ['#artifacts'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-12',
        outputType: 'library_list',
    },

    // ────────────────────────────────────────────────────────────────────
    // Edit / refine
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#refine',
        name: 'Refine Artifact',
        category: 'edit-refine',
        summary: 'Refine an existing artifact (prototype, presentation, or HTML artifact) with a follow-up instruction.',
        description: 'Targets an existing slug by name. Re-runs the appropriate pipeline (prototype 5-stage, presentation composer, HTML artifact composer) with the user\'s tweak instruction layered onto the existing artifact. Preserves the slug so the in-place update is visible. Round-trip pattern from the Copy-as-prompt buttons on artifact pages emits #refine prompts.',
        examples: [
            '#refine clr-skills-gap-analyzer: add a peer-comparison chart',
            '#refine first-year-readiness-brief: emphasize Microsoft Copilot fit',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        introduced: '2026-05-12',
        outputType: 'chat_response',
    },

    // ────────────────────────────────────────────────────────────────────
    // System
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#help',
        name: 'Help - Hashtag Reference Guide',
        category: 'system',
        summary: 'Generate an HTML reference guide for every directive HiC supports, with examples.',
        description: 'Bare hashtag. Generates a self-contained NXT-branded HTML artifact listing every directive in this registry, grouped by category, with examples + modifiers + when-introduced. Opens in a new window. Sharable URL for onboarding new team members.',
        examples: ['#help'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-12',
        outputType: 'html_artifact',
    },

    // ────────────────────────────────────────────────────────────────────
    // Modifier-only (not standalone)
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#slide',
        name: 'Render as 16:9 Slide',
        category: 'system',
        summary: 'Render the next deliverable inside a 16:9 slide frame (NXT or NU branded).',
        description: 'View modifier. Combines with any deliverable that has a slide-template implementation (#prd, #gap, #audit, #compete, #strategy, #persona, #journey, #blueprint, #arch, #roadmap, #org). When present, the output is rendered as a SlideCanvas with brand-applied styling and is eligible for PPTX/PDF export. Without #slide, the same deliverable renders as chat prose or freeform-HTML.',
        combinesWith: ['#NXT', '#NU', '#prd', '#gap', '#audit', '#compete', '#strategy', '#persona', '#journey', '#blueprint', '#arch', '#roadmap', '#org'],
        examples: [
            '#gap Advancement data quality #slide #NXT',
            '#persona First-year applicant overwhelmed by volume #slide #NU',
        ],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-04-10',
    },
    {
        id: '#slides',
        name: 'Multi-Slide Composition',
        category: 'system',
        summary: 'Render multiple deliverables in this turn as a continuous multi-slide composition.',
        description: 'View modifier. Like #slide but for compositions - every slide-template emitted in the same chat turn renders sequentially as a multi-slide block. Used when a single prompt produces multiple slide kinds (e.g. "#themes #personas #recs #slides").',
        combinesWith: ['#NXT', '#NU'],
        examples: [
            'Show me themes, personas, and recs as a deck - #slides #NU',
        ],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-04-10',
    },
    {
        id: '#dense',
        name: 'Dense Variant (universal density axis)',
        category: 'system',
        summary: 'Force the dense variant of every slide template emitted this turn - more items, count-adaptive type, PPTX-safe.',
        description: 'View modifier. Raises every template\'s item ceilings per the shared DENSITY_SPEC (components/slideTemplates/types.ts) in BOTH the web preview and the 1920x1080 PPTX stage twin: more bullets, quotes, rows, phases, or features, with type sizes adapting to the actual item count so nothing overflows the 16:9 canvas. The model also sets density=dense on its own when the user asks for more detail or modifies a prior generation to add items beyond the base ceiling - #dense is the explicit override. Density raises CEILINGS, not floors: every added item must be evidenced.',
        combinesWith: ['#slide', '#slides', '#NXT', '#NU', '#themes', '#persona', '#recommendations', '#case-study', '#gap', '#compete', '#prd', '#audit', '#roadmap', '#strategy'],
        examples: [
            '#themes all eight patterns with quotes #slides #dense #NU',
            '#case-study Giving Day with the full evidence base #slide #dense',
        ],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-06-10',
    },
    {
        id: '#NXT',
        name: 'NXT Brand (default)',
        category: 'system',
        summary: 'Apply NXT Humans branding (near-black + chartreuse + Bebas Neue). Default when no brand is named.',
        description: 'Modifier hashtag - combines with experience builders and consulting deliverables. NXT design system: foundation neutrals + chartreuse #B8B800 as primary accent + Bebas Neue display / Archivo body / JetBrains Mono code. Sharp 2px corners, geometric, restrained.',
        examples: ['#proto first-year coach #NXT', '#brief ... #NXT'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-11',
    },
    {
        id: '#NU',
        name: 'Northeastern University Brand',
        category: 'system',
        summary: 'Apply Northeastern University branding (Pantone 200 #C8102E + Roboto Condensed + Open Sans).',
        description: 'Modifier hashtag for the Northeastern variant. Pantone 200 red (#C8102E - never #C00000), Roboto Condensed for display, Open Sans for body, asymmetric editorial layouts. Used for any deliverable bound for NU stakeholders.',
        examples: ['#proto ... #NU', '#brief ... #NU', '#presentation ... #NU'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-11',
    },

    // ────────────────────────────────────────────────────────────────────
    // 2026-05-24 - NotebookLM uplift Phase 4-6 deliverables
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#mindmap',
        name: 'Mind Map',
        category: 'consulting-deliverable',
        summary: 'Build a navigable mind-map from the corpus themes, with click-to-chat drill-down.',
        description: 'Takes the BERTopic v2 cluster output + research goal and emits a nested mind-map artifact (max depth 4, max 7 children per node). Each node carries chunk_ids for click-to-chat drill-down. Convergent-evidence clusters (themes that appeared across ≥2 source types) get a visual ring treatment. Rendered in the Designer Window with d3 force-directed layout; exports to PNG via paint-sync. Differentiated from NotebookLM\'s Mind Map by the source-stratification flag - NotebookLM doesn\'t categorize sources.',
        aliases: ['#mind-map', '#mindmaps'],
        combinesWith: ['#NXT', '#NU'],
        examples: ['#mindmap', '#mindmap #NU'],
        requiresContext: true,
        usesVerbalizedSampling: false,
        introduced: '2026-05-24',
        outputType: 'html_artifact',
    },
    {
        id: '#deep-research',
        name: 'HiC Deep Research',
        category: 'experience-builder',
        summary: 'Plan-act-reflect research loop with a Human-in-Control plan-edit gate BEFORE collection.',
        description: 'The "Humans in Control" feature. Steps: (1) planner emits a research_plan.json with sub-questions, source strategy, named institutions, budget cap, reflection threshold - using Opus 4.7 + extended thinking. (2) UI renders the plan as an editable form. User edits, removes, or approves. (3) After approval, the data fabric runs in an iteration loop with Sonnet 4.6 reflector deciding "covered / gap_remains / new_question" after each batch. (4) All reflection traces persist to engagements/<slug>/research_log.json for audit. Hard cap N iterations + budget cap. NotebookLM has Deep Research; only HiC has it with a deliberate user checkpoint at the planning stage.',
        aliases: ['#deep-research', '#research-deep', '#research-plan'],
        combinesWith: ['#NU', '#NXT'],
        modifiers: [
            { token: '--budget', description: 'Hard USD cap on the research loop', values: 'number (default 5)' },
            { token: '--iterations', description: 'Max reflector loop iterations', values: 'integer (default 6)' },
        ],
        examples: [
            '#deep-research northeastern co-op strategy',
            '#deep-research mid-market B2B SaaS retention --budget 10 --iterations 8',
        ],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-24',
        outputType: 'chat_response',
    },
    {
        id: '#brief-dialog',
        name: 'Brief Dialog',
        category: 'consulting-deliverable',
        summary: 'Two-persona text dialogue (Skeptical Partner + Curious Strategist) pressure-testing a finding.',
        description: '~600-900 word transcript of two voices in conversation about a research finding or recommendation set. The Skeptical Partner names prior failures and quotes counter-numbers; the Curious Strategist defends with named source citations. ONE concession is mandatory from the Partner. Final stance is one of: stronger / qualified / rejected. Text-first (sidesteps voice IP risk + Audio Overview TTS gap + aligns with the consulting use case where partners READ briefs in meetings). Optional v2: send transcript to ElevenLabs for two-voice audio rendering (gated on legal review).',
        aliases: ['#dialog', '#brief-dialogue'],
        combinesWith: ['#NU', '#NXT'],
        examples: [
            '#brief-dialog Why first-year preparedness drives co-op outcomes',
            '#brief-dialog #NU pressure-test the CLR-skill-gap coach recommendation',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        introduced: '2026-05-24',
        outputType: 'html_artifact',
    },
    {
        id: '#meta-themes',
        name: 'Portfolio Patterns (Meta-Themes)',
        category: 'consulting-deliverable',
        summary: 'Themes that recur across ≥3 engagements in the HiC engagement portfolio. Platform-level patterns.',
        description: 'Reads every engagements/<slug>/themes.json + wiki/synthesis/cross-engagement-patterns.md. Surfaces themes that recur across ≥3 engagements as portfolio patterns; themes in ≥5 engagements get a "platform pattern" treatment. The differentiation NotebookLM categorically cannot do because they have no concept of an engagement portfolio. Surfaced in the Knowledge Library as "Portfolio Patterns". Themes are clustered by name + summary similarity; canonical names picked by Sonnet 4.6 at temp=0 from variant set.',
        aliases: ['#meta-theme', '#portfolio-themes', '#platform-patterns'],
        examples: ['#meta-themes', '#meta-themes higher-ed'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-24',
        outputType: 'chat_response',
    },
    {
        id: '#themes',
        name: 'Themes (Theme Clusters)',
        category: 'consulting-deliverable',
        summary: 'Emerging themes synthesized from the corpus, anchored on the research objective, rendered as theme-cluster slides.',
        description: 'Loads the theme-analyst skill. Synthesizes the corpus into N distinct themes (honors a leading count, e.g. "8 #themes"), each with a one-line insight and verbatim evidence quotes with named sources. Emits :::slide template=theme-cluster blocks (max 4 themes per cluster slide, so 8 themes render as 2 slides). Anchored on the research objective: off-objective clusters are dropped or reframed. Evidence quotes are sanitized of synthesis-as-source attributions, goal-alignment metadata, and raw chunk dumps. Combine with #slides to render the full deck, #NXT/#NU for brand.',
        aliases: ['#theme', '#themecluster', '#theme-cluster'],
        combinesWith: ['#NU', '#NXT', '#slide', '#slides'],
        examples: [
            '8 #themes on emerging AI design trends for creative teams #slides #NXT',
            '#themes the biggest tensions in AI-assisted design work #slide #NU',
        ],
        requiresContext: true,
        usesVerbalizedSampling: false,
        introduced: '2026-06-01',
        outputType: 'chat_response',
    },
];

export function findDirective(idOrText: string): HashtagDirective | undefined {
    const raw = idOrText.toLowerCase().trim();
    const norm = raw.startsWith('#') ? raw : '#' + raw;
    return DIRECTIVES.find(d =>
        d.id === norm
        || (Array.isArray(d.aliases) && d.aliases.includes(norm))
    );
}

/** Used by autocomplete: suggest directives that match a partial token. */
export function searchDirectives(partial: string, limit = 8): HashtagDirective[] {
    const norm = partial.toLowerCase().trim().replace(/^#/, '');
    if (!norm) {
        // Bare '#' - show every non-system directive in registration order (which
        // groups them by category: experience-builder → consulting-deliverable →
        // browse → edit-refine). The autocomplete UI groups visually beyond this.
        // Note: limit is raised when partial is empty so users see the full set,
        // not a truncated 8-row dropdown. Callers can still pass an explicit
        // limit to override.
        const nonSystem = DIRECTIVES.filter(d => d.category !== 'system');
        return nonSystem.slice(0, Math.max(limit, nonSystem.length));
    }
    // Score directives by how well they match. A direct id-startsWith outranks
    // an alias-startsWith outranks a name/summary substring match. This keeps
    // the most "expected" hit (#per → #persona) above looser ones.
    const scored: Array<{ d: HashtagDirective; score: number }> = [];
    for (const d of DIRECTIVES) {
        const idTail = d.id.toLowerCase().replace(/^#/, '');
        let score = 0;
        if (idTail.startsWith(norm)) score = 100;
        else if (idTail.includes(norm)) score = 60;
        if (Array.isArray(d.aliases)) {
            for (const a of d.aliases) {
                const aTail = a.toLowerCase().replace(/^#/, '');
                if (aTail.startsWith(norm)) score = Math.max(score, 80);
                else if (aTail.includes(norm)) score = Math.max(score, 40);
            }
        }
        if (d.name.toLowerCase().includes(norm)) score = Math.max(score, 30);
        if (d.summary.toLowerCase().includes(norm)) score = Math.max(score, 10);
        if (score > 0) scored.push({ d, score });
    }
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.d);
}

export function directivesByCategory(): Record<DirectiveCategory, HashtagDirective[]> {
    const out: Record<DirectiveCategory, HashtagDirective[]> = {
        'experience-builder': [],
        'consulting-deliverable': [],
        'browse': [],
        'edit-refine': [],
        'system': [],
    };
    for (const d of DIRECTIVES) out[d.category].push(d);
    return out;
}

export const CATEGORY_LABELS: Record<DirectiveCategory, string> = {
    'experience-builder': 'Build interactive experiences',
    'consulting-deliverable': 'Generate consulting deliverables',
    'browse': 'Browse saved work',
    'edit-refine': 'Refine existing artifacts',
    'system': 'Branding & utilities',
};
