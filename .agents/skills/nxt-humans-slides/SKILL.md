---
name: nxt-humans-slides
invocation: runtime
disable-model-invocation: true
version: 1.0
description: "Generate PowerPoint (.pptx) decks in the NXT Humans brand system — anti-slop business flat minimalism with Bebas Neue + Archivo typography, chartreuse/cyan accents, strict black-and-white dominance, and sharp geometry. Use this skill whenever the user asks for NXT Humans branded slides, a Humans in Control deck, an Intelligence Augmentation Suite deliverable, any consulting deck in the NXT style, or references the NXT Humans design system / style guide / brand. Also use when the user asks to 'build slides from this content in our brand,' 'turn this report into a deck,' or 'make a presentation like our other decks.' The skill includes 15 codified slide templates covering cover, section divider, agenda, executive summary, stat row, evidence quote, split panel, color-block grid, three-column grid, recommendation, chart, matrix, process timeline, do/don't, and closing. Do not use this skill for generic presentations where no NXT Humans branding is requested."
---

# NXT Humans Slide System

Anti-slop business flat minimalism for PowerPoint. Every slide in this system earns its place — no gradients, no rounded cards, no stock imagery, no accent lines under titles, no pie charts, no purple, no Inter/Roboto. The single rule: **if it looks like AI made it, it's wrong.**

## When to use this skill

Trigger on any request involving NXT Humans slides, Humans in Control deliverables, brand-consistent client decks, or a request to port existing NXT Humans HTML/report content into PowerPoint. If the user is just asking for a generic deck with no brand reference, use the general pptx skill instead.

## Quick workflow

1. Read `references/layouts.md` to pick the right template for each piece of content.
2. Read `references/design-tokens.md` for the exact color, type, and spacing values.
3. Copy `assets/nxt-tokens.js` into the working directory and `require` it from your generator script. This is the single source of truth for tokens — do not re-type hex values.
4. Use the renderer twins as the starting reference: `humans-in-control-research/components/slideTemplates/web.tsx` (preview) and `humans-in-control-research/services/slideToStageHtml.ts` (export stage).
5. Run `node generate.js` → produces `.pptx` in `/home/Codex`.
6. Before delivering: run the anti-slop checklist in `references/anti-slop-checklist.md` and do a visual QA pass (see below).

## The 15 templates at a glance

| # | Template | Use for |
|---|----------|---------|
| 01 | Cover | Deck title slide |
| 02 | Section Divider | Chapter breaks in long decks |
| 03 | Agenda / Contents | Table of contents |
| 04 | Executive Summary | Opening narrative slide |
| 05 | Stat Row | 3 oversized metrics |
| 06 | Evidence Quote | Single pull-quote or testimonial |
| 07 | Split Panel | Analysis paired with evidence |
| 08 | Color-Block Grid | 2x2 parallel concepts |
| 09 | Three-Column Grid | 3 parallel concepts/principles |
| 10 | Recommendation | The one big takeaway |
| 11 | Data Chart | Bar/column/line with conclusion title |
| 12 | Comparison Matrix | Scored table of options |
| 13 | Process Timeline | Horizontal stepped process |
| 14 | Do / Don't | Two-column guidance |
| 15 | Closing | End slide with closing slogan |

Full layout specs (positions, font sizes, content length rules) live in `references/layouts.md`.

## Hard rules — do not violate

1. **Typography**: Bebas Neue for all headlines. Archivo for body. JetBrains Mono for code only. Never Inter, Roboto, Arial, Poppins, Space Grotesk.
2. **Color dominance**: Roughly 70% neutral (white or black), 20% black-or-white counterpart, no more than 10% accent. Chartreuse `B8B800` and cyan `00B7C3` are sparks, not fills.
3. **Geometry**: Sharp corners. Rectangles only — `ROUNDED_RECTANGLE` is banned.
4. **No decorative lines under titles.** Use whitespace or the 80pt chartreuse rule-accent only at section level.
5. **No pie charts.** Horizontal bars instead, always. Y-axis starts at zero on columns.
6. **Chart titles are conclusions, not topics.** "Revenue declined 12% in Q3" — not "Revenue by Quarter."
7. **Every data point has a visible source.** Archivo `text-xs` at bottom-right, muted gray.
8. **One accent color per slide maximum.** Chartreuse OR cyan, not both on the same slide unless they have distinct semantic roles.
9. **Text must fit its container.** No overflow. If it doesn't fit, cut words before you shrink type.
10. **All headlines all caps** unless they are sentence-style conclusion titles on charts and split panels.

## Font fallback

Bebas Neue and Archivo must be installed on the machine opening the `.pptx`. If the target viewer doesn't have them, PowerPoint substitutes. The skill uses the primary names — do not substitute Impact or Helvetica in the code itself. Jonathan has these fonts installed locally; advise client viewers to install Bebas Neue and Archivo (both free from Google Fonts) before opening.

## Visual QA checklist before delivery

After generating, always convert to images and inspect. View each slide. Check for: text overflow, misaligned rules, source citations overlapping content, missing footers, and any of the 15 anti-slop detection signals in `references/anti-slop-checklist.md`.

## Files in this skill

- `SKILL.md` — this file
- `references/layouts.md` — spec for all 15 slide templates (positions, type sizes, content rules)
- `references/design-tokens.md` — full token reference with rationale
- `references/anti-slop-checklist.md` — 15-item pre-delivery quality gate
- `assets/nxt-tokens.js` — importable JS module with every color, font, size, spacing value
- `humans-in-control-research/components/slideTemplates/web.tsx` — the renderer that defines every template shape

---

## #NU brand variant (added 2026-06-06)

The Northeastern (NU) brand uses the same 15-template structure but different tokens. Apply these substitutions globally when the user invokes `#NU` (alone or as a modifier on `#presentation`):

| Token | NXT | NU |
|-------|-----|-----|
| Display font | Bebas Neue | Roboto Condensed |
| Body font | Archivo | Open Sans |
| Quote font | JetBrains Mono | Spectral (editorial italic) |
| Primary accent | Chartreuse `B8B800` | Huskies Red `C8102E` |
| Secondary accent | Cyan `00B7C3` | Near-black `1A1A1A` |
| Negative/error | Rust `CC6644` | Rust `CC6644` (shared) |
| Background | White `FFFFFF` | White `FFFFFF` |
| Primary text | Black `0D0D0D` | Black `000000` |
| Corner radius | 2px | 2px (shared sharp geometry) |

Hard rules 1-10 above apply identically to NU; only the token values change. The geometry, the 70/20/10 color dominance rule, the chart conventions, and the anti-slop checklist transfer wholesale.

---

## #presentation hashtag routing (added 2026-06-06)

The `#presentation` hashtag (alone or with `#NU` / `#NXT` brand modifiers) emits a `PresentationPayload` from `services/narrativeComposer.ts` and ships it to the `presentation-renderer:5014` container (NOT to the inline SPA SlideCanvas). The renderer is a separate scroll-driven React 19 + framer-motion service, forked from the Inner Focus codebase, that produces a polished standalone presentation.

When `#presentation` is invoked:

1. The narrative composer assembles a `PresentationPayload` (see `services/presentationTypes.ts` for the shape) — title, sections, per-section content blocks.
2. The payload is POSTed to `presentation-renderer:5014`.
3. The renderer applies brand tokens (NXT or NU per the modifier) via CSS variables and renders.
4. PPTX export from the renderer goes through `services/presentationToPptx.ts` (NOT the gold pipeline) since the renderer's layout primitives differ from the 1920×1080 #stage shell.

**The 15 templates in §1-§15 of this skill do NOT apply directly to `#presentation`.** They apply to:
- Inline `:::slide template=X` JSON blocks in chat replies
- `#brief #slides #NXT` / `#strategy #slides #NXT` deck composition (which use the slideTemplates/web.tsx renderer + the gold PPTX pipeline)
- `#NXT` brand-locked slide generation outside the chat

For `#presentation`, defer to the presentation-renderer's section components (`Hero`, `KeyMetrics`, `EvidenceQuote`, `Recommendation`, `Closing`). The brand-token swap rules above (NXT vs NU) still apply.

**Current status (2026-06-06):** the presentation-renderer container exists with the brand token CSS variable swap working; section components are scaffolding. Until section components are filled in, `#presentation` outputs may render as styled-but-empty sections. Track in `humans-in-control-research/AGENTS.md` "Presentation render target" section.

---

## Anti-slop discipline specific to NXT/NU slide decks

Beyond the 10 hard rules above:

1. **No reading-instruction kickers** (per 2026-06-06 user report): banned patterns include "HOW TO READ THIS", "One frame per phase", "Each row represents", "The chart below shows". Lead with the conclusion, not with instructions on how to consume it.
2. **No metaphor titles** (per 2026-06-06): banned families include clock/time ("until the clock is running"), journey-as-metaphor ("the road ahead", "long road"), construction ("building blocks", "lay the foundation"), war/sports ("battlefield", "playbook"), anthropomorphism ("prep feels abstract", "the system wants"). Plain descriptive titles only.
3. **No standalone numbers in titles** (Quantitative Claim Rule). A KPI tile may show a number when accompanied by a verbatim quote with attribution. A title with "35%" in it without an inline cited quote = banned.
4. **Action titles, not topic labels.** "Students apply to 100+ co-ops in the first cycle" not "The Application Phase".

These rules are also enforced at runtime by `services/slidePostProcessor.ts` (METAPHOR_PATTERNS + META_NARRATION_PATTERNS, added 2026-06-06) and by the Hook Bus dispatcher (`.Codex/hooks/scripts/dispatch_validators.py`) routing to `validate_titles.py`, `validate_no_em_dashes.py`, `validate_slide_variety.py` for the `#presentation` deliverable per `.Codex/ARCHITECTURE.md`.


## GOLD Figma recreation furniture — defect-hardened (2026-06-09, SkillOpt)
Recreating a deliverable as a Figma page (one per deliverable + a PPTX-twin clone) at the GOLD 1920x1080 spec
(see hic-workspace/wiki/design-system/gold-visual-language.md + gold/*.html twins):
- 3x3 DOT MARK: build deterministically as a VERTICAL auto-layout of 3 HORIZONTAL rows of 3 squares
  (12px, itemSpacing 6, HUG). NEVER use layoutWrap='WRAP' + resize() — it renders as a single horizontal
  row that collides with the takeaway band. Place x=30, y=1080-42-48 on the rail.
- KICKER: layoutSizingHorizontal='HUG' — FILL-width makes its bounding box overlap the top-right wordmark.
- QA LOOP (mandatory): after build, collect leaf TEXT absolute bounding boxes, flag intersecting pairs,
  screenshot, fix to ZERO collisions before claiming done (creative-director pass).
- DESIGN STANDARDS: generous padding between elements; vertically balanced (fill the stage, no dead band
  above the takeaway); >=2 verbatim corpus quotes per deliverable column (evidence density); elegant
  restraint; color-as-meaning (accent=pain, cool=need/source); no eyebrow microlabels; no em-dash.
- SELF-IMPROVEMENT: every fix/enhancement is logged to synthesis/generation-failures.md AND folded back
  into this skill (SkillOpt) so future generations inherit it.


## Logo + stronger-contrast (2026-06-09, SkillOpt — user-corrected)
- LOGO: place the ACTUAL brand logo vector top-right (wiki/brand/logos/nxt-humans-wordmark-*.svg via
  createNodeFromSvg, ~170px wide), NEVER a text-wordmark stand-in. The gold spec's IBM Plex Mono "NXT
  HUMANS" text is a placeholder; we have the real vector, so use it. (User: "why did you make that up?")
- STRONGER CONTRAST (per NXT_HUMANS_Design_System_Style_Guide): the single most important takeaway is a
  SOLID CHARTREUSE block with BLACK text (max one chartreuse block per page), not a dark band. Other
  strong-contrast devices to deploy where the layout calls for them: .section-dark full-bleed bands
  (chartreuse num, white h2, oversized cropping display), and color-block grids (black/chartreuse/teal-deep/
  panel cells, text inverts on dark). Ground contrast choices in the style guide; do not invent.


## h1 wrap + logo padding (2026-06-09, SkillOpt — user-corrected)
- H1 ACTION TITLE: constrain width (~1180px of the 1660 canvas, layoutSizingHorizontal=FIXED) so it WRAPS
  to two lines and clears the top-right logo zone. Never let the full-width h1 run into the logo on one line.
- LOGO PADDING: inset the logo from the canvas edge (right edge ~40px in from 1832, i.e. x~1636 at 156px
  wide, y~58) with clear breathing room; do not jam it into the corner or against the headline.


## Writing discipline + page structure (2026-06-09, SkillOpt — user-mandated)
- ANTI-SLOP BEFORE GENERATING: ALWAYS run the anti-slop scan (.Codex/hooks/scripts/validate_ai_slop.py +
  precheck_slop.py + the 350+ banned list in .Codex/AGENTS.md) on EVERY copy field BEFORE building a Figma
  exemplar, not after. Writing must be human-readable and clear; fix awkward grammar (e.g. "rank items to a
  category" -> "rank each item against the customer's segment"). Writing is load-bearing. INDUSTRY-AGNOSTIC:
  copy and examples must read for ANY vertical the user is researching (retail, finance, healthcare, travel,
  government, media, fashion, etc.); never assume a domain. Use representative copy per the Representative-
  Content Firewall; real artifacts pull domain content from the live corpus/manifest.
- NO REDUNDANT META LABELS: remove eyebrow/gid chrome that color/position/an adjacent numeral already conveys
  (e.g. a "GAP-01" gid sitting above the "01" numeral; a "GAP-01 · US-1" tag on each rec card). Per the GOLD
  anti-slop microlabel rule. KEEP only load-bearing labels (SOURCE:, severity HIGH/CRITICAL, prevalence
  DOMINANT/RECURRING, Gartner scale, lens category, FEEDS gap-trace lines).
- PAGE STRUCTURE: each deliverable gets its OWN Figma page, in BOTH the NXT file (iSQhAVM7SI4QHAWB7y9C2z) AND
  the Northeastern file (z2v9Pvhg23hlljEitPBdAt). Name "GOLD · <deliverable> (nxt|nu)". NU uses the *-nu gold
  twins + NU tokens (ink-navy rail, Huskies red accent, gold; h1 per NU type).


## Methodology / self-referential ban (2026-06-09, SkillOpt — now HOOK-ENFORCED)
NEVER expose the research apparatus on a finished artifact. BANNED as kicker/heading/label/note chrome:
"WHAT THE CORPUS SAYS", "EVIDENCE" (as a methodology label), "SIX-LENS SCAN", a "LENSES" framework strip,
"student/customer/user-voice scan", "the evidence is thickest", the words "corpus" / "methodology". Kickers
and headings carry a topic or an insight, never the method. Named "SOURCE: <name>" citations ARE allowed.
MANDATORY before building ANY Figma exemplar: run .Codex/hooks/scripts/validate_self_referential_freeform.py
AND validate_ai_slop.py on every copy field; build only on exit 0. The self-ref hook was extended 2026-06-09
with _METHODOLOGY_PATTERNS (tested: blocks the corpus/six-lens kicker at exit 2, passes clean at exit 0).


## Layout variation + journey phases (2026-06-09, SkillOpt)
- VARIATION: each deliverable replicates ITS gold twin's distinct layout - do NOT default everything to a
  4-column grid. journey = phase ruler + GOAL/WHERE-IT-BREAKS bordered blocks; service-blueprint = swimlane
  grid (lanes x stages); competitive = maturity-dot matrix; strategy = Rumelt kernel (stacked diagnosis/
  guiding-policy/coherent-actions); block-quote = single hero quote; case-study = challenge/approach/outcome
  blocks; roadmap = NOW/NEXT/LATER horizons; persona = roster + detail. Read each gold *-nxt.html and mirror
  its structure.
- JOURNEY: stage ruler + labels use PHASE NAMES (e.g. Notice / Search / Contact / Wait / Resolve), NEVER time
  durations ("0 MIN", "DAY 1-3"). A journey maps phases, not a stopwatch.


## MANDATORY pre-build protocol per deliverable (2026-06-09, SkillOpt — user-demanded, do EVERY time)
Before building ANY deliverable exemplar in Figma, run all three, in order, and only build on pass:
1. READ THE GOLD TWIN: hic-workspace/wiki/design-system/gold/<deliverable>-{nxt|nu}.html — mirror ITS distinct
   layout (never default to 4 columns).
2. READ THE EXPERT SKILL for that deliverable (it defines the model/structure/required fields):
   gap -> gap-analysis-evaluator | recommendations -> recommendation-architect | themes -> theme-analyst |
   journey -> diagrams/journey-illustrator | service-blueprint -> service-blueprint-mapper |
   competitive -> competitive-analyst | personas -> persona-architect | strategy -> strategy-author |
   roadmap -> roadmap-builder | prd -> prd-compiler | tech-arch -> tech-arch-generator |
   tech-audit -> tech-audit-inspector | report -> strategic-report-writer | meta-themes -> meta-themes |
   mindmap -> mind-map-architect | org -> org-chart.
3. ANTI-SLOP GATE: run .Codex/hooks/scripts/validate_self_referential_freeform.py AND validate_ai_slop.py
   on every copy field; build only on exit 0.
Then build, screenshot, run the collision audit, fix to zero, log any defect to failure-log + SkillOpt + memory.
