---
id: brand/image-slot-rules.md
title: Image-Slot Placement Rules (rollout sub-agents)
type: brand
updated: 2026-06-17
chunks:
  - id: "brand/image-slot-rules.md#c0"
    char_span: [0, 551]
    sentence_count: 6
    key_terms: [isqhavm7si4qhawb7y9c2z, figma, image, content-complete, illustration, layout-aware, placeholders, flat-vector]
    concepts: [figma, image]
    token_count: 144
  - id: "brand/image-slot-rules.md#c1"
    char_span: [564, 1336]
    sentence_count: 2
    key_terms: [light, dark, thumbnail, accent, ground, setsharedplugindata, image, panel]
    concepts: [light, thumbnail, accent, ground, image]
    section: The slot
    token_count: 213
  - id: "brand/image-slot-rules.md#c2"
    char_span: [1393, 3316]
    sentence_count: 16
    key_terms: [column, thumbnails, panel, element, matrix, source, image, slide]
    concepts: [column, thumbnails, panel, element, matrix]
    section: Per-layout-class rules (pick by what the layout IS)
    token_count: 500
    sources: [{"n":"\" prefixes that repeat). Per `.claude/CLAUDE.md` these are","u":""}]
  - id: "brand/image-slot-rules.md#c3"
    char_span: [3342, 4042]
    sentence_count: 3
    key_terms: [never, page, assigned, stroke, setcurrentpageasync, fix, slot, text]
    concepts: [never, assigned, stroke]
    section: MANDATORY discipline
    token_count: 169
  - id: "brand/image-slot-rules.md#c4"
    char_span: [4097, 4434]
    sentence_count: 2
    key_terms: [brand, page-name-slug, hic-workspace, deliberately, frontmatter, image-slots, image-free, imgelement]
    concepts: [brand]
    section: REGISTER (each agent owns its own file — no race)
    token_count: 92
---
# Image-Slot Placement Rules (for the rollout sub-agents) — 2026-06-17

You are placing BLANK image placeholders into NXT GOLD Figma components so the `illustrator` image-gen
agent can later fill them. The slot has NO aesthetic of its own; the generated flat-vector illustration
is the only visual. Work the Figma file `iSQhAVM7SI4QHAWB7y9C2z`. ALWAYS load the `figma-use` skill before
`use_figma`. Be a creative director: smart, layout-aware choices. Quality over coverage — a clean,
content-complete slide with NO image beats a forced/colliding one.

## The slot
- A transparent `FRAME`, `fills=[]`, `strokes=[]`, named `img-slot` (hero/panel/thumbnail) or `glyph-slot`
  (small mark). Nest it INSIDE the archetype COMPONENT (not an instance) so the NU mode twin inherits it.
- Metadata via `setSharedPluginData('nxt', key, value)`:
  - `imgRole` = the SCENE CONCEPT (what the image should MEAN, in plain words — feeds the illustrator).
  - `imgGround` = `dark` or `light` (the slide's background where the image sits; drives the illustrator's
    contrast palette: dark ground -> light/accent art, light ground -> dark/accent art).
  - `imgAspect` (w/h, 2 decimals), `imgKind` = `panel|hero|thumbnail|glyph`, `imgOptional` = `true|false`,
    and for per-element slots `imgElement` = the element label (phase/behavior/case/peer name).

## Per-layout-class rules (pick by what the layout IS)
1. LEFT-ANCHORED title/statement (cover, section-divider, thesis/interstitial, a big-statement slide):
   FULL-HEIGHT vertical image PANEL on the RIGHT edge (edge-to-edge, e.g. x~1100 w~820 h=full). Reflow the
   title to 2 lines in the left column so it clears the panel. NOT a small floating box in a corner.
2. PER-ELEMENT MATRIX (a row/column of parallel items: journey phases, persona behaviors, case-study cases,
   competitive peers, org tiers, the 3/4-column comparison slides): give EACH element its own THUMBNAIL,
   in a band aligned to the element columns. If there's no room, GROW the component taller (the system has
   tall variants) and slide the matrix down, OR cut slop to make room (see rule 5). Square thumbnails
   (~150x150) centered on each element column. This honors "the matrix IS the body" — the thumbnails are a
   table row, not an overlay. (Done already: journey 595:2 has 5 phase thumbnails — match that pattern.)
3. SINGLE deep-dive (one case, one persona detail, a before/after): one supporting image zone sized to the
   free area (a column or panel), `imgKind=thumbnail` or `panel`.
4. CONTENT-COMPLETE DENSE FLOW TABLE with no parallel-element structure (a packed evidence table, a dense
   prose grid that already fills the canvas): NO image, OR at most ONE small `glyph-slot` in a genuinely
   empty corner clear of the source/footer line. Clean data IS the design. Be smart — do not force it.
5. MICRO-LABEL SLOP REMOVAL (owner-authorized): if you need room for imagery, DELETE the tiny ALL-CAPS
   micro-labels that are slop anyway ("WHAT THEY DO", "OUTCOME", "MEANS", "MATTERS", "end user", "tier 1 / 2",
   "SCOPE/ACTORS/PHASES" eyebrow stamps, "SOURCE:" prefixes that repeat). Per `.claude/CLAUDE.md` these are
   banned chrome. Removing them both cleans the slide and frees space. Do NOT delete real content, titles,
   evidence quotes, or source attributions that carry meaning.

## MANDATORY discipline
- VERIFY EVERY placement: give the slot a TEMP dashed cyan stroke, `screenshot()` the component, confirm it
  sits in clear space (NO overlap with text/cells/title/footer), FIX if it collides, then STRIP the stroke
  (`strokes=[]; dashPattern=[]`) so the slot ships blank. The journey/section-divider both needed a reposition
  on first try — expect to iterate.
- Reflow text you displace; never leave overlapping content. Re-screenshot after a fix.
- Token discipline: never hardcode hex/fonts; if you add any visible element, bind to `NXT Brand Tokens` vars.
- Page rule: ONE `setCurrentPageAsync` per use_figma call; work your assigned page(s) only; never touch a
  page assigned to another agent.

## REGISTER (each agent owns its own file — no race)
Write your placed slots to `hic-workspace/wiki/brand/image-slots/<page-name-slug>.md` (include frontmatter
`title` + `type: brand`) as a table:
`| archetype | node id | kind | ground | bounds (x,y,w,h) | imgElement | scene concept |`
Plus a one-line note per component you DELIBERATELY left image-free (and why). Return the same summary.
