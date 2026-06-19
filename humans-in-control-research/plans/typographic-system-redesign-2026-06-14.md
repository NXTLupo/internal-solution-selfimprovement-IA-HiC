# Slide Typographic System Redesign (2026-06-14)

Grounded in an audit of REAL exported PPTX (27 artifacts, both brands) plus the
1920x1080 stage HTML the PPTX background is captured from. The PPTX export
(`gold_pptx_export.html_to_editable_pptx`) screenshots the stage HTML as a
pixel-exact background, then overlays editable text at `px * 0.5` pt with a hard
`max(5pt)` floor, so the stage HTML IS the PPTX look and the editable-text layer
is where size failures show up.

## What the real PPTX audit found (evidence)

Per-run font sizes pulled from the generated `.pptx` files (python-pptx):

1. **Inverted hierarchy.** The action title (the governing conclusion) is NOT the
   dominant element on multiple templates:
   - `stat-row`: hero word "Half" renders **31pt > the 23pt title**.
   - `persona-card`: name "THE RETURNING BUYER" **24-26pt > title**.
   - `block-quote`: a 27pt quote run > title.
   Decoration beats argument. The Partner Test fails: skim the largest text and
   you get "Half / THE RETURNING BUYER", not the insight.
2. **Tiny-text readability failures.** Minimum run sizes on a 1920 export:
   `journey-map` and `org-chart` **5.5pt**, `case-study`/`executive-brief` **6pt**,
   `block-quote`/`persona`/`prd`/`service-blueprint` **7.5pt**, `theme-cluster` 7pt,
   `recommendation` 8pt, `stat-row` 8.2pt. This is the quantified root of the
   repeated "increase body copy size" learned constraints.
3. **No type scale.** ~45 distinct sizes across renderers; `theme-spotlight` alone
   uses **11 distinct sizes on one slide**; most use 6-9. Sub-1.1x steps in the body
   band, hand-tuned per template by eye.
4. **No weight ladder.** All eight weights in play; labels render w700 UPPERCASE
   while the title/content they label sit at w400/600. Weight stopped encoding
   importance. Two tracking unit systems (px AND em), ~9 tracking values.
5. **Two parallel type systems in web.tsx** (GoldFrame tokens vs nu-artifact CSS)
   set the same role differently; the action title alone differs by a font family
   and 200 weight units between them.
6. **Density failures cut both ways.** `systems-inventory`/`gap-matrix` are a flat
   wall of 10pt; `journey-map` wastes vast vertical space with one short phrase per
   tall cell (under-dense). Density is uncontrolled, not tuned.
7. **Encoding bug.** `block-quote` largest run is `�` (smart-quote mojibake)
   in the PPTX editable-text layer. Fix smart quotes -> straight, or encode UTF-8
   through the text-run path.

## The decisions (locked with the user 2026-06-14)

- CONTENT-DENSE layouts that respect each artifact's expert skill + required
  dimensions, with the type treatment fixed.
- Q1 body-floor numbers confirmed.
- Q2: never truncate mid-sentence; overflow flows to CONTINUATION slides; those
  continuation slides must show layout DIVERSITY and visual interest that still
  fit the artifact's expert guidance.
- Method: audit real exported decks per hashtag artifact (done), then design new
  layouts that solve the audited issues.

## The system (stage = 1920-space px; web preview = half; PPTX pt = px * 0.5)

### Modular type scale (content-dense, minor-third 1.2 in the body band, hard jump to title)
| Role | stage px | pptx pt | use |
|---|---|---|---|
| label / kicker / meta | 15 | 7.5 | mono, Medium 500, grey, uppercase, tracking 1.5px (kicker 4px) |
| caption / sub | 17 | 8.5 | secondary annotations, source lines |
| body | 21 | 10.5 | the floor for primary reading text |
| lead | 25 | 12.5 | hero WORDS, KPI values, emphasized body |
| name / h3 | 30 | 15 | card names, theme names, persona name |
| subhead / h2 | 36 | 18 | rare; sub-section heads, big single stat label |
| ACTION TITLE / h1 | 46 | 23 | the governing conclusion; ALWAYS the largest element on a content slide |
| display | 60 | 30 | section-divider numeral ONLY (no competing title) |

HARD MINIMUM: no text below **17px / 8.5pt** on any slide, ever (was 5.5pt). When
density would force smaller, overflow to a continuation slide instead.

### Weight ladder (kills the 8-weight muddle)
- **400 Regular** = body, captions, quotes, hero numerals (light so data reads as data, not shouting).
- **500 Medium** = labels, meta, mono, source lines. Always GREY. NEVER heavier than the content they label.
- **600 SemiBold** = action title, card/theme/persona names, takeaway band. (NU title = 700, its only contrast lever since it is single-typeface Lato.)
No 700/800 labels. No 200/300 anywhere.

### Hierarchy doctrine (the "insights prioritization")
1. **One governing line.** The action title is the single largest text element on
   every content slide. Hero numerals/words are capped at LEAD (25px) and may never
   exceed the title. (Fixes stat-row 31>23 and persona 26>23.) section-divider is
   the only exemption.
2. **One hero element max** per slide gets lead size; everything else steps to body.
3. **Labels recede** by size + grey, not by weight. Uppercase only on the kicker and
   ONE section eyebrow, not on every micro-label.
4. **Body is legible**: 21px target, 17px hard floor.
5. **Measure**: body lines cap ~62ch (set max-width); titles already cap at 1400px.
6. **Tracking**: px only, uppercase mono only (kicker 4, label/meta 1.5). Title -0.5. Body 0. No em units in the TSX.
7. **Vertical rhythm**: 4px base spacing scale (4,8,12,16,24,32,48,64). No ad-hoc gaps.

### Density tie-break (auto by flag + continuation)
- Keep every evidenced item; type steps DOWN within the scale to the 17px hard floor.
- If items still exceed the floor capacity -> OVERFLOW to a CONTINUATION slide. Never
  shrink below the floor; never truncate mid-sentence (the clause-aware trunc() stays
  the last resort and already finishes sentences).
- Continuation slides use a DIFFERENT but skill-appropriate layout for diversity:
  - theme-cluster -> theme-mosaic / theme-arc
  - case-study before-after -> evidence-stack
  - stat-row -> block-quote / principles
  - competitive-matrix / gap-matrix / systems-inventory -> rows continue on a second
    matrix slide with a "(continued)" eyebrow, same columns.
  - journey-map / service-blueprint -> phases continue on a second matrix; never split a phase.

## Pipeline contract (no hardcode, no RAG)

Everything flows: Analyst Desk `#prompt` -> manifest chunks -> FIGMA design
patterns -> generation -> self-improvement. The type system obeys it:
- The Figma GOLD/Slides TEXT STYLES are the SOURCE OF TRUTH for the scale + ladder.
- They serialize to `figma-tokens.json` and stream through `/api/design-tokens`.
- `hydrateTokensFromFigma()` overwrites the build-time SCALE/WEIGHT/SPACE defaults
  in types.ts at runtime (fail-loud if the feed is missing). Renderers paint from
  the hydrated values, never from hardcoded canon.
- The generation model learns the hierarchy doctrine from the `/api/design-tokens`
  prompt block + the manifest-chunked design-system pages + the skill, NOT from
  RAG injection and NOT from renderer-side magic.
- Edits/corrections feed the learned-constraints + SkillOpt loop so the doctrine
  compounds.

## Build surfaces (in dependency order)
1. `components/slideTemplates/types.ts` TOKENS: add `SCALE`, `WEIGHT`, `SPACE` maps + a
   `hero cap` rule. Single source of truth, hydrated from Figma.
2. `hic-workspace/design-system/figma-tokens.json` + `/api/design-tokens`: expose the
   scale/weight/space so the renderer paints from Figma, not hardcode.
3. `services/slideToStageHtml.ts` `buildShell` + every render*: read SCALE/WEIGHT/SPACE;
   enforce title-dominance + hero cap + 17px floor; fix the journey/blueprint cell
   vertical-fill (denser content, vertical centering) and the smart-quote encoding.
4. `components/slideTemplates/web.tsx`: reconcile the nu-artifact system onto the same
   scale; GoldFrame chrome reads tokens.
5. `components/slideTemplates/pptx.ts`: align the legacy pt sizes to scale*0.5 (or keep
   deprecated; gold-HTML path is primary).
6. SLIDE OUTPUT PROTOCOL (`corpusChatService.ts` DELIVERABLE_PROTOCOL): teach the model
   the hierarchy doctrine + when to emit density=dense + continuation behavior.
7. Skill: `nxt-visual-renderer/references` + a new `typographic-system.md` reference.
8. Hook: extend `validate_*` to flag content-side hierarchy violations the model can
   control (e.g. ALL-CAPS shouting headers in content, hero word longer than a label).
9. Figma: GOLD + Slides pages, both files (NXT iSQhAVM7SI4QHAWB7y9C2z, NU
   z2v9Pvhg23hlljEitPBdAt): create named TEXT STYLES matching the scale + weight ladder;
   rebuild the GOLD frame typography; refresh figma-tokens.json from them.

## Status
- [x] Real-PPTX audit (27 artifacts, both brands) + stage screenshots.
- [x] System defined (this doc).
- [ ] Token foundation in types.ts (in progress).
- [ ] buildShell + renderers reconciled.
- [ ] web.tsx reconciled.
- [ ] protocol + skill + hook.
- [ ] Figma text styles, both files.
- [ ] Re-export + re-audit to confirm: title dominant everywhere, no run < 8.5pt, <= 6 sizes/slide.
