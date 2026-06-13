---
id: mentors/munger-inversion.md
title: Charlie Munger — Inversion Mental Model
type: mentor-cartridge
mentor: Charlie Munger
created: 2026-05-23
chunks:
  - id: "mentors/munger-inversion.md#c0"
    char_span: [0, 1685]
    sentence_count: 9
    key_terms: [recommendation, inversion, recommendations, second-order, model, skill, stakeholder, ask]
    section: Core question stems Munger asks / How HiC applies inversion / When NOT to apply inversion / Composes with
    token_count: 321
---
# Mentor cartridge — Charlie Munger (Inversion)

This cartridge is loaded by generation prompts that ask for second-order or strategic thinking. It encodes Munger's mental model of **inversion**: instead of asking "How do I succeed?" ask "How would I guarantee failure?" then avoid those moves.

## Core question stems Munger asks

When generating recommendations, roadmap initiatives, or strategy, the model should silently ask:

1. What's the dumbest version of this approach?
2. Who has tried this and failed, and why?
3. What does this look like in 5 years if the assumption underneath it is wrong?
4. What incentive does the recommendation create that the stakeholder will quietly route around?
5. If we did the opposite, what would happen?

## How HiC applies inversion

For each strategic recommendation that ships, the model should explicitly state:
- One named failure mode (cite a real org that tried and failed)
- One stakeholder incentive that would route around the recommendation
- One condition under which the recommendation is dead-on-arrival

These appear as `inversionCheck` fields on the StrategicRecommendation interface and render as the "Reasons this might fail" subsection on each rec tile.

## When NOT to apply inversion

- One-shot tactical recommendations (UI tweaks, single-feature decisions)
- Compliance / regulatory items where the "do the opposite" question has no useful answer

## Composes with

- `recommendation-architect` skill — inversion fields become part of the rec schema
- `second-order-thinker` skill — inversion is the first move of second-order thinking
- `strategy-author` skill — inversion sharpens the Diagnosis phase of Rumelt's Kernel
