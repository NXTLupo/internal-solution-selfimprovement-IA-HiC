/**
 * KnowledgeLibraryClosureBanner.tsx - 2026-06-06 (Fix 1 visibility close).
 *
 * Post-run banner shown in the Analyst Desk that gives the user OBSERVABILITY
 * into whether their Knowledge Library selection was actually honored by the
 * generation pipeline. Closes the auditor's Gap 8: KL selection counts shown
 * at runtime, but no closure feedback after generation. Reads:
 *
 *   - `cached_selection` from the engagement manifest (what the user picked)
 *   - The most recent auditor verdict's `cached_selection_coverage` field
 *     (what the model actually delivered)
 *
 * Renders as a compact NXT-styled callout:  when coverage = 100%,  when below
 * (2026-06-06 - NO FLOORS; the validator now requires 100%). One-click
 * "regenerate with reminder" button is shown on violation. A "Clear for fresh
 * run" button lets the user opt out of cached carry-forward per-run without
 * losing their KL selection long-term.
 *
 * Architecture position:
 *   - Wiki / Manifest: reads engagements/<slug>/manifest.json.cached_selection
 *   - Skill: surfaces the §N "Cached-selection contract" status from the
 *     per-deliverable skill the deliverable ran against
 *   - Hook: shows the hook-rejection-log.md count for this engagement
 *   - Subagent: reads the per-deliverable auditor's
 *     cached_selection_coverage.coverage_pct field
 *   - Self-improvement: clicking "regenerate" with the reminder is a
 *     human-in-the-loop signal the epoch proposer mines as a recurring
 *     pattern when it happens 3+ times for the same skill
 */

import React, { useState, useEffect } from 'react';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface CachedSelectionClosure {
    selected_total: number;
    emitted_cached: number;
    emitted_extended: number;
    emitted_new: number;
    coverage_pct: number;
    floor_violated: boolean;
    deliverable?: string;
}

export interface Props {
    /** Engagement slug - used to read manifest.cached_selection. */
    engagementSlug: string | null;
    /** When provided, the banner shows the actual closure for the most-recent
     *  emission. When undefined, banner shows "selection persisted, awaiting
     *  first deliverable" state. */
    closure?: CachedSelectionClosure;
    /** Fires when user clicks "regenerate with reminder" on a floor violation. */
    onRegenerate?: () => void;
    /** Style accent color (defaults to NXT cyan). */
    accentColor?: string;
}

export const KnowledgeLibraryClosureBanner: React.FC<Props> = ({
    engagementSlug,
    closure,
    onRegenerate,
    accentColor = '#00B7C3',
}) => {
    const [manifestSelected, setManifestSelected] = useState<number | null>(null);

    // 2026-06-06 - Read the USER-LEVEL store (active.json) as the source
    // of truth. The engagement manifest is a snapshot; the user-level
    // store is what generation actually consults. This prevents the
    // banner from misleading the user when the manifest still carries
    // a prior snapshot but the active selection is empty / cleared.
    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch(`${PROXY_BASE}/api/user-selection/active`);
                if (!resp.ok) return;
                const cs = await resp.json();
                if (cs && !cs._uncommitted) {
                    const total =
                        (cs.theme_cluster_ids?.length || 0) +
                        (cs.article_sources?.length || 0) +
                        (cs.engagement_slugs?.length || 0) +
                        (cs.social_subreddits?.length || 0) +
                        (cs.source_archive_paths?.length || 0);
                    setManifestSelected(total);
                } else {
                    setManifestSelected(0);
                }
            } catch {
                setManifestSelected(0);
            }
        })();
    }, [engagementSlug]);

    // P1 (2026-06-06) - Render NOTHING when the user has no active
    // selection. Previous behavior could surface a stale "X items persisted"
    // message from a prior manifest even when the user hadn't curated for
    // THIS run. Prevents tainting the user's mental model of what's in scope.
    if (manifestSelected === null || manifestSelected === 0) return null;

    const handleClear = async () => {
        try {
            await fetch(`${PROXY_BASE}/api/user-selection/active`, { method: 'DELETE' });
            setManifestSelected(0);
            try {
                if (typeof window !== 'undefined') (window as any).__hicCachedOnlyMode = false;
            } catch { /* non-fatal */ }
        } catch { /* silent */ }
    };

    // Pre-emission state: selection persisted, no deliverable run yet.
    // 2026-06-06 - Compact inline chip (was a full-width black bar that
    // dominated the landing page). Sits inline above the deliverable cards.
    if (!closure) {
        return (
            <div
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    padding: '5px 10px',
                    background: '#FAFAFA',
                    border: `1px solid #E5E5E5`,
                    borderRadius: 2,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10, letterSpacing: 0.5,
                    color: '#525252',
                    margin: '8px 0',
                }}
                title="Your active Knowledge Library selection will be applied to the next run. 100% of selected items must appear as cached or extended in the emission."
            >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />
                <span style={{ color: accentColor, fontWeight: 700, textTransform: 'uppercase' }}>KL</span>
                <span><strong style={{ color: '#B8B800' }}>{manifestSelected}</strong> items will apply to next run · 100% required</span>
                <button
                    type="button"
                    onClick={handleClear}
                    style={{
                        marginLeft: 6, padding: '2px 8px',
                        background: 'transparent', color: '#CC6644',
                        border: '1px solid #CC6644', borderRadius: 1,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                        letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                    }}
                >
                    Clear
                </button>
            </div>
        );
    }

    // Post-emission: real coverage data available. 100% is now the floor.
    const goodCoverage = closure.coverage_pct >= 100;
    const bg = goodCoverage ? '#0CCE6B22' : '#CC664422';
    const borderColor = goodCoverage ? '#0CCE6B' : '#CC6644';
    const icon = goodCoverage ? '' : '';
    const label = goodCoverage ? 'SELECTION HONORED' : 'COVERAGE BELOW FLOOR';

    return (
        <div
            style={{
                background: bg,
                color: '#0D0D0D',
                padding: '14px 20px',
                border: `1px solid ${borderColor}`,
                borderLeft: `4px solid ${borderColor}`,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                letterSpacing: '0.5px',
                margin: '12px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: borderColor, fontWeight: 700, fontSize: '16px' }}>{icon}</span>
                <span style={{ color: borderColor, fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#0D0D0D', opacity: 0.7 }}>
                    {closure.deliverable ? closure.deliverable + ' · ' : ''}
                    {closure.coverage_pct.toFixed(0)}% coverage
                </span>
            </div>
            <div style={{ fontFamily: 'Archivo, sans-serif', fontSize: '14px', color: '#0D0D0D' }}>
                Of your <strong>{closure.selected_total}</strong> selected item(s):{' '}
                <strong>{closure.emitted_cached}</strong> carried forward unchanged,{' '}
                <strong>{closure.emitted_extended}</strong> extended with new evidence,{' '}
                <strong>{closure.emitted_new}</strong> new from the corpus.
            </div>
            {!goodCoverage && onRegenerate && (
                <button
                    onClick={onRegenerate}
                    style={{
                        background: '#0D0D0D',
                        color: '#B8B800',
                        border: 'none',
                        padding: '8px 16px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        marginTop: '4px',
                    }}
                >
                    Regenerate with explicit reminder
                </button>
            )}
        </div>
    );
};

export default KnowledgeLibraryClosureBanner;
