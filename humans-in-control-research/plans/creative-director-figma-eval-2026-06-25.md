# Creative-Director evaluation — NU-mode type, #slides image placeholders, artifact visualizations (2026-06-25)

> Method: looked at the ACTUAL Figma (single file `iSQhAVM7SI4QHAWB7y9C2z`, NU = mode 535:0) — 2
> independent visual audits of ~28 NU instance twins + 1 code-pipeline audit + my own re-view of the
> worst offender (section-divider 626:36). VS = verbalized sampling (candidate set + probabilities +
> committed pick). RI = reinforcement inference (confidence + verify-before-build). EVALUATION ONLY,
> nothing built.

## UNIFIED-VISION COMPLIANCE GATE (every recommendation below obeys this; rejected candidates violate it)
- **Never hardcode** — sizes/colors resolve from `/api/design-tokens` (mode 535:0), never literal hex/px in code.
- **SPA never calls Figma live** — Figma stays the offline canon, mirrored into `figma-tokens.json` + the renderer twins; image slots are already placed blank in canon.
- **CONVERGE / DELETE / GATE / SCHEDULE, not build-new** — extend the existing type scale, the existing count-adaptive type logic, the `artifactImageSlots` contract, the illustrator pipeline, and the proven journey wiring pattern. No parallel systems.
- **Anti-slop + collision bans** — diagrams stay token-bound CODE/vector; raster image-gen stays confined to the flat-vector illustration lane with knockout.

---

## PROBLEM 1 — Northeastern-mode text overflow / oversize (headers)

### Diagnosis (confirmed, narrowly scoped — NOT a system-wide rebuild)
Both audits + my own view converge: the defect is **the same size tokens rendered in NU's WIDE single-typeface Lato (title weight 700) that were sized for NXT's CONDENSED Saira**. It surfaces in exactly three places; everything else (all CSS-grid matrices + bordered deliverables) is CLEAN because the grids absorb Lato's extra width.

1. **(HIGH) Full-bleed DISPLAY-HEADLINE interstitials** — `section-divider` (626:36) and `thesis-interstitial` (626:49). The display title is sized typeface-blind: a multi-word title that fit in condensed Saira wraps 4-5 lines in Lato, **clips off the bottom frame edge**, and on section-divider the absolutely-positioned subtitle band is **overprinted directly across the grown title** (text-on-text, unreadable — I verified 626:36 personally). Control: `cover` (626:2) with one short word ("ADVANCEMENT") is fine → the failure is word-count × typeface-width × fixed-size, not the tier itself.
2. **(HIGH/MED) Action-title overruns the top-right N dot-mark** — `prd` 625:3240, `tech-audit` 625:2953, `competitive` 625:2596, `tech-architecture` 625:3115. Long 2-line Lato titles push line-1's right edge UNDER the red N (the title box reserves no logo gutter). Same string in NXT Saira stays narrower and clears it. Short-title frames (roadmap, strategy, persona-detail) are fine.
3. **(MED) NU red-on-navy small-text contrast** — MUST-HAVE pills (both PRD frames), persona-dense kicker + section labels on the navy block, theme-index source labels. Legibility, not geometry; NU-specific (chartreuse-on-black reads; small red-on-navy does not). Plus persona-dense kicker meta-strip wraps into its divider.

### VS — candidate fixes (k=6, moderate-tail; committed set in bold)
| # | Candidate | p | Verdict |
|---|---|---|---|
| C1 | Globally shrink the NU display size token | .30 (modal) | REJECT — blunt; weakens short titles, fixes neither the logo gutter nor the subtitle overprint |
| C2 | **Mode-aware display floor in tokens** (mode 535:0 display sizes account for Lato width) | .18 | **COMMIT (substrate)** — token, not hardcode; vision-compliant; necessary but not sufficient |
| C3 | **Length/height-adaptive headline clamp in the twins** (extend the EXISTING count-adaptive type from dense to the display/title tier; auto-fit by word/char count + available height, token min floor) | .15 | **COMMIT (core)** — a 6-word thesis steps down, a 1-word cover stays big; converges on existing logic |
| C4 | **Reserve the logo-exclusion gutter** in the title box (right padding = logo zone) in component + twin | .12 | **COMMIT (pair)** — structurally kills the title-under-N collision for BOTH brands |
| C5 | **Subtitle in normal flow / auto-layout** under the interstitial title (not an absolute band) | .08 | **COMMIT (pair)** — a grown title can never overprint the subtitle again |
| C6 | NU display as faux-condensed (negative tracking / scaleX) | .05 | REJECT — Lato has no true condensed; scaleX distorts, off-brand |

**Committed = C2 (token floor) + C3 (adaptive clamp) + C4 (logo gutter) + C5 (subtitle in-flow)**, plus a 2-token contrast fix for #3 (small-on-dark NU text → `color/on-accent`/lighter tint). This is a targeted type+layout fix on the display tier, the logo gutter, the interstitial subtitle, and two contrast tokens — NOT a redesign.

### VERIFIED TOKENIZATION MECHANISM (2026-06-25, get_variable_defs on 626:36)
The overflowing NU frame binds REAL Figma type-size variables: `type/scale/hero`=120, `type/scale/section-numeral`=360, `type/scale/name`=30 (+ `font/display`=Lato, `color/accent`=#c8102e confirming NU mode). `figma-tokens.json` `type.scale` is IDENTICAL for NXT and NU today, so these size variables carry the SAME value in both modes — there is NO NU-divergent sizing yet. **Therefore the vision-correct P1 is a Figma TOKEN EDIT, not a JSON/renderer patch:** set NU-mode (535:0) values for the relevant `type/scale/*` variables (smaller hero/title/display for Lato's width) + add a `space/logo-gutter` token + bind small-on-dark text to the contrast token → re-pull both modes into `figma-tokens.json` → re-chunk `figma-node-map.md`. This EDITS existing mode-aware variables (they already exist with two modes); it is not a from-scratch tokenization. Because only the NU mode value changes, **NXT renders byte-identical**.
Open verification before writing values: confirm `type/scale/*` lives in the 2-mode `NXT Brand Tokens` collection (221:2) so it can carry a distinct NU value (vs. a single-mode Type collection that would first need the NU mode added).

### PIVOTAL ROOT CAUSE (2026-06-25, code-confirmed): the renderer's type SCALE is NOT brand-aware
`components/slideTemplates/types.ts:735` `SCALE` is a SINGLE global object (`hero:120`, `deckTitle:58`,
`sectionNumeral:360`, `title:46`, `display:60`, `quoteMark:260`, `numeral:80`). Fonts/colors resolve
PER-BRAND via `brandTokens(brand)` -> `T`, but SCALE does not — it is hydrated ONCE, globally, by
`hydrateTokensFromFigma()`. So NU renders with Lato (per-brand font) at NXT's sizes (global scale).
`figma-tokens.json` confirms it: `type.scale` is byte-identical for NXT and NU today. CONSEQUENCE: a
Figma NU type-token edit + re-pull alone would NOT flow — the renderer must become brand-aware to
consume a per-mode scale. So the vision-correct P1 adds one prerequisite step: make the DISPLAY/DECK
tier of SCALE brand-aware (`scaleFor(brand)`), then the re-pulled NU values actually apply. Only the
display/deck tier needs this (the body/matrix tiers don't overflow); bound the change there.

### CORRECTED ROOT CAUSE (2026-06-25, verified across BOTH render paths)
There are TWO section-divider/title paths, and only one overflows:
- **GOLD artifact path** (`slideToStageHtml.ts renderSectionDivider`) uses `SCALE.display`=60 and puts the
  subtitle in NORMAL FLOW (flex-centered) -> it CANNOT overprint and does not overflow. This path is FINE.
- **SLIDES-system archetype path** (`slideComposer.ts composeSlide`, the Figma 609 cover/section-divider/
  thesis -> the audited NU twins 626:2/36/49) sets the deck-display tier from GLOBAL `SCALE` in ABSOLUTE
  layout: `cover` title `size: SCALE.hero`=120 w:1718; specs use fixed `dy` offsets that assume a ONE-LINE
  title. In NU Lato at 120, a multi-word title wraps/clips and pushes into the next absolutely-positioned
  element. THIS is the real generated-artifact overflow, and it matches the Figma canon defect.
So P1 is specifically: the SLIDES-system composer's deck-display tier is (a) not brand-aware (global SCALE),
and (b) brittle to title height (absolute `dy`). The GOLD renderers are not the problem.

### PRECISE FIX (vision-pure)
1. **Figma canon (NU mode 535:0):** set smaller `type/scale/{hero,deckTitle,sectionNumeral,numeral,deckHeading,quoteMark}` for Lato; move the interstitial subtitle into auto-layout flow; reserve the logo gutter. `use_figma` (Plugin API) write, NU only.
2. **Re-pull -> figma-tokens.json (per-mode type scale) -> re-chunk figma-node-map.md.**
3. **slideComposer brand-aware sizing:** resolve each spec's `size` through a PER-BRAND deck scale at compose time (change `size: SCALE.hero` -> a scale KEY resolved via `tk.scale[key]`, where `tk.scale` is hydrated per-brand from `TYPE_SCALE`). This is the load-bearing code change; the GOLD `SCALE.display`/`deckHeading` reads in slideToStageHtml are already safe but switch them too for consistency.
4. **Title-height robustness:** the absolute archetype layout must tolerate a 2-line title (size step-down by length to the per-brand scale floor, or reserve vertical space) so a long NU title never collides the next `dy` element. This is the clamp, stepping the per-brand scale.
5. **web.tsx preview parity + gate** (re-render NU cover/section-divider/thesis via the composer; NXT pixel-identical).

### EXECUTION STATUS (2026-06-25) — P1 core DONE + verified, NOT committed
- **Composer brand-aware deck scale (code):** `slideComposer.ts` now resolves deck-display sizes per-brand
  (`size: SCALE.hero` -> key `'hero'` -> `tk.scale[key]`); `resolved()` builds `tk.scale` from the brand's
  hydrated `TYPE_SCALE`; `types.ts hydrateTokensFromFigma` stashes per-brand `TYPE_SCALE` on each token
  object. NU defaults == NXT until the Figma edit, so the plumbing alone is zero-visual. tsc 0, vitest 267.
- **Figma canon (NU mode 535:0) EDIT (live, reversible):** `type/scale/*` are real mode-aware vars in
  `NXT Brand Tokens` 221:2; set NU values: hero 120->88, deck-title 58->50, section-numeral 360->300,
  numeral 80->68, quote-mark 260->215, display 60->52. **NXT mode 221:0 untouched.**
- **Re-pull:** mirrored those 6 NU keys into `figma-tokens.json` NU.type.scale (NXT block untouched);
  `/api/design-tokens?brand=NU` now serves hero=88. (Pre-existing label/caption JSON<->Figma drift left
  alone - out of P1 scope, would alter NXT.)
- **VERIFIED (rendered the generated artifact, hydrated live):** NU section-divider title wraps 2 clean
  lines + subtitle clears below (no clip/overprint); NU thesis "...PERSISTENT." fully visible; NU cover
  clean; NXT section-divider unchanged (Saira 120). Screenshots in scratchpad; gate harness
  `scripts/eval/_render_nu_typefix.mts`.
- **PREVIEW PARITY confirmed:** `SlideCanvas.tsx` renders EVERY slide preview via `slideDataToStageHtml`
  in an iframe (the same doc the export rasterizes); web.tsx is a defensive fallback only. So the composer
  + contrast fixes apply to BOTH preview and export from one source - no twin-desync.
- **1b logo-gutter = RENDERER-SAFE (canon-only):** the GOLD action title uses the shared `<h1>` with
  `max-width:1400px` (ends x~1572), which clears both logos (NXT ~1684, NU ~1810). The audit's logo
  collisions were the FIGMA CANON NU twins (wider component title frames), NOT the generated artifact.
  So no renderer fix needed; the canon title-frame width is separate hygiene (generated output is correct).
- **1c contrast = FIXED (code) + verified:** added brand-aware `accentOnDark` to BrandTokens, DERIVED from
  existing tokens in `brandTokens()` (NU=paper/white, NXT=accent/chartreuse) - NO new hex literal (the
  no-hardcode ceiling test caught and rejected literal additions; derivation passes). Applied at the 4
  confirmed dark-ground accent-text spots: `.dins .dlbl` (stat-row dark insight), `.pid .pilbl` (persona
  identity column), `.tm.inv .idx`/`.src` (theme-index dark cards). Rendered NU stat-row-dense: dark panel
  labels + body now legible light-on-navy (was near-illegible red). tsc 0, vitest 267.
- **CANON HYGIENE DONE (interstitials):** the variable edit (hero 88) shrank the canon components too
  (they bind the var). Re-screenshot showed a SECOND canon defect: the content-left layout's title node
  was too narrow (w:1040 overlapped the img-slot at x:1100) + the subtitle band (y:916) overprinted the
  multi-line title. Fixed in the COMPONENT (flows to NU instance) via use_figma: section-divider title
  325:47 -> y:480/w:950 (clears the image panel) + subtitle 325:48 -> y:980 (footer, no overprint);
  thesis 325:60 needed no geometry change (88 alone fits its 5 lines, no subtitle). VERIFIED: Figma NU
  twins 626:36 + 626:49 now render clean (no clip, no overprint). Canon now matches the renderer quality.
- **STILL TODO (minor):** (1) the WIDE GOLD action-title canon frames (tech-audit/competitive/prd) still
  run under the N in the Figma canon - renderer is logo-safe (h1 max-width 1400), so generated output is
  already correct; canon-frame tightening is low priority; (2) optional title-height clamp for pathological
  title lengths; (3) re-chunk figma-node-map note; (4) web.tsx fallback twin. Nothing committed.

### What is a TOKEN vs CODE vs STRUCTURE in P1 (vision decomposition)
- **TOKEN (Figma → re-pull → re-chunk):** NU `type/scale/hero|title|display` floor; `space/logo-gutter`; small-on-dark contrast color (NU mode).
- **CODE (renderer twin, but token-consuming):** the adaptive headline clamp. To stay vision-pure it must STEP DOWN THE EXISTING TOKEN SCALE (hero→title→subhead) by word-count/available-height — NEVER emit an off-scale px (honors "sizes come from the scale, never invent sizes"). A static smaller NU token alone cannot guarantee no-clip for arbitrary title length (no-truncation contract), so the clamp is still required.
- **STRUCTURE (Figma component + twin, captured by the re-chunk):** interstitial subtitle moved into auto-layout flow (so it can never overprint a grown title); title box reserves the logo gutter.

### RI
- **overallConfidence: HIGH** on diagnosis (three independent looks incl. mine) AND on the tokenization mechanism (verified via get_variable_defs), **MED** on the renderer clamp seam.
- Verify before building: (a) which collection holds `type/scale/*` and that it carries the NU mode; (b) the renderer-twin type fn in `slideToStageHtml.ts` (SCALE/TYPO + display tier) — where to hook the token-stepping clamp; (c) the interstitial subtitle is abs-positioned in the component AND twin (confirmed by the overprint).
- Gate: re-render the 5 NU offenders + the NXT controls → no clip / no overprint / no logo collision, **NXT pixel-identical**, validate_text_hierarchy.py + 8.5pt floor + title-dominance still pass, and `figma-tokens.json` re-pulled + registry re-chunked (not hand-edited).

---

## PROBLEM 2 — real PowerPoint image-PLACEHOLDER objects in #slide / #slides (.pptx)

### Diagnosis
- The **image-slot system is fully built** (`artifactImageSlots.ts` + Figma img-slot/glyph-slot regions with bounds/ground/role; dense matrices already ratified image-free). But it is **dark** — only `journey-map` is `wired:true`; every other twin never reads its declared carrier.
- The **canonical PPTX path drops images.** `proxy/gold_pptx_export.py` GEO walker skips `<svg>` and never visits `<img>`; images in the editable tier are silently dropped, or the whole slide falls back to one raster screenshot. `components/slideTemplates/pptx.ts` is deprecated; `nxt_slide_export.py` is text/geometry only. **Zero picture-placeholder support anywhere.**
- python-pptx **cannot mint** a new `<p:ph type="pic">` on the blank layout it uses. Two routes exist (below).

So "image placeholders on all #slides" correctly resolves to: wire the slots the system already declares, emit them as **real editable/swappable PowerPoint picture objects at the existing slot bounds**, keep dense matrices image-free (no crowding), blank-by-default (extensible).

### VS — candidate approaches (k=5)
| # | Candidate | p | Verdict |
|---|---|---|---|
| C1 | Drop a generated illustration into EVERY slide | .30 (modal) | REJECT — violates the ratified "dense matrix = image-free, negative space IS the design" rule; crowds; slop-by-volume |
| C2 | **`add_picture` at the EXISTING img-slot bounds for image-affording layouts only** (cover/section-divider/thesis full-bleed panels + journey thumbs + the few narrative panels), reusing `artifactImageSlots` positions | .22 | **COMMIT (now)** — a real movable/swappable picture object (right-click → Change Picture); smallest convergent change; ZERO Figma edits (slots already blank) |
| C3 | **One custom pptx slide-layout per affording archetype carrying a true `<p:ph type="pic">`** so an empty slot shows the native "insert image" affordance | .12 | **COMMIT (scheduled, gate behind C2)** — the true "extensible empty placeholder"; bigger lift |
| C4 | Put placeholders on ALL slides incl. matrices | .10 | REJECT — crowding; contradicts the ratified rule |
| C5 | A separate toggleable "image layer" subsystem | .05 | REJECT — build-new; the slot contract already exists |

**Committed = C2 now + C3 scheduled.** Wire the GEO walker to emit `add_picture` at slot bounds for affording layouts, and flip the dark carriers per-twin following the journey reference; then author one custom layout with a real pic placeholder for the empty-swap affordance. Dense matrices stay image-free. Extensibility = blank by default, populated only when an illustration is generated OR the user wants a swap target. **No Figma template is touched.**

### RI
- **overallConfidence: HIGH** (code audit is explicit and file-cited).
- Verify before building: GEO walker `<img>` branch + the `ex/ey` scaling; that `add_picture` accepts the slot `src` (data-URI/file); whether to raster-fallback when a slot is empty.
- Gate: export a deck (cover + divider + thesis + journey), open in PowerPoint, confirm each image is a **real movable/replaceable object** and the matrices carry none.

---

### EXECUTION STATUS (2026-06-25) — P2 C2 DONE + verified live, NOT committed
- **`proxy/gold_pptx_export.py` GEO walker now captures `<img>`** (it previously skipped images, so the
  editable tier silently dropped them). Each `<img>` is captured as a data-URI via canvas (works for
  data-URIs AND same-origin URLs; tainted cross-origin canvas falls back to the raw src for python to
  fetch). The native PPTX tier then places each as a **real `slide.shapes.add_picture(...)`** at the
  slot bounds (`ex/ey` scaled) - a movable, swappable PowerPoint Picture (right-click -> Change Picture).
  Non-native (SVG-bearing) slides keep the raster which already contains the image.
- **VERIFIED (in-container E2E):** fed a stage with an `<img>` at x1100/w820/h1080 -> exported .pptx
  contains exactly 1 PICTURE shape at left 7.64in / w 5.69in / h 7.5in (matches the slot). Proxy syntax
  OK; proxy restarted; live.
- **EFFECT:** ANY `<img>` the renderer emits now exports as a real picture object - journey phase
  thumbnails (already wired), cover/section-divider/thesis full-bleed panels, and any deliverable whose
  illustrator carrier gets flipped `wired:true`. Dense matrices stay image-free (no `<img>` -> nothing
  placed), so no crowding.
- **STILL TODO:** C3 (a true EMPTY `<p:ph type="pic">` "insert image" affordance via one custom slide-
  layout XML - heavier, scheduled) + flipping the dark illustrator carriers `wired:true` per-twin so
  non-journey deliverables actually GENERATE slot art (overlaps P3). Nothing committed.

## PROBLEM 3 — Claude Design via API for visualizations (#arch, personas, …) without uncanny AI slop

### Diagnosis
- **No "Claude Design API" exists** (repo grep: only the static `nu-design-gallery` handoff). And it isn't needed.
- `#arch` / org / blueprint are **already token-bound CODE/CSS-grid** (collision-free, on-brand, anti-slop by construction; flowSummary is a text band, no connector arrows). That is the CORRECT pattern, not image-gen.
- The flat-vector **illustrator pipeline** (VS concept selection → Nano Banana 2 `gemini-3.1-flash-image-preview` → deterministic knockout → reuse library; cliche-ban list, canvas-contrast rule, 3-4 color cap, no text/logo/3D) is **built + proven + anti-slop-hardened** — but dark for everything except journey.

So the answer is a **routing doctrine, not a new image API**: match the GENERATOR to the SURFACE.

### The doctrine (committed)
- **Relational / structured surfaces** (architecture, org, journey topology, blueprint, gap): the visual IS data with topology → generate **token-bound VECTOR CODE** (SVG/CSS), NEVER a raster picture. Uncanny slop comes from asking an image model to draw a diagram. "Claude Design via API" here = **Claude (messages API) as a vector designer** emitting a token-bound SVG/HTML diagram brick the renderer paints — deterministic, on-brand, collision-safe (16px exclusion zones), editable. Today `#arch` is JSON→CSS; the upgrade is a richer Claude-authored SVG brick, still code.
- **Emotive / identity surfaces** (persona archetype emblems, cover/divider/thesis hero panels): abstract meaning, no topology → the **flat-vector illustrator pipeline** is correct. The win = **wire the dark carriers** (flip `wired:true` per twin, starting with personas-overview 596:2 emblems) following the journey reference, with the existing knockout + reuse so no two artifacts repeat.
- **Personas specifically**: an abstract **data-portrait emblem keyed to the persona's behavior vector**, NEVER a generated human face (faces are the #1 uncanny-slop source). Converges on the illustrator.

### VS — candidate approaches (k=6)
| # | Candidate | p | Verdict |
|---|---|---|---|
| C1 | Image model draws the architecture diagram / persona portrait | .30 (modal) | REJECT — THE slop generator: fake UML, uncanny faces, collisions, off-brand; violates collision + anti-slop bans |
| C2 | **Claude (messages API) emits a token-bound SVG diagram brick** for relational artifacts | .18 | **COMMIT (diagrams)** — Claude-as-vector-designer, deterministic, collision-safe, on-brand, editable |
| C3 | **Wire the existing flat-vector illustrator to the dark carriers** (personas, hero panels) per the journey pattern | .15 | **COMMIT (emotive)** — proven aesthetic + reuse library; lights up what's already built |
| C4 | **Persona = abstract data-portrait emblem from its attribute vector** (never a face) | .12 | **COMMIT (persona form)** — kills uncanny-human entirely |
| C5 | figma MCP `generate_diagram` to seed new Figma diagram bricks at AUTHORING time, then mirror to twins | .07 | ADOPT as a **design-time aid only** — never the runtime path (runtime never calls Figma) |
| C6 | Hybrid: Claude SVG diagram + one flat-vector accent only where a clean negative-space zone exists | .05 | OPTIONAL polish |

**Committed = route by surface: C2 (Claude token-bound SVG) for relational/diagrams; C3 + C4 (flat-vector illustrator + abstract persona emblems, never faces) for emotive/identity.** Image models stay confined to the flat-vector lane with all existing anti-slop guards. C5 is authoring-only. **Never** put a raster AI diagram or a photoreal persona into a deliverable.

### RI
- **overallConfidence: HIGH** on the routing doctrine (grounded: #arch already code; illustrator already anti-slop-hardened), **MED** on the Claude-SVG-brick lift.
- Verify before building: (a) confirm there is no Anthropic "design" image endpoint (Claude returns text/SVG, which is the point); (b) prototype ONE Claude-authored token-bound SVG arch brick behind a flag, render it, run the collision check; (c) wire ONE dark carrier (personas-overview 596:2) end-to-end as the reference, exactly like journey.
- Gate per twin: typecheck / vitest / template-parity / live render + the no-collision check + an anti-slop visual review.

---

### EXECUTION STATUS (2026-06-25) — P3 hero-panel render+export WIRED (generation half pending), NOT committed
- **Hero-image carrier wired into the slides composer (emotive path, renderer + export half):**
  `slideComposer.composeSlide` now renders an OPTIONAL full-bleed right image panel for the left-anchored
  interstitials (cover/section-divider/thesis) when `payload.heroImage` is present - at the Figma-canon
  slot bounds (cover/divider 1100,0,820,1080; thesis 1000,0,920,1080) - and reflows the title into the
  LEFT column to clear it (the canon content-left layout). When `heroImage` is ABSENT the layout is
  UNCHANGED (fail-open; default decks render exactly as before). Vision-pure: slot bounds match canon,
  src rides the payload carrier, nothing hardcoded.
- **VERIFIED:** rendered NU section-divider with a stand-in flat-vector data-URI -> title reflowed left
  (3 lines), illustration in the right panel, subtitle below (no overprint). And via the P2 GEO-walker
  fix, that panel `<img>` EXPORTS as a real swappable PowerPoint picture. tsc 0, vitest 267, SPA rebuilt.
- **STILL TODO (the GENERATION half - needs live AI):** flip the illustrator carrier so the pipeline
  actually POPULATES `payload.heroImage` for cover/divider/thesis (the existing flat-vector illustrator:
  VS concept -> Nano Banana 2 -> knockout -> reuse library, all anti-slop-hardened), following the
  journey wiring. Then personas archetype emblems (abstract, never faces; needs the personas-overview
  twin). Then (optional) Claude-authored token-bound SVG for richer #arch (already non-slop CSS today).
  These need live image/SVG generation to verify, so they are the next focused increment.

## Sequenced recommendation (converge + gate; one PR per gate)
1. **P1 fix** (highest user-visible pain, smallest surface): NU display token floor + adaptive headline clamp + logo gutter + interstitial subtitle in-flow + 2 contrast tokens. Gate on the 5 offenders + NXT-identical.
2. **P2 step 1** (C2): GEO walker emits `add_picture` at slot bounds for affording layouts; flip dark carriers per-twin from the journey pattern. Gate in real PowerPoint.
3. **P3 emotive** (C3+C4): wire personas-overview 596:2 emblems (abstract, never faces) as the reference carrier; then hero panels.
4. **P3 diagrams** (C2-svg) + **P2 step 2** (C3 true pic-placeholder layout): scheduled, gated, behind flags.
Nothing here touches the runtime-Figma boundary, hardcodes a value, or adds a parallel system.
