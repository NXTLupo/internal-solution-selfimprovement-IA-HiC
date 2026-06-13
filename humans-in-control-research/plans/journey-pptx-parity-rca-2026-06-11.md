# Journey Generation + PPTX Parity RCA (2026-06-11)

Reinforcement-inference diagnosis of two live failures reported 2026-06-11 from a real
research session (transcript: chat-2026-06-11.txt; engagement
`identify-emerging-trends-in-higher-education-related-only-to`).

## Reported failures

1. `#journey ... #NU` on Gemini 3.1 Pro produced a wall of markdown prose; no artifact rendered.
2. The `#blueprint` slide that Gemini 3.5 Flash DID produce exported to a PPTX that broke
   brand parity: Spectral font (not Lora), entire CUSTOMER + FAIL POINTS rows as near-solid
   accent red, raw manifest pointers (`[articles/client-uploads/4fe24ed6a9.md#c15]`) visible
   in both web and PPTX, naked numbers in the takeaway band.

## Root causes (each verified in code, not inferred)

| # | Failure | Root cause | File |
|---|---------|-----------|------|
| 1 | No artifact on 3.1 Pro | The chat contract gated `:::slide` fences behind `#slide/#slides`; `#journey` alone hit the DEFAULT PROSE rule, so Pro COMPLIED by answering in markdown. Flash volunteered a fence anyway (luck, not contract). | services/corpusChatService.ts (prose-default section + hard slide-mode gate keyed only on `#slides?`) |
| 2 | Raw `.md#cNN` pointers visible | chunkCitationInstructions() tells models to cite by manifest pointer (correct, validator needs it) but NO render-time layer resolved pointers to named sources. resolveCitations() knew only `[CHUNK_XXX]`/`[FILE N]`. Nested template payloads (serviceBlueprint.stages[].painPoint...) were never post-processed at all. | services/chunkRetrieval.ts, services/slidePostProcessor.ts |
| 3 | Solid-red rows in PPTX | TWO independent alpha bugs: (a) `_alpha_to_transparency()` wrote `(1-alpha)*100000` into `<a:alpha>`, but `<a:alpha>` is OPACITY, so a 4%-opacity wash exported at 96% opacity; (b) `_set_solid_fill_with_alpha()` was a documentation-only `pass` stub that gold_pptx_export.py imports and calls (silent no-op). | proxy/pptx_export.py:298,308 |
| 4 | Spectral font in PPTX | ServiceBlueprintSlide (web) was the last `nu-artifact-stage` holdout using `var(--font-display)` (Spectral) instead of GOLD tokens; the per-slide export DOM-walks that render. The stage twin renderServiceBlueprint ALSO diverged: read `s.pain` (models emit `painPoint`), had no SUPPORT/FAIL POINTS lanes. | components/slideTemplates/web.tsx, services/slideToStageHtml.ts |
| 5 | Per-slide export off-engine | SlideCanvas handleExportPPTX routed through the DOM-walker + `/api/export-pptx` (third parallel exporter) instead of the verified gold stage pipeline. | components/SlideCanvas.tsx:295 |
| 6 | Naked numbers in keyInsight | The slide protocol literally instructed "keyInsight must quantify the business cost" - contradicting the Quantitative Claim Rule. | services/corpusChatService.ts |
| 7 | `/api/embed` HTTP 500 (silent retrieval starvation) | EMBED_PROVIDER=local targets social-research-backend:8081, but that backend crash-looped at boot: app/routes/api.py imports `api_sentiment` + `api_embed` modules that never landed in the branch. DNS "Name or service not known" = container down. | internal-solutions-socialresearch/backend/app/routes/ |
| 8 | 858 em-dashes persisted in themes | stripEmDashes existed only on the slide pipeline, not on deliverable JSON persist. | services/geminiService.ts `_finalizeDeliverable` |
| 9 | Design Desk regenerations off-brand | chatToSlideSpec.ts prompt carried a parallel brand system (violet 6E54E0, pink FBE8EC, Fraunces) that exists in neither Figma file. | design-desk/services/chatToSlideSpec.ts |

## Fixes shipped (all in this change set)

1. **Artifact hashtags ARE slide mode** - contract text + code-level gate extended: `#journey/#blueprint/#case-study/#compete/#gap/#personas/#themes/#recommendations/#roadmap/#prd/#audit/#arch` force `:::slide` output with the mapped template, no `#slides` needed (ONE-ENGINE rule).
2. **RI-Replace fence enforcement** - if slide mode was active and the response has no fence, ONE anchored re-ask (prior response verbatim + named violation, per arXiv:2602.08520; anchor is load-bearing). Recovers content instead of regenerating. Loud `[chat][RI]` logging; visible render notice if the retry also fails.
3. **citationPointerRegistry.ts** (new) - retrieval registers pagePath -> sourceTitle at catalog build; `resolveManifestPointers()` swaps `[path.md#cN]` groups for `(Source: Name)` at every render surface: chat finalize, resolveCitations(), and a new NESTED PAYLOAD SWEEP that deep-walks every template payload (citations + CHUNK sweep + QA annotations + em-dashes). 7 unit tests.
4. **Alpha semantics fixed** - `<a:alpha>` now carries alpha*100000 (opacity); `_set_solid_fill_with_alpha` delegates to the real implementation; `_is_visually_empty_shape` floor lowered 0.25 -> 0.03 so light washes survive.
5. **GOLD blueprint twins** - web ServiceBlueprintSlide rewritten on GoldFrame (tokens only, no CSS vars, solid wash hexes, brand-correct wordmark); stage renderServiceBlueprint rewritten with full lane parity (PHASE/MOOD/CUSTOMER/FRONTSTAGE/BACKSTAGE/SUPPORT·DATA/FAIL POINTS, correct schema fields incl. painPoint/failPoint/support, keyInsight -> takeaway band, journeyType -> kicker).
6. **Per-slide export rewired** - SlideCanvas primary path = slideDataToStageHtml -> /api/gold/export-pptx (same engine as deck export); DOM-walker demoted to loudly-logged fallback.
7. **keyInsight rule fixed** - qualitative structural cost; numbers only inside attributed verbatim quotes; named-source citation rule added to slide-mode gate.
8. **Universal em-dash sweep** in `_finalizeDeliverable` (covers themes + every deliverable JSON persist).
9. **social-research-backend restored** - created missing `app/routes/api_embed.py` (sentence-transformer all-mpnet-base-v2, honors the proxy contract `{texts} -> {embeddings}`), guarded the missing `api_sentiment` import. Container healthy; `/api/embed` returns 768-dim vectors end-to-end.
10. **chatToSlideSpec palettes reconciled to GOLD** (both brands, fonts + wash discipline + rail geometry).

## Verification (2026-06-11)

- Build: `tsc --noEmit` 0 errors; `vite build` OK; template parity PASS (19/19/19).
- Tests: 66/66 existing + 7/7 new pointer-resolver tests.
- Browser load: SPA at :5011 loads with ZERO console errors/warnings (Playwright).
- Flow exercised: the EXACT failing transcript payload rendered via the new stage twin and
  exported through the LIVE `/api/gold/export-pptx`: 120 native AUTO_SHAPEs + 39 TEXT_BOXes,
  fonts = {IBM Plex Mono, Lora, Archivo} (zero Spectral), 4 FAEDED wash fills, ZERO large
  red rectangles, ZERO pointer leaks in text runs.
- NOT exercised (requires a live model run): the RI fence-retry firing on a real Gemini
  3.1 Pro prose violation, and a fresh `#journey` end-to-end generation. Next live session
  validates these; the contract + gate are deterministic code paths.

## Standing lessons

- `<a:alpha>` is OPACITY. Any DrawingML alpha math must be `alpha*100000`.
- A `pass`-bodied "documentation stub" that other modules import is a silent-fallback
  factory. Never ship one.
- Every render surface that displays model output needs the pointer-resolution layer;
  persisted JSON keeps pointers (validators + drill-down need them), displayed text never
  shows them.
- An artifact hashtag IS the request for the artifact. Prose-default applies only to
  hashtag-free conversation.

## Correction round (2026-06-11, later): #journey is a JOURNEY MAP, not a blueprint

User corrections: (1) the failing export came from the ANALYST DESK chat (per-slide
SlideCanvas export - already rewired to gold above); (2) `#journey` must produce a
JOURNEY MAP, not the Bitner blueprint; (3) verify ALL analyst-chat deliverable exports.

Shipped:
- NEW 20th template `journey-map` grounded in the Figma GOLD journey exemplars
  (NU 53:159 / T3 156:2, NXT 75:2): stages x ACTOR lanes, critical-stage accent,
  "not engaged" ghost cells, PAIN POINTS row, personas/pains/opportunities dashboard,
  3 qualitative KPI tiles, keyInsight band. JourneyMapData + DENSITY_SPEC (5x3 base,
  6x4 dense) in types.ts; web.tsx JourneyMapSlide (GoldFrame); slideToStageHtml
  renderJourneyMap; pptx.ts exportJourneyMap (fallback parity); SlideCanvas dispatch;
  chat fence parse detection; #journey -> journey-map in the slide-mode gate + contract
  + mapping table + JSON shape spec; render-contract spec in web-layouts.md; wiki
  pattern page + learned constraint + memory rule.
- Analyst-chat export audit (every PPTX trigger reachable from CorpusChatPanel):
  per-slide (SlideCanvas) GOLD / deck export GOLD / themes-personas-recs-gap deck
  routes GOLD / gold HTML artifacts GOLD / rec tiles GOLD / freeform artifacts GOLD
  (#stage) / #presentation bespoke native pptxgenjs (by design) / legacy TYPED
  Design-Desk artifacts = raster body, now logs a loud [exportPptx] LEGACY warning
  pointing users to regenerate via the hashtag for the gold editable twin.

Verification: tsc 0 errors; parity 20/20/20 PASS; 73/73 tests; build OK; container
rebuilt; SPA loads with 0 console errors; the failing #journey content rendered as
journey-map (NU) and exported through LIVE /api/gold/export-pptx: 97 native shapes +
57 text boxes, fonts {IBM Plex Mono, Lora, Archivo}, palette exact (C8102E/0E1626/
16233C/F2F1EA/DDDDD6), zero pointer leaks, screenshot-audited clean.
Still requires a live model run: fresh `#journey ... #NU` in the analyst chat.

## Full-roster verification (2026-06-11, third round)

User asked whether templates beyond journey were tested. Built a permanent harness
(scripts/eval/_render_all_templates.mts): ONE representative slide per chat-reachable
template (19 total, alternating NU/NXT, representative industry-neutral copy), rendered
through slideDataToStageHtml and exported as ONE 19-slide deck through the LIVE
/api/gold/export-pptx-multi endpoint, then inspected per slide with python-pptx and
screenshot-audited as a scaled contact sheet + full-size spot checks.

Result matrix: all 19 slides native (zero raster), brand fonts correct per slide
(Lora on NU, Bebas Neue on NXT, IBM Plex Mono + Archivo everywhere, zero Spectral),
zero manifest-pointer leaks, all GOLD chrome present.

Two visual defects found and FIXED during the audit:
1. architecture-map: layers hugged the top (dead zone) AND the FLOW callout rendered
   OUTSIDE .amwrap, overflowing into the SOURCES strip. Fix: .amlayer flex:1 +
   align-items:center (layers distribute), FLOW moved inside the wrap.
2. Shell-level: .canvas bottom padding without a takeaway band was 56px but the
   absolutely-positioned .srcs strip occupies ~y1004-1046, so any full-height body
   collided with it. Fix: non-takeaway bottom padding 56 -> 104px (clears the strip
   for ALL templates).

Re-rendered, re-exported, re-audited clean. Container rebuilt with the fixed chunk.
Still requires live model runs: hashtag -> fence emission per artifact (the slide-mode
gate covers #journey #blueprint #case-study #compete #gap #personas #themes
#recommendations #roadmap #prd #audit #arch deterministically; the model loop is
exercised per-hashtag in the next live session).

## Fourth round (2026-06-11): theme-blue corruption in the live 19-slide deck

User exported deck_2026-06-11_19_slides.pptx from the analyst chat: journey-map matrix
cells rendered OFFICE BLUE (theme accent1 tints) instead of the GOLD near-white washes.

Root cause (verified by dumping the corrupted shape XML from the user's own deck):
_set_solid_fill APPENDED the <a:solidFill> after <a:ln> when called through the gold
native path (line styled before fill). spPr children have a required schema order;
PowerPoint silently rejects the out-of-order fill and falls back to <p:style>
fillRef idx=3 schemeClr accent1 = the blue gradient tint. Only translucent cells were
affected because only the alpha path routed through _set_solid_fill on a pre-styled
shape. Introduced by the same-day alpha fix; caught within one live run.

Fixes: (1) _set_solid_fill inserts the fill at its schema-valid position (before
ln/effects); (2) gold native exporter now REMOVES <p:style> from every emitted shape,
eliminating the theme-fill fallback class entirely; (3) stage twins emit solid
pre-blended washes only (new washHex helper replaced the `${callout}55` translucent
cell fill); (4) journey dashboard items clamp to 2 lines + wrap overflow hidden (the
user's deck also showed the pain row colliding with the takeaway band under long
personas).

Verification: full 19-template roster re-exported through the rebuilt proxy:
1105 shapes scanned, 0 fills after a:ln, 0 auto-shapes carrying p:style, only 2
intentional 18%-white hairlines inside the solid ink panel remain translucent.
Journey-map stage screenshot-audited: solid cells, no blue anywhere.

Registered next phase: GOLD-uplift of the remaining web PREVIEW renderers
(block-quote, recommendation, etc. still show the old gallery style incl. a banned
"verbatim" confidence chip) so preview = Figma = PPTX for every template.

## Task #32 (2026-06-11): all previews on GoldFrame - preview = Figma = PPTX

Shipped components/slideTemplates/goldPreviews.tsx: 15 preview renderers
(persona-card, recommendation, theme-cluster/spotlight/arc/mosaic,
competitive-matrix, block-quote, principles, stat-row, timeline, gap-matrix,
architecture-map, prd-feature, systems-inventory), each the 960x540 half-scale
GoldFrame twin of its 1920x1080 stage renderer: same kicker, same section
labels, same panel structure, brand tokens only, line-clamps for the small
canvas, SOLID fills only. SlideCanvas now imports these (SlideShell unwrapped
for all 15; persona portrait + generating overlay preserved); the App.tsx
__hicRenderSlide dev helper merges goldPreviews over web. The legacy web.tsx
renderers carry a LEGACY header and stay one release for rollback.

Theme parity deepened: the stage previously collapsed ALL four theme templates
into the spotlight layout, so cluster/arc/mosaic previews could never match
their exports. Added renderThemeCluster (equal columns), renderThemeArc
(progression chain + SIGNAL rows, Figma 165:2/288:2) and renderThemeMosaic
(2x2 inverse checkerboard, Figma 167:2/289:2) to slideToStageHtml with
per-variant dispatch.

Verification: tsc 0 errors; parity 20/20/20; 73/73 tests; new SSR preview
harness (scripts/eval/_render_all_previews.mts) renders all 18 GoldFrame
previews from the shared fixture set - contact-sheet + full-size
screenshot-audited; 19-slide stage roster re-exported through the live gold
endpoint: 0 schema-invalid fills, 0 theme-styled shapes, 0 pointer leaks,
fonts {Archivo, IBM Plex Mono, Bebas Neue, Lora} only; SPA loads with 0
console errors. NOT yet exercised: a live model run rendering the new previews
inside the chat (data shapes unchanged, so risk is visual only).

## Fifth round (2026-06-11): hidden-overflow text corruption in live journey export

User's live deck journey-map rendered with massively overlapping text (dashboard items
stacked, cells bleeding across rows, pain row under the band). Root cause: stage twins
relied on CSS line-clamp / overflow:hidden to bound long generated content, but the
export MEASURE walk extracts FULL textContent - everything the browser hid painted at
full length in PowerPoint. My QA fixtures were short, polite copy; the live generation
emitted 200+ char items with verbose inline attributions, exposing the gap.

Fixes:
1. trunc() in slideToStageHtml: HARD server-side truncation with word-boundary cuts +
   attribution compression ("(Source: Name - Org _ file_anonymized.txt)" -> "(Source:
   Name)") so citations survive the cut. Applied to every journey-map sink (dashboard
   items 118, cells 80-130 adaptive, pains 90, tiles, lane labels) with tight-mode
   font/padding when dashboard + tiles compress the matrix.
2. OVERFLOW AUDIT added to the harness: overflow-audit.html loads every stage and
   flags ANY leaf element whose scroll box exceeds its client box (the exact
   precondition for PPTX overlap). Caught five latent violations beyond journey:
   display-value descender clipping on stat-row/.cv/.hero/section-divider (Lora glyph
   boxes need ~1.2 line-height) and the blueprint mood label overflowing its column.
   All fixed; audit reports CLEAN across 20 stages.
3. LONG-CONTENT STRESS fixture (journey-map-nu-stress) permanently in the harness:
   mirrors the live generation's verbose-attribution style so short-copy QA can never
   green-light this class again.

Verification: audit CLEAN 20/20; stress stage screenshot-audited (bounded cells,
compressed citations, no band collision); v5 deck exported through the live endpoint:
20 slides, 0 bad-order fills, 0 theme styles, 0 leaks, stress slide longest text run
206 chars with ZERO full-length anonymized.txt attributions; tsc 0 errors; container
rebuilt.

Standing lesson: stage twins must NEVER rely on CSS clamps to bound text - the
exported string must BE the visible string. The overflow audit is the gate.

## Sixth round (2026-06-11): ABSOLUTE dual-brand parity verified end to end

User directive: absolute parity for all artifacts on BOTH #NXT and #NU, including
the Analyst Desk wiring. Delivered and PROVEN:

1. Both harnesses now render EVERY fixture in BOTH brands (40 stage twins incl. the
   long-content stress, 38 previews). The dual-brand sweep immediately caught two
   brand-specific defects single-brand QA missed: Lora (NU) is wider than Bebas (NXT)
   so architecture layer labels overflowed their 140px column on NU only (column
   widened to 210px + wrap); NXT persona name clipped its Bebas glyph box (lh 1.16).
2. Token purity: gap-matrix severity, systems-inventory status/risk, and prd priority
   colors were hardcoded NXT literals (#CC6644/#B8B800/#999) leaking onto NU slides
   in BOTH twins. Now token-pure: critical/high -> ACCENT_WARN, medium -> GOLD_ACCENT,
   low/wont -> GREY. Same semantics, brand-correct hues on both systems.
3. Live-export brand assertions: the 40-slide dual-brand deck through
   /api/gold/export-pptx-multi - per-slide checks prove Lora NEVER appears on an NXT
   slide, Bebas NEVER on NU, and neither brand's palette (8 hex sets each) ever
   crosses. Result: ZERO violations, 0 schema-invalid fills, 0 theme styles, 0 leaks.
4. Overflow audit: CLEAN across all 40 stages.
5. Analyst Desk wiring audited per brand: detectBrandFromText (#nxt/#nu/northeastern),
   fence brand attr > JSON brand > query hashtag > nxt default in parseSlideBlocks,
   slide-mode gate brandHint, chat token injection (/api/design-tokens?brand=NU|NXT,
   format=prompt - both verified live). FIXED the one asymmetry found:
   hydrateTokensFromFigma only live-hydrated the NXT TOKENS at boot; it now accepts a
   target brand object and index.tsx hydrates BOTH brands from their own Figma token
   sheets (NXT 223:2 / NU 97:2), with extra GOLD slots (PANEL, WASH_*, GOLD_ACCENT).

Verification: tsc 0 errors; build OK; container rebuilt; SPA 0 console errors;
dual-brand contact sheet screenshot-audited (40 tiles, alternating brand pairs).

## Seventh round (2026-06-11): flex-compression text jumble in live exports - eliminated

User's 4-slide fintech deck (deck_2026-06-11_4_slides) exported with overlapping text
(9-32 colliding text-box pairs per slide) while the preview was clean. Reproduced
byte-identically from the chat transcript payloads.

Root causes (each verified):
1. FLEX COMPRESSION: the stage canvas is a fixed-height flex column; when a payload's
   content exceeds it, flex compresses container blocks while their children keep
   natural size - content bleeds over the blocks below (stats grid over CONVERGENT
   INSIGHT; recommendation columns over PROJECTED IMPACT). The canvas's bottom PADDING
   was no barrier: flow content freely enters padding over the absolute sources strip.
2. AUDIT BLIND SPOTS: the overflow audit checked LEAF scroll overflow only - container
   compression and inter-element collision were invisible. Element-rect collision
   checks false-positived on full-width blocks (kicker vs wordmark).
3. PLACEMENT BOX SLOP: text boxes inherited their ELEMENT's right/bottom; single-line
   runs in table cells/flex parents got phantom container-depth boxes. Computed
   textAlign is 'start' (not 'left') - an early width-cap branch never fired.

Fixes:
- Shell: canvas is now a TRUE clipping box ending above the strip/band
  (bottom:96/152px, overflow:hidden) - violations become visible+detectable, never
  silent bleed.
- Tight modes: stat-row (3 stats w/ means+matters + insight+pattern) and
  recommendation (3 actions + 2 evidence + impact grid) scale type/budgets to fit;
  recommendation impact panel moved INSIDE the right column (preview parity).
- Audit v3: container compression + STAGE-OVERFLOW + pairwise TEXT-RECT collision
  (Range-precise, kills false positives) across the 44-stage dual-brand matrix.
- Placement: single-line runs hug text width+height; ALL runs capped at one line of
  rewrap slack beyond measured height ('start' included in align check).
- The user's exact payloads are PERMANENT stress fixtures.

Verification: audit CLEAN 44/44; user-payload re-export = 0 box overlaps; full
44-slide export = 0 GROSS overlaps (12 adjacent-within-slack pairs remain: same-cell
stacked lines whose one-line rewrap headroom touches the next line; text rects proven
non-colliding by the DOM audit), 0 bad fills, 0 theme styles, 0 leaks, brand fonts
only; stress slides screenshot-audited clean; tsc 0 errors; both containers rebuilt.
