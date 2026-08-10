# GPT-5.6 Prompt-Cache Controls: Adoption Decision (2026-07-13)

Unified Vision phase advanced: (6) routing authority cost discipline. Method: verbalized
sampling over candidate designs + reinforcement-inference re-ask on the uncertain claims.
Sources: OpenAI prompt-caching guide (developers.openai.com/api/docs/guides/prompt-caching),
MS Learn Q&A 5942997 (Azure GPT-5.6 caching state), Prompt Caching 201 cookbook.

## The GPT-5.6 contract (what changed vs gpt-5.5)

- `prompt_cache_key` (request-level): now the RECOMMENDED matching mechanism; shard guidance
  ~15 requests/min per key, partition higher volume across stable keys.
- `prompt_cache_options`: `{ mode: "implicit" | "explicit", ttl: "30m" }`. Implicit (default)
  auto-places a breakpoint on the LATEST message and also honors explicit ones; explicit mode
  caches ONLY marked prefixes (no marks = no caching). ttl "30m" is the only value and the
  default (minimum lifetime; may persist longer).
- `prompt_cache_breakpoint: { mode: "explicit" }` on individual CONTENT BLOCKS marks the end
  of a reusable prefix (both Chat Completions and Responses API; text/image/file/audio blocks).
- BILLING CHANGE: cache WRITES now cost 1.25x the uncached input rate (gpt-5.5 and earlier had
  no write fee). Reads stay discounted. Usage reports `cached_tokens` + `cache_write_tokens`.
- Minimum cacheable prefix 1024 tokens; hits extend in 128-token increments.
- Azure caveat (MS Learn): on Azure OpenAI, GPT-5.6 implicit caching currently works on Chat
  Completions but NOT the Responses API, and the explicit params validate without functioning.
  HiC talks to api.openai.com directly, so this does not bite today; it forbids moving the
  OpenAI path to Azure Foundry until Microsoft fixes it.

## What HiC already has (verified in code)

`/api/ai/openai` (proxy/app.py ~10548): Responses API by default, `prompt_cache_key =
hic:<x-hic-session>` already injected (2026-06-22), exact-match L1 cache in front, HIC_CACHE_BREAK
markers STRIPPED (Anthropic-only today). GPT traffic = resilience fallback (gpt-5.5) + the
heuristic tri-model critique lane; gpt-5.6 is not yet in the aiRouter registry.

## VS candidates (k=5, probabilities against the plausible-design distribution)

1. p~0.40 MODAL: keep implicit mode, add ttl, convert markers to breakpoints. Rejected as-is:
   implicit mode's auto-breakpoint on the latest message pays the NEW 1.25x write fee on
   HiC's never-recurring dynamic tails every call.
2. p~0.15 EXPLICIT MODE: `mode: "explicit"` + breakpoints ONLY at the HIC_CACHE_BREAK
   boundaries ([stable core][semi-stable engagement]); the dynamic tail is never written.
   Cost-correct under the new write fee; exactly mirrors the Anthropic chokepoint discipline.
3. p~0.12 KEY REDESIGN: prompt_cache_key on stable-core-version hash for cross-engagement core
   reuse. Rejected: the 30m TTL makes cross-engagement reuse mostly moot at HiC's OpenAI-path
   volume, and one global key risks the 15 rpm shard guidance. Engagement key stays.
4. p~0.10 TELEMETRY FIRST: wire cached_tokens/cache_write_tokens into costMeter and gate the
   rollout on measured hit rate (platform doctrine: measure, gate). Adopted as a component.
5. p~0.08 TAIL / DO NOTHING: OpenAI is fallback-only; skip. Rejected because the heuristic
   tri-model lane sends real repeated-prefix GPT traffic (rubric prefix recurs across critic
   passes within one audit, comfortably inside 30m), and gpt-5.6 adoption is a when-not-if.

## RI pass (uncertainty acknowledged and resolved)

- Uncertain claim: "implicit mode bills 1.25x writes on unreusable tails." Docs state writes
  bill at 1.25x and implicit marks the latest message; the 1024-token floor partially blunts
  it for short tails. RESOLUTION: explicit mode is strictly-not-worse for HiC's shapes and
  removes the uncertainty; adopt candidate 2 regardless.
- Uncertain claim: enough OpenAI-path traffic to matter. RESOLUTION: telemetry component
  (candidate 4) makes the payoff measurable in-path instead of assumed.

## DECISION (composite: 2 + 4, engagement key kept, model-gated)

At the ONE `/api/ai/openai` chokepoint, when `model` starts with `gpt-5.6`:
1. Convert HIC_CACHE_BREAK markers into `prompt_cache_breakpoint: {mode:"explicit"}` content
   blocks (same splitter discipline as `_inject_anthropic_cache_control`; markers consumed,
   never reach the model) instead of stripping them.
2. Set `prompt_cache_options: { mode: "explicit", ttl: "30m" }` ONLY when at least one
   breakpoint was placed and the prefix clears ANTHROPIC_CACHE_MIN_CHARS (reuse the same
   1024-token/4000-char floor so the write premium is only paid on prefixes that plausibly
   recur). No breakpoints -> omit the options entirely (implicit default, zero regression).
3. Keep `prompt_cache_key = hic:<session>` (engagement-scoped; within shard guidance).
4. Telemetry: log + book `cached_tokens` (discounted) and `cache_write_tokens` (1.25x) in
   costMeter; surface hit-rate in the cost telemetry wiki page. Rollout gate: if 30-day
   hit-rate on the OpenAI path stays under ~10%, flip PROMPT_CACHE_OPENAI_EXPLICIT off (env
   flag) - the write premium must earn its keep.
5. Older gpt-5.5/5.4 requests: unchanged (markers stripped, key kept, no options field -
   they reject unknown caching params; model-prefix gate prevents 400s).
6. Guardrail: never route GPT-5.6 through Azure Foundry until the Responses-API caching bug
   is fixed upstream.

Scope when implemented: proxy/app.py only (one chokepoint), ~60 lines + tests; no client
changes (clients already emit markers for Anthropic; the OpenAI path starts consuming them).
NOT implemented in this change - this file is the reviewed decision awaiting the owner's go.

---

# AUGMENTATION: Speculative Decoding (2026-07-13, arXiv 2607.05147 "DSpark")

## What the paper establishes (expertise summary)

DSpark = confidence-scheduled speculative decoding with semi-autoregressive SELF-drafting: the
model drafts multiple tokens per step (draft count scheduled by calibrated confidence), the
target model verifies against its own distribution, rejected tokens resample. Outputs are
DISTRIBUTION-IDENTICAL to plain decoding; speedups shown on GSM8K/AIME/code with DeepSeek
models; strongest on repetitive and STRUCTURED output (JSON-like), which is exactly HiC's
fence-emitting workload shape. HARD CONSTRAINT (the paper's own limitation section): requires
server-side LOGITS access at verification time - it cannot be deployed against black-box API
endpoints.

## Applicability verdict for HiC (the gating fact)

HiC generates exclusively through hosted APIs (Anthropic, Gemini, OpenAI). DSpark-class
token-level speculative decoding is therefore NOT implementable by HiC at any layer we own;
it is the providers' serving-stack optimization and the majors already run variants of it
server-side (HiC benefits passively in their token throughput). The actionable question is
which API-LEVEL ANALOGS of speculate-then-verify pay off in HiC's pipeline.

## VS candidates (k=5)

1. p~0.35 MODAL "adopt provider speculative features": OpenAI Predicted Outputs
   (`prediction: {type:"content", content:<draft>}`) - the API-level cousin: the CALLER
   supplies the draft, the server verifies it token-by-token like speculative decoding.
   Real but thin today: HiC's GPT lane is fallback + heuristic tri-model only.
2. p~0.15 REPAIR-LOOP PREDICTION: HiC's highest-overlap surfaces are exactly speculation-
   shaped - deckPlanGate repair re-asks, criticReviseLoop, heuristic "improve this": each
   regenerates an artifact that is ~80-95% identical to the prior output. Send the PRIOR
   ARTIFACT as the prediction on predicted-outputs-capable models. CONFLICT flagged: these
   loops run on Opus/Gemini per the canonical routing rule, and neither Anthropic nor Gemini
   exposes a prediction parameter; adopting this on-canon would mean routing deviation.
3. p~0.12 ARTIFACT-LEVEL SPECULATION (provider-agnostic): render pass-1 fences optimistically
   while the deterministic gate evaluates; swap on repair. Examined and mostly REJECTED: the
   gate verdict is deterministic code (~0 latency on pass), so speculation only shows a deck
   that is about to be replaced - confusing, low value.
4. p~0.10 SELF-HOSTED DRAFT SERVING for a local small model: rejected outright - HiC has no
   GPU serving footprint, and adding one to chase decoding latency inverts the platform's
   converge/delete doctrine.
5. p~0.08 TAIL "do nothing at token level, document why": partially adopted - the
   non-applicability record IS the durable knowledge here.

## RI pass

- Uncertain: do Anthropic or Gemini expose any prediction/draft parameter? Checked current
  API surfaces: no (Anthropic prefill constrains the START of output, which is not
  verification-speculation; Gemini has no equivalent). Resolution: candidate 2 is
  OpenAI-conditional, full stop.
- Uncertain: Predicted Outputs cost behavior. OpenAI bills REJECTED prediction tokens at
  completion rate - a diverging draft can cost MORE than plain generation. Resolution: gate
  prediction on measured expected overlap (only repair/revise calls that resend the prior
  artifact verbatim-plus-instructions), and telemetry the acceptance ratio next to the
  cache hit-rate from the caching plan above.

## DECISION (conditional augmentation - meaningful gains are NARROW today)

Speculative decoding earns a CONDITIONAL, OpenAI-lane-only augmentation of the caching plan,
not a workstream of its own:

7. When the `/api/ai/openai` chokepoint (same one as items 1-5 above) receives a call flagged
   as a REPAIR/REVISE turn (client sends `x-hic-prior-artifact` or the body carries a
   `_hic_prediction` field with the prior output), forward it as
   `prediction: {type:"content", content: <prior>}` on gpt-4o+/gpt-5.x chat-completions
   calls. Strip the field on all other providers. ~25 lines at the same chokepoint.
8. Telemetry: log accepted vs rejected prediction tokens beside cached_tokens; kill via the
   same env-flag family if rejected-token overspend exceeds the latency win (rejected tokens
   bill at completion rate - the cost inversion is real).
9. RECORDED NON-DECISION: token-level SD (DSpark-class) stays out of scope while HiC is
   API-only. Revisit ONLY if HiC ever self-hosts an open-weights model (e.g. a private
   DeepSeek deployment for the fallback lane) - then DSpark-style semi-autoregressive
   drafting is the first candidate because HiC's fence/JSON output shape is the paper's
   best case.

Net expectation, stated honestly: with today's routing (Opus primary, Gemini secondary, GPT
fallback + heuristic lane), items 7-8 accelerate only the GPT slice of repair/revise traffic.
The caching plan (items 1-6) remains the dominant cost/latency lever; speculation becomes
material only if routing ever shifts artifact repair onto OpenAI models.
