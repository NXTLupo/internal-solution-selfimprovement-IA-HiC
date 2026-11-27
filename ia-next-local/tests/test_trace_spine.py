"""The trace spine (harness WS-H3, 26 Nov): one id per conversation turn ties the turn's events, model calls, the
tasks it starts and its transcript together, so a turn can be read end to end. A fake model stands in."""
import json
from types import SimpleNamespace

from ia_next import agent, providers, store


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def test_a_turn_leaves_a_transcript_and_its_events_carry_the_trace(monkeypatch):
    monkeypatch.setattr(agent, "execute_tool", lambda name, args: {"results": [], "query": args.get("query")})
    n = [0]

    def fake(model, system, messages, ledger, tools=None, **kw):
        n[0] += 1
        providers.record_spend(providers.Usage(model="qwen-test", input_tokens=10, output_tokens=5, seconds=0.1), "agent:test")
        if n[0] == 1:
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id="tu1", name="recall",
                                                                                      input={"query": "grocery automation"})])
        return "Nothing on that yet.", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="Nothing on that yet.")])
    cid = agent.new_conversation()
    before = store.TRACE.get()
    out = agent.turn(cid, "What do I hold on grocery automation?", call=fake)
    tr = out["trace_id"]
    assert tr.startswith("tr_")
    view = store.trace_view(tr)
    t = view["transcript"]
    assert t["conversation"] == cid and t["reply"] == "Nothing on that yet." and t["exit"] == "answered"
    assert t["steps"][0]["tool"] == "recall" and t["steps"][0]["input"] == {"query": "grocery automation"}
    kinds = [e["kind"] for e in view["events"]]
    assert "agent_tool" in kinds and "agent_reply" in kinds and all(e["data"]["trace"] == tr for e in view["events"])
    assert len(view["model_calls"]) == 2 and t["models"] == ["qwen-test"]
    assert store.TRACE.get() == before                     # the trace ends with the turn


def test_a_task_started_in_a_turn_carries_its_trace_into_its_stages():
    eid = store.create_engagement("e", "o")
    tok = store.TRACE.set("tr_0123456789ab")
    try:
        tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0)
    finally:
        store.TRACE.reset(tok)
    assert store.get_task(tid)["brief"]["trace_id"] == "tr_0123456789ab"
    import threading
    seen = []

    def stage():                                           # a task's own thread starts with no trace, then takes it on
        store.start_node(tid, "Research Lead", "m", 1, progress=False)
        seen.append(store.TRACE.get())
        store.event("node_note", {"x": 1}, eid, tid)
    th = threading.Thread(target=stage)
    th.start()
    th.join()
    assert seen == ["tr_0123456789ab"]
    row = store.conn().execute("SELECT data FROM events WHERE kind = 'node_note' ORDER BY id DESC LIMIT 1").fetchone()
    assert json.loads(row["data"])["trace"] == "tr_0123456789ab"
    assert [x["id"] for x in store.trace_view("tr_0123456789ab")["tasks"]] == [tid]
