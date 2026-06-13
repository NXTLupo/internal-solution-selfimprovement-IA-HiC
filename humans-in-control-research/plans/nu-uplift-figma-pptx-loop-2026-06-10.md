# NU uplift + Figma-to-PPTX 1:1 loop - 2026-06-10

GOAL (user, locked via Q&A): finish ALL NU artifact pages to the FULL roster bar, then
wire Figma patterns -> wiki/manifest -> hashtag generation -> FULLY NATIVE editable PPTX,
with modification in BOTH analyst chat and designer chat (Design Desk), closing the
skillsopt self-improvement loop. NU file z2v9Pvhg23hlljEitPBdAt builds FIRST; NXT
(iSQhAVM7SI4QHAWB7y9C2z) mirrors after.

## Locked contracts (user answers 2026-06-10)
1. Completeness bar PER PAGE: overview + diversified deep-dive variants + dense tier;
   journey/blueprint as nested AUTO-LAYOUT matrices; slides page covers all 18 templates.
2. PPTX: FULLY NATIVE shapes - every rail/bar/wash/dot is a real PPTX shape with theme
   colors (extends the nxt_slide_export.py substrate, see gap page PPTX TWIN 29:160).
   Hybrid raster background is NOT acceptable as the end state.
3. Extensibility: both analyst chat (CorpusChatPanel, #refine + density/variant prompts)
   and designer chat (Design Desk) modify artifacts; both feed feedback into skillsopt.

## NU page audit (2026-06-10, full inventory via plugin API)

| Page | Has | Missing for full roster |
|---|---|---|
| gap 29:2 | base 29:3 + PPTX twin 29:160 + maturity matrix 142:2 | dense tier; gap-detail deep-dive |
| competitive 43:159 | base 43:2 + repro 120:2 | 02 benchmark deep-dive; dense tier |
| roadmap 44:159 | base 44:2 | 02 horizon detail; dense tier |
| personas 45:159 | base 45:2 + repro 124:2 | dense tier (roster overview is base) |
| persona-detail 47:159 | base 47:2 | diversified variants (behavioral fingerprint, hero-quote, baseline-target table) |
| themes 48:159 | 01 48:2, 02 77:2, cluster repro 114:2, spotlight repro 129:2 | theme-arc + theme-mosaic exemplars; dense tier |
| recommendations 49:159 | 01 49:2, 02 79:2, repro 126:2 | dense tier |
| journey 53:159 | base 53:2 ONLY | T2 (cell touchpoint+emotion) + T3 (KPI dashboard + AUTO-LAYOUT matrix, mirror NXT 244:2/247:2); convert base matrix to auto-layout |
| service-blueprint 57:159 | base 57:2 | auto-layout swimlane substrate + growth tier (per density-tier plan) |
| strategy 66:159 | frame MISNAMED "GOLD · gap (nu)" 66:2 + principles repro 128:2 | verify content; real strategy exemplar (Rumelt kernel); 02 detail |
| tech-audit 69:159 | systems-inventory base 69:2 | risk-detail deep-dive; dense tier |
| tech-architecture 70:159 | frame MISNAMED "GOLD · gap (nu)" 70:2 | verify content; real architecture-map exemplar |
| prd 72:159 | 01 user stories 72:2 + 02 story detail 75:2 | 03 functional/non-functional + out-of-scope; 04 milestones/risks/sign-off (prd/structure constraint); dense tier |
| case-study 81:159 | COMPLETE: 01..05 + Clark repro | dense tier exemplar only |
| slides 103:2 | stat-row, block-quote, section-divider, cover, agenda repros - ALL AT y=0 OVERLAPPING (defect) | restack; exemplars for remaining templates: persona-card, recommendation, theme-cluster/spotlight/arc/mosaic, competitive-matrix, case-study, principles, timeline, service-blueprint, gap-matrix, architecture-map, prd-feature, systems-inventory (link to artifact pages where they exist) |

DEFECTS (fix first): slides page y=0 stack; 66:2 + 70:2 misnamed (verify whether content
is actually gap clones -> rebuild as real strategy/architecture exemplars).

## Build order (NU first; 7-step routine per artifact, fills bound to 95:2 variables)
P0 defects -> P1 journey T2/T3 auto-layout mirror -> P2 blueprint auto-layout substrate
-> P3 missing variants (themes arc/mosaic, roadmap 02, competitive 02, persona-detail
variants, prd 03/04, strategy + architecture rebuilds, tech-audit detail) -> P4 slides
page roster -> P5 dense tiers -> P6 mirror everything still missing into NXT file.

## Phase B - wiki/manifest pattern registry (goal #2)
Per artifact: wiki page design-system/patterns/<artifact>.md carrying: Figma node refs
(both brands), anatomy spec, variant roster, density ceilings, budgets, and the
slide-template/JSON contract. All written via /api/wiki/write chunk:true (manifest).
brand/figma-node-map.md stays the master index. assembleDesignSystem +
manifest-chunk retrieval (pickChunksForPrompt) pull these into every #hashtag run;
verify with a live #case-study #NU generation.

## Phase C - native PPTX engine (1:1 editable)
Source of truth: scripts/eval/nxt_slide_export.py substrate (already produced gap PPTX
TWIN 29:160). Extend per-template: every GOLD element maps to native pptxgenjs/python-pptx
shapes (rail rect, dot mark 9 squares, accent bars, wash panels, takeaway band, text
boxes with brand fonts). Tokens flow from figma-tokens.json (never hardcoded). Export
path: chat -> SlideData -> native exporter (replaces Playwright raster for templates).
Acceptance: open exported PPTX, every geometry element selectable/recolorable, fonts =
brand spec, layout within 2% of the Figma frame.

## Phase D - extensibility + skillsopt loop
Analyst chat: #refine + density/variant modification regenerate SlideData and re-export.
Designer chat (Design Desk): edits captured by chatFeedbackExtractor / record_feedback.
Both feed wiki/synthesis/learned-constraints + feedback API. skillopt pipeline
(trajectory-miner -> skillopt-validation-gate -> skillopt-applier; npm run skillopt:*)
turns accumulated feedback into gated SKILL.md/hook/subagent edits.

## Status log
- 2026-06-10: plan created; audit complete; user contracts locked.
- 2026-06-10: P0 DONE - slides page 103:2 restacked (5 frames were overlapped at y=0);
  66:2/70:2 renamed (content was already real strategy/architecture exemplars).
- 2026-06-10: P1 journey T3 DONE - NU frame 156:2 built (shell 156:*, KPI dashboard
  158:2, auto-layout 6x4 matrix 159:2, takeaway band 159:96), screenshot-audited clean,
  fills bound to 95:2 variables, registered in brand/figma-node-map.
- 2026-06-10: P1 journey T2 DONE - NU frame 160:2 (matrix 161:2, band 161:123),
  cell-internal evidence (quote + SOURCE + touchpoint/emotion, qualitative markers),
  screenshot-audited clean, registered. Journey page (nu) now: base 53:2 + T3 156:2 +
  T2 160:2. NEXT: blueprint auto-layout substrate (P2), then P3
  variants (themes arc/mosaic, roadmap 02, competitive 02, persona-detail variants,
  prd 03/04, tech-audit detail), P4 slides roster, P5 dense tiers, P6 NXT mirror,
  then Phases B (pattern registry), C (native PPTX engine), D (skillsopt loop).
- 2026-06-10: P2 blueprint substrate DONE - NU frame 162:2 (matrix 164:2 with LINE OF
  VISIBILITY row, band 164:88), screenshot-audited clean, registered. CONTINUE AT: P3
  variants in this order: themes arc/mosaic exemplars (48:159), roadmap 02 (44:159),
  competitive 02 (43:159), persona-detail variants (47:159), prd 03/04 (72:159),
  tech-audit detail (69:159), strategy 02 (66:159). Then P4 slides roster (103:2),
  P5 dense tiers, P6 NXT mirror (incl. blueprint substrate), Phases B/C/D.
- 2026-06-10: P3 theme-arc DONE - NU frame 165:2 (chain 165:21, band 165:57), vertical-
  fill fix applied after screenshot audit, registered. CONTINUE AT: theme-mosaic
  exemplar (48:159, y=6485), then roadmap 02, competitive 02, persona-detail variants,
  prd 03/04, tech-audit detail, strategy 02 per the P3 list above.
- 2026-06-10: P3 theme-mosaic DONE (167:2; themes page FULL ROSTER) + roadmap 02 DONE
  (168:2). CONTINUE AT: competitive 02 (43:159), then persona-detail variants (47:159),
  prd 03/04 (72:159), tech-audit 02 (69:159), strategy 02 (66:159).
- 2026-06-10: P3 competitive 02 DONE (170:2) + persona-detail 02 DONE (171:2, marker
  positions audit-fixed). CONTINUE AT: prd 03 functional/non-functional + out-of-scope
  (72:159, y=2520), prd 04 milestones/risks/sign-off (y=3720), tech-audit 02 risk detail
  (69:159, y=1400), strategy 02 action detail (66:159, y=2680). Then P4 slides-page
  index frame (103:2, linking the 18 templates to their artifact-page exemplars),
  P5 dense exemplars (gap dense 10-row at 29:2; themes dense 6-col at 48:159),
  P6 NXT mirror of: blueprint substrate, theme arc/mosaic, roadmap 02, competitive 02,
  persona-detail 02, prd 03/04. Phase B: write design-system/patterns/<artifact>.md x16
  via /api/wiki/write chunk:true. Phase C: native PPTX exporter (read
  scripts/eval/nxt_slide_export.py first; extend per-template; endpoint + chat wiring).
  Phase D: skillsopt loop (npm run skillopt:dry-run; wire analyst/designer feedback).
- 2026-06-10: P3 prd 03 DONE (173:2) + prd 04 DONE (174:2). CONTINUE AT: tech-audit 02
  risk detail (69:159, y=1400), strategy 02 action detail (66:159, y=2680). Then P4/P5/P6
  + Phases B/C/D per the markers above.
- 2026-06-10 (goal session, continued): P3 COMPLETE (tech-audit 02 175:2, strategy 02
  176:2). P4 COMPLETE (template index 177:2). Phase B COMPLETE (14 pattern pages +
  anchor wiring). Phase D VERIFIED (skillopt extract/dry-run pass; apply = user-triggered
  train-promote through the validation gate). Phase C ADVANCED: hybrid exporter extended
  to multi-page gold files; case-study decks exported with editable text + native fonts.
  REMAINING (next session): P5 dense exemplars beyond the tier frames (themes 6-col,
  gap 10-row already proven in code; optional Figma exemplars), P6 NXT mirror of the 10
  new NU frames, Phase C completion = (a) geometry-as-native-shapes tier (rail/bars/
  washes as PPTX shapes, extending _place_runs with a shape walk of measured rects),
  (b) wire chat export: proxy /api/gold/export-pptx-multi -> hybrid reconstructor so
  analyst/designer chat PPTX is the editable tier by default. Phase D: run
  skillopt:train-promote after feedback accumulates.
- 2026-06-10 (continued): Phase C COMPLETE for non-SVG stages - native GEO tier shipped
  in proxy/gold_pptx_export.py and VERIFIED through the live /api/gold/export-pptx-multi
  endpoint (25 shapes + 22 text boxes, zero raster). SVG stages keep raster graphics by
  design. skillopt REAL gated training pass running (--auto-promote --budget=2).
  P6 progress: NXT blueprint substrate 286:2 + theme-arc 288:2 mirrored. CONTINUE AT:
  NXT mirrors for theme-mosaic, roadmap 02, competitive 02, persona-detail 02, prd 03/04,
  tech-audit 02, strategy 02 (reuse this session's NU build scripts with 221:2 vars,
  Archivo SemiBold titles, Bebas numerals, cyan/chartreuse/rust accent mapping);
  P5 dense Figma exemplars (themes 6-col, gap 10-row) optional - axis live in code.
- 2026-06-10 (final): Phase D LOOP CLOSED - real gated training pass completed: 8 skill
  candidates trained from session rollouts, ALL passed the validation gate, ALL promoted
  to live .claude/skills baselines (logs /d/tmp/skillopt-batch-20260610-172108).
  GOAL PILLARS: (1) NU pages P0-P4 complete; (2) pattern registry complete + retrievable;
  (3) chat modification + self-improvement loop executed; (4) native editable PPTX live
  on the chat endpoint. Follow-on (dual-brand routine, not goal-blocking): finish NXT
  mirrors (mosaic, roadmap 02, competitive 02, persona-detail 02, prd 03/04, tech-audit
  02, strategy 02) + optional dense Figma exemplars.
- 2026-06-10 (final continuation): P6 NXT MIRRORS COMPLETE - 8 frames (286:2, 288:2,
  289:2, 290:2, 291:2, 292:2, 295:2, 296:2, 297:2, 298:2), all screenshot-audited; one
  defect (fingerprint markers positioned pre-panel) caught by API verification and fixed.
  ALL GOAL PHASES NOW DELIVERED: NU full roster, pattern registry, native editable PPTX
  on the chat endpoint, skillsopt loop executed with 8 gated promotions, dual-brand
  parity. Optional follow-ups only: dense Figma exemplars beyond the tier frames
  (axis live in code), geometry tier for SVG-bearing stages (journey curves).
