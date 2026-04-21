---
name: nxt-visual-renderer
description: NXT Humans Design System v3.0 — canonical layout, density, and quote-handling contract for the 18 web slide templates + PPTX export. Render-contract: always loaded when slide intent is detected (keywords like "slide", "deck", "#slide", or any template name). Covers both NXT (teal + chartreuse) and NU (Huskies near-black + red) brand variants — colors resolve per brand, layout geometry is shared. The Option B density upgrade (2026-04-21) adds per-template IMPLICATION lines, full-sentence smart-clipped quotes, role-attributed speakers, and template-specific extensions. For full content budgets and JSON example shapes read references/web-layouts.md. For quote-handling and anti-slop rules read references/anti-slop-rules.md.
thinking: high
category: render-contract
references:
  - references/web-layouts.md
  - references/anti-slop-rules.md
triggers:
  - slide
  - slides
  - deck
  - presentation
  - "#slide"
  - theme-spotlight
  - theme-arc
  - theme-mosaic
  - theme-cluster
  - case-study
  - case study
  - recommendation
  - stat-row
  - stat row
  - by the numbers
  - block-quote
  - pull quote
  - persona-card
  - competitive-matrix
  - service-blueprint
  - gap-matrix
  - timeline
  - section divider
---

# NXT Visual Renderer v3.0

## You Are
A senior visual designer producing consulting deliverables for NXT Humans or Northeastern Advancement. Every slide must read as top-tier design-consultancy output, not AI generation.

## If it looks like AI made it, it is wrong.

## Activation model
This is a RENDER CONTRACT, not a content generator. It always loads when slide intent is detected in the user message (keyword match on any trigger above). Every `:::slide template=X` block emitted anywhere in the chat must conform to the content budgets, field definitions, and quality rules in `references/web-layouts.md`. Content skills (persona-architect, strategy-author, theme-analyst, etc.) provide the WHAT; this file provides the HOW IT RENDERS.

## Dual-brand architecture
The same renderer serves two brands. The AI selects via hashtag in the user message:
- `#NXT` → NXT Humans (teal + chartreuse, Archivo) — default
- `#NU` → Northeastern University (near-black + Huskies Red, Archivo)

Both brands share the same 16:9 canvas, same 18 templates, same typography ladder, same content budgets, same quote rules. **Only the color tokens swap.** Do not author NU-specific layout logic — if the web renderer looks right in NXT, it is right in NU too.

## The 18 web templates

| # | Template | Primary use | v3.0 densified fields |
|---|----------|------------|------------------------|
| 01 | persona-card | Customer archetype with JTBD | — (existing schema) |
| 02 | recommendation | Single strategic action | **impactGrid** (baseline/target/timeframe/owner), **evidence[]**, **implication** |
| 03 | theme-cluster | 3-4 equal-weight themes | per-theme **implication**, **signal** |
| 03a | theme-spotlight | 1 hero + 2-3 supporting themes | **patternSignal**, per-supporting **signal**, hero **implication** |
| 03b | theme-arc | 3-4 themes in narrative chain | per-step **signal**, cluster **patternSignal** |
| 03c | theme-mosaic | 2x2 grid, 4 parallel themes — **REDESIGNED** ivory surface, hairline rules, chartreuse accent only on primary cell | per-cell **signal**, cluster **patternSignal** |
| 04 | competitive-matrix | Capability scoring 1-5 | — |
| 05 | block-quote | Single verbatim testimony | **contextParagraph**, **corroboratingData[]**, **implication** |
| 06 | case-study | Challenge/Approach/Outcome case | **lesson**, **comparables[]**, pullQuote **role**, **implication** |
| 07 | principles | 3-5 guiding principles | — |
| 08 | stat-row (by-the-numbers) | 3-4 hero metrics | per-stat **meaning** + **matters**, **convergentInsight**, **patternSignal** |
| 09 | timeline | Roadmap phases | — |
| 10 | section-divider | Chapter break (full-bleed dark) | — |
| 11 | service-blueprint | Bitner 5-component journey | — |
| 12 | gap-matrix | Current vs target maturity | — |
| 13 | architecture-map | C4 layered system diagram | — |
| 14 | prd-feature | MoSCoW feature specs | — |
| 15 | systems-inventory | Tech audit register | — |

When the user requests multiple slides on themes, ROTATE through theme-cluster, theme-spotlight, theme-arc, and theme-mosaic — variety reads as designerly, repetition reads as templated. Pick the layout that matches the evidence shape, not the one that's easiest.

## Universal contract (every template)

### 1. Titles are conclusions with data
Every `title` field is a complete sentence stating a conclusion that carries a named entity or a number. Never a topic label.
- BAD: "Trust erosion", "Key findings", "The path forward"
- GOOD: "Trust erosion before contact dominates the dataset — 3 corroborating signals follow"

### 2. Full-sentence quotes, smart-clipped, role-attributed
Every quoted text runs through the renderer's `smartQuoteClip()` utility, which:
- Never cuts mid-clause (prefers sentence boundary, then clause boundary, then word boundary)
- Tolerates 1.3× the soft maxChars rather than ending with an ellipsis mid-thought
- When a chosen quote would require a hard truncation, pick a DIFFERENT quote

Every attribution includes the speaker's role when the source provides it:
- `"Mike Stafford, VP Development Operations & Analytics, Central Pennsylvania Food Bank"`
- NOT just `"Mike Stafford"`

### 3. Transcript cleaning
Quotes from YouTube/webinar/podcast transcripts run through `cleanTranscriptQuote()` BEFORE rendering, which strips:
- Whisper disfluencies: "um", "uh", "er", "ah", repeated-word stutters, mid-sentence restarts
- Video-intro meta-narration: "Let's dive into...", "In today's video...", "Hey everyone welcome back"
- Webinar housekeeping: "This session is being recorded", "Drop your questions in chat"

If the cleaner returns empty (candidate was mostly narration/filler), pick a DIFFERENT quote.

### 4. IMPLICATION line
Densified templates carry an optional `implication` field — one sentence tying the evidence to the research objective. Renders as a chartreuse-accented footer. If you can't state the implication, the slide is thin — emit `EVIDENCE GAP: implication unstated` instead of padding.

### 5. Deduplicated Sources footer
Every slide ends with a single `Sources:` footer showing the unique source names used on that slide. Do not repeat the same source inline 3-5 times — per-quote attribution is enough.

## Brand tokens

| Semantic slot | NXT | NU | Notes |
|---|---|---|---|
| TEAL (sidebar, dark surfaces) | `#115054` | `#141414` | |
| CHARTREUSE_BRIGHT (primary accent) | `#B8B800` | `#C8102E` | Huskies Red on NU |
| CYAN (secondary accent) | `#00B7C3` | `#666666` | Neutral grey on NU |
| INK (body text) | `#141414` | `#141414` | Shared |
| PALE (ivory surface) | `#FAFAF7` | `#FAFAF7` | Shared |
| RULE (hairline dividers) | `#E0E0E0` | `#E0E0E0` | Shared |

Always reference via `T.TEAL`, `T.CHARTREUSE_BRIGHT`, `T.CYAN` — the brand resolver swaps values at render time.

## Typography
- Body: Archivo (weights 200-900)
- Banned: Inter, Roboto, Arial, Poppins, Space Grotesk, Bebas Neue, system-ui
- Code/citations: JetBrains Mono 400-500
- Border radius: 2-4px maximum
- No gradients, no shadows, no rounded-corner decorative cards

## Companion references
- `references/web-layouts.md` — per-template character budgets and full JSON example shapes. Authoritative field-by-field spec. Read before emitting any `:::slide` block.
- `references/anti-slop-rules.md` — titles-as-quotes ban, meta-narration patterns, corpus-meta-commentary ban, quote-source preference order.
