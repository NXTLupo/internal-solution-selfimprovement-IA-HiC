/**
 * Option board (2026-10-31, agent-stack plan WS-E E2): N layout directions for one subject, each in a sandboxed preview
 * built from the brand's design tokens. "Use option N" pins that direction for the engagement.
 *
 * The board measures its own width: where the options fit side by side they sit in one row; in the Designer's narrow
 * chat column they stack, and "Compare side by side" opens them across the whole window (live check 2026-10-31: three
 * 288px previews in a 266px column overlapped each other).
 */
import React, { useEffect, useRef, useState } from 'react';
import { previewDocument, type DesignOption } from '../../services/designOptions';

interface Props {
    subject: string;
    options: DesignOption[];
    tokenCss: string;
    chosen?: number;
    onUse: (option: DesignOption) => void;
}

const GAP = 10;
const MIN_SIDE_BY_SIDE = 220;

const OptionCard: React.FC<{ o: DesignOption; width: number; tokenCss: string; chosen?: number; onUse: (o: DesignOption) => void; dark?: boolean }> = ({ o, width, tokenCss, chosen, onUse, dark }) => {
    const isChosen = chosen === o.id;
    const scale = Math.max(0.1, (width - 16) / 960);
    return (
        <div data-testid={`design-option-${o.id}`} style={{ width, boxSizing: 'border-box', border: `1px solid ${isChosen ? '#115054' : '#E4E4DC'}`, background: '#FFFFFF', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 960 * scale, height: 540 * scale, overflow: 'hidden', border: '1px solid #EEE', position: 'relative', flex: '0 0 auto' }}>
                <iframe title={`Option ${o.id}: ${o.name}`} sandbox="" srcDoc={previewDocument(o, tokenCss)}
                    style={{ width: 960, height: 540, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <strong style={{ fontSize: 12, color: '#141414' }}>{o.id}. {o.name}</strong>
                <span title="The model's probability that this layout fits best" style={{ fontSize: 9, color: '#8A8A8A', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>fit {Math.round(o.probability * 100)}%</span>
            </div>
            <div style={{ fontSize: 10.5, color: dark ? '#33332E' : '#4A4A44', lineHeight: 1.45 }}>
                <div>{o.layout}</div>
                <div style={{ color: '#737373' }}>{o.hierarchy}</div>
                <div style={{ color: '#737373' }}>{o.density}, {o.imagery}</div>
            </div>
            <button type="button" disabled={isChosen} onClick={() => onUse(o)}
                style={{ marginTop: 'auto', padding: '5px 8px', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', cursor: isChosen ? 'default' : 'pointer',
                    border: '1px solid #115054', background: isChosen ? '#115054' : '#FFFFFF', color: isChosen ? '#FFFFFF' : '#115054' }}>
                {isChosen ? 'Pinned as the design direction' : `Use option ${o.id}`}
            </button>
        </div>
    );
};

export const DesignOptionBoard: React.FC<Props> = ({ subject, options, tokenCss, chosen, onUse }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [compare, setCompare] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        setWidth(el.getBoundingClientRect().width);
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    useEffect(() => {
        if (!compare) return;
        // capture phase: Esc closes the comparison and never reaches the Design Desk's own Esc-closes-the-window handler
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setCompare(false);
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [compare]);

    const n = Math.max(1, options.length);
    const sideBySide = width >= n * MIN_SIDE_BY_SIDE + GAP * (n - 1);
    const cardWidth = sideBySide ? (width - GAP * (n - 1)) / n : width;
    const overlayCard = typeof window !== 'undefined' ? Math.min(560, (window.innerWidth - 64 - GAP * (n - 1)) / n) : 400;
    const use = (o: DesignOption) => { onUse(o); setCompare(false); };

    return (
        <div ref={ref} data-testid="design-option-board" style={{ marginTop: 8, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#737373' }}>
                    {options.length} layout directions{subject ? ` for ${subject}` : ''}
                </div>
                {!sideBySide && (
                    <button type="button" data-testid="design-compare" onClick={() => setCompare(true)}
                        style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', border: '1px solid #115054', background: '#FFFFFF', color: '#115054', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Compare side by side
                    </button>
                )}
            </div>
            {width > 0 && (
                <div style={{ display: 'flex', flexDirection: sideBySide ? 'row' : 'column', gap: GAP }}>
                    {options.map(o => <OptionCard key={o.id} o={o} width={cardWidth} tokenCss={tokenCss} chosen={chosen} onUse={onUse} />)}
                </div>
            )}
            {compare && (
                <div role="dialog" aria-label="Layout directions side by side" data-testid="design-compare-overlay"
                    style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(13,13,13,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
                    <div style={{ display: 'flex', gap: GAP, alignItems: 'stretch' }}>
                        {options.map(o => <OptionCard key={o.id} o={o} width={overlayCard} tokenCss={tokenCss} chosen={chosen} onUse={use} dark />)}
                    </div>
                    <button type="button" onClick={() => setCompare(false)}
                        style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '5px 14px', border: '1px solid #F5F3EA', background: 'transparent', color: '#F5F3EA', cursor: 'pointer' }}>
                        Close (Esc)
                    </button>
                </div>
            )}
        </div>
    );
};

export default DesignOptionBoard;
