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

---

## Node clearance + text rules (2026-05-20)

- Each node card has a 16px exclusion zone around its bounding box. NO reporting line, edge, or sibling card may intersect this zone.
- Node text:
  - Name: 14px Archivo Semibold, max 24 chars, single line. Truncate longer with ellipsis.
  - Role / title: 11px Archivo Regular, max 30 chars, max 2 lines, line-height 1.3.
  - Optional eyebrow (department/division): 9px uppercase tracked, max 18 chars.
- Reporting lines:
  - Solid-line for primary report.
  - Dashed-line for matrix/dotted-line report. Color must differ from primary (mute or accent — never both at default brand strength).
  - Lines terminate at the EDGE of the node card, never overshoot.
  - Lines are drawn at z-index BELOW all node cards so they never paint over name/role text.
- Vacant role treatment: outlined box with 50%-opacity stroke, italic "VACANT" label, no people-photo placeholder.
- When 6+ siblings band into a single card, the band card shows "L# · {Division} · {N} FTE — Lead: {Name} + {N-1} directs". Band card visually distinct (background fill, no individual portraits).

## Org-design data overlays (UPGRADED 2026-05-25)

An org chart that only shows the reporting tree is decorative. A research-grade org chart carries diagnostic overlays an org designer reads at a glance.

### Span-of-control overlay (REQUIRED)
- Every manager-node carries a small badge in the top-right corner: number of direct reports (`12`).
- Badge color encodes span health: ≤8 (green), 9-12 (amber), 13+ (rust). Use brand-accent / chartreuse / rust per brand.
- Use `<text x="..." y="..." class="span-badge">N</text>` positioned 8px inside the top-right of the node rect.

### Vacancy summary tile (REQUIRED in bottom band when ≥1 vacancy exists)
- Render `.stat-tile.vacancy` in the bottom band: `8` / `VACANT ROLES` / `Of 21 leadership positions (38%)`.
- Above-the-fold finding for any org-design recommendation.

### Tenure marker (encouraged when corpus evidences)
- Optional micro-icon on the node card top-left: filled circle for ≤2 yrs (newcomer), half-circle for 3-7 yrs, open circle for 8+ yrs (long-tenure).
- Tenure heatmap pattern (clustered newcomers in one function vs long-tenure in another) is a strong cultural signal.

### Function color coding (REQUIRED when corpus surfaces 3+ functions)
- Each function gets a single accent stroke color. Apply to the node rect's top border (3px solid).
- Legend in the bottom band: function name + accent color swatch.

### Matrix / shadow-org overlay (use when corpus describes dotted-line reporting)
- Render dotted lines in a DIFFERENT color than solid (per existing exemplar rule), but ALSO add a tiny "matrix" badge near the dotted line's midpoint naming the matrixed relationship (e.g., "Product Council" — the cross-functional body the dotted line serves).

### Headcount-trend annotation (optional)
- When the corpus carries time-series headcount: a 12px arrow icon next to the function label — up (growing), down (shrinking), flat (stable). Color: chartreuse / rust / mist.

---

## Self-check BEFORE emitting (expanded 2026-05-25)

### Geometry
1. Any reporting line crossing through a node card? Reject.
2. Any two node cards overlapping or within 16px of each other? Reject.
3. Any node text overflowing its allocated rectangle? Reject — either shorten OR grow the card uniformly across the tier.
4. Any element outside the 1920×1080 frame OR the 80px safe area? Reject.

### Evidence
5. Any reporting relationship in the diagram that's NOT supported by the corpus? Reject.
6. Any node-name that the corpus does not contain? If a name is a synthesis composite, mark with the "(composite)" suffix.

### Org-design overlays
7. Every manager-node has a span-of-control badge with correct color encoding?
8. If ≥1 vacancy exists in the corpus, is the vacancy summary tile rendered in the bottom band?
9. Functions are color-coded consistently? Legend present?
10. Any matrix relationship rendered without a midpoint label naming the matrixed body? Reject.

### Action-title test
11. The chart's title states an org-design FINDING (e.g., "Two managers carry 13 directs each — span exceeds healthy ceiling"), NOT a topic ("Marketing org chart")?

If any check fails, regenerate with corrected geometry. Do not ship.
