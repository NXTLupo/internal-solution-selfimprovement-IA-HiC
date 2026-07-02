# Artifact Total Elevation Plan (2026-07-02)

> The definitive plan to elevate EVERY #artifact to consulting-grade quality per the Unified Vision.
> Method: evidence-first audit (six live evidence packages, this file Part I), Verbalized Sampling over
> candidate plan architectures (Part II), workstreams with gates (Part III), Reinforcement Inference
> second pass on the uncertain claims (Part IV), sequencing + omission-proofing (Part V).
> Doctrines binding throughout: NO STOPGAPS; CONVERGE / DELETE / GATE / SCHEDULE; Lego-brick Method A
> (compose from registered bricks + tokens at generation time, never hardcode); quality-first (fix
> upstream, never relax a gate). Every workstream names the vision phase(s) it advances.
> Predecessor: plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md (the AIR backbone this
> plan renders ON; nothing here forks it).

---

## PART I — THE EVIDENCE (all collected live, 2026-07-02)

### E-1 · Cost (owner failure #1) — caching is wired in the wrong shape
- `proxy/app.py:9771-9806` DOES inject Anthropic `cache_control` (1h TTL beta) — but wraps the ENTIRE
  system string as ONE block (`app.py:9794`). The system prompt is assembled stable-first
  (`corpusChatService.ts:3371-3480`: ~17KB truly stable protocol/skills + ~25-35KB per-engagement
  semi-stable + dynamic grounding), so any corpus change invalidates the whole prefix. The 17KB stable
  block never amortizes across engagements.
- The proxy exact-match SQLite cache hits ~never on artifacts (corpus-specific prompts); the tool/stage
  cache helps retrieval only. Gemini EXPLICIT cachedContent is fully built but OFF by default
  (`GEMINI_EXPLICIT_CACHE_ENABLED=0`, `app.py:9655`).
- Corrected cost shape (the audit agent's $ figures were ~1000x inflated; ratios stand): a 193KB theme
  shard is ~55K input tokens = ~$0.28 on Opus in; a full themes run (2-10 shards + retry wave + depth
  pass) plus 3-4 artifacts is a few dollars per engagement, dominated by REPEATED uncached input and
  output tokens. The stable+semi-stable prefix is 30-50% of artifact input and is currently re-paid on
  every call within the same engagement.

### E-2 · Writing (owner failure #2) — deck dissected as a human strategic analyst
`deck_2026-07-02_12_slides.pptx` (Nationwide Farm Risk Ready, 12 slides), full text extracted:
- **Em-dashes: ZERO in all 12 slide XMLs.** The `stripEmDashes` chokepoint holds; that specific tell is
  fixed. The real writing failures are different:
- **Missing judgment titles**: slides 6, 7, 9, 11 lead with a topic KICKER ("DESIRED OUTCOMES",
  "AI CAPABILITIES", "DATA SOURCES", "MEASURES OF SUCCESS") plus a descriptive subtitle ("What the
  experience is asked to deliver for farmers") — no complete-sentence judgment anywhere in the title
  tier. The Partner Test fails on 4 of 12 slides.
- **Banned rhetorical patterns**: "A contextual intelligence layer, not a single-purpose tool" (slide 5)
  and "A living plan, not a PDF" (slide 6) are the "Not X, it's Y" parallelism; "open the door to
  quotes" (slide 11) is a banned metaphor. All three shipped through the post-processor.
- **Evidence monotony**: six slides carry the IDENTICAL citation line ("Client discussion notes;
  Nationwide Farm Risk Ready Plan Builder"); external evidence ~0% (the 60% external floor is
  unenforced on this path); the same worksheet quote is reused verbatim on slides 4 and 9.
- **Junk evidence**: "In India, for example, insurance literacy programs have led to increased uptake."
  (slide 6) — an off-corpus non sequitur presented as corroboration; "installing fire detection and
  protection equipment." (slide 9) — a lowercase mid-sentence fragment as a quote.
- **Schema misuse**: slide 8's READINESS column contains provenance labels ("Client upload",
  "Client discussion") instead of readiness ratings — a field-content type failure.

### E-3 · GOLD layout + PPTX (owner failure #3)
- Live Figma screenshot of `executive-brief 366:2`: four fixed-height finding cards (292px) each carry
  a title + ONE body line; ~180px dead space per card; two cards have no quote at all; ~45% of the body
  area is empty wash; ZERO visual/diagram/dataviz slots on the page. The template MANDATES the "big
  gaps" the owner sees; PPTX inherits them 1:1.
- 366:2 is still a RAW FRAME (not componentized, D16); 7 image slots remain `wired:false`;
  theme-cluster/theme-spotlight render with no Figma component (quarantined). PPTX is ~95% native but
  the empty-geometry raster fallback (D15) and legacy SlideCanvas path survive.

### E-4 · Imagery (owner failure #4) — the memphis-iso pipeline, fully mapped
- Style lives at `proxy/app.py:18641-18659` (`_brand_image_prompt`, style default `memphis-iso`):
  "Corporate Memphis (Alegria) ... modern isometric vector art ... bendy limbs ...". Routed via
  `services/visualRouter.ts` (branch `emotive`) → `services/artifactIllustrator.ts` →
  `/api/ai/brand-image` (Nano Banana) for recommendation panels (560x140), theme-cluster thumbnails
  (492x290), persona panels (460x230).
- "NO text in image" IS in the prompt (`app.py:18658`) and **empirically fails**: the owner's deck
  image4 renders the slide's headline INSIDE the image, twice, in off-brand type. This is the D17
  lesson unapplied: a diffusion model cannot hold typography; the ceiling is the tool, not the prompt.
- Two native lanes already exist: `proxy/nxt_diagram_render.py` (D17 HTML→Chromium full-bleed exhibits;
  real Archivo/IBM Plex Mono TTFs, 104 real icon glyphs, token palette, deterministic) and
  `services/vizEngine.ts` (12 deterministic token-locked SVG dataviz families + 11 domain forms). The
  emotive branch is the only remaining diffusion lane on content-bearing slots.

### E-5 · Not enough visuals / Figma pages (owner failure #5)
- The visuals gap is structural: GOLD templates ship image-free or with unfilled slots (E-3); the
  component registry `figma-node-map.md` is manifest-CHUNKED (46 chunks) but NOTHING retrieves it at
  generation time — the pipeline cannot reason about available bricks when composing a slide.
- Tokens are healthy (figma-tokens.json refreshed 6/29, hex ceilings locked, twins hydrate from
  tokens); the gap is layout quality + slot wiring + component-spec retrieval, not tokenization.

### E-6 · #proto (owner failure #6) — the chain audited end to end
- Pipeline is live and hardened (orchestrator → parallel pods → deterministic assembler → reviewer;
  3-layer compile gates; token carrier; region-scoped fidelity rebuild; 30-session VS coverage audit).
- **Brief↔PRD: fully decoupled.** `ExperienceBrief` (prototypeBuilder.ts:189-204) carries persona +
  JTBD + success criteria only — no features, no MoSCoW, no Given/When/Then acceptance, no metrics
  with baselines, no out-of-scope. The `#prd` 16-section Cagan schema exists separately
  (prd-compiler skill) and never reaches the prototype.
- **Synthetic data**: density floors exist (seed_count >= 20) and "no Item 1/2/3" is demanded, but seed
  VALUES are model-invented per run; corpus names/records are used only when the structured brief
  carries them; the reviewer never audits seed-data-vs-session-distribution.
- **The 5 Figma proto pages** (NXT 403:2 + 469:2, NU 332:2 + 364:2, + Visualization Families; 74
  proto/<Name> components) reach the pipeline ONLY via the hand-maintained 68KB
  proto-component-manifest.md. Fidelity is measured (grounding_pct, invented_components flagged) but
  NOT blocking; no scheduled manifest↔Figma parity check exists; the legacy `p-*` composer vocabulary
  contradiction is resolved in intent, partially in code.

---

## PART II — VERBALIZED SAMPLING: candidate plan architectures

Four candidate architectures were generated with distinct frames and probability mass, per the
verbalized-sampling skill:

- **α · "Six parallel remediations"** (frame: convention; p=0.20). One workstream per owner failure,
  each owned end-to-end. Fastest per-item start, weakest whole: the six failures share root causes
  (templates that starve content; a diffusion lane where native rendering belongs; protocol rules
  without deck-level gates) and independent patches re-drift — the exact PARALLEL-BRAINS failure mode
  PART IX of the v2 plan warns about.
- **β · "Render-native spine"** (frame: shifted; p=0.55). One thesis: EVERY visual surface becomes a
  deterministic native composition (D17 HTML→Chromium + vizEngine SVG + real components), and every
  written surface passes deck-level editorial gates fed by the AIR evidence ledger; cost is fixed by
  prompt ARCHITECTURE (cache-aligned block ordering), not by cheaper models. Converges onto machinery
  that already exists (D17, vizEngine, AIR renderPlan, slide-title-lab, source_diversity checks);
  deletes the diffusion emotive lane. Highest value-per-risk; fully vision-aligned (phases 5-9).
- **γ · "Brick-compiler rebuild"** (frame: radical; p=0.15). Compile every Figma component (GOLD +
  proto pages) into real JSX/HTML brick partials and assemble slides AND prototypes deterministically,
  reducing the model's job to content selection. Highest ceiling (true Method A endgame) but a
  re-platform: weeks of work before any visible quality delta, high regression surface.
- **δ · "Retrieval-first quality"** (frame: contrarian; p=0.10). Treat the writing failures purely as
  evidence failures (fix grounding, citations diversify, prose follows). Necessary (E-2's junk
  evidence IS retrieval residue) but demonstrably insufficient: the deck's grounding was clean and the
  titles still failed.

**COMMITTED: β**, with two grafts: γ's brick compilation is adopted as the E5/E6 north star (flagged,
scheduled behind the CD pass, not a precondition), and α's per-failure GATES are kept so each failure
class gets its own regression tripwire. δ's claim-evidence compiler wiring rides E2 (it was already
deferred ledger item D5).

---

## PART III — WORKSTREAMS

### E1 (P0) · Cache-aligned prompt architecture — phases 6+7
Evidence: E-1. The single biggest cost lever is prompt SHAPE, not model choice.
1. Split artifact/theme system prompts into ordered blocks: `[stable: protocol + skills + output rules]
   [semi-stable: engagement corpus summary + manifest + provenance index] [dynamic: grounding + ask]`
   at the assembly chokepoint (`corpusChatService.ts:3371-3480`; themes assembly in geminiService).
2. Proxy `_inject_anthropic_cache_control` accepts a MULTI-BLOCK system array and sets breakpoints at
   the stable AND semi-stable boundaries (Anthropic allows up to 4), so the stable block amortizes
   across engagements and the semi-stable block amortizes across every call within one engagement
   (theme shards, retries, depth pass, each #artifact). Verify breakpoint semantics against current
   Anthropic docs at implementation (RI item U1).
3. Enable Gemini explicit cachedContent by default when a session runs >= 2 artifacts and system_text
   >= 8KB (flag already built; add cleanup on corpus_version change + storage-fee telemetry).
4. Surface it: AIR `modelTrace` gains `cacheReadTokens`/`cacheWriteTokens`; costMeter books cached
   reads at the cached rate; the run-cost chip shows "N% cached".
GATE: `cache_efficiency` check on the build receipt — 2nd+ model call in an engagement must show > 40%
cached input tokens, else warn with the block-boundary diff. EXIT: a 3-artifact engagement shows >= 30%
total input-cost reduction vs the 2026-07-02 baseline traces.

### E2 (P0) · Editorial elevation — deck-level writing gates — phases 1+5+7
Evidence: E-2. Rules exist per-field; the failures are DECK-level and title-tier.
1. **Judgment-title enforcement**: every content slide's `title` must be a complete-sentence judgment
   (the kicker carries the topic). Generation side: fold the `slide-title-lab` skill into the SLIDE
   OUTPUT PROTOCOL for every slide-bearing artifact (not just decks). Gate side: extend
   `validate_text_hierarchy`/postProcessor with a deterministic title-shape check (has verb, not
   all-caps label, <= 10 words target) that BLOCKS topic-label titles; detected failures re-prompt the
   single offending slide, never the deck.
2. **Banned rhetorical patterns**: add "Not X, (it's/not) Y" appositive parallelism and the metaphor
   list ("open(s) the door", "earns the right", ...) to slidePostProcessor slop patterns + the
   protocol's negative examples. These are regex-detectable (", not a" / ", not the" title/lead shapes).
3. **Deck-level evidence diversity**: a per-deck gate (in the AIR quality report + checks/) that fails
   when (a) any single citation string appears on > 35% of slides, (b) external-source share < 60%
   (the standing rule, currently unenforced on the deck path), or (c) the same verbatim quote appears
   twice. Meet the floor UPSTREAM: the deck composer must request per-slide evidence from DISTINCT
   ledger sources (the AIR evidenceLedger + objectiveScore, shipped 7/01, makes this selectable).
4. **Quote hygiene + field typing**: reject lowercase mid-sentence fragments as quotes (complete
   sentence or drop); tighten per-template field enums so a READINESS-class column carries a rated
   value, never provenance (schema + postProcessor).
5. **Claim support**: wire the claim-evidence compiler (deferred D5) into the deck path — every slide's
   evidence block resolves from >= 2 distinct ledger sources or the claim narrows.
GATE: extend the golden set with this Nationwide deck as a scored regression exemplar; benchmark
dimensions: judgment-title rate, citation diversity, banned-pattern count, quote hygiene. EXIT: a
regenerated Nationwide deck scores 12/12 judgment titles, >= 4 distinct sources, 0 banned patterns.

### E3 (P0-visual) · GOLD template re-layout + density-adaptive anatomy — phases 8+9
Evidence: E-3. The templates mandate the gaps.
1. **Creative-director pass over every GOLD page** (live Figma MCP session): screenshot → critique →
   re-layout, page by page, against three hard rules: (a) no fixed-height container whose content can
   underfill it — auto-layout with min-content + a defined "full" state; (b) every content card carries
   its evidence quote OR collapses to a compact variant (no empty quote wells); (c) every page declares
   at least one VISUAL slot (diagram / dataviz / stat infographic) with its ImageSlotDecision — image-
   free is a recorded decision (`mode:'none'`), never an accident of layout.
2. Re-componentize what the pass touches (executive-brief 366:2 first — D16), bind every value to the
   token collection (NU 535:0 inherits), re-pull `figma-tokens.json` both modes, re-chunk
   `figma-node-map.md` + image-slot fragments (the manifest step — E5 consumes it).
3. Update renderer twins (web.tsx + slideToStageHtml) to the new anatomies, with density-adaptive
   sizing both ways (content-starved → compact variant; dense → existing count-adaptive type).
4. PPTX completion: remove the empty-geometry raster fallback + deprecate the legacy SlideCanvas
   pptxgenjs path after one verified native export (D15); generalize per-variant master layouts.
GATE: new `layout_density` check — at base density with a full payload, no template may render > 25%
empty body area (measured on the stage HTML via the existing artifact-audit screenshot pass);
`figmaRegistryParity` extended to the re-componentized set; `pptx_native` stays blocking.
EXIT: preview + PPTX of the four E-3 pages show no dead wells; owner sign-off per page.

### E4 (P0-visual) · Infographic lane replaces the emotive diffusion lane — phase 8
Evidence: E-4. Creative-director redefinition (NXT Humans house infographic style):
> One idea per graphic. Flat, orthographic, token-palette composition on real type (Archivo titles,
> IBM Plex Mono labels), real icon glyphs (Figma 796:2), generous whitespace, data-first: a stat, a
> comparison, a flow, a composition — never a scene, never characters, never isometric depth, and
> never model-drawn text.
1. **Extend `nxt_diagram_render.py` with infographic families** (same GOLD shell, same palette, same
   /api/ai/diagram content-hash cache): `stat-row` (labeled KPI tiles with cited values), `process-flow`
   (3-5 step orthographic flow with icons), `comparison` (side-by-side attribute panel), `ranked-bars`
   (horizontal ranked findings), `composition` (proportion stack). Specs are BUILT FROM THE AIR
   (evidence ledger quotes + insight hierarchy), slot-governed per WS-H: the ImageSlotDecision picks
   mode + family; the prompt only supplies content. Numbers appear ONLY inside cited-quote elements
   (Quantitative Claim Rule holds inside graphics too).
2. **Re-route the emotive slots** (`artifactImageSlots.ts`: recommendation panel, theme-cluster
   thumbnails, persona panel) from branch `emotive` → branch `infographic` (native). vizEngine gains
   the same families as the SVG fast path where Chromium is unavailable.
3. **Retire the diffusion path for content slots**: `_brand_image_prompt` memphis-iso directives
   (app.py:18641-18659) are DELETED with the branch (converge/delete — same treatment the diagram
   fallback got on 7/01). Nano Banana remains ONLY for the persona-photography endpoint and any
   genuinely illustrative, non-typographic, non-content-bearing surface (each use recorded in the slot
   registry).
4. **Skills rewrite** (creative-director voice): `designer` SKILL branch table (emotive →
   infographic-native), `nxt-visual-renderer` brand-imagery contract (compose-from-evidence, not
   describe-a-scene), `illustrator` SKILL retired or narrowed to the photography lane.
GATE: registry `model` field for all content-slot images must be native (`native-html-chromium` /
`svg-vizengine`); text-in-image is impossible by construction. A 20-sample CD review (owner) before
the branch flips per artifact type. EXIT: a regenerated Nationwide deck carries infographic visuals on
>= 6 of 12 slides, zero diffusion images on content slots.

### E5 (P1) · Figma page evaluation + component-spec retrieval into generation — phases 4+8
Evidence: E-5.
1. The E3 CD pass extends to EVERY page in the file (slides-609 archetypes, dividers, icons page,
   proto pages get their own pass under E6) — each page gets: examined (screenshot + critique log in
   the wiki), re-componentized/tokenized where failing, and its spec re-chunked into the manifest.
2. **Wire component-spec retrieval**: generation prompts for slide-bearing artifacts retrieve the
   relevant `figma-node-map.md` + image-slot chunks via the SAME `pickChunksForPrompt` path (converge —
   the chunks exist since 6/23 and nothing reads them), so the model composes against the actual brick
   anatomy + slots instead of prose memory of them.
3. Token/variable flow stays exactly Method A: Figma → figma-tokens.json → /api/design-tokens →
   renderers; the CD pass may ADD tokens (spacing/typography variants) — they enter through the same
   pull, never inline.
GATE: `figma_registry_parity` (existing) + a page-coverage ledger in the wiki: every page id in the
file appears with {examined_on, verdict, actions} — a page with no row fails the pass (omission-proof).
NORTH STAR (from γ, flagged): compile brick partials to real HTML/JSX for deterministic slide assembly.

### E6 (P1) · #proto flawlessness: PRD-in-brief + grounded synthetic data + pattern parity — phase 8 + killer feature
Evidence: E-6.
1. **PRD-in-brief**: extend `ExperienceBrief` with `prd_candidate` — features[] (name, MoSCoW priority,
   40-60 word description, Given/When/Then acceptanceCriteria, citations + evidenceBasis),
   success_metrics[] (metric/baseline/target/guardrail), risks[], out_of_scope[] — REUSING the
   prd-compiler schema (converge, no fork). Stage 1 populates it from corpus evidence (only what is
   evidenced; thin corpora yield a thin PRD honestly). The brief-picker UI shows the PRD section for
   approval. Stage 2 maps features → screens (every Must-have feature reaches a screen or is flagged);
   Stage 5 reviewer audits ACCEPTANCE-CRITERIA coverage alongside the 30-session coverage and reports
   both in the verdict.
2. **Synthetic data grounding**: a deterministic seed-derivation step between Stage 2 and the
   orchestrator — named entities/records from uploads + brief personas + session archetypes compile
   into the seed arrays (model fills gaps, never invents when corpus values exist); the reviewer gains
   a seed-vs-session distribution audit (every session bucket must find data it can exercise).
3. **Pattern parity + blocking fidelity**: SCHEDULE the manifest↔Figma parity check for the 5 proto
   pages (the same weekly cadence infrastructure as SkillOpt); `grounding_pct` becomes BLOCKING at
   >= 80% after two consecutive clean builds (ratchet, never relax); finish the `p-*` composer
   vocabulary deletion (P0 remnant from the 2026-06-26 plan).
GATE: build receipt carries prd_coverage (Must-have features reaching screens), session coverage,
grounding_pct, token_purity — all four on every build; the first two start advisory, flip blocking
after two clean builds each. EXIT: a #proto from a real #brief ships with every Must-have feature
demonstrated, corpus-derived seed data, and zero invented components.

### E7 (continuous) · Measurement + self-improvement closure — phase 7
Every gate above lands as a `checks/` module in the unified quality gate and a dimension in the golden
set / benchmark (pass^k for determinism-class checks). The AIR qualityReport carries the scores; the
epoch loop (propose-only, live since 6/30) consumes them, so elevation ratchets instead of regressing.
The Nationwide deck + this plan's regenerated twin become the permanent before/after exemplar pair.

---

## PART IV — REINFORCEMENT INFERENCE: uncertainty second pass

Per the reinforcement-inference skill, every claim above was confidence-scored; these tripped the
threshold and get an explicit resolution path (none blocks Wave 1 start):

- **U1 (E1) Anthropic multi-breakpoint semantics** behind the proxy's system-array injection —
  confidence MEDIUM. Resolve: 30-minute spike against current Anthropic docs (claude-api skill) + one
  live call inspecting `cache_read_input_tokens` before rollout. Fallback: single breakpoint at the
  semi-stable boundary still captures within-engagement reuse (the larger share).
- **U2 (E1) Gemini explicit-cache net economics** at current volume (storage $/hr vs read savings) —
  confidence MEDIUM. Resolve: telemetry-gated rollout (one engagement), keep the env flag as the off
  switch.
- **U3 (E4) Warmth loss on persona surfaces** when scenes are replaced by infographics — confidence
  MEDIUM. Resolve: personas keep the (unflagged) photography endpoint; the 20-sample CD review decides
  per-artifact-type before any branch flips. The owner is the gate.
- **U4 (E2) Title-shape false positives** (a deterministic "judgment" check may flag legitimate short
  titles) — confidence MEDIUM-HIGH it is manageable. Resolve: the check re-prompts the slide rather
  than blocking the deck; two-week shadow mode on the golden set before Stop-blocking.
- **U5 (E-1 correction, resolved)**: the caching agent's dollar figures were ~1000x inflated (55K
  tokens ~= $0.28 in, not $275). Second pass recomputed from costMeter pricing; the plan's ROI claims
  use the corrected figures. Caching remains worth it because engagements multiply calls (shards x
  waves x retries x artifacts) and output tokens dominate absolute cost — which is also why E2's
  single-slide re-prompts (not whole-deck retries) matter for cost, not just quality.
- **U6 (E3) The 25% empty-body threshold** is a designed heuristic, not a measured norm — confidence
  MEDIUM. Resolve: calibrate on the first 5 re-laid-out pages with the owner before enforcement.

---

## PART V — SEQUENCING, LEDGER, OMISSION-PROOFING

- **Wave 1 (immediate, code-only)**: E1 (prompt-block split + breakpoints + telemetry), E2 items 1-4
  (title gate shadow, banned patterns, deck-diversity gate, quote/field hygiene). No Figma dependency.
- **Wave 2 (biggest visible delta)**: E4 (infographic families in nxt_diagram_render + slot re-route +
  skill rewrites + CD review), E2 item 5 (claim compiler on the deck path).
- **Wave 3 (live Figma MCP sessions)**: E3 page-by-page CD pass + re-componentization + twins + D15/D16
  closure; E5 spec-retrieval wiring.
- **Wave 4**: E6 proto (PRD-in-brief, seed grounding, parity schedule, fidelity ratchet).
- **Continuous**: E7.
Each workstream ships build → tsc → gate test → Docker rebuild → browser smoke → OWNER OUTPUT REVIEW
(the deck/proto regenerated and eyeballed) before "done" — HTTP 200 and a green build are not proof.

Deferred/OPEN ledger rows created by this plan (tracked, per the v2 plan's PART VIII rule):
| id | item | trigger |
|----|------|---------|
| T1 | γ brick-compiler (JSX partials for slides + proto) | after E3+E5 land and the CD pass stabilizes anatomies |
| T2 | grounding_pct + prd_coverage flip to BLOCKING | two consecutive clean builds each |
| T3 | Gemini explicit-cache default-on | U2 telemetry positive |
| T4 | layout_density threshold calibration | first 5 re-laid-out pages reviewed |
| T5 | illustrator skill retirement decision | after E4 CD review |

Omission guard: this plan's six evidence packages map 1:1 to the owner's six failures; E1↔#1, E2↔#2,
E3↔#3, E4↔#4, E5↔#5, E6↔#6, E7 binds them to phase 7. A workstream with no gate, or a gate with no
golden-set dimension, is a process bug.
