"""The model server's contract after it changes (harness WS-H19, 27 Nov): a new Ollama version is checked with the model
already loaded, at its own window; a version that cuts long prompts instead of refusing them, or reloads the model at
another size, is reported on the health bar and filed as a papercut; an unchanged version is not probed again."""
from types import SimpleNamespace

import pytest

from ia_next import config, health, modelserver, papercuts, store


@pytest.fixture(autouse=True)
def own_file(tmp_path, monkeypatch):
    monkeypatch.setattr(modelserver, "CONTRACT_FILE", str(tmp_path / "ollama_contract.json"))


def _server(ver, refuse=True, window_after=32768):
    calls = {"chat": 0}

    def get(url, timeout=None):
        if url.endswith("/api/version"):
            return SimpleNamespace(json=lambda: {"version": ver})
        ctx = 32768 if calls["chat"] == 0 else window_after
        return SimpleNamespace(json=lambda: {"models": [{"name": "qwen3.8:27b-q4_K_M", "context_length": ctx},
                                                        {"name": "qwen3-embedding:0.6b", "context_length": 2048}]})

    def post(url, json=None, timeout=None):
        calls["chat"] += 1
        assert json["truncate"] is False and json["options"]["num_ctx"] == 32768 and json["model"] == "qwen3.8:27b-q4_K_M"
        if refuse:
            return SimpleNamespace(status_code=400, json=lambda: {"error": "input length exceeds the context length"})
        return SimpleNamespace(status_code=200, json=lambda: {"prompt_eval_count": 514})
    return get, post, calls


def test_a_new_version_that_refuses_long_prompts_passes_and_is_not_probed_again():
    get, post, calls = _server("0.40.18")
    c = modelserver.check(get=get, post=post)
    assert c["ok"] and c["refuses_long"] and c["keeps_window"] and c["version"] == "0.40.18"
    assert modelserver.check(get=get, post=post) is None and calls["chat"] == 1          # same version: no second probe
    assert health._check_ollama  # the health bar reads the saved contract
    assert modelserver.health_note() == (True, "")


def test_a_version_that_cuts_long_prompts_is_reported(monkeypatch):
    filed = []
    monkeypatch.setattr(papercuts, "file", lambda *a, **k: filed.append(a))
    modelserver._save({"version": "0.40.16", "ok": True, "checked": 1.0})
    get, post, _ = _server("0.40.18", refuse=False)
    c = modelserver.check(get=get, post=post)
    assert c["ok"] is False and not c["refuses_long"] and "cut, not refused" in c["detail"] and filed
    ok, why = modelserver.health_note()
    assert not ok and "0.40.18" in why
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'ollama_version_changed' ORDER BY id DESC LIMIT 1").fetchone()
    assert '"from": "0.40.16"' in ev["data"] and '"to": "0.40.18"' in ev["data"]
    t = store.conn().execute("SELECT id FROM tasks WHERE kind = 'model_check' ORDER BY created DESC LIMIT 1").fetchone()
    assert store.get_task(t["id"])["summary"].startswith("Ollama 0.40.18 breaks a promise")


def test_a_reload_to_another_window_is_reported():
    get, post, _ = _server("0.41.0", window_after=4096)
    c = modelserver.check(get=get, post=post)
    assert c["refuses_long"] and not c["keeps_window"] and not c["ok"]


def test_no_probe_when_no_chat_model_is_loaded_or_the_machine_is_busy():
    def get(url, timeout=None):
        return SimpleNamespace(json=lambda: {"version": "0.42.0"} if url.endswith("/api/version") else {"models": []})
    assert modelserver.check(get=get, post=lambda *a, **k: pytest.fail("no probe")) is None
    assert modelserver.saved() == {}
    get2, post2, calls = _server("0.43.0")
    assert modelserver.check(get=get2, post=post2, idle=lambda: False) is None and calls["chat"] == 0
