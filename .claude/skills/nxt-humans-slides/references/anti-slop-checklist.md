# Anti-Slop Detection Checklist

Run every generated deck against this checklist before delivery. A single "yes" means the deck needs revision. This is the quality gate that prevents NXT Humans output from looking AI-generated.

The core principle: **If it looks like AI made it, it's wrong.**

---

| # | Signal | What to look for | Fix |
|---|--------|------------------|-----|
| 1 | Default font | Inter, Roboto, Arial, Poppins, Space Grotesk, Calibri, or system-ui rendered as primary typeface | Replace with Bebas Neue (headlines) + Archivo (body). If the viewer's machine is substituting, note in delivery email that fonts must be installed. |
| 2 | Purple gradient | Any purple-to-blue, purple-to-pink, or purple-to-white gradient anywhere | Remove entirely. Solid fills from the brand palette only. |
| 3 | Card soup layout | Grid of rounded-corner cards with even spacing, each with icon + title + text | Replace with Split Panel, Color-Block Grid, or table. Remove all border-radius. |
| 4 | Icons in colored circles | Small icons centered inside filled circles, often in a row | Remove circles. Use monoline icons on their own, or omit icons entirely. |
| 5 | Accent line under title | Short colored line/bar directly below any title | Remove. Whitespace does the job. The 0.8" chartreuse rule-accent is only allowed once per section after the section h2. |
| 6 | Even color distribution | 3+ colors used in roughly equal amounts | Rebalance to 70% neutral / 20% neutral counterpart / <=10% accent. |
| 7 | Gradient blob backgrounds | Blurred aurora/mesh/glassmorphism shapes behind content | Remove. Solid white or solid black backgrounds only. |
| 8 | Generic stock imagery | People at computers, handshakes, abstract tech patterns | Replace with product screenshots, flat geometric diagrams, or nothing. |
| 9 | Pie chart present | Any pie or donut chart | Convert to horizontal bar chart showing the same data. |
| 10 | Topic title on chart | Chart title names the topic ("Revenue by Quarter") instead of stating the insight | Rewrite as conclusion: "Revenue declined 12% in Q3, breaking a 4-quarter growth streak." |
| 11 | Missing source citation | Any data point, stat, or chart without a visible source | Add source in xs (8pt) at bottom-right of the data element. |
| 12 | Rounded corners | Border-radius > 0 on any container, card, image, or shape | Remove. Sharp geometry is the brand. |
| 13 | Light body text | Body color lighter than #555555 on white | Darken to #333333 (body) or #0D0D0D (headings). |
| 14 | No type scale contrast | Headlines within 2x body text size | Headlines must be >=2x body. The scale is in design-tokens.md. |
| 15 | Decorative elements | Any shape, line, or image that communicates nothing | Remove. If the slide feels empty, raise information density instead. |

---

## Additional PPTX-specific checks

| # | Signal | Fix |
|---|--------|-----|
| 16 | Text overflow past shape bounds | Cut words, raise the container, or move content to a second slide. Never shrink type below the minimum (xs = 8pt). |
| 17 | Footer collides with content | Content must end by y = 5.20". Footer rule starts at y = 5.30". |
| 18 | Inconsistent alignment between slides | Content left edge should always be at x = 0.6" on light slides and x = 0.6" on dark slides (both past the sidebar if present). |
| 19 | Missing slide number in footer | Every content slide has "NN / Total" bottom-right. |
| 20 | Over-bulleted lists | Prefer prose or a single line. If bullets are essential, cap at 5. Never more than 3 levels of indent. |
| 21 | Two accent colors on one slide without distinct roles | Pick one — chartreuse OR cyan. The exception is semantic blocks where cyan = evidence and chartreuse = recommendation, both appearing with clear role distinction. |
| 22 | Placeholder text left in | Search output for "Lorem", "TODO", "[insert", "xxx". All must be gone. |

---

## Workflow

1. Generate deck.
2. Convert to images (soffice -> pdftoppm).
3. Open every image and run the 22 checks above.
4. Fix issues.
5. Regenerate, re-convert, re-verify only affected slides.
6. One fix-and-verify cycle is enough. Do not chase sub-pixel positioning.
