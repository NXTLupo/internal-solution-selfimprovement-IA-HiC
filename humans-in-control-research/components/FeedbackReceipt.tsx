/**
 * FeedbackReceipt — Inline confirmation after the user submits feedback.
 *
 * Renders one of three modes:
 *   - "saved": text feedback was persisted but no regeneration ran
 *   - "applied": text feedback ran regenerateWithFeedback() and produced a diff
 *   - "voted": only a vote/stars signal was captured
 *
 * Created 2026-05-22 as part of the self-improvement loop, Phase 2.
 */

import React from 'react';
import type { TextDiff } from '../services/feedbackRegeneration';

export interface FeedbackReceiptProps {
    mode: 'saved' | 'applied' | 'voted';
    deliverableType: string;
    priorSignalCount: number;
    promotionThreshold?: number; // default 3
    diff?: TextDiff | null;
    instruction?: string | null;
    qualityBefore?: number | null;
    qualityAfter?: number | null;
    onKeepNew?: () => void;
    onRevert?: () => void;
}

const NXT = {
    chartreuse: '#B8B800',
    cyan: '#00B7C3',
    rust: '#CC6644',
    teal: '#115054',
    bg: '#F5F5F0',
    border: '#E0E0E0',
    text: '#333333',
    muted: '#666666',
    success: '#0CCE6B',
};

export const FeedbackReceipt: React.FC<FeedbackReceiptProps> = ({
    mode,
    deliverableType,
    priorSignalCount,
    promotionThreshold = 3,
    diff,
    instruction,
    qualityBefore,
    qualityAfter,
    onKeepNew,
    onRevert,
}) => {
    const remainingToPromotion = Math.max(0, promotionThreshold - priorSignalCount);

    if (mode === 'voted') {
        return (
            <div style={styles.container}>
                <div style={styles.title}>Vote logged</div>
                <div style={styles.body}>
                    Captured for "{deliverableType}" pattern tracking. The learning engine reads this signal weekly.
                </div>
            </div>
        );
    }

    if (mode === 'saved') {
        return (
            <div style={styles.container}>
                <div style={styles.title}>Saved for future generations</div>
                <div style={styles.body}>
                    {priorSignalCount >= promotionThreshold ? (
                        <>
                            This signal ({priorSignalCount} of this kind in the last 14 days) crosses the promotion threshold. The learning engine will route it to a constraint, skill patch, or anti-pattern entry in the next pass.
                        </>
                    ) : (
                        <>
                            This is signal {priorSignalCount} of this kind in the last 14 days. {remainingToPromotion} more matching signal{remainingToPromotion === 1 ? '' : 's'} promotes it to an active improvement.
                        </>
                    )}
                </div>
            </div>
        );
    }

    // mode === 'applied'
    return (
        <div style={styles.container}>
            <div style={styles.title}>Applied now</div>
            {instruction && (
                <div style={styles.row}>
                    <span style={styles.fieldLabel}>Instruction:</span>
                    <span style={styles.instruction}>{instruction}</span>
                </div>
            )}
            {diff && (
                <div style={styles.row}>
                    <span style={styles.fieldLabel}>Change:</span>
                    <span style={styles.diffLine}>{diff.summary}</span>
                </div>
            )}
            {(qualityBefore != null && qualityAfter != null) && (
                <div style={styles.row}>
                    <span style={styles.fieldLabel}>Quality:</span>
                    <span style={styles.qualityLine}>
                        {qualityBefore} {'→'} {qualityAfter}
                        {qualityAfter > qualityBefore && <span style={styles.deltaUp}> (+{qualityAfter - qualityBefore})</span>}
                        {qualityAfter < qualityBefore && <span style={styles.deltaDown}> ({qualityAfter - qualityBefore})</span>}
                    </span>
                </div>
            )}
            {(onKeepNew || onRevert) && (
                <div style={styles.actionRow}>
                    {onKeepNew && (
                        <button style={styles.keepBtn} onClick={onKeepNew}>
                            Keep new
                        </button>
                    )}
                    {onRevert && (
                        <button style={styles.revertBtn} onClick={onRevert}>
                            Revert
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        marginTop: 8,
        padding: '10px 12px',
        background: NXT.bg,
        border: `1px solid ${NXT.border}`,
        borderRadius: 3,
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
        fontSize: 12,
        color: NXT.text,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    title: {
        fontFamily: 'Bebas Neue, Oswald, sans-serif',
        fontSize: 14,
        color: NXT.teal,
        letterSpacing: 0.8,
    },
    body: {
        fontSize: 12,
        lineHeight: 1.5,
        color: NXT.text,
    },
    row: {
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
    },
    fieldLabel: {
        fontSize: 10,
        color: NXT.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 600,
        minWidth: 76,
    },
    instruction: {
        fontSize: 12,
        color: NXT.text,
        fontFamily: 'JetBrains Mono, monospace',
    },
    diffLine: {
        fontSize: 12,
        color: NXT.text,
    },
    qualityLine: {
        fontSize: 12,
        color: NXT.text,
        fontFamily: 'JetBrains Mono, monospace',
    },
    deltaUp: {
        color: NXT.success,
        fontWeight: 600,
        marginLeft: 4,
    },
    deltaDown: {
        color: NXT.rust,
        fontWeight: 600,
        marginLeft: 4,
    },
    actionRow: {
        display: 'flex',
        gap: 6,
        marginTop: 4,
    },
    keepBtn: {
        padding: '4px 12px',
        fontSize: 12,
        background: NXT.success,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 2,
        cursor: 'pointer',
        fontWeight: 600,
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
    },
    revertBtn: {
        padding: '4px 12px',
        fontSize: 12,
        background: '#FFFFFF',
        color: NXT.muted,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        cursor: 'pointer',
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
    },
};

export default FeedbackReceipt;
