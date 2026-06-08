// presentationLibrary.ts
//
// 2026-05-09 - Library service for the persisted PresentationPayload
// objects emitted by the narrative composer (#presentation directives).
// Backed by the proxy's /api/presentations endpoints - no client-side
// caching beyond the in-flight fetches; the library is the single
// source of truth in wiki/presentations/{slug}.json.
//
// Used by the AI Analyst chat (CorpusChatPanel) when the user types
// `#presentations` to list, and clicks the per-card chips to open,
// edit, or delete an individual presentation.

import type { PresentationPayload, BrandVariant } from './presentationTypes';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface PresentationSummary {
    slug: string;
    title: string;
    brand: BrandVariant;
    generatedAt: string;
    narrativeThesis: string;
    sectionCount: number;
    sourceCount: { external?: number; uploaded?: number; analysis?: number; total?: number };
    url: string;
}

export interface PresentationListResult {
    total: number;
    results: PresentationSummary[];
}

/** List all persisted presentations, newest first. Server filters by
 *  optional brand or engagement substring; UI typically calls without
 *  filters and lets the user scan. */
export async function listPresentations(opts?: { brand?: BrandVariant; engagement?: string; limit?: number }): Promise<PresentationListResult> {
    const params = new URLSearchParams();
    if (opts?.brand) params.set('brand', opts.brand);
    if (opts?.engagement) params.set('engagement', opts.engagement);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params}` : '';
    const resp = await fetch(`${PROXY_BASE}/api/presentations${qs}`);
    if (!resp.ok) throw new Error(`listPresentations: HTTP ${resp.status}`);
    return resp.json();
}

/** Fetch a single presentation's full PresentationPayload by slug. Used
 *  before re-running the composer in revision mode, and as a sanity check
 *  when opening an old artifact. */
export async function getPresentation(slug: string): Promise<PresentationPayload> {
    const resp = await fetch(`${PROXY_BASE}/api/presentations/${encodeURIComponent(slug)}`);
    if (!resp.ok) throw new Error(`getPresentation(${slug}): HTTP ${resp.status}`);
    return resp.json();
}

/** Soft-delete by slug. The proxy moves the JSON to .deleted/{slug}.{ts}.json
 *  so accidental deletion is recoverable. Returns true on 200 OK. */
export async function deletePresentation(slug: string): Promise<boolean> {
    const resp = await fetch(`${PROXY_BASE}/api/presentations/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
    });
    if (resp.ok) return true;
    if (resp.status === 404) {
        console.warn(`[PresentationLibrary] delete: ${slug} not found (already deleted?)`);
        return false;
    }
    const errText = await resp.text().catch(() => '');
    throw new Error(`deletePresentation(${slug}): HTTP ${resp.status}: ${errText.slice(0, 160)}`);
}

/** Save (create or overwrite) a presentation. Used by the editPresentation
 *  flow after the composer emits a revised payload - the slug stays the
 *  same so the URL is stable across edits.
 *
 *  2026-05-10: Client-side guards added BEFORE the POST so opaque proxy
 *  400s (e.g. "schemaVersion must be 1, got None") never bubble back to
 *  the user. Every caller gets the same defensive normalization. */
export async function savePresentation(payload: PresentationPayload): Promise<PresentationSummary> {
    // Defensive normalization - fix the well-known proxy-rejection causes
    // before the request leaves the browser.
    const p = payload as any;
    if (!p) throw new Error('savePresentation: payload is null/undefined');
    if (!p.schemaVersion) p.schemaVersion = 1;
    if (!p.meta) p.meta = {};
    if (!p.meta.title) p.meta.title = '(untitled)';
    if (!p.meta.brand) p.meta.brand = 'NXT';
    if (!p.meta.generatedAt) p.meta.generatedAt = new Date().toISOString();

    // Hard preconditions the proxy enforces - fail fast with a clear
    // message instead of a 400 round-trip.
    if (p.schemaVersion !== 1) {
        throw new Error(`savePresentation: schemaVersion must be 1, got ${p.schemaVersion}. The model returned an unexpected envelope.`);
    }
    if (!p.meta.slug || typeof p.meta.slug !== 'string') {
        throw new Error('savePresentation: meta.slug is required.');
    }
    if (!Array.isArray(p.sections) || p.sections.length === 0) {
        throw new Error('savePresentation: sections must be a non-empty array. The composer likely truncated or refused - try rephrasing.');
    }

    const resp = await fetch(`${PROXY_BASE}/api/presentations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
    });
    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`savePresentation: HTTP ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = await resp.json();
    return {
        slug: data.slug,
        title: p.meta?.title ?? '(untitled)',
        brand: (p.meta?.brand ?? 'NXT') as BrandVariant,
        generatedAt: p.meta?.generatedAt ?? new Date().toISOString(),
        narrativeThesis: p.meta?.narrativeThesis ?? '',
        sectionCount: data.sectionCount ?? (p.sections?.length ?? 0),
        sourceCount: data.sourceCount ?? {},
        url: data.url,
    };
}

/** Format a generatedAt ISO string for chip display. Returns "May 9, 2026"
 *  for recent dates; falls back to the raw string for malformed input. */
export function formatPresentationDate(iso: string | undefined): string {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return iso;
    }
}
