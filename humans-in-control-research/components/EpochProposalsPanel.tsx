import React, { useEffect, useState, useCallback } from 'react';
import {
    listEpochProposals,
    reviewEpochProposal,
    type EpochProposal,
    type ProposalStatus,
} from '../services/epochProposals';

/**
 * EpochProposalsPanel - WS-D (2026-06-30). The owner's in-UI review surface for the PROPOSE-ONLY
 * self-improvement loop. The scheduled epoch-proposer writes gated proposals (applies nothing);
 * here the owner approves/rejects them. Approving records intent; a material harness edit still
 * lands via the commit-approval flow (gated-evolution). Read-only wrt the harness - this panel
 * only sets a proposal's status.
 */
export const EpochProposalsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [proposals, setProposals] = useState<EpochProposal[]>([]);
    const [pending, setPending] = useState(0);
    const [filter, setFilter] = useState<ProposalStatus>('pending');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    // WS-5 R6 (2026-10-30): the loop's retry state. After three epoch batches without a held-out win the loop
    // pauses itself; the owner sees why here and resumes it deliberately.
    const [loop, setLoop] = useState<{ paused: boolean; paused_reason: string; epochs_without_heldout_win: number; pause_after: number; last_batch_id?: string | null; last_approve_at?: string | null } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const r = await listEpochProposals(filter);
        setProposals(r.proposals);
        setPending(r.pending);
        try {
            const resp = await fetch('http://127.0.0.1:5012/api/epochs/loop', { signal: AbortSignal.timeout(4000) });
            if (resp.ok) setLoop(await resp.json());
        } catch { /* the loop state is informational */ }
        setLoading(false);
    }, [filter]);

    const resumeLoop = async () => {
        try {
            const resp = await fetch('http://127.0.0.1:5012/api/epochs/loop/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'resumed from the proposals panel' }) });
            if (resp.ok) { const j = await resp.json(); setLoop(j.loop); }
        } catch { /* shown on the next load */ }
    };

    useEffect(() => { void load(); }, [load]);

    const review = async (id: string, decision: 'approved' | 'rejected') => {
        setBusyId(id);
        const res = await reviewEpochProposal(id, decision);
        setBusyId(null);
        if (res.ok) void load();
        // WS-B B3 (2026-10-31): an approved epoch is a settled step; its change becomes a user-scoped behavior fact.
        if (res.ok && decision === 'approved') {
            const p = proposals.find(x => x.id === id);
            if (p) {
                void import('../services/memoryAdmissions').then(({ epochAcceptedFacts, admitAt }) =>
                    admitAt('epoch accepted', epochAcceptedFacts({ epochId: p.epoch_id ?? undefined, skill: String(p.target_path || '').split(/[\\/]/).slice(-2, -1)[0] || p.target_layer, kind: p.target_layer, summary: p.summary }), `epoch_${p.epoch_id ?? p.id}`, ''))
                    .catch(() => { /* best-effort */ });
            }
        }
    };

    const overlay: React.CSSProperties = {
        position: 'fixed', inset: 0, background: 'rgba(13,13,13,0.72)', zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
    const modal: React.CSSProperties = {
        width: 'min(920px, 94vw)', maxHeight: '88vh', overflow: 'auto', background: '#0D0D0D',
        color: '#F5F5F0', border: '1px solid #2A2A2A', borderRadius: 4, padding: '24px 28px',
        fontFamily: 'Archivo, system-ui, sans-serif',
    };
    const riskBadge = (r: string): React.CSSProperties => ({
        fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
        padding: '2px 8px', borderRadius: 2, marginLeft: 8,
        background: r === 'material' ? '#CC6644' : '#115054', color: '#0D0D0D',
    });

    return (
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                    <h2 style={{ fontFamily: 'Saira Condensed, sans-serif', fontWeight: 600, fontSize: 24, margin: 0 }}>
                        SELF-IMPROVEMENT PROPOSALS
                        <span style={{ fontSize: 13, color: '#00B7C3', marginLeft: 12 }}>propose-only · {pending} pending</span>
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>×</button>
                </div>

                <p style={{ fontSize: 13, color: '#B8B8B8', marginTop: 0 }}>
                    The epoch-proposer runs the held-out golden-set gate and proposes ONE bounded harness edit per epoch.
                    Nothing is applied automatically. Approve to record intent; a material edit still lands via commit-approval.
                </p>
                {loop && (
                    <div style={{ border: `1px solid ${loop.paused ? '#CC6644' : '#2A2A2A'}`, borderRadius: 4, padding: '10px 14px', marginBottom: 14, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: loop.paused ? '#F5F5F0' : '#B8B8B8' }}>
                        {loop.paused ? (
                            <>
                                <div style={{ color: '#CC6644', textTransform: 'uppercase', marginBottom: 4 }}>Loop paused</div>
                                <div>{loop.paused_reason}</div>
                                <button onClick={resumeLoop} style={{ marginTop: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textTransform: 'uppercase', padding: '5px 12px', border: '1px solid #B8B800', borderRadius: 2, background: 'transparent', color: '#B8B800', cursor: 'pointer' }}>Resume the loop</button>
                            </>
                        ) : (
                            <div>Loop running: {loop.epochs_without_heldout_win} of {loop.pause_after} batches without a held-out win{loop.last_batch_id ? ` · last batch ${loop.last_batch_id}` : ''}{loop.last_approve_at ? ` · last APPROVE ${String(loop.last_approve_at).slice(0, 16).replace('T', ' ')}` : ''}</div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {(['pending', 'approved', 'rejected'] as ProposalStatus[]).map(s => (
                        <button key={s} onClick={() => setFilter(s)} style={{
                            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textTransform: 'uppercase',
                            padding: '4px 12px', borderRadius: 2, cursor: 'pointer',
                            border: `1px solid ${filter === s ? '#B8B800' : '#2A2A2A'}`,
                            background: filter === s ? '#B8B800' : 'transparent',
                            color: filter === s ? '#0D0D0D' : '#B8B8B8',
                        }}>{s}</button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ color: '#888', padding: 24 }}>Loading proposals…</div>
                ) : proposals.length === 0 ? (
                    <div style={{ color: '#888', padding: 24, fontStyle: 'italic' }}>
                        No {filter} proposals. The epoch-proposer writes proposals here after a gated run.
                    </div>
                ) : (
                    proposals.map(p => (
                        <div key={p.id} style={{ border: '1px solid #2A2A2A', borderRadius: 4, padding: 16, marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00B7C3', textTransform: 'uppercase' }}>
                                    {p.target_layer}{p.target_path ? ` · ${p.target_path}` : ''}
                                </span>
                                <span style={riskBadge(p.risk_class)}>{p.risk_class}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{p.summary}</div>
                            {p.gate_verdict && (
                                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#B8B8B8', marginBottom: 8 }}>
                                    gate: {p.gate_verdict.decision}
                                    {typeof p.gate_verdict.discrimination_delta === 'number' && ` · discrimination Δ=${p.gate_verdict.discrimination_delta.toFixed(3)}`}
                                    {p.gate_verdict.reason ? ` · ${p.gate_verdict.reason}` : ''}
                                </div>
                            )}
                            {p.proposed_edit && (
                                <pre style={{ background: '#151515', border: '1px solid #2A2A2A', borderRadius: 2, padding: 10, fontSize: 12, overflowX: 'auto', maxHeight: 180, whiteSpace: 'pre-wrap' }}>
                                    {p.proposed_edit.slice(0, 4000)}
                                </pre>
                            )}
                            {p.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                    <button disabled={busyId === p.id} onClick={() => review(p.id, 'approved')} style={{
                                        fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textTransform: 'uppercase', padding: '6px 16px',
                                        border: 'none', borderRadius: 2, background: '#B8B800', color: '#0D0D0D', cursor: 'pointer',
                                    }}>{busyId === p.id ? '…' : 'Approve'}</button>
                                    <button disabled={busyId === p.id} onClick={() => review(p.id, 'rejected')} style={{
                                        fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, textTransform: 'uppercase', padding: '6px 16px',
                                        border: '1px solid #CC6644', borderRadius: 2, background: 'transparent', color: '#CC6644', cursor: 'pointer',
                                    }}>Reject</button>
                                </div>
                            ) : (
                                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: p.status === 'approved' ? '#B8B800' : '#CC6644', marginTop: 4 }}>
                                    {p.status.toUpperCase()}{p.reviewed_at ? ` · ${p.reviewed_at.slice(0, 16).replace('T', ' ')}` : ''}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EpochProposalsPanel;
