/**
 * costMeter.ts — 2026-05-14
 *
 * Token-cost accounting for every AI call in HiC. Wraps the response-shape
 * parsing for Gemini / Anthropic / OpenAI, multiplies by current public list
 * pricing, and exposes per-run + per-model running totals.
 *
 * Estimates only — real bills come from the provider dashboards. Treat as a
 * dev-loop signal for "did my optimization actually move the needle".
 *
 * The aiRetryClient calls `recordAICall` after each successful response;
 * UI surfaces (build status footer, end-of-run summary) read via `getRunTotals`.
 */

export type ModelId =
    | 'gemini-3.1-pro-preview'
    | 'gemini-3.1-pro'
    | 'gemini-2.5-flash'
    | 'claude-opus-4-7'
    | 'claude-opus-4-6'
    | 'claude-sonnet-4-6'
    | 'claude-haiku-4-5'
    | 'gpt-5.5'
    | 'gpt-5.4'
    | 'gpt-5.4-mini'
    | 'deepseek-v4-flash'
    | 'unknown';

// 2026-Q2 public list pricing per 1M tokens.
// Verified against vendor pricing pages; update when vendors change rates.
// Thinking-budget tokens (Gemini "thinking") are billed as OUTPUT tokens —
// already counted in usage_metadata.candidatesTokenCount + thoughtsTokenCount.
const PRICING: Record<ModelId, { in: number; out: number }> = {
    'gemini-3.1-pro-preview': { in: 3.50, out: 10.50 },
    'gemini-3.1-pro':         { in: 3.50, out: 10.50 },
    'gemini-2.5-flash':       { in: 0.30, out: 1.20 },
    'claude-opus-4-7':        { in: 15.0, out: 75.0 },
    'claude-opus-4-6':        { in: 15.0, out: 75.0 },
    'claude-sonnet-4-6':      { in: 3.00, out: 15.0 },
    'claude-haiku-4-5':       { in: 1.00, out: 5.00 },
    'gpt-5.5':                { in: 5.00, out: 20.0 },
    'gpt-5.4':                { in: 5.00, out: 20.0 },
    'gpt-5.4-mini':           { in: 0.25, out: 2.00 },
    'deepseek-v4-flash':      { in: 0.27, out: 1.10 },
    'unknown':                { in: 5.00, out: 20.0 }, // conservative default
};

export interface CallRecord {
    label: string;
    model: ModelId;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    timestamp: number;
    durationMs?: number;
}

export interface RunTotals {
    callCount: number;
    inputTokens: number;
    outputTokens: number;
    totalUSD: number;
    byModel: Record<string, { callCount: number; inputTokens: number; outputTokens: number; costUSD: number }>;
    byLabel: Record<string, { callCount: number; costUSD: number }>;
    startedAt: number;
    lastCallAt: number;
}

// Per-run accumulator. resetRun() at the start of an engagement / a build.
let currentRun: RunTotals = emptyTotals();
const recentCalls: CallRecord[] = [];
const MAX_RECENT = 200;

// Subscriber list — UI surfaces (footer chip, build status) subscribe to
// rerender on every new call.
type Subscriber = (totals: RunTotals) => void;
const subscribers = new Set<Subscriber>();

function emptyTotals(): RunTotals {
    return {
        callCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalUSD: 0,
        byModel: {},
        byLabel: {},
        startedAt: Date.now(),
        lastCallAt: 0,
    };
}

export function resetRun(label?: string): void {
    currentRun = emptyTotals();
    if (label) console.log(`[CostMeter] run reset — ${label}`);
    subscribers.forEach(s => s(currentRun));
}

export function getRunTotals(): RunTotals {
    return currentRun;
}

export function getRecentCalls(n = 50): CallRecord[] {
    return recentCalls.slice(-n);
}

export function subscribeRunTotals(fn: Subscriber): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

/**
 * Normalize a model string to a known ModelId. The retry client passes
 * whatever string the body had in body.model; we map alias/variant strings
 * to the canonical entry.
 */
export function normalizeModel(raw: string | undefined): ModelId {
    if (!raw) return 'unknown';
    const s = String(raw).toLowerCase().trim();
    if (s.includes('opus-4-7')) return 'claude-opus-4-7';
    if (s.includes('opus-4-6') || s === 'claude-opus') return 'claude-opus-4-6';
    if (s.includes('sonnet-4-6') || s === 'claude-sonnet') return 'claude-sonnet-4-6';
    if (s.includes('haiku-4-5') || s.includes('haiku')) return 'claude-haiku-4-5';
    if (s.includes('gpt-5.5') || s === 'gpt5.5') return 'gpt-5.5';
    if (s.includes('gpt-5.4-mini') || s.includes('gpt-5-mini')) return 'gpt-5.4-mini';
    if (s.includes('gpt-5.4') || s.includes('gpt-5')) return 'gpt-5.4';
    if (s.includes('gemini-3.1-pro-preview')) return 'gemini-3.1-pro-preview';
    if (s.includes('gemini-3.1-pro')) return 'gemini-3.1-pro';
    if (s.includes('gemini-2.5-flash') || s.includes('gemini-flash')) return 'gemini-2.5-flash';
    if (s.includes('deepseek')) return 'deepseek-v4-flash';
    return 'unknown';
}

/**
 * Extract token usage from a provider response. Each provider names them
 * differently — this normalizes to {input, output}.
 *
 * Gemini native:    response.usageMetadata.{promptTokenCount, candidatesTokenCount, thoughtsTokenCount}
 * Gemini compat:    response.usage.{prompt_tokens, completion_tokens}
 * OpenAI:           response.usage.{prompt_tokens, completion_tokens}
 * Anthropic:        response.usage.{input_tokens, output_tokens}
 */
export function extractTokenUsage(response: any): { input: number; output: number } {
    if (!response || typeof response !== 'object') return { input: 0, output: 0 };

    // Gemini native — usageMetadata
    const um = response.usageMetadata;
    if (um) {
        const input = um.promptTokenCount || 0;
        // Thinking budget tokens are billed at output rate — sum them in.
        const output = (um.candidatesTokenCount || 0) + (um.thoughtsTokenCount || 0);
        if (input || output) return { input, output };
    }

    // OpenAI / Gemini-compat — usage
    const u = response.usage;
    if (u) {
        if (typeof u.input_tokens === 'number' || typeof u.output_tokens === 'number') {
            // Anthropic shape
            return { input: u.input_tokens || 0, output: u.output_tokens || 0 };
        }
        if (typeof u.prompt_tokens === 'number' || typeof u.completion_tokens === 'number') {
            // OpenAI / Gemini-compat shape
            return { input: u.prompt_tokens || 0, output: u.completion_tokens || 0 };
        }
    }

    return { input: 0, output: 0 };
}

/**
 * Record a single AI call. Called by aiRetryClient on every successful response.
 */
export function recordAICall(args: {
    label: string;
    model: string | undefined;
    response: any;
    durationMs?: number;
}): CallRecord {
    const model = normalizeModel(args.model);
    const { input, output } = extractTokenUsage(args.response);
    const pricing = PRICING[model] || PRICING['unknown'];
    const costUSD = (input / 1_000_000) * pricing.in + (output / 1_000_000) * pricing.out;
    const record: CallRecord = {
        label: args.label,
        model,
        inputTokens: input,
        outputTokens: output,
        costUSD,
        timestamp: Date.now(),
        durationMs: args.durationMs,
    };

    recentCalls.push(record);
    if (recentCalls.length > MAX_RECENT) recentCalls.shift();

    currentRun.callCount += 1;
    currentRun.inputTokens += input;
    currentRun.outputTokens += output;
    currentRun.totalUSD += costUSD;
    currentRun.lastCallAt = record.timestamp;

    if (!currentRun.byModel[model]) currentRun.byModel[model] = { callCount: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
    const mb = currentRun.byModel[model];
    mb.callCount += 1;
    mb.inputTokens += input;
    mb.outputTokens += output;
    mb.costUSD += costUSD;

    if (!currentRun.byLabel[args.label]) currentRun.byLabel[args.label] = { callCount: 0, costUSD: 0 };
    currentRun.byLabel[args.label].callCount += 1;
    currentRun.byLabel[args.label].costUSD += costUSD;

    subscribers.forEach(s => s(currentRun));
    return record;
}

/** Format a USD amount with sensible precision: <$1 → cents, ≥$1 → 2 decimals. */
export function formatUSD(usd: number): string {
    if (!isFinite(usd) || usd <= 0) return '$0.00';
    if (usd < 0.01) return '<$0.01';
    if (usd < 1) return `$${usd.toFixed(3)}`;
    return `$${usd.toFixed(2)}`;
}

/** User-facing display names for each model id. Surfaces wherever costs are shown
 *  so the user knows WHICH model their money went to, not just how much. */
export const MODEL_DISPLAY_NAMES: Record<ModelId, string> = {
    'claude-opus-4-7':         'Claude Opus 4.7',
    'claude-opus-4-6':         'Claude Opus 4.6',
    'claude-sonnet-4-6':       'Claude Sonnet 4.6',
    'claude-haiku-4-5':        'Claude Haiku 4.5',
    'gemini-3.1-pro-preview':  'Gemini 3.1 Pro',
    'gemini-3.1-pro':          'Gemini 3.1 Pro',
    'gemini-2.5-flash':        'Gemini 2.5 Flash',
    'gpt-5.5':                 'GPT-5.5',
    'gpt-5.4':                 'GPT-5.4',
    'gpt-5.4-mini':            'GPT-5.4 Mini',
    'deepseek-v4-flash':       'DeepSeek V4 Flash',
    'unknown':                 'Unknown model',
};

export function formatModelName(modelId: string | ModelId | undefined): string {
    if (!modelId) return MODEL_DISPLAY_NAMES['unknown'];
    return MODEL_DISPLAY_NAMES[modelId as ModelId] || String(modelId);
}

/** Snapshot the current byModel state. Use at build start so you can later
 *  diff against it to get "this build cost broken down by model". */
export function snapshotByModel(): Record<string, { callCount: number; inputTokens: number; outputTokens: number; costUSD: number }> {
    const out: Record<string, any> = {};
    Object.entries(currentRun.byModel).forEach(([k, v]) => {
        out[k] = { ...v };
    });
    return out;
}

/** Diff a prior byModel snapshot against the current state. Returns only models
 *  that actually accrued cost since the snapshot, sorted by cost descending. */
export function diffByModel(snapshot: Record<string, { costUSD: number; callCount: number; inputTokens: number; outputTokens: number }>): Array<{ model: string; displayName: string; costUSD: number; callCount: number; inputTokens: number; outputTokens: number }> {
    const out: Array<any> = [];
    const seen = new Set<string>();
    Object.entries(currentRun.byModel).forEach(([k, v]) => {
        const prior = snapshot[k] || { costUSD: 0, callCount: 0, inputTokens: 0, outputTokens: 0 };
        const deltaCost = v.costUSD - prior.costUSD;
        const deltaCalls = v.callCount - prior.callCount;
        if (deltaCost > 0 || deltaCalls > 0) {
            out.push({
                model: k,
                displayName: formatModelName(k),
                costUSD: deltaCost,
                callCount: deltaCalls,
                inputTokens: v.inputTokens - prior.inputTokens,
                outputTokens: v.outputTokens - prior.outputTokens,
            });
        }
        seen.add(k);
    });
    return out.sort((a, b) => b.costUSD - a.costUSD);
}

/**
 * Build a plain-language summary of a per-build cost diff that NAMES the models
 * the user was billed for. Example output:
 *   "Approximately $5.43 in model usage — Claude Opus 4.7 $1.85, GPT-5.5 $2.32, Gemini 3.1 Pro $1.26"
 *
 * Used in the chat after each prototype build, so the user sees what they spent
 * AND which models they spent it on without having to open the cost panel.
 */
export function summarizeBuildCost(snapshotAtStart: ReturnType<typeof snapshotByModel>): string {
    const diff = diffByModel(snapshotAtStart);
    const totalUSD = diff.reduce((s, d) => s + d.costUSD, 0);
    if (totalUSD <= 0 || diff.length === 0) return '';
    const lead = `Approximately ${formatUSD(totalUSD)} in model usage`;
    const breakdown = diff.map(d => `${d.displayName} ${formatUSD(d.costUSD)}`).join(', ');
    return `${lead} — ${breakdown}.`;
}

/** Build a one-line summary suitable for end-of-build chat messages. */
export function summarizeRun(): string {
    const t = currentRun;
    if (t.callCount === 0) return 'Cost meter: no AI calls recorded this run.';
    const byModelLine = Object.entries(t.byModel)
        .sort(([, a], [, b]) => b.costUSD - a.costUSD)
        .map(([m, b]) => `${m} ${formatUSD(b.costUSD)}`)
        .join(' · ');
    return `Run cost ≈ ${formatUSD(t.totalUSD)} across ${t.callCount} AI call${t.callCount === 1 ? '' : 's'} (${t.inputTokens.toLocaleString()} in / ${t.outputTokens.toLocaleString()} out). Breakdown: ${byModelLine}.`;
}

/** Expose on window for console inspection. */
if (typeof window !== 'undefined') {
    (window as any).__HIC_COST = {
        getRunTotals,
        getRecentCalls,
        summarizeRun,
        resetRun,
        formatUSD,
    };
}
