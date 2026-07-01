/**
 * epochProposals.ts - WS-D (2026-06-30) propose-only self-improvement review surface.
 *
 * The scheduled epoch-proposer runs the held-out gate and writes PROPOSALS (it applies
 * nothing). The owner reviews + approves/rejects them in the SPA (EpochProposalsPanel).
 * Approval records intent; applying an approved MATERIAL harness edit still rides the
 * commit-approval flow (gated-evolution, owner decision #3). Backend: proxy
 * /api/epochs/proposals (list/create) + /api/epochs/proposals/{id}/review.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export type ProposalStatus = 'pending' | 'approved' | 'rejected';
export type ProposalRisk = 'low_risk' | 'material';

export interface EpochGateVerdict {
    decision: 'apply' | 'reject';
    discrimination_delta?: number;
    exemplar_delta?: number;
    failure_delta?: number;
    reason?: string;
}

export interface EpochProposal {
    id: string;
    created_at: string;
    epoch_id?: number | null;
    target_layer: string;        // skill | routing | hook | subagent
    target_path: string;
    summary: string;
    proposed_edit: string;       // diff / description; NOT applied
    gate_verdict?: EpochGateVerdict | null;
    risk_class: ProposalRisk;
    status: ProposalStatus;
    reviewed_at: string | null;
    review_note: string;
}

export interface EpochProposalsResult {
    proposals: EpochProposal[];
    count: number;
    pending: number;
}

/** List epoch proposals (optionally filtered by status), newest first. Fails safe to empty. */
export async function listEpochProposals(status?: ProposalStatus): Promise<EpochProposalsResult> {
    try {
        const qs = status ? `?status=${encodeURIComponent(status)}` : '';
        const resp = await fetch(`${PROXY_BASE}/api/epochs/proposals${qs}`);
        if (!resp.ok) return { proposals: [], count: 0, pending: 0 };
        const data = await resp.json();
        return {
            proposals: Array.isArray(data?.proposals) ? data.proposals : [],
            count: typeof data?.count === 'number' ? data.count : 0,
            pending: typeof data?.pending === 'number' ? data.pending : 0,
        };
    } catch {
        return { proposals: [], count: 0, pending: 0 };
    }
}

/** Owner review of a proposal. Records the decision; never mutates the harness itself. */
export async function reviewEpochProposal(
    id: string,
    decision: 'approved' | 'rejected',
    note?: string,
): Promise<{ ok: boolean; proposal?: EpochProposal; error?: string }> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/epochs/proposals/${encodeURIComponent(id)}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, note: note || '' }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return { ok: false, error: (data as any)?.error || `HTTP ${resp.status}` };
        return { ok: true, proposal: (data as any)?.proposal };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'review failed' };
    }
}
