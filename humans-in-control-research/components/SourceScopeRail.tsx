/**
 * SourceScopeRail - per-source checkbox scoping for the Analyst Desk (2026-11-03).
 * Plan: plans/notebooklm-studio-reverse-engineering-2026-11-03.md, Part 6 W2 (spec clause C2).
 *
 * NotebookLM's source rail: checkboxes beside every source scope every chat query and
 * every studio output to the selected sources. HiC's retrieval engine already enforced
 * an `includeOnly` allow-list in sessionConstraints.isSourceExcluded, but nothing ever
 * filled it. This rail fills it.
 *
 * Granularity: external connector sources group by their wiki directory (one row per
 * source, e.g. articles/higher-ed-dive/), while client uploads list one row PER DOCUMENT
 * (page title under articles/client-uploads/), matching NotebookLM's per-source rows.
 * All-checked (the default) writes an EMPTY includeOnly: no constraint, nothing excluded.
 * Any other combination writes the checked tokens; enforcement happens deterministically
 * before ranking in chunkRetrieval.pickChunksForPrompt, and the echo-back line in the
 * next reply names the scope so control is never invisible.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { getSessionConstraints, setSourceScope } from '../services/sessionConstraints';

const PROXY_BASE = 'http://127.0.0.1:5012';

interface SourceRow {
    /** The containment token written into includeOnly (dir slug, or upload page title). */
    token: string;
    label: string;
    kind: 'external' | 'upload';
    pageCount: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    engagement: string;
}

function prettifySlug(slug: string): string {
    return slug.split(/[-_]/).map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

export const SourceScopeRail: React.FC<Props> = ({ isOpen, onClose, engagement }) => {
    const [rows, setRows] = useState<SourceRow[]>([]);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const url = `${PROXY_BASE}/api/manifest/chunks?engagement=${encodeURIComponent(engagement || '')}&include_pages=true`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(12_000) });
                if (!resp.ok) { if (!cancelled) setError(`manifest ${resp.status}`); return; }
                const data = await resp.json();
                const pages: Record<string, { title?: string }> =
                    (data && typeof data.pages === 'object' && data.pages) ? data.pages : {};
                const groups = new Map<string, SourceRow>();
                for (const [wikiPath, meta] of Object.entries(pages)) {
                    const parts = String(wikiPath).split('/');
                    const dir = parts.length >= 3 ? parts[1] : (parts[0] || 'other');
                    if (/^client-uploads?$/i.test(dir)) {
                        const title = String(meta?.title || parts[parts.length - 1] || 'Upload').trim();
                        const token = title.toLowerCase();
                        const prior = groups.get(`u:${token}`);
                        groups.set(`u:${token}`, {
                            token, label: title, kind: 'upload',
                            pageCount: (prior?.pageCount || 0) + 1,
                        });
                    } else {
                        const token = dir.toLowerCase();
                        const prior = groups.get(`e:${token}`);
                        groups.set(`e:${token}`, {
                            token, label: prettifySlug(dir), kind: 'external',
                            pageCount: (prior?.pageCount || 0) + 1,
                        });
                    }
                }
                const list = Array.from(groups.values())
                    .sort((a, b) => (a.kind === b.kind ? b.pageCount - a.pageCount : a.kind === 'upload' ? -1 : 1));
                if (cancelled) return;
                setRows(list);
                // Initialize from the live constraint: empty includeOnly = all checked.
                const current = getSessionConstraints(engagement || '').includeOnly;
                if (!current.length) {
                    setChecked(new Set(list.map(r => r.token)));
                } else {
                    const cur = current.map(c => c.toLowerCase());
                    setChecked(new Set(list.filter(r => cur.some(c => r.token.includes(c) || c.includes(r.token))).map(r => r.token)));
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'failed to load sources');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, engagement]);

    const allChecked = useMemo(() => rows.length > 0 && rows.every(r => checked.has(r.token)), [rows, checked]);
    const scopeCount = checked.size;

    if (!isOpen) return null;

    const apply = () => {
        // All checked, or nothing checked, means no scope constraint.
        const tokens = (allChecked || scopeCount === 0) ? [] : rows.filter(r => checked.has(r.token)).map(r => r.token);
        setSourceScope(engagement || '', tokens);
        onClose();
    };

    const toggle = (token: string) => {
        setChecked(prev => {
            const next = new Set(prev);
            if (next.has(token)) next.delete(token); else next.add(token);
            return next;
        });
    };

    const section = (kind: 'upload' | 'external', title: string) => {
        const items = rows.filter(r => r.kind === kind);
        if (!items.length) return null;
        return (
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#115054', margin: '8px 0 6px' }}>{title}</div>
                {items.map(r => (
                    <label key={`${r.kind}:${r.token}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer', borderBottom: '1px solid #F0F0EC' }}>
                        <input type="checkbox" checked={checked.has(r.token)} onChange={() => toggle(r.token)} style={{ accentColor: '#B8B800' }} />
                        <span style={{ fontSize: 11, color: '#222', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                        <span style={{ fontSize: 8.5, color: '#999' }}>{r.pageCount} page{r.pageCount === 1 ? '' : 's'}</span>
                    </label>
                ))}
            </div>
        );
    };

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.45)' }} />
            <div style={{
                position: 'relative', width: 320, maxWidth: '92%', height: '100%', background: '#FAFAF7',
                borderLeft: '2px solid #0D0D0D', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ background: '#0D0D0D', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8B800' }}>Source Scope</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Answers and outputs draw only from checked sources</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: '2px 6px' }}>X</button>
                </div>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #E8E8E8', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                        onClick={() => setChecked(allChecked ? new Set() : new Set(rows.map(r => r.token)))}
                        style={{ fontSize: 8, color: '#0D0D0D', background: 'none', border: '1px solid #999', padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                        {allChecked ? 'Uncheck all' : 'Check all'}
                    </button>
                    <span style={{ fontSize: 9, color: '#777' }}>
                        {allChecked || scopeCount === 0 ? 'No scope: every source eligible' : `${scopeCount} of ${rows.length} in scope`}
                    </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px 14px 16px' }}>
                    {loading && <div style={{ fontSize: 10, color: '#888', padding: '12px 0' }}>Reading the source catalog...</div>}
                    {error && <div style={{ fontSize: 10, color: '#8A3B1F', padding: '12px 0' }}>Could not load sources: {error}</div>}
                    {!loading && !error && rows.length === 0 && (
                        <div style={{ fontSize: 10, color: '#888', padding: '12px 0' }}>
                            No ingested sources yet. Sources appear here after uploads are archived or collection runs.
                        </div>
                    )}
                    {section('upload', 'Client uploads')}
                    {section('external', 'External sources')}
                </div>
                <div style={{ padding: '10px 14px', borderTop: '1px solid #E8E8E8', display: 'flex', gap: 8 }}>
                    <button onClick={apply} style={{ flex: 1, fontSize: 9, color: '#0D0D0D', background: '#B8B800', border: '1px solid #B8B800', padding: '7px 10px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                        Apply scope
                    </button>
                    <button onClick={() => { setSourceScope(engagement || '', []); onClose(); }} style={{ fontSize: 9, color: '#333', background: 'none', border: '1px solid #999', padding: '7px 10px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SourceScopeRail;
