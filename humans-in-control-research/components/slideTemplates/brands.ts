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

// === NORTHEASTERN UNIVERSITY — REAL design system tokens ===
//
// Values extracted from the official NU design system at
// D:\NXT-HUMANS_AI_CX_WORKBENCH\northeastern-share (1)\colors_and_type.css
// (Distilled from "DS - Foundation.fig" + "DS - Components.fig").
//
// Critical corrections to the prior implementation:
//
//   1. FONT: Spectral (serif, light/300) for DISPLAY, Roboto (sans, 400-500)
//      for BODY. The prior NU implementation used Archivo everywhere — wrong.
//      Spectral is the editorial signature; Roboto is the UI workhorse.
//
//   2. INK is navy #141D30 — NOT pure black. NU's primary "dark" color is a
//      blue-tinted near-black (ink-800 from the design system), not the
//      mechanical black NXT uses.
//
//   3. RED is SPARING. The brand explicitly says: "Use it sparingly: primary
//      CTAs (sometimes), key data accents, brand seals. The everyday 'primary'
//      UI color is the deep ink navy, not red." So we map the brand-accent
//      slots to red (CHARTREUSE_* in NXT terminology, which means "the bright
//      brand accent") and the surface slots stay navy.
//
//   4. Neutrals are the SLATE scale — soft, institutional, not stark grays.
//      Slate-300 for borders, slate-100 for subtle surfaces, slate-50 for
//      page backgrounds.
//
//   5. Secondary accent (CYAN slot in NXT) becomes slate-500 — used for
//      tertiary text + muted iconography. NU's palette doesn't carry a
//      separate "secondary accent" color; muted slate plays that role.
export const nuBrand: Brand = {
    ...TOKENS,
    // INK — navy, not pure black (NU's ink-800 = rgb(20, 29, 48))
    INK: '141D30',
    // BODY text — slate-600 (rgb 71, 85, 105) — used for paragraph body
    BODY: '475569',
    // SECONDARY text — slate-500 (rgb 100, 116, 139) — captions, labels
    SECONDARY: '64748B',
    // MUTED — slate-400 — disabled, footer chrome
    MUTED: '94A3B8',
    // RULE — slate-300 — default stroke
    RULE: 'CBD5E1',
    // PANEL — slate-100 — subtle surface, table stripe
    PANEL: 'F1F5F9',
    // PALE — slate-50 — page background tint
    PALE: 'F8FAFC',
    // BLACK alias — keep close to INK navy for any renderer hitting it
    BLACK: '0B1326',  // ink-900
    // Dark-surface slot (renderers that fill a dark panel) — use INK navy
    TEAL: '141D30',
    TEAL_DARK: '0B1326',
    // PRIMARY brand accent — Huskies / NU red, used sparingly per brand spec
    CHARTREUSE: 'C8102E',         // nu-red-600 — primary
    CHARTREUSE_BRIGHT: 'C8102E',
    CHARTREUSE_PALE: 'FCCAD2',    // nu-red-100 tint
    // Secondary accent — slate-500 (no separate brand secondary color in NU)
    CYAN: '64748B',
    // Status colors map to NU semantic tokens
    GREEN: '38A169',              // success-solid
    RUST: 'FA8834',               // warning-solid (warm orange)
    RED: 'D8132D',                // error-solid
    // Typography — Spectral display + Roboto body
    FONT: 'Roboto',               // legacy alias maps to body face
    FONT_DISPLAY: 'Spectral',
    FONT_BODY: 'Roboto',
    FONT_MONO: 'Roboto Mono',
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

// 2026-05-26 — SHARED FONT-ROLE CONTRACT (anti-drift).
//
// Root cause of preview-vs-PPTX font drift: pptx.ts used a single `FONT`
// constant (= the body face, Roboto) for EVERY text element, including
// titles and display numbers, while web.tsx used `var(--font-display)`
// (Spectral) for those. The two renderers diverged because they each
// decided fonts independently.
//
// This resolver is the single source of truth both renderers MUST consume.
// A text element declares its SEMANTIC ROLE; the role maps to a brand
// font face. Adding a new template can no longer pick the wrong font —
// it picks a role, and the role resolves identically in web + PPTX.
//
// Role → face mapping (matches the web renderer's CSS var usage):
//   display  → FONT_DISPLAY (Spectral)  — titles, action-titles, hero
//                                          numbers, big stat numerals
//   body     → FONT_BODY    (Roboto)    — narratives, descriptions, prose
//   label    → FONT_MONO    (Roboto Mono) — eyebrow labels, tracked caps
//   mono     → FONT_MONO    (Roboto Mono) — source lines, codes, citations
//   quote    → FONT_DISPLAY (Spectral italic) — verbatim block quotes
export type TextRole = 'display' | 'body' | 'label' | 'mono' | 'quote';

export function fontForRole(role: TextRole, brand: Brand): string {
    switch (role) {
        case 'display': return brand.FONT_DISPLAY;
        case 'quote': return brand.FONT_DISPLAY;
        case 'label': return brand.FONT_MONO;
        case 'mono': return brand.FONT_MONO;
        case 'body':
        default: return brand.FONT_BODY;
    }
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
