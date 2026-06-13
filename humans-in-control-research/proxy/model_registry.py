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
    "claude-fable-5":         {"provider": "anthropic", "status": "banned", "successor": "claude-opus-4-8"},
    "claude-opus-4-8":        {"provider": "anthropic", "status": "active"},
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
    "claude-opus-4-7":        {"provider": "anthropic", "status": "sunset", "successor": "claude-opus-4-8"},
    "claude-opus-4-6":        {"provider": "anthropic", "status": "sunset", "successor": "claude-opus-4-8"},
}


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
