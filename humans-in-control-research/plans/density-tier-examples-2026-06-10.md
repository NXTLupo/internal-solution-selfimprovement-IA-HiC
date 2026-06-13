# Density-tier examples (auto-layout matrix substrate) - 2026-06-10

GOAL: per matrix-based artifact, show a BASE gold + growth tiers proving the layout
extends collision-free at runtime via prompting. Matrices MUST be nested Figma
auto-layout (see memory feedback_gold_matrix_autolayout_for_dimension_growth).

## SUBSTRATE PATTERN (locked)
matrix = VERTICAL auto-layout: phase-header row + N lane rows + pain row.
each row = HORIZONTAL auto-layout: [158px FIXED label] + [N cells, layoutSizing FILL].
cell = VERTICAL auto-layout of its elements. Add phase = append 1 header + 1 cell/row
(FILL renarrows columns). Add lane = insert 1 lane row before pain row. NEVER absolute x/y.

## JOURNEY (NXT page 75:2) - DONE
- BASE 75:3 (1920x1080, 5 phases x 3 lanes, absolute - legacy gold)
- PPTX TWIN 75:127
- T2 244:2 - richer evidence (cell-internal: touchpoint + emotion per cell)
- T3 247:2 - more structure: KPI dashboard (Routed / Five / Doc-first) + AUTO-LAYOUT
  matrix 267:2 grown to 6 phases (NOTICE/SEARCH/CONTACT/WAIT*/RESOLVE/FOLLOW-UP, WAIT=critical
  accent) x 4 lanes (CUSTOMER/SUPPORT AGENT/PRODUCT TEAM/QUALITY OPS) + pain row.
  Frame height 1560. Audited: columns FILL-even, cells wrap, NO collision. WAIT col chartreuse.
  PROVES the conversion: added 6th column + 4th lane, reflowed automatically.

## REMAINING
- [ ] Convert BASE journey gold 75:3 matrix to auto-layout (it is the runtime-cloned substrate;
      currently absolute). Risk: in-place reparent of existing absolute cells -> safer to rebuild
      the matrix region as auto-layout in place.
- [ ] service-blueprint: same swimlane x phase matrix -> auto-layout substrate + a growth tier.
- [ ] Mirror journey T3 auto-layout matrix to NU file (z2v9Pvhg23hlljEitPBdAt) journey page.
- [ ] HTML/PPTX twin note: HTML twin grows taller; PPTX twin compresses rowHeight to 16:9 budget.
