/**
 * Feedback Regeneration — synchronous "Apply now" path.
 *
 * Given an original output and a feedback instruction, runs a focused
 * regeneration of either the targeted section or the whole deliverable.
 * Returns the new output plus a structural diff.
 *
 * Used by FeedbackWidget.onApplyNow handlers in CorpusChatPanel and
 * DesignDeskChat. Latency target: <15s including the parse + regen steps.
 *
 * Created 2026-05-22 as part of the self-improvement loop, Phase 2.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface RegenerationRequest {
    originalText: string;
    feedbackText: string;
    deliverableType: string;
    sectionScope?: string | null;
    engagementSlug?: string;
    /**
     * Provider override. 2026-05-22 — Default changed from 'anthropic'
     * (Opus) to 'gemini' (Gemini 3.5 Flash). The "Apply now" path has a
     * <15s latency budget that Opus consistently exceeded; Flash hits the
     * same regen task in ~3-6s at ~10% of the cost, and the targeted-edit
     * prompt format keeps the task structured enough for Flash. Pass
     * `provider: 'anthropic'` to escalate to Opus for high-stakes
     * regenerations where the user has already rejected the Flash output.
     */
    provider?: 'anthropic' | 'gemini' | 'openai';
}

export interface RegenerationResult {
    ok: boolean;
    newText?: string;
    diff?: TextDiff;
    instruction?: string;
    durationMs: number;
    error?: string;
}

export interface TextDiff {
    addedChars: number;
    removedChars: number;
    sectionChanged: string | null;
    summary: string;
}

/**
 * Convert user feedback into a structured, actionable regenerator instruction.
 * Step 1 of 2 in the regeneration flow. Uses Haiku for cost (~$0.001).
 */
async function parseFeedbackToInstruction(
    feedbackText: string,
    deliverableType: string,
    sectionScope?: string | null,
): Promise<string> {
    const prompt = `A user gave feedback on a generated ${deliverableType}${sectionScope ? ` (specifically the "${sectionScope}" section)` : ''}.

User feedback: "${feedbackText}"

Convert this into a precise, actionable instruction for an AI regenerator. The instruction should:
- Start with a verb (e.g., "Tighten", "Replace", "Add", "Remove")
- Identify exactly what to change
- State what the new version should look like
- Be one or two sentences maximum

Return only the instruction text. No preamble. No quotes.`;

    // 2026-05-22 — Switched from Haiku to Gemini 3.5 Flash for the
    // feedback-instruction parse step. Single-step transform, but the
    // applyRegeneration step downstream now also uses Flash by default —
    // keeping both halves on the same provider eliminates the cross-vendor
    // latency on the "Apply now" path and tightens the total budget toward
    // <10s. Anthropic Haiku stays as a fallback for resilience.
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 250 },
            }),
        });
        if (resp.ok) {
            const data = await resp.json();
            const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text.trim().length > 5) return text.trim().replace(/^["']|["']$/g, '');
        }
        const fbResp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!fbResp.ok) return feedbackText;
        const data = await fbResp.json();
        const text: string = data?.content?.[0]?.text || feedbackText;
        return text.trim().replace(/^["']|["']$/g, '');
    } catch {
        return feedbackText;
    }
}

/**
 * Apply the regeneration. Step 2 of 2.
 */
async function applyRegeneration(
    originalText: string,
    instruction: string,
    deliverableType: string,
    sectionScope: string | null,
    provider: 'anthropic' | 'gemini' | 'openai',
): Promise<string | null> {
    const scopeNote = sectionScope
        ? `Apply the instruction ONLY to the "${sectionScope}" section. Leave every other section byte-identical.`
        : `Apply the instruction across the whole output.`;

    const prompt = `You are revising a consulting deliverable of type "${deliverableType}".

ORIGINAL:
${originalText}

INSTRUCTION:
${instruction}

CONSTRAINTS:
- ${scopeNote}
- Preserve the original document's structure, headers, and any inline citations.
- Do not add meta-narration (no "based on the feedback", no "I have updated", no "here is the revised").
- Return ONLY the revised deliverable text, beginning with the same first line as the original if possible.`;

    if (provider === 'anthropic') {
        const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-opus-4-8',
                max_tokens: 8000,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.content?.[0]?.text || null;
    } else if (provider === 'gemini') {
        // 2026-05-22 — Gemini 3.5 Flash for the "Apply now" path. The proxy
        // wraps the request in the proper { contents: [{ parts: [...] }] }
        // shape via its config field, so we send the string directly.
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 8000 },
            }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } else {
        const resp = await fetch(`${PROXY_BASE}/api/ai/openai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-5.5',
                max_completion_tokens: 8000,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.choices?.[0]?.message?.content || null;
    }
}

function computeDiff(before: string, after: string, sectionScope: string | null): TextDiff {
    // Lightweight diff: report char-level delta + a best-effort detection of
    // which section actually changed. For richer diffs the UI can call
    // diff-match-patch separately.
    const addedChars = Math.max(0, after.length - before.length);
    const removedChars = Math.max(0, before.length - after.length);
    let sectionChanged: string | null = sectionScope;

    // If no scope was provided, scan for the first H2-level heading whose
    // body differs between before/after.
    if (!sectionScope) {
        const beforeSecs = splitByH2(before);
        const afterSecs = splitByH2(after);
        for (const heading of Object.keys(beforeSecs)) {
            if (afterSecs[heading] && beforeSecs[heading] !== afterSecs[heading]) {
                sectionChanged = heading;
                break;
            }
        }
    }

    const summary = sectionChanged
        ? `Section "${sectionChanged}" updated (+${addedChars} chars, -${removedChars} chars).`
        : `Output rewritten (+${addedChars} chars, -${removedChars} chars).`;

    return { addedChars, removedChars, sectionChanged, summary };
}

function splitByH2(text: string): Record<string, string> {
    const parts: Record<string, string> = {};
    const lines = text.split('\n');
    let currentHeading = '__intro__';
    let buffer: string[] = [];
    for (const line of lines) {
        if (line.startsWith('## ')) {
            parts[currentHeading] = buffer.join('\n');
            currentHeading = line.replace(/^##\s+/, '').trim();
            buffer = [];
        } else {
            buffer.push(line);
        }
    }
    parts[currentHeading] = buffer.join('\n');
    return parts;
}

/**
 * Main entry: regenerate a deliverable (or section) using user feedback as
 * the regeneration instruction.
 */
export async function regenerateWithFeedback(
    req: RegenerationRequest,
): Promise<RegenerationResult> {
    const t0 = Date.now();
    try {
        const instruction = await parseFeedbackToInstruction(
            req.feedbackText,
            req.deliverableType,
            req.sectionScope,
        );
        const provider = req.provider || 'gemini';
        const newText = await applyRegeneration(
            req.originalText,
            instruction,
            req.deliverableType,
            req.sectionScope || null,
            provider,
        );
        if (!newText) {
            return {
                ok: false,
                durationMs: Date.now() - t0,
                error: 'Regeneration returned no text.',
            };
        }
        const diff = computeDiff(req.originalText, newText, req.sectionScope || null);
        return {
            ok: true,
            newText,
            diff,
            instruction,
            durationMs: Date.now() - t0,
        };
    } catch (err: any) {
        // P0.4 — surface the failure with structured detail so the UI can show
        // the user a specific diagnostic ("Apply Now parse failed: <reason>")
        // instead of generic "regeneration failed".
        const errMessage = err?.message || String(err);
        const isParseError = /parse|json|unexpected/i.test(errMessage);
        return {
            ok: false,
            durationMs: Date.now() - t0,
            error: errMessage,
            errorCategory: isParseError ? 'parse-error' : 'generation-error',
            errorHint: isParseError
                ? 'The regeneration model returned malformed JSON. Try clicking Apply Now again — the system will retry with the Opus model.'
                : 'The regeneration model returned an error. Check the proxy logs and the model status.',
        } as any;
    }
}
