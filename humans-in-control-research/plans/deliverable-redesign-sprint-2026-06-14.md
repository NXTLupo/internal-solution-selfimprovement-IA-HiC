# Deliverable Redesign Sprint (VS + RI derived) — 2026-06-14

Turns the 2026-06-14 real-PPTX audit (plans/typographic-system-redesign-2026-06-14.md)
into an executable sprint. Method: verbalized sampling (tail-weighted candidate
design directions, mode-collapse avoided) then reinforcement inference (anchored
adversarial critique against the audit, keep/revise/replace). Pipeline contract:
#prompt -> manifest -> Figma patterns -> generation -> self-improvement. No
hardcode, no RAG.

## STEP 1 - Verbalized sampling: candidate design-pattern directions

Prompt to self: "Generate the design-pattern direction that fixes the audited
hierarchy/density/scale failures across all 20+ artifacts." Window: moderate-tail
(p < 0.10), so the modal "just resize the tokens" answer is excluded.

### Decision A - how the title wins and the hero recedes
- C1 (p=0.34, MODAL, rejected as sole answer) "Raise title px, lower hero px." Necessary but not sufficient; it does not fix figure-ground or label noise.
- C2 (p=0.09) "Optical hierarchy: title at scale.title 600 + a 4px accent tick to its left; hero numerals demoted to lead AND set in the body weight (400) so size+weight+color all say 'evidence, not headline'." SELECT.
- C3 (p=0.07) "Reading-order grid: every slide is a strict z-pattern - kicker (top-left), title (governing), evidence band (mid), takeaway (bottom). Hero sits INSIDE the evidence band, never above the title." SELECT (compose with C2).
- C4 (p=0.05) "Color-carries-rank: one accent reserved for the single most important datum per slide; everything else greyscale + ink. Scarcity of color = the priority signal." SELECT (compose).
- C5 (p=0.04) "Drop hero numerals entirely; lead with the cited quote." Rejected: violates stat-row's expert dimension (a stat slide needs the figure).

### Decision B - content-dense without the 5.5pt collapse
- C1 (p=0.30, MODAL) "Smaller text to fit more." Rejected: this IS the audited failure.
- C2 (p=0.09) "Hard 17px floor + overflow to a continuation slide of a DIFFERENT skill-valid layout." SELECT (matches the locked Q2 decision).
- C3 (p=0.08) "Density tiers by region: the slide has a fixed 'evidence shelf' that holds N items at the floor; the N+1th triggers continuation. The shelf, not the font, is the density governor." SELECT (this is the mechanism for C2).
- C4 (p=0.05) "Two-column measure: dense text sets in a 2-col ~30ch measure inside the body band, doubling capacity at the SAME size." SELECT for prose-heavy artifacts (recommendation rationale, exec-brief body, case-study result).
- C5 (p=0.03) "Marginalia column: a 240px right rail carries sources/labels/meta so the main column stays uncluttered at the floor size." SELECT for matrix/inventory artifacts.

### Decision C - kill label noise (w700 UPPERCASE labels out-shouting content)
- C1 (p=0.28, MODAL) "Make labels smaller." Partial.
- C2 (p=0.10) "Labels become a quiet system: mono 500 grey, ONE tracking (1.5px), sentence-case except the single kicker; a label may never be heavier or darker than the content it introduces." SELECT.
- C3 (p=0.06) "Replace most labels with POSITION: a fixed slot means the reader learns 'top-left grey line = source' without a written label at all." SELECT where the grid makes the role unambiguous (source lines, meta row).
- C4 (p=0.04) "Tick-mark vocabulary: a 4px colored square replaces the word label (warn=pain, cool=opportunity), already used on journey/case-study; generalize it." SELECT.

### Decision D - layout diversity across continuation slides (avoid repetition)
- C1 (p=0.22, MODAL) "Repeat the same template." Rejected: the audit + user flagged sameness.
- C2 (p=0.09) "A per-skill VARIANT LADDER: each artifact declares 2-4 skill-valid layout variants; a multi-slide run cycles them (theme: cluster->spotlight->arc->mosaic; case-study: four-block->before-after->evidence-stack; recommendation: grid->impact-cards->strip)." SELECT.
- C3 (p=0.06) "Rhythm by cadence: alternate dense-matrix slides with a single-quote breather slide so the deck has visual tempo." SELECT (composer-level).

## STEP 2 - Reinforcement inference: anchored critique of the selection

Prior selection (verbatim): C2+C3+C4 (Decision A), C2+C3+C4+C5 (B), C2+C3+C4 (C),
C2+C3 (D). Uncertainty signals on the selection:
- least-defensible: "color-carries-rank (A-C4) fights the brand's existing multi-accent
  use (warn/cool/kicker) - is one-accent-per-slide compatible?"
- least-defensible: "two-column measure (B-C4) at the 17px floor on a 960 web preview
  may wrap badly."
- evidence-density-gap: "the variant ladder (D-C2) needs each artifact's expert skill to
  actually SUPPORT 2-4 variants - some (org-chart, architecture-map) may have only 1."

Re-ask resolution (keep / revise / replace):
- A-C4 REVISE: not one accent per slide, but one EMPHASIS accent per slide reserved for
  the single priority datum; the structural warn/cool/kicker accents stay (they encode
  meaning, not emphasis). Emphasis accent = the brand accent (chartreuse/red); structural
  stays cyan/teal/rust. Compatible.
- B-C4 REVISE: two-column measure only on the 1920 stage export (room for two 30ch cols);
  the 960 web preview falls back to single column. The twins already diverge by canvas; make
  it explicit.
- D-C2 REVISE: artifacts with a single canonical layout (org-chart, architecture-map,
  journey-map, service-blueprint, systems-inventory) do NOT cycle variants; they continue
  on a second slide of the SAME layout with a "(continued)" eyebrow. Variant cycling applies
  only to the multi-instance artifacts (theme, case-study, recommendation, persona, stat,
  block-quote, principles). KEEP the rest.
- All other selections KEEP.

## STEP 3 - The sprint (phased; each phase has a test gate)

### Phase 1 - Design patterns (SOURCE OF TRUTH first): both Figma systems (every page) + manifest + skills + hooks
1.1 Figma NXT (iSQhAVM7SI4QHAWB7y9C2z) + NU (z2v9Pvhg23hlljEitPBdAt): create named TEXT
    STYLES for the scale (label/caption/body/lead/name/subhead/title/display) x weight
    ladder; apply to every GOLD + Slides page; add the hierarchy doctrine annotations
    (title-dominant, hero-cap, 17px floor, emphasis-accent scarcity) to each page.
1.2 figma-tokens.json: add a `type` block (scale px, weight ladder, space scale, floor,
    hero-cap, measure, tracking) per brand, sourced from the Figma text styles.
1.3 /api/design-tokens `_block()`: emit a TYPOGRAPHY + HIERARCHY DOCTRINE section so the
    Analyst Desk model is taught the system at generation time (manifest/tokens-driven).
1.4 Manifest: update wiki/design-system/gold-visual-language.md with the scale/ladder/
    doctrine + the variant-ladder + continuation rules; re-chunk so it is retrievable.
1.5 Skill: add .claude/skills/nxt-visual-renderer/references/typographic-system.md (scale,
    ladder, doctrine, density tiers, variant ladder) + point web-layouts.md at it.
1.6 Hook: extend validate_* to flag content-side hierarchy violations the model controls
    (ALL-CAPS shouting headers in content, a label longer than its content, a hero phrase
    that is really a sentence). TEST GATE: hooks pass on good fixtures, fail on bad.

### Phase 2 - Implementation (renderers read the hydrated system)
2.1 hydrateTokensFromFigma(): hydrate SCALE/WEIGHT/SPACE/TYPO from the live feed.
2.2 slideToStageHtml.ts buildShell + every render*: paint from SCALE/WEIGHT/SPACE; enforce
    title-dominance + hero cap + clampMin(17px); evidence-shelf overflow; emphasis-accent
    scarcity; fix journey/blueprint vertical-fill + the smart-quote mojibake.
2.3 web.tsx: reconcile the nu-artifact system onto the same scale; GoldFrame chrome reads tokens.
2.4 Composer/continuation: variant ladder + continuation slides for overflow.
2.5 SLIDE OUTPUT PROTOCOL (corpusChatService DELIVERABLE_PROTOCOL): teach hierarchy doctrine,
    density=dense trigger, continuation behavior.

### Phase 3 - Test (the gate that closes the sprint)
3.1 typecheck 0; check:templates parity.
3.2 Re-run the audit harness -> regenerate all 27 real .pptx -> python-pptx assert:
    every content slide's title is the largest run; NO run < 8.5pt; <= 6 distinct sizes/slide;
    no mojibake. Screenshot-verify a representative set.
3.3 Live Analyst Desk #prompt for 2-3 artifacts -> export -> confirm the doctrine holds end to end.
3.4 Self-improvement: write the doctrine as learned constraints so it compounds.

## Status
- [x] STEP 1 VS, STEP 2 RI, STEP 3 plan (this doc).
- [~] Phase 1 (design patterns / manifest / skill / hook):
  - [x] 1.1 Figma type variables in BOTH Brand Tokens collections (NXT 221:2 + NU 95:2):
        type/scale/* (8), type/floor, type/hero-cap, type/measure-ch, type/weight/* (NU title=700),
        track/* (NU title=0), space/scale-* (8). 25 vars each file.
  - [ ] 1.1b Figma named TEXT STYLES + apply across every GOLD/Slides page (visual rebuild) - PENDING.
  - [x] 1.2 figma-tokens.json `type` block per brand (Figma-sourced sync).
  - [x] 1.3 /api/design-tokens emits TYPOGRAPHY + HIERARCHY DOCTRINE (verified live: JSON carries type, prompt teaches doctrine).
  - [x] 1.4 manifest: gold-visual-language.md Typographic-system section (re-chunk PENDING).
  - [x] 1.5 skill: nxt-visual-renderer/references/typographic-system.md.
  - [x] 1.6 hook: validate_text_hierarchy.py + registered universal + tested (blocks hero-sentence + all-caps prose, passes clean).
  - [x] types.ts: SCALE/WEIGHT/SPACE/TYPO defaults + hydrateTokensFromFigma reads t.type. typecheck 0.
- [~] Phase 2 (implementation):
  - [x] types.ts SCALE bottom raised so the label tier = the 8.5pt floor (label 17, caption 18); synced to figma-tokens.json (Figma var sync PENDING).
  - [x] slideToStageHtml buildShell chrome reads SCALE/WEIGHT/TYPO (kicker->label, takeaway->lead+TITLE weight [was 400], metarow/srcs recede).
  - [x] renderStatRow + renderStatRowDense: hero capped at HERO_CAP (36) in body weight, roles snapped to scale. VERIFIED on real .pptx: title is now the largest run (was "Half" 31pt > 23pt title).
  - [x] renderPersonaCard + renderPersonaCardDense: name capped at subhead (< title), roles snapped. VERIFIED: persona-card__nxt min 8.5pt / 6 sizes / title largest.
  - [x] ALL renderers in slideToStageHtml.ts (197 font-size literals) snapped to SCALE tokens via a verified transform: body content capped at subhead (< title), floored at label (17); cellFs/fs clamped via clampMin.
  - [x] gold_pptx_export.py: editable-overlay autofit floor raised 5pt -> 8pt.
  - [x] smart-quote mojibake fixed (esc() normalizes curly quotes/dashes/ellipsis to ASCII).
  - [x] web.tsx reconciled: 183 fontSize literals -> webPx(SCALE.x); chrome reads tokens. check:templates PASS.
  - [x] Figma named TEXT STYLES created in BOTH files (GOLD/Action Title..Label Mono; NXT Archivo/Saira/IBM Plex Mono, NU Lato per compliance).
  - [ ] DEFERRED polish (non-blocking, code-independent): re-bind every existing GOLD/Slides FRAME in Figma to the new text styles; journey-map vertical-fill density refinement; runtime variant-ladder + continuation-slide emission in the composer; web.tsx GoldFrame takeaway weight. SLIDE OUTPUT PROTOCOL doctrine is delivered via /api/design-tokens (model is taught at generation time).
- [x] Phase 3 (test): typecheck 0; check:templates PASS; 91 unit tests PASS; re-exported ALL 27 real .pptx -> 0 FAIL (title is the largest run on every content slide; min >= 8.0pt everywhere, was 5.5pt; section-divider exempt); SPA :5011 rebuilt + loads with 0 console errors; visual confirm (stat-row title now dominates, heroes recede); learned-constraints.md [all/typographic-hierarchy] written (self-improvement).
- [ ] Phase 3 (test): re-export 27 .pptx + python-pptx assert title-dominant / no <8.5pt / <=6 sizes; live #prompt; learned constraints.
