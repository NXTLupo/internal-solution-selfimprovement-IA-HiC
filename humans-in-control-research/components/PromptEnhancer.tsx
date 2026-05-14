import React, { useCallback, useState } from 'react';
import { enhancePrompt, type EnhancePromptResult } from '../services/promptEnhancer';

type EnhancerState = 'idle' | 'loading' | 'preview' | 'error';

interface UseEnhancerArgs {
    input: string;
    setInput: (val: string) => void;
    surface: 'analyst' | 'design';
    /** Optional context snippet — research goal, attachments summary, source list. Kept short on the wire. */
    getContext?: () => string;
    /** If set, biases the enhancer rubric toward a specific downstream model. */
    targetModel?: 'gemini' | 'opus' | 'gpt' | 'auto';
}

export interface PromptEnhancerHandle {
    state: EnhancerState;
    preview: string;
    rationale: string;
    error: string;
    elapsedMs: number;
    canEnhance: boolean;
    enhance: () => Promise<void>;
    accept: () => void;
    dismiss: () => void;
    editPreview: (val: string) => void;
}

export function usePromptEnhancer({ input, setInput, surface, getContext, targetModel }: UseEnhancerArgs): PromptEnhancerHandle {
    const [state, setState] = useState<EnhancerState>('idle');
    const [preview, setPreview] = useState('');
    const [rationale, setRationale] = useState('');
    const [error, setError] = useState('');
    const [elapsedMs, setElapsedMs] = useState(0);

    const canEnhance = state !== 'loading' && input.trim().length > 0;

    const enhance = useCallback(async () => {
        const raw = input.trim();
        if (!raw) return;
        setState('loading');
        setError('');
        try {
            const ctx = getContext?.() || '';
            const result: EnhancePromptResult = await enhancePrompt(raw, {
                surface,
                targetModel: targetModel || 'auto',
                context: ctx,
            });
            setPreview(result.enhanced);
            setRationale(result.rationale || '');
            setElapsedMs(result.elapsed_ms);
            setState('preview');
        } catch (e: any) {
            setError(String(e?.message || e));
            setState('error');
        }
    }, [input, surface, targetModel, getContext]);

    const accept = useCallback(() => {
        setInput(preview);
        setState('idle');
        setPreview('');
        setRationale('');
        setError('');
    }, [preview, setInput]);

    const dismiss = useCallback(() => {
        setState('idle');
        setPreview('');
        setRationale('');
        setError('');
    }, []);

    const editPreview = useCallback((val: string) => setPreview(val), []);

    return { state, preview, rationale, error, elapsedMs, canEnhance, enhance, accept, dismiss, editPreview };
}

interface EnhanceButtonProps {
    handle: PromptEnhancerHandle;
    accentColor?: string;
    disabled?: boolean;
    /** Compact mode shrinks the button label — useful when the input row is tight. */
    compact?: boolean;
    title?: string;
}

export const EnhanceButton: React.FC<EnhanceButtonProps> = ({ handle, accentColor = '#00B7C3', disabled, compact, title }) => {
    const busy = handle.state === 'loading';
    const isDisabled = disabled || !handle.canEnhance;
    const label = busy ? (compact ? '...' : 'Enhancing') : (compact ? 'Enh' : 'Enhance');
    return (
        <button
            type="button"
            onClick={handle.enhance}
            disabled={isDisabled}
            title={title || 'Rewrite this prompt for a deeper response (Gemini Flash)'}
            aria-label="Enhance prompt"
            style={{
                padding: compact ? '0 8px' : '0 12px',
                background: isDisabled ? '#E8E8E8' : 'transparent',
                color: isDisabled ? '#999' : accentColor,
                border: `1px solid ${isDisabled ? '#DDD' : accentColor}`,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontFamily: "'Archivo', sans-serif",
                minWidth: compact ? 36 : 64,
            }}
        >
            {label}
        </button>
    );
};

interface EnhancePreviewProps {
    handle: PromptEnhancerHandle;
    accentColor?: string;
}

export const EnhancePreview: React.FC<EnhancePreviewProps> = ({ handle, accentColor = '#00B7C3' }) => {
    if (handle.state === 'idle') return null;

    if (handle.state === 'loading') {
        return (
            <div style={{
                border: `1px dashed ${accentColor}`,
                padding: '6px 10px',
                marginBottom: 6,
                background: '#FAFCFD',
                fontFamily: "'Archivo', sans-serif",
                fontSize: 11,
                color: '#555',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: accentColor, animation: 'pulse 1.4s ease-in-out infinite' }} />
                Enhancing prompt with Gemini Flash...
            </div>
        );
    }

    if (handle.state === 'error') {
        return (
            <div style={{
                border: '1px solid #CC6644',
                padding: '6px 10px',
                marginBottom: 6,
                background: '#FFF6F2',
                fontFamily: "'Archivo', sans-serif",
                fontSize: 11,
                color: '#A0421F',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Enhance failed</div>
                    <div style={{ fontSize: 10, color: '#7A3216' }}>{handle.error.slice(0, 240)}</div>
                </div>
                <button
                    type="button"
                    onClick={handle.dismiss}
                    style={{ background: 'transparent', border: 'none', color: '#CC6644', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}
                    aria-label="Dismiss"
                >×</button>
            </div>
        );
    }

    // preview state
    return (
        <div style={{
            border: `1px solid ${accentColor}`,
            padding: 10,
            marginBottom: 6,
            background: '#FAFCFD',
            fontFamily: "'Archivo', sans-serif",
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
                fontSize: 9,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: accentColor,
                fontWeight: 700,
            }}>
                <span>Enhanced prompt · Gemini Flash · {handle.elapsedMs}ms</span>
                <button
                    type="button"
                    onClick={handle.dismiss}
                    style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                    aria-label="Dismiss enhancement"
                >×</button>
            </div>
            <textarea
                value={handle.preview}
                onChange={e => handle.editPreview(e.target.value)}
                rows={Math.min(8, Math.max(3, Math.ceil(handle.preview.length / 90)))}
                style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #E0E0E0',
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: 12,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                }}
            />
            {handle.rationale && (
                <div style={{ fontSize: 10, color: '#666', marginTop: 6, fontStyle: 'italic' }}>
                    {handle.rationale}
                </div>
            )}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                    type="button"
                    onClick={handle.dismiss}
                    style={{
                        padding: '4px 10px',
                        background: 'transparent',
                        color: '#666',
                        border: '1px solid #CCC',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: "'Archivo', sans-serif",
                    }}
                >
                    Keep mine
                </button>
                <button
                    type="button"
                    onClick={handle.accept}
                    style={{
                        padding: '4px 12px',
                        background: accentColor,
                        color: '#FFFFFF',
                        border: `1px solid ${accentColor}`,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: "'Archivo', sans-serif",
                    }}
                >
                    Use enhanced
                </button>
            </div>
        </div>
    );
};
