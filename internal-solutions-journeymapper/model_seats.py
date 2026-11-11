"""Model ids from the platform's routing authority (IA plan Phase 0, section 6.10 step 5, 2026-11-11).

The research proxy serves the seats at GET /api/models. Journey Mapper reads them here instead of carrying its own
model constants, so a model retired at the authority is retired here too. Precedence for the production model:
an explicit ANTHROPIC_MODEL override, then the proxy's reasoning seat, then a current fallback constant. An
override or a caller-supplied id that the authority marks sunset or banned moves to its successor, and a retired
Claude generation (claude-3*, claude-2*, claude-instant*) falls back to the seat, so a stale pin cannot reach the
provider. The seats are read once per process and re-read after ten minutes; an unreachable proxy is not an error.
"""
import json
import logging
import os
import re
import threading
import time
import urllib.request

log = logging.getLogger(__name__)

REASONING_FALLBACK = "claude-opus-5-5"     # seats.reasoning
STRUCTURED_FALLBACK = "claude-sonnet-5-5"  # seats.structured
FAST_FALLBACK = "claude-haiku-5-5"         # seat_matrix.fast.secondary

_RETIRED_GENERATION = re.compile(r"^claude-(3|2|instant)", re.I)
_WARNED = set()
_LOCK = threading.Lock()
_CACHE = {"at": 0.0, "data": None}
_TTL_SECONDS = 600


def _token():
    tok = os.getenv("PROXY_AUTH_TOKEN", "")
    if tok:
        return tok
    try:
        with open(os.getenv("HIC_RUNTIME_CONFIG", "/hic-workspace/.runtime/config.json"), encoding="utf-8") as fh:
            return json.load(fh).get("proxyToken", "") or ""
    except Exception:
        return ""


def _fetch():
    url = os.getenv("HIC_PROXY_URL", "http://research-proxy:5012").rstrip("/") + "/api/models"
    req = urllib.request.Request(url, headers={"x-proxy-token": _token()})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _models():
    with _LOCK:
        if _CACHE["data"] is not None and time.time() - _CACHE["at"] < _TTL_SECONDS:
            return _CACHE["data"]
        try:
            data = _fetch()
            if not isinstance(data, dict):
                data = {}
        except Exception as exc:
            log.info("routing authority /api/models unavailable, using fallback ids: %s", exc)
            data = {}
        _CACHE.update(at=time.time(), data=data)
        return data


def _walk(path):
    node = _models()
    for key in path:
        node = node.get(key) if isinstance(node, dict) else None
    return node


def seat_model(path, fallback, prefix="claude-"):
    """One seat's id: the proxy's value when it carries the right vendor prefix, else the fallback constant."""
    node = _walk(path)
    return node if isinstance(node, str) and node.startswith(prefix) else fallback


def _current(model):
    """The id to send for `model`: itself when the authority calls it active or does not list it, its successor
    when the authority marks it sunset or banned, None when it is a retired Claude generation."""
    m = (model or "").strip()
    if not m:
        return None
    info = (_models().get("models") or {}).get(m)
    if isinstance(info, dict):
        if info.get("status") in ("sunset", "banned") and info.get("successor"):
            _warn_once(m, f"model {m} is {info.get('status')} at the routing authority; using its successor "
                          f"{info['successor']}")
            return info["successor"]
        return m
    if _RETIRED_GENERATION.match(m):
        _warn_once(m, f"model {m} is a retired Claude generation; using the reasoning seat")
        return None
    return m


def _warn_once(model, message):
    if model not in _WARNED:
        _WARNED.add(model)
        log.warning(message)


def reasoning_model():
    """The production Claude model: ANTHROPIC_MODEL when set (kept current), else the reasoning seat."""
    override = os.getenv("ANTHROPIC_MODEL", "").strip()
    if override:
        current = _current(override)
        if current:
            return current
    return seat_model(("seats", "reasoning"), REASONING_FALLBACK)


def structured_model():
    return seat_model(("seats", "structured"), STRUCTURED_FALLBACK)


def fast_model():
    return seat_model(("seat_matrix", "fast", "secondary"), FAST_FALLBACK)


def resolve_requested(model):
    """A caller-supplied id (the llm_model form field), kept current; empty means the production model."""
    if not (model or "").strip():
        return reasoning_model()
    return _current(model) or reasoning_model()


def reasoning_source():
    """Where the production model id came from, for logs and checks."""
    override = os.getenv("ANTHROPIC_MODEL", "").strip()
    if override:
        current = _current(override)
        if current == override:
            return "env ANTHROPIC_MODEL"
        if current:
            return "env ANTHROPIC_MODEL (moved to its successor by the routing authority)"
    node = _walk(("seats", "reasoning"))
    return "proxy /api/models" if isinstance(node, str) and node.startswith("claude-") else "fallback constant"
