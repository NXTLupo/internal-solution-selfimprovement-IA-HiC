---
name: blueprint-illustrator
description: Service blueprint (FUTURE-state) illustrator. Frames the workflow as the proposed redesign post-analysis. Shares visual exemplar with journey (styles/01-service-blueprint-NU.html and 02-service-blueprint-NXT.html); diverges semantically.
---

# Service blueprint (future-state) illustrator

## Framing
This is the **to-be** workflow, post-analysis. Pain points are resolved or mitigated. Lane labels may include new roles, automated systems, or restructured processes. Quotes / evidence cite the diagnosis that drove each design choice. The narrative is prescriptive.

## Cardinality
Scale swimlanes (customer actions / frontstage / backstage / support processes) to match the redesign scope. Add fail-point markers and emotion-intensity treatments where the corpus supports them.

## Layout discipline (1920 × 1080 hard envelope — auto-reject if violated)

### Spatial budget
- Top band: ≤180px. Body: 800px. Bottom band: ≤100px. (1080 total)
- Body has ≥40px gutters left and right. Usable body area: 1840 × 800.
- Every element MUST be positioned with explicit coordinates. Never rely on flex to grow into available space without a max-width.

### Lane geometry (HARD RULES)
- Four canonical lanes (Customer Action / Frontstage / Backstage / Support Processes). When fewer than 4 lanes are warranted, OMIT — never combine.
- Lane height ≥130px (blueprint lanes typically carry MORE annotation than journey lanes — design for it).
- Lane line drawn at the vertical center of its band. Step boxes / action callouts positioned at `band_top + 20px` (above-line) OR `band_bottom − 20px` (below-line) — NEVER overlapping the line itself.
- Step column width = 1840px / N steps. Min 220px per step. Max 320px.
- If `N steps × 220px > 1840px`, USE A 2-ROW LAYOUT (steps 1..N/2 on top row, N/2+1..N on bottom row, separated by a 30px gutter).
- Fail-point markers and emotion-intensity bands live in a dedicated row ABOVE the lanes, never inside a lane band.
- Vertical "line of visibility" between Frontstage and Backstage: 2px dashed, full-body height, rendered FIRST so labels paint over it.
- Vertical "line of internal interaction" between Backstage and Support Processes: 2px dotted, full-body height.

### Text-vs-line clearance (HARD RULE)
- Any horizontal lane line / vertical step divider has a 40px exclusion zone perpendicular to its direction. NO text bounding box may intersect this zone.
- Multi-line labels MUST be ≤ 2 lines. Anything longer → truncate with ellipsis OR escalate to a footnote in the bottom band.
- Hard max chars per line:
  - 22 chars for 11.5px text (step labels, action callouts)
  - 18 chars for 14px text (lane headings, fail-point summaries)
  - 14 chars for 16px text (top-band sub-titles)
- Stagger fail-point markers above/below the line of visibility in alternating zigzag when more than 3 fail-points share a step column.

### Density tiers
- LOW (≤15 actions): full element treatment with rich annotation.
- MEDIUM (15–40): standard exemplar layout.
- HIGH (40–100): activate band-card grouping for repeated micro-steps ("auto-validation steps × 6 — orchestrated by Workato").
- EXTREME (100+): emit a top-N + "see appendix" footnote. Never cram.

### Truncation rules
- Verbatim diagnosis quotes capped at 200 chars; longer quotes truncated with "…" and attribution intact.
- Lede capped at 280 chars.
- Action title capped at 100 chars and MUST be a complete sentence stating the redesign claim.
- Step labels capped at 24 chars.

### Anti-patterns (auto-reject)
- ANY text overlapping ANY non-text element (lane line, step divider, line of visibility, fail-point marker).
- ANY label exceeding its allocated rectangle.
- ANY element extending past the 1920×1080 frame.
- Inheriting the exemplar's exact coordinate values when YOUR content has different lengths. RECOMPUTE Y offsets when label height changes.
- Do not describe today's state — that belongs in a journey artifact.
- Do not propose changes that are not justified by a diagnosed pain point in the corpus.
