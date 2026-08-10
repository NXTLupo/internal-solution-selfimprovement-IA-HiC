---
id: brand/design-laws.md
title: HiC Design Laws (the Design Constitution)
type: brand
updated: 2026-08-07
---

# HiC Design Laws - the Design Constitution

Twelve laws governing every HiC deliverable surface (GOLD pages, `slides:` decks, diagrams,
prototypes, exports) and the design system that produces them. Generalized 2026-08-07 from the
Plan Pulse design process (`NXT-Humans/client-bc-pulse-design`) per
`plans/sota-elevation-loops-caching-rsi-okf-2026-08-07.md` item D1. Each law is phrased so the
`hic-design-lint` skill (D3) can check it mechanically and emit PASS / FLAG with one line of
evidence.

Violating a law = fix it, or log it in `design-desk/deviation-register.md` with what / why /
who-approved / until. SILENT deviation is the only prohibited move. Settled arguments live in
`design-desk/adr/`; do not reopen one without a superseding ADR.

Ownership: the Figma foundation tier (the `NXT Brand Tokens` collection in
`iSQhAVM7SI4QHAWB7y9C2z`, both modes NXT 221:0 / NU 535:0) is owned by Jonathan. Everyone
else, agents included, is read-only on tokens; agent token-edit proposals go through the gated
sync diff (D6), never direct edits.

## Law 1 - Tokens only
Every color, radius, spacing value, and font on every brick and every rendered deliverable
binds a token resolved from `/api/design-tokens` (`figma-tokens.json` canon; Figma variables in
the library). No raw hex, no detached styles, no off-ramp px font sizes. Sanctioned exception:
`App/Brand/*` marks (intentionally unthemed; ADR-0002). Chart series use chart tokens.
*Check (Figma):* selected node fills/strokes/typography show variable chips, not swatches
(`get_variable_defs` cross-check). *Check (render):* every computed font-size/color/spacing on
the #stage HTML resolves to a token value (D3(b) export audit; detect-only until ~2026-08-21,
then a hard export gate per owner decision 10).

## Law 2 - Lean composition from registered bricks
Compose deliverable surfaces from the registered brick/archetype catalog (the `DS/*` families,
`wiki/brand/figma-node-map.md` registry, `slideComposer.ts` ARCHETYPE_SPECS). Never redraw a
brick, never detach an instance, never hand-build a one-off that a registered brick covers. A
brick that fights the content is a LIBRARY GAP: flag it (page-level exception or promotion
candidate per Law 3), never a silent workaround.

## Law 3 - Frozen brick APIs + the promotion rule
Published brick prop/slot APIs are frozen: no renames, no removals, no option-meaning changes
without an unfreeze ADR. Additive is free (new bricks, new variants, new optional slots). A
composition is PROMOTED to a registered brick when it appears in >=2 deliverable contexts AND
(composes >=2 primitives OR adds product-specific structure). One-offs stay page-side
compositions. Every published brick carries a usage-contract description in Figma; read it
before instancing.

## Law 4 - One data story
Every figure on every surface derives from the engagement corpus and appears ONLY inside a
verbatim cited quote (the Quantitative Claim Rule in `.claude/CLAUDE.md` IS this law). Numbers
that appear on two surfaces must agree. No fabricated chart data, benchmarks, or stat tiles.
*Check:* extract every number; each must trace to a cited chunk quote or be a FLAG.

## Law 5 - Evidence stated, not implied
Citations resolve to real named sources selected from the enumerated, credibility-ranked
candidate set (V3 citation-as-selection: HARD on deck/artifact surfaces, detect-only in chat
prose for one cycle, per owner decision 6). "Evidence" as a label is followed by a verbatim
corpus quote with attribution or the label is not used. Generic references ("research",
"studies") never ship.

## Law 6 - Provenance on every exhibit
Every exhibit's claims trace to per-chunk source lineage (the WS-A `sources:` contract read at
cite time). Diagram and infographic content is composed from the payload's own corpus-derived
fields (D17: native render, never image-gen for exhibits; the infographic-composer depth
contract governs `slides:infographic-exhibit`).

## Law 7 - Honest gaps
Missing evidence = narrow the section around what IS evidenced. Never fabricate; never render
QA annotations ("EVIDENCE GAP", "TBD", "[needs baseline]") in any user-visible field. If
coverage is bounded (top-N, sampling), internal telemetry records what was dropped; the reader
never sees the model's notes about what's missing.

## Law 8 - Data geometry is instance territory
Bricks carry anatomy; instances carry data. Arc sweeps, meter fills, bar heights, matrix
dimensions are per-instance data or page-side composition, never baked into a component.
Fixed-children bricks never grow inside instances; lists compose row bricks in a page wrapper.
GOLD matrices use Figma auto-layout for dimension growth, never absolute x/y (standing rule).

## Law 9 - Controls carry interaction contracts
On interactive surfaces (#proto, prototype viewer): every control ships with a stated
interaction contract (what recomputes when it changes) honored in the build. No decorative
controls: if it cannot recompute, it does not ship. (Generalized from Plan Pulse Law 9 /
consultant P2, the single most damaging trust failure their reviews found.)

## Law 10 - Graphic collision bans
No SVG line/path through a node's bounding box; no label intersecting a graphic primitive; no
absolutely-positioned siblings converging on one coordinate; CSS grid/flex preferred over
absolute SVG coordinates for tiers, swimlanes, matrices; 16px exclusion zones and edge-
terminated connectors on true SVG diagrams. (Already law in `.claude/CLAUDE.md`; folded in
here so the lint checks it alongside the others.)

## Law 11 - The grid and the ramp (2026-08-07, owner-directed)
Every 1920x1080 artifact surface lays out on the NATIVE 12-column grid: column 120, gutter 20,
left margin 172, right margin 88, content zone 1660 wide, baseline unit 4. In Figma the grid is
a real `layoutGrids` entry on the frame and every grid value is a `grid/*` variable
(grid/columns 12, grid/columnWidth 120, grid/gutter 20, grid/baseline 4, grid/marginLeft 172,
grid/marginRight 88, grid/marginTop 58, grid/rowGap 20, grid/sectionGap 40, grid/titleY 140,
grid/contentY 260, grid/bandY 930-944, grid/footerY 1004-1012). Columns and matrix cells span
whole grid columns (a 5-stage swimlane = label 260 + five 260 cells at 20 gutters; a 4-stage
blueprint = label 260 + four 330 cells, both filling 1660 edge to edge).
The TYPE RAMP is variable-bound, larger-by-default, and closed (no off-ramp sizes):
kicker mono SemiBold 17/+5px cyan UPPERCASE (ONE per artifact; eyebrows are banned as AI slop);
hero display Saira 120; interior titles Saira 66 UPPERCASE; dek/lead Archivo Regular 32/150;
body Archivo Medium 28/140 (the DEFAULT reading tier - body below 20 is a lint FLAG);
dense-matrix cell text Archivo Medium 20/132 (swimlanes, blueprints, tables ONLY);
labels Archivo Medium 20/+1.5 UPPERCASE; meta mono 15; micro mono SemiBold 15/+3; nano 13
(footer chrome only). Weak, diminutive body text is the #1 reader-flagged AI-slop tell:
when in doubt, size UP and weight UP.
*Check (Figma):* frame carries layoutGrids; text sizes show variable chips on the type/* ramp.
*Check (render):* computed body font-size >= 28px on prose surfaces, >= 20px in dense matrices.

## Law 12 - Content-true imagery in every img-slot (2026-08-07, owner-directed)
Every `img-slot` in every exemplar ships FILLED with an exemplar image, and every img-slot in a
generated deliverable ships with a GENERATE instruction that derives a SIMILAR image solely
from the deliverable's own research content (the corpus analyses), never stock, never
decorative, never generic. Treatments by slot kind: journey/blueprint phase strips = flat
line-art illustration of THAT phase's evidenced moment (transparent, brand accent, no text);
cover backgrounds = full-bleed editorial photography of the deck's actual subject at ~28%
opacity under text; persona portraits = photorealistic editorial portrait derived only from
research-evidenced demographics and behaviors (neutral background, natural light, no text);
persona lifestyle strips = 2-3 photo scenes each visualizing ONE evidenced behavior (the
GENERATE prompt quotes the behavior; no readable faces, no embedded text). The runtime lane is
the proxy `/api/ai/illustration` (styles: line | photo-background | photo-portrait |
photo-scene, literal=true for content-derived concepts). Every GENERATE instruction carries a
mandatory DERIVED FROM clause quoting the deliverable field it depicts (theme insight, phase
pain, persona behavior, recommendation action) plus a SOURCE ANALYSIS name; a bare topic word
is a violation - the image depicts the FINDING, not the industry. REUSE FIRST (owner cost
rule): query the illustration catalog (GET /api/ai/illustrations) for a content-matching image
before generating; the lane reuses by concept id automatically. An empty grey img-slot in a
shipped deliverable is a gate violation; an image whose concept does not trace to deliverable
content is a Law 6 provenance violation.

## Process pointers
- Design-SYSTEM changes (new brick, archetype, template, visual family) walk the D4 gate
  spine G0-G5: spec -> sandbox + self-lint -> persona judge -> owner review -> promote/publish
  -> renderer twins + coverage ledger. Every gate leaves a trace. No skipping.
- Lint runbook: `.claude/skills/hic-design-lint` (D3). Deviations:
  `design-desk/deviation-register.md`. Decisions: `design-desk/adr/`.
- Brick <-> renderer coverage: `wiki/brand/brick-coverage-ledger.md` (D5); parity enforced by
  `scripts/check-template-parity.mjs`.
