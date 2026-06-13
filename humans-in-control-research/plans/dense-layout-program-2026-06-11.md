# Dense-Layout Program (2026-06-11) - from shrink-to-fit to DESIGNED density

## Verdict (reinforcement-inference, anchored on 7 rounds of export failures)

User's 15-slide live deck: 10/15 slides CLEAN under the new pipeline; the 5
failures cluster in exactly two payload shapes the stress fixtures did not
cover (recommendation with FOUR supporting actions + impact grid; table
headers with multi-line definitions). The pattern across ALL seven failure
rounds is now undeniable: BASE layouts assume base content; real generations
are dense; tight-modes (shrinking type/budgets inside the base structure)
are the anti-pattern - each new payload shape finds the next seam.

COMMITTED DIRECTION (user-proposed, RI-confirmed): purpose-built CONTENT-DENSE
layout variants per artifact - different STRUCTURE, not smaller fonts:
- recommendation-dense: full-width stacked action rows; impact grid as a
  horizontal band; evidence as a bottom strip (no two-column squeeze)
- stat-row-dense: 2x2 quadrant grid (4+ stats) or stats-left/insight-right split
- competitive-matrix-dense: definitions row merged into header cells as one
  text flow (kills the th/def collision class)
- journey/blueprint already have fill-grid structures (keep)
- each variant designed in FIGMA FIRST (both brands), then twinned

## The honest Figma answer (recorded for the user)

Three different layers, three different truths:
1. TOKENS (colors/fonts/washes): DETERMINISTIC from Figma - extracted via
   Figma MCP from the live token sheets (NXT 223:2 / NU 97:2) into
   figma-tokens.json, served by /api/design-tokens, hydrated into BOTH brand
   objects at boot and injected per-brand into every chat generation.
2. LAYOUT GEOMETRY: code twins (slideToStageHtml.ts / goldPreviews.tsx)
   AUTHORED AGAINST the Figma GOLD exemplars and screenshot-verified against
   them - but not mechanically derived from Figma at runtime. The Figma file
   is the design source of truth; the twin is a human-maintained mirror.
3. PPTX EXPORT: the Python exporter RECREATES NOTHING - it measures the
   rendered stage DOM (Chromium) and transcribes text runs + geometry rects
   1:1 into native PPTX shapes. Fidelity = twin fidelity.
The dense-layout program tightens layer 2: every dense variant gets a Figma
exemplar FIRST, and the manifest pattern page records the structure the twin
must mirror.

## Workstreams

W1. Figma dense exemplars (7-step routine, both brands): recommendation-dense,
    stat-row-dense, competitive-dense, block-quote-dense, prd-dense,
    persona-dense + register in figma-node-map + pattern pages re-chunked.
W2. Twins: implement each dense variant as a DISPATCH branch keyed on the
    existing density axis + payload shape (e.g., recommendation auto-routes to
    dense when actions>=4 OR (actions>=3 && evidence>=2 && grid)) - replacing
    the tight-mode shrink heuristics. Preview + stage + pptx fallback together.
W3. Model instructions: the slide protocol + render contract teach WHEN to emit
    density=dense (content volume signals) and the manifest pattern pages carry
    the per-variant budgets; contextual instructions vary by user prompting
    (e.g. "detailed/comprehensive" -> dense) married to the right template.
W4. Harness: add the two new failure shapes (4-action recommendation; multi-line
    th defs) as permanent fixtures NOW; every dense variant ships with its own
    stress fixture; audit + artifact assertions unchanged (they work - they
    caught everything once pointed at the right payloads).
W5. Self-improvement: feed this program through skillopt after W1-W3 land so
    the analyst-desk model learns the density routing from real usage.

## Interim state (shipped through 2026-06-11)

Exporter: fill schema-order fixed, theme-style stripped, alpha correct,
single-line box hug, one-line slack cap. Stage: clipping canvas (no silent
bleed), trunc() budgets, tight-modes (to be REPLACED by W2 dense structures).
Proof artifact delivered to user: HiC-parity-proof_44-slides (44 slides, all
templates x both brands, 0 gross overlaps, 0 fill/theme/citation defects).
Remaining known failures (user's 15-slide deck): rec-4-actions (slides 8/14),
matrix th-defs (slide 10), pattern-signal footer near-miss (slides 1/3) - all
owned by W1/W2 structures.

## W1 progress (2026-06-11)
recommendation-dense SHIPPED both brands: NU 194:3, NXT 319:3 - screenshot-audited,
variable-bound, registered in figma-node-map (chunked). Structure: 4 full-width
action rows + horizontal impact band + evidence strip + takeaway band; absorbs the
exact 4-action+grid payload that broke deck_2026-06-11_15_slides slides 8/14.

stat-row-dense SHIPPED both brands: NU 198:3, NXT 321:3 - quadrant grid (4 accent
top-border stat cards: Bebas value 64 / label / means / mono source bottom-pinned)
+ dark insight column 592px (CONVERGENT INSIGHT + PATTERN). Replaces the tightS
shrink mode for full payloads. Route: stats>=4 OR (stats>=3 AND all means+matters
AND insight+pattern).

competitive-dense SHIPPED both brands: NU 198:57, NXT 321:57 - header cell is ONE
vertical stack (mono name + sans def, single flow; kills the slide-10 th/def
collision class), 330px competitor column with merged 12px note under the name,
8 peer rows, dot tiers, subject row ecru. Route: columns carry definitions OR
rows>6 OR rows carry notes.

block-quote-dense SHIPPED both brands: NU 199:3, NXT 322:3 - three convergent-voice
quote cards + ecru synthesis band. Route: quotes>=3.

prd-dense SHIPPED both brands: NU 199:50, NXT 322:50 - two deep feature cards
(number + priority chip / italic user story / 4 acceptance criteria / DEPENDS ON +
SIGNAL footer); the paginator's 2/slide recipe rendered. Route: userStory + >=3
criteria.

persona-dense SHIPPED both brands: NU 199:124, NXT 322:124 - dark identity column
(name/descriptors/defining quote/stakes) + 2x2 GOALS/PAINS/BEHAVIORS/WINS grid.
Route: >=3 of the four evidence arrays present.

journey-phase-spotlight SHIPPED both brands: NU 200:3, NXT 323:3 - 10-segment
phase strip w/ active fill + WHAT HAPPENS column w/ per-actor rows + STRUCTURAL
PAIN block + 3 verbatim quote cards. The W0 paginator's per-phase continuation
target. Route: phase carries >=2 verbatim quotes.

theme-index SHIPPED both brands: NU 200:72, NXT 323:72 - 5x2 grid, load-bearing
themes inverted dark w/ accent top border, orbit themes hairline paper. The W0
paginator's theme overview page. Route: themes>=8.

W1 COMPLETE (6 dense pairs + 2 decomposition-target pairs, 16 frames total
across both brands, all variable-bound + screenshot-audited).

## W2 SHIPPED (2026-06-11): dense twins replace shrink heuristics

Six dense dispatch branches in BOTH twins (services/slideToStageHtml.ts +
components/slideTemplates/goldPreviews.tsx), each keyed on its W1 routing
predicate, each mirroring its GOLD exemplar pair:
- stat-row: renderStatRowDense (quadrant grid + dark insight column).
  tightS shrink mode DELETED.
- recommendation: renderRecommendationDense (full-width numbered action rows
  + impact band + twin evidence cards). tightR shrink mode DELETED.
- competitive-matrix: header name+def and competitor name+note now ONE
  pre-line text element per cell (one text box in PPTX; kills the th/def
  collision class). Applied always, not predicate-gated.
- block-quote: renderBlockQuoteDense (3 voice cards + WHERE THEY CONVERGE
  band). New BlockQuoteData fields additionalQuotes[] + synthesis.
- prd-feature: renderPrdFeatureDense (2 full-depth cards w/ user story +
  square-tick criteria + technical/stakeholder footer).
- persona-card: renderPersonaCardDense (dark identity column + 2x2
  GOALS/PAINS/BEHAVIORS/WINS quadrants). New PersonaCardData fields
  behaviors[], winConditions[], descriptors, stakes.

CRITICAL FIX shipped with W2: dense routing reads the RAW payload arrays.
Slicing to _caps BEFORE routing both masked the >=4 predicates AND silently
dropped the 4th evidenced action (caught by screenshot audit: fixture had 4
actions, render showed 3). Constraint: route first, cap only inside the
chosen branch.

Glyph-metric rule: Bebas/Lora display numerals and quote marks use
line-height:normal; any fixed line-height under ~1.33 leaves
scrollHeight>clientHeight on the leaf (audit LEAF +7v class).

Verified: tsc clean; vitest 79/79; 52/52 dual-brand stages render; overflow
audit v3 CLEAN (incl. 12 dense-route stress stages: 4-action rec, 3-stat+
insight, 3-voice quote, 2-deep-PRD, dense persona, both brands); live
/api/gold/export-pptx-multi on all 12 dense stages -> 0 gross overlaps,
0 fill-order defects, 0 p:style, 0 pointer leaks, 0 em-dashes. Proof deck:
Downloads/HiC-W2-dense-layouts_12-slides_both-brands.pptx.

W3 SHIPPED (2026-06-11): DENSE PAYLOAD FIELDS block added to the slide
protocol in corpusChatService (after the DECOMPOSITION RULE): per-template
instructions for emitting additionalQuotes/synthesis (block-quote),
behaviors/winConditions/descriptors/stakes (persona), full 4-6 action
recommendations, 4-stat rows, 2-deep PRD features; all framed as evidence
carriers from the corpus, never layout filler. W4 SHIPPED: 4 dense-route
stress fixtures (4-action rec, 3-voice quote, 2-deep PRD, dense persona) are
permanent in _render_all_templates.mts; fixture filenames carry _id suffixes
to prevent collisions.

ALSO FIXED (2026-06-11, root-cause find during W2): proxy/wiki_chunker.py
upsert_chunks_into_frontmatter used `chunks:\\s*` whose \\s consumed the
newline + first item indent, so every re-chunk APPENDED a chunks block and
orphaned the previous one. This single regex corrupted 8,367 wiki pages
(duplicate/orphaned chunk frontmatter) including learned-constraints.md (13
copies) and TRUNCATED 4 synthesis pages to frontmatter-only. All repaired
(bulk strip of orphans, 4 pages restored from git aaac2e0e), regex fixed to
[ \\t]* + self-healing orphan sweep, research-proxy rebuilt. Wiki-wide check:
0 pages with duplicate chunk frontmatter.

REMAINING: W5 skillopt rerun; journey-phase-spotlight + theme-index code
twins (the W0 paginator currently emits journey continuations + theme
clusters via existing templates; the two W1 exemplars become dedicated
variants in a later increment). Audit-harness note: http.server caches stage
iframes - ALWAYS serve the audit from a fresh port after re-rendering.

## W0 (added 2026-06-11, user direction): UNBOUNDED density = multi-slide DECOMPOSITION

User: dense layouts must also cover 10-phase journeys, 3 quotes/phase, 10 themes,
deep PRD stories, 4-level orgs, 20-slide presentations. A single 16:9 has a PHYSICAL
ceiling; the architecture above the ceiling is PAGINATION, not bigger layouts:

  base layout -> dense layout (structural, W1/W2) -> DECOMPOSITION (overview slide +
  detail slides per segment) - never cram, never drop evidenced items.

Three layers:
1. CONTRACT (SHIPPED): DECOMPOSITION RULE added to the slide protocol in
   corpusChatService with per-artifact recipes (journey overview + 4-5-phase detail
   slides + per-phase quote slides; theme index + clusters of 3-4; case-study
   deep-dive + evidence-stack continuation; max 2 deep PRD features/slide; org
   overview + branch slides; 20-slide decks budgeted by SCQA section first).
2. CODE GUARD (W2 scope, replaces silent slicing): renderers currently
   .slice(0, caps) which DROPS evidence - violates the density constraint. Replace
   with an auto-paginator at parse time: a payload exceeding dense ceilings splits
   into overview + continuation SlideData before render, deterministically.
3. FIGMA (W1 scope additions): journey "phase spotlight" (1 phase + its quotes) and
   "theme index" (8-12 theme grid) exemplars; continuation patterns already exist
   (evidence-stack, theme-spotlight, journey T3 overview).

## W0 SHIPPED (2026-06-11): deterministic auto-paginator

services/slidePaginator.ts: pure paginateSlide()/paginateSlides() with per-template
ceilings + segment sizes. Recipes implemented: journey-map (stages>6 -> overview w/
dashboard+tiles+insight + continuation matrices of 5, lanes/pains sliced in
alignment), service-blueprint (>5 -> 4s), theme-cluster (>4 -> 4s, patternSignal p1),
timeline (>6 -> 5s), gap-matrix (>10 -> 8s), competitive-matrix (>10 -> 8s with the
SUBJECT ROW REPEATED on every page), systems-inventory (>14 -> 12s), prd-feature
(deep stories -> 2/slide, shallow -> 5s), case-study (evidence>4 -> deep-dive +
evidence-stack continuation), recommendation (actions>6 -> sibling slides, impact/
evidence/implication on p1). Continuation titles keep the conclusion + " · part N of
M". Wired into parseSlideBlocks (CorpusChatPanel) so every chat-parsed slide flows
through; failure falls back to the unsplit slide, never breaks parsing.

Verification: 6 unit tests (no item dropped, lane alignment, subject-row repeat,
under-ceiling untouched); 10-phase/3-lane journey fixture decomposed 1->2, both pages
screenshot-audited (p1 = overview w/ dashboard + phases 1-5; p2 = full-canvas detail
matrix 6-10, critical FIRST FAILURE accent, part-2 title), DOM overflow+collision
audit NONE/0 on both, live export 0 gross overlaps / 0 leaks; full suite 79/79;
container rebuilt. The renderer-level .slice() caps remain as a final guard but are
no longer the operative ceiling - the paginator splits BEFORE render.
