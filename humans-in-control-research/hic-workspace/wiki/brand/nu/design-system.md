---
id: brand/nu/design-system.md
title: Northeastern Design System (deliverable artifacts)
type: brand
updated: 2026-06-10
chunks:
  - id: "brand/nu/design-system.md#c0"
    char_span: [0, 263]
    sentence_count: 3
    key_terms: [z2v9pvhg23hlljeitpbdat, brand, design-tokens, northeastern, collection, university, variable, runtime]
    token_count: 78
  - id: "brand/nu/design-system.md#c1"
    char_span: [280, 627]
    sentence_count: 1
    key_terms: [c8102e, accent, ffffff, cool, wash, accent-bright, band-text, sparingly]
    section: Color tokens
    token_count: 144
  - id: "brand/nu/design-system.md#c2"
    char_span: [643, 2343]
    sentence_count: 6
    key_terms: [source, lora, red, medium, mono, takeaway, design-system, quote]
    section: "Font roles / Dimensions / GOLD anatomy (every artifact page) / Case-study deep-dive variants (diversify, never repeat one) / Where the implementations live"
    token_count: 427
  - id: "brand/nu/design-system.md#c3"
    char_span: [2395, 2844]
    sentence_count: 2
    key_terms: [artifact, anatomy, hashtag, pattern, page, recommendations, design-system, constructing]
    section: Pattern pages (per-hashtag construction specs)
    token_count: 107
---
# Northeastern University Design System

Source of truth: live Figma file `z2v9Pvhg23hlljEitPBdAt` (token node 97:2, variable
collection NU Brand Tokens 95:2). Runtime mirror: `/api/design-tokens?brand=NU`.
Use these EXACT values; never invent hex codes or fonts.

## Color tokens
rail #0E1626 (navy) · ink #16233C · accent (Huskies red, used sparingly) #C8102E ·
accent-bright #D41B2C · gold (rare premium accent) #A4804A · source (cool teal) #1D6E64 ·
paper #FFFFFF · ecru #F2F1EA · grey #73757A · hairline #DDDDD6 · kicker #C8102E ·
warn #C8102E / wash #FAEDED · cool #1D6E64 / wash #EDF7F5 · band #16233C / band-text #FFFFFF

## Font roles
title (h1 + takeaway): Lora Medium (serif editorial signature) · body: Archivo Regular ·
numerals: Lora Medium · kicker / meta / labels / SOURCE lines: IBM Plex Mono
(SemiBold labels, Medium meta). Geometry is identical to NXT; only tokens change.

## Dimensions
PPTX/stage canvas 1920x1080 STRICT (never overflow) · web preview 960x540 (same grid / 2) ·
rail 92 · contentLeft 172 · contentWidth 1660 · marginRight 80 · top 58 ·
takeaway band x172 y944 w1568 minH 96 (HUG when text wraps) · radius 0 · no shadows

## GOLD anatomy (every artifact page)
92px navy rail + 3x3 red dot mark (12px squares, gap 6, at 30/990) + red N logogram
top-right + IBM Plex Mono kicker 19px/6px tracking in red + action-title 46px Lora Medium +
mono meta row 14px + hairline + navy takeaway band (white Lora). Sources appear as inline
SOURCE: lines in source-teal mono, never as a per-slide source strip.

## Case-study deep-dive variants (diversify, never repeat one)
four-block (CHALLENGE red / APPROACH ink-on-ecru / OUTCOME source-teal / LESSON gold
accent-bar blocks + KEY OUTCOME navy panel: qualitative hero in Lora, 3 stat pairs in
accent-bright, verbatim quote with named SOURCE) · before-after (red/teal wash panels,
3-5 bullets each, arrow, RESULT + cited quote) · evidence-stack (3-4 rows: teal bar +
verbatim quote + SOURCE + WHAT IT SHOWS). Numbers only inside cited quotes (Quantitative
Claim Rule). Subjects are NAMED real entities.

## Where the implementations live
web preview twin components/slideTemplates/web.tsx (GoldFrame + CaseStudySlide) ·
export twin services/slideToStageHtml.ts · gold fill targets
wiki/design-system/gold/case-study-nu.html · full spec design-system/gold-visual-language.

## Pattern pages (per-hashtag construction specs)
Every hashtag artifact has a pattern page at design-system/patterns/<slug>.md carrying
its Figma exemplar node refs, anatomy, variants, and the 1-to-1 native-PPTX rule:
case-study, journey, blueprint, themes, personas, recommendations, gap, compete,
roadmap, strategy, prd, audit, arch, slides. Pull the matching pattern page (manifest
chunks resolve it) before constructing any #hashtag artifact, and construct ONLY from
its anatomy + these tokens.
