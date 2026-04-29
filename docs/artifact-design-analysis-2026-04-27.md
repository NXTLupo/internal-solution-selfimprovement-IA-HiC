# Artifact Information Design & PPTX Editability Analysis

**Date:** 2026-04-27
**Branch:** `HiC-Artifact_Refinements`
**Scope:** All 5 freeform artifact kinds (org, journey, arch, roadmap, blueprint), their skill files, prompt body-construction guidance, exemplar HTMLs, and the PPTX export pipeline.

---

## 1. Current state inventory

### 1.1 Skill files vs prompt guidance

| Kind | `SKILL.md` | `perKindGuidance()` in `chatToFreeform.ts` | Exemplar HTML |
|---|---|---|---|
| **org** | ✅ Layout discipline (1808×820 viewBox, ≤6 nodes/row, band cards, `<line>` connectors, anti-overflow) | ✅ Mirror of skill rules | `05/06-org-chart-{NU,NXT}.html` (~406 lines) |
| **journey** | ❌ Framing + cardinality + anti-patterns only | ⚠️ Element checklist (5 lanes, sentiments, pain points) — no spatial rules | `01/02-service-blueprint-{NU,NXT}.html` (shared with blueprint, ~702 lines) |
| **blueprint** | ❌ Same | ⚠️ Lane checklist (Customer Action / Frontstage / Backstage / Support) | Same as journey |
| **arch** | ❌ Idiom variants + anti-patterns only | ⚠️ Element checklist (system boxes, flow arrows, datastores) | `03/04-architecture-{NU,NXT}.html` (~550 lines) |
| **roadmap** | ❌ Idiom variants + anti-patterns only | ⚠️ Element checklist (phases, milestones, workstreams) | `07/08-roadmap-{NU,NXT}.html` (~535 lines) |

**Diagnosis:** the org chart works because it received layout discipline rules during the org-chart fix. The other four kinds inherit the exemplar's *structural skeleton* but receive zero spatial discipline — so the model emits text at fixed coordinates inherited from the exemplar regardless of how long the labels are. This is the root cause of every text-on-line collision.

### 1.2 Exemplar font sizes (already tight)

```
.eyebrow      9.5px (letterspaced)
.lede        12px
.meta         9.5px
node label   11.5px
section h2   18px
title h1     32px
```

These are calibrated for a 1920×1080 canvas displayed at full size. When the canvas is shrunk to fit a chat preview (~800px wide), 9.5px text becomes ~3.8px on screen — already at the readability floor *before* the model adds its own content.

### 1.3 Current PPTX export pipeline ([artifactExporter.ts:158-202](humans-in-control-research/design-desk/services/artifactExporter.ts#L158-L202))

For freeform artifacts:
1. Capture iframe at native 1920×1080 → PNG (2× pixelRatio).
2. Walk iframe DOM with `TreeWalker(NodeFilter.SHOW_TEXT)` → collect every text node's `getBoundingClientRect()` + computed style.
3. Emit each text run as a PptxGenJS `addText()` frame at the captured coordinates, scaled via `pxToSlidePt(px) = px × 0.75 × 0.6667`.
4. Add image LAST so it visually covers the text frames; user must "Send Image to Back" in PowerPoint to expose the editable text layer.

**Limitations of current approach:**
- Every text node = its own frame. A label like *"Manual PO & journal vouchers"* on three CSS lines becomes three separate frames, breaking semantic editability.
- SVG primitives (lines, paths, circles, rects) are baked into the image — users can edit text but cannot move connection lines, recolor lanes, or change node positions.
- Text frames overlap each other where the model's HTML used absolute positioning with collision (the very issue the user is reporting).
- Atmospheric overlays (radial gradients, grain SVG) bake into the image, so the editable text layer floats on a flattened background — visible misregistration if the user resizes.

---

## 2. Top 50 readability & information-design issues

Organized by density tier. *Low* = ≤15 elements (early prototype, simple narrative). *Medium* = 15–40 (typical consulting deliverable). *High* = 40–100 (dense workshop output). *Extreme* = 100+ (multi-team mapping).

### A. Text-vs-geometry collisions (#1–10)

1. **Multi-line labels overflow into adjacent lane lines** *(all kinds, medium+)* — the user-reported journey issue. Root cause: model emits SVG `<text>` at fixed Y offsets sized for 1-line labels.
2. **Label width exceeds available column** *(journey, blueprint, roadmap, medium+)* — long stage names overflow into next column with no wrapping/truncation rule.
3. **Connector arrows pass through node label backgrounds** *(arch, medium+)* — exemplar has arrows at fixed Y; when label height grows, label crosses arrow.
4. **Pain-point chips collide with stage column dividers** *(journey, high)* — chips are positioned relative to stage columns but lack edge gutters.
5. **Footer voice-quotes overlap the bottom band when corpus has long quotes** *(all, medium+)* — the bottom band has fixed height; quotes are rendered without max-height clipping.
6. **Top-band lede overflows into title** *(all, medium+)* — when corpus has dense framing language, the lede paragraph grows beyond its allocated row.
7. **Stat callouts in bottom band collide horizontally** *(all)* — flexbox without `min-width: 0` on children causes uneven flex distribution.
8. **Vertical reporting lines pass through ancestor node text** *(org, low+)* — when grandparent label is 2 lines, the descending connector crosses the second line.
9. **Annotation labels on flow arrows overlap downstream nodes** *(arch, medium+)* — annotations placed at arrow midpoint with no awareness of node position.
10. **Quarter-divider verticals pass through milestone text** *(roadmap Gantt, high)* — Gantt-style timeline has fixed milestone positions but model places text without quarter-boundary check.

### B. Hierarchy & visual weight (#11–18)

11. **Action title not a complete sentence** *(all, low+)* — `.claude/CLAUDE.md` rule violation; model emits topic labels ("Donor Lifecycle") instead of conclusions ("The donor lifecycle relies on 60% manual effort").
12. **No visual emphasis for primary path** *(arch, all)* — when 12 systems are shown, the critical-path is not visually distinguished from periphery.
13. **All milestones rendered with identical visual weight** *(roadmap, medium+)* — committed/planned/aspirational treatment exists in skill but is never enforced in prompt.
14. **Pain points not visually ranked** *(journey, blueprint, medium+)* — friction with 4 evidence sources looks identical to friction with 1 evidence source.
15. **Persona quote-attribution buried** *(all)* — quote source name renders at same weight as quote body; reader can't trace evidence at a glance.
16. **No "spotlight" treatment for the critical stage** *(journey, blueprint, medium+)* — exemplar has a faint pink wash on Stage 04 ("Q4 Crunch"); model rarely activates this on the corpus-warranted stage.
17. **Datastore icon not differentiated from service icon** *(arch, medium+)* — exemplar has different shape stems; model frequently uses identical squares.
18. **Department / cluster bands not used** *(org, medium+)* — even with skill rules, the model defaults to flat tree even when corpus describes natural clusters.

### C. Density management (#19–28)

19. **No "band card" affordance for grouping** *(org, journey, blueprint)* — when corpus describes 22 alumni-relations FTEs, model still tries to render 22 individual cards. Skill mentions banding for org but not for others.
20. **No truncation rule for over-long quotes** *(all)* — verbatim quotes can run 60+ words; needs ellipsis-with-source-link pattern.
21. **No "show top N, +X more" affordance** *(all medium+)* — when more items exist than fit, no fallback pattern to show top N and indicate the remainder.
22. **No explicit "minimum white space" rule** *(all, high)* — exemplars have generous margin; model fills it.
23. **No max-element budget per kind** *(all)* — should be: org ≤30 nodes, journey ≤7 stages × ≤4 lanes, arch ≤15 systems, roadmap ≤12 phases.
24. **No "sub-slide" pattern for overflow** *(all extreme)* — extreme density should automatically flag "this needs 2 slides" rather than cramming.
25. **Inline notes / footnotes mixed into body text** *(all, medium+)* — should be relegated to a footnote band.
26. **Per-stage emotion indicator collides with stage label** *(journey, blueprint)* — emotion swatch positioned same column as label; competes for visual real estate.
27. **Stage-step columns shrink to illegibility when stage count > 6** *(journey, blueprint, high)* — needs auto-break into 2-row layout.
28. **Workstream rows collapse to <30px when ≥10 streams** *(roadmap Gantt, extreme)* — needs cluster-by-team rule.

### D. Typography & legibility (#29–35)

29. **9.5px eyebrow text is below readability floor at chat-preview scale** *(all)* — when the canvas is rendered at 33% in a chat embed, 9.5px = ~3.2px effective.
30. **Letter-spacing on small text aggravates readability** *(all eyebrow + meta)* — `letter-spacing: 0.22em` on 9.5px adds whitespace that reduces glyph density at small sizes.
31. **Three font families compete in narrow regions** *(all)* — Archivo, Bebas Neue, Fraunces (italic), JetBrains Mono can all coexist in a 200px column.
32. **No max-line-count for lede** *(all)* — exemplar has `max-width: 70ch` but no `-webkit-line-clamp`.
33. **JetBrains Mono labels in low-contrast areas** *(all)* — `.eyebrow` uses `--nu-red` on `--nu-paper` cream background; passes WCAG AA but only at 12px+, fails at 9.5px.
34. **Italic Fraunces in h1 used inconsistently** *(all titles)* — sometimes single italic word ("manual *work*"), sometimes phrase, sometimes none.
35. **Tabular alignment broken when fonts haven't loaded** *(all, dev mode)* — fallback substitution shifts column widths.

### E. Color & contrast (#36–41)

36. **Pain-state pink wash is too subtle** *(journey, blueprint, medium+)* — `rgba(200,16,46,0.05)` is below visibility threshold on cream paper.
37. **No accessible color alternative for emotion bands** *(journey, blueprint)* — relies entirely on red/orange/green; fails for color-blind operators.
38. **Atmospheric overlays compete with foreground text** *(all)* — radial gradients can exceed 0.12 alpha when the model widens them.
39. **Citation chips read as buttons** *(all)* — `<span class="citation">` styled as a pill creates affordance confusion.
40. **NU red used for both brand mark AND pain-points** *(NU brand)* — overload of semantic meaning; brand marks should not signal "problem here".
41. **No dark-mode rendering path** *(all)* — operators reviewing on phones at night get glare from cream paper exemplar.

### F. Structural & semantic clarity (#42–46)

42. **Lane labels use abbreviations not defined on slide** *(all, medium+)* — "GIR feed" / "JV split" assume internal vocabulary.
43. **No legend for emotion / sentiment encoding** *(journey, blueprint)* — colors are used semantically with no key.
44. **Missing data marked inconsistently** *(all)* — sometimes "TBD", sometimes "—", sometimes blank, sometimes inferred-from-context.
45. **Vacancy markers not visually distinguished** *(org)* — skill says use VACANT treatment but exemplar's gray-stub is often missed.
46. **Direction of flow ambiguous on bidirectional arrows** *(arch)* — when both ends have heads, primary direction is lost.

### G. PPTX export-specific issues (#47–50)

47. **Editable text layer is occluded by image until manually sent-to-back** — every operator hits this once and assumes the export is broken.
48. **Multi-line labels split into separate text frames** — editing one line of "Manual PO & journal vouchers" requires editing 3 frames + manually re-aligning when text length changes.
49. **SVG primitives baked into raster** — connection lines, lane lines, node circles, all become uneditable bitmap pixels.
50. **Atmospheric gradients + grain raster baked in** — even if user wanted to swap brand or replace one node, the underlying bitmap can't be altered cleanly.

---

## 3. Skill & rule modification plan

### 3.1 Universal rules (apply to all 5 kinds, add to `perKindGuidance` AND every SKILL.md)

```markdown
## Layout discipline (1920 × 1080 hard envelope)

### Spatial budget
- Top band: ≤180px. Body: 800px. Bottom band: ≤100px. (1080 total)
- Body has ≥40px gutters on left and right. Usable body area: 1840 × 800.
- Every element MUST be positioned with explicit coordinates — never rely on flex
  to grow into available space without a max-width.

### Text-vs-line clearance (HARD RULE — auto-reject if violated)
- Any horizontal connector line at y=Y has a 36px exclusion zone above and below.
  No text bounding box may intersect [Y−36, Y+36].
- Multi-line labels MUST be ≤ 2 lines. If content needs more, truncate with
  ellipsis OR escalate to a band card.
- Each label has hard max chars per line: 22 chars for 11.5px text, 18 chars
  for 14px text, 14 chars for 16px text.
- Stagger labels above and below a connector line in alternating zigzag pattern
  when more than 4 milestones share a line. Even-indexed: above. Odd-indexed: below.

### Density tiers
- LOW (≤15 elements): full element treatment with rich detail.
- MEDIUM (15–40): standard exemplar layout.
- HIGH (40–100): activate band-card grouping. Replace ≥6 same-tier siblings
  with one band card "{N} {category} — Lead: {name} + {N−1} directs".
- EXTREME (100+): emit AT MOST a top-N + "see appendix" footnote. Never cram.

### Truncation rules
- Verbatim quotes capped at 200 chars; longer quotes truncated with "…" and
  attribution intact.
- Lede capped at 280 chars.
- Action title capped at 100 chars and MUST be a complete sentence.
- Stage labels capped at 24 chars.

### Anti-patterns (auto-reject)
- ANY text overlapping ANY non-text element (line, arrow, divider, box edge).
- ANY label exceeding its allocated rectangle.
- ANY element extending past the 1920×1080 frame.
- Inheriting the exemplar's coordinate values when the actual content is longer
  than the exemplar's content. Recompute Y offsets when label height changes.
```

### 3.2 Kind-specific overlays

**journey + blueprint**

```markdown
### Lane geometry
- Lane height (vertical band per actor lane): ≥120px when label content is
  expected to be 2 lines. Reduce to 100px only when all labels are 1 line.
- Lane line drawn at vertical center of band. Labels positioned at
  band_top + 18px (above-line) OR band_bottom − 18px (below-line) — never
  overlapping the line itself.
- Stage column width: 1840px / N stages. Min 200px per stage. Max 320px.
  If N stages × 200px > 1840px, USE 2-row layout (stages 1–N/2 on top row,
  N/2+1–N on bottom row).
- Pain-point chip positioned in dedicated row above the lanes, NEVER inside
  a lane band.
```

**arch**

```markdown
### Node geometry
- Tier bands: 4 tiers max (presentation, application, data, integration).
  Each tier band: 180px tall.
- System box: 220–280px wide × 70–90px tall. NO box smaller than 220×70.
- Connectors are 2px-stroke lines/paths between explicit (x1,y1,x2,y2) points.
  Connectors NEVER cross through a system box — route around it.
- Annotation labels on connectors placed at midpoint with 12px offset
  perpendicular to line direction.
- Datastore icons MUST use the cylinder shape from the exemplar; service
  icons MUST use the rounded-rect shape. NEVER swap.
```

**roadmap**

```markdown
### Timeline geometry
- Phase columns: equal width unless durations differ by >20%. Min 280px.
- Workstream rows: ≥48px tall when bars carry text labels; can compress to
  32px for label-free Gantt segments.
- Today-marker (vertical line at current date): full-height, 2px stroke,
  rust color, dashed.
- Milestone diamond: 18px × 18px, centered on its date column.
- Bar text: inside-the-bar IF bar ≥ 240px wide; otherwise label outside bar
  with 8px gap, on the side that has the more whitespace.
```

**org** (already has good rules, ADD)

```markdown
### Refinement
- Vertical rhythm: tier rows at y=10, y=140, y=270, y=430, y=590 for 5-tier
  trees (gives 70–80px per node band with 30px gap).
- Anti-pattern: do NOT reuse the exemplar's exact 1808×820 coordinates when
  your tier count differs. Recompute.
- For radial variant: ring radii at r=110, r=240, r=380 from center (904, 410).
  Node count per ring: 6 / 12 / 18 max.
```

### 3.3 Where to surface the rules in the prompt

The rules need to appear THREE times in the prompt for the model to actually obey them (recency + repetition):

1. **Skill markdown** (loaded as `=== DIAGRAM ILLUSTRATOR SKILL ===` early in prompt).
2. **`perKindGuidance` body construction step 4** (middle of prompt, after the exemplar body content).
3. **CRITICAL EMISSION REQUIREMENTS** at the bottom (rules 9–11 already exist; expand to add text-clearance + truncation as rules 12–15).

This three-hammer pattern is the same one that finally got the org chart to obey "max 6 per row".

---

## 4. PPTX editability plan (3 tiers)

The current implementation already gives partial editability (every text node is a real PPTX text frame). The aspiration of "fully editable, never jumbled" requires escalating from raster-with-text-overlay to native-PPTX-shapes.

### Tier 1 — Refine the current overlay approach (low risk, ~4 hrs)

| Issue | Fix |
|---|---|
| Multi-line labels split into N frames | Walk to the nearest *block-level ancestor* with a single text content; emit ONE frame per logical label. Use the ancestor's `getBoundingClientRect()` not the text node's. |
| Frames overlap the image visually until manually sent to back | Set `transparency: 100` on a 1×1 px image overlay placed in z-order BETWEEN the text and the bg image. Confuses the user less. Or: ship a one-line explainer in the export menu. |
| Frame coordinates accidentally clip text on edit | Add 4px padding to every emitted frame's `w` and `h`. |
| Identical text repeated when a node has both `aria-label` and visible text | Dedupe via Set on `(text + rounded position)`. |
| Atmospheric overlay + grain bake into raster | Skip elements with `pointer-events: none` AND `opacity < 0.3` in the text walk; emit a separate gradient SHAPE for the atmospheric overlay (PptxGenJS supports radial gradients on shapes). |

### Tier 2 — Convert SVG primitives to PPTX shapes (medium risk, ~12 hrs)

For each freeform iframe:
1. Walk all `<svg>` elements.
2. For each child:
   - `<line>` → `pptxgenjs.addShape({ shape: 'line', ... })` with start/end points.
   - `<rect>` → `addShape({ shape: 'rect', ... })`.
   - `<circle>` / `<ellipse>` → `addShape({ shape: 'oval', ... })`.
   - `<path>` with simple cubic Bezier → `addShape({ shape: 'roundRect' })` for known patterns OR fall back to image.
   - `<polygon>` → custom shape.
3. Convert SVG viewport coordinates (0..1808 × 0..820) to slide inches via the same `SOURCE_TO_SLIDE_SCALE`.
4. Apply stroke / fill from computed `getComputedStyle()` of the element.

This makes connection lines, lane lines, and node boxes editable in PowerPoint. Operators can move a system box, recolor a lane, redraw a connector — all things they can't do today.

**Boundaries:**
- SVG `<path d="...">` with arbitrary curves cannot be perfectly converted; fall back to image for those specific paths.
- Filters (blur, drop-shadow) are not supported on PPTX shapes the way they are in SVG; we accept slight visual divergence.

### Tier 3 — Native-PPTX layout engine (high risk, ~30 hrs)

Replace the iframe-walk approach entirely. Generate the PPTX directly from the validated artifact JSON (e.g., for journey: `stages[]`, `lanes[]`, `painPoints[]`):

1. Define a schema mapping each kind's structured data to a PPTX layout class.
2. Implement layout solvers that compute final coordinates inside JavaScript (no LLM, no HTML iframe).
3. Emit native PPTX shapes for every visible element (boxes, lines, labels, callouts).
4. The "rendering" in the Designer iframe becomes a *preview* of what PPTX will produce, not the source of truth.

**Pros:** total fidelity, every element editable, deterministic. No model coordinate guesswork.
**Cons:** loses the freeform-HTML flexibility that makes exemplars look beautiful in the iframe; requires a layout solver per kind; bigger code surface.

**Recommendation:** build Tier 1 + Tier 2 first. Treat Tier 3 as a future option only if Tier 2's path-fallback proves unacceptable for a specific kind.

---

## 5. Phased implementation plan

### Phase A — Skill + prompt rules (1 day)
1. Author the universal "Layout discipline" section. Add to all 5 SKILL.md files.
2. Author the kind-specific overlays. Append to the matching SKILL.md.
3. Mirror the universal rules in `perKindGuidance()` for every kind in `chatToFreeform.ts`.
4. Expand the `CRITICAL EMISSION REQUIREMENTS` block with text-clearance + truncation rules 12–15.
5. Rebuild Docker, test with `#journey #NU` and `#blueprint #NU` — confirm the user-reported text-on-line issue resolves.

**Acceptance:** the same prompt that produced the screenshot (advancement journey) produces a slide with NO text crossing any lane line.

### Phase B — PPTX Tier 1 refinements (2 days)
1. Refactor `collectFreeformTextRuns()` to walk to block-level ancestors and emit one frame per logical label.
2. Add the dedupe Set.
3. Padding adjustment.
4. Skip atmospheric-overlay nodes from text walk.
5. Manual QA: export an existing journey artifact, open in PowerPoint, confirm text frames map 1:1 to logical labels.

**Acceptance:** every visible label corresponds to exactly one editable text frame. No duplicate or overlapping frames.

### Phase C — PPTX Tier 2 SVG-to-shape conversion (3 days)
1. Build `walkSvgToShapes(svgEl)` utility producing `PptxShapeSpec[]`.
2. Wire into `exportFreeformPptx`: SVG shapes added BEFORE text frames, so text sits on top of editable lines/boxes/circles.
3. Move the rasterized image from "everything" to "atmospheric layer only" (gradient + grain) — much smaller, sits underneath the editable shapes.
4. Manual QA on each kind: open exported PPTX, move a connection line in PowerPoint, confirm it's a real shape.

**Acceptance:** connection lines, lane lines, node boxes, datastore icons, milestone diamonds are all native PPTX shapes that operators can select and edit.

### Phase D — Validation + polish (1 day)
1. Add a `lintFreeformOutput()` function that runs in the renderer: walks the iframe DOM, asserts text-vs-line clearance, returns a list of violations.
2. Surface violations as a soft warning in the Designer chat ("⚠ 3 labels overlap a lane line — request a refinement").
3. Update `docs/handoffs/` and `documentation.html` to document the layout rules.

**Acceptance:** when the model produces a layout that violates the discipline rules, the violations are surfaced to the operator as actionable feedback, not silently shipped.

---

## 6. Out-of-scope (deliberately deferred)

- **Persona artifacts:** intentionally on the legacy SlideCanvas + persona-card path. Not part of the freeform pipeline. Per the user's explicit direction.
- **Vector-font embedding in PPTX:** PptxGenJS uses font names; if "Bebas Neue" isn't installed on the recipient's machine, PowerPoint substitutes. Mitigation requires PPT-side font embedding (`embedFonts: true`) which inflates the file. Defer.
- **Animation export:** atmospheric pulse / sentiment-band intensity changes are not preserved in PPTX. Out of scope.
- **Multi-slide deck composition:** current `#slides` modifier composes multiple artifacts into one slide; multi-slide PPTX (one artifact per slide) is a separate effort.

---

## 7. Aspirational target after all phases

Rendering a freeform artifact and exporting to PPTX should produce:

- A rasterized atmospheric layer (gradient + grain) at 0,0 covering 13.333"×7.5".
- ALL connection lines, node boxes, datastore icons, lane lines as editable PPTX shapes with brand colors.
- ONE editable text frame per logical label, sized with 4px padding so re-flow doesn't clip.
- A `notes` slide with the model's `:::nxt:freeform` JSON header (id, kind, brand, citations) for traceability.

When an operator opens the deck, every box can be dragged, every label can be edited, every line can be recolored — the artifact is a *living deliverable* in PowerPoint, not a screenshot pretending to be one.
