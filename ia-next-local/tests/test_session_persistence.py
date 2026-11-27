"""Sessions survive a restart (harness WS-H4, 26 Nov): after every turn the conversation's working state (messages with
tool calls and result pointers, the compaction notes) is saved, and a restart restores it in full instead of the last
8,000 characters of what the person saw. A fake model stands in."""
from types import SimpleNamespace

from ia_next import agent, store


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def test_the_working_state_comes_back_after_a_restart(monkeypatch):
    monkeypatch.setattr(agent, "execute_tool", lambda n, a: {"engagements": [{"id": "eng_1", "title": "Retail"}], "count": 1})
    steps = [("list_engagements", {})]

    def fake(model, system, messages, ledger, tools=None, **kw):
        if steps:
            name, args = steps.pop(0)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id="tu1", name=name, input=args)])
        return "You have one engagement, Retail.", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="You have one engagement, Retail.")])
    cid = agent.new_conversation()
    agent.turn(cid, "what engagements do I have?", call=fake)
    before = agent.get_conversation(cid)
    msgs = list(before.messages)
    before.summary = "Objective: retail research. Work state: eng_1 Retail."
    store.save_conversation_state(cid, before.person, before.summary, before.messages, before.tool_files)
    agent._CONVS.clear()                                          # the restart
    after = agent.get_conversation(cid)
    assert after.messages == msgs and any(b.get("type") == "tool_use" for m in after.messages
                                          if isinstance(m.get("content"), list) for b in m["content"])
    assert after.summary.startswith("Objective") and "eng_1 Retail" in after.system and after.resume_note == ""
    assert store.conn().execute("SELECT COUNT(*) AS n FROM events WHERE kind = 'conversation_restored'").fetchone()["n"] >= 1


def test_the_notes_are_merged_in_fixed_sections():
    for section in ("Objective", "Decisions and preferences", "Work state", "Next move", "Ids and files", "still true"):
        assert section in agent.SUMMARY_SYSTEM


def test_an_overflow_inside_a_turn_is_recovered_once(monkeypatch):
    """Harness Engineering R7: the compaction routine fires reactively on overflow. This turn's older tool results become
    pointers and the call is retried; a second overflow in the same turn is reported, not looped."""
    from ia_next import providers
    monkeypatch.setattr(agent, "execute_tool", lambda n, a: {"results": ["passage " * 50]})
    steps = [("recall", {"query": "a"}), ("recall", {"query": "b"})]
    raised = []

    def fake(model, system, messages, ledger, tools=None, **kw):
        if steps:
            name, args = steps.pop(0)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id=f"tu{len(steps)}", name=name, input=args)])
        if not raised:
            raised.append(1)
            raise providers.ProviderError("this request needs about 70,000 tokens of context, over the local limit of 65,536")
        pointers = [b["content"] for m in messages if isinstance(m.get("content"), list) for b in m["content"]
                    if isinstance(b, dict) and b.get("type") == "tool_result"]
        assert any("full result kept at" in p for p in pointers)            # the older result is now a pointer
        return "done", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="done")])
    out = agent.turn(agent.new_conversation(), "look twice", call=fake)
    assert out["reply"] == "done"
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'context_overflow_recovered' ORDER BY id DESC LIMIT 1").fetchone()
    assert ev is not None and '"results_pruned": 1' in ev["data"]
