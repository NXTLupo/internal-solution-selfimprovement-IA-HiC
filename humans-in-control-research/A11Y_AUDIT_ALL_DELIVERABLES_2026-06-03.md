# A11y Audit: All HiC Hashtag Deliverables (2026-06-03)

Goal: audit every deliverable HiC is wired to generate for accessibility (WCAG AA
contrast) violations, omitting none. Method: a Playwright computed-contrast scan
(getComputedStyle on every text node, effective background walked up the tree,
WCAG ratio vs the 4.5:1 small-text / 3:1 large-text floor), run against all 40
gallery exemplars (20 NU + 20 NXT) plus the live generated competitive-analysis
artifact served via /api/artifact/view.

## Scope: the wired deliverables

All 24 consulting-deliverable directives from `services/hashtagRegistry.ts`,
across their render paths:

- JM design-system HTML (served via /api/artifact/view, /api/journey-map/view):
  journey, blueprint, arch, roadmap, org, gap, audit (tech-audit), compete
  (competitive), case-study, prd, persona(s), strategy, themes, mindmap,
  meta-themes, research-plan.
- Freeform composer: brief, explainer, report, playground, approaches, whitepaper.
- Other: presentation (separate renderer), recommendations (chat tiles), proto.

Reference templates for each live deliverable live in the NU and NXT design
galleries, which share the same design-system CSS the generator emits.

## Root-cause violation classes found

1. Muted/subtle micro-label text too light (DOMINANT). NU `--fg-subtle`=slate-400
   (#94A3B8, 2.5:1) and `--fg-muted`=slate-500 (4.34:1); NXT `--fg-muted`=#999
   (2.85:1), `--fg-subtle`=#BBB (2.0:1). Used for eyebrows, meta labels, counters,
   citations across every deliverable.
2. Brand accent used as small text. NXT maps brand-accent to chartreuse #B8B800;
   eyebrows/section labels in chartreuse on white = 2.12:1.
3. Amber warning/urgency chips. warning-fg #8A8A00 on warning-bg tint = 3.46:1;
   warning-solid #B07908 with white = 3.76:1.
4. Dark-band headings inheriting dark ink. Live competitive-analysis masthead H1
   rendered near-black on the dark hero band (the user-reported failure).
5. Element-color collisions. Avatar initials white-on-white (NXT org-chart,
   personas), citation chip cyan-on-cyan (NXT brief-dialog).

## Fixes applied and verified

Live generated output (what HiC is wired to produce), via the proxy serve-time
guard `_inject_a11y_overrides` (runs on /api/artifact/view + /api/journey-map/view,
appended last with !important):
- Dark-masthead headings forced white. VERIFIED: live competitive-analysis = 0
  contrast failures (Playwright), down from the dark-on-dark H1.
- Selected tab/panel states forced to readable pairing (class-agnostic via
  aria-selected/role/.active), so LLM-authored tab markup can't reproduce the
  dark-on-dark active tab.
- Warning/urgency chips darkened to white-on-deep-amber.
- Reporting-depth metadata (R-NN ids, ID column, cross-refs) stripped.

Shared gallery CSS (covers all artifacts that use the shared classes/tokens):
- NU colors_and_type.css: --fg-muted and --fg-subtle -> slate-600 (6.4:1).
  VERIFIED: NU themes = 0 failures on a fresh (no-cache) load; meta dt now
  slate-600. All 20 NU deliverables inherit this token, so all are corrected.
- NXT colors_and_type.css: --fg-muted #595959 (7:1), --fg-subtle #6E6E6E (4.9:1).
- NXT artifacts.css: .art-eyebrow--brand chartreuse -> ink (dark-card override
  preserved); warning chips -> white on deep amber (AA floor block, !important).

## Remaining (documented, per-file template polish)

Several NXT gallery exemplars are self-contained 1920x1080 slide templates with
their OWN inline `<style>` and inline chartreuse/grey colors that bypass the
shared CSS, so the shared-token fix does not reach them:
- Inline chartreuse #B8B800 labels: nxt strategy-deck, strategic-report, journey,
  heuristic-ux, research-plan, service-blueprint-detailed.
- Inline grey #999/#888 muted: nxt journey, mindmap, service-blueprint-detailed.
- Avatar initials white-on-white: nxt org-chart, personas (avatar background not
  rendering its fill).
- Citation chip cyan-on-cyan: nxt brief-dialog.

These are reference templates, not generator output; the live generator emits the
shared design-system classes, which are guarded. Fixing the inline exemplars is
per-file work (replace inline chartreuse small-text with ink, darken inline greys,
give avatars a colored fill, darken the citation chip), tracked as the next pass.

## Recommendation

Add a contrast check to the existing artifact visual-QA gate
(`artifact_visual_qa.py` / POST /api/artifact/audit) so this Playwright-style
computed-contrast scan runs automatically on every generated deliverable and
fails the build on any sub-AA text. That converts this one-time audit into a
standing gate.
