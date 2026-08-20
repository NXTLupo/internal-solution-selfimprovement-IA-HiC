/**
 * DF-A1 - THE TYPED STEP ENVELOPE (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * Every pipeline step (retrieval, generation, verification, render, export, wiki
 * write) returns ONE shape, and every downstream guard reads the FIELDS, never
 * the message text. Ported from deer-flow's `agents/middlewares/tool_result_meta.py`
 * (`deerflow_tool_meta`), which exists for exactly the reason HiC needs it: the
 * caller must be able to decide retry / repair / narrow / stop without sniffing a
 * string.
 *
 * Why this file exists at all: `corpusChatService.ts` alone carried 34 bare catch
 * blocks whose failure mode was silent fail-open. A step that fails invisibly is
 * indistinguishable from a step that had nothing to say, and the provenance work
 * had to invent a one-off UNREACHABLE verdict to avoid shipping fabricated labels
 * during a proxy outage. That verdict is this contract, discovered the hard way.
 *
 * Design rules copied deliberately from deer-flow:
 *  1. ONE classification table (`ERROR_RULES`). Attributes are DERIVED from the
 *     table, never restated per call site, so a rule cannot drift from its
 *     recoverability contract.
 *  2. `recoverableByModel` answers "can another model attempt fix this?" and is
 *     independent of `status`. An auth failure is an error and NOT recoverable;
 *     an empty retrieval is an error and IS recoverable by rewriting the query.
 *  3. `nextAction` is the machine-readable instruction. Callers branch on it.
 *  4. Partial success is a first-class status: a step that produced SOME usable
 *     value plus a problem must not be flattened into either success or failure.
 */

export type StepStatus = 'success' | 'partial' | 'error';

export type StepErrorType =
    | 'auth'            // credentials rejected; a retry cannot help
    | 'rate_limited'    // provider throttle; summarize what we have
    | 'transient'       // network/timeout; try an alternative provider
    | 'config'          // missing key/flag/service; operator action required
    | 'permission'      // path or scope refused
    | 'no_results'      // the step ran and found nothing (NOT a crash)
    | 'not_found'       // a specific addressed thing is absent
    | 'schema_invalid'  // output did not satisfy its contract
    | 'truncated'       // output was cut off mid-structure (HiC: thinking-token overrun)
    | 'stale_write'     // read-before-write mark mismatch (DF-A4)
    | 'internal'        // our bug
    | 'unknown';

export type NextAction =
    | 'continue'        // proceed; nothing to fix
    | 'retry_same'      // same inputs, same step (transient or stale-write refresh)
    | 'rewrite_query'   // the ask was wrong, not the machinery
    | 'try_alternative' // different provider / different source / different route
    | 'narrow_scope'    // ship less rather than fabricate (the HiC-specific action)
    | 'ask_user'        // only a human can resolve the ambiguity (DF-F)
    | 'stop';           // do not continue this run

export type StepSource = 'exception' | 'step_return' | 'content_analysis' | 'gate';

/** Why a bounded loop ended early. ADDITIVE: older consumers ignore it. */
export type StopReason = 'iteration_capped' | 'loop_capped' | 'token_capped' | 'no_progress';

export interface StepEnvelope<T> {
    status: StepStatus;
    /** Present for 'success' and usually for 'partial'. Never trusted on 'error'. */
    value: T | null;
    errorType: StepErrorType | null;
    recoverableByModel: boolean;
    nextAction: NextAction;
    source: StepSource;
    /** Stable identifier, e.g. 'retrieval:pickChunks', 'gate:evidenceSlots'. */
    stepId: string;
    /** Human-readable, for logs and honest user-facing partials. Never parsed. */
    message?: string;
    stopReason?: StopReason;
    meta?: Record<string, unknown>;
}

interface ErrorAttrs {
    errorType: StepErrorType;
    recoverableByModel: boolean;
    nextAction: NextAction;
}

/**
 * ONE table. Order matters: the first matching keyword set wins, so the
 * specific, actionable classifications precede the generic ones.
 */
const ERROR_RULES: Array<{ keywords: string[]; attrs: ErrorAttrs }> = [
    {
        keywords: ['401', '403', 'unauthorized', 'authentication', 'invalid api key', 'api key not valid'],
        attrs: { errorType: 'auth', recoverableByModel: false, nextAction: 'stop' },
    },
    {
        keywords: ['429', 'rate limit', 'rate_limit', 'quota', 'resource_exhausted', 'overloaded'],
        attrs: { errorType: 'rate_limited', recoverableByModel: false, nextAction: 'try_alternative' },
    },
    {
        keywords: ['timeout', 'timed out', 'econnreset', 'connection reset', 'socket hang up', 'network error', 'failed to fetch', 'temporarily unavailable', '502', '503', '504'],
        attrs: { errorType: 'transient', recoverableByModel: false, nextAction: 'try_alternative' },
    },
    {
        keywords: ['not configured', 'not installed', 'missing required', 'no api key', 'disabled'],
        attrs: { errorType: 'config', recoverableByModel: false, nextAction: 'stop' },
    },
    {
        keywords: ['permission denied', 'access denied', 'forbidden', 'path traversal'],
        attrs: { errorType: 'permission', recoverableByModel: true, nextAction: 'try_alternative' },
    },
    {
        keywords: ['stale write', 'hash mismatch', 'content changed'],
        attrs: { errorType: 'stale_write', recoverableByModel: true, nextAction: 'retry_same' },
    },
    {
        keywords: ['unexpected end of json', 'unterminated string', 'truncated', 'max_tokens', 'finish_reason: length'],
        attrs: { errorType: 'truncated', recoverableByModel: true, nextAction: 'retry_same' },
    },
    {
        keywords: ['json', 'schema', 'parse', 'unexpected token', 'invalid shape'],
        attrs: { errorType: 'schema_invalid', recoverableByModel: true, nextAction: 'retry_same' },
    },
    {
        keywords: ['no results', 'no content found', 'empty corpus', 'zero chunks', 'nothing matched'],
        attrs: { errorType: 'no_results', recoverableByModel: true, nextAction: 'rewrite_query' },
    },
    {
        keywords: ['not found', 'no such file', 'does not exist', '404'],
        attrs: { errorType: 'not_found', recoverableByModel: true, nextAction: 'rewrite_query' },
    },
    {
        keywords: ['internal error', '500'],
        attrs: { errorType: 'internal', recoverableByModel: false, nextAction: 'stop' },
    },
];

const UNKNOWN_ATTRS: ErrorAttrs = {
    errorType: 'unknown',
    recoverableByModel: true,
    nextAction: 'try_alternative',
};

/** Derived, never duplicated: a shell built from an errorType inherits its contract. */
const ATTRS_BY_TYPE: Record<string, ErrorAttrs> = ERROR_RULES.reduce((acc, r) => {
    acc[r.attrs.errorType] = r.attrs;
    return acc;
}, {} as Record<string, ErrorAttrs>);

export function classifyError(text: string): ErrorAttrs {
    const hay = (text || '').toLowerCase();
    for (const rule of ERROR_RULES) {
        for (const kw of rule.keywords) {
            // Digit-only keywords (status codes) need a boundary so "1429" or a
            // year does not read as a 429. Word keywords match as substrings.
            if (/^\d+$/.test(kw)) {
                if (new RegExp(`(?<![\\d.])${kw}(?![\\d])`).test(hay)) return rule.attrs;
            } else if (hay.includes(kw)) {
                return rule.attrs;
            }
        }
    }
    return UNKNOWN_ATTRS;
}

export function ok<T>(stepId: string, value: T, meta?: Record<string, unknown>): StepEnvelope<T> {
    return {
        status: 'success', value, errorType: null, recoverableByModel: false,
        nextAction: 'continue', source: 'step_return', stepId, meta,
    };
}

/**
 * A step that produced usable output AND hit a problem. `nextAction` is derived
 * from the problem so the caller can decide whether the partial is shippable.
 */
export function partial<T>(
    stepId: string, value: T, problem: string, opts: { nextAction?: NextAction; stopReason?: StopReason; meta?: Record<string, unknown> } = {},
): StepEnvelope<T> {
    const attrs = classifyError(problem);
    return {
        status: 'partial', value, errorType: attrs.errorType,
        recoverableByModel: attrs.recoverableByModel,
        nextAction: opts.nextAction ?? attrs.nextAction,
        source: 'content_analysis', stepId, message: problem,
        stopReason: opts.stopReason, meta: opts.meta,
    };
}

export function fail<T = never>(
    stepId: string, problem: unknown, opts: { errorType?: StepErrorType; nextAction?: NextAction; source?: StepSource; meta?: Record<string, unknown> } = {},
): StepEnvelope<T> {
    const text = problem instanceof Error ? (problem.message || String(problem)) : String(problem ?? '');
    const attrs = opts.errorType ? (ATTRS_BY_TYPE[opts.errorType] ?? { ...UNKNOWN_ATTRS, errorType: opts.errorType }) : classifyError(text);
    return {
        status: 'error', value: null, errorType: attrs.errorType,
        recoverableByModel: attrs.recoverableByModel,
        nextAction: opts.nextAction ?? attrs.nextAction,
        source: opts.source ?? (problem instanceof Error ? 'exception' : 'step_return'),
        stepId, message: text, meta: opts.meta,
    };
}

/**
 * A gate refusal. Distinct from `fail` because the machinery worked perfectly:
 * the OUTPUT failed its contract. Gate refusals default to `narrow_scope`, which
 * is the remedy `.claude/CLAUDE.md` mandates and no code enforced before DF-G:
 * write the section around what IS evidenced rather than asserting more.
 */
export function refuse<T>(
    stepId: string, value: T, reason: string, opts: { nextAction?: NextAction; meta?: Record<string, unknown> } = {},
): StepEnvelope<T> {
    return {
        status: 'partial', value, errorType: 'schema_invalid', recoverableByModel: true,
        nextAction: opts.nextAction ?? 'narrow_scope', source: 'gate', stepId,
        message: reason, meta: opts.meta,
    };
}

/**
 * Run a step and NEVER throw. This is the wrapper that replaces a bare catch:
 * the run may still continue, but the decision to continue now reads a field.
 */
export async function runStep<T>(
    stepId: string, fn: () => Promise<T>, opts: { meta?: Record<string, unknown> } = {},
): Promise<StepEnvelope<T>> {
    try {
        const value = await fn();
        return ok(stepId, value, opts.meta);
    } catch (e: any) {
        const env = fail<T>(stepId, e, { meta: opts.meta });
        console.warn(`[step:${stepId}] ${env.errorType} (${env.nextAction}): ${env.message}`);
        return env;
    }
}

/** Synchronous sibling of runStep, for gates and pure transforms. */
export function runStepSync<T>(
    stepId: string, fn: () => T, opts: { meta?: Record<string, unknown> } = {},
): StepEnvelope<T> {
    try {
        return ok(stepId, fn(), opts.meta);
    } catch (e: any) {
        const env = fail<T>(stepId, e, { meta: opts.meta });
        console.warn(`[step:${stepId}] ${env.errorType} (${env.nextAction}): ${env.message}`);
        return env;
    }
}

/** True when the envelope carries output the caller may ship or keep processing. */
export function hasUsableValue<T>(env: StepEnvelope<T>): boolean {
    return env.value !== null && env.value !== undefined && env.status !== 'error';
}

/** Compact one-line form for AIR and telemetry. Never the message text. */
export function envelopeTrace<T>(env: StepEnvelope<T>): Record<string, unknown> {
    return {
        stepId: env.stepId,
        status: env.status,
        errorType: env.errorType,
        nextAction: env.nextAction,
        ...(env.stopReason ? { stopReason: env.stopReason } : {}),
    };
}
