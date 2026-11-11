/**
 * IA plan Phase 0 (2026-11-11): label capture on every chat artifact. Thumbs up or down plus an optional short
 * reason, recorded as a human label on the whole artifact (slide id WHOLE_ARTIFACT_SLIDE) with every id the
 * judge-agreement join can meet: artifact, run and message. These labels calibrate the judges (plan 6.5): a
 * judge that passes artifacts people reject becomes visible within a week, with numbers.
 *
 * A label is a measurement, never an instruction: nothing here changes a prompt or a rule (WS-5 R7).
 */
import React, { useState } from 'react';
import { recordHumanLabel, WHOLE_ARTIFACT_SLIDE } from '../services/judgeRegistry';

export interface ArtifactLabelBarProps {
    artifactId: string;
    runId?: string;
    messageId?: string;
    /** Test seam. */
    record?: typeof recordHumanLabel;
}

type Choice = 'approved' | 'rejected' | null;

const btn = (active: boolean, tone: 'up' | 'down'): React.CSSProperties => ({
    fontSize: 11, lineHeight: 1, padding: '3px 7px', cursor: 'pointer', borderRadius: 2,
    border: `1px solid ${active ? (tone === 'up' ? '#115054' : '#CC6644') : '#D4D4D4'}`,
    background: active ? (tone === 'up' ? '#E8F6F7' : '#FBEDE8') : '#FFF',
    color: active ? (tone === 'up' ? '#115054' : '#CC6644') : '#666',
});

export const ArtifactLabelBar: React.FC<ArtifactLabelBarProps> = ({ artifactId, runId, messageId, record = recordHumanLabel }) => {
    const [choice, setChoice] = useState<Choice>(null);
    const [reason, setReason] = useState('');
    const [saved, setSaved] = useState<string>('');

    const send = (label: 'approved' | 'rejected', detail?: string) => {
        record({ artifact_id: artifactId, run_id: runId, message_id: messageId, slide_id: WHOLE_ARTIFACT_SLIDE, label, source: 'thumbs', detail });
        setSaved(detail ? 'Saved with your reason' : 'Saved');
    };

    const pick = (label: 'approved' | 'rejected') => {
        setChoice(label);
        setReason('');
        send(label);
    };

    return (
        <div data-testid="artifact-label-bar" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: '#888', letterSpacing: 0.5 }}>Was this right?</span>
            <button type="button" aria-label="Mark this artifact as right" aria-pressed={choice === 'approved'}
                    style={btn(choice === 'approved', 'up')} onClick={() => pick('approved')}>&#128077;</button>
            <button type="button" aria-label="Mark this artifact as wrong" aria-pressed={choice === 'rejected'}
                    style={btn(choice === 'rejected', 'down')} onClick={() => pick('rejected')}>&#128078;</button>
            {choice && (
                <form style={{ display: 'flex', gap: 4, alignItems: 'center' }}
                      onSubmit={e => { e.preventDefault(); if (reason.trim()) send(choice, reason.trim()); }}>
                    <input aria-label="Reason (optional)" value={reason} maxLength={300}
                           placeholder={choice === 'rejected' ? 'What was wrong? (optional)' : 'What worked? (optional)'}
                           onChange={e => setReason(e.target.value)}
                           style={{ fontSize: 10, padding: '3px 6px', border: '1px solid #D4D4D4', borderRadius: 2, width: 220 }} />
                    <button type="submit" disabled={!reason.trim()} style={{ ...btn(false, 'up'), fontSize: 9, opacity: reason.trim() ? 1 : 0.5 }}>Add reason</button>
                </form>
            )}
            {saved && <span role="status" style={{ fontSize: 9, color: '#115054' }}>{saved}</span>}
        </div>
    );
};

export default ArtifactLabelBar;
