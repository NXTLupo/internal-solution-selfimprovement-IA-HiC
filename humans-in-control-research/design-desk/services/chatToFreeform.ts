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
import { GoogleGenAI } from '@google/genai';

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
            return `        JOURNEY MAP body must contain (CURRENT-state framing):\n` +
                `        • A title naming the journey (e.g., "Prospect Lifecycle — Current State")\n` +
                `        • 4-9 stage columns from left to right (Awareness, Consideration, etc., adapted to corpus)\n` +
                `        • For each stage: a label, an emotion indicator (positive / neutral / negative), ` +
                `touchpoint annotations, observed pain points, noted opportunities\n` +
                `        • Verbatim quotes from the corpus where evidence supports them, attributed to named sources\n` +
                `        • Connector lines between stages\n` +
                `        Frame everything as observed reality — what IS today, not what should be.\n\n` +
                `        LAYOUT DISCIPLINE — HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • Lane height ≥120px when labels are 2 lines; lane line at vertical CENTER of band.\n` +
                `        • Labels positioned at band_top + 18px (above-line) OR band_bottom − 18px (below-line) — NEVER overlapping the line itself.\n` +
                `        • 36px exclusion zone above AND below every horizontal lane line. NO text bounding box may intersect [Y−36, Y+36].\n` +
                `        • Stage column width = 1840px / N stages. Min 200px, max 320px. If N×200 > 1840, USE 2-row layout (top: stages 1..N/2, bottom: stages N/2+1..N).\n` +
                `        • Multi-line labels MUST be ≤ 2 lines. Hard char caps: 22 chars/line at 11.5px, 18/line at 14px, 14/line at 16px.\n` +
                `        • When >4 milestones share a lane, STAGGER labels above/below in alternating zigzag (even-index above, odd-index below).\n` +
                `        • Pain-point chips live in a dedicated row ABOVE the lanes — NEVER inside a lane band.\n` +
                `        • Verbatim quotes capped at 200 chars; truncate with "…" + attribution intact.\n` +
                `        • DO NOT inherit the exemplar's exact Y coordinates if your label lengths differ from the exemplar's. RECOMPUTE Y offsets when label height grows.\n`;

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
            return `        SERVICE BLUEPRINT body must contain (FUTURE-state framing):\n` +
                `        • A title naming the service or workflow being designed\n` +
                `        • Customer Action lane (top): observable steps the customer takes\n` +
                `        • Frontstage lane: visible system / staff actions the customer sees\n` +
                `        • Backstage lane: invisible support actions and processes\n` +
                `        • Support Processes lane (bottom): underlying systems and infrastructure\n` +
                `        • Vertical step columns showing the time progression of the journey\n` +
                `        • Fail-point markers and emotion-intensity treatments where the redesign addresses pain\n` +
                `        • Evidence quotes citing the diagnosis that drove each design choice\n` +
                `        Frame everything as proposed redesign — what SHOULD BE post-analysis. Justify changes with corpus evidence.\n\n` +
                `        LAYOUT DISCIPLINE — HARD RULES (READ CAREFULLY, OVERFLOW = AUTO-REJECT):\n` +
                `        • Four canonical lanes (Customer Action / Frontstage / Backstage / Support Processes). When fewer warranted, OMIT — never combine.\n` +
                `        • Lane height ≥130px (blueprint lanes carry MORE annotation than journey lanes).\n` +
                `        • Lane line at vertical CENTER of band. Step boxes / action callouts at band_top + 20px (above-line) OR band_bottom − 20px (below-line) — NEVER overlapping the line itself.\n` +
                `        • Step column width = 1840px / N steps. Min 220px, max 320px. If N×220 > 1840, USE 2-row layout with 30px gutter.\n` +
                `        • Vertical "line of visibility" between Frontstage and Backstage: 2px dashed, full body height, drawn FIRST.\n` +
                `        • Vertical "line of internal interaction" between Backstage and Support Processes: 2px dotted, full body height.\n` +
                `        • Fail-point markers + emotion bands in dedicated row ABOVE the lanes — NEVER inside a lane band.\n` +
                `        • 40px exclusion zone perpendicular to every lane line and step divider. NO text bounding box may intersect.\n` +
                `        • Multi-line labels MUST be ≤ 2 lines. Hard char caps: 22 chars/line at 11.5px, 18/line at 14px, 14/line at 16px.\n` +
                `        • Stagger fail-point markers above/below line of visibility in zigzag when >3 share a step column.\n` +
                `        • Verbatim diagnosis quotes capped at 200 chars; truncate with "…" + attribution intact.\n` +
                `        • DO NOT inherit the exemplar's exact coordinates when your label lengths differ. RECOMPUTE Y offsets.\n`;
    }
}

function buildPrompt(args: FreeformGenerateArgs, bundle: { exemplarHtml: string; brandSkill: string; diagramSkill: string }): string {
    const sections: string[] = [];

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
