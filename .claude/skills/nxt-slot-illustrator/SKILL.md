---
name: nxt-slot-illustrator
description: Generate flat, anti-slop, content-true SVG VISUALIZATIONS (data viz) for NXT/NU deck and artifact image slots. Use when a slide or artifact needs a diagram of its OWN data in an image placeholder (operating model, capability stack, maturity, funnel, journey, ranked findings, comparison matrix, KPI gauge, roadmap, architecture, composition, divider). Output is token-locked, text-free SVG sized to the slot, themed by brand (NXT|NU) x ground (dark|light). This is the DATA-VIZ lane; conceptual/content slot panels route to the native infographic lane (/api/ai/diagram families) per the `designer` skill.
---

# NXT Slot Illustrator (data-viz lane)

Renders visualizations that **represent the deliverable's content** rather than
decorate it. Grounding the visual in the deliverable's REAL data (the maturity
vector the model just produced, the funnel stages, the journey friction indices)
is the anti-slop mechanism: a faithful diagram of *this* operating model cannot
read as generic AI filler. It is the P3 data-viz doctrine made real: deterministic
token-locked VECTOR (not raster AI image-gen), collision-safe, zero AI cost, and
content-true by construction.

It COMPLEMENTS the native infographic lane (E4, 2026-07-02: the diffusion `illustrator`
emotive branch is RETIRED). Route by surface: relational / data / structural viz INSIDE
a slide panel -> this engine; conceptual per-element content panels (theme thumbnail,
persona detail, case-study, recommendation) -> the native infographic families via
`/api/ai/diagram` (see the `designer` skill routing table).

## Runtime authority (single source of truth)
The renderer is **`humans-in-control-research/services/vizEngine.ts`** (TS, imported
by the SPA at hashtag-generation runtime). `engine.js` in this folder is the
identical reference/Figma-plugin form; `vizEngine.ts` is what ships. When you change
one, change both, and re-run `services/vizEngine.test.ts`.

```ts
import { buildVizTheme, renderVizFamily, pickVizFamily } from './services/vizEngine';
const theme = buildVizTheme(brandColors /* from /api/design-tokens */, ground /* 'dark'|'light' */);
const svg = renderVizFamily(family, spec.data, slot.w, slot.h, theme); // -> SVG string
pickVizFamily('Co-op readiness score'); // -> 'maturityRadar' (route an unseen heading)
```
`renderVizFamily` is deterministic given `spec.data` (layouts seed off `data.seed`).

## Hard constraints (never violate)
- **Vector only.** No raster, no noise, no photoreal.
- **No gradients, shadows, rounded corners, or 3-D shading.** Flat fills, hairlines.
- **Palette is a TOKEN THEME, never hardcoded.** The palette = brand (NXT|NU) x
  ground (dark|light), built by `buildVizTheme()` from the Figma design tokens
  (`/api/design-tokens?brand=`). NEVER bake a hex into the art. (The colleague's
  original `engine.js` hardcoded an NXT-dark palette; that violates never-hardcode
  and was the one gap the TS port fixes.)
- **One accent focal point per frame** (chartreuse for NXT, red for NU). The
  structural cyan/teal is secondary; grays recede. Rust only for literal
  friction/risk, sparingly.
- **No `<text>` inside the art.** The deck's type (Saira Condensed / Archivo for
  NXT, Lato for NU) carries the words, and text-free SVG imports into Figma
  without font loading.
- **<= 3 active colors per composition** beyond grays.
- **Corner ticks + faint dot grid** give every frame a deliberate "plate" feel.

## The THEME (brand x ground) - the never-hardcode fix
`buildVizTheme(brandColors, ground)` derives every value from the token colors the
caller passes (rail, paper, ink, accent, cyan, teal, rust, hairline, grey):
- **ground=dark** -> dark rail plate, white ink, brand accent focal, cyan structural.
- **ground=light** ("stark white") -> white plate, dark ink, brand accent focal,
  brand TEAL structural (reads on white). NOT a fork: same engine, token palette.
- **Ground MUST match the host surface** (content-relevance extended to contrast):
  a viz on a DARK slide interstitial uses ground=dark; a viz on a LIGHT GOLD/paper
  artifact uses ground=light. The img-slot's `imgGround: dark|light` drives it.
- **Brand** comes from the run (#NXT|#NU); NU swaps accent->red, structural->teal.

## The twelve content families
| family | shows | `data` |
|---|---|---|
| `operatingNetwork` | operating model / ecosystem / org graph | `{n, layout:radial\|spine\|mesh\|hub2, seed}` |
| `capabilityStack` | platform tiers / layered capability | `{layers, highlight}` |
| `maturityRadar` | assessment / readiness vs target | `{scores:[0..1], target:[0..1]}` |
| `funnelFlow` | pipeline / conversion drop-off | `{stages:[magnitudes]}` |
| `journeyLine` | process / experience with friction | `{stations, friction:[idx], seed}` |
| `dataField` | ranked distribution / findings | `{values:[], sort:asc\|desc\|none, mean:bool, highlight}` |
| `comparisonMatrix` | option x criteria lattice | `{cells:[[0..1]]}` (max cell = accent) |
| `instrumentDial` | KPI / score / gauge | `{value:0..100, segments}` |
| `timelineGantt` | roadmap / phased rollout | `{tracks:[{start,dur}], periods, now, milestone}` |
| `flowSchematic` | architecture / how-it-works | `{blocks:[[nx,ny,w,h]], links:[[i,j]], highlight}` |
| `proportionStack` | composition / allocation (10x10 waffle) | `{groups:[parts]}` |
| `sectionMark` | divider (op-art + ordinal ticks) | `{ordinal}` |

## Selection (how both chats "select from" these)
CONTENT-DRIVEN by default; the model rarely picks the family by hand.
- **By deliverable hashtag:** `#gap`->maturityRadar, `#journey`->journeyLine,
  `#roadmap`->timelineGantt, `#competitive`->comparisonMatrix, `#arch`->flowSchematic,
  `#org`->operatingNetwork, KPI/stat->instrumentDial, composition->proportionStack,
  findings->dataField, divider->sectionMark, capability->capabilityStack,
  funnel->funnelFlow.
- **By heading:** `pickVizFamily(headingText)` routes an unseen slide (precedence
  specific -> general).
- **Brand/ground auto-resolve:** brand from the run; ground from the slot `imgGround`.
- **Explicit override (optional):** the Analyst/Designer chat may pin a family/ground.

## 100%-content-relevance at runtime (the hard requirement)
`variants.json` (100 specs) are EXEMPLARS/SEEDS, NOT the runtime data. At
hashtag-generation runtime the family's `spec.data` is built FROM THE DELIVERABLE'S
REAL PAYLOAD (the maturity scores produced, the funnel stages, the journey friction,
the gantt tracks, the comparison cells). Map explicitly per family; fall back to
`operatingNetwork`/`dataField` when the payload is thin. The visual is then a
faithful diagram of THIS content, sitting adjacent to prose describing the same data.

## Consistency across COMBINED / compiled decks (the other hard requirement)
Guaranteed by four converging mechanisms: (a) ONE skill/renderer authority both chats
call; (b) deterministic per `seed`; (c) the THEME from tokens -> every viz in a deck
shares brand x ground; (d) the wiki-manifest family catalog -> the same family is
chosen for the same content type across engagements. A compiled set reads as one
designed system because every plate shares the aesthetic + palette.

## Spec schema + the per-industry few-shot library
`variants.json` is the FULL library: 11 industries x 100 patterns = **1,100 content-true
exemplars** (12 families x ~8-9 real strategic frameworks each, instantiated per industry).
`variants/by-industry/{industry}.json` splits the same specs into the 11 Figma-page units.
Industries: higher-ed, advancement, workforce, retail, government, financial-services,
healthcare, ai-industry, creative-ai, insurance, fintech.
```json
{ "id":"retail-mat-01", "family":"comparisonMatrix", "industry":"retail",
  "framework":"bcg-matrix", "title":"Retail growth-share matrix",
  "aspect":"square",                       // portrait 820x1080 - wide 1920x1080 - square 1080x1080
  "artifacts":["competitive","recommendations","gap","prd","roadmap","slides"],  // which deliverables this serves (the AUDIT)
  "data":{ "cells":[[..]], "seed":3xxx } }
```
These are FEW-SHOT EXEMPLARS the generation model reads to pick the apt family + data-shape for
a given (industry, artifact, image-slot). They are NEVER injected as the deliverable's image;
the runtime art is engine-rendered from the deliverable's REAL payload via `services/vizEngine.ts`.

## Artifact audit (`artifact-audit.json`)
`family_to_artifacts` (which deliverables each family serves) + its inverse
`artifact_to_families` (for an `#hashtag` image-slot, the apt families). This is the
machine-readable "audit ALL of them" that the registry + manifest mapping consume.

## Adding work
- **New variant:** append a spec to `variants.json`. Nothing else changes.
- **New family:** add `r_yourFamily(d,w,h)` in `vizEngine.ts` returning
  `W(w,h, ...+CT(w,h))`, register it in `FAMILIES`, add a `pickVizFamily` branch, add
  a `vizEngine.test.ts` case + a sample-data entry. Reuse helpers
  `DOTS/CT/ln/cir/rct/poly` and `PAL.*` so the theme + constraints hold automatically.

## Figma (canon reference, not runtime)
One representative exemplar per family x theme lives on a "Visualization Families"
page in the design library (registered in `wiki/brand/figma-node-map.md`). That page
is the design CANON of what each family looks like; the runtime art is engine-rendered
into the img-slot (the SPA never instances Figma live). To refresh the canon, render
each family with a representative seed and `figma.createNodeFromSvg`.

## Files
- `engine.js` — reference renderer (mirror of `services/vizEngine.ts`, Figma-plugin form)
- `variants.json` — full 1,100-spec exemplar library (11 industries x 100 patterns)
- `variants/by-industry/{industry}.json` — the 11 Figma-page units (100 specs each)
- `artifact-audit.json` — family<->artifact mapping (the audit the registry/manifest consume)
- `gallery.html` — self-contained review surface (filter, search, click-to-copy spec)
- `SKILL.md` — this contract
- runtime: `humans-in-control-research/services/vizEngine.ts` (+ `.test.ts`)
