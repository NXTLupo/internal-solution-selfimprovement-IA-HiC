/**
 * WikiArticleViewer - full-screen overlay that renders a wiki article
 * body so the user can verify what the AI actually has access to.
 *
 * This is the accountability surface for the wiki-as-RAG architecture
 * (Phase 1-retrofit 2026-04-20). The Analyst Desk shows a "⌘ ARCHIVED"
 * badge whenever an evidence node has a wikiPath; clicking it opens this
 * viewer so the user can read the real extracted body and confirm that
 * the AI has the full article (not just a headline) to cite from.
 *
 * Data flow:
 *   AnalystDesk click → setActiveWikiPath(path) → WikiArticleViewer mounts
 *   viewer fetches GET /api/wiki/read-article/{path} → parses frontmatter
 *   renders title + metadata chips + raw body text
 *
 * Non-blocking: fetch failure shows an error state with the raw path so
 * the user can debug manually. Close button returns to whatever was
 * behind.
 */

import React, { useEffect, useState } from 'react';

interface Props {
    /** The wikiPath to load, e.g. "articles/evertrue/a1b2c3d4e5.md".
     *  When null/undefined, the component renders nothing. */
    wikiPath: string | null;
    /** Called when the user closes the viewer (backdrop click / ESC / button). */
    onClose: () => void;
    /** Optional callback: when the user clicks "open source URL", the
     *  parent decides what to do. Defaults to window.open. */
    onOpenUrl?: (url: string) => void;
}

interface WikiArticle {
    wikiPath: string;
    url?: string;
    title?: string;
    source?: string;
    author?: string;
    date?: string;
    kind?: string;
    method?: string;
    tier?: string;
    chars?: number;
    body: string;
}

const PROXY = 'http://127.0.0.1:5012';

function parseArticleFromRawContent(raw: string, wikiPath: string): WikiArticle {
    const article: WikiArticle = { wikiPath, body: '' };
    // Parse frontmatter
    if (raw.startsWith('---')) {
        const end = raw.indexOf('\n---', 3);
        if (end > 0) {
            const block = raw.substring(3, end);
            for (const line of block.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const idx = trimmed.indexOf(':');
                if (idx <= 0) continue;
                const key = trimmed.substring(0, idx).trim();
                let val = trimmed.substring(idx + 1).trim();
                // Strip surrounding quotes
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.substring(1, val.length - 1);
                }
                (article as any)[key] = val;
            }
            let body = raw.substring(end + 5);
            // Strip h1 and Source:[]() line
            body = body.replace(/^\s*#\s+[^\n]+\n+/, '');
            body = body.replace(/^Source:\s+\[[^\]]+\]\([^)]+\)\n+/, '');
            article.body = body.trim();
            return article;
        }
    }
    article.body = raw;
    return article;
}

export const WikiArticleViewer: React.FC<Props> = ({ wikiPath, onClose, onOpenUrl }) => {
    const [article, setArticle] = useState<WikiArticle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!wikiPath) return;
        setLoading(true);
        setError(null);
        setArticle(null);
        const abort = new AbortController();
        (async () => {
            try {
                const url = `${PROXY}/api/wiki/read-article/${encodeURIComponent(wikiPath)}`;
                const resp = await fetch(url, { signal: abort.signal });
                if (!resp.ok) {
                    setError(`Failed to load (${resp.status}): ${wikiPath}`);
                    return;
                }
                const data = await resp.json();
                if (!data.content) {
                    setError(`Empty content: ${wikiPath}`);
                    return;
                }
                setArticle(parseArticleFromRawContent(data.content, data.wikiPath || wikiPath));
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    setError(e?.message || 'Unknown error');
                }
            } finally {
                setLoading(false);
            }
        })();
        return () => abort.abort();
    }, [wikiPath]);

    useEffect(() => {
        if (!wikiPath) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [wikiPath, onClose]);

    if (!wikiPath) return null;

    const handleOpenUrl = (url?: string) => {
        if (!url) return;
        if (onOpenUrl) onOpenUrl(url);
        else window.open(url, '_blank', 'noopener,noreferrer');
    };

    const displayChars = article?.chars ? Number(article.chars) : article?.body?.length || 0;
    const kcharsLabel = displayChars >= 1000 ? `${Math.round(displayChars / 1000)}k chars` : `${displayChars} chars`;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(10, 10, 10, 0.82)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'stretch', justifyContent: 'center',
                padding: 40,
                fontFamily: "'Archivo', system-ui, sans-serif",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: '#FAFAF5',
                    color: '#141414',
                    width: '100%', maxWidth: 1040, maxHeight: '100%',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 40px 120px rgba(0,0,0,0.4)',
                }}
            >
                {/* Header */}
                <div style={{
                    borderBottom: '1px solid #D8D8D0',
                    padding: '18px 24px 14px',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20,
                }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                            fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase',
                            fontWeight: 700, color: '#B8B800', marginBottom: 8,
                        }}>
                            WIKI ARCHIVE · {(article?.kind || 'article').toUpperCase()}
                        </div>
                        <div style={{
                            fontFamily: "'Bebas Neue', 'Archivo', sans-serif",
                            fontSize: 30, lineHeight: 1.1, fontWeight: 600,
                            letterSpacing: '-0.01em', color: '#141414',
                        }}>
                            {article?.title || (loading ? 'Loading...' : 'Article')}
                        </div>
                        {/* Metadata chips */}
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#4B4B4B' }}>
                            {article?.source && <Chip label="SOURCE" value={article.source} />}
                            {article?.date && <Chip label="DATE" value={article.date} />}
                            {article?.author && <Chip label="AUTHOR" value={article.author} />}
                            {article?.method && <Chip label="EXTRACTED VIA" value={article.method.toUpperCase()} accent />}
                            {article?.tier && <Chip label="TIER" value={`T${article.tier}`} />}
                            <Chip label="SIZE" value={kcharsLabel} accent />
                            <Chip label="PATH" value={wikiPath} mono />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {article?.url && (
                            <button
                                onClick={() => handleOpenUrl(article.url)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #141414',
                                    color: '#141414',
                                    padding: '8px 14px',
                                    fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                OPEN SOURCE ↗
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: '#141414',
                                border: '1px solid #141414',
                                color: '#FFFFFF',
                                padding: '8px 14px',
                                fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            CLOSE (ESC)
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{
                    flex: 1, overflow: 'auto',
                    padding: '24px 32px 36px',
                }}>
                    {loading && (
                        <div style={{ color: '#888', fontSize: 13 }}>Fetching from wiki archive...</div>
                    )}
                    {error && (
                        <div style={{
                            border: '1px solid #CC6644', padding: '12px 16px',
                            color: '#8A3B1F', background: '#FDF0EC', fontSize: 12,
                        }}>
                            <strong>Read failed.</strong> {error}
                        </div>
                    )}
                    {article && !loading && !error && (
                        <div style={{
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            fontSize: 14, lineHeight: 1.65,
                            color: '#1A1A1A', fontWeight: 400,
                            fontFamily: "'Archivo', system-ui, sans-serif",
                        }}>
                            {article.body || '(empty body)'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    borderTop: '1px solid #D8D8D0',
                    padding: '10px 24px',
                    fontSize: 10, letterSpacing: 1.2,
                    color: '#888', textTransform: 'uppercase',
                    display: 'flex', justifyContent: 'space-between',
                }}>
                    <span>Read-only · stored in /hic-workspace/wiki/</span>
                    <span>{kcharsLabel}</span>
                </div>
            </div>
        </div>
    );
};

const Chip: React.FC<{ label: string; value: string; accent?: boolean; mono?: boolean }> = ({ label, value, accent, mono }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 8px',
        border: `1px solid ${accent ? '#B8B800' : '#D0D0C8'}`,
        background: accent ? '#F8F8E6' : 'transparent',
        color: '#141414',
        fontSize: 10, letterSpacing: 1.2, fontWeight: 700,
        textTransform: 'uppercase',
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
    }}>
        <span style={{ color: '#888' }}>{label}</span>
        <span style={{ color: accent ? '#6B6B00' : '#141414' }}>{value}</span>
    </span>
);

export default WikiArticleViewer;
