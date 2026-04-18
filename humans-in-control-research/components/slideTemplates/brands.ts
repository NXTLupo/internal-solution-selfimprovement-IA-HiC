/**
 * BRAND SYSTEM — two visual themes, same layout geometry.
 *
 * Trigger: the AI picks a brand from hashtags in the user's prompt:
 *   #NXT  → NXT Humans (teal + chartreuse, Archivo)              — default
 *   #NU   → Northeastern University (near-black + Huskies Red)    — used when
 *                                                                   the user is
 *                                                                   building a
 *                                                                   deck for
 *                                                                   Northeastern
 *
 * Both brands share the same 16:9 canvas, 10 templates, typography ladder,
 * spacing, and export paths. Only colors (and optional display-font override)
 * change. The semantic slots below are the ones consumed by renderers —
 * rename here and every template picks up the new value.
 */

import { TOKENS } from './types';

export type BrandId = 'nxt' | 'nu';

/**
 * Brand-agnostic semantic color slots.
 * Keep the same keys as TOKENS so renderers can keep using `T.TEAL`-style
 * access — the VALUES differ per brand, which is what actually changes the
 * look of each slide.
 */
export type Brand = typeof TOKENS;

// === NXT HUMANS (default) — teal + chartreuse ===
export const nxtBrand: Brand = { ...TOKENS };

// === NORTHEASTERN UNIVERSITY — near-black + Huskies red ===
// Values extracted from the client deck:
//   .claude/skills/intelligence/Northeastern_Advancement_Giving.pptx
// Primary accent is the official "Huskies Red" #C8102E. Dark surface is
// #141414 (true near-black), not the teal NXT uses. Font stays Archivo since
// that is the typeface used throughout the existing NU deliverable.
export const nuBrand: Brand = {
    ...TOKENS,
    // Dark-surface slots (sidebar, section dividers, teal panels)
    TEAL: '141414',
    TEAL_DARK: '000000',
    // Primary accent slots (rules, oversized numbers, section-divider number)
    CHARTREUSE: 'C00000',
    CHARTREUSE_BRIGHT: 'C8102E',
    CHARTREUSE_PALE: 'FDE8EB',
    // Secondary accent (was cyan in NXT) — Northeastern uses neutral greys
    CYAN: '666666',
    // Warning slot stays rust; success stays green; ink + rules stay neutral
};

export const BRANDS: Record<BrandId, Brand> = {
    nxt: nxtBrand,
    nu: nuBrand,
};

export const DEFAULT_BRAND_ID: BrandId = 'nxt';

export function getBrand(id?: BrandId | string | null): Brand {
    if (!id) return nxtBrand;
    const key = String(id).toLowerCase();
    if (key === 'nu' || key === 'northeastern') return nuBrand;
    return nxtBrand;
}

/**
 * Detect a brand hashtag inside a free-text prompt. Matches `#NXT`, `#NU`,
 * `#nxt`, `#nu` (case-insensitive). Returns `null` if neither is present.
 */
export function detectBrandFromText(text: string): BrandId | null {
    if (!text) return null;
    const m = text.match(/(?:^|\s)#(nxt|nu|northeastern)\b/i);
    if (!m) return null;
    const tag = m[1].toLowerCase();
    if (tag === 'nu' || tag === 'northeastern') return 'nu';
    return 'nxt';
}

export const BRAND_METADATA: Record<BrandId, { name: string; hashtag: string; description: string }> = {
    nxt: {
        name: 'NXT Humans',
        hashtag: '#NXT',
        description: 'Teal sidebar + chartreuse accents. Anti-slop business flat minimalism.',
    },
    nu: {
        name: 'Northeastern University',
        hashtag: '#NU',
        description: 'Near-black sidebar + Huskies Red (#C8102E) accents. Advancement-deck brand.',
    },
};
