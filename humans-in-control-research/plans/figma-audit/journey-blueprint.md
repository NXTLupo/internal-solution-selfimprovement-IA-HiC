# Figma Brick Contract — JOURNEY + SERVICE-BLUEPRINT

Harvested 2026-06-16 from the single dual-mode file `iSQhAVM7SI4QHAWB7y9C2z`
(NXT = default mode `221:0`; NU = mode `535:0`). Read-only Figma MCP
(get_metadata / get_design_context / get_screenshot / get_variable_defs).

Purpose: feed a runtime component/token-driven assembly engine. Every region below is a
reusable BRICK; every visible value resolves to a `var(--color/*)` / `var(--font/*)` token,
never a literal. Brand = a token-mode flip (NXT 221:0 <-> NU 535:0), NOT a separate file.

---

## Token vocabulary (shared substrate, both deliverables)

Confirmed via get_variable_defs on the live nodes. Brand divergence is a pure mode-swap:

| token | NXT (221:0) | NU (535:0) | role in bricks |
|---|---|---|---|
| `--color/rail` | `#0d0d0d` | `#0e1626` | 92px left rail, phase-header fill, takeaway dark band, line-of-* separator bars |
| `--color/ink` | `#141414` | `#16233c` | title, body text, dark KPI tile, phase-header text-on-dark |
| `--color/accent` | `#b8b800` (chartreuse) | `#c8102e` (red) | critical-phase header (WAIT), takeaway band fill, dot-mark, frontstage signal squares |
| `--color/on-accent` | `#0d0d0d` (black) | `#ffffff` (white) | text ON accent fills (accessibility: never black-on-red) |
| `--color/cyan` | `#00b7c3` | `#1d6e64` (NU teal) | kicker/eyebrow, line-of-visibility, KPI dashboard labels, channel/emotion micro-line |
| `--color/rust` | `#cc6644` | `#c8102e` | PAIN POINTS label + pain text; verbatim-quote left border (`#cc6645`/`#cc6644`) |
| `--color/grey` | `#73757a` | `#73757a` | sub-labels (SCOPE/ACTORS), source attributions, lane descriptors |
| `--color/ecru` | `#f2f1ea` | `#f2f1ea` | cell fill (matrix body, KPI light tiles, blueprint lanes) |
| `--color/pale` | `#fafaf7` | `#faf9f4` | journey-cell fill (T3 6x4 matrix) |
| `--color/paper` | `#ffffff` | `#ffffff` | slide bg, header-text on dark |
| `--color/teal` | `#115054` | `#a4804a` (gold) | (in-table base) PERSONAS + OPPORTUNITIES labels |
| `--color/graphite` | `#262626` | — | (in-table base) lane-cell body text |
| `--color/rule-warm` | `#b8b8b0` | `#c9c7bd` | "not engaged" muted cell text |
| `--color/accent-pale` | `#f5f5c8` | (mode) | blueprint frontstage/backstage signal-cell wash |
| `--font/heading` | Archivo (SemiBold) | Lato | titles, lane labels, phase headers, KPI values |
| `--font/body` | Archivo (Reg/Med/Italic) | Lato | cell body, quotes, takeaway |
| `--font/mono` | IBM Plex Mono | Lato | kicker, SCOPE/ACTORS meta, SOURCE lines, signal squares |
| `--grid/columns` / `--grid/gutter` | 12 / 24 | 12 / 24 | rail-offset 12-col grid (content zone 172->1840) |

Logo brick: `Brand/Logo · masthead` component (file-level 619:2 / instance head `619:3`,
named `wordmark`), top-right ~`left:1636-1684 top:23-58 w:156 h:44`. Visibility driven by
`brand/is-nxt` (NXT wordmark) vs `brand/is-nu` (red-N monogram). Flips by mode, not by node.

---

## JOURNEY — page 75:2 `GOLD · journey (nxt)`

Symbols on page: base `595:2` (analyzed by lead, NOT re-pulled), PPTX twin `595:3`,
T2 `595:4`, T3 `595:5`, in-table base `595:6`. NU instances (mode 535:0):
`625:785` (base), `625:951` (PPTX twin), `625:1082` (T2), `625:1263` (T3), `625:1426` (in-table base).

Shared frame: 1920-wide (T3 is 1920x1560, all others 1080-tall). 92px `--color/rail` left
rail; 3x3 `--color/accent` dot-mark bottom-left at `left:30 top:990`; logo top-right.

### VARIANT — Journey T2 `595:4` (NU `625:1082`) — "richer evidence, touchpoint + emotion per cell"

Auto-layout 5-col x rows. Cell-internal evidence is the differentiator.

| content field | brick / region (node) | token bindings |
|---|---|---|
| kicker eyebrow | `244:19` "CUSTOMER SUPPORT · CURRENT STATE" | font/mono SemiBold 18, text `--color/cyan`, tracking 6px |
| action title | `244:20` (contestable sentence) | font/heading SemiBold 40, `--color/ink`, w1180 |
| meta strip | `244:21` SCOPE/ACTORS/PHASES | label font/mono 10.5 `--color/grey`; value font/body Medium 14 `--color/ink` |
| phase header row | `244:32` (5 cells `244:34..42`) | header fill `--color/rail`, text `--color/paper`; CRITICAL phase (WAIT `244:40`) fill `--color/accent`, text `--color/on-accent`; font/mono SemiBold 14 track 3px |
| lane rows (Customer / Support Agent / Product Team) | `244:44`/`244:73`/`244:102`, each = anchor label col w158 + 5 FILL cells | cell fill `--color/ecru`; lane label font/mono SemiBold 12 `--color/ink` + descriptor font/body 10.5 `--color/grey` |
| per-cell ACTION line | (first child of each cell, e.g. `244:49`) | font/body Reg 13 `--color/ink`, leading 1.4 |
| per-cell VERBATIM QUOTE + SOURCE | nested block w/ `border-l-2` `#cc6645` (`--color/rust`), e.g. `244:50` | quote font/body Reg 11.5 `--color/ink`; SOURCE font/mono Reg 9 `--color/grey` track 0.5 |
| per-cell CHANNEL · EMOTION micro-line | e.g. `245:2` "PORTAL · Hopeful 58" | font/mono Medium 10; channel token text `--color/cyan`, emotion grey. NOTE: emotion word is QUALITATIVE per Quantitative-Claim Rule; the trailing number is a heat value not a metric claim |
| PAIN POINTS row | `244:131` anchor `244:132` + 5 cells | row fill `--color/ecru`; label font/mono SemiBold 11 `--color/ink`; pain bullets in `border-l-2` rust block, font/body Reg 12 `--color/ink` |
| takeaway band | `244:159` (single bold phrase `244:160`) | fill `--color/accent`, text `--color/on-accent`; font/body Reg 22, emphasis span SemiBold |

### VARIANT — Journey T3 `595:5` (NU `625:1263`) — "+4th lane + KPI dashboard, taller (1560)"

Adds a KPI dashboard band above the matrix and a 4th actor lane. Matrix is a clean
auto-layout 6x4 (`267:2`, named "journey-matrix (auto-layout 6x4)") — no embedded
evidence in cells (lighter than T2), evidence lives in the dashboard.

| content field | brick / region (node) | token bindings |
|---|---|---|
| kicker / title / meta | `247:19` / `247:20` / `247:21` | same token pattern as T2 |
| KPI dashboard | `250:2` "KPI dashboard" | label font/mono Medium 12 `--color/cyan` |
| dashboard cols PERSONAS / OVERALL PAIN POINTS / STRATEGIC OPPORTUNITIES | `250:5` / `250:10` / `250:15` (3 FILL cols) | col headers: PERSONAS+OPPS font/mono Medium 11 `--color/cyan`; PAIN font/mono `--color/rust`; items font/body Reg 13 `--color/ink` (each item carries a named `(Source)` inline) |
| KPI tiles (3) | `251:2` row; tile1 `251:3` dark, tiles 2-3 `251:7`/`251:11` light | dark tile fill `--color/ink`, eyebrow `--color/accent`, value `--color/paper`; light tiles fill `--color/ecru`, eyebrow+sub `--color/grey`, value `--color/ink`; value font/heading SemiBold 30; eyebrow/sub font/mono Medium 10 |
| phase header row (6 cols) | `267:3` cells `267:5..15`; label-spacer `267:4` w158 | header fill `--color/ink`, text `--color/paper`; CRITICAL (WAIT `267:11`) fill `--color/accent` text `--color/on-accent`; font/heading SemiBold 13 |
| 4 lane rows CUSTOMER / SUPPORT AGENT / PRODUCT TEAM / QUALITY OPS | `267:17` / `267:27` / `267:37` / `267:47` | lane label font/heading SemiBold 14 `--color/ink` + descriptor font/body 10 `--color/grey`; journey-cell fill `--color/pale`; body font/body Reg 12 `--color/ink`; "not engaged" cells text `--color/rule-warm` |
| PAIN POINTS row | `267:57` label `267:59` + pain-cells | label font/heading SemiBold 13 `--color/rust`; pain text font/body Medium 12 `--color/rust` |
| takeaway band | `247:159` (`247:160`) | fill `--color/accent`, text `--color/on-accent`, font/body Reg 22 + emphasis span |

### VARIANT — Journey in-table base `595:6` (NU `625:1426`) — "2026-06-12 redesign, matrix IS the body"

Single bordered matrix card `333:17` (border `#f6f6f4`), header row carries embedded
KEY FINDING signals; this is the canonical in-table journey. (Manifest twins: NXT 333:2 / NU 232:2.)

| content field | brick / region (node) | token bindings |
|---|---|---|
| kicker | `333:14` | font/mono SemiBold 14 `--color/cyan` track 3px |
| action title | `333:15` | font/heading SemiBold 40 `--color/rail`, w1560 |
| meta line | `333:16` (SCOPE/ACTORS/PHASES inline) | font/mono SemiBold 12 `--color/grey` track 1.5 |
| matrix shell | `333:17` | bg `--color/paper`, 1px border `#f6f6f4` |
| header row (5 phase cells) | `333:18`; corner `333:19` `--color/rail`; cells `333:20/24/28/30/32` | normal phase fill `--color/rail` text `--color/paper`; CRITICAL phase (FIRST SETUP `333:24`) fill `--color/rust` (whole-cell warn); KEY-FINDING cells carry eyebrow font/mono 9 `--color/accent` + value font/heading SemiBold 24 `--color/paper` |
| PERSONAS (JTBD voice) row | `333:36` anchor `333:37` + 5 cells `333:40..48` | anchor label font/heading SemiBold 13 `--color/teal` + descriptor mono 10 `--color/grey`; cell fill `--color/panel` (#f5f5f0); quote font/body Italic 12 `--color/rail` |
| actor lanes SUBSCRIBER / SUCCESS TEAM / PRODUCT | `334:2` / `334:16` / `334:30` | anchor label font/heading SemiBold 13 `--color/rail`; body font/body Reg 12 `--color/graphite`; "not engaged" text `--color/grey` |
| PAIN POINTS row | `334:44` | cells top-border 3px `#c64` (`--color/rust`); label font/heading SemiBold 13 `--color/rust`; bullets font/body Reg 11 `--color/rust` |
| OPPORTUNITIES row | `334:67` | cells top-border 3px `#00b7c3` (`--color/cyan`), fill `--color/panel`; label `--color/teal`; bullets `--color/graphite` |
| takeaway band | `334:80` (`334:81`) | fill `--color/rail`, text `--color/paper`, font/heading SemiBold 21 |

> JOURNEY logo nodes: T2 `620:52`, T3 `620:57`, in-table base `622:60` — all `wordmark` child `619:3`.

---

## SERVICE-BLUEPRINT — page 72:2 `GOLD · service-blueprint (nxt)`

> DRIFT: prompt said substrate is "around 286:2"; metadata shows the page base is **`608:2`**
> and the T2 substrate is **`608:4`** (`287:2` is its inner matrix). `286:x` is the OLD node id
> for the T2 substrate body (still referenced in the manifest log); the live symbol id is `608:4`.

Symbols: base `608:2`, PPTX twin `608:3`, T2 auto-layout substrate `608:4`.
NU instances (mode 535:0): `625:3610` (base), `625:3784` (PPTX twin), `625:3935` (T2).

### VARIANT — Blueprint base `608:2` (NU `625:3610`) — full Bitner blueprint w/ emotion curve

Dense vertical stack inside `72:20`: header + phase columns (NOTICE/SEARCH/CONTACT/WAIT/RESOLVE,
210px label col + 5x 286px phase cols), CUSTOMER EMOTION curve (SVG), then Bitner lanes
separated by black LINE-OF-* bars. Logo `620:132`.

| content field | brick / region (node) | token bindings |
|---|---|---|
| kicker | `72:21` "CUSTOMER SUPPORT · SERVICE BLUEPRINT" | font/mono SemiBold 19 `--color/cyan` track 6px |
| action title | `72:23` | font/heading SemiBold 48 `--color/ink` track -0.5, w1180 |
| phase header labels | `72:27`(SERVICE LAYER, w210) + `72:29/31/33/35/37` (w286) | font/mono SemiBold; layer-label 13 `--color/grey` track 3, phase 15 `--color/ink` track 4 |
| CUSTOMER EMOTION row | label `72:40`; curve frame `72:42` (Vector `72:44` + Group `72:45` SVG) + emotion words `72:52..56` | row fill `--color/ecru`; emotion words font/mono Bold 12.5 `--color/accent` (QUALITATIVE: ANNOYED/STALLED/FRUSTRATED/DRAINED/RESIGNED). **SVG curve = raster/vector graphic brick (kept by design)** |
| TOUCHPOINTS lane | label `72:58` + 5 cells `72:60..68` | label font/mono SemiBold 13.5 `--color/ink` track 2; cell fill `--color/ecru`; body font/body Reg 14.5 `--color/ink`. (Per Evidence-Label rule this is the "channels" lane, labeled TOUCHPOINTS not Evidence.) |
| CUSTOMER ACTIONS lane | label `72:71` + cells `72:73..85` (each: action + grey sub-note) | body font/body Reg 14.5 `--color/ink`; sub-note font/mono Reg 11 `--color/grey` track 0.6 |
| LINE OF INTERACTION bar | `72:88` | fill `--color/rail`; text font/mono SemiBold 12.5 `--color/ecru` track 5 |
| FRONTSTAGE lane | label `72:91` + cells `72:93..105` | cell fill `--color/ecru`; FAILURE cells wash `--color/accent-pale` (#f5f5c8) + signal square `■` font/mono SemiBold 11 `--color/accent` track 1 (e.g. `72:95` ABSORBS SELF-SERVE VOLUME, `72:101` MISROUTES BY DEFAULT, `72:104` CONTEXT RESETS) |
| LINE OF VISIBILITY bar | `72:108` | fill `--color/rail`, text `--color/ecru` |
| BACKSTAGE lane | label `72:111` + cells `72:113..127` (each: mono system-name + body) | system-name font/mono SemiBold 11 `--color/grey` track 2; body font/body Reg 14.5 `--color/ink` |
| LINE OF INTERNAL INTERACTION bar | `72:128` | fill `--color/rail`, text `--color/ecru` |
| SUPPORT lane | label `72:131` + cells `72:133..144` | body `--color/ink`; failure cells wash `--color/accent-pale` + accent signal square (`72:139` FOLKLORE AS ROUTING, `72:144` NO FEEDBACK PATH) |
| CUSTOMER VOICE row | `95:2`; label `95:3` + 5 quote cells `95:5..21` | cell fill `--color/ecru`; quote in `border-l-2` `#cc6645`(`--color/rust`) block, font/body Reg 11.5 `--color/ink`; SOURCE font/mono Reg 9 `--color/grey` (named: CUSTOMER INTERVIEWS / APP STORE REVIEWS / SUPPORT TICKET ANALYSIS / G2 REVIEWS) |
| takeaway band | `72:145` (`72:146`) | fill `--color/accent`, text `--color/on-accent`, font/body Reg 22 + emphasis span |

### VARIANT — Blueprint T2 substrate `608:4` (NU `625:3935`) — "auto-layout 5 phases x 5 lanes"

Clean auto-layout matrix `287:2` (named "blueprint-matrix (auto-layout 5x5)"); add a phase
(column) or lane (row) and it reflows collision-free. This is the EXTENSIBLE substrate brick.
No emotion SVG; line-of-visibility is a thin cyan rule row, not a black bar.

| content field | brick / region (node) | token bindings |
|---|---|---|
| kicker | `286:18` "SERVICE BLUEPRINT · SUPPORT RESOLUTION" | font/mono SemiBold 18 `--color/cyan` track 5 |
| action title | `286:19` | font/heading SemiBold 40 `--color/ink` track -0.5, w1180 |
| meta strip MODEL / LANES / SUBSTRATE | `286:21` / `286:24` / `286:27` | label font/mono SemiBold 10.5 `--color/grey`; value font/body Medium 14 `--color/ink` |
| phase header row | `287:3`; spacer `287:4` w158; cells `287:5/7/9/11/13` | header fill `--color/ink` text `--color/paper`; CRITICAL (WAIT `287:11`) fill `--color/accent` text `--color/on-accent`; font/heading SemiBold 13 track 1 |
| lane row CUSTOMER ACTION | `287:15`; label `287:16` (mono 11 + descriptor) + 5 FILL bp-cells `287:19..27` | lane-label fill `--color/ecru`, name font/mono SemiBold 11 `--color/ink` + descriptor font/body 10 `--color/grey`; cell fill `--color/ecru`, body font/body Reg 12.5 `--color/ink` leading 1.35 |
| lane row TOUCHPOINTS | `287:29` (label `287:30`) + cells `287:33..41` | same; "channels in play" descriptor |
| LINE OF VISIBILITY separator | `287:43` (label `287:44` + rule `287:45`) | label font/mono SemiBold 9 `--color/cyan` track 1.5; 2px rule fill `--color/cyan` |
| lane row FRONTSTAGE | `287:46` (label `287:47`) + cells `287:50..59` | "not engaged" cell text `--color/rule-warm`; else `--color/ink` |
| lane row BACKSTAGE | `287:60` (label `287:61`) + cells `287:64..73` | "hidden process" descriptor |
| lane row SUPPORT | `287:74` (label `287:75`) + cells `287:78..87` | "systems and data" descriptor |
| takeaway band | `287:88` (`287:89`) | fill `--color/accent`, text `--color/on-accent`, font/body Reg 22 leading 1.48 |

> BLUEPRINT logo nodes: base `620:132`, T2 `622:164` — all `wordmark` child `619:3`.

---

## NU mode-flip CONFIRMATION (screenshots + variable defs)

- Journey T3 NU `625:1263`: get_variable_defs returns `rail #0e1626, accent #c8102e,
  brand/is-nu:true, cyan #1d6e64, fonts Lato, on-accent #ffffff` — same token KEYS as NXT,
  flipped VALUES. Screenshot rendered navy rail / red WAIT column / NU-teal dashboard labels /
  red-N monogram / white-on-red takeaway. Confirmed: brand = pure mode flip, geometry identical.
- Blueprint base NU `625:3610`: screenshot rendered navy rail / red critical-phase + signal
  squares / NU-teal kicker / Lato / red-N logo / white-on-red takeaway. Confirmed.

So the bricks are brand-agnostic: the assembly engine emits geometry + token references; the
brand mode supplies values. `--color/on-accent` is the load-bearing accessibility token
(black on NXT chartreuse, WHITE on NU red — never black-on-red).

---

## MANIFEST CORRELATION (figma-node-map.md)

Manifest = `hic-workspace/wiki/brand/figma-node-map.md`. Comparison to live nodes:

| artifact | manifest says | live (this audit) | verdict |
|---|---|---|---|
| journey in-table base (NXT) | `333:2` (matrix 333:17, takeaway 334:80), file iSQhAVM7 | symbol `595:6`; inner matrix `333:17` + takeaway `334:80` MATCH | DRIFT (partial): manifest lists the in-table base only as `333:2`; the live page wraps it as symbol `595:6` and there are TWO newer variants (T2 `595:4`, T3 `595:5`) the manifest's JOURNEY section does NOT list. Child node ids (333/334) still valid. |
| journey in-table base (NU) | `232:2` in the SEPARATE NU file `z2v9Pvhg…` | live NU is instance `625:1426` (mode 535:0) of the single file iSQhAVM7 | DRIFT: manifest still points NU journey to the legacy separate file/node `232:2`; per the 2026-06-15 single-file decision the live NU source is the mode-535:0 instance in iSQhAVM7. Legacy `232:2` is reference-only. |
| journey T2 / T3 | T2 `160:2`/`161:2` + T3 `156:2`/`159:2` listed only for the **NU file** `z2v9Pvhg`; NXT mirror `247:2/267:2` mentioned in prose | live NXT T2 `595:4`, T3 `595:5` (matrix `267:2`); NU T2 `625:1082`, T3 `625:1263` | DRIFT: manifest has no row for the iSQhAVM7 journey T2/T3 SYMBOLS (`595:4`/`595:5`) or their NU mode instances; only the legacy NU-file nodes + NXT prose mention. Matrix node `267:2` is correctly referenced in prose. |
| blueprint base (NXT) | "blueprint auto-layout substrate **286:2** (page 72:2)" | live base `608:2`; T2 substrate `608:4` (inner matrix `287:2`); `286:x` is now only inner-node ids | DRIFT: manifest's `286:2` is stale — the live page base symbol is `608:2` and the T2 substrate symbol is `608:4`. `286:3..16` survive as child nodes of `608:4`. Update manifest to base `608:2` / T2 `608:4`. |
| blueprint base/T2 (NU) | NU-file `162:2`/`164:2` (separate file) | live NU base `625:3610`, T2 `625:3935` (mode 535:0, single file) | DRIFT: same legacy-file pointer problem as journey. Live NU = mode instances in iSQhAVM7. |
| tokens / modes | "NXT Brand Tokens 221:2 has modes NXT 221:0 + NU 535:0" | confirmed live (get_variable_defs flips by mode) | MATCH |
| logo masthead | `Brand/Logo · masthead` `619:2`, wordmark<-is-nxt / monogram<-is-nu | live logo instances carry `wordmark` child `619:3`; visibility by brand boolean | MATCH |

NET: token/mode/logo model is accurate; **node-id rows for journey + blueprint are stale**.
The manifest predates (a) the `595:*` / `608:*` symbol wrapping on the NXT pages and (b) the
single-file NU-as-a-mode consolidation. The JOURNEY section (#c19) and NU-uplift log (#c9) still
cite the legacy separate-NU-file node ids. Recommend a manifest re-chunk to register:
journey symbols 595:2/4/5/6 (+NU 625:785/1082/1263/1426) and blueprint 608:2/3/4 (+NU 625:3610/3784/3935),
and to mark the `z2v9Pvhg` journey/blueprint nodes reference-only.
