---
id: brand/element-twins.md
title: Element Twins (GOLD element -> code twin -> Figma node)
type: brand
updated: 2026-06-10
chunks:
  - id: "brand/element-twins.md#c0"
    char_span: [0, 1672]
    sentence_count: 3
    key_terms: [rendercasestudy, casestudyslide, takeaway, element, case-study, four-block, gold, slidetostagehtml]
    token_count: 509
  - id: "brand/element-twins.md#c1"
    char_span: [1674, 1839]
    sentence_count: 1
    key_terms: [setboundvariableforpaint, figma, brand-token, collections, variable, literal, frames, fills]
    token_count: 45
---
# Element Twins

Every GOLD design-system element exists in three synchronized forms: the live Figma frame
(authoritative), the HTML preview twin (web.tsx, 960x540), and the export twin
(slideToStageHtml.ts, 1920x1080 stage consumed by /api/gold/export-pptx). When the
composer emits an artifact it must reproduce the element ANATOMY exactly; content changes,
geometry does not. NXT file `iSQhAVM7SI4QHAWB7y9C2z` · NU file `z2v9Pvhg23hlljEitPBdAt`.

| Element | Figma reference (NXT / NU) | Code twin |
|---|---|---|
| GOLD page shell (rail, dot mark, wordmark, kicker, action title, meta row, hairline, takeaway band) | any GOLD frame: 212:2 / 91:2 | web.tsx GoldFrame; slideToStageHtml buildShell |
| Case-study before-after (warn/cool wash panels, 3-5 bullets, arrow, RESULT + cited quote) | 212:2 / 91:2 | CaseStudySlide variant before-after; renderCaseStudy |
| Case-study evidence-stack (3-4 rows: bar + verbatim quote + SOURCE + WHAT IT SHOWS) | 217:2 / 93:2 | CaseStudySlide variant evidence-stack; renderCaseStudy |
| Case-study four-block (CHALLENGE/APPROACH/OUTCOME/LESSON bars + KEY OUTCOME panel) | 260:2 / 136:2 | CaseStudySlide default variant; renderCaseStudy |
| KEY OUTCOME dark panel (qualitative hero, stat pairs, quote + SOURCE) | 262:2 / 138:2 | four-block right aside; .fbpanel |
| Accent-bar content block (bar + mono label 152px + body text) | 261:4.. / 137:4.. | four-block .fbblk; web fourBlock blocks |
| Takeaway band (HUG height, ONE bold phrase, title face) | 212:68 / 91:68 | GoldFrame takeaway; .takeaway |
| Live token sheet (MCP-readable variable defs) | 223:2 / 97:2 | hic-workspace/design-system/figma-tokens.json; /api/design-tokens |

Fills in new Figma frames BIND to the brand-token variable collections (NXT 221:2,
NU 95:2) via setBoundVariableForPaint; never paste literal hex into a Figma fill.
