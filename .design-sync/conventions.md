# NXT Design System - build conventions

## Setup: none required

Components are self-styling. No provider or theme wrapper exists: import from the bundle and render. `styles.css` carries every design token as CSS variables plus the compiled component styles and the brand fonts (Saira Condensed, Archivo, IBM Plex Mono ship with the bundle).

**Brand mode**: NXT (chartreuse accent, black on accent) is the default on `:root`. Northeastern mode is a token flip, never a re-style: set `data-brand="NU"` on any container and every token inside resolves to NU (red accent, WHITE on accent, single-typeface Lato). Never hand-pick "NU-looking" colors; flip the attribute.

## Styling idiom: Tailwind classes bound to the token variables

Style your own layout glue with these exact class families - each resolves through a `var(--...)` token, so both brand modes work automatically. Never write literal hex colors, font names, or px type sizes.

| family | classes |
|---|---|
| brand colors | `bg-rail` `bg-ink` `bg-brand-accent` `bg-teal` `bg-ecru` `bg-paper` + the same names with `text-` and `border-`; `text-on-brand-accent` (text ON the accent), `text-cyan` (links/kickers), `text-rust` (warnings), `text-grey` (secondary text), `border-hairline` (rules/dividers), `text-success` |
| semantic (shadcn) | `bg-background` `text-foreground` `bg-primary` `text-primary-foreground` `bg-secondary` `bg-muted` `text-muted-foreground` `bg-accent` `bg-destructive` `text-destructive-foreground` `border-border` `bg-card` |
| type faces | `font-display` (Saira Condensed - hero/display lines only) `font-title` (Archivo 600 - headings, buttons) `font-body` (Archivo - prose) `font-mono` (IBM Plex Mono - kickers, labels, code) |
| type sizes | `text-nano` (11px labels) `text-micro` (13px UI text) `text-label` (17px) `text-caption` (18px) `text-kicker` (22px) |
| radius | `rounded-sm` (3px - the brand base) `rounded-md` `rounded-lg`; the system is sharp - never larger decorative radii |

House style: paper surfaces with hairline borders, ONE chartreuse accent emphasis per view, mono uppercase kickers in grey or cyan, dark `bg-rail` reserved for navigation shells and code. Raw variables (`var(--color-accent)`, `var(--font-display)`, `var(--type-scale-nano)`) are available where a class does not fit (inline SVG fills).

## Where the truth lives

Read before styling: `styles.css` (token values for both modes at the top; component classes below via its imports) and `fonts/fonts.css`. Per component: `components/<group>/<Name>/<Name>.d.ts` is the props contract, `<Name>.prompt.md` the usage reference. The `proto` group holds the 66 composed patterns (nav, chat, forms, data, charts, marketing); `general` holds the primitives they compose from - prefer a `proto` pattern when one fits, drop to primitives for custom compositions.

## Idiomatic page

```tsx
import { NavBar, Hero, StatRow, Stat, Cite } from 'nxt-proto-ds';

<div className="bg-paper min-h-screen">
  <NavBar brand="Farm Risk Ready" links={[{ label: 'Overview', active: true }, { label: 'Risk score' }]} cta="Check my risk" />
  <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
    <Hero headline="Know your farm risk before the season does"
          sub="Flood, drought, and input exposure for your county."
          cta="Check my farm risk" secondaryCta="View sample report" />
    <span className="font-mono text-nano uppercase tracking-widest text-grey">The numbers</span>
    <StatRow>
      <Stat label="Agricultural losses" value="$3.8T" sub="over three decades" />
      <Stat label="Drought probability" value=">50%" sub="highest-risk regions" />
    </StatRow>
  </main>
</div>
```

Charts (`BarChart`, `LineChart`, `PieChart`, ...) take real data arrays and render token-colored native SVG - never use an external chart library with this system.
