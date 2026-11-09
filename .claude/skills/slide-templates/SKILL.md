---
name: slide-templates
description: The canonical slide template set, rendered in the NXT or NU brand chosen by hashtag, with the deliverable skill that owns each template. Loaded as the rendering system when slide intent appears.
invocation: runtime
disable-model-invocation: true
version: "1.0"
status: active
thinking: high
triggers:
  - slide
  - slides
  - deck
  - pptx
  - powerpoint
  - presentation
  - page
  - card
  - visual
  - show me
  - generate slides
  - turn this into a deck
  - build slides
  - export to pptx
  - make a presentation
  - "#NXT"
  - "#NU"
  - "#nxt"
  - "#nu"
loader:
  title: NXT Humans Slide Templates
  role: rendering-system
  execution_context: primary
  wiki_companions:
    - brand/identity.md
    - brand/layout-patterns.md
    - brand/anti-slop.md
  output_types:
    - persona-card
    - recommendation
    - theme-cluster
    - competitive-matrix
    - block-quote
    - case-study
    - principles
    - stat-row
    - timeline
    - section-divider
    - service-blueprint
    - gap-matrix
    - architecture-map
    - prd-feature
    - systems-inventory
---

# NXT Humans Slide Templates

The 10 canonical slide templates, available in two visual brands chosen by hashtag in the user's prompt: #NXT (NXT Humans — teal + chartreuse, default) or #NU (Northeastern University — near-black + Huskies Red). Every slide emitted by the chat picks one of the 10 templates, fills the data shape, and the web preview + PPTX export + PDF export all render from the SAME data for pixel parity. Templates: persona-card (persona-architect), recommendation (strategy-author), theme-cluster (theme-analyst), competitive-matrix (competitive-analyst), block-quote (evidence-curator), case-study (case-study-analyst), principles (strategy-author), stat-row (benchmark-reporter), timeline (roadmap-builder), section-divider (deck-composer). Emit :::slide template=NAME [brand=nxt|nu] blocks — never freelance a layout.

## Template owners

- persona-card: persona-architect (classic deliverable persona)
- recommendation: strategy-author (classic deliverable recommendation)
- theme-cluster: theme-analyst (classic deliverable theme)
- competitive-matrix: competitive-analyst (classic deliverable competitive_peer)
- block-quote: evidence-curator
- case-study: case-study-analyst
- principles: strategy-author
- stat-row: benchmark-reporter
- timeline: roadmap-builder (classic deliverable roadmap_item)
- section-divider: deck-composer
- service-blueprint: service-blueprint-mapper (classic deliverable journey_stage)
- gap-matrix: gap-analysis-evaluator (classic deliverable gap)
- architecture-map: tech-arch-generator (classic deliverable tech_node)
- prd-feature: prd-compiler (classic deliverable prd_feature)
- systems-inventory: tech-audit-inspector (classic deliverable tech_audit_system)

## Brands

- #NXT: NXT Humans. Teal sidebar + chartreuse accents (default). Colors resolve from the design tokens (/api/design-tokens?brand=NXT), never from literals.
- #NU: Northeastern University. Near-black sidebar + Huskies Red accents. Colors resolve from the design tokens (/api/design-tokens?brand=NU), never from literals.
