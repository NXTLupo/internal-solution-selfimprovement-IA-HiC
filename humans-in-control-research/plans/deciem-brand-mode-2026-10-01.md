# DECIEM brand mode: `#deciem` on every deliverable (2026-10-01)

Owner directive (2026-10-01): add the DECIEM PowerPoint template as a brand, extracting the template
slides only (not the ten content slides), and apply its template, fonts and image slots whenever a
deliverable hashtag carries `#deciem`, following the same logic as `#NXT` and `#NU`; every pathway
must work.

Unified Vision phases advanced: (8) every page componentized and tokenized (a third token mode, no
hardcoded values), (9) native editable PPTX from every path (the export builds on the template file).
Doctrine: brand is a token-set flip on one component set; the SPA never reads the deck at runtime.

## Status

| step | state |
|---|---|
| Template dissected (13.33x7.5 in, 1 master, 34 layouts, slides 11-51 are the template) | done |
| Assets extracted to `hic-workspace/design-system/deciem/` (template pptx with 0 slides, backgrounds, logos, layout-assets.json) | done |
| Fonts downloaded to `proxy/fonts/static/` (Poppins, Josefin Sans, Questrial, Nunito) | done |
| `figma-tokens.json` block `DECIEM` (color, font, space, type, radius, logo, art) | done |
| `brands.ts`: `BrandId` adds `deciem`, `deciemBrand`, `normalizeBrandId`, `brandVariantOfId`, `getBrandArt`; `types.ts` TOKENS gain `TITLE_TRANSFORM`, `BRAND_LOGO_LOCKUP`; hydrate accepts DECIEM; `index.tsx` hydrates it at boot | done |
| `hashtagParser.brandVariantOf` (one resolver for presentation / proto / HTML directives); `presentationTypes.BrandVariant` + `BRAND_TOKENS.DECIEM` | done |
| Proxy: `/api/design-tokens?brand=DECIEM`, `/api/design-assets/deciem/*`, brand_fonts manifest, diagram palette (Poppins label slot), PPTX export from the template (font parts stripped and re-embedded once), brand-aware photo prompt + `brandHint` on `/api/ai/illustration`; 30 offline tests | done, container rebuild pending |
| Renderers: stage twin, preview twin, legacy pptx, slide composer, gold artifact, imagery resolvers (round 1: lockup, art, no rail; 139 tests + parity PASS) | done; round 2 (deck-order rotation, art safe zones, canvas mix, bold titles) in progress |
| Analyst chat: corpusChatService protocol + token injection, CorpusChatPanel, catalog modifier, #help registry, PRD family, HTML renderers (84 tests) | done |
| Design desk, narrative composer, presentation renderer (:5014), proto pipeline, exemplar curator, skill docs (54 tests, renderer tsc clean) | done |
| tsc + vitest + check:templates + check:orphans | pending |
| Rebuild research-generator + research-proxy (+ presentation-renderer) | pending |
| Live smoke: `#slides #deciem`, `#personas #deciem`, `#report #deciem`, PPTX export opened and inspected | pending |

## Measured font roles (owner check 2026-10-01: "make sure you are using their correct fonts")

Run counts over template slides 11-51: Poppins Bold is every title, subtitle and label (88 / 44 / 32 / 18 /
16 / 14 pt, always bold, always uppercase); Josefin Sans is body (10 to 16 pt); Nunito is the table face
(headers 18 pt bold, cells 12 pt); Questrial appears once (a product label) and Century Gothic is embedded
but unused; the theme's Arial applies to placeholders only. Mapping: `font.display` / `font.title` /
`font.label` = Poppins (700, uppercase), `font.body` = Josefin Sans, `font.mono` / `font.table` = Nunito.
TOKENS gained `FONT_LABEL` (empty for NXT / NU, which keep labels on the mono face) and the hydrate stashes
per-brand `TYPE_SCALE` / `TYPE_WEIGHT` / `TYPE_TRACK` while only the NXT feed mutates the global tables.

## Variation and imagery (owner directives 2026-10-01)

Variation: body art rotates by deck position (stride 5 over the 12 corner-art backgrounds, so consecutive
slides differ in art and pop color), dividers rotate the four pop fills by ordinal, black is reserved for
cover / thesis / agenda / block-quote, tables take a black header row with Nunito cells, stat numerals rotate
the pops. Imagery: the photo lane prompt is brand-aware (DECIEM = high-key studio photography on white,
pure black ground under the cover, clean studio portraits); the line-art lane already draws a black
continuous line with pink / cyan blobs on paper (the template's own doodle language); a body slide with any
filled imagery slot carries no corner art; the SPA's `brandImageryHint` now reaches the proxy prompt.

## Contract

- Brand ids: `nxt | nu | deciem` (lower, token objects); directive variants `NXT | NU | DECIEM`.
- Hashtag: `#deciem` (case-insensitive, possessive-tolerant), a modifier on any deliverable hashtag.
- Tokens: `GET /api/design-tokens?brand=DECIEM`; art and template paths inside the block.
- Assets: `GET /api/design-assets/deciem/<file>` (allow-listed filenames only).
- Export: stage HTML carries `data-brand="deciem"`; the exporter opens `deciem-template.pptx`.

## Verification bar

A pathway counts as working when: the parser returns the brand, the slide fences carry
`brand=deciem`, the stage twin and the preview twin paint Poppins uppercase titles on the template
canvases with no rail or dot mark, the HTML artifact styles from the DECIEM tokens, and the PPTX
export opens with the template master and embedded fonts. Report what was inspected, not what built.

## Also in this tranche: #prd compile truncation (live audit)

The first live `#prd` compile stopped at `max_tokens` (32K, of which 9.8K thinking) and the chat
showed "model output is not a JSON object". Fix: `_runGen` in `CorpusChatPanel` takes `maxTokens`
and `continueOnTruncation`; the PRD compile asks for 96K and, on a length stop from any provider,
requests a continuation turn (prior assistant turn + user turn, never a prefill) up to three rounds
inside one `emitDeliverable`, so trace and AIR carry the whole document. `prdCompiler.extractJsonObject`
now names a truncated object explicitly. The live PRD still has to be read against the ten-item
rubric after the rebuild.
