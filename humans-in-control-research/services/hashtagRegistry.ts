// hashtagRegistry.ts — 2026-05-12 (Sprint Hashtag-UX)
//
// Single source of truth for every chat directive (hashtag) HiC supports.
// Used by:
//   • hashtagParser.ts — runtime parsing (parsers reference DIRECTIVES by id)
//   • CorpusChatPanel.tsx — autocomplete dropdown when user types '#'
//   • #help command — generates the live hashtag guide HTML artifact
//   • Suggested-prompts (DynamicPromptChips) — every chip includes the right tag
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
    /** When this was added — helps users orient to what's new. */
    introduced: string;
    /** Optional output type for the help artifact's grouping. */
    outputType?: 'prototype' | 'html_artifact' | 'presentation' | 'recommendation_tiles' | 'library_list' | 'chat_response';
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
            { token: '#name=<slug>', description: 'Reference a saved recommendation tile by slug — pulls its full consulting brief into Stage 1' },
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
    // Consulting deliverables (the HTML-artifact family — Sprints H2 + H4)
    // ────────────────────────────────────────────────────────────────────
    {
        id: '#recommendations',
        name: 'AI Tool Recommendations (VS-Multi)',
        category: 'consulting-deliverable',
        summary: 'Generate consulting-grade AI tool recommendations split into Defensible Consensus + Non-Obvious Bets.',
        description:
            'Loads the recommendation-architect skill + verbalized-sampling skill. Extracts engagement_context (client, vendor, industry, named initiative, target segment, named stakeholders, preferred tech stack, hard non-starters, regulatory constraints) from your prompt + uploads. Produces two concept groups: 5 Defensible Consensus (full distribution) + 5 Non-Obvious Bets (probability < 0.05, deep-tail sampling) explicitly distinct from the consensus set. Renders as two visually-differentiated tile sections (chartreuse-bordered consensus, cyan-bordered bets with BET badge + probability pills). Each tile expandable to a 12-field consulting brief (description, why-matters-for-segment, long-term-outcome-through-line, initiative-dependency, existing-stack execution, preferred-stack fit, stakeholders, implementation steps, risks, guardrail fit, expected impact, verbatim corpus quote).',
        examples: [
            '#recommendations You are a senior AI strategy consultant for NXT Humans helping Northeastern improve first-year co-op readiness. Constraints: no new platform, Microsoft Copilot preferred, FERPA, Liz + Jen as stakeholders. 5 CLR-dependent + 5 CLR-independent.',
        ],
        requiresContext: true,
        usesVerbalizedSampling: true,
        introduced: '2026-05-11',
        outputType: 'recommendation_tiles',
    },
    {
        id: '#brief',
        name: 'Stakeholder Brief (HTML one-pager)',
        category: 'consulting-deliverable',
        summary: 'Generate a NXT-branded one-pager HTML artifact intended for a stakeholder to read in 90 seconds.',
        description:
            'Composes the html-deliverable-composer + verbalized-sampling skills. Produces a self-contained HTML page with a finding-grade title, one hero data point, 2-3 supporting findings, one diagram (VS-picked diagram type), Copy-as-prompt footer. Optimized for one screen + scroll. NXT branding by default (#NU for Northeastern variant). Visual layout is VS-picked from k=5 candidates — escapes the centered-card SaaS default.',
        combinesWith: ['#NXT', '#NU'],
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
            'Modeled on the "How rate limiting works" pattern: flow diagram up top, 2-4 annotated code/data snippets beside the prose, "Gotchas" section at the bottom with severity-coded callouts. Information architecture is VS-picked from k=5 candidates (flow-led / snippet-led / Q&A / worked-example / decision-tree). NXT branded. Copy-as-prompt footer. Length 1500-3500 words. Optimized for sequential read.',
        combinesWith: ['#NXT', '#NU'],
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
            'For prose-dominant content where a slide deck would be the wrong format. Tabbed or anchored sections (default: Executive Summary / Findings / Recommendations / Next Steps — but the section IA is VS-picked from alternatives). Embedded charts per section. Evidence panels with verbatim corpus quotes. Length 3000-8000 words. Optimized for navigation, not sequential read. Sharable URL.',
        combinesWith: ['#NXT', '#NU'],
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
            'Self-contained HTML with interactive controls (NOT always sliders — VS picks the right interaction pattern: easing-curve picker, drag-to-position, before/after swap, code+live-preview, motion timeline, scrubber, etc.). Live preview area. Copy-as-prompt button serializes the user\'s settings as a prompt string to paste back into HiC for iteration. Modeled on the Thariq checkout-button-hover example. Escapes the sliders-by-default mode collapse.',
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
        summary: 'Generate a side-by-side comparison of 6 distinct approaches to a decision — 3 conventional + 3 non-obvious.',
        description:
            'Native VS-Multi rendered as a picker UI. Turn 1: 3 conventional approaches (full distribution) — Defensible Consensus row. Turn 2: 3 more approaches at probability < 0.05 explicitly distinct from turn 1 — Non-Obvious Bets row. Each card: name, 2-3 pros, 2-3 cons, when-to-pick-this, probability pill, "Pick this" button. Same UX shape as #recommendations, different surface — decisions/tradeoffs instead of tool concepts.',
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
        name: 'Help — Hashtag Reference Guide',
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
        id: '#NXT',
        name: 'NXT Brand (default)',
        category: 'system',
        summary: 'Apply NXT Humans branding (near-black + chartreuse + Bebas Neue). Default when no brand is named.',
        description: 'Modifier hashtag — combines with experience builders and consulting deliverables. NXT design system: foundation neutrals + chartreuse #B8B800 as primary accent + Bebas Neue display / Archivo body / JetBrains Mono code. Sharp 2px corners, geometric, restrained.',
        examples: ['#proto first-year coach #NXT', '#brief … #NXT'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-11',
    },
    {
        id: '#NU',
        name: 'Northeastern University Brand',
        category: 'system',
        summary: 'Apply Northeastern University branding (Pantone 200 #C8102E + Roboto Condensed + Open Sans).',
        description: 'Modifier hashtag for the Northeastern variant. Pantone 200 red (#C8102E — never #C00000), Roboto Condensed for display, Open Sans for body, asymmetric editorial layouts. Used for any deliverable bound for NU stakeholders.',
        examples: ['#proto … #NU', '#brief … #NU', '#presentation … #NU'],
        requiresContext: false,
        usesVerbalizedSampling: false,
        introduced: '2026-05-11',
    },
];

export function findDirective(idOrText: string): HashtagDirective | undefined {
    const norm = idOrText.toLowerCase().trim();
    return DIRECTIVES.find(d => d.id === norm || d.id === '#' + norm.replace(/^#/, ''));
}

/** Used by autocomplete: suggest directives that match a partial token. */
export function searchDirectives(partial: string, limit = 8): HashtagDirective[] {
    const norm = partial.toLowerCase().trim().replace(/^#/, '');
    if (!norm) return DIRECTIVES.filter(d => d.category !== 'system').slice(0, limit);
    return DIRECTIVES
        .filter(d =>
            d.id.toLowerCase().replace(/^#/, '').startsWith(norm)
            || d.name.toLowerCase().includes(norm)
            || d.summary.toLowerCase().includes(norm)
        )
        .slice(0, limit);
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
