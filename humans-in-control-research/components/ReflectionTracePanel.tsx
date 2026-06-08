// components/ReflectionTracePanel.tsx
// 2026-05-26 - Live reflection-trace renderer for HiC Deep Research.
// Streams researchPlanRunner trace entries as they land. Per row: iter
// number, sub-question, evidence count, verdict pill, elapsed ms, notes.
// Pause / abort affordance lives in the parent ResearchPlanEditor.

import React from 'react';
import type { ReflectionTraceEntry, ReflectionVerdict } from '../services/researchPlanRunner';

export interface ReflectionTracePanelProps {
    trace: ReflectionTraceEntry[];
    /** When true, surface a "Live" indicator. */
    isRunning: boolean;
    /** Optional: total iterations expected, for progress framing. */
    maxIterations?: number;
    /** Optional: budget for the run. */
    budgetUsd?: number;
}

const VERDICT_COLOR: Record<ReflectionVerdict, string> = {
    covered: '#0CCE6B',
    gap_remains: '#CC6644',
    new_question: '#00B7C3',
    rejected: '#888888',
};

const VERDICT_LABEL: Record<ReflectionVerdict, string> = {
    covered: 'COVERED',
    gap_remains: 'GAP REMAINS',
    new_question: 'NEW QUESTION',
    rejected: 'REJECTED',
};

export const ReflectionTracePanel: React.FC<ReflectionTracePanelProps> = ({ trace, isRunning, maxIterations, budgetUsd }) => {
    const totalSpend = trace.length > 0 ? trace[trace.length - 1].spend_so_far_usd : 0;
    const verdictCounts = trace.reduce((acc, e) => {
        acc[e.verdict] = (acc[e.verdict] || 0) + 1;
        return acc;
    }, {} as Record<ReflectionVerdict, number>);

    return (
        <div style={{
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderTop: '4px solid #115054',
            padding: '14px 18px',
            fontFamily: 'Archivo, sans-serif',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 18, letterSpacing: 2, color: '#0D0D0D',
                    textTransform: 'uppercase',
                }}>
                    Reflection Trace
                </div>
                {isRunning && (
                    <span style={{
                        background: '#B8B800', color: '#0D0D0D',
                        padding: '2px 8px',
                        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: 1,
                        animation: 'rtp-pulse 1.4s ease-in-out infinite',
                    }}>LIVE</span>
                )}
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 11, color: '#525252', fontFamily: "'JetBrains Mono', monospace" }}>
                    {trace.length}{maxIterations ? `/${maxIterations}` : ''} iterations
                    {' · '}
                    ${totalSpend.toFixed(2)}{budgetUsd ? ` / $${budgetUsd.toFixed(0)}` : ''}
                </div>
            </div>

            {/* Verdict tally */}
            {trace.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {(Object.keys(VERDICT_LABEL) as ReflectionVerdict[]).map(v => (
                        verdictCounts[v] ? (
                            <span key={v} style={{
                                padding: '2px 8px',
                                background: VERDICT_COLOR[v],
                                color: '#FFFFFF',
                                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                                letterSpacing: 0.5,
                            }}>
                                {VERDICT_LABEL[v]} {verdictCounts[v]}
                            </span>
                        ) : null
                    ))}
                </div>
            )}

            {/* Trace rows */}
            {trace.length === 0 ? (
                <div style={{ fontSize: 12, color: '#888', padding: '12px 0', fontStyle: 'italic' }}>
                    Waiting for the first iteration to land...
                </div>
            ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {trace.map((entry, idx) => (
                        <div key={`${entry.iteration}-${entry.sub_question_id}-${idx}`} style={{
                            padding: '10px 12px',
                            borderBottom: idx === trace.length - 1 ? 'none' : '1px solid #F0F0F0',
                            background: idx % 2 === 0 ? '#FAFAF7' : '#FFFFFF',
                        }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 10, color: '#525252',
                                    minWidth: 32,
                                }}>#{entry.iteration}</span>
                                <span style={{
                                    background: VERDICT_COLOR[entry.verdict],
                                    color: '#FFFFFF',
                                    padding: '1px 6px',
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    letterSpacing: 0.5,
                                    flexShrink: 0,
                                    height: 14,
                                    lineHeight: '14px',
                                }}>{VERDICT_LABEL[entry.verdict]}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, color: '#0D0D0D', lineHeight: 1.4 }}>
                                        {entry.sub_question_text}
                                    </div>
                                    {entry.new_question_text && (
                                        <div style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: '#0D0D0D',
                                            background: '#E8F6F7',
                                            padding: '4px 8px',
                                            borderLeft: `3px solid ${VERDICT_COLOR.new_question}`,
                                        }}>
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, color: '#115054' }}>SPAWNED {String.fromCharCode(0x2192)}</span>
                                            {' '}{entry.new_question_text}
                                        </div>
                                    )}
                                    {entry.notes && (
                                        <div style={{
                                            marginTop: 4,
                                            fontSize: 10,
                                            color: '#888',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            lineHeight: 1.4,
                                        }}>
                                            {entry.notes.slice(0, 240)}
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: 10,
                                    color: '#888',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    textAlign: 'right',
                                    flexShrink: 0,
                                }}>
                                    <div>{entry.evidence_count} ev</div>
                                    <div>{(entry.ms_elapsed / 1000).toFixed(1)}s</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes rtp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
    );
};

export default ReflectionTracePanel;
