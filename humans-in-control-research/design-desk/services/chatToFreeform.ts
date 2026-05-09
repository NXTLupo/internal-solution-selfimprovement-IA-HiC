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

// Re-exported as a local alias so the freeform prompt builder doesn't have
// to thread the long import name through every call site.
const UNIVERSAL_TONE_RULES_INLINE = UNIVERSAL_TONE_RULES;

// 2026-05-05 — DeepSeek V4 Flash is the single-vendor primary; legacy
// Gemini/GPT entries kept for backward-compat.
export type FreeformGenerationModel = 'deepseek-v4-flash' | 'gemini-2.5-flash' | 'gemini-3.1-pro-preview' | 'gpt-5.4';

export interface FreeformGenerateArgs {
    kind: FreeformKind;
    brand: BrandHashtag;
    userPrompt: string;
    corpus: string;
    currentArtifact: FreeformArtifact | null;
    model: FreeformGenerationModel;
}

export type FreeformGenerateResult =
    | { ok: true; artifact: FreeformArtifact; modelUsed: FreeformGenerationModel }
    | { ok: false; error: string; rawResponse?: string; modelUsed?: FreeformGenerationModel };

const SYSTEM_PROMPT =
    'You are an NXT Humans Designer. You produce only the BODY CONTENT (children ' +
    'of <body>) for a 1920x1080 HTML slide. The HTML shell with all CSS, fonts, ' +
    'and atmospheric overlays is preserved server-side from the exemplar — you ' +
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
        throw new Error('exemplar HTML is missing <body> open/close tags — cannot splice');
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
        case 'gemini-2.5-flash':       return 'gemini-2.5-flash';
        case 'gemini-3.1-pro-preview': return 'gemini-3.1-pro-preview';
    }
}

// 2026-05-05 — Azure DeepSeek-V4-Flash via /api/ai/deepseek.
async function callDeepSeek(prompt: string, modelId: string): Promise<string> {
    const resp = await fetch('http://localhost:5012/api/ai/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelId,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
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
    const ai = new GoogleGenAI({ apiKey: (process as any).env?.API_KEY ?? (process as any).env?.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: MAX_TOKENS,
            temperature: TEMPERATURE,
        },
    });
    return (response as any)?.text ?? '';
}

async function callForModel(prompt: string, model: FreeformGenerationModel): Promise<string> {
    const providerId = resolveProviderModelId(model);
    if (model === 'deepseek-v4-flash') return callDeepSeek(prompt, providerId);
    if (model === 'gpt-5.4') return analyzeTextOpenAI(SYSTEM_PROMPT, prompt, providerId, MAX_TOKENS, TEMPERATURE);
    return callGemini(prompt, providerId);
}

/**
 * Per-kind body construction guidance. Each kind has different structural
 * requirements within the shared 1920x1080 frame. The model needs to know what
 * elements MUST be present in the body for that kind, beyond just visual fidelity.
 */
function perKindGuidance(kind: FreeformKind): string {
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
                `        LAYOUT DISCIPLINE — HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • The slide is exactly 1920px × 1080px. Nothing may extend past those bounds.\n` +
                `        • The exemplar diagram lives inside an inline <svg viewBox="0 0 1808 820"> with absolute x/y coordinates. ` +
                `REUSE THAT EXACT viewBox — do NOT replace the SVG with flex/grid <div> boxes (those overflow when node count exceeds row capacity).\n` +
                `        • Position every node with explicit x= y= width= height= attributes inside the SVG. Compute spacing so adjacent boxes do NOT overlap.\n` +
                `        • Maximum 6 nodes per horizontal row at 220-280px node-width. If the corpus has 12 reports under one parent, USE TWO ROWS OF 6 — never one row of 12 (that crushes text into illegible 80px-wide stubs).\n` +
                `        • If you need MORE rows than the exemplar shows (e.g., 4 hierarchy tiers), COMPRESS each row to 80-100px tall with 24-32px gaps so the whole tree fits within the 820 viewBox height.\n` +
                `        • Every text label MUST fit inside its rectangle. Truncate role descriptions to one line; abbreviate long department names; or shrink box width across the whole row to keep proportions consistent.\n` +
                `        • If the corpus describes a 12-person leadership team you cannot fit cleanly, GROUP smaller teams into a band node ("L3 · Alumni Relations · 22 FTE — Lead: Morgan Ellis + 5 directs") rather than rendering each person as a tiny illegible box.\n` +
                `        • Render reporting lines with <line> or <path> elements, NOT with HTML borders, so they line up exactly with the SVG-positioned boxes.\n`;

        case 'journey':
            return `        JOURNEY MAP DESIGN SYSTEM — NON-NEGOTIABLE (apply on EVERY generation and revision, IDENTICALLY for #NU and #NXT — brand only changes color/font, not layout):\n\n` +
                `        === 1. CANVAS, FRAME, SAFE AREA ===\n` +
                `        • Artboard locked to 1920 × 1080. Nothing crosses those bounds.\n` +
                `        • 80px safe area on all four sides. No content of any kind crosses the safe area.\n` +
                `        • 12-column grid, 24px gutters, 80px outer margins. Every element snaps to columns 1–12.\n` +
                `        • Three horizontal bands with hard boundaries: HEADER (0–240px from top), JOURNEY (240–880px), SYNTHESIS (880–1080px). Content lives strictly inside its band; nothing floats between bands.\n\n` +
                `        === 2. TITLE & HEADLINE ===\n` +
                `        • Title sits in COLUMNS 1–9 of the header band. Type auto-sizes between 40px and 64px to fit a maximum of 3 lines. Title NEVER crosses into columns 10–12.\n` +
                `        • Eyebrow above title: uppercase, tracked, 10–12px (e.g. "JOURNEY MAP · CURRENT STATE"). The eyebrow self-identifies the artifact.\n` +
                `        • Title is a complete action-title SENTENCE stating a finding with data when possible. NOT a topic phrase.\n` +
                `        • If the title cannot fit at 40px in 3 lines, the title must be shortened — never the layout.\n\n` +
                `        === 3. RIGHT-RAIL PARAGRAPH ===\n` +
                `        • Reserved exclusively for COLUMNS 10–12, top-aligned to the title baseline.\n` +
                `        • LINE LENGTH: 45–65 characters per line. NON-NEGOTIABLE — anything below 45 produces an unreadable vertical river.\n` +
                `        • Type: 14–16px, line-height 1.5, max 8 lines.\n` +
                `        • If the paragraph won't fit in 8 lines at 14px, EITHER move it below the title as a full-width subdeck spanning columns 1–9, OR truncate at a clean clause boundary. NEVER narrow the column further.\n\n` +
                `        === 4. NEGATIVE SPACE & BALANCE ===\n` +
                `        • The journey diagram occupies the FULL HORIZONTAL WIDTH (columns 1–12) within the journey band.\n` +
                `        • The upper-left quadrant of the canvas must hold something purposeful — a key-findings callout, an emotion-arc preview, a persona summary, or intentional whitespace anchored by a horizontal rule.\n` +
                `        • No quadrant of the canvas may be more than 50% empty without an explicit design reason.\n\n` +
                `        === 5. SWIMLANE STRUCTURE ===\n` +
                `        • Every persona lane runs the FULL WIDTH of the journey band — even when the persona is inactive in some phases. INACTIVE segments: 30%-opacity DASHED line. ACTIVE segments: 100%-opacity SOLID line. This prevents orphaned line fragments.\n` +
                `        • MAXIMUM 4 PERSONA LANES. Beyond 4, group secondary actors or split into a second map.\n` +
                `        • MAXIMUM 6 PHASE COLUMNS. Most journeys work at 3–5 phases.\n` +
                `        • Phase header anatomy is IDENTICAL for every phase: (1) Eyebrow "PHASE 0X · WK YY-ZZ"; (2) Phase name; (3) System callouts beneath. Same structure for every phase, no exceptions.\n` +
                `        • EXACTLY ONE phase may be visually emphasized as the focal phase. Use a SINGLE signal — tinted background OR italic OR underline, not all three. Default: tinted background only.\n\n` +
                `        === 6. TOUCHPOINT NODES & ACTIVITY LABELS ===\n` +
                `        • If touchpoint IDs (S-01, A-02, E-01) are referenced elsewhere, they must be legible — minimum 9px, sufficient contrast, positioned consistently below each node. If not referenced anywhere, REMOVE them — decorative IDs are noise.\n` +
                `        • Node states vocabulary: STANDARD (open circle), FRICTION POINT (filled rust), MOMENT OF TRUTH (filled accent, larger), HANDOFF (split circle between lanes). Choose one state per node.\n` +
                `        • Touchpoint labels: max 2 lines, max ~50 characters, 11–12px.\n` +
                `        • ALL activity labels MUST be COMPLETE SENTENCES with subject + verb. NEVER gerund fragments. BAD: "Hears about co-op", "Browses NUworks". GOOD: "Students learn about co-op through peer referrals and faculty advising."\n` +
                `        • All activity labels sit ABOVE their corresponding timeline dot. Never below. Never alternating. Position at band_top + 14px consistently.\n\n` +
                `        === 7. EMOTION / PAIN / OPPORTUNITY LAYERS (optional, predefined treatment) ===\n` +
                `        • Emotion arc: a single thin curve threaded across phase columns at a fixed y-offset; color signals valence (negative=rust, neutral=mute, positive=accent).\n` +
                `        • Pain-point markers: small icons or flags attached to specific touchpoints with 1-line description. Visually distinct from neutral touchpoints.\n` +
                `        • Opportunity markers: brand-accent treatment at intervention points. Distinct from pain markers.\n` +
                `        • Visual treatment is consistent across NU and NXT exemplars.\n\n` +
                `        === 8. VOICE-OF-USER ROW ===\n` +
                `        • LOCKED to the bottom of the JOURNEY BAND (above the synthesis band).\n` +
                `        • ONE QUOTE PER PHASE, MAXIMUM. Pull verbatim from the corpus. If a phase truly has no evidenced quote, omit the row for that phase rather than fabricating.\n` +
                `        • Quote anatomy: eyebrow "VOICE OF [PERSONA]" (10px tracked uppercase); participant code in MONOSPACE (e.g. "S-01-04"); quote body in ITALIC SERIF, 14px, line-height 1.4; max 4 lines, max ~140 characters.\n\n` +
                `        === 9. SYNTHESIS & METRIC ROW (bottom band, y=880 to y=1080) ===\n` +
                `        • Synthesis paragraph: COLUMNS 1–4, 14px, line-height 1.5, max 5 lines.\n` +
                `        • Metric tiles: COLUMNS 5–12, EXACTLY 3 or 4 tiles, all the same size, all the same visual weight BY DEFAULT.\n` +
                `        • Maximum ONE inverted tile (dark bg, white text) — and only when it is the headline finding. Its eyebrow reads "KEY FINDING". Author's deliberate choice.\n` +
                `        • Tile anatomy: 24px icon; 48–64px numeral; uppercase tracked 10px label; 12px supporting line max ~50 characters.\n\n` +
                `        === 10. TYPOGRAPHIC SYSTEM (exactly five roles, NO exceptions) ===\n` +
                `        • DISPLAY (title): bold sans, 40–64px, line-height 1.05\n` +
                `        • BODY (right-rail paragraph, synthesis): regular sans, 14–16px, line-height 1.5\n` +
                `        • LABEL (persona, phase, system, eyebrow): uppercase tracked sans, 10–12px\n` +
                `        • QUOTE (voice-of-user body): italic serif, 14px, line-height 1.4\n` +
                `        • DATA (metric numerals, participant codes): bold sans for numerals, monospace for codes\n\n` +
                `        === FRAMING (CURRENT-STATE) ===\n` +
                `        Title naming the journey (e.g., "Students navigate compounding friction across co-op placement, campus safety, and academic pressure"). 3–6 stage columns left to right adapted to corpus. Pain points are real, observed, evidenced. Opportunities noted but not committed. Frame everything as observed reality — what IS today, not what should be.\n\n` +
                `        === ANTI-PATTERNS (AUTO-REJECT) ===\n` +
                `        • Logo/brand-mark/seal anywhere on the slide. Header is eyebrow + title + lede only — no graphical mark.\n` +
                `        • Headline overrunning into the right-rail paragraph zone (columns 10–12).\n` +
                `        • Right-rail paragraph set narrower than 45 chars per line.\n` +
                `        • Inactive persona-lane segments rendered solid (must be 30% dashed).\n` +
                `        • More than one visually emphasized phase.\n` +
                `        • More than one inverted metric tile.\n` +
                `        • Activity labels rendered as gerund fragments rather than complete sentences.\n` +
                `        • Activity labels positioned below or alternating with the timeline dot.\n` +
                `        • Layout decisions differing between #NU and #NXT (structure must be identical; only color/font differ).\n` +
                `        • Inheriting the exemplar's exact Y coordinates when YOUR label lengths differ. RECOMPUTE Y offsets.\n` +
                `        • Content overlapping any line, divider, dot, or arrow.\n`;

        case 'arch':
            return `        TECHNICAL ARCHITECTURE body must contain:\n` +
                `        • A title naming the system or architecture domain\n` +
                `        • System / component boxes with names, types, and ownership\n` +
                `        • Data flow arrows between components, annotated with protocol/freq/payload where known\n` +
                `        • Tier or zone bands (presentation / application / data / external) if exemplar uses them\n` +
                `        • External actors and integrations on the periphery\n` +
                `        • Datastore icons distinguished from service components\n` +
                `        Use real system names from the corpus. Do not invent components.\n\n` +
                `        LAYOUT DISCIPLINE — HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • 4 tier bands max (presentation / application / data / integration). Each band 180px tall, 24px gap.\n` +
                `        • System box: 220–280px wide × 70–90px tall. NO box smaller than 220×70.\n` +
                `        • Max 6 system boxes per tier band horizontally. If more, USE 2 ROWS within the tier (compress to 60px tall each).\n` +
                `        • Connectors are 2px-stroke <line> or <path> between explicit (x1,y1)→(x2,y2) points. Connectors NEVER cross THROUGH a system box — route around with a midpoint.\n` +
                `        • Every arrow has an explicit head at its receiving end. Bidirectional arrows have heads at both ends in DIFFERENT colors.\n` +
                `        • Annotation labels at midpoint with 12px perpendicular offset. Background fill required if connector passes near other geometry.\n` +
                `        • 30px exclusion zone perpendicular to every connector and tier divider. NO text bounding box intersects this zone.\n` +
                `        • Datastore icons MUST use cylinder shape from exemplar. Service icons MUST use rounded-rect shape. NEVER swap.\n` +
                `        • Hard char caps: 22 chars/line at 11.5px, 18/line at 14px, 14/line at 16px. System box labels capped at 22 chars; annotations at 18 chars.\n` +
                `        • Density: ≤8 systems = full annotation; 8–15 = standard; 15–30 = cluster grouping ("Marketing Stack — 5 systems"); 30+ = top-N + appendix footnote.\n` +
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
                `        LAYOUT DISCIPLINE — HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • Phase columns equal width unless durations differ by >20%. Min 280px, max 520px per phase.\n` +
                `        • Phase header band 60px tall at body top, contains phase name + duration + status pill.\n` +
                `        • Phase divider drawn FIRST (2px vertical, full body height) so phase content paints over it.\n` +
                `        • Status pills MUST be visually distinct: committed = solid accent fill; planned = outlined accent; aspirational = dashed gray. Reader distinguishes at a glance — NEVER use text alone.\n` +
                `        • Gantt: workstream rows ≥48px tall when bars carry labels. NEVER compress below 32px.\n` +
                `        • Today-marker: full body height, 2px dashed rust line, labeled "TODAY" at top.\n` +
                `        • Milestone diamond 18×18px centered on date column.\n` +
                `        • Bar text inside-the-bar IF bar ≥240px wide; otherwise outside with 8px gap on whichever side has more whitespace.\n` +
                `        • 24px exclusion zone perpendicular to every phase divider. NO text bounding box may intersect.\n` +
                `        • Hard char caps: 22 chars/line at 11.5px (milestone callouts, bar labels); 18/line at 14px (initiative names); 14/line at 16px (phase names).\n` +
                `        • Density: ≤6 phases or ≤8 workstreams = full annotation; 6–12 / 8–16 = standard; 12–20 / 16–25 = cluster initiatives by capability; 20+ / 25+ = top-N + appendix footnote.\n` +
                `        • DO NOT inherit the exemplar's coordinates when your phase count differs. RECOMPUTE column widths.\n`;

        case 'blueprint':
            return `        SERVICE BLUEPRINT DESIGN SYSTEM — NON-NEGOTIABLE (IDENTICAL 10-point spec as #journey, only the framing changes: blueprint is FUTURE-STATE with pain-points-solved and recommendations layered. Apply IDENTICALLY for #NU and #NXT — brand only changes color/font, not layout):\n\n` +
                `        === 1. CANVAS, FRAME, SAFE AREA ===\n` +
                `        • Artboard locked to 1920 × 1080. Nothing crosses those bounds.\n` +
                `        • 80px safe area on all four sides. No content of any kind crosses the safe area.\n` +
                `        • 12-column grid, 24px gutters, 80px outer margins. Every element snaps to columns 1–12.\n` +
                `        • Three horizontal bands with hard boundaries: HEADER (0–240px from top), BLUEPRINT BODY (240–880px), SYNTHESIS (880–1080px). Content lives strictly inside its band.\n\n` +
                `        === 2. TITLE & HEADLINE ===\n` +
                `        • Title sits in COLUMNS 1–9. Auto-size 40–64px to fit max 3 lines. Title NEVER crosses into columns 10–12.\n` +
                `        • Eyebrow above title: uppercase, tracked, 10–12px (e.g. "BLUEPRINT · FUTURE STATE"). Self-identifies the artifact.\n` +
                `        • Title is a complete action-title sentence describing the redesigned outcome. NOT a topic phrase.\n\n` +
                `        === 3. RIGHT-RAIL PARAGRAPH ===\n` +
                `        • Reserved exclusively for COLUMNS 10–12, top-aligned to title baseline.\n` +
                `        • LINE LENGTH: 45–65 characters per line. NON-NEGOTIABLE.\n` +
                `        • Type: 14–16px, line-height 1.5, max 8 lines.\n\n` +
                `        === 4. NEGATIVE SPACE & BALANCE ===\n` +
                `        • The blueprint diagram occupies the FULL HORIZONTAL WIDTH (columns 1–12) within the body band.\n` +
                `        • Upper-left quadrant must hold something purposeful — intervention summary, before/after delta, or anchored whitespace.\n\n` +
                `        === 5. SWIMLANE STRUCTURE (BLUEPRINT-SPECIFIC) ===\n` +
                `        • Four canonical lanes (Customer Action / Frontstage / Backstage / Support Processes). When fewer warranted, OMIT — never combine.\n` +
                `        • Every lane runs the FULL WIDTH of the body band. Active segments: solid line. Inactive segments (lane not engaged at this step): 30%-opacity DASHED line.\n` +
                `        • MAXIMUM 6 STEP COLUMNS (the future-state journey has 3–5 steps; complex blueprints split into a second map).\n` +
                `        • Step header anatomy is IDENTICAL for every step: (1) eyebrow "STEP 0X · {time/state marker}"; (2) step name; (3) system callouts. Same structure no exceptions.\n` +
                `        • EXACTLY ONE step may be visually emphasized as the focal redesign — single signal (tinted background OR italic OR underline).\n` +
                `        • Vertical "line of visibility" between Frontstage and Backstage: 2px dashed, full body height.\n` +
                `        • Vertical "line of internal interaction" between Backstage and Support Processes: 2px dotted, full body height.\n\n` +
                `        === 6. STEP / TOUCHPOINT NODES & ACTIVITY LABELS ===\n` +
                `        • Step IDs (CA-01, FS-02, BS-03, SP-04) min 9px when referenced; otherwise REMOVE.\n` +
                `        • Node states for blueprint: STANDARD (open circle), INTERVENTION (filled accent — the design response, equivalent to journey's "moment of truth"), HANDOFF (split circle between lanes), AUTOMATED (square node).\n` +
                `        • Touchpoint labels: max 2 lines, max ~50 characters, 11–12px.\n` +
                `        • ALL activity labels MUST be COMPLETE SENTENCES with subject + verb. NEVER gerund fragments. BAD: "Creates account", "Lists jobs". GOOD: "The system creates a student account upon enrollment.", "NUworks lists open co-op postings by employer."\n` +
                `        • All activity labels sit ABOVE their corresponding timeline dot. Never below. Never alternating.\n\n` +
                `        === 7. INTERVENTION / OUTCOME / RECOMMENDATION LAYERS (BLUEPRINT-SPECIFIC) ===\n` +
                `        • Intervention markers: small icons or flags attached to specific steps with a 1-line description of the design response. These REPLACE journey's pain-point markers — blueprint shows the solution, not the friction.\n` +
                `        • Outcome arc: a single thin curve threaded across step columns at fixed y-offset showing the projected emotion/sentiment improvement (rust → mute → accent).\n` +
                `        • Recommendation chips at the bottom of each step (or in a dedicated row above the lanes) summarizing the design choice that step embodies.\n\n` +
                `        === 8. EVIDENCE QUOTE ROW (replaces journey's voice-of-user row) ===\n` +
                `        • Locked to the bottom of the BLUEPRINT BODY band.\n` +
                `        • ONE VERBATIM EVIDENCE QUOTE per step column — every step must have a diagnosis quote that grounds the design choice. Pull verbatim from the corpus.\n` +
                `        • Quote anatomy: eyebrow "EVIDENCE FOR STEP 0X" (10px tracked uppercase); participant code in MONOSPACE; quote body in ITALIC SERIF, 14px, line-height 1.4; max 4 lines / ~140 characters.\n\n` +
                `        === 9. SYNTHESIS & PROJECTED-IMPACT ROW (bottom band) ===\n` +
                `        • Synthesis paragraph: COLUMNS 1–4, 14px, line-height 1.5, max 5 lines. Frame as "What this redesign achieves".\n` +
                `        • Projected-impact tiles: COLUMNS 5–12, EXACTLY 3 or 4 tiles, all the same size, all the same visual weight by default.\n` +
                `        • One inverted tile permitted — and only when it is the headline impact. Eyebrow reads "PROJECTED IMPACT" or "TARGET". Author's deliberate choice.\n` +
                `        • Tile anatomy: 24px icon; 48–64px numeral; uppercase tracked 10px label; 12px supporting line max ~50 characters.\n\n` +
                `        === 10. TYPOGRAPHIC SYSTEM (exactly five roles, NO exceptions) ===\n` +
                `        • DISPLAY (title): bold sans, 40–64px, line-height 1.05\n` +
                `        • BODY (right-rail paragraph, synthesis): regular sans, 14–16px, line-height 1.5\n` +
                `        • LABEL (lane, step, system, eyebrow): uppercase tracked sans, 10–12px\n` +
                `        • QUOTE (evidence row body): italic serif, 14px, line-height 1.4\n` +
                `        • DATA (metric numerals, participant codes): bold sans for numerals, monospace for codes\n\n` +
                `        === FRAMING (FUTURE-STATE) ===\n` +
                `        Title naming the redesigned service or workflow (e.g., "An AI-augmented co-op match closes the late-cycle reschedule gap"). 3–6 step columns. Activity labels describe the redesigned interaction (the future-state behavior). Intervention markers signal where the design responds to evidenced pain. Justify every change with verbatim corpus evidence in the bottom row.\n\n` +
                `        === ANTI-PATTERNS (AUTO-REJECT) ===\n` +
                `        • Logo/brand-mark/seal anywhere on the slide. Header is eyebrow + title + lede only.\n` +
                `        • Headline overrunning into the right-rail paragraph zone (columns 10–12).\n` +
                `        • Right-rail paragraph set narrower than 45 chars per line.\n` +
                `        • Inactive lane segments rendered solid (must be 30% dashed).\n` +
                `        • More than one visually emphasized step. More than one inverted tile.\n` +
                `        • Activity labels rendered as gerund fragments rather than complete sentences.\n` +
                `        • Activity labels positioned below or alternating with the timeline dot.\n` +
                `        • Layout decisions differing between #NU and #NXT (structure must be identical; only color/font differ).\n` +
                `        • Inheriting the exemplar's exact Y coordinates when YOUR label lengths differ. RECOMPUTE.\n` +
                `        • Content overlapping any lane line, line-of-visibility, line-of-internal-interaction, divider, dot, or arrow.\n` +
                `        • Combining canonical lanes (Customer Action / Frontstage / Backstage / Support Processes). When fewer warranted, OMIT.\n` +
                `        • Showing pain points without showing the corresponding intervention. Blueprint is the SOLUTION view; journey is the diagnosis view.\n`;
    }
}

function buildPrompt(args: FreeformGenerateArgs, bundle: { exemplarHtml: string; brandSkill: string; diagramSkill: string }): string {
    const sections: string[] = [];

    // 2026-05-08 — Universal tone rules at the top of every freeform prompt
    // (journey, blueprint, org, arch, roadmap). Forces balanced framing,
    // opportunity-led narrative, pragmatic action verbs, and bans
    // catastrophizing metaphors / hyperbole / jargon in any text emitted
    // inside the rendered HTML.
    sections.push(UNIVERSAL_TONE_RULES_INLINE);

    // OPENING HAMMER — CAPS-LOCK critical instruction. Pattern adopted from the
    // Intelligence Augmentation Journey Mapper (internal-solutions-journeymapper),
    // which gets reliable complete-HTML output by hammering the requirement at
    // the TOP, in the MIDDLE (numbered list), and at the END (REMEMBER).
    sections.push(
        `CRITICAL INSTRUCTION: EMIT ONLY THE BODY CONTENT (children of <body>) — NOT THE FULL HTML ` +
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
        `is preserved server-side. You are responsible ONLY for the BODY CONTENT — the children of <body> — ` +
        `that get spliced into the shell.\n\n` +
        `This means:\n` +
        `  • Do NOT emit <!DOCTYPE html>, <html>, <head>, <style>, <body> open/close, or </html>\n` +
        `  • Emit ONLY the body innerHTML — starting with the FIRST child element of <body>, ending with the LAST child\n` +
        `  • Use the exact CSS class names from the exemplar's <style> block (.stage, .slide-frame, .slide, ` +
        `.frame, .top-band, .atmos-violet-tr, .atmos-red-bl, .grain, .brand-mark, .seal, .wordmark, etc.)\n` +
        `  • Output size will be ~5-10x smaller than re-emitting the full document\n\n` +
        `=== STEP-BY-STEP BODY CONSTRUCTION ===\n\n` +
        `Step 1 — STUDY the EXEMPLAR BODY CONTENT below as your structural reference.\n\n` +
        `Step 2 — REPLICATE the structure with adapted content:\n` +
        `        • Keep .stage > .slide-frame > .slide > .frame > .top-band layout intact\n` +
        `        • Keep all atmospheric overlay divs (.atmos-*, .grain) in their positions\n` +
        `        • Keep the brand mark / seal / wordmark / eyebrow / h1 elements in the top band\n` +
        `        • Replace TEXT INSIDE elements: title, role labels, names, body content, quotes, ` +
        `citations, stat values, date markers\n\n` +
        `Step 3 — SCALE DIMENSIONALITY by cloning structural elements:\n` +
        `        • If the exemplar has 4 swimlanes and the corpus warrants 7, COPY a swimlane <div> ` +
        `3 more times with new content\n` +
        `        • If the exemplar has 6 nodes and the corpus warrants 18, copy the node element as many ` +
        `times as needed\n` +
        `        • Trim sections the corpus does not justify; expand sections the corpus over-justifies\n\n` +
        `Step 4 — PER-KIND BODY CONSTRUCTION (what the body must contain for kind="${args.kind}"):\n` +
        perKindGuidance(args.kind) +
        `\n\nStep 5 — SELF-CHECK before emitting. Verify EVERY ITEM:\n` +
        `        [ ] I am NOT emitting <!DOCTYPE>, <html>, <head>, <style>, <body>, or </html>\n` +
        `        [ ] My output starts with the first body-child element (e.g., <div class="stage">)\n` +
        `        [ ] Every <div>, <span>, <section> I opened is closed\n` +
        `        [ ] My output ends with the closing tag of the last body-child element (e.g., </div>)\n` +
        `        [ ] No region is empty — every visual zone has brand-styled content\n\n` +
        `=== EXEMPLAR BODY CONTENT (your structural reference — adapt the text inside) ===\n` +
        splitExemplarShell(bundle.exemplarHtml).sampleBody);

    if (args.corpus && args.corpus.length > 0) {
        sections.push(`\n=== RESEARCH CORPUS + UPLOADS (grounding evidence) ===\n${args.corpus.slice(0, 200000)}`);
    }

    if (args.currentArtifact) {
        sections.push(`\n=== CURRENT ARTIFACT (REVISION mode — apply user intent intelligently; preserve unchanged content; use corpus for grounded additions) ===\n` +
            `id: ${args.currentArtifact.id}\n` +
            `title: ${args.currentArtifact.title}\n` +
            `--- existing HTML body ---\n` +
            `${args.currentArtifact.html}`);
    }

    sections.push(`\n=== USER REQUEST ===\n${args.userPrompt}`);

    // MIDDLE HAMMER — body-only emission requirements
    sections.push(`\n=== CRITICAL EMISSION REQUIREMENTS ===\n` +
        `1. Emit ONLY the BODY CONTENT (the innerHTML of <body>). The shell is preserved server-side.\n` +
        `2. Do NOT emit <!DOCTYPE html>, <html>, <head>, <style>, <link>, <body> open/close, or </html>\n` +
        `3. Your output must START with the first body-child element (typically <div class="stage">)\n` +
        `4. Your output must END with the closing tag of the last body-child element (typically </div>)\n` +
        `5. Every <div>, <span>, <section>, <article>, <header>, <footer> you open MUST be closed\n` +
        `6. Use the exact CSS class names from the exemplar — they are defined in the preserved <style>\n` +
        `7. NO abbreviation, NO "// rest unchanged" comments, NO "..." placeholders — ship complete content\n` +
        `8. NO markdown code fences around the :::nxt:freeform block\n` +
        `9. EVERYTHING fits inside 1920×1080. If the exemplar uses an inline <svg viewBox="...">, REUSE THAT viewBox unchanged — do not swap SVG for flex/grid <div> rows that overflow when item count grows.\n` +
        `10. Maximum 6 same-tier items per row. If the corpus needs 12, render two rows of 6, NOT one row of 12 with crushed 80px-wide cards.\n` +
        `11. If text would not fit inside a card at the exemplar's box dimensions, EITHER (a) shrink all cards in that row proportionally so text still reads, OR (b) group items into a band/cluster card with a count-and-leader summary instead of one tiny card per item.\n` +
        `12. TEXT-vs-LINE CLEARANCE: every horizontal connector / lane line at y=Y has a 36px exclusion zone above AND below. NO text bounding box may intersect [Y−36, Y+36]. When labels need more than that, position them above_band_top + 18px or below_band_bottom − 18px and ENLARGE the band rather than overlapping the line.\n` +
        `13. MULTI-LINE LABELS ≤ 2 LINES. Hard char caps per line based on font size: 22 chars at 11.5px, 18 at 14px, 14 at 16px. If your content exceeds, TRUNCATE with "…" or escalate to a band-card "{N} items — see appendix".\n` +
        `14. ZIGZAG STAGGER: when more than 4 milestones / step boxes / nodes share a single horizontal line, alternate label position above and below the line (even-index above, odd-index below). NEVER stack 5+ labels on the same side.\n` +
        `15. RECOMPUTE COORDINATES. The exemplar's exact x/y values reflect the EXEMPLAR's content lengths. Your content has different lengths. RECALCULATE offsets so labels still clear lines and boxes still don't overlap their neighbors. Inherit the STRUCTURE (which classes go where), NOT the literal coordinates.\n` +
        `16. TRUNCATION CAPS: action title ≤100 chars (complete sentence), lede ≤280 chars, verbatim quote ≤200 chars (with "…" + attribution intact), stage/step/phase labels ≤24 chars.\n`);

    sections.push(`\n=== OUTPUT CONTRACT ===\n` +
        `Return EXACTLY one block of this form, with no preamble, no markdown fences, no trailing prose:\n\n` +
        `:::nxt:freeform\n` +
        `{ "id": "${args.currentArtifact?.id ?? `f_${Date.now()}`}", ` +
        `"kind": "${args.kind}", "brand": "${args.brand}", ` +
        `"title": "<action title — what this artifact represents>", ` +
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

    // CLOSING HAMMER — final REMEMBER reminder (recency bias). Hammered at top + middle + end.
    sections.push(
        `\nREMEMBER: EMIT ONLY THE BODY CONTENT — children of <body>, no shell. ` +
        `Start with the FIRST body-child element (e.g., <div class="stage">), end with its closing tag. ` +
        `Do NOT emit <!DOCTYPE>, <html>, <head>, <style>, <body> open/close, or </html> — those are ` +
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
 * otherwise. No fallbacks — incomplete output is surfaced as a hard failure.
 */
function checkBodyContentCompleteness(bodyContent: string): string | null {
    if (!bodyContent || bodyContent.length < 200) {
        return `body content too short (${bodyContent?.length ?? 0} chars) — likely truncated or empty`;
    }

    // Reject output that mistakenly includes the shell tags. Use word-boundary
    // regex — substring matching breaks because `<header` starts with `<head`,
    // and the exemplars legitimately contain <header class="top-band">.
    if (/<!doctype\b/i.test(bodyContent)) return 'output incorrectly includes <!DOCTYPE> — emit ONLY body content';
    if (/<html\b/i.test(bodyContent))     return 'output incorrectly includes <html> tag — emit ONLY body content';
    if (/<head\b(?!er)/i.test(bodyContent)) return 'output incorrectly includes <head> tag — emit ONLY body content (note: <header> is allowed)';
    if (/<body\b/i.test(bodyContent))     return 'output incorrectly includes <body> tag — emit ONLY body content (children of <body>)';

    // Verify the .stage / .slide-frame structural classes are present
    if (!/\bstage\b/.test(bodyContent) && !/\bslide-frame\b/.test(bodyContent)) {
        return 'missing .stage or .slide-frame element — model did not preserve the exemplar frame structure';
    }

    // Tag balance check — every opened element should be closed.
    // Coarse but effective: count opens vs closes for common block elements.
    const openDivs = (bodyContent.match(/<div\b[^>]*>/gi) ?? []).length;
    const closeDivs = (bodyContent.match(/<\/div\s*>/gi) ?? []).length;
    if (openDivs !== closeDivs) {
        return `unbalanced <div> tags: ${openDivs} opened, ${closeDivs} closed — output truncated mid-element`;
    }

    return null;
}

export async function generateFreeformArtifact(args: FreeformGenerateArgs): Promise<FreeformGenerateResult> {
    let bundle;
    try {
        bundle = loadExemplar(args.kind, args.brand);
    } catch (err: any) {
        return { ok: false, error: err?.message ?? String(err) };
    }

    const prompt = buildPrompt(args, bundle);

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
    // No fallback — surface the failure with raw response.
    const completenessError = checkBodyContentCompleteness(parsed.html);
    if (completenessError) {
        return {
            ok: false,
            error: `Model produced INCOMPLETE BODY CONTENT: ${completenessError}. Re-run with a more capable model (Opus 4.7) or simpler request.`,
            rawResponse: raw,
            modelUsed: args.model,
        };
    }

    // Splice the model's body content back into the exemplar's intact shell.
    // shell.before = "<!DOCTYPE html>...<head>...full <style>...</head><body...>"
    // shell.after  = "</body></html>"
    // This guarantees the rendered HTML has the complete brand CSS, fonts,
    // atmospheric overlays — independent of any model truncation risk.
    const shell = splitExemplarShell(bundle.exemplarHtml);
    const fullHtml = shell.before + '\n' + parsed.html + '\n' + shell.after;

    const sanitizedHtml = sanitizeFreeformHtml(fullHtml);

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

    return { ok: true, artifact: validation.value, modelUsed: args.model };
}
