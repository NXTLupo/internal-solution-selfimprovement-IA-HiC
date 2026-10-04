/**
 * epochTrigger.ts - Meta-Harness uplift M5 (plans/volume-to-insight-substrate-2026-06-03.md §6.4)
 *
 * The trigger half of the Step-7 self-improvement epoch. Computes
 * `jobs_since_last_epoch` from disk-authoritative state and tells callers
 * whether the epoch-proposer skill is "due" to fire.
 *
 * Disk-authoritative by design: the trigger never trusts in-memory state.
 * The signal is computed by counting completed research jobs in the
 * engagement folder tree and comparing to the last epoch's timestamp in
 * wiki/synthesis/improvement-epochs.md. This is the same pattern the
 * topic-model job sentinel uses (the user's standing rule "disk-authoritative
 * so it survives the uvicorn multi-worker split").
 *
 * 2026-10-01 (plan hic-world-class-uplift Stage 5.1, audit C2): the status used to
 * be computed and DISCARDED - no SPA caller read it, so `due` had been true since
 * inception and nothing fired. `recordJobCompletion` is the end-of-run reader:
 * emitDeliverable calls it once per artifact after the AIR is emitted; it
 * increments the per-JOB counter (one count per research run, not per
 * artifact), re-reads the status, logs the status line once per run, and when
 * the epoch is due writes ONE pending proposal through /api/epochs/proposals
 * (the propose-only ledger the owner reviews in EpochProposalsPanel). It never
 * applies anything: proposing is the whole job.
 *
 * Counter authority: the proxy's `POST /api/epochs/jobs` is the intended
 * disk-authoritative counter. Until the proxy exposes it, the counter is
 * persisted through the existing wiki write path at
 * `synthesis/epoch-job-counter.json` and merged with the proxy status (the
 * larger of the two counts wins, so neither reader can silently zero it).
 *
 * Cheap to call: a handful of proxy round-trips per RUN (not per artifact).
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

/** Where the local (fallback) job counter lives, relative to wiki/. Excluded
 *  from the compiler by being JSON (the compiler only regenerates .md). */
export const EPOCH_JOB_COUNTER_PATH = 'synthesis/epoch-job-counter.json';

export interface EpochStatus {
    /** True when jobs_since_last_epoch >= threshold. */
    due: boolean;
    /** Number of completed research jobs since the most recent applied epoch
     *  (or since wiki/synthesis/improvement-epochs.md was last written). */
    jobs_since_last_epoch: number;
    /** Threshold for due=true. Default 5, matches the "5+ similar edits"
     *  constraint-approval cadence. */
    threshold: number;
    /** ISO timestamp of the most recent epoch record in the ledger.
     *  null = ledger has no epoch records yet. */
    last_epoch_at: string | null;
    /** Sequential id of the next epoch (last_epoch_id + 1). */
    next_epoch_id: number;
    /** Server time when status was computed (UTC ISO). */
    computed_at: string;
}

/** The local counter record persisted at EPOCH_JOB_COUNTER_PATH. */
export interface LocalJobCounter {
    jobs_since_last_epoch: number;
    /** The proxy `last_epoch_at` this count was accumulated under. When the
     *  ledger gains a new epoch, the count resets. */
    since_epoch_at: string | null;
    /** Distinct run ids counted (bounded; a run is counted once). */
    runs: string[];
    updated_at: string;
}

export interface RecordJobCompletionResult {
    status: EpochStatus | null;
    /** True when this call incremented the job counter (first artifact of the run). */
    counted: boolean;
    /** Id of the pending epoch proposal (created now or already pending). */
    proposalId: string | null;
    /** True when a NEW proposal was written on this call. */
    proposed: boolean;
    /** The human-readable status line (logged once per run). */
    statusLine: string;
}

/**
 * Fetches the current epoch trigger status from the proxy.
 *
 * Returns null on network failure (caller may want to silently ignore in a
 * background polling loop rather than surface an error in the UI).
 */
async function getEpochStatus(threshold: number = 5): Promise<EpochStatus | null> {
    try {
        const url = `${PROXY_BASE}/api/epochs/status?threshold=${threshold}`;
        const resp = await fetch(url);
        if (!resp.ok) {
            console.warn(`[epochTrigger] /api/epochs/status returned HTTP ${resp.status}`);
            return null;
        }
        return resp.json();
    } catch (e: any) {
        console.warn('[epochTrigger] status fetch failed:', e?.message || e);
        return null;
    }
}

/**
 * Convenience: return a short human-readable status line for the Reasoning
 * Stream / chat surface. Examples:
 *   "Epoch 4 ready - 5 jobs since last epoch (threshold 5)."
 *   "Epoch 4 due in 2 - 3/5 jobs since last epoch."
 *   "Epoch tracker offline."
 */
export function formatEpochStatusLine(status: EpochStatus | null): string {
    if (!status) return 'Epoch tracker offline.';
    if (status.due) {
        return `Epoch ${status.next_epoch_id} ready - ${status.jobs_since_last_epoch} jobs since last epoch (threshold ${status.threshold}). Run \`/epoch-proposer\` to fire.`;
    }
    const remaining = Math.max(0, status.threshold - status.jobs_since_last_epoch);
    return `Epoch ${status.next_epoch_id} due in ${remaining} - ${status.jobs_since_last_epoch}/${status.threshold} jobs since last epoch.`;
}

// ---------------------------------------------------------------------------
// End-of-run reader (C2)
// ---------------------------------------------------------------------------

/** Runs whose status line has already been logged in this window. */
const _loggedRuns = new Set<string>();
/** Runs already counted in this window (saves the read-modify-write on the
 *  2nd..Nth artifact of the same run; the persisted `runs` list is the
 *  cross-window guard). */
const _countedRuns = new Set<string>();

/** Test seam: clear the per-window once-per-run guards. */
export function __resetEpochTriggerStateForTests(): void {
    _loggedRuns.clear();
    _countedRuns.clear();
}

async function readLocalCounter(): Promise<LocalJobCounter | null> {
    try {
        const r = await fetch(`${PROXY_BASE}/api/wiki/read/${EPOCH_JOB_COUNTER_PATH}`);
        if (!r.ok) return null;
        const data = await r.json();
        if (!data?.content) return null;
        const parsed = JSON.parse(data.content);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            jobs_since_last_epoch: Number(parsed.jobs_since_last_epoch) || 0,
            since_epoch_at: typeof parsed.since_epoch_at === 'string' ? parsed.since_epoch_at : null,
            runs: Array.isArray(parsed.runs) ? parsed.runs.filter((x: unknown) => typeof x === 'string') : [],
            updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : '',
        };
    } catch {
        return null;
    }
}

async function writeLocalCounter(counter: LocalJobCounter): Promise<boolean> {
    try {
        const r = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: EPOCH_JOB_COUNTER_PATH, content: JSON.stringify(counter, null, 2) }),
        });
        return r.ok;
    } catch {
        return false;
    }
}

/**
 * Try the proxy's disk-authoritative counter first. Contract (proxy owner):
 *   POST /api/epochs/jobs  {run_id, deliverable, threshold}  ->  EpochStatus
 * Idempotent per run_id. Returns null when the endpoint does not exist yet
 * (404) or fails, so the local counter takes over.
 */
async function postProxyJobCounter(runId: string, deliverable: string, threshold: number): Promise<EpochStatus | null> {
    try {
        const r = await fetch(`${PROXY_BASE}/api/epochs/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ run_id: runId, deliverable, threshold }),
        });
        if (!r.ok) return null;
        const data = await r.json();
        if (!data || typeof data.jobs_since_last_epoch !== 'number') return null;
        return data as EpochStatus;
    } catch {
        return null;
    }
}

/** Fallback: persist the per-job count through the wiki write path and merge
 *  it with the proxy status (max of the two counts). */
async function incrementLocalCounter(
    runId: string,
    proxyStatus: EpochStatus | null,
    threshold: number,
): Promise<{ status: EpochStatus | null; counted: boolean }> {
    const existing = await readLocalCounter();
    const epochAt = proxyStatus?.last_epoch_at ?? null;
    let counter: LocalJobCounter = existing && existing.since_epoch_at === epochAt
        ? existing
        : { jobs_since_last_epoch: 0, since_epoch_at: epochAt, runs: [], updated_at: '' };

    let counted = false;
    if (!counter.runs.includes(runId)) {
        counter = {
            ...counter,
            jobs_since_last_epoch: counter.jobs_since_last_epoch + 1,
            runs: [...counter.runs, runId].slice(-200),
            updated_at: new Date().toISOString(),
        };
        counted = await writeLocalCounter(counter);
    }

    if (!proxyStatus) {
        // Proxy status unreachable: the local counter is the only reader left.
        const jobs = counter.jobs_since_last_epoch;
        return {
            counted,
            status: {
                due: jobs >= threshold,
                jobs_since_last_epoch: jobs,
                threshold,
                last_epoch_at: epochAt,
                next_epoch_id: 1,
                computed_at: new Date().toISOString(),
            },
        };
    }
    const jobs = Math.max(proxyStatus.jobs_since_last_epoch, counter.jobs_since_last_epoch);
    return {
        counted,
        status: { ...proxyStatus, jobs_since_last_epoch: jobs, due: jobs >= proxyStatus.threshold },
    };
}

/**
 * When the epoch is due, make sure exactly ONE pending proposal exists for the
 * next epoch id. The proposal is the owner's review record ("run epoch N");
 * nothing is applied here. Returns the proposal id, or null when the ledger is
 * unreachable.
 */
export async function ensureEpochDueProposal(status: EpochStatus): Promise<{ id: string | null; created: boolean }> {
    try {
        const listResp = await fetch(`${PROXY_BASE}/api/epochs/proposals?status=pending`);
        if (listResp.ok) {
            const data = await listResp.json();
            const items: any[] = Array.isArray(data?.proposals) ? data.proposals : [];
            const existing = items.find(p => p?.target_layer === 'epoch' && Number(p?.epoch_id) === status.next_epoch_id);
            if (existing?.id) return { id: String(existing.id), created: false };
        }
        const body = {
            kind: 'epoch_due',
            epoch_id: status.next_epoch_id,
            target_layer: 'epoch',
            target_path: 'hic-workspace/wiki/synthesis/improvement-epochs.md',
            summary: `Epoch ${status.next_epoch_id} due: ${status.jobs_since_last_epoch} jobs since last epoch (threshold ${status.threshold})`,
            proposed_edit: `Run the held-out epoch batch for epoch ${status.next_epoch_id}: POST /api/epochs/run-batch {"epoch_id": ${status.next_epoch_id}}. `
                + 'The batch writes candidate proposals under hic-workspace/skillopt/proposals/<batch>/; promotion requires an APPROVE verdict file per skill.',
            gate_verdict: null,
            risk_class: 'low_risk',
            jobs_since_last_epoch: status.jobs_since_last_epoch,
            threshold: status.threshold,
        };
        const resp = await fetch(`${PROXY_BASE}/api/epochs/proposals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!resp.ok) return { id: null, created: false };
        const data = await resp.json();
        return { id: data?.id ? String(data.id) : null, created: true };
    } catch (e: any) {
        console.warn('[epochTrigger] proposal write failed:', e?.message || e);
        return { id: null, created: false };
    }
}

/**
 * The end-of-run hook. Call once per emitted artifact; it counts the RUN once,
 * logs the status line once per run, and proposes when due.
 */
export async function recordJobCompletion(
    runId: string,
    opts: { deliverable?: string; threshold?: number } = {},
): Promise<RecordJobCompletionResult> {
    const threshold = opts.threshold ?? 5;
    const deliverable = opts.deliverable || 'artifact';
    const run = (runId || 'run').trim() || 'run';

    let status: EpochStatus | null = null;
    let counted = false;

    if (_countedRuns.has(run)) {
        status = await getEpochStatus(threshold);
    } else {
        status = await postProxyJobCounter(run, deliverable, threshold);
        if (status) {
            counted = true;
        } else {
            const proxyStatus = await getEpochStatus(threshold);
            const local = await incrementLocalCounter(run, proxyStatus, threshold);
            status = local.status;
            counted = local.counted;
        }
        _countedRuns.add(run);
    }

    const statusLine = formatEpochStatusLine(status);
    if (!_loggedRuns.has(run)) {
        _loggedRuns.add(run);
        console.info(`[epochTrigger] ${statusLine}`);
    }

    let proposalId: string | null = null;
    let proposed = false;
    if (status?.due) {
        const r = await ensureEpochDueProposal(status);
        proposalId = r.id;
        proposed = r.created;
        if (proposed) console.info(`[epochTrigger] epoch ${status.next_epoch_id} proposal written (${proposalId}) - pending owner review, nothing applied`);
    }

    return { status, counted, proposalId, proposed, statusLine };
}
