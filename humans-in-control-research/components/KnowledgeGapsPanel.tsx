/**
 * KnowledgeGapsPanel — Renders the per-engagement shortfalls + remediation
 * suggestions detected by services/knowledgeGapFinder.ts.
 *
 * Mounted in two places:
 *   1. Knowledge Library tab "Coverage" — shows the shortfalls for the current
 *      engagement and lets the user execute remediation actions per source.
 *   2. (Future) Per-deliverable side-panel pop-out when the user clicks the
 *      inline shortfall-count chip on a deliverable card.
 *
 * The deliverable artifacts themselves NEVER reference shortfalls; this panel
 * is the user's meta-layer for deciding what evidence to collect next.
 *
 * Created 2026-05-23 as the visible surface for the knowledgeGapFinder service.
 */

import React, { useEffect, useState } from 'react';
import type { KnowledgeGap, SuggestedSource } from '../services/knowledgeGapFinder';
import { runRemediationForGap } from '../services/knowledgeGapFinder';

const NXT = {
    black: '#0D0D0D',
    chartreuse: '#B8B800',
    cyan: '#00B7C3',
    rust: '#CC6644',
    teal: '#115054',
    border: '#E0E0E0',
    bg: '#FAFAFA',
    text: '#262626',
    muted: '#666666',
    critical: '#CC2266',
    high: '#CC6644',
    medium: '#B8B800',
    low: '#00B7C3',
};

const severityColor = (s: KnowledgeGap['severity']) => {
    switch (s) {
        case 'critical': return NXT.critical;
        case 'high': return NXT.high;
        case 'medium': return NXT.medium;
        case 'low': return NXT.low;
    }
};

export const KnowledgeGapsPanel: React.FC<{
    gaps: KnowledgeGap[];
    engagementSlug: string;
    onRemediationRun?: (gapId: string, result: any) => void;
}> = ({ gaps, engagementSlug, onRemediationRun }) => {
    const [expandedGap, setExpandedGap] = useState<string | null>(null);
    const [runningGap, setRunningGap] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<Record<string, any>>({});

    if (gaps.length === 0) {
        return (
            <div style={styles.empty}>
                <div style={styles.emptyTitle}>No coverage shortfalls detected.</div>
                <div style={styles.emptyBody}>
                    The corpus answers every research question implied by the engagement goal and the deliverable frameworks. Generation should proceed with full confidence.
                </div>
            </div>
        );
    }

    const critical = gaps.filter(g => g.severity === 'critical');
    const high = gaps.filter(g => g.severity === 'high');
    const medium = gaps.filter(g => g.severity === 'medium');
    const low = gaps.filter(g => g.severity === 'low');

    const handleRunRemediation = async (gap: KnowledgeGap) => {
        setRunningGap(gap.id);
        try {
            const result = await runRemediationForGap(gap);
            setLastResult(prev => ({ ...prev, [gap.id]: result }));
            if (onRemediationRun) onRemediationRun(gap.id, result);
        } catch (err: any) {
            setLastResult(prev => ({ ...prev, [gap.id]: { error: err?.message || String(err) } }));
        } finally {
            setRunningGap(null);
        }
    };

    return (
        <div style={styles.container} data-testid="knowledge-gaps-panel">
            <div style={styles.header}>
                <div style={styles.title}>Coverage shortfalls — {gaps.length}</div>
                <div style={styles.summaryChips}>
                    {critical.length > 0 && <span style={{ ...styles.severityChip, background: NXT.critical, color: '#fff' }}>{critical.length} critical</span>}
                    {high.length > 0 && <span style={{ ...styles.severityChip, background: NXT.high, color: '#fff' }}>{high.length} high</span>}
                    {medium.length > 0 && <span style={{ ...styles.severityChip, background: NXT.medium, color: '#0D0D0D' }}>{medium.length} medium</span>}
                    {low.length > 0 && <span style={{ ...styles.severityChip, background: NXT.low, color: '#fff' }}>{low.length} low</span>}
                </div>
            </div>

            <div style={styles.subtitle}>
                Questions the engagement goal or a deliverable framework implies, but the corpus cannot answer. Deliverables are still generated — the affected fields are simply omitted (no annotations, no hallucinated fill).
            </div>

            <div style={styles.gapList}>
                {gaps.map(gap => (
                    <div key={gap.id} style={styles.gapCard}>
                        <div style={styles.gapHead} onClick={() => setExpandedGap(expandedGap === gap.id ? null : gap.id)}>
                            <span style={{ ...styles.gapSeverityDot, background: severityColor(gap.severity) }} />
                            <div style={styles.gapTitle}>{gap.question}</div>
                            <span style={styles.gapCoverage} title={`Confidence ${gap.confidence.toFixed(2)}`}>
                                cov {gap.coverageScore.toFixed(2)}
                            </span>
                            <span style={styles.expandToggle}>{expandedGap === gap.id ? '▾' : '▸'}</span>
                        </div>

                        {expandedGap === gap.id && (
                            <div style={styles.gapBody}>
                                <div style={styles.metaRow}>
                                    <span style={styles.metaLabel}>TRIGGERED BY</span>
                                    <span style={styles.metaValue}>{gap.triggeredBy.type} — {gap.triggeredBy.source}</span>
                                </div>
                                {gap.affectedDeliverables.length > 0 && (
                                    <div style={styles.metaRow}>
                                        <span style={styles.metaLabel}>AFFECTS</span>
                                        <span style={styles.metaValue}>{gap.affectedDeliverables.join(', ')}</span>
                                    </div>
                                )}
                                {gap.affectedJourneyPhases.length > 0 && (
                                    <div style={styles.metaRow}>
                                        <span style={styles.metaLabel}>JOURNEY</span>
                                        <span style={styles.metaValue}>{gap.affectedJourneyPhases.join(', ')}</span>
                                    </div>
                                )}

                                <div style={styles.sourcesTitle}>Suggested sources to close this shortfall:</div>
                                <ul style={styles.sourcesList}>
                                    {gap.suggestedSources.map((s: SuggestedSource, i: number) => (
                                        <li key={i} style={styles.sourceRow}>
                                            <span style={styles.sourceTypeChip}>{s.type}</span>
                                            <span style={styles.sourceQuery}>{s.query}</span>
                                            {s.estimatedYield && (
                                                <span style={{
                                                    ...styles.yieldChip,
                                                    color: s.estimatedYield === 'high' ? NXT.teal : s.estimatedYield === 'low' ? NXT.muted : NXT.text,
                                                }}>{s.estimatedYield} yield</span>
                                            )}
                                            <div style={styles.sourceRationale}>{s.rationale}</div>
                                        </li>
                                    ))}
                                </ul>

                                {gap.remediationPrompt && (
                                    <details style={styles.promptDetails}>
                                        <summary style={styles.promptSummary}>Ready-to-paste research prompt</summary>
                                        <pre style={styles.promptPre}>{gap.remediationPrompt}</pre>
                                        <button
                                            onClick={() => {
                                                try { navigator.clipboard.writeText(gap.remediationPrompt); } catch { /* alert fallback */ }
                                            }}
                                            style={styles.copyBtn}
                                        >↗ Copy prompt</button>
                                    </details>
                                )}

                                <div style={styles.actionRow}>
                                    <button
                                        style={{ ...styles.runBtn, opacity: runningGap === gap.id ? 0.5 : 1 }}
                                        onClick={() => handleRunRemediation(gap)}
                                        disabled={runningGap === gap.id}
                                    >
                                        {runningGap === gap.id ? 'Running remediation...' : '▶ Run remediation now'}
                                    </button>
                                </div>

                                {lastResult[gap.id] && (
                                    <div style={styles.resultBox}>
                                        {lastResult[gap.id].error ? (
                                            <div style={styles.resultError}>Error: {lastResult[gap.id].error}</div>
                                        ) : (
                                            <div>
                                                <div style={styles.resultTitle}>Remediation results:</div>
                                                {(lastResult[gap.id].sourceResults || []).map((sr: any, i: number) => (
                                                    <div key={i} style={styles.resultRow}>
                                                        <span style={{ color: sr.success ? NXT.teal : NXT.rust }}>{sr.success ? '✓' : '✗'}</span>
                                                        <span style={styles.resultType}>{sr.source.type}</span>
                                                        {sr.previewUrl && (
                                                            <a href={sr.previewUrl} target="_blank" rel="noreferrer" style={styles.resultLink}>
                                                                open
                                                            </a>
                                                        )}
                                                        {sr.error && <span style={styles.resultErrorInline}>{sr.error.slice(0, 80)}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={styles.footer}>
                <a
                    href={`http://127.0.0.1:5012/api/wiki/read/synthesis/knowledge-gaps-${encodeURIComponent(engagementSlug)}.md`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.footerLink}
                >Open full coverage report (markdown)</a>
                <span style={styles.footerHint}>Repeated shortfalls feed wiki/known-gaps/ — next session's retrieval will bias toward these topics.</span>
            </div>
        </div>
    );
};

export const KnowledgeGapChip: React.FC<{ count: number; deliverableType?: string; onClick?: () => void }> = ({ count, deliverableType, onClick }) => {
    if (count <= 0) return null;
    const title = deliverableType
        ? `${count} coverage shortfall${count === 1 ? '' : 's'} affecting this ${deliverableType}. Click to view in the Knowledge Library Coverage tab.`
        : `${count} coverage shortfall${count === 1 ? '' : 's'}. Click to view.`;
    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                background: NXT.rust, color: '#fff', borderRadius: 2,
                cursor: onClick ? 'pointer' : 'default', letterSpacing: 0.5,
            }}
            onClick={onClick}
            title={title}
            data-testid="knowledge-gap-chip"
        >
            ⚠ {count} shortfall{count === 1 ? '' : 's'}
        </span>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '14px 16px',
        background: '#FFFFFF',
        border: `1px solid ${NXT.border}`,
        borderLeft: `3px solid ${NXT.rust}`,
        fontFamily: 'Archivo, sans-serif',
    },
    header: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 6,
        flexWrap: 'wrap',
        gap: 8,
    },
    title: {
        fontFamily: 'Bebas Neue, Oswald, sans-serif',
        fontSize: 16,
        color: NXT.teal,
        letterSpacing: 1,
    },
    summaryChips: { display: 'flex', gap: 4, flexWrap: 'wrap' },
    severityChip: {
        padding: '2px 8px',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    subtitle: { fontSize: 11, color: NXT.muted, lineHeight: 1.5, marginBottom: 12 },
    gapList: { display: 'flex', flexDirection: 'column', gap: 8 },
    gapCard: { border: `1px solid ${NXT.border}`, padding: '0', background: NXT.bg },
    gapHead: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
        cursor: 'pointer', userSelect: 'none',
    },
    gapSeverityDot: { width: 8, height: 8, borderRadius: '50%', flex: '0 0 8px' },
    gapTitle: { flex: 1, fontSize: 12, color: NXT.text, fontWeight: 600 },
    gapCoverage: {
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        color: NXT.muted, padding: '2px 6px', background: '#fff', border: `1px solid ${NXT.border}`,
    },
    expandToggle: { fontSize: 10, color: NXT.muted, marginLeft: 4 },
    gapBody: { padding: '4px 12px 12px', borderTop: `1px dashed ${NXT.border}` },
    metaRow: { display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 6 },
    metaLabel: {
        fontSize: 9, color: NXT.muted, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 1.2, textTransform: 'uppercase', minWidth: 80,
    },
    metaValue: { fontSize: 11, color: NXT.text },
    sourcesTitle: { fontSize: 11, color: NXT.teal, marginTop: 12, fontWeight: 700, letterSpacing: 0.5 },
    sourcesList: { listStyle: 'none', padding: 0, margin: '6px 0 0' },
    sourceRow: {
        marginBottom: 8, padding: '6px 8px', background: '#FFFFFF',
        border: `1px solid ${NXT.border}`,
    },
    sourceTypeChip: {
        display: 'inline-block', padding: '1px 6px',
        background: NXT.cyan, color: '#fff', fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5, marginRight: 8,
    },
    sourceQuery: {
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: NXT.text,
        wordBreak: 'break-all',
    },
    yieldChip: { marginLeft: 8, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" },
    sourceRationale: { marginTop: 4, fontSize: 11, color: NXT.muted, lineHeight: 1.4 },
    promptDetails: { marginTop: 10 },
    promptSummary: { cursor: 'pointer', fontSize: 11, color: NXT.cyan, letterSpacing: 0.5 },
    promptPre: {
        background: '#0D0D0D', color: NXT.chartreuse,
        padding: '8px 10px', fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 4,
    },
    copyBtn: {
        marginTop: 4, fontSize: 10, padding: '3px 8px',
        background: 'transparent', color: NXT.cyan, border: `1px solid ${NXT.cyan}`,
        cursor: 'pointer', letterSpacing: 0.5,
        fontFamily: "'JetBrains Mono', monospace",
    },
    actionRow: { marginTop: 10, display: 'flex', gap: 8 },
    runBtn: {
        padding: '6px 12px', fontSize: 11, fontWeight: 700,
        background: NXT.chartreuse, color: NXT.black, border: 'none',
        cursor: 'pointer', letterSpacing: 0.5,
        fontFamily: 'Archivo, sans-serif',
    },
    resultBox: {
        marginTop: 10, padding: '8px 10px',
        background: '#F5F5F0', border: `1px solid ${NXT.border}`,
    },
    resultTitle: { fontSize: 11, fontWeight: 700, color: NXT.teal, marginBottom: 6 },
    resultRow: { display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11, color: NXT.text, marginBottom: 3 },
    resultType: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: NXT.muted },
    resultLink: { fontSize: 10, color: NXT.cyan, textDecoration: 'underline' },
    resultErrorInline: { fontSize: 10, color: NXT.rust },
    resultError: { fontSize: 11, color: NXT.rust },
    footer: {
        marginTop: 14, paddingTop: 8,
        borderTop: `1px solid ${NXT.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        flexWrap: 'wrap', gap: 8,
    },
    footerLink: { fontSize: 10, color: NXT.cyan, textDecoration: 'underline' },
    footerHint: { fontSize: 9, color: NXT.muted, fontStyle: 'italic' },
    empty: {
        padding: '16px 18px',
        background: '#FFFFFF',
        border: `1px solid ${NXT.border}`,
        borderLeft: `3px solid ${NXT.teal}`,
    },
    emptyTitle: {
        fontFamily: 'Bebas Neue, Oswald, sans-serif',
        fontSize: 14, color: NXT.teal, letterSpacing: 1, marginBottom: 6,
    },
    emptyBody: { fontSize: 11, color: NXT.muted, lineHeight: 1.5 },
};

export default KnowledgeGapsPanel;
