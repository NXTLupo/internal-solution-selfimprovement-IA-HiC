import { engagementSlug, researchGoal, getRun, currentMessageId, nextTurnIndex as runNextTurnIndex } from './runState';
/**
 * traceRecorder.ts - Meta-Harness uplift M1 (plans/volume-to-insight-substrate-2026-06-03.md §6.4)
 *
 * The single most load-bearing change for Step 7 (self-improvement epoch) to
 * actually work. Per Meta-Harness Table 3: scores-only 34.6% accuracy,
 * scores+summary 34.9%, full execution traces 50.0%. Summaries don't recover
 * the signal; they HURT by compressing diagnostically useful detail.
 *
 * This module intercepts every synthesis turn and persists the FULL trajectory
 * (composed prompt, model id, response, validator scores, fallbacks fired,
 * retry attempts, elapsed wall-time) to `hic-workspace/sessions/<slug>/traces/`
 * via the proxy. Future epoch proposers read these traces (via cat/grep) the
 * way Meta-Harness's proposer reads prior harness execution traces.
 *
 * Design contract:
 *   - Off the hot path. Trace recording NEVER blocks the synthesis call.
 *     Failures to persist are logged once and ignored. The proxy POST is
 *     fire-and-forget with a short ceiling.
 *   - In-memory ring buffer of recent turns (1024-entry cap) so epoch
 *     orchestration code running in the same session can read traces without
 *     a round-trip through the filesystem.
 *   - Stable filename schema: `<step_label>-<turn_index>-<model_id>.json` so
 *     `cat` / `grep` patterns work intuitively when the epoch proposer
 *     inspects them. Sorted by lexical filename = sorted by chronology.
 *   - PII-conservative: prompt + response are stored verbatim (the proposer
 *     needs them); model metadata + scores are structured. Nothing else is
 *     captured. No keystrokes, no analytics events, no cookies.
 *   - Determinism-friendly: every turn carries a `seed` if one was passed
 *     through, a `temperature`, and a `model_id` so reproducibility checks
 *     downstream have everything they need.
 *
 * Step 5 layered context (yield-ledger) and this layer (trace-recorder) are
 * complementary:
 *   - Yield ledger:  funnel data points  (consumer -> docs-in -> retrieved -> shipped)
 *   - Trace recorder: full turn artifacts (prompt -> response -> validator -> retries)
 * The epoch proposer reads BOTH to form causal hypotheses about why a
 * deliverable hit / missed its quality target.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

// ----------------------------------------------------------------------------
// Turn record schema.
// ----------------------------------------------------------------------------

export interface TraceTurn {
    /** UTC ms when the turn started. Stable across retries (set ONCE at attempt 1). */
    started_at: number;
    /** UTC ms when the turn completed (success OR failure). */
    finished_at: number;
    /** Wall-time spent in this turn, including retries + fallbacks. */
    elapsed_ms: number;
    /** Deliverable-stage label, e.g. 'Themes', 'Personas', 'Recommendations',
     *  'Themes Pass-1 BREADTH (Pro)', 'PRD', etc. Stable across retries. */
    step_label: string;
    /** Monotonic per-run turn counter (RunState; survives reload). */
    turn_index: number;
    /** WS-1 T3: the run and chat message this turn belongs to (join key across traces, AIR, receipts). */
    run_id?: string;
    message_id?: string;
    /** The model that produced the FINAL response (after any fallbacks). */
    model_id: string;
    /** If the call started on a different model and fell back, list the
     *  attempted models in order. Empty if the first attempt succeeded. */
    fallback_chain?: string[];
    /** The exact composed prompt that was sent to the model (post-injection
     *  of objective anchor + goal-evidence + substrate + accumulated context). */
    prompt: string;
    /** The model's raw response text (post-extraction, pre-validation). */
    response: string;
    /** How many retries the turn went through before either succeeding or
     *  giving up. 0 = first-attempt success. */
    attempts: number;
    /** 2026-10-01 (plan Stage 0.2): provider usage for the FINAL attempt, when the caller has
     *  the raw response. Anthropic: input/output/cache_read/cache_creation tokens; Gemini:
     *  promptTokenCount/candidatesTokenCount/thoughtsTokenCount; OpenAI: prompt/completion. */
    usage?: Record<string, number>;
    /** Temperature used on the final attempt. Optional; some endpoints don't honor temp. */
    temperature?: number;
    /** Seed used (if the call was deterministic-mode). */
    seed?: number;
    /** Validator output if the turn was scored before being recorded. */
    validator_scores?: Record<string, number | string | boolean>;
    /** Truthy if a fallback path fired (e.g. Flash after Pro timeout). */
    fallback_fired?: boolean;
    /** Truthy if the turn ultimately failed and downstream had to recover. */
    failed?: boolean;
    /** Error message + name if failed. Truncated to 600 chars. */
    error?: string;
    /** Engagement slug for cross-session aggregation. */
    engagement?: string;
    /** First 80 chars of the research goal - context for the proposer. */
    goal?: string;
    /** Optional caller-supplied annotation (e.g. 'pre-mortem revision pass'). */
    note?: string;
}

// ----------------------------------------------------------------------------
// In-memory ring buffer.
// ----------------------------------------------------------------------------

const RING_CAP = 1024;
const _ring: TraceTurn[] = [];

// WS-1 T4 (2026-10-30): the turn index lives in the RunState (persisted, restored), so a page
// reload no longer resets it to 0 and the proxy no longer overwrites earlier trace files.
function nextTurnIndex(): number {
    return runNextTurnIndex();
}

/** Read the in-memory ring. Epoch orchestration in the same session can call
 *  this to inspect prior turns without a filesystem round-trip. */
export function getTraces(): TraceTurn[] {
    return _ring.slice();
}


// ----------------------------------------------------------------------------
// Public API - record a turn.
//
// Used by geminiService.ts at three intercept sites: executeStep,
// executeStepViaGPT, _runBreadthPass. Off the hot path: returns immediately
// after the ring write; disk persistence is fire-and-forget.
// ----------------------------------------------------------------------------

export interface RecordTurnOpts {
    usage?: Record<string, number> | null;
    step_label: string;
    model_id: string;
    prompt: string;
    response: string;
    started_at: number;            // pass perf.now() / Date.now() at attempt 1
    attempts?: number;
    temperature?: number;
    seed?: number;
    validator_scores?: Record<string, number | string | boolean>;
    fallback_chain?: string[];
    fallback_fired?: boolean;
    failed?: boolean;
    error?: string;
    note?: string;
}

/** Keep only numeric leaves (one level of nesting for Anthropic cache_creation / Gemini details). */
function flattenUsage(u: Record<string, any>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(u || {})) {
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
        else if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const [k2, v2] of Object.entries(v)) if (typeof v2 === 'number' && Number.isFinite(v2)) out[`${k}.${k2}`] = v2;
        }
    }
    return out;
}

export function recordTurn(opts: RecordTurnOpts): TraceTurn {
    const now = Date.now();
    const engagement = engagementSlug() || undefined;
    const goal = researchGoal() || undefined;

    const turn: TraceTurn = {
        started_at: opts.started_at,
        finished_at: now,
        elapsed_ms: Math.max(0, now - opts.started_at),
        step_label: opts.step_label,
        turn_index: nextTurnIndex(),
        run_id: getRun().run_id,
        message_id: currentMessageId(),
        model_id: opts.model_id,
        fallback_chain: opts.fallback_chain,
        prompt: opts.prompt,
        response: opts.response,
        attempts: opts.attempts ?? 1,
        usage: opts.usage && typeof opts.usage === 'object' ? flattenUsage(opts.usage) : undefined,
        temperature: opts.temperature,
        seed: opts.seed,
        validator_scores: opts.validator_scores,
        fallback_fired: opts.fallback_fired,
        failed: opts.failed,
        error: opts.error ? String(opts.error).slice(0, 600) : undefined,
        engagement,
        goal: typeof goal === 'string' ? goal.slice(0, 80) : undefined,
        note: opts.note,
    };

    // 1) In-memory ring write.
    _ring.push(turn);
    if (_ring.length > RING_CAP) _ring.splice(0, _ring.length - RING_CAP);

    // 2) Fire-and-forget disk persistence. Never await.
    void _persistToDisk(turn).catch(err => {
        // One-line warn; don't spam if the proxy is down.
        if (!(_persistToDisk as any)._warnedThisSession) {
            (_persistToDisk as any)._warnedThisSession = true;
            console.warn('[traceRecorder] disk persistence unavailable (in-memory only):', err?.message || err);
        }
    });

    // 3) Structured single-line console log so the trace shows up in devtools
    // even if the proxy POST silently drops.
    try {
        const promptKb = Math.round((turn.prompt.length || 0) / 1024);
        const respKb = Math.round((turn.response.length || 0) / 1024);
        console.info(
            `[trace] turn=${turn.turn_index} step="${turn.step_label}" model=${turn.model_id} ` +
            `elapsed=${turn.elapsed_ms}ms attempts=${turn.attempts} ` +
            `prompt=${promptKb}KB response=${respKb}KB` +
            (turn.fallback_fired ? ` fallback_chain=[${(turn.fallback_chain || []).join('->')}]` : '') +
            (turn.failed ? ` FAILED error="${(turn.error || '').slice(0, 80)}"` : '')
        );
    } catch { /* non-fatal */ }

    return turn;
}

async function _persistToDisk(turn: TraceTurn): Promise<void> {
    // Short ceiling - we never want a trace write to block the user.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
        await fetch(`${PROXY_BASE}/api/sessions/trace/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(turn),
            signal: ctrl.signal,
        });
    } finally {
        clearTimeout(timer);
    }
}

// ----------------------------------------------------------------------------
// Helper: wrap a synthesis call. Optional sugar - callers can use the lower
// level recordTurn() directly when they need finer control.
//
// Usage:
//   const result = await recordedStep(
//     { step_label: 'Themes', model_id: 'gemini-3.1-pro-preview', prompt },
//     async () => geminiCall(prompt),
//     (raw) => extractResponseText(raw),
//   );
// ----------------------------------------------------------------------------

export interface RecordedStepEnvelope {
    step_label: string;
    model_id: string;
    prompt: string;
    temperature?: number;
    seed?: number;
    note?: string;
    /** 2026-06-06 - Optional deliverable tag (e.g. '#themes', '#personas')
     *  so the trace + Pareto frontier writeback knows which deliverable this
     *  is. When omitted, no Pareto scoring fires (backward-compat with the
     *  hundreds of existing recordedStep call sites in geminiService.ts). */
    deliverable?: string;
}

async function recordedStep<T>(
    env: RecordedStepEnvelope,
    fn: () => Promise<T>,
    extractResponseText: (result: T) => string,
    /** 2026-06-06 - OPTIONAL Pareto-frontier scoring. When this callback is
     *  passed, recordedStep also invokes qualityFrontier.evaluatePareto on
     *  the result, and attaches the vector to the trace turn's
     *  validator_scores. Default off so the 100+ existing call sites are
     *  unchanged; opt-in per-deliverable as we extend C2 coverage. */
    buildScoreInput?: (text: string, result: T) => any,
): Promise<T> {
    const started_at = Date.now();
    try {
        const result = await fn();
        const response = extractResponseText(result);
        // Optional Pareto scoring. Failure is silent - never breaks the call.
        let validator_scores: Record<string, number | string | boolean> | undefined;
        if (buildScoreInput) {
            try {
                // Lazy require so callers that never pass buildScoreInput don't
                // load qualityFrontier (small bundle-size win when tree-shaken).
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { evaluatePareto } = require('./qualityFrontier') as typeof import('./qualityFrontier');
                const scoreInput = buildScoreInput(response, result);
                const vec = evaluatePareto({
                    text: response,
                    label: env.deliverable || env.step_label,
                    elapsedMs: Math.max(0, Date.now() - started_at),
                    ...(scoreInput || {}),
                });
                validator_scores = vec.dimensions as Record<string, number | string | boolean>;
            } catch (e: any) {
                // Non-fatal - log once per session so the silent skip is observable.
                if (typeof console !== 'undefined' && !(recordedStep as any)._scoreWarn) {
                    (recordedStep as any)._scoreWarn = true;
                    console.warn('[recordedStep] Pareto scoring unavailable (non-fatal):', e?.message || e);
                }
            }
        }
        recordTurn({
            ...env,
            response,
            started_at,
            validator_scores,
            note: env.deliverable
                ? `${env.note ? env.note + ' | ' : ''}deliverable=${env.deliverable}`
                : env.note,
        });
        return result;
    } catch (e: any) {
        recordTurn({
            ...env,
            response: '',
            started_at,
            failed: true,
            error: e?.message || String(e),
            note: env.deliverable
                ? `${env.note ? env.note + ' | ' : ''}deliverable=${env.deliverable}`
                : env.note,
        });
        throw e;
    }
}
