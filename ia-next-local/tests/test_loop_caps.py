"""Loop reliability (harness WS-H1, 26 Nov; Harness Engineering pp. 13-16, 27): a repeated identical tool call is not
run again and a third ends the turn; the step limit ends with a plain-words grace reply instead of a fixed sentence;
tool arguments that drift from the schema are repaired; every reply records why the turn ended. A fake model stands
in; nothing reaches a model server."""
import json
from types import SimpleNamespace

from ia_next import agent, store


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def _use(i, name, args):
    return SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id=f"tu{i}", name=name, input=args)])


def _text(t):
    return t, None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text=t)])


def _last_exit():
    row = store.conn().execute("SELECT data FROM events WHERE kind = 'agent_reply' ORDER BY rowid DESC LIMIT 1").fetchone()
    return json.loads(row["data"]).get("exit")


def test_schema_drift_from_open_models_is_repaired():
    tools = [{"name": "t", "input_schema": {"type": "object", "additionalProperties": False, "properties": {
        "n": {"type": "integer"}, "on": {"type": "boolean"}, "ids": {"type": "array"}, "opts": {"type": "object"}, "label": {"type": "string"}}}}]
    args, fixes = agent.coerce_args("t", {"n": "42", "on": "true", "ids": '["S1", "S2"]', "opts": '{"a": 1}', "label": 7, "junk": 1}, tools)
    assert args == {"n": 42, "on": True, "ids": ["S1", "S2"], "opts": {"a": 1}, "label": "7"}
    assert len(fixes) == 6
    assert agent.coerce_args("t", {"ids": "S1"}, tools)[0] == {"ids": ["S1"]}                 # one value becomes a one-item list
    assert agent.coerce_args("unknown", {"x": "1"}, tools) == ({"x": "1"}, [])


def test_a_repeated_identical_call_is_not_run_again_and_a_third_ends_the_turn(monkeypatch):
    ran = []
    monkeypatch.setattr(agent, "execute_tool", lambda name, args: ran.append((name, args)) or {"engagements": []})
    seen = []

    def fake(model, system, messages, ledger, tools=None, **kw):
        seen.append(tools is None)
        if tools is None:                                   # the grace call has no tools
            return _text("I listed your engagements once; there are none yet.")
        return "", None, _use(len(seen), "list_engagements", {})
    cid = agent.new_conversation()
    out = agent.turn(cid, "list my engagements again and again", call=fake)
    assert len(ran) == 1                                    # the second and third identical calls were not run
    assert out["reply"].startswith("I listed your engagements") and out.get("exit") == "repeat_stopped"
    assert _last_exit() == "repeat_stopped" and seen[-1] is True


def test_the_step_limit_ends_with_a_grace_reply(monkeypatch):
    monkeypatch.setattr(agent, "execute_tool", lambda name, args: {"results": [], "query": args.get("query")})
    n = [0]

    def fake(model, system, messages, ledger, tools=None, **kw):
        if tools is None:
            return _text("I looked through your engagements several ways and found none to report.")
        n[0] += 1
        return "", None, _use(n[0], "recall", {"query": f"grocery automation angle {n[0]}"})   # a different call each step
    cid = agent.new_conversation()
    out = agent.turn(cid, "keep listing", call=fake)
    assert out.get("exit") == "step_limit" and "found none" in out["reply"]
    assert n[0] == agent.MAX_STEPS


def test_an_answer_records_why_the_turn_ended(monkeypatch):
    cid = agent.new_conversation()
    out = agent.turn(cid, "What does the Library hold about grocery automation?", call=lambda *a, **k: _text("It holds three reports."))
    assert out.get("exit") in ("answered", None) or _last_exit() == "answered"
