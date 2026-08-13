---
id: design-system/exemplar-manifest.md
title: Hashtag-deliverable exemplar manifest (Figma canon + anatomy contracts)
type: design-system
updated: 2026-08-07
---

# EXEMPLAR MANIFEST - hashtag deliverables

THE CONTRACT (injected into BOTH chat desks before any hashtag deliverable generates): every
`#hashtag` artifact is COMPOSED against its exemplar below - the Figma canon in file
`EOWX9FhPtdoP05udKTxN94` (NXT-HiC-Design-System) - using the named decomposed components and
their anatomy fields. Generation that invents structure outside the exemplar anatomy is a gate
violation (deckPlanGate / schema validation / D4 spine). NU brand = mode flip on the same nodes.
All exemplars are flat auto-layout shapes + text: PPTX export stays natively editable.

## THE GRID (Law 11 - binding on every 1920x1080 surface)
Native 12-column grid: column 120, gutter 20, left margin 172, right margin 88, content zone
1660, baseline 4. Grid values are `grid/*` Figma variables (grid/titleY 140, grid/contentY 260,
grid/bandY 930-944, grid/footerY 1004-1012, grid/rowGap 20, grid/sectionGap 40). Columns and
matrix cells span whole grid columns; matrices fill 1660 edge to edge (journey: label 260 +
5 x 260 at 20 gutters; blueprint: label 260 + 4 x 330).

## THE TYPE RAMP (Law 11 - closed set, variable-bound, larger by default)
kicker: IBM Plex Mono SemiBold 17/+5px, cyan, UPPERCASE, ONE per artifact (eyebrows banned) ·
hero title: Saira Condensed SemiBold 120 · interior titles: Saira 66 UPPERCASE · dek/lead:
Archivo Regular 32/150 · BODY: Archivo Medium 28/140 (the default reading tier; body under 20
is a violation) · dense-matrix cells ONLY: Archivo Medium 20/132 · labels: Archivo Medium
20/+1.5 UPPERCASE · meta: mono 15 · micro: mono SemiBold 15/+3 · takeaway band: Archivo
SemiBold 28/134 on-accent. Every size binds a `type/*` variable - no off-ramp px sizes.

## THE IMAGERY CONTRACT (Law 12 - every img-slot, every deliverable)
Every img-slot in the exemplars below is FILLED with an exemplar image showing the required
treatment. When generating, emit ONE GENERATE instruction per img-slot using this EXACT shape:

  GENERATE: [style] - [subject, one plain clause] - DERIVED FROM: [the deliverable field this
  image depicts, quoted or tightly restated] - SOURCE ANALYSIS: [the named field: theme
  insight / journey phase pain / persona behavior / recommendation action + its cited source]

Binding rules:
1. DERIVED FROM is MANDATORY and must quote or tightly restate a REAL field in this
   deliverable's payload (the theme's insight sentence, the phase's evidenced pain, the
   persona's behavior sentence, the recommendation's action). A topic word alone ("healthcare",
   "support") is a violation; the image depicts the FINDING, not the industry.
2. If the field carries a verbatim corpus quote, the image depicts the situation in the quote
   (the quote's scene, not its emotion).
3. Style by slot kind: line = journey/blueprint phase strips + concept marks (transparent,
   brand accent, no text) · photo-background = covers (full-bleed, ~12% opacity under text on
   light canon, ~28% on dark) · photo-portrait = persona heroes (research-evidenced
   demographics only, neutral background, natural light) · photo-scene = lifestyle/behavior
   strips (one evidenced behavior each, no readable faces, no embedded text).
4. REUSE FIRST (cost rule, owner-set 2026-08-07): before generating, query the illustration
   catalog (GET /api/ai/illustrations?tag=...) for an existing content-matching image; the
   runtime lane `/api/ai/illustration` also reuses by exact concept id. Generate only when no
   catalog image depicts the finding.
5. Never stock, never decorative, never an abstract filler unrelated to the analysis, never an
   empty slot in a shipped artifact (empty slot = gate violation; untraceable concept = Law 6
   provenance violation).

## #slides (deck)
- EXEMPLAR topic cover: `16:7` - full-bleed dark; `DS/LogoMark 16:2` (wordmark, Saira Condensed
  600); cover-bg `DS/ImageSlot 16:4` (rect named `img-slot`, content-true topic image filled at
  runtime, ~28% opacity under text); kicker; title header (display tier); audience line.
- Deck body archetypes: the `slides:` registry (see slides-component-manifest.md) - diagram
  bricks canon: quadrant `4:2`, ranked-bars `4:29`, flow-arc `5:9`, milestone-timeline `5:42`,
  means-matters `6:15`, comparison-panels `6:32`. Chrome: `DS/SlideFrame 3:124`.
- COMPONENTS: DS/Kicker `3:108` · DS/TakeawayBand `3:113` · DS/StatTile `3:115` ·
  DS/SourceLine `3:111` · DS/LogoMark `16:2` · DS/ImageSlot `16:4`.

## #themes
- COMPONENT: `DS/ThemeCard 17:43`, variants Layout=Spotlight `17:2` / Half `17:13` / Third
  `17:24` / Quarter `17:35`. Anatomy (ThemeClusterData): dominance pill (DOMINANT filled /
  RECURRING hairline) + mood word; theme name (action-title voice); insight sentence; verbatim
  evidence quote + NAMED source (mandatory except Quarter); SIGNAL tag (named entity or
  quote-carried figure only).
- EXEMPLARS: spotlight 1-up `17:44` · 2-up `17:63` · 3-up `17:94` · 4-up + pattern-signal
  takeaway band `17:136`. Layout choice = theme count; never repeat one card layout as filler.

## #personas
- COMPONENTS: `DS/PersonaIdentity 18:2` (hero portrait `img-slot` 356x420 - GENERATED
  photorealistic editorial portrait derived from research-evidenced demographics + behaviors,
  neutral background, no text; name at display tier; role; descriptor strip; demographics
  sentence; bottom-pinned RELATIONSHIP STAKES) · `DS/TraitPanel 18:30`, variants Kind=Goals /
  Behaviors / PainPoints / WinConditions (each >=1 verbatim cited quote; items are evidenced
  sentences at body-21).
- EXEMPLAR dense card: `18:31` - identity column + ecru blockquote hero quote + LIFESTYLE
  IMAGERY STRIP (3 img-slots, each scene visualizing ONE evidenced behavior; the GENERATE
  prompt quotes the behavior it renders; muted duotone, no readable faces, no text) + 2x2
  trait quadrant. IMAGERY IS MANDATORY: an image-free persona fails unless the corpus
  evidences no behavior; never decorative fills. Story/bio + JTBD live in the identity column;
  never fabricate demographics.

## #arch
- COMPONENT: `DS/ArchNode 19:17`, variants Type=Web / Service / System / Database / API
  (border color = type identification only). Name is per-instance data.
- EXEMPLAR layered map: `19:18` - EXPERIENCE / APPLICATION / DATA / INTEGRATION layer rows
  (label rail + node chips; grid = collision-free, no connectors through nodes), FLOW summary
  band, source line. Layers/nodes mirror ArchitectureMapData; PPTX-editable flat shapes.

## #journey
- COMPONENTS: `DS/StageHeader 20:6` (Critical=True rust for AT MOST 1-2 phases) ·
  `DS/JourneyCell 20:17`, variants Kind=Task / Pain (stackable, evidenced + named source) /
  Opportunity / Persona (JTBD voice) / NotEngaged (greyed).
- EXEMPLAR swimlane matrix: `20:18` - phases header row; PERSONAS JTBD row (arc-ordered);
  actor lanes (tasks; channels named inside task lines); PAIN POINTS stack row; OPPORTUNITIES
  row; KEY INSIGHT takeaway band. Mirrors JourneyMapData; #journey NEVER renders as a
  blueprint (standing rule).

## #blueprint
- EXEMPLAR bitner: `21:2` - stages header (critical variants); TOUCHPOINTS lane (never
  labeled "Evidence"); CUSTOMER ACTION; FRONTSTAGE; LINE OF VISIBILITY divider; BACKSTAGE;
  SUPPORT; FAIL POINTS row (evidenced, named source). Composes DS/StageHeader + DS/JourneyCell.

## #competitive
- EXEMPLAR matrix: `23:2` - NAMED subjects only (real companies/products), one axis set:
  positioning / capability depth / price posture / the gap they expose; client row washed
  cool; hairline row dividers; named analyst sources.

## #gap
- EXEMPLAR maturity matrix: `22:2` - capability rows: 5-segment maturity track (filled teal =
  current, pale band to outlined step = target), severity tag (critical/high/medium/low
  color-coded), legend line. Mirrors GapMatrixData (1-5 scale).

## #recs
- EXEMPLAR recommendation: `24:2` - framing tag (DEFENSIBLE CONSENSUS accent / NON-OBVIOUS BET
  cyan); action title; persona-moment meta line (mono micro - NEVER a second label above the
  title; the kicker is the only top label); EVIDENCE strip (2-3 verbatim cited quotes,
  accent-left-bordered); numbered SUPPORTING ACTIONS; impact grid (BASELINE / TARGET /
  TIMEFRAME / OWNER - qualitative or quote-carried, never naked numbers); IMPLICATION line.
  Mirrors RecommendationData.

## #roadmap
- EXEMPLAR horizons: `25:2` - NOW (accent) / NEXT (teal) / LATER (rail) columns; dot rows
  "item: the problem it solves and its named owner"; sequencing takeaway band.

## Usage rules (enforced)
0c. CLAIM DISCIPLINE (2026-08-13, Kaleynik/OpenScholar audit): a citation must support the
   ACTUAL WORDING of its claim (same population, period, comparison, causal strength) -
   narrow the sentence, never widen the citation. Citations repeating one original = ONE
   source; CONVERGENT requires independent originals. Unsupported factual claims do not
   earn prose: state only supported facts, derivations, and defensible inferences;
   hypotheses ship only as explicitly framed bets; unknowns narrow the section. Empty
   benefit phrases ("improve efficiency", "greater flexibility") are replaced by the
   mechanism or cut.
0b. SEMANTIC COHERENCE (2026-08-09, languagejones audit): zero metaphor by default; any
   image must be physically enactable in one frame (nothing "overarching" also
   "undergirds"; you cannot "point a toolkit at a problem"); never mix frames in a
   sentence pair; verbs keep literal objects. No assistant-voice validation ("sure
   thing", "great question", "and that matters"); no "quietly reshaping"/"amid a year
   of" scene setters; no conceptual "buckets".
0. THE ACTOR RULE (anti-slop): every user-visible sentence names its actor (a team, system,
   person, or audience - abstract nouns never act, dramatic verbs never substitute for the
   mechanism) and passes the read-aloud test (a real person would say it; no broken grammar,
   no buzzwords in the wrong part of speech, no word-salad). BAD: "Engagement leaks at three
   stages advancement cannot see." GOOD: "Alumni drop off at three stages the advancement
   team cannot see."
1. CONSULT FIRST: the generating agent reads this manifest section for the requested hashtag
   BEFORE composing; the anatomy fields above are the payload contract.
2. Tokens only (Law 1); compose from the named components (Law 2); numbers only inside cited
   quotes (Law 4); named sources always (Law 5); img-slots content-true or none.
3. Changes to any exemplar/component walk the D4 gate spine (G0 spec -> G1 sandbox+lint ->
   G2 persona judge -> G3 owner review -> G4 promote+re-chunk THIS manifest -> G5 renderer
   twins + coverage ledger). SkillOpt/epoch improvements touching deliverable skills re-run
   the L2 regression obligations before promotion.
