---
id: design-system/patterns/executive-brief.md
title: Pattern · executive-brief (#brief / #explainer / #report slide twins)
type: design-system
updated: 2026-06-13
chunks:
  - id: "design-system/patterns/executive-brief.md#c0"
    char_span: [0, 1803]
    sentence_count: 11
    key_terms: [gold, brief, font, executive-brief, slide, cards, explainer, hero]
    section: What it is / Figma / tokens / Anatomy (3 variants)
    token_count: 473
  - id: "design-system/patterns/executive-brief.md#c1"
    char_span: [1840, 2241]
    sentence_count: 4
    key_terms: [dense, base, chat, pptx, self-improvement, executive-brief, design-tokens, modification]
    section: Construction rule (1-to-1 PPTX)
    token_count: 102
  - id: "design-system/patterns/executive-brief.md#c2"
    char_span: [2285, 2876]
    sentence_count: 4
    key_terms: [slide, executive-brief, explainer, variant, report, exportexecutivebrief, renderexecutivebrief, executivebriefslide]
    section: Runtime template contract (2026-06-13)
    token_count: 157
---
# executive-brief pattern (#brief / #explainer / #report GOLD slide twins)

## What it is
ONE GOLD slide template with THREE variants, the slide twin of the long-form HTML
deliverables. Bare #brief/#explainer/#report still produce the HTML document
(html-deliverable-composer / strategic-report-writer); adding #slide/#slides emits
this GOLD slide instead. Both forms ground via manifest-chunk retrieval.

## Figma / tokens
GOLD exemplar frames built 2026-06-13, FULLY variable-bound: NXT 366:2 ("GOLD ·
executive-brief (nxt) · 01 brief", file iSQhAVM7SI4QHAWB7y9C2z) and NU 294:2 ("GOLD ·
executive-brief (nu) · 01 brief", file z2v9Pvhg23hlljEitPBdAt, page 'GOLD · recommendation
dense (nu)'). Every fill binds to a color/* variable; every text binds fontFamily to a font/*
variable. NXT: font/display=Saira Condensed (hero), font/heading=Archivo (title/cards),
font/body=Archivo, font/mono=IBM Plex Mono (NXT Brand Tokens 221:2). NU: single-typeface Lato
across font/display+heading+body+mono (NU Brand Tokens 95:2), weight = hierarchy. Registered
in brand/figma-node-map. Geometry is brand-invariant; the skin rides entirely on the token
variables, so a token edit reflows both brands.

## Anatomy (3 variants)
- brief: optional HERO callout (one dominant qualitative finding + ecru panel, accent
  left border) + a 2-column grid of FINDING cards (heading, 1-3 sentence body, optional
  cited verbatim quote with cool-accent left border + named source).
- explainer: NO hero. Numbered concept-step cards (renderer numbers them 01..N in the
  accent color) + a GOTCHAS strip at the bottom (warn-accent left border, severity-flagged
  pitfalls).
- report: HERO + a grid of exec-summary KEY-FINDING cards (same card anatomy as brief).
All three close with the navy/dark takeaway band carrying keyInsight.

## Construction rule (1-to-1 PPTX)
The PPTX export is a native, editable twin: every panel, accent bar, card, and band is a
real PPTX shape with theme colors from /api/design-tokens; text in brand fonts. CSS grid /
flex only. Density axis base|dense per DENSITY_SPEC (executive-brief: 4 sections base /
6 dense). Modification via analyst chat (#refine, #dense, variant directives) or designer
chat; edits feed the self-improvement loop.

## Runtime template contract (2026-06-13)
`#brief #slide` / `#explainer #slide` / `#report #slide` generate
`:::slide template=executive-brief` (ExecutiveBriefData in components/slideTemplates/types.ts):
{variant, subject, hero?, sections[], gotchas?, keyInsight}. The model sets variant from the
hashtag. Twins: web.tsx ExecutiveBriefSlide (960x540 preview), slideToStageHtml.ts
renderExecutiveBrief (1920x1080 export), pptx.ts exportExecutiveBrief (fallback). Routed via
corpusChatService ARTIFACT_TPL (#brief/#explainer/#report -> executive-brief) with the
CorpusChatPanel HTML gate deferring to slide-mode when #slide is present.
