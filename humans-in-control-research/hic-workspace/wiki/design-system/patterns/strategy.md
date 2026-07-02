---
id: design-system/patterns/strategy.md
title: Pattern · strategy (#strategy)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/strategy.md#c0"
    char_span: [0, 1360]
    sentence_count: 9
    key_terms: [mono, archivo, action, tokens, chat, ibm, nxt, plex]
    concepts: [archivo, action, tokens, variables, strategy]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 368
---
# strategy pattern (#strategy)

## Figma exemplars (source of truth)
NU page 66:159: 01 kernel 66:2, principles repro 128:2, 02 action detail 176:2.
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). Rumelt kernel (diagnosis, guiding policy, coherent actions); action detail = WHY/WHAT/REINFORCES/FIRST MOVE blocks + GUARDRAILS panel with reversal trigger.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.
