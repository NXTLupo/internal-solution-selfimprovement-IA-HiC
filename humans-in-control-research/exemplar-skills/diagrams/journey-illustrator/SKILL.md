---
name: journey-illustrator
description: Journey map (CURRENT-state) illustrator. Frames stages as observed today, pain points as evidenced friction. Shares visual exemplar with blueprint (styles/01-service-blueprint-NU.html and 02-service-blueprint-NXT.html); diverges semantically.
---

# Journey map (current-state) illustrator

## Framing
This is the **as-is** workflow. Pain points are real, observed, evidenced from the corpus. Opportunities are noted but not yet committed. Lane labels reflect today's actors and process. The narrative is descriptive.

## Cardinality
Scale swimlanes and stages to match the corpus. Add more lanes when the corpus describes more actors. Add more stage steps when the corpus describes more touchpoints. Replicate the structural elements from the exemplar.

## Layout discipline (1920 × 1080 hard envelope — auto-reject if violated)

### Spatial budget
- Top band: ≤180px. Body: 800px. Bottom band: ≤100px. (1080 total)
- Body has ≥40px gutters left and right. Usable body area: 1840 × 800.
- Every element MUST be positioned with explicit coordinates. Never rely on flex to grow into available space without a max-width.

### Lane geometry (HARD RULES)
- Lane height ≥120px when labels are expected to be 2 lines; reduce to 100px only when ALL labels are 1 line.
- Lane line drawn at the vertical center of its band. Labels positioned at `band_top + 18px` (above-line) OR `band_bottom − 18px` (below-line) — NEVER overlapping the line itself.
- Stage column width = 1840px / N stages. Min 200px per stage. Max 320px.
- If `N stages × 200px > 1840px`, USE A 2-ROW LAYOUT (stages 1..N/2 on top row, N/2+1..N on bottom row).
- Pain-point chips live in a dedicated row ABOVE the lanes, never inside a lane band.

### Text-vs-line clearance (HARD RULE)
- Any horizontal connector / lane line at y=Y has a 36px exclusion zone above AND below. NO text bounding box may intersect [Y−36, Y+36].
- Multi-line labels MUST be ≤ 2 lines. If content needs more, truncate with ellipsis OR escalate to a band card ("3 sub-stages — see appendix").
- Hard max chars per line:
  - 22 chars for 11.5px text (lane labels, milestone callouts)
  - 18 chars for 14px text (stage headings, pain-point summaries)
  - 14 chars for 16px text (top-band sub-titles)
- When more than 4 milestones share a lane, STAGGER labels above/below the line in alternating zigzag pattern (even-index above, odd-index below).

### Density tiers
- LOW (≤15 milestones): full element treatment with rich detail.
- MEDIUM (15–40): standard exemplar layout.
- HIGH (40–100): activate band-card grouping. Replace ≥6 same-tier siblings with one band card "{N} {category} — Lead: {name} + {N−1} directs".
- EXTREME (100+): emit AT MOST a top-N + "see appendix" footnote. Never cram.

### Truncation rules
- Verbatim quotes capped at 200 chars; longer quotes truncated with "…" and attribution intact.
- Lede capped at 280 chars.
- Action title capped at 100 chars and MUST be a complete sentence.
- Stage labels capped at 24 chars.

### Anti-patterns (auto-reject)
- ANY text overlapping ANY non-text element (line, arrow, divider, box edge).
- ANY label exceeding its allocated rectangle.
- ANY element extending past the 1920×1080 frame.
- Inheriting the exemplar's exact coordinate values when YOUR content has different lengths than the exemplar's content. RECOMPUTE Y offsets when label height changes.
- Do not propose future-state designs in a journey artifact — that belongs in a blueprint.
- Quotes must be verbatim from the corpus and attributed.
