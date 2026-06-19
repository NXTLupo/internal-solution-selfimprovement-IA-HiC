---
title: Image Slots — roadmap / org / themes / service-blueprint / brief / explainer (NXT)
type: brand
updated: 2026-06-17
---

# Image Slots placed (NXT GOLD components)

File `iSQhAVM7SI4QHAWB7y9C2z`. Slots are blank transparent FRAMEs nested INSIDE the archetype
COMPONENT (so the NU mode twin inherits them). Metadata on `setSharedPluginData('nxt', …)`.
The `illustrator` agent fills these later; the slot itself has no aesthetic.

| archetype | node id | kind | ground | bounds (x,y,w,h) | imgElement | scene concept |
|---|---|---|---|---|---|---|
| roadmap · NOW horizon detail (599:3) | 290:50 | panel | dark | 1338,1966,468,320 | NOW | the NOW horizon as a load-bearing foundation: a stable base layer with lighter strata (data, then models, then agents) stacking upward, conveying later layers depend on this groundwork |
| explainer · concept anatomy (614:4) | 678:5500 | thumbnail | light | child of card 305:120 (150x150) | ACKNOWLEDGE | recovery stage ACKNOWLEDGE: org signals it already knows about the failure before the customer reports it; an early outbound signal reaching a person |
| explainer · concept anatomy (614:4) | 678:5501 | thumbnail | light | child of card 305:124 (150x150) | OWN | recovery stage OWN: a single named owner carries the case end to end; one unbroken thread, no handoffs that reset trust |
| explainer · concept anatomy (614:4) | 678:5502 | thumbnail | light | child of card 305:128 (150x150) | CLOSE THE LOOP | recovery stage CLOSE THE LOOP: a personal follow-up that closes the loop; a returning loop completing, proving the customer was a person not a ticket |
| themes · theme detail (590:11) | 678:5522 | panel | light | child of right col 179:134 (620x150) | convergence | convergent evidence: three independent sources (customers, agents, tickets) pointing to one shared pattern; separate strands converging to a single line |

## Deliberately left image-free (and why)

- **roadmap · overview NOW/NEXT/LATER (599:2)** — three parallel horizon columns are text-dense to the takeaway band; no clear horizontal gap for a thumbnail row without colliding with the MEASURE / DONE WHEN blocks. Content-complete; clean columns are the design.
- **org · structure (610:2)** — dense 3-tier node matrix (DECIDES/DIRECTS/DELIVERS) with reporting lines connecting tiers. Per-node glyphs would compete with the connector-line geometry and read as decoration on a structural diagram. Conservative call: image-free.
- **themes · overview (590:9)** — four parallel theme columns already carry title + tag + body + verbatim quote + chips + signal line. The gap above the takeaway band is too short (~90px) for a 150px thumbnail row; forcing it collides. Dense evidence grid; image-free.
- **themes · theme-arc (590:12)** — four chained cards with horizontal connector ARROWS passing through each card's empty middle (~y415). A centered thumbnail would cross the arrows (HARD graphic-collision ban). Chain breathing room is intentional; image-free.
- **themes · theme-mosaic (590:13)** — 2x2 co-equal grid; each quadrant's empty band sits between body and verbatim quote (thin). A thumbnail would crowd the quote. Content-complete; image-free.
- **service-blueprint (608:2)** — dense 5-phase x multi-lane Bitner matrix with the emotion curve + LINE OF INTERACTION / VISIBILITY / INTERNAL dividers, packed edge to edge. The matrix IS the body; any image collides. Image-free.
- **service-blueprint · T2 auto-layout substrate (608:4)** — dense 5-phase x 5-lane matrix, fully packed with the LINE OF VISIBILITY divider. No empty zone; image-free.
- **brief · engagement brief (614:3)** — left SCQA panels + right dark IN SCOPE / OUT OF SCOPE / DELIVERABLES panel both carry real content; no single clean hero zone exists without displacing content. The SCQA panels are a sequence, not parallel elements warranting thumbnails. Image-free.

## Notes
- PPTX TWIN components (590:10, 608:3) were NOT touched (export substrate, not GOLD canvas).
- Journey page 75:2 / 595:2 NOT touched (owned by another agent; 595:2 used read-only as the slot-pattern reference: 150x150 per-element thumbnails).
- All slots ship blank (fills=[], strokes=[], dashPattern=[]) and live inside the COMPONENT so the NU 535:0 mode twin inherits them automatically.
