"""2026-10-31 (live deck measurement): the WS-4 tool loop re-sent the growing conversation uncached on every
iteration. `_inject_anthropic_cache_control` now marks the last tool_result block while a loop is in
progress and keeps the system to two boundaries so the fourth breakpoint stays free."""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    import importlib
    return importlib.import_module("app")


def _body(app_mod, n_turns: int, big: bool = True):
    pad = "x" * (app_mod.ANTHROPIC_CACHE_MIN_CHARS + 10)
    brk = app_mod.HIC_CACHE_BREAK.strip()
    msgs = [{"role": "user", "content": [{"type": "text", "text": "Build the deck"}]}]
    for i in range(n_turns):
        msgs.append({"role": "assistant", "content": [{"type": "tool_use", "id": f"t{i}", "name": "render_slide", "input": {"i": i}}]})
        msgs.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": f"t{i}", "content": (pad if big else "ok")}]})
    return {
        "model": "claude-opus-5-5",
        "system": f"core {pad}\n{brk}\nengagement {pad}\n{brk}\nsemi {pad}\n{brk}\ntail",
        "tools": [{"name": "render_slide", "description": pad, "input_schema": {"type": "object"}}],
        "messages": msgs,
    }


def _count_breakpoints(body) -> int:
    n = sum(1 for t in body.get("tools", []) if "cache_control" in t)
    sysb = body.get("system")
    if isinstance(sysb, list):
        n += sum(1 for b in sysb if "cache_control" in b)
    for m in body.get("messages", []):
        c = m.get("content")
        if isinstance(c, list):
            n += sum(1 for b in c if isinstance(b, dict) and "cache_control" in b)
    return n


def test_tool_loop_gets_a_conversation_breakpoint_within_the_four_allowed(app_mod, monkeypatch):
    monkeypatch.setattr(app_mod, "PROMPT_CACHE_ENABLED", True)
    body = _body(app_mod, n_turns=2)
    telem: dict = {}
    assert app_mod._inject_anthropic_cache_control(body, telemetry=telem)
    last = body["messages"][-1]["content"][-1]
    assert last["type"] == "tool_result" and "cache_control" in last
    assert telem.get("messages_breakpoint") is True
    # tools (1) + system (2, capped while the loop runs) + conversation (1) = 4
    assert _count_breakpoints(body) == 4
    # the telemetry prefix measures the stable system segments only
    assert all("tool_result" not in s for s in telem["segments"])


def test_first_turn_keeps_three_system_boundaries_and_no_message_breakpoint(app_mod, monkeypatch):
    monkeypatch.setattr(app_mod, "PROMPT_CACHE_ENABLED", True)
    body = _body(app_mod, n_turns=0)
    assert app_mod._inject_anthropic_cache_control(body)
    assert "cache_control" not in body["messages"][-1]["content"][-1]
    assert _count_breakpoints(body) == 4   # tools + three system boundaries, as before


def test_small_conversation_is_not_marked(app_mod, monkeypatch):
    monkeypatch.setattr(app_mod, "PROMPT_CACHE_ENABLED", True)
    monkeypatch.setattr(app_mod, "ANTHROPIC_CACHE_MIN_CHARS", 10_000_000)
    body = _body(app_mod, n_turns=2, big=False)
    app_mod._inject_anthropic_cache_control(body)
    assert "cache_control" not in body["messages"][-1]["content"][-1]
