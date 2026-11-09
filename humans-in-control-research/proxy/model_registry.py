"""Central model registry + vendor-drift guard (2026-06-02, harness I2).

Single source of truth for which model IDs the proxy treats as known-good, and
their lifecycle status. Guards the VENDOR / SUNSET drift class: when a provider
retires a model ID (the silent-400 failure that bit this project: opus-4-8
temperature 400s, sunset snapshots), a request for a retired or unknown model is
flagged LOUD here -- a startup alarm + a RunReceipt degradation -- instead of
surfacing as an opaque provider 400 mid-run.

Mirrors services/aiRouter.ts MODEL_REGISTRY so the SPA and proxy agree on the
canonical set. WHEN A MODEL IS ADDED OR SUNSET, UPDATE BOTH FILES. This file is
the proxy's half of that contract; a future check can diff the two at CI time.
"""
import logging

log = logging.getLogger("model_registry")

# status: "active"  -> use freely
#         "sunset"   -> retired; requests should re-route to successor AND be flagged
#         "banned"   -> provider temporarily disallowed it; re-route to successor AND flag
# Kept in lockstep with services/aiRouter.ts MODEL_REGISTRY (active set) plus the
# sunset IDs the cost meter still prices for back-compat.
KNOWN_MODELS = {
    # 2026-06-13 - Fable 5 TEMPORARILY BANNED by Anthropic. All routing was
    # repointed to its stand-in claude-opus-4-8 across the SPA + proxy. Kept
    # here as "banned" (not removed) so a stray Fable call is flagged with its
    # successor instead of an opaque 400. Flip back to "active" + repoint the
    # routing strings once the ban lifts; see plans/fable-to-opus-swap-2026-06-13.md.
    "claude-fable-5":         {"provider": "anthropic", "status": "banned", "successor": "claude-opus-5-5"},
    # 2026-09-30 (owner directive, plan Stage 0.5) - Claude Opus 5.5 is THE Claude
    # research/reasoning model; Sonnet 5.5 is the structured / fallback tier.
    # Both: thinking always on (adaptive only), effort via output_config.effort,
    # no temperature/top_p/top_k, no forced tool_choice, no prefill.
    "claude-opus-5-5":        {"provider": "anthropic", "status": "active"},
    "claude-sonnet-5-5":      {"provider": "anthropic", "status": "active"},
    # 2026-09-30 - Opus 4.8 sunset in favour of Opus 5.5. Kept so a stale caller
    # is flagged with its successor (RunReceipt degradation), never silently served.
    "claude-opus-4-8":        {"provider": "anthropic", "status": "sunset", "successor": "claude-opus-5-5"},
    "claude-sonnet-4-6":      {"provider": "anthropic", "status": "active"},
    "gemini-3.1-pro-preview": {"provider": "google",    "status": "active"},
    "gemini-3.5-flash":       {"provider": "google",    "status": "active"},
    "gpt-5.5":                {"provider": "openai",    "status": "active"},
    "gpt-5.4":                {"provider": "openai",    "status": "active"},
    "gpt-5.4-mini":           {"provider": "openai",    "status": "active"},
    "deepseek-v4-flash":      {"provider": "deepseek",  "status": "active"},
    "deepseek-v4-pro":        {"provider": "deepseek",  "status": "active"},
    # Sunset — retained ONLY so a stale caller is flagged with a successor,
    # never silently 400'd. Do not route new work here.
    # 2026-06-12 - gemini-2.5-flash moved to sunset: retired tier per the
    # canonical-models standing rule; one escaped call site logged a raw key
    # against it before the pin sweep.
    "gemini-2.5-flash":       {"provider": "google",    "status": "sunset", "successor": "gemini-3.5-flash"},
    "claude-opus-4-7":        {"provider": "anthropic", "status": "sunset", "successor": "claude-opus-5-5"},
    "claude-opus-4-6":        {"provider": "anthropic", "status": "sunset", "successor": "claude-opus-5-5"},
}

# ---------------------------------------------------------------------------
# 2026-09-30 (plan Stage 0.5) - the proxy half of services/claudeModelPolicy.ts.
# ONE place for the Claude model ids proxy-internal callers use (artifact engine,
# topic-model labels) and for the request contract every Claude 4.6+/5.x body
# must satisfy. Keep in lockstep with the TS module.
# ---------------------------------------------------------------------------
CLAUDE_REASONING_MODEL = "claude-opus-5-5"
CLAUDE_STRUCTURED_MODEL = "claude-sonnet-5-5"
# 2026-10-31 (agent-stack plan WS-D D2): the chat seat, the proxy half of aiRouter.DEFAULT_MODELS.fast_generation.
# Pinned to the TS value by services/modelSeats.test.ts, so /api/models cannot drift from the router.
CHAT_MODEL = "gemini-3.5-flash"


def routing_seats() -> dict:
    """The routing authority's seats, served at /api/models so no service hard-codes a model id. The platform agent
    answers plain chat on the chat seat and synthesizes a tool chain on the reasoning seat (owner decision 4)."""
    return {
        "reasoning": CLAUDE_REASONING_MODEL,
        "structured": CLAUDE_STRUCTURED_MODEL,
        "chat": CHAT_MODEL,
        "agent_chat": CHAT_MODEL,
        "agent_tool_chain": CLAUDE_REASONING_MODEL,
    }

import re as _re
# Models that reject temperature/top_p/top_k and thinking budgets (adaptive thinking only).
CLAUDE_ADAPTIVE_RE = _re.compile(r"claude-(opus-4-[6-9]|opus-5|sonnet-4-6|sonnet-5|fable|mythos)", _re.I)
# Models on which thinking cannot be disabled at all (5.5 generation + Fable/Mythos).
CLAUDE_ALWAYS_THINKING_RE = _re.compile(r"claude-(opus-5-5|sonnet-5-5|fable|mythos)", _re.I)
# Models that accept server-side `fallbacks: "default"` (Opus 5 generation + Fable).
CLAUDE_SERVER_FALLBACK_RE = _re.compile(r"claude-(opus-5|sonnet-5-5|fable)", _re.I)


def claude_uses_adaptive_thinking(model):
    return bool(CLAUDE_ADAPTIVE_RE.search(_norm(model)))


def normalize_claude_body(body, default_effort=None):
    """Apply the Claude 4.6+/5.x request contract to a Messages body IN PLACE and
    return it. Idempotent. Mirrors applyAnthropicRequestDefaults in
    services/claudeModelPolicy.ts:
      - strip temperature / top_p / top_k (400 on this family)
      - thinking -> {type: adaptive, display: summarized} (budget_tokens / disabled
        are 400s on 5.x); preserves an existing display / block_binding
      - output_config.effort set from default_effort only when the caller sent none
      - forced tool_choice (any / tool / required) -> auto
      - HiC-private hint fields (_hicKind, _hicEffort, _hic_*) removed
    Non-adaptive models (Haiku 4.5) only lose the private fields."""
    if not isinstance(body, dict):
        return body
    for k in [k for k in list(body.keys()) if str(k).startswith("_hic")]:
        body.pop(k, None)
    model = _norm(body.get("model"))
    if not claude_uses_adaptive_thinking(model):
        return body
    for k in ("temperature", "top_p", "top_k"):
        body.pop(k, None)
    # 2026-10-05: Messages API metadata accepts only user_id ("metadata.seed: Extra inputs are not permitted").
    md = body.get("metadata")
    if isinstance(md, dict):
        if md.get("user_id"):
            body["metadata"] = {"user_id": md["user_id"]}
        else:
            body.pop("metadata", None)
    for k in ("config", "generationConfig"):
        if isinstance(body.get(k), dict):
            for kk in ("temperature", "top_p", "top_k"):
                body[k].pop(kk, None)
    th = body.get("thinking") if isinstance(body.get("thinking"), dict) else {}
    nxt = {"type": "adaptive", "display": th.get("display") or "summarized"}
    if isinstance(th.get("block_binding"), dict):
        nxt["block_binding"] = th["block_binding"]
    body["thinking"] = nxt
    if default_effort:
        oc = body.get("output_config") if isinstance(body.get("output_config"), dict) else {}
        if not oc.get("effort"):
            oc["effort"] = default_effort
        body["output_config"] = oc
    tc = body.get("tool_choice")
    if isinstance(tc, dict) and tc.get("type") in ("any", "tool"):
        body["tool_choice"] = {"type": "auto"}
    elif isinstance(tc, str) and tc in ("any", "required"):
        body["tool_choice"] = {"type": "auto"}
    return body


def _norm(model):
    return (model or "").strip()


def status_of(model):
    m = KNOWN_MODELS.get(_norm(model))
    return m["status"] if m else "unknown"


def is_known(model):
    return _norm(model) in KNOWN_MODELS


def is_active(model):
    return status_of(model) == "active"


def successor_of(model):
    return (KNOWN_MODELS.get(_norm(model)) or {}).get("successor")


def check_model(model):
    """Return (ok: bool, status: str, detail: str). ok is True only for active models."""
    m = _norm(model)
    st = status_of(m)
    if st == "active":
        return True, "active", ""
    if st == "sunset":
        return False, "sunset", f"{m} is sunset; route to successor {successor_of(m)!r}"
    if st == "banned":
        return False, "banned", f"{m} is temporarily banned by the provider; route to successor {successor_of(m)!r}"
    return False, "unknown", f"{m!r} is not in the model registry (possible vendor sunset, typo, or stale caller)"


def active_models():
    return sorted(k for k, v in KNOWN_MODELS.items() if v["status"] == "active")


def assert_startup(default_models):
    """Log the active set and warn LOUD for any proxy default that is not active.
    Called at boot so a sunset/typo default is a startup alarm, not a mid-run 400."""
    act = active_models()
    log.info(f"[model-registry] {len(act)} active models: {', '.join(act)}")
    flagged = 0
    for dm in default_models or []:
        ok, st, detail = check_model(dm)
        if not ok:
            flagged += 1
            log.warning(f"[model-registry] DRIFT GUARD: proxy default {dm!r} is {st} -- {detail}")
    if not flagged:
        log.info("[model-registry] all proxy default models are active -- no drift at startup")
    return flagged


# ---------------------------------------------------------------------------
# 2026-10-01 (plan Stage 0.2) - list prices per 1M tokens, mirror of
# services/costMeter.ts PRICING. Keep both in lockstep.
# ---------------------------------------------------------------------------
PRICES = {
    "claude-opus-5-5":        (4.00, 20.0, 0.05),
    "claude-sonnet-5-5":      (2.00, 10.0, 0.10),
    "claude-opus-4-8":        (5.00, 25.0, 0.10),
    "claude-opus-4-7":        (15.0, 75.0, 0.10),
    "claude-sonnet-4-6":      (3.00, 15.0, 0.10),
    "claude-haiku-4-5":       (1.00, 5.00, 0.10),
    "gemini-3.1-pro-preview": (3.50, 10.5, 0.25),
    "gemini-3.5-flash":       (0.30, 1.20, 0.25),
    "gemini-3.1-flash-image-preview": (0.30, 1.20, 0.25),
    "gpt-5.5":                (5.00, 20.0, 0.10),
    "gpt-5.4":                (5.00, 20.0, 0.10),
    "gpt-5.4-mini":           (0.25, 2.00, 0.10),
    "deepseek-v4-flash":      (0.27, 1.10, 0.10),
    "deepseek-v4-pro":        (0.55, 2.20, 0.10),
}
_DEFAULT_PRICE = (5.00, 20.0, 0.10)


def price_usd(model, input_tokens=0, output_tokens=0, cache_read_tokens=0, cache_write_tokens=0, cache_ttl="5m"):
    """List-price dollars for one call. Cache reads at the model's read factor; cache writes
    at 1.25x (5m) or 2.0x (1h) of the input rate, the premium Anthropic actually charges."""
    m = _norm(model)
    key = next((k for k in PRICES if k in m), None)
    inp, out, read_f = PRICES.get(key, _DEFAULT_PRICE)
    write_f = 2.0 if str(cache_ttl) == "1h" else 1.25
    return round(
        (float(input_tokens or 0) / 1e6) * inp
        + (float(output_tokens or 0) / 1e6) * out
        + (float(cache_read_tokens or 0) / 1e6) * inp * read_f
        + (float(cache_write_tokens or 0) / 1e6) * inp * write_f,
        6,
    )
