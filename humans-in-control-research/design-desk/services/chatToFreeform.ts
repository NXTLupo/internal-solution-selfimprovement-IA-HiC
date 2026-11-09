/**
 * Generation pipeline for freeform-HTML diagram artifacts. Loads the
 * matching exemplar HTML + brand-style skill + diagram-illustrator skill,
 * composes a prompt that tells the model to inherit the exemplar's visual
 * treatment while adapting content from the corpus, parses the
 * `:::nxt:freeform` block the model returns, sanitizes the HTML, and
 * validates against the FreeformArtifact schema.
 */

import type { FreeformArtifact, FreeformKind } from '../schemas/freeformArtifact';
import { validateFreeformArtifact } from '../schemas/freeformArtifact';
import type { BrandHashtag } from './hashtagParser';
import { loadExemplar } from './exemplarLoader';
import { parseFreeformOutput } from './freeformParser';
import { sanitizeFreeformHtml } from './freeformSanitizer';
import { analyzeText as analyzeTextOpenAI } from '../../services/openaiService';
import { UNIVERSAL_TONE_RULES } from '../../services/deliverableFrameworks';
import { GoogleGenAI } from '@google/genai';
import { makeGenAI } from '../../services/genaiClient';
import { CLAUDE_REASONING_MODEL, CLAUDE_REASONING_LABEL, artifactModelChain } from '../../services/aiRouter';

// Re-exported as a local alias so the freeform prompt builder doesn't have
// to thread the long import name through every call site.
const UNIVERSAL_TONE_RULES_INLINE = UNIVERSAL_TONE_RULES;

// 2026-05-05 - DeepSeek V4 Flash is the single-vendor primary; legacy
// Gemini/GPT entries kept for backward-compat.
// 2026-06-12 - claude-opus-4-8 added: Designer-chat generation + revision
// route to Opus 4.8 per Jonathan's directive (DesignDeskChat call sites).
export type FreeformGenerationModel = 'deepseek-v4-flash' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gpt-5.4' | typeof CLAUDE_REASONING_MODEL;

export interface FreeformGenerateArgs {
    kind: FreeformKind;
    brand: BrandHashtag;
    userPrompt: string;
    corpus: string;
    currentArtifact: FreeformArtifact | null;
    model: FreeformGenerationModel;
    /**
     * 2026-05-19 - Accumulated user instructions across prior turns of this
     * artifact's chat session. The Designer Desk chat is turn-amnesic by
     * default: each call passes ONLY the current turn's userPrompt + the
     * last artifact. That means when a user says "remove the metadata" on
     * turn 2 and "fix the title" on turn 3, the turn-3 generation no longer
     * sees the turn-2 instruction - and any partial compliance gets undone.
     *
     * This array carries the verbatim user messages from prior turns (oldest
     * first) so buildPrompt can render them as an "ACCUMULATED INSTRUCTIONS"
     * block. The model is told to apply ALL of them, not just the most
     * recent. The caller (DesignDeskChat) is responsible for filtering out
     * system messages and limiting the depth (typically last 8 user turns).
     */
    priorUserInstructions?: string[];
}

export type FreeformGenerateResult =
    | { ok: true; artifact: FreeformArtifact; modelUsed: FreeformGenerationModel }
    | { ok: false; error: string; rawResponse?: string; modelUsed?: FreeformGenerationModel };

const SYSTEM_PROMPT =
    'You are an NXT Humans Designer. You produce only the BODY CONTENT (children ' +
    'of <body>) for a 1920x1080 HTML slide. The HTML shell with all CSS, fonts, ' +
    'and atmospheric overlays is preserved server-side from the exemplar - you ' +
    'never re-emit it. You return EXACTLY one :::nxt:freeform block.';

/**
 * Split the exemplar HTML at the <body> tag so the model only needs to emit
 * the body content. Server-side we splice: shell.before + model body + shell.after.
 *
 * Why: the exemplars are 30-50KB each (mostly the inline <style> block).
 * Asking the model to re-emit that verbatim wastes 5-10K tokens of output and
 * Gemini truncates mid-<style>. By preserving the shell intact server-side,
 * the model only emits the body content (~3-8K tokens), well under any cap.
 */
interface ExemplarShell {
    before: string;        // everything up to and including the <body...> opening tag
    sampleBody: string;    // the original body inner content (for the model to study)
    after: string;         // </body></html>
}

function splitExemplarShell(html: string): ExemplarShell {
    const bodyOpenMatch = html.match(/<body\b[^>]*>/i);
    const bodyCloseMatch = html.match(/<\/body\s*>/i);
    if (!bodyOpenMatch || !bodyCloseMatch) {
        throw new Error('exemplar HTML is missing <body> open/close tags - cannot splice');
    }
    const bodyOpenEnd = bodyOpenMatch.index! + bodyOpenMatch[0].length;
    const bodyCloseStart = bodyCloseMatch.index!;
    return {
        before: html.slice(0, bodyOpenEnd),
        sampleBody: html.slice(bodyOpenEnd, bodyCloseStart),
        after: html.slice(bodyCloseStart),
    };
}

const MAX_TOKENS = 32000;
const TEMPERATURE = 0.4;

function resolveProviderModelId(chatModel: FreeformGenerationModel): string {
    switch (chatModel) {
        case 'deepseek-v4-flash':      return 'deepseek-v4-flash';
        case 'gpt-5.4':                return 'gpt-5.4';
        case 'gemini-3.5-flash':       return 'gemini-3.5-flash';
        case 'gemini-3.1-pro-preview': return 'gemini-3.1-pro-preview';
        case CLAUDE_REASONING_MODEL:    return CLAUDE_REASONING_MODEL;
    }
}

// 2026-06-12 - Anthropic path (Claude Opus 4.8). Single-shot HTML body
// generation via the proxy /api/ai/anthropic (key attached server-side,
// retry/backoff handled by aiRetryClient). max_tokens cap unverified for
// opus-4-8 - lower if the API 400s.
async function callClaude(prompt: string, modelId: string): Promise<string> {
    const { callAIWithRetry } = await import('../../services/aiRetryClient');
    const { designerVoiceAddendum } = await import('./voiceAddendum');
    const { HIC_CACHE_BREAK } = await import('../../services/aiRouter');
    // 2026-07-02 DESIGNER-CHAT CACHING: buildPrompt marks the stable-prefix boundary. Lift the
    // stable prefix into the system string so the proxy's marker split sets cache_control
    // breakpoints on [core][stable prefix]; the tiny literal tail keeps the big block NON-final
    // (the injector marks non-final blocks only). Iterating on the same artifact then re-reads
    // the 30-50KB rules+exemplar prefix from cache instead of re-ingesting it every turn.
    let sys = SYSTEM_PROMPT + await designerVoiceAddendum();
    let userContent = prompt;
    const brk = prompt.indexOf(HIC_CACHE_BREAK);
    if (brk > 0) {
        sys = sys + HIC_CACHE_BREAK + prompt.slice(0, brk) + HIC_CACHE_BREAK
            + 'Apply every rule and reference above to this generation.';
        userContent = prompt.slice(brk + HIC_CACHE_BREAK.length);
    }
    // No `temperature`: opus-4-8 400s on it ("deprecated for this model").
    const data: any = await callAIWithRetry('anthropic', {
        model: modelId,
        max_tokens: MAX_TOKENS,
        system: sys,
        messages: [{ role: 'user', content: userContent }],
    }, { label: `Freeform (Claude ${modelId})`, maxAttempts: 3 });
    const blocks = Array.isArray(data?.content) ? data.content : [];
    return blocks.map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('');
}

// 2026-05-05 - Azure DeepSeek-V4-Flash via /api/ai/deepseek.
async function callDeepSeek(prompt: string, modelId: string): Promise<string> {
    const { designerVoiceAddendum } = await import('./voiceAddendum');
    const sys = SYSTEM_PROMPT + await designerVoiceAddendum();
    const resp = await fetch('http://127.0.0.1:5012/api/ai/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelId,
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: prompt },
            ],
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            stream: false,
        }),
    });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`DeepSeek API ${resp.status}: ${errText.slice(0, 300)}`);
    }
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt: string, modelId: string): Promise<string> {
    const ai = makeGenAI();
    const { designerVoiceAddendum } = await import('./voiceAddendum');
    const sys = SYSTEM_PROMPT + await designerVoiceAddendum();
    // Retry-with-backoff (2026-05-29). A single transient Gemini failure (429
    // RESOURCE_EXHAUSTED when a bulk job saturates the shared quota, a 503, or a
    // network blip) previously killed the whole artifact with "Failed to fetch".
    // Retry transient errors a few times before surfacing the failure so an
    // interactive #org/#proto/etc. generation survives a quota spike.
    const attempts = 4;
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    systemInstruction: sys,
                    maxOutputTokens: MAX_TOKENS,
                    temperature: TEMPERATURE,
                },
            });
            return (response as any)?.text ?? '';
        } catch (e: any) {
            lastErr = e;
            const msg = String(e?.message || e || '');
            const transient = /429|RESOURCE_EXHAUSTED|rate.?limit|quota|503|UNAVAILABLE|overloaded|fetch failed|Failed to fetch|network|ECONNRESET|timeout|deadline/i.test(msg);
            if (!transient || i === attempts - 1) throw e;
            const backoff = 800 * Math.pow(2, i); // 0.8s, 1.6s, 3.2s
            console.warn(`[chatToFreeform] Gemini transient failure (attempt ${i + 1}/${attempts}, retry in ${backoff}ms): ${msg.slice(0, 140)}`);
            await new Promise(r => setTimeout(r, backoff));
        }
    }
    throw lastErr;
}

async function callForModel(prompt: string, model: FreeformGenerationModel): Promise<string> {
    const providerId = resolveProviderModelId(model);
    // 2026-07-02 caching: only the Anthropic path consumes the cache-break marker (callClaude
    // lifts the stable prefix into system). Every other provider gets a marker-free prompt -
    // Gemini's implicit caching keys on the stable-first prefix ordering buildPrompt already
    // guarantees; the marker itself must never reach a model as literal text.
    if (String(model).startsWith('claude-')) return callClaude(prompt, providerId);
    const { stripCacheMarkers } = await import('../../services/aiRouter');
    const clean = stripCacheMarkers(prompt);
    if (model === 'deepseek-v4-flash') return callDeepSeek(clean, providerId);
    if (model === 'gpt-5.4') return analyzeTextOpenAI(SYSTEM_PROMPT, clean, providerId, MAX_TOKENS, TEMPERATURE);
    return callGemini(clean, providerId);
}

/**
 * Per-kind body construction guidance. Each kind has different structural
 * requirements within the shared 1920x1080 frame. The model needs to know what
 * elements MUST be present in the body for that kind, beyond just visual fidelity.
 */
function perKindGuidance(kind: FreeformKind): string {
    // 2026-05-26 - Journey + Blueprint are now ROUTED through the dedicated
    // Journey Mapper service (internal-solutions-journeymapper, container
    // `journey-mapper`, port 8080) via proxy /api/journey-map/generate.
    // The inline guidance below was a 2026-05-25 depth-port that created
    // drift risk. The dispatcher in components/CorpusChatPanel.tsx routes
    // around this function for both kinds; this stub fails loudly if a
    // future caller bypasses the dispatcher and lands here.
    // See: memory/feedback_journey_must_route_to_journey_mapper.md
    if (kind === 'journey' || kind === 'blueprint') {
        throw new Error(
            `[journey-routing] kind=${kind} must route via /api/journey-map/generate (Journey Mapper IA service). ` +
            `Do not regenerate inline via chatToFreeform; the depth lives in internal-solutions-journeymapper/. ` +
            `If you see this error, the dispatcher in CorpusChatPanel.tsx around line 6264 lost its routing branch.`
        );
    }
    switch (kind) {
        case 'org':
            return `        ORG CHART body must contain:\n` +
                `        • A title region naming the organization or division\n` +
                `        • A root node (the highest-ranking person/team) prominently placed\n` +
                `        • Direct-report nodes connected to the root (cards with name + role + department)\n` +
                `        • Lower-tier nodes for each subsequent level (clone the node element per person)\n` +
                `        • Visual connectors (lines or implicit alignment) showing reporting relationships\n` +
                `        • Department/cluster bands or labels grouping related teams (if exemplar uses them)\n` +
                `        • Vacancy markers for explicitly-unfilled roles (if any in the corpus)\n` +
                `        Use real names from the corpus. Do not collapse multiple individuals into a generic "Team" node ` +
                `unless the corpus describes them only as a collective.\n\n` +
                `        LAYOUT DISCIPLINE - HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • The slide is exactly 1920px × 1080px. Nothing may extend past those bounds.\n` +
                `        • The exemplar diagram lives inside an inline <svg viewBox="0 0 1808 820"> with absolute x/y coordinates. ` +
                `REUSE THAT EXACT viewBox - do NOT replace the SVG with flex/grid <div> boxes (those overflow when node count exceeds row capacity).\n` +
                `        • Position every node with explicit x= y= width= height= attributes inside the SVG. Compute spacing so adjacent boxes do NOT overlap.\n` +
                `        • Maximum 6 nodes per horizontal row at 220-280px node-width. If the corpus has 12 reports under one parent, USE TWO ROWS OF 6 - never one row of 12 (that crushes text into illegible 80px-wide stubs).\n` +
                `        • If you need MORE rows than the exemplar shows (e.g., 4 hierarchy tiers), COMPRESS each row to 80-100px tall with 24-32px gaps so the whole tree fits within the 820 viewBox height.\n` +
                `        • Every text label MUST fit inside its rectangle. Truncate role descriptions to one line; abbreviate long department names; or shrink box width across the whole row to keep proportions consistent.\n` +
                `        • If the corpus describes a 12-person leadership team you cannot fit cleanly, GROUP smaller teams into a band node ("L3 · Alumni Relations · 22 FTE - Lead: Morgan Ellis + 5 directs") rather than rendering each person as a tiny illegible box.\n` +
                `        • Render reporting lines with <line> or <path> elements, NOT with HTML borders, so they line up exactly with the SVG-positioned boxes.\n`;

        // 2026-05-26 - `case 'journey':` and `case 'blueprint':` REMOVED.
        // Both kinds route to /api/journey-map/generate via the dispatcher
        // in components/CorpusChatPanel.tsx; the throw stub at the top of
        // this function fails loudly if anyone bypasses the dispatcher.
        // The ~250 lines of inline journey + blueprint design guidance were
        // a 2026-05-25 depth-port of the dedicated Journey Mapper service.
        // Keeping a fork meant the two implementations would drift; the
        // service is the source of truth. See:
        // memory/feedback_journey_must_route_to_journey_mapper.md


        case 'arch':
            return `        TECHNICAL ARCHITECTURE body must contain:\n` +
                `        • A title naming the system or architecture domain\n` +
                `        • System / component boxes with names, types, and ownership\n` +
                `        • Data flow arrows between components, annotated with protocol/freq/payload where known\n` +
                `        • Tier or zone bands (presentation / application / data / external) if exemplar uses them\n` +
                `        • External actors and integrations on the periphery\n` +
                `        • Datastore icons distinguished from service components\n` +
                `        Use real system names from the corpus. Do not invent components.\n\n` +
                `        LAYOUT DISCIPLINE - HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • 4 tier bands max (presentation / application / data / integration). Each band 180px tall, 24px gap.\n` +
                `        • System box: 220-280px wide × 70-90px tall. NO box smaller than 220×70.\n` +
                `        • Max 6 system boxes per tier band horizontally. If more, USE 2 ROWS within the tier (compress to 60px tall each).\n` +
                `        • Connectors are 2px-stroke <line> or <path> between explicit (x1,y1)→(x2,y2) points. Connectors NEVER cross THROUGH a system box - route around with a midpoint.\n` +
                `        • Every arrow has an explicit head at its receiving end. Bidirectional arrows have heads at both ends in DIFFERENT colors.\n` +
                `        • Annotation labels at midpoint with 12px perpendicular offset. Background fill required if connector passes near other geometry.\n` +
                `        • 30px exclusion zone perpendicular to every connector and tier divider. NO text bounding box intersects this zone.\n` +
                `        • Datastore icons MUST use cylinder shape from exemplar. Service icons MUST use rounded-rect shape. NEVER swap.\n` +
                `        • Hard char caps: 22 chars/line at 11.5px, 18/line at 14px, 14/line at 16px. System box labels capped at 22 chars; annotations at 18 chars.\n` +
                `        • Density: ≤8 systems = full annotation; 8-15 = standard; 15-30 = cluster grouping ("Marketing Stack - 5 systems"); 30+ = top-N + appendix footnote.\n` +
                `        • DO NOT inherit the exemplar's exact coordinates when your system count differs. RECOMPUTE positions.\n`;

        case 'roadmap':
            return `        ROADMAP body must contain:\n` +
                `        • A title naming the roadmap scope and time window\n` +
                `        • Phase or horizon columns/rows (Now / Next / Later, OR Phase 1 / 2 / 3, OR quarters)\n` +
                `        • For each phase: label, date or duration, list of initiatives or milestones, ` +
                `owner assignments where known\n` +
                `        • Workstream rows if the exemplar uses Gantt-style layout\n` +
                `        • Dependency markers between milestones if the corpus describes them\n` +
                `        • Status indicators (committed / planned / aspirational) per item\n` +
                `        Use real dates from the corpus or mark as TBD/tentative. Do not invent timelines.\n\n` +
                `        LAYOUT DISCIPLINE - HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • Phase columns equal width unless durations differ by >20%. Min 280px, max 520px per phase.\n` +
                `        • Phase header band 60px tall at body top, contains phase name + duration + status pill.\n` +
                `        • Phase divider drawn FIRST (2px vertical, full body height) so phase content paints over it.\n` +
                `        • Status pills MUST be visually distinct: committed = solid accent fill; planned = outlined accent; aspirational = dashed gray. Reader distinguishes at a glance - NEVER use text alone.\n` +
                `        • Gantt: workstream rows ≥48px tall when bars carry labels. NEVER compress below 32px.\n` +
                `        • Today-marker: full body height, 2px dashed rust line, labeled "TODAY" at top.\n` +
                `        • Milestone diamond 18×18px centered on date column.\n` +
                `        • Bar text inside-the-bar IF bar ≥240px wide; otherwise outside with 8px gap on whichever side has more whitespace.\n` +
                `        • 24px exclusion zone perpendicular to every phase divider. NO text bounding box may intersect.\n` +
                `        • Hard char caps: 22 chars/line at 11.5px (milestone callouts, bar labels); 18/line at 14px (initiative names); 14/line at 16px (phase names).\n` +
                `        • Density: ≤6 phases or ≤8 workstreams = full annotation; 6-12 / 8-16 = standard; 12-20 / 16-25 = cluster initiatives by capability; 20+ / 25+ = top-N + appendix footnote.\n` +
                `        • DO NOT inherit the exemplar's coordinates when your phase count differs. RECOMPUTE column widths.\n`;

    }
}

/**
 * 2026-05-12 - Verbalized-Sampling emphasis preamble for freeform-HTML
 * artifacts (journey, blueprint, org, arch, roadmap). The per-kind design
 * spec already locks the LAYOUT (swimlanes, exact y-coordinates, font roles).
 * What still mode-collapses is which step/lane/metric gets visual emphasis,
 * which framing angle dominates, and which moment is treated as the focal
 * "key finding". VS at the EMPHASIS layer forces the model to enumerate four
 * candidate framings (the modal one + three non-modal) before committing.
 *
 * This is the same mechanic as VS for themes/recommendations - surface k
 * candidates with probabilities, commit to one - but transposed onto the
 * narrative-emphasis dimensions of a single diagram. The probability < 0.25
 * threshold is looser than themes/recs because the layout constraints already
 * narrow the candidate space substantially; deeper tail sampling would push
 * the model into incompatible framings.
 */
function buildEmphasisVSPreamble(kind: FreeformKind): string {
    // Per-kind emphasis axes - what the model gets to vary across candidates.
    const axes: Partial<Record<FreeformKind, { focal: string; framing: string; emotion: string; metric: string }>> = {
        journey: {
            focal: 'which step is the focal moment-of-truth (one and only one)',
            framing: 'whether the journey is framed as friction-cascade, expectation-mismatch, capability-gap, or trust-erosion',
            emotion: 'which emotion peak anchors the synthesis row (frustration vs anxiety vs hope vs determination)',
            metric: 'which projected-impact metric becomes the inverted "key finding" tile',
        },
        blueprint: {
            focal: 'which step carries the intervention emphasis (one and only one)',
            framing: 'whether the redesign is framed as friction-removal, value-creation, automation-shift, or trust-rebuild',
            emotion: 'which emotion arc the outcome curve depicts (rust to accent vs mute to accent vs accent throughout)',
            metric: 'which projected-impact tile becomes the inverted "key finding"',
        },
        arch: {
            focal: 'which system box is the anchor / central component (one and only one)',
            framing: 'whether the architecture is framed by data flow, by integration map, by capability tier, or by failure modes',
            emotion: 'n/a - architecture has no emotion arc',
            metric: 'which capability dimension dominates the right-rail paragraph',
        },
        roadmap: {
            focal: 'which initiative is the "today-marker" focal commitment (one and only one)',
            framing: 'whether the roadmap is framed by capability building, by stakeholder readiness, by risk reduction, or by quick-win sequencing',
            emotion: 'n/a - roadmap is sequencing, not emotion',
            metric: 'which workstream gets the inverted "key finding" emphasis',
        },
        org: {
            focal: 'which role/team is the anchor of the chart (one and only one)',
            framing: 'whether the org is framed by reporting hierarchy, by capability domains, by stakeholder coalitions, or by decision authority',
            emotion: 'n/a - org chart has no emotion arc',
            metric: 'which stakeholder annotation becomes the corner callout',
        },
    };
    const a = axes[kind];
    if (!a || !a.focal) return '';
    return `
=== EMPHASIS VS PREAMBLE - apply BEFORE drafting the body ===

The per-kind layout spec below locks the STRUCTURE (lanes, coordinates, font
roles, swimlane positions). What still mode-collapses is EMPHASIS - which
moment is highlighted, which framing dominates, which metric becomes the key
finding. Before drafting body content, write a brief <emphasis_vs> block
enumerating FOUR candidate framings with explicit probabilities. ONE of them
will be your modal/conventional choice (the obvious framing every consultant
would pick); THREE must be non-modal alternatives explicitly grounded in
DIFFERENT facets of the corpus.

For each candidate, emit:
  - probability: a numeric value in (0, 0.25). NO candidate may exceed 0.25.
  - focal: ${a.focal}
  - framing: ${a.framing}
  - emotion: ${a.emotion}
  - metric: ${a.metric}
  - rationale: one sentence (≤30 words) on why a senior reviewer would defend this choice over the others

Then commit to ONE candidate via <commit_to>candidate_N</commit_to>. The
remaining body draft inherits that candidate's focal/framing/emotion/metric
choices throughout.

CRITICAL: writing probability < 0.25 is your commitment device. DO NOT
default to the highest-probability "modal" candidate just because it's safe.
The user already has the modal framing in their head - your value is
surfacing the framing the model would otherwise mode-collapse away from.

Format:

<emphasis_vs>
  <candidate id="1" probability="0.22">
    focal: ...
    framing: ...
    emotion: ...
    metric: ...
    rationale: ...
  </candidate>
  <candidate id="2" probability="0.18">
    ...
  </candidate>
  <candidate id="3" probability="0.12">
    ...
  </candidate>
  <candidate id="4" probability="0.08">
    ...
  </candidate>
</emphasis_vs>
<commit_to>candidate_N</commit_to>
<why_committed>One sentence on why this candidate beats the alternatives.</why_committed>

=== END EMPHASIS VS PREAMBLE ===
`;
}

async function buildPrompt(args: FreeformGenerateArgs, bundle: { exemplarHtml: string; brandSkill: string; diagramSkill: string }): Promise<string> {
    const sections: string[] = [];

    // 2026-05-08 - Universal tone rules at the top of every freeform prompt
    // (journey, blueprint, org, arch, roadmap). Forces balanced framing,
    // opportunity-led narrative, pragmatic action verbs, and bans
    // catastrophizing metaphors / hyperbole / jargon in any text emitted
    // inside the rendered HTML.
    sections.push(UNIVERSAL_TONE_RULES_INLINE);

    // 2026-05-25 - ANTI-SLOP UPLIFT
    // Patterns ingested from ignorance.ai "Field Guide to AI Slop", Wikipedia
    // "Signs of AI writing", Algorithmic Bridge "10 Signs of AI Writing".
    // The model receives these as MUST-NOT generation constraints - runtime
    // post-processor catches anything that slips through.
    sections.push(
        `\n=== ANTI-SLOP - MUST-NOT GENERATION CONSTRAINTS ===\n` +
        `\n` +
        `VERBAL TICS - never use these words/phrases ANYWHERE in the rendered output:\n` +
        `  delve, delves into, delving into, tapestry, rich tapestry, tapestry of,\n` +
        `  testament, is a testament, stands as a testament, meticulous, meticulously,\n` +
        `  nestled, vibrant, enduring legacy, interplay, garner, garnered, intricate,\n` +
        `  intricacies, showcase, showcasing, bolster, bolsters, bolstered, foster,\n` +
        `  fostering, fosters, enhance/enhances/enhancing (use "improve" / "make better"),\n` +
        `  boasts (use "has"), paramount, of paramount, valuable insights, cultural\n` +
        `  landscape, broader landscape, utilize (use "use"), comprehensive, foundational,\n` +
        `  multifaceted, leveraging, facilitate (use "help" / "let"),\n` +
        `  facilitating, facilitates.\n` +
        `\n` +
        `PIVOTAL-MOMENT PUFFERY - never emit:\n` +
        `  pivotal moment, pivotal role, plays a pivotal/crucial/key/vital role,\n` +
        `  plays a role in the ecosystem, marks a pivotal moment, represents a paradigm,\n` +
        `  embodies the, epitomizes.\n` +
        `\n` +
        `COPULA AVOIDANCE - write "is" instead of these elaborate verbs:\n` +
        `  serves as a → is a\n` +
        `  stands as a → is a\n` +
        `  marks the / marks a → is the / is a\n` +
        `  represents the → is the\n` +
        `  features (vs. has) → has\n` +
        `\n` +
        `RHETORICAL PATTERNS - never use:\n` +
        `  "It's not X, it's Y"  /  "Not just X, but Y"  - reflexive AI parallelism\n` +
        `  Snappy triads of adjectives ("fast, efficient, and reliable")\n` +
        `  Mid-sentence rhetorical questions ("The solution? It's simpler than you think.")\n` +
        `  "Something shifted." / "Everything changed." - unearned profundity\n` +
        `  "But here's the thing -"  - false-revelation transition\n` +
        `  "We are excited/thrilled/delighted to..." - press-release voice\n` +
        `\n` +
        `FORMAT TELLS:\n` +
        `  • NEVER emit Unicode bold/italic stylization characters (e.g. mathematical bold script).\n` +
        `  • NEVER use em-dash characters (U+2014) ANYWHERE in the rendered HTML output. Use comma, semicolon, colon, period, or parenthesis instead. Em-dashes are the single strongest AI-writing rhythm tell. The post-processor auto-strips them; do not emit them. ASCII hyphens in compound words are fine.\n` +
        `  • NEVER emit ChatGPT artifact tags (oaicite, oai_citation, contentReference, turn0search0, attached_file).\n` +
        `  • NEVER emit graphic elements that overlap: connector lines that cross through node bounding boxes, text labels that intersect dividers or arrows, SVG paths that cross other SVG primitives without a routing midpoint. If you would draw a connector that crosses through a node, route around with a midpoint, OR move to a CSS-grid layout where the geometry is inherently collision-free.\n` +
        `\n` +
        `KNOWLEDGE-CUTOFF / AI-AWARE DISCLAIMERS - never emit:\n` +
        `  "As an AI..." / "I'm an AI..." / "As of my knowledge cutoff..." /\n` +
        `  "My training data..." / "I don't have real-time..." / "I cannot provide..." /\n` +
        `  "I should note..." / "It's worth mentioning..." / "Please note that..."\n` +
        `\n` +
        `REPORTING-DEPTH METADATA - never render as visible chrome:\n` +
        `  "Run ID:", "Pipeline version", "Framework version", "Reproducibility hash",\n` +
        `  "Confidence: HYPOTHESIS/EMERGING/VERIFIED", "Segment size:", "Mental model:",\n` +
        `  "Non-goal:", "Persona type:", "(composite)" / "(synthetic)" name suffixes,\n` +
        `  "↪ resolves:" arrows, "Phase 0X · Wk YY-ZZ" eyebrow stamps, "Pass 1B" /\n` +
        `  "Phase 1C" pipeline-stage indicators, raw "[CHUNK_XXX]" markers.\n` +
        `\n` +
        `If the corpus genuinely doesn't support a claim, OMIT the claim and narrow\n` +
        `the surrounding prose to what IS evidenced. NEVER add a debug tag or QA\n` +
        `annotation. The reader sees a finished consulting artifact, never a\n` +
        `debugging trace.\n` +
        `\n` +
        `POSITIVE COUNTER-PATTERNS - write like this instead:\n` +
        `  • Concrete over abstract: "ATS rejects 48% of resumes" (not "comprehensive solutions")\n` +
        `  • Specific over hedged: "8 of 12 interviews show..." (not "many participants suggested")\n` +
        `  • Named over generic: "Higher Ed Dive (2025)" (not "research indicates")\n` +
        `  • Conviction over balance: lead with the finding, not "while X has benefits, Y has challenges"\n` +
        `  • Vary sentence length and rhythm. AI-rhythm is monotonously consistent.\n`
    );

    // 2026-05-12 - Emphasis-VS preamble. Forces the model to enumerate 4
    // candidate framings with probabilities and commit to one before
    // drafting body content. Layered ABOVE the locked layout spec so the
    // body construction honors the chosen framing rather than mode-
    // collapsing to the modal one.
    const vsPreamble = buildEmphasisVSPreamble(args.kind);
    if (vsPreamble) sections.push(vsPreamble);

    // OPENING HAMMER - CAPS-LOCK critical instruction. Pattern adopted from the
    // Intelligence Augmentation Journey Mapper (internal-solutions-journeymapper),
    // which gets reliable complete-HTML output by hammering the requirement at
    // the TOP, in the MIDDLE (numbered list), and at the END (REMEMBER).
    sections.push(
        `CRITICAL INSTRUCTION: EMIT ONLY THE BODY CONTENT (children of <body>) - NOT THE FULL HTML ` +
        `DOCUMENT. The HTML shell (<!DOCTYPE>, <html>, <head>, <style>, <body> open/close, </html>) is ` +
        `preserved server-side from the exemplar; do NOT emit any of those. Start your output with the ` +
        `first body-child element (e.g. <div class="stage">) and end with its closing tag. Every opened ` +
        `tag must be closed. NO abbreviation. NO placeholders. THE PIPELINE REJECTS INCOMPLETE OUTPUT.`
    );

    sections.push(`\nKIND: ${args.kind}`);
    sections.push(`BRAND: ${args.brand}`);

    sections.push(`\n=== BRAND STYLE SKILL ===\n${bundle.brandSkill}`);
    sections.push(`\n=== DIAGRAM ILLUSTRATOR SKILL ===\n${bundle.diagramSkill}`);

    // Split the exemplar so the model only sees the BODY content as the
    // structural reference. The shell (DOCTYPE + head + style + body open + close)
    // is preserved server-side and spliced back in. This eliminates token-cap
    // truncation and CSS transcription errors.
    sections.push(`\n=== ARCHITECTURE: BODY CONTENT ONLY ===\n` +
        `The HTML shell (<!DOCTYPE>, <html>, <head> with Google Fonts + complete <style> block, <body> tag) ` +
        `is preserved server-side. You are responsible ONLY for the BODY CONTENT - the children of <body> - ` +
        `that get spliced into the shell.\n\n` +
        `This means:\n` +
        `  • Do NOT emit <!DOCTYPE html>, <html>, <head>, <style>, <body> open/close, or </html>\n` +
        `  • Emit ONLY the body innerHTML - starting with the FIRST child element of <body>, ending with the LAST child\n` +
        `  • Use the exact CSS class names from the exemplar's <style> block (.stage, .slide-frame, .slide, ` +
        `.frame, .top-band, .atmos-violet-tr, .atmos-red-bl, .grain, .brand-mark, .seal, .wordmark, etc.)\n` +
        `  • Output size will be ~5-10x smaller than re-emitting the full document\n\n` +
        `=== STEP-BY-STEP BODY CONSTRUCTION ===\n\n` +
        `Step 1 - STUDY the EXEMPLAR BODY CONTENT below as your structural reference.\n\n` +
        `Step 2 - REPLICATE the structure with adapted content:\n` +
        `        • Keep .stage > .slide-frame > .slide > .frame > .top-band layout intact\n` +
        `        • Keep all atmospheric overlay divs (.atmos-*, .grain) in their positions\n` +
        `        • Keep the brand mark / seal / wordmark / eyebrow / h1 elements in the top band\n` +
        `        • Replace TEXT INSIDE elements: title, role labels, names, body content, quotes, ` +
        `citations, stat values, date markers\n\n` +
        `Step 3 - SCALE DIMENSIONALITY by cloning structural elements:\n` +
        `        • If the exemplar has 4 swimlanes and the corpus warrants 7, COPY a swimlane <div> ` +
        `3 more times with new content\n` +
        `        • If the exemplar has 6 nodes and the corpus warrants 18, copy the node element as many ` +
        `times as needed\n` +
        `        • Trim sections the corpus does not justify; expand sections the corpus over-justifies\n\n` +
        `Step 4 - PER-KIND BODY CONSTRUCTION (what the body must contain for kind="${args.kind}"):\n` +
        perKindGuidance(args.kind) +
        `\n\nStep 5 - SELF-CHECK before emitting. Verify EVERY ITEM:\n` +
        `        [ ] I am NOT emitting <!DOCTYPE>, <html>, <head>, <style>, <body>, or </html>\n` +
        `        [ ] My output starts with the first body-child element (e.g., <div class="stage">)\n` +
        `        [ ] Every <div>, <span>, <section> I opened is closed\n` +
        `        [ ] My output ends with the closing tag of the last body-child element (e.g., </div>)\n` +
        `        [ ] No region is empty - every visual zone has brand-styled content\n\n` +
        `=== EXEMPLAR BODY CONTENT (your structural reference - adapt the text inside) ===\n` +
        splitExemplarShell(bundle.exemplarHtml).sampleBody);

    // 2026-07-02 DESIGNER-CHAT PROMPT CACHING: everything ABOVE this marker is stable per
    // (kind, brand) across Designer iterations - tone/anti-slop rules, VS preamble (kind-keyed),
    // output contract, brand + diagram skills, architecture rules, and the 30-50KB exemplar body.
    // The Claude path lifts the stable prefix into the system string where the proxy's marker
    // split sets cache_control breakpoints; non-Anthropic paths strip the marker client-side.
    // Dynamic content (corpus slice, revision artifact, title rules, user ask) follows.
    {
        const { HIC_CACHE_BREAK } = await import('../../services/aiRouter');
        sections.push(HIC_CACHE_BREAK);
    }

    if (args.corpus && args.corpus.length > 0) {
        sections.push(`\n=== RESEARCH CORPUS + UPLOADS (grounding evidence) ===\n${args.corpus.slice(0, 200000)}`);
    }

    if (args.currentArtifact) {
        sections.push(`\n=== CURRENT ARTIFACT (REVISION mode - apply user intent intelligently; preserve unchanged content; use corpus for grounded additions) ===\n` +
            `id: ${args.currentArtifact.id}\n` +
            `title: ${args.currentArtifact.title}\n` +
            `--- existing HTML body ---\n` +
            `${args.currentArtifact.html}`);
    }

    // 2026-05-19 - TITLE RULES (ABSOLUTE).
    // Bug observed: across 4 user turns asking to "eliminate claims in title",
    // model still emitted "Codifying AI-driven readiness... recovers ~15 hours
    // per cycle and mitigates placement anxiety" as the title. Titles are
    // labels of the SUBJECT being mapped, not claims about it. Claims live in
    // the body. The exemplar's <em> styling is for ONE noun phrase emphasis,
    // never a full clause.
    sections.push(
        `\n=== TITLE RULES (ABSOLUTE - APPLIES TO journey/blueprint/org/arch/roadmap) ===\n` +
        `The title is a SUBJECT LABEL identifying what is being mapped - never a finding, ` +
        `recommendation, or claim. Claims belong in the body.\n` +
        `\n` +
        `GOOD title formats (4-9 words, noun-phrase, no quantifiers):\n` +
        `  • "Co-op application lifecycle, current state"\n` +
        `  • "Donor cultivation journey, future state"\n` +
        `  • "Customer onboarding, end-to-end"\n` +
        `  • "Claims intake to adjudication"\n` +
        `\n` +
        `BAD titles (NEVER emit these patterns):\n` +
        `  • "Students navigate 20 disconnected systems" (finding, not subject)\n` +
        `  • "Codifying X recovers Y hours" (recommendation, not subject)\n` +
        `  • Any title containing %, $, numbers, "recovers", "mitigates", ` +
        `"consolidates", "reduces", "increases", "drives", "saves", time spans like ` +
        `"~15 hours", or benefit clauses like "and mitigates anxiety"\n` +
        `  • Titles with verbs in present continuous ("Codifying...", "Consolidating...", ` +
        `"Centralizing...") - those signal a recommendation, not a subject\n` +
        `\n` +
        `The <em> styling (italic + accent color) is for AT MOST ONE noun phrase ` +
        `inside the subject label - never a verb, clause, statistic, or benefit. ` +
        `If you cannot find a clean 4-9 word subject label, emit "[Subject pending - ` +
        `user must name what this journey maps]" rather than inventing a claim title.`
    );

    // 2026-05-20 - MINIMAL-BY-DEFAULT for journey + blueprint (first generation).
    // The exemplar HTML carries multiple decorative sections (phase-metadata
    // codes like S-01 / "Phase 03 · Wk 09-12", the synthesis-band with 4 KPI
    // tiles + a synthesis paragraph, and the voice-of-X row of quotes). Each
    // has been the source of repeated user pain across multiple sessions:
    //   • Wrong phase labels (e.g., "Phase 05 · Break") get replicated verbatim
    //   • KPI tiles cite numbers the user didn't ask for
    //   • Synthesis paragraph + voice-row collide in the layout when both render
    //
    // New default: on FIRST generation (currentArtifact === null) for a
    // journey or blueprint, the model OMITS these sections from the output
    // entirely. The user adds them back with explicit asks ("add KPI tiles",
    // "add a synthesis paragraph", "add voice-of-student quotes"). This
    // reverses the prior "render everything by default and force the user
    // to subtract" pattern.
    //
    // On REVISIONS (currentArtifact present), the model preserves whatever
    // sections the prior artifact contained - so if the user added them
    // back on turn 2, they stay on turn 3.
    const isFirstGen = !args.currentArtifact;
    const isJourneyOrBlueprint = args.kind === 'journey' || args.kind === 'blueprint';
    if (isFirstGen && isJourneyOrBlueprint) {
        sections.push(
            `\n=== MINIMAL-BY-DEFAULT (FIRST GENERATION ONLY) ===\n` +
            `For this initial ${args.kind} generation, EMIT ONLY the load-bearing structure:\n` +
            `  • Title + context callout (upper right)\n` +
            `  • Phase columns with phase NAME labels (no metadata codes like "Phase 01 · Wk 01-04" - just the name)\n` +
            `  • Swimlanes with role labels (STUDENT / COORDINATOR / EMPLOYER / etc.)\n` +
            `  • Activity cells inside each lane × phase intersection\n` +
            `\n` +
            `SKIP these decorative sections on the first emission (the user adds them back if needed):\n` +
            `  • Phase metadata codes: NEVER emit a ".ph-eye" div ("Phase 01 · Wk 01-04"). Removed permanently as reporting-depth metadata; the .ph-name and .ph-sys may stay\n` +
            `  • Activity codes: remove ".tcode" divs (S-01, C-01, E-01, A-01) entirely from every activity\n` +
            `  • Synthesis band: omit the entire ".synthesis-band" element (no synthesis paragraph, no KPI tiles)\n` +
            `  • Voice-of-X row: omit the entire ".voice-row" element (no per-phase quote cells)\n` +
            `\n` +
            `If you keep these sections out, the user gets a clean foundation. If they want any of them,\n` +
            `they will explicitly ask ("add the KPI tiles", "add a synthesis paragraph", "add voice-of-student\n` +
            `quotes per phase") and you regenerate WITH the requested section. Until then, OMIT.\n`
        );
    }

    // 2026-05-19 - USER-CONTROLLABLE SECTIONS.
    // The exemplar HTML contains visual zones (KPI tiles, synthesis paragraph,
    // phase metadata strip) that users frequently ask to remove for cleaner
    // current-state journey maps. Without explicit guidance, the model keeps
    // re-emitting them on every revision because they're in the exemplar
    // structure. Once removed by user request, they must stay removed.
    sections.push(
        `\n=== USER-CONTROLLABLE SECTIONS (REMOVABLE ON REQUEST) ===\n` +
        `The exemplar contains several optional decorative sections. When the user ` +
        `asks to remove any of these, DELETE the corresponding DOM nodes entirely ` +
        `from your output - do not just blank their content.\n` +
        `\n` +
        `Removable sections (match by visual purpose, the class names may vary):\n` +
        `  • Bottom KPI tile row - large numeric tiles (e.g., "20 / 100 / 60% / 256:5"). ` +
        `Remove if user says: "remove tiles", "remove KPIs", "remove bottom stats", ` +
        `"no tiles", "no stat cards".\n` +
        `  • Bottom synthesis paragraph - multi-line prose under "VOICE OF X" or ` +
        `"SYNTHESIS" label. Remove if user says: "remove synthesis", "remove the bottom ` +
        `paragraph", "drop the voice", "no synthesis block".\n` +
        `  • Phase metadata strip - small caps labels like "PHASE 01 · WK 01-04" / ` +
        `"S-01". Remove if user says: "remove metadata", "remove the phase numbers", ` +
        `"drop the WK markers", "no phase codes".\n` +
        `  • Context callout in the upper right (CLIENT, STATE, project code) - ` +
        `remove if user says: "remove context box", "no client tag".\n` +
        `\n` +
        `STICKY REMOVAL: when ACCUMULATED INSTRUCTIONS below shows the user previously ` +
        `requested removal of one of these zones, the zone STAYS REMOVED on this ` +
        `regeneration even if the current turn doesn't restate it. Removal is permanent ` +
        `unless the user explicitly re-requests it ("add the tiles back").`
    );

    // 2026-05-19 - SWIMLANE DENSITY + PHASE LABEL RULES.
    // Bug observed: journey output had 2 activities per cell on STUDENT /
    // ADVISOR / EMPLOYER lanes but only 1 on IT_SUPPORT. Also emitted
    // "PHASE 05 · BREAK" as a phase label - abstract hallucination.
    if (args.kind === 'journey' || args.kind === 'blueprint') {
        sections.push(
            `\n=== CELL ANATOMY + PHASE LABEL RULES (journey/blueprint) - 2026-05-25 ===\n` +
            `CRITICAL: The .activities container is a CSS grid expecting EXACTLY N children\n` +
            `(N = phase count). Emitting more than N .activity children per .activities\n` +
            `container collapses every dot onto the same y-coordinate and produces\n` +
            `catastrophic text overlap. THIS REPLACES THE PRIOR "3 activities + 2 pain\n` +
            `points per cell" density floor - that rule was incompatible with the\n` +
            `exemplar CSS.\n\n` +
            `EXACTLY ONE <div class="activity"> PER PHASE COLUMN. Each cell carries:\n` +
            `  (top)    <div class="alabel">One complete sentence - subject + verb + outcome</div>\n` +
            `  (middle) <div class="dot"></div>\n` +
            `  (bottom) <div class="pain">One short clause naming a specific friction</div>  â† OPTIONAL\n` +
            `\n` +
            `Quality density comes from making the SINGLE .alabel + the SINGLE .pain more\n` +
            `evidenced (named numbers, named systems, proper nouns), NOT from stacking 3\n` +
            `activity divs per cell.\n\n` +
            `The CSS ::before pseudo-element renders the "PAIN" prefix automatically -\n` +
            `DO NOT write "Pain:" or "PAIN:" inside the .pain body.\n\n` +
            `If a (lane × phase) cell genuinely has no activity in this phase (e.g., the\n` +
            `Employer lane during Term Start), emit a placeholder that preserves the\n` +
            `grid: <div class="activity"><div class="alabel">-</div><div class="dot" style="opacity:0.35"></div></div>.\n` +
            `NEVER leave a cell empty - that collapses grid alignment.\n\n` +
            `Every lane MUST emit EXACTLY N .activity children per .activities container.\n` +
            `Asymmetric child counts break the grid and AUTO-REJECT.\n\n` +
            `PHASE LABELS: every phase name is a concrete BEHAVIORAL EVENT (the moment\n` +
            `the actor's intent or system context shifts), NOT a gerund category.\n` +
            `  GOOD: "Skill triage", "Posting browse", "Submission", "Interview cycle",\n` +
            `        "Decision", "Onboarding", "Match", "Solicitation", "Triage",\n` +
            `        "Resolution".\n` +
            `  BAD:  "Preparation", "Application", "Assessment" (gerund categories),\n` +
            `        "Phase N" / "Step N" without a noun,\n` +
            `        "Break" / "Reset" / "Pause" / "Idle" / "Transition" / "Cycle",\n` +
            `        Placeholder words ("TBD", "Other", "Misc", "Various").\n\n` +
            `If the corpus does not support a clean phase noun for slot N, REDUCE the\n` +
            `phase count instead of inventing an abstract one. 4 strong phases beats\n` +
            `5 phases where the last is "Break".\n\n` +
            `NEVER emit an .ph-eye eyebrow stamp like "Phase 0X · Wk YY-ZZ". The phase\n` +
            `NAME (and optional .ph-sys system callout) is all the reader needs.\n` +
            `Reporting-depth metadata stamps are AI-slop chrome - strip them.`
        );
    }

    // 2026-05-19 - ACCUMULATED INSTRUCTIONS across prior turns.
    // The Designer Desk chat is turn-amnesic without this block. When user
    // has corrected the same issue 2-3 times, they expect cumulative
    // compliance - they will not state a rule a fourth time.
    if (args.priorUserInstructions && args.priorUserInstructions.length > 0) {
        const numbered = args.priorUserInstructions
            .map((msg, i) => `  ${i + 1}. ${msg.trim().replace(/\s+/g, ' ').slice(0, 600)}`)
            .join('\n');
        sections.push(
            `\n=== ACCUMULATED USER INSTRUCTIONS (PRIOR TURNS - APPLY ALL) ===\n` +
            `The user has made the following requests across prior turns of this ` +
            `artifact's chat session. ALL of them remain in force on this regeneration ` +
            `- the user has not retracted any. If a prior turn told you to remove ` +
            `something, it STAYS REMOVED. If a prior turn told you to change tone, the ` +
            `tone STAYS CHANGED. The user will not state these rules again - they ` +
            `expect strict cumulative compliance.\n` +
            `\n${numbered}\n` +
            `\nIf a current-turn request conflicts with a prior turn, the CURRENT turn ` +
            `wins (the user is updating). Otherwise, prior turns are still active rules.`
        );
    }

    // 2026-05-19 - CROSS-SESSION LEARNED CONSTRAINTS injection.
    // Previously broken: the Designer Desk captured user feedback via
    // classifyMessage + logChatFeedback (DesignDeskChat.tsx:244/248) and
    // persisted high-confidence rules to wiki/synthesis/learned-constraints.md,
    // but the Designer's own regeneration path never called
    // getActiveConstraints() - so the loop was open. Capture without read-back.
    // This block closes the loop: every freeform regeneration now pulls the
    // active learned-constraints set and applies it. Constraints accumulate
    // across sessions (loadWikiConstraints runs on App.tsx boot at line 1609)
    // and cross-engagement (any session writes to the same wiki ledger).
    //
    // 2026-05-20 - Now SCOPED by artifact kind. Each rule carries an
    // artifactKind tag set at capture time. The scoped getter returns ONLY
    // rules tagged for this artifact (plus universal 'all' rules), so a
    // density preference said during a journey iteration doesn't pollute
    // persona generation.
    try {
        // Dynamic import keeps the dependency unidirectional and survives
        // bundle splitting. promptImprovementEngine is the SSOT for the
        // constraint store; calling getActiveConstraints(kind) is read-only.
        const { getActiveConstraints } = await import('../../services/promptImprovementEngine');
        const learned = getActiveConstraints(args.kind);
        if (learned && learned.trim().length > 0) {
            sections.push(
                `\n=== LEARNED CONSTRAINTS (cross-session, from prior user feedback) ===\n` +
                `These constraints were learned from feedback the user (or other users) ` +
                `gave on prior chat regenerations of "${args.kind}" artifacts (and universal rules ` +
                `applicable to any artifact). They are HARD RULES - apply them unless a ` +
                `current-turn instruction explicitly retracts one. The user expects ` +
                `compounding improvement: the SAME mistake should NOT recur on this ` +
                `regeneration.\n` +
                `${learned.trim()}`
            );
            console.log(`[chatToFreeform] injected learned constraints (kind=${args.kind}): ${learned.split('\n').length - 3} rule(s)`);
        } else {
            // Visible no-op so we can SEE the loop is alive even when empty.
            console.log(`[chatToFreeform] no learned constraints active for kind=${args.kind} yet`);
        }
    } catch (constraintLoadErr) {
        // Non-fatal: if the engine fails to load, the regeneration still runs
        // with the rest of the prompt. We log so this is visible if it happens.
        console.warn('[chatToFreeform] learned-constraints load failed (non-fatal):', constraintLoadErr);
    }

    sections.push(`\n=== USER REQUEST (CURRENT TURN) ===\n${args.userPrompt}`);

    // MIDDLE HAMMER - body-only emission requirements
    sections.push(`\n=== CRITICAL EMISSION REQUIREMENTS ===\n` +
        `1. Emit ONLY the BODY CONTENT (the innerHTML of <body>). The shell is preserved server-side.\n` +
        `2. Do NOT emit <!DOCTYPE html>, <html>, <head>, <style>, <link>, <body> open/close, or </html>\n` +
        `3. Your output must START with the first body-child element (typically <div class="stage">)\n` +
        `4. Your output must END with the closing tag of the last body-child element (typically </div>)\n` +
        `5. Every <div>, <span>, <section>, <article>, <header>, <footer> you open MUST be closed\n` +
        `6. Use the exact CSS class names from the exemplar - they are defined in the preserved <style>\n` +
        `7. NO abbreviation, NO "// rest unchanged" comments, NO "..." placeholders - ship complete content\n` +
        `8. NO markdown code fences around the :::nxt:freeform block\n` +
        `9. EVERYTHING fits inside 1920×1080. If the exemplar uses an inline <svg viewBox="...">, REUSE THAT viewBox unchanged - do not swap SVG for flex/grid <div> rows that overflow when item count grows.\n` +
        `10. Maximum 6 same-tier items per row. If the corpus needs 12, render two rows of 6, NOT one row of 12 with crushed 80px-wide cards.\n` +
        `11. If text would not fit inside a card at the exemplar's box dimensions, EITHER (a) shrink all cards in that row proportionally so text still reads, OR (b) group items into a band/cluster card with a count-and-leader summary instead of one tiny card per item.\n` +
        `12. TEXT-vs-LINE CLEARANCE: every horizontal connector / lane line at y=Y has a 36px exclusion zone above AND below. NO text bounding box may intersect [Y−36, Y+36]. When labels need more than that, position them above_band_top + 18px or below_band_bottom − 18px and ENLARGE the band rather than overlapping the line.\n` +
        `13. MULTI-LINE LABELS ≤ 2 LINES. Hard char caps per line based on font size: 22 chars at 11.5px, 18 at 14px, 14 at 16px. If your content exceeds, TRUNCATE with "..." or escalate to a band-card "{N} items - see appendix".\n` +
        `14. ZIGZAG STAGGER: when more than 4 milestones / step boxes / nodes share a single horizontal line, alternate label position above and below the line (even-index above, odd-index below). NEVER stack 5+ labels on the same side.\n` +
        `15. RECOMPUTE COORDINATES. The exemplar's exact x/y values reflect the EXEMPLAR's content lengths. Your content has different lengths. RECALCULATE offsets so labels still clear lines and boxes still don't overlap their neighbors. Inherit the STRUCTURE (which classes go where), NOT the literal coordinates.\n` +
        `16. TRUNCATION CAPS: action title ≤100 chars (complete sentence), lede ≤280 chars, verbatim quote ≤200 chars (with "..." + attribution intact), stage/step/phase labels ≤24 chars.\n`);

    sections.push(`\n=== OUTPUT CONTRACT ===\n` +
        `Return EXACTLY one block of this form, with no preamble, no markdown fences, no trailing prose:\n\n` +
        `:::nxt:freeform\n` +
        `{ "id": "${args.currentArtifact?.id ?? `f_${Date.now()}`}", ` +
        `"kind": "${args.kind}", "brand": "${args.brand}", ` +
        `"title": "<action title - what this artifact represents>", ` +
        `"citations": [{"label":"<fact>","source":"<named source>"}] }\n` +
        `---\n` +
        `<div class="stage">\n` +
        `  <div class="slide-frame">\n` +
        `    <div class="slide">\n` +
        `      ...complete adapted body content here, structurally inheriting from the exemplar...\n` +
        `    </div>\n` +
        `  </div>\n` +
        `</div>\n` +
        `:::`);

    // CLOSING HAMMER - final REMEMBER reminder (recency bias). Hammered at top + middle + end.
    sections.push(
        `\nREMEMBER: EMIT ONLY THE BODY CONTENT - children of <body>, no shell. ` +
        `Start with the FIRST body-child element (e.g., <div class="stage">), end with its closing tag. ` +
        `Do NOT emit <!DOCTYPE>, <html>, <head>, <style>, <body> open/close, or </html> - those are ` +
        `preserved server-side. Every opened tag must be closed. No abbreviation. ` +
        `THE PIPELINE WILL REJECT INCOMPLETE OUTPUT.`
    );

    return sections.join('\n');
}

/**
 * Body-content completeness check. The model now emits ONLY the body content
 * (children of <body>); the shell is preserved server-side. So we verify the
 * body content is well-formed and uses the expected exemplar classes.
 *
 * Returns null if body content is complete; returns a specific error string
 * otherwise. No fallbacks - incomplete output is surfaced as a hard failure.
 */
function checkBodyContentCompleteness(bodyContent: string, kind?: FreeformKind): string | null {
    if (!bodyContent || bodyContent.length < 200) {
        return `body content too short (${bodyContent?.length ?? 0} chars) - likely truncated or empty`;
    }

    // Reject output that mistakenly includes the shell tags. Use word-boundary
    // regex - substring matching breaks because `<header` starts with `<head`,
    // and the exemplars legitimately contain <header class="top-band">.
    if (/<!doctype\b/i.test(bodyContent)) return 'output incorrectly includes <!DOCTYPE> - emit ONLY body content';
    if (/<html\b/i.test(bodyContent))     return 'output incorrectly includes <html> tag - emit ONLY body content';
    if (/<head\b(?!er)/i.test(bodyContent)) return 'output incorrectly includes <head> tag - emit ONLY body content (note: <header> is allowed)';
    if (/<body\b/i.test(bodyContent))     return 'output incorrectly includes <body> tag - emit ONLY body content (children of <body>)';

    // Verify the .stage / .slide-frame structural classes are present
    if (!/\bstage\b/.test(bodyContent) && !/\bslide-frame\b/.test(bodyContent)) {
        return 'missing .stage or .slide-frame element - model did not preserve the exemplar frame structure';
    }

    // Tag balance check - every opened element should be closed.
    // Coarse but effective: count opens vs closes for common block elements.
    const openDivs = (bodyContent.match(/<div\b[^>]*>/gi) ?? []).length;
    const closeDivs = (bodyContent.match(/<\/div\s*>/gi) ?? []).length;
    if (openDivs !== closeDivs) {
        return `unbalanced <div> tags: ${openDivs} opened, ${closeDivs} closed - output truncated mid-element`;
    }

    // Blockquote balance (matters for journey/blueprint .vq verbatim quote cells)
    const openBQ = (bodyContent.match(/<blockquote\b[^>]*>/gi) ?? []).length;
    const closeBQ = (bodyContent.match(/<\/blockquote\s*>/gi) ?? []).length;
    if (openBQ !== closeBQ) {
        return `unbalanced <blockquote> tags: ${openBQ} opened, ${closeBQ} closed - verbatim-quote cell likely truncated`;
    }

    // Per-kind depth contract (post-JM uplift, 2026-05-25).
    if (kind) {
        const depthError = checkKindSpecificDepth(bodyContent, kind);
        if (depthError) return depthError;
    }

    return null;
}

/**
 * Per-kind structural depth check. For #journey this enforces the Journey
 * Mapper-derived depth contract:
 *   - dashboard block with personas + overall_pain_points + overall_opportunities + kpi tiles
 *   - cell-internal richness: ≥40% .vq density, ≥60% .tp density, ≥80% .emo density
 *   - exactly one .phase-head.focal
 *   - no deprecated swimlane classes
 *
 * Returns null if depth is acceptable; otherwise a specific error string.
 * The pipeline treats this as a hard failure so depth regressions can't ship.
 */
function checkKindSpecificDepth(bodyContent: string, kind: FreeformKind): string | null {
    if (kind === 'journey') {
        // Retired swimlane classes - auto-reject if any leaked from older
        // exemplar bodies or older prompts.
        const retired = ['phase-strip', 'lane-track', 'emotion-arc', 'opportunity-row', 'voice-row', 'synthesis-band'];
        for (const cls of retired) {
            if (new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`).test(bodyContent)) {
                return `journey uses retired swimlane class ".${cls}". Migrated to grid-table layout 2026-05-25 - see exemplar-skills/diagrams/journey-illustrator/SKILL.md`;
            }
        }

        // Grid container required
        if (!/class="(?:[^"]*\s)?grid(?:\s[^"]*)?"/.test(bodyContent)) {
            return 'journey lacks required .grid container (the shared blueprint grid-table layout)';
        }

        // Cell count
        const cellMatches = bodyContent.match(/class="(?:[^"]*\s)?cell(?:\s[^"]*)?"/gi) ?? [];
        const cellCount = cellMatches.length;
        if (cellCount < 6) {
            return `journey has only ${cellCount} .cell elements - minimum 6 (e.g., 2 lanes × 3 phases). Likely a layout truncation, not a deliberate choice`;
        }

        // Focal phase: must be EXACTLY one
        const focal = (bodyContent.match(/class="(?:[^"]*\s)?phase-head\s+focal(?:\s[^"]*)?"/g) ?? []).length;
        if (focal !== 1) {
            return `journey has ${focal} .phase-head.focal elements; must be exactly 1 (the recommendation-intervention column)`;
        }

        // Depth contract - verbatim quote density (skill spec ≥40%)
        const vqCount = (bodyContent.match(/<blockquote\b[^>]*class="(?:[^"]*\s)?vq(?:\s[^"]*)?"/gi) ?? []).length;
        const vqRatio = cellCount > 0 ? vqCount / cellCount : 0;
        if (vqRatio < 0.30) {
            return `journey verbatim-quote density ${(vqRatio * 100).toFixed(0)}% (${vqCount} .vq across ${cellCount} cells); contract minimum is 40% (warn-floor 30%). Add verbatim corpus quotes to cells`;
        }

        // Depth contract - named touchpoint density (skill spec ≥60%)
        const tpCount = (bodyContent.match(/class="(?:[^"]*\s)?tp(?:\s[^"]*)?"/gi) ?? []).length;
        const tpRatio = cellCount > 0 ? tpCount / cellCount : 0;
        if (tpRatio < 0.50) {
            return `journey named-touchpoint density ${(tpRatio * 100).toFixed(0)}% (${tpCount} .tp across ${cellCount} cells); contract minimum 60% (warn-floor 50%). Add named touchpoint channels to cells`;
        }

        // Depth contract - emotion specificity (skill spec ≥80%)
        const emoCount = (bodyContent.match(/class="(?:[^"]*\s)?emo(?:\s[^"]*)?"/gi) ?? []).length;
        const emoRatio = cellCount > 0 ? emoCount / cellCount : 0;
        if (emoRatio < 0.60) {
            return `journey emotion specificity ${(emoRatio * 100).toFixed(0)}% (${emoCount} .emo across ${cellCount} cells); contract minimum 80% (warn-floor 60%). Add per-cell emotion + intensity`;
        }

        // Dashboard presence
        const hasDashboard = /class="(?:[^"]*\s)?kpi-dashboard(?:\s[^"]*)?"/.test(bodyContent);
        const hasKpiTiles = /class="(?:[^"]*\s)?kpi-tiles?(?:\s[^"]*)?"/.test(bodyContent) || (bodyContent.match(/class="(?:[^"]*\s)?kpi-tile(?:\s[^"]*)?"/g) ?? []).length >= 3;
        const hasPersonas = /class="(?:[^"]*\s)?personas?(?:\s[^"]*)?"/.test(bodyContent);
        const hasOverallPain = /class="(?:[^"]*\s)?overall-pain(?:\s[^"]*)?"/.test(bodyContent);
        const hasOverallOpp = /class="(?:[^"]*\s)?overall-opp(?:\s[^"]*)?"/.test(bodyContent);
        const dashSignals = [hasDashboard, hasKpiTiles, hasPersonas, hasOverallPain, hasOverallOpp].filter(Boolean).length;
        if (dashSignals < 3) {
            return `journey dashboard underbuilt: only ${dashSignals}/5 signals (dashboard wrapper, kpi tiles, personas, overall-pain, overall-opp). Dashboard is required at top of body`;
        }

        // No reporting-depth metadata leaks
        if (/class="(?:[^"]*\s)?ph-eye(?:\s[^"]*)?"/.test(bodyContent)) {
            return 'journey contains .ph-eye phase-metadata stamps (e.g. "Phase 0X · Wk YY-ZZ") - banned 2026-05-25 as reporting-depth metadata';
        }
        if (/class="(?:[^"]*\s)?tphase(?:\s[^"]*)?"/.test(bodyContent)) {
            return 'journey KPI tile contains .tphase mini-tag - banned 2026-05-25. Phase reference belongs in tile prose';
        }
    }

    // Blueprint inherits the journey grid contract with different framing fields
    if (kind === 'blueprint') {
        if (!/class="(?:[^"]*\s)?grid(?:\s[^"]*)?"/.test(bodyContent)) {
            return 'blueprint lacks required .grid container (shared grid-table layout with journey)';
        }
    }

    return null;
}

// ─── 2026-05-25 - ARTIFACT ENGINE KIND MAP ───────────────────────────────
// Every freeform kind now routes through the unified /api/artifact/* proxy
// engine. Journey gets special-cased to JM's two-pass pipeline; all other
// kinds use the generic Claude-driven generator with the kind-specific
// skill markdown as the system prompt. This unifies brand override +
// anti-slop + launcher-card + self-improvement across the deliverable suite.
const ARTIFACT_ENGINE_KINDS = new Set<string>([
    'journey', 'blueprint', 'persona', 'prd', 'roadmap', 'recommendation',
    'strategy-slide', 'strategy', 'brief', 'org', 'arch', 'gap-analysis',
    'tech-audit', 'competitive', 'presentation', 'mindmap', 'brief-dialog',
    'meta-themes', 'research-plan', 'case-study',
]);

export async function generateFreeformArtifact(args: FreeformGenerateArgs): Promise<FreeformGenerateResult> {
    // ─── ARTIFACT ENGINE ROUTE - unified across every kind ────────────────
    // Generation path: hits /api/artifact/generate (which special-cases
    // journey to the JM IA service internally). Revision path: hits
    // /api/artifact/revise with the current HTML + user instruction.
    if (ARTIFACT_ENGINE_KINDS.has(args.kind)) {
        const isRevision = !!args.currentArtifact && typeof (args.currentArtifact as any).html === 'string' && (args.currentArtifact as any).html.length > 100;
        const endpoint = isRevision ? '/api/artifact/revise' : (args.kind === 'journey' ? '/api/journey-map/generate' : '/api/artifact/generate');
        // 2026-06-12 (audit gap #1 fix): args.model was silently DROPPED here -
        // the proxy artifact engine defaulted to claude-sonnet-4-6 while the
        // caller believed claude-opus-4-8 was generating. llm_model now rides
        // both generate and revise bodies.
        const llmModel = resolveProviderModelId(args.model);
        // 2026-10-01 (plan Stage 4.3 / D6): the SPA's routing authority decides the chain the proxy
        // walks; the proxy's own per-kind chain tables are deleted. The explicit model the user
        // picked (llm_model) heads the chain; the authority supplies the fallbacks.
        const modelChain = Array.from(new Set([llmModel, ...artifactModelChain(args.kind)].filter(Boolean)));
        const reqBody = isRevision
            ? {
                  kind: args.kind,
                  brand: args.brand,
                  current_html: (args.currentArtifact as any).html,
                  revision_instruction: args.userPrompt,
                  llm_model: llmModel,
                  model_chain: modelChain,
              }
            : {
                  kind: args.kind,
                  brand: args.brand,
                  goal: args.userPrompt,
                  description: '',
                  journey_type: 'general',
                  corpus: args.corpus || '',
                  llm_model: llmModel,
                  model_chain: modelChain,
              };
        try {
            // 2026-10-01 (plan Stage 4.5 / D10): job + poll instead of one long-held POST. The proxy
            // runs the same handler in the background and persists the job to disk (multi-worker
            // safe); the SPA polls every few seconds with a 15-minute ceiling and an AbortSignal, so a
            // dropped socket no longer loses a finished artifact.
            const resp = await runProxyJob(endpoint, reqBody, { timeoutMs: 15 * 60 * 1000 });
            if (resp.ok) {
                const data = await resp.json();
                if (data?.ok && data?.html) {
                    const launcherUrl = data.launcher_url ? `http://localhost:5012${data.launcher_url}` : '';
                    const citations: Array<{ label: string; source: string }> = [];
                    if (launcherUrl) {
                        citations.push({
                            label: `Open full ${args.kind} report`,
                            source: launcherUrl,
                        });
                    }
                    const artifact: FreeformArtifact = {
                        id: `f_${Date.now()}`,
                        type: 'freeform',
                        kind: args.kind as any,
                        brand: args.brand,
                        title: (args.userPrompt || `${args.kind} report`).slice(0, 200),
                        html: data.html,
                        citations,
                        createdAt: args.currentArtifact?.createdAt ?? Date.now(),
                        updatedAt: Date.now(),
                    };
                    const modelLabel = `artifact-engine ${args.kind} via ${data.model || 'claude'}${data.source ? ` (${data.source})` : ''}`;
                    console.info(`[generateFreeformArtifact] ${isRevision ? 'REVISED' : 'GENERATED'} ${args.kind} via artifact engine (${data.html.length} chars, id=${data.artifact_id || data.journey_id}, launcher=${data.launcher_url})`);
                    return { ok: true, artifact, modelUsed: modelLabel as any };
                }
                // 2026-05-25 - DO NOT fall through to inline. The user explicitly
                // chose the artifact engine pipeline. Surface the failure with the
                // actual error so they can act on it.
                return {
                    ok: false,
                    error: `Artifact engine returned: ${data?.error || 'unknown error'}. Retry with a smaller corpus or different model.`,
                    modelUsed: 'artifact-engine-failed' as any,
                };
            }
            const errText = await resp.text();
            return {
                ok: false,
                error: `Artifact engine HTTP ${resp.status} for #${args.kind}: ${errText.slice(0, 300)}. Check proxy logs.`,
                modelUsed: 'artifact-engine-failed' as any,
            };
        } catch (engineErr: any) {
            return {
                ok: false,
                error: `Artifact engine error for #${args.kind} (model: ${args.model}): ${engineErr?.message || engineErr}. If this is a rate-limit/"Failed to fetch", the provider quota was likely briefly exhausted (e.g. a bulk job) - retry in a moment; the engine now retries transient failures automatically.`,
                modelUsed: 'artifact-engine-failed' as any,
            };
        }
    }

    let bundle;
    try {
        bundle = loadExemplar(args.kind, args.brand);
    } catch (err: any) {
        return { ok: false, error: err?.message ?? String(err) };
    }

    let prompt = await buildPrompt(args, bundle);
    // EXEMPLAR CONTRACT (2026-08-07): the Designer desk consults the hashtag exemplar
    // manifest for this KIND before composing (same rule as the Analyst desk). Fail-open.
    try {
        const { fetchExemplarContractForKind, noteExemplarConsultation } = await import('../../services/exemplarContract');
        const exemplarBlock = await fetchExemplarContractForKind(String(args.kind));
        if (exemplarBlock) {
            prompt += `\n${exemplarBlock}`;
            console.log(`[designer] exemplar-contract consulted for kind=${args.kind}: ${exemplarBlock.length} chars`);
            noteExemplarConsultation();
        }
    } catch { /* fail-open */ }

    let raw: string;
    try {
        raw = await callForModel(prompt, args.model);
    } catch (err: any) {
        return { ok: false, error: `${args.model} request failed: ${err?.message ?? String(err)}`, modelUsed: args.model };
    }

    const parsed = parseFreeformOutput(raw);
    if (parsed.ok !== true) {
        return { ok: false, error: (parsed as { ok: false; error: string }).error, rawResponse: raw, modelUsed: args.model };
    }

    // Validate that the body content the model emitted is complete and well-formed.
    // No fallback - surface the failure with raw response.
    const completenessError = checkBodyContentCompleteness(parsed.html);
    if (completenessError) {
        return {
            ok: false,
            error: `Model produced INCOMPLETE BODY CONTENT: ${completenessError}. Re-run with a more capable model (${CLAUDE_REASONING_LABEL}) or simpler request.`,
            rawResponse: raw,
            modelUsed: args.model,
        };
    }

    // Splice the model's body content back into the exemplar's intact shell.
    // shell.before = "<!DOCTYPE html>...<head>...full <style>...</head><body...>"
    // shell.after  = "</body></html>"
    // This guarantees the rendered HTML has the complete brand CSS, fonts,
    // atmospheric overlays - independent of any model truncation risk.
    const shell = splitExemplarShell(bundle.exemplarHtml);
    const fullHtml = shell.before + '\n' + parsed.html + '\n' + shell.after;

    // 2026-06-06 - Wire the universal slop scrubber into the freeform path.
    // Per the architecture audit, the runExpertPanel SKIPS LLM critics on
    // freeform-HTML to prevent target_path corruption, leaving only
    // "deterministic hygiene." Deterministic hygiene was missing the
    // META_NARRATION + METAPHOR pattern lists added 2026-06-06 to
    // slidePostProcessor. Now we run detectAllSlop + removeMetaNarration +
    // removeMetaphors on the rendered freeform body BEFORE the artifact
    // persists to the design-desk store, so journey/blueprint outputs get
    // the same anti-slop scrubbing as slide-typed deliverables.
    let scrubbedHtml = fullHtml;
    try {
        const { removeMetaNarration, removeMetaphors, detectAllSlop } =
            await import('../../services/slidePostProcessor');
        // Extract body content (between <body> tags) so we don't strip
        // CSS/script. The scrubbers run on prose text, not on style blocks.
        const bodyMatch = scrubbedHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            const bodyOpen = scrubbedHtml.slice(0, bodyMatch.index! + bodyMatch[0].indexOf('>') + 1);
            const bodyClose = '</body>' + scrubbedHtml.slice(bodyMatch.index! + bodyMatch[0].length - '</body>'.length + '</body>'.length);
            const bodyHtml = bodyMatch[1];
            const detected = detectAllSlop(bodyHtml);
            if (detected.length > 0) {
                console.warn(`[chatToFreeform/${args.kind}] slop scrubber found ${detected.length} pattern hit(s):`,
                    detected.slice(0, 5).map(d => `${d.category}:"${d.phrase.slice(0, 60)}"`).join(', '));
            }
            // Run scrubbers on body only. We deliberately scrub sentence-by-
            // sentence within text nodes, not on the raw HTML, to avoid
            // breaking tags. Quick approximation: scrub between > and < pairs.
            const scrubbedBody = bodyHtml.replace(/>([^<]+)</g, (_, text: string) => {
                const trimmed = text.trim();
                if (trimmed.length < 10) return `>${text}<`;
                const noMeta = removeMetaNarration(text);
                const noMetaphor = removeMetaphors(noMeta);
                return `>${noMetaphor}<`;
            });
            scrubbedHtml = bodyOpen + scrubbedBody + bodyClose;
        }
    } catch (slopErr: any) {
        console.warn(`[chatToFreeform/${args.kind}] slop scrubber failed (non-fatal):`, slopErr?.message || slopErr);
    }

    // WS-B (2026-06-30): resolve manifest chunk pointers ([path#cN]) to NAMED sources on the Designer
    // freeform body. buildPromptCorpusGrounded already leads the prompt with manifest chunks + a cite-by-
    // pointer instruction (Designer is manifest-first), but nothing resolved the pointers on OUTPUT, so they
    // leaked into the artifact. resolveManifestPointers swaps each pointer for its real source (WS-A per-chunk
    // attribution registered at assembleChunkCorpus) and strips any bare pointer - closing the anti-RAG
    // last hop on the Designer surface, matching the Analyst/slide path (slidePostProcessor line ~83).
    try {
        const { resolveManifestPointers } = await import('../../services/citationPointerRegistry');
        scrubbedHtml = resolveManifestPointers(scrubbedHtml);
    } catch (ptrErr: any) {
        console.warn(`[chatToFreeform/${args.kind}] pointer resolution failed (non-fatal):`, ptrErr?.message || ptrErr);
    }

    const sanitizedHtml = sanitizeFreeformHtml(scrubbedHtml);

    const candidate: FreeformArtifact = {
        id: parsed.header.id,
        type: 'freeform',
        kind: parsed.header.kind,
        brand: parsed.header.brand,
        title: parsed.header.title,
        html: sanitizedHtml,
        citations: parsed.header.citations,
        createdAt: args.currentArtifact?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
    };

    const validation = validateFreeformArtifact(candidate);
    if (validation.ok !== true) {
        return { ok: false, error: `validation: ${(validation as { ok: false; error: string }).error}`, rawResponse: raw, modelUsed: args.model };
    }

    // Log the generated HTML so when the rendered output looks wrong (e.g., the
    // model passed the completeness check but still produced visually broken HTML),
    // the user can inspect the actual emitted document via the browser console
    // and we can pinpoint exactly which CSS rule or element was malformed.
    console.info(`[Freeform] generated ${args.kind}/${args.brand} (${sanitizedHtml.length} chars). Full HTML:`, sanitizedHtml);

    // 2026-05-20 - Discriminator: score the new output, compare to prior,
    // attribute deltas to active constraints, dismiss bad ones, emit a
    // lineage record the UI can render. Failure-isolated; the artifact
    // ships regardless.
    try {
        const { discriminate, snapshotActiveConstraints } = await import('../../services/improvementDiscriminator');
        const activeConstraints = snapshotActiveConstraints(args.kind);
        discriminate({
            artifactKind: args.kind,
            artifactId: validation.value.id,
            timestamp: Date.now(),
            content: sanitizedHtml,
            activeConstraints,
        });
    } catch (discrimErr: any) {
        console.warn('[Freeform] discriminator step skipped (non-fatal):', discrimErr?.message || discrimErr);
    }

    return { ok: true, artifact: validation.value, modelUsed: args.model };
}


/**
 * Job + poll against the proxy (D10). POST /api/jobs with {op, body}; poll GET /api/jobs/<id>.
 * Returns a Response-like object so the existing `resp.ok` / `resp.json()` handling stays unchanged.
 * Falls back to the direct endpoint when the jobs API is unavailable (older proxy).
 */
export async function runProxyJob(
    endpoint: string,
    body: unknown,
    opts: { timeoutMs?: number; pollMs?: number; signal?: AbortSignal } = {},
): Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
    const base = 'http://127.0.0.1:5012';
    const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000;
    const pollMs = opts.pollMs ?? 2500;
    const wrap = (ok: boolean, status: number, data: any) => ({
        ok, status, json: async () => data, text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
    });
    let start: Response;
    try {
        start = await fetch(`${base}/api/jobs`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ op: endpoint, body }), signal: opts.signal,
        });
    } catch (e: any) {
        return wrap(false, 0, { error: e?.message || 'jobs POST failed' });
    }
    if (start.status === 404) {
        // Older proxy without the jobs API: direct call, unchanged behavior.
        const direct = await fetch(`${base}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: opts.signal });
        return direct as any;
    }
    if (!start.ok) return wrap(false, start.status, await start.json().catch(() => ({})));
    const { job_id: jobId } = await start.json();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (opts.signal?.aborted) return wrap(false, 499, { error: 'aborted' });
        await new Promise(r => setTimeout(r, pollMs));
        let poll: Response;
        try { poll = await fetch(`${base}/api/jobs/${encodeURIComponent(jobId)}`, { signal: opts.signal }); } catch { continue; }
        if (!poll.ok) continue;
        const st = await poll.json();
        if (st.status === 'done') return wrap(st.http_status >= 200 && st.http_status < 300, st.http_status || 200, st.result);
        if (st.status === 'error') return wrap(false, st.http_status || 500, st.result || { error: st.error || 'job failed' });
    }
    return wrap(false, 504, { error: `job ${jobId} did not finish within ${Math.round(timeoutMs / 1000)}s` });
}
