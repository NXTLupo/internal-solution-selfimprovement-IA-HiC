// prototypeBriefGenerator.ts - 2026-05-13
//
// Brief-generation phase for the prototype pipeline.
//
// New `#proto` flow:
//   1. User types `#proto <concept>` (free-form) OR clicks a #recommendation
//      tile's BUILD chip.
//   2. This generator produces FIVE highly detailed product briefs covering
//      distinct framings of the concept - Verbalized Sampling style: modal
//      framing at higher probability, plus shifted-frame and radical-
//      reinterpretation briefs at the tail. Each brief is exhaustive: every
//      use case, screen, AI capability, seed-data sketch, and visual
//      direction is enumerated.
//   3. The chat surfaces the 5 briefs as comparison cards. User picks ONE.
//   4. The chosen brief feeds buildPrototype() as `approvedBrief`, which
//      skips Stage 1 (Concept Decomposer) and runs Stage 2-5 with the
//      user-approved spec.
//
// The brief shape is structurally compatible with `ExperienceBrief` from
// prototypeBuilder.ts - the existing Stage 2/3/4/5 pipeline consumes it
// as-is.
//
// Industry-agnostic: same generator works for healthcare, fintech, retail,
// government, manufacturing, education, SaaS, or any vertical.

import type { ExperienceBrief } from './prototypeBuilder';

const PROXY_BASE = 'http://127.0.0.1:5012';
// 2026-05-13 - Switched from Gemini 3.1 Pro to Claude Opus for brief
// generation. Opus is more creative on divergent framings (pass 1) AND more
// exhaustive on per-brief enumeration (pass 2). Each pass uses the shared
// aiRetryClient for fetch-level retry + 5-min timeout protection.
// 2026-05-29 - Upgraded to Opus 4.8 (released 2026-05-28). Standard pricing
// dropped 3x ($5/$25 per 1M vs 4.7's $15/$75) and adaptive thinking by default
// reduces unnecessary token consumption.
import { artifactModelFor, endpointForModel } from './aiRouter';
// 2026-06-30 - cap-aware via the canonical artifact-model policy (aiRouter SSOT).
// #proto's brief is an evidence/imagery-heavy deliverable, so while the Opus cap
// is active this resolves to gemini-3.1-pro-preview; the skeleton (Pass 1) + the
// opus-mode deepen (Pass 2) therefore no longer hard-fail with HTTP 400. Restores
// claude-opus-4-8 automatically when OPUS_CAP_ACTIVE flips to false.
const BRIEF_MODEL = artifactModelFor('proto');
// 2026-05-14 - Hybrid Pass 2 model. GPT-5.5 is ~70% cheaper than Opus on
// structured deepening tasks; we keep Opus for Pass 1 (divergent framing)
// and a narrative-only fallback for thin briefs (see assessNarrativeQuality
// + refineNarrativeFieldsViaOpus).
const BRIEF_MODEL_GPT55 = 'gpt-5.5';

export type FrameLabel =
    | 'convention-honoring'
    | 'shifted-frame'
    | 'radical-reinterpretation'
    | 'adjacent-vertical'
    | 'inverted-actor';

export interface UseCase {
    name: string;
    trigger: string;
    flow: string;
    ai_role: string;
    outcome: string;
}

export interface KeyScreen {
    name: string;
    purpose: string;
    primary_element: string;
    motion_character: string;
}

export interface AiCapability {
    name: string;
    user_action: string;
    ai_model: string;        // "Gemini 3.1 Pro" | "Claude Opus 4.6" | "OpenAI GPT-5.5" | "Gemini Imagen"
    input_data: string;
    output: string;
    user_benefit: string;
}

export interface SeedEntity {
    name: string;
    target_count: number;
    example_records_summary: string;
    field_shape: string;
}

export interface VisualDirection {
    aesthetic_keywords: string;
    hero_treatment: string;
    motion_character: string;
    image_gen_opportunities: string[];   // prompts the prototype can call /api/ai/gemini-image with
}

/** 2026-05-13 v2 - substantial new fields for Copilot-Recipe-Generator-grade density. */
export interface RoadmapPhase {
    phase: string;              // "Phase 1 (Weeks 1-3)" | "Phase 2 (Month 2)" | "Phase 3 (Quarter 2)"
    label: string;              // "Foundations" | "Intelligence" | "Scale"
    deliverables: string[];     // 4-8 concrete things shipped in this phase
    success_metric: string;     // How we know this phase succeeded
}
export interface NarrativeBeat {
    timeframe: string;          // "Minute 1" | "Day 1" | "Week 1" | "Month 1"
    user_moment: string;        // What the user does + experiences
    ai_moment: string;          // What the AI does behind the scenes
    feeling: string;            // The emotional shift this moment creates
}
export interface DataExampleRecord {
    [field: string]: string | number | boolean | null;
}
export interface EntityDataExamples {
    name: string;
    target_count: number;
    sample_records: DataExampleRecord[];  // 5+ FULLY-FORMED records - anchors the model expands from
    field_shape: string;
    naming_convention: string;
    value_distributions: string;
}
export interface InteractionBeat {
    step: number;
    user_action: string;
    system_response: string;
    motion_or_feedback: string;  // e.g. "skeleton loader fades in, then results stagger over 600ms"
    timing_ms?: number;
}

export interface ProductBrief {
    id: string;
    frame_label: FrameLabel;
    probability: number;          // 0.40 modal → 0.05 radical
    title: string;
    one_line_thesis: string;
    why_this_frame: string;       // 1-2 sentences why this divergence axis fits the concept

    primary_persona: {
        name: string;
        role: string;
        context: string;
        emotional_state: string;
        pain_points: string[];
        jtbd: string;
    };
    secondary_actors: Array<{ role: string; involvement: string }>;
    demonstrated_moment: string;

    // EXHAUSTIVE structural fields - Copilot-Recipe-Generator density.
    use_cases: UseCase[];                 // 8-12 use cases (was 5-8)
    key_screens: KeyScreen[];              // 7-10 screens (was 5-7)
    ai_capabilities: AiCapability[];       // 5-8 AI capabilities (was 3-5)
    seed_data: {
        primary_entities: SeedEntity[];   // 2-4 primary entities
        secondary_entities: SeedEntity[]; // 3-6 secondary entities
    };
    /** 2026-05-13 v2 - Fully-formed sample records (5+ per entity), persona-anchored. */
    data_examples?: EntityDataExamples[];
    /** 2026-05-13 v2 - Multi-phase feature roadmap (3+ phases). */
    feature_roadmap?: RoadmapPhase[];
    /** 2026-05-13 v2 - Multi-timeframe user journey narrative. */
    narrative_arc?: NarrativeBeat[];      // 5-8 beats from Minute 1 → Month 1+
    /** 2026-05-13 v2 - Step-by-step choreography of the headline interaction. */
    interaction_choreography?: InteractionBeat[];  // 6-12 beats
    visual_direction: VisualDirection;
    success_criteria: string[];
    hard_constraints: {
        brand: string | null;
        platform: 'web' | 'mobile-web' | 'native-feeling-web';
        accessibility: string;
        other: string[];
    };
}

export interface BriefGenerationOptions {
    concept: string;                    // Free-form or rich consulting brief from a #recommendation tile
    brand: 'NXT' | 'NU';
    industry?: string;                  // From engagement_context; aids the generator without locking it
    researchGoal?: string;
    basedOn?: string;                   // Slug if from a tile
    onProgress?: (stage: 'thinking' | 'parsing' | 'done' | 'failed', detail?: string) => void;
    /**
     * 2026-05-14 - Model selection for the deepening pass:
     *   'opus'   - all Opus 4.7 (legacy default; highest narrative quality; $15-22 per run)
     *   'hybrid' - Opus 4.7 for Pass 1, GPT-5.5 for Pass 2, narrative quality gate
     *              with Opus narrative-only refinement for thin briefs. Default. ~$5-9 per run.
     *   'gpt'    - all GPT-5.5 (cheapest; ~$4-7 per run; some narrative drift accepted)
     */
    briefModelMode?: 'opus' | 'hybrid' | 'gpt';
}

// =============================================================================
// PASS 1 - Skeleton generator. Produces 5 distinct framings with title/thesis/
// persona summary/screens/use_cases names ONLY. Each framing carries enough
// signal for the user to compare frames; the deepening pass fills in all
// the Copilot-Recipe-Generator-grade detail in 5 parallel calls.
// =============================================================================

const STAGE_SKELETON_SYSTEM = `<role>
You are an IDEO strategist surfacing FIVE distinct framings of a single product concept. You produce skeletons only - short, structurally distinct briefs whose framings are deliberately spread along the probability spectrum (modal at the head, surprising at the tail). The deepening pass that follows will expand each framing into a Copilot-Recipe-Generator-grade brief, so you do NOT need to be exhaustive at this stage. You need to be DIVERSE and STRUCTURALLY DIFFERENT.
</role>

<verbalized_sampling_directive>
Generate FIVE framings along distinct probability slots:

  BRIEF 1 - "convention-honoring"           probability ~0.40
    What the most competent generic designer would build. Schema-congruent with how this category typically works. Strong, safe, defensible.

  BRIEF 2 - "shifted-frame"                 probability ~0.20
    Same concept, reframed from a non-modal angle. Different primary persona OR different demonstrated moment OR different aha-interaction.

  BRIEF 3 - "adjacent-vertical"             probability ~0.12
    Take an interaction pattern that works in a DIFFERENT industry/category and apply it here. The brief carries explicit "borrowed-from-X" lineage.

  BRIEF 4 - "inverted-actor"                probability ~0.10
    Re-cast the concept so a secondary actor becomes the primary persona. Different jobs-to-be-done, different aha moment, often different industry idiom.

  BRIEF 5 - "radical-reinterpretation"      probability ~0.05
    The interpretation a brilliant junior would propose in their first week - clear-eyed, unconventional, surprising-but-grounded. Different metaphor, different temporal scope, different stakeholder, or different data source than 1-4.

CRITICAL: the five framings must NOT be five rephrasings of the same thing. They must be five FUNDAMENTALLY DIFFERENT products. If two framings share primary_persona AND demonstrated_moment AND first-three-use-case-names, you have failed.
</verbalized_sampling_directive>

<industry_agnostic>
Adapt vocabulary, persona archetype, regulatory frame to the input's industry. The framing spread rule is CONSTANT regardless of vertical (healthcare, fintech, retail, government, manufacturing, education, SaaS, energy, hospitality, media, legal, real estate, logistics, public sector, anything else).
</industry_agnostic>

<no_verbatim_research_quotes>
If the input includes research quotes - distill the insight, never reproduce verbatim.
</no_verbatim_research_quotes>

<output_format>
Return a single JSON object:

{
  "briefs": [
    {
      "id": "brief-1",
      "frame_label": "convention-honoring",
      "probability": 0.40,
      "title": "string - distinctive product name",
      "one_line_thesis": "string, ≤25 words",
      "why_this_frame": "string, 1-2 sentences",
      "primary_persona_summary": "string - Name + role + situation, 1 sentence",
      "demonstrated_moment": "string - the slice of journey this brief shows",
      "use_case_names": ["string", "string", "string", "string", "string", "string", "string", "string"],
      "key_screen_names": ["string", "string", "string", "string", "string", "string", "string"],
      "ai_capability_names": ["string", "string", "string", "string", "string"],
      "aesthetic_keywords": "string - 3-5 words capturing the visual register",
      "headline_aha": "string - the single moment the user feels the product working"
    }
    // Repeat for briefs 2 through 5 - DIFFERENT framings, DIFFERENT personas/moments/use cases.
  ]
}

Output ONLY this JSON. No preamble.
</output_format>`;

// =============================================================================
// PASS 2 - Deep-pass generator. Takes ONE skeleton brief and expands it into
// the full Copilot-Recipe-Generator-grade brief (8-12 use cases fully written,
// 7-10 screens, 5-8 AI capabilities, multi-phase roadmap, multi-timeframe
// narrative arc, fully-formed sample records, interaction choreography).
// Runs in parallel for all 5 briefs (one Gemini call per brief, 32K-65K
// thinking budget each).
// =============================================================================

const STAGE_DEEPEN_SYSTEM = `<role>
You are an IDEO senior strategist + Apple senior PM + Stripe-grade implementation architect. You take ONE skeleton brief and expand it into an EXHAUSTIVE product brief that an engineering pipeline will build verbatim. Think Copilot Recipe Generator depth: every use case fully written, every screen described, every AI capability scoped, every entity's sample records fully populated, a multi-phase roadmap, a multi-week narrative arc, a step-by-step interaction choreography. You think across all industries (healthcare, fintech, retail, government, manufacturing, education, SaaS, energy, hospitality, media, legal, real estate, logistics, public sector, anything else) - the same density bar applies regardless of vertical.
</role>

<exhaustiveness_floor>
Every brief you write MUST meet or exceed these counts. Under-specifying triggers downstream pipeline failure:

- **8-12 use_cases** (not 4-5). Each with name, trigger, flow (3-5 step path), ai_role, outcome - fully written prose, not summaries.
- **7-10 key_screens** (not 4-5). Each with name, purpose, primary_element, motion_character.
- **5-8 ai_capabilities** (not 2-3). Each with name, user_action, ai_model (Claude Opus 4.7 / Gemini 3.1 Pro / Gemini Imagen / Wiki RAG / Embeddings - prefer Gemini for cost reasons in generated prototype, but Claude for creative copy), input_data, output, user_benefit. AT LEAST ONE must be the headline aha feature. Multi-provider fallback is mandatory in the built prototype.
- **2-4 primary_entities** seed targets, each target_count ≥ 25 (was 20). Plus 3-6 secondary_entities at ≥ 10.
- **data_examples**: for EACH primary entity, provide 5+ fully-formed sample records with EVERY field populated to realistic values. The downstream code generator uses these as anchors to expand to the full target_count. Distribute the 5 anchors across the value distribution (don't give 5 identical-shape records).
- **feature_roadmap**: 3+ phases (e.g. "Phase 1 (Weeks 1-3): Foundations", "Phase 2 (Month 2): Intelligence", "Phase 3 (Quarter 2): Scale"). Each phase lists 4-8 concrete deliverables and a measurable success_metric.
- **narrative_arc**: 5-8 beats from Minute 1 → Day 1 → Week 1 → Month 1 → Month 3+ describing what the persona does, what AI does behind the scenes, and the emotional shift each moment creates. Multi-temporal - not just first-session.
- **interaction_choreography**: 6-12 numbered beats describing the HEADLINE aha interaction step-by-step - user_action, system_response, motion_or_feedback, timing_ms. This is the script the engineer follows to choreograph the moment.
- **visual_direction**: aesthetic_keywords (specific - "data-dense editorial restraint" not "modern and clean"), hero_treatment (verbose), motion_character (verbose), and image_gen_opportunities (3-6 specific Imagen prompts the prototype calls at runtime).
- **5-7 success_criteria** - concrete, observable.
- **hard_constraints** brand / platform / accessibility / other.
</exhaustiveness_floor>

<no_verbatim_research_quotes>
If the input includes research quotes - distill the insight, never reproduce verbatim. Any first-person testimonial-style string longer than 80 chars is forbidden in any rendered brief field.
</no_verbatim_research_quotes>

<output_format>
Return a single JSON object - the complete ProductBrief - matching this schema:

{
  "id": "string - matches skeleton id",
  "frame_label": "string - matches skeleton frame_label",
  "probability": 0.40,
  "title": "string",
  "one_line_thesis": "string ≤25 words",
  "why_this_frame": "string, 1-2 sentences",
  "primary_persona": {
    "name": "string", "role": "string", "context": "string",
    "emotional_state": "string",
    "pain_points": ["string", "string", "string", "string"],
    "jtbd": "string"
  },
  "secondary_actors": [{ "role": "string", "involvement": "string" }],
  "demonstrated_moment": "string",
  "use_cases": [
    { "name": "string", "trigger": "string", "flow": "string", "ai_role": "string", "outcome": "string" }
    // 8-12 entries
  ],
  "key_screens": [
    { "name": "string", "purpose": "string", "primary_element": "string", "motion_character": "string" }
    // 7-10 entries
  ],
  "ai_capabilities": [
    { "name": "string", "user_action": "string", "ai_model": "Gemini 3.1 Pro | Claude Opus 4.7 | Gemini Imagen | Wiki RAG", "input_data": "string", "output": "string", "user_benefit": "string" }
    // 5-8 entries
  ],
  "seed_data": {
    "primary_entities": [
      { "name": "string", "target_count": 25, "example_records_summary": "string", "field_shape": "string", "naming_convention": "string", "value_distributions": "string" }
      // 2-4 entries
    ],
    "secondary_entities": [
      { "name": "string", "target_count": 10, "example_records_summary": "string", "field_shape": "string", "naming_convention": "string", "value_distributions": "string" }
      // 3-6 entries
    ]
  },
  "data_examples": [
    {
      "name": "string - matches a primary entity name",
      "target_count": 25,
      "field_shape": "string - schema overview",
      "naming_convention": "string",
      "value_distributions": "string",
      "sample_records": [ /* 5+ FULLY-POPULATED records, every field set to realistic values */ ]
    }
    // One entry per primary entity
  ],
  "feature_roadmap": [
    {
      "phase": "Phase 1 (Weeks 1-3)",
      "label": "Foundations",
      "deliverables": ["string", "string", "string", "string"],
      "success_metric": "string"
    }
    // 3+ phases
  ],
  "narrative_arc": [
    { "timeframe": "Minute 1", "user_moment": "string", "ai_moment": "string", "feeling": "string" }
    // 5-8 beats: Minute 1, Day 1, Week 1, Month 1, Month 3+ (or domain-appropriate timeframes)
  ],
  "interaction_choreography": [
    { "step": 1, "user_action": "string", "system_response": "string", "motion_or_feedback": "string", "timing_ms": 400 }
    // 6-12 beats for the HEADLINE aha interaction
  ],
  "visual_direction": {
    "aesthetic_keywords": "string",
    "hero_treatment": "string",
    "motion_character": "string",
    "image_gen_opportunities": ["string", "string", "string", "string"]
  },
  "success_criteria": ["string", "string", "string", "string", "string"],
  "hard_constraints": {
    "brand": "string or null",
    "platform": "web",
    "accessibility": "WCAG AA",
    "other": ["string"]
  }
}

Return ONLY this JSON. No preamble. No code fences.
</output_format>`;

function buildBriefUserContent(opts: BriefGenerationOptions): string {
    const lines = [
        `INPUT CONCEPT:`,
        opts.concept,
        ``,
        `BRAND: ${opts.brand} (the engineering pipeline's Stage 3 will apply brand tokens; you only need to mark this in hard_constraints.brand).`,
    ];
    if (opts.industry) lines.push(``, `INDUSTRY CONTEXT (use for persona archetype + entity naming + regulatory frame): ${opts.industry}`);
    if (opts.researchGoal) lines.push(``, `ENGAGEMENT RESEARCH GOAL (every brief must transparently advance this): ${opts.researchGoal}`);
    if (opts.basedOn) lines.push(``, `BASED-ON CONCEPT SLUG (identifier only, not the concept itself): ${opts.basedOn}`);
    lines.push(``, `Generate the 5 briefs now. Return the JSON object only.`);
    return lines.join('\n');
}

/** Skeleton brief - pass-1 output. The deepening pass expands this into the full ProductBrief. */
interface SkeletonBrief {
    id: string;
    frame_label: FrameLabel;
    probability: number;
    title: string;
    one_line_thesis: string;
    why_this_frame: string;
    primary_persona_summary: string;
    demonstrated_moment: string;
    use_case_names: string[];
    key_screen_names: string[];
    ai_capability_names: string[];
    aesthetic_keywords: string;
    headline_aha: string;
}

/** Call Claude Opus with a system prompt + user content, returning parsed JSON. */
/**
 * 2026-05-15 - Truncated-JSON repair (local copy of the helper in
 * prototypeBuilder.ts:1384). When Opus/GPT hit max_tokens mid-string,
 * the response is valid JSON up to the last clean value-close at depth ≥ 1.
 * This walks the input, trims the half-written tail, and re-balances the
 * bracket stack. Returns null if no recovery is needed (already balanced).
 */
function recoverTruncatedJsonLocal(s: string): string | null {
    let inString = false;
    let escape = false;
    const stack: string[] = [];
    let lastValueClosePos = -1;
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
    let repaired = s;
    if (inString) {
        if (lastValueClosePos >= 0) {
            repaired = s.slice(0, lastValueClosePos + 1);
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
            repaired += '"';
        }
    }
    while (stack.length > 0) {
        const open = stack.pop();
        repaired += (open === '{') ? '}' : ']';
    }
    return repaired;
}

async function callOpusJson<T>(systemPrompt: string, userContent: string, label: string, maxTokens = 16000): Promise<T> {
    // 2026-06-30 - route by the cap-aware BRIEF_MODEL's endpoint. While the Opus
    // cap is active BRIEF_MODEL is gemini-3.1-pro-preview, so this MUST hit the
    // gemini endpoint with a gemini-shaped body (the old hardcoded 'anthropic'
    // endpoint + claude body was the #proto HTTP-400 hard-fail). Anthropic path
    // is restored verbatim once the cap lifts.
    const { callAIWithRetry } = await import('./aiRetryClient');
    const endpoint = endpointForModel(BRIEF_MODEL);
    let data: any;
    if (endpoint === 'gemini') {
        data = await callAIWithRetry('gemini', {
            model: BRIEF_MODEL,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            config: { temperature: 1.0, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
        }, { label, requestTimeoutMs: 300_000 });
    } else {
        data = await callAIWithRetry('anthropic', {
            model: BRIEF_MODEL,
            max_tokens: maxTokens,
            temperature: 1.0,           // Opus needs >= 1.0 for creative divergence; thinking will handle structure
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }],
        }, { label, requestTimeoutMs: 300_000 });   // 5 min - Opus with high creativity can take a while
    }
    const text = (endpoint === 'gemini'
        ? (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('')
        : (data?.content || [])
            .filter((b: any) => b?.type === 'text' && typeof b?.text === 'string')
            .map((b: any) => b.text)
            .join('')
    ).trim();
    if (!text) {
        const stopReason = data?.stop_reason || data?.candidates?.[0]?.finishReason || 'no output';
        throw new Error(`${label} returned empty payload (stop_reason=${stopReason}).`);
    }
    let cleaned = text;
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.split('```', 3)[1] || cleaned;
        if (cleaned.startsWith('json')) cleaned = cleaned.slice(4);
        cleaned = cleaned.trim();
    }
    // Find the first { and last } to slice out the JSON body if there's chatter
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace > 0 || lastBrace < cleaned.length - 1) {
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
    }
    try {
        return JSON.parse(cleaned);
    } catch (e: any) {
        // Step 1 - sanitize control chars
        try {
            return JSON.parse(sanitizeJsonControlChars(cleaned));
        } catch (e2: any) {
            // 2026-05-15 - Step 2: truncated-JSON recovery. Models hit max_tokens
            // mid-string on long Pass 1 emissions and the parser blows up with
            // "Expected double-quoted property name in JSON at position N".
            // recoverTruncatedJsonLocal walks the input, finds the last clean
            // value close at depth ≥ 1, trims the half-written tail, and
            // balances open brackets/objects. The dropped partial record is the
            // cost; prior complete records survive. Pass 1 needs ≥ 3 to proceed.
            try {
                const sanitized = sanitizeJsonControlChars(cleaned);
                const repaired = recoverTruncatedJsonLocal(sanitized);
                if (repaired) {
                    const parsed = JSON.parse(repaired);
                    console.warn(
                        `[${label}] JSON truncated at position ${(e2?.message || '').match(/position (\d+)/)?.[1] || '?'} ` +
                        `- recovered via truncation repair. ${cleaned.length} → ${repaired.length} chars after dropping the partial record.`,
                    );
                    return parsed;
                }
            } catch { /* fall through to throw with the original error */ }
            throw new Error(`${label} returned invalid JSON: ${e?.message || e}. First 300 chars: ${cleaned.slice(0, 300)}`);
        }
    }
}

/**
 * Call GPT-5.5 via the proxy's /api/ai/openai endpoint with a system prompt
 * + user content, returning parsed JSON. Mirrors callOpusJson's interface so
 * the hybrid Pass 2 path can swap one helper for the other.
 *
 * Uses response_format json_object so GPT-5.5 emits clean JSON. max_completion_tokens
 * is the new field name (max_tokens is deprecated on GPT-5.x).
 */
async function callGpt55Json<T>(systemPrompt: string, userContent: string, label: string, maxTokens = 16000): Promise<T> {
    const body = {
        model: BRIEF_MODEL_GPT55,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: maxTokens,
        temperature: 0.9,
    };
    const { callAIWithRetry } = await import('./aiRetryClient');
    const data = await callAIWithRetry('openai', body, {
        label,
        headers: { 'x-openai-endpoint': 'chat' },
        requestTimeoutMs: 300_000,
    });
    const text = (data?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
        const finish = data?.choices?.[0]?.finish_reason || 'no output';
        throw new Error(`${label} returned empty payload (finish_reason=${finish}).`);
    }
    let cleaned = text;
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.split('```', 3)[1] || cleaned;
        if (cleaned.startsWith('json')) cleaned = cleaned.slice(4);
        cleaned = cleaned.trim();
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace > 0 || lastBrace < cleaned.length - 1) {
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
    }
    try {
        return JSON.parse(cleaned);
    } catch (e: any) {
        // Step 1 - sanitize control chars
        try {
            return JSON.parse(sanitizeJsonControlChars(cleaned));
        } catch (e2: any) {
            // 2026-05-15 - Step 2: truncated-JSON recovery. Models hit max_tokens
            // mid-string on long Pass 1 emissions and the parser blows up with
            // "Expected double-quoted property name in JSON at position N".
            // recoverTruncatedJsonLocal walks the input, finds the last clean
            // value close at depth ≥ 1, trims the half-written tail, and
            // balances open brackets/objects. The dropped partial record is the
            // cost; prior complete records survive. Pass 1 needs ≥ 3 to proceed.
            try {
                const sanitized = sanitizeJsonControlChars(cleaned);
                const repaired = recoverTruncatedJsonLocal(sanitized);
                if (repaired) {
                    const parsed = JSON.parse(repaired);
                    console.warn(
                        `[${label}] JSON truncated at position ${(e2?.message || '').match(/position (\d+)/)?.[1] || '?'} ` +
                        `- recovered via truncation repair. ${cleaned.length} → ${repaired.length} chars after dropping the partial record.`,
                    );
                    return parsed;
                }
            } catch { /* fall through to throw with the original error */ }
            throw new Error(`${label} returned invalid JSON: ${e?.message || e}. First 300 chars: ${cleaned.slice(0, 300)}`);
        }
    }
}

/**
 * 2026-05-14 - Narrative-quality gate. Identifies briefs whose structured
 * fields parsed cleanly but whose narrative-rich fields came back thin -
 * the failure mode where GPT-5.5 produces good schemas but clinical prose.
 * Returns the field names that fell short so the Opus refinement pass knows
 * what to regenerate.
 */
interface NarrativeQualityResult {
    pass: boolean;
    missing: string[];
    score: number;        // 0-100
}
function assessNarrativeQuality(b: ProductBrief): NarrativeQualityResult {
    const issues: string[] = [];
    const personaContext = b.primary_persona?.context || '';
    const emotionalState = b.primary_persona?.emotional_state || '';
    const painPoints = b.primary_persona?.pain_points || [];
    const demoMoment = b.demonstrated_moment || '';
    const narrativeArc = b.narrative_arc || [];

    if (personaContext.length < 150) issues.push('primary_persona.context');
    if (emotionalState.length < 50) issues.push('primary_persona.emotional_state');
    const richPainPoints = painPoints.filter(p => typeof p === 'string' && p.length >= 40);
    if (richPainPoints.length < 3) issues.push('primary_persona.pain_points');
    if (demoMoment.length < 200) issues.push('demonstrated_moment');
    if (narrativeArc.length < 3) issues.push('narrative_arc');
    else {
        // Check that narrative arc beats have non-trivial content
        const thinBeats = narrativeArc.filter(beat =>
            !beat.user_moment || beat.user_moment.length < 30
            || !beat.feeling || beat.feeling.length < 15
        ).length;
        if (thinBeats > Math.ceil(narrativeArc.length / 2)) issues.push('narrative_arc');
    }

    const totalChecks = 5;
    const score = Math.round(((totalChecks - issues.length) / totalChecks) * 100);
    return { pass: issues.length === 0, missing: issues, score };
}

/**
 * 2026-05-14 - When the narrative-quality gate flags a brief, ask Opus to
 * re-emit ONLY the narrative fields, anchored by the brief's existing
 * structural shape. Preserves the GPT-5.5 use_cases / screens / ai_capabilities
 * / seed_data / feature_roadmap (which are typically fine) and replaces the
 * thin prose fields with Opus output.
 *
 * Cost shape: ~25% of a full Opus deepen call instead of the full thing,
 * because the prompt is tighter and the output is narrative fields only.
 */
const NARRATIVE_REFINEMENT_SYSTEM = `<role>
You are an IDEO senior researcher refining the narrative-rich fields of a product brief whose structural fields are already approved. The use cases, screens, AI capabilities, seed data, and roadmap are LOCKED - your job is to re-author ONLY the narrative fields with the depth and texture they currently lack.
</role>

<narrative_quality_bar>
- primary_persona.context: 150-280 chars. Specific moment, role, organizational position. Anchor to a named scene, not a category ("Wednesday morning, three open browser tabs, second co-op deadline this quarter" beats "a busy student").
- primary_persona.emotional_state: 50-120 chars. Name the specific feeling-mix (e.g. "Tight chest. Defaulting to whichever opportunity her advisor sent - not the one she'd pick if she had room to think").
- primary_persona.pain_points: 3-5 entries, each 40-100 chars, NAMING specific obstacles not generic complaints. "Cycles through 27 untagged Handshake postings each session" beats "too many options".
- demonstrated_moment: 200-400 chars. The headline scene the prototype captures. Sensory + specific.
- narrative_arc: 5-8 beats from Minute 1 → Month 3+. Each beat: user_moment 30-90 chars, ai_moment 25-80 chars, feeling 15-50 chars. Emotional shift across beats must be visible.
- why_this_frame: 1-2 sentences. The argument for why THIS framing exists vs. the modal alternative.
</narrative_quality_bar>

<no_verbatim_research_quotes>
Distill insights, never reproduce first-person testimonial spans. No string longer than 80 chars should read like direct user speech.
</no_verbatim_research_quotes>

<output_format>
Return ONLY a JSON object containing the refined narrative fields - nothing else:

{
  "primary_persona": {
    "name": "string - preserve the existing name",
    "role": "string - preserve the existing role",
    "context": "string - 150-280 chars, sensory + specific",
    "emotional_state": "string - 50-120 chars, name the feeling-mix",
    "pain_points": ["string", "string", "string"],
    "jtbd": "string - preserve or sharpen"
  },
  "demonstrated_moment": "string - 200-400 chars",
  "narrative_arc": [
    { "timeframe": "Minute 1", "user_moment": "string", "ai_moment": "string", "feeling": "string" }
  ],
  "why_this_frame": "string - 1-2 sentences"
}

Do not include any other field. The pipeline will merge your output into the existing brief, preserving structural fields verbatim.
</output_format>`;

async function refineNarrativeFieldsViaOpus(brief: ProductBrief, conceptContext: string): Promise<Partial<ProductBrief>> {
    const userContent = [
        `INPUT CONCEPT:`,
        conceptContext,
        ``,
        `EXISTING BRIEF (structural fields locked; refine narrative ONLY):`,
        JSON.stringify({
            id: brief.id,
            frame_label: brief.frame_label,
            probability: brief.probability,
            title: brief.title,
            one_line_thesis: brief.one_line_thesis,
            why_this_frame: brief.why_this_frame,
            primary_persona: brief.primary_persona,
            demonstrated_moment: brief.demonstrated_moment,
            use_cases: brief.use_cases?.slice(0, 4)?.map(u => ({ name: u.name, ai_role: u.ai_role })),
            narrative_arc: brief.narrative_arc,
        }, null, 2),
        ``,
        `Re-emit ONLY the JSON object with refined primary_persona / demonstrated_moment / narrative_arc / why_this_frame fields.`,
    ].join('\n');
    return await callOpusJson<Partial<ProductBrief>>(
        NARRATIVE_REFINEMENT_SYSTEM,
        userContent,
        `Brief Narrative Refinement - ${brief.frame_label}`,
        4000,
    );
}

/**
 * Generate FIVE distinct product briefs via two-pass Verbalized Sampling.
 *
 *   Pass 1: ONE Opus call returns 5 skeleton framings (~10K tokens of output).
 *   Pass 2: FIVE PARALLEL Opus calls, each deepens ONE framing into the full
 *           Copilot-Recipe-Generator-grade brief (8-12 use cases, 7-10 screens,
 *           5-8 AI capabilities, sample records, roadmap, narrative arc,
 *           interaction choreography). Each gets a 16K-token budget all to
 *           itself - 5× the per-brief budget of the prior single-call version.
 *
 * Returns the parsed ProductBrief[] (always exactly 5, in order modal → radical).
 */
export async function generatePrototypeBriefs(opts: BriefGenerationOptions): Promise<ProductBrief[]> {
    const fire = opts.onProgress;

    // ---- Pass 1: skeletons ----
    fire?.('thinking', 'Pass 1/2 - generating 5 distinct framings via Verbalized Sampling (Claude Opus 4.8)...');
    let skeletonPayload: { briefs: SkeletonBrief[] };
    try {
        skeletonPayload = await callOpusJson<{ briefs: SkeletonBrief[] }>(
            STAGE_SKELETON_SYSTEM,
            buildBriefUserContent(opts),
            'Brief Skeleton Pass',
            // 2026-05-15 - Bumped 8000 → 16000. Observed real failure at
            // position 9056 (mid-string on brief 1's one_line_thesis). Opus
            // budgets ~10K-13K chars per skeleton set at typical verbosity
            // and the 8K ceiling was clipping the 5th framing's body. The
            // recoverTruncatedJsonLocal pass is the safety net for any
            // remaining truncations; the bump prevents the routine clip.
            16000,
        );
    } catch (e: any) {
        fire?.('failed', e?.message || 'skeleton pass failed');
        throw new Error(`Brief generation pass 1 (skeletons) failed: ${e?.message || e}`);
    }
    if (!Array.isArray(skeletonPayload?.briefs) || skeletonPayload.briefs.length < 3) {
        throw new Error(`Brief generation pass 1 returned ${skeletonPayload?.briefs?.length || 0} skeletons (expected 5).`);
    }

    const skeletons = skeletonPayload.briefs.slice(0, 5).map((b, i) => ({
        ...b,
        id: b.id || `brief-${i + 1}`,
        probability: typeof b.probability === 'number' ? b.probability : [0.40, 0.20, 0.12, 0.10, 0.05][i] ?? 0.10,
        frame_label: (b.frame_label || (
            ['convention-honoring', 'shifted-frame', 'adjacent-vertical', 'inverted-actor', 'radical-reinterpretation'] as FrameLabel[]
        )[i]) as FrameLabel,
    }));

    // ---- Pass 2: deepen each skeleton in parallel ----
    // 2026-05-14 - HYBRID MODE.
    //   • opus   : all-Opus 4.7 (legacy; highest narrative quality; ~$15-22)
    //   • hybrid : Pass 2 on GPT-5.5 + narrative-quality gate + Opus narrative-only
    //              refinement for thin briefs. Default. ~$5-9 per run. ~60% savings,
    //              quality protected by construction.
    //   • gpt    : all-GPT-5.5, no Opus refinement. Max cost savings, accept narrative
    //              drift. ~$4-7 per run.
    // 2026-05-15 - Default changed 'hybrid' → 'opus' because the user's OpenAI
    // quota is exhausted (HTTP 429 on every brief-deepen pass observed in
    // production). Hybrid mode wastes 3 retry attempts × 5 briefs = 15 wasted
    // OpenAI calls + ~30s of latency before falling back to Opus anyway. Until
    // OpenAI quota is restored, default to all-Opus and avoid the 429 cascade.
    // Caller can still pass briefModelMode: 'hybrid' or 'gpt' explicitly to opt
    // back in once the quota is healthy.
    const mode = opts.briefModelMode || 'opus';
    const deepenModelLabel = mode === 'opus' ? 'Claude Opus 4.8'
        : mode === 'gpt' ? 'GPT-5.5'
        : 'GPT-5.5 + Opus narrative gate';
    fire?.('thinking', `Pass 2/2 - deepening all ${skeletons.length} briefs in parallel (${deepenModelLabel} · 5 parallel calls, 32K tokens each, staggered starts)...`);

    const STAGGER_MS = 250;  // 250ms between call starts to dodge tier rate limits
    let pass2Successes = 0;
    let pass2Failures = 0;
    let pass2Refined = 0;    // hybrid: how many briefs needed Opus narrative refinement
    const failureReasons: string[] = [];

    const deepResults = await Promise.allSettled(skeletons.map(async (sk, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, STAGGER_MS * i));
        const userContent = [
            `INPUT CONCEPT:`,
            opts.concept,
            ``,
            `SKELETON BRIEF TO DEEPEN (${sk.frame_label}, p=${sk.probability}):`,
            JSON.stringify(sk, null, 2),
            ``,
            `Now produce the FULL exhaustive ProductBrief JSON for THIS skeleton - every field per the schema, every count per the exhaustiveness_floor. Output ONLY the JSON.`,
        ].join('\n');
        try {
            // Route Pass 2 by mode.
            const callFn = mode === 'opus' ? callOpusJson : callGpt55Json;
            const callLabel = `Brief Deepen Pass - brief ${i + 1} (${sk.frame_label})`;
            let full = await callFn<ProductBrief>(
                STAGE_DEEPEN_SYSTEM,
                userContent,
                callLabel,
                32000,
            );
            pass2Successes++;
            // Structural completeness check (unchanged from prior version).
            const useCaseCount = (full as any)?.use_cases?.length || 0;
            const screenCount = (full as any)?.key_screens?.length || 0;
            const aiCount = (full as any)?.ai_capabilities?.length || 0;
            if (useCaseCount < 3 || screenCount < 3 || aiCount < 2) {
                console.warn(`[Brief Deepen] brief ${i + 1} (${sk.frame_label}) parsed but under-specified: ${useCaseCount} use cases, ${screenCount} screens, ${aiCount} AI caps - likely truncated mid-generation`);
            }
            full = {
                ...full,
                id: sk.id,
                frame_label: sk.frame_label,
                probability: sk.probability,
            } as ProductBrief;

            // Narrative-quality gate (only when hybrid; pure-GPT mode accepts drift,
            // pure-Opus mode doesn't need it).
            if (mode === 'hybrid') {
                const gate = assessNarrativeQuality(full);
                if (!gate.pass) {
                    console.log(`[Brief Narrative Gate] brief ${i + 1} (${sk.frame_label}) score=${gate.score}/100, missing: ${gate.missing.join(', ')} - refining via Opus`);
                    try {
                        const refined = await refineNarrativeFieldsViaOpus(full, opts.concept);
                        // Merge ONLY the narrative fields - preserve structural GPT output.
                        if (refined.primary_persona) {
                            full.primary_persona = {
                                ...full.primary_persona,
                                ...refined.primary_persona,
                                // Always keep the name/role from the structural pass
                                name: full.primary_persona.name || refined.primary_persona.name || '',
                                role: full.primary_persona.role || refined.primary_persona.role || '',
                            };
                        }
                        if (typeof refined.demonstrated_moment === 'string' && refined.demonstrated_moment.length > 0) {
                            full.demonstrated_moment = refined.demonstrated_moment;
                        }
                        if (Array.isArray(refined.narrative_arc) && refined.narrative_arc.length >= 3) {
                            full.narrative_arc = refined.narrative_arc;
                        }
                        if (typeof refined.why_this_frame === 'string' && refined.why_this_frame.length > 0) {
                            full.why_this_frame = refined.why_this_frame;
                        }
                        pass2Refined++;
                        (full as any)._narrative_refined = true;
                        (full as any)._narrative_gate_score = gate.score;
                    } catch (refErr: any) {
                        // Narrative refinement is best-effort. If Opus fails too,
                        // ship the GPT brief as-is - at least the structural fields work.
                        console.warn(`[Brief Narrative Gate] Opus refinement failed for brief ${i + 1}, shipping GPT output as-is: ${refErr?.message || refErr}`);
                        (full as any)._narrative_refinement_failed = String(refErr?.message || refErr).slice(0, 200);
                    }
                } else {
                    (full as any)._narrative_gate_score = gate.score;
                }
            }
            return full;
        } catch (e: any) {
            pass2Failures++;
            const reason = e?.message || String(e);
            failureReasons.push(`brief ${i + 1} (${sk.frame_label}): ${reason.slice(0, 200)}`);
            console.error(`[Brief Deepen] brief ${i + 1} (${sk.frame_label}) HARD FAIL - falling back to skeleton:`, reason);
            // 2026-05-14 - If hybrid/gpt mode failed, try once more on Opus before
            // falling back to skeleton. Often a GPT 429 or schema issue won't recur
            // on Opus. Saves the brief from being skeleton-only.
            if (mode !== 'opus') {
                try {
                    console.log(`[Brief Deepen] brief ${i + 1} (${sk.frame_label}) - retrying on Opus as a fallback`);
                    const opusFull = await callOpusJson<ProductBrief>(
                        STAGE_DEEPEN_SYSTEM,
                        userContent,
                        `Brief Deepen Pass (Opus fallback) - brief ${i + 1} (${sk.frame_label})`,
                        32000,
                    );
                    pass2Failures--;
                    pass2Successes++;
                    return {
                        ...opusFull,
                        id: sk.id,
                        frame_label: sk.frame_label,
                        probability: sk.probability,
                        _opus_fallback: true,
                    } as ProductBrief;
                } catch (opusErr: any) {
                    console.error(`[Brief Deepen] Opus fallback also failed for brief ${i + 1}:`, opusErr);
                }
            }
            return { ...skeletonToFallbackBrief(sk), _pass2_failed: true, _pass2_reason: reason } as ProductBrief;
        }
    }));

    const briefs: ProductBrief[] = deepResults.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        pass2Failures++;
        const reason = String(r.reason?.message || r.reason || 'unknown rejection');
        failureReasons.push(`brief ${i + 1} (settle-failed): ${reason.slice(0, 200)}`);
        console.error(`[Brief Deepen] brief ${i + 1} settle-failed:`, r.reason);
        return { ...skeletonToFallbackBrief(skeletons[i]), _pass2_failed: true, _pass2_reason: reason } as ProductBrief;
    });

    const avgUseCases = Math.round(briefs.reduce((n, b) => n + (b.use_cases?.length || 0), 0) / briefs.length);
    const refinedDetail = pass2Refined > 0 ? ` · ${pass2Refined} narrative-refined via Opus gate` : '';
    if (pass2Failures > 0) {
        console.error(`[Brief Generator] Pass 2 FAILED on ${pass2Failures}/${briefs.length} briefs. Reasons:\n${failureReasons.join('\n')}`);
        fire?.('done', `${pass2Successes}/${briefs.length} briefs deepened · ${pass2Failures} fell back to skeletons${refinedDetail} (check console; likely token truncation or rate limit)`);
    } else {
        fire?.('done', `${briefs.length}/${briefs.length} briefs deepened · avg ${avgUseCases} use cases per brief${refinedDetail}`);
    }
    return briefs;
}

/** Synthesize a minimal ProductBrief from a skeleton when the deepen pass fails for that brief.
 *  Ensures the user always sees 5 cards even under partial provider failure. */
function skeletonToFallbackBrief(sk: SkeletonBrief): ProductBrief {
    const useCases: UseCase[] = (sk.use_case_names || []).map(n => ({
        name: n, trigger: '', flow: '', ai_role: '', outcome: '',
    }));
    const keyScreens: KeyScreen[] = (sk.key_screen_names || []).map(n => ({
        name: n, purpose: '', primary_element: '', motion_character: '',
    }));
    const aiCaps: AiCapability[] = (sk.ai_capability_names || []).map(n => ({
        name: n, user_action: '', ai_model: 'Gemini 3.1 Pro', input_data: '', output: '', user_benefit: '',
    }));
    return {
        id: sk.id,
        frame_label: sk.frame_label,
        probability: sk.probability,
        title: sk.title,
        one_line_thesis: sk.one_line_thesis,
        why_this_frame: sk.why_this_frame,
        primary_persona: {
            name: sk.primary_persona_summary || '',
            role: '',
            context: '',
            emotional_state: '',
            pain_points: [],
            jtbd: '',
        },
        secondary_actors: [],
        demonstrated_moment: sk.demonstrated_moment,
        use_cases: useCases,
        key_screens: keyScreens,
        ai_capabilities: aiCaps,
        seed_data: { primary_entities: [], secondary_entities: [] },
        visual_direction: {
            aesthetic_keywords: sk.aesthetic_keywords || '',
            hero_treatment: '',
            motion_character: '',
            image_gen_opportunities: [],
        },
        success_criteria: [],
        hard_constraints: { brand: null, platform: 'web', accessibility: 'WCAG AA', other: [] },
    };
}

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

/**
 * Map a chosen ProductBrief onto the ExperienceBrief shape that prototypeBuilder
 * Stage 2-5 consumes. This is the bridge that lets us skip Stage 1 entirely when
 * the user has already approved a brief.
 */
export function productBriefToExperienceBrief(b: ProductBrief): ExperienceBrief {
    return {
        concept_title: b.title,
        one_line_thesis: b.one_line_thesis,
        primary_persona: {
            name: b.primary_persona.name,
            context: b.primary_persona.context,
            emotional_state: b.primary_persona.emotional_state,
        },
        secondary_actors: b.secondary_actors || [],
        demonstrated_moment: b.demonstrated_moment,
        jobs_to_be_done: [
            b.primary_persona.jtbd,
            ...b.use_cases.slice(0, 5).map(u => u.name),
        ].filter(Boolean),
        success_criteria: b.success_criteria,
        hard_constraints: b.hard_constraints,
        open_questions: [],
    };
}

/**
 * Build an enriched concept string from a ProductBrief - the chosen brief
 * gets passed downstream as both the ExperienceBrief AND as a rich text
 * context so Stages 2-4 have full use-case / screen / AI / visual / seed
 * detail to honor. This is the channel that carries the brief's
 * exhaustiveness through the pipeline.
 */
export function productBriefToRichContext(b: ProductBrief): string {
    const lines: string[] = [];
    lines.push(`=== APPROVED PRODUCT BRIEF (the user picked this from a 5-brief set; build EXACTLY this) ===`);
    lines.push(``);
    lines.push(`Frame: ${b.frame_label} (probability ${b.probability})`);
    lines.push(`Title: ${b.title}`);
    lines.push(`Thesis: ${b.one_line_thesis}`);
    lines.push(`Why this frame: ${b.why_this_frame}`);
    lines.push(``);
    lines.push(`PRIMARY PERSONA:`);
    lines.push(`  Name: ${b.primary_persona.name}`);
    lines.push(`  Role: ${b.primary_persona.role}`);
    lines.push(`  Context: ${b.primary_persona.context}`);
    lines.push(`  Emotional state: ${b.primary_persona.emotional_state}`);
    lines.push(`  Pain points:`);
    for (const p of b.primary_persona.pain_points || []) lines.push(`    - ${p}`);
    lines.push(`  JTBD: ${b.primary_persona.jtbd}`);
    if (b.secondary_actors?.length) {
        lines.push(`SECONDARY ACTORS:`);
        for (const a of b.secondary_actors) lines.push(`  - ${a.role}: ${a.involvement}`);
    }
    lines.push(``);
    lines.push(`DEMONSTRATED MOMENT: ${b.demonstrated_moment}`);
    lines.push(``);
    lines.push(`USE CASES (${b.use_cases.length}) - the prototype MUST demonstrate at least 5 of these as live flows:`);
    b.use_cases.forEach((u, i) => {
        lines.push(`  ${i + 1}. ${u.name}`);
        lines.push(`     Trigger: ${u.trigger}`);
        lines.push(`     Flow: ${u.flow}`);
        lines.push(`     AI role: ${u.ai_role}`);
        lines.push(`     Outcome: ${u.outcome}`);
    });
    lines.push(``);
    lines.push(`KEY SCREENS (${b.key_screens.length}) - every screen is a real view, not a placeholder:`);
    b.key_screens.forEach((s, i) => {
        lines.push(`  ${i + 1}. ${s.name} - purpose: ${s.purpose}`);
        lines.push(`     Primary element: ${s.primary_element}`);
        lines.push(`     Motion character: ${s.motion_character}`);
    });
    lines.push(``);
    lines.push(`AI CAPABILITIES (${b.ai_capabilities.length}) - every one wires to a real /api/ai/* endpoint via the multi-provider fallback helper:`);
    b.ai_capabilities.forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.name}`);
        lines.push(`     User action: ${c.user_action}`);
        lines.push(`     Model: ${c.ai_model}`);
        lines.push(`     Input: ${c.input_data}`);
        lines.push(`     Output: ${c.output}`);
        lines.push(`     User benefit: ${c.user_benefit}`);
    });
    lines.push(``);
    lines.push(`SEED DATA - generate the FULL count of records per entity (not 1-3 example shapes - the actual full set):`);
    lines.push(`  PRIMARY ENTITIES (${b.seed_data.primary_entities.length}):`);
    b.seed_data.primary_entities.forEach(e => {
        lines.push(`    • ${e.name} - target_count ${e.target_count}`);
        lines.push(`      Shape: ${e.field_shape}`);
        lines.push(`      Example records summary: ${e.example_records_summary}`);
    });
    lines.push(`  SECONDARY ENTITIES (${b.seed_data.secondary_entities.length}):`);
    b.seed_data.secondary_entities.forEach(e => {
        lines.push(`    • ${e.name} - target_count ${e.target_count}`);
        lines.push(`      Shape: ${e.field_shape}`);
        lines.push(`      Example records summary: ${e.example_records_summary}`);
    });
    lines.push(``);
    lines.push(`VISUAL DIRECTION:`);
    lines.push(`  Aesthetic keywords: ${b.visual_direction.aesthetic_keywords}`);
    lines.push(`  Hero treatment: ${b.visual_direction.hero_treatment}`);
    lines.push(`  Motion character: ${b.visual_direction.motion_character}`);
    if (b.visual_direction.image_gen_opportunities?.length) {
        lines.push(`  Image generation prompts (the prototype should call /api/ai/gemini-image at runtime with these - the runner reads the result and renders it as a hero/empty-state/illustration):`);
        b.visual_direction.image_gen_opportunities.forEach((p, i) => {
            lines.push(`    ${i + 1}. ${p}`);
        });
    }
    lines.push(``);
    if (b.feature_roadmap && b.feature_roadmap.length > 0) {
        lines.push(`FEATURE ROADMAP (${b.feature_roadmap.length} phases) - the prototype demonstrates Phase 1 in working code; later phases appear as roadmap surfaces inside the experience:`);
        b.feature_roadmap.forEach((p, i) => {
            lines.push(`  ${i + 1}. ${p.phase} - ${p.label}`);
            (p.deliverables || []).forEach(d => lines.push(`     • ${d}`));
            if (p.success_metric) lines.push(`     Success: ${p.success_metric}`);
        });
        lines.push(``);
    }
    if (b.narrative_arc && b.narrative_arc.length > 0) {
        lines.push(`NARRATIVE ARC (${b.narrative_arc.length} beats) - the multi-timeframe user journey the prototype must SUGGEST through copy, seed data, and roadmap surfaces:`);
        b.narrative_arc.forEach((n, i) => {
            lines.push(`  ${i + 1}. ${n.timeframe}`);
            if (n.user_moment) lines.push(`     User: ${n.user_moment}`);
            if (n.ai_moment) lines.push(`     AI: ${n.ai_moment}`);
            if (n.feeling) lines.push(`     Feeling: ${n.feeling}`);
        });
        lines.push(``);
    }
    if (b.interaction_choreography && b.interaction_choreography.length > 0) {
        lines.push(`INTERACTION CHOREOGRAPHY (${b.interaction_choreography.length} beats) - the step-by-step script for the HEADLINE aha interaction; honor the timing_ms values where given:`);
        b.interaction_choreography.forEach(beat => {
            lines.push(`  ${beat.step}. ${beat.user_action}`);
            if (beat.system_response) lines.push(`     System: ${beat.system_response}`);
            if (beat.motion_or_feedback) lines.push(`     Motion/feedback: ${beat.motion_or_feedback}${beat.timing_ms ? ` (${beat.timing_ms}ms)` : ''}`);
        });
        lines.push(``);
    }
    if (b.data_examples && b.data_examples.length > 0) {
        lines.push(`DATA EXAMPLES - fully-formed anchor records the code generator expands to target_count via the naming_convention + value_distributions:`);
        b.data_examples.forEach(de => {
            lines.push(`  • ${de.name} - target_count ${de.target_count}`);
            lines.push(`    Shape: ${de.field_shape}`);
            lines.push(`    Naming: ${de.naming_convention}`);
            lines.push(`    Distribution: ${de.value_distributions}`);
            lines.push(`    Sample records (${de.sample_records?.length || 0}):`);
            (de.sample_records || []).slice(0, 8).forEach((rec, i) => {
                lines.push(`      ${i + 1}. ${JSON.stringify(rec)}`);
            });
        });
        lines.push(``);
    }
    lines.push(`SUCCESS CRITERIA (Stage 5 audits the prototype against each of these):`);
    for (const s of b.success_criteria) lines.push(`  - ${s}`);
    lines.push(``);
    lines.push(`HARD CONSTRAINTS:`);
    lines.push(`  Brand: ${b.hard_constraints.brand || '(unset)'}`);
    lines.push(`  Platform: ${b.hard_constraints.platform}`);
    lines.push(`  Accessibility: ${b.hard_constraints.accessibility}`);
    if (b.hard_constraints.other?.length) {
        lines.push(`  Other:`);
        for (const o of b.hard_constraints.other) lines.push(`    - ${o}`);
    }
    return lines.join('\n');
}
