"""WS-B B2 + WS-D D1/D2 + WS-A A4 (2026-10-31): one agent turn end to end with the proxy door stubbed.
Needs the agent's dependencies (fastapi, pydantic): runs in the agent container."""
import asyncio
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
JOB = "job_1793460208032_4efdb51f"


@pytest.fixture()
def agent(tmp_path, monkeypatch):
    pytest.importorskip("fastapi")
    monkeypatch.setenv("HIC_AGENT_DIR", str(tmp_path))
    import importlib
    import threads as thr
    monkeypatch.setattr(thr, "AGENT_DIR", str(tmp_path))
    app = importlib.import_module("app")
    door = app.door
    calls = {"complete": [], "admit": [], "recall": [], "telemetry": []}

    async def fake_complete(model, system, messages, max_tokens=8000):
        calls["complete"].append({"model": model, "system": system, "last": messages[-1]["content"]})
        if "Tool Results:" in "\n".join(m["content"] for m in messages) and "Do not use any more tools" in messages[-1]["content"]:
            return ("Executive search firms are piloting AI sourcing for longlists before changing fee models; the deck job "
                    f"{JOB} is queued and the run will land in the engagement library when it finishes.")
        if "build" in messages[-1]["content"].lower():
            return '```json\n{"tool_calls": [{"name": "run_deliverable", "parameters": {"engagement": "exec-search-2026", "hashtag": "#slides"}}]}\n```'
        return "It is still running; the thread will show the deck when it lands."

    async def fake_recall(objective, engagement="", limit=6):
        calls["recall"].append((objective, engagement))
        return {"rendered": "- [knowledge] Prior run: search partners distrust AI shortlisting for C-suite roles", "ids": ["f1"]}

    async def fake_admit(facts, run_id, engagement=""):
        calls["admit"].append({"facts": facts, "run_id": run_id, "engagement": engagement})
        return {"ok": True, "report": {"admitted": 1}}

    async def fake_telemetry(events):
        calls["telemetry"].extend(events)

    async def fake_exec(tool_call, conversation_id):
        return {"job_id": JOB, "status": "queued", "engagement": "exec-search-2026"}

    async def fake_seat(name):
        return {"agent_chat": "gemini-3.5-flash", "agent_tool_chain": "claude-opus-5-5"}[name]

    async def no_refresh(force=False):
        return {}

    monkeypatch.setattr(door, "complete", fake_complete)
    monkeypatch.setattr(door, "recall", fake_recall)
    monkeypatch.setattr(door, "admit", fake_admit)
    monkeypatch.setattr(door, "telemetry", fake_telemetry)
    monkeypatch.setattr(app, "execute_tool_call", fake_exec)
    monkeypatch.setattr(app.seats, "seat", fake_seat)
    monkeypatch.setattr(app.skill_mount, "refresh", no_refresh)
    app.skill_mount.skills = {"human-voice-editor": {"version": "1.0", "sha": "x", "body": "Skill: human-voice-editor v1.0\nVoice rules."}}
    app.tool_definitions["run_deliverable"] = {"service": "research", "url": "http://research-mcp:8507/mcp", "spec": {"description": "Run a HiC deliverable"}}
    app.conversations.clear()
    return app, thr, calls, tmp_path


def test_tool_chain_turn_routes_models_admits_memory_and_records_the_thread(agent):
    app, thr, calls, base = agent
    out = asyncio.run(app.process_message("A", "Please build a deck on executive search AI adoption"))
    assert out["thread_id"] == "A" and out["routed"] is False
    assert [c["model"] for c in calls["complete"]] == ["gemini-3.5-flash", "claude-opus-5-5"]   # chat seat, then reasoning seat
    assert "Voice rules." in calls["complete"][0]["system"]                                    # the mounted skill package
    assert "search partners distrust AI shortlisting" in calls["complete"][0]["system"]       # recalled memory
    assert calls["admit"] and calls["admit"][0]["engagement"] == "exec-search-2026"
    assert "(tools: run_deliverable)" in calls["admit"][0]["facts"][0]["content"]
    row = thr.load_registry(str(base))["A"]
    assert row["job_ids"] == [JOB] and row["engagement"] == "exec-search-2026" and row["location"] == "cloud"
    turn = next(e for e in calls["telemetry"] if e["kind"] == "agent_turn")
    assert turn["tools"] == ["run_deliverable"] and turn["memory_admitted"] is True
    assert any(e["kind"] == "skill" and e["skill_id"] == "human-voice-editor" for e in calls["telemetry"])


def test_a_second_ask_about_the_job_lands_in_the_owning_thread_and_survives_a_restart(agent):
    app, thr, calls, base = agent
    asyncio.run(app.process_message("A", "Please build a deck on executive search AI adoption"))
    app.conversations.clear()                                         # simulate an agent restart
    out = asyncio.run(app.process_message("B", f"Is {JOB} done yet?"))
    assert out["routed"] is True and out["thread_id"] == "A"
    conv = thr.load_conversation("A", str(base))
    texts = [m["content"] for m in conv["messages"]]
    assert any("build a deck" in t for t in texts) and any(JOB in t for t in texts)   # history reloaded from disk
    assert thr.load_registry(str(base))["A"]["turns"] == 2
    assert not any(t.startswith("Please provide a clear response") for t in texts)   # scaffolding not kept


def test_plain_chat_uses_only_the_chat_seat_and_admits_nothing(agent):
    app, thr, calls, base = agent
    out = asyncio.run(app.process_message("C", "What can you do?"))
    assert out["reply"].startswith("It is still running") and [c["model"] for c in calls["complete"]] == ["gemini-3.5-flash"]
    assert calls["admit"] == []
