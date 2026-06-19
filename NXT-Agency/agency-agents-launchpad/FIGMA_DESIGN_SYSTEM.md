# NXT Humans Website 2026 - Complete Design System

> Extracted from Figma file **NXT Humans Website 2026** on 2026-03-18
> File ID: `SPqccoINis4oLGTeT7C6Y7`
> Last modified: 2026-03-12T15:51:45Z
> Version: 2330094543278219876

---

## 1. File Overview

### Pages
| Page Name | ID | Purpose |
|---|---|---|
| COVER | 0:1 | File cover/thumbnail |
| 2026 Concept v01 | 296:1205 | Main design concept with all sections |
| LIBRARY | 1:6 | Design system components and tokens |
| FAVICON | 493:8 | Favicon assets at all sizes |
| EPS LOGOS | 534:1130 | Logo exports (White, Lime, Teal, Black) |
| Videos | 230:1008 | Video section assets |
| Floating Nav AI | 212:1833 | AI navigation overlay variants |
| SCROLL TEST | 397:785 | Full-page scroll prototype |
| 2026 Concept v00 | 1:2 | Earlier concept version |

### Extracted Design Screens (9 target nodes)
| Node ID | Name | Type | Dimensions |
|---|---|---|---|
| 302:3658 | TYPE STYLE | SECTION | 2003 x 979 |
| 302:3685 | COLORS | SECTION | 2003 x 979 |
| 184:727 | ApproachPanels | INSTANCE | 1440 x 1056 |
| 4:597 | HEADER | SECTION | 1600 x 726 |
| 14:266 | Buttons | SECTION | 2078 x 967 |
| 498:1675 | Form Container | GROUP | 448 x 1056 |
| 163:5990 | Services | SECTION | 5630 x 2382 |
| 212:1709 | NAVIGATION | SECTION | 1467 x 723 |
| 4:987 | INDUSTRIES | SECTION | 7000 x 5062 |

### Primary Design Viewport
- **Desktop**: 1440px width
- **Full section height**: 1056px (common panel height)
- **Industry panels**: 1024px height

---

## 2. Color Palette

### Brand Colors (from COLORS section - 302:3685)

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Darkest Gray** | `#141414` | rgb(20, 20, 20) | Primary background, darkest surfaces |
| **Dark Gray** | `#242424` | rgb(36, 36, 36) | Secondary background, form background, title text on light |
| **Med Gray 1** | `#3a3a3a` | rgb(58, 58, 58) | Button variants (dark), close button bg, nav bar bg |
| **Green (Teal)** | `#115054` | rgb(17, 80, 84) | Brand accent teal, header bg, button text on lime, services section bg |
| **Light Gray** | `#eaeaea` | rgb(234, 234, 234) | Light backgrounds, form text, close icon, hover states |
| **Lightest Gray** | `#fafafa` | rgb(250, 250, 250) | Near-white backgrounds, inactive progress bars, hover titles |
| **White** | `#ffffff` | rgb(255, 255, 255) | Text on dark, primary text on dark backgrounds |
| **Green - Bright (Lime)** | `#caca20` | rgb(202, 202, 32) | Primary CTA color, buttons, expand icons, service subtitles |

### Extended Palette (all colors found in designs)

| Hex | Usage |
|---|---|
| `#000000` | Pure black, image backgrounds, industry panel backgrounds |
| `#00000000` | Transparent fills |
| `#115054` | Brand teal (primary brand color) |
| `#11505466` | Teal at 40% opacity |
| `#141414` | Darkest gray background |
| `#242424` | Dark gray / secondary background |
| `#2496bd` | LinkedIn blue (LinkedIn icon colored state) |
| `#3a3a3a` | Medium gray |
| `#444444` | Section background (design canvas) |
| `#525252` | Input placeholder text, input separator |
| `#9747ff` | Figma annotation purple (design-only) |
| `#acacac` | Label text, style name text |
| `#caca20` | Lime / neon green (primary CTA) |
| `#d9d9d9` | Icon fill base |
| `#eaeaea` | Light gray |
| `#fafafa` | Lightest gray |
| `#ffffff` | White |
| `#ffffff99` | White at 60% opacity |

### Color Relationships
- **Primary backgrounds**: `#141414` (dark), `#242424` (medium-dark), `#115054` (teal)
- **Primary text on dark**: `#ffffff`, `#eaeaea`, `#fafafa`
- **Primary text on light**: `#141414`, `#242424`
- **CTA / Accent**: `#caca20` (lime green/neon yellow)
- **Secondary accent**: `#115054` (deep teal)
- **Interactive states**: `#caca20` -> `#115054` (button text on lime), `#eaeaea` (hover bg)

---

## 3. Typography

### Font Families

| Font | Usage | Notes |
|---|---|---|
| **AgencyFB** | Display titles / hero headings | Bold/Black weight only, always uppercase |
| **Archivo** | All body text, UI, buttons, labels | Primary UI typeface, weights 200-700 |
| **Inter** | Caption bold accent | Used sparingly for bold captions |

### Type Scale (Desktop)

| Token | Font | Weight | Size | Line Height | Letter Spacing | Case | Usage |
|---|---|---|---|---|---|---|---|
| **XXXL** | AgencyFB | 900 (Black) | 180px | 180px | 1.8px (1%) | UPPERCASE | Hero display title |
| **XXL** | AgencyFB | 900 (Black) | 100px | 100px | 1.0px (1%) | UPPERCASE | Secondary display title |
| **H1** | Archivo | 200 (ExtraLight) | 72px | 80px | 0px | Normal | Page headings |
| **H2** | Archivo | 200 (ExtraLight) | 52px | 56px | 0px | Normal | Section headings |
| **H3** | Archivo | 200 (ExtraLight) | 44px | 60px | 0px | Normal | Subsection headings |
| **H3-M** | Archivo | 200 (ExtraLight) | 32px | 46px | 0px | Normal | Mobile subsection headings |
| **H4** | Archivo | 500 (Medium) | 21px | 40px | 0px | Normal | Form subtitles, medium emphasis |
| **H4** | Archivo | 500 (Medium) | 18px | 26px | 0px | Normal | Medium emphasis body |
| **P** | Archivo | 300 (Light) | 18px | 26px | 0px | Normal | Body text |
| **P (alt)** | Archivo | 300 (Light) | 18px | 32px | 0px | Normal | Body text relaxed line height |
| **P-SM** | Archivo | 300 (Light) | 16px | 18px | 0px | Normal | Small body text |
| **P-SM (nav)** | Archivo | 300 (Light) | 16px | ~17.4px | -0.16px | Normal | Navigation items |
| **CAPTION** | Archivo | 300 (Light) | 12px | 14px | 0px | Normal | Section labels, captions |
| **CAPTION-BOLD** | Archivo | 700 (Bold) | 12px | 14px | 0px | Normal | Bold captions |
| **CAPTION-BOLD (alt)** | Inter | 800 (ExtraBold) | 12px | 14px | 0px | Normal | Accent captions |
| **BUTTON** | Archivo | 700 (Bold) | 12px | 14px | 0px | UPPERCASE | Button labels |
| **INPUT-LABEL** | Archivo | 300 (Light) | 14px | 18px | 0px | Normal | Form field labels |
| **INPUT-CAPTION** | Archivo | 600 (SemiBold) | 12px | ~13px | 0px | Normal | Form section titles |
| **INPUT-HINT** | Archivo | 300 (Light) | 12px | ~13px | -0.12px | Normal | Input placeholder text |

### Mobile Type Scale
| Token | Size | Line Height |
|---|---|---|
| H1-M | 72px (same) | 80px |
| H2-M | 52px (same) | 56px |
| H3-M | 32px | 46px |

### Industry Title Scale
- Industry panel titles use AgencyFB 900 at very large sizes within 202px-high containers
- Title widths range from 719px to 1247px depending on text length

---

## 4. Spacing & Layout System

### Layout Modes
- **VERTICAL**: Primary layout direction for sections, content stacks
- **HORIZONTAL**: Used for button content, header rows, inline elements

### Padding Values
| Value | Usage |
|---|---|
| 16px | Button vertical padding, input vertical padding |
| 24px | Button horizontal padding, header padding, form field container gaps |

### Gap Values (itemSpacing)
| Value | Usage |
|---|---|
| 4px | Tight inline grouping (icon + text in buttons) |
| 8px | Form field label gap, button icon gap |
| 10px | Content gaps in frames |
| 12px | Service number + title gap |
| 16px | Suggestion link spacing, medium component spacing |
| 24px | Form field group spacing, progress bar segment spacing |
| 64px | Content block spacing within sections |
| 72px | Text group spacing in approach panels |
| 112px | Service area group spacing (between Growth/Automation/Innovation) |
| 278px | Header container main gap (logo to buttons) |

### Key Dimensions
| Element | Width | Height |
|---|---|---|
| Full desktop viewport | 1440px | - |
| Section panel | 1440px | 1056px |
| Industry panel (hover) | 1440px | 202px |
| Industry panel (open) | 1440px | 1024px |
| Header component | 1440px | 96px (expanded) / 88px (collapsed) |
| Content width (approach) | 920px | variable |
| Services description | 684px | 678px |
| Service areas column | 309px | 1160px |
| Form container | 448px | 1056px |
| Form inner width | 368px | variable |
| Form field input | 368px | 56px |
| Form field + label | 368px | 82px |
| CTA Button (primary) | 110px | 48px |
| CTA Button (wide) | 180-194px | 48-56px |
| Close button | 88px | 88px |
| Expand button | 64px | 64px |
| LinkedIn icon button | 40px | 40px |
| Progress bar height | 1px | - |
| Logo container | ~169px | 44px |
| Example thumbnail | 684px | 385px |

---

## 5. Border Radius

| Value | Usage |
|---|---|
| 2px | Buttons (Square, AI-Form, Contact), navigation items |
| 4px | Header nav bar background, close button inner |
| 5px | Component set containers (Figma component boundary) |

### Component-Specific Radius
- **All CTA buttons**: 2px border-radius
- **Navigation bar background**: 4px border-radius
- **Close button (ellipse)**: Fully circular (50%)
- **Expand button (ellipse)**: Fully circular (50%)
- **LinkedIn button (ellipse)**: Fully circular (50%)

---

## 6. Shadows & Effects

### Background Blurs
| Radius | Usage | Element |
|---|---|---|
| 56px | Approach panels overlay | ApproachPanels main component |
| 40px | Dark overlay blur | BLUR BG in approach |
| 32px | Frosted glass effect | Services section frosted panels (top/bottom) |
| 24px | Button/content blur | Various blur elements, industry BLUR overlays |
| 0px | No-blur layer | Companion layer to blurred elements |

### Blur Pattern
The frosted glass effect is achieved by layering:
1. A photo/image background
2. A semi-transparent solid fill with BACKGROUND_BLUR
3. Content on top

### Opacity Values Found
- Teal at 40%: `#11505466` used on some overlay elements
- White at 60%: `#ffffff99`
- Various image overlays use opacity on rectangles over background photos

### No Drop Shadows
The design does not use traditional drop shadows. All depth effects are achieved through background blurs and layered opacity.

---

## 7. Components - Detailed Structure

### 7.1 TYPE STYLE (302:3658)
The typography reference board showing all text styles with visual examples.

**Text style specimens displayed:**
- `Archivo Extra Light 72/80` - H1 heading
- `Archivo Extra Light 52/56` - H2 heading
- `ARCHIVO LIGHT 12/14` - Caption
- `CAPTION` - Label style
- `CAPTION-BOLD` - Bold label
- `H2` - Section heading
- `H1` - Page heading
- `XXXL` - Display title
- `XXL` - Large display
- `H3` - Subsection
- `P` - Body paragraph
- `H4` - Small heading (x2 variants)
- `H3-M` - Mobile heading
- `H2-M` - Mobile section heading
- `H1-M` - Mobile page heading
- `Archivo Light 21/40` - Description
- `Archivo Light 16/18` - Small description
- `Archivo Medium 18/26` - Medium description
- `Archivo Light 18/26` - Light description
- `Archivo Light 18/32` - Relaxed description
- `Archivo Extra Light 44/60` - Subtitle
- `Archivo Extra Light 32/46` - Mobile subtitle
- `ARCHIVO BOLD 12/14` - Button text
- `AGENCY FB 180; 1%` - Display XXXL
- `AGENCY FB 100; 1%` - Display XXL

### 7.2 COLORS (302:3685)
The color reference board showing all brand color swatches (100x100px each).

**Swatches with labels:**
| Swatch | Fill | Label |
|---|---|---|
| Rectangle 8 | `#fafafa` | LIGHTEST GRAY |
| Rectangle 6 | `#ffffff` | WHITE |
| Rectangle 1 | `#eaeaea` | LIGHT GRAY |
| Rectangle 5 | `#3a3a3a` | MED GRAY 1 |
| Rectangle 2 | `#242424` | DARK GRAY |
| Rectangle 7 | `#141414` | DARKEST GRAY |
| Rectangle 3 | `#115054` | GREEN |
| Rectangle 4 | `#3a3a3a` | GREEN - BRIGHT |

> Note: Rectangle 4 labeled "GREEN - BRIGHT" has fill #3a3a3a in the node data. The actual lime/bright green `#caca20` is used extensively in buttons and CTAs throughout the design.

### 7.3 ApproachPanels (184:727)
Full-screen dark panel with approach/mission statement and step progress bar.

**Structure:**
- Background: `#141414` with face photo behind a blur layer
- FACE BG layer: Background photo + BLUR BG (blur radius 40px, fill `#141414`)
- CONTENT (920px wide, vertical layout, gap 10px):
  - Section Title: "OUR APPROACH" (caption style, white)
  - Section subtitle: "At NXT Humans, we are building a future where AI elevates the people doing it. Our mission is to amplify organizations by expanding their capacity to think, create, and adapt." (white)
- STEP BAR (1392px wide):
  - 4 progress segments (330px each, 1px height, 24px gap)
  - Active segment: white (#ffffff)
  - Inactive segments: `#fafafa`
  - Step labels: "01. INTRO", "02. AI NATIVE VELOCITY", "03. INTELLIGENCE AUGMENTATION", "04. AI-ASSISTED DEVELOPMENT"
  - Active label: white, inactive labels: `#fafafa`

### 7.4 HEADER (4:597)
Website header with 3 component variants.

**Variant 1 - Group 73 (Expanded Header):**
- Background: `#115054` (teal), 1440x96px
- Vertical layout, 24px padding all sides
- Header Container: horizontal layout, 278px gap
- Contains: AI-Form button (lime `#caca20`, 180x48px) + Square CONTACT button (lime `#caca20`, 110x48px)

**Variant 2 - Group 74 (Collapsed with Logo):**
- Black nav bar (`#000000`, 920x72px, 4px radius)
- NXT HUMANS wordmark logo (white vectors, ~169x44px)
- "CONTACT US" button (lime `#caca20`, 194x56px) with arrow icon
- Text: "CONTACT US" in `#115054`

**Variant 3 - Variant3 (Collapsed with ASK US):**
- Black nav bar (`#000000`, 920x75px, 4px radius)
- NXT HUMANS wordmark logo (white vectors)
- CONTACT button (lime, 110x48px)
- "ASK US ANYTHING" button (lime, 194x56px)

### 7.5 Buttons (14:266)
Complete button component library.

**LinkedIn Button (2 variants):**
- Default: White circle (40px), dark gray LinkedIn icon (`#3a3a3a`)
- Colored: LinkedIn blue circle (`#2496bd`), white icon

**Close Button (3 variants):**
- Gray: Gray circle (`#3a3a3a`, 88px), X icon in `#eaeaea`
- NeonGreen: Lime circle (`#caca20`, 88px), X icon in `#115054`
- Hover: Teal circle (`#115054`, 88px), X icon in `#caca20`

**Expand Button (2 variants):**
- Default: Lime circle (`#caca20`, 64px), expand arrows icon
- Variant2: Lime circle (`#caca20`, 64px), different expand icon

**Square Button (4 variants):**
- Frame 123: Dark gray (`#3a3a3a`), light text (`#eaeaea`), 110x48px, r=2px, pad 16/24
- Frame 124: Darker (`#242424`), light text (`#eaeaea`)
- Frame 125: Lime (`#caca20`), teal text (`#115054`) -- PRIMARY CTA
- Frame 126: Lime (`#caca20`), teal text (`#115054`) -- PRIMARY CTA alt

**AI-Form Button (2 variants):**
- Square (collapsed): Lime (`#caca20`), 180x48px, "ASK US ANYTHING" in teal + plus icon
- Frame 126 (expanded): Opens to 300x265px search/suggestions panel:
  - White top bar with search input ("Ask us a question...")
  - Suggestions panel with links: "Who do we serve", "How we use AI", "What do we do", "Send an email"

### 7.6 Form Container (498:1675)
Side panel contact form (448x1056px full height).

**Structure:**
- Form Background: `#242424`, 448x1056px
- **Header** (Frame 133, 368x88px):
  - Title: "What's nxt?" (ExtraLight, `#eaeaea`)
  - Close button (Gray variant, 88px circle)
- **Book a Meeting Section** (Frame 134, 368x74px):
  - Subtitle: "Book a meeting" (Medium 21px, `#eaeaea`)
  - Calendar icon (`#caca20`)
  - Arrow icon (`#caca20`)
  - Horizontal dividers: 1px `#eaeaea` lines
- **Contact Form Section** (Group 88, 368x446px):
  - Subtitle: "Contact a specialist" (Medium 21px, `#eaeaea`)
  - **FORM FIELDS** (vertical layout, 24px gap):
    - **Name Field** (368x82px, 8px gap between label and input):
      - Label: "Name" (14px Light, `#eaeaea`)
      - Caption: "Who we're contacting" (inside input, `#eaeaea`)
      - Input: 368x56px, `#141414` background
    - **Email Field** (368x82px):
      - Label: "Email address"
      - Caption: "Where to send info"
      - Input: 368x56px, `#141414` background
    - **Company Field** (368x82px):
      - Label: "Company"
      - Caption: "Which team we're helping"
      - Input: 368x56px, `#141414` background
  - **Submit Button**: Square variant (lime `#caca20`, 110x48px, "SUBMIT" in `#115054`)

### 7.7 Services (163:5990)
Services section with scroll interaction and 3 service categories.

**ServiceAreas Component (309x1160px, vertical layout, 112px gap):**

Three service groups, each with number + title + description list:

**01. GROWTH** (212x100px header, 12px gap between number and title)
- Number: "01." (12px caption, white)
- Title: "GROWTH" (lime `#caca20`, large display text within 100px height)
- Items (white, 18px body):
  - Predictive Analytics
  - Customer Segmentation
  - Deep Learning / Data Science
  - Opportunity Assessment

**02. AUTOMATION** (306x100px header)
- Title: "AUTOMATION" (lime `#caca20`)
- Items:
  - Customer Research
  - Conversational Agents
  - Sales-Service-Support Agents
  - Data Enrichment

**03. INNOVATION** (286x100px header)
- Title: "INNOVATION" (lime `#caca20`)
- Items:
  - North Star Vision & Strategy
  - Proof-Of-Value Prototypes
  - Technology Experimentation
  - Implementation ROI

**SERVICE-SCROLL Component (3 scroll states, 1440x1056px each):**
- Background: `#115054` (teal)
- Left column: ServiceAreas component
- Right column: Services description container (684x678px):
  - Caption: "WHAT WE DO" (12px, white)
  - Title: "Services & Solutions" (large, lime `#caca20`)
  - Description: "Our Proof of Value approach delivers working prototypes in 6 to 8 weeks. Stakeholders get clear ROI and your team moves forward quickly with confidence." (white)
- FROSTED glass overlays: Two rectangles (732x250px) with 32px background blur, teal fill, positioned at top and bottom edges

### 7.8 NAVIGATION (212:1709)
AI-powered navigation suggestions.

**AIOpen-Button Component (2 variants):**
- Default: White background (`#ffffff`), 432x44px, 2px radius
  - Text: navigation label (16px Light, `#141414`)
- Hover: Light gray background (`#eaeaea`), 432x44px, 2px radius
  - Text: navigation label (16px Light, `#141414`)

**Sample navigation items:** "Who do we serve"

### 7.9 INDUSTRIES (4:987)
Industry panels with hover and open states for 4 verticals.

**Default State (1440x1024px, lime `#caca20` background):**
- 4 industry bars stacked (each 1440x202px):
  - Background: `#000000` with opacity
  - Title text: `#242424` (dark on lime)
  - Industries listed: HIGHER EDUCATION, HEALTHCARE & LIFE SCIENCES, FINANCE & INSURANCE, Retail & Ecommerce
- Subtitle: "We partner with..." (`#242424`)

**Hover State (per industry, 1440x1024px):**
- Full-bleed background photo (specific to industry)
- Title bar (1440x202px):
  - Background: `#141414`
  - Title: `#fafafa` (industry name in large AgencyFB)
  - Expand button: Lime circle (`#caca20`, 64px)

**Open State (per industry, 1440x1024px):**
- Background: photo + black overlay + blur (24px)
- Close button: Lime circle (`#caca20`, 88px) with teal X (`#115054`)
- Content area with:
  - Industry title (AgencyFB, white, large)
  - Description paragraph (white)
  - Case study cards with subtitles and descriptions
  - Example thumbnail (684x385px) with description overlay
  - Expand icon for examples

**Industry Content:**

**Retail & Ecommerce:**
- Description: "Every customer is unique, but most retailers treat them like statistics. We build AI that creates real personal connections at scale."
- Case studies:
  - "The Beauty Agent That Gets You" - AI beauty consultant
  - "Efficient Asset Production" - AI-powered recoloring for fashion
  - "Smarter Market Insights" - Trend insights for fashion e-tailer
  - "Predictive Audience Modeling" - Synthetic customers for consumer insights

**Finance & Insurance:**
- Description: "Our AI helps you understand risk, serve customers better, and make claims actually work for everyone."
- Case studies:
  - "Campaigns That Think for Themselves" - Real-time campaign intelligence
  - "Intelligent Lead Prioritization" - Enrichment and list-building agents
  - "Agentic Risk Scoring" - Conversational AI for risk mitigation

**Higher Education:**
- Description: "Every student's path is different. We build AI that understands this, creating personalized experiences that help students succeed, not just graduate."
- Case studies:
  - "Making College Work for Students" - AI student journey guidance
  - "Personal Onboarding Assistant" - AI-powered student onboarding
  - "AI Vision & Strategy" - University-wide AI integration roadmap

**Healthcare & Life Sciences:**
- Description: "Our human-centered AI is a natural fit for healthcare and life sciences. We blend deep expertise with advanced capabilities to deliver breakthrough solutions that allow delivery of breakthrough treatments."
- Case studies:
  - "Healthcare That Prevents, Not Just Treats" - Preventive health AI
  - "Immersive Patient Research Lab" - Interactive digital patient understanding
  - "Accelerated Executive Storytelling" - GenAI marketing videos for pharma

---

## 8. Rendered Image URLs

| Node ID | Name | Image URL (2x PNG) |
|---|---|---|
| 302:3658 | TYPE STYLE | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/fa5cf854-38ab-439e-8a87-1b28b0ed64e0 |
| 302:3685 | COLORS | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/5cd4314c-7cf2-41fe-9efe-099512fa3b6c |
| 184:727 | ApproachPanels | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/3aa77451-d885-40d2-aaae-685740dd8e46 |
| 4:597 | HEADER | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/8b3165cd-30ab-493e-a965-ece56178ad54 |
| 14:266 | Buttons | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/6ed79e1c-e3a6-44a8-8723-3582658ce927 |
| 498:1675 | Form Container | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/37979304-7dfd-4377-aeca-99542a05ba83 |
| 163:5990 | Services | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/a3c2cb50-a0d3-4bf1-81f9-1a3212f5aefb |
| 212:1709 | NAVIGATION | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/fc454854-2383-47aa-bd82-fd2e5c9b5b60 |
| 4:987 | INDUSTRIES | https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/7b170af3-b715-4676-b77d-b933b7b6cac7 |

> Note: These URLs are temporary (Figma-generated S3 presigned URLs). Download and save locally for long-term use.

---

## 9. Gradients

No gradient fills were found in the 9 target nodes. All color fills are solid colors. Depth and visual interest is achieved through:
- Layered solid fills with varying opacity
- Background blur effects (frosted glass aesthetic)
- Photo backgrounds with dark overlays
- Semi-transparent teal overlays (`#11505466`)

---

## 10. Design Tokens Summary - CSS Custom Properties

```css
:root {
  /* ========================================
     COLOR TOKENS
     ======================================== */

  /* Brand Colors */
  --color-brand-teal: #115054;
  --color-brand-lime: #caca20;
  --color-brand-teal-40: rgba(17, 80, 84, 0.4);

  /* Neutral Scale */
  --color-black: #000000;
  --color-darkest-gray: #141414;
  --color-dark-gray: #242424;
  --color-med-gray: #3a3a3a;
  --color-gray: #525252;
  --color-label-gray: #acacac;
  --color-light-gray: #eaeaea;
  --color-lightest-gray: #fafafa;
  --color-white: #ffffff;
  --color-white-60: rgba(255, 255, 255, 0.6);

  /* Semantic Colors */
  --color-bg-primary: #141414;
  --color-bg-secondary: #242424;
  --color-bg-accent: #115054;
  --color-bg-cta: #caca20;
  --color-bg-nav: #000000;
  --color-bg-input: #141414;
  --color-bg-form: #242424;
  --color-text-primary: #ffffff;
  --color-text-secondary: #eaeaea;
  --color-text-muted: #fafafa;
  --color-text-on-light: #141414;
  --color-text-on-cta: #115054;
  --color-text-placeholder: #525252;
  --color-text-label: #acacac;
  --color-border-light: #eaeaea;
  --color-linkedin: #2496bd;

  /* ========================================
     TYPOGRAPHY TOKENS
     ======================================== */

  /* Font Families */
  --font-display: 'AgencyFB', 'Impact', 'Haettenschweiler', sans-serif;
  --font-primary: 'Archivo', 'Helvetica Neue', Arial, sans-serif;
  --font-accent: 'Inter', 'Helvetica Neue', Arial, sans-serif;

  /* Font Weights */
  --font-weight-extralight: 200;
  --font-weight-light: 300;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  --font-weight-black: 900;

  /* Font Sizes */
  --font-size-xxxl: 180px;
  --font-size-xxl: 100px;
  --font-size-h1: 72px;
  --font-size-h2: 52px;
  --font-size-h3: 44px;
  --font-size-h3-m: 32px;
  --font-size-h4: 21px;
  --font-size-h4-sm: 18px;
  --font-size-body: 18px;
  --font-size-body-sm: 16px;
  --font-size-input-label: 14px;
  --font-size-caption: 12px;

  /* Line Heights */
  --line-height-xxxl: 180px;
  --line-height-xxl: 100px;
  --line-height-h1: 80px;
  --line-height-h2: 56px;
  --line-height-h3: 60px;
  --line-height-h3-m: 46px;
  --line-height-h4: 40px;
  --line-height-body: 26px;
  --line-height-body-relaxed: 32px;
  --line-height-body-sm: 18px;
  --line-height-input-label: 18px;
  --line-height-caption: 14px;

  /* Letter Spacing */
  --letter-spacing-display: 0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-tight: -0.01em;

  /* ========================================
     SPACING TOKENS
     ======================================== */

  --spacing-xxs: 4px;
  --spacing-xs: 8px;
  --spacing-sm: 10px;
  --spacing-md: 12px;
  --spacing-base: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 64px;
  --spacing-xxl: 72px;
  --spacing-3xl: 112px;

  /* Component-specific spacing */
  --padding-button-v: 16px;
  --padding-button-h: 24px;
  --padding-header: 24px;
  --gap-form-fields: 24px;
  --gap-form-label: 8px;
  --gap-service-areas: 112px;
  --gap-content-blocks: 64px;
  --gap-progress-bar: 24px;
  --gap-button-icon: 10px;
  --gap-inline-tight: 4px;

  /* ========================================
     BORDER RADIUS TOKENS
     ======================================== */

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-circle: 50%;

  /* ========================================
     EFFECT TOKENS
     ======================================== */

  --blur-frosted-lg: 56px;
  --blur-frosted-md: 40px;
  --blur-frosted-sm: 32px;
  --blur-frosted-xs: 24px;

  /* ========================================
     DIMENSION TOKENS
     ======================================== */

  --width-viewport: 1440px;
  --width-content: 920px;
  --width-services-desc: 684px;
  --width-service-areas: 309px;
  --width-form: 448px;
  --width-form-inner: 368px;
  --width-nav-bar: 920px;
  --width-progress-bar: 1392px;

  --height-section: 1056px;
  --height-industry-panel: 1024px;
  --height-industry-bar: 202px;
  --height-header-expanded: 96px;
  --height-header-collapsed: 88px;
  --height-input: 56px;
  --height-button: 48px;
  --height-button-lg: 56px;
  --height-close-button: 88px;
  --height-expand-button: 64px;
  --height-linkedin-button: 40px;
  --height-progress-bar: 1px;
  --height-example-thumb: 385px;

  /* ========================================
     Z-INDEX TOKENS (suggested)
     ======================================== */

  --z-background: 0;
  --z-blur-overlay: 10;
  --z-content: 20;
  --z-frosted: 30;
  --z-header: 40;
  --z-form-panel: 50;
  --z-close-button: 60;
}
```

### Tailwind CSS Configuration Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#115054',
          lime: '#caca20',
          'teal-40': 'rgba(17, 80, 84, 0.4)',
        },
        gray: {
          darkest: '#141414',
          dark: '#242424',
          med: '#3a3a3a',
          DEFAULT: '#525252',
          label: '#acacac',
          light: '#eaeaea',
          lightest: '#fafafa',
        },
        linkedin: '#2496bd',
      },
      fontFamily: {
        display: ['AgencyFB', 'Impact', 'Haettenschweiler', 'sans-serif'],
        primary: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'],
        accent: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xxxl': ['180px', { lineHeight: '180px', letterSpacing: '1.8px' }],
        'xxl': ['100px', { lineHeight: '100px', letterSpacing: '1.0px' }],
        'h1': ['72px', { lineHeight: '80px' }],
        'h2': ['52px', { lineHeight: '56px' }],
        'h3': ['44px', { lineHeight: '60px' }],
        'h3-m': ['32px', { lineHeight: '46px' }],
        'h4': ['21px', { lineHeight: '40px' }],
        'h4-sm': ['18px', { lineHeight: '26px' }],
        'body': ['18px', { lineHeight: '26px' }],
        'body-relaxed': ['18px', { lineHeight: '32px' }],
        'body-sm': ['16px', { lineHeight: '18px' }],
        'input-label': ['14px', { lineHeight: '18px' }],
        'caption': ['12px', { lineHeight: '14px' }],
      },
      fontWeight: {
        extralight: '200',
        light: '300',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      spacing: {
        '4.5': '18px',
        '15': '60px',
        '18': '72px',
        '28': '112px',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
      },
      backdropBlur: {
        'frosted-xs': '24px',
        'frosted-sm': '32px',
        'frosted-md': '40px',
        'frosted-lg': '56px',
      },
      width: {
        'viewport': '1440px',
        'content': '920px',
        'services-desc': '684px',
        'service-areas': '309px',
        'form': '448px',
        'form-inner': '368px',
        'nav-bar': '920px',
      },
      height: {
        'section': '1056px',
        'industry': '1024px',
        'industry-bar': '202px',
        'header': '96px',
        'header-sm': '88px',
        'input': '56px',
        'button': '48px',
        'button-lg': '56px',
        'close': '88px',
        'expand': '64px',
      },
    },
  },
}
```

---

## 11. Icon Inventory

| Icon | Size | Context | Color |
|---|---|---|---|
| Plus Icon | 16x16 | AI-Form button, "Ask Us Anything" | `#115054` on lime bg |
| Arrow Top Right | 24x24 | "Contact Us" button | `#115054` on lime bg |
| Expand arrows | 26x26 (in 40px frame) | Expand button, case study thumbnails | Teal on lime |
| Close X (boolean union) | 32x32 (in 88px circle) | Close buttons on panels/forms | Varies by variant |
| LinkedIn | 18x18 (in 24px frame) | Social link | `#3a3a3a` or `#ffffff` |
| Calendar | 24x24 | "Book a meeting" | `#caca20` |
| Forward arrow (iOS) | ~12x20 | "Book a meeting" chevron | `#caca20` |
| NXT HUMANS wordmark | ~169x44 | Header nav bar | `#ffffff` |

---

## 12. Interaction States Summary

### Buttons
| Component | Default | Hover |
|---|---|---|
| Square CTA (primary) | bg: `#caca20`, text: `#115054` | (implied inverse or darker) |
| Square CTA (dark) | bg: `#3a3a3a`, text: `#eaeaea` | bg: `#242424`, text: `#eaeaea` |
| Close (Gray) | bg: `#3a3a3a`, icon: `#eaeaea` | bg: `#115054`, icon: `#caca20` |
| Close (Lime) | bg: `#caca20`, icon: `#115054` | bg: `#115054`, icon: `#caca20` |
| LinkedIn | bg: `#ffffff`, icon: `#3a3a3a` | bg: `#2496bd`, icon: `#ffffff` |
| AI-Form | bg: `#caca20`, text: `#115054` | Expands to search panel |
| Nav suggestion | bg: `#ffffff`, text: `#141414` | bg: `#eaeaea`, text: `#141414` |

### Industry Panels
| State | Background | Title Color | Extra Elements |
|---|---|---|---|
| Default | `#caca20` (lime) | `#242424` | Stacked bars with `#000000` bg |
| Hover | Photo background | `#fafafa` | Expand button, `#141414` bar |
| Open | Photo + blur overlay | `#ffffff` | Close button, content, examples |

### Progress Bar
| State | Bar Color | Text Color |
|---|---|---|
| Active | `#ffffff` (1px) | `#ffffff` |
| Inactive | `#fafafa` (1px) | `#fafafa` |

---

## 13. Logo Variants

Available in the EPS LOGOS page:
| Variant | ID | Description |
|---|---|---|
| WHITE | 534:1131 | White wordmark on transparent |
| LIME | 534:1152 | Lime/neon green wordmark |
| TEAL | 534:1162 | Teal wordmark |
| BLACK | 534:1142 | Black wordmark |

The logo is the "NXT HUMANS" wordmark composed of 9 vector paths forming the letterforms.

---

## 14. Responsive Breakpoints

From the design file frames:
| Breakpoint | Width | Frame Reference |
|---|---|---|
| Desktop | 1920px | Frame "1920" (420:1371) |
| Desktop (primary) | 1440px | All main components designed at this width |
| Mobile | 393px | Frame "393" (420:1415) |

### Mobile Adaptations Observed
- H1: remains 72px (same as desktop)
- H2: remains 52px (same as desktop)
- H3: reduces from 44px to 32px
- Subtitle: reduces from 44/60 to 32/46
- AgencyFB display: reduces from 180px to 100px

---

*This design system document was extracted programmatically from the Figma REST API and contains every color, typography specification, spacing value, effect, and component structure found in the 9 target design screens. Use this as the single source of truth for pixel-perfect React + TailwindCSS implementation.*
