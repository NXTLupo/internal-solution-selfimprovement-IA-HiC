/**
 * SUBJECT-ANCHORED PRIMARY DOCUMENTATION DISCOVERY (2026-09-11)
 * plans/report-evidence-integrity-and-primary-source-discovery-2026-09-11.md, WS-6. Phase 2.
 *
 * The 2026-09-10 white paper's objective said "Scour Figma's own documentation and press
 * releases". The corpus held the Figma blog RSS, 200 Reddit threads and 419 AI-news feed
 * items, and ZERO pages from the vendor's developer documentation or help center. The
 * reviewer's largest omissions (the Webhooks API, the MCP tool catalog, the documented
 * rate limits, the seat and asset rules) were all on pages the pipeline never collected,
 * because nothing translated a named subject into that subject's documentation hosts.
 *
 * This module asks the proxy to do that translation for the CURRENT objective: derive the
 * named subjects and their official documentation hostnames, run site-scoped searches for
 * the objective's clauses, and persist the pages as `kind: documentation` articles that
 * chunk, manifest and retrieve like every other source. Bounded, cached per engagement
 * for the session, never fatal: a failure leaves the run exactly where it was.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface PrimaryDocsSubject { name: string; hosts: string[]; queries: string[]; }
export interface PrimaryDocsWritten { url: string; wikiPath: string; title: string; date: string; }
export interface PrimaryDocsResult {
    ok: boolean;
    subjects: PrimaryDocsSubject[];
    written: PrimaryDocsWritten[];
    /** Subjects skipped because the wiki already held fresh documentation for them. */
    skipped: Array<{ name: string; reason: string; existing: number }>;
    existing: Record<string, number>;
    elapsedS: number;
    error?: string;
}

const _done = new Map<string, PrimaryDocsResult>();

function key(goal: string, engagement: string): string {
    return `${engagement}::${String(goal || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 300)}`;
}

/** Run once per (engagement, objective) per session. `force` re-collects even when fresh pages exist. */
export async function ensurePrimaryDocs(opts: {
    goal: string;
    engagement: string;
    force?: boolean;
    /** Named subjects to collect documentation for (the planner otherwise derives them from the goal). */
    subjects?: string[];
    maxPages?: number;
    budgetSeconds?: number;
    timeoutMs?: number;
    onProgress?: (msg: string) => void;
}): Promise<PrimaryDocsResult> {
    const k = key(opts.goal, opts.engagement);
    const prior = _done.get(k);
    if (prior && !opts.force) return prior;
    const empty: PrimaryDocsResult = { ok: false, subjects: [], written: [], skipped: [], existing: {}, elapsedS: 0 };
    if (!String(opts.goal || '').trim()) return { ...empty, error: 'no objective' };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 150_000);
    try {
        opts.onProgress?.('collecting the subject\'s own documentation...');
        const resp = await fetch(`${PROXY_BASE}/api/sources/primary-docs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
                goal: opts.goal,
                engagement: opts.engagement || null,
                force: !!opts.force,
                ...(opts.subjects && opts.subjects.length ? { subjects: opts.subjects } : {}),
                max_pages: opts.maxPages ?? 24,
                budget_seconds: opts.budgetSeconds ?? 90,
            }),
        });
        if (!resp.ok) {
            const out = { ...empty, error: `HTTP ${resp.status}` };
            _done.set(k, out);
            return out;
        }
        const data = await resp.json();
        const out: PrimaryDocsResult = {
            ok: !!data?.ok,
            subjects: Array.isArray(data?.subjects) ? data.subjects : [],
            written: Array.isArray(data?.written) ? data.written : [],
            skipped: Array.isArray(data?.skipped) ? data.skipped : [],
            existing: data?.existing && typeof data.existing === 'object' ? data.existing : {},
            elapsedS: Number(data?.elapsed_s) || 0,
            error: data?.error ? String(data.error) : undefined,
        };
        if (out.written.length) opts.onProgress?.(`collected ${out.written.length} documentation page(s) from ${out.subjects.map(s => s.hosts.join(', ')).join('; ')}`);
        _done.set(k, out);
        return out;
    } catch (e: any) {
        const out = { ...empty, error: e?.name === 'AbortError' ? 'timed out' : (e?.message || 'failed') };
        _done.set(k, out);
        return out;
    } finally {
        clearTimeout(timer);
    }
}

function resetPrimaryDocsCache(): void { _done.clear(); }
