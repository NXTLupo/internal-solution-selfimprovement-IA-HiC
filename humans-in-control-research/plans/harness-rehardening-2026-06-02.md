# HiC Harness RE-Hardening Plan (2026-06-02)

Supersedes the sequencing in `harness-master-roadmap-2026-06-02.md` for the next phase.
Written after the owner uncovered a recurring class of gaps the first audit did not catch.

## The honest reassessment: why there were so many gaps

The first harness audit graded the WRONG axis. It assessed **capability/design** ("does the
architecture contain X?") and the fixes (U1-U5) improved **generation quality**. But the gaps
the owner kept surfacing are **execution/wiring** gaps: a component that EXISTS and was reported
"shipped," but is never actually CALLED in a live run. Three confirmed this session:

| Component | State found | Reality |
|-----------|-------------|---------|
| `improvementDiscriminator.discriminate()` | built 2026-05-20, file present, 0 callers | the self-improvement critic was **never wired** — `improvementScore` was computed nowhere |
| `proxy/run_receipt.py` | module written | **parked**, no endpoint, no caller |
| citation grounding (U3) | wired into `generateThemes` only | a per-artifact bolt-on, not a rule — personas/recs unprotected |
| chat model selection | assumed dynamic | **NOT dynamic** — chats use the user's UI pick; `skill.bestModel` is dead metadata |

Root cause, stated plainly:
1. **"Shipped" was overloaded.** Commit/memory notes used "shipped" to mean *code written*. I
   inherited that language and reported capability as if it were execution. A module with zero
   callers is not shipped; it is parked.
2. **The audit verified existence, not the wire.** It never asked "does this fire end-to-end in
   a real run, and what runtime signal proves it?" A capability audit cannot catch an orphan.
3. **The codebase has a build-then-defer culture.** "Scaffolded, wiring follows" recurs (the
   NotebookLM uplift, the discriminator, RunReceipt). Orphans accumulate. There is even an
   `orphan-code-auditor` subagent + a `precheck_orphan_export` hook acknowledging this — but
   they are not run on a cadence, so the backlog grows.

**The fix is a definition change: hardening = proving execution, not cataloguing capability.**
Every claimed capability must (a) be reachable from a real entry point, (b) emit a runtime signal
proving it fired (a log line or RunReceipt field), and (c) have a guard that fails LOUD if it
silently no-ops.

## What this plan closed already (this session, verified by build + deploy)

- **A1 Universal citation grounding** — `verifyDeliverableCitations()` is now ONE recursive rule
  (blank any quote not in the corpus, any field, any deliverable), invoked from a single
  `_finalizeDeliverable()` chokepoint in `geminiService` for themes + personas + recommendations.
  Not per-artifact anymore.
- **C1 Self-improvement critic wired** — `_finalizeDeliverable()` now calls
  `improvementDiscriminator.discriminate()` after each deliverable. Because the CONSUMPTION side
  was already present (`promptImprovementEngine.getActiveConstraints` drops keys in `DISMISSED_KEY`),
  wiring the producer **closes the loop end-to-end**: score -> attribute delta to active
  constraints -> auto-dismiss persistently-negative ones -> dropped from the next run's injection.
- **Vendor-drift guard** — `proxy/model_registry.py` + startup validation + `/api/models/registry`;
  receipt flags a sunset/unknown requested model.
- **RunReceipt** — wired into `/api/artifact/generate` + the topic-model job; `/api/run-receipts`.
- **Manifest fingerprint** — each cached deliverable records model + reproducibility_hash + timestamp.

## Open decision (do NOT silently default it)

**B2 — chat model selection / the UI model switcher.** VERIFIED: the Analyst and Designer chats
use the model the user picks in the UI (`sendChatMessage(model, ...)`); there is NO dynamic
selection (`skill.bestModel` is never read; only `'council'` fans out). Therefore the picker is
load-bearing and **must not be removed yet.** Naive dynamic selection is unsafe: forcing a matched
skill's `bestModel` can route to a dead provider (the OpenAI account is `insufficient_quota`), and
the chat path has no health-aware fallback (only the staged `deliverableModelRouter` does).
- Option (i): make chat selection dynamic AND health-aware (route `skill.bestModel` through
  provider health, fall back when dry), THEN remove the picker. Real build, ~1 focused change.
- Option (ii): keep the picker, add an "Auto" default that uses `skill.bestModel` when its provider
  is healthy. Lower risk.
Recommendation: (i). Owner decides before any UI removal.

## The three workstreams (organized as the owner framed them)

### Workstream A — Data synthesis quality
- **A1** universal grounding — DONE. Next: extend the chokepoint to the proxy HTML-artifact path
  (`_call_gemini_for_artifact`) where quotes are detectable.
- **A2** retrieval-relevance proof — U2 enrich-then-score is DONE; ADD a runtime signal recording
  cited-vs-available corpus coverage into the RunReceipt, so weak retrieval is visible.
- **A3** grounding-coverage gate — fail LOUD (degradation event) when a deliverable ships with
  more than a threshold of blanked quotes (means the model fabricated against a thin/off-target
  corpus). Reuses the `_finalizeDeliverable` report.

### Workstream B — Cognitive architecture
- **B1** cognitive chain — DONE + consolidated onto `intelligenceShaping`. Next: assert at runtime
  that each recommendation references >=1 upstream theme/pain (prove the chain fired, not just that
  the block was injected).
- **B2** chat model selection — the open decision above.
- **B3** single intelligence object — the three assembly paths now share `intelligenceShaping`;
  finish by making the manifest fingerprint the canonical provenance all three read.

### Workstream C — Self-improvement loop
- **C1** critic wired — DONE. Next: surface the lineage (`improvement-lineage.md`) + dismissed
  constraints in the UI so the loop is observable, not just logged.
- **C2** effectiveness->action verified — the dismiss->drop path exists; ADD a runtime signal when
  a constraint is auto-dismissed so the owner sees the loop self-correct.
- **C3** SkillOpt gate — `validate-candidate.py` is wired into the batch; auto-promote is OFF by
  default (good). ADD a held-out human recalibration checkpoint before promotion.
- **C4** drift canary — one FROZEN reference run scored by the discriminator on a cadence; alert if
  `overall` regresses vs the locked baseline. This is the month-out drift detector.

### Cross-cutting X — the anti-orphan discipline (the actual root-cause fix)
- **X1** run `orphan-code-auditor` on a weekly cadence; every exported capability must have a
  caller or be deleted. Wire `precheck_orphan_export` to fail loud at write time.
- **X2** execution-trace coverage — every pipeline stage emits a RunReceipt signal; a stage that
  did not fire is visible. (RunReceipt exists; extend coverage to the staged SPA pipeline.)
- **X3** reporting discipline — "shipped" means "fires in a live run with a runtime signal," never
  "code exists." Status claims must cite the signal.

## EXECUTED 2026-06-02 (build green, deployed, SPA 200) — mapped to original goals

The chokepoint `geminiService._finalizeDeliverable(kind, result)` now runs on ALL 7 core
deliverables (themes, personas, recommendations, journey, gap, tech_audit, competitive) and does:
- **No invented detail / depth** — universal `verifyDeliverableCitations` (blank any quote not in corpus).
- **Reliability** — A3 grounding gate: loud alert when >=50% of quotes were fabricated (thin/off-target corpus).
- **Reliability + quality** — wired the ORPHANED `deliverableScorer.scoreDeliverable` (the H5 reward, 0 callers before): per-deliverable composite score + loud alert below the pass bar.
- **Consistency** — B1 `_assertChainCoverage`: logs how many recommendations reference an upstream theme/pain; alerts on zero linkage (proves the U1 chain FIRED, not just injected).
- **Self-improvement** — wired the ORPHANED `improvementDiscriminator.discriminate` (built 2026-05-20, 0 callers): closes the loop end-to-end (score -> attribute -> auto-dismiss negative constraints -> dropped next run), with a loud C2 signal when a constraint is auto-retired.
- **Determinism** — unchanged (reproducibility_hash already stamped on themes/recs).

Anti-orphan sweep (107 service modules): confirmed 4 zero-importer modules. Wired `deliverableScorer`.
Remaining honest orphans for follow-up: `coverageScorer` (needs decomposed research questions to wire
properly), `industryTaxonomy`, `verticalRegistry` (data registries — verify dormant vs delete).

## Sequencing
1. X3 (definition) is free and immediate. 2. A3 + C2 (loud signals on the chokepoints just wired) —
small. 3. B1 assertion + A2 coverage signal — small. 4. B2 decision -> build. 5. C4 canary. 6. X1/X2
cadence. Security items remain dormant/accepted (local single-user). Cost stays real-charge-only.
