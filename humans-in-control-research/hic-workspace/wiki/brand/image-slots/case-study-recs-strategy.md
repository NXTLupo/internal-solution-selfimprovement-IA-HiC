---
id: brand/image-slots/case-study-recs-strategy.md
title: Image Slots — case-study / recommendations / strategy
type: brand
updated: 2026-06-17
chunks:
  - id: "brand/image-slots/case-study-recs-strategy.md#c0"
    char_span: [0, 1709]
    sentence_count: 3
    key_terms: [strategy, thumbnail, light, recommendations, answer, slots, nxt, components]
    concepts: [strategy, thumbnail, light, recommendations, answer]
    token_count: 472
  - id: "brand/image-slots/case-study-recs-strategy.md#c1"
    char_span: [1730, 2606]
    sentence_count: 8
    key_terms: [column, takeaway, dashed-cyan, band, stripped, verified, implementation-sequence, placed]
    concepts: [column, takeaway, dashed-cyan, stripped, verified]
    section: Treatment notes
    token_count: 232
  - id: "brand/image-slots/case-study-recs-strategy.md#c2"
    char_span: [2651, 4498]
    sentence_count: 11
    key_terms: [case-study, row, comparison, content-complete, takeaway, band, recommendations, collision-free]
    concepts: [case-study, content-complete, comparison, takeaway, recommendations]
    section: Deliberately left image-free (and why)
    token_count: 512
  - id: "brand/image-slots/case-study-recs-strategy.md#c3"
    char_span: [4253, 4789]
    sentence_count: 6
    key_terms: [band, twin, content-complete, export-substrate, supporting-image, coherent-action, recommendations, collision-free]
    section: Deliberately left image-free (and why)
    token_count: 144
---
# Image Slots — case-study (184:159), recommendations (66:2), strategy (148:159)

Blank `img-slot` placeholders placed into NXT GOLD components for the `illustrator` agent to
fill later. Only NXT components were edited (no `· NU` twins on these pages; NU inherits via mode).
All slots are transparent FRAMEs (fills=[], strokes=[]) with `nxt` shared-plugin-data metadata.

| archetype | node id | kind | ground | bounds (x,y,w,h) | imgElement | scene concept |
|---|---|---|---|---|---|---|
| strategy · 604:2 (5 coherent actions) | 678:5512 | thumbnail | light | 268,944,104,92 | 01 Deflect | A self-serve answer path resolving the easy questions before they reach an agent |
| strategy · 604:2 | 678:5513 | thumbnail | light | 609,944,104,92 | 02 Route by intent | A ticket routed by intent straight to the right specialist, no reassignment |
| strategy · 604:2 | 678:5514 | thumbnail | light | 950,944,104,92 | 03 Surface answer | A knowledge answer surfaced at the moment of need, ranked by relevance and freshness |
| strategy · 604:2 | 678:5515 | thumbnail | light | 1292,944,104,92 | 04 Resolve in one contact | One named owner carrying a single thread to resolution in one contact |
| strategy · 604:2 | 678:5516 | thumbnail | light | 1633,944,104,92 | 05 Close the loop | A recurring complaint routed back to the product team that owns the fix |
| recommendations · 597:4 (recommendation detail) | 678:5526 | panel | light | 1242,2006,560,140 | — | Intent-based routing sending each ticket straight to the right specialist, the queue replaced by a sorting path |

Bounds are page-absolute (x,y of the slot's top-left, with w,h). imgAspect: thumbnails 1.13, panel 4.00.
imgOptional = true on all slots.

## Treatment notes

- **strategy 604:2** — PER-ELEMENT MATRIX (5 parallel coherent-action columns). Placed one square-ish
  thumbnail per column in the clear band below each column's "ADDRESSES X / signal-dot" footer row and
  above the takeaway band (column content ends ~y906; takeaway top y1064). Thumbnails are centered on the
  five column x-axes (319, 660, 1001, 1343, 1684) — a table row, not an overlay. Matches the journey
  595:2 phase-thumbnail pattern. Verified dashed-cyan then stripped to blank.
- **recommendations 597:4** — SINGLE deep-dive. The right RISKS / EXPECTED IMPACT column (h=370) is
  shorter than the left implementation-sequence column (h=549), leaving an empty bottom-right quadrant
  (right col ends ~y1982, grid bottom y2161). Placed one supporting `panel` there, clear of the quote
  above and the takeaway band below. Verified dashed-cyan then stripped to blank.

## Deliberately left image-free (and why)

- **case-study 184:159 — 588:4 (01 overview, 3-case matrix)** — dense 3-column comparison running
  full-height down to the cross-case comparison axis (y788) + axis row (ends y876); the only band before
  the takeaway (y944) is ~68px. A thumbnail row would collide with the comparison axis or require
  invasive restructuring. Content-complete; the comparison IS the design.
- **case-study 184:159 — 588:5 (02 Zappos detail)** — single deep-dive; left prose + right KEY OUTCOME
  panel both fill the 560px case-body row to y2172; only a ~92px full-width band remains above the
  takeaway. No clean, sizeable, collision-free zone.
- **case-study 184:159 — 585:2 (before-after Amazon)** — before/after panels fill the row; the center
  column is occupied by the transition arrow, the lower rows by RESULT + quote. Dense; no clean zone.
- **case-study 184:159 — 588:6 (04 Stripe convergent-evidence)** — four full-width evidence rows
  (quote left, WHAT IT SHOWS right). The visible mid-slide whitespace is intra-row gap, not a continuous
  placeable column; an image there would cross the row dividers. Content-complete dense table.
- **case-study 184:159 — 588:7 (05 Zappos four-block)** — left four prose blocks + right dark KEY OUTCOME
  panel; content frame fills to y932 against a takeaway at y944 (almost no gap). Densest slide; no image.
- **case-study 184:159 — 619:2 (Brand/Logo masthead)** — a 156x44 logo component, not a slide.
- **recommendations 66:2 — 597:2 (overview, 4+2 matrix)** — six numbered moves (4-up row + 2 bets row)
  pack the canvas to y1027 against a takeaway at y1064 (~37px band). Mid-slide gaps under the shorter
  columns are immediately followed by the NON-OBVIOUS BETS label. No collision-free band for six
  thumbnails. Content-complete.
- **recommendations 66:2 — 597:3 (PPTX TWIN)** — export-substrate twin, not an authored GOLD slide.
- **strategy 148:159 — 604:3 (02 coherent-action detail)** — single deep-dive; left four action blocks
  (1114w) and right guardrail panel (520w) both full-bleed the 670px content height. The only gap is a
  thin band under the title. No clean supporting-image zone.
