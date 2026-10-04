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

// 2026-10-01 - THIRD brand mode: DECIEM (The Abnormal Beauty Company), sourced from the
// DECIEM PowerPoint template (docs/DECIEM-AIStratPresentation.pptx, template slides only) and
// mirrored into hic-workspace/design-system/figma-tokens.json `DECIEM` + design-system/deciem/.
// Hashtag `#deciem`; tokens at /api/design-tokens?brand=DECIEM. Same contract as #NXT / #NU:
// brand is a token-set flip, every renderer resolves through getBrand()/normalizeBrandId().
export type BrandId = 'nxt' | 'nu' | 'deciem';
export const BRAND_IDS: readonly BrandId[] = ['nxt', 'nu', 'deciem'] as const;
/** Upper-case brand variant used by the directive parsers (#NXT / #NU / #DECIEM). */
export type BrandVariantId = 'NXT' | 'NU' | 'DECIEM';

/**
 * ONE normalizer for every brand string the system carries: hashtag variants ('NU', '#deciem'),
 * fence attributes (brand=nu), stored artifact meta ('DECIEM'), legacy aliases ('northeastern').
 * Unknown or empty input is NXT (the default brand).
 */
export function normalizeBrandId(x: unknown): BrandId {
    const k = String(x ?? '').trim().toLowerCase().replace(/^#/, '');
    if (k === 'nu' || k === 'northeastern') return 'nu';
    if (k === 'deciem') return 'deciem';
    return 'nxt';
}
export function brandVariantOfId(id: unknown): BrandVariantId {
    const b = normalizeBrandId(id);
    return b === 'nu' ? 'NU' : b === 'deciem' ? 'DECIEM' : 'NXT';
}

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

// === DECIEM - THE ABNORMAL BEAUTY COMPANY (2026-10-01) ===
//
// Values extracted from the DECIEM PowerPoint template (template slides 11-51 of
// docs/DECIEM-AIStratPresentation.pptx): 1 master, 34 layouts, 13.33x7.5in. Visual language:
// black title/section canvases with a thin-bordered logo lockup ("THE ABNORMAL BEAUTY COMPANY."
// over "DECIEM"), white body slides with Poppins Bold UPPERCASE headlines and Josefin Sans body,
// corner line-art backgrounds with pink / cyan / purple / orange / yellow pops, solid-pop section
// dividers (cyan 00FACC, purple 8A69D4, pink FB48C4, orange FF6C2F). No rail, no dot-mark, no band
// color: the dark surface is pure black. Fallback defaults only; live values hydrate from
// /api/design-tokens?brand=DECIEM (figma-tokens.json `DECIEM`, PPTX-sourced, not a Figma mode).
export const deciemBrand: Brand = {
    ...TOKENS,
    BRAND_ID: 'deciem',
    INK: '000000',
    BODY: '1A1A1A',
    SECONDARY: '5A5A5A',
    MUTED: '8A8A8A',
    RULE: 'E3E3E3',
    PANEL: 'F4F4F4',
    PALE: 'FAFAFA',
    BLACK: '000000',
    // Dark-surface slot: pure black (the template's title / section canvas)
    TEAL: '000000',
    TEAL_DARK: '000000',
    // PRIMARY accent: the template's pink pop (on-accent text is black)
    CHARTREUSE: 'FB48C4',
    CHARTREUSE_BRIGHT: 'FB48C4',
    CHARTREUSE_PALE: 'FFE1F4',
    // Secondary / cool accent: cyan pop
    CYAN: '00FACC',
    GREEN: '00FACC',
    RUST: 'FF6C2F',
    RED: 'FF6C2F',
    RAIL: '000000',
    KICKER: 'FB48C4',
    ACCENT_WARN: 'FF6C2F',
    ACCENT_COOL: '8A69D4',
    WASH_WARN: 'FFEFE7',
    WASH_COOL: 'E5FFF9',
    BAND: '000000',
    BAND_TEXT: 'FFFFFF',
    HAIRLINE: 'E3E3E3',
    GREY: '6B6B6B',
    GOLD_ACCENT: '8A69D4',   // premium slot = the purple pop
    // Typography, measured on template slides 11-51: Poppins Bold uppercase is EVERY title,
    // subtitle and label; Josefin Sans is body; Nunito is the table / data / meta face
    // (Questrial appears once and is not a role). Labels ride on FONT_LABEL (Poppins), the
    // mono slot (source lines, meta rows, table cells) on Nunito.
    FONT: 'Josefin Sans',
    FONT_DISPLAY: 'Poppins',
    FONT_TITLE: 'Poppins',
    TITLE_WEIGHT: '700',
    TITLE_TRANSFORM: 'uppercase',
    FONT_LABEL: 'Poppins',
    FONT_BODY: 'Josefin Sans',
    FONT_MONO: 'Nunito',
    FONT_DISPLAY_PPTX: 'Poppins',
    SEAL_LABEL: 'DECIEM · The Abnormal Beauty Company',
    BRAND_LOGO_SVG: '',
    BRAND_LOGO_WORDMARK: 'DECIEM',
    BRAND_LOGO_LOCKUP: 'THE ABNORMAL BEAUTY COMPANY.\nDECIEM',
    BRAND_LOGO_WEIGHT: '700',
    BRAND_LOGO_TRACKING: '0',
};

export const BRANDS: Record<BrandId, Brand> = {
    nxt: nxtBrand,
    nu: nuBrand,
    deciem: deciemBrand,
};

export const DEFAULT_BRAND_ID: BrandId = 'nxt';

export function getBrand(id?: BrandId | string | null): Brand {
    return BRANDS[normalizeBrandId(id)];
}

/**
 * Template-sourced ART for a brand (backgrounds, divider fills, logo lockup). NXT and NU carry
 * none (their chrome is the rail + dot-mark + hydrated logo); DECIEM hydrates its block from
 * /api/design-tokens?brand=DECIEM `art` (figma-tokens.json). Renderers read it through
 * getBrandArt() so the stage twin, the preview twin and the PPTX export share ONE source.
 */
export interface BrandArtZone { x: number; y: number; w: number; h: number }
/** `zones` = measured art occupancy rectangles in 1920x1080 stage space; text must stay out of them. */
export interface BrandArtBackground { file: string; pop: string; corners: string[]; layout?: string; zones?: BrandArtZone[] }
export interface BrandArtDividerFill { fill: string; text: string; layout?: string }
export interface BrandArt {
    assetsRoute: string;
    templatePptx?: string;
    canvas: { cover: 'dark' | 'paper' | 'pop'; section: 'dark' | 'paper' | 'pop'; thesis: 'dark' | 'paper' | 'pop'; body: 'dark' | 'paper' | 'pop' };
    cover?: { background?: string; fill: string; text: string; lockup?: boolean };
    dividerFills: BrandArtDividerFill[];
    bodyBackgrounds: BrandArtBackground[];
    subBrandBackgrounds?: Array<{ file: string; brand: string; layout?: string; canvas?: string }>;
    rules?: string[];
}
export const BRAND_ART: Partial<Record<BrandId, BrandArt>> = {
    // Build-time fallback for DECIEM so the stage twin paints template art even before the
    // token feed hydrates; the live block from figma-tokens.json overwrites it at boot.
    deciem: {
        assetsRoute: '/api/design-assets/deciem/',
        templatePptx: 'hic-workspace/design-system/deciem/deciem-template.pptx',
        canvas: { cover: 'dark', section: 'pop', thesis: 'dark', body: 'paper' },
        cover: { background: 'layout11-title-slide-background.jpg', fill: '#000000', text: '#FFFFFF', lockup: true },
        dividerFills: [
            { fill: '#00FACC', text: '#000000' },
            { fill: '#8A69D4', text: '#FFFFFF' },
            { fill: '#FB48C4', text: '#FFFFFF' },
            { fill: '#FF6C2F', text: '#FFFFFF' },
            { fill: '#000000', text: '#FFFFFF' },
        ],
        bodyBackgrounds: [
            { file: 'layout13-1-custom-layout-background.jpg', pop: 'pink', corners: ['top-left', 'bottom-right'], zones: [{ x: 0, y: 0, w: 640, h: 135 }, { x: 1440, y: 540, w: 480, h: 540 }] },
            { file: 'layout16-20-custom-layout-background.jpg', pop: 'purple', corners: ['top-left', 'bottom-right'], zones: [{ x: 0, y: 0, w: 640, h: 135 }, { x: 1280, y: 675, w: 640, h: 405 }] },
            { file: 'layout17-4-custom-layout-background.jpg', pop: 'orange', corners: ['top-left', 'bottom-right'], zones: [{ x: 0, y: 0, w: 640, h: 270 }, { x: 1600, y: 810, w: 320, h: 270 }] },
            { file: 'layout18-21-custom-layout-background.jpg', pop: 'cyan', corners: ['top-left', 'bottom-right'], zones: [{ x: 0, y: 0, w: 640, h: 270 }, { x: 1600, y: 675, w: 320, h: 405 }] },
            { file: 'layout19-2-custom-layout-background.jpg', pop: 'cyan', corners: ['bottom-left', 'top-right'], zones: [{ x: 1600, y: 0, w: 320, h: 270 }, { x: 0, y: 810, w: 640, h: 270 }] },
            { file: 'layout20-3-custom-layout-background.jpg', pop: 'purple', corners: ['bottom-left', 'bottom-right'], zones: [{ x: 0, y: 810, w: 480, h: 270 }, { x: 1600, y: 810, w: 320, h: 270 }] },
            { file: 'layout21-25-custom-layout-background.jpg', pop: 'pink', corners: ['bottom-left', 'top-right'], zones: [{ x: 1760, y: 0, w: 160, h: 270 }, { x: 0, y: 810, w: 640, h: 270 }] },
            { file: 'layout22-22-custom-layout-background.jpg', pop: 'orange', corners: ['bottom-left', 'bottom-right'], zones: [{ x: 1440, y: 405, w: 480, h: 675 }, { x: 0, y: 810, w: 480, h: 270 }] },
            { file: 'layout23-23-custom-layout-background.jpg', pop: 'yellow', corners: ['bottom-left', 'bottom-right'], zones: [{ x: 1440, y: 540, w: 480, h: 540 }, { x: 0, y: 810, w: 480, h: 270 }] },
            { file: 'layout14-24-custom-layout-background.jpg', pop: 'yellow', corners: ['top-left', 'bottom-right'], zones: [{ x: 0, y: 0, w: 640, h: 135 }, { x: 1600, y: 675, w: 320, h: 405 }] },
            { file: 'layout15-13-custom-layout-background.jpg', pop: 'lineart', corners: ['bottom-right'], zones: [{ x: 1600, y: 810, w: 320, h: 270 }] },
            { file: 'layout33-custom-layout-background.jpg', pop: 'lineart', corners: ['bottom-right'], zones: [{ x: 1600, y: 675, w: 320, h: 405 }] },
        ],
    },
};
export function getBrandArt(id?: BrandId | string | null): BrandArt | null {
    return BRAND_ART[normalizeBrandId(id)] || null;
}

/**
 * Detect a brand hashtag inside a free-text prompt. Matches `#NXT`, `#NU`, `#DECIEM`
 * (case-insensitive). Returns `null` if none is present.
 */
export function detectBrandFromText(text: string): BrandId | null {
    if (!text) return null;
    const m = text.match(/(?:^|\s)#(nxt|nu|northeastern|deciem)\b/i);
    if (!m) return null;
    return normalizeBrandId(m[1]);
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
        // 2026-10-01 - a brand may set a dedicated label face (DECIEM: Poppins Bold uppercase);
        // NXT / NU leave FONT_LABEL empty and keep labels on the mono face.
        case 'label': return brand.FONT_LABEL || brand.FONT_MONO;
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
    deciem: {
        name: 'DECIEM',
        hashtag: '#DECIEM',
        description: 'Black title canvases with the boxed lockup, white body slides, Poppins Bold uppercase headlines, pink / cyan / purple / orange pops from the DECIEM PowerPoint template.',
    },
};
