/**
 * ThemeDeepDiveModal.tsx - 2026-06-08
 *
 * The Research Browser's deep-dive surface: clicking a theme's "inspect" opens
 * this modal with the FULL analytic depth (interpretation, sub-themes,
 * contradictions, temporal arc, dimensions, implications) AND every cited piece
 * of evidence with a WORKING link back to the original online source - reddit
 * posts, articles, websites, YouTube videos - resolved from the corpus the
 * manifest logs.
 *
 * Source link-back: theme citations carry a sourceFile basename + sourceName but
 * an empty url; the real URL lives in the source wiki file's frontmatter. On open
 * we POST the citation sourceFiles to /api/source/resolve, which returns
 * {url, wikiPath, kind, title, author, date}. resolveTarget() (mirrors
 * AnalystDeskKnowledgeGraph.resolveSourceTarget - inlined to avoid a circular
 * import) turns that into an external link (opens the live source) or an archive
 * link (opens the stored copy via onOpenWiki).
 */
import React, { useState, useEffect, useCallback } from 'react';

const PROXY_BASE = 'http://127.0.0.1:5012';

function resolveTarget(o: { url?: string; wikiPath?: string }): { kind: 'external' | 'archive'; href: string } | null {
    const url = (o.url || '').trim();
    const wikiPath = (o.wikiPath || '').trim();
    if (/^https?:\/\//i.test(url)) return { kind: 'external', href: url };
    if (/^doi:/i.test(url)) return { kind: 'external', href: `https://doi.org/${url.replace(/^doi:/i, '')}` };
    if (/^10\.\d{4,}\/\S+$/.test(url)) return { kind: 'external', href: `https://doi.org/${url}` };
    if (/^www\./i.test(url)) return { kind: 'external', href: `https://${url}` };
    if (wikiPath) return { kind: 'archive', href: wikiPath };
    if (url && /\.md$/i.test(url)) return { kind: 'archive', href: url };
    return null;
}

const KIND_ICON: Record<string, string> = {
    'social-post': 'reddit', 'video': 'video', 'transcript': 'video', 'article': 'article',
    'full-text': 'web', 'dataset': 'data', 'pdf_extracted': 'pdf',
};
function kindLabel(kind?: string, sourceName?: string): string {
    const k = (kind || '').toLowerCase();
    if (KIND_ICON[k]) return KIND_ICON[k].toUpperCase();
    const s = (sourceName || '').toLowerCase();
    if (/reddit/.test(s)) return 'REDDIT';
    if (/youtube|video/.test(s)) return 'VIDEO';
    if (/\.gov|dataset|openalex|crossref/.test(s)) return 'DATA';
    return 'WEB';
}

export interface ThemeDeepDiveModalProps {
    item: any | null;
    onClose: () => void;
    onOpenWiki?: (wikiPath: string, chunkPointer?: string) => void;
}

export const ThemeDeepDiveModal: React.FC<ThemeDeepDiveModalProps> = ({ item, onClose, onOpenWiki }) => {
    const [resolved, setResolved] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!item) { setResolved({}); return; }
        const cits = Array.isArray(item.citations) ? item.citations : [];
        const files = Array.from(new Set(cits.map((c: any) => c?.sourceFile).filter(Boolean))) as string[];
        if (files.length === 0) { setResolved({}); return; }
        let cancelled = false;
        setLoading(true);
        fetch(`${PROXY_BASE}/api/source/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files }),
        })
            .then(r => (r.ok ? r.json() : { resolved: {} }))
            .then(d => { if (!cancelled) setResolved(d?.resolved || {}); })
            .catch(() => { if (!cancelled) setResolved({}); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [item]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const openArchive = useCallback((wikiPath: string) => { onOpenWiki?.(wikiPath); }, [onOpenWiki]);

    if (!item) return null;

    const depth = item.depth || {};
    const cits: any[] = Array.isArray(item.citations) ? item.citations : [];
    const isCached = item.source === 'cached';

    const C = { bg: '#0D0D0D', panel: '#141414', line: '#2A2A2A', text: '#F5F5F0', muted: '#8A8A82', lime: '#B8B800', teal: '#00B7C3', rust: '#CC6644' };
    const sentColor = item.sentiment === 'positive' ? '#0CCE6B' : item.sentiment === 'negative' ? C.rust : item.sentiment === 'mixed' ? C.lime : C.muted;

    const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
        <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 2, color: C.lime, marginBottom: 6 }}>{label}</div>
            {children}
        </div>
    );
    const list = (arr?: string[]) => Array.isArray(arr) && arr.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 13, lineHeight: 1.6 }}>
            {arr.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ul>
    ) : null;

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.74)', zIndex: 9000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 0', overflow: 'auto' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ width: 'min(880px, 92vw)', background: C.bg, border: `1px solid ${C.line}`, borderTop: `3px solid ${sentColor}`, borderRadius: 3, color: C.text, fontFamily: 'Archivo, sans-serif', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            >
                {/* Header */}
                <div style={{ padding: '20px 26px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, color: sentColor, textTransform: 'uppercase' }}>{item.sentiment || 'neutral'}</span>
                            {typeof item.relevance === 'number' && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.teal }}>· RELEVANCE {Math.round(item.relevance)}</span>}
                            {isCached && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.lime, border: `1px solid ${C.lime}`, padding: '1px 5px' }}>CACHED</span>}
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 0.5, lineHeight: 1.05 }}>{item.title}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.muted, width: 30, height: 30, borderRadius: 2, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
                </div>

                <div style={{ padding: '20px 26px' }}>
                    {item.summary && <Section label="SUMMARY"><div style={{ fontSize: 14, lineHeight: 1.6, color: C.text }}>{item.summary}</div></Section>}
                    {list(depth.interpretation) && <Section label="WHAT IT MEANS">{list(depth.interpretation)}</Section>}
                    {list(depth.subThemes) && <Section label="SUB-THEMES">{list(depth.subThemes)}</Section>}
                    {list(depth.dimensions) && <Section label="DIMENSIONS">{list(depth.dimensions)}</Section>}
                    {depth.contradiction && <Section label="TENSION / CONTRADICTION"><div style={{ fontSize: 13, lineHeight: 1.6, color: C.text }}>{depth.contradiction}</div></Section>}
                    {depth.temporalArc && <Section label="HOW IT'S CHANGING"><div style={{ fontSize: 13, lineHeight: 1.6, color: C.text }}>{depth.temporalArc}</div></Section>}
                    {list(item.implications) && <Section label="IMPLICATIONS">{list(item.implications)}</Section>}

                    {/* Evidence with source link-backs */}
                    <Section label={`EVIDENCE & SOURCES${cits.length ? ` (${cits.length})` : ''}${loading ? ' - resolving links...' : ''}`}>
                        {cits.length === 0 && (
                            <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                                {isCached
                                    ? 'Carried-forward cached cluster: aggregated from a prior run, so it has no per-post citations. Re-run synthesis to attach live evidence.'
                                    : 'No citations attached to this theme.'}
                            </div>
                        )}
                        {cits.map((c: any, i: number) => {
                            const r = c?.sourceFile ? resolved[c.sourceFile] : null;
                            const tgt = resolveTarget({ url: (r?.url || c?.url || ''), wikiPath: r?.wikiPath || c?.wikiPath || '' });
                            const sname = c?.sourceName || r?.sourceName || 'source';
                            const author = c?.author || r?.author || '';
                            const date = (c?.publicationDate || c?.date || r?.date || '').toString().slice(0, 10);
                            const title = r?.title || '';
                            return (
                                <div key={i} style={{ borderLeft: `2px solid ${C.line}`, paddingLeft: 12, marginBottom: 14 }}>
                                    {c?.text && <div style={{ fontSize: 13, lineHeight: 1.55, color: C.text, fontStyle: 'italic', marginBottom: 5 }}>“{String(c.text).slice(0, 360)}”</div>}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.muted }}>
                                        <span style={{ color: C.teal }}>{kindLabel(r?.kind, sname)}</span>
                                        <span>{sname}</span>
                                        {author && <span>· {author}</span>}
                                        {date && <span>· {date}</span>}
                                        {title && <span style={{ color: C.muted }}>· {String(title).slice(0, 60)}</span>}
                                        {tgt?.kind === 'external' && (
                                            <a href={tgt.href} target="_blank" rel="noopener noreferrer" style={{ color: C.lime, textDecoration: 'none', fontWeight: 700 }}>View source ↗</a>
                                        )}
                                        {tgt?.kind === 'archive' && (
                                            <button onClick={() => openArchive(tgt.href)} style={{ background: 'transparent', border: 'none', color: C.teal, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700, padding: 0 }}>Open archived ↗</button>
                                        )}
                                        {!tgt && <span style={{ color: C.muted, fontStyle: 'italic' }}>(no link)</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default ThemeDeepDiveModal;
