// payloadFetcher.ts
//
// Fetches a PresentationPayload from the HiC proxy by slug.
// PROXY_URL is injected at build time by vite.config.ts (defaults to
// http://localhost:5012; overridden via PROXY_URL env in Docker).

import type { PresentationPayload } from './types';

const PROXY_URL = (process.env as { PROXY_URL?: string }).PROXY_URL || 'http://localhost:5012';

export async function fetchPayload(slug: string): Promise<PresentationPayload> {
  const url = `${PROXY_URL}/api/presentations/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Presentation '${slug}' not found`);
    }
    const body = await res.text().catch(() => '');
    throw new Error(`Proxy ${res.status}: ${body || res.statusText}`);
  }
  const payload = (await res.json()) as PresentationPayload;
  if (!payload || typeof payload !== 'object' || payload.schemaVersion !== 1) {
    throw new Error('Invalid payload — schemaVersion mismatch or empty body');
  }
  return payload;
}
