---
id: brand/anti-slop.md
title: "Anti-Slop Visual Rules"
type: brand
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md, NXT_HUMANS_Design_System_Style_Guide.html]
confidence: high
status: active
tags: [brand, anti-slop, quality, banned-patterns, ai-detection]
evidence_count: 0
chunks:
  - id: "brand/anti-slop.md#c0"
    char_span: [0, 522]
    sentence_count: 4
    key_terms: [output, humans, deliverables, nxt, because, indistinguishable, rule, non-negotiable]
    token_count: 104
  - id: "brand/anti-slop.md#c1"
    char_span: [577, 2426]
    sentence_count: 17
    key_terms: [backgrounds, text, chartreuse, white, element, body, rule, content]
    section: 9 Non-Negotiable Visual Rules (White Background)
    token_count: 477
  - id: "brand/anti-slop.md#c2"
    char_span: [2428, 4607]
    sentence_count: 9
    key_terms: [default, aesthetic, ai-generated, font, primary, signals, banned, chartreuse]
    section: 9 Non-Negotiable Visual Rules (White Background)
    token_count: 501
  - id: "brand/anti-slop.md#c3"
    char_span: [4609, 5975]
    sentence_count: 11
    key_terms: [illustrations, grid, layout, cards, pattern, rounded, card, use]
    section: 9 Non-Negotiable Visual Rules (White Background)
    token_count: 318
  - id: "brand/anti-slop.md#c4"
    char_span: [6018, 7881]
    sentence_count: 22
    key_terms: [charts, chart, rule, source, color, citations, bar, banned]
    section: 6 Data Visualization Anti-Slop Rules
    token_count: 413
  - id: "brand/anti-slop.md#c5"
    char_span: [7903, 10057]
    sentence_count: 22
    key_terms: [specific, banned, integration, filler, describe, insights, specify, change]
    section: Banned Language
    token_count: 513
  - id: "brand/anti-slop.md#c6"
    char_span: [10059, 10665]
    sentence_count: 1
    key_terms: [becomes, improvement, framework, minutes, significantly, game-changer, satisfaction, additional]
    section: Banned Language
    token_count: 147
  - id: "brand/anti-slop.md#c7"
    char_span: [10726, 10978]
    sentence_count: 4
    key_terms: [output, item, ai-generated, deliverable, checklist, corrected, delivery, section]
    section: 15-Point Anti-Slop Detection Checklist (Authoritative)
    token_count: 55
  - id: "brand/anti-slop.md#c8"
    char_span: [10980, 13138]
    sentence_count: 12
    key_terms: [remove, chart, title, gradient, circles, present, replace, color]
    section: 15-Point Anti-Slop Detection Checklist (Authoritative)
    token_count: 512
  - id: "brand/anti-slop.md#c9"
    char_span: [12858, 14381]
    sentence_count: 10
    key_terms: [text, body, size, source, chart, scale, information, conclusion]
    section: 15-Point Anti-Slop Detection Checklist (Authoritative)
    token_count: 362
  - id: "brand/anti-slop.md#c10"
    char_span: [14383, 14758]
    sentence_count: 6
    key_terms: [output, signal, sequentially, underneath, checklist, introduce, detected, generate]
    section: 15-Point Anti-Slop Detection Checklist (Authoritative)
    token_count: 83
  - id: "brand/anti-slop.md#c11"
    char_span: [14814, 16797]
    sentence_count: 12
    key_terms: [does, slop, contain, conclusion, detection, recommendations, section, recommendation]
    section: "Additional Slop Detection: Language and Structure"
    token_count: 427
---
# Anti-Slop Visual Rules

"Slop" is AI-generated output that is technically correct but generically styled, vaguely worded, and indistinguishable from the output of any other AI system. NXT Humans deliverables must be identifiable as NXT Humans deliverables on sight — not because of a logo, but because of a design language that is specific, constrained, and deliberately different from AI defaults.

This page defines every rule that separates NXT Humans output from generic AI output. Every rule is non-negotiable.

---

## 9 Non-Negotiable Visual Rules (White Background)

### Rule 1: Stark White Foundation

The primary surface is pure white. Not off-white. Not light gray. Not cream. White.

| Surface | Color | Usage |
|---|---|---|
| Primary background | `#FFFFFF` (`--nxt-white`) | Default page/slide background |
| Alternating sections | `#FAFAFA` (`--nxt-off-white`) | Alternating content blocks, even table rows |
| Panel/card backgrounds | `#F5F5F0` (`--nxt-paper`) | Sidebar panels, header rows, info blocks |

No colored backgrounds. No gradient backgrounds. No patterned backgrounds. No image backgrounds behind content. The content sits on white.

### Rule 2: Maximum Contrast for Text

Headlines are near-black on white. Body text is dark gray on white. No medium-gray body text. No low-contrast "elegant" light text on light backgrounds.

| Element | Color | Hex |
|---|---|---|
| Headlines | `--nxt-heading` | #0D0D0D |
| Body text | `--nxt-body` | #333333 |
| Secondary text | `--nxt-secondary` | #666666 |
| Muted/tertiary text | `--nxt-muted` | #999999 |

**#999999 is the lightest permissible text color.** Nothing lighter. If text is too unimportant to be #999999 or darker, it should not exist.

### Rule 3: Chartreuse Power Accent

Chartreuse (#B8B800) is used for 15% or less of any visual surface. It is a power accent. It highlights the single most important element: the recommendation, the key stat, the action item.

- Applied to: Recommendation callout backgrounds, stat callout numbers, chart highlight bars, CTA buttons
- NOT applied to: Backgrounds of large areas, body text, borders on every element, decorative fills
- When chartreuse is on screen, the eye goes there first. If chartreuse is everywhere, it goes nowhere.

### Rule 4: Cyan Secondary Accent

Cyan (#00B7C3) is subordinate to chartreuse. It never competes with chartreuse on the same element or in the same visual grouping.

- Applied to: Evidence block tint backgrounds, secondary chart highlights, link text, info badges
- NOT applied to: Same element as chartreuse, headline color, primary CTA
- If chartreuse says "act on this," cyan says "here is the evidence."

### Rule 5: No Default Fonts

The following fonts are banned in all NXT Humans output:

| Banned Font | Why |
|---|---|
| Inter | Most common AI-generated UI font. Signals "default AI output" instantly. |
| Roboto | Google's default. Signals Material Design template, not custom design. |
| Arial | Windows default since 1992. Signals "did not choose a font." |
| system-ui | Literally the system default. Signals "did not specify a font." |
| Helvetica (as primary) | Permissible as a fallback in the body font stack, but never as the primary choice. |
| Open Sans | Second most common AI-generated font. |
| Lato | Third most common AI-generated font. |
| Poppins | Overused in AI-generated SaaS mockups. |
| Montserrat | Overused in AI-generated marketing materials. |

Required fonts: Bebas Neue (headlines), Archivo (body), JetBrains Mono (code). See [[brand/identity]] for the complete font stacks.

### Rule 6: No Generic AI Color Palettes

These color combinations are banned because they are the default output of generative AI tools:

| Banned Palette | Detection Signal |
|---|---|
| Purple primary + white background | Default Anthropic/AI aesthetic |
| Teal + white pastels | Default health/wellness AI aesthetic |
| Soft gradient cards (pink-to-purple, blue-to-teal) | Default SaaS landing page AI aesthetic |
| Blue primary + light blue secondary | Default corporate AI aesthetic |
| Orange + dark gray | Default "modern startup" AI aesthetic |
| Rainbow/multicolor with equal visual weight | Default "diversity" or "inclusive" AI aesthetic |

NXT Humans uses a strictly limited palette: white, near-black, two grays, chartreuse, cyan. That is the complete palette. No other colors except semantic accents (warning yellow, critical red, positive green) which are used sparingly for status indicators.

### Rule 7: No Rounded-Corner-Everything

Sharp geometry is the NXT Humans signature. The default border radius is 0px.

| Element | Max Border Radius |
|---|---|
| Decorative shapes, illustrations, panels | 0px |
| Functional buttons | 4px |
| Input fields | 2px |
| Small tags/badges | 2px |
| Everything else | 0px |

No pill-shaped buttons (border-radius: 9999px). No rounded cards. No circular avatars for non-human entities. No rounded progress bars. Sharp edges signal precision and intentionality.

### Rule 8: No Card Soup

"Card soup" is a layout composed entirely of equally-sized rounded cards in a masonry or grid pattern, each containing an icon, a title, and a short description. It is the dominant layout pattern of AI-generated SaaS dashboards and landing pages.

NXT Humans deliverables use high information density with clear hierarchy. Content is organized by the six layout patterns defined in [[brand/layout-patterns]] — Split Panel, Section Divider, Recommendation Callout, Evidence Block, Stat Callout, Grid Matrix. None of these are "cards."

If a grid layout is needed, use the Grid Matrix pattern (a table, not a card grid). If a comparison is needed, use Split Panel or a bar chart, not a row of feature cards.

### Rule 9: Flat Geometric Illustrations Only

All illustrations follow the flat, geometric, vector, minimal style defined in [[brand/illustration-style]]. No gradients, no 3D, no organic shapes, no skeuomorphism, no icons-in-colored-circles.

---

## 6 Data Visualization Anti-Slop Rules

These rules extend the chart standards in [[brand/chart-standards]] with a specific anti-slop lens.

### Rule D1: Conclusion Titles, Not Descriptive Labels

Every chart title is a complete sentence stating the insight. "Revenue Growth by Quarter" is a label. "Q3 revenue declined 12% despite 20% increase in marketing spend" is a conclusion. Labels are slop. Conclusions are analysis.

### Rule D2: No Pie Charts

Banned. No exceptions. No donut charts either. Angles are harder for humans to compare than lengths. McKinsey banned pie charts decades ago. Use horizontal bar charts for part-to-whole comparisons.

### Rule D3: Functional Color, Not Decorative Color

Charts use a neutral base (`--nxt-muted` / `--nxt-secondary`) for all data elements. ONE element — the insight element — gets the highlight color (chartreuse or cyan). Rainbow bar charts where every bar is a different color are banned. They communicate nothing that a single-color chart with labels cannot.

### Rule D4: Source Citations on Every Chart

Every chart has a source citation in `--text-xs` directly below it. Dataset name, organization, date, sample size. No chart appears without provenance. "Source: Internal data" is acceptable. No source at all is not.

### Rule D5: Y-Axis Starts at Zero

On bar and column charts, the y-axis starts at zero. A truncated axis exaggerates differences and misleads the reader. Line charts may use a non-zero baseline with a visible break mark on the axis, documented in the subtitle.

### Rule D6: Citations as First-Class Design Elements

Source citations, evidence blocks, and data attributions are not footnotes. They are not reduced to tiny text in the margin. They are sized, positioned, and styled to be readable primary content. A citation in 6px text at the bottom of a page is functionally invisible and therefore functionally absent.

---

## Banned Language

These phrases are banned from all NXT Humans output. They are filler that AI defaults to. Replace them with specific, quantified, evidence-backed statements.

### Banned Phrases

| Banned Phrase | Why It Is Banned |
|---|---|
| "In today's rapidly evolving landscape" | Content-free throat clearing. Every era evolves. Start with the specific change. |
| "It's important to note" | If it is important, the reader will note it. State the fact directly. |
| "This is a game-changer" | Hyperbole without evidence. Quantify the change. |
| "Leverage synergies" | Corporate jargon with zero specificity. Name the actual mechanism. |
| "Best-in-class" | Meaningless without a benchmark. Against which class? By which metric? |
| "Cutting-edge" | Vague superlative. Describe the specific technical advancement. |
| "Robust solution" | "Robust" means nothing measurable. Specify the failure modes it handles. |
| "Seamless integration" | No integration is seamless. Describe the integration mechanism and its limitations. |
| "Holistic approach" | Signals vagueness. Enumerate the specific dimensions covered. |
| "Key takeaways" | Acceptable in a heading label only. Never in body text as filler. |
| "At the end of the day" | Verbal crutch with no analytical content. Delete it. |
| "Moving forward" | Temporal filler. Specify the timeframe: "In Q4 2026" or "Within 90 days." |
| "Low-hanging fruit" | Metaphor substituting for analysis. Name the specific opportunity and quantify the effort. |
| "Think outside the box" | Ironic because it is the most inside-the-box phrase in business language. |
| "Paradigm shift" | Almost never accurate. Describe the specific change in terms of before/after. |
| "Actionable insights" | Redundant — insights that are not actionable are not insights. State the action. |
| "Circle back" | Vague commitment avoidance. Specify what will happen, when, and by whom. |
| "Deep dive" (when used as filler) | Acceptable as a section heading for detailed analysis. Banned as a verbal crutch: "Let's do a deep dive" with no subsequent depth. |

### Replacement Rules

The fix for every banned phrase is the same three-step process:

1. **Replace vague claims with specific data.** "Customer satisfaction improved significantly" becomes "CSAT increased from 3.2 to 4.1 (28% improvement) between March and June 2026."
2. **Name the framework, not the buzzword.** "We took a holistic approach" becomes "We applied the IDEO Double Diamond framework, covering Discover, Define, Develop, and Deliver phases."
3. **Quantify the impact.** "This will be a game-changer" becomes "This reduces average checkout time from 4.2 minutes to 1.8 minutes, a 57% improvement that projects to $2.3M additional annual revenue at current conversion rates."

---

## 15-Point Anti-Slop Detection Checklist (Authoritative)

Source: NXT Humans Design System Style Guide, Section 07. Use this checklist to audit any AI-generated output before it enters a deliverable. Every item is a binary pass/fail. If any item fails, the output is slop and must be corrected before delivery.

| # | Detection Signal | Fix |
|---|---|---|
| 1 | **Default font detected** — Inter, Roboto, Arial, Poppins, Space Grotesk, or system-ui is present anywhere in the output. | Replace with Bebas Neue (headlines) + Archivo (body). See [[brand/identity]] for full font stacks. |
| 2 | **Purple gradient present** — Any purple-to-blue, purple-to-pink, or purple-to-white gradient appears anywhere. | Remove entirely. Solid fills only. NXT Humans palette has no purple. |
| 3 | **Card soup layout** — A grid of rounded-corner cards, each with icon + title + text, in uniform sizing. | Replace with Split Panel, Color-Block Grid, or table layout. Remove border-radius from cards. |
| 4 | **Icons in colored circles** — Small icons inside filled or tinted circles used as visual anchors. | Remove the circles. Use monoline icons only, without enclosing shapes. |
| 5 | **Accent line under title** — A short colored bar or underline placed directly below a heading for decoration. | Remove. Use whitespace for separation. The only permitted rule-accent is an 80px chartreuse line at section level only. |
| 6 | **Even color distribution** — Three or more colors used in roughly equal visual amounts with no dominant color. | Establish dominance: white 70% / black 20% / accent <=10%. One color must clearly dominate. |
| 7 | **Gradient blob backgrounds** — Aurora gradients, mesh gradients, glassmorphism, or any non-solid background behind content. | Remove. Backgrounds are solid white (#FFFFFF) or solid black (#0D0D0D) only. |
| 8 | **Generic stock imagery** — People at computers, handshakes, abstract tech visualizations, or other non-specific imagery. | Replace with actual screenshots, flat geometric diagrams, or nothing. If the space is empty without the image, information density is too low. |
| 9 | **Pie chart present** — Any pie chart or donut chart appears in the output. | Convert to a horizontal bar chart. Angles are harder for humans to compare than lengths. |
| 10 | **Topic title, not conclusion** — A chart title names the topic ("Revenue by Quarter") instead of stating the insight. | Rewrite as a conclusion sentence: "Q3 revenue declined 12% despite 20% increase in marketing spend." |
| 11 | **Missing source citation** — Data, statistics, or charts appear without a visible source attribution. | Add source citation in --text-xs at bottom-right of the chart or data element. Include dataset name, organization, date, and sample size. |
| 12 | **Rounded corners everywhere** — border-radius >4px applied broadly across elements. Pill-shaped buttons. Rounded cards. | Remove or reduce to <=4px. Sharp geometry is the NXT Humans signature. 0px is the default. |
| 13 | **Light body text on white** — Body text color is lighter than #555555 on a white background, reducing readability. | Darken to #333333 (body text) or #0D0D0D (headings). #999999 is the absolute lightest permitted text. |
| 14 | **No type scale contrast** — Headlines and body text are within 4px of the same font size. No visual hierarchy through scale. | Headlines must be >=2x body text size. Establish a minimum of 4 distinct size tiers in the type scale. |
| 15 | **Decorative elements present** — Shapes, lines, blobs, or images that do not communicate information. Purely ornamental. | Remove. If the layout feels empty without the decoration, information density is too low — add real content, not filler. |

### How to Use This Checklist

1. Generate the output.
2. Walk through all 15 signals sequentially.
3. For each signal detected, apply the fix in the right column.
4. Re-check after fixes — fixing one signal can introduce another (e.g., removing a gradient blob may reveal that the layout was card soup underneath).
5. Output passes only when all 15 checks return clean.

---

## Additional Slop Detection: Language and Structure

These checks supplement the 15-point visual checklist above.

### Language Slop Detection

- [ ] **Banned phrase scan**: Does the text contain any phrase from the banned list above? If yes, slop.
- [ ] **Specificity check**: Does any sentence make a claim without a number, date, or named source? If yes, likely slop.
- [ ] **Qualifier accumulation**: Does any sentence contain three or more qualifiers (very, highly, extremely, significantly, substantially)? If yes, slop.
- [ ] **Hedge detection**: Does any recommendation contain "consider", "might want to", "could potentially", "it may be worth"? If yes, slop. Recommendations are direct: "Do X by Y date."
- [ ] **Passive voice cluster**: Are three or more consecutive sentences in passive voice? If yes, likely slop. Active voice with named actors is the standard.
- [ ] **Empty transitions**: Does the text contain "Furthermore," "Moreover," "Additionally," "In addition," used as empty connectors between unrelated points? If yes, restructure into a proper argument.

### Structural Slop Detection

- [ ] **Five-point lists**: Does the output default to exactly 5 bullet points in every section? AI models have a strong bias toward 5-item lists. Vary list length to match the actual number of points.
- [ ] **Mirror structure**: Does every section follow the identical sub-heading pattern? (e.g., every section has Overview, Key Features, Benefits, Recommendations.) This signals templated AI output, not genuine analysis.
- [ ] **Conclusion echo**: Does the conclusion restate the introduction with minimal change? A conclusion should introduce a new synthesis, recommendation, or implication — not parrot the setup.

---

## Cross-References

- [[brand/identity]] — The CSS variable system that defines every permitted color, font, and spacing value
- [[brand/illustration-style]] — Detailed illustration rules enforcing Rule 9 (flat geometric only)
- [[brand/chart-standards]] — Detailed chart rules enforcing Rules D1-D6
