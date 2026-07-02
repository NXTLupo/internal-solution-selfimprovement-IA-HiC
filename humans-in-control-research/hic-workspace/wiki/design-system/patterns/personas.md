---
id: design-system/patterns/personas.md
title: Pattern · personas (#persona)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/personas.md#c0"
    char_span: [0, 1459]
    sentence_count: 10
    key_terms: [mono, archivo, tokens, fingerprint, chat, ibm, nxt, plex]
    concepts: [archivo, tokens, fingerprint, behavioral, variables]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 381
---
# personas pattern (#persona)

## Figma exemplars (source of truth)
NU pages 45:159 (overview 45:2, repro 124:2) and 47:159 (detail 47:2, behavioral fingerprint 171:2).
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). Overview roster + detail deep-dives with DIVERSIFIED layouts: behavioral fingerprint (5 spectrum tracks with position markers; red marker = relationship-breaking dimension), hero-quote, JTBD panel. JTBD-first, never demographics-first.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.
