"""Model ids from the platform's routing authority (IA plan Phase 0, section 6.10 step 5).

The research proxy serves the seats at GET /api/models. This service reads them instead of carrying its
own model constants, so a model retired at the authority is retired here too. Precedence for every id:
an explicit environment override, then the proxy's seat, then the module's own fallback constant. The
seats are read once per process and re-read after ten minutes; an unreachable proxy is not an error.
"""
import json
import os
import threading
import time
import urllib.request

_LOCK = threading.Lock()
_CACHE = {"at": 0.0, "data": None}
_TTL_SECONDS = 600


def _token():
    tok = os.getenv("PROXY_AUTH_TOKEN", "")
    if tok:
        return tok
    try:
        with open("/hic-workspace/.runtime/config.json", encoding="utf-8") as fh:
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
        except Exception:
            data = {}
        _CACHE.update(at=time.time(), data=data)
        return data


def seat_model(env_var, path, fallback, prefix):
    """Resolve one model id. `path` is a tuple into the /api/models payload, for example
    ("seats", "reasoning") or ("seat_matrix", "research", "primary"). Only ids starting with
    `prefix` are accepted, so a seat that points at another vendor never reaches this client."""
    override = os.getenv(env_var) if env_var else None
    if override:
        return override
    node = _models()
    for key in path:
        node = node.get(key) if isinstance(node, dict) else None
    if isinstance(node, str) and node.startswith(prefix):
        return node
    return fallback


def source_of(path, prefix):
    """Where an id came from, for /health and logs."""
    node = _models()
    for key in path:
        node = node.get(key) if isinstance(node, dict) else None
    return "proxy /api/models" if isinstance(node, str) and node.startswith(prefix) else "fallback constant"
