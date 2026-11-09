/**
 * Microphone button for a text box (2026-10-31, agent-stack plan WS-E E1). Click to dictate, click again to stop;
 * the words are appended to the box's text through `onDictated`, and the user sends them the way they send typed
 * text. `onMouseDown` keeps focus in the box, so an edit overlay that commits on blur stays open while dictating.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createDictation, dictationMode, type DictationDeps, type DictationState } from '../services/dictation';

interface Props {
    /** Called once per committed phrase or clip with the spoken words (not yet joined to the box's text). */
    onDictated: (spoken: string) => void;
    /** Test seam: a stubbed recognizer, recorder or transcriber. */
    deps?: DictationDeps;
    size?: number;
    dark?: boolean;
}

const LABEL: Record<DictationState, string> = {
    idle: 'Dictate',
    listening: 'Listening: click to stop',
    recording: 'Recording: click to stop and transcribe',
    transcribing: 'Transcribing',
    error: 'Dictation unavailable',
};

export const DictationButton: React.FC<Props> = ({ onDictated, deps, size = 26, dark = false }) => {
    const [state, setState] = useState<DictationState>('idle');
    const [detail, setDetail] = useState('');
    const [interim, setInterim] = useState('');
    const session = useRef<ReturnType<typeof createDictation> | null>(null);
    const onDictatedRef = useRef(onDictated);
    onDictatedRef.current = onDictated;
    const mode = dictationMode(deps);

    useEffect(() => () => { void session.current?.stop(); }, []);

    if (mode === 'none') return null;
    const active = state === 'listening' || state === 'recording';
    const busy = state === 'transcribing';

    const toggle = async () => {
        if (busy) return;
        if (active) { await session.current?.stop(); return; }
        setDetail('');
        session.current = createDictation({
            onText: t => onDictatedRef.current(t),
            onInterim: setInterim,
            onState: (s, d) => { setState(s); if (d) setDetail(d); },
        }, deps);
        await session.current.start();
    };

    const title = state === 'error' && detail ? `${LABEL.error}: ${detail}` : LABEL[state];
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button type="button" aria-label={title} title={title} aria-pressed={active} data-testid="dictation-button"
                onMouseDown={e => e.preventDefault()}
                onClick={toggle}
                disabled={busy}
                style={{
                    width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${active ? '#CC6644' : (dark ? '#555' : '#D4D4D4')}`,
                    background: active ? '#CC6644' : (dark ? 'transparent' : '#FFFFFF'),
                    color: active ? '#FFFFFF' : (dark ? '#F5F3EA' : '#115054'),
                    cursor: busy ? 'progress' : 'pointer', padding: 0, borderRadius: 2,
                }}>
                <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
            </button>
            {(interim || busy) && (
                <span style={{ fontSize: 10, color: dark ? '#C8C8C0' : '#737373', fontStyle: 'italic', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {busy ? 'Transcribing...' : interim}
                </span>
            )}
        </span>
    );
};

export default DictationButton;
