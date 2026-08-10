# SOTA Elevation Plan: Loop Engineering, Cache Economics, Gated RSI, OKF Second Brain, Visual + Grounding Uplift, Design-System Governance (2026-08-07, v3)

v3 (same day): incorporates the `NXT-Humans/client-bc-pulse-design` repo (studied in full from
the local clone at `d:\client-bc-pulse-workspace\client-bc-pulse-design`, verified against the
GitHub origin) - the Plan Pulse phase-gate design process, three-tier Figma architecture,
component contract, machine-lintable design laws, deviation register, ADR log, and Figma-MCP
lint/authoring workflow - GENERALIZED for all HiC deliverables as workstream WS-D and gap rows
G27-G31. v3 also adds the explicit colleague-feedback coverage verdict the owner requested
(PART 2b, end). v2 (same day) incorporated (a) volunteered colleague feedback on live HiC
output (five findings, traced to root causes in PART 2b) and (b) three additional research
inputs: GRALAN knowledge-graph-to-LLM integration, the Claude humanize-text method, and the
Venngage AI-visuals workflow; it added gap rows G20-G26, workstream WS-V, item C5b. v1 content
is preserved; nothing was deleted.

Unified Vision phases advanced: (4) manifest concept graph, (5) anti-RAG retrieval, (6) ONE
routing authority by cost+quota+quality, (7) gated self-improvement, (8) design-system-governed
imagery, plus the meta-principle (CONVERGE / DELETE / GATE / SCHEDULE). EXTENDS (never
duplicates): model-retier-frontier-2026-07-13.md (the P0-P3 re-tier this plan sequences behind),
gpt-5-6-prompt-cache-adoption-2026-07-13.md (items 1-9 there are adopted as WS-C0 here),
slides-strategic-visual-uplift-2026-07-09.md (WS-V extends its gate spine; does not re-audit),
model-usage-optimization-vs-ri-2026-06-28.md, and the prompt-caching stack of 2026-06-23.

Method: full-text study of the seven research inputs + OKF spec, then a verified-in-code audit of
the current stack, then a gap matrix + colleague-feedback root-cause trace, then workstreams with
evidence gates. Sources studied:

- LOOPSBENCH (arXiv 2608.00267, Microsoft/NJU): loop engineering benchmark; dependency DAGs,
  regression obligations, loop-trace metrics, goal modes vs dynamic workflows vs Ralph loops.
- Cache-Aware Prompt Compression / CAPC (arXiv 2607.15516, PayPal): two-tier Anthropic cache
  (~3,500-token persistent-tier threshold), crossover cost model, tier-preserving ratio bound,
  AdaptiveCacheBoundary, Layer-1-cached-index / Layer-2-dereference for knowledge-graph RAG.
- Token-Operations-Oriented Inference Optimization (arXiv 2606.20295, China Unicom): the
  routing / cascading / ensembling triad, semantic caching with verifier models, difficulty-
  adaptive reasoning budgets, memory lifecycle, gateway rate-limit / circuit-break / degrade.
- Recursive Self-Improvement survey (arXiv 2607.07663, 1,250 papers): verification hierarchy,
  self-confirming loops / collapse / diversity collapse, SkillsBench (LLM-authored skills add
  ~0 without evaluation-guided refinement), SHARP constrained-surface pattern, process-level vs
  result-level improvement economics, evaluator co-evolution.
- GRALAN "The Graph Language" (arXiv 2608.01175, Pirro): KG-to-LLM integration by semantic
  alignment. Three API-transferable results even though its trainable mediator needs weights
  access HiC does not have: (i) QUESTION-FOCUSED subgraph extraction - seed entities + seed
  relations from the query, then a BFS whose expansion priority is relation-relevance to the
  question (priority queue, adaptive threshold ~0.7, DEPTH CAP 3; depth 4 degrades) beats fixed
  neighborhoods by 3-5% on complex queries; (ii) STRUCTURE PRESERVATION - flattening graph
  context into text (KAPING/REL style) scores BELOW even the LLM-only baseline (54-62% vs 66%),
  while structured delimited presentation (global graph context, then top-K relevant nodes with
  their relations, then the question) wins; (iii) ANSWER AS CLASSIFICATION - constraining the
  answer to an enumerated candidate set from the subgraph instead of free generation removes
  fabrication by construction.
- Open Knowledge Format v0.2 (Google Cloud knowledge-catalog repo + blog): markdown + YAML
  frontmatter bundles; `type` required; `generated`, `verified`, `status`, `stale_after`,
  `sources` (with credibility); index.md progressive disclosure; log.md; producer/consumer split.
- "How to Humanize AI Text with Claude" (Medium, christianaistudio): systematize the Wikipedia
  signs-of-AI-writing corpus into a reusable skill (HiC already ingested that lexicon 2026-05-25);
  the NEW substance is POSITIVE craft guidance beyond ban lists - rhythm, sentence-length
  variation, specificity over pattern-based word swaps, a frequency cap on reframing-contrast
  rhetoric, and tolerance for slight imperfection as a humanity signal.
- "How to Create Visuals with AI" (Venngage): purpose-first 7-step visual workflow; prompts as
  CREATIVE DIRECTION carrying four elements (subject, emotional tone, visual style, target
  format); brand kits for cross-output consistency; platform/context testing; the thirty-percent
  rule (AI generates the base, human judgment shapes the final); pitfall list (generic outputs,
  unrefined first drafts, ignored platform requirements).
- `NXT-Humans/client-bc-pulse-design` (private repo; local clone at
  `d:\client-bc-pulse-workspace\`, sibling code repo `client-bc-pulse-demoui`): the Plan Pulse
  design operating system. Read in full: CLAUDE.md bootstrap, 12 design laws, page anatomy,
  component contract, figma-map, code-bridge, report-workflow G0-G5, deviation register, 11
  ADRs, the two gate skills (`design-report`, `lint-guidelines`), the NFP consultant persona
  judge, onboarding, and validation critiques. The generalizable system: (i) THREE-TIER FIGMA
  ARCHITECTURE - read-only foundation kit (tokens + primitives; one owner) -> App/* component
  library (additive-only for designers; FROZEN prop APIs, unfreeze requires an ADR; PROMOTION
  RULE: a composition becomes a library component when it appears in >=2 contexts AND composes
  >=2 primitives or adds product structure) -> product file with Sandbox (per-designer named
  sections, proposals) strictly separated from Screens (promoted canon, changes only at G4);
  (ii) PHASE GATES G0-G5, no skipping, EVERY GATE LEAVES A TRACE - G0 intake/spec with the
  consultant (name the meeting it feeds + the first question it answers), G1 design-in-sandbox
  + MACHINE SELF-LINT of the laws against the live Figma frame via MCP (get_design_context /
  get_variable_defs / get_screenshot / get_metadata), G2 standing persona judge (dated critique
  filed; real human feedback outranks the persona), G3 human review with per-finding verdicts
  (adopt/adjust/reject-with-reason; new decisions become ADRs), G4 promote + publish +
  force-update stale instances, G5 code build 1:1 to frozen APIs with a coverage ledger (every
  published component gets a code mapping or a documented no-counterpart reason) + visual
  gallery diff; (iii) DEVIATION REGISTER - deviating from a law is allowed, silent deviation is
  the only prohibited move; every lint FLAG is fixed or logged with what/why/who-approved/until;
  (iv) TOKENS-ONLY law machine-checked (every fill/stroke/radius/font binds a variable; raw hex
  = FLAG); (v) token-sync code bridge (tokens authored in Figma, exported, merged into code by
  one command). Product-specific content (benefits-domain laws 4-7, demo data, page specs) does
  NOT transfer; the governance machinery does, wholesale.
- (The Medium prompt-caching article from the original brief is paywalled past its intro; its
  substance, prefix-cache architecture, is fully covered and superseded by the CAPC paper.)

---

## PART 1 - CURRENT STATE (verified in code 2026-08-07)

What HiC already runs, so nothing below re-builds what exists (converge doctrine):

- CACHING: one Anthropic chokepoint `proxy/app.py::_inject_anthropic_cache_control` (~line
  9902) converting `HIC_CACHE_BREAK` markers into up to 3 system breakpoints + 1 tools
  breakpoint; `ANTHROPIC_CACHE_MIN_CHARS=4000`; 1h extended TTL beta. Shared-SQLite (WAL) L1
  exact-match cache `EXACT_CACHE_TTL_SEC=3600` (~line 9405) + tool cache (900s) + vision-extract
  cache (30d) + query-embed cache (1h). Gemini explicit cache with a seen-twice gate (`gemseen`)
  before paying storage. OpenAI `prompt_cache_key = hic:<session>` (~line 10563). GPT-5.6
  explicit-breakpoint + Predicted-Outputs plan reviewed and awaiting go (2026-07-13 plan).
- ROUTING: `aiRouter.artifactModelFor` is the single authority (WS-E convergence); schema tier
  on gemini-3.5-flash, writing tier on claude-opus-4-8 (`OPUS_CAP_ACTIVE=false`); re-tier plan
  P0-P3 (Fable 5 / Sonnet 5 / gpt-5.6 sol-terra-luna) is bake-off-gated and pending.
- RESILIENCE: `services/multiModelResilience.ts` 4-layer (content-hash cache, provider health
  with 10-min 429 cooldown, per-corpus provider commitment, signature-keyed LLM cache);
  `deliverableModelRouter.ts` health-aware fallback chains; rate-limit-pacer + quota-monitor.
- LOOPS/GATES: gate spine (auditGate + collapseAndScore + kill-only Critic, 2026-07-08),
  deckPlanGate (40% visual quota), deterministic compile gate for #proto (Babel + Opus repair),
  criticReviseLoop primitive, preflight/qa-gate skills, R1-R20 external rubric standing rule.
- SELF-IMPROVEMENT: SkillOpt offline pipeline (extract-rollouts, build-training-set, train,
  validate-candidate 3-layer gate, weekly schedule); skillopt-validation-gate + skillopt-applier
  subagents; epoch-proposer (M1 traces -> ONE bounded harness edit -> M3 golden-set gate ->
  improvement-epochs ledger, fires every k=5 jobs); edit-learning (5+ similar edits -> approved
  constraint); cross-engagement-pattern-miner feeding VS frames.
- SECOND BRAIN: `hic-workspace/wiki/` LLM-maintained markdown KB; `AGENTS.md` schema;
  index.md-first navigation; `.manifest.json` (15,253 records) + journal; per-chunk frontmatter
  with `char_span`, `key_terms`, `concepts`, `related_chunks`, per-chunk `sources` lineage
  (WS-A/WS-G); embedding index; yield-ledger; engagement memory.
- VISUAL SYSTEM: 18 GOLD slide templates + `slides:` archetype registry (Method A geometry
  specs); deckPlanGate 40% visual quota + six new bricks + true-vector svgBlip (2026-07-09
  uplift, in flight); D17 native diagram render (`nxt_diagram_render.py`, HTML/CSS -> Chromium,
  never image-gen for exhibits); content-true icon gate; photographic lane; per-element
  content-true imagery; anti-slop lexicon (350+ phrases incl. the Wikipedia signs corpus,
  2026-05-25); content budgets (title 120 / content 200 / narrative 400 chars); evidence
  hierarchy (>=60% external, >=30% external citations) + source-ranker skill.
- DESIGN-SYSTEM GOVERNANCE (the WS-D baseline): the NXT design system EXISTS as the published
  Figma library `iSQhAVM7SI4QHAWB7y9C2z` with the `NXT Brand Tokens` collection carrying TWO
  MODES (NXT 221:0 / NU 535:0; brand = mode flip, never a second file), mirrored read-only into
  `hic-workspace/design-system/figma-tokens.json` and served at `/api/design-tokens`; the
  component registry is `wiki/brand/figma-node-map.md`; Track B Method A (compose deliverables
  from registered bricks + tokens at generation time, never hardcoded, the SPA never calls
  Figma live); GOLD Figma write-back program (wave 1 done, waves 2-4 pending, coverage ledger
  `figma-page-coverage-ledger.md`); `npm run check:templates` twin-parity gate; standing rules
  [S] LOOK-at-Figma-via-MCP-never-assume, [S] createNodeFromSvg-await-settle, [S] GOLD matrices
  auto-layout. What it does NOT have: frozen component APIs, a promotion rule, a Sandbox/Screens
  separation, a design-change gate spine, a machine lint of token bindings, a deviation
  register, or an ADR log - exactly the pulse repo's machinery (gaps G27-G31).

Honest reading: HiC independently converged on much of what these papers canonize. The elevation
is therefore mostly (a) making implicit disciplines MEASURED and DATA-DRIVEN, (b) adopting the
specific mechanisms we lack (regression obligations, cache-tier awareness, quality cascades,
semantic cache verification, evaluator co-evolution, OKF conformance, structure-preserving graph
context, citation-as-selection, directive-to-constraint compilation), and (c) deleting nothing
that works.

---

## PART 2 - GAP MATRIX (SOTA -> HiC delta)

| # | SOTA mechanism (source) | HiC today | Gap |
|---|---|---|---|
| G1 | Dependency-DAG task contract + ready frontier (LoopsBench §2.4) | Linear stage pipelines; AIR records stages but no explicit DAG | No machine-readable plan DAG per run; execution order and parallelism are implicit |
| G2 | Regression obligations: completed units' tests stay enforced (LoopsBench §2.6) | Golden-set gate fires only at epoch application; vitest/tsc gate the repo | Prior-deliverable gates are NOT re-run when skills/prompts/routing change; regressions surface only in the next live run |
| G3 | Loop-trace metrics: Reg rate, rounds, plan fidelity, Depth (LoopsBench §G/K) | M1 traces + yield-ledger exist; no loop-level metrics computed | Cannot answer "did this harness edit reduce regression events / fallback churn" quantitatively |
| G4 | Outer continuation loop for residual work (LoopsBench RQ1: +50% relative resolve) | Long runs that die mid-pipeline restart from scratch or are hand-resumed | No residual-routing resume contract over persisted AIR state |
| G5 | Persistent-tier cache threshold ~3,500 tokens; below it rho ~0.83 (CAPC §3.1) | `ANTHROPIC_CACHE_MIN_CHARS=4000` chars ~ 1,000 tokens | Floor sits INSIDE the hot tier: prefixes of 1,000-3,500 tokens get breakpoints yet pay write-rate on ~17% of calls |
| G6 | Measured rho(N,\|P\|) per workload; mutated-fraction-of-prefix as the cost driver (CAPC §3, §7.2) | costMeter books totals; no hit-rate-by-prefix-size, no mutated-fraction metric | Cache economics are asserted, not measured; prompt assembly can silently mutate the cached prefix |
| G7 | AdaptiveCacheBoundary: STATIC/QUASI/DYNAMIC segment classification from observed versions (CAPC §5.3) | 3 hand-placed HIC_CACHE_BREAK markers | Boundary placement is static opinion, not observed mutation rate; semi-stable engagement block drift silently busts the second breakpoint |
| G8 | CAPC Layer-1 cached compressed index / Layer-2 pointer dereference for KG-RAG (CAPC §6.4) | Manifest concept graph exists; generators inject picked chunks per call (all dynamic) | The stable, engagement-constant slice of the manifest (concept graph skeleton, top concepts, source census) is re-sent uncached or not sent at all |
| G9 | Quality CASCADE: cheap model first, judge, escalate on failure (Unicom §2.3, FrugalGPT/MoT) | Static per-artifact routing + failure-only fallback | Mid-tier artifacts pay Opus/Fable price on every call even when Flash + gate would have passed |
| G10 | Semantic cache with small-verifier cross-validation (Unicom §5.4) | Exact-match L1 only | Paraphrased repeat questions in Analyst chat are full-price misses; naive semantic cache without a verifier is a known wrong-answer trap, so it was correctly never built |
| G11 | Difficulty-adaptive reasoning budget (Unicom §3.4 DAST; correctness-per-token) | Opus 4.8 adaptive thinking on defaults; no per-artifact budget policy | Simple schema artifacts and hard strategy decks get the same thinking posture; no token-budget telemetry per artifact class |
| G12 | Verification hierarchy: formal > execution > learned judge > intrinsic (RSI §5.2) | Gates exist at all rungs but are not classified; standing rule "gate declares verified" | No explicit rung audit; some loops (chat critique) still bottom out at intrinsic self-assessment |
| G13 | Evaluator co-evolution behind held-out gates (RSI §5.1, Red Queen; SHARP constrained surface) | Rubrics (R1-R20, auditGate) are static hand-authored artifacts | User-edit history and dissent-panel outcomes never feed back into rubrics; no gated rubric-evolution loop |
| G14 | Judge decomposition into atomic binary questions (BinEval, RSI §3.1) | Kill-only Critic emits holistic verdicts with reasons | Critic verdicts are not decomposed; disagreement between critics is not debuggable per-criterion |
| G15 | Experience graphs / process-level memory: branch-execute-fail-repair persisted queryable (RSI §3.5, §5.5) | Traces + yield-ledger + improvement-epochs exist as flat files | Failure->repair paths are not first-class retrievable experience; each epoch re-greps raw traces |
| G16 | Minimum exogenous grounding per improvement cycle (RSI §5.3, Mirror Loop) | Gates are held-out but the grounding REQUIREMENT is implicit | No codified rule that every SkillOpt/epoch cycle must carry non-model signal (user edits, live outcomes) |
| G17 | OKF-standard frontmatter: `type`, `generated`, `verified`, `status`, `stale_after`, `sources` (OKF v0.2) | Rich proprietary frontmatter (chunks, industries, tiers) predating OKF | Not OKF-conformant: no staleness/verification lifecycle fields; knowledge is not portable as a bundle |
| G18 | OKF bundle as producer artifact (engagement knowledge handoff) | Engagement memory lives inside the wiki only | No exportable knowledge bundle per engagement; client/knowledge handoff means screen-sharing the wiki |
| G19 | Circuit-breaker states + adaptive TPM budgets at the gateway (Unicom §5.8) | 10-min 429 cooldown + fallback chains + pacer | No half-open probe state; cooldown is binary; TPM budgets are static env values |
| G20 | Structure-preserving graph context beats flattening (GRALAN: flattened KG text scores below LLM-only) | Picked manifest chunks are injected as flat text blocks | The concept-graph STRUCTURE (edges, communities, global context) is computed but not presented; the model sees prose fragments, not the graph |
| G21 | Question-focused biased traversal: relation-relevance priority queue, adaptive threshold, depth cap 3 (GRALAN §3.1, ablations) | WS-G(traversal) walks concept edges after manifest seeding; expansion is relevance-scored but not relation-biased, and depth is not a governed parameter | Traversal admits noise chunks on complex objectives; no equivalent of the measured depth-3 / theta-0.7 optimum |
| G22 | Answer-as-selection from enumerated candidates removes fabrication by construction (GRALAN entity classification) | Citations are free-generated as [CHUNK_XXX] then post-hoc resolved and validated | Fabricated / vague / low-credibility citations are caught downstream (or not) instead of being impossible upstream |
| G23 | Instruction adherence: user directives compiled into enforced constraints (platform doctrine "user selections trump auto-ranking") | Chat asks like "do not use the transcript" or "more graphics" live only as transient prompt text | Retrieval and deck planning ignore them: transcript chunks keep winning relevance ranking; visual quota stays at its default. THE top colleague complaint (F5) |
| G24 | Deck-level typographic consistency (Venngage brand-kit principle; NXT token discipline) | Type tokens exist, but per-slide autofit/overflow shrinking resolves each slide independently | Same-role text (body, kicker, stat) renders at visibly different sizes across slides of one deck (colleague F3) |
| G25 | Positive writing-craft guidance: rhythm, sentence variation, specificity (humanize method) | Anti-slop stack is ban-list based (what NOT to write) + content budgets | No affirmative craft contract; vague sentences with no concrete actor/system pass every ban list (colleague F4) |
| G26 | Visual variety + density as gated properties (Venngage purpose-first; 2026-07-09 uplift direction) | deckPlanGate enforces a 40% visual quota | Quota says HOW MUCH, not HOW VARIED: archetype repetition and image-slot fill rate are still model discretion (colleague F1) |
| G27 | Three-tier library with frozen component APIs + promotion rule (pulse component-contract, ADR-006) | ONE Figma library + node-map registry + Method A archetype specs; bricks added ad hoc | No additive-only contract, no frozen prop/slot APIs, no >=2-contexts promotion rule, no Sandbox/Screens separation: brick drift and one-off components accumulate unguarded |
| G28 | Design-change gate spine G0-G5, every gate leaves a trace (pulse report-workflow) | Generation OUTPUT is heavily gated (deckPlanGate, auditGate); design-SYSTEM changes (new brick, new archetype, template edit) ship ungated | A new archetype can reach production with no spec, no lint, no judge, no promotion record - the design system evolves by accretion, which is where inconsistency (F1/F3) is born |
| G29 | Machine lint of design surfaces via Figma MCP: tokens-only, palette, anatomy checks emitting PASS/FLAG (pulse lint-guidelines skill) | [S] LOOK-at-Figma rule exists; token binding is convention enforced by review; export surfaces can carry raw px/hex | No automated tokens-only check on Figma bricks OR on the rendered #stage HTML twin; type/color drift is caught by eyeballs (colleague F3 is this gap surfacing) |
| G30 | Deviation register + ADR decision log: deviate deliberately, never silently (pulse 40-process, 00-project) | plans/ files and memory record big decisions; no design-decision ADR log, no deviation register | Settled design arguments get relitigated; lint violations have no disposition path other than fix-now; silent one-offs are undetectable after the fact |
| G31 | Coverage ledger: every published component maps to code or documents why not (pulse code-bridge Code Connect rule) | check:templates proves web.tsx==pptx.ts template SETS match; figma-page-coverage-ledger covers GOLD write-back only | No ledger tying every REGISTERED FIGMA BRICK to its renderer twins (archetype spec + web.tsx + slideToStageHtml + pptx lane) or documenting the no-counterpart reason; orphan bricks and unmapped archetypes are invisible |

Explicitly NOT adopted (with reasons, so successors do not relitigate):
- Token-level speculative decoding, KV-cache compression, quantization, MoE serving, operator
  fusion, PD disaggregation, sticky-session GPU routing (Unicom §3.1-3.3, §3.6-3.9, §4, §5.1-5.3,
  §5.5-5.7): HiC is API-only with no serving footprint; these are provider-side. Already recorded
  in the 2026-07-13 speculation augmentation; stands.
- GRALAN's trainable Graph Language Mediator / relational-token training: requires gradient
  access to a (frozen) LLM's embedding space; HiC is hosted-API-only. Its three design results
  transfer at the prompt/retrieval layer (C5b, V3) without the trainable component.
- Test-time training / weight updates (RSI §3.4), self-rewarding RL / self-play training loops
  (RSI §4): HiC does not train weights; its equivalent surface is the skill/harness layer, which
  WS-R covers.
- Fully closed-loop self-improvement (RSI closed-loop row): deliberately out; the human-on-the-
  loop + held-out-gate posture is both the platform doctrine and the survey's own recommendation.
- Model ensembling beyond the existing heuristic tri-model lane: cost-multiplied; the Unicom
  triad is honored as "routing identifies value, cascading controls depth" with ensembling
  reserved for the already-built heuristic critique surface.
- Third-party visual SaaS (Venngage/Canva/Midjourney as tools): the article's TOOLS are not
  adoptable (design-system-governed, self-contained pipeline is platform doctrine); its WORKFLOW
  and prompt-structure principles are adopted in WS-V.
- Pulse repo product content: the benefits-domain laws (favorability semantics, PEPY/PMPM
  basis, ownership semantics), demo-data master, page specs, and the shadcn/Lyra kit itself do
  not transfer; HiC keeps its own foundation (NXT tokens, Saira/Archivo + Lato, GOLD anatomy).
  A NEW Figma file is also not created: per converge doctrine WS-D restructures the EXISTING
  `iSQhAVM7SI4QHAWB7y9C2z` library into the three-tier contract instead of starting over.

## PART 2b - COLLEAGUE FEEDBACK TRACE (volunteered user reports -> root cause -> plan items)

Five findings from colleagues using HiC in production. Each is treated as ground-truth user
evidence (exogenous grounding per R2) and traced to a mechanism, not a vibe.

| F# | Verbatim gist | Root cause (verified against the current pipeline) | Items |
|---|---|---|---|
| F1 | "More variety in the slides; include more images/graphics" | The 40% visual quota (2026-07-09) bounds density but not VARIETY: archetype selection repeats, image slots go unfilled, and nothing enforces distribution across a deck | V1, V2, D2/D4 |
| F2 | "Pull from more credible sources, more so for citing on the slides" | Evidence hierarchy floors exist (>=60% external) but retrieval ranks by relevance only; credibility tier is scored by source-ranker AFTER the fact; citations are free-generated then resolved, so weak/vague attributions survive | V3, C5b, O1/O2 |
| F3 | "A lot of variety in text sizes; make it more consistent" | Per-slide autofit shrinks overflowing text independently per slide; content budgets exist but are enforced by shrink-at-render rather than truncate-at-compose, so each slide lands on a different effective type size | V5, D3(b) |
| F4 | "Original language is very vague and the sentences don't make sense" | Anti-slop is ban-list based; a sentence can dodge all 350+ bans and still say nothing (no named actor, system, or mechanism). Schema-tier deliverables on Flash amplify it | V6, plus the existing re-tier P1(a) Fable-vs-Opus writing bake-off |
| F5 | "Uploaded transcript dominates the slides even when I ask it not to; 'more graphics' asks are also ignored" | TWO defects, and the owner corrected the priority (2026-08-07): (a) ROOT CAUSE - retrieval lets upload-class chunks structurally dominate; the INTENT of the feedback is EQUAL PRIORITIZATION of ALL corpora (transcripts included) by objective relevance, per vision phase 1 "relevance = the user's objective, not source type" - NOT exclusion; (b) chat directives are transient prompt text nothing enforces | V7 (ROOT: balance-by-default), V4 (explicit user override only), V2, L1 telemetry |

F5 is the highest-severity finding because it breaks the product promise in the app's own name:
the human is not in control when explicit instructions lose to auto-ranking. It is also the
platform's own standing rule ([S] user selections trump auto-ranking, 2026-06-16) not yet
extended from KL/cached-wiki selections to chat directives.

### Coverage verdict (owner-requested, v3): does every colleague finding have a solution?

YES - all five findings have named plan items, and v3's WS-D strengthens three of them. Stated
per finding, with the two honest dependency caveats the owner should know:

- F1 (variety + more images): SOLVED by V1 (variety/fill gates) + V2 (density responsiveness)
  + D2/D4 (the component library grows new gated bricks, widening the supply of visual forms).
  CAVEAT 1: the image/diagram SUPPLY side (vector bricks, diffusion-art replacement, new
  exhibit families) is owned by the in-flight slides-strategic-visual-uplift-2026-07-09 plan,
  which this plan extends but does not re-scope. If that plan stalls, F1 is only half-solved:
  the gates here would enforce variety over a supply that is still too narrow. Recommendation:
  keep that plan's remaining items funded alongside WS-V/WS-D.
- F2 (credible sources, cited on slides): SOLVED by V3 (citation-as-selection from a
  credibility-ranked candidate list; fabricated citations impossible by construction) +
  credibility-weighted Layer-2 ranking + O1/O2 (`verified` + staleness lifecycle). No caveat.
- F3 (inconsistent text sizes): SOLVED by V5 (compose-time budgets, quantized token ramp,
  deck-wide role harmonization) + D3 (tokens-only machine lint on the export surface makes the
  fix PERMANENT: a raw px font size becomes a lint FLAG, not a reviewer catch). No caveat.
- F4 (vague language / sentences that don't make sense): SOLVED on the harness side by V6
  (specificity + rhythm detectors in the revise loop) and on the model side by the re-tier
  plan's P1(a) Fable-5-vs-Opus writing bake-off. CAVEAT 2: V6 detects-and-revises; it cannot
  guarantee prose quality from the cheap tier by itself, which is why Q1's cascade gate REQUIRES
  the V6 detector and why the writing-class artifacts stay on the bake-off-winning model. Her
  editing burden should drop measurably (edit-learning logs are the metric), but F4 is the one
  finding whose fix is partly an open empirical question (the bake-off) rather than pure
  engineering. If the bake-off shows no model clears the bar, the fallback is raising V6 from
  detect-and-revise to a hard gate on writing-class artifacts.
- F5 (transcript dominates; "exclude it" and "more graphics" ignored): SOLVED by V7 + V4 + V2,
  with an OWNER CORRECTION (2026-08-07) recorded here so the intent is never re-misread: the
  feedback's intent is EQUAL PRIORITIZATION of all corpora (transcripts included) by relevance
  to the research objective - vision phase 1. The DEFAULT fix is therefore V7's retrieval-time
  source-type balance (upload-class chunks capped at 40% of auto picks while external
  candidates remain - the retrieval twin of the evidence hierarchy's external floor; never a
  universal exclusion; upload-only corpora never starved; user selections never capped). V4's
  exclusion compiler is the EXPLICIT, per-session, liftable user override on top of that
  default - a control surface, not the solve. No caveat.

Nothing she raised is unaddressed. The two caveats above are dependencies, not gaps: both have
named owners (the 2026-07-09 plan; the re-tier bake-off) and fallbacks recorded here.

---

## PART 3 - WORKSTREAMS

Every item names its files, its evidence gate, and its phase. NOTHING repoints routing, relaxes a
gate, or writes a skill without its stated evidence. All items reversible by env flag or one
registry edit unless noted.

### WS-C - Cache economics (CAPC + GPT-5.6 plan). Highest certainty, first money.

- C0 (P0, decided elsewhere): execute the two reviewed 2026-07-13 decisions as written: GPT-5.6
  explicit breakpoints + telemetry (items 1-6) and Predicted-Outputs repair lane (items 7-9).
  Files: `proxy/app.py` OpenAI chokepoint (~line 10548). Gate: 30-day hit-rate >= ~10% on the
  OpenAI path else flag off (as specified there).
- C1 (P0): measure rho(N,|P|) on OUR workload. Port the CAPC RUN_NONCE characterization: a
  ~$5 offline script (`scripts/cache-characterize.mjs`) that sweeps prefix sizes {2k, 3.5k, 8k,
  30k, 100k tokens} x N=30 calls against claude-opus-4-8 and the re-tier candidates, logging
  `cache_read_input_tokens` / `cache_creation_input_tokens`. Output: a wiki page
  `wiki/benchmarks/prompt-cache-tiers.md` with the measured threshold. Rationale: CAPC's 3,500 is
  a Sonnet-4.6-May-2026 number; we need OUR number before C2/C3. Gate: n=3 trials, sigma
  reported.
- C2 (P0, after C1) - IMPLEMENTED 2026-08-07 WITH A CORRECTION: tier AWARENESS, not a floor
  raise. Re-derived cost math at implementation time: even at the hot-tier rho~0.83, a cached
  prefix costs ~0.30x vs 1.0x uncached (0.17x1.25 + 0.83x0.1), so raising the WRITE floor to
  the tier threshold would be a cost REGRESSION - the original ~1024-token provider-minimum
  floor stays. The tier threshold instead governs SIZING decisions and telemetry:
  `ANTHROPIC_CACHE_TIER_TOKENS` (default 3500; refined by C1) now classifies every injected
  breakpoint's cumulative prefix as hot/persistent, feeds the C3 buckets, and is the sizing
  input for the C5 digest. Shipped in `proxy/app.py` (`_CACHE_TIER_MIN_CHARS`, telemetry in
  `_inject_anthropic_cache_control`). Gate unchanged in spirit: tier-bucketed hit rates prove
  economics; zero quality surface touched.
- C3 (P1): cache telemetry as a first-class dashboard. Book per-call `cache_read` /
  `cache_write` tokens per provider into costMeter with prefix-size bucket + `mutated_fraction`
  (hash the assembled prefix per session turn; report what fraction of the previously-cached
  prefix changed). Surface in the cost-telemetry wiki page. Files: `proxy/app.py` (usage capture
  already exists for OpenAI in C0; add Anthropic/Gemini), `services/costMeter.ts`. Rationale:
  CAPC §7.2's finding that cost sign flips on mutated-fraction; today we cannot see it. Gate:
  dashboard live; 30-day baseline captured before C4/C5 land so their effect is provable.
- C4 (P1): AdaptiveCacheBoundary for the engagement block. Port CAPC §5.3 (~80 lines of
  Python, pseudocode in the paper): fingerprint sentence/segment positions of the assembled
  [stable core][engagement] prefix across turns within a session (K>=3 observations,
  eps_static=0.05, eps_quasi=0.30, whitespace-normalized), and move the second/third breakpoint
  to the maximal STATIC/QUASI boundary instead of the hand-placed marker. Marker placement stays
  as the cold-start default. Files: new `proxy/cache_boundary.py` + hook in
  `_inject_anthropic_cache_control`; shared-SQLite ns="cacheseg". Gate: mutated-fraction (C3)
  drops on engagement sessions with no hit-rate loss; env-flag `ADAPTIVE_CACHE_BOUNDARY`.
- C5 (P1): manifest Layer-1/Layer-2 split (the CAPC graphify result, which is architecturally
  HiC's manifest). Build a QUERY-AGNOSTIC compressed manifest digest per engagement: top concept-
  graph nodes by degree, per-concept 1-line summaries, cross-doc edge list, source census -
  target 8-15k tokens (persistent tier, size-checked against C1), composed ONCE per corpus
  version and injected as a CACHED block in the [engagement] segment for every generator +
  Analyst chat call. Per-query chunk dereference (pickChunksForPrompt / fetch-articles) stays
  dynamic Layer 2, unchanged. This is anti-RAG conformant: Layer 1 IS the manifest seed, not
  embedding retrieval. Files: `proxy/wiki_chunker.py` or new `proxy/manifest_digest.py`
  (producer, content-hash salted by corpus version), `services/wikiService.ts::
  loadGenerationContext` (consumer), prompt assembly call sites. Gate: A/B on the e2e suite -
  equal-or-better citation diversity + gate pass rate, and measured input-token cost per
  deliverable down (CAPC saw 49% vs cache-only; even 15% here is large). This is the single
  biggest projected cost lever in this plan.
- C5b (P1, NEW in v2, rides with C5): GRALAN-informed traversal + structured presentation.
  Two changes to how Layer 2 is picked and shown. (i) TRAVERSAL: make the WS-G concept-graph
  walk QUESTION-FOCUSED - extract seed entities + seed CONCEPTS from the objective/prompt (the
  briefParser already does entity work), then expand edges by a relevance-priority queue with an
  adaptive threshold and a governed DEPTH CAP (default 3; both become tunable manifest-retrieval
  params instead of implicit constants). GRALAN's ablation: threshold ~0.7 and depth 3 optimal,
  depth 4 degrades; we tune on our own eval set. (ii) PRESENTATION: inject the retrieved slice
  STRUCTURE-PRESERVING instead of flat chunk prose - a delimited block of {global engagement
  context (the C5 digest, cached)} + {top-K chunks WITH their concept labels and related_chunks
  edges} + {the task}. GRALAN measured flattened graph text scoring below no-graph baselines;
  HiC's flat chunk injection is the same failure shape. Files: the WS-G traversal code path
  (`proxy` manifest retrieval + `chunk-retrieval-strategist` contract), prompt assembly in
  `corpusChatService` / generators. Gate: A/B on the e2e suite - citation precision (cited
  chunk actually supports the claim, audited by evidence-quality-auditor) and multi-hop
  synthesis quality up; noise-chunk rate down; no cost increase (structure adds <=10% tokens
  over flat).
- C6 (P2): verified semantic cache for Analyst chat (plain, non-hashtag lane only). GPTCache-
  style: embed query (existing embed cache), ANN over prior Q->A within the SAME engagement +
  corpus version, then a VERIFIER call (gemini-3.5-flash: "same question, logically equivalent
  answer expected? YES/NO") before returning a cached answer; misses fall through. Never applied
  to artifact generation. Files: `proxy/app.py` new ns="semcache" + verifier fn;
  `corpusChatService.ts` opt-in header. Rationale: Unicom §5.4 including its failure mode
  (activate-vs-cancel) and the verifier-model fix. Gate: shadow mode first (log would-have-hit +
  verifier verdicts for 2 weeks, no serving); enable only if verified-hit precision >= 0.95 on
  the shadow log.
- C7 (P2): difficulty-adaptive budgets. Per-artifact-class output/thinking budget policy derived
  from gate history: artifact classes whose gate pass-rate is >=0.95 at default effort get a
  reduced-effort/thinking profile; classes below 0.8 keep or raise it (DAST direction,
  correctness-per-token as the metric, computed from existing gate ledgers). Applied via the
  provider adapters' existing params (Anthropic thinking budget, Gemini thinkingConfig, gpt-5.6
  reasoning effort). Files: `services/aiRouter.ts` (budget column in the registry),
  `services/costMeter.ts` (correctness-per-token). Gate: bake-off per adjusted class - gate pass
  rate within 2pp of baseline at lower spend; one-flag revert per class.

### WS-L - Loop engineering (LoopsBench). Makes long-horizon runs measurable, resumable, regression-proof.

- L1 (P0): loop-trace metrics on the existing substrate. Compute per-run: rounds (provider-call
  segments), fallback events, gate-failure->repair counts, REGRESSION EVENTS (a previously
  gate-passing artifact failing its gate after a later pipeline step touched shared state),
  plan-fidelity (planned vs executed stage order), and (v2) DIRECTIVE-ADHERENCE events (a V4
  constraint that retrieval or planning would have violated without enforcement - the F5
  telemetry). Append to a new `wiki/synthesis/loop-trace-ledger.md` (append-only, like
  yield-ledger) from the existing M1 trace writer. Files: the trace-writing chokepoint in
  `proxy/app.py` / session services; ~100 lines. No behavior change - measurement only. Gate:
  ledger populates on the next 5 live runs; epoch-proposer's inspection cadence (its SKILL.md)
  gains step "4. read loop-trace-ledger".
- L2 (P0): regression obligations for the harness. LoopsBench's core mechanism, applied to the
  repo: the golden set + a frozen corpus of previously-PASSING artifacts (per deliverable class)
  becomes a standing regression suite that MUST re-run green before (a) any SkillOpt promotion,
  (b) any epoch-proposer application, (c) any aiRouter repoint (the re-tier P2 included). Today
  the golden-set gate fires at epoch time only; extend `scripts/validate-candidate.py` and the
  re-tier protocol to invoke the same gate. New: `scripts/regression-obligations.mjs` wrapping
  scripts/benchmark.mjs + the deterministic gates (deckPlanGate, compile gate, anti-slop scan)
  over the frozen corpus. Files: scripts/, `hic-workspace/wiki/eval/golden-set.json` (extend with
  per-class frozen artifacts). Gate: suite runs < 10 min offline at Flash pricing; documented in
  the SkillOpt README as a mandatory layer 4.
- L3 (P1): plan-DAG artifact per run. Before a multi-deliverable run executes, the planner emits
  `plan.json` {nodes: stages/deliverables, edges: data dependencies, layer} into the session AIR;
  the runtime records executed order; L1's ledger computes edge/layer fidelity. Independent
  stages become explicitly parallelizable (ready frontier), replacing implicit serialization.
  Files: `services/researchPlanner` surface + AIR schema + session trace. Rationale: LoopsBench
  RQ2 - closed-loop planners that maintain an explicit DAG hold concurrency without regressions;
  HiC's parallel-deliverable-runner agent gets a contract instead of vibes. Gate: plan present on
  100% of multi-deliverable runs; fidelity metrics appear in the ledger; measured wall-clock drop
  on runs with >=2 independent deliverables.
- L4 (P1): residual continuation (outer loop). Persist enough AIR state that an interrupted or
  partially-failed run can be resumed by a fresh invocation that reads {plan.json, completed
  units + their gate verdicts, remaining frontier} and continues ONLY the residual, with
  completed units' gates re-run first (regression check per L2). LoopsBench: outer continuation
  lifted resolve ~50% relative; fresh-restart-without-state (Ralph) was worst, so the state
  contract is the point. Files: session persistence already stores most of this; add a
  `resumeRun(sessionId)` entry in App.tsx/state machine + proxy job model. Gate: kill a live run
  mid-pipeline in staging; resume completes with zero re-generation of completed passing units.
- L5 (P2): worker-return state contract for pods/subagents. Where HiC fans out (proto pods,
  parallel-deliverable-runner, dissent-panel), the coordinator must merge a STRUCTURED return
  {artifacts, gate verdicts, obligations touched} rather than prose summaries, and re-check
  obligations on merge (LoopsBench RQ3: dynamic workflows win but regressions persist when
  worker returns are untracked). Files: subagent definitions in `.claude/agents/` + the runner
  skill. Gate: zero untracked-merge regression events in the L1 ledger over 10 runs.

### WS-R - Gated self-improvement (RSI survey). Compounding without collapse.

- R1 (P0): verification-hierarchy audit + rule. One doc pass classifying every gate/critic/
  scorer by rung (1 deterministic code: compile gate, deckPlanGate, tsc, template parity;
  2 execution/held-out: golden set, e2e suite, benchmark.mjs; 3 learned judge: kill-only Critic,
  auditGate LLM legs, dissent-panel; 4 intrinsic: any self-critique without external signal).
  Codify the rule in `.claude/UNIFIED_VISION.md` phase 7: NO improvement loop may promote on
  rung-3/4 signal alone; every promotion needs at least one rung-1/2 signal. Audit output:
  `wiki/synthesis/verification-hierarchy.md` listing each loop and its rungs; any rung-4-only
  loop found is remediated or deleted. Cost: documentation + at most small gate wiring. Gate:
  zero rung-4-only promotion paths remain.
- R2 (P0): minimum-grounding rule (Mirror Loop / collapse theory). Every SkillOpt batch and
  every epoch proposal must carry at least one EXOGENOUS signal: user checkpoint edits, live-run
  gate outcomes, or held-out golden items - never only model-scored rollouts. Enforce in
  `scripts/build-training-set.py` (reject a batch whose rollouts are 100% synthetic/model-scored)
  and in the epoch-proposer SKILL.md acceptance rule. Rationale: pure closed loops degrade
  (Shumailov/Zenil); the exchange rate is unknown, so the floor is "some, always". (v2 note: the
  PART 2b colleague findings are exactly this signal class; F1-F5 seed the next SkillOpt batch.)
  Gate: batch metadata records grounding provenance; validator rejects otherwise.
- R3 (P1): rubric evolution behind the held-out gate (Red Queen, SHARP-constrained). The
  evolvable surface is ONLY the rubric documents (R1-R20, auditGate checklists, per-deliverable
  scoring rubrics) - auditable, diffable, rollback-able, exactly the SHARP pattern. Source
  signals: edit-learning constraints, dissent-panel survivals/overrules, gate-failure clusters
  from L1's ledger. Proposal path reuses SkillOpt's machinery (rubrics are skill-shaped docs);
  promotion requires: (a) held-out golden-set score does not drop, (b) frozen-corpus regression
  suite (L2) green, (c) human approval (rubric diffs are small and readable). Explicitly NOT
  evolving: the deterministic gates, the anti-slop lexicon (owner-controlled), the citation
  protocol. Files: extend `scripts/run-skillopt.py` target list + validate-candidate layers.
  Gate: first evolved rubric ships only after one full A/B (old vs new rubric judging the same
  frozen corpus) shows agreement-with-user-edits improves.
- R4 (P1): BinEval decomposition of the Critic. The kill-only Critic and auditGate LLM legs emit
  per-criterion atomic YES/NO verdicts (each criterion one checkable sentence) aggregated by
  code, instead of holistic verdict+prose. Makes critic disagreement debuggable, feeds R3's
  failure clusters, and reduces judge-bias surface (verbosity/position). Files: the critique
  prompt templates in the heuristic/audit services + `collapseAndScore`. Gate: criterion-level
  agreement matrix between tri-model legs computed on the frozen corpus; overall gate pass/fail
  decisions unchanged on >=95% of the corpus (compatibility check) before switch-over.
- R5 (P2): experience graph over traces. Promote the branch-execute-fail-repair structure into
  a queryable substrate: each gate failure + repair outcome becomes a node linked
  {artifact class, failure criterion (R4), repair action, outcome} in the wiki (schema per
  AGENTS.md), retrievable by the epoch-proposer and by generation-time context loading
  ("known failure modes for this deliverable" - the anti-patterns pages become data-driven).
  Files: `proxy` trace writer -> `wiki/experience/` pages + manifest chunks. Rationale: RSI §5.5
  - process-level improvement is capital expenditure; HiC currently re-pays grep over raw traces
  every epoch. Gate: epoch-proposer cites experience nodes instead of raw-trace greps in >=1
  applied epoch; retrieval adds <=1.5k tokens to generation prompts (fits Layer 2).
- R6 (P2): diversity guard on the compounding loop. cross-engagement-pattern-miner output biases
  VS frames; SkillOpt trains on rollouts influenced by those frames - a homogenization loop.
  Add a diversity metric (distinct-n / embedding dispersion) over each SkillOpt training batch
  and over VS candidate sets; alert (not block) when dispersion drops >20% across consecutive
  batches. Files: `scripts/build-training-set.py`, verbalized-sampling skill note. Gate: metric
  logged per batch; threshold tuned after 4 weekly runs.

### WS-V - Visual, typographic, writing-craft, and instruction-adherence uplift (NEW in v2).
Directly answers PART 2b. EXTENDS slides-strategic-visual-uplift-2026-07-09 (gate spine, 40%
quota, svgBlip, new bricks); nothing here re-audits that plan's scope.

- V4 (P0, FIRST - it is the "Humans in Control" promise): directive-to-constraint compiler.
  A small parser step (gemini-3.5-flash, one call per user chat turn that carries an imperative)
  maps chat directives onto a TYPED session-constraint object persisted in the session AIR:
  `{exclude_sources: [sourceId|uploadId], include_only: [...], min_external_share, visual_quota,
  archetype_prefs, tone_directives[]}`. Enforcement is DETERMINISTIC downstream, never prompt-
  hoped: (a) `pickChunksForPrompt` / manifest traversal filters excluded sources BEFORE ranking
  (a transcript the user excluded can no longer win relevance); (b) deckPlanGate reads
  `visual_quota` / `archetype_prefs` as parameters; (c) the constraint object is echoed back to
  the user in chat ("Enforcing: transcript excluded from citations; visual density raised") so
  control is visible; (d) constraints persist for the session until the user lifts them, and are
  logged per L1. This EXTENDS the standing rule [S] user-selections-trump-auto-ranking from KL
  selections to chat directives. Files: `services/corpusChatService.ts` (directive parse +
  session store), `proxy` manifest retrieval filter, `deckPlanGate` params, AIR schema. Gate:
  e2e tests - "create slides, do not use anything from the transcript" yields ZERO citations
  resolving to the excluded upload (deterministic check over the AIR citation map); "include
  more graphics" measurably raises the visual-slide share of the emitted plan. Solves F5.
- V1 (P0): archetype-variety + image-coverage gate. Extend deckPlanGate with deterministic
  variety rules alongside the 40% quota: (a) no more than 2 consecutive slides of the same
  archetype; (b) minimum distinct archetypes as a function of deck length (e.g. >=6 distinct for
  a 12-slide deck); (c) image-slot fill floor - every archetype with an image slot ships it
  filled (content-true icon gate and photographic/diagram lanes already exist as suppliers; the
  gap is the unfilled-slot escape). Failure = repair re-ask with the violation named (existing
  gate-repair loop). Files: `deckPlanGate` in the composer path, `services/slideComposer.ts`.
  Gate: frozen-corpus re-render - archetype entropy and filled-slot rate rise; deck gate pass
  rate does not fall. Solves F1 (variety half).
- V2 (P1): visual-density responsiveness. `visual_quota` and `archetype_prefs` from V4 flow
  into deckPlanGate and the DECK MODE prompt (creative-direction phrasing per the Venngage
  four-element prompt structure: subject, tone, style, format - the deck-composer skill gains a
  short "visual direction" block assembled from the constraint object rather than ad-hoc user
  text). Files: deck-composer skill injection point, deckPlanGate. Gate: same e2e as V4(b) plus
  visual QA screenshot pass. Solves F1 (density half) + the "more graphics ignored" part of F5.
- V3 (P1): citation-as-selection (GRALAN entity-classification principle applied to grounding).
  At generation time the prompt carries an ENUMERATED, credibility-ranked candidate list (the
  Layer-2 picked chunks, each with source name + credibility tier from the source-ranker rubric
  + `verified` flag from O1); the model MUST cite by candidate index; free-text citations are a
  gate violation. slidePostProcessor validates index-resolution instead of regex-rescuing
  fabricated strings. Slide surfaces render the resolved source name; credibility class stays in
  data attributes (no visible chrome, per the reporting-depth ban). Retrieval-side: the
  Layer-2 ranker gets a credibility-tier term alongside relevance (weights owner-tunable), so
  higher-tier sources are proportionally over-represented in the candidate set to begin with.
  Files: prompt assembly (generators + DECK MODE), `citationResolver.ts`,
  `slidePostProcessor.ts`, manifest ranker. Gate: frozen-corpus A/B - fabricated/unresolvable
  citation rate drops to ~0 by construction; external-share and tier-1/2 source share rise;
  evidence-quality-auditor verdicts improve. Solves F2.
- V5 (P1): deck-level typographic harmonization. Three mechanisms, all in the composer/export
  twins: (a) BUDGET AT COMPOSE TIME - content budgets become a hard compose-time gate (truncate/
  re-ask on overflow) so render-time autofit rarely fires; (b) QUANTIZED RAMP - where autofit
  must fire, it snaps to a token-defined type ramp (2-3 discrete steps per text role, tokens
  from `/api/design-tokens`), never continuous shrink; (c) DECK PASS - after composition, one
  harmonization pass sets each text ROLE (body, kicker, stat, quote) to the minimum step any
  slide required, deck-wide, so same-role text is same-size everywhere. Files:
  `services/slideComposer.ts`, `services/slideToStageHtml.ts` + `components/slideTemplates/
  web.tsx` (twins stay in sync; `npm run check:templates`), `proxy/gold_pptx_export.py` (export
  parity). Gate: deterministic check on the frozen corpus - per-role font-size variance across
  each deck ~0; visual QA screenshot pass; PPTX export parity. Solves F3.
- V6 (P1): affirmative writing-craft contract (humanize method, formalized). Add to the
  deck-composer / strategy-author skills and to slidePostProcessor as a DETECT tier (not
  auto-rewrite): (a) SPECIFICITY RULE - every content sentence names at least one concrete
  actor, system, number-in-quote, or proper noun; sentences failing it are flagged for the
  revise loop ("vague sentence: names nothing"); (b) RHYTHM RULE - sentence-length variation
  target per narrative block (no more than 2 consecutive sentences within +-3 words of each
  other); (c) reframing-contrast cap stays a hard ban (already in the lexicon); (d) the craft
  rules ride the existing criticReviseLoop as a named critic, NOT a new pipeline. Grounded in
  the humanize method's core claim: improvement comes from rhythm, variation, and specificity,
  not word swaps - HiC has the word-swap half (bans) already. Files: skill docs +
  `slidePostProcessor.ts` detection patterns + critic prompt. Gate: A/B on the frozen corpus
  judged by the R4 atomic critic + a human spot-read; user-edit rate on language (the F4 signal,
  measurable via edit-learning logs) declines over the following month. Solves F4. (The re-tier
  plan's Fable-5 writing bake-off is the model-side half of F4; V6 is the harness-side half and
  applies whichever model wins.)

### WS-D - Figma design-system governance (NEW in v3; the pulse repo's machinery, generalized).
Purpose: EXTREME output consistency + NXT brand adherence across every HiC deliverable, by
governing how the design system itself changes and by machine-enforcing token discipline on
every output surface. CONVERGES on the existing assets: the `iSQhAVM7SI4QHAWB7y9C2z` library +
NXT/NU token modes, `figma-node-map.md`, `figma-tokens.json` + `/api/design-tokens`, Track B
Method A, the GOLD write-back program (waves 2-4 fold into D2), check:templates, and the
export-render-verifier / spa-smoke-tester agents. Nothing is rebuilt; the pulse CONTRACT is
laid over what exists. All Figma work goes through the Figma MCP ([S] LOOK-never-assume;
/figma-use loaded before every use_figma; the createNodeFromSvg await-settle and publish
opacity/variant-surgery quirks from both the pulse figma-map and HiC memory apply).

- D1 (P0): the HiC Design Constitution - laws, contract, ADRs, deviations. Author the
  governance documents, generalized from pulse to HiC's domain:
  (a) `wiki/brand/design-laws.md` - the HiC laws, machine-checkable phrasing. Adopted from
  pulse: 1 TOKENS ONLY (every color/radius/spacing/font on every brick AND every rendered
  deliverable binds a token from `/api/design-tokens`; App/Brand marks the sole sanctioned
  exception); 2 LEAN COMPOSITION (compose from registered bricks; never redraw, never detach;
  a brick that fights you is a library gap to flag); 3 FROZEN BRICK APIs + PROMOTION RULE (a
  composition becomes a registered brick at >=2 deliverable contexts AND >=2 primitives or
  product structure; published brick prop/slot APIs change only via ADR; additive is free);
  4 ONE DATA STORY (every figure derives from the engagement corpus via cited quotes - HiC's
  Quantitative Claim Rule IS this law); 5 EVIDENCE STATED, NOT IMPLIED (citation protocol +
  V3 selection); 6 PROVENANCE ON EVERY EXHIBIT (per-chunk source lineage, the WS-A contract);
  7 HONEST GAPS (already law: no fabrication, no EVIDENCE-GAP chrome - narrow the section);
  8 DATA GEOMETRY IS INSTANCE TERRITORY (bricks carry anatomy, instances carry data; fixed-
  children bricks never grow in instances - the GOLD-matrix auto-layout rule generalized);
  9 CONTROLS CARRY INTERACTION CONTRACTS (#proto surfaces: no decorative controls);
  10 GRAPHIC COLLISION BANS (already law in .claude/CLAUDE.md; folded in as lintable).
  (b) `design-desk/adr/` - the ADR log seeded by back-filling the already-settled arguments
  (Method A over hardcoding; NU-as-mode-not-file; D17 native-render-never-image-gen; em-dash
  ban; Saira swap; content-true-icons-or-nothing) so they stop being relitigatable memory.
  (c) `design-desk/deviation-register.md` - deviate deliberately, never silently: every D3
  lint FLAG is fixed or logged with what/why/who-approved/until. Pure documentation + one
  skill update (the `designer` and `deck-composer` skills reference the laws). Gate: docs
  reviewed by owner; laws phrased so D3 can check each one mechanically.
- D2 (P1): three-tier restructure of the EXISTING library + Sandbox/Screens discipline.
  Tier 1 FOUNDATION: the `NXT Brand Tokens` collection (both modes) + primitive styles -
  READ-ONLY for everyone but the owner (matches pulse kit governance; token edits re-pull
  `figma-tokens.json` via D6, never hand-mirrored). Tier 2 `DS/*` COMPONENT LIBRARY: the
  registered bricks (18 GOLD templates' components, the `slides:` archetype bricks incl. the
  six 2026-07-09 additions, diagram/exhibit frames, proto partials) organized into published
  component families with per-component usage-contract descriptions, additive-only, APIs
  frozen per D1 law 3. Completing GOLD write-back waves 2-4 happens INSIDE this tier and
  contract (the existing figma-page-coverage-ledger becomes D5's ledger seed). Tier 3
  EXEMPLARS file: Screens-equivalent = the canonical per-deliverable exemplar pages (the
  reference decks / GOLD pages the generators are judged against); Sandbox-equivalent =
  per-designer/per-proposal named sections where new archetypes are drafted (D4's G1 home).
  All authored via Figma MCP (`figma-generate-library` + `figma-use` skills). Gate: the
  registry (`figma-node-map.md`) re-chunked from the restructured library; every registered
  brick carries a usage-contract description; zero generator behavior change (registry
  pointers only) verified by the L2 frozen-corpus regression suite.
- D3 (P1): design-lint skill + export-surface token lint (the pulse `lint-guidelines` skill,
  generalized to BOTH surfaces). (a) FIGMA SURFACE: a `.claude/skills/hic-design-lint` skill
  that machine-checks a brick or exemplar frame by node-id via MCP (get_variable_defs +
  get_design_context + get_screenshot): tokens-only, no detached instances, frozen-API
  conformance, anatomy, collision bans - emitting PASS/FLAG with one-line evidence, FLAGs
  dispositioned per D1(c). (b) RENDER SURFACE: a deterministic DOM audit in the export path
  (the #stage HTML twin + gold_pptx_export input): every computed font-size/color/spacing
  must resolve to a token value from `/api/design-tokens` (V5's quantized ramp makes this
  checkable); raw hex or off-ramp px = gate FLAG. This is what makes F3's fix PERMANENT and
  brand adherence EXTREME in the literal sense: token conformance is checked on every export,
  not asserted. Files: new skill + `services/slideToStageHtml.ts` audit hook +
  `proxy/gold_pptx_export.py` preflight. Gate: frozen-corpus exports pass at 100% after V5
  lands; a seeded raw-hex violation is caught in tests.
- D4 (P1): the design-change gate spine (pulse G0-G5, generalized to design-SYSTEM changes;
  runs alongside WS-L's runtime gates, does not replace them). Any NEW brick, archetype,
  template, or visual family - and any change to an existing one - walks: G0 SPEC (which
  deliverables need it, the content shape it carries, the question it answers; numbers-from-
  corpus rule stated) -> G1 SANDBOX + SELF-LINT (draft in the Tier-3 Sandbox section via MCP;
  D3(a) lint clean or deviations logged) -> G2 PERSONA JUDGE (the existing screenshot ->
  creative-director-analyze standing rule formalized: the CD persona + the relevant
  per-deliverable auditor subagent file a dated critique in `design-desk/critiques/`; real
  user feedback outranks the persona) -> G3 OWNER REVIEW (adopt/adjust/reject per finding; new
  decisions become ADRs) -> G4 PROMOTE (publish to DS/* with force-update of stale instances;
  re-chunk the node map; registry entry added; exemplar page updated) -> G5 RENDERER TWINS
  (archetype spec + web.tsx + slideToStageHtml + pptx lane implemented 1:1; check:templates +
  D5 ledger green; export-render-verifier visual pass vs the Figma exemplar - the /gallery
  equivalent). Every gate leaves a trace. Enforcement: the seven-step artifact build routine
  and the deliverable-authoring skills reference the spine; L2's regression suite blocks
  promotion of a change that breaks frozen-corpus renders. Gate: the NEXT new archetype ships
  through all six gates with its trace files as the worked example (mirroring pulse's
  worked-example-dashboard.md).
- D5 (P1): brick coverage ledger (the Code Connect coverage rule, tier-independent since
  actual Code Connect stays blocked on the Figma plan). One ledger
  (`wiki/brand/brick-coverage-ledger.md`, seeded from figma-page-coverage-ledger): EVERY
  registered Tier-2 brick maps to {archetype spec id, web.tsx renderer, slideToStageHtml
  block, pptx export lane} OR carries a documented no-counterpart reason; every archetype maps
  back to its brick. Extend `scripts/check-template-parity.mjs` to fail on unmapped entries in
  either direction. Kills orphan bricks and unmapped archetypes structurally (the
  orphan-code-auditor pattern, applied to the design system). Gate: parity script green with
  the ledger as input; CI-style run in the L2 suite.
- D6 (P2): gated token-sync pipeline (the pulse `sync-tokens` bridge, reversed for HiC's
  direction of flow). One command (`npm run sync-figma-tokens`): pull both token modes from
  the library via MCP -> diff against `figma-tokens.json` -> show the diff as a gate (owner
  approves) -> write the JSON + re-chunk `figma-node-map.md` + bump `_DIAGRAM_STYLE_VERSION`
  (the render-cache salt) in one atomic change. Removes the documented manual re-pull ritual
  and the risk of the JSON drifting from Figma canon. Scheduled probe (weekly /loop or on
  publish announcement) reports drift without writing. Gate: a token edit in Figma reaches a
  rendered deliverable through the pipeline with the diff trace recorded; hand-edits to the
  JSON are rejected by a lint.

- V7 (P0, IMPLEMENTED 2026-08-07 - the F5 ROOT FIX per owner correction): source-type-balanced
  retrieval. In `pickChunksForPrompt`'s MMR pack, upload-class chunks (sourcePath/title carrying
  upload/transcript markers: `sources/uploads-*`, `uploads/`, `articles/client-uploads`,
  `cached-reuse-uploaded-documents`, transcripts) are capped at UPLOAD_MAX_FRAC=0.4 of the AUTO
  (non-user-selected) picks WHILE external candidates remain - generalizing the existing
  SOCIAL_MAX_FRAC mechanism (research-run-failure P0.1) so no source CLASS structurally
  dominates and objective relevance decides within the balance. Single-class corpora are never
  starved (cap = deferral, not exclusion); user selections are never capped; V4 exclusions stay
  the explicit override. Files: `services/chunkRetrieval.ts` (`wouldBreachSourceCaps` exported
  pure helper + pack-loop generalization), `chunkRetrieval.balance.test.ts` (7 tests). Gate:
  frozen-corpus A/B on the next transcript-heavy engagement - external citation share rises to
  the hierarchy floors without user intervention; edit-rate on "too much transcript" complaints
  drops.
- V8 (P1, NEW per owner 2026-08-07): human-readable theme names in the Knowledge Library. The
  KL Themes tab renders "Cluster 1117" + raw keyword chips (app, users, tracker...) - not
  human-readable and useless for selection decisions. Fix: every cluster surfaced in the KL
  gets an LLM-summarized THEME HEADING (an action-title-style sentence or tight noun phrase,
  e.g. "Grad-school applicants trade debt anxiety against program prestige" for
  school/masters/debt/program), generated via the EXISTING deterministic-naming machinery
  (multiModelResilience layer-4 signature-keyed cluster-name cache + temp0/seed per the
  deterministic-naming-pass skill; gemini-3.5-flash lane), computed once per cluster signature,
  cached in the topic cache so the KL loads instantly, keyword chips retained as secondary
  metadata under the heading. Batch-name on first KL open (progress indicator), then
  incremental. Files: the KL/topic-cache surface (`_topic-cache`, KnowledgeLibrary component),
  `services/multiModelResilience.ts` (existing signature cache), naming prompt under the
  anti-slop lexicon (headings obey action-title + no-naked-numbers rules). Gate: spot-read 30
  named clusters against their posts (judge + human); KL selection usage (clicks on themes)
  becomes measurable in L1 telemetry.

### WS-O - OKF conformance (second brain portability). Cheap, high option value.

- O1 (P1): frontmatter conformance layer. Add the OKF v0.2 lifecycle fields to the wiki schema
  in `hic-workspace/AGENTS.md` and the writers (`proxy` wiki write endpoints, wikiService):
  `type` (map existing page-type taxonomy), `generated` (bool - virtually all true),
  `verified` (set by gates/curator, default false), `status`, `stale_after` (per page type:
  benchmarks 90d, evidence 180d, frameworks none), keep `sources` (already richer than OKF's).
  ALL existing HiC fields remain as extension keys (OKF-legal). No mass rewrite: writers stamp
  new pages; wiki-curator backfills opportunistically. (v2 note: `verified` + per-source
  credibility feed V3's candidate ranking.) Gate: lint (`wiki/last-lint`) counts conformant
  pages; new pages 100% conformant.
- O2 (P1): staleness-driven curation + grounding. `stale_after` becomes machine-readable input
  to (a) the wiki-curator weekly loop (expired pages surfaced for refresh/retire - a dent in the
  broken-link/orphan backlog with a principled criterion) and (b) the CLEAN-GROUNDING rule:
  cached-wiki reuse scoring (the 0.45 auto-reuse floor) discounts pages past `stale_after` and
  boosts `verified: true`. Files: wiki-curator agent def, `services/wikiService.ts` reuse
  scoring. Gate: reuse-ranking A/B on one engagement: no loss in gate pass rate; stale citations
  (older than their class TTL) in fresh deliverables drop.
- O3 (P2): OKF bundle export per engagement (producer). `scripts/export-okf-bundle.mjs` walks
  an engagement's wiki slice (evidence, synthesis, sources census, deliverable summaries) into a
  standalone OKF bundle directory (index.md tree + conformant frontmatter + rewritten relative
  links), zippable for client handoff or ingestion by any OKF consumer (including Google's
  visualizer for a free knowledge-graph view). Read-only producer; zero pipeline risk. Gate:
  bundle passes the reference visualizer; one real engagement exported end-to-end.
- O4 (P2, watch item): OKF as an INGEST format. If clients/partners begin shipping OKF bundles,
  `/api/parse-upload` gains a bundle ingester that maps concepts to wiki pages with provenance
  intact. Do not build until the first real bundle arrives; record the intent here.

### WS-Q - Quality-cascade routing (Unicom triad). Gated cost reduction on the writing tier.

- Q1 (P1): cascade pilot on ONE artifact class. Pick the mid-tier class with the highest
  Opus spend and a strong deterministic gate (candidate: `#recs` or `#report` sections).
  Flow: gemini-3.5-flash (or sonnet-5 post-retier) drafts -> deterministic gates + R4 atomic
  critic score -> PASS ships, FAIL escalates to the artifact-primary model with the failure
  criteria injected (the EcoAssistant lesson: escalation WITH the failure evidence beats cold
  strong-model calls). The weak-model self-consistency signal (2 cheap samples agree -> trust)
  is optional phase 2. Files: `services/aiRouter.ts` (cascade policy column),
  `corpusChatService` dispatch; env-flag `CASCADE_PILOT`. Rationale: routing is prediction-
  before-execution; cascading is evaluation-after - HiC has the second half (gates) already
  built, which is the expensive part. (v2 caution from F4: vague language is a known weakness of
  the cheap tier, so the V6 specificity detector MUST be in the cascade's gate stack before the
  pilot starts, or the cascade will ship exactly the prose colleagues flagged.) Gate: bake-off
  on the frozen corpus - quality (gate pass + R1-R20 score + V6 craft flags) within noise of
  Opus-direct, cost/artifact down >=40%, latency increase acceptable (<1.5x p50). Only then
  consider a second class. NEVER applied to the writing-taste classes the re-tier plan assigns
  to Fable/Opus by bake-off evidence.
- Q2 (P2): circuit-breaker refinement. Extend provider health from binary 10-min cooldown to
  open/half-open/closed: after cooldown, route ONE probe call before restoring full traffic;
  track TPM consumption against a token-bucket per provider (quota-monitor's data, enforced at
  the pacer). Files: `services/multiModelResilience.ts`, rate-limit-pacer skill. Gate: simulated
  429 storm in tests; no thundering-herd re-entry.

---

## PART 4 - SEQUENCING AND BUDGET

P0 (this cycle, low risk; measurement, floors, rules, and the two user-facing fixes):
  C0, C1, C2, C3(start), L1, L2, R1, R2, V4, V1, D1. Plus the re-tier plan's own P0 (registry
  adds). Character: telemetry, regression suite, grounding rules, the two deterministic gates
  that answer the loudest colleague findings (F5, F1), and the design constitution (docs-only,
  zero runtime risk, prerequisite for all other D items).
P1 (next cycle, evidence-gated builds):
  C4, C5, C5b, L3, L4, R3, R4, O1, O2, Q1, V2, V3, V5, V6, V8, D2, D3, D4, D5. Each lands behind
  its stated gate; C5/C5b and Q1 are the two large cost levers, V3/V5/V6 are the remaining
  colleague-feedback closers, D2-D5 are the consistency spine; all A/B- or lint-gated on the
  frozen corpus.
P2 (following, option-value + hardening):
  C6, C7, L5, R5, R6, O3, O4, Q2, D6.

Budget estimates (offline evidence costs, not run-rate): C1 ~$5; L2 frozen-corpus suite ~$1-3/run
at Flash pricing; Q1 bake-off ~$10-20; R4 compatibility matrix ~$5; V-series A/Bs ~$10 total
(frozen-corpus re-renders at Flash + one visual-QA pass); C5b traversal tuning ~$5; D2-D4 are
mostly MCP authoring + lint runs (~$5 of judge calls per gated design change). All within
the platform's established bake-off spending pattern. Run-rate effects are REDUCTIONS
(C2/C5/C7/Q1) with C3 proving them; V4 adds one Flash micro-call per imperative chat turn
(negligible, and it PREVENTS wasted full generations that ignore the user's ask).

Dependencies: C2 needs C1's threshold. C5 needs C1 (size the digest into the persistent tier)
and C3 (prove the saving). C5b needs C5 (the digest is its global-context block). V2 needs V4
(the constraint object). V3 needs O1's `verified`/credibility fields for full effect but can
start on source-ranker tiers alone. Q1 needs L2 (frozen corpus) + R4 (failure criteria for
escalation injection) + V6 (craft detector in the cascade gate stack). R3 needs L1 (failure
clusters) + L2 (regression gate). L4 needs L3 (plan/frontier state). D2-D6 need D1 (the laws
they enforce); D3(b) needs V5 (the quantized ramp is what makes render-surface lint checkable);
D4 needs D2 (Sandbox home) + D3 (the G1 lint); D5 extends check-template-parity and feeds L2;
GOLD write-back waves 2-4 execute inside D2 rather than separately. The re-tier plan's P1
bake-offs and this plan's Q1 share scripts/benchmark.mjs and should run on the same frozen
corpus to keep evidence comparable.

## PART 5 - OWNER DECISIONS (RESOLVED 2026-08-07; implementation initiated)

Owner verdicts: (1) P0 scope APPROVED, implementation started same day. (2) C5 A/B bar as
stated. (3) Q1 pilot = #recs (default accepted). (4) R3 human approval on every rubric diff =
YES. (5)+(v3 O3) OKF bundle export APPROVED - build it, manual-run only, never automatic.
(6) V3 = hard gate on deck/artifact surfaces at launch, detect-only in chat for one cycle.
(7) V4 constraints persist for the WHOLE SESSION until explicitly lifted, always echoed back.
(8) V5 = budget-gate first, deck harmonization as fallback. (9) ONE tiered library (keep
iSQhAVM7SI4QHAWB7y9C2z; no new files). (10) D3(b) tokens-only export lint = detect-only two
weeks, then hard. (11) Foundation-tier token owner = Jonathan; everyone else read-only; agent
token-edit PROPOSALS only via the D6 diff gate.

### P0 IMPLEMENTATION RECORD (2026-08-07, same day - all L2 obligations green)

- D1 SHIPPED: `wiki/brand/design-laws.md` (10 laws, lint-phrased), `design-desk/adr/` (9 ADRs
  seeded incl. the v3 owner decisions), `design-desk/deviation-register.md` (2 standing rows),
  constitution pointers in the `deck-composer` + `designer` skills.
- R1 SHIPPED: `wiki/synthesis/verification-hierarchy.md` (rung audit of every gate + loop;
  zero rung-4-only promotion paths found); the rule codified in UNIFIED_VISION phase 7.
- R2 SHIPPED: `build-training-set.py` rejects synthetic-only batches + stamps `_grounding`
  provenance; epoch-proposer SKILL.md gains the exogenous-signal acceptance requirement and
  ledger inspection step 6.
- C0 SHIPPED: `_openai_apply_cache_controls` (gpt-5.6 explicit breakpoints from markers,
  `prompt_cache_options` 30m, model-gated; older models keep the strip), Predicted-Outputs
  forwarding (`_hic_prediction` -> `prediction` on chat gpt-4o+/5.x; popped elsewhere),
  telemetry for cached/write/prediction tokens.
- C1 RUN (~$4): rho=1.0 with sigma=0 at ALL sizes 2k-100k tokens on claude-opus-4-8 - the CAPC
  two-tier effect does NOT reproduce (their Scenario 3); results + caveats in
  `wiki/benchmarks/prompt-cache-tiers.md`; C5 digest sizing constraint relaxed accordingly;
  production tier telemetry (C3) remains the arbiter.
- C2 SHIPPED WITH CORRECTION (recorded above): tier awareness + telemetry, floor unchanged.
- C3 SHIPPED: per-provider per-day counters (reads/writes/fresh, tier buckets,
  mutated-fraction, prediction accept/reject) in shared sqlite ns=cachetelem;
  `GET /api/cache/telemetry`; Anthropic + Gemini + OpenAI paths booked.
- L1 SHIPPED: per-session loop aggregates folded from the M1 trace stream (rounds, fallbacks,
  retries, failures, repairs, REGRESSION events via step pass->fail transitions), flushed
  append-only to `wiki/synthesis/loop-trace-ledger.md` (finalize endpoint + stale sweep);
  `/api/sessions/loop-trace/event` books V4 directive-adherence.
- L2 SHIPPED: `scripts/regression-obligations.mjs` (tsc, vitest, template parity,
  benchmark --diff, proxy syntax) = `npm run regression:obligations`; wired as mandatory
  layer 4 in skillopt-batch.sh auto-promote; README updated. Two pre-existing dead-fixture
  tests (hardcoded deleted scratchpad paths) repaired to portable temp dirs.
- V4 SHIPPED (F5 fix): `services/sessionConstraints.ts` (deterministic directive compiler,
  whole-session persistence per decision 7, fuzzy source matching, visible echo-back, lift
  phrases); enforcement in `chunkRetrieval.pickChunksForPrompt` (excluded sources filtered
  BEFORE ranking, exclusions strip stale pins) and `corpusChatService.sendChatMessage`
  (compile + echo + gate params). 20 tests green.
- V1/V2 PART-SHIPPED: deckPlanGate already carried variety/adjacency/overuse rules
  (2026-07-09); added `visualQuotaFloor` parameterization (clamped 0.4-0.7) driven by the V4
  constraint from "more graphics" directives, with the raised floor named in the violation.
  Image-slot fill audit deferred to D3 render lint as planned.
- V7 SHIPPED (2026-08-07, same-day owner correction): the F5 ROOT fix - source-type-balanced
  retrieval (upload-class 40% cap on auto picks, generalizing the social cap; equal
  prioritization by objective relevance, never exclusion). 7 tests green; gates green.
  The owner's correction is recorded in PART 2b so successors never re-read F5 as "exclude
  transcripts": exclusion is only ever an explicit, per-session, liftable user ask (V4).
- V8 ADDED to the plan per owner (2026-08-07): KL cluster names -> human-readable theme
  headings (P1; existing deterministic-naming machinery; see WS-V item V8).
- D2 SUBSTANTIALLY EXECUTED (2026-08-07, owner goal: exhaustive hashtag design system): ten
  per-hashtag pages in the HiC-DS file, each with decomposed components -> variants ->
  exemplars mined from the renderer type anatomies (#slides cover+logo+img-slot, #themes
  ThemeCard x4 layouts + 1/2/3/4-up, #personas identity+trait quadrant+dense card, #arch
  five node types + layered map, #journey stage/cell variants + swimlane matrix, #blueprint,
  #competitive, #gap, #recs, #roadmap). Catalogued in exemplar-manifest.md (NEW, the
  agent-facing contract) + figma-node-map. CONSULT-FIRST enforcement shipped: both chat desks
  (Analyst corpusChatService + Designer chatToSlideSpec/chatToFreeform) inject the hashtag's
  exemplar contract via `services/exemplarContract.ts` before composing; consultations are L1
  telemetry (`exemplar_consultations`); changes to exemplars ride the D4 spine; promotions
  ride L2. All obligations green.
- Post-implementation goals accepted from the owner (2026-08-07): (1) NEW Figma file for the
  HiC design system built per the pulse-repo manner on standard (shadcn-style) components with
  PowerPoint-editable output shapes - SUPERSEDES decision 9's one-library recommendation;
  (2) non-technical whitepaper documenting the uplift vs the research + colleague feedback;
  (3) computer-use test pass validating the F1-F5 solves live, with the Figma exemplar library
  built FIRST and catalogued into figma-node-map + slides-component-manifest so the composer
  and the judges can see it.

- D2 ELEVATION PASS (2026-08-07, later same day - four stacked owner goals): (a) GOLD-parity
  visual uplift of every hashtag exemplar: eyebrows removed as AI slop (canon 873:141), full
  626:567 cover anatomy, canon kicker = IBM Plex Mono SemiBold 17/+5 cyan; (b) grid + ramp:
  13 `grid/*` variables (12-col x 120/20, margins 172/88/58, zone 1660, baseline 4), native
  layoutGrids on all 18 exemplar frames, TYPE RAMP RAISED per owner ("body text weak = AI
  slop"): body 28 Medium default / lead 32 / labels 20 / dense-matrix 20/132 tier, ~350 texts
  variable-bound; #journey + #blueprint re-laid grid-true (260/330 column math) and verified
  by screenshot; codified as design-laws Law 11; (c) content-true imagery: EVERY img-slot
  filled with a proxy-generated exemplar image (`/api/ai/illustration`, literal=true) - 11 in
  HiC-DS + 10 GOLD journey masters in iSQhAVM7 - and the generate-similar-from-research
  instruction bound as Law 12 + exemplar-manifest IMAGERY CONTRACT; (d) ACTOR RULE anti-slop
  (owner-supplied rubric: name the actor, plain nouns, grounded cause-effect, read-aloud
  test) added to `.claude/CLAUDE.md`, exemplar-manifest usage rule 0, and 21 hashtag
  deliverable skills; slop evidence nodes GOLD 850:19/244:20 rewritten actor-first, exemplar
  filler copy replaced with distinct synthetic content (4 nursing themes, retail arch story,
  Meridian/Harborline competitive subjects, co-op persona + applicant journey cells).
  Manifest re-chunked (15,393 chunks); tsc clean; container rebuild = pending owner action
  (live-session rule).

- FULL-FILE AUDIT PASS (2026-08-07, latest same-day owner goal - "lazily left gaps"): whole
  GOLD-file scan found 52 empty image slots + 37 slop texts beyond the owner's 8 evidence
  nodes. Under the owner's cost rule (NO mass generation) all 48 image slots were filled by
  REUSING 21 existing library images (upload once -> map imageHash to every slot); the 4
  competitor logo slots got native letter tiles. 20 further slop masters rewritten
  actor-first (engagement-leaks family, UNLOCKS labels, EMPOWERMENT MODEL, Front door
  pattern, trust-erodes, rework-tax). The GENERATE-prompt contract was tightened everywhere
  the AI chats read: mandatory `DERIVED FROM: [quoted deliverable field] + SOURCE ANALYSIS`
  clause + REUSE-FIRST catalog check (exemplar-manifest, Law 12, persona-architect skill,
  designer skill, personaPrompt.ts). HiC-DS re-scan: 0 slop, 4 missed slots fixed (incl. a
  silently-failed cover-bg placement). tsc clean; manifest re-chunked.

- GOLD-FILE RAMP + RUNTIME-PROOF PASS (2026-08-07, final same-day owner goal): the GOLD canon
  file never received the HiC-DS ramp raise, and the owner proved surviving slop/eyebrows/
  weak type with node evidence. Shipped: (a) GOLD-wide type sweep - 31 pages, ~1,700 texts
  raised to the floors (mono 13/15, body 17/20, item titles 22), Archivo Italic retired, 20
  Archivo titles converted to Saira Condensed SemiBold 66 UPPERCASE; (b) placement fixes
  found by the mandatory screenshot QA (role-needs portrait covering its card header, agenda
  scrim, dense numbered-themes to the NONE branch); (c) NU wrap/overflow class fixed
  (Lato-wider-than-Archivo: GARDEN-ERS mid-word breaks, CAMPAIGN CLOSE collision) via
  shorter copy + grid-true widths; (d) THE RUNTIME PROOF: exemplarContract.
  sliceExemplarSections now injects the IMAGERY CONTRACT alongside usage rules (actor rule =
  rule 0) on every artifact turn on BOTH desks; slidePostProcessor SLOP_PHRASES gained the
  AI-jargon family (ai-powered/-driven/-enabled, value-driven, intelligent insights, path to
  value, network activation); exemplarContract.test.ts pins all three guarantees (9 green);
  (e) eyebrow instruction language purged from skills; deck-composer documents that the
  schema `eyebrow` field renders as the ONE canon kicker. tsc clean.

- RENDERER-SPEC LAYOUT FIXES (2026-08-07, owner evidence from a LIVE generated deck): the
  slop-layout class reached the code twin, not just Figma. slideComposer ARCHETYPE_SPECS
  fixed: thesis-interstitial gained fitH 620 (long theses were CLIPPING at the slide bottom;
  the measured clamp existed since WS-1g but the region never declared it);
  role-needs (base + portrait variant) titles gained leading 1.06 + fitH 150 (loose default
  leading floated wrapped lines apart and into the CURRENT CHALLENGES label), challenge
  rhythm tightened to pitch 170 with body fitH 120, and the portrait variant's persona-needs
  got the fitH 92 + pitch 132 budget its base always had (the prose readable-floor clamp was
  growing a 3-line need into the next block's label); role-recommendation title got the same
  leading/fitH. Gates green (tsc, 69 composer tests, template parity); container rebuilt +
  200. LESSON: every archetype text region that can receive long payloads MUST declare fitH -
  the clamp only protects regions that opt in.

- COMPARISON-PANELS PREVIOUS-VS-PROPOSED UPLIFT (2026-08-07, owner: "bland; doesn't feel
  like a comparison"): the columns renderer gained `cardOverrides` (index-aligned partial
  card styling merged over the base card, sparse-safe). comparison-panels now renders the
  incumbent's header band muted (secondary) and every proposal band rail-black with a 4px
  accent top rule, bridges the bands with an accent connector so the eye travels previous ->
  proposed, reserves a per-panel glyph slot (payload.panelIcons, index-aligned, the same
  imgCarrier pattern the visual router already fills), raises cell copy to the readable
  tier, and pulls the whole table up into the former dead zone (rows 344 @ pitch 132).
  Composer tests now ASSERT the identity (muted band hex + accent connector present);
  69/69 green, tsc clean, container rebuilt.

The original decision list follows for the record.

## PART 5 (original) - OWNER DECISIONS REQUESTED

1. Approve P0 scope (C0 was already reviewed 2026-07-13 and is included as-written; v2 adds
   V4 + V1 to P0 as the colleague-feedback trust fixes).
2. C5 (manifest Layer-1 digest) touches prompt assembly for all generators; confirm the A/B
   gate (equal-or-better citation diversity + gate pass rate on the e2e suite) is the acceptance
   bar you want, or tighten it.
3. Q1 cascade pilot class: confirm `#recs` as the pilot or name another.
4. R3 rubric evolution keeps human approval on every rubric diff (recommended); confirm.
5. OKF: conformance (O1/O2) is internal hygiene; O3 bundle export makes engagement knowledge
   shippable outside the repo - confirm that is desirable from a client-IP standpoint.
6. (v2) V3 citation-as-selection makes free-text citations a gate violation; confirm the
   strictness (recommended: hard gate on deck surfaces, detect-only in chat prose for one cycle).
7. (v2) V4 enforcement scope: constraints persist for the whole session until lifted
   (recommended) vs per-request. Confirm.
8. (v2) V5(c) deck-wide harmonization sets same-role text to the minimum step any slide needed;
   the alternative (re-ask the overflowing slide to tighten copy) is slower but keeps type
   larger. Recommended: budget-gate first (a), harmonize (c) as the fallback. Confirm.
9. (v3) D2 keeps the EXISTING `iSQhAVM7SI4QHAWB7y9C2z` library and restructures it into the
   three tiers, rather than creating new Figma files (converge doctrine; also keeps the NU
   mode-flip intact). Confirm, or name a preference for the pulse-style separate-files layout
   (kit / lib / product as three files) - both are workable, one file with tiered pages is
   recommended for a two-mode single-brand system.
10. (v3) D1(a) law 1 makes tokens-only a HARD export gate once D3(b) lands (a raw hex blocks
   export). Recommended: detect-only for the first two weeks, then hard. Confirm.
11. (v3) Foundation-tier ownership: pulse assigns kit edits to ONE named owner. Name the HiC
   token-collection owner (recommendation: you), everyone else read-only via D6's gated sync.

## PART 6 - WHAT SUCCESS LOOKS LIKE (30/60/90)

- 30 days: loop-trace + cache dashboards live with baselines; regression suite mandatory in all
  three promotion paths; measured cache threshold published; zero rung-4-only loops; V4 live -
  "exclude the transcript" provably produces zero excluded-source citations; V1 live - archetype
  entropy and image-slot fill rate up on new decks; D1 constitution reviewed (laws + seeded ADR
  log + deviation register live).
- 60 days: manifest digest + structured graph presentation serving from cache with proven token
  reduction and citation-precision gains; adaptive boundary lowering mutated-fraction; plan-DAGs
  on all multi-deliverable runs; first evolved rubric shipped through the full gate; OKF-
  conformant new pages; citation-as-selection live on deck surfaces (fabricated citations ~0 by
  construction); deck-level type variance ~0 on new exports; craft detector feeding the revise
  loop; D2 three-tier library published with usage contracts (GOLD waves 2-4 absorbed); D3
  design-lint running on bricks and exports; brick coverage ledger (D5) green in the parity
  script.
- 90 days: cascade pilot verdict (adopt/kill on evidence); resumable runs demonstrated; first
  engagement OKF bundle exported; the improvement-epochs ledger shows epochs justified by
  loop-trace metrics rather than anecdote; the first new archetype shipped through the full
  D4 G0-G5 spine with its trace files as the worked example; token conformance at 100% on all
  new exports (D3(b) hard mode per decision 10); colleague-feedback re-survey - F1-F5 each
  re-tested against the same users who reported them, with the L1 directive-adherence and
  edit-rate telemetry as the objective half of the answer.

The through-line, in one sentence: measure the loops we already run, put every promotion behind
regression obligations and exogenous grounding, spend cache writes only above the persistent
tier, cache the manifest's stable half and present it as a graph rather than prose, make user
directives and source credibility deterministic constraints instead of prompt hopes, govern the
design system itself through frozen contracts, phase gates, and machine-linted tokens so brand
consistency is enforced rather than reviewed, and let cheaper models attempt work only where a
deterministic gate can prove they did it.
