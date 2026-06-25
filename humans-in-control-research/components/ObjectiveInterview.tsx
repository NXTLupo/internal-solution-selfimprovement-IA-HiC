import React, { useCallback, useEffect, useRef, useState } from 'react';
import { interviewTurn, type InterviewExchange } from '../services/objectiveInterview';

// 2026-06-25 - Interview-Me-at-intake (P1). Optional inline panel beside the
// Research Goal field. A model asks a few adaptive scoping questions, then
// synthesizes a precise Research Objective the user accepts/edits. Mirrors the
// PromptEnhancer aesthetic (NXT teal accent, Archivo) so it feels native.

interface ObjectiveInterviewProps {
    seed: string;
    onAccept: (objective: string) => void;
    onClose: () => void;
    accentColor?: string;
}

type Phase = 'loading' | 'asking' | 'review' | 'error';

export const ObjectiveInterview: React.FC<ObjectiveInterviewProps> = ({ seed, onAccept, onClose, accentColor = '#00B7C3' }) => {
    const [phase, setPhase] = useState<Phase>('loading');
    const [history, setHistory] = useState<InterviewExchange[]>([]);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [objective, setObjective] = useState('');
    const [rationale, setRationale] = useState('');
    const [error, setError] = useState('');
    const startedRef = useRef(false);

    const runTurn = useCallback(async (hist: InterviewExchange[], force?: boolean) => {
        setPhase('loading');
        setError('');
        try {
            const r = await interviewTurn({ seed, history: hist, forceSynthesize: force });
            if (r.kind === 'objective') {
                setObjective(r.objective);
                setRationale(r.rationale);
                setPhase('review');
            } else {
                setQuestion(r.question);
                setAnswer('');
                setPhase('asking');
            }
        } catch (e: any) {
            setError(String(e?.message || e));
            setPhase('error');
        }
    }, [seed]);

    // First question on mount (guard against React StrictMode double-invoke).
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void runTurn([]);
    }, [runTurn]);

    const submitAnswer = useCallback((skipped: boolean) => {
        const next = [...history, { q: question, a: skipped ? '' : answer.trim() }];
        setHistory(next);
        void runTurn(next);
    }, [history, question, answer, runTurn]);

    const buildNow = useCallback(() => {
        // Include any in-progress answer before forcing synthesis.
        const next = answer.trim() ? [...history, { q: question, a: answer.trim() }] : history;
        setHistory(next);
        void runTurn(next, true);
    }, [history, question, answer, runTurn]);

    const startOver = useCallback(() => {
        setHistory([]);
        void runTurn([]);
    }, [runTurn]);

    const box: React.CSSProperties = {
        border: `1px solid ${accentColor}`, padding: 12, marginTop: 8, background: '#FAFCFD',
        fontFamily: "'Archivo', sans-serif",
    };
    const headerRow: React.CSSProperties = {
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
        fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: accentColor, fontWeight: 700,
    };
    const closeBtn = (
        <button type="button" onClick={onClose} aria-label="Close interview"
            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
    );
    const btn = (label: string, onClick: () => void, primary?: boolean, disabled?: boolean): React.ReactElement => (
        <button type="button" onClick={onClick} disabled={disabled}
            style={{
                padding: primary ? '4px 12px' : '4px 10px',
                background: disabled ? '#E8E8E8' : (primary ? accentColor : 'transparent'),
                color: disabled ? '#999' : (primary ? '#FFFFFF' : '#666'),
                border: `1px solid ${disabled ? '#DDD' : (primary ? accentColor : '#CCC')}`,
                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'Archivo', sans-serif",
            }}>{label}</button>
    );

    if (phase === 'loading') {
        return (
            <div style={box}>
                <div style={headerRow}><span>Interview · Gemini Flash</span>{closeBtn}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: accentColor, animation: 'pulse 1.4s ease-in-out infinite' }} />
                    {history.length === 0 ? 'Preparing your first question...' : 'Thinking about the next question...'}
                </div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div style={{ ...box, borderColor: '#CC6644', background: '#FFF6F2' }}>
                <div style={{ ...headerRow, color: '#A0421F' }}><span>Interview unavailable</span>{closeBtn}</div>
                <div style={{ fontSize: 11, color: '#7A3216', marginBottom: 8 }}>{error.slice(0, 240)}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {btn('Close', onClose)}
                    {btn('Retry', () => void runTurn(history), true)}
                </div>
            </div>
        );
    }

    if (phase === 'review') {
        return (
            <div style={box}>
                <div style={headerRow}><span>Refined objective · {history.length} question{history.length === 1 ? '' : 's'}</span>{closeBtn}</div>
                <textarea
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    rows={Math.min(8, Math.max(3, Math.ceil(objective.length / 90)))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E0E0E0', fontFamily: "'Archivo', sans-serif", fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }}
                />
                {rationale && <div style={{ fontSize: 10, color: '#666', marginTop: 6, fontStyle: 'italic' }}>{rationale}</div>}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', marginTop: 8 }}>
                    {btn('Start over', startOver)}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {btn('Cancel', onClose)}
                        {btn('Use this objective', () => onAccept(objective.trim()), true, !objective.trim())}
                    </div>
                </div>
            </div>
        );
    }

    // phase === 'asking'
    return (
        <div style={box}>
            <div style={headerRow}><span>Interview · question {history.length + 1}</span>{closeBtn}</div>
            <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{question}</div>
            <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && answer.trim()) submitAnswer(false); }}
                rows={2}
                placeholder="Your answer (Cmd/Ctrl+Enter to send)"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E0E0E0', fontFamily: "'Archivo', sans-serif", fontSize: 12, lineHeight: 1.5, resize: 'vertical', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', marginTop: 8 }}>
                {btn('Skip', () => submitAnswer(true))}
                <div style={{ display: 'flex', gap: 6 }}>
                    {btn('Build it now', buildNow)}
                    {btn('Next', () => submitAnswer(false), true, !answer.trim())}
                </div>
            </div>
        </div>
    );
};
