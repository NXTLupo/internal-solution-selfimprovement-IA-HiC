# Slide Templates + PPTX/PDF/PNG Export Fidelity Uplift (2026-06-01)

Goal (verbatim): audit/uplift #slide,#slides + pptx/pdf/png exports. (1) enough 16:9 stark-white
NXT slide templates to marry every hashtag deliverable, in the design system + a Figma slide-layout
tab; (2) NU brand restyled templates too; (3) pixel-accurate AND editable PPTX; (4) test it.

## Current state (audited)
- nxt-artifact-system.css has only 6 explicit slide templates: title, divider, quote, split, image,
  closing — plus generic modules (.nxt-grid/.nxt-card/.nxt-process/.nxt-compare/.nxt-table/
  .nxt-iconstat/.nxt-numlist). No explicit templates for case-study, TOC, persona, roadmap, PRD,
  org, themes, recommendations, bullets, infographic, content-with-image.
- proxy/nxt_slide_export.py: PPTX = `frames_to_pptx` builds EDITABLE text boxes BUT at HARDCODED
  y-offsets (y+=150 etc.) reconstructed from a fixed field set (kicker/title/body/numlist/cards/
  quote/iconstats/table). It is NOT pixel-accurate (a wrapping title collides with body) and it only
  knows that fixed field set (new templates render as blanks). PNG/PDF = true Chromium screenshots
  (already pixel-accurate). Endpoint: /api/artifact/export-slides {html|artifact_id, format}.
- Chromium (Playwright) is already installed in the proxy image.

## Architecture decision (the keystone)
Make PPTX MEASUREMENT-BASED. Extend the existing Playwright render to ALSO measure every text
element's getBoundingClientRect + computed font-size/weight/color/align relative to each .nxt-slide,
then place one editable PPTX text box per measured text node at the exact measured coordinates.
Consequences:
- Pixel-accurate (positions = real rendered geometry) AND editable (real text boxes, 0 pictures). (part 3)
- GENERIC over every template — any new CSS template exports correctly with NO per-template exporter
  code. So template variety (parts 1/2) and export fidelity (part 3) COMPOSE. (de-risks the whole goal)
- Reads COMPUTED colors, so NU brand exports correctly through the same path for free. (part 2)
- Falls back to the current offset-based exporter if measurement/Chromium unavailable.

## Workplan
A. Export fidelity (part 3): `measure_frames_playwright(html)` → per-frame text-run geometry; rewrite
   `frames_to_pptx(frames, out_path, html=None)` to build from measured runs when html is provided
   (else legacy fallback). Background-fill per slide from the frame's measured background color.
B. Template variety (part 1): add slide templates to nxt-artifact-system.css —
   case-study, toc, stat-bento/infographic (bars/donut/funnel as CSS), bullets, table, content+image,
   persona-card-slide, roadmap-horizons, prd-feature, org-chart, theme-spotlight, recommendation.
   Update `_slide_mode_contract` (proxy) + JM `_slide_layout_contract` so the model picks the right
   template per deliverable kind. Add them to public/nxt-design-gallery/style-guide.html (Slide Library tab).
C. NU brand (part 2): NU slide tokens (Huskies red + near-black, Spectral/Roboto) — already partly in
   nu-design-gallery; ensure the slide templates have NU variants and the measurement exporter picks
   up NU computed colors. Add an NU slide tab to the NU style guide.
D. Figma (part 1 sub): build the authoritative templates in code (source of truth that drives
   generation+export). Mirror to Figma via MCP IF quota allows (Starter quota was exhausted earlier
   this session); otherwise deliver the code design-system + style-guide tab and state the Figma-write
   constraint honestly. Do NOT claim a Figma file that wasn't written.
E. Test (part 4): generate a multi-template deck (one frame per template) for NXT and NU; run
   /api/artifact/export-slides pptx → assert editable (text boxes > 0, pictures == 0) AND measured
   positions match rendered geometry (no overlap, title not clipped); png/pdf → true render. Report
   numbers, not claims.

## Honest risks
- "Pixel-accurate AND editable" is the hard part; the measured-geometry approach is the correct
  resolution but multi-line wrapping in PPTX vs CSS can differ by a few px — acceptable; verify titles
  don't clip/overlap.
- Figma write is quota-limited; code design-system is the real deliverable that drives the product.
