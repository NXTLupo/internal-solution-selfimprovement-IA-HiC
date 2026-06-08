/**
 * sourcePackResolver.ts (2026-05-29) - resolve selected source packs to the
 * union of their source IDs, for the pack-based landing-page selection UX.
 *
 * Packs are defined server-side (proxy SOURCE_PACKS) and resolve dynamically
 * over the live SOURCES registry, so this stays correct as sources are added.
 */
const PROXY_BASE = 'http://127.0.0.1:5012';

export interface SourcePackSummary {
    id: string;
    name: string;
    kind: 'industry' | 'theme';
    industries: string[];
    description: string;
    sourceCount: number;
}

/** Fetch the pack registry (for the selector UI). */
export async function fetchSourcePacks(proxyBase: string = PROXY_BASE): Promise<SourcePackSummary[]> {
    try {
        const r = await fetch(`${proxyBase}/api/source-packs`);
        if (!r.ok) return [];
        const d = await r.json();
        return (d.packs || []) as SourcePackSummary[];
    } catch {
        return [];
    }
}

/**
 * Resolve selected pack IDs to a de-duped list of source IDs, ready to feed
 * the existing collection path. Resolves each pack server-side and unions.
 */
export async function resolvePacksToSourceIds(
    packIds: string[],
    proxyBase: string = PROXY_BASE,
): Promise<string[]> {
    if (!packIds || packIds.length === 0) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    await Promise.all(packIds.map(async (pid) => {
        try {
            const r = await fetch(`${proxyBase}/api/source-packs/${encodeURIComponent(pid)}`);
            if (!r.ok) return;
            const d = await r.json();
            for (const sid of (d.sourceIds || [])) {
                if (!seen.has(sid)) { seen.add(sid); out.push(sid); }
            }
        } catch { /* skip a failed pack; others still resolve */ }
    }));
    return out;
}
