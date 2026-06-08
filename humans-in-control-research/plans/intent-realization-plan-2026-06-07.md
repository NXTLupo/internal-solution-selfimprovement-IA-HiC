# Intent-Realization Plan — HiC Research (full lifecycle)

status: proposed
author: incoming assistant
date: 2026-06-07
supersedes-sequencing-of: harness-master-roadmap-2026-06-02, harness-rehardening-2026-06-02 (Section 1b conflict #6 — this doc is the canonical order of record)
method: verbalized-sampling (plan framing) + reinforcement-inference (root-cause weighting)
verification-status: SOURCE/ANALYSIS ONLY for the plan. Phase 0.2 (researchGoal default) has a source edit applied this session, NOT yet browser-verified (HiC has no HMR; needs a Docker rebuild). Every diagnosis carries a file:line + confidence weight; HYPOTHESIS items were not browser-verified.

---

## 0. Method note

Seven parallel reconnaissance agents read all 30 plan docs, verified the predecessor letter's symptoms against current source with file:line evidence, reconstructed the persisted run state, and mapped the two chat surfaces + the artifact/hashtag generation path + the feedback/self-improvement loop. I applied the two named skills: **reinforcement inference** on every diagnosis (weighted candidate causes, did not collapse to the first), and **verbalized sampling** on the plan (candidate framings with probabilities, then a committed spine).

The full-lifecycle pass (Section 2.5) materially reshaped the plan. The keystone is no longer "fix the structured deliverables" — it is **one grounding contract applied at every generation surface**, because the surfaces the user actually lives in (Analyst chat, Designer chat, every `#hashtag` artifact) bypass `loadGenerationContext()` and chunk-pointer grounding entirely.

---

## 1. Plan audit

### 1a. Completed (verified live vs claimed)

Verified live (shipped AND fires with a runtime signal):
- `/api/corpus/from-selection` KL-exact corpus assembly (`proxy/app.py:12381-12522`; `App.tsx:3562-3602`).
- Cached-only short-circuit (`App.tsx:3447-3553`); wiki-hydration stale-slug guard (`App.tsx:1495-1521`).
- `_finalizeDeliverable()` citation-grounding chokepoint on all 7 core deliverables.
- Meta-harness M1-M5 (traceRecorder, qualityFrontier Pareto gate, goldenSetRunner, epoch-as-subagent) smoke-tested 2026-06-05.
- `deliverableScorer.scoreDeliverable` + `improvementDiscriminator` wired from orphan to caller (`geminiService.ts:2106`).
- **Runtime feedback loop is LIVE and gated**: FeedbackWidget → `feedbackService.triggerLearningPassAfterFeedback` → `learningEngine.runLearningPass()` actually patches `.claude/skills/*/SKILL.md`, `learned-constraints.md`, and `anti-patterns/*`, gated by `constraintQualityGate` + confidence thresholds (`learningEngine.ts:672, :332, :387`). This half works.

Claimed-shipped but run state / code contradicts:
- Journey + Gap: the higher-ed engagement has NO `journey.json`/`gap.json` — the chain dies before them (token cap, Section 2.2).
- Self-improvement compounding: `cross-engagement-patterns.md` is `status: bootstrap`; `wiki/log.md` shows `patterns_compiled: 0` every compile. The pattern-miner is idle; `meta-themes` has no input.
- Topics merged into themes: 1 topic survived 24 docs (of 2000). MERGED frame is themes-only.
- Epoch loop: `jobs_since_last_epoch` is tracked and trace/Pareto records are written, but `getEpochStatus` has NO SPA consumer and NOTHING auto-fires the epoch-proposer (`epochTrigger.ts:15-18, :50`).

Framework coverage: all 12 pages exist; only **themes** lacks a 1:1 framework page (by design — BERTopic + theme-analyst). The persona/rec/journey/gap failures are NOT caused by a missing framework page.

### 1b. Conflicts between plans (8)

1. **criticReviseLoop load-bearing (NotebookLM 05-24) vs slated-for-retirement (SkillOpt 05-25).**
2. **COMPILE-on-cached-run (self-improvement-loop) vs cached-only zero-external (intent b)** — compiles fire every session (`wiki/log.md`).
3. **Export engine ambiguity (3-way):** `pptx_export.py`/domToPptx (parity 05-29) vs `nxt_slide_export.py` measured (slide-templates 06-01, render-unification 06-04).
4. **Duplicate design-system plans** (catalog vs 200-build, both 06-01): same `templateSelector.ts`, manifest `category` fix, `template=composed`, Figma-REST.
5. **VS Sprint 1 themes ranker vs quality floor** — REVERTED, now guarded.
6. **Supersession authority (3-way):** master-roadmap vs re-hardening vs volume-to-insight each claim authority. **Resolved here:** `volume-to-insight` + `handoff` are live; the four 06-02 harness docs are reference.
7. **Security priority contradiction inside master-roadmap** (A1/A2/A3 P0 vs local-single-user accepted risk) — local-single-user won; real again if HiC serves >1 client.
8. **Determinism mechanism shift:** seed+temp0 primary (audit/KPI) → demoted to "necessary but insufficient," cache-as-determinism primary (SOTA, volume-to-insight). Unreconciled in code.

### 1c. Commonalities — your compounding intent

(1) One source of truth, collapse duplicates · (2) objective-keyed retrieval everywhere · (3) quality-first, fix-upstream, never relax a floor · (4) determinism for cached runs · (5) no silent failure · (6) "shipped = live caller + observable signal" · (7) compounding self-improvement · (8) human-in-control + honesty surfacing · (9) preview == export by construction.

Through-line: **a trustworthy second brain whose every output traces to a real chunk and never lies about what it did or knows.**

### 1d. Gaps — see the lifecycle map in Section 2.5 (gaps are now organized by lifecycle phase).

---

## 2. Diagnostic corrections to the letter (reinforcement inference)

### 2.1 Personas "fabrication" → verification-corpus mismatch (the keystone)
H1 (0.55): quotes are written from 150-char theme-citation snippets + goal-evidence (`geminiService.ts:2574-2585`), then verified by strict substring match (`citationGrounding.ts:33-53`) against `corpusGroundingText` built only from ingestion `fileParts` (`:838-842`). 0/26 is structural. Same root cause drives themes 6/58 (themes generated from archive passages + topic clusters `:1080-1224` not in `fileParts`). H2 (0.30) enrichment-fail → roster fallback empties jtbd/quotes (`:2663-2672`). H3 (0.15) genuine fabrication. **The persona learned-constraints are being measured against the wrong text, not ignored.**

### 2.2 Token overflow → NOT the critic loop
The critic loop is bounded (12K slice, `criticReviseLoop.ts:316`). H1 (0.6): the unbounded cumulative `GenAISession` chat history (`geminiService.ts:6480-6486`) retains corpus fileParts + every prior step + per-step evidence blocks; recs/journey/gap run late and cross 1,048,576. No input-budget guard exists.

### 2.3 Cognitive chain 1/16 → brittle metric + real bypass
Upstream IS injected via `shapeUpstreamForRecs` (`:2842`) when session state populated. H1 (0.45): the metric requires literal substring match (`:2146-2169`) while the model paraphrases. H2 (0.35): `lastThemes/lastPersonas` empty if upstream failed. H3 (0.20): genuine bypass.

### 2.4 researchGoal stale → hardcoded default (CONFIRMED in source this session)
`App.tsx:1257` default = `"Identify emerging needs in the remote work sector."` No persistence restore exists; every slug derivation reads the current `researchGoal`/`__hicCurrentEngagementSlug`, not `active.json.source_engagement_slug` (written :1376, never read back). The "remote work ghost" is purely this default. Fix applied in Phase 0.2 (source-only).

---

## 2.5 Full-lifecycle intent + current-state map (the 7 phases you named)

Each phase: your intent (as I understand it) · current state with file:line · gap. This is the awareness check you asked for. If I have your intent wrong on any row, correct me before I build that phase.

### Phase L1 — Data collection / cached data loading
- **Intent:** the Knowledge Library selection is the binding contract. Cached-only is the default: zero external API calls at runtime. KL items resolve EXACTLY against the manifest; the goal is a lens on the corpus, not a re-filter of it.
- **State:** KL-exact resolution works (`/api/corpus/from-selection`, `proxy/app.py:12381`). `active.json` carries 557 cluster pointers + 1 upload + 6 subreddits + 3 article sources. Cached-only branch assembles into `collectedDataFiles` (`App.tsx:3562-3602`).
- **Gap (G-L1):** cached-only is NOT airtight. `generateThemes` archive-augmentation fires live `/api/wiki/fetch-articles` (25s timeouts in the handoff); the wiki COMPILE path fires LLM calls every session (`wiki/log.md`). Both violate intent (b).

### Phase L2 — Data synthesis
- **Intent:** synthesis pulls from the wiki via `loadGenerationContext()` (framework + anti-pattern + brand + evidence + engagement memory + learned constraints), draws evidence by chunk pointer, and compounds across deliverables (themes→personas→recs→journey→gap), each traceable to a chunk.
- **State:** the structured App.tsx pipeline calls `loadGenerationContext()` (`App.tsx:5012, :5032`) and runs the chain (`:5239-5310`). `_finalizeDeliverable` grounds citations.
- **Gap (G-L2):** (a) verification corpus ≠ generation corpus (2.1) → grounding rates structurally low. (b) chain dies at the token cap (2.2) → no journey/gap. (c) chain coverage metric brittle (2.3).

### Phase L3 — Theme extraction
- **Intent:** themes are the wall-to-wall default of the Analyst Desk; topic-model clusters merge INTO themes; deterministic (same corpus+goal → same theme identity); each theme grounded in real chunks with sentiment + prevalence.
- **State:** themes generated Pass 1 + Pass 2; sentiment via lexicon polarity (`ResearchBrowser.tsx:48-130`). 29 themes persisted for higher-ed.
- **Gap (G-L3):** (a) only 1 topic survived 24 docs (of 2000) — BERTopic per-doc filter too aggressive / wrong input shape → MERGED frame degraded. (b) theme grounding mismatch (2.1). (c) determinism of theme identity not enforced everywhere (conflict #8).

### Phase L4 — Analyst Desk Chat + Designer Chat (context/knowledge management)
- **Intent:** both chats answer from the SAME curated corpus, with chunk-pointer traceability, never invent, context bounded; "chat about this" pre-fills chunk pointers; the AI Analyst is corpus-grounded.
- **State — Analyst chat (strong):** bound to live session corpus (`corpusTextRef`); chunk-pointer prefill works (`ResearchCard.tsx:96-101` → `CorpusChatPanel.tsx:3771-3795`); history compaction at the model window (`corpusChatService.ts:2977`); writes feedback (`:4809-4816`). Default Gemini 3.1 Pro.
- **State — Designer chat (weak):** bound to a localStorage snapshot (`designContext.ts`); dumps the ENTIRE combined-evidence blob, no retrieval/rerank; NO chunk-pointer traceability / no "chat about this"; only last-8 USER turns as memory (`DesignDeskChat.tsx:357-360`); fixed-cap concat (800K+600K) not budget-aware; UI-selected model NOT forwarded to the proxy (`chatToFreeform.ts:969-983`) → displayed model ≠ actual model.
- **Gap (G-L4):** (a) Designer chat — the surface most likely to invent visual/structured content — has the WEAKEST grounding contract (no chunk pointers, no retrieval, no budget discipline). (b) Neither chat runs RI on the answer. (c) Analyst retrieval is keyword-overlap, not embedding similarity → recall ceiling; silent corpus truncation past `maxCorpus`.

### Phase L5 — Artifact + hashtag generation
- **Intent:** every artifact grounded via `loadGenerationContext()` + chunk pointers + the design exemplars (NU gallery / exemplar-skills / ai-patterns); hashtag intent dominant; brand-locked; preview==export.
- **State:** hashtag dominance MET (directive parsers short-circuit before `matchSkills`, `hashtagParser.ts:157/216/274`). `#proto` genuinely loads exemplars + ai-patterns catalog (`prototypeBuilder.ts:1824, :1863`, with silent free-form fallback `:1877`).
- **Gap (G-L5) — large:** ALL three hashtag/chat artifact surfaces BYPASS `loadGenerationContext()`. `#brief`/`#report`/`#explainer`/`#whitepaper`/`#playground`/`#approaches` (`CorpusChatPanel.tsx:5656-5816`) hand-assemble from only 2 skill MD files + bulk article injection (`formatArticlesAsCorpusBlock`, 90K cap), NO framework/anti-pattern/brand/learned-constraints, NO chunk pointers. `#presentation` (`narrativeComposer.ts:250`) and `#proto` also bypass `loadGenerationContext`. The HTML hashtag family + `#presentation` do NOT inject the NU gallery / exemplar-skills. (`#slides` is not even a directive — keyword-scored.)

### Phase L6 — User feedback / model feedback
- **Intent:** user edits/votes/corrections AND model self-assessment compound into learned constraints / skills / frameworks / anti-patterns; the user sees "what changed."
- **State:** LIVE and gated. FeedbackWidget (`:115`) → `feedbackService` (`:255-261`) → `learningEngine.runLearningPass()` patches SKILL.md/constraints/anti-patterns with a confidence gate + `constraintQualityGate`; inline "SKILL LOOP — what your signal changed" panel renders the result. Feedback persists to `/api/feedback/append` (JSONL).
- **Gap (G-L6):** model-side feedback is thin — `scoreDeliverable` runs but only logs/warns (`geminiService.ts:2107-2109`); it does not feed the learning loop. Verbalized-confidence / RI self-assessment is not captured as a feedback signal. No RI re-ask on uncertain outputs.

### Phase L7 — Self-improvement (SkillOpt)
- **Intent:** every run becomes training signal; SkillOpt adapts skills offline, gated by a held-out validation gate; the epoch loop fires on cadence; improvements compound.
- **State:** TWO DISCONNECTED systems. (a) runtime `learningEngine` (feedback-driven, auto-fires, gated) — works. (b) offline SkillOpt scripts (`scripts/run-skillopt.py`, `skillopt-batch.sh`, `validate-candidate.py`) — rubric-scored, validation-gated, but MANUAL only (`--auto-promote` or human review), nothing auto-fires it. Epoch substrate (trace/Pareto/outcome via `emitDeliverable.ts:251,262`) is written, but `getEpochStatus` has no consumer and nothing fires the proposer (`epochTrigger.ts:15-18`).
- **Gap (G-L7):** (a) the two self-improvement systems are not unified. (b) the epoch loop is half-built — tracked but never auto-fired. (c) pattern-miner idle (`patterns_compiled: 0`) → no cross-engagement compounding. (d) two parallel reward signals (`scoreDeliverable` vs `evaluatePareto`) — one is redundant.

---

## 3. The plan (verbalized sampling → committed spine)

### 3a. `<vs_thinking>` — candidate framings (k=5, moderate-tail)

```
MODAL (predecessor): symptom-by-symptom triage. p≈0.18. Rejected: 2.1+2.2+2.3
  and now G-L4/G-L5 show the failures share root causes; triage re-fixes the
  same substrate at five surfaces.

A — "One grounding contract, every surface" (the generalized keystone). p≈0.40.
  Every generation surface (structured deliverable, Analyst chat, Designer chat,
  #hashtag artifact, #proto, #presentation) routes through loadGenerationContext
  + chunk-pointer grounding + verify-against-the-corpus-you-generated-from. This
  single contract closes G-L2(a), G-L4(a), G-L5, and the keystone 2.1 at once.
  Highest leverage; matches your "one source of truth" intent.

C — observability-first (RunReceipt everywhere). p≈0.12. Demote to the PROOF
  layer (Phase 7), not the spine — visibility without the contract delays the
  working build.

D — reconciliation-first (resolve the 8 conflicts). p≈0.14. Fold the CHEAP
  ambiguity-removals into Phase 0; defer heavy consolidation (export engine,
  duplicate design plans) to their own phase.

E — content-addressed-corpus substrate (SOTA keystone). p≈0.10. Phase 1 is the
  minimal viable slice; grow toward E only on measured need (avoid the over-build).

COMMIT: A as the spine, sequenced so the contract lands on the structured
pipeline first (cheapest, highest-trust), then extends outward to chat and
artifact surfaces. Phase 0 = cheap correctness + reconciliation. Phases map
1:1 to the lifecycle phases L1-L7 so coverage is provable.
```

### 3b. Committed spine — phases mapped to lifecycle phases, each traced through 6 layers

Standing rules honored throughout: every phase names all six architecture layers (wiki / manifest / skill / hook / subagent / self-improvement); layers that don't apply are marked "n/a because Y." Floors are met by fixing upstream, never relaxed. Each phase ends with a Build/Browser/Flow/Output verification before it is called done.

| Phase | Covers lifecycle | Goal |
|---|---|---|
| 0 | L1, reconcile | Cheap correctness + remove plan ambiguity |
| 1 | L2, L3, L5 | The grounding contract, unified across surfaces |
| 2 | L2, L4 | Bounded generation (kill unbounded history) |
| 3 | L2, L3 | Cognitive-chain integrity (entity match) |
| 4 | L1 | Cached-only airtightness (zero external at runtime) |
| 5 | L4 | Chat context-management parity (Designer ⇒ Analyst-grade) |
| 6 | L3 | Topic-model → theme merge (fix the 1-topic collapse) |
| 7 | L6, L7 | Unify + auto-fire self-improvement; prove via RunReceipt |

**PHASE 0 — Reconcile + cheap correctness** (covers L1 correctness)
- 0.1 Declare canonical order of record (this doc; resolves conflict #6). No code.
- 0.2 Fix researchGoal default (`App.tsx:1257`) → empty; derive slug from CURRENT goal. **Source edit applied this session; needs rebuild + cold-load browser verify.**
- 0.3 Pick `nxt_slide_export.py` measured export as canonical (conflict #3); mark `pptx_export.py`/E2 for retirement. Doc only.
- 0.4 Merge the two design-system plans into one workstream (conflict #4). Doc only.
- 6-layer: wiki n/a · manifest n/a · skill n/a · hook (0.2 surfaced by SessionStart context hook) · subagent (spa-smoke-tester verifies 0.2 cold load) · self-improvement n/a.

**PHASE 1 — The grounding contract, unified** (covers L2 keystone, L3 grounding, L5)
- 1.1 Replace the single ingestion-time `corpusGroundingText` snapshot (`geminiService.ts:838`) with a corpus handle each generator both DRAWS FROM and is VERIFIED AGAINST.
- 1.2 Register archive passages + topic-cluster text into the corpus handle so theme/persona verification checks the text quotes actually came from.
- 1.3 Quotes carry their chunk pointer (`<wikiPath>#cN`) from generation to verification → pointer-equality, not substring scan (the determinism-friendly, content-addressed slice).
- 1.4 **Extend `loadGenerationContext()` to the artifact/chat/hashtag surfaces** (`CorpusChatPanel.tsx:5656-5816`, `narrativeComposer.ts`, `prototypeBuilder.ts`) so framework + anti-pattern + brand + learned-constraints inject everywhere, and evidence comes by chunk pointer (`manifest-chunk-retrieval`) not 90K bulk injection. This closes G-L5.
- 1.5 Inject the design exemplars (NU gallery / exemplar-skills) into the HTML hashtag family + `#presentation`, as `#proto` already does.
- 1.6 Keep the strict floor; raise match rate by aligning corpora, never by lowering the bar.
- 6-layer: wiki (corpus handle from manifest + archive) · manifest (reuse per-page `chunks:` `#cN`) · skill (persona-architect/theme-analyst/html-deliverable-composer emit chunk pointers) · hook (`validate_chunk_citations.py`, `validate_citation_resolution.py` tightened to pointer-equality) · subagent (`evidence-quality-auditor` confirms the lift is real, not gamed) · self-improvement (grounding-rate delta → `quality-scores.md`).

**PHASE 2 — Bounded generation** (covers L2 token cap, L4 Designer budget)
- 2.1 Stop compounding `GenAISession` history across deliverables: stateless per-deliverable calls OR pruned window + a hard input-token budget guard (`geminiService.ts:6480-6486`).
- 2.2 Cap per-step evidence-block injection so a single late step can't blow the budget.
- 2.3 Add budget-aware context to the Designer chat (`designContext.ts:33-35` fixed caps → budget-aware) so it can't exceed a smaller model's window silently.
- Do NOT change `gemini-3.5-flash`/`gemini-3.1-pro-preview` (valid; the 400 is size).
- 6-layer: wiki n/a · manifest n/a · skill (`long-running-service-call` budget pattern) · hook (extend `validate_budgets.py` to log near-cap) · subagent n/a (in-process guard) · self-improvement (overruns → `generation-failures.md`).

**PHASE 3 — Cognitive-chain integrity** (covers L2, L3)
- 3.1 Replace substring linkage (`_assertChainCoverage`, `:2146-2169`) with entity/semantic match via the typed EntityRegistry "blackboard" (SOTA H4), scoped to the linkage check.
- 3.2 Guarantee `lastThemes`/`lastPersonas` populated before recs; fail LOUD if upstream failed (intent 5).
- 6-layer: wiki n/a · manifest (EntityRegistry reuses chunk-pointer namespace) · skill (strategy-author/recommendation-architect consume entity IDs) · hook (`validate_deliverable_coherence.py` asserts coverage by entity match) · subagent (`recommendations-deliverable-auditor`) · self-improvement (chain-coverage KPI logged).

**PHASE 4 — Cached-only airtightness** (covers L1, intent b)
- 4.1 Gate `generateThemes` archive-augmentation: cached-only draws from the manifest, never live `/api/wiki/fetch-articles`. The 25s timeouts vanish with the call.
- 4.2 Guard COMPILE-on-cached-run (conflict #2): a cached run fires no LLM compile (opt-in or fully local).
- 4.3 Surface any unavoidable fallback via `fallback-event-surfacing` (no silent degradation).
- 6-layer: wiki (compile WHEN, not schema) · manifest (cached reads manifest exclusively) · skill (`manifest-chunk-retrieval` contract) · hook (`validate_no_silent_fallback.py`, `validate_cached_selection_honored.py` 100% floor) · subagent (`quota-monitor` confirms zero external spend) · self-improvement (external-call-on-cached-run → degradation event for the epoch proposer).

**PHASE 5 — Chat context-management parity** (covers L4)
- 5.1 Give the Designer chat the Analyst's grounding contract: chunk-pointer traceability + "chat about this" prefill + retrieval/rerank against the curated corpus (not whole-blob dump).
- 5.2 Forward the UI-selected model to the proxy artifact engine (`chatToFreeform.ts:969-983`) so displayed model == actual model (no opacity).
- 5.3 Wire RI (reinforcement-inference) re-ask on uncertain chat answers (RI-Silent for chat per the skill's threshold table); upgrade Analyst retrieval from keyword to embedding similarity; surface corpus truncation instead of silent cut.
- 6-layer: wiki (both chats read the same curated corpus) · manifest (chunk pointers on both surfaces) · skill (`reinforcement-inference` RI-Silent, `manifest-chunk-retrieval`) · hook (`validate_self_referential_freeform.py` already guards chat) · subagent n/a (interactive surface) · self-improvement (chat feedback already logs via `learningEngine`; extend to capture RI re-ask outcomes).

**PHASE 6 — Topic-model → theme merge** (covers L3)
- 6.1 Fix the BERTopic per-doc min-cluster filter / input shape so >1 topic survives (1 of 24 docs today). Port the Social Analytics RoBERTa sentiment + richer representation (themes-topics-elevation plan).
- 6.2 Merge topic clusters INTO themes for the Research Browser MERGED frame; enforce deterministic theme identity (temp0 + seed) per the determinism rule.
- 6-layer: wiki n/a · manifest (cluster pointers already in `active.json` `theme_cluster_ids`) · skill (`theme-analyst`, `deterministic-naming-pass`) · hook (`validate_theme_reproducibility.py`) · subagent (`themes-deliverable-auditor`) · self-improvement (cluster→theme yield → `yield-ledger.md`).

**PHASE 7 — Unify + auto-fire self-improvement; prove it** (covers L6, L7)
- 7.1 Unify the two self-improvement systems: runtime `learningEngine` and offline SkillOpt share one scoring substrate and one gate.
- 7.2 Auto-fire the epoch proposer on cadence (a `/loop` cron reading `jobs_since_last_epoch`); surface `getEpochStatus` in the SPA.
- 7.3 Resolve `scoreDeliverable` vs `evaluatePareto` redundancy — one reward signal, consumed (gate or learning input), not just logged.
- 7.4 Turn on the pattern-miner so `patterns_compiled` stops reading 0 and `meta-themes` gets input.
- 7.5 Wire the parked RunReceipt (master-roadmap H1.1); re-run the higher-ed co-op corpus end to end; confirm journey+gap persist, grounding climbs, chain coverage climbs, zero external calls, on the real corpus.
- 6-layer: wiki (RunReceipts/KPIs → `synthesis/`) · manifest n/a · skill (`cross-engagement-pattern-miner`, `meta-themes`, `epoch-proposer`, `skillopt-validation-gate`) · hook (Stop validators become KPI emitters) · subagent (`hic-output-qa`, `evidence-quality-auditor`, `epoch-proposer`) · self-improvement (THIS is the layer — `deliverableScorer` reward + epoch loop start).

---

## 4. Self-assessment (reinforcement inference on this plan)

overallConfidence: medium

leastDefensibleClaims:
1. **Phase 1 scope.** The verification-corpus mismatch (2.1) is confirmed by file:line; extending `loadGenerationContext` to the artifact/chat surfaces (1.4) is the right intent-fix but touches three large generation paths (`CorpusChatPanel.tsx:5656-5816`, `narrativeComposer.ts`, `prototypeBuilder.ts`) — effort is larger than "one fix." Read each path fully before sizing.
2. **Phase 5 retrieval upgrade (keyword→embedding).** Worth doing for recall, but the Analyst chat works adequately on keyword today; this is an enhancement, not a fire. Sequence it after the Designer-chat grounding gap (the real divergence).
3. **Phase 7 unification.** Whether the two self-improvement systems SHOULD merge or stay separate-with-one-gate is a design decision I have not pressure-tested against the SkillOpt plan's offline-training thesis. Confirm with you before building.

rationale: The audit + diagnoses rest on file:line code reading, so they are solid. The lifecycle map (2.5) is now grounded in actual reads of both chat surfaces, the hashtag/artifact path, and the feedback/skillopt loop. The SEQUENCING is well-grounded (contract-first beats triage). EFFORT and exact remediation shapes are where uncertainty lives, and each is flagged.

Pre-claim checklist for THIS turn:
- Plan refactor: doc written (this file). Source/analysis only.
- Phase 0.2 researchGoal edit: Build — NOT run · Browser load — NOT done (needs Docker rebuild, no HMR) · Flow exercised — NO · Output inspected — NO. **Source-only change, NOT shipped.**
