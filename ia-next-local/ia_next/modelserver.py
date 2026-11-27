"""The model server's contract, checked whenever its version changes (harness WS-H19, configuration drift, 27 Nov).

26 Nov: the Ollama app updated itself to 0.40.18 on a restart, and the new version silently cut any prompt longer than
the model's window (3,011 tokens became 514) unless the request said "truncate": false. Nothing noticed until a
measurement looked wrong. Rather than freezing updates, the harness checks the two behaviours IA Next Local depends on
each time the version changes:
  - refuses_long: a prompt longer than the window, sent with "truncate": false, is refused, never cut;
  - keeps_window: the resident model keeps the window it was loaded with (no reload to another size).
The probe uses a chat model that is already resident, at its own window, so it never loads or reloads a model. It runs
as a visible task (kind model_check); a broken behaviour files a papercut and shows on the health bar.
"""
import json
import os
import time

import httpx

from . import config, store

CONTRACT_FILE = os.path.join(config.DATA_DIR, "ollama_contract.json")


def version(get=httpx.get):
    try:
        return str(get(config.OLLAMA_URL + "/api/version", timeout=5).json().get("version") or "")
    except Exception:
        return ""


def saved():
    try:
        with open(CONTRACT_FILE, encoding="utf-8") as fh:
            return json.load(fh) or {}
    except (OSError, ValueError):
        return {}


def _save(d):
    os.makedirs(os.path.dirname(CONTRACT_FILE), exist_ok=True)
    with open(CONTRACT_FILE, "w", encoding="utf-8") as fh:
        json.dump(d, fh, indent=1)


def _resident_chat_model(get=httpx.get):
    from . import providers
    ps = get(config.OLLAMA_URL + "/api/ps", timeout=5).json().get("models") or []
    chat = [m for m in ps if m.get("name") not in providers.EMBED_MODELS and int(m.get("context_length") or 0) > 0]
    return max(chat, key=lambda m: int(m.get("context_length") or 0)) if chat else None


def probe(get=httpx.get, post=httpx.post):
    """{model, window, refuses_long, keeps_window, detail} using a resident chat model, or {"skipped": why}."""
    m = _resident_chat_model(get)
    if not m:
        return {"skipped": "no chat model is loaded; the check runs when one is"}
    name, window = m["name"], int(m["context_length"])
    long_prompt = "word " * (window + 2000)            # about one token a word: past the window by about 2,000
    t0 = time.time()
    r = post(config.OLLAMA_URL + "/api/chat", json={"model": name, "stream": False, "truncate": False, "keep_alive": -1,
                                                   "messages": [{"role": "user", "content": long_prompt}],
                                                   "options": {"num_ctx": window, "num_predict": 1}}, timeout=180)
    seconds = round(time.time() - t0, 1)
    if r.status_code == 200:
        got = int((r.json() or {}).get("prompt_eval_count") or 0)
        refuses, detail = False, f"a prompt of about {window + 2000:,} tokens was accepted and read as {got:,}: cut, not refused"
    else:
        refuses, detail = True, f"a prompt past the window was refused (HTTP {r.status_code}) in {seconds} s"
    after = next((x for x in get(config.OLLAMA_URL + "/api/ps", timeout=5).json().get("models") or [] if x.get("name") == name), {})
    keeps = int(after.get("context_length") or 0) == window
    return {"model": name, "window": window, "refuses_long": refuses, "keeps_window": keeps,
            "detail": detail + ("" if keeps else f"; the model now holds {after.get('context_length')} tokens, not {window}")}


def check(force=False, idle=lambda: True, get=httpx.get, post=httpx.post):
    """When the version differs from the last one checked (or force), probe as a visible task and save the result.
    Returns the saved contract, or None when nothing was due or the machine was busy."""
    v = version(get)
    last = saved()
    if not v or (v == last.get("version") and not force and last.get("checked")) or not idle():
        return None
    from . import dreaming
    eid = dreaming._engagement()
    tid, _ = store.create_task(eid, "model_check", {"goal": f"check the model server after its change to {v}"}, 0.0,
                               idem_key=f"model-check-{v}-{int(time.time())}")
    store.update_task(tid, status="running")
    try:
        if last.get("version") and last["version"] != v:
            store.event("ollama_version_changed", {"from": last["version"], "to": v}, eid, tid)
        with store.stage(tid, f"Checking Ollama {v}", "code, with the loaded model") as st:
            got = probe(get, post)
            st.say(got.get("skipped") or got["detail"])
        if got.get("skipped"):
            store.update_task(tid, status="done", summary=f"Ollama {v}: {got['skipped']}")
            return None
        ok = got["refuses_long"] and got["keeps_window"]
        contract = dict(got, version=v, previous=last.get("version") or "", ok=ok, checked=time.time())
        _save(contract)
        store.event("ollama_contract_checked", {k: contract[k] for k in ("version", "previous", "ok", "refuses_long", "keeps_window")}, eid, tid)
        if not ok:
            from . import papercuts
            papercuts.file("model server", f"checked Ollama {v} after it changed from {last.get('version') or 'unknown'}",
                           "a prompt past the window is refused, and the resident model keeps its window", got["detail"],
                           fix="send truncate false and num_ctx on every call, or return to the previous Ollama version",
                           filed_by="model server check")
        store.update_task(tid, status="done", summary=(f"Ollama {v} keeps both promises: long prompts refused, window kept" if ok
                                                       else f"Ollama {v} breaks a promise: {got['detail']}; a papercut is filed"))
        return contract
    except Exception as e:
        store.update_task(tid, status="failed", error=f"{type(e).__name__}: {str(e)[:300]}")
        return None


def health_note():
    """(ok, detail) for the health bar from the saved contract: a broken promise on the version running now."""
    c = saved()
    if c.get("version") and c.get("ok") is False:
        return False, f"Ollama {c['version']} breaks a promise IA Next relies on: {c.get('detail')}"
    return True, ""
