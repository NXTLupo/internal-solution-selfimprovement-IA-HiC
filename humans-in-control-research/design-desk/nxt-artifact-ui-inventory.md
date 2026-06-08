# NXT Artifact UI Element Inventory (Step a)

Authoritative inventory of every UI element needed across all 18 `#NXT` deliverables, atomized
into a reusable component library. Drives Step (b): build each module in the design system
(stark-white, flat, minimal, dark-text-on-white, WCAG AA, correct NXT HUMANS wordmark, working
interactions). Source: review of generated artifacts (2026-05-30 screenshots) + JM render contracts.

## Systemic defects this inventory must fix (from review)
- D1 DARK-ON-DARK: artifacts render near-black panels/tiles with dark text (research-plan,
  recommendation, meta-themes cards, tech-audit table header, mindmap tiles, strategy, gap). FAIL.
- D2 DEAD TABS: tab bars rendered with no working JS (arch, tech-audit, org, meta-themes, persona).
- D3 WRONG LOGO: a tiny "N NXT" box instead of the real NXT HUMANS wordmark.
- D4 BANNED CHROME leaking: "Plan Hash", "Version 1.0", "HUMAN CHECKPOINT", "4 Selected from 8",
  "Verbalized Sampling + Cooper Hierarchy", "#meta-themes v1.0".
- D5 CONTENT FAILS: competitive has NO named competitors; org chart missing the actual chart;
  persona is AI-slop with no real persona substance; PRD is not a PRD (no user stories/requirements).
- D6 OLD BRAND: contracts still name Bebas Neue + #B8B800 + #0D0D0D; must move to the 2026 brand
  (Agency FB/Saira Condensed display + Archivo ExtraLight/Light, teal #115054, lime #CACA20, ink #141414).

## Global rules for ALL modules
- Page surface WHITE (#FFFFFF) on near-white canvas (#FAFAFA). Cards WHITE, 1px #EAEAEA border, 2px radius, no shadow.
- Body ink #141414; muted #3A3A3A (never lighter than #5A5A52 on white). Headings ink or teal #115054.
- Color-block sections (teal/lime/near-black) are INTENTIONAL and rare; on them 100% of text is white/black with AA contrast (lime block = black text; teal/dark block = white text).
- Display = Saira Condensed (Agency FB fallback) caps; headings = Archivo ExtraLight/Light; labels = Archivo Medium / JetBrains Mono.
- No emoji, no em-dash, no metadata chrome, no self-referential language.

## A. SHARED ATOMS (used by most/all artifacts)
1. `nxt-logo` — real NXT HUMANS wordmark (inline SVG, condensed black caps), 3 sizes, on-white + on-dark variants.
2. `nxt-masthead` — thin top bar: logo left, optional artifact label right. ONE per doc. Light by default.
3. `nxt-tabs` — working tab nav (`[data-tab]` buttons + `[data-panel]` panels) + delegated JS; active = teal underline/lime tick. (fixes D2)
4. `nxt-hero` — action-title (Archivo ExtraLight, large) + one standfirst paragraph. No eyebrow metadata strip.
5. `nxt-eyebrow` — section label, Saira caps or mono, teal, letter-spaced.
6. `nxt-h2` section heading / `nxt-h3` sub-heading.
7. `nxt-prose` — body paragraph block.
8. `nxt-card` — white tile, 1px border (the universal container; replaces all dark tiles). (fixes D1)
9. `nxt-tile-grid` — responsive grid wrapper (2/3/4 col).
10. `nxt-stat` — metric tile (opt-in only): figure + mandatory source line.
11. `nxt-quote` — pull quote, large, with `cite` source line.
12. `nxt-chip` — variants: `--source` (citation), `--status` (LEGACY/HIGH/CONVERGENT), `--accent`. All AA-contrast.
13. `nxt-block` — full-bleed color-block section: `--teal` / `--lime` / `--ink`, with enforced text color.
14. `nxt-table` — data table: LIGHT header (#F5F5F0, ink text — NOT a black bar), 1px row rules, zebra optional. (fixes D1 tech-audit)
15. `nxt-source-index` — white section listing named sources.
16. `nxt-footer` — wordmark + artifact name, light.
17. `nxt-icon` — flat 1.5px line icons (geometric), currentColor; NO 3D/gradient/AI-slop icons. (fixes persona slop)
18. `nxt-rule` — 1px hairline divider (#EAEAEA).
19. `nxt-sidebar-layout` — left meta rail + main content (arch, persona, meta-themes). Rail LIGHT, dark text (or one intentional dark rail with all-white text).

## B. ARTIFACT-SPECIFIC MODULES
- journey: `nxt-timeline` (horizontal), `nxt-phase-card` (activities, pain w/ severity+frequency, emotion label, touchpoint, 2-3 verbatim quotes), overall pains + opportunities lists.
- blueprint: `nxt-swimlane` CSS-grid (rows=layers, cols=steps), line-of-visibility / line-of-internal-interaction divider rows, `nxt-failpoint` marker.
- competitive: `nxt-matrix` (rows=4-7 REAL NAMED players from corpus, cols=4-6 dimensions), `nxt-strength` marker (leader/parity/gap by intensity, not red/green), positioning read, white-space list. (fixes D5)
- arch (tech-architecture): `nxt-layer-band` stacked bands + `nxt-component-card`, integration points, risks; tabs. (fixes D2)
- personas: `nxt-persona-card` (name, archetype, goals, frustrations, context, ONE verbatim quote, monogram avatar — no slop icon), `nxt-roster`. (fixes D5)
- prd: `nxt-userstory` ("As a <role> I want <capability> so that <outcome>"), `nxt-req-table` (requirement, priority, acceptance criteria), epics. REAL PRD. (fixes D5, re-check prd skill)
- roadmap: `nxt-horizon` columns (Now/Next/Later) + item card w/ success metric + named baseline + timeframe.
- gap-analysis: `nxt-gap-matrix` (current vs target), `nxt-gap-row` (named system/team + operational consequence).
- tech-audit: `nxt-table` systems inventory, integration map, capability matrix, consolidation actions; working tabs; a system diagram. (fixes D1/D2)
- org: `nxt-orgtree` real hierarchy (CSS-grid boxes + collision-free connectors) — MUST render the chart. (fixes D5)
- strategy: `nxt-kernel` (diagnosis / guiding policy / coherent actions), strategy cards.
- recommendation: `nxt-rec-card` prioritized (impact chip + rationale + evidence).
- mindmap: `nxt-mindmap` central + branches, `nxt-callout` LIGHT tiles dark text. (fixes D1)
- brief / brief-dialog: `nxt-dialog` (light Q/A bubbles, dark text), brief summary. (fixes D1)
- meta-themes: `nxt-theme-card` (convergent/divergent), executive synthesis, cross-engagement patterns. (fixes D1)
- research-plan: `nxt-question-row`, source-strategy tiles, execution-param tiles (light). (fixes D1)
- presentation (#slide / #slides): `nxt-slide` frames — title, section-divider, content, stat, quote, matrix, closing — SUMMARIZED density. (Step c CRITICAL)

## C. INFOGRAPHIC PRIMITIVES (for tech-audit, arch, gap, strategy, mindmap, slides)
- `nxt-process` — horizontal numbered step flow (1->2->3->4) with connectors.
- `nxt-quadrant` — 2x2 matrix with X/Y axis labels (positioning, prioritization).
- `nxt-bars` — horizontal labeled maturity/progress bars (capability, readiness).
- `nxt-donut` — CSS conic-gradient donut + legend (composition share, qualitative).
- `nxt-funnel` — stacked decreasing-width bands (pipeline, conversion stages).
- `nxt-tiers` — stacked widening tier rows (pyramid / maturity model).
- `nxt-iconstat` — flat icon + figure + label (KPI with meaning).
- `nxt-compare` — two-column before/after or A vs B with center divider.
- `nxt-numlist` — big-number ordered list items.

## D. TECH-DIAGRAM PRIMITIVES (collision-free; CSS, never absolute SVG nodes)
- `nxt-flow` — horizontal boxes joined by arrow connectors (pipeline / data flow).
- `nxt-hub` — central node + spoke nodes (hub-and-spoke / integration map).
- `nxt-stack` — vertical layered stack bands (already: nxt-layer for arch).
- All connectors terminate at box edges; 16px exclusion; no line through a node.

## E. ICON SET (flat 1.5px line, currentColor, SVG sprite)
user, team, building, data, gear, network, chart, search, target, flow, shield,
lightbulb, calendar, doc, chat, arrow, check, layers, clock, alert. No 3D/gradient/AI-slop icons.

## F. SLIDE LIBRARY (#slides — full deck variety, summarized density)
title, agenda/contents, section-divider, simple-content, bullet/list, two-column,
case-study (problem/approach/outcome), table, infographic, pull-quote, image, split-image,
kpi/metrics, comparison, closing/CTA. Each 16:9, one idea per slide, logo lockup, AA contrast.

## Build order (Step b)
tokens+logo -> masthead/tabs/hero -> cards/tiles/chips/quote/table -> color-blocks -> icons ->
artifact-specific modules -> slide frames. Each module rendered in `style-guide.html` for review BEFORE applying to artifacts (Step c).
