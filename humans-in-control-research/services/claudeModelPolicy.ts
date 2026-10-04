/**
 * claudeModelPolicy.ts - 2026-09-30 (Stage 0.5 of
 * plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, owner directive)
 *
 * THE one place that knows which Claude model HiC reasons with and how a Claude
 * Messages request must be shaped for it. aiRouter re-exports everything here so
 * routing callers keep one import; aiRetryClient imports it directly (this file
 * has no imports, so there is no cycle).
 *
 * Vendor contract for Claude Opus 5.5 (verified against the claude-api reference,
 * model table cached 2026-09-25; NOT against the owner's pasted notes, which had
 * the effort field in the wrong place):
 *   - thinking is ALWAYS on: `{type: "adaptive"}` or omit; `{type: "disabled"}` and
 *     `{type: "enabled", budget_tokens: N}` both return HTTP 400 at every effort.
 *   - depth is `output_config.effort` (low | medium | high | xhigh | max), default
 *     `medium` on this model, so HiC sets it explicitly per deliverable class.
 *   - non-default `temperature`, `top_p`, `top_k` return 400.
 *   - forced `tool_choice` (`any` / named tool) returns 400; `auto` only.
 *   - no assistant prefill.
 *   - 1M context, 128K output (streaming required for large max_tokens).
 *   - thinking display defaults to omitted; `summarized` returns readable text.
 *
 * The proxy chokepoint (/api/ai/anthropic) applies the same normalization server
 * side for proxy-internal callers; this module is the SPA half of that contract.
 */

/** The Claude model HiC uses for research and reasoning (evidence-tier artifacts,
 *  theme breadth, #proto, Designer Desk, planning). Change it HERE and nowhere else. */
export const CLAUDE_REASONING_MODEL = 'claude-opus-5-5';
/** Human-readable label for UI copy and log lines; never hardcode the model name in prose. */
export const CLAUDE_REASONING_LABEL = 'Claude Opus 5.5';

/** The Claude model for structured / HTML / fallback work where Opus depth is not
 *  needed (artifact-engine structured chain, cross-provider escape). */
export const CLAUDE_STRUCTURED_MODEL = 'claude-sonnet-5-5';

export type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** Claude models that run adaptive thinking and reject sampling params + budgets.
 *  Opus 4.6+ / Sonnet 4.6+ / Opus 5.x / Sonnet 5.x / Fable / Mythos. Haiku 4.5 and
 *  older models still take budget_tokens and are NOT normalized here. */
const ADAPTIVE_RE = /claude-(opus-4-[6-9]|opus-5|sonnet-4-6|sonnet-5|fable|mythos)/i;

/** Models on which `thinking: {type: "disabled"}` is a 400 (Opus 5.5, Sonnet 5.5, Fable). */
const ALWAYS_THINKING_RE = /claude-(opus-5-5|sonnet-5-5|fable|mythos)/i;

export function claudeUsesAdaptiveThinking(model: string | undefined | null): boolean {
    return ADAPTIVE_RE.test(String(model || ''));
}

export function claudeThinkingAlwaysOn(model: string | undefined | null): boolean {
    return ALWAYS_THINKING_RE.test(String(model || ''));
}

// ---------------------------------------------------------------------------
// Effort policy (plan 0.5.3). Keyed on the artifact catalog id / template id /
// generator kind that chooseArtifactModel already accepts. Tuned DOWN on
// measured evidence (Stage 0.2 telemetry), never up on vibes.
// ---------------------------------------------------------------------------
const XHIGH_KINDS = new Set<string>([
    'prd', 'prd-feature', 'prds',
    'strategy', 'strategies', 'strategy-slide',
    'recommendations', 'recommendation', 'recs', 'rec',
    'report', 'reports', 'whitepaper',
    'proto', 'proto-code', 'prototype', 'prototypes',
]);
const MEDIUM_KINDS = new Set<string>([
    // schema-bounded extraction: the template bounds the output
    'theme-breadth', 'theme-shard', 'themes-shard', 'theme-depth',
    'research-plan', 'deep-research', 'plan',
    'gap-matrix', 'journey-map', 'service-blueprint', 'competitive-matrix',
    'org-chart', 'systems-inventory', 'architecture-map', 'timeline',
    'gap', 'journey', 'blueprint', 'competitive', 'compete', 'org', 'audit', 'arch', 'roadmap',
]);
const LOW_KINDS = new Set<string>([
    // utility: summarize / label / regenerate a section
    '_utility', 'utility', 'wiki-compile', 'wiki-compiler', 'topic-label', 'labels',
    'feedback-regeneration', 'regeneration', 'journey-brief', 'chip', 'suggestion',
]);

export function effortForArtifact(kind?: string | null): ClaudeEffort {
    const k = String(kind || '').toLowerCase().replace(/^#/, '').trim();
    if (!k) return 'high';
    if (XHIGH_KINDS.has(k)) return 'xhigh';
    if (LOW_KINDS.has(k)) return 'low';
    if (MEDIUM_KINDS.has(k)) return 'medium';
    return 'high';   // every other evidence-tier artifact and the critic revisor
}

const EFFORT_RANK: Record<ClaudeEffort, number> = { low: 0, medium: 1, high: 2, xhigh: 3, max: 4 };

/** Map the legacy per-skill `thinkingEffort` ('max' | 'high' | 'medium') onto the
 *  vendor effort scale. 'max' stays 'max' (the skill asked for the ceiling). */
export function effortFromSkillHint(hint?: string | null): ClaudeEffort | null {
    const h = String(hint || '').toLowerCase();
    if (h === 'max' || h === 'xhigh' || h === 'high' || h === 'medium' || h === 'low') return h as ClaudeEffort;
    return null;
}

export function maxEffort(a: ClaudeEffort, b: ClaudeEffort | null | undefined): ClaudeEffort {
    if (!b) return a;
    return EFFORT_RANK[b] > EFFORT_RANK[a] ? b : a;
}

// ---------------------------------------------------------------------------
// Request normalization. Idempotent; safe on every Anthropic body. Mutates and
// returns a shallow copy so callers can keep their own object.
// ---------------------------------------------------------------------------
export interface AnthropicDefaultsOpts {
    /** artifact kind for the effort policy; `body._hicKind` is read when omitted */
    kind?: string | null;
    /** explicit effort override; `body._hicEffort` is read when omitted */
    effort?: ClaudeEffort | null;
}

/**
 * Apply the Claude 4.6+/5.x request contract to an Anthropic Messages body:
 *   - adaptive thinking with summarized display (budget_tokens / disabled removed)
 *   - `output_config.effort` from the policy when the caller did not set one
 *   - sampling params stripped (they 400)
 *   - HiC-private hint fields (`_hicKind`, `_hicEffort`) removed before send
 * Non-adaptive Claude models (Haiku 4.5) and non-Claude bodies pass through with
 * only the private fields removed.
 */
export function applyAnthropicRequestDefaults<T extends Record<string, any>>(body: T, opts: AnthropicDefaultsOpts = {}): T & Record<string, any> {
    if (!body || typeof body !== 'object') return body;
    const out: any = { ...body };
    const kind = opts.kind ?? out._hicKind ?? null;
    const effortHint: ClaudeEffort | null = (opts.effort ?? out._hicEffort ?? null) as ClaudeEffort | null;
    delete out._hicKind;
    delete out._hicEffort;
    const model = String(out.model || '');
    if (!claudeUsesAdaptiveThinking(model)) return out as T & Record<string, any>;

    // sampling params are 400s on this family
    delete out.temperature;
    delete out.top_p;
    delete out.top_k;

    // thinking: adaptive only. A budget or `disabled` is a 400 on 5.x; on 4.6-4.8
    // `disabled` is accepted but means "no thinking", which is never what HiC's
    // reasoning calls want, so normalize both to adaptive.
    const th = out.thinking && typeof out.thinking === 'object' ? { ...out.thinking } : null;
    const next: any = { type: 'adaptive' };
    if (th && typeof th.display === 'string') next.display = th.display;
    if (!next.display) next.display = 'summarized';
    if (th && th.block_binding && typeof th.block_binding === 'object') next.block_binding = th.block_binding;
    out.thinking = next;

    // effort: explicit caller value wins; else the policy for the kind
    const oc = out.output_config && typeof out.output_config === 'object' ? { ...out.output_config } : {};
    if (!oc.effort) oc.effort = effortHint || effortForArtifact(kind);
    out.output_config = oc;

    // forced tool choice is a 400 on 5.x; `auto` is the only accepted mode
    if (out.tool_choice && typeof out.tool_choice === 'object') {
        const t = String(out.tool_choice.type || '');
        if (t === 'any' || t === 'tool') out.tool_choice = { type: 'auto' };
    } else if (out.tool_choice === 'any' || out.tool_choice === 'required') {
        out.tool_choice = { type: 'auto' };
    }
    return out as T & Record<string, any>;
}

/** The readable reasoning summary a 5.x response carries (display: summarized). */
export function extractThinkingSummary(response: any): string {
    const blocks = Array.isArray(response?.content) ? response.content : [];
    return blocks
        .filter((b: any) => b && b.type === 'thinking' && typeof b.thinking === 'string')
        .map((b: any) => b.thinking.trim())
        .filter(Boolean)
        .join('\n\n');
}

/** Visible text of a Claude response (ignores thinking / tool_use blocks). */
export function extractClaudeText(response: any): string {
    const blocks = Array.isArray(response?.content) ? response.content : [];
    return blocks.map((b: any) => (b && b.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('').trim();
}
