# #slides Strategic + Visual Uplift (native-shape doctrine, Figma-canon closure)

Date: 2026-07-09. Status: PROPOSED (no code changed). Method: three parallel code audits
(generation / export / heuristic-Figma-binding) + visual inspection of live output
(deck_2026-07-09_61_slides.pptx) + two owner reference decks (capabilities_slides.pdf,
Farm_Risk_Ready_2026.pdf) -> verbalized sampling (k=5, VS-CoT, moderate-tail) over uplift
architectures -> reinforcement inference on the winner. Unified-vision phases advanced:
(8) componentized design-system-governed output, (9) globally-native PPTX, (6) one routing
authority untouched, (4) manifest as grounding. Owner constraints binding throughout: no
static or hardcoded PowerPoint elements (native shapes), never violate the unified vision,
learn imagery/iconography/clean language from the reference decks while enforcing
single-family type per tier (the references' own font mistakes are the anti-example).

## 0. Audit verdict (what is actually wrong)

The token PIPE works; the system fails on PROVENANCE, VISUAL BRICKS, and RASTER CREEP.

GENERATION (agent 1):
- G1. Of 16 model-selectable archetypes, ONLY slides:infographic-exhibit produces a true
  diagram, and it ships as a raster. No quadrant, flow, funnel, journey-visual, or chart
  archetype exists. "Variety" = column-count rotation over text (slideComposer.ts:513-1002).
- G2. All archetype-selection intelligence is one prose blob in the DECK MODE prompt
  (corpusChatService.ts:3831-3832) - unversioned, untested, not a skill.
- G3. deck-narrative-composer SKILL describes a 12-content-block architecture the codepath
  never uses; #presentation injects it ALONGSIDE the archetype contract = two conflicting
  output schemas in one prompt.
- G4. Schema conflict: catalog says steps:[{name}], prompt+skill say steps:[{title,
  description}] (slides-component-manifest.md:168 vs corpusChatService.ts:3831).
- G5. 4 composer archetypes (scene, infographic-exhibit, screen-critique, screen-redesign)
  have NO Figma node; the parity test iterates only the 14 registered ones, so composer
  drift 14->18 passed the "universal Figma grounding" gate silently
  (figmaRegistryParity.test.ts:174-206).
- G6. Geometry = hand-tuned absolute px with a tail of collision comments; fit depends on
  generation-side char budgets, no measured clamp for most fields.
- G7. Imagery carriers (backgroundImage/itemImages/heroImage/exhibitImage) are runtime-owned
  and fail-open: when the image lane no-ops the deck silently degrades to flat text.
- G8. Infographic floor is presence-only (1 per 8+ slides); a 12-slide deck with 11 text
  slides passes.

EXPORT (agent 2) - the "native shapes" gaps:
- X1. TRUE VECTOR NEVER SHIPS: zero .svg media across all 23 real decks; logo, dot-mark,
  and every structural SVG rasterize (only .brandlogo even attempts markup serialization,
  gold_pptx_export.py:117).
- X2. D17 diagram bodies (journey/arch/mindmap/blueprint) = one full-bleed PNG each; zero
  native shapes for their content (nxt_diagram_render.py -> fullBleedImageDoc,
  slideToStageHtml.ts:2374-2385, object-fit:cover can CROP the diagram).
- X3. Infographic-exhibit panels raster via Chromium though their bodies are simple
  flex/grid (nxt_diagram_render.py:483-575) - re-expressible as native regions.
- X4. Nano-Banana DIFFUSION concept art is baked into descriptionless process-flow rasters
  (app.py:19145-19210) - a model-generated static image inside a deliverable exhibit;
  direct violation of the no-static rule and the content-true-icon doctrine.
- X5. Audit screenshots + numbered discs are pixel-baked because the GEO walker cannot
  layer shapes above pictures; proposedImage (a TOKEN-BOUND composition!) flattens to a
  raster (auditCritiqueDeck.ts:279-321, 175-190).
- X6. Hardcoded export constants: color fallback 141414, font fallback "Archivo", 8pt
  floor, PW=1.14 (gold_pptx_export.py:822-851); font manifest duplicated in two files +
  runtime-monkeypatched, with an inconsistent mono face in nxt_diagram_render (JetBrains
  vs IBM Plex).
- X7. validate_pptx_native only WARNS (never blocks); translucency/effect helpers are
  soft-imports that degrade silently to opaque fills (gold_pptx_export.py:429-465,
  671-674).
- X8. EXPORT-INTEGRITY BUG (live): proxy logged "61 slides -> deck_2026-07-09_61_slides
  .pptx" but the written file contains 15 (zip-verified; runs pattern shows ~4 repeated
  generation blocks). Either a silent save-path loss or index overwrite; also the export
  walks ALL generations in a chat instead of the latest.

HEURISTIC / FIGMA BINDING (agent 3):
- H1. screen-critique + screen-redesign - the two archetypes carrying the ENTIRE audit
  deck - were invented in code; no Figma node, "write-back pending" comment
  (slideComposer.ts:606).
- H2. The "manifest-chunked grounding path" is fiction: heuristicAnalysisService imports
  the TS mirror; nothing reads the wiki PROPOSED-RENDER REGISTRY chunk, and that wiki
  table is 13 patterns stale (22 vs 35).
- H3. Fidelity axes silently skip when /api/audit/render-proposed fails (auditGate.ts:283
  fires only if a fidelity report exists).
- H4. Three registry twins (proto_partials REGISTRY / proposedRenderRegistry.ts / wiki
  table) with no parity gate; NU lacks the rust token (live #cc6644 fallback); marker
  disc font-size:15px literal (slideComposer.ts:256).

LIVE OUTPUT + REFERENCES (visual audit, scratchpad slides-visual-audit.md):
- V1. s14: topic-label title "STRATEGY" (action-title violation), page number "14"
  (metadata-chrome ban), caption clipped under body text (collision).
- V2. "leveraged" passive slipped the anti-slop scrub (thesis slide).
- V3. A 3-phase process rendered as three text columns + stock photos - inherently
  diagrammatic content with no diagram brick to land on (G1 made visible).
- REF learnings (capabilities + Farm PDFs): title-line content-true line-art glyph beside
  the action title; wordmark top-right on content slides; MEANS/MATTERS two-layer stat
  anatomy with dark MATTERS cards + single bottom source line; per-column inline
  photography; terse founder voice. Their FONT MISTAKES (Arial body vs Saira titles,
  mid-sentence family switches, hyphen-break artifacts) validate hard token-tier
  enforcement - learn the layout language, never the type treatment.

## 1. Verbalized-sampling trace (k=5, VS-CoT, moderate-tail; modal first)

| # | Architecture | p | Disposition |
|---|---|---|---|
| A | Patch list: fix each audit finding in place (bugs, floors, ad-hoc archetypes) | 0.30 | MODAL - adopt only its P0 hygiene (WS-0); patching cannot lift the visual ceiling (G1) |
| B | NATIVE VISUAL TIER: re-express infographic + D17 diagram families as native slideComposer region specs; new diagram archetypes; true-vector SVG embeds; diffusion art deleted | 0.12 | ADOPT - the core of "no static elements, native shapes" (WS-1) |
| C | SELECTION GOVERNANCE: content-shape declarations + deterministic post-parse quota/variety enforcement (the collapseAndScore pattern applied to deck planning); skills converged to ONE versioned deck-composer skill | 0.10 | ADOPT - the "strategic" lever; prompts propose, code disposes (WS-3) |
| D | CANON WRITE-BACK + ONE REGISTRY AUTHORITY: every archetype gets a Figma node (write-back new frames 609:16+), single generated registry with bidirectional parity gates | 0.08 | ADOPT - closes the provenance gap the owner keeps hitting (WS-2) |
| E | DECK IR + measured auto-fit layout engine (kill char budgets) | 0.05 | DEFER - highest risk/effort; take only the measured-clamp subset into WS-1; full IR is a later program |

Synthesis = B x C x D on A's hygiene base; E reduced to measured clamps.

## 2. Reinforcement-inference trace (self-critique of the winner)

selfAssessment: overallConfidence = medium-high.
leastDefensibleClaims:
1. "D17 diagram families can render as native shapes." PARTIAL - bars/flows/matrices/
   quadrants are rects+runs (evidence-table and aggregate-roadmap prove the primitives);
   line/scatter/area curves are NOT rect-expressible. RESOLUTION: two-tier doctrine -
   rect-class diagrams go native; curve-class ships as TRUE VECTOR SVG blips (X1 fix
   makes SVG-in-PPTX real vector, which is still "native, editable-in-place, zero raster").
   D17 is superseded for decks: native shapes first, vector SVG second, raster NEVER for
   diagram bodies (photography and audit screenshots remain the only raster classes).
2. "The GEO walker can layer native discs above pictures." VERIFY EARLY - requires a
   z-order pass (pictures first, overlay shapes after); python-pptx supports ovals+text;
   risk is walker classification, not PPTX. Prototype in WS-1 week 1; fallback = keep
   baked discs (owner-accepted today) without blocking the rest.
3. "Deterministic quota enforcement won't fight the model." The heuristic pipeline's
   collapseAndScore + gate proved the pattern: model proposes, code disposes, repair
   re-asks with the gaps named. Same loop here (deck plan gate + one repair pass).
4. "Figma write-back effort is bounded." 6-8 new frames (2 critique + 4-5 diagram
   archetypes + badge component) matches the 2026-06-27 GOLD write-back program's pace;
   variants included per the elegance bar.
5. "61->15 is an exporter bug." UNPROVEN - could be repeat-generation overwrite by slide
   index. WS-0 starts with reproduction + a post-save count assertion either way.

## 3. Workstreams

### WS-0. Integrity + hygiene hotfixes (P0, before any new capability)
- 0a. Root-cause 61->15: reproduce a multi-generation chat export; assert
  len(prs.slides) == len(payload) after save and FAIL the request on mismatch (hard gate,
  not a warning). Scope "Export Deck PPTX" to the LATEST deck generation by default
  (message-scoped fences), with an "export all generations" toggle.
- 0b. validate_pptx_native -> hard gate (raise on picture-only slide / zero-run deck);
  hard-require the alpha-fill + effect-suppression helpers (no soft import).
- 0c. Missing fidelity report = PROPOSAL-BELOW-FLOOR (auditGate.ts:283), never a skipped
  axis.
- 0d. Unify the infographic steps schema to {title, description} in the catalog
  (slides-component-manifest.md:168) - one contract everywhere.
- 0e. Anti-slop: add passive/inflected banned forms ("leveraged", "leveraging" already
  present - extend detector to word-boundary stem match) at the slidePostProcessor
  chokepoint.
- 0f. Photographic case-study template: action-title enforcement (no topic labels), kill
  page-number chrome, fix the caption/body collision (V1 - locate the template that
  produced s14 and clamp its caption region).
- 0g. Export constants from tokens: ink + body-font fallbacks from brandTokens payload;
  ONE shared font manifest module consumed by gold_pptx_export + nxt_diagram_render
  (fixes the IBM Plex vs JetBrains mono split).

### WS-1. Native visual tier (the no-static core; supersedes D17 for deck bodies)
- 1a. Re-express the five infographic families (stat-row, process-flow, comparison,
  ranked-bars, composition) as NATIVE slideComposer region specs - they are flex/grid
  layouts (X3); ranked-bars = proportional rects; process-flow = numbered cards +
  connector rects; composition = stacked rects. exhibitImage becomes a legacy carrier for
  old decks only.
- 1b. NEW native diagram archetypes (Method A specs + Figma write-back in WS-2):
  slides:quadrant (2x2 with plotted labels), slides:flow-arc (3-6 step process with
  connectors - V3's missing brick), slides:milestone-timeline (visual time axis),
  slides:means-matters (the Farm stat anatomy: hero numerals + MEANS body + dark MATTERS
  cards + single source line), slides:journey-strip (deck-native journey matrix, porting
  the SPA's in-table geometry).
- 1c. TRUE VECTOR PIPELINE: extend the GEO walker's SVG serialization from .brandlogo to
  ALL structural SVGs (dot-mark, charts); verify svg-blip embeds open editable in
  PowerPoint; curve-class charts (line/scatter/area) ship as vector SVG, never PNG.
- 1d. DELETE the Nano-Banana step-art path (app.py:19145-19210) - descriptionless
  process-flows get the content-true glyph or nothing (isContentTrueIcon doctrine).
- 1e. Overlay z-order pass in the GEO walker: pictures first, absolutely-positioned
  overlay shapes above - unlocks native numbered discs (ovals + runs) on audit
  screenshots and native badges anywhere. RI-2 prototype-first.
- 1f. Proposed renders export native: route screen.proposedRender's token-bound HTML
  through the stage walker as a sub-stage (shapes + runs), replacing the PNG flatten
  (H/X5); the raster remains only as chat-preview cache.
- 1g. Measured clamps (E-subset): the three highest-overflow regions (numbered-themes
  items, evidence-table cells, role-* bodies) get measure-and-scale-down-to-floor at
  compose time instead of relying on char budgets alone.
- 1h. REF chrome: wordmark top-right on content slides (layout-hoisted, native); optional
  title-line glyph slot (content-true line-art SVG -> vector embed; model names a concept
  from the composable-icon manifest, renderer resolves - never invents).

### WS-2. Figma canon write-back + one registry authority
- 2a. Write back Figma frames for the unregistered archetypes: screen-critique,
  screen-redesign (H1), scene, plus every WS-1b addition - variant-complete, elegance
  bar, on the SLIDES SYSTEM pages as 609:16.. ; register in figma-node-map + registry.json.
- 2b. Badge/marker component (annotation disc) as a Figma component; disc geometry +
  15px literal resolve from its harvest (H4).
- 2c. NU rust token added in Figma + re-pulled into figma-tokens.json (or rust dropped
  from NU partial styling) - no live literal fallbacks.
- 2d. Registry authority: ONE source JSON generates BOTH proposedRenderRegistry.ts and
  the wiki PROPOSED-RENDER REGISTRY table (build step), with a parity test across
  proto_partials.REGISTRY / TS mirror / wiki chunk (H2, H4). The wiki page stays the
  manifest-retrievable grounding twin and can no longer go stale.
- 2e. figmaRegistryParity becomes BIDIRECTIONAL: iterate composer keys too; an archetype
  without a registry node fails CI (G5).

### WS-3. Strategic selection governance + skills convergence
- 3a. ONE deck-composer skill (version-controlled) absorbing: the SELECTION DOCTRINE,
  archetype-by-content-shape table (incl. the new diagram bricks), infographic depth
  contracts (infographic-composer folds in as the exhibit section), visual-variety
  quotas, REF language rules (terse founder voice, MEANS/MATTERS anatomy usage). The
  DECK MODE prompt injects THIS skill; deck-narrative-composer is rewritten to the
  archetype architecture (its VS-k3 narrative technique and storytelling floors are kept)
  or retired for #slides surfaces - never two contracts in one prompt (G2, G3).
- 3b. Content-shape planning contract: the model emits a one-line plan block per slide
  (shape: process|comparison|distribution|single-subject|assertion|evidence-mix) BEFORE
  fences; deterministic post-parse gate (deckPlanGate) enforces: >=40% of body slides
  non-text-column when shapes warrant, diagram-shaped content MUST land on a diagram
  archetype (V3 class), adjacency dedup, numbered-themes clamp, quota repair via ONE
  anchored re-ask naming the violations (the critique-rigor loop pattern).
- 3c. Imagery fail-open telemetry: when a runtime image carrier no-ops, emit a
  degradation event into the generation receipt + chat notice (G7) - silent flat decks
  end.
- 3d. Floors rebalanced: infographic floor becomes a VISUAL floor (native diagram OR
  vector chart OR imagery variant), proportional to deck length (G8).

### WS-4. Verification (the gate declares done, not the author)
- 4a. Golden-deck bakeoff: regenerate the capabilities deck and the Farm brief through
  #slides; page-by-page comparison against the reference PDFs on imagery, iconography,
  language; typography must BEAT the references (zero mixed families - automated font
  census per slide from the PPTX XML).
- 4b. Export XML assertions in CI (small pytest over a fixture deck): svg blips present
  for structural marks; zero diffusion PNGs; per-archetype native-shape minimums; slide
  count == payload count; fonts embedded for exactly the token families.
- 4c. Live E2E: dense strategy deck (18+ slides) -> deckPlanGate pass; heuristic run ->
  critique deck with native discs + native proposed panels; both PPTXs COM-rendered and
  visually inspected before "verified" is claimed (screenshot-analyze-fix loop).
- 4d. 61->15 regression test pinned first (WS-0a).

## 4. Sequencing + effort

P0 (day 1): WS-0 complete - integrity gates + hygiene. Nothing else ships before 0a/0b.
P1 (days 2-4): WS-1a/1c/1d/1g/1h + WS-3a/3b - native infographic families, vector
  pipeline, diffusion deletion, skill convergence, plan gate. Biggest visible jump.
P2 (days 5-7): WS-1b/1e/1f + WS-2a/2b (write-back batch) - new diagram archetypes with
  canon frames, overlay z-order, native proposed panels.
P3 (day 8): WS-2c/2d/2e registry authority + parity CI; WS-4 bakeoff + sign-off.

Every commit names the unified-vision phase it advances; no commits without owner
approval; guarded rebuilds; the deckPlanGate and export gates - not this plan's author -
declare the uplift verified.

---

## IMPLEMENTATION STATUS (2026-07-09, end of session) - ALL WORKSTREAMS COMPLETE

- WS-0 integrity: SHIPPED (export scoping + count asserts + hard native gate + fidelity floor + font manifest + token fallbacks).
- WS-1 native tier: SHIPPED + VERIFIED (6 archetypes, true-vector svgBlip, diffusion art deleted, overlay z-order, measured clamps; 640/640 unit + live-proxy e2e + COM visual renders).
- WS-2 Figma write-back: COMPLETE. 8 archetype frames on SLIDES page 324:2 (screen-critique 1003:546, screen-redesign 1003:6166, quadrant 1003:6220, flow-arc 1004:641, milestone-timeline 1004:6263, means-matters 1004:6345, ranked-bars 1008:753, comparison-panels 1010:753) + proto/AnnotationBadge 1010:6409; NXT variable-bound to 221:2, NU mode instances screenshot-verified; registered in plans/figma-audit/registry.json + wiki/brand/figma-node-map.md (re-chunked) + slideComposer.ts canon comments; figmaRegistryParity 15/15.
- WS-3a deck-composer skill: SHIPPED + injected into DECK MODE (fetchDeckComposerSkill in corpusChatService).
- WS-3b/3d deckPlanGate: SHIPPED and PROVEN LIVE in the WS-4 bakeoff: pass-1 plan had 2 violations (36% visual, 8 connective); the anchored repair re-ask returned 0 violations, 64% visual - "repair accepted: 2 -> 0 violations, visual ratio 36% -> 64%".
- WS-3c imagery telemetry: SHIPPED (imageryDegradations surfaced as an assistant notice on export).
- WS-4 bakeoff (capabilities content, model-in-the-loop): deck generated on Opus 4.8, gate-repaired, exported natively (17 slides, runs per slide 2-29, zero picture-bodied diagrams). FONT CENSUS: only Saira Condensed / Archivo / IBM Plex Mono across all 17 slides, zero stray families, zero em-dashes, 19 embedded font parts - beats both reference decks (which mixed families). Visual pass: cover/agenda/means-matters/flow-arc/evidence-table/block-quote faithful to the reference anatomy.
- 0f collision class: REPRODUCED on bakeoff slide 10 (org-model definition struck the dy482 hairline) and FIXED with fitH measured clamps on org-model.definition (92), role-needs.challenges.body (138), role-needs.persona.needs.body (112); verified by re-composing the same payload (text complete, hairline clear).
- Same-day rider: journey-map "mega AI slop" render fix (stage twin rewritten to matrix-is-the-body + fit model + dangling-tail truncation hardening in both twins) - see memory project-slides-visual-uplift-2026-07-09.

All work UNCOMMITTED pending explicit approval.
