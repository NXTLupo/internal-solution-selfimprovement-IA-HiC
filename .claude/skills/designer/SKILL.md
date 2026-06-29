# Designer — runtime visual router for deliverable image slots

> Implements C2 (surface-routed hybrid) of
> `humans-in-control-research/plans/nano-banana-designer-skill-runtime-images-2026-06-25.md`.
> The DESIGNER decides, per image slot in a generated deliverable, which of three visual branches
> fills it, then resolves the chosen branch into a native, replaceable PowerPoint picture at the
> Figma GOLD slot bounds. It does NOT invent a parallel image system — it routes to machinery that
> already exists.

## The three branches (a slot is exactly one)

| Branch | What it is | Tool | When the router picks it |
|---|---|---|---|
| **diagram** | A content-true DATA diagram (operating model, funnel, radar, gantt, matrix, journey) with real labels/links from corpus evidence | deterministic `vizEngine` (`services/vizSlot.ts`) | the slot's payload carries authored data (labels/links/stages/scores) AND the slot is a single panel/hero, OR `#img=diagram` |
| **emotive** | A brand-locked, flat-vector CONCEPTUAL illustration (single continuous line + off-register colour fields) | Nano Banana 2 via `/api/ai/illustration` (`services/artifactIllustrator.ts`) | a registry-approved (`wired`) emotive surface, OR `#img=generate`, OR the section-8 gate is cleared |
| **icon** | A small, ultra-reduced industry/content GLYPH (a mark, not a scene) drawn from the tokenized icon library | `services/iconLibrary.ts` (token-pure SVG, currentColor) | the slot is small/marker-class and a chart is overkill + an illustration is too much, OR `#img=icon` |
| _none_ | the slot is deliberately image-free (dense table, matrix-is-the-body) | — | registry `mode: none`, OR `#img=none` |

The router is `services/visualRouter.ts::routeSlot()`. It is PURE and tested
(`services/visualRouter.test.ts`). The async resolver `resolveRoutedSlotImages()` wraps it.

## The `#img` override (user pins the branch)

Parsed by `hashtagParser.ts::parseImgDirective`. In any Analyst-Desk hashtag prompt:

```
#competitive #img=diagram     -> force the deterministic data diagram
#slides #img=generate         -> force the Nano-Banana illustration
#strategy #img=icon           -> force a tokenized industry/content icon
#journey #img=none            -> suppress slot art entirely
```

Aliases: `#img=viz|chart|data` -> diagram; `#img=art|image|gen` -> generate; `#img=off|skip` ->
none; bare `#img-diagram` / `#img-generate` / `#img-icon` / `#no-image`.

## Vision compliance (every branch obeys UNIFIED_VISION.md)

1. **Never-hardcode.** The diagram branch themes from `/api/design-tokens` (`vizBrandColors`). The
   emotive branch's palette is injected into the Nano prompt from the SAME token mirror
   (`proxy/app.py::_illus_palette`, sourced from `figma-tokens.json` — NOT a hex literal). The icon
   branch fills with `currentColor` resolved from a brand token at render. No branch carries a hex.
2. **SPA never calls Figma live.** Slot existence + bounds come from the mirror
   (`artifactImageSlots.ts`, `HERO_PANEL`, `figma-node-map.md`), never a runtime Figma call.
3. **Anti-slop.** The emotive branch enforces no faces (never a face for a persona), no text-in-
   image, no photoreal, no metaphor clichés, palette-distance post-filter, single continuous line
   (`.claude/skills/illustrator/SKILL.md` is the aesthetic contract this branch reuses). The icon
   branch is monochrome geometric marks only. The diagram branch is text-free vector by construction.
4. **Native replaceable placeholder.** Whatever branch wins, the image lands in a layout-backed
   PPTX picture placeholder (`proxy/gold_pptx_export.py::_insert_native_picture`) at the Figma slot
   bounds, so the user can Change Picture.
5. **Converge, don't build-new.** diagram = existing `vizEngine`; emotive = existing
   `/api/ai/illustration` loop (VS ideation -> Nano Banana -> knockout -> content-hash cache + reuse
   + variant-on-collision = C4); icon = the tokenized library. The router is the only new decision
   layer.
6. **Deterministic re-export.** diagram + icon are deterministic by construction; emotive is cached
   on (content-hash, brand, slot) so a slot is stable across re-exports.

## The section-8 gate (verify before default-on)

The generative (emotive) branch is OFF by default for UNWIRED surfaces
(`isDesignerBranchEnabled()` returns false). It turns on for a surface only when that surface is
registry-`wired:true` (already human-approved, e.g. journey-map) or the user forces it with
`#img=generate`. To clear the gate for unwired surfaces broadly, a human runs the plan's §8 spikes
and then `setDesignerBranchEnabled(true)` (or `localStorage['hic.designer.branch']='on'`):

1. Brand-fidelity spike — 20 emotive images across NXT/NU; ≥80% on-brand after scaffold+filter.
2. Cost/latency — cache hit-rate ≈100% on re-export.
3. Placeholder fidelity — a real PPTX renders the placeholder and survives save/reopen (human-verified).
4. Router accuracy — ≥90% correct diagram/emotive/icon on a labeled sample.
5. Anti-slop regression — zero faces/photoreal/text-in-image.

diagram and icon are deterministic, $0, and anti-slop by construction, so they are NOT gated.

## How a deliverable run uses this

1. Analyst-Desk hashtag prompt -> Opus 4.8 composes the deliverable + grounds evidence.
2. For each slide/section with a registry image slot, the chat seam
   (`CorpusChatPanel.tsx`) calls `resolveRoutedSlotImages(template, payload, brand, theme, {override})`.
3. The router picks the branch; the resolver fills the carrier (diagram fills synchronously at
   compose via `attachViz`; emotive/icon fill the registry carrier the renderer twin reads).
4. Export walks the rendered `<img>`s and places each into a native PPTX picture placeholder at
   the slot bounds.
