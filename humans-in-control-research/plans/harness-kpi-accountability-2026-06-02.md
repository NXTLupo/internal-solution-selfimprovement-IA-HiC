# HiC Harness — KPI & Accountability Contract (2026-06-02)

Companion to `harness-architecture-audit-2026-06-02.md`. This is how I (product
engineer) hold myself accountable to the build. The governing principle, learned the hard
way this session: **a claim is not "done" until a machine emits the number, on the real
co-op corpus, reproducibly.** No "looks fixed," no HTTP-200-as-success, no saved-run
screenshots. The instrument that grades me is the `RunReceipt` (Phase H1) — I build the
scoreboard before I claim any score.

## The accountability mechanism (anti-overselling guardrails)
1. **Every KPI maps to a `RunReceipt` field** the proxy emits per run. If a KPI can't be
   read off the receipt, it doesn't count.
2. **Verified on the real corpus** via the in-container harness (the 420-post co-op set
   used this session), not synthetic, not a saved run. Re-runnable without user tokens.
3. **A phase ships only when its exit-KPIs hit target on that harness.** Partial = not done.
4. **Regression gates**: each KPI becomes a CI/harness assertion so a later change can't
   silently rot it. The KPI file is the contract; the harness is the judge.
5. **Honesty rule**: baselines below are what I measured this session; blank baselines are
   "not yet instrumented" — I will not assert a number I haven't read off the system.

## KPI scorecard (per harness goal)

| # | Harness goal | KPI (measured on real co-op corpus) | Baseline (measured) | Target | Instrument / RunReceipt field |
|---|---|---|---|---|---|
| K1 | RELIABILITY | Silent-failure rate: stages that failed but returned success-shaped output | unknown (uninstrumented) | 0% (every failure typed + surfaced) | `receipt.degradation_events[]`, `receipt.gathering.sources_failed[]` |
| K2 | RELIABILITY | Source success: sources_succeeded / sources_attempted | ~unknown (403/429 storms swallowed) | report always; alert if <60% | `receipt.gathering.{attempted,succeeded,failed_reason}` |
| K3 | RELIABILITY | Generation hang/crash rate across all 25 deliverable kinds | crash class shipped twice this session | 0 hangs/crashes; 25/25 kinds 200 | per-kind smoke harness + `receipt.stage_status` |
| K4 | RELIABILITY | Runtime QA defect pass-rate (crush/overflow/overlap/collapse) before user sees output | gate was on-demand only | 100% of artifacts audited; 0 P0 layout defects shipped | `receipt.visual_qa.{passed,defects}` |
| K5 | DETERMINISM | Reproduction rate: same corpus+goal → identical theme/topic/persona/rec identities across 2 runs | partial (themes seeded; personas/recs temp>0) | 100% identity match on identity fields | `receipt.reproducibility_hash` (corpus-aware) compared run-to-run |
| K6 | DETERMINISM | Citation resolvability: resolved markers / emitted markers | resolver mismatch + breaks >CHUNK_999 | 100% resolved or typed-miss (0 silent drops) | `receipt.citations.{emitted,resolved,unresolved[]}` |
| K7 | RELEVANCE | On-objective corpus share (post enrich-then-score, real relevance not snippet) | scored on 600-char snippet; "low skew" artifact | report accurately; degrade-banner if median <0.4 | `receipt.corpus.relevance_distribution` |
| K8 | RELEVANCE | Off-objective honesty: runs where corpus<goal flagged to user vs shipped silently | shipped "by design" when 0/N on-objective | 100% flagged | `receipt.corpus.objective_match` + UI banner |
| K9 | DEPTH | Theme yield + thickness: themes with >=2 distinct SOURCES (not same-author) | 4→18 topics this session; theme thick-filter exists | >=12 themes, >=80% thick, on a real corpus | `receipt.analysis.themes.{count,thick_share}` |
| K10 | DEPTH | Sentiment accuracy: RoBERTa label matches human judgment on a 20-topic gold set | VADER mislabeled struggle topics +; RoBERTa fixed (verified) | >=90% agreement on gold set | gold-set harness vs `topic.sentiment` |
| K11 | DEPTH | Cognitive-chain integrity: recs that cite a real upstream theme/persona id | recs never receive themes (broken link) | 100% of recs reference a real entity id | `receipt.analysis.recs.{linked,orphaned}` |
| K12 | CONSISTENCY | Cross-deliverable entity identity: themes referenced by personas+recs share ids | no shared id; 2 theme namespaces | 100% shared-registry ids | entity registry + receipt linkage |
| K13 | CONSISTENCY | Export==preview parity: exported PPTX/PDF visually matches the live preview | holds only when Chromium present (silent fallback) | 100% parity OR explicit downgrade event | `receipt.export.{renderer,parity_ok}` |
| K14 | SELF-IMPROVEMENT | Constraint loop closure: user edits → constraints applied to next run | load-bearing (SPA) but proxy ungated | 100% applied + gated, both paths | `receipt.constraints_applied[]` |
| K15 | SELF-IMPROVEMENT | SkillOpt closure: candidates scored with real failures + reviewable, not /tmp no-op | orphaned (neutral 0.5, ephemeral) | scored candidates land in reviewable path | skillopt run log + scored rollouts |
| K16 | OBSERVABILITY (xcut) | Time-to-diagnose a failed run without docker logs | docker-log archaeology (this whole session) | answer "which stage/provider/cost/fallback" from UI in <60s | `RunReceipt` panel exists + complete |

## SELF-IMPROVEMENT KPIs — the second-brain mechanisms (corrected 2026-06-02, code-verified)
CORRECTION (after a deeper read; the first agent-sampled audit got this wrong): **there are
NO checkpoints in the live flow.** `AnalysisCheckpoint.tsx` (2,443 lines) renders only when
`activeStage !== IDLE` (`App.tsx:5705`), which the chat-driven product path never sets, and
its `logEdit` learning hook is explicitly obsolete (`chatFeedbackExtractor.ts:8`). **All
human feedback flows through the two AI chats** — Analyst Desk (`CorpusChatPanel`,
`chatSurface:'analyst'`, `:4648`) and Designer (`DesignDeskChat`, `chatSurface:'designer'`,
`:275`) — where every user turn is run through `classifyMessage` → `logChatFeedback`
(implicit), plus an explicit `FeedbackWidget` → `feedbackService.submitFeedback` →
`triggerLearningPassAfterFeedback`.

A richer self-improvement subsystem EXISTS than the first audit reported, but it is wired to
UI panels / manual triggers, not the automatic loop:
- `learningEngine.runLearningPass` / `reviewConstraintEffectiveness` / `getRecurringShortfallTopics`
  — only caller is `ChangeStrip.tsx` (UI-triggered, not continuous).
- `improvementDiscriminator` (`computeScorecard`, `discriminate`, `getLineageLog`) — a real
  QualityScorecard + constraint-attribution lineage, but only surfaced in
  `ImprovementLineagePanel.tsx`, not gating generation.
- **`deliverableScorer.scoreDeliverable` / `scoreFreeformArtifact` — a fully-built [0,1]
  rubric scorer whose docstring says it is "the validation signal SkillOpt needs (§3.5)" —
  has ZERO callers.** This is the precise root cause of SkillOpt's neutral-0.5 training: the
  gradient exists and is never invoked.

**Instrument: a `LearningLedger`** — a longitudinal, per-goal-cluster store layered on
RunReceipt (run id, chat-feedback signals by surface/type, constraints active, VS yield,
confidence calibration, deliverableScorer composite). Self-improvement is a RUN-OVER-RUN
property; a single receipt can't show it. The governing KPI is **compounding** (SI8): the
next similar pull is better with fewer human-feedback turns. The audit confirms this half is
the most broken — not for lack of components, but because the components are orphaned from
the loop (scorer uncalled, learning pass manual, hooks Claude-Code-only, SkillOpt /tmp).

| # | Mechanism | KPI | Baseline (measured/known) | Target | Instrument |
|---|---|---|---|---|---|
| SI1 | **Human improvement intervention** (checkpoint edits) | Human-intervention rate: edits/approvals per checkpoint, run-over-run on similar goals — must TREND DOWN | uninstrumented (edits logged, decline never measured) | monotonic decline across repeat goal-clusters; <2 edits/checkpoint by run 3 | `ledger.interventions_per_checkpoint[]` |
| SI2 | Edit → constraint conversion | % recurring edits (>=5) that become constraints AND get injected (both SPA + proxy, gated) | SPA gated + load-bearing; proxy ungated; "all filtered" warm-cache log misleading | 100% converted + gated both paths | `receipt.constraints_applied[]` + ledger conversion log |
| SI3 | **Constraint efficacy** (does learning stick?) | Violation-recurrence rate AFTER a constraint targeting it is active | unmeasured | -> 0 (targeted violation does not recur) | ledger: violation tagged pre/post constraint |
| SI4 | **Verbalized Sampling** (non-obvious yield) | VS candidate diversity (distinct/total) AND survival rate (VS candidates passing evidence-grounding, not filtered as thin) | VS REVERTED for themes (1-evidence slop); live on recs/proto/IA | applied only to ideation surfaces; >=60% VS-candidate survival; diversity up vs non-VS | `receipt.vs.{surface,candidates,survived,diversity}` |
| SI5 | **Verbalized Confidence / reinforcement inference** (R1) | Calibration: do high/med/low confidence bands match actual correctness on a gold set | log shows `calibration=NO-DATA` (bands not emitted) | calibrated distribution emitted; calibration error <0.15 | `receipt.confidence.{distribution,calibration_error}` |
| SI6 | **Critic-revise loop** | Defects caught by critic AND edits actually LANDED (not the "reports all_accept while nothing changed" bug) | wired on recs first-pass; edits_applied counts proposed not landed (audit bug) | edits_landed == edits_accepted; measurable quality delta pre/post | `receipt.critic.{caught,edits_landed,quality_delta}` |
| SI7 | **Second-brain cycle** (ingest→retrieve→engagement memory→cross-engagement patterns) | Reuse rate: prior-engagement matched+used, cross-engagement patterns injected AND influencing output; retrieval precision | engagement memory + pattern injection load-bearing; GoalRegrade dead (0/0); no source-yield feedback | engagement-memory hit on similar goal; >=1 cross-engagement pattern applied; GoalRegrade alive | `ledger.engagement_reuse` + `receipt.retrieval.{precision,patterns_applied}` |
| SI8 | **COMPOUNDING** (the headline self-improvement KPI) | Does run N+1 on a similar goal score higher on quality KPIs (K7,K9,K10,K11) with fewer interventions (SI1) than run N? | unmeasured — no longitudinal store exists | yes: quality up AND interventions down, run-over-run | `LearningLedger` cross-run delta |
| SI9 | **SkillOpt** (skills self-optimize) | Candidates scored with REAL failures (not neutral 0.5), pass validation-gate, deploy to `.claude/skills`, post-deploy quality delta >0 | orphaned: 0.5 scores, empty failures, /tmp, no deploy | scored+gated+deployed; measured quality lift on the kind it edited | skillopt run log + pre/post rollout scores |

## What the next research pull looks like POST-enhancement (the walkthrough)

Same user action ("research co-op strategy in the AI era," attach docs, run). What changes
is that **every stage now emits to one `RunReceipt`** the operator can read:

1. **Gather** — connectors fan out. Receipt shows `42 attempted / 31 succeeded / 11 failed`
   with reasons (`reddit_fundraising 403, ypulse 404, weforum 403`). If academic sources
   were dropped (paywall), the receipt says so. No silent 30%-corpus run. (K1, K2)
2. **Extract** — bodies enriched THEN scored; receipt shows real relevance distribution and
   `objective_match: 0.71` (or a banner "corpus weakly matches objective" if low). Chunk
   IDs are content-hashed and 100% resolvable. (K6, K7, K8)
3. **Route** — receipt names the provider per stage (`themes: gemini-3.1-pro, sentiment:
   roberta, artifact: opus-4-8`); any fallback (Pro→Flash on 429) is a typed degradation
   event, not a silent swap. (K1)
4. **Analyze** — themes cluster-grounded; receipt: `18 themes, 84% thick, 0 solution-named`;
   topics with RoBERTa sentiment (struggle topics negative — verified); personas + recs
   reference real theme ids (`recs: 9 linked / 0 orphaned`). Verbalized Sampling fires on
   the ideation surfaces only (recs/proto/IA, NOT themes), receipt shows `vs: 12 candidates
   / 8 survived grounding`; verbalized-confidence emits a calibrated high/med/low band
   (not NO-DATA). All identity calls seeded+temp0. (K5, K9–K12, SI4, SI5)
5. **Generate** — artifact built; visual-QA runs out-of-band and stamps `visual_qa: passed,
   0 defects` before you trust it; critic-revise reports `edits_landed: 3` (landed, not
   merely proposed); export parity confirmed. (K3, K4, K13, SI6)
6. **Learn (the second-brain turn)** — your checkpoint edits are logged to the
   `LearningLedger`; recurring ones (>=5) become gated constraints applied next run (both
   SPA + proxy); the rollout is scored with the REAL visual-QA/defect data and fed to
   SkillOpt, whose scored candidate lands in a reviewable `.claude/skills` path; this run's
   synthesis is archived to the wiki so the next engagement retrieves it as engagement
   memory + cross-engagement patterns. (SI1–SI3, SI6, SI7, SI9)
7. **The operator** opens one RunReceipt panel and sees, in <60s, exactly what happened,
   on which providers, at what cost, with what degradations — no docker logs. (K16)
8. **Re-run the same corpus+goal** → identical theme/topic/persona/rec identities (hash
   match), because determinism is now contractual. (K5)
9. **Run a NEW but similar goal next week** — the second-brain compounds: engagement memory
   hits, >=1 cross-engagement pattern is applied, and the ledger shows FEWER human
   interventions and HIGHER quality than the first time. That delta is the proof of
   self-improvement. (SI7, SI8)

## How I measure success of my own effort
- **Leading indicator (per phase):** the phase's exit-KPIs hit target on the real-corpus
  harness, read off the RunReceipt, before I say "done." If the receipt can't show it, the
  phase isn't done.
- **Lagging indicator (whole build):** a single end-to-end real-corpus pull produces a
  RunReceipt green on K1–K16, AND a second identical pull reproduces every identity field
  (K5). That is "functions as intended, flawlessly."
- **Self-improvement lagging indicator (the compounding proof, SI8):** across THREE pulls on
  a goal-cluster, the `LearningLedger` shows human-intervention rate trending down (SI1)
  AND quality KPIs (K9/K10/K11) trending up — the system measurably gets better with less
  human help. A self-improvement loop that doesn't move this number is theater, no matter
  how much it logs. This is the KPI I most have to earn, because the audit shows this half
  is currently the most broken.
- **Anti-regression:** each KPI is asserted by the harness so a later change that breaks it
  fails loudly — the same instrument that grades the build guards it afterward.
- **My accountability to you:** after each phase I report the RunReceipt numbers
  (baseline → current), not prose. If a number isn't green, I say so and why; I do not
  round a yellow up to "done."
