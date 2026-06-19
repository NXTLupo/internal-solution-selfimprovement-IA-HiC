# SLIDES chrome + logo brick (shared by every archetype)

The chrome is a registry brick the composer instantiates once per slide — NOT hand-coded per
renderer. Every SLIDES archetype (609:2-609:15) sits on this frame. Tokens resolve from
`/api/design-tokens?brand=NXT|NU` (figma-tokens.json), brand = a mode flip (NXT 221:0 / NU 535:0).

## Frame geometry (SLIDES system, deck-native chrome)
- Canvas 1920x1080.
- Content rail: SLIDES system = **128px** left rail (distinct from the GOLD artifact 92px rail).
  Content band 172 -> 1832 (1660 wide, 80px right margin). 12-col rail-offset grid.
- 3x3 accent dot-mark, bottom-left of the rail (12px squares, 6px gap).
- Masthead logo: top-right (see Logo brick).
- Takeaway band: full-width dark band at the foot, one bold accent phrase (`color/on-accent` text).
- Type: Archivo-dominant headlines (NXT) / Lato (NU); kicker IBM Plex Mono (NXT) / Lato (NU).

## Token bindings (per region; values flip by mode)
| region | token | NXT | NU |
|---|---|---|---|
| rail / dark chrome | `color/rail` | #0D0D0D | #0E1626 |
| accent (dot-mark, takeaway band, one emphasis) | `color/accent` | #B8B800 | #C8102E |
| kicker / cool | `color/cyan` | #00B7C3 | #1D6E64 |
| title / body ink | `color/ink` | #141414 | #16233C |
| takeaway TEXT on the accent/dark band | `color/on-accent` | #0D0D0D (black) | #FFFFFF (white) |
| headline face | `font/display` / `font/title` | Saira Condensed / Archivo | Lato |
| kicker face | `font/mono` | IBM Plex Mono | Lato |

## Logo brick (the user's explicit defect — must come from the registry, never typeset fallback)
The masthead logo is the `Brand/Logo · masthead` component **619:2** (NXT wordmark <- `brand/is-nxt`,
red-N monogram <- `brand/is-nu`). It is fully defined in the registry `logo` token (figma-tokens.json):
- **NXT** `logo`: `{ type: "wordmark", wordmark: "NXT HUMANS", font: "Saira Condensed", weight: 600,
  letter_spacing: "1px" }` — there is NO vector; the NXT mark is the wordmark TYPESET in the display
  face. Render "NXT HUMANS" in `font/display` (Saira Condensed SemiBold, tracking 1px, uppercase),
  `color/ink` on light. NEVER a chartreuse square / letter-in-a-box.
- **NU** `logo`: `{ monogram: "<svg viewBox='0 0 64 53' …fill=#C8102E…>" }` — the EXACT red-N vector
  (Figma node 25:5). Render the monogram SVG ALONE at height ~26px; do NOT append a "NORTHEASTERN"
  text wordmark next to it (the 619:2 NU instance is the monogram).

RULE (fixes the live defect): the composer pulls the logo from the registry `logo` token, hydrated to
`BRAND_LOGO_SVG` (= `logo.monogram`) and `BRAND_LOGO_WORDMARK` (= `logo.wordmark`) in
`types.ts::hydrateTokensFromFigma`. The masthead renders: `BRAND_LOGO_SVG` if present (NU red-N,
alone) ELSE `BRAND_LOGO_WORDMARK` in `font/display`. The hardcoded `'NORTHEASTERN'`/`'NXT HUMANS'`
literal fallback in `slideToStageHtml.ts` (and the stray wordmark span appended beside the NU
monogram) is the bug: it bypasses the registry. The composer must use ONLY the token; a brand-name
text fallback fires only if the registry `logo` token is entirely absent (degraded mode, logged).

## Composer contract
The generic slide composer instantiates this chrome + logo brick around every archetype body, binding
all values from the mode tokens — no per-archetype chrome code, no hardcoded hex/font/logo. This is
the shared frame referenced by every archetype section in the SLIDES-archetype manifest.
