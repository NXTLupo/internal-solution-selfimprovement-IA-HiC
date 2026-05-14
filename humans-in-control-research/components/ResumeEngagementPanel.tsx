import React, { useCallback, useEffect, useState } from 'react';
import {
    listEngagementManifests,
    readEngagementBriefs,
    scoreGoalMatch,
    type EngagementManifest,
    type EngagementBriefsFile,
} from '../services/wikiService';

/**
 * ResumeEngagementPanel — IDLE-screen surface that detects prior engagements
 * matching the entered research goal (via cheap keyword overlap on the
 * persisted manifest list) and surfaces a tiered resume picker:
 *
 *   - "Build-only" (T4): load cached briefs, skip everything else, jump
 *     straight to brief selection → click Build → run Stages 2-5 only.
 *     Saves $30-50 per re-iteration.
 *   - "Briefs only" (T3): load cached briefs, but rerun the build from
 *     scratch if the user picks a different one. (Same as Build-only in
 *     this MVP — distinguished mostly by intent.)
 *   - "Fresh": ignore cache, run the full pipeline.
 *
 * The panel only appears when the entered goal has a match with score >= 0.25.
 * That's a sensitivity threshold tuned in scoreGoalMatch (~25% word overlap
 * after stop-word filtering).
 */

export interface CachedEngagementMatch {
    manifest: EngagementManifest;
    score: number;
}

export interface ResumeSelection {
    mode: 't4-build-only' | 't3-briefs' | 'fresh';
    manifest: EngagementManifest;
    briefsFile: EngagementBriefsFile;
}

interface UseEngagementMatchesArgs {
    researchGoal: string;
    /** Hide panel + skip lookup entirely when the user has chosen Fresh once for this goal. */
    suppressed?: boolean;
    /** Optional: debounce window for goal-change re-queries. Default 600ms. */
    debounceMs?: number;
}

export function useEngagementMatches({ researchGoal, suppressed, debounceMs = 600 }: UseEngagementMatchesArgs) {
    const [matches, setMatches] = useState<CachedEngagementMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);

    useEffect(() => {
        if (suppressed) { setMatches([]); return; }
        const goal = researchGoal.trim();
        if (goal.length < 8) { setMatches([]); return; }
        const handle = window.setTimeout(async () => {
            setLoading(true);
            try {
                const manifests = await listEngagementManifests();
                const scored: CachedEngagementMatch[] = manifests
                    .map(m => ({ manifest: m, score: scoreGoalMatch(goal, m.research_goal || '') }))
                    .filter(s => s.score >= 0.25)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);
                setMatches(scored);
                setHasScanned(true);
            } catch (e) {
                console.warn('[ResumeEngagement] match scan failed:', e);
                setMatches([]);
            } finally {
                setLoading(false);
            }
        }, debounceMs);
        return () => window.clearTimeout(handle);
    }, [researchGoal, suppressed, debounceMs]);

    return { matches, loading, hasScanned };
}

interface PanelProps {
    matches: CachedEngagementMatch[];
    loading: boolean;
    accentColor?: string;
    onSelect: (selection: ResumeSelection) => void;
    onDismiss: () => void;
}

export const ResumeEngagementPanel: React.FC<PanelProps> = ({ matches, loading, accentColor = '#00B7C3', onSelect, onDismiss }) => {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

    const handlePick = useCallback(async (match: CachedEngagementMatch, mode: ResumeSelection['mode']) => {
        if (mode === 'fresh') {
            onDismiss();
            return;
        }
        setLoadingSlug(match.manifest.slug);
        try {
            const briefsFile = await readEngagementBriefs(match.manifest.slug);
            if (!briefsFile || !briefsFile.briefs?.length) {
                console.warn('[ResumeEngagement] manifest pointed to briefs but none loaded:', match.manifest.slug);
                onDismiss();
                return;
            }
            onSelect({ mode, manifest: match.manifest, briefsFile });
        } finally {
            setLoadingSlug(null);
        }
    }, [onSelect, onDismiss]);

    if (loading) {
        return (
            <div style={{ marginTop: 14, padding: '10px 14px', border: `1px dashed ${accentColor}`, background: '#FAFCFD', fontFamily: "'Archivo', sans-serif", fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: accentColor }} />
                Checking your library for related work...
            </div>
        );
    }
    if (matches.length === 0) return null;

    return (
        <div style={{ marginTop: 14, border: `1px solid ${accentColor}`, background: '#FAFCFD', fontFamily: "'Archivo', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 14px', borderBottom: `1px solid ${accentColor}`, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1, color: '#0D0D0D' }}>
                        You've worked on this before
                    </span>
                    <span style={{ fontSize: 10, color: '#737373' }}>
                        {matches.length === 1 ? '1 related engagement' : `${matches.length} related engagements`} found in your library
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                    aria-label="Dismiss"
                    title="Hide this panel and start a new engagement"
                >×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {matches.map((m, idx) => {
                    const isExpanded = expanded === m.manifest.slug;
                    const isLoadingThis = loadingSlug === m.manifest.slug;
                    const briefCount = m.manifest.cached?.briefs?.count || 0;
                    const protoCount = m.manifest.cached?.prototypes?.count || 0;
                    const updated = m.manifest.updated_at
                        ? new Date(m.manifest.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '';
                    return (
                        <div key={m.manifest.slug} style={{ borderTop: idx > 0 ? '1px solid #F0F0F0' : 'none', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                        {m.manifest.brand && (
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                {m.manifest.brand}
                                            </span>
                                        )}
                                        {updated && (
                                            <span style={{ fontSize: 10, color: '#888' }}>{m.manifest.brand ? '· ' : ''}{updated}</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#0D0D0D', lineHeight: 1.4, marginBottom: 6 }}>
                                        {m.manifest.research_goal || '(no research goal recorded)'}
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#525252', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {briefCount > 0 && <span>{briefCount} product brief{briefCount === 1 ? '' : 's'} ready</span>}
                                        {protoCount > 0 && <span>· {protoCount} prototype{protoCount === 1 ? '' : 's'} built</span>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(isExpanded ? null : m.manifest.slug)}
                                    style={{ background: 'transparent', border: 'none', color: accentColor, cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Archivo', sans-serif" }}
                                >
                                    {isExpanded ? 'Close' : 'Open'}
                                </button>
                            </div>
                            {isExpanded && (
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #E0E0E0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {briefCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handlePick(m, 't4-build-only')}
                                            disabled={isLoadingThis}
                                            style={{ padding: '8px 12px', background: '#0D0D0D', color: accentColor, border: 'none', fontFamily: "'Archivo', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: isLoadingThis ? 'wait' : 'pointer', textAlign: 'left' }}
                                        >
                                            {isLoadingThis ? 'Loading your briefs…' : 'Build another prototype from these briefs'}
                                        </button>
                                    )}
                                    {briefCount > 0 && (
                                        <span style={{ fontSize: 10, color: '#737373', fontStyle: 'italic', padding: '0 2px' }}>
                                            Reuses the briefs and research you already paid for. The new prototype takes 4–8 minutes.
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handlePick(m, 'fresh')}
                                        style={{ padding: '8px 12px', background: 'transparent', color: '#525252', border: '1px solid #DDD', fontFamily: "'Archivo', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        Start a new engagement instead
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
