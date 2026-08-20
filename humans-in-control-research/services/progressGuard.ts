/**
 * DF-B - STAGNATION AND LOOP GUARDS (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * Two guards with a deliberate division of labor, copied from deer-flow's
 * `ToolProgressMiddleware` vs `LoopDetectionMiddleware` split:
 *
 *   - RESULT QUALITY (`noteResult`): fires AFTER a step returns and blocks a step
 *     that has stopped producing new information. ACTIVE -> WARNED -> BLOCKED.
 *   - CALL PATTERN (`noteAttempt`): fires BEFORE a step runs and hard-stops a loop
 *     that keeps issuing the same attempt.
 *
 * HiC's existing protection is a blunt ceiling: `narrativeComposer.ts` counts to
 * COMPOSER_MAX_ITERATIONS and throws. Nothing notices a loop that returns the
 * SAME content eight times, so the run pays for eight passes and the user sees a
 * generic failure instead of the last good draft. Both problems are addressed
 * here: duplicate output is detected by Jaccard similarity (deer-flow uses the
 * same signal), and exhaustion surfaces an additive `stopReason` rather than an
 * exception, so a capped run ships an honest partial.
 */

import type { StopReason } from './stepEnvelope';

export type ProgressState = 'active' | 'warned' | 'blocked';

export interface ProgressDecision {
    state: ProgressState;
    /** True when the caller must stop attempting this step. */
    blocked: boolean;
    /** Model-facing nudge to inject on the next attempt. Empty when active. */
    hint: string;
    stopReason?: StopReason;
    /** Consecutive no-new-information results seen for this step. */
    strikes: number;
}

interface Slot {
    state: ProgressState;
    strikes: number;
    /** Normalized token sets of recent outputs, newest last. */
    recent: Set<string>[];
    /** Normalized recent attempt signatures, newest last. */
    attempts: string[];
}

const MAX_RECENT = 4;
const MAX_ATTEMPTS = 6;
/** Two identical-enough outputs in a row is a stall, not bad luck. */
const DUP_SIMILARITY = 0.92;
/** Strikes tolerated before a recoverable problem escalates past WARNED. */
const WARN_ESCALATION = 2;
/** Identical attempts tolerated before the call-pattern guard hard-stops. */
const REPEAT_ATTEMPT_LIMIT = 3;

const slots = new Map<string, Slot>();

const key = (runId: string, stepId: string) => `${runId}::${stepId}`;

function getSlot(runId: string, stepId: string): Slot {
    const k = key(runId, stepId);
    let s = slots.get(k);
    if (!s) {
        s = { state: 'active', strikes: 0, recent: [], attempts: [] };
        slots.set(k, s);
    }
    return s;
}

export function resetProgress(runId?: string): void {
    if (!runId) { slots.clear(); return; }
    for (const k of Array.from(slots.keys())) {
        if (k.startsWith(`${runId}::`)) slots.delete(k);
    }
}

function tokenize(text: string): Set<string> {
    return new Set(
        (text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2),
    );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size && !b.size) return 1;
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    return inter / (a.size + b.size - inter);
}

/**
 * CALL-PATTERN guard. Call BEFORE running a step, passing a signature that
 * captures the attempt's identity (step inputs, prompt hash, target id).
 * A repeated identical signature means the loop is not advancing.
 */
export function noteAttempt(runId: string, stepId: string, signature: string): ProgressDecision {
    const s = getSlot(runId, stepId);
    const sig = (signature || '').trim().toLowerCase().slice(0, 400);
    s.attempts.push(sig);
    if (s.attempts.length > MAX_ATTEMPTS) s.attempts.shift();
    const identical = s.attempts.filter(a => a === sig).length;
    if (identical >= REPEAT_ATTEMPT_LIMIT) {
        s.state = 'blocked';
        return {
            state: 'blocked', blocked: true, strikes: s.strikes, stopReason: 'loop_capped',
            hint: `This step was attempted ${identical} times with identical inputs and produced no advance. Use what has already been gathered instead of retrying.`,
        };
    }
    return { state: s.state, blocked: s.state === 'blocked', hint: '', strikes: s.strikes };
}

export interface ResultSignal {
    /** Envelope-derived: did the step succeed at all? */
    ok: boolean;
    /** Envelope-derived: can a model attempt fix this? */
    recoverableByModel?: boolean;
    /** 'stop' short-circuits straight to BLOCKED, matching deer-flow class (c). */
    nextAction?: string;
    /** The step's output text, used for duplicate detection. */
    output?: string;
    /** Set when the step reported it found nothing. */
    emptyResult?: boolean;
}

/**
 * RESULT-QUALITY guard. Call AFTER a step returns.
 *
 * Three classes, matching deer-flow:
 *   (a) recoverable no-new-info (empty result, duplicate output): active -> warned,
 *       terminal at warned with the hint re-injected on each further problem;
 *   (b) non-recoverable but retryable (rate limit, transient): warned, then blocked
 *       after WARN_ESCALATION further problems;
 *   (c) non-recoverable and terminal (auth, config, internal): blocked immediately.
 */
export function noteResult(runId: string, stepId: string, signal: ResultSignal): ProgressDecision {
    const s = getSlot(runId, stepId);

    // Class (c): a terminal problem never benefits from another attempt.
    if (!signal.ok && signal.nextAction === 'stop') {
        s.state = 'blocked';
        s.strikes++;
        return {
            state: 'blocked', blocked: true, strikes: s.strikes, stopReason: 'no_progress',
            hint: 'This step cannot succeed in the current configuration. Stop attempting it and report what is available.',
        };
    }

    const tokens = tokenize(signal.output || '');
    const duplicate = tokens.size > 0 && s.recent.some(prev => jaccard(prev, tokens) >= DUP_SIMILARITY);
    if (tokens.size > 0) {
        s.recent.push(tokens);
        if (s.recent.length > MAX_RECENT) s.recent.shift();
    }

    const noNewInfo = signal.emptyResult === true || duplicate;
    const problem = !signal.ok || noNewInfo;

    if (!problem) {
        // Real progress resets the ladder. A step that recovers is not on probation.
        s.state = 'active';
        s.strikes = 0;
        return { state: 'active', blocked: false, hint: '', strikes: 0 };
    }

    s.strikes++;

    // Class (a): recoverable. Terminal at WARNED; the hint is re-issued each time.
    if (noNewInfo || signal.recoverableByModel) {
        if (s.state === 'active') s.state = 'warned';
        const hint = duplicate
            ? 'The last attempt returned substantially the same content as a previous one. Change the approach or accept the current draft; repeating it will not improve it.'
            : 'The last attempt returned nothing new. Broaden or rephrase the request, or proceed with what is already available.';
        return { state: s.state, blocked: false, hint, strikes: s.strikes };
    }

    // Class (b): retryable but not model-fixable. Escalate to BLOCKED.
    if (s.state === 'active') s.state = 'warned';
    if (s.strikes > WARN_ESCALATION) {
        s.state = 'blocked';
        return {
            state: 'blocked', blocked: true, strikes: s.strikes, stopReason: 'no_progress',
            hint: 'This step has failed repeatedly for reasons a retry cannot fix. Proceed with what is available.',
        };
    }
    return {
        state: s.state, blocked: false, strikes: s.strikes,
        hint: 'The last attempt failed for an external reason. One more attempt is allowed; then proceed with what is available.',
    };
}

/**
 * Bounded-loop helper. Replaces `for (i...) { ... } throw` with a loop that
 * surfaces WHY it ended. `attempt` returns `{ done, output }`; the guard decides
 * whether continuing is worth another call.
 */
export async function runBoundedLoop<T>(
    runId: string,
    stepId: string,
    maxIterations: number,
    attempt: (iteration: number, hint: string) => Promise<{ done: boolean; value: T; output?: string }>,
): Promise<{ value: T | null; iterations: number; stopReason?: StopReason; hint: string }> {
    let hint = '';
    let last: T | null = null;
    for (let i = 0; i < maxIterations; i++) {
        const res = await attempt(i, hint);
        last = res.value;
        if (res.done) return { value: res.value, iterations: i + 1, hint };
        const decision = noteResult(runId, stepId, { ok: true, output: res.output, emptyResult: !res.output });
        hint = decision.hint;
        if (decision.blocked) {
            return { value: last, iterations: i + 1, stopReason: decision.stopReason ?? 'loop_capped', hint };
        }
        // A bounded loop is stricter than the ladder: the ladder keeps a
        // recoverable step alive because a model may still fix it, but paying
        // for more passes of a loop that has produced nothing new twice is the
        // exact waste this guard exists to stop. Two strikes ends the loop with
        // the last usable draft rather than an exception.
        if (decision.strikes >= 2) {
            return { value: last, iterations: i + 1, stopReason: 'no_progress', hint };
        }
    }
    return { value: last, iterations: maxIterations, stopReason: 'iteration_capped', hint };
}
