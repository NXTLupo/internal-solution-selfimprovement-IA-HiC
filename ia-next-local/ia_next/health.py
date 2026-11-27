"""What is actually working, checked rather than assumed (uplift plan 2026-11-23, WS-3 step 1).

22 Nov: HiC's embedder (the Social Research backend) had been stopped for hours after a Docker restart. Whole-second-
brain search returned nothing and no screen said why; 9,398 wiki pages were left without embeddings. `deep()` checks
each service IA Next Local depends on and says, in words, what is down and what that disables.
"""
import os
import time

import httpx

from . import config

TIMEOUT = 4.0
_CACHE = {"at": 0.0, "value": None}
CACHE_SECONDS = 20


def _get(url, timeout=TIMEOUT, **kw):
    try:
        r = httpx.get(url, timeout=timeout, **kw)
        return r.status_code, r
    except httpx.HTTPError as e:
        return 0, e


def _check_ollama():
    code, r = _get(config.OLLAMA_URL + "/api/tags")
    if code != 200:
        return False, "the local model server (Ollama) is not answering", "every written artifact and the chat"
    names = {m.get("name") for m in (r.json().get("models") or [])}
    wanted = {s.get("primary") for n, s in config.SEATS.items() if n not in getattr(config, "DORMANT_SEATS", ())
              and s.get("primary") and ":" in str(s.get("primary"))
              and not str(s["primary"]).startswith("comfyui:")}
    missing = sorted(m for m in wanted if m not in names)
    if missing:
        return False, f"models missing from Ollama: {', '.join(missing)}", "the seats those models fill"
    from . import modelserver                     # (WS-H19) the contract checked after the model server last changed
    ok, why = modelserver.health_note()
    if not ok:
        return False, why, "long prompts may be cut without notice"
    return True, f"{len(names)} models available", ""


def _check_comfy():
    code, _ = _get(config.COMFY_URL + "/system_stats")
    return (code == 200, "answering" if code == 200 else "the picture engine (ComfyUI) is not answering",
            "" if code == 200 else "persona and journey photographs, deck pictures, infographic illustrations")


def _check_render():
    code, _ = _get(config.RENDER_URL.rstrip("/") + "/health")
    return (code == 200, "answering" if code == 200 else "the page renderer is not answering",
            "" if code == 200 else "PDF, PowerPoint and picture downloads; prototype screenshots")


def _check_search():
    code, _ = _get(config.SEARCH_URL + "/healthz")
    if code != 200:
        code, _ = _get(config.SEARCH_URL + "/")
    return (code == 200, "answering" if code == 200 else "the web search engine (SearXNG) is not answering",
            "" if code == 200 else "web research, the gap analysis's web step")


def _check_hic():
    from . import hic
    code, _ = _get(hic.HIC_URL + "/health")
    if code != 200:
        return False, "HiC's research proxy is not answering", "data packs, the second brain (archiving and search), PowerPoint export"
    return True, "answering", ""


# 26 Nov: this check ran with every deep health read (every 20 s while the page is open). Each run made HiC count its
# chunk store on its event loop and embed a test sentence; during a deep research run HiC logged 99 loop stalls in 40
# minutes and the run's archive step waited on HiC. The result now holds for five minutes (one minute while it fails).
EMBEDDER_OK_SECONDS, EMBEDDER_DOWN_SECONDS = 300, 60
_EMBEDDER = {"at": 0.0, "value": None}


def _check_embedder():
    """HiC embeds wiki chunks with its local embedder; when that is down, new pages get no embeddings and second-brain
    search returns nothing (it still answers HTTP 200, which is why this needs its own check)."""
    v = _EMBEDDER["value"]
    if v is not None and time.time() - _EMBEDDER["at"] < (EMBEDDER_OK_SECONDS if v[0] else EMBEDDER_DOWN_SECONDS):
        return v
    v = _embedder_now()
    _EMBEDDER.update(at=time.time(), value=v)
    return v


def _embedder_now():
    from . import hic
    try:
        st = hic._forward("GET", "/api/wiki/embed-status", 20)
    except Exception as e:
        return False, f"HiC's embedding status could not be read ({str(e)[:80]})", "second-brain search"
    chunked = st.get("chunked") or {}
    if not chunked.get("available"):
        return False, "HiC's chunk store is unavailable", "second-brain search and new embeddings"
    try:                                          # a fresh document text each time: query embeddings are cached
        got = hic._forward("POST", "/api/embed", 20, json={"texts": [f"health check {time.time()}"], "task_type": "document"})
        if not (got.get("embeddings") or [None])[0]:
            raise ValueError("no vector returned")
    except Exception:
        return False, ("HiC's embedder is not answering (on this machine it is the Social Research backend; start it "
                       "with docker compose -f docker-compose-all.yml up -d social-research-backend)"), \
            "second-brain search; pages written now get no embeddings until it returns"
    return True, f"{chunked.get('articles', 0):,} pages and {chunked.get('chunks', 0):,} chunks embedded", ""


def _check_whisper():
    from . import videotranscript
    ok = videotranscript.model_ready()
    return (ok, "Whisper large-v3 weights present" if ok else f"Whisper weights missing at {videotranscript.model_path()}",
            "" if ok else "video and long-recording transcription")


def _check_speed():
    """Field test 23 Nov (S1): the writing model's measured rate. A model spilled into shared graphics memory still
    answers, ten to twenty times slower, and nothing else reports it."""
    from . import providers
    slow = {m: s for m, s in providers.speed().items() if s["slow"]}
    if not slow:
        return True, "the writing model is at its normal speed", ""
    m, s = next(iter(slow.items()))
    if s["fallback"]:
        return False, (f"The writing model slowed to {s['tps']:g} tokens a second because another program is holding "
                       "graphics memory. Work has moved to the smaller model file until the memory is free."), ""
    return False, (f"The writing model is running at {s['tps']:g} tokens a second because another program is holding "
                   "graphics memory. Close graphics-heavy programs, or set them to the integrated card in Windows "
                   "Settings, System, Display, Graphics."), "the speed of every report, deck and document"


CHECKS = (("models", _check_ollama), ("pictures", _check_comfy), ("renderer", _check_render), ("search", _check_search),
          ("hic", _check_hic), ("embedder", _check_embedder), ("transcription", _check_whisper), ("speed", _check_speed))


def deep(force=False):
    """{ok, checked_at, services: [{name, ok, detail, disables}], down: [names]} (cached for 20 s)."""
    now = time.time()
    if not force and _CACHE["value"] and now - _CACHE["at"] < CACHE_SECONDS:
        return _CACHE["value"]
    rows = []
    for name, fn in CHECKS:
        try:
            ok, detail, disables = fn()
        except Exception as e:                    # a check that breaks is reported, never raised
            ok, detail, disables = False, f"the check failed ({type(e).__name__}: {str(e)[:80]})", ""
        rows.append({"name": name, "ok": bool(ok), "detail": detail, "disables": disables})
    value = {"ok": all(r["ok"] for r in rows), "checked_at": now, "services": rows,
             "down": [r["name"] for r in rows if not r["ok"]]}
    _CACHE.update(at=now, value=value)
    return value
