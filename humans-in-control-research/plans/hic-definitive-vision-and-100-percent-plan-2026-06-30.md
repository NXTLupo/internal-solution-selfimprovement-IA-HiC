> SUPERSEDED BY `hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md` (AIR-first integration of the
> expert review). This v1 remains the authoritative AUDIT RECORD (the six live file:line audits, Part II) and
> the original nine workstreams. Read v2 for the integrated architecture, the AIR backbone (WS-0), MCP
> governance (WS-J), the reprioritization, and the seven-stage sequence.

# HiC Definitive Vision and 100% Plan — nine-phase operationalization of the Unified Vision (2026-06-30)

This document is the authoritative statement of what Humans in Control (HiC) is FOR, expressed as a
contract over the nine phases of its end-to-end workflow, and the comprehensive plan to bring the app
to 100% against that contract. It supersedes the principle-level gloss in `.claude/UNIFIED_VISION.md`
by operationalizing each of the eight principles into the phase where it has to hold. It is grounded
in six live file:line audits run 2026-06-30 (phases 1-2, 3-4, 5-6, 7, 8-Figma-live, 9-PPTX) plus the
2026-06-29 live-run validation. Every claim of current state carries a file:line anchor; every gap is
concrete; every remediation names the file, the function, the gate hook, and the skill that owns it.

The governing doctrines from `.claude/UNIFIED_VISION.md` remain binding and are NOT restated per phase:
NO STOPGAPS EVER (fix the root cause durably, in one pass); CONVERGE / DELETE / GATE / SCHEDULE (do not
build-new); Lego-brick Method A (compose from registered Figma bricks + tokens at generation time, never
hardcode, the SPA never calls Figma live); and quality-first (meet floors by improving upstream, never by
relaxing a gate). Where a phase below proposes a gate hook, that hook is built AFTER the feature it gates,
never as a band-aid in front of an absent feature.

---

## PART I — THE DEFINITIVE VISION, PHASE BY PHASE (complete sentences)

### Phase 1 — Grounding on the user's research objective, not on source types
The single relevance authority in HiC is the user's entered research objective, and every collected item is
ranked by how completely it answers that objective and its decomposed sub-questions, never by what kind of
source it came from or how recent it is. Source type is a breadth instrument, not a relevance signal: the
system pursues breadth so that the objective is answered from many independent vantage points, and it
pursues depth so that the highest-relevance vantage points are mined thoroughly, but neither breadth nor
depth is ever allowed to override the objective as the ordering key. A fully realized Phase 1 scores every
item against the objective on a 0-to-100 scale with a stated reason, aggregates those scores to the source
level so the user can see which sources actually earned their place, audits after collection whether every
sub-question of the objective was covered, and offers (without mandating) a breadth-balancing mode that
caps any one source type from dominating the corpus purely by volume. Objective supremacy means that when
the token budget forces a cut, the items that survive are the ones that answer high-priority sub-questions,
not merely the ones that are short or cheap.

### Phase 2 — Collection from ALL selected packs, ALL uploads, and the saved/cached wiki (the second brain is reused, not bypassed)
A research run draws from the union of three sources: every selected data pack fanned out across the 200+
connectors, every client upload ingested in full, and every relevant chunk already saved in the Karpathy
second-brain wiki from prior runs. The second brain is not a passive archive that the user must manually
re-pick from; when a new objective is sufficiently similar to past engagements, the system automatically
re-selects the objective-relevant cached chunks and folds them into the same dedup-and-pack pipeline as the
fresh data, telling the user exactly what was reused and why. Knowledge therefore compounds: the second,
fifth, and fiftieth run on an adjacent topic each start richer than the last, because prior collection is an
asset, not a cost to be re-paid. Uploads remain canonical primary context and are never truncated to fit a
cap; cached reuse and fresh collection are labeled distinctly so provenance is always legible.

### Phase 3 — Chunking with precise, comprehensive citation and data provenance
Every chunk carries provenance precise enough that any quote drawn from it resolves to its real underlying
source with full per-type attribution: a Reddit post resolves to its subreddit and author, a news article
to its outlet, headline, and byline, a blog to its platform, publication, and author, and a synthesized
passage to the actual named sources its grounding segment was built from. A deep-research synthesis is never
attributed to a single false primary; when a passage rests on many sources, it is labeled honestly as a
synthesis of the named sources, never as one source speaking for all. The pointer scheme that addresses a
chunk (`<wikiPath>#cN`) dereferences reliably to the exact cited passage, the per-chunk `sources:` field
written at ingest time is the field consulted at citation-render time (it is not dead data), and a chunk
whose character span has drifted because its page was edited is detected and re-matched rather than silently
mis-citing. The citation contract is one documented format, enforced by one resolver, with no legacy second
format left alongside it.

### Phase 4 — A Karpathy manifest that is a knowledge graph: concept-linked chunks, not a flat list
The manifest is the second brain's knowledge graph, written as markdown YAML frontmatter the model reads at
runtime, never a vector database. Every article, theme, persona, and insight chunk carries its dominant
concepts in frontmatter and links to the chunks it relates to in concept space, so the manifest is a graph
of nodes and edges, not a flat array of pointers. That graph is the spine of retrieval, not a read-only
diagnostic drawn after the fact: when a generator or a chat retrieves context, it walks concept edges from
the on-objective seed chunks to pull in the conceptually adjacent evidence, and only then falls back to
keyword and diversity ranking. Insights written back to the wiki link to their parent evidence chunks and to
the prior insights they extend, so the graph densifies with every run and the knowledge genuinely compounds.

### Phase 5 — Theme extraction and BOTH chat surfaces retrieve via the manifest (anti-RAG, everywhere)
Theme extraction, the Analyst Desk chat, and the Designer Desk chat all ground on manifest-chunk retrieval
keyed to the user's prompt: they pull named-source, verbatim-quote evidence by pointer and cite it by
pointer, and they never bulk-inject embedding-RAG `rawSources` into the prompt except as an explicit
fallback when the manifest is genuinely empty. Anti-RAG is not a property of one surface; it holds on all
three. The Designer Desk, which today receives raw corpus text, is held to exactly the same contract as the
Analyst Desk: it pre-fetches the manifest chunk corpus for the user's prompt, the manifest evidence leads
the prompt while bulk corpus is demoted to a supplementary tail, and the Designer model is instructed to
cite by pointer and never to invent or mislabel a source.

### Phase 6 — Every #artifact generates through one routing authority chosen by cost, quota, and per-deliverable quality (none omitted)
There is exactly one function that decides which model generates a hashtag artifact, and every artifact path
— Analyst Desk, Designer Desk, the themes pipeline, the #proto build, and bare #slides — resolves its model
through it. That authority chooses by three inputs together: the measured cost of each candidate model, the
live API-quota and provider-health state, and the empirically highest-quality model for that specific
deliverable as proven by a bake-off, with schema-bounded deliverables routed to the cheapest model that
matched the strongest on completeness and citation-faithfulness, and evidence-, imagery-, or narrative-heavy
deliverables routed to the strongest model. No hashtag is omitted from the analysis, no call site hardcodes a
model behind the authority's back, and the temporary quota workaround (the Opus cap) is a single reversible
flag, not a scatter of per-file edits. Every routing decision is logged with the from-model, the to-model,
and the reason, so cost and quality are auditable.

### Phase 7 — Self-improvement that is both user-influenced and auto-triggered, and that only promotes a change that beats the incumbent on a held-out signal
HiC learns from full rollouts, not lossy summaries, on two triggers that both work. The user-influenced
trigger turns checkpoint edits and feedback into constraints and skill-training signal that demonstrably
change the next generation, and that feedback marked for training is actually consumed by the next SkillOpt
run. The auto-trigger fires a self-improvement epoch on a real cadence: a per-job counter increments on every
completed deliverable, the epoch becomes due at the threshold, and a scheduler invokes the proposer without a
human typing a command. No change — a constraint, a skill edit, a routing change, a hook — is promoted unless
it beats the incumbent on a frozen held-out golden set, where promotion requires that discrimination between
exemplars and known failures did not shrink and no exemplar regressed below a catastrophic floor; this gate is
in-path and non-bypassable, not an optional step a human may skip. Constraints age: low-effectiveness rules
are retired on a cadence so the prompt does not accumulate dead weight, and skill edits remain small,
source-attributed, and gated so the library gets better each pass rather than drifting worse.

### Phase 8 — Every GOLD page is deliberately considered for strategic imagery that is componentized, tokenized, mapped, and Nano-Banana-filled at runtime
Every GOLD deliverable frame in the published Figma library is a true component (no raw frames remain), and
every strategic image region on every GOLD page is a blank, named, token-bound Figma component child whose
fill, stroke, and radius resolve from variables so the NU mode-535:0 twin inherits it automatically with zero
hardcoded hex or font. Each such slot has a matching entry in the code image-slot registry marked wired, a
renderer twin that reads its carrier and emits an `<img>`, and a confirmed runtime path so that at generation
time the slot is filled by Nano Banana from a content-relevant prompt — emotive hero art via the brand-image
endpoint, labeled diagrams via the diagram endpoint, or deterministic token-bound icons — while the
deliberately image-free dense layouts are explicitly registered as image-free so "no image" is an honest
recorded decision rather than a silent miss. There is no standing contradiction between the registry and the
call site about how any artifact's imagery is produced, and no slot that exists in Figma is left permanently
unfilled at runtime without a recorded reason.

### Phase 9 — Every PPTX, from every path, is native and editable, including native image placeholders
Every .pptx HiC produces, regardless of which path generated it, is a native editable PowerPoint file: text
is real editable text runs, decorative and structural geometry is native auto-shapes, images are native
picture placeholders that a user can swap with PowerPoint's own Change Picture, and repeated brand chrome is
hoisted once onto per-variant master layouts and inherited. There is no full-slide rasterization fallback
anywhere; a slide with empty geometry still exports as native elements on its inherited master, never as a
flattened bitmap. Fonts are embedded so the file renders correctly off-machine while remaining editable, and
the export is pixel-faithful to the chat preview because both are driven by the one gold stage pipeline.

---

## PART II — WHERE THE APP IS TODAY VERSUS THIS VISION (the holes, with severity)

Legend: ✅ at vision · 🟡 partial · 🔴 hole. Severity P0 (correctness/credibility) · P1 (vision-critical) · P2 (hardening).

| Phase | State | Concrete holes (file:line) | Severity |
|---|---|---|---|
| 1 Objective grounding | 🟡 | Objective capture + 0-100 scoring strong (`ObjectiveInterview.ts`; `researchFabricOrchestrator.filterAndScoreItems` ~1358-1531, no item dropped). No source-level relevance aggregation; no post-collection sub-question coverage audit; objective-supremacy in `greedyPackCorpus` uses item relevance/size, not sub-question priority; no breadth-balance mode. | P1 |
| 2 Collection / cached reuse | 🔴 | Fresh fan-out + uploads strong. Cached wiki reuse is MANUAL Knowledge Library only (`wikiCacheLoader.ts`); no auto-reuse by goal similarity; no by-name cached retrieval into a fresh corpus during collection. Deep-research synthesis not deduped vs live sources by URL. | P0 (compounding broken) |
| 3 Chunking / provenance | 🟡 | Per-chunk `sources:` written at ingest (`wiki_chunker.attribute_chunks_to_grounding`, today's work) but NOT read at citation time (`citationPointerRegistry.resolveOne` uses page title) — dead data. Two citation formats (`citationResolver.ts` vs `citationPointerRegistry.ts`) unconverged. `char_span` staleness undetected on edited pages. | P0 (false attribution) |
| 4 Manifest / knowledge graph | 🔴 | `knowledgeGraphBuilder.ts` builds a graph for VISUALIZATION only; `pickChunksForPrompt` uses keyword+MMR, never graph walk. No `concepts:`/`related_chunks:` in frontmatter (`AGENTS.md` schema lacks them). Manifest is a flat pointer list, not a graph; insights persist `source_chunks` but not `related_insights`. | P1 |
| 5 Themes + chat anti-RAG | 🟡 | Anti-RAG HOLDS on themes (`geminiService.generateThemes`, GROUNDING=anti-rag-mcr) and Analyst chat (`corpusChatService` manifest lead). Designer Desk (`design-desk/services/chatToSlideSpec.ts`,`chatToFreeform.ts`) receives bulk `corpus` string, no manifest retrieval — anti-RAG VIOLATED on that surface. | P0 |
| 6 #artifact routing | 🟡 | `aiRouter.artifactModelFor()` is the SSOT and today's edits wired it into `CorpusChatPanel` (4 sites) + `prototypeBriefGenerator`. NOT yet adopted by `corpusChatService.routedModelFor`, Designer Desk, or themes. Six bake-off-approved schema deliverables not yet in `DELIVERABLE_MODEL_TIER`; `persona-card` Pro-mandate not encoded. Routing is quota-aware (cap flag) but not live-provider-health-aware at the artifact authority. `OPUS_CAP_ACTIVE=true` is a 2026-07-01 time-bomb. | P1 |
| 7 Self-improvement / SkillOpt | 🔴 | User feedback path + learning engine + skill-patch gate + golden-set runner all EXIST. But `jobs_since_last_epoch` is never incremented (no counter middleware); epoch proposer is manual (no live schedule); RHO held-out gate (`goldenSetRunner.compareReports`) is documented but NOT in-path (promotion is a human step); `trainSkill` feedback flag not consumed by SkillOpt; constraints never retire. Epoch ledger stale since 2026-06-24. | P0 (loop not closing) |
| 8 Figma GOLD imagery | 🟡 | Live MCP audit: both token modes confirmed (NXT 221:0 / NU 535:0, 0 color drift); most GOLD slots are real, token-bound, wired, Nano-Banana-filled. Holes: `executive-brief 366:2` is a RAW FRAME with literal masthead `367:2` (won't NU-flip); ~7 wired:false slots (personas-overview, strategy, prd-story, tech-audit, timeline/roadmap, persona-detail, slides:agenda); registry-vs-code contradiction on journey/arch/mindmap diagram source; mindmap not a faithful twin; a few hardcoded-hex authoring defects (588:4, 598:2, 599:2, 606:2). | P1 |
| 9 PPTX native export | 🟡 | ~95% native: deck, recommendations, journey/blueprint all route through the gold pipeline with native text/shapes/picture-placeholders + per-variant masters. Holes: raster fallback survives in `gold_pptx_export.py` (~599-607) when GEO walk empty; legacy `SlideCanvas`→`pptx.ts` pptxgenjs path runnable; design-desk freeform raster fallback; no post-export "runs>0" validation gate. | P1 |

Cross-cutting reconciliation note: the Phase 5-6 audit reported `artifactModelFor()` "zero callers," which was an artifact of searching `corpusChatService.ts`; today's uncommitted edits DID wire it into `CorpusChatPanel.tsx` and `prototypeBriefGenerator.ts`. The accurate state is "adopted on the chat-panel artifact path, not yet on Designer Desk, `routedModelFor`, or themes."

---

## PART III — THE 100% PLAN (prioritized workstreams)

Each workstream states the durable fix (no stopgaps), the file:line target, the gate hook that locks it, and
the skill that owns the contract. Workstreams are ordered by severity then dependency. Nothing here relaxes a
gate to pass; every floor is met by fixing the upstream cause.

### WS-A (P0) — Close the citation-provenance last hop (Phase 3)
1. Read the per-chunk `sources:` field at citation-render time: `citationPointerRegistry.resolveOne()` consults
   the chunk's `sources:` (Tier 1) before page title (Tier 2) before prettified path (Tier 3); add
   `extract_chunk_sources()` to `wiki_chunker.py`. 2. Converge the two citation formats onto the documented
   `"SourceName: ArticleTitle"` contract; delete the legacy `citationResolver.ts` format path. 3. Validate
   `char_span` at resolve time (`wikiPointerResolver.validateChunkSpan`) with fuzzy re-match on drift.
   GATE: extend `validate_citation_resolution.py` to fail if any rendered citation resolves to a provider
   bucket or a single-primary label on a multi-source synthesis. OWNER SKILL: `manifest-chunk-retrieval`.

### WS-B (P0) — Make the Designer Desk anti-RAG-compliant (Phase 5)
Add `manifestChunkCorpus?: string` to `chatToSlideSpec`/`chatToFreeform` args; pre-fetch via
`pickChunksForPrompt` + `resolveChunks` + `assembleChunkCorpus` at the Designer call site; add
`buildDesignerGroundingContext()` that leads with manifest evidence and demotes bulk corpus; instruct the
Designer model to cite by pointer. GATE: a Stop validator (`validate_designer_manifest_grounding.py`) that
fails a Designer-originated artifact whose trace shows bulk-corpus injection with a non-empty manifest.
OWNER SKILL: `manifest-chunk-retrieval` (extend to name both desks).

### WS-C (P0) — Auto-reuse the second brain in collection (Phase 2)
Add `loadCachedItemsByGoal(goal, maxAgeDays)` and a by-name `hydrateTopCachedChunks(goal)` that score cached
articles against the objective and fold the qualifying chunks into `mergeResultsToCorpus` BEFORE dedup, under
a distinctly labeled "Cached reuse" source; dedupe deep-research synthesis vs live sources by URL. GATE:
`validate_corpus_relevance_distribution.py` already exists; extend it to record reused-vs-fresh provenance and
fail silent reuse (reuse must be logged). OWNER SKILL: `research-planner` (add the cached-reuse contract).

### WS-D (P0) — Close the self-improvement loop and make the held-out gate in-path (Phase 7)
1. Implement the `jobs_since_last_epoch` counter: increment in the proxy on every completed deliverable; have
   `GET /api/epochs/status` count traces since the last epoch ledger entry. 2. Build `epochGateService.applyEpochGate(baseline, candidate)`
   that returns apply/reject from `goldenSetRunner` discrimination + floor checks, and call it in-path in
   `learningEngine.runLearningPass()` and from the epoch proposer via `POST /api/epochs/gate` — promotion is
   never a human step. 3. Consume `trainSkill=true` feedback in the next SkillOpt training set. 4. Schedule the
   proposer (`/schedule` cron or a post-delivery hook firing when `getEpochStatus().due`). 5. Add a
   constraint-retirement cadence so low-effectiveness rules age out. GATE: `validate_no_silent_fallback.py`
   pattern extended to assert no epoch promotion lacks a recorded gate verdict. OWNER SKILL: `epoch-proposer`
   (rewrite the trigger + gate sections to in-path); `skillopt-validation-gate` (consume feedback signal).

### WS-E (P1) — Converge all artifact routing onto the one authority, quota- and health-aware (Phase 6)
1. Route `corpusChatService.routedModelFor`, the Designer Desk, and the themes pipeline through
   `aiRouter.artifactModelFor()`; delete the parallel dispatch in `deliverableModelOverride` (converge, not
   duplicate). 2. Encode the six bake-off-approved schema deliverables in `DELIVERABLE_MODEL_TIER` and the
   `persona-card → gemini-3.1-pro-preview` Pro-mandate. 3. Fold live provider-health (`multiModelResilience`)
   into `artifactModelFor` so the authority sees quota/health, not just the cap flag. 4. Make the Opus cap a
   single dated flag with a documented 2026-07-01 revert checklist. GATE: a unit test asserting every directive
   in `ARTIFACT_TPL` + the HTML/`#proto`/`#slides` paths resolves through `artifactModelFor` (none omitted).
   OWNER SKILL: none new; update `aiRouter.ts` header + memory.

### WS-F (P1) — Objective-supremacy and breadth balance in ranking (Phase 1)
Aggregate item relevance to the source level and surface it; run a post-collection sub-question coverage audit
(`auditSubQuestionCoverage`); multiply the packer ratio by a sub-question-priority factor so objective-aligned
chunks survive the cut; add an optional breadth-balance mode that caps any source type from dominating by
volume (breadth instrument, never a relevance override). GATE: extend `validate_source_diversity.py` to report
sub-question coverage and flag any uncovered high-priority sub-question. OWNER SKILL: `research-planner`.

### WS-G (P1) — Manifest becomes a concept graph that feeds retrieval (Phase 4)
Add `concepts:` and `related_chunks:` to the chunk/page frontmatter schema (`AGENTS.md`) and emit them from
`wiki_chunker`; build `buildConceptGraphFromChunks()` and wire a concept-graph seed+BFS into
`pickChunksForPrompt` ahead of keyword+MMR; persist `related_insights` in `persistInsightAsChunk`. GATE:
`validate_manifest_chunk_parity.py` extended to assert concept edges resolve. OWNER SKILL:
`manifest-chunk-retrieval` + `mind-map-architect` (graph consumer).

### WS-H (P1) — Every GOLD page has a deliberate, componentized, runtime-filled image decision (Phase 8)
1. Componentize `executive-brief 366:2` and swap literal masthead `367:2` for the `Brand/Logo` component
   `619:2`; materialize its NU twin. 2. Resolve the seven wired:false slots: either wire the renderer twin +
   carrier + flip `wired:true` (personas-overview, strategy, prd-story, tech-audit, timeline/roadmap), or
   record them as intentional GOLD-page-only / image-free with `mode:'none'`. 3. Adjudicate and remove the
   registry-vs-code diagram contradiction (record native-shape rendering as the decision, or re-wire
   `/api/ai/diagram`). 4. Rebuild the mindmap renderer as a faithful 612:2 twin. 5. Bind the residual
   hardcoded-hex authoring defects to tokens. GATE: extend the `figmaRegistryParity` test so every GOLD node
   in the registry has either a wired runtime fill or an explicit `mode:'none'`, failing on any silent unfilled
   slot. OWNER SKILL: `nxt-visual-renderer` / `designer`.

### WS-I (P1) — PPTX native export is 100% global, no raster fallback (Phase 9)
Remove the raster fallback in `gold_pptx_export.py` (emit native text + inherited chrome even on empty GEO);
route the legacy `SlideCanvas` PPTX path to the gold pipeline and deprecate `pptx.ts::exportSlideToPPTX`;
remove the design-desk freeform raster fallback; add a post-export validation that fails when total native
text runs is zero. GATE: `validate_pptx_native.py` (new, proxy-side python-pptx) asserting zero full-slide
picture-only slides and runs>0. OWNER SKILL: `nxt-humans-slides` + the `export-render-verifier` subagent.

### Sequencing
P0 first and in parallel where independent: WS-A, WS-B, WS-C, WS-D. Then P1: WS-E and WS-F (independent),
WS-G (depends on WS-A schema work), WS-H and WS-I (independent). The 2026-07-01 Opus-cap revert is a dated
checkpoint folded into WS-E. Each workstream ships build → typecheck (`tsc --noEmit`) → unit/gate test →
Docker rebuild → browser smoke (console clean) → output inspection, and only then is it "done"; HTTP 200 and a
green build are not proof, per the standing pre-claim checklist.

---

## PART IV — HOOKS AND SKILLS TO WRITE (the "in writing" deliverable)

These are the durable written artifacts the vision requires. Hooks are registered in
`.claude/hooks/hooks.json` and dispatched by `run_hooks_parallel.py`; each is built AFTER its feature lands,
never as a band-aid in front of an absent feature.

New/updated SKILLS:
- `hic-unified-vision` (NEW, this session) — the umbrella skill carrying this nine-phase contract so every
  session inherits it; the other skills point to it.
- `manifest-chunk-retrieval` (UPDATE) — name BOTH the Analyst and Designer desks as anti-RAG surfaces; add the
  per-chunk `sources:`-read citation contract (WS-A/WS-B) and the concept-graph retrieval path (WS-G).
- `research-planner` (UPDATE) — add objective-supremacy ranking, sub-question coverage audit, and the
  cached-second-brain auto-reuse contract (WS-C/WS-F).
- `epoch-proposer` (UPDATE) — rewrite the trigger to auto-fire on the job counter and make the RHO held-out
  gate in-path and non-bypassable (WS-D).

New HOOKS (each paired to its workstream, built after the feature):
- `validate_designer_manifest_grounding.py` (Stop) — fail a Designer artifact that bulk-injected with a
  non-empty manifest (WS-B).
- `validate_pptx_native.py` (proxy-side, on export) — fail any PPTX with a full-slide picture-only slide or
  zero native text runs (WS-I).
- `validate_epoch_gate_verdict.py` (Stop/SubagentStop) — fail any self-improvement promotion lacking a recorded
  held-out gate verdict (WS-D).
- EXTEND existing: `validate_citation_resolution.py` (provider-bucket/false-primary), `validate_source_diversity.py`
  (sub-question coverage), `validate_corpus_relevance_distribution.py` (reuse provenance), `figmaRegistryParity`
  test (no silent unfilled GOLD slot).

This plan, the umbrella skill, and the four skill updates are the written reframing; the per-workstream gate
hooks are specified here and authored as each feature lands.
