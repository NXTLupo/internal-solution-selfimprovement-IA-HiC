"""Plan Part 9 C4 to C6 and B4: hidden test engagements, files rehomed to a new engagement, "that deck" resolved from
the conversation's own work, and one conversation's spend limit."""
import json
import os
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, app as app_module, config, control, deck, providers, store, transcripts  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


@pytest.fixture
def client():
    return TestClient(app_module.app)


def test_engagements_made_by_checks_are_hidden_never_deleted(client):
    real = client.post("/api/engagements", json={"title": "Annual Giving vision", "objective": "o"}).json()["id"]
    check = client.post("/api/engagements", json={"title": "AUDIT upload check", "objective": "o", "test": True}).json()["id"]
    d = client.get("/api/engagements").json()
    assert [e["id"] for e in d["engagements"]] == [real] and d["hidden_count"] == 1
    assert {e["id"] for e in client.get("/api/engagements?include_hidden=1").json()["engagements"]} == {real, check}
    assert store.get_engagement(check)["title"] == "AUDIT upload check"             # reachable by id
    assert [e["id"] for e in agent._list_engagements()["engagements"]] == [real]    # the agent does not offer it
    client.post(f"/api/engagements/{real}/hidden", json={"hidden": True})
    assert client.get("/api/engagements").json()["hidden_count"] == 2
    client.post(f"/api/engagements/{real}/hidden", json={"hidden": False})
    assert [e["id"] for e in client.get("/api/engagements").json()["engagements"]] == [real]
    assert client.post("/api/engagements/eng_nope/hidden", json={"hidden": True}).status_code == 404


def test_files_dropped_in_the_wrong_engagement_get_their_own(client):
    old = store.create_engagement("Pipeline check: interview upload", "o")
    transcripts.add_text_source(old, "Partner interview (test)", "The partner said researchers use AI to build the longlist.", "transcript")
    s2 = transcripts.add_text_source(old, "01_Advancement_Farmers_Demo_Product_Brief.docx", "Annual Giving cannot see retention by cohort.", "document")
    r = client.post(f"/api/engagements/{old}/uploads/new-engagement", json={"source_ids": [s2]}).json()
    new = r["engagement_id"]
    assert r["title"] == "01 Advancement Farmers Demo Product Brief" and new != old
    moved = transcripts.uploaded_sources(new)
    assert [u["title"] for u in moved] == ["01_Advancement_Farmers_Demo_Product_Brief.docx"]
    assert r["source_ids"][s2] == moved[0]["id"]
    assert len(transcripts.uploaded_sources(old)) == 2                                 # copied, not taken away
    assert client.post(f"/api/engagements/{old}/uploads/new-engagement", json={"source_ids": ["S9"]}).status_code == 400


def _deck_turn_fake(eid, calls):
    def fake(model, system, messages, ledger, **kw):
        calls.append(messages[-1]["content"])
        if len(calls) == 1:
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[SimpleNamespace(
                type="tool_use", id="t1", name="start_deck", input={"engagement_id": eid, "audience": "a", "outline": [], "brand": "nu"},
                model_dump=lambda **k: {"type": "tool_use", "id": "t1", "name": "start_deck", "input": {}})])
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": "ok"}])
    return fake


def test_that_deck_means_the_work_this_conversation_started(monkeypatch):
    eid = store.create_engagement("e", "o")
    monkeypatch.setattr(deck.threading, "Thread", lambda *a, **k: SimpleNamespace(start=lambda: None))
    calls = []
    cid = agent.new_conversation()
    agent.turn(cid, "make the deck", call=_deck_turn_fake(eid, calls))
    # an artifact asked for in a conversation is planned first (plan.py); the person starts it on the plan card
    from ia_next import plan
    pid = store.conn().execute("SELECT id FROM plans WHERE conversation = ?", (cid,)).fetchone()[0]
    plan.start(pid, skip=["research"], background=False, wait=store.get_task)
    tid = store.conversation_task_ids(cid)[0]
    assert store.get_task(tid)["kind"] == "deck"
    calls.clear()
    agent.turn(cid, "make that deck Northeastern", call=lambda m, s, msgs, led, **kw: (
        calls.append(msgs[-1]["content"]) or ("ok", None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": "ok"}]))))
    assert f"(Work this conversation started, newest first: deck (queued) [{tid}]" in calls[0]


def test_one_conversation_waits_for_approval_past_its_limit(monkeypatch):
    eid = store.create_engagement("e", "o")
    transcripts.add_text_source(eid, "notes", "Annual Giving cannot see retention by cohort.", "document")
    monkeypatch.setattr(config, "SESSION_SPEND_LIMIT_USD", 3.0)
    monkeypatch.setattr(deck.threading, "Thread", lambda *a, **k: SimpleNamespace(start=lambda: None))
    cid = "conv_limit"
    providers.Ledger(limit_usd=5, purpose=f"agent:{cid}").add(providers.Usage("claude-opus-5-5", 100_000, 10_000))   # 0.60 USD
    args = {"engagement_id": eid, "audience": "a", "outline": [], "brand": "nu"}
    token = agent._CONV.set(cid)
    try:
        assert store.conversation_spend(cid) == pytest.approx(0.6)
        first = agent.execute_tool("start_deck", dict(args))                          # 0.60 + 2.50 passes 3.00
        assert first["approval"] == "pending" and "3.00 USD limit" in control.pending()[0]["reason"]
        assert not store.list_tasks(eid)
        control.decide(first["approval_id"], True)
        assert agent.execute_tool("start_deck", dict(args)).get("started") is True     # the approved call runs
    finally:
        agent._CONV.reset(token)
    assert agent.execute_tool("start_deck", dict(args, audience="b")).get("started") is True   # outside a conversation


def test_research_budget_defaults_to_the_standard_amount():
    spec = next(t for t in agent.TOOLS if t["name"] == "start_research_report")
    assert "Always 0" in spec["input_schema"]["properties"]["budget_usd"]["description"]
