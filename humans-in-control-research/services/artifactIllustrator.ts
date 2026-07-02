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

// ============================================================================
// E4 (2026-07-02, artifact-total-elevation): NATIVE INFOGRAPHIC branch. The memphis-iso diffusion
// lane (/api/ai/brand-image) is retired; content slots render via the SAME native contract as the
// D17 diagrams (/api/ai/diagram, nxt_diagram_render infographic families) in a CHROMELESS slot shell
// sized to the registry bounds. The spec is built from the ELEMENT'S OWN DATA (content-true or
// nothing): steps/actions -> process-flow; before/after -> comparison; stats/kpis -> stat-row;
// citations -> evidence-mix composition. An element with no structurable substance gets NO image -
// honest image-free beats a decorative scene.
// ============================================================================

function _strList(v: unknown, cap = 6): string[] {
    if (!Array.isArray(v)) return [];
    return v.map(x => {
        if (typeof x === 'string') return x.trim();
        if (x && typeof x === 'object') {
            const o = x as Record<string, unknown>;
            for (const k of ['name', 'title', 'label', 'action', 'step', 'text']) {
                if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).trim();
            }
        }
        return '';
    }).filter(Boolean).slice(0, cap);
}

function _sourceTypeOf(name: string): string {
    const n = name.toLowerCase();
    if (/reddit|r\/|forum|hacker news|bluesky|mastodon/.test(n)) return 'Social';
    if (/upload|client|internal|\.pdf|\.docx?|interview|discussion/.test(n)) return 'Client material';
    return 'External research';
}

/** Build a content-true infographic spec from a payload element. Returns null when the element has
 *  no structurable substance (-> no image; never decorate). */
export function infographicSpecFrom(el: unknown, concept: string): Record<string, unknown> | null {
    const o = (el && typeof el === 'object') ? el as Record<string, unknown> : {};
    // 1) process-flow from actions/steps/phases (the mechanism the element proposes)
    for (const key of ['actions', 'steps', 'phases', 'coherentActions']) {
        const steps = _strList(o[key]);
        if (steps.length >= 3) {
            return { kind: 'process-flow', steps: steps.map(s => ({ name: s })) };
        }
    }
    // 2) comparison from before/after shapes
    const ba = o['beforeAfter'] as Record<string, unknown> | undefined;
    if (ba && typeof ba === 'object') {
        const left = _strList((ba as any).before?.points ?? (ba as any).before, 5);
        const right = _strList((ba as any).after?.points ?? (ba as any).after, 5);
        if (left.length >= 2 && right.length >= 2) {
            return {
                kind: 'comparison',
                left: { title: 'Before', points: left },
                right: { title: 'After', points: right },
            };
        }
    }
    // 3) stat-row from kpis/stats/metrics carrying label+value (+ quote/source when cited)
    for (const key of ['kpiTiles', 'kpis', 'stats', 'metrics', 'keyMetrics']) {
        const arr = o[key];
        if (Array.isArray(arr)) {
            const stats = arr.filter(x => x && typeof x === 'object').map(x => {
                const s = x as Record<string, unknown>;
                return {
                    label: String(s.label ?? s.name ?? '').trim(),
                    value: String(s.value ?? s.stat ?? '').trim(),
                    quote: typeof s.quote === 'string' ? s.quote : undefined,
                    source: typeof s.source === 'string' ? s.source : undefined,
                };
            }).filter(s => s.label).slice(0, 5);
            if (stats.length >= 2) return { kind: 'stat-row', stats };
        }
    }
    // 4) evidence-mix composition from the element's own citations (content-true provenance view).
    //    Also harvests nested per-section evidence sources (executive-brief sections[].evidence.source)
    //    so section-anatomy payloads compose their provenance mix without a top-level citations[].
    let cites: unknown = o['citations'] ?? o['sources'];
    if (!Array.isArray(cites) || cites.length < 2) {
        const secs = o['sections'];
        if (Array.isArray(secs)) {
            const fromSections = secs
                .map(s => (s && typeof s === 'object') ? (s as any).evidence?.source : undefined)
                .filter((x): x is string => typeof x === 'string' && !!x.trim());
            if (fromSections.length >= 2) cites = fromSections;
        }
    }
    if (Array.isArray(cites) && cites.length >= 2) {
        const byType = new Map<string, number>();
        for (const c of cites) {
            const name = typeof c === 'string' ? c : String((c as any)?.sourceName ?? (c as any)?.source ?? '');
            if (!name.trim()) continue;
            const t = _sourceTypeOf(name);
            byType.set(t, (byType.get(t) || 0) + 1);
        }
        const segments = Array.from(byType.entries()).map(([label, n]) => ({ label, share: n }));
        if (segments.length >= 2) return { kind: 'composition', segments };
    }
    void concept;
    return null;   // no structurable substance -> no image (honest image-free)
}

async function generateOne(concept: string, brand: string, canvas: 'dark' | 'light', kind: SlotKind,
                           variant: number, branch?: string, el?: unknown,
                           bounds?: { w: number; h: number }): Promise<{ url: string; dataUri: string; reused: boolean } | null> {
    try {
        const native = branch === 'infographic' || branch === 'emotive';   // 'emotive' = legacy audit value, now native
        if (native) {
            const spec = infographicSpecFrom(el, concept);
            if (!spec) return null;   // content-true or nothing
            // chromeless slot shell at 2x the registry bounds (crisp at render size); variant folds into
            // the spec hash so intra-artifact dedup still works via distinct content.
            spec['chrome'] = 'none';
            spec['frame'] = { w: Math.round((bounds?.w || 492) * 2), h: Math.round((bounds?.h || 290) * 2) };
            if (variant > 0) spec['variant'] = variant;
            const resp = await fetch(`${PROXY_BASE}/api/ai/diagram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spec, brand, canvas }),
            });
            if (!resp.ok) return null;
            const r = await resp.json();
            return (r && typeof r.url === 'string' && r.url)
                ? { url: r.url, dataUri: typeof r.dataUri === 'string' ? r.dataUri : '', reused: !!r.reused }
                : null;
        }
        const resp = await fetch(`${PROXY_BASE}/api/ai/illustration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept, brand, canvas, slot: kind, variant }),
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

    // Pull a unique image for `concept`, bumping variant on intra-artifact repeats. The source
    // ELEMENT rides along so the native infographic branch can build a content-true spec (E4).
    const uniqueImage = async (concept: string, el?: unknown): Promise<string> => {
        for (let v = 0; v <= 3; v++) {
            const r = await generateOne(concept, brand, canvas, kind, v, spec.branch, el, spec.bounds);
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
        const url = await uniqueImage(concept, payload);
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
        const url = await uniqueImage(concept, arr[i]);
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
