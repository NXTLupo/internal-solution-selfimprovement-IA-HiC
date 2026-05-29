// services/criticDispatcher.ts — 2026-05-25
//
// The piece that makes the expert panel actually fire LLM-based domain
// critics (not just deterministic hygiene). Given a critic skill name +
// a deliverable, it fetches the skill markdown, builds a model prompt,
// calls the proxy, and parses a CriticVerdict back out.
//
// Pairs with services/artifactExpertPanel.ts as the invoke_critic param.

import { parseJSONWithRepair } from './aiOutputRepair';
import { withResilience, isThrottleError } from './multiModelResilience';
import type { CriticInvoker, CriticVerdict, CriticConfig } from './criticReviseLoop';


// ─── Skill loader ────────────────────────────────────────────────────────────
// Skills live at .claude/skills/<name>/SKILL.md and are served by the Vite
// dev server at /skills/<name>/SKILL.md (see vite.config.ts custom plugin).

const SKILL_CACHE = new Map<string, string>();

async function loadSkillMarkdown(skillName: string, proxyBase: string): Promise<string> {
    if (SKILL_CACHE.has(skillName)) return SKILL_CACHE.get(skillName)!;
    try {
        const resp = await fetch(`/skills/${skillName}/SKILL.md`);
        if (resp.ok) {
            const text = await resp.text();
            SKILL_CACHE.set(skillName, text);
            return text;
        }
    } catch { /* fall through */ }
    // Fallback: try the wiki path the proxy serves
    try {
        const resp = await fetch(`${proxyBase}/skills/${skillName}/SKILL.md`);
        if (resp.ok) {
            const text = await resp.text();
            SKILL_CACHE.set(skillName, text);
            return text;
        }
    } catch { /* fall through */ }
    // No skill found — return a minimal generic critic guidance so the call
    // doesn't fail. The panel keeps moving.
    return `You are a domain critic for the "${skillName}" skill. Review the deliverable for quality, evidence grounding, and adherence to the skill's core discipline. Suggest structured edits.`;
}


// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildCriticPrompt(skillName: string, skillMd: string, deliverable: unknown): string {
    return `You are the "${skillName}" critic. Your job is to review the deliverable below against your domain discipline and return a structured verdict with concrete edits.

═══════════════════════════════════════════════════════════════
SKILL DEFINITION
═══════════════════════════════════════════════════════════════
${skillMd.slice(0, 12000)}

═══════════════════════════════════════════════════════════════
DELIVERABLE UNDER REVIEW
═══════════════════════════════════════════════════════════════
${JSON.stringify(deliverable, null, 2).slice(0, 28000)}

═══════════════════════════════════════════════════════════════
RETURN FORMAT
═══════════════════════════════════════════════════════════════
Return ONLY a single JSON object with this shape. No prose, no markdown fences:

{
  "accept": false,
  "edits": [
    {
      "target_path": "personas[0].quote",
      "action": "replace",
      "new_value": "verbatim quote from corpus with named source",
      "reason": "current quote lacks named-source attribution"
    }
  ],
  "rationale": "Top 1-2 sentences explaining the verdict.",
  "confidence": "high"
}

RULES:
- target_path uses dot + bracket notation, e.g. "recommendations[3].quantification.baseline"
- action is one of "replace", "append", "remove"
- new_value is the corrected value (omit for action="remove")
- accept is true ONLY if the deliverable fully meets the skill's discipline; otherwise false with at least one edit
- confidence is "high" / "medium" / "low" reflecting your certainty
- Max 5 edits per verdict — focus on the load-bearing issues
- Skip cosmetic fixes (em-dashes, formatting) — those are caught by the universal critics
- DO NOT invent corpus content. If a field needs evidence the corpus does not contain, OMIT (action="remove") rather than fabricate

Return the JSON now.`;
}


// ─── Anthropic invoker ───────────────────────────────────────────────────────

interface AnthropicCallOpts {
    skill: string;
    deliverable: unknown;
    model: 'claude-sonnet-4-6' | 'claude-opus-4-8' | 'claude-haiku-4-5';
    proxyBase: string;
}

async function invokeAnthropicCritic(opts: AnthropicCallOpts): Promise<{ verdict: CriticVerdict; cost_usd: number }> {
    const skillMd = await loadSkillMarkdown(opts.skill, opts.proxyBase);
    const prompt = buildCriticPrompt(opts.skill, skillMd, opts.deliverable);

    const body = {
        model: opts.model,
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
    };

    const resp = await fetch(`${opts.proxyBase}/api/ai/anthropic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        throw new Error(`anthropic HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text ?? '';

    let parsed: any;
    try {
        parsed = parseJSONWithRepair(text, { calling_context: `critic:${opts.skill}` });
    } catch (e: any) {
        // Critic returned unparseable output — accept as a pass-through so
        // the panel doesn't block. Log for telemetry.
        console.warn(`[critic-dispatcher/${opts.skill}] unparseable output, pass-through:`, e?.message);
        return {
            verdict: { accept: true, edits: [], rationale: `${opts.skill}: unparseable critic output, pass-through`, confidence: 'low' },
            cost_usd: estimateCost(opts.model, text.length),
        };
    }

    // Normalize the verdict — defensively, since critic models occasionally
    // omit fields under load.
    const verdict: CriticVerdict = {
        accept: parsed.accept !== false,
        edits: Array.isArray(parsed.edits) ? parsed.edits : [],
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : `${opts.skill}: no rationale`,
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    };

    return { verdict, cost_usd: estimateCost(opts.model, text.length) };
}


// ─── Cost estimation ─────────────────────────────────────────────────────────
// Anthropic standard pricing per 1M tokens (2026-05-29):
//   Opus 4.8:   $5 input / $25 output
//   Sonnet 4.6: $3 input / $15 output
// Sample size approximation: 4 chars per token.
function estimateCost(model: string, outputChars: number): number {
    const inputTokens = 14000 / 4; // skill md + prompt + deliverable
    const outputTokens = outputChars / 4;
    const inputCostPerM = model === 'claude-opus-4-8' ? 5 : 3;
    const outputCostPerM = model === 'claude-opus-4-8' ? 25 : 15;
    return (inputTokens * inputCostPerM + outputTokens * outputCostPerM) / 1_000_000;
}


// ─── The exported invoker ────────────────────────────────────────────────────
// Plug this into runExpertPanel via opts.invoke_critic, and the domain
// critics (pre-mortem, persona-architect, etc.) will actually fire.

export const dispatchCritic: CriticInvoker = async (opts) => {
    const modelMap: Record<CriticConfig['invocation_model'], 'claude-sonnet-4-6' | 'claude-opus-4-8' | 'claude-haiku-4-5'> = {
        'sonnet-4.6': 'claude-sonnet-4-6',
        'opus-4.8':   'claude-opus-4-8',
        'haiku-4.5':  'claude-haiku-4-5',
    };

    try {
        return await withResilience<{ verdict: CriticVerdict; cost_usd: number }>({
            primary: 'anthropic',
            fallbacks: ['gemini'],
            stage: `critic:${opts.skill_name}`,
            is429: isThrottleError,
            invoke: async (_provider) => {
                return invokeAnthropicCritic({
                    skill: opts.skill_name,
                    deliverable: opts.deliverable,
                    model: modelMap[opts.invocation_model],
                    proxyBase: opts.proxy_base,
                });
            },
        }).then(r => r.result);
    } catch (err: any) {
        console.warn(`[critic-dispatcher/${opts.skill_name}] failed, pass-through:`, err?.message);
        return {
            verdict: { accept: true, edits: [], rationale: `${opts.skill_name}: dispatcher error, pass-through`, confidence: 'low' },
            cost_usd: 0,
        };
    }
};
