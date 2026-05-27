# NU Artifact Refactor Pattern

**Working reference for migrating HiC slide renderers (`web.tsx`) from bespoke inline-styled JSX to the shared NU design system primitives (`artifacts.css`).**

Created: 2026-05-23
Bundle source: `public/nu-design-gallery/` (handoff from claude.ai/design)
Spec: [`public/nu-design-gallery/GUIDE.md`](../../public/nu-design-gallery/GUIDE.md)

---

## Status

| Template | Status | Notes |
|---|---|---|
| `stat-row` (`StatRowSlide`) | ✅ Refactored | Pattern reference — direct 1:1 to `.stat-strip`; convergent-insight card |
| `principles` (`PrinciplesSlide`) | ✅ Refactored | Vertical list with Spectral display numbers + `.art-finding--sm` |
| `persona-card` (`PersonaCardSlide`) | ✅ Refactored | Two-column with verbatim quote, JTBD, Cooper goals, pain/motivation rows |
| `recommendation` (`RecommendationSlide`) | ✅ Refactored | Action title + brand-red rule, numbered supporting actions, impact panel (grid / hero / image) |
| `block-quote` (`BlockQuoteSlide`) | ✅ Refactored | `.pq` pull-quote with brand-red rule, corroborating-data sidebar, implication line |
| `section-divider` (`SectionDividerFullBleed`) | ✅ Refactored | Full-bleed ink-900 with ghost Spectral number, brand-red rule, Spectral title |
| `case-study` (`CaseStudySlide`) | ✅ Refactored | Challenge/Approach/Outcome stripes + ink-900 dashboard panel |
| `theme-cluster` (`ThemeClusterSlide`) | ✅ Refactored | Equal columns; primary theme gets brand-red top accent |
| `theme-spotlight` (`ThemeSpotlightSlide`) | ✅ Refactored | Hero + supporting signals; pattern callout in `.art-card` |
| `theme-arc` (`ThemeArcSlide`) | ✅ Refactored | Sequential chain with ink-700 connector arrows |
| `theme-mosaic` (`ThemeMosaicSlide`) | ✅ Refactored | 2×2 ivory grid; primary cell has brand-red top accent |
| `competitive-matrix` (`CompetitiveMatrixSlide`) | ✅ Refactored | `.dtable--compact` with NU subject row shading + brand-red left border |
| `timeline` (`TimelineSlide`) | ✅ Refactored | `.horizon`-style columns with ringed-dot phase markers |
| `gap-matrix` (`GapMatrixSlide`) | ✅ Refactored | `.matbar__track`/`__current`/`__target` + `.pill--error/--warning/--special` |
| `architecture-map` (`ArchitectureMapSlide`) | ✅ Refactored | C4 stacked layers; nodes are `.art-card` with type-colored left border |
| `prd-feature` (`PrdFeatureSlide`) | ✅ Refactored | DEEP + COMPACT modes; priority pills; must=brand-red, others ink-700 |
| `systems-inventory` (`SystemsInventorySlide`) | ✅ Refactored | `.dtable--compact` + status/risk `.pill` variants |
| `service-blueprint` (`ServiceBlueprintSlide`) | ✅ Refactored | Bitner 5 lanes; customer lane brand-red highlight; fail-points row with brand-red top border; emotion → signal dots |

**18 of 18 refactored.** PPTX exporters in `pptx.ts` are NOT being refactored — they draw shapes from data, not CSS classes, so they remain unchanged. **HTML and PPTX outputs will visually diverge until the exporters get a separate pass.**

---

## The pattern

Every refactored renderer follows this skeleton:

```tsx
export const FooSlide: React.FC<Props> = ({ title, data, sources = [], brand }) => {
    return (
        <div
            className="nu-artifact-stage nu-artifact-stage--slide"
            data-brand={brand || 'nu'}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <header className="art-masthead" style={{ paddingBottom: 12 }}>
                <div className="art-masthead__center" style={{ flex: 1, minWidth: 0 }}>
                    <div className="art-masthead__kicker">{kicker}</div>
                    <h1 className="art-masthead__title">{title}</h1>
                </div>
            </header>
            <div style={{ flex: 1, padding: '0 28px', /* artifact-specific body layout */ }}>
                {/* Compose ONLY from .art-card, .stat-strip, .dtable, .pill, .signal, .matbar, .pq */}
            </div>
            <SourceFooter sources={sources} brand={brand} />
        </div>
    );
};
```

### Rules

1. **Wrap in `.nu-artifact-stage nu-artifact-stage--slide`.** The first class applies the body-reset rules (font-family, color, tabular figures) scoped to the slide; the second class shrinks type + spacing for the 960×540 stage. Without `--slide`, the artifact renders at document scale (1320px-wide) and overflows.

2. **Use only NU primitives for layout.** No more bespoke inline `display: flex` constructs styled with token hex codes. The vocabulary:
   - `.art-masthead` + `__kicker` + `__title` + `__meta-block` — top band
   - `.stat-strip` + `.stat` + `.stat__label` + `.stat__value` + `.stat__delta--up|--down` — KPI row
   - `.art-card` (variants: `--pad-lg`, `--ink`, `--accent`) — generic surface
   - `.art-finding` (variants: `--lg`, `--sm`) — sentence-case finding heading
   - `.art-eyebrow` — small uppercase label above a finding
   - `.dtable` (variants: `--compact`, `--sticky`) — dense data table
   - `.pill` (variants: `--success`, `--warning`, `--error`, `--progress`, `--special`, `--brand`, `--ink`, `--outline`, `--lg`) — status badges
   - `.signal` (variants: `--green`, `--yellow`, `--red`, `--blue`, `--neutral`) — status dot
   - `.matbar` + `__track` + `__current` + `__target` — maturity bar (current → target)
   - `.cite` + `.cite-chip` — citation chips (inline `<sup>` + named pill)
   - `.pq` — pull-quote with brand-red left rule
   - `.art-footer` — source index footer

3. **Token references only.** Use `var(--*)` everywhere. The full inventory is in [`GUIDE.md` §3](../../public/nu-design-gallery/GUIDE.md#3-token-map---whats-safe-to-reference). Never hard-code a hex value or font size — the answer is almost always that the token already exists under a different name.

4. **The thirteen don'ts apply.** See [`GUIDE.md` §9](../../public/nu-design-gallery/GUIDE.md#9-the-thirteen-donts). No methodology blurbs in any artifact, no `<span class="num">X-01 · status</span>` decorative metadata above headings, no "EVIDENCE GAP" / "TBD" / `[needs baseline]` annotations, no per-slide source footer strips (citations are inline chips; one consolidated index at the foot via `SourceFooter`), no catastrophizing verbs (use "needs attention" not "at risk"), no hype.

5. **Brand red is a scalpel.** `--nu-red-600` marks ONE verbatim quote per page, critical gaps, target maturity. It is never a divider, never a fill, never decoration. The everyday "primary" UI color is `--ink-900` (`--fg-strong`).

6. **PPTX exporter stays separate.** When you refactor a renderer, do NOT touch the matching exporter in `pptx.ts`. The exporter draws shapes from the same `data` object using pptxgenjs primitives; it doesn't consume CSS. Web and PPTX paths intentionally diverge.

---

## Visual QA helper

A dev-only window function is installed at app boot for visually verifying a refactor without running the full pipeline. Open DevTools → Console:

```js
__hicRenderSlide('persona-card', {
    name: 'Maya Rodriguez',
    role: 'Co-op coordinator · Khoury College',
    demographics: '34 · Boston metro',
    quote: 'I lose half my Monday reading PDFs that the system could have summarized.',
    jtbd: 'When students stall in the co-op funnel, I want to surface the reason so I can intervene before week three.',
    goals: {
        lifeGoal: 'Be known as the advisor who keeps first-gen students on track.',
        experienceGoal: 'Confident, never blindsided, by mid-cycle status.',
        functionalGoal: 'Generate cohort signals in under 10 minutes.',
    },
    painPoints: [
        { label: 'Manual PDF reading', quote: '4 hours per week reconciling status across PDFs', source: 'Maya R., MGO interview 2026-Q1' },
        { label: 'Stale dashboards', quote: 'By the time the dashboard updates, the opportunity has passed', source: 'Cohort interview' },
    ],
    motivations: [
        { label: 'First-gen advocacy', quote: 'I was a first-gen student. I want them to feel less alone.', source: 'Maya R., MGO interview' },
        { label: 'Pattern recognition', quote: 'I notice stalls early — I just don\'t have the data to act on them.', source: 'Maya R., MGO interview' },
    ],
}, { hasImage: false });

// Or render with a 4-stat stat-row:
__hicRenderSlide('stat-row', {
    stats: [
        { value: '11 days', label: 'Placement lag', source: 'NU OIR 2026-Q1', meaning: 'Average time from interview to offer accepted', matters: 'Drexel benchmark is 5 days; gap costs 38% of stalled students.' },
        { value: '38%', label: 'Stalled at week 3', source: 'Co-op funnel telemetry', meaning: 'Students inactive in the prep track for 14+ days', matters: 'Each week of inactivity lowers placement rate by 11%.' },
        { value: '$78K', label: 'Median offer', source: 'First Destinations 2024', meaning: 'AY24-25 graduates with confirmed offers' },
        { value: '94%', label: 'Placement rate', source: 'IPEDS 2025', meaning: 'Employed or in graduate study within 9 months' },
    ],
    convergentInsight: 'Three of four signals show NU is on pace with peers, but the funnel-stall signal (38% at week 3) costs us the offers we should be landing. Closing this gap is the single highest-leverage move available.',
    patternSignal: 'Drexel and Cincinnati both fire intervention templates at day 5 of inactivity; NU waits until day 14.',
}, { title: 'Northeastern is on pace overall, but week-3 stalls cost a third of placements.' });

// Clear:
__hicClearSlide();
```

The slide mounts at top-left in a 960×540 frame with white background, so it visually matches the production canvas. PNG screenshots via DevTools are sufficient for review.

---

## Migration checklist (per template)

When refactoring a new template:

- [ ] Read the corresponding NU exemplar HTML in `public/nu-design-gallery/artifacts/{name}.html` to understand the target structure.
- [ ] Read the matching anatomy section in `GUIDE.md` §6 to learn which primitive classes are intended.
- [ ] Replace the renderer body. Wrap in `.nu-artifact-stage nu-artifact-stage--slide`. Keep the `SourceFooter` call at the bottom.
- [ ] Drop ALL inline `hex(T.*)` color references — use `var(--*)` tokens instead. Drop `T = resolveT(brand)`.
- [ ] Drop the `Tag` and `Title` helper imports if no longer used.
- [ ] Run `npx tsc --noEmit` to verify clean typecheck at project level.
- [ ] Rebuild Docker (`docker compose -f docker-compose-all.yml up -d --build research-generator`).
- [ ] Open DevTools and call `__hicRenderSlide('<template>', mockData)`. Visually verify against the NU exemplar at `/nu-design-gallery/artifacts/{name}.html`.
- [ ] Mark the template ✅ in the status table above.

---

## What changed structurally

**Before:** every renderer had ~50-150 lines of inline-styled JSX, each constructing its own flex layout with hard-coded hex colors, font sizes, padding values, and font-family strings (`fontFamily: ` `'${T.FONT}', sans-serif`).

**After:** every renderer uses ~30-80 lines of JSX, composed entirely of NU primitive class names. Token references via `var(--*)`. Brand variations happen via the `data-brand` attribute on the stage wrapper — NXT vs NU tokens can be swapped by remapping the CSS variables at the brand scope (next step, not yet wired).

**Why this is better:**
- Single source of truth for design decisions (the CSS file, not 18 React components)
- Visual changes propagate via CSS, not per-renderer code edits
- Future brand additions (e.g. another institution) only need a token re-mapping, not 18 code rewrites
- Renderers become declarative ("what content goes where") instead of imperative ("how to lay it out")
- Easier to maintain consistency across artifacts — primitives enforce density, type scale, color usage

---

## Known limitations

1. **PPTX exporter divergence will grow.** As we refactor renderers, the visual output of HTML and PPTX will drift unless we ALSO update the PPTX exporters. The PPTX exporter currently draws shapes/text at coordinates matching the OLD inline-styled JSX. A separate pass is needed to update the exporter geometry to match the new NU primitive layout. **Until that pass lands, PPTX exports for refactored templates will look different from the HTML preview.**

2. **Slide-stage scaling.** The NU primitives are designed for ~1320px-wide documents. The `nu-artifact-stage--slide` override tightens type + spacing for the 960×540 stage, but some complex artifacts (service-blueprint, competitive-matrix) may need additional per-template overrides to fit cleanly.

3. **Image-mode persona cards.** The old `PersonaCardSlide` had an `hasImage` prop that compressed the layout when a portrait image was rendered alongside. The refactored version uses the same prop to switch column count (2 → 1) but doesn't render the image itself — image rendering happens in `SlideShell` / external chrome.

4. **Mock data fidelity.** The `__hicRenderSlide` dev helper currently supports only the 3 refactored templates. Extend the `renderers` map in `App.tsx` as more templates are refactored.
