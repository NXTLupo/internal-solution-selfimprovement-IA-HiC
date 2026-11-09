# NXT Humans Slide Layouts — All 15 Templates

Every position is in inches on a 13.33" x 7.5" widescreen slide. Content area starts at x=0.6" after the optional sidebar.

## Shared Elements

### NXT Brand Sidebar (optional, dark slides only)
- Shape: rect, x=0, y=0, w=0.35", h=7.5", fill=#0D0D0D
- Wordmark: "NXT HUMANS" vertical text, Bebas Neue 8pt, white, rotated 270deg, centered in sidebar
- Dot grid: 3x3 chartreuse (#B8B800) circles, 0.06" dia, 0.04" gap, bottom of sidebar

### Footer (all content slides)
- Rule: line, x=0.6", y=5.30", w=12.13", stroke=#E0E0E0, 0.5pt
- Left text: "NXT HUMANS" Bebas Neue 7pt #999999, x=0.6", y=5.40"
- Right text: "NN / Total" Archivo 7pt #999999, x=12.0", y=5.40", align=right
- Accent rule (section openers only): rect, x=0.6", y=5.25", w=0.8", h=0.04", fill=#B8B800

---

## 01 — COVER
- Background: full #0D0D0D
- Sidebar: present
- Wordmark: Bebas Neue 72pt, #FFFFFF, opacity 12%, x=0.3", y=0.5" (bleeds right)
- Label: Bebas Neue 10pt, #B8B800, letterspacing 4px, x=0.6", y=4.0"
- Title: Bebas Neue 48pt, #FFFFFF, x=0.6", y=4.3", w=10", lineSpacing=0.92
- Subtitle: Archivo 300 16pt, #BBBBBB, x=0.6", y=5.8", w=8"
- Meta bar: Archivo 10pt, #999999, x=0.6", y=6.8" (version, date, confidential)

## 02 — SECTION DIVIDER
- Background: full #0D0D0D
- Sidebar: present
- Overflow type: Bebas Neue 120pt, rgba(255,255,255,0.06), right-aligned, y=center
- Section num: Bebas Neue 10pt, #B8B800, letterspacing 4px, x=0.6", y=2.5"
- Title: Bebas Neue 36pt, #FFFFFF, x=0.6", y=2.8", w=10"

## 03 — AGENDA
- Background: #FFFFFF
- Title: Bebas Neue 28pt, #0D0D0D, x=0.6", y=0.5"
- Items: Archivo 14pt, #333333, x=0.6", y=1.3", numbered list, 0.4" line spacing
- Active item highlighted with #B8B800 color

## 04 — EXECUTIVE SUMMARY
- Background: #FFFFFF
- Title: Bebas Neue 28pt, #0D0D0D, x=0.6", y=0.5"
- Rule accent: rect x=0.6", y=1.1", w=0.8", h=0.04", fill=#B8B800
- Lead text: Archivo 300 14pt, #666666, x=0.6", y=1.3", w=8"
- Body: Archivo 400 11pt, #333333, x=0.6", y=2.2", w=12.13", lineSpacing=1.65

## 05 — STAT ROW
- Background: #FFFFFF
- Title: Bebas Neue 28pt, #0D0D0D, x=0.6", y=0.5"
- 3 stat columns at y=1.5", evenly spaced across 12.13":
  - Number: Bebas Neue 48pt, #B8B800, center-aligned
  - Label: Archivo 12pt, #666666, center
  - Source: Archivo 8pt, #999999, center
- Vertical rules between columns: line, stroke=#E0E0E0, 0.5pt

## 06 — EVIDENCE QUOTE
- Background: #FFFFFF
- Left accent: rect x=0.6", y=1.2", w=0.04", h=2.5", fill=#00B7C3
- Quote: Archivo 300 16pt italic, #0D0D0D, x=0.8", y=1.2", w=10", lineSpacing=1.7
- Attribution: Archivo 10pt, #999999, x=0.8", y=4.0"
- Source: Archivo 8pt, #999999, right-aligned x=12.13", y=4.0"

## 07 — SPLIT PANEL
- Background: left half #FFFFFF, right half #F5F5F0
- Vertical rule: line x=6.67", y=0.5", h=4.5", stroke=#E0E0E0
- Left panel (analysis): x=0.6", w=5.67"
  - Title: Bebas Neue 24pt, #0D0D0D, y=0.5"
  - Body: Archivo 11pt, #333333, y=1.2", lineSpacing=1.65
  - Recommendation callout (optional): rect fill=#B8B800, Archivo 700 11pt #0D0D0D
- Right panel (evidence): x=7.07", w=5.67"
  - Title: Bebas Neue 18pt, #0D0D0D, y=0.5"
  - Evidence content or screenshot placeholder, y=1.2"

## 08 — COLOR-BLOCK GRID (2x2)
- 4 quadrants, no gaps:
  - TL: x=0, y=0, w=6.67", h=3.75", fill=#0D0D0D, text=#FFFFFF
  - TR: x=6.67", y=0, w=6.67", h=3.75", fill=#B8B800, text=#0D0D0D
  - BL: x=0, y=3.75", w=6.67", h=3.75", fill=#F5F5F0, text=#0D0D0D
  - BR: x=6.67", y=3.75", w=6.67", h=3.75", fill=#115054, text=#FFFFFF
- Each block: Bebas Neue 24pt title + Archivo 11pt body, padded 0.6" from edges

## 09 — THREE-COLUMN GRID
- 3 columns at y=1.3", w=3.78" each, gap=0.4"
- Each column: bordered rect, stroke=#E0E0E0
  - Title: Bebas Neue 18pt, #0D0D0D, top-padded
  - Body: Archivo 10pt, #333333

## 10 — RECOMMENDATION
- Full-bleed chartreuse: rect x=0, y=0, w=13.33", h=7.5", fill=#B8B800
- Title: Bebas Neue 32pt, #0D0D0D, x=0.6", y=1.5", w=12"
- Body: Archivo 14pt, #0D0D0D, x=0.6", y=3.0", w=10"
- Source: Archivo 10pt, #666666, x=0.6", y=5.0"

## 11 — DATA CHART
- Title: Archivo 600 14pt, #0D0D0D (conclusion sentence, NOT topic)
- Chart area: x=0.6", y=1.3", w=12.13", h=3.5"
- Source: Archivo 8pt, #999999, bottom-right of chart
- Accent: ONE data element in #B8B800 or #00B7C3, rest in #999999

## 12 — COMPARISON MATRIX
- Title: Bebas Neue 28pt, #0D0D0D
- Table: header row fill=#0D0D0D, text=#B8B800 Bebas Neue 10pt
  - Body rows: Archivo 10pt, #333333, alternating #FFFFFF/#F5F5F0
  - Cell padding: 8px
  - No border-radius on cells

## 13 — PROCESS TIMELINE
- Title: Bebas Neue 28pt, #0D0D0D, y=0.5"
- Horizontal steps at y=2.0":
  - Step boxes: rect w=2.2", h=2.5", fill=#F5F5F0, stroke=#E0E0E0
  - Step number: Bebas Neue 18pt, #B8B800
  - Step title: Archivo 700 10pt, #0D0D0D
  - Step body: Archivo 10pt, #666666
- Connecting arrows: straight lines with triangular heads, #999999

## 14 — DO / DON'T
- Two columns:
  - Left (DO): fill=#F0F8F0, top border 4px #4CAF50
  - Right (DON'T): fill=#FFF0F0, top border 4px #CC3333
- Title: Bebas Neue 24pt in each column
- Items: Archivo 10pt, checkmark/X prefix in green/red

## 15 — CLOSING
- Background: #0D0D0D
- Wordmark: Bebas Neue 96pt, rgba(255,255,255,0.06), centered
- Slogan: Bebas Neue 10pt, #B8B800, letterspacing 4px, centered, y=4.5"
- Tagline: Archivo 300 14pt, #BBBBBB, centered, y=5.0"
- Meta: Archivo 10pt, #999999, centered, y=6.5"
