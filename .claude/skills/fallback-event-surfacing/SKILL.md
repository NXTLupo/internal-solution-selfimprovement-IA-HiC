---
name: fallback-event-surfacing
version: 1.0
description: Replaces the 34 silent fallback sites across HiC's service layer with structured GenerationReceipt.degradation_events that the user actually sees. Pass 1 Pro → Flash → GPT chain, embedding-alignment fallback, theme angle fallback, depth enrichment timeout — all currently invisible. This skill defines the event taxonomy and the wrapper pattern; the runtime side wires those events into a "Brain status" inline notice in the chat so the user knows "GPT-5.5 substituted for Gemini Pro at theme depth — quality may differ." Pairs with validate_no_silent_fallback.py hook (Stop) that catches deliverables whose telltales suggest a degraded path was taken without a matching event.
thinking: high
category: observability
triggers:
  - silent fallback
  - degradation event
  - brain status
  - "#fallback"
  - "#brain-status"
  - model fallback
  - why did it switch models
---

# Fallback Event Surfacing

## You Are

The discipline that closes the gap the 2026-05-23 honest-audit flagged as the most embarrassing: 34 silent fallbacks where the pipeline degrades and the user gets no signal. The model chain is Pro → Flash → GPT-5.5. The first fails. The third succeeds. The deliverable ships. The user sees the result and assumes Pro generated it. They're wrong — and they have no way to know.

You are not the wrapper code. You are the contract for what a degradation event LOOKS like, where it gets ATTACHED, and how the user SEES it. The wrapper code is a 30-line TypeScript file; the discipline is everything else.

## When to activate

- Whenever a generator wraps a model call in try/catch with a fallback model
- Whenever a generator returns a partial result (e.g., themes without depth)
- Whenever an API call hits 429/timeout/contentFilter and the pipeline routes around it
- Whenever a chunked generator falls back to single-shot
- When the user types `#fallback` or `#brain-status` in the analyst chat to ask "why did it switch models?"

Do NOT activate when:
- The fallback is to a user-equivalent path (e.g., one provider failed, the user-selected provider succeeded — that's not a degradation)
- The fallback is recovery from a transient retry that ultimately produced the originally-requested model's output (transient retries don't degrade output)

## The degradation event taxonomy

Every degradation falls into exactly one of these named kinds. Do not invent new kinds — adding to this list is a deliberate change with a corresponding UI change.

| Kind | Trigger | User-visible message template |
|---|---|---|
| `model_substitution` | A different model than the one requested produced the output | "Substituted <actual> for <requested> at <stage>. Quality may differ." |
| `feature_omission` | A feature was requested but produced nothing usable | "<feature> generation failed at <stage>; output ships without it. Re-run to retry." |
| `truncation_close` | AI output was truncated and auto-closed | "Output was truncated at <stage>; last <item> may be incomplete." |
| `chunked_to_single_shot` | A chunked generator fell back to single-shot (known truncation risk) | "Chunked generation failed at <stage>; fell back to single-shot. Output may be thin." |
| `rate_limited_retry` | The pipeline hit a 429 and retried with backoff | "Rate limit at <provider> caused a <N>s delay at <stage>." |
| `content_filter_fallback` | A provider's content filter blocked output and routed to a different provider | "Provider <X> content-filtered output at <stage>; rerouted to <Y>." |
| `cache_used_instead_of_fresh` | A cached result was used instead of regenerating | "Used cached <stage> result from <date>; not regenerated this session." |
| `evidence_thin` | A generator ran but produced output without the expected evidence density | "<stage> produced output but with <N> citations (expected >=<M>)." |
| `partial_chunk_failure` | One chunk failed in a multi-chunk run; others succeeded | "Chunk <X> failed at <stage>; <N>/<M> chunks completed." |
| `paint_sync_degraded` | export-paint-sync timed out on a font/image/layout | "Export render at <stage> proceeded with <degradation>; verify exported file." |

## The event payload schema

```yaml
kind: <one of the 10 named kinds above>
stage: <named generation stage: "theme depth" | "gap technology chunk" | "prototype Stage 4" | etc.>
requested: <what was originally requested — model name / chunk count / feature>
actual: <what actually happened>
detail: <one-sentence specific cause: error message, status code, etc.>
timestamp: <ISO 8601>
recoverable: <true|false>  # can the user trigger a retry of just this piece?
user_action: <one of: "retry_now" | "investigate" | "accept_and_continue" | "no_action_needed">
```

Every event also gets a stable `event_id` (UUID) so the UI can dedupe events across redraws and link to chat replies that explain them.

## Attachment surface — the GenerationReceipt

Every generation that completes (success OR partial) emits a `GenerationReceipt`. This already exists in HiC concept; this skill formalizes its `degradation_events[]` field:

```typescript
type GenerationReceipt = {
  deliverable_id: string;
  generated_at: string;
  primary_model: string;
  total_duration_ms: number;
  degradation_events: DegradationEvent[];
  // ... other fields
};
```

If `degradation_events.length > 0`, the chat UI renders an inline "Brain status" notice immediately under the deliverable, summarizing the events with a "Why?" disclosure that shows the full payload.

## The wrapper pattern (TypeScript)

This is the implementation contract for every silent-fallback site. The wrapper goes around the existing try/catch — it does NOT replace the fallback logic, only makes it visible.

```typescript
import { recordDegradation } from './degradationLedger';

async function generateWithSurfacedFallback<T>(opts: {
  stage: string;
  primary: () => Promise<T>;
  fallback: () => Promise<T>;
  classify: (err: unknown) => Partial<DegradationEvent>;  // turns the error into a typed event
}): Promise<{ result: T; degraded: boolean }> {
  try {
    const result = await opts.primary();
    return { result, degraded: false };
  } catch (err) {
    const event = recordDegradation({
      kind: 'model_substitution',  // overridden by classify()
      stage: opts.stage,
      timestamp: new Date().toISOString(),
      recoverable: true,
      user_action: 'investigate',
      ...opts.classify(err),
    });
    const result = await opts.fallback();
    return { result, degraded: true };
  }
}
```

Every existing silent-fallback site in `services/geminiService.ts`, `services/openaiService.ts`, and `services/aiRouter.ts` gets wrapped with this. The behavior is identical except an event is now appended to the receipt.

## The 34 sites to wrap

From the 2026-05-23 audit doc:

1. `geminiService.ts ~1500`: theme angle fallback → `kind: feature_omission`
2. `geminiService.ts ~1467`: embedding-alignment fallback → `kind: model_substitution`
3. `geminiService.ts ~1569`: Pass 1 Pro failed → `kind: model_substitution`
4. `geminiService.ts ~1447`: depth enrichment failed → `kind: feature_omission`
5. `geminiService.ts ~1749`: Gemini Pro depth call failed → `kind: model_substitution`
6. `geminiService.ts ~1876`: wiki POST failed → `kind: cache_used_instead_of_fresh` (if cached fallback used)
7. `geminiService.ts ~2839`: PRD chunked → single-shot → `kind: chunked_to_single_shot`
8-34. Remaining instances of "fallback / falling back / non-blocking / silent" per the audit's 34 occurrences.

The skill specifies WHAT each kind looks like; the file-by-file wrapping is engineering work that happens once the contract is locked.

## Hard rules

1. **Every fallback emits an event.** Silent fallback is the failure mode; the event is the fix. No exceptions, even for "obviously fine" fallbacks — that judgment belongs to the user, not the code.
2. **Events never replace prose.** A degradation event is structured metadata; the deliverable's prose remains whatever the model produced. The event tells the user the prose may be degraded; it doesn't rewrite the prose.
3. **No invented detail.** The `detail:` field is the actual error message (or its first 200 chars), not a humanized rewrite. The user can read the raw cause.
4. **No emoji.** Repo-wide rule.
5. **Privacy.** Event payloads may include API endpoint URLs and status codes; they MUST NOT include API keys, full user uploads, or internal IDs that would leak across engagements.
6. **The user_action field is binding.** If `user_action: "retry_now"` is set, the UI must surface a one-click retry. If `accept_and_continue`, no retry button — passive notice only.

## Composition

- **Validator**: `validate_no_silent_fallback.py` (Stop hook) — scans deliverables for telltales of a degraded path (themes without depth field, citations from an unexpected model, paint-sync timeouts in export receipts) and fails if there's no matching `degradation_events[]` entry. The hook is the "what you didn't surface" sentinel.
- **Consumed by**: the chat UI's Brain Status inline notice (already partly built in CorpusChatPanel — needs degradation_events[] wiring per the audit doc).
- **Calibrated by**: `cross-engagement-pattern-miner` Pattern 1/4 — recurring degradation patterns across engagements signal systemic issues (e.g., Gemini Pro consistently timing out at theme depth → escalate to provider routing change, not just keep falling back silently).
- **Pairs with**: `ai-output-syntax-repair` (its RepairReport.degradation=true becomes an event of `kind: truncation_close`) and `export-paint-sync` (its PaintSyncError becomes `kind: paint_sync_degraded`).
