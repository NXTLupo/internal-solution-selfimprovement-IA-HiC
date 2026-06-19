/**
 * ResearchBrowser.tsx - unified Research Browser surface.
 *
 * Replaces the analytic-split between Themes and Topics with a single
 * sentiment-column card lattice. Frame toggle lets the user choose
 * (Themes | Topics | Merged); filter state is shared with the Knowledge
 * Graph treemap via services/researchBrowserState. Every card carries
 * click-through chips to the wiki page + the external source URL +
 * a copy-chunk-pointer button - closes the audit's Gap H.
 *
 * Composes with:
 *   - components/ResearchCard.tsx (per-card anatomy)
 *   - services/researchBrowserState.ts (filter + frame + sort)
 *   - AnalystDeskKnowledgeGraph.tsx (mounted as a tab)
 *   - WikiArticleViewer (click-through target for wiki paths)
 *   - CorpusChatPanel.prefillFromChunkPointer (Chat about this CTA)
 */
import React, { useMemo } from 'react';
import {
    useResearchBrowserState,
    type ResearchFrame,
    type SentimentFilter,
} from '../services/researchBrowserState';
import {
    ResearchCard,
    type ResearchCardItem,
    type QuoteEvidence,
} from './ResearchCard';

export interface ResearchBrowserProps {
    /** Themes payload from App.tsx state (themesResult.themes or themesResult.data.themes). */
    themes?: any[];
    /** Topic-model payload (topicModelResult.topics). */
    topics?: any[];
    /** Engagement slug - used for "open wiki" path resolution and Chat-about-this prefill. */
    engagementSlug?: string;
    /** Called when user clicks a wiki-page chip on a quote. */
    onOpenWiki: (wikiPath: string, chunkPointer?: string) => void;
    /** Called when user clicks "Chat about this →" on a card. */
    onOpenChat: (chunkPointers: string[], titleHint: string) => void;
    /** Called when user clicks "+ Deck" on a card. */
    onAddToDeck?: (item: ResearchCardItem) => void;
    /** Called when user clicks "+ Inspect" on a card. */
    onInspect?: (item: ResearchCardItem) => void;
}

/**
 * 2026-06-06 - Derive sentiment from theme content when the wiki payload
 * lacks an explicit `sentiment` field. The themes.json shape committed by
 * the LLM never carries sentiment, so defaulting to 'mixed' previously
 * dumped all 27 themes into the MIXED column (the bug the user is hitting
 * right now). The polarity lexicon below scores name + description + quote
 * for negative vs positive tells; balanced or zero-signal themes get
 * 'neutral' (not 'mixed') so the column distribution reflects real signal.
 *
 * 'mixed' is reserved for themes that explicitly contain BOTH polarities
 * (e.g., a contradictions[] array, or a theme name with paradox/tension/
 * trade-off language).
 */
const NEG_TERMS = [
    'fatigue', 'stagnation', 'frustration', 'frustrated', 'decline', 'declining', 'fail', 'failing', 'failed',
    'broken', 'struggle', 'struggling', 'gap', 'crisis', 'barrier', 'friction', 'churn', 'drop', 'dropping',
    'lack', 'lacking', 'loss', 'losing', 'abandon', 'abandoning', 'exhaustion', 'isolation', 'burnout',
    'fragmented', 'fragmentation', 'bottleneck', 'outdated', 'ineffective', 'saturated', 'volatility',
    'threat', 'threatening', 'risk', 'risky', 'fear', 'feared', 'unsafe', 'inequity', 'inequality',
    'erosion', 'eroding', 'shrink', 'shrinking', 'distrust', 'mistrust', 'broken', 'collapse', 'collapsing',
    'cant', "can't", 'unable', 'insufficient', 'inadequate', 'overwhelm', 'overwhelmed', 'overwhelming',
    'reject', 'rejected', 'rejection', 'frustrating', 'difficult', 'hard', 'painful', 'pain', 'paywall',
    'block', 'blocked', 'blocker', 'stuck', 'never', 'no longer', 'no upward', 'underemployed', 'precarious',
    'precarity', 'displacement', 'displaced', 'unemployment', 'unemployed', 'replaced by ai', 'replacing humans',
    'isolate', 'isolating', 'lonely', 'loneliness', 'anxiety', 'anxious', 'distrust', 'angry', 'anger',
    'broken', 'crisis', 'noise', 'flooded', 'saturated',
];

const POS_TERMS = [
    'growth', 'opportunity', 'opportunities', 'success', 'successful', 'innovation', 'innovative',
    'momentum', 'breakthrough', 'win', 'winning', 'gain', 'gains', 'rise', 'rising', 'thriving',
    'thrive', 'sovereign', 'autonomy', 'autonomous', 'empowerment', 'empower', 'empowered',
    'flourish', 'flourishing', 'unlock', 'unlocking', 'enable', 'enabling', 'enabled',
    'accelerate', 'acceleration', 'efficient', 'efficiency', 'productive', 'productivity',
    'modernize', 'modernizing', 'modernization', 'automation', 'automate', 'progress', 'progressing',
    'breakthrough', 'leader', 'leading', 'leadership', 'champion', 'master', 'mastery',
    'satisfaction', 'satisfied', 'happy', 'happier', 'trust', 'trusted', 'confidence', 'confident',
    'love', 'loved', 'value', 'valuable', 'benefit', 'beneficial', 'support', 'supported',
    'community', 'collaboration', 'collaborate', 'connect', 'connected', 'belonging', 'inclusive',
    'inclusion', 'access', 'accessible', 'opportunity-rich', 'emerging', 'scaling', 'scalable',
];

// Words that signal an internal tension or contradiction - true 'mixed' sentiment.
const MIXED_TERMS = [
    'paradox', 'tension', 'tradeoff', 'trade-off', 'trade off', 'dilemma', 'dual', 'duality',
    'both/and', 'simultaneously', 'on one hand', 'on the other hand', 'contradiction', 'contradictory',
    'ambivalence', 'ambivalent', 'mixed', 'love-hate', 'hybrid',
];

// 2026-06-08 — Problem-title guard. A theme whose NAME contains a problem word
// ("Challenges", "Struggles", "Barriers", "Rejections", "Gap", "Friction"...) is
// about a problem and must NEVER land in POSITIVE. The cached cluster sentiment
// (BERTopic VADER scored on representative posts) frequently mislabels these as
// positive because the underlying posts contain aspirational words ("value",
// "opportunity", "success"). Title semantics override that mislabel, capping such
// themes at 'mixed'. (The user's report: "First-Year Career and Co-op Challenges"
// rendered as POSITIVE.)
const PROBLEM_TITLE_RE = /(challeng|struggl|barrier|reject|block|\bfail|\bgap\b|friction|confus|anxiet|stress|burnout|ghost|exploit|denial|denied|\black\b|crisis|hurdle|obstacle|difficult|frustrat|penal|disadvantag|exclu|threat|\brisk|\bdebt|misalign|\bhidden|unclear|opaque|prohibit|forfeit|delay)/i;

function deriveSentiment(t: any): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const name = String(t.name || t.title || '');
    const titleIsProblem = PROBLEM_TITLE_RE.test(name);

    // Honor explicit field first — but a problem-titled theme can never be
    // POSITIVE/NEUTRAL; downgrade those mislabels to 'mixed'.
    const explicit = String(t.sentiment || t.dominant_sentiment || '').toLowerCase();
    if (['positive', 'negative', 'neutral', 'mixed'].includes(explicit)) {
        if (titleIsProblem && (explicit === 'positive' || explicit === 'neutral')) return 'mixed';
        return explicit as any;
    }

    // Real contradictions array means actual mixed signal.
    if (Array.isArray(t.contradictions) && t.contradictions.length > 0) return 'mixed';

    const hay = [
        name,
        String(t.description || t.summary || ''),
        String(t.quote || t.key_quote || ''),
    ].join(' ').toLowerCase();

    if (!hay.trim()) return titleIsProblem ? 'mixed' : 'neutral';

    // Mixed-signal tells override polarity scoring.
    for (const m of MIXED_TERMS) if (hay.includes(m)) return 'mixed';

    let neg = 0;
    let pos = 0;
    for (const w of NEG_TERMS) if (hay.includes(w)) neg++;
    for (const w of POS_TERMS) if (hay.includes(w)) pos++;

    if (neg === 0 && pos === 0) return titleIsProblem ? 'mixed' : 'neutral';
    // Both polarities present in roughly equal weight - true mixed.
    if (neg > 0 && pos > 0 && Math.abs(neg - pos) <= 1) return 'mixed';
    if (neg > pos) return 'negative';
    if (pos > neg) return titleIsProblem ? 'mixed' : 'positive';  // problem title can't be positive
    return 'neutral';
}

// Map theme/topic shapes into the unified ResearchCardItem shape.
// 2026-06-08 - Clean placeholder / raw-ID titles so the unified Browser never
// shows "topics-tm_...#41" or "Cluster 45" as a card heading. When the raw title is
// a pointer or a default BERTopic label, derive a readable label from the top
// terms, else the summary's first clause, else a generic fallback.
function cleanTitle(raw: string, topTerms: string[], summary: string, fallback: string): string {
    const s = (raw || '').trim();
    const isPlaceholder = !s || /^topics?[-_]tm_|\.json#\d+$|#c?\d+$|^cluster\s*[-_]?\s*\d+$|^topic\s+\d+$|^theme\s+\d+$/i.test(s);
    if (!isPlaceholder) return s;
    const terms = (topTerms || []).filter(Boolean).slice(0, 4);
    if (terms.length >= 2) return terms.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' / ');
    const clause = (summary || '').trim().split(/[.;:]/)[0].trim();
    if (clause.length >= 6) return clause.slice(0, 70);
    return fallback;
}

function normalizeTheme(t: any, idx: number): ResearchCardItem {
    const quotes: QuoteEvidence[] = [];
    const tQuote = t.quote || t.key_quote;
    if (tQuote && typeof tQuote === 'string') {
        quotes.push({
            text: tQuote,
            sourceLabel: (t.citations?.[0]?.sourceName) || t.source || 'unattributed',
            sourceDate: t.citations?.[0]?.date || '',
            externalUrl: t.citations?.[0]?.url || '',
            wikiPath: t.citations?.[0]?.wikiPath || t.citations?.[0]?.sourceFile || '',
            chunkPointer: t.citations?.[0]?.chunkPointer || '',
        });
    }
    // Pull additional quotes from citations[] if rich.
    const citationArr = Array.isArray(t.citations) ? t.citations : [];
    for (let i = 1; i < Math.min(citationArr.length, 4); i++) {
        const c = citationArr[i];
        if (c?.text) quotes.push({
            text: c.text,
            sourceLabel: c.sourceName || '',
            sourceDate: c.date || '',
            externalUrl: c.url || '',
            wikiPath: c.wikiPath || c.sourceFile || '',
            chunkPointer: c.chunkPointer || '',
        });
    }
    // 2026-06-06 - Derive sentiment from theme content. Themes from the
    // wiki almost never carry an explicit sentiment field; previously this
    // defaulted to 'mixed' and dumped every theme into MIXED column. The
    // lexicon-based deriveSentiment() scores name+description+quote.
    const sentiment = deriveSentiment(t);
    const source = (t.source && ['cached', 'extended', 'new'].includes(t.source)) ? t.source : undefined;
    // 2026-06-07 - carry the Pass-2 DEPTH fields the renderer used to drop.
    // Shapes vary (string OR {name,description} OR {text}); flatten defensively.
    const flatten = (arr: any): string[] => {
        if (!Array.isArray(arr)) return [];
        return arr.map((x: any) => {
            if (typeof x === 'string') return x;
            if (x && typeof x === 'object') {
                const name = x.name || x.title || x.label || '';
                const desc = x.description || x.detail || x.text || '';
                return [name, desc].filter(Boolean).join(name && desc ? ': ' : '');
            }
            return '';
        }).filter(Boolean);
    };
    const firstStr = (arr: any): string => {
        if (typeof arr === 'string') return arr;
        if (Array.isArray(arr) && arr.length) {
            const x = arr[0];
            return typeof x === 'string' ? x : (x?.description || x?.text || x?.summary || '');
        }
        if (arr && typeof arr === 'object') return arr.summary || arr.description || '';
        return '';
    };
    const interpretation = Array.isArray(t.interpretation)
        ? t.interpretation.filter((s: any) => typeof s === 'string')
        : (typeof t.interpretation === 'string' ? [t.interpretation] : []);
    const depth = {
        interpretation,
        subThemes: flatten(t.subThemes),
        contradiction: firstStr(t.contradictions),
        temporalArc: firstStr(t.temporalArc),
        dimensions: flatten(t.dimensions),
    };
    return {
        id: t.id || `theme-${idx}`,
        title: cleanTitle(
            String(t.name || t.title || ''),
            Array.isArray(t.top_terms) ? t.top_terms.map((x: any) => (typeof x === 'string' ? x : (x?.term || ''))).filter(Boolean) : [],
            String(t.description || t.summary || ''),
            `Theme ${idx + 1}`,
        ).slice(0, 200),
        summary: String(t.description || t.summary || ''),
        sentiment,
        frame: 'theme',
        source,
        relevance: typeof t.objectiveRelevance === 'number' ? t.objectiveRelevance
            : (typeof t?.metadata?.objectiveRelevance === 'number' ? t.metadata.objectiveRelevance
            : (typeof t.goalAlignment === 'number' ? t.goalAlignment : undefined)),
        quotes,
        topTerms: Array.isArray(t.top_terms) ? t.top_terms.map((tt: any) => (typeof tt === 'string' ? tt : (tt?.term || ''))).filter(Boolean) : [],
        counts: {
            posts: t.post_count || (Array.isArray(citationArr) ? citationArr.length : undefined),
            sources: (t.distinct_source_count) || (Array.isArray(t.subThemes) ? t.subThemes.length : undefined),
        },
        depth,
        // 2026-06-08 - raw citations + implications for the deep-dive modal (source link-back).
        citations: Array.isArray(t.citations) ? t.citations : [],
        implications: Array.isArray(t.implications)
            ? t.implications.map((x: any) => (typeof x === 'string' ? x : (x?.text || x?.description || ''))).filter(Boolean)
            : (typeof t.implications === 'string' ? [t.implications] : []),
    };
}

function normalizeTopic(t: any, idx: number): ResearchCardItem {
    const samples: string[] = Array.isArray(t.sample_titles) ? t.sample_titles : [];
    const quotes: QuoteEvidence[] = samples.slice(0, 3).map((s, i): QuoteEvidence => ({
        text: s,
        sourceLabel: t.sample_subreddit || t.subreddit || 'social',
        externalUrl: Array.isArray(t.post_urls) ? t.post_urls[i] : undefined,
        wikiPath: Array.isArray(t.wiki_paths) ? t.wiki_paths[i] : undefined,
        chunkPointer: Array.isArray(t.chunk_ids) ? t.chunk_ids[i] : undefined,
    }));
    // 2026-06-06 - Topics carry dominant_sentiment more reliably than themes
    // (BERTopic post-process scores it from VADER on representative posts),
    // but legacy topics may be missing. Fall back to lexicon polarity on
    // name + summary + sample titles.
    const topicForDerive = {
        ...t,
        description: t.summary || '',
        quote: Array.isArray(t.sample_titles) ? t.sample_titles.slice(0, 3).join(' ') : '',
    };
    const sentiment = deriveSentiment(topicForDerive);
    return {
        id: t.id || `topic-${idx}`,
        title: cleanTitle(
            String(t.name || ''),
            Array.isArray(t.top_terms) ? t.top_terms.map((tt: any) => (typeof tt === 'string' ? tt : (tt?.term || ''))).filter(Boolean) : [],
            String(t.summary || ''),
            `Topic ${idx + 1}`,
        ).slice(0, 200),
        summary: String(t.summary || ''),
        sentiment,
        frame: 'topic',
        quotes,
        topTerms: Array.isArray(t.top_terms) ? t.top_terms.map((tt: any) => (typeof tt === 'string' ? tt : (tt?.term || ''))).filter(Boolean) : [],
        counts: {
            posts: t.post_count,
            comments: t.comment_count,
            sources: t.distinct_source_count,
            nssDelta: typeof t.nss_delta === 'number' ? Math.round(t.nss_delta) : undefined,
        },
    };
}

const COLUMN_DEFS: Array<{ key: NonNullable<SentimentFilter>; label: string; accent: string }> = [
    { key: 'positive', label: 'POSITIVE',  accent: '#0CCE6B' },
    { key: 'mixed',    label: 'MIXED',     accent: '#B8B800' },
    { key: 'negative', label: 'NEGATIVE',  accent: '#CC6644' },
    { key: 'neutral',  label: 'NEUTRAL',   accent: '#737373' },
];

export const ResearchBrowser: React.FC<ResearchBrowserProps> = ({
    themes, topics, onOpenWiki, onOpenChat, onAddToDeck, onInspect,
}) => {
    const [state, setState] = useResearchBrowserState();

    // Normalize + merge by frame.
    const allItems = useMemo<ResearchCardItem[]>(() => {
        const out: ResearchCardItem[] = [];
        if (state.frame === 'themes' || state.frame === 'merged') {
            (themes || []).forEach((t, i) => out.push(normalizeTheme(t, i)));
        }
        if (state.frame === 'topics' || state.frame === 'merged') {
            (topics || []).forEach((t, i) => out.push(normalizeTopic(t, i)));
        }
        // Filter by sentiment + query + tag.
        return out.filter(it => {
            if (state.sentiment && it.sentiment !== state.sentiment) return false;
            if (state.tagFilter && !it.topTerms.includes(state.tagFilter)) return false;
            if (state.query) {
                const q = state.query.toLowerCase();
                // 2026-06-14 - Search the FULL theme body, not just title+summary+topTerms.
                // A user filtering "intell" on themes about an Intelligence-Augmentation
                // product matched 0/28 because the abstract theme names ("Token-Cost
                // Control", "Wiki-Manifest vs RAG") never literally say "intelligence" -
                // the term lives in quotes, interpretation, implications and depth fields.
                // Fold every searchable text field into the haystack.
                const hay = [
                    it.title,
                    it.summary,
                    it.topTerms.join(' '),
                    (it.quotes || []).map((qq: any) => `${qq?.text || ''} ${qq?.sourceLabel || ''}`).join(' '),
                    (it.implications || []).join(' '),
                    it.depth ? [
                        (it.depth.interpretation || []).join(' '),
                        (it.depth.subThemes || []).join(' '),
                        (it.depth.dimensions || []).join(' '),
                        it.depth.contradiction || '',
                        it.depth.temporalArc || '',
                    ].join(' ') : '',
                    (it.citations || []).map((c: any) => typeof c === 'string' ? c : (c?.sourceName || c?.sourceFile || '')).join(' '),
                ].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [themes, topics, state.frame, state.sentiment, state.tagFilter, state.query]);

    // Sort within each column.
    const sortFn = (a: ResearchCardItem, b: ResearchCardItem): number => {
        // 2026-06-08 - DEFAULT SCAN = RELEVANCE-FIRST. When no search term is active,
        // surface the most objective-relevant themes first within each sentiment column
        // (a cold scan should lead with the strongest themes). This adds zero structure
        // and no facet count - it is purely sort order. A search term hands ordering
        // back to the explicit sort control below.
        if (!state.query) {
            const ra = typeof a.relevance === 'number' ? a.relevance : -1;
            const rb = typeof b.relevance === 'number' ? b.relevance : -1;
            if (rb !== ra) return rb - ra;
        }
        switch (state.sort) {
            case 'evidence_density':
                return (b.quotes.length * 3 + (b.counts.posts || 0)) - (a.quotes.length * 3 + (a.counts.posts || 0));
            case 'sentiment_intensity':
                return Math.abs(b.counts.nssDelta || 0) - Math.abs(a.counts.nssDelta || 0);
            case 'goal_relevance':
                return (typeof b.relevance === 'number' ? b.relevance : -1) - (typeof a.relevance === 'number' ? a.relevance : -1);
            case 'recency':
            default:
                return 0;
        }
    };

    // Bucket by sentiment column.
    const buckets = useMemo(() => {
        const m: Record<string, ResearchCardItem[]> = { positive: [], mixed: [], negative: [], neutral: [], unknown: [] };
        for (const it of allItems) {
            (m[it.sentiment] ||= []).push(it);
        }
        for (const k of Object.keys(m)) m[k].sort(sortFn);
        return m;
    }, [allItems, state.sort]);

    const totalThemes = (themes || []).length;
    const totalTopics = (topics || []).length;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#FFFFFF', color: '#0D0D0D',
        }}>
            {/* Toolbar: frame toggle · counts · filter · sort */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                padding: '10px 14px', borderBottom: '1px solid #E5E5E5',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                background: '#FAFAFA',
            }}>
                {/* 2026-06-08 - Topics retired. Only expose the THEMES/TOPICS/MERGED
                    toggle when topics actually exist; with topics retired (desk passes
                    topics={[]}) only THEMES renders, so the toggle disappears entirely
                    and the Research Browser is a single unified theme surface. */}
                {(topics && topics.length > 0) && (
                <div style={{ display: 'flex', gap: 0, border: '1px solid #D4D4D4', borderRadius: 2, overflow: 'hidden' }}>
                    {(['themes', 'topics', 'merged'] as ResearchFrame[]).map(f => {
                        const active = state.frame === f;
                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setState({ frame: f })}
                                style={{
                                    padding: '6px 12px',
                                    background: active ? '#115054' : '#FFFFFF',
                                    color: active ? '#FFFFFF' : '#525252',
                                    border: 'none',
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                                    letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                                }}
                            >
                                {f}
                            </button>
                        );
                    })}
                </div>
                )}
                <span style={{ color: '#525252' }}>
                    {totalThemes} themes{totalTopics > 0 ? ` · ${totalTopics} topics` : ''} · {allItems.length} in view
                </span>
                <input
                    type="text"
                    placeholder="Filter text or top-term..."
                    value={state.query}
                    onChange={(e) => setState({ query: e.target.value })}
                    style={{
                        marginLeft: 'auto', minWidth: 220,
                        padding: '5px 9px', border: '1px solid #D4D4D4', borderRadius: 2,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        background: '#FFFFFF', color: '#141414',
                    }}
                />
                <select
                    value={state.sort}
                    onChange={(e) => setState({ sort: e.target.value as any })}
                    style={{
                        padding: '5px 9px', border: '1px solid #D4D4D4', borderRadius: 2,
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        background: '#FFFFFF', color: '#141414',
                    }}
                >
                    <option value="evidence_density">Sort: evidence density</option>
                    <option value="sentiment_intensity">Sort: sentiment intensity</option>
                    <option value="goal_relevance">Sort: goal relevance</option>
                    <option value="recency">Sort: recency</option>
                </select>
                {state.sentiment && (
                    <button
                        type="button"
                        onClick={() => setState({ sentiment: null })}
                        style={{
                            padding: '5px 10px', background: '#FFF0E5', color: '#CC6644',
                            border: '1px solid #CC6644', borderRadius: 2,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, cursor: 'pointer',
                        }}
                    >
                        Clear {state.sentiment} filter 
                    </button>
                )}
            </div>

            {/* Sentiment-column lattice */}
            <div style={{
                flex: 1, overflow: 'auto',
                display: 'grid', gap: 1, background: '#E5E5E5',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            }}>
                {COLUMN_DEFS.map(col => {
                    const items = buckets[col.key] || [];
                    const active = state.sentiment === col.key;
                    return (
                        <div key={col.key} style={{ background: '#FFFFFF', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <button
                                type="button"
                                onClick={() => setState({ sentiment: active ? null : col.key })}
                                style={{
                                    position: 'sticky', top: 0, zIndex: 1,
                                    padding: '12px 14px',
                                    background: active ? col.accent : '#FAFAFA',
                                    color: active ? '#FFFFFF' : col.accent,
                                    border: 'none', borderBottom: `2px solid ${col.accent}`,
                                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 16,
                                    letterSpacing: 1, textAlign: 'left', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}
                            >
                                <span>{col.label}</span>
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                                    padding: '2px 7px', background: active ? '#FFFFFF' : col.accent,
                                    color: active ? col.accent : '#FFFFFF', borderRadius: 1,
                                }}>{items.length}</span>
                            </button>
                            <div style={{ padding: 8, flex: 1, overflow: 'auto', minHeight: 0 }}>
                                {items.length === 0 ? (
                                    <p style={{
                                        margin: 0, padding: '20px 12px',
                                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                                        color: '#A3A3A3', textAlign: 'center',
                                    }}>
                                        No {col.key} items in scope.
                                    </p>
                                ) : (
                                    items.map(item => (
                                        <ResearchCard
                                            key={item.id}
                                            item={item}
                                            onOpenWiki={onOpenWiki}
                                            onOpenChat={onOpenChat}
                                            onAddToDeck={onAddToDeck}
                                            onInspect={onInspect}
                                            accentSentiment={col.accent}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
