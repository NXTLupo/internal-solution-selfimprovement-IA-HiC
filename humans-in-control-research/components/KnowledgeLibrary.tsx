import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    aggregateWikiLibrary,
    scoreThemeRelevance,
    scoreSourceRelevance,
    scoreSocialRelevance,
    scoreEngagementRelevance,
    RELEVANCE_HIGH,
    RELEVANCE_MED,
    type WikiLibrarySummary,
    type LibraryThemeCluster,
    type LibrarySourceCategory,
    type LibrarySocialBucket,
    type LibraryEngagementSummary,
} from '../services/wikiLibraryAggregator';
import { formatUSD } from '../services/costMeter';

/**
 * KnowledgeLibrary — full-screen modal panel that visualizes everything cached
 * in the wiki across four axes (Themes / Sources / Social / Engagements) and
 * lets the researcher select which items to feed into the next research run.
 *
 * The selection is captured in the returned LibrarySelection and surfaced
 * back to App.tsx via onApply. App.tsx threads the selection through the
 * pipeline so cache hits skip regeneration.
 *
 * Fresh research remains a first-class option — closing the panel without
 * applying a selection returns the user to the normal IDLE flow.
 */

export type LibraryTabId = 'engagements' | 'themes' | 'articles' | 'sources' | 'social';

export interface LibrarySelection {
    /** Engagement slugs whose briefs/themes/deliverables to reuse. */
    engagementSlugs: string[];
    /** Theme cluster ids (from synthesis files) to include in the corpus. */
    themeClusterIds: string[];
    /** Source archive paths (wiki/sources/*.md) whose items feed the corpus. */
    sourceArchivePaths: string[];
    /** Subreddit slugs (no r/ prefix) to pull from cached reddit-deep instead of refetching. */
    socialSubreddits: string[];
    /** 2026-05-14 — Article source folders (e.g. 'client-uploads', 'jina-reader',
     *  'reddit-deep-r-neu') whose markdown bodies to fold into the corpus.
     *  Covers the previously-invisible 1,388 cached articles, including all
     *  RAG client-uploaded documents. */
    articleSources: string[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onApply: (selection: LibrarySelection, summary: WikiLibrarySummary) => void;
    accentColor?: string;
    /** When set, each tab sorts by relevance to this goal (descending) and
     *  flags items scoring >= RELEVANCE_HIGH with a "RELEVANT" badge. */
    researchGoal?: string;
}

const NXT_BLACK = '#0D0D0D';
const NXT_LIME = '#B8B800';
const NXT_CYAN = '#00B7C3';
const NXT_RUST = '#CC6644';
const NXT_TEAL = '#115054';
const SUCCESS = '#0CCE6B';

/** Goal-aware "RELEVANT" pill rendered when an item's relevance score crosses
 *  RELEVANCE_HIGH. The shape is a tiny inline badge; placement is decided by
 *  each tab body (typically top-right of the card). */
const RelevantBadge: React.FC<{ score: number; accentColor: string }> = ({ score, accentColor }) => (
    <span
        title={`Matches ${Math.round(score * 100)}% of your research-goal keywords`}
        style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            background: accentColor,
            padding: '2px 6px',
            borderRadius: 2,
        }}
    >
        ★ relevant
    </span>
);

function sentimentColor(s: string): string {
    switch (s) {
        case 'positive': return SUCCESS;
        case 'negative': return NXT_RUST;
        case 'neutral':  return NXT_TEAL;
        case 'mixed':    return NXT_LIME;
        default:         return '#888';
    }
}

const emptySelection: LibrarySelection = {
    engagementSlugs: [],
    themeClusterIds: [],
    sourceArchivePaths: [],
    socialSubreddits: [],
    articleSources: [],
};

export const KnowledgeLibrary: React.FC<Props> = ({ isOpen, onClose, onApply, accentColor = NXT_CYAN, researchGoal = '' }) => {
    const [tab, setTab] = useState<LibraryTabId>('engagements');
    const [summary, setSummary] = useState<WikiLibrarySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selection, setSelection] = useState<LibrarySelection>(emptySelection);

    // Aggregate on open
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError('');
        aggregateWikiLibrary()
            .then(s => { setSummary(s); setLoading(false); })
            .catch(e => { setError(String(e?.message || e)); setLoading(false); });
    }, [isOpen]);

    // Reset selection when closing
    useEffect(() => {
        if (!isOpen) setSelection(emptySelection);
    }, [isOpen]);

    const selectionCount =
        selection.engagementSlugs.length +
        selection.themeClusterIds.length +
        selection.sourceArchivePaths.length +
        selection.socialSubreddits.length +
        selection.articleSources.length;

    // Rough cost-savings estimate based on selection.
    // Mirrors the pricing in wikiLibraryAggregator.estimateRegenerationCost.
    const estimatedSavings = useMemo(() => {
        if (!summary) return 0;
        let saved = 0;
        selection.engagementSlugs.forEach(slug => {
            const eng = summary.engagements.find(e => e.slug === slug);
            if (!eng) return;
            saved += 3 + 5;                          // themes + deliverables
            saved += eng.brief_count > 0 ? 8 : 0;    // briefs
        });
        // Themes / sources / social each save modest amounts (re-fetch cost)
        saved += selection.themeClusterIds.length * 0.05;
        saved += selection.sourceArchivePaths.length * 1.0;
        saved += selection.socialSubreddits.length * 0.5;
        return saved;
    }, [selection, summary]);

    const toggleEngagement = useCallback((slug: string) => {
        setSelection(prev => ({
            ...prev,
            engagementSlugs: prev.engagementSlugs.includes(slug)
                ? prev.engagementSlugs.filter(s => s !== slug)
                : [...prev.engagementSlugs, slug],
        }));
    }, []);
    const toggleTheme = useCallback((id: string) => {
        setSelection(prev => ({
            ...prev,
            themeClusterIds: prev.themeClusterIds.includes(id)
                ? prev.themeClusterIds.filter(s => s !== id)
                : [...prev.themeClusterIds, id],
        }));
    }, []);
    const toggleSource = useCallback((path: string) => {
        setSelection(prev => ({
            ...prev,
            sourceArchivePaths: prev.sourceArchivePaths.includes(path)
                ? prev.sourceArchivePaths.filter(s => s !== path)
                : [...prev.sourceArchivePaths, path],
        }));
    }, []);
    const toggleSocial = useCallback((sub: string) => {
        setSelection(prev => ({
            ...prev,
            socialSubreddits: prev.socialSubreddits.includes(sub)
                ? prev.socialSubreddits.filter(s => s !== sub)
                : [...prev.socialSubreddits, sub],
        }));
    }, []);
    const toggleArticleSource = useCallback((source: string) => {
        setSelection(prev => ({
            ...prev,
            articleSources: prev.articleSources.includes(source)
                ? prev.articleSources.filter(s => s !== source)
                : [...prev.articleSources, source],
        }));
    }, []);

    const handleApply = useCallback(() => {
        if (!summary || selectionCount === 0) return;
        onApply(selection, summary);
    }, [summary, selection, selectionCount, onApply]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 8000,
                background: 'rgba(13, 13, 13, 0.78)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Archivo', sans-serif",
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#FFFFFF',
                    width: 'min(1280px, 96vw)',
                    height: 'min(880px, 92vh)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1px solid ${accentColor}`,
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <Header
                    summary={summary}
                    accentColor={accentColor}
                    onClose={onClose}
                />

                {/* Tabs */}
                <Tabs tab={tab} setTab={setTab} summary={summary} accentColor={accentColor} />

                {/* Body */}
                <div style={{ flex: 1, overflow: 'auto', background: '#FAFAF7' }}>
                    {loading && (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#525252', fontSize: 13 }}>
                            <div style={{ marginBottom: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1, color: NXT_BLACK }}>
                                Scanning your wiki…
                            </div>
                            <div>Walking engagements, themes, sources, social intelligence, articles, and uploads.</div>
                        </div>
                    )}
                    {error && (
                        <div style={{ padding: '20px 24px', color: '#A0421F', background: '#FFF6F2', border: '1px solid #CC6644', margin: 20 }}>
                            Library scan failed: {error}
                        </div>
                    )}
                    {!loading && !error && summary && (
                        <>
                            {tab === 'engagements' && <EngagementsTab summary={summary} selection={selection} toggle={toggleEngagement} accentColor={accentColor} researchGoal={researchGoal} />}
                            {tab === 'themes' && <ThemesTab summary={summary} selection={selection} toggle={toggleTheme} accentColor={accentColor} researchGoal={researchGoal} />}
                            {tab === 'articles' && <ArticlesTab summary={summary} selection={selection} toggle={toggleArticleSource} accentColor={accentColor} researchGoal={researchGoal} />}
                            {tab === 'sources' && <SourcesTab summary={summary} selection={selection} toggle={toggleSource} accentColor={accentColor} researchGoal={researchGoal} />}
                            {tab === 'social' && <SocialTab summary={summary} selection={selection} toggle={toggleSocial} accentColor={accentColor} researchGoal={researchGoal} />}
                        </>
                    )}
                </div>

                {/* Footer — selection summary + apply */}
                <Footer
                    selectionCount={selectionCount}
                    estimatedSavings={estimatedSavings}
                    onClose={onClose}
                    onApply={handleApply}
                    accentColor={accentColor}
                />
            </div>
        </div>
    );
};

// =============================================================================
// Header / Tabs / Footer
// =============================================================================

const Header: React.FC<{ summary: WikiLibrarySummary | null; accentColor: string; onClose: () => void }> = ({ summary, accentColor, onClose }) => {
    const totalArticles = summary?.articles.total_articles || 0;
    const totalSocialPosts = summary?.social.reduce((s, b) => s + b.post_count, 0) || 0;
    return (
        <div style={{ padding: '18px 24px', borderBottom: `1px solid #E0E0E0`, background: NXT_BLACK, color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 2, color: accentColor }}>
                    KNOWLEDGE LIBRARY
                </div>
                <div style={{ fontSize: 11, color: '#CCC', marginTop: 4, maxWidth: 720 }}>
                    Everything your past research has produced. Select what you want this run to reuse — fresh data collection is always available too.
                </div>
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                {summary && (
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#999', textAlign: 'right', lineHeight: 1.5 }}>
                        <div>{summary.engagements.length} engagements · {summary.themes.length} theme clusters</div>
                        <div>{summary.sources.length} source archives · {totalSocialPosts} social posts · {totalArticles} cached articles</div>
                        <div style={{ color: accentColor, marginTop: 4 }}>
                            ≈ {formatUSD(summary.estimated_regeneration_cost_usd)} of cached intelligence
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close knowledge library"
                    style={{ background: 'transparent', border: '1px solid #444', color: '#FFF', fontSize: 18, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}
                >×</button>
            </div>
        </div>
    );
};

const TAB_DEFS: Array<{ id: LibraryTabId; label: string; countFn: (s: WikiLibrarySummary) => number }> = [
    { id: 'engagements', label: 'Engagements', countFn: s => s.engagements.length },
    { id: 'themes',      label: 'Themes',      countFn: s => s.themes.length },
    { id: 'articles',    label: 'Articles',    countFn: s => s.articles.total_articles },
    { id: 'sources',     label: 'Sources',     countFn: s => s.sources.length },
    { id: 'social',      label: 'Social',      countFn: s => s.social.reduce((n, b) => n + b.post_count, 0) },
];

const Tabs: React.FC<{ tab: LibraryTabId; setTab: (t: LibraryTabId) => void; summary: WikiLibrarySummary | null; accentColor: string }> = ({ tab, setTab, summary, accentColor }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0', background: '#F5F5F0' }}>
        {TAB_DEFS.map(t => {
            const count = summary ? t.countFn(summary) : 0;
            const active = tab === t.id;
            return (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    style={{
                        padding: '14px 24px',
                        background: active ? '#FFFFFF' : 'transparent',
                        border: 'none',
                        borderBottom: active ? `3px solid ${accentColor}` : '3px solid transparent',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: active ? NXT_BLACK : '#737373',
                        cursor: 'pointer',
                    }}
                >
                    {t.label} <span style={{ color: active ? accentColor : '#999', marginLeft: 6 }}>{count}</span>
                </button>
            );
        })}
    </div>
);

const Footer: React.FC<{ selectionCount: number; estimatedSavings: number; onClose: () => void; onApply: () => void; accentColor: string }> = ({ selectionCount, estimatedSavings, onClose, onApply, accentColor }) => (
    <div style={{ padding: '14px 24px', borderTop: '1px solid #E0E0E0', background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 12, color: '#525252' }}>
            {selectionCount === 0 ? (
                <span>Select cached items above to skip regeneration on your next run. Or close this panel and start fresh research as usual.</span>
            ) : (
                <span>
                    <strong style={{ color: NXT_BLACK }}>{selectionCount} cached item{selectionCount === 1 ? '' : 's'} selected</strong>
                    {estimatedSavings > 0 && (
                        <span style={{ marginLeft: 8, color: accentColor }}>
                            · estimated savings on next run ≈ {formatUSD(estimatedSavings)}
                        </span>
                    )}
                </span>
            )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
            <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', background: 'transparent', color: '#525252', border: '1px solid #DDD', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Archivo', sans-serif" }}
            >
                Close
            </button>
            <button
                type="button"
                onClick={onApply}
                disabled={selectionCount === 0}
                style={{
                    padding: '8px 18px',
                    background: selectionCount === 0 ? '#E8E8E8' : NXT_BLACK,
                    color: selectionCount === 0 ? '#999' : accentColor,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    cursor: selectionCount === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: "'Archivo', sans-serif",
                }}
            >
                Use selected on next run
            </button>
        </div>
    </div>
);

// =============================================================================
// Tab bodies
// =============================================================================

const EngagementsTab: React.FC<{ summary: WikiLibrarySummary; selection: LibrarySelection; toggle: (slug: string) => void; accentColor: string; researchGoal?: string }> = ({ summary, selection, toggle, accentColor, researchGoal }) => {
    const [query, setQuery] = useState('');
    const goalIsSet = !!(researchGoal && researchGoal.trim().length >= 8);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const scored = summary.engagements.map(e => ({
            eng: e,
            relevance: goalIsSet ? scoreEngagementRelevance(e, researchGoal!) : 0,
        }));
        return scored
            .filter(({ eng: e }) => {
                if (!q) return true;
                return (
                    e.research_goal.toLowerCase().includes(q) ||
                    (e.brand || '').toLowerCase().includes(q) ||
                    e.slug.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                if (goalIsSet && a.relevance !== b.relevance) return b.relevance - a.relevance;
                return (b.eng.updated_at || '').localeCompare(a.eng.updated_at || '');
            });
    }, [summary.engagements, query, researchGoal, goalIsSet]);
    const relevantCount = useMemo(
        () => filtered.filter(s => s.relevance >= RELEVANCE_HIGH).length,
        [filtered],
    );
    if (summary.engagements.length === 0) {
        return <EmptyState message="No prior engagements yet — your first research run will start populating this library." />;
    }
    return (
        <div>
            <FilterBar
                query={query}
                onQueryChange={setQuery}
                placeholder={`Search ${summary.engagements.length} engagements by goal, brand, or slug…`}
                accentColor={accentColor}
            />
            {goalIsSet && relevantCount > 0 && (
                <div style={{ padding: '8px 20px', background: '#FAFCFD', borderBottom: `1px solid ${accentColor}`, fontSize: 12, color: NXT_BLACK, fontFamily: "'Archivo', sans-serif" }}>
                    <strong style={{ color: accentColor }}>★ {relevantCount} prior engagement{relevantCount === 1 ? '' : 's'} match your current research goal.</strong> Sorted to the top.
                </div>
            )}
            <div style={{ padding: '0 20px 8px', fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
                {filtered.length} of {summary.engagements.length} engagements shown
            </div>
            {filtered.length === 0 ? (
                <EmptyState message="No engagements match that search." />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14, padding: '0 20px 20px' }}>
                    {filtered.map(({ eng, relevance }) => {
                        const selected = selection.engagementSlugs.includes(eng.slug);
                        const isRelevant = relevance >= RELEVANCE_HIGH;
                        return (
                            <SelectableCard key={eng.slug} selected={selected} onToggle={() => toggle(eng.slug)} accentColor={accentColor}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                                    {isRelevant && <div style={{ position: 'absolute', top: -8, left: 10, zIndex: 1 }}><RelevantBadge score={relevance} accentColor={accentColor} /></div>}
                                    {eng.brand && (
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>
                                            {eng.brand}
                                        </span>
                                    )}
                                    {eng.updated_at && (
                                        <span style={{ fontSize: 10, color: '#888' }}>{new Date(eng.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    )}
                                </div>
                                <div style={{ fontSize: 13, color: NXT_BLACK, lineHeight: 1.4, marginBottom: 8, fontWeight: 600 }}>
                                    {eng.research_goal}
                                </div>
                                <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#525252', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {eng.brief_count > 0 && <span>{eng.brief_count} brief{eng.brief_count === 1 ? '' : 's'}</span>}
                                    {eng.prototype_count > 0 && <span>· {eng.prototype_count} prototype{eng.prototype_count === 1 ? '' : 's'}</span>}
                                    {typeof eng.cost_usd_total === 'number' && eng.cost_usd_total > 0 && (
                                        <span style={{ marginLeft: 'auto', color: accentColor }}>≈ {formatUSD(eng.cost_usd_total)}</span>
                                    )}
                                </div>
                            </SelectableCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative' | 'mixed';

const ThemesTab: React.FC<{ summary: WikiLibrarySummary; selection: LibrarySelection; toggle: (id: string) => void; accentColor: string; researchGoal?: string }> = ({ summary, selection, toggle, accentColor, researchGoal }) => {
    const [query, setQuery] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
    const [engagementFilter, setEngagementFilter] = useState<string>('all');
    const [onlyRelevant, setOnlyRelevant] = useState(false);

    // Distinct engagement goals across all themes — used to build the chip
    // filter so users can isolate "themes from THIS engagement only".
    const engagementGoals = useMemo(() => {
        const set = new Set<string>();
        summary.themes.forEach(t => { if (t.source_engagement_goal) set.add(t.source_engagement_goal); });
        return Array.from(set);
    }, [summary.themes]);

    const goalIsSet = !!(researchGoal && researchGoal.trim().length >= 8);

    // Score each theme against the research goal (0 when no goal).
    const scored = useMemo(() => {
        return summary.themes.map(t => ({
            theme: t,
            relevance: goalIsSet ? scoreThemeRelevance(t, researchGoal!) : 0,
        }));
    }, [summary.themes, researchGoal, goalIsSet]);

    const relevantCount = useMemo(
        () => scored.filter(s => s.relevance >= RELEVANCE_HIGH).length,
        [scored],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scored
            .filter(({ theme: t, relevance }) => {
                if (sentimentFilter !== 'all' && t.sentiment !== sentimentFilter) return false;
                if (engagementFilter !== 'all' && t.source_engagement_goal !== engagementFilter) return false;
                if (onlyRelevant && relevance < RELEVANCE_HIGH) return false;
                if (q) {
                    const hay = `${t.name} ${t.summary} ${t.top_terms.map(tt => tt.term).join(' ')}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            })
            // Goal-aware: items with relevance >= MED bubble to top,
            // sorted by relevance descending. Below that, fall back to
            // the existing post-count order.
            .sort((a, b) => {
                if (goalIsSet) {
                    if (a.relevance !== b.relevance) return b.relevance - a.relevance;
                }
                return b.theme.post_count - a.theme.post_count;
            });
    }, [scored, query, sentimentFilter, engagementFilter, onlyRelevant, goalIsSet]);

    if (summary.themes.length === 0) {
        return <EmptyState message="No theme clusters cached yet. Themes are synthesized after each research run — they'll appear here once you've completed a synthesis." />;
    }

    return (
        <div>
            <FilterBar
                query={query}
                onQueryChange={setQuery}
                placeholder={`Search ${summary.themes.length} themes by name, summary, or term…`}
                accentColor={accentColor}
            >
                <SentimentChips value={sentimentFilter} onChange={setSentimentFilter} accentColor={accentColor} themes={summary.themes} />
                {engagementGoals.length > 1 && (
                    <EngagementSelect value={engagementFilter} onChange={setEngagementFilter} options={engagementGoals} />
                )}
            </FilterBar>
            {goalIsSet && relevantCount > 0 && (
                <div style={{ padding: '8px 20px', background: '#FAFCFD', borderBottom: `1px solid ${accentColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontFamily: "'Archivo', sans-serif" }}>
                    <span style={{ fontSize: 12, color: NXT_BLACK }}>
                        <strong style={{ color: accentColor }}>★ {relevantCount} theme{relevantCount === 1 ? '' : 's'} match your current research goal.</strong> Sorted to the top.
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#525252', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={onlyRelevant}
                            onChange={e => setOnlyRelevant(e.target.checked)}
                            style={{ accentColor }}
                        />
                        Show only relevant
                    </label>
                </div>
            )}
            <div style={{ padding: '0 20px 8px', fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
                {filtered.length} of {summary.themes.length} {filtered.length === 1 ? 'theme' : 'themes'} shown
                {(query || sentimentFilter !== 'all' || engagementFilter !== 'all' || onlyRelevant) && (
                    <button
                        type="button"
                        onClick={() => { setQuery(''); setSentimentFilter('all'); setEngagementFilter('all'); setOnlyRelevant(false); }}
                        style={{ marginLeft: 12, background: 'transparent', border: 'none', color: accentColor, cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}
                    >
                        Clear filters
                    </button>
                )}
            </div>
            {filtered.length === 0 ? (
                <EmptyState message="No themes match those filters. Try a different search term or clear filters above." />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, padding: 20 }}>
                    {filtered.map(({ theme: t, relevance }) => {
                        const selected = selection.themeClusterIds.includes(t.id);
                        const isRelevant = relevance >= RELEVANCE_HIGH;
                        return (
                            <SelectableCard key={t.id} selected={selected} onToggle={() => toggle(t.id)} accentColor={accentColor} leftBorderColor={sentimentColor(t.sentiment)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: sentimentColor(t.sentiment), letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                                        {t.sentiment}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {isRelevant && <RelevantBadge score={relevance} accentColor={accentColor} />}
                                        <span style={{ fontSize: 10, color: '#888' }}>{t.post_count} post{t.post_count === 1 ? '' : 's'}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: NXT_BLACK, fontWeight: 600, lineHeight: 1.35, marginBottom: 6 }}>
                                    {t.name}
                                </div>
                                {t.summary && (
                                    <div style={{ fontSize: 11, color: '#525252', lineHeight: 1.45, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                                        {t.summary}
                                    </div>
                                )}
                                {t.top_terms.length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                        {t.top_terms.slice(0, 6).map((tt, i) => (
                                            <span
                                                key={`${tt.term}-${i}`}
                                                title={typeof tt.score === 'number' ? `relevance ${(tt.score * 100).toFixed(1)}%` : tt.term}
                                                style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", background: '#F0F0F0', color: '#525252', padding: '2px 8px', borderRadius: 2 }}
                                            >
                                                {tt.term}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, fontSize: 9, color: '#888', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {t.source_engagement_goal && (
                                        <span title={t.source_engagement_goal} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            from: {t.source_engagement_goal.length > 38 ? t.source_engagement_goal.slice(0, 35) + '…' : t.source_engagement_goal}
                                        </span>
                                    )}
                                    {typeof t.duplicate_count === 'number' && t.duplicate_count > 0 && (
                                        <span style={{ color: accentColor }}>+{t.duplicate_count} more</span>
                                    )}
                                </div>
                            </SelectableCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// Filter primitives
// =============================================================================

const FilterBar: React.FC<{ query: string; onQueryChange: (v: string) => void; placeholder: string; accentColor: string; children?: React.ReactNode }> = ({ query, onQueryChange, placeholder, accentColor, children }) => (
    <div style={{ padding: '14px 20px 10px', background: '#FFFFFF', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={placeholder}
            style={{
                flex: '1 1 320px',
                minWidth: 240,
                padding: '8px 12px',
                border: `1px solid #DDD`,
                fontSize: 12,
                fontFamily: "'Archivo', sans-serif",
                outline: 'none',
                background: '#FAFAF7',
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = accentColor; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#DDD'; }}
        />
        {children}
    </div>
);

const SentimentChips: React.FC<{ value: SentimentFilter; onChange: (v: SentimentFilter) => void; accentColor: string; themes: LibraryThemeCluster[] }> = ({ value, onChange, accentColor, themes }) => {
    const counts = useMemo(() => {
        const c: Record<SentimentFilter, number> = { all: themes.length, positive: 0, neutral: 0, negative: 0, mixed: 0 };
        themes.forEach(t => {
            if (t.sentiment in c) c[t.sentiment as SentimentFilter]++;
        });
        return c;
    }, [themes]);
    const options: Array<{ id: SentimentFilter; label: string }> = [
        { id: 'all', label: 'All' },
        { id: 'positive', label: 'Positive' },
        { id: 'neutral', label: 'Neutral' },
        { id: 'negative', label: 'Negative' },
        { id: 'mixed', label: 'Mixed' },
    ];
    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {options.map(o => {
                const active = value === o.id;
                const accent = o.id === 'all' ? accentColor : sentimentColor(o.id);
                return (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => onChange(o.id)}
                        style={{
                            padding: '5px 11px',
                            background: active ? accent : 'transparent',
                            color: active ? '#FFFFFF' : (counts[o.id] === 0 ? '#CCC' : '#525252'),
                            border: `1px solid ${active ? accent : '#DDD'}`,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            cursor: counts[o.id] === 0 ? 'not-allowed' : 'pointer',
                            fontFamily: "'Archivo', sans-serif",
                        }}
                        disabled={counts[o.id] === 0}
                    >
                        {o.label} <span style={{ marginLeft: 4, opacity: 0.7 }}>{counts[o.id]}</span>
                    </button>
                );
            })}
        </div>
    );
};

const EngagementSelect: React.FC<{ value: string; onChange: (v: string) => void; options: string[] }> = ({ value, onChange, options }) => (
    <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
            padding: '6px 10px',
            border: '1px solid #DDD',
            background: '#FAFAF7',
            fontSize: 11,
            fontFamily: "'Archivo', sans-serif",
            color: '#525252',
            maxWidth: 280,
        }}
    >
        <option value="all">All engagements ({options.length})</option>
        {options.map(g => (
            <option key={g} value={g}>{g.length > 60 ? g.slice(0, 57) + '…' : g}</option>
        ))}
    </select>
);

const SourcesTab: React.FC<{ summary: WikiLibrarySummary; selection: LibrarySelection; toggle: (path: string) => void; accentColor: string; researchGoal?: string }> = ({ summary, selection, toggle, accentColor, researchGoal }) => {
    const [query, setQuery] = useState('');
    const goalIsSet = !!(researchGoal && researchGoal.trim().length >= 8);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const scored = summary.sources.map(s => ({
            source: s,
            relevance: goalIsSet ? scoreSourceRelevance(s, researchGoal!) : 0,
        }));
        return scored
            .filter(({ source: s }) => {
                if (!q) return true;
                return (
                    (s.engagement_goal || '').toLowerCase().includes(q) ||
                    (s.name || '').toLowerCase().includes(q) ||
                    s.source_archive_path.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                if (goalIsSet && a.relevance !== b.relevance) return b.relevance - a.relevance;
                return b.source.item_count - a.source.item_count;
            });
    }, [summary.sources, query, researchGoal, goalIsSet]);
    const relevantCount = useMemo(
        () => filtered.filter(s => s.relevance >= RELEVANCE_HIGH).length,
        [filtered],
    );
    if (summary.sources.length === 0) {
        return <EmptyState message="No source archives cached yet. Each completed research run archives the sources it pulled from." />;
    }
    return (
        <div>
            <FilterBar
                query={query}
                onQueryChange={setQuery}
                placeholder={`Search ${summary.sources.length} source archives by engagement goal or name…`}
                accentColor={accentColor}
            />
            {goalIsSet && relevantCount > 0 && (
                <div style={{ padding: '8px 20px', background: '#FAFCFD', borderBottom: `1px solid ${accentColor}`, fontSize: 12, color: NXT_BLACK, fontFamily: "'Archivo', sans-serif" }}>
                    <strong style={{ color: accentColor }}>★ {relevantCount} source archive{relevantCount === 1 ? '' : 's'} match your current research goal.</strong> Sorted to the top.
                </div>
            )}
            <div style={{ padding: '0 20px 8px', fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
                {filtered.length} of {summary.sources.length} archives shown
            </div>
            {filtered.length === 0 ? (
                <EmptyState message="No source archives match that search. Try a different term." />
            ) : (
                <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(({ source: s, relevance }) => {
                        const selected = selection.sourceArchivePaths.includes(s.source_archive_path);
                        const isRelevant = relevance >= RELEVANCE_HIGH;
                        return (
                            <SelectableRow key={s.source_archive_path} selected={selected} onToggle={() => toggle(s.source_archive_path)} accentColor={accentColor}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            {isRelevant && <RelevantBadge score={relevance} accentColor={accentColor} />}
                                            <div style={{ fontSize: 12, color: NXT_BLACK, fontWeight: 600, lineHeight: 1.35 }}>
                                                {s.engagement_goal || s.name}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }}>
                                            {s.source_archive_path}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                                        <div style={{ fontSize: 18, color: accentColor, fontWeight: 700 }}>{s.item_count}</div>
                                        <div style={{ fontSize: 8, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>items</div>
                                    </div>
                                </div>
                            </SelectableRow>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const SocialTab: React.FC<{ summary: WikiLibrarySummary; selection: LibrarySelection; toggle: (sub: string) => void; accentColor: string; researchGoal?: string }> = ({ summary, selection, toggle, accentColor, researchGoal }) => {
    const [query, setQuery] = useState('');
    const goalIsSet = !!(researchGoal && researchGoal.trim().length >= 8);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const scored = summary.social.map(b => ({
            bucket: b,
            relevance: goalIsSet ? scoreSocialRelevance(b, researchGoal!) : 0,
        }));
        return scored
            .filter(({ bucket: b }) => {
                if (!q) return true;
                return b.subreddit.toLowerCase().includes(q) || b.sample_titles.some(t => t.toLowerCase().includes(q));
            })
            .sort((a, b) => {
                if (goalIsSet && a.relevance !== b.relevance) return b.relevance - a.relevance;
                return b.bucket.post_count - a.bucket.post_count;
            });
    }, [summary.social, query, researchGoal, goalIsSet]);
    const relevantCount = useMemo(
        () => filtered.filter(s => s.relevance >= RELEVANCE_HIGH).length,
        [filtered],
    );
    if (summary.social.length === 0) {
        return <EmptyState message="No social intelligence cached yet. Deep Reddit fetches will populate this once a research run includes them." />;
    }
    return (
        <div>
            <FilterBar
                query={query}
                onQueryChange={setQuery}
                placeholder={`Search ${summary.social.length} subreddits by name or sample post title…`}
                accentColor={accentColor}
            />
            {goalIsSet && relevantCount > 0 && (
                <div style={{ padding: '8px 20px', background: '#FAFCFD', borderBottom: `1px solid ${accentColor}`, fontSize: 12, color: NXT_BLACK, fontFamily: "'Archivo', sans-serif" }}>
                    <strong style={{ color: accentColor }}>★ {relevantCount} subreddit{relevantCount === 1 ? '' : 's'} match your current research goal.</strong> Sorted to the top.
                </div>
            )}
            <div style={{ padding: '0 20px 8px', fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
                {filtered.length} of {summary.social.length} subreddits shown
            </div>
            {filtered.length === 0 ? (
                <EmptyState message="No subreddits match that search." />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, padding: '0 20px 20px' }}>
                    {filtered.map(({ bucket: b, relevance }) => {
                        const selected = selection.socialSubreddits.includes(b.subreddit);
                        const isRelevant = relevance >= RELEVANCE_HIGH;
                        return (
                            <SelectableCard key={b.subreddit} selected={selected} onToggle={() => toggle(b.subreddit)} accentColor={accentColor} leftBorderColor={NXT_CYAN}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8 }}>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: NXT_BLACK, fontWeight: 700 }}>
                                        r/{b.subreddit}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {isRelevant && <RelevantBadge score={relevance} accentColor={accentColor} />}
                                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: accentColor }}>
                                            {b.post_count}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                                    posts deeply fetched with comment trees
                                </div>
                                {b.sample_titles.length > 0 && (
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#525252', lineHeight: 1.4 }}>
                                        {b.sample_titles.map((t, i) => (
                                            <li key={i} style={{ marginBottom: 2 }}>{t}</li>
                                        ))}
                                    </ul>
                                )}
                            </SelectableCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// 2026-05-14 — ArticlesTab. The 1,388 cached articles (jina-reader, RAG
// client-uploads, deep-research pulls, YouTube transcripts, theme syntheses)
// are now first-class browsable + selectable. Each source folder becomes a
// bucket card the researcher can pick to fold its markdown bodies into the
// next run's corpus.
const ArticlesTab: React.FC<{ summary: WikiLibrarySummary; selection: LibrarySelection; toggle: (source: string) => void; accentColor: string; researchGoal?: string }> = ({ summary, selection, toggle, accentColor, researchGoal }) => {
    const [query, setQuery] = useState('');
    const buckets = summary.articles.buckets || [];
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return buckets;
        return buckets.filter(b =>
            b.source.toLowerCase().includes(q) ||
            b.label.toLowerCase().includes(q) ||
            b.sample_titles.some(t => t.toLowerCase().includes(q))
        );
    }, [buckets, query]);
    if (buckets.length === 0) {
        return <EmptyState message="No cached articles yet — they accumulate as you run research, ingest sources, or upload RAG documents." />;
    }
    const grandTotal = summary.articles.total_articles;
    return (
        <div>
            <FilterBar
                query={query}
                onQueryChange={setQuery}
                placeholder={`Search ${buckets.length} article buckets (${grandTotal} files) by source or sample title…`}
                accentColor={accentColor}
            />
            <div style={{ padding: '8px 20px', borderBottom: `1px solid ${accentColor}40`, background: '#FFFCEC', fontSize: 12, color: NXT_BLACK, fontFamily: "'Archivo', sans-serif" }}>
                <strong style={{ color: accentColor }}>{grandTotal.toLocaleString()} cached articles</strong> across {buckets.length} source buckets — includes Jina extracts, RAG client uploads, deep-research pulls, YouTube transcripts, and prior theme syntheses.
            </div>
            <div style={{ padding: '8px 20px 8px', fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>
                {filtered.length} of {buckets.length} buckets shown
            </div>
            {filtered.length === 0 ? (
                <EmptyState message="No buckets match that search." />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, padding: '0 20px 20px' }}>
                    {filtered.map(b => {
                        const selected = selection.articleSources.includes(b.source);
                        const isRag = b.source === 'client-uploads';
                        return (
                            <SelectableCard key={b.source} selected={selected} onToggle={() => toggle(b.source)} accentColor={accentColor} leftBorderColor={isRag ? accentColor : '#888'}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
                                    <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: 13, color: NXT_BLACK, fontWeight: 700, lineHeight: 1.3 }}>
                                        {b.label}
                                    </span>
                                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: accentColor, flexShrink: 0 }}>
                                        {b.article_count.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                    {isRag ? 'RAG uploaded documents' : 'articles · markdown bodies'} · {b.source}
                                </div>
                                {b.sample_titles.length > 0 && (
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#525252', lineHeight: 1.4 }}>
                                        {b.sample_titles.map((t, i) => (
                                            <li key={i} style={{ marginBottom: 2 }}>{t}</li>
                                        ))}
                                    </ul>
                                )}
                            </SelectableCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// Selection primitives
// =============================================================================

const SelectableCard: React.FC<{ selected: boolean; onToggle: () => void; accentColor: string; leftBorderColor?: string; children: React.ReactNode }> = ({ selected, onToggle, accentColor, leftBorderColor, children }) => (
    <button
        type="button"
        onClick={onToggle}
        style={{
            background: selected ? '#FFFFFF' : '#F5F5F0',
            border: selected ? `1px solid ${accentColor}` : '1px solid #E5E5E5',
            borderLeft: leftBorderColor ? `3px solid ${leftBorderColor}` : (selected ? `3px solid ${accentColor}` : '1px solid #E5E5E5'),
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: "'Archivo', sans-serif",
            position: 'relative',
            boxShadow: selected ? `0 0 0 1px ${accentColor}` : 'none',
        }}
    >
        <span style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 14,
            height: 14,
            border: selected ? `1px solid ${accentColor}` : '1px solid #BBB',
            background: selected ? accentColor : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 10,
            lineHeight: 1,
        }}>{selected ? '✓' : ''}</span>
        {children}
    </button>
);

const SelectableRow: React.FC<{ selected: boolean; onToggle: () => void; accentColor: string; children: React.ReactNode }> = ({ selected, onToggle, accentColor, children }) => (
    <button
        type="button"
        onClick={onToggle}
        style={{
            background: selected ? '#FFFFFF' : '#F5F5F0',
            border: selected ? `1px solid ${accentColor}` : '1px solid #E5E5E5',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: "'Archivo', sans-serif",
        }}
    >
        <span style={{
            width: 14,
            height: 14,
            border: selected ? `1px solid ${accentColor}` : '1px solid #BBB',
            background: selected ? accentColor : 'transparent',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 10,
            lineHeight: 1,
        }}>{selected ? '✓' : ''}</span>
        {children}
    </button>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div style={{ padding: '60px 40px', textAlign: 'center', color: '#737373', fontSize: 13, lineHeight: 1.5, maxWidth: 560, margin: '0 auto' }}>
        {message}
    </div>
);
