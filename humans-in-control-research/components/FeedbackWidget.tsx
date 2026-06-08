/**
 * FeedbackWidget - User feedback capture for chat replies and hashtag deliverables.
 *
 * Loop 4 input surface. Writes events to the proxy /api/feedback/append
 * endpoint. Triggers instant regeneration when the user clicks "Apply now".
 *
 * Designed to be embedded under any assistant message bubble in the corpus
 * chat, the design desk chat, or per-section under a rendered hashtag
 * deliverable.
 *
 * Created 2026-05-22 as part of the self-improvement loop, Phase 2.
 */

import React, { useEffect, useState } from 'react';
import {
    submitFeedback,
    countPriorSignals,
    triggerLearningPassAfterFeedback,
    type FeedbackEvent,
    type LearningEvidence,
} from '../services/feedbackService';

export interface FeedbackWidgetProps {
    engagement_slug: string;
    deliverable_id: string;
    deliverable_type: string;
    section_scope?: string | null;
    skill_version_active?: string | null;
    constraints_active?: string[];
    /**
     * When the user clicks "Apply now" and provides text feedback, this
     * callback is invoked with the feedback details so the parent can run
     * regenerateSection() against the targeted section. The widget itself
     * does not own regeneration logic - that lives in the chat/deliverable
     * renderer with access to the original generation context.
     */
    onApplyNow?: (input: {
        feedbackId: string;
        text: string;
        sectionScope: string | null;
    }) => Promise<void>;
    /**
     * Compact mode renders a single-line summary with expand-on-click. Used
     * inline in tight chat bubbles. Default is the full expanded layout.
     */
    compact?: boolean;
}

type WidgetStage = 'idle' | 'expanded' | 'submitting' | 'submitted' | 'applying' | 'error';

const NXT = {
    chartreuse: '#B8B800',
    cyan: '#00B7C3',
    rust: '#CC6644',
    teal: '#115054',
    bg: '#FAFAFA',
    border: '#E0E0E0',
    text: '#333333',
    muted: '#999999',
    success: '#0CCE6B',
};

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
    engagement_slug,
    deliverable_id,
    deliverable_type,
    section_scope = null,
    skill_version_active = null,
    constraints_active = [],
    onApplyNow,
    compact = false,
}) => {
    const [stage, setStage] = useState<WidgetStage>(compact ? 'idle' : 'expanded');
    const [vote, setVote] = useState<'up' | 'down' | null>(null);
    const [stars, setStars] = useState<number | null>(null);
    const [text, setText] = useState('');
    const [priorCount, setPriorCount] = useState<number>(0);
    const [lastResult, setLastResult] = useState<{ ok: boolean; id?: string; error?: string } | null>(null);
    // 2026-05-23 - Visible proof that feedback drove a skill patch / chunk
    // promotion / constraint. Populated when triggerLearningPassAfterFeedback
    // returns from the background pass that runs after every submit.
    const [evidence, setEvidence] = useState<LearningEvidence | null>(null);
    const [evidenceRunning, setEvidenceRunning] = useState<boolean>(false);

    useEffect(() => {
        // Fetch the prior-signal count for the "N prior signals applied" chip
        countPriorSignals(deliverable_type, section_scope).then(setPriorCount).catch(() => {});
    }, [deliverable_type, section_scope]);

    const submit = async (
        signal_type: FeedbackEvent['signal_type'],
        extra: Partial<Pick<FeedbackEvent, 'vote_value' | 'stars_value' | 'text_value' | 'applied_immediately'>>,
    ): Promise<{ ok: boolean; id: string | null }> => {
        setStage('submitting');
        const result = await submitFeedback({
            engagement_slug,
            deliverable_id,
            deliverable_type,
            section_scope,
            signal_type,
            ...extra,
            skill_version_active,
            constraints_active,
        });
        if (result.ok) {
            setStage('submitted');
            setLastResult({ ok: true, id: result.id || undefined });
            setPriorCount(c => c + 1);
            // 2026-05-23 - Trigger the learning pass IMMEDIATELY after every
            // feedback submit. This closes the loop that was previously
            // dev-console-only. Result is rendered as visible evidence so the
            // user can see exactly which skill/constraint/chunk-config got
            // updated by their feedback.
            setEvidenceRunning(true);
            triggerLearningPassAfterFeedback({
                deliverable_type,
                section_scope,
            }).then(ev => {
                setEvidence(ev);
                setEvidenceRunning(false);
            }).catch(err => {
                console.warn('[FeedbackWidget] learning pass failed:', err);
                setEvidenceRunning(false);
            });
        } else {
            setStage('error');
            setLastResult({ ok: false, error: result.error });
        }
        return { ok: result.ok, id: result.id };
    };

    const handleVote = async (v: 'up' | 'down') => {
        setVote(v);
        await submit('vote', { vote_value: v });
        // Show the star+text expanders after the initial vote
        setStage('expanded');
    };

    const handleStars = async (n: 1 | 2 | 3 | 4 | 5) => {
        setStars(n);
        await submit('stars', { stars_value: n });
    };

    const handleSaveForNextTime = async () => {
        if (!text.trim()) return;
        await submit('text', { text_value: text, applied_immediately: false });
        setText('');
    };

    const handleApplyNow = async () => {
        if (!text.trim()) return;
        setStage('applying');
        const submitResult = await submit('text', { text_value: text, applied_immediately: true });
        if (onApplyNow && submitResult.id) {
            try {
                await onApplyNow({ feedbackId: submitResult.id, text, sectionScope: section_scope });
            } catch (err) {
                console.warn('[FeedbackWidget] onApplyNow handler threw:', err);
            }
        }
        setText('');
        setStage('submitted');
    };

    if (compact && stage === 'idle') {
        return (
            <div style={styles.compactBar}>
                <button
                    style={styles.compactBtn}
                    onClick={() => setStage('expanded')}
                    title="Provide feedback on this output"
                >
                    Improve this
                </button>
                {priorCount > 0 && (
                    <span style={styles.priorChip}>
                        {priorCount} prior signal{priorCount === 1 ? '' : 's'}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div style={styles.container} data-feedback-widget="true">
            <div style={styles.row}>
                <span style={styles.label}>Was this helpful?</span>
                <button
                    style={{ ...styles.voteBtn, ...(vote === 'up' ? styles.voteBtnActive : {}) }}
                    onClick={() => handleVote('up')}
                    aria-label="Helpful"
                    disabled={stage === 'submitting'}
                >
                    Yes
                </button>
                <button
                    style={{ ...styles.voteBtn, ...(vote === 'down' ? styles.voteBtnActiveDown : {}) }}
                    onClick={() => handleVote('down')}
                    aria-label="Not helpful"
                    disabled={stage === 'submitting'}
                >
                    No
                </button>
                {priorCount > 0 && (
                    <span style={styles.priorChip} title={`Prior feedback for ${deliverable_type}${section_scope ? ` / ${section_scope}` : ''}`}>
                        {priorCount} prior signal{priorCount === 1 ? '' : 's'} applied
                    </span>
                )}
            </div>

            <div style={styles.row}>
                <span style={styles.label}>Rate:</span>
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        style={{ ...styles.starBtn, ...(stars && stars >= n ? styles.starBtnActive : {}) }}
                        onClick={() => handleStars(n as 1 | 2 | 3 | 4 | 5)}
                        aria-label={`Rate ${n} of 5`}
                        disabled={stage === 'submitting'}
                    >
                        {n}
                    </button>
                ))}
                {stars !== null && <span style={styles.starsLabel}>{stars}/5</span>}
            </div>

            <div style={styles.textBlock}>
                <textarea
                    style={styles.textArea}
                    placeholder="Tell us what to improve - e.g., 'persona quotes feel generic', 'horizons too vague', 'evidence too sparse in section 3'"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={2}
                    disabled={stage === 'submitting' || stage === 'applying'}
                />
                <div style={styles.actionRow}>
                    <button
                        style={{ ...styles.applyBtn, ...(text.trim() && onApplyNow ? {} : styles.applyBtnDisabled) }}
                        onClick={handleApplyNow}
                        disabled={!text.trim() || !onApplyNow || stage === 'applying' || stage === 'submitting'}
                        title={onApplyNow ? "Regenerate the targeted section now with this feedback" : "Apply Now unavailable here - Save for Next Time persists the signal."}
                    >
                        {stage === 'applying' ? 'Applying...' : 'Apply now'}
                    </button>
                    <button
                        style={{ ...styles.saveBtn, ...(text.trim() ? {} : styles.saveBtnDisabled) }}
                        onClick={handleSaveForNextTime}
                        disabled={!text.trim() || stage === 'submitting' || stage === 'applying'}
                        title="Persist this feedback to inform future generations - no immediate regeneration."
                    >
                        Save for next time
                    </button>
                </div>
            </div>

            {stage === 'submitted' && lastResult?.ok && (
                <div style={styles.toastOk}>
                    Got it. Your signal was logged{lastResult.id ? ` (${lastResult.id.slice(-8)})` : ''}.
                </div>
            )}
            {stage === 'error' && lastResult?.error && (
                <div style={styles.toastErr}>
                    Could not save feedback: {lastResult.error.slice(0, 120)}
                </div>
            )}
            {evidenceRunning && (
                <div style={styles.evidencePending}>
                    Running learning pass... clustering signals, routing to skill / constraint / chunk-config...
                </div>
            )}
            {evidence && !evidenceRunning && (
                <div style={styles.evidenceBox} data-testid="learning-evidence">
                    <div style={styles.evidenceTitle}>
                        SKILL LOOP - what your signal actually changed
                    </div>
                    {evidence.anyChange ? (
                        <div style={styles.evidenceList}>
                            {evidence.skillsPatched.length > 0 && (
                                <div style={styles.evidenceRow}>
                                    <span style={styles.evidenceChip}>SKILL PATCHED</span>
                                    <span style={styles.evidenceText}>
                                        {evidence.skillsPatched.map(s => `${s.name} (from ${s.sourceSignalCount} signals)`).join(', ')}
                                    </span>
                                    <a
                                        style={styles.evidenceLink}
                                        href={`http://127.0.0.1:5012/api/skill/list-versions`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Open the live skill version manifest in a new tab - verify the version bump yourself."
                                    >
                                        verify
                                    </a>
                                </div>
                            )}
                            {evidence.chunkConfigsPromoted.length > 0 && (
                                <div style={styles.evidenceRow}>
                                    <span style={styles.evidenceChip}>CHUNK PLAN PROMOTED</span>
                                    <span style={styles.evidenceText}>
                                        {evidence.chunkConfigsPromoted.map(c => `${c.artifactType} (+chunks, +budget, durable)`).join(', ')}
                                    </span>
                                    <a
                                        style={styles.evidenceLink}
                                        href={`http://127.0.0.1:5012/api/wiki/read/synthesis/chunk-config.json`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Open the persisted chunk-config in a new tab."
                                    >
                                        verify
                                    </a>
                                </div>
                            )}
                            {evidence.constraintsAdded > 0 && (
                                <div style={styles.evidenceRow}>
                                    <span style={styles.evidenceChip}>CONSTRAINT ADDED</span>
                                    <span style={styles.evidenceText}>
                                        {evidence.constraintsAdded} new constraint{evidence.constraintsAdded === 1 ? '' : 's'} now active on every future generation
                                    </span>
                                    <a
                                        style={styles.evidenceLink}
                                        href={`http://127.0.0.1:5012/api/wiki/read/synthesis/learned-constraints.md`}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Open learned-constraints.md."
                                    >
                                        verify
                                    </a>
                                </div>
                            )}
                            {evidence.antiPatternsAdded > 0 && (
                                <div style={styles.evidenceRow}>
                                    <span style={styles.evidenceChip}>ANTI-PATTERN ADDED</span>
                                    <span style={styles.evidenceText}>
                                        {evidence.antiPatternsAdded} new anti-pattern entr{evidence.antiPatternsAdded === 1 ? 'y' : 'ies'}
                                    </span>
                                </div>
                            )}
                            {evidence.exemplarsAdded > 0 && (
                                <div style={styles.evidenceRow}>
                                    <span style={styles.evidenceChip}>EXEMPLAR ADDED</span>
                                    <span style={styles.evidenceText}>
                                        {evidence.exemplarsAdded} positive exemplar recorded
                                    </span>
                                </div>
                            )}
                            {evidence.frameworkUpdatesQueued > 0 && (
                                <div style={styles.evidenceRow}>
                                    <span style={styles.evidenceChip}>FRAMEWORK UPDATE QUEUED</span>
                                    <span style={styles.evidenceText}>
                                        {evidence.frameworkUpdatesQueued} pending review (structural change - won't auto-apply)
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={styles.evidencePending}>
                            No skill or constraint changed THIS time. Your signal was clustered but not yet at the {evidence.progressToPromotion.threshold}-signal promotion threshold ({evidence.progressToPromotion.current}/{evidence.progressToPromotion.threshold} matching signals for this section).
                            {' '}One change-floor signal is enough to trigger chunk-plan bumps on the NEXT generation of this deliverable type.
                        </div>
                    )}
                    {evidence.routedClusters.length > 0 && (
                        <details style={styles.evidenceDetails}>
                            <summary style={styles.evidenceDetailsSummary}>
                                Pass detail ({evidence.routedClusters.length} cluster{evidence.routedClusters.length === 1 ? '' : 's'} examined in {evidence.durationMs}ms)
                            </summary>
                            <table style={styles.evidenceTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.evidenceTh}>Deliverable</th>
                                        <th style={styles.evidenceTh}>Section</th>
                                        <th style={styles.evidenceTh}>Routed to</th>
                                        <th style={styles.evidenceTh}>Confidence</th>
                                        <th style={styles.evidenceTh}>Applied</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {evidence.routedClusters.map((c, i) => (
                                        <tr key={i}>
                                            <td style={styles.evidenceTd}>{c.deliverableType}</td>
                                            <td style={styles.evidenceTd}>{c.section}</td>
                                            <td style={styles.evidenceTd}>{c.target}</td>
                                            <td style={styles.evidenceTd}>{(c.confidence * 100).toFixed(0)}%</td>
                                            <td style={styles.evidenceTd}>{c.applied ? 'YES' : 'queued'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};

// --- INLINE STYLES (kept in this file so the widget is self-contained) ---

const styles: Record<string, React.CSSProperties> = {
    container: {
        marginTop: 8,
        padding: '8px 10px',
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
    compactBar: {
        marginTop: 6,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
    },
    compactBtn: {
        fontSize: 11,
        padding: '2px 8px',
        background: 'transparent',
        color: NXT.muted,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        cursor: 'pointer',
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
    },
    row: {
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    label: {
        fontSize: 11,
        color: NXT.muted,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    voteBtn: {
        padding: '3px 10px',
        fontSize: 12,
        background: '#FFFFFF',
        color: NXT.text,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        cursor: 'pointer',
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
    },
    voteBtnActive: {
        background: NXT.success,
        color: '#FFFFFF',
        borderColor: NXT.success,
    },
    voteBtnActiveDown: {
        background: NXT.rust,
        color: '#FFFFFF',
        borderColor: NXT.rust,
    },
    starBtn: {
        width: 22,
        height: 22,
        padding: 0,
        fontSize: 11,
        background: '#FFFFFF',
        color: NXT.text,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace',
    },
    starBtnActive: {
        background: NXT.chartreuse,
        color: '#0D0D0D',
        borderColor: NXT.chartreuse,
        fontWeight: 700,
    },
    starsLabel: {
        fontSize: 11,
        color: NXT.muted,
        fontFamily: 'JetBrains Mono, monospace',
    },
    priorChip: {
        marginLeft: 'auto',
        fontSize: 10,
        color: NXT.muted,
        padding: '1px 6px',
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        fontFamily: 'JetBrains Mono, monospace',
    },
    textBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    textArea: {
        width: '100%',
        boxSizing: 'border-box',
        padding: 6,
        fontSize: 12,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
        color: NXT.text,
        resize: 'vertical',
        background: '#FFFFFF',
    },
    actionRow: {
        display: 'flex',
        gap: 6,
        justifyContent: 'flex-end',
    },
    applyBtn: {
        padding: '4px 12px',
        fontSize: 12,
        background: NXT.cyan,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 2,
        cursor: 'pointer',
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
        fontWeight: 600,
    },
    applyBtnDisabled: {
        background: NXT.muted,
        cursor: 'not-allowed',
    },
    saveBtn: {
        padding: '4px 12px',
        fontSize: 12,
        background: '#FFFFFF',
        color: NXT.text,
        border: `1px solid ${NXT.border}`,
        borderRadius: 2,
        cursor: 'pointer',
        fontFamily: 'Archivo, Helvetica, Arial, sans-serif',
    },
    saveBtnDisabled: {
        color: NXT.muted,
        cursor: 'not-allowed',
    },
    toastOk: {
        fontSize: 11,
        color: NXT.success,
        padding: '4px 6px',
        background: 'rgba(12, 206, 107, 0.08)',
        borderRadius: 2,
    },
    toastErr: {
        fontSize: 11,
        color: NXT.rust,
        padding: '4px 6px',
        background: 'rgba(204, 102, 68, 0.08)',
        borderRadius: 2,
    },
    evidencePending: {
        fontSize: 11,
        color: NXT.muted,
        padding: '4px 6px',
        background: 'rgba(0, 183, 195, 0.05)',
        borderRadius: 2,
        fontFamily: 'JetBrains Mono, monospace',
        marginTop: 6,
    },
    evidenceBox: {
        marginTop: 8,
        padding: '8px 10px',
        background: '#FFFFFF',
        border: `1px solid ${NXT.border}`,
        borderLeft: `3px solid ${NXT.chartreuse}`,
        borderRadius: 2,
        fontSize: 12,
        color: NXT.text,
    },
    evidenceTitle: {
        fontFamily: 'Bebas Neue, Oswald, sans-serif',
        fontSize: 13,
        color: NXT.teal,
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    evidenceList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    evidenceRow: {
        display: 'flex',
        gap: 6,
        alignItems: 'baseline',
        flexWrap: 'wrap',
    },
    evidenceChip: {
        background: NXT.chartreuse,
        color: '#0D0D0D',
        padding: '1px 8px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        fontFamily: 'JetBrains Mono, monospace',
    },
    evidenceText: {
        fontSize: 11,
        color: NXT.text,
        flex: 1,
        minWidth: 0,
    },
    evidenceLink: {
        fontSize: 10,
        color: NXT.cyan,
        textDecoration: 'underline',
        cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: 0.5,
    },
    evidenceDetails: {
        marginTop: 6,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        color: NXT.muted,
    },
    evidenceDetailsSummary: {
        cursor: 'pointer',
        fontSize: 10,
        color: NXT.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    evidenceTable: {
        marginTop: 4,
        borderCollapse: 'collapse',
        fontSize: 10,
        width: '100%',
    },
    evidenceTh: {
        textAlign: 'left',
        padding: '2px 4px',
        borderBottom: `1px solid ${NXT.border}`,
        color: NXT.muted,
        fontWeight: 600,
    },
    evidenceTd: {
        padding: '2px 4px',
        borderBottom: `1px solid ${NXT.border}`,
        color: NXT.text,
    },
};

export default FeedbackWidget;
