"""Script at load time (harness WS-H5, Uber): a turn with no engagement in focus starts with the recent engagements and
their ids, so the model does not spend a step listing them (21 of 146 measured turns opened with list_engagements)."""
from types import SimpleNamespace

from ia_next import agent, store


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def test_the_turn_starts_with_the_engagements_and_their_ids():
    eid = store.create_engagement("Retail AI assistants", "o")
    seen = []

    def fake(model, system, messages, ledger, tools=None, **kw):
        seen.append(messages[-1]["content"] if isinstance(messages[-1]["content"], str) else "")
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="ok")])
    agent.turn(agent.new_conversation(), "what did we find on retail?", call=fake)
    assert f"{eid}: Retail AI assistants" in seen[0] and "Your engagements, newest first" in seen[0]


def test_a_focused_turn_does_not_get_the_list():
    eid = store.create_engagement("Focused one", "o")
    seen = []

    def fake(model, system, messages, ledger, tools=None, **kw):
        seen.append(messages[-1]["content"] if isinstance(messages[-1]["content"], str) else "")
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="ok")])
    agent.turn(agent.new_conversation(), "what is here?", call=fake, focus=eid)
    assert "Your engagements, newest first" not in seen[0]
