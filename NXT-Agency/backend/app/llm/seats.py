"""Model ids from the platform's routing authority (IA plan Phase 0, section 6.10 step 5).

The research proxy serves the seats at GET /api/models. NXT Agency reads them here instead of carrying its own
model table, so a model retired at the authority is retired here too. Precedence for every id: an explicit
environment override, then the proxy's seat, then a current fallback constant. The seats are read once per
process and re-read after ten minutes; an unreachable proxy is not an error (the fallback constants are the
current seat ids as of 2026-11-11).

The proxy URL and token come from hic_bridge, NXT Agency's existing door into the research proxy.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()
_CACHE: dict[str, Any] = {"at": 0.0, "data": None}
_TTL_SECONDS = 600

# Current fallbacks: the ids the routing authority seated or named on 2026-11-11.
REASONING_FALLBACK = "claude-opus-5-5"      # seats.reasoning
STRUCTURED_FALLBACK = "claude-sonnet-5-5"   # seats.structured
FAST_CLAUDE_FALLBACK = "claude-haiku-5-5"   # seat_matrix.fast.secondary
GEMINI_CHAT_FALLBACK = "gemini-3.5-flash"   # seats.chat
GEMINI_RESEARCH_FALLBACK = "gemini-4-carbon"  # seat_matrix.research.primary
GEMINI_SEARCH_FALLBACK = "gemini-3.5-flash"   # seat_matrix.search.serving (Argon held until grounding is tested)
OPENAI_FALLBACK = "gpt-6.1-terra"           # seat_matrix.analysis.secondary
OPENAI_LIGHT_FALLBACK = "gpt-5.5"           # no seat names a light OpenAI id; gpt-5.5 is the platform's proven one
# Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5 accept computer use only as computer_toolset_20260801. Until the agent
# loop speaks the toolset, a request that carries the computer_20251124 tool is served by an active model that
# still accepts it.
COMPUTER_USE_FALLBACK = "claude-sonnet-4-6"


def _fetch() -> dict:
    import httpx  # pylint: disable=import-outside-toplevel

    from app.hic_bridge import PROXY_URL, _token  # pylint: disable=import-outside-toplevel

    headers = {}
    tok = _token()
    if tok:
        headers["x-proxy-token"] = tok
    resp = httpx.get(f"{PROXY_URL}/api/models", headers=headers, timeout=3.0)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, dict) else {}


def models_payload() -> dict:
    """The cached /api/models payload ({} when the proxy cannot be read)."""
    with _LOCK:
        if _CACHE["data"] is not None and time.time() - _CACHE["at"] < _TTL_SECONDS:
            return _CACHE["data"]
        try:
            data = _fetch()
        except Exception as exc:  # pylint: disable=broad-except
            logger.info("routing authority /api/models unavailable, using fallback ids: %s", exc)
            data = {}
        _CACHE.update(at=time.time(), data=data)
        return data


def _walk(path: tuple[str, ...]) -> Any:
    node: Any = models_payload()
    for key in path:
        node = node.get(key) if isinstance(node, dict) else None
    return node


def seat_model(env_var: str | None, path: tuple[str, ...] | None, fallback: str, prefix: str) -> str:
    """Resolve one model id. `path` is a tuple into the /api/models payload, for example ("seats", "reasoning")
    or ("seat_matrix", "research", "primary"). Only ids starting with `prefix` are accepted, so a seat that points
    at another vendor never reaches this provider."""
    override = os.environ.get(env_var, "").strip() if env_var else ""
    if override:
        return override
    if path:
        node = _walk(path)
        if isinstance(node, str) and node.startswith(prefix):
            return node
    return fallback


def source_of(env_var: str | None, path: tuple[str, ...] | None, prefix: str) -> str:
    """Where an id came from, for /health, model_info and logs."""
    if env_var and os.environ.get(env_var, "").strip():
        return f"env {env_var}"
    if path:
        node = _walk(path)
        if isinstance(node, str) and node.startswith(prefix):
            return "proxy /api/models"
    return "fallback constant"


def reset_cache() -> None:
    """Forget the cached payload (tests)."""
    with _LOCK:
        _CACHE.update(at=0.0, data=None)
