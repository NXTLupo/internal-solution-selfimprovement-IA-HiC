---
id: design-system/journey-map-in-table-anatomy.md
title: Journey Map GOLD anatomy - the matrix IS the slide body (2026-06-12 redesign)
type: design-system
updated: 2026-06-12
chunks:
  - id: "design-system/journey-map-in-table-anatomy.md#c0"
    char_span: [0, 314]
    sentence_count: 3
    key_terms: [journey, matrix, slide, table, body, opportunities, user-directed, actor-lane]
    concepts: [journey, matrix, slide, table]
    token_count: 75
  - id: "design-system/journey-map-in-table-anatomy.md#c1"
    char_span: [347, 1882]
    sentence_count: 12
    key_terms: [phase, row, accent, distribute, cell, mono, opportunities, qualitative]
    concepts: [phase, distribute, accent, opportunities, qualitative]
    related_chunks: ["design-system/journey-map-in-table-anatomy.md#c2"]
    section: Row anatomy (top to bottom)
    token_count: 382
  - id: "design-system/journey-map-in-table-anatomy.md#c2"
    char_span: [1940, 2333]
    sentence_count: 3
    key_terms: [opportunities, phase, overallpainpoints, item, count-adaptive, full-payload, chronology, generating]
    concepts: [opportunities, phase]
    related_chunks: ["design-system/journey-map-in-table-anatomy.md#c1"]
    section: Arc-ordering contract (load-bearing for generation)
    token_count: 92
  - id: "design-system/journey-map-in-table-anatomy.md#c3"
    char_span: [2365, 2860]
    sentence_count: 1
    key_terms: [slidetemplates, components, corpuschatservice, renderjourneymap, slidetostagehtml, journeymapslide, string-or-array, journeymapdata]
    concepts: [slidetemplates, components]
    section: Code twins (keep in sync)
    token_count: 131
  - id: "design-system/journey-map-in-table-anatomy.md#c4"
    char_span: [2903, 3335]
    sentence_count: 4
    key_terms: [cells, generation-side, opportunities, summarization, attributions, over-budget, keyinsight, fragments]
    concepts: [cells]
    section: No-truncation contract (2026-06-12)
    token_count: 99
---
# Journey Map GOLD anatomy - the matrix IS the slide body

User-directed redesign (2026-06-12): the actor-lane journey matrix fills the
ENTIRE slide body. Personas, pain points, and strategic opportunities live
INSIDE the table context. Nothing - no dashboard columns, no KPI tile strip -
sits on top of the table.

## Row anatomy (top to bottom)

1. PHASE HEADER ROW: ink-filled cells (critical phase = warn accent fill, mark
   at most 1-2). When kpiTiles exist (max 3), each tile EMBEDS inside its
   phase header cell under the phase name: small mono accent label plus a
   qualitative hero word in the title face (Lora for NU, Archivo SemiBold for
   NXT). Tiles are arc-distributed: first tile to the first phase, last tile
   to the final phase.
2. PERSONAS VOICE ROW: anchor cell PERSONAS with mono subline JTBD voice.
   Persona one-liners are ORDERED BY JOURNEY ARC and distribute start to end
   across the phase columns, rendered as italic quotes on a pale wash.
3. ACTOR LANES (3 base, 4 dense): anchor cell carries actor name plus mono
   role; cells align to phases; not engaged renders greyed italic.
4. PAIN POINTS ROW (warn accent top border): each phase cell holds a STACKED
   list of AT LEAST THREE evidenced pains (square warn markers), per the
   2026-06-12 user rule. painPoints[i] accepts a string array per phase;
   overallPainPoints distribute by arc and append into the per-phase stacks.
   Never pad to reach three - every pain must be evidenced with a named source.
5. OPPORTUNITIES ROW (cool accent top border): strategic opportunities,
   ordered by arc, distribute start to end; square cool markers; each written
   to address the phase it lands on.

The takeaway band below the matrix carries keyInsight (structural cost in
qualitative language). Masthead: kicker JOURNEY MAP plus journeyType, action
title, mono meta row (SCOPE / ACTORS / PHASES).

## Arc-ordering contract (load-bearing for generation)

The renderer places personas, overallPainPoints, opportunities, and kpiTiles
into phase columns BY ARRAY POSITION: item 1 lands on the first phase, the
last item on the final phase. The generating model must order these arrays to
match the journey chronology. Full-payload runs (voice + 3-pain stacks +
opportunities) trigger count-adaptive type so the matrix never overflows the
1080px stage.

## Code twins (keep in sync)

- components/slideTemplates/web.tsx JourneyMapSlide (960x540 preview)
- services/slideToStageHtml.ts renderJourneyMap (1920x1080 export stage)
- components/slideTemplates/types.ts JourneyMapData (painPoints: per-phase
  string-or-array union)
- corpusChatService.ts SLIDE OUTPUT PROTOCOL journey-map block (the Fable 5
  generation contract)
- Figma GOLD journey pages (NU 53:159 / 156:2, NXT 75:2): REBUILD PENDING to
  this anatomy as nested auto-layout (absolute x/y matrix cells are banned).



## No-truncation contract (2026-06-12)
Every cell carries a COMPLETE thought. Field budgets (generation-side summarization targets): lane cells <=100 chars, pain items <=80 (quote fragments allowed, no inline attributions), persona voice <=95, opportunities <=80, kpiTile value 1-2 words, keyInsight <=200. Renderers never emit ellipses; over-budget text ends at a clause boundary. The Figma GOLD frames model full-text cells - any frame copy ending in '...' is a defect.
