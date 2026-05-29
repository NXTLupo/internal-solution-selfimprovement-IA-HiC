# Preview-vs-Export Parity: Audit + Improvement Plan (2026-05-29)

> Why in-app artifact previews diverge from exported PPTX/PDF/PNG (fonts, layout, wrapping,
> alignment) across all ~18 hashtag artifact types — and how to fix it, mapped to the
> "AI-Powered, PowerPoint-Native, Anti-Slop Brand Slide Generation" recipe (May 2026 whitepaper).
> Every claim below verified against source with file:line by two independent forensic audits.

---

## 0. The one-line root cause

**There are FIVE independent rendering engines and FOUR conflicting brand-token definitions
re-interpreting the same content. No artifact type is rendered by one engine for both preview
and every export. Divergence is therefore the DEFAULT state, not a bug.** Font drift, text
wrapping, alignment, and "weird layout" are all symptoms of this one structural fact — the exact
fact the whitepaper opens with: *"the correct architecture is generate a brand-perfect .pptx
server-side, then hand it over or inject it"* — i.e. ONE source of truth, not five.

---

## 1. The five rendering engines (verified)

| # | Engine | Tech | Used for | Coordinate model |
|---|---|---|---|---|
| **E1** | ResultsView inline HTML deck | React + Tailwind, archetype-keyed (`ResultsView.tsx:1050+`) | Main strategy-deck PREVIEW | CSS auto-flow |
| **E2** | `exportService.exportPPTX` | pptxgenjs (client) | Main deck PPTX | fixed inch boxes, `estimateTextHeight` @ 1.7 chars/em (`:72`) |
| **E3** | `slideTemplates/web.tsx` | React inline-style, 18 templates | `#slide` template PREVIEW | CSS flex, 960×540 |
| **E4** | `slideTemplates/pptx.ts` | pptxgenjs (client) | `#slide` template PPTX | fixed inch boxes, `estH` @ 0.50pt/72 (`:246`) |
| **E5a** | html2canvas | raster | PDF/PNG of E1 | re-lays-out live DOM |
| **E5b** | html-to-image + `domToPptx.ts` → proxy `pptx_export.py` | raster + server OOXML | Design Desk freeform PNG/PDF + PPTX | computed-style DOM walk |
| **E6** | `presentationToPptx.ts` | pptxgenjs (client) | `#presentation` PPTX | fixed inch boxes, own palette |

**Two artifact universes that share no renderers:**
- **Universe 1 (main deck):** preview = E1, PPTX = **E2**, PDF/PNG = E5a. E1 and E2 are wholly separate codebases keyed on the same archetype enum. **E2 even renders in the wrong typeface — `Helvetica Neue`/`Arial` (`exportService.ts:44-45`), never Archivo/Bebas.** This is the single largest divergence: PPTX ≠ preview ≠ PDF.
- **Universe 2 (Design Desk `#hashtag`):** the ~13 freeform kinds preview as **server HTML in an iframe** (real fonts), export PNG/PDF via **html-to-image with `skipFonts:true`** (fonts stripped), and export PPTX via **`domToPptx` re-interpreting the DOM** into primitives. One artifact diverges three ways at once.

---

## 2. Font handling — three uncoordinated surfaces (verified)

| Surface | Fonts | Verdict |
|---|---|---|
| HTML preview (E1/E3, iframe) | Bebas Neue/Archivo/JetBrains via Google Fonts `<link>` (`index.html:11`, `proxy/app.py:3425`) | OK |
| pptxgenjs (E2/E4/E6) | **No font embedding at all** (pptxgenjs has no API). E2 hardcodes Arial. E4 resolves brand face names via `fontForRole` but the binary isn't embedded. | **Recipient without the font sees fallback = brand break + reflow** |
| html2canvas (E5a) | Waits `document.fonts.ready` (`ResultsView.tsx:547`) — but only on the deck tab; persona/journey/tech/roadmap branches (`:744,:771,:808`) do NOT | Partial |
| html-to-image (E5b) | **`skipFonts:true` + strips every `<link>`** (`artifactExporter.ts:64,83-87`) to dodge a cross-origin `cssRules` SecurityError → **fonts deliberately discarded, fallback rasterized** | **Worst font divergence in Design Desk** |
| proxy `pptx_export.py` | The ONLY path that **embeds** font binaries (EOT-wrapped, `:178`) — sophisticated — **but embeds the WRONG set: Archivo/Fraunces/Inter/JetBrains, missing Bebas Neue (NXT) + Spectral (NU)** (`:58`) | Embeds, but wrong faces |

Net: against the whitepaper's mandate ("embed fonts; verify on a font-less machine"), HiC embeds fonts on exactly one path, that path isn't used by the main deck, and it embeds the wrong typefaces.

---

## 3. Brand tokens — FOUR conflicting definitions (verified)

No single token contract. Four independent, non-identical sources:
1. `slideTemplates/types.ts:364` `TOKENS` (closest to canonical; shared by E3+E4).
2. `exportService.ts:16` `BRAND` (Path E2; `Helvetica Neue`/`Arial`, `textPrimary:1A1A1A`).
3. `presentationToPptx.ts:26` `NXT`/`NU` (Path E6; NU = violet-on-cream `6E54E0`/`FAF8F4`).
4. `brands.ts:62` `nuBrand` (the REAL NU: Huskies-red `C8102E`, Spectral) — **contradicts #3's violet NU**.

The whitepaper's anti-slop contract is built on a SINGLE `brand.tokens.json` the renderer "will ever use." HiC has four, and they disagree on NU's core color and on body/display faces.

---

## 4. The wrapping/layout divergence mechanism (verified)

- **pptxgenjs paths use fixed-height boxes with truncation**; line counts come from character-width *estimates* (`pptx.ts estH` @ `pt*0.50/72` `:246`; `exportService` @ `1.7 chars/em` `:75`) — two different metrics, neither matching the real font shaper. Renderers hard-stop emitting at band floors (`recommendation BODY_BOTTOM=5.95 :466`, `persona MAX_Y=6.95 :241`) and hard-truncate (`truncate`/`smartQuoteClip`/`wordSafeCut`).
- **HTML preview uses real CSS reflow** (`display:flex`, `lineHeight`, `textOverflow:ellipsis`).
- The two wrap engines disagree whenever the estimate is off. pptx.ts's own comments cite the symptoms: the `CHALLENG/E` mid-word break (`:212`) and the recommendation band-overlap rewrite (`:348-368`).
- `domToPptx` (E5b) inflates text frames by guesswork to fight PowerPoint's text inset (`padX = max(8, rect.width*0.1)` `:965`; SVG width `*0.5` `:823`) and approximates units (`px*0.75*0.6667` `:42`) → pptxgenjs re-wraps inside a guessed frame with a possibly-different font.

---

## 5. The QA gap (verified, corrects prior assumptions)

- The **`export-paint-sync` skill, `export-render-verifier` subagent, and `pre_export_dom_audit` hook DO NOT EXIST as files** — they are referenced only in prose (comments, plan docs, documentation.html). Their function (fonts-ready + image-decode + double-rAF) is hand-inlined in `ResultsView`/`SlideCanvas`, with no shared `waitForExportReady()` contract and no `body[data-export-mode]` CSS chokepoint actually consumed.
- **No vision-QA / render-verification loop exists in any export path.** The only post-render check is `isCanvasBlank()` (a single-color-ratio heuristic, PDF only). The whitepaper's "render → vision model scores → auto-fix" loop (its single biggest anti-slop lever) is entirely absent.

---

## 6. Top 8 root causes, ranked

1. **Universe-1 main deck: E1 preview vs E2 PPTX are different codebases; E2 uses Arial, not brand fonts.** Highest-impact, most-used. (`exportService.ts:44-45,98-587`)
2. **html-to-image strips all fonts (`skipFonts:true`)** on the entire Design Desk export universe → fallback fonts rasterized. (`artifactExporter.ts:64`)
3. **No font embedding on any client pptxgenjs path**; the one embedding path embeds the wrong faces. (`pptx_export.py:58`)
4. **Four conflicting brand-token definitions** (NU color/fonts contradict across files).
5. **Fixed-box char-estimate wrapping vs real CSS reflow** — structural line-break divergence.
6. **`domToPptx` re-interprets the DOM with guessed frame padding + unit approximation.**
7. **html2canvas geometry/font lock only on the deck tab**, not persona/journey/tech/roadmap branches.
8. **No vision-QA loop and no shared paint-ready contract** — divergence ships unverified.

---

## 7. Improvement plan (mapped to the whitepaper)

The whitepaper's thesis is HiC's fix: **one server-side render = source of truth; embed fonts;
single token contract; vision-QA loop.** Crucially, **HiC already has ~80% of this** — but in the
`domToPptx → pptx_export.py` DOM-walker path that the main deck does NOT use. The walker reads the
*actual rendered, font-loaded, reflowed truth* instead of re-deriving it, which is exactly why it's
the right convergence target.

### Phase 1 — Single brand-token contract (1-2 days, foundational)
- Create one `brand.tokens.json` (the whitepaper's contract): colors {bg `0D0D0D`, ink `FFFFFF`,
  accent1 `B8B800`, accent2 `00B7C3`, muted `8A8A8A`} + NU set + faces {display Bebas Neue / NU
  Spectral, body Archivo / NU Roboto, mono JetBrains} + type scale with `spc` tracking tokens.
- Make `TOKENS`, `exportService.BRAND`, `presentationToPptx.NXT/NU`, `brands.ts` all DERIVE from it.
  Delete the conflicting NU-violet definition. This alone kills cause #4 and de-risks every other fix.

### Phase 2 — Fix the font-embed path + point the main deck at it (3-4 days, highest leverage)
- Correct `pptx_export.py FONT_FAMILIES` to the REAL faces: **Bebas Neue + Spectral + Archivo +
  Roboto + JetBrains Mono** (drop Fraunces/Inter). (`pptx_export.py:58`)
- **Route the main strategy-deck export through the server DOM-walker path** (E5b) instead of the
  legacy Arial-only `exportPPTX` (E2). The walker captures the real E1 render → one engine for
  preview and PPTX. Retire E2.
- This simultaneously closes causes #1 (dual-render), #3 (font embed), #5 (fixed-box wrap), #6
  (the walker reads real geometry, no more guessing) for the main deck.

### Phase 3 — Fix html-to-image font stripping (2 days)
- Replace `skipFonts:true` with **base64 `@font-face` data-URIs inlined into the iframe** (no
  cross-origin `<link>` → no `cssRules` SecurityError → fonts survive rasterization). OR render
  PNG/PDF from the same DOM-walker → server (one raster path too). Kills cause #2.

### Phase 4 — Consolidate to ONE export engine (1 week)
- Retire E2, E4-as-separate, E6. Everything (main deck, `#slide` templates, freeform, presentation)
  exports through the DOM-walker → `pptx_export.py` (PPTX) and a single server raster (PDF/PNG).
- Net: 5 engines → effectively 2 (HTML render for preview + capture; server OOXML/raster for export
  off the SAME rendered DOM). This is the whitepaper's "one source of truth."

### Phase 5 — Vision-QA loop (3-4 days) — the whitepaper's biggest anti-slop lever
- After export: headless-render each slide to PNG (fonts installed via fontconfig, whitepaper A.3),
  send PNG + brand spec to a vision model (Opus 4.8 / Gemini 3.1 Pro) with the whitepaper's critique
  schema (overflow / off-grid / off-brand-color / wrong-font / gradient-shadow / centered-drift),
  apply `block` fixes, re-render, max 3 passes. Actually CREATE the `export-render-verifier` that's
  currently only referenced in prose.

### Phase 6 — charSpacing + OOXML correctness as tokens (2 days)
- Encode tracking as brand tokens (h1 +2pt, h2 +1.5pt, kicker +3pt) applied deterministically on
  BOTH preview (CSS `letter-spacing`) and export (OOXML `spc`, 1/100 pt) from the SAME source.
- Adopt `pptx_export.py`'s OOXML correctness layer (empty `<a:ln><a:noFill/>`, effect suppression,
  `spc` from computed style) platform-wide; the client pptxgenjs paths lack it.

---

## 8. Sequencing & the single highest-leverage move

| Phase | Theme | Effort | Closes causes |
|---|---|---|---|
| 1 | One token contract | 1-2d | #4 |
| 2 | Fix embed faces + route main deck through DOM-walker | 3-4d | #1 #3 #5 #6 |
| 3 | Inline fonts in html-to-image | 2d | #2 |
| 4 | Consolidate to one export engine | ~1wk | #7 + residual |
| 5 | Vision-QA loop | 3-4d | #8 |
| 6 | charSpacing/OOXML tokens | 2d | tracking parity |

**If one thing ships: Phase 2** — point the main deck at the DOM-walker path and fix its embedded
faces. It converts the worst offender (Arial-rendered, no-embed, separate-codebase main deck PPTX)
into a font-embedded screenshot-of-truth, and it reuses code that already exists. **The DOM-walker
is HiC's accidental implementation of the whitepaper's server-side-render thesis; the fix is mostly
routing the other paths into it, not building new infrastructure.**

> Note: this audit corrects a prior assumption that `export-paint-sync` / `export-render-verifier`
> were shipped — they exist only as prose references; the paint-ready logic is hand-inlined and the
> vision-QA loop was never built.
