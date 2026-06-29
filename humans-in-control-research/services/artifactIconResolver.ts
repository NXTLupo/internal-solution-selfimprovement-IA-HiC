// artifactIconResolver.ts - 2026-06-26
//
// The ICON branch resolver. Given an artifact whose GOLD-audit branch is 'icon', walk its registry
// slot spec (artifactImageSlots) and fill the carrier field(s) with TOKENIZED glyph data-URIs from
// the icon library. Deterministic, synchronous, $0, anti-slop - the icon's colour is resolved from
// the brand token mirror (never hardcoded) and the glyph id is chosen from the LIVE element content
// + run industry (content-true, not decorative). Mirrors artifactIllustrator's per-element/glyph/
// panel walk so the renderer twins read the same carrier shape.

import { imageSpecFor, type ArtifactImageSpec } from './artifactImageSlots';
import { ICONS, compositeIcon, renderIconForBrand, iconToDataUri, isContentTrueIcon } from './iconLibrary';

/** A short concept seed from a live payload element (string passes through; objects yield a title). */
function conceptFromElement(el: unknown): string {
    if (typeof el === 'string') return el.trim();
    if (el && typeof el === 'object') {
        const o = el as Record<string, unknown>;
        for (const k of ['name', 'actionTitle', 'title', 'heading', 'label', 'capability', 'phase', 'subject', 'insight', 'archetype', 'canonical_name']) {
            const v = o[k];
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
        // an explicit tokenized id the model emitted
        const ic = (o as any).icon || (o as any).iconId;
        if (typeof ic === 'string' && ic.trim()) return '';
    }
    return '';
}
function explicitIconId(el: unknown): string | undefined {
    if (el && typeof el === 'object') {
        const ic = (el as any).icon || (el as any).iconId;
        if (typeof ic === 'string' && ic.trim()) return ic.trim();
    }
    return undefined;
}
function conceptFromPayload(p: Record<string, unknown>): string {
    for (const k of ['actionTitle', 'title', 'thesis', 'name', 'heading', 'patternSignal', 'question', 'research_goal', 'researchGoal', 'canonical_name']) {
        const v = p[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

/** Render one tokenized glyph as a data-URI, or '' if no apt icon. An explicit `icon:<id>` from the
 *  model renders that base directly; otherwise the COMPOSITION engine resolves concept (+industry) to
 *  a base glyph + industry modifier badge (the 2,741-manifest path). */
function oneIcon(brand: string, ground: 'dark' | 'light', industry: string | undefined, concept: string, heading: string, explicitId?: string): string {
    if (explicitId) {
        const id = explicitId.replace(/^icon:/, '');
        if (ICONS[id]) { const svg = renderIconForBrand(id, { brand, ground, role: 'accent', size: 96 }); return svg ? iconToDataUri(svg) : ''; }
    }
    const text = `${concept || ''} ${heading || ''}`.trim();
    if (!text) return '';
    const r = compositeIcon({ concept: text, industry, brand, ground, role: 'accent', size: 96 });
    // CONTENT-TRUE OR NOTHING: a glyph that only resolved to a generic industry/default mark
    // (e.g. the same 'insight' star on every company row) is meaningless decoration - drop it.
    if (!isContentTrueIcon(r.resolvedBy)) return '';
    return r.svg ? r.dataUri : '';
}

/** Walk the artifact's icon-branch spec and fill its carrier(s). Mutates `payload`. Returns the
 *  number of glyphs attached. No-op (0) for non-icon artifacts. */
export function resolveArtifactIcons(
    artifact: string,
    payload: Record<string, unknown>,
    brandRaw: string,
    groundRaw: string | undefined,
    industry?: string,
    onLog?: (msg: string) => void,
): number {
    const spec: ArtifactImageSpec | undefined = imageSpecFor(artifact);
    if (!spec || spec.mode === 'none' || spec.branch !== 'icon' || !payload) return 0;
    const brand = String(brandRaw || 'NXT').toLowerCase() === 'nu' ? 'nu' : 'nxt';
    const ground: 'dark' | 'light' = (spec.ground || (groundRaw === 'light' ? 'light' : 'dark')) === 'light' ? 'light' : 'dark';
    let attached = 0;

    // single panel/glyph singleton
    if ((spec.mode === 'panel' || spec.mode === 'hero' || spec.mode === 'glyph') && !spec.elementField) {
        const uri = oneIcon(brand, ground, industry, conceptFromPayload(payload), conceptFromPayload(payload), explicitIconId(payload));
        if (uri) { payload[spec.carrier] = uri; attached++; onLog?.(`${artifact}: 1 icon attached`); }
        return attached;
    }

    // per-element / per-glyph
    const arr = spec.elementField ? (payload[spec.elementField] as unknown[]) : null;
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const cap = Math.min(arr.length, spec.max ?? arr.length);
    const icons: string[] = Array.isArray(payload[spec.carrier]) ? (payload[spec.carrier] as string[]).slice() : [];
    for (let i = 0; i < cap; i++) {
        const concept = conceptFromElement(arr[i]);
        const uri = oneIcon(brand, ground, industry, concept, concept, explicitIconId(arr[i]));
        icons[i] = uri;
        if (uri) attached++;
    }
    payload[spec.carrier] = icons;
    onLog?.(`${artifact}: ${attached}/${cap} icons attached across ${spec.elementField} slots`);
    return attached;
}
