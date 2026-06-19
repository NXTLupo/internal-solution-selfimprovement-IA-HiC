# Figma Brick Contract — ROADMAP · STRATEGY · TECH-AUDIT · TECH-ARCHITECTURE · PRD

Harvested 2026-06-16 via Figma MCP (read-only) from the single source-of-truth file
`iSQhAVM7SI4QHAWB7y9C2z` (NXT default mode 221:0; NU = mode 535:0 of collection `NXT Brand Tokens` 221:2).
All five deliverable pages were componentized in the 2026-06-15 single-file/NU-as-a-mode pass, so the
manifest's older raw-frame node IDs (290:2, 298:2, 297:2, 295:2/296:2, 70:2) are STALE. The live
templates are now `COMPONENT` (`<symbol>`) nodes with new IDs, each with a materialized NU-mode
`INSTANCE` mirrored at x=2220 (the "see both themes" view). NU is a pure token-mode flip — same
geometry, fills/fonts rebind to the NU mode. Confirmed by screenshotting NU instance 625:2262 (roadmap):
navy rail #0E1626, red-N monogram replacing the wordmark, red dot-mark, NU-teal kicker, red takeaway
band with white-on-red text (the `color/on-accent` flip). No layout divergence.

## Canonical node IDs (LIVE, post-componentization)

| Artifact | Page (canvas) | NXT component(s) | NU-mode instance(s) |
|---|---|---|---|
| ROADMAP | `126:159` GOLD · roadmap (nxt) | `599:2` base (3-horizon NOW/NEXT/LATER) · `599:3` 02 horizon detail (NOW) | `625:2262` · `625:2370` |
| STRATEGY | `148:159` GOLD · strategy (nxt) | `604:2` base (kernel) · `604:3` 02 coherent-action detail | `625:2797` · `625:2894` |
| TECH-AUDIT | `153:159` GOLD · tech-audit (nxt) | `605:2` base · `605:3` 02 risk detail (one system) | `625:2953` · `625:3048` |
| TECH-ARCHITECTURE | `156:159` GOLD · tech-architecture (nxt) | `606:2` base (system map) | `625:3115` |
| PRD | `161:159` GOLD · prd (nxt) | `607:2` 01 user stories · `607:3` 02 story detail · `607:4` 03 requirements · `607:5` 04 milestones/risks/sign-off | `625:3240` · `625:3368` · `625:3454` · `625:3531` |
| PRD-DENSE | `322:49` GOLD · prd dense (nxt) | `614:9` two deep features per slide | `626:1165` |

All canvas dimensions are 1920x1080. Detail frames stack vertically on each page at 1360px rhythm.

## Shared GOLD shell (the invariant brick across all five artifacts)

Every frame composes from the same regions, all token-bound (no literal hex except the SVG-connector
exception noted under tech-architecture, and a handful of legacy `border-[#cc6645]` / `border-[#141414]`
literals on the roadmap-base + tech-arch borders — see Drift):

1. **Rail** — `bg=color/rail` (#0d0d0d), full-height 1080, left 0, width **92px**.
2. **Dot-mark** — 3x3 grid of 12px squares `bg=color/accent`, left 30px, top 990px, 6px gaps.
3. **Logo** — `nxt-logo` instance (wordmark child, `Brand/Logo · masthead` 619:2 lineage), top-right
   (left ~1636–1699 / top 47–58, 156x44). Flips to red-N monogram in NU mode via `brand/is-nxt|is-nu`.
4. **Kicker** — `font/mono` SemiBold, `color/cyan`, ~18–19px, letter-spacing 5–6px, uppercase.
   (PRD-DENSE deviates: kicker is `color/accent` Bold, not cyan.)
5. **Title (action title)** — `font/heading` (Archivo) SemiBold, `color/ink` (#141414), tracking -0.5px,
   leading ~1.08–1.12. Size **40px** on detail frames; **44px** (tech-arch) / **54px** (roadmap base) on base frames.
6. **Body region** — per-artifact (see below); content sub-frame is **172px** left (after the 92 rail +
   80 offset), **1660px** wide. This is the rail-offset 12-col content zone.
7. **Takeaway band** — bottom, left 172, top 944, width 1660 (base frames 1568), `bg=color/accent`,
   ~24–28px vertical pad; text `font/body` Archivo ~22–23px, `color/on-accent` (#0d0d0d NXT / #fff NU).
   PRD-DENSE inverts this: band is `bg=color/ink` with `color/paper` text (dark band, not accent).

### The recurring "left list + right teal panel" body (STRATEGY / TECH-AUDIT / ROADMAP-detail)

The dominant body brick for the *detail* frames is a 2-column auto-layout grid (`gap 26px`, height 670,
top 240):
- **Left** — `flex-1` column of stacked ecru cards. Each card: `bg=color/ecru` (#f2f1ea),
  `border-l-4` left bar whose color encodes meaning (`rust`=problem/why, `ink`=neutral/what,
  `cyan`=positive/reinforcement, `accent`=primary initiative, `hairline`=secondary). Card carries a mono
  micro-label + Archivo body. Cards are `flex-1` so N cards distribute the column height.
- **Right** — fixed **520px** `bg=color/teal` (#115054) panel. Mono kicker in `color/accent`, Archivo
  SemiBold white headings, and a bottom-pinned pull-quote (accent 4px left bar, verbatim quote in white +
  mono `SOURCE:` line in accent). This is the evidence-carrier per the Evidence-Label rule.

## Per-artifact body anatomy

### ROADMAP base (`599:2`)
- Three-segment **horizon bar** (8px tall): accent 462px / `color/slate` (#3a4a66) 561px / `color/ink` 628px
  (NOW / NEXT / LATER weighting).
- **3 horizon columns** (`gap 70px`, each `flex-1`): big `font/body` Regular 52px label (Now/Next/Later) +
  mono cadence kicker (`color/grey`, "THIS QUARTER" / "NEXT QUARTER" / "NEXT YEAR") + Archivo Bold 26px
  sub-headline + 2 initiative blocks (body 17px + mono `ADDRESSES …` tag in grey) + a `rust` left-bar
  **MEASURE** block + a `cyan` left-bar **DONE WHEN** block.
- Vision line under title: `font/body` Italic `color/cyan` 24px.

### ROADMAP horizon detail (`599:3`)
- Left = 4 stacked initiative cards (`accent` bar on #1, `hairline` on the rest), each: Archivo SemiBold
  20px "01 …" name + body 14px + mono tag row (`DEPENDS ON ·` grey / `UNLOCKS ·` cyan).
- Right = teal **SEQUENCING LOGIC** panel (accent kicker, white 30px headline "Data before models…",
  white 14.5px body, bottom pull-quote `SOURCE: CLIENT UPLOADS`).

### STRATEGY coherent-action detail (`604:3`)
- Left = 4 ecru cards: **WHY THIS ACTION** (rust bar) / **WHAT CHANGES** (ink) / **HOW IT REINFORCES THE
  KERNEL** (cyan) / **FIRST MOVE** (ink). Mono label + Archivo 15px body.
- Right = teal **GUARDRAILS** panel: 3 named guardrails (Confidence floor / Audit trail / Reversal trigger)
  as white heading+body pairs, then bottom pull-quote `SOURCE: AGENT LISTENING SESSION`.

### TECH-AUDIT risk detail (`605:3`)
- Left = 4 ecru cards: **EXPOSURE** (rust) / **DRIFT** (rust) / **OWNERSHIP** (ink) / **RECOVERY** (cyan),
  each mono label + Archivo SemiBold 19px finding headline + 13.5px body.
- Right = teal **SYSTEM PROFILE** panel: 30px white system name + 4 mono-labelled fields
  (STATUS / RISK / CONSUMERS / REMEDY, accent labels + white values) + bottom pull-quote.

### TECH-ARCHITECTURE system map (`606:2`) — STRUCTURAL OUTLIER
- Body = **3 swimlane rows** (`gap 74px`) each labelled by an ecru 120px row chip (PEOPLE / APPLICATIONS /
  SYSTEMS OF RECORD) followed by node cards (`bg=color/paper`, `border-2.5px` `#141414` solid; the proposed
  node "Intent Router" uses `border-cyan dashed`). Each node: Archivo SemiBold 22px name + mono role tag +
  body 14.5px + mono `SOURCE:` line.
- **Connectors are absolute-positioned SVG/raster** (`imgLine*`, `imgVector*` assets + literal
  `bg=color/ink`/`color/cyan`/`color/accent` rectangles at fixed x/y), plus a legend row (DATA FLOW TODAY /
  PROPOSED INTENT LAYER / THE MISSING INTEGRATION) and an `accent-pale` "THE MISSING INTEGRATION" callout
  with an X-marker. This is the ONLY frame in the set that uses absolute coordinates + rasterized line
  assets rather than pure auto-layout — flagged below as a collision-risk + token-fidelity deviation.

### PRD (`607:4` requirements shown; family of 4)
- **01 user stories** `607:2`, **02 story detail** `607:3`, **03 requirements** `607:4`,
  **04 milestones/risks/sign-off** `607:5`.
- **03 requirements**: 3 equal `flex-1` ecru columns with `border-t-4` top accent encoding lane
  (`cyan`=FUNCTIONAL, `ink`=NON-FUNCTIONAL, `rust`=OUT OF SCOPE); each row = mono code chip
  (FR-/NFR-/OOS-, 52px fixed) + Archivo 14px body.
- **04 milestones**: top row = 4 milestone cards (`border-t-4`, accent on M1 / hairline on M2-4) with mono
  MN label + Archivo 21px name + body + bottom-pinned `EXIT ·` cyan mono line. Bottom = 2-col
  (left ecru **RISK REGISTER** with rust left-bar entries; right teal 520px **SIGN-OFF** with 4 named owners).

### PRD-DENSE (`614:9`)
- **2 deep feature cards** (`gap 24px`, each `flex-1`, `border-t-3` `color/ink`): header row = `font/display`
  **Saira Condensed** SemiBold 48px accent numeral + Archivo SemiBold 25px name + ink chip "MUST HAVE"
  (accent text) + mono **USER STORY** label + Archivo Italic 17px story + mono **ACCEPTANCE CRITERIA** +
  4 cyan-square bullet rows + hairline-top footer with mono `DEPENDS ON:` (grey) / `SIGNAL:` (cyan).
- Kicker is **accent** (not cyan); takeaway band is **ink** (dark, not accent). Dense = denser per-card
  content, not smaller global shell.

## Token + font binding contract (var() bindings observed)

Colors (all `var(--color/*)`): `rail` #0d0d0d, `ink` #141414, `accent` #b8b800, `cyan` #00b7c3,
`rust` #cc6644, `teal` #115054, `ecru` #f2f1ea, `paper` #ffffff, `grey` #73757a, `hairline` #ddddd6,
`on-accent` #0d0d0d (NXT) / #ffffff (NU), `slate` #3a4a66 (roadmap horizon bar), `accent-pale` #f5f5c8
(tech-arch missing-integration callout). Booleans `brand/is-nxt` / `brand/is-nu` drive logo visibility.

Fonts (all `var(--font/*)`): `font/heading` = Archivo (SemiBold/Bold), `font/body` = Archivo
(Regular/Italic/Medium), `font/mono` = IBM Plex Mono (Medium/SemiBold/Bold), `font/display` = Saira
Condensed (only seen on PRD-DENSE numerals). In NU mode all four resolve to **Lato** (single-typeface).

Grid: `grid/columns` 12, `grid/gutter` 24 (bound on the base frame; content sub-frame is the rail-offset zone
172 → 1832, width 1660).

Logo: `nxt-logo`/`Brand/Logo · masthead` (619:2) instance, top-right; wordmark visible<-`brand/is-nxt`,
red-N monogram visible<-`brand/is-nu`. Verified flipping in NU instance 625:2262.

## MANIFEST CORRELATION

Source: `hic-workspace/wiki/brand/figma-node-map.md`.

- **DRIFT — node IDs stale (all five artifacts).** The manifest's NU-uplift build log (2026-06-10) and the
  "NXT MIRRORS COMPLETE (P6)" entry list raw-frame IDs: roadmap `290:2`, competitive `291:2`, persona-detail
  `292:2`, prd `295:2`+`296:2`, tech-audit `297:2`, strategy `298:2`, prd-dense `322:50`. These are the
  pre-componentization frame IDs. The 2026-06-15 "COMPONENTIZED DESIGN SYSTEM + MODES" pass converted every
  top-level template frame to a COMPONENT (new IDs 599–607, 614) and the old frame IDs now appear only as the
  inner Rectangle/dot-mark children (e.g. `290:3` rail, `298:3` rail, `297:3` rail, `295:3`/`296:3` rails,
  `322:51` dense rail) inside the new components. The manifest table was never updated with the component IDs.
  **Fix: update figma-node-map.md with the 599:2/599:3, 604:2/604:3, 605:2/605:3, 606:2, 607:2-5, 614:9
  component IDs + their NU-mode instance IDs (625:2262 … 626:1165).**
- **DRIFT — tech-architecture NXT page ID was absent from the manifest.** Manifest only carried NU
  `tech-architecture 70:159/70:2`. NXT page is **`156:159`**, component **`606:2`**, NU-mode instance
  **`625:3115`**. (The 2026-06-10 log's "70:2 -> GOLD · tech-architecture (nu) · 01 system map" rename refers
  to the now-unused legacy NU file `z2v9Pvhg…`, which is reference-only per the 2026-06-15 architecture
  decision.) **Add the NXT IDs to the manifest.**
- **CONFIRMED — single-file / NU-as-a-mode.** The 2026-06-15 manifest claim that NU is a mode flip (not a
  separate file/copy) is verified live: NU instances render correct navy/red/teal/Lato/white-on-red purely by
  the 535:0 mode. No separate NU frames for these artifacts exist in the live file.
- **CONFIRMED — page set + reorg.** Manifest "Page locations" lists strategy 148:159, tech-audit 153:159,
  roadmap 126:159, prd 161:159 — all match. prd-dense 322:49 matches.
- **DEVIATION (latent) — tech-architecture absolute SVG connectors.** The manifest's standing GRAPHIC-
  COLLISION ban (".claude/CLAUDE.md") and the "GOLD matrices must be auto-layout, not absolute x/y"
  (2026-06-10) rule are not honored by `606:2`: its connector lines are absolute-positioned rasterized
  `imgLine/imgVector` assets + fixed-coordinate `color/*` rectangles overlaid on the swimlane grid. This is
  the one frame at collision risk if node text reflows. Not a node-map error, but worth a note in the
  tech-architecture pattern page (`design-system/patterns/arch.md`) that the connector layer is hand-placed.
- **MINOR — literal-hex residue.** Roadmap base (`599:2`) MEASURE/DONE-WHEN borders use literal
  `border-[#cc6645]` / `border-[#00b7c3]` and tech-arch node borders use literal `#141414` rather than
  `var(--color/rust|cyan|ink)`. These won't recolor under NU mode (will stay NXT-tinted). Re-bind to tokens
  on the next authoring pass.

## NOT-LOCATED

None. All six targets (roadmap, strategy, tech-audit, tech-architecture, prd, prd-dense) located and
harvested. Tech-architecture, flagged "not clearly in the manifest table", was discovered at page
`156:159` / component `606:2`.
