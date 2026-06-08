import React, { useEffect, useState } from 'react';
import { getLibraryCounts, type WikiLibraryCounts } from '../services/wikiLibraryAggregator';
import { formatUSD } from '../services/costMeter';
import type { LibrarySelection } from './KnowledgeLibrary';

/**
 * KnowledgeLibraryPreview - landing-page tile that visualizes what's cached
 * in the wiki at a glance and lets the researcher open the full library
 * modal. Renders ABOVE Continue Session on the IDLE page so the second-brain
 * library is the FIRST thing a researcher sees.
 *
 * Lightweight: only calls getLibraryCounts() (5 proxy fetches, < 500ms)
 * on mount, not the full aggregator. The full aggregation only runs when
 * the user opens the modal.
 */

interface Props {
    /** Opens the full Knowledge Library modal. */
    onOpen: () => void;
    /** Active selection - when set, the tile shows the selection summary instead of the empty-state CTA. */
    selection: LibrarySelection | null;
    /** Clear the active selection. */
    onClear: () => void;
    accentColor?: string;
    /** When set, the preview tile prompts the user to browse the library for
     *  items relevant to this goal. The actual relevance scoring happens
     *  inside the modal - running the full aggregator on every IDLE render
     *  would be 30-50 proxy fetches just to compute the preview hint. */
    researchGoal?: string;
}

const NXT_BLACK = '#0D0D0D';
const NXT_LIME = '#B8B800';
const NXT_CYAN = '#00B7C3';
const NXT_TEAL = '#115054';

export const KnowledgeLibraryPreview: React.FC<Props> = ({ onOpen, selection, onClear, accentColor = NXT_CYAN, researchGoal }) => {
    const [counts, setCounts] = useState<WikiLibraryCounts | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        getLibraryCounts()
            .then(c => { setCounts(c); setLoading(false); })
            .catch(e => { setError(String(e?.message || e)); setLoading(false); });
    }, []);

    const selectionCount = selection
        ? selection.engagementSlugs.length + selection.themeClusterIds.length + selection.sourceArchivePaths.length + selection.socialSubreddits.length
        : 0;

    return (
        <div style={{
            background: '#FFFFFF',
            border: `1px solid #E0E0E0`,
            borderLeft: `4px solid ${accentColor}`,
            padding: '18px 22px',
            marginBottom: 24,
            fontFamily: "'Archivo', sans-serif",
        }}>
            {/* Header strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16 }}>
                <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: NXT_BLACK, textTransform: 'uppercase' }}>
                        Your Knowledge Library
                    </div>
                    <div style={{ fontSize: 12, color: '#525252', marginTop: 4, maxWidth: 720, lineHeight: 1.45 }}>
                        {researchGoal && researchGoal.trim().length >= 8 ? (
                            <span>
                                Browse the wiki - items most relevant to <em style={{ color: NXT_BLACK, fontStyle: 'normal', fontWeight: 600 }}>your current research goal</em> will be flagged with <span style={{ color: accentColor, fontWeight: 700 }}> RELEVANT</span> and sorted to the top of each tab.
                            </span>
                        ) : (
                            <span>Everything your prior research has produced - themes, sources, social intelligence, and prior engagements. Enter a research goal below to see which items match it.</span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {selectionCount > 0 && (
                        <button
                            type="button"
                            onClick={onClear}
                            style={{ padding: '6px 12px', background: 'transparent', color: '#525252', border: '1px solid #DDD', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}
                        >
                            Clear selection
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onOpen}
                        style={{
                            padding: '8px 18px',
                            background: NXT_BLACK,
                            color: accentColor,
                            border: `1px solid ${accentColor}`,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 1.2,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            fontFamily: "'Archivo', sans-serif",
                        }}
                    >
                        {selectionCount > 0 ? 'Edit selection' : 'Browse library'}
                    </button>
                </div>
            </div>

            {/* Loading / error / counts row */}
            {loading && (
                <div style={{ padding: '12px 0', color: '#737373', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: accentColor }} />
                    Scanning your wiki...
                </div>
            )}
            {error && (
                <div style={{ padding: '10px 14px', color: '#A0421F', background: '#FFF6F2', border: '1px solid #CC6644', fontSize: 12 }}>
                    Couldn't scan the wiki: {error}
                </div>
            )}
            {counts && !loading && !error && (
                <>
                    {/* Big-number tiles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
                        <CountTile label="Engagements" count={counts.engagements} accent={NXT_LIME} />
                        <CountTile label="Theme clusters" count={counts.themes} accent={NXT_CYAN} subtitle={counts.themes > 0 ? 'approximate' : undefined} />
                        <CountTile label="Source archives" count={counts.sources} accent={NXT_TEAL} />
                        <CountTile label="Subreddits" count={counts.social} accent="#0CCE6B" subtitle="deeply fetched" />
                        <CountTile label="Cached articles" count={counts.articles} accent="#888" />
                    </div>

                    {/* Value strip + selection state */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F5F5F0', borderLeft: `3px solid ${accentColor}` }}>
                        <div style={{ fontSize: 12, color: NXT_BLACK }}>
                            {selectionCount > 0 ? (
                                <span>
                                    <strong style={{ color: accentColor }}>{selectionCount} cached item{selectionCount === 1 ? '' : 's'} selected.</strong> They'll be reused on your next research run.
                                </span>
                            ) : (
                                <span>
                                    Approximately <strong>{formatUSD(counts.estimated_value_usd)}</strong> of cached intelligence ready to reuse.
                                </span>
                            )}
                        </div>
                        {counts.recent_engagements.length > 0 && selectionCount === 0 && (
                            <div style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1 }}>
                                most recent: {counts.recent_engagements[0].research_goal.slice(0, 64)}{counts.recent_engagements[0].research_goal.length > 64 ? '...' : ''}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const CountTile: React.FC<{ label: string; count: number; accent: string; subtitle?: string }> = ({ label, count, accent, subtitle }) => (
    <div style={{
        background: '#FAFAF7',
        border: `1px solid #E5E5E5`,
        borderTop: `3px solid ${accent}`,
        padding: '12px 14px',
        textAlign: 'center',
    }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 1, color: count > 0 ? accent : '#CCC', lineHeight: 1 }}>
            {count}
        </div>
        <div style={{ fontSize: 9, color: '#525252', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginTop: 6 }}>
            {label}
        </div>
        {subtitle && (
            <div style={{ fontSize: 8, color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                {subtitle}
            </div>
        )}
    </div>
);
