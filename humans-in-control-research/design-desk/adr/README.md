# Architecture Decision Records - HiC design system

Settled design arguments. Read before proposing an alternative; do not reopen one without a
superseding ADR. Format: one file per decision, `ADR-NNNN-slug.md`, with Status / Context /
Decision / Consequences. Seeded 2026-08-07 (plan item D1(b)) by back-filling decisions that
previously lived only in memory, plans, and CLAUDE.md prose.

| ADR | Decision | Status |
|---|---|---|
| 0001 | Method A: compose deliverables from registered Figma bricks + tokens at generation time; never hardcoded; the SPA never calls Figma live | Accepted 2026-06-16 (backfilled) |
| 0002 | NU is a MODE (535:0) of the single NXT library `iSQhAVM7SI4QHAWB7y9C2z`; brand = token mode flip, never a second file; App/Brand marks intentionally unthemed | Accepted 2026-06-15 (backfilled) |
| 0003 | D17: journey/arch/mindmap/blueprint exhibits are NATIVE renders (HTML/CSS -> Chromium via nxt_diagram_render), NEVER image-gen | Accepted 2026-07-01 (backfilled) |
| 0004 | Em-dash hard ban in all rendered output; ASCII hyphens untouched; enforced at slidePostProcessor | Accepted 2026-05-25 (backfilled) |
| 0005 | NXT display face = Saira Condensed SemiBold (Bebas Neue dropped); NU = single-typeface Lato | Accepted 2026-06-13 (backfilled) |
| 0006 | Icons are content-true or absent (isContentTrueIcon gate); no decorative icon fill | Accepted 2026-06-27 (backfilled) |
| 0007 | ONE tiered library: the existing `iSQhAVM7SI4QHAWB7y9C2z` is restructured into foundation / DS components / exemplars pages; no new Figma files | Accepted 2026-08-07 (owner decision 9) |
| 0008 | Foundation-tier token ownership: Jonathan owns token edits; all others read-only; agent proposals only via the D6 gated sync diff | Accepted 2026-08-07 (owner decision 11) |
| 0009 | Brick API freeze + promotion rule (>=2 contexts AND >=2 primitives or product structure); additive-only for non-owners; unfreeze requires an ADR | Accepted 2026-08-07 (plan item D1/D2) |

Backfilled ADR bodies live in this directory as they are written; until then the memory/plan
citations above are authoritative. New decisions from D4 G3 reviews are appended here the day
they are made.
