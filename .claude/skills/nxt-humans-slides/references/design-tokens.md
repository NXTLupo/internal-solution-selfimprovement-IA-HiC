# NXT Humans Design Tokens

Single source of truth for all color, typography, and spacing values used in slide generation. These values are mirrored in `assets/nxt-tokens.js` for programmatic use.

## Colors

| Token | Hex | Role | Budget |
|-------|-----|------|--------|
| BLACK | #0D0D0D | Headlines, sidebar, dark section fills | Dominant (~40%) |
| WHITE | #FFFFFF | Primary background, text on dark | Dominant (~30%) |
| HEADING | #0D0D0D | All heading text on white | — |
| BODY | #333333 | Body text on white | — |
| SECONDARY | #666666 | Captions, metadata, supporting text | — |
| MUTED | #999999 | Footnotes, source citations, timestamps | — |
| RULE | #E0E0E0 | Dividers, table borders, panel outlines | — |
| PANEL | #F5F5F0 | Alternating table rows, evidence bg tint | — |
| CHARTREUSE | #B8B800 | Power accent: stats, recommendations, CTAs | <=15% of surface |
| CYAN | #00B7C3 | Secondary accent: evidence, links, data emphasis | <=10% of surface |
| TEAL_DEEP | #115054 | Section divider text, primary actions | Accent only |
| RECOMMEND_BG | #B8B800 | Solid fill for recommendation callouts | Full block |
| RECOMMEND_TEXT | #0D0D0D | Text on chartreuse recommendation bg | — |
| EVIDENCE_BG | #E8F6F7 | Light fill for evidence blocks | — |
| EVIDENCE_BORDER | #00B7C3 | Left border on evidence blocks | 4px |
| WARNING_BG | #FFF8E1 | Hypothesis / unvalidated claim bg | — |
| WARNING_BORDER | #B8B800 | Left border on warning blocks | 4px |
| POSITIVE_BG | #F0F8F0 | Strengths / positive findings | — |
| POSITIVE_BORDER | #4CAF50 | Left border on positive blocks | 4px |
| CRITICAL_BG | #FFF0F0 | Critical issues / red flags | — |
| CRITICAL_BORDER | #CC3333 | Left border on critical blocks | 4px |

### Banned colors
Purple, pink, orange, rainbow sequences, pastel palettes. These signal AI generation or generic corporate design.

## Typography

| Token | Font | Weight | Use |
|-------|------|--------|-----|
| HEADLINE | Bebas Neue | 400 (only weight) | All headlines, stat callouts, sidebar branding. UPPERCASE ONLY. Never below 18pt in slides. |
| BODY | Archivo | 400 | Body text, bullets, table cells, captions |
| BODY_BOLD | Archivo | 700 | Emphasis within body, button text, labels |
| BODY_LIGHT | Archivo | 300 | Lead paragraphs, subtitles |
| MONO | JetBrains Mono | 400 | Code, CSS variables, technical specs, data labels |

### Fallback stack
Bebas Neue -> Oswald -> Impact -> sans-serif
Archivo -> Source Sans Pro -> Helvetica Neue -> sans-serif
JetBrains Mono -> Fira Code -> SF Mono -> monospace

### Banned fonts
Inter, Roboto, Arial, Poppins, Space Grotesk, Calibri, system-ui

## Type Scale (for PPTX, in points)

| Token | Size | Face | Use |
|-------|------|------|-----|
| display | 72pt | Bebas Neue | Background watermarks on cover/section dividers |
| h1 | 36pt | Bebas Neue | Slide titles |
| h2 | 28pt | Bebas Neue | Section headers within slide |
| h3 | 18pt | Bebas Neue | Card titles, sub-headers |
| stat | 48pt | Bebas Neue | Hero statistics (chartreuse) |
| lead | 14pt | Archivo 300 | Lead paragraph, subtitle |
| base | 12pt | Archivo 400 | Standard body text |
| sm | 10pt | Archivo 400 | Captions, table cells, metadata |
| xs | 8pt | Archivo 400 | Source citations, footnotes, slide numbers |

## Spacing (inches, for PPTX positioning)

| Token | Value | Use |
|-------|-------|-----|
| MARGIN_X | 0.6" | Left/right content margin |
| MARGIN_TOP | 0.5" | Top margin for content |
| CONTENT_W | 12.13" | Full content width (13.33 - 2*0.6) |
| HALF_W | 5.87" | Half-width panel (for split layouts) |
| GAP | 0.4" | Space between panels in split layout |
| FOOTER_Y | 5.30" | Y position of footer rule |
| FOOTER_TEXT_Y | 5.40" | Y position of footer text |
| SIDEBAR_W | 0.35" | NXT brand sidebar width |
| RULE_ACCENT_W | 0.8" | Chartreuse accent rule width |
| RULE_ACCENT_H | 0.04" | Chartreuse accent rule height |
| DOT_GRID_SIZE | 0.06" | Individual dot diameter in 3x3 grid |
| DOT_GRID_GAP | 0.04" | Gap between dots |

## Slide Dimensions

| Property | Value |
|----------|-------|
| Width | 13.33" (widescreen 16:9) |
| Height | 7.5" |
| Layout name | LAYOUT_WIDE |

## Shape Rules

- Border radius: 0 on everything. ROUNDED_RECTANGLE is banned.
- Shadows: none. Ever.
- Borders: 1px #E0E0E0 where structural (table cells, panel edges). Never decorative.
- Gradients: banned.
