/**
 * prdXlsx: the client side of the #prd requirements workbook (owner directive 2026-10-02: "the #PRD
 * needs to produce a structured set of requirements as an XLS (spreadsheet), not an HTML document!").
 *
 * The compiled PrdAir record is POSTed to the proxy (`/api/prd/export-xlsx`, built by proxy/prd_xlsx.py);
 * the reply is the .xlsx bytes. This module owns the request, the browser download, an in-memory cache so
 * the chat's "Download requirements workbook" button can re-download without a second build, and the
 * concise requirements summary the chat reply leads with. No model call; no DOM access outside `download`.
 */
import type { PrdAir, PrdTier } from './prdAir';

const DEFAULT_PROXY = 'http://127.0.0.1:5012';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface PrdWorkbookResult {
    blob: Blob;
    filename: string;
    requirementCount: number;
    /** The proxy's independent export check ("pass" or the failing checks; the workbook ships either way). */
    checks?: string;
}

export interface PrdRequirementSummary {
    total: number;
    counts: Record<PrdTier, number>;
    mustHaves: Array<{ id: string; text: string }>;
}

/** Same slug rule as proxy/prd_xlsx.py `slug_filename`, used when the response carries no filename. */
export function prdWorkbookFilename(title: string, brand = 'nxt'): string {
    const s = String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '') || 'prd';
    return `${s}-requirements-${String(brand || 'nxt').toLowerCase()}.xlsx`;
}

function filenameFromDisposition(h: string | null): string | null {
    if (!h) return null;
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(h);
    return m ? decodeURIComponent(m[1]) : null;
}

/** Counts by priority plus the must-haves (id + requirement text), in the record's requirement order. */
export function summarizePrdRequirements(air: PrdAir): PrdRequirementSummary {
    const reqs = air?.graph?.requirements || [];
    const order = air?.sections?.requirements?.requirementIds || [];
    const ordered = [...reqs].sort((a, b) => {
        const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
        return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib);
    });
    const counts: Record<PrdTier, number> = { must: 0, should: 0, could: 0, wont: 0 };
    for (const r of ordered) if (r.tier in counts) counts[r.tier] += 1;
    return {
        total: ordered.length,
        counts,
        mustHaves: ordered.filter(r => r.tier === 'must').map(r => ({ id: r.id, text: stripPointers(r.text) })),
    };
}

/** Inline pointer brackets never reach display text (they live in the workbook's pointer columns). */
export function stripPointers(s: string): string {
    return String(s || '').replace(/\s*\[[^\[\]]*?(?:#c\d+|CHUNK_\w+)[^\[\]]*?\]/g, '').replace(/\s*—\s*/g, ', ').trim();
}

/** The chat reply body: workbook first, then counts and the must-haves, then the brief as secondary. */
export function formatPrdWorkbookReply(opts: {
    title: string;
    summary: PrdRequirementSummary;
    filename?: string;
    exportError?: string;
    claimCheck?: string;
}): string {
    const { title, summary, filename, exportError, claimCheck } = opts;
    const c = summary.counts;
    // Never end a line with "<number>.": the chat markdown renderer reads it as an ordered-list marker and drops the
    // figure (run 3: "Won't 77." rendered as list item "01").
    const countLine = `${summary.total} requirement${summary.total === 1 ? '' : 's'} (Must ${c.must}, Should ${c.should}, Could ${c.could}, Won't ${c.wont}).`;
    const lines: string[] = [];
    if (exportError) {
        lines.push(`Requirements workbook could not be built (${exportError}); the summary and the PRD brief are below. Use the download button to retry.`);
        lines.push('', `**${title}**`, countLine);
    } else {
        lines.push(`Requirements workbook ready: **${title}**`, `Downloaded ${filename || 'the .xlsx'}. ${countLine}`);
    }
    if (summary.mustHaves.length) {
        lines.push('', 'Must-haves:');
        for (const m of summary.mustHaves) lines.push(`- ${m.id}: ${m.text}`);
    }
    lines.push('', 'Each row carries its acceptance tests (Given/When/Then), target, traced pains and gaps, evidence quote with source and pointer, success signals, owner and release. The PRD brief is saved alongside it.');
    // The brief is a separate HTML summary graded by the claim chain; its blocking rows are listed in its own claim
    // ledger and do not change the workbook's receipt (2026-10-03: the two read as contradictory).
    if (claimCheck) lines.push(`Claim check on the HTML brief (graded separately from the workbook): ${claimCheck}.`);
    return lines.join('\n');
}

/** POST the PrdAir record; resolves with the workbook bytes. Throws with the proxy's message on failure. */
export async function exportPrdWorkbook(
    air: PrdAir,
    opts: { brand?: string; title?: string; slug?: string; proxyBase?: string; fetchImpl?: typeof fetch } = {},
): Promise<PrdWorkbookResult> {
    const base = opts.proxyBase ?? (typeof window !== 'undefined' ? DEFAULT_PROXY : '');
    const f = opts.fetchImpl || fetch;
    const brand = String(opts.brand || air?.brand || 'nxt').toLowerCase();
    const title = opts.title || air?.title || 'prd';
    const resp = await f(`${base}/api/prd/export-xlsx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ air, brand, title, slug: opts.slug || undefined }),
    });
    if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        let detail = msg;
        try { detail = JSON.parse(msg)?.detail || msg; } catch { /* plain text */ }
        throw new Error(`HTTP ${resp.status}${detail ? `: ${String(detail).slice(0, 160)}` : ''}`);
    }
    const blob = await resp.blob();
    const filename = filenameFromDisposition(resp.headers.get('Content-Disposition')) || prdWorkbookFilename(title, brand);
    const n = Number(resp.headers.get('X-Requirement-Count'));
    return {
        blob: blob.type ? blob : new Blob([blob], { type: XLSX_MIME }),
        filename,
        requirementCount: Number.isFinite(n) && n > 0 ? n : (air?.graph?.requirements || []).length,
        checks: resp.headers.get('X-Prd-Checks') || undefined,
    };
}

/** Trigger a browser download of a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---- re-download cache (per chat message; lives for the page session) ----------------------------

interface CachedWorkbook {
    air: PrdAir;
    brand: string;
    title: string;
    slug?: string;
    result?: PrdWorkbookResult;
}
const _cache = new Map<string, CachedWorkbook>();

export function rememberPrdWorkbook(key: string, entry: CachedWorkbook): void {
    _cache.set(key, entry);
}

export function hasPrdWorkbook(key: string): boolean {
    return _cache.has(key);
}

/**
 * Download the workbook for a chat message again: the cached bytes when the build succeeded, else a fresh
 * build from the cached record (the retry path after a failed export). Throws when the page was reloaded
 * and the record is gone; the caller says so in one line.
 */
export async function redownloadPrdWorkbook(key: string, opts: { proxyBase?: string; fetchImpl?: typeof fetch; download?: (b: Blob, n: string) => void } = {}): Promise<PrdWorkbookResult> {
    const entry = _cache.get(key);
    if (!entry) throw new Error('the requirements record is no longer in memory; run #prd again to rebuild the workbook');
    const result = entry.result || await exportPrdWorkbook(entry.air, { brand: entry.brand, title: entry.title, slug: entry.slug, proxyBase: opts.proxyBase, fetchImpl: opts.fetchImpl });
    entry.result = result;
    (opts.download || downloadBlob)(result.blob, result.filename);
    return result;
}
