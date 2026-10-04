/**
 * brandPalette - the ONE palette lookup for the Design Desk viewers (2026-10-01).
 *
 * DESIGN.md (runtime config, never delete) carries `brands.nxt` and `brands.nu` palettes. The
 * third brand mode, DECIEM (`#deciem`), is not in DESIGN.md, so every `tokens.brands[brand]`
 * read used to resolve to undefined (a crash in OrgChartNode / NxtDocViewer) or quietly fell
 * to NXT. This helper resolves DESIGN.md first and otherwise derives the palette from the
 * brands.ts token set (components/slideTemplates/brands.ts), the same source the slide twins
 * and the PPTX exporter read. 'deciem' never falls to NXT.
 */
import type { DesignTokens } from './designMdLoader';
import { getBrand, normalizeBrandId } from '../../components/slideTemplates/brands';

export type DesignDeskPalette = Record<string, string>;

const hex = (v: string | undefined, fallback: string): string => {
    const s = (v || '').trim();
    if (!s) return fallback;
    return s.startsWith('#') ? s : `#${s}`;
};

/** Palette derived from the brands.ts token set, in DESIGN.md's key shape. */
export function paletteFromBrandTokens(brand: unknown): DesignDeskPalette {
    const b = getBrand(normalizeBrandId(brand));
    return {
        primary: hex(b.INK, '#0D0D0D'),
        surface: hex(b.WHITE, '#FFFFFF'),
        panel: hex(b.PANEL, '#FAFAFA'),
        accent: hex(b.CHARTREUSE, '#B8B800'),
        secondary: hex(b.CYAN, '#00B7C3'),
        negative: hex(b.RUST, '#CC6644'),
        teal: hex(b.TEAL, '#115054'),
    };
}

/**
 * DESIGN.md palette when it names the brand (nxt / nu today), otherwise the brands.ts
 * derivation (deciem today, and any brand DESIGN.md lags behind on).
 */
export function paletteFor(tokens: DesignTokens | null | undefined, brand: unknown): DesignDeskPalette {
    const id = normalizeBrandId(brand);
    const fromDesignMd = tokens?.brands?.[id] as Record<string, string | number> | undefined;
    if (fromDesignMd && typeof fromDesignMd.primary === 'string') {
        return fromDesignMd as DesignDeskPalette;
    }
    return paletteFromBrandTokens(id);
}
