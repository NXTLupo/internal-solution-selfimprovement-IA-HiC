---
name: rate-limit-pacer
invocation: model
version: 1.0
description: Provider-aware adaptive concurrency for HiC's external API calls. Replaces the process-wide semaphore-of-3 pattern in proxy/app.py (which lets a Jina 429 take out all concurrent Gemini calls for 60 seconds) with per-provider token-bucket pacing that throttles only the provider being rate-limited. Defends against the OpenAI 429 storm class of failures (commit 43710b5) and the Jina cascade (line 1991: "backing off Jina Reader for 60s per-process"). Includes the deterministic policy for how concurrency drops on 429, how long to back off, and when to ease back up. Pairs with the quota-monitor subagent which observes spend across providers in real time and surfaces "approaching quota" warnings before the 429 fires.
thinking: high
category: defense-against-bursts
triggers:
  - rate limit
  - 429
  - throttle
  - quota
  - "#rate-limit"
  - "#pacer"
  - "backing off"
  - api storm
---

# Rate Limit Pacer

## You Are

The discipline that prevents one provider's overload from taking out the entire HiC pipeline. Currently:

- `proxy/app.py` line 1883 uses semaphore=3 for Jina Reader; when Jina returns 429, the process-wide semaphore disables Jina for 60s, but other providers also slow down because they share the proxy's event loop
- Commit `43710b5` fixes a "OpenAI 429 storm" by routing Stage 2/5 to Gemini-primary — that's a workaround, not a pacing policy
- Commit `f8859b6` adds "retry-with-backoff for all AI endpoint calls" — but the backoff is per-call, not per-provider; a sustained burst still trips repeatedly

You replace this with provider-aware adaptive concurrency: each provider gets its own token bucket. A 429 on Provider A drops A's concurrency by 50%; it does NOT touch Provider B's bucket. After N consecutive successes on A, A's concurrency eases back up.

This is a policy + pattern, not just code. The policy belongs in the skill so when the implementer adds a new provider, they know the bucket parameters; the pattern belongs in code as a single `withRateLimit(provider, fn)` wrapper.

## When to activate

- Every external API call from the HiC proxy or services
- Specifically: Gemini, Claude/Anthropic, OpenAI, DeepSeek, Jina Reader, OpenAlex, Crossref, Semantic Scholar, arXiv, Reddit, YouTube
- When a new provider is added to the codebase (specify its bucket parameters in the registry)

Do NOT activate for:
- Calls to local services on `localhost:` (no quota concept; pacing is overhead)
- Synchronous file I/O (not a provider rate limit problem)
- Calls inside test suites (deterministic execution required; bucket state is non-deterministic)

## The provider bucket registry

Each provider gets a bucket with these parameters. Pick reasonable defaults based on each provider's public rate-limit docs; tune from observed 429 rate.

```yaml
providers:
  gemini:
    initial_concurrency: 8       # max simultaneous in-flight requests
    min_concurrency: 1
    on_429_factor: 0.5           # drop concurrency by 50% on 429
    backoff_ms_initial: 1000     # first retry waits this long
    backoff_ms_max: 60000        # never wait longer than this
    ease_up_after_successes: 20  # 20 clean successes => +1 concurrency
    fairness_window_ms: 30000    # rolling window for success counting
  anthropic:
    initial_concurrency: 4
    min_concurrency: 1
    on_429_factor: 0.5
    backoff_ms_initial: 2000
    backoff_ms_max: 60000
    ease_up_after_successes: 15
    fairness_window_ms: 30000
  openai:
    initial_concurrency: 6
    min_concurrency: 1
    on_429_factor: 0.5
    backoff_ms_initial: 1000
    backoff_ms_max: 60000
    ease_up_after_successes: 20
    fairness_window_ms: 30000
  deepseek:
    initial_concurrency: 5
    min_concurrency: 1
    on_429_factor: 0.5
    backoff_ms_initial: 1000
    backoff_ms_max: 60000
    ease_up_after_successes: 20
    fairness_window_ms: 30000
  jina_reader:
    initial_concurrency: 3       # honoring the empirical 5-10 ceiling from proxy/app.py:1883
    min_concurrency: 1
    on_429_factor: 0.33          # Jina is notoriously sensitive; back off harder
    backoff_ms_initial: 5000
    backoff_ms_max: 120000
    ease_up_after_successes: 30
    fairness_window_ms: 60000
  openalex:
    initial_concurrency: 10
    min_concurrency: 2
    on_429_factor: 0.5
    backoff_ms_initial: 1000
    backoff_ms_max: 30000
    ease_up_after_successes: 50
    fairness_window_ms: 30000
  # ... extend per provider; default to the gemini block for unknown providers
```

## The wrapper contract

Every API call to an external provider goes through:

```typescript
async function withRateLimit<T>(
  provider: ProviderName,
  fn: () => Promise<T>
): Promise<T> {
  await acquireSlot(provider);  // blocks until concurrency available
  const attempt = 0;
  while (true) {
    try {
      const result = await fn();
      recordSuccess(provider);
      releaseSlot(provider);
      return result;
    } catch (err) {
      if (is429(err)) {
        recordRateLimit(provider, err);
        releaseSlot(provider);
        // Drop concurrency, surface the event, backoff
        emitDegradationEvent({
          kind: 'rate_limited_retry',
          stage: provider,
          detail: extract429Detail(err),
        });
        await sleep(computeBackoff(provider, attempt));
        await acquireSlot(provider);
        if (attempt > maxAttempts(provider)) throw err;
        continue;
      }
      releaseSlot(provider);
      throw err;
    }
  }
}
```

The functions `acquireSlot`, `releaseSlot`, `recordSuccess`, `recordRateLimit`, `computeBackoff`, and `emitDegradationEvent` live in a single module (a single new services module; the provider chokepoint itself lives in `proxy/app.py`).

## The ease-up policy (under-described in most rate-limit implementations)

Many implementations only describe HOW to throttle, not how to recover. The pacer should ease up:

- After `ease_up_after_successes` consecutive successes within `fairness_window_ms`, increase concurrency by 1 (up to `initial_concurrency`)
- After `fairness_window_ms * 3` with zero 429s, reset concurrency to `initial_concurrency`
- After a 429, IMMEDIATELY reduce by `on_429_factor`; do NOT wait for the backoff to compute the new concurrency

The ease-up is what distinguishes adaptive pacing from "permanent backoff." Without it, the first 429 of the day cripples the pipeline until restart.

## Integration with degradation events

Every 429 emits a `rate_limited_retry` event via `fallback-event-surfacing` skill's taxonomy. The user sees:

> "Rate limit at OpenAI caused a 3s delay at theme angle generation."

Multiple 429s within a session show as a single aggregated event ("Rate limit at OpenAI caused 7 delays totaling 18s") rather than 7 separate notices.

## Composition with quota-monitor

The `quota-monitor` subagent observes the same provider buckets passively. When a provider's `recent_429_rate` exceeds a threshold (e.g., >5% of calls in the last 5 minutes), quota-monitor surfaces a "<provider> is approaching quota; consider routing <stage> elsewhere" warning to the user BEFORE the 429s become a storm.

quota-monitor is the early-warning surface; rate-limit-pacer is the in-line defense. Together they form proactive + reactive.

## Hard rules

1. **Per-provider isolation.** A 429 on Provider A must NEVER affect concurrency on Provider B. Shared buckets are exactly the cascade this skill exists to prevent.
2. **Never permanently throttle.** The ease-up path must always exist. A provider that's "down" should heal automatically.
3. **Always emit a degradation event on 429.** Silent retries are exactly the failure mode the `fallback-event-surfacing` skill targets.
4. **Cap maximum total wait per call.** Even with backoff, a single call should never wait more than `2 * backoff_ms_max` total. Beyond that, fail fast and let the caller decide retry strategy.
5. **No emoji.** Repo-wide rule.
6. **Token bucket state is in-memory.** Persisting bucket state across process restarts is not worth the complexity for HiC's deployment shape.
7. **Honor Retry-After headers.** If a provider returns 429 with `Retry-After: N`, use N (in seconds) as the backoff instead of the exponential default.

## Composition

- **Wraps**: every external API call in `proxy/app.py` and the service-layer adapters (`claudeAdapter.ts`, `geminiAdapter.ts`, `openaiAdapter.ts`)
- **Emits via**: `fallback-event-surfacing` skill's event taxonomy
- **Observed by**: `quota-monitor` subagent
- **Replaces**: the process-wide semaphore=3 in `proxy/app.py` (line ~1883 for Jina, plus uncoordinated retry-with-backoff at every other call site)
- **Calibrated by**: the next `cross-engagement-pattern-miner` Pattern 1 entry (recurring rate-limit storms across engagements signal that bucket parameters need re-tuning)
