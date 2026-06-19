# Figma Brick Contract — CASE-STUDY deliverable

Harvested from the single-file design library `iSQhAVM7SI4QHAWB7y9C2z`, page
`GOLD · case-study (nxt)` node **184:159**. NXT = default mode of collection
`NXT Brand Tokens` 221:2; NU = mode **535:0** of the same collection (token-swap, one
component set). Source tools: get_metadata / get_design_context / get_variable_defs /
get_screenshot. Captured 2026-06-16.

This is the runtime-assembly contract: every variant below is a real Figma COMPONENT whose
fills/fonts bind to `var(--color/*)` and `var(--font/*)` tokens, so a deliverable is
assembled by (a) instancing the component, (b) setting text slots, (c) flipping the brand
mode — never by hardcoding hex/font values.

## Page roster (node 184:159)

| Variant | NXT component | NU-mode instance | y-slot |
|---|---|---|---|
| 01 overview (cross-case, 3 named leaders) | **588:4** | 625:2 | y=120 |
| 02 case detail (Zappos / challenge-approach-outcome-lesson + key-outcome panel) | **588:5** | 625:94 | y=1320 |
| before-after (Amazon) | **585:2** | 625:169 | y=2520 |
| 04 case detail (Stripe / evidence-stack) | **588:6** | 625:249 | y=3720 |
| 05 case detail (Zappos / four-block) | **588:7** | 625:314 | y=4920 |
| Brand/Logo · masthead (shared component) | **619:2** | 625:380 | (off-canvas ref) |

All five top-level frames are `<symbol>` (components); each `· NU` twin is an `<instance>`
of the matching NXT component with mode set to NU 535:0.

## Shared shell anatomy (every variant)

Identical chrome across all five — the GOLD slide frame, 1920x1080:

- **Rail**: left bar, `w-92px h-1080`, fill `var(--color/rail #0d0d0d)` → NU navy.
- **Dot-mark**: 3x3 grid of 12px squares, bottom-left (left 30, top 990), fill
  `var(--color/accent #b8b800)` → NU red.
- **Masthead logo**: `nxt-logo` instance at left 1636, top 58, 156x44.25 — a real
  IMAGE asset (`wordmark` img, NOT text). In NU mode flips to the red-N monogram (verified
  on 625:169 screenshot). Driven by `brand/is-nxt` / `brand/is-nu` booleans on the
  `Brand/Logo · masthead` component (619:2).
- **Content frame**: left 172, top 58, w-1660 (the rail-offset content column; 172 = 92 rail
  + 80 margin).
- **Kicker**: `var(--font/mono)` SemiBold, 19px, `var(--color/cyan #00b7c3)` → NU teal,
  letter-spacing 6px. Pattern `CASE STUDY · <SUBJECT>` (or `CASE STUDIES · NAMED CX LEADERS`
  on the overview).
- **Action title**: `var(--font/heading)` Archivo SemiBold, 46px (54px on overview),
  `var(--color/ink #141414)`, tracking -0.5px, w-1400. A contestable full sentence.
- **Takeaway band**: absolute left 172, top 944, w-1568 h-96, fill `var(--color/accent)`
  → NU red; text `var(--font/body)` 23px on `var(--color/on-accent #0d0d0d)` → NU white
  (accessibility: black-on-chartreuse NXT, white-on-red NU). One bold judgment sentence.

## Token bindings observed (union across all variants)

Colors: `color/rail` #0d0d0d, `color/accent` #b8b800, `color/ink` #141414,
`color/paper` #ffffff, `color/cyan` #00b7c3, `color/grey` #73757a,
`color/hairline` #ddddd6, `color/rust` #cc6644, `color/wash-warn` #faf1ec,
`color/wash-cool` #ebf7f8, `color/ecru` #f2f1ea, `color/pale` #fafaf7,
`color/muted` #999999, `color/teal` #115054, `color/on-accent` #0d0d0d.
Fonts: `font/mono` (IBM Plex Mono), `font/heading` (Archivo), `font/body` (Archivo).
Booleans: `brand/is-nxt`=true (drives logo). Grid: `grid/columns`=12, `grid/gutter`=24.
(NU mode 535:0 swaps the same keys: rail→navy, accent→red, cyan→source-teal, fonts→Lato,
on-accent→#ffffff, brand/is-nu→true.)

NOTE: a few stroke fills are still RAW HEX, not token-bound — the cyan left-borders on the
overview "subject gap" callouts (`border-[#00b7c3]`, nodes 184:178 / 184:193 / 184:208).
Every other fill is variable-bound. Minor residual de-hardcode pass.

---

## Variant 588:4 — 01 overview (cross-case comparison)

- **Component**: 588:4 · **NU instance**: 625:2 · **logo**: 620:2 (image wordmark).
- **Slot anatomy**:
  - kicker (184:160) → "CASE STUDIES · NAMED CX LEADERS"
  - action title (184:161, 54px) → cross-case thesis
  - `case cols` (184:164): 3 equal flex columns (one per named leader). Each column:
    - subject name (184:166, Archivo SemiBold 30px ink)
    - model label (184:168, mono 12px `color/rust`, tracking 1.5px) — e.g. "THE EMPOWERMENT MODEL"
    - WHAT THEY DO label (mono 11px grey) + body (Archivo 18px ink)
    - OUTCOME label (mono 11px grey) + body (Archivo 18px ink)
    - subject-gap callout: cyan left-border-4 box, body text in `color/cyan` (RAW HEX #00b7c3 — de-hardcode candidate)
  - **cross-case comparison axis** (198:2, "cross-case comparison axis"): label "THE COMMON
    LEVER ACROSS ALL THREE" (mono 13px cyan) + 3 lever cells, each a 4px cyan rect + heading
    (Archivo 20px) + mono sub-label. ABSOLUTE-positioned (left 0 / 568.67 / 1137.33).
  - axis divider (200:2): 1px hairline rule above the axis.
  - takeaway band (184:157/158).
- **Bricks → slots**: title=thesis; 3 columns=named subjects; per-column lever=common-axis;
  band=synthesis judgment. This is the cover/roster variant (named cards + THE COMMON LEVER axis).

## Variant 588:5 — 02 case detail (Zappos, CAOL + key-outcome panel)

- **Component**: 588:5 · **NU instance**: 625:94 · **logo**: 620:7.
- **Slot anatomy**:
  - kicker (202:2) "CASE STUDY · ZAPPOS"; title (202:3, 46px).
  - meta line (202:4, mono 14px grey, pre-wrap): `MODEL · INDUSTRY · CX-TYPE  TIMEFRAME ...  INVESTMENT ...`
  - hairline divider (202:5).
  - `case body row` (211:2): two columns —
    - **left** (`case body left` 207:2): 4 colored-left-bar rows, each `[6px rect] + [mono
      label + Archivo 16.5px body]`. Bars semantically colored: CHALLENGE=`rust`,
      APPROACH=`muted`, OUTCOME=`cyan`, LESSON=`accent`.
    - **right** (`key outcome panel` 208:2, w-580, fill `color/ecru`): KEY OUTCOME label +
      hero phrase (Archivo Bold 54px) + caption; hairline; 3 mini stat rows (Archivo
      SemiBold 21px + mono sub); hairline; cyan-left-border pull-quote (208:21) with body +
      `SOURCE:` mono cyan attribution.
  - takeaway band (190:87/88).
- **Bricks → slots**: title=case thesis; meta=context strip; left=challenge/approach/outcome/lesson
  narrative; right panel=key-outcome hero + proof points + cited quote; band=judgment.

## Variant 585:2 — before-after (Amazon)

- **Component**: 585:2 (named `CaseStudy/before-after (Amazon)`) · **NU instance**: 625:169
  (the one screenshot-verified for the mode flip) · **logo**: 620:12.
- **Slot anatomy**:
  - kicker (213:2) + title (213:3, 46px) + meta line (213:4) + hairline (213:5).
  - `before/after` row (214:2, h-468): two equal panels +center arrow —
    - **BEFORE** (214:3, fill `color/wash-warn`): label "BEFORE" (mono rust) + subhead
      (Archivo 25px) + 5 bullet rows, each `[7px rust square] + Archivo 16.5px`. justify-between.
    - **arrow** (214:16): "→" glyph, Archivo 44px grey. (ASCII arrow, not em-dash.)
    - **AFTER** (214:17, fill `color/wash-cool`): label "AFTER" (mono cyan) + subhead + 5
      bullet rows with `7px cyan square`.
  - footer row (214:30): **RESULT** column (mono grey label + Archivo 18px body) +
    cyan-left-border pull-quote (214:34) with body + `SOURCE:` mono cyan.
  - takeaway band (212:68/69).
- **Bricks → slots**: title=transformation thesis; before-panel=status-quo bullets;
  after-panel=changed-state bullets; result=outcome prose; quote=cited proof; band=lever judgment.

## Variant 588:6 — 04 case detail (Stripe, evidence-stack)

- **Component**: 588:6 · **NU instance**: 625:249 · **logo**: 620:17.
- **Slot anatomy**:
  - kicker (217:70) "CASE STUDY · STRIPE" + title (217:71, 46px) + meta (217:72) + hairline (217:73).
  - section label "CONVERGENT EVIDENCE" (218:2, mono 13px grey).
  - `evidence stack` (218:3, h-540, justify-between): 4 evidence rows. Each row:
    - 4px cyan left-bar
    - quote (Archivo 24px ink, curly quotes) + `SOURCE:` mono cyan attribution
    - right-aligned `WHAT IT SHOWS` block (w-440): mono grey label + Archivo 16.5px interpretation
  - takeaway band (217:68/69).
- **Bricks → slots**: title=case thesis; each row = one cited verbatim quote + its
  "what it shows" gloss; the stack demonstrates convergent evidence; band=judgment. This is
  the multi-quote / evidence-stack deep-dive form.

## Variant 588:7 — 05 case detail (Zappos, four-block)

- **Component**: 588:7 · **NU instance**: 625:314 · **logo**: 620:22.
- **Slot anatomy**:
  - kicker (260:20) + title (260:21, 46px) + meta (260:22) + hairline (260:23).
  - `four-block` row (261:2, h-640): two columns —
    - **left** (`blocks` 261:3): 4 stacked full-bleed cards (flex-1 each):
      - block-challenge (261:4) fill `wash-warn`, 6px `rust` bar, label rust
      - block-approach (261:8) fill `ecru`, 6px `ink` bar, label ink
      - block-outcome (261:12) fill `wash-cool`, 6px `cyan` bar, label cyan
      - block-lesson (261:16) fill `pale`, 6px `accent` bar, label ink
      Each: mono 13px label (w-152) + Archivo 19px body (flex-1).
    - **right** (`key-outcome-panel` 262:2, w-564, fill `color/teal` — dark panel):
      KEY OUTCOME label (mono accent) + hero phrase (Archivo SemiBold 60px paper) + caption;
      hairline (paper); 3 stat pairs (Archivo SemiBold 30px **accent** + Archivo 15px paper);
      hairline; accent-left-border pull-quote (262:14) body paper + `SOURCE:` mono accent.
  - takeaway band (260:61/62).
- **Bricks → slots**: title=case thesis; 4 blocks=challenge/approach/outcome/lesson (color-coded);
  dark teal panel=key-outcome hero + 3 proof pairs + cited founder quote; band=judgment. The
  richest variant (dark KEY OUTCOME panel on `color/teal`).

---

## NU-mode deltas (verified on 625:169 screenshot)

Pure token-swap, GEOMETRY IDENTICAL. Flipping collection 221:2 to mode 535:0 yields:
- rail #0d0d0d → navy (#0e1626-class)
- accent chartreuse #b8b800 → red (dot-mark + takeaway band)
- cyan #00b7c3 → source-teal (kickers, sources, before/after AFTER bars)
- on-accent #0d0d0d → #ffffff (white text on red band — accessibility)
- logo wordmark image → red-N monogram (via brand/is-nxt→brand/is-nu boolean)
- fonts Archivo/IBM Plex Mono → Lato (single-typeface)
No layout, no node, no slot changes — brand is a mode, not a copy.

---

## MANIFEST CORRELATION

The manifest at `wiki/brand/figma-node-map.md` is **PARTIALLY STALE** in its primary
table (chunk #c2 / NXT table rows) but **CORRECT** in its newest chunk (#c-componentized,
the 2026-06-15 "COMPONENTIZED DESIGN SYSTEM + MODES" section).

- **STALE (pre-component IDs in the NXT table)**: the table lists
  `212:2` (Amazon before-after), `217:2` (Stripe evidence-stack), `260:2` (Zappos four-block)
  as the case-study frame nodes. These are the OLD raw-frame IDs. The live page now exposes
  **components**: before-after=**585:2** (was 212:2), Stripe=**588:6** (was 217:2),
  four-block=**588:7** (was 260:2). The old IDs survive only as inner child node prefixes
  (e.g. 212:3 rail, 217:3 rail, 260:3 rail, 261:x blocks, 262:x panel) INSIDE the new
  components — they were absorbed, not deleted. Overview (588:4) and Zappos-detail (588:5)
  are likewise new component IDs over old 184:2 / 190:2 inner content.
- **CORRECT (componentized chunk)**: the 2026-06-15 section names the exact live components —
  `CaseStudy/before-after (Amazon)` 585:2; `01 overview` 588:4; `02 case detail` 588:5;
  `04 case detail (Stripe / evidence-stack)` 588:6; `05 case detail (Zappos / four-block)`
  588:7. **This matches Figma exactly.** It also correctly documents NU-as-mode-535:0,
  the `Brand/Logo · masthead` 619:2 logo component, and on-accent text on colored blocks.
- **MISSING from the manifest**: the NU-instance node IDs (625:2 / 625:94 / 625:169 /
  625:249 / 625:314) are not individually listed — the chunk says "68 NU-mode instances
  beside each component" generically. The shared masthead instance 625:380 is also unlisted.
  The residual RAW-HEX cyan borders on 588:4 (nodes 184:178/193/208) are undocumented.

**Verdict**: trust the COMPONENTIZED chunk (585:2 / 588:4-7), treat the NXT-table case-study
rows (212:2 / 217:2 / 260:2) as historical/superseded. Recommend re-chunking the page so the
stale table rows point to the component IDs and the NU-instance IDs are recorded.
