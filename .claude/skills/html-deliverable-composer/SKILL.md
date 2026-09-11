---
name: html-deliverable-composer
invocation: runtime
disable-model-invocation: true
version: 1.0
description: Generate NXT/NU brand-locked, self-contained HTML artifacts (briefs, explainers, reports, playgrounds, approach-pickers) as the canonical output format for human-review deliverables. Replaces Markdown for any output a human reads and shares. Encodes the NXT design system as CSS variables, the 8 information types (tables, design, illustrations, code, interactions, workflows, spatial, images), 5-7 SVG diagram recipes, the print stylesheet, and the evidence contract the claim ledger gate enforces (chrome is runtime-owned). MUST compose with verbalized-sampling — load that skill first and apply the five-layer VS pattern (visual layout, IA, diagram type, interaction pattern, iconography) as a <vs_thinking> preamble before emitting HTML. Triggered by #brief, #explainer, #report, #playground, #approaches, and #artifacts.
thinking: max
---

# HTML Deliverable Composer

## Composition contract — load verbalized-sampling first

This skill is composed with `verbalized-sampling/SKILL.md`. The chat handler that calls you fetches BOTH skills at runtime and concatenates:

```
verbalized-sampling SKILL.md
+ html-deliverable-composer SKILL.md (this file)
+ topic-specific instructions
```

You MUST apply the verbalized-sampling discipline at the FIVE generation layers below before writing any HTML. Write a `<vs_thinking>` preamble that enumerates k=5 candidates with probabilities at the layer that matters most for the directive, commits to one, then emits the HTML grounded in that commitment. Without this, the output regresses to the generic SaaS-template aesthetic that mode-collapsed LLMs default to (rounded centered cards, slider-only interactions, rectangles-with-arrows diagrams).

## The five layers VS instruments

| Layer | Default mode-collapse | VS recipe (k=5) |
|---|---|---|
| **Visual layout** | Logo top / title centered / body below | centered-card (p≈0.40), editorial-asymmetric (p≈0.18), split-screen quote-led (p≈0.12), dashboard data-led (p≈0.10), marginalia+body (p≈0.05) |
| **Information architecture** | Heading + paragraph + bullets | heading-led, flow-diagram-led, code-annotation-led, Q&A, worked-example, decision-tree |
| **Diagram type (per SVG)** | Rectangles with arrows | flowchart, sequence diagram, swimlane, matrix, Sankey, state machine, radial, timeline — pick the type that fits the data's actual shape |
| **Interaction pattern** | Sliders, always | sliders, before/after swap, drag-to-position, easing-curve picker, code-with-live-preview, motion timeline, scrubber |
| **Iconography vocabulary** | Default lucide every time | geometric, hand-drawn, monogram, data-glyph, typographic |

Which layer dominates depends on the directive:

| Directive | Primary VS layer |
|---|---|
| `#brief <topic>` | Visual layout (stakeholder briefings live or die on layout) |
| `#explainer <topic>` | Information architecture (the IA IS the explanation) |
| `#report <topic>` | Information architecture (section structure) + diagram type (per embedded diagram) |
| `#playground <feature>` | Interaction pattern (this is the unlock — escape sliders-by-default) |
| `#approaches <decision>` | Native VS-Multi — content generation IS the directive |
| Any embedded SVG | Diagram type (micro-VS per `<svg>` block) |

## NXT brand-lock (mandatory — non-negotiable)

Every HTML artifact MUST use the NXT design system unless the user explicitly invokes `#NU` in the directive. The artifact `/view` endpoint will inject these CSS variables at runtime, but you SHOULD reference them by name in your generated CSS:

```css
:root {
  /* Foundation */
  --nxt-bg: #FFFFFF;
  --nxt-surface: #FAFAFA;
  --nxt-panel: #F5F5F0;
  --nxt-text-primary: #0D0D0D;
  --nxt-text-secondary: #525252;
  --nxt-text-tertiary: #ACACAC;
  --nxt-border: #E5E5E5;
  /* Brand accents */
  --nxt-lime: #B8B800;        /* PRIMARY ACCENT — chartreuse */
  --nxt-teal: #115054;        /* headers, primary actions */
  --nxt-cyan: #00B7C3;        /* data panels, secondary accent */
  --nxt-rust: #CC6644;        /* negative / problem states */
  /* Semantic */
  --nxt-success: #0CCE6B;
  --nxt-warning: #FD8E2E;
  --nxt-friction: #CC6644;
  --nxt-error: #FF5A5A;
  /* Type */
  --nxt-font-display: 'Saira Condensed', sans-serif;
  --nxt-font-body: 'Archivo', sans-serif;
  --nxt-font-mono: 'IBM Plex Mono', monospace;
  /* Layout */
  --nxt-radius: 2px;          /* sharp corners — NEVER 8px+ */
  --nxt-radius-card: 2px;
  --nxt-radius-button: 0px;   /* rectangular buttons */
}
```

For `#NU` artifacts, swap the accent system to:

```css
:root {
  --nxt-bg: #FFFFFF;
  --nxt-surface: #F7F7F7;
  --nxt-text-primary: #000000;
  --nxt-text-secondary: #414141;
  --nu-red: #C8102E;          /* PANTONE 200 C — official NU red. NEVER #C00000. */
  --nu-red-deep: #9E0A24;
  --nu-red-tint: #FBE7EA;
  --nxt-font-display: 'Lato', sans-serif;
  --nxt-font-body: 'Lato', sans-serif;
}
```

## The 8 information types you may use (from the source article)

| Type | When to use |
|---|---|
| **Tables** | Structured comparison data — concept matrices, feature comparisons, decision tables |
| **Design** | Color palettes, type specimens, token tables — for design system artifacts |
| **Illustrations (SVG)** | Conceptual diagrams, system maps, before/after, workflow visualizations |
| **Code** | Annotated snippets in `<pre><code>` with inline comments, syntax-coloring via CSS |
| **Interactions** | `<button>`, `<input type="range">`, `<details>` toggles, tabbed navigation, drag-and-drop |
| **Workflows** | Multi-step flows, sequence diagrams, state machines — SVG + HTML labels |
| **Spatial** | Canvases, absolute positioning, layered annotations on images |
| **Images** | Embedded `<img>` tags (only when an image URL is provided in the input) |

You are NOT restricted to one — a strong artifact uses 2-4 of these in concert (e.g. an SVG diagram + an annotated code snippet + a comparison table).

## SVG diagram recipes (apply micro-VS to pick the right one)

Before drawing any SVG, write a one-line comment naming the diagram type you picked from this menu and why it fits the data:

| Recipe | Use when |
|---|---|
| **Flowchart** (boxes + arrows) | Sequential process, ≤7 nodes. Default if topic has clear linear flow. |
| **Sequence diagram** | Actor-to-actor exchanges over time. Client/server, API calls, multi-party protocols. |
| **Swimlane** | Multi-actor flow where lane membership matters. Service blueprints, cross-team workflows. |
| **Matrix / 2×2** | Bivariate comparison (impact × effort, urgency × importance, etc.). |
| **Sankey** | Flow with proportional volume between nodes. Funnel conversions, energy flows, traffic routing. |
| **State machine** | Topic has discrete states + transitions (auth flows, order lifecycle, rate-limit bucket). |
| **Radial / chord** | Cyclical relationships, many-to-many connections. |
| **Timeline / Gantt** | Temporal sequencing with duration. Roadmaps, project timelines. |
| **Map / spatial** | Geographic or canvas-positional data. |

When in doubt: do NOT default to flowchart. Mode-collapsed LLMs draw flowcharts for everything. Look at the data and pick.

## The `<vs_thinking>` preamble (mandatory)

Every artifact opens with this hidden block (rendered as a collapsed `<details>` at the bottom of the artifact so the user can audit):

```
<vs_thinking>
Layer: [Visual Layout | Information Architecture | Diagram Type | Interaction Pattern]
  Candidates:
    1. [name] — p ≈ [probability] — [one-line characterization]
    2. ...
    5. ...
  COMMIT: [chosen number] — [name] — [one-sentence rationale tied to topic]

[Optional: additional layer if relevant — e.g. Diagram Type for a specific embedded SVG]
</vs_thinking>
```

For directives where multiple layers matter (`#explainer` combines IA + diagram type), enumerate both layers in the same `<vs_thinking>` block.

## The `--variants k` modifier (Thariq's "show me k" pattern)

When the directive carries `--variants k` (where 2 ≤ k ≤ 6), emit a grid of k distinct variants of the SAME deliverable side-by-side in a single HTML page. Each variant card carries:

1. A miniaturized rendering of the variant's full content
2. A visible **probability pill** in the corner (e.g. "p = 0.18")
3. A one-line **"tradeoff this variant makes"** caption (e.g. "Editorial — sacrifices density for narrative flow")
4. A **"Pick this"** button that POSTs to `/api/artifacts/{slug}/promote-variant` and promotes the variant to the canonical artifact

Canonical probability distribution for `--variants 6` (2×3 grid):
- 1 variant near the mode (p ≈ 0.30-0.45) — what an expert default would produce
- 2 shifted-frame variants (p ≈ 0.10-0.20)
- 3 tail variants (p < 0.05) — surprising-but-grounded

Layout: 2×3 CSS grid, equal-height cards, "Pick this" CTA at the bottom of each card.

## Chrome is the runtime's, never the model's (2026-09-11, HARD)

The artifact `/view` endpoint and the HTML artifact chain own every piece of interface chrome: the
brand wrapper, fonts, the print stylesheet, export controls, refine helpers, and the artifact metadata
record. The model emits the DOCUMENT and nothing else. Never emit:

- a `<footer>` with buttons, a "Copy as prompt", "Save as PDF", "Open in chat" or download button,
- a "Generation audit", verbalized-sampling commentary, committed-frame notes, or probability text
  anywhere in the visible document (the `<vs_thinking>` preamble is the only place, and it is removed),
- a `__HIC_ARTIFACT_META__` script or any JSON metadata block,
- run ids, versions, timestamps of generation, model names, or pipeline labels.

The 2026-09-10 white paper shipped all four because an earlier version of this skill required them;
the chain now strips them, and any that survive count as a CHROME_LEAK finding in the claim ledger.

## Evidence contract (2026-09-11, checked by services/claimLedgerGate.ts after generation)

Every sentence a reader could take as a fact is checked deterministically against the chunk it cites.
Write to the contract so the check passes on the first draft:

- CLAIM TYPES: SUPPORTED FACT, DERIVATION and DEFENSIBLE INFERENCE may be declarative. A HYPOTHESIS is
  framed as a bet. An UNKNOWN is omitted and the section narrows; never annotate a gap.
- TEMPORAL: date a capability, launch, beta or announcement by the PUBLISHED date on the cited chunk's
  provenance line, or a date in its text. The objective's as-of window is the review date, never a
  source date. Undated live documentation describes current documented behavior; dated posts establish
  chronology. Disagreeing sources are both kept, with their dates. Reason code: DATE_SCOPE_MISMATCH.
- MODALITY: "can", "helps", "lets", "working toward" never become "ensures", "requires", "guarantees",
  "proves", "makes correct", "cannot", "never", "always". Reason code: UNSUPPORTED_MODALITY.
- INDEPENDENCE: "every", "all", "consensus", "converges", "dominant" need three independent origins
  (different authors or organizations, different URLs). Two pointers to one thread are one origin.
  Reason code: INDEPENDENCE_INFLATED.
- IDENTIFIERS: tool names, API names, commands, acronym expansions and product names must appear in a
  cited chunk exactly. Hedged or social-only text ("or something", "I think") is reported as a
  practitioner recollection in quotation marks, never as a documented capability. Reason code:
  UNVERIFIED_IDENTIFIER.
- SCOPE: a chunk about another product or organization is a NAMED analogy or nothing. Reason code:
  PRODUCT_SCOPE_MISMATCH.
- DERIVED SUMMARIES: the theme outline is not a source. Never write "via theme"; never put anything but
  pointers inside a citation bracket. Reason code: DERIVED_AS_SOURCE.
- Quoted spans are verbatim in the cited chunk (UNVERIFIED_QUOTE); factual sentences carry a pointer
  (UNSOURCED_FACT).

The chain renders each pointer as a linked, dated citation and appends a dated Sources section. You
write pointers; you never write source labels, URLs or dates the provenance line does not carry.

## Anti-mode-collapse instant-rejection patterns

If your HTML output contains ANY of these, you have failed the discipline — start over:

- `border-radius: 8px` (or higher) on cards or buttons. NXT uses 2px max. Pill buttons forbidden.
- A header with a centered logo + centered title + centered body. That is the modal SaaS template. Use editorial asymmetry.
- Three horizontal `<input type="range">` sliders in a `#playground`. That is the cliché. Pick a real interaction pattern from the menu.
- A flowchart with 3-7 rounded rectangles connected by arrows when the data is actually a state machine, a sequence, or a matrix.
- Lorem ipsum or generic placeholder text. Every word must be grounded in the topic.
- A color other than the NXT palette (or NU when invoked). No purple gradients. No Tailwind defaults.
- An icon that is the most-typical lucide icon for the topic (magnifying glass for search, gear for settings, etc.) when a more specific glyph would serve.
- A section heading that is a category label ("Overview", "Features", "Conclusion") rather than a finding ("Northeastern first-years apply to 1,870 jobs over 18 months on average").

## Directive-specific guidance

### `#brief <topic> [--variants k]`

A one-pager intended for a stakeholder to read in 90 seconds and forward to their boss.

Must include:
- A finding-grade title (full sentence with data — not "Co-op Strategy Brief")
- One hero data point or quote visually dominant
- 2-3 key supporting findings as short prose paragraphs OR small data cards
- One diagram (preceded by micro-VS on diagram type) OR one comparison table
- Stakeholder names and engagement context surfaced

Length: ~600-1200 words of visible content. Optimized for one screen + scroll.

### `#explainer <topic> [--variants k]`

A deep-dive page intended for a learner to read once and understand a concept end-to-end. Modeled on the article's "How rate limiting works" example.

Must include:
- A finding-grade title
- A flow diagram or system map at the top (mandatory — apply micro-VS to pick the diagram type)
- 2-4 annotated code/data snippets beside or below the prose
- A "Gotchas" section at the bottom with severity-coded callouts (the article's pattern)

Length: ~1500-3500 words of visible content. Optimized for sequential read.

### `#report <topic> [--variants k]`

Long-form strategic report. Replaces a slide deck for prose-dominant content.

Must include:
- Tabbed or anchored sections (Executive Summary, Findings, Recommendations, Next Steps — OR a VS-derived alternative IA)
- Embedded charts/diagrams per section
- Evidence panels with verbatim corpus quotes
- A summary table at the top showing all sections + status

Length: ~3000-8000 words. Optimized for navigation, not sequential read.

### `#playground <feature>`

Interactive tuning surface. Apply VS HARD on interaction pattern selection — escape sliders-by-default.

Must include:
- The interactive controls (picked from VS enumeration — typically not all sliders)
- A live preview area that responds to control changes
- A "Copy as prompt" button that serializes the user's current settings as a prompt string ready to paste back into HiC
- Reset button

Length: depends on feature complexity. Self-contained — fully functional in one HTML file.

### `#approaches <decision> [--variants k]`

Native VS-Multi. Default k=6 (3 conventional + 3 tail). If user provides `--variants k`, use that.

Must include:
- Title naming the decision
- 2×3 (or k-shaped) grid of approach cards
- Per card: name, 2-3 pros, 2-3 cons, when-to-pick-this guidance, probability annotation
- "Pick this" button per card that promotes the variant

This directive IS VS-Multi rendered inline as a picker UI.

### `#artifacts` (bare)

Library list of all saved HTML artifacts. Bare hashtag — no topic. Mirror of `#prototypes` / `#presentations`.

Renders in chat (not as a standalone HTML artifact) as a grid of cards. Each card: title, generator, date, "Show other variants" chip if the artifact has a `.variants_history/` folder. Launch / Edit / Delete chips.

## Output format

Emit ONLY the HTML body content: the artifact's `<main>` document. Do NOT wrap in `<html>` / `<head>` / `<body>`; the runtime injects the wrapper, brand CSS, print stylesheet and every control. Start with your `<vs_thinking>` block (removed before render), then the document, and nothing after the document: no footer, no buttons, no audit block, no metadata script.

If your output begins with ` ```html ` markdown fence, the chat handler will strip it. Better: emit raw HTML.

## Quality checklist (run before emission)

1. [ ] `<vs_thinking>` block written with at least one layer enumerated and committed
2. [ ] At least one of the 8 information types used beyond plain prose
3. [ ] NXT (or NU) brand tokens referenced as CSS variables, not hardcoded
4. [ ] No `border-radius` value above 4px
5. [ ] At least one diagram OR table OR interaction in the artifact
6. [ ] No footer, button, audit block, or metadata script anywhere in the output (the runtime owns chrome)
7. [ ] Print stylesheet not blocked (no `display: none` on `body` or `main`)
8. [ ] All section headings are finding-grade (sentences with data), not category labels
9. [ ] No lorem ipsum, no placeholder text — every word grounded in topic
10. [ ] Every factual sentence carries a corpus pointer; every date matches the cited provenance line; hedged or social-only identifiers are quoted as recollection

Only after all checks pass do you emit.

## Visual Output (GOLD design language)

Render to the canonical GOLD visual language. Full spec: `hic-workspace/wiki/design-system/gold-visual-language.md`.
Your reference twin(s): `brief-nu.html` / `brief-nxt.html`, `explainer-nu.html` / `explainer-nxt.html`, `approaches-nu.html` / `approaches-nxt.html` in `hic-workspace/wiki/design-system/gold/`.

Layout: Brief: hero finding (accent left-border) + 3 supporting findings + copy-as-prompt footer. Explainer: horizontal flow steps (cool top-borders) + the gotcha (accent left-border). Approaches: CONSENSUS row + BETS row of pick-when cards.

Invariants (from the spec): 1920x1080 stage, brand rail + 3x3 dot mark, IBM Plex Mono kicker,
serif(NU)/Archivo(NXT) action-title h1, dark takeaway band with exactly one accent-bold phrase.
Color is meaning (accent = pain/critical/diagnosis; cool = need/target/fix/source; neutral = structure).
NO eyebrow microlabels that color/position already convey (WHAT FRUSTRATES THEM, WHAT THEY NEED,
DESIGN RESPONSE, PROOF IT WORKED, PEAKS). NO em-dash. Content is data-dependent; the language is fixed.
