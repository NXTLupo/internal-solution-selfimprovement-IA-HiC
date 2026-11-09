import React, { useEffect, useRef, useState, startTransition } from 'react';

/**
 * The analyst chat composer (2026-10-04, owner report: typing lagged so badly the text field was unusable). Every
 * keystroke used to set the panel's `input` state and re-render the whole 8,700-line panel: every message, every
 * verification ledger and 100+ slide cards. The textarea now owns its value; the panel's copy is updated as a
 * low-priority transition (React drops stale renders while the user types), and external writes (chips, enhance,
 * clear after send) flow back in through `value`. Send reads the live DOM value, never a stale state copy.
 */
export const ComposerTextarea: React.FC<{
    inputRef: React.RefObject<HTMLTextAreaElement>;
    value: string;
    /** Bumped by every external write; the composer then adopts `value` (even when it equals a stale copy). */
    sync: number;
    onValueChange: (v: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}> = React.memo(({ inputRef, value, sync, onValueChange, onKeyDown }) => {
    const [local, setLocal] = useState(value);
    const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => { if (sync > 0) { if (pushTimer.current) clearTimeout(pushTimer.current); setLocal(value); } }, [sync]);
    useEffect(() => () => { if (pushTimer.current) clearTimeout(pushTimer.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <textarea ref={inputRef} value={local}
            onChange={e => {
                const v = e.target.value;
                setLocal(v);
                if (pushTimer.current) clearTimeout(pushTimer.current);
                pushTimer.current = setTimeout(() => startTransition(() => onValueChange(v)), v ? 250 : 0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about your research data... Try #help for all hashtag directives."
            rows={4} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', fontSize: 12, fontFamily: "'Archivo', sans-serif", resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box', minHeight: 88 }} />
    );
});
ComposerTextarea.displayName = 'ComposerTextarea';
