/**
 * LandingScopeBar.tsx - 2026-06-06 landing-page redesign.
 *
 * The SCOPE zone of the three-zone composer (Scope | Prompt | History).
 * Sits at the very top of the IDLE landing page and answers ONE question
 * at a glance: "What corpus am I about to query?"
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ ● CATALOG · 60K chunks · 13K sources                            │
 *   │ ● KL · 547 items selected           [edit] [clear]              │
 *   │ ● MODE · cached-only                                           │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Replaces the friction of: KL state being implicit, manifest health
 * invisible, mode (cached-only) unsignaled. Reads three sources:
 *   - GET /api/manifest/chunks (catalog footprint)
 *   - GET /api/user-selection/active (KL state)
 *   - window.__hicCachedOnlyMode (mode flag set by App.tsx)
 *
 * Polls every 15s so a fresh ingest or KL apply reflects without reload.
 */

import React, { useEffect, useState } from 'react';
import { blendMode, cachedOnlyMode, setBlendMode, setCachedOnlyMode } from '../services/runState';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface LandingScopeBarProps {
    /** Called when user clicks "edit KL" - opens the Knowledge Library modal. */
    onEditKL?: () => void;
    /** Called after the user clicks "clear" and the user-selection store is wiped. */
    onClear?: () => void;
}

export const LandingScopeBar: React.FC<LandingScopeBarProps> = ({ onEditKL, onClear }) => {
    const [stats, setStats] = useState<{
        chunks: number;
        sources: number;
        klItems: number;
        cachedOnly: boolean;
        loaded: boolean;
    }>({ chunks: 0, sources: 0, klItems: 0, cachedOnly: false, loaded: false });

    // ENHANCEMENT A (2026-06-08): blend toggle. When on, a KL selection no
    // longer forces cached-only - App.tsx runs fresh collection AND merges the
    // cached selection (deduped by the corpus merge authority). Persisted on a
    // window flag the App.tsx collection gate reads.
    const [blend, setBlend] = useState<boolean>(blendMode());
    const toggleBlend = () => {
        setBlend(prev => {
            const next = !prev;
            setBlendMode(next);
            return next;
        });
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [c, sel] = await Promise.all([
                    fetch(`${PROXY_BASE}/api/manifest/chunks?engagement=&types=social-post,article,upload,transcript,synthesis`),
                    fetch(`${PROXY_BASE}/api/user-selection/active`),
                ]);
                if (cancelled) return;
                let chunks = 0, sources = 0, klItems = 0;
                if (c.ok) {
                    const cd = await c.json();
                    chunks = cd.chunk_id_count || 0;
                    sources = cd.source_count || 0;
                }
                if (sel.ok) {
                    const sd = await sel.json();
                    if (sd && !sd._uncommitted) {
                        klItems = (sd.theme_cluster_ids?.length || 0)
                            + (sd.article_sources?.length || 0)
                            + (sd.social_subreddits?.length || 0)
                            + (sd.engagement_slugs?.length || 0)
                            + (sd.source_archive_paths?.length || 0);
                    }
                }
                const cachedOnly = cachedOnlyMode();
                setStats({ chunks, sources, klItems, cachedOnly, loaded: true });
            } catch { /* silent */ }
        };
        void load();
        const interval = setInterval(load, 15_000);
        // Re-read immediately when App marks a prior selection dormant on fresh
        // load, or when the user applies/clears a selection (no 15s flash).
        const onChange = () => { void load(); };
        if (typeof window !== 'undefined') window.addEventListener('hic:selection-changed', onChange);
        return () => {
            cancelled = true;
            clearInterval(interval);
            if (typeof window !== 'undefined') window.removeEventListener('hic:selection-changed', onChange);
        };
    }, []);

    const handleClear = async () => {
        try {
            await fetch(`${PROXY_BASE}/api/user-selection/active`, { method: 'DELETE' });
            setCachedOnlyMode(false);
            setBlendMode(false);
            setBlend(false);
            setStats(s => ({ ...s, klItems: 0, cachedOnly: false }));
            onClear?.();
        } catch { /* silent */ }
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
    const hasKL = stats.klItems > 0;

    return (
        <div
            data-landing-scope-bar
            style={{
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 18,
                padding: '10px 20px',
                background: '#0D0D0D',
                borderBottom: '1px solid #1A1A1A',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: '#A3A3A3',
                letterSpacing: 0.5,
            }}
        >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B8B800' }} />
                <span style={{ textTransform: 'uppercase', color: '#737373' }}>Catalog</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                    {stats.loaded ? `${fmt(stats.chunks)} chunks` : '...'}
                </span>
                <span style={{ color: '#525252' }}>·</span>
                <span style={{ color: '#FFFFFF' }}>{stats.loaded ? `${fmt(stats.sources)} sources` : ''}</span>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasKL ? '#B8B800' : '#525252' }} />
                <span style={{ textTransform: 'uppercase', color: '#737373' }}>KL</span>
                <span style={{ color: hasKL ? '#B8B800' : '#737373', fontWeight: hasKL ? 600 : 400 }}>
                    {hasKL ? `${stats.klItems} items selected` : 'no selection'}
                </span>
                {onEditKL && (
                    <button
                        type="button"
                        onClick={onEditKL}
                        style={{
                            padding: '2px 8px', marginLeft: 4,
                            background: 'transparent', color: '#00B7C3',
                            border: '1px solid #00B7C3', borderRadius: 1,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                            letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                        }}
                    >
                        {hasKL ? 'Edit' : 'Curate'}
                    </button>
                )}
                {hasKL && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            padding: '2px 8px',
                            background: 'transparent', color: '#CC6644',
                            border: '1px solid #CC6644', borderRadius: 1,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                            letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                        }}
                    >
                        Clear
                    </button>
                )}
            </span>

            {(() => {
                // Effective mode: KL + blend off = cached-only; KL + blend on =
                // blend; no KL = fresh. The dot/colour follow the same logic.
                const modeLabel = hasKL ? (blend ? 'blend (cached + fresh)' : 'cached-only') : 'fresh';
                const modeColor = hasKL ? (blend ? '#00B7C3' : '#0CCE6B') : '#CC6644';
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: modeColor }} />
                        <span style={{ textTransform: 'uppercase', color: '#737373' }}>Mode</span>
                        <span style={{ color: modeColor, fontWeight: 600 }}>{modeLabel}</span>
                        {hasKL && (
                            <button
                                type="button"
                                onClick={toggleBlend}
                                title="Blend: run fresh external collection AND your cached selection together. Duplicates are collapsed automatically by content/url identity."
                                style={{
                                    padding: '2px 8px', marginLeft: 4,
                                    background: blend ? '#00B7C3' : 'transparent',
                                    color: blend ? '#0D0D0D' : '#00B7C3',
                                    border: '1px solid #00B7C3', borderRadius: 1,
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                                    letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700,
                                }}
                            >
                                {blend ? 'Blend ON' : 'Add fresh'}
                            </button>
                        )}
                    </span>
                );
            })()}

            <span style={{ marginLeft: 'auto', color: '#525252', fontSize: 10 }}>
                {hasKL
                    ? (blend
                        ? 'Blend: fresh external sources WILL be queried and merged with your cached selection (duplicates collapsed).'
                        : 'Your selection will be applied to the next run. No external API calls.')
                    : 'No KL selection. External sources will be queried per your run setup.'}
            </span>
        </div>
    );
};

export default LandingScopeBar;
