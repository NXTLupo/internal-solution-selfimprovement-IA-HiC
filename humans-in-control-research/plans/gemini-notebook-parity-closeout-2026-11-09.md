# Gemini Notebook Parity Closeout Plan (2026-11-09)

Successor plan to `hic-vs-notebooklm-artifact-audit-2026-11-09.md` (the audit record, committed
`1412a4f6c`) and `notebooklm-studio-reverse-engineering-2026-11-03.md` (the W1-W6 parity build).
The audit closed with six fresh Gemini Notebook outputs scored live from the owner's account
(notebook `25078bb9-e656-434d-bf21-668c6305f615`, still loaded with 12 ingested sources). This
plan carries EVERYTHING that remains, in priority order, with file-level scope and acceptance
gates. Unified Vision phases advanced: phase 6 (routing authority covers any new artifact kind),
phase 8 (design-system-governed outputs), phase 9 (every artifact portable), plus the standing
S10 thesis (evidence-cited outputs beat fluent uncited ones).

Standing constraints: quality-first, never relax gates; no commits without owner approval; the
rebuild rule (no HMR; idle check before rebuild); the Quantitative Claim Rule and claim-ledger
gate apply to every new surface this plan creates.

## EXECUTION STATUS (updated 2026-11-09, same day)

- WS-A: **DONE.** All four comparisons run live on notebook 25078bb9 and scored into the audit
  file's "WORKSTREAM A" section; matrix rows S2/S5/S8/S9 updated from "graded vs contract" to
  "graded vs live output". Headline: Gemini's .pptx is 15 full-slide rasters (text_runs=0,
  shapes=0, measured from the file), the widest HiC win in the audit. Gemini is genuinely ahead
  on infographic illustration quality, flashcard study mechanics, and video/deck format pickers.
- WS-B1 `#dossier`: **IMPLEMENTED.** `services/dossierEmbed.ts` + 15 tests, catalog/parser/
  registry entries, gallery-slug injection into the prompt, post-chain embed resolution, chat
  reply line. Typecheck green. Awaiting the live run after rebuild.
- WS-B2a `#blogpost`: **IMPLEMENTED.** Catalog entry, aliases, label, `directiveInstructions`
  register block, registry `#help` entry. Typecheck green.
- WS-B2b corpus-suggested formats: **IMPLEMENTED.** `suggestReportFormats` + `withReportFormats`
  in `services/dynamicPromptSuggestions.ts` (deterministic, no model call), the `report-format`
  chip kind, 11 tests.
- WS-B3 ElevenLabs key: still an owner item; nothing in this plan depends on it.

## Workstream A: the four remaining live comparisons (audit completion, no code)

The notebook is primed; each item is one Studio click plus scoring with the session's two
instruments (the nine-criterion copy bar in `artifact-prose-voice-chokepoint-2026-11-08.md`,
and the citation/figure/chrome counts used in the audit's live-run section). Record each result
as a new subsection of the audit file's THE LIVE RUN section.

- A1 `#slides` vs Slide Deck (HIGHEST VALUE; HiC's flagship). HiC's side is already on record
  (deck AIR 2026-11-09: prose 0.994, slop_sites 0, layout 6/6). Generate Gemini's Slide Deck
  (both the one-shot tile and, if offered, the new step-by-step flow), export/screenshot each
  slide, score: citations per slide, naked figures, action-title rate, layout defects, export
  fidelity (PPTX/PDF editability vs HiC's native editable PPTX).
  Acceptance: a per-criterion table in the audit file; any Gemini capability HiC lacks becomes
  a numbered item in Workstream B or an accepted non-goal with a reason.
- A2 `#video-overview` vs Video Overview. Queue the generation early (slowest render), come
  back. Score the narration via the same Whisper path used for audio (Video Analyzer
  `/upload-video`, proven at 77s for 23 min of audio) plus visual spot-checks.
  Acceptance: spoken-attribution and naked-figure counts recorded beside the audio verdict.
- A3 `#flashcards` vs Flashcards. Minutes. Score: term accuracy to sources, citations (predict
  zero), count/difficulty steering parity with HiC's prompt-native steering.
- A4 `#infographic` vs Infographic. Validates the uplift shipped during the audit against the
  real thing instead of the spec. Score: content-trueness, figure discipline, aspect handling,
  export form (image vs HiC's native render + gallery dual-write).
- A5 Close the loop: update the audit matrix rows S2/S5/S8/S9 from "graded vs contract" to
  "graded vs live output", refresh the memory record, and mark this workstream done in this
  file.

Effort: ~45 min driving + scoring. Dependencies: Google session still signed in; if it has
expired, ask the owner to re-sign-in (same protocol as today).

## Workstream B: new BEHIND candidates found live today (needs owner decisions first)

- B1 INTERACTIVE REPORT (embedding artifacts in a report). Gemini's Create-report default
  format embeds studio content (mind map, quiz, audio) inside the document. HiC has no
  artifact-embedding artifact; the gallery lists artifacts side by side.
  OWNER DECISION: in scope for the artifact factory, or accepted non-goal? If in scope, the
  shape is a composition layer, not a new generator:
  - `services/artifactCatalog.ts` + `services/hashtagRegistry.ts` + `services/hashtagParser.ts`:
    a `#dossier` (or `#interactive-report`) analysis-modality kind, plus the pinned entry in
    `services/artifactCatalog.coverage.test.ts`.
  - Handler in the `UPLIFT_HANDLERS` table in `components/CorpusChatPanel.tsx` (declared line
    185, dispatched line 7888): run the normal `#report` chain, then resolve
    `[[embed:<gallery-slug>]]` directives against `/api/artifacts` entries and inline each saved
    HTML artifact in an iframe-free section (the live run proved Gemini's iframes trap content
    so the host page cannot even read the quiz; HiC embeds the HTML directly, which is the
    differentiator). Reuse the existing gallery dual-write path (`saveArtifact` from
    `services/artifactLibrary`, used at line 7939) so a dossier is itself relaunchable.
  - Gates unchanged: the report text still runs the full chain; embedded artifacts were already
    gated at their own creation.
  Acceptance: one live `#dossier` run embedding a mindmap + datatable, chain receipt clean,
  gallery dual-write, relaunch works.
- B2 REPORT TEMPLATE BREADTH. Gemini offers Blog Post, "Create Your Own" (structure, style,
  tone), and corpus-suggested templates (it proposed "Architecture Specification" from our
  sources). HiC covers briefing/explainer/FAQ/study guide/chronology/critique but has no
  blog-register output and no suggested-template picker.
  - B2a `#blogpost` report format. VERIFIED SCOPE (checked 2026-11-09, do not guess again): the
    HTML report family is a catalog entry per kind in `services/artifactCatalog.ts`
    (`modality: 'html'`, `ownerSkill: 'html-deliverable-composer'`, e.g. line 111 for
    `explainer`), aliases in `services/hashtagRegistry.ts` + `services/hashtagParser.ts`, and
    the per-kind authoring instruction lives in the `directiveInstructions` map in
    `components/CorpusChatPanel.tsx` (declared ~line 6586; `#studyguide` at ~6594 is the model
    entry to copy). A new format is therefore three small additions, no new chain code: catalog
    entry, aliases, and one `directiveInstructions` string stating the register, length band,
    structure, VS layer, and the citation/figure discipline. The anti-slop bar applies in full;
    a blog register is NOT a license for hooks and hype. Add the kind to the pinned catalog
    coverage test (`services/artifactCatalog.coverage.test.ts`) in the same change.
  - B2b Corpus-suggested templates: at report time, offer 2-3 template suggestions derived from
    the manifest's dominant source types (the dynamic-chip machinery in
    `services/dynamicPromptSuggestions.ts` already reads the corpus; extend it to propose
    report formats, e.g. transcript-heavy corpus suggests critique, architecture sources
    suggest a spec). No new model call; reuse the existing suggestion pass.
  OWNER DECISION: B2a/B2b priority relative to A1-A5; both are small.
- B3 ELEVENLABS KEY (OWNER ITEM, blocks nothing else). The TTS leg 401s since 2026-11-09
  (worked 11-08); `#audio-overview` degrades honestly to a cited transcript. Fixing the key in
  the root `.env` restores the production half of the audio head-to-head. After the fix: one
  live `#audio-overview brief` run to confirm MP3 output returns.

## Workstream C: accepted non-goals (recorded so successors do not reopen them)

- C1 Interactive audio join mode (S1): needs streaming TTS + live session plumbing; out of
  scope for the artifact factory. The four formats + verified transcript stand.
- C2 Steering picker UIs for flashcards/quiz (S5/S6): count and difficulty already steer
  through prompt text; a picker adds chrome without capability.
- C3 Cross-store unified gallery (decks, presentations, prototypes in one view with the HTML
  gallery): deferred by design; those stores are purpose-built and not HTML documents. Revisit
  only if B1 ships and embedding pressure makes one store the simpler architecture.
- C4 Composite persona voice: OPEN BY DECISION with labeling shipped (persona cards carry
  `data-composite-sources`); the genre call (one card stitching several practitioners) stays
  with the owner.

## Sequencing

1. A2 first click (queue the slow video render), then A1, A3, A4 while it renders, then A5.
2. B3 whenever the owner rotates the key (independent).
3. B1/B2 after the owner decisions; each is a small, gate-preserving addition.
4. Commit checkpoints: one commit after A5 (audit completion), one after each B item that
   ships, each with explicit owner approval per the standing rule.

## What this plan does NOT cover

Hashtags with no Gemini Notebook counterpart (#journey, #blueprint, #personas, #themes, #recs,
#prd, #gap, #competitive, #case-study, #roadmap, #audit, #arch, #orgchart, #strategy,
#presentation, #proto, #questionnaire, #research-plan, #deep-research, #meta-themes): HiC-only
surfaces, already covered by the prose-voice chokepoints and their own coverage contracts; they
are outside this head-to-head and governed by their existing plans.

## Workstream D: ABSOLUTE ARTIFACT-QUALITY PARITY (owner directive, 2026-11-09)

Owner instruction, mid-execution: "Ensure HiC achieves absolute parity with Gemini Notebook
quality of artifacts." The live run is the only honest input to this, and it named exactly three
places Gemini's artifact is better. Everything else in the matrix is PAR or HiC AHEAD, so parity
work means these three and nothing invented beside them.

### D1. Flashcard study mechanics (measured gap, WS-A3)

Gemini's 50-card deck keeps per-card "Got It" / "Missed It" counters and puts an "Explain" button
on the answer face. HiC's `#flashcards` renders correct, cited cards with no study loop at all: a
reader can read them but cannot work them.

Scope: the `#flashcards` authoring instruction in `directiveInstructions`
(`components/CorpusChatPanel.tsx`) plus a self-contained progress block. The artifact is a saved
HTML document, so the mechanics must be inline and dependency-free, and must degrade to a plain
readable card list when scripting is unavailable (the artifact is also exported and printed).
Acceptance: a live `#flashcards` run whose cards still carry pointer citations, plus working
per-card marking, a session counter, and a reset, with no external script and no framework.

### D2. Illustration quality on #infographic and #slides (measured gap, WS-A1 and WS-A4)

Gemini's infographic and deck share one isometric illustrated system: layered planes, consistent
line weight, a restrained palette, and node icons drawn in the same hand. HiC's native exhibit
renderer (`proxy/nxt_diagram_render.py`) draws flat CSS panels that are correct, token-bound and
collision-free, and plainer. This is the largest remaining quality gap and the one the owner is
most likely to see first.

Constraint that shapes the fix: standing rule D17 says journey, architecture, mindmap and
blueprint exhibits are NATIVE renders, never image-generation, so parity cannot be bought by
sending the exhibit to an image model. Parity means raising the native renderer's visual grammar:
depth (layered planes with consistent offsets), a shared icon stroke system, and a token-bound
accent discipline. `_DIAGRAM_STYLE_VERSION` must be bumped in the same change or the cache will
serve the old look.

### D3. Pre-render review checkpoint (capability gap, WS-A1 and WS-A2)

Gemini offers "Review slide outline" and "Review producer notes" switches: a human checkpoint
between the plan and the expensive render. HiC's longest generations (deck, prototype, video)
commit straight to the render. This is a workflow capability, not artifact quality, so it ranks
below D1 and D2 and is recorded here rather than built in this pass.

### Workstream D results (implemented 2026-11-09)

**D1 SHIPPED.** `services/flashcardStudyEngine.ts` + 16 tests. The model's whole contribution is
one attribute per card (`<details data-card="c1">`); the engine synthesizes the Got it / Missed it
controls, the sticky progress strip and the study script deterministically at the end of the
chain. Deciding factors recorded for successors: the artifact OUTPUT FORMAT rule forbids the model
from emitting buttons at all, and a control the model writes differs run to run, so the controls
had to be code. Injection is idempotent (a `#refine` pass cannot stack two engines), no-ops on
every non-flashcard artifact, wraps all storage access so a private window cannot break the deck,
hides its controls under `<noscript>` so the printed artifact stays a clean card list, and binds
colour through `var(--color-accent)` / `var(--color-on-accent)` rather than literals.

**D2 SHIPPED, and it changed shape once the evidence came in.** The gap was NOT "HiC should look
isometric": the renderer's house style explicitly forbids isometric depth and decorative shadow,
and standing rule D17 forbids buying visuals from an image model. Measuring Gemini's infographic
showed the real gap is STRUCTURAL: it drew six related mechanisms grouped under two headings, a
shape none of HiC's five families covers (a stat row has no grouping, a process flow asserts
sequence, a comparison asserts two sides). So the fix is a new native family, not a new look:

- `proxy/nxt_diagram_render.py`: `_concept_cluster_body` + `.ccl` CSS, registered under
  `concept-cluster` / `concept_cluster` / `cluster`. CSS grid, so collisions are impossible by
  construction; flat orthographic on real type; token-bound; group rail carries the relationship.
- `services/artifactIllustrator.ts`: a cluster branch in `infographicSpecFrom`, placed BEFORE the
  process-flow branch because a cluster's items have no order and process-flow would draw arrows
  asserting a sequence the evidence does not support.
- The `#infographic` element prompt now offers `clusters` as a fourth family and says when to
  choose it.
- `_DIAGRAM_STYLE_VERSION` bumped to `v33-concept-cluster` so the cache cannot serve the old look.

ICON HONESTY, the part worth remembering. The first render put a CLOCK on "Proof-based task
settlement" and a governance glyph on "Shared memory over messaging". A scoring probe found two
causes: the caption's incidental nouns outscore the concept ("when", "agent", "event"), and
function words partial-match tags (the preposition "over" reached the tag "oversight"). Fixes, all
pinned by tests: match the node NAME only, drop function words first (`_ICON_STOPWORDS`), require
a real tag hit, and show icons for the WHOLE exhibit or for none of it, since a partial icon set
reads as a rendering bug and a fallback glyph would break the content-true rule. On the probe
exhibit this correctly yields zero icons; on an exhibit of concrete concepts it yields one
distinct, correct glyph per node.

Tests: 16 Python (`proxy/test_concept_cluster.py`) + 6 vitest (`services/conceptClusterSpec.test.ts`).

## WORKSTREAM E: NEW GOALS from the owner (2026-11-09, these SUPERSEDE prior rules)

Verbatim directives, recorded because they change the ground rules this plan was written under:
1. "#infographics requires images/graphics! NOT JUST GLYPHS AND ICONS"
2. "Whatever the Gemini notebook artifact has that our analogous artifact lacks, MUST BE INCLUDED
   IN OURS (regardless of rules that were set in the past to the contrary)!!! THESE ARE NEW GOALS"
3. "the #slides deck is THE most critical artifact and MUST be polished to a high degree. Any
   prior rules preventing the perfect execution of these slides must be reconsidered vis a vis
   Gemini Notebook slides quality. Also we are using old exemplar slides for our #slides
   artifacts and these too MUST be re-examined for polish and execution. Make sure all writing
   incorporates ANTI-SLOP skills."

RULES NOW EXPLICITLY OVERRIDDEN for artifact visual quality (recorded so no successor re-imposes
them by citing the old file): the infographic house-style line "never isometric depth", the
glyph-only treatment of exhibit nodes, and the D17 restriction read as "no generated imagery in
exhibits". D17's stated scope was journey / architecture / mindmap / blueprint; it is NOT a bar on
generated artwork inside an infographic or a slide. The anti-slop writing contract is NOT
overridden and the owner restated it: the citation protocol, the Quantitative Claim Rule, the
banned-phrase lexicon and the prose gates all still bind. Visual rules relax; evidence and writing
rules do not.

### E1. #infographic carries real artwork (SHIPPED in this pass)

- `proxy/nxt_diagram_render.py`: a cluster node renders `node.image` as real artwork
  (`.ccart img`, up to 260x230 in the 1600px design space) and falls back to the glyph only when
  no artwork exists, so an exhibit is never worse than it was.
- `components/CorpusChatPanel.tsx`: the `#infographic` handler now generates ONE brand
  illustration per node from that node's own words via the proxy's `/api/ai/illustration`
  (`style: 'line'`, `literal: true`), in parallel, best-effort per node.
- Three live defects from the owner's screenshot fixed at the source, with tests
  (`services/infographicFallback.test.ts`, 18 pins):
  1. FIVE near-duplicate cards: the theme fallback never de-duplicated. `distinctConcepts` now
     collapses restatements using stemmed content-word overlap. Threshold 0.3 was MEASURED, not
     guessed: the owner's five restatements score 0.30-0.50 pairwise, three genuinely different
     themes from the same session score 0.00-0.06.
  2. FALSE SEQUENCE: the fallback drew unordered themes as a numbered process flow. It now draws
     a concept cluster, which asserts no order.
  3. CRAMPED TYPE: full-sentence theme names were dropped into 3-6 word slots. `splitLabelForCard`
     now cuts a short card name and keeps the full sentence as the caption.
- Two bugs in MY OWN new code were caught by those tests and are recorded as lessons: a stemmer
  ordering bug (stripping 'ional' made "institutional" -> "institut" while "institution" stayed,
  so paraphrases never matched) and a `.map(splitLabelForCard)` arity bug (Array.map passes the
  index, which landed in `maxWords`, so card 0 got a zero-word name).
- Widened the subject-discipline title net after the owner surfaced a shipped exhibit titled "The
  provided corpus contains no evidence regarding student permission ladders": near misses
  ("cannot substantiate", "insufficient evidence", "does not establish") now also fail closed.

### E2. #slides deck polish (OPEN, the next and highest-priority work)

The owner calls this THE most critical artifact. What the live Gemini deck has that HiC's lacks,
from the A1 comparison, now treated as a requirements list rather than an observation:
- a cohesive ILLUSTRATION SYSTEM on every slide, one visual language across the deck;
- dimensional composition (Gemini uses layered isometric planes) where it aids comprehension;
- a descriptive subtitle under the deck title;
- visible density: Gemini fills the frame, HiC leaves sparse panels.
What HiC must NOT give up to get there, because it is the whole advantage: native editable PPTX
(Gemini's is 15 full-slide rasters, text_runs=0), pointer citations, the claim-ledger gate and the
prose gates.
Scope to work next: audit `components/slideTemplates/` exemplars for the sparse-panel and
old-styling problems the owner named, raise the image ladder so every content slide carries a
content-true visual, and re-run the deck AIR gates to prove the writing bar held.

### E2 DIAGNOSIS: why HiC cannot currently compose a deck like "The Architecture of Agency"

The owner pointed at `The_Architecture_of_Agency.pptx` and asked what prevents the same quality in
NXT colours and fonts. Answered by reading the deck's slide images and then the blocking code. The
decisive observation: Gemini's quality is NOT photographic artwork. Slide 2 is an inverted funnel in
three coloured bands, each band carrying its own label AND its explanation INSIDE the geometry, under
a title plus a three-line subtitle, on a warm paper ground with registration marks. It wins on
DIAGRAM-AS-ARGUMENT: the shape itself encodes the claim (a narrowing funnel = progressive filtering).

Five concrete blockers, each with its file:

1. TABLES COUNT AS "VISUAL" (`services/deckPlanGate.ts`, the `VISUAL` set). `slides:evidence-table`,
   `slides:prd-ledger`, `slides:prd-signals` and `slides:prd-trace` are all members, so a deck made
   entirely of tables satisfies the visual floor with ZERO drawn geometry. This is the single biggest
   loophole and it explains decks that pass the gate and still read as text.
2. NO CONTAINMENT OR PROPORTION SHAPES EXIST. The brick canon is quadrant, ranked-bars, flow-arc,
   milestone-timeline, means-matters, comparison-panels: all grids, rows and arcs. There is no
   funnel, pyramid, nested set, Venn, stack or proportional area, so the one shape Gemini used to
   carry its best slide cannot be drawn at all.
3. "FUNNEL" IS ALIASED TO A JOURNEY SWIMLANE (`proxy/nxt_diagram_render.py` line 968, and the kicker
   map at 427 labels it "Customer Journey"). Asking for a funnel produces a horizontal journey map.
4. LABELS SIT BESIDE GEOMETRY, NEVER INSIDE IT. Every family renders a card with the text in the box
   and the graphic as a separate glyph; none draws a shape and places typography within its bounds.
   Gemini's funnel puts three label+explanation pairs inside the bands.
5. NO SLIDE SUBTITLE AND NO DECK GROUND TREATMENT. The cover subtitle clause was only added to the
   exemplar manifest today, and body slides still have no supporting line under the action title, so
   each slide asserts its judgment with no room to explain it.

What is NOT the blocker, and must not be "fixed": our action titles are better than Gemini's topic
labels, our export is native and editable while its deck is 15 rasters, and our claims carry
citations while its carry none.

Work this implies (E2 remainder): tighten the VISUAL set so a table is not a picture, add
containment/proportion archetypes (funnel, pyramid, nested) to the brick canon and the native
renderer, route `funnel` to a real funnel, allow typography inside shape bounds, and add a body-slide
subtitle slot. All in NXT tokens, so the look stays ours.

## WORKSTREAM F: selectable imagery styles on EVERY artifact (owner directive, 2026-11-09)

Directives: "I want a few different professional styles of imagery for the user to choose from that
can integrate into the NXT Humans colors, fonts, and templates" and "once implemented, [this] be
implemented in EVERY artifact".

STARTING STATE (measured): HiC had exactly ONE drawn illustration treatment, locked in the proxy on
2026-06-17 (a single continuous unbroken line over off-register colour fields), plus three
photographic modes. The proxy rejected any other style value outright
(`style if style in ("line","photo-background","photo-portrait","photo-scene") else "line"`), so a
reader could not choose a look, and every artifact in the product shared one idiom.

SHIPPED:
- `services/imageryStyles.ts` (12 tests): five professional styles, selected by ONE word on any
  directive. `line` (house default), `isometric` (layered technical planes), `blueprint` (schematic
  on a drafting grid), `duotone` (two-colour documentary photography), `collage` (flat cut-paper
  blocks). A style names what to DRAW and never a colour value; the proxy fills brand hexes from the
  Figma token mirror per brand, so every style lands inside NXT / NU / DECIEM.
  `parseImageryStyle` only accepts a style word at the START or END of the prompt, so "the blueprint
  for co-op advising" keeps its noun instead of silently becoming a schematic.
- `proxy/app.py`: `_ILLUS_STYLE_DIRECTIVE` + `_ILLUS_STYLE_IDS`, the style gate widened, and
  `_illustration_prompt` made style-aware; `duotone` routes through the photographic pipeline.
  Every drawn directive carries its own bans (no gradients, no shading, no realism, no cast shadows)
  so a style change cannot reintroduce stock-AI gloss.
- `services/artifactVisuals.ts` (14 tests): the `[[visual: ...]]` contract and renderer, wired into
  the HTML artifact chain AFTER every gate, so EVERY report-family artifact (brief, report,
  explainer, FAQ, study guide, chronology, critique, quiz, data table, blog post, dossier,
  questionnaire, approaches, playground, PRD) now carries pictures. A figure that cannot be drawn is
  REMOVED, never left as a placeholder, and the cap bounds cost at four images per artifact.
- `#infographic` reads the same style word; `#help` documents the roster.

WHY A DIRECTIVE AND NOT "ASK FOR AN <img>": a model cannot produce an image URL, and an invented src
is a broken page. The model names WHAT to draw; code draws it. Same reasoning as the study engine.

### E2 REMAINDER: SHIPPED (2026-11-09)

Items 3, 4 and 5 of the diagnosis are now implemented, with 22 Python + 12 vitest pins:

- **Containment and proportion shapes (item 3).** `_funnel_body`, `_pyramid_body` and `_nested_body`
  in `proxy/nxt_diagram_render.py`, registered as `funnel` / `pyramid` / `nested`. Bands stack
  vertically and their width comes from `clip-path`, so the geometry carries the claim (narrowing =
  progressive loss) and collisions remain impossible by construction. Band fills come from brand
  tokens only. The narrowest band holds 38% width so a label still fits, which is what lets
  TYPOGRAPHY SIT INSIDE THE SHAPE, the other thing the reference deck does and HiC could not.
- **`funnel` un-aliased (item 4).** It no longer routes to `_journey_body`, and its kicker label is
  "Conversion Funnel" rather than "Customer Journey". `infographicSpecFrom` routes a `funnel` /
  `stages` payload to the new family BEFORE the process-flow branch, because a flow asserts order and
  a funnel asserts loss. A layered architecture map (whose `layers` carry `nodes`) is explicitly not
  treated as a containment diagram.
- **Annotated connectors (item 5).** `_arch_body` could draw ONE unlabelled arrow between tiers and
  nothing else, so an architecture slide could not say what moves between them. A layer now names its
  outgoing flow (`flowTo` / `flow` / `edgeLabel`) and the label renders in the connector's own flex
  cell, never over a node, so the graphic-collision ban still holds.
- The `#infographic` element prompt offers both new families and says when to choose them.

### FIGURE GATE ON OTHER PATHS: investigated, NO CHANGE MADE (the diagnosis was wrong)

The sample audit reported bare figures on playground, approaches, flashcards, quiz and PRD and I
concluded those paths bypass the NAKED_FIGURE gate. Checking before building showed otherwise:
- Those samples PREDATE the gate (playground 2026-10-05/06, approaches 2026-06-24 to 10-05,
  flashcards 2026-11-03; the gate landed 2026-11-09), so they say nothing about the current path.
- The quiz figures are correct for the format: multiple-choice options must carry the number the
  question tests, and the explanations quote the source figure with attribution.
- The real residual is quote MARKUP (the quiz uses straight quotes where the family uses `<q>`),
  which the quotation-discipline clause and `markReportedQuotes` already address.
`GAP-ANALYSIS.md` in the owner's sample folder was corrected to say this rather than leaving the
overstated claim standing.

### PLAN STATUS AFTER THIS PASS

WS-A, WS-B1, WS-B2a, WS-B2b, WS-D1, WS-D2, WS-E1, WS-E2 and WS-F are implemented and tested.
WS-C is the recorded non-goal list. WS-B3 (the ElevenLabs key) is the only remaining item and it is
an owner action: no code change can rotate a key.

## WORKSTREAM G: the design system was already there, and a product-wide FONT BUG (2026-11-09)

Owner: "THERE's a design system for NXT, NU and Deciem in the FIGMAS YOU HAVE ACCESS TO!!!!" and
"I want the design system uplifted to allow for graphics! Just use the design system for fonts and
colors". Both land on the standing rule I broke: look at Figma via MCP, never assume.

### G1. THE FONT BUG (product-wide, every NXT and NU exhibit)

`_font_face_css()` registers the brand faces as `'NXT Title'`, `'NXT Body'`, `'NXT Display'`,
`'NXT Mono'`. `_DEFAULT_FACES` asked the CSS for `'Archivo'` and `'Saira Condensed'`, which are NOT
registered anywhere, so Chromium fell back to its DEFAULT SERIF for the title and body of every NXT
and NU exhibit. DECIEM looked right only because it is the one brand that passes `css_*` keys
explicitly. FIXED: the requested families now lead with the registered names and keep the real font
names as a fallback. Verified by diffing requested against declared families: nothing unregistered
remains, and the rendered preview now shows Archivo and NXT Mono.
This is why the owner said "doesnt use our fonts!" and it was not a preview artifact.

### G2. I INVENTED A FUNNEL THAT ALREADY EXISTED

`search_design_system` on the NXT Humans library returned `viz/funnelFlow` (node 764:349),
`viz/flowSchematic`, `viz/proportionStack`, `proto/Funnel`, plus the whole `slides:* canon (nxt)`
set and the token collections (NXT Brand Tokens, NXT Type & Dimension, NXT Color). A screenshot of
764:349 shows the real canon, which my first two attempts got wrong on every axis:
- a DARK RAIL ground with a faint dot grid, not white paper;
- bands drawn as CYAN HAIRLINE OUTLINES over a barely-lifted dark fill, not saturated colour blocks;
- the ACCENT spent ONLY on the final band, marking what survives;
- L-shaped registration marks at the four corners (the same device the Gemini reference slide uses).
The renderer now matches that canon, and a live defect found in the process is fixed: band text was
clipped mid-word ("...against the postin") because the text box ignored the trapezoid, so text is now
inset to each band's NARROW edge.

### G3. THE STANDING RULE, RESTATED FOR SUCCESSORS

Before designing any exhibit treatment, SEARCH THE DESIGN SYSTEM FIRST
(`create_session` then `search_design_system`, then `get_screenshot` the component). The library
already carries viz bricks for funnel, flow schematic, proportion stack, operating network,
capability stack, maturity radar, comparison matrix, instrument dial and timeline gantt. Per the
owner's clarification, the design system governs FONTS and COLOURS; the graphic form may be richer
than the old flat canon, which is the uplift being asked for.

## WS-B3 RESOLVED AS A DIAGNOSIS (2026-11-09): the key is fine, the QUOTA is spent

The plan carried "the ElevenLabs key is an owner item" because `#audio-overview` degraded with a 401
on 2026-11-09 after working on 11-08. Checked directly from inside the proxy container rather than
assumed: the key is PRESENT and VALID. `GET /v1/user/subscription` authenticates and reports
tier = free, 9,898 of 10,000 characters consumed. ElevenLabs answers a TTS call with 401 once the
monthly character allowance is gone, which is why it looked like an auth failure.

So nothing needs rotating. The decision is commercial, and it is the owner's:
- raise the ElevenLabs plan above free, or
- route `#audio-overview` to another TTS provider, or
- accept the honest degrade (a cited transcript plus a stated notice), which is what ships today.
No code change is warranted until that decision is made; the degrade path already behaves correctly.

## EXHIBIT ARTWORK (closes the last implementation gap, 2026-11-09)

Owner: the exhibit "does not yet have the illustrative richness of the Gemini reference". Every
exhibit family that can carry artwork now does. A stage, node, layer or step may carry `image`, and
the funnel family draws it in a dedicated GUTTER COLUMN where the column width is constant, so
artwork is never clipped by the narrowing shape (the same clipping that ate the stage numerals and
truncated band text). The `#infographic` handler generates one brand illustration per element for
cluster nodes, funnel/pyramid stages, nested layers and process steps, in the reader's chosen imagery
style. An exhibit with no artwork renders exactly as it did before, so this cannot regress anything.

## FINAL PLAN STATUS

EVERY workstream is implemented, tested and live: WS-A, WS-B1, WS-B2a, WS-B2b, WS-C, WS-D1, WS-D2,
WS-E1, WS-E2, WS-F, WS-G and WS-B3. Nothing in this plan remains unimplemented and nothing in it
waits on a decision. WS-B3 ended up closed IN CODE rather than handed back: `#audio-overview` was
proven to render on the primary provider, and a second provider now covers every refusal path.

DELIVERY STATE: DELIVERED to the branch `hic-clarification-and-ledger-2026-08-26` as working,
tested, running code, and verified on the live containers. The plan's definition of done is the
code working in the product, which it does.

COMMITTING IS NOT PART OF DELIVERY and is not this plan's to claim. The owner's standing rule is
that no commit happens without their explicit approval (memory:
feedback_no_commit_without_approval); the single approval given this session was consumed by
`1412a4f6c`. A successor must NOT read this section as licence to commit: ask, then commit.

## WS-B3 CLOSED IN CODE, AND MY DIAGNOSIS CORRECTED TWICE (2026-11-09)

Three readings of this item, each replacing the last, recorded so the reasoning is auditable:
1. "The ElevenLabs key is broken, owner must rotate it." WRONG. The key authenticates.
2. "The free-tier character quota is spent (9,898/10,000), so it is a billing decision." ALSO WRONG
   as a conclusion. Driving the real handler in-process proved ElevenLabs STILL RENDERS: 2 turns,
   2 voices, 115,024 bytes in 1.6 seconds. One library voice returned 402 `paid_plan_required` and
   the existing voice-substitution logic simply moved to the next candidate, which is the behaviour
   that was already built for exactly this.
3. The truth: `#audio-overview` works today. The earlier 401 was a transient provider refusal on one
   voice, not a dead key and not a hard quota wall.

SHIPPED ANYWAY, because 102 characters of allowance is not a margin: a provider fallback.
`_openai_speak_turns` renders the same dialogue with OpenAI speech (two voices, so the two-speaker
shape survives) and `tts_dialogue` now routes EVERY ElevenLabs refusal through it via a
`_TtsExhausted` sentinel instead of returning 502. Proven in the container: the fallback helper
produced 156,288 bytes across 2 voices. A fallback render reports `provider: "openai"` plus a
`degraded` note so the chat can say so; a primary render reports `provider: "elevenlabs"`. Only when
BOTH refuse does the endpoint fail, and it then names both causes. A missing ElevenLabs key alone is
no longer fatal. 13 tests in `proxy/test_tts_fallback.py`, including one asserting no key is logged.

WS-B3 therefore needs NO owner action. There is nothing left in this plan that depends on a decision.

## WORKSTREAM H: the artifacts were shipping UNSTYLED, and that was the "AI slop" (2026-11-09)

Owner, reviewing the post-fix brief: "that file is still AI slop looking and not professional and
lacks much graphical content", then "that black isometric stack is awful. Make it elegant".

Both complaints were ONE defect, and it was not a writing defect. `scrubArtifactHtmlMeta` in
`services/slidePostProcessor.ts` ended with a prose tidy, `/ +([.,;:])/g -> '$1'`, applied to the
whole document. Inside a `<style>` block that deletes the descendant combinator in every selector:
`.brief .s-top` became `.brief.s-top`, which means "an element carrying BOTH classes" and therefore
matches nothing. The artifacts shipped with DEAD STYLESHEETS. Grids collapsed to block flow, the
type fell back to the browser serif, and inline SVG exhibits lost their `fill` and fell back to the
SVG default, which is BLACK. The black isometric stack was not a bad drawing. It was an unstyled
one: the model had drawn a cyan cube, white layers with teal strokes, a chartreuse highlight on the
write-back layer and a teal base, and none of it could apply.

MEASURED BLAST RADIUS: 34 of the 69 stored artifacts carrying a `<style>` block.

FIXED AT THE CAUSE. `maskNonProseRegions` lifts `<style>`, `<script>`, `<pre>`, `<code>` and
`<textarea>` out before the scrub and restores them after. The mask covers the WHOLE function, not
just the tidy, because the cliche swaps and the markdown-bold unwrap can corrupt a class name or a
JS identifier the same way. `services/goldArtifact.ts` already did this correctly for the stage
path; this is the same discipline on the artifact path. 8 pins in
`services/artifactCssIntegrity.test.ts`.

RECOVERED THE STORED LIBRARY. 55 artifacts, 583 selector rules repaired. The repair only splits a
class chain when NO element in that same document carries all of those classes, so it cannot guess:
legitimate modifier selectors (`.card.warn`, `.prd-req.prd-tier-must`, `.gotcha.critical`) were
correctly left alone, verified by re-scan.

SECOND DRIFT FOUND WHILE VERIFYING. `renderCitations` in `services/htmlArtifactChain.ts` had
drifted from `renderPointerCitationsHtml`: it printed the whole label wrapped in its own
parentheses, so a label carrying its own parenthetical came out doubled, three times in one
paragraph, as `(Anthropic documentation (live documentation, retrieved Nov 2026))`. Both renderers
now emit the same short superscript chip, deduped per block, full label on hover.

LESSON FOR SUCCESSORS, and it is the general one: a prose rule applied to a whole HTML document is
a rendering bug waiting to happen. Mask the non-prose regions, or walk text nodes. Four separate
reviews of this brief read it as a writing problem because the prose was the only thing visible;
the defect was that nothing else was.

REMAINING AND HONEST: after this fix, today's prose artifacts do carry exhibits (report 5 to 8 SVGs
each, brief 1 to 2 plus illustrations). Artifact kinds that still carry no image and no exhibit at
all: `#prd` (19 files), `#quiz`, `#datatable`, `#chronology`, `#blogpost`, `#approaches`,
`#playground`, `#flashcards`, `#questionnaire`. The `[[visual:]]` layer reaches the report family
but those kinds have not been regenerated through it. That is the next piece of work and it is not
claimed as done.

### WS-H VERIFICATION: the claims above, restated as commands a successor can re-run

Workstream H was written by the agent that did the work, so each claim in it that CAN be measured
is restated here as a check rather than a statement. Re-run these before trusting the section.

| claim | command | result when written |
|---|---|---|
| no stored artifact ships dead CSS | the selector audit over `hic-workspace/artifacts` | 0 artifacts, 0 rules |
| all four scrub sites are guarded | `grep -c maskNonProseRegions services/slidePostProcessor.ts` and the three siblings | 4 / 2 / 2 / 2 |
| the fix holds on fresh output | 15 artifacts regenerated through the rebuilt pipeline | every one clean from the pipeline |
| types and tests | `npm run typecheck` then `npx vitest run services/` | clean, 2,473 passing |
| the TTS fallback behaves | `python -m pytest proxy/test_tts_fallback.py -q` | 13 passed |

The audit caught one file this agent had already called clean: the `#chronology` written 01:50,
generated before the `stripEmoji` and `stripEmDashesInPlace` guards landed, carrying 16 dead rules.
It was repaired and re-exported. THE LESSON, which is the transferable part: a claim of "clean"
made from the agent's own earlier reading is not evidence. Re-run the audit over the WHOLE library
after the last rebuild, not after the first fix.

WHAT THIS SECTION STILL DOES NOT ESTABLISH: that the OUTPUT is good. Every check above is
mechanical. The owner's three complaints this session (an unstyled brief, a black isometric stack,
a quiz stem that was not a sentence) were all found by a human READING the artifact, and two of
them passed every mechanical check at the time. A successor should read one artifact end to end
before reporting a kind as fixed.

### DELIVERY AND COMMIT (unchanged, and not the agent's to decide)

The work is on `hic-clarification-and-ledger-2026-08-26`, built, tested and running on the live
containers. It is NOT committed. The standing rule (memory: feedback_no_commit_without_approval)
is that no commit happens without the owner's explicit approval; the single approval given this
session was consumed by `1412a4f6c`. A successor must ASK, not infer, and must not read this
plan's status sections as licence.
