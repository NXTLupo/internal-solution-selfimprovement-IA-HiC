# User-directed deck imagery: Generate buttons in the preview, user prompts, one regenerate pass

2026-08-14, owner pivot after the same-day revert of the automatic fill (3ee669ddc). The user,
not the pipeline, authors each visual: per-slot Generate buttons on the inline deck preview in
BOTH desks, a prompt + style per slot, then one "Regenerate presentation with visuals" pass.
Advances Unified Vision phases 8 (componentized GOLD imagery) and 9 (native PPTX).

## The two lessons this plan is built on (from the failed 2026-08-14 auto-fill)

L1. THERE IS ONE CORRECT RESOLVER. `services/artifactIllustrator.ts::generateOne` already
    routes all three visual styles: `photo-*` styles to the illustration endpoint with
    PHOTOGRAPHIC prompts (artifactIllustrator.ts:190, the lane that made the farmer/museum
    covers), native infographics to `/api/ai/diagram` (D17), line-art concepts otherwise.
    The reverted pass died because it fetched the endpoint directly with an invented
    `style: 'photo'` token and got line art. NOTHING in this plan calls an image endpoint
    directly; every render goes through generateOne.

L2. PROOF = THE RUNNING APP. Every stage checkpoint below is a screenshot of the real SPA
    (or the opened PPTX), never a harness render. No push before the owner approves the
    stage checkpoint.

## UX contract

1. Deck previews in Analyst chat and Designer chat (both render slides:* payloads via
   SlideCanvas -> composeSlide) draw a slot overlay on every IMAGE-CAPABLE slide: a bordered
   region at the slot's geometry with a GENERATE chip. Slides without slots show nothing.
2. Clicking GENERATE opens an inline mini-form anchored to the slot: a free-text visual
   prompt + a style picker with three choices mapping to the real lanes:
       Illustration -> style 'line' (flat vector house style)
       Infographic  -> the native diagram lane (content-true panel from the slide's payload)
       Realistic    -> style 'photo-background' | 'photo-scene' | 'photo-portrait'
                       (picked by slot kind from IMAGE_SLOT_FIELDS, never a bare 'photo')
3. The authored spec persists on the slide payload as `_userImagery[slotField] =
   { prompt, style, authoredAt }` (payload-carried so it survives re-render, refine, and
   export; underscore prefix = renderer-ignored).
4. The user moves slide to slide authoring as many or as few slots as they want. A slot
   with no user spec stays empty: THIS pivot makes the user the author; no auto-fill.
5. One button under the preview: "Regenerate presentation with visuals". It resolves every
   authored slot through generateOne (concept = the USER'S PROMPT verbatim + the slide's
   payload-derived DERIVED-FROM line for grounding), writes the returned URLs into the
   payload fields, and re-renders the deck in place. Per-deck budget cap still applies;
   catalog reuse still runs first inside the lane.
6. Export: unchanged machinery. The stage HTML carries the images at the slot geometry;
   `proxy/gold_pptx_export.py::_insert_native_picture` places each as a native replaceable
   picture at the Figma slot bounds. The user's visuals land exactly where the canon
   placeholders sit.

## Template strategy (owner question answered)

REUSE FIRST. The archetypes with canonical slots already cover the deck spine: cover +
section-divider (full-bleed), block-quote (scene panel), numbered-themes (item scenes),
role-needs (portrait), infographic-exhibit (native panel). Two additions later, only if
usage shows demand (P2): flow-arc step art, milestone-timeline phase art - both have Figma
canon precedents from the journey phase strips. NO new template system; the slot map
(IMAGE_SLOT_FIELDS, recover from git history commit 50dbaeeb8) is the single contract the
overlay, the resolver, and the exporter read.

## Stages, each gated on an owner-approved checkpoint

S1  SLOT OVERLAY (read-only). SlideCanvas draws the slot regions + GENERATE chips on
    image-capable archetypes in both desks. CHECKPOINT: SPA screenshot of a real deck
    preview showing the chips. No behavior yet.
S2  AUTHORING. The mini-form (prompt + 3-style picker), `_userImagery` persistence,
    per-slide navigation, authored-slot badge ("2 of 6 slots authored").
    CHECKPOINT: SPA screenshot of authored state surviving a preview re-render.
S3  REGENERATE PASS. The button + resolver through generateOne with the correct style
    tokens; loading states per slot; failures leave the slot empty with a retry chip.
    CHECKPOINT: a real deck in the SPA carrying user-authored realistic imagery, reviewed
    by the owner IN THE APP before any push.
S4  EXPORT. PPTX download of that same deck; open it; verify each visual is a native
    replaceable picture at the canon geometry. CHECKPOINT: the opened file.

Recovered from history when S3 lands (cherry-pick, corrected): the IMAGE_SLOT_FIELDS map
and the deckImageryFill fence parsing (both in 50dbaeeb8/b21ccdc32) - reused as the slot
inventory + payload-injection helpers, with the fill TRIGGER now the user's button, never
an automatic pass.

## Status 2026-08-14 (local build, NOT pushed - awaiting owner checkpoint)
S1+S2+S3 implemented locally: services/userImagery.ts (USER_IMAGE_SLOTS map, suggestPrompt
content-derived prefill, resolveUserImageryForPayload through the illustration lane with the
REAL style tokens), SlideCanvas slot chips + mini-form (prompt prefilled from the slide's own
payload + Realistic/Illustration picker), CorpusChatPanel persistence + "Regenerate with
visuals (N)" deck button. tsc clean, 688 tests green, container rebuilt. CHECKPOINT WAITING:
owner generates a #slides deck in their live session (hard refresh first) and reviews the
chips, the prefilled prompts, and one authored render IN THE APP. Push only after approval.
Infographic style choice deferred (native exhibit lane already covers data panels). S4
(PPTX verification of user visuals at canon geometry) runs after the S3 checkpoint.

## S5 work queue (owner live test, 2026-08-14 evening - screenshots reviewed)
CONFIRMED WORKING LIVE: block-quote slide = photo + GENERATE SCENE PANEL chip + content-
derived prefill + Realistic picker. The S3 flow operates in the real session.
S5a EVERY-ARCHETYPE SLOTS (OWNER MANDATE, repeated 2026-08-14: "EVERY SLIDE NEEDS IMAGE PLACEHOLDERS AND GENERATE VISUAL FUNCTIONALITY" - this is the acceptance bar for the feature, not an enhancement): extend
    USER_IMAGE_SLOTS + composer variants to stat-row/means-matters (side scene), flow-arc
    (step art), aggregate-roadmap (phase art or side scene), evidence-table (header scene),
    quadrant/ranked-bars/milestone-timeline. Each needs a designed slot in the Figma canon
    FIRST (grid-true placement), then the composer variant, then the slot map entry.
S5b BLANK SLIDE BUG (live deck rendered one all-white body): identify the archetype/payload
    that rendered empty in the owner's session; add a composer fail-visible guard (a slide
    that renders no body regions must fall back to title+body text, never a void).
S5c EXHIBIT PANEL BLANK IN LIVE CHAT DECKS: infographic-exhibit's native panel did not fill
    in the owner's session (white void + takeaway band). Trace why the runtime exhibit
    resolver skipped chat-composed decks; fix or gate the archetype out until it fills.
S5d BLOCK-QUOTE PANEL REDESIGN (owner: the 900x200 strip reads as a sloppy sliver): rework
    the canon in Figma on the 12-col grid (candidate: right-column 573x778 scene swapping
    with the corroborating panel, or a 900x420 half-height zone with the quote tightened),
    then mirror geometry in slideComposer + exemplar-manifest + USER_IMAGE_SLOTS rect.
S5e REGEN CHIPS ON EXISTING IMAGES: chips must offer re-generation when a slot already
    carries an image from any source (cover seam fills included) - verify + cover in tests.
Order: S5b/S5c (defects) -> S5d (canon redesign, Figma-first) -> S5a (slot expansion) -> S5e.
Same discipline: local build, owner checkpoint in the app, push only on approval.

## Handoff pointers for the next session (context exhausted 2026-08-14)
- S5b guard: composeSlide final assembly returns at slideComposer.ts ~733 (the
  `return `<div style="position:relative;width:1920px...">${body}</div>``); guard = if the
  rendered body carries fewer than ~2 non-empty text regions, render the fallback (title +
  first string fields) instead of a void, and console.warn the archetype+payload keys.
- S5c: trace why infographic-exhibit's native panel never filled in the owner's live deck
  (runtime resolver path: services/artifactIllustrator.resolveArtifactImages / the chat deck
  seam); the archetype must not ship while its panel can render blank.
- S5a: canon-first per archetype (Figma 12-col grid), then composer variant, then
  USER_IMAGE_SLOTS entry; the chip UI generalizes automatically once the map has the entry.
- S5d: block-quote panel redesign in Figma (sliver 900x200 -> grid-true scene zone).
- Feature state: user-directed imagery flow LIVE in the local build, owner-verified on
  block-quote; NOT pushed. Rebuild command + checkpoint discipline unchanged.

## UX revision (owner, 2026-08-14 late): GENERATE-NOW per slide
Set on a slot = persist + render IMMEDIATELY: pulsing chip + spinner overlay on the slot
region while generating, the preview updates in place when done (iframe re-renders off the
new payload), chip flips to "Regenerate <slot>" once an image exists. The deck-level
"Regenerate with visuals (N)" button remains as a batch fallback. Export unchanged: the
payload fields feed stage HTML -> native PPTX pictures (S4-verified path). Fix rode along:
the resolver is statically imported (dynamic chunk 404'd on stale bundles = the dead
button); zero-render surfaces a chat notice; single-slot resolve via onlyField param.
