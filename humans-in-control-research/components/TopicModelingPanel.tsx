/**
 * TopicModelingPanel — 2026-05-11 (HiC-Active-Loop, Social-Research-Parity)
 *
 * Mirrors the Social Research tool's topic-modeling display paradigm:
 *   - Cards grouped into 3 columns by sentiment (Positive / Neutral / Negative)
 *   - Each card: left-border color, sentiment badge, post count, summary,
 *     top terms as pills
 *   - Click a card → modal opens with Summary tab + Sources tab
 *   - Sources tab: navigable list of underlying Reddit posts with comments
 *
 * Restyled in NXT brand tokens (Bebas Neue display, Archivo body, chartreuse
 * accent, teal-on-near-black for primary action). The D3 mindmap from the
 * previous version is gone — it was the "orb view" the user explicitly
 * rejected. If we need it back, surface it as a separate toggle.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    type Topic,
    type TopicDocument,
    type TopicResult,
    type TopicJobStatus,
    startTopicModelJob,
    waitForTopicModelJob,
} from '../services/topicModelService';
import { useSemanticSearch } from '../services/semanticUiSearch';

const COLORS = {
    bg: '#FFFFFF',
    panel: '#FAFAFA',
    panelAlt: '#F5F5F0',
    line: '#E5E5E5',
    text: '#0D0D0D',
    muted: '#525252',
    tertiary: '#ACACAC',
    teal: '#115054',
    lime: '#B8B800',
    rust: '#CC6644',
    cyan: '#00B7C3',
    success: '#0CCE6B',
    error: '#FF5A5A',
    posBg: '#F0FBF4',
    posBorder: '#0CCE6B',
    negBg: '#FCF1ED',
    negBorder: '#CC6644',
    neuBg: '#F0F7F8',
    neuBorder: '#115054',
    mixedBg: '#FBF9E8',
    mixedBorder: '#B8B800',
};

type SentimentBucket = 'positive' | 'neutral' | 'negative' | 'mixed';

function sentimentBucket(s: string): SentimentBucket {
    const v = (s || '').toLowerCase();
    if (v === 'positive') return 'positive';
    if (v === 'negative') return 'negative';
    if (v === 'mixed') return 'mixed';
    return 'neutral';
}

function sentimentStyle(s: SentimentBucket) {
    switch (s) {
        case 'positive': return { border: COLORS.posBorder, bg: COLORS.posBg, label: 'Positive', accent: COLORS.success };
        case 'negative': return { border: COLORS.negBorder, bg: COLORS.negBg, label: 'Negative', accent: COLORS.rust };
        case 'mixed':    return { border: COLORS.mixedBorder, bg: COLORS.mixedBg, label: 'Mixed', accent: COLORS.lime };
        default:         return { border: COLORS.neuBorder, bg: COLORS.neuBg, label: 'Neutral', accent: COLORS.teal };
    }
}

interface Props {
    redditDeepItems: any[];
    researchGoal: string;
    cachedResult?: TopicResult;
    // 2026-05-11 — Bubble the computed result up to a parent owner so it
    // survives tab switches (panel unmount/remount) and engagement state
    // changes. Without this, switching tabs back to Topic Modeling
    // recomputes from scratch every time. With it, the parent owns the
    // result; the panel just renders whatever cachedResult is passed in.
    onResult?: (result: TopicResult) => void;
    /** External job state from the parent (App.tsx auto-kickoff). If a job
     *  is already running upstream, the panel skips its own kickoff and
     *  just waits for the parent to deliver cachedResult. Prevents the
     *  race where the panel and App both fire parallel jobs. */
    upstreamStatus?: { jobId?: string; status: 'idle' | 'running' | 'completed' | 'failed'; message?: string };
}

const TopicModelingPanel: React.FC<Props> = ({ redditDeepItems, researchGoal, cachedResult, onResult, upstreamStatus }) => {
    const [jobStatus, setJobStatus] = useState<TopicJobStatus | null>(null);
    const [result, setResult] = useState<TopicResult | null>(cachedResult || null);
    const [openTopic, setOpenTopic] = useState<Topic | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const triggeredRef = useRef(false);
    useEffect(() => {
        if (triggeredRef.current) return;
        if (cachedResult) return;
        // If the parent has a job already running upstream, just wait.
        // Avoids spawning a duplicate job when the user opens the tab
        // mid-computation. The parent will pass cachedResult once done.
        if (upstreamStatus?.status === 'running') return;
        if (!redditDeepItems || redditDeepItems.length < 10) return;
        triggeredRef.current = true;
        (async () => {
            try {
                // 2026-05-11 — see App.tsx note: tightened ceiling 8→5,
                // floor 3, divisor /15→/40 to surface fine-grained topics.
                // Paired with proxy-side HDBSCAN 'leaf' selection.
                const computedMin = Math.max(3, Math.min(5, Math.floor(redditDeepItems.length / 40)));
                const { jobId, docCount } = await startTopicModelJob({
                    items: redditDeepItems,
                    researchGoal,
                    minClusterSize: computedMin,
                });
                setJobStatus({ job_id: jobId, status: 'queued', progress: 0, doc_count: docCount });
                const final = await waitForTopicModelJob(jobId, (s) => setJobStatus(s));
                setResult(final);
                // Bubble result up so the parent state survives tab unmounts.
                // Without this, switching tabs forces a recompute every time.
                try { onResult?.(final); } catch { /* non-fatal */ }
            } catch (e: any) {
                setError(e.message || 'Topic modeling failed');
            }
        })();
    }, [redditDeepItems, researchGoal, cachedResult]);

    // 2026-05-20 — Semantic search via /api/embed (Gemini gemini-embedding-001).
    // The user types "co-op" and gets back topics about "internship struggles"
    // and "experiential learning gripes" — not just topics that literally
    // contain "co-op" in their auto-generated summary. The hook caches item
    // embeddings (one batch per session) and debounces query embeddings
    // (300ms) so typing stays responsive.
    //
    // Pre-index post titles by cluster so each topic's embedded text includes
    // the post body signal, not just the auto-generated summary.
    const docsByCluster = useMemo(() => {
        const map = new Map<number, string[]>();
        if (!result) return map;
        for (const doc of result.documents || []) {
            if (typeof doc.cluster !== 'number') continue;
            const arr = map.get(doc.cluster) || [];
            arr.push(`${doc.title || ''} ${doc.subreddit || ''}`);
            map.set(doc.cluster, arr);
        }
        return map;
    }, [result]);

    const topicsForSearch = result?.topics || [];
    const getTopicSearchText = (t: Topic): string => {
        const docTitles = (docsByCluster.get(t.id) || []).slice(0, 25).join(' ');
        return [
            t.name,
            t.summary,
            t.sentiment,
            (t.top_terms || []).map(([w]) => w).join(' '),
            docTitles,
        ].filter(Boolean).join(' — ');
    };
    const semantic = useSemanticSearch(
        topicsForSearch,
        (t: Topic) => `topic_${t.id}`,
        getTopicSearchText,
        searchTerm,
        { minSimilarity: 0.32 },
    );
    const filteredTopics = semantic.filtered;

    const grouped = useMemo(() => {
        const buckets: Record<SentimentBucket, Topic[]> = { positive: [], neutral: [], negative: [], mixed: [] };
        for (const t of filteredTopics) buckets[sentimentBucket(t.sentiment)].push(t);
        return buckets;
    }, [filteredTopics]);

    if (error) {
        return (
            <div style={{ padding: 32, color: COLORS.rust, fontFamily: 'Archivo, sans-serif' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 2, marginBottom: 12 }}>
                    TOPIC MODELING FAILED
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{error}</div>
            </div>
        );
    }

    if (!result) {
        // Use the panel's own jobStatus if it kicked a local job; otherwise
        // surface upstreamStatus so the user sees the App-level progress.
        const surfacedStatus: TopicJobStatus | null = jobStatus || (upstreamStatus?.status === 'running' ? {
            job_id: upstreamStatus.jobId || 'upstream',
            status: 'running',
            progress: 50,
            message: upstreamStatus.message || 'Computing topics in the background…',
        } : null);
        return <ProgressIndicator status={surfacedStatus} docCount={redditDeepItems.length} />;
    }

    if (result.topics.length === 0) {
        return (
            <div style={{ padding: 32, color: COLORS.muted, fontFamily: 'Archivo, sans-serif' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 2, marginBottom: 12, color: COLORS.text }}>
                    NO COHERENT TOPICS FOUND
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 480 }}>
                    {result.error || `Clustered ${result.doc_count} posts but no group reached the minimum coherence threshold. Try adding more subreddits or running with a more focused research goal.`}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: COLORS.bg, fontFamily: 'Archivo, sans-serif' }}>
            {/* Header strip */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.line}`, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', flexShrink: 0 }}>
                <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: COLORS.text }}>
                        TOPIC MODELING
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                        {result.topic_count} topics across {result.doc_count} Reddit posts · {result.noise_count} noise
                        {result.duration_seconds ? ` · ${result.duration_seconds}s` : ''}
                    </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <input
                        type="text"
                        placeholder="Search topics or terms…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            border: `1px solid ${COLORS.line}`,
                            borderRadius: 2,
                            background: COLORS.panel,
                            outline: 'none',
                            width: 280,
                            fontFamily: "'JetBrains Mono', monospace",
                    }}
                />
                {searchTerm.trim() && (
                    <span style={{
                        fontSize: 9,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: semantic.usedSemantic ? COLORS.lime : COLORS.muted,
                        fontWeight: 600,
                        fontFamily: 'Archivo, sans-serif',
                    }}>
                        {semantic.isComputing
                            ? 'embedding…'
                            : semantic.usedSemantic
                                ? `semantic · ${semantic.filtered.length} hit(s)`
                                : `literal · ${semantic.filtered.length} hit(s)`}
                    </span>
                )}
                </div>
            </div>

            {/* 3-column sentiment grid */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24, background: COLORS.panel }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 24,
                }}>
                    <SentimentColumn label="Positive" sentiment="positive" topics={grouped.positive} documents={result.documents} onOpen={setOpenTopic} />
                    <SentimentColumn label="Neutral"  sentiment="neutral"  topics={grouped.neutral}  documents={result.documents} onOpen={setOpenTopic} />
                    <SentimentColumn label="Negative" sentiment="negative" topics={grouped.negative} documents={result.documents} onOpen={setOpenTopic} />
                    {grouped.mixed.length > 0 && (
                        <SentimentColumn label="Mixed" sentiment="mixed" topics={grouped.mixed} documents={result.documents} onOpen={setOpenTopic} />
                    )}
                </div>
            </div>

            {/* Detail modal */}
            {openTopic && (
                <TopicDetailModal
                    topic={openTopic}
                    documents={result.documents.filter(d => d.cluster === openTopic.id)}
                    onClose={() => setOpenTopic(null)}
                />
            )}
        </div>
    );
};

// ---------------- Sentiment column ----------------

const SentimentColumn: React.FC<{
    label: string;
    sentiment: SentimentBucket;
    topics: Topic[];
    documents: TopicDocument[];
    onOpen: (t: Topic) => void;
}> = ({ label, sentiment, topics, documents, onOpen }) => {
    const sty = sentimentStyle(sentiment);
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${sty.border}` }}>
                <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 18, letterSpacing: 2, color: sty.accent,
                    textTransform: 'uppercase',
                }}>
                    {label} Topics
                </span>
                <span style={{
                    padding: '2px 9px',
                    fontSize: 11, fontWeight: 700,
                    background: sty.bg, color: sty.accent,
                    border: `1px solid ${sty.border}`,
                    borderRadius: 999,
                }}>{topics.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topics.length === 0 ? (
                    <div style={{
                        padding: 24, textAlign: 'center', color: COLORS.tertiary,
                        fontSize: 11, fontStyle: 'italic',
                        background: COLORS.bg, border: `1px dashed ${COLORS.line}`, borderRadius: 4,
                    }}>
                        No {label.toLowerCase()} topics
                    </div>
                ) : topics.map(t => (
                    <TopicCard key={t.id} topic={t} documents={documents.filter(d => d.cluster === t.id)} onOpen={onOpen} />
                ))}
            </div>
        </div>
    );
};

// ---------------- Topic card ----------------

const TopicCard: React.FC<{ topic: Topic; documents: TopicDocument[]; onOpen: (t: Topic) => void }> = ({ topic, documents, onOpen }) => {
    const sty = sentimentStyle(sentimentBucket(topic.sentiment));
    const totalComments = documents.reduce((s, d) => s + (d.num_comments || 0), 0);
    return (
        <button
            type="button"
            onClick={() => onOpen(topic)}
            style={{
                textAlign: 'left',
                background: sty.bg,
                border: `1px solid ${COLORS.line}`,
                borderLeft: `4px solid ${sty.border}`,
                padding: '14px 16px',
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'box-shadow 140ms, transform 140ms',
                fontFamily: 'Archivo, sans-serif',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(13,13,13,0.08)`;
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 16, letterSpacing: 1, color: COLORS.text, lineHeight: 1.15,
                    textTransform: 'uppercase',
                    flex: 1,
                }}>
                    {topic.name}
                </span>
                <span style={{
                    fontSize: 9, fontWeight: 700, color: sty.accent,
                    textTransform: 'uppercase', letterSpacing: 1.2,
                    background: COLORS.bg,
                    padding: '2px 7px',
                    border: `1px solid ${sty.border}`,
                    borderRadius: 999,
                    flexShrink: 0,
                }}>{sty.label}</span>
            </div>
            <div style={{
                fontSize: 11, color: COLORS.muted, marginBottom: 10,
                display: 'flex', gap: 8,
                fontFamily: "'JetBrains Mono', monospace",
            }}>
                <span>{topic.post_count} posts</span>
                <span style={{ color: COLORS.tertiary }}>·</span>
                <span>{totalComments} comments</span>
            </div>
            {topic.summary && (
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, marginBottom: 10 }}>
                    {topic.summary}
                </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {topic.top_terms.slice(0, 5).map(([term]) => (
                    <span key={term} style={{
                        padding: '2px 7px',
                        background: COLORS.bg,
                        color: COLORS.muted,
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: 0.3,
                        borderRadius: 2,
                        border: `1px solid ${COLORS.line}`,
                    }}>{term}</span>
                ))}
                {topic.top_terms.length > 5 && (
                    <span style={{
                        padding: '2px 7px',
                        color: COLORS.tertiary,
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                    }}>+{topic.top_terms.length - 5} more</span>
                )}
            </div>
        </button>
    );
};

// ---------------- Detail modal (Summary + Sources tabs) ----------------

const TopicDetailModal: React.FC<{
    topic: Topic;
    documents: TopicDocument[];
    onClose: () => void;
}> = ({ topic, documents, onClose }) => {
    const [tab, setTab] = useState<'summary' | 'sources'>('summary');
    const [activeSource, setActiveSource] = useState(0);

    // Sort documents by score so the "loudest" posts are first
    const sortedDocs = useMemo(
        () => [...documents].sort((a, b) => (b.score || 0) - (a.score || 0)),
        [documents],
    );

    const sty = sentimentStyle(sentimentBucket(topic.sentiment));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const totalComments = documents.reduce((s, d) => s + (d.num_comments || 0), 0);

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(13,13,13,0.78)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, fontFamily: 'Archivo, sans-serif',
            }}
        >
            <div style={{
                background: COLORS.bg,
                maxWidth: 1100, width: '100%', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                border: `1px solid ${COLORS.line}`,
                boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            }}>
                {/* Header */}
                <div style={{ padding: '20px 28px', borderBottom: `1px solid ${COLORS.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                            <span style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 28, letterSpacing: 1.5, color: COLORS.text,
                                textTransform: 'uppercase',
                            }}>{topic.name}</span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, color: sty.accent,
                                textTransform: 'uppercase', letterSpacing: 1.2,
                                background: sty.bg,
                                padding: '3px 9px',
                                border: `1px solid ${sty.border}`,
                                borderRadius: 999,
                            }}>{sty.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                            {topic.post_count} posts · {totalComments} comments · cluster #{topic.id}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none',
                            color: COLORS.muted, fontSize: 24, cursor: 'pointer',
                            padding: '0 4px', lineHeight: 1, marginLeft: 16,
                        }}
                        title="Close (Esc)"
                    >×</button>
                </div>

                {/* Tabs */}
                <div style={{ borderBottom: `1px solid ${COLORS.line}`, display: 'flex', gap: 0, flexShrink: 0 }}>
                    {(['summary', 'sources'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                padding: '12px 24px',
                                background: tab === t ? COLORS.bg : 'transparent',
                                border: 'none',
                                borderBottom: tab === t ? `2px solid ${COLORS.lime}` : '2px solid transparent',
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: 13, letterSpacing: 2,
                                color: tab === t ? COLORS.text : COLORS.muted,
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                            }}
                        >
                            {t === 'summary' ? 'Summary' : `Sources & Comments (${sortedDocs.length})`}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 28, background: COLORS.panel }}>
                    {tab === 'summary' ? (
                        <SummaryTab topic={topic} documents={documents} />
                    ) : (
                        <SourcesTab
                            documents={sortedDocs}
                            activeIndex={activeSource}
                            onSelect={setActiveSource}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const SummaryTab: React.FC<{ topic: Topic; documents: TopicDocument[] }> = ({ topic, documents }) => {
    const subreddits = useMemo(() => {
        const map = new Map<string, number>();
        for (const d of documents) {
            if (!d.subreddit) continue;
            map.set(d.subreddit, (map.get(d.subreddit) || 0) + 1);
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [documents]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Section title="Topic Summary">
                <div style={{
                    background: COLORS.bg, border: `1px solid ${COLORS.line}`,
                    padding: 20, fontSize: 14, lineHeight: 1.7, color: COLORS.text,
                }}>
                    {topic.summary || 'No summary available for this topic.'}
                </div>
            </Section>

            <Section title="Representative Terms">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {topic.top_terms.map(([term, score]) => (
                        <span key={term} style={{
                            padding: '6px 12px',
                            background: COLORS.bg,
                            color: COLORS.text,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            border: `1px solid ${COLORS.line}`,
                            borderRadius: 2,
                        }}>
                            {term}
                            <span style={{ marginLeft: 6, color: COLORS.tertiary, fontSize: 10 }}>
                                {score.toFixed(2)}
                            </span>
                        </span>
                    ))}
                </div>
            </Section>

            {subreddits.length > 0 && (
                <Section title="Source Subreddits">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {subreddits.map(([sub, count]) => (
                            <span key={sub} style={{
                                padding: '6px 12px',
                                background: COLORS.bg,
                                border: `1px solid ${COLORS.line}`,
                                borderLeft: `3px solid ${COLORS.teal}`,
                                fontSize: 12,
                                color: COLORS.text,
                                fontFamily: "'JetBrains Mono', monospace",
                            }}>
                                r/{sub} <span style={{ color: COLORS.tertiary, marginLeft: 6 }}>×{count}</span>
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            <Section title="Top Posts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {documents.slice(0, 5).sort((a, b) => (b.score || 0) - (a.score || 0)).map(d => (
                        <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                padding: '10px 14px',
                                background: COLORS.bg,
                                border: `1px solid ${COLORS.line}`,
                                borderLeft: `3px solid ${COLORS.lime}`,
                                textDecoration: 'none',
                                fontSize: 13,
                                color: COLORS.text,
                                lineHeight: 1.4,
                            }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                <span style={{ color: COLORS.lime, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                                    {d.score}↑
                                </span>
                                <span style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {d.num_comments} comments · r/{d.subreddit}
                                </span>
                            </div>
                            <div>{d.title}</div>
                        </a>
                    ))}
                </div>
            </Section>
        </div>
    );
};

const SourcesTab: React.FC<{
    documents: TopicDocument[];
    activeIndex: number;
    onSelect: (i: number) => void;
}> = ({ documents, activeIndex, onSelect }) => {
    if (documents.length === 0) {
        return <div style={{ color: COLORS.muted, fontSize: 13, padding: 24, textAlign: 'center' }}>No source documents available for this topic.</div>;
    }
    const active = documents[activeIndex];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Source pill navigator */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
                {documents.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(i)}
                        style={{
                            padding: '6px 12px',
                            background: activeIndex === i ? COLORS.teal : COLORS.bg,
                            color: activeIndex === i ? COLORS.bg : COLORS.muted,
                            border: `1px solid ${activeIndex === i ? COLORS.teal : COLORS.line}`,
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace",
                            cursor: 'pointer',
                            borderRadius: 2,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        Source {i + 1}
                    </button>
                ))}
            </div>

            {/* Active source body */}
            <div style={{
                background: COLORS.bg, border: `1px solid ${COLORS.line}`,
                padding: 20, position: 'relative',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, fontSize: 11, color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>
                        <span style={{ color: COLORS.lime, fontWeight: 700 }}>{active.score}↑</span>
                        {' · '}{active.num_comments} comments
                        {active.subreddit ? ` · r/${active.subreddit}` : ''}
                    </span>
                    {active.url && (
                        <a href={active.url} target="_blank" rel="noopener noreferrer" style={{
                            color: COLORS.teal,
                            textDecoration: 'none',
                            fontSize: 10, fontWeight: 700,
                            padding: '4px 10px',
                            background: COLORS.bg,
                            border: `1px solid ${COLORS.teal}`,
                            borderRadius: 2,
                        }}>
                            VIEW ON REDDIT →
                        </a>
                    )}
                </div>
                <h3 style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 22, letterSpacing: 1, color: COLORS.text,
                    margin: '0 0 14px 0', lineHeight: 1.2,
                    textTransform: 'uppercase',
                }}>
                    {active.title || '(untitled post)'}
                </h3>
                <div style={{ fontSize: 11, color: COLORS.tertiary, fontFamily: "'JetBrains Mono', monospace" }}>
                    Source ID: {active.id}
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: COLORS.muted, lineHeight: 1.6 }}>
                    Click "View on Reddit" above to read the full post body and comment thread on Reddit.
                    {/* Full body + comments are stored in the wiki at wiki/social-intelligence/reddit-deep/. Future enhancement: load via the wiki API. */}
                </div>
            </div>

            {/* Footer nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: COLORS.muted }}>
                <button
                    onClick={() => activeIndex > 0 && onSelect(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    style={{
                        padding: '6px 14px',
                        background: activeIndex === 0 ? COLORS.panel : COLORS.teal,
                        color: activeIndex === 0 ? COLORS.tertiary : COLORS.bg,
                        border: `1px solid ${activeIndex === 0 ? COLORS.line : COLORS.teal}`,
                        fontSize: 11, fontWeight: 700, letterSpacing: 1,
                        cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                    }}
                >← Previous</button>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {activeIndex + 1} of {documents.length}
                </span>
                <button
                    onClick={() => activeIndex < documents.length - 1 && onSelect(activeIndex + 1)}
                    disabled={activeIndex === documents.length - 1}
                    style={{
                        padding: '6px 14px',
                        background: activeIndex === documents.length - 1 ? COLORS.panel : COLORS.teal,
                        color: activeIndex === documents.length - 1 ? COLORS.tertiary : COLORS.bg,
                        border: `1px solid ${activeIndex === documents.length - 1 ? COLORS.line : COLORS.teal}`,
                        fontSize: 11, fontWeight: 700, letterSpacing: 1,
                        cursor: activeIndex === documents.length - 1 ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                    }}
                >Next →</button>
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13, letterSpacing: 2.5, color: COLORS.muted,
            margin: '0 0 12px 0', textTransform: 'uppercase',
        }}>{title}</h4>
        {children}
    </div>
);

// ---------------- Progress indicator while job runs ----------------

const ProgressIndicator: React.FC<{ status: TopicJobStatus | null; docCount: number }> = ({ status, docCount }) => {
    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: COLORS.bg, padding: 48, fontFamily: 'Archivo, sans-serif',
        }}>
            <div style={{ width: 360, textAlign: 'center' }}>
                <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 28, letterSpacing: 2, color: COLORS.text, marginBottom: 8,
                }}>
                    COMPUTING TOPICS
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 24 }}>
                    {status?.message || `Embedding ${docCount} Reddit posts and clustering them by meaning…`}
                </div>
                <div style={{ height: 4, background: COLORS.line, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${status?.progress || 5}%`,
                        background: COLORS.lime,
                        transition: 'width 600ms ease',
                    }} />
                </div>
                <div style={{ fontSize: 10, color: COLORS.tertiary, marginTop: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }}>
                    {status?.status || 'queued'} · job {status?.job_id?.slice(-8) || '…'}
                </div>
            </div>
        </div>
    );
};

export default TopicModelingPanel;
