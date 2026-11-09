/**
 * Source-picture screen (2026-10-26). Owner, on a deck whose cover carried the attached document's own picture (a gold
 * pipe across a glowing globe): "the images are terrible". Pictures lifted from an attachment pass the same creative-
 * director judgment as the photographs HiC generates (proxy /api/ai/image-screen -> _image_critic): a documentary photo,
 * chart, diagram or screenshot is carried; AI art, renders, collages and futuristic imagery are not.
 */
const PROXY_BASE = 'http://127.0.0.1:5012';

export interface ImageVerdict { accept: boolean; kind: string; reason: string }

/** The verdict per picture, keyed by the picture string. Fail-open: an unreachable screen accepts everything. */
export async function screenPictures(images: string[], fetchImpl: typeof fetch = fetch): Promise<Map<string, ImageVerdict>> {
    const unique = Array.from(new Set(images.filter(Boolean)));
    const out = new Map<string, ImageVerdict>();
    if (!unique.length) return out;
    try {
        const resp = await fetchImpl(`${PROXY_BASE}/api/ai/image-screen`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: unique }), signal: AbortSignal.timeout(60_000),
        });
        if (!resp.ok) return out;
        const j: any = await resp.json();
        const verdicts: any[] = Array.isArray(j?.verdicts) ? j.verdicts : [];
        unique.forEach((img, i) => {
            const v = verdicts[i];
            if (v && typeof v === 'object') out.set(img, { accept: v.accept !== false, kind: String(v.kind || ''), reason: String(v.reason || '') });
        });
    } catch { /* fail-open: the pictures stay */ }
    return out;
}

/** The pictures the screen refused. */
export function refusedPictures(verdicts: Map<string, ImageVerdict>): Set<string> {
    return new Set(Array.from(verdicts.entries()).filter(([, v]) => !v.accept).map(([k]) => k));
}
