---
id: design-system/gold-visual-language.md
chunks:
  - id: "design-system/gold-visual-language.md#c0"
    char_span: [0, 370]
    sentence_count: 5
    key_terms: [isqhavm7si4qhawb7y9c2z, z2v9pvhg23hlljeitpbdat, brands, values, figma-node-map, deliverable, identical, geometry]
    token_count: 117
  - id: "design-system/gold-visual-language.md#c1"
    char_span: [408, 1433]
    sentence_count: 8
    key_terms: [line-height, color, tracking, source, mono, rail, uppercase, semibold]
    section: Shared anatomy (every GOLD page)
    token_count: 337
  - id: "design-system/gold-visual-language.md#c2"
    char_span: [1452, 2056]
    sentence_count: 1
    key_terms: [archivo, accent, c8102e, band, face, mono, b8b800, ddddd6]
    section: Brand tokens
    token_count: 250
  - id: "design-system/gold-visual-language.md#c3"
    char_span: [2094, 3901]
    sentence_count: 11
    key_terms: [body, title, weight, hero, numerals, kicker, labels, label]
    section: Typographic system (2026-06-14)
    token_count: 505
  - id: "design-system/gold-visual-language.md#c4"
    char_span: [3903, 4774]
    sentence_count: 4
    key_terms: [continuation, never, artifacts, layout, floor, slide, competitive-matrix, service-blueprint]
    section: Typographic system (2026-06-14)
    token_count: 200
  - id: "design-system/gold-visual-language.md#c5"
    char_span: [4810, 5996]
    sentence_count: 4
    key_terms: [label, quote, justify-between, column, source, figma, panel, qualitative]
    section: Case-study deep-dive variants
    token_count: 337
  - id: "design-system/gold-visual-language.md#c6"
    char_span: [6043, 6728]
    sentence_count: 1
    key_terms: [slidetemplates, components, design-system, gold, services, nxt-visual-renderer, twin, slidetostagehtml]
    section: "Code twins (keep in sync, in this order)"
    token_count: 195
  - id: "design-system/gold-visual-language.md#c7"
    char_span: [6770, 7763]
    sentence_count: 6
    key_terms: [dense, density, ceilings, per-template, item, preview, export, raises]
    section: Universal density axis (2026-06-10)
    token_count: 235
---
# GOLD Visual Language

The deliverable design system both brands share. Source of truth: the live Figma files
(NXT `iSQhAVM7SI4QHAWB7y9C2z`, NU `z2v9Pvhg23hlljEitPBdAt`); see brand/figma-node-map.
Geometry is IDENTICAL across brands; only tokens change. All values below are the
1920x1080 frame values. The web preview renders the same anatomy at 960x540 (divide by 2).

## Shared anatomy (every GOLD page)

| Element | Spec |
|---|---|
| Canvas | 1920x1080, paper white |
| Rail | 92px full-height left bar, color/rail |
| Dot mark | 3x3 grid of 12px squares, 6px gap, at (30, 990) inside the rail, color/accent |
| Wordmark | top-right (y about 50, right margin 80) |
| Content column | x 172, width 1660, from y 58 |
| Kicker | IBM Plex Mono SemiBold 19px, 6px tracking, uppercase, color/kicker. Pattern: "CASE STUDY · SUBJECT" |
| Action title | 46px, max-width 1400. NXT: Archivo SemiBold, line-height 1.08, tracking -0.5. NU: Lora Medium, line-height 1.12 |
| Meta row | IBM Plex Mono Medium 14px, 1px tracking, line-height 1.6, color/grey, uppercase. Pattern: "PROFILE · ... TIMEFRAME x INVESTMENT y" |
| Hairline | 1px, #DDDDD6, full content width |
| Takeaway band | x 172, y 944, w 1568, min-height 96, padding 28/48. ONE bold phrase or sentence in the title face at 23px, line-height 1.48. NO eyebrow microlabels |
| Sources | inline SOURCE: lines in mono 12-12.5px at color/source accent; NEVER a per-slide source strip |

## Brand tokens

| Token | NXT | NU |
|---|---|---|
| rail | #0D0D0D | #0E1626 |
| ink | #141414 | #16233C |
| accent (dots, band NXT) | #B8B800 | #C8102E |
| kicker | #00B7C3 cyan | #C8102E red |
| warn accent / wash | #CC6644 / #FAF1EC | #C8102E / #FAEDED |
| cool accent / wash | #00B7C3 / #EBF7F8 | #1D6E64 / #EDF7F5 |
| band / band text | #B8B800 / #0D0D0D | #16233C / #FFFFFF |
| grey (meta, labels) | #73757A | #73757A |
| hairline | #DDDDD6 | #DDDDD6 |
| title face | Archivo SemiBold | Lora Medium |
| body face | Archivo | Archivo |
| mono face | IBM Plex Mono | IBM Plex Mono |
| numerals | Bebas Neue | Lora |

## Typographic system (2026-06-14)

Source of truth: the Brand Tokens `type/*`, `track/*`, `space/scale-*` variables in
both Figma files (NXT 221:2, NU 95:2), serialized to figma-tokens.json `type` and
streamed via /api/design-tokens. Replaces the ~45 ad-hoc sizes / all-8-weights muddle
the 2026-06-14 real-PPTX audit found (titles out-ranked by hero numerals; text at 5.5pt).
All values are 1920-space stage px; web preview and PPTX render at half.

### Modular scale (content-dense, minor-third body band, hard jump to title)
label 15 | caption 17 | body 21 | lead 25 | name 30 | subhead 36 | title 46 | display 60.
Body 21 is the reading floor; 17 is the HARD minimum any text may render (below it,
overflow to a continuation slide, never shrink). display is the section-divider numeral only.

### Weight ladder (3 weights; weight encodes importance)
body 400 (body, quotes, hero numerals) | label 500 (labels/meta/mono, always grey) |
title 600 NXT / 700 NU (action title, names, takeaway band). Labels are NEVER heavier
than the content they introduce; they recede via size + grey, not weight.

### Hierarchy doctrine (the prioritization rules)
1. One governing line: the action title is the single largest text on a content slide.
2. Hero cap: hero numerals/words are evidence, set at lead (25) in body weight, and NEVER
   exceed the title. (Fixes the audited stat-row 31>23 and persona 26>23 inversions.)
3. Labels recede: mono, label-weight, grey, sentence-case; UPPERCASE only on the kicker.
4. Tracking (px, uppercase mono only): kicker 4, label 1.5, title NXT -0.5 / NU 0; body 0.
5. Emphasis scarcity: one brand-accent emphasis per slide for the priority datum; structural
   accents (warn=pain, cool=opportunity, kicker) keep their meaning.
6. Measure: body lines cap ~62ch; vertical rhythm on the 4px space scale (xs4..huge64).

### Density tie-break + continuation (locked with the user 2026-06-14)
Content-dense, honoring each artifact's expert dimensions. Keep every evidenced item;
type steps down within the scale to the 17px floor. If items still exceed the floor's
capacity, OVERFLOW to a CONTINUATION slide; never truncate mid-sentence, never shrink
below the floor. Continuation slides use a DIFFERENT but skill-valid layout for diversity:
multi-instance artifacts cycle a VARIANT LADDER (theme: cluster->spotlight->arc->mosaic;
case-study: four-block->before-after->evidence-stack; recommendation: grid->impact-cards->strip);
single-canonical artifacts (org-chart, architecture-map, journey-map, service-blueprint,
systems-inventory, competitive-matrix, gap-matrix) continue on a second slide of the SAME
layout with a "(continued)" eyebrow, same columns, and never split a phase/row group.

## Case-study deep-dive variants

Diversify across a deck; never repeat one layout. Subjects are NAMED real entities.

### before-after (Figma NXT 212:2, NU 91:2)
Two equal panels (gap 26, height about 460-468): warn wash BEFORE panel + cool wash AFTER
panel, each padding 30/32 with mono label 13px/2px tracking, headline 25-26px title face,
three 16.5px bullets with 7px accent squares spread justify-between. 44px grey arrow
between panels. Below: RESULT column (label + 18px text) and a cited-quote column
(4px cool bar, 16.5px quote, SOURCE line 12px).

### evidence-stack (Figma NXT 217:2, NU 93:2)
CONVERGENT EVIDENCE mono label, then a 540px stack (justify-between) of three rows:
4px cool accent bar, verbatim quote 24px line-height 1.34 + SOURCE line 12.5px, and a
440px right column with WHAT IT SHOWS label 11.5px + 16.5px interpretation.

### four-block (learned-constraint layout; not yet a Figma frame)
CHALLENGE / APPROACH / OUTCOME accent-bar blocks left (1.9fr), KEY OUTCOME dark panel
right (1fr): qualitative hero phrase in the title face, supporting stat pairs, COMPARABLES,
and a verbatim pull quote with named SOURCE. Numbers stay qualitative unless inside a
cited quote (Quantitative Claim Rule).

## Code twins (keep in sync, in this order)

1. `components/slideTemplates/types.ts` - CaseStudyData variant payloads + GOLD TOKENS slots
2. `components/slideTemplates/brands.ts` - per-brand token overrides
3. `components/slideTemplates/web.tsx` - GoldFrame + CaseStudySlide (960x540 preview twin)
4. `services/slideToStageHtml.ts` - buildShell + renderCaseStudy (1920x1080 export twin)
5. `services/goldArtifact.ts` - _NXT/_NU_TOKENS + capture font loads
6. `wiki/design-system/gold/case-study-{nxt,nu}.html` - byte-faithful gold twins (fill targets)
7. `hic-workspace/design-system/figma-tokens.json` - the `/api/design-tokens` source
8. `.claude/skills/nxt-visual-renderer/references/web-layouts.md` - the model render contract

## Universal density axis (2026-06-10)

Every template carries a slide-level density: base (default) or dense, declared by the
model on the fence (density=dense), in the slide JSON ("density"), or forced by the
#dense hashtag. Dense raises per-template item ceilings (shared DENSITY_SPEC in
components/slideTemplates/types.ts) and renderers adapt type size to the ACTUAL item
count, in BOTH twins: the 960x540 web preview and the 1920x1080 PPTX stage renderer
(services/slideToStageHtml.ts), so dense slides export to PPTX without overflow.
Density raises ceilings, not floors: every added item must be evidenced. Web preview
clamps a few ceilings below the stage twin (its canvas is 540px tall); the export is
the full-fidelity dense surface. The model emits dense when the user asks for more
detail, more lines, more quotes, or modifies a prior generation to add items beyond
the base ceiling. Per-template ceilings live in the render contract
(.claude/skills/nxt-visual-renderer/references/web-layouts.md, UNIVERSAL DENSITY AXIS).
