# Typographic System (slide deliverables)

The type contract every hashtag artifact obeys. Source of truth: the Figma Brand
Tokens `type/*` variables, served live at `/api/design-tokens` and hydrated into the
renderers. This file is the model-facing render contract; do not hardcode sizes in a
renderer and do not invent values. All sizes are 1920-space stage px; the 960 web
preview and the PPTX both render at half.

Background: the 2026-06-14 real-PPTX audit found titles out-ranked by hero numerals,
content text at 5.5pt, 11 sizes on one slide, and w700 uppercase labels out-shouting
the insight. This system fixes that.

## Scale (one ladder, every template)
| role | stage px | use |
|---|---|---|
| label | 15 | mono kicker / meta / micro-label, Medium 500, grey, uppercase, tracking 1.5px (kicker 4px) |
| caption | 17 | source lines, secondary annotation |
| body | 21 | primary reading text (the floor target) |
| lead | 25 | hero words, KPI values, emphasized body |
| name | 30 | card / theme / persona names |
| subhead | 36 | rare sub-section heads |
| title | 46 | the action title, ALWAYS the largest element on a content slide |
| display | 60 | section-divider numeral ONLY |

HARD MINIMUM: 17px / 8.5pt. Never below it. If content will not fit at the floor,
flow it to a continuation slide; never truncate mid-sentence.

## Weight ladder (weight encodes importance)
- 400 body, quotes, hero numerals (light = data, not a headline)
- 500 labels, meta, mono, source lines (always grey)
- 600 (NXT) / 700 (NU) action title, names, takeaway band

A label is never heavier or darker than the content it introduces.

## Hierarchy doctrine (how to prioritize text)
1. ONE governing line: the action title carries the conclusion and is the most
   dominant text. Never bury it under a bigger number, name, or label.
2. HERO CAP: a hero numeral or word is evidence, set at lead (25) in body weight; it
   may not out-rank the title. Numbers ride inside cited quotes (Quantitative Claim Rule).
3. LABELS RECEDE: mono, label-weight, grey, sentence-case; UPPERCASE on the kicker only.
   Prefer a fixed POSITION (e.g. the top-left meta slot) or a 4px colored tick (warn=pain,
   cool=opportunity) over a written label.
4. EMPHASIS SCARCITY: reserve the brand accent for the single most important datum per
   slide. Structural accents keep their meaning; do not spray accent.
5. MEASURE: body lines cap ~62 characters. Vertical rhythm on the 4px space scale.
6. PARTNER TEST: reading only the action titles across a deck tells the whole story.

## Content-dense + continuation (locked 2026-06-14)
Honor each artifact's expert dimensions and pack real evidenced content. Keep every
evidenced item; the renderer steps type down to the 17px floor. If items still exceed
the floor's capacity, OVERFLOW to a continuation slide. Continuation slides use a
DIFFERENT skill-valid layout for variety:
- multi-instance artifacts cycle a variant ladder (theme: cluster -> spotlight -> arc ->
  mosaic; case-study: four-block -> before-after -> evidence-stack; recommendation:
  grid -> impact-cards -> strip).
- single-canonical artifacts (org-chart, architecture-map, journey-map, service-blueprint,
  systems-inventory, competitive-matrix, gap-matrix) continue on a second slide of the
  SAME layout with a "(continued)" eyebrow; never split a phase or row group.

## What a sloppy slide looks like (avoid)
- A hero number bigger than the title.
- A w700 UPPERCASE label above w400 body.
- Five sizes doing the work of two.
- Text the reader cannot comfortably read on a projected slide.
- A label that repeats what the position already says.
