# SLIDES-System Component Manifest — Group C: Structure + Role Archetypes

File key: `iSQhAVM7SI4QHAWB7y9C2z`. NXT = default mode; NU = mode `535:0` (token-swap only,
identical geometry). Canvas: 1920 x 1080. Coordinates are absolute px from the Figma frames; the
AI composer should treat them as a layout contract, not literal positioning (prefer CSS grid/flex
in code per the graphic-collision ban, preserving region order + sizing).

## Shared GOLD chrome (every archetype in this group)

- **Left rail** — `bg var(--color/rail,#0d0d0d)`, width **128px**, full height (1080). Present on
  all except `problem-diptych`, which is a full-bleed dark slide (`bg #0d0d0d`) with NO rail.
- **3x3 dot-mark** — nine `var(--color/accent,#b8b800)` squares, each **10.1px**, at a 24.5px grid
  starting `left 34.7px / top 986.4px`. Bottom-left, inside the rail footprint.
- **Eyebrow / kicker** — `font/heading` (Archivo Bold), 22px, `tracking 1.76px`. Color =
  `var(--color/cyan,#00b7c3)` on light slides; `var(--color/accent)` on the dark diptych. At
  `left 196px` (content gutter, just right of the rail) `top 40px`; diptych eyebrow at `left 101px / top 96px`.
- **Action title** — `font/display` (Saira Condensed SemiBold), 58px (diptych 72px), `leading 1.06`,
  color `var(--color/rail,#0d0d0d)` on light, `var(--color/paper,white)` on dark. `top 86px`.
- **Source footer** — `font/body` (Archivo Regular), 18px, `var(--color/secondary,#666)`,
  `left 196px / top 1014px`: "Sources: NXT Stakeholder Interview | Client Uploads".
- No Brand/Logo masthead instance (node `619:2`) is placed inside these six frames; the dot-mark +
  rail carry the brand. Composer may inject the masthead component above the eyebrow if required.
- **Token palette** used across group: `color/rail #0d0d0d`, `color/accent #b8b800`,
  `color/cyan #00b7c3`, `color/paper #fff`, `color/graphite #262626` (dark cards),
  `color/body #333`, `color/secondary #666`, `color/hairline #ddddd6`, `color/rule-mid #ccc`.
  Fonts: `font/display` Saira Condensed SemiBold, `font/heading` Archivo Bold, `font/body` Archivo Regular.

---

## 1. problem-diptych — NXT `609:10` / NU `626:213`

WHEN TO USE: two contrasting or paired challenges/forces presented side by side as equals. Full-bleed
dark slide. Not for 3+ items (use org-model) and not for sequenced items (use roadmap).

REGIONS (top-down): eyebrow `OUR PERSPECTIVE` (101/96) -> title (101/180, 72px) -> deck/subhead
(101/350, 26px `color/rule-mid`) -> **two cards** at `top 460`, each 840 x 420, `left 101` and `left 981`.
Each card: `bg color/graphite #262626` panel + 4px `color/accent` top rule; numeral 01/02 (72px accent);
card heading (46px paper, `leading 1.1`); card body (22px `color/rule-mid`, `leading 1.46`).

LAYOUT (proposed code): vertical stack (header block) then a 2-col grid (gap ~40px, equal cards FILL).

TOKENS: bg `#0d0d0d`; eyebrow `color/accent`; title/headings `color/paper`; numerals `color/accent`;
card bg `color/graphite`; card rule `color/accent`; body text `color/rule-mid`.

PAYLOAD:
```
{ eyebrow, title, subhead?,
  cards: [ { numeral, heading, body }, { numeral, heading, body } ] }  // exactly 2
```

---

## 2. org-model — NXT `609:11` / NU `626:236`

WHEN TO USE: a 3-column operating/organizational MODEL (peer archetypes side by side). NOT the
org-chart tier matrix (no reporting lines). Light slide with rail.

REGIONS: eyebrow (196/40) -> title (196/86, 58px) -> **three columns** at `top 240`, each 520 x 660,
at `left 196 / 752 / 1308` (gap 36px). Each column = `bg color/paper` card + 5px `color/accent` top rule,
with stacked sub-regions: column name (54px display) -> definition (21px body) -> hairline ->
`TEAMS` micro-label (15px secondary, tracked) + team list (19px) -> hairline -> `OWNED OUTCOMES`
micro-label + 2 outcome lines (19px body). Source footer.

LAYOUT: header block, then 3-col equal grid; each column a vertical auto-layout with hairline dividers.

TOKENS: bg `#fafaf7`; rail `color/rail`; eyebrow `color/cyan`; title `color/rail`; card `color/paper`;
top rule + section accents `color/accent`; dividers `color/hairline`; labels `color/secondary`; body `color/body`.

PAYLOAD:
```
{ eyebrow, title,
  columns: [ { name, definition,
              teams: { label:"TEAMS", items:[..] },
              outcomes: { label:"OWNED OUTCOMES", lines:[a,b] } } ] }  // 3
```

---

## 3. role-needs (G1 of the role trio) — NXT `609:12` / NU `626:286`

WHEN TO USE: first slide in a per-role 3-slide set (G1/G2/G3). States ONE role's current challenges
(left, numbered list) beside that role's PERSONA NEEDS (right rail card). Light slide.

REGIONS: eyebrow `ADVANCEMENT · <ROLE>` -> title (58px) -> LEFT column: `CURRENT CHALLENGES` label +
2px rail rule (196/286, w1000) then **3 numbered items** (numeral 56px accent at left 196; heading
24px rail at left 306; body 19px) at top ~312 / 502 / 692. RIGHT: persona card 560 x 624 at `left 1260 / top 256`,
`color/paper` + 5px `color/rail` top rule; `PERSONA NEEDS` label; persona name (28px); **3 need rows**
each with a 3px x 96px accent bar + cyan micro-label (EXPERIENCE / FUNCTIONAL / PERSONAL) + body line.

LAYOUT: header, then 2-col (≈2fr challenges / 1fr persona card); challenges = vertical list of
numeral+text rows; persona card = vertical auto-layout of accent-bar need rows.

TOKENS: eyebrow `color/cyan`; numerals + bars + card rule `color/accent` (card rule is `color/rail`);
micro-labels `color/cyan`/`color/secondary`; headings `color/rail`; body `color/body`.

PAYLOAD:
```
{ eyebrow, title, role,
  challenges: [ { numeral, heading, body } x3 ],
  persona: { needsLabel:"PERSONA NEEDS", name,
             needs: [ { kind:"EXPERIENCE"|"FUNCTIONAL"|"PERSONAL", body } x3 ] } }
```

---

## 4. role-recommendation (G2 of the role trio) — NXT `609:13` / NU `626:324`

WHEN TO USE: second role slide. ONE role's strategic recommendation: title + thesis + 3 supporting
actions (left), plus 3 projected-impact tiles (right). Light slide.

REGIONS: eyebrow `STRATEGIC RECOMMENDATION · <ROLE>` -> title (58px, w1000) -> thesis paragraph
(196/248, 21px body) -> `SUPPORTING ACTIONS` label + 2px rail rule (196/390, w940) -> **3 actions**
(numeral 56px accent, action heading 23px, body 18.5px) at top 416 / 596 / 776. RIGHT: `PROJECTED IMPACT`
label + 2px rail rule (1260/126, w560) then **3 stacked impact tiles**, each 560 x 230 at top 152 / 406 / 660,
`color/paper` with a 4px LEFT accent bar; tile = cyan micro-label (REVENUE / C-SAT / SERVICE NEEDS) +
26px rail headline + 18px body.

LAYOUT: header + thesis, then 2-col (≈1.7fr actions / 1fr impact tiles). Actions = numbered vertical
list; impact = vertical stack of 3 left-bar tiles.

TOKENS: eyebrow `color/cyan`; numerals + action accents + tile left-bar `color/accent`; rules `color/rail`;
tile micro-labels `color/cyan`; headings `color/rail`; body `color/body`; tiles `color/paper`.

PAYLOAD:
```
{ eyebrow, title, thesis, role,
  actions: [ { numeral, heading, body } x3 ],
  impact: [ { label, headline, body } x3 ] }   // labels e.g. REVENUE / C-SAT / SERVICE NEEDS
```

---

## 5. role-roadmap (G3 of the role trio) — NXT `609:14` / NU `626:367`

WHEN TO USE: third role slide. ONE role's phased roadmap across 4 horizon columns. Light slide.

REGIONS: eyebrow `ROADMAP · <ROLE>` -> title (58px) -> **4 phase columns** at `left 196 / 608 / 1020 / 1432`
(each w388), starting `top 268`. Each column header = 5px top rule (`color/accent`; final phase rule =
`color/rail`) + phase label (15px secondary, e.g. `PHASE 01 · MONTHS 1-6`) + phase name (44px display;
final phase name in `color/accent`). Below: **4 bullet rows** per column at top 404 / 522 / 640 / 758,
each = 8px accent square marker + body line (19px, w364).

LAYOUT: header, then 4-col equal grid; each column = header block + vertical bullet list (marker + text).
The final ("close/launch") column is emphasized via rail-colored top rule + accent phase name.

TOKENS: eyebrow `color/cyan`; phase top rules + bullet markers `color/accent`; final-phase rule `color/rail`;
phase labels `color/secondary`; phase names `color/rail` (final `color/accent`); body `color/body`.

PAYLOAD:
```
{ eyebrow, title, role,
  phases: [ { label, name, emphasis?:bool, items:[ "..", "..", "..", ".." ] } x4 ] }
```

---

## 6. aggregate-roadmap — NXT `609:15` / NU `626:425`

WHEN TO USE: ONE roadmap spanning ALL roles at once — a matrix of **role rows x horizon columns**.
Synthesizes the three G3 role-roadmaps into a single grid. Light slide.

REGIONS: eyebrow + title (58px). **Column headers** at `top 230`, `left 420 / 786 / 1152 / 1518`
(e.g. FOUNDATION / ENGAGE / OPTIMIZE / LAUNCH·2028; final header in `color/rail`, others `color/secondary`)
above a 2px rail rule (196/260, w1428). Then **3 role rows** (GARDENERS / FARMERS / OPERATORS): each row
has a 36px display row-label at left 196 (tops 304 / 520 / 736) and **4 cells** (350 x 176, `color/paper`
+ 3px top rule — accent for horizons 1-3, `color/rail` for the LAUNCH column), each holding one body line
(19px). Rows separated by 1px `color/hairline` dividers.

LAYOUT: a true grid — 1 label col + 4 horizon cols, 3 role rows. Build as nested auto-layout / CSS grid
so adding a role (row) or horizon (column) reflows collision-free (per the GOLD-matrix auto-layout rule).

TOKENS: eyebrow `color/cyan`; column headers `color/secondary` (final `color/rail`); top rule `color/rail`;
row labels `color/rail`; cells `color/paper`; cell top rules `color/accent` (final col `color/rail`);
row dividers `color/hairline`; cell body `color/body`.

PAYLOAD:
```
{ eyebrow, title,
  horizons: [ "FOUNDATION", "ENGAGE", "OPTIMIZE", "LAUNCH · 2028" ],   // column headers, last emphasized
  roles: [ { name, cells: [ "..", "..", "..", ".." ] } x3 ] }          // cells aligned to horizons
}
```

---

## Composition notes for the AI

- The role-* trio (`role-needs` G1, `role-recommendation` G2, `role-roadmap` G3) is ONE narrative set
  PER ROLE: emit all three in sequence with the same `role` value and matching eyebrow suffix.
  `aggregate-roadmap` is the closer that folds every role's G3 into a single role-rows x horizon-columns grid.
- All cards/columns/cells are equal-width FILL regions; never absolute-position siblings onto the same
  coordinate. Use CSS grid for the 3-col (org-model), 4-col (role-roadmap), and the role x horizon matrix
  (aggregate-roadmap) so dimension growth reflows.
- NU twins differ ONLY by mode `535:0` token resolution (rail/accent/fonts swap); same node geometry,
  same payload shapes.
