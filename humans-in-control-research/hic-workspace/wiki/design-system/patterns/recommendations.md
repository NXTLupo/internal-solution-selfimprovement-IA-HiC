---
id: design-system/patterns/recommendations.md
title: Pattern · recommendations (#recommendations)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/recommendations.md#c0"
    char_span: [0, 1361]
    sentence_count: 9
    key_terms: [mono, recommendations, archivo, tokens, chat, ibm, nxt, plex]
    concepts: [recommendations, archivo, tokens, variables, pattern]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 356
---
# recommendations pattern (#recommendations)

## Figma exemplars (source of truth)
NU page 49:159: 01 overview 49:2, 02 detail 79:2, repro 126:2.
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). Action-title recommendation with supporting actions, evidence quotes, projected-impact grid (baseline/target/timeframe/owner); numbers only inside cited quotes.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.
