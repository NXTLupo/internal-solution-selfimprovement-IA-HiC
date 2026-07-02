---
id: design-system/patterns/case-study.md
title: Pattern · case-study (#case-study)
type: design-system
updated: 2026-06-10
chunks:
  - id: "design-system/patterns/case-study.md#c0"
    char_span: [0, 1615]
    sentence_count: 11
    key_terms: [mono, nxt, archivo, evidence-stack, tokens, before-after, chat, ibm]
    concepts: [evidence-stack, archivo, before-after, tokens, case-study]
    section: Figma exemplars (source of truth) / Anatomy / Construction rule (1-to-1 PPTX)
    token_count: 466
---
# case-study pattern (#case-study)

## Figma exemplars (source of truth)
NU page 81:159: 01 overview 81:2, 02 Zappos 82:2, 03 Amazon before-after 91:2, 04 Stripe evidence-stack 93:2, 05 Giving Day four-block 136:2, Clark repro 121:2. NXT page 184:159: 184:2, 190:2, 212:2, 217:2, 260:2.
Files: NU z2v9Pvhg23hlljEitPBdAt (tokens 97:2, variables 95:2) · NXT iSQhAVM7SI4QHAWB7y9C2z
(tokens 223:2, variables 221:2). See brand/figma-node-map for the master index.

## Anatomy
GOLD shell (92px rail, 3x3 dot mark, IBM Plex Mono kicker, action title in Lora Medium
(NU) / Archivo SemiBold (NXT), mono meta row, hairline, takeaway band). GOLD frame + variants four-block (CHALLENGE/APPROACH/OUTCOME/LESSON bars + KEY OUTCOME panel), before-after (warn/cool wash panels + RESULT + cited quote), evidence-stack (3-4 verbatim quote rows + WHAT IT SHOWS). NAMED real subjects only; diversify variants across a deck.

## Construction rule (1-to-1 PPTX)
The PPTX export of this artifact must be a fully native, editable twin of the Figma
exemplar: every rail, accent bar, wash panel, dot mark, and band is a real PPTX shape
with theme colors from /api/design-tokens (figma-tokens.json); text in brand fonts
(Lora/Archivo/IBM Plex Mono for NU; Archivo/Bebas/IBM Plex Mono for NXT). The AI chat
constructs slides from these tokens and the anatomy below, never from invented values.
Density axis: base|dense per DENSITY_SPEC (components/slideTemplates/types.ts).
Modification: analyst chat (#refine, #dense, variant directives) or designer chat
(Design Desk) regenerate against the same pattern; edits feed the self-improvement loop.
