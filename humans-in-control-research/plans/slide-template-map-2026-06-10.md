
## VARIANT PLACEMENT RULE (user, 2026-06-10) + build coverage
RULE: a slide-template variant that CORRELATES to a GOLD artifact lives ON that artifact's GOLD
page (as an added slide-variant frame beside the existing gold frames). Deck-FURNITURE variants
(no dedicated deliverable page) live on the "GOLD · slides (nu)" page (103:2).

FURNITURE -> slides page 103:2 (NU):
  [DONE] cover 118:2 | stat-row 107:2 | block-quote 111:2 | section-divider 113:2
  [TODO] agenda/TOC (s2)
ARTIFACT-CORRELATED -> build on the deliverable's NU gold page:
  [DONE] theme-cluster -> themes 48:159 (frame 114:2, moved there)
  [TODO] theme-spotlight (s31) -> themes 48:159
  [DONE] competitive -> competitive 43:159 (frame 120:2)
  [DONE] case-study -> case-study 81:159 (frame 121:2, Clark, 4-block+panel)
  [DONE] persona-card -> personas 45:159 (frame 124:2, The Recurring Donor)
  [TODO] recommendation (s54/86) -> recommendations 49:159
  [TODO] principles (s99) -> strategy 66:159
  [TODO] service-blueprint (s95) -> service-blueprint 57:159
  [TODO] journey (s94-96) -> journey 53:159
  [TODO] org (s92) -> (org page if exists; else NXT org 16/NU equivalent)
  [TODO] gap-matrix -> gap 29:159 | architecture-map (s19/98) -> tech-architecture 70:159
  [TODO] systems-inventory -> tech-audit 69:159 | prd-feature -> prd 72:159
  [TODO] timeline/roadmap -> roadmap 44:159
METHOD (locked): extract slide+master geometry; FONT px = source pt x2 (144dpi); place at exact
coords; literal source colors; Archivo (Aptos N/A) / Lora for serif marks (Georgia N/A); screenshot
+ collision audit each. Then mirror NXT + register figma-node-map + manifest + self-improvement.

## SESSION PROGRESS 2026-06-10 (8 variants built + audited, faithful repro of NU_Giving deck)
slides page 103:2: cover 118:2, stat-row 107:2, block-quote 111:2, section-divider 113:2
artifact pages: theme-cluster 114:2 (themes 48:159), competitive 120:2 (43:159), case-study 121:2 (81:159), persona-card 124:2 (45:159)
QUEUED (geometry cached in /d/tmp/nu_slides_geom.json - build with NO re-extraction):
  [DONE] recommendation -> recommendations 49:159 (frame 126:2)
  [DONE] principles -> strategy 66:159 (frame 128:2)
  [DONE] theme-spotlight -> themes 48:159 (frame 129:2)
DEFERRED (very dense / divider-only source): service-blueprint (s95, 139 shapes) -> 57:159;
  journey (s96, 197 shapes) -> 53:159 (both already have rich gold frames); org (s92 divider) -> need s93;
  architecture (s98 divider) -> need s100; agenda (s2) -> slides; gap/systems-inventory/prd/timeline (no clean deck source -> build from gold twins).
METHOD LOCKED: extract slide+master geometry; font px = pt*2 (144dpi); exact coords; literal source colors;
  Archivo (Aptos N/A), Lora for serif marks (Georgia N/A); screenshot+collision audit each.
NEXT: dual-brand mirror to NXT file (iSQhAVM7SI4QHAWB7y9C2z) once NU set complete; register figma-node-map + manifest + self-improvement (Tasks 17-18).

## PASS 3 (2026-06-10): agenda done -> 12 variants total. Remaining are DENSE DIAGRAMS.
DONE this pass: agenda 131:2 (slides page).
SESSION TOTAL 12 faithful audited variants:
  slides 103:2: cover 118:2, stat-row 107:2, block-quote 111:2, section-divider 113:2, agenda 131:2
  themes 48:159: theme-cluster 114:2, theme-spotlight 129:2
  competitive 43:159: 120:2 | case-study 81:159: 121:2 | personas 45:159: 124:2
  recommendations 49:159: 126:2 | strategy 66:159: 128:2
REMAINING = DENSE VECTOR DIAGRAMS (NOT efficient to reproduce node-by-node by hand):
  org (s93, 193 shapes) | architecture (s100, 172 shapes) | service-blueprint (s95, 139) |
  journey (s96, 197). journey + service-blueprint pages ALREADY carry rich gold frames.
  Recommend: dedicated focused build per diagram OR image-reference import (cannot render pptx
  here -- no soffice; diagrams are vector not raster, so no easy image extract). geom for org/arch
  cached in /d/tmp/nu_slides_geom2.json.
NO DECK SOURCE (build from gold twins, not the deck): gap-matrix, systems-inventory, prd-feature, timeline.
NEXT after diagrams: dual-brand mirror NU->NXT; register figma-node-map + manifest + self-improvement (Tasks 17-18).

## PASS 4 (2026-06-10): "no deck source" 4 resolved.
gap: BUILT NU gap 142:2 on page 29:2 (4-col maturity matrix mirrored from NXT 62:3, NU tokens; number-wrap fixed). Audited clean.
prd: ALREADY EXISTS (72:2 user-stories + 75:2 story-detail on prd page 72:159).
timeline/roadmap: ALREADY EXISTS (44:2 on roadmap page 44:159).
systems-inventory/tech-audit: ALREADY EXISTS (69:2 on tech-audit page 69:159) - relabeled from mistaken 'GOLD · gap (nu)'.
NOTE page-id correction: NU gap PAGE = 29:2 (not 29:159); :159-suffix ids are competitive 43:159, roadmap 44:159, personas 45:159, etc.
REMAINING (only the 4 dense diagrams): org (s93, 193 shapes), architecture (s100, 172), service-blueprint (s95, 139), journey (s96, 197). journey+blueprint already have rich gold frames; org/architecture would be focused node-heavy builds.
NEXT: dual-brand NXT mirror of the NU variants built this session; register figma-node-map + manifest + self-improvement (Tasks 17-18).
