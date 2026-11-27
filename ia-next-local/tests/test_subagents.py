"""Sub-agents and the turn's own plan (harness WS-H14): a worker gets the parent's tools minus every outward or lasting
action and minus delegation, returns a bounded summary, and cannot run a tool it was not given; update_plan's plan is
shown back before each step. A fake model stands in."""
import json
from types import SimpleNamespace

from ia_next import agent, subagent


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def test_a_worker_gets_only_read_only_tools():
    names = {t["name"] for t in subagent.allowed_tools(agent.TOOLS)}
    assert "recall" in names and "list_engagements" in names
    for blocked in ("remember", "forget", "send_email", "schedule_task", "ask_worker", "start_deck", "start_research_report"):
        assert blocked not in names
    assert {t["name"] for t in subagent.allowed_tools(agent.TOOLS, ["recall", "remember"])} == {"recall"}


def test_the_summary_is_bounded_and_a_tool_it_was_not_given_is_refused():
    ran = []
    steps = [("remember", {"text": "x", "kind": "memory"}), ("recall", {"query": "walmart"})]

    def fake(model, system, messages, ledger, tools=None, **kw):
        if steps and tools:
            name, args = steps.pop(0)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id=f"t{len(steps)}", name=name, input=args)])
        return "found " * 2000, None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="found " * 2000)])
    summary, trace = subagent.run("what does the Library hold on Walmart?", tools=["recall", "remember"], call=fake,
                                  execute=lambda n, a: ran.append(n) or {"results": ["Walmart opened checkout"]})
    assert ran == ["recall"] and [t["tool"] for t in trace] == ["remember", "recall"] and trace[0]["ok"] is False
    assert len(summary) <= subagent.SUMMARY_CHARS


def test_the_turns_plan_is_shown_back_before_each_step(monkeypatch):
    seen = []
    steps = [("update_plan", {"steps": ["find the Walmart sources", "summarize them"], "done": []}),
             ("update_plan", {"steps": ["find the Walmart sources", "summarize them"], "done": [1]})]

    def fake(model, system, messages, ledger, tools=None, **kw):
        notes = [b["text"] for m in messages if m["role"] == "user" and isinstance(m["content"], list)
                 for b in m["content"] if isinstance(b, dict) and b.get("type") == "text"]
        seen.append(notes[-1] if notes else "")
        if steps:
            name, args = steps.pop(0)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id=f"u{len(steps)}", name=name, input=args)])
        return "done", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="done")])
    agent.turn(agent.new_conversation(), "look up Walmart then summarize", call=fake)
    assert "Your plan for this turn: 1. find the Walmart sources; 2. summarize them" in seen[1]
    assert "1. find the Walmart sources (done)" in seen[2]
