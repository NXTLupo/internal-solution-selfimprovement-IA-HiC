---
title: "Data Visualization & Chart Standards"
type: brand
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [brand, charts, data-viz, mckinsey, zelazny]
evidence_count: 0
---

# Data Visualization & Chart Standards

All data visualization in NXT Humans deliverables follows McKinsey and Gene Zelazny standards. Every chart exists to communicate a specific conclusion. If the chart does not have a conclusion, it does not belong in the deliverable.

---

## The Zelazny Principle: Conclusion-First Charts

Every chart MUST have a conclusion title. The title is a complete sentence stating what the viewer should take away from the data.

### Correct

> "Customer satisfaction declined 18% in Q3 after the checkout redesign"

### Wrong

> "Customer Satisfaction Scores"
> "Q3 Results"
> "NPS Over Time"

Descriptive titles are labels, not communication. A chart without a conclusion title is a chart without a purpose.

**Title formatting:**
- Font: `--font-headline` (Bebas Neue), `--text-xl` (1.35rem)
- Color: `--nxt-heading` (#0D0D0D)
- Position: Top-left aligned above the chart area
- Subtitle (optional): `--font-body`, `--text-sm`, `--nxt-secondary` — for time range, segment, or methodology note

---

## Chart Type Selection Guide

Choose chart types based on the analytical relationship you are communicating, not based on what looks interesting.

### Approved Chart Types

| Chart Type | Analytical Relationship | When to Use | Example Conclusion Title |
|---|---|---|---|
| **Horizontal Bar** | Comparison across categories | Comparing discrete items (brands, features, segments) where labels are long | "Brand X leads satisfaction by 12 points across all age segments" |
| **Vertical Column** | Comparison across categories | Comparing discrete items where labels are short (months, quarters, years) | "Q2 onboarding volume exceeded Q1 by 340 users" |
| **Grouped Bar/Column** | Comparison across categories with sub-groups | Side-by-side comparison of 2-3 sub-groups within each category | "Desktop conversion outperforms mobile in every region except APAC" |
| **Stacked Bar/Column** | Part-to-whole composition | Showing how components sum to a total, across categories | "Support tickets shifted from billing (40%) to UX issues (55%) in 6 months" |
| **Line** | Trend over time | Continuous change over a time series (min 4 data points) | "Monthly churn rate stabilized at 2.1% after the March intervention" |
| **Multi-line** | Trend comparison | Comparing 2-4 trends on the same time axis | "Organic traffic recovered while paid traffic continued to decline" |
| **Waterfall** | Cumulative impact | Showing how sequential additions/subtractions build to a total | "Three cost reductions offset by two new investments netted $1.2M savings" |
| **Bubble** | Multi-variable relationship | Plotting 3 variables simultaneously (x-axis, y-axis, bubble size) | "High-frequency users cluster in the low-effort, high-satisfaction quadrant" |
| **Spider/Radar** | Maturity assessment | Comparing performance across 5-8 dimensions for 1-3 entities | "Product maturity exceeds competitors on UX but lags on API coverage" |
| **Scatter** | Correlation | Showing relationship between two continuous variables | "Response time and satisfaction show strong negative correlation (r=-0.82)" |
| **Heatmap** | Density/intensity | Showing patterns across two categorical axes | "Support volume peaks Tuesday-Thursday between 10am-2pm EST" |

### Banned Chart Types

| Chart Type | Why It Is Banned | Alternative |
|---|---|---|
| **Pie Chart** | McKinsey bans pie charts. Angles are harder for humans to compare than lengths. A pie chart with 5+ slices is functionally unreadable. Even with 2-3 slices, a bar chart communicates the same data more precisely. | Horizontal bar chart or stacked bar chart |
| **Donut Chart** | A pie chart with a hole. Same problems, marginally worse because the arc lengths are thinner. | Horizontal bar chart |
| **3D Bar/Column** | Perspective distortion makes values impossible to compare accurately. The back row looks smaller than the front row at equal values. | Standard 2D bar/column chart |
| **3D Pie** | Combines the angle-comparison problem of pie charts with perspective distortion. The slice facing the viewer appears larger. | Horizontal bar chart |
| **Area Chart (filled)** | Filled areas between lines obscure the data and make comparison between series difficult. Occlusion is the primary problem. | Multi-line chart |
| **Word Cloud** | No analytical relationship. Size-mapped text is imprecise and visually chaotic. Tells you nothing about frequency distribution that a bar chart cannot communicate 10x more clearly. | Horizontal bar chart of top N terms |
| **Gauge/Speedometer** | Single-value display wasting space. The circular metaphor adds no information. | Stat callout (number + descriptor) or bullet chart |
| **Treemap** | Nested rectangles are difficult to compare. Area comparison is nearly as bad as angle comparison. | Stacked bar chart or hierarchical table |
| **Funnel Chart** | The tapered shape implies a specific metaphor (conversion funnel) but the visual encoding is imprecise — widths are hard to compare. | Horizontal bar chart with stage labels |

---

## Functional Color System for Charts

Charts do NOT use a rainbow palette. Charts use a neutral base with ONE highlight color.

### The Rule

1. **All bars, lines, and data points start in neutral.** Use `--nxt-muted` (#999999) or `--nxt-secondary` (#666666) as the base color for all data elements.
2. **ONE element gets the highlight.** The bar, line, or point that represents the insight — the element the conclusion title refers to — gets the accent color.
3. **Accent color choice:** `--nxt-chartreuse` (#B8B800) for recommendations, actions, positive findings. `--nxt-cyan` (#00B7C3) for evidence, benchmarks, reference points.
4. **Maximum two highlight colors per chart** if the conclusion involves a comparison between two specific elements. Never more than two.

### Example: Bar Chart Color Application

```
Category A  ████████████████████  45%    (--nxt-muted)
Category B  ██████████████        32%    (--nxt-muted)
Category C  ████████████████████████ 58% (--nxt-chartreuse) ← the insight
Category D  ████████████          28%    (--nxt-muted)
Category E  ██████████████████    42%    (--nxt-muted)
```

Conclusion title: "Category C outperforms all segments by at least 13 percentage points"

### Multi-Series Color Palette

When multiple series are required (grouped bars, multi-line), use this ordered palette:

1. `--nxt-black` (#0D0D0D) — Primary series
2. `--nxt-muted` (#999999) — Secondary series
3. `--nxt-chartreuse` (#B8B800) — Highlight series (the one the conclusion is about)
4. `--nxt-rule` (#E0E0E0) — Tertiary series (if 4 series are absolutely necessary)

Never exceed 4 series in a single chart. If more than 4 categories need comparison, split into multiple charts or use a table.

---

## Axis and Grid Rules

### Y-Axis

1. **Y-axis starts at zero on all bar/column charts.** No exceptions. Truncated axes exaggerate differences and mislead readers.
2. **Line charts may use a non-zero baseline** if the data range is narrow and starting at zero would compress all variation into the top 10% of the chart. When using a non-zero baseline, add a visible break mark (zigzag) on the y-axis and note it in the subtitle.
3. **Y-axis labels:** `--font-mono` (JetBrains Mono), `--text-xs`, `--nxt-muted`. Right-aligned, positioned to the left of the axis line.
4. **Y-axis gridlines:** `--nxt-rule` (#E0E0E0), 1px, dashed. 4-6 gridlines maximum. No gridlines if there are data labels on each bar.

### X-Axis

1. **X-axis labels:** `--font-body` (Archivo), `--text-xs`, `--nxt-secondary`. Center-aligned below each bar or data point.
2. **No rotated labels.** If labels are too long, switch to a horizontal bar chart or abbreviate.
3. **Time series: left-to-right chronological.** Oldest data on the left, newest on the right.

### Grid

1. **Remove all unnecessary gridlines.** If the chart has data labels, gridlines are redundant. Remove them.
2. **No vertical gridlines on bar charts.** Horizontal gridlines only (or no gridlines with data labels).
3. **No chart borders.** The chart area does not have a surrounding box/border. It sits cleanly on the page.

---

## Source Citations on Charts

Every chart MUST include a source citation. Data without provenance is not evidence.

### Format

```
Source: [Dataset or Study Name], [Organization], [Date]. N=[sample size].
```

### Positioning

- Font: `--font-body`, `--text-xs` (0.7rem)
- Color: `--nxt-muted` (#999999)
- Position: Below the chart, left-aligned, with `--space-xs` gap above
- If multiple sources: stack vertically, one per line

### Examples

```
Source: Customer Satisfaction Survey, NXT Humans, Q3 2025. N=2,847.
Source: App Store Reviews, scraped via Reddit Ripper, 2025-09-15. N=12,340 reviews.
Source: Modeled from BERTopic analysis of 5,200 support tickets, 2025-08-01 to 2025-10-31.
```

### Rules

1. **Never omit the source.** Even for internal data. "Source: Internal CRM export, 2025-10-01" is valid.
2. **Include sample size (N=) whenever applicable.** The reader needs to assess statistical reliability.
3. **Include date or date range.** Data has a shelf life. The reader needs to know how current it is.
4. **Citations are first-class design elements, not footnotes.** They are visible, legible, and positioned immediately below the chart they reference. Not in an appendix. Not in a footnote at the bottom of the page.

---

## Chart Implementation Checklist

Before including any chart in a deliverable, verify every item:

- [ ] Conclusion title (complete sentence stating the insight)
- [ ] Chart type matches the analytical relationship (comparison, trend, composition, correlation)
- [ ] No pie charts, donut charts, 3D charts, word clouds, gauges, or treemaps
- [ ] Neutral base color with ONE highlight on the insight element
- [ ] Y-axis starts at zero (bar/column) or has a visible break mark (line with non-zero base)
- [ ] No rotated axis labels
- [ ] No unnecessary gridlines
- [ ] No chart border/box
- [ ] Source citation below the chart with dataset name, organization, date, and sample size
- [ ] Font usage correct: `--font-headline` for title, `--font-body` for labels, `--font-mono` for axis values
- [ ] Maximum 4 series per chart
- [ ] Maximum 12 categories per bar chart (split into multiple charts if more)

---

## Cross-References

- [[brand/identity]] — CSS variables for colors, fonts, and spacing used in all chart rendering
- [[brand/anti-slop]] — Banned chart types and visual patterns that detect AI-generated data visualization
