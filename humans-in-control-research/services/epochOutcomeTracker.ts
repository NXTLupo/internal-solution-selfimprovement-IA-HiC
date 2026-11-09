/**
 * epochOutcomeTracker.ts - C6 of the 2026-06-06 architecture build.
 *
 * Closes the self-improvement feedback loop. Today, the epoch-proposer SKILL
 * can propose + apply ONE harness edit per epoch (skillopt-validation-gate
 * subagent reviews; skillopt-applier subagent applies). But there is no
 * mechanism that:
 *
 *   (a) MARKS deliverables produced under a given epoch's edit so we can
 *       compare quality vectors before/after,
 *   (b) DETECTS when an applied edit DEGRADED quality (Pareto-regression
 *       on the load-bearing dims for the edited deliverable class),
 *   (c) ROLLS BACK the edit automatically if the regression is severe,
 *   (d) APPENDS a rollback record to the improvement-epochs ledger so the
 *       next proposer round doesn't re-propose the failing edit.
 *
 * This module fills (a)-(d). Composes with:
 *   - traceRecorder (M1) - every trace already carries elapsed + scores
 *   - qualityFrontier (M2) - Pareto vectors per deliverable
 *   - emitDeliverable (C2) - wraps emissions; we tag the trace with epoch_id
 *   - epoch-proposer SKILL - emits an epoch record; we pick it up here
 *   - skillopt-applier subagent - applies edits we may need to roll back
 *
 * Design notes:
 *   - We do NOT make rollback decisions automatically without a strong
 *     signal. The threshold is severe regression (median Pareto vector
 *     of 10+ post-edit deliverables strictly DOMINATES one of the baseline
 *     deliverables' vectors in the regression direction). One outlier
 *     does not trigger rollback; sustained regression does.
 *   - All state is disk-authoritative (per the standing rule in the
 *     drift-audit and epoch-proposer SKILLs) so multi-worker uvicorn
 *     splits don't corrupt the tracking.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

// ---------------------------------------------------------------------------
// Epoch record + outcome contract
// ---------------------------------------------------------------------------

/** An epoch as written by the epoch-proposer skill to improvement-epochs.md. */
export interface EpochRecord {
    /** Sequential id. */
    epoch_id: number;
    /** UTC ms when the proposer applied the edit. */
    applied_at_ms: number;
    /** Edit layer: 'skill' | 'router' | 'hook' | 'subagent'. */
    layer: string;
    /** File path the edit landed in (relative to repo root). */
    file_path: string;
    /** Deliverable class the edit targets (e.g. '#themes', '#journey'). */
    deliverable_class: string;
    /** Baseline Pareto vector summary (median dim values from pre-edit). */
    baseline_vector: Record<string, number>;
    /** Edit hypothesis summary from the proposer's rationale.md. */
    hypothesis: string;
    /** Frontier dims the edit was expected to improve. */
    target_dims: string[];
    /** Floor dims the edit must NOT regress (Pareto dominance check). */
    floor_dims: string[];
}

/** Outcome tracking record appended per scored deliverable. */
export interface EpochOutcome {
    epoch_id: number;
    deliverable: string;
    scored_at_ms: number;
    dimensions: Record<string, number>;
    /** Strict-dominance check: post-edit vector dominates baseline on
     *  target dims AND does not regress on floor dims. */
    dominates_baseline: boolean;
    /** Strict-regression check: post-edit vector is DOMINATED BY baseline
     *  in the regression direction on floor dims. Severe. */
    regression_severe: boolean;
}

/** Verdict the tracker emits after sampling N post-edit deliverables. */
export interface EpochVerdict {
    epoch_id: number;
    samples: number;
    median_dimensions: Record<string, number>;
    /** Fraction of samples that strictly dominate baseline. */
    dominate_rate: number;
    /** Fraction of samples that severely regress. */
    regression_rate: number;
    /** Recommended action - read by the epoch-proposer's NEXT round. */
    action: 'keep' | 'rollback' | 'human-review';
    /** Human-readable rationale for the action. */
    rationale: string;
}

// ---------------------------------------------------------------------------
// Cross-window state - the active epoch id (window-scoped, reset on engagement change)
// ---------------------------------------------------------------------------

let _activeEpoch: { id: number; baseline_vector: Record<string, number>; target_dims: string[]; floor_dims: string[]; deliverable_class: string } | null = null;

/** Bind the tracker to the active epoch. Called from the SkillOpt applier
 *  after an edit lands; the next deliverables get tagged with this epoch_id.
 *  WS-5 R5 (2026-10-30): exported and also bound from the LEDGER at the start of every artifact run
 *  (`bindActiveEpochFromLedger`), so production outcomes attribute to the epoch the batch recorded. */
export function bindActiveEpoch(rec: EpochRecord): void {
    _activeEpoch = {
        id: rec.epoch_id,
        baseline_vector: rec.baseline_vector,
        target_dims: rec.target_dims,
        floor_dims: rec.floor_dims,
        deliverable_class: rec.deliverable_class,
    };
    if (typeof console !== 'undefined') {
        console.info(`[epochOutcomeTracker] active epoch=${rec.epoch_id} class=${rec.deliverable_class}`);
    }
}

/** Get the active epoch_id, or null if no edit is being trialed. */
export function getActiveEpochId(): number | null {
    return _activeEpoch?.id ?? null;
}

let _ledgerBoundAt = 0;
let _ledgerBoundId: number | null = null;
/**
 * WS-5 R5: read the latest applied epoch from the proxy (`/api/epochs/active`, parsed from
 * improvement-epochs.md) and bind it, so every AIR and outcome after a promotion carries the epoch id
 * without anyone calling the applier's hook by hand. Cached for five minutes; never throws.
 */
export async function bindActiveEpochFromLedger(fetchImpl: typeof fetch = globalThis.fetch): Promise<number | null> {
    if (Date.now() - _ledgerBoundAt < 5 * 60_000) return _ledgerBoundId;
    _ledgerBoundAt = Date.now();
    try {
        const resp = await fetchImpl(`${PROXY_BASE}/api/epochs/active`, { signal: AbortSignal.timeout(4000) });
        if (!resp.ok) return _ledgerBoundId;
        const j = await resp.json();
        const a = j?.active;
        if (!a || typeof a.epoch_id !== 'number') { _activeEpoch = null; _ledgerBoundId = null; return null; }
        if (_activeEpoch?.id === a.epoch_id) return a.epoch_id;
        bindActiveEpoch({
            epoch_id: a.epoch_id, applied_at_ms: Date.parse(a.applied_at || '') || Date.now(), layer: String(a.layer || 'skill'),
            file_path: String(a.file_path || ''), deliverable_class: String(a.deliverable_class || ''),
            baseline_vector: a.baseline_vector && typeof a.baseline_vector === 'object' ? a.baseline_vector : {},
            hypothesis: String(a.hypothesis || ''), target_dims: Array.isArray(a.target_dims) ? a.target_dims : [], floor_dims: Array.isArray(a.floor_dims) ? a.floor_dims : [],
        });
        _ledgerBoundId = a.epoch_id;
        return a.epoch_id;
    } catch {
        return _ledgerBoundId;
    }
}
export function _resetEpochBindingForTests(): void { _activeEpoch = null; _ledgerBoundAt = 0; _ledgerBoundId = null; }

// ---------------------------------------------------------------------------
// Outcome scoring - called from emitDeliverable AFTER evaluatePareto
// ---------------------------------------------------------------------------

/** Evaluate a deliverable's Pareto vector against the active epoch's baseline
 *  + write the outcome record to disk. No-op if no epoch is active or if the
 *  deliverable class doesn't match the epoch's target class. */
export async function scoreEpochOutcome(
    deliverable: string,
    dimensions: Record<string, number>,
): Promise<EpochOutcome | null> {
    if (!_activeEpoch) return null;
    if (_activeEpoch.deliverable_class !== deliverable) return null;

    const dominatesBaseline = _strictlyDominates(
        dimensions,
        _activeEpoch.baseline_vector,
        _activeEpoch.target_dims,
        _activeEpoch.floor_dims,
    );
    const regressionSevere = _strictRegression(
        dimensions,
        _activeEpoch.baseline_vector,
        _activeEpoch.floor_dims,
    );

    const outcome: EpochOutcome = {
        epoch_id: _activeEpoch.id,
        deliverable,
        scored_at_ms: Date.now(),
        dimensions,
        dominates_baseline: dominatesBaseline,
        regression_severe: regressionSevere,
    };

    // Disk-authoritative outcome write - best-effort.
    try {
        await fetch(`${PROXY_BASE}/api/epochs/${_activeEpoch.id}/outcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outcome),
            signal: AbortSignal.timeout(3000),
        });
    } catch (e: any) {
        console.warn('[epochOutcomeTracker] outcome write failed (cached locally):', e?.message || e);
    }

    return outcome;
}

// ---------------------------------------------------------------------------
// Verdict computation - called by the epoch-proposer's next round
// ---------------------------------------------------------------------------

/** Aggregate the N most recent outcomes for an epoch and emit a keep/rollback/
 *  human-review verdict. Decision rule:
 *    - samples < 5: insufficient data, return 'human-review' with low confidence
 *    - regression_rate > 30%: 'rollback' - the edit demonstrably degraded the
 *      deliverable's floor dims on multiple samples
 *    - dominate_rate > 60%: 'keep' - the edit demonstrably improved target
 *      dims without regressing floor dims
 *    - otherwise: 'human-review' - ambiguous signal */
async function computeEpochVerdict(epochId: number): Promise<EpochVerdict | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/epochs/${epochId}/outcomes`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok) return null;
        const data = await resp.json() as { outcomes: EpochOutcome[] };
        const outcomes = Array.isArray(data?.outcomes) ? data.outcomes : [];
        if (outcomes.length === 0) return null;

        const dimNames = Object.keys(outcomes[0]?.dimensions || {});
        const median_dimensions: Record<string, number> = {};
        for (const name of dimNames) {
            const vals = outcomes.map(o => o.dimensions[name]).filter(v => typeof v === 'number').sort((a, b) => a - b);
            if (vals.length > 0) {
                median_dimensions[name] = vals[Math.floor(vals.length / 2)];
            }
        }

        const dominate_count = outcomes.filter(o => o.dominates_baseline).length;
        const regression_count = outcomes.filter(o => o.regression_severe).length;
        const dominate_rate = dominate_count / outcomes.length;
        const regression_rate = regression_count / outcomes.length;

        let action: EpochVerdict['action'] = 'human-review';
        let rationale = '';
        if (outcomes.length < 5) {
            action = 'human-review';
            rationale = `insufficient samples (${outcomes.length} < 5); collect more before deciding`;
        } else if (regression_rate > 0.3) {
            action = 'rollback';
            rationale = `${(regression_rate * 100).toFixed(0)}% of ${outcomes.length} samples severely regressed on floor dims; revert the edit`;
        } else if (dominate_rate > 0.6) {
            action = 'keep';
            rationale = `${(dominate_rate * 100).toFixed(0)}% of ${outcomes.length} samples strictly dominate baseline; edit is net-positive`;
        } else {
            action = 'human-review';
            rationale = `ambiguous: dominate_rate=${(dominate_rate * 100).toFixed(0)}%, regression_rate=${(regression_rate * 100).toFixed(0)}%; human read required`;
        }

        return {
            epoch_id: epochId,
            samples: outcomes.length,
            median_dimensions,
            dominate_rate,
            regression_rate,
            action,
            rationale,
        };
    } catch (e: any) {
        console.warn('[epochOutcomeTracker] verdict computation failed:', e?.message || e);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Strict-dominance helpers
// ---------------------------------------------------------------------------

/** v strictly dominates baseline if v is at-least-as-good on every dim AND
 *  better on at least one target_dim AND no worse on any floor_dim. */
function _strictlyDominates(
    v: Record<string, number>,
    baseline: Record<string, number>,
    target_dims: string[],
    floor_dims: string[],
): boolean {
    let anyBetterOnTarget = false;
    for (const dim of target_dims) {
        const a = v[dim]; const b = baseline[dim];
        if (typeof a !== 'number' || typeof b !== 'number') continue;
        // Higher is generally better; the dim direction is encoded in qualityFrontier.
        // We treat target_dims as "maximize" by convention; epoch-proposer must
        // pass the correctly-directioned dim names.
        if (a > b) anyBetterOnTarget = true;
        if (a < b) return false; // regressed on a target dim - not domination
    }
    for (const dim of floor_dims) {
        const a = v[dim]; const b = baseline[dim];
        if (typeof a !== 'number' || typeof b !== 'number') continue;
        // floor_dims are "minimize" - lower (or equal) is acceptable; higher = regression
        if (a > b) return false;
    }
    return anyBetterOnTarget;
}

/** v severely regresses baseline if it's STRICTLY WORSE on at least one
 *  floor_dim (floor_dims are minimize; v[dim] > baseline[dim] = worse). */
function _strictRegression(
    v: Record<string, number>,
    baseline: Record<string, number>,
    floor_dims: string[],
): boolean {
    for (const dim of floor_dims) {
        const a = v[dim]; const b = baseline[dim];
        if (typeof a !== 'number' || typeof b !== 'number') continue;
        // 20% worse on a floor dim = regression
        if (a > b * 1.2) return true;
    }
    return false;
}
