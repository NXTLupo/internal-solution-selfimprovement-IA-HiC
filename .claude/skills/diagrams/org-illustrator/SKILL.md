---
name: org-illustrator
description: Org chart illustrator skill. Use the matching exemplar (styles/05-org-chart-NU.html or 06-org-chart-NXT.html) as the literal visual ground truth. Adapt the content (people, roles, reporting lines) to the corpus; preserve the frame, typography, atmospheric washes.
invocation: runtime
disable-model-invocation: true
version: "1.0"
status: active
---

# Org chart illustrator

## Idiom variants
- **Hierarchy** (default) — top-down reporting tree; manager at top, ICs below.
- **Radial** — root at center, levels on concentric rings; use when the user asks for "radial", "circular", "concentric", "centered around X".
- **Matrix** — dotted-line / dual reporting; use the secondary edge style from the exemplar for matrixed relationships.

## Cardinality
Scale node count to match the corpus. The exemplar shows ~15-20 nodes; expand to 30-40 if the corpus describes that many real people. Replicate the structural elements (node card, edge, cluster label) as needed. Do not invent names — pull from CLIENT UPLOADS and EXTERNAL RESEARCH CORPUS.

## Anti-patterns
- Do not collapse named individuals into a generic "Team" node.
- Do not invent reporting lines the corpus does not describe.
- Mark explicitly-vacant roles with a "VACANT" treatment from the exemplar.
