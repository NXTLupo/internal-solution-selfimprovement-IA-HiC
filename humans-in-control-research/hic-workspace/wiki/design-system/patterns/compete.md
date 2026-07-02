---
id: design-system/patterns/compete.md
title: Pattern · compete (#compete)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/compete.md#c0"
    char_span: [0, 1338]
    sentence_count: 9
    key_terms: [mono, archivo, tokens, chat, ibm, nxt, plex, benchmark]
    concepts: [archivo, tokens, benchmark, deep-dive, variables]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 364
---
# compete pattern (#compete)

## Figma exemplars (source of truth)
NU page 43:159: base 43:2, repro 120:2, 02 benchmark deep-dive 170:2.
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). Matrix overview + benchmark deep-dive rows: NAMED entity, maturity dot-bar, what-they-actually-do, cited verbatim quote; leader row accent-barred.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.
