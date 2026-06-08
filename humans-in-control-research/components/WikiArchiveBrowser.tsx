/**
 * WikiArchiveBrowser - full-screen overlay listing every archived article,
 * transcript, and upload so the operator can inspect the wiki archive
 * directly without going through theme → evidence drill-downs.
 *
 * Until now the only way to reach an archived article in the Analyst Desk
 * was to click a theme, find its evidence nodes, and click ⌘ READ ARCHIVED
 * on one with a wikiPath. That works for evidence-linked articles but any
 * article that didn't happen to feed an emerged theme was invisible.
 *
 * This component fixes that by rendering the full index from
 * GET /api/wiki/index with filters (text search, kind, source, min chars,
 * sort) and a click-to-read-full-body interaction that reuses
 * WikiArticleViewer.
 *
 * Designed as a peer overlay to WikiArticleViewer - they can stack (browser
 * open, click a row, viewer opens on top). ESC on viewer returns to browser;
 * ESC on browser closes both.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { fetchWikiIndex, type WikiIndexEntry } from '../services/wikiIndexService';
import WikiArticleViewer from './WikiArticleViewer';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type SortKey = 'mtime' | 'chars' | 'title' | 'source';
type SortDir = 'asc' | 'desc';

const KIND_LABELS: Record<string, string> = {
    article: 'ARTICLE',
    transcript: 'TRANSCRIPT',
    upload: 'UPLOAD',
};
const KIND_GLYPHS: Record<string, string> = {
    article: '',
    transcript: '',
    upload: '',
};

export const WikiArchiveBrowser: React.FC<Props> = ({ isOpen, onClose }) => {
    const [entries, setEntries] = useState<WikiIndexEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [kindFilter, setKindFilter] = useState<string | null>(null);
    const [sourceFilter, setSourceFilter] = useState<string | null>(null);
    const [minChars, setMinChars] = useState<number>(0);
    const [sortKey, setSortKey] = useState<SortKey>('mtime');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [activeWikiPath, setActiveWikiPath] = useState<string | null>(null);

    // Fetch index once when opened
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError(null);
        fetchWikiIndex({ summary_len: 200, forceRebuild: false })
            .then(data => {
                setEntries(data);
                if (data.length === 0) setError('Wiki archive is empty. Collect some data to populate it.');
            })
            .catch(err => setError(err?.message || 'Load failed'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    // ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !activeWikiPath) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, activeWikiPath]);

    // Derived lists + counts
    const sources = useMemo(() => {
        const s = new Set<string>();
        for (const e of entries) if (e.source) s.add(e.source);
        return Array.from(s).sort();
    }, [entries]);

    const kindCounts = useMemo(() => {
        const counts: Record<string, number> = { article: 0, transcript: 0, upload: 0 };
        for (const e of entries) counts[e.kind || 'article'] = (counts[e.kind || 'article'] || 0) + 1;
        return counts;
    }, [entries]);

    const totalChars = useMemo(() => entries.reduce((sum, e) => sum + (e.chars || 0), 0), [entries]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let result = entries;
        if (kindFilter) result = result.filter(e => (e.kind || 'article') === kindFilter);
        if (sourceFilter) result = result.filter(e => e.source === sourceFilter);
        if (minChars > 0) result = result.filter(e => (e.chars || 0) >= minChars);
        if (q) {
            result = result.filter(e =>
                (e.title || '').toLowerCase().includes(q)
                || (e.source || '').toLowerCase().includes(q)
                || (e.summary || '').toLowerCase().includes(q)
                || (e.url || '').toLowerCase().includes(q)
            );
        }
        // Sort
        const sorted = [...result];
        sorted.sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'mtime') cmp = (a.mtime || 0) - (b.mtime || 0);
            else if (sortKey === 'chars') cmp = (a.chars || 0) - (b.chars || 0);
            else if (sortKey === 'title') cmp = (a.title || '').localeCompare(b.title || '');
            else if (sortKey === 'source') cmp = (a.source || '').localeCompare(b.source || '');
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [entries, search, kindFilter, sourceFilter, minChars, sortKey, sortDir]);

    if (!isOpen) return null;

    return (
        <>
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(10, 10, 10, 0.82)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'stretch', justifyContent: 'center',
                    padding: 30,
                    fontFamily: "'Archivo', system-ui, sans-serif",
                }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <div style={{
                    background: '#FAFAF5', color: '#141414',
                    width: '100%', maxWidth: 1400, maxHeight: '100%',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 40px 120px rgba(0,0,0,0.4)',
                }}>
                    {/* Header */}
                    <div style={{
                        borderBottom: '1px solid #D8D8D0', padding: '18px 24px 14px',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20,
                    }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: 700, color: '#B8B800', marginBottom: 6 }}>
                                WIKI ARCHIVE BROWSER
                            </div>
                            <div style={{ fontFamily: "'Bebas Neue', 'Archivo', sans-serif", fontSize: 30, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.01em', color: '#141414' }}>
                                {entries.length} archived items
                                <span style={{ fontSize: 14, color: '#666', fontWeight: 400, marginLeft: 12 }}>
                                    {Math.round(totalChars / 1024)}KB total body text
                                </span>
                            </div>
                            {/* Kind counts strip */}
                            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, color: '#666' }}>
                                <span> {kindCounts.article} articles</span>
                                <span> {kindCounts.transcript} transcripts</span>
                                <span> {kindCounts.upload} uploads</span>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: '#141414', border: '1px solid #141414', color: '#FFF',
                            padding: '8px 14px', fontSize: 10, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
                        }}>CLOSE (ESC)</button>
                    </div>

                    {/* Filter bar */}
                    <div style={{
                        borderBottom: '1px solid #E5E5E0', padding: '12px 24px',
                        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                    }}>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search title, source, summary..."
                            style={{
                                flex: 1, minWidth: 200, padding: '6px 10px', fontSize: 12,
                                border: '1px solid #CCC', background: '#FFF', fontFamily: 'inherit',
                            }}
                        />
                        <FilterSelect label="KIND" value={kindFilter} onChange={setKindFilter} options={[
                            { value: null, label: `All (${entries.length})` },
                            { value: 'article', label: `Articles (${kindCounts.article})` },
                            { value: 'transcript', label: `Transcripts (${kindCounts.transcript})` },
                            { value: 'upload', label: `Uploads (${kindCounts.upload})` },
                        ]} />
                        <FilterSelect label="SOURCE" value={sourceFilter} onChange={setSourceFilter} options={[
                            { value: null, label: 'All sources' },
                            ...sources.map(s => ({ value: s, label: s })),
                        ]} />
                        <label style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                            MIN CHARS:
                            <input type="number" value={minChars} onChange={e => setMinChars(parseInt(e.target.value) || 0)}
                                style={{ width: 70, padding: '4px 6px', fontSize: 11, border: '1px solid #CCC', fontFamily: 'inherit' }} />
                        </label>
                        <SortControl sortKey={sortKey} sortDir={sortDir} onKey={setSortKey} onDir={setSortDir} />
                    </div>

                    {/* Results */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
                        {loading && <div style={{ padding: 40, color: '#888', fontSize: 12 }}>Loading archive index...</div>}
                        {error && !loading && (
                            <div style={{ padding: 16, margin: '16px 0', border: '1px solid #CC6644', color: '#8A3B1F', background: '#FDF0EC', fontSize: 12 }}>
                                {error}
                            </div>
                        )}
                        {!loading && !error && filtered.length === 0 && entries.length > 0 && (
                            <div style={{ padding: 40, color: '#888', fontSize: 12, textAlign: 'center' }}>
                                No archived items match your filters. Try clearing the search or changing the kind/source filter.
                            </div>
                        )}
                        {!loading && filtered.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{
                                        borderBottom: '1px solid #D0D0CC', position: 'sticky' as const, top: 0,
                                        background: '#FAFAF5',
                                    }}>
                                        <th style={thStyle}>KIND</th>
                                        <th style={{ ...thStyle, width: '35%' }}>TITLE</th>
                                        <th style={thStyle}>SOURCE</th>
                                        <th style={thStyle}>DATE</th>
                                        <th style={{ ...thStyle, textAlign: 'right' as const }}>CHARS</th>
                                        <th style={{ ...thStyle, width: 110 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e, i) => (
                                        <tr key={e.wikiPath + i} style={{ borderBottom: '1px solid #E8E8E5' }}>
                                            <td style={tdStyle}>
                                                <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#666' }}>
                                                    {KIND_GLYPHS[e.kind] || '•'} {KIND_LABELS[e.kind] || e.kind}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: 600, color: '#141414' }}>{e.title || '(untitled)'}</div>
                                                {e.summary && <div style={{ fontSize: 11, color: '#666', marginTop: 4, lineHeight: 1.4 }}>{e.summary.substring(0, 160)}...</div>}
                                            </td>
                                            <td style={{ ...tdStyle, color: '#555', fontSize: 11 }}>{e.source || '-'}</td>
                                            <td style={{ ...tdStyle, color: '#888', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                                                {e.date || (e.mtime ? new Date(e.mtime * 1000).toISOString().substring(0, 10) : '-')}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace", color: '#555' }}>
                                                {e.chars >= 1000 ? `${Math.round(e.chars / 1000)}k` : e.chars}
                                            </td>
                                            <td style={tdStyle}>
                                                <button
                                                    onClick={() => setActiveWikiPath(e.wikiPath)}
                                                    style={{
                                                        background: 'transparent', border: '1px solid #0B3A3D',
                                                        color: '#0B3A3D', padding: '4px 8px', fontSize: 10,
                                                        letterSpacing: 1, fontWeight: 700, cursor: 'pointer',
                                                    }}
                                                >READ ↗</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        borderTop: '1px solid #D8D8D0', padding: '10px 24px',
                        fontSize: 10, letterSpacing: 1.2, color: '#888', textTransform: 'uppercase',
                        display: 'flex', justifyContent: 'space-between',
                    }}>
                        <span>Showing {filtered.length} of {entries.length} · /hic-workspace/wiki/</span>
                        <span>Click READ to open full body</span>
                    </div>
                </div>
            </div>
            <WikiArticleViewer
                wikiPath={activeWikiPath}
                onClose={() => setActiveWikiPath(null)}
            />
        </>
    );
};

// --- Helpers ---

const thStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'left',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 700,
    color: '#666',
};
const tdStyle: React.CSSProperties = {
    padding: '10px 8px',
    verticalAlign: 'top',
};

const FilterSelect: React.FC<{
    label: string;
    value: string | null;
    onChange: (v: string | null) => void;
    options: Array<{ value: string | null; label: string }>;
}> = ({ label, value, onChange, options }) => (
    <label style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}:
        <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
            style={{ padding: '4px 6px', fontSize: 11, border: '1px solid #CCC', fontFamily: 'inherit', background: '#FFF' }}
        >
            {options.map((o, i) => (
                <option key={i} value={o.value ?? ''}>{o.label}</option>
            ))}
        </select>
    </label>
);

const SortControl: React.FC<{
    sortKey: SortKey; sortDir: SortDir;
    onKey: (k: SortKey) => void; onDir: (d: SortDir) => void;
}> = ({ sortKey, sortDir, onKey, onDir }) => (
    <label style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
        SORT:
        <select value={sortKey} onChange={e => onKey(e.target.value as SortKey)}
            style={{ padding: '4px 6px', fontSize: 11, border: '1px solid #CCC', fontFamily: 'inherit', background: '#FFF' }}>
            <option value="mtime">Recency</option>
            <option value="chars">Size</option>
            <option value="title">Title</option>
            <option value="source">Source</option>
        </select>
        <button onClick={() => onDir(sortDir === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #CCC', background: '#FFF', cursor: 'pointer', fontFamily: 'inherit' }}>
            {sortDir === 'asc' ? '↑' : '↓'}
        </button>
    </label>
);

export default WikiArchiveBrowser;
