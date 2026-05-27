/**
 * Parse a model response of the form:
 *
 *   :::nxt:freeform
 *   { "id": "...", "kind": "...", "brand": "...", "title": "...", "citations": [...] }
 *   ---
 *   <!DOCTYPE html>...full HTML body...</html>
 *   :::
 *
 * Tolerates surrounding ```...``` fences. Only the first `---` line splits
 * header from body. Tolerates missing closing ::: when the model truncates.
 */

import type { FreeformKind } from '../schemas/freeformArtifact';
import type { BrandHashtag } from './hashtagParser';
// 2026-05-25 — wire the 9-rung repair ladder into the header-JSON parse.
// The JM-depth uplift increases header citations[] payload size, raising
// truncation risk. parseJSONWithRepair recovers most truncation classes.
import { parseJSONWithRepair } from '../../services/aiOutputRepair';

export interface FreeformHeader {
    id: string;
    kind: FreeformKind;
    brand: BrandHashtag;
    title: string;
    citations: Array<{ label: string; source: string }>;
}

export type FreeformParseResult =
    | { ok: true; header: FreeformHeader; html: string }
    | { ok: false; error: string };

const OPEN = ':::nxt:freeform';
const CLOSE = ':::';

export function parseFreeformOutput(raw: string): FreeformParseResult {
    if (!raw || typeof raw !== 'string') return { ok: false, error: 'empty model output' };

    // Strip optional outer code fence
    const fenceMatch = raw.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```/);
    let candidate = (fenceMatch ? fenceMatch[1] : raw).trim();

    // Some models add prose before the opening marker. Find OPEN.
    const openIdx = candidate.indexOf(OPEN);
    if (openIdx < 0) {
        // Fallback: maybe the model emitted a bare HTML document plus a JSON-ish prelude.
        // Try to detect a `<!DOCTYPE` — if found, treat the whole thing as HTML and synthesize a header.
        const doctypeIdx = candidate.search(/<!DOCTYPE\s+html|<html\b/i);
        if (doctypeIdx >= 0) {
            return { ok: false, error: 'missing :::nxt:freeform marker; model emitted bare HTML without metadata' };
        }
        return { ok: false, error: `missing "${OPEN}" open marker` };
    }

    // Slice from after OPEN. Closer is the LAST ::: that's after openIdx — but if
    // truncation cut the closer, we accept whatever's there and parse anyway.
    let inner = candidate.slice(openIdx + OPEN.length);
    const closeIdx = inner.lastIndexOf(CLOSE);
    if (closeIdx > 0) {
        // Only use the closer if it appears AFTER any HTML — i.e., it's not just the trailing
        // colons of the opener
        inner = inner.slice(0, closeIdx);
    }
    inner = inner.trim();

    // Split on first stand-alone --- separator
    const sepRegex = /(?:^|\n)\s*---\s*(?:\n|$)/;
    const sepMatch = sepRegex.exec(inner);
    if (!sepMatch) return { ok: false, error: 'missing --- separator between header and HTML body' };

    const headerJson = inner.slice(0, sepMatch.index).trim();
    const html = inner.slice(sepMatch.index + sepMatch[0].length).trim();

    if (!html) return { ok: false, error: 'HTML body empty after --- separator' };

    let header: FreeformHeader;
    try {
        // 2026-05-25 — use the 9-rung repair ladder so JM-depth headers
        // (with longer citations[] arrays) tolerate trailing-comma drift,
        // unescaped-quote drift, and Gemini's truncation at max-tokens.
        header = parseJSONWithRepair<FreeformHeader>(headerJson, {
            calling_context: 'freeform:header',
        });
    } catch (e) {
        return { ok: false, error: `header JSON parse failed: ${(e as Error).message}` };
    }

    if (typeof header.id !== 'string' || typeof header.title !== 'string'
        || typeof header.kind !== 'string' || typeof header.brand !== 'string') {
        return { ok: false, error: 'header missing required fields (id, title, kind, brand)' };
    }
    if (!Array.isArray(header.citations)) header.citations = [];

    return { ok: true, header, html };
}
