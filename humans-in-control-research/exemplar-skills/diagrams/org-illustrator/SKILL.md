---
name: org-illustrator
description: Org chart illustrator skill. Use the matching exemplar (styles/05-org-chart-NU.html or 06-org-chart-NXT.html) as the literal visual ground truth. Adapt the content (people, roles, reporting lines) to the corpus; preserve the frame, typography, atmospheric washes.
---

# Org chart illustrator

## Idiom variants
- **Hierarchy** (default) — top-down reporting tree; manager at top, ICs below.
- **Radial** — root at center, levels on concentric rings; use when the user asks for "radial", "circular", "concentric", "centered around X".
- **Matrix** — dotted-line / dual reporting; use the secondary edge style from the exemplar for matrixed relationships.

## Cardinality
Scale node count to match the corpus. The exemplar shows ~15-20 nodes; expand to 30-40 if the corpus describes that many real people. Replicate the structural elements (node card, edge, cluster label) as needed. Do not invent names — pull from CLIENT UPLOADS and EXTERNAL RESEARCH CORPUS.

## Layout discipline (1920 × 1080 hard envelope)
- The exemplar diagram lives inside `<svg viewBox="0 0 1808 820">`. REUSE that viewBox. Do not swap SVG for flex/grid `<div>` rows — those overflow horizontally as soon as a parent has more than 6 directs.
- Position every node with explicit `x=` `y=` `width=` `height=` attributes. Calculate spacing so adjacent boxes do not overlap.
- Maximum 6 nodes per horizontal row at 220–280px node width. If a parent has 12 directs, render TWO rows of 6, never one row of 12.
- For deep trees (4+ tiers), compress vertical rhythm to 80–100px row height with 24–32px gaps so everything fits inside 820 viewBox height.
- Reporting lines must be `<line>` or `<path>` elements drawn between explicit (x,y) points — not HTML borders — so they line up exactly with the SVG-positioned boxes.
- If the corpus has more named individuals than fit cleanly, GROUP smaller teams into a band-style card ("L3 · Alumni Relations · 22 FTE — Lead: Morgan Ellis + 5 directs") instead of rendering 22 illegible 80px-wide boxes.

## Anti-patterns
- Do not collapse named individuals into a generic "Team" node UNLESS layout discipline above requires banding.
- Do not invent reporting lines the corpus does not describe.
- Mark explicitly-vacant roles with a "VACANT" treatment from the exemplar.
- Do not allow any element to render outside the 1920 × 1080 frame. Overflow = auto-reject.
