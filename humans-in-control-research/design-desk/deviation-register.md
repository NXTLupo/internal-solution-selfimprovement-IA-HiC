# Deviation register - HiC design system

Deviating from a design law (`hic-workspace/wiki/brand/design-laws.md`) is allowed; silently
deviating is not. Every lint FLAG (from `hic-design-lint` or the D3(b) export audit) is either
fixed or gets a row here BEFORE the surface ships or the brick promotes.

Format: date · surface/brick · law # · what deviates · why · approved by · until/condition.

| Date | Where | Law | Deviation | Why | Approved | Until |
|---|---|---|---|---|---|---|
| 2026-08-07 | App/Brand/* marks (library-wide) | 1 | Brand mark colors hardcoded, not token-bound | Brand assets are intentionally unthemed | ADR-0002 | permanent |
| 2026-08-07 | D3(b) export lint (all deliverable exports) | 1 | Tokens-only runs DETECT-ONLY, violations logged not blocked | Two-week observation window before the hard gate | Owner decision 10 (2026-08-07) | ~2026-08-21 |
