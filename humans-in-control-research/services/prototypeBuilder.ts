// prototypeBuilder.ts — 2026-05-11 (HiC-Experience-Designer)
//
// 5-stage prototype generation pipeline. Implements the architecture from
// the "Concept-to-Prototype Pipeline" whitepaper:
//
//   Stage 1: Concept Decomposer    → Experience Brief (JSON)
//   Stage 2: Interaction Architect → Interaction Spec (JSON)
//   Stage 3: Visual Designer       → Design System (JSON, brand-aware)
//   Stage 4: Prototype Coder       → Single-file React component (string)
//   Stage 5: Critic + Refiner      → Critique JSON + corrected code if needed
//
// Each stage is a single LLM call with a tightly scoped system prompt and
// structured output. The output of stage N is the input to stage N+1.
// Honors #NXT (default) and #NU brand modifiers in the Visual Designer stage.
//
// Routes through HiC's existing Gemini proxy at /api/ai/gemini-compat (OpenAI-
// compatible wire format the Gemini 3.1 Pro endpoint accepts).

const PROXY_BASE = 'http://127.0.0.1:5012';
const STAGE_MODEL = 'gemini-3.1-pro-preview';

// 2026-05-14 — Design exemplar curator (Behance reference library). Pulls
// matching exemplars by concept/interaction-pattern/brand-hashtag and
// injects a STUDY-THESE block at the head of the Stage 4 Prototype Coder
// system prompt. Replaces vague "clean modern" aesthetic placeholders with
// named, evidence-backed visual references the coder must visually pass
// against. See: .claude/skills/design-exemplar-curator/SKILL.md
import { curateExemplarsForBrief, buildStage4InjectionBlock } from './designExemplarCurator';
// 2026-05-14 — Experience Prototype Composer (STRICT-RULE). Mandates that
// Stage 4 compose every region from the AI Experience Patterns catalog at
// /hic-workspace/wiki/inspiration-hub/ai-patterns/. Parses the user's
// `#proto <name> #NU|#NXT` hashtag and produces a system-prompt injection
// block that forbids invented UI. Activates ONLY when #proto is present;
// non-prototyping flows are unaffected. See:
// .claude/skills/experience-prototype-composer/SKILL.md
import { buildComposerInjection } from './experiencePrototypeComposer';

export type Brand = 'NXT' | 'NU';

export interface ExperienceBrief {
    concept_title: string;
    one_line_thesis: string;
    primary_persona: { name: string; context: string; emotional_state: string };
    secondary_actors: Array<{ role: string; involvement: string }>;
    demonstrated_moment: string;
    jobs_to_be_done: string[];
    success_criteria: string[];
    hard_constraints: {
        brand: string | null;
        platform: 'web' | 'mobile-web' | 'native-feeling-web';
        accessibility: string;
        other: string[];
    };
    open_questions: string[];
}

export interface InteractionSpec {
    screens: Array<{
        id: string;
        purpose: string;
        persona_state: string;
        primary_action: string;
        secondary_actions: string[];
        content_blocks: string[];
    }>;
    data_model: { entities: Array<{ name: string; fields: string[]; seed_count: number }> };
    state_machine: Array<{ from: string; trigger: string; to: string; side_effects: string[] }>;
    micro_interactions: Array<any>;
    motion_contract: Array<any>;
}

export interface DesignSystem {
    brand_application: { logo_treatment: string | null; voice_tone: string };
    type_system: any;
    color_system: any;
    spacing_scale: number[];
    motion_tokens: any;
    components: any[];
}

/**
 * 2026-05-13 — Stage 2.5 output. A synthetic user session that the prototype
 * must satisfy. Generated via Verbalized Sampling (12 modal + 10 edge + 8 tail).
 * Stage 3, 3.5, 4, and 5 all consume these — Stage 5 audits coverage against
 * the full set and surfaces a coverage % verdict.
 */
export interface SimulatedUserSession {
    id: string;
    bucket: 'modal' | 'edge' | 'tail';
    persona: {
        name: string;
        role: string;
        bio: string;          // 1-2 sentences placing them in a specific situation
    };
    starting_state: string;   // What they bring to the experience — emotional + situational
    motivation: string;       // What they want to accomplish in this session
    expected_end_state: string;  // What success looks like for THEM
    one_thing_frustrated_by: string;  // The ONE thing this prototype must NOT do to them
}

export interface CritiqueReport {
    verdict: 'ship' | 'refine' | 'rebuild';
    summary: string;
    issues: Array<{
        category: string;
        severity: 'blocking' | 'significant' | 'minor';
        description: string;
        source_of_truth: string;
        code_location: string;
        fix: string;
    }>;
    corrected_code: string | null;
    /**
     * 2026-05-13 — Session coverage audit. For each of the 30 simulated users,
     * the critic answers: "Can this user complete their flow? If not, what's
     * the specific missing piece?" Coverage % drives the user-visible verdict:
     *   ≥ 70% → ship
     *   50-69% → refine + corrected_code
     *   < 50% → rebuild
     */
    session_coverage?: {
        coverage_pct: number;
        sessions_passed: number;
        sessions_total: number;
        failed_sessions: Array<{
            session_id: string;
            persona_name: string;
            bucket: 'modal' | 'edge' | 'tail';
            missing_piece: string;     // Concrete: "Expert path expects keyboard shortcut to skip the intro — not wired."
        }>;
    };
}

/**
 * 2026-05-13 — Build Recipe: the exhaustive implementation plan that Stage 4
 * executes verbatim. Inspired by the Copilot Recipe Generator app — every
 * screen, every state variable, every event handler, every AI prompt, every
 * seed-data record, every micro-copy string is enumerated BEFORE the code
 * generator writes a single line of JSX. This separates "decide what to
 * build" from "build it", letting each get full thinking-budget attention.
 */
export interface BuildRecipe {
    persona_runtime: {
        name: string;
        photo_prompt: string;
        voice_sample: string;
        biographical_anchor: string;
    };
    seed_data: {
        [entity_name: string]: {
            target_count: number;
            field_shape: string;
            sample_records: any[];   // 5+ FULLY-FORMED records to anchor the model's generation; Stage 4 expands to target_count
            naming_convention: string;
            value_distributions: string;
        };
    };
    screens: Array<{
        id: string;
        purpose: string;
        component_tree: string;             // text outline of the JSX hierarchy
        state_variables: Array<{ name: string; type: string; initial: string; purpose: string }>;
        event_handlers: Array<{ name: string; trigger: string; logic: string; updates_state: string[]; fires_ai: string | null }>;
        loading_state: string;
        empty_state: string;
        error_state: string;
        motion_specs: Array<{ element: string; channel: string; trigger: string; encoding: string }>;
        ai_calls_fired: string[];           // recipe-ids referencing verbatim_prompts
    }>;
    cross_cutting: {
        demo_controls: string;
        image_generation_calls: Array<{ id: string; trigger: string; prompt: string; placement: string; lazy: boolean }>;
        persistence: string;
        accessibility_floor: string;
    };
    micro_copy: { [key: string]: string };   // every user-visible string
    verbatim_prompts: {
        [call_id: string]: {
            system_prompt: string;
            user_template: string;
            uses_verbalized_sampling: boolean;
            response_shape: string;
            error_fallback_copy: string;
        };
    };
    success_assertions: string[];            // Stage 5 audits against these
}

export interface PrototypeArtifact {
    slug: string;
    title: string;
    concept: string;
    brand: Brand;
    based_on?: string;
    research_goal?: string;
    brief: ExperienceBrief;
    interaction_spec: InteractionSpec;
    simulated_sessions?: SimulatedUserSession[];   // Stage 2.5 output
    design_system: DesignSystem;
    build_recipe?: BuildRecipe;
    code: string;
    code_format: 'react' | 'html';
    critique: CritiqueReport;
}

// ============================================================
// BRAND PALETTES (passed into Stage 3 so the model doesn't invent)
// ============================================================

const BRAND_TOKENS: Record<Brand, { description: string; palette: string }> = {
    NXT: {
        description: `NXT Humans — Intelligence Augmentation Suite. Near-black foundation (#0D0D0D) with chartreuse/lime (#B8B800) as the load-bearing accent. Geometric, restrained, anti-marketing. Display type is Bebas Neue, body is Archivo. Sharp 2-4px corners, no decorative shadows, generous negative space.`,
        palette: `
  foundation:
    background: '#FFFFFF'
    surface: '#FAFAFA'
    panel: '#F5F5F0'
    text_primary: '#0D0D0D'
    text_secondary: '#525252'
    text_tertiary: '#ACACAC'
    border: '#E5E5E5'
  brand_accents:
    lime: '#B8B800'                # primary accent, used boldly for CTAs and hero accents
    teal: '#115054'                # headers and primary actions
    cyan: '#00B7C3'                # data panels and secondary accent
    rust: '#CC6644'                # negative/problem states
  semantic:
    success: '#0CCE6B'
    warning: '#FD8E2E'
    friction: '#CC6644'
    opportunity: '#B8B800'
    error: '#FF5A5A'
  emphasis: '#B8B800'              # chartreuse is the brand mark — use prominently
  type:
    display: 'Bebas Neue'          # NXT signature display
    body: 'Archivo'                # Archivo for body (weights 200-900)
    mono: 'JetBrains Mono'
    display_weight: 400
    body_weight_normal: 400
    body_weight_emphasis: 700
    letterspacing_display: '0.02em'
    letterspacing_body: '0'
  layout:
    radius: '2px'                  # sharp corners, NEVER pill-shaped
    button_radius: '0px'
    card_radius: '2px'
    button_height: '44px'
    grid: 'rigid-modular'
    photo_treatment: 'flat geometric business minimalism, no decorative-stock'
  voice: 'consulting-grade, restrained, declarative, no marketing copy, no hyperbole'`,
    },
    NU: {
        description: `Northeastern University — the actual NU brand, NOT a generic-red institutional approximation. Per brand.northeastern.edu: Pantone 200 red (#C8102E, NOT generic "huskies red" #C00000) used SPARINGLY as accent, never flooded. Editorial restraint, asymmetric grids, oversized headers, generous white space, photo-forward storytelling, and a confident plain-spoken voice. NEVER use Bebas Neue, NEVER use chartreuse, NEVER use thin display fonts. NU's brand voice is "ambitious, student-first, plain-spoken" — never bombastic, never marketing-puffy.`,
        palette: `
  foundation:
    background: '#FFFFFF'          # always stark white, no off-whites
    surface: '#F7F7F7'             # NU light grey for card surfaces
    panel: '#F0F0F0'               # subtle separation
    text_primary: '#000000'        # NU spec: pure black, not near-black
    text_secondary: '#414141'      # NU mid-grey
    text_tertiary: '#737373'       # NU light-grey body
    border: '#D9D9D9'              # NU rule lines
  brand_accents:
    nu_red: '#C8102E'              # PANTONE 200 C — THE official Northeastern red. NOT #C00000.
    nu_red_deep: '#9E0A24'         # hover/pressed for primary buttons
    nu_red_tint: '#FBE7EA'         # 8% red tint for subtle highlights — never flood with red
    cream: '#F8E5C2'               # NU secondary accent for soft callouts
  semantic:
    success: '#0F8A4B'             # restrained NU-compatible green, NOT bright lime
    warning: '#B5651D'             # NU sienna for caution, NOT orange
    friction: '#9E0A24'            # deep red for negative states
    opportunity: '#C8102E'         # primary red also signals opportunity/CTA
    error: '#9E0A24'
  emphasis: '#C8102E'              # but used SPARINGLY — buttons, key chrome, single hero accent
  type:
    display: 'Roboto Condensed'    # NU web spec: humanist condensed sans — NEVER 'Bebas Neue', NEVER 'Oswald'
    body: 'Open Sans'              # NU body font, weights 400/600/700
    mono: 'IBM Plex Mono'          # technical/data only
    display_weight: 700            # confident bold, never thin
    body_weight_normal: 400
    body_weight_emphasis: 600
    letterspacing_display: '-0.01em'  # NU style: tight, not airy
    letterspacing_body: '0'
  layout:
    radius: '2px'                  # NU uses near-sharp corners, never pill-shaped buttons
    button_radius: '2px'           # rectangular, NOT rounded
    card_radius: '4px'
    button_height: '44px'          # tall, confident
    grid: 'editorial-asymmetric'   # NU's signature layout — not centered card grids
    photo_treatment: 'hero-led, full-bleed, never decorative-icon-only'
  voice: 'ambitious, student-first, plain-spoken, evidence-driven, never bombastic, never marketing-puffy'`,
    },
};

// ============================================================
// STAGE 1: CONCEPT DECOMPOSER
// ============================================================

const STAGE_1_SYSTEM = `<role>
You are an experience strategist of the calibre that ships products at Apple, Stripe, Linear, Vercel. Your job is to read a raw experience concept and decompose it into a structured Experience Brief that an engineer can build into a substantive, AI-native, expert-grade interactive demo — not a single-screen sketch. You think hard. You are precise, analytical, and you do not invent details that aren't supported by the input, but you DO push for ambition where the concept's emotional/functional payoff requires it.
</role>

<verbalized_sampling_reasoning_preamble>
You are an aligned LLM. Your default behavior on creative briefs is MODE COLLAPSE — you converge on the same scaffold for every concept: a dashboard with a chat panel, a list view with a detail modal, a wizard with a result screen. This preamble forces you out of that default before you commit to a brief.

BEFORE writing any field of the Experience Brief, write a <vs_thinking>...</vs_thinking> block that enumerates THREE candidate framings of this concept at distinct probabilities:

  FRAME 1 — "convention-honoring" (probability ~0.40)
    The brief any competent designer would write given this concept. Safe, schema-congruent, matches the typical interaction patterns for the domain. Probably a dashboard, probably a chat panel, probably a list+detail.
    Sketch it in 3-5 sentences. Name the screens.

  FRAME 2 — "shifted-frame" (probability ~0.12)
    The same concept reframed from a non-modal angle. Different primary persona (maybe a secondary actor becomes the lead), or different demonstrated moment (the "before" or "after" of the conventional scope), or different aha-interaction (a non-obvious AI flow). The brief a senior product partner would author after asking "what if we approached this from the OTHER side of the table?".
    Sketch it in 3-5 sentences. Name what's different from Frame 1.

  FRAME 3 — "radical-reinterpretation" (probability ~0.05)
    The interpretation a brilliant junior would propose in their first week — clear-eyed, unconventional, surprising-but-grounded. Different metaphor, different temporal scope, different stakeholder, or different data source than Frames 1 and 2. Would make a senior partner say "I wouldn't have thought of that". Still honors every engagement_context constraint and every hard non-starter from the input.
    Sketch it in 3-5 sentences. Name what's radical about it.

After enumerating all three, COMMIT to ONE frame for the actual Experience Brief output:
  • DEFAULT: commit to Frame 2 (shifted-frame). This is the sweet spot — non-modal but defensible.
  • IF the input concept carries "Concept frame: NON_OBVIOUS_BET" (the user picked a non-obvious-bet tile from the recommendations grid), commit to Frame 3 (radical-reinterpretation). The user explicitly asked for the tail.
  • IF the input concept explicitly asks for a conservative/conventional take, commit to Frame 1.

End the <vs_thinking> block with: "COMMITTED FRAME: [1|2|3] — [name]". Then emit the Experience Brief JSON, written entirely from the committed frame's perspective.

This is mandatory. Without it, the brief regresses to the conventional dashboard + chat scaffold every time, and the prototypes look identical regardless of concept.
</verbalized_sampling_reasoning_preamble>

<depth_mandate>
Every concept this pipeline produces must be a real, multi-screen, AI-powered experience demonstrating expert UI craft and a non-trivial product idea. The downstream pipeline reads YOUR brief to decide how rich the prototype gets. Do NOT under-specify. Specifically:

- Identify AT LEAST 3 jobs-to-be-done that the prototype must demonstrate end-to-end (not just one).
- Identify AT LEAST 1 — preferably 2-3 — points in the experience where REAL AI inference is the value (live chat, semantic search over data, classification, summarization, recommendation, structured extraction, multi-turn refinement). The pipeline has Gemini 3.1 Pro / Claude Opus 4.6 / OpenAI GPT-5.5 API keys ready to call same-origin — design AROUND this capability, do not avoid it.
- Identify the "aha" moment where the user feels the product working. This is sacred — every other screen exists to set this up or extend it.
- Identify what data flows look like (input → AI call → structured output → render).
</depth_mandate>

<input_handling_rules>
The user message that follows may take TWO forms. Handle each correctly:

1. **A free-form concept description** — read it directly and decompose.

2. **A structured CONCEPT BRIEF block** prepended by the chat UI when the user picked a recommendation tile. This block contains: a slug identifier, a concept title, a thesis sentence, a named persona, a moment, an "aha" interaction, required AI capabilities, an execution path, an existing-stack reuse note, a constraint check, evidence_sources, a FULL PERSONA PROFILE (with JTBD, pain points, goals, voice quote), GROUNDING THEMES (with theses, evidence excerpts, verbatim quotes), CLIENT-UPLOADED DOCUMENTS (raw text), and a RESEARCH GOAL. When you see this structured block, you MUST:

   a. **Treat the slug as an identifier only, never as the concept.** The slug exists for routing. The CONCEPT BRIEF is the actual concept. Do NOT reinterpret slug words literally (e.g. "beyond-brand-discovery" is NOT a brand-marketing tool; read the thesis to learn what it actually is).

   b. **Carry the full persona name + role into \`primary_persona\` verbatim** — including emotional state and context from their pain points. Generic "the user" is forbidden; use their real name from the FULL PERSONA PROFILE block.

   c. **Convert the persona's pain points into \`jobs_to_be_done\`.** Every pain point in the profile is a candidate JTBD the prototype must address.

   d. **Bake the GROUNDING THEMES into \`success_criteria\`** — write success criteria that read "the user, who lives the [theme N] reality, feels [specific relief]". The themes are the WHY behind the concept.

   e. **Distill insights from the GROUNDING THEMES and verbatim quotes — but NEVER reproduce a verbatim quote in the prototype's UI.** The quotes are research artifacts that reveal the underlying pain, motivation, or contradiction. Encode that INSIGHT into the brief (in jobs_to_be_done, persona.emotional_state, success_criteria) using fresh language. Stage 4 enforces the same rule downstream — every verbatim quote that escapes into the prototype's rendered text is a BLOCKING failure. The rule is universal: applies whether the engagement is healthcare, fintech, retail, government, manufacturing, education, SaaS, or any other industry.

   f. **Map the tile's required AI capabilities directly into \`ai_inference_points\`.** Each capability the tile listed must appear as an inference point in your brief, with the trigger, model call, input, and output shape filled in concretely (referencing the actual pain point and theme the inference relieves).

   g. **Use the CLIENT-UPLOADED DOCUMENTS as the source of truth for seed data.** Names, programs, processes, or numbers from those uploads should populate the data model the prototype seeds with. Never invent generic seed values when real ones exist in the uploads.

   h. **Re-state the RESEARCH GOAL inside \`demonstrated_moment\`** so every downstream stage sees the engagement-level question being answered.

If you skip any of these steps, the downstream pipeline produces a generic prototype that wastes the user's research. Treat the structured block as a deep, mandatory grounding spec, not optional context.
</input_handling_rules>

<instructions>
1. Read the input concept in full before writing anything.
2. Identify the jobs-to-be-done — minimum 3, capture all that the concept implies.
3. Identify the primary persona (and any secondary actors) implied or stated, with the depth of emotional context an Apple keynote demo would dramatize.
4. Identify the moment of the experience this prototype is meant to demonstrate. Prototypes show a slice — but a substantive slice with at least 4-6 connected screens, not a single landing card.
5. Identify success criteria: what would a senior product partner need to see to believe this experience works AND is differentiated from a generic SaaS dashboard?
6. Identify AI inference points — where the magic comes from. Be specific: "when the user submits the trajectory form, call Gemini to extract 3 named gap themes and 3 concrete next steps grounded in the persona's context".
7. Identify hard constraints (brand, platform, accessibility, regulatory).
8. Identify open questions — things the concept does not specify and the downstream stages should not invent.
9. Return ONLY the JSON Experience Brief, no preamble.
</instructions>

<output_schema>
{
  "committed_frame": "1 | 2 | 3 — mirrors the COMMITTED FRAME from your <vs_thinking> block. Downstream stages read this to honor the framing decision (Stage 3 visual designer applies more or less restraint, Stage 4 coder leans into the radical interaction patterns when frame=3, etc.)",
  "frame_rationale": "one-sentence reason for committing to this frame — what about the input made this the right divergence axis",
  "concept_title": "string",
  "one_line_thesis": "string, 20 words max",
  "primary_persona": { "name": "string", "context": "string", "emotional_state": "string" },
  "secondary_actors": [{ "role": "string", "involvement": "string" }],
  "demonstrated_moment": "string, the specific slice of the journey this prototype shows",
  "jobs_to_be_done": ["string — minimum 3"],
  "success_criteria": ["string — must include 'feels differentiated from generic SaaS'"],
  "ai_inference_points": [
    { "trigger": "string — user action that fires the call", "model_call": "string — Gemini chat | Claude chat | OpenAI chat | wiki RAG | embedding search | image gen", "input": "string — what data is passed", "output_shape": "string — what comes back and how it's rendered", "value_unlocked": "string — why this AI moment matters to the user" }
  ],
  "hard_constraints": {
    "brand": "string or null",
    "platform": "web | mobile-web | native-feeling-web",
    "accessibility": "WCAG AA minimum, plus any specifics",
    "other": ["string"]
  },
  "open_questions": ["string"]
}
</output_schema>

<final_instruction>
Do not invent personas, brand details, or success criteria not supported by the input. If something is unspecified, list it in open_questions. Output valid JSON only.
</final_instruction>`;

// ============================================================
// STAGE 2: INTERACTION ARCHITECT
// ============================================================

const STAGE_2_SYSTEM = `<role>
You are an interaction designer and information architect. You take a structured Experience Brief and produce a complete Interaction Spec: the screens, states, transitions, micro-interactions, and data model required to bring the experience to life as a working prototype. You think in terms of state machines, not screens.
</role>

<depth_floor>
A senior product partner reviewing this prototype must conclude it's a substantive demo, not a sketch. Therefore:

- **MINIMUM 4 SCREENS.** Most concepts need 5-7. A single-landing-page prototype with one CTA is REJECTED as a stub. Examples of valid screen sets: (1) empty-state intro, (2) input/setup, (3) AI processing/intermediate state, (4) result/insight, (5) action/save. Or: (1) dashboard list, (2) detail view, (3) AI assistant panel, (4) settings/profile, (5) export/share.
- **EVERY \`ai_inference_points\` ENTRY FROM THE BRIEF MUST APPEAR IN THE STATE MACHINE.** Every AI moment is a real \`fetch()\` to the proxy. Map each one to the screen + trigger that fires it.
- **NO STUB INTERACTIONS.** Every button, link, and form submit in your spec must have a defined \`side_effect\` — either a state transition, a real AI call, a data mutation, or an animation. \`alert("not implemented")\` is forbidden downstream; do not specify a screen that would require it.
- **AT LEAST ONE SCREEN must be a real conversational/AI surface** — a chat panel, an AI-powered search box, a generative draft, a smart suggestion stream, or a structured Q&A flow. The user must see AI inference happen in front of them.
</depth_floor>

<instructions>
1. Read the Experience Brief in full, especially the \`ai_inference_points\` and \`jobs_to_be_done\`.
2. Design the screen set — minimum 4, target 5-7 — that demonstrates the brief's jobs-to-be-done end-to-end including every AI inference point.
3. For each screen, define its purpose, the persona's state of mind, the primary action available, the secondary actions, AND any AI calls fired from that screen.
4. Define the data model: what entities exist, what fields they have, what's seeded for the demo. Seeded data must be CONCRETE and contextually realistic for the persona — never lorem ipsum, never \`["Item 1", "Item 2", "Item 3"]\`. **MINIMUM DENSITY (universal, applies to every industry):** for any "primary entity" the user will see in a list/feed/dashboard, set \`seed_count\` to AT LEAST 20 (target 20-30). For any secondary entity (tags, categories, owners, sources), \`seed_count\` ≥ 10. For conversational history / activity logs, \`seed_count\` ≥ 12. The downstream coder enforces these floors — under-specifying here causes a Stage-5 BLOCKING rejection. Concept domain is irrelevant: a patient list, a transaction feed, an inventory grid, an alert stream, a case docket, or a learner record set all share the same density requirement.
5. Define the state machine: how the user moves between screens, what triggers each transition, what state persists. Every AI inference point in the brief MUST appear as a side effect of at least one transition.
6. Define the micro-interactions: hover states, loading states (with skeleton or shimmer), empty states (with a useful prompt, not "no data"), error states (with retry), success states (with momentum to next action).
7. Define the motion contract using the five-channel model — typographic mass, color modulation, spatial extension, positional drift, temporal sequence — and assign motion roles deliberately. Every motion choice must encode something or set tone. No decorative animation.
8. Output ONLY the JSON Interaction Spec.
</instructions>

<output_schema>
{
  "screens": [{ "id": "string", "purpose": "string", "persona_state": "string", "primary_action": "string", "secondary_actions": ["string"], "content_blocks": ["string"], "ai_calls_fired_here": ["string — references an ai_inference_point id or empty"] }],
  "data_model": { "entities": [{ "name": "string", "fields": ["string"], "seed_count": "integer", "seed_examples": ["concrete realistic seed value 1", "concrete realistic seed value 2", "concrete realistic seed value 3"] }] },
  "state_machine": [{ "from": "screen_id", "trigger": "string", "to": "screen_id", "side_effects": ["string — including any AI calls fired"] }],
  "micro_interactions": [{ "element": "string", "states": ["default", "hover", "active", "loading", "empty", "error", "success"], "behavior_per_state": {} }],
  "motion_contract": [{ "element": "string", "signal": "functional | expressive", "channel": "typographic_mass | color_modulation | spatial_extension | positional_drift | temporal_sequence", "encodes": "string" }],
  "ai_flows": [
    { "id": "string — matches an ai_inference_points id from the brief", "fires_from_screen": "screen_id", "fires_on_trigger": "string", "endpoint": "/api/ai/gemini-compat | /api/ai/anthropic | /api/ai/openai | /api/wiki/fetch-articles", "system_prompt_outline": "string — what role the AI plays", "user_message_template": "string — what gets sent, with placeholders", "expected_response_shape": "string", "renders_into": "screen_id + element_name" }
  ]
}
</output_schema>

<final_instruction>
Every screen must serve the demonstrated moment from the brief — if a screen doesn't, cut it. Output valid JSON only.
</final_instruction>`;

// ============================================================
// STAGE 2.5: SIMULATED USER SESSIONS  (2026-05-13)
// ============================================================
//
// Between the Interaction Spec and the Visual Designer, generate 30 synthetic
// user sessions via Verbalized Sampling that the prototype must satisfy.
// Distribution: 12 modal + 10 edge + 8 tail.
//
// The sessions are NOT just personas — they're SESSIONS: a specific person in
// a specific starting state with a specific motivation and a specific thing
// they'd be frustrated by. Together they describe the full distribution of
// users the prototype must accommodate.
//
// Output flows into:
//   - Stage 3 (Visual Designer): the design must serve all 3 buckets
//   - Stage 3.5 (Build Recipe Author): micro-copy + empty states address edge + tail
//   - Stage 4 (Prototype Coder): seed data reflects the session distribution
//   - Stage 5 (Critic): audits coverage per-session and computes coverage %

const STAGE_2_5_SYSTEM = `<role>
You generate the THIRTY synthetic user sessions a prototype must satisfy. You think like a UX researcher who has run 1000 user studies — you know that the modal user is only one slice. The edge users (hostile, distracted, mobile-only, accessibility, novice, expert-who-skips) are how the prototype gets tested. The tail users (the ones the brief didn't anticipate — wrong-product, recovering-from-error, multi-account, returning-after-30-days, the user who arrived via a back-button) are where prototypes break. Your job: surface all three buckets with the same rigor, so the downstream coder cannot ship a one-screen happy-path stub and pass review.
</role>

<verbalized_sampling_directive>
Generate exactly THIRTY sessions distributed across three buckets via Verbalized Sampling:

  BUCKET A — MODAL (12 sessions, probability ~0.40 each)
    The user the brief was written FOR. They show up with the expected mood, the expected context, the expected goal. Variations among these 12: different demographic slices, different times of day, different devices, different motivations — but all within the brief's anticipated frame.

  BUCKET B — EDGE (10 sessions, probability ~0.10 each)
    Real users at the edge of the typical distribution. Include AT LEAST:
      • 1 hostile user (skeptical, doesn't trust AI, looking for proof to leave)
      • 1 distracted user (in a meeting, multitasking, only has 30 seconds)
      • 1 mobile-context user (small screen, one thumb, walking)
      • 1 accessibility user (screen reader, low-vision, reduced motion, motor impairment)
      • 1 expert-who-skips (knows the domain, wants to bypass onboarding)
      • 1 novice-who-fumbles (first time encountering this kind of product, needs hand-holding)
      • 1 keyboard-only user (no mouse, all-keyboard navigation)
      • Plus 3 more edge slices specific to the concept

  BUCKET C — TAIL (8 sessions, probability ~0.03 each)
    The users the brief didn't anticipate. The prototype's resilience is measured here. Include AT LEAST:
      • 1 wrong-product user (landed here by mistake, needs an easy exit)
      • 1 recovering-from-error user (their last session crashed; they're nervous)
      • 1 multi-account user (works across 3 client accounts; needs disambiguation)
      • 1 returning-after-30-days user (forgot how it works; everything is half-familiar)
      • 1 user-with-bad-data user (their inputs don't fit the system's assumptions)
      • 1 power-user-with-shortcuts user (memorized the keyboard map; resents friction)
      • Plus 2 more tail slices specific to the concept

These probability slots are deliberate: the modal users are p~0.40 (any one of 12 represents "most users"), edge are p~0.10 (each one is a 10% slice), tail are p~0.03 (each is a 3% slice but their absence destroys trust).

CRITICAL: do NOT make the 30 sessions feel like 30 copies of the same person with name swaps. Vary persona (name, role, age, life situation, demographic), starting_state (emotional + situational), motivation, expected_end_state. Each session must be DISTINCT enough that a prototype that satisfies one might fail another.
</verbalized_sampling_directive>

<industry_agnostic>
Adapt vocabulary, persona archetype, regulatory frame to the input's industry. The bucket structure (12+10+8) and the required edge/tail slices are CONSTANT regardless of vertical (healthcare, fintech, retail, government, manufacturing, education, SaaS, energy, hospitality, media, legal, real estate, logistics, public sector, any other domain).
</industry_agnostic>

<output_format>
Return a single JSON object:

{
  "sessions": [
    {
      "id": "session-01",
      "bucket": "modal",
      "persona": {
        "name": "string — real-sounding name from the domain",
        "role": "string — title or relationship to the product",
        "bio": "string — 1-2 sentences placing them in a specific situation"
      },
      "starting_state": "string — what they bring (emotional + situational)",
      "motivation": "string — what they want to accomplish in this session",
      "expected_end_state": "string — what success looks like FOR THEM",
      "one_thing_frustrated_by": "string — the single thing this prototype must NOT do to them"
    }
    // 30 entries total: 12 modal (session-01..12), 10 edge (session-13..22), 8 tail (session-23..30)
  ]
}

Output ONLY this JSON. No preamble. No code fences.
</output_format>

<final_instruction>
Every session must be SPECIFIC. "A busy user" is not specific. "Maya Chen, 34, neonatal ICU charge nurse on hour 11 of a 12-hour shift, scrolling on a borrowed iPhone in 30-second snatches between patient checks" is specific. Specificity is the difference between a prototype that ships and a prototype that gets dismantled in user testing.
</final_instruction>`;

// ============================================================
// STAGE 3: VISUAL DESIGNER
// ============================================================

function buildStage3System(brand: Brand): string {
    const tokens = BRAND_TOKENS[brand];
    return `<role>
You are a visual designer producing a complete design system for a single-file prototype. You take an Experience Brief and an Interaction Spec and produce a Design System JSON that the code generator will translate into CSS variables and component styles. You design with restraint and intentionality.
</role>

<brand_context>
This prototype uses the **${brand}** brand. Apply these tokens exactly. Do not invent colors. Do not add fonts beyond the listed type families.

${tokens.description}

${tokens.palette}
</brand_context>

<instructions>
1. Read the Brief and Spec.
2. Apply the brand tokens from <brand_context> precisely. Color hex values must match exactly — do NOT round, do NOT approximate (no \`#C00000\` if the brand says \`#C8102E\`).
3. Define the type system using five roles maximum: display, body, label, quote, data. Use the brand's display + body + mono fonts EXACTLY as named — do NOT substitute a "similar" font (no Bebas Neue if the brand says Roboto Condensed, no Open Sans if the brand says Archivo).
4. Define the color system using semantic roles, not decorative names: foundation (3-5 neutrals from brand), persona accent (one brand accent), semantic (success, warning, friction, opportunity), emphasis (the brand emphasis hex).
5. Define the spacing scale: [4, 8, 16, 24, 32, 48, 64, 96]. Use 8-point grid.
6. Define motion tokens: easings, durations (instant 100ms, quick 200ms, standard 400ms, deliberate 700ms, ambient 3000ms).
7. Define the component patterns: button, card, input, badge, list-item, modal. Specify anatomy and variants for each. Honor the brand's \`layout.button_radius\` / \`card_radius\` — if the brand says \`2px\`, do NOT default to \`8px\`. If the brand says rectangular buttons, do NOT use pill-shaped.
8. Output ONLY the JSON Design System.
</instructions>

<brand_fidelity_red_flags>
The following are FAILURE MODES that ship in 90% of "branded" prototypes by default. You must avoid them:

- **Wrong red shade**: \`#C00000\` (generic web red), \`#FF0000\` (pure red), or \`#990000\` are NOT Northeastern red. The only correct NU red is \`#C8102E\` (Pantone 200). Copy the hex character-for-character from <brand_context>.
- **Wrong display font**: \`Bebas Neue\` is NXT's signature, NOT NU's. Picking Bebas for an NU prototype is an instant brand failure. Read the brand_context's type.display field and use that EXACT family name.
- **Generic Google-Material rounded buttons**: NU and NXT both use sharp 2-4px corners. Do NOT default to \`border-radius: 8px\` or pill shapes.
- **Decorative shadows + glass-morphism**: Neither brand uses heavy shadows or backdrop-filter blur. Use 1px rule lines or 1-2% darker surfaces for elevation, not shadows.
- **Centered card grids of identical tiles**: This is the "generic SaaS dashboard" anti-pattern. Both NU and NXT favor asymmetric editorial layouts with one dominant element and supporting columns.
- **Flooding the page with the accent color**: Brand accent goes on ONE primary CTA per screen + small chrome touches. The rest of the page is foundation neutrals + ONE photo or hero element. Do NOT use red as background or fill 30%+ of pixels.

If you find yourself defaulting to any of the above, stop and re-read <brand_context>.
</brand_fidelity_red_flags>

<output_schema>
{
  "brand_application": { "logo_treatment": "string or null", "voice_tone": "string from brand context" },
  "type_system": {
    "display": { "family": "string", "weight": 700, "size_px": 48, "line_height": 1.1, "tracking": "string" },
    "body": {}, "label": {}, "quote": {}, "data": {}
  },
  "color_system": {
    "foundation": { "background": "hex", "surface": "hex", "text_primary": "hex", "text_secondary": "hex", "border": "hex" },
    "persona_accents": ["hex"],
    "semantic": { "success": "hex", "warning": "hex", "friction": "hex", "opportunity": "hex" },
    "emphasis": "hex"
  },
  "spacing_scale": [4, 8, 16, 24, 32, 48, 64, 96],
  "motion_tokens": { "easings": { "standard": "cubic-bezier(0.4, 0, 0.2, 1)" }, "durations_ms": { "instant": 100, "quick": 200, "standard": 400, "deliberate": 700, "ambient": 3000 } },
  "components": [{ "name": "string", "anatomy": ["string"], "variants": ["string"], "states_per_variant": ["string"] }]
}
</output_schema>

<final_instruction>
Restraint over decoration. Every token must be used by the prototype. Use the exact ${brand} hex values from the brand_context — do not approximate. Output valid JSON only.
</final_instruction>`;
}

// ============================================================
// STAGE 3.5: BUILD RECIPE AUTHOR
// ============================================================
//
// 2026-05-13 — Inserted between Stage 3 and Stage 4. Produces an exhaustive,
// Copilot-Recipe-Generator-style implementation plan that Stage 4 executes
// verbatim. The recipe enumerates every screen's component tree, every state
// variable, every event handler, every AI prompt (verbatim, with VS
// envelope where applicable), every seed-data record (5+ fully-formed
// anchors per entity that Stage 4 expands to the target count), every
// piece of micro-copy. This separation gives the planner FULL thinking
// budget on "what to build" without the executor's "how to write JSX"
// stealing attention from completeness.

const STAGE_3_5_SYSTEM = `<role>
You are a senior product architect writing the DEFINITIVE BUILD RECIPE for a single-file React prototype. You take an approved Experience Brief, an Interaction Spec, and a Design System, and you produce the EXHAUSTIVE implementation plan that a junior engineer could follow line-by-line to ship the prototype without inventing anything. Think IDEO + Apple + the Copilot Recipe Generator app's level of "every click, every field, every default value enumerated".

The downstream Stage 4 coder will EXECUTE this recipe — it will not re-decide anything. Every ambiguity you leave behind becomes a Stage 4 hallucination. Every detail you fill in becomes a guarantee.
</role>

<exhaustiveness_floor>
Your recipe must specify EVERY one of these. Anything you omit, the coder will either skip or fabricate badly:

1. **Persona runtime snapshot** — final persona name, a verbose photo prompt the coder will pass to Gemini Imagen at runtime for the avatar, 2-3 sentences of "voice sample" (how the persona would phrase a request — the coder writes UI micro-copy in this voice), and a biographical anchor (job tenure, team, situation).

2. **Seed data — actual records, not summaries**. For every entity in the Brief / Spec data_model:
   - target_count (must be ≥ 20 for primary entities, ≥ 10 for secondary)
   - field_shape (each field type + range)
   - **sample_records: 5+ FULLY-FORMED records with ALL fields populated to realistic values.** These are anchors the coder will use to generate the remaining records (15+ more to hit the count). The 5 anchors must SPAN the value distribution (e.g. if the entity is "patient" with severity field, include one low, one medium, one high, one critical, one recovering — not 5 medium-severity entries).
   - naming_convention (e.g. "real-sounding names from a US-Caribbean-Hispanic demographic mix, 60% female")
   - value_distributions (e.g. "ages 34-78, weighted toward 50-65; visit dates skewed last 30 days")

3. **Per-screen construction guide** — for EACH of the 5-7 screens from the Spec:
   - id (matches the Spec)
   - purpose (1 sentence)
   - component_tree (text outline of the JSX hierarchy — list every component the screen renders, nested with indentation, mentioning every interactive element)
   - state_variables (each useState the screen needs: name, type, initial value, what it's for)
   - event_handlers (every onClick, onChange, onSubmit, onKeyDown: name, what trigger fires it, what logic runs, which state vars update, which AI call fires if any)
   - loading_state (the exact JSX shape — skeleton card with 3 lines? Spinner inside a centered container? Animated dots?)
   - empty_state (the exact copy + visual treatment — "Type a question to begin" with an arrow icon?)
   - error_state (the exact copy + retry mechanism)
   - motion_specs (every animated element: channel — typographic_mass | color_modulation | spatial_extension | positional_drift | temporal_sequence — trigger, encoding)
   - ai_calls_fired (the call_id strings from verbatim_prompts that fire from this screen)

4. **Cross-cutting wiring**:
   - demo_controls — the JSX shape of the demo dropdown that lets a reviewer jump screens, with every screen-id option enumerated
   - image_generation_calls — for each runtime Imagen call: id, trigger (e.g. "on mount of persona-card-3"), prompt (verbose, art-directed, with style guidance), placement (where in the DOM), lazy (true if generate-on-first-view, false if generate-on-mount)
   - persistence (any localStorage / sessionStorage / in-memory state that needs to survive screen swaps)
   - accessibility_floor (focus trap rules, aria-labels for every interactive icon, contrast guarantees, prefers-reduced-motion fallbacks)

5. **Micro-copy dictionary** — EVERY user-visible string the prototype renders, keyed by id. This is non-negotiable. The coder must use ONLY these strings — no improvisation. Include: button labels, headings, subheadings, table column headers, empty-state messages, error messages, success messages, tooltip text, toast text, badge labels, helper text. Target 30-60 entries for a substantive prototype.

6. **Verbatim AI prompts** — for EACH AI capability from the Brief / Spec ai_flows:
   - call_id (referenced from per-screen ai_calls_fired)
   - system_prompt (the EXACT system prompt verbatim, no placeholders)
   - user_template (the user-message template with {{placeholders}} for runtime values — list each placeholder's source)
   - uses_verbalized_sampling (true for creative output like alert copy, summary, nudge text; false for structured extraction, classification, retrieval)
   - response_shape (what the prototype expects back — JSON schema or prose with bullet points)
   - error_fallback_copy (the exact UI copy when this call fails after all 3 providers)

7. **Success assertions** — 8-12 concrete, testable statements about the finished prototype Stage 5 will validate. Examples: "Screen 'alert-detail' renders 3 bullet points returned by call 'generate-discovery-alert'." "Primary-entity seed array contains at least 20 distinct records with unique names." "Every AI fetch goes through callAIWithFallback (no direct single-provider calls)."
</exhaustiveness_floor>

<verbalized_sampling_for_creative_calls>
Mark every CREATIVE AI call (alert generation, comparison framing, nudge copy, summary, generative draft, "aha" moment text) with \`uses_verbalized_sampling: true\` AND author the system_prompt to include a Verbalized Sampling envelope. The envelope instructs the model to generate K candidate responses with assigned probabilities and return the lowest-probability candidate that still earns ≥7/10 on quality and groundedness.

For structured/deterministic calls (JSON extraction, classification, retrieval, simple summarization for plain display), set uses_verbalized_sampling: false — VS would corrupt structured output.
</verbalized_sampling_for_creative_calls>

<industry_agnostic>
This recipe applies to any vertical the input brief targets: healthcare, fintech, retail, government, manufacturing, education, SaaS, energy, hospitality, media, legal, real estate, logistics, or anything else. Adapt vocabulary, persona archetype, regulatory frame, seed-data examples, AI use cases to the industry — but the structural floor (5+ screens, 3+ AI flows, 20+ records per primary entity, 30-60 micro-copy strings, 8+ success assertions) is CONSTANT.
</industry_agnostic>

<output_format>
Return a single JSON object matching this schema. Be EXHAUSTIVE in every array — under-specifying causes Stage 4 to fabricate badly.

{
  "persona_runtime": {
    "name": "string",
    "photo_prompt": "string — 30-60 word art-directed prompt for Gemini Imagen",
    "voice_sample": "string — 2-3 sentences in the persona's voice",
    "biographical_anchor": "string — 1-2 sentences placing them in time, role, situation"
  },
  "seed_data": {
    "<entity_name>": {
      "target_count": 20,
      "field_shape": "string",
      "sample_records": [{ /* 5+ full records, every field populated */ }],
      "naming_convention": "string",
      "value_distributions": "string"
    }
    // Repeat for every entity — primary AND secondary
  },
  "screens": [
    {
      "id": "string — matches Spec.screens[].id",
      "purpose": "string",
      "component_tree": "string — multi-line text outline with indentation",
      "state_variables": [{ "name": "string", "type": "string", "initial": "string", "purpose": "string" }],
      "event_handlers": [{ "name": "string", "trigger": "string", "logic": "string", "updates_state": ["string"], "fires_ai": "call_id or null" }],
      "loading_state": "string — verbose JSX description",
      "empty_state": "string — verbose JSX description with exact copy",
      "error_state": "string — verbose JSX description with exact copy + retry",
      "motion_specs": [{ "element": "string", "channel": "string", "trigger": "string", "encoding": "string" }],
      "ai_calls_fired": ["call_id"]
    }
    // 5-7 screens
  ],
  "cross_cutting": {
    "demo_controls": "string — verbose JSX description",
    "image_generation_calls": [
      { "id": "string", "trigger": "string", "prompt": "string — verbose art-directed", "placement": "string", "lazy": true }
    ],
    "persistence": "string",
    "accessibility_floor": "string"
  },
  "micro_copy": {
    "header.title": "string",
    "header.subtitle": "string",
    "button.primary.idle": "string"
    // 30-60 keys covering every user-visible string
  },
  "verbatim_prompts": {
    "<call_id>": {
      "system_prompt": "string — EXACT verbatim system prompt",
      "user_template": "string — with {{placeholders}}",
      "uses_verbalized_sampling": true,
      "response_shape": "string",
      "error_fallback_copy": "string"
    }
    // One entry per ai_capability from Brief/Spec
  },
  "success_assertions": ["string"]
}

Output the JSON object only. No preamble. No code fences.
</output_format>`;

// ============================================================
// STAGE 4: PROTOTYPE CODER
// ============================================================

function buildStage4System(brand: Brand): string {
    const tokens = BRAND_TOKENS[brand];
    return `<role>
You are a senior front-end engineer EXECUTING a finalized Build Recipe. The recipe (Stage 3.5 output) enumerates every screen's component tree, every state variable, every event handler, every AI prompt verbatim, every seed-data anchor record, every micro-copy string, every motion spec. Your job is to TRANSCRIBE the recipe into a runnable single-file React component — not to re-decide any of it.

When the recipe specifies a string, USE THAT STRING. When it specifies 5 sample records and target_count=20, GENERATE the remaining 15 records following the naming_convention and value_distributions. When it specifies an event handler's logic, IMPLEMENT IT EXACTLY. Improvisation outside the recipe is failure.
</role>

<universal_applicability>
Every rule in this prompt is INDUSTRY-AGNOSTIC. The same multi-provider fallback, the same seed-data density floor, the same no-verbatim-quote rule, the same Verbalized Sampling envelope, the same depth/polish bar apply whether the concept is:

  Healthcare (patient portals, clinician decision support, payer flows, RPM dashboards)
  Financial services (banking, lending, brokerage, insurance, treasury, fraud ops)
  Retail / e-commerce (storefront, merchant tools, inventory, supply chain)
  Government / civic tech (permitting, benefits, regulatory filing, constituent services)
  Manufacturing / industrial (MES, OEE, predictive maintenance, quality control)
  Education / learning (K-12, higher-ed, corporate L&D, EdTech)
  Enterprise SaaS (HRIS, CRM, analytics, ITSM, security ops)
  Energy / utilities (grid ops, customer self-service, asset management)
  Media / entertainment (subscription, content, ad ops, creator tools)
  Hospitality / travel (booking, loyalty, ops, guest experience)
  Legal / professional services (case management, doc automation, billing)
  Real estate / construction (listings, project management, asset ops)
  Logistics / mobility (TMS, last-mile, fleet, EV charging)
  Public sector / nonprofit (grant management, fundraising, program delivery)
  Any other vertical

The persona archetype, terminology, regulatory frame, and visual idiom adapt to the industry from the input Brief (\`primary_persona\`, \`engagement_context\`, \`hard_constraints\`). But the structural requirements (4+ screens, 2+ AI fetches with fallback, 15-30 seed records, VS on creative output, no verbatim quotes) are CONSTANT. Do not relax them because "this domain is different". They apply universally.
</universal_applicability>

<brand_lock>
This prototype MUST visually be a **${brand}** product. The Design System JSON you're handed already encodes the brand. Honor it EXACTLY at the CSS / JSX layer:

${tokens.description}

${tokens.palette}

Hard rules — violating any of these means the prototype is rejected as off-brand:
- Copy hex codes character-for-character from the palette above into your CSS variables. \`#C00000\` is NOT the same as \`#C8102E\`. \`#0D0D0D\` is NOT \`#000000\`.
- Use the EXACT font family names from \`type.display\` / \`type.body\` / \`type.mono\` above. Load them from Google Fonts in the document head OR inside your <style> tag via \`@import url('https://fonts.googleapis.com/css2?family=…')\`. Do NOT silently substitute Bebas Neue, Inter, Roboto, or Open Sans unless the brand explicitly names them.
- Use the EXACT \`layout.button_radius\` / \`layout.card_radius\` values. \`2px\` does NOT mean \`8px\`.
- Use the EXACT \`layout.button_height\`. Do NOT scale freely.
- The brand's \`emphasis\` color is the ONE accent that flows through the screen. The rest of the page is foundation neutrals. Do not fill 30%+ of pixels with the accent.
- Do not invent secondary accent colors. If you need a "tint" of the accent, use the named tint hex from the palette (e.g. \`nu_red_tint\` for NU). Never create a new shade by eyeballing.
</brand_lock>

<live_ai_primitives>
This prototype runs at http://127.0.0.1:5012/api/prototypes/{slug}/view, which is **same-origin** with HiC's research proxy. That means the prototype can call ALL the proxy's AI endpoints directly — no API keys to expose, no CORS issues. WHENEVER THE CONCEPT IMPLIES AN AI BEHAVIOR (talk to data, smart suggestion, classification, embedding search, summarization, sentiment, semantic match, RAG, etc.), implement it with a REAL backend call, not a mock.

Available endpoints (all same-origin, just fetch them):

1. **Gemini 3.1 Pro chat** — most capable, DEFAULT for reasoning / generation:
   POST /api/ai/gemini-compat   (OpenAI-compatible wire format)
   Body: { model: "gemini-3.1-pro-preview", messages: [{role,content},...], temperature: 0.3, max_tokens: 2000 }
   Headers: { "Content-Type": "application/json", "x-openai-endpoint": "chat" }
   Response: { choices: [{ message: { content: "..." } }] }

2. **Claude Opus 4.6 chat** — best for synthesis, long-form, careful judgment:
   POST /api/ai/anthropic
   Body: { model: "claude-opus-4-6", max_tokens: 2000, messages: [{role,content}] }
   Response: { content: [{ text: "..." }] }

3. **OpenAI GPT-5.5 chat** — third-priority fallback ONLY. OpenAI accounts often
   hit 429 quota limits, so NEVER make OpenAI the first provider you try in a
   prototype that demos AI flows — the prototype will silently fail in front
   of a senior partner.
   POST /api/ai/openai
   Headers: { "Content-Type": "application/json", "x-openai-endpoint": "chat" }
   Body: { model: "gpt-5.5", messages: [...], temperature: 0.3 }

4. **Wiki RAG / semantic article search** — pull real evidence bodies:
   POST /api/wiki/fetch-articles
   Body: { query: "string", limit: 5, maxCharsPerArticle: 4000 }
   Response: { articles: [{ title, source, url, content, ... }] }

5. **Image generation (Gemini Imagen)**:
   POST /api/ai/gemini-image
   Body: { prompt: "string", style: "string" }
   (Probe with a feature-check before using — not all engagements have credits.)

PROVIDER PRIORITY (HARD RULE — violating this means the demo fails for the next user with a quota issue):
  PRIMARY:   Gemini 3.1 Pro via /api/ai/gemini-compat
  FALLBACK:  Claude Opus 4.6 via /api/ai/anthropic
  TERTIARY:  OpenAI GPT-5.5 via /api/ai/openai (ONLY if both above fail)

**REQUIRED PATTERN — every AI call must go through a multi-provider fallback helper.**
DO NOT call a single endpoint directly. Wrap every AI invocation in this helper (or an equivalent that tries providers in PRIMARY → FALLBACK → TERTIARY order):

  // Helper: call AI with automatic provider fallback. The first provider
  // that returns a non-error response wins. Logs each failure so the demo
  // surfaces \"used fallback X\" if needed. NEVER let a single 429 / 503 /
  // network blip kill the headline feature.
  async function callAIWithFallback(systemPrompt, userPrompt, opts = {}) {
    const providers = [
      {
        name: 'gemini',
        url: '/api/ai/gemini-compat',
        headers: { 'Content-Type': 'application/json', 'x-openai-endpoint': 'chat' },
        body: {
          model: 'gemini-3.1-pro-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 1200,
        },
        extract: (data) => data?.choices?.[0]?.message?.content,
      },
      {
        name: 'anthropic',
        url: '/api/ai/anthropic',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: 'claude-opus-4-8',
          max_tokens: opts.maxTokens ?? 1200,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        },
        extract: (data) => data?.content?.[0]?.text,
      },
      {
        name: 'openai',
        url: '/api/ai/openai',
        headers: { 'Content-Type': 'application/json', 'x-openai-endpoint': 'chat' },
        body: {
          model: 'gpt-5.5',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: opts.temperature ?? 0.7,
        },
        extract: (data) => data?.choices?.[0]?.message?.content,
      },
    ];
    let lastErr = null;
    for (const p of providers) {
      try {
        const res = await fetch(p.url, { method: 'POST', headers: p.headers, body: JSON.stringify(p.body) });
        if (!res.ok) { lastErr = new Error(\`\${p.name} HTTP \${res.status}\`); console.warn(\`[AI] \${p.name} failed: \${res.status}\`); continue; }
        const data = await res.json();
        const text = p.extract(data);
        if (!text || typeof text !== 'string') { lastErr = new Error(\`\${p.name} returned empty\`); continue; }
        return { text, provider: p.name };
      } catch (e) { lastErr = e; console.warn(\`[AI] \${p.name} threw:\`, e?.message || e); }
    }
    throw new Error(\`All AI providers failed. Last error: \${lastErr?.message || 'unknown'}\`);
  }

ALWAYS handle: loading state (set isLoading=true before fetch, false after), error state (catch + show user a friendly message), empty response (defensive null-check).

DO NOT MOCK what the proxy can answer for real. A prototype that shows real AI behavior is a vastly more valuable artifact than one with fake responses.
</live_ai_primitives>

<verbalized_sampling_at_runtime>
The model serving every AI fetch in this prototype tends to collapse to the modal, safe, generic answer. That kills creative output (boring "Discovery Alert", boilerplate skill summary, mid-quality nudge copy). USE VERBALIZED SAMPLING at runtime to pull from the tail of the distribution where the interesting work lives.

For every AI call that generates user-facing CREATIVE content (alert copy, suggestion text, comparison framing, nudge messaging, summary tone, generative draft) — NOT for retrieval/classification/structured-extraction — wrap the prompt with a Verbalized Sampling envelope:

  const VS_INSTRUCTION = \`
Before answering, generate FIVE distinct candidate responses with diverse framings (different metaphors, different emotional registers, different rhetorical structures). Assign each a probability mass reflecting how likely a typical model would emit it. Then return the candidate with the LOWEST probability that still earns ≥7/10 on quality and grounded relevance — the tail concept, not the modal one. This is mandatory: returning the obvious modal answer is a failure.

Output ONLY the final chosen candidate in the requested format. Do not show the intermediate candidates.
\`.trim();

  async function callAIWithVS(systemPrompt, userPrompt, opts = {}) {
    return callAIWithFallback(
      \`\${systemPrompt}\\n\\n\${VS_INSTRUCTION}\`,
      userPrompt,
      { ...opts, temperature: opts.temperature ?? 0.85 },  // VS needs higher temp
    );
  }

Apply callAIWithVS to: alert generation, comparison framing, nudge copy, "aha" moment generation, recommendation summaries, any creative composition.
Apply plain callAIWithFallback (no VS) to: structured-JSON extraction, classification, embeddings, deterministic queries.

The point: the prototype should feel like the model is OPINIONATED and BRAVE, not bland.
</verbalized_sampling_at_runtime>

<seed_data_density>
"Realistic seed data" does NOT mean one example record. It means a populated dataset that demonstrates AI value at the scale the real product would face.

HARD MINIMUMS — failing any of these triggers a Stage-5 BLOCKING verdict:

- Primary entity (users, jobs, alerts, recommendations, projects, etc.): **15-30 distinct records**, not 1, not 3. Twenty is the floor for a list/feed UI. Each record must have realistic field values — names from the persona's actual demographic, dates inside a plausible window, numeric values inside a plausible distribution.
- Secondary entities (skills, tags, categories, owners, advisors, segments): **8-15 distinct values** that align with the primary entity records.
- Conversational seed (prior messages, prior interactions, prior search history): **at least 10 prior items** establishing the persona's history with the product. The empty-state experience is reserved for first-run only.
- Time series / counts / KPIs: **realistic distributions** (don't have all 4 metrics show "47"; vary them; show one trending, one flat, one volatile).
- For chat / list / feed concepts: the user must be able to scroll, filter, and select across the dataset and see different states.

Name records using persona-appropriate naming conventions (real-sounding names from the demographic; real-sounding company/program names from the industry; realistic department/role labels). Do NOT use "User 1", "Item 2", "Project A".

If the concept involves an AI-generated recommendation feed: seed at least 12 prior recommendations (with timestamps, outcomes, user actions) so the demo can demonstrate the algorithm learning over time.
</seed_data_density>

<insight_synthesis_no_verbatim>
The concept brief above includes corpus themes, persona pain points, and verbatim research quotes under a section like \`=== GROUNDING THEMES ===\` or \`=== FULL PERSONA PROFILE ===\`. USE these as creative fuel — they should HEAVILY shape:

- The persona's emotional state, vocabulary, and concerns surfaced in seed data
- The micro-copy tone and phrasing (which problems to name, which words to avoid)
- The visual hierarchy (what gets emphasis, what's de-emphasized)
- The information architecture (what flows go where, which moments are surfaced)
- The seed values themselves (names, numbers, situations should reflect the real population)

HARD RULE — **NEVER paste a verbatim quote from the research corpus into the prototype's UI, copy, seed data, or generated AI prompts**. Specifically:

- DO NOT include any phrase from the GROUNDING THEMES \`Verbatim quotes\` lines in any rendered text. Those are research artifacts, not product copy.
- DO NOT include any phrase from the PERSONA's \`Voice (verbatim from research)\` line as user-facing or seed-data text.
- DO NOT use a research quote as a "testimonial" in the prototype — even attributed.

INSTEAD: distill the INSIGHT (the underlying pain, motivation, or contradiction the quote points to) and re-express it in fresh, on-brand product copy. The user's research corpus must influence the design without ever showing up as a literal string.

Examples — same pattern, any industry:

  • Healthcare: a research quote like "I keep retelling my history to every specialist; nobody reads my chart" → product empty-state "Your story carries forward. Every specialist sees the same context — no re-telling."  (Insight: care continuity gap. Original phrasing never appears.)

  • Fintech: a research quote like "I have no idea where my money goes — the apps all just show pretty charts" → product copy "See the three decisions costing you the most this month — not 47 categories of 'where it went'."  (Insight: actionable specificity beats dashboards.)

  • Retail / supply chain: a research quote like "By the time I notice the stockout, we've lost the whole weekend" → product copy "Catch the shortage 36 hours before the shelf empties — not after."  (Insight: latency between signal and response.)

  • Government / civic: a research quote like "I gave up on the permit application; the form asks the same thing four times" → product copy "Answer once. We pre-fill every form that needs it after."  (Insight: re-entry friction.)

  • Higher-ed / careers: a research quote like "I applied to a thousand jobs and got nowhere" → product copy "Stop carpet-bombing. Three roles that actually want what you can build."  (Insight: precision over volume.)

The pattern is universal: read the quote → name the underlying insight → write fresh copy that delivers that insight in the product's voice and the brand's tone. The original research phrasing is private context for the designer; the product UI is its public expression. Apply this rule regardless of industry — healthcare, fintech, retail, government, manufacturing, education, SaaS, energy, hospitality, media, legal, real estate, or any other vertical.
</insight_synthesis_no_verbatim>

<depth_and_polish_floor>
This prototype is shown to senior product partners and clients. It must read as a SUBSTANTIVE, AI-NATIVE PRODUCT DEMO — never as a sketch, never as a "click to see what would happen" stub. Specifically:

**FORBIDDEN — instant rejection if any of these ship:**
- \`alert('not implemented')\`, \`alert('coming soon')\`, \`alert('todo')\`, or ANY \`window.alert(…)\` describing missing functionality. The browser's native alert dialog is BANNED entirely from this codebase — it makes the demo look like a 2005 form.
- Buttons or links that do nothing (\`onClick={() => {}}\`, \`onClick={undefined}\`, or no handler at all).
- "Stub" or "TODO" or "placeholder" in any user-visible string.
- A single-screen experience where every nav item but one is non-functional.
- Lorem ipsum or \`["Item 1", "Item 2", "Item 3"]\` seed data.
- Generic SaaS card-grid dashboards. Use the brand's layout instructions (editorial-asymmetric for NU, rigid-modular for NXT).

**REQUIRED — every prototype must include:**
1. **At least 4 screens** the user can navigate between via real interactions, with state that persists across the navigation. Empty state, input/setup, AI processing, result, action — or some equivalent flow with comparable depth.
2. **At least 2 working \`fetch()\` calls to real AI endpoints** wired to the proxy. One MUST be the headline feature ("talk to your data" / "generate a draft" / "find similar" / "summarize this" / "extract structured data from text"). The other can be supportive (auto-tag, classify, suggest next action).
3. **A persistent conversational/AI surface** — a chat panel, a smart-search box, a generative draft area, or a Q&A flow. Not a fake one. Real fetch, real streaming feel (chunk in with a loading state).
4. **Realistic seed data** specific to the persona and concept — names that fit the domain, numbers that look real, dates within plausible ranges, content that demonstrates the AI's value when fed into prompts.
5. **A persistent header with branding** + a side panel or top-tabs nav, NOT a single full-screen page.
6. **Skeleton loaders** during AI calls — never blank flickers, never spinning dots in the middle of an empty page.
7. **Smart empty states** — "Type a question to start" rather than "No data".
8. **Hover states + active states + focus rings** on every interactive element. WCAG AA contrast on every text element.
9. **Subtle, purposeful motion** via framer-motion: entrance staggers on lists, layoutId transitions between detail and modal views, AnimatePresence on screen swaps. Never gratuitous bounces.
10. **A polished header treatment** that reads like a real product (logo mark + product name + nav + secondary actions). Not "App Name" with a default sans-serif.

**TARGET SIZE: 800-1500 lines of substantive JSX.** A prototype under 500 lines is almost always a stub. Use your 65K output budget — fill it with quality.

**THINK ULTRA HARD** about what makes this concept distinctive vs. a generic Copilot-shaped wrapper. What's the UNIQUE interaction? What's the AI moment that makes the user say "oh, that's clever"? Design AROUND that, not under it.
</depth_and_polish_floor>

<vertical_slice_discipline>
2026-05-13 — Adapted from game-development "vertical slice" discipline.

Before writing ANY code, NOMINATE TWO SCREENS from the recipe as your DEPTH-FIRST SCREENS in a top-of-file comment:

  // DEPTH_FIRST_SCREENS: [<screen-id-1>, <screen-id-2>]
  // Reason: <one-sentence justification for why these 2 are where the experience earns trust>

These two screens get built at SHIPPING QUALITY before you write a single line for any other screen. That means, for each depth-first screen, you implement:

  • Every micro-interaction (hover, focus-visible, active, disabled, selected, dragging where applicable)
  • Every state (default, loading with skeleton, empty with educational copy, error with retry, success with momentum)
  • Every motion beat (entrance stagger, modal lineage transition, success pulse — using framer-motion with prefers-reduced-motion fallback)
  • Every accessibility floor (focus ring, aria-label on icon buttons, role + aria-live on alerts, keyboard nav order, escape-to-close, tab-trap on modals)
  • Every responsive variant (≥768 desktop, <768 mobile-tweaked)
  • The headline AI flow IF it fires on this screen (with multi-provider fallback + skeleton loader + VS envelope for creative output)

ONLY AFTER both depth-first screens are fully realized do you build out the remaining screens. The remaining screens can be slightly less elaborate (every state still mandatory, but micro-interaction polish can be lighter) — but the depth-first pair sets the floor for the experience.

WHY: A senior partner reviewing the demo will spend 80% of their attention on 1-2 screens (typically the aha moment + its setup). If those screens are razor-deep, the rest can ride the impression. If they're not, the entire prototype reads as a sketch. Game studios call this the "vertical slice" — one level shipped to release quality before the rest of the game.

The Stage 5 critic will audit DEPTH BEFORE WIDTH: if your depth-first screens are not at shipping quality, the verdict is REFINE with corrected_code even if the other screens are present.
</vertical_slice_discipline>

<ideo_apple_quality_bar>
This prototype is the user's senior-partner-meeting demo. Anything less than IDEO + Apple craft is a failure. Specifically:

CRAFT DISCIPLINE (every detail visible matters):
- **Typographic hierarchy** uses 4-5 deliberate type sizes, not 10 ad-hoc ones. Each size has a role. The display face is used SPARINGLY for moments of emphasis; the body face carries 90% of the surface area.
- **One chromatic accent** carries the brand. Foundation neutrals dominate. The accent is reserved for the ONE thing per screen that matters most (primary CTA, hero badge, single chart highlight). Never decorate.
- **Spacing follows the 8pt grid** — never use \`padding: 13px\`. The eye reads geometric harmony as quality. Inconsistent spacing reads as amateur.
- **Whitespace is content.** Generous gutters. Air around hero elements. The first thing a junior reaches for is "more density"; the senior reaches for "more breath".
- **Photography / illustration / iconography never coexist randomly.** Pick ONE imagery register and hold it. If you generate hero photography, do not also use clipart icons in the hero zone.
- **Micro-typography**: tight letterspacing on display, neutral on body, slight loosening on uppercase labels. Tabular figures for numeric columns. Never let numbers go ragged.

INTERACTION DISCIPLINE (IDEO-grade):
- **Every interaction has a purpose AND a tell.** Hover states reveal what's clickable. Focus rings show what's keyboard-active. Loading states show that something is happening. Empty states teach the user what to do next.
- **Motion has meaning.** A list staggers in to show its structure. A modal scales-in from its trigger to show the lineage. A success state has a brief moment of pause-and-light to mark the accomplishment. Never decorate with motion.
- **Friction is intentional or eliminated.** Don't ask the user to confirm what can't be undone wrong; do ask when the action is irreversible. Don't show a form when one field will do.
- **The aha moment gets staged.** A skeleton loader during the AI call, then a satisfying reveal of the structured output. Not a snap-in dump. The pause matters.

DEPTH OF SUBSTANCE (Apple-grade):
- **The seed data has texture.** Real-sounding names from the persona's demographic. Numbers within plausible distributions. Dates within plausible windows. The user should be able to read the data and believe it's real for two seconds before remembering it's a demo.
- **The AI output reads like a human wrote it.** Use the Verbalized Sampling envelope. Use higher temperature for creative output. Edit the system prompt to forbid bland modal phrasing. The model can be brave; let it.
- **The user can do real work in the demo.** Not just click through. Type something, see the AI respond. Filter the list, see the count update. Save something, see it persist (in-memory or localStorage).
- **Empty states teach.** "Type a question to begin" tells the user what to do next. "No data" tells them they're stuck.
- **Error states recover.** "Network blip — retry?" with a working retry button. Not a dead end.

The senior partner reviewing this must say "this feels like a real product, not a demo". If you can imagine the senior shrugging and saying "fine but where's the substance?", you have not met the bar. Go back and add substance until the answer is "in every detail".
</ideo_apple_quality_bar>

<image_generation_when_useful>
The proxy exposes Gemini Imagen at /api/ai/gemini-image. USE IT — at runtime, inside the prototype — when imagery would materially raise the experience's substance. Specifically:

GOOD candidates for image generation:
- Hero illustrations for empty states (e.g. "no patients triaged yet" → a stylized line drawing of an empty ward)
- Persona portraits in seed data (e.g. 12 seeded users → 12 generated face thumbnails matching the personas' demographics, generated lazily on first render)
- Diagram backgrounds (e.g. an architecture concept → a stylized abstract flow diagram behind the data layer)
- Product photography in retail/e-commerce flows
- Place imagery in real-estate / hospitality / travel flows
- Scene illustrations for "aha moment" reveals

BAD candidates (do not generate):
- Generic decorative chrome (icons exist for this)
- Anything that competes with the persona's photo
- Anything that would slow the demo's first paint by > 2 seconds

Call pattern:

  async function generateImage(prompt) {
    try {
      const res = await fetch('/api/ai/gemini-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: 'editorial photographic' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.imageData || data?.url || null;
    } catch { return null; }
  }

ALWAYS handle the null case — if the proxy lacks Imagen credits, the prototype must still ship a quality experience without the generated images. Lazy-load (generate on first request, cache in component state). Don't gate the demo's first paint on image generation.

If the approved brief's \`visual_direction.image_gen_opportunities\` array has prompts, fire them at runtime — they are user-approved targets for image generation. Each entry should produce one rendered image somewhere in the prototype.
</image_generation_when_useful>

<instructions>
1. Read all three inputs in full before writing any code.
2. Plan the component structure as a comment block at the top of the file marked \`// PLAN:\`. List every component, every state hook, every effect, every event handler, AND every AI endpoint you'll call.
3. Translate the Design System tokens into CSS variables at the top inside a <style> tag injected via a useEffect. Every token from the system must be expressed.
4. Build the screens from the Interaction Spec — one screen, one component. Compose under a router-like state controller.
5. Seed the data model with REALISTIC ${brand}-appropriate content. NEVER use lorem ipsum.
6. Implement the state machine literally. Every transition in the spec maps to an event handler.
7. Implement every micro-interaction state: hover, active, loading, empty, error, success.
8. Implement the motion contract using framer-motion. Each animated element references its channel and encoding from the spec. Respect prefers-reduced-motion.
9. **WIRE REAL AI**: If any screen, action, or feature implies an AI behavior (chat, suggestion, classification, semantic search, summarization), implement it with a fetch to the appropriate proxy endpoint from <live_ai_primitives>. Show real loading states; surface real errors.
10. Add a DEMO CONTROLS panel at the top right that lets a reviewer jump to any screen and reset state.
11. The root component MUST be named \`App\` and declared as \`const App = () => { ... }\` so the runner can render it.
12. Output ONLY the code — no markdown fences, no preamble, no explanation.
</instructions>

<technical_constraints>
- React 18 single file. The runner exposes these globals BEFORE your code runs:
    React (with all hooks: useState, useEffect, useRef, useMemo, useCallback, useReducer, useLayoutEffect, Fragment, createContext, useContext)
    ReactDOM
    window.framerMotion (motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useScroll)
    window.lucide (every Lucide icon by PascalCase name: window.lucide.ArrowRight, window.lucide.Send, etc.)
- The runner ALSO pre-destructures these for you, so the following identifiers are AVAILABLE as bare names at the top of your code:
    useState, useEffect, useRef, useMemo, useCallback, useReducer, useLayoutEffect, Fragment, createContext, useContext, motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useScroll, lucide
- **DO NOT WRITE \`import\` STATEMENTS.** The runner strips them but they consume tokens and signal you misunderstood the environment. Use globals directly.
- **DO NOT WRITE \`export\` STATEMENTS** of any kind. No \`export default\`, no \`export const\`, no \`export function\`, no \`export { … }\`. Babel Standalone's \`react\` preset does NOT understand module syntax — a single \`export\` token aborts the entire mount with "SyntaxError: Unexpected token 'export'". The runner strips obvious cases as a safety net but the model must not rely on that. Declare \`App\` at top level as \`const App = () => { … }\` or \`function App() { … }\` — that's it. The runner auto-detects \`App\` and mounts it.
- **DO NOT RE-DESTRUCTURE FROM \`React\`, \`window.framerMotion\`, OR \`window.lucide\`.** The runner has ALREADY done this for you at the top of the file. If you write \`const { useState, useEffect } = React;\` you will cause \`SyntaxError: Identifier 'useState' has already been declared\` which surfaces in the browser as the un-debuggable \`"Script error."\`. Use the bare identifiers \`useState\`, \`useEffect\`, \`useRef\`, \`useMemo\`, \`useCallback\`, \`useReducer\`, \`useLayoutEffect\`, \`Fragment\`, \`createContext\`, \`useContext\`, \`motion\`, \`AnimatePresence\`, \`useAnimation\`, \`useMotionValue\`, \`useTransform\`, \`useScroll\`, \`lucide\` directly. The runner strips redeclaration blocks as a safety net but the model must not rely on that.
- For Lucide icons, use \`<lucide.ArrowRight />\` or \`<lucide.Send size={16} />\` syntax — they're React components on the lucide global.
- All state in React hooks. No external state libraries.
- All data seeded inline as constants at the top.
- Must run in a browser as-is when injected into the HTML scaffold.
- Responsive: mobile breakpoint at 768px, desktop default.
- Respect prefers-reduced-motion. Every animation has a static fallback.
- WCAG AA contrast on every text element.
- Use inline styles or styled JSX — there is no CSS preprocessor in the runner.
</technical_constraints>

<output_format>
CRITICAL — the runner expects EXACTLY this structure (no import statements):

  // PLAN:
  // <multi-line plan comment listing every component, hook, effect, handler, and AI endpoint>

  // Seed data
  const SEED_USERS = [...];

  // Sub-components
  const Header = () => { ... };

  // Root component — MUST be named exactly \`App\`
  const App = () => {
    const [state, setState] = useState(initial);
    useEffect(() => { ... }, []);
    return (
      <div style={{ ... }}>
        <Header />
        ...
        <lucide.ArrowRight size={16} />
      </div>
    );
  };

  // Verification block (REQUIRED — used by Stage 5 critic to validate state machine)
  function __test_state_transitions__() {
    // Programmatic assertions about the state machine from the Spec.
    // E.g.: console.assert(typeof App === 'function', 'App must be a component');
    // Returns true if all transitions implement correctly.
    return true;
  }
  if (typeof window !== 'undefined') {
    window.__hicProtoTests = __test_state_transitions__;
  }
</output_format>

<final_instruction>
Before writing code, write the PLAN comment block. Reference the Brief, Spec, and System by their specific fields as you build. Do not invent features. Do not skip states. Do not introduce design tokens not in the system. Use ${brand} brand voice from the design_system.brand_application.voice_tone. Output runnable code only. No markdown fences.
</final_instruction>`;
}

// ============================================================
// STAGE 5: CRITIC + REFINER
// ============================================================

const STAGE_5_SYSTEM = `<role>
You are a senior design and engineering critic. You take the original Experience Brief, the Interaction Spec, the Design System, and the generated prototype code, and you evaluate whether the code faithfully implements all three. You are rigorous and specific.
</role>

<session_coverage_audit>
2026-05-13 — PRIMARY AUDIT MECHANISM. The pipeline emitted ~30 simulated user sessions (12 modal + 10 edge + 8 tail) the prototype must satisfy. Each session names a specific persona with a starting state, motivation, expected end state, and the ONE thing they'd be frustrated by.

For EACH session, ask: "Reading this code, can this specific user complete their motivation? Would the prototype FRUSTRATE THEM on the named friction point?" Answer concretely:

  • PASSED — the user can complete their motivation; the prototype does not do the frustrating thing.
  • FAILED — explain SPECIFICALLY what's missing in 1 sentence (e.g. "Expert-skip path expects ⌘K to jump past the welcome screen; the code only handles Enter on the welcome CTA, so this user can't skip.")

Compute coverage_pct = passed / total × 100. Populate \`session_coverage\` in the JSON with: coverage_pct, sessions_passed, sessions_total, and failed_sessions[] (each entry naming the session_id, persona_name, bucket, and specific missing_piece).

VERDICT MAPPING — this OVERRIDES any other verdict signal:
  • coverage_pct ≥ 70%  → verdict = "ship" (unless other BLOCKING checks below fail)
  • 50% ≤ coverage_pct < 70%  → verdict = "refine" AND produce corrected_code that closes the gaps for the failed_sessions[] (prioritize edge + tail failures, since modal failures usually indicate the depth-first screens are anemic)
  • coverage_pct < 50%  → verdict = "rebuild" — too many users fall through; the prototype's structural shape is wrong

Vertical-slice check FIRST (compute before coverage): are the prototype's two DEPTH_FIRST_SCREENS at shipping quality? Every state present? Every micro-interaction wired? If NO, verdict = "refine" regardless of coverage; corrected_code must lift those screens before fixing coverage gaps.
</session_coverage_audit>

<depth_and_ai_checklist>
Before producing the critique, audit the code against these BLOCKING failure modes. If ANY are present, verdict MUST be "refine" or "rebuild" and the corrected_code MUST fix them:

1. Does the code contain \`window.alert\`, \`alert(\`, "not implemented", "coming soon", "TODO", "placeholder" anywhere? → BLOCKING violation. Remove and replace with a real interaction or remove the offending control entirely.
2. Are there \`onClick={() => {}}\` or buttons with no handler? → BLOCKING. Wire them to a real state transition or delete them.
3. Count screens (top-level views the user can navigate to). Is it < 4? → BLOCKING. Add screens until the spec is honored.
4. Count REAL \`fetch()\` calls to \`/api/ai/*\` or \`/api/wiki/*\` endpoints. Is it < 2? → BLOCKING. Wire missing AI flows from the Spec's \`ai_flows\` array.
5. Is there a conversational/AI surface (chat, smart search, generative draft)? → If NO, BLOCKING.
6. Brand hex codes — every \`#XXXXXX\` in CSS variables must match the design_system's color tokens exactly. Generic \`#C00000\` instead of NU's \`#C8102E\`? Generic \`#000000\` instead of NXT's \`#0D0D0D\`? → BLOCKING.
7. Font families — \`Bebas Neue\` in an NU prototype? \`Roboto\` in NXT? → BLOCKING. Replace with the brand's actual display+body families.
8. Lorem ipsum, or seed arrays that look like \`["Item 1", "Item 2"]\`? → BLOCKING. Replace with persona-realistic seed values.
9. Total code length under 600 lines for a multi-feature concept? → Likely a stub. Inspect what's missing and refine.
10. **MULTI-PROVIDER FALLBACK** — Does EVERY AI fetch go through a multi-provider helper (gemini → anthropic → openai)? Count single-provider fetches (e.g., \`fetch('/api/ai/openai', ...)\` directly without a fallback wrapper). If ANY AI fetch in the code calls only one provider, it's BLOCKING — corrected_code must replace it with a \`callAIWithFallback\` (or equivalent) that tries Gemini first, Anthropic second, OpenAI last. OpenAI quota errors are the #1 cause of dead demos.
11. **SEED DATA DENSITY** — Inspect the primary-entity seed array. If it has FEWER THAN 15 records, BLOCKING. (Exception: if the concept is intrinsically about a single record like "draft this one document", the seed can be smaller but must include 10+ prior history items.) The user explicitly demanded massive realistic synthetic data — anemic seeds are a failure.
12. **VERBATIM CORPUS QUOTES** — Scan rendered strings (JSX text content, seed-data string values, AI system prompts) for telltale verbatim research-quote markers: opening with first-person testimonial phrasing followed by a paragraph (\`"I feel like..."\`, \`"I've been..."\`, \`"My biggest issue is..."\`), or any string longer than 80 chars that reads like a research-subject's direct speech. If found, BLOCKING — replace with paraphrased product copy that captures the insight without reproducing the quote.
13. **VERBALIZED SAMPLING ENVELOPE** — For creative AI calls (alert copy, summary generation, nudge text), the system prompt should embed a Verbalized Sampling instruction (asks for K candidates, picks the lowest-probability one that meets quality bar). If creative calls exist but NONE use the VS pattern, that's significant (not blocking) — note it in issues with severity "significant".
</depth_and_ai_checklist>

<instructions>
1. Read all four inputs.
2. Run the depth_and_ai_checklist above. Any check failing = blocking verdict.
3. Check the prototype against the Brief: does it demonstrate the moment? Does it meet the success criteria? Does it respect the hard constraints (including BRAND COLOR VALUES — match hex exactly)?
4. Check against the Spec: every screen present, every state implemented, every transition wired, every micro-interaction defined, motion contract honored, every \`ai_flows\` entry wired to a real fetch.
5. Check against the System: all tokens used, no rogue colors/fonts/spacing values introduced.
6. Check the code for runnability: will it execute as-is? Imports correct? Common bugs? No bare \`const { useState } = React;\` redeclarations? No \`export\` statements?
7. Check accessibility: contrast, keyboard navigation, reduced motion, ARIA where needed.
8. Produce a Critique Report.
9. \`corrected_code\` emission rule (TOKEN-BUDGET CRITICAL):
   - verdict = "refine"  → emit corrected_code (full file, no diffs). It must pass every check.
   - verdict = "rebuild" → set corrected_code = null. The pipeline ships the original and routes for human review; emitting a rebuilt file here wastes ~20K output tokens and risks mid-string truncation that breaks the critique JSON.
   - verdict = "ship"    → set corrected_code = null.
10. KEEP YOUR OUTPUT WITHIN ~50K TOKENS. The audit must fit in the response window. Be terse in failed_sessions[].missing_piece (≤ 20 words each) and issues[].description (≤ 30 words each). Avoid prose in fix[]; one imperative sentence each.
</instructions>

<output_schema>
{
  "verdict": "ship | refine | rebuild",
  "summary": "string, 2-3 sentences — LEAD with coverage % when sessions were provided",
  "session_coverage": {
    "coverage_pct": 0,
    "sessions_passed": 0,
    "sessions_total": 30,
    "failed_sessions": [
      {
        "session_id": "session-XX",
        "persona_name": "string",
        "bucket": "modal | edge | tail",
        "missing_piece": "string — ≤ 20 words, name the missing element only"
      }
    ]
  },
  "issues": [{
    "category": "brief_violation | spec_violation | system_violation | code_bug | accessibility | session_coverage",
    "severity": "blocking | significant | minor",
    "description": "string",
    "source_of_truth": "string",
    "code_location": "string",
    "fix": "string"
  }],
  "corrected_code": "string or null"
}
</output_schema>

<final_instruction>
Be specific. "The button doesn't match the design" is not acceptable. "Primary CTA on screen 2 uses #00B7C3 but the system specifies emphasis #B8B800" is acceptable. Output valid JSON only.
</final_instruction>`;

// ============================================================
// LLM CALL — native Gemini endpoint with thinkingConfig
// ============================================================
//
// 2026-05-11 — switched from the OpenAI-compat layer to the native Gemini
// endpoint so we can pass `thinkingConfig: { thinkingBudget: 'high' | 'medium' | 'low' }`.
// The whitepaper is explicit: Stages 1, 2, 4, 5 must run at thinking_budget=high.
// The compat layer drops this parameter silently, which was producing
// medium-thinking output and the corresponding mid-tier quality.

type ThinkingBudget = 'max' | 'high' | 'medium' | 'low' | 'minimal';

async function callGeminiStage(
    systemPrompt: string,
    userContent: string,
    expectJson: boolean,
    thinkingBudget: ThinkingBudget = 'high',
    maxOutputTokens?: number,
): Promise<string> {
    const body: any = {
        model: STAGE_MODEL,
        // Gemini native: system instruction is a top-level field, not a chat turn.
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        config: {
            temperature: 0.2,
            maxOutputTokens: maxOutputTokens ?? (expectJson ? 16000 : 32000),
            thinkingBudget,
            ...(expectJson ? { responseMimeType: 'application/json' } : {}),
        },
    };

    // 2026-05-12 — Use shared retry client. Each prototype-pipeline
    // stage was previously a single-shot fetch; a transient 503 mid-
    // pipeline killed the whole build (40+ engineer-hours of model
    // thinking time wasted). With retry, transient failures are
    // recovered automatically with exponential backoff.
    const { callAIWithRetry } = await import('./aiRetryClient');
    const data = await callAIWithRetry('gemini', body, { label: `Prototype Stage` });
    // Gemini native response shape: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('').trim();
    if (!text) {
        // Surface Gemini's safety / finish-reason for debugging
        const finishReason = candidate?.finishReason || 'unknown';
        throw new Error(`Gemini stage returned empty content (finishReason=${finishReason}). Raw: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return text;
}

// JSON-stage caller with strict schema validation + one auto-repair attempt.
// If the first response is missing required keys, we re-prompt the model
// with the failure explicitly named so it knows what to fix on retry.
// 2026-05-15 — GPT-5.5 stage caller. Routes structured-output stages (Stage 2
// Interaction Architect, Stage 5 Critic) through GPT-5.5 instead of Gemini to
// reduce cost on deterministic JSON tasks while keeping Opus/Gemini for the
// creativity-bound stages (Pass 1 framings, Stage 4 visual coder). GPT-5.5's
// response_format=json_object yields cleaner JSON than Gemini's json mode and
// is significantly cheaper per token. The interface mirrors callGeminiStage
// exactly so it's a drop-in swap at the call site.
async function callGpt55Stage(
    systemPrompt: string,
    userContent: string,
    jsonMode: boolean = true,
    _thinkingBudget?: any,           // unused on GPT-5.5; kept for interface compat
    maxOutputTokens: number = 16000,
): Promise<string> {
    const body: any = {
        model: 'gpt-5.5',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
        ],
        max_completion_tokens: maxOutputTokens,
        temperature: 0.7,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };
    const { callAIWithRetry } = await import('./aiRetryClient');
    const data = await callAIWithRetry('openai', body, {
        label: 'GPT-5.5 stage',
        headers: { 'x-openai-endpoint': 'chat' },
        requestTimeoutMs: 300_000,
    });
    const text = (data?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
        const finish = data?.choices?.[0]?.finish_reason || 'no output';
        throw new Error(`GPT-5.5 stage returned empty payload (finish_reason=${finish}).`);
    }
    return text;
}

// 2026-05-15 — Mirrors callGeminiJsonStage interface exactly. Drop-in swap for
// stages that produce structured JSON (Stage 2, Stage 5). Same retry-on-
// missing-keys logic; same tryParseJson recovery chain (which includes the
// truncation repair added 2026-05-15).
async function callGpt55JsonStage<T>(
    systemPrompt: string,
    userContent: string,
    requiredKeys: string[],
    stageName: string,
    thinkingBudget: ThinkingBudget = 'high',
    maxOutputTokens?: number,
): Promise<T> {
    const tryOnce = async (extraNote?: string) => {
        const finalUser = extraNote ? `${userContent}\n\n${extraNote}` : userContent;
        const text = await callGpt55Stage(systemPrompt, finalUser, true, thinkingBudget, maxOutputTokens || 16000);
        return tryParseJson<T>(text, stageName);
    };
    let parsed = await tryOnce();
    const missing = requiredKeys.filter(k => (parsed as any)?.[k] === undefined || (parsed as any)?.[k] === null);
    if (missing.length === 0) return parsed;
    console.warn(`[${stageName}] missing required keys: ${missing.join(', ')} — retrying with explicit instruction`);
    parsed = await tryOnce(
        `IMPORTANT — your previous response was missing these required keys: ${missing.join(', ')}. ` +
        `Re-emit the JSON with EVERY required field present and matching the schema exactly. Output valid JSON only.`,
    );
    const stillMissing = requiredKeys.filter(k => (parsed as any)?.[k] === undefined || (parsed as any)?.[k] === null);
    if (stillMissing.length > 0) {
        throw new Error(`${stageName} still missing required keys after retry: ${stillMissing.join(', ')}`);
    }
    return parsed;
}

async function callGeminiJsonStage<T>(
    systemPrompt: string,
    userContent: string,
    requiredKeys: string[],
    stageName: string,
    thinkingBudget: ThinkingBudget = 'high',
    maxOutputTokens?: number,
): Promise<T> {
    const tryOnce = async (extraNote?: string) => {
        const finalUser = extraNote ? `${userContent}\n\n${extraNote}` : userContent;
        const text = await callGeminiStage(systemPrompt, finalUser, true, thinkingBudget, maxOutputTokens);
        return tryParseJson<T>(text, stageName);
    };
    let parsed = await tryOnce();
    const missing = requiredKeys.filter(k => (parsed as any)?.[k] === undefined || (parsed as any)?.[k] === null);
    if (missing.length === 0) return parsed;
    // One repair attempt — call out the specific missing keys
    console.warn(`[${stageName}] missing required keys: ${missing.join(', ')} — retrying with explicit instruction`);
    parsed = await tryOnce(
        `IMPORTANT — your previous response was missing these required keys: ${missing.join(', ')}. ` +
        `Re-emit the JSON with EVERY required field present and matching the schema exactly. Output valid JSON only.`,
    );
    const stillMissing = requiredKeys.filter(k => (parsed as any)?.[k] === undefined || (parsed as any)?.[k] === null);
    if (stillMissing.length > 0) {
        throw new Error(`${stageName} still missing required keys after retry: ${stillMissing.join(', ')}`);
    }
    return parsed;
}

/**
 * Walk a JSON-ish string and escape any raw control characters that appear
 * INSIDE string literals (the most common LLM JSON failure: emitting a
 * multi-line code snippet inside a "corrected_code" or "summary" field
 * with literal newlines instead of "\n" escape sequences).
 *
 * State machine: tracks inString + escape so we only touch chars inside
 * `"..."` and never re-escape chars that are already escaped.
 */
function sanitizeJsonControlChars(s: string): string {
    const out: string[] = [];
    let inString = false;
    let escape = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (escape) { out.push(c); escape = false; continue; }
        if (inString && c === '\\') { out.push(c); escape = true; continue; }
        if (c === '"') { out.push(c); inString = !inString; continue; }
        if (inString) {
            const code = c.charCodeAt(0);
            if (code < 0x20) {
                if (c === '\n') out.push('\\n');
                else if (c === '\r') out.push('\\r');
                else if (c === '\t') out.push('\\t');
                else if (c === '\b') out.push('\\b');
                else if (c === '\f') out.push('\\f');
                else out.push('\\u' + code.toString(16).padStart(4, '0'));
                continue;
            }
        }
        out.push(c);
    }
    return out.join('');
}

// 2026-05-14 — Truncation recovery for max-tokens overflow.
// When a stage returns JSON cut off mid-string (or mid-array/object), close
// the open string + balance the bracket stack so the parser can salvage the
// completed portion. The trailing record will be partial but the upper-level
// fields (verdict, summary, coverage_pct) are recoverable. Returns null if
// the input is already balanced and doesn't need recovery.
function recoverTruncatedJson(s: string): string | null {
    let inString = false;
    let escape = false;
    const stack: string[] = [];
    let lastValueClosePos = -1; // last position where a string/value cleanly closed at depth >= 1
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (escape) { escape = false; continue; }
        if (inString) {
            if (c === '\\') { escape = true; continue; }
            if (c === '"') { inString = false; if (stack.length > 0) lastValueClosePos = i; continue; }
            continue;
        }
        if (c === '"') { inString = true; continue; }
        if (c === '{' || c === '[') { stack.push(c); continue; }
        if (c === '}' || c === ']') { stack.pop(); if (stack.length > 0) lastValueClosePos = i; continue; }
    }
    if (!inString && stack.length === 0) return null;
    // If we're inside a string, the trailing partial value is unsafe — truncate
    // back to the last clean value close and re-balance from there. This drops
    // the half-written record but preserves the prior complete entries.
    let repaired = s;
    if (inString) {
        if (lastValueClosePos >= 0) {
            // Trim trailing comma/whitespace after the last clean close
            let end = lastValueClosePos + 1;
            while (end < repaired.length && /[\s,]/.test(repaired[end])) end++;
            repaired = repaired.slice(0, lastValueClosePos + 1);
            // Re-scan the bracket stack after truncation
            const restack: string[] = [];
            let s2 = false, e2 = false;
            for (let i = 0; i < repaired.length; i++) {
                const c = repaired[i];
                if (e2) { e2 = false; continue; }
                if (s2) { if (c === '\\') { e2 = true; continue; } if (c === '"') s2 = false; continue; }
                if (c === '"') s2 = true;
                else if (c === '{' || c === '[') restack.push(c);
                else if (c === '}' || c === ']') restack.pop();
            }
            stack.length = 0;
            restack.forEach(b => stack.push(b));
        } else {
            // Mid-string but no prior clean close — just close the string
            repaired += '"';
        }
    }
    while (stack.length > 0) {
        const open = stack.pop();
        repaired += (open === '{') ? '}' : ']';
    }
    return repaired;
}

function tryParseJson<T>(text: string, stageName: string): T {
    // Strip ``` fences if model adds them despite instructions
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.split('```', 3)[1] || cleaned;
        if (cleaned.startsWith('json')) cleaned = cleaned.slice(4);
        cleaned = cleaned.trim();
    }
    try {
        return JSON.parse(cleaned);
    } catch (e: any) {
        const msg = String(e?.message || e);
        const looksLikeControlCharErr = /control character|control char|unexpected token.*in JSON/i.test(msg);
        const looksLikeTruncation = /unterminated string|unexpected end of (json|data|input)/i.test(msg);

        // Recovery #1 — control chars inside strings (multi-line code in a field
        // emitted with literal newlines instead of "\n").
        if (looksLikeControlCharErr) {
            try {
                const sanitized = sanitizeJsonControlChars(cleaned);
                const parsed = JSON.parse(sanitized);
                console.warn(`[${stageName}] recovered from control-char JSON error via sanitization (${cleaned.length} chars input).`);
                return parsed;
            } catch { /* fall through to truncation recovery */ }
        }

        // Recovery #2 — truncation (max_tokens overflow mid-string/array/object).
        // Close the open string and balance the bracket stack so the parser can
        // salvage the completed prefix. The trailing partial record is dropped.
        if (looksLikeTruncation || looksLikeControlCharErr) {
            try {
                const sanitized = sanitizeJsonControlChars(cleaned);
                const recovered = recoverTruncatedJson(sanitized);
                if (recovered) {
                    const parsed = JSON.parse(recovered);
                    console.warn(`[${stageName}] recovered from truncated JSON via bracket-balance (${cleaned.length} → ${recovered.length} chars). Trailing record may be partial.`);
                    return parsed;
                }
            } catch { /* fall through to error */ }
        }

        throw new Error(`${stageName} returned invalid JSON: ${e.message}. First 200 chars: ${cleaned.slice(0, 200)}`);
    }
}

// 2026-05-14 — Last-resort critique extractor for when Stage 5 returns
// JSON so malformed that even bracket-balance recovery can't parse it.
// Regex out the top-level fields the UI cares about so the prototype still
// ships with a meaningful (if degraded) audit summary instead of failing.
function extractPartialCritique(text: string, parseErrorMsg: string): CritiqueReport {
    const verdictMatch = text.match(/"verdict"\s*:\s*"(ship|refine|rebuild)"/i);
    const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const coverageMatch = text.match(/"coverage_pct"\s*:\s*(\d+(?:\.\d+)?)/);
    const passedMatch = text.match(/"sessions_passed"\s*:\s*(\d+)/);
    const totalMatch = text.match(/"sessions_total"\s*:\s*(\d+)/);
    const verdict = (verdictMatch?.[1]?.toLowerCase() as 'ship' | 'refine' | 'rebuild') || 'ship';
    const summary = summaryMatch?.[1]
        ? summaryMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').slice(0, 500)
        : 'Critique JSON was malformed; prototype shipped without full audit.';
    const sessionCoverage = coverageMatch ? {
        coverage_pct: Number(coverageMatch[1]),
        sessions_passed: passedMatch ? Number(passedMatch[1]) : 0,
        sessions_total: totalMatch ? Number(totalMatch[1]) : 0,
        failed_sessions: [],
    } : undefined;
    return {
        verdict,
        summary,
        ...(sessionCoverage ? { session_coverage: sessionCoverage } : {}),
        issues: [{
            category: 'code_bug',
            severity: 'minor',
            description: `Stage 5 critique JSON malformed (likely max-tokens truncation): ${parseErrorMsg.slice(0, 200)}`,
            source_of_truth: 'meta',
            code_location: '-',
            fix: 'Re-run prototype build; if truncation persists, reduce session count or further tighten Stage 5 schema.',
        }],
        corrected_code: null,
    };
}

function stripCodeFences(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        // Find content between first and last fence
        const firstNewline = cleaned.indexOf('\n');
        if (firstNewline > 0) cleaned = cleaned.slice(firstNewline + 1);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
}

// ============================================================
// PIPELINE ORCHESTRATOR
// ============================================================

export interface BuildOptions {
    concept: string;
    brand: Brand;
    title?: string;
    basedOn?: string;          // e.g., "recommendation: Foo"
    researchGoal?: string;
    onProgress?: (stage: number, name: string, status: 'running' | 'done' | 'failed', detail?: string) => void;
    /**
     * 2026-05-13 — When the user picked one of 5 generated briefs in the
     * brief-selection phase, pass it here. Stage 1 (Concept Decomposer) is
     * SKIPPED — the approved brief is the authoritative spec and goes
     * straight into Stage 2. This preserves all the user-approved detail
     * (use_cases, screens, AI capabilities, seed_data, visual_direction)
     * that would otherwise be lossy-recompressed by Stage 1's schema.
     */
    approvedBrief?: ExperienceBrief;
}

export async function buildPrototype(opts: BuildOptions): Promise<PrototypeArtifact> {
    const { concept, brand, onProgress, approvedBrief } = opts;
    const fire = (n: number, name: string, status: 'running' | 'done' | 'failed', detail?: string) =>
        onProgress?.(n, name, status, detail);

    // Per-whitepaper §8.1: stages 1, 2, 4, 5 = high thinking_budget,
    // stage 3 = medium. Stage 4 is the expensive one (3-5x cost) — but
    // it's the difference between competent and Apple-grade output.

    // Stage 1 — SKIPPED if the user approved a brief from the 5-brief picker.
    let brief: ExperienceBrief;
    if (approvedBrief) {
        fire(1, 'Concept Decomposer', 'done', `using user-approved brief — Stage 1 skipped`);
        brief = approvedBrief;
    } else {
        fire(1, 'Concept Decomposer', 'running');
        try {
            brief = await callGeminiJsonStage<ExperienceBrief>(
                STAGE_1_SYSTEM, concept,
                ['concept_title', 'one_line_thesis', 'primary_persona', 'demonstrated_moment', 'jobs_to_be_done', 'success_criteria', 'hard_constraints'],
                'Stage 1 Concept Decomposer',
                'max',
            );
        } catch (e: any) {
            fire(1, 'Concept Decomposer', 'failed', e.message);
            throw e;
        }
        fire(1, 'Concept Decomposer', 'done', `${brief.concept_title} · thinking=high`);
    }

    // 2026-05-13 — When the user approved a brief, the original `concept`
    // string contains the rich user-facing brief context (use cases, screens,
    // AI capabilities, seed_data, visual_direction). Prepend it to every
    // downstream stage's user content so the full approved detail flows
    // through. This preserves the IDEO/Apple bar through the pipeline.
    const richBrief = approvedBrief ? `\n\nAPPROVED BRIEF — RICH CONTEXT (the user picked this from a 5-brief set; honor every use case, screen, AI capability, seed entity, and visual direction):\n${concept}\n` : '';

    // Stage 2 — Interaction Architect
    // 2026-05-15 — Reverted to Gemini-primary because the user's OpenAI quota
    // is exhausted (HTTP 429 cascade). GPT-5.5 is the fallback when Gemini
    // fails. Will flip back to GPT-5.5-primary once OpenAI quota is restored.
    fire(2, 'Interaction Architect', 'running');
    let spec: InteractionSpec;
    try {
        spec = await callGeminiJsonStage<InteractionSpec>(
            STAGE_2_SYSTEM, `${JSON.stringify(brief, null, 2)}${richBrief}`,
            ['screens', 'state_machine', 'micro_interactions', 'motion_contract'],
            'Stage 2 Interaction Architect',
            'max',
        );
    } catch (gemErr: any) {
        console.warn(`[Stage 2] Gemini failed (${gemErr?.message || gemErr}) — falling back to GPT-5.5.`);
        try {
            spec = await callGpt55JsonStage<InteractionSpec>(
                STAGE_2_SYSTEM, `${JSON.stringify(brief, null, 2)}${richBrief}`,
                ['screens', 'state_machine', 'micro_interactions', 'motion_contract'],
                'Stage 2 Interaction Architect (fallback)',
                'max',
                16000,
            );
        } catch (e: any) {
            fire(2, 'Interaction Architect', 'failed', e.message);
            throw e;
        }
    }
    fire(2, 'Interaction Architect', 'done', `${spec.screens?.length || 0} screens, ${spec.state_machine?.length || 0} transitions · gemini-3.1-pro`);

    // Stage 2.5 — Simulated User Sessions (2026-05-13). Generates the 30
    // synthetic sessions (12 modal + 10 edge + 8 tail) the prototype must
    // satisfy. Output flows into every downstream stage. Stage 5 audits the
    // built prototype's coverage of these sessions and produces a coverage %.
    fire(25, 'Simulated User Sessions', 'running');
    let simulatedSessions: SimulatedUserSession[] = [];
    try {
        const simPayload = await callGeminiJsonStage<{ sessions: SimulatedUserSession[] }>(
            STAGE_2_5_SYSTEM,
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}${richBrief}`,
            ['sessions'],
            'Stage 2.5 Simulated User Sessions',
            'max',
            24000,
        );
        simulatedSessions = Array.isArray(simPayload?.sessions) ? simPayload.sessions : [];
    } catch (e: any) {
        // Non-fatal: if the sim stage fails, we proceed without coverage audit.
        // This avoids killing the entire build for a Stage 2.5 transient failure.
        console.warn(`[Stage 2.5] failed — proceeding without simulated sessions: ${e?.message || e}`);
        fire(25, 'Simulated User Sessions', 'failed', `${e?.message || 'failed'} — proceeding without coverage`);
    }
    if (simulatedSessions.length > 0) {
        const counts = simulatedSessions.reduce((acc, s) => {
            const b = (s.bucket || 'modal') as 'modal' | 'edge' | 'tail';
            acc[b] = (acc[b] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        fire(25, 'Simulated User Sessions', 'done', `${simulatedSessions.length} sessions (${counts.modal || 0} modal · ${counts.edge || 0} edge · ${counts.tail || 0} tail) · thinking=high`);
    }
    // Build a compact text serialization of the sessions to feed downstream
    // stages — keeps payloads efficient vs. shipping the full JSON each stage.
    const sessionsBlock = simulatedSessions.length > 0
        ? `\n\nSIMULATED USER SESSIONS (${simulatedSessions.length}) — the design + recipe + code must satisfy ALL THREE buckets; Stage 5 will compute coverage per-session:\n${simulatedSessions.map(s => `  • [${s.bucket}] ${s.id} — ${s.persona.name} (${s.persona.role}): wants "${s.motivation}"; frustrated by "${s.one_thing_frustrated_by}"`).join('\n')}`
        : '';

    // 2026-05-15 — Compute the catalog/composer preface ONCE here so Stage 3
    // (Visual Designer) and Stage 3.5 (Build Recipe Author) both see the
    // 77-pattern catalog and the strict composition rule. Previously only
    // Stage 4 received this injection — meaning Stage 3 picked design tokens
    // without committing to specific pattern IDs, and the Recipe planned
    // screens without knowing which pattern wrappers were available. Result:
    // Stage 4 had to bend the recipe to fit the catalog. Injecting earlier
    // pre-commits the design to specific catalog patterns so the recipe
    // plans WITH those patterns and Stage 4 just renders.
    // The catalog has a 5-min TTL cache, so the three callers share the load.
    let composerPreface = '';
    try {
        const briefAnyEarly = brief as any;
        const composerEarly = await buildComposerInjection({
            prompt: String(opts.concept || briefAnyEarly.user_prompt || briefAnyEarly.concept_title || ''),
            concept: briefAnyEarly.concept_title || briefAnyEarly.one_line_thesis || briefAnyEarly.demonstrated_moment || opts.concept || '',
            brand_override: brand === 'NU' ? 'nu' : 'nxt',
        });
        if (composerEarly.active && composerEarly.injection) {
            composerPreface = composerEarly.injection + '\n\n';
            console.log(
                `[Stages 3/3.5/4] STRICT COMPOSER preface built — experience="${composerEarly.hashtag.experience_name}", ` +
                `brand=${composerEarly.hashtag.brand}, recommended patterns=${composerEarly.recommended_patterns.length}`,
            );
        }
    } catch (composerErr: any) {
        console.warn('[Stages 3/3.5/4] composer preface failed, proceeding without:', composerErr?.message || composerErr);
    }

    // Stage 3 (medium thinking — visual design is structurally simpler than logic)
    // Now sees the catalog preface so it pre-commits to specific pattern IDs.
    fire(3, 'Visual Designer', 'running');
    let designSystem: DesignSystem;
    try {
        designSystem = await callGeminiJsonStage<DesignSystem>(
            composerPreface + buildStage3System(brand),
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}${richBrief}${sessionsBlock}`,
            ['brand_application', 'type_system', 'color_system', 'spacing_scale', 'motion_tokens', 'components'],
            'Stage 3 Visual Designer',
            'medium',
        );
    } catch (e: any) {
        fire(3, 'Visual Designer', 'failed', e.message);
        throw e;
    }
    fire(3, 'Visual Designer', 'done', `${brand} brand applied · thinking=medium${composerPreface ? ' · catalog-aware' : ''}`);

    // Stage 3.5 — Build Recipe Author. Produces the exhaustive implementation
    // plan Stage 4 will execute verbatim. Max thinking budget, large output
    // budget — this is the brain of the build.
    // 2026-05-15 — Build Recipe now sees the catalog preface too. The recipe
    // planner can therefore name specific pattern IDs (p-chat, p-rec, p-dial,
    // etc.) into screens[].components[] instead of inventing component names
    // Stage 4 has to map after the fact.
    fire(35, 'Build Recipe Author', 'running');
    let buildRecipe: BuildRecipe;
    try {
        buildRecipe = await callGeminiJsonStage<BuildRecipe>(
            composerPreface + STAGE_3_5_SYSTEM,
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}${richBrief}${sessionsBlock}`,
            ['persona_runtime', 'seed_data', 'screens', 'cross_cutting', 'micro_copy', 'verbatim_prompts', 'success_assertions'],
            'Stage 3.5 Build Recipe Author',
            'max',
            65536, // recipe is huge — give it room
        );
    } catch (e: any) {
        fire(35, 'Build Recipe Author', 'failed', e.message);
        throw e;
    }
    const recipeStats = {
        screens: buildRecipe.screens?.length || 0,
        entities: Object.keys(buildRecipe.seed_data || {}).length,
        microCopy: Object.keys(buildRecipe.micro_copy || {}).length,
        aiCalls: Object.keys(buildRecipe.verbatim_prompts || {}).length,
        assertions: buildRecipe.success_assertions?.length || 0,
    };
    fire(35, 'Build Recipe Author', 'done',
        `${recipeStats.screens} screens, ${recipeStats.entities} seed entities, ${recipeStats.microCopy} copy strings, ${recipeStats.aiCalls} AI calls, ${recipeStats.assertions} assertions · thinking=high`);

    // Stage 4 — the expensive one. High thinking, generous token budget.
    // Now executes the recipe verbatim rather than re-deciding the design.
    fire(4, 'Prototype Coder', 'running');

    // 2026-05-14 — Inject the Design Exemplar Library before the Stage 4
    // system prompt so the coder has 5 named visual references to study
    // instead of falling back to "generic Copilot clone with modal + tone
    // slider". Selection is hashtag-aware: #NXT-radical loads framing ε,
    // #NU-institutional swaps brand to NU + framing α, etc. If curation
    // fails (e.g. wiki index unreachable), Stage 4 proceeds without
    // injection — no regression on existing behavior.
    let stage4System = buildStage4System(brand);
    try {
        const briefAny = brief as any;
        const specAny = spec as any;
        const designAny = designSystem as any;
        const committedFrameRaw = briefAny.committed_frame;
        const committedFrame =
            String(committedFrameRaw) === '3' ? 'radical' :
            String(committedFrameRaw) === '1' ? 'convention-honoring' : 'unspecified';

        const exemplarRefs = await curateExemplarsForBrief({
            concept: briefAny.concept_title || briefAny.one_line_thesis || briefAny.demonstrated_moment || '',
            interactionPattern: specAny?.primary_interaction_pattern || briefAny.interaction_pattern,
            aestheticKeywords: designAny?.aesthetic_keywords || briefAny.visual_direction?.aesthetic_keywords || [],
            committedFrame,
            brandHashtag: brand === 'NU' ? '#NU' : '#NXT',
        });

        if (exemplarRefs.length > 0) {
            const injectionBlock = buildStage4InjectionBlock(exemplarRefs, brand === 'NU' ? '#NU' : '#NXT');
            stage4System = injectionBlock + '\n\n' + stage4System;
            console.log(
                `[Stage 4] Injected ${exemplarRefs.length} design exemplar references ` +
                `(brand=${brand}, framing=${exemplarRefs[0].framing_letter}/${exemplarRefs[0].framing_name})`,
            );
        }

        // 2026-05-14 — STRICT-RULE composer injection. Parses #proto hashtag
        // from the original user prompt (carried through on the brief) and,
        // if present, prepends a hard composition rule: every UI region MUST
        // be a NAMED pattern from the catalog. The composer is non-fatal —
        // if catalog load fails or the hashtag is absent, Stage 4 proceeds
        // with just the exemplar block + system prompt.
        try {
            // 2026-05-15 — `concept` is the load-bearing field: it carries the
            // user's verbatim `#proto <name> #NU|#NXT` hashtag from the chat
            // input. Without it the composer's parseProtoHashtag never sees the
            // hashtag and the strict-rule injection silently no-ops. Order
            // matters: concept first, then fall back to anything else that
            // might carry the hashtag.
            const userPrompt = String(
                opts.concept ||
                briefAny.user_prompt ||
                briefAny.original_prompt ||
                opts.researchGoal ||
                opts.title ||
                briefAny.concept_title ||
                ''
            );
            const composerResult = await buildComposerInjection({
                prompt: userPrompt,
                concept: briefAny.concept_title || briefAny.one_line_thesis || briefAny.demonstrated_moment || opts.concept || '',
                brand_override: brand === 'NU' ? 'nu' : 'nxt',
            });
            if (composerResult.active && composerResult.injection) {
                stage4System = composerResult.injection + '\n\n' + stage4System;
                console.log(
                    `[Stage 4] STRICT COMPOSER active — experience="${composerResult.hashtag.experience_name}", ` +
                    `brand=${composerResult.hashtag.brand}, ` +
                    `recommended patterns=${composerResult.recommended_patterns.length}`,
                );
            } else {
                // Composer is always-on; if active is false, the catalog load failed.
                console.warn('[Stage 4] STRICT COMPOSER inactive — catalog load failed; Stage 4 falling back to free-form generation. Check /hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json is reachable.');
            }
        } catch (composerErr: any) {
            console.warn('[Stage 4] composer injection failed, proceeding without:', composerErr?.message || composerErr);
        }
    } catch (exErr: any) {
        console.warn('[Stage 4] exemplar curation failed, proceeding without injection:', exErr?.message || exErr);
    }

    let codeText: string;
    try {
        codeText = await callGeminiStage(
            stage4System,
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}\n\nBUILD RECIPE (EXECUTE VERBATIM — every micro-copy string, every screen's component tree, every verbatim AI prompt, every seed-record anchor):\n${JSON.stringify(buildRecipe, null, 2)}${richBrief}${sessionsBlock}`,
            false,
            'max',
            65536, // generous output budget for a substantial single-file component with real AI flows
        );
    } catch (e: any) {
        fire(4, 'Prototype Coder', 'failed', e.message);
        throw e;
    }
    let code = stripCodeFences(codeText);
    fire(4, 'Prototype Coder', 'done', `${Math.round(code.length / 1024)}KB · thinking=high`);

    // Stage 5 — audits the code against the build recipe's success_assertions
    // in addition to the brief/spec/system checks.
    fire(5, 'Critic + Refiner', 'running');
    let critiqueText: string;
    try {
        const sessionsAuditBlock = simulatedSessions.length > 0
            ? `\n\nSIMULATED USER SESSIONS — AUDIT THE CODE AGAINST EACH OF THESE (${simulatedSessions.length} total). For EACH session, determine: "Can this user complete their motivation in this prototype as built? If not, what's the SPECIFIC missing piece?" Compute coverage % and populate \`session_coverage\` in the critique JSON:\n${JSON.stringify(simulatedSessions, null, 2)}`
            : '';
        // Stage 5 — Critic
        // 2026-05-15 — Reverted to Gemini-primary because OpenAI quota is
        // exhausted. GPT-5.5 is the fallback. Will flip back to GPT-5.5-primary
        // once OpenAI quota is restored.
        const stage5User = `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}\n\nBUILD RECIPE (audit code compliance against every screen, every micro-copy string, every verbatim AI prompt, every seed-data target_count, and every success_assertion):\n${JSON.stringify(buildRecipe, null, 2)}${richBrief}${sessionsAuditBlock}\n\nCODE:\n${code}`;
        try {
            critiqueText = await callGeminiStage(
                STAGE_5_SYSTEM,
                stage5User,
                true,
                'max',
                64000, // Stage 5 must traverse the entire recipe + code + up to 30 sessions and still fit failed_sessions[] descriptions
            );
        } catch (gemErr: any) {
            console.warn(`[Stage 5] Gemini failed (${gemErr?.message || gemErr}) — falling back to GPT-5.5.`);
            critiqueText = await callGpt55Stage(STAGE_5_SYSTEM, stage5User, true, 'max', 64000);
        }
    } catch (e: any) {
        // Critic transport failure (HTTP/network) — return what we have
        fire(5, 'Critic + Refiner', 'failed', e.message);
        const fallbackCritique: CritiqueReport = {
            verdict: 'ship',
            summary: 'Critic stage failed; shipping unverified prototype.',
            issues: [{ category: 'code_bug', severity: 'minor', description: `Critic failed: ${e.message}`, source_of_truth: 'meta', code_location: '-', fix: 'manual review' }],
            corrected_code: null,
        };
        return finalize({ concept, brand, title: opts.title, basedOn: opts.basedOn, researchGoal: opts.researchGoal, brief, spec, simulatedSessions, designSystem, buildRecipe, code, critique: fallbackCritique });
    }
    // 2026-05-14 — JSON parse failure must NOT kill the build. Stages 1-4 + 3.5
    // already succeeded; the prototype is in `code` and is shippable. If the
    // critique JSON is unparseable even after truncation recovery, extract
    // verdict/summary/coverage_pct heuristically and ship a partial critique.
    let critique: CritiqueReport;
    try {
        critique = tryParseJson<CritiqueReport>(critiqueText, 'Stage 5');
    } catch (parseErr: any) {
        console.warn(`[Stage 5] JSON parse failed; extracting heuristic critique. ${parseErr?.message || parseErr}`);
        critique = extractPartialCritique(critiqueText, parseErr?.message || String(parseErr));
        fire(5, 'Critic + Refiner', 'done', `partial critique extracted (JSON malformed) — shipping prototype, mark for human review`);
        return finalize({ concept, brand, title: opts.title, basedOn: opts.basedOn, researchGoal: opts.researchGoal, brief, spec, simulatedSessions, designSystem, buildRecipe, code, critique });
    }
    const coverageStr = critique.session_coverage
        ? `coverage ${critique.session_coverage.coverage_pct}% (${critique.session_coverage.sessions_passed}/${critique.session_coverage.sessions_total})`
        : '';
    if (critique.verdict === 'refine' && critique.corrected_code) {
        code = stripCodeFences(critique.corrected_code);
        fire(5, 'Critic + Refiner', 'done', `refined — ${critique.issues?.length || 0} issues fixed${coverageStr ? ` · ${coverageStr}` : ''}`);
    } else if (critique.verdict === 'rebuild') {
        fire(5, 'Critic + Refiner', 'done', `rebuild flagged${coverageStr ? ` (${coverageStr})` : ''} — shipping anyway, mark for human review`);
    } else {
        fire(5, 'Critic + Refiner', 'done', `ship${coverageStr ? ` · ${coverageStr}` : ''}`);
    }

    return finalize({ concept, brand, title: opts.title, basedOn: opts.basedOn, researchGoal: opts.researchGoal, brief, spec, simulatedSessions, designSystem, buildRecipe, code, critique });
}

function finalize(args: {
    concept: string;
    brand: Brand;
    title?: string;
    basedOn?: string;
    researchGoal?: string;
    brief: ExperienceBrief;
    spec: InteractionSpec;
    simulatedSessions?: SimulatedUserSession[];
    designSystem: DesignSystem;
    buildRecipe?: BuildRecipe;
    code: string;
    critique: CritiqueReport;
}): PrototypeArtifact {
    const title = args.title || args.brief.concept_title || 'Untitled Prototype';
    const slug = slugify(title);
    return {
        slug,
        title,
        concept: args.concept,
        brand: args.brand,
        based_on: args.basedOn,
        research_goal: args.researchGoal,
        brief: args.brief,
        interaction_spec: args.spec,
        simulated_sessions: args.simulatedSessions,
        design_system: args.designSystem,
        build_recipe: args.buildRecipe,
        code: args.code,
        code_format: 'react',
        critique: args.critique,
    };
}

function slugify(s: string): string {
    return (s || 'untitled-prototype')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80)
        .replace(/-+$/, '');
}
