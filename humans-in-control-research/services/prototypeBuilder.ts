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

const PROXY_BASE = 'http://localhost:5012';
const STAGE_MODEL = 'gemini-3.1-pro-preview';

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
    design_system: DesignSystem;
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

   e. **Use verbatim quotes from the THEMES block as evidence the prototype will surface.** If a theme has a verbatim quote like "I applied to 1,870 jobs over 18 months", that quote should appear in the prototype as a real testimonial / data point / scenario seed.

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
4. Define the data model: what entities exist, what fields they have, what's seeded for the demo. Seeded data must be CONCRETE and contextually realistic for the persona — never lorem ipsum, never \`["Item 1", "Item 2", "Item 3"]\`.
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
// STAGE 4: PROTOTYPE CODER
// ============================================================

function buildStage4System(brand: Brand): string {
    const tokens = BRAND_TOKENS[brand];
    return `<role>
You are a senior front-end engineer building a self-contained, runnable prototype. You take a Brief, an Interaction Spec, and a Design System, and produce a single-file React component that fully implements the interaction, the visual design, the motion contract, AND WIRES IN REAL AI CAPABILITIES where the concept calls for them.
</role>

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
This prototype runs at http://localhost:5012/api/prototypes/{slug}/view, which is **same-origin** with HiC's research proxy. That means the prototype can call ALL the proxy's AI endpoints directly — no API keys to expose, no CORS issues. WHENEVER THE CONCEPT IMPLIES AN AI BEHAVIOR (talk to data, smart suggestion, classification, embedding search, summarization, sentiment, semantic match, RAG, etc.), implement it with a REAL backend call, not a mock.

Available endpoints (all same-origin, just fetch them):

1. **Gemini 3.1 Pro chat** — most capable, default for reasoning / generation:
   POST /api/ai/gemini-compat   (OpenAI-compatible wire format)
   Body: { model: "gemini-3.1-pro-preview", messages: [{role,content},...], temperature: 0.3, max_tokens: 2000 }
   Headers: { "Content-Type": "application/json", "x-openai-endpoint": "chat" }
   Response: { choices: [{ message: { content: "..." } }] }

2. **Claude Opus 4.6 chat** — best for synthesis, long-form, careful judgment:
   POST /api/ai/anthropic
   Body: { model: "claude-opus-4-6", max_tokens: 2000, messages: [{role,content}] }
   Response: { content: [{ text: "..." }] }

3. **OpenAI GPT-5.5 chat** — fast, OpenAI-native:
   POST /api/ai/openai
   Headers: { "Content-Type": "application/json", "x-openai-endpoint": "chat" }
   Body: { model: "gpt-5.5", messages: [...], temperature: 0.3 }

4. **Embeddings (Gemini)** — for semantic search / similarity:
   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
   (NOT direct — go through the wiki RAG endpoint below)

5. **Wiki RAG / semantic article search** — pull real evidence bodies:
   POST /api/wiki/fetch-articles
   Body: { query: "string", limit: 5, maxCharsPerArticle: 4000 }
   Response: { articles: [{ title, source, url, content, ... }] }

6. **Knowledge-graph query** (if the concept references the engagement):
   The engagement's KG isn't exposed standalone — skip unless your concept is HiC-internal.

7. **Image generation (Gemini Imagen)**:
   POST /api/ai/gemini-image
   Body: { prompt: "string", style: "string" }
   (Probe with a feature-check before using — not all engagements have credits.)

DEFAULT CHOICE: Gemini 3.1 Pro chat via /api/ai/gemini-compat. It handles the broadest range of behaviors and has 1M context. Use Anthropic for synthesis tasks; OpenAI for fast classification.

Example "talk to your data" inline call:

  async function askAI(userMessage) {
    const res = await fetch('/api/ai/gemini-compat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-openai-endpoint': 'chat' },
      body: JSON.stringify({
        model: 'gemini-3.1-pro-preview',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for <persona context>. Answer concisely from the provided context.' },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'No response';
  }

ALWAYS handle: loading state (set isLoading=true before fetch, false after), error state (catch + show user a friendly message), empty response (defensive null-check).

DO NOT MOCK what the proxy can answer for real. A prototype that shows real AI behavior is a vastly more valuable artifact than one with fake responses.
</live_ai_primitives>

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
9. If verdict is "refine" OR "rebuild", output \`corrected_code\` with ALL fixes applied — full file, no diffs. The corrected_code must pass every check in the depth_and_ai_checklist.
</instructions>

<output_schema>
{
  "verdict": "ship | refine | rebuild",
  "summary": "string, 2-3 sentences",
  "issues": [{
    "category": "brief_violation | spec_violation | system_violation | code_bug | accessibility",
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

    const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        throw new Error(`Gemini stage HTTP ${resp.status}: ${err.slice(0, 300)}`);
    }
    const data = await resp.json();
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
async function callGeminiJsonStage<T>(
    systemPrompt: string,
    userContent: string,
    requiredKeys: string[],
    stageName: string,
    thinkingBudget: ThinkingBudget = 'high',
): Promise<T> {
    const tryOnce = async (extraNote?: string) => {
        const finalUser = extraNote ? `${userContent}\n\n${extraNote}` : userContent;
        const text = await callGeminiStage(systemPrompt, finalUser, true, thinkingBudget);
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
        throw new Error(`${stageName} returned invalid JSON: ${e.message}. First 200 chars: ${cleaned.slice(0, 200)}`);
    }
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
}

export async function buildPrototype(opts: BuildOptions): Promise<PrototypeArtifact> {
    const { concept, brand, onProgress } = opts;
    const fire = (n: number, name: string, status: 'running' | 'done' | 'failed', detail?: string) =>
        onProgress?.(n, name, status, detail);

    // Per-whitepaper §8.1: stages 1, 2, 4, 5 = high thinking_budget,
    // stage 3 = medium. Stage 4 is the expensive one (3-5x cost) — but
    // it's the difference between competent and Apple-grade output.

    // Stage 1
    fire(1, 'Concept Decomposer', 'running');
    let brief: ExperienceBrief;
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

    // Stage 2
    fire(2, 'Interaction Architect', 'running');
    let spec: InteractionSpec;
    try {
        spec = await callGeminiJsonStage<InteractionSpec>(
            STAGE_2_SYSTEM, JSON.stringify(brief, null, 2),
            ['screens', 'state_machine', 'micro_interactions', 'motion_contract'],
            'Stage 2 Interaction Architect',
            'max',
        );
    } catch (e: any) {
        fire(2, 'Interaction Architect', 'failed', e.message);
        throw e;
    }
    fire(2, 'Interaction Architect', 'done', `${spec.screens?.length || 0} screens, ${spec.state_machine?.length || 0} transitions · thinking=high`);

    // Stage 3 (medium thinking — visual design is structurally simpler than logic)
    fire(3, 'Visual Designer', 'running');
    let designSystem: DesignSystem;
    try {
        designSystem = await callGeminiJsonStage<DesignSystem>(
            buildStage3System(brand),
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}`,
            ['brand_application', 'type_system', 'color_system', 'spacing_scale', 'motion_tokens', 'components'],
            'Stage 3 Visual Designer',
            'medium',
        );
    } catch (e: any) {
        fire(3, 'Visual Designer', 'failed', e.message);
        throw e;
    }
    fire(3, 'Visual Designer', 'done', `${brand} brand applied · thinking=medium`);

    // Stage 4 — the expensive one. High thinking, generous token budget.
    fire(4, 'Prototype Coder', 'running');
    let codeText: string;
    try {
        codeText = await callGeminiStage(
            buildStage4System(brand),
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}`,
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

    // Stage 5
    fire(5, 'Critic + Refiner', 'running');
    let critiqueText: string;
    try {
        critiqueText = await callGeminiStage(
            STAGE_5_SYSTEM,
            `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}\n\nCODE:\n${code}`,
            true,
            'max',
            32000,
        );
    } catch (e: any) {
        // Critic failure shouldn't kill the pipeline — return what we have
        fire(5, 'Critic + Refiner', 'failed', e.message);
        const fallbackCritique: CritiqueReport = {
            verdict: 'ship',
            summary: 'Critic stage failed; shipping unverified prototype.',
            issues: [{ category: 'code_bug', severity: 'minor', description: `Critic failed: ${e.message}`, source_of_truth: 'meta', code_location: '-', fix: 'manual review' }],
            corrected_code: null,
        };
        return finalize({ concept, brand, title: opts.title, basedOn: opts.basedOn, researchGoal: opts.researchGoal, brief, spec, designSystem, code, critique: fallbackCritique });
    }
    const critique = tryParseJson<CritiqueReport>(critiqueText, 'Stage 5');
    if (critique.verdict === 'refine' && critique.corrected_code) {
        code = stripCodeFences(critique.corrected_code);
        fire(5, 'Critic + Refiner', 'done', `${critique.issues?.length || 0} issues fixed`);
    } else if (critique.verdict === 'rebuild') {
        fire(5, 'Critic + Refiner', 'done', 'rebuild flagged — shipping anyway, mark for human review');
    } else {
        fire(5, 'Critic + Refiner', 'done', 'ship');
    }

    return finalize({ concept, brand, title: opts.title, basedOn: opts.basedOn, researchGoal: opts.researchGoal, brief, spec, designSystem, code, critique });
}

function finalize(args: {
    concept: string;
    brand: Brand;
    title?: string;
    basedOn?: string;
    researchGoal?: string;
    brief: ExperienceBrief;
    spec: InteractionSpec;
    designSystem: DesignSystem;
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
        design_system: args.designSystem,
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
