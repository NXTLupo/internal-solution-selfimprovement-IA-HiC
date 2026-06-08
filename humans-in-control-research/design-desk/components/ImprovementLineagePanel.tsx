// ImprovementLineagePanel.tsx -- 2026-05-20
//
// Renders the self-improvement engine's per-artifact lineage record as an
// elegant inline panel. The user SEES what changed since the last generation:
//   - Overall quality score with delta vs prior
//   - Per-dimension deltas (citation diversity, evidence hierarchy, etc.)
//   - Rules newly applied this run
//   - Rules earning credit / under suspicion
//   - Rules auto-dismissed after persistent negative impact
//
// Single-source-of-truth: pulls from getLatestLineageFor(kind). Updates
// reactively whenever the user generates a new artifact of the same kind.

import React, { useEffect, useState } from 'react';
import {
    getLatestLineageFor,
    getDismissedConstraints,
    type ImprovementLineageRecord,
    type QualityScorecard,
} from '../../services/improvementDiscriminator';

interface Props {
    /** Artifact kind to surface lineage for (journey, blueprint, persona, org, arch, roadmap). */
    artifactKind: string;
    /** Refresh trigger - change this number to force a re-read of the lineage log. */
    refreshKey?: number;
    /** Optional density styling. 'compact' for inline-with-artifact, 'full' for side panel. */
    density?: 'compact' | 'full';
}

const dimensionLabels: Array<[keyof QualityScorecard, string]> = [
    ['citationDiversity',      'Citation diversity'],
    ['evidenceHierarchy',      'Evidence hierarchy'],
    ['actionTitleCompliance',  'Action titles'],
    ['contentBudget',          'Content budgets'],
    ['bannedPhraseAbsence',    'Banned phrases'],
    ['metaNarrationAbsence',   'Meta-narration'],
    ['selfReferentialAbsence', 'Self-referential'],
    ['density',                'Density'],
];

const COLORS = {
    bg: '#FAFAF7',
    text: '#0A0A0A',
    muted: '#6B6B6B',
    line: '#D9D9D6',
    accent: '#CACA20',
    rust: '#CC6644',
    teal: '#115054',
    success: '#3A7D44',
    dim: '#E8E8E5',
};

const ImprovementLineagePanel: React.FC<Props> = ({ artifactKind, refreshKey, density = 'compact' }) => {
    const [record, setRecord] = useState<ImprovementLineageRecord | null>(null);
    const [dismissedLog, setDismissedLog] = useState<ReturnType<typeof getDismissedConstraints>>([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        try {
            setRecord(getLatestLineageFor(artifactKind));
            setDismissedLog(getDismissedConstraints());
        } catch {
            setRecord(null);
            setDismissedLog([]);
        }
    }, [artifactKind, refreshKey]);

    if (!record) {
        // Quietly absent until the artifact has been generated at least once.
        return null;
    }

    const { currentScore, priorScore, headline, narrative, newlyActiveConstraints, attributions, dismissedThisRun } = record;
    const delta = priorScore ? currentScore.overall - priorScore.overall : null;
    const trendColor = delta === null
        ? COLORS.muted
        : delta > 0 ? COLORS.success
        : delta < 0 ? COLORS.rust
        : COLORS.muted;
    const trendSymbol = delta === null ? '·' : delta > 0 ? '↑' : delta < 0 ? '↓' : '·';

    return (
        <div style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.line}`,
            borderLeft: `3px solid ${trendColor}`,
            padding: density === 'compact' ? '10px 14px' : '14px 18px',
            fontFamily: 'Archivo, sans-serif',
            fontSize: density === 'compact' ? 11 : 12,
            color: COLORS.text,
            lineHeight: 1.4,
            margin: '8px 0',
        }}>
            {/* Header - eyebrow + overall score + delta */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 6,
            }}>
                <span style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: COLORS.muted,
                    fontWeight: 700,
                }}>
                    Improvement Lineage · {artifactKind}
                </span>
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: density === 'compact' ? 14 : 18,
                    fontWeight: 700,
                    color: COLORS.text,
                }}>
                    {currentScore.overall}/100
                    {delta !== null && (
                        <span style={{
                            marginLeft: 8,
                            fontSize: density === 'compact' ? 11 : 14,
                            color: trendColor,
                            fontWeight: 700,
                        }}>
                            {trendSymbol}{Math.abs(delta)}
                        </span>
                    )}
                </span>
            </div>

            {/* Headline */}
            <div style={{
                fontSize: density === 'compact' ? 11 : 13,
                color: COLORS.text,
                fontWeight: 500,
                marginBottom: 8,
            }}>
                {headline}
            </div>

            {/* Per-dimension sparkbar - visual deltas */}
            {priorScore && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: 4,
                    marginBottom: expanded ? 10 : 0,
                }}>
                    {dimensionLabels.map(([key, label]) => {
                        const cur = currentScore[key] as number;
                        const pri = priorScore[key] as number;
                        const d = cur - pri;
                        const barColor = d >= 5 ? COLORS.success : d <= -5 ? COLORS.rust : COLORS.line;
                        return (
                            <div key={key} title={`${label}: ${cur}/100${d !== 0 ? ` (${d > 0 ? '+' : ''}${d})` : ''}`}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <div style={{
                                    width: '100%', height: 4,
                                    background: COLORS.dim,
                                    position: 'relative',
                                }}>
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0,
                                        width: `${cur}%`,
                                        background: barColor,
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: 7,
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                    color: COLORS.muted,
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    lineHeight: 1.1,
                                }}>
                                    {label.split(' ')[0]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Show/hide details */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    marginTop: 6,
                    color: COLORS.muted,
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                }}
            >
                {expanded ? '▾ Hide details' : '▸ Show what changed'}
            </button>

            {expanded && (
                <div style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${COLORS.line}`,
                    display: 'grid',
                    gap: 10,
                }}>
                    {/* Narrative (multi-line) */}
                    <div style={{
                        fontSize: 11,
                        color: COLORS.text,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        fontFamily: 'Archivo, sans-serif',
                    }}>
                        {narrative}
                    </div>

                    {/* Newly-active rules list (if not already in narrative) */}
                    {newlyActiveConstraints.length > 0 && (
                        <div>
                            <div style={{
                                fontSize: 9,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                color: COLORS.accent,
                                fontWeight: 700,
                                marginBottom: 4,
                            }}>
                                New rules applied this run ({newlyActiveConstraints.length})
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: COLORS.text, lineHeight: 1.5 }}>
                                {newlyActiveConstraints.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Per-rule attribution table */}
                    {attributions.length > 0 && (
                        <div>
                            <div style={{
                                fontSize: 9,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                color: COLORS.muted,
                                fontWeight: 700,
                                marginBottom: 4,
                            }}>
                                Rule scorecard
                            </div>
                            <div style={{ display: 'grid', gap: 4 }}>
                                {attributions.map((a, i) => {
                                    const barColor = a.runningScore > 0.1 ? COLORS.success
                                        : a.runningScore < -0.1 ? COLORS.rust
                                        : COLORS.muted;
                                    return (
                                        <div key={i} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto auto',
                                            gap: 12,
                                            alignItems: 'center',
                                            fontSize: 10,
                                        }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {a.constraint}
                                            </span>
                                            <span style={{
                                                color: barColor,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                fontWeight: 700,
                                            }}>
                                                {a.runningScore > 0 ? '+' : ''}{a.runningScore.toFixed(2)}
                                            </span>
                                            <span style={{
                                                color: COLORS.muted,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 9,
                                            }}>
                                                {a.sampleCount}×
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Dismissed-this-run highlight */}
                    {dismissedThisRun.length > 0 && (
                        <div style={{
                            background: '#FFF4F0',
                            border: `1px solid ${COLORS.rust}`,
                            padding: '8px 10px',
                        }}>
                            <div style={{
                                fontSize: 9,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                color: COLORS.rust,
                                fontWeight: 700,
                                marginBottom: 4,
                            }}>
                                Auto-dismissed after persistent negative impact
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: COLORS.text }}>
                                {dismissedThisRun.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* All-time dismissed ledger (collapsed link) */}
                    {dismissedLog.length > 0 && (
                        <details style={{ fontSize: 10, color: COLORS.muted }}>
                            <summary style={{ cursor: 'pointer', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                Ledger: {dismissedLog.length} rules dismissed over time
                            </summary>
                            <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 10 }}>
                                {dismissedLog.slice(-10).map((d, i) => (
                                    <li key={i} style={{ marginBottom: 4 }}>
                                        <span style={{ color: COLORS.text }}>{d.constraint}</span>
                                        <span style={{ color: COLORS.muted, marginLeft: 8, fontSize: 9 }}>
                                            (score {d.runningScore.toFixed(2)} over {d.sampleCount} samples)
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImprovementLineagePanel;
