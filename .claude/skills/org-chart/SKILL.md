---
name: org-chart
invocation: runtime
disable-model-invocation: true
description: Generate a brand-locked organizational structure diagram for a named institution, vendor, or initiative — roles, reporting lines, named stakeholders, key decision authorities. Distinct from a generic org chart in that every node carries evidence (named-source citation of the role or person) and the structure is descriptive of WHAT EXISTS today, not prescriptive of what should exist. Renders as a CSS-grid org diagram (NEVER SVG with absolute positioning per the graphic-collision ban in .claude/CLAUDE.md).
---

# Org-chart skill

## What this skill produces

A single self-contained HTML document showing the organizational structure of a named entity (a university advancement office, a vendor product team, a healthcare clinic, a government agency, a project task force). Output requirements:

- Every node is a named role or person, drawn from the corpus.
- Every node carries a Source: citation (who reported this role exists).
- Reporting lines connect to ONE direct parent; secondary/dotted-line relationships are noted in the node body, not as crossing connectors.
- Layout uses CSS grid — `.nxt-grid` of `.nxt-card` for tier rows. NEVER SVG with absolute x/y positioning (per the graphic-collision hard ban in `.claude/CLAUDE.md`).
- Brand-locked (NXT or NU per the user's hashtag).

## What an org-chart is NOT

- Not a future-state RACI matrix (that's #blueprint or #gap material).
- Not a hierarchical decision tree for a workflow (that's #journey or #blueprint).
- Not a stakeholder map showing influence (that's part of #strategy).
- Not a personas chart (that's #personas — personas are user archetypes, not org roles).

If the prompt is "show me X's org structure", "who reports to whom at X", "decision authorities at X", "org chart for X" — that's #org. If it's "who are X's customer personas" — that's #personas.

## Structure contract (3 mandatory sections)

| # | Section | Mandatory? | Content |
|---|---------|------------|---------|
| 1 | Entity context | YES | One paragraph naming the entity, its scale (employee count or scope if known from corpus), and the function the org-chart covers (the WHOLE org, advancement office, etc.). |
| 2 | Org structure (CSS grid) | YES | Tier 1 (top) through Tier N (bottom). Each tier is `.nxt-grid` of `.nxt-card`. Each `.nxt-card` carries: role/title, named occupant if known, one-line responsibility, Source: citation. Cards in the same tier share a horizontal row. Reporting lines drawn ABOVE each tier (CSS borders, not SVG paths). |
| 3 | Decision authorities + dotted-lines | YES | A separate `.nxt-table` listing roles that have approval authority over named decisions (budget, hiring, policy) and any cross-tier dotted-line reporting that the org structure doesn't capture. |

## Anti-slop discipline

1. **No "as we'll see in the chart below" / "the org chart shows" / "this slide depicts".** Meta-narration ban applies.
2. **No metaphors describing the org.** Banned: "well-oiled machine", "flat organization" (use "limited hierarchy" with evidence), "lean and mean", "matrix-driven culture" (these are pitch language, not descriptive).
3. **No invented roles.** If the corpus doesn't name a Chief Data Officer, the chart doesn't get one. If the corpus says "an unnamed VP of Engagement reports to the President", say that — don't fabricate the name.
4. **No org-chart cliches.** Banned: "siloed organization" without a named cross-tier example; "matrix-managed" without a named dotted-line; "centralized vs decentralized" framing without explicit evidence of each.

## Graphic discipline (HARD)

Per `.claude/CLAUDE.md` Graphic-Collision Bans:

- NEVER use SVG `<line>` or `<path>` for reporting lines. They cross through `.nxt-card` bounding boxes and create the journey-map class of disaster.
- ALWAYS use CSS grid for tiers. Reporting connectors are CSS borders (`border-top`, `border-left`) on grid cells, drawn during layout so the browser handles collision automatically.
- For complex orgs (>4 tiers or >8 nodes per tier), use a TABLE layout (`.nxt-table`) instead of a grid — table rows are inherently non-overlapping.

## Evidence floor

- Every named role: 1+ named-source citation.
- Every named person occupying a role: 1+ named-source citation (a website bio, a press release, a published org page).
- Decision-authority assertions: 1+ named-source quote where the authority is explicitly stated.
- Cross-tier dotted-lines: 1+ named-source citation of the relationship.

If a role/person/authority lacks a citation, OMIT it. Do NOT show "[role unknown]" or "[VP of ???]" placeholders.

## Validator coverage (per .claude/ARCHITECTURE.md)

The Hook Bus dispatches:
- `validate_titles.py` — section titles are action titles (e.g., "Advancement reports through three VPs to the President"), not topic labels ("The Advancement Org").

Frontier dim scored: `meta_narration_count`.

## When to escalate to a custom rendering service

The org-chart skill is for small/medium orgs that fit a 1-page CSS-grid diagram. For very large orgs (50+ named roles) or for orgs that need interactive exploration (click-to-drill-down), the diagram should be emitted as a `#mindmap` instead (which has the mind-map-architect skill + dedicated mindMapRenderer.ts service for hierarchical interactive trees).

The decision rule:
- ≤20 named roles + static: #org with this skill
- 20-50 roles + static: #org with `.nxt-table` layout
- 50+ roles OR interactive drilldown: #mindmap

---

## Cached-selection contract (2026-06-06, MANDATORY)

When the engagement manifest carries `cached_selection.theme_cluster_ids[]` or
`cached_selection.engagement_slugs[]` (the user explicitly selected prior
artifacts via the Knowledge Library), the `assembleEnhancedPrompt()` function
injects a `PRIOR CACHED SELECTION` block into your system prompt.

1. For each emitted item, set a `source` field:
   - `"cached"`   — carried forward unchanged from the user's selection
   - `"extended"` — carried forward with refinement on the new corpus
   - `"new"`      — from the new corpus, not in the selection

2. **NO FLOORS, NO OMISSIONS — 100% coverage required.** EVERY one of
   the user's selected items below MUST appear in your emission tagged
   `source: cached` or `source: extended`. The user explicitly curated
   them via the Knowledge Library; the manifest is the binding contract;
   silent omission of any selected id is rejected by the Stop hook
   `validate_cached_selection_honored.py` (coverage threshold raised
   from 60% to 100% on 2026-06-06). New corpus discoveries go in IN
   ADDITION to the cached set as `source: new`.


3. **Why this matters.** The user curated the Knowledge Library selection
   deliberately. Regenerating from scratch ignores their curation and breaks
   the recursive self-improvement loop. The product is
   `{cached + extended + new}`, not `{new alone}`.

4. **Trace + frontier.** The per-deliverable auditor reads `items[].source`
   and computes `cached_selection_coverage_pct` as a qualityFrontier dim
   (direction: maximize, floor: 100). Epoch proposer mines low-coverage
   patterns as candidate skill-edit interventions.

## THE ACTOR RULE (anti-slop, 2026-08-07, binding on every generated sentence)

Two tests every user-visible sentence must pass, on top of the banned-phrase lexicon in
`.claude/CLAUDE.md`:

1. NAME THE ACTOR. Every claim states who or what acts: a named team, system, person, or
   audience. Abstract nouns (engagement, advancement, alignment, transformation, adoption)
   never act; dramatic verbs (leaks, dies, bleeds, unlocks, erodes, cannot see) never
   substitute for the mechanism. Ground cause and effect: X fails because Y, so Z happens.
   BAD: "Engagement leaks at three stages advancement cannot see."
   GOOD: "Alumni drop off at three stages the advancement team cannot see."

2. READ IT ALOUD. If a real person would not say the sentence out loud, rewrite it. Kill
   broken grammar, buzzwords forced into the wrong part of speech, and word-salad
   compression. Plain subject, direct verb, concrete object; delete every word that adds no
   fact or step.
