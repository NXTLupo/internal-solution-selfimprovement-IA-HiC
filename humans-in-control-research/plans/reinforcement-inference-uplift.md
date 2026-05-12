# Reinforcement Inference Uplift Plan for Humans in Control

> Source: *Reinforcement Inference: Two-Pass Reasoning with Uncertainty-Triggered Re-asking*. arXiv:2602.08520v3 (paper text at `.claude/skills/intelligence/reinforcement_inference.pdf`). The PDF is image-based — full transcript was pasted into the prior conversation turn and is the basis for everything below.

## What the paper actually proves

Reinforcement Inference (RI) is a training-free inference-time technique with one core move: **after a model answers, measure how uncertain it was; if uncertainty crosses a threshold, re-ask the same question with the previous answer included and a hint that the prior attempt was uncertain.** No ground truth. No external verifier. No fine-tuning. The model is its own second-opinion mechanism — but only on the subset of inputs where its own first-pass distribution was peaky-but-not-confident-enough.

The numbers the paper reports on DeepSeek-v3.2 / MMLU-Pro:

| Metric | Direct (1-pass) | RI (2-pass on triggered) |
|---|---|---|
| Overall accuracy | 60.72% | **84.03%** |
| Re-ask rate | 0% | ~61% of items |
| Accuracy on re-asked subset | 23.99% (1st pass) | **80.13%** (2nd pass) |
| Cohen's h on re-asked subset | — | 0.8117 (very large) |
| Threshold sweep stability | — | 83.69%–84.34% across 16 (τH, τMSP) configs |

Subject-level gains are not uniform: History +60pp, Law +50pp, Psychology +43pp, Philosophy +38pp, Economics +35pp, Math +35pp. The pattern is striking — RI helps **most where the answer requires composing facts**, less where the model is either confidently right or confidently wrong on the first pass.

Three properties matter for our purposes:

1. **Uncertainty trigger** — H(P) > 0.8 nats OR MSP(P) < 0.6. The paper's threshold sweep shows the result is robust across a wide band — you don't have to tune precisely.
2. **Answer-anchored re-asking is load-bearing.** The prompt-only ablation ("think again, harder") *underperforms* the baseline. The gain only materializes when the second pass includes the first answer AND the uncertainty hint. Without anchoring, you get random regression.
3. **Overconfident-wrong is invisible to RI.** The trigger is uncertainty, not error. If the model is calibrated badly (confidently wrong), RI does nothing for it.

The paper's named limitations — multiple-choice focus, dependency on calibration, anchoring effects, no multi-step iteration — are real and shape how RI must be adapted for an open-ended consulting workbench.

## How RI relates to what we already shipped

RI is the **action** half of a self-improvement loop. Verbalized Sampling (VS), which we shipped at three touchpoints (theme generation Pass 1, recommendations, prototype Stage 1), is the **surfacing** half. Together they form one mechanism:

```
                       SURFACE                       ACT                          REMEMBER
                          │                            │                              │
    ┌─────────────────────▼─────────────┐  ┌───────────▼──────────────┐  ┌────────────▼──────────┐
    │  Verbalized Sampling              │  │  Reinforcement Inference │  │  Wiki + Skills        │
    │  - k candidates with probabilities│  │  - trigger on low conf   │  │  - learned-constraints│
    │  - verbalized confidence per claim│  │  - re-ask with prior     │  │  - quality-scores     │
    │  - distribution-level prompting   │  │  - merge / replace       │  │  - uncertainty-ledger │
    └───────────────────────────────────┘  └──────────────────────────┘  └───────────────────────┘
                          │                            │                              │
                          └────────────────┬───────────┘                              │
                                           │                                          │
                                           └──── feeds back ──────────────────────────┘
```

**One-line thesis: VS makes uncertainty legible. RI acts on it. The wiki remembers where uncertainty keeps firing so we can fix the prompt structurally. Skills make all three composable.**

This is also why the existing skills inventory has no obvious overlap risk — we have pre-flight gates (`preflight`, `score-prompt`, `diagnose-prompt`), post-flight gates (`qa-gate`, `self-review`, `drift-check`), and surfacing (`verbalized-sampling`), but no **in-flight** mechanic for "the model just answered, was it confident enough to ship?". RI fills that gap.

## What HiC has today that we can repurpose

The four-pillar audit surfaced a lot of latent infrastructure. Listing it cleanly so the plan can route through what exists rather than rebuild:

### Six uncertainty signals already computed at runtime

| Signal | Where | Currently used for |
|---|---|---|
| `validation.failures: string[]` | `geminiService.ts:4546-4600` (validateDeliverableOutput) | Triggers single regenerate on 5 deliverables |
| `QualityScore.failingDimensions: string[]` | `wikiService.ts:1907-1959` (scoreOutput) | Threshold `overall >= 3.8`; not wired to retry |
| `SlopViolation[]` (banned-phrase hits) | `wikiService.ts:1973-1990` (detectBannedPhrases) | Strip + auto-correct in post-processor |
| `EvidenceDensity.sectionsWithout: string[]` | `wikiService.ts:2035-2063` | Feeds into `QualityScore.evidence` |
| `validateSlideDepth.score: 1–3` + `missingLayers[]` | `slidePostProcessor.ts:511-538` | Flag if depth < 3 |
| `PostProcessorResult.issueCount` + `autoCorrectedCount` | `slidePostProcessor.ts:854-857` | Logging only; not gated |

**None of these crosses a probabilistic threshold the way RI's H/MSP does.** They are deterministic rule-matchers. But each one is a usable *proxy* for "the model's output looks unstable in this dimension."

### Five existing conditional regeneration loops (validation-failure-triggered)

`geminiService.ts:1931-1935` (Recommendations), `:2205-2209` (Journey Map), `:2460-2464` (PRD), `:2560-2564` (Roadmap), `:3433-3437` (Gap Analysis). Each re-calls `this.generateX(validation.failures.join('. '), onStream)`.

**Crucial divergence from RI**: these retries pass *validation failures* as feedback but **drop the original answer**. The model re-generates from scratch. The paper explicitly shows this underperforms — the gain requires anchoring on the prior answer plus an uncertainty hint. We are using half the technique today.

### One transient-retry layer (HTTP-error-triggered, not uncertainty-triggered)

`aiRetryClient.ts:73-152` — retries 5xx/429 with exponential backoff. Tactical infrastructure, not part of the self-improvement loop.

### Two human-in-the-loop self-improvement loops already wired

- **Edit-learning** (within-session, localStorage-backed):
  - Capture: `AnalysisCheckpoint.tsx:186-193` → `logEditToEngine(stage, desc, '', desc)`
  - Persist: `promptImprovementEngine.ts:55-78` → `localStorage.setItem(EDIT_LOG_KEY)`
  - Auto-approve threshold: 5+ edits, 60%+ directional consistency (`promptImprovementEngine.ts:153-172`)
  - Read-back: `getActiveConstraints()` injected into Gemini prompts (`geminiService.ts:2930-2931, :3919`)

- **Engagement memory** (cross-session, wiki-persisted):
  - Build: `engagementRetrospective.ts:47-169`
  - Persist: `engagementRetrospective.ts:176-194` → `POST /api/wiki/write` to `wiki/engagements/{slug}-retrospective.md`
  - Load: `wikiService.ts:1148-1205` (slug match + 3-keyword semantic overlap)

### Wiki layer (the "second brain")

- `synthesis/learned-constraints.md` — auto-generated from edit patterns; injected into prompts
- `synthesis/quality-scores.md` — per-deliverable score history (interface exists at `wikiService.ts:1416-1436`, **not currently called**)
- `synthesis/log.md` — chronological ops log
- `engagements/{slug}-retrospective.md` — per-research-goal snapshot
- `frameworks/` (11) + `anti-patterns/` (13) — semantic context loaded via `loadGenerationContext()`
- `.embeddings.json` + `.vectors.db` — 679 embeddings via OpenAI text-embedding-3-small (1536-dim)

What's missing: **no per-deliverable confidence ledger**, **no uncertainty timeline**, **no "where do we keep being unsure" view**.

## The plan: five phases, ordered by leverage × independence

Each phase is shippable on its own. Each adds a discrete capability. Each composes with the others without requiring them.

---

### Phase R1 — Verbalized Confidence as the entropy proxy

**The problem RI assumes solved**: you can measure the model's uncertainty about its own answer. In the paper, this is `H(P) > 0.8` or `MSP(P) < 0.6` using token-level logprobs.

**The problem we actually have**: Anthropic, OpenAI (chat completions), and Gemini do not expose logprobs in production deliverable generation. Even where they do (OpenAI `logprobs: true`, Gemini `responseLogprobs`), aggregating per-claim entropy from a 4000-token structured JSON output is a research problem in its own right.

**The bridge**: have the model **verbalize** its confidence per claim. This is a natural extension of Verbalized Sampling — the same mechanic that asks "emit candidates with probabilities" can ask "emit answer with confidence per claim, and emit a self-assessment of which claims are least defensible."

#### Schema extension

Every deliverable schema that produces atomic claims (themes, personas, recommendations, slide blocks, prototype briefs, chat answers) gains two optional fields:

```typescript
type Claim<T> = T & {
    confidence?: 'high' | 'medium' | 'low';     // verbalized self-assessment
    confidenceRationale?: string;                // 12-word "why this score"
};

type DeliverableEnvelope<T> = {
    payload: T;
    selfAssessment?: {
        leastDefensibleClaims: string[];         // model lists 1-3 worst by ID
        rationale: string;                       // 1-2 sentences on what's shaky
        overallConfidence: 'high' | 'medium' | 'low';
    };
};
```

The model is asked **explicitly**: "After you produce the payload, identify the 1–3 claims you would most expect a senior partner to push back on, and rate your overall confidence." This is the *only* way to get RI's signal in a closed-source-API world.

#### Where this lands

- `services/aiRouter.ts` — extend deliverable type definitions with `Claim<T>` and `DeliverableEnvelope<T>`
- `services/geminiService.ts` — at the prompt-build sites for themes (`generateThemes`), personas (`generatePersonas` Phase B), recommendations (CorpusChatPanel's #recommendations), and prototype Stage 1 — append a Verbalized Confidence preamble identical in shape to the existing VS preamble
- `services/corpusChatService.ts` — chat answers gain `confidence` + `selfAssessment` at the top level
- The existing `verbalized-sampling` skill gets a §6 documenting the Verbalized Confidence variant (one skill, two related techniques)

#### Why this is foundational

RI without an entropy proxy is unbuildable. With Verbalized Confidence, every downstream phase has a trigger signal. Without it, every downstream phase has to invent its own.

#### Acceptance criteria

- [ ] Five deliverables emit `confidence` per claim and a `selfAssessment` block (themes, personas, recommendations, prototype briefs, chat answers).
- [ ] The post-processor at `slidePostProcessor.ts` *preserves* the confidence fields (does not strip them as "process language").
- [ ] At least one deliverable run logs to console with a mix of `high` / `medium` / `low` confidences (calibration sanity check — if everything comes back `high`, the prompt is wrong).
- [ ] The `selfAssessment.leastDefensibleClaims` array points to real claim IDs in the payload.

---

### Phase R2 — Reinforcement Inference re-ask wrapper

**The mechanic**: a generic wrapper that takes any (prompt, response) pair, evaluates uncertainty against a composite signal, and if triggered, builds an **answer-anchored** re-ask prompt that includes the prior response and a hint that the prior attempt looked uncertain. Returns either the original or the re-asked response (or a merged variant — see below).

#### Composite uncertainty signal

We don't have logprobs, so the trigger is a weighted sum of proxies that we *do* have. Default weights below, tunable per-deliverable via a registry:

```typescript
interface UncertaintySignal {
    verbalizedConfidence: number;     // 1.0 if 'low', 0.5 if 'medium', 0.0 if 'high'
    leastDefensibleCount: number;     // count from selfAssessment.leastDefensibleClaims
    validationFailures: number;       // count from validateDeliverableOutput()
    slopViolations: number;           // count from detectBannedPhrases()
    evidenceDensityGap: number;       // count from computeEvidenceDensity().sectionsWithout
    failingDimensions: number;        // count from scoreOutput().failingDimensions
}

// Trigger: weighted score > threshold
const TRIGGER_SCORE = (s: UncertaintySignal) =>
    s.verbalizedConfidence * 2.0   // self-reported uncertainty is the strongest signal
  + Math.min(s.leastDefensibleCount, 3) * 0.5
  + Math.min(s.validationFailures, 4) * 0.6
  + Math.min(s.slopViolations, 5) * 0.2
  + Math.min(s.evidenceDensityGap, 3) * 0.4
  + Math.min(s.failingDimensions, 3) * 0.5;

const TRIGGER_THRESHOLD_DEFAULT = 1.2;  // tunable per deliverable
```

The paper's threshold-sweep stability finding (83.69%–84.34% across 16 configs) is the licence to **not over-tune this**. We pick a defensible default, expose a registry override, and move on. The economics analogue: 16 different settings all produced effectively the same gain.

#### Re-ask prompt shape (load-bearing — this is what the paper actually shows works)

```
You previously produced the response below to the same task. After reviewing it,
several signals suggest uncertainty in your first attempt:

[Bulleted uncertainty signals — verbalized low confidence on X, weak evidence
for Y, validation flagged Z]

Your prior response:
"""
{prior_response_serialized}
"""

Reconsider the task with these signals in mind. You may:
  (a) Keep the response largely intact if you remain confident, or
  (b) Revise specific claims that the signals flag, or
  (c) Replace any claim where the original was guessing.

Output the same schema, but only revise where the signals indicate.
```

Three properties enforced:
- **Anchored** (the paper's core load-bearing requirement) — prior response is in-context.
- **Targeted** — the uncertainty signals are listed by name so the model knows *what* to revise.
- **Conservative** — model is permitted to keep claims it remains confident about (this prevents the "make it different just to be different" regression the paper warns about).

#### Where this lands

New service: `services/reinforcementInference.ts`. Exports one primary function plus helpers:

```typescript
async function reinforceIfUncertain<T>(
    originalPrompt: string,
    originalResponse: DeliverableEnvelope<T>,
    signals: UncertaintySignal,
    options: {
        deliverableType: string;
        endpointId: 'gemini' | 'openai' | 'anthropic';
        model?: string;
        threshold?: number;             // override registry default
        onReask?: (reason: string) => void;  // UI hook
        merge?: 'replace' | 'merge';    // default 'replace'
    }
): Promise<{
    final: DeliverableEnvelope<T>;
    reasked: boolean;
    triggerScore: number;
    triggerReasons: string[];
}>;
```

The function:
1. Computes `TRIGGER_SCORE(signals)`.
2. If below threshold → return original unchanged, `reasked: false`.
3. If above → builds the anchored re-ask prompt, calls `callAIWithRetry()` via the existing retry client.
4. If `merge: 'replace'`, returns the new response. If `'merge'`, runs a third synthesis call to reconcile (only for high-stakes deliverables; default off).
5. Logs the event to `wiki/synthesis/uncertainty-ledger.md` via the proxy (Phase R4).

#### Acceptance criteria

- [ ] `reinforceIfUncertain` exists and is unit-testable (can be called with mock signals and a mock endpoint).
- [ ] Trigger logic produces the same boolean across two runs given the same signal vector (deterministic).
- [ ] Re-ask prompt includes the prior response **verbatim** (not summarized) up to a serialization budget.
- [ ] On re-ask, the function logs `[ReinforcementInference] triggered: deliverableType=X, score=Y, reasons=[...]` to console.
- [ ] If the second pass fails (network error, timeout), the original response is returned (graceful fallback).

---

### Phase R3 — Wire RI into the five existing regenerate sites + four new ones

The existing regeneration loops (recommendations, journey map, PRD, roadmap, gap analysis) are the lowest-cost surgery: they already retry on `validation.failures`. We just replace the "regenerate from scratch" with "anchor + reinforce."

#### Migration pattern (per site)

```typescript
// BEFORE (geminiService.ts:1931-1935 example):
if (!validation.valid && !feedback) {
    return this.generateRecommendations(validation.failures.join('. '), onStream);
}

// AFTER:
if (!validation.valid && !feedback) {
    const signals: UncertaintySignal = {
        verbalizedConfidence: confidenceToScore(envelope.selfAssessment?.overallConfidence),
        leastDefensibleCount: envelope.selfAssessment?.leastDefensibleClaims?.length ?? 0,
        validationFailures: validation.failures.length,
        slopViolations: detectBannedPhrases(envelope.payload).length,
        evidenceDensityGap: computeEvidenceDensity(envelope.payload).sectionsWithout.length,
        failingDimensions: scoreOutput(envelope.payload).failingDimensions.length,
    };
    const result = await reinforceIfUncertain(
        originalPrompt,
        envelope,
        signals,
        { deliverableType: 'recommendations', endpointId: 'gemini', model: 'gemini-3.1-pro-preview' }
    );
    return result.final.payload;
}
```

#### Five sites to migrate (existing regen loops)

| Site | File:Line | Deliverable | Threshold |
|---|---|---|---|
| 1 | `geminiService.ts:1931-1935` | Recommendations | 1.2 (default) |
| 2 | `geminiService.ts:2205-2209` | Journey Map | 1.4 (higher — fewer re-asks tolerated) |
| 3 | `geminiService.ts:2460-2464` | PRD | 1.0 (lower — accuracy critical) |
| 4 | `geminiService.ts:2560-2564` | Roadmap | 1.2 |
| 5 | `geminiService.ts:3433-3437` | Gap Analysis | 1.0 (lower — evidence-heavy) |

#### Four new sites to add RI (where validation doesn't currently retry)

| Site | File | Deliverable | Why add |
|---|---|---|---|
| 6 | `geminiService.ts` `generateThemes` Pass 1 BREADTH | Themes | Foundational. Bad themes cascade to every downstream deliverable. |
| 7 | `geminiService.ts` `generatePersonas` Phase B | Persona enrichment | Per-persona enrichment is where mode collapse hits hardest. |
| 8 | `services/prototypeBuilder.ts` Stage 1 | Concept Decomposer brief | Stage 1's brief is the foundation of every prototype. User has flagged prototypes as "lame." |
| 9 | `services/corpusChatService.ts` `sendChatMessage` | Chat answers | The AI Analyst is the user-facing intelligence surface. Low-confidence answers should self-reconsider before shipping. |

#### Acceptance criteria

- [ ] All 9 sites call `reinforceIfUncertain` and respect the result.
- [ ] Re-ask rate per deliverable type is logged to console.
- [ ] Each site has a registry entry in `services/reinforcementInferenceRegistry.ts` defining its threshold and merge mode.
- [ ] On a 5-run sanity test, at least one re-ask fires per deliverable type (catches "trigger never fires" bugs).
- [ ] Network-error path returns the original gracefully (no thrown exception).

---

### Phase R4 — Uncertainty Ledger in the wiki (the "remember" pillar)

**The problem**: if RI keeps re-asking on "themes" for every engagement in higher-ed advancement, that's not a per-run problem. That's a *prompt-structure* problem. We need to surface it.

**The mechanic**: every `reinforceIfUncertain` invocation appends an entry to `wiki/synthesis/uncertainty-ledger.md`. After N entries (default 20), the ledger summarizer runs (a separate LLM call or a deterministic aggregator) and writes a synthesis section showing which `(deliverableType, signalPattern)` combinations recur most often. Those become **structural prompt issues** that the next pass of prompt engineering should fix.

#### Ledger schema

```yaml
---
title: Uncertainty Ledger
type: synthesis
updated: 2026-05-12
total_invocations: 0
total_reasks: 0
---

## Recent Invocations (most recent first, last 200)

### 2026-05-12T14:32:00Z — recommendations — REASKED
- Engagement: northeastern-advancement-strategy
- Trigger score: 1.85 (threshold 1.2)
- Reasons:
  - verbalizedConfidence: low (weight 2.0)
  - leastDefensibleCount: 2 (weight 1.0)
  - evidenceDensityGap: 3 (weight 1.2)
- Final outcome: kept 7/10 recommendations; revised 3
- Time to re-ask: 18.4s

### 2026-05-12T14:21:00Z — themes — NOT_TRIGGERED
- Engagement: northeastern-advancement-strategy
- Trigger score: 0.6 (threshold 1.2)

## Recurring Uncertainty Patterns (auto-summarized weekly)

### Pattern: recommendations consistently uncertain on "evidence density" axis
- Observed in 14/22 invocations over last 30 days
- Suggested structural fix: increase per-concept evidence requirement in recommendation-architect skill; require minimum 3 cited sources per "non-obvious bet"
- Status: open
```

#### Where this lands

- New endpoint: `POST /api/wiki/uncertainty-ledger/append` in `proxy/app.py` (similar shape to existing wiki write).
- New aggregator: `services/uncertaintyLedger.ts` with `appendLedgerEntry()` and `summarizeRecurringPatterns()`.
- The ledger is **read back** into `loadGenerationContext()` (`wikiService.ts:1484-1596`) at generation time — so any deliverable that has a known recurring uncertainty pattern gets a *pre-emptive constraint* injected ("for recommendations, evidence density has been a recurring weakness — front-load 3+ citations per concept").

#### Why this matters for self-improvement compounding

This is what closes the loop. Without R4, RI is a per-run patch. With R4, RI becomes a **diagnostic** that feeds the prompt-engineering process itself. The pattern "we always re-ask gap analysis on evidence density" is the kind of signal we currently have no way to see, and it's directly actionable — it tells us to rewrite the gap-analysis framework page in the wiki.

#### Acceptance criteria

- [ ] Every `reinforceIfUncertain` invocation (triggered OR not) writes a ledger entry.
- [ ] Ledger entries include trigger score, reasons, deliverable type, engagement slug, and timestamp.
- [ ] Weekly aggregator produces a "recurring patterns" section in the ledger.
- [ ] `loadGenerationContext()` reads the ledger and injects relevant patterns into the prompt as `KNOWN UNCERTAINTY PATTERNS`.
- [ ] Manual smoke test: produce 5 deliverables, inspect the ledger, confirm entries are accurate.

---

### Phase R5 — Skill: `reinforcement-inference`

Make RI a first-class discipline document so future skills can compose against it.

#### Skill spec

- Location: `.claude/skills/reinforcement-inference/SKILL.md`
- Frontmatter: `name: reinforcement-inference`, `thinking: max`, `composes_with: [verbalized-sampling, recommendation-architect, theme-analyst, persona-architect, deck-narrative-composer]`
- Body sections:
  1. **Purpose** — what RI is, what it isn't, when to invoke
  2. **The two load-bearing requirements** — uncertainty trigger + answer-anchored re-ask
  3. **Composite uncertainty signal** — exact weights, threshold defaults
  4. **The anchored re-ask prompt template** — copy-pasteable
  5. **Composition with Verbalized Sampling** — VS surfaces, RI acts
  6. **When NOT to invoke** — overconfident-wrong inputs, single-shot factual lookups, generative-only tasks with no validation surface
  7. **Examples** — 2-3 worked examples in HiC's actual deliverable types
  8. **Skill manifest registration** — composes_with edges to register

#### Manifest registration

Update `humans-in-control-research/hic-workspace/skill-manifest.json`:

```json
{
  "name": "reinforcement-inference",
  "thinking": "max",
  "composes_with": [
    "verbalized-sampling",
    "recommendation-architect",
    "theme-analyst",
    "persona-architect",
    "deck-narrative-composer",
    "strategy-author"
  ],
  "introduced": "2026-05-12",
  "purpose": "Uncertainty-triggered answer-anchored re-asking. Compose with verbalized-sampling: VS surfaces, RI acts."
}
```

#### Acceptance criteria

- [ ] SKILL.md exists and is under 600 lines.
- [ ] Skill manifest entry exists and validates against existing schema.
- [ ] At least one HiC service references the skill via the skill-loader (sanity check that the discipline doc is reachable).
- [ ] Skill explicitly documents the composition contract with verbalized-sampling (so the two are usable together without conflict).

---

## Risks and what NOT to do

### Don't over-rotate on the trigger threshold

The paper's most useful empirical finding for us is the threshold-sweep stability. Picking a defensible default and shipping is correct. Spending two weeks A/B testing thresholds is wrong. The composite-signal weights are more impactful than the threshold value — tune those first if anything.

### Don't ask the model to think harder without anchoring

The paper's ablation is explicit: the prompt-only "reconsider, think more carefully" pattern *underperforms* baseline. If we ever simplify the re-ask prompt to drop the prior answer, we will regress. Hard rule: every re-ask includes the prior response verbatim.

### Don't apply RI to deliverables without a validation surface

RI works because the model can compare its second pass to its first pass on dimensions that have observable variance. If a deliverable has no schema, no citations, no evidence requirement, and no banned-phrase rules, the composite signal will always be zero and the re-ask will be silent noise. RI belongs on structured deliverables.

### Don't break the existing edit-learning loop

The wiki's `learned-constraints.md` is driven by human edits at checkpoints. RI's uncertainty ledger is a *complementary* signal — it captures what the model itself is unsure about, not what the user corrected. Both should write to the wiki; neither should overwrite the other. Schema-segregate cleanly: edit patterns in `learned-constraints.md`, model uncertainty in `uncertainty-ledger.md`.

### Don't double-charge the user on cost

A re-ask is a second model call. At Gemini 3.1 Pro pricing this is non-trivial across 9 sites. Mitigation: (1) the threshold is set so most generations don't re-ask; (2) the registry per-deliverable threshold lets us tune sites that are over-triggering; (3) on the chat surface (R3 site #9), default `merge: 'replace'` (cheapest) and never run the third "merge" call.

### Don't trust verbalized confidence too much

The paper's underlying assumption — that a probability distribution over output tokens is well-calibrated — is empirically supported on DeepSeek-v3.2 but only loosely supported on aligned models in general. Verbalized confidence is even more fragile (the model is reporting a metacognitive judgment, not its own logprobs). Mitigation: weight `verbalizedConfidence` at 2.0 in the composite signal — strong but not exclusive. Failing validation (`validationFailures`), evidence gaps, and least-defensible counts are corroborating signals. Triggering on confidence alone is dangerous; triggering on confidence + 1 corroborator is sound.

### Don't extend to generative-only domains yet

The paper explicitly carves this out as future work. For us, this means: don't apply RI to image generation, video generation, or HTML-artifact rendering. Those domains lack the per-claim structure RI relies on. Stick to text deliverables for v1.

## Phasing and effort estimate

| Phase | Effort | Dependencies | Shippable independently? |
|---|---|---|---|
| R1 — Verbalized Confidence | ~1 day | None | Yes (no other phase needs it for v0) |
| R2 — RI wrapper | ~1.5 days | R1 (for signals) | Yes (5 existing regen sites can migrate first) |
| R3 — Wire 9 sites | ~2 days | R1 + R2 | Yes (per-site rollout, can ship 5 sites first) |
| R4 — Uncertainty Ledger | ~1.5 days | R2 (for instrumentation) | Yes |
| R5 — Skill spec | ~0.5 day | All above (for grounded examples) | Yes |

**Total**: ~6.5 days of focused work.

## What success looks like

When this lands, the following will be true:

1. Themes, personas, recommendations, prototype briefs, and chat answers all emit verbalized confidence. Users can see in the UI which claims the model itself flagged as shakiest.
2. The five existing regenerate loops migrate from "throw it away and start over" to "anchor on the prior answer and reconsider." This is the paper's actual technique, not a half-implementation.
3. Four new uncertainty-triggered surfaces (themes, personas, prototype Stage 1, chat) gain reconsideration that wasn't there before.
4. The `wiki/synthesis/uncertainty-ledger.md` becomes a meta-diagnostic: "we keep being unsure about evidence density in gap analyses" becomes a structural prompt-engineering signal we can act on.
5. The `reinforcement-inference` skill makes the technique available to future skills as a composition primitive — pair it with any output-shaping skill and that skill gains uncertainty-conditioned reconsideration.
6. Verbalized Sampling + Reinforcement Inference + Wiki + Skills now form a coherent self-improvement loop: VS surfaces, RI acts, Wiki remembers, Skills compose. The four pillars are no longer four separate features.

## Open questions to validate before R3

1. **Calibration sanity check (validate R1)**: When we ask Gemini 3.1 Pro to verbalize confidence on real HiC outputs, does the distribution span low/medium/high, or does it collapse to "high" for everything? If it collapses, the prompt needs to specifically force a sub-uniform distribution (mirroring the VS pattern — "rate each claim's confidence; no more than 60% may be 'high'").
2. **Cost ceiling (validate before R3)**: At the registry's default threshold of 1.2, what's the empirical re-ask rate across the first 20 production runs? If it's > 60% we are paying double. If it's < 5% the threshold is too high.
3. **User trust (validate during R3 rollout)**: When the AI Analyst chat re-asks itself before responding, does it add user-perceived latency that hurts the conversational experience? If so, downgrade the chat surface to a *background* second pass that only fires for explicit "I'm not sure about my answer" cases.
4. **Wiki feedback loop quality (validate after R4)**: After 100+ ledger entries, are the auto-detected "recurring uncertainty patterns" structurally useful (we can act on them) or are they restating the obvious? If the latter, the aggregator needs better prompts — not more data.

These four questions are the empirical gates that tell us whether the technique transfers from the paper's MMLU-Pro benchmark to our open-ended consulting workbench.

