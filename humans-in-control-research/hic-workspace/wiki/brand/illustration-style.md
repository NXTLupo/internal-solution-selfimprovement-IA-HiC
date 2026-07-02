---
id: brand/illustration-style.md
title: "Illustration & Visual Style Guide"
type: brand
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [brand, illustration, visual-style, flat-design, geometric, vector]
evidence_count: 0
chunks:
  - id: "brand/illustration-style.md#c0"
    char_span: [0, 2213]
    sentence_count: 20
    key_terms: [illustration, elements, element, decorative, circles, shapes, visual, illustrations]
    concepts: [illustration, elements, element, decorative, illustrations]
    section: Core Principles
    token_count: 477
  - id: "brand/illustration-style.md#c1"
    char_span: [2242, 3432]
    sentence_count: 7
    key_terms: [illustration, accent, color, shapes, background, element, black, chartreuse]
    concepts: [illustration, accent, color, background, shapes]
    section: Color in Illustrations
    token_count: 300
  - id: "brand/illustration-style.md#c2"
    char_span: [3449, 4839]
    sentence_count: 4
    key_terms: [icons, icon, set, inside, white, backgrounds, grid, consistent]
    concepts: [icons, inside, backgrounds, consistent, white]
    section: Icon Style
    token_count: 338
  - id: "brand/illustration-style.md#c3"
    char_span: [4859, 6321]
    sentence_count: 4
    key_terms: [connector, labels, line, specifications, color, flows, nodes, right-angle]
    concepts: [connector, labels, specifications, right-angle, color]
    section: Diagram Style
    token_count: 390
  - id: "brand/illustration-style.md#c4"
    char_span: [6323, 6973]
    sentence_count: 1
    key_terms: [rectangles, architecture, left-to-right, top-to-bottom, comparison, service, flows, side-by-side]
    concepts: [rectangles, architecture, left-to-right, top-to-bottom, comparison]
    section: Diagram Style
    token_count: 141
  - id: "brand/illustration-style.md#c5"
    char_span: [7002, 8866]
    sentence_count: 21
    key_terms: [banned, effects, gradients, gradient, visual, illustrations, ai-generated, icons]
    concepts: [banned, effects, gradients, gradient, illustrations]
    section: What This Style Is NOT
    token_count: 416
---
# Illustration & Visual Style Guide

Every illustration, icon, diagram, and visual element produced under the NXT Humans identity must conform to these rules. This style exists to eliminate the generic, over-decorated aesthetic that signals AI-generated content. The goal is precision, clarity, and visual authority.

---

## Core Principles

### 1. Flat

No gradients. No drop shadows. No 3D effects. No skeuomorphism. Every shape is a solid fill or a stroke. If you feel the urge to add a shadow to "lift" an element, the layout needs restructuring instead.

- Solid color fills only
- No linear-gradient, radial-gradient, or mesh-gradient in any element
- No box-shadow, text-shadow, or filter: drop-shadow
- No faux-3D perspective transforms
- No glossy/glass/frosted effects

### 2. Geometric

All shapes are built from circles, rectangles, triangles, and straight lines. No organic forms, no bezier curves used decoratively, no amorphous blobs.

- Circles: Perfect circles only (equal width/height). No ovals or ellipses for decorative purposes.
- Rectangles: Square corners by default. Border radius of 2-4px permitted ONLY for functional UI elements (buttons, input fields). Never for decorative shapes.
- Triangles: Equilateral or right-angle only. Used for arrows, directional indicators, hierarchy markers.
- Lines: Straight, horizontal, vertical, or 45-degree angles. No curves, waves, or organic paths.

### 3. Vector

Every illustration must render crisply at any resolution. No raster textures, no bitmap backgrounds, no photographic elements mixed into illustrations.

- SVG is the required format for all inline illustrations
- Minimum stroke width: 1px at base size
- No anti-aliasing artifacts — clean edges at all zoom levels
- Export at 2x minimum for any raster fallback

### 4. Minimal

Use the fewest shapes possible to communicate the concept. Negative space is a design element, not empty space waiting to be filled.

- If removing a shape does not reduce comprehension, remove it
- White space between elements should be deliberate and generous
- No decorative elements that do not serve the communication goal
- No background patterns, textures, or fills on illustration containers

---

## Color in Illustrations

### The Three-Color Maximum Rule

Every illustration uses a maximum of three colors. No exceptions.

| Slot | Color | Usage |
|---|---|---|
| **Primary shapes** | `--nxt-black` (#0D0D0D) on white background | Main subject, primary outlines, key elements |
| **Accent** | `--nxt-chartreuse` (#B8B800) OR `--nxt-cyan` (#00B7C3) — pick ONE | Highlight element, focal point, the "insight" in the illustration |
| **Supporting** | `--nxt-muted` (#999999) or `--nxt-secondary` (#666666) | Background shapes, secondary elements, context |

### Rules

1. **ONE accent color per illustration.** Chartreuse OR cyan. Never both in the same illustration. The choice depends on context: chartreuse for recommendations and actions, cyan for evidence and data.
2. **The accent element must be the focal point.** Do not scatter accent color across multiple shapes. One element gets the accent; everything else is black or gray.
3. **Black is the dominant color.** Most shapes should be black or dark gray. The illustration reads as "black-and-white with a pop of color."
4. **White background is implicit.** Illustrations sit on `--nxt-white` or `--nxt-off-white`. No colored illustration backgrounds.

---

## Icon Style

### Specifications

| Property | Value |
|---|---|
| **Style** | Monoline (uniform stroke weight) OR solid geometric (filled shapes) — pick one style per icon set, never mix |
| **Stroke weight** | 2px consistent across all icons in a set |
| **Grid** | 24px or 32px base grid — all icons in a set use the same grid |
| **Container** | Square or circular — one shape per set, never mixed (e.g., all square OR all circular) |
| **Corner radius** | 0px for decorative icons, 2px max for UI action icons |
| **Padding** | 2px inset from container edge on all sides |

### Icon Rules

1. **No filled circles with white icons inside.** This is the single most common AI-slop cliche in icon design. A white checkmark inside a green circle, a white person inside a blue circle — banned.
2. **No multicolor icons.** Icons are monochrome: `--nxt-black` on light backgrounds, `--nxt-white` on dark backgrounds. Accent color permitted only for active/selected states.
3. **Consistent metaphors.** Use the same icon for the same concept across all deliverables. Maintain an icon dictionary.
4. **No emoji or emoji-derived icons.** No pictographic faces, hand gestures, or emoji-style objects.
5. **Optical alignment over mathematical alignment.** Triangles (play buttons, arrows) should be optically centered, not geometrically centered — shift right by ~1px to compensate for perceived imbalance.

---

## Diagram Style

### Line and Connector Specifications

| Property | Value |
|---|---|
| **Border/outline** | 1px `--nxt-rule` (#E0E0E0) |
| **Connecting lines** | Straight, right-angle only (no curves, no diagonal) |
| **Arrowheads** | Small filled triangles, 6px wide, same color as the connecting line |
| **Line color** | `--nxt-muted` (#999999) for standard connections, `--nxt-black` (#0D0D0D) for primary/critical paths |
| **Node shapes** | Rectangles with 0-2px border radius for processes, circles for start/end, diamonds for decisions |

### Label Specifications

| Property | Value |
|---|---|
| **Font** | `--font-body` (Archivo) |
| **Size** | `--text-sm` (0.8rem) for node labels, `--text-xs` (0.7rem) for connector labels |
| **Color** | `--nxt-body` (#333333) for node labels, `--nxt-secondary` (#666666) for connector labels |
| **Position** | Centered inside nodes, above or below connector lines (never on top of the line) |

### Flow Direction

1. **Primary flow: left-to-right.** This is the default for process flows, service architectures, data pipelines.
2. **Secondary flow: top-to-bottom.** For hierarchy diagrams, decision trees, organizational charts.
3. **NEVER diagonal.** No angled connectors. If a connection must change direction, use a right-angle bend.
4. **Consistent spacing.** Equal horizontal gaps between nodes in L-R flows. Equal vertical gaps in T-B flows. Use `--space-lg` (2rem) minimum between nodes.

### Diagram Types and Templates

| Diagram Type | Layout | Node Shape | When to Use |
|---|---|---|---|
| Process flow | Left-to-right | Rounded rectangles (2px radius) | Customer journeys, service flows, data pipelines |
| Decision tree | Top-to-bottom | Diamonds for decisions, rectangles for outcomes | Logic flows, routing, conditional processes |
| Architecture | Left-to-right, layered | Rectangles, grouped in swim lanes | System architecture, service maps, tech stacks |
| Hierarchy | Top-to-bottom | Rectangles | Org charts, taxonomy, information architecture |
| Comparison | Side-by-side columns | Tables or aligned blocks | Feature comparison, before/after, A vs B |

---

## What This Style Is NOT

These are explicitly banned visual approaches. If you see any of these in generated output, it is wrong and must be corrected.

### Banned: Rounded Blobs and Organic Shapes
No amorphous blobs, cloud shapes, organic curves, or biomorphic forms. These signal generic AI-generated design and convey no information. Every shape must be identifiable as a circle, rectangle, triangle, or straight line.

### Banned: Gradient Fills
No linear gradients, radial gradients, mesh gradients, or aurora/northern-lights effects. No gradient text. No gradient backgrounds. Flat solid fills only.

### Banned: Isometric Illustrations and 3D Mockups
No isometric grid illustrations. No 3D device mockups (floating phones, laptops at angles). No perspective-transformed UI screenshots. If you need to show a screen, use a flat screenshot with a 1px border.

### Banned: Hand-Drawn / Sketchy / Whiteboard Aesthetics
No faux-handwritten fonts. No squiggly lines pretending to be hand-drawn. No "whiteboard" or "napkin sketch" styles. No marker-stroke effects.

### Banned: Duotone Photo Treatments
No photos with two-color overlay filters. No halftone dot effects on photography. If photography is used (rare), it appears unfiltered with a simple 1px border.

### Banned: Neon Glow Effects
No glowing text. No neon outlines. No bloom/glow filters. No "cyberpunk" aesthetic elements. No light-leak effects.

### Banned: Icons in Colored Circles
No icons placed inside filled colored circles. This is the dominant visual cliche of AI-generated SaaS landing pages and corporate slide decks. Icons stand alone on the background or sit inside a 1px stroke container.

---

## Cross-References

- [[brand/identity]] — CSS variables and color definitions that govern illustration colors
- [[brand/anti-slop]] — Comprehensive list of banned visual patterns including the ones summarized above
