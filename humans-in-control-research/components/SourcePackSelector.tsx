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
 *
 * 2026-08-13 (owner): pack headers are ALWAYS prominent (ink, never faded -
 * the old unselected state used a near-white text token on the light panel)
 * and every pack carries an on-brand monochrome glyph (geometric stroke mark,
 * currentColor, per the content-true icon rule). Bebas Neue section label
 * replaced with Saira Condensed (brand swap 2026-06-13).
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

const CYAN = 'var(--nxt-cyan, #00B7C3)';
const INK = 'var(--nxt-rail, #0D0D0D)';
const INK_SOFT = 'rgba(13,13,13,0.72)';
const HAIRLINE = 'rgba(13,13,13,0.18)';

/** Content-true monochrome glyphs, one per pack id (stroke marks, currentColor).
 *  Unknown ids fall back to the source-stack mark. */
const PackGlyph: React.FC<{ packId: string }> = ({ packId }) => {
    const s: React.SVGProps<SVGSVGElement> = {
        width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
    };
    switch (packId) {
        case 'higher_ed': return <svg {...s}><path d="M12 4 2 9l10 5 10-5-10-5z" /><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" /></svg>;
        case 'fundraising': return <svg {...s}><path d="M12 20V10" /><path d="M12 10c-4 0-6-2-6-5 3 0 6 1.5 6 5zM12 10c4 0 6-2 6-5-3 0-6 1.5-6 5z" /><path d="M5 20h14" /></svg>;
        case 'workforce': return <svg {...s}><rect x="4" y="7" width="16" height="13" rx="1.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M4 12h16" /></svg>;
        case 'retail': return <svg {...s}><path d="M5 8h14l-1.2 11H6.2L5 8z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></svg>;
        case 'government': return <svg {...s}><path d="M4 20h16M5 9h14M12 4 4 9h16l-8-5z" /><path d="M7 9v8M12 9v8M17 9v8" /></svg>;
        case 'financial_services': return <svg {...s}><circle cx="12" cy="12" r="8" /><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.7 0-2.8 1-2.8 2.2 0 3 5.6 1.4 5.6 4.4 0 1.2-1.1 2.2-2.8 2.2-1.2 0-2.2-.6-2.7-1.6" /><path d="M12 6.5v11" /></svg>;
        case 'healthcare': return <svg {...s}><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M12 10v6M9 13h6M9 6V4h6v2" /></svg>;
        case 'insurance': return <svg {...s}><path d="M12 3 5 6v5c0 4.5 3 8.2 7 9.5 4-1.3 7-5 7-9.5V6l-7-3z" /><path d="M9 12l2 2 4-4" /></svg>;
        case 'agriculture': return <svg {...s}><path d="M12 20V8" /><path d="M12 12c0-3-2-5-5-5 0 3 2 5 5 5zM12 12c0-3 2-5 5-5 0 3-2 5-5 5zM12 8c0-2.5-1.5-4-4-4 0 2.5 1.5 4 4 4z" /></svg>;
        case 'energy': return <svg {...s}><path d="M13 3 5 13h5l-1 8 8-11h-5l1-7z" /></svg>;
        case 'social_clubs': return <svg {...s}><circle cx="9" cy="9" r="3" /><circle cx="16.5" cy="10.5" r="2.4" /><path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M15.5 15.4c2.1.4 3.5 2 3.5 3.6" /></svg>;
        case 'travel_tourism': return <svg {...s}><circle cx="12" cy="12" r="8.5" /><path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" /></svg>;
        case 'executive_search': return <svg {...s}><circle cx="10.5" cy="9" r="3" /><path d="M5.5 17.5c0-2.6 2.2-4.5 5-4.5 1 0 2 .25 2.8.7" /><circle cx="16.5" cy="15.5" r="3.2" /><path d="m18.8 17.8 2.2 2.2" /></svg>;
        case 'ai_trends': return <svg {...s}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>;
        case 'creative_ai': return <svg {...s}><path d="m14 4 6 6-9.5 9.5H4.5V13.5L14 4z" /><path d="M12 6.5 17.5 12" /><path d="M19 3.5v0M21 6.5v0" /></svg>;
        case 'social_listening': return <svg {...s}><path d="M5 6h14v9H10l-4 4v-4H5V6z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" /></svg>;
        case 'academic': return <svg {...s}><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z" /><path d="M5 17c0-1.1.9-2 2-2h11" /><path d="M9 8h6" /></svg>;
        default: return <svg {...s}><ellipse cx="12" cy="6" rx="7" ry="2.6" /><path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" /><path d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" /></svg>;
    }
};

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

    const Card = (p: SourcePack) => {
        const on = selectedSet.has(p.id);
        return (
            <button
                key={p.id}
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 3,
                    border: on ? `1.5px solid ${CYAN}` : `1px solid ${HAIRLINE}`,
                    background: on ? 'rgba(0,183,195,0.08)' : 'transparent',
                    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'border-color .12s, background .12s',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span aria-hidden style={{ color: on ? CYAN : INK, display: 'inline-flex', flexShrink: 0 }}>
                        <PackGlyph packId={p.id} />
                    </span>
                    <span style={{
                        fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15.5,
                        lineHeight: 1.2, color: on ? CYAN : INK, flex: 1,
                    }}>
                        {p.name}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: INK_SOFT }}>
                        {p.sourceCount}
                    </span>
                </div>
                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: 12.5, lineHeight: 1.4, color: INK_SOFT }}>
                    {p.description}
                </span>
            </button>
        );
    };

    const sectionLabel: React.CSSProperties = {
        fontFamily: '"Saira Condensed", Archivo, sans-serif', fontWeight: 600,
        letterSpacing: '0.08em', fontSize: 15, textTransform: 'uppercase',
        color: INK, margin: '0 0 10px',
    };
    const grid: React.CSSProperties = {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12,
    };

    return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <p style={sectionLabel}>Industry packs</p>
                <div style={grid}>{industry.map(p => Card(p))}</div>
            </div>
            <div>
                <p style={sectionLabel}>Cross-cutting themes</p>
                <div style={grid}>{themes.map(p => Card(p))}</div>
            </div>
            {selectedPackIds.length > 0 && (
                <div style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace', fontSize: 12, color: INK_SOFT }}>
                    {selectedPackIds.length} pack{selectedPackIds.length > 1 ? 's' : ''} selected
                    {' · '}~{totalSelectedSources} sources (overlap de-duped at run time)
                </div>
            )}
        </div>
    );
};

export default SourcePackSelector;
