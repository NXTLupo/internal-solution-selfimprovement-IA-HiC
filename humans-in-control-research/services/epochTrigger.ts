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
 * The trigger does NOT spawn the proposer. The proposer is .claude/skills/
 * epoch-proposer/SKILL.md, invoked by the user, a /loop cron, or a future CI
 * job. This module only exposes the READINESS signal + the COUNT, so the
 * SPA's Reasoning Stream + the chat surface can show "epoch ready" indicators.
 *
 * Cheap to call: one proxy round-trip. The actual counting happens server-side
 * because the SPA can't enumerate the filesystem.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

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

/**
 * Fetches the current epoch trigger status from the proxy.
 *
 * Returns null on network failure (caller may want to silently ignore in a
 * background polling loop rather than surface an error in the UI).
 */
export async function getEpochStatus(threshold: number = 5): Promise<EpochStatus | null> {
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
