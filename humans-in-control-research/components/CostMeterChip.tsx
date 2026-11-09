import React, { useEffect, useState } from 'react';
import { subscribeRunTotals, getRunTotals, formatUSD, formatModelName, type RunTotals } from '../services/costMeter';

/**
 * CostMeterChip - small floating chip that shows the running cost total for
 * the current engagement. Subscribes to the cost meter and re-renders on
 * every successful AI call across the app. Click to expand a breakdown by
 * model.
 *
 * Position: fixed bottom-right, doesn't interfere with content. Hidden when
 * total is $0 (no calls yet this run).
 */
export const CostMeterChip: React.FC<{ accentColor?: string }> = ({ accentColor = '#00B7C3' }) => {
    const [totals, setTotals] = useState<RunTotals>(getRunTotals());
    const [expanded, setExpanded] = useState(false);

    useEffect(() => subscribeRunTotals(setTotals), []);

    if (totals.callCount === 0) return null;

    const sortedModels = Object.entries(totals.byModel).sort(([, a], [, b]) => b.costUSD - a.costUSD);
    const sortedLabels = Object.entries(totals.byLabel).sort(([, a], [, b]) => b.costUSD - a.costUSD).slice(0, 8);
    // For the collapsed pill: list the models that actually accrued cost.
    // Shows the top 2 by spend; collapses the rest into "+N more" if longer.
    // Always tells the user WHICH providers their money went to.
    const billedModels = sortedModels.filter(([, b]) => b.costUSD > 0).map(([m]) => formatModelName(m));
    const modelChipText = billedModels.length === 0 ? ''
        : billedModels.length <= 2 ? billedModels.join(' + ')
        : `${billedModels.slice(0, 2).join(' + ')} +${billedModels.length - 2} more`;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 14,
                // 2026-10-05: bottom-LEFT (beside the epochs chip). Bottom-right sat on top of the Analyst chat
                // composer, which docks on the right edge.
                left: 150,
                zIndex: 9000,
                fontFamily: "'JetBrains Mono', monospace",
                pointerEvents: 'auto',
            }}
        >
            {expanded && (
                <div
                    style={{
                        background: '#FFFFFF',
                        border: `1px solid ${accentColor}`,
                        padding: 14,
                        marginBottom: 6,
                        minWidth: 320,
                        maxWidth: 420,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    }}
                >
                    <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: accentColor, fontWeight: 700, marginBottom: 8 }}>
                        Run cost (estimates)
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, fontFamily: "'Bebas Neue', sans-serif" }}>
                        <span style={{ fontSize: 28, letterSpacing: 1, color: '#0D0D0D' }}>{formatUSD(totals.totalUSD)}</span>
                        <span style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
                            {totals.callCount} call{totals.callCount === 1 ? '' : 's'} · {totals.inputTokens.toLocaleString()} in / {totals.outputTokens.toLocaleString()} out
                        </span>
                    </div>
                    {sortedModels.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#737373', fontWeight: 700, marginBottom: 4 }}>By model</div>
                            {sortedModels.map(([m, b]) => (
                                <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#0D0D0D', padding: '2px 0' }}>
                                    <span style={{ color: '#525252' }}>{formatModelName(m)} <span style={{ color: '#999' }}>×{b.callCount}</span></span>
                                    <span style={{ fontWeight: 700 }}>{formatUSD(b.costUSD)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {sortedLabels.length > 0 && (
                        <div>
                            <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#737373', fontWeight: 700, marginBottom: 4 }}>Top activities</div>
                            {sortedLabels.map(([label, b]) => {
                                // Strip internal "Stage N" / "Stage N.5" prefixes + per-call
                                // suffixes so the user sees activity names, not plumbing.
                                const cleanLabel = label
                                    .replace(/^Stage \d+(\.\d+)?\s+/, '')
                                    .replace(/Pass - brief \d+ \([^)]+\)/, 'Pass')
                                    .replace(/Refinement - [a-z-]+/, 'Refinement');
                                return (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#0D0D0D', padding: '2px 0' }}>
                                        <span style={{ color: '#525252', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{cleanLabel} <span style={{ color: '#999' }}>×{b.callCount}</span></span>
                                        <span style={{ fontWeight: 700 }}>{formatUSD(b.costUSD)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div style={{ marginTop: 10, fontSize: 9, color: '#999', fontStyle: 'italic' }}>
                        Estimates based on 2026-Q2 list pricing. Real bills from provider dashboards.
                    </div>
                </div>
            )}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                title={modelChipText ? `Cost so far · ${modelChipText} · click to see full breakdown` : 'Click to toggle cost breakdown'}
                style={{
                    background: '#0D0D0D',
                    color: accentColor,
                    border: `1px solid ${accentColor}`,
                    padding: '6px 14px 8px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 2,
                    minWidth: 180,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'stretch', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#999' }}>RUN COST</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1 }}>{formatUSD(totals.totalUSD)}</span>
                    <span style={{ fontSize: 9, color: '#999' }}>{expanded ? '▾' : '▴'}</span>
                </div>
                {modelChipText && (
                    <span style={{ fontSize: 9, letterSpacing: 0.5, color: '#CCC', fontWeight: 500, fontFamily: "'Archivo', sans-serif", textTransform: 'none', textAlign: 'right' }}>
                        {modelChipText}
                    </span>
                )}
            </button>
        </div>
    );
};
