---
id: design-system/patterns/blueprint.md
title: Pattern · blueprint (#blueprint)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/blueprint.md#c0"
    char_span: [0, 1397]
    sentence_count: 9
    key_terms: [mono, archivo, tokens, touchpoints, chat, ibm, nxt, plex]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 375
---
# blueprint pattern (#blueprint)

## Figma exemplars (source of truth)
NU page 57:159: base 57:2, T2 auto-layout substrate 162:2 (matrix 164:2).
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). Bitner 5-lane matrix (CUSTOMER ACTION / TOUCHPOINTS / FRONTSTAGE / BACKSTAGE / SUPPORT) with LINE OF VISIBILITY separator row above FRONTSTAGE; evidence lane is labeled TOUCHPOINTS, never Evidence.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.
