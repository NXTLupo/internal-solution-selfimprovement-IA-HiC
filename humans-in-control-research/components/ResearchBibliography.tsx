/**
 * ResearchBibliography — the Reasoning Stream reimagined as a functional,
 * navigable bibliography of collected research.
 *
 * This replaces the prior "thinkingEvents as a log of strings piped into a
 * modal status bar" pattern with a structured browse surface. It sits as a
 * peer to the knowledge graph: graph shows topology, bibliography shows the
 * bibliographic hierarchy. Both operate over the same EvidenceRecord data.
 *
 * Designed to compose with (not replace) the KG. Click a KG node → scroll
 * bibliography to the feeding evidence. Click an evidence record → highlight
 * the KG node it fed. Click a citation in chat → scroll here with breadcrumb
 * populated.
 *
 * This component is the SHELL. It renders progressively — if no EvidenceRecords
 * have been emitted by a connector yet (Tier 2 work), it falls back to a
 * legacy view built from liveSourceResults, so nothing breaks.
 */

import React, { useMemo, useState } from 'react';
import type { EvidenceRecord, QuestionCoverage, TrajectoryEvent, ParsedBrief } from '../services/evidenceRecord';
import { fromLegacyItem } from '../services/evidenceRecord';
import { getSourceCapability, honorStatusBadge } from '../services/sourceCapabilities';

interface Props {
    /** The authoritative list of records. If empty, shell falls back to legacyLiveSources. */
    records?: EvidenceRecord[];
    /** Parsed brief (for the Questions tab). If absent, only the Sources tab shows meaningful content. */
    brief?: ParsedBrief | null;
    /** Per-question coverage metrics. If absent, the coverage heatmap is hidden. */
    coverage?: QuestionCoverage[];
    /** Collection trajectory audit log. If absent, the Trajectory tab is empty. */
    trajectory?: TrajectoryEvent[];
    /**
     * Legacy source-result data from the pre-modernization pipeline.
     * The shell wraps each legacy item as an EvidenceRecord on the fly so the UI
     * works even before connectors emit native records.
     */
    legacyLiveSources?: Array<{
        source: string;
        sourceId: string;
        credibilityTier?: 1 | 2 | 3;
        items?: Array<{ title?: string; content?: string; url?: string; date?: string; relevanceScore?: number; enriched?: boolean }>;
    }>;
    /** Called when user wants to highlight a KG node related to a record */
    onHighlightKGNode?: (query: { url?: string; title?: string; sourceId?: string }) => void;
    /** Called when a chat citation click should scroll this bibliography */
    focusEvidenceId?: string;
    /** Called when user triggers a patch query to close a gap */
    onTriggerPatchQuery?: (questionId: string) => void;
}

type Tab = 'questions' | 'sources' | 'trajectory' | 'gaps';

const TAB_LABELS: Record<Tab, string> = {
    questions: 'Questions',
    sources: 'Sources',
    trajectory: 'Trajectory',
    gaps: 'Gaps',
};

const ResearchBibliography: React.FC<Props> = ({
    records,
    brief,
    coverage,
    trajectory,
    legacyLiveSources,
    onHighlightKGNode,
    focusEvidenceId,
    onTriggerPatchQuery,
}) => {
    const [tab, setTab] = useState<Tab>('questions');
    const [filter, setFilter] = useState('');
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<Array<{ label: string; kind: 'question' | 'source' | 'record' }>>([]);

    // Resolve the active record list — native records preferred; fall back to legacy.
    const resolvedRecords: EvidenceRecord[] = useMemo(() => {
        if (records && records.length > 0) return records;
        if (!legacyLiveSources) return [];
        const out: EvidenceRecord[] = [];
        for (const src of legacyLiveSources) {
            const items = src.items || [];
            for (let i = 0; i < items.length; i++) {
                out.push(fromLegacyItem(items[i], {
                    source: src.source,
                    sourceId: src.sourceId,
                    tier: (src.credibilityTier ?? 3) as 1 | 2 | 3,
                    index: i,
                }));
            }
        }
        return out;
    }, [records, legacyLiveSources]);

    // Filter records by text match (applies across title, excerpt, source)
    const filtered = useMemo(() => {
        if (!filter.trim()) return resolvedRecords;
        const q = filter.toLowerCase();
        return resolvedRecords.filter(r =>
            r.title.toLowerCase().includes(q) ||
            r.excerpt.toLowerCase().includes(q) ||
            r.source.toLowerCase().includes(q)
        );
    }, [resolvedRecords, filter]);

    // Group records by source for the Sources tab
    const bySource = useMemo(() => {
        const map = new Map<string, EvidenceRecord[]>();
        for (const r of filtered) {
            const key = r.sourceId;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        }
        return Array.from(map.entries()).map(([sourceId, recs]) => ({
            sourceId,
            sourceName: recs[0]?.source || sourceId,
            tier: recs[0]?.sourceTier || 3,
            records: recs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
        })).sort((a, b) => b.records.length - a.records.length);
    }, [filtered]);

    // Group records by question for the Questions tab (requires brief)
    const byQuestion = useMemo(() => {
        if (!brief) return [];
        return brief.questions.map(q => {
            const recs = filtered.filter(r => r.questionIds.includes(q.id));
            const cov = coverage?.find(c => c.questionId === q.id);
            return { question: q, records: recs, coverage: cov };
        });
    }, [brief, filtered, coverage]);

    // Gap heatmap data
    const gaps = useMemo(() => {
        if (!coverage) return [];
        return [...coverage]
            .filter(c => c.densityScore < 0.6 || c.recency < 0.5 || c.entityHonorRate < 0.5)
            .sort((a, b) => a.compositeScore - b.compositeScore);
    }, [coverage]);

    // Auto-focus on a record passed in via props (from chat citation clicks)
    React.useEffect(() => {
        if (focusEvidenceId && resolvedRecords.some(r => r.id === focusEvidenceId)) {
            setSelectedRecordId(focusEvidenceId);
            const el = document.getElementById(`bib-record-${focusEvidenceId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [focusEvidenceId, resolvedRecords]);

    const openRecord = (r: EvidenceRecord) => {
        setSelectedRecordId(r.id);
        setBreadcrumb([
            { label: r.source, kind: 'source' },
            { label: r.title.substring(0, 40) + (r.title.length > 40 ? '…' : ''), kind: 'record' },
        ]);
    };

    const selectedRecord = selectedRecordId ? resolvedRecords.find(r => r.id === selectedRecordId) : null;

    // --- RENDER ---

    const isEmpty = resolvedRecords.length === 0;

    return (
        <div style={{
            fontFamily: "'Archivo', sans-serif",
            background: '#FAFAF7', border: '1px solid #E0E0E0',
            display: 'flex', flexDirection: 'column',
            height: '100%', minHeight: 0, overflow: 'hidden',
        }}>
            {/* Header + tabs */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #E0E0E0', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '3px', color: '#B8B800', textTransform: 'uppercase' }}>RESEARCH BIBLIOGRAPHY</span>
                    <span style={{ fontSize: 9, color: '#999', marginLeft: 'auto' }}>{resolvedRecords.length} records · {bySource.length} sources</span>
                </div>

                {/* Breadcrumbs */}
                {breadcrumb.length > 0 && (
                    <div style={{ fontSize: 9, color: '#666', marginBottom: 6, display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                        <button onClick={() => { setBreadcrumb([]); setSelectedRecordId(null); }} style={{ background: 'none', border: 'none', color: '#0D0D0D', fontSize: 9, cursor: 'pointer', padding: 0, fontWeight: 700 }}>ALL</button>
                        {breadcrumb.map((c, i) => (
                            <span key={i} style={{ display: 'flex', gap: 4 }}>
                                <span style={{ color: '#CCC' }}>/</span>
                                <span style={{ color: i === breadcrumb.length - 1 ? '#0D0D0D' : '#666' }}>{c.label}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #F0F0F0', marginBottom: -11, marginLeft: -12, marginRight: -12 }}>
                    {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                flex: 1, padding: '8px 10px', fontSize: 9, fontWeight: 700,
                                letterSpacing: '2px', textTransform: 'uppercase' as const,
                                background: tab === t ? '#FAFAF7' : '#FFFFFF',
                                color: tab === t ? '#0D0D0D' : '#888',
                                border: 'none', borderTop: tab === t ? '2px solid #B8B800' : '2px solid transparent',
                                cursor: 'pointer',
                            }}
                        >
                            {TAB_LABELS[t]}{t === 'gaps' && gaps.length > 0 ? ` (${gaps.length})` : ''}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #E0E0E0', background: '#FFFFFF' }}>
                <input
                    type="text"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter by title, excerpt, or source…"
                    style={{
                        width: '100%', padding: '5px 8px', fontSize: 10,
                        border: '1px solid #E0E0E0', fontFamily: "'Archivo', sans-serif",
                        outline: 'none',
                    }}
                />
            </div>

            {/* Empty state */}
            {isEmpty && (
                <div style={{ padding: 24, fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                    No evidence records yet. The bibliography populates as data collection proceeds and as the Tier 2 structured-evidence pipeline emits records natively. For now, results appear after data collection completes.
                </div>
            )}

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>

                {tab === 'questions' && byQuestion.length === 0 && !isEmpty && (
                    <div style={{ padding: 16, fontSize: 10, color: '#888' }}>
                        The Questions view requires a parsed brief. Submit a structured research brief to enable question-level navigation.
                    </div>
                )}

                {tab === 'questions' && byQuestion.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {byQuestion.map(({ question, records: qRecords, coverage: cov }) => (
                            <div key={question.id} style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', padding: '10px 12px' }}>
                                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: '#B8B800', textTransform: 'uppercase' }}>{question.id}</div>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#0D0D0D', margin: '2px 0 6px', lineHeight: 1.35 }}>{question.text}</div>
                                {cov && (
                                    <div style={{ fontSize: 8, color: '#666', display: 'flex', gap: 10, marginBottom: 8 }}>
                                        <span>density {Math.round(cov.densityScore * 100)}%</span>
                                        <span>diversity {Math.round(cov.diversityScore * 100)}%</span>
                                        <span>recency {Math.round(cov.recency * 100)}%</span>
                                        <span>confidence {Math.round(cov.avgConfidence * 100)}%</span>
                                    </div>
                                )}
                                {qRecords.length === 0 ? (
                                    <div style={{ fontSize: 10, color: '#AAA', fontStyle: 'italic' as const }}>
                                        No evidence yet.
                                        {onTriggerPatchQuery && (
                                            <button onClick={() => onTriggerPatchQuery(question.id)} style={{ marginLeft: 8, fontSize: 8, color: '#B8B800', background: 'none', border: '1px solid #B8B800', padding: '2px 6px', cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 700 }}>Trigger Patch Query</button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {qRecords.slice(0, 8).map(r => (
                                            <EvidenceRow key={r.id} record={r} onOpen={openRecord} onHighlightKGNode={onHighlightKGNode} compact />
                                        ))}
                                        {qRecords.length > 8 && (
                                            <div style={{ fontSize: 9, color: '#888', paddingLeft: 10 }}>…+{qRecords.length - 8} more</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'sources' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {bySource.map(grp => {
                            const cap = getSourceCapability(grp.sourceId);
                            const dateBadge = honorStatusBadge(cap.dateFilter);
                            const domainBadge = honorStatusBadge(cap.domainExclude);
                            return (
                                <div key={grp.sourceId} style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}>
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAF7', flexWrap: 'wrap' as const }}>
                                        <span style={{ fontSize: 7, padding: '1px 5px', background: grp.tier === 1 ? '#0D0D0D' : grp.tier === 2 ? '#666' : '#BBB', color: '#FFF', fontWeight: 700, letterSpacing: '1px' }}>T{grp.tier}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0D0D0D' }}>{grp.sourceName}</span>
                                        <span style={{ fontSize: 7, padding: '1px 5px', background: '#F0F0F0', color: '#666', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>{cap.type.replace('_', '-')}</span>
                                        <span style={{ fontSize: 9, color: '#888', marginLeft: 'auto' }}>{grp.records.length} records</span>
                                    </div>
                                    {/* Capability band — honest disclosure of filter honor + search mode + lookback */}
                                    <div style={{ padding: '6px 12px', background: '#FDFDFC', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 10, fontSize: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                                        <span style={{ color: '#999', fontWeight: 700, letterSpacing: '1px' }}>SEARCH</span>
                                        <span style={{ color: '#444' }}>{cap.searchMode.replace('-', ' ')}</span>
                                        <span style={{ color: '#DDD' }}>|</span>
                                        <span style={{ color: '#999', fontWeight: 700, letterSpacing: '1px' }}>LOOKBACK</span>
                                        <span style={{ color: '#444' }}>{cap.maxLookback.replace('-', ' ')}</span>
                                        <span style={{ color: '#DDD' }}>|</span>
                                        <span style={{ color: '#999', fontWeight: 700, letterSpacing: '1px' }}>DATE</span>
                                        <span style={{ color: dateBadge.color, fontWeight: 700 }}>{dateBadge.label}</span>
                                        <span style={{ color: '#DDD' }}>|</span>
                                        <span style={{ color: '#999', fontWeight: 700, letterSpacing: '1px' }}>EXCLUDE</span>
                                        <span style={{ color: domainBadge.color, fontWeight: 700 }}>{domainBadge.label}</span>
                                    </div>
                                    {cap.knownLimitations.length > 0 && (
                                        <div style={{ padding: '4px 12px', background: '#FFFAF5', borderBottom: '1px solid #F5F5F5', fontSize: 8, color: '#886644', lineHeight: 1.4 }}>
                                            ⚠ {cap.knownLimitations.join(' · ')}
                                        </div>
                                    )}
                                    <div style={{ padding: '4px 8px' }}>
                                        {grp.records.slice(0, 10).map(r => (
                                            <EvidenceRow key={r.id} record={r} onOpen={openRecord} onHighlightKGNode={onHighlightKGNode} compact />
                                        ))}
                                        {grp.records.length > 10 && (
                                            <div style={{ fontSize: 9, color: '#888', padding: '4px 10px' }}>…+{grp.records.length - 10} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'trajectory' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(!trajectory || trajectory.length === 0) && (
                            <div style={{ fontSize: 10, color: '#888', padding: 16 }}>
                                Trajectory events populate once the collection engine emits them. Tier 2 adds structured logging of planner / selector / connector / coverage events.
                            </div>
                        )}
                        {trajectory && trajectory.map(ev => (
                            <div key={ev.id} style={{ fontSize: 9, color: '#444', padding: '4px 6px', borderLeft: `3px solid ${traceColor(ev.type)}`, background: '#FFFFFF' }}>
                                <div style={{ display: 'flex', gap: 6, fontSize: 8 }}>
                                    <span style={{ color: '#999', fontFamily: "'JetBrains Mono', monospace" }}>{ev.timestamp.substring(11, 19)}</span>
                                    <span style={{ fontWeight: 700, letterSpacing: '1px', color: traceColor(ev.type), textTransform: 'uppercase' as const }}>{ev.type.replace(/_/g, ' ')}</span>
                                </div>
                                <div style={{ marginTop: 2, lineHeight: 1.4 }}>{ev.summary}</div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'gaps' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {gaps.length === 0 && (
                            <div style={{ fontSize: 10, color: '#888', padding: 16 }}>No coverage gaps detected. All research questions have adequate evidence density, diversity, recency, and confidence.</div>
                        )}
                        {gaps.map(cov => {
                            const q = brief?.questions.find(x => x.id === cov.questionId);
                            return (
                                <div key={cov.questionId} style={{ background: '#FFF5F5', border: '1px solid #FAD', padding: '10px 12px' }}>
                                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: '#CC3333', textTransform: 'uppercase' as const }}>{cov.questionId} · THIN</div>
                                    <div style={{ fontSize: 10, color: '#0D0D0D', margin: '3px 0 6px' }}>{q?.text || cov.questionId}</div>
                                    <div style={{ fontSize: 9, color: '#666', marginBottom: 6 }}>{cov.diagnostic}</div>
                                    {onTriggerPatchQuery && (
                                        <button onClick={() => onTriggerPatchQuery(cov.questionId)} style={{ fontSize: 8, color: '#0D0D0D', background: '#B8B800', border: 'none', padding: '3px 8px', cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 700 }}>Patch This Gap</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* Detail panel for selected record */}
            {selectedRecord && (
                <div style={{
                    borderTop: '2px solid #B8B800',
                    padding: '10px 12px',
                    background: '#FFFFFF',
                    maxHeight: '40%',
                    overflowY: 'auto',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 7, padding: '1px 5px', background: selectedRecord.sourceTier === 1 ? '#0D0D0D' : selectedRecord.sourceTier === 2 ? '#666' : '#BBB', color: '#FFF', fontWeight: 700, letterSpacing: '1px' }}>T{selectedRecord.sourceTier}</span>
                        <span style={{ fontSize: 9, color: '#888', fontWeight: 700 }}>{selectedRecord.source}</span>
                        {selectedRecord.publishedDate && <span style={{ fontSize: 8, color: '#AAA' }}>· {selectedRecord.publishedDate.substring(0, 10)}</span>}
                        <button onClick={() => setSelectedRecordId(null)} style={{ marginLeft: 'auto', fontSize: 7, color: '#888', background: 'none', border: '1px solid #DDD', padding: '1px 6px', cursor: 'pointer' }}>CLOSE</button>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0D0D0D', marginBottom: 4, lineHeight: 1.3 }}>{selectedRecord.title}</div>
                    <div style={{ fontSize: 10, color: '#333', lineHeight: 1.5, marginBottom: 6 }}>{selectedRecord.excerpt}</div>
                    {selectedRecord.rawContent && selectedRecord.rawContent.length > selectedRecord.excerpt.length && (
                        <details style={{ fontSize: 9, color: '#555' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#666' }}>Show full content ({Math.round(selectedRecord.rawContent.length / 1024 * 10) / 10}KB)</summary>
                            <div style={{ marginTop: 6, lineHeight: 1.45, whiteSpace: 'pre-wrap' as const }}>{selectedRecord.rawContent}</div>
                        </details>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {selectedRecord.url && (
                            <a href={selectedRecord.url} target="_blank" rel="noreferrer" style={{ fontSize: 8, color: '#FFF', background: '#0D0D0D', padding: '3px 8px', textDecoration: 'none', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>Open Source</a>
                        )}
                        {onHighlightKGNode && (
                            <button onClick={() => onHighlightKGNode({ url: selectedRecord.url, title: selectedRecord.title, sourceId: selectedRecord.sourceId })} style={{ fontSize: 8, color: '#0D0D0D', background: '#B8B800', border: 'none', padding: '3px 8px', cursor: 'pointer', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>Highlight In Graph</button>
                        )}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 8, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                        {typeof selectedRecord.relevanceScore === 'number' && <span>relevance {selectedRecord.relevanceScore}/100</span>}
                        <span>confidence {Math.round(selectedRecord.extractionConfidence * 100)}%</span>
                        <span>freshness {Math.round(selectedRecord.freshness * 100)}%</span>
                        {selectedRecord.enriched && <span style={{ color: '#0CCE6B' }}>FULL TEXT</span>}
                        <span style={{ color: selectedRecord.honoredFilters.dateRange ? '#0CCE6B' : '#CC6644' }}>date-filter {selectedRecord.honoredFilters.dateRange ? 'honored' : 'not-honored'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ROW COMPONENT ---

const EvidenceRow: React.FC<{
    record: EvidenceRecord;
    onOpen: (r: EvidenceRecord) => void;
    onHighlightKGNode?: (q: { url?: string; title?: string; sourceId?: string }) => void;
    compact?: boolean;
}> = ({ record, onOpen, compact }) => (
    <div
        id={`bib-record-${record.id}`}
        onClick={() => onOpen(record)}
        style={{
            padding: compact ? '5px 8px' : '8px 10px',
            borderBottom: '1px solid #F5F5F5',
            cursor: 'pointer',
            display: 'flex', gap: 8, alignItems: 'flex-start',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
        <span style={{ fontSize: 7, padding: '1px 4px', background: record.sourceTier === 1 ? '#0D0D0D' : record.sourceTier === 2 ? '#666' : '#BBB', color: '#FFF', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>T{record.sourceTier}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compact ? 9 : 10, fontWeight: 500, color: '#0D0D0D', lineHeight: 1.3, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>
                {record.title}
            </div>
            {!compact && <div style={{ fontSize: 9, color: '#555', lineHeight: 1.4, marginTop: 2 }}>{record.excerpt.substring(0, 180)}…</div>}
            <div style={{ fontSize: 8, color: '#888', marginTop: 2, display: 'flex', gap: 6 }}>
                <span>{record.source}</span>
                {record.publishedDate && <span>· {record.publishedDate.substring(0, 10)}</span>}
                {typeof record.relevanceScore === 'number' && <span>· rel {record.relevanceScore}</span>}
            </div>
        </div>
    </div>
);

function traceColor(type: TrajectoryEvent['type']): string {
    switch (type) {
        case 'error': return '#CC3333';
        case 'warning':
        case 'filter_degraded': return '#CC6644';
        case 'patch_query':
        case 'coverage_check': return '#B8B800';
        case 'skill_activated':
        case 'brief_parsed': return '#115054';
        case 'query_fired':
        case 'query_result': return '#00B7C3';
        default: return '#666666';
    }
}

export default ResearchBibliography;
