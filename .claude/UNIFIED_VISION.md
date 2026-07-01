# UNIFIED VISION — load-bearing principles for every agent session

This file encodes the NXT Humans / HiC unified vision. It is referenced from the always-loaded
`.claude/CLAUDE.md`, so every Claude Code session inherits it. These are PRINCIPLES, not optional
preferences. They were distilled from `.claude/skills/intelligence/` (Meta-Harness, RHO, SkillOpt,
Reinforcement Inference, Verbalized Sampling, NotebookLM spec, creative-team whitepaper,
second_brain.json) and ratified by the owner across the 2026-06 sessions.

## The 8 principles

1. **Meta-Harness — learn from full traces, not summaries.** Self-improvement reads complete
   rollouts (prompt + tool calls + output + edits), never a lossy digest.
2. **RHO — label-free self-preference with an S>0 promotion gate.** A proposed change ships only
   if it beats the incumbent on a held-out signal; no change is promoted on vibes.
3. **SkillOpt — bounded skill edits behind a strict held-out gate.** Skill/library edits are small,
   attributed to source rollouts, and pass `skillopt-validation-gate` before landing. Drift in =
   skills that get worse each pass; the gate is what makes the loop net-positive.
4. **Reinforcement Inference — uncertainty-triggered re-ask.** When confidence is low, re-ask /
   re-generate from source rather than emitting a hedged or fabricated answer.
5. **Verbalized Sampling — fight typicality bias and mode collapse.** Diversify candidates; do not
   collapse to the single most-probable phrasing. Especially for themes, headlines, exemplars.
6. **NotebookLM / ANTI-RAG — source-grounding via the MANIFEST, never embedding-RAG injection.**
   Deliverables ground on manifest-chunk retrieval over the markdown wiki (named sources, verbatim
   quotes, citation contract). Legacy embedding-RAG that injects raw `rawSources`/themes is the root
   of hollow output and is being deleted, not extended. There is ONE grounding chokepoint.
7. **Figma as the design-system-of-record — LEGO-BRICK, NEVER HARDCODED.** Every deliverable is
   assembled from NAMED, REGISTERED Figma components + variables + tokens, the way `#proto` builds a
   UI from `proto-component-manifest.md`. The model reads the brick contracts from the markdown
   manifest at generation time and COMPOSES; it never invents UI shapes and never hardcodes values.
   (See "Lego-brick doctrine" below — this is the active Track B build, Method A.)
8. **Karpathy second-brain — a markdown wiki + index pointers the model reads at runtime.** Not a
   vector DB. `MEMORY.md`-style indexes point at atomic files; the manifest is markdown the model
   retrieves and reads. Knowledge compounds in files, not in weights or an opaque store.

## Meta-principle: CONVERGE, DELETE, GATE, SCHEDULE — do not build-new

HiC already built these primitives. They are inconsistently wired, shadowed by parallel legacy
machinery, ungated, and unscheduled. The standing job is to **converge** duplicate paths onto one
chokepoint, **delete** the legacy parallel, **gate** every self-improvement loop behind a held-out
check, and **schedule** the curators/miners/auditors on a cadence. Reach for a NEW subsystem only
after confirming the primitive does not already exist.

## NO STOPGAPS, EVER (owner mandate, emphatic, standing — 2026-06-16)

When something is broken, fix the ROOT CAUSE durably. NEVER ship a temporary band-aid, a
throwaway mitigation, a "quick patch we'll redo later," or a half-measure to be replaced once the
real fix lands. Examples the owner explicitly rejected: trimming an over-large prompt as a quick
workaround, falling back faster instead of fixing why a call is slow, nerfing a budget to dodge a
timeout. The correct move was the durable architectural fix (decompose the monolith into pods).
- DEFERRING a known durable improvement to "later" is ITSELF a stopgap. If a thing is worth doing
  and you know how, it is part of doing the job right NOW. Example the owner called out: prompt
  caching the shared context across pods is a permanent improvement to the real design — so NOT
  implementing it now and saying "we can add it later" is the stopgap. Build the complete correct
  solution in one pass; do not ship a partial and backlog the rest.
- This is distinct from, and reinforces, the no-code-debt rule (Lego-brick doctrine below): no-debt
  = leave no dead/duplicate code; no-stopgaps = leave no temporary fix. Both always apply.
- If a durable fix is genuinely large, say so and do it; do not substitute a stopgap to look fast.

## Lego-brick doctrine (Track B, Method A — owner-final 2026-06-16)

The owner chose **Method A: full dynamic lego-bricking**, NOT the lighter "verify the fixed
renderers" path. Concretely:

- **The model composes from registered bricks at generation time.** Each deliverable has a brick
  contract in the manifest (`wiki/brand/figma-node-map.md` COMPONENT REGISTRY + `plans/figma-audit/
  registry.json`): which Figma components/variants it is built from, their token bindings, and their
  anatomy. Generation reads that contract and emits a composition, exactly as `prototypeBuilder.ts`
  reads `proto-component-manifest.md` for `#proto`.
- **NEVER HARDCODED.** Colors/fonts/spacing come from tokens (`/api/design-tokens`, both modes
  NXT 221:0 / NU 535:0). No literal hex / font / size in a renderer body. Enforced by the
  no-hardcode scan (`figmaRegistryParity.test.ts`, shadow → blocking).
- **The SPA never calls the Figma API at runtime.** "Dynamic" means the model reads the markdown
  manifest and composes; it does NOT mean live Figma MCP calls from the deployed SPA. The published
  Figma library is the canon; it is mirrored into `figma-tokens.json` + the registry, which are the
  runtime carriers. When Figma changes, re-pull tokens + re-chunk the manifest.
- **Brand = a token MODE flip, density = a token mode.** One component set; NU is mode 535:0, never
  a separate file. Geometry is identical across brands.
- **Single source of truth.** `routedModelFor` + the artifact force-route own model routing
  (Gemini 3.5 Flash for plain chat; Claude Opus 4.8 for ALL hashtag deliverables incl `#proto`).
  No parallel routing logic, no code debt.

## The nine-phase operational vision (where each principle has to HOLD)

The eight principles above are abstract; they bind at specific phases of the HiC end-to-end workflow. The
DEFINITIVE statement of what HiC is for, expressed as a contract over all nine workflow phases in complete
sentences, plus the live file:line current-state / gap / remediation ledger and the prioritized 100% plan,
lives in two places that must be read before any non-trivial HiC pipeline, retrieval, routing, design-system,
or self-improvement work:
- Skill `hic-unified-vision` (`.claude/skills/hic-unified-vision/SKILL.md`) — the loadable nine-phase contract.
- Plan `humans-in-control-research/plans/hic-definitive-vision-and-100-percent-plan-2026-06-30.md` — the ledger.

The nine phases and their one-line clauses (full sentences in the skill):
1. Relevance is the user's objective, not the source type; breadth and depth serve the objective, never override it.
2. Collect from ALL selected packs + ALL uploads + the cached second brain (reuse it, do not bypass it); knowledge compounds.
3. Chunk with precise per-type provenance; the per-chunk `sources:` written at ingest is the field read at citation time; one format, one resolver.
4. The manifest is a concept GRAPH (concepts + related_chunks in frontmatter) that FEEDS retrieval, not a flat list or a read-only visualization.
5. Anti-RAG on ALL THREE surfaces: theme extraction, Analyst Desk chat, AND Designer Desk chat retrieve by manifest pointer; the Designer Desk is held to the identical contract.
6. ONE routing authority (`aiRouter.artifactModelFor`) for every #artifact, none omitted, chosen by cost AND live quota/health AND bake-off-proven per-deliverable quality; no hardcoded call site; the cap is one reversible flag.
7. Self-improvement is user-influenced AND auto-triggered (a real job-counter cadence), and no change ships unless it beats the incumbent on a frozen held-out golden set with an in-path, non-bypassable gate.
8. Every GOLD page has deliberate, componentized, token-bound, registry-mapped imagery filled at runtime by Nano Banana; image-free layouts are recorded `mode:'none'`; no silently unfilled slot.
9. Every PPTX from every path is native and editable (text runs, auto-shapes, picture placeholders, per-variant masters, embedded fonts); no full-slide raster fallback anywhere.

## How to apply
- Before building anything, check whether the primitive exists (converge, don't duplicate).
- Identify which of the nine phases the change touches and confirm it moves that phase TOWARD its clause.
- Ground deliverables on the manifest; never re-introduce embedding-RAG injection.
- Compose from registered bricks + tokens; never hardcode; never invent UI shapes.
- Gate every self-improvement change on a held-out signal; schedule the recurring jobs.
- Active plans: `humans-in-control-research/plans/hic-definitive-vision-and-100-percent-plan-2026-06-30.md`
  (nine-phase vision + 100% plan) and `humans-in-control-research/plans/figma-audit/_SYNTHESIS-and-track-B.md`.
