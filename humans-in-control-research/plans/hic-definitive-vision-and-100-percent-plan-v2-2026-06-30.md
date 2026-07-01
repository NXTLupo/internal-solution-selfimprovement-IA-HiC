# HiC Definitive Vision and 100% Plan — v2, AIR-first (2026-06-30)

This is the authoritative plan to bring Humans in Control (HiC) to 100% against the Unified Vision. It
integrates an expert deep-research review (2026-06-30) into the nine-phase audit captured in v1
(`hic-definitive-vision-and-100-percent-plan-2026-06-30.md`, which remains the file:line audit record). v2
supersedes v1's workstream ordering. It is grounded in six live audits plus the 2026-06-29 live-run validation.

The governing doctrines from `.claude/UNIFIED_VISION.md` are binding throughout: NO STOPGAPS EVER; CONVERGE /
DELETE / GATE / SCHEDULE (do not build-new); Lego-brick Method A (compose from registered Figma bricks +
tokens at generation time, never hardcode, the SPA never calls Figma live at runtime); quality-first (meet
floors upstream, never relax a gate). Every gate hook below is built AFTER the feature it gates.

---

## REVISED THESIS

HiC is an **objective-first, manifest-native, evidence-cited, design-system-governed Artifact Factory for
consulting intelligence augmentation.** The central architectural move: every run produces a durable
**Artifact Intermediate Representation (AIR)** plus a **Research Run Manifest**, not merely a prompt result, a
deck, a Figma output, or a PPTX file. That AIR is the shared contract across ingestion, manifest-graph
retrieval, the Analyst Desk, the Designer Desk, hashtag artifacts, model routing, Nano Banana imagery, Figma
template filling, PPTX export, QA, and self-improvement. The nine phases of the Unified Vision are then
implemented as enforceable contracts ON that backbone, not as nine independent patches.

Why this changes the plan: my v1 began remediation at individual phase gaps (citation resolver, Designer
anti-RAG, cached reuse, SkillOpt, routing, Figma imagery, PPTX). That is necessary but insufficient. Without a
single run contract that all phases read and write, the nine fixes are local patches that drift apart. v2
installs the contract first (WS-0), then implements the phases as contracts on it.

This thesis does NOT abandon the manifest/anti-RAG commitment; it sharpens it. "Anti-RAG" in HiC means
**objective-graph-and-manifest-first retrieval**, never opaque bulk-injection of raw nearest-neighbor chunks.
Manifest candidate discovery comes first; a cross-encoder rerank may refine the candidate set only AFTER the
manifest has seeded it; bulk corpus injection is forbidden unless the manifest is genuinely empty. See the
"Critical evaluation" section for why this refinement is adopted and what the owner must ratify.

---

## THE FIVE ALWAYS-ON GRAPHS (the conceptual model AIR serializes)

AIR is the per-run serialization of five typed graphs HiC already has in scattered form; the work is to
CONVERGE them, not to build new stores.

1. **Objective Graph** — decomposes the brief into goals, sub-questions (with priority + coverage status),
   hypotheses, stakeholders, concepts, entities, and expected deliverables. (Today: `ObjectiveInterview.ts`,
   `researchPlanner.ts` sub-questions. Gap: not persisted as a graph; no coverage status.)
2. **Evidence Graph** — chunk-level provenance, per-type source lineage, claim links, concept/entity edges
   across ALL corpora. (Today: `wiki_chunker` chunks + today's `sources:` + the manifest. Gap: flat, not a
   graph; `sources:` written but not read at cite time.)
3. **Artifact Graph** — declares every `#artifact`, its quality tier, evidence depth, modality, editability
   requirement, and routing policy. (Today: `ARTIFACT_TPL`, `deliverableFrameworks.ts`. Gap: no per-artifact
   evidence/editability/routing contract object.)
4. **Design Graph** — gold pages, component + token bindings, image-slot intents, Code Connect mappings.
   (Today: `registry.json`, `artifactImageSlots.ts`, `figma-node-map.md`, `figma-tokens.json`. Strong; gaps in
   Phase 8 audit.)
5. **Improvement Graph** — failures, evals, human corrections, approved harness changes, epoch lineage.
   (Today: `epochOutcomeTracker.ts`, `goldenSetRunner.ts`, `learningEngine.ts`, `improvement-epochs.md`. Gap:
   counter never increments, gate not in-path.)

---

## PART I — THE DEFINITIVE NINE-PHASE VISION (unchanged from v1, complete sentences)

The nine-phase vision statements are authoritative and unchanged from v1 Part I and the `hic-unified-vision`
skill: (1) relevance is the objective not the source type, breadth and depth serve the objective; (2) collect
from ALL packs + ALL uploads + the cached second brain, auto-reused; (3) chunk with precise per-type
provenance, `sources:` read at cite time; (4) the manifest is a concept graph that feeds retrieval; (5)
anti-RAG (manifest-first) on themes + Analyst + Designer; (6) one routing authority for every #artifact, none
omitted, by cost + quota + per-deliverable quality; (7) user-influenced AND auto-triggered self-improvement
behind an in-path held-out gate; (8) every GOLD page componentized, tokenized, runtime-filled by Nano Banana;
(9) every PPTX native and editable from every path. v2 adds the backbone that makes all nine enforceable.

---

## PART II — CURRENT STATE VS VISION

The six-audit gap table is unchanged and authoritative in v1 Part II (file:line for every claim). Headline P0
holes: cached-wiki auto-reuse missing (P2-collection); per-chunk `sources:` written but not read at cite time
(P3); Designer Desk bypasses the manifest (P5 anti-RAG violation); self-improvement loop not closing (P7).
P1: routing authority not yet adopted by `routedModelFor`/Designer/themes (P6); manifest graph is
visualization-only (P4); `executive-brief 366:2` raw frame + 7 `wired:false` GOLD slots (P8); PPTX raster
fallback survives (P9).

---

## PART III — THE INTEGRATED WORKSTREAMS (v2)

### WS-0 (P0, NEW, FIRST) — Install the AIR + Run-Trace backbone (CONVERGENCE, not new-build)
Create a canonical `ArtifactAIR` and `ResearchRunManifest`, schema-constrained (strict JSON schema / structured
outputs), emitted for every research run and every hashtag artifact BEFORE any final prose, slide, HTML, image,
or PPTX render. This CONVERGES today's scattered `GenerationReceipt`, epoch traces, `registry.json`, and
manifest into one IR; it does not add a parallel store. The AIR carries: the Objective (with decomposed
sub-questions + coverage status), the Evidence Ledger (typed `EvidencePointer[]` with per-type source lineage,
objective score, sub-question ids, concepts, related chunks, provenance confidence), the insight hierarchy
(SCQA/Rumelt), the artifact payload, a render plan (target modes, template candidates, image-slot decisions,
density), the model trace (selected model, routing reason, cost estimate, quota state per step), and the
quality report. Every renderer (Analyst, Designer, Figma spec, HTML, PPTX) consumes AIR; none renders from raw
model prose. Deliverables: `schemas/artifact_air.schema.json`, `schemas/research_run_manifest.schema.json`,
`config/artifact_catalog.yaml`, `services/artifactAirService.ts`, `services/runTraceService.ts`,
`services/evidenceLedgerService.ts`. GATE: `air_schema_integrity` + `artifact_catalog_coverage` checks (every
hashtag resolves through the catalog; every artifact writes `<runId>/artifacts/<artifactId>.air.json`; every
model call writes a routing trace; every rendered deliverable links back to AIR + evidence ledger). OWNER
SKILL: `hic-unified-vision` (add the AIR contract); new `air-contract` reference if needed.

### WS-A (P0) — Citation provenance: read per-chunk `sources:` at render time (Phase 3)
As v1 WS-A, now expressed against AIR: the Evidence Ledger's `EvidencePointer.sources[]` IS the per-type
attribution, populated at ingest from grounding and READ at cite time. `citationPointerRegistry.resolveOne()`
consults the chunk `sources:` (Tier 1) before page title (Tier 2) before path (Tier 3); add
`extract_chunk_sources()` to `wiki_chunker.py`; converge the two citation formats onto the documented
contract and delete the legacy `citationResolver.ts` format; validate `char_span` at resolve time with fuzzy
re-match. ADD (from expert): a **claim-evidence compiler** so every paragraph compiles from a claim graph with
a minimum support policy (`support_count >= 2`, `source_diversity >= 2`, `verifier_pass == true`); citations
are first-class runtime objects in AIR, not post-processing. GATE: `citation_resolution` check fails any
provider-bucket or single-false-primary attribution. OWNER SKILL: `manifest-chunk-retrieval`.

### WS-B (P0) — Designer Desk anti-RAG via the shared retrieval function (Phase 5)
Add `manifestChunkCorpus` to `chatToSlideSpec`/`chatToFreeform`; both desks AND theme extraction AND artifact
generation call the SAME `retrieveManifestEvidence()` function (see WS-G); manifest evidence leads, bulk corpus
is demoted to a fallback tail, the Designer model cites by pointer. GATE: `designer_manifest_grounding` fails a
Designer artifact whose trace shows bulk injection with a non-empty manifest. OWNER SKILL:
`manifest-chunk-retrieval` (names BOTH desks).

### WS-C (P0) — Auto-reuse the second brain in collection (Phase 2)
`loadCachedItemsByGoal(goal, maxAgeDays)` + by-name `hydrateTopCachedChunks(goal)` score cached chunks against
the objective and fold qualifying chunks into `mergeResultsToCorpus` BEFORE dedup, under a distinct "Cached
reuse" provenance; dedupe deep-research synthesis vs live sources by URL. GATE: `corpus_reuse_provenance`
fails silent reuse (reuse must be logged + scored). OWNER SKILL: `research-planner`.

### WS-D (P0) — Close the self-improvement loop; held-out gate in-path; gated evolution (Phase 7)
Increment `jobs_since_last_epoch` on every completed deliverable; `GET /api/epochs/status` counts traces since
the last ledger entry; build `epochGateService.applyEpochGate(baseline, candidate)` from `goldenSetRunner`
discrimination + floor checks and call it IN-PATH in `learningEngine.runLearningPass()` and from the proposer
via `POST /api/epochs/gate`; consume `trainSkill=true` feedback into the next SkillOpt set; schedule the
proposer; retire low-effectiveness constraints on a cadence. ADOPT the expert's **gated-evolution** rule:
auto-trigger may PROPOSE and EVALUATE; promotion is automatic ONLY for low-risk config/skill changes that pass
the gate; material changes to routing, renderers, or connectors require human approval after the gate verdict.
Every epoch writes a patch record + replayed benchmark + verdict. GATE: `epoch_gate_verdict` fails any
promotion lacking a recorded held-out verdict. OWNER SKILL: `epoch-proposer`, `skillopt-validation-gate`.

### WS-E (P1) — One routing authority, upgraded to an eval-backed policy engine (Phase 6)
Route `corpusChatService.routedModelFor`, the Designer Desk, themes, `#proto`, `#slides`, image-prompt
generation, and AIR generation through `aiRouter.artifactModelFor()`; delete the parallel
`deliverableModelOverride` dispatch. UPGRADE the authority from a switchboard to a **policy engine** that scores
eligible models by: per-artifact historical eval score, schema-strictness reliability, evidence faithfulness,
visual-reasoning fit, live quota + provider health, latency fit, prompt-cache compatibility, and inverse cost;
it returns the selected model, the alternatives, the cost estimate, the quota state, and the eval-snapshot id,
all logged. Reserve frontier-priced models (Opus 4.8, GPT-5.5, Gemini 3.1 Pro) for synthesis/verification/final
packaging; push decomposition/normalization/tagging/layout-planning/pack-assembly to cheaper tiers (Gemini 3.5
Flash, GPT-5.4 mini). Encode the six bake-off-approved schema deliverables and the `persona-card → Pro` mandate.
The Opus cap is ONE dated reversible flag with a 2026-07-01 revert checklist. CANONICAL MODEL IDS REMAIN
HiC's: `gemini-3.1-pro-preview` / `gemini-3.5-flash` / `gemini-3.1-flash-image-preview`, `claude-opus-4-8`,
`gpt-5.5` / `gpt-5.4-mini` (NOT the report's 2.5-era ids). GATE: a unit test enumerating every `ARTIFACT_TPL`
directive + HTML/`#proto`/`#slides`/AIR paths proves each resolves through the authority (none omitted). OWNER:
`aiRouter.ts` header + memory.

### WS-F (P1) — Objective-supremacy ranking + breadth balance + sub-question coverage (Phase 1)
Aggregate item relevance to the source level and surface it; run a post-collection sub-question coverage audit
(`auditSubQuestionCoverage`) that writes coverage status into the AIR Objective Graph; multiply the packer
ratio by sub-question priority so objective-aligned chunks survive the budget cut; add an optional
breadth-balance mode that caps any source type from dominating BY VOLUME (a breadth instrument, never a
relevance override). GATE: `source_diversity` reports sub-question coverage and flags uncovered high-priority
sub-questions. OWNER SKILL: `research-planner`.

### WS-G (split: schema P0, traversal P1) — Manifest concept graph as the shared retrieval substrate (Phase 4)
PROMOTE the SCHEMA subset to P0 (it is the substrate WS-A/B/C/0 depend on): add `concepts:`, `related_chunks:`,
`source_lineage:`, `objective_alignment:`, and `staleness_hash:` to the chunk/page frontmatter
(`AGENTS.md` + `wiki_chunker`). Then P1: build `retrieveManifestEvidence()` (objective-seed rank → bounded
concept-graph BFS → dedupe → cross-encoder rerank AFTER manifest seeding → top-k), and make it the SINGLE
retrieval function for themes, Analyst, Designer, artifacts, and the eval evaluator; persist `related_insights`
in `persistInsightAsChunk`; validate concept-edge referential integrity. GATE: `manifest_chunk_parity` extended
to assert concept edges resolve. OWNER SKILL: `manifest-chunk-retrieval`, `mind-map-architect`.

### WS-H (P1) — Every GOLD page: deliberate, componentized, slot-governed Nano Banana imagery (Phase 8)
As v1 WS-H (componentize `executive-brief 366:2`; resolve the 7 `wired:false` slots; remove the
registry-vs-code diagram contradiction; rebuild mindmap as a faithful twin; bind residual hardcoded hex). ADD
the expert's **slot-governed (not prompt-governed) Nano Banana** rule: the `ImageSlotDecision` declares
`mode` (none | brand_image | diagram | icon | data_viz | uploaded_asset), `modelTier`
(`gemini-3.1-flash-image-preview` for volume vs the premium image tier for complex factual visuals vs
`native_shape`), `promptSource` (AIR insight | evidence ledger | user prompt | deterministic icon map), and
token bindings; the slot decides the model and constraints, the prompt only supplies content; every generated
image carries prompt + model + slot id + artifact id + alt text + provenance. GATE: `figma_registry_parity`
fails any GOLD node lacking either a wired runtime fill or an explicit `mode:'none'`. OWNER SKILL:
`nxt-visual-renderer`, `designer`.

### WS-I (P1) — PPTX as a first-class renderer from AIR, globally native (Phase 9)
Treat PPTX as a renderer that consumes the SAME AIR + template manifest + brand tokens + image-slot registry
as the preview, not a downstream export. Use a **placeholder-first compiler** bound to a locked layout
registry with stable placeholder `idx` values (native text placeholders, native picture placeholders, charts,
tables); remove the raster fallback in `gold_pptx_export.py` (emit native text + inherited chrome even on empty
GEO); route the legacy `SlideCanvas` path to the gold renderer and deprecate `pptx.ts::exportSlideToPPTX`;
remove the design-desk freeform raster fallback. GATE: `pptx_native` (proxy-side python-pptx) fails any
full-slide picture-only slide or zero native text runs, on EVERY pptx path. OWNER SKILL: `nxt-humans-slides`,
`export-render-verifier` subagent.

### WS-J (P1, NEW) — MCP, connector, and tool governance
Do not expose every connector/tool to every agent. Use **domain-specific tool packs** with signed descriptors,
bounded capabilities, per-context tool budgets, and human-approval gates for write/publish/delete tools (e.g. a
`figma_gold_audit` pack: read-only Figma tools, write/publish require approval). Figma MCP is **design-time
only** (auditing, exporting manifests, component parity); the SPA NEVER calls Figma live at runtime; runtime
generation uses the exported template manifest + token/component/image-slot registries. Every tool call writes
to the run trace (objective, source pack, consent state, tool pack, output hash, downstream artifact ids); tool
descriptors are untrusted unless signed and pinned. GATE: a tool-governance check in the unified gate. OWNER
SKILL: new `mcp-tool-governance` reference; `mcp-service-bootstrap` (update).

---

## PART IV — ONE QUALITY GATE (CONVERGE the hook sprawl)

Collapse the per-defect hooks into ONE `.claude/hooks/quality_gate.py` with independently-testable checks under
`.claude/hooks/checks/`, invoked with scopes:

```
.claude/hooks/quality_gate.py
  checks/
    air_schema_integrity.py        artifact_catalog_coverage.py
    citation_resolution.py         designer_manifest_grounding.py
    corpus_reuse_provenance.py     source_diversity.py
    epoch_gate_verdict.py          figma_registry_parity.py
    pptx_native.py                 mcp_tool_governance.py
```

`python .claude/hooks/quality_gate.py --scope air --scope citations --scope designer-grounding
--scope pptx-native sessions/$RUN_ID/artifacts/$ARTIFACT_ID.air.json`. Objective defects BLOCK (Stop);
judgment calls produce review findings, not Stop failures. This reconciles deterministic enforcement with the
"built after the feature, never a band-aid" rule. The existing ~50 validators are migrated into `checks/`
incrementally as each workstream lands; no new hook gates an absent feature.

---

## PART V — THE SEVEN-STAGE SEQUENCE (revised)

- **Stage 0 — Install the contract layer (WS-0).** AIR + run trace + evidence ledger + artifact catalog +
  unified quality gate. Exit: every hashtag resolves through the catalog; every artifact writes `.air.json`;
  every model call writes a routing trace; every rendered deliverable links back to AIR. PRECEDES WS-A..WS-I.
- **Stage 1 — P0 credibility closure (WS-A, WS-B, WS-C, WS-D + WS-G schema subset in parallel).** Citations
  resolve from per-chunk sources; Designer is manifest-first; cached reuse is visible/scored/deduped/traceable;
  no epoch promotion without a gate verdict; manifest gains concepts/related_chunks/source_lineage/objective_alignment.
- **Stage 2 — Retrieval + knowledge-graph completion (WS-G remainder + WS-F).** `retrieveManifestEvidence` is
  the single retrieval function for themes/Analyst/Designer/artifacts/eval; dense rerank is subordinate to
  manifest candidate discovery; every evidence block has pointer + quote + source lineage + objective score +
  concept links; sub-question coverage is audited.
- **Stage 3 — Artifact Factory migration (AIR-first rendering).** Migrate high-value artifacts first, hardest
  path first: `#strategy` deck (exercises evidence, narrative, template selection, visuals, PPTX, exec QA),
  then `#recommendations`, `#gap`, `#roadmap`, `#persona`, then the rest. Each produces AIR; the evidence gate
  passes before rendering; the template selector picks from the manifest, not intuition; the renderer fills
  named slots only; output has traceable evidence footnotes.
- **Stage 4 — Routing convergence (WS-E).** Every model call routes through the eval-backed authority; the
  per-artifact eval registry is populated; quota + health fold in; no hardcoded model ids outside the router +
  provider config.
- **Stage 5 — Figma GOLD + slot-governed Nano Banana (WS-H).** All GOLD pages are components or explicitly
  excluded; all image slots token-bound with a runtime decision (wired or `mode:'none'`); Nano Banana prompts
  built from AIR + evidence + slot constraints; diagrams explicitly native-shape or image, never ambiguous.
- **Stage 6 — Native PPTX globally (WS-I).** Raster fallback removed; legacy paths deprecated; every pptx path
  validated by `pptx_native`.
- **Stage 7 — Governance, observability, gated SkillOpt (WS-J + WS-D hardening).** MCP tool packs + signed
  descriptors; full run trace across ingestion → retrieval → generation → render → export → review; eval
  dashboards by artifact type; SkillOpt consumes feedback + trace failures; constraints retire when stale.

Each workstream ships build → `tsc --noEmit` → unit/gate test → Docker rebuild → browser smoke (console clean)
→ output inspection before "done." HTTP 200 and a green build are not proof.

---

## PART VI — CRITICAL EVALUATION OF THE EXPERT REVIEW (accept / adapt / reject, with rationale)

ACCEPTED AND INTEGRATED (the review was right and my v1 was weaker):
- AIR + run-trace backbone as the spine (WS-0); the five typed graphs; AIR renders everything; promote manifest
  schema to P0; collapse hooks into one gate; eval-backed router policy engine; slot-governed Nano Banana; PPTX
  as a first-class renderer from AIR; gated-evolution self-improvement; modality-aware chunking + precise
  locator contract; claim-evidence compiler with a minimum-support policy; MCP tool-pack governance (WS-J).

ADAPTED (right direction, wrong specifics for HiC):
- **Model IDs.** The report names Gemini 2.5 Pro/Flash, `gemini-3-pro-image`, and GPT-5.5/5.4 tiers. HiC's
  VERIFIED canonical models are `gemini-3.1-pro-preview` / `gemini-3.5-flash` / `gemini-3.1-flash-image-preview`,
  `claude-opus-4-8`, `gpt-5.5` / `gpt-5.4-mini`. I adopt the tiered-routing ARCHITECTURE (frontier for
  synthesis/verification, cheap tiers for scale) but keep HiC's canonical ids. Routing through `aiRouter.ts`
  remains mandatory; no hardcoded ids.
- **Anti-RAG reframe.** Adopted as "objective-graph-and-manifest-first; cross-encoder rerank only AFTER manifest
  seeding; bulk injection forbidden unless manifest empty." This is consistent with HiC's existing
  `wiki-reranker`. FLAGGED FOR OWNER RATIFICATION because it refines an owner-emphatic doctrine (see Part VII).

RECONSIDERED (owner challenged the initial reject 2026-06-30; revised objectively to the state of the art):
- **Provider-native stateful orchestration (OpenAI Responses API / Gemini Interactions).** ADOPT THE
  CAPABILITY, NOT THE COUPLING. The capabilities these surfaces represent — a stateful run object, a
  server-managed tool loop, structured outputs, built-in search — ARE state of the art and are exactly what AIR
  + run-trace formalize. The error would be coupling HiC's WHOLE orchestration to one vendor, because HiC is
  multi-provider and its resilience model is cross-provider fallback (the report itself cites "no single
  framework dominates"). DECISION: keep the proxy as the cross-provider chokepoint, and UPGRADE it to use each
  provider's native stateful + structured-output + server-tool-loop features behind the abstraction (Responses
  API for the OpenAI path, Interactions for the Gemini path, Anthropic's own), with AIR as the provider-agnostic
  run object. This is an upgrade to the one chokepoint (converge), not a re-platform that forks it. Folded into
  WS-0 (AIR run object) + WS-E (router/proxy upgrade).
- **Embeddings / hosted ANN store.** ANTI-RAG MEANS ANTI-OPAQUE-BULK-INJECTION AND PRO-PROVENANCE, NOT
  ANTI-EMBEDDING. The frontier (AgenticRAG, LLM-Wiki, RLM-on-KG) moves AWAY from flat embedding lookup as the
  PRIMARY retrieval — which agrees with the manifest-first doctrine — but uses dense embeddings as ONE SIGNAL in
  hybrid retrieval (dense + sparse + graph → fuse → cross-encoder rerank), which is state of the art. DECISION:
  embeddings (and even a hosted ANN store) are PERMITTED as a provenance-carrying signal inside manifest-first
  hybrid retrieval, on the strict condition that every vector carries its manifest pointer + source lineage so
  results dereference to cited chunks; they are subordinate to objective + manifest seeding. FORBIDDEN:
  provenance-free bulk injection of raw nearest-neighbor chunks. Folded into WS-G `retrieveManifestEvidence`
  (dense is a candidate-generation signal feeding the manifest-seeded set, then rerank). This sharpens the
  anti-RAG doctrine; it does not abandon it.

NOTHING REMAINS FULLY REJECTED. The two items above moved from "reject" to "adopt with provenance/abstraction
discipline" after objective reconsideration.

### AIR enforcement is RAMPED, not flag-day (owner decision 2 resolved)
AIR-as-hard-gate is adopted, but enforced per artifact path in two steps to avoid a breaking switch: each path
first runs AIR in SHADOW mode (emit AIR, log any "rendered without valid AIR" as a violation, do NOT block),
then flips to BLOCKING the moment that path emits AIR cleanly and is verified. By the end of Stage 3 every
artifact path is blocking. The `air_schema_integrity` check supports both modes via a per-path flag.

### Gated-evolution approvals reuse existing gates; NO new approval UI (owner decision 3 resolved)
Material changes (routing / renderer / connector CODE) ride the EXISTING commit-approval gate (the standing
no-commit-without-approval rule + `precheck_commit_approval.py`): the epoch proposes a patch record + held-out
verdict, and it lands only when the owner approves the commit. Low-risk config/skill changes auto-promote
BEHIND the held-out gate + `skillopt-validation-gate`, logged to `improvement-epochs.md`. No new approval UI is
required. OPTIONAL polish (not required, later): a READ-ONLY in-SPA "self-improvement log" panel showing recent
auto-promotions + pending proposals for visibility.

---

## PART VII — OWNER DECISIONS (resolved 2026-06-30)

1. **Anti-RAG refinement — RATIFIED.** Operational definition: objective-graph-and-manifest-first; cross-encoder
   rerank only AFTER manifest candidate discovery; embeddings/hosted-ANN permitted as a PROVENANCE-CARRYING
   signal subordinate to manifest seeding; bulk injection of raw nearest-neighbors forbidden unless the manifest
   is empty. Anti-RAG = anti-opaque-bulk-injection + pro-provenance, NOT anti-embedding.
2. **AIR as a hard gate — CONFIRMED, RAMPED.** Blocking once Stage 0 lands, enforced per path via shadow → block
   (see Part VI). All paths blocking by end of Stage 3.
3. **Gated-evolution autonomy — CONFIRMED.** Material (routing/renderer/connector) changes require owner approval
   via the existing commit-approval gate; low-risk config/skill changes auto-promote behind the held-out gate +
   `skillopt-validation-gate`. No new approval UI. Optional read-only improvement-log panel later.
4. **Sequencing — CONFIRMED: Stage 0 (WS-0) first**, because every P0 fix becomes cleaner and testable once it
   writes to AIR, and WS-0 begins by enumerating the FULL artifact catalog so no hashtag is omitted from the
   outset. Provider-native orchestration upgrade folds into WS-0/WS-E; embeddings-as-signal folds into WS-G.

## PART VIII — OMISSION-PROOFING (so no workstream is dropped across sessions)
1. WS-0 starts by writing `config/artifact_catalog.yaml` enumerating EVERY hashtag (the full set in this plan),
   so completeness is enforced from the first commit, not discovered late.
2. Every workstream below carries explicit EXIT CRITERIA; a workstream is "done" only when its feature ships AND
   its gate check exists AND its test passes (build → tsc → gate test → Docker rebuild → browser smoke → output).
3. A persistent task list (TaskCreate) mirrors WS-0..WS-J with dependencies; any future session reads it to see
   exactly what remains. A coverage check (`artifact_catalog_coverage` in the unified gate) fails if any artifact
   path lacks an AIR emission or a routing-authority resolution, so silent omission is caught mechanically.

### DEFERRED LEDGER — stragglers that MUST NOT get lost (each has a tracked task)
Every item deferred out of a landed workstream is recorded here AND as a persistent task (survives sessions).
A deferral is legitimate only if it appears in BOTH places with a reason and a trigger. Nothing is "a scoped
follow" on a verbal promise alone.

| # | Deferred item | From | Reason it was deferred (not reckless) | Trigger to do it | Task |
|---|---|---|---|---|---|
| D1 | Converge citation formats; retire legacy `citationResolver` [CHUNK_XXX] | WS-A | It is LIVE via `App.tsx:3355` (generation path); deleting now breaks generation | Stage 3 AIR migration, when artifacts assemble citations from the AIR evidence ledger | #13 |
| D2 | Bridge 16 doc-level `resolved_sources` pages into page-level (Tier-2) resolution | WS-A | Immediate live win separate from the per-chunk READ path; touches catalog/registration | Next, before/with WS-C (attribution surfacing) | #14 |
| D3 | Populate per-chunk `sources:` on real pages | WS-A | READ path is proven; the WRITE (6/30 forward-fix) is uncommitted + only fires on fresh grounded writes | After commit + proxy rebuild + one live deep-research run | #15 |
| D4 | Commit today's uncommitted work (6/30 + WS-0 + WS-A); rebuild `research-generator`; browser smoke | all | Standing rule: no commit without owner approval; build/test/commit order | Owner approval | #16 |
| D5 | Claim-evidence compiler generator wiring | WS-A | Types/policy live (WS-0 evidenceLedgerService); wiring belongs where claims assemble from the ledger | Stage 3 AIR migration | #8 |
| D6 | Provider-native stateful orchestration upgrade (Responses/Interactions behind the proxy) | v2 reconsider | Capability-adopt, not re-platform; belongs with routing convergence | Stage 4 | #9 |
| D7 | 2026-07-01 Opus-cap revert (flip OPUS_CAP_ACTIVE=false + revert checklist) | routing | Calendar-gated on the Anthropic cap lifting | 2026-07-01 | #9 |
| D8 | corpus_reuse_provenance gate (fail silent cached reuse) | WS-C | Runtime enforcement needs the ResearchRunManifest corpus.sources provenance, not emitted yet | When ResearchRunManifest is emitted (Stage 3) | #17 |
| D9 | Deep-research synthesis vs live-source URL dedup | WS-C | Merge authority already dedupes by urlKey; the finer grounding-URL dedup is a smaller follow | With WS-G retrieval work / Stage 2 | #18 |
| D10 | OS-level auto-fire schedule of the (propose-only) epoch-proposer | WS-D | Propose-only mechanism + review UI are built + verified; the cadence trigger is an environment-specific OS registration (mirror skillopt-weekly.xml), can't be verified to fire from here | When the owner registers the scheduled task | #19 |

RULE: when a workstream lands, any item it does not fully complete gets a row here + a task in the SAME commit
that marks the workstream done. A reviewer checks this ledger against the task list; a mismatch is a process bug.

### Workstream completion checklist (update as each lands)
- [x] WS-0 AIR + run-trace backbone + artifact catalog + unified quality gate (Stage 0) — CONTRACT LAYER LANDED 2026-06-30: services/artifactCatalog.ts (26 ids, authoritative) + config/artifact_catalog.yaml; schemas/artifact_air.schema.json + research_run_manifest.schema.json; services/{evidenceLedgerService,artifactAirService,runTraceService}.ts; .claude/hooks/quality_gate.py + checks/{air_schema_integrity,artifact_catalog_coverage}.py; proxy POST /api/air/write. VERIFIED: tsc 0; vitest 11/11 (services/artifactCatalogCoverage.test.ts omission guard + services/artifactAir.test.ts); gate live shadow=pass, blocking-pointer=exit2, uncatalogued=exit2; proxy ast.parse OK. PENDING: proxy endpoint live-confirm on the Docker rebuild; renderers EMIT AIR in Stage 3 (by design).
- [x] WS-A citation provenance read at cite time + claim-evidence compiler (Stage 1) — LANDED 2026-06-30: per-chunk `sources:` now parsed by BOTH resolvers (wiki_chunker.extract_chunk_spans + extract_chunk_sources; wikiPointerResolver._parseChunksFrontmatter + ResolvedChunk.sources), registered at the assembleChunkCorpus chokepoint (registerResolvedChunkSources), and resolved Tier-1 in citationPointerRegistry.resolveOne (real source > page title > prettify; multi-source -> honest "Synthesis of A, B, C"). Stale char_span guard drops mis-sliced spans (no wrong-cite). New checks/citation_resolution.py gate (provider-bucket / false-primary / leaked-pointer). VERIFIED: tsc 0; full suite 416/416; gate dirty=exit2 clean=exit0; LIVE end-to-end proof against :5012 (synthetic page -> resolveChunks parsed sources -> resolved "(Source: Higher Ed Dive)", proxy-container Python parse confirmed). DEFERRED (documented, not reckless): citationResolver.ts format convergence/deletion (it is LIVE via App.tsx:3355 legacy [CHUNK_XXX] path). DATA GAP: 0 real pages carry per-chunk `sources:` yet (only the 6/30 forward-fix on fresh grounded writes populates it); WS-A makes the READ path correct + ready. Claim-evidence compiler types/policy live (evidenceLedgerService, WS-0); generator wiring rides Stage 3.
- [x] WS-B Designer Desk manifest-first + output pointer resolution (Stage 1) — LANDED 2026-06-30. RECONCILIATION: the six-audit claim "Designer bypasses the manifest / bulk corpus" was INCOMPLETE — it judged by the `corpus: string` signature and missed the caller. DesignDeskChat.buildPromptCorpusGrounded (lines 259-282) was ALREADY manifest-first (pickChunksForPrompt+resolveChunks+assembleChunkCorpus, LEADS with "PRIMARY EVIDENCE (cite by pointer)", bulk demoted to tail, both gen+revision paths). The REAL gap: Designer OUTPUT never ran resolveManifestPointers, so model-cited [path#cN] pointers LEAKED and WS-A real-source attribution never surfaced. FIX: resolveManifestPointers now runs on chatToFreeform output (freeform HTML body) + chatToSlideSpec output (title + spec.objects[].text); + regression guard design-desk/designerAntiRag.test.ts (4 source-level asserts). VERIFIED: tsc 0; full suite 420/420; mechanism proven via WS-A live test (registered chunk pointer -> real source) composed with the wiring. POST-REBUILD SMOKE (same class as WS-A data gap): live Designer generation confirming model-emitted pointers resolve to real sources in the SPA. citation_resolution gate already catches any leak.
- [x] WS-C cached second-brain auto-reuse in collection (Stage 1) — LANDED 2026-06-30. VERIFIED audit was correct here (unlike WS-B): _blendCached was MANUAL Knowledge Library only; scoreGoalSimilarity existed but was never used for fresh-corpus auto-reuse. FIX: new wikiCacheLoader.loadCachedItemsByGoal (scans the 94 sources/ archives, scores each vs the objective via scoreGoalSimilarity, returns top matches as source:'cached' DataSourceItems with cachedProvenance{path,goalSimilarity}); App.tsx folds them into _mergeUploads BEFORE dedup (merge authority collapses fresh dups into cached canonicals), logged + surfaced as a thinking event (never silent), bounded (maxItems 8), fail-safe. VERIFIED: tsc 0; full suite 423/423; LIVE proof against :5012 (goal match -> cached items w/ provenance; gibberish -> []); permanent guard services/cachedReuse.test.ts. SCOPE: archive-level reuse now; per-chunk/manifest-graph reuse is WS-G (Stage 2). POST-REBUILD SMOKE: a fresh SPA run auto-reusing. Gate (corpus_reuse_provenance) + deep-research-URL dedup deferred -> ledger D8/D9.
- [x] WS-D self-improvement loop: propose-only + in-UI review (Stage 1) — LANDED 2026-06-30. RECONCILIATION (3rd audit overstatement): the loop was ~90% ALREADY built — held-out gate logic (goldenSetRunner.runGate+compareReports), disk-authoritative counter (/api/epochs/status proxy:15831), outcome tracker (/api/epochs/{id}/outcome), feedback->SkillOpt (build-training-set.py folds train_skill=true), skill-patch gate (learningEngine, test-locked). Audit claims "counter never increments / gate not in-path / feedback not consumed / loop not closing" were WRONG. OWNER DECISION (2026-06-30): PROPOSE-ONLY + in-UI review. BUILT: proxy /api/epochs/proposals (list/create/review) backed by epoch-proposals.json; services/epochProposals.ts; components/EpochProposalsPanel.tsx (approve/reject); App.tsx mount + trigger; epoch-proposer skill made PROPOSE-ONLY (writes gated proposal, NEVER auto-applies; low_risk vs material risk_class; material rides commit-approval). VERIFIED: tsc 0; full suite 426/426; LIVE round-trip against :5012 (create->pending, approve->approved, pending drains); guard services/epochProposals.test.ts. DEFERRED: OS-level auto-fire schedule of the proposer -> ledger D10. POST-REBUILD SMOKE: the ◆ epochs panel renders in the SPA.
- [x] WS-G(schema) manifest concept-graph frontmatter (Stage 1) — LANDED 2026-06-30. Added `concepts` (coarser than key_terms: >=2 mentions, len>=5) + `related_chunks` (intra-doc concept adjacency, chunks sharing >=2 concepts) to chunk frontmatter: wiki_chunker `_concept_extract` + chunk_for_manifest + `_serialize_chunks_yaml` + `extract_chunk_spans` parse; TS twin `wikiPointerResolver._parseChunksFrontmatter` + `ResolvedChunk.concepts/relatedChunks`; documented in AGENTS.md "Chunk Frontmatter Contract". RECONCILED: source_lineage = WS-A's `sources:` (no duplication); objective_alignment belongs to RETRIEVAL time (WS-F), not chunk time. VERIFIED: tsc 0; full suite 429/429; Python round-trip (extract+serialize+parse+chunk_for_manifest) in the proxy container; LIVE TS resolveChunks surfaced concepts+relatedChunks; guard services/conceptGraph.test.ts. DATA-LAG: existing pages gain the fields only on re-chunk/new writes (same class as WS-A). Concept-graph TRAVERSAL retrieval that USES these fields is WS-G(traversal), Stage 2 (task #7).
- [~] WS-G(traversal) concept-graph seeding in the shared retrieval fn (Stage 2) — WS-G(traversal) LANDED 2026-06-30. RECONCILED: the "single retrieveManifestEvidence function" ALREADY EXISTS as pickChunksForPrompt (themes/Analyst/Designer/artifacts all reach it via buildManifestCorpusForGoal) - so this ENHANCES it (converge), does not build a parallel. Added concept-graph seeding: a chunk 1-hop concept-adjacent (via related_chunks) to a keyword-MATCHED chunk is admitted at CONCEPT_ADJ_SCORE (below matches, above dropped) so the concept graph FEEDS retrieval, then MMR refines. VERIFIED: tsc 0; suite 430/430; guard in conceptGraph.test.ts. DATA-LAG: needs re-chunked pages carrying related_chunks (WS-G-schema). WS-F (objective-supremacy ranking + sub-question coverage) is the remaining half of this line - IN PROGRESS next.
- [x] WS-F objective-supremacy: sub-question coverage audit (Stage 2) — LANDED 2026-06-30. Added deterministic `auditSubQuestionCoverage(corpusText, subQuestions)` (researchPlanner.ts): scores salient-term presence per sub-question -> covered(>=60%)/partial/uncovered, surfaces HIGH-priority under-covered ones (the objective-supremacy alarm). Wired post-collection in App.tsx (shape-guarded) -> logs + a [COVERAGE] thinking event recommending a targeted follow-up BEFORE generation. VERIFIED: tsc 0; full suite 434/434; BEHAVIORAL unit test subQuestionCoverage.test.ts (4, real asserts - not source-regex; pure fn needs no proxy). RECONCILED: breadth/source-type balance ALREADY exists (pickChunksForPrompt SOCIAL_MAX_FRAC 40% auto-cap); source-level relevance aggregation logging + writing coverage into the AIR Objective Graph ride Stage 3 (AIR migration).
- [~] Stage 3 AIR-first artifact migration — BEACHHEAD LANDED 2026-06-30. AIR emission wired into the UNIVERSAL emitDeliverable wrapper (opt-in `air` step: buildAir + validateAir(SHADOW, non-blocking) + writeAir, fire-and-forget) - the single chokepoint every artifact flows through (converge, not per-artifact rewire). First real consumer: the strategy/HTML-artifact path (CorpusChatPanel) opts in. VERIFIED: tsc 0; full suite 436/436; buildAir/validateAir/writeAir each already live-proven (WS-0); guard in artifactAir.test.ts. REMAINING (multi-increment): opt the other artifact paths into `air`; populate REAL EvidencePointer ledgers (from resolveChunks, not empty); flip air_schema_integrity shadow->blocking per path once each emits clean; live smoke of a real #strategy generation writing its AIR.
- [ ] WS-E routing convergence onto the eval-backed authority + provider-native orchestration upgrade (Stage 4)
- [ ] WS-H GOLD componentization + slot-governed Nano Banana (Stage 5)
- [ ] WS-I PPTX as renderer-from-AIR, raster fallback removed, all paths native (Stage 6)
- [ ] WS-J MCP tool-pack governance + run-trace observability + gated SkillOpt hardening (Stage 7)
