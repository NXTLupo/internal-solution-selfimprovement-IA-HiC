---
name: roadmap-illustrator
description: Roadmap illustrator. Use the matching exemplar (styles/07-roadmap-NU.html or 08-roadmap-NXT.html) as visual ground truth. Produce phases / milestones / now-next-later / Gantt-style timelines.
---

# Roadmap illustrator

## Idiom variants
- **Now / Next / Later** — three horizons, content blocks per horizon
- **Phased** — Phase 1 / 2 / 3 with start-end dates and milestones per phase
- **Gantt-style** — workstreams as rows, time as columns, bars showing duration

## Cardinality
Scale phase count and milestone density to the corpus. Replicate the structural elements (phase block, milestone marker, workstream row).

## Layout discipline (1920 × 1080 hard envelope — auto-reject if violated)

### Spatial budget
- Top band: ≤180px. Body: 800px. Bottom band: ≤100px. (1080 total)
- Body has ≥40px gutters left and right. Usable body area: 1840 × 800.
- Every element MUST be positioned with explicit coordinates. Never rely on flex to grow into available space without a max-width.

### Phase / horizon geometry (HARD RULES — Now/Next/Later or Phased)
- Phase columns: equal width unless the corpus specifies durations differing by >20%. Min 280px, max 520px per phase.
- Phase header band at `body_top`: 60px tall, contains phase name + duration + status pill.
- Phase content area: `body_top + 60px` to `body_bottom − 40px`, holds milestones + initiatives.
- Phase divider: 2px vertical, drawn FIRST so phase content paints over it.
- Status pills:
  - committed = solid brand-accent fill, white text
  - planned = outlined brand-accent, accent text
  - aspirational = dashed gray outline, gray text
  Reader MUST be able to distinguish at a glance — never use text alone.

### Workstream geometry (HARD RULES — Gantt idiom)
- Workstream rows ≥48px tall when bars carry text labels; can compress to 32px for label-free Gantt segments.
- Today-marker (vertical line at current date): full body height, 2px stroke, rust color, dashed pattern. Labeled "TODAY" at top.
- Milestone diamond: 18px × 18px, centered on its date column.
- Bar text:
  - Inside the bar IF bar ≥ 240px wide
  - Outside the bar (with 8px gap, on the side with more whitespace) if bar < 240px

### Text-vs-line clearance (HARD RULE)
- Any phase divider has a 24px exclusion zone perpendicular to it. NO text bounding box may intersect this zone.
- Bar labels positioned outside their bars must NOT overlap the next bar; if they would, shorten the label (max 18 chars) or place above/below the bar instead.
- Hard max chars per line:
  - 22 chars for 11.5px text (milestone callouts, bar labels)
  - 18 chars for 14px text (initiative names, owner labels)
  - 14 chars for 16px text (phase names)

### Density tiers
- LOW (≤6 phases or ≤8 workstreams): full element treatment with rich annotation.
- MEDIUM (6–12 phases / 8–16 workstreams): standard exemplar layout.
- HIGH (12–20 phases / 16–25 workstreams): cluster initiatives by capability ("Data Foundation — 4 initiatives").
- EXTREME (20+ phases / 25+ workstreams): emit a top-N + "see appendix" footnote. Never compress to <32px row height.

### Truncation rules
- Action title capped at 100 chars and MUST be a complete sentence stating roadmap intent.
- Phase names capped at 24 chars.
- Initiative names capped at 32 chars.

### Anti-patterns (auto-reject)
- Do not invent dates. Pull from corpus or mark as "TBD" / "tentative" with a visual treatment (dashed outline + gray fill).
- Do not order phases without justification — sequence must reflect dependencies in the corpus.
- ANY text overlapping ANY phase divider, workstream row line, or today-marker.
- ANY workstream row compressed below 32px tall.
- Inheriting the exemplar's exact coordinate values when YOUR phase count differs. RECOMPUTE column widths.
