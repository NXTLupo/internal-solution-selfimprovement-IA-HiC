# #slides elevation: imagery, diagrams, density, writing, instruction adherence (2026-10-23)

Owner goal (verbatim intent): elevate every HiC #slides deliverable in professional imagery (the newest image
models the keys can call), diagramming of extracted material, iconography and visuals, content density without
overload, content writing, more detailed slides from corpora themes, and adherence to the user's instruction
(a "just reformat the uploaded slides with the #NXT theme" request never pulls the corpus in).

Phases advanced (hic-unified-vision): (5) anti-RAG retrieval on the deck path (deep theme block), (6) one routing
authority extended to IMAGE models per slot, (8) componentized runtime-filled GOLD imagery, (9) native PPTX (the
flowchart brick exports as a picture inside the composed slide, like every exhibit).

## 0. Research (2026-10-23, verified against the live model lists for the keys in `.env`)

| Provider / model | Verified | Price (per image) | Use here |
|---|---|---|---|
| Gemini `gemini-3-pro-image` (Nano Banana Pro, GA) | listed by the key | 1K/2K $0.134, 4K $0.24 | quality tier: cover backdrops, hero panels, exhibits |
| Gemini `gemini-nano-banana-2.1` | listed | 1K $0.034, 2K $0.050 | fast tier: thumbnails, header scenes, portraits, glyphs |
| Gemini `gemini-3.1-flash-image` (GA; the proxy used the `-preview` id) | listed | 1K $0.067 | ladder fallback |
| OpenAI `gpt-image-2.5-sunburst` / `-flare` (2026-09-08) | listed by the key | token-priced ($30 per 1M output tokens) | cross-provider fallback; true transparent output; custom WxH to 3840x2160; quality up to `max` |
| Diagramming | Mermaid 11.4.1 vendored (`proxy/vendor/mermaid.min.js`), laid out in the proxy's Chromium | none | native flowchart brick (decision trees, system flows, operating models) |

Rejected: D2 / Graphviz / Kroki (a binary or a service the container does not carry; Mermaid runs in the Chromium
already used for every exhibit and is themed from the brand tokens). Diffusion for diagrams stays banned (D17).
Sources: Gemini API model and pricing pages, the OpenAI models and images API reference, and the two keys' live
model lists (`GET /v1beta/models`, `GET /v1/models`).

## 1. Shipped (all UNCOMMITTED on `hic-clarification-and-ledger-2026-08-26`)

### Imagery: per-slot model ladder (`proxy/app.py`)
- `_IMAGE_LADDERS` quality = [gemini-3-pro-image, gpt-image-2.5-sunburst, gemini-3.1-flash-image]; fast =
  [gemini-nano-banana-2.1, gemini-3.1-flash-image, gpt-image-2.5-flare]. Provider fall-through on non-200 / empty.
- `imageConfig { aspectRatio, imageSize }` per slot (the request used to send no aspect at all); the SPA sends the
  registry bounds (`artifactIllustrator.generateOne`), the proxy picks the nearest supported aspect; tier = quality
  for full-bleed backdrops and panels of 400K px² and up (`imageTierFor`), fast otherwise.
- OpenAI path: `v1/images/generations` with custom `WxH` per aspect and tier, `background: transparent` for line art.
- Cache id salted with tier + aspect + `_ILLUS_PROMPT_VERSION`; registry rows carry the model used.
- Live probe through the restarted proxy: thumbnail via gemini-nano-banana-2.1 (37.5 s, 16:9 1K), hero via
  gemini-3-pro-image (42.4 s, 3:4 2K, 1792x2400); both editorial-grade photographs (scratchpad `ladder_*.png`).
- The `[slides:img]` loop runs three slides at a time (was strictly sequential).

### Diagrams: native flowchart brick (`proxy/nxt_diagram_render.py`, `_INFO_BODIES["flowchart"]`)
- Payload: `nodes [{id,label,kind: step|decision|system|actor|outcome|input}]`, `edges [{from,to,label?}]`,
  optional `groups [{label,nodes}]`, `direction LR|TB`. The model authors the graph, never the drawing.
- Brand theme from the palette (ink system nodes with paper type, chartreuse outcome, cyan edges, wash swim-groups,
  Archivo labels), fonts preloaded before layout, long labels wrapped on word boundaries, SVG scaled to the frame.
- Wired: `_diagram_spec_has_content` (3+ nodes, 2+ edges), `_DIAGRAM_STYLE_VERSION = v24-flowchart-brick`,
  `infographicSpecFrom` (nodes + edges -> flowchart), the component manifest and the infographic-composer skill
  (family table + depth contract). Verified render: scratchpad `parity/flow.png`.

### Density and writing
- `deckPlanGate`: DENSITY FLOOR per body slide measured on the payload (string chars with pointers removed, per
  archetype 200-520), plus a POINTER FLOOR in corpus-grounded decks (every body slide binds a `[path#cN]`). The
  existing anchored re-ask repairs; the violation names the thin slides. `measureDeckDensity` / `substanceOf`
  exported for the AIR patch. Tests: `deckPlanGate.test.ts` (density + pointer cases).
- Themes block on a generation turn (`shapeThemesForChat(…, { deep: true })`): five quotes per theme at 420 chars
  plus interpretation / implications / strategic implication / sub-themes (chat keeps three at 280).
- `deck-composer` SKILL §2: the floors stated to the model. Exhibit fit rules now match the payload contracts
  (quadrant `subjects`, role-needs `persona.needs`, comparison-panels and means-matters up to 3).
- Display titles wrap balanced (`text-wrap: balance`): no one-word orphan lines (live out7 slides 6-7).

### Iconography (compose-time, content-true or nothing)
- `attachContentTrueIcons` (`artifactIconResolver.ts`) fills `stepIcons` on flow-arc (new 60 px glyph cell at the
  card's top-right, base and outcome variants), `panelIcons` on comparison-panels (the header cell that existed but
  was never filled) and `columnIcons` on org-model, at compose time inside `composeSlide`: deterministic, offline,
  the 2,741-icon composition engine behind the `isContentTrueIcon` gate, a repeated glyph across sibling cards left
  empty. Test: `artifactIconResolver.composeTime.test.ts`; renders: scratchpad `parity/icons_pair.png`.

### Turn latency
- The request plan now starts before the attachment-intent decision and is awaited later (`_planPromise`); the
  two Flash calls ran one after the other (up to 24 s with both ceilings).

### Instruction adherence (reformat)
- Live run out7 on the owner's deck through the rebuilt build, fresh prompt: "Parity: 5 of 5 source slides
  carried"; zero contamination terms; 10 source pictures placed; no verification chain, no repair, no generated
  images; export 7 slides (10.7 MB). Request plan read `onlyProvided=true`.
- Fixes from that run's renders: a client photograph is CONTENT, so it rides a boxed panel (contain), never a
  full-bleed crop under the title (cover -> `heroImage`; the agenda takes nothing); `_provided` pictures never crop
  inside their panel; the contract carries the client's sentences AS WRITTEN (the style bans govern the model's
  own prose; live: "front door" was paraphrased to "starting point"); decision calls capped at 12 s (one Flash
  timeout cost the turn 20 s).

## 2. Verification bar for this pass
1. tsc clean; vitest 2089 passed / 1 skipped; template parity, orphans (0), generic rules, skills: PASS.
2. Proxy: ladder probe (above); flowchart render (above); health after restart.
3. SPA rebuilt; live corpus deck run and live reformat re-run recorded below.

## 3. Live runs after the rebuild

### Run 8 (reformat re-run, owner's deck): parity 5 of 5, 10 source pictures, "front door" carried verbatim, titles
balanced, brief cards dense. DEFECT: the cover took a generated off-subject landscape (gemini-3-pro-image) because
the imagery pass checked only its registered carrier (backgroundImage) while the client picture sat in heroImage,
and the background variant outranks the boxed one. FIX: a provided-content deck never generates imagery (the source
supplies every picture); generated interstitial scenes on corpus decks carry the deck subject in the prompt.

### Run 9 (corpus deck, "#slides #NXT Why first-year co-op readiness needs one guided hub ..."): 18 slides in 302 s;
deck gate: pointer floor caught two unbound slides, repair accepted (1 -> 0); seven images from the ladder
(gemini-3-pro-image x3, gemini-nano-banana-2.1 x4), all on the first try. Owner verdict on the evidence-table render:
"SLOPPY LAYOUT". Defects found on the 1920x1080 renders and FIXED in `slideComposer.ts` (stress payloads in
`layoutStress.fit.test.ts` and `evidenceTable.fit.test.ts`, renders in scratchpad `stress_sheet.png`):
- evidence-table: subjects ran into the next column and clipped at three lines (word-aware fit estimate, bold
  glyph factor 0.58, three-line budget), the long column heading wrapped under the rule (one-line fit), the intro
  ran under the header scene (narrowed), inline "(Source: X)" fragments inside cells (collected on the source line).
- two-line titles struck through the rule (comparison-panels) and the column headers (aggregate-roadmap): the
  title height budget (`ensureTitleFit`) now applies on every brand, base and variant regions.
- aggregate-roadmap: the fourth row ran past the slide bottom (row pitch and cell height now fit the canvas, cells
  fitted and clipped).
- org-model: every definition clamped mid-sentence while a quarter of the card sat empty (definition budget 150 px,
  lower blocks moved down, glyph beside the name).
- problem-diptych: the card body ran below the card (fitH 100).
- the header scene covered the wordmark (moved under the masthead row, 478x140 at y84).
- flow-arc descriptions at body size; source lines deduplicated ("Sources: A; B; C", five names max).
- NINE near-empty "Appendix: Workflow and Deciem"-style pages padded onto a nine-slide deck by the coverage pass: a
  deck never takes appendix slides; the receipt names what the deck does not carry and points to #report.
### Runs 10 and 11 (same two prompts on the fixed build; decks and renders in
`C:\Users\JonathanLupo\Downloads\HiC-slides-elevation-2026-10-23\`)
- Run 10 (reformat): "Parity: 5 of 5", "[slides:img] provided-content deck: the source document supplies every
  picture; nothing is generated", zero [illustration] lines, the client's Northeastern photo in the BOXED cover
  panel (760x507, full frame), no photo cropped mid-text, "A simpler front door for students" verbatim, 7 slides.
- Run 11 (corpus deck): 10 slides (was 18): no appendix pages, coverage receipt "Not carried on slides ...";
  deck gate pointer floor caught one unbound slide, repair accepted; 7 ladder images (3 quality, 4 fast), all on
  the first try; no two-line title crossing a rule or header; no clipped subject; no row off the slide; no
  definition cut; no text outside a card; no "(Source:" fragment on any slide; header scenes below the wordmark;
  DOM overflow scan 0 hits on all 10 slides.
- Residuals from run 11, FIXED and gated (`layoutStress.fit.test.ts`): block-quote attribution rendered twice
  (name fitted to one line, a role equal to the name dropped); per-item and single-semicolon source lists not
  deduplicated ("AWS ML Blog; aws ml blog (Oct 2026)"); ".;" and glued quotes (client"homework"in) from the repair
  pass normalized at compose time; the header scene dropped on a variant layout (flow-arc with an outcome band);
  a tag-matched "cookie" glyph on a step card (compose-time icons now exclude bare tag matches); the milestone
  timeline's empty band (optional intro line, axis 70 px higher).
### Run 12 (corpus deck on the residual-fix build; `corpus-deck-run12-FINAL-*` in Downloads)
11 slides, 375 s; pointer floor caught two unbound slides, repair accepted; six ladder generations (3 quality, 3 fast)
plus cache reuse; no attribution collision, no "(Source:" fragment, no ".;", no title crossing a rule, no clipped
cell / row / card, the flow-arc with an OUTCOME band carries its header scene, no slide over 40% empty, every header
scene below the wordmark. Last residuals, fixed and unit-tested after the run: one source under two spellings
("AWS Machine Learning Blog" / "aws ml blog", "Reddit Deep: r/x" / "Reddit r/x") now compares on a normalized key;
a glued quote where the closing mark precedes a comma; the "session" word resolving to the web-cookie glyph (a
technical-homonym deny list for compose-time glyphs).
### Owner verdict after run 12: "zero diagrams which I asked for"; templates and visuals not elevated
Root cause: the visual floor counted tables and panels as visual, so the model satisfied it without a single drawn
exhibit; nothing required or supplied a diagram. Shipped:
- DIAGRAM FLOOR in `deckPlanGate`: 6+ body slides need one `slides:infographic-exhibit`, 9+ need two; a request that
  names a flowchart / diagram / decision tree / escalation path needs a flowchart exhibit (nodes + edges). Named in
  the re-ask; `remapForDiagramFloor` then converts the first step sequence (flow-arc or milestone-timeline) into a
  flowchart exhibit (nodes, linear edges labeled from the step descriptions, an outcome node, the steps kept for
  the fail-visible base) when the model still omits one. `measureDeckExhibits` exported for the AIR patch.
- SO-WHAT BAND (`withTakeawayBand`): comparison-panels (<= 4 criteria), milestone-timeline, ranked-bars (<= 5),
  role-roadmap close with the accent band carrying `takeaway.statement`; manifest and skill updated.
- deck-composer SKILL §2: DIAGRAM FLOOR and SO-WHAT BAND stated to the model.
Tests: `deckPlanGate.test.ts` (floor, flowchart request, remap payload), `layoutStress.fit.test.ts` (band render).
### Run 13 (Northeastern Experiential Learning Hub corpus, flowchart requested; old build)
Subject relevance holds on a matching corpus: every slide's evidence is Northeastern / co-op / students / advisors /
employers (CLR executive summary, SOW014/015, Student 360 brief, r/neu, r/uwaterloo); the model drew a real flowchart
(12 nodes, 15 labeled edges, 3 swim-groups) through `/api/ai/diagram`. Defect: the drawing rendered as a thin strip
with unreadable type. ROOT CAUSE: the chromeless exhibit shell zooms its 1600px design space (CSS `zoom` about 2x) and
Mermaid measures labels under that zoom but lays out in unzoomed units, so every node ballooned and every graph became
a 6:1 strip; Mermaid also ignores a subgraph's own direction once an edge crosses its boundary, so stacking groups is
not available. FIXED: the flowchart renders at zoom 1 and is captured at the SVG's own size; type 33/27 px; labels
wrapped at 12 chars for six-plus nodes; cluster labels on one line; the contract caps a flowchart at eight nodes (the
legible ceiling across one slide width). NEW SLIDE ANATOMY for the flowchart exhibit (`slides:infographic-exhibit`
variant `_flowLegend`): the drawn flow full width under the title, a four-column READING LEGEND derived from the
payload's own nodes and edges (decisions with their branches, systems, actors, outcome), the so-what band, sources.
Render: Downloads `samples/flowchart-exhibit-slide.png`; test `flowchartSlide.fit.test.ts`. Also from this pass: the
composer's glyph estimate is 0.56 em (Archivo regular; 0.52 let legend text run under the band), the legend keeps
branch targets to four words with a clause-aware 230-char cap, cluster titles take the theme size (a CSS size
override after Mermaid's measurement made them wrap into the box edge).
### Run 14 (Northeastern corpus, fixed build): the diagram floor WORKED
13 slides in 366 s. Gate: "diagram floor: 1 native exhibit slide(s) for 10 body slides (floor 2)" plus one unbound
slide; the re-ask fixed both (2 -> 0). Two native exhibits: a stat-row (four cited cards) and the escalation
FLOWCHART (8 nodes, 3 groups, 10 labeled edges) with the four-column legend and the PLACEMENT BOUNDARY band; so-what
bands on six slides; every photo on-subject; every evidence sentence about Northeastern co-op. Two /api/ai/diagram
calls, nine ladder images, all first try. Residuals fixed after the run: three titles clause-cut mid-sentence (the
title budget's 28 px margin left a one-line budget; now 16 px with a 78 px floor so a title steps down to two
subhead lines instead of being cut); "(Source: X)" fragments inside stat-row quotes rendered twice on the cards (the
exhibit builder strips them and keeps the name as the source); a "[Source: ...]" bracket inside a thesis title
(bracketed fragments tidy too); the legend's three-word edge labels read "ready to:" (full label, five-word target);
nodes touching the group title (Mermaid subGraphTitleMargin). Deck: Downloads `northeastern-corpus-run14-*`.
Not fixed (content, not layout): the test session's corpus is the agency / consulting landscape, so analog evidence
(RingCentral, Webflow, freelance) is what the corpus holds for a co-op prompt; the governing-thesis alternatives and
the precompacted history carry that corpus too. A co-op corpus is the right test bed for subject relevance.

## 4. Open items
- Nano Banana 2.1 took 37 s for a 1K thumbnail in the probe; if that holds, move thumbnails to
  `gemini-3.1-flash-lite-image` (1K, ultra-low latency) and keep 2.1 for portraits.
- Concurrency in `[slides:img]` is 3; raise to 4 once the proxy's per-process Chromium and provider limits are
  confirmed under a 12-slide deck.
- Reference chaining is not applied on the photo path (OpenAI generations take no reference); palette consistency
  rides the prompt grade only.
- Request plan + attachment intent still run one after the other; running them concurrently saves up to 12 s.

## 5. SYSTEM guarantees (2026-10-24, owner: "don't just fix the slides, FIX THE SYSTEM")
Owner screenshots of run 14 showed four classes of defect; each is now prevented by the engine, not by a slide fix:
1. **Leaked citation fragments / raw pointers on any rendered surface.** `tidyInlineSources` (compose time) strips
   "(Source: X)", "[Source: X]" and raw `[path.md#cN]` from every string and collects the names on the source line;
   the native exhibit builder (`infographicSpecFrom`) strips the same before any card or diagram is drawn.
2. **Text that overflows, collides or is cut.** The composer's fit now MEASURES words with a canvas in the region's
   own face and weight (`measureTextWidth`; the glyph-factor estimate is the fallback outside a browser); titles get
   a two-line floor (78 px) so they step down instead of being clause-cut; block-quote tiles are height-budgeted.
3. **A LAYOUT GATE after every deck** (`services/layoutGate.ts`): each slide's rendered document is measured
   (off-canvas text, clipped boxes, colliding text boxes with row numerals exempt, leaked fragments, dead space);
   a failing slide gets `_fontScale` 0.92 / 0.85 / 0.78 and is re-measured; the receipt is a chat line ("Layout
   check: N measured; clean; repaired; open") and `[layout-gate]` console lines. SlideCanvas iframes carry
   `data-slide-id` so the gate can find each document.
4. **Diagrams:** groups are drawn AFTER layout as background bands around their members (never dagre clusters, which
   routed edges through boxes and parked nodes on titles); stat cards top-align with a larger value and quote; the
   exhibit is drawn from the POST-repair payload (the imagery pass waits for the verification chain on exhibits), so
   the drawing and its legend can no longer disagree (live run 15).
Run 15 (the build before this section): deck gate passed first time, no cut titles, no fragments, flowchart with
legend and band; the two residuals it still showed (edges through group boxes, legend vs drawing mismatch) are items
4 above. Deck: Downloads `northeastern-corpus-run15-*`.

## 6. Four-lens audit of the system-build deck (2026-10-25) and the fixes
A workflow captured the run-16 deck (Northeastern corpus, 11 slides) and audited it as a presentation designer, a
copy editor, an engagement partner and an information designer: 55 defect classes, each traced to file:line with a
proposed systemic fix (`scratchpad/parity/rootcauses.json`; the adversarial verifiers were cut off by the session
limit, so each cause below was checked against the code by hand before it was fixed).
- BLOCKER, persistence: images, the flowchart and repair edits lived only in React state. On reopen the panel adopted
  the saved deck only when empty, the subscription never replayed the saved deck, and the re-lift minted random ids,
  so a reopened session showed and exported the raw model output. FIX: `subscribeDurableArtifacts` replays the
  current projection; `adoptDurableSlides` replaces a raw re-lift (`_relifted`) with the processed deck of the same
  reply (timestamp|model); the lifter skips a reply whose processed deck is present. Test `durableSlides.test.ts`.
- BLOCKER, flowchart slot: the derived legend variant put the drawing in a 4.5:1 strip and printed a label dump.
  FIX: the legend is removed; the drawing takes the full 1622x600 slot; the renderer lays the graph out LR and TB,
  keeps the orientation with the larger legible scale, scales the SVG to the frame and captures the frame, so the PNG
  has the slot's aspect. Swim-group bands are drawn only when they do not intersect; otherwise nodes are tinted per
  group with a swatch legend.
- Layout gate coverage: it measured only mounted previews (5 of 11). FIX: every slide renders into one offscreen
  1920x1080 frame from its current state (`createOffscreenStage`).
- Composer normalization (`normalizeRegions`, every archetype, base and variants): one bounded, fitted source
  footer (content box, two lines); one content-rail masthead (deckTitle, y86, leading 1.06); accent TEXT on light
  grounds darkened to WCAG 3:1 / 4.5:1 (`accessibleOn`; fills and bands keep the brand accent); matrix columns fit
  the content box and rules span the table; list items are blocks with a gap, never a 2.3 line-height; `grow` cells
  fill hollow cards at the readable tier; block-quote gains an action-title slot and one text left edge; timeline
  markers anchor their labels; agenda and org-model headings sit below the title size.
- Source names: `canonSourceName` strips "Client document:" prefixes, " Copy" and "- 09302026" suffixes, retrieval
  parentheticals, and "Reddit Deep:" labels, on every source line and attribution.
- Contract (DECK MODE + deck-composer skill + manifest): action title on every body slide (block-quote has `title`),
  kickers name the subject not the structure, titles state what the body shows, acronyms spelled out, no contract
  codes in body text, today's date given so past milestones show as done, agenda maps the deck, one fact one version.
Still open from the audit (content judgment, not layout): evidence independence and scope match on peer analogs,
cross-slide contradictions in the model's own content, card heights fitted to content (the `grow` tier fills them
instead), a docked takeaway band.

## 7. Latency, persistence, copy critic and real photography (2026-10-26)

Owner, in order: "this is an unacceptable amount of time to create a slide deck" (a reformat at 1135 s, then 1807 s);
"The descriptions, summaries, and headlines are fragments ... Don't we have a critic for this?"; "the images look so
AI generated!! ... avoid overly futuristic looking slop!"; "WHEN IMAGE MODELS CANT VISUALIZE ABSTRACT CONCEPTS USE OUR
DIAGRAMMING TOOL!!!"

| Symptom | Root cause | Fix |
|---|---|---|
| 19- and 30-minute timers | (a) I restarted the proxy under a live job; the job file said `running` forever and the client polled to a 45-minute ceiling. (b) Every reformat ran TWO full Opus generations: the parity re-ask regenerated the whole deck. (c) A reformat ran at high effort (20K of 24K output tokens were reasoning). | (a) `proxy/app.py` job heartbeat thread (`_JobHeartbeat`, 15 s) + stale verdict (`_job_interrupted_state`, 75 s) answers 503 so the retry loop resubmits; cancelled tasks record an ending; `GET /api/jobs` lists live jobs for the pre-rebuild idle check; client ends on three 404s. (b) `sourceParity.parityRepairInstruction` asks for ONLY the missing slides at medium effort and `mergeParityFences` splices them in source order. (c) provided-content turns run at medium effort. |
| Images and repaired text gone after a reload | A session save fired only on chat or research-result changes; images, repair rewrites and type step-downs change only the deck. | `App.tsx` subscribes to the durable projection and schedules the same silent save on any changed slide object (identity); a restore records its own artifacts as seen. |
| "Layout check: 0 slides measured" | Unknown at the time; the offscreen frame was proven sound in the app's own Chromium (loads in under 300 ms). | Every skip now names its reason in the receipt, a slide the offscreen stage cannot build is measured in its mounted preview, ids compare as strings, and `nextFrame` cannot hang in a hidden tab. |
| Fragment headlines and descriptions | The title gate's `no_verb` is detect-only; nothing checked body fields; a reformat skipped the whole chain. | `services/copyCritic.ts`: one Opus (medium) copy-editor pass on EVERY deck after the chain, field-level rewrites behind a fact guard (`acceptCopyRewrite`: no new figure, no dropped figure, 75% of names kept); receipt "Copy edit: N fields read; M rewritten". One `_deckSettled` promise gates the layout gate, the drawn exhibits and the export on it. |
| Mixed type sizes inside a set of boxes | Every repeated cell fitted itself. | Sibling text cells of one group share the smallest size any of them needs (`groupPx` + `applyFitAt`, pinned, no further step-down). |
| Icons on 2 of 4 cards | Content-true icons resolved per card. | A row carries an icon on every card or on none. |
| AI-looking, futuristic photos | The photo prompt asked for "Professional editorial photograph", "cinematic", "golden-hour" and fed the slide's abstract headline to the image model. | `_photo_scene` (flash utility pass, temperature 0) writes ONE ordinary scene in the owner's five-part formula; `_photo_prompt` adds `_PHOTO_NEGATIVES`; `_ILLUS_PROMPT_VERSION = "p3-realphoto"`. A slide whose point is abstract returns a flowchart built only from the slide's own words (`_abstract_diagram_from`) and is drawn by the native diagram renderer; with nothing to draw, the SPA tries the payload's own structure, else the slot stays empty. Backdrops are always photographs. |

Tests: `proxy/tests/test_job_heartbeat.py`, `proxy/tests/test_photo_prompt.py`, `services/copyCritic.test.ts`,
`services/sourceParity.test.ts` (splice), `services/artifactIconResolver.composeTime.test.ts` (all or nothing).
Memories: `feedback_idle_check_before_rebuild_includes_job_polls`, `feedback_photo_prompts_real_photography_no_futuristic`.

Second rerun findings (2026-10-26, same day) and fixes:

| Symptom | Root cause | Fix |
|---|---|---|
| Three duplicate slides in a reformat (a second four-step slide, a second appendix, a summary of the account slides) | `sourceParity.namedEntities` ran on the slide's lines JOINED, so names were glued across line breaks ("DECIEM CANON", "CORTEX NORTHEASTERN", "Diagnose Find", "Q1 2027 Benefits Cortex"); no deck can carry those, so carried slides read as missing and the repair added slides that repeated existing ones. "ESTÉE" was cut to "EST". | Names are extracted per line, accent-aware (`\p{Lu}`), and a name counts as carried when each of its words appears. Replayed on the owner's real deck: 8 of 8 carried on the first pass, so no repair call. The splice also drops any repair slide whose words overlap an existing slide by 60% or more. |
| Two body columns of one table row at 21 px and 25 px | Shared size was per column only. | Cells with the same text style share one size across columns too. |
| "The appendix separates ...", "APPENDIX: HOW TO PRESENT THESE NUMBERS" survived the copy edit | Rubric did not forbid references to the deck itself. | Rule 5 now forbids any field referring to the deck, an appendix, a slide, a section or the narrative; refused rewrites are logged (`[copy-critic] refused ...`). |
| Layout gate "11 x no document (offscreen or mounted)" | The frame never answered in the owner-scale session (1,000+ slide frames); the same frame loads in 300 ms on the app's own landing page. Cause not yet proven. | The receipt now records whether the frame was attached and whether a load event fired. If the client frame cannot be made reliable, the measurement moves to the proxy's Chromium, which is where the PPTX is rendered. |
| Abstract-concept diagram drawn as plain boxes with "work from" on every edge | Every node was a plain step. | The hub (3+ links) renders as the dark system node, senders as actor pills, a label repeated on every edge is dropped; small graphs may scale to 2.4x (`_DIAGRAM_STYLE_VERSION = "v25-abstract-fit"`). |

Third rerun (2026-10-26): send to slides 85 s on a fresh Opus call; parity 8 of 8 on the first pass (no repair, no
duplicates); type uniform inside every box set; nothing clipped. Two system gaps closed after it:

- Layout gate MOVED to the proxy. The receipt proved the in-page frame was attached but never fired a load event in a
  1,000-slide session. `proxy/layout_measure.py` (MEASURE_JS mirrors `measureSlideDocument`) measures the batch in the
  proxy's Chromium with the exporter's own file:// load and font wait; inline images are swapped for a 1-pixel
  placeholder (2.5 MB -> 65 KB for 8 slides, 11 s). `POST /api/layout/measure`; `layoutGate.measureViaProxy`;
  `runLayoutGate` takes `measureMany`, re-measures only failing slides, and builds each re-measured slide's html with its
  step-down applied (never waits on React). The in-page frame stays as the fallback when the proxy is unreachable.
  `proxy/tests/test_layout_measure.py` plants an overlap, a clipped box and off-canvas text; all are caught.
- Fact guard refused the three rewrites that mattered: an ALL-CAPS label now has no names to keep, a figure the slide
  states elsewhere may move into the rewritten field (the year in "2027 continuity"), and two-word labels are read.
  Rule 7: two fields never carry the same sentence.

Fifth run (uncached, 2026-10-26): send to slides 65 s; copy edit 20 rewrites, 0 refused; layout gate 9 of 9 measured
clean in the proxy; no session leakage ("Northeastern" only where the source has it). Three defects, fixed:
- Information loss: account slides dropped the "2027 continuity path" box ($500K, $840K, $66,625 a month, the 300 Connect
  pipeline) and parity still read 8 of 8. `parityCheck` now requires every source figure; the repair asks for ONE fence
  per uncovered source slide carrying ALL its units, and `mergeParityFences` REPLACES the deck's slide for that source
  slide in place (adds only when the deck has none). Replayed on run 1's first pass: 4 of 8, missing exactly those figures.
- A source picture placed twice (8 placed from 6): each source picture now lands once.
- Box bodies left as noun phrases: the critic rubric now maps field paths to form (body/description/lede/... are
  sentences; label/name/kicker/status/... are labels).
- Also: the ENGAGEMENT CONTEXT block and the full-corpus provenance index are no longer in a provided-content prompt
  (the session goal had leaked "Northeastern stakeholders" into the cover); the grounding log says when it is pre-filter.

Sixth run (2026-10-26): parity caught the four dropped figures and the repair REPLACED the four account slides ("4
slide(s) completed, 0 added; 8 of 8"), yet $500K / $840K / $66,625 / 300 Connect were still missing from the deck. Cause:
`slides:brief-card` draws `count: 4` blocks and silently dropped the fifth ("2027 continuity path"). Fix:
`withBlockOverflow` re-grids a brief-card with five or six blocks (2 x 3 beside the picture, 3 x 2 without one) and
`renderColumns` warns `[composer] blocks: N given, M drawn` whenever ANY template is handed more items than it draws.
Rendered and measured in the proxy: five blocks, no overlap or clipping (`services/briefCardOverflow.fit.test.ts`).

Seventh run (2026-10-26, both Opus calls served from the proxy cache): the fifth box rendered, but (a) the repair had
been handed "figure: 500K" with no context and wrote "Canon CFS shows 840K on its 2027 continuity path" (currency,
unit and meaning lost), and (b) the 480-wide 2 x 3 grid truncated bodies mid-phrase and dropped second sentences
(Andrew Fegley, Rob Koch, CIO sponsorship). Fixes: every missing name or figure in the repair instruction carries its
source line ("carry it with its meaning"); on a provided-content slide (`_provided` -> `tk._noTruncate`) the composer
never truncates (`fitWithoutLoss` steps down a pixel at a time to the hard floor; the layout gate judges the rest); the
five-or-six-box grid beside a picture uses 560-wide boxes and a 420-wide picture. Long-body test: every sentence whole,
no collision in the proxy measurement.

Eighth run = FINAL reformat (2026-10-26, Downloads/HiC-reformat-Client-Portfolio-2027-run8-FINAL.pptx): every source
figure carried WITH its meaning in HTML and PPTX ($500K H1-2027 extension, $840K proposal risk-adjusted to $470K,
$66,625 a month on the Nov 2026-Jan 2027 draft SOW, 300 Connect in the pipeline list); no sentence cut; copy edit 41
rewrites, 1 refused (the rewrite dropped "Jan. 31, 2027"; the guard was right); layout gate 9 of 9 clean; each source
picture once; nothing from the session corpus. Timing: deck in 28 s (first pass from cache) + fresh repair 21 s, copy
edit 61 s, layout 11 s; the fully uncached run 5 reached slides in 65 s.

Open (next pass): (1) five-box grid spacing is tight (12-19 px from a body to the next label); (2) the critic
over-applies "name the actor" (most bodies and six titles open "NXT Humans"); (3) cross-slide type harmony (bodies
23 vs 24 px, ledes 25 vs 28 px, ranked-bars title 36 px beside its header picture); (4) other templates also drop items
(`[composer] criteria: 7 given, 5 drawn`, `groups: 3 given, 2 drawn` seen on older decks): give each the re-grid
treatment brief-card got; (5) source line keeps the filename's " 1" copy suffix; (6) a bare "X, monthly T&M capacity"
fragment survives when its only rewrite would drop a date.

Open items closed after run 8 (2026-10-26): (1) five-box grid gap 30 px by design (pitch 226, body fitH 152);
(2) critic rule 7a: the most specific actor, no subject on more than two fields of a slide or a third of the titles;
rule 7b: one form per table column; (3) DECK TYPE HARMONY: `deckTypePins` composes each slide once with a size recorder
and pins, per archetype used twice or more, the smallest size each text region needed (`composerPayload._typePins`,
read by every renderer), run after the copy critic; (4) comparison-panels re-pitches 6-8 criteria into the 660 px band
and agenda draws three groups in three columns/panels (the old 5-row test that asserted truncation now asserts the
rows are drawn). `services/deckHarmony.fit.test.ts`. Next: a corpus-driven deck on this build to exercise imagery
(real-photography prompts, abstract -> diagram), the copy critic, harmony and the layout gate together.

Corpus deck on the new build (2026-10-26, out26): photos read as ordinary documentary photographs (an advisor at a
worn desk, an office worker by a window: no CGI, nothing futuristic); the requested escalation flowchart drew student ->
staff -> employer; copy edit, type harmony and the layout gate (13 of 13 clean) ran. Defects, fixed after it:
- Abstract -> diagram routing drew 8 px diagrams in 450 x 30 header strips and sparse 3-node diagrams in panels:
  `_photo_scene(diagram_ok)` now answers with a diagram only for slots >= 500 x 360 (SPA fallback threshold aligned)
  and only with >= 4 nodes / 3 edges; every smaller slot is always a photograph of the real setting.
- Diagrams quoted the session's goal ("...requires Product requirements document"): `_split_deck_subject` cuts the
  goal to its subject ("Generate a comprehensive PRD for X" -> "X"), offers it only as photo-setting context, and
  diagram labels validate against the slide text alone.
- Citation fragments in drawn text ("SOW014 ... Compa", "[articles/...md#c0]"): `cleanDiagramText` on flowchart node and
  edge labels and before/after points.
- The owner's thesis was narrowed by the evidence repair ("needs one guided hub" -> "benefits from coordinated advisor
  tools"): `isThesisField` keeps the cover title and thesis-interstitial thesis out of the repair (an editorial
  judgment the user asked for, not a factual claim).
- Title sizes 46 / 58 / 60 in one deck: block-quote and evidence-table titles moved to the deckTitle tier (step down
  only when two lines need it) and `deckTypePins` pins every content title to the deck's smallest (never below 46).
- "co- / op" hyphen breaks (`txt`: short hyphen pairs ride a nowrap span; the exporter keeps inline spans in one run),
  agenda numbering prefixes stripped, near-duplicate source names collapsed (`SAME_SOURCE`), critic rule 6a against
  tautological titles.

Second corpus run (2026-10-26, out27): thesis held ("First-year co-op readiness needs one guided hub"); all ten photos
ordinary documentary; header strips are photos (no 8 px diagrams); no PRD wording or citation fragments in drawn
text; flowchart showed student -> staff -> employer. Fixed after it:
- Section dividers with a picture panel: the hero-panel path rebuilt regions from the raw spec, dropping the title's
  height budget; a long uppercase title wrapped to three lines in the 939 px column and overlapped the supporting line
  (the gate's 0.78 step-down was not enough). `ensureTitleFit` now runs on the narrowed regions, and regions the CSS
  uppercases are measured uppercase (`services/dividerHeroTitle.fit.test.ts`; measured clean in the proxy).
- 36 px titles beside a 478 x 140 header strip: a generated slide whose title is longer than one line at 1120 px keeps
  the full-width title and drops the strip (a reformat keeps its source picture).
- Portrait diagram panels try top-to-bottom first.

Third verification pair (2026-10-26, out28 corpus / out29 reformat): corpus kept the thesis, 14 of 14 clean, realistic
photos, flowchart correct; reformat carried all nine figures with meaning. Fixed after it:
- Source matching used only a source slide's title + labeled sections, so a source titled "Northeastern" matched any
  slide naming Northeastern: the parity repair replaced the AGENDA with an account slide (two Northeastern slides, no
  agenda) and a picture went to the wrong slide. Matching now uses the slide's full text (`slideText`); the repair
  replaces the slide that carries the source BEST; pictures are assigned best-first (`pictureAssignments`).
- A reformat's native exhibit (the slide's own data drawn) was empty in the preview: drawn for provided-content decks too;
  before/after sides carry the payload's own names ("Contracted" / "Proposal", not "Before" / "After").
- Five header scenes were generated and then dropped beside long titles: `wouldShowHeaderScene` skips generating them.
- Full-height hero panels (dividers, covers) are always photographs (a 10 px node chain drew in one).
- problem-diptych joins the deck-wide title size; source names drop underscores and "- 09302026" stamps; the critic
  forbids a subtitle that describes the document; every refused rewrite logs its reason.

Fourth verification pair (2026-10-26, out30 corpus / out31 reformat): one Northeastern slide, agenda intact, every
source picture on its own source slide, contract-status exhibit drawn with "Contracted / Proposal" sides, all nine
figures with meaning; corpus thesis held, 13 of 13 clean, header scenes skipped instead of generated-and-dropped,
content titles uniformly 46 px. Fixed after it: the fact guard read "Avoid" after a closing quote and "H1-2027" as
names (a sentence may end on a quote; a token with digits is a figure), so the presenter-advice band and two fragments
were refused their rewrites; "Client document" stripped the front of "Client documentation" (word boundary added);
divider supporting text gets a 68 px budget (it sat beside the 9-dot mark); agenda group labels step below the title
(36 px) and one group draws one full-width panel; comparison exhibits set at 28 / 22 px (were 19 / 14, ~15 px on the
slide), `_DIAGRAM_STYLE_VERSION = "v26-comparison-type"`.

FINAL (2026-10-26, out33 reformat / out32 corpus, delivered to Downloads as HiC-reformat-Client-Portfolio-2027-FINAL-v2
and HiC-corpus-deck-coop-readiness-FINAL): reformat 10 slides, parity 8 of 8, nine figures with meaning, one slide per
account, agenda intact, pictures on their own source slides, exhibit readable with correct sides, no presenter advice,
titles 46 px, layout 10 of 10 clean; corpus 13 slides, cover = requested thesis, documentary photographs, native
escalation flowchart, titles 46 px, layout 13 of 13 clean. Last fix after it: the evidence repair never rewrites the
agenda (it had turned section names into "Overview of planning steps"). Known and left: one refused fragment whose
rewrite dropped a date (the guard was right), the filename's " 1" in reformat footers, the corpus run's doubled
source names (filename-derived vs described) and description-like source entries, a milestone-timeline scene logged
as attached but not drawn, and flowchart node text ~16 px on a wide 13-node graph.

Hook audit round (2026-10-26, after the FINAL delivery): four named gaps, root-caused and fixed.
- Iconography: org-model drew 0 of 3 icons because the icon library had no vocabulary for role nouns (students,
  advisors, employers, staff all fell to the generic default mark the content-true gate refuses). `ROLE_ICONS` in
  `services/iconLibrary.ts` maps short role/audience concepts to role glyphs (higher-ed:cap, workforce:badge,
  workforce:org, partnership, customer, team, people); `CONCEPT_TAG_DENY` keeps the ML "supervised" glyph off
  "learning" / "guided" (it had landed on "Experiential Learning staff").
- A header scene logged as attached but not drawn: generation was judged on the draft title, the copy edit lengthened
  it, the composer then dropped the strip. Header scenes now wait for the deck text to settle and judge the final title.
- One source under two spellings ("CoOp" vs "Co-op and"): `SOURCE_WORDS` joins hyphens and drops stop words.
- Flowchart text ~16 px: an 11-13 node graph is width-bound in the 1622 x 600 slot. The contract's 3-8 nodes is now
  gate-enforced (`FLOWCHART_MAX_NODES = 9`, violation "a flowchart carries N nodes ... condense"), so the anchored
  repair condenses it before render.
Research and model choice: section 0 above (live model lists for both keys, prices, Mermaid chosen over D2/Graphviz/
Kroki); the proxy ladder uses gemini-3-pro-image (quality), gemini-nano-banana-2.1 (fast), gemini-3.1-flash-image and
gpt-image-2.5 (fallbacks); live logs show "gemini-nano-banana-2.1 (fast, 3:4)" serving slide photos.

Round 12 (2026-10-26, corpus run out34 reviewed slide by slide): the hook-round fixes were partly hidden by deeper causes.
- Flowcharts have NEVER been fitted. `_FIT_JS` declared `(fw, fh, cap)` but Playwright's `page.evaluate` passes one
  argument, so fh and cap were undefined and k was NaN: every flowchart shipped at its natural size (node text ~16 px on
  the slide, the drawing in a fifth of the slot). The function now destructures `([fw, fh, cap])`; the probe of the live
  graph measures k = 1.37 (node text ~22 px, full slot width). Actor nodes are rounded boxes, not stadiums (a stadium's
  semicircular ends cut through any label taller than two lines).
- The org-model icons were resolved and then thrown away: the runtime carrier merge (`slideRuntimeCarriers.ts`) kept a
  hand-written carrier list without `columnIcons` (also missing: stepIcons, panelIcons, archetypeIcons, peerImages,
  patternImages, hubImage, actionImages). The list is now derived from the slot registry (`registeredImageCarriers()`).
  Two more causes under it: `oneIcon` passed the name as concept AND heading, doubling "Advisors and staff" past the
  role check's word limit; the role check now accepts names up to seven words. A #slides card row from the registry
  resolver now follows the card rule too: strict concepts, every card or none.
- The copy critic's fact guard read a chunk pointer's page hash (`16802a9c83.md#c..`) as the figure 16802. Pointers are
  split off before the editor reads a field and re-attached to an accepted rewrite; a headline may hand a name to the
  slide body that still states it.
- Source footers: connector tags ("(RSS)") and list joints ("and online forums") are stripped; a descriptor made only of
  generic words ("industry analysis") is not a source; a statement of work and its SOW-numbered slug are one source and
  the readable name stays; a footer no longer repeats a name the slide body draws (quote attribution, card source).
- Evidence-Label rule enforced in the composer: an evidence-table column headed "Evidence" over source kinds reads
  "Source type".
- Typography: straight double quotes become typographic pairs, apostrophes curly, a colon before a quote takes a space.
- Block-quote: the mark hangs in the margin at the quote's first line (it sat beside a two-line title); kicker and title
  move onto the content grid.
- Before/after exhibit: the type grows until the fuller panel is ~85 % full (it centered three points in a 566 px card).
  `_DIAGRAM_STYLE_VERSION = "v27-flowchart-fit-comparison-fill"`.
- A false receipt: the deck coverage line said "31 more added as appendix exhibit entries" on a deck that adds nothing.
- A false block: a verbatim stakeholder quote was UNVERIFIED_QUOTE because the pointer named a neighbouring chunk of the
  same upload. The claim gate now verifies a quote against the whole cited page; a quote no cited document holds is
  still blocked (`claimLedgerGate.test.ts`).
- Critic rubric 7c: a list label names what its items are ("TEAMS" over product features), and a recommendation title
  states the decision, never the recommended state as present-tense fact.

Round 13 (2026-10-26, owner: "the images are terrible and the model did not listen to the prompt ... and over indexed on
the upload in the analyst chat even though I asked for some prior context from the external corpora").
- The ask: a positioning deck with "specific data-backed proof points from the research", then a "Work" section with all the
  attached slides. The attachment model read it right ("content to be incorporated directly into the Work section"); the
  send path then hard-wired `content-source` to useOnlyProvidedContent = true, so the corpus, the proof points and the
  market context were all dropped. Now: the attachment model also returns `alsoUseResearch`, the request-plan prompt says a
  research ask beside an attached section is never provided-only, and a third mode (`carryAttachment`) keeps the research
  grounding AND carries the attachment: ATTACHED_SECTION_CONTRACT + the source-slide plan in the prompt, parity checked
  after the reply, `_provided` only on the slides that carry an attached slide (`sourceSlideFor`), the claims chain on the
  research slides only, generated imagery on the research slides, attached pictures only on attached slides.
- Images, two causes. (1) The attachment's own pictures are AI collages (gold pipes, glowing globe); the reformat contract
  carried them onto the cover. (2) The scene writer's prompt listed example props ("creased paper, a coffee ring, a cable
  across the desk") and "foreground object slightly out of focus", so at temperature 0 every photo was a person at a desk
  with a cable and a water glass. Fixes: an IMAGE CRITIC (`_image_critic`, gemini-3.5-flash vision, cached per image):
  every generated photo is judged before it reaches a slide, one retry with a new scene that answers the refusal, a
  second refusal leaves the slot empty; `/api/ai/image-screen` + `services/imageScreen.ts` screen the attachment's
  pictures while the deck generates and a refused picture is never placed. The scene writer now favors the place,
  product or activity over desk scenes, varies the shot, bans the stock props, and remembers each deck's scenes
  (`_DECK_SCENES`) so the next slide picks a different setting and shot. `_ILLUS_PROMPT_VERSION = "p4-varied-scenes-critic"`.
  Live check of the critic on the owner's attachment: 6 of 6 pictures refused (ai-art / collage), with reasons.
- Also: glued single-quoted spans (`two:'we need ...'and'we`) get their spaces back and become typographic pairs; a quote
  attributed to "Internal Meeting Record / Program Discussion Note" takes the named source the quote cites; the critic
  reads the claim gate's `16802` hash correctly (round 12).

Round 14 (2026-10-26, run 36 = the owner's request re-run on the round-13 build). Confirmed: attachment intent
alsoResearch=true, request plan onlyProvided=false, research slides 3-16 cite external sources and none cites the pptx, all
8 attached slides carried after the section divider with every figure, 6 of 6 attached AI collages refused, no stock props.
Defects measured on that deck and fixed:
- Non-sources on slides: "(focused research)", "(engagement research synthesis)" (the chat prose scrub's relabel ran inside
  the fences) and the citation registry's "Synthesis of A, B, C +10 more". The composer strips provider labels from body
  text and footers and expands a synthesis into the publications it names.
- Research inside the attached section ("Market pattern: ..." sentences, a MARKET PATTERN card, "market pattern: aws ml
  blog" footers): attached slides in a research deck are marked `_attachedSection` and `stripResearchFromAttached` keeps
  only the attachment's content (a reformat's own text is never touched); the contract names the ban.
- A header picture covered "PROJECTED IMPACT" and a figure line on role-recommendation, and the layout gate passed it:
  `sceneBoxFree` keeps the header scene off any archetype whose regions occupy the scene box (role-recommendation,
  block-quote); the gate now measures pictures over rendered text lines (proxy + in-page) and repairs by removing the
  optional picture (`dropImages`), since a smaller font cannot move a picture.
- 8 px node diagrams in 560 px brief-card panels: a scene-writer diagram only in a panel at least 800 px wide (proxy and
  client), narrower panels take a screened photograph.
- The divider stack drew a serif fallback (an <img> SVG cannot load web fonts), cut "Accountable senior judgm." and left a
  plate unnamed: labels wrap whole words in a sans fallback chain, one plate per label.
- Four whiteboard scenes in one deck: scene writing for one deck is serialized (`_DECK_SCENE_LOCKS`) so every scene sees the
  ones before it; images still generate in parallel.
- A row of four thumbnails with one blank slot: picture rows are every card or none (composer).
- No slide said "Work" and six of 24 slides carried a visual although the user asked for a workflow visualization on each:
  the request plan now returns `attachmentSection` and `perSlide`; the section name rides the divider kicker; a per-slide
  visual ask raises the deck gate's visual floor to its 70% ceiling and requires a drawn flowchart.
Known and left: naked numbers in stat tiles and body text (Quantitative Claim Rule not enforced on stat tiles), unverified
quotes shipped with a ledger flag rather than removed.

Round 15 (2026-10-26, run 37 on the round-14 build). Confirmed: no provider labels or "market pattern" on any slide, no
picture over text, no half-filled picture rows, attached slides carry only the attachment, 6 of 6 attached collages refused.
Found and fixed:
- The deck was generated under tech-audit-inspector: `#slides` is a view modifier, so a request whose only deliverable
  hashtag was #slides named no directive and the keyword scorer turned "tools" into "systems inventory". A view token
  now makes its own skill (deck-composer) the directive when no other deliverable hashtag is present.
- No "WORK" divider: the plan model left `attachmentSection` empty; `attachmentSectionFrom` reads it from the user's words
  ('add a "Work" section that includes ... the attached slides'), and the plan log now prints section and perSlide.
- Footers still carried descriptions, "Sources include focused research synthesis ...", quote fragments and a sentence
  glued after a filename: DESCRIPTIVE_SOURCE drops them; text after a file extension is cut.
- An OUTCOME band's third line ran below the band: every band statement now has a two-line budget.
- Exhibit cards at 11-13 px with mostly empty cards: the stat-row family's labels, quotes and sources were raised to a
  legible floor and grow until the fullest card is ~85% full; quotes carry typographic marks; "Reddit Deep:" reads
  "Reddit"; process-flow, bar and legend text raised too. `_DIAGRAM_STYLE_VERSION = "v28-legible-floor-stat-fill"`.
- The critic spelled "AI" out once: rubric 7d keeps acronyms as the deck uses them.

Round 16 (2026-10-27, run 38 on the round-15 build). Confirmed: deck header DECK-COMPOSER (skill routing fixed), the plan
read section=Work and the four per-slide asks, no provider labels or quote fragments in footers, no band overflow,
exhibit text at 18 px or more, no picture over text, no half-filled rows. Found and fixed:
- Still no WORK label: the model put "Work" into the divider title, the kicker was therefore skipped, and the copy edit then
  rewrote the word out of the title. The name now rides `_sectionKicker` (an internal field no text pass touches) and the
  composer renders it as the divider kicker, dropping a "Work:" title prefix so the name is said once.
- Seven generated stand-in photos on the attached slides (a storeroom behind the revenue bridge): attached slides take only
  the attachment's own screened pictures; their native exhibits are still drawn.
- Six of fifteen photos were a person pointing at a screen or wall: that pose is banned in the scene writer and negatives.
- Footers: a lowercase descriptive parenthetical and a bare "Blog" entry are dropped; an unclosed opening quote is closed.
Left: research slides still show bare numbers in stat tiles; drawn visuals on 4 of 13 research body slides (the gate's
"visual" counts tiles and tables, the user's per-slide visualization ask wants drawn workflows).

Round 17 (2026-10-27, run 39, delivered as Downloads/HiC-NXT-positioning-with-Work-section-2026-10-27.pptx). Confirmed:
DECK-COMPOSER, section=Work, all 8 attached items after the divider with no research and no generated photos on them,
no pointing poses, 6 of 6 collages refused. Found and fixed:
- WORK kicker still missing: the agenda (it lists the Work items) was marked as an attached slide, so the "first attached
  slide" was slide 2 with no divider before it. Cover, agenda and thesis are never attached; the section divider is found
  from the LONGEST run of attached slides.
- The copy edit read 347 fields and rewrote 0 with no error: a reply cut off before its closing brace was treated as "no
  edits". The deck is read in batches of 8 slides (two at a time); a reply without a complete JSON object counts as a
  failed batch and the chat line says so.
- Footers: a short descriptive sentence ("Working pilots face shorter delivery expectations"), a quote with "gemini" glued
  on, a lowercase description; a footer that names no source is removed; a quote followed by its parenthetical source
  names that source.
- The five-card exhibit overflowed its cards and printed raw uppercase filenames: the stat-row fit now shrinks to 0.7x as
  well as growing, source names are cleaned like footers and wrap; the comparison family shrinks too.
- Flowchart group bands and legend at 11-12 px on the slide: 30 / 28 units. `_DIAGRAM_STYLE_VERSION = "v29-..."`.
- A 290 px empty band where a row's pictures were not drawn: an empty picture slot (>= 200 px wide) closes and the cells
  below move up.

Round 18 (2026-10-27, run 40, delivered as Downloads/HiC-NXT-positioning-with-Work-section-2026-10-27-v2.pptx, 23 slides,
native text). Confirmed on the live deck: DECK-COMPOSER; WORK kicker on the divider that opens the attached section; all
eight attached items in the Work section with no research and no generated photos; copy edit 66 of 311 fields rewritten
(no failed batch); 0 clipped, overflowing or off-canvas elements; no empty picture bands; no picture over text; footers
free of provider labels, descriptions and quote fragments; documentary photos only; 6 of 6 attached collages refused.
Last fixes (client only, bundle index-CT3nVyEB.js): provider labels stripped from exhibit text before drawing; attached
slides carry the document's clean name (`documentNameOf`: no extension, underscores or copy suffix) and the composer
writes it in their footers; a curly quote glued to a word gets its space.
Open: bare numbers on research stat tiles (Quantitative Claim Rule); ledger false positives on table cells and card
numerals; the research corpus's web-search provenance ("Zoomsphere; Finalroundai; Bluelinesearch") is weak; drawn
visuals vs the user's per-slide "workflow visualization" ask (drawn on most, not every, body slide).

Round 19 (2026-10-27, Stop-hook audit of the round-18 report). Closed without asking (both are standing rules):
- QUANTITATIVE CLAIM RULE on slides. The copy edit now reads stat figures and its rubric (rule 9) turns a figure no quote
  carries into a qualitative label and strips bare numbers from research prose; the fact guard lets a research slide drop
  a NAKED number only (a quoted number, and every number on the client's attached slides, must survive). Composer
  backstop: a research stat row whose figure no quotation on the slide carries shows no figures, and the figure slot
  closes so the caption leads. Attached slides keep their figures.
- Per-slide visualization ask: the deck gate's DRAWN floor (exhibit, flow-arc, timeline, bars, quadrant; tables and stat
  tiles do not count) requires 60% of RESEARCH body slides to carry a drawing when the plan's perSlide names a
  visualization; the attached slides are excluded (`isAttachedFence` = sourceSlideFor).
Left as a corpus issue, not a slide issue: the focused-research web hits ("Zoomsphere; Finalroundai; Bluelinesearch") are
named sources of low authority; the verification ledger already marks them "not independently verifiable".

Round 20 (2026-10-27, run 41, delivered as Downloads/...-v3.pptx). Confirmed on a live deck: research stat tiles read
THIN / WIDE / HIGHER (no naked figures), the client's own figures intact in the Work section, 6 of 10 research body slides
drawn (floor 60% met), Work footers read "NXT Humans Client Portfolio 2027 Continuity". Fixed after it: exhibit source
lines run through one cleaner (`_clean_source`: provider labels, model names, connector prefixes, file debris and a file's
copy suffix never reach a drawing); a trailing descriptive sentence after a footer source is cut; an attached slide with no
footer names its document; the quote attribution drops "Reddit Deep:" on every render; viz label plates are opaque (a
connector never shows through a label) and the hub keeps its own glyph (no stacked icon); a flowchart legend lists only
groups whose colour reaches a node. `_DIAGRAM_STYLE_VERSION = "v30-clean-sources-legend"`.

Round 21 (2026-10-27, run 42, delivered as Downloads/...-v4.pptx). Confirmed: no naked figure on any research slide, drawn
visuals on 6 of 9 research slides, the Work section complete with clean footers, no provider labels in drawings, no
connector through a label. Fixed after it:
- A two-word qualitative figure ("FEWER INCIDENTS") wrapped at 120 px into its caption (the gate's one open item): stat
  figure cells take a width and a one-line height budget (they step down rather than wrap).
- Footers "Sources: , citing PwC and SpeedMVPs" / ", citing company reports": a "citing X and Y" entry names X and Y;
  corporate-report vocabulary counts as generic; leading punctuation is stripped.
- Research bars implied magnitudes the slide no longer states: on research slides bar length shows RANK (evenly stepped);
  the client's own slides keep proportional bars over their stated values.
- Generated photos carried fake whiteboard / glass-wall lettering and two near-duplicate blueprint dividers: the image
  critic rejects any visible lettering; the scene writer keeps writing surfaces out of frame, blueprints only for
  buildings, and treats a shared prop as the same scene. `_ILLUS_PROMPT_VERSION = "p5-no-lettering"`.
- "Agents build on isolated branches" got the ID-badge icon: "agents" left the role map (AI agents in software decks).
- An exhibit drew icons on two of four process cards: the proxy process-flow family is every card or none.
  `_DIAGRAM_STYLE_VERSION = "v31-pflow-icons-all-or-none"`.
- "FEW" over "of companies have redesigned ..." read as a fragment: the critic rewrites the caption beside a figure it
  turns into a label.

Round 22 (2026-10-27, run 43, delivered as Downloads/...-v5.pptx). Confirmed: the Work section complete (8 of 8 attached
slides, WORK kicker, document footers, client figures intact), the attachment's six AI collages refused, the copy edit
ran (95 of 308 fields rewritten), research slides free of naked figures, one-line stat labels, rank-stepped research bars.
Defects found on it and fixed:
- Drawn visuals on 7 of 11 research slides although the request asked for one on EACH slide: the drawn floor for a
  per-slide visualization ask is now every research body slide; when the deck-wide repair leaves plain research slides,
  ONE focused pass redraws only those slides (`plainResearchFences`, `buildRedrawInstruction`, `spliceRedrawnFences`),
  accepted only when the drawn share rises without new violations. infographic-exhibit may appear up to 5 times on such a
  deck (different exhibit shapes); the deck-composer skill states the rule.
- Zero icons across 25 slides: the concept matcher missed business verbs and plurals ("Diagnose", "Outcome pricing",
  "branches"), and one unmatched card blanked its row. `candidateBaseIds` (business acts + stemmed tags, earliest mention
  first) and a row assignment that gives each card a DISTINCT glyph (title first, then its own text); numbered-themes
  gained an icon cell on the numeral row (`itemIcons`). Brands with template art (DECIEM) take no glyph row.
- PPTX footers differed from the preview (slug names "Reddit Deep R Agency", three footers dropped): the citation
  registry is empty in a restored session, so the labels each slide's pointers resolve to at generation are frozen on the
  slide (`_citeLabels`, `freezeCitationLabels`) and read before the live registry on every render.
- The preview exhibit showed "$75k to $250k" that the copy edit had removed (the export, drawn later, was clean): the deck
  counts as settled only after the state-to-ref effect has run.
- The plain EXPORT button failed four times on an 18 MB deck ("Failed to fetch" from Response.blob() with a full system
  drive): the download reads the body with arrayBuffer and wraps it.
- "Signed SOWs secure 2027 continuity" over a source that calls one SOW a draft: the attached-section contract makes
  status words facts, and the copy guard refuses a rewrite that drops every hedge or adds a firm status.
- Quote lines with no marks or source, one a lowercase fragment: numbered-themes quotes take curly marks, a leading
  ellipsis on a fragment and `quoteSource` (added to the skill schema).
- A comparison cell's fourth line printed across the row divider and measured clean: cell fit height 98 (the divider is
  104 px below the row) and the layout gate counts a rule through a text line as an overlap (TS and proxy measure).
- Lowercase feed names ("nvidia ai blog", "databricks ai") print title-cased with known acronyms (`caseSourceLine`).
- One MEANS caption without the period its siblings carry (`harmonizeSiblingPeriods`).
- A photo with a body merging into an armchair passed the critic: the critic rejects fused bodies, impossible poses and
  surface specks; the scene writer keeps notebooks, pages and screens out of frame. `_ILLUS_PROMPT_VERSION = "p6-no-pages"`.
Deployed index-D_sXvf4_.js; 2,171 tests pass, typecheck clean.

Round 23 (2026-10-27, run 44, delivered as Downloads/...-v6.pptx; v6b-brand-chrome is the same deck re-exported after the
exporter fix). Confirmed: preview and PPTX footers identical on all 23 slides (frozen labels), the plain EXPORT button
works, status words kept on the Work slides, distinct icons on every flow-arc row, 8 of 8 attached slides carried.
Defects found on it and fixed:
- EVERY exported PPTX hid the brand chrome: the composer paints its canvas on a full-stage wrapper div inside #stage, the
  GEO walker treated only #stage itself as canvas, so the wrapper became an opaque slide-level rectangle over the layout's
  rail, wordmark and dot-mark. A full-stage direct child of #stage is now canvas (gold_pptx_export.py).
- Divider numerals 01-04 were missing from every PPTX: a 360 px numeral at line-height 1 has a glyph box that starts
  above the slide, and the run was dropped as off-slide. Such a run takes its element's top.
- Verification gotcha: PowerPoint Slide.Export skips layout graphics; render with Presentation.SaveCopyAs(dir, 18).
- An infographic-exhibit of two text panels counted as a drawing: `isDrawnFence` requires a flowchart or step flow; the
  redraw instruction draws a contrast as two paths, never two panels; the gate logs what the repair leaves open.
- Slide 5 footer "Sources: , Workforce Restructuring Findings": provider-label removal left the comma, and a lowercase
  topic phrase passed as a source; both cleaned in canonSourceName / DESCRIPTIVE_SOURCE.
- Work account slides on role-recommendation: hard-coded "SUPPORTING ACTIONS / PROJECTED IMPACT" headers over client
  facts, no footer, bodies overflowing their cards. Labels ride the payload (blank on the client's own slides), the
  archetype gained a footer and fitted bodies.
- Doubled stops ("agents.”."): the sibling-period rule did not count a straight closing quote as an ending.
- Card icons named the actor ("Clients" -> customer, "Agency" -> org chart): role glyphs rank after acts and objects;
  tags under four letters only count as known acronyms. Proxy step-flow icons need a whole-word tag match
  (`_DIAGRAM_STYLE_VERSION = "v32-pflow-icons-whole-word"`).
- The deck coverage receipt ("carries 4 of 33", a "not carried" list of themes the deck argues in paraphrase) moved to the
  console: word-overlap binding misreports a deck.
- Per-slide "conceptual description for a workflow visualization" now goes to the PPTX speaker notes (speakerNotes on
  every slides:* payload); bands and subtitles of sentence length close with a period; comparison row divider at 122 px
  with 116 px cells; the paper agenda sits on two ecru panels.
Deployed index-C0bzBH3i.js; 2,176 tests pass, typecheck clean.

Round 24 (2026-10-27, run 45, delivered as Downloads/...-v7.pptx; v7b is the same deck recomposed and re-exported on the
round-24 code). Confirmed on the live deck: EVERY research body slide drawn (10 of 10, none a text-panel exhibit), the
PowerPoint render (SaveCopyAs) shows rail, wordmark, dot-mark, divider numerals and dark canvases on every slide, footers
identical preview vs PPTX, the Work section complete with document footers and status words intact, no recommendation
headers over client facts. Fixed after it:
- Divider title cap tops covered the WORK kicker in PowerPoint: any run whose range starts above its element is placed at
  the element top (generalizes the round-23 numeral fix).
- "agency.”.": the sentence-period rule now ignores a trailing parenthetical (a source label the tidy strips later), and
  the typography chain drops a stop that follows a quote ending its own sentence.
- Bar notes cut mid-phrase: a fitted cut that does not end a sentence steps the type down (to about four fifths) before
  any cut; the ranked-bars note box holds three caption lines.
- Layout gate flagged display numerals over their own hairline as "rule through text" and stepped type down: numerals are
  exempt (TS and proxy).
- Added glyphs on the client's own Work slides ("Scope of work" with a cursor and a coin): attached slides take none.
- Cards may carry a model-chosen `icon` from a 70-id vocabulary (deck-composer skill); compose-time matching ignores the
  house brand name and treats "senior" as the actor, so "set rules" draws governance and "prices" draws cost.
Open (owner's call or corpus-level): web sources named by squashed domains ("Finalroundai"); timeline week ranges as
scaffolding; slide 23 recasts the source's presentation guidance as statements; rank-stepped research bars carry no values.
Deployed index-DD0kz8Pt.js; 2,178 tests pass, typecheck clean, SPA smoke clean.
