---
name: long-running-service-call
invocation: model
description: Standard wrapper pattern for any HiC browser-to-backend service call that may take longer than ~10 seconds. Codifies the three things that must be true every time: (1) an immediate in-flight chat message so the user knows the call started, (2) an explicit AbortSignal with a bounded timeout (so a wedged service can't tie up the browser indefinitely), (3) a fast-model default (Gemini Flash, Codex Haiku) rather than the service's quality-default model. Use this whenever wiring a new HiC chat directive that posts to /api/journey-map, /api/artifact/generate, /api/bertopic, /api/transcribe-youtube, or any future endpoint that fans out to an LLM provider or a multi-pass pipeline. Closes the "Failed to fetch" UX trap where Chrome closes the connection at ~30s while the backend keeps working invisibly. Composes with the existing fallback-event-surfacing skill and the post_hic_rebuild_reminder hook.
---

# Long-Running Service Call Wrapper Pattern

A HiC service call can fail in three ways the user experiences as identical:

1. The service actually broke.
2. The service is slow and Chrome closed the fetch before the response.
3. The service is alive but its NLP/extraction returned zero structured
   results (so the response is a 200 with empty body).

This skill is the contract for wiring up any backend call that may take
longer than ~10 seconds, so the user always knows which of the three
they're looking at.

## When to invoke

Trigger this skill when:

- Adding a new hashtag directive that posts to a multi-pass backend pipeline.
- Wiring up a new service in `proxy/app.py` that fans out to an LLM provider
  with high latency (Codex Sonnet two-pass, BERTopic, video transcription).
- Refactoring an existing `fetch()` call site that currently has no progress
  feedback or no AbortSignal.
- A user reports "the chat said it failed but it actually generated something."

## The three required moves

### 1. Immediate in-flight chat message

Push an `assistant` chat message BEFORE the `fetch()` call, with a specific
latency window so the user knows what to expect:

```ts
deliveryMessages.push({
    id: `msg_${Date.now()}_${tag}_inflight`,
    role: 'assistant',
    content: `Generating #${tag} via ${serviceName} (${modelName}, two-pass)... ` +
             `typically ${minSec}-${maxSec}s. The artifact lands in the Design Desk ` +
             `when ready.`,
    timestamp: Date.now(),
});
```

The min-max window MUST reflect actual latency observed in this codebase, not
the service vendor's claim. For journey-mapper on Gemini Flash: 30-90s. For
the artifact-engine on Gemini Pro: 60-180s. For BERTopic clustering on 200+
articles: 60-300s.

### 2. AbortSignal with bounded timeout

```ts
const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ceilingMs),  // REQUIRED
});
```

`ceilingMs` should be the 95th-percentile observed latency × 2, capped at
8 minutes (480000ms). Without this, Chrome's default keep-alive close can
fire at unpredictable times (network drops, sleep/wake, proxy timeouts),
leaving the user unable to ever discover that the service finished. With
this, a wedged service produces a clean AbortError after a known interval
that the catch block can handle.

### 3. Fast-model default

The service's vendor-default is rarely right for chat-driven UX. If the
service supports model override (most HiC services accept `llm_model` in
the body), force the speed tier:

| Service tier | Default vendor model | Force for chat UX |
|---|---|---|
| Journey Mapper IA | Codex-sonnet-4-6 (10+ min two-pass) | gemini-3.5-flash (30-90s) |
| Artifact engine | gemini-3.1-pro-preview (60-180s) | gemini-2.5-flash (15-45s) for chat |
| BERTopic clustering | (no LLM in the loop) | n/a |
| Brief-dialog | Codex-sonnet-4-6 (varies) | Codex-haiku-4-5-20251001 |

The user can ALWAYS override with `#model=...` for quality work. The chat
default should be the speed tier.

## Reference implementation

The 2026-05-26 `#journey` route in
`humans-in-control-research/components/CorpusChatPanel.tsx` is the
canonical example. It applies all three moves:

1. Pushes "Generating #journey via Journey Mapper IA service (Gemini 3.5
   Flash, two-pass)... typically 30-90s" before fetching.
2. `signal: AbortSignal.timeout(240000)` — 4-min ceiling.
3. `llm_model: 'gemini-3.5-flash'` in the body — overrides the service's
   sonnet default.

## Anti-patterns

- **Bare `fetch()` with no signal**: Chrome's default fetch has no client
  timeout. The browser will hold a connection for tens of minutes or longer
  if the OS networking stack lets it. AbortSignal is the only reliable cap.
- **`signal: AbortSignal.timeout(30000)` (30s)** on a journey-mapper call:
  the service will be killed mid-pass-2 every time. Pick a ceiling that
  matches actual service latency, not the vendor SLA.
- **"It works in dev, breaks in prod"**: prod backends are often colder
  (cold-start delays), have more concurrent load, and proxy through more
  hops. Add 2× to your dev-observed latency before setting `ceilingMs`.
- **Forgetting to push the in-flight message**: if the user can't see that
  the call started, they will assume it failed and re-fire, doubling load
  and probably timing both calls out via downstream rate limits.
- **Forcing Sonnet/Opus for chat UX**: the chat is interactive. Quality
  models belong in the deep-work path (uploads UI, batch generation,
  research-planner). The chat default is speed.
- **Catching `AbortError` and re-firing automatically**: that hides the
  problem. Catch it, show the user "Service exceeded ${ceilingMs}ms — likely
  wedged. Check `/service-log-triage journey-mapper`."

## Composes with

- `fallback-event-surfacing` — when the service falls back to a different
  provider mid-call, surface that as a degradation event in the same chat
  reply as the in-flight message.
- `service-log-triage` — when the user reports that the in-flight notice
  never resolved, this is the next skill to invoke.
- `post_hic_rebuild_reminder.py` hook — frontend edits that touch the
  fetch wrapper need a rebuild before they take effect.
