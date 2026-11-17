/**
 * imageryStyles.ts - 2026-11-09
 *
 * OWNER DIRECTIVE: "I want a few different professional styles of imagery for the user to choose
 * from that can integrate into the NXT Humans colors, fonts, and templates", and "once implemented,
 * [this] be implemented in EVERY artifact".
 *
 * Before this, HiC had exactly ONE illustration treatment, locked in the proxy on 2026-06-17 (a
 * single continuous unbroken line with off-register colour fields), plus three photographic modes.
 * There was no way for a reader to ask for a different look, so every artifact in the product shared
 * one visual idiom whether or not it suited the subject.
 *
 * This module is the CHOICE LAYER. It is deliberately brand-agnostic in values: each style says what
 * the picture should BE, and the proxy fills the actual colours from the live Figma token mirror per
 * brand (NXT / NU / DECIEM), so a style never hardcodes a hex and every style lands inside the brand.
 *
 * Styles are selected by a leading or trailing word on any artifact directive, e.g.
 *     #infographic isometric how students decide which assistant to trust
 *     #report blueprint the co-op connector architecture
 *     #brief duotone what advisors see before a meeting
 */

export type ImageryStyleId =
    | 'line'        // the house continuous-line treatment (default, unchanged)
    | 'isometric'   // dimensional technical composition
    | 'blueprint'   // schematic on a drafting ground
    | 'duotone'     // real photography reduced to two brand colours
    | 'collage';    // flat cut-paper geometric blocks

export interface ImageryStyle {
    id: ImageryStyleId;
    /** Words a user can type to pick it. */
    aliases: string[];
    /** One line for #help and the style picker. */
    label: string;
    /** What the proxy should draw. Colour words are ROLE names; the proxy substitutes brand hexes. */
    directive: string;
    /** True when the style renders photographic content rather than drawn artwork. */
    photographic: boolean;
}

export const IMAGERY_STYLES: ImageryStyle[] = [
    {
        id: 'line',
        aliases: ['line', 'lineart', 'line-art', 'house'],
        label: 'Continuous line: one unbroken accent line over off-register colour fields. The house default.',
        directive: 'a single continuous unbroken line in the brand line colour forming one fluid subject, with bold flat brand colour fields sitting slightly off-register behind it, generous negative space, no outlines on the colour fields, no gradients, no shading, no realism',
        photographic: false,
    },
    {
        id: 'isometric',
        aliases: ['isometric', 'iso', 'dimensional', '3d'],
        label: 'Isometric technical: layered planes at a true isometric angle, flat brand fills, no perspective tricks.',
        directive: 'a clean isometric technical illustration at a true 30 degree axonometric angle, built from layered flat planes and simple extruded volumes in the brand palette, even line weight on every edge, matte flat fills with no gradients, no cast shadows, no reflections',
        photographic: false,
    },
    {
        id: 'blueprint',
        aliases: ['blueprint', 'schematic', 'technical', 'draft'],
        label: 'Schematic: thin construction lines and annotation ticks on a faint drafting grid.',
        directive: 'a technical schematic drawing in thin even construction lines in the brand line colour on a faint drafting grid ground, with registration ticks and plain dimension marks, one flat brand accent fill used sparingly to pick out the subject, no shading, no realism',
        photographic: false,
    },
    {
        id: 'duotone',
        aliases: ['duotone', 'photo', 'photographic', 'photograph'],
        label: 'Duotone photography: a real documentary photograph reduced to two brand colours.',
        directive: 'a real documentary photograph of the described scene, printed as a two-colour duotone using the brand dark and the brand accent only, natural composition and real human posture, no studio gloss, no staged stock-photo expressions',
        photographic: true,
    },
    {
        id: 'collage',
        aliases: ['collage', 'cutpaper', 'cut-paper', 'flat', 'editorial'],
        label: 'Editorial collage: flat cut-paper shapes in bold brand blocks with hard edges.',
        directive: 'a flat editorial cut-paper collage built from bold simple geometric shapes in the brand palette with hard clean edges and slight paper overlap, one clear subject, no texture photography, no gradients, no drop shadows',
        photographic: false,
    },
];

export const DEFAULT_IMAGERY_STYLE: ImageryStyleId = 'line';

const BY_ALIAS = new Map<string, ImageryStyle>();
for (const s of IMAGERY_STYLES) for (const a of s.aliases) BY_ALIAS.set(a, s);

/** Resolve a style by id or alias; unknown input falls back to the house default. */
export function imageryStyleFor(word: string | undefined | null): ImageryStyle {
    const key = String(word || '').trim().toLowerCase();
    return BY_ALIAS.get(key) || BY_ALIAS.get(DEFAULT_IMAGERY_STYLE)!;
}

/**
 * Pull a style word out of a user prompt and return it with the word removed.
 *
 * Only a STANDALONE word matches, so "the blueprint for co-op advising" keeps its noun and does not
 * silently become a schematic: the word must sit at the start or end of the prompt, where a reader
 * puts a modifier, not inside the sentence.
 */
export function parseImageryStyle(prompt: string): { style: ImageryStyle; rest: string } {
    const raw = String(prompt || '').trim();
    if (!raw) return { style: imageryStyleFor(DEFAULT_IMAGERY_STYLE), rest: '' };

    const lead = raw.match(/^([A-Za-z][A-Za-z-]{2,14})\b[:,.\s-]+(.*)$/s);
    if (lead && BY_ALIAS.has(lead[1].toLowerCase())) {
        return { style: BY_ALIAS.get(lead[1].toLowerCase())!, rest: lead[2].trim() };
    }
    const tail = raw.match(/^(.*?)[,;\s]+(?:in\s+)?([A-Za-z][A-Za-z-]{2,14})\s*$/s);
    if (tail && BY_ALIAS.has(tail[2].toLowerCase())) {
        return { style: BY_ALIAS.get(tail[2].toLowerCase())!, rest: tail[1].trim() };
    }
    return { style: imageryStyleFor(DEFAULT_IMAGERY_STYLE), rest: raw };
}

/** The one-line roster for #help and any picker UI. */
export function imageryStyleRoster(): string {
    return IMAGERY_STYLES.map(s => `${s.id} - ${s.label}`).join('\n');
}
