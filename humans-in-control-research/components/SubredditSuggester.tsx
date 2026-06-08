import React, { useCallback, useState } from 'react';
import { suggestSubreddits, type SubredditSuggestion } from '../services/subredditSuggester';

type SuggesterState = 'idle' | 'loading' | 'preview' | 'error';

interface UseSuggesterArgs {
    researchGoal: string;
    currentValue: string;
    onChange: (value: string) => void;
    fileContext?: string;
}

export interface SubredditSuggesterHandle {
    state: SuggesterState;
    suggestions: SubredditSuggestion[];
    picked: Set<string>;
    error: string;
    elapsedMs: number;
    canSuggest: boolean;
    run: () => Promise<void>;
    togglePick: (slug: string) => void;
    accept: () => void;
    dismiss: () => void;
}

export function useSubredditSuggester({ researchGoal, currentValue, onChange, fileContext }: UseSuggesterArgs): SubredditSuggesterHandle {
    const [state, setState] = useState<SuggesterState>('idle');
    const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [elapsedMs, setElapsedMs] = useState(0);

    const canSuggest = state !== 'loading' && researchGoal.trim().length > 0;

    const run = useCallback(async () => {
        const goal = researchGoal.trim();
        if (!goal) return;
        setState('loading');
        setError('');
        try {
            const result = await suggestSubreddits({
                researchGoal: goal,
                existingSubreddits: currentValue,
                fileContext,
                maxSuggestions: 8,
            });
            setSuggestions(result.suggestions);
            setPicked(new Set(result.suggestions.filter(s => s.estimated_signal === 'high').map(s => s.slug)));
            setElapsedMs(result.elapsed_ms);
            setState(result.suggestions.length > 0 ? 'preview' : 'error');
            if (result.suggestions.length === 0) setError('No suggestions returned. The goal may need to be more specific.');
        } catch (e: any) {
            setError(String(e?.message || e));
            setState('error');
        }
    }, [researchGoal, currentValue, fileContext]);

    const togglePick = useCallback((slug: string) => {
        setPicked(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    }, []);

    const accept = useCallback(() => {
        const chosen = suggestions.filter(s => picked.has(s.slug)).map(s => `r/${s.slug}`);
        if (chosen.length === 0) return;
        const existing = currentValue.trim();
        const merged = existing
            ? `${existing}, ${chosen.join(', ')}`
            : chosen.join(', ');
        onChange(merged);
        setState('idle');
        setSuggestions([]);
        setPicked(new Set());
    }, [suggestions, picked, currentValue, onChange]);

    const dismiss = useCallback(() => {
        setState('idle');
        setSuggestions([]);
        setPicked(new Set());
        setError('');
    }, []);

    return { state, suggestions, picked, error, elapsedMs, canSuggest, run, togglePick, accept, dismiss };
}

interface SuggesterButtonProps {
    handle: SubredditSuggesterHandle;
    accentColor?: string;
    compact?: boolean;
}

export const SuggesterButton: React.FC<SuggesterButtonProps> = ({ handle, accentColor = '#00B7C3', compact }) => {
    const busy = handle.state === 'loading';
    const isDisabled = !handle.canSuggest;
    const label = busy ? 'Suggesting...' : 'Suggest from goal';
    return (
        <button
            type="button"
            onClick={handle.run}
            disabled={isDisabled}
            title={isDisabled ? 'Enter a research goal first' : 'Generate subreddit suggestions from your research goal (Gemini Flash)'}
            style={{
                padding: compact ? '4px 10px' : '6px 14px',
                background: isDisabled ? '#E8E8E8' : 'transparent',
                color: isDisabled ? '#999' : accentColor,
                border: `1px solid ${isDisabled ? '#DDD' : accentColor}`,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontFamily: "'Archivo', sans-serif",
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </button>
    );
};

interface SuggesterPanelProps {
    handle: SubredditSuggesterHandle;
    accentColor?: string;
}

export const SuggesterPanel: React.FC<SuggesterPanelProps> = ({ handle, accentColor = '#00B7C3' }) => {
    if (handle.state === 'idle') return null;

    const signalColor = (sig: string) => sig === 'high' ? '#0CCE6B' : sig === 'medium' ? '#B8B800' : '#CCCCCC';

    if (handle.state === 'loading') {
        return (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 11, color: '#555', border: `1px dashed ${accentColor}`, background: '#FAFCFD', fontFamily: "'Archivo', sans-serif" }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: accentColor }} />
                Asking Gemini Flash for subreddit suggestions...
            </div>
        );
    }

    if (handle.state === 'error') {
        return (
            <div style={{ marginTop: 6, border: '1px solid #CC6644', padding: '8px 12px', background: '#FFF6F2', fontFamily: "'Archivo', sans-serif", fontSize: 11, color: '#A0421F', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Suggester failed</div>
                    <div style={{ fontSize: 10, color: '#7A3216' }}>{handle.error.slice(0, 240)}</div>
                </div>
                <button type="button" onClick={handle.dismiss} style={{ background: 'transparent', border: 'none', color: '#CC6644', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }} aria-label="Dismiss">×</button>
            </div>
        );
    }

    return (
        <div style={{ marginTop: 6, border: `1px solid ${accentColor}`, padding: 12, background: '#FAFCFD', fontFamily: "'Archivo', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: accentColor, fontWeight: 700 }}>
                <span>{handle.suggestions.length} suggestions · Gemini Flash · {handle.elapsedMs}ms · pick which to add</span>
                <button type="button" onClick={handle.dismiss} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }} aria-label="Dismiss">×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {handle.suggestions.map(s => {
                    const isPicked = handle.picked.has(s.slug);
                    return (
                        <label key={s.slug} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: isPicked ? '#FFFFFF' : 'transparent', border: `1px solid ${isPicked ? accentColor : 'transparent'}`, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={isPicked}
                                onChange={() => handle.togglePick(s.slug)}
                                style={{ marginTop: 2, accentColor }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#0D0D0D' }}>r/{s.slug}</span>
                                    <span title={`signal: ${s.estimated_signal}`} style={{ width: 6, height: 6, borderRadius: 6, background: signalColor(s.estimated_signal), flexShrink: 0 }} />
                                    <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{s.estimated_signal}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#525252', marginTop: 1, lineHeight: 1.4 }}>{s.rationale}</div>
                            </div>
                        </label>
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={handle.dismiss} style={{ padding: '4px 10px', background: 'transparent', color: '#666', border: '1px solid #CCC', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}>
                    Dismiss
                </button>
                <button type="button" onClick={handle.accept} disabled={handle.picked.size === 0} style={{ padding: '4px 12px', background: handle.picked.size === 0 ? '#E8E8E8' : accentColor, color: handle.picked.size === 0 ? '#999' : '#FFFFFF', border: `1px solid ${handle.picked.size === 0 ? '#DDD' : accentColor}`, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: handle.picked.size === 0 ? 'not-allowed' : 'pointer', fontFamily: "'Archivo', sans-serif" }}>
                    Add {handle.picked.size} to input
                </button>
            </div>
        </div>
    );
};

// Back-compat single component for callers that want everything in one place
// (renders the button inline and the panel below it).
interface SuggesterAllInOneProps extends UseSuggesterArgs {
    accentColor?: string;
}
export const SubredditSuggester: React.FC<SuggesterAllInOneProps> = ({ accentColor, ...hookArgs }) => {
    const handle = useSubredditSuggester(hookArgs);
    return (
        <div>
            <SuggesterButton handle={handle} accentColor={accentColor} />
            <SuggesterPanel handle={handle} accentColor={accentColor} />
        </div>
    );
};
