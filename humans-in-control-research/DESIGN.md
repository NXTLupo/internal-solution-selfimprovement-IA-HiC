---
name: NXT Humans
version: 1.0.0
brands:
  nxt:
    primary: "#0D0D0D"
    surface: "#FFFFFF"
    panel: "#FAFAFA"
    accent: "#B8B800"
    accentMax: 0.15
    secondary: "#00B7C3"
    negative: "#CC6644"
    teal: "#115054"
    success: "#0CCE6B"
    error: "#FF5A5A"
  nu:
    primary: "#141414"
    surface: "#FFFFFF"
    panel: "#FAFAFA"
    accent: "#C8102E"
    accentMax: 0.15
    secondary: "#000000"
    negative: "#CC6644"
typography:
  body: { family: "Archivo", weightRange: [200, 900] }
  display: { family: "Bebas Neue", weights: [400] }
  mono: { family: "JetBrains Mono", weights: [400, 500] }
  scale:
    h1: { size: "3rem", weight: 900, family: "Bebas Neue", letterSpacing: "0.02em" }
    h2: { size: "2rem", weight: 800 }
    body: { size: "1rem", weight: 400, lineHeight: 1.5 }
    small: { size: "0.75rem", weight: 600, letterSpacing: "2px", textTransform: "uppercase" }
layout:
  radius: { default: 2, max: 4 }
  spacing: { unit: 4 }
  grid: { columns: 12, gutter: 16 }
  forbidden: ["shadow", "gradient", "radius > 4px", "pie chart"]
iconography:
  style: "flat"
  fill: "monochrome"
  stroke: "geometric"
  forbidden: ["skeuomorphic", "3d", "gradient fill"]
---

# NXT Humans Design System

## Overview
Flat, minimalistic, data-dense, and high-contrast. Every surface earns its pixel. No decoration for decoration's sake. The aesthetic is journalistic gravitas meets modernist architecture.

## Action Titles
Every heading is a complete sentence stating a conclusion with data. Not a topic label.

- GOOD: "35% of first-year students do not return, costing $9B annually"
- BAD: "The Landscape" | "Key Findings" | "Overview"

## Color Rules
- Primary ink (`#0D0D0D` NXT / `#141414` NU) on white or `panel` is default.
- Accent (`#B8B800` chartreuse NXT / `#C8102E` Huskies Red NU) must not exceed 15% of surface area in any view. Scarcity creates impact.
- One accent per block — never mix chartreuse and cyan in the same block on NXT.
- Negative (`#CC6644` rust) for problems, warnings, and friction callouts.

## Typography Rules
- Display headings: Bebas Neue, uppercase.
- Body: Archivo, 400-600 for text, 700-900 for emphasis.
- Monospace: JetBrains Mono for code, citations, and data labels.
- Banned families: Inter, Roboto, Arial, Poppins, Space Grotesk.

## Layout Rules
- Radius: 0-4px. Never more.
- No shadows. No gradients. No decorative textures.
- Pie charts are banned. Use horizontal bars for part-to-whole.
- Grid is 12 columns, 16px gutter, 4px base unit for spacing.

## Iconography
- Flat, monochrome, geometric. Stroke-based or filled — not both.
- No skeuomorphism, no 3D, no gradient fills.
- Use icons sparingly; prefer text with a single accent mark over icon-heavy interfaces.

## Citations
- Every data point shows source: "Higher Ed Dive, 2025" not "research".
- Banned generic references: "research", "studies", "data", "sources", "findings".

## Banned Phrases
Link: see `.claude/CLAUDE.md` for the 350+ slop blacklist. This file does not duplicate it; the AI consumer is expected to load both.
