---
id: brand/image-slots/gap-audit-arch-prd.md
title: Image Slots — gap, tech-audit, tech-architecture, prd (NXT)
type: brand
updated: 2026-06-17
chunks:
  - id: "brand/image-slots/gap-audit-arch-prd.md#c0"
    char_span: [0, 440]
    sentence_count: 4
    key_terms: [slots, nxt, shared-plugin-data, tech-architecture, fill, gold, component-local, illustrator]
    concepts: [slots]
    token_count: 114
  - id: "brand/image-slots/gap-audit-arch-prd.md#c1"
    char_span: [442, 2255]
    sentence_count: 1
    key_terms: [gold, nxt, milestones, thumbnail, light, prd, empty, band]
    concepts: [milestones, thumbnail, light, empty, request]
    token_count: 484
  - id: "brand/image-slots/gap-audit-arch-prd.md#c2"
    char_span: [2300, 4028]
    sentence_count: 11
    key_terms: [nxt, content-complete, gold, requirements, column, band, takeaway, left]
    concepts: [content-complete, requirements, column, takeaway, image-free]
    section: Components deliberately left image-free
    token_count: 428
---
# Image Slots — gap / tech-audit / tech-architecture / prd (NXT GOLD)

Placed blank `img-slot` frames (transparent, no fill/stroke) nested inside the NXT GOLD components
on these four pages, for the `illustrator` agent to fill later. NU mode twins inherit. All bounds are
component-local (px). All slots carry `nxt` shared-plugin-data (`imgRole`, `imgGround`, `imgAspect`,
`imgKind`, `imgOptional`, plus `imgElement` for per-element slots).

| archetype | node id | kind | ground | bounds (x,y,w,h) | imgElement | scene concept |
|---|---|---|---|---|---|---|
| GOLD · tech-audit (nxt) · 02 risk detail (one system) — system-panel | 678:5466 | panel | dark | 1370,587,404,208 | — | A single shared knowledge base every support surface quietly depends on: one stack of articles feeding chat, agent console, help center and error states, with a freshness signal pulsing through |
| GOLD · prd (nxt) · 04 milestones — M1 card empty band | 678:5488 | thumbnail | light | 298,389,150,110 | M1 answer-in-error pilot | An answer surface lighting up inside an error state: a pilot pod sees a matching help article appear in place, with a flag to mark it stale |
| GOLD · prd (nxt) · 04 milestones — M2 card empty band | 678:5489 | thumbnail | light | 718,389,150,110 | M2 intent routing live | A ticket choosing its own path: detected intent steering a request ahead of a manual dropdown, sorting the highest-volume reason to the right lane first |
| GOLD · prd (nxt) · 04 milestones — M3 card empty band | 678:5490 | thumbnail | light | 1137,389,150,110 | M3 queue transparency | A wait made visible: a queue showing position and an expected response window, holding steady even as volume spikes |
| GOLD · prd (nxt) · 04 milestones — M4 card empty band | 678:5491 | thumbnail | light | 1557,389,150,110 | M4 defect loop closed | A loop closing: clustered repeat contacts flowing automatically into a backlog item with its tickets attached, so the cause gets fixed |
| GOLD · prd (nxt) · 02 story detail — lower-right free zone | 678:5492 | panel | light | 1152,712,680,150 | — | Routing a request by what it means rather than where it landed: one ticket carrying its full context to the right specialist the first time, so the customer never repeats the story |

## Components deliberately left image-free

- **GOLD · gap (nxt)** `598:2` — Content-complete 4-column gap matrix (01-04). Each column runs full-height
  (number, title, maturity bar, prose, evidence quote, source) down to the full-width takeaway band; no
  vertical room for a thumbnail band without growing the component or cutting real content. The dark left
  rail already carries the chartreuse dot-mark glyph. Rule 4: clean data is the design.
- **GOLD · tech-audit (nxt)** `605:2` — Dense 6-system × 4-column flow table that fills the canvas to the
  takeaway band, no parallel-element gaps. Rule 4: no image.
- **GOLD · tech-architecture (nxt)** `606:2` — Layered node diagram (PEOPLE / APPLICATIONS / SYSTEMS OF
  RECORD), 3 tiers × 3 nodes wired with connectors and a legend. Content-complete and collision-sensitive
  (per-layer thumbnails would cross the inter-tier connector arrows, violating the graphic-collision ban).
  Left image-free rather than risk overlap.
- **GOLD · prd (nxt) · 01 user stories** `607:2` — Content-complete 5-column user-story matrix (story,
  acceptance, success metric, traces) filling the canvas to the takeaway band. No room. Rule 4: no image.
- **GOLD · prd (nxt) · 03 requirements** `607:4` — Three requirements cards (functional / non-functional /
  out-of-scope). Card bodies are intentionally airy lists; one lone thumbnail would read lopsided and
  thumbnails on all three would force imagery onto a clean requirements list (the slop the rules warn
  against). Left image-free.

## Notes
- `· NU` components skipped throughout — NU mode twins inherit the slot from the NXT component.
- Every placement verified with a temp dashed-cyan stroke + screenshot, confirmed clear of text / cells /
  footer, then stripped to blank.
