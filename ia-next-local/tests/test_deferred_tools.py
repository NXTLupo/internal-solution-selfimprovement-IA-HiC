"""Deferred tool loading (harness WS-H6; Harness Engineering R4: above about 15 tools, defer). With the switch on, the
tools that make things are not sent until find_tools loads the ones a request needs; a hashtag's tool is loaded at once.
Off by default until the live routing comparison shows no loss."""
import json
from types import SimpleNamespace

from ia_next import agent


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def test_off_by_default_every_tool_is_sent():
    assert agent.DEFERRED_TOOLS is False and agent.step_tools(agent.TOOLS) is agent.TOOLS


def test_find_tools_loads_what_the_request_needs(monkeypatch):
    monkeypatch.setattr(agent, "DEFERRED_TOOLS", True)
    sent = []
    steps = [("find_tools", {"query": "make a slide deck for the board"})]

    def fake(model, system, messages, ledger, tools=None, **kw):
        sent.append({t["name"] for t in tools or []})
        if steps:
            name, args = steps.pop(0)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id="tu1", name=name, input=args)])
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="ok")])
    agent.turn(agent.new_conversation(), "make a slide deck for the board", call=fake)
    first, second = sent[0], sent[1]
    assert "find_tools" in first and "start_deck" not in first and "recall" in first
    assert "start_deck" in second                                   # loaded for the rest of the turn
    full = len(json.dumps(agent.TOOLS))
    core = len(json.dumps([t for t in agent.TOOLS if t["name"] in first] + [agent.FIND_TOOLS]))
    assert core < full * 0.6                                        # the prompt carries far less tool text
