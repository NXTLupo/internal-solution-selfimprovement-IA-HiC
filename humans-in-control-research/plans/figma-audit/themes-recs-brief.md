# Figma Brick Contract — THEMES · RECOMMENDATIONS · EXECUTIVE-BRIEF

Harvested 2026-06-16 (read-only Figma MCP) from the single canonical file
`iSQhAVM7SI4QHAWB7y9C2z` ("NXT Brand Tokens" collection 221:2, modes NXT 221:0 / NU 535:0).
NU is a MODE FLIP of the same node, never a separate file — confirmed live (see NU deltas).

Geometry shared by every artifact frame (1920x1080 canvas):
- 92px black rail at x=0 (`color/rail`).
- 3x3 dot-mark at x=30 y=990, 12px squares, `color/accent` fill.
- Masthead: mono kicker at x=172 y=58 (tracking 5px, `color/cyan`), Archivo SemiBold action-title at x=172 y=92 (`color/ink`).
- Logo top-right (~x=1667-1717, y=47, 156x44): `nxt-logo` -> `wordmark` vector (`Brand/Logo · masthead` instance family 619:x / 622:x). Flips to NU red-N monogram by `brand/is-nu` mode boolean.
- Content band x=172, width 1660 (172 -> 1832, 88px right margin).
- Takeaway band: x=172 y=944, 1660x81, px48 py24, body 22px. Fill + text color vary by artifact (see each).
- Grid vars present on every frame: `grid/columns`=12, `grid/gutter`=24.

Token bindings use Figma var syntax `var(--color/*)`, `var(--font/*)`. All fills/fonts are
variable-bound (no literal hex) — `get_variable_defs` returns meaningful maps on every frame.

---

## 1. THEMES (page 69:2 "GOLD · themes (nxt)")

Page roster (NXT symbols / NU mirror instances at x=4220):
| Variant | NXT node (symbol/component) | NU instance | Manifest node | Drift |
|---|---|---|---|---|
| 01 overview | 590:9 | 625:385 | (none) | new component |
| 02 theme detail | 590:11 | 625:581 | (none) | new component |
| theme-arc (narrative chain) | **590:12** | 625:654 | 288:2 | **RENUMBERED** (inner nodes still 288:x) |
| theme-mosaic (2x2 co-equal) | **590:13** | 625:722 | 289:2 | **RENUMBERED** (inner nodes still 289:x) |
| PPTX twin substrate | 590:10 | 625:509 | — | export substrate |

Note: every page frame is now a COMPONENT (figma `<symbol>`), wrapped over the original
raw frame whose inner node IDs are preserved (theme-arc body = 288:20, mosaic grid = 289:20).
So renderers keyed on 288:x / 289:x inner anatomy still match; only the TOP-LEVEL frame id moved.

### 1a. theme-arc — 590:12 (NU 625:654)
Token bindings: `color/paper` bg, `color/rail` rail, `color/accent` (dots, numeral 01-highlight, takeaway-band bg),
`color/ink` (title, numerals 02-04, body, quote text), `color/cyan` (kicker, SIGNAL line), `color/ecru` (theme-column bg),
`color/grey` (arrow glyph, SOURCE line), `color/hairline` (quote left-border 2px), `color/on-accent` (takeaway text).
Fonts: `font/mono` IBM Plex Mono (kicker/SOURCE/SIGNAL), `font/heading` Archivo SemiBold (title 40px, theme name 22px),
`font/display` Saira Condensed (numeral 46px), `font/body` Archivo (desc 13.5px, quote 12.5px, takeaway 22px).
Slot anatomy (node `theme-arc` 288:20 = horizontal auto-layout, h640, items-center):
- 4 theme columns `theme-0N` (288:21/31/41/51): `flex-[1_0_0]` ecru columns, px20 py24, gap12 col.
  Each: numeral (288:22, accent for 01 else ink) / name (Archivo 22) / desc (Archivo 13.5) /
  quote block (left-border hairline 2px: quote 12.5 + mono SOURCE 9px grey) / spacer `flex-1` /
  SIGNAL mono 10px cyan pinned bottom.
- 3 arrow glyphs between columns (288:30/40/50): Archivo 36px grey, w52, centered.
- takeaway-band 288:60: accent bg, on-accent text.

### 1b. theme-mosaic — 590:13 (NU 625:722)
Same token set. Primary cell carries `border-t-4 color/accent`; cells 02-04 plain ecru.
Slot anatomy (`mosaic-grid` 289:20 = vertical auto-layout gap16 of 2 `mosaic-row` (289:21/38),
each row horizontal gap16 of 2 cells):
- mosaic-01 (289:22): ecru, accent top-border 4px, accent numeral 38px; name 24 / desc 15 / spacer / quote (hairline-left 2px, quote 14 + SOURCE mono 9.5 grey).
- mosaic-02/03/04 (289:30/39/47): identical minus accent top-border, ink numeral.
- takeaway-band 289:55: accent bg, on-accent text.

### 1c. theme overview 590:9 / theme detail 590:11
On-page (anatomy not deep-pulled this pass; symbols confirmed present, x=0 y=120 / y=1320).
Recommend a follow-up get_design_context if the overview/detail twins need brick-level specs.

---

## 2. THEME-INDEX (page 323:71 "GOLD · theme index (nxt)")

| Variant | NXT node | NU instance | Manifest node | Drift |
|---|---|---|---|---|
| ten-theme grid | **614:12** | 626:1407 | 323:72 | **RENUMBERED** (inner nodes still 323:x) |

theme-index — 614:12 (NU 626:1407). Inner anatomy preserved at 323:73+.
Token bindings: `color/ink` (load-bearing card bg + footer band bg), `color/accent` (kicker [Bold mono, NOT cyan],
load-bearing numeral + name-on-dark + top-border-3 + SOURCE-on-dark), `color/paper` (orbit card bg + on-dark text),
`color/ecru` (desc text on dark cards), `color/grey` (orbit numerals), `color/hairline` (orbit card border),
`color/cyan` (orbit SOURCE mono).
Fonts: `font/mono` (kicker 18px Bold, SOURCE 10px), `font/heading` Archivo SemiBold (title 40, card name 18),
`font/display` Saira Condensed (numeral 40), `font/body` Archivo (desc 13, footer 22 Medium).
Slot anatomy: footer insight band 323:90 (ink bg, paper text — NOT the standard accent takeaway; it is an
inverted summary band at the takeaway slot y=944). Grid 323:92 = vertical gap16 of 2 rows (323:93/124) x 5 cells = 5x2.
- Load-bearing cards 01-03 (323:94/100/106): ink bg, accent top-border-3, accent numeral, paper name, ecru desc, accent SOURCE.
- Orbit cards 04-10 (323:112...): paper bg, hairline border + accent top-border-3, grey numeral, ink name/desc, cyan SOURCE.
Routing: themes.length>=8.

---

## 3. RECOMMENDATIONS (page 319:2 "GOLD · recommendation dense (nxt)")

| Variant | NXT node | NU instance | Manifest node | Drift |
|---|---|---|---|---|
| recommendation-dense (4 actions + impact band + evidence strip) | **614:5** | 626:845 | 319:3 | **RENUMBERED** (inner nodes still 319:x) |
| base recommendation frame | NOT on this page; not separately mapped in manifest | — | — | dense IS the canonical brick |

recommendation-dense — 614:5 (NU 626:845). Inner anatomy preserved at 319:4+.
Token bindings: `color/paper` bg, `color/rail` rail, `color/accent` (dots, Saira numerals 54px),
`color/ink` (title 38, action name 23, action desc 17, impact values 16, takeaway-band bg),
`color/cyan` (kicker), `color/ecru` (impact-band bg), `color/grey` (impact labels mono 12),
`color/hairline` (action-row bottom borders), `color/teal` (evidence-card left-border 4px + SOURCE mono),
`color/paper` (takeaway text on ink band).
Fonts: `font/mono` (kicker 18 SemiBold, impact labels 12, SOURCE 11), `font/heading` Archivo SemiBold (title 38, action name 23),
`font/display` Saira Condensed (numeral 54), `font/body` Archivo (desc 17, impact value 16, evidence quote 18, takeaway 22).
Slot anatomy:
- action-rows 319:21: vertical auto-layout h460, 4 rows (319:22/26/30/34) each `flex-1`, bottom-border hairline,
  py18, gap28, items-center: numeral 54 accent / name 23 ink fixed w420 / desc 17 ink `flex-1`.
- impact-band 319:38: ecru bg, px32 py20, gap36, 4 `flex-1` columns BASELINE/TARGET/TIMEFRAME/OWNER (mono label grey + body value ink).
- evidence-strip 319:51: gap24, 2 `flex-1` cards, paper bg + teal left-border-4, quote 18 ink + teal SOURCE mono.
- takeaway-band 319:58: **ink bg, paper text** (NOT accent — distinct from themes which use accent bg/on-accent text).
Routing (from manifest c13): actions>=4 OR (actions>=3 AND evidence>=2 AND impactGrid).

---

## 4. EXECUTIVE-BRIEF (frame 366:2 "GOLD · executive-brief (nxt) · 01 brief")

| Variant | NXT node | NU instance | Manifest node | Drift |
|---|---|---|---|---|
| 01 brief (hero + finding cards) | 366:2 | (NU twin 294:2 in legacy ref; mode-instance not co-located on this NXT page) | 366:2 | **MATCH** (node id stable) BUT still a RAW FRAME, not componentized |

executive-brief — 366:2. The #brief / #explainer / #report slide twin.
DRIFT: manifest "COMPONENTIZED DESIGN SYSTEM" (c-block 2026-06-15) claims ALL ~29 NXT deliverable
pages incl. brief were turned into components; **366:2 is still a plain `<frame>`, not a `<symbol>`/component.**
Also the masthead uses a LITERAL TEXT "NXT HUMANS" node (367:2, mono 20px grey tracking 7px) at x=1690,
NOT the `Brand/Logo · masthead` 619:2 instance the other frames use — so this frame will NOT flip to the
NU red-N monogram by mode (it would just recolor the text). This is the documented logo-consistency gap.
Token bindings: `color/paper` bg, `color/rail` rail, `color/accent` (dots, hero left-bar 6px, hero TRIAGE numeral 46),
`color/ink` (title 38, takeaway-band bg, card name 20, card desc 15, quote text 15), `color/cyan` (kicker),
`color/grey` (literal-logo text + hero mono subhead 14 + nothing else), `color/ecru` (body bg, hero bg, all 4 card bg),
`color/hairline` (card borders 1px), `color/teal` (card quote left-bar 3px + SOURCE mono 11),
`color/paper` (takeaway text on ink band).
Fonts: `font/mono` (logo text, kicker, hero subhead, SOURCE), `font/heading` Archivo SemiBold (title 38, card name 20),
`font/display` Saira Condensed (hero TRIAGE numeral 46), `font/body` Archivo (card desc 15, quote 15, takeaway 22).
Slot anatomy:
- body 368:2: vertical auto-layout gap16 h700 at y220.
  - hero 368:3: ecru bg, accent left-bar 6px (368:4) + heroIn (368:5, baseline-aligned): display word (368:6 accent 46) + mono subhead (368:7 grey 14).
  - cards 368:8: vertical gap16; row1 368:9 = 2 cards WITH cited quote (369:2/11): top {name 20 + desc 15} justify-between quote {teal left-bar 3px, quote 15 + teal SOURCE 11}.
    row2 368:10 = 2 cards NO quote (370:2/5): name 20 + desc 15 only.
- takeaway-band 367:5: **ink bg, paper text** (same as recommendation, NOT accent).

---

## MANIFEST CORRELATION (vs `wiki/brand/figma-node-map.md`)

| Manifest claim | Live finding | Verdict |
|---|---|---|
| theme-arc 288:2 / theme-mosaic 289:2 (c10, c-block "NXT MIRRORS COMPLETE") | Top-level frames RENUMBERED to components **590:12 / 590:13**; inner anatomy nodes (288:x / 289:x) PRESERVED | **DRIFT — top-level id stale; update map to 590:12/590:13** |
| theme-index 323:72 (c16) | Renumbered to component **614:12**; inner nodes 323:73+ preserved | **DRIFT — update map to 614:12** |
| recommendation-dense 319:3 on page 319:2 (c13) | Renumbered to component **614:5**; inner nodes 319:4+ preserved | **DRIFT — update map to 614:5** |
| executive-brief 366:2, "every fill -> color/* var, every font -> font/* var" (c1) | Node id MATCH 366:2, fully var-bound CONFIRMED | **MATCH** |
| "DONE - ALL ~29 NXT deliverable pages componentized as-is" incl brief (c-block 2026-06-15) | brief 366:2 is STILL A RAW FRAME (not a component); themes/recs/index ARE components | **PARTIAL DRIFT — brief not componentized** |
| "LOGO CONSISTENCY DONE... 53 mastheads use Brand/Logo 619:2" incl brief/explainer (c-block) | themes/recs/index use `nxt-logo` 622:x logo instances; **brief 366:2 uses LITERAL TEXT logo 367:2** | **DRIFT — brief masthead not on logo component; won't mode-flip to NU monogram** |
| NU = mode 535:0 flip, not separate file | CONFIRMED LIVE: NU instance 625:654 returns rail #0e1626 / accent #c8102e / cyan #1d6e64 / on-accent #fff / Lato / brand/is-nu=true; screenshot shows navy rail, red kicker+numerals+band(white text), red-N monogram, NU-teal SIGNAL, Lato | **MATCH** |
| New token `color/on-accent` (#0d0d0d NXT / #ffffff NU) | CONFIRMED on theme-arc/mosaic takeaway text; recs/brief/index use ink-band+paper-text instead | **MATCH** |

### NU deltas (mode 535:0 vs NXT 221:0), applies to all four artifacts
- `color/rail` #0d0d0d -> #0e1626 (navy)
- `color/accent` #b8b800 (chartreuse) -> #c8102e (red)
- `color/cyan` #00b7c3 -> #1d6e64 (source teal)
- `color/ink` #141414 -> #16233c
- `color/on-accent` #0d0d0d -> #ffffff (white text on red — accessibility)
- fonts: Saira Condensed / Archivo / IBM Plex Mono -> single-typeface **Lato** (all 4 roles)
- logo: wordmark vector -> red-N monogram via `brand/is-nu` boolean (EXCEPT brief, which uses literal text)
- `color/ecru` #f2f1ea, `color/grey` #73757a, `color/hairline` #ddddd6 unchanged across modes

### Recommended map updates
1. THEMES row: theme-arc 288:2 -> component **590:12**; theme-mosaic 289:2 -> **590:13**; add overview 590:9, detail 590:11.
2. THEME-INDEX: 323:72 -> component **614:12**.
3. RECOMMENDATION-DENSE: 319:3 -> component **614:5**.
4. EXECUTIVE-BRIEF: flag 366:2 as NOT YET componentized and NOT on the logo component (two open items vs the "DONE" claim).
5. NU instances (mirror, x-offset right of each NXT): theme-arc 625:654, mosaic 625:722, overview 625:385, detail 625:581, theme-index 626:1407, rec-dense 626:845.
