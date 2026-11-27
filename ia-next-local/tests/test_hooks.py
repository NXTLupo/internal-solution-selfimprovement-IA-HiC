"""Turn middleware and hooks (harness WS-H2, 26 Nov; Harness Engineering R1, R11): every tool call passes the floor,
then the owner's deny rules from data/hooks.json, then each handler in order. A deny is an event and a live step, and
the call is not run; no data rule can lift the floor. A fake model stands in."""
import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from ia_next import agent, app as app_module, hooks, store


def _block(**kw):
    ns = SimpleNamespace(**kw)
    ns.model_dump = lambda exclude_none=True: {k: v for k, v in kw.items() if v is not None}
    return ns


def _turn_with(monkeypatch, name, args):
    ran = []
    monkeypatch.setattr(agent, "execute_tool", lambda n, a: ran.append((n, a)) or {"results": []})
    seen = []

    def fake(model, system, messages, ledger, tools=None, **kw):
        if not seen:
            seen.append(1)
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[_block(type="tool_use", id="tu1", name=name, input=args)])
        seen.append(messages[-1]["content"][0]["content"])
        return "done", None, SimpleNamespace(stop_reason="end_turn", content=[_block(type="text", text="done")])
    agent.turn(agent.new_conversation(), "do it", call=fake)
    return ran, seen[-1]


def test_an_owner_rule_in_data_blocks_a_call(tmp_path, monkeypatch):
    rules = tmp_path / "hooks.json"
    rules.write_text(json.dumps({"rules": [{"tool": "recall", "args": {"query": "salar(y|ies)"},
                                            "reason": "salary questions stay out of the Library"}]}), encoding="utf-8")
    monkeypatch.setattr(hooks, "RULES_FILE", str(rules))
    ran, result = _turn_with(monkeypatch, "recall", {"query": "partner salaries"})
    assert ran == [] and "not run: salary questions stay out of the Library" in result
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'hook_denied' ORDER BY id DESC LIMIT 1").fetchone()
    assert json.loads(ev["data"])["rule"] == "owner rules"
    ran, _ = _turn_with(monkeypatch, "recall", {"query": "retail checkout"})
    assert ran == [("recall", {"query": "retail checkout"})]                 # a call the rule does not match runs


def test_the_floor_cannot_be_lifted_by_data(tmp_path, monkeypatch):
    rules = tmp_path / "hooks.json"
    rules.write_text(json.dumps({"rules": []}), encoding="utf-8")
    monkeypatch.setattr(hooks, "RULES_FILE", str(rules))
    monkeypatch.setattr(hooks, "HARDLINE", ())                               # changing the list at run time does nothing
    ran, result = _turn_with(monkeypatch, "remember", {"text": "my key is sk-ant-abcdefghijklmnopqrstuvwxyz0123"})
    assert ran == [] and "key or token" in result
    ev = store.conn().execute("SELECT data FROM events WHERE kind = 'hook_denied' ORDER BY id DESC LIMIT 1").fetchone()
    assert json.loads(ev["data"])["floor"] is True


def test_handlers_rewrite_and_add_notes_in_order(monkeypatch):
    monkeypatch.setitem(hooks._HANDLERS, "PreToolUse", list(hooks._HANDLERS["PreToolUse"]) + [
        ("trim query", lambda n, a: hooks.Rewrite(dict(a, query=a["query"].strip()), "trimmed") if n == "recall" else hooks.ALLOW),
        ("scope note", lambda n, a: hooks.Context("Library only, no web") if n == "recall" else hooks.ALLOW)])
    ran, result = _turn_with(monkeypatch, "recall", {"query": "  checkout  "})
    assert ran == [("recall", {"query": "checkout"})] and "(Library only, no web)" in result


def test_the_rules_in_force_are_listed():
    d = TestClient(app_module.app).get("/api/hooks").json()
    assert d["floor"] == ["no secrets in tool arguments"] and "owner rules" in d["handlers"]["PreToolUse"]
    # the policies that lived inline in the loop are handlers now, in order
    assert d["handlers"]["PreToolUse"][:4] == ["owner rules", "repeat cap", "memory from the person", "known workarounds"]
    assert d["handlers"]["Stop"] == ["verify on stop", "the hashtag's tool was called"]
    assert d["handlers"]["PreStep"] == ["finish within the step limit", "the plan so far"]


def test_a_known_workaround_reaches_the_tool_result(monkeypatch):
    """Uber: agents look up each other's workarounds. A papercut filed against a tool, with its fix, is added to the
    result of the next call of that tool."""
    from ia_next import papercuts
    papercuts.file("recall", "searched the Library", "passages", "returned nothing for a two-word query",
                   fix="use the full question, not two words")
    ran, result = _turn_with(monkeypatch, "recall", {"query": "retail checkout"})
    assert ran == [("recall", {"query": "retail checkout"})] and "What works: use the full question" in result
