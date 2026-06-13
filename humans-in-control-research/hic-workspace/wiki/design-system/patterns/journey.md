---
id: design-system/patterns/journey.md
title: Pattern · journey (#journey)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/journey.md#c0"
    char_span: [0, 1629]
    sentence_count: 11
    key_terms: [matrix, mono, nxt, archivo, tokens, base, chat, ibm]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 460
  - id: "design-system/patterns/journey.md#c1"
    char_span: [1673, 2335]
    sentence_count: 3
    key_terms: [stages, journey-map, blueprint, journey, lanes, service-blueprint, exportjourneymap, renderjourneymap]
    section: Runtime template contract (2026-06-11)
    token_count: 184
---
# journey pattern (#journey)

## Figma exemplars (source of truth)
NU page 53:159: base 53:2, T2 cell-evidence 160:2 (matrix 161:2), T3 KPI+matrix 156:2 (matrix 159:2). NXT page 75:2: base 75:3, T2 244:2, T3 247:2 (matrix 267:2).
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). AUTO-LAYOUT matrix substrate: vertical stack of horizontal rows (158px label + FILL cells); phase headers ink with one critical-phase accent; pain row; T2 adds per-cell verbatim quote + SOURCE + touchpoint/emotion (qualitative); T3 adds KPI dashboard (personas / pains / opportunities + 3 KPI tiles). Add a phase or lane and the matrix reflows.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.

## Runtime template contract (2026-06-11)
`#journey` generates `:::slide template=journey-map` (JourneyMapData in
components/slideTemplates/types.ts): stages x ACTOR lanes with at most 1-2
critical stages accented, "not engaged" greyed cells, PAIN POINTS row,
optional personas/pains/opportunities dashboard, up to 3 QUALITATIVE KPI
tiles, keyInsight takeaway band. Twins: web.tsx JourneyMapSlide (960x540
GoldFrame preview), slideToStageHtml.ts renderJourneyMap (1920x1080 export
stage), pptx.ts exportJourneyMap (legacy fallback). #journey is NEVER the
Bitner blueprint; #blueprint owns service-blueprint (frontstage/backstage).
Density: 5 stages x 3 lanes base, 6 x 4 dense (DENSITY_SPEC journey-map).
