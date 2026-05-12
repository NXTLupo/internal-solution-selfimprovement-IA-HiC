// artifactLibrary.ts — 2026-05-12 (Sprint H1)
//
// CRUD client for the proxy's /api/artifacts family. Mirrors
// prototypeLibrary.ts. Supports the new #brief / #explainer / #report /
// #playground / #approaches / #help directives that produce HTML artifacts.

const PROXY_BASE = 'http://localhost:5012';

export interface ArtifactSummary {
    slug: string;
    title: string;
    generator: string;            // '#brief' | '#explainer' | '#report' | ...
    topic?: string;
    brand?: 'NXT' | 'NU';
    html_chars?: number;
    variants_count?: number;
    created_at?: string;
    updated_at?: string;
    view_url?: string;
}

export interface ArtifactPayload extends ArtifactSummary {
    html_source: string;
    engagement_context?: any;
    vs_commitment?: any;
    variants_history?: any[];
}

export interface ArtifactListResult {
    total: number;
    results: ArtifactSummary[];
}

export async function listArtifacts(): Promise<ArtifactListResult> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/artifacts`);
        if (!resp.ok) return { total: 0, results: [] };
        return resp.json();
    } catch {
        return { total: 0, results: [] };
    }
}

export async function getArtifact(slug: string): Promise<ArtifactPayload | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/artifacts/${encodeURIComponent(slug)}`);
        if (!resp.ok) return null;
        return resp.json();
    } catch {
        return null;
    }
}

export async function deleteArtifact(slug: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/artifacts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
        return resp.ok;
    } catch {
        return false;
    }
}

export interface SaveArtifactInput {
    title: string;
    generator: string;
    html_source: string;
    slug?: string;
    brand?: 'NXT' | 'NU';
    topic?: string;
    engagement_context?: any;
    vs_commitment?: any;
    variants_history?: any[];
}

export async function saveArtifact(input: SaveArtifactInput): Promise<ArtifactSummary> {
    // Retry on transient network failures (proxy restart). Same pattern
    // as savePrototype — 3 attempts with exponential backoff so a 39KB
    // HTML artifact does not vanish to a 2-second proxy hiccup.
    let resp: Response | null = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            resp = await fetch(`${PROXY_BASE}/api/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
            if (resp.ok) break;
            if (resp.status >= 500 && attempt < 2) {
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                continue;
            }
            break;
        } catch (e) {
            lastErr = e;
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                continue;
            }
            throw new Error(`saveArtifact: network failure after 3 attempts: ${(e as any)?.message || e}`);
        }
    }
    if (!resp || !resp.ok) {
        const err = resp ? await resp.text().catch(() => '') : (lastErr?.message || 'no response');
        throw new Error(`saveArtifact: HTTP ${resp?.status || '?'}: ${err.slice(0, 200)}`);
    }
    return resp.json();
}

export async function promoteVariant(slug: string, variantIndex: number): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/artifacts/${encodeURIComponent(slug)}/promote-variant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant_index: variantIndex }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

export function getArtifactViewUrl(slug: string): string {
    return `${PROXY_BASE}/api/artifacts/${encodeURIComponent(slug)}/view`;
}
