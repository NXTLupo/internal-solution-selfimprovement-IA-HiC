---
title: Agent Guide — how to find every image reference in the manifest (for the illustrator skill)
type: brand
updated: 2026-06-17
---

# Agent Guide: find every image reference in the manifest

**Audience:** the AI Coding agent. **Goal:** enumerate every image placeholder ("img-slot") across the
NXT GOLD design system, and for each one hand the `illustrator` skill exactly what it needs to generate
the right illustration and drop it in the right place. No guessing — every fact below has a concrete
location you read at runtime.

---

## 0. TL;DR (the loop you run)

1. Open the **master registry**: `hic-workspace/wiki/brand/figma-node-map.md` → section **`## IMAGE-SLOT
   REGISTRY`**. It defines the slot convention and points to the 5 per-page fragment files.
2. Read all **5 fragment files** in `hic-workspace/wiki/brand/image-slots/` (listed in §2). Each holds a
   table of placed slots.
3. For **each table row** = one image reference. Parse the 7 columns (§3).
4. For each reference, call the **`illustrator` skill** ONCE → **ONE transparent PNG for THAT one slot**
   (§4). A 4-row table = 4 separate calls = 4 separate PNGs. **NEVER** combine rows into one image / sheet
   / grid, **never** output a JPEG, **never** generate at the slot's tiny px size, **never** save to
   Downloads. (This is the exact mistake that broke the last run — see §4's failure callout.)
5. Write each returned PNG url into the deliverable's index-aligned payload array at THAT slot's index
   (§5: `journeyMap.phaseImages[i]`, `personaCard.behaviorImages[i]`, …). Twin not wired yet → record it,
   don't force it.
6. **Skip** every "Deliberately left image-free" entry (§6). Those are intentional no-image decisions.

The markdown registry is your source of truth. The Figma file is the authoritative *locator* (the live
node carries the same metadata in `setSharedPluginData('nxt', …)`) — use it only to cross-check or if a
node id in the registry ever looks stale.

---

## 1. What an "image reference" IS

An image reference is a single **blank** placeholder region (a transparent Figma `FRAME` named
`img-slot` or `glyph-slot`) nested inside a deliverable's archetype COMPONENT. It carries NO aesthetic of
its own — it only tells you WHERE an image goes and WHAT it should mean. The illustration the `illustrator`
skill generates is the only visual. (NU-brand twins inherit the slot automatically via the component, so
references are recorded once, against the NXT node.)

Every reference answers four questions:
- **WHERE** it sits — the Figma node id + bounds.
- **WHAT** to draw — the scene concept (`imgRole`).
- **HOW** to color it — the ground (`imgGround`) → light or dark contrast palette.
- **WHICH KIND** — panel / hero / thumbnail / glyph (drives size + composition).

---

## 2. WHERE the references live (the manifest surfaces)

### Surface A — the markdown registry (read this; it's the agent-facing index)
- **Master:** `hic-workspace/wiki/brand/figma-node-map.md`, section `## IMAGE-SLOT REGISTRY`. Read this
  first: it states the slot convention, the illustrator contract, the creative-director placement rules,
  the runtime payload contract, and links to the fragments below.
- **Fragments (one per page-group), all in `hic-workspace/wiki/brand/image-slots/`:**
  1. `case-study-recs-strategy.md` — strategy per-action thumbnails; recommendations panel; case-study = no-image.
  2. `personas-competitive.md` — personas per-behavior thumbnails; persona-detail panels; competitive per-peer thumbnails.
  3. `gap-audit-arch-prd.md` — prd milestone thumbnails + panel; tech-audit panel; gap / tech-arch = no-image.
  4. `roadmap-org-themes-blueprint-brief-explainer.md` — roadmap panel; explainer concept thumbnails; themes panel; org / blueprint = no-image.
  5. `minor-pages-and-journey-variants.md` — journey variants (per-phase thumbnails); meta-themes glyphs; mindmap glyph; agenda hero; presentation = no-image.

### Surface B — the live Figma metadata (authoritative locator; cross-check only)
File `iSQhAVM7SI4QHAWB7y9C2z`. Each slot is a `FRAME` named `img-slot…` / `glyph-slot…` with metadata in
the `nxt` shared-plugin-data namespace. To enumerate from Figma directly (e.g. to validate the registry):
```js
// figma-use: list every slot + its metadata on the current page
const KEYS = ['imgRole','imgGround','imgAspect','imgKind','imgElement','imgPhase','imgOptional'];
const slots = figma.currentPage.query('FRAME[name^=img-slot], FRAME[name^=glyph-slot]').toArray();
return slots.map(n => {
  const meta = {}; for (const k of KEYS) { const v = n.getSharedPluginData('nxt', k); if (v) meta[k] = v; }
  return { id: n.id, name: n.name, meta };
});
```
(Slots live on multiple pages — run that once per page; do not switch pages inside the loop.)

---

## 3. The reference schema (the 7 columns of every fragment table)

Each fragment table row is:

`| archetype | node id | kind | ground | bounds (x,y,w,h) | imgElement | scene concept |`

| Column | Maps to Figma key | Meaning / how you use it |
|---|---|---|---|
| **archetype** | (the component name) | Which deliverable + variant this slot belongs to. |
| **node id** | the FRAME id | The authoritative locator. If you composite into Figma, target this node. |
| **kind** | `imgKind` | `panel` (full-height side image), `hero` (large focal), `thumbnail` (per-element square), `glyph` (small mark). Drives the size + composition you request. |
| **ground** | `imgGround` | `light` or `dark` = the slide background behind the slot. Pass it as the illustrator `canvas` so contrast is right (dark ground → light/accent art; light ground → dark/accent art). |
| **bounds (x,y,w,h)** | node geometry | Position + size. NOTE: the coordinate origin varies by fragment (page-absolute vs component-local vs "child of") — the **node id is authoritative**; treat bounds as a sizing/aspect hint, not a hard coordinate. |
| **imgElement** / **imgPhase** | `imgElement` / `imgPhase` | The specific element this thumbnail belongs to (a journey phase, a persona behavior, a strategy action, a competitive peer). Lets you align the image to the right column. |
| **scene concept** | `imgRole` | THE PROMPT SEED. Plain-words description of what the image should MEAN. Pass this to the illustrator as the `concept`. |

Also present in Figma metadata (not always a column): `imgAspect` (w/h) and `imgOptional` (`true|false` —
optional slots can be skipped under a budget; the deck caps at ~4-5 illustrations anyway).

---

## 4. Generate ONE transparent PNG per slot — NEVER a combined sheet

> ### ⛔ OBSERVED FAILURE — do not repeat
> An agent read the persona references and produced a **single `persona_thumbnails_46px.jpeg`** holding
> all four behavior thumbnails. That is wrong on **four** axes, each a hard rule below:
> 1. it **combined 4 slots into 1 image** (each slot is a SEPARATE generation);
> 2. it output a **JPEG** (opaque raster) — slots need **transparent PNGs**;
> 3. it generated at the **46px** render size (46/80/150px is the slot's on-slide DISPLAY size, NOT the
>    generation canvas — generate full-res; the layout scales it down);
> 4. it **saved to Downloads** instead of the illustrations library + the payload field.

### Hard rules (every one of these was broken above)
- **ONE image per table row.** A table with 4 persona behaviors = **4 separate generations** = 4 separate
  files. NEVER a contact sheet, grid, montage, sprite-sheet, or "all thumbnails in one image."
- **Transparent PNG only.** Never JPEG, never an opaque background. The slot composites over the slide.
- **Generate full-resolution.** Ignore the px bounds for generation size — they are where the image is
  *placed*, not how big to *make* it. The endpoint returns a proper-res transparent PNG.
- **Output goes to the library + the payload, never to Downloads.** Use the endpoint; do not hand-draw or
  free-render a raster and download it.

### The loop (run it once PER ROW, across all fragments)
```
for each fragment in wiki/brand/image-slots/*.md:
  for each ROW in the fragment's table (skip "Deliberately left image-free"):
    call the illustrator skill ONCE for THIS row:
      concept = the row's "scene concept" (imgRole), verbatim
      brand   = nxt | nu (deck brand; same NXT node serves both, palette flips)
      canvas  = the row's "ground" (light -> "light", dark -> "dark")
    -> returns ONE transparent PNG url for THIS one slot
    write that url into the payload field at THIS slot's index (see §5)
```

The skill is `.claude/skills/illustrator/SKILL.md`. Endpoint, one call per slot:
`POST /api/ai/illustration { concept, brand, canvas }` → `{ url, dataUri, id, reused }`. `id` =
`sha1(brand|canvas|concept)`, so re-running reuses the cached PNG for free. Each result is cataloged in
`illustrations/_registry.json` (`GET /api/ai/illustrations?brand=&tag=`).

**Budget + taste:** at most ~4-5 illustrations per deck; honor `imgOptional=true` as droppable first; the
image must encode the element's idea, never decorate.

### Worked example (personas 596:2 — the slot set that failed)
Four ROWS in `personas-competitive.md` → **four separate calls**, four transparent PNGs:
| row | concept (verbatim imgRole) | → output |
|---|---|---|
| 678:5471 "The Self-Server" | "Solving alone, surrounded by stale help-center articles…" | `behaviorImages[0]` |
| 678:5473 "The Repeater" | "Re-explaining the same issue handoff after handoff…" | `behaviorImages[1]` |
| 678:5475 "The Waiter" | "Stalled in a queue for an answer the system already knows…" | `behaviorImages[2]` |
| 678:5477 "The Churner" | "Quietly leaving when the fix arrives too late…" | `behaviorImages[3]` |
Each call: `brand="nxt"|"nu"`, `canvas="light"`. NOT one image of four — four images, one per behavior.

---

## 5. WHERE the generated URL goes (runtime payload contract)

The SPA renders deliverables from TypeScript renderer twins, NOT from the Figma components — so a generated
URL only appears if it's written into the deliverable's runtime payload field.

Each generated PNG url is written into an index-aligned `string[]` on the deliverable payload, where
`field[i]` ↔ the i-th element. An empty string at an index = that element renders no image.

- **journey-map — WIRED (2026-06-17).** Field: `journeyMap.phaseImages: string[]`, aligned to
  `journeyMap.stages[]`. Alt carrier: `journeyMap.stages[i].image`. Both twins
  (`services/slideToStageHtml.ts renderJourneyMap`, `components/slideTemplates/web.tsx JourneyMapSlide`)
  render the thumbnail row and omit it when empty.
- **persona-card — IMAGE-FREE (resolved 2026-06-17).** `artifactImageSlots.ts` registers `persona-card`
  as `mode:'none'`. The dense card has no Figma img-slot; generate nothing for it. An earlier
  `behaviorImages[]` carrier was invented and has been reverted in all twins — do not generate for it or
  re-add it. Persona imagery lives on the OVERVIEW (below), which is not wired yet.

  > ⚠️ **TWO different persona components — do not confuse them (this blocked a run):**
  > - **personas OVERVIEW** `596:2` ("GOLD · personas") — HOLDS the four 150×150 slots, one per persona
  >   ARCHETYPE (`678:5471` Self-Server, `678:5473` Repeater, `678:5475` Waiter, `678:5477` Churner).
  >   This is where the four persona PNGs from §4 belong — four separate urls, one per archetype.
  > - **persona DENSE card** page `322:123` / component `614:10` ("identity column + 2×2 grid") — a
  >   single-persona deep-dive. It has **NO img-slot, BY DESIGN** (content-complete dense layout, rule 4).
  >   **Leave its negative space empty — never put a hero image there.** Its only optional art is the small
  >   per-behavior thumbnails inside the BEHAVIORS quad (the `behaviorImages[]` field above), IF you have
  >   per-behavior art; it is never a big negative-space image.
  > See the "PERSONA IMAGE RECONCILIATION" note in `figma-node-map.md` for the canonical archetype-vs-behavior
  > mapping and which renderer twin is wired.
- **All other deliverables — pending per-twin wiring.** strategy (per-action), prd (per-milestone),
  competitive (per-peer), explainer (per-concept), and the single-panel ones (recs / tech-audit / roadmap
  / themes / persona-detail). Until a twin is wired, its slots live in Figma canon only — record the
  reference; follow the journey/persona pattern (an index-aligned `<element>Images: string[]`). See the
  master registry's "REMAINING (renderer twins)" note for live status.

If you composite directly into the Figma file instead of the runtime, place the image into the named node
id from the reference (target by id, not by index).

---

## 6. Skip the deliberate no-image entries

Each fragment has a `## Deliberately left image-free` section. Those archetypes (dense content-complete
tables, connector-collision-prone diagrams like tech-arch, balanced compositions like the presentation
cover) are intentionally image-free. Do NOT generate art for them — a forced image there is a regression,
not coverage. Quality over coverage: a clean slide with no image beats a colliding one.

---

## 7. Quick inventory (what you will find)

- ~45 placed slots across panels / per-element thumbnails / glyphs, plus the slides-page panels
  (cover / section-divider / thesis) and the journey base + 3 variants (5/5/6/5 per-phase thumbnails).
- Each is blank + `nxt`-namespace tagged + NU-twin-inheriting + recorded in one of the 5 fragments.
- The deliberate no-image set is registered too (with reasons) — that is a decision, not a gap.

When in doubt about a node, open the Figma file and read its `nxt` shared-plugin-data (§2 Surface B) — it is
the authoritative copy of every field in the tables.
