# Slide/Deliverable Contract Unification — Reinforcement-Inference Prediction + Unified Plan (2026-06-16)

## Method
Reinforcement inference: instead of patching each symptom, re-derive from first principles the
STRUCTURAL CLASS behind this session's `#org` failures, predict where the same class WILL surface,
and design ONE fix aligned with the unified vision (one contract every layer consumes; self-healing
validation gate; simplicity). Predictions below are rated by confidence and, where possible, already
VERIFIED with a parity grep this session.

## The root class (one cause behind every `#org` failure this session)
**The slide/deliverable contract — the template→payload schema in `components/slideTemplates/types.ts` —
is the single source of truth, but it is RE-IMPLEMENTED independently at ~7 pipeline layers, each with
its own hand-maintained whitelist/handler.** Any template or field added at one layer that isn't
propagated to the others silently breaks at the un-updated layer. The layers:

1. `corpusChatService` SLIDE OUTPUT PROTOCOL (generation prompt) — what Opus is told to emit.
2. `CorpusChatPanel.parseSlideBlocks` (render parser) — maps parsed JSON → SlideData. **Was missing `orgChart` + `executiveBrief` → "No org tiers" / empty brief.** FIXED.
3. `corpusChatService.parseFences` (budget re-ask parser) — a SECOND parser of the same fences.
4. `components/slideTemplates/web.tsx` (960x540 preview renderer).
5. `services/slideToStageHtml.ts` (1920x1080 export/stage renderer).
6. `components/slideTemplates/pptx.ts` (native PPTX exporter).
7. `App.tsx` wiki-hydration (reload path) + `services/slideValidator.ts` (telemetry).

This is the unified vision's "inconsistently wired / contract drift" pathology, concretely.

## Reinforcement-inference predictions (other problems from the SAME class)

- **P1 — CONFIRMED NOW (high):** Saved artifacts do not survive session reload. Console shows
  wiki-hydration SKIPS 9 types (`personas/journey/recs/prd/roadmap/gap/tech-audit/competitive/tech-arch`)
  with "shape missing expected fields". The reload-hydration layer expects shapes the persisted
  artifacts don't match — same contract-drift class, different layer. Your reloaded saved session can
  generate at runtime (now) but cannot RESTORE its prior deliverables.
- **P2 — high:** The NEXT new slide template added to `types.ts` will silently break at whichever of the
  7 layers isn't updated — exactly the org-chart precedent, which will repeat with no guard.
- **P3 — medium/high:** The two independent fence parsers (`parseSlideBlocks` vs budget `parseFences`)
  can drift: a field normalized in one but not the other → the budget pass mis-parses a slide,
  under-counts structure, and either over-trims or (pre-2026-06-16-guard) gutted it. The structural
  guard I added catches the gut; the parse divergence itself remains a latent drift point.
- **P4 — medium:** Three renderers (web preview, stage/export HTML, native pptx). `check:templates`
  enforces web↔pptx parity only — NOT the stage renderer or the parser. A field added to one renderer
  but not another reproduces the documented preview-vs-export mismatch class.
- **P5 — medium:** `slideValidator` has no case for org-chart / newer templates → those deliverables get
  no structural QA telemetry; failures pass silently.
- **P6 — medium (data-contract twin of P1):** Anonymized-source vs client-roster name resolution is
  ad hoc. Today only `#org` was taught to resolve real names from the roster; the same "anonymized
  interview codes leak into the artifact" will recur in personas, case-studies, journey actor lanes,
  quotes — any template that names people — unless name-resolution is a shared contract rule.

## The unified solution (one contract, consumed by every layer + a self-checking guard)
Aligned with the vision: ONE source of truth, simplicity (collapse 7 whitelists into 1), and a
validation-gate/health-check that catches drift in CI instead of shipping it.

1. **`slideTemplates/contract.ts` — the single registry.** For each `SlideTemplate`:
   `{ payloadField, altFieldNames[], requiredArrays[], normalize(parsed)→payload, namesPeople:boolean }`.
   - `payloadField`: e.g. `org-chart → orgChart`, `executive-brief → executiveBrief`.
   - `altFieldNames`: the normalization currently duplicated in both parsers (`themes→themeCluster`,
     `tiers→orgChart`, `stats→statRow`, …) lives here ONCE.
   - `requiredArrays`: e.g. org-chart→`['tiers']`, journey→`['stages','lanes']`; powers the budget
     structural-preservation guard generically (no per-template special-casing).
2. **Every layer consumes the registry, not its own whitelist:**
   - `parseSlideBlocks` + `parseFences`: build the SlideData payload from `registry[template].normalize`.
     The two parsers can no longer diverge.
   - budget re-ask guard: read `requiredArrays` from the registry (replaces the generic item-count).
   - hydration (App.tsx): validate persisted artifacts against `registry` expected shape → fixes P1
     (saved artifacts round-trip on reload).
   - validator: iterate the registry → every template gets structural QA (fixes P5).
3. **Parity guard test (`slide-contract-parity.test.ts`)** — fails CI if any `SlideTemplate` in the
   union lacks: a registry entry, a renderer in BOTH twins + pptx, a parser mapping, and a hydration
   handler. Extends `check:templates` from web↔pptx to ALL layers. This is the health-check / SkillOpt
   validation-gate principle: the system catches its own contract drift (fixes P2, P4).
4. **Shared name-resolution contract rule** (fixes P6): a single protocol clause + a post-process
   that, for any template flagged `namesPeople`, resolves real names from non-anonymized client-roster
   sources and forbids carrying anonymized codes (C0x) into user-facing fields. Applied uniformly to
   org-chart, personas, case-studies, journey lanes, quotes — not re-taught per template.

## Sequencing (gated, bounded — propose-and-test per RHO/SkillOpt)
1. Land `contract.ts` registry + point BOTH parsers at it (behavior-preserving; covered by existing
   slide tests + the new parity test). Verify: 127+ tests green, live `#org`/`#brief` render.
2. Add the parity-guard test; wire into `npm run check:templates`.
3. Migrate the budget guard + validator to read `requiredArrays` from the registry.
4. Fix hydration (P1) to validate against the registry → saved artifacts restore on reload.
5. Add the shared `namesPeople` resolution rule (P6).
Each step is independently shippable, tsc-gated, and reversible.

## This session's fixes (already landed, the seeds of step 1)
- Parser now carries `orgChart` + `executiveBrief` (the immediate "No org tiers" / empty-brief fix).
- Budget re-ask structural-preservation guard (`countStructuralItems`) — generic, registry-ready.
- Grounding reorder (manifest PRIMARY leads; article bodies demoted but PRESENT for artifacts) +
  org-chart "name the actual leader, never an anonymized code" rule — the P6 seed.
- Dormant-KL-selection grounding + user-selection priority tier (durability across saved-session reload).
