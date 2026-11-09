"""research-mcp tools (2026-10-31, agent-stack plan A4 + B2): the passport and memory tools call the proxy's ONE door
with the right shapes. The proxy is stubbed; no network."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture()
def mod(monkeypatch):
    pytest.importorskip("fastapi")
    import importlib
    m = importlib.import_module("app")
    calls = []

    def fake_get(path, params=None, timeout=20.0):
        calls.append(("GET", path, params or {}))
        if path == "/api/skills/registry":
            return {"skills": [{"id": "human-voice-editor", "version": "1.0", "status": "active", "invocation": "model", "description": "Voice.", "sha": "x", "dir": "human-voice-editor"}]}
        if path.startswith("/api/skills/"):
            return {"skill": {"id": "human-voice-editor", "version": "1.0"}, "body": "Skill: human-voice-editor v1.0\nVoice."}
        if path == "/api/memory/recall":
            return {"facts": [{"id": "f1", "content": "x"}], "rendered": "- [knowledge] x", "total": 1}
        return {}

    def fake_post(path, body, timeout=30.0):
        calls.append(("POST", path, body))
        return {"ok": True, "report": {"admitted": len(body.get("facts") or [])}}

    monkeypatch.setattr(m, "_proxy_get", fake_get)
    monkeypatch.setattr(m, "_proxy_post", fake_post)
    return m, calls


def _payload(res):
    return json.loads(res["content"][0]["text"]) if res["content"][0]["text"].startswith("{") else res["content"][0]["text"]


def test_tools_are_listed(mod):
    m, _ = mod
    names = {t["name"] for t in m.RESEARCH_TOOLS}
    assert {"list_skills", "get_skill", "recall_memory", "admit_memory"} <= names


def test_list_and_get_skill(mod):
    m, calls = mod
    listed = _payload(m._call_tool("list_skills", {"surface": "platform-agent"}))
    assert listed["count"] == 1 and listed["skills"][0]["id"] == "human-voice-editor" and "sha" not in listed["skills"][0]
    assert calls[0] == ("GET", "/api/skills/registry", {"surface": "platform-agent", "status": ""})
    body = _payload(m._call_tool("get_skill", {"id": "human-voice-editor"}))
    assert body.startswith("Skill: human-voice-editor v1.0")
    assert any(c[0] == "POST" and c[1] == "/api/telemetry/events" and c[2]["events"][0]["surface"] == "research-mcp" for c in calls)
    with pytest.raises(ValueError):
        m._call_tool("get_skill", {})


def test_recall_and_admit_go_through_the_memory_door(mod):
    m, calls = mod
    r = _payload(m._call_tool("recall_memory", {"objective": "executive search AI adoption", "engagement": "exec"}))
    assert r["rendered"].startswith("- [knowledge]")
    assert calls[-1][1] == "/api/memory/recall" and calls[-1][2]["surface"] == "research-mcp"
    a = _payload(m._call_tool("admit_memory", {"facts": [{"content": "x", "category": "knowledge"}], "run_id": "cc_session_1"}))
    assert a["ok"] and calls[-1] == ("POST", "/api/memory/admit", {"facts": [{"content": "x", "category": "knowledge"}], "run_id": "cc_session_1", "engagement": "", "surface": "research-mcp"})
    with pytest.raises(ValueError):
        m._call_tool("admit_memory", {"facts": [], "run_id": "x"})
    with pytest.raises(ValueError):
        m._call_tool("recall_memory", {"objective": " "})


def test_get_digest_reads_the_text_digest_and_moves_the_marker(mod, monkeypatch):
    m, calls = mod

    class _R:
        status_code = 200
        text = "Needs you: 1 proposal to review.\n\nOvernight rescore:\n- Rescored 14 artifacts from the last 24 hours; 3 failed."

        def json(self):
            return {}

    seen = []
    monkeypatch.setattr(m.requests, "get", lambda url, params=None, headers=None, timeout=None: seen.append((url, params)) or _R())
    res = m._call_tool("get_digest", {"mark_seen": True})
    assert res["content"][0]["text"].startswith("Needs you:")
    assert seen[0][0].endswith("/api/digest") and seen[0][1] == {"surface": "agent", "format": "text"}
    assert ("POST", "/api/digest/seen", {"surface": "agent"}) in calls
    assert any(t["name"] == "get_digest" for t in m.RESEARCH_TOOLS)
