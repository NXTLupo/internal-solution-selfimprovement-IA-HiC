# SLIDES-system Group B — Content Archetypes (Figma anatomy → component manifest)

Figma file key: `iSQhAVM7SI4QHAWB7y9C2z`
Brand modes: **NXT = default mode**, **NU = mode `535:0`** (same component set; brand = token-swap).
Canvas: 1920 x 1080, page background `#fafaf7` (paper). Content gutter starts at `left:196px` (rail is 128px + ~68px margin).

## Shared mode token swaps (verified via get_variable_defs)

| Token | NXT (default) | NU (mode 535:0) |
|---|---|---|
| `color/rail` | `#0d0d0d` | `#0e1626` (navy) |
| `color/accent` | `#b8b800` (chartreuse) | `#c8102e` (Huskies red) |
| `color/cyan` | `#00b7c3` | `#1d6e64` (teal) |
| `color/body` | `#333333` | `#16233c` |
| `color/secondary` | `#666666` | `#73757a` |
| `color/hairline` | `#ddddd6` | `#ddddd6` (shared) |
| `color/ecru` | `#f2f1ea` | (inherits) |
| `color/paper` | `#ffffff` | (inherits) |
| `font/display` | `Saira Condensed` (SemiBold) | `Lato` |
| `font/heading` | `Archivo` (Bold) | `Lato` |
| `font/body` | `Archivo` (Regular/Italic) | `Lato` |
| `grid/columns` | `12` | `12` |
| `grid/gutter` | `24` | `24` |

Generators emit `brand: "nxt" | "nu"` only; the renderer swaps the mode and all tokens resolve.

## Shared GOLD chrome (identical across all 4 archetypes)

- **Rail**: left vertical bar, `w:128px`, full height `1080px`, fill `var(--color/rail)`. Node = "Rectangle".
- **3x3 dot-mark**: 9 squares at the rail's bottom-left, each `10.1px`, fill `var(--color/accent)`. Columns at `left: 34.7 / 59.2 / 83.7px`; rows at `top: 986.4 / 1010.9 / 1035.4px`.
- **Masthead — `Brand/Logo · masthead` (node `619:2`)**: wordmark image, `156 x 44px`. The brand wordmark asset (NXT "NXT HUMANS" / NU red-N). Note: the 4 audited content frames place a kicker/eyebrow at `top:40px` rather than embedding 619:2 directly; 619:2 is the canonical masthead component to drop in the top-content band.
- **Eyebrow/kicker**: `font/heading` Bold, `22px`, `var(--color/cyan)`, `tracking:1.76px`, at `left:196px top:40px` (BY THE NUMBERS / EMERGING THEMES / PEER & ASPIRATIONAL INSTITUTIONS). block-quote uses a `secondary`-colored 18px kicker instead.
- **Footer source line**: `font/body` Regular, `18px`, `var(--color/secondary)`, at `left:196px top:1014px`, e.g. "Sources: NXT Stakeholder Interview | Client Uploads".
- **Layout note**: every frame is built with **absolute x/y positioning** (not auto-layout). The manifest should model these as fixed-grid regions; column x-origins are the load-bearing spacing constants.

---

## 1. stat-row — node `609:6` (NU twin `626:61`)

**WHEN TO USE**: "By the numbers" coverage/proof slide. 3 headline figures, each with a qualitative MEANS + MATTERS interpretation. Numbers ride as evidence with an interpretation, never naked.

**REGIONS** (absolute):
- Kicker `top:40` + Title `top:86` (`font/display` 58px, rail) + full-width hairline `top:186` (`w:1620`, `color/hairline`).
- 3 stat columns at `left: 196 / 752 / 1308` (≈556px pitch), each:
  - Big figure: `font/display` 120px, `var(--color/accent)`, `top:215`, `w:520`.
  - Headline: `font/heading` Bold 28px, rail, `top:372`, `w:500`, leading 1.28.
  - "MEANS" label: heading Bold 19px, cyan, tracking 1.14, `top:596`.
  - MEANS body: `font/body` 21px, body color, `top:628`, leading 1.4.
  - "MATTERS" label: same as MEANS, `top:772`. MATTERS body `top:804`.
- Bottom hairline `top:956` + footer source `top:1014`.

**TOKEN BINDINGS**: figure→`color/accent`+`font/display`; headline→`color/rail`+`font/heading`; MEANS/MATTERS labels→`color/cyan`+`font/heading`; bodies→`color/body`+`font/body`; hairlines→`color/hairline`.

**PAYLOAD**:
```
{ kicker, title,
  stats: [ { figure, headline, means, matters } ]  // exactly 3
  sourceLine }
```

---

## 2. block-quote — node `609:7` (NU twin `626:95`)

**WHEN TO USE**: single hero verbatim quote from a named stakeholder, with a right-side panel of 3 corroborating data points. The pull-quote slide.

**REGIONS** (absolute):
- Giant open-quote glyph "“": `font/display` 260px, `var(--color/accent)`, `left:196 top:20`.
- Topic kicker: heading Bold 18px, secondary, tracking 1.08, `left:350 top:92`.
- Quote body: `font/body` Regular **46px**, rail, `left:209 top:170`, `w:1011`, leading 1.44.
- Attribution name: heading Bold 24px, rail, `left:298 top:778`. Role/title: body 20px, secondary, `top:814`.
- **Corroborating panel** (right): ecru rectangle `left:1267 top:120 w:573 h:778` with a `9px` rail-colored top cap. Header "CORROBORATING DATA" heading Bold 16px secondary `top:158`. Three data items stacked at `top: 210 / 406 / 602`, each = display 66px accent figure + heading Bold 19px rail label (`top: 292/488/684`) + heading Bold 14px secondary source (`top: 356/552/748`).
- Footer source `top:1014`.

**TOKEN BINDINGS**: quote glyph + figures→`color/accent`+`font/display`; quote body→`color/rail`+`font/body`; name→rail+heading; role/source→`color/secondary`; panel bg→`color/ecru`, cap→`color/rail`.

**PAYLOAD**:
```
{ topicKicker, quote, attributionName, attributionRole,
  corroborating: [ { figure, label, source } ]  // exactly 3
  sourceLine }
```

---

## 3. numbered-themes — node `609:8` (NU twin `626:124`)  ← MULTI-ITEM ARCHETYPE

**WHEN TO USE**: "profile N items / apps / themes" — the canonical layout for 4 cross-cutting themes (or apps, plays, segments). Each item is a numbered column with name, body, and a verbatim quote.

**ITEM COUNT**: **4 items** (columns). Pitch 418px at `left: 196 / 614 / 1032 / 1450`, each column `w:380`.

**REGIONS** (absolute):
- Kicker `top:40` + Title `top:86` (`font/display` 58px, rail, leading 1.06, `w:1600` — spans full width, can wrap 2 lines).
- Per item (4x):
  - Number "01..04": `font/display` 80px, `var(--color/accent)`, `top:252`.
  - Hairline under number: `top:352`, `w:380`, `color/hairline`.
  - Theme name: `font/heading` Bold 24px, rail, `top:372`, leading 1.26.
  - Body: `font/body` Regular 18.5px, body color, `top:510`, leading 1.42.
  - Verbatim quote (italic): `font/body` **Italic** 18.5px, `var(--color/secondary)`, `top:766`, leading 1.4.
- Footer source `top:1014`.

**TOKEN BINDINGS**: number→`color/accent`+`font/display`; name→`color/rail`+`font/heading`; body→`color/body`+`font/body`; quote→`color/secondary`+`font/body` (italic); divider→`color/hairline`.

**PAYLOAD**:
```
{ kicker, title,
  items: [ { number, name, body, quote } ]  // 4 (the grid is built for 4 fixed columns)
  sourceLine }
```
Note: number is display text ("01"); body is the synthesis prose; quote is a verbatim corpus snippet (the Evidence-Label rule applies — must be a real quote).

---

## 4. evidence-table — node `609:9` (NU twin `626:158`)  ← TWO-TIER COMPARISON TABLE

**WHEN TO USE**: peer/aspirational comparison or any 4-column evidence matrix where each row is a named subject scored across "what they prove / implication / evidence-grade". Ends with a synthesized PEER PATTERN takeaway band.

**STRUCTURE**: 4 columns x 6 data rows + intro paragraph + takeaway band.
- **Columns** (header row at `top:252`, heading Bold 16px secondary, tracking 0.96):
  - `INSTITUTION` `left:196` (subject, `w:230`)
  - `WHAT THEY PROVE` `left:470` (`w:540`)
  - `IMPLICATION` `left:1034` (`w:580`)
  - `EVIDENCE` `left:1638` (evidence-grade, `w:180`)
- Intro paragraph above headers: body 20px, `top:168`, `w:1560`.
- Header underline: rail `2px` rule at `top:280`, `w:1622`.
- **Rows**: two visual tiers —
  - **Featured rows (top 2)**: white card `h:108` with a `4px` accent left-edge bar. Subject in heading Bold 26px; "what they prove" heading Bold 19px. Cards at `top:296` and `top:420`.
  - **Compact rows (next 4)**: thinner rows separated by `color/hairline` 1px dividers; subject heading Bold 19px, cells body 17px, evidence 15px. Rows at `top: 554 / 632 / 710 / 788`.
- **Takeaway band**: full-width accent rectangle `left:196 top:868 w:1622 h:76`. Label "PEER PATTERN" heading Bold 17px rail tracking 0.85 (`left:228`); takeaway sentence heading Bold 20px rail (`left:440 w:1340`).
- Footer source `top:1014` (concatenated named sources).

**TOKEN BINDINGS**: subjects + "what they prove"→`color/rail`+`font/heading`; implication/compact cells→`color/body`+`font/body`; evidence-grade→`color/secondary`; accent edge-bars + takeaway band→`color/accent`; featured card bg→`color/paper`; dividers→`color/hairline`; header underline→`color/rail`.

**PAYLOAD**:
```
{ kicker, title, intro,
  columns: ["INSTITUTION","WHAT THEY PROVE","IMPLICATION","EVIDENCE"],  // labels fixed but renamable
  rows: [ { subject, prove, implication, evidenceGrade, featured?:bool } ],  // ~6; first ~2 featured
  takeaway: { label, statement },
  sourceLine }
```
