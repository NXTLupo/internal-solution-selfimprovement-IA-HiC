/**
 * services/skillOptimizer.ts — SkillOpt for HiC (v0.1)
 *
 * Implements the SkillOpt text-space optimizer from
 *   "SkillOpt: Executive Strategy for Self-Evolving Agent Skills"
 *   Yifan Yang et al., Microsoft / SJTU / Tongji / Fudan
 *   arXiv:2605.23904v1 — 22 May 2026
 *
 * Optimizer model: Gemini 3.5 Flash with thinking_level="medium" (cost-effective).
 * Frozen target model: whatever HiC normally uses for the deliverable (Gemini Pro / GPT-5.5).
 *
 * THIS IS AN OFFLINE TRAINING TOOL. It is never called at inference time.
 * The deployed agent reads the trained SKILL.md and never invokes this module.
 *
 * Architecture:
 *   1. Read current SKILL.md + recent rollouts (trajectory evidence)
 *   2. Split rollouts into failure and success minibatches
 *   3. For each minibatch, the optimizer proposes text-patch edits
 *   4. Hierarchically merge proposals (failure → success → final)
 *   5. Rank merged edits, keep top L_t (edit budget)
 *   6. Apply edits as pure text operations on the SKILL.md
 *   7. Caller validates the candidate skill via deliverableScorer + replay
 *   8. Caller accepts (overwrite SKILL.md) or rejects (append to rejected-edit buffer)
 *
 * The deep-learning analogy (paper Figure 1):
 *   - Edit budget L_t = learning rate
 *   - Cosine/linear/constant schedule = LR schedule
 *   - Hierarchical merge = gradient aggregation across minibatch
 *   - Validation gate = held-out validation loss
 *   - Rejected-edit buffer = negative feedback / dropout
 */

import { parseJSONWithRepair } from './aiOutputRepair';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Atomic skill-edit operation (paper §C.3). */
export type SkillEditOp = 'append' | 'insert_after' | 'replace' | 'delete';

export interface SkillEdit {
    op: SkillEditOp;
    /** For insert_after/replace/delete — the exact text in the skill to anchor on. */
    target?: string;
    /** For append/insert_after/replace — the new content to insert. */
    content?: string;
    /** How many independent reflections supported this edit (paper §C.2.3). */
    support_count?: number;
    /** Whether the edit was proposed in response to a failure or to reinforce a success. */
    source_type?: 'failure' | 'success';
    /** Optional reasoning trace from the proposer. */
    reason?: string;
}

export interface RolloutTrajectory {
    /** Engagement / session identifier (e.g., a HiC session slug). */
    id: string;
    /** Free-text description of what the model was asked to produce. */
    task_summary: string;
    /** The actual rendered deliverable (HTML for freeform, JSON for structured). */
    output: string;
    /** Composite score from deliverableScorer (0..1). */
    score: number;
    /** Per-validator sub-scores (e.g., {vq_density: 0.4, tp_density: 0.7, ...}). */
    sub_scores: Record<string, number>;
    /** Specific structural failures detected (e.g., "verbatim-quote density below floor"). */
    failures: string[];
    /** Optional verbatim user-edit deltas (most-edited sections, with edit prose). */
    user_edits?: Array<{ section: string; from: string; to: string }>;
}

export interface SkillOptConfig {
    /** Name of the skill being trained (e.g., "journey-illustrator"). */
    skill_name: string;
    /** Full text of the current SKILL.md. */
    skill_text: string;
    /** Rollout evidence — recent runs scored by deliverableScorer. */
    rollouts: RolloutTrajectory[];
    /** Maximum edits to apply this step (paper §3.4 edit budget L_t). */
    edit_budget?: number;
    /** Reflection minibatch size (paper §3.3, default 4 per Table 2 panel b). */
    minibatch_size?: number;
    /** Optimizer-side meta-skill from prior epochs (paper §C.2.8). Empty on first run. */
    optimizer_memory?: string;
    /** Rejected-edit buffer from previous steps (paper §3.5). */
    rejected_edits?: SkillEdit[];
    /** Where to send HTTP requests for the optimizer LLM. */
    proxy_base?: string;
    /** Override the optimizer model. Default: gemini-3.5-flash with thinking_level=medium. */
    optimizer_model?: string;
}

export interface SkillOptResult {
    /** The candidate SKILL.md text after applying the merged + ranked edits. */
    candidate_skill: string;
    /** The full edit set that was applied (post-ranking, post-budget-clip). */
    applied_edits: SkillEdit[];
    /** Edits considered but not applied (because they exceeded the budget or failed ranking). */
    rejected_edits: SkillEdit[];
    /** Failure patterns the optimizer identified across the rollout batch. */
    failure_patterns: Array<{ failure_type: string; count: number; description: string }>;
    /** Success patterns the optimizer identified. */
    success_patterns: string[];
    /** Reasoning trace from the merge + ranking steps. */
    reasoning_trace: string;
    /** Total optimizer-LLM cost for this step (estimated USD). */
    estimated_cost_usd: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_OPTIMIZER_MODEL = 'gemini-3.5-flash';
const DEFAULT_EDIT_BUDGET = 4; // paper Table 2 panel (d): lr=4 is the default
const DEFAULT_MINIBATCH_SIZE = 4; // paper Table 2 panel (b)
const SLOW_UPDATE_START = '<!-- SLOW_UPDATE_START -->';
const SLOW_UPDATE_END = '<!-- SLOW_UPDATE_END -->';

// Rough cost estimate per call for Gemini 3.5 Flash with thinking_level=medium:
// ~10K input + ~6.5K output tokens at $0.10/M input, $0.40/M output = ~$0.0036
const ESTIMATED_COST_PER_CALL_USD = 0.004;

// ─── Prompt contracts (paper §C.2) ───────────────────────────────────────────

const ANALYST_FAILURE_PROMPT = (skill: string, trajectories: RolloutTrajectory[], budget: number, optimizerMemory: string) => `You are an expert failure-analysis agent for AI agent tasks.

You will be given MULTIPLE failed agent trajectories from a single minibatch and the current skill document.
Your job is to identify the most important COMMON failure patterns across the batch and propose a concise set of skill edits.

## Analysis Process
1. Read ALL trajectories in the minibatch.
2. Identify the most prevalent, systematic failure patterns across them.
3. For each pattern, classify its failure type.
4. Propose skill edits that address the COMMON patterns, not individual edge cases.
5. Edits must be generalizable; do not hardcode task-specific values.
6. Only patch gaps in the skill; do not duplicate existing content.

You will be told the maximum number of edits (the budget L). Produce AT MOST L edits, focusing on the highest-impact patterns. You may produce fewer if warranted.

EDIT BUDGET L = ${budget}

${optimizerMemory ? `OPTIMIZER MEMORY (guidance from prior epochs):\n${optimizerMemory}\n\n` : ''}
CURRENT SKILL DOCUMENT:
\`\`\`
${skill.slice(0, 12000)}
\`\`\`

FAILED TRAJECTORIES (${trajectories.length} in this minibatch):
${trajectories.map((t, i) => `
--- TRAJECTORY ${i + 1} (id=${t.id}, score=${t.score.toFixed(2)}) ---
TASK: ${t.task_summary.slice(0, 500)}
FAILURES DETECTED: ${t.failures.slice(0, 5).join('; ')}
SUB-SCORES: ${Object.entries(t.sub_scores).map(([k, v]) => `${k}=${(v as number).toFixed(2)}`).join(', ')}
OUTPUT (truncated):
${t.output.slice(0, 2000)}
${t.user_edits && t.user_edits.length > 0 ? `\nUSER EDITS (verbatim):\n${t.user_edits.slice(0, 3).map(e => `  - in ${e.section}: changed "${e.from.slice(0, 80)}" → "${e.to.slice(0, 80)}"`).join('\n')}` : ''}
`).join('\n')}

Respond ONLY with a valid JSON object (no markdown fences, no extra text):
{
  "batch_size": ${trajectories.length},
  "failure_summary": [
    {"failure_type": "<type>", "count": <int>, "description": "<one-line>"}
  ],
  "patch": {
    "reasoning": "<why these edits address the batch's common failures>",
    "edits": [
      {"op": "append", "content": "<markdown to add at end of skill>"},
      {"op": "insert_after", "target": "<exact heading/text to insert after>", "content": "<markdown>"},
      {"op": "replace", "target": "<exact text to replace>", "content": "<replacement>"},
      {"op": "delete", "target": "<exact text to remove>"}
    ]
  }
}

Only include edits that are needed. "edits" can be an empty list if no patch is warranted.

IMPORTANT: The skill document may contain a section between ${SLOW_UPDATE_START} and ${SLOW_UPDATE_END} markers. This is a PROTECTED section managed by a separate slow-update process. Do NOT propose any edits that target, modify, or delete content within these markers.`;

const ANALYST_SUCCESS_PROMPT = (skill: string, trajectories: RolloutTrajectory[], budget: number, optimizerMemory: string) => `You are an expert success-pattern analyst for AI agents.

You will be given MULTIPLE successful agent trajectories from a single minibatch and the current skill document. Your job is to identify generalizable behavior patterns that are COMMON across the batch and worth encoding in the skill.

## Rules
- Only propose patches for patterns NOT already covered in the skill.
- Focus on patterns that appear across MULTIPLE trajectories in the batch.
- Be concise. Patterns must generalize beyond specific tasks.
- Prefer reinforcing existing sections over adding new top-level sections.

EDIT BUDGET L = ${budget}

${optimizerMemory ? `OPTIMIZER MEMORY:\n${optimizerMemory}\n\n` : ''}
CURRENT SKILL DOCUMENT:
\`\`\`
${skill.slice(0, 12000)}
\`\`\`

SUCCESSFUL TRAJECTORIES (${trajectories.length} in this minibatch):
${trajectories.map((t, i) => `
--- TRAJECTORY ${i + 1} (id=${t.id}, score=${t.score.toFixed(2)}) ---
TASK: ${t.task_summary.slice(0, 500)}
SUB-SCORES: ${Object.entries(t.sub_scores).map(([k, v]) => `${k}=${(v as number).toFixed(2)}`).join(', ')}
OUTPUT (truncated):
${t.output.slice(0, 2000)}
`).join('\n')}

Respond ONLY with a valid JSON object:
{
  "batch_size": ${trajectories.length},
  "success_patterns": ["<pattern 1>", "<pattern 2>"],
  "patch": {
    "reasoning": "<why these patterns are worth encoding>",
    "edits": [...]
  }
}

IMPORTANT: Do NOT propose any edits between ${SLOW_UPDATE_START} and ${SLOW_UPDATE_END} markers.`;

const MERGE_PROMPT = (currentSkill: string, patches: Array<{ source: 'failure' | 'success'; reasoning: string; edits: SkillEdit[] }>, sourceLabel: string) => `You are a skill-edit coordinator. You receive multiple independently-proposed patches from ${sourceLabel} analysis of agent trajectories. Merge them into ONE coherent, non-redundant patch.

Merge guidelines:
1. Deduplicate: keep the best-worded version of similar edits.
2. Resolve conflicts: if patches contradict on the same point, choose the one with stronger justification or synthesize both.
3. Preserve unique insights: include all non-redundant edits.
4. Prevalent-pattern bias: edits appearing consistently across multiple patches address systematic issues; preserve them with HIGH priority.
5. Independence: no two edits in the merged patch may target the same text region.
6. Support count: for each merged edit, estimate how many source patches support it.
7. PROTECTED SECTION: Do NOT merge or produce any edits that target content between ${SLOW_UPDATE_START} and ${SLOW_UPDATE_END} markers.

CURRENT SKILL (for context — do not duplicate existing content):
\`\`\`
${currentSkill.slice(0, 8000)}
\`\`\`

INDEPENDENT PATCHES TO MERGE (${patches.length}):
${patches.map((p, i) => `
--- PATCH ${i + 1} (${p.source}) ---
REASONING: ${p.reasoning}
EDITS: ${JSON.stringify(p.edits, null, 2).slice(0, 2000)}
`).join('\n')}

Respond ONLY with a valid JSON object:
{
  "reasoning": "<summary of key consolidation decisions>",
  "edits": [
    {
      "op": "append|insert_after|replace|delete",
      "target": "<if needed>",
      "content": "<if needed>",
      "support_count": <integer>,
      "source_type": "${sourceLabel.toLowerCase()}"
    }
  ]
}`;

const FINAL_MERGE_PROMPT = (currentSkill: string, failureEdits: SkillEdit[], successEdits: SkillEdit[]) => `You are a skill-edit coordinator performing the FINAL merge. You receive two pre-merged patch groups:
1. Failure-driven patches (corrective, high priority)
2. Success-driven patches (reinforcement, lower priority)

Merge guidelines:
1. FAILURE PATCHES TAKE PRIORITY: the primary goal of skill reflection is to fix failures. Failure-driven edits should be preserved unless they directly conflict with a well-supported success pattern.
2. Deduplicate: if a failure edit and success edit cover the same point, keep the failure version.
3. Preserve success insights: include success edits that cover patterns NOT addressed by failure edits.
4. Carry forward support_count and source_type for each edit.
5. PROTECTED SECTION: Do NOT merge or produce any edits that target content between ${SLOW_UPDATE_START} and ${SLOW_UPDATE_END} markers.

CURRENT SKILL:
\`\`\`
${currentSkill.slice(0, 8000)}
\`\`\`

FAILURE-DRIVEN EDITS:
${JSON.stringify(failureEdits, null, 2).slice(0, 3000)}

SUCCESS-DRIVEN EDITS:
${JSON.stringify(successEdits, null, 2).slice(0, 3000)}

Respond ONLY with a valid JSON object:
{
  "reasoning": "<summary of priority decisions>",
  "edits": [
    {
      "op": "...",
      "target": "...",
      "content": "...",
      "support_count": <integer>,
      "source_type": "failure|success"
    }
  ]
}`;

const RANKING_PROMPT = (currentSkill: string, edits: SkillEdit[], budget: number) => `You are an expert edit-ranking optimizer for a skill optimization system. You receive a skill document and a pool of proposed edits. Your job is to RANK the edits by importance and select the top ${budget}.

Ranking criteria (in order of priority):
1. Systematic impact: edits that address widespread, recurring failure patterns across many tasks should rank highest. A rule that fixes 50% of failures beats one that fixes a single edge case.
2. Complementarity: edits that fill gaps in the current skill, not duplicate existing content, rank higher.
3. Generality: edits phrased as general principles rank higher than those tied to specific question types or entities.
4. Actionability: edits with clear, concrete guidance rank higher than vague advice.

CURRENT SKILL:
\`\`\`
${currentSkill.slice(0, 8000)}
\`\`\`

CANDIDATE EDITS (0-indexed):
${edits.map((e, i) => `[${i}] ${e.source_type}/${e.op}${e.target ? ` target="${e.target.slice(0, 80)}"` : ''}${e.content ? ` content="${e.content.slice(0, 200)}"` : ''} support=${e.support_count || 1}`).join('\n')}

Respond ONLY with a valid JSON object:
{
  "reasoning": "<brief justification for your ranking decisions>",
  "selected_indices": [<0-based indices of the top ${budget} edits, in priority order>]
}`;

// ─── Text-patch application (pure functions) ─────────────────────────────────

/** Find the protected slow-update region in a skill, if present. */
function findSlowUpdateRegion(skill: string): { start: number; end: number } | null {
    const startIdx = skill.indexOf(SLOW_UPDATE_START);
    const endIdx = skill.indexOf(SLOW_UPDATE_END);
    if (startIdx >= 0 && endIdx > startIdx) {
        return { start: startIdx, end: endIdx + SLOW_UPDATE_END.length };
    }
    return null;
}

/** Test whether a text region (by index) falls inside the protected slow-update section. */
function isInsideProtectedRegion(skill: string, target: string): boolean {
    const region = findSlowUpdateRegion(skill);
    if (!region) return false;
    const targetIdx = skill.indexOf(target);
    if (targetIdx < 0) return false;
    return targetIdx >= region.start && targetIdx + target.length <= region.end;
}

/**
 * Apply a single text-patch edit. Returns the modified skill text plus a
 * boolean indicating whether the edit applied successfully.
 *
 * Safety: edits targeting content inside the protected slow-update region
 * are rejected. The slow-update region can only be modified by the
 * epoch-boundary slow-update process (paper §3.6).
 */
export function applySkillPatchEdit(skill: string, edit: SkillEdit): { skill: string; applied: boolean; reason?: string } {
    // Reject any edit that targets the protected slow-update section
    if (edit.target && isInsideProtectedRegion(skill, edit.target)) {
        return { skill, applied: false, reason: 'edit targets protected slow-update region' };
    }
    switch (edit.op) {
        case 'append': {
            if (!edit.content) return { skill, applied: false, reason: 'append edit missing content' };
            const sep = skill.endsWith('\n\n') ? '' : skill.endsWith('\n') ? '\n' : '\n\n';
            return { skill: skill + sep + edit.content, applied: true };
        }
        case 'insert_after': {
            if (!edit.target || !edit.content) return { skill, applied: false, reason: 'insert_after edit missing target or content' };
            const targetIdx = skill.indexOf(edit.target);
            if (targetIdx < 0) return { skill, applied: false, reason: `target text not found: "${edit.target.slice(0, 80)}"` };
            const insertPoint = targetIdx + edit.target.length;
            const sep = skill[insertPoint] === '\n' ? '\n' : '\n\n';
            return {
                skill: skill.slice(0, insertPoint) + sep + edit.content + skill.slice(insertPoint),
                applied: true,
            };
        }
        case 'replace': {
            if (!edit.target || edit.content === undefined) return { skill, applied: false, reason: 'replace edit missing target or content' };
            const targetIdx = skill.indexOf(edit.target);
            if (targetIdx < 0) return { skill, applied: false, reason: `target text not found: "${edit.target.slice(0, 80)}"` };
            return {
                skill: skill.slice(0, targetIdx) + edit.content + skill.slice(targetIdx + edit.target.length),
                applied: true,
            };
        }
        case 'delete': {
            if (!edit.target) return { skill, applied: false, reason: 'delete edit missing target' };
            const targetIdx = skill.indexOf(edit.target);
            if (targetIdx < 0) return { skill, applied: false, reason: `target text not found: "${edit.target.slice(0, 80)}"` };
            return {
                skill: skill.slice(0, targetIdx) + skill.slice(targetIdx + edit.target.length),
                applied: true,
            };
        }
    }
}

/** Apply a sequence of edits in order, skipping ones that fail. */
export function applySkillPatches(skill: string, edits: SkillEdit[]): { skill: string; applied: SkillEdit[]; rejected: Array<{ edit: SkillEdit; reason: string }> } {
    let current = skill;
    const applied: SkillEdit[] = [];
    const rejected: Array<{ edit: SkillEdit; reason: string }> = [];
    for (const edit of edits) {
        const result = applySkillPatchEdit(current, edit);
        if (result.applied) {
            current = result.skill;
            applied.push(edit);
        } else {
            rejected.push({ edit, reason: result.reason || 'unknown' });
        }
    }
    return { skill: current, applied, rejected };
}

// ─── Optimizer LLM caller ────────────────────────────────────────────────────

/**
 * Call the optimizer model via the HiC proxy. Uses Gemini 3.5 Flash with
 * thinking_level=medium by default — strong enough for SkillOpt's multi-step
 * reasoning while ~70x cheaper than Claude Opus.
 */
async function callOptimizer(prompt: string, proxyBase: string, model: string): Promise<{ text: string; estimated_cost_usd: number }> {
    const body = {
        model,
        contents: { parts: [{ text: prompt }] },
        // Use thinking_level=medium for the reasoning-heavy steps
        config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            thinking_config: { thinking_level: 'medium' },
        },
    };
    const resp = await fetch(`${proxyBase}/api/ai/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Optimizer call failed: HTTP ${resp.status} — ${errText.slice(0, 200)}`);
    }
    const data = await resp.json();
    const text = data.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text, estimated_cost_usd: ESTIMATED_COST_PER_CALL_USD };
}

function safeParseEditsResponse(text: string, calling_context: string): { reasoning: string; edits: SkillEdit[]; failure_summary?: any[]; success_patterns?: string[]; batch_size?: number } {
    try {
        const parsed = parseJSONWithRepair<any>(text, { calling_context });
        return {
            reasoning: parsed?.patch?.reasoning || parsed?.reasoning || '',
            edits: Array.isArray(parsed?.patch?.edits) ? parsed.patch.edits : (Array.isArray(parsed?.edits) ? parsed.edits : []),
            failure_summary: parsed?.failure_summary,
            success_patterns: parsed?.success_patterns,
            batch_size: parsed?.batch_size,
        };
    } catch (err) {
        console.warn(`[skillOptimizer/${calling_context}] parse failed, returning empty:`, (err as Error).message);
        return { reasoning: '', edits: [] };
    }
}

function safeParseRankingResponse(text: string): { reasoning: string; selected_indices: number[] } {
    try {
        const parsed = parseJSONWithRepair<any>(text, { calling_context: 'skillopt:ranking' });
        return {
            reasoning: parsed?.reasoning || '',
            selected_indices: Array.isArray(parsed?.selected_indices) ? parsed.selected_indices : [],
        };
    } catch (err) {
        console.warn('[skillOptimizer/ranking] parse failed:', (err as Error).message);
        return { reasoning: '', selected_indices: [] };
    }
}

// ─── Main optimization loop ──────────────────────────────────────────────────

/**
 * Run a single SkillOpt optimization step (one batch of rollouts → candidate skill).
 *
 * The caller is responsible for the validation gate: invoke deliverableScorer
 * on the candidate skill via engagement replay, then accept or reject based
 * on whether the score improves over the current selection score.
 */
export async function runSkillOptStep(config: SkillOptConfig): Promise<SkillOptResult> {
    const proxyBase = config.proxy_base || 'http://127.0.0.1:5012';
    const model = config.optimizer_model || DEFAULT_OPTIMIZER_MODEL;
    const editBudget = config.edit_budget || DEFAULT_EDIT_BUDGET;
    const minibatchSize = config.minibatch_size || DEFAULT_MINIBATCH_SIZE;

    let totalCost = 0;
    const reasoningTrace: string[] = [];
    const allFailurePatterns: Array<{ failure_type: string; count: number; description: string }> = [];
    const allSuccessPatterns: string[] = [];

    // Step 1: split rollouts into failure (score < 0.6) and success (score >= 0.6) groups
    const SCORE_THRESHOLD = 0.6;
    const failures = config.rollouts.filter(r => r.score < SCORE_THRESHOLD);
    const successes = config.rollouts.filter(r => r.score >= SCORE_THRESHOLD);

    reasoningTrace.push(`Rollout split: ${failures.length} failures (score < ${SCORE_THRESHOLD}), ${successes.length} successes`);

    // Step 2: partition into minibatches
    const chunk = <T>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    };
    const failureMinibatches = chunk(failures, minibatchSize);
    const successMinibatches = chunk(successes, minibatchSize);

    // Step 3a: failure analysis per minibatch
    const failurePatches: Array<{ source: 'failure' | 'success'; reasoning: string; edits: SkillEdit[] }> = [];
    for (let i = 0; i < failureMinibatches.length; i++) {
        const mb = failureMinibatches[i];
        if (mb.length === 0) continue;
        const prompt = ANALYST_FAILURE_PROMPT(config.skill_text, mb, editBudget, config.optimizer_memory || '');
        try {
            const { text, estimated_cost_usd } = await callOptimizer(prompt, proxyBase, model);
            totalCost += estimated_cost_usd;
            const parsed = safeParseEditsResponse(text, `skillopt:failure-analyst-${i}`);
            if (parsed.failure_summary) allFailurePatterns.push(...parsed.failure_summary);
            const editsWithSource: SkillEdit[] = parsed.edits.map(e => ({ ...e, source_type: 'failure' }));
            if (editsWithSource.length > 0) {
                failurePatches.push({ source: 'failure', reasoning: parsed.reasoning, edits: editsWithSource });
                reasoningTrace.push(`Failure minibatch ${i + 1}: ${editsWithSource.length} edits proposed`);
            }
        } catch (err: any) {
            reasoningTrace.push(`Failure minibatch ${i + 1}: SKIPPED (${err?.message || err})`);
        }
    }

    // Step 3b: success analysis per minibatch
    const successPatches: Array<{ source: 'failure' | 'success'; reasoning: string; edits: SkillEdit[] }> = [];
    for (let i = 0; i < successMinibatches.length; i++) {
        const mb = successMinibatches[i];
        if (mb.length === 0) continue;
        const prompt = ANALYST_SUCCESS_PROMPT(config.skill_text, mb, editBudget, config.optimizer_memory || '');
        try {
            const { text, estimated_cost_usd } = await callOptimizer(prompt, proxyBase, model);
            totalCost += estimated_cost_usd;
            const parsed = safeParseEditsResponse(text, `skillopt:success-analyst-${i}`);
            if (parsed.success_patterns) allSuccessPatterns.push(...parsed.success_patterns);
            const editsWithSource: SkillEdit[] = parsed.edits.map(e => ({ ...e, source_type: 'success' }));
            if (editsWithSource.length > 0) {
                successPatches.push({ source: 'success', reasoning: parsed.reasoning, edits: editsWithSource });
                reasoningTrace.push(`Success minibatch ${i + 1}: ${editsWithSource.length} edits proposed`);
            }
        } catch (err: any) {
            reasoningTrace.push(`Success minibatch ${i + 1}: SKIPPED (${err?.message || err})`);
        }
    }

    // Step 4a: merge failure proposals
    let mergedFailureEdits: SkillEdit[] = [];
    if (failurePatches.length > 1) {
        try {
            const { text, estimated_cost_usd } = await callOptimizer(MERGE_PROMPT(config.skill_text, failurePatches, 'failure'), proxyBase, model);
            totalCost += estimated_cost_usd;
            const parsed = safeParseEditsResponse(text, 'skillopt:merge-failure');
            mergedFailureEdits = parsed.edits.map(e => ({ ...e, source_type: 'failure' }));
            reasoningTrace.push(`Failure merge: ${mergedFailureEdits.length} consolidated edits`);
        } catch (err: any) {
            reasoningTrace.push(`Failure merge SKIPPED: ${err?.message}`);
            mergedFailureEdits = failurePatches.flatMap(p => p.edits);
        }
    } else if (failurePatches.length === 1) {
        mergedFailureEdits = failurePatches[0].edits;
    }

    // Step 4b: merge success proposals
    let mergedSuccessEdits: SkillEdit[] = [];
    if (successPatches.length > 1) {
        try {
            const { text, estimated_cost_usd } = await callOptimizer(MERGE_PROMPT(config.skill_text, successPatches, 'success'), proxyBase, model);
            totalCost += estimated_cost_usd;
            const parsed = safeParseEditsResponse(text, 'skillopt:merge-success');
            mergedSuccessEdits = parsed.edits.map(e => ({ ...e, source_type: 'success' }));
            reasoningTrace.push(`Success merge: ${mergedSuccessEdits.length} consolidated edits`);
        } catch (err: any) {
            reasoningTrace.push(`Success merge SKIPPED: ${err?.message}`);
            mergedSuccessEdits = successPatches.flatMap(p => p.edits);
        }
    } else if (successPatches.length === 1) {
        mergedSuccessEdits = successPatches[0].edits;
    }

    // Step 4c: final merge (failure-prioritized)
    let finalEdits: SkillEdit[] = [];
    if (mergedFailureEdits.length > 0 || mergedSuccessEdits.length > 0) {
        try {
            const { text, estimated_cost_usd } = await callOptimizer(FINAL_MERGE_PROMPT(config.skill_text, mergedFailureEdits, mergedSuccessEdits), proxyBase, model);
            totalCost += estimated_cost_usd;
            const parsed = safeParseEditsResponse(text, 'skillopt:final-merge');
            finalEdits = parsed.edits;
            reasoningTrace.push(`Final merge: ${finalEdits.length} edits after failure-prioritized consolidation`);
        } catch (err: any) {
            reasoningTrace.push(`Final merge SKIPPED: ${err?.message}`);
            finalEdits = [...mergedFailureEdits, ...mergedSuccessEdits];
        }
    }

    // Step 5: rank + clip to edit budget
    let selectedEdits = finalEdits;
    if (finalEdits.length > editBudget) {
        try {
            const { text, estimated_cost_usd } = await callOptimizer(RANKING_PROMPT(config.skill_text, finalEdits, editBudget), proxyBase, model);
            totalCost += estimated_cost_usd;
            const parsed = safeParseRankingResponse(text);
            if (parsed.selected_indices.length > 0) {
                selectedEdits = parsed.selected_indices.map(i => finalEdits[i]).filter(Boolean).slice(0, editBudget);
                reasoningTrace.push(`Ranking: selected ${selectedEdits.length} of ${finalEdits.length} edits (budget L=${editBudget})`);
            } else {
                selectedEdits = finalEdits.slice(0, editBudget);
                reasoningTrace.push(`Ranking parse failed; took first ${editBudget} edits`);
            }
        } catch (err: any) {
            reasoningTrace.push(`Ranking SKIPPED: ${err?.message}`);
            selectedEdits = finalEdits.slice(0, editBudget);
        }
    }

    // Step 6: apply the patches deterministically
    const { skill: candidateSkill, applied, rejected } = applySkillPatches(config.skill_text, selectedEdits);
    reasoningTrace.push(`Patch application: ${applied.length} applied, ${rejected.length} rejected${rejected.length > 0 ? ` (${rejected.map(r => r.reason).join('; ').slice(0, 200)})` : ''}`);

    return {
        candidate_skill: candidateSkill,
        applied_edits: applied,
        rejected_edits: rejected.map(r => r.edit),
        failure_patterns: allFailurePatterns,
        success_patterns: allSuccessPatterns,
        reasoning_trace: reasoningTrace.join('\n'),
        estimated_cost_usd: totalCost,
    };
}
