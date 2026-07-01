---
name: nano-banana-diagram-composer
description: >-
  Compose a Nano-Banana (Gemini image) prompt that renders a FULL-BLEED 16:9 consulting DIAGRAM
  (journey / architecture / mindmap / service-blueprint) with EVERY dimension and PIXEL-ACCURATE,
  corpus-verbatim text. Skill-based prompt craft; ALL content is injected from the corpus-derived
  deliverable data (never hardcoded). Used by proxy/app.py::_diagram_prompt (the runtime renderer of
  this contract) and any diagram re-prompt path.
metadata:
  type: skill
  surface: diagram-image
---

# Nano-Banana diagram composer

Diagrams for `#journey`, `#arch`, `#blueprint`, `#mindmap` render as ONE full-bleed 16:9 Nano-Banana
image that fills the whole slide wall-to-wall (native picture, no chrome around it). The image must carry
**every dimension** the deliverable's data model holds, and **every word must be corpus-verbatim and
correctly spelled**. Image models garble dense text, so the prompt is engineered specifically to defeat
that: exact-quoted copy + an accuracy-over-aesthetics constraint.

## Absolute rules

1. **NOTHING HARDCODED.** Every label, task, pain, quote, persona, KPI, opportunity, and title is passed
   in from the corpus-derived deliverable data (`JourneyMapData`, `ArchitectureMapData`, etc.). The skill
   supplies only the *craft* (layout, formula, constraints), never content or example copy.
2. **Corpus accuracy is the top priority.** Render text EXACTLY as provided (verbatim quotes from the
   corpus/deliverable). Never paraphrase, invent, translate, abbreviate, pad, or drop an item. Accuracy of
   the quoted text is MORE IMPORTANT than visual polish.
3. **Every provided item appears exactly once.** No duplication, no mirroring to fill symmetry, no invented
   filler nodes/cells. If that leaves an asymmetric layout, that is correct.

## The prompt formula (apply in this order)

1. **Format & Style** — "Design a 16:9 FULL-BLEED [type] diagram that fills the entire frame edge-to-edge.
   Background: crisp, clean, minimalist solid white. Clean editorial management-consulting aesthetic."
2. **Layout & Elements** — the explicit structure for the type (below): shapes (boxes/lanes/nodes/arrows),
   directional flow, and where each dimension sits. Fill the whole canvas; no dead margins.
3. **Text & Typography** — enclose EVERY piece of copy in exact double quotes, grouped by its cell. Specify
   a bold dark-charcoal sans-serif for titles, regular grey for descriptors/bullets, and the brand accent
   ONLY for rules/arrows/kicker (never as a fill).
4. **Constraints** — end with: "Every quoted text string must be spelled EXACTLY as written, fully legible,
   horizontal, non-overlapping. Accuracy of the quoted text is MORE IMPORTANT than aesthetics. Render every
   quoted item, no more and no fewer. No watermarks, no logos, no UI chrome, no invented text."

## Per-type structure + dimensions (all sourced from the deliverable data)

- **Journey** (`JourneyMapData`): a full-width SWIMLANE MATRIX. Columns = phases (`stages`, in order;
  mark `critical` phases with the accent header). Stacked rows, top to bottom: (a) a PERSONAS row (JTBD
  `personas`, one voice distributed per phase); (b) one ACTOR LANE per `lanes[]` entry with the actor name
  at left and that lane's per-phase task in each column (`cells[]`, "not engaged" renders greyed);
  (c) a PAIN POINTS row with the stacked `painPoints[i]` (+ `overallPainPoints`) under each phase, accent
  colored; (d) an OPPORTUNITIES row (`opportunities`, cool accent); embed each `kpiTiles` entry in its
  phase header. A cited corpus QUOTE and the `keyInsight` takeaway band anchor the bottom. Left-to-right arc.
- **Architecture** (`ArchitectureMapData`): a top-down HIERARCHICAL TREE of tiers (`layers[]`), one tier row
  per layer, each `nodes[]` a card with its `name` (bold) + `type`/`description` (grey) + a meaningful
  thin-line icon; connectors flow DOWN the hierarchy, each joining two named cards (no dangling). `flowSummary`
  as a caption. NOT a uniform grid.
- **Mindmap**: central hub card + branch cards with sub-detail bullets, curved connectors hub->branch, filling
  the frame asymmetrically.
- **Service-blueprint** (Bitner): stacked horizontal lanes — Customer Actions, Frontstage, Backstage, Support
  Processes — with the "line of interaction" and "line of visibility" drawn, and per-phase cells in each lane.

## Text-first discipline
The deliverable data IS the pre-outlined corpus copy (produced by the journey/arch/etc. skill from the
corpus). Feed those exact strings into the image prompt as quoted copy; do not regenerate or summarize them.
After generation, review the image; if any quoted string is misspelled or duplicated, regenerate.
