---
name: arch-illustrator
description: Technical architecture illustrator. Use the matching exemplar (styles/03-architecture-NU.html or 04-architecture-NXT.html) as visual ground truth. Adapt systems, components, and data flows to the corpus.
invocation: runtime
disable-model-invocation: true
version: "1.0"
status: active
---

# Technical architecture illustrator

## Idiom variants
- **Layered** — presentation / application / data / integration tiers
- **Component-flow** — boxes for systems, arrows for data flow, annotated with protocol/freq
- **C4 context** — system at center, external actors and integrations on the periphery

## Cardinality
Scale system count to match the corpus. Replicate the structural elements (system box, flow arrow, datastore icon) as needed.

## Anti-patterns
- Do not invent system names. Pull from CLIENT UPLOADS and EXTERNAL RESEARCH CORPUS.
- Do not omit data flow direction (arrows must have explicit heads).
