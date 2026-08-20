---
name: illustrator
version: 1.0
category: visual-generator
description: Generates ONE tasteful, on-brand, minimalist abstract FLAT-VECTOR illustration per scene to support a #presentation (:5014 renderer) - never AI photo-slop. NARROWED 2026-07-02 (E4): this is the #presentation lane ONLY; GOLD artifact + #slides image slots route to the native infographic lane per the `designer` skill, NOT here. The image relates to the scene's content, uses ONLY the brand palette (NXT or NU tokens from /api/design-tokens), and is produced by Nano Banana 2 (gemini-3.1-flash-image-preview) or GPT Image 2 (gpt-image-2). Apply when a presentation scene needs a supporting graphic. Pairs with deck-narrative-composer (the scene content) and the brand token system (the palette).
thinking: high
---

# Illustrator

Deliverables are bland without visuals, but generic AI imagery is slop. This skill produces the ONE
acceptable kind for NXT: a **minimalist, abstract, flat vector illustration** that (a) means something
about the scene's content and (b) uses only the brand colors. It is a SUPPORTING graphic, never the
hero - the action title carries the message; the illustration reinforces it.

## When to call
A `#presentation` section needs a supporting visual. This is WIRED LIVE (2026-06-17): the narrative
composer adds an `imageConcept` (shapes-as-idea) to the sections that warrant art; the runtime
(`services/presentationIllustrator.ts`) calls the proxy per concept and writes the resolved image URL
to `section.data.illustration`; the :5014 presentation-renderer floats it (transparent) behind the
section content. (`#slides` Figma archetypes with designer-authored image placeholders are the next
target.) Emit ONE illustration per section that warrants it, AT MOST 4-5 across a deck; not every
section needs one (negative space is a feature). Decorative-only images are FORBIDDEN - the image
must encode the section's idea.

## GOLD artifacts + #slides DATA slots: SUPERSEDED (E4, 2026-07-02) — do NOT generate here
The former "registry coverage contract" for GOLD deliverables and #slides DATA/CONTENT slots is
RETIRED with the diffusion content-image lane. Those slots are routed by
`services/visualRouter.ts` per the `designer` skill: content slots (theme thumbnail, persona detail,
case-study, recommendation) fill from the NATIVE infographic families (`/api/ai/diagram`, composed
deterministically from the element's own data via `artifactIllustrator.ts::infographicSpecFrom`);
icon slots fill from the tokenized glyph library; data panels fill from `vizEngine`. This skill
generates nothing for those data surfaces. Its scopes are the `#presentation` (:5014) lane below
and the PHOTOGRAPHIC #slides lane that follows.

## PHOTOGRAPHIC #slides slots (2026-07-03, owner-directed — the ideal-deck parity lane)
Four `slides:` archetype slots fill with **editorial PHOTOGRAPHY** (opaque, NOT knocked out),
generated through `/api/ai/illustration` with `style: photo-background | photo-portrait |
photo-scene` and `literal: true`. Registry entries: `slides:cover` + `slides:agenda`
(backgroundImage, full-bleed scene under a rail-token scrim; the agenda REUSES the cover's image,
never generates its own), `slides:numbered-themes` (itemImages[], one environmental thumbnail per
item), `slides:role-needs` (portraitImage, environmental portrait of the role).

**CONTENT-FIRST, INDUSTRY-AGNOSTIC (HARD).** The scene concept is LITERAL TEXT lifted from the
slide's OWN generated payload (title + subtitle; item name + body line; persona.name + title) —
built AFTER content generation, by `artifactIllustrator.resolveArtifactImages`. Verbalized
sampling is SKIPPED for photo styles (`literal: true`): VS rewards non-obvious metaphors, which is
exactly wrong here — the photograph must depict what the retrieved corpus is about, whatever the
domain (a hospital ward for a healthcare run, a trading floor for a finance run, a field for an
agriculture run). NOTHING in the prompt chain names a domain; the payload text carries it.

**Photo style contract** (`proxy/app.py::_photo_prompt`):
- backgrounds: wide establishing shot, uncluttered headroom, darker lower third (a scrim + white
  display type sit on top), horizon low
- portraits: ONE person who authentically belongs to the content's context, in their real working
  environment, candid, respectful, specific, non-stereotypical
- all: natural light, muted cinematic grade, ABSOLUTELY no text/logos/UI/charts in the image
- photos stay OPAQUE (the transparency knockout below applies ONLY to line-art)
- cache: content-hash by concept+style (each scene generated once, reused across exports)

## The image library (persist + catalog + reuse)
Every generated illustration is saved as a transparent PNG and cataloged so it is REUSABLE, not
regenerated each run:
- Endpoint: `POST /api/ai/illustration { concept, brand:"nxt|nu", canvas:"dark|light" }` ->
  `{ url, dataUri, id, reused }`. `url` is a proxy-served static path
  (`/hic-workspace/wiki/design-system/illustrations/<id>.png`) the :5014 renderer fetches.
- REUSE: the id is `sha1(brand|canvas|concept)`; an exact match returns the cached PNG instantly
  (`reused:true`) - re-running a presentation costs nothing for unchanged scenes.
- CATALOG: each image gets an entry (id, concept, brand, canvas, tags, url) in
  `hic-workspace/wiki/design-system/illustrations/_registry.json`, browsable via `GET /api/ai/illustrations?brand=&tag=` for agentic
  retrieval and Phase-B Figma componentization.

## Placement + motion doctrine (how the illustration sits and moves)
The art is SUPPORTING and must NEVER collide with text. Placement is deterministic, keyed by
section kind, and resolved in normal layout flow (grid track or stacked block), never absolutely
positioned over copy. The :5014 renderer (`SectionWrapper` in `App.tsx`) implements this; the
composer just chooses WHICH narrative sections deserve art (see the composer prompt).
- **hero** -> a FOCAL graphic STACKED ABOVE the centered title (its own block, ~32vh). Reads as
  the deck's opening mark.
- **context / cta / quotes** (text-light narrative kinds) -> a TWO-COLUMN row: copy in the left
  track, illustration in a reserved right track (~38%), generous gutter. Two real grid tracks mean
  text can never enter the art's column - collision is impossible by construction.
- **any other (data-dense) kind** -> NO side column (the section needs its full width). If art was
  attached anyway it degrades to a faint right-edge BACKDROP wash (opacity ~0.12) that cannot
  compete with content. So: do NOT request art on data-dense kinds (themes grids, evidence stat
  walls, journey, roadmap, gap, tech_arch, competitive) - it will only ever wash out.
- **Parallax**: the art drifts GENTLY AGAINST the scroll (a depth cue - it reads as sitting behind
  the text plane) and fades with the section. The drift is small and stays inside the art's own
  zone, so motion never carries the image across the text.
- **Composition implication**: because the art occupies its OWN zone (a column or a stacked block),
  the CONCEPT should be a single balanced subject that reads at column scale, with the visual
  weight roughly centered - not a wide edge-to-edge scene that expects the full canvas.

## The aesthetic contract (NON-NEGOTIABLE)
- **Flat vector only.** Bauhaus / Swiss / mid-century-modern abstraction: bold geometric or fluid
  organic shapes, clean linework, generous negative space, balanced composition.
- **Brand palette ONLY** (resolved per brand from `/api/design-tokens?brand=NXT|NU`, never invented):
  - NXT: chartreuse `#B8B800`, deep teal `#115054`, cyan `#00B7C3`, near-black `#0D0D0D`, white ground.
  - NU: Huskies red `#C8102E`, navy `#0E1626`, source teal `#1D6E64`, warm gold `#A4804A`, white ground.
  Name the colors AND their hex in the prompt; cap the palette at 3-4 colors + white.
- **Enforce flatness** (image models drift to 3D): "flat design, solid spot colors, ZERO gradients,
  no 3D, no texture, sharp edges."
- **Control the chaos:** "generous negative space, balanced margins, whitespace."
- **Absolutely NO text, words, letters, logos, watermarks, or UI** anywhere in the image. (The brand
  wordmark is composited by the renderer from the registry, never generated.)
- **Pure white (or `color/paper`) background** unless the scene is full-bleed-dark, then near-black ground.

## Voice + ideation: conceptual creative director, via Verbalized Sampling
The runtime does NOT send the section idea straight to the image model (that collapses to the mode =
cliche). It runs a two-step pipeline (`_vs_select_concept` -> `_illustration_prompt` in proxy/app.py):

1. **Verbalized Sampling ideation.** A text model, cast as a celebrated conceptual art director
   (Noma Bar / Saul Bass / Malika Favre lineage), proposes FIVE genuinely DISTINCT concepts that
   span the space of strong ideas, each self-rated for `typicality` (how obvious/overused) and `fit`
   (how well it reads at the section's layout slot). Sampling a DISTRIBUTION (not one greedy answer)
   is what defeats mode-collapse and surfaces the non-obvious idea.
2. **Layout-aware selection.** The runtime picks the candidate that maximizes `fit - 0.6*typicality`
   among recognizable options - i.e. the freshest concept that still reads well in its slot (hero
   focal / side panel / backdrop). That chosen concept feeds the image prompt.

The CORE BAR (both steps enforce it): every concept must be **MEANINGFUL, RELEVANT, and instantly
RECOGNIZABLE** - a viewer sees a real, concrete subject and immediately grasps how it relates to the
idea. RECOGNIZABLE-BUT-FRESH, never pure abstraction (abstraction reads as random) and never the
predictable cliche. BANNED cliche motifs (refused at both steps): shattered/fractured circle,
pie/aperture, scattered shards, connected dots/nodes (network/constellation), upward arrows /
growth bars, lightbulb, brain, gears, puzzle pieces, handshake, globe, target/bullseye, chess piece,
rocket, mountain/summit, maze, winding road, compass, checkmark, generic connection webs, logo-marks.

## What the composer supplies (the `imageConcept` seed)
The composer hands in the section's IDEA / relevant subject as `imageConcept` - a clear, recognizable
subject tied to the content (the runtime VS then diversifies + selects the witty angle). Seed it with
the SUBJECT, not an abstraction. Examples of good seeds (idea -> the runtime finds the twist):
- human-in-the-loop -> "a person's steady hand guiding an automated process"
- many tools collapsing into one workflow -> "many separate desktop tools becoming a single clean surface"
- climate volatility hedged by insurance -> "a farm field sheltered from a turbulent sky"
Avoid seeding the cliche itself ("converging nodes", "fractured circle"); name the real subject.
Style references (organic-fluid, geometric-Bauhaus, mid-century-landscape, continuous-monoline,
radical-minimalism) pick the SHAPE LANGUAGE; the palette ALWAYS stays brand.

## Transparency (MANDATORY — the art must float on any canvas, NEVER a white box)
NEITHER model outputs native alpha (verified 2026-06-17): `gpt-image-2` rejects `background:"transparent"`
("not supported for this model"); Gemini returns an OPAQUE jpeg/png on a solid ground. So transparency
is a deterministic POST-PROCESS ("knockout"), applied to whichever model's output:
1. Generate on a solid WHITE ground (prompt: "isolated subject ONLY ... NO background fill").
2. Flood-fill the connected background to alpha from the 4 corners + edge midpoints with a generous
   tolerance (~110) so the AI "white" dither is swallowed but the saturated flat-color art is kept.
3. Clean the residual near-white halo (any pixel >=224 on all channels → alpha 0; safe because the
   brand palette has NO white fills — white is only ground).
Result is a transparent PNG that blends on dark / light / navy (verified on all three).

## Model routing
- **DEFAULT (use this): Nano Banana 2** = `gemini-3.1-flash-image-preview` (Gemini REST
  `:generateContent`, `responseModalities:["IMAGE"]`, `GEMINI_API_KEY`). Best flat-vector art
  (flowing + geometric), cheapest, fastest. Then run the knockout above.
- Optional alternate: **GPT Image 2** = `gpt-image-2` (OpenAI `/v1/images/generations`, `1024x1024`,
  `OPENAI_API_KEY`) — only for tight geometric/grid compositions if Nano Banana underperforms. Same
  knockout required (it CANNOT do native transparency). Do not default to it.

## Canvas-contrast rule (so the subject never disappears)
Because the art is transparent, its colors must CONTRAST the scene's canvas. On a full-bleed-DARK
scene, the subject's dominant color must be a LIGHT/accent brand color (chartreuse/cyan/paper for NXT;
gold/red/paper for NU) - NEVER near-black, which vanishes on a dark ground. On a LIGHT scene, use the
dark/accent colors. Pass the scene's background into the prompt's palette ordering accordingly.

## Quality gate (reject + regenerate once)
Reject and re-prompt if the image has: any text/letters/logo, a gradient or 3D shading, a color
outside the brand palette, photo-realism, clutter with no negative space, or a literal stock-photo
scene. One bounded regeneration; if it still fails, omit the image (a clean scene beats a slop image).
