/**
 * Generate a typed SlideSpec JSON from a user prompt + corpus + brand + kind.
 *
 * The architectural pivot away from chatToFreeform: instead of asking the
 * model to emit HTML body content, we ask for a strict JSON object that
 * conforms to the SlideSpec schema. Two renderers (HTML preview + native
 * PPTX) consume the same JSON, so canvas and export always agree.
 *
 * The model is told the slide is 13.333" × 7.5" (16:9 widescreen) and
 * asked to populate `objects` with positioned text/shape/line/image
 * primitives. Brand chrome (atmospheric overlays, grain, ::before lines)
 * is added by the renderers — the model focuses on content placement.
 */

import { validateSlideSpec, type SlideSpec, SLIDE_W_IN, SLIDE_H_IN } from '../schemas/slideSpec';
import type { SlideArtifact, FreeformKind } from '../schemas/slideArtifact';
import { validateSlideArtifact } from '../schemas/slideArtifact';
import type { BrandHashtag } from './hashtagParser';
import { analyzeText as analyzeTextOpenAI } from '../../services/openaiService';
import { GoogleGenAI } from '@google/genai';

// 2026-05-05 — DeepSeek V4 Flash is the single-vendor primary.
export type SlideSpecModel = 'deepseek-v4-flash' | 'gpt-5.4' | 'gemini-2.5-flash' | 'gemini-3.1-pro-preview';

export interface SlideSpecGenerateArgs {
    kind: FreeformKind;
    brand: BrandHashtag;
    userPrompt: string;
    corpus: string;
    /** When set, the model is asked to revise this artifact's spec rather
     *  than create a new one. */
    currentArtifact: SlideArtifact | null;
    model?: SlideSpecModel;
}

export type SlideSpecGenerateResult =
    | { ok: true; artifact: SlideArtifact; modelUsed: SlideSpecModel }
    | { ok: false; error: string; rawResponse?: string; modelUsed?: SlideSpecModel };

const SYSTEM_PROMPT =
    'You are a structured slide architect for the NXT Humans Design Desk. ' +
    'You return ONLY a single JSON object conforming to the SlideSpec schema. ' +
    'No prose, no preamble, no markdown fences. The slide is 13.333" wide × 7.5" tall (16:9 widescreen).';

const MAX_TOKENS = 32000;
const TEMPERATURE = 0.3;

function resolveProviderModelId(m: SlideSpecModel): string {
    if (m === 'deepseek-v4-flash') return 'deepseek-v4-flash';
    if (m === 'gpt-5.4') return 'gpt-5.4';
    if (m === 'gemini-3.1-pro-preview') return 'gemini-3.1-pro-preview';
    return 'gemini-2.5-flash';
}

async function callModel(prompt: string, m: SlideSpecModel): Promise<string> {
    const id = resolveProviderModelId(m);
    // 2026-05-05 — DeepSeek V4 Flash is the primary path.
    if (m === 'deepseek-v4-flash') {
        const resp = await fetch('http://127.0.0.1:5012/api/ai/deepseek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: id,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: MAX_TOKENS,
                temperature: TEMPERATURE,
                response_format: { type: 'json_object' },
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
    if (m === 'gpt-5.4') return analyzeTextOpenAI(SYSTEM_PROMPT, prompt, id, MAX_TOKENS, TEMPERATURE);
    const ai = new GoogleGenAI({ apiKey: (process as any).env?.API_KEY ?? (process as any).env?.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: id,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE, responseMimeType: 'application/json' },
    });
    return (response as any)?.text ?? '';
}

// ---------------------------------------------------------------------------
// Per-kind layout guidance — what content the AI should produce
// ---------------------------------------------------------------------------

function perKindGuidance(kind: FreeformKind): string {
    const common = `
LAYOUT BANDS (positions in slide inches):
  Top band:      x=0.4, y=0.18, w=12.5, h=1.0     — eyebrow + h1 + lede + meta
  Body zone:     x=0.4, y=1.30, w=12.5, h=5.20    — kind-specific content
  Bottom band:   x=0.4, y=6.65, w=12.5, h=0.65    — voice quote / stat tiles / footnote

TOP BAND TEXT OBJECTS (always include these):
  • role="eyebrow"   small caps, color=accent, size 7pt, charSpacing=2, at (0.4, 0.20, 6.0, 0.20)
  • role="h1"        bold body title, size 28pt, at (0.4, 0.42, 9.5, 0.55)
  • role="lede"      paragraph, size 9pt, at (0.4, 1.00, 8.5, 0.30) — include any inline-formatted phrases as separate runs
  • role="meta"      mono, small caps, size 7pt, right-aligned, at (10.0, 0.20, 2.9, 1.00)
  • role="brandSeal" 0.32"×0.32" filled rect with single-letter text on top, at (0.4, 0.18)

BOTTOM BAND TEXT OBJECTS (when applicable):
  • role="voiceQuote"   1-2 line italic quote, size 9pt, at (0.4, 6.65, 5.0, 0.65)
  • role="statValue"    large number, bold, size 24pt
  • role="statLabel"    small caps mono, size 7pt
`;

    switch (kind) {
        case 'org':
            return common + `
ORG CHART body must contain:
  • Tier rows (L1 root, L2 directors, L3 sub-teams). Each row of nodes is roughly 0.9" tall with 0.1" gap.
  • Each node = 1 ShapeObject (rect or roundRect, fill=paper or accent for highlight) + 2-3 TextObjects inside it (eyebrow tag, name, role/headcount).
  • Connector lines between tiers. Use 1.5pt strokes; lines from parent bottom-center to child top-center.
  • Max 6 same-tier nodes per row at 1.4-1.8" wide × 0.5" tall. If more, render TWO rows or band cards.
  • Do NOT overlap text and lines (text-vs-line clearance: 0.25" zone above/below every connector line).
`;
        case 'journey':
            return common + `
JOURNEY MAP (CURRENT-state) body must contain:
  • 4-9 stage column headers along the top of the body zone.
  • 3-5 lane rows below the headers. Each lane row 0.9" tall.
  • Lane line drawn at vertical center of each band.
  • Touchpoint labels positioned ABOVE band-center + 0.18" OR BELOW band-center − 0.18". NEVER on the line.
  • Verbatim quotes attributed to named sources.
  • Frame everything as observed reality (what IS today).
`;
        case 'blueprint':
            return common + `
SERVICE BLUEPRINT (FUTURE-state) body must contain:
  • 4 canonical lanes (Customer Action / Frontstage / Backstage / Support Processes).
  • Vertical line of visibility between Frontstage and Backstage (2pt dashed full-height).
  • Step boxes at band_top + 0.18" OR band_bottom − 0.18" — never overlapping the lane line.
  • Fail-point markers + emotion bands in row ABOVE the lanes.
  • Frame everything as proposed redesign (what SHOULD BE).
`;
        case 'arch':
            return common + `
TECHNICAL ARCHITECTURE body must contain:
  • 4 tier bands (presentation / application / data / integration). Each tier ~0.95" tall with 0.15" gap.
  • System boxes 1.6-2.0" wide × 0.55-0.7" tall. NO box smaller than 1.6×0.55.
  • Max 6 boxes per tier horizontally; if more, use 2 rows within tier.
  • Connector arrows between systems with 1.5pt stroke + endArrow=true.
  • Connectors NEVER cross THROUGH a system box — route around with midpoints.
  • Datastore icons distinguished from service icons (use ellipse for datastore, roundRect for service).
`;
        case 'roadmap':
            return common + `
ROADMAP body must contain:
  • Phase column headers (Now / Next / Later, OR Phase 1 / 2 / 3, OR quarters).
  • Phase divider lines drawn FIRST so phase content paints over them.
  • Status pills: filled accent for committed, outlined accent for planned, dashed gray for aspirational.
  • Workstream rows ≥0.35" tall when bars carry labels.
  • Today-marker (vertical dashed rust line at current date), labeled "TODAY".
`;
    }
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(args: SlideSpecGenerateArgs): string {
    const sections: string[] = [];

    sections.push(`KIND: ${args.kind}`);
    sections.push(`BRAND: ${args.brand}`);
    sections.push(`SLIDE DIMENSIONS: ${SLIDE_W_IN}" × ${SLIDE_H_IN}" (16:9 widescreen)`);

    sections.push(`\n=== SCHEMA (THE OUTPUT MUST CONFORM) ===\n` +
`The output is a JSON object: { "width": 13.333, "height": 7.5, "background": "FAF8F4" or "FFFFFF", "objects": [ ... ] }
Each object in objects[] is one of:

  TextObject:
    { "type": "text", "x": <inches>, "y": <inches>, "w": <inches>, "h": <inches>,
      "runs": [ { "text": "...", "fontFamily": "Archivo"|"Fraunces"|"JetBrains Mono",
                  "fontSize": <points>, "bold": true|false, "italic": true|false,
                  "color": "<6-hex without #>", "charSpacing": <points> } ],
      "align": "left"|"center"|"right",
      "valign": "top"|"middle"|"bottom",
      "role": "eyebrow"|"h1"|"lede"|"meta"|"voiceQuote"|"nodeName"|"nodeRole"|"statValue"|... }

  ShapeObject:
    { "type": "shape", "shape": "rect"|"roundRect"|"ellipse"|"triangle"|"pentagon"|"hexagon"|"diamond",
      "x", "y", "w", "h", "fill": "<6-hex>", "fillAlpha": 0..1,
      "line": "<6-hex>", "lineWidth": <points>, "lineDash": "solid"|"dash"|"sysDot"|"dashDot",
      "cornerRadius": <inches, only for roundRect>, "role": "..." }

  LineObject:
    { "type": "line", "x1", "y1", "x2", "y2", "color": "<6-hex>", "width": <points>,
      "dash": "solid"|"dash"|"sysDot"|"dashDot",
      "arrowStart": false|true, "arrowEnd": false|true, "role": "..." }

  ImageObject:
    { "type": "image", "x", "y", "w", "h", "src": "<URL or data: URL>", "role": "..." }

Z-order = array order (later objects paint over earlier).
Coordinates are in slide INCHES.
Colors are 6-char hex WITHOUT a leading "#".
Font sizes are in POINTS.

CRITICAL: omit any property whose value is the default. Don't include keys with null or empty strings.`);

    // Brand tokens
    sections.push(`\n=== BRAND PALETTE (${args.brand.toUpperCase()}) ===\n` + (
        args.brand === 'nu'
            ? `paper: "FAF8F4" (slide background)
primary: "0A0A0A" (body text + lines + node borders)
accent: "C8102E" (NU red — emphasis, eyebrow color, highlight box fill)
secondary: "6E54E0" (violet — alternative accent)
muted: "5C5C5C" (grey — sub-labels, role descriptions)
soft: "FBE8EC" (pink — for L3/sub-team band fill)
cream: "F4F1EA" (cream — secondary band fill)
fonts: Archivo (body + display), Fraunces (italic emphasis in h1), JetBrains Mono (eyebrow + meta)`
            : `paper: "FFFFFF" (slide background)
primary: "0D0D0D" (body text + lines)
accent: "B8B800" (NXT chartreuse — emphasis, highlight)
secondary: "00B7C3" (cyan — alternative accent)
muted: "666666" (grey — sub-labels)
fonts: Archivo (body + display), Fraunces (italic), JetBrains Mono (eyebrow + meta)`));

    // Per-kind guidance
    sections.push(`\n=== LAYOUT GUIDANCE ===` + perKindGuidance(args.kind));

    // Corpus
    if (args.corpus && args.corpus.length > 0) {
        sections.push(`\n=== RESEARCH CORPUS + UPLOADS (grounding evidence) ===\n${args.corpus.slice(0, 200000)}`);
    }

    // Revision
    if (args.currentArtifact) {
        sections.push(`\n=== CURRENT SPEC (REVISION mode — apply user intent; preserve unchanged objects; modify only what the prompt requests) ===\n` +
            `id: ${args.currentArtifact.id}\n` +
            `title: ${args.currentArtifact.title}\n` +
            `--- existing spec JSON ---\n` +
            JSON.stringify(args.currentArtifact.spec, null, 2));
    }

    sections.push(`\n=== USER REQUEST ===\n${args.userPrompt}`);

    sections.push(`\n=== OUTPUT FORMAT ===
Return EXACTLY one JSON object, with no preamble, no markdown fences, no trailing prose.
Wrap the JSON object in this delimiter for easier parsing:

:::nxt:slidespec
{ "id": "${args.currentArtifact?.id ?? `s_${Date.now()}`}", "kind": "${args.kind}", "brand": "${args.brand}", "title": "<action title>", "spec": { "width": 13.333, "height": 7.5, "background": "...", "objects": [...] }, "citations": [{"label":"...","source":"..."}] }
:::

REMEMBER: every object's coordinates must be in slide inches and fit inside 13.333 × 7.5.
NO text overlapping connector lines. NO duplicate IDs. Recompute coordinates when content density changes.`);

    return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Output parser
// ---------------------------------------------------------------------------

function extractSlideSpecBlock(raw: string): { id?: string; kind?: string; brand?: string; title?: string; spec?: any; citations?: any } | null {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let candidate = (fenced ? fenced[1] : raw).trim();
    // Strip optional :::nxt:slidespec ... ::: delimiters
    const delim = candidate.match(/:::nxt:slidespec\s*([\s\S]*?)\s*:::/);
    if (delim) candidate = delim[1].trim();

    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last <= first) return null;
    try {
        return JSON.parse(candidate.slice(first, last + 1));
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function generateSlideSpec(args: SlideSpecGenerateArgs): Promise<SlideSpecGenerateResult> {
    const model: SlideSpecModel = args.model ?? 'deepseek-v4-flash';
    const prompt = buildPrompt(args);

    let raw: string;
    try {
        raw = await callModel(prompt, model);
    } catch (err: any) {
        return { ok: false, error: `${model} request failed: ${err?.message ?? String(err)}`, modelUsed: model };
    }

    const parsed = extractSlideSpecBlock(raw);
    if (!parsed || !parsed.spec) {
        return { ok: false, error: 'Model did not return a parsable :::nxt:slidespec block', rawResponse: raw, modelUsed: model };
    }

    // Validate spec
    const specCheck = validateSlideSpec(parsed.spec);
    if (!specCheck.ok) {
        return { ok: false, error: `Spec schema validation failed: ${specCheck.error}`, rawResponse: raw, modelUsed: model };
    }

    // Compose the artifact
    const candidate = {
        id: parsed.id ?? `s_${Date.now()}`,
        type: 'slide' as const,
        kind: args.kind,
        brand: args.brand,
        title: typeof parsed.title === 'string' ? parsed.title : 'Untitled',
        spec: specCheck.value as SlideSpec,
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
        createdAt: args.currentArtifact?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
    };
    const validation = validateSlideArtifact(candidate);
    if (validation.ok !== true) {
        return { ok: false, error: `Artifact validation failed: ${(validation as any).error}`, rawResponse: raw, modelUsed: model };
    }

    return { ok: true, artifact: validation.value, modelUsed: model };
}
