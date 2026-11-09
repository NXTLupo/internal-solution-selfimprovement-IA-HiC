/**
 * coverageRecheck: the INDEPENDENT export-time re-check of a deck's coverage contract (2026-10-02, plan
 * deliverable-rules-and-coverage-all-hashtags step "independent re-check at export"). Separate code from the
 * generation-time contract (services/deliverableCoverage.ts): it reads only the ids stamped on the slides being
 * exported and the universe recorded at generation, and reports every item no exported slide carries any more
 * (a carrying slide was rejected or deleted before export). It never re-matches prose and never blocks the export.
 */
import type { CoverageUniverseRecord } from './deliverableCoverage';

export interface ExportCoverageCheck { checked: number; missing: Array<{ id: string; label: string }> }

export function recheckExportedCoverage(record: CoverageUniverseRecord | undefined, slides: Array<{ status?: string; _coverageIds?: string[] }>, before?: Array<{ _coverageIds?: string[] }>): ExportCoverageCheck | null {
    if (!record || !record.items.length) return null;
    const carried = new Set<string>();
    for (const s of slides) if (s && s.status !== 'rejected') for (const id of s._coverageIds || []) carried.add(id);
    // 2026-10-05: an item counts as LOST only when some slide in the chat carried it before export (`before`: every
    // lifted slide, rejected ones included). Items no slide was ever stamped with are not an export loss; reporting
    // them read as "27 of 40 items are no longer carried" on a clean export.
    const had = before ? new Set(before.flatMap(s => s?._coverageIds || [])) : null;
    const missing = record.items
        .filter(it => !(it.anyOf || [it.id]).some(id => carried.has(id)))
        .filter(it => !had || (it.anyOf || [it.id]).some(id => had.has(id)))
        .map(({ id, label }) => ({ id, label }));
    return { checked: record.items.length, missing };
}

/** One line for the export notice. */
export function formatExportCoverageCheck(c: ExportCoverageCheck | null): string {
    if (!c) return '';
    if (!c.missing.length) return `Export coverage re-check: all ${c.checked} client items and research themes are carried by the exported slides.`;
    const names = c.missing.slice(0, 10).map(m => m.label).join('; ');
    return `Export coverage re-check: ${c.missing.length} of ${c.checked} items are no longer carried by any exported slide (a slide that carried them was rejected or removed): ${names}${c.missing.length > 10 ? `; and ${c.missing.length - 10} more` : ''}.`;
}
