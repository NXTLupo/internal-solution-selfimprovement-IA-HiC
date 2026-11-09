// services/criticDispatcher.ts - 2026-05-25, rewired 2026-10-01 (plan Stage 2.6, audit C8)
//
// The piece that makes the expert panel actually fire LLM-based domain
// critics (not just deterministic hygiene). Given a critic skill name +
// a deliverable, it resolves the critic's rubric text THROUGH THE MANIFEST
// (hic-workspace/wiki/eval/rubrics/index.json `critics` map), builds a model
// prompt, calls the proxy, and parses a CriticVerdict back out.
//
// 2026-10-01 fail-closed contract (C8 named the three leaks):
//   - a critic whose rubric text cannot be loaded returns a verdict carrying
//     `error` (never a generic "you are a critic" prompt);
//   - unparseable critic output returns `error`, not `accept: true`;
//   - a dispatch failure returns `error`, not `accept: true`.
//   criticReviseLoop records each as a degradation event and runExpertPanel
//   refuses to declare `pass` while any critic errored.
//
// Pairs with services/artifactExpertPanel.ts as the invoke_critic param.

import { parseJSONWithRepair } from './aiOutputRepair';
import { withResilience, isThrottleError } from './multiModelResilience';
import type { CriticInvoker, CriticVerdict } from './criticReviseLoop';
import { CLAUDE_REASONING_MODEL } from './aiRouter';
import { listPriceFor } from './costMeter';
import {
    loadRubricIndex,
    resolveCriticSource,
    runDeterministicCheck,
    buildRubricScoringPrompt,
    parseRubricScores,
    type AuditorRubric,
    type ModelCriterionScore,
    type RubricIndex,
} from './auditorRubrics';


// ─── Skill loader ────────────────────────────────────────────────────────────
// Skills live at .claude/skills/<name>/SKILL.md and are served at /skills/<name>/SKILL.md
// (Vite plugin in dev, nginx volume mount in Docker). Nested skills (skills/diagrams/*) are
// reachable only through the manifest's `critics` map; the flat path 404s (C8).

const SKILL_CACHE = new Map<string, string>();

class CriticRubricMissingError extends Error {
    constructor(public readonly skill: string, detail: string) {
        super(`rubric missing for critic '${skill}': ${detail}`);
        this.name = 'CriticRubricMissingError';
    }
}

/** The SPA fallback answers unknown paths with index.html and HTTP 200; a skill body is markdown. */
function looksLikeSkillMarkdown(text: string): boolean {
    if (!text || text.trim().length < 40) return false;
    if (/^\s*<(!doctype|html)/i.test(text)) return false;
    return true;
}

async function loadSkillMarkdown(skillName: string, proxyBase: string, index: RubricIndex | null): Promise<string> {
    if (SKILL_CACHE.has(skillName)) return SKILL_CACHE.get(skillName)!;
    const source = resolveCriticSource(index, skillName);
    const attempts: string[] = [];
    if (source.path) {
        attempts.push(source.path);
        try {
            const resp = await fetch(source.path);
            if (resp.ok) {
                const text = await resp.text();
                if (looksLikeSkillMarkdown(text)) { SKILL_CACHE.set(skillName, text); return text; }
            }
        } catch { /* fall through */ }
    }
    // Proxy read (flat names only; the proxy sanitizes '/' out of the name).
    if (!/[\/\\]/.test(skillName)) {
        attempts.push(`${proxyBase}/api/skill/read?name=${encodeURIComponent(skillName)}`);
        try {
            const resp = await fetch(`${proxyBase}/api/skill/read?name=${encodeURIComponent(skillName)}`);
            if (resp.ok) {
                const data = await resp.json();
                const text = typeof data?.content === 'string' ? data.content : '';
                if (looksLikeSkillMarkdown(text)) { SKILL_CACHE.set(skillName, text); return text; }
            }
        } catch { /* fall through */ }
    }
    throw new CriticRubricMissingError(skillName, `tried ${attempts.join(', ') || 'no path'}`);
}

/** Tests and hot-reload callers clear the skill cache. */
export function resetCriticSkillCache(): void {
    SKILL_CACHE.clear();
}


// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildCriticPrompt(skillName: string, skillMd: string, deliverable: unknown, evidenceBlock?: string): string {
    return `You are the "${skillName}" critic. Your job is to review the deliverable below against your domain discipline and return a structured verdict with concrete edits.

═══════════════════════════════════════════════════════════════
SKILL DEFINITION
═══════════════════════════════════════════════════════════════
${skillMd.slice(0, 12000)}

═══════════════════════════════════════════════════════════════
DELIVERABLE UNDER REVIEW
═══════════════════════════════════════════════════════════════
${JSON.stringify(deliverable, null, 2).slice(0, 28000)}
${evidenceBlock ? `
═══════════════════════════════════════════════════════════════
FRESH CORPUS EVIDENCE (retrieved for your own queries; ground edits here)
═══════════════════════════════════════════════════════════════
${evidenceBlock.slice(0, 8000)}
` : ''}
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
- Max 5 edits per verdict - focus on the load-bearing issues
- Skip cosmetic fixes (em-dashes, formatting) - those are caught by the universal critics
- DO NOT invent corpus content. If a field needs evidence the corpus does not contain, OMIT (action="remove") rather than fabricate

Return the JSON now.`;
}


// ─── Anthropic call ──────────────────────────────────────────────────────────

const MODEL_MAP: Record<string, string> = {
    'sonnet-4.6': 'claude-sonnet-4-6',
    // 2026-09-30 (plan Stage 0.5): the skills' 'opus-*' tier name means the current
    // Claude reasoning model (Opus 5.5), resolved through aiRouter.
    'opus-4.8':   CLAUDE_REASONING_MODEL,
    'opus-5.5':   CLAUDE_REASONING_MODEL,
    'haiku-4.5':  'claude-haiku-4-5',
};

async function callAnthropicText(model: string, prompt: string, proxyBase: string, maxTokens: number): Promise<string> {
    const body = {
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    };
    const resp = await fetch(`${proxyBase}/api/ai/anthropic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        throw new Error(`anthropic HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const data = await resp.json();
    return ((data.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text || '').join(''));   // 2026-10-05: content[0] can be a thinking block
}

interface AnthropicCallOpts {
    skill: string;
    deliverable: unknown;
    model: string;   // a Claude model id from aiRouter (sonnet tier, the reasoning model, or haiku)
    proxyBase: string;
    index: RubricIndex | null;
    evidenceBlock?: string;
}

async function invokeAnthropicCritic(opts: AnthropicCallOpts): Promise<{ verdict: CriticVerdict; cost_usd: number }> {
    const skillMd = await loadSkillMarkdown(opts.skill, opts.proxyBase, opts.index);
    // 2026-10-30 (WS-2 E9): a per-run nonce so the proxy's exact-match cache never replays an earlier
    // judgment for the same artifact; calibration needs independent repeat judgments.
    const prompt = buildCriticPrompt(opts.skill, skillMd, opts.deliverable, opts.evidenceBlock) + `\n\n[judge run ${Date.now().toString(36)}]`;
    const text = await callAnthropicText(opts.model, prompt, opts.proxyBase, 2000);

    let parsed: any;
    try {
        parsed = parseJSONWithRepair(text, { calling_context: `critic:${opts.skill}` });
    } catch (e: any) {
        // 2026-10-01 (C8): unparseable output is NOT an acceptance.
        console.warn(`[critic-dispatcher/${opts.skill}] unparseable critic output:`, e?.message);
        return {
            verdict: {
                accept: false, edits: [], confidence: 'low',
                rationale: `${opts.skill}: unparseable critic output`,
                error: `unparseable critic output: ${String(e?.message || e).slice(0, 120)}`,
            },
            cost_usd: estimateCost(opts.model, text.length),
        };
    }

    // Normalize the verdict - defensively, since critic models occasionally
    // omit fields under load.
    const verdict: CriticVerdict = {
        accept: parsed.accept === true,
        edits: Array.isArray(parsed.edits) ? parsed.edits : [],
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : `${opts.skill}: no rationale`,
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
        ...(Array.isArray(parsed.retrieval_queries) ? { retrieval_queries: parsed.retrieval_queries.filter((q: unknown) => typeof q === 'string') } : {}),
    };

    return { verdict, cost_usd: estimateCost(opts.model, text.length) };
}


// ─── Cost estimation ─────────────────────────────────────────────────────────
// Sample size approximation: 4 chars per token.
function estimateCost(model: string, outputChars: number): number {
    const inputTokens = 14000 / 4; // skill md + prompt + deliverable
    const outputTokens = outputChars / 4;
    // 2026-09-30: list prices come from the cost meter, never a local constant.
    const { in: inputCostPerM, out: outputCostPerM } = listPriceFor(model);
    return (inputTokens * inputCostPerM + outputTokens * outputCostPerM) / 1_000_000;
}


// ─── The exported invoker ────────────────────────────────────────────────────
// Plug this into runExpertPanel via opts.invoke_critic, and the domain
// critics (pre-mortem, persona-architect, etc.) will actually fire.

export const dispatchCritic: CriticInvoker = async (opts) => {
    const index = await loadRubricIndex({ proxyBase: opts.proxy_base }).catch(() => null);

    // A critic the manifest marks deterministic (verbatim-quote-auditor, evidence-quality-auditor)
    // runs its check in-process: no SKILL.md, no model call, no fabricated edits.
    const source = resolveCriticSource(index, opts.skill_name);
    if (source.deterministic) {
        const r = runDeterministicCheck(source.deterministic, opts.deliverable);
        if (r.score === null) {
            return { verdict: { accept: false, edits: [], confidence: 'low', rationale: `${opts.skill_name}: ${r.finding}`, error: `deterministic check '${source.deterministic}' could not score: ${r.finding}` }, cost_usd: 0 };
        }
        return {
            verdict: { accept: r.score >= 3, edits: [], confidence: 'high', rationale: `${opts.skill_name} (${source.deterministic}): ${r.finding} [score ${r.score}/5]` },
            cost_usd: 0,
        };
    }

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
                    model: MODEL_MAP[opts.invocation_model] ?? MODEL_MAP['sonnet-4.6'],
                    proxyBase: opts.proxy_base,
                    index,
                    evidenceBlock: opts.evidence_block,
                });
            },
        }).then(r => r.result);
    } catch (err: any) {
        // 2026-10-01 (C8): a dispatch failure is NOT an acceptance.
        const reason = err instanceof CriticRubricMissingError
            ? err.message
            : `dispatcher error: ${String(err?.message || err).slice(0, 160)}`;
        console.warn(`[critic-dispatcher/${opts.skill_name}] failed, no review:`, reason);
        return {
            verdict: { accept: false, edits: [], confidence: 'low', rationale: `${opts.skill_name}: ${reason}`, error: reason },
            cost_usd: 0,
        };
    }
};


// ─── Rubric scorer (2026-10-01, plan 3.7 / 5.4) ─────────────────────────────
// One model call that scores every criterion of a kind's rubric 1-5. The panel merges it
// with the deterministic checks (model may lower, never raise) and decides the verdict.

export type RubricScorer = (opts: {
    rubric: AuditorRubric;
    deliverable: unknown;
    proxy_base: string;
    model_tier?: 'sonnet-4.6' | 'opus-4.8' | 'haiku-4.5';
}) => Promise<{ scores: Record<string, ModelCriterionScore> | null; cost_usd: number; error?: string }>;

export const dispatchRubricScores: RubricScorer = async (opts) => {
    const model = MODEL_MAP[opts.model_tier ?? 'sonnet-4.6'] ?? MODEL_MAP['sonnet-4.6'];
    const prompt = buildRubricScoringPrompt(opts.rubric, opts.deliverable);
    try {
        const { result: text } = await withResilience<string>({
            primary: 'anthropic',
            fallbacks: [],
            stage: `rubric:${opts.rubric.kind}`,
            is429: isThrottleError,
            invoke: async () => callAnthropicText(model, prompt, opts.proxy_base, 1800),
        });
        let parsed: unknown;
        try {
            parsed = parseJSONWithRepair(text, { calling_context: `rubric:${opts.rubric.kind}` });
        } catch (e: any) {
            return { scores: null, cost_usd: estimateCost(model, text.length), error: `unparseable rubric scores: ${String(e?.message || e).slice(0, 120)}` };
        }
        const scores = parseRubricScores(parsed, opts.rubric);
        return { scores, cost_usd: estimateCost(model, text.length), ...(scores ? {} : { error: 'rubric scorer returned no usable scores' }) };
    } catch (err: any) {
        return { scores: null, cost_usd: 0, error: `rubric scorer failed: ${String(err?.message || err).slice(0, 160)}` };
    }
};
