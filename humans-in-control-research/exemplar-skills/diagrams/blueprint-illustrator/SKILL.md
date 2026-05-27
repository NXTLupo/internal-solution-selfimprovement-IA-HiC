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

---

## Cell anatomy (2026-05-25 — replaces prior multi-statement rule)

Blueprint reuses the journey exemplar's `.activities` grid (one column per phase/step). The exemplar enforces EXACTLY ONE `.activity` child per phase column. Emitting multiple `.activity` divs per cell breaks the grid identically to journey — every dot collapses to `top:50%` and labels overlap.

**One activity statement + at most one fail-point row per (lane × step) cell.** Concentrate density INTO the single statement + the single fail-point row, never multiply rows.

```html
<div class="activity friction">                          <!-- friction class → rust dot -->
  <div class="alabel">Customer submits final résumé via NUworks portal.</div>
  <div class="dot"></div>
  <div class="pain">Fail point: ATS keyword filter rejects 48% of submissions before recruiter sees them.</div>
</div>
```

Use the existing `.pain` row to carry FAIL POINTS in blueprint context. The CSS `::before` renders "PAIN" — for blueprints, prefix the body with "Fail point:" so the resulting visual reads "PAIN  Fail point: ...". (A dedicated `.fail-point` class is the long-term cleanup; using `.pain` keeps blueprint compatible with the current journey exemplar.)

---

## Service-design primitives (UPGRADED 2026-05-25)

### Lines of visibility and internal interaction (Shostack 1984)

A blueprint is differentiated from a journey by TWO horizontal dividers, NOT one:
- **Line of Visibility (LoV)** — separates Customer Action + Frontstage (above) from Backstage + Support (below). Rendered as 2px DASHED stroke in `var(--nu-stone)` / `var(--nx-stone)`, running the full width of the lanes container.
- **Line of Internal Interaction (LoII)** — separates Backstage from Support Processes. Rendered as 2px DOTTED stroke in `var(--nu-mist)` / `var(--nx-mist)`.

Render both lines BEFORE positioning lane content so labels paint over them.

Lane order (top-to-bottom):
1. Customer Action
2. Frontstage (customer-facing staff/UI)
3. — Line of Visibility —
4. Backstage (internal staff, no customer contact)
5. — Line of Internal Interaction —
6. Support Processes (systems, automations, vendor integrations)

When fewer than 4 lanes are warranted, OMIT — never combine. A 2-lane blueprint can be just "Customer Action + Backstage" with the LoV between them.

### Moment-of-truth markers

Critical customer-staff interaction points get `.activity.moment` — the dot becomes the brand-accent filled, 14×14px. Use sparingly — at most 2 per blueprint.

### Fail-point markers (in addition to standard friction)

Fail points are moments where the service can BREAK (not just hurt). They carry a distinct visual treatment:
- Use `.activity.friction` (rust dot) for the activity.
- Use the `.pain` row body prefixed with "Fail point:" — names the specific break condition.
- A "Fail probability" annotation in monospace is encouraged when the corpus carries failure-rate data: "Fail point: ATS reject (P=0.48)."

### Future-state diagnosis traceability (DATA, not visible chrome)

Every step in the blueprint MUST be traceable back to a journey-stage pain that it resolves. The tether lives as a `data-resolves="<verbatim pain>"` attribute on the `.activity` div — invisible to the reader, available to audit tooling. The .alabel itself reads as a natural future-state sentence ("Resume-screen step replaced by skills-bench evaluator scoring against named rubric") — the FACT of resolution is implicit in the prose, not stamped as a debug arrow. If a step has no underlying journey pain, it does not belong in the blueprint — blueprint claims are never free-floating future state.

### Service-KPI overlay row (NEW, optional but encouraged)

Render an `.kpi-row` ABOVE the lane container with one cell per step column:
- `.kpi-eye` — uppercase eyebrow naming the KPI ("WAIT TIME", "REJECT RATE", "SLA")
- `.kpi-value` — current → target, e.g. "12 min → 3 min" in monospace
- Use brand-accent color for improving KPIs, rust for KPIs that get worse, mist for unchanged.

### Process-time vs touchpoint-time

When the customer wait at a step is short but the backstage process is long, render BOTH:
- `.touchpoint-time` on the Customer Action cell ("~30 sec")
- `.process-time` on the Backstage / Support cell ("~20 min orchestration")
A blueprint that flattens these times has misrepresented the service.

### Support-process system inventory

The Support Processes lane should name the SYSTEMS / AUTOMATIONS / VENDORS that power the step ("Workato auto-validation", "Airtable applicant DB", "Twilio SMS reminder"). System names go in the `.alabel`; integration arrows can be drawn as SVG between system cells.

### Expected-emotion improvement layer

Reuse the journey's `.emotion-arc` SVG, but render TWO polylines:
- The CURRENT-STATE arc (lifted from the matching journey artifact) in muted color (mist).
- The FUTURE-STATE arc (projected post-redesign) in brand-accent.
The visual delta between the two lines is the value proposition of the blueprint.

---

## Density and symmetry across lanes (UPDATED 2026-05-25)

- Every lane MUST emit EXACTLY N `.activity` children per `.activities` container (N = step count). If a lane has no activity at a step, emit the placeholder `<div class="activity"><div class="alabel">—</div><div class="dot" style="opacity:0.35"></div></div>` — never leave a cell empty (breaks grid).
- N+1 children → REJECT. This is the same catastrophic-overlap bug that hit journey.
- DO NOT try to "stack 3 actions vertically" per cell. Concentrate evidence INTO the single .alabel + single .pain row.

---

## Self-check BEFORE emitting (expanded 2026-05-25)

### Geometry
1. Each `.activities` container has EXACTLY N children where N = step count? If N+1, REJECT.
2. Each `.activity` has at most ONE `.alabel`, ONE `.dot`, AT MOST ONE `.pain`?
3. No two text elements share (x, y) ± 4px?

### Service-design primitives
4. Line of Visibility rendered as 2px dashed full-width? REQUIRED.
5. Line of Internal Interaction rendered as 2px dotted full-width? REQUIRED if Support Processes lane exists.
6. Every step has a `↪ resolves:` tether back to a journey pain? If a step has no tether, REJECT — it's free-floating future state.
7. Moment-of-truth markers: ≤2 per blueprint, using `.activity.moment`?
8. Future-state emotion arc rendered ALONGSIDE muted current-state arc? Encouraged not required.

### Density and naming
9. Each lane emits the correct N child count? Empty cells use the `—` placeholder?
10. Lane labels are HUMAN/SYSTEM roles, not abstract categories ("Workato", "Career Center Director" — not "Technology", "Operations")?
11. Step names are concrete behaviors, NOT gerund categories?

### Brand parity
12. Layout decisions are identical across NU and NXT?

If any check fails, REGENERATE with corrected geometry. Do not ship.
