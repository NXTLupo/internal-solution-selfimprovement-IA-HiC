# De-RAG + Consistency-Wiring Audit & Conversion — 2026-06-16

Scope: the four-item realignment goal — (1) de-RAG audit + convert, (2) consistency-wire
self-improvement primitives, (3) gating + §12 writing-guard A/B, (4) scheduling. This file is the
audit deliverable + execution log for items 1 and 2. Items 3 and 4 tracked at the bottom.

All audit findings are code-grounded (three parallel readers over `services/geminiService.ts`,
the GenAISession generators). No live deliverable run yet — see "Acceptance gate" at the end.

---

## 1. De-RAG audit — the surprising root cause

The 2026-06-09 memory ("only generateThemes uses the manifest; personas/recs/journey/PRD/… all
RAG-inject rawSources") is **out of date**. Reality as of this audit:

- **Individual generators do NOT inject `rawSources`/`fetch-articles` directly.** The only in-method
  rawSources catalog left is `generateStrategicReport`'s intended tier-fallback (geminiService.ts
  ~6393-6447), which fires only when the manifest is empty. That is the sanctioned fallback, not a leak.
- **The legacy-RAG leak is ONE centralized chokepoint:** `executeStep` (was ~7137) and
  `executeStepViaGPT` (was ~7064) unconditionally prepended **two embedding-RAG blocks** to *every
  single-shot generation*:
  - `getGoalEvidenceBlock()` → `/api/wiki/fetch-articles` embedding similarity, **120 chunks ×
    7000 chars/article** (notebookRetrieval).
  - `getSubstrateEvidenceBlock()` → `/api/corpus/retrieve` multi-angle, **up to 18 articles ×
    6500 chars** (corpusSubstrate).
- So any generator that grounded via `assembleDeliverableCorpus` (manifest) and then generated via
  `executeStep` shipped **manifest corpus + 120-chunk fetch-articles pack + 18-article substrate
  pack in one prompt** = the HYBRID hollow-deliverable anti-pattern.
- The **chunked path** (`deliverableChunkers`) bypasses `executeStep` (standalone Gemini call) →
  already pure-manifest. So chunked-first methods were HYBRID only on their single-shot fallback.
- `generateThemes` already gates its own embedding-RAG behind `!this.useMcrCorpus`.
- `generateOrgChart` was **ungrounded** — no manifest, no rawSources, told to "infer a plausible
  structure" from chat history when the corpus was silent (a fabrication path).

### Per-generator verdict (pre-conversion)

| Generator | Manifest? | Parallel embedding-RAG via executeStep? | Verdict |
|---|---|---|---|
| generateThemes | yes (MCR-gated) | gated off under MCR | PURE-MANIFEST (happy path) |
| generatePersonas | Phase B yes; Phase A roster no | roster via executeStep | HYBRID (roster) |
| generateRecommendations | yes (3526) | yes (executeStepResilient) | HYBRID |
| generateJourneyMap | yes (3855) | single-shot via executeStepResilient | HYBRID (single-shot) |
| generateOrgChart | **no** | n/a | **UNGROUNDED** |
| generatePRD | yes (4226) | single-shot via executeStep | HYBRID (single-shot) |
| generateRoadmap | yes (4532) | single-shot via executeStep | HYBRID (single-shot) |
| generateTechArchitecture | yes (4782/4813) | single-shot map+sections via executeStep | HYBRID (single-shot) |
| generateGapAnalysis | yes (5617) | single-shot via executeStepResilient | HYBRID (single-shot) |
| generateTechAudit | yes (5825); Phase-B analysis evidence-blind | inventory via executeStep | HYBRID + blind Phase B |
| generateCompetitiveAnalysis | yes (6060) | single-shot via executeStepResilient | HYBRID (single-shot) |
| generateStrategicReport | yes (6390) + rawSources fallback | framework call via executeStep | HYBRID |

## 1b. Conversion applied (2026-06-16)

Minimal, bounded, reversible (Meta-Harness "additive change at the chokepoint"):

- Added opt-in param `groundedViaManifest = false` to `executeStep`, `executeStepViaGPT`, and
  `executeStepResilient` (threaded through to both inner calls). When **true**, the two embedding-RAG
  blocks are **not fetched or injected** — the manifest corpus the caller already built IS the
  grounding. When **false** (default), behavior is unchanged (legacy fallback for ungrounded steps).
- Passed `true` at the **10 manifest-grounded call sites**: recommendations, journey, PRD, roadmap,
  tech-arch (map + sections), gap, tech-audit (inventory), competitive, report-framework.
- Left `false` (correct): personas roster (not manifest-grounded yet), tech-audit Phase-B analysis
  (evidence-blind by design — separate fix), ingest/structure/synthesis steps.
- `generateOrgChart`: added `assembleDeliverableCorpus(...)` grounding + injected the evidence block +
  passed `groundedViaManifest=true`; rewrote the prompt to forbid inventing named individuals.

Result: tsc `--noEmit` exit 0. The HYBRID generators now go manifest-first with the embedding-RAG as a
true fallback (manifest empty → param has no suppression effect because the fallback path still runs
only when the generator didn't ground). orgChart no longer fabricates from an empty corpus.

### Remaining de-RAG gaps (follow-ups, not yet done)

- **personas Phase A roster** is still ungrounded-by-manifest (relies on chat-session context +
  embedding-RAG). Grounding Phase A via `assembleDeliverableCorpus` is the next conversion.
- **tech-audit Phase-B analysis** (geminiService ~5947-5977) receives no evidence block — integration/
  maturity scored without the corpus. Needs its own evidence injection.
- `generateOrgChart` still hardcodes `brand:'nxt'` (ignores #NU) — brand-resolution fix, out of de-RAG scope.

---

## 2. Consistency-wiring matrix (self-improvement primitives)

"Present as a skill" ≠ "invoked on the path." Audit of what each generator actually calls:

| Generator | reinforcement-inference | verbalized-sampling (true k-cand) | critic-revise (runExpertPanel) | human-voice-editor | determinism/temp=0 |
|---|---|---|---|---|---|
| themes | signal only (no RI call) | reverted (documented) | no (depth-enrich instead) | **no** | temp0 + seed42 ✓ |
| personas | signal only (no RI call) | **no** (skill claims k=8; not wired) | yes (runExpertPanel) | **no** | Phase B temp 0.2 |
| recommendations | **yes** | **no** | yes | **no** | temp 0.2 |
| journeyMap | yes | no (Verbalized *Confidence* only) | yes | **no** | enrich temp 0.2 |
| orgChart | **no** | no | **no** | **no** | no |
| PRD | yes | no (VC, single-shot only) | **no** | **no** | no |
| roadmap | yes | no (VC) | yes | **no** | enrich temp 0.2 |
| techArchitecture | **no** | no | **no** | **no** | no |
| gapAnalysis | yes | no (VC) | yes | **no** | enrich temp 0.2 |
| techAudit | yes | no (VC) | **no** | **no** | no |
| competitive | yes | no (VC) | **no** | **no** | enrich temp 0.2 |
| strategicReport | **no** | no | **no** | **no** | section temp 0.35 |

Key consistency findings:
- **`human-voice-editor` is invoked by ZERO generators**, despite the standing rule that it loads at
  every writing touchpoint and the memory claim that it is wired into "ALL deliverables incl THEMES."
  This is the single largest consistency gap.
- **True Verbalized Sampling (k candidates w/ probabilities) is wired NOWHERE** in these generators.
  What is present is **Verbalized Confidence** (the RI uncertainty trigger) — a different primitive.
  The `deck-narrative-composer` / `persona-architect` skill descriptions overstate VS wiring.
- **RI missing** in: themes, personas, techArchitecture, strategicReport, orgChart.
- **critic-revise missing** in: themes, PRD, techArchitecture, techAudit, competitive, strategicReport, orgChart.
- **Determinism** (temp=0 + seed for identity fields) honored only by themes; enrichment calls run 0.2-0.35.

Recommended wiring order (cheapest-highest-value first): (a) human-voice-editor at the shared
generation chokepoint so it covers all paths at once; (b) RI on strategicReport + techArchitecture
(the two with no reinforcement at all); (c) critic-revise on PRD + competitive + techAudit.

---

## 3. Gating (item 3) — gate-strength audit + §12 resolution

Audited every self-improvement loop for acceptance-gate strength (STRICT held-out re-scoring vs
COUNT-threshold vs PATTERN-match vs UNGATED):

| Loop | Edits | Gate | Verdict |
|---|---|---|---|
| epoch-proposer | one harness edit | `goldenSetRunner.compareReports` vs frozen `wiki/eval/golden-set.json`; wiring edits need STRICTLY-better discrimination, content edits must not regress | **STRICT** ✓ (manual fire) |
| SkillOpt `validate-candidate.py` | SKILL.md | held-out failure-coverage ≥0.5 + hygiene-delta ≥ -0.05 before `--auto-promote` | **STRICT (proxy)** ✓ (weekly) |
| promptImprovementEngine | constraint store + `learned-constraints.md` | `occurrences>=5` auto-approve, or single chat rule `confidence>=0.75`; only veto is regex `evaluateConstraint` | **COUNT + PATTERN** ⚠ (live) |
| learningEngine | constraint / SKILL.md patch / anti-pattern / framework / chunk-config | heuristic `confidence>=0.8` applies live; skill-patch/framework/chunk paths have NO quality gate at all | **HEURISTIC, mostly UNGATED** ⚠ (live) |
| constraintQualityGate | (filter for the above) | regex reject-only (master-rule + stub + 40-char floor) | **PATTERN reject-only** |
| improvementDiscriminator | retires bad constraints | re-scores prior-vs-current (confounded: delta split evenly across all new constraints; not a frozen held-out set), retire-only after `runningScore<-0.5 && sampleCount>=3` | **WEAK post-hoc critic, not a pre-acceptance gate** |

**Verdict:** strict held-out gates exist (epoch-proposer, SkillOpt) but guard only the manual/weekly
batch paths. The two highest-volume, fully-automatic, live per-feedback loops (learningEngine,
promptImprovementEngine) accept on counting/heuristics with NO re-scoring — exactly the
"plausible-but-harmful change compounds" failure RHO/SkillOpt warn about, since they write into the
same `learned-constraints.md` + SKILL.md that downstream generation re-reads.

**§12 writing-guard A/B — RESOLVED (mechanism-grounded):**
- `validate_writing_quality.py` is a Claude Code **Stop hook** (hybrid: blocks on 5 high-precision
  structural tells, shadows the rest). It writes **no** constraints and does **not** run in the runtime
  SPA→proxy deck path. Therefore it **cannot** cause the §6a runtime deck slop, and **cannot** feed the
  constraint-injection loop. The owner's "guard causes slop" theory is **mechanistically unsupported**
  for runtime slop; the §6a slop came from the runtime detect-only scrub (fixed 2026-06-16) + generation.
- The untracked lexicon **demoted** some hard-bans (e.g. "value proposition" → tier-2), making it LESS
  strict than committed; publishing it would relax bans — so leaving it untracked is defensible until a
  live A/B, but it is not "causing" slop.
- The REAL feedback-loop slop risk is the **weakly-gated live constraint loops** above, not the guard.
- Remediation (open): route learningEngine/promptImprovementEngine from auto-apply to **propose-only →
  strict gate** (reuse `goldenSetRunner`/discriminator as a PRE-acceptance gate), and apply
  `constraintQualityGate` on the learningEngine skill-patch/framework/chunk paths that currently bypass it.

## 4. Scheduling (item 4) — DONE (reviewable in-repo)

Authored the second-brain cadence (nightly ingest → weekly maintenance → monthly health-check):
- `scripts/self-improvement-schedule.sh` — headless runner (nightly|weekly|monthly): proactive ingest
  (`/api/scheduler/poll-youtube-channels`) + manifest-parity audit + delegates to `skillopt-weekly.sh`;
  health log to `wiki/synthesis/self-improvement-health-log.md`.
- `humans-in-control-research/SELF_IMPROVEMENT_SCHEDULE.md` — full cadence manifest + Task Scheduler /
  cron install + the Claude-lane `/schedule` invocations for the agent-driven jobs (wiki-curator,
  cross-engagement-pattern-miner, epoch-proposer, orphan/schema auditors).
- Gate posture: schedule only FIRES harness-editing jobs; the STRICT gates (SkillOpt, epoch-proposer)
  decide what persists. Read-only auditors propose, never auto-mutate. Cloud-cron creation deferred to
  explicit approval (spawning recurring autonomous agents is an outward action).

---

## Acceptance gate (discipline: propose-and-test, per RHO/SkillOpt/Meta-Harness)

The de-RAG conversion is tsc-clean and bounded, but its EFFECT on deliverable quality is not yet
live-verified. Before this is considered "accepted":
- Run the SAME deliverable (e.g. a #slides deck) on the current build (HYBRID) vs the de-RAG build
  (manifest-only) and compare grounding depth, citation diversity, and hollowness. Manifest-only must
  be **no worse** (target: better — less bulk dilution).
- This requires a `research-generator` rebuild + hard-refresh (landmine #1: never mid-run).
- Revert path if it regresses: remove the `, /* groundedViaManifest */ true` flags (one line each).
