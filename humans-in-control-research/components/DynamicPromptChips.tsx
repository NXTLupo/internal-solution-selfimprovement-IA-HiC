/**
 * DynamicPromptChips - Consulting-Partner guidance strip above the chat input.
 *
 * Renders state-aware suggestions produced by services/dynamicPromptSuggestions.
 * Clicking a chip populates the chat input (does NOT auto-send) so the
 * researcher can tweak before hitting Send.
 *
 * Behaviors:
 *   - Loading state: 3 skeleton chips shimmering
 *   - Empty state: nothing rendered (no awkward placeholder)
 *   - Phase badge: top-left shows "PRE-COLLECTION" / "MID-COLLECTION" / "POST-COLLECTION"
 *     so the researcher knows why the chip set just shifted
 *   - Refresh button: rotating arrow in top-right lets user force regenerate
 *
 * Visual style: chartreuse accent border on hover (matches NXT brand), subtle
 * icon per SuggestionKind so the chips don't read as a wall of text.
 */

import React, { useEffect, useRef, useState } from 'react';
import { suggestPrompts, detectPhase, type PromptSuggestion, type SuggestionState, type CollectionPhase, type SuggestionKind } from '../services/dynamicPromptSuggestions';

interface Props {
    state: SuggestionState;
    /** Called when user clicks a chip - receives the suggestion text to load into input. */
    onSelect: (text: string) => void;
    /** Debounce ms before refreshing suggestions after state changes (default 900ms). */
    debounceMs?: number;
    /** Max number of chips to show (default 5). */
    max?: number;
    /** Vertical compact mode - chips wrap instead of scrolling horizontally. */
    compact?: boolean;
}

const KIND_GLYPH: Record<SuggestionKind, string> = {
    'document-drill': '',
    'source-coverage': '',
    'theme-exploration': '',
    'persona-perspective': '',
    'comparison': '⇄',
    'synthesis': '∑',
    'slide-request': '▦',
    'evidence-probe': '',
};

// 2026-05-12 - Map each suggestion kind to the directive that would
// produce the most relevant artifact. When a user clicks a chip, we
// prepend the suggested hashtag to the chip text so they go from
// "Drill into theme X" → "#explainer Drill into theme X" and get a
// proper HTML artifact instead of a one-shot chat answer.
const KIND_HASHTAG: Record<SuggestionKind, string | null> = {
    'document-drill': '#explainer',
    'source-coverage': '#brief',
    'theme-exploration': '#explainer',
    'persona-perspective': '#brief',
    'comparison': '#approaches',
    'synthesis': '#report',
    'slide-request': '#presentation',
    'evidence-probe': null,                 // open-ended prose answer is fine
};

const PHASE_LABEL: Record<CollectionPhase, string> = {
    'setup': 'BRIEF SETUP',
    'pre-collection': 'PRE-COLLECTION',
    'mid-collection': 'COLLECTING',
    'post-collection': 'POST-SYNTHESIS',
};

export const DynamicPromptChips: React.FC<Props> = ({ state, onSelect, debounceMs = 900, max = 5, compact = false }) => {
    const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
    // Start in loading=true so the component renders a skeleton immediately
    // on mount. The previous `if (!loading && suggestions.length === 0) return null`
    // guard combined with loading=false defaults meant the component returned
    // null on first render, giving no visual proof it had mounted.
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState<CollectionPhase>('pre-collection');
    const [dismissed, setDismissed] = useState(false);
    const lastFingerprint = useRef<string>('');
    const abortRef = useRef<AbortController | null>(null);

    // Mount-time log so we can PROVE the component is rendering even if
    // suggestPrompts throws or the effect never fires. If you don't see this
    // in the console, the component isn't being mounted at all.
    useEffect(() => {
        console.log(`[DynamicPromptChips] MOUNTED - goal=${(state.researchGoal || '').length} chars, uploads=${(state.uploadedFiles || []).length}, sources=${(state.liveSourceResults || []).length}`);
    }, []);

    // State fingerprint - changes trigger a refresh. Designed to be stable
    // against benign updates (timestamp ticks, irrelevant counts) so the
    // Gemini call fires ~once per meaningful phase change.
    const fingerprint = buildFingerprint(state);

    useEffect(() => {
        if (dismissed) return;
        // NOTE: removed the old "researchGoal < 10 chars => bail" guard
        // (2026-04-21). The setup phase is the MOST important time to show
        // guidance chips - that's when the researcher hasn't written a brief
        // yet and needs coaching. suggestPrompts() now returns fallback
        // setup-phase chips directly without calling Gemini.
        if (fingerprint === lastFingerprint.current) return;
        lastFingerprint.current = fingerprint;

        // Abort any in-flight request so only the latest state wins
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const detectedPhase = detectPhase(state);
        setPhase(detectedPhase);

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await suggestPrompts(state, { maxSuggestions: max, signal: ac.signal });
                if (!ac.signal.aborted) {
                    setSuggestions(result);
                    // Diagnostic log so blank-chip states are instantly
                    // debuggable from the devtools console.
                    console.log(`[DynamicPromptChips] phase=${detectedPhase} produced ${result.length} suggestions${result.length === 0 ? ' - check state: ' + JSON.stringify({ goalLen: (state.researchGoal || '').length, uploads: (state.uploadedFiles || []).length, sources: (state.liveSourceResults || []).length, kgNodes: state.knowledgeGraph?.nodes?.length || 0 }) : ''}`);
                }
            } catch (err: any) {
                console.warn('[DynamicPromptChips] suggestPrompts threw:', err?.message || err);
            } finally {
                if (!ac.signal.aborted) setLoading(false);
            }
        }, debounceMs);

        return () => {
            clearTimeout(timer);
            ac.abort();
        };
    }, [fingerprint, debounceMs, max, dismissed]);

    const handleRefresh = () => {
        lastFingerprint.current = '__force_refresh__' + Date.now();
        // Fake a fingerprint change by bumping dismissed flag off and then on
        setDismissed(false);
        // Also force: clear and re-trigger immediately
        setSuggestions([]);
        setLoading(true);
        const ac = new AbortController();
        abortRef.current = ac;
        suggestPrompts(state, { maxSuggestions: max, signal: ac.signal })
            .then(result => { if (!ac.signal.aborted) setSuggestions(result); })
            .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    };

    if (dismissed) return null;
    // Always render - if loading, show skeleton; if suggestions empty after
    // load, show a subtle "no suggestions" note instead of silently vanishing.
    // Silent null-returns were the reason blank states were impossible to debug.

    return (
        <div style={{
            padding: '10px 14px 8px',
            borderTop: '1px solid #E5E5E0',
            background: 'rgba(250, 250, 245, 0.6)',
            fontFamily: "'Archivo', system-ui, sans-serif",
        }}>
            {/* Header strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                        fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase',
                        fontWeight: 700, color: '#B8B800',
                        background: '#0D0D0D', padding: '3px 7px',
                    }}>⌘ ASK</span>
                    <span style={{
                        fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
                        fontWeight: 700, color: '#888',
                    }}>{PHASE_LABEL[phase]}</span>
                    {loading && (
                        <span style={{ fontSize: 10, color: '#888' }}>thinking...</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Regenerate suggestions"
                        style={{
                            background: 'transparent', border: '1px solid #CCC',
                            color: '#666', padding: '2px 7px', fontSize: 10,
                            cursor: loading ? 'wait' : 'pointer', letterSpacing: 1,
                            fontWeight: 700,
                        }}
                    >↻</button>
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        title="Hide suggestions (refresh browser to restore)"
                        style={{
                            background: 'transparent', border: '1px solid #CCC',
                            color: '#666', padding: '2px 7px', fontSize: 10,
                            cursor: 'pointer', letterSpacing: 1, fontWeight: 700,
                        }}
                    >×</button>
                </div>
            </div>
            {/* Chip row */}
            <div style={{
                display: 'flex',
                flexWrap: compact ? 'wrap' : 'nowrap',
                gap: 6,
                overflowX: compact ? 'visible' : 'auto',
                paddingBottom: compact ? 0 : 4,
            }}>
                {loading && suggestions.length === 0 && (
                    <>
                        <SkeletonChip />
                        <SkeletonChip />
                        <SkeletonChip />
                    </>
                )}
                {!loading && suggestions.length === 0 && (
                    <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', padding: '4px 2px' }}>
                        No suggestions generated. Click ↻ to retry or type your question below.
                    </div>
                )}
                {suggestions.map((s, i) => {
                    const tag = KIND_HASHTAG[s.kind];
                    // The chip text the user actually loads - prepends the
                    // hashtag when one is mapped, so a single click produces
                    // an artifact instead of a one-shot chat answer.
                    const loadedText = tag ? `${tag} ${s.text}` : s.text;
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onSelect(loadedText)}
                            title={`${s.rationale || 'Click to load into chat input'}${tag ? ` · loads as ${tag}` : ''}`}
                            style={{
                                flexShrink: 0,
                                background: '#FFFFFF',
                                border: '1px solid #D0D0CA',
                                color: '#1A1A1A',
                                padding: '6px 10px',
                                fontSize: 12, lineHeight: 1.35,
                                cursor: 'pointer', fontFamily: 'inherit',
                                textAlign: 'left' as const,
                                maxWidth: compact ? '100%' : 340,
                                transition: 'border-color 0.15s, background 0.15s',
                                display: 'inline-flex',
                                alignItems: 'baseline',
                                gap: 6,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#B8B800';
                                e.currentTarget.style.background = '#FAFAF0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#D0D0CA';
                                e.currentTarget.style.background = '#FFFFFF';
                            }}
                        >
                            <span style={{ fontSize: 11, opacity: 0.7 }}>{KIND_GLYPH[s.kind] || '•'}</span>
                            {tag && (
                                <code style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    background: '#0D0D0D',
                                    color: '#B8B800',
                                    letterSpacing: 0.5,
                                    flexShrink: 0,
                                }}>{tag}</code>
                            )}
                            <span>{s.text}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- Helpers ---

/** Build a stable fingerprint of the state. Two identical fingerprints = no
 *  regeneration needed. We hash the high-signal parts only so suggestions
 *  don't re-fire on unrelated renders. */
function buildFingerprint(state: SuggestionState): string {
    const g = (state.researchGoal || '').trim().substring(0, 200);
    const fileSig = (state.uploadedFiles || []).map(f => f?.name).filter(Boolean).sort().join('|');
    const liveSig = (state.liveSourceResults || [])
        .filter(s => (s.items?.length || 0) > 0)
        .map(s => `${s.source}:${s.items?.length || 0}`)
        .sort()
        .join(',');
    const graphNodes = state.knowledgeGraph?.nodes || [];
    const themeCount = graphNodes.filter((n: any) => n?.type === 'theme').length;
    const personaCount = graphNodes.filter((n: any) => n?.type === 'persona').length;
    const sourceCount = graphNodes.filter((n: any) => n?.type === 'source').length;
    return `g=${g}|f=${fileSig}|l=${liveSig}|t=${themeCount}|p=${personaCount}|s=${sourceCount}`;
}

const SkeletonChip: React.FC = () => (
    <div style={{
        flexShrink: 0,
        width: 180, height: 30,
        background: 'linear-gradient(90deg, #EEE 0%, #F5F5F0 50%, #EEE 100%)',
        backgroundSize: '200% 100%',
        animation: 'chipShimmer 1.4s ease-in-out infinite',
        border: '1px solid #E5E5E0',
    }}>
        <style>{`@keyframes chipShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
);

export default DynamicPromptChips;
