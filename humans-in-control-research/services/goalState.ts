/**
 * DF-F3 - GOAL STATE WITH TYPED BLOCKERS
 * (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * The last unrepresented idea from deer-flow's harness: a run knows whether it MET
 * its objective, and when it did not, the reason is a TYPE rather than a sentence.
 * Everything else built in this transfer judges the artifact. This judges the RUN.
 *
 * Two design details are the point:
 *
 *  1. The blocker ROUTES. `missing_evidence` routes to narrowing (DF-G),
 *     `needs_user_input` routes to a clarification card (DF-F1), `run_failed`
 *     stops. A free-text reason cannot route, which is why every previous version
 *     of this state in HiC ended as a console warning.
 *
 *  2. A SEPARATE no-progress counter. deer-flow bounds continuation twice: a total
 *     budget and a no-progress budget. Without the second one, a run that keeps
 *     "continuing" while producing nothing new burns the entire total budget before
 *     stopping. HiC has watched exactly that happen in the repair loop, which is
 *     why `progressGuard` exists; this applies the same discipline one level up, to
 *     the run rather than to a single loop.
 */

import type { NextAction, StopReason } from './stepEnvelope';

export type GoalBlocker =
    | 'none'
    | 'missing_evidence'    // the corpus cannot support the objective -> narrow
    | 'needs_user_input'    // a parameter is genuinely ambiguous -> ask once
    | 'run_failed'          // machinery broke -> stop
    | 'external_wait'       // a provider or collection is still running -> resume
    | 'goal_not_met_yet';   // legitimate progress, more work remains -> continue

export interface GoalState {
    objective: string;
    satisfied: boolean;
    blocker: GoalBlocker;
    /** One sentence, for the log and for the user. Never parsed. */
    reason: string;
    /** What the run actually established, so a partial is honest about its value. */
    evidenceSummary: string;
    continuationCount: number;
    maxContinuations: number;
    /** Continuations that added nothing. Bounded SEPARATELY from the total. */
    noProgressCount: number;
    maxNoProgress: number;
}

export const DEFAULT_MAX_CONTINUATIONS = 6;
export const DEFAULT_MAX_NO_PROGRESS = 2;

export function initGoalState(objective: string, opts: { maxContinuations?: number; maxNoProgress?: number } = {}): GoalState {
    return {
        objective: String(objective || '').trim(),
        satisfied: false,
        blocker: 'goal_not_met_yet',
        reason: 'run has not started',
        evidenceSummary: '',
        continuationCount: 0,
        maxContinuations: opts.maxContinuations ?? DEFAULT_MAX_CONTINUATIONS,
        noProgressCount: 0,
        maxNoProgress: opts.maxNoProgress ?? DEFAULT_MAX_NO_PROGRESS,
    };
}

export interface ProgressSignal {
    /** Did this continuation add evidence, slides, or a resolved slot? */
    advanced: boolean;
    /** What was added, for the evidence summary. */
    note?: string;
    /** Set when the machinery itself failed. */
    failed?: boolean;
    /** Set when a parameter is genuinely ambiguous. */
    needsUser?: boolean;
    /** Set when the corpus cannot support the objective. */
    missingEvidence?: boolean;
    /** Set when a collection or provider call is still in flight. */
    waiting?: boolean;
}

/**
 * Advance the state by one continuation. Pure: returns a new state so the caller
 * can record the sequence.
 *
 * Precedence is deliberate. A hard failure outranks everything; a budget stop
 * outranks a soft blocker, because continuing past a budget is the behavior the
 * budget exists to prevent.
 */
export function advanceGoal(state: GoalState, signal: ProgressSignal): GoalState {
    const next: GoalState = { ...state };
    next.continuationCount = state.continuationCount + 1;
    next.noProgressCount = signal.advanced ? 0 : state.noProgressCount + 1;
    if (signal.note) {
        next.evidenceSummary = next.evidenceSummary ? `${next.evidenceSummary}; ${signal.note}` : signal.note;
    }

    if (signal.failed) {
        next.satisfied = false;
        next.blocker = 'run_failed';
        next.reason = signal.note || 'the run failed and cannot continue';
        return next;
    }
    if (next.noProgressCount >= next.maxNoProgress) {
        next.satisfied = false;
        next.blocker = signal.missingEvidence ? 'missing_evidence' : 'goal_not_met_yet';
        next.reason = `${next.noProgressCount} continuation(s) in a row added nothing; stopping on the no-progress budget rather than the total budget`;
        return next;
    }
    if (next.continuationCount >= next.maxContinuations) {
        next.satisfied = false;
        next.blocker = signal.missingEvidence ? 'missing_evidence' : 'goal_not_met_yet';
        next.reason = `continuation budget of ${next.maxContinuations} reached`;
        return next;
    }
    if (signal.needsUser) {
        next.satisfied = false;
        next.blocker = 'needs_user_input';
        next.reason = signal.note || 'a required parameter is ambiguous';
        return next;
    }
    if (signal.missingEvidence) {
        next.satisfied = false;
        next.blocker = 'missing_evidence';
        next.reason = signal.note || 'the corpus does not support the objective as stated';
        return next;
    }
    if (signal.waiting) {
        next.satisfied = false;
        next.blocker = 'external_wait';
        next.reason = signal.note || 'waiting on an external step';
        return next;
    }
    next.satisfied = false;
    next.blocker = 'goal_not_met_yet';
    next.reason = signal.advanced ? 'progress made; more work remains' : 'no progress on this continuation';
    return next;
}

/** Mark the objective met. Requires a summary: "satisfied" with nothing to show is the vacuous pass. */
export function satisfyGoal(state: GoalState, evidenceSummary: string): GoalState {
    const summary = String(evidenceSummary || '').trim();
    if (!summary) {
        return { ...state, satisfied: false, blocker: 'missing_evidence', reason: 'the run claimed success with nothing to show for it' };
    }
    return {
        ...state,
        satisfied: true,
        blocker: 'none',
        reason: 'objective met',
        evidenceSummary: state.evidenceSummary ? `${state.evidenceSummary}; ${summary}` : summary,
    };
}

/** The routing table. This is why the blocker is a type. */
const ROUTES: Record<GoalBlocker, { action: NextAction; stopReason?: StopReason; guidance: string }> = {
    none: { action: 'continue', guidance: 'objective met; ship the artifact' },
    missing_evidence: {
        action: 'narrow_scope',
        guidance: 'Narrow the artifact around what IS evidenced. Do not assert past the corpus, and do not annotate the gap.',
    },
    needs_user_input: {
        action: 'ask_user',
        guidance: 'Ask ONE question covering every missing parameter, then resume.',
    },
    run_failed: {
        action: 'stop',
        guidance: 'Report the failure with what it was. Do not present a partial as complete.',
    },
    external_wait: {
        action: 'retry_same',
        guidance: 'Resume when the external step reports back. Do not re-collect.',
    },
    goal_not_met_yet: {
        action: 'continue',
        stopReason: 'no_progress',
        guidance: 'Continue only if the last continuation advanced. Otherwise stop on the no-progress budget.',
    },
};

export function routeGoalState(state: GoalState): { action: NextAction; stopReason?: StopReason; guidance: string } {
    const route = ROUTES[state.blocker] || ROUTES.goal_not_met_yet;
    // A budget-exhausted run does not get to "continue" just because its blocker
    // is the soft one.
    if (!state.satisfied && (state.noProgressCount >= state.maxNoProgress || state.continuationCount >= state.maxContinuations)) {
        if (route.action === 'continue') {
            return {
                action: state.blocker === 'missing_evidence' ? 'narrow_scope' : 'stop',
                stopReason: state.noProgressCount >= state.maxNoProgress ? 'no_progress' : 'iteration_capped',
                guidance: 'Budget exhausted. Ship what is evidenced or report the stop; do not continue.',
            };
        }
    }
    return route;
}

/** The AIR-facing record. Fields only. */
export function goalStateRecord(state: GoalState): Record<string, unknown> {
    const route = routeGoalState(state);
    return {
        satisfied: state.satisfied,
        blocker: state.blocker,
        reason: state.reason,
        continuations: state.continuationCount,
        noProgress: state.noProgressCount,
        action: route.action,
        ...(route.stopReason ? { stopReason: route.stopReason } : {}),
    };
}
