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
import { normalizeBrandId, type BrandId } from '../components/slideTemplates/brands';

const PROXY_BASE = 'http://127.0.0.1:5012';

/** 2026-10-01 - Per-brand imagery wording handed to the proxy illustration prompt as `brandHint`
 *  (optional field; the proxy prompt builder may fold it in). The proxy resolves the palette from
 *  the brand id itself; this names the visual language in words so #deciem imagery is on-brand
 *  (black and white, pink / cyan / purple pops, thin line-art) and never NXT chartreuse. NXT / NU
 *  return '' (their wording already lives in the proxy prompt). */
export function brandImageryHint(brand: BrandId | string | null | undefined): string {
    if (normalizeBrandId(brand) === 'deciem') {
        return 'DECIEM house style: black and white composition with flat pink (#FB48C4), cyan (#00FACC) and purple (#8A69D4) pops, thin black line-art product doodles, white or pure black ground, no gradients, no chartreuse, no teal.';
    }
    return '';
}

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
        if (typeof x === 'string') return cleanDiagramText(x);
        if (x && typeof x === 'object') {
            const o = x as Record<string, unknown>;
            for (const k of ['name', 'title', 'label', 'action', 'step', 'text']) {
                if (typeof o[k] === 'string' && (o[k] as string).trim()) return cleanDiagramText(o[k]);
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
/** 2026-10-26 (live: a flowchart edge read "SOW014 NXT Humans NU Student AI Compa" and a before/after panel showed
 *  "[articles/client-uploads/b4010f8623.md#c0]"): no citation fragment, pointer or source parenthetical is drawn. */
function cleanDiagramText(v: unknown): string {
    return String(v ?? '')
        .replace(/\s*[(\[](?:Sources?|via|per)\s*:[^)\]]{0,260}[)\]]/gi, '')
        .replace(/\s*\[[^\]]*\.md#c\d+[^\]]*\]/gi, '')
        .replace(/\s*[a-z0-9_./-]+\.md#c\d+/gi, '')
        // 2026-10-27 (run 40: an exhibit's bullets read "(engagement research synthesis)"): provider labels never reach a drawing
        .replace(/\s*\((?:engagement research synthesis|(?:gemini|gpt[-\w.]*|claude[-\w.]*|openai|deepseek)?\s*\(?(?:focused|deep|web) research\)?|research synthesis)\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function infographicSpecFrom(el: unknown, concept: string): Record<string, unknown> | null {
    const o = (el && typeof el === 'object') ? el as Record<string, unknown> : {};
    // 0) 2026-10-23: a structured graph (nodes + edges, optional groups) renders as a NATIVE flowchart (Mermaid
    //    layout in the proxy's Chromium): decision trees, system flows, operating models, escalation paths.
    if (Array.isArray(o['nodes']) && Array.isArray(o['edges'])) {
        const nodes = (o['nodes'] as unknown[]).map((n, i) => {
            if (typeof n === 'string') return cleanDiagramText(n) ? { id: `n${i}`, label: cleanDiagramText(n) } : null;
            if (n && typeof n === 'object') {
                const r = n as Record<string, unknown>;
                const label = cleanDiagramText(r.label ?? r.name ?? r.title ?? '');
                return label ? { id: String(r.id ?? label), label, kind: String(r.kind ?? 'step') } : null;
            }
            return null;
        }).filter(Boolean).slice(0, 14);
        const edges = (o['edges'] as unknown[]).map((e) => {
            if (!e || typeof e !== 'object') return null;
            const r = e as Record<string, unknown>;
            const from = String(r.from ?? r.source ?? ''), to = String(r.to ?? r.target ?? '');
            return from && to ? { from, to, label: typeof r.label === 'string' ? cleanDiagramText(r.label) : '' } : null;
        }).filter(Boolean).slice(0, 24);
        if (nodes.length >= 3 && edges.length >= 2) {
            const spec: Record<string, unknown> = { kind: 'flowchart', nodes, edges };
            if (Array.isArray(o['groups'])) spec['groups'] = o['groups'];
            if (typeof o['direction'] === 'string') spec['direction'] = o['direction'];
            return spec;
        }
    }
    // 1) process-flow from actions/steps/phases (the mechanism the element proposes).
    //    2026-07-02 - preserve per-step DESCRIPTIONS: authored {title, description} objects were
    //    being flattened to bare name strings, so the rendered cards carried a title floating in
    //    empty space (the panel read as unfinished). The native renderer already supports
    //    step.description (the .psd line); carry it through.
    for (const key of ['actions', 'steps', 'phases', 'coherentActions']) {
        const raw = o[key];
        if (!Array.isArray(raw)) continue;
        const steps = raw.map((x) => {
            if (typeof x === 'string' && x.trim()) return { name: x.trim() };
            if (x && typeof x === 'object') {
                const r = x as Record<string, unknown>;
                const strip = (v: unknown) => String(v ?? '').replace(/\s*[(\[](?:Sources?):[^)\]]{1,220}[)\]]/gi, '').replace(/\s*\[[a-z0-9_./-]+\.md#c\d+(?:[^\]]{0,80})?\]/gi, '').replace(/\s{2,}/g, ' ').trim();
                const name = strip(r.title ?? r.name ?? r.step ?? r.label ?? r.action);
                const desc = strip(r.description ?? r.detail ?? r.descriptor ?? r.body);
                if (name) {
                    const step: { name: string; description?: string } = { name };
                    if (desc) step.description = desc;
                    return step;
                }
            }
            return null;
        }).filter((s): s is { name: string; description?: string } => !!s).slice(0, 6);
        if (steps.length >= 3) {
            return { kind: 'process-flow', steps };
        }
    }
    // 2) comparison from before/after shapes
    const ba = o['beforeAfter'] as Record<string, unknown> | undefined;
    if (ba && typeof ba === 'object') {
        const left = _strList((ba as any).before?.points ?? (ba as any).before, 5);
        const right = _strList((ba as any).after?.points ?? (ba as any).after, 5);
        if (left.length >= 2 && right.length >= 2) {
            // the sides carry their own names when the payload gives them (2026-10-26 live: "Contracted" and "Proposal"
            // were drawn under "Before" and "After")
            const nameOf = (side: any, dflt: string) => {
                const n = side && typeof side === 'object' ? cleanDiagramText(side.title ?? side.label ?? side.heading ?? side.name ?? '') : '';
                return n || dflt;
            };
            return {
                kind: 'comparison',
                left: { title: nameOf((ba as any).before, 'Before'), points: left },
                right: { title: nameOf((ba as any).after, 'After'), points: right },
            };
        }
    }
    // 3) stat-row from kpis/stats/metrics carrying label+value (+ quote/source when cited)
    for (const key of ['kpiTiles', 'kpis', 'stats', 'metrics', 'keyMetrics']) {
        const arr = o[key];
        if (Array.isArray(arr)) {
            const SRC = /\s*[(\[](?:Sources?):\s*([^)\]]{1,220})[)\]]/gi;
            const PTR = /\s*\[[a-z0-9_./-]+\.md#c\d+(?:[^\]]{0,80})?\]/gi;
            const stats = arr.filter(x => x && typeof x === 'object').map(x => {
                const s = x as Record<string, unknown>;
                // 2026-10-23 (live run 14): a resolved pointer inside the quote ("53% open rate (Source: X)") rendered twice
                // on the card ("SOURCE: X (SOURCE: X)"); the fragment leaves the quote and names the source when none is set.
                let found = '';
                const quote = typeof s.quote === 'string' ? s.quote.replace(SRC, (_m, g: string) => { found = found || g.trim(); return ''; }).replace(PTR, '').replace(/\s{2,}/g, ' ').trim() : undefined;
                const label = String(s.label ?? s.name ?? '').replace(SRC, '').replace(PTR, '').trim();
                const source = typeof s.source === 'string' && s.source.trim() ? s.source.replace(SRC, '').replace(PTR, '').trim() : (found || undefined);
                return { label, value: String(s.value ?? s.stat ?? '').replace(SRC, '').replace(PTR, '').trim(), quote, source };
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

/** 2026-10-23: the frames a reader studies (full-bleed backdrops, hero panels at 560x740 and up) take the proxy's
 *  quality ladder (Gemini 3 Pro Image, then gpt-image-2.5); thumbnails, header scenes and glyphs take the fast one. */
function imageTierFor(style: string | undefined, bounds?: { w: number; h: number }): 'quality' | 'fast' {
    if (style === 'photo-background') return 'quality';
    const area = bounds ? (Number(bounds.w) || 0) * (Number(bounds.h) || 0) : 0;
    return area >= 400_000 ? 'quality' : 'fast';
}

async function generateOne(concept: string, brand: string, canvas: 'dark' | 'light', kind: SlotKind,
                           variant: number, branch?: string, el?: unknown,
                           bounds?: { w: number; h: number }, style?: string): Promise<{ url: string; dataUri: string; reused: boolean } | null> {
    try {
        // 2026-07-03 slides-imagery uplift: a PHOTO style routes to the illustration endpoint
        // with the photographic prompt (opaque, VS skipped, concept = literal content-derived
        // text) - it must NEVER fall into the native infographic lane, whose spec derivation
        // returns null for narrative payloads (that null was why cover panels seldom filled).
        const brandHint = brandImageryHint(brand) || undefined;
        if (style && style.startsWith('photo-')) {
            const resp = await fetch(`${PROXY_BASE}/api/ai/illustration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 2026-10-23: the slot's bounds pick the aspect ratio and the slot kind picks the model tier (proxy ladder).
                body: JSON.stringify({ concept, brand, canvas, slot: kind, variant, style, literal: true, brandHint, bounds, tier: imageTierFor(style, bounds) }),
            });
            if (!resp.ok) return null;
            const r = await resp.json();
            if (r && typeof r.url === 'string' && r.url) return { url: r.url, dataUri: typeof r.dataUri === 'string' ? r.dataUri : '', reused: !!r.reused };
            // 2026-10-26 (owner: "WHEN IMAGE MODELS CANT VISUALIZE ABSTRACT CONCEPTS USE OUR DIAGRAMMING TOOL"): the proxy
            // judged the slide abstract and found nothing to draw in its words; the payload's own structure (steps,
            // nodes, stats) is drawn instead, in slots large enough to read a diagram. Otherwise the slot stays empty.
            // 2026-10-26 (live: 8 px node diagrams in 560 px brief-card panels): only an exhibit-size panel reads a diagram
            const readable = (bounds?.w || 0) >= 800 && (bounds?.h || 0) >= 360 && (bounds?.h || 0) < 1000;
            if (!(r && r.abstract) || !readable || style === 'photo-background') return null;
            branch = 'infographic';
        }
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
            body: JSON.stringify({ concept, brand, canvas, slot: kind, variant, brandHint, bounds, tier: imageTierFor('line', bounds) }),
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

    // ONE normalizer for every brand spelling (#NXT / #NU / #deciem).
    const brand = normalizeBrandId(brandRaw);
    const deckTheme: 'dark' | 'light' = String(deckThemeRaw || 'dark') === 'light' ? 'light' : 'dark';
    const canvas: 'dark' | 'light' = spec.ground || deckTheme;  // registry ground is authoritative per slot
    const kind: SlotKind = spec.kind || 'panel';
    const usedUrls = new Set<string>();
    let attached = 0;

    // Pull a unique image for `concept`, bumping variant on intra-artifact repeats. The source
    // ELEMENT rides along so the native infographic branch can build a content-true spec (E4).
    const uniqueImage = async (concept: string, el?: unknown): Promise<string> => {
        for (let v = 0; v <= 3; v++) {
            const r = await generateOne(concept, brand, canvas, kind, v, spec.branch, el, spec.bounds, spec.style);
            if (!r) return '';
            // Dedup on the stable content-id (url); STORE the data-URI so the image embeds in exports
            // (falls back to the url only if the endpoint returned no dataUri).
            if (!usedUrls.has(r.url)) { usedUrls.add(r.url); return r.dataUri || r.url; }
        }
        return '';
    };

    // 2026-07-03 photo concepts are LITERAL slide content (title + supporting line), never a
    // free-floating theme word - the scene depicts what THIS deck is about, whatever industry
    // the corpus returned.
    const photoConceptFromPayload = (): string => {
        const head = conceptFromPayload(payload);
        const sub = ['subtitle', 'thesis', 'supporting'].map((k) => payload[k])
            .find((v) => typeof v === 'string' && (v as string).trim()) as string | undefined;
        const persona = (payload as any).persona;
        const personaName = persona && typeof persona === 'object' ? String(persona.name || '') : '';
        // EVIDENCE-GROUNDED DEPICTION (2026-07-10, all industries/persona types): when the
        // Analyst authored persona.depiction (corpus-derived appearance attributes), it LEADS
        // the concept - the proxy portrait prompt treats stated attributes as binding.
        const depiction = persona && typeof persona === 'object' ? String((persona as any).depiction || '').trim() : '';
        // 2026-10-23: the deck subject (research objective) anchors interstitial scenes to what the deck is about.
        const deckSubject = typeof (payload as any)._deckSubject === 'string' ? `Subject of the deck: ${(payload as any)._deckSubject}` : '';
        if (personaName || head) return [depiction, personaName || head, personaName ? head : sub, deckSubject].filter(Boolean).join('. ').slice(0, 420);
        // block-quote anatomy (2026-07-10): no title/name fields - the scene depicts the SPEAKER'S
        // world: topic kicker + attribution + the quote's first clause (subject language, never text art).
        const kicker = typeof payload['topicKicker'] === 'string' ? (payload['topicKicker'] as string) : '';
        const who = ['attributionName', 'attributionRole'].map((k) => payload[k])
            .filter((v) => typeof v === 'string' && (v as string).trim()).join(', ');
        const quote = typeof payload['quote'] === 'string' ? (payload['quote'] as string).split(/[.;]/)[0] : '';
        return [kicker, who, quote].filter(Boolean).join('. ').slice(0, 260);
    };

    if (spec.mode === 'panel' || spec.mode === 'hero') {
        const concept = spec.style ? photoConceptFromPayload() : conceptFromPayload(payload);
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
        let concept = conceptFromElement(arr[i]);
        if (spec.style && concept) {
            // photo thumbnails: the item's own supporting line rides along so the scene depicts
            // THIS item's subject specifically (content-derived, industry-agnostic). An authored
            // per-item depiction (corpus-derived person attributes, any industry/persona type)
            // LEADS the concept and is binding on the image.
            const el = arr[i] as Record<string, unknown>;
            const dep = typeof (el as any)?.depiction === 'string' ? String((el as any).depiction).trim() : '';
            const line = ['body', 'description', 'definition', 'summary'].map((k) => el && (el as any)[k])
                .find((v) => typeof v === 'string' && (v as string).trim()) as string | undefined;
            concept = [dep, concept, line].filter(Boolean).join('. ').slice(0, 340);
        }
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
