---
title: "NXT Humans Visual Identity System"
type: brand
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md, The_Ordinary_Personal_Shopper_Analysis.pptx, NXT_HUMANS_Design_System_Style_Guide.html]
confidence: high
status: active
tags: [brand, identity, css, design-system, typography, color]
evidence_count: 0
---

# NXT Humans Visual Identity System

This document is the single source of truth for the NXT Humans visual identity. Every deliverable -- research reports, presentations, dashboards, exported PDFs -- MUST conform to these specifications. Read this page before rendering any visual output.

---

## Design Philosophy

**Anti-slop business flat minimalism.** Not decorative -- a discipline. Every element earns its place through function. This identity sits at the intersection of Swiss International Style and editorial brutalism.

The single most important rule:

> **IF IT LOOKS LIKE AI MADE IT, IT'S WRONG.**

Gradient overlays, rainbow palettes, decorative illustrations, rounded-everything softness, generic stock imagery -- these are the signatures of unreviewed machine output. NXT Humans deliverables must look like a human designer made deliberate choices.

---

## Complete CSS Variable System

```css
/* NXT HUMANS DESIGN SYSTEM -- AUTHORITATIVE TOKEN SET */
:root {
  /* ── Foundation ── */
  --nxt-white: #FFFFFF;
  --nxt-off-white: #FAFAFA;
  --nxt-paper: #F5F5F0;
  --nxt-black: #0D0D0D;
  --nxt-near-black: #1A1A1A;

  /* ── Brand Accents ── */
  --nxt-chartreuse: #B8B800;
  --nxt-chartreuse-soft: #D4D44A;
  --nxt-cyan: #00B7C3;
  --nxt-teal-deep: #1A5C5E;

  /* ── Neutral Hierarchy ── */
  --nxt-heading: #0D0D0D;
  --nxt-body: #333333;
  --nxt-secondary: #666666;
  --nxt-muted: #999999;
  --nxt-subtle: #BBBBBB;
  --nxt-rule: #E0E0E0;
  --nxt-rule-light: #EEEEEE;
  --nxt-panel: #F5F5F0;

  /* ── Semantic Accents ── */
  --nxt-recommend: #B8B800;
  --nxt-recommend-text: #0D0D0D;
  --nxt-evidence-bg: #E8F6F7;
  --nxt-evidence-border: #00B7C3;
  --nxt-warning-bg: #FFF8E1;
  --nxt-warning-border: #B8B800;
  --nxt-critical-bg: #FFF0F0;
  --nxt-critical-border: #CC3333;
  --nxt-positive-bg: #F0F8F0;
  --nxt-positive-border: #4CAF50;

  /* ── Typography ── */
  --font-headline: 'Bebas Neue', 'Oswald', 'Agency FB', sans-serif;
  --font-body: 'Archivo', 'Source Sans Pro', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  /* ── Type Scale (10 stops) ── */
  --text-xs: 0.7rem;
  --text-sm: 0.8rem;
  --text-base: 1rem;
  --text-lg: 1.15rem;
  --text-xl: 1.35rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.25rem;
  --text-4xl: 3rem;
  --text-5xl: 4.5rem;
  --text-6xl: 6rem;
  --text-display: 8rem;

  /* ── Spacing ── */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 5rem;
  --space-3xl: 8rem;

  /* ── Widths ── */
  --content-max: 1200px;
  --sidebar-width: 48px;
}
```

---

## Template Modes

NXT Humans operates with two distinct template modes. Selecting the wrong mode for a deliverable undermines the design system.

### STARK WHITE (Primary)

The default mode for all HiC deliverables. White `#FFFFFF` canvas.

| Attribute | Value |
|---|---|
| **Background** | `--nxt-white` (#FFFFFF) primary surface, `--nxt-off-white` (#FAFAFA) alternating sections, `--nxt-paper` (#F5F5F0) panel backgrounds |
| **Text** | Headlines `--nxt-heading` (#0D0D0D), Body `--nxt-body` (#333333) |
| **Accents** | Chartreuse (#B8B800) primary accent, Cyan (#00B7C3) secondary |
| **Borders/Rules** | `--nxt-rule` (#E0E0E0), `--nxt-rule-light` (#EEEEEE) for subtle separators |
| **Use When** | Research reports, analysis documents, exported PDFs, web dashboards, any HiC deliverable |
| **Frequency** | 85-90% of all output |

### DARK (Section Dividers, Hero Sections)

Reserved for emphasis. Never an entire deliverable.

| Attribute | Value |
|---|---|
| **Background** | `--nxt-black` (#0D0D0D) primary surface, `--nxt-near-black` (#1A1A1A) alternating sections |
| **Text** | Headlines #FFFFFF, Body #E0E0E0 |
| **Accents** | Same accents -- higher visual impact on dark backgrounds |
| **Borders/Rules** | #333333 or #444444 |
| **Use When** | Section dividers within decks, title slides, high-impact presentation moments, keynote screens |
| **Frequency** | 10-15% of all output -- reserved for emphasis |

**Rule**: Default to STARK WHITE. Use DARK mode only for section dividers, title slides, and deliberate visual breaks within a longer document. Never build an entire deliverable in DARK mode unless explicitly requested.

---

## Color Usage Rules

| Rule | Specification |
|---|---|
| **Chartreuse budget** | <=15% of any visual surface |
| **Cyan budget** | <=10% of any visual surface |
| **Accents per illustration** | One accent color only |
| **Max colors per illustration** | 3 (including black/white) |
| **Background tints on primary canvas** | NEVER -- white stays white |
| **Functional color in charts** | Only where it encodes data meaning |
| **Banned hues** | NEVER purple, pink, orange, rainbow gradients, or pastels |

### Chartreuse (#B8B800) -- Primary Accent

- **Maximum coverage: 15% of any visual surface.** Chartreuse is a power accent. Overuse dilutes impact.
- **Approved uses**: Recommendation callout backgrounds, stat callout numbers, highlight bars in charts, active/selected states, CTA buttons.
- **Banned uses**: Large background fills, body text color, borders on every element, decorative patterns.
- **Text on chartreuse**: Always `--nxt-recommend-text` (#0D0D0D). Never white text on chartreuse -- insufficient contrast.
- **Soft variant** (`--nxt-chartreuse-soft` #D4D44A): Use for hover states, secondary highlights, or where full chartreuse is too aggressive.

### Cyan (#00B7C3) -- Secondary Accent

- **Relationship to chartreuse**: Cyan is always subordinate. It never competes with chartreuse on the same element or in the same visual grouping.
- **Approved uses**: Evidence block backgrounds (as `--nxt-evidence-bg` tint), secondary chart highlight, link color, secondary button outlines, info badges.
- **Banned uses**: Same element as chartreuse, headline color, primary CTA color.
- **Deep variant** (`--nxt-teal-deep` #1A5C5E): Use for dark-mode link text, deep chart segments, or footer backgrounds within DARK template.

### Neutral Palette Usage

- `--nxt-heading` (#0D0D0D): Headlines and primary labels only.
- `--nxt-body` (#333333): All body text. Not quite black -- easier on eyes at sustained reading lengths.
- `--nxt-secondary` (#666666): Secondary information, column headers, timestamps, metadata.
- `--nxt-muted` (#999999): Tertiary information, disabled states, placeholder text, chart baseline elements.
- `--nxt-subtle` (#BBBBBB): Watermarks, ghost elements, very light decorative borders.
- `--nxt-rule` (#E0E0E0): All horizontal rules, borders, dividers, table gridlines.
- `--nxt-rule-light` (#EEEEEE): Ultra-light separators, alternating row hints, nested panel borders.
- `--nxt-panel` (#F5F5F0): Panel backgrounds, alternating table rows, sidebar backgrounds.

### Semantic Colors

Each semantic state has a background and border token. Use both together.

| State | Background | Border | Text on background |
|---|---|---|---|
| **Evidence** | `--nxt-evidence-bg` (#E8F6F7) | `--nxt-evidence-border` (#00B7C3) | `--nxt-body` (#333333) |
| **Warning** | `--nxt-warning-bg` (#FFF8E1) | `--nxt-warning-border` (#B8B800) | #856404 |
| **Critical** | `--nxt-critical-bg` (#FFF0F0) | `--nxt-critical-border` (#CC3333) | #721C24 |
| **Positive** | `--nxt-positive-bg` (#F0F8F0) | `--nxt-positive-border` (#4CAF50) | #155724 |

---

## Typography System

### Font Stack Hierarchy

| Role | Font Stack | Fallback Chain | Usage |
|---|---|---|---|
| **Headlines** | `--font-headline` | Bebas Neue > Oswald > Agency FB > sans-serif | All headings (H1-H6), section titles, stat callout descriptors, navigation labels |
| **Body** | `--font-body` | Archivo > Source Sans Pro > Helvetica Neue > sans-serif | Paragraphs, bullet points, table cells, captions, UI text |
| **Code/Data** | `--font-mono` | JetBrains Mono > Fira Code > SF Mono > monospace | Code snippets, data tables with numeric precision, terminal output, API responses |

### Banned Typefaces

The following typefaces are explicitly banned. Their presence in any deliverable is a design failure:

- **Inter** -- the generic "safe" choice; signals no design thought
- **Roboto** -- Android system font; carries platform baggage
- **Arial** -- the default-of-defaults; invisible in the worst way
- **system-ui** -- unpredictable cross-platform rendering
- **Space Grotesk** -- trendy startup aesthetic, not our identity
- **Poppins** -- rounded geometric; reads as friendly/soft, contradicts editorial brutalism

### Type Scale (10 Stops)

These sizes are not suggestions. Every text element in every deliverable must map to one of these levels.

| Level | Variable | Size | Weight | Font | Use Case |
|---|---|---|---|---|---|
| **Display** | `--text-display` | 8rem | 900 | Headline | Oversized hero statements, full-bleed section openers |
| **Hero** | `--text-6xl` | 6rem | 900 | Headline | Section divider titles, hero numbers in stat callouts |
| **Page Title** | `--text-5xl` | 4.5rem | 700-900 | Headline | Keynote-scale titles, cover slides |
| **Title** | `--text-4xl` | 3rem | 700 | Headline | Document titles, slide titles |
| **Section Title** | `--text-3xl` | 2.25rem | 700 | Headline | Major section headings (H1 equivalent) |
| **Subsection** | `--text-2xl` | 1.75rem | 700 | Headline | H2-level headings |
| **Sub-subsection** | `--text-xl` | 1.35rem | 600 | Headline | H3-level headings |
| **Lead Body** | `--text-lg` | 1.15rem | 400 | Body | Introductory paragraphs, executive summary text |
| **Body** | `--text-base` | 1rem | 400 | Body | Standard paragraphs, bullet points, table cells |
| **Small** | `--text-sm` | 0.8rem | 400 | Body | Captions, secondary labels, stat callout descriptors |
| **Micro** | `--text-xs` | 0.7rem | 400 | Body/Mono | Source citations, footnotes, chart axis labels |

### Typography Rules

1. **Headline font is UPPERCASE by default.** Bebas Neue is designed for all-caps. Apply `text-transform: uppercase` to all headline-font elements. If mixed-case is needed, switch to Oswald (the first fallback).
2. **NEVER use Bebas Neue in sentence case.** It was not designed for it and looks broken.
3. **NEVER use Bebas Neue below 18px.** It loses legibility at small sizes. Use Archivo for any text below that threshold.
4. **Line height for body text: 1.6.** For headlines: 1.1. For micro text: 1.4.
5. **Letter spacing for headlines: 0.05em.** For body text: 0 (default). For micro text: 0.02em.
6. **Maximum line length: 72 characters** for body text. Use `max-width: 42rem` on text containers.
7. **Font loading**: Load Bebas Neue, Archivo, and JetBrains Mono from Google Fonts. Always include `font-display: swap` to prevent invisible text during load.

### Oversized Headline Treatment

Headlines at `--text-6xl` and `--text-display` are designed to crop at container edges. This is intentional, not a bug.

```css
.oversized-headline {
  font-family: var(--font-headline);
  font-size: var(--text-display);
  line-height: 0.85; /* range: 0.85-0.92 */
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}
```

The headline bleeds into the container boundaries. Descenders and ascenders may clip. The visual tension this creates is part of the editorial brutalism aesthetic. Do not add padding to "fix" the cropping.

---

## Spacing System

The spacing scale uses a consistent set of values. Do not invent intermediate spacing values.

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 0.25rem (4px) | Tight gaps: between icon and label, between badge and text |
| `--space-sm` | 0.5rem (8px) | Intra-component padding: inside tags, between list items |
| `--space-md` | 1rem (16px) | Standard padding: card interiors, between paragraphs, form field gaps |
| `--space-lg` | 2rem (32px) | Section-level gaps: between content blocks, above/below headings |
| `--space-xl` | 3rem (48px) | Major section separation: between primary content areas |
| `--space-2xl` | 5rem (80px) | Page-level separation: top/bottom page margins, between major document sections |
| `--space-3xl` | 8rem (128px) | Full-page vertical breathing room: between major acts of a deliverable, before/after cover sections |

### Width Constraints

| Token | Value | Usage |
|---|---|---|
| `--content-max` | 1200px | Maximum width for main content containers |
| `--sidebar-width` | 48px | Collapsed sidebar / navigation rail width |

### Spacing Rules

1. **Vertical rhythm**: All vertical spacing must use tokens from this scale. No arbitrary pixel values.
2. **Heading spacing**: `--space-lg` above a heading, `--space-sm` below (tight coupling with the content it introduces).
3. **Card/panel padding**: `--space-md` on all sides minimum. `--space-lg` for feature panels.
4. **Page margins**: `--space-2xl` top and bottom, `--space-xl` left and right on documents. Slides use `--space-lg` all sides.
5. **Grid gaps**: `--space-md` for tight grids (data tables), `--space-lg` for card grids.

---

## Brand Dot Grid

The NXT Humans maker's mark: a 3x3 grid of chartreuse circles. This appears on every page of every deliverable.

```css
.brand-dot-grid {
  display: grid;
  grid-template-columns: repeat(3, 6px);
  grid-template-rows: repeat(3, 6px);
  gap: 4px;
  position: absolute;
  left: var(--space-lg);
  top: 50%;
  transform: translateY(-50%);
}

.brand-dot-grid .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--nxt-chartreuse);
}
```

**Specifications**: 9 circles (3 rows, 3 columns), each 6px diameter, 4px gap between them, positioned in the left margin. This is the maker's mark -- it appears on every page, no exceptions. Do not resize, recolor, animate, or add extra dots.

---

## Cross-References

- [[brand/anti-slop]] -- The 15-point anti-slop detection checklist. Banned patterns, banned fonts, banned language that violate this identity system.
- [[brand/chart-standards]] -- Data visualization rules that extend the color and typography systems defined here
- [[brand/layout-patterns]] -- Layout compositions that use the spacing, color, and typography tokens from this page
- [[brand/illustration-style]] -- Illustration rules that enforce the flat/geometric aesthetic aligned with this identity
