# Figma Foundation + ORG/SLIDES/Phase-Spotlight Audit

Read-only Figma MCP audit of file `iSQhAVM7SI4QHAWB7y9C2z` (NXT default mode `221:0`; NU = mode `535:0`).
Purpose: feed a runtime component/token-driven assembly engine. Audited 2026-06-16.

Scope covered: foundation tokens (223:2 / collection 221:2), Brand/Logo masthead component (619:2),
grid + Layout Density (537:2), ORG (page 299:2 / component 610:2), SLIDES system (page 324:2),
journey-phase-spotlight (page 323:2 / component 614:11). Correlation against
`hic-workspace/design-system/figma-tokens.json` and `wiki/brand/figma-node-map.md`.

---

## (a) Token / variable table + figma-tokens.json correlation

### MCP read limitation (important)
The Figma PAT lacks `file_variables:read` (Enterprise-gated). `get_variable_defs` therefore returns
ONLY the variables *bound to the queried node*, and the variable-collection node `221:2` is NOT
addressable (`get_variable_defs 221:2` -> invalid node ID). So the full color/font/space/type/track
variable set and a raw both-modes dump are NOT MCP-enumerable. This is the documented refresh
constraint in `figma-tokens.json._meta.refresh_protocol`. Token values were instead verified two ways:
1. `get_variable_defs 223:2` (the NXT swatch frame) -> the 12 core colors.
2. The componentized deliverables (610:2, 614:11, 609:x) render every fill/font as a bound CSS
   variable reference (`var(--color/accent,#b8b800)`, `var(--font/display,'Saira_Condensed:SemiBold')`),
   which is direct in-context proof the tokens exist and are wired live.

### Core color tokens read live from `get_variable_defs(223:2)` (NXT mode 221:0)

| Variable | NXT value (read) | figma-tokens.json NXT | Match |
|---|---|---|---|
| color/rail | #0d0d0d | #0D0D0D | yes |
| color/ink | #141414 | #141414 | yes |
| color/accent | #b8b800 | #B8B800 | yes |
| color/cyan | #00b7c3 | #00B7C3 | yes |
| color/rust | #cc6644 | #CC6644 | yes |
| color/teal | #115054 | #115054 | yes |
| color/success | #0cce6b | #0CCE6B | yes |
| color/error | #ff5a5a | #FF5A5A | yes |
| color/paper | #ffffff | #FFFFFF | yes |
| color/ecru | #f2f1ea | #F2F1EA | yes |
| color/grey | #73757a | #73757A | yes |
| color/hairline | #ddddd6 | #DDDDD6 | yes |

VERDICT: the 12 MCP-readable core color variables match `figma-tokens.json.NXT.color` exactly (0 drift).
The JSON additionally carries ~21 renderer-semantic keys per mode (on-accent, pale, muted, body,
secondary, panel, band, band-text, kicker, source, warn, wash-warn, wash-cool, accent-bright,
accent-pale, teal-dark, status-red, graphite, rule-warm, slate, rule-mid). Per `_meta.nu_provenance`
these are a ROLE-keyed renderer contract, NOT a 1:1 mirror of Figma var names; several have no Figma
var at all (kicker/band/source/gold/warn). That is intentional, not drift. The JSON is the runtime carrier.

### Font / type / space tokens (confirmed via bound references in components)

- `font/display` = Saira Condensed SemiBold (NXT) | Lato (NU) — confirmed in cover 609:2 + phase-spotlight.
- `font/heading` = Archivo Bold/SemiBold (NXT) | Lato (NU) — confirmed in every component.
- `font/body` = Archivo Regular/Medium (NXT) | Lato.
- `font/mono` = IBM Plex Mono (NXT, kicker/source/tier-label) | Lato (NU single-typeface).
- Type scale, track, and space are present in `figma-tokens.json` (type.scale label17..display60, track
  kicker4/label1.5/title-0.5, space rail92/contentLeft172/contentWidth1660). Rendered sizes in the
  components corroborate the scale (kicker 18px tracking 5px, title 40px, body 21px, source 9-13px mono).

### Both-modes note
NXT (221:0) and NU (535:0) live on ONE collection. NU values are sourced from mode 535:0 and stored in
`figma-tokens.json.NU.*`. Two intentional renderer-semantic overrides documented in `_meta`: NU `teal`
key = #16233C (navy header slot), while the mode's raw color/teal var = #A4804A (gold) lives under the
`gold` key. Do NOT overwrite. NU mode-flip verified visually (see logo + org below): navy rail #0E1626,
red accent #C8102E, NU-teal #1D6E64, white-on-red takeaway, Lato.

---

## (b) Logo-component contract

`Brand/Logo · masthead` COMPONENT `619:2` (156x44). This is the single canonical masthead logo;
the 2026-06-15 build swapped 53 mastheads to instances of it.

- get_design_context(619:2) renders ONE child `wordmark` (619:3) as an image asset — the "NXT HUMANS"
  wordmark in the display face. Screenshot confirms the wordmark glyphs.
- The NU red-N monogram layer is NOT visible in the default render because the component is queried in
  the default NXT mode (brand/is-nxt = true). The flip mechanism is the boolean pair
  `brand/is-nxt` / `brand/is-nu` driving layer visibility: NXT mode shows the wordmark, NU mode
  (535:0) hides the wordmark and shows the red-N monogram.
- CONTRACT CONFIRMED VISUALLY: the NU org instance (626:485) screenshot shows the red-N monogram in
  the top-right where the NXT wordmark sits — i.e. flipping the layer's NXT Brand Tokens mode to NU
  swaps wordmark -> red-N monogram with no other edit. Exactly as figma-node-map prose + figma-tokens.json
  `NU.logo.monogram` (vector viewBox 0 0 64 53, fill #C8102E) describe.
- Instances appear in deliverables as `nxt-logo` nodes referencing `619:3` (e.g. org 622:169, phase-spotlight 622:229).
- Runtime carrier: NXT wordmark is typeset (no vector asset; figma-tokens.json NXT.logo.type="wordmark",
  Saira Condensed SemiBold tracking 1px); NU monogram is the inline SVG in figma-tokens.json NU.logo.monogram.

---

## (c) Grid / density contract

NOTE: `Layout Density` collection (537:2) and the named grid styles are also NOT MCP-enumerable
(same file_variables:read gate). Contract reconstructed from figma-node-map prose + figma-tokens.json
`_grid` + the rail/offset geometry observed live in every component.

### Page grid (observed live, consistent across all components)
- GOLD artifact rail = 92px (org 299:4, phase-spotlight 323:4 both `w-[92px]`).
- SLIDES-system rail = 128px (cover/stat-row `w-[128px]`) — distinct deck chrome, as documented.
- content starts at left 172px, content width 1660px (172 -> 1832, ~80px right margin) — matches
  figma-tokens.json `_grid.page` (rail 92, contentLeft 172, contentWidth 1660, marginRight 80, top 58).
- 3x3 dot-mark bottom-left at top 990px, 12px squares / 6px gap (org 299:5, phase-spotlight 323:5) —
  matches space.dotSize 12 / dotGap 6.
- takeaway band: full content width 1660, ink fill, px-48 py-24 — matches space.bandPadX/Y/Height.

### Named Figma grid styles (per node-map prose, not MCP-verifiable)
- `16:9 Slide · 12-col (rail-offset)` — COLUMNS MIN, offset 172 after the 92px rail; apply to full-bleed
  1920 template frames so the 12-col content grid lands in 172->1840. Every componentized template carries it.
- `16:9 Content · 12-col` (COLUMNS STRETCH) + `16:9 Baseline · 8px`.

### Layout Density collection 537:2 (modes standard / compact / dense) — per node-map prose
- grid/columns 12, grid/gutter 24/20/16, grid/baseline 8, count/items-per-row 3/4/6,
  type/scale-step 0/0/-1, plus space/section-gap, space/block-gap, space/card-pad.
- figma-tokens.json `_grid.breakpoints` carries the responsive grid (xs360..2xl1440, maxContentWidth 1440)
  and `_grid.journeyMatrix` carries the auto-layout matrix extension rules.

RUNTIME NOTE: the SPA does NOT instance Figma at runtime. Brand (NXT|NU) + density (base|dense) are
produced by the code renderers (slideToStageHtml.ts export + web.tsx preview), grounded by the tokens
the proxy injects from figma-tokens.json. Figma modes are the design canon; the JSON is the carrier.

---

## (d) ORG / SLIDES / phase-spotlight brick anatomy

### ORG — page 299:2 "GOLD · org (nxt)"; component 610:2 (NXT symbol) + NU instance 626:485
- Tier-matrix as nested vertical auto-layout (`org-tiers` 299:21, 660px): three horizontal tier rows.
- TIER 1 · DECIDES (single card, decision authority): ecru card with `border-t-4` ACCENT top-border
  (red in NU) — the only accent-bordered node = decision authority signal.
- TIER 2 · DIRECTS (3 cards) + TIER 3 · DELIVERS (4 cards): ecru cards, hairline border, FILL width.
- tier-label gutter 150px (IBM Plex Mono 11px grey, tracking 1.5px); hairline tier-connectors (2px) between rows.
- Every card: Archivo SemiBold name 19px / Archivo body 13px / spacer / IBM Plex Mono teal SOURCE line 9px.
- ink takeaway band (299:75, full 1660 width). 92px rail, 3x3 accent dot-mark, Brand/Logo instance 622:169.
- Token-bound throughout; adding a node = add a card to the row (auto-layout reflow, collision-free).

### SLIDES — page 324:2 "GOLD · slides (nxt)"; 14 archetypes, fully componentized
Each archetype is a NXT `<symbol>` (609:2..609:15) with a materialized NU `<instance>` twin beside it
(626:x at x=2220). Distinct deck chrome from GOLD artifacts: 128px rail, accent dot grid bottom-left.
Archetypes: cover (609:2), agenda (609:3), section-divider (609:4), thesis-interstitial (609:5),
stat-row (609:6), block-quote (609:7), numbered-themes (609:8), evidence-table (609:9),
problem-diptych (609:10), org-model (609:11), role-needs (609:12), role-recommendation (609:13),
role-roadmap (609:14), aggregate-roadmap (609:15).
- cover 609:2: black field, Archivo Bold eyebrow 44px, Saira Condensed display 150px, rule-mid subhead.
- stat-row 609:6: 128px rail, cyan kicker (BY THE NUMBERS) 22px tracking, Saira display 58px headline,
  3 stat columns each = Saira accent numeral 120px + Archivo 28px claim + MEANS/MATTERS body 21px +
  hairline + Archivo secondary source line. Qualitative numerals shown ("10", "7 OF 10", "5").
- All fills/fonts bound to color/* + font/* vars; NU twin is a pure mode flip.

### journey-phase-spotlight — page 323:2 "GOLD · journey phase spotlight (nxt)"; component 614:11 + NU 626:1331
- 92px rail, IBM Plex Mono accent kicker (JOURNEY DEEP DIVE · PHASE SEVEN OF TEN · FIRST FAILURE) 18px
  tracking 5px, Archivo SemiBold headline 40px.
- 10-segment phase strip (323:23): equal FILL ecru chips with IBM Plex Mono grey labels; the ACTIVE
  segment (FIRST FAILURE) = ink fill + accent-text bold mono.
- Left ecru column 600px (323:44): "WHAT HAPPENS IN THIS PHASE" rust mono label + body, 3 per-actor
  hairline-top rows (CUSTOMER / FRONTLINE TEAM / OPERATIONS), spacer, then "THE STRUCTURAL PAIN"
  rust-left-border block bottom-pinned.
- Right column 1020px (323:60): "VOICES FROM THIS PHASE" grey mono label + 3 cyan-left-border quote
  cards (Archivo Medium 18px quote + IBM Plex Mono cyan attribution).
- ink takeaway band; Brand/Logo instance 622:229. Token-bound throughout.

---

## (e) OVERALL MANIFEST CORRELATION VERDICT

### The table-vs-reality drift is REAL and significant
`wiki/brand/figma-node-map.md` has TWO inconsistent layers:

1. The markdown TABLE (lines ~137-160) lists PRE-COMPONENT node IDs as the live source:
   223:2 (tokens), 366:2 (exec-brief), 212:2/217:2/260:2 (case-study), and the entire Northeastern
   FILE `z2v9Pvhg23hlljEitPBdAt` with org at 178:3. These are stale: 178:3 is INVALID in the audited
   file; the NU file is explicitly SUPERSEDED/reference-only per the architecture decision.

2. The PROSE block "COMPONENTIZED DESIGN SYSTEM + MODES (2026-06-15)" (lines ~435-456) is ACCURATE
   and matches reality: single-file NU-as-a-mode (NXT 221:0 / NU 535:0), ~29 deliverable pages
   componentized, Brand/Logo masthead 619:2, case-study components 585:2/588:4-7. This audit confirms
   the prose, NOT the table.

REALITY (this audit, file iSQhAVM7SI4QHAWB7y9C2z):
- File is organized into ~38 real Figma PAGES (canvases), one per deliverable, each named "GOLD · <type> (nxt)".
  (The pages do NOT enumerate via `get_metadata` with no nodeId — that lists only "Page 1"; the full page
  list surfaces by querying an invalid node, or pages are reachable by their GUID directly.)
- Every deliverable archetype is now a `<symbol>` (component) with a materialized NU `<instance>` twin
  at x=2220 (mode 535:0). Confirmed for org, slides (14), phase-spotlight, case-study.
- Tokens, logo, grid all bound live and consistent with figma-tokens.json (which IS current, refreshed 2026-06-15).

RECOMMENDATION: rewrite the figma-node-map TABLE to the page-based component IDs below; the table is the
only stale artifact. The prose + figma-tokens.json are trustworthy. Verified current node IDs:

| Deliverable | Page | NXT component | NU instance |
|---|---|---|---|
| org | 299:2 | 610:2 | 626:485 |
| journey phase-spotlight | 323:2 | 614:11 | 626:1331 |
| slides (14 archetypes) | 324:2 | 609:2..609:15 | 626:2..626:425 |
| case-study | 184:159 | 585:2 / 588:4-7 | (mode-flip) |
| Brand/Logo masthead | n/a (component) | 619:2 (wordmark 619:3) | mode 535:0 -> red-N |
| DESIGN TOKENS swatch | Page 1 (0:1) | 223:2 | — |

Full NXT page set (38): 5:2 NXT Design System, 62:2 gap, 66:2 recommendations, 69:2 themes,
72:2 service-blueprint, 75:2 journey, 111:159 personas, 119:159 persona-detail, 126:159 roadmap,
131:159 competitive, 148:159 strategy, 153:159 tech-audit, 156:159 tech-architecture, 161:159 prd,
184:159 case-study, 299:2 org, 300:2 presentation, 301:2 proto, 302:2 mindmap, 305:2 meta-themes,
305:50 brief, 305:95 explainer, 319:2 recommendation dense, 321:2 stat-row dense, 321:56 competitive
dense, 322:2 block-quote dense, 322:49 prd dense, 322:123 persona dense, 323:2 journey phase spotlight,
323:71 theme index, 324:2 slides, 403:2/469:2/486:2/498:101/504:320 #proto patterns vol1-5,
511:2 responsive grids.

### Could NOT locate / NOT MCP-accessible
- Full variable set across BOTH modes (file_variables:read gated) — cannot enumerate space/*, type/*,
  track/*, font/* or do a raw mode-to-mode diff via MCP. Verified indirectly via bound references only.
- `Layout Density` collection 537:2 (modes standard/compact/dense) — NOT addressable via get_variable_defs;
  contract taken from node-map prose, not independently confirmed.
- Named grid styles (rail-offset 12-col etc.) — grid styles are not MCP-enumerable; geometry confirmed
  via component layout (92/172/1660/80), style binding inferred.
- Dense-program / pre-component frame IDs in the node-map (323:3 phase-spotlight, 200:3, 178:3 org,
  366:2 etc.) — INVALID in the current file (superseded by componentization). Expected drift, documented above.
