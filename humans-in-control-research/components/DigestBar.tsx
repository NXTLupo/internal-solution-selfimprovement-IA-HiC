/**
 * The morning read-out on the Analyst landing (2026-10-31, agent-stack plan WS-E E3): what changed in HiC since the
 * owner last marked it read (runs, verdicts, decks waiting on a decision, proposals to review, a paused loop, the
 * overnight rescore, what the second brain filed). Hidden when nothing changed; "Mark read" starts the next one now.
 */
import React, { useEffect, useState } from 'react';
import { proxyBase } from '../services/proxyConfig';

interface DigestItem { text: string }
interface DigestSection { id: string; title: string; items: DigestItem[] }
interface Digest { headline: string; sections: DigestSection[]; needs_attention: boolean; since: string }

export const DigestBar: React.FC = () => {
    const [d, setD] = useState<Digest | null>(null);
    const [open, setOpen] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        let alive = true;
        fetch(`${proxyBase()}/api/digest?surface=spa`, { signal: AbortSignal.timeout(15000) })
            .then(r => (r.ok ? r.json() : null))
            .then(x => { if (alive && x && Array.isArray(x.sections)) setD(x); })
            .catch(() => { /* the read-out is optional */ });
        return () => { alive = false; };
    }, []);

    if (hidden || !d || !d.sections.length) return null;
    const markRead = async () => {
        setHidden(true);
        try {
            await fetch(`${proxyBase()}/api/digest/seen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ surface: 'spa' }) });
        } catch { /* next load shows it again */ }
    };
    return (
        <div data-testid="digest-bar" style={{ margin: '8px 16px 0', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E4E4DC', borderLeft: `3px solid ${d.needs_attention ? '#CC6644' : '#115054'}`, fontFamily: "'Archivo', sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#115054', whiteSpace: 'nowrap' }}>Since you were last here</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#141414', flex: 1 }}>{d.headline}</span>
                <button type="button" onClick={() => setOpen(o => !o)} style={{ fontSize: 9, padding: '2px 8px', border: '1px solid #D4D4D4', background: '#FFF', color: '#115054', cursor: 'pointer' }}>{open ? 'Hide' : 'Details'}</button>
                <button type="button" onClick={markRead} style={{ fontSize: 9, padding: '2px 8px', border: '1px solid #115054', background: '#FFF', color: '#115054', cursor: 'pointer' }}>Mark read</button>
            </div>
            {open && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 8 }}>
                    {d.sections.map(s => (
                        <div key={s.id}>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#8A8A8A' }}>{s.title}</div>
                            <ul style={{ margin: '3px 0 0 14px', padding: 0, fontSize: 11, lineHeight: 1.45, color: '#33332E' }}>
                                {s.items.slice(0, 6).map((i, k) => <li key={k}>{i.text}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DigestBar;
