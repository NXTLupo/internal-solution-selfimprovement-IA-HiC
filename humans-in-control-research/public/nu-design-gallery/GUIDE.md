# Research Artifact Templates — Build &amp; Modify Guide

A working reference for the fourteen research-artifact templates in this project. Every template is built from a small shared vocabulary; every modification follows the rules below. Pair this guide with `style-guide.html` (the visual reference) and the templates themselves under `artifacts/`.

—

## Contents

1. [Principles](#1-principles)
2. [File layout](#2-file-layout)
3. [Token map — what's safe to reference](#3-token-map)
4. [Density rules — what stays, what goes](#4-density-rules)
5. [Element catalog — copy-pasteable patterns](#5-element-catalog)
6. [Per-artifact anatomy](#6-per-artifact-anatomy)
7. [Modification recipes — common tasks](#7-modification-recipes)
8. [Building a brand-new artifact](#8-building-a-new-artifact)
9. [The thirteen don'ts](#9-the-thirteen-donts)
10. [Tweaks integration](#10-tweaks-integration)

—

## 1. Principles

These are the load-bearing rules. Every modification must hold them.

**Density over decoration.** Every pixel earns its place. Methodology blurbs, slide numbers on documents, "primary archetype" suffixes, "EVIDENCE GAP" annotations, hero-image placeholders without information — all removed. The artifact is dense by default.

**Citation as chip, not strip.** A consolidated source index sits once at the foot of a document. Inside the body, citations are inline `<sup class="cite">` markers or `<span class="cite-chip">` chips. No per-slide source footer strips. No `[CHUNK_044]` tokens leaking into prose.

**Tabular figures, globally.** Body has `font-feature-settings: 'tnum' 1, 'lnum' 1` applied at the body level. Numbers align across rows; comparisons read at a glance. Display-weight numbers (Spectral Light 300) carry stat values; the contrast against sans-serif labels is the signature of every artifact.

**Multi-column over stacked.** A four-up persona roster reads faster than a four-page persona deck. A twelve-tile theme grid reads faster than twelve theme sections. Side-by-side over scroll, when content density allows.

**Sentence-case findings.** Every card title, every slide title, every section heading is a complete sentence stating a conclusion — never a topic label like "Market overview" or "Key findings." The title test: a partner reading only the titles of an artifact must understand the complete argument.

**Northeastern red is a scalpel.** Red marks critical state, target maturity, one verbatim quote per page. It is never a divider, never a fill, never decoration. The everyday "primary" UI color is ink-900.

**Aggregated signals only between flywheels.** When an artifact bridges student-side and donor-side data, the contract is aggregated signals — never individual academic records. Never the words "at risk" or "failing" — use "needs attention," "below pace."

—

## 2. File layout

```
.
├── index.html                  ← gallery, links to every template
├── style-guide.html            ← living interactive style guide (§01–§13 anatomy)
├── GUIDE.md                    ← this file
├── shared/
│   ├── colors_and_type.css     ← 125 design tokens + .t-* type classes
│   ├── artifacts.css           ← shared component layer (masthead, stat, dtable, pill, etc.)
│   └── fonts/                  ← Spectral local cuts
└── artifacts/
    ├── personas.html
    ├── themes.html
    ├── service-blueprint.html
    ├── competitive-analysis.html
    ├── gap-analysis.html
    ├── strategic-report.html
    ├── recommendations.html
    ├── roadmap.html
    ├── prd.html
    ├── strategy-deck.html
    ├── tech-architecture.html
    ├── tech-audit.html
    └── org-chart.html
```

Every artifact HTML file starts with the same two stylesheet imports:

```html
<link rel="stylesheet" href="../shared/colors_and_type.css" />
<link rel="stylesheet" href="../shared/artifacts.css" />
```

That gets you tokens + the shared component layer. Artifact-specific layout (matrix grids, swimlane structures, persona-card geometry) is defined locally in a `<style>` block inside each artifact file. Locally-defined styles never override token values — they reference them via `var(--*)`.

—

## 3. Token map — what's safe to reference

Only `--*` names defined in `shared/colors_and_type.css` resolve. Don't guess names; an unresolved `var()` silently falls back to the browser default. The full inventory:

### Color

| Category | Tokens |
|---|---|
| Brand red | `--nu-red-{100, 500, 600, 700}` |
| Ink | `--ink-{600, 700, 800, 900}` |
| Slate | `--slate-{50, 100, 200, 300, 400, 500, 600}`, `--white` |
| Status bg | `--{success, warning, error, progress, special, info}-bg` |
| Status fg | `--{success, warning, error, progress, special, info}-fg` |
| Status solid | `--{success, warning, error, progress, special}-solid` |
| Semantic surfaces | `--bg-{canvas, surface, subtle, muted, inverse}` |
| Semantic fg | `--fg-{default, strong, muted, subtle, inverse, brand}` |
| Borders | `--border-{default, subtle, strong, focus}` |

### Type

| Category | Tokens |
|---|---|
| Family | `--font-{sans, display, mono, numeric}` |
| Size | `--fs-{overline, caption, body-sm, body, body-lg, h4, h3, h2, h1, display}` |
| Weight | `--fw-{light, regular, medium, semibold, bold}` |
| Line height | `--lh-{tight, snug, normal, loose}` |
| Tracking | `--tracking-{tight, normal, wide, overline}` |

### Spacing, radii, motion

| Category | Tokens |
|---|---|
| Space (4-px grid) | `--space-{1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20}` |
| Radii | `--radius-{xs, sm, md, lg, xl, pill}` |
| Shadow | `--shadow-{xs, sm, md, lg, focus, focus-danger}` |
| Motion | `--ease-{standard, emphasized}`, `--duration-{fast, base, slow}` |

**Rule:** if you need a value that doesn't exist as a token, the answer is almost always that the design system already has the right token under a different name. Look first. Hard-coding a hex value or a font size is the wrong move.

—

## 4. Density rules — what stays, what goes

The templates are denser than typical research outputs because the following chrome has been removed by default. Don't add it back.

### Removed

- Methodology blurbs at the top of any artifact ("We synthesized 248 chunks across 32 documents using verbalized sampling…"). Methodology lives in the masthead meta blocks (corpus size, source mix, external citation share) — three terse numbers, no prose.
- Slide numbers on documents and reports. Slide numbers belong on slides; on a scrolling document the section index is the wayfinding.
- "Primary archetype," "primary persona," "high confidence" suffixes on persona role lines. Quality flags that say nothing the reader can't see in the badge or the section.
- "EVIDENCE GAP" / "TBD" / "[needs baseline]" QA annotations. Process-aware language. If evidence is thin, narrow the claim to what *is* evidenced.
- Per-slide source citation footer strips. Citations are inline chips; the index lives once at the foot.
- Full-bleed section banners on body slides. The 1-px section divider rule + 18-px display heading + counter is the section break for everything except the explicit deck section-header archetype.
- "Industry average" / "peers collective" pseudo-entities. Always name four or more specific peer institutions with traceable data.
- AI-generated illustrations. Every visual encodes real information. Use a placeholder if no real asset exists yet.

### Kept

- The masthead — brand seal, kicker, finding-title, three meta blocks.
- One consolidated source index at the foot of the document.
- Section dividers — 1-px rule + 18-px Spectral 500 heading + small mono counter on the right.
- Slide numbers *on the deck* artifact (slide N / TOTAL bottom-right).
- A single artifact identifier in the footer (e.g. `PRD · v1 · 2026-Q2`).

### Body size

Body sits at **14 px** for density. Don't go below 12 px in dense table contexts. Don't go above 16 px outside the cover. Slide-stage minimums (24 px on a 1920×1080 stage) only apply to the strategy-deck artifact — every other artifact ships at 13–14 px and lets the eye go where the typography directs.

—

## 5. Element catalog — copy-pasteable patterns

These are the shared elements. Use them by class — never reinvent.

### Masthead

```html
<header class="art-masthead">
  <div class="art-masthead__brand">
    <div class="art-masthead__brand-seal">N</div>
    <div class="art-masthead__brand-text">
      <div class="art-masthead__brand-name">Northeastern Advancement</div>
      <div class="art-masthead__brand-sub">Co-Op Prep · Discovery · 2026 Q2</div>
    </div>
  </div>
  <div class="art-masthead__center">
    <div class="art-masthead__kicker">Personas · Discovery synthesis</div>
    <h1 class="art-masthead__title">Four archetypes shape how a Co-Op Prep tool earns adoption.</h1>
  </div>
  <dl class="art-masthead__meta">
    <div class="art-masthead__meta-block"><dt>Corpus</dt><dd>248 chunks</dd></div>
    <div class="art-masthead__meta-block"><dt>External cite</dt><dd>71%</dd></div>
    <div class="art-masthead__meta-block"><dt>Confidence</dt><dd>3 of 4 evidenced</dd></div>
  </dl>
</header>
```

**Rules.** Title is a complete sentence. Meta blocks are three at most. No subtitle line under the title.

### Eyebrow + finding

```html
<div class="art-card">
  <div class="art-eyebrow">Critical gap · G-02</div>
  <h3 class="art-finding">No silence-detection in the application funnel costs 38% of stalled students.</h3>
  <p>Cincinnati flags at day 5 of inactivity; Northeastern fires a template at day 7 and waits.</p>
</div>
```

Variants of the finding: `.art-finding--lg` for hero cards, `.art-finding--sm` for dense lists.

### Citation chips

Two patterns. Use the numeric chip when the inline density is high; use the named chip when the chip is referring to a specific named source.

```html
<!-- numeric inline marker -->
…lags 11 days <sup class="cite" data-src="Drexel CASE '24">3</sup>.

<!-- named pill chip -->
The IT census <span class="cite-chip">VP-OPS-09</span> names sunset as the funding posture.

<!-- verbatim quote marker — brand red -->
<sup class="cite" data-verbatim="true">v</sup>
```

`data-src` is read by browsers as a tooltip-grade hint; pair it with a footer ordered list using `<ol>` so the chip number aligns with the source order.

### Stats &amp; stat strip

```html
<div class="stat-strip">
  <div class="stat">
    <div class="stat__label">Placement lag</div>
    <div class="stat__value">11<span class="u"> days</span></div>
    <div class="stat__delta stat__delta--down">vs. 5-day Drexel benchmark</div>
  </div>
  <!-- repeat for 3–6 stats -->
</div>
```

**Rules.** 3–6 stats per strip. Big number in Spectral Light 300 (handled by `.stat__value`). Label in 10-px uppercase. Delta in 11-px with `--up` / `--down` modifier for directional color.

### Pills

```html
<span class="pill pill--success">on track</span>
<span class="pill pill--warning">needs attention</span>
<span class="pill pill--error">critical</span>
<span class="pill pill--progress">in progress</span>
<span class="pill pill--special">exploratory</span>
<span class="pill pill--brand">verbatim</span>
<span class="pill pill--ink">primary</span>
<span class="pill pill--outline">muted</span>
<span class="pill pill--lg pill--success">quick win</span>   <!-- 22-px height variant -->
```

### Signal dots

```html
<span class="signal signal--green"></span>Healthy · meets SLA
<span class="signal signal--yellow"></span>Needs attention · degraded
<span class="signal signal--red"></span>Critical · broken integration
<span class="signal signal--blue"></span>Planned · in flight
<span class="signal signal--neutral"></span>Inactive · no signal
```

Never use the words "at risk" or "failing" — the dot does that work, the surrounding row tells the story.

### Maturity bar

```html
<div class="matbar">
  <div class="matbar__track">
    <div class="matbar__current" style="width: 40%;"></div>  <!-- 0–100% maps to 1–5 maturity -->
    <div class="matbar__target"  style="left: 80%;"></div>   <!-- red marker at target -->
  </div>
</div>
```

Pair with a numeric label above the bar (current → target).

### Dense table

```html
<table class="dtable dtable--compact">
  <thead>
    <tr>
      <th>System</th>
      <th>Vendor</th>
      <th class="num">Users</th>
      <th>Maturity</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="lead">Raiser's Edge NXT</td>
      <td>Blackbaud</td>
      <td class="num">312</td>
      <td>4 / 5</td>
    </tr>
  </tbody>
</table>
```

Add `.dtable--sticky` for wide tables that need a sticky first column. Add `.mono` to any `<td>` to render its text in Roboto Mono.

### Card

```html
<div class="art-card">…</div>           <!-- default surface -->
<div class="art-card art-card--pad-lg">…</div>   <!-- 20-px padding -->
<div class="art-card art-card--ink">…</div>      <!-- dark variant (ink-900) -->
<div class="art-card art-card--accent">…</div>   <!-- subtle gradient wash -->
```

### Footer source index

Always at the bottom of the page. Two columns of numbered sources, plus an artifact identifier on the right.

```html
<footer class="art-footer">
  <div style="flex: 1;">
    <div style="font-weight:600; color: var(--fg-default); margin-bottom: 8px; …">Source index</div>
    <ol>
      <li><b>MGO interviews</b> · n=12, 2026-Q1</li>
      <li><b>Drexel CASE study</b> · "Outcomes to advancement," 2024</li>
      <!-- … -->
    </ol>
  </div>
  <div style="text-align: right; min-width: 200px;">
    <div style="color: var(--fg-subtle); text-transform: uppercase; …">Artifact</div>
    <div style="font-family: var(--font-mono); …">PERSONAS · v1 · 2026-Q2</div>
    <div>Skill: <code>persona-architect</code></div>
  </div>
</footer>
```

—

## 6. Per-artifact anatomy

Each template has the same skeleton: masthead → stat-strip → primary body → optional secondary band → footer. The body shape differs by artifact.

### 6.1 Personas — `artifacts/personas.html`

**Shape.** Four-up grid, one artifact-page. Each persona card is a self-contained Cooper goal hierarchy + JTBD + behaviors + pain points + opportunities + verbatim quote. A second band below the grid shows the Phase-A candidate roster (8 considered → 4 shipped) as a dense table.

**Density move.** 4 personas on one canvas, not 4 pages. Cooper goals collapse into a `<dl>` with 10-px uppercase keys; pain points and opportunities sit in two columns inside the card.

**Anatomy by class.**
- `.persona-grid` — the 2×2 container.
- `.persona` — the card; the stripe at the top (`.persona__stripe--major` etc.) carries the persona's category color.
- `.persona__quote` — the verbatim quote with brand-red `data-verbatim="true"` marker.
- `.persona__body` — the two-column inner layout (Cooper + JTBD + behaviors on the left; pain points + opportunities on the right).

**To add a fifth persona,** change `.persona-grid` to `grid-template-columns: repeat(3, 1fr)`. To split into two pages, wrap personas 3–4 in a second `.persona-grid` with a horizontal rule between.

### 6.2 Themes — `artifacts/themes.html`

**Shape.** Twelve-tile grid (4 columns × 3 rows), each tile a complete-sentence theme finding with a quote, evidence chip strip, and a density bar at the bottom indicating relative evidence weight.

**Density move.** Twelve themes visible at once. The dropped-candidates table is a single dense row beneath the grid — no separate page.

**Anatomy.**
- `.theme-grid` — the 4-column container.
- `.theme` — the tile.
- `.theme--priority` — opens the title in brand red.
- `.theme__cross` — "cross-doc · priority" / "cross-doc" / "single-doc" classification chip.
- `.theme__bar` — the evidence-density bar.

### 6.3 Service blueprint — `artifacts/service-blueprint.html`

**Shape.** Wide canvas (min 1680 px). Bitner 5-layer model in horizontal swimlanes; 6 stages along the columns. Lane dividers are ink-900 strips. Per-cell content density: actor chips, customer action with citation, emotion bar with named intensity, fail-point callout, opportunity link.

**Density move.** Sticky first column (`.bp-cell--label`) so the lane label stays visible as you scroll the stages horizontally. Fail points and moments-of-truth are inline `.fail` / `.mot` blocks inside cells — not a separate row.

**Anatomy.**
- `.blueprint` — the canvas wrapper.
- `.bp-row` — a lane row.
- `.bp-row--lane-divider` — the ink section break between above-the-line / below-the-line / opportunity.
- `.bp-cell` — a single intersection (lane × stage).
- `.emo` — emotion bar with `--positive` / `--neutral` / `--negative` modifiers.
- `.fail` — fail-point callout (brand-red left border).
- `.mot::before` — moment-of-truth star.

### 6.4 Competitive analysis — `artifacts/competitive-analysis.html`

**Shape.** Three bands. (1) Named-peer profile matrix — five peers + Northeastern, six dimensions per peer (position, strengths, weaknesses, differentiator, tooling, evidence). (2) Maturity matrix — 9 dimensions × 5 peers, Gartner 1–5 dot chart with NU column shaded. (3) Three priority-gap blocks naming the leader institution by name.

**Density move.** Northeastern's column is shaded with a 3% brand-red wash and 2-px brand left border throughout both matrices — eliminates the need to scan for the NU row.

**Anatomy.**
- `.peer-matrix` — the table layout with sticky first column.
- `.nu-col` / `.nu-col-head` — the Northeastern column shading.
- `.bench-grid` — the 9 × 5 maturity matrix using CSS grid.
- `.level__dots` — the five-dot maturity indicator inside each cell.
- `.gap-block.priority` — a priority-gap callout with brand-red left border.

### 6.5 Gap analysis — `artifacts/gap-analysis.html`

**Shape.** Six gap rows, each with a maturity bar (current → target), a severity pill, effort, quantified impact callout, and a link back to recommendations. Two-column lower band: quick wins (left, larger) + risk register (right).

**Anatomy.**
- `.gap-list` — the row container.
- `.gap-row` — a 6-column grid: ID, capability, maturity bar, severity, effort, action link.
- `.quick-grid` — the quick-wins 2×2.
- `.risks` — the right-hand register; each `.risk-item` has L:probability, I:impact, and a mitigation line.

### 6.6 Strategic report — `artifacts/strategic-report.html`

**Shape.** Long-form document. Cover with kicker + display headline. Three-column executive summary on an ink-900 band (Situation / Complication / Resolution). Body sections use a 180-px marginalia column on the left (section number + title + a brief note about the role of the section) and a 68-ch body column on the right. Pull-quotes are inline with a brand-red left border.

**Density move.** Marginalia column carries the section number and the "what this section is for" note — no preamble blocks, no methodology section. The section index table near the end shows every remaining section in one row each: word count, pillar, key metric, and "in deck?" flag.

**Anatomy.**
- `.report-cover` — kicker, display headline, deck, meta panel.
- `.exec` — the ink-900 SCR band.
- `.body-section` — a section with `__nav` (sticky marginalia) and `__main` (body column).
- `.pq` — pull-quote with brand-red rule.
- `.inset-stats` — mid-section 3-stat grid.
- `.kernel` — Rumelt's kernel block (3 cells: what we choose / against / metrics).
- `.pillars` — strategic-pillar list.

### 6.7 Strategic recommendations — `artifacts/recommendations.html`

**Shape.** Ink-900 kernel band at top (Diagnosis / Guiding policy / Coherent actions). Seven recommendation rows, each a 4-column grid: ID, title + pillar + description + verbatim, action items (numbered), impact + meta.

**Anatomy.**
- `.kernel-band` — the three-cell ink-900 strip at the top.
- `.recs` — the row container.
- `.rec` — a single recommendation row.
- `.rec__pillar.p1` / `.p2` / `.p3` — pillar color dot + label.
- `.rec__quote` — verbatim quote (Spectral italic with left rule).
- `.rec__actions ol` — auto-numbered with mono prefixes.
- `.rec__side` — the right-hand impact + meta panel.

### 6.8 Strategic roadmap — `artifacts/roadmap.html`

**Shape.** Ink-900 vision band at top with three horizon indicators. Three-column body (Now / Next / Later), 4–5 initiatives per column. Below: theme-distribution grid (4 themes × 3 horizons heatmap) and a capacity-check by owner.

**Anatomy.**
- `.vision-band` — ink-900 strip with horizon timeline on the right.
- `.theme-legend` — color-coded theme legend strip.
- `.horizon` — a single horizon column.
- `.init` — an initiative card. The 4-px left bar (`.init__theme.t-data` / `.t-ai` / `.t-peer` / `.t-sunset`) carries the theme color.
- `.init__dep` — dependency callout.
- `.theme-row` — a row in the theme-distribution heatmap.
- `.cap-row` — a row in the capacity check.

### 6.9 PRD — `artifacts/prd.html`

**Shape.** Document-style. Cover band on top with title + meta. Left rail TOC for 16 sections (Cagan / SVPG). Each section is short — problem statement is the most important and gets the most words; the rest are tight blocks with the right primitive per content type (definition list for assumptions, feature table for functional requirements, metric grid for success metrics, sign-off matrix for §16).

**Anatomy.**
- `.prd-cover` — cover with deck + meta panel.
- `.prd-body` — 200-px TOC rail + main column.
- `.prd-toc` — sticky left rail with section numbers and click targets.
- `.prd-section` — a single numbered section (`.prd-section__num`).
- `.feature-table` — MoSCoW feature table with priority pills.
- `.priority-pill.must` / `.should` / `.could` / `.wont` — the MoSCoW classifications.
- `.metrics-grid` — SMART metric cards with now → target pattern.
- `.signoff` — RACI sign-off table.

### 6.10 Strategy deck — `artifacts/strategy-deck.html`

**Shape.** Showcase of all 7 slide archetypes on one canvas. Each row has a left rail describing the archetype and its selection rules; on the right is a 16:9 slide rendered at the design system's actual proportions. Archetypes: Title, Section header (ink-900 with ghost type), Content + data panel (55/45 split), Insight chart (one red bar), Full-bleed viz (2×2 matrix), Bento grid (mixed cells), Problem/Solution (red/blue divided).

**Anatomy.**
- `.deck-row` — left rail + slide pair.
- `.slide` — the 16:9 slide container (`aspect-ratio: 16 / 9`).
- `.arc-title` — title archetype.
- `.arc-section` — section header archetype with ghost type.
- `.arc-data` — content + data panel archetype.
- `.arc-chart` — insight chart archetype.
- `.arc-viz` — full-bleed viz archetype.
- `.arc-bento` — bento grid archetype.
- `.arc-ps` — problem / solution archetype.

**Selection rules** (also printed in the deck footer):

1. First slide? → Title (01)
2. Section break? → Section header (02)
3. Specific stats?
   - Trend or comparison → Insight chart (04)
   - Otherwise → Data panel (03)
4. Contrasts pain with remedy? → Problem / Solution (07)
5. 3+ discrete findings or quotes? → Bento (06)
6. Dedicated data / matrix slide? → Full-bleed viz (05)
7. Default → Data panel (03)

### 6.11 Technical architecture — `artifacts/tech-architecture.html`

**Shape.** Ink-900 overview band with type legend + security boundaries. C4 stacked layers: L1 users, L2 application containers, L3 data + integration. Each node is a colored-left-border card with id, label, type, description, and citation tag. Flows table below: 14 typed interactions with from→to, action, protocol, status, and health.

**Anatomy.**
- `.arch-overview` — ink-900 overview band.
- `.c4-canvas` — the diagram container.
- `.c4-layer` — a single C4 layer (L1 / L2 / L3).
- `.node` — a node card.
- `.node--user` / `.node--app` / `.node--db` / `.node--integ` / `.node--ext` / `.node--ai` — typed left-border colors.
- `.flows` — the typed flow table.
- `.flow-status-active` / `.flow-status-planned` / `.flow-status-broken` — flow health text colors.

### 6.12 Technology audit — `artifacts/tech-audit.html`

**Shape.** Stat strip → systems inventory table (14 systems, 8 columns) → integration health summary (4 cards) → consolidation opportunities (3 cards) → audit recommendations table. **The audit page is wired with the tweaks panel** — open Tweaks from the toolbar.

**Density move.** The systems table packs maturity bars inline with current/target labels below; sunset rows wash with a 3% red tint. Inventory and recommendations are both `.dtable`-class tables, so they inherit identical row densities.

**Anatomy.**
- `.systems` — the inventory table.
- `.row-sunset` — sunset-target row (red wash + red title).
- `.mat-cell` — maturity-bar cell.
- `.health-summary` — 4 cards: Healthy / Degraded / Broken / Net new.
- `.consol` — 3 consolidation-opportunity cards.

**Tweaks available** (see §10 for the protocol):
- Density: compact / standard / cozy
- Sunset emphasis: subtle / standard / strong
- Show vendor sublines: on/off
- Maturity column: on/off
- Health &amp; status columns: on/off
- Row hover tint: on/off

### 6.13 Org chart — `artifacts/org-chart.html`

**Shape.** Three tiers stacked vertically: Tier 01 Executive (1 card centered, ink-900 fill), Tier 02 Function leads (3 cards), Tier 03 Team leads + ICs (6 cards). Vertical CSS-generated connector lines between tiers. Below the tree: dotted-line collaborators table with 5 named cross-org relationships.

**Anatomy.**
- `.org-canvas` — the tree container.
- `.tier`, `.tier--exec`, `.tier--vp`, `.tier--lead` — tier layouts.
- `.role` — a role card.
- `.role--exec` — ink-900 executive variant.
- `.role--vacant` — open req card with diagonal stripe pattern.
- `.role__load` — capacity bar (over-100% goes red).
- `.collab-table` — the dotted-line collaborator table.

—

## 7. Modification recipes

Common edits. Each recipe says where to look and what to change.

### Recipe A — Rebrand from NU to another institution

1. In `shared/colors_and_type.css`, change `--nu-red-{500,600,700,100}` to the new brand red values. Don't rename the variables.
2. In the masthead of every artifact (`.art-masthead__brand-name` and `.art-masthead__brand-seal`), update the institution name and the single-letter seal.
3. In each artifact's footer (`.art-footer`), update the institution string.
4. The rest is invariant — pillar names, copy, internal-system references should be updated per the new institution's actual context.

### Recipe B — Swap to a different brand accent

If the institution uses a non-red brand color:

1. In `shared/colors_and_type.css`, redefine `--nu-red-600` to the new hex value (don't rename — the variable name is OK, the value is what matters).
2. Search for any literal `rgb(200,16,46)` in artifact-local CSS blocks and replace with `var(--nu-red-600)`. The shared `artifacts.css` already uses the variable.

### Recipe C — Add a new artifact-level meta block to the masthead

The masthead supports any number of `.art-masthead__meta-block` children (we ship three by convention).

```html
<div class="art-masthead__meta-block"><dt>New label</dt><dd>value</dd></div>
```

If you go past four, drop the divider rule by setting `border-left: 0` inline on the additional blocks.

### Recipe D — Change the body density on a single artifact

Body sits at 14 px by default. To make a single artifact denser (e.g. for print):

```html
<body style="font-size: 13px;">
```

This cascades through; the only places you'll need to tighten manually are `.stat__value` (Spectral display number) and `.art-masthead__title` (Spectral title).

For a fully site-wide density switch, see [§10 Tweaks integration](#10-tweaks-integration) — the pattern used on the tech-audit page is reusable.

### Recipe E — Replace a stat with a different metric

In any `.stat-strip`, replace the contents of a `.stat` block:

```html
<div class="stat">
  <div class="stat__label">New label · uppercase</div>
  <div class="stat__value">42<span class="u">%</span></div>
  <div class="stat__delta stat__delta--up">trend note</div>
</div>
```

Rules: `--up` / `--down` modifiers add the triangle and color. `<span class="u">` is the unit suffix (always smaller and muted next to the big number).

### Recipe F — Add a row to the gap analysis

In `artifacts/gap-analysis.html`, copy any `.gap-row` block and update the six columns: ID, capability + description, current → target maturity (set `width` and `left` on `.matbar__current` / `.matbar__target` to current% and target%), severity pill, effort, and the linked recommendation pill. Keep the inline citation chips inside the capability description.

### Recipe G — Add a slide to the strategy deck

In `artifacts/strategy-deck.html`, find the archetype that matches your content per the selection rules in §6.10. Copy the matching `.slide.arc-*` block and update the inner content. Don't invent a new archetype — the seven are the seven. If your content doesn't match any of them, the content is wrong for a slide.

### Recipe H — Switch from web view to print

Every artifact respects `@media print`. To print the strategic report:

```
File → Print → Save as PDF (or use the Save as PDF skill)
```

The print stylesheet drops shadows, lets `.no-print` hide tweak panels, and keeps colors as-rendered. Background colors and ink-900 bands may not print; the print review pane will show you exactly what comes through.

### Recipe I — Remove a slop micro-label everywhere

The pattern to strip: `<span class="num">X-01 · status-thing</span>` placed above a card title. It's decorative metadata — the ID lives in the leftmost table column, the status lives in the pill. Grep for `class="num"` and `· primary` / `· archetype` / `· sunset 20`. Two minutes per artifact.

—

## 8. Building a brand-new artifact

When you have a research output that doesn't fit any of the thirteen templates:

1. **Start from the closest existing artifact** — never from a blank file. Personas and themes are the most reusable starting points for "many small records." Gap analysis is the starting point for "scored items with quick wins."
2. **Copy the masthead and footer verbatim.** Update only the title, kicker, meta blocks, footer source index, and artifact identifier.
3. **Pick the right primary band** — a stat strip if the artifact summarizes; an ink-900 vision band if the artifact opens with a posture; a single-line section divider if neither.
4. **Use shared classes for everything you can.** `.dtable`, `.stat`, `.matbar`, `.pill`, `.signal`, `.art-card` cover 80% of cases. Only invent new component classes when the existing vocabulary genuinely doesn't fit.
5. **Local artifact CSS lives inside the artifact's `<style>` block,** never in `shared/artifacts.css`. Shared is for primitives; local is for the artifact-specific composition (e.g. the swimlane geometry in service-blueprint).
6. **Register it in `index.html`** — add a `.tpl-card` with the right kicker, viz preview, and number.

—

## 9. The thirteen don'ts

1. **No methodology blurbs at the top of the artifact.** Methodology lives in three meta blocks in the masthead.
2. **No slide numbers on scrolling documents.** Section index does the wayfinding.
3. **No "primary archetype" / "primary persona" suffixes** on persona role lines. Quality flags that don't tell the reader anything.
4. **No "EVIDENCE GAP" / "TBD" / "[needs baseline]" annotations** in user-facing fields. Process-aware language. Narrow the claim instead.
5. **No micro-labels above headings** — `<span class="num">C-03 · sunset 2027-Q1</span>` above a card title. Decorative metadata, not information.
6. **No per-slide source footer strips.** Inline citation chips; one footer index at the foot.
7. **No "Industry Average" / "Peers Collective"** in competitive analysis. Always four-plus named peers.
8. **No AI-generated illustrations.** Every visual encodes real information. Placeholder is better than fake imagery.
9. **No catastrophizing verbs.** "At risk," "broken," "failing," "abandoned," "trapped" — replaced by "needs attention," "below pace."
10. **No hype.** "Transformative," "revolutionary," "world-class," "best-in-class" — banned. The work is described in concrete, achievable terms.
11. **No all-caps body text.** Uppercase is reserved for 10-px section labels.
12. **No decorative gradients.** The two ink-900 bands (sometimes used at the top of reports and roadmaps) are the only background that isn't a flat surface.
13. **No emoji in artifact UI.** Status is a signal dot or a pill. Icons are vector or omitted.

—

## 10. Tweaks integration

The **tech-audit** artifact ships with a Tweaks panel as the reference implementation. Toggle Tweaks from the editor toolbar to open it. The protocol is the host-managed one:

```js
// 1. Register the listener FIRST
window.addEventListener('message', (e) => {
  if (e.data?.type === '__activate_edit_mode')   panel.classList.add('is-open');
  if (e.data?.type === '__deactivate_edit_mode') panel.classList.remove('is-open');
});

// 2. THEN announce availability to the host
window.parent.postMessage({ type: '__edit_mode_available' }, '*');

// 3. When a tweak changes, persist via the host
window.parent.postMessage({
  type: '__edit_mode_set_keys',
  edits: { density: 'dense' }
}, '*');
```

**Persistence.** The defaults block in each artifact is wrapped in `EDITMODE-BEGIN` / `EDITMODE-END` comment markers, so the host can rewrite it on disk:

```js
const TWEAKS = /*EDITMODE-BEGIN*/{
  "density": "standard",
  "emphasis": "standard",
  "vendorLines": true,
  "matBars": true,
  "healthCols": true,
  "rowHover": true
}/*EDITMODE-END*/;
```

The block between the markers must be valid JSON.

**Tweak-driven body classes.** Tweak state applies via CSS class on `<body>`:

```css
body.tw-dense   .systems tbody td { padding: 7px 12px; font-size: 11.5px; }
body.tw-no-bars .systems .mat-cell { display: none; }
/* … */
```

To add this to another artifact, copy the `.tw-panel` HTML block, the `<script>` block, and the `body.tw-*` selectors from `tech-audit.html`. Update the tweaks definition (the JSON block) and the apply function to match the new artifact's surface.

—

## Appendix · changelog

- **v1.0 · 2026-Q2** — initial library of fourteen templates, NU brand, with style guide and this build &amp; modify guide.
