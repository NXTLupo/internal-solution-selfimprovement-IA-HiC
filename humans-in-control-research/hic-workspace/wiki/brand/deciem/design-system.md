---
id: brand/deciem/design-system.md
title: DECIEM Design System (deliverable artifacts, template-sourced)
type: brand
updated: 2026-10-01
---

# DECIEM brand mode (`#deciem`)

DECIEM (The Abnormal Beauty Company) is the third brand mode next to NXT and NU. Unlike those two,
it is not a Figma mode: its tokens, fonts and page art were extracted on 2026-10-01 from the
DECIEM PowerPoint template (`docs/DECIEM-AIStratPresentation.pptx`, template slides 11 to 51; the
ten content slides were excluded). The runtime reads the extraction, never the deck:

- Tokens: `hic-workspace/design-system/figma-tokens.json` block `DECIEM`, served at
  `/api/design-tokens?brand=DECIEM` (json and `format=prompt`).
- Template assets: `hic-workspace/design-system/deciem/` (`deciem-template.pptx` with the 34
  layouts and zero slides, `layout-assets.json`, `layoutNN-*-background.jpg`, `layoutNN-*-logo.png`),
  served at `/api/design-assets/deciem/<file>`.
- Brand registry: `components/slideTemplates/brands.ts` (`deciemBrand`, `getBrand('deciem')`,
  `getBrandArt('deciem')`, `normalizeBrandId`).

Any deliverable hashtag accepts the modifier: `#slides #deciem`, `#personas #deciem`,
`#report #deciem`, `#prd #deciem`, `#presentation #deciem`, `#proto #deciem`. The hashtag is
authoritative; the parser stamps `brand=deciem` on every slide fence.

## Color tokens

| role | value | template origin |
|---|---|---|
| rail / ink / dark surface / band | `#000000` | title and section canvases |
| paper | `#FFFFFF` | body slides |
| accent (primary) | `#FB48C4` pink | blob backgrounds, 8_Custom title page |
| cyan (cool) | `#00FACC` | 6_Custom title page, blob backgrounds |
| purple (source / premium) | `#8A69D4` | 7_Custom title page, headline pops |
| orange (warn) | `#FF6C2F` | 9_Custom title page, blob backgrounds |
| yellow (highlight) | `#FFE900` | 23 / 24_Custom backgrounds |
| on-accent text | `#000000` | black type on cyan and pink |
| panel / ecru | `#F4F4F4` | table shading |
| hairline | `#E3E3E3` | thin rules |
| grey (meta) | `#6B6B6B` | captions |

## Font roles

- Display and action titles: Poppins Bold (700), UPPERCASE. Template headline sizes run 18, 44 and
  88 pt; the shared type scale applies, the transform is the brand's `title-transform` token.
- Body: Josefin Sans 400 (12 to 14 pt in the template).
- Labels and kickers: Poppins Bold uppercase small (the template sets every label in Poppins Bold). Tables, data cells, source lines and meta: Nunito (the template's table face, headers 18 pt bold, cells 12 pt). Questrial is embedded in the template but appears once, so it is available and not a role.
- The lockup is typeset, never a raster: a thin white-bordered box with "THE ABNORMAL BEAUTY
  COMPANY." (bold) over "DECIEM" (regular). PNG references of the template's lockup sit next to the
  backgrounds for comparison only.

## Page anatomy (what the renderers do)

- Cover: black canvas, giant uppercase title lower-left, lockup box top-right.
- Section divider: one solid pop fill, rotating cyan (black text), purple, pink, orange (white text),
  or black; chosen deterministically from the slide title so preview and export agree.
- Thesis and agenda: black canvas, white type.
- Body slides: white paper, one corner line-art background from `art.bodyBackgrounds` (pink, purple,
  orange, cyan, yellow blobs with thin product doodles), rotated so consecutive slides differ, text
  kept clear of the art corners.
- No left rail, no 3x3 dot mark, no colored takeaway band, border radius 0.
- Sub-brand photo backgrounds (The Ordinary, NIOD, Hylamide) are used only when the slide is about
  that sub-brand.

## Export

The native PPTX exporter (`proxy/gold_pptx_export.py`) builds a `#deciem` deck from
`deciem-template.pptx`, so the exported file carries the template master, theme and layouts, and
embeds Poppins, Josefin Sans and Nunito (plus Questrial when used) from `proxy/fonts/static/` (`proxy/brand_fonts.py`).

## Refresh procedure

When the DECIEM template changes: re-run the extraction into `design-system/deciem/`, regenerate the
`DECIEM` token block, bump `_DIAGRAM_STYLE_VERSION` in `proxy/app.py`, rebuild the
proxy and the SPA. Never hand-edit a hex or font name in code or in this page.
