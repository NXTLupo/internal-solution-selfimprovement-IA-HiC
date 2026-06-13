# NU Giving deck uplift + slides design system (2026-06-11)

Goal: uplift NU_Giving_Findings_draft.pptx per the redesign spec
(NU_Giving_Findings_Redesign_Approach.md, the review-meeting RI synthesis),
codify the deck's slide patterns as dual-brand design-system exemplars
grounded in Figma node 113:2's slides page, and wire them into #slide/#slides
generation + self-improvement.

## Shipped

### 1. Figma slides pages (dual-brand, 23 frames built this pass)
- NU 'GOLD · slides (nu)' 103:2: 9 new archetypes alongside the 5 faithful
  repros: thesis 208:2, numbered-themes 208:14, evidence-table 208:48,
  diptych 209:2, org-model 209:25, role-needs G1 209:75, role-rec G2 210:2,
  role-roadmap G3 210:45, aggregate-roadmap 210:103.
- NXT 'GOLD · slides (nxt)' 324:2 (page created): full 14-frame twin set
  (325:2-328:141) with NXT tokens (Bebas headlines, chartreuse accent, cyan
  kickers on paper).
- All copy passed validate_ai_slop + validate_self_referential_freeform
  (exit 0) before build; every frame screenshot-audited in-call.

### 2. PPTX uplift -> Downloads/NU_Giving_Findings_UPLIFTED.pptx
- Pass 1 token scrub, all 112 slides: 1,271 font runs normalized
  (Aptos/Calibri/Arial->Archivo, Georgia/Fraunces->Lora, Courier->JetBrains
  Mono); reds C00000->C8102E; inks/grays collapsed to 141414/333333/666666;
  14 purple 7-point-star markers removed (defect D6).
- Pass 3 hotspot rebuilds, 15 slides as native editable shapes on the new
  archetypes: S7 themes, S9 thesis, S15 two-tier table, S34 diptych, S35 org
  model, S40/44/58 G1, S41/45/59 G2 (clears defect D1 overlap), S42/46/60
  G3, S66 aggregate roadmap. Farmer/Operator G1 challenge copy relocated
  from the deck's own S7/S8 theme material (re-arrangement per C1).
- Pass 2 re-sequence: S10 (framework validation), S21-S24 (duplicate
  competitive cluster D7), S38 ('v' D3), S47 (working notes D2) relocated
  to the ARCHIVE act; nothing deleted.
- QA: PowerPoint COM renders inspected across 4 iterations; fonts/colors
  whitelisted; purple=0; 112 slides intact.
- PPTX metrics rule: PowerPoint renders Archivo wider than the browser;
  line_spacing ~8% under design + wrap slack per slot; display numerals at
  line-height normal.

### 3. #slide/#slides wiring (one engine, 6 layers)
| Layer | File | Status |
|---|---|---|
| wiki read | brand/figma-node-map.md SLIDES SYSTEM section (re-chunked, 16 chunks) | shipped |
| manifest | chunk frontmatter via fixed chunker; manifest rebuild path validated earlier same day | shipped |
| skill/contract | corpusChatService slide protocol: SLIDE-SYSTEM VARIANTS block | shipped |
| render twins | slideToStageHtml.ts: 5 variant branches (thesis / diptych / rowsProse table / impactCards role-block / role-grid timeline); goldPreviews.tsx + web.tsx preview twins | shipped |
| types | types.ts: SectionDividerData.variant, PrinciplesData.variant, TimelineData.rows, CompetitiveMatrixData.rowsProse+patternLine, RecommendationData.impactCards | shipped |
| self-improvement | learned constraints [slides/slide-system-archetypes]; skillopt rerun pending with W5 | constraint shipped |

Verified: tsc clean, vitest 79/79, 62/62 dual-brand stages render, overflow
audit v3 CLEAN, vite build OK, Docker rebuild + browser smoke 0 console errors.

### 2b. v2 completion pass (2026-06-12, after spec-coverage audit)
The first pass implemented a subset and under-delivered the spine; v2 closed
the gaps: 4.1 vision thesis built from S3 and moved to position 2; 4.2 S4
re-headlined with the promoted INSIGHT line + insight band + transition
line; 4.3 S12 implication moved into a labeled band; 4.4 S14 rebuilt as four
uniform proof columns with org labels demoted; 4.6 S29 retitled to the point
and the dense matrix S27 demoted to ARCHIVE; 4.8 S36/S37 rebuilt on the
org-model three-column skeleton; 4.10 S48 demo rationale to ARCHIVE; full
spine re-sequence (S17/S18 into the recommendations act, quote spotlights
S50-S56 + S61-S65 to ARCHIVE, 21 relocations total, nothing deleted); 57
source lines unified to the fixed bottom-left position; violet lane colors
joined the scrub map; S29 PAIN POINTS label collision cleared. All rebuilt
slides render-verified via PowerPoint COM across 6 iterations.

## Open items (owner calls from the spec, NOT design defects)
- D4 duplicated theme copy S7-vs-S8 and the triplicated G2 baseline text:
  content defects flagged to Rob/Connor; locked-content rule.
- Campaign figure verification ($120M/2028): Rob.
- Vision-slide wording from the Diane quote bank (spec 4.1): Jonathan
  supplies; v2 built the archetype-B layout at position 2 carrying the
  locked 'March to 150' line until the quote-bank wording lands.
- Subway-map parallel build (spec 4.6 cand. B): sanctioned experiment, not
  started.
- skillopt batch rerun after this + W1-W3 feedback accumulates (W5).
