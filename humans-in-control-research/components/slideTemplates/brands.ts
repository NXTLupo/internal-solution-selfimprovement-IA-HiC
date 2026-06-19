/**
 * BRAND SYSTEM - two visual themes, same layout geometry.
 *
 * Trigger: the AI picks a brand from hashtags in the user's prompt:
 *   #NXT  → NXT Humans (teal + chartreuse, Archivo)              - default
 *   #NU   → Northeastern University (near-black + Huskies Red)    - used when
 *                                                                   the user is
 *                                                                   building a
 *                                                                   deck for
 *                                                                   Northeastern
 *
 * Both brands share the same 16:9 canvas, 10 templates, typography ladder,
 * spacing, and export paths. Only colors (and optional display-font override)
 * change. The semantic slots below are the ones consumed by renderers -
 * rename here and every template picks up the new value.
 */

import { TOKENS } from './types';

export type BrandId = 'nxt' | 'nu';

/**
 * Brand-agnostic semantic color slots.
 * Keep the same keys as TOKENS so renderers can keep using `T.TEAL`-style
 * access - the VALUES differ per brand, which is what actually changes the
 * look of each slide.
 */
// 2026-06-08 - Brand is "same keys as TOKENS, but string tokens widened to
// `string`". Using `typeof TOKENS` directly inferred LITERAL types (INK:'141414'),
// so the NU brand's different hex/font values were rejected (21 tsc TS2322
// errors). Numeric tokens (WEB_W, PX_TO_IN, ...) keep their type; only string
// literals widen. -readonly drops the `as const` readonly so brand objects assign.
export type Brand = { -readonly [K in keyof typeof TOKENS]: typeof TOKENS[K] extends string ? string : typeof TOKENS[K] };

// === NXT HUMANS (default) - teal + chartreuse ===
export const nxtBrand: Brand = { ...TOKENS };

// === NORTHEASTERN UNIVERSITY - REAL design system tokens ===
//
// Values extracted from the official NU design system at
// D:\NXT-HUMANS_AI_CX_WORKBENCH\northeastern-share (1)\colors_and_type.css
// (Distilled from "DS - Foundation.fig" + "DS - Components.fig").
//
// Critical corrections to the prior implementation:
//
//   1. FONT: Spectral (serif, light/300) for DISPLAY, Roboto (sans, 400-500)
//      for BODY. The prior NU implementation used Archivo everywhere - wrong.
//      Spectral is the editorial signature; Roboto is the UI workhorse.
//
//   2. INK is navy #141D30 - NOT pure black. NU's primary "dark" color is a
//      blue-tinted near-black (ink-800 from the design system), not the
//      mechanical black NXT uses.
//
//   3. RED is SPARING. The brand explicitly says: "Use it sparingly: primary
//      CTAs (sometimes), key data accents, brand seals. The everyday 'primary'
//      UI color is the deep ink navy, not red." So we map the brand-accent
//      slots to red (CHARTREUSE_* in NXT terminology, which means "the bright
//      brand accent") and the surface slots stay navy.
//
//   4. Neutrals are the SLATE scale - soft, institutional, not stark grays.
//      Slate-300 for borders, slate-100 for subtle surfaces, slate-50 for
//      page backgrounds.
//
//   5. Secondary accent (CYAN slot in NXT) becomes slate-500 - used for
//      tertiary text + muted iconography. NU's palette doesn't carry a
//      separate "secondary accent" color; muted slate plays that role.
export const nuBrand: Brand = {
    ...TOKENS,
    // Explicit brand discriminator - renderers switch on this, NOT on font (NU is
    // now single-typeface Lato + a Figma mode, so FONT_TITLE==='Lora' is dead).
    BRAND_ID: 'nu',
    // 2026-06-10 - GOLD reconcile. Values now come from the LIVE NU design-system
    // Figma file (z2v9Pvhg23hlljEitPBdAt: token node 97:2 + GOLD case-study frames
    // 91:2 / 93:2), which is the deliverable design system the user built and
    // audited. It supersedes both the prior slate-scale guesses and the 2026-06-09
    // "official sans" reconcile for DELIVERABLE artifacts: the GOLD frames set
    // Lora (serif) for headlines + takeaway, Archivo for body, IBM Plex Mono for
    // kicker/meta/labels. brand.northeastern.edu remains Real Head Pro/Lato for
    // WEB UI surfaces, but generated slides follow the Figma deliverable system.
    // INK - deep navy from the live token sheet (color/ink #16233C)
    INK: '16233C',
    BODY: '16233C',
    SECONDARY: '73757A',
    MUTED: '73757A',
    RULE: 'DDDDD6',
    PANEL: 'F2F1EA',              // ecru
    PALE: 'FAF9F4',
    // BLACK alias = rail navy (color/rail #0E1626)
    BLACK: '0E1626',
    // Dark-surface slot (renderers that fill a dark panel) - ink navy
    TEAL: '16233C',
    TEAL_DARK: '0E1626',
    // PRIMARY brand accent - Huskies / NU red, used sparingly per brand spec
    CHARTREUSE: 'C8102E',         // color/accent
    CHARTREUSE_BRIGHT: 'D41B2C',  // color/accent-bright
    CHARTREUSE_PALE: 'FAEDED',    // GOLD warn wash
    // Secondary/cool accent - the NU "source" teal (color/source #1D6E64)
    CYAN: '1D6E64',
    // Status colors
    GREEN: '38A169',
    RUST: 'C8102E',               // pain/warn accent is red in the NU GOLD system
    RED: 'D8132D',
    // GOLD slots (NU values from the live Figma frames)
    RAIL: '0E1626',
    KICKER: 'C8102E',
    ACCENT_WARN: 'C8102E',
    ACCENT_COOL: '1D6E64',
    WASH_WARN: 'FAEDED',
    WASH_COOL: 'EDF7F5',
    BAND: '16233C',
    BAND_TEXT: 'FFFFFF',
    GOLD_ACCENT: 'A4804A',   // color/gold - rare premium accent (LESSON bar)
    // Typography - 2026-06-13: NU is now a SINGLE-TYPEFACE system (Lato, weight =
    // hierarchy) per Northeastern's brand model. All font slots resolve to Lato;
    // weight + size carry hierarchy (display/heading 700, body 400, labels 700
    // uppercase+tracked). Fallback defaults only - the live values hydrate from
    // /api/design-tokens (NU Brand Tokens font/* variables, all Lato). Google Fonts
    // Lato lacks 600, so web heading weight is 700.
    FONT: 'Lato',                 // legacy alias maps to body face
    FONT_DISPLAY: 'Lato',
    FONT_TITLE: 'Lato',
    TITLE_WEIGHT: '700',
    // Brand seal / wordmark for section-divider footer chrome (token, not a
    // renderer literal). NXT default 'NXT Humans' lives in TOKENS.
    SEAL_LABEL: 'Northeastern · Advancement',
    // NU masthead = red N monogram (hydrated as inline SVG from /api/design-tokens?brand=NU
    // logo.monogram) + NORTHEASTERN wordmark. Build default is the wordmark; the SVG
    // populates live at boot. Never hardcode the mark in the renderer.
    BRAND_LOGO_WORDMARK: 'NORTHEASTERN',
    FONT_BODY: 'Lato',
    FONT_MONO: 'Lato',
    FONT_DISPLAY_PPTX: 'Lato',
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

// 2026-05-26 - SHARED FONT-ROLE CONTRACT (anti-drift).
//
// Root cause of preview-vs-PPTX font drift: pptx.ts used a single `FONT`
// constant (= the body face, Roboto) for EVERY text element, including
// titles and display numbers, while web.tsx used `var(--font-display)`
// (Spectral) for those. The two renderers diverged because they each
// decided fonts independently.
//
// This resolver is the single source of truth both renderers MUST consume.
// A text element declares its SEMANTIC ROLE; the role maps to a brand
// font face. Adding a new template can no longer pick the wrong font -
// it picks a role, and the role resolves identically in web + PPTX.
//
// Role → face mapping (matches the web renderer's CSS var usage):
//   display  → FONT_DISPLAY (Spectral)  - titles, action-titles, hero
//                                          numbers, big stat numerals
//   body     → FONT_BODY    (Roboto)    - narratives, descriptions, prose
//   label    → FONT_MONO    (Roboto Mono) - eyebrow labels, tracked caps
//   mono     → FONT_MONO    (Roboto Mono) - source lines, codes, citations
//   quote    → FONT_DISPLAY (Spectral italic) - verbatim block quotes
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
