# SLIDES-system component manifest — Group A: Framing archetypes

Source Figma file: `iSQhAVM7SI4QHAWB7y9C2z`
Brand modes: **NXT = default mode** (accent `#b8b800`) · **NU = mode `535:0`** (accent `#c8102e`).
NU twins (`626:*`) are component INSTANCES of the NXT masters (`609:*` / inner `325:*`); geometry is byte-identical, only token resolution swaps. Author generators against the NXT master node ids; brand swap is a mode flip, never a layout change.

## Shared GOLD chrome (all four archetypes)

Every Group-A slide is a 1920x1080 frame with these constants. A generator should always emit them and never let payload content collide with them.

| Element | Spec | Token |
|---|---|---|
| Canvas | 1920x1080, absolute-positioned children | `bg-[var(--color/rail)]` (dark slides) or `var(--color/paper)` (agenda) |
| Dot-mark | 3x3 grid of 10.1px squares, bottom-left. cols x at 34.7 / 59.2 / 83.7px; rows y at 986.4 / 1010.9 / 1035.4px (24.5px pitch) | `bg-[var(--color/accent)]` |
| Left rail | 128px-wide full-height black bar ON AGENDA ONLY (`325:16`). Cover / divider / thesis have NO rail (dot-mark sits directly on the dark canvas) | `bg-[var(--color/rail,#0d0d0d)]` |
| Content inset | Dark-canvas slides indent content to `left: 101px`. Agenda (has rail) indents to `left: 196px` (128 rail + ~68 gutter) | — |
| Masthead/Logo | NO image lockup in these four. Brand is the "NXT Humans" Archivo-bold wordmark, used only on Cover (`325:12`). Divider/thesis/agenda carry no wordmark | `font/heading` |

NOTE: chrome is rendered with ABSOLUTE positioning (Figma export shows no auto-layout frames here, only positioned rectangles + text). Treat coordinates as the contract; do not attempt auto-layout reflow for these fixed framing slides.

### Token palette used by Group A
| Token | NXT (default) | NU (535:0) |
|---|---|---|
| `color/accent` | `#b8b800` | `#c8102e` |
| `color/paper` | `#ffffff` | `#ffffff` |
| `color/rail` | `#0d0d0d` | `#0d0d0d` |
| `color/rule-mid` | `#cccccc` | `#b9bec7` |
| `font/display` | Saira Condensed SemiBold | (resolves per NU mode) |
| `font/heading` | Archivo (Bold / Medium) | (per mode) |
| `font/body` | Archivo Regular | (per mode) |
| `grid/columns` | 12 | — |
| `grid/gutter` | 24 | — |

---

## 1. cover

- **NODE**: NXT `609:2` (inner master `325:*`) · NU instance `626:2`
- **WHEN TO USE**: Slide 1 of any deck. Sets engagement title + subtitle + brand wordmark on a black canvas. One per deck.
- **REGIONS** (top-to-bottom, all absolute on a `var(--color/rail)` canvas):
  1. `wordmark` — `left 101 / top 150`, w 900, Archivo Bold 26px, `+2.6px` tracking, UPPERCASE, `color/paper`
  2. `title` — `left 101 / top 340`, w 1718, Saira Condensed SemiBold 150px, `color/paper`
  3. `subtitle` — `left 101 / top 560`, w 1718, Archivo Medium 40px, `color/rule-mid`
  4. `dot-mark` — shared chrome, bottom-left, `color/accent`
- **TOKEN BINDINGS**: wordmark/title text -> `color/paper`, `font/heading`+`font/display`; subtitle -> `color/rule-mid`, `font/heading` (Medium); dot-mark -> `color/accent`.
- **PAYLOAD**:
  ```
  { brand: "nxt"|"nu",
    wordmark: string,   // e.g. "NXT Humans" (defaults to brand name)
    title: string,      // hero deck title, UPPERCASE display
    subtitle: string }  // one-line engagement descriptor
  ```

---

## 2. agenda / table of contents

- **NODE**: NXT `609:3` (inner `325:16`-`325:35`) · NU instance `626:15`
- **WHEN TO USE**: Slide 2. Two-group table of contents. The ONLY Group-A slide on a PAPER canvas and the ONLY one with the 128px rail.
- **REGIONS** (left-to-right, two columns):
  - Canvas `bg #fafaf7` (paper); `rail` 128px black bar at left:0 (`325:16`)
  - `eyebrow/title` — "TABLE OF CONTENTS", `left 196 / top 64`, Saira Condensed SemiBold 64px, `color/rail`
  - **Column A** (`left 196`): group label `top 232` (Saira SemiBold 60px, `color/accent`); items at `top 330 / 408 / 486 / 564` (78px pitch), Archivo Bold 34px, `color/rail`
  - **Column B** (`left 1060`): group label `top 232` (same style); items at `top 330 / 408 / 486` Archivo Bold 34px, `color/rail`
  - `dot-mark` — shared chrome, sits over the black rail bottom-left
- **TOKEN BINDINGS**: canvas paper (`#fafaf7`, near-`color/paper`); rail -> `color/rail`; title + items -> `color/rail` ink, `font/display`/`font/heading`; group labels -> `color/accent`; dot-mark -> `color/accent`.
- **PAYLOAD**:
  ```
  { brand,
    title: string,                 // "TABLE OF CONTENTS"
    groups: [                      // 1-2 groups (column A / B); each:
      { label: string,            // accent group header, e.g. "WHAT WE LEARNED"
        items: [string] } ]        // "01: ..." numbered entries, 3-4 per column
  }
  ```
  Generator rule: cap at 2 groups x ~4 items. Items pre-numbered "NN: ...".

---

## 3. section-divider

- **NODE**: NXT `609:4` (inner `325:37`-`325:48`) · NU instance `626:36`
- **WHEN TO USE**: Opens each major section. Giant accent section number + section title + supporting line, on black.
- **REGIONS** (top-to-bottom on `color/rail` canvas):
  1. `section-number` — `left 101 / top 40`, w 648, Saira Condensed SemiBold **360px**, `color/accent` (the hero element)
  2. `title` — `left 101 / top 660`, w 1740, Saira Condensed SemiBold 120px, `leading-none`, `color/paper`
  3. `supporting` — `left 101 / top 916`, w 1718, Archivo Regular 32px, `color/rule-mid`
  4. `dot-mark` — shared chrome
- **TOKEN BINDINGS**: section-number -> `color/accent`, `font/display`; title -> `color/paper`, `font/display`; supporting -> `color/rule-mid`, `font/body`; dot-mark -> `color/accent`.
- **PAYLOAD**:
  ```
  { brand,
    number: string,      // "01" — zero-padded section index
    title: string,       // UPPERCASE section title, may wrap 2 lines
    supporting: string } // one-line framing sentence under the title
  ```

---

## 4. thesis-interstitial

- **NODE**: NXT `609:5` (inner `325:50`-`325:60`) · NU instance `626:49`
- **WHEN TO USE**: A single-sentence assertion slide between sections (the contestable thesis / takeaway statement). Highest text-to-chrome ratio; no number, no rail.
- **REGIONS** (top-to-bottom on `color/rail` canvas):
  1. `kicker` — `left 101 / top 96`, w 900, Archivo Bold 22px, `+1.76px` tracking, UPPERCASE, `color/accent`
  2. `thesis` — `left 101 / top 420`, w 1500, Saira Condensed SemiBold 110px, `leading 1.04`, `color/paper` (the assertion; vertically centered in the lower-middle band)
  3. `dot-mark` — shared chrome
- **TOKEN BINDINGS**: kicker -> `color/accent`, `font/heading`; thesis -> `color/paper`, `font/display`; dot-mark -> `color/accent`.
- **PAYLOAD**:
  ```
  { brand,
    kicker: string,   // small accent eyebrow, e.g. "WHAT WE LEARNED"
    thesis: string }  // ONE contestable sentence, action-title voice, ends with a period
  ```

---

## Generator notes
- Brand swap = set `brand` and resolve `color/*` + `font/*` from the active mode (NXT default / NU `535:0`). Never duplicate geometry per brand.
- Dark archetypes (cover, divider, thesis) share: black canvas, no rail, content at `left:101`, dot-mark bottom-left, accent reserved for ONE focal element (wordmark-none / number / kicker) plus the dot-mark.
- Agenda is the outlier: paper canvas + 128px rail + content at `left:196` + two-column body.
- All title/number text uses `font/display` (Saira Condensed); all body/label/eyebrow uses `font/heading` or `font/body` (Archivo). Accent color carries hierarchy, not decoration.
