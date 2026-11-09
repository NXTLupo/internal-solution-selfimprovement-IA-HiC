// artifactIconResolver.ts - 2026-06-26
//
// The ICON branch resolver. Given an artifact whose GOLD-audit branch is 'icon', walk its registry
// slot spec (artifactImageSlots) and fill the carrier field(s) with TOKENIZED glyph data-URIs from
// the icon library. Deterministic, synchronous, $0, anti-slop - the icon's colour is resolved from
// the brand token mirror (never hardcoded) and the glyph id is chosen from the LIVE element content
// + run industry (content-true, not decorative). Mirrors artifactIllustrator's per-element/glyph/
// panel walk so the renderer twins read the same carrier shape.

import { imageSpecFor, type ArtifactImageSpec } from './artifactImageSlots';
import { ICONS, compositeIcon, renderIconForBrand, iconToDataUri, isContentTrueIcon, candidateBaseIds } from './iconLibrary';
import { normalizeBrandId } from '../components/slideTemplates/brands';

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
const STRICT_GLYPH_DENY = new Set(['cookie', 'bug', 'virus', 'skull', 'bomb', 'trash', 'poop', 'ghost']);

function oneIcon(brand: string, ground: 'dark' | 'light', industry: string | undefined, concept: string, heading: string, explicitId?: string, strict = false): string {
    if (explicitId) {
        const id = explicitId.replace(/^icon:/, '');
        if (ICONS[id]) { const svg = renderIconForBrand(id, { brand, ground, role: 'accent', size: 96 }); return svg ? iconToDataUri(svg) : ''; }
    }
    // the same string passed as concept and heading is read once (2026-10-26 live: "Advisors and staff" doubled to six
    // words, past the role check's limit, and the org-model row lost its only unresolved glyph)
    const text = (heading && heading.trim() !== (concept || '').trim() ? `${concept || ''} ${heading}` : (concept || heading || '')).trim();
    if (!text) return '';
    const r = compositeIcon({ concept: text, industry, brand, ground, role: 'accent', size: 96 });
    // CONTENT-TRUE OR NOTHING: a glyph that only resolved to a generic industry/default mark
    // (e.g. the same 'insight' star on every company row) is meaningless decoration - drop it.
    if (!isContentTrueIcon(r.resolvedBy)) return '';
    // strict (compose-time card glyphs): a tag overlap alone is not content-true enough for a card the reader studies,
    // and a technical homonym never lands on a business card (live run 12: "session" resolved to the web cookie glyph)
    if (strict && (r.resolvedBy === 'tag' || STRICT_GLYPH_DENY.has(r.baseId))) return '';
    return r.svg ? r.dataUri : '';
}

/** 2026-10-23 (#slides elevation, iconography): archetypes whose cards carry an icon cell, independent of the
 *  registry's single image entry (which is the photo slot). Deterministic and offline: a glyph lands only when the
 *  composition engine resolves the step / panel concept to a CONTENT-TRUE icon; otherwise the cell stays empty. */
const COMPOSE_TIME_ICON_SLOTS: Record<string, { field: string; carrier: string; max: number }> = {
    'flow-arc': { field: 'steps', carrier: 'stepIcons', max: 6 },
    'comparison-panels': { field: 'panels', carrier: 'panelIcons', max: 3 },
    'org-model': { field: 'columns', carrier: 'columnIcons', max: 3 },
    'numbered-themes': { field: 'items', carrier: 'itemIcons', max: 4 },
};

/** The supporting text of a card (its description or items), read only when the card's title names no glyph. */
function detailFromElement(el: unknown): string {
    if (!el || typeof el !== 'object') return '';
    const o = el as Record<string, unknown>;
    const parts: string[] = [];
    for (const k of ['description', 'body', 'detail', 'summary', 'role', 'statement']) if (typeof o[k] === 'string') parts.push(o[k] as string);
    for (const k of ['items', 'bullets', 'points']) if (Array.isArray(o[k])) parts.push(...(o[k] as unknown[]).filter(x => typeof x === 'string') as string[]);
    return parts.join(' ').slice(0, 400);
}

/**
 * 2026-10-27 (run 43: zero icons across the deck; one unmatched card blanked each row, and two cards naming the same
 * idea collided on one glyph): a row of sibling cards takes DISTINCT content-true glyphs. Each card takes the earliest
 * act or object its title names that no earlier card took, then its supporting text; a model-chosen `icon` id wins.
 * Returns [] when any card names nothing (the row carries an icon on every card or on none).
 */
function rowIcons(brand: string, ground: 'dark' | 'light', industry: string | undefined, arr: unknown[]): string[] {
    const used = new Set<string>();
    const out: string[] = [];
    for (const el of arr) {
        const explicit = (explicitIconId(el) || '').replace(/^icon:/, '');
        const pool = [explicit, ...candidateBaseIds(conceptFromElement(el), industry), ...candidateBaseIds(detailFromElement(el), industry)];
        const id = pool.find(c => c && ICONS[c] && !used.has(c) && !STRICT_GLYPH_DENY.has(c));
        if (!id) return [];
        const svg = renderIconForBrand(id, { brand, ground, role: 'accent', size: 96 });
        if (!svg) return [];
        used.add(id);
        out.push(iconToDataUri(svg));
    }
    return out;
}

/** Fill the compose-time icon carrier for `archetype` (bare id, no `slides:` prefix). Idempotent: a carrier that
 *  already holds any glyph is left alone. Returns the number of glyphs attached. */
export function attachContentTrueIcons(archetype: string, payload: Record<string, unknown> | null | undefined,
                                       brandRaw: string, groundRaw: 'dark' | 'light', industry?: string): number {
    const slot = COMPOSE_TIME_ICON_SLOTS[archetype.replace(/^slides:/, '')];
    if (!slot || !payload || typeof payload !== 'object') return 0;
    const arr = payload[slot.field];
    if (!Array.isArray(arr) || !arr.length) return 0;
    const existing = payload[slot.carrier];
    if (Array.isArray(existing) && existing.some(Boolean)) return 0;
    const icons = rowIcons(normalizeBrandId(brandRaw), groundRaw, industry, arr.slice(0, slot.max));
    // 2026-10-26 (owner audit: icons on cards 02 and 04 of a four-step flow, none on 01 and 03): a row of sibling cards
    // carries an icon on EVERY card or on none; a half-filled row reads as broken.
    if (!icons.length) { payload[slot.carrier] = arr.slice(0, slot.max).map(() => ''); return 0; }
    payload[slot.carrier] = icons;
    return icons.length;
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
    // ONE normalizer for every brand spelling (#NXT / #NU / #deciem); the icon library resolves the
    // glyph color from that brand's token mirror (DECIEM: pink accent, cyan cool, black ink).
    const brand = normalizeBrandId(brandRaw);
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
    // a #slides card row is held to the compose-time card rule: distinct content-true glyphs, every card or none
    if (artifact.startsWith('slides:')) {
        const row = rowIcons(brand, ground, industry, arr.slice(0, cap));
        if (!row.length) {
            onLog?.(`${artifact}: not every column names a glyph; the row stays without icons (every card or none)`);
            payload[spec.carrier] = arr.slice(0, cap).map(() => '');
            return 0;
        }
        payload[spec.carrier] = row;
        onLog?.(`${artifact}: ${row.length}/${cap} icons attached across ${spec.elementField} slots`);
        return row.length;
    }
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
