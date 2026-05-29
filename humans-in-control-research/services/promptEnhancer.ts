/**
 * promptEnhancer.ts — Gemini Flash-powered chat-input rewriter.
 *
 * Takes a raw user message destined for the AI Analyst Desk or Design Desk
 * chat and returns a sharper version that follows the 2026-Q2 official
 * prompting guidelines from OpenAI (GPT-5.5) and Anthropic (Claude Opus 4.7):
 *
 *   • Lead with the outcome, not framing.
 *   • Be explicit about scope, format, and the dimensions to cover.
 *   • Use positive instructions ("emit X") over negative ones ("don't do Y").
 *   • Keep it terse — short outcome-first prompts beat long preambles.
 *   • Preserve hashtag directives VERBATIM (they route through hashtagParser
 *     and any rewrite breaks routing).
 *   • Preserve every named entity, number, URL, and quoted span exactly.
 *
 * Returns the rewritten prompt plus a one-sentence rationale the UI shows
 * so the user can decide whether to accept it.
 */

import { callAIWithRetry } from './aiRetryClient';
import { parseJSONWithRepair } from './aiOutputRepair';

export interface EnhancePromptResult {
    enhanced: string;
    rationale: string;
    model: string;
    elapsed_ms: number;
}

export interface EnhancePromptOptions {
    /** Target chat surface — tunes the rubric. */
    surface: 'analyst' | 'design' | 'research-goal' | 'revision' | 'brief-customization';
    /**
     * Downstream model the enhanced prompt will eventually be sent to.
     * Picks between the OpenAI and Anthropic rubric flavors. If "auto" or
     * unspecified we apply the union of both rubrics (safe default).
     */
    targetModel?: 'gemini' | 'opus' | 'gpt' | 'auto';
    /**
     * Optional context the enhancer can use to ground the rewrite (research
     * goal, list of recently mentioned sources, attached file names, etc.).
     * Kept short — this is signal, not full corpus.
     */
    context?: string;
}

const ENHANCER_MODEL = 'gemini-2.5-flash';

// Hashtag tokens MUST survive the rewrite verbatim. We extract them, replace
// with sentinels, rewrite, then restore — belt-and-suspenders on top of the
// system prompt's "preserve hashtags" rule.
const HASHTAG_RE = /#[a-zA-Z][a-zA-Z0-9_-]*(?:=[a-zA-Z0-9._-]+)?/g;

function extractHashtags(input: string): { stripped: string; tokens: string[] } {
    const tokens: string[] = [];
    const stripped = input.replace(HASHTAG_RE, (match) => {
        tokens.push(match);
        return `__HASHTAG_${tokens.length - 1}__`;
    });
    return { stripped, tokens };
}

function restoreHashtags(text: string, tokens: string[]): string {
    let out = text;
    tokens.forEach((tok, i) => {
        const sentinel = `__HASHTAG_${i}__`;
        out = out.split(sentinel).join(tok);
    });
    return out;
}

function buildSystemPrompt(surface: 'analyst' | 'design' | 'research-goal' | 'revision' | 'brief-customization', targetModel: string): string {
    const surfaceContext = surface === 'analyst'
        ? `The user is talking to the AI Analyst Desk — a research workbench that synthesizes an uploaded corpus + external intelligence into consulting-grade deliverables (themes, personas, strategy decks, gap analyses, prototypes). The downstream model has access to the corpus, a wiki knowledge base, ~200 external sources, and a slide/PPTX render pipeline.`
        : surface === 'design'
        ? `The user is talking to the Design Desk — an artifact authoring chat that produces personas, journeys, org charts, slides, and freeform documents from short natural-language requests. Each request becomes a typed artifact.`
        : surface === 'research-goal'
        ? `The user is writing the RESEARCH GOAL for an engagement — the single most-load-bearing prompt in the system. This goal drives source retrieval (200+ external connectors), multi-angle query expansion, theme generation, persona generation, recommendation generation, strategy deck, and prototype briefs. Every downstream model sees this string. Sharpen it like a consulting-engagement framing question, not a chat prompt.`
        : surface === 'revision'
        ? `The user is writing a REVISION INSTRUCTION to amend an existing deliverable (presentation, prototype, journey, persona set). The downstream model will RE-GENERATE the deliverable applying this instruction. Sharpen it into an imperative tweak — not a redesign brief.`
        : `The user is writing a BRIEF CUSTOMIZATION — last-mile tweaks to a generated experience brief BEFORE the 7-stage prototype pipeline runs. These tweaks flow into Stages 2-5 as additional grounding. Sharpen into concrete, surgical changes (specific entity counts, named flows, brand tilts) — not directional vibes.`;

    const modelRubric = targetModel === 'opus'
        ? `Optimize for Claude Opus 4.7:
   • Be explicit about scope and stopping conditions — Opus interprets instructions literally and will pursue them exhaustively.
   • Use positive framing ("include X, Y, Z") over negative ("don't omit X").
   • If multiple deliverables are wanted, list them as a numbered set.
   • Avoid over-validating language ("please ensure", "make sure to") — state the requirement directly.`
        : targetModel === 'gpt'
        ? `Optimize for GPT-5.5:
   • Lead with the outcome in the first sentence. The model's effort scales to the perceived ambition of the ask.
   • State format explicitly when format matters (table / bullet list / 3-paragraph memo / single number).
   • Cap retrieval/research breadth if relevant ("review the top 5 sources, not all 200").
   • Separate personality cues from collaboration style — say what to DO, not how to feel.`
        : `Optimize for both GPT-5.5 and Claude Opus 4.7 (the downstream model varies):
   • Lead with the concrete outcome in the first sentence.
   • State format explicitly when format matters.
   • Use positive framing ("emit a 5-row table") over negative ("don't write prose").
   • Name the dimensions to cover when a list would otherwise be open-ended.
   • Be terse. Short outcome-first prompts outperform long preambles on both models.`;

    const surfaceRules = surface === 'research-goal' ? `

<research_goal_structure>
A great research goal — the kind the downstream pipeline can act on — has FOUR ingredients. If the original is missing any, add them:
1. POPULATION / SUBJECT — name the specific segment, organization, market, or cohort under study (not "users", not "the industry").
2. DECISION OR INSIGHT — what must the engagement produce? A strategy? A persona set? A roadmap? A market sizing?
3. SCOPE BOUNDS — time horizon, geography, or competitive set if relevant.
4. ANGLE OR LENS — what specifically interests the requester (pain points / opportunities / benchmarks / behaviors / unmet needs).

Keep it 1-3 sentences max. This string is load-bearing across every downstream prompt; verbosity here cascades into bloated retrieval queries and diluted themes. Density beats length.
</research_goal_structure>` : surface === 'revision' ? `

<revision_instruction_structure>
A great revision instruction is IMPERATIVE and SURGICAL — it names what to change, not what to redesign. Three ingredients:
1. TARGET — name the specific element being changed (a slide, a persona's role, a recommendation's framing, a screen's primary action).
2. CHANGE — describe the change as a delta (increase / decrease / replace / drop / add / reorder / soften / sharpen).
3. WHY (optional, only if it disambiguates) — a 5-word reason that helps the model pick between alternatives.

Avoid: "make it better", "more compelling", "more aggressive" (subjective). Prefer: "increase persona pain-point count from 3 to 5", "replace Microsoft case with Salesforce", "drop the section on infrastructure cost", "reorder so retention precedes acquisition".

Keep it 1-2 sentences. Imperative voice. No preamble.
</revision_instruction_structure>` : surface === 'brief-customization' ? `

<brief_customization_structure>
A great brief-customization is a SURGICAL TWEAK to a brief that's already nearly right. The user is moments away from kicking off a 4-8 minute build pipeline; their customization adds specificity, not direction. Three ingredients:
1. SPECIFIC ANCHORS — concrete entity counts, named flows, brand tilts ("seed 30 student records, not 15", "add a Slack-style notification feed", "lean harder into NU red than chartreuse").
2. NEW REQUIREMENTS — capabilities, screens, or constraints the brief should respect ("must include a faculty-advisor screen", "make the AI capability a Claude-style tool loop, not a single shot").
3. WHAT TO DOWNPLAY — sections to compress or drop ("skip the onboarding flow — assume the user is signed in", "fewer admin screens, more student-facing ones").

The brief itself is rich and the pipeline will preserve its structure. The customization is additive grounding, not a rewrite spec. Keep it 1-3 sentences. Surgical, not directional.
</brief_customization_structure>` : '';

    return `<role>
You are a prompt-quality coach embedded in a consulting research workbench. The user just typed a chat message. Your job is to rewrite it into a sharper version that will produce a deeper, more specific answer from the downstream reasoning model — WITHOUT changing what the user actually wants.
</role>

<surface>
${surfaceContext}
</surface>

<rubric>
${modelRubric}
</rubric>${surfaceRules}

<hard_rules>
1. PRESERVE INTENT. If the user asks for a journey map, do not turn it into a persona set. If they ask a question, do not turn it into a deliverable request.
2. PRESERVE HASHTAG TOKENS EXACTLY. Any token shaped like __HASHTAG_N__ is a placeholder for a routing directive (#persona, #proto, #recommendations, #model=opus, etc.) — keep them in place and unchanged.
3. PRESERVE NAMED ENTITIES, NUMBERS, URLS, AND QUOTED SPANS verbatim. Do not generalize "Northeastern" to "a university" or "2024" to "recent".
4. KEEP IT SHORTER WHEN POSSIBLE. Aim for 1.2-2× the original length, not 5×. A short outcome-first prompt is the goal.
5. NO MARKDOWN, NO LISTS, NO HEADERS in the rewritten prompt unless the original had them. The downstream chat parses plain prose.
6. NO HEDGING ("please", "if you could", "I was wondering"). State the request.
7. NEVER add a fictional fact, citation, source name, statistic, or date.
8. If the original is already excellent, return it unchanged and say so in the rationale.
9. If the original is genuinely ambiguous in a way no rewrite can fix, return the best interpretation and note the ambiguity in the rationale.
</hard_rules>

<output_format>
Return EXACTLY this delimited format, nothing before or after, no code fence, no JSON:

<<<ENHANCED>>>
the rewritten prompt here, plain text, hashtag placeholders preserved, quotes and brackets kept verbatim
<<<RATIONALE>>>
one sentence, 25 words or fewer, naming what you sharpened

Do NOT wrap the output in JSON or quotes. The text between the markers is read literally, so you never need to escape quotation marks, brackets, or any other character. Emit the two markers on their own lines exactly as shown.
</output_format>`;
}

function buildUserPrompt(strippedInput: string, context?: string): string {
    const ctx = context && context.trim() ? `\n\n<context>\n${context.trim().slice(0, 1200)}\n</context>` : '';
    return `<original_prompt>\n${strippedInput}\n</original_prompt>${ctx}`;
}

/**
 * Parse the enhancer response. PRIMARY path is the delimiter format
 * (<<<ENHANCED>>> ... <<<RATIONALE>>> ...), which sidesteps JSON escaping
 * entirely — the enhanced prompt is arbitrary user prose full of quotes and
 * brackets, and wrapping that in JSON is the exact failure mode this replaces
 * ("Expected ',' or '}' ... in JSON"). Falls back to repair-tolerant JSON
 * parsing for older/strays responses, then throws so the caller can soft-fail.
 */
const ENHANCED_MARK = '<<<ENHANCED>>>';
const RATIONALE_MARK = '<<<RATIONALE>>>';

function parseEnhancerResponse(text: string): { enhanced: string; rationale: string } {
    let cleaned = text.trim();
    // Strip an accidental code fence if the model added one.
    if (cleaned.startsWith('```')) {
        const fenceBody = cleaned.split('```').filter(Boolean);
        cleaned = (fenceBody.length ? fenceBody[fenceBody.length - 1] : cleaned).trim();
        if (cleaned.toLowerCase().startsWith('json')) cleaned = cleaned.slice(4).trim();
    }

    // PRIMARY: delimiter format. No escaping, so quote-heavy prompts can't break it.
    const eIdx = cleaned.indexOf(ENHANCED_MARK);
    if (eIdx !== -1) {
        const afterEnhanced = cleaned.slice(eIdx + ENHANCED_MARK.length);
        const rIdx = afterEnhanced.indexOf(RATIONALE_MARK);
        const enhanced = (rIdx === -1 ? afterEnhanced : afterEnhanced.slice(0, rIdx)).trim();
        const rationale = rIdx === -1 ? '' : afterEnhanced.slice(rIdx + RATIONALE_MARK.length).trim();
        if (enhanced) return { enhanced, rationale };
    }

    // FALLBACK: repair-tolerant JSON (matches the layer the rest of the pipeline uses).
    try {
        const obj = parseJSONWithRepair<{ enhanced?: string; rationale?: string }>(cleaned, {
            calling_context: 'promptEnhancer',
        });
        const enhanced = typeof obj?.enhanced === 'string' ? obj.enhanced.trim() : '';
        const rationale = typeof obj?.rationale === 'string' ? obj.rationale.trim() : '';
        if (enhanced) return { enhanced, rationale };
    } catch {
        /* fall through to throw below */
    }

    throw new Error('enhancer response had no parseable enhanced prompt');
}

export async function enhancePrompt(
    rawInput: string,
    opts: EnhancePromptOptions,
): Promise<EnhancePromptResult> {
    const t0 = Date.now();
    const trimmed = rawInput.trim();
    if (!trimmed) throw new Error('cannot enhance an empty prompt');

    const { stripped, tokens } = extractHashtags(trimmed);
    const targetModel = opts.targetModel || 'auto';
    const systemPrompt = buildSystemPrompt(opts.surface, targetModel);
    const userPrompt = buildUserPrompt(stripped, opts.context);

    const body = {
        model: ENHANCER_MODEL,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
            // 2026-05-27 — Delimiter output (not JSON), so NO responseMimeType.
            // The enhanced prompt is arbitrary quote-heavy prose; JSON mode left
            // inner quotes unescaped and broke parsing ("Expected ',' or '}'").
            temperature: 0.3,
            maxOutputTokens: 2048,
            thinkingBudget: 'low',
        },
    };

    // Enhance is a NICETY, never load-bearing. Any failure (timeout, empty
    // content, unparseable response) must degrade to the original prompt
    // unchanged rather than surfacing a scary "Enhance failed" error.
    try {
        const data = await callAIWithRetry('gemini', body, { label: 'Prompt Enhancer', maxAttempts: 2 });
        const candidate = (data as any)?.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const text = parts.map((p: any) => p?.text || '').join('').trim();
        if (!text) {
            const finishReason = candidate?.finishReason || 'unknown';
            throw new Error(`Enhancer returned empty content (finishReason=${finishReason})`);
        }

        const { enhanced, rationale } = parseEnhancerResponse(text);
        const restored = restoreHashtags(enhanced, tokens);

        // Sanity check — every hashtag from the original must appear in the result.
        const missing = tokens.filter(tok => !restored.includes(tok));
        if (missing.length > 0) {
            console.warn('[promptEnhancer] hashtags lost in rewrite, appending:', missing);
            // Append any lost hashtags rather than discarding them
            return {
                enhanced: `${restored} ${missing.join(' ')}`.trim(),
                rationale: `${rationale} (recovered ${missing.length} hashtag${missing.length > 1 ? 's' : ''})`,
                model: ENHANCER_MODEL,
                elapsed_ms: Date.now() - t0,
            };
        }

        return { enhanced: restored, rationale, model: ENHANCER_MODEL, elapsed_ms: Date.now() - t0 };
    } catch (err: any) {
        // Soft-fail: return the original prompt unchanged. Enhance is optional;
        // a failed rewrite must never block the user or show a red error box.
        console.warn('[promptEnhancer] enhance failed, returning original unchanged:', err?.message || err);
        return {
            enhanced: trimmed,
            rationale: 'Kept your prompt as-is (enhancer unavailable).',
            model: ENHANCER_MODEL,
            elapsed_ms: Date.now() - t0,
        };
    }
}
