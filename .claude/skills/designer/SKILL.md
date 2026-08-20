---
name: designer
description: Runtime visual router for deliverable image slots. Decides, per slot, which of the three visual lanes fills it: native GOLD exhibit render, composable content-true icon, or generated illustration. Bound by the ten HiC Design Laws in hic-workspace/wiki/brand/design-laws.md (tokens only, content-true or nothing, native render never image-gen for exhibits, collision bans). Use when a deliverable declares image slots and the lane choice is not already fixed by the archetype registry.
---

# Designer — runtime visual router for deliverable image slots

> DESIGN CONSTITUTION (2026-08-07, D1): all visual output is bound by the ten HiC Design Laws
> in `hic-workspace/wiki/brand/design-laws.md`. Tokens only (Law 1), content-true or nothing
> (Law 6/ADR-0006), native render never image-gen for exhibits (ADR-0003), collision bans
> (Law 10). Deviations: fix or log in `design-desk/deviation-register.md`, never silent.

> Implements C2 (surface-routed hybrid) of
> `humans-in-control-research/plans/nano-banana-designer-skill-runtime-images-2026-06-25.md`,
> re-based by E4 of `humans-in-control-research/plans/artifact-total-elevation-2026-07-02.md`:
> the generative diffusion ("emotive" memphis-iso) branch is RETIRED and replaced by the NATIVE
> INFOGRAPHIC lane. The DESIGNER decides, per image slot in a generated deliverable, which visual
> branch fills it, then resolves the chosen branch into a native, replaceable PowerPoint picture at
> the Figma GOLD slot bounds. It does NOT invent a parallel image system — it routes to machinery
> that already exists.

## Scene/photo imagery (Law 12 - covers, persona portraits, lifestyle strips, phase strips)

Slots OUTSIDE the data branches below (cover backgrounds, persona portraits, behavior scenes,
journey/blueprint phase strips) ride the `/api/ai/illustration` lane (styles line |
photo-background | photo-portrait | photo-scene, literal=true) under design-laws **Law 12**:
every GENERATE instruction carries `DERIVED FROM: [the deliverable field this image depicts,
quoted]` + `SOURCE ANALYSIS: [field name + cited source]`. The image depicts the FINDING (the
theme insight, the phase's evidenced pain, the persona's behavior sentence), never the bare
industry topic. REUSE FIRST (owner cost rule 2026-08-07): check the catalog
(GET /api/ai/illustrations) for a content-matching image before generating; the lane reuses by
concept id automatically. Empty slot in a shipped artifact = gate violation.

## The branches (a slot is exactly one)

| Branch | What it is | Tool | When the router picks it |
|---|---|---|---|
| **diagram** | A content-true DATA diagram (operating model, funnel, radar, gantt, matrix, journey) with real labels/links from corpus evidence | deterministic `vizEngine` (`services/vizSlot.ts`) | the slot's payload carries authored data (labels/links/stages/scores) AND the slot is a single panel/hero, OR `#img=diagram` |
| **infographic** | A NATIVE, token-locked infographic panel composed from the element's OWN data (stat-row, process-flow, comparison, ranked-bars, composition) rendered HTML/CSS→Chromium, chromeless, at the slot's frame | `/api/ai/diagram` with `kind` in the infographic families + `chrome:'none'` + `frame:{w,h}` (`proxy/nxt_diagram_render.py`, called from `services/artifactIllustrator.ts::infographicSpecFrom` + `generateOne`) | a registry slot whose audit branch is `infographic` (or the legacy value `emotive`), OR `#img=generate`, OR a conceptual panel with no authored viz data (heuristic fallback) |
| **icon** | A small, ultra-reduced industry/content GLYPH (a mark, not a scene) drawn from the tokenized icon library | `services/iconLibrary.ts` (token-pure SVG, currentColor) | the slot is small/marker-class and a chart is overkill + an infographic is too much, OR `#img=icon` |
| _none_ | the slot is deliberately image-free (dense table, matrix-is-the-body; also the decorative `slides:*` chrome surfaces, interim until the E3 creative-director pass defines their visual language) | — | registry `mode: none` / audit branch `none`, OR `#img=none` |

The router is `services/visualRouter.ts::routeSlot()`. It is PURE and tested
(`services/visualRouter.test.ts`). The async resolver `resolveRoutedSlotImages()` wraps it.

## Why the diffusion branch was retired (E4, 2026-07-02)

The memphis-iso diffusion lane (`/api/ai/brand-image`, Nano-Banana illustration prompts) failed
live: off-brand palettes, invented scenes with no relation to the slide's evidence, occasional
text-in-image, and non-deterministic re-exports. The infographic lane replaces it with panels that
are content-true by CONSTRUCTION: the spec is derived from the element's own fields
(`infographicSpecFrom`: actions/steps → process-flow; beforeAfter → comparison; KPI tiles →
stat-row; citation mix → composition), rendered with locked typography, the token palette, and real
icon glyphs. Text-in-image defects are impossible because the text IS typeset HTML. If an element
carries no derivable data, the slot stays EMPTY (`infographicSpecFrom` returns null) — no invented
scene, ever.

## The `#img` override (user pins the branch)

Parsed by `hashtagParser.ts::parseImgDirective`. In any Analyst-Desk hashtag prompt:

```
#competitive #img=diagram     -> force the deterministic data diagram
#slides #img=generate         -> force the native infographic panel
#strategy #img=icon           -> force a tokenized industry/content icon
#journey #img=none            -> suppress slot art entirely
```

Aliases: `#img=viz|chart|data` -> diagram; `#img=art|image|gen` -> generate (infographic); `#img=off|skip` ->
none; bare `#img-diagram` / `#img-generate` / `#img-icon` / `#no-image`.

## Vision compliance (every branch obeys UNIFIED_VISION.md)

1. **Never-hardcode.** The diagram branch themes from `/api/design-tokens` (`vizBrandColors`). The
   infographic branch resolves its palette, fonts, and spacing inside the proxy renderer from the
   SAME token mirror (`figma-tokens.json` via the diagram palette loader — NOT a hex literal). The
   icon branch fills with `currentColor` resolved from a brand token at render. No branch carries a hex.
2. **SPA never calls Figma live.** Slot existence + bounds come from the mirror
   (`artifactImageSlots.ts`, `HERO_PANEL`, `figma-node-map.md`), never a runtime Figma call.
3. **Anti-slop.** The infographic branch is content-true by construction (composed from the
   element's own fields; empty when no data), typeset natively (no text-in-image defects possible),
   and token-locked. The icon branch is monochrome geometric marks only. The diagram branch is
   collision-free vector by construction.
4. **Native replaceable placeholder.** Whatever branch wins, the image lands in a layout-backed
   PPTX picture placeholder (`proxy/gold_pptx_export.py::_insert_native_picture`) at the Figma slot
   bounds, so the user can Change Picture.
5. **Converge, don't build-new.** diagram = existing `vizEngine`; infographic = the existing
   `/api/ai/diagram` native-render pipeline (D17) extended with slot-scale families + chromeless
   shell; icon = the tokenized library. The router is the only decision layer.
6. **Deterministic re-export.** ALL branches are deterministic by construction: same element data +
   brand + frame → the same rendered panel. Content-hash caching in the illustrator loop keeps a
   slot stable across re-exports.

## No gate (section-8 gate retired with the diffusion branch)

The section-8 verify-before-default gate existed to hold the GENERATIVE diffusion branch off until
brand-fidelity spikes passed. The native infographic lane is deterministic, token-locked, and
content-true by construction, so there is nothing to gate. `isDesignerBranchEnabled()` /
`setDesignerBranchEnabled()` remain as deprecated no-ops for one release (import compatibility);
do not build new logic on them.

## How a deliverable run uses this

1. Analyst-Desk hashtag prompt -> the routed artifact model composes the deliverable + grounds evidence.
2. For each slide/section with a registry image slot, the chat seam
   (`CorpusChatPanel.tsx`) calls `resolveRoutedSlotImages(template, payload, brand, theme, {override})`.
3. The router picks the branch; the resolver fills the carrier (diagram fills synchronously at
   compose via `attachViz`; infographic derives a spec from the element via `infographicSpecFrom`
   and POSTs `/api/ai/diagram` with `chrome:'none'` + the slot frame; icon fills from the glyph
   library).
4. Export walks the rendered `<img>`s and places each into a native PPTX picture placeholder at
   the slot bounds.
