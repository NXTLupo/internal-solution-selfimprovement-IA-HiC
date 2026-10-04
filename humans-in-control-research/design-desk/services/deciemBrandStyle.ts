/**
 * deciemBrandStyle - brand-style text for DECIEM freeform HTML diagram artifacts (2026-10-01).
 *
 * exemplar-skills/brands/ carries nxt-style and nu-style SKILL.md files that exemplarLoader
 * bundles via ?raw. DECIEM (The Abnormal Beauty Company) is the third brand mode and has no
 * authored exemplar HTML yet, so it reuses the NXT frame geometry and this text carries the
 * token flip. Values come from the brands.ts token set (deciemBrand, mirrored from
 * figma-tokens.json `DECIEM`, PPTX-sourced); the live set is /api/design-tokens?brand=DECIEM.
 * Keep this file in the same editorial shape as the nu-style skill: voice, tokens, anti-patterns.
 */
import { getBrand } from '../../components/slideTemplates/brands';

function buildDeciemBrandStyle(): string {
    const b = getBrand('deciem');
    const hex = (v: string) => (v.startsWith('#') ? v : `#${v}`);
    return [
        '# DECIEM brand style (The Abnormal Beauty Company)',
        '',
        'The exemplar HTML supplies the frame geometry (grid, bands, 1920x1080 canvas). Repaint it with the',
        'DECIEM token set below; do not keep NXT chartreuse, teal, the left rail or the dot mark.',
        '',
        '## Tokens (fallback values; the live set is /api/design-tokens?brand=DECIEM)',
        `- ink / headlines / dark canvases: ${hex(b.INK)} (pure black). Body text ${hex(b.BODY)}.`,
        `- paper: ${hex(b.WHITE)}; neutral panel ${hex(b.PANEL)}; hairline rules ${hex(b.RULE)} at 1px.`,
        `- accent (pink pop): ${hex(b.CHARTREUSE)}; cyan pop ${hex(b.CYAN)}; purple pop ${hex(b.GOLD_ACCENT)}; orange warn ${hex(b.RUST)}.`,
        `- warn wash ${hex(b.WASH_WARN)}; cool wash ${hex(b.WASH_COOL)}; meta grey ${hex(b.GREY)}.`,
        `- display + headlines: ${b.FONT_DISPLAY} ${b.TITLE_WEIGHT} UPPERCASE; body: ${b.FONT_BODY}; labels / meta / mono: ${b.FONT_MONO}.`,
        '- geometry: radius 0, thin line-art, no gradients, no shadows, no rail, no dot mark.',
        '- lockup: a thin-bordered box with "THE ABNORMAL BEAUTY COMPANY." over "DECIEM", white on black canvases, black on paper.',
        '- root attribute: data-brand="deciem".',
        '',
        '## Voice',
        '- Direct, plain-spoken, product-literal. Name the formulation, the channel, the customer, the mechanism.',
        '- No marketing language. Headlines are short uppercase judgments, not topic labels.',
        '',
        '## Anti-patterns',
        '- Do not invent token values; use the list above or the live token feed.',
        '- Pops are accents on white or black surfaces; one pop per block, never a rainbow of all five.',
        '- Quotes must be verbatim from the corpus and attributed to a named source.',
        '',
    ].join('\n');
}

export const DECIEM_BRAND_STYLE_SKILL: string = buildDeciemBrandStyle();
