// services/criticReviseLoop.ts
// The architectural primitive that wraps any deliverable in a generator → critic → revisor loop.
// See .claude/skills/critic-revise-loop/SKILL.md for the full contract.
//
// 2026-05-24 - Phase 3 of plans/hic-notebooklm-uplift-plan-2026-05-24.md

import { parseJSONWithRepair } from './aiOutputRepair';
import {
    emitDegradationEvent,
    isThrottleError,
    withResilience,
    type DegradationEvent,
    type Provider,
} from './multiModelResilience';


export type CriticEdit = {
    target_path: string;        // dot-path into the deliverable JSON, e.g. "recommendations[3].quantification.baseline"
    action: 'replace' | 'append' | 'remove';
    new_value?: unknown;
    reason: string;
};

export type CriticVerdict = {
    accept: boolean;
    edits: CriticEdit[];
    rationale: string;
    confidence: 'high' | 'medium' | 'low';
};

export type CriticConfig = {
    skill_name: string;
    max_iterations: number;
    invocation_model: 'sonnet-4.6' | 'opus-4.8' | 'haiku-4.5';
};

export type RevisorModel = 'sonnet-4.6' | 'haiku-4.5';

export type HaltReason = 'all_accept' | 'iterations_exhausted' | 'budget_breached' | 'critic_error';

export type CriticReviseLoopOpts<T> = {
    deliverable: T;
    critics: CriticConfig[];
    revisor_model: RevisorModel;
    halt_when: 'all_accept' | 'iterations_exhausted' | 'budget_breached';
    budget_usd?: number;            // default $0.50
    surface_critique_log: boolean;  // default true
    proxy_base?: string;             // default http://localhost:5012
    invoke_critic?: CriticInvoker;   // custom critic invoker (for tests / external skills)
};

export type CriticReviseLoopResult<T> = {
    result: T;
    iterations_per_critic: Record<string, number>;
    critique_log: Array<{
        critic: string;
        iteration: number;
        verdict: CriticVerdict;
        edits_applied: number;
        cost_usd: number;
    }>;
    total_cost_usd: number;
    halted_reason: HaltReason;
    degradation_events: DegradationEvent[];
};

export type CriticInvoker = (opts: {
    skill_name: string;
    deliverable: unknown;
    invocation_model: CriticConfig['invocation_model'];
    proxy_base: string;
}) => Promise<{ verdict: CriticVerdict; cost_usd: number }>;


// ──────────────────────────────────────────────────────────────────────────
// Path operations on the deliverable JSON
// Supports "recommendations[3].quantification.baseline" syntax
// ──────────────────────────────────────────────────────────────────────────

function parsePath(path: string): Array<string | number> {
    const parts: Array<string | number> = [];
    const re = /([a-zA-Z_$][\w$]*)|\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(path)) !== null) {
        if (m[1] !== undefined) parts.push(m[1]);
        else if (m[2] !== undefined) parts.push(parseInt(m[2], 10));
    }
    return parts;
}

function getAtPath(obj: any, path: string): unknown {
    const parts = parsePath(path);
    let cur = obj;
    for (const p of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[p as any];
    }
    return cur;
}

function setAtPath(obj: any, path: string, value: unknown): void {
    const parts = parsePath(path);
    if (parts.length === 0) return;
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        const next = parts[i + 1];
        if (cur[p as any] === undefined || cur[p as any] === null) {
            cur[p as any] = typeof next === 'number' ? [] : {};
        }
        cur = cur[p as any];
    }
    cur[parts[parts.length - 1] as any] = value;
}

function appendAtPath(obj: any, path: string, value: unknown): void {
    const existing = getAtPath(obj, path);
    if (Array.isArray(existing)) {
        existing.push(value);
    } else if (existing === undefined) {
        setAtPath(obj, path, [value]);
    } else {
        // Convert to array
        setAtPath(obj, path, [existing, value]);
    }
}

function removeAtPath(obj: any, path: string): void {
    const parts = parsePath(path);
    if (parts.length === 0) return;
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        cur = cur?.[parts[i] as any];
        if (cur === null || cur === undefined) return;
    }
    const last = parts[parts.length - 1];
    if (typeof last === 'number' && Array.isArray(cur)) {
        cur.splice(last, 1);
    } else {
        delete cur[last as any];
    }
}


/**
 * Validate that a target_path is safe to apply against a deliverable.
 * Returns null if safe, or a reason string if it must be rejected.
 *
 * 2026-05-25 - Critical safety. When the deliverable is a FreeformArtifact
 * (kind=journey/blueprint/org/arch/roadmap with html as a string), critics
 * frequently emit paths like "html.grid.lane-row[0].cell[1].emo" - trying
 * to navigate INTO the html string as if it were a JSON tree. This corrupts
 * the artifact (5+ failed edits, em-dashes go UP not down, artifact
 * shrinks because setAtPath replaces parts of the deliverable). Reject any
 * path that dives into a string-valued field BEFORE applyEdits attempts it.
 */
// Top-level fields that hold the rendered deliverable content for freeform
// artifacts. Critics must NEVER replace these directly - the optimization
// loop is supposed to edit the SKILL document (offline), not the deliverable
// itself (online). A critic that emits {op: 'replace', target_path: 'html',
// new_value: 'some critic rationale prose'} would destroy the artifact.
//
// Found 2026-05-25 in production: a journey artifact dropped from 16.4KB
// (model output) → 1.9KB (critic prose) when this edit landed.
const PROTECTED_TOP_LEVEL_FIELDS = new Set(['html', 'body', 'content', 'output', 'rendered', 'document', 'text']);

function isPathSafeForDeliverable(deliverable: any, target_path: string): string | null {
    if (!target_path || typeof target_path !== 'string') return 'empty target_path';
    if (target_path === '$ROOT' || target_path === '$root') return null; // sentinel handled by callers
    const parts = parsePath(target_path);
    if (parts.length === 0) return 'empty path after parse';

    // 2026-05-25 fix #2 - Reject any single-segment edit that targets a
    // protected top-level content field on a string-typed deliverable. This
    // was the actual production failure mode: critics emitting
    // {target_path: "html", action: "replace", new_value: "<critic prose>"}
    // and destroying the artifact body.
    if (parts.length === 1 && typeof parts[0] === 'string' && PROTECTED_TOP_LEVEL_FIELDS.has(parts[0] as string)) {
        const currentValue = (deliverable as any)?.[parts[0] as string];
        if (typeof currentValue === 'string' && currentValue.length > 100) {
            return `protected top-level field "${parts[0]}" is a ${currentValue.length}-char content body; refuse to let a critic replace it via target_path edit (this would destroy the artifact). Edit the SKILL document instead.`;
        }
    }

    // Walk; if any non-leaf segment lands on a string, reject (we can't dive into a string).
    let cur: any = deliverable;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur === null || cur === undefined) return null; // path traverses missing branch; setAtPath would create it - allowed
        if (typeof cur === 'string') {
            return `cannot dive into string field at segment "${parts.slice(0, i).join('.')}" - path "${target_path}" treats a string as an object`;
        }
        cur = cur[p as any];
    }
    // Final-leaf segment: if the leaf currently holds a string AND the action would replace
    // a sub-property of it, reject. setAtPath itself catches some of this, but a clear
    // gate avoids partial-write corruption.
    if (typeof cur === 'string' && parts.length > 1) {
        return `target_path "${target_path}" ends inside a string field`;
    }
    return null;
}

/**
 * Apply structured edits to a deliverable. Pure function.
 * Used by the revisor AND by tests.
 *
 * 2026-05-25 - Safety hardening:
 *   1. Path-safety pre-check rejects edits that try to dive into a string
 *      field (the failure mode that corrupted freeform-HTML journey artifacts).
 *   2. The `$ROOT` sentinel now properly returns the new_value as the entire
 *      draft (replacing the whole deliverable). The em-dash + slop hygiene
 *      strip relies on this; without it the strip never applied and em-dashes
 *      went UP not down.
 */
export function applyEdits<T>(deliverable: T, edits: CriticEdit[]): T {
    let draft = JSON.parse(JSON.stringify(deliverable)) as T;
    for (const edit of edits) {
        // 2026-05-25 - $ROOT sentinel handler. When a critic returns an edit
        // with target_path='$ROOT' and action='replace', new_value replaces
        // the entire deliverable. Used by the universal hygiene strip
        // (em-dash + slop substitution) which needs to replace every string
        // field in the artifact at once.
        if ((edit.target_path === '$ROOT' || edit.target_path === '$root') && edit.action === 'replace') {
            if (edit.new_value !== undefined && edit.new_value !== null) {
                // Deep-clone the replacement so callers can't mutate it later
                draft = JSON.parse(JSON.stringify(edit.new_value)) as T;
            }
            continue;
        }
        // 2026-05-25 - Pre-validate the path. Critics on freeform-HTML
        // artifacts often emit paths that try to dive into the html string;
        // those edits would corrupt the artifact, so reject early.
        const rejection = isPathSafeForDeliverable(draft, edit.target_path);
        if (rejection) {
            if (typeof console !== 'undefined') {
                console.warn(`[criticReviseLoop] SKIPPED edit "${edit.target_path}" action="${edit.action}": ${rejection}`);
            }
            continue;
        }
        try {
            switch (edit.action) {
                case 'replace':
                    setAtPath(draft, edit.target_path, edit.new_value);
                    break;
                case 'append':
                    appendAtPath(draft, edit.target_path, edit.new_value);
                    break;
                case 'remove':
                    removeAtPath(draft, edit.target_path);
                    break;
            }
        } catch (err) {
            // Log but don't throw - bad edit shouldn't kill the loop
            if (typeof console !== 'undefined') {
                console.warn(
                    `[criticReviseLoop] edit failed for path "${edit.target_path}" action="${edit.action}": ${String(err).slice(0, 120)}`
                );
            }
        }
    }
    return draft;
}


// ──────────────────────────────────────────────────────────────────────────
// Default critic invoker - uses the proxy AI endpoints
// ──────────────────────────────────────────────────────────────────────────

const CRITIC_PROMPT_TEMPLATE = `You are a critic skill. Your job is to evaluate the deliverable below against the discipline specified in your skill spec at .claude/skills/{{SKILL_NAME}}/SKILL.md.

Return ONLY a JSON object matching this contract:
{
  "accept": true | false,
  "edits": [
    {"target_path": "...", "action": "replace|append|remove", "new_value": ..., "reason": "..."},
    ...
  ],
  "rationale": "one-paragraph explanation",
  "confidence": "high" | "medium" | "low"
}

DELIVERABLE:
{{DELIVERABLE_JSON}}

Apply the {{SKILL_NAME}} discipline. If the deliverable already satisfies it, return {"accept": true, "edits": [], ...}. Otherwise emit structured edits, NOT a rewrite. Edits must use dot-paths into the deliverable JSON.`;


const PROVIDER_FOR_MODEL: Record<string, Provider> = {
    'sonnet-4.6': 'anthropic',
    'opus-4.8': 'anthropic',
    'haiku-4.5': 'anthropic',
};

const MODEL_ID: Record<string, string> = {
    'sonnet-4.6': 'claude-sonnet-4-6',
    'opus-4.8': 'claude-opus-4-8',
    'haiku-4.5': 'claude-haiku-4-5-20251001',
};

// Rough cost-per-call estimates (USD); will be refined when we have real telemetry.
// Opus 4.8 standard pricing is $5/$25 per 1M tokens (3x cheaper than 4.7's $15/$75),
// so the per-call estimate drops to ~$0.025.
const ESTIMATED_CALL_COST: Record<string, number> = {
    'sonnet-4.6': 0.015,
    'opus-4.8': 0.025,
    'haiku-4.5': 0.003,
};


export const defaultCriticInvoker: CriticInvoker = async ({
    skill_name, deliverable, invocation_model, proxy_base,
}) => {
    const prompt = CRITIC_PROMPT_TEMPLATE
        .replace('{{SKILL_NAME}}', skill_name)
        .replace('{{DELIVERABLE_JSON}}', JSON.stringify(deliverable, null, 2).slice(0, 12000));

    const { result } = await withResilience<CriticVerdict>({
        primary: PROVIDER_FOR_MODEL[invocation_model] ?? 'anthropic',
        fallbacks: ['gemini'],
        stage: `critic:${skill_name}`,
        is429: isThrottleError,
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: MODEL_ID[invocation_model] ?? MODEL_ID['sonnet-4.6'],
                    max_tokens: 2000,
                    temperature: 0,
                    messages: [{ role: 'user', content: prompt }],
                }
                : {
                    model: 'gemini-3.5-flash',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { temperature: 0, responseMimeType: 'application/json' },
                };
            const resp = await fetch(`${proxy_base}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                throw new Error(`${provider} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
            }
            const data = await resp.json();
            const text = provider === 'anthropic'
                ? (data.content?.[0]?.text ?? '')
                : (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
            return parseJSONWithRepair<CriticVerdict>(text, {
                calling_context: `critic:${skill_name}:${provider}`,
            });
        },
    });
    return {
        verdict: result,
        cost_usd: ESTIMATED_CALL_COST[invocation_model] ?? 0.015,
    };
};


// ──────────────────────────────────────────────────────────────────────────
// The revisor - applies edits via the deterministic applyEdits function
// (We do NOT use an LLM revisor by default; applyEdits is mechanical and
// deterministic. The skill spec mentions an LLM revisor as an option for
// future use when edits need more interpretation.)
// ──────────────────────────────────────────────────────────────────────────

function revisor<T>(deliverable: T, edits: CriticEdit[]): T {
    return applyEdits(deliverable, edits);
}


// ──────────────────────────────────────────────────────────────────────────
// Main loop
// ──────────────────────────────────────────────────────────────────────────

export async function criticReviseLoop<T>(opts: CriticReviseLoopOpts<T>): Promise<CriticReviseLoopResult<T>> {
    const budget = opts.budget_usd ?? 0.50;
    const proxy_base = opts.proxy_base ?? 'http://localhost:5012';
    const surfaceLog = opts.surface_critique_log !== false;
    const invokeCritic = opts.invoke_critic ?? defaultCriticInvoker;

    let current: T = JSON.parse(JSON.stringify(opts.deliverable));
    const iterationsPerCritic: Record<string, number> = {};
    const critiqueLog: CriticReviseLoopResult<T>['critique_log'] = [];
    const degradationEvents: DegradationEvent[] = [];
    let totalCost = 0;
    let haltedReason: HaltReason = 'all_accept';

    outer: for (const critic of opts.critics) {
        iterationsPerCritic[critic.skill_name] = 0;
        while (iterationsPerCritic[critic.skill_name] < critic.max_iterations) {
            if (totalCost >= budget) {
                haltedReason = 'budget_breached';
                degradationEvents.push(emitDegradationEvent({
                    kind: 'feature_omission',
                    stage: `critic_revise_loop:${critic.skill_name}`,
                    requested: `iterations<=${critic.max_iterations}`,
                    actual: `halted after ${iterationsPerCritic[critic.skill_name]} (budget $${totalCost.toFixed(2)} >= $${budget.toFixed(2)})`,
                    detail: `Budget cap reached before critic ${critic.skill_name} converged`,
                    recoverable: true,
                    user_action: 'investigate',
                }));
                break outer;
            }
            let result: { verdict: CriticVerdict; cost_usd: number };
            try {
                result = await invokeCritic({
                    skill_name: critic.skill_name,
                    deliverable: current,
                    invocation_model: critic.invocation_model,
                    proxy_base,
                });
            } catch (err) {
                haltedReason = 'critic_error';
                degradationEvents.push(emitDegradationEvent({
                    kind: 'feature_omission',
                    stage: `critic_revise_loop:${critic.skill_name}`,
                    detail: `Critic invocation failed: ${String(err).slice(0, 200)}`,
                    recoverable: true,
                    user_action: 'investigate',
                }));
                break outer;
            }

            totalCost += result.cost_usd;
            const editCount = result.verdict.edits?.length ?? 0;
            critiqueLog.push({
                critic: critic.skill_name,
                iteration: iterationsPerCritic[critic.skill_name],
                verdict: result.verdict,
                edits_applied: result.verdict.accept ? 0 : editCount,
                cost_usd: result.cost_usd,
            });

            if (result.verdict.accept) {
                // Move to next critic
                break;
            }

            // Apply edits
            current = revisor(current, result.verdict.edits || []);
            iterationsPerCritic[critic.skill_name] += 1;

            if (iterationsPerCritic[critic.skill_name] >= critic.max_iterations) {
                haltedReason = 'iterations_exhausted';
            }
        }
    }

    // Determine final halt reason
    if (totalCost < budget && haltedReason === 'all_accept') {
        const anyHitMax = Object.entries(iterationsPerCritic).some(
            ([name, iter]) => {
                const cfg = opts.critics.find(c => c.skill_name === name);
                return cfg && iter >= cfg.max_iterations;
            }
        );
        if (anyHitMax) haltedReason = 'iterations_exhausted';
    }

    if (surfaceLog) {
        degradationEvents.push(emitDegradationEvent({
            kind: 'feature_omission',  // re-purposed as informational
            stage: 'critic_revise_loop:summary',
            detail: `Loop complete. Critics: ${opts.critics.map(c => c.skill_name).join(', ')}. ` +
                `Iterations: ${JSON.stringify(iterationsPerCritic)}. Cost: $${totalCost.toFixed(2)}. Halted: ${haltedReason}.`,
            recoverable: false,
            user_action: 'no_action_needed',
        }));
    }

    return {
        result: current,
        iterations_per_critic: iterationsPerCritic,
        critique_log: critiqueLog,
        total_cost_usd: totalCost,
        halted_reason: haltedReason,
        degradation_events: degradationEvents,
    };
}


// ──────────────────────────────────────────────────────────────────────────
// Preset configurations
// ──────────────────────────────────────────────────────────────────────────

export const RECOMMENDATIONS_LOOP: Omit<CriticReviseLoopOpts<any>, 'deliverable'> = {
    critics: [
        { skill_name: 'pre-mortem', max_iterations: 2, invocation_model: 'sonnet-4.6' },
        { skill_name: 'stakeholder-lens-auditor', max_iterations: 2, invocation_model: 'sonnet-4.6' },
        { skill_name: 'quantification-architect', max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.50,
    surface_critique_log: true,
};

export const PERSONAS_LOOP: Omit<CriticReviseLoopOpts<any>, 'deliverable'> = {
    critics: [
        { skill_name: 'contradiction-finder', max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.25,
    surface_critique_log: true,
};

export const STRATEGY_LOOP: Omit<CriticReviseLoopOpts<any>, 'deliverable'> = {
    critics: [
        { skill_name: 'second-order-thinker', max_iterations: 2, invocation_model: 'opus-4.8' },
        { skill_name: 'pre-mortem', max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
    revisor_model: 'sonnet-4.6',
    halt_when: 'all_accept',
    budget_usd: 0.75,
    surface_critique_log: true,
};
