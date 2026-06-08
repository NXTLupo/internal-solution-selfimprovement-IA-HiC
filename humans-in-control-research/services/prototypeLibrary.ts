// prototypeLibrary.ts - 2026-05-11 (HiC-Experience-Designer)
//
// CRUD client for the proxy's /api/prototypes family. Mirrors the
// presentationLibrary.ts pattern so the chat UI can browse, open, edit,
// and delete prototypes uniformly.

import type { PrototypeArtifact, Brand } from './prototypeBuilder';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface PrototypeSummary {
    slug: string;
    title: string;
    concept_preview: string;
    research_goal?: string;
    based_on?: string;
    code_format: 'react' | 'html';
    code_chars: number;
    created_at: string;
    updated_at: string;
    view_url: string;
}

export interface PrototypeListResult {
    total: number;
    results: PrototypeSummary[];
}

export async function listPrototypes(): Promise<PrototypeListResult> {
    const resp = await fetch(`${PROXY_BASE}/api/prototypes`);
    if (!resp.ok) throw new Error(`listPrototypes: HTTP ${resp.status}`);
    return resp.json();
}

export async function getPrototype(slug: string): Promise<PrototypeArtifact> {
    const resp = await fetch(`${PROXY_BASE}/api/prototypes/${encodeURIComponent(slug)}`);
    if (!resp.ok) throw new Error(`getPrototype(${slug}): HTTP ${resp.status}`);
    return resp.json();
}

export async function deletePrototype(slug: string): Promise<boolean> {
    const resp = await fetch(`${PROXY_BASE}/api/prototypes/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (resp.ok) return true;
    if (resp.status === 404) return false;
    const err = await resp.text().catch(() => '');
    throw new Error(`deletePrototype(${slug}): HTTP ${resp.status}: ${err.slice(0, 200)}`);
}

export async function savePrototype(artifact: PrototypeArtifact): Promise<PrototypeSummary> {
    const body = {
        slug: artifact.slug,
        title: artifact.title,
        concept: artifact.concept,
        brief: artifact.brief,
        interaction_spec: artifact.interaction_spec,
        design_system: artifact.design_system,
        code: artifact.code,
        critique: artifact.critique,
        code_format: artifact.code_format,
        research_goal: artifact.research_goal,
        based_on: artifact.based_on,
    };
    // Retry on transient network failures (proxy restart, server-side hiccup).
    // A 39KB-of-Stage-4-work artifact should not be lost to a 2-second
    // proxy restart. Three attempts with exponential backoff.
    let resp: Response | null = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            resp = await fetch(`${PROXY_BASE}/api/prototypes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (resp.ok) break;
            // 5xx → retryable; 4xx → not retryable
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
            throw new Error(`savePrototype: network failure after 3 attempts: ${(e as any)?.message || e}`);
        }
    }
    if (!resp || !resp.ok) {
        const err = resp ? await resp.text().catch(() => '') : (lastErr?.message || 'no response');
        throw new Error(`savePrototype: HTTP ${resp?.status || '?'}: ${err.slice(0, 200)}`);
    }
    const data = await resp.json();
    return {
        slug: data.slug,
        title: data.title,
        concept_preview: (artifact.concept || '').slice(0, 200),
        research_goal: artifact.research_goal,
        based_on: artifact.based_on,
        code_format: artifact.code_format,
        code_chars: data.code_chars || (artifact.code || '').length,
        created_at: data.created_at,
        updated_at: data.updated_at,
        view_url: data.view_url || `/api/prototypes/${data.slug}/view`,
    };
}

export function getPrototypeLaunchUrl(slug: string): string {
    return `${PROXY_BASE}/api/prototypes/${encodeURIComponent(slug)}/view`;
}

export function formatPrototypeDate(iso?: string): string {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
}

export type { Brand };
