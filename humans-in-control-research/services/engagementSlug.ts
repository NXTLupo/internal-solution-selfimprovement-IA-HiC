import { engagementSlug, researchGoal } from './runState';
/**
 * ONE ENGAGEMENT SLUG (2026-08-21)
 *
 * The 2026-08-21 audit found one engagement filed under TWO names: 18 artifacts
 * and every AIR record under `analyze-the-executive-search-industry-to-map-current-trends`,
 * the session state and chat under
 * `analyze-the-executive-search-industry-to-map-current-trends-against-dsg-globals`.
 * Nothing could answer "what happened in this engagement?" because the answer
 * lived in two folders that did not know about each other.
 *
 * The cause was six independent copies of the same derivation, differing only in
 * where they truncated (App.tsx at 60, the proxy's `_safe_session_slug` at 80,
 * geminiService at 60, researchFabricOrchestrator at 60, ...). This module is the
 * single derivation. It matches `proxy/app.py::_safe_session_slug` exactly, so
 * the SPA and the proxy agree on the folder name for the same goal.
 *
 * If this changes, change `_safe_session_slug` in the same commit. A mismatch
 * does not throw; it silently splits an engagement in half, which is why the
 * parity is pinned by `engagementSlug.test.ts`.
 */

/** Matches proxy `_safe_session_slug`: lowercase, alnum + space/dash/underscore, dashed, 80 chars. */
export const ENGAGEMENT_SLUG_MAX = 80;

export function engagementSlugFor(goal: string): string {
    const raw = String(goal || '').toLowerCase();
    // Keep alphanumerics, spaces, dashes and underscores; drop everything else
    // (the proxy drops the same set).
    const kept = Array.from(raw)
        .filter(ch => /[a-z0-9]/.test(ch) || ch === ' ' || ch === '-' || ch === '_')
        .join('');
    const dashed = kept.split(/\s+/).filter(Boolean).join('-');
    return dashed.replace(/^-+|-+$/g, '').slice(0, ENGAGEMENT_SLUG_MAX).replace(/-+$/g, '');
}

/**
 * The slug for the CURRENT engagement. Reads the window global App.tsx sets, and
 * falls back to deriving it from the goal so a caller can never silently write to
 * `_unassigned/` just because the global has not been set yet.
 */
export function currentEngagementSlugOrDerive(goalFallback?: string): string {
    const slug = engagementSlug();
    if (slug) return slug;
    const goal = researchGoal();
    if (goal) return engagementSlugFor(goal);
    return goalFallback ? engagementSlugFor(goalFallback) : '';
}
