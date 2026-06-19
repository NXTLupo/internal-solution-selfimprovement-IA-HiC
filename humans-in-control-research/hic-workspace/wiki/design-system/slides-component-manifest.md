---
id: design-system/slides-component-manifest.md
title: SLIDES Component Manifest (deck archetypes the model composes from)
type: design-system
updated: 2026-06-17
---

# SLIDES Component Manifest

The deck-native archetype library, harvested from Figma page `324:2` (NXT symbols `609:2-609:15`,
NU mode instances `626:*`). A `#slides` / `#presentation` / `#strategy` deck is COMPOSED from these
archetypes the way `#proto` is composed from `proto-component-manifest.md`: the model SELECTS the
archetype that fits each slide's content (varying them across the deck) and supplies the PAYLOAD;
`slideComposer` renders it from the registry anatomy + brand tokens (no per-archetype code). Brand is
a MODE flip (NXT 221:0 chartreuse/Saira; NU 535:0 navy+red/Lato), never a layout change.

## How to emit a deck slide (MANDATORY contract)
Each slide is one fence whose template id is the archetype with a `slides:` prefix:
```
:::slide template=slides:<archetype> brand=nxt|nu
{ ...PAYLOAD exactly as specified for that archetype (key names + array lengths verbatim)... }
:::
```
The `slides:` prefix ROUTES the slide through the registry composer; without it the slide falls back
to a legacy template. Field names and array lengths below are a contract - the composer reads them by
exact key. Pixel anatomy + token bindings per archetype:
`plans/figma-audit/slides-archetypes/group-{a,b,c}-*.md`.

## Selection doctrine (this fixes "no variety / repeats one template")
- A deck OPENS with `slides:cover`; for 6+ slides add `slides:agenda` second, and
  `slides:section-divider` / `slides:thesis-interstitial` between major sections.
- VARY the archetype to the CONTENT SHAPE - never repeat one body archetype slide after slide. A
  varied deck uses 5+ distinct archetypes; never 3 identical body archetypes in a row.
- Titles are conclusions; numbers ride only inside cited quotes; >=50% external sources.

## Type system (fully tokenized — 2026-06-18)
Every text size on these archetypes is bound to a Figma `type/scale/*` variable (collection `NXT
Brand Tokens` 221:2, both modes) — NO hardcoded px anywhere, in Figma or in `slideComposer`. The
deck scale: `kicker` 22, `caption` 18, `deckHeading` 24, `lead` 25, `name` 30, `subhead` 36, `title`
46, `deckTitle` 58, `display` 60, `numeral` 80, `hero` 120, `sectionNumeral` 360, `quoteMark` 260.
- **Body copy is 14pt-readable (`type/scale/body` = 28 stage px).** Reading prose (numbered-themes
  body + quote, stat MEANS/MATTERS, problem-diptych body/subhead, org-model definition, role
  challenge/need/action/impact bodies, role-roadmap items, evidence-table intro, section supporting,
  scene body) renders at the readable body size, single-spaced.
- **Tabular / dense-list cells stay compact (`caption` 18 / `label` 15-17):** evidence-table
  prove/implication cells, org-model team/outcome lists, sources, kickers, micro-labels. These are
  the documented exemption to the readable-body floor — bumping them to 28 overflows the dense grid.
- BUDGET CONSEQUENCE: because body is now larger, body fields must be COMPRESSED to fit (compress the
  idea, never truncate). Per-column synthesis body <= ~150 chars; MEANS/MATTERS <= ~110 chars;
  takeaway statement <= ~140 chars (2 lines). Emit `density=dense` only when the archetype's slots
  genuinely hold more, never to pad.

## Chrome modes
- **full-bleed-dark** (cover, section-divider, thesis-interstitial, problem-diptych): rail-colored
  canvas, NO 128px rail bar, giant Saira display, dot-mark bottom-left.
- **content-rail** (all others): 128px `color/rail` left bar, 3x3 accent dot-mark bottom-left, cyan
  kicker `top:40`, Saira 58px action title `top:86`, masthead logo, footer source `top:1014`.

## Archetypes (template id · NODE NXT/NU · WHEN TO USE · PAYLOAD)

### slides:cover — 609:2 / 626:2 · full-bleed-dark
Deck opener (one per deck). PAYLOAD: `{ wordmark, title, subtitle }`.

### slides:scene — interactive presentation scene (text + AI illustration) · full-bleed-dark
A narrative #presentation scene: a text block (kicker + action title + one body line) on the left and
a tasteful on-brand, transparent, minimalist abstract flat-vector ILLUSTRATION (Illustrator skill) on
the right. Use for #presentation content scenes that benefit from a supporting visual (not every scene).
PAYLOAD: `{ kicker, title, body, imageConcept, canvas }` where `imageConcept` = a literal SHAPES-AS-CONTENT
description of the scene's idea (e.g. "a human figure beside flowing lines converging to one point";
"many nodes converging into one unified shape") and `canvas` = "dark" (full-bleed-dark). The runtime
generates the illustration from imageConcept (contrast-aware) and injects it; do NOT supply an image URL.

### slides:agenda — 609:3 / 626:15 · content-rail
Table of contents after the cover. Two grouped, pre-numbered columns.
PAYLOAD: `{ title, groups: [ { label, items: [ "01: ...", "02: ..." ] } ] }` (1-2 groups, ~4 items each).

### slides:section-divider — 609:4 / 626:36 · full-bleed-dark
Opens a major section. PAYLOAD: `{ number, title, supporting }` (number is zero-padded "01").

### slides:thesis-interstitial — 609:5 / 626:49 · full-bleed-dark
One contestable assertion between sections. PAYLOAD: `{ kicker, thesis }` (thesis = ONE sentence).

### slides:stat-row — 609:6 / 626:61 · content-rail
By-the-numbers proof: exactly 3 figures, each with a qualitative MEANS + MATTERS.
PAYLOAD: `{ kicker, title, stats: [ { figure, headline, means, matters } ] (exactly 3), sourceLine }`.

### slides:block-quote — 609:7 / 626:95 · content-rail
One hero verbatim quote + a right panel of 3 corroborating data points.
PAYLOAD: `{ topicKicker, quote, attributionName, attributionRole, corroborating: [ { figure, label, source } ] (exactly 3), sourceLine }`.

### slides:numbered-themes — 609:8 / 626:124 · content-rail ← profile N items/apps/themes
4 numbered columns, each name + synthesis body + a verbatim quote. THE archetype for "profile each
app/theme/play". PAYLOAD: `{ kicker, title, items: [ { number, name, body, quote } ] (4), sourceLine }`.

### slides:evidence-table — 609:9 / 626:158 · content-rail ← named-subject comparison
4-column comparison; first ~2 rows are featured; closes with a PEER PATTERN takeaway band.
PAYLOAD: `{ kicker, title, intro, columns: [ 4 column labels ], rows: [ { subject, prove, implication, evidenceGrade, featured } ] (~6; first 2 featured:true), takeaway: { label, statement }, sourceLine }`. TITLE <= 70 chars (1-2 lines max - the dense table has no room for a 3-line title); intro <= 1 sentence; prove/implication cells <= ~90 chars (2 lines).

### slides:problem-diptych — 609:10 / 626:213 · full-bleed-dark
Two contrasting halves as equals. PAYLOAD: `{ eyebrow, title, subhead, cards: [ { numeral, heading, body } ] (exactly 2) }`.

### slides:org-model — 609:11 / 626:236 · content-rail
A 3-part operating model as 3 peer columns (NOT a reporting-tier chart).
PAYLOAD: `{ eyebrow, title, columns: [ { name, definition, teams: { label: "TEAMS", items: [..] }, outcomes: { label: "OWNED OUTCOMES", lines: [a, b] } } ] (3) }`.

### slides:role-needs — 609:12 / 626:286 · content-rail
One role's current challenges (left) + that role's persona-needs card (right). G1 of the role trio.
PAYLOAD: `{ eyebrow, title, role, challenges: [ { numeral, heading, body } ] (3), persona: { needsLabel: "PERSONA NEEDS", name, needs: [ { kind, body } ] (3) } }` (kind = EXPERIENCE | FUNCTIONAL | PERSONAL).

### slides:role-recommendation — 609:13 / 626:324 · content-rail
One role's recommendation: thesis + 3 supporting actions + 3 projected-impact tiles. G2 of the trio.
PAYLOAD: `{ eyebrow, title, role, thesis, actions: [ { numeral, heading, body } ] (3), impact: [ { label, headline, body } ] (3) }` (label e.g. REVENUE | C-SAT | SERVICE NEEDS).

### slides:role-roadmap — 609:14 / 626:367 · content-rail
One role's phased roadmap across 4 phase columns. G3 of the trio.
PAYLOAD: `{ eyebrow, title, role, phases: [ { label, name, items: [ ".." ] } ] (4) }` (label e.g. "PHASE 01 · MONTHS 1-6").

### slides:aggregate-roadmap — 609:15 / 626:425 · content-rail
One roadmap across roles: role-rows x horizon-columns matrix. The cross-role closer.
PAYLOAD: `{ eyebrow, title, horizons: [ 4 column labels, last emphasized ], roles: [ { name, cells: [ one per horizon ] } ] }`.

> The `slides:role-needs` / `slides:role-recommendation` / `slides:role-roadmap` trio is ONE narrative
> set per role: emit all three with the same `role` value and matching eyebrow suffix.
> `slides:aggregate-roadmap` folds every role's roadmap into a single matrix.
