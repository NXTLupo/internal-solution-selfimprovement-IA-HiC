---
name: reinforcement-inference
description: Training-free inference-time technique that re-asks the model to reconsider its own answer when uncertainty crosses a threshold. The second pass MUST include the prior answer verbatim plus an uncertainty hint — anchored re-asking is load-bearing; prompt-only "think harder" underperforms baseline. Composes with verbalized-sampling (VS surfaces uncertainty by emitting candidates with probabilities and per-claim confidence; RI acts on that uncertainty by triggering an anchored second pass). Apply at HiC's existing regeneration sites (recommendations, journey map, PRD, roadmap, gap analysis) and at four new surfaces (themes, persona enrichment, prototype Stage 1, chat answers). Effect size on the paper's benchmark: DeepSeek-v3.2 MMLU-Pro 60.72% → 84.03% with Cohen's h = 0.81 on re-asked subset.
thinking: max
---

# Reinforcement Inference — Uncertainty-Triggered Two-Pass Reasoning

> Source: *Reinforcement Inference: Two-Pass Reasoning with Uncertainty-Triggered Re-asking.* arXiv:2602.08520v3. PDF at `.claude/skills/intelligence/reinforcement_inference.pdf`. The PDF is image-only; the operational summary below is what you need to apply the technique.

## The problem this skill solves

Even capable models produce wrong answers when their internal distribution over candidates is peaky-but-not-quite-confident — the answer space is roughly bimodal, the model commits to one mode, and it commits to the wrong one. On MMLU-Pro, DeepSeek-v3.2's first-pass accuracy on the *items where it was uncertain* is 23.99%. On the same items, after a single re-ask that includes the prior answer plus an uncertainty hint, accuracy jumps to 80.13%. Cohen's h = 0.8117 — a very large effect.

For HiC, this looks like:
- Recommendations that pass validation but are clearly second-best (the model knew it was second-best)
- Slide narratives where one block is sharp and the next is hedged
- Gap analyses with confident severity ratings on weak evidence
- Chat answers that hedge with "based on the available information" because the model couldn't commit

The model already knows it's uncertain in these moments. We just haven't been asking.

## The mechanism

RI is two moves:

1. **Trigger** — measure uncertainty against a threshold. The paper uses token-level entropy (H > 0.8 nats) or max softmax probability (MSP < 0.6). Both work. Threshold-sweep stability across 16 (τH, τMSP) configs is 83.69%-84.34% — the technique is robust to threshold choice.

2. **Anchored re-ask** — if triggered, build a new prompt that includes (a) the original question, (b) the model's prior answer **verbatim**, and (c) an instruction that the prior attempt showed uncertainty. Ask the model to reconsider with permission to keep, revise, or replace specific claims.

Crucially: the paper's prompt-only ablation ("think again, more carefully") **underperforms baseline**. The gain only materializes with answer-anchored re-asking. The model must see what it said before, or it has no leverage to do better.

## Why HiC can't use logprobs directly

Anthropic, OpenAI (chat completions), and Gemini do not expose token-level logprobs in production deliverable generation. Even where exposed (OpenAI `logprobs: true`, Gemini `responseLogprobs`), aggregating per-claim entropy from a 4000-token structured JSON output is unsolved. HiC needs **proxies** for uncertainty.

## The composite uncertainty signal

Six measurable proxies, weighted:

| Signal | Source | Weight |
|---|---|---|
| `verbalizedConfidence` (low=1.0, medium=0.5, high=0.0) | Model self-assessment in deliverable envelope | 2.0 |
| `leastDefensibleCount` (clipped to 3) | `selfAssessment.leastDefensibleClaims.length` | 0.5 |
| `validationFailures` (clipped to 4) | `validateDeliverableOutput().failures.length` | 0.6 |
| `slopViolations` (clipped to 5) | `detectBannedPhrases().length` | 0.2 |
| `evidenceDensityGap` (clipped to 3) | `computeEvidenceDensity().sectionsWithout.length` | 0.4 |
| `failingDimensions` (clipped to 3) | `scoreOutput().failingDimensions.length` | 0.5 |

**Trigger formula** (all weights × signals, summed, clipped):

```
score = 2.0 × verbalizedConfidence
      + 0.5 × min(leastDefensibleCount, 3)
      + 0.6 × min(validationFailures, 4)
      + 0.2 × min(slopViolations, 5)
      + 0.4 × min(evidenceDensityGap, 3)
      + 0.5 × min(failingDimensions, 3)

trigger = (score > threshold)   # default threshold: 1.2
```

**Why these weights**: verbalized confidence is the strongest signal because it's the model directly answering the question RI cares about — "are you sure?" — and is weighted 2.0. The deterministic rule-matchers (validation, slop, evidence, dimensions) are corroborating signals that triangulate the verbalized self-assessment. The composite is intentionally over-determined: a single low corroborator with high confidence does not trigger; a verbalized "low" with one corroborator does.

**Threshold tuning**: don't over-rotate. The paper's threshold-sweep stability is the licence to pick a defensible default and ship. If a specific deliverable is over-triggering (re-ask rate > 60% across 20 runs), raise the threshold for that deliverable. If a specific deliverable never triggers (< 5%), lower it. Don't A/B test.

## The anchored re-ask prompt (canonical template)

Paste this prefix into the re-ask call. The bracketed sections are interpolated at call time.

```
=== REINFORCEMENT INFERENCE RE-ASK ===

You previously produced a response to the task that follows. After reviewing it,
the following signals suggest uncertainty in your first attempt:

[BULLETED UNCERTAINTY SIGNALS — one bullet per fired signal, e.g.:
 - You verbalized "low" overall confidence on this response
 - You named 2 claims as least defensible: [Claim X, Claim Y]
 - 3 sections have no citation backing
 - Validation flagged 2 issues: [issue 1, issue 2]]

Your prior response is included below in full. Do not summarize it — read it as
written, then reconsider with the signals above in mind.

PRIOR RESPONSE:
"""
{prior_response_serialized_verbatim}
"""

ORIGINAL TASK:
"""
{original_task_prompt}
"""

You may now:
  (a) KEEP claims you remain genuinely confident about — do not revise just to
      revise. The paper this technique is based on shows that aimless revision
      regresses to the baseline.
  (b) REVISE specific claims where a signal flagged a weakness. Be specific
      about what changed and why.
  (c) REPLACE claims where the original was guessing or relied on weak evidence
      not present in the corpus.

Emit the same schema as the original response. Do not add a preamble explaining
what you changed — the schema speaks for itself.

You are an aligned LLM and your default behavior is to either capitulate to the
signals (over-revise) or defend the original response (under-revise). Honor the
specific signals. Revise where flagged, hold where not.
```

The three properties this enforces:

- **Anchored** — prior response verbatim, not summarized. This is the load-bearing requirement.
- **Targeted** — the model sees exactly which signals fired, so it knows what to look at.
- **Conservative** — explicit permission to keep claims it stands behind, which mitigates the paper's noted anchoring effect (revising-for-revising-sake).

## The three operational modes

| Mode | Recipe | When to use |
|---|---|---|
| **RI-Replace** | Single re-ask. The returned response replaces the original. | Default. Cheapest. Use everywhere except the highest-stakes deliverables. |
| **RI-Merge** | Re-ask. Then a third call that takes (original, re-ask) and synthesizes a final response keeping the strongest claims from each. | Use for high-stakes deliverables only (strategy report, executive recommendations). 3 model calls instead of 2. |
| **RI-Silent** | Background re-ask that surfaces only if the new response is materially different. The user never sees the re-ask happened. | Use for chat where re-ask latency would hurt conversational flow. |

## Composition with Verbalized Sampling

VS and RI form one mechanism. VS makes uncertainty legible by asking the model to emit candidates with probabilities and per-claim confidence. RI reads that legibility and acts when threshold is crossed.

**Composition recipe**:

1. **In the system prompt**: load VS directive with `window: moderate-tail` (or your chosen window) AND the Verbalized Confidence extension — model emits payload + `selfAssessment` envelope.
2. **After the response returns**: compute the composite uncertainty signal using `verbalizedConfidence` from the envelope plus the five corroborator counts.
3. **If triggered**: build the RI anchored re-ask prompt using the verbatim prior payload + the named uncertainty signals.
4. **Send re-ask**: same model, same parameters. Receive new payload.
5. **Log**: append a ledger entry whether triggered or not (`wiki/synthesis/uncertainty-ledger.md`).

**Why this is the right pairing**: VS without RI surfaces uncertainty but does not act on it — you see "this claim has probability 0.07" and shrug. RI without VS has to invent its own uncertainty signal from scratch — and the deterministic rule-matchers alone are noisy. The pairing is the loop.

## Where in HiC to invoke this

| Touchpoint | File | Trigger threshold | Mode |
|---|---|---|---|
| Themes (Pass 1 BREADTH) | `services/geminiService.ts` → `generateThemes()` | 1.2 | RI-Replace |
| Persona Phase B enrichment | `services/geminiService.ts` → `generatePersonas()` Phase B | 1.2 | RI-Replace |
| Recommendations | `services/geminiService.ts` → `generateRecommendations()` line ~1931 | 1.2 | RI-Replace |
| Journey Map | `services/geminiService.ts` → `generateJourneyMap()` line ~2205 | 1.4 | RI-Replace |
| PRD | `services/geminiService.ts` → `generatePRD()` line ~2460 | 1.0 | RI-Replace |
| Roadmap | `services/geminiService.ts` → `generateRoadmap()` line ~2560 | 1.2 | RI-Replace |
| Gap Analysis | `services/geminiService.ts` → `generateGapAnalysis()` line ~3433 | 1.0 | RI-Replace |
| Prototype Stage 1 brief | `services/prototypeBuilder.ts` Stage 1 | 1.2 | RI-Replace |
| Chat answers | `services/corpusChatService.ts` → `sendChatMessage()` | 1.5 (higher — chat latency matters) | RI-Silent |
| Strategic Report (whitepaper) | `services/geminiService.ts` → `generateStrategicReport()` | 1.0 | RI-Merge |

The lower the threshold, the more often the model re-asks. Evidence-heavy deliverables (PRD, gap analysis, strategic report) get lower thresholds because the cost of shipping a bad claim is higher. Chat gets a higher threshold because re-ask latency hurts the conversational surface.

## When NOT to invoke RI

- **Confidently-wrong inputs**. The paper's named limitation: RI is invisible to overconfident mistakes. If the model is calibrated badly, RI will not catch it. Mitigation: don't rely on RI as your only quality gate — keep the post-processor, validation, and human checkpoints.
- **Single-shot factual lookups**. If the task is "list the API endpoints in this file," there's no creative latitude for the second pass to exploit. RI just adds latency.
- **Generative-only domains without validation surface**. Image generation, video generation, HTML-artifact rendering — these lack the per-claim structure RI's corroborator signals need. The paper carves this out as future work. Don't extend RI to them in v1.
- **When the user is iterating with explicit feedback**. If `feedback != null` (user has just given a correction), the user's signal is more authoritative than the model's self-doubt. Skip RI and route through the existing user-feedback path.
- **When the first pass is empty or schema-broken**. The retry should be schema-repair (existing pattern in `tryRepairJson`), not RI. RI assumes a well-formed first pass to anchor on.

## Verbalized Confidence — the extension required to make RI work

RI's trigger needs an uncertainty signal. The deterministic corroborators (validation failures, slop hits, evidence gaps, dimension scores) are necessary but noisy on their own. The signal that lights up the trigger correctly is **verbalized confidence** — the model telling you which of its own claims it would expect a senior reviewer to push back on.

Every deliverable schema that produces atomic claims gains two optional fields:

```typescript
type Claim<T> = T & {
    confidence?: 'high' | 'medium' | 'low';
    confidenceRationale?: string;          // 12-word "why this score"
};

type DeliverableEnvelope<T> = {
    payload: T;
    selfAssessment?: {
        leastDefensibleClaims: string[];   // 1-3 claim IDs or short descriptors
        rationale: string;                  // 1-2 sentences on what's shaky
        overallConfidence: 'high' | 'medium' | 'low';
    };
};
```

**The prompt extension** (paste into any deliverable system prompt that you want RI-enabled):

```
=== VERBALIZED CONFIDENCE DIRECTIVE ===

After producing the payload, append a "selfAssessment" object with:

- "overallConfidence": one of "high" | "medium" | "low". "high" means you would
  defend every claim against a skeptical senior partner. "low" means at least
  one claim is reaching beyond the evidence.

- "leastDefensibleClaims": an array of 1-3 short descriptors (or claim IDs)
  naming the specific claims that would not survive senior pushback. If
  overallConfidence is "high" you may emit an empty array, but only if you
  genuinely cannot identify a single weakest link.

- "rationale": one or two sentences naming the SPECIFIC weakness — evidence
  thin, segment overgeneralized, citation indirect, claim extrapolated. Do not
  use generic phrases ("limited data", "more research needed"). Do not write
  "evidence gap" or any QA-annotation string.

Calibration discipline: across 5 deliverables, your "overallConfidence"
distribution should not collapse to "high" for every output. If every claim
across every deliverable looks "high" to you, you are not calibrated — most
real-world outputs have weak spots. Honest "medium" and "low" assessments are
how this signal earns its keep.
```

## Worked example — RI on themes

**First pass output** (truncated):
```json
{
  "payload": {
    "themes": [
      { "id": "t1", "title": "Application Volume Stress", "confidence": "high", ... },
      { "id": "t2", "title": "Brand-Name Fixation Trap", "confidence": "medium", ... },
      { "id": "t3", "title": "Counselor Overload", "confidence": "low",
        "confidenceRationale": "Inferred from 2 Reddit threads; counselor side not directly evidenced", ... }
    ]
  },
  "selfAssessment": {
    "overallConfidence": "medium",
    "leastDefensibleClaims": ["t3"],
    "rationale": "Counselor Overload extends an inference from student-side posts; no counselor-side primary source."
  }
}
```

**Composite signal**:
- `verbalizedConfidence`: 0.5 (medium overall) × 2.0 = 1.0
- `leastDefensibleCount`: 1 × 0.5 = 0.5
- `validationFailures`: 0 × 0.6 = 0
- `slopViolations`: 0 × 0.2 = 0
- `evidenceDensityGap`: 1 (t3 has no counselor-side source) × 0.4 = 0.4
- `failingDimensions`: 0 × 0.5 = 0

**Score**: 1.9. Threshold 1.2. **Trigger fires.**

**Re-ask prompt body** (the wrapping template + the signals + the prior response). The re-ask returns:

```json
{
  "payload": {
    "themes": [
      { "id": "t1", "title": "Application Volume Stress", "confidence": "high", ... },
      { "id": "t2", "title": "Brand-Name Fixation Trap", "confidence": "medium", ... },
      { "id": "t3-revised", "title": "Application Coaching Asymmetry",
        "confidence": "medium",
        "confidenceRationale": "Reframed from counselor-side claim to documented asymmetry between coached and uncoached applicants — 4 OpenAlex sources cited.",
        ... }
    ]
  },
  "selfAssessment": {
    "overallConfidence": "high",
    "leastDefensibleClaims": [],
    "rationale": "Reframing t3 as application-coaching asymmetry grounds the theme in 4 external sources rather than inferred counselor-side evidence."
  }
}
```

What changed: t1 and t2 held (model retained genuine confidence). t3 was reframed to a defensible adjacent claim. Overall confidence raised because the weakest link was addressed, not papered over.

## Logging contract — every invocation writes to the ledger

Every `reinforceIfUncertain` call (triggered OR not) appends an entry to `wiki/synthesis/uncertainty-ledger.md` via `POST /api/wiki/uncertainty-ledger/append`. The ledger is a per-engagement, append-only timeline that the wiki summarizer aggregates weekly.

**Entry schema**:
```yaml
- timestamp: 2026-05-12T14:32:00Z
  deliverable: recommendations
  engagement: northeastern-advancement-strategy
  triggered: true
  trigger_score: 1.85
  threshold: 1.2
  signals_fired:
    - verbalizedConfidence: low
    - leastDefensibleCount: 2
    - evidenceDensityGap: 3
  outcome: 7/10 kept, 3 revised
  reask_latency_sec: 18.4
```

The weekly aggregator surfaces patterns like "recommendations consistently uncertain on evidence density — 14/22 invocations over 30 days." Those patterns become structural prompt-engineering signals — fix the prompt, not the run.

## Composition contracts (who else this skill plays with)

- **verbalized-sampling**: VS surfaces uncertainty via candidate probabilities and per-claim confidence; RI acts on it. Both should be loaded into the same generation. No conflict — VS shapes the first pass, RI shapes the second.
- **recommendation-architect**: emits the deliverable envelope with self-assessment. RI reads that envelope. Compose freely.
- **theme-analyst, persona-architect, deck-narrative-composer, strategy-author, service-blueprint-mapper, competitive-analyst, prd-compiler, roadmap-builder, gap-analysis-evaluator**: all output-shaping skills should adopt the Verbalized Confidence directive in their prompts. Each can then be wrapped by RI at the orchestrator.
- **qa-gate, self-review**: RI does not replace these. QA-gate enforces hard schema rules. Self-review checks for scope creep. RI is a separate layer that catches *uncertainty*, not violations. All three should run in sequence.
- **failure-log, diagnose-prompt**: when the ledger surfaces a recurring uncertainty pattern, route it to failure-log + diagnose-prompt to produce a structural prompt fix. RI is the diagnostic; failure-log is the remediation.

## What success looks like when this skill is applied

A deliverable that previously shipped a weak claim because the model couldn't decide between two framings will now either (a) commit to the strongest framing on the second pass, or (b) reframe the weak claim to a defensible adjacent one, or (c) hold the original if the corroborator signals were noise. The user sees the better output. The ledger shows whether RI fired, what fired it, and what changed.

Across 100 deliverable generations, the expected pattern: RI fires on ~30-50% of invocations (varies by deliverable type); of those, the second pass materially changes the output ~60-80% of the time (the other 20-40% the model holds because it was right the first time). The ledger surface shows which deliverables and which signal patterns recur — those are the structural prompt-engineering targets for the next round.

## The four empirical gates before broad rollout

1. **Calibration sanity**: when Gemini 3.1 Pro is asked to verbalize confidence on real HiC outputs, does the distribution span low/medium/high or collapse to "high" for everything? If it collapses, the Verbalized Confidence directive needs hardening (force "no more than 60% of outputs may be high").

2. **Cost ceiling**: at threshold 1.2 across 20 production runs, what's the empirical re-ask rate? If > 60%, raise thresholds. If < 5%, lower them.

3. **User trust on chat**: does the AI Analyst's RI-Silent re-ask add perceived latency? If so, restrict chat RI to explicit "I'm not sure" moments only.

4. **Ledger feedback quality**: after 100+ entries, are the auto-detected recurring patterns structurally actionable or restating the obvious? If the latter, the aggregator prompt needs work, not more data.

These are the gates between v1 (the technique works in our codebase) and v2 (the technique is producing diagnostic value for the prompt-engineering process itself).
