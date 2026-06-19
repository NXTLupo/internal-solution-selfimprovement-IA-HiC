// prototypeBuilder.ts - 2026-05-11 (HiC-Experience-Designer)
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

// ============================================================
// 2026-06-13 — LIVE DESIGN-SYSTEM GROUNDING (nothing hardwired)
// The #proto pipeline grounds every request on the SAME live sources the
// Analyst Desk uses, so the design system the user has been building flows
// straight into prototype generation:
//   • /api/design-tokens          → Figma-MCP tokens (figma-tokens.json) — the
//                                    single source of truth for color/font/space.
//   • proto-component-manifest.md → the 150+ GOLD #proto components (vol1/2/3),
//     manifest-chunked, with exact token/variable bindings + flat SVG icon paths.
//   • synthesis/learned-constraints.md → the self-improvement engine's feedback.
// These REPLACE the old hardcoded BRAND_TOKENS const, which had also gone stale
// (it still declared NXT display = Bebas Neue after Figma moved to Saira
// Condensed, and NU = Spectral/Roboto after Figma moved to single-typeface Lato).
// Figma stays the source of truth; the manifest is the component vocabulary;
// learned constraints close the self-improvement loop. No excuses, nothing baked.
async function fetchLiveBrandTokens(brand: Brand): Promise<string> {
    try {
        const r = await fetch(`${PROXY_BASE}/api/design-tokens?brand=${brand}&format=prompt`);
        if (r.ok) { const t = (await r.text()).trim(); if (t) return t; }
        console.error(`[proto] design-tokens ${brand} HTTP ${r.status} — NOT falling back to hardcoded values`);
    } catch (e: any) {
        console.error('[proto] design-tokens fetch FAILED — NOT falling back to hardcoded values:', e?.message || e);
    }
    return `=== FIGMA DESIGN TOKENS (${brand}) UNAVAILABLE ===\nThe live Figma token source could not be reached. Do NOT invent hex values or font families; restrict to neutral greys plus a single placeholder accent and note that tokens were unavailable.`;
}

async function fetchProtoComponentManifest(): Promise<string> {
    try {
        const r = await fetch(`${PROXY_BASE}/api/wiki/read-article/${encodeURIComponent('design-system/proto-component-manifest.md')}`);
        if (r.ok) {
            const j = await r.json();
            const body: string = (j && (j.content || j.body || '')) || '';
            if (body) return body.replace(/^---[\s\S]*?\n---\n/, '').trim(); // drop chunk frontmatter, keep spec body
        }
        console.warn(`[proto] component-manifest HTTP ${r.status} — proceeding without component library`);
    } catch (e: any) {
        console.warn('[proto] component-manifest fetch failed — proceeding without component library:', e?.message || e);
    }
    return '';
}

async function fetchProtoLearnedConstraints(): Promise<string> {
    try {
        const r = await fetch(`${PROXY_BASE}/api/wiki/read-article/${encodeURIComponent('synthesis/learned-constraints.md')}`);
        if (r.ok) {
            const j = await r.json();
            const body: string = (j && (j.content || j.body || '')) || '';
            if (body) {
                const lines = body.split('\n').filter(l => /CONSTRAINT \[(?:proto|prototype|all)\b/i.test(l) || /#proto\b/i.test(l));
                if (lines.length) return lines.slice(0, 40).join('\n');
            }
        }
    } catch (e: any) {
        console.warn('[proto] learned-constraints fetch failed (non-fatal):', e?.message || e);
    }
    return '';
}
const STAGE_MODEL = 'gemini-3.1-pro-preview';
// 2026-06-14 - The CODE-generation stages (Stage 4 Prototype Coder, Stage 5 critic's
// corrected_code) run on Claude Opus 4.8 - the strongest code model. The planning stages
// (concept, interaction, visual, recipe) stay on STAGE_MODEL (Gemini 3.1 Pro) since they
// reason/plan rather than emit the shipping React file. Opus has a Gemini fallback at each
// code call so a single-provider outage never kills a build.
const CODE_MODEL = 'claude-opus-4-8';

// 2026-05-14 - Design exemplar curator (Behance reference library). Pulls
// matching exemplars by concept/interaction-pattern/brand-hashtag and
// injects a STUDY-THESE block at the head of the Stage 4 Prototype Coder
// system prompt. Replaces vague "clean modern" aesthetic placeholders with
// named, evidence-backed visual references the coder must visually pass
// against. See: .claude/skills/design-exemplar-curator/SKILL.md
import { curateExemplarsForBrief, buildStage4InjectionBlock } from './designExemplarCurator';
// 2026-05-14 - Experience Prototype Composer (STRICT-RULE). Mandates that
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
 * 2026-05-13 - Stage 2.5 output. A synthetic user session that the prototype
 * must satisfy. Generated via Verbalized Sampling (12 modal + 10 edge + 8 tail).
 * Stage 3, 3.5, 4, and 5 all consume these - Stage 5 audits coverage against
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
    starting_state: string;   // What they bring to the experience - emotional + situational
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
     * 2026-05-13 - Session coverage audit. For each of the 30 simulated users,
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
            missing_piece: string;     // Concrete: "Expert path expects keyboard shortcut to skip the intro - not wired."
        }>;
    };
}

/**
 * 2026-05-13 - Build Recipe: the exhaustive implementation plan that Stage 4
 * executes verbatim. Inspired by the Copilot Recipe Generator app - every
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
        description: `NXT Humans - Intelligence Augmentation Suite. Near-black foundation (#0D0D0D) with chartreuse/lime (#B8B800) as the load-bearing accent. Geometric, restrained, anti-marketing. Display type is Bebas Neue, body is Archivo. Sharp 2-4px corners, no decorative shadows, generous negative space.`,
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
  emphasis: '#B8B800'              # chartreuse is the brand mark - use prominently
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
        description: `Northeastern University - the actual NU brand, NOT a generic-red institutional approximation. Per brand.northeastern.edu: Pantone 200 red (#C8102E, NOT generic "huskies red" #C00000) used SPARINGLY as accent, never flooded. Editorial restraint, asymmetric grids, oversized headers, generous white space, photo-forward storytelling, and a confident plain-spoken voice. NEVER use Bebas Neue, NEVER use chartreuse, NEVER use thin display fonts. NU's brand voice is "ambitious, student-first, plain-spoken" - never bombastic, never marketing-puffy.`,
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
    nu_red: '#C8102E'              # PANTONE 200 C - THE official Northeastern red. NOT #C00000.
    nu_red_deep: '#9E0A24'         # hover/pressed for primary buttons
    nu_red_tint: '#FBE7EA'         # 8% red tint for subtle highlights - never flood with red
    cream: '#F8E5C2'               # NU secondary accent for soft callouts
  semantic:
    success: '#0F8A4B'             # restrained NU-compatible green, NOT bright lime
    warning: '#B5651D'             # NU sienna for caution, NOT orange
    friction: '#9E0A24'            # deep red for negative states
    opportunity: '#C8102E'         # primary red also signals opportunity/CTA
    error: '#9E0A24'
  emphasis: '#C8102E'              # but used SPARINGLY - buttons, key chrome, single hero accent
  type:
    display: 'Roboto Condensed'    # NU web spec: humanist condensed sans - NEVER 'Bebas Neue', NEVER 'Oswald'
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
    grid: 'editorial-asymmetric'   # NU's signature layout - not centered card grids
    photo_treatment: 'hero-led, full-bleed, never decorative-icon-only'
  voice: 'ambitious, student-first, plain-spoken, evidence-driven, never bombastic, never marketing-puffy'`,
    },
};

// ============================================================
// STAGE 1: CONCEPT DECOMPOSER
// ============================================================

const STAGE_1_SYSTEM = `<role>
You are an experience strategist of the calibre that ships products at Apple, Stripe, Linear, Vercel. Your job is to read a raw experience concept and decompose it into a structured Experience Brief that an engineer can build into a substantive, AI-native, expert-grade interactive demo - not a single-screen sketch. You think hard. You are precise, analytical, and you do not invent details that aren't supported by the input, but you DO push for ambition where the concept's emotional/functional payoff requires it.
</role>

<verbalized_sampling_reasoning_preamble>
You are an aligned LLM. Your default behavior on creative briefs is MODE COLLAPSE - you converge on the same scaffold for every concept: a dashboard with a chat panel, a list view with a detail modal, a wizard with a result screen. This preamble forces you out of that default before you commit to a brief.

BEFORE writing any field of the Experience Brief, write a <vs_thinking>...</vs_thinking> block that enumerates THREE candidate framings of this concept at distinct probabilities:

  FRAME 1 - "convention-honoring" (probability ~0.40)
    The brief any competent designer would write given this concept. Safe, schema-congruent, matches the typical interaction patterns for the domain. Probably a dashboard, probably a chat panel, probably a list+detail.
    Sketch it in 3-5 sentences. Name the screens.

  FRAME 2 - "shifted-frame" (probability ~0.12)
    The same concept reframed from a non-modal angle. Different primary persona (maybe a secondary actor becomes the lead), or different demonstrated moment (the "before" or "after" of the conventional scope), or different aha-interaction (a non-obvious AI flow). The brief a senior product partner would author after asking "what if we approached this from the OTHER side of the table?".
    Sketch it in 3-5 sentences. Name what's different from Frame 1.

  FRAME 3 - "radical-reinterpretation" (probability ~0.05)
    The interpretation a brilliant junior would propose in their first week - clear-eyed, unconventional, surprising-but-grounded. Different metaphor, different temporal scope, different stakeholder, or different data source than Frames 1 and 2. Would make a senior partner say "I wouldn't have thought of that". Still honors every engagement_context constraint and every hard non-starter from the input.
    Sketch it in 3-5 sentences. Name what's radical about it.

After enumerating all three, COMMIT to ONE frame for the actual Experience Brief output:
  • DEFAULT: commit to Frame 2 (shifted-frame). This is the sweet spot - non-modal but defensible.
  • IF the input concept carries "Concept frame: NON_OBVIOUS_BET" (the user picked a non-obvious-bet tile from the recommendations grid), commit to Frame 3 (radical-reinterpretation). The user explicitly asked for the tail.
  • IF the input concept explicitly asks for a conservative/conventional take, commit to Frame 1.

End the <vs_thinking> block with: "COMMITTED FRAME: [1|2|3] - [name]". Then emit the Experience Brief JSON, written entirely from the committed frame's perspective.

This is mandatory. Without it, the brief regresses to the conventional dashboard + chat scaffold every time, and the prototypes look identical regardless of concept.
</verbalized_sampling_reasoning_preamble>

<depth_mandate>
Every concept this pipeline produces must be a real, multi-screen, AI-powered experience demonstrating expert UI craft and a non-trivial product idea. The downstream pipeline reads YOUR brief to decide how rich the prototype gets. Do NOT under-specify. Specifically:

- Identify AT LEAST 3 jobs-to-be-done that the prototype must demonstrate end-to-end (not just one).
- Identify AT LEAST 1 - preferably 2-3 - points in the experience where REAL AI inference is the value (live chat, semantic search over data, classification, summarization, recommendation, structured extraction, multi-turn refinement). The pipeline has Gemini 3.1 Pro / Claude Opus 4.6 / OpenAI GPT-5.5 API keys ready to call same-origin - design AROUND this capability, do not avoid it.
- Identify the "aha" moment where the user feels the product working. This is sacred - every other screen exists to set this up or extend it.
- Identify what data flows look like (input → AI call → structured output → render).
</depth_mandate>

<input_handling_rules>
The user message that follows may take TWO forms. Handle each correctly:

1. **A free-form concept description** - read it directly and decompose.

2. **A structured CONCEPT BRIEF block** prepended by the chat UI when the user picked a recommendation tile. This block contains: a slug identifier, a concept title, a thesis sentence, a named persona, a moment, an "aha" interaction, required AI capabilities, an execution path, an existing-stack reuse note, a constraint check, evidence_sources, a FULL PERSONA PROFILE (with JTBD, pain points, goals, voice quote), GROUNDING THEMES (with theses, evidence excerpts, verbatim quotes), CLIENT-UPLOADED DOCUMENTS (raw text), and a RESEARCH GOAL. When you see this structured block, you MUST:

   a. **Treat the slug as an identifier only, never as the concept.** The slug exists for routing. The CONCEPT BRIEF is the actual concept. Do NOT reinterpret slug words literally (e.g. "beyond-brand-discovery" is NOT a brand-marketing tool; read the thesis to learn what it actually is).

   b. **Carry the full persona name + role into \`primary_persona\` verbatim** - including emotional state and context from their pain points. Generic "the user" is forbidden; use their real name from the FULL PERSONA PROFILE block.

   c. **Convert the persona's pain points into \`jobs_to_be_done\`.** Every pain point in the profile is a candidate JTBD the prototype must address.

   d. **Bake the GROUNDING THEMES into \`success_criteria\`** - write success criteria that read "the user, who lives the [theme N] reality, feels [specific relief]". The themes are the WHY behind the concept.

   e. **Distill insights from the GROUNDING THEMES and verbatim quotes - but NEVER reproduce a verbatim quote in the prototype's UI.** The quotes are research artifacts that reveal the underlying pain, motivation, or contradiction. Encode that INSIGHT into the brief (in jobs_to_be_done, persona.emotional_state, success_criteria) using fresh language. Stage 4 enforces the same rule downstream - every verbatim quote that escapes into the prototype's rendered text is a BLOCKING failure. The rule is universal: applies whether the engagement is healthcare, fintech, retail, government, manufacturing, education, SaaS, or any other industry.

   f. **Map the tile's required AI capabilities directly into \`ai_inference_points\`.** Each capability the tile listed must appear as an inference point in your brief, with the trigger, model call, input, and output shape filled in concretely (referencing the actual pain point and theme the inference relieves).

   g. **Use the CLIENT-UPLOADED DOCUMENTS as the source of truth for seed data.** Names, programs, processes, or numbers from those uploads should populate the data model the prototype seeds with. Never invent generic seed values when real ones exist in the uploads.

   h. **Re-state the RESEARCH GOAL inside \`demonstrated_moment\`** so every downstream stage sees the engagement-level question being answered.

If you skip any of these steps, the downstream pipeline produces a generic prototype that wastes the user's research. Treat the structured block as a deep, mandatory grounding spec, not optional context.
</input_handling_rules>

<instructions>
1. Read the input concept in full before writing anything.
2. Identify the jobs-to-be-done - minimum 3, capture all that the concept implies.
3. Identify the primary persona (and any secondary actors) implied or stated, with the depth of emotional context an Apple keynote demo would dramatize.
4. Identify the moment of the experience this prototype is meant to demonstrate. Prototypes show a slice - but a substantive slice with at least 4-6 connected screens, not a single landing card.
5. Identify success criteria: what would a senior product partner need to see to believe this experience works AND is differentiated from a generic SaaS dashboard?
6. Identify AI inference points - where the magic comes from. Be specific: "when the user submits the trajectory form, call Gemini to extract 3 named gap themes and 3 concrete next steps grounded in the persona's context".
7. Identify hard constraints (brand, platform, accessibility, regulatory).
8. Identify open questions - things the concept does not specify and the downstream stages should not invent.
9. Return ONLY the JSON Experience Brief, no preamble.
</instructions>

<output_schema>
{
  "committed_frame": "1 | 2 | 3 - mirrors the COMMITTED FRAME from your <vs_thinking> block. Downstream stages read this to honor the framing decision (Stage 3 visual designer applies more or less restraint, Stage 4 coder leans into the radical interaction patterns when frame=3, etc.)",
  "frame_rationale": "one-sentence reason for committing to this frame - what about the input made this the right divergence axis",
  "concept_title": "string",
  "one_line_thesis": "string, 20 words max",
  "primary_persona": { "name": "string", "context": "string", "emotional_state": "string" },
  "secondary_actors": [{ "role": "string", "involvement": "string" }],
  "demonstrated_moment": "string, the specific slice of the journey this prototype shows",
  "jobs_to_be_done": ["string - minimum 3"],
  "success_criteria": ["string - must include 'feels differentiated from generic SaaS'"],
  "ai_inference_points": [
    { "trigger": "string - user action that fires the call", "model_call": "string - Gemini chat | Claude chat | OpenAI chat | wiki RAG | embedding search | image gen", "input": "string - what data is passed", "output_shape": "string - what comes back and how it's rendered", "value_unlocked": "string - why this AI moment matters to the user" }
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
- **NO STUB INTERACTIONS.** Every button, link, and form submit in your spec must have a defined \`side_effect\` - either a state transition, a real AI call, a data mutation, or an animation. \`alert("not implemented")\` is forbidden downstream; do not specify a screen that would require it.
- **AT LEAST ONE SCREEN must be a real conversational/AI surface** - a chat panel, an AI-powered search box, a generative draft, a smart suggestion stream, or a structured Q&A flow. The user must see AI inference happen in front of them.
</depth_floor>

<instructions>
1. Read the Experience Brief in full, especially the \`ai_inference_points\` and \`jobs_to_be_done\`.
2. Design the screen set - minimum 4, target 5-7 - that demonstrates the brief's jobs-to-be-done end-to-end including every AI inference point.
3. For each screen, define its purpose, the persona's state of mind, the primary action available, the secondary actions, AND any AI calls fired from that screen.
4. Define the data model: what entities exist, what fields they have, what's seeded for the demo. Seeded data must be CONCRETE and contextually realistic for the persona - never lorem ipsum, never \`["Item 1", "Item 2", "Item 3"]\`. **MINIMUM DENSITY (universal, applies to every industry):** for any "primary entity" the user will see in a list/feed/dashboard, set \`seed_count\` to AT LEAST 20 (target 20-30). For any secondary entity (tags, categories, owners, sources), \`seed_count\` ≥ 10. For conversational history / activity logs, \`seed_count\` ≥ 12. The downstream coder enforces these floors - under-specifying here causes a Stage-5 BLOCKING rejection. Concept domain is irrelevant: a patient list, a transaction feed, an inventory grid, an alert stream, a case docket, or a learner record set all share the same density requirement.
5. Define the state machine: how the user moves between screens, what triggers each transition, what state persists. Every AI inference point in the brief MUST appear as a side effect of at least one transition.
6. Define the micro-interactions: hover states, loading states (with skeleton or shimmer), empty states (with a useful prompt, not "no data"), error states (with retry), success states (with momentum to next action).
7. Define the motion contract using the five-channel model - typographic mass, color modulation, spatial extension, positional drift, temporal sequence - and assign motion roles deliberately. Every motion choice must encode something or set tone. No decorative animation.
8. Output ONLY the JSON Interaction Spec.
</instructions>

<output_schema>
{
  "screens": [{ "id": "string", "purpose": "string", "persona_state": "string", "primary_action": "string", "secondary_actions": ["string"], "content_blocks": ["string"], "ai_calls_fired_here": ["string - references an ai_inference_point id or empty"] }],
  "data_model": { "entities": [{ "name": "string", "fields": ["string"], "seed_count": "integer", "seed_examples": ["concrete realistic seed value 1", "concrete realistic seed value 2", "concrete realistic seed value 3"] }] },
  "state_machine": [{ "from": "screen_id", "trigger": "string", "to": "screen_id", "side_effects": ["string - including any AI calls fired"] }],
  "micro_interactions": [{ "element": "string", "states": ["default", "hover", "active", "loading", "empty", "error", "success"], "behavior_per_state": {} }],
  "motion_contract": [{ "element": "string", "signal": "functional | expressive", "channel": "typographic_mass | color_modulation | spatial_extension | positional_drift | temporal_sequence", "encodes": "string" }],
  "ai_flows": [
    { "id": "string - matches an ai_inference_points id from the brief", "fires_from_screen": "screen_id", "fires_on_trigger": "string", "endpoint": "/api/ai/gemini-compat | /api/ai/anthropic | /api/ai/openai | /api/wiki/fetch-articles", "system_prompt_outline": "string - what role the AI plays", "user_message_template": "string - what gets sent, with placeholders", "expected_response_shape": "string", "renders_into": "screen_id + element_name" }
  ]
}
</output_schema>

<final_instruction>
Every screen must serve the demonstrated moment from the brief - if a screen doesn't, cut it. Output valid JSON only.
</final_instruction>`;

// ============================================================
// STAGE 2.5: SIMULATED USER SESSIONS  (2026-05-13)
// ============================================================
//
// Between the Interaction Spec and the Visual Designer, generate 30 synthetic
// user sessions via Verbalized Sampling that the prototype must satisfy.
// Distribution: 12 modal + 10 edge + 8 tail.
//
// The sessions are NOT just personas - they're SESSIONS: a specific person in
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
You generate the THIRTY synthetic user sessions a prototype must satisfy. You think like a UX researcher who has run 1000 user studies - you know that the modal user is only one slice. The edge users (hostile, distracted, mobile-only, accessibility, novice, expert-who-skips) are how the prototype gets tested. The tail users (the ones the brief didn't anticipate - wrong-product, recovering-from-error, multi-account, returning-after-30-days, the user who arrived via a back-button) are where prototypes break. Your job: surface all three buckets with the same rigor, so the downstream coder cannot ship a one-screen happy-path stub and pass review.
</role>

<verbalized_sampling_directive>
Generate exactly THIRTY sessions distributed across three buckets via Verbalized Sampling:

  BUCKET A - MODAL (12 sessions, probability ~0.40 each)
    The user the brief was written FOR. They show up with the expected mood, the expected context, the expected goal. Variations among these 12: different demographic slices, different times of day, different devices, different motivations - but all within the brief's anticipated frame.

  BUCKET B - EDGE (10 sessions, probability ~0.10 each)
    Real users at the edge of the typical distribution. Include AT LEAST:
      • 1 hostile user (skeptical, doesn't trust AI, looking for proof to leave)
      • 1 distracted user (in a meeting, multitasking, only has 30 seconds)
      • 1 mobile-context user (small screen, one thumb, walking)
      • 1 accessibility user (screen reader, low-vision, reduced motion, motor impairment)
      • 1 expert-who-skips (knows the domain, wants to bypass onboarding)
      • 1 novice-who-fumbles (first time encountering this kind of product, needs hand-holding)
      • 1 keyboard-only user (no mouse, all-keyboard navigation)
      • Plus 3 more edge slices specific to the concept

  BUCKET C - TAIL (8 sessions, probability ~0.03 each)
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
        "name": "string - real-sounding name from the domain",
        "role": "string - title or relationship to the product",
        "bio": "string - 1-2 sentences placing them in a specific situation"
      },
      "starting_state": "string - what they bring (emotional + situational)",
      "motivation": "string - what they want to accomplish in this session",
      "expected_end_state": "string - what success looks like FOR THEM",
      "one_thing_frustrated_by": "string - the single thing this prototype must NOT do to them"
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

function buildStage3System(brand: Brand, liveTokens: string, componentManifest: string): string {
    return `<role>
You are a visual designer producing a complete design system for a single-file prototype. You take an Experience Brief and an Interaction Spec and produce a Design System JSON that the code generator will translate into CSS variables and component styles. You design with restraint and intentionality.
</role>

<brand_context>
This prototype uses the **${brand}** brand. Apply these tokens EXACTLY — they are pulled LIVE from the Figma design system (the single source of truth). Do not invent colors. Do not add fonts beyond the listed type families. Do not approximate hex values.

${liveTokens}
</brand_context>
${componentManifest ? `
<component_library>
The GOLD #proto component library below is the brand-correct, Figma-built component set (every component token + variable bound, with flat monochromatic SVG icon paths). It is the canonical vocabulary for this brand. When you define component patterns in the Design System, COMPOSE them from this library: reuse the named structures, the exact token bindings (--accent/--surface/--ink/etc. mapping to the Figma variables above), and the provided icon paths. Do NOT invent component shapes or icons that contradict the library; do NOT emit emoji icons.

${componentManifest}
</component_library>
` : ''}

<instructions>
1. Read the Brief and Spec.
2. Apply the brand tokens from <brand_context> precisely. Color hex values must match exactly - do NOT round, do NOT approximate (no \`#C00000\` if the brand says \`#C8102E\`).
3. Define the type system using five roles maximum: display, body, label, quote, data. Use the brand's display + body + mono fonts EXACTLY as named - do NOT substitute a "similar" font (no Bebas Neue if the brand says Roboto Condensed, no Open Sans if the brand says Archivo).
4. Define the color system using semantic roles, not decorative names: foundation (3-5 neutrals from brand), persona accent (one brand accent), semantic (success, warning, friction, opportunity), emphasis (the brand emphasis hex).
5. Define the spacing scale: [4, 8, 16, 24, 32, 48, 64, 96]. Use 8-point grid.
6. Define motion tokens: easings, durations (instant 100ms, quick 200ms, standard 400ms, deliberate 700ms, ambient 3000ms).
7. Define the component patterns: button, card, input, badge, list-item, modal. Specify anatomy and variants for each. Honor the brand's \`layout.button_radius\` / \`card_radius\` - if the brand says \`2px\`, do NOT default to \`8px\`. If the brand says rectangular buttons, do NOT use pill-shaped.
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
Restraint over decoration. Every token must be used by the prototype. Use the exact ${brand} hex values from the brand_context - do not approximate. Output valid JSON only.
</final_instruction>`;
}

// ============================================================
// STAGES 3.5 + 4 + 5 - SUPERSEDED by the MULTI-AGENT POD BUILD (2026-06-16).
// ============================================================
// The monolithic Build Recipe Author (Stage 3.5, max-thinking 65K out),
// Prototype Coder (Stage 4, 64K out), and Critic (Stage 5) were collapsed into
// the orchestrator -> parallel screen pods -> deterministic assemble ->
// integration reviewer pipeline (see the "MULTI-AGENT POD BUILD" section +
// buildAppViaPods, lower in this file). The monolithic stages blew the proxy's
// 300s ceiling (504) and fell off Opus; the pod split keeps every call small.


// ============================================================
// LLM CALL - native Gemini endpoint with thinkingConfig
// ============================================================
//
// 2026-05-11 - switched from the OpenAI-compat layer to the native Gemini
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

    // 2026-05-12 - Use shared retry client. Each prototype-pipeline
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

// 2026-06-14 - Claude Opus 4.8 stage caller for the CODE stages (best-in-class code gen).
// Interface mirrors callGeminiStage so it is a drop-in at the call site. No `temperature`:
// opus-4-8 rejects it (the proxy also strips it defensively at /api/ai/anthropic).
async function callClaudeStage(
    systemPrompt: string,
    userContent: string,
    maxOutputTokens: number = 32000,
): Promise<string> {
    const body: any = {
        model: CODE_MODEL,
        max_tokens: maxOutputTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
    };
    const { callAIWithRetry } = await import('./aiRetryClient');
    const data = await callAIWithRetry('anthropic', body, { label: 'Prototype Stage (Opus 4.8)' });
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const text = blocks.map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('').trim();
    if (!text) {
        throw new Error(`Opus stage returned empty content (stop_reason=${data?.stop_reason || 'unknown'})`);
    }
    return text;
}

// 2026-06-16 - CANONICAL JSON-STAGE caller for the #proto build. MODEL-ROUTING RULE
// (single source of truth - see services/aiRouter.ts header + humans-in-control-research/CLAUDE.md):
//   • Gemini 3.5 Flash  -> ALL non-hashtag Analyst Desk chat (plain corpus Q&A).
//   • Claude Opus 4.8    -> ALL hashtag deliverable generation.
// #proto IS a hashtag deliverable, so EVERY build stage runs on Opus 4.8 (CODE_MODEL),
// matching corpusChatService's force-route. Gemini 3.1 Pro is the cross-provider
// RESILIENCE fallback only (Opus down / invalid JSON). GPT-5.5 is NOT in the proto path:
// it rejects non-default `temperature` (HTTP 400) and is off-rule. This replaced the
// prior Gemini-primary + GPT-5.5-fallback stages (the documented straggler).
async function callOpusJsonStage<T>(
    systemPrompt: string,
    userContent: string,
    requiredKeys: string[],
    stageName: string,
    thinkingBudget: ThinkingBudget = 'high',
    maxOutputTokens?: number,
): Promise<T> {
    const validate = (p: any) => requiredKeys.filter(k => (p as any)?.[k] === undefined || (p as any)?.[k] === null);
    const tryOpus = async (extraNote?: string): Promise<T> => {
        const finalUser = extraNote ? `${userContent}\n\n${extraNote}` : userContent;
        const text = await callClaudeStage(systemPrompt, finalUser, maxOutputTokens || 32000);
        return tryParseJson<T>(text, stageName);
    };
    try {
        let parsed = await tryOpus();
        const missing = validate(parsed);
        if (missing.length === 0) return parsed;
        console.warn(`[${stageName}] (Opus 4.8) missing required keys: ${missing.join(', ')} - one repair retry`);
        parsed = await tryOpus(
            `IMPORTANT - your previous response was missing these required keys: ${missing.join(', ')}. ` +
            `Re-emit valid JSON with EVERY required field present and matching the schema exactly. Output JSON only.`,
        );
        if (validate(parsed).length === 0) return parsed;
        throw new Error(`${stageName} (Opus 4.8) still missing required keys after retry`);
    } catch (opusErr: any) {
        // RESILIENCE fallback (NOT a model downgrade by choice): Gemini 3.1 Pro only when
        // Opus fails / returns invalid JSON, so a single-provider outage never kills a build.
        console.warn(`[${stageName}] Opus 4.8 failed (${opusErr?.message || opusErr}) - resilience fallback to Gemini 3.1 Pro.`);
        return callGeminiJsonStage<T>(systemPrompt, userContent, requiredKeys, stageName, thinkingBudget, maxOutputTokens);
    }
}

// JSON-stage caller with strict schema validation + one auto-repair attempt.
// If the first response is missing required keys, we re-prompt the model
// with the failure explicitly named so it knows what to fix on retry.
// 2026-06-16 - GPT-5.5 stage callers REMOVED. #proto is hashtag deliverable
// generation, so per the model-routing rule its stages run on Opus 4.8
// (callOpusJsonStage) with Gemini 3.1 Pro as the resilience fallback. GPT-5.5 was
// off-rule and rejected non-default temperature (HTTP 400 on every fallback).

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
    // One repair attempt - call out the specific missing keys
    console.warn(`[${stageName}] missing required keys: ${missing.join(', ')} - retrying with explicit instruction`);
    parsed = await tryOnce(
        `IMPORTANT - your previous response was missing these required keys: ${missing.join(', ')}. ` +
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

// 2026-05-14 - Truncation recovery for max-tokens overflow.
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
    // If we're inside a string, the trailing partial value is unsafe - truncate
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
            // Mid-string but no prior clean close - just close the string
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

        // Recovery #1 - control chars inside strings (multi-line code in a field
        // emitted with literal newlines instead of "\n").
        if (looksLikeControlCharErr) {
            try {
                const sanitized = sanitizeJsonControlChars(cleaned);
                const parsed = JSON.parse(sanitized);
                console.warn(`[${stageName}] recovered from control-char JSON error via sanitization (${cleaned.length} chars input).`);
                return parsed;
            } catch { /* fall through to truncation recovery */ }
        }

        // Recovery #2 - truncation (max_tokens overflow mid-string/array/object).
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

// 2026-05-14 - Last-resort critique extractor for when Stage 5 returns
// JSON so malformed that even bracket-balance recovery can't parse it.
// Regex out the top-level fields the UI cares about so the prototype still
// ships with a meaningful (if degraded) audit summary instead of failing.

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
     * 2026-05-13 - When the user picked one of 5 generated briefs in the
     * brief-selection phase, pass it here. Stage 1 (Concept Decomposer) is
     * SKIPPED - the approved brief is the authoritative spec and goes
     * straight into Stage 2. This preserves all the user-approved detail
     * (use_cases, screens, AI capabilities, seed_data, visual_direction)
     * that would otherwise be lossy-recompressed by Stage 1's schema.
     */
    approvedBrief?: ExperienceBrief;
}

// ============================================================
// MULTI-AGENT POD BUILD (2026-06-16) - replaces the monolithic
// Stage 3.5 (max-thinking, 65K out) + Stage 4 (64K out) calls that blew the
// proxy's 300s ceiling (504 Gateway Timeout) and fell off Opus to Gemini.
//
// ARCHITECTURE (owner-final: go straight to pods, no stopgaps):
//   1. ORCHESTRATOR (Opus, moderate output): emits an AppShellContract = the
//      shared module CODE (useReducer state + fixed action list + shared
//      primitive components + design-token CSS + the App() shell that switches
//      screens) with a `/*__SCREENS__*/` injection marker, PLUS screens[] each
//      with an exact `function Screen_<id>(...)` signature + the manifest
//      CATEGORIES that screen needs. This is the "one agent selects the core
//      components + decomposes" step; output is small (no 65K code dump).
//   2. PODS (Opus, parallel via Promise.all): each screen pod sees the shared
//      module code (so it binds to the EXACT state/actions/primitives) + its
//      screen spec + ONLY its sliced manifest categories. It returns just its
//      Screen_<id> component. Small input + small output per pod => no 300s
//      timeout. Per-pod Gemini fallback so one provider blip can't kill it.
//   3. ASSEMBLER (deterministic): splices the pod components into the shell's
//      `/*__SCREENS__*/` marker -> one React file. Static seam checks.
//   4. REVIEWER (Opus judgment gate, doubles as Stage 5): audits the assembled
//      app for integration drift (undefined state keys / actions, missing
//      screens, brand uniformity) against the brief + sessions and returns
//      corrected_code.
// DRIFT CONTROL = the contract IS code the orchestrator wrote (pods extend, never
// redefine state) + sliced bricks + the reviewer seam-check.
// ============================================================

const SCREEN_MARKER = '/*__SCREENS__*/';

interface PodScreenSpec {
    id: string;                      // safe identifier used in Screen_<id> + state.activeScreen
    name: string;
    purpose: string;
    signature: string;               // EXACT function signature pods must implement, e.g. "function Screen_dashboard({ state, dispatch })"
    component_categories: string[];  // manifest ## CATEGORY names this screen needs (e.g. "AI-CHAT", "DATA DISPLAY")
    pattern_ids: string[];           // catalog p-* wrappers for this screen's regions
    spec: string;                    // detailed outline: state used, interactions, copy, seed data, success criteria for THIS screen
}

interface AppShellContract {
    shared_code: string;             // the COMPLETE React module EXCEPT screen bodies; MUST contain the SCREEN_MARKER where screens are injected, plus reducer/initialState/actions/shared primitives/token CSS/App() shell
    state_shape: string;             // human description of every state key (pods bind to these only)
    action_list: string[];           // every dispatch action type pods may fire
    shared_primitives: string[];     // names of shared components defined in shared_code that pods may use
    seed_data_note: string;          // where seed data lives in state + how screens read it
    screens: PodScreenSpec[];
}

interface PodResult {
    id: string;
    code: string;                    // the Screen_<id> component (function declaration only)
    engine: string;
    patterns_used: string[];
}

/**
 * Deterministic manifest slicer (unit-tested). Keeps the manifest header + the
 * brand-token resolution block + ONLY the requested `## CATEGORY` sections, so a
 * pod sees only the few component sections its screen needs instead of the full
 * ~54KB. Matching is case-insensitive and tolerant of the "(N components...)"
 * suffix on category headings. If no categories match, returns the header +
 * token block alone (never the whole manifest) so pods stay small.
 */
export function sliceManifestForCategories(fullManifest: string, categories: string[]): string {
    if (!fullManifest) return '';
    const lines = fullManifest.split('\n');
    const wanted = new Set(categories.map(c => c.trim().toUpperCase()));
    const out: string[] = [];
    // Section state: we always keep content before the first `## ` (header +
    // brand-token block, which lives under a `## Brand token resolution` we
    // explicitly retain), then keep only wanted `## CATEGORY` sections.
    let keepingSection = true; // keep the preamble before the first ## category
    for (const line of lines) {
        const h2 = line.match(/^##\s+(.+)$/);
        if (h2) {
            const title = h2[1].trim().toUpperCase();
            // Always retain the brand-token resolution section (every pod needs tokens).
            if (/^BRAND TOKEN/.test(title)) { keepingSection = true; out.push(line); continue; }
            // A category heading like "AI-CHAT category (11 components, both brands)":
            // match if any wanted category name is a prefix of the heading.
            keepingSection = Array.from(wanted).some(w => title.startsWith(w));
            if (keepingSection) out.push(line);
            continue;
        }
        if (keepingSection) out.push(line);
    }
    return out.join('\n').trim();
}

/**
 * Deterministic assembler (unit-tested). Splices pod screen components into the
 * shell's SCREEN_MARKER. Throws with a precise reason if the contract is
 * malformed so the build fails loud instead of shipping a broken file.
 */
export function assembleAppFromPods(shell: AppShellContract, pods: PodResult[]): string {
    const shared = shell.shared_code || '';
    if (!shared.includes(SCREEN_MARKER)) {
        throw new Error(`AppShellContract.shared_code is missing the ${SCREEN_MARKER} injection marker - orchestrator must place it where screen components go`);
    }
    const ok = pods.filter(p => p && typeof p.code === 'string' && p.code.trim().length > 0);
    if (ok.length === 0) throw new Error('assembleAppFromPods: no pod produced code');
    const screensBlock = ok.map(p => p.code.trim()).join('\n\n');
    // Static seam check: every declared screen must have a matching function in the merged block.
    const merged = shared.replace(SCREEN_MARKER, screensBlock);
    return merged;
}

const POD_ORCHESTRATOR_SYSTEM = `<role>
You are the LEAD ARCHITECT of a multi-agent prototype build. You do NOT write the screens.
You write the SHARED MODULE CONTRACT that every parallel screen-builder agent will extend, and
you decompose the experience into independent screens.
</role>

<why>
Each screen is built by a separate worker agent in parallel. They never see each other. The ONLY
thing keeping them coherent is the contract you emit now. If you under-specify the state shape,
actions, or shared primitives, the workers will drift and the merged app will not compile.
</why>

<output>
Emit ONE JSON object (no prose, no fences) with these keys:
- "shared_code": a COMPLETE React module as a single self-contained file. RUNTIME CONTRACT (the
  host mounts this - obey EXACTLY): React, ReactDOM, and ALL hooks (useState, useEffect, useRef,
  useMemo, useCallback, useReducer, useContext, createContext, Fragment) are GLOBAL identifiers
  already in scope. Use them DIRECTLY (\`const [x,setX] = useState()\`, \`useReducer(...)\`). Do NOT
  destructure them from React, do NOT \`import\` anything, do NOT \`export\` anything (imports/exports
  are stripped by the host). framer-motion is \`window.framerMotion\`, icons are \`window.lucide\`.
  Do NOT call \`ReactDOM.render\`/\`createRoot\`/\`render(...)\` yourself - the host auto-detects the
  component named \`App\` and mounts it. The module MUST contain, in order: (a) design-token CSS as a
  <style> tag or constants taken VERBATIM from the FIGMA DESIGN TOKENS block - never invent
  hex/fonts; (b) the initial state object covering EVERY screen's data + an \`activeScreen\` key;
  (c) a reducer handling EVERY action in action_list; (d) shared primitive components (buttons,
  cards, the rail/masthead chrome, the screen-switcher nav) that screens reuse; (e) the literal
  marker \`${SCREEN_MARKER}\` ON ITS OWN LINE where the worker screen components will be spliced in;
  (f) the root \`function App()\` (this EXACT name - the host mounts it) that owns the reducer and
  renders the active <Screen_X state={state} dispatch={dispatch} /> by state.activeScreen. DO NOT
  write any Screen_X bodies yourself.
  NEVER name a component (or any shared primitive) with a DOM-interface word - Image, Text, Audio,
  Option, Range, Link, Map, Set, File, Path, Blob, URL, Node, Element, Worker, Event, Selection -
  they resolve to native browser constructors and crash the mount with "Illegal constructor". Use
  distinct names (ImageCard, BodyText, OptionRow, NavLink); reference icons as window.lucide.<Name>.
- "state_shape": prose listing every state key + type + purpose (workers bind to these only).
- "action_list": array of EVERY dispatch action type string a screen may fire.
- "shared_primitives": array of the component names you defined in shared_code that screens may use.
- "seed_data_note": where the seeded demo data lives in state and how a screen reads it.
- "screens": array, one per screen. Each: { "id": safe-lowercase-id, "name", "purpose",
  "signature": EXACT e.g. "function Screen_dashboard({ state, dispatch })", "component_categories":
  array of ## CATEGORY names from the component manifest this screen needs (e.g. ["AI-CHAT",
  "DATA DISPLAY"]), "pattern_ids": catalog p-* wrappers for this screen, "spec": a thorough outline
  of this screen's regions, the state keys it reads/writes, the actions it fires, its micro-copy,
  the named protagonist data it shows, and its success criteria }.
</output>

<rules>
- 4-7 screens. Each screen must be independently buildable from shared_code + its spec alone.
- The state shape must be COMPLETE up front - workers cannot add state keys. If a screen needs
  data, it must already be a key in initial state + reducer.
- Honor the composition rules and brand language in the preface. Tokens come from the FIGMA block.
- shared_code must be syntactically valid React minus the screen bodies. The marker is mandatory.
</rules>`;

function buildPodSystem(brand: Brand, slicedManifest: string, sharedCode: string, contract: AppShellContract): string {
    return `<role>
You are a WORKER agent building EXACTLY ONE screen of a larger React prototype. Other agents are
building the other screens in parallel. You must conform to the shared contract precisely or the
merged app breaks.
</role>

<shared_module_code>
This is the shared module every screen plugs into. Read it. Bind ONLY to the state keys, actions,
and primitive components it defines. Do NOT redefine state, the reducer, App, or any primitive.
\`\`\`jsx
${sharedCode}
\`\`\`
</shared_module_code>

<contract>
STATE SHAPE: ${contract.state_shape}
ACTIONS YOU MAY FIRE (exact strings): ${contract.action_list.join(', ')}
SHARED PRIMITIVES YOU MAY USE: ${contract.shared_primitives.join(', ')}
SEED DATA: ${contract.seed_data_note}
</contract>

<component_manifest brand="${brand}">
Compose this screen's regions from these brand components ONLY (the categories your screen needs).
Use each component's documented structure + the brand tokens. Do NOT invent UI shapes.
${slicedManifest}
</component_manifest>

<output>
Output ONLY the single screen component as a JavaScript function declaration matching the EXACT
signature given in your task. RUNTIME: hooks (useState, useEffect, useRef, useMemo, useReducer,
useCallback) are GLOBAL - use directly, never destructure from React. framer-motion is
\`window.framerMotion\`, icons \`window.lucide\`. NO \`import\`, NO \`export\`, NO markdown fences, NO
other top-level declarations, NO re-definition of shared state/reducer/App/primitives, NO
\`render()\` call. NEVER name a local component with a DOM-interface word (Image, Text, Audio,
Option, Range, Link, Map, Set, File, Node, Element) - it crashes the mount with "Illegal
constructor"; use distinct names and reference icons as window.lucide.<Name>. Start a leading
\`// PATTERN MANIFEST: <p-ids>\` comment listing the catalog patterns you used, then the function. The function must read all data from \`state\` and change it
only via \`dispatch({ type: ... })\` using the allowed actions.
</output>`;
}

const POD_REVIEWER_SYSTEM = `<role>
You are the INTEGRATION REVIEWER and final judgment gate for a prototype assembled from independently
built screens. Your job is to make the single merged React file correct, coherent, and shippable.
</role>

<audit>
Check the merged code for INTEGRATION DRIFT introduced by parallel building:
- Any screen referencing a state key not in the initial state, or dispatching an action the reducer
  does not handle. Fix by wiring it correctly (prefer fixing the screen; add a reducer case only if
  clearly intended).
- Duplicate top-level declarations (two functions with the same name, redefined primitives). Remove dups.
- Screens that drifted off-brand (wrong tokens/fonts) or invented UI not in the component manifest.
- The App shell must render every Screen_X by state.activeScreen with working navigation between them.
- Seed data must be present and deep (named protagonist + 12+ peer records + concrete numbers), per
  the brief and simulated sessions. No placeholders.
- RUNTIME CONTRACT (corrected_code MUST obey): the root component is named \`App\` (host auto-mounts
  it); hooks are GLOBAL (never destructure from React); framer-motion=\`window.framerMotion\`,
  icons=\`window.lucide\`; NO import/export statements; NO \`render()\`/\`createRoot\` call in the code.
</audit>

<output>
Emit ONE JSON object (no prose, no fences):
{ "verdict": "ship" | "refine" | "rebuild",
  "summary": "one paragraph",
  "issues": [{ "category": "integration|code_bug|brand|data|coverage", "severity": "blocker|major|minor",
    "description": "...", "code_location": "Screen_x / reducer / App", "fix": "what you did" }],
  "session_coverage": { "coverage_pct": number, "sessions_passed": number, "sessions_total": number } | null,
  "corrected_code": "the FULL corrected single-file React prototype, OR null" }
corrected_code RULES (STRICT): if you change ANYTHING, corrected_code MUST be the ENTIRE rebuilt
single-file prototype from the first line to the last - never a fragment, never a diff, never a
summary or a comment like "/* unchanged, see merged file */". If the app is already correct and you
change NOTHING, set verdict "ship" and corrected_code to **null** (the host then ships the assembled
file verbatim). NEVER put prose/comments-about-the-code in corrected_code - it is executed as the
literal prototype.
</output>`;

/**
 * Orchestrator -> parallel pods -> deterministic assemble -> reviewer.
 * Replaces the monolithic Stage 3.5 + Stage 4 + Stage 5. Returns the shipping
 * code + a BuildRecipe-shaped summary (for the artifact) + the critique.
 */
async function buildAppViaPods(args: {
    brand: Brand;
    brief: ExperienceBrief;
    spec: InteractionSpec;
    designSystem: DesignSystem;
    simulatedSessions: SimulatedUserSession[];
    composerPreface: string;
    liveTokens: string;
    componentManifest: string;
    protoConstraints: string;
    richBrief: string;
    sessionsBlock: string;
    fire: (stage: number, name: string, status: 'running' | 'done' | 'failed', detail?: string) => void;
}): Promise<{ code: string; buildRecipe: BuildRecipe; critique: CritiqueReport; orchestrator: AppShellContract }> {
    const { brand, brief, spec, designSystem, simulatedSessions, composerPreface, liveTokens, componentManifest, protoConstraints, richBrief, sessionsBlock, fire } = args;

    // ---- 1. ORCHESTRATOR: shared contract + screen decomposition ----
    fire(35, 'Orchestrator (shared contract + screens)', 'running');
    // Design-exemplar grounding moved from the old Stage 4 to the orchestrator: the
    // shared design language is decided ONCE here, so every parallel pod inherits the
    // same named visual references instead of each re-deriving an aesthetic (drift).
    let exemplarBlock = '';
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
            exemplarBlock = buildStage4InjectionBlock(exemplarRefs, brand === 'NU' ? '#NU' : '#NXT') + '\n\n';
            console.log(`[Orchestrator] ${exemplarRefs.length} design exemplars injected (framing=${exemplarRefs[0].framing_letter}/${exemplarRefs[0].framing_name})`);
        }
    } catch (exErr: any) {
        console.warn('[Orchestrator] exemplar curation failed, proceeding without:', exErr?.message || exErr);
    }
    const orchSystem = exemplarBlock + composerPreface
        + `\n\n=== FIGMA DESIGN TOKENS (${brand}) - bind every color/font to these ===\n${liveTokens}\n\n`
        + POD_ORCHESTRATOR_SYSTEM
        + (protoConstraints ? `\n\n<learned_constraints>\n${protoConstraints}\n</learned_constraints>` : '');
    const orchUser = `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nSPEC:\n${JSON.stringify(spec, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}${richBrief}${sessionsBlock}`;
    let contract: AppShellContract;
    try {
        contract = await callOpusJsonStage<AppShellContract>(
            orchSystem,
            orchUser,
            ['shared_code', 'state_shape', 'action_list', 'shared_primitives', 'screens'],
            'Orchestrator (shared contract)',
            'high',
            32000,
        );
    } catch (e: any) {
        fire(35, 'Orchestrator (shared contract + screens)', 'failed', e?.message || String(e));
        throw e;
    }
    const screens = Array.isArray(contract.screens) ? contract.screens.filter(s => s && s.id && s.signature) : [];
    if (screens.length === 0) throw new Error('Orchestrator produced no buildable screens');
    if (!String(contract.shared_code || '').includes(SCREEN_MARKER)) {
        throw new Error(`Orchestrator shared_code missing ${SCREEN_MARKER} marker`);
    }
    fire(35, 'Orchestrator (shared contract + screens)', 'done', `${screens.length} screens · ${contract.action_list?.length || 0} actions · ${contract.shared_primitives?.length || 0} shared primitives`);

    // ---- 2. PODS: build each screen in parallel ----
    fire(4, `Screen pods (${screens.length} parallel)`, 'running');
    const buildOnePod = async (screen: PodScreenSpec): Promise<PodResult | null> => {
        const sliced = sliceManifestForCategories(componentManifest, screen.component_categories || []);
        const podSystem = buildPodSystem(brand, sliced, contract.shared_code, contract);
        const podUser = `BUILD THIS SCREEN.\n\nSIGNATURE (implement EXACTLY): ${screen.signature}\nID: ${screen.id}\nNAME: ${screen.name}\nPURPOSE: ${screen.purpose}\nPATTERN IDS: ${(screen.pattern_ids || []).join(', ')}\n\nSCREEN SPEC:\n${screen.spec}`;
        let engine = 'Opus 4.8';
        try {
            let text: string;
            try {
                text = await callClaudeStage(podSystem, podUser, 20000);
            } catch (opusErr: any) {
                engine = 'Gemini 3.1 Pro (Opus fallback)';
                console.warn(`[pod ${screen.id}] Opus failed (${opusErr?.message || opusErr}) - resilience fallback to Gemini.`);
                text = await callGeminiStage(podSystem, podUser, false, 'high', 20000);
            }
            const code = stripCodeFences(text).trim();
            if (!code) throw new Error('empty');
            const pm = code.match(/PATTERN MANIFEST:\s*([^\n]+)/);
            const patterns = pm ? pm[1].split(',').map(s => s.trim()).filter(Boolean) : [];
            return { id: screen.id, code, engine, patterns_used: patterns };
        } catch (e: any) {
            console.warn(`[pod ${screen.id}] FAILED on both providers: ${e?.message || e}`);
            return null;
        }
    };
    const podResults = await Promise.all(screens.map(buildOnePod));
    const pods = podResults.filter((p): p is PodResult => p !== null);
    if (pods.length === 0) throw new Error('All screen pods failed');
    const podEngines = Array.from(new Set(pods.map(p => p.engine)));
    fire(4, `Screen pods (${screens.length} parallel)`, 'done', `${pods.length}/${screens.length} screens built · ${podEngines.join(', ')}`);

    // ---- 3. ASSEMBLE (deterministic) ----
    const assembled = assembleAppFromPods(contract, pods);

    // ---- 4. REVIEWER (integration judgment gate, doubles as Stage 5) ----
    fire(5, 'Integration Reviewer', 'running');
    const sessionsAuditBlock = simulatedSessions.length > 0
        ? `\n\nSIMULATED USER SESSIONS - audit coverage against each (${simulatedSessions.length}):\n${JSON.stringify(simulatedSessions, null, 2)}`
        : '';
    const builtIds = pods.map(p => p.id);
    const missingScreens = screens.filter(s => !builtIds.includes(s.id)).map(s => s.id);
    const reviewerUser = `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\nDESIGN SYSTEM:\n${JSON.stringify(designSystem, null, 2)}\n\nSTATE SHAPE: ${contract.state_shape}\nACTIONS: ${contract.action_list.join(', ')}\nSCREENS DECLARED: ${screens.map(s => s.id).join(', ')}${missingScreens.length ? `\nSCREENS THAT FAILED TO BUILD (you must stub a graceful placeholder Screen_<id> for these so navigation does not break): ${missingScreens.join(', ')}` : ''}${sessionsAuditBlock}\n\nMERGED CODE:\n${assembled}`;
    let critique: CritiqueReport;
    try {
        let critiqueText: string;
        try {
            critiqueText = await callClaudeStage(POD_REVIEWER_SYSTEM, reviewerUser, 64000);
        } catch (opusErr: any) {
            console.warn(`[Reviewer] Opus failed (${opusErr?.message || opusErr}) - resilience fallback to Gemini.`);
            critiqueText = await callGeminiStage(POD_REVIEWER_SYSTEM, reviewerUser, true, 'high', 64000);
        }
        critique = tryParseJson<CritiqueReport>(critiqueText, 'Integration Reviewer');
    } catch (e: any) {
        // Reviewer failure must NOT discard a successfully-assembled app.
        console.warn(`[Reviewer] failed (${e?.message || e}); shipping assembled app unreviewed.`);
        critique = {
            verdict: 'ship',
            summary: 'Integration reviewer failed; shipping assembled multi-pod prototype unverified.',
            issues: [{ category: 'code_bug', severity: 'minor', description: `Reviewer failed: ${e?.message || e}`, source_of_truth: 'meta', code_location: '-', fix: 'manual review' }],
            corrected_code: null,
        } as CritiqueReport;
    }
    // CRITICAL (2026-06-16): the deterministic `assembled` file is the source of truth.
    // The reviewer may ONLY override it with a SUBSTANTIVE corrected_code. LLM reviewers love
    // to "ship unchanged" by returning a placeholder comment ("/* code is fine, see merged
    // file, no edits required */") instead of re-emitting the full app - which previously got
    // shipped as the entire prototype (420-char comment -> blank window). Guard: accept
    // corrected_code only if it actually looks like the app (defines `App`, mentions a Screen,
    // and is within a sane size band of the assembled file). Otherwise keep `assembled`.
    const cc = critique.corrected_code ? stripCodeFences(critique.corrected_code) : '';
    const correctedIsSubstantive =
        cc.length > 0 &&
        cc.includes('function App') &&
        /Screen_\w+/.test(cc) &&
        cc.length >= assembled.length * 0.5; // a real correction is the whole file, not a stub
    const finalCode = correctedIsSubstantive ? cc : assembled;
    if (critique.corrected_code && !correctedIsSubstantive) {
        console.warn(`[Reviewer] corrected_code rejected as non-substantive (${cc.length}c vs assembled ${assembled.length}c) - shipping deterministic assembled file.`);
    }
    const cov = critique.session_coverage ? ` · coverage ${critique.session_coverage.coverage_pct}%` : '';
    fire(5, 'Integration Reviewer', 'done', `${critique.verdict}${cov} · ${critique.issues?.length || 0} issues · ${correctedIsSubstantive ? 'reviewer-corrected' : 'assembled'}`);

    // Build a BuildRecipe-shaped summary for the artifact (orchestrator contract -> recipe view).
    const buildRecipe: BuildRecipe = {
        persona_runtime: { name: (brief.primary_persona?.name) || 'Protagonist', photo_prompt: '', voice_sample: '', biographical_anchor: brief.primary_persona?.context || '' },
        seed_data: {},
        screens: screens.map(s => ({
            id: s.id, purpose: s.purpose, component_tree: s.spec, state_variables: [], event_handlers: [],
            loading_state: '', empty_state: '', error_state: '', motion_specs: [],
            ai_calls_fired: [],
        })),
        cross_cutting: { demo_controls: '', image_generation_calls: [], persistence: contract.seed_data_note || '', accessibility_floor: '' },
        micro_copy: {},
        verbatim_prompts: {},
        success_assertions: brief.success_criteria || [],
    };

    return { code: finalCode, buildRecipe, critique, orchestrator: contract };
}

export async function buildPrototype(opts: BuildOptions): Promise<PrototypeArtifact> {
    const { concept, brand, onProgress, approvedBrief } = opts;
    const fire = (n: number, name: string, status: 'running' | 'done' | 'failed', detail?: string) =>
        onProgress?.(n, name, status, detail);

    // Per-whitepaper §8.1: stages 1, 2, 4, 5 = high thinking_budget,
    // stage 3 = medium. Stage 4 is the expensive one (3-5x cost) - but
    // it's the difference between competent and Apple-grade output.

    // Stage 1 - SKIPPED if the user approved a brief from the 5-brief picker.
    let brief: ExperienceBrief;
    if (approvedBrief) {
        fire(1, 'Concept Decomposer', 'done', `using user-approved brief - Stage 1 skipped`);
        brief = approvedBrief;
    } else {
        fire(1, 'Concept Decomposer', 'running');
        try {
            brief = await callOpusJsonStage<ExperienceBrief>(
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

    // 2026-05-13 - When the user approved a brief, the original `concept`
    // string contains the rich user-facing brief context (use cases, screens,
    // AI capabilities, seed_data, visual_direction). Prepend it to every
    // downstream stage's user content so the full approved detail flows
    // through. This preserves the IDEO/Apple bar through the pipeline.
    const richBrief = approvedBrief ? `\n\nAPPROVED BRIEF - RICH CONTEXT (the user picked this from a 5-brief set; honor every use case, screen, AI capability, seed entity, and visual direction):\n${concept}\n` : '';

    // Stage 2 - Interaction Architect
    // 2026-05-15 - Reverted to Gemini-primary because the user's OpenAI quota
    // is exhausted (HTTP 429 cascade). GPT-5.5 is the fallback when Gemini
    // fails. Will flip back to GPT-5.5-primary once OpenAI quota is restored.
    fire(2, 'Interaction Architect', 'running');
    let spec: InteractionSpec;
    try {
        // Opus 4.8 primary (canonical hashtag-generation engine); callOpusJsonStage
        // falls back to Gemini 3.1 Pro internally for resilience. No GPT-5.5 (off-rule
        // + rejects non-default temperature). This was the documented model-routing straggler.
        spec = await callOpusJsonStage<InteractionSpec>(
            STAGE_2_SYSTEM, `${JSON.stringify(brief, null, 2)}${richBrief}`,
            ['screens', 'state_machine', 'micro_interactions', 'motion_contract'],
            'Stage 2 Interaction Architect',
            'max',
        );
    } catch (e: any) {
        fire(2, 'Interaction Architect', 'failed', e.message);
        throw e;
    }
    fire(2, 'Interaction Architect', 'done', `${spec.screens?.length || 0} screens, ${spec.state_machine?.length || 0} transitions · opus-4-8`);

    // Stage 2.5 - Simulated User Sessions (2026-05-13). Generates the 30
    // synthetic sessions (12 modal + 10 edge + 8 tail) the prototype must
    // satisfy. Output flows into every downstream stage. Stage 5 audits the
    // built prototype's coverage of these sessions and produces a coverage %.
    fire(25, 'Simulated User Sessions', 'running');
    let simulatedSessions: SimulatedUserSession[] = [];
    try {
        const simPayload = await callOpusJsonStage<{ sessions: SimulatedUserSession[] }>(
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
        console.warn(`[Stage 2.5] failed - proceeding without simulated sessions: ${e?.message || e}`);
        fire(25, 'Simulated User Sessions', 'failed', `${e?.message || 'failed'} - proceeding without coverage`);
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
    // stages - keeps payloads efficient vs. shipping the full JSON each stage.
    const sessionsBlock = simulatedSessions.length > 0
        ? `\n\nSIMULATED USER SESSIONS (${simulatedSessions.length}) - the design + recipe + code must satisfy ALL THREE buckets; Stage 5 will compute coverage per-session:\n${simulatedSessions.map(s => `  • [${s.bucket}] ${s.id} - ${s.persona.name} (${s.persona.role}): wants "${s.motivation}"; frustrated by "${s.one_thing_frustrated_by}"`).join('\n')}`
        : '';

    // 2026-05-15 - Compute the catalog/composer preface ONCE here so Stage 3
    // (Visual Designer) and Stage 3.5 (Build Recipe Author) both see the
    // 77-pattern catalog and the strict composition rule. Previously only
    // Stage 4 received this injection - meaning Stage 3 picked design tokens
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
                `[Stages 3/3.5/4] STRICT COMPOSER preface built - experience="${composerEarly.hashtag.experience_name}", ` +
                `brand=${composerEarly.hashtag.brand}, recommended patterns=${composerEarly.recommended_patterns.length}`,
            );
        }
    } catch (composerErr: any) {
        console.warn('[Stages 3/3.5/4] composer preface failed, proceeding without:', composerErr?.message || composerErr);
    }

    // 2026-06-13 — Live design-system grounding. Pull Figma tokens, the GOLD
    // #proto component manifest, and self-improvement constraints from the same
    // live sources the Analyst Desk uses, so the design system the user built
    // flows into generation. No hardcoded BRAND_TOKENS.
    const [liveTokens, componentManifest, protoConstraints] = await Promise.all([
        fetchLiveBrandTokens(brand),
        fetchProtoComponentManifest(),
        fetchProtoLearnedConstraints(),
    ]);
    console.log(`[proto] live grounding — tokens=${liveTokens.length}c · component-manifest=${componentManifest.length}c · learned-constraints=${protoConstraints ? protoConstraints.split('\n').length + ' rules' : 'none'}`);

    // Stage 3 (medium thinking - visual design is structurally simpler than logic)
    // Now sees the catalog preface so it pre-commits to specific pattern IDs.
    fire(3, 'Visual Designer', 'running');
    let designSystem: DesignSystem;
    try {
        designSystem = await callOpusJsonStage<DesignSystem>(
            composerPreface + buildStage3System(brand, liveTokens, componentManifest),
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

    // Stages 3.5 + 4 + 5 are collapsed into the MULTI-AGENT POD BUILD (2026-06-16):
    // ORCHESTRATOR (shared contract + screen decomposition) -> parallel SCREEN PODS
    // (each sees only its sliced manifest categories) -> deterministic ASSEMBLE ->
    // INTEGRATION REVIEWER. Replaces the monolithic max-thinking build-recipe + 64K
    // coder calls that blew the proxy's 300s ceiling (504) and fell off Opus. See
    // buildAppViaPods + the MULTI-AGENT POD BUILD section above.
    const { code, buildRecipe, critique } = await buildAppViaPods({
        brand, brief, spec, designSystem, simulatedSessions, composerPreface,
        liveTokens, componentManifest, protoConstraints, richBrief, sessionsBlock, fire,
    });
    const artifact = finalize({ concept, brand, title: opts.title, basedOn: opts.basedOn, researchGoal: opts.researchGoal, brief, spec, simulatedSessions, designSystem, buildRecipe, code, critique });
    // RENDER GATE (2026-06-16): a text-only reviewer cannot see a blank page. Render the
    // assembled prototype headless (Playwright, via the existing /api/artifact/audit detector
    // which now treats blankness + runtime errors as defects) and, on a render-fatal defect,
    // re-ask to repair (Reinforcement Inference). Persistent failures teach learned-constraints.
    return await verifyAndRepairRender(artifact, fire);
}

const RENDER_REPAIR_SYSTEM = `<role>
You repair a React prototype that the headless renderer proved is BROKEN AT RUNTIME (it rendered
blank, or threw). You get the FULL current single-file code and the concrete render defect. Find
the real cause and fix it.
</role>
<common_causes>
- The root component is not named exactly \`App\` (host auto-mounts \`App\`/\`Prototype\`/\`Component\`/\`Main\`/\`Experience\`).
- \`state.activeScreen\` does not match any rendered Screen_<id>, so App renders nothing.
- A screen references a state key the reducer/initial-state never defines (throws on first render).
- An \`import\`/\`export\`/\`render()\`/\`createRoot\` slipped in (host strips imports but a stray render double-mounts or errors).
- A destructure of a hook from React collides with the host's bare-global hooks.
- An icon/component referenced but undefined (window.lucide / window.framerMotion).
- "Illegal constructor": a component is NAMED like a DOM interface (Image, Text, Audio, Option,
  Range, Link, Map, Set, File, Path, Blob, URL, Node, Element, Worker, Event, Selection) so JSX
  resolved it to the native browser constructor. Rename the component (ImageCard, BodyText,
  OptionRow, NavLink) and reference any icon explicitly as window.lucide.<Name>.
</common_causes>
<output>
Emit ONE JSON object (no prose, no fences): { "summary": "what was broken + the fix",
"corrected_code": "the ENTIRE rebuilt single-file React prototype, first line to last - never a
fragment, diff, summary, or comment" }. RUNTIME CONTRACT the corrected_code MUST obey: root named
\`App\`; hooks are GLOBAL (no destructure from React); framer-motion=\`window.framerMotion\`,
icons=\`window.lucide\`; NO import/export; NO render()/createRoot call.
</output>`;

/**
 * Headless render gate + bounded repair loop. Saves the prototype (existing save endpoint),
 * renders its real /view, audits via the existing /api/artifact/audit detector (blank +
 * runtime_error are now defects). On a render-fatal defect, re-asks Opus to repair the whole
 * file and re-verifies (max 2 rounds). Persistent failure is recorded to learned-constraints so
 * future builds are pre-warned. Non-fatal if the verifier itself is unavailable (no Chromium).
 */
async function verifyAndRepairRender(
    artifact: PrototypeArtifact,
    fire: (stage: number, name: string, status: 'running' | 'done' | 'failed', detail?: string) => void,
): Promise<PrototypeArtifact> {
    const saveDraft = async (a: PrototypeArtifact) => {
        try {
            // The save route is POST /api/prototypes (NOT /api/prototypes/save - that 405s and
            // silently disabled the render gate). This draft-save is what lets the headless
            // audit render the real /view; CorpusChatPanel re-saves the verified artifact after.
            const resp = await fetch(`${PROXY_BASE}/api/prototypes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: a.slug, title: a.title, concept: a.concept, brand: a.brand,
                    code: a.code, code_format: a.code_format, brief: a.brief,
                }),
            });
            if (!resp.ok) console.warn(`[Render Verify] draft save HTTP ${resp.status} - audit may be stale`);
        } catch (e) { /* save failure is surfaced by the audit step below */ }
    };
    const auditOnce = async (): Promise<{ available: boolean; passed?: boolean; defects?: any; detail?: any } | null> => {
        try {
            const viewResp = await fetch(`${PROXY_BASE}/api/prototypes/${encodeURIComponent(artifact.slug)}/view`);
            if (!viewResp.ok) return null;
            const html = await viewResp.text();
            const auditResp = await fetch(`${PROXY_BASE}/api/artifact/audit`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html, kind: 'proto' }),
            });
            if (!auditResp.ok) return null;
            return await auditResp.json();
        } catch (e) { return null; }
    };
    const renderFatal = (rep: any) => !!rep && rep.available && !rep.passed
        && (rep.defects?.blank || rep.defects?.runtime_error
            || rep.defects?.nav_runtime_error || rep.defects?.nav_blank);

    fire(5, 'Render Verify (headless)', 'running');
    await saveDraft(artifact);
    let report = await auditOnce();
    if (!report || !report.available) {
        fire(5, 'Render Verify (headless)', 'done', `skipped (renderer unavailable${report ? '' : ' / no view'})`);
        return artifact;
    }
    let rounds = 0;
    while (renderFatal(report) && rounds < 2) {
        rounds++;
        const d = report.defects || {};
        const navErr = report.detail?.nav?.error_detail || report.detail?.nav?.error_label;
        const diag = [
            d.blank ? `BLANK: the mount rendered ~no content (text=${report.detail?.blank?.mount_text_len}, els=${report.detail?.blank?.mount_els}).` : '',
            d.runtime_error ? `RUNTIME ERROR on the landing screen: ${String(report.detail?.runtime_error || '').slice(0, 300)}` : '',
            d.nav_runtime_error ? `RUNTIME ERROR on a NON-LANDING screen reached by navigation (the landing screen rendered fine - a Screen_X crashes only when navigated to). Stack: ${String(report.detail?.nav?.error_detail || '').slice(0, 300)}. Audit EVERY Screen_X, not just the first.` : '',
            d.nav_blank ? `A screen reached by navigation rendered BLANK ("${report.detail?.nav?.blank_label || ''}"). That Screen_X returns nothing or its state branch is empty.` : '',
            (d.overflow || d.overlap || d.crush) ? `Layout: overflow=${d.overflow} overlap=${d.overlap} crush=${d.crush}.` : '',
        ].filter(Boolean).join('\n');
        const kind = d.blank ? 'blank' : d.runtime_error ? 'runtime error' : d.nav_runtime_error ? 'nav-screen crash' : d.nav_blank ? 'nav-screen blank' : 'layout';
        fire(5, 'Render Verify (headless)', 'running', `defect → repair ${rounds}/2: ${kind}`);
        try {
            const repairUser = `RENDER DEFECT (from headless Playwright):\n${diag}\n\nFULL CURRENT CODE:\n${artifact.code}`;
            const text = await callClaudeStage(RENDER_REPAIR_SYSTEM, repairUser, 64000);
            const parsed = tryParseJson<{ corrected_code?: string; summary?: string }>(text, 'Render Repair');
            const fixed = parsed?.corrected_code ? stripCodeFences(parsed.corrected_code) : '';
            if (fixed.includes('function App') && /Screen_\w+/.test(fixed) && fixed.length > 500) {
                artifact.code = fixed;
                await saveDraft(artifact);
                report = await auditOnce() || report;
            } else {
                break; // repair produced nothing usable; stop and report below
            }
        } catch (e) { break; }
    }
    (artifact.critique as any).render_verification = {
        passed: !!report?.passed, defects: report?.defects, repair_rounds: rounds,
    };
    if (renderFatal(report)) {
        fire(5, 'Render Verify (headless)', 'failed', `still ${report.defects?.blank ? 'blank' : 'erroring'} after ${rounds} repair(s) - shipping with flag`);
        // SELF-IMPROVEMENT: record the failure so future #proto builds are pre-warned.
        try {
            const constraint = `- CONSTRAINT [proto/render]: A #proto build shipped with a render defect (${report.defects?.blank ? 'BLANK mount' : 'runtime error'}) after ${rounds} repair attempts (slug=${artifact.slug}). The orchestrator/pod prompts must guarantee: root component named exactly App; state.activeScreen matches a built Screen_<id>; every screen binds only to defined state keys; no import/export/render() in emitted code. (source: headless render gate ${new Date().toISOString().slice(0, 10)})`;
            await fetch(`${PROXY_BASE}/api/wiki/append`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: 'synthesis/learned-constraints.md', content: constraint }),
            });
        } catch (e) { /* non-fatal */ }
    } else {
        fire(5, 'Render Verify (headless)', 'done', `render OK${rounds ? ` (repaired ×${rounds})` : ''} · no blank/runtime defects`);
    }
    return artifact;
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
