/**
 * Runtime-owned image carriers on a slide (2026-10-20 live #slides: two concurrent post-parse pipelines, the
 * claim chain + repair and the imagery loop, each replaced whole slide objects from their own pre-image snapshot;
 * the repair finished 15 s after the images and the deck rendered with zero pictures although two illustration
 * calls had succeeded). Every replacement of a slide now carries the runtime imagery forward, and the imagery
 * loop merges only its carriers into the live slide instead of restoring a stale payload.
 */

import { registeredImageCarriers } from './artifactImageSlots';

/** Carriers that live on the slide object itself. */
const SLIDE_IMAGE_CARRIERS = ['diagramImage', 'imageUrl', 'imagePrompt', 'exhibitImage'] as const;
/** Carriers that live inside a template payload (composerPayload or the template's own subfield): every carrier the
 *  slot registry names, plus the compose-time card glyph rows and the user's own imagery. Derived, never hand-kept
 *  (2026-10-26 live: `columnIcons` was missing from the old list, so three resolved icons never reached the slide). */
const PAYLOAD_IMAGE_CARRIERS: readonly string[] = Array.from(new Set([
    ...registeredImageCarriers(),
    'backgroundImage', 'itemImages', 'portraitImage', 'heroImage', 'panelImage', 'sceneImage', 'exhibitImage', 'themeImages', 'phaseImages', 'featureImages',
    'stepIcons', 'panelIcons', 'columnIcons', 'itemIcons', '_userImagery',
]));

const PAYLOAD_FIELDS = ['composerPayload', 'themeCluster', 'journeyMap', 'personaCard', 'recommendation', 'caseStudy', 'gapMatrix', 'competitiveMatrix', 'prdFeature', 'architectureMap', 'orgChart', 'systemsInventory', 'timeline', 'serviceBlueprint'];

function filled(v: unknown): boolean {
    if (v == null) return false;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.some(filled);
    if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(filled);
    return true;
}

/** The runtime image carriers a payload holds (only the filled ones). */
export function imageCarriersOf(payload: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!payload || typeof payload !== 'object') return out;
    for (const k of PAYLOAD_IMAGE_CARRIERS) {
        const v = (payload as Record<string, unknown>)[k];
        if (filled(v)) out[k] = v;
    }
    return out;
}

/**
 * `next` replaces `prev` in the slide list; every runtime image `prev` already carries and `next` lacks is kept.
 * Text and structure come from `next` (the later pass is the authority on content), imagery from whichever has it.
 */
export function mergeRuntimeImagery<T extends Record<string, any>>(prev: T | undefined, next: T): T {
    if (!prev || prev === next) return next;
    let out: T = next;
    const put = (k: string, v: unknown) => { if (out === next) out = { ...next }; (out as any)[k] = v; };
    for (const k of SLIDE_IMAGE_CARRIERS) {
        if (!filled(next[k]) && filled(prev[k])) put(k, prev[k]);
    }
    for (const f of PAYLOAD_FIELDS) {
        const pp = prev[f], np = next[f];
        if (!pp || typeof pp !== 'object') continue;
        const keep = imageCarriersOf(pp);
        const missing = Object.keys(keep).filter(k => !filled(np && typeof np === 'object' ? (np as any)[k] : undefined));
        if (!missing.length) continue;
        const merged: Record<string, unknown> = { ...(np && typeof np === 'object' ? np : {}) };
        for (const k of missing) merged[k] = keep[k];
        put(f, merged);
    }
    return out;
}

/** The imagery loop's write: only the carriers it produced go onto the LIVE slide's payload. */
export function withImageCarriers<T extends Record<string, any>>(live: T, field: string, produced: unknown): T {
    const carriers = imageCarriersOf(produced);
    if (!Object.keys(carriers).length) return live;
    const current = live[field] && typeof live[field] === 'object' ? live[field] : {};
    return { ...live, [field]: { ...current, ...carriers } };
}
