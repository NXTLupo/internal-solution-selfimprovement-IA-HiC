# Prompt Caching Stack — implementation status (2026-06-23)

Implements the layered cache architecture from `deep-research-report.md` against
HiC's multi-LLM proxy (`proxy/app.py`, single chokepoint for all `/api/ai/*`).

## Shipped + active

| Layer | Where | Status |
|---|---|---|
| **Provider-native prefix cache (Anthropic)** | `_inject_anthropic_cache_control` | ✅ live-verified 90% input discount. Now sets TWO breakpoints (tools + system) and uses a configurable TTL. |
| **Anthropic 1h extended TTL** | `ANTHROPIC_CACHE_TTL` (default `1h`) + `anthropic-beta: extended-cache-ttl-2025-04-11` header | ✅ default 1h (fits multi-deliverable sessions); env override to `5m`. |
| **OpenAI `prompt_cache_key`** | `/api/ai/openai` | ✅ keyed on engagement slug. |
| **Gemini implicit caching** | (automatic) | ✅ no code; relies on the stable system prefix. |
| **App-level deterministic exact-match cache** | `_ai_exact_cache_*`, wired into all 3 `/api/ai/*` handlers | ✅ skips the provider call entirely on identical deterministic requests. Provider-aware determinism gate (anthropic: absent/0; openai/gemini: explicit 0). Content-addressed key (corpus/prompt/model drift auto-misses). TTL + size-capped. Cost meter books a hit at $0 via `_hic_exact_cache_hit`. |
| **Tool/stage result cache** | `_tool_cache_*` on `/api/wiki/fetch-articles` | ✅ replays deterministic retrieval; keyed on request + `_corpus_version()` (any wiki write invalidates). |
| **Telemetry** | `GET /api/ai/cache-stats` + `costMeter` savings line | ✅ exact/tool/semantic hit-rates + per-run $ saved. |

## Shipped DORMANT (real, wired, off by default)

| Layer | Where | Status |
|---|---|---|
| **Verified semantic cache** | `_semantic_cache_*`, behind exact-match in `/api/ai/anthropic`; `SEMANTIC_CACHE_ENABLED=0` | ⚪ OFF by default. Same-grounding/same-corpus bucket + cosine ≥ 0.97 gate. Zero overhead when off (early-return before any embedding). |

**Why dormant, not active:** the report stages semantic reuse LAST, behind an
offline correctness-eval harness + evidence-overlap + unsafe-served-rate metric —
none of which HiC has yet. It also adds a per-call embedding cost, and the
exact-match layer already captures the deterministic repeat-generation wins at
zero added cost/risk. So its marginal value in HiC today is low. **Prerequisite
to enable:** build an offline eval that measures unsafe-served-rate on a golden
set; only then flip `SEMANTIC_CACHE_ENABLED=1`.

## Not built — architecturally N/A

| Layer | Why |
|---|---|
| **Stream-event log + resume** | HiC does **not** stream from providers. Every `/api/ai/*` handler is request/response (`client.post(...)` → `.json()`); no `stream:true`, no `StreamingResponse`/SSE, no client `EventSource`. The "Live Thinking" feed is client-simulated. Building a stream-event log would be infrastructure for a code path that does not exist (dead code, violates the no-debt rule). Revisit only if HiC adopts provider streaming. |

## Env knobs
- `EXACT_CACHE_ENABLED` (1), `EXACT_CACHE_TTL_SEC` (3600), `EXACT_CACHE_MAX` (512)
- `TOOL_CACHE_ENABLED` (1), `TOOL_CACHE_TTL_SEC` (900)
- `ANTHROPIC_CACHE_TTL` (1h | 5m), `PROMPT_CACHE_ENABLED` (1), `ANTHROPIC_CACHE_MIN_CHARS` (4000)
- `SEMANTIC_CACHE_ENABLED` (0), `SEMANTIC_CACHE_THRESHOLD` (0.97)
