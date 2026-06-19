# Figma Brick Contract — PERSONAS, PERSONA-DETAIL, COMPETITIVE, GAP, STAT-ROW, BLOCK-QUOTE

Harvested 2026-06-16 via read-only Figma MCP from the single-file library
`iSQhAVM7SI4QHAWB7y9C2z` (NXT default mode 221:0; NU = mode 535:0 of collection
`NXT Brand Tokens` 221:2). Every artifact below is now a **componentized symbol** with a
materialized **NU-mode instance** beside it (mode flip, not a copy). All fills bind to
`var(--color/*)`, all fonts to `var(--font/*)`; the takeaway band text binds to
`var(--color/on-accent)` (black NXT / white NU — accessibility). Logo is the
`Brand/Logo · masthead` family (`nxt-logo` wordmark visible <- brand/is-nxt;
red-N monogram <- brand/is-nu).

Frame canvas is always 1920x1080. Standing geometry across every artifact:
- **Rail**: 92px black bar at left (`var(--color/rail)`), full height.
- **Dot-mark**: 3x3 grid of 12px accent squares at `left:30 top:990`.
- **Masthead logo**: ~156x44 top-right (~`top:47-58`), `Brand/Logo · masthead`.
- **Kicker**: IBM Plex Mono, tracked caps, `left:172 top:58`, 18-19px, accent or cyan.
- **Action title**: Archivo SemiBold, `left:172 top:92`, 40px (dense) / 54px (full), ink.
- **Content zone**: `left:172`, width 1660 (12-col rail-offset grid: 172 -> 1832).
- **Takeaway band**: `left:172 top:944` width 1568-1660, `var(--color/accent)` or
  `var(--color/ink)` fill; body text `var(--color/on-accent)` or paper, 22-23px.

---

## 1. PERSONA-DENSE  (identity column + 2x2 evidence grid)
- **Page** `GOLD · persona dense (nxt)` **322:123** · **component 614:10** · NU instance **626:1246**
- **Routing predicate**: persona carries >=3 of goals/pains/behaviors/wins arrays.
- **Region anatomy**
  - Kicker `WHO WE SERVE · DENSE LAYOUT · PRIMARY PERSONA` — mono Bold 18, `color/accent`, tracking 5.
  - Title 40px Archivo SemiBold `color/ink` (1450 wide).
  - **Identity column** (322:144) `left:172 top:210 w:520 h:700`, fill `color/ink`:
    - Name — `font/display` (Saira Condensed SemiBold) 58, `color/paper`.
    - Descriptor line — `font/mono` Regular 13, `color/accent`, tracking 1.
    - 1px divider `color/grey`.
    - `DEFINING QUOTE` label — mono Bold 12 `color/accent` tracking 3; quote `font/body` Medium 20 `color/paper`; attribution mono Regular 12 `color/cyan`.
    - spring spacer (flex 1) -> `RELATIONSHIP STAKES` label (mono Bold 12 accent) bottom-pinned; body Archivo Regular 15 `color/ecru`.
  - **2x2 quadrant grid** (322:154) `left:724 top:210 w:1108 h:700`, gap 18; each card `color/paper` fill, **3px top border** = quadrant accent, pad 20/24/18:
    - GOALS (border `color/cyan`), PAIN POINTS (border `color/rust`), BEHAVIORS (border `color/cyan`), WHAT WINS THEM (border `color/accent`).
    - Card head — mono Bold 13 `color/ink` tracking 3. Items — 7px square dot (quadrant color) + Archivo Regular 15 `color/ink`, gap 10, 3 dot-rows per card.
  - Takeaway band (322:142) fill `color/ink`, body Archivo Medium 22 `color/paper`.
- **Tokens**: rail, accent, ink, paper, grey, cyan, ecru, rust; font/display, heading, body, mono. grid 12/24.
- **Code twins**: web.tsx persona-card dense / slideToStageHtml renderPersona dense / goldPreviews.

## 2. PERSONA-DETAIL · 02 BEHAVIORAL FINGERPRINT  (spectrum tracks + JTBD panel)
- **Page** `GOLD · persona-detail (nxt)` **119:159**. Base **602:2**; **fingerprint = symbol 602:3** (was 292:2 raw frame in manifest). NU instances 625:2434 (base) / 625:2524 (fingerprint).
- **Region anatomy**
  - Kicker `PERSONA DETAIL · THE SELF-SERVE SEEKER` — mono SemiBold 18 `color/cyan` tracking 5.
  - Title 40px Archivo SemiBold ink (1400 wide).
  - **fingerprint-grid** (292:20) `left:172 top:240 w:1660 h:670`, gap 26:
    - **spectra** panel (flex 1) fill `color/ecru`, pad 26/24; `BEHAVIORAL FINGERPRINT` label mono SemiBold 12 grey tracking 2; 5 spectrum tracks each = label-row (left pole Archivo SemiBold 13.5 ink / right pole Archivo Regular 13.5 grey) over an 8px `color/hairline` track with a 26px marker. Markers are `color/cyan` for normal dimensions, **`color/rust`** for the relationship-breaking dimension (track 5, marker far-right at left:777).
    - **jtbd-panel** (292:53) fixed `w:560`, fill `color/teal`, pad 26: `JOB TO BE DONE` mono SemiBold 12 accent; JTBD Archivo SemiBold 26 paper; `WHAT BREAKS THE RELATIONSHIP` mono accent; body Archivo Regular 14.5 paper; spring spacer; cited quote with 4px `color/accent` left bar, Archivo Regular 14.5 paper + `SOURCE:` mono Medium 10.5 accent.
  - Takeaway band (292:64) fill `color/accent`, body Archivo Regular 22 **`color/on-accent`**.
- **Tokens**: rail, accent, ink, paper, cyan, grey, hairline, rust, ecru, teal, on-accent; font/heading, body, mono. grid 12/24.
- **Code twin**: design-system/patterns/persona-detail; web.tsx persona-detail fingerprint.

## 3. COMPETITIVE  (base — capability matrix, GAP/LEADER/STRONG/PARTIAL cells)
- **Page** `GOLD · competitive (nxt)` **131:159**. Base **symbol 603:2** (was 291:2 raw frame in manifest); deep-dive **603:3**. NU instances 625:2596 / 625:2716.
- **Region anatomy**
  - Kicker `COMPETITIVE BENCHMARK · THE CX CAPABILITY PEER SET` — mono SemiBold 19 `color/cyan` tracking 6.
  - Title 54px Archivo SemiBold ink.
  - **cgrid** (132:3) vertical stack, header row + 4 capability rows, gap 3:
    - Header: `CX DIMENSION` (300px fixed col, mono SemiBold 12.5 grey) + 5 peer columns (FILL, mono SemiBold 12.5 ink): SUBJECT / SELF-SERVE LEADER / OMNICHANNEL / COMMUNITY-FIRST / LEGACY CALL CTR.
    - Row dimension cell `color/ecru` fill, Archivo SemiBold 20 ink, 300px.
    - Score cells: subject column = **`color/accent-pale` (#f5f5c8)** wash; peer cells `color/ecru`. Each cell = score-label (mono SemiBold 13.5, color by tier: GAP=`color/rust`, LEADER=`color/cyan`, STRONG/PARTIAL/NONE=`color/grey` or ink) + def Archivo Regular 15 ink.
    - Last dimension cell carries a sub-label `THE DIMENSION THIS WORK TARGETS` (mono Regular 11 grey).
  - cell-evidence footnote line — mono Regular 12 grey.
  - Takeaway band (131:157) `w:1568 h:96` fill `color/accent`, body Archivo Regular 23 `color/on-accent`.
- **Tokens**: rail, accent, ink, paper, cyan, grey, ecru, rust, accent-pale, on-accent; font/heading, body, mono. grid 12/24.

## 4. COMPETITIVE-DENSE  (merged header defs + up to 8 peers)
- **Page** `GOLD · competitive dense (nxt)` **321:56** · **component 614:7** · NU instance **626:971**
- **Routing predicate**: columns have definitions OR rows>6 OR rows carry notes.
- **Anatomy** (per manifest + token capture; screenshot-confirmed): GOLD shell + auto-layout table 1660px. Header row where each capability cell is ONE vertical text stack (mono name 13 + sans def 13 — single text flow, no separate th/def to collide). Competitor column 330px fixed = name + merged 12px note underneath. 16px score dots colored ink/accent/cool/hairline by tier. Subject row gets an ecru wash. Hairline row rules + takeaway band.
- **Tokens** (614:7): rail, accent, ink, paper, grey, cyan, hairline, rust, ecru; font/heading, body, mono. grid 12/24. (No display, no on-accent surfaced on this frame; takeaway uses ink/accent per shell.)

## 5. STAT-ROW-DENSE  (2x2 quadrant grid + dark insight column)
- **Page** `GOLD · stat-row dense (nxt)` **321:2** · **component 614:6** · NU instance **626:910**
- **Routing predicate**: stats.length>=4 OR (stats>=3 AND every stat has means+matters AND insight+pattern present).
- **Region anatomy**
  - Kicker `BY THE NUMBERS · DENSE LAYOUT · FOUR STATS` — mono Bold 18 accent tracking 5. Title 40 Archivo SemiBold ink (1450).
  - **Left quadrant grid** (321:23) `left:172 top:210 w:1040 h:700`, gap 18, 2x2: each card `color/paper`, **3px top border `color/accent`**, pad 22/18:
    - value — `font/display` (Saira Condensed SemiBold) **64**, ink (a WORD, not a number — Quant-Claim Rule).
    - means-line Archivo Medium 17 ink; matters Archivo Regular 15 ink; spring spacer; source mono Regular 11 `color/cyan` tracking 1.
  - **Right insight column** (321:50) `left:1240 top:210 w:592 h:700`, fill `color/ink`, pad 36/32: `CONVERGENT INSIGHT` mono Bold 13 accent tracking 3; insight Archivo Medium 24 paper; 1px grey divider; `PATTERN` mono Bold 13 `color/cyan`; pattern Archivo Regular 17 `color/ecru`.
  - Takeaway band (321:21) fill `color/ink`, body Archivo Medium 22 paper.
- **Tokens**: rail, accent, ink, paper, cyan, grey, ecru; font/display, heading, body, mono. grid 12/24.

## 6. BLOCK-QUOTE-DENSE  (three convergent voices + synthesis band)
- **Page** `GOLD · block-quote dense (nxt)` **322:2** · **component 614:8** · NU instance **626:1111**
- **Routing predicate**: quotes.length>=3.
- **Region anatomy**
  - Kicker `IN THEIR WORDS · DENSE LAYOUT · THREE VOICES` — mono Bold 18 accent tracking 5. Title 40 Archivo SemiBold ink.
  - **Quote row** (322:23) `left:172 top:216 w:1660 h:520`, gap 24, 3 cards: each `color/paper`, **3px left border `color/accent`**, pad 26/24:
    - open-quote mark `font/display` (Saira Condensed) **56** `color/accent`.
    - quote Archivo Medium 19 ink; spring spacer; speaker mono Bold 13 ink tracking 2; source mono Regular 12 `color/cyan`; seat-line Archivo Regular 13 grey.
  - **Synthesis band** (322:45) `left:172 top:772 w:1660 h:140`, fill `color/ecru`, gap 28: `WHERE THEY CONVERGE` label (300px, mono Bold 13 `color/rust` tracking 3) + synthesis Archivo Medium 21 ink.
  - Takeaway band (322:21) fill `color/ink`, body Archivo Medium 22 paper.
- **Tokens**: rail, accent, ink, paper, cyan, grey, rust, ecru; font/display, heading, body, mono. grid 12/24.

## 7. GAP  (four maturity-marker gap columns)  — NXT page LOCATED
- **Page** `GOLD · gap (nxt)` **62:2** · **component 598:2** · NU instance **625:1934**. PPTX-twin substrate sibling **598:3** (NU 625:2098). The NXT gap page id (62:2) was NOT in the manifest table; now confirmed.
- **Region anatomy**
  - Kicker `WHERE SUPPORT FALLS SHORT` — mono SemiBold 19 `color/cyan` tracking 6. Title 54 Archivo SemiBold ink (1180).
  - **4-column row** (62:25), gap 54, each column 370px:
    - number — `font/display` (Saira Condensed SemiBold) **64** ink, leading 0.9.
    - name — Archivo **Bold** 25 ink.
    - severity chip — fill `color/rail` (HIGH, white text) OR fill `color/accent` (CRITICAL, `color/on-accent` text) + chip-context mono Regular 12 grey.
    - **maturity track** — 330x18: 4px `color/hairline` rail + TODAY marker 14px `color/rail` solid square + TARGET marker 14px paper square with 2.5px `#00b7c3` border, positioned along a 5-stop scale (AD HOC / REPEAT / DEFINED / MANAGED / OPT, mono Regular 10 grey) + legend `■ TODAY □ TARGET`.
    - description Archivo Regular 17 ink; signal tags — 4px `color/accent` left bar + mono SemiBold 13 ink (2 lines); verbatim quote Archivo Regular 18 ink + `SOURCE:` mono Regular 12 `color/cyan`.
  - Takeaway band (62:158) `w:1568 h:96` fill `color/accent`, body Archivo Regular 23 `color/on-accent`.
- **Tokens**: rail, accent, ink, paper, cyan, grey, hairline, on-accent; font/display, heading, body, mono. grid 12/24.

---

## MANIFEST CORRELATION (vs brand/figma-node-map.md)

| Artifact | Manifest reference | Live (2026-06-16) | Verdict |
|---|---|---|---|
| persona-dense | NXT frame 322:124 (page 322:123) | page 322:123, **component 614:10**, NU 626:1246 | DRIFT: now a component (614:10), not a raw frame 322:124. Page id stable. |
| persona-detail fingerprint | NXT 292:2 (page 119:159) | page 119:159, **base 602:2 / fingerprint symbol 602:3**, NU 625:2434/625:2524 | DRIFT: componentized; fingerprint is 602:3, child rectangles retain 292:* ids. |
| competitive base | NXT 291:2 (P6 mirror, page 131:159) | page 131:159, **base symbol 603:2 / deep-dive 603:3**, NU 625:2596/625:2716 | DRIFT: 291:2 raw frame superseded by component 603:2; deep-dive 603:3. |
| competitive-dense | NXT frame 321:57 (page 321:56) | page 321:56, **component 614:7**, NU 626:971 | DRIFT: now component 614:7, not raw 321:57. Page id stable. |
| stat-row-dense | NXT frame 321:3 (page 321:2) | page 321:2, **component 614:6**, NU 626:910 | DRIFT: now component 614:6, not raw 321:3. Page id stable. |
| block-quote-dense | NXT frame 322:3 (page 322:2) | page 322:2, **component 614:8**, NU 626:1111 | DRIFT: now component 614:8, not raw 322:3. Page id stable. |
| gap | NXT page id **absent** from table; NU gap 29:2 (legacy file) only | NXT page **62:2**, **component 598:2**, NU instance 625:1934, PPTX-twin 598:3 | RESOLVED + correlation gap closed: NXT gap = page/symbol 62:2 (record it in the map). |

### Cross-cutting drift notes
- **Componentization not reflected in the manifest table.** The 2026-06-15 "COMPONENTIZED DESIGN SYSTEM + MODES" log says all ~29 NXT pages were componentized, but the per-artifact NXT-file token table still lists pre-componentization **raw-frame ids** (321:3, 322:3, 321:57, 292:2, 291:2, 322:124). The live load-bearing nodes are now the **symbol ids** (614:6, 614:8, 614:7, 602:3, 603:2, 614:10) + their NU-mode **instances** (626:910, 626:1111, 626:971, 625:2524, 625:2596, 626:1246). Re-pull and re-chunk the node map; the manifest itself already flags "PENDING: re-chunk THIS page".
- **NU is a mode, not a file.** Confirmed: every artifact has one NXT symbol + one NU instance (mode 535:0) in the same file `iSQhAVM7SI4QHAWB7y9C2z`. The legacy NU file `z2v9Pvhg23hlljEitPBdAt` (gap 29:2 etc.) is reference-only and could not be read via MCP from the active session (requires the layer selected in-app) — do not sync to it.
- **Token-binding drift in GAP.** The gap maturity-track TARGET markers use a **raw hex border `#00b7c3`** (`border-[#00b7c3]` / `border-[2.5px]`) rather than `var(--color/cyan)`. Minor: it will recolor correctly in NU only if rebound to the cyan token (NU cyan -> source teal). Flag for a setBoundVariableForStroke pass.
- **on-accent coverage.** persona-detail, competitive, gap takeaway bands correctly bind text to `color/on-accent`; persona-dense / stat-row / block-quote takeaways use `color/ink` fill + `color/paper` text (dark band, no on-accent needed). Consistent with the accessibility rule.
- **Quant-Claim compliance.** stat-row-dense "values" are WORDS (OFF-CHANNEL, GREEN, QUARTERLY, MANUAL), not bare numbers — compliant with the Quantitative Claim Rule. Numbers appear only inside cited verbatim quotes (gap, block-quote, persona).

### Not-located / could-not-verify
- None of the six target artifacts is unlocated. The only correlation gap (NXT gap page id) is now **resolved to 62:2**.
- Legacy NU-file frames (29:2 etc.) not byte-read this session (cross-file MCP read blocked without in-app selection); NU coverage verified instead via the in-file NU-mode instances listed above.
