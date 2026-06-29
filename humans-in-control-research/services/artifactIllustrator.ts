// artifactIllustrator.ts
//
// 2026-06-17 - Registry-DRIVEN image generation for GOLD/#slides artifacts. Given a deliverable's
// payload, this looks up its IMAGE-SLOT spec (artifactImageSlots.ts, the runtime mirror of the Figma
// IMAGE-SLOT REGISTRY) and generates an illustration for EVERY slot the registry defines for that
// artifact - covering each placeholder, never inventing one, never touching the deliberate no-image
// set. The generated URLs are written into the payload's carrier fields the renderer twins read.
//
// Concepts come from the LIVE payload content (the element at slot i), NOT the registry's exemplar
// imgRole - so the art is about THIS engagement's subject. Contrast follows the slot's registered
// ground. Reuses the same /api/ai/illustration pipeline (VS ideation + line-art house style +
// knockout + persisted library + variant-on-collision) as the #presentation path, so intra-artifact
// repeats are broken the same way. Fail-open: a slot that fails generation is left empty.

import { imageSpecFor, type ArtifactImageSpec, type SlotKind } from './artifactImageSlots';

const PROXY_BASE = 'http://127.0.0.1:5012';

/** Derive a short, recognizable concept SEED from a live payload element. Strings pass through;
 *  objects yield their most title-like field. The proxy's VS step turns this into the final
 *  line-art subject. */
function conceptFromElement(el: unknown): string {
    if (typeof el === 'string') return el.trim();
    if (el && typeof el === 'object') {
        const o = el as Record<string, unknown>;
        // STRATEGIC AUTHORING FIRST (user-locked 2026-06-27): the expert skill authors a content-true
        // per-element concept on brandImage.concept / imageConcept BEFORE prompting. Prefer it over the
        // raw title so the image SUPPORTS the content rather than restating the label.
        const bi = o['brandImage'];
        if (bi && typeof bi === 'object' && typeof (bi as Record<string, unknown>).concept === 'string' && (bi as Record<string, unknown>).concept) {
            return String((bi as Record<string, unknown>).concept).trim();
        }
        if (typeof o['imageConcept'] === 'string' && (o['imageConcept'] as string).trim()) return (o['imageConcept'] as string).trim();
        for (const k of ['name', 'actionTitle', 'title', 'heading', 'label', 'capability', 'phase', 'subject', 'insight']) {
            const v = o[k];
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
    }
    return '';
}

/** Derive a concept for a single-panel artifact from its top-level payload fields. */
function conceptFromPayload(payload: Record<string, unknown>): string {
    // 2026-06-28 FIX: include `subject` so the case-study payload (whose identity field is
    // `subject`, e.g. "Linear (Issue Tracking SaaS)" - NOT title/name) yields a concept seed.
    // Without it conceptFromPayload returned '' for case-study -> resolveArtifactImages returned
    // 0 -> caseStudy.panelImage was never generated -> the renderer (which already reads
    // c.panelImage) painted nothing. Mirrors conceptFromElement: authored concept wins.
    const bi = payload['brandImage'];
    if (bi && typeof bi === 'object' && typeof (bi as Record<string, unknown>).concept === 'string'
        && (bi as Record<string, unknown>).concept) {
        return String((bi as Record<string, unknown>).concept).trim();
    }
    if (typeof payload['imageConcept'] === 'string' && (payload['imageConcept'] as string).trim()) {
        return (payload['imageConcept'] as string).trim();
    }
    for (const k of ['actionTitle', 'title', 'thesis', 'subject', 'name', 'heading', 'patternSignal']) {
        const v = payload[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

async function generateOne(concept: string, brand: string, canvas: 'dark' | 'light', kind: SlotKind,
                           variant: number, branch?: string): Promise<{ url: string; dataUri: string; reused: boolean } | null> {
    try {
        // emotive branch (user-locked 2026-06-27): the THIRD imagery type is the Memphis-iso
        // flat-illustrative brand image (/api/ai/brand-image), NOT the old continuous single-line art
        // (/api/ai/illustration) the user rejected. Route emotive there; other branches keep the
        // existing path.
        const emotive = branch === 'emotive';
        const url = emotive ? `${PROXY_BASE}/api/ai/brand-image` : `${PROXY_BASE}/api/ai/illustration`;
        const body = emotive
            ? JSON.stringify({ concept, brand, variant })
            : JSON.stringify({ concept, brand, canvas, slot: kind, variant });
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        if (!resp.ok) return null;
        const r = await resp.json();
        // Carry the data-URI (origin-independent) so the image survives BOTH the live preview AND
        // the headless .pptx export. The relative `url` (/hic-workspace/...) renders only in the SPA;
        // the export's GEO walker / _place_geo_images can decode a data: src but cannot fetch a
        // relative path with no origin -> images were silently dropped from exports (2026-06-28).
        return (r && typeof r.url === 'string' && r.url)
            ? { url: r.url, dataUri: typeof r.dataUri === 'string' ? r.dataUri : '', reused: !!r.reused }
            : null;
    } catch {
        return null;
    }
}

/** Walk the artifact's registry spec and fill every defined slot from live content. Mutates `payload`
 *  (writes the carrier fields) and returns the number of images attached. No-op (returns 0) for
 *  unknown artifacts and the deliberate no-image set. */
export async function resolveArtifactImages(
    artifact: string,
    payload: Record<string, unknown>,
    brandRaw: string,
    deckThemeRaw?: string,
    onLog?: (msg: string) => void,
): Promise<number> {
    const spec: ArtifactImageSpec | undefined = imageSpecFor(artifact);
    if (!spec || spec.mode === 'none' || !payload) return 0;

    const brand = String(brandRaw || 'NXT').toLowerCase() === 'nu' ? 'nu' : 'nxt';
    const deckTheme: 'dark' | 'light' = String(deckThemeRaw || 'dark') === 'light' ? 'light' : 'dark';
    const canvas: 'dark' | 'light' = spec.ground || deckTheme;  // registry ground is authoritative per slot
    const kind: SlotKind = spec.kind || 'panel';
    const usedUrls = new Set<string>();
    let attached = 0;

    // Pull a unique image for `concept`, bumping variant on intra-artifact repeats.
    const uniqueImage = async (concept: string): Promise<string> => {
        for (let v = 0; v <= 3; v++) {
            const r = await generateOne(concept, brand, canvas, kind, v, spec.branch);
            if (!r) return '';
            // Dedup on the stable content-id (url); STORE the data-URI so the image embeds in exports
            // (falls back to the url only if the endpoint returned no dataUri).
            if (!usedUrls.has(r.url)) { usedUrls.add(r.url); return r.dataUri || r.url; }
        }
        return '';
    };

    if (spec.mode === 'panel' || spec.mode === 'hero') {
        const concept = conceptFromPayload(payload);
        if (!concept) return 0;
        const url = await uniqueImage(concept);
        if (url) { payload[spec.carrier] = url; attached++; onLog?.(`${artifact}: panel image attached`); }
        return attached;
    }

    // per-element + glyph: one image per item in the element array, index-aligned.
    const arr = spec.elementField ? (payload[spec.elementField] as unknown[]) : null;
    if (!Array.isArray(arr) || arr.length === 0) {
        // glyph singletons with no element array (e.g. mindmap central glyph) -> single carrier.
        if (spec.mode === 'glyph' && !spec.elementField) {
            const concept = conceptFromPayload(payload);
            const url = concept ? await uniqueImage(concept) : '';
            if (url) { payload[spec.carrier] = url; attached++; }
        }
        return attached;
    }
    const cap = Math.min(arr.length, spec.max ?? arr.length);
    const images: string[] = Array.isArray(payload[spec.carrier]) ? (payload[spec.carrier] as string[]).slice() : [];
    for (let i = 0; i < cap; i++) {
        const concept = conceptFromElement(arr[i]);
        if (!concept) { images[i] = images[i] || ''; continue; }
        const url = await uniqueImage(concept);
        images[i] = url;
        if (url) attached++;
    }
    payload[spec.carrier] = images;

    // Coverage check (per the directive): a non-optional artifact should fill every element slot.
    if (!spec.optional) {
        const missing = images.slice(0, cap).filter((u) => !u).length;
        if (missing > 0) onLog?.(`${artifact}: ${missing}/${cap} slots unfilled (coverage gap)`);
    }
    onLog?.(`${artifact}: ${attached} image(s) attached across ${cap} ${spec.elementField} slots`);
    return attached;
}
