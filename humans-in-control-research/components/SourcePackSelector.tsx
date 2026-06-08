/**
 * SourcePackSelector.tsx (2026-05-29) - pack-based data-source selection.
 *
 * Replaces the ~25 individual category toggles on the research landing page
 * with a small set of selectable "packs": industry verticals (Higher Ed,
 * Retail, etc.) + cross-cutting themes (AI Trends, Creative AI, Social
 * Listening). Researchers compose a run by picking, e.g., "Higher Ed" +
 * "AI Trends". Packs resolve to source IDs server-side (/api/source-packs),
 * so the set stays current as sources are added.
 *
 * Emits the selected pack IDs; the parent resolves them to source IDs via
 * /api/source-packs/{id} (or the batch helper) before collection.
 */
import React, { useEffect, useMemo, useState } from 'react';

export interface SourcePack {
    id: string;
    name: string;
    kind: 'industry' | 'theme';
    industries: string[];
    description: string;
    sourceCount: number;
}

interface Props {
    proxyBase?: string;                       // default http://127.0.0.1:5012
    selectedPackIds: string[];
    onChange: (packIds: string[]) => void;
    className?: string;
}

const ACCENTS = ['var(--nxt-cyan, #00B7C3)', 'var(--nxt-lime, #B8B800)', 'var(--nxt-teal, #115054)'];

export const SourcePackSelector: React.FC<Props> = ({
    proxyBase = 'http://127.0.0.1:5012', selectedPackIds, onChange, className,
}) => {
    const [packs, setPacks] = useState<SourcePack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch(`${proxyBase}/api/source-packs`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const d = await r.json();
                if (alive) { setPacks(d.packs || []); setLoading(false); }
            } catch (e: any) {
                if (alive) { setError(e?.message || 'failed to load packs'); setLoading(false); }
            }
        })();
        return () => { alive = false; };
    }, [proxyBase]);

    const industry = useMemo(() => packs.filter(p => p.kind === 'industry'), [packs]);
    const themes = useMemo(() => packs.filter(p => p.kind === 'theme'), [packs]);
    const selectedSet = useMemo(() => new Set(selectedPackIds), [selectedPackIds]);

    const totalSelectedSources = useMemo(
        () => packs.filter(p => selectedSet.has(p.id)).reduce((s, p) => s + p.sourceCount, 0),
        [packs, selectedSet]
    );

    const toggle = (id: string) => {
        const next = selectedSet.has(id)
            ? selectedPackIds.filter(x => x !== id)
            : [...selectedPackIds, id];
        onChange(next);
    };

    if (loading) return <div className={className} style={{ opacity: 0.6, fontFamily: 'Archivo, sans-serif' }}>Loading source packs...</div>;
    if (error) return <div className={className} style={{ color: 'var(--nxt-rust, #CC6644)' }}>Could not load packs: {error}</div>;

    const Card = (p: SourcePack, accentIdx: number) => {
        const on = selectedSet.has(p.id);
        return (
            <button
                key={p.id}
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 3,
                    border: `1px solid ${on ? ACCENTS[accentIdx % ACCENTS.length] : 'rgba(255,255,255,0.14)'}`,
                    background: on ? 'rgba(0,183,195,0.10)' : 'rgba(255,255,255,0.02)',
                    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4,
                    transition: 'border-color .12s, background .12s',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14,
                        color: on ? ACCENTS[accentIdx % ACCENTS.length] : 'var(--nxt-text, #e8e8e8)' }}>
                        {on ? ' ' : ''}{p.name}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, opacity: 0.6 }}>
                        {p.sourceCount}
                    </span>
                </div>
                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12, lineHeight: 1.35, opacity: 0.7 }}>
                    {p.description}
                </span>
            </button>
        );
    };

    const sectionLabel: React.CSSProperties = {
        fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.06em', fontSize: 13,
        textTransform: 'uppercase', opacity: 0.55, margin: '0 0 8px',
    };
    const grid: React.CSSProperties = {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10,
    };

    return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
                <p style={sectionLabel}>Industry packs</p>
                <div style={grid}>{industry.map((p, i) => Card(p, i))}</div>
            </div>
            <div>
                <p style={sectionLabel}>Cross-cutting themes</p>
                <div style={grid}>{themes.map((p, i) => Card(p, i + 1))}</div>
            </div>
            {selectedPackIds.length > 0 && (
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, opacity: 0.7 }}>
                    {selectedPackIds.length} pack{selectedPackIds.length > 1 ? 's' : ''} selected
                    {' · '}~{totalSelectedSources} sources (overlap de-duped at run time)
                </div>
            )}
        </div>
    );
};

export default SourcePackSelector;
