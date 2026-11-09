---
name: hic-unified-vision
description: "The nine-phase operational contract for HiC: how the eight Unified Vision principles bind at each phase, from objective grounding to native PPTX. Read it before non-trivial pipeline, retrieval, routing, design-system or self-improvement work."
invocation: model
version: "1.0"
status: active
---

# HiC Unified Vision — the nine-phase operational contract

## Scope

The definitive nine-phase operational contract for the HiC end-to-end workflow — how the eight Unified Vision principles bind at each phase (objective grounding, all-source collection + second-brain reuse, provenance chunking, concept-graph manifest, anti-RAG themes + both chat desks, one cost/quota/quality routing authority, gated self-improvement, componentized runtime-filled GOLD imagery, globally-native PPTX). Read this before any non-trivial HiC pipeline, retrieval, routing, design-system, or self-improvement work so the change traces to the phase contract it must honor. Operationalizes .claude/UNIFIED_VISION.md; the integrated AIR-first 100% plan lives in humans-in-control-research/plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md (v1 same name is the file:line audit record).

`.claude/UNIFIED_VISION.md` states the eight principles and the governing doctrines (NO STOPGAPS, CONVERGE/
DELETE/GATE/SCHEDULE, Lego-brick Method A, quality-first-upstream). This skill states where each principle has
to HOLD, phase by phase. When a task touches a phase, the change must satisfy that phase's clause; if it
cannot, it is not done. The full file:line current-state, gaps, and remediation are in the plan named in the
description above — read it for the build sequence.

## The contract, per phase

1. RELEVANCE IS THE OBJECTIVE, NOT THE SOURCE TYPE. Rank every collected item by how completely it answers the
   user's objective and its sub-questions. Source type is a breadth instrument, never a relevance signal.
   Pursue breadth (many independent vantage points) and depth (mine the best vantage points thoroughly) without
   letting either override the objective. When the budget forces a cut, keep what answers high-priority
   sub-questions.

2. COLLECT FROM ALL SELECTED PACKS + ALL UPLOADS + THE CACHED SECOND BRAIN. The wiki is reused, not bypassed:
   when a new objective is similar to past engagements, auto-re-select the objective-relevant cached chunks and
   fold them into the same dedup/pack pipeline as fresh data, logging what was reused and why. Uploads are
   canonical and never truncated. Knowledge compounds across runs.

3. CHUNK WITH PRECISE PER-TYPE PROVENANCE. Every quote resolves to its REAL source (reddit sub+user / outlet+
   headline+author / platform+publication+author / for a synthesis, the named sources it was built from — never
   a single false primary, never a provider bucket). The per-chunk `sources:` field written at ingest IS the
   field read at citation time. Pointers (`<wikiPath>#cN`) dereference reliably; drifted spans are re-matched,
   not mis-cited. One citation format, one resolver.

4. THE MANIFEST IS A CONCEPT GRAPH, NOT A FLAT LIST. Chunks carry `concepts:` and `related_chunks:` in YAML
   frontmatter; retrieval walks concept edges from on-objective seeds before falling back to keyword/diversity
   ranking. Insights link to parent evidence and to prior insights. The graph feeds generation; it is not a
   read-only visualization. Markdown the model reads at runtime, never a vector DB.

5. ANTI-RAG ON ALL THREE SURFACES. Theme extraction, the Analyst Desk chat, AND the Designer Desk chat retrieve
   by manifest-chunk pointer keyed to the user prompt, cite by pointer + named source, and never bulk-inject
   rawSources except as an explicit empty-manifest fallback. The Designer Desk is held to the identical contract
   as the Analyst Desk.

6. ONE ROUTING AUTHORITY FOR EVERY #ARTIFACT (none omitted). Every artifact path resolves its model through the
   single authority (`aiRouter.artifactModelFor`), chosen by cost AND live quota/health AND the bake-off-proven
   best model for that deliverable (schema-bounded → cheapest equal model; evidence/imagery/narrative → strongest).
   No call site hardcodes a model behind the authority. The quota workaround is ONE reversible flag. Every route
   is logged with from/to/reason.

7. SELF-IMPROVEMENT IS USER-INFLUENCED AND AUTO-TRIGGERED, AND GATED. Learn from full rollouts. The user trigger
   turns edits/feedback into constraints + SkillOpt signal that actually change the next run. The auto-trigger
   fires epochs on a real cadence (a per-job counter, a scheduler, no human command). No change ships unless it
   beats the incumbent on a frozen held-out golden set (discrimination not shrunk, no exemplar floor regressed);
   this gate is in-path and non-bypassable. Low-effectiveness constraints retire on a cadence; skill edits stay
   small, source-attributed, and gated.

8. EVERY GOLD PAGE: DELIBERATE, COMPONENTIZED, TOKENIZED, RUNTIME-FILLED IMAGERY. Every GOLD frame is a true
   component (no raw frames); every strategic image region is a blank, named, token-bound component child (fill/
   stroke/radius from variables, NU 535:0 inherits, zero hardcoded hex/font), mapped in the code image-slot
   registry as wired, read by a renderer twin, and filled at runtime by Nano Banana (brand-image / diagram /
   token-icon). Deliberately image-free layouts are recorded `mode:'none'`. No registry-vs-code contradiction;
   no silently unfilled slot.

9. EVERY PPTX, FROM EVERY PATH, IS NATIVE AND EDITABLE. Native text runs, native auto-shapes, native picture
   placeholders, per-variant master layouts, embedded fonts, pixel-faithful to the preview. No full-slide raster
   fallback anywhere; an empty-geometry slide still exports native on its inherited master.

## The backbone the nine phases run on (AIR-first, 2026-06-30)

The nine phases are enforceable contracts on ONE backbone, not nine independent patches. Every run produces a
durable **Artifact Intermediate Representation (AIR)** + **Research Run Manifest** before any final prose,
slide, HTML, image, or PPTX render. AIR is the shared contract across ingestion, retrieval, both chat desks,
hashtag artifacts, routing, Nano Banana imagery, Figma filling, PPTX export, QA, and self-improvement; it is
the convergence of HiC's already-scattered structures (GenerationReceipt, epoch traces, registry.json, the
manifest), NOT new parallel machinery. AIR serializes five always-on typed graphs: Objective, Evidence,
Artifact, Design, Improvement. Renderers consume AIR; none renders from raw model prose. AIR is
schema-constrained (strict JSON schema). Full plan: `plans/hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md`.

Anti-RAG, operationally (phase 5), means OBJECTIVE-GRAPH-AND-MANIFEST-FIRST retrieval: decompose the objective,
let the manifest graph discover candidate chunks, fetch cited evidence by exact pointer, and apply a
cross-encoder rerank ONLY AFTER the manifest has seeded the candidate set. Bulk-injecting raw nearest-neighbor
chunks is forbidden unless the manifest is genuinely empty. "Anti-RAG" is not "never retrieve"; it is "never
opaque bulk-injection; always objective + manifest first." One `retrieveManifestEvidence()` function serves
themes, Analyst Desk, Designer Desk, artifacts, and the eval evaluator.

## How to use this skill
Before editing a pipeline stage, retrieval path, router, design-system asset, export path, or self-improvement
loop, identify which phase(s) the change touches and confirm the change moves that phase toward (never away
from) its clause above. If you meet a quality floor, meet it by improving the upstream cause, never by relaxing
a gate. Leave no stopgap and no duplicate path. Cite the phase number in your plan and in the commit body.
