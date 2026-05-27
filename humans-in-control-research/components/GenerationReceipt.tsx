/**
 * GenerationReceipt — Per-deliverable footer that tells users which
 * skill version, constraints, and similar past engagements informed
 * this output.
 *
 * Renders below any generated deliverable. Lightweight — uses cached
 * data from a single proxy call when possible.
 *
 * Created 2026-05-22 as part of Phase 6 (change-promotion surfaces).
 */

import React, { useEffect, useState } from 'react';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface GenerationReceiptProps {
    deliverableType: string;
    deliverableId: string;
    engagementSlug?: string;
    qualityScore?: number | null;
    activeConstraints?: string[];
    skillName?: string;
    priorRunsOfThisType?: number; // computed by caller from session history
    /**
     * 2026-05-22 — Model identifier that produced this output. Surfaces in
     * the receipt as a small chip so users can see whether they got a
     * frontier model (Opus / GPT-5.5) or a cost-tier model (Gemini Flash).
     * Optional — when omitted the chip is hidden.
     */
    modelUsed?: string | null;
}

interface ReceiptData {
    skillVersion: string | null;
    skillLastImproved: string | null;
    similarEngagementsCount: number;
    qualityTrailingAvg: number | null;
}

export const GenerationReceipt: React.FC<GenerationReceiptProps> = ({
    deliverableType,
    deliverableId,
    engagementSlug,
    qualityScore = null,
    activeConstraints = [],
    skillName,
    priorRunsOfThisType,
    modelUsed = null,
}) => {
    const [data, setData] = useState<ReceiptData>({
        skillVersion: null,
        skillLastImproved: null,
        similarEngagementsCount: 0,
        qualityTrailingAvg: null,
    });
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        (async () => {
            const next: ReceiptData = { ...data };
            // Skill version
            if (skillName) {
                try {
                    const resp = await fetch(`${PROXY_BASE}/api/skill/list-versions`);
                    if (resp.ok) {
                        const sdata = await resp.json();
                        const me = (sdata.skills || []).find((s: any) => s.name === skillName);
                        if (me) {
                            next.skillVersion = me.version || '1.0';
                            next.skillLastImproved = me.last_improved || null;
                        }
                    }
                } catch {
                    /* offline */
                }
            }
            // Quality trailing avg (last 5 of same deliverable type)
            try {
                const qResp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/quality-scores.md`);
                if (qResp.ok) {
                    const qdata = await qResp.json();
                    const rows = (qdata.content || '').split('\n');
                    const scores: number[] = [];
                    for (const row of rows) {
                        const m = row.match(/^\|\s*[\d-]+\s*\|\s*([^|]+?)\s*\|\s*(\d+)/);
                        if (m && m[1].trim() === deliverableType) {
                            scores.push(parseInt(m[2], 10));
                        }
                    }
                    const last5 = scores.slice(-5);
                    if (last5.length > 0) {
                        next.qualityTrailingAvg = last5.reduce((a, b) => a + b, 0) / last5.length;
                    }
                }
            } catch {
                /* offline */
            }
            setData(next);
        })();
    }, [deliverableType, skillName, deliverableId]);

    return (
        <div style={styles.container}>
            <div style={styles.summary}>
                <span style={styles.runLabel}>
                    {priorRunsOfThisType !== undefined && priorRunsOfThisType > 0
                        ? `${ordinal(priorRunsOfThisType + 1)} ${deliverableType} generation`
                        : `${deliverableType} generation`}
                </span>
                {data.skillVersion && skillName && (
                    <span style={styles.versionChip}>
                        {skillName} v{data.skillVersion}
                        {data.skillLastImproved && ` (improved ${data.skillLastImproved})`}
                    </span>
                )}
                {modelUsed && (
                    <span
                        style={{
                            ...styles.versionChip,
                            background: modelUsed.includes('flash') ? '#E8F4F8' : '#FFFFFF',
                            color: modelUsed.includes('flash') ? NXT.cyan : NXT.teal,
                        }}
                        title="Model that produced this output"
                    >
                        {modelUsed}
                    </span>
                )}
                {qualityScore !== null && (
                    <span style={styles.qualityChip}>
                        Score: {qualityScore}/100
                        {data.qualityTrailingAvg !== null && (
                            <span style={{ marginLeft: 4, color: '#666' }}>
                                (5-run avg: {data.qualityTrailingAvg.toFixed(0)})
                            </span>
                        )}
                    </span>
                )}
                <button
                    style={styles.expandBtn}
                    onClick={() => setExpanded(e => !e)}
                    aria-expanded={expanded}
                >
                    {expanded ? 'Hide details' : 'What informed this?'}
                </button>
            </div>
            {expanded && (
                <div style={styles.detail}>
                    {activeConstraints.length > 0 ? (
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Constraints applied:</span>
                            <ul style={styles.constraintList}>
                                {activeConstraints.slice(0, 6).map((c, i) => (
                                    <li key={i} style={styles.constraintItem}>{c}</li>
                                ))}
                                {activeConstraints.length > 6 && (
                                    <li style={styles.constraintItem}>... and {activeConstraints.length - 6} more</li>
                                )}
                            </ul>
                        </div>
                    ) : (
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Constraints applied:</span>
                            <span style={styles.detailEmpty}>none active for this scope</span>
                        </div>
                    )}
                    {engagementSlug && (
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>Engagement:</span>
                            <span style={styles.detailValue}>{engagementSlug}</span>
                        </div>
                    )}
                    <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Improvements:</span>
                        <span style={styles.detailValue}>
                            Your feedback on this output feeds the learning engine and may produce
                            constraints, skill patches, or anti-patterns within the next learning pass.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const NXT = {
    teal: '#115054',
    cyan: '#00B7C3',
    chartreuse: '#B8B800',
    border: '#E0E0E0',
    text: '#333333',
    muted: '#666666',
    bg: '#FAFAFA',
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        marginTop: 6,
        padding: '6px 10px',
        background: NXT.bg,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
        fontSize: 11,
        color: NXT.text,
    },
    summary: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    runLabel: {
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: 10,
        letterSpacing: 0.5,
        color: NXT.muted,
    },
    versionChip: {
        padding: '1px 6px',
        background: '#FFFFFF',
        color: NXT.teal,
        border: `1px solid ${NXT.border}`,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
    },
    qualityChip: {
        padding: '1px 6px',
        background: NXT.cyan,
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
    },
    expandBtn: {
        marginLeft: 'auto',
        background: 'transparent',
        border: 'none',
        color: NXT.muted,
        fontSize: 10,
        cursor: 'pointer',
        textDecoration: 'underline',
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
    },
    detail: {
        marginTop: 6,
        paddingTop: 6,
        borderTop: `1px solid ${NXT.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    detailRow: {
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
    },
    detailLabel: {
        fontSize: 10,
        color: NXT.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 600,
        minWidth: 110,
    },
    detailValue: {
        fontSize: 11,
        color: NXT.text,
    },
    detailEmpty: {
        fontSize: 11,
        color: NXT.muted,
        fontStyle: 'italic',
    },
    constraintList: {
        margin: 0,
        paddingLeft: 16,
        listStyle: 'disc',
    },
    constraintItem: {
        fontSize: 10,
        color: NXT.text,
        fontFamily: 'JetBrains Mono, monospace',
        lineHeight: 1.4,
    },
};

export default GenerationReceipt;
