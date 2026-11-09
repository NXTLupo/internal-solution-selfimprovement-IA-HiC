import { validatePersonaArtifact } from '../schemas/personaArtifact';
import { validateJourneyArtifact } from '../schemas/journeyArtifact';
import { validateOrgChartArtifact } from '../schemas/orgChartArtifact';
import { buildPersonaPrompt } from '../prompts/personaPrompt';
import { buildJourneyPrompt } from '../prompts/journeyPrompt';
import { buildOrgChartPrompt } from '../prompts/orgChartPrompt';
import type { Artifact } from '../types';
import type { BrandHashtag, ContentHashtag } from './hashtagParser';
import { analyzeText as analyzeTextOpenAI } from '../../services/openaiService';
import { GoogleGenAI } from '@google/genai';
import { makeGenAI } from '../../services/genaiClient';

/** Model id that the chat surface uses. Same union as `ChatModel` in corpusChatService.
 * 2026-05-05 - DeepSeek V4 Flash is the single-vendor primary; legacy
 * Gemini/GPT entries kept for backward-compat with old artifacts that
 * stored a model id, but new generations default to deepseek-v4-flash. */
export type GenerationModel = 'deepseek-v4-flash' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gpt-5.4';

export interface GenerateArgs {
    content: ContentHashtag;
    brand: BrandHashtag;
    userPrompt: string;
    designMdRaw: string;
    corpusText: string;
    currentArtifact: Artifact | null;
    /** Which provider model to use. Defaults to 'gemini-3.5-flash' (matches chat default). */
    model?: GenerationModel;
}

export interface GenerateResult {
    ok: true;
    artifact: Artifact;
    /** Present when the user requested multiple artifacts in one call ("generate 5 personas").
     *  When set, `artifact` is the FIRST artifact for backward compatibility; `artifacts` is
     *  the full validated set. Callers that handle multi-artifact responses should iterate
     *  `artifacts ?? [artifact]`. */
    artifacts?: Artifact[];
    modelUsed: GenerationModel;
}
export interface GenerateError {
    ok: false;
    error: string;
    rawResponse?: string;
    modelUsed?: GenerationModel;
}

const SYSTEM_PROMPT = 'You are a consulting artifact generator for the NXT Humans Design Desk. Return only a single JSON object as specified in the user prompt. No prose, no preamble, no markdown fences.';
// 32000: a single org-chart with 40 nodes uses ~10k tokens; "generate 5 personas"
// was hitting the cap and getting truncated mid-string. 32k headroom prevents that
// in the typical case. The truncation-tolerant array parser below also recovers
// complete objects when truncation does occur.
const MAX_TOKENS = 32000;
const TEMPERATURE = 0.2;

/** Provider IDs the underlying SDK clients expect. The chat-side ids may differ. */
function resolveProviderModelId(chatModel: GenerationModel): string {
    switch (chatModel) {
        case 'deepseek-v4-flash': return 'deepseek-v4-flash';
        case 'gpt-5.4': return 'gpt-5.4';
        case 'gemini-3.5-flash': return 'gemini-3.5-flash';
        case 'gemini-3.1-pro-preview': return 'gemini-3.1-pro-preview';
    }
}

async function callGemini(prompt: string, modelId: string): Promise<string> {
    const ai = makeGenAI();
    const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            responseMimeType: 'application/json',
        },
    });
    return (response as any)?.text ?? '';
}

// 2026-05-05 - Azure DeepSeek-V4-Flash via /api/ai/deepseek. OpenAI-
// compatible chat-completions schema.
async function callDeepSeek(prompt: string, modelId: string): Promise<string> {
    const resp = await fetch('http://127.0.0.1:5012/api/ai/deepseek', {
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

async function callForModel(prompt: string, model: GenerationModel): Promise<string> {
    const providerId = resolveProviderModelId(model);
    if (model === 'deepseek-v4-flash') return callDeepSeek(prompt, providerId);
    if (model === 'gpt-5.4') return analyzeTextOpenAI(SYSTEM_PROMPT, prompt, providerId, MAX_TOKENS, TEMPERATURE);
    return callGemini(prompt, providerId);
}

function extractJson(raw: string): unknown | null {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = (fenced ? fenced[1] : raw).trim();

    // Try array shape first when the outermost token is `[` - happens when user
    // asks for "generate 5 personas" and the model emits a JSON array. Use a
    // TRUNCATION-TOLERANT object walker: scan from the opening `[`, extract every
    // complete top-level `{...}` object using brace+string-state tracking, parse
    // each individually. A truncated last object loses only itself; all complete
    // earlier objects are recovered. Strict JSON.parse on the whole array would
    // throw on truncation and lose everything.
    const firstBracket = candidate.indexOf('[');
    const firstBraceIdx = candidate.indexOf('{');
    const arrayIsOutermost = firstBracket !== -1 && (firstBraceIdx === -1 || firstBracket < firstBraceIdx);
    if (arrayIsOutermost) {
        // Fast path: well-formed array. Try strict parse first - if it works we
        // get exactly what the model emitted, no walker quirks.
        const lastBracket = candidate.lastIndexOf(']');
        if (lastBracket > firstBracket) {
            try {
                const arr = JSON.parse(candidate.slice(firstBracket, lastBracket + 1));
                if (Array.isArray(arr)) return arr;
            } catch { /* fall through to walker */ }
        }
        // Slow path: walk the array body looking for complete top-level objects.
        const objects: unknown[] = [];
        let i = firstBracket + 1;
        const n = candidate.length;
        while (i < n) {
            // Skip whitespace and commas between objects
            while (i < n && /[\s,]/.test(candidate[i])) i++;
            if (i >= n || candidate[i] === ']') break;
            if (candidate[i] !== '{') { i++; continue; }
            // Walk a single object, tracking depth + string-state
            const objStart = i;
            let depth = 0;
            let inString = false;
            let escape = false;
            let closed = false;
            for (; i < n; i++) {
                const ch = candidate[i];
                if (escape) { escape = false; continue; }
                if (inString) {
                    if (ch === '\\') { escape = true; continue; }
                    if (ch === '"') inString = false;
                    continue;
                }
                if (ch === '"') { inString = true; continue; }
                if (ch === '{') depth++;
                else if (ch === '}') {
                    depth--;
                    if (depth === 0) { closed = true; i++; break; }
                }
            }
            if (!closed) break; // truncated object - stop here, keep what we have
            const objStr = candidate.slice(objStart, i);
            try { objects.push(JSON.parse(objStr)); } catch { /* skip malformed */ }
        }
        if (objects.length > 0) return objects;
        // Otherwise fall through to single-object extraction (last resort)
    }

    const first = candidate.indexOf('{');
    if (first === -1) return null;

    // Strict path: try to parse the whole thing from first { to last }.
    const last = candidate.lastIndexOf('}');
    if (last > first) {
        try {
            return JSON.parse(candidate.slice(first, last + 1));
        } catch { /* fall through to repair attempt */ }
    }

    // Repair path: the model may have truncated mid-output (token-cap reached).
    // Walk character-by-character from `first`, tracking brace/bracket depth and
    // string state. When we hit end-of-input, close any open structures and
    // attempt to parse the result. This handles the common "JSON cut off in the
    // middle of a deeply nested array" failure mode.
    let depth = 0;
    let inString = false;
    let escape = false;
    const stack: string[] = [];
    let lastValidEnd = -1;
    const buf: string[] = [];
    for (let i = first; i < candidate.length; i++) {
        const ch = candidate[i];
        buf.push(ch);
        if (escape) { escape = false; continue; }
        if (inString) {
            if (ch === '\\') { escape = true; continue; }
            if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') { inString = true; continue; }
        if (ch === '{') { stack.push('}'); depth++; }
        else if (ch === '[') { stack.push(']'); depth++; }
        else if (ch === '}' || ch === ']') {
            if (stack.length > 0) stack.pop();
            depth--;
            if (depth === 0) lastValidEnd = i;
        }
    }

    // Drop trailing partial token (e.g. an unfinished string or bare key) to make
    // the closure deterministic. Strip trailing comma + whitespace before closure.
    let repaired = buf.join('').replace(/,\s*$/, '').replace(/\s*"[^"]*$/, '').replace(/\s*$/, '');
    // If we ended inside a string, close it.
    if (inString) repaired += '"';
    // Close any remaining open structures (innermost first - stack already matches).
    while (stack.length > 0) repaired += stack.pop();

    try {
        return JSON.parse(repaired);
    } catch { /* fall through to next attempt */ }

    // Last-ditch: parse up to lastValidEnd if we found one (last position the
    // structure was balanced at depth 0). Could yield a partial-but-valid object.
    if (lastValidEnd > first) {
        try {
            return JSON.parse(candidate.slice(first, lastValidEnd + 1));
        } catch { /* give up */ }
    }
    return null;
}

export async function generateArtifact(args: GenerateArgs): Promise<GenerateResult | GenerateError> {
    let prompt: string;
    if (args.content === 'persona') {
        prompt = buildPersonaPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'persona' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else if (args.content === 'journey') {
        prompt = buildJourneyPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'journey' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else if (args.content === 'org') {
        prompt = buildOrgChartPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'org' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else {
        return { ok: false, error: `Content type "${args.content}" is not yet supported in the framework pilot (persona + journey + org only)` };
    }

    // 2026-10-05: this legacy path has no Claude client; its strongest reasoning model is Gemini Pro.
    const model: GenerationModel = args.model ?? 'gemini-3.1-pro-preview';

    let raw: string;
    try {
        raw = await callForModel(prompt, model);
    } catch (err: any) {
        return { ok: false, error: `${model} request failed: ${err?.message ?? String(err)}`, modelUsed: model };
    }

    const parsed = extractJson(raw);
    if (!parsed) {
        return { ok: false, error: 'Model did not return parsable JSON', rawResponse: raw, modelUsed: model };
    }

    const validator =
        args.content === 'persona' ? validatePersonaArtifact :
        args.content === 'journey' ? validateJourneyArtifact :
        validateOrgChartArtifact;

    // Multi-artifact case: model emitted a JSON array (e.g., "generate 5 personas").
    // Normalize+validate each element. Skip invalid items rather than failing the
    // whole batch - we want as many usable artifacts as the model produced.
    if (Array.isArray(parsed)) {
        const collected: Artifact[] = [];
        const errors: string[] = [];
        const seenIds = new Set<string>();
        parsed.forEach((item, idx) => {
            const normalized = normalizeArtifact(item as any, args.content, args.brand);
            // Force unique IDs - the model often clones the timestamp across array elements
            if (!normalized.id || typeof normalized.id !== 'string' || seenIds.has(normalized.id)) {
                normalized.id = `${args.content[0]}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
            }
            seenIds.add(normalized.id);
            const r = validator(normalized as any);
            if (r.ok) collected.push(r.value as Artifact);
            else errors.push(`item ${idx}: ${'error' in r ? r.error : 'invalid'}`);
        });
        if (collected.length === 0) {
            return {
                ok: false,
                error: `No valid artifacts in array of ${parsed.length} (errors: ${errors.slice(0, 3).join('; ')})`,
                rawResponse: raw,
                modelUsed: model,
            };
        }
        return { ok: true, artifact: collected[0], artifacts: collected, modelUsed: model };
    }

    // Defensive normalization - fill obvious gaps the model leaves so a missing
    // sub-team name or a swapped brand doesn't fail the whole generation.
    // Mirrors what the existing pipeline generators do post-stream.
    const normalized = normalizeArtifact(parsed as any, args.content, args.brand);

    const result = validator(normalized as any);
    if (!result.ok) {
        return { ok: false, error: `Artifact schema validation failed: ${'error' in result ? result.error : 'unknown'}`, rawResponse: raw, modelUsed: model };
    }

    return { ok: true, artifact: result.value as Artifact, modelUsed: model };
}

/**
 * Defensive normalization. Models occasionally emit empty/null fields where the
 * schema requires non-empty strings (e.g., a placeholder sub-team without a name).
 * Rather than fail the whole generation, fill obvious gaps with sensible
 * defaults. Anything we can't repair stays - the validator will still reject
 * truly malformed output.
 */
function normalizeArtifact(input: any, content: ContentHashtag, brand: BrandHashtag): any {
    if (!input || typeof input !== 'object') return input;
    const out: any = { ...input, type: content === 'org' ? 'org' : content, brand };

    // Defensive layout repair (org chart): models occasionally emit layout in
    // shapes the schema rejects -- nodes: null, nodes: [], nodes: "...",
    // or layout itself as a string. Strip the bad bits so the renderer's
    // fallback (autoLayout) takes over instead of failing the whole revision.
    if (content === 'org' && out.layout) {
        if (typeof out.layout !== 'object' || Array.isArray(out.layout)) {
            delete out.layout;
        } else {
            const validDirections = new Set(['TB', 'LR', 'BT', 'RL', 'radial']);
            if (typeof out.layout.direction !== 'string' || !validDirections.has(out.layout.direction)) {
                delete out.layout.direction;
            }
            const nodesField = out.layout.nodes;
            const isValidNodesRecord = nodesField
                && typeof nodesField === 'object'
                && !Array.isArray(nodesField)
                && Object.values(nodesField).every((v: any) =>
                    v && typeof v === 'object'
                    && typeof v.x === 'number' && typeof v.y === 'number'
                );
            if (!isValidNodesRecord) {
                // Drop nodes -- renderer will recompute via autoLayout for the chosen direction
                delete out.layout.nodes;
            }
            // If layout ended up empty, drop it entirely so the renderer falls back to TB
            if (!out.layout.direction && !out.layout.nodes) {
                delete out.layout;
            }
        }
    }

    if (content === 'org' && Array.isArray(out.nodes)) {
        out.nodes = out.nodes.map((n: any, i: number) => {
            const node: any = { ...n };
            const nameStr = typeof node.name === 'string' ? node.name.trim() : '';
            const titleStr = typeof node.title === 'string' ? node.title.trim() : '';
            const explicitVacant = node.iconKey === 'vacant' || /^vacant$/i.test(nameStr);

            // Only force "VACANT" when the model explicitly indicated a vacancy.
            // For a missing name with a present title, prefer the title-as-display
            // (e.g., "Senior Vice President for Advancement") over forcing VACANT.
            if (explicitVacant) {
                node.name = 'VACANT';
                node.iconKey = 'vacant';
                if (!titleStr) node.title = 'Open role';
            } else if (!nameStr) {
                if (titleStr) {
                    // No name, but a real title exists - display the title as the name
                    // so the user sees the role rather than "VACANT". iconKey stays whatever
                    // the model emitted (default 'person'). This matches the user's expectation:
                    // when the corpus describes a role, surface the role.
                    node.name = titleStr;
                } else {
                    // Truly empty - no name, no title. Now we have to call it something.
                    node.name = 'Unnamed Role';
                }
            }

            // Fill missing title from name when title is empty
            if (!titleStr) {
                if (node.iconKey === 'vacant') node.title = node.title || 'Open role';
                else node.title = node.title || node.name;
            }

            // Default iconKey when not set: 'person' for individuals, 'team' if name looks like a team
            if (!node.iconKey) {
                const looksLikeTeam = /\b(team|squad|pod|group|committee|council|unit|department)\b/i.test(node.name || '');
                node.iconKey = looksLikeTeam ? 'team' : 'person';
            }

            // Ensure id exists; fall back to index-based slug
            if (!node.id || typeof node.id !== 'string') {
                node.id = `n${i + 1}`;
            }
            // directReports must be an array
            if (!Array.isArray(node.directReports)) node.directReports = [];
            return node;
        });

        // Drop directReports entries that don't reference an existing node
        const ids = new Set(out.nodes.map((n: any) => n.id));
        out.nodes = out.nodes.map((n: any) => ({
            ...n,
            directReports: n.directReports.filter((r: string) => ids.has(r)),
        }));

        // rootIds: drop dangling ids; if empty, derive from nodes that aren't anyone's directReport
        if (Array.isArray(out.rootIds)) {
            out.rootIds = out.rootIds.filter((r: string) => ids.has(r));
        } else {
            out.rootIds = [];
        }
        if (out.rootIds.length === 0) {
            const reportedTo = new Set<string>();
            for (const n of out.nodes) for (const r of n.directReports) reportedTo.add(r);
            out.rootIds = out.nodes.filter((n: any) => !reportedTo.has(n.id)).map((n: any) => n.id);
            if (out.rootIds.length === 0 && out.nodes.length > 0) out.rootIds = [out.nodes[0].id];
        }
    }

    // Common defaults
    if (typeof out.createdAt !== 'number') out.createdAt = Date.now();
    if (typeof out.updatedAt !== 'number') out.updatedAt = Date.now();
    if (!Array.isArray(out.citations)) out.citations = [];

    return out;
}
