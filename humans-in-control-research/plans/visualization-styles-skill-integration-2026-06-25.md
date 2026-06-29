# Visualization styles as unified-vision skills — analysis + integration design (2026-06-25)

> Inputs: `nxt-slot-illustrator` (SKILL.md + engine.js + variants.json + gallery.html). Analyzed the
> code directly + rendered 8 families. Goal: make these selectable, content-true visualization options
> for the Analyst Desk + Designer chats, referenced via skills / Figma / tokens / the wiki manifest so
> visuals stay CONSISTENT across combined decks and are 100% relevant to adjacent content at hashtag-
> generation runtime. VS = verbalized sampling (candidates + probabilities + commit). RI = confidence +
> verify-before-build. DESIGN + a proven stark-white increment; broader wiring is the next gated step.

## 1. What this system actually is (analysis)
NOT 12 styles — ONE coherent visual SYSTEM ("plate" aesthetic) across 12 CONTENT families:
- **The plate (the style):** flat vector, hairlines, dot grid, corner ticks, ONE accent focal + cyan
  structural + rust friction (sparingly), NO `<text>` in the art (the deck type carries words; text-free
  SVG imports to Figma without fonts), deterministic per `spec.data.seed`.
- **The 12 families (the content):** operatingNetwork, capabilityStack, maturityRadar, funnelFlow,
  journeyLine, dataField, comparisonMatrix, instrumentDial, timelineGantt, flowSchematic,
  proportionStack, sectionMark. `pickFamily(headingText)` routes an unseen slide; `renderVariant(spec,w,h)`
  is deterministic SVG sized to the slot.
- **Why it is the vision-correct DATA-VIZ answer:** it is the P3 doctrine made real — deterministic,
  token-lockable VECTOR (not raster AI image-gen), so it is anti-slop by construction, collision-safe,
  zero AI cost/latency, and CONTENT-TRUE (the visual IS a faithful diagram of *this* maturity vector /
  funnel / journey, which is the anti-slop mechanism). It COMPLEMENTS, not replaces, the emotive
  flat-vector illustrator (Nano Banana) — route by surface: relational/data -> this engine; emotive/hero
  (cover, persona emblem) -> the illustrator.

## 2. The one vision gap — and the stark-white proof
`engine.js` hardcodes an NXT-dark palette (`NXT` const: ground #0D0D0D, accent #B8B800, cyan #00B7C3…).
That VIOLATES never-hardcode and is single-brand/single-ground. **Fix: the palette is a THEME param =
brand (NXT|NU) × ground (dark|light), token-derived from `/api/design-tokens`.** PROVEN this session:
parameterized the engine (`PAL` per render) and rendered all families in **NXT stark-white**, **NU
stark-white**, and NXT-dark. Stark white reads cleanly (white ground, ink/teal structure, one
brand-accent focal fill — chartreuse for NXT, red for NU). So the deliverable answer to "we need a
stark white variant too" is: **ground=light is a theme, not a fork** — same engine, token palette.
- **Ground must MATCH the host surface (content-relevance extended to contrast):** a viz on a DARK slide
  interstitial uses ground=dark; a viz on a LIGHT GOLD/paper artifact uses ground=light (stark white).
  The existing img-slot metadata already carries `imgGround: dark|light` — that drives the theme choice.

## 3. VS — how these become selectable options + how they're referenced (k=6)
| # | Candidate | p | Verdict |
|---|---|---|---|
| C1 | Bake the 100 variants as static images into Figma placeholders | .28 (modal) | REJECT — static, stale, NOT content-true at runtime, dup-heavy; violates "100% relevant at runtime" |
| C2 | **Adopt as a SANCTIONED SKILL** (`.claude/skills/nxt-slot-illustrator/`) = the single render authority both chats invoke at runtime; palette tokenized (brand×ground) | .20 | **COMMIT (core)** — skills are vision-sanctioned, deterministic, content-true, brand-tokenized, no AI cost; one authority => consistency |
| C3 | **Wiki-manifest FAMILY CATALOG + routing contract** (manifest-chunked) the model retrieves at runtime to pick the family (anti-RAG grounding) + the cross-engagement "which family fits this content" memory | .16 | **COMMIT** — manifest is the selection brain + keeps catalog consistent across compiled decks |
| C4 | **Figma carries ONE representative exemplar per family × theme** on a "Visualization Families" page (the design CANON of what each looks like), mirrored into figma-node-map registry; runtime art is engine-rendered into the img-slot | .14 | **COMMIT** — Figma = canon reference; registry = contract; engine = runtime (never live-Figma) |
| C5 | **Palette as theme from `/api/design-tokens` (brand×ground)** consumed by the engine | .12 | **COMMIT (required)** — the never-hardcode fix; enables NU + the stark-white ground (proven) |
| C6 | Per-`#deliverable` explicit STYLE/family override (e.g. `#viz=radar`, a chat style chip) | .06 | ADOPT (optional UX) — explicit selection on top of content-driven default |

**Committed = C2+C3+C4+C5 (+C6 optional):** the skill is the authority; the manifest is the catalog +
router memory; Figma holds representative exemplars (canon) per family×theme; the palette is a
token-derived theme; the runtime art lands in the EXISTING img-slot carriers and exports as a real
picture (P2, shipped this session).

## 4. The "selectable options" model
- **Options surface = 12 content families × 2 grounds × 2 brands**, but the user/model rarely picks the
  family by hand — it is CONTENT-DRIVEN: `pickFamily(heading)` + a deliverable->family map (#gap->
  maturityRadar, #journey->journeyLine, #roadmap->timelineGantt, #competitive->comparisonMatrix,
  #arch->flowSchematic, #org->operatingNetwork, stat/KPI->instrumentDial, composition->proportionStack,
  findings->dataField, divider->sectionMark, capability->capabilityStack, funnel->funnelFlow).
- **Ground/brand auto-resolve:** brand from the run (#NXT|#NU); ground from the slot's `imgGround` (dark
  slide vs light GOLD page).
- **Explicit override (C6):** Analyst/Designer chat can pin a family/ground when it wants a specific viz.
- So both chats "select from" the families — implicitly via routing (default) or explicitly (override).

## 5. Consistency across COMBINED / compiled decks (the hard requirement)
Guaranteed by four converging mechanisms: (a) ONE skill authority both chats call -> identical renderer;
(b) deterministic per `seed` -> stable re-renders; (c) the THEME from tokens -> every viz in a deck
shares brand×ground; (d) the wiki-manifest catalog -> the same family is chosen for the same content
type across engagements. Net: a deck (or a set of artifacts compiled together) reads as one designed
set, because every plate shares the aesthetic + palette and each is the same family for the same content.

## 6. 100%-content-relevance at runtime (the other hard requirement)
`variants.json` (the 100 specs) are EXEMPLARS/SEEDS, NOT the runtime data. At hashtag-generation runtime
the family's `spec.data` is built FROM THE DELIVERABLE'S REAL PAYLOAD — the maturity scores the model
just produced, the funnel stages, the journey friction indices, the gantt tracks, the comparison cells.
The visual is therefore a faithful diagram of THIS content (the anti-slop mechanism), sitting adjacent to
the prose that describes the same data. The manifest supplies the family choice; the deliverable payload
supplies the numbers.

## 7. RI — confidence + verify-before-build
- **overallConfidence: HIGH** on the doctrine + the tokenization (the stark-white theme is rendered &
  proven this session), **MED** on the runtime payload->spec.data mapping per family.
- Verify before broad build: (a) each target deliverable payload carries the data its family needs
  (gap=maturity scores, journey=friction, roadmap=tracks, competitive=cells, stat=value) — map explicitly,
  fall back to `operatingNetwork`/`dataField` when thin; (b) the visual router gains a STYLE dimension
  (data-viz-engine vs emotive-illustrator vs none) keyed by surface; (c) the img-slot `imgGround` ->
  theme ground wiring; (d) gate: render each family in NXT/NU × dark/light, confirm legible + content-true
  + exports as a picture (P2).

## 8. Bounded first implementation (next, gated)
1. **Land the skill** `.claude/skills/nxt-slot-illustrator/` = the parameterized (themed) engine +
   variants + SKILL.md, with the palette read from `/api/design-tokens?brand=` + ground flag (the
   proven theme matrix; no hardcoded hex).
2. **Wire it as the DATA-VIZ option in the visual router** (alongside the emotive illustrator): for a
   data/relational slot, pickFamily -> build spec.data from the deliverable payload -> renderVariant
   with the slot's theme -> write the SVG into the slot carrier (heroImage/phaseImages/panelImage, the
   carriers shipped this session) -> renders in preview + exports as a real picture (P2).
3. **Manifest catalog**: a manifest-chunked `visualization-families` page (the 12 families + routing +
   payload contract) the model retrieves to pick + ground the family.
4. **Figma**: one representative exemplar per family × theme on a "Visualization Families" page,
   registered in figma-node-map (canon reference; runtime art is engine-rendered).
Gate per step: tsc/vitest, render NXT/NU × dark/light, export-as-picture check. Nothing built in the
runtime path yet beyond the proven themed engine; this section is the plan.

## 9. PROGRAM EXPANSION (2026-06-25, user-directed) — per-industry few-shot library × ALL artifacts
Three directives expanded scope: (1) not 100 total but **100 patterns PER industry** (11 industries =
1,100); (2) a **separate Figma set of pages** carrying them as **few-shot examples** for any hashtag
deliverable with an image slot; (3) **× relevance to ALL strategic artifact types** — so each pattern
carries an artifact mapping AND every artifact LAYOUT in Figma gets revised/recomponentized/tokenized to
host the viz slot, with wiki chunking + registry re-mapping.

**Vision reconciliation (load-bearing):** "100 static patterns baked into Figma" = the REJECTED C1 only
if treated as runtime output. As **few-shot exemplars** it is compliant: Figma = the teaching set (canon,
tokenized, componentized); manifest = the index/router; **runtime art stays engine-rendered from the
deliverable's REAL payload via vizEngine.ts** (never inject the exemplar as the image). Keeps
never-hardcode + content-true + anti-RAG intact.

**Locked decisions:** Figma granularity = 12 family COMPONENTS + 1,100 INSTANCE exemplars (each with its
spec in setSharedPluginData); rollout = all 11 industries in one pass; data spine built first (reversible).

**DONE (this session, reversible, gated):**
- `services/vizEngine.ts` runtime renderer (buildVizTheme brand×ground from tokens / renderVizFamily /
  pickVizFamily) + 30 tests; tsc 0, vitest 297, all 4 themes visually verified.
- Sanctioned skill `.claude/skills/nxt-slot-illustrator/` (SKILL.md, engine.js mirror, gallery.html).
- **Data spine:** `variants.json` = 1,100 specs (11 industries × 100 = 12 families × ~8-9 real
  frameworks: BCG/GE-McKinsey/Porter/Ansoff/value-chain/7S/AARRR/JTBD/RACI/maturity…), each tagged
  industry + framework + `artifacts[]`; `variants/by-industry/{industry}.json` (11 Figma-page units);
  `artifact-audit.json` (family↔artifact matrix, 18 artifact types). All 4,400 renders (1,100 × 4 themes)
  validated clean (no NaN/undefined/text).

**REMAINING (tasks #8-#13, sequenced; #8-#10 are the heavy outward Figma writes):**
8. 12 tokenized family components in Figma (NXT 221:0 / NU 535:0 mode-flip).
9. 11 industry pages × 100 instance exemplars + plugin-data specs (1,100 instances).
10. Revise EVERY artifact layout (slides archetypes + GOLD pages + HTML artifacts) to host the viz image
    slot per the audit; recomponentize + tokenize.
11. Manifest: `visualization-families` contract page (8-field) + `visualization-patterns-by-industry`
    index (chunked) [blocked by 9].
12. Registry: (industry × artifact × slot) → patterns + Figma node ids in figma-node-map/registry.json
    [blocked by 9,10].
13. Runtime wiring: few-shot retrieval → vizEngine render into slot carriers → preview + PPTX picture
    [blocked by 11,12].
Gate each phase: tsc/vitest, render NXT/NU × dark/light, Figma screenshot review, export-as-picture.
