---
id: brand/nxt/design-system.md
title: NXT Humans Design System (deliverable artifacts)
type: brand
updated: 2026-06-10
chunks:
  - id: "brand/nxt/design-system.md#c0"
    char_span: [0, 254]
    sentence_count: 3
    key_terms: [nxt, isqhavm7si4qhawb7y9c2z, brand, design-tokens, collection, variable, runtime, design]
    concepts: [brand]
    token_count: 79
  - id: "brand/nxt/design-system.md#c1"
    char_span: [271, 583]
    sentence_count: 1
    key_terms: [b8b800, cc6644, wash, chartreuse, band-text, hairline, success, accent]
    concepts: [b8b800, cc6644]
    section: Color tokens
    token_count: 143
  - id: "brand/nxt/design-system.md#c2"
    char_span: [599, 2689]
    sentence_count: 6
    key_terms: [source, design-system, mono, semibold, takeaway, archivo, quote, cyan]
    concepts: [source, design-system, semibold, takeaway, archivo]
    section: "Font roles / Dimensions / GOLD anatomy (every artifact page) / Case-study deep-dive variants (diversify, never repeat one) / Where the implementations live / Pattern pages (per-hashtag construction specs)"
    token_count: 506
    sources: [{"n":"lines in cyan mono, never as a per-slide source strip.","u":""}]
---
# NXT Humans Design System

Source of truth: live Figma file `iSQhAVM7SI4QHAWB7y9C2z` (token node 223:2, variable
collection NXT Brand Tokens 221:2). Runtime mirror: `/api/design-tokens?brand=NXT`.
Use these EXACT values; never invent hex codes or fonts.

## Color tokens
rail #0D0D0D · ink #141414 · accent (chartreuse) #B8B800 · cyan #00B7C3 · rust #CC6644 ·
teal #115054 · success #0CCE6B · error #FF5A5A · paper #FFFFFF · ecru #F2F1EA ·
grey #73757A · hairline #DDDDD6 · kicker #00B7C3 · warn #CC6644 / wash #FAF1EC ·
cool #00B7C3 / wash #EBF7F8 · band #B8B800 / band-text #0D0D0D

## Font roles
title (h1 + takeaway): Archivo SemiBold · body: Archivo Regular · numerals: Bebas Neue ·
kicker / meta / labels / SOURCE lines: IBM Plex Mono (SemiBold labels, Medium meta)

## Dimensions
PPTX/stage canvas 1920x1080 STRICT (never overflow) · web preview 960x540 (same grid / 2) ·
rail 92 · contentLeft 172 · contentWidth 1660 · marginRight 80 · top 58 ·
takeaway band x172 y944 w1568 minH 96 (HUG when text wraps) · radius 0 · no shadows

## GOLD anatomy (every artifact page)
92px rail + 3x3 dot mark (12px squares, gap 6, at 30/990, accent) + wordmark top-right +
IBM Plex Mono kicker 19px/6px tracking + action-title 46px Archivo SemiBold +
mono meta row 14px + hairline + takeaway band with ONE bold phrase. Sources appear as
inline SOURCE: lines in cyan mono, never as a per-slide source strip.

## Case-study deep-dive variants (diversify, never repeat one)
four-block (CHALLENGE rust / APPROACH ink-on-ecru / OUTCOME cyan / LESSON chartreuse
accent-bar blocks + KEY OUTCOME teal panel: qualitative hero, 3 stat pairs, verbatim quote
with named SOURCE) · before-after (warn/cool wash panels, 3-5 bullets each, arrow, RESULT +
cited quote) · evidence-stack (3-4 rows: cyan bar + verbatim quote + SOURCE + WHAT IT SHOWS).
Numbers only inside cited quotes (Quantitative Claim Rule). Subjects are NAMED real entities.

## Where the implementations live
web preview twin components/slideTemplates/web.tsx (GoldFrame + CaseStudySlide) ·
export twin services/slideToStageHtml.ts · gold fill targets
wiki/design-system/gold/case-study-nxt.html · full spec design-system/gold-visual-language.

## Pattern pages (per-hashtag construction specs)
Every hashtag artifact has a pattern page at design-system/patterns/<slug>.md carrying
its Figma exemplar node refs, anatomy, variants, and the 1-to-1 native-PPTX rule:
case-study, journey, blueprint, themes, personas, recommendations, gap, compete,
roadmap, strategy, prd, audit, arch, slides. Pull the matching pattern page (manifest
chunks resolve it) before constructing any #hashtag artifact, and construct ONLY from
its anatomy + these tokens.
